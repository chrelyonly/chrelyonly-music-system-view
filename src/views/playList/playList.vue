<template>
  <div class="player-container">
    <!-- Audio 核心音频组件 (隐藏) -->
    <audio
        ref="audioRef"
        :src="currentTrack?.fileUrl"
        autoplay
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @canplay="onCanPlay"
        @ended="handleTrackEnded"
    ></audio>

    <!-- 动态高斯模糊背景层 -->
    <div
        class="bg-cover"
        :style="{ backgroundImage: currentTrack ? `url(${currentTrack.coverUrl})` : 'none' }"
    ></div>
    <div class="bg-overlay"></div>

    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="logo">
        <span class="logo-icon">🍓</span>
        <span class="title">莓莓音乐</span>
      </div>

      <!-- 分段切换控制 -->
      <nav class="nav-segmented-wrapper">
        <el-segmented
            v-model="activeLeftTab"
            :options="[
            { label: '🎶 列表', value: 'playlist' },
            { label: '🔍 搜索', value: 'search' },
            { label: '🎤 KTV厅', value: 'room' }
          ]"
            @change="handleNavChange"
            class="header-segmented"
        />
      </nav>
    </header>

    <!-- 主展示区 -->
    <main class="main-content">
      <div class="player-center-stage">
        <!-- 唱片面板：包含封面、唱针及歌曲信息 -->
        <AlbumPanel
            :track="currentTrack"
            :is-playing="isPlaying"
        />

        <!-- 歌词面板：处理解析与自动居中滚动 -->
        <LyricPanel
            :lyrics="parsedLyrics"
            :current-index="currentLyricIndex"
        />
      </div>
    </main>

    <!-- 侧边功能抽屉：列表、搜索与发现 -->
    <PlayerDrawer
        v-model="isMobileDrawerOpen"
        v-model:activeTab="activeLeftTab"
        v-model:searchKeyword="searchKeyword"
        :song-list="songList"
        :current-index="currentIndex"
        :is-playing="isPlaying"
        :searching="searching"
        :search-results="searchResults"
        :recent-played="recentPlayed"
        @select-track="selectTrack"
        @clear-playlist="clearPlaylist"
        @download="downloadSong"
        @remove="removeFromPlaylist"
        @search="handleSearch"
        @add-all="addAllToPlaylist"
        @add-only="addToPlaylistOnly"
        @add-and-play="addToPlaylistAndPlay"
    />

    <!-- 底部控制条：进度、播放控制、音量与倍速 -->
    <PlayerBar
        :current-time="currentTime"
        :duration="duration"
        :is-playing="isPlaying"
        :play-mode-icon="playModeIcon"
        :play-mode-text="playModeText"
        :playback-rate="playbackRate"
        :volume="volume"
        :is-muted="isMuted"
        @progress-change="onProgressChange"
        @toggle-play="togglePlay"
        @prev="prevTrack"
        @next="nextTrack"
        @toggle-play-mode="togglePlayMode"
        @change-rate="changePlaybackRate"
        @toggle-mute="toggleMute"
        @volume-change="onVolumeInput"
    />
  </div>
</template>

<script setup>
/**
 * playList.vue - 播放器核心调度组件
 *
 * 职责：
 * 1. 管理音频基础状态 (currentTime, duration, isPlaying)
 * 2. 协调持久化存储与恢复 (刷新不丢失进度)
 * 3. 封装核心业务逻辑 (切歌、搜索、播放模式)
 * 4. 为各展示子组件分发数据
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { setStore, getStore } from '@/stores/store.js'
import { searchMusic, getRecentRecommendList, recordPlayCount } from '@/api/music/music.js'
import { parseLrc } from '@/util/lyric.js'

import AlbumPanel from './components/AlbumPanel.vue'
import LyricPanel from './components/LyricPanel.vue'
import PlayerBar from './components/PlayerBar.vue'
import PlayerDrawer from './components/PlayerDrawer.vue'

const MAX_PLAYLIST_SIZE = 1000

// --- 引用与 UI 状态 ---
const audioRef = ref({})
const router = useRouter()
const activeLeftTab = ref('playlist')
const isMobileDrawerOpen = ref(false)

// --- 数据状态 ---
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref([])
const songList = ref([])
const recentPlayed = ref([])

// --- 核心播放状态 ---
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0) // 当前播放时间
const duration = ref(0)    // 歌曲总时长
const playMode = ref(0)    // 0: 列表循环, 1: 单曲循环, 2: 随机播放

// --- 音频控制配置 ---
const volume = ref(0.8)
const isMuted = ref(false)
const playbackRate = ref(1.0)
const rateOptions = [0.5, 1.0, 1.25, 1.5, 2.0]

// --- 刷新恢复/断点续听逻辑变量 ---
const isInitialLoad = ref(true) // 是否处于页面刚打开的恢复阶段
const restoredTime = ref(0)     // 从缓存恢复的目标时间点

// --- 计算属性 ---
const currentTrack = computed(() => songList.value[currentIndex.value] || null)
const playModeIcon = computed(() => ['🔁', '🔂', '🔀'][playMode.value])
const playModeText = computed(() => ['列表循环', '单曲循环', '随机播放'][playMode.value])

/**
 * 实时解析歌词文本为对象数组
 */
