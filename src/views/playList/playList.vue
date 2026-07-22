<template>
  <div class="player-container">
    <!-- 隐形 Audio 元素 -->
    <audio
        ref="audioRef"
        :src="currentTrack ? currentTrack.fileUrl : ''"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @ended="handleTrackEnded"
    ></audio>

    <!-- 氛围感高斯模糊背景 -->
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

      <!-- 顶部 Tab 切换 -->
      <nav class="nav-tabs">
        <button
            :class="['nav-btn', { active: activeLeftTab === 'playlist' }]"
            @click="activeLeftTab = 'playlist'"
        >
          🎶 播放列表 ({{ songList.length }}/1000)
        </button>
        <button
            :class="['nav-btn', { active: activeLeftTab === 'search' }]"
            @click="activeLeftTab = 'search'"
        >
          🔍 搜索发现
        </button>
      </nav>
    </header>

    <!-- 中间主内容区 -->
    <main class="main-content">

      <!-- 左侧面板：播放列表 OR 搜索发现 -->
      <section class="glass-card list-panel">

        <!-- Tab 1: 播放列表页 -->
        <div v-show="activeLeftTab === 'playlist'" class="tab-content">
          <div class="list-header">
            <h3 class="section-title">当前播放列表 ({{ songList.length }}/1000)</h3>
            <el-button
                v-if="songList.length > 0"
                type="danger"
                link
                size="small"
                @click="clearPlaylist"
            >
              清空列表
            </el-button>
          </div>

          <!-- 增加滚动区域卡片 wrapper -->
          <div class="scroll-list-wrapper" v-if="songList.length > 0">
            <div class="song-list">
              <div
                  v-for="(item, index) in songList"
                  :key="item.id || index"
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

                <!-- 播放列表项的操作：下载 / 移除 -->
                <div class="item-actions" @click.stop>
                  <button class="action-btn" title="下载" @click="downloadSong(item)">📥</button>
                  <button class="action-btn" title="移出列表" @click="removeFromPlaylist(index)">✕</button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="empty-holder">
            <span>🎵 播放列表为空，快去搜索添加歌曲吧~</span>
          </div>
        </div>

        <!-- Tab 2: 搜索与推荐页 -->
        <div v-show="activeLeftTab === 'search'" class="tab-content">
          <!-- 搜索框 -->
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
            <el-button
                type="primary"
                :loading="searching"
                :disabled="searching || !searchKeyword.trim()"
                @click="handleSearch"
                class="glow-btn"
            >
              搜索
            </el-button>
          </div>

          <div class="panel-scroll-content">
            <!-- 搜索结果区 -->
            <div v-if="searchResults.length > 0" class="search-results-section">
              <div class="list-header">
                <h3 class="section-title">🔍 搜索结果</h3>
                <el-button type="primary" link size="small" @click="addAllToPlaylist">
                  + 全部加入列表
                </el-button>
              </div>
              <div class="song-list">
                <div
                    v-for="item in searchResults"
                    :key="item.id"
                    class="song-item"
                    @click="addToPlaylistAndPlay(item)"
                >
                  <img :src="item.coverUrl" class="res-cover" alt="cover" />
                  <div class="song-meta">
                    <span class="song-name">{{ item.name }}</span>
                    <span class="song-artist">{{ item.artist }}</span>
                  </div>

                  <!-- 添加到播放列表操作 -->
                  <div class="item-actions" @click.stop>
                    <button
                        class="action-btn add-btn"
                        title="添加到播放列表"
                        @click="addToPlaylistOnly(item)"
                    >
                      ➕
                    </button>
                    <button
                        class="action-btn play-now-btn"
                        title="立即播放"
                        @click="addToPlaylistAndPlay(item)"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </div>
              <div class="divider"></div>
            </div>

            <!-- 常听推荐 -->
            <div class="recommend-block">
              <h3 class="section-title">✨ 猜你喜欢</h3>
              <div class="recommend-cards">
                <div
                    v-for="item in recentPlayed"
                    :key="item.id"
                    class="rec-card"
                    @click="addToPlaylistAndPlay(item)"
                >
                  <img :src="item.coverUrl" class="rec-cover" alt="cover" />
                  <div class="rec-info">
                    <span class="rec-name">{{ item.name }}</span>
                    <span class="rec-artist">{{ item.artist }}</span>
                  </div>
                  <button class="add-circle-btn" title="加到列表" @click.stop="addToPlaylistOnly(item)">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>

      <!-- 中间：歌词展示区 -->
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

      <!-- 右侧：唱片封面展示 -->
      <aside class="right-panel">
        <div class="album-card" v-if="currentTrack">
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
      <!-- 模式控制与播放按钮 -->
      <div class="controls">
        <button class="icon-btn mode-btn" @click="togglePlayMode" :title="playModeText">
          <span>{{ playModeIcon }}</span>
        </button>
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
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
// 修改为指定的工具类引入路径
import { setStore, getStore } from '@/stores/store.js'
import {
  searchMusic,
  getRecentRecommendList,
} from '@/api/music/music.js'
import { parseLrc } from '@/util/lyric.js'

