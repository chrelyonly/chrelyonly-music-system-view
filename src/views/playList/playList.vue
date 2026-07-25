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

      <!-- 合并为无缝分段胶囊控制组件 -->
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
        <!-- 唱片展示面板 -->
        <aside class="album-panel" v-if="currentTrack">
          <div class="album-card">
            <div :class="['vinyl-wrapper', { 'is-playing': isPlaying }]">
              <div class="tonearm"></div>
              <div class="vinyl-disc">
                <div class="disc-rings"></div>
                <img :src="currentTrack.coverUrl" class="cover-img" alt="封面" />
              </div>
            </div>

            <div class="track-info" :key="currentTrack.id">
              <h2 class="track-title" :title="currentTrack.name">{{ currentTrack.name }}</h2>
              <p class="track-artist">{{ currentTrack.artist }}</p>
            </div>
          </div>
        </aside>

        <!-- 未播放任何歌曲的占位面板 -->
        <aside class="album-panel" v-else>
          <div class="album-card empty-card">
            <div class="vinyl-wrapper empty-vinyl">
              <div class="vinyl-disc">
                <div class="empty-cover">🎵</div>
              </div>
            </div>
            <div class="track-info">
              <h2 class="track-title">未在播放音乐</h2>
              <p class="track-artist">请从列表选择或搜索添加歌曲</p>
            </div>
          </div>
        </aside>

        <!-- 歌词展示区 -->
        <section class="lyrics-panel">
          <div class="lyrics-container" ref="lyricsContainerRef">
            <div v-if="parsedLyrics.length > 0" class="lyrics-scroll">
              <p
                  v-for="(line, idx) in parsedLyrics"
                  :key="idx"
                  :class="['lyric-line', { active: currentLyricIndex === idx }]"
                  :ref="el => { if (currentLyricIndex === idx) currentLyricEl = el }"
              >
                {{ line.text }}
              </p>
            </div>
            <div v-else class="no-lyric">
              <span class="disc-icon">🎵</span>
              <p>暂无歌词或纯音乐作品</p>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 侧边抽屉面板 -->
    <el-drawer
        v-model="isMobileDrawerOpen"
        direction="ltr"
        size="85%"
        :show-close="true"
        class="custom-drawer"
    >
      <template #header>
        <el-segmented
            v-model="activeLeftTab"
            :options="[
            { label: '播放列表', value: 'playlist' },
            { label: '搜索发现', value: 'search' }
          ]"
            class="drawer-segmented"
        />
      </template>

      <!-- 列表页 -->
      <div v-show="activeLeftTab === 'playlist'" class="drawer-tab-content">
        <div class="list-header">
          <span>当前播放列表 ({{ songList.length }}/1000)</span>
          <el-button v-if="songList.length" type="danger" link size="small" @click="clearPlaylist">
            清空列表
          </el-button>
        </div>

        <el-scrollbar v-if="songList.length" class="panel-scroll-content">
          <div
              v-for="(item, index) in songList"
              :key="item.id || index"
              :class="['song-item', { playing: currentIndex === index }]"
              @click="selectTrackMobile(index)"
          >
            <span class="song-index">
              <span v-if="currentIndex === index && isPlaying" class="playing-waves">
                <i></i><i></i><i></i>
              </span>
              <template v-else>{{ (index + 1).toString().padStart(2, '0') }}</template>
            </span>
            <div class="song-meta">
              <span class="song-name">{{ item.name }}</span>
              <span class="song-artist">{{ item.artist }}</span>
            </div>
            <div class="item-actions" @click.stop>
              <el-button link icon="Download" @click="downloadSong(item)" title="下载" />
              <el-button link icon="Close" @click="removeFromPlaylist(index)" title="移除" />
            </div>
          </div>
        </el-scrollbar>
        <el-empty v-else description="列表为空，快去搜索添加吧~" :image-size="80" />
      </div>

      <!-- 搜索页 -->
      <div v-show="activeLeftTab === 'search'" class="drawer-tab-content">
        <div class="search-bar">
          <el-input
              v-model="searchKeyword"
              placeholder="搜索歌曲或歌手..."
              clearable
              @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button icon="Search" :loading="searching" class="search-submit-btn" @click="handleSearch" />
            </template>
          </el-input>
        </div>

        <el-scrollbar class="panel-scroll-content">
          <div v-if="searchResults.length" class="search-results">
            <div class="list-header">
              <span>搜索结果</span>
              <el-button type="primary" link size="small" class="accent-link-btn" @click="addAllToPlaylist">
                + 全部加入
              </el-button>
            </div>
            <div
                v-for="item in searchResults"
                :key="item.id"
                class="song-item"
                @click="addToPlaylistAndPlayMobile(item)"
            >
              <img :src="item.coverUrl" class="res-cover" alt="cover" />
              <div class="song-meta">
                <span class="song-name">{{ item.name }}</span>
                <span class="song-artist">{{ item.artist }}</span>
              </div>
              <div class="item-actions" @click.stop>
                <el-button link icon="Plus" title="添加到列表" @click="addToPlaylistOnly(item)" />
                <el-button link icon="VideoPlay" title="立即播放" @click="addToPlaylistAndPlayMobile(item)" />
              </div>
            </div>
          </div>

          <!-- 推荐列表 -->
          <div class="recommend-block">
            <h4 class="section-title">✨ 猜你喜欢</h4>
            <div
                v-for="item in recentPlayed"
                :key="item.id"
                class="rec-card"
                @click="addToPlaylistAndPlayMobile(item)"
            >
              <img :src="item.coverUrl" class="rec-cover" alt="rec-cover" />
              <div class="rec-info">
                <span class="rec-name">{{ item.name }}</span>
                <span class="rec-artist">{{ item.artist }}</span>
              </div>
              <el-button
                  circle
                  size="small"
                  icon="Plus"
                  class="accent-add-btn"
                  @click.stop="addToPlaylistOnly(item)"
              />
            </div>
          </div>
        </el-scrollbar>
      </div>
    </el-drawer>

    <!-- 底部播放控制条 -->
    <footer class="player-bar glass-card-bar">
      <!-- 进度条 -->
      <div class="progress-container">
        <span class="time">{{ formatTime(currentTime) }}</span>
        <el-slider
            v-model="currentTime"
            :max="duration || 100"
            :format-tooltip="formatTime"
            @change="onProgressChange"
            class="custom-slider"
        />
        <span class="time">{{ formatTime(duration) }}</span>
      </div>

      <!-- 核心控制区 -->
      <div class="controls-row">
        <!-- 模式切换 -->
        <el-button link class="mode-btn-capsule" @click="togglePlayMode" :title="playModeText">
          <span class="mode-icon">{{ playModeIcon }}</span>
          <span class="mode-text desktop-only">{{ playModeText }}</span>
        </el-button>

        <!-- 核心切歌与播放 -->
        <div class="controls">
          <el-button link icon="Back" class="ctrl-btn" @click="prevTrack" title="上一首" />
          <el-button
              circle
              type="primary"
              class="play-btn"
              :icon="isPlaying ? 'VideoPause' : 'VideoPlay'"
              @click="togglePlay"
          />
          <el-button link icon="Right" class="ctrl-btn" @click="nextTrack" title="下一首" />
        </div>

        <!-- 倍速与音量调整 -->
        <div class="extra-controls">
          <el-button size="small" round class="rate-btn" @click="changePlaybackRate">
            {{ playbackRate }}x
          </el-button>

          <div class="volume-container desktop-only">
            <el-button
                link
                class="vol-icon-btn"
                :icon="isMuted || volume === 0 ? 'Mute' : 'Microphone'"
                @click="toggleMute"
            />
            <el-slider
                v-model="volume"
                :max="1"
                :step="0.01"
                :show-tooltip="false"
                @input="onVolumeInput"
                class="volume-slider"
            />
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { setStore, getStore } from '@/stores/store.js'
import { searchMusic, getRecentRecommendList, recordPlayCount } from '@/api/music/music.js'
import { parseLrc } from '@/util/lyric.js'

