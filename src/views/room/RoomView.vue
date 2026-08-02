<template>
  <div class="room-container">
    <!-- 全屏动态背景 -->
    <div class="dynamic-bg" :style="{ backgroundImage: currentTrack ? `url(${currentTrack.coverUrl})` : 'none' }"></div>
    <div class="bg-overlay"></div>

    <RoomHeader :user-count="userCount" />

    <div class="room-content">
      <!-- 左侧：舞台区 (播放器) -->
      <section class="stage-section">
        <RoomPlayer
            :current-track="currentTrack"
            :current-time="currentTime"
            :duration="duration"
            :is-playing="isPlaying"
        />

        <!-- 隐形播放器 -->
        <audio
            ref="audioRef"
            :src="currentTrack?.fileUrl"
            @timeupdate="onTimeUpdate"
            @loadedmetadata="onLoadedMetadata"
            @ended="onTrackEnded"
        ></audio>
      </section>

      <!-- 右侧：后台区 (点歌排队与聊天) -->
      <aside class="backstage-section">
        <div class="tabs-container">
          <div
              v-for="tab in ['queue', 'chat']"
              :key="tab"
              :class="['tab-item', { active: activeTab === tab }]"
              @click="activeTab = tab"
          >
            {{ tab === 'queue' ? '排队点歌' : '实时互动' }}
          </div>
        </div>

        <div class="panel-body">
          <OrderQueue
              v-show="activeTab === 'queue'"
              :queue="orderQueue"
              :current-index="currentIndex"
              @open-search="showSearch = true"
              @skip="onTrackEnded"
              @top="moveToTop"
              @remove="removeFromQueue"
          />
          <ChatPanel
              v-show="activeTab === 'chat'"
              :messages="chatMessages"
              @send="handleSendMessage"
          />
        </div>
      </aside>
    </div>

    <!-- 点歌搜索弹窗 -->
    <el-dialog
        v-model="showSearch"
        title="点歌台"
        width="500px"
        append-to-body
        class="search-dialog"
    >
      <div class="search-input-wrap">
        <el-input
            v-model="searchKeyword"
            placeholder="搜索歌曲或歌手..."
            @keyup.enter="handleSearch"
        >
          <template #append>
            <el-button icon="Search" @click="handleSearch" :loading="searching" />
          </template>
        </el-input>
      </div>

      <el-scrollbar max-height="400px" class="search-results">
        <div v-for="item in searchResults" :key="item.id" class="search-item" @click="addToQueue(item)">
          <img :src="item.coverUrl" class="mini-cover" />
          <div class="meta">
            <span class="name">{{ item.name }}</span>
            <span class="artist">{{ item.artist }}</span>
          </div>
          <el-button link icon="Plus" />
        </div>
        <el-empty v-if="!searchResults.length && !searching" description="搜索结果为空" :image-size="60" />
      </el-scrollbar>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { searchMusic } from '@/api/music/music.js'
import { ElMessage } from 'element-plus'

import RoomHeader from './components/RoomHeader.vue'
import RoomPlayer from './components/RoomPlayer.vue'
import OrderQueue from './components/OrderQueue.vue'
import ChatPanel from './components/ChatPanel.vue'

// --- 状态变量 ---
const audioRef = ref(null)
const activeTab = ref('chat')
const showSearch = ref(false)
const userCount = ref(Math.floor(Math.random() * 50) + 10)

// 播放状态
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const orderQueue = ref([])
const currentIndex = ref(0)

// 聊天状态
const chatMessages = ref([
  { type: 'system', content: '欢迎来到莓莓 KTV 直播间，快去点首歌吧！' }
])

// 搜索状态
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref([])

// --- 计算属性 ---
const currentTrack = computed(() => orderQueue.value[currentIndex.value] || null)

// --- 核心方法 ---

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

const addToQueue = (song) => {
  // 检查是否已在队列中
  if (orderQueue.value.some(item => item.id === song.id)) {
    return ElMessage.info('这首歌已经在排队啦~')
  }

  const newOrder = { ...song, orderedBy: '我', orderTime: Date.now() }
  orderQueue.value.push(newOrder)
  ElMessage.success(`点歌成功：${song.name}`)
  showSearch.value = false

  // 如果当前没歌在播，自动开始
  if (!isPlaying.value) {
    currentIndex.value = orderQueue.value.length - 1
    startPlayback()
  }

  // 同步到聊天室
  broadcastSystemMessage(`[我] 点了一首《${song.name}》`)
}

