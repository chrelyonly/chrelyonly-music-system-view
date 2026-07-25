<!-- MusicPlayer.vue -->
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
    <PlayerHeader
        :active-tab="activeLeftTab"
        @select-tab="toggleMobileDrawer"
    />

    <!-- 移动端遮罩层 -->
    <div
        v-if="isMobileDrawerOpen"
        class="mobile-drawer-mask"
        @click="isMobileDrawerOpen = false"
    ></div>

    <!-- 中间主内容区 -->
    <main class="main-content">
      <!-- 左侧面板/抽屉 -->
      <PlaylistPanel
          :is-open="isMobileDrawerOpen"
          :active-tab="activeLeftTab"
          :song-list="songList"
          :current-index="currentIndex"
          :is-playing="isPlaying"
          :recent-played="recentPlayed"
          @close="isMobileDrawerOpen = false"
          @select-track="selectTrack"
          @download="downloadSong"
          @remove="removeFromPlaylist"
          @clear-playlist="clearPlaylist"
          @add-only="addToPlaylistOnly"
          @play-now="addToPlaylistAndPlay"
          @add-all="addAllToPlaylist"
      />

      <!-- 舞台与歌词展示区 -->
      <AlbumStage
          :current-track="currentTrack"
          :is-playing="isPlaying"
          :current-time="currentTime"
      />
    </main>

    <!-- 底部播放控制条 -->
    <PlayerControls
        :current-time="currentTime"
        :duration="duration"
        :is-playing="isPlaying"
        :play-mode="playMode"
        :playback-rate="playbackRate"
        :volume="volume"
        :is-muted="isMuted"
        @seek="handleSeek"
        @toggle-play="togglePlay"
        @prev="prevTrack"
        @next="nextTrack"
        @toggle-mode="togglePlayMode"
        @change-rate="changePlaybackRate"
        @toggle-mute="toggleMute"
        @update-volume="handleVolumeUpdate"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { setStore, getStore } from '@/stores/store.js'
import { getRecentRecommendList, recordPlayCount } from '@/api/music/music.js'
import PlayerControls from "@/views/playList/components/PlayerControls.vue";
import AlbumStage from "@/views/playList/components/AlbumStage.vue";
import PlaylistPanel from "@/views/playList/components/PlaylistPanel.vue";
import PlayerHeader from "@/views/playList/components/PlayerHeader.vue";


const MAX_PLAYLIST_SIZE = 1000

// 全局音频与 UI 状态
const audioRef = ref(null)
const activeLeftTab = ref('playlist')
const isMobileDrawerOpen = ref(false)

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

const currentTrack = computed(() => songList.value[currentIndex.value] || null)

// 抽屉与 Tab
const toggleMobileDrawer = (tab) => {
  activeLeftTab.value = tab
  isMobileDrawerOpen.value = true
}

// 播放控制核心
const togglePlay = () => {
  if (!audioRef.value || !currentTrack.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
  } else {
    audioRef.value.play().then(() => isPlaying.value = true)
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

const selectTrack = (index) => {
  if (currentIndex.value === index && isPlaying.value) togglePlay()
  else {
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

const handleTrackEnded = () => {
  if (playMode.value === 1) playCurrent()
  else if (playMode.value === 2) {
    currentIndex.value = Math.floor(Math.random() * songList.value.length)
    playCurrent()
  } else nextTrack()
}

const handleSeek = (time) => {
  if (audioRef.value) {
    audioRef.value.currentTime = time
    currentTime.value = time
  }
}

const handleVolumeUpdate = (val) => {
  volume.value = val
  if (isMuted.value && val > 0) isMuted.value = false
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
  const modes = ['列表循环', '单曲循环', '随机播放']
  ElMessage.info(`已切换为：${modes[playMode.value]}`)
}

// 列表增删
const addToPlaylistOnly = (song) => {
  const index = songList.value.findIndex(item => item.id === song.id)
  if (index !== -1) return ElMessage.info(`《${song.name}》已经在播放列表中`)
  if (songList.value.length >= MAX_PLAYLIST_SIZE) return ElMessage.warning(`播放列表已达上限！`)
  songList.value.push(song)
  ElMessage.success(`已添加《${song.name}》到播放列表`)
}

const addToPlaylistAndPlay = (song) => {
  let targetIndex = songList.value.findIndex(item => item.id === song.id)
  if (targetIndex === -1) {
    if (songList.value.length >= MAX_PLAYLIST_SIZE) return ElMessage.warning(`播放列表已达上限！`)
    songList.value.push(song)
    targetIndex = songList.value.length - 1
    ElMessage.success(`已加入并播放《${song.name}》`)
  }
  selectTrack(targetIndex)
}

const addAllToPlaylist = (results) => {
  let count = 0
  for (const song of results) {
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
  const name = songList.value[index]?.name
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
  ElMessage.info(`已移除《${name}》`)
}

const clearPlaylist = () => {
  songList.value = []
  isPlaying.value = false
  currentIndex.value = 0
  ElMessage.info('播放列表已清空')
}

const downloadSong = (song) => {
  if (!song?.fileUrl) return ElMessage.error('暂无可用下载链接')
  const a = document.createElement('a')
  a.href = song.fileUrl
  a.download = `${song.name}.mp3`
  a.click()
}

// Audio 事件回调
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

const fetchRecentRecommend = async () => {
  try {
    const res = await getRecentRecommendList()
    const data = res?.data?.data || res?.data || res
    recentPlayed.value = Array.isArray(data) ? data : (data?.records || [])
  } catch (error) {
    console.error(error)
  }
}

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
      })
    }
  }).catch(() => ElMessage.info('已暂停自动播放'))
}

// 持久化与监听
watch(volume, (newVal) => {
  if (audioRef.value) audioRef.value.volume = isMuted.value ? 0 : newVal
  setStore({ name: 'music_volume', content: newVal })
})
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