const MAX_PLAYLIST_SIZE = 1000

// 响应式变量
const audioRef = ref(null)
const lyricsContainerRef = ref(null)
const currentLyricEl = ref(null)

const activeLeftTab = ref('playlist')
const isMobileDrawerOpen = ref(false)

const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref([])
const songList = ref([])
const recentPlayed = ref([])

const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playMode = ref(0)

const volume = ref(0.8)
const isMuted = ref(false)
const playbackRate = ref(1.0)
const rateOptions = [0.5, 1.0, 1.25, 1.5, 2.0]

// 切换导航并打开抽屉
const handleNavChange = (val) => {
  activeLeftTab.value = val
  isMobileDrawerOpen.value = true
}

const selectTrackMobile = (index) => {
  selectTrack(index)
}

const addToPlaylistAndPlayMobile = (song) => {
  addToPlaylistAndPlay(song)
}

// 计算属性
const currentTrack = computed(() => songList.value[currentIndex.value] || null)
const playModeIcon = computed(() => ['🔁', '🔂', '🔀'][playMode.value])
const playModeText = computed(() => ['列表循环', '单曲循环', '随机播放'][playMode.value])

const parsedLyrics = computed(() => {
  if (!currentTrack.value?.nameLyric) return []
  return parseLrc(currentTrack.value.nameLyric)
})