const moveToTop = (index) => {
  if (index <= currentIndex.value + 1) return // 已经是下一首或正在播
  const item = orderQueue.value.splice(index, 1)[0]
  orderQueue.value.splice(currentIndex.value + 1, 0, item)
  ElMessage.success('已置顶，下一首即将播放')
  broadcastSystemMessage(`[我] 将《${item.name}》置顶了`)
}

const removeFromQueue = (index) => {
  if (index === currentIndex.value) {
    // 如果删除的是正在播放的，直接执行切歌逻辑
    onTrackEnded()
    // 注意：onTrackEnded 内部会增加 currentIndex，但在删除当前项后，
    // 原本的下一项已经移到了当前位置，所以需要减回来
    orderQueue.value.splice(index, 1)
    if (currentIndex.value > 0) currentIndex.value--
  } else {
    orderQueue.value.splice(index, 1)
    if (index < currentIndex.value) currentIndex.value--
  }
  ElMessage.info('已从队列移除')
}

/**
 * 系统消息播报
 */
const broadcastSystemMessage = (content) => {
  chatMessages.value.push({
    type: 'system',
    content: content,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
}

/**
 * 歌曲开始时的全局通知
 */
const announceNewSong = (song) => {
  broadcastSystemMessage(`正在播放：${song.name} - ${song.artist}`)
}

const startPlayback = () => {
  isPlaying.value = true
  if (currentTrack.value) {
    announceNewSong(currentTrack.value)
  }
  nextTick(() => {
    if (audioRef.value) {
      audioRef.value.play().catch(err => {
        console.warn('播放失败，可能需要用户交互:', err)
      })
    }
  })
}

const onTimeUpdate = () => {
  if (audioRef.value) currentTime.value = audioRef.value.currentTime
}

const onLoadedMetadata = () => {
  if (audioRef.value) duration.value = audioRef.value.duration
}

const onTrackEnded = () => {
  if (currentIndex.value < orderQueue.value.length - 1) {
    const prevName = currentTrack.value?.name
    currentIndex.value++
    startPlayback()
    broadcastSystemMessage(`《${prevName}》播放完毕，接力《${currentTrack.value?.name}》`)
  } else {
    isPlaying.value = false
    currentTime.value = 0
    broadcastSystemMessage('点歌单已播完，快来点歌点燃气氛吧！')
  }
}

onMounted(() => {
  // 模拟一些初始点歌
  orderQueue.value = [
    { id: '1', name: '有点甜', artist: '汪苏泷', coverUrl: 'https://p2.music.126.net/7VvH967be59Pr986QO_5_A==/109951166318991206.jpg', orderedBy: '系统' }
  ]
  startPlayback()
})
</script>

<style scoped>
.room-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0b0c14;
  overflow: hidden;
  position: relative;
}

.dynamic-bg {
  position: absolute;
  inset: -10%;
  background-size: cover;
  background-position: center;
  filter: blur(80px) brightness(0.2);
  transition: background-image 1.5s ease;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 0%, #0b0c14 100%);
  z-index: 2;
}

.room-content {
  flex: 1;
  display: flex;
  position: relative;
  z-index: 10;
}

/* 舞台区 */
.stage-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

/* 后台区 */
.backstage-section {
  width: 380px;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

.tabs-container {
  display: flex;
  height: 50px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-item.active {
  color: #ff4d7d;
  background: rgba(255, 77, 125, 0.05);
  font-weight: 700;
}

.panel-body {
  flex: 1;
  overflow: hidden;
}

/* 搜索弹窗样式 */
.search-dialog :deep(.el-dialog) {
  background: #1a1b26;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.search-input-wrap {
  margin-bottom: 16px;
}

.search-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.mini-cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  margin-right: 12px;
}

.search-item .meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.search-item .name { font-size: 14px; color: #fff; }
.search-item .artist { font-size: 12px; color: rgba(255,255,255,0.4); }

@media (max-width: 768px) {
  .room-content { flex-direction: column; }
  .backstage-section { width: 100%; height: 40%; border-left: none; border-top: 1px solid rgba(255, 255, 255, 0.05); }
}
</style>
