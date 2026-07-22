<template>
  <div class="player-container">
    <!-- 隐形 Audio 元素：直接使用 relative URL -->
    <audio
        ref="audioRef"
        :src="currentTrack ? currentTrack.fileUrl : ''"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @ended="nextTrack"
    ></audio>

    <!-- 氛围感高斯模糊背景 -->
    <div
        class="bg-cover"
        :style="{ backgroundImage: currentTrack ? `url(${currentTrack.coverUrl})` : 'none' }"
    ></div>
    <div class="bg-overlay"></div>
    <div class="ambient-glow"></div>

    <!-- 顶部 Header -->
    <header class="header">
      <div class="logo">
        <span class="logo-icon">🍓</span>
        <span class="title">莓莓音乐</span>
        <span class="version">v2.0</span>
      </div>

      <nav class="nav-tabs">
        <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['nav-btn', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </nav>

      <div class="user-action">
        <button class="login-btn">
          <span class="avatar-placeholder">👤</span>
          登录
        </button>
      </div>
    </header>

    <!-- 中间主内容区 -->
    <main class="main-content">
      <!-- 搜索/播放列表模式 -->
      <section v-if="activeTab === 'search'" class="glass-card list-panel">
        <div class="search-bar">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
                v-model="searchKeyword"
                placeholder="搜索歌曲或歌手..."
                @keyup.enter="handleSearch"
                class="search-input"
            />
          </div>
          <button @click="handleSearch" class="glow-btn">搜索</button>
        </div>

        <div class="song-list">
          <div
              v-for="(item, index) in songList"
              :key="item.id"
              :class="['song-item', { playing: currentIndex === index }]"
              @click="selectTrack(index)"
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
            <button class="item-play-btn">▶</button>
          </div>
        </div>
      </section>

      <!-- 正在播放模式：歌词展示区 -->
      <section v-else class="lyrics-panel">
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
            <p>纯音乐，请欣赏</p>
          </div>
        </div>
      </section>

      <!-- 右侧：唱片 & 歌曲信息卡片 -->
      <aside class="right-panel">
        <div class="album-card" v-if="currentTrack">
          <!-- 唱机臂与黑胶唱片结构 -->
          <div :class="['vinyl-wrapper', { 'is-playing': isPlaying }]">
            <div class="tonearm"></div>
            <div class="vinyl-disc">
              <img :src="currentTrack.coverUrl" class="cover-img" alt="专辑封面" />
            </div>
          </div>

          <div class="track-info">
            <h2 class="track-title">{{ currentTrack.name }}</h2>
            <p class="track-artist">{{ currentTrack.artist }}</p>
          </div>
        </div>
      </aside>
    </main>

    <!-- 底部播放控制条 -->
    <footer class="player-bar">
      <div class="controls">
        <button class="icon-btn" @click="prevTrack" title="上一首">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button class="icon-btn play-btn" @click="togglePlay" title="播放/暂停">
          <svg v-if="!isPlaying" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button class="icon-btn" @click="nextTrack" title="下一首">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
      </div>

      <!-- 进度条 -->
      <div class="progress-container">
        <span class="time">{{ formatTime(currentTime) }}</span>
        <div class="progress-bar" @click="seek">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }">
            <div class="progress-thumb"></div>
          </div>
        </div>
        <span class="time">{{ formatTime(duration) }}</span>
      </div>

      <div class="extra-controls">
        <button
            :class="['icon-btn', 'list-toggle', { active: activeTab === 'search' }]"
            @click="activeTab = activeTab === 'search' ? 'playing' : 'search'"
            title="播放列表"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { getMusicList } from '@/api/music/music.js'
import { parseLrc } from '@/util/lyric.js'

// DOM 节点引用
const audioRef = ref(null)
const lyricsContainerRef = ref(null)
const currentLyricEl = ref(null)

// 导航 Tabs
const tabs = [
  { id: 'playing', name: '正在播放' },
  { id: 'search', name: '搜索 / 列表' }
]
const activeTab = ref('playing')
const searchKeyword = ref('勾指起誓')

// 播放数据与状态
const songList = ref([])
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

// 当前歌曲
const currentTrack = computed(() => songList.value[currentIndex.value] || null)