const currentLyricIndex = computed(() => {
  if (!parsedLyrics.value.length) return -1
  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (currentTime.value >= parsedLyrics.value[i].time) return i
  }
  return 0
})

// 播放列表逻辑
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
}

// 搜索与数据加载
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
    console.error(e)
  }
}

// 音频控制
const onProgressChange = (val) => {
  if (audioRef.value) audioRef.value.currentTime = val
}

const onVolumeInput = (val) => {
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
  if (playMode.value === 1) playCurrent()
  else if (playMode.value === 2) {
    currentIndex.value = Math.floor(Math.random() * songList.value.length)
    playCurrent()
  } else nextTrack()
}

const selectTrack = (index) => {
  if (currentIndex.value === index && isPlaying.value) togglePlay()
  else {
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
      }).catch(() => {
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

const formatTime = (time) => {
  if (!time || isNaN(time)) return '00:00'
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const downloadSong = (song) => {
  if (!song?.fileUrl) return ElMessage.error('无下载地址')
  const a = document.createElement('a')
  a.href = song.fileUrl
  a.download = `${song.name}.mp3`
  a.click()
}

// 自动滚动歌词
watch(currentLyricIndex, () => {
  nextTick(() => {
    if (currentLyricEl.value && lyricsContainerRef.value) {
      const container = lyricsContainerRef.value
      const el = currentLyricEl.value
      container.scrollTo({
        top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2,
        behavior: 'smooth'
      })
    }
  })
})

const showAutoplayModal = () => {
  ElMessageBox.confirm(`点击“播放”继续听歌：《${currentTrack.value?.name}》`, '播放提示', {
    confirmButtonText: '播放',
    cancelButtonText: '取消',
    type: 'info'
  }).then(() => audioRef.value?.play())
}

// 持久化存储
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
  nextTick(() => { if (currentTrack.value) playCurrent() })
})
</script>

<style scoped>
/* ==========================================================================
   1. 全局容器与高清动态背景
   ========================================================================== */
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
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.bg-cover {
  position: absolute;
  inset: -15%;
  background-size: cover;
  background-position: center;
  filter: blur(80px) saturate(2.2) brightness(0.28);
  transform: scale(1.1);
  transition: background-image 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, background-image;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.05) 0%, rgba(4, 5, 8, 0.95) 100%);
  z-index: 2;
}

/* ==========================================================================
   2. 顶部 Header
   ========================================================================== */
.header {
  position: relative;
  z-index: 10;
  height: 64px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 26px;
  filter: drop-shadow(0 2px 12px rgba(255, 75, 130, 0.6));
}

