<template>
  <div class="room-container">
    <!-- 💬 弹幕层 -->
    <div class="danmaku-container">
      <div
          v-for="item in danmakuList"
          :key="item.id"
          class="danmaku-item"
          :class="item.type"
          :style="{
          top: `${item.top}px`,
          animationDuration: `${item.duration}s`,
          color: item.color || '#ffffff'
        }"
          @animationend="removeDanmaku(item.id)"
      >
        <span v-if="item.user" class="danmaku-user">{{ item.user }}:</span>
        <span class="danmaku-text">{{ item.content }}</span>
      </div>
    </div>

    <!-- 全屏动态模糊背景 -->
    <div
        class="dynamic-bg"
        :style="{ backgroundImage: currentTrack?.coverUrl ? `url(${currentTrack.coverUrl})` : 'none' }"
    ></div>
    <div class="bg-overlay"></div>

    <!-- 顶部导航栏 -->
    <RoomHeader :user-count="onlineUserCount" />

    <!-- 全局音频标签 -->
    <audio
        ref="audioRef"
        :src="currentTrack?.fileUrl"
        @timeupdate="onAudioTimeUpdate"
        @loadedmetadata="duration = audioRef?.duration || 0"
        @ended="handleAudioEnded"
        @error="onAudioError"
    ></audio>

    <!-- 主体内容展示区 -->
    <main class="room-content" :class="{ 'is-mobile': isMobile }">
      <!-- 💻 PC 端布局 -->
      <template v-if="!isMobile">
        <section class="pc-stage-section">
          <RoomPlayer
              :current-track="currentTrack"
              :current-time="currentTime"
              :duration="duration"
              :is-playing="isPlaying"
              :has-prev="currentIndex > 0"
              :has-next="currentIndex < orderQueue.length - 1"
              @play="sendControlAction('PLAY')"
              @pause="sendControlAction('PAUSE')"
              @stop="sendControlAction('STOP')"
              @prev="handlePrevAction"
              @next="handleUserNext"
              @open-search="showSearch = true"
          />

          <!-- 首次播放阻断遮罩 -->
          <div v-if="needUserInteraction" class="playback-overlay" @click="resumeUserPlayback">
            <div class="overlay-content">
              <el-icon class="pulse-icon"><VideoPlay /></el-icon>
              <span>点击任意区域开启音频协同播放</span>
            </div>
          </div>
        </section>

        <!-- 右侧侧边栏 -->
        <aside class="pc-backstage-section">
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

          <div class="pc-panel-body">
            <Transition name="fade-slide" mode="out-in">
              <OrderQueue
                  v-if="activeTab === 'queue'"
                  key="queue"
                  :queue="orderQueue"
                  :current-index="currentIndex"
                  @open-search="showSearch = true"
                  @skip="handleUserNext"
                  @top="handleTopAction"
                  @remove="handleRemoveAction"
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

      <!-- 📱 移动端布局 -->
      <template v-else>
        <Transition name="fade-slide" mode="out-in">
          <section v-if="activeTab === 'player'" key="player" class="mobile-tab-panel">
            <RoomPlayer
                :current-track="currentTrack"
                :current-time="currentTime"
                :duration="duration"
                :is-playing="isPlaying"
                :has-prev="currentIndex > 0"
                :has-next="currentIndex < orderQueue.length - 1"
                @play="sendControlAction('PLAY')"
                @pause="sendControlAction('PAUSE')"
                @stop="sendControlAction('STOP')"
                @prev="handlePrevAction"
                @next="handleUserNext"
                @open-search="showSearch = true"
            />

            <div v-if="needUserInteraction" class="playback-overlay" @click="resumeUserPlayback">
              <div class="overlay-content">
                <el-icon class="pulse-icon"><VideoPlay /></el-icon>
                <span>点击任意区域开启音频协同播放</span>
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'queue'" key="queue" class="mobile-tab-panel">
            <OrderQueue
                :queue="orderQueue"
                :current-index="currentIndex"
                @open-search="showSearch = true"
                @skip="handleUserNext"
                @top="handleTopAction"
                @remove="handleRemoveAction"
            />
          </section>

          <section v-else-if="activeTab === 'chat'" key="chat" class="mobile-tab-panel">
            <ChatPanel
                :messages="chatMessages"
                @send="handleSendMessage"
            />
          </section>
        </Transition>
      </template>
    </main>

    <!-- 📱 移动端底部导航 -->
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
import { subscribeTopic, onMqttMessage, getClient } from '@/util/mqttUtil.js' // 引入你的 MQTT 工具
import { ElMessage } from 'element-plus'
import { VideoPlay } from '@element-plus/icons-vue'