// 歌词解析与高亮
const parsedLyrics = computed(() => {
  if (!currentTrack.value || !currentTrack.value.nameLyric) return []
  return parseLrc(currentTrack.value.nameLyric)
})

const currentLyricIndex = computed(() => {
  if (!parsedLyrics.value.length) return -1
  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (currentTime.value >= parsedLyrics.value[i].time) {
      return i
    }
  }
  return 0
})

// 请求数据
const handleSearch = async () => {
  try {
    const res = await getMusicList(searchKeyword.value)
    const records = res?.data?.data?.records || []
    if (records.length > 0) {
      songList.value = records
      currentIndex.value = 0
    }
  } catch (error) {
    console.error('获取列表失败:', error)
  }
}

// 播放控制
const togglePlay = () => {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
  } else {
    audioRef.value.play()
    isPlaying.value = true
  }
}

const selectTrack = (index) => {
  currentIndex.value = index
  activeTab.value = 'playing'
  playCurrent()
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

const playCurrent = () => {
  nextTick(() => {
    if (audioRef.value) {
      audioRef.value.play()
      isPlaying.value = true
    }
  })
}

// 播放事件处理
const onTimeUpdate = () => {
  if (audioRef.value) currentTime.value = audioRef.value.currentTime
}

const onLoadedMetadata = () => {
  if (audioRef.value) duration.value = audioRef.value.duration
}

const progressPercent = computed(() => {
  return duration.value ? (currentTime.value / duration.value) * 100 : 0
})

const seek = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const width = rect.width
  const seekTime = (clickX / width) * duration.value
  if (audioRef.value) {
    audioRef.value.currentTime = seekTime
    currentTime.value = seekTime
  }
}

const formatTime = (time) => {
  if (isNaN(time)) return '00:00'
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
}

// 歌词平滑滚动
watch(currentLyricIndex, () => {
  nextTick(() => {
    if (currentLyricEl.value && lyricsContainerRef.value) {
      const container = lyricsContainerRef.value
      const el = currentLyricEl.value
      const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
      container.scrollTo({ top, behavior: 'smooth' })
    }
  })
})

onMounted(() => {
  handleSearch()
})
</script>

<style scoped>
/* 容器及基础设置 */
.player-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif;
  overflow: hidden;
  background-color: #0b0c10;
  user-select: none;
}

/* 沉浸式背景及光晕 */
.bg-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  filter: blur(65px) saturate(1.8) brightness(0.45);
  transform: scale(1.2);
  transition: background-image 1s ease-in-out;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, rgba(15, 15, 25, 0.2) 0%, rgba(5, 5, 10, 0.75) 100%);
  z-index: 2;
}

.ambient-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 60vw;
  height: 60vw;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 60%);
  z-index: 2;
  pointer-events: none;
}

/* 顶栏 Header */
.header {
  position: relative;
  z-index: 10;
  height: 70px;
  padding: 0 45px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon { font-size: 22px; }

.title {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.version {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
}

.nav-tabs {
  display: flex;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  padding: 4px;
  border-radius: 30px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.65);
  padding: 7px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-btn.active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.login-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.3s;
}

.login-btn:hover { background: rgba(255, 255, 255, 0.18); }

/* 主主体内容区 */
.main-content {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  padding: 10px 80px 30px;
  gap: 60px;
  overflow: hidden;
}

/* 玻璃质感卡片标准件 */
.glass-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
}

/* 列表 / 搜索视窗 */
.list-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0 14px;
  transition: border-color 0.3s;
}

.search-input-wrapper:focus-within {
  border-color: rgba(255, 255, 255, 0.35);
}

.search-icon { opacity: 0.5; font-size: 14px; margin-right: 8px; }

.search-input {
  width: 100%;
  background: transparent;
  border: none;
  padding: 10px 0;
  color: #fff;
  font-size: 14px;
  outline: none;
}

.glow-btn {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 0 20px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.glow-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
}

.song-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
}

.song-list::-webkit-scrollbar {
  width: 4px;
}

.song-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.song-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 6px;
  transition: all 0.25s ease;
}

.song-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}

.song-item.playing {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
}

