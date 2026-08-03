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

    <!-- 顶部导航栏 (精准展示实时在线人数) -->
    <RoomHeader :user-count="onlineUserCount" />

    <!-- 全局音频标签 -->
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
      <!-- ================= 💻 PC 端布局 ================= -->
      <template v-if="!isMobile">
        <section class="pc-stage-section">
          <RoomPlayer
              :current-track="currentTrack"
              :current-time="currentTime"
              :duration="duration"
              :is-playing="isPlaying"
              :has-prev="currentIndex > 0"
              :has-next="currentIndex < orderQueue.length - 1"
              @play="handleUserPlay"
              @pause="handleUserPause"
              @stop="handleUserStop"
              @prev="handleUserPrev"
              @next="handleUserNext"
              @open-search="showSearch = true"
          />

          <!-- 首次播放阻断遮罩 -->
          <div v-if="needUserInteraction" class="playback-overlay" @click="resumeUserPlayback">
            <div class="overlay-content">
              <el-icon class="pulse-icon"><VideoPlay /></el-icon>
              <span>点击任意区域开启音频同步播放</span>
            </div>
          </div>
        </section>

        <!-- 右侧：交互侧边栏 -->
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
                  @top="handleUserTop"
                  @remove="handleUserRemove"
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

      <!-- ================= 📱 移动端布局 ================= -->
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
                @play="handleUserPlay"
                @pause="handleUserPause"
                @stop="handleUserStop"
                @prev="handleUserPrev"
                @next="handleUserNext"
                @open-search="showSearch = true"
            />

            <div v-if="needUserInteraction" class="playback-overlay" @click="resumeUserPlayback">
              <div class="overlay-content">
                <el-icon class="pulse-icon"><VideoPlay /></el-icon>
                <span>点击任意区域开启音频同步播放</span>
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'queue'" key="queue" class="mobile-tab-panel">
            <OrderQueue
                :queue="orderQueue"
                :current-index="currentIndex"
                @open-search="showSearch = true"
                @skip="handleUserNext"
                @top="handleUserTop"
                @remove="handleUserRemove"
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

// 1. 生成唯一客户端 ID 与 随机用户名
const CLIENT_ID = 'user_' + Math.random().toString(36).substring(2, 9)
const USER_NAME = '听众' + Math.floor(1000 + Math.random() * 9000)
const JOIN_TIME = Date.now() // 记录加入时间，用于选出状态同步协调者

// 2. MQTT Topic 定义
const ROOM_ID = 'ktv_room_001'
const TOPICS = {
  PRESENCE: `ktv/${ROOM_ID}/presence`,     // 人数/在线心跳
  BROADCAST: `ktv/${ROOM_ID}/broadcast`,   // 房间播放控制
  CHAT: `ktv/${ROOM_ID}/chat`,             // 聊天/弹幕
  SYNC_REQ: `ktv/${ROOM_ID}/sync-req`,     // 刚加入者请求房间状态
  SYNC_RES: `ktv/${ROOM_ID}/sync-res`      // 协调者应答当前状态
}

// ==========================================
// 👥 实时在线人数 (Presence) 管理
// ==========================================
const onlineUsers = ref(new Map()) // key: clientId, value: { lastActive, joinTime }
const onlineUserCount = computed(() => Math.max(1, onlineUsers.value.size))
let heartbeatTimer = null

// 判断自己是否是房间内资历最老的人（协调者）
const isHost = computed(() => {
  if (onlineUsers.value.size === 0) return true
  let oldestId = CLIENT_ID
  let minJoinTime = JOIN_TIME

  onlineUsers.value.forEach((info, id) => {
    if (info.joinTime < minJoinTime) {
      minJoinTime = info.joinTime
      oldestId = id
    }
  })
  return oldestId === CLIENT_ID
})

const startHeartbeat = () => {
  onlineUsers.value.set(CLIENT_ID, { lastActive: Date.now(), joinTime: JOIN_TIME })

  heartbeatTimer = setInterval(() => {
    publishMqtt(TOPICS.PRESENCE, { type: 'PING', name: USER_NAME, joinTime: JOIN_TIME })

    const now = Date.now()
    onlineUsers.value.forEach((info, id) => {
      if (now - info.lastActive > 10000) {
        onlineUsers.value.delete(id)
      }
    })
  }, 3000)
}

// ==========================================
// 📡 MQTT 通信核心
// ==========================================
const initMqttSync = () => {
  const mqtt = window.$mqttServer
  if (!mqtt) {
    console.warn('⚠️ window.$mqttServer 未加载，处于单机模式')
    return
  }

  Object.values(TOPICS).forEach(topic => mqtt.subscribe(topic))

  mqtt.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString())
      if (data.senderId === CLIENT_ID) return

      handleIncomingMqttMessage(topic, data)
    } catch (e) {
      console.error('MQTT 解析异常:', e)
    }
  })

  startHeartbeat()
  publishMqtt(TOPICS.PRESENCE, { type: 'JOIN', name: USER_NAME, joinTime: JOIN_TIME })
  publishMqtt(TOPICS.SYNC_REQ, { requestTime: Date.now() })
}

