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

    <!-- 背景模糊层 -->
    <div
        class="bg-cover"
        :style="{ backgroundImage: currentTrack ? `url(${currentTrack.coverUrl})` : 'none' }"
    ></div>
    <div class="bg-overlay"></div>

    <!-- 顶部 Header（优化美化后） -->
    <header class="header">
      <div class="logo">
        <span class="logo-icon">🍓</span>
        <span class="title">莓莓音乐</span>
      </div>

      <!-- 优化后：将两个独立按钮合并为无缝分段胶囊控制组件 -->
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
        <!-- 唱片展示 -->
        <aside class="album-panel" v-if="currentTrack">
          <div class="album-card glass-card">
            <div :class="['vinyl-wrapper', { 'is-playing': isPlaying }]">
              <div class="tonearm"></div>
              <div class="vinyl-disc">
                <img :src="currentTrack.coverUrl" class="cover-img" alt="封面" />
              </div>
            </div>

            <div class="track-info">
              <h2 class="track-title">{{ currentTrack.name }}</h2>
              <p class="track-artist">{{ currentTrack.artist }}</p>
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
              <p>暂无歌词或纯音乐</p>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 移动端 / PC 共用抽屉面板 -->
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
        />
      </template>

      <!-- 列表页 -->
      <div v-show="activeLeftTab === 'playlist'" class="drawer-tab-content">
        <div class="list-header">
          <span>当前列表 ({{ songList.length }}/1000)</span>
          <el-button v-if="songList.length" type="danger" link size="small" @click="clearPlaylist">
            清空
          </el-button>
        </div>

        <el-scrollbar v-if="songList.length">
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
              <el-button link icon="Download" @click="downloadSong(item)" />
              <el-button link icon="Close" @click="removeFromPlaylist(index)" />
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
              <el-button icon="Search" :loading="searching" @click="handleSearch" />
            </template>
          </el-input>
        </div>

        <el-scrollbar class="panel-scroll-content">
          <div v-if="searchResults.length" class="search-results">
            <div class="list-header">
              <span>搜索结果</span>
              <el-button type="primary" link size="small" @click="addAllToPlaylist">
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
                <el-button link icon="Plus" @click="addToPlaylistOnly(item)" />
                <el-button link icon="VideoPlay" @click="addToPlaylistAndPlayMobile(item)" />
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
              <img :src="item.coverUrl" class="rec-cover" />
              <div class="rec-info">
                <span class="rec-name">{{ item.name }}</span>
                <span class="rec-artist">{{ item.artist }}</span>
              </div>
              <el-button
                  circle
                  size="small"
                  icon="Plus"
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
        <el-button link class="mode-btn-capsule" @click="togglePlayMode" :title="playModeText">
          <span class="mode-icon">{{ playModeIcon }}</span>
          <span class="mode-text desktop-only">{{ playModeText }}</span>
        </el-button>
        <div class="controls">
          <el-button link icon="Back" @click="prevTrack" />
          <el-button
              circle
              type="primary"
              class="play-btn"
              :icon="isPlaying ? 'VideoPause' : 'VideoPlay'"
              @click="togglePlay"
          />
          <el-button link icon="Right" @click="nextTrack" />
        </div>

        <div class="extra-controls">
          <el-button size="small" round @click="changePlaybackRate">
            {{ playbackRate }}x
          </el-button>

          <!-- 手机端隐藏音量控制 -->
          <div class="volume-container desktop-only">
            <el-button link :icon="isMuted || volume === 0 ? 'Mute' : 'Microphone'" @click="toggleMute" />
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
   1. 全局容器与动态背景
   ========================================================================== */
.player-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  background-color: #090a0f;
  overflow: hidden;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
}

.bg-cover {
  position: absolute;
  inset: -15%;
  background-size: cover;
  background-position: center;
  filter: blur(60px) saturate(1.8) brightness(0.22);
  transform: scale(1.15);
  transition: background-image 1s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, background-image;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 40%, rgba(20, 20, 35, 0.1) 0%, rgba(5, 5, 10, 0.92) 100%);
  z-index: 2;
}

/* ==========================================================================
   2. 顶部 Header (重点优化)
   ========================================================================== */
.header {
  position: relative;
  z-index: 10;
  height: 60px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.015);
  backdrop-filter: blur(16px);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 10px rgba(255, 75, 130, 0.5));
}

.title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1.5px;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.65) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 顶部导航 Segmented 磨砂拟物样式 */
.nav-segmented-wrapper {
  display: flex;
  align-items: center;
}

