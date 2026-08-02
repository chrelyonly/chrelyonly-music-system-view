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

    <!-- 全局音频标签 (切视图时不销毁，保证音乐不间断) -->
    <audio
        ref="audioRef"
        :src="currentTrack?.fileUrl"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @ended="onTrackEnded"
        @error="onAudioError"
    ></audio>

    <!-- 主体内容展示区 -->
    <main class="room-content" :class="{ 'is-mobile': isMobile }">
      <!-- ================= 💻 PC 端布局：双栏联动 ================= -->
      <template v-if="!isMobile">
        <!-- 左侧：舞台播放器 (恒定展示) -->
        <section class="pc-stage-section">
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

          <!-- 首次播放阻断遮罩 -->
          <div v-if="needUserInteraction" class="playback-overlay" @click="resumeUserPlayback">
            <div class="overlay-content">
              <el-icon class="pulse-icon"><VideoPlay /></el-icon>
              <span>点击任意区域开启音频播放</span>
            </div>
          </div>
        </section>

        <!-- 右侧：交互侧边栏 (在排队/聊天之间切换) -->
        <aside class="pc-backstage-section">
          <!-- PC 右侧顶部 Tab 开关 -->
          <div class="pc-tabs-header">
            <div
                v-for="tab in pcTabs"
                :key="tab.key"
                :class="['pc-tab-item', { active: activeTab === tab.key }]"
                @click="activeTab = tab.key"
            >
              <span>{{ tab.label }}</span>
              <span v-if="tab.key === 'queue' && orderQueue.length" class="badge">
                {{ orderQueue.length }}
              </span>
              <div v-if="activeTab === tab.key" class="pc-active-line"></div>
            </div>
          </div>

          <!-- PC 右侧 Panel 内容区 -->
          <div class="pc-panel-body">
            <Transition name="fade-slide" mode="out-in">
              <OrderQueue
                  v-if="activeTab === 'queue'"
                  key="queue"
                  :queue="orderQueue"
                  :current-index="currentIndex"
                  @open-search="showSearch = true"
                  @skip="nextTrack"
                  @top="moveToTop"
                  @remove="removeFromQueue"
              />
              <ChatPanel
                  v-else
                  key="chat"
                  :messages="chatMessages"
                  @send="handleSendMessage"
              />
            </Transition>
          </div>
        </aside>
      </template>

      <!-- ================= 📱 移动端布局：底部 Tab 切换 ================= -->
      <template v-else>
        <Transition name="fade-slide" mode="out-in">
          <!-- 1. 播放页 -->
          <section v-if="activeTab === 'player'" key="player" class="mobile-tab-panel">
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

            <div v-if="needUserInteraction" class="playback-overlay" @click="resumeUserPlayback">
              <div class="overlay-content">
                <el-icon class="pulse-icon"><VideoPlay /></el-icon>
                <span>点击任意区域开启音频播放</span>
              </div>
            </div>
          </section>

          <!-- 2. 排队点歌 -->
          <section v-else-if="activeTab === 'queue'" key="queue" class="mobile-tab-panel">
            <OrderQueue
                :queue="orderQueue"
                :current-index="currentIndex"
                @open-search="showSearch = true"
                @skip="nextTrack"
                @top="moveToTop"
                @remove="removeFromQueue"
            />
          </section>

          <!-- 3. 实时互动 -->
          <section v-else-if="activeTab === 'chat'" key="chat" class="mobile-tab-panel">
            <ChatPanel
                :messages="chatMessages"
                @send="handleSendMessage"
            />
          </section>
        </Transition>
      </template>
    </main>

    <!-- 📱 移动端专享：底部 Tab 导航栏 -->
    <nav v-if="isMobile" class="mobile-bottom-bar">
      <div
          v-for="tab in mobileTabs"
          :key="tab.key"
          :class="['mobile-tab-item', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
      >
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.key === 'queue' && orderQueue.length" class="badge">
          {{ orderQueue.length }}
        </span>
        <div v-if="activeTab === tab.key" class="active-indicator"></div>
      </div>
    </nav>

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
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { searchMusic } from '@/api/music/music.js'
import { ElMessage } from 'element-plus'
import { VideoPlay } from '@element-plus/icons-vue'

import RoomHeader from './components/RoomHeader.vue'
import RoomPlayer from './components/RoomPlayer.vue'
import OrderQueue from './components/OrderQueue.vue'
import ChatPanel from './components/ChatPanel.vue'
import { getStore } from '@/stores/store.js'

// 移动端 3 个 Tab，PC 端只需在右侧切 2 个 Tab
const mobileTabs = [
  { key: 'player', label: '播放页' },
  { key: 'queue', label: '排队点歌' },
  { key: 'chat', label: '实时互动' }
]

const pcTabs = [
  { key: 'queue', label: '排队点歌' },
  { key: 'chat', label: '实时互动' }
]

const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)

const handleResize = () => { windowWidth.value = window.innerWidth }

const audioRef = ref(null)
const activeTab = ref('queue') // 初始设为 queue，自动适应 PC/移动端
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

// 响应设备切换：PC端下如果 activeTab 为 'player'，自动退回 'queue'
watch(isMobile, (mobile) => {
  if (!mobile && activeTab.value === 'player') {
    activeTab.value = 'queue'
  }
}, { immediate: true })

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
  overflow: hidden;
}

/* ================= 💻 PC 端独立样式 ================= */
.pc-stage-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 0;
}

.pc-backstage-section {
  width: 380px;
  display: flex;
  flex-direction: column;
  background: rgba(18, 19, 28, 0.55);
  backdrop-filter: blur(20px);
}

.pc-tabs-header {
  display: flex;
  height: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.25);
  position: relative;
  user-select: none;
}

.pc-tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.pc-tab-item:hover {
  color: rgba(255, 255, 255, 0.85);
}

.pc-tab-item.active {
  color: #ff4d7d;
  font-weight: 600;
  background: rgba(255, 77, 125, 0.05);
}

.pc-active-line {
  position: absolute;
  bottom: 0;
  left: 20%;
  width: 60%;
  height: 2px;
  background: #ff4d7d;
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(255, 77, 125, 0.8);
}

.pc-panel-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* ================= 📱 移动端独立样式 ================= */
.mobile-tab-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.mobile-bottom-bar {
  height: 56px;
  height: calc(56px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: rgba(18, 19, 28, 0.88);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 20;
  user-select: none;
}

.mobile-tab-item {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.mobile-tab-item.active {
  color: #ff4d7d;
  font-weight: 600;
  background: rgba(255, 77, 125, 0.06);
}

.active-indicator {
  position: absolute;
  top: 0;
  left: 25%;
  width: 50%;
  height: 3px;
  background: #ff4d7d;
  border-radius: 0 0 3px 3px;
  box-shadow: 0 2px 8px rgba(255, 77, 125, 0.8);
}

/* ================= 公用基础样式 ================= */
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

.badge {
  padding: 2px 6px;
  font-size: 10px;
  border-radius: 10px;
  background: rgba(255, 77, 125, 0.25);
  color: #ff4d7d;
  line-height: 1;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
}

/* 动效 transition */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease-out;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>