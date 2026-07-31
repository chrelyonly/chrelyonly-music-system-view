<template>
  <div class="player-container">
    <!-- Audio 隐形播放器 -->
    <audio
        ref="audioRef"
        :src="currentTrack?.fileUrl"
        autoplay
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @ended="handleTrackEnded"
    ></audio>

    <!-- 背景模糊动态演播层 -->
    <div
        class="bg-cover"
        :style="{ backgroundImage: currentTrack ? `url(${currentTrack.coverUrl})` : 'none' }"
    ></div>
    <div class="bg-overlay"></div>

    <!-- 顶部 Header -->
    <header class="header">
      <div class="logo">
        <span class="logo-icon">🍓</span>
        <span class="title">莓莓音乐</span>
      </div>

      <nav class="nav-segmented-wrapper">
        <el-segmented
            v-model="activeLeftTab"
            :options="[
            { label: '🎶 列表', value: 'playlist' },
            { label: '🔍 搜索', value: 'search' }
          ]"
            @change="handleNavChange"
            class="header-segmented"
        />
      </nav>
    </header>

    <!-- 主内容区：唱片与歌词展示区 -->
    <main class="main-content">
      <div class="player-center-stage">
        <AlbumPanel
            :track="currentTrack"
            :is-playing="isPlaying"
        />

        <LyricPanel
            :lyrics="parsedLyrics"
            :current-index="currentLyricIndex"
        />
      </div>
    </main>

    <!-- 侧边抽屉面板 -->
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

    <!-- 底部播放控制条 -->
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
 * PlayList.vue - 音乐播放器主页面
 * 负责音频状态管理、数据获取与各组件间的协调
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { setStore, getStore } from '@/stores/store.js'
import { searchMusic, getRecentRecommendList, recordPlayCount } from '@/api/music/music.js'
import { parseLrc } from '@/util/lyric.js'

// 导入提取的子组件
import AlbumPanel from './components/AlbumPanel.vue'
import LyricPanel from './components/LyricPanel.vue'
import PlayerBar from './components/PlayerBar.vue'
import PlayerDrawer from './components/PlayerDrawer.vue'

const MAX_PLAYLIST_SIZE = 1000

// --- 响应式引用 ---
const audioRef = ref(null)
const activeLeftTab = ref('playlist')
const isMobileDrawerOpen = ref(false)

// --- 搜索与列表数据 ---
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref([])
const songList = ref([])
const recentPlayed = ref([])

// --- 播放状态 ---
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playMode = ref(0) // 0: 列表循环, 1: 单曲循环, 2: 随机播放

// --- 音频调节 ---
const volume = ref(0.8)
const isMuted = ref(false)
const playbackRate = ref(1.0)
const rateOptions = [0.5, 1.0, 1.25, 1.5, 2.0]

// --- 计算属性 ---
const currentTrack = computed(() => songList.value[currentIndex.value] || null)
const playModeIcon = computed(() => ['🔁', '🔂', '🔀'][playMode.value])
const playModeText = computed(() => ['列表循环', '单曲循环', '随机播放'][playMode.value])

/**
 * 解析当前曲目的歌词
 */
const parsedLyrics = computed(() => {
  if (!currentTrack.value?.nameLyric) return []
  return parseLrc(currentTrack.value.nameLyric)
})

/**
 * 根据当前播放时间计算歌词索引
 */
const currentLyricIndex = computed(() => {
  if (!parsedLyrics.value.length) return -1
  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (currentTime.value >= parsedLyrics.value[i].time) return i
  }
  return 0
})

// --- 业务逻辑方法 ---

const handleNavChange = (val) => {
  activeLeftTab.value = val
  isMobileDrawerOpen.value = true
}

/**
 * 搜索音乐
 */
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

/**
 * 获取推荐列表
 */
const fetchRecentRecommend = async () => {
  try {
    const res = await getRecentRecommendList()
    const data = res?.data?.data || res?.data || res
    recentPlayed.value = Array.isArray(data) ? data : (data?.records || [])
  } catch (e) {
    console.error('获取推荐失败:', e)
  }
}

// --- 播放控制逻辑 ---