const MAX_PLAYLIST_SIZE = 1000 // 播放列表最大数量上限

// -------------------------------------------------------------
// 1. 响应式变量
// -------------------------------------------------------------
const audioRef = ref(null)
const lyricsContainerRef = ref(null)
const currentLyricEl = ref(null)

const activeLeftTab = ref('playlist') // 'playlist' | 'search'
const searchKeyword = ref('')
const searching = ref(false)

const searchResults = ref([])        // 搜索结果
const songList = ref([])             // 核心播放列表（持久化）
const recentPlayed = ref([])         // 推荐歌曲列表

const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playMode = ref(0)              // 0: 列表循环, 1: 单曲循环, 2: 随机播放

// -------------------------------------------------------------
// 2. 计算属性
// -------------------------------------------------------------
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

const progressPercent = computed(() => (duration.value ? (currentTime.value / duration.value) * 100 : 0))

// -------------------------------------------------------------
// 3. 播放列表管理 & 1000首限制提示
// -------------------------------------------------------------

// 添加到播放列表（含数量限制拦截）
const addToPlaylistOnly = (song) => {
  const index = songList.value.findIndex(item => item.id === song.id)
  if (index !== -1) {
    ElMessage.info(`《${song.name}》已经在播放列表中`)
    return index
  }

  if (songList.value.length >= MAX_PLAYLIST_SIZE) {
    ElMessage.warning(`播放列表已达到上限 (${MAX_PLAYLIST_SIZE} 首)，请先清理再添加！`)
    return -1
  }

  songList.value.push(song)
  ElMessage.success(`已添加《${song.name}》到播放列表`)
  return songList.value.length - 1
}

// 添加并立即播放
const addToPlaylistAndPlay = (song) => {
  let targetIndex = songList.value.findIndex(item => item.id === song.id)
  if (targetIndex === -1) {
    if (songList.value.length >= MAX_PLAYLIST_SIZE) {
      ElMessage.warning(`播放列表已达到上限 (${MAX_PLAYLIST_SIZE} 首)，请先清理再添加！`)
      return
    }
    songList.value.push(song)
    targetIndex = songList.value.length - 1
    ElMessage.success(`已加入并播放《${song.name}》`)
  }
  selectTrack(targetIndex)
}

// 批量添加搜索结果
const addAllToPlaylist = () => {
  if (songList.value.length >= MAX_PLAYLIST_SIZE) {
    ElMessage.warning(`播放列表已达到上限 (${MAX_PLAYLIST_SIZE} 首)！`)
    return
  }

  let count = 0
  for (const song of searchResults.value) {
    if (songList.value.length >= MAX_PLAYLIST_SIZE) {
      ElMessage.warning(`播放列表已达到上限 (${MAX_PLAYLIST_SIZE} 首)，部分歌曲未能添加`)
      break
    }
    if (!songList.value.some(item => item.id === song.id)) {
      songList.value.push(song)
      count++
    }
  }

  if (count > 0) {
    ElMessage.success(`成功添加 ${count} 首新歌曲`)
  } else {
    ElMessage.info('没有新的歌曲需要添加')
  }
}

// 移除单曲
const removeFromPlaylist = (index) => {
  const isPlayingDeleted = (index === currentIndex.value)
  const deletedSongName = songList.value[index]?.name
  songList.value.splice(index, 1)

  if (songList.value.length === 0) {
    isPlaying.value = false
    currentIndex.value = 0
  } else if (isPlayingDeleted) {
    currentIndex.value = currentIndex.value % songList.value.length
    playCurrent()
  } else if (index < currentIndex.value) {
    currentIndex.value -= 1
  }
  ElMessage.info(`已移除《${deletedSongName}》`)
}

// 清空列表
const clearPlaylist = () => {
  songList.value = []
  isPlaying.value = false
  currentIndex.value = 0
  ElMessage.info('播放列表已清空')
}