.header-segmented {
  --el-segmented-bg-color: rgba(255, 255, 255, 0.06);
  --el-segmented-item-selected-bg-color: rgba(255, 255, 255, 0.18);
  --el-segmented-item-selected-color: #ffffff;
  --el-segmented-item-color: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 3px;
  border-radius: 20px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.header-segmented :deep(.el-segmented__item) {
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  padding: 4px 12px;
  transition: all 0.25s ease;
}

.header-segmented :deep(.el-segmented__item:hover:not(.is-selected)) {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.08);
}

.header-segmented :deep(.el-segmented__item.is-selected) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

/* ==========================================================================
   3. 主内容区 (唱片 + 歌词)
   ========================================================================== */
.main-content {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  padding: 16px;
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
  justify-content: space-evenly;
  gap: 20px;
}

/* 唱片区域 */
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
  width: clamp(210px, 50vw, 295px);
  height: clamp(210px, 50vw, 295px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tonearm {
  position: absolute;
  top: -22px;
  right: 20%;
  width: 36px;
  height: 72px;
  border-right: 4px solid rgba(240, 240, 240, 0.88);
  border-top: 4px solid rgba(240, 240, 240, 0.88);
  border-top-right-radius: 14px;
  z-index: 12;
  transform-origin: 100% 0;
  transform: rotate(-32deg);
  transition: transform 0.6s cubic-bezier(0.34, 1.4, 0.64, 1);
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.7));
}

.tonearm::before {
  content: '';
  position: absolute;
  top: -6px;
  right: -6px;
  width: 10px;
  height: 10px;
  background: #e0e0e0;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0,0,0,0.5);
}

.tonearm::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: -2px;
  width: 8px;
  height: 12px;
  background: #a0a0a0;
  border-radius: 2px;
  transform: rotate(15deg);
}

.vinyl-wrapper.is-playing .tonearm {
  transform: rotate(-2deg);
}

.vinyl-disc {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, #101010 18%, #222 20%, #101010 22%, #1a1a1a 78%, #050505 100%);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75),
  inset 0 0 0 2px rgba(255, 255, 255, 0.12),
  0 0 0 8px rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 22s linear infinite;
  animation-play-state: paused;
  overflow: hidden;
}

.vinyl-disc::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(255,255,255,0.05) 100%);
  pointer-events: none;
}

.vinyl-wrapper.is-playing .vinyl-disc {
  animation-play-state: running;
}

.cover-img {
  width: 52%;
  height: 52%;
  border-radius: 50%;
  object-fit: cover;
  border: 5px solid #0d0d0d;
  box-shadow: 0 0 18px rgba(0, 0, 0, 0.7);
  z-index: 2;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.track-info {
  margin-top: 22px;
  text-align: center;
  max-width: 80vw;
}

.track-title {
  font-size: 21px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.5px;
}

.track-artist {
  font-size: 13px;
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
  mask-image: linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
  scrollbar-width: none;
}

.lyrics-container::-webkit-scrollbar {
  display: none;
}

.lyric-line {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.38);
  margin: 18px 0;
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  padding: 0 20px;
}

.lyric-line.active {
  font-size: 19px;
  color: #ffffff;
  font-weight: 600;
  text-shadow: 0 0 18px rgba(255, 255, 255, 0.7);
  transform: scale(1.05);
  animation: lyricPulse 3s ease-in-out infinite alternate;
}

@keyframes lyricPulse {
  0% { text-shadow: 0 0 14px rgba(255, 255, 255, 0.5); }
  100% { text-shadow: 0 0 22px rgba(255, 255, 255, 0.85); }
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
  font-size: 38px;
  opacity: 0.5;
}

/* ==========================================================================
   4. 底部播放控制条
   ========================================================================== */
.glass-card-bar {
  background: rgba(14, 15, 23, 0.68);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.4);
}

.player-bar {
  position: relative;
  z-index: 20;
  padding: 12px 28px calc(14px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.42);
  width: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.custom-slider :deep(.el-slider__runway) {
  background-color: rgba(255, 255, 255, 0.1) !important;
  height: 4px;
  border-radius: 2px;
  transition: height 0.2s;
}

.custom-slider:hover :deep(.el-slider__runway) {
  height: 6px;
}

.custom-slider :deep(.el-slider__bar) {
  background: linear-gradient(90deg, #409eff, #79bbff);
  height: 100%;
  border-radius: 2px;
}

.custom-slider :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  background-color: #409eff;
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.9);
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
  gap: 26px;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.mode-btn-capsule:hover {
  background: rgba(255, 255, 255, 0.14) !important;
  border-color: rgba(255, 255, 255, 0.28) !important;
  color: #ffffff !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.mode-btn-capsule:active {
  transform: translateY(0) scale(0.96);
}

.mode-icon {
  font-size: 15px;
  line-height: 1;
}

.mode-text {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.75);
}