const addToPlaylistOnly = (song) => {
  const index = songList.value.findIndex(item => item.id === song.id)
  if (index !== -1) {
    ElMessage.info(`《${song.name}》已经在列表中`)
    return index
  }
  if (songList.value.length >= MAX_PLAYLIST_SIZE) {
    ElMessage.warning(`播放列表已达上限！`)
    return -1
  }
  songList.value.push(song)
  ElMessage.success(`已添加《${song.name}》`)
  return songList.value.length - 1
}

const addToPlaylistAndPlay = (song) => {
  let targetIndex = songList.value.findIndex(item => item.id === song.id)
  if (targetIndex === -1) {
    if (songList.value.length >= MAX_PLAYLIST_SIZE) return ElMessage.warning(`列表已满`)
    songList.value.push(song)
    targetIndex = songList.value.length - 1
  }
  selectTrack(targetIndex)
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
  if (count > 0) ElMessage.success(`添加了 ${count} 首新歌`)
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

const onProgressChange = (val) => {
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

const handleTrackEnded = () => {
  if (playMode.value === 1) playCurrent() // 单曲循环
  else if (playMode.value === 2) { // 随机播放
    currentIndex.value = Math.floor(Math.random() * songList.value.length)
    playCurrent()
  } else nextTrack() // 列表循环
}

const selectTrack = (index) => {
  if (currentIndex.value === index && isPlaying.value) {
    togglePlay()
  } else {
    currentIndex.value = index
    playCurrent()
  }
}

const playCurrent = () => {
  nextTick(() => {
    if (audioRef.value && currentTrack.value) {
      audioRef.value.play().then(() => {
        isPlaying.value = true
        recordPlayCount(currentTrack.value.id)
      }).catch(err => {
        console.warn('自动播放受限:', err)
        isPlaying.value = false
        showAutoplayModal()
      })
    }
  })
}

const togglePlay = () => {
  if (!audioRef.value || !currentTrack.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
  } else {
    audioRef.value.play().then(() => isPlaying.value = true)
  }
}

const prevTrack = () => {
  if (!songList.value.length) return
  currentIndex.value = (currentIndex.value - 1 + songList.value.length) % songList.value.length
  playCurrent()
}

const nextTrack = () => {
  if (!songList.value.length) return
  currentIndex.value = (currentIndex.value + 1) % songList.value.length
  playCurrent()
}

const onTimeUpdate = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
    // 如果之前没拿到时长，尝试在此处再次获取
    if (!duration.value && audioRef.value.duration) {
      duration.value = audioRef.value.duration
    }
    setStore({ name: 'music_last_time', content: currentTime.value })
  }
}

const onLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
    audioRef.value.volume = isMuted.value ? 0 : volume.value
    audioRef.value.playbackRate = playbackRate.value
  }
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
    type: 'info'
  }).then(() => audioRef.value?.play())
}

// --- 持久化监听 ---
watch(songList, (newList) => setStore({ name: 'music_song_list', content: newList }), { deep: true })
watch(currentIndex, (newIdx) => setStore({ name: 'music_current_index', content: newIdx }))
watch(playMode, (newMode) => setStore({ name: 'music_play_mode', content: newMode }))

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

  // 恢复上次播放位置（如果需要）
  const lastTime = getStore({ name: 'music_last_time' })
  if (lastTime && audioRef.value) audioRef.value.currentTime = lastTime

  nextTick(() => { if (currentTrack.value) playCurrent() })
})
</script>

<style scoped>
/* ==========================================================================
   1. 全局容器与高清动态背景
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
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
}

.bg-cover {
  position: absolute;
  inset: -15%;
  background-size: cover;
  background-position: center;
  filter: blur(80px) saturate(1.8) brightness(0.25);
  transform: scale(1.1);
  transition: background-image 1.5s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: background-image;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.02) 0%, rgba(8, 9, 15, 0.95) 100%);
  z-index: 2;
}

/* ==========================================================================
   2. 顶部 Header
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-icon {
  font-size: 28px;
  filter: drop-shadow(0 0 12px rgba(255, 77, 125, 0.6));
}

.title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1.5px;
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
  transition: all 0.3s ease;
}

/* ==========================================================================
   3. 主内容区
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
  max-width: 1200px;
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

  .main-content {
    padding: 40px;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 0 20px;
  }

  .logo-icon {
    font-size: 24px;
  }

  .title {
    font-size: 18px;
  }
}
</style>
