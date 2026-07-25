<template>
  <div class="player-container">
    <!-- 隐形 Audio 元素 -->
    <audio
        ref="audioRef"
        :src="currentTrack ? currentTrack.fileUrl : ''"
        autoplay
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

      <!-- 顶部 Tab 切换 (PC端及移动端展开控制) -->
      <nav class="nav-tabs">
        <button
            :class="['nav-btn', { active: activeLeftTab === 'playlist' }]"
            @click="toggleMobileDrawer('playlist')"
        >
          🎶 列表
        </button>
        <button
            :class="['nav-btn', { active: activeLeftTab === 'search' }]"
            @click="toggleMobileDrawer('search')"
        >
          🔍 搜索
        </button>
      </nav>
    </header>

    <!-- 移动端遮罩层（展开列表/搜索时显示） -->
    <div
        v-if="isMobileDrawerOpen"
        class="mobile-drawer-mask"
        @click="isMobileDrawerOpen = false"
    ></div>

    <!-- 中间主内容区 -->
    <main class="main-content">

      <!-- 左侧面板：播放列表 OR 搜索发现（手机端抽屉式弹层） -->
      <section :class="['glass-card', 'list-panel', { 'mobile-open': isMobileDrawerOpen }]">
        <div class="mobile-drawer-handle" @click="isMobileDrawerOpen = false">✕ 关闭</div>

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

          <!-- 滚动区域卡片 wrapper -->
          <div class="scroll-list-wrapper" v-if="songList.length > 0">
            <div class="song-list">
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
                    @click="addToPlaylistAndPlayMobile(item)"
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
                        @click="addToPlaylistAndPlayMobile(item)"
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
                    @click="addToPlaylistAndPlayMobile(item)"
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

      <!-- 手机端/PC端：唱片与歌词展示区 -->
      <div class="player-center-stage">
        <!-- 唱片展示 -->
        <aside class="album-panel">
          <div class="album-card glass-card" v-if="currentTrack">
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

    <!-- 底部播放控制条（毛玻璃卡片化） -->
    <footer class="player-bar glass-card-bar">
      <!-- 进度条（移动端优化排版） -->
      <div class="progress-container">
        <span class="time">{{ formatTime(isDraggingProgress ? tempCurrentTime : currentTime) }}</span>
        <div
            ref="progressBarRef"
            class="progress-bar"
            @mousedown="onProgressMouseDown"
            @touchstart="onProgressTouchStart"
        >
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }">
              <div class="progress-thumb"></div>
            </div>
          </div>
        </div>
        <span class="time">{{ formatTime(duration) }}</span>
      </div>

      <!-- 核心控制区 -->
      <div class="controls-row">
        <!-- 模式控制 -->
        <button class="icon-btn mode-btn" @click="togglePlayMode" :title="playModeText">
          <span>{{ playModeIcon }}</span>
        </button>

        <div class="controls">
          <button class="icon-btn" @click="prevTrack" title="上一首">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button class="icon-btn play-btn" @click="togglePlay" title="播放/暂停">
            <svg v-if="!isPlaying" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </button>
          <button class="icon-btn" @click="nextTrack" title="下一首">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>

        <!-- 极简倍速/音量 -->
        <div class="extra-controls">
          <button class="rate-btn" @click="changePlaybackRate" title="切换播放速度">
            {{ playbackRate }}x
          </button>

          <div class="volume-container desktop-only">
            <button class="icon-btn" @click="toggleMute">
              <span v-if="isMuted || volume === 0">🔇</span>
              <span v-else>🔊</span>
            </button>
            <div
                ref="volumeBarRef"
                class="volume-bar"
                @mousedown="onVolumeMouseDown"
                @touchstart="onVolumeTouchStart"
            >
              <div class="progress-track">
                <div class="volume-fill" :style="{ width: (isMuted ? 0 : volume * 100) + '%' }">
                  <div class="volume-thumb"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { setStore, getStore } from '@/stores/store.js'
import {
  searchMusic,
  getRecentRecommendList,
  recordPlayCount,
} from '@/api/music/music.js'
import { parseLrc } from '@/util/lyric.js'

const MAX_PLAYLIST_SIZE = 1000

