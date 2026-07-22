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

    <!-- 氛围感高斯模糊背景与动态光晕 -->
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

      <!-- 移动端/窄屏时显示的切换按钮 -->
      <nav class="nav-tabs mobile-only">
        <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['nav-btn', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </nav>

      <!-- 桌面端视图模式切换（合并 / 聚焦模式） -->
      <div class="desktop-only mode-toggle">
        <button
            :class="['glass-btn', { active: isCombinedMode }]"
            @click="isCombinedMode = !isCombinedMode"
            title="切换视图布局"
        >
          <span class="btn-icon">{{ isCombinedMode ? '📖' : '🎨' }}</span>
          <span>{{ isCombinedMode ? '双栏展开' : '精简聚焦' }}</span>
        </button>
      </div>

      <div class="user-action">
        <button class="login-btn">
          <span class="avatar-placeholder">👤</span>
          <span class="btn-text">登录</span>
        </button>
      </div>
    </header>

    <!-- 中间主内容区 (响应式 Grid/Flex) -->
    <main :class="['main-content', { 'combined-layout': isCombinedMode }]">

      <!-- 搜索 & 歌曲列表区 -->
      <section
          v-show="isCombinedMode || activeTab === 'search'"
          class="glass-card list-panel"
      >
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
              <!-- 正在播放跳动音浪动画 -->
              <span v-if="currentIndex === index && isPlaying" class="playing-waves">
                <i></i><i></i><i></i>
              </span>
              <template v-else>{{ (index + 1).toString().padStart(2, '0') }}</template>
            </span>
            <div class="song-meta">
              <span class="song-name">{{ item.name }}</span>
              <span class="song-artist">{{ item.artist }}</span>
            </div>
            <button class="item-play-btn">
              {{ currentIndex === index && isPlaying ? '❚❚' : '▶' }}
            </button>
          </div>
        </div>
      </section>

      <!-- 歌词展示区 -->
      <section
          v-show="isCombinedMode || activeTab === 'playing'"
          class="lyrics-panel"
      >
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

      <!-- 右侧/顶部：黑胶唱片 & 歌曲信息 -->
      <aside class="right-panel">
        <div class="album-card" v-if="currentTrack">
          <!-- 唱机臂与黑胶唱片 -->
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
            class="icon-btn mobile-only"
            @click="activeTab = activeTab === 'search' ? 'playing' : 'search'"
            title="切换列表/歌词"
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

// DOM 引用
const audioRef = ref(null)
const lyricsContainerRef = ref(null)
const currentLyricEl = ref(null)

// 视图控制
const isCombinedMode = ref(true) // 大屏下默认合并展开
const activeTab = ref('playing')  // 移动端/窄屏下的 Tab
const tabs = [
  { id: 'playing', name: '播放/歌词' },
  { id: 'search', name: '搜索列表' }
]

const searchKeyword = ref('勾指起誓')

// 播放状态
const songList = ref([])
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

const currentTrack = computed(() => songList.value[currentIndex.value] || null)

// 歌词逻辑
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
  if (currentIndex.value === index) {
    togglePlay()
  } else {
    currentIndex.value = index
    playCurrent()
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

const playCurrent = () => {
  nextTick(() => {
    if (audioRef.value) {
      audioRef.value.play()
      isPlaying.value = true
    }
  })
}

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
  const seekTime = (clickX / rect.width) * duration.value
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
/* 根容器布局 */
.player-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
  background-color: #0b0c10;
  user-select: none;
}

/* 动感模糊背景 */
.bg-cover {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(60px) saturate(1.8) brightness(0.4);
  transform: scale(1.15);
  transition: background-image 0.8s ease-in-out;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(15, 15, 25, 0.2) 0%, rgba(5, 5, 10, 0.8) 100%);
  z-index: 2;
}

.ambient-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 70vw;
  height: 70vw;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 60%);
  z-index: 2;
  pointer-events: none;
}

/* 顶栏 */
.header {
  position: relative;
  z-index: 10;
  height: 65px;
  padding: 0 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo { display: flex; align-items: center; gap: 8px; }
.logo-icon { font-size: 20px; }
.title { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
.version { font-size: 10px; padding: 2px 6px; border-radius: 8px; background: rgba(255, 255, 255, 0.15); }

.glass-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.glass-btn:hover, .glass-btn.active {
  background: rgba(255, 255, 255, 0.22);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
}

.nav-tabs {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.25);
  padding: 3px;
  border-radius: 20px;
}

.nav-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  padding: 5px 14px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
}

.nav-btn.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
}

.login-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
}

/* 主主体内容布局 */
.main-content {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  padding: 10px 40px 20px;
  gap: 30px;
  overflow: hidden;
}

.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 列表区 */
.list-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  padding: 18px;
  transition: all 0.3s;
}

.search-bar { display: flex; gap: 8px; margin-bottom: 14px; }

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0 10px;
}

.search-icon { opacity: 0.5; font-size: 12px; margin-right: 6px; }

.search-input {
  width: 100%;
  background: transparent;
  border: none;
  padding: 8px 0;
  color: #fff;
  font-size: 13px;
  outline: none;
}