.title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 顶部 Segmented 胶囊设计 */
.header-segmented,
.drawer-segmented {
  --el-segmented-bg-color: rgba(255, 255, 255, 0.07);
  --el-segmented-item-selected-bg-color: linear-gradient(135deg, #ff4d7d 0%, #c92c63 100%);
  --el-segmented-item-selected-color: #ffffff;
  --el-segmented-item-color: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 3px;
  border-radius: 20px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.header-segmented :deep(.el-segmented__item),
.drawer-segmented :deep(.el-segmented__item) {
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  padding: 5px 14px;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  color: rgba(255, 255, 255, 0.65);
}

.header-segmented :deep(.el-segmented__item.is-selected),
.drawer-segmented :deep(.el-segmented__item.is-selected) {
  box-shadow: 0 4px 14px rgba(255, 77, 125, 0.45);
}

.header-segmented :deep(.el-segmented__item:hover:not(.is-selected)),
.drawer-segmented :deep(.el-segmented__item:hover:not(.is-selected)) {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.1);
}

/* ==========================================================================
   3. 主内容区 (唱片 + 歌词)
   ========================================================================== */
.main-content {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  padding: 20px;
  overflow: hidden;
}

.player-center-stage {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  gap: 24px;
}

.album-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.album-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vinyl-wrapper {
  position: relative;
  width: clamp(230px, 46vw, 320px);
  height: clamp(230px, 46vw, 320px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 唱针设计与旋转 */
.tonearm {
  position: absolute;
  top: -24px;
  right: 22%;
  width: 38px;
  height: 80px;
  border-right: 4px solid rgba(255, 255, 255, 0.85);
  border-top: 4px solid rgba(255, 255, 255, 0.85);
  border-top-right-radius: 16px;
  z-index: 12;
  transform-origin: 100% 0;
  transform: rotate(-32deg);
  transition: transform 0.7s cubic-bezier(0.34, 1.3, 0.64, 1);
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.8));
}

.tonearm::before {
  content: '';
  position: absolute;
  top: -7px;
  right: -7px;
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
}

.tonearm::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: -2px;
  width: 10px;
  height: 14px;
  background: #cccccc;
  border-radius: 2px;
  transform: rotate(15deg);
}

.vinyl-wrapper.is-playing .tonearm {
  transform: rotate(-2deg);
}

/* 唱片播放光晕 */
.vinyl-wrapper::before {
  content: '';
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 77, 125, 0.35) 0%, transparent 70%);
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.6s ease, transform 0.6s ease;
  pointer-events: none;
  z-index: -1;
}

.vinyl-wrapper.is-playing::before {
  opacity: 1;
  transform: scale(1);
  animation: pulse-glow 2.4s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.7; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1.04); }
}

/* 黑胶唱片样式 */
.vinyl-disc {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, #0a0a0d 18%, #222226 20%, #0d0d10 22%, #18181c 78%, #050507 100%);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85),
  inset 0 0 0 2px rgba(255, 255, 255, 0.15),
  0 0 0 10px rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 24s linear infinite;
  animation-play-state: paused;
  overflow: hidden;
  transition: box-shadow 0.6s ease;
}

.vinyl-wrapper.is-playing .vinyl-disc {
  animation-play-state: running;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85),
  inset 0 0 0 2px rgba(255, 255, 255, 0.18),
  0 0 0 10px rgba(255, 77, 125, 0.06),
  0 0 36px rgba(255, 77, 125, 0.25);
}

.disc-rings {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: repeating-radial-gradient(
      circle at center,
      transparent 0,
      transparent 6px,
      rgba(255, 255, 255, 0.03) 7px,
      transparent 8px
  );
  pointer-events: none;
}

/* 唱片表面高光反射，增加质感 */
.disc-rings::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(115deg, rgba(255, 255, 255, 0.09) 0%, transparent 28%, transparent 72%, rgba(255, 255, 255, 0.05) 100%);
}

.cover-img {
  width: 54%;
  height: 54%;
  border-radius: 50%;
  object-fit: cover;
  border: 6px solid #0a0a0d;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  z-index: 2;
}