.song-index {
  width: 36px;
  font-size: 13px;
  opacity: 0.5;
  display: flex;
  align-items: center;
}

.song-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.song-name { font-size: 14px; font-weight: 500; }
.song-artist { font-size: 12px; opacity: 0.5; }

.item-play-btn {
  background: transparent;
  border: none;
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
  cursor: pointer;
}

.song-item:hover .item-play-btn { opacity: 0.8; }

/* 动态音浪动画 */
.playing-waves {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: 12px;
}

.playing-waves i {
  width: 2px;
  height: 100%;
  background: #ffffff;
  animation: wave 1s infinite ease-in-out;
}

.playing-waves i:nth-child(2) { animation-delay: 0.2s; }
.playing-waves i:nth-child(3) { animation-delay: 0.4s; }

@keyframes wave {
  0%, 100% { height: 3px; }
  50% { height: 12px; }
}

/* 歌词面板 */
.lyrics-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lyrics-container {
  width: 100%;
  max-width: 550px;
  height: 80%;
  overflow-y: auto;
  text-align: center;
  mask-image: linear-gradient(180deg, transparent 0%, #000 20%, #000 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 20%, #000 80%, transparent 100%);
}

.lyrics-container::-webkit-scrollbar { display: none; }

.lyric-line {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.4);
  margin: 22px 0;
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  line-height: 1.5;
}

.lyric-line.active {
  font-size: 22px;
  color: #ffffff;
  font-weight: 600;
  transform: scale(1.06);
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
}

.no-lyric {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.disc-icon { font-size: 32px; }

/* 右侧唱片 & 信息区 */
.right-panel {
  width: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
}

/* 黑胶唱机设计 */
.vinyl-wrapper {
  position: relative;
  width: 240px;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 唱机臂 */
.tonearm {
  position: absolute;
  top: -30px;
  right: 10px;
  width: 70px;
  height: 90px;
  background: transparent;
  border-right: 4px solid rgba(255, 255, 255, 0.7);
  border-top: 4px solid rgba(255, 255, 255, 0.7);
  border-top-right-radius: 20px;
  z-index: 10;
  transform-origin: 100% 0;
  transform: rotate(-25deg);
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.vinyl-wrapper.is-playing .tonearm {
  transform: rotate(0deg);
}

/* 黑胶唱片盘 */
.vinyl-disc {
  width: 230px;
  height: 230px;
  border-radius: 50%;
  background: radial-gradient(circle, #0b0b0b 25%, #181818 26%, #0b0b0b 27%, #151515 80%, #000 100%);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), inset 0 0 0 2px rgba(255, 255, 255, 0.1);
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
  width: 130px;
  height: 130px;
  border-radius: 50%;
  object-fit: cover;
  border: 6px solid #0a0a0a;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.track-info { text-align: center; }
.track-title { font-size: 20px; font-weight: 600; margin-bottom: 6px; letter-spacing: 0.5px; }
.track-artist { font-size: 14px; opacity: 0.6; }

/* 底部播放 Bar */
.player-bar {
  position: relative;
  z-index: 20;
  height: 85px;
  padding: 0 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 15, 20, 0.4);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover { color: #ffffff; transform: scale(1.1); }

.play-btn {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #ffffff;
  color: #000000;
  box-shadow: 0 4px 20px rgba(255, 255, 255, 0.3);
}

.play-btn:hover {
  background: #ffffff;
  color: #000000;
  transform: scale(1.06);
  box-shadow: 0 6px 24px rgba(255, 255, 255, 0.5);
}

.progress-container {
  flex: 0.5;
  display: flex;
  align-items: center;
  gap: 16px;
}

.time { font-size: 12px; opacity: 0.5; width: 45px; text-align: center; font-variant-numeric: tabular-nums; }

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  transition: height 0.2s;
}

.progress-bar:hover { height: 6px; }

.progress-fill {
  height: 100%;
  background: #ffffff;
  border-radius: 2px;
  position: relative;
}

.progress-thumb {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%) scale(0);
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
  transition: transform 0.2s;
}

.progress-bar:hover .progress-thumb {
  transform: translateY(-50%) scale(1);
}

.extra-controls { display: flex; gap: 16px; }

.list-toggle.active { color: #ffffff; }
</style>