// -------------------------------------------------------------
// 4. API 数据提取与搜索 (按 res.data.data 规范提取)
// -------------------------------------------------------------
const extractRecords = (res) => {
  // 适配对应数据解构：res.data.data 或直接兜底
  const data = res?.data?.data || res?.data || res
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.records)) return data.records
  return []
}

const handleSearch = async () => {
  if (!searchKeyword.value.trim() || searching.value) return
  searching.value = true
  try {
    const res = await searchMusic(searchKeyword.value)
    searchResults.value = extractRecords(res)
    if (searchResults.value.length === 0) {
      ElMessage.warning('未找到相关歌曲')
    }
  } catch (error) {
    ElMessage.error('搜索请求失败')
  } finally {
    searching.value = false
  }
}

const fetchRecentRecommend = async () => {
  try {
    const res = await getRecentRecommendList()
    recentPlayed.value = extractRecords(res)
  } catch (error) {
    console.error(error)
  }
}

// -------------------------------------------------------------
// 5. 播放控制与持久化
// -------------------------------------------------------------
const togglePlayMode = () => {
  playMode.value = (playMode.value + 1) % 3
  ElMessage.info(`已切换为：${playModeText.value}`)
}

const handleTrackEnded = () => {
  if (playMode.value === 1) {
    playCurrent()
  } else if (playMode.value === 2) {
    currentIndex.value = Math.floor(Math.random() * songList.value.length)
    playCurrent()
  } else {
    nextTrack()
  }
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
      }).catch(() => {
        isPlaying.value = false
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
  if (audioRef.value) duration.value = audioRef.value.duration
}

const seek = (e) => {
  if (!duration.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const seekTime = ((e.clientX - rect.left) / rect.width) * duration.value
  if (audioRef.value) {
    audioRef.value.currentTime = seekTime
    currentTime.value = seekTime
  }
}

const formatTime = (time) => {
  if (!time || isNaN(time)) return '00:00'
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
}

const downloadSong = (song) => {
  if (!song?.fileUrl) return ElMessage.error('暂无可用下载链接')
  const a = document.createElement('a')
  a.href = song.fileUrl
  a.download = `${song.name}.mp3`
  a.click()
}

// 持久化监听与恢复
watch(songList, (newList) => setStore({ name: 'music_song_list', content: newList }), { deep: true })
watch(currentIndex, (newIdx) => setStore({ name: 'music_current_index', content: newIdx }))
watch(playMode, (newMode) => setStore({ name: 'music_play_mode', content: newMode }))

const restorePersistedData = () => {
  const savedList = getStore({ name: 'music_song_list' })
  const savedIdx = getStore({ name: 'music_current_index' })
  const savedMode = getStore({ name: 'music_play_mode' })

  if (Array.isArray(savedList)) songList.value = savedList
  if (typeof savedIdx === 'number' && savedIdx < songList.value.length) currentIndex.value = savedIdx
  if (typeof savedMode === 'number') playMode.value = savedMode
}

watch(currentLyricIndex, () => {
  nextTick(() => {
    if (currentLyricEl.value && lyricsContainerRef.value) {
      const container = lyricsContainerRef.value
      const el = currentLyricEl.value
      container.scrollTo({ top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' })
    }
  })
})

onMounted(() => {
  restorePersistedData()
  fetchRecentRecommend()
})
</script>

<style scoped>
.player-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  background-color: #0b0c10;
  overflow: hidden;
  user-select: none;
}

.bg-cover {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(60px) saturate(1.8) brightness(0.35);
  transform: scale(1.15);
  transition: background-image 0.8s ease-in-out;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(15, 15, 25, 0.2) 0%, rgba(5, 5, 10, 0.8) 100%);
  z-index: 2;
}

.header {
  position: relative;
  z-index: 10;
  height: 60px;
  padding: 0 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-tabs { display: flex; gap: 10px; }

.nav-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}

.nav-btn.active, .nav-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
}

.main-content {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  padding: 10px 30px 20px;
  gap: 20px;
  overflow: hidden; /* 防止页面溢出 */
}

.glass-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.list-panel {
  width: 380px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.tab-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden; /* 保证子元素能通过 overflow 滚动 */
}

/* 核心滚动区域修正 */
.scroll-list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.scroll-list-wrapper::-webkit-scrollbar,
.panel-scroll-content::-webkit-scrollbar {
  width: 4px;
}

.scroll-list-wrapper::-webkit-scrollbar-thumb,
.panel-scroll-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.25);
  border-radius: 4px;
}

