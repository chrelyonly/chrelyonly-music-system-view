<template>
  <div class="room-container">
    <!-- 全屏动态模糊背景 -->
    <div
        class="dynamic-bg"
        :style="{ backgroundImage: currentTrack?.coverUrl ? `url(${currentTrack.coverUrl})` : 'none' }"
    ></div>
    <div class="bg-overlay"></div>

    <!-- 顶部导航栏 -->
    <RoomHeader :user-count="userCount" />

    <div class="room-content">
      <!-- 上方/左侧：舞台区 (唱片/歌词/控制条) -->
      <section class="stage-section">
        <RoomPlayer
            :current-track="currentTrack"
            :current-time="currentTime"
            :duration="duration"
            :is-playing="isPlaying"
            :has-prev="currentIndex > 0"
            :has-next="currentIndex < orderQueue.length - 1"
            @play="togglePlay(true)"
            @pause="togglePlay(false)"
            @stop="stopPlayback"
            @prev="previousTrack"
            @next="nextTrack"
            @open-search="showSearch = true"
        />

        <!-- 原生音频标签 -->
        <audio
            ref="audioRef"
            :src="currentTrack?.fileUrl"
            @timeupdate="onTimeUpdate"
            @loadedmetadata="onLoadedMetadata"
            @ended="onTrackEnded"
            @error="onAudioError"
        ></audio>

        <!-- 首次自动播放阻断提示遮罩 -->
        <div v-if="needUserInteraction" class="playback-overlay" @click="resumeUserPlayback">
          <div class="overlay-content">
            <el-icon class="pulse-icon"><VideoPlay /></el-icon>
            <span>点击任意区域开启音频播放</span>
          </div>
        </div>
      </section>

      <!-- 下方/右侧：后台互动区 (排队与聊天) -->
      <aside class="backstage-section">
        <div class="tabs-header">
          <div
              v-for="tab in tabs"
              :key="tab.key"
              :class="['tab-item', { active: activeTab === tab.key }]"
              @click="activeTab = tab.key"
          >
            <span>{{ tab.label }}</span>
            <span v-if="tab.key === 'queue' && orderQueue.length" class="badge">
              {{ orderQueue.length }}
            </span>
          </div>
        </div>

        <div class="panel-body">
          <Transition name="fade-slide" mode="out-in">
            <OrderQueue
                v-if="activeTab === 'queue'"
                :queue="orderQueue"
                :current-index="currentIndex"
                @open-search="showSearch = true"
                @skip="nextTrack"
                @top="moveToTop"
                @remove="removeFromQueue"
            />
            <ChatPanel
                v-else-if="activeTab === 'chat'"
                :messages="chatMessages"
                @send="handleSendMessage"
            />
          </Transition>
        </div>
      </aside>
    </div>

    <!-- 点歌搜索弹窗 -->
    <el-dialog
        v-model="showSearch"
        title="🎵 点歌台"
        :width="isMobile ? '100%' : '520px'"
        :fullscreen="isMobile"
        append-to-body
        destroy-on-close
        class="search-dialog-custom"
    >
      <div class="search-input-wrap">
        <el-input
            v-model="searchKeyword"
            placeholder="搜索歌曲或歌手..."
            clearable
            size="large"
            @keyup.enter="handleSearch"
        >
          <template #append>
            <el-button icon="Search" :loading="searching" @click="handleSearch" />
          </template>
        </el-input>
      </div>

      <el-scrollbar :max-height="isMobile ? 'calc(100vh - 160px)' : '380px'">
        <div
            v-for="item in searchResults"
            :key="item.id"
            class="search-item"
            @click="addToQueue(item)"
        >
          <img :src="item.coverUrl" class="mini-cover" loading="lazy" alt="cover" />
          <div class="meta">
            <span class="name">{{ item.name }}</span>
            <span class="artist">{{ item.artist }}</span>
          </div>
          <el-button type="primary" link icon="Plus">点歌</el-button>
        </div>

        <el-empty
            v-if="!searchResults.length && !searching"
            description="搜搜看喜欢的歌曲吧~"
            :image-size="70"
        />
      </el-scrollbar>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { searchMusic } from '@/api/music/music.js'
import { ElMessage } from 'element-plus'
import { VideoPlay } from '@element-plus/icons-vue'

import RoomHeader from './components/RoomHeader.vue'
import RoomPlayer from './components/RoomPlayer.vue'
import OrderQueue from './components/OrderQueue.vue'
import ChatPanel from './components/ChatPanel.vue'
import { getStore } from '@/stores/store.js'

const tabs = [
  { key: 'queue', label: '排队点歌' },
  { key: 'chat', label: '实时互动' }
]

const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)

const handleResize = () => { windowWidth.value = window.innerWidth }

const audioRef = ref(null)
const activeTab = ref('queue')
const showSearch = ref(false)
const userCount = ref(Math.floor(Math.random() * 50) + 12)
const needUserInteraction = ref(false)

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const orderQueue = ref([])
const currentIndex = ref(0)

const chatMessages = ref([
  { type: 'system', content: '欢迎来到直播点歌房间，点击【排队点歌】加入音乐列表吧！' }
])
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref([])

const currentTrack = computed(() => orderQueue.value[currentIndex.value] || null)

const startPlayback = () => {
  if (!currentTrack.value) return
  isPlaying.value = true
  announceNewSong(currentTrack.value)

  nextTick(() => {
    if (audioRef.value) {
      audioRef.value.play().then(() => {
        needUserInteraction.value = false
      }).catch(err => {
        console.warn('自动播放受限:', err)
        needUserInteraction.value = true
      })
    }
  })
}