.mode-btn-capsule:hover .mode-text {
  color: #ffffff;
}

.controls .el-button {
  color: rgba(255, 255, 255, 0.85);
  font-size: 22px;
  transition: all 0.2s ease;
}

.controls .el-button:hover {
  color: #fff;
  transform: scale(1.12);
}

.play-btn {
  width: 50px !important;
  height: 50px !important;
  font-size: 24px !important;
  background: linear-gradient(135deg, #409eff 0%, #0066ff 100%) !important;
  border: none !important;
  box-shadow: 0 4px 18px rgba(64, 158, 255, 0.45);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s !important;
}

.play-btn:hover {
  transform: scale(1.08) !important;
  box-shadow: 0 6px 24px rgba(64, 158, 255, 0.65) !important;
}

.play-btn:active {
  transform: scale(0.92) !important;
}

.extra-controls {
  display: flex;
  align-items: center;
  gap: 14px;
}

.extra-controls :deep(.el-button) {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.75);
  border-radius: 14px;
}

.extra-controls :deep(.el-button:hover) {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.volume-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-slider {
  width: 75px;
}

.volume-slider :deep(.el-slider__runway) {
  background-color: rgba(255, 255, 255, 0.12) !important;
  height: 3px;
}

.volume-slider :deep(.el-slider__bar) {
  background-color: rgba(255, 255, 255, 0.75);
  height: 3px;
}

.volume-slider :deep(.el-slider__button) {
  width: 8px;
  height: 8px;
  border: none;
  background-color: #fff;
}

/* ==========================================================================
   5. 抽屉面板内部适配
   ========================================================================== */
:deep(.custom-drawer) {
  background: rgba(14, 15, 23, 0.85) !important;
  backdrop-filter: blur(35px) saturate(1.8) !important;
  -webkit-backdrop-filter: blur(35px) saturate(1.8) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 12px 0 40px rgba(0, 0, 0, 0.6) !important;
  color: #fff;
}

:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

:deep(.el-segmented) {
  --el-segmented-bg-color: rgba(255, 255, 255, 0.05);
  --el-segmented-item-selected-bg-color: rgba(64, 158, 255, 0.32);
  --el-segmented-item-selected-color: #fff;
  --el-segmented-item-color: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 3px;
  border-radius: 12px;
}

:deep(.el-drawer__close-btn) {
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  transition: color 0.2s;
}

:deep(.el-drawer__close-btn:hover) {
  color: #fff;
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

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.song-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 10px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.song-item:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateX(4px);
}

.song-item.playing {
  background: rgba(64, 158, 255, 0.18);
  border-color: rgba(64, 158, 255, 0.38);
  box-shadow: inset 3px 0 0 #409eff;
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
  color: rgba(255, 255, 255, 0.35);
  padding: 4px;
  transition: color 0.2s;
}

.item-actions .el-button:hover {
  color: #fff;
}

.search-bar {
  margin-bottom: 14px;
}

.search-bar :deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: none !important;
  border-radius: 10px 0 0 10px;
  transition: border-color 0.2s;
}

.search-bar :deep(.el-input__wrapper.is-focus) {
  border-color: rgba(64, 158, 255, 0.5) !important;
}

.search-bar :deep(.el-input__inner) {
  color: #fff !important;
}

.search-bar :deep(.el-input-group__append) {
  background-color: rgba(64, 158, 255, 0.22) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-left: none !important;
  color: #fff;
  border-radius: 0 10px 10px 0;
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
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.1);
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

.rec-card :deep(.el-button) {
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: rgba(255, 255, 255, 0.75);
}

.rec-card :deep(.el-button:hover) {
  background: rgba(64, 158, 255, 0.45);
  color: #fff;
}

:deep(.el-empty__description p) {
  color: rgba(255, 255, 255, 0.35);
}

/* ==========================================================================
   6. 响应式断点控制
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
    font-size: 15px;
    margin: 20px 0;
  }

  .lyric-line.active {
    font-size: 22px;
  }

  .player-bar {
    padding: 14px 48px 18px;
  }

  :deep(.custom-drawer) {
    width: 420px !important;
  }
}
</style>