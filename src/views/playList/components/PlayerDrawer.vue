<template>
  <el-drawer
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      direction="ltr"
      size="85%"
      :show-close="true"
      class="custom-drawer"
  >
    <template #header>
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

    <!-- 列表页 -->
    <div v-show="activeTab === 'playlist'" class="drawer-tab-content">
      <div class="list-header">
        <span>当前播放列表 ({{ songList.length }}/1000)</span>
        <el-button v-if="songList.length" type="danger" link size="small" @click="$emit('clear-playlist')">
          清空列表
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
              <el-button link icon="Download" @click="$emit('download', item)" title="下载" />
              <el-button link icon="Close" @click="$emit('remove', index)" title="移除" />
            </div>
          </div>
        </transition-group>
      </el-scrollbar>
      <el-empty v-else description="列表为空，快去搜索添加吧~" :image-size="80" />
    </div>

    <!-- 搜索页 -->
    <div v-show="activeTab === 'search'" class="drawer-tab-content">
      <div class="search-bar">
        <el-input
            :model-value="searchKeyword"
            @update:model-value="$emit('update:searchKeyword', $event)"
            placeholder="搜索歌曲或歌手..."
            clearable
            @keyup.enter="$emit('search')"
        >
          <template #append>
            <el-button icon="Search" :loading="searching" class="search-submit-btn" @click="$emit('search')" />
          </template>
        </el-input>
      </div>

      <el-scrollbar class="panel-scroll-content">
        <div v-if="searchResults.length" class="search-results">
          <div class="list-header">
            <span>搜索结果</span>
            <el-button type="primary" link size="small" class="accent-link-btn" @click="$emit('add-all')">
              + 全部加入
            </el-button>
          </div>
          <div
              v-for="item in searchResults"
              :key="item.id"
              class="song-item"
              @click="$emit('add-and-play', item)"
          >
            <img :src="item.coverUrl" class="res-cover" alt="cover" />
            <div class="song-meta">
              <span class="song-name">{{ item.name }}</span>
              <span class="song-artist">{{ item.artist }}</span>
            </div>
            <div class="item-actions" @click.stop>
              <el-button link icon="Plus" title="添加到列表" @click="$emit('add-only', item)" />
              <el-button link icon="VideoPlay" title="立即播放" @click="$emit('add-and-play', item)" />
            </div>
          </div>
        </div>

        <!-- 推荐列表 -->
        <div class="recommend-block">
          <h4 class="section-title">✨ 猜你喜欢</h4>
          <div
              v-for="item in recentPlayed"
              :key="item.id"
              class="rec-card"
              @click="$emit('add-and-play', item)"
          >
            <img :src="item.coverUrl" class="rec-cover" alt="rec-cover" />
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
defineProps({
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
</script>

<style>
/* 全局样式：处理 Teleport 后的 Drawer 背景 */
.custom-drawer {
  --el-drawer-bg-color: rgba(18, 19, 28, 0.96) !important;
  background-color: var(--el-drawer-bg-color) !important;
  backdrop-filter: blur(40px) saturate(1.5) !important;
  -webkit-backdrop-filter: blur(40px) saturate(1.5) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 20px 0 60px rgba(0, 0, 0, 0.8) !important;
  color: #ffffff !important;
}

.custom-drawer .el-drawer__content {
  background: transparent !important;
}

.custom-drawer .el-drawer__header {
  margin-bottom: 0 !important;
  padding: 18px 24px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  background: transparent !important;
  color: #ffffff !important;
}

.custom-drawer .el-drawer__body {
  padding: 20px !important;
  overflow: hidden !important;
  background: transparent !important;
}

.custom-drawer .el-drawer__close-btn .el-icon {
  color: #ffffff !important;
  font-size: 20px;
}

/* 遮罩层样式 */
.el-overlay {
  background-color: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(4px);
}

.drawer-tab-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-scroll-content {
  flex: 1;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.song-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 10px 14px;
  margin-bottom: 8px;
  border-radius: 12px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.song-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateX(4px);
}

.song-item.playing {
  background: rgba(255, 77, 125, 0.12);
  border-color: rgba(255, 77, 125, 0.3);
}

.song-item.playing::before {
  content: '';
  position: absolute;
  left: 0;
  top: 15%;
  bottom: 15%;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: linear-gradient(180deg, #ff8fb3, #ff4d7d);
}

.song-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 14px;
  overflow: hidden;
}

.song-name {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 4px;
}

.search-bar {
  margin-bottom: 20px;
}

.search-bar .el-input__wrapper {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: none !important;
  border-radius: 12px 0 0 12px;
}

.search-bar .el-input-group__append {
  background-color: rgba(255, 77, 125, 0.3) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-left: none !important;
  border-radius: 0 12px 12px 0;
}

.res-cover, .rec-cover {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  object-fit: cover;
}

.recommend-block {
  margin-top: 24px;
}

.section-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 16px;
  font-weight: 600;
}

.rec-card {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
}

.rec-card:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
}

.playing-waves {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  height: 14px;
}

.playing-waves i {
  width: 2px;
  height: 100%;
  background-color: #ff4d7d;
  animation: wave 1.2s infinite ease-in-out;
}
@keyframes wave {
  0%, 100% { height: 4px; }
  50% { height: 14px; }
}
</style>

<style scoped>
/* 列表动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@media (min-width: 769px) {
  :deep(.custom-drawer) {
    width: 420px !important;
  }
}
</style>