.empty-vinyl .vinyl-disc {
  background: radial-gradient(circle, #101014 18%, #1c1c20 20%, #121215 22%, #17171b 78%, #08080a 100%);
  border: 1px dashed rgba(255, 255, 255, 0.12);
}

.empty-cover {
  font-size: 48px;
  opacity: 0.35;
  filter: grayscale(0.3);
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.track-info {
  margin-top: 24px;
  text-align: center;
  max-width: 80vw;
  animation: fade-up 0.5s ease both;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.track-title {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.2px;
}

.track-artist {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 歌词展示区 */
.lyrics-panel {
  width: 100%;
  flex: 1;
  max-height: 38vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.lyrics-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  text-align: center;
  mask-image: linear-gradient(180deg, transparent 0%, #000 20%, #000 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 20%, #000 80%, transparent 100%);
  scrollbar-width: none;
}

.lyrics-container::-webkit-scrollbar {
  display: none;
}

.lyric-line {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.35);
  margin: 20px 0;
  transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1);
  padding: 0 20px;
}

.lyric-line.active {
  font-size: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #ffc2d6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 600;
  text-shadow: 0 0 24px rgba(255, 77, 125, 0.55);
  transform: scale(1.06);
}

.no-lyric {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  gap: 12px;
}

.disc-icon {
  font-size: 40px;
  opacity: 0.5;
}

/* ==========================================================================
   4. 底部播放控制条
   ========================================================================== */
.glass-card-bar {
  background: rgba(12, 13, 20, 0.72);
  backdrop-filter: blur(35px) saturate(1.8);
  -webkit-backdrop-filter: blur(35px) saturate(1.8);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.5);
}

.player-bar {
  position: relative;
  z-index: 20;
  padding: 12px 32px calc(14px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  width: 44px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.custom-slider :deep(.el-slider__runway) {
  background-color: rgba(255, 255, 255, 0.12) !important;
  height: 4px;
  border-radius: 2px;
}

.custom-slider:hover :deep(.el-slider__runway) {
  height: 6px;
}

.custom-slider :deep(.el-slider__bar) {
  background: linear-gradient(90deg, #ff4d7d, #ff8fb3);
  height: 100%;
  border-radius: 2px;
}

.custom-slider :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff;
  background-color: #ff4d7d;
  box-shadow: 0 0 10px rgba(255, 77, 125, 0.8);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.custom-slider :deep(.el-slider__button-wrapper:hover .el-slider__button) {
  transform: scale(1.4);
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.controls {
  display: flex;
  align-items: center;
  gap: 28px;
}

.ctrl-btn {
  color: rgba(255, 255, 255, 0.8) !important;
  font-size: 24px !important;
  transition: all 0.2s ease !important;
}

.ctrl-btn:hover {
  color: #ff8fb3 !important;
  transform: scale(1.15);
}

.play-btn {
  width: 52px !important;
  height: 52px !important;
  font-size: 26px !important;
  background: linear-gradient(135deg, #ff4d7d 0%, #c92c63 100%) !important;
  border: none !important;
  box-shadow: 0 6px 20px rgba(255, 77, 125, 0.45);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s !important;
}

.play-btn:hover {
  transform: scale(1.08) !important;
  box-shadow: 0 8px 26px rgba(255, 77, 125, 0.65) !important;
}

.play-btn:active {
  transform: scale(0.92) !important;
}

.mode-btn-capsule {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px !important;
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 20px !important;
  color: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
}

.mode-btn-capsule:hover {
  background: rgba(255, 77, 125, 0.14) !important;
  border-color: rgba(255, 77, 125, 0.4) !important;
  color: #ffffff !important;
  transform: translateY(-1px);
}

.extra-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.rate-btn {
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: rgba(255, 255, 255, 0.8) !important;
  border-radius: 14px !important;
}

.rate-btn:hover {
  background: rgba(255, 77, 125, 0.16) !important;
  border-color: rgba(255, 77, 125, 0.4) !important;
  color: #ffffff !important;
}

.volume-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vol-icon-btn {
  color: rgba(255, 255, 255, 0.7) !important;
  font-size: 18px !important;
}

.vol-icon-btn:hover {
  color: #ffffff !important;
}

.volume-slider {
  width: 80px;
}

.volume-slider :deep(.el-slider__runway) {
  background-color: rgba(255, 255, 255, 0.15) !important;
  height: 4px;
}

.volume-slider :deep(.el-slider__bar) {
  background-color: rgba(255, 255, 255, 0.85);
  height: 4px;
}

.volume-slider :deep(.el-slider__button) {
  width: 10px;
  height: 10px;
  border: none;
  background-color: #ffffff;
}

/* ==========================================================================
   5. 侧边抽屉面板适配
   ========================================================================== */
:deep(.custom-drawer) {
  background: rgba(12, 13, 20, 0.88) !important;
  backdrop-filter: blur(40px) saturate(1.8) !important;
  -webkit-backdrop-filter: blur(40px) saturate(1.8) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 12px 0 40px rgba(0, 0, 0, 0.6) !important;
  color: #ffffff;
}

:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

:deep(.el-drawer__body) {
  padding: 16px;
  overflow: hidden;
}

.drawer-tab-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-scroll-content {
  flex: 1;
}

.panel-scroll-content :deep(.el-scrollbar__bar.is-vertical > div) {
  background-color: rgba(255, 77, 125, 0.35) !important;
}

.panel-scroll-content :deep(.el-scrollbar__bar.is-vertical > div:hover) {
  background-color: rgba(255, 77, 125, 0.55) !important;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.accent-link-btn {
  color: #ff8fb3 !important;
}

.accent-link-btn:hover {
  color: #ff4d7d !important;
}

.song-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 10px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.song-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateX(4px);
}

.song-item.playing {
  background: rgba(255, 77, 125, 0.16);
  border-color: rgba(255, 77, 125, 0.38);
}

.song-item.playing::before {
  content: '';
  position: absolute;
  left: 0;
  top: 14%;
  bottom: 14%;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #ff8fb3, #ff4d7d);
}

.song-item.playing .song-name {
  color: #ff8fb3;
}

.song-index {
  width: 26px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
}

.song-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 12px;
  overflow: hidden;
}

.song-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.42);
  margin-top: 3px;
}

.item-actions .el-button {
  color: rgba(255, 255, 255, 0.4);
  padding: 6px;
  border-radius: 50%;
  transition: color 0.2s, background-color 0.2s, transform 0.2s;
}

.item-actions .el-button:hover {
  color: #ffffff;
  background-color: rgba(255, 77, 125, 0.18);
  transform: scale(1.08);
}

.search-bar {
  margin-bottom: 14px;
}

.search-bar :deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: none !important;
  border-radius: 10px 0 0 10px;
  transition: border-color 0.2s ease;
}

.search-bar :deep(.el-input__wrapper.is-focus) {
  border-color: rgba(255, 77, 125, 0.55) !important;
}

.search-bar :deep(.el-input__inner) {
  color: #ffffff !important;
}

.search-bar :deep(.el-input-group__append) {
  background-color: rgba(255, 77, 125, 0.25) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-left: none !important;
  color: #ffffff;
  border-radius: 0 10px 10px 0;
  padding: 0 4px;
}

/* 搜索按钮融入粉色容器，去掉默认灰白按钮外观 */
.search-bar :deep(.search-submit-btn) {
  background-color: transparent !important;
  border: none !important;
  color: #ffffff !important;
  font-size: 16px !important;
  padding: 0 12px !important;
  height: 100%;
}

.search-bar :deep(.search-submit-btn:hover) {
  color: #ffe3ec !important;
}

.res-cover, .rec-cover {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 3px 10px rgba(0,0,0,0.35);
}

.recommend-block {
  margin-top: 20px;
}

.section-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 12px;
  font-weight: 600;
}

.rec-card {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 10px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all 0.25s ease;
}

.rec-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.3);
}

