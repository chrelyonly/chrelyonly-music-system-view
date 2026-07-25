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

    <!-- 顶部 Header -->
    <header class="header">
      <div class="logo">
        <span class="logo-icon">🍓</span>
        <span class="title">莓莓音乐</span>
      </div>

      <nav class="nav-tabs">
        <el-button
            round
            size="small"
            :type="activeLeftTab === 'playlist' ? 'primary' : 'info'"
            @click="openMobileDrawer('playlist')"
        >
          🎶 列表
        </el-button>
        <el-button
            round
            size="small"
            :type="activeLeftTab === 'search' ? 'primary' : 'info'"
            @click="openMobileDrawer('search')"
        >
          🔍 搜索
        </el-button>
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

    <!-- 移动端 / PC 共用抽屉面板（替换原手写抽屉） -->
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
      <!-- 进度条（使用 el-slider 简化代码） -->
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
        <el-button link class="mode-btn" @click="togglePlayMode" :title="playModeText">
          <span>{{ playModeIcon }}</span>
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

// 抽屉与移动端控制
const openMobileDrawer = (tab) => {
  activeLeftTab.value = tab
  isMobileDrawerOpen.value = true
}

const selectTrackMobile = (index) => {
  selectTrack(index)
  isMobileDrawerOpen.value = false
}

const addToPlaylistAndPlayMobile = (song) => {
  addToPlaylistAndPlay(song)
  isMobileDrawerOpen.value = false
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
  /* 适配移动端浏览器 Height 抖动 */
  height: 100dvh;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  background-color: #0b0c10;
  overflow: hidden;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* 背景图片高斯模糊 (优化移动端 GPU 渲染性能) */
.bg-cover {
  position: absolute;
  inset: -10%;
  background-size: cover;
  background-position: center;
  filter: blur(40px) saturate(1.5) brightness(0.3);
  transform: scale(1.1);
  transition: background-image 0.8s ease-in-out;
  will-change: transform, background-image;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(15, 15, 25, 0.1) 0%, rgba(5, 5, 10, 0.85) 100%);
  z-index: 2;
}

/* ==========================================================================
   2. 顶部 Header
   ========================================================================== */