// -------------------------------------------------------------
// 1. 响应式变量
// -------------------------------------------------------------
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

const progressBarRef = ref(null)
const isDraggingProgress = ref(false)
const tempCurrentTime = ref(0)

const volumeBarRef = ref(null)
const isDraggingVolume = ref(false)

// -------------------------------------------------------------
// 2. 移动端抽屉逻辑
// -------------------------------------------------------------
const toggleMobileDrawer = (tab) => {
  activeLeftTab.value = tab
  isMobileDrawerOpen.value = true
}

const selectTrackMobile = (index) => {
  selectTrack(index)
}

const addToPlaylistAndPlayMobile = (song) => {
  addToPlaylistAndPlay(song)
}

// -------------------------------------------------------------
// 3. 计算属性
// -------------------------------------------------------------
const currentTrack = computed(() => songList.value[currentIndex.value] || null)
const playModeIcon = computed(() => ['🔁', '🔂', '🔀'][playMode.value])
const playModeText = computed(() => ['列表循环', '单曲循环', '随机播放'][playMode.value])

const parsedLyrics = computed(() => {
  if (!currentTrack.value?.nameLyric) return []
  return parseLrc(currentTrack.value.nameLyric)
})

const effectiveTime = computed(() => isDraggingProgress.value ? tempCurrentTime.value : currentTime.value)

const currentLyricIndex = computed(() => {
  if (!parsedLyrics.value.length) return -1
  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (effectiveTime.value >= parsedLyrics.value[i].time) return i
  }
  return 0
})

const progressPercent = computed(() => {
  if (!duration.value) return 0
  const displayTime = isDraggingProgress.value ? tempCurrentTime.value : currentTime.value
  return (displayTime / duration.value) * 100
})

// -------------------------------------------------------------
// 4. 播放列表与 API
// -------------------------------------------------------------
const addToPlaylistOnly = (song) => {
  const index = songList.value.findIndex(item => item.id === song.id)
  if (index !== -1) {
    ElMessage.info(`《${song.name}》已经在播放列表中`)
    return index
  }
  if (songList.value.length >= MAX_PLAYLIST_SIZE) {
    ElMessage.warning(`播放列表已达到上限 (${MAX_PLAYLIST_SIZE} 首)！`)
    return -1
  }
  songList.value.push(song)
  ElMessage.success(`已添加《${song.name}》到播放列表`)
  return songList.value.length - 1
}

const addToPlaylistAndPlay = (song) => {
  let targetIndex = songList.value.findIndex(item => item.id === song.id)
  if (targetIndex === -1) {
    if (songList.value.length >= MAX_PLAYLIST_SIZE) {
      ElMessage.warning(`播放列表已达到上限 (${MAX_PLAYLIST_SIZE} 首)！`)
      return
    }
    songList.value.push(song)
    targetIndex = songList.value.length - 1
    ElMessage.success(`已加入并播放《${song.name}》`)
  }
  selectTrack(targetIndex)
}

const addAllToPlaylist = () => {
  if (songList.value.length >= MAX_PLAYLIST_SIZE) {
    ElMessage.warning(`播放列表已达到上限 (${MAX_PLAYLIST_SIZE} 首)！`)
    return
  }
  let count = 0
  for (const song of searchResults.value) {
    if (songList.value.length >= MAX_PLAYLIST_SIZE) break
    if (!songList.value.some(item => item.id === song.id)) {
      songList.value.push(song)
      count++
    }
  }
  if (count > 0) ElMessage.success(`成功添加 ${count} 首新歌曲`)
}

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

const clearPlaylist = () => {
  songList.value = []
  isPlaying.value = false
  currentIndex.value = 0
  ElMessage.info('播放列表已清空')
}

