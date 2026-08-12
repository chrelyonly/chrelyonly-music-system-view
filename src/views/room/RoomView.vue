<template>
  <div class="room-container">
    <!-- 🌟 1. 全屏初始化 Loading 遮罩 -->
    <Transition name="fade">
      <div v-if="initLoading" class="room-loading-mask">
        <div class="loading-box">
          <div class="spinner-ring"></div>
          <div class="loading-icon">🎤</div>
          <p class="loading-text">正在同步房间状态与互动记录...</p>
        </div>
      </div>
    </Transition>

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
        <div v-if="searching" class="search-loading-wrap">
          <div class="music-wave-loader">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <p>正在搜索歌曲资源...</p>
        </div>

        <template v-else>
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
              v-if="!searchResults.length"
              description="搜搜看喜欢的歌曲吧~"
              :image-size="70"
          />
        </template>
      </el-scrollbar>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { searchMusic } from '@/api/music/music.js'
import { subscribeTopic, onMqttMessage, getClient } from '@/util/mqttUtil.js'
import { ElMessage } from 'element-plus'
import { VideoPlay } from '@element-plus/icons-vue'

import RoomHeader from './components/RoomHeader.vue'
import RoomPlayer from './components/RoomPlayer.vue'
import OrderQueue from './components/OrderQueue.vue'
import ChatPanel from './components/ChatPanel.vue'

// 1. 常量与基础配置
const USER_ID = 'user_' + Math.random().toString(16).slice(2, 8)
const USER_NAME = '听众' + Math.floor(1000 + Math.random() * 9000)

// MQTT Topic 配置
const TOPIC_QUEUE = 'ktv/room/queue'
const TOPIC_SYNC = 'ktv/room/sync'
const TOPIC_CHAT = 'ktv/room/chat'

// 2. 状态变量定义
const onlineUserCount = ref(1)
const initLoading = ref(true)

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
// 📡 MQTT 协同与后端通信逻辑
// ==========================================

const publishMqtt = (topic, payload) => {
  const client = getClient()
  if (client && client.connected) {
    client.publish(topic, JSON.stringify({ ...payload, senderId: USER_ID, timestamp: Date.now() }))
  }
}

// 广播更新播放队列给后端持久化到 Redis (支持附带自动播放指令 autoPlay)
const broadcastQueue = (autoPlay = false) => {
  publishMqtt(TOPIC_QUEUE, {
    action: 'UPDATE_QUEUE',
    queue: orderQueue.value,
    currentIndex: currentIndex.value,
    autoPlay
  })
}

// 广播播放控制
const sendControlAction = (type, seekTime = null) => {
  const currentSeek = seekTime !== null ? seekTime : (audioRef.value?.currentTime || 0)
  publishMqtt(TOPIC_SYNC, {
    action: 'CONTROL',
    type,
    seekTime: currentSeek
  })
  // 本地先行响应
  if (type === 'PLAY') playAudio()
  if (type === 'PAUSE') pauseAudio()
  if (type === 'STOP') stopAudio()
}

// 监听 MQTT 接收消息
const handleMqttIncoming = (topic, messageStr) => {
  try {
    const data = JSON.parse(messageStr)

    if (data.action === 'UPDATE_QUEUE' || data.action === 'INIT_CHAT_HISTORY') {
      initLoading.value = false
    }

    // 1. 初始化聊天历史记录
    if (data.action === 'INIT_CHAT_HISTORY') {
      const historyMsgs = (data.messages || []).map(msg => ({
        type: 'user',
        user: msg.user,
        content: msg.content,
        time: msg.time
      }))
      chatMessages.value = [
        { type: 'system', content: '🎤 欢迎进入在线协同 KTV 房间！' },
        ...historyMsgs
      ]
      return
    }

    // 2. 队列更新同步（切歌、移除、置顶、点歌均走这里）
    if (data.action === 'UPDATE_QUEUE') {
      const trackChanged = (currentTrack.value?.id !== data.queue?.[data.currentIndex]?.id)

      orderQueue.value = data.queue || []
      currentIndex.value = data.currentIndex || 0

      // 如果切歌了或者要求自动播放
      if (trackChanged || data.autoPlay) {
        nextTick(() => {
          if (currentTrack.value) {
            playAudio(true) // 强制重新加载音频
          } else {
            stopAudio()
          }
        })
      }
    }

    // 3. 播放/暂停/进度控制同步
    else if (data.action === 'CONTROL') {
      if (data.type === 'PLAY') {
        if (data.seekTime !== undefined && audioRef.value) {
          if (Math.abs(audioRef.value.currentTime - data.seekTime) > 1.5) {
            audioRef.value.currentTime = data.seekTime
          }
        }
        playAudio()
      } else if (data.type === 'PAUSE') {
        pauseAudio()
      } else if (data.type === 'STOP') {
        stopAudio()
      }
    }

    // 4. 实时聊天/弹幕同步
    else if (data.action === 'CHAT') {
      if (data.senderId !== USER_ID) {
        chatMessages.value.push({
          type: 'user',
          user: data.user,
          content: data.content,
          time: data.time
        })
        sendDanmakuLocal({ content: data.content, user: data.user, type: 'user' })
      }
    }
  } catch (e) {
    console.error('MQTT 消息解析异常:', e)
  }
}

// ==========================================
// 🎵 音频核心控制逻辑
// ==========================================
const playAudio = (forceReload = false) => {
  if (!audioRef.value || !currentTrack.value) return

  if (forceReload) {
    audioRef.value.load()
  }

  audioRef.value.play().then(() => {
    isPlaying.value = true
    needUserInteraction.value = false
  }).catch((err) => {
    console.warn('播放受到浏览器策略限制或加载失败:', err)
    isPlaying.value = false
    needUserInteraction.value = true
  })
}