import RoomHeader from './components/RoomHeader.vue'
import RoomPlayer from './components/RoomPlayer.vue'
import OrderQueue from './components/OrderQueue.vue'
import ChatPanel from './components/ChatPanel.vue'

// 1. 常量与基础配置
const USER_ID = 'user_' + Math.random().toString(16).slice(2, 8)
const USER_NAME = '听众' + Math.floor(1000 + Math.random() * 9000)

// MQTT 主题定义
const TOPIC_QUEUE = 'ktv/room/queue'
const TOPIC_SYNC = 'ktv/room/sync'
const TOPIC_CHAT = 'ktv/room/chat'

// 2. 状态变量定义
const onlineUserCount = ref(1)

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const orderQueue = ref([])
const currentIndex = ref(0)
const currentTrack = computed(() => orderQueue.value[currentIndex.value] || null)

const danmakuList = ref([])
const chatMessages = ref([{ type: 'system', content: '🎤 欢迎进入在线协同 KTV 房间！' }])

const audioRef = ref(null)
const activeTab = ref('queue')
const showSearch = ref(false)
const needUserInteraction = ref(false)
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref([])

// 响应式布局
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)
const handleResize = () => { windowWidth.value = window.innerWidth }

const pcTabs = [{ key: 'queue', label: '排队点歌' }, { key: 'chat', label: '实时互动' }]
const mobileTabs = [{ key: 'player', label: '播放页' }, { key: 'queue', label: '排队点歌' }, { key: 'chat', label: '实时互动' }]

watch(isMobile, (mobile) => {
  if (!mobile && activeTab.value === 'player') activeTab.value = 'queue'
}, { immediate: true })

let unbindMqtt = null

// ==========================================
// 📡 MQTT 广播与协同同步逻辑
// ==========================================

// 统一发布 MQTT 消息
const publishMqtt = (topic, payload) => {
  const client = getClient()
  if (client && client.connected) {
    client.publish(topic, JSON.stringify({ ...payload, senderId: USER_ID, timestamp: Date.now() }))
  }
}

// 监听并分发 MQTT 消息
const handleMqttIncoming = (topic, messageStr) => {
  try {
    const data = JSON.parse(messageStr)
    // 忽略自己发出的消息（部分控制广播除外）
    if (data.senderId === USER_ID && topic !== TOPIC_SYNC) return

    if (topic === TOPIC_QUEUE) {
      handleQueueSync(data)
    } else if (topic === TOPIC_SYNC) {
      handleControlSync(data)
    } else if (topic === TOPIC_CHAT) {
      handleChatSync(data)
    }
  } catch (e) {
    console.error('MQTT 消息解析失败:', e)
  }
}

// 1. 处理队列同步 (点歌、删除、置顶)
const handleQueueSync = (data) => {
  if (data.action === 'UPDATE_QUEUE') {
    orderQueue.value = data.queue
    currentIndex.value = data.currentIndex
  }
}

