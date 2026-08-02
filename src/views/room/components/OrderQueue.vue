<template>
  <div class="order-queue">
    <div class="panel-header">
      <div class="header-main">
        <h3>排队点歌 <span class="count">{{ queue.length }}</span></h3>
        <el-button type="primary" size="small" round class="order-btn" @click="$emit('open-search')">
          <el-icon><Plus /></el-icon>我要点歌
        </el-button>
      </div>
    </div>

    <!-- 正在播放卡片 -->
    <div class="now-playing-card" v-if="currentSong">
      <div class="card-bg" :style="{ backgroundImage: `url(${currentSong.coverUrl})` }"></div>
      <div class="card-content">
        <div class="label">正在播放</div>
        <div class="song-name">{{ currentSong.name }}</div>
        <div class="song-artist">{{ currentSong.artist }}</div>
        <div class="actions">
          <el-button link class="action-btn skip" icon="CaretRight" @click="$emit('skip')">切歌</el-button>
        </div>
      </div>
    </div>

    <el-scrollbar class="queue-list">
      <div class="list-container" v-if="upcomingQueue.length > 0">
        <div
            v-for="(item, index) in upcomingQueue"
            :key="item.id"
            class="queue-item"
        >
          <div class="item-left">
            <span class="index">{{ index + 1 }}</span>
            <div class="song-meta">
              <div class="name">{{ item.name }}</div>
              <div class="artist">{{ item.artist }}</div>
            </div>
          </div>

          <div class="item-right">
            <span class="user-tag">{{ item.orderedBy }} 点</span>
            <div class="hover-actions">
              <el-tooltip content="置顶" placement="top">
                <el-button link icon="Top" @click="$emit('top', getOriginalIndex(index))" />
              </el-tooltip>
              <el-tooltip content="移除" placement="top">
                <el-button link icon="Delete" @click="$emit('remove', getOriginalIndex(index))" />
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="queue.length > 0" class="queue-empty-state">
        <p>已经是最后一首啦~</p>
      </div>
      <el-empty v-else description="还没人点歌呢" :image-size="60" />
    </el-scrollbar>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  queue: {
    type: Array,
    default: () => []
  },
  currentIndex: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['open-search', 'skip', 'top', 'remove'])

// 正在播放的歌曲
const currentSong = computed(() => props.queue[props.currentIndex] || null)

// 排队中的歌曲 (当前播放之后的)
const upcomingQueue = computed(() => {
  return props.queue.slice(props.currentIndex + 1)
})

// 获取原始数组中的索引
const getOriginalIndex = (upcomingIndex) => {
  return props.currentIndex + 1 + upcomingIndex
}
</script>

<style scoped>
.order-queue {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  padding: 20px;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  font-size: 16px;
  font-weight: 800;
  margin: 0;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.6);
}

.order-btn {
  background: linear-gradient(135deg, #ff4d7d 0%, #c92c63 100%) !important;
  border: none !important;
  padding: 8px 16px !important;
  font-weight: 600;
}

/* 正在播放卡片 */
.now-playing-card {
  margin: 0 20px 20px;
  height: 120px;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(15px) brightness(0.5);
  transform: scale(1.1);
}

.card-content {
  position: relative;
  z-index: 2;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-content .label {
  font-size: 10px;
  color: #ff4d7d;
  font-weight: 900;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.card-content .song-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
}

.card-content .song-artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.card-content .actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  padding: 4px 12px !important;
  border-radius: 20px;
  color: #fff !important;
  font-size: 12px;
}

/* 列表样式 */
.queue-list {
  flex: 1;
}

.list-container {
  padding: 0 12px 20px;
}

.queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 4px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.02);
}

.queue-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.index {
  font-size: 12px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.2);
}

.song-meta .name {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}

.song-meta .artist {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.item-right {
  display: flex;
  align-items: center;
}

.user-tag {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.4);
}

.hover-actions {
  display: none;
  gap: 4px;
  margin-left: 8px;
}

.queue-item:hover .user-tag {
  display: none;
}

.queue-item:hover .hover-actions {
  display: flex;
}

.queue-empty-state {
  text-align: center;
  padding: 40px 0;
  color: rgba(255, 255, 255, 0.2);
  font-size: 13px;
}
</style>