.glow-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #fff;
  padding: 0 14px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
}

.song-list { flex: 1; overflow-y: auto; padding-right: 4px; }
.song-list::-webkit-scrollbar { width: 3px; }
.song-list::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }

/* 正在播放项的高亮动画 */
.song-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: all 0.2s ease;
}

.song-item:hover { background: rgba(255, 255, 255, 0.08); }

.song-item.playing {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-left: 3px solid #ffffff;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.song-index { width: 30px; font-size: 12px; opacity: 0.6; }

.playing-waves {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: 10px;
}

.playing-waves i {
  width: 2px;
  height: 100%;
  background: #ffffff;
  animation: wave 0.8s infinite ease-in-out;
}

.playing-waves i:nth-child(2) { animation-delay: 0.2s; }
.playing-waves i:nth-child(3) { animation-delay: 0.4s; }

@keyframes wave {
  0%, 100% { height: 2px; }
  50% { height: 10px; }
}

.song-meta { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.song-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.song-artist { font-size: 11px; opacity: 0.5; }

.item-play-btn {
  background: transparent;
  border: none;
  color: #fff;
  opacity: 0;
  cursor: pointer;
  font-size: 10px;
}

.song-item:hover .item-play-btn, .song-item.playing .item-play-btn { opacity: 0.9; }

/* 歌词区 */
.lyrics-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.lyrics-container {
  width: 100%;
  max-width: 500px;
  height: 85%;
  overflow-y: auto;
  text-align: center;
  mask-image: linear-gradient(180deg, transparent 0%, #000 15%, #000 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 15%, #000 85%, transparent 100%);
}

.lyrics-container::-webkit-scrollbar { display: none; }

.lyric-line {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.35);
  margin: 18px 0;
  transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}

.lyric-line.active {
  font-size: 20px;
  color: #ffffff;
  font-weight: 600;
  transform: scale(1.05);
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
}

.no-lyric { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.4); }

/* 右侧唱片面板 */
.right-panel {
  width: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-card { display: flex; flex-direction: column; align-items: center; gap: 20px; }

.vinyl-wrapper {
  position: relative;
  width: 210px;
  height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tonearm {
  position: absolute;
  top: -25px;
  right: 5px;
  width: 60px;
  height: 80px;
  border-right: 3px solid rgba(255, 255, 255, 0.7);
  border-top: 3px solid rgba(255, 255, 255, 0.7);
  border-top-right-radius: 16px;
  z-index: 10;
  transform-origin: 100% 0;
  transform: rotate(-25deg);
  transition: transform 0.5s ease;
  pointer-events: none;
}

.vinyl-wrapper.is-playing .tonearm { transform: rotate(0deg); }

.vinyl-disc {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, #0c0c0c 25%, #181818 26%, #0c0c0c 27%, #121212 80%, #000 100%);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 20s linear infinite;
  animation-play-state: paused;
}

.vinyl-wrapper.is-playing .vinyl-disc { animation-play-state: running; }

.cover-img {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  border: 5px solid #080808;
}

@keyframes spin { 100% { transform: rotate(360deg); } }

.track-info { text-align: center; }
.track-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.track-artist { font-size: 13px; opacity: 0.6; }

/* 底部 Control Bar */
.player-bar {
  position: relative;
  z-index: 20;
  height: 75px;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 15, 20, 0.5);
  backdrop-filter: blur(25px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.controls { display: flex; align-items: center; gap: 16px; }

.icon-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: transform 0.2s;
}

.icon-btn:hover { color: #fff; transform: scale(1.1); }

.play-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #ffffff;
  color: #000000;
  justify-content: center;
}

.progress-container { flex: 0.6; display: flex; align-items: center; gap: 12px; }
.time { font-size: 11px; opacity: 0.5; width: 40px; text-align: center; }

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
}

.progress-fill { height: 100%; background: #fff; border-radius: 2px; position: relative; }

.progress-thumb {
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
}

/* 显隐控制助手类 */
.desktop-only { display: block; }
.mobile-only { display: none !important; }

/* -------------------------------------------------------------
 * 📱 响应式自适应 (Media Queries)
 * ------------------------------------------------------------- */

/* 屏幕宽度小于 1024px：稍微紧凑一些 */
@media (max-width: 1024px) {
  .right-panel { display: none; } /* 隐藏大唱片，把主体留给列表和歌词 */
  .main-content { padding: 10px 20px; }
}

/* 手机/窄屏适配 (宽度小于 768px) */
@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }

  .header { padding: 0 16px; height: 55px; }
  .btn-text { display: none; } /* 移动端隐藏登录文字只保留 Icon */

  .main-content {
    flex-direction: column;
    padding: 10px 14px;
    gap: 0;
  }

  .list-panel, .lyrics-panel {
    width: 100%;
    height: 100%;
  }

  .player-bar {
    padding: 0 16px;
    height: 65px;
  }

  .progress-container {
    flex: 1;
  }

  .controls { gap: 10px; }
  .play-btn { width: 36px; height: 36px; }
}
</style>