.accent-add-btn {
  background-color: rgba(255, 77, 125, 0.12) !important;
  border: 1px solid rgba(255, 77, 125, 0.35) !important;
  color: #ff8fb3 !important;
  transition: all 0.2s ease !important;
}

.accent-add-btn:hover {
  background-color: #ff4d7d !important;
  border-color: #ff4d7d !important;
  color: #ffffff !important;
  transform: scale(1.1);
}

.rec-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 12px;
  overflow: hidden;
}

.rec-name { font-size: 13px; color: rgba(255,255,255,0.88); font-weight: 500; }
.rec-artist { font-size: 11px; color: rgba(255, 255, 255, 0.4); margin-top: 2px; }

/* 正在播放动态波浪小动画 */
.playing-waves {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  height: 12px;
}

.playing-waves i {
  width: 2px;
  height: 100%;
  background-color: #ff4d7d;
  animation: wave 1.2s infinite ease-in-out;
}

.playing-waves i:nth-child(1) { animation-delay: 0s; }
.playing-waves i:nth-child(2) { animation-delay: 0.2s; }
.playing-waves i:nth-child(3) { animation-delay: 0.4s; }

@keyframes wave {
  0%, 100% { height: 3px; }
  50% { height: 12px; }
}

/* ==========================================================================
   6. 响应式适配
   ========================================================================== */
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }

  :deep(.custom-drawer) {
    width: 88% !important;
  }
}

@media (min-width: 769px) {
  .player-center-stage {
    flex-direction: row;
    justify-content: center;
    gap: 80px;
    padding: 0 40px;
  }

  .album-panel {
    flex: 1;
    max-width: 420px;
  }

  .vinyl-wrapper {
    width: 320px;
    height: 320px;
  }

  .lyrics-panel {
    flex: 1.2;
    max-height: 68vh;
  }

  .lyrics-container {
    max-width: 520px;
  }

  .lyric-line {
    font-size: 16px;
    margin: 22px 0;
  }

  .lyric-line.active {
    font-size: 23px;
  }

  .player-bar {
    padding: 14px 48px 18px;
  }

  :deep(.custom-drawer) {
    width: 420px !important;
  }
}
</style>