// 2. 处理播放控制同步 (播放、暂停、跳转、对齐)
const handleControlSync = (data) => {
  if (data.action === 'PLAY') {
    isPlaying.value = true
    if (data.seekTime !== undefined && audioRef.value) {
      if (Math.abs(audioRef.value.currentTime - data.seekTime) > 1.5) {
        audioRef.value.currentTime = data.seekTime
      }
    }
    nextTick(() => playAudio(false))
  } else if (data.action === 'PAUSE') {
    pauseAudio(false)
  } else if (data.action === 'STOP') {
    stopAudio(false)
  } else if (data.action === 'REQUEST_STATE') {
    // 新人进房，在线用户回应当前房间状态
    if (currentTrack.value) {
      publishMqtt(TOPIC_SYNC, {
        action: 'RESPONSE_STATE',
        queue: orderQueue.value,
        currentIndex: currentIndex.value,
        currentTime: currentTime.value,
        isPlaying: isPlaying.value
      })
    }
  } else if (data.action === 'RESPONSE_STATE' && orderQueue.value.length === 0) {
    // 新人收到全量状态对齐
    orderQueue.value = data.queue || []
    currentIndex.value = data.currentIndex || 0
    if (data.isPlaying) {
      nextTick(() => {
        if (audioRef.value) audioRef.value.currentTime = data.currentTime || 0
        playAudio(false)
      })
    }
  }
}

// 3. 处理聊天与弹幕同步
const handleChatSync = (data) => {
  if (data.action === 'MESSAGE') {
    chatMessages.value.push({
      type: 'user',
      user: data.user,
      content: data.content,
      time: data.time
    })
    sendDanmakuLocal({ content: data.content, user: data.user, type: 'user' })
  }
}

// 广播当前最新队列
const broadcastQueue = () => {
  publishMqtt(TOPIC_QUEUE, {
    action: 'UPDATE_QUEUE',
    queue: orderQueue.value,
    currentIndex: currentIndex.value
  })
}

// 广播播放控制动作
const sendControlAction = (action, seekTime = null) => {
  publishMqtt(TOPIC_SYNC, {
    action,
    seekTime: seekTime !== null ? seekTime : (audioRef.value?.currentTime || 0)
  })
  // 本地直接响应
  if (action === 'PLAY') playAudio(false)
  if (action === 'PAUSE') pauseAudio(false)
  if (action === 'STOP') stopAudio(false)
}

// ==========================================
// 🎵 音频底层控制
// ==========================================
const playAudio = (isManual = true) => {
  if (!audioRef.value || !currentTrack.value) return
  audioRef.value.play().then(() => {
    isPlaying.value = true
    needUserInteraction.value = false
  }).catch(() => {
    needUserInteraction.value = true
  })
}

const pauseAudio = (isManual = true) => {
  if (audioRef.value) audioRef.value.pause()
  isPlaying.value = false
}

const stopAudio = (isManual = true) => {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.currentTime = 0
  }
  isPlaying.value = false
  currentTime.value = 0
}

const onAudioTimeUpdate = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

const startTrack = () => {
  if (!currentTrack.value) return
  isPlaying.value = true
  addSystemMsg(`🎤 正在播放：${currentTrack.value.name} - ${currentTrack.value.artist}`)
  broadcastQueue()
  sendControlAction('PLAY', 0)
}

const resumeUserPlayback = () => {
  playAudio(false)
}

const handleAudioEnded = () => {
  handleUserNext()
}

// ==========================================
// 🖱️ 用户交互事件
// ==========================================
const handlePrevAction = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    startTrack()
  } else {
    ElMessage.warning('已经是第一首了')
  }
}

const handleUserNext = () => {
  if (currentIndex.value < orderQueue.value.length - 1) {
    currentIndex.value++
    startTrack()
  } else {
    sendControlAction('STOP')
    addSystemMsg('点歌单已播放完毕，快去点歌吧！')
  }
}

const handleTopAction = (index) => {
  if (index <= currentIndex.value) return
  const item = orderQueue.value.splice(index, 1)[0]
  orderQueue.value.splice(currentIndex.value + 1, 0, item)
  broadcastQueue()
}

const handleRemoveAction = (index) => {
  if (index === currentIndex.value) {
    orderQueue.value.splice(index, 1)
    if (currentIndex.value < orderQueue.value.length) startTrack()
    else sendControlAction('STOP')
  } else {
    orderQueue.value.splice(index, 1)
    if (index < currentIndex.value) currentIndex.value--
  }
  broadcastQueue()
}