const publishMqtt = (topic, data) => {
  if (window.$mqttServer) {
    window.$mqttServer.publish(topic, JSON.stringify({
      ...data,
      senderId: CLIENT_ID,
      timestamp: Date.now()
    }))
  }
}

const handleIncomingMqttMessage = (topic, data) => {
  switch (topic) {
    case TOPICS.PRESENCE:
      handlePresenceMessage(data)
      break
    case TOPICS.BROADCAST:
      handleBroadcastAction(data)
      break
    case TOPICS.CHAT:
      chatMessages.value.push({
        type: 'user',
        user: data.user,
        content: data.content,
        time: data.time
      })
      sendDanmaku({ content: data.content, user: data.user, type: 'user' })
      break
    case TOPICS.SYNC_REQ:
      // ✅ 修复：仅由房间资历最老的节点（Host）响应状态同步，防止多重覆盖
      if (isHost.value) {
        publishMqtt(TOPICS.SYNC_RES, {
          targetId: data.senderId,
          orderQueue: orderQueue.value,
          currentIndex: currentIndex.value,
          currentTime: currentTime.value,
          isPlaying: isPlaying.value
        })
      }
      break
    case TOPICS.SYNC_RES:
      if (data.targetId === CLIENT_ID && data.orderQueue) {
        orderQueue.value = data.orderQueue
        currentIndex.value = data.currentIndex
        nextTick(() => {
          if (audioRef.value) {
            audioRef.value.currentTime = data.currentTime || 0
            if (data.isPlaying) startPlayback()
          }
        })
      }
      break
  }
}

const handlePresenceMessage = (data) => {
  if (data.type === 'PING' || data.type === 'JOIN') {
    onlineUsers.value.set(data.senderId, {
      lastActive: Date.now(),
      joinTime: data.joinTime || Date.now()
    })
  } else if (data.type === 'LEAVE') {
    onlineUsers.value.delete(data.senderId)
  }
}

const handleBroadcastAction = (data) => {
  const { action, payload } = data

  switch (action) {
    case 'PLAY':
      if (payload?.time !== undefined && audioRef.value) {
        if (Math.abs(audioRef.value.currentTime - payload.time) > 1.2) {
          audioRef.value.currentTime = payload.time
        }
      }
      execPlay()
      break
    case 'PAUSE':
      execPause()
      break
    case 'STOP':
      execStop()
      break
    case 'ADD_QUEUE':
      orderQueue.value.push(payload)
      if (!isPlaying.value && orderQueue.value.length === 1) {
        currentIndex.value = 0
        startPlayback()
      }
      broadcastSystemMessage(`[${data.name || '心愿用户'}] 点了一首《${payload.name}》`)
      break
    case 'CHANGE_TRACK':
      currentIndex.value = payload.index
      startPlayback()
      break
    case 'TOP_QUEUE':
      execMoveToTop(payload.index)
      break
    case 'REMOVE_QUEUE':
      execRemoveFromQueue(payload.index)
      break
  }
}

// ==========================================
// 🚀 防撞车弹幕调度逻辑
// ==========================================
const danmakuList = ref([])
const TRACK_COUNT = 5
const TRACK_HEIGHT = 40
const TOP_OFFSET = 60
const trackNextAvailableTime = ref(new Array(TRACK_COUNT).fill(0))

const sendDanmaku = ({ content, user = '', type = 'user' }) => {
  if (!content) return
  const now = Date.now()

  // ✅ 根据字数计算防重叠安全间隔（字数越多间隔越长）
  const safeGap = Math.max(1500, content.length * 280)

  let allocatedTrack = trackNextAvailableTime.value.findIndex(t => t <= now)
  if (allocatedTrack === -1) {
    allocatedTrack = Math.floor(Math.random() * TRACK_COUNT)
  }
  trackNextAvailableTime.value[allocatedTrack] = now + safeGap

  danmakuList.value.push({
    id: now + Math.random(),
    content,
    user,
    type,
    top: TOP_OFFSET + allocatedTrack * TRACK_HEIGHT,
    duration: (type === 'system' ? 9.0 : Math.random() * 2 + 7).toFixed(1),
    color: type === 'system' ? '#ff4d7d' : '#ffffff'
  })
}

const removeDanmaku = (id) => {
  danmakuList.value = danmakuList.value.filter(item => item.id !== id)
}

// ==========================================
// 🎵 播放器核心与交互
// ==========================================
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
const activeTab = ref('queue')
const showSearch = ref(false)
const needUserInteraction = ref(false)

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const orderQueue = ref([])
const currentIndex = ref(0)

const chatMessages = ref([
  { type: 'system', content: '🎤 欢迎进入在线同步 KTV 房间！' }
])
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref([])

const currentTrack = computed(() => orderQueue.value[currentIndex.value] || null)

watch(isMobile, (mobile) => {
  if (!mobile && activeTab.value === 'player') activeTab.value = 'queue'
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
        console.warn('浏览器自动播放拦截:', err)
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
    }).catch(err => {
      ElMessage.error('播放失败，请检查网络或音频链接')
    })
  }
}