const resumeUserPlayback = () => {
  if (audioRef.value) {
    audioRef.value.play().then(() => {
      isPlaying.value = true
      needUserInteraction.value = false
    })
  }
}

const togglePlay = (status) => {
  if (!audioRef.value || !currentTrack.value) return
  if (status) {
    audioRef.value.play()
    isPlaying.value = true
  } else {
    audioRef.value.pause()
    isPlaying.value = false
  }
}

const stopPlayback = () => {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.currentTime = 0
  }
  isPlaying.value = false
  currentTime.value = 0
  ElMessage.info('已停止播放')
}

const previousTrack = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    startPlayback()
  } else {
    ElMessage.warning('已经是第一首了')
  }
}

const nextTrack = () => {
  if (currentIndex.value < orderQueue.value.length - 1) {
    const prevName = currentTrack.value?.name
    currentIndex.value++
    startPlayback()
    broadcastSystemMessage(`切歌：《${prevName}》 -> 《${currentTrack.value?.name}》`)
  } else {
    stopPlayback()
    broadcastSystemMessage('点歌单已播放完毕，快去点歌吧！')
  }
}

const onTimeUpdate = () => {
  if (audioRef.value) currentTime.value = audioRef.value.currentTime
}

const onLoadedMetadata = () => {
  if (audioRef.value) duration.value = audioRef.value.duration
}

const onAudioError = () => {
  ElMessage.error(`歌曲《${currentTrack.value?.name || ''}》加载失败，自动跳过`)
  setTimeout(() => nextTrack(), 1200)
}

const onTrackEnded = () => { nextTrack() }

const addToQueue = (song) => {
  if (orderQueue.value.some(item => item.id === song.id)) {
    return ElMessage.info('这首歌已经在排队列表里啦~')
  }

  const newOrder = { ...song, orderedBy: '我', orderTime: Date.now() }
  orderQueue.value.push(newOrder)
  ElMessage.success(`成功点歌：《${song.name}》`)
  showSearch.value = false

  if (!isPlaying.value && orderQueue.value.length === 1) {
    currentIndex.value = 0
    startPlayback()
  }

  broadcastSystemMessage(`[我] 点了一首《${song.name}》`)
}

const moveToTop = (index) => {
  if (index <= currentIndex.value) return
  const item = orderQueue.value.splice(index, 1)[0]
  orderQueue.value.splice(currentIndex.value + 1, 0, item)
  ElMessage.success(`已将《${item.name}》置顶到下一首`)
}

const removeFromQueue = (index) => {
  if (index === currentIndex.value) {
    orderQueue.value.splice(index, 1)
    if (currentIndex.value < orderQueue.value.length) {
      startPlayback()
    } else {
      stopPlayback()
    }
  } else {
    orderQueue.value.splice(index, 1)
    if (index < currentIndex.value) {
      currentIndex.value--
    }
  }
  ElMessage.info('已从排队列表中移除')
}

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) return
  searching.value = true
  try {
    const res = await searchMusic(searchKeyword.value)
    const data = res?.data?.data || res?.data || res
    searchResults.value = Array.isArray(data) ? data : (data?.records || [])
  } catch (e) {
    ElMessage.error('搜索请求异常')
  } finally {
    searching.value = false
  }
}

const handleSendMessage = (text) => {
  if (!text.trim()) return
  chatMessages.value.push({
    type: 'user',
    user: '我',
    content: text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
}

const broadcastSystemMessage = (content) => {
  chatMessages.value.push({
    type: 'system',
    content: content,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
}

const announceNewSong = (song) => {
  broadcastSystemMessage(`🎤 正在播放：${song.name} - ${song.artist}`)
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  const savedList = getStore({ name: 'music_song_list' }) || []
  if (Array.isArray(savedList) && savedList.length > 0) {
    orderQueue.value = savedList
    startPlayback()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value = null
  }
})
</script>

<style scoped>
.room-container {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #090a10;
  overflow: hidden;
  position: relative;
  color: #ffffff;
}

.dynamic-bg {
  position: absolute;
  inset: -15%;
  background-size: cover;
  background-position: center;
  filter: blur(90px) brightness(0.22);
  transition: background-image 1.2s ease-in-out;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(11, 12, 20, 0.4) 0%, #090a10 100%);
  z-index: 2;
}

.room-content {
  flex: 1;
  display: flex;
  position: relative;
  z-index: 10;
  min-height: 0;
}

/* 舞台区 */
.stage-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  min-height: 0;
}

.playback-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  cursor: pointer;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #ff4d7d;
  font-size: 15px;
}

.pulse-icon {
  font-size: 48px;
  animation: pulse 1.8s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
}

/* 后台互动区 */
.backstage-section {
  width: 380px;
  display: flex;
  flex-direction: column;
  background: rgba(18, 19, 28, 0.55);
  backdrop-filter: blur(20px);
}

.tabs-header {
  display: flex;
  height: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  position: relative;
}

.tab-item.active {
  color: #ff4d7d;
  font-weight: 600;
  background: rgba(255, 77, 125, 0.06);
}

.badge {
  padding: 2px 6px;
  font-size: 10px;
  border-radius: 10px;
  background: rgba(255, 77, 125, 0.2);
  color: #ff4d7d;
}

.panel-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 📱 移动端针对性重写：分给舞台区 55% 的屏幕高度，保障歌词与控制条完整显示 */
@media (max-width: 768px) {
  .room-content {
    flex-direction: column;
  }

  .stage-section {
    height: 58%; /* 增大舞台区，确保唱片/歌词和按键放得下 */
    flex: none;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .backstage-section {
    width: 100%;
    height: 42%;
    flex: none;
  }
}
</style>