.header {
  position: relative;
  z-index: 10;
  height: 56px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 22px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-tabs {
  display: flex;
  gap: 8px;
}

/* ==========================================================================
   3. 主内容区 (唱片 + 歌词) - 移动端默认上下排列
   ========================================================================== */
.main-content {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  padding: 12px;
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
  gap: 16px;
}

/* --- 唱片区域 --- */
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
  width: clamp(180px, 45vw, 280px);
  height: clamp(180px, 45vw, 280px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 唱头 */
.tonearm {
  position: absolute;
  top: -10px;
  right: 20%;
  width: 30px;
  height: 60px;
  border-right: 3px solid rgba(255, 255, 255, 0.85);
  border-top: 3px solid rgba(255, 255, 255, 0.85);
  border-top-right-radius: 12px;
  z-index: 12;
  transform-origin: 100% 0;
  transform: rotate(-30deg);
  transition: transform 0.5s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.vinyl-wrapper.is-playing .tonearm {
  transform: rotate(-3deg);
}

/* 黑胶碟片 */
.vinyl-disc {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, #0d0d0d 22%, #1a1a1a 24%, #0d0d0d 26%, #151515 80%, #000000 100%);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), inset 0 0 0 2px rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 20s linear infinite;
  animation-play-state: paused;
}

.vinyl-wrapper.is-playing .vinyl-disc {
  animation-play-state: running;
}

.cover-img {
  width: 50%;
  height: 50%;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #0a0a0a;
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.track-info {
  margin-top: 16px;
  text-align: center;
  max-width: 80vw;
}

.track-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- 歌词展示区 --- */
.lyrics-panel {
  width: 100%;
  flex: 1;
  max-height: 40vh;
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
  /* 上下渐变隐藏过渡效果 */
  mask-image: linear-gradient(180deg, transparent 0%, #000 20%, #000 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 20%, #000 80%, transparent 100%);
  scrollbar-width: none; /* 隐藏滚动条 */
}

.lyrics-container::-webkit-scrollbar {
  display: none;
}

.lyric-line {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.45);
  margin: 14px 0;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  padding: 0 16px;
}

.lyric-line.active {
  font-size: 17px;
  color: #ffffff;
  font-weight: 600;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

.no-lyric {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  gap: 8px;
}

.disc-icon {
  font-size: 32px;
}

/* ==========================================================================
   4. 底部播放控制条
   ========================================================================== */
.glass-card-bar {
  background: rgba(15, 15, 25, 0.75);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.player-bar {
  position: relative;
  z-index: 20;
  padding: 10px 20px calc(12px + env(safe-area-inset-bottom)); /* 适配移动端全面屏底条 */
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 进度条样式改写 */
.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  width: 38px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.custom-slider {
  flex: 1;
  --el-slider-main-bg-color: #409eff;
  --el-slider-runway-bg-color: rgba(255, 255, 255, 0.15);
  --el-slider-stop-bg-color: rgba(255, 255, 255, 0.2);
}

/* 控制按钮排列 */
.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mode-btn {
  font-size: 18px;
  padding: 8px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.controls .el-button {
  color: #fff;
  font-size: 20px;
}

.play-btn {
  width: 44px !important;
  height: 44px !important;
  font-size: 22px !important;
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.4);
}

.extra-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.volume-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-slider {
  width: 70px;
  --el-slider-main-bg-color: rgba(255, 255, 255, 0.7);
  --el-slider-runway-bg-color: rgba(255, 255, 255, 0.2);
}

/* ==========================================================================
   5. 抽屉面板内部适配
   ========================================================================== */
:deep(.custom-drawer) {
  background: rgba(18, 18, 28, 0.9) !important;
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  color: #fff;
}

:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

:deep(.el-drawer__body) {
  padding: 12px;
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
  padding: 8px 4px 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.song-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.song-item:active, .song-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.song-item.playing {
  background: rgba(64, 158, 255, 0.15);
}

.song-index {
  width: 24px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}

.song-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 10px;
  overflow: hidden;
}

.song-name {
  font-size: 14px;
  color: #eee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
}

.search-bar {
  margin-bottom: 12px;
}

.res-cover, .rec-cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
}

.recommend-block {
  margin-top: 16px;
}

.section-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 10px;
}

.rec-card {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
}

.rec-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 10px;
  overflow: hidden;
}

.rec-name { font-size: 13px; color: #fff; }
.rec-artist { font-size: 11px; color: rgba(255, 255, 255, 0.4); }

/* ==========================================================================
   6. 响应式断点控制 (PC 端与平板适配)
   ========================================================================== */

/* 手机端独有修正 */
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }

  :deep(.custom-drawer) {
    width: 85% !important; /* 手机端抽屉宽度 */
  }
}

/* PC 桌面端 (宽度 > 768px) */
@media (min-width: 769px) {
  .player-center-stage {
    flex-direction: row; /* 左右排版 */
    justify-content: center;
    gap: 60px;
    padding: 0 40px;
  }

  .album-panel {
    flex: 1;
    max-width: 450px;
  }

  .vinyl-wrapper {
    width: 300px;
    height: 300px;
  }

  .lyrics-panel {
    flex: 1.2;
    max-height: 70vh;
  }

  .lyrics-container {
    max-width: 500px;
  }

  .lyric-line {
    font-size: 15px;
    margin: 18px 0;
  }

  .lyric-line.active {
    font-size: 20px;
  }

  .player-bar {
    padding: 12px 40px 16px;
  }

  :deep(.custom-drawer) {
    width: 400px !important; /* PC 端抽屉定宽，避免铺满 screen */
  }
}
</style>