// 用户主动发起的动作
const handleUserPlay = () => {
  execPlay()
  publishMqtt(TOPICS.BROADCAST, { action: 'PLAY', payload: { time: currentTime.value } })
}

const handleUserPause = () => {
  execPause()
  publishMqtt(TOPICS.BROADCAST, { action: 'PAUSE' })
}

const handleUserStop = () => {
  execStop()
  publishMqtt(TOPICS.BROADCAST, { action: 'STOP' })
}

const handleUserPrev = () => {
  if (currentIndex.value > 0) {
    const targetIdx = currentIndex.value - 1
    currentIndex.value = targetIdx
    startPlayback()
    publishMqtt(TOPICS.BROADCAST, { action: 'CHANGE_TRACK', payload: { index: targetIdx } })
  } else {
    ElMessage.warning('已经是第一首了')
  }
}

const handleUserNext = () => {
  if (currentIndex.value < orderQueue.value.length - 1) {
    const targetIdx = currentIndex.value + 1
    currentIndex.value = targetIdx
    startPlayback()
    publishMqtt(TOPICS.BROADCAST, { action: 'CHANGE_TRACK', payload: { index: targetIdx } })
  } else {
    execStop()
    broadcastSystemMessage('点歌单已播放完毕，快去点歌吧！')
  }
}

const handleUserTop = (index) => {
  execMoveToTop(index)
  publishMqtt(TOPICS.BROADCAST, { action: 'TOP_QUEUE', payload: { index } })
}

const handleUserRemove = (index) => {
  execRemoveFromQueue(index)
  publishMqtt(TOPICS.BROADCAST, { action: 'REMOVE_QUEUE', payload: { index } })
}

// 基础音视频控制指令
const execPlay = () => {
  if (!audioRef.value || !currentTrack.value) return
  audioRef.value.play().catch(() => { needUserInteraction.value = true })
  isPlaying.value = true
}

const execPause = () => {
  if (!audioRef.value) return
  audioRef.value.pause()
  isPlaying.value = false
}

const execStop = () => {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.currentTime = 0
  }
  isPlaying.value = false
  currentTime.value = 0
}

const execMoveToTop = (index) => {
  if (index <= currentIndex.value) return
  const item = orderQueue.value.splice(index, 1)[0]
  orderQueue.value.splice(currentIndex.value + 1, 0, item)
  ElMessage.success(`已置顶《${item.name}》`)
}

const execRemoveFromQueue = (index) => {
  if (index === currentIndex.value) {
    orderQueue.value.splice(index, 1)
    if (currentIndex.value < orderQueue.value.length) {
      startPlayback()
    } else {
      execStop()
    }
  } else {
    orderQueue.value.splice(index, 1)
    if (index < currentIndex.value) currentIndex.value--
  }
}

// 音频标签回调
const onTimeUpdate = () => {
  if (audioRef.value) currentTime.value = audioRef.value.currentTime
}
const onLoadedMetadata = () => {
  if (audioRef.value) duration.value = audioRef.value.duration
}
const onAudioError = () => {
  ElMessage.error(`歌曲《${currentTrack.value?.name || ''}》加载失败，跳过`)
  setTimeout(() => handleUserNext(), 1200)
}
const onTrackEnded = () => { handleUserNext() }

// 点歌逻辑
const addToQueue = (song) => {
  if (orderQueue.value.some(item => item.id === song.id)) {
    return ElMessage.info('这首歌已经在排队列表里啦~')
  }

  const newOrder = { ...song, orderedBy: USER_NAME, orderTime: Date.now() }
  orderQueue.value.push(newOrder)
  ElMessage.success(`成功点歌：《${song.name}》`)
  showSearch.value = false

  if (!isPlaying.value && orderQueue.value.length === 1) {
    currentIndex.value = 0
    startPlayback()
  }

  broadcastSystemMessage(`[${USER_NAME}] 点了一首《${song.name}》`)
  publishMqtt(TOPICS.BROADCAST, { action: 'ADD_QUEUE', payload: newOrder, name: USER_NAME })
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
  const msgObj = {
    user: USER_NAME,
    content: text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  chatMessages.value.push({ type: 'user', ...msgObj })
  sendDanmaku({ content: text, user: USER_NAME, type: 'user' })
  publishMqtt(TOPICS.CHAT, msgObj)
}

const broadcastSystemMessage = (content) => {
  chatMessages.value.push({
    type: 'system',
    content,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
  sendDanmaku({ content, type: 'system' })
}

const announceNewSong = (song) => {
  broadcastSystemMessage(`🎤 正在播放：${song.name} - ${song.artist}`)
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  initMqttSync()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (heartbeatTimer) clearInterval(heartbeatTimer)

  publishMqtt(TOPICS.PRESENCE, { type: 'LEAVE', name: USER_NAME })

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

/* 弹幕控制 */
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
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-100vw - 100%));
  }
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
</style>