const pauseAudio = () => {
  if (audioRef.value) audioRef.value.pause()
  isPlaying.value = false
}

const stopAudio = () => {
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

const resumeUserPlayback = () => {
  playAudio()
}

const handleAudioEnded = () => {
  // 只有列表里的第一位（或发起者）触发切歌，防止多人重复发送切歌
  handleUserNext()
}

// ==========================================
// 🖱️ 交互事件处理
// ==========================================
const handlePrevAction = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    broadcastQueue(true)
    addSystemMsg(`🎤 切换上一首：${currentTrack.value?.name}`)
  } else {
    ElMessage.warning('已经是第一首了')
  }
}

const handleUserNext = () => {
  if (orderQueue.value.length > 0) {
    // 移除已播放完毕的当前歌曲
    orderQueue.value.shift()
    currentIndex.value = 0

    if (orderQueue.value.length > 0) {
      broadcastQueue(true)
      addSystemMsg(`🎤 正在播放：${currentTrack.value?.name}`)
    } else {
      broadcastQueue(false)
      sendControlAction('STOP')
      addSystemMsg('点歌单已播放完毕，快去点歌吧！')
    }
  }
}

const handleTopAction = (index) => {
  if (index <= currentIndex.value) return
  const item = orderQueue.value.splice(index, 1)[0]
  orderQueue.value.splice(currentIndex.value + 1, 0, item)
  broadcastQueue(false)
}

const handleRemoveAction = (index) => {
  let isCurrent = (index === currentIndex.value)
  orderQueue.value.splice(index, 1)

  if (isCurrent) {
    if (currentIndex.value >= orderQueue.value.length) {
      currentIndex.value = 0
    }
    broadcastQueue(orderQueue.value.length > 0)
  } else {
    if (index < currentIndex.value) currentIndex.value--
    broadcastQueue(false)
  }
}

const onAudioError = () => {
  if (!currentTrack.value) return
  ElMessage.error(`歌曲《${currentTrack.value.name || ''}》加载失败，自动跳过`)
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

  publishMqtt(TOPIC_CHAT, {
    action: 'CHAT',
    user: USER_NAME,
    content: text,
    time
  })

  chatMessages.value.push({ type: 'user', user: USER_NAME, content: text, time })
  sendDanmakuLocal({ content: text, user: USER_NAME, type: 'user' })
}

// 点歌处理
const addToQueue = (song) => {
  const isAlreadyInQueue = orderQueue.value.slice(currentIndex.value).some(
      item => String(item.id) === String(song.id)
  )

  if (isAlreadyInQueue) {
    return ElMessage.info('这首歌已经在排队列表里啦~')
  }

  const newOrder = { ...song, orderedBy: USER_NAME }
  orderQueue.value.push(newOrder)
  ElMessage.success(`成功点歌：《${song.name}》`)

  // 如果原本队列为空且未在播放，自动播放刚点的内容
  const autoPlay = (!isPlaying.value && orderQueue.value.length === 1)
  if (autoPlay) {
    currentIndex.value = 0
  }

  broadcastQueue(autoPlay)
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

  subscribeTopic(TOPIC_QUEUE)
  subscribeTopic(TOPIC_SYNC)
  subscribeTopic(TOPIC_CHAT)

  unbindMqtt = onMqttMessage(handleMqttIncoming)

  setTimeout(() => {
    publishMqtt(TOPIC_QUEUE, { action: 'GET_ROOM_STATE' })
  }, 800)
  setTimeout(() => {
    initLoading.value = false
  }, 1200)
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
  min-width: 0;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ElDialog 弹窗深色协同适配 */
:deep(.el-dialog) {
  background: #161823 !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}


:deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
/* ==========================================
   ✨ 1. 全屏 Room Loading 遮罩样式
   ========================================== */
.room-loading-mask {
  position: absolute;
  inset: 0;
  background: rgba(9, 10, 16, 0.88);
  backdrop-filter: blur(16px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

/* 旋转霓虹光环 */
.spinner-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: #ff4d7d;
  border-right-color: #8a2be2;
  animation: spinRing 1s linear infinite;
  box-shadow: 0 0 15px rgba(255, 77, 125, 0.4);
}

.loading-icon {
  position: absolute;
  top: 18px;
  font-size: 28px;
  animation: pulseIcon 1.5s ease-in-out infinite alternate;
}

.loading-text {
  margin-top: 24px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 1px;
}

@keyframes spinRing {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulseIcon {
  from { transform: scale(0.9); opacity: 0.7; }
  to { transform: scale(1.15); opacity: 1; }
}

/* Fade 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ==========================================
   🎵 2. 点歌台搜索音频波浪动画样式
   ========================================== */
.search-loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 16px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.music-wave-loader {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 30px;
}

.music-wave-loader span {
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #ff4d7d 0%, #8a2be2 100%);
  border-radius: 3px;
  animation: jumpWave 1.2s ease-in-out infinite;
}

.music-wave-loader span:nth-child(1) { animation-delay: 0.0s; }
.music-wave-loader span:nth-child(2) { animation-delay: 0.2s; }
.music-wave-loader span:nth-child(3) { animation-delay: 0.4s; }
.music-wave-loader span:nth-child(4) { animation-delay: 0.1s; }
.music-wave-loader span:nth-child(5) { animation-delay: 0.3s; }

@keyframes jumpWave {
  0%, 100% { height: 6px; }
  50% { height: 28px; }
}
</style>