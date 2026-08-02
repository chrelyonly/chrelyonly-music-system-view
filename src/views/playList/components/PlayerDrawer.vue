<template>
  <el-drawer
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      direction="ltr"
      :size="drawerSize"
      :show-close="false"
      class="player-drawer-panel"
  >
    <!-- Header: 切换页签 + 关闭按钮 -->
    <template #header="{ close }">
      <div class="drawer-header-wrapper">
        <el-segmented
            :model-value="activeTab"
            @update:model-value="$emit('update:activeTab', $event)"
            :options="[
            { label: '🎶 播放列表', value: 'playlist' },
            { label: '🔍 搜索发现', value: 'search' }
          ]"
            class="header-segmented"
        />
        <el-button link class="drawer-close-btn" @click="close">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </template>

    <!-- 主体内容区域 -->
    <div class="drawer-body-container">
      <!-- 1. 当前播放列表 Tab -->
      <div v-show="activeTab === 'playlist'" class="tab-pane">
        <div class="pane-action-bar">
          <span class="count-badge">共 {{ songList.length }} 首歌曲</span>
          <el-button
              v-if="songList.length"
              type="danger"
              link
              size="small"
              class="clear-btn"
              @click="$emit('clear-playlist')"
          >
            <el-icon><Delete /></el-icon>
            清空列表
          </el-button>
        </div>

        <el-scrollbar v-if="songList.length" class="scroll-area">
          <TransitionGroup name="stagger-list" tag="div" class="song-list-group">
            <div
                v-for="(item, index) in songList"
                :key="item.id || index"
                :class="['track-card', { 'is-playing': currentIndex === index }]"
                @click="$emit('select-track', index)"
            >
              <!-- 序号 / 声波动画 -->
              <div class="track-status">
                <div v-if="currentIndex === index && isPlaying" class="equalizer-waves">
                  <span /><span /><span /><span />
                </div>
                <span v-else class="track-number">{{ (index + 1).toString().padStart(2, '0') }}</span>
              </div>

              <!-- 歌曲元信息 -->
              <div class="track-info">
                <span class="track-title">{{ item.name }}</span>
                <span class="track-artist">{{ item.artist }}</span>
              </div>

              <!-- 操作区 -->
              <div class="track-actions" @click.stop>
                <el-button link class="action-btn" @click="$emit('download', item)">
                  <el-icon><Download /></el-icon>
                </el-button>
                <el-button link class="action-btn delete" @click="$emit('remove', index)">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </div>
          </TransitionGroup>
        </el-scrollbar>

        <el-empty v-else description="暂无播放歌曲" class="empty-state">
          <template #image>
            <div class="empty-icon-box">
              <el-icon><Headset /></el-icon>
            </div>
          </template>
        </el-empty>
      </div>

      <!-- 2. 搜索与推荐 Tab -->
      <div v-show="activeTab === 'search'" class="tab-pane">
        <div class="search-box-wrapper">
          <el-input
              :model-value="searchKeyword"
              @update:model-value="$emit('update:searchKeyword', $event)"
              placeholder="搜索歌曲、歌手..."
              clearable
              class="search-input"
              @keyup.enter="$emit('search')"
          >
            <template #suffix>
              <el-icon class="search-trigger" :class="{ 'is-loading': searching }" @click="$emit('search')">
                <Loading v-if="searching" />
                <Search v-else />
              </el-icon>
            </template>
          </el-input>
        </div>

        <el-scrollbar class="scroll-area">
          <!-- 搜索结果列表 -->
          <div v-if="searchResults.length" class="section-container">
            <div class="pane-action-bar">
              <span class="section-heading">搜索结果</span>
              <el-button type="primary" link size="small" @click="$emit('add-all')">
                全部播放
              </el-button>
            </div>

            <div class="search-result-list">
              <div
                  v-for="item in searchResults"
                  :key="item.id"
                  class="search-item-card"
                  @click="$emit('add-and-play', item)"
              >
                <img :src="item.coverUrl" class="cover-img" loading="lazy" alt="cover" />
                <div class="track-info">
                  <span class="track-title">{{ item.name }}</span>
                  <span class="track-artist">{{ item.artist }}</span>
                </div>
                <div class="track-actions" @click.stop>
                  <el-button circle class="add-btn" @click="$emit('add-only', item)">
                    <el-icon><Plus /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 推荐列表 -->
          <div v-if="recentPlayed?.length" class="section-container recommend-section">
            <h4 class="section-heading">✨ 猜你喜欢</h4>
            <div class="recommend-grid">
              <div
                  v-for="item in recentPlayed"
                  :key="item.id"
                  class="recommend-card"
                  @click="$emit('add-and-play', item)"
              >
                <img :src="item.coverUrl" class="rec-cover" loading="lazy" alt="cover" />
                <div class="rec-details">
                  <span class="rec-title">{{ item.name }}</span>
                  <span class="rec-artist">{{ item.artist }}</span>
                </div>
                <el-button
                    circle
                    size="small"
                    class="rec-add-btn"
                    @click.stop="$emit('add-only', item)"
                >
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Close, Download, Delete, Search, Loading, Headset, Plus } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: Boolean,
  activeTab: { type: String, default: 'playlist' },
  songList: { type: Array, default: () => [] },
  currentIndex: { type: Number, default: -1 },
  isPlaying: { type: Boolean, default: false },
  searchKeyword: { type: String, default: '' },
  searching: { type: Boolean, default: false },
  searchResults: { type: Array, default: () => [] },
  recentPlayed: { type: Array, default: () => [] }
})