.search-bar { display: flex; gap: 8px; margin-bottom: 12px; }

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0 10px;
}

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
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
  border-radius: 10px !important;
}

.panel-scroll-content {
  flex: 1;
  overflow-y: auto;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title { font-size: 13px; font-weight: 600; opacity: 0.85; }

.song-list { display: flex; flex-direction: column; gap: 4px; }

.song-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.song-item:hover { background: rgba(255, 255, 255, 0.08); }

.song-item.playing {
  background: rgba(255, 255, 255, 0.15);
  border-left: 3px solid #fff;
}

.res-cover { width: 36px; height: 36px; border-radius: 6px; margin-right: 10px; object-fit: cover; }

.song-index { width: 28px; font-size: 12px; opacity: 0.6; }

.song-meta { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.song-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.song-artist { font-size: 11px; opacity: 0.5; }

.item-actions { display: flex; gap: 6px; opacity: 0.8; }

.action-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.action-btn:hover { background: rgba(255, 255, 255, 0.2); color: #fff; }

.add-circle-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
}

.empty-holder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  opacity: 0.5;
}

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
}

.lyrics-container::-webkit-scrollbar { display: none; }

.lyric-line {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.35);
  margin: 16px 0;
  transition: all 0.3s;
}

.lyric-line.active {
  font-size: 19px;
  color: #ffffff;
  font-weight: 600;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
}

.right-panel {
  width: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-card { display: flex; flex-direction: column; align-items: center; gap: 16px; }

.vinyl-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tonearm {
  position: absolute;
  top: -20px;
  right: 10px;
  width: 50px;
  height: 70px;
  border-right: 3px solid rgba(255, 255, 255, 0.7);
  border-top: 3px solid rgba(255, 255, 255, 0.7);
  border-top-right-radius: 14px;
  z-index: 10;
  transform-origin: 100% 0;
  transform: rotate(-25deg);
  transition: transform 0.5s ease;
}

.vinyl-wrapper.is-playing .tonearm { transform: rotate(0deg); }

.vinyl-disc {
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: radial-gradient(circle, #0c0c0c 25%, #181818 26%, #0c0c0c 27%, #121212 80%, #000 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 20s linear infinite;
  animation-play-state: paused;
}

.vinyl-wrapper.is-playing .vinyl-disc { animation-play-state: running; }

.cover-img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid #080808; }

@keyframes spin { 100% { transform: rotate(360deg); } }

.player-bar {
  position: relative;
  z-index: 20;
  height: 70px;
  padding: 0 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 15, 20, 0.6);
  backdrop-filter: blur(25px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.controls { display: flex; align-items: center; gap: 14px; }

.icon-btn { background: transparent; border: none; color: rgba(255, 255, 255, 0.7); cursor: pointer; display: flex; align-items: center; }
.play-btn { width: 40px; height: 40px; border-radius: 50%; background: #ffffff; color: #000; justify-content: center; }

.progress-container { flex: 0.6; display: flex; align-items: center; gap: 10px; }
.time { font-size: 11px; opacity: 0.5; width: 40px; text-align: center; }

.progress-bar { flex: 1; height: 4px; background: rgba(255, 255, 255, 0.15); border-radius: 2px; cursor: pointer; position: relative; }
.progress-fill { height: 100%; background: #fff; border-radius: 2px; position: relative; }
.progress-thumb { position: absolute; right: -4px; top: -3px; width: 10px; height: 10px; background: #fff; border-radius: 50%; }

.recommend-cards { display: flex; flex-direction: column; gap: 6px; }
.rec-card { display: flex; align-items: center; gap: 8px; padding: 6px; background: rgba(255, 255, 255, 0.04); border-radius: 6px; cursor: pointer; }
.rec-cover { width: 32px; height: 32px; border-radius: 4px; }
.rec-info { flex: 1; display: flex; flex-direction: column; }
.rec-name { font-size: 12px; }
.rec-artist { font-size: 10px; opacity: 0.5; }

.playing-waves { display: flex; gap: 2px; align-items: flex-end; height: 10px; }
.playing-waves i { width: 2px; height: 100%; background: #fff; animation: wave 0.8s infinite ease-in-out; }
.playing-waves i:nth-child(2) { animation-delay: 0.2s; }
.playing-waves i:nth-child(3) { animation-delay: 0.4s; }
@keyframes wave { 0%, 100% { height: 2px; } 50% { height: 10px; } }
</style>