const onAudioError = () => {
  ElMessage.error(`歌曲《${currentTrack.value?.name || ''}》加载失败，自动跳过`)
  setTimeout(() => handleUserNext(), 1200)
}

// ==========================================
// 💬 弹幕与消息系统
// ==========================================
let trackIndex = 0
const sendDanmakuLocal = ({ content, user = '', type = 'user' }) => {
  if (!content) return
  const top = 60 + (trackIndex % 5) * 40
  trackIndex++

  danmakuList.value.push({
    id: Date.now() + Math.random(),
    content,
    user,
    type,
    top,
    duration: type === 'system' ? 9.0 : 8.0,
    color: type === 'system' ? '#ff4d7d' : '#ffffff'
  })
}

const removeDanmaku = (id) => {
  danmakuList.value = danmakuList.value.filter(i => i.id !== id)
}

const addSystemMsg = (content) => {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  chatMessages.value.push({ type: 'system', content, time })
  sendDanmakuLocal({ content, type: 'system' })
}

const handleSendMessage = (text) => {
  if (!text.trim()) return
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // 广播消息给其他人
  publishMqtt(TOPIC_CHAT, {
    action: 'MESSAGE',
    user: USER_NAME,
    content: text,
    time
  })

  // 本地展示
  chatMessages.value.push({ type: 'user', user: USER_NAME, content: text, time })
  sendDanmakuLocal({ content: text, user: USER_NAME, type: 'user' })
}

// 点歌逻辑
const addToQueue = (song) => {
  if (orderQueue.value.some(item => item.id === song.id)) {
    return ElMessage.info('这首歌已经在排队列表里啦~')
  }

  const newOrder = { ...song, orderedBy: USER_NAME }
  orderQueue.value.push(newOrder)
  ElMessage.success(`成功点歌：《${song.name}》`)

  if (!isPlaying.value && orderQueue.value.length === 1) {
    currentIndex.value = 0
    startTrack()
  } else {
    broadcastQueue()
  }

  addSystemMsg(`[${USER_NAME}] 点了一首《${song.name}》`)
}

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) return
  searching.value = true
  try {
    const res = await searchMusic(searchKeyword.value)
    const data = res?.data?.data || res?.data || res
    searchResults.value = Array.isArray(data) ? data : (data?.records || [])
  } catch (e) {
    ElMessage.error('搜索失败')
  } finally {
    searching.value = false
  }
}

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleResize)

  // 1. 订阅相关主题
  subscribeTopic(TOPIC_QUEUE)
  subscribeTopic(TOPIC_SYNC)
  subscribeTopic(TOPIC_CHAT)

  // 2. 注册消息回调
  unbindMqtt = onMqttMessage(handleMqttIncoming)

  // 3. 向房间拉取当前进度同步
  setTimeout(() => {
    publishMqtt(TOPIC_SYNC, { action: 'REQUEST_STATE' })
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (unbindMqtt) unbindMqtt()
  if (audioRef.value) {
    audioRef.value.pause()
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

/* PC 端布局 */
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

/* 移动端布局 */
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

/* 弹幕样式 */
.danmaku-container {
  position: absolute;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  overflow: hidden;
}

.danmaku-item {
  position: absolute;
  left: 100%;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  padding: 4px 14px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  will-change: transform;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: danmakuFly linear forwards;
}

.danmaku-item.system {
  background: rgba(255, 77, 125, 0.2);
  border-color: rgba(255, 77, 125, 0.4);
  font-weight: 600;
}

.danmaku-user {
  color: #ffb84d;
  font-size: 13px;
}

@keyframes danmakuFly {
  from { transform: translateX(0); }
  to { transform: translateX(calc(-100vw - 100%)); }
}

/* 阻断遮罩 */
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

/* ==========================================
   🎵 点歌台弹窗样式修正
   ========================================== */
.search-input-wrap {
  margin-bottom: 16px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.search-item:hover {
  background: rgba(255, 77, 125, 0.12);
  border-color: rgba(255, 77, 125, 0.3);
}

.mini-cover {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0; /* 防止文本溢出时撑开容器 */
}

.meta .name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta .artist {
  font-size: 12px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>