const parsedLyrics = computed(() => {
  if (!currentTrack.value?.nameLyric) return []
  return parseLrc(currentTrack.value.nameLyric)
})

/**
 * 基于当前播放时间计算高亮歌词行的索引
 */
const currentLyricIndex = computed(() => {
  if (!parsedLyrics.value.length) return -1
  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (currentTime.value >= parsedLyrics.value[i].time) return i
  }
  return 0
})

// --- 播放逻辑流程 ---

/**
 * 核心寻址恢复逻辑
 * 用于在刷新后将音频强制跳回到上次记录的时间点
 */
const performRestoreSeek = () => {
  if (isInitialLoad.value && restoredTime.value > 0 && audioRef.value) {
    // 检查 audio 的 readyState，确保至少 metadata 已经准备好
    if (audioRef.value.readyState >= 1) {
      try {
        audioRef.value.currentTime = restoredTime.value
        isInitialLoad.value = false // 寻址成功后关闭恢复模式，解锁 UI 同步
        console.log('播放进度已成功恢复到:', restoredTime.value)
      } catch (e) {
        console.warn('当前状态无法执行寻址，等待下一次机会:', e)
      }
    }
  }
}

/**
 * 触发音频播放并记录播放量
 */
const playCurrent = () => {
  nextTick(() => {
    if (audioRef.value && currentTrack.value) {
      audioRef.value.play().then(() => {
        isPlaying.value = true
        recordPlayCount(currentTrack.value.id)
        // 播放启动后，如果是刷新恢复，则执行寻址
        performRestoreSeek()
      }).catch(err => {
        console.warn('浏览器自动播放拦截:', err)
        isPlaying.value = false
        showAutoplayModal() // 显示点击播放弹窗
      })
    }
  })
}

/**
 * 播放状态切换
 */
const togglePlay = () => {
  if (!audioRef.value || !currentTrack.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
  } else {
    audioRef.value.play().then(() => {
      isPlaying.value = true
      isInitialLoad.value = false // 用户手动点击播放，意味着彻底脱离恢复阶段
    })
  }
}

// --- 歌曲切换与列表操作 ---

const prevTrack = () => {
  if (!songList.value.length) return
  isInitialLoad.value = false
  currentIndex.value = (currentIndex.value - 1 + songList.value.length) % songList.value.length
  playCurrent()
}

const nextTrack = () => {
  if (!songList.value.length) return
  isInitialLoad.value = false
  currentIndex.value = (currentIndex.value + 1) % songList.value.length
  playCurrent()
}

const selectTrack = (index) => {
  isInitialLoad.value = false
  if (currentIndex.value === index && isPlaying.value) {
    togglePlay()
  } else {
    currentIndex.value = index
    playCurrent()
  }
}

const handleTrackEnded = () => {
  isInitialLoad.value = false
  if (playMode.value === 1) playCurrent()
  else if (playMode.value === 2) {
    currentIndex.value = Math.floor(Math.random() * songList.value.length)
    playCurrent()
  } else nextTrack()
}

// --- 音频事件回调 ---

/**
 * 核心时间更新回调
 */
const onTimeUpdate = () => {
  if (audioRef.value) {
    const audioTime = audioRef.value.currentTime

    // 关键点：在初始恢复阶段且音频还是0时，拦截更新以防 UI 被 0 复位
    if (isInitialLoad.value && restoredTime.value > 0 && audioTime === 0) {
      performRestoreSeek() // 再次尝试寻址
      return
    }

    // 正常状态同步
    currentTime.value = audioTime
    setStore({ name: 'music_last_time', content: currentTime.value })

    // 补抓时长信息 (防止 loadedmetadata 事件错失)
    if (!duration.value && audioRef.value.duration) {
      duration.value = audioRef.value.duration
    }
  }
}

const onLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
    audioRef.value.volume = isMuted.value ? 0 : volume.value
    audioRef.value.playbackRate = playbackRate.value
    performRestoreSeek() // 元数据加载后立即尝试寻址
  }
}

const onCanPlay = () => {
  performRestoreSeek() // 音频可播放时再次尝试寻址
}

// --- 业务辅助方法 ---

const handleNavChange = (val) => {
  if (val === 'room') {
    router.push('/music/room')
    return
  }
  activeLeftTab.value = val
  isMobileDrawerOpen.value = true
}

const handleSearch = async () => {
  if (!searchKeyword.value.trim() || searching.value) return
  searching.value = true
  try {
    const res = await searchMusic(searchKeyword.value)
    const data = res?.data?.data || res?.data || res
    searchResults.value = Array.isArray(data) ? data : (data?.records || [])
    if (!searchResults.value.length) ElMessage.warning('未找到相关歌曲')
  } catch (error) {
    ElMessage.error('搜索失败')
  } finally {
    searching.value = false
  }
}

const fetchRecentRecommend = async () => {
  try {
    const res = await getRecentRecommendList()
    const data = res?.data?.data || res?.data || res
    recentPlayed.value = Array.isArray(data) ? data : (data?.records || [])
  } catch (e) {
    console.error('获取推荐失败:', e)
  }
}

const onProgressChange = (val) => {
  isInitialLoad.value = false // 用户手动改进度，关闭自动恢复
  if (audioRef.value) audioRef.value.currentTime = val
}

const onVolumeInput = (val) => {
  volume.value = val
  if (audioRef.value) audioRef.value.volume = isMuted.value ? 0 : val
  setStore({ name: 'music_volume', content: val })
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
  if (audioRef.value) audioRef.value.volume = isMuted.value ? 0 : volume.value
}

const changePlaybackRate = () => {
  const idx = rateOptions.indexOf(playbackRate.value)
  playbackRate.value = rateOptions[(idx + 1) % rateOptions.length]
  if (audioRef.value) audioRef.value.playbackRate = playbackRate.value
}

const togglePlayMode = () => {
  playMode.value = (playMode.value + 1) % 3
  ElMessage.info(`切换模式：${playModeText.value}`)
}

const downloadSong = (song) => {
  if (!song?.fileUrl) return ElMessage.error('无下载地址')
  const a = document.createElement('a')
  a.href = song.fileUrl
  a.download = `${song.name}.mp3`
  a.click()
}

const showAutoplayModal = () => {
  ElMessageBox.confirm(`点击“播放”继续听歌：《${currentTrack.value?.name}》`, '播放提示', {
    confirmButtonText: '播放',
    cancelButtonText: '取消',
    type: 'info',
    showClose: false,
    closeOnClickModal: false,
    closeOnPressEscape: false
  }).then(() => {
    isInitialLoad.value = true // 确保手动点击后依然执行恢复逻辑
    playCurrent()
  })
}

// --- 列表操作 ---
const addToPlaylistOnly = (song) => {
  const index = songList.value.findIndex(item => item.id === song.id)
  if (index !== -1) return ElMessage.info(`已经在列表中`)
  if (songList.value.length >= MAX_PLAYLIST_SIZE) return ElMessage.warning(`列表已满`)
  songList.value.push(song)
  ElMessage.success(`已添加`)
}

const addToPlaylistAndPlay = (song) => {
  let idx = songList.value.findIndex(item => item.id === song.id)
  if (idx === -1) {
    if (songList.value.length >= MAX_PLAYLIST_SIZE) return ElMessage.warning(`列表已满`)
    songList.value.push(song)
    idx = songList.value.length - 1
  }
  selectTrack(idx)
}

const addAllToPlaylist = () => {
  let count = 0
  for (const song of searchResults.value) {
    if (songList.value.length >= MAX_PLAYLIST_SIZE) break
    if (!songList.value.some(item => item.id === song.id)) {
      songList.value.push(song)
      count++
    }
  }
  if (count > 0) ElMessage.success(`添加了 ${count} 首歌曲`)
}

const removeFromPlaylist = (index) => {
  const isPlayingDeleted = (index === currentIndex.value)
  songList.value.splice(index, 1)
  if (!songList.value.length) {
    isPlaying.value = false
    currentIndex.value = 0
  } else if (isPlayingDeleted) {
    currentIndex.value %= songList.value.length
    playCurrent()
  } else if (index < currentIndex.value) {
    currentIndex.value--
  }
}

const clearPlaylist = () => {
  songList.value = []
  isPlaying.value = false
  currentIndex.value = 0
  currentTime.value = 0
}

// --- 持久化监听 ---
watch(songList, (newList) => setStore({ name: 'music_song_list', content: newList }), { deep: true })
watch(currentIndex, (newIdx) => setStore({ name: 'music_current_index', content: newIdx }))
watch(playMode, (newMode) => setStore({ name: 'music_play_mode', content: newMode }))

// --- 生命周期初始化 ---
onMounted(() => {
  const savedList = getStore({ name: 'music_song_list' })
  const savedIdx = getStore({ name: 'music_current_index' })
  const savedMode = getStore({ name: 'music_play_mode' })
  const savedVol = getStore({ name: 'music_volume' })

  if (Array.isArray(savedList)) songList.value = savedList
  if (typeof savedIdx === 'number' && savedIdx < songList.value.length) currentIndex.value = savedIdx
  if (typeof savedMode === 'number') playMode.value = savedMode
  if (typeof savedVol === 'number') volume.value = savedVol

  fetchRecentRecommend()

  // 恢复上次播放的时间进度
  const lastTime = getStore({ name: 'music_last_time' })
  if (lastTime) {
    restoredTime.value = lastTime
    currentTime.value = lastTime // 立即更新 UI，使进度条同步
  } else {
    isInitialLoad.value = false
  }

  // 启动播放流程
  nextTick(() => { if (currentTrack.value) playCurrent() })
})
</script>

<style scoped>
/* ==========================================================================
   1. 基础容器与动态模糊背景
   ========================================================================= */
.player-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  background-color: #06070a;
  overflow: hidden;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
}

.bg-cover {
  position: absolute;
  inset: -15%;
  background-size: cover;
  background-position: center;
  filter: blur(85px) saturate(1.8) brightness(0.24);
  transform: scale(1.1);
  transition: background-image 1.5s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: background-image;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.02) 0%, rgba(5, 7, 12, 0.96) 100%);
  z-index: 2;
}

/* ==========================================================================
   2. Header 顶部样式
   ========================================================================= */
.header {
  position: relative;
  z-index: 10;
  height: 68px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-icon {
  font-size: 28px;
  filter: drop-shadow(0 0 10px rgba(255, 77, 125, 0.6));
}

.title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1.2px;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.6) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-segmented {
  --el-segmented-bg-color: rgba(255, 255, 255, 0.05);
  --el-segmented-item-selected-bg-color: linear-gradient(135deg, #ff4d7d 0%, #c92c63 100%);
  --el-segmented-item-selected-color: #ffffff;
  --el-segmented-item-color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2px;
  border-radius: 20px;
}

/* ==========================================================================
   3. 主中心内容区适配
   ========================================================================= */
.main-content {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  padding: 24px;
  overflow: hidden;
}

.player-center-stage {
  flex: 1;
  width: 100%;
  max-width: 1250px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
}

@media (min-width: 769px) {
  .player-center-stage {
    flex-direction: row;
    justify-content: space-around;
    padding: 0 40px;
    gap: 60px;
  }
}

@media (max-width: 768px) {
  .header { padding: 0 20px; }
  .logo-icon { font-size: 24px; }
  .title { font-size: 18px; }
}
</style>