const extractRecords = (res) => {
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
    if (searchResults.value.length === 0) ElMessage.warning('未找到相关歌曲')
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
// 5. 拖拽与播放控制 (包含 Touch 优化)
// -------------------------------------------------------------
const calculateRatio = (clientX, element) => {
  if (!element) return 0
  const rect = element.getBoundingClientRect()
  const offset = clientX - rect.left
  return Math.max(0, Math.min(1, offset / rect.width))
}

const updateProgressPosition = (clientX) => {
  if (!duration.value) return
  const ratio = calculateRatio(clientX, progressBarRef.value)
  tempCurrentTime.value = ratio * duration.value
}

const onProgressMouseDown = (e) => {
  if (!duration.value) return
  isDraggingProgress.value = true
  updateProgressPosition(e.clientX)
  window.addEventListener('mousemove', onProgressMouseMove)
  window.addEventListener('mouseup', onProgressMouseUp)
}

const onProgressMouseMove = (e) => {
  if (isDraggingProgress.value) updateProgressPosition(e.clientX)
}

const onProgressMouseUp = (e) => {
  if (isDraggingProgress.value) {
    updateProgressPosition(e.clientX)
    if (audioRef.value) {
      audioRef.value.currentTime = tempCurrentTime.value
      currentTime.value = tempCurrentTime.value
    }
    isDraggingProgress.value = false
    window.removeEventListener('mousemove', onProgressMouseMove)
    window.removeEventListener('mouseup', onProgressMouseUp)
  }
}

const onProgressTouchStart = (e) => {
  if (!duration.value) return
  isDraggingProgress.value = true
  updateProgressPosition(e.touches[0].clientX)
  window.addEventListener('touchmove', onProgressTouchMove, { passive: false })
  window.addEventListener('touchend', onProgressTouchEnd)
}

const onProgressTouchMove = (e) => {
  if (isDraggingProgress.value) {
    if (e.cancelable) e.preventDefault()
    updateProgressPosition(e.touches[0].clientX)
  }
}

const onProgressTouchEnd = () => {
  if (isDraggingProgress.value) {
    if (audioRef.value) {
      audioRef.value.currentTime = tempCurrentTime.value
      currentTime.value = tempCurrentTime.value
    }
    isDraggingProgress.value = false
    window.removeEventListener('touchmove', onProgressTouchMove)
    window.removeEventListener('touchend', onProgressTouchEnd)
  }
}

const updateVolumePosition = (clientX) => {
  const ratio = calculateRatio(clientX, volumeBarRef.value)
  volume.value = ratio
  if (isMuted.value && ratio > 0) isMuted.value = false
}

const onVolumeMouseDown = (e) => {
  isDraggingVolume.value = true
  updateVolumePosition(e.clientX)
  window.addEventListener('mousemove', onVolumeMouseMove)
  window.addEventListener('mouseup', onVolumeMouseUp)
}

const onVolumeMouseMove = (e) => {
  if (isDraggingVolume.value) updateVolumePosition(e.clientX)
}

const onVolumeMouseUp = () => {
  if (isDraggingVolume.value) {
    isDraggingVolume.value = false
    window.removeEventListener('mousemove', onVolumeMouseMove)
    window.removeEventListener('mouseup', onVolumeMouseUp)
  }
}

const onVolumeTouchStart = (e) => {
  isDraggingVolume.value = true
  updateVolumePosition(e.touches[0].clientX)
  window.addEventListener('touchmove', onVolumeTouchMove, { passive: false })
  window.addEventListener('touchend', onVolumeTouchEnd)
}

const onVolumeTouchMove = (e) => {
  if (isDraggingVolume.value) {
    if (e.cancelable) e.preventDefault()
    updateVolumePosition(e.touches[0].clientX)
  }
}

const onVolumeTouchEnd = () => {
  if (isDraggingVolume.value) {
    isDraggingVolume.value = false
    window.removeEventListener('touchmove', onVolumeTouchMove)
    window.removeEventListener('touchend', onVolumeTouchEnd)
  }
}

watch(volume, (newVal) => {
  if (audioRef.value) audioRef.value.volume = isMuted.value ? 0 : newVal
  setStore({ name: 'music_volume', content: newVal })
})

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
  ElMessage.info(`已切换为：${playModeText.value}`)
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

const triggerRecordPlay = (musicId) => recordPlayCount(musicId)

const playCurrent = () => {
  nextTick(() => {
    if (audioRef.value && currentTrack.value) {
      audioRef.value.play().then(() => {
        isPlaying.value = true
        triggerRecordPlay(currentTrack.value.id)
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
  if (audioRef.value && !isDraggingProgress.value) {
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
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
}

const downloadSong = (song) => {
  if (!song?.fileUrl) return ElMessage.error('暂无可用下载链接')
  const a = document.createElement('a')
  a.href = song.fileUrl
  a.download = `${song.name}.mp3`
  a.click()
}

watch(songList, (newList) => setStore({ name: 'music_song_list', content: newList }), { deep: true })
watch(currentIndex, (newIdx) => setStore({ name: 'music_current_index', content: newIdx }))
watch(playMode, (newMode) => setStore({ name: 'music_play_mode', content: newMode }))

const restorePersistedData = () => {
  const savedList = getStore({ name: 'music_song_list' })
  const savedIdx = getStore({ name: 'music_current_index' })
  const savedMode = getStore({ name: 'music_play_mode' })
  const savedVol = getStore({ name: 'music_volume' })

  if (Array.isArray(savedList)) songList.value = savedList
  if (typeof savedIdx === 'number' && savedIdx < songList.value.length) currentIndex.value = savedIdx
  if (typeof savedMode === 'number') playMode.value = savedMode
  if (typeof savedVol === 'number') volume.value = savedVol
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

const showAutoplayModal = () => {
  ElMessageBox.confirm(
      `检测到浏览器阻止了声音自动播放，点击“立即播放”继续听歌：《${currentTrack.value?.name || '未知歌曲'}》`,
      '自动播放提示',
      {
        confirmButtonText: '立即播放',
        cancelButtonText: '暂不播放',
        type: 'info',
        center: true,
        closeOnClickModal: false,
        showClose: false
      }
  ).then(() => {
    if (audioRef.value) {
      audioRef.value.play().then(() => {
        isPlaying.value = true
        ElMessage.success('开始播放')
      }).catch(e => console.error(e))
    }
  }).catch(() => ElMessage.info('已暂停自动播放'))
}

onMounted(() => {
  restorePersistedData()
  fetchRecentRecommend()
  nextTick(() => {
    if (currentTrack.value) playCurrent()
  })
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onProgressMouseMove)
  window.removeEventListener('mouseup', onProgressMouseUp)
  window.removeEventListener('touchmove', onProgressTouchMove)
  window.removeEventListener('touchend', onProgressTouchEnd)
  window.removeEventListener('mousemove', onVolumeMouseMove)
  window.removeEventListener('mouseup', onVolumeMouseUp)
  window.removeEventListener('touchmove', onVolumeTouchMove)
  window.removeEventListener('touchend', onVolumeTouchEnd)
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
  background: radial-gradient(circle, rgba(15, 15, 25, 0.2) 0%, rgba(5, 5, 10, 0.85) 100%);
  z-index: 2;
}

.header {
  position: relative;
  z-index: 10;
  height: 60px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.nav-tabs { display: flex; gap: 8px; }

.nav-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  padding: 5px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
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
  padding: 10px 20px 10px;
  gap: 20px;
  overflow: hidden;
}

/* 毛玻璃卡片基类 */
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(25px) saturate(160%);
  -webkit-backdrop-filter: blur(25px) saturate(160%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.list-panel {
  width: 360px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  transition: transform 0.3s ease-in-out;
}

.mobile-drawer-handle {
  display: none;
}

.tab-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

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
  border: 1px solid rgba(255, 255, 255, 0.15);
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

.song-item:hover { background: rgba(255, 255, 255, 0.1); }

.song-item.playing {
  background: rgba(255, 255, 255, 0.18);
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

/* 舞台中央布局区域 */
.player-center-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 20px;
  overflow: hidden;
}

.lyrics-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  overflow: hidden;
}

.lyrics-container {
  width: 100%;
  max-width: 450px;
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
  font-size: 18px;
  color: #ffffff;
  font-weight: 600;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
}

.album-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

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
  box-shadow: 0 10px 20px rgba(0,0,0,0.5);
}

.vinyl-wrapper.is-playing .vinyl-disc { animation-play-state: running; }

.cover-img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid #080808; }

.track-info {
  text-align: center;
}

.track-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.track-artist { font-size: 12px; opacity: 0.6; }

@keyframes spin { 100% { transform: rotate(360deg); } }

/* 底部播放栏：毛玻璃卡片 */
.glass-card-bar {
  background: rgba(20, 20, 30, 0.65);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
}

.player-bar {
  position: relative;
  z-index: 20;
  padding: 12px 25px calc(12px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.time { font-size: 11px; opacity: 0.6; width: 36px; text-align: center; font-weight: 500; }

.progress-bar {
  flex: 1;
  height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  touch-action: none;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 3px;
  position: relative;
  overflow: visible;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffffff 0%, #e0e0e0 100%);
  border-radius: 3px;
  position: relative;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}

.progress-thumb {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.6), 0 0 4px rgba(255, 255, 255, 0.8);
  transition: transform 0.1s ease;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.controls { display: flex; align-items: center; gap: 16px; }

.icon-btn { background: transparent; border: none; color: rgba(255, 255, 255, 0.8); cursor: pointer; display: flex; align-items: center; }
.play-btn { width: 42px; height: 42px; border-radius: 50%; background: #ffffff; color: #000; justify-content: center; box-shadow: 0 0 12px rgba(255,255,255,0.3); }

.extra-controls { display: flex; align-items: center; gap: 12px; }

.rate-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  cursor: pointer;
}

.volume-container { display: flex; align-items: center; gap: 8px; }

.volume-bar {
  width: 70px;
  height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  touch-action: none;
}

.volume-fill {
  height: 100%;
  background: #ffffff;
  border-radius: 3px;
  position: relative;
  pointer-events: none;
}

.volume-thumb {
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
}

.recommend-cards { display: flex; flex-direction: column; gap: 6px; }
.rec-card { display: flex; align-items: center; gap: 8px; padding: 6px; background: rgba(255, 255, 255, 0.05); border-radius: 6px; cursor: pointer; }
.rec-cover { width: 32px; height: 32px; border-radius: 4px; }
.rec-info { flex: 1; display: flex; flex-direction: column; }
.rec-name { font-size: 12px; }
.rec-artist { font-size: 10px; opacity: 0.5; }

.playing-waves { display: flex; gap: 2px; align-items: flex-end; height: 10px; }
.playing-waves i { width: 2px; height: 100%; background: #fff; animation: wave 0.8s infinite ease-in-out; }
.playing-waves i:nth-child(2) { animation-delay: 0.2s; }
.playing-waves i:nth-child(3) { animation-delay: 0.4s; }
@keyframes wave { 0%, 100% { height: 2px; } 50% { height: 10px; } }

/* =========================================================
   📱 移动端响应式适配 (Media Queries)
   ========================================================= */
@media (max-width: 768px) {
  .header {
    height: 50px;
    padding: 0 16px;
  }

  .main-content {
    padding: 10px;
    flex-direction: column;
  }

  /* 抽屉遮罩 */
  .mobile-drawer-mask {
    position: fixed;
    inset: 0;
    z-index: 90;
  }

  /* 左侧面板在手机端变为底部/侧边滑出的抽屉卡片 */
  .list-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 82vw;
    max-width: 320px;
    height: 100vh;
    z-index: 100;
    border-radius: 0 20px 20px 0;
    transform: translateX(-100%);
    box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
  }

  .list-panel.mobile-open {
    transform: translateX(0);
  }

  .mobile-drawer-handle {
    display: block;
    text-align: right;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    padding-bottom: 10px;
    cursor: pointer;
  }

  /* 手机端舞台中央垂直串联 */
  .player-center-stage {
    flex-direction: column;
    justify-content: center;
    gap: 15px;
  }

  .vinyl-wrapper {
    width: 160px;
    height: 160px;
  }

  .vinyl-disc {
    width: 150px;
    height: 150px;
  }

  .cover-img {
    width: 80px;
    height: 80px;
  }

  .tonearm {
    width: 40px;
    height: 55px;
    top: -15px;
  }

  .lyrics-container {
    height: 180px;
  }

  .lyric-line {
    font-size: 13px;
    margin: 12px 0;
  }

  .lyric-line.active {
    font-size: 16px;
  }

  /* 手机端隐藏电脑端音量条 */
  .desktop-only {
    display: none;
  }

  .player-bar {
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  }
}
</style>