<template>
  <!--
    Teleport 警告：Element Plus Drawer 默认挂载到 body。
    因此部分样式需要写在非 scoped 的 style 块中才能穿透生效。
  -->
  <el-drawer
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      direction="ltr"
      :size="drawerSize"
      :show-close="true"
      class="custom-drawer"
  >
    <template #header>
      <!-- 分段选择器：切换列表与搜索 -->
      <el-segmented
          :model-value="activeTab"
          @update:model-value="$emit('update:activeTab', $event)"
          :options="[
          { label: '播放列表', value: 'playlist' },
          { label: '搜索发现', value: 'search' }
        ]"
          class="drawer-segmented"
      />
    </template>

    <!-- 1. 当前播放列表内容 -->
    <div v-show="activeTab === 'playlist'" class="drawer-tab-content">
      <div class="list-header">
        <span>当前播放 ({{ songList.length }})</span>
        <el-button v-if="songList.length" type="danger" link size="small" @click="$emit('clear-playlist')">
          清空
        </el-button>
      </div>

      <el-scrollbar v-if="songList.length" class="panel-scroll-content">
        <transition-group name="list" tag="div">
          <div
              v-for="(item, index) in songList"
              :key="item.id || index"
              :class="['song-item', { playing: currentIndex === index }]"
              @click="$emit('select-track', index)"
          >
            <span class="song-index">
              <!-- 正在播放时的动态波浪动画 -->
              <span v-if="currentIndex === index && isPlaying" class="playing-waves">
                <i></i><i></i><i></i>
              </span>
              <template v-else>{{ (index + 1).toString().padStart(2, '0') }}</template>
            </span>
            <div class="song-meta">
              <span class="song-name">{{ item.name }}</span>
              <span class="song-artist">{{ item.artist }}</span>
            </div>
            <div class="item-actions" @click.stop>
              <el-button link icon="Download" @click="$emit('download', item)" />
              <el-button link icon="Close" @click="$emit('remove', index)" />
            </div>
          </div>
        </transition-group>
      </el-scrollbar>
      <el-empty v-else description="列表空空如也" :image-size="60" />
    </div>

    <!-- 2. 搜索与发现内容 -->
    <div v-show="activeTab === 'search'" class="drawer-tab-content">
      <div class="search-bar">
        <el-input
            :model-value="searchKeyword"
            @update:model-value="$emit('update:searchKeyword', $event)"
            placeholder="搜索歌曲..."
            clearable
            @keyup.enter="$emit('search')"
        >
          <template #append>
            <el-button icon="Search" :loading="searching" @click="$emit('search')" />
          </template>
        </el-input>
      </div>

      <el-scrollbar class="panel-scroll-content">
        <!-- 搜索结果展示 -->
        <div v-if="searchResults.length" class="search-results">
          <div class="list-header">
            <span>搜索结果</span>
            <el-button type="primary" link size="small" @click="$emit('add-all')">全部加入</el-button>
          </div>
          <div
              v-for="item in searchResults"
              :key="item.id"
              class="song-item"
              @click="$emit('add-and-play', item)"
          >
            <img :src="item.coverUrl" class="res-cover" loading="lazy" />
            <div class="song-meta">
              <span class="song-name">{{ item.name }}</span>
              <span class="song-artist">{{ item.artist }}</span>
            </div>
            <div class="item-actions" @click.stop>
              <el-button link icon="Plus" @click="$emit('add-only', item)" />
            </div>
          </div>
        </div>

        <!-- 猜你喜欢：推荐列表 -->
        <div class="recommend-block">
          <h4 class="section-title">✨ 猜你喜欢</h4>
          <div
              v-for="item in recentPlayed"
              :key="item.id"
              class="rec-card"
              @click="$emit('add-and-play', item)"
          >
            <img :src="item.coverUrl" class="rec-cover" loading="lazy" />
            <div class="rec-info">
              <span class="rec-name">{{ item.name }}</span>
              <span class="rec-artist">{{ item.artist }}</span>
            </div>
            <el-button
                circle
                size="small"
                icon="Plus"
                class="accent-add-btn"
                @click.stop="$emit('add-only', item)"
            />
          </div>
        </div>
      </el-scrollbar>
    </div>
  </el-drawer>
</template>

<script setup>
/**
 * PlayerDrawer.vue - 侧边抽屉面板
 *
 * 职责：
 * 1. 列表展示与操作
 * 2. 音乐搜索与结果处理
 * 3. 响应式尺寸适配 (PC 端窄侧边栏)
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  activeTab: String,
  songList: Array,
  currentIndex: Number,
  isPlaying: Boolean,
  searchKeyword: String,
  searching: Boolean,
  searchResults: Array,
  recentPlayed: Array
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

// --- 响应式处理抽屉尺寸 ---
const windowWidth = ref(window.innerWidth)
const updateWidth = () => { windowWidth.value = window.innerWidth }

onMounted(() => window.addEventListener('resize', updateWidth))
onUnmounted(() => window.removeEventListener('resize', updateWidth))

/**
 * 计算抽屉宽度：PC 端固定 380px，移动端使用 85%
 */
const drawerSize = computed(() => {
  return windowWidth.value > 768 ? '380px' : '85%'
})
</script>

<style>
/* ==========================================================================
   全局样式 (处理 Teleport 后的 Drawer)
   ========================================================================= */
.custom-drawer {
  --el-drawer-bg-color: rgba(18, 19, 28, 0.96) !important;
  background-color: var(--el-drawer-bg-color) !important;
  backdrop-filter: blur(40px) saturate(1.5) !important;
  -webkit-backdrop-filter: blur(40px) saturate(1.5) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 20px 0 60px rgba(0, 0, 0, 0.8) !important;
  color: #ffffff !important;
}

/* 确保内部容器透明，显示毛玻璃底色 */
.custom-drawer .el-drawer__content,
.custom-drawer .el-drawer__header,
.custom-drawer .el-drawer__body {
  background: transparent !important;
  color: #ffffff !important;
}

.custom-drawer .el-drawer__header {
  margin-bottom: 0 !important;
  padding: 18px 24px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.custom-drawer .el-drawer__close-btn .el-icon {
  color: #ffffff !important;
  font-size: 20px;
}

/* 遮罩层深度美化 */
.el-overlay {
  background-color: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(4px);
}

/* 针对 PC 端的强制宽度覆盖 */
@media (min-width: 769px) {
  .custom-drawer { width: 380px !important; }
}
</style>

<style scoped>
/* ==========================================================================
   局部业务样式
   ========================================================================= */
.drawer-tab-content { display: flex; flex-direction: column; height: 100%; }
.panel-scroll-content { flex: 1; }

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

/* 歌曲项通用样式 */
.song-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 8px;
  border-radius: 12px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.3s ease;
}

.song-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}

.song-item.playing {
  background: rgba(255, 77, 125, 0.12);
  border-color: rgba(255, 77, 125, 0.3);
}

.song-meta { flex: 1; margin: 0 14px; overflow: hidden; }
.song-name { font-size: 15px; font-weight: 600; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.song-artist { font-size: 12px; color: rgba(255, 255, 255, 0.45); margin-top: 4px; }

/* 搜索条自定义 */
.search-bar { margin-bottom: 20px; }
.search-bar :deep(.el-input__wrapper) { background-color: rgba(255, 255, 255, 0.06) !important; box-shadow: none !important; border-radius: 12px 0 0 12px; }
.search-bar :deep(.el-input-group__append) { background-color: rgba(255, 77, 125, 0.25) !important; border: none; border-radius: 0 12px 12px 0; }

.res-cover, .rec-cover { width: 46px; height: 46px; border-radius: 10px; object-fit: cover; }

/* 推荐板块 */
.recommend-block { margin-top: 24px; }
.section-title { font-size: 14px; color: rgba(255, 255, 255, 0.6); margin-bottom: 16px; font-weight: 600; }

.rec-card {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.04);
  transition: all 0.3s ease;
}

.rec-card:hover { background: rgba(255, 255, 255, 0.1); transform: translateY(-2px); }

/* 正在播放动画 */
.playing-waves { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; }
.playing-waves i { width: 2px; height: 100%; background-color: #ff4d7d; animation: wave 1.2s infinite ease-in-out; }
.playing-waves i:nth-child(2) { animation-delay: 0.2s; }
.playing-waves i:nth-child(3) { animation-delay: 0.4s; }

@keyframes wave { 0%, 100% { height: 4px; } 50% { height: 12px; } }

/* 列表进入/离开动画 */
.list-enter-active, .list-leave-active { transition: all 0.4s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(20px); }
</style>