defineEmits([
  'update:modelValue',
  'update:activeTab',
  'update:searchKeyword',
  'select-track',
  'clear-playlist',
  'download',
  'remove',
  'search',
  'add-all',
  'add-only',
  'add-and-play'
])

// 响应式宽度调整
const windowWidth = ref(window.innerWidth)
const handleResize = () => { windowWidth.value = window.innerWidth }

onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))

const drawerSize = computed(() => {
  return windowWidth.value > 768 ? '400px' : '88%'
})
</script>

<style>
/* ==========================================================================
   全局变量与 Teleport Drawer 全局覆盖
   ========================================================================= */
.player-drawer-panel.el-drawer {
  --drawer-accent: #ff4d7d;
  --drawer-bg-rgb: 18, 19, 26;

  background-color: rgba(var(--drawer-bg-rgb), 0.88) !important;
  backdrop-filter: blur(32px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(180%) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 24px 0 48px rgba(0, 0, 0, 0.5) !important;
}

.player-drawer-panel .el-drawer__header {
  margin-bottom: 0 !important;
  padding: 16px 20px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  background: transparent !important;
}

.player-drawer-panel .el-drawer__body {
  padding: 0 !important;
  background: transparent !important;
  overflow: hidden;
}
</style>

<style scoped>
/* ==========================================================================
   局部布局与组件样式
   ========================================================================= */
.drawer-header-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}


.header-segmented {
  --el-segmented-bg-color: rgba(255, 255, 255, 0.05);
  --el-segmented-item-selected-bg-color: linear-gradient(135deg, #ff4d7d 0%, #c92c63 100%);
  --el-segmented-item-selected-color: #ffffff;
  --el-segmented-item-color: rgba(255, 255, 255, 0.6);
  --el-border-radius-base: 50px
}

.drawer-close-btn {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.2s;
}
.drawer-close-btn:hover { color: #ffffff; }

/* 容器布局 */
.drawer-body-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
}

.pane-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px 12px 4px;
}

.count-badge, .section-heading {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.5px;
}

.clear-btn {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}
.clear-btn:hover { color: #ff4d4d; }

.scroll-area {
  flex: 1;
  padding-right: 4px;
}

/* 歌曲卡片 */
.song-list-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.track-card {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.track-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}

.track-card.is-playing {
  background: rgba(255, 77, 125, 0.12);
  border-color: rgba(255, 77, 125, 0.25);
}

/* 状态与序号 */
.track-status {
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-number {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.35);
  font-family: monospace;
}

/* 动态波浪动画 */
.equalizer-waves {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.equalizer-waves span {
  width: 2px;
  background-color: var(--drawer-accent);
  border-radius: 1px;
  animation: equalize 1s infinite ease-in-out alternate;
}

.equalizer-waves span:nth-child(1) { height: 60%; animation-delay: -0.4s; }
.equalizer-waves span:nth-child(2) { height: 100%; animation-delay: -0.2s; }
.equalizer-waves span:nth-child(3) { height: 40%; animation-delay: -0.6s; }
.equalizer-waves span:nth-child(4) { height: 80%; animation-delay: -0.1s; }

@keyframes equalize {
  0% { height: 20%; }
  100% { height: 100%; }
}

/* 歌曲元数据 */
.track-info {
  flex: 1;
  min-width: 0;
  margin: 0 12px;
  display: flex;
  flex-direction: column;
}

.track-title {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 操作按键 */
.track-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.track-card:hover .track-actions { opacity: 1; }

.action-btn {
  color: rgba(255, 255, 255, 0.7);
  padding: 4px;
}
.action-btn:hover { color: #ffffff; }
.action-btn.delete:hover { color: #ff4d4d; }

/* 空状态 */
.empty-state {
  margin-top: 60px;
}
.empty-icon-box {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: rgba(255, 255, 255, 0.2);
}

/* 搜索框 */
.search-box-wrapper { margin-bottom: 16px; }

.search-input :deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.06) !important;
  box-shadow: none !important;
  border-radius: 12px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.search-input :deep(.el-input__inner) {
  color: #ffffff;
}

.search-trigger {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
}
.search-trigger:hover { color: #ffffff; }

.cover-img {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  object-fit: cover;
}

/* 搜索结果项 */
.search-item-card {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 10px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: background 0.2s;
}
.search-item-card:hover { background: rgba(255, 255, 255, 0.08); }

.add-btn {
  background: rgba(255, 255, 255, 0.08) !important;
  border: none !important;
  color: #ffffff !important;
}
.add-btn:hover { background: var(--drawer-accent) !important; }

/* 推荐板块 */
.recommend-section { margin-top: 20px; }

.recommend-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.recommend-card {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: background 0.2s;
}
.recommend-card:hover { background: rgba(255, 255, 255, 0.08); }

.rec-cover {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  object-fit: cover;
}

.rec-details {
  flex: 1;
  margin: 0 10px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rec-title {
  font-size: 13px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rec-artist {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.rec-add-btn {
  background: transparent !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: rgba(255, 255, 255, 0.6) !important;
}
.rec-add-btn:hover {
  background: #ffffff !important;
  color: #000000 !important;
}

/* 动画过度效果 */
.stagger-list-enter-active,
.stagger-list-leave-active {
  transition: all 0.3s cubic-bezier(0.55, 0, 0.1, 1);
}

.stagger-list-enter-from,
.stagger-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.stagger-list-move {
  transition: transform 0.3s ease;
}
</style>