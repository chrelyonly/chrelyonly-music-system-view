<template>
  <div class="player-container">
    <!-- 隐形 Audio 元素 -->
    <audio
        ref="audioRef"
        :src="currentTrack ? currentTrack.fileUrl : ''"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @ended="nextTrack"
    ></audio>

    <!-- 背景图及毛玻璃遮罩 -->
    <div
        class="bg-cover"
        :style="{ backgroundImage: currentTrack ? `url(${currentTrack.coverUrl})` : 'none' }"
    ></div>
    <div class="bg-overlay"></div>

    <!-- 顶部 Header -->
    <header class="header">
      <div class="logo">
        <span class="title">莓莓音乐播放器</span>
        <span class="version">v1.0</span>
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
        <button class="login-btn">登录</button>
      </div>
    </header>

    <!-- 中间主内容区 -->
    <main class="main-content">
      <!-- 搜索/播放列表模式 -->
      <section v-if="activeTab === 'search'" class="list-panel">
        <div class="search-bar">
          <input
              v-model="searchKeyword"
              placeholder="搜索歌曲..."
              @keyup.enter="handleSearch"
              class="search-input"
          />
          <button @click="handleSearch" class="search-btn">搜索</button>
        </div>
        <div class="song-list">
          <div
              v-for="(item, index) in songList"
              :key="item.id"
              :class="['song-item', { playing: currentIndex === index }]"
              @click="selectTrack(index)"
          >
            <span class="song-index">{{ index + 1 }}</span>
            <span class="song-name">{{ item.name }}</span>
            <span class="song-artist">{{ item.artist }}</span>
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
          <div v-else class="no-lyric">暂无歌词</div>
        </div>
      </section>

      <!-- 右侧：唱片 & 歌曲信息卡片 -->
      <aside class="right-panel">
        <div class="album-card" v-if="currentTrack">
          <div :class="['vinyl-wrapper', { 'is-playing': isPlaying }]">
            <img :src="currentTrack.coverUrl" class="cover-img" alt="专辑封面" />
            <div class="vinyl-disc"></div>
          </div>
          <div class="track-info">
            <h3 class="track-title">{{ currentTrack.name }}</h3>
            <p class="track-artist">{{ currentTrack.artist }}</p>
          </div>
        </div>
      </aside>
    </main>

    <!-- 底部播放控制条 -->
    <footer class="player-bar">
      <div class="controls">
        <button class="icon-btn" @click="prevTrack" title="上一首">⏮</button>
        <button class="icon-btn play-btn" @click="togglePlay" title="播放/暂停">
          <span>{{ isPlaying ? '⏸' : '▶' }}</span>
        </button>
        <button class="icon-btn" @click="nextTrack" title="下一首">⏭</button>
      </div>

      <!-- 进度条 -->
      <div class="progress-container">
        <span class="time">{{ formatTime(currentTime) }}</span>
        <div class="progress-bar" @click="seek">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="time">{{ formatTime(duration) }}</span>
      </div>

      <div class="extra-controls">
        <button class="icon-btn" @click="activeTab = 'search'" title="播放列表">🎵</button>
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
    // 根据接口返回结构解构：res.data.data.data.records
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
/* 样式与前一致，支持毛玻璃高斯模糊 */
.player-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
  background-color: #121212;
}

.bg-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  filter: blur(50px) brightness(0.5);
  transform: scale(1.15);
  transition: background-image 0.8s ease-in-out;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.35);
  z-index: 2;
}

.header {
  position: relative;
  z-index: 10;
  height: 60px;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo .title { font-size: 18px; font-weight: 600; }
.logo .version { font-size: 11px; opacity: 0.5; margin-left: 6px; }

.nav-tabs {
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px;
  border-radius: 8px;
  backdrop-filter: blur(12px);
}

.nav-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s ease;
}

.nav-btn.active, .nav-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
}

.login-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
}

.main-content {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  padding: 20px 80px;
  gap: 40px;
  overflow: hidden;
}

.lyrics-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.lyrics-container {
  width: 100%;
  max-width: 500px;
  height: 70%;
  overflow-y: auto;
  scroll-behavior: smooth;
  text-align: center;
  mask-image: linear-gradient(180deg, transparent 0%, #000 15%, #000 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 15%, #000 85%, transparent 100%);
}

.lyrics-container::-webkit-scrollbar { display: none; }

.lyric-line {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  margin: 18px 0;
  transition: all 0.4s ease;
}

.lyric-line.active {
  font-size: 20px;
  color: #ffffff;
  font-weight: 600;
  transform: scale(1.05);
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
}

.no-lyric {
  color: rgba(255, 255, 255, 0.4);
  margin-top: 100px;
}

.list-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(15px);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.search-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  color: #fff;
  outline: none;
}

.search-btn {
  background: rgba(255, 255, 255, 0.25);
  border: none;
  color: #fff;
  padding: 0 16px;
  border-radius: 6px;
  cursor: pointer;
}

.song-list {
  flex: 1;
  overflow-y: auto;
}

.song-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
}

.song-item:hover { background: rgba(255, 255, 255, 0.1); }
.song-item.playing { background: rgba(255, 255, 255, 0.2); font-weight: bold; }
.song-index { width: 30px; opacity: 0.5; }
.song-name { flex: 1; }
.song-artist { opacity: 0.6; font-size: 12px; }

.right-panel {
  width: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.vinyl-wrapper {
  position: relative;
  width: 180px;
  height: 180px;
}

.cover-img {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 2;
}

.vinyl-disc {
  position: absolute;
  top: 5px;
  right: -20px;
  width: 170px;
  height: 170px;
  background: radial-gradient(circle, #111 30%, #222 70%);
  border-radius: 50%;
  z-index: 1;
  transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.vinyl-wrapper.is-playing .vinyl-disc {
  transform: translateX(30px) rotate(360deg);
}

.track-info { text-align: center; }
.track-title { font-size: 15px; margin-bottom: 4px; }
.track-artist { font-size: 12px; opacity: 0.6; }

.player-bar {
  position: relative;
  z-index: 10;
  height: 80px;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(25px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.controls { display: flex; align-items: center; gap: 16px; }

.icon-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font-size: 16px;
}

.play-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-container {
  flex: 0.6;
  display: flex;
  align-items: center;
  gap: 12px;
}

.time { font-size: 12px; opacity: 0.5; width: 40px; text-align: center; }

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  cursor: pointer;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #ffffff;
  transition: width 0.1s linear;
}

.extra-controls { display: flex; gap: 16px; }
</style>