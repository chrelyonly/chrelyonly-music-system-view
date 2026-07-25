<!-- components/music/PlaylistPanel.vue -->
<template>
  <section :class="['glass-card', 'list-panel', { 'mobile-open': isOpen }]">
    <div class="mobile-drawer-handle" @click="$emit('close')">✕ 关闭</div>

    <!-- Tab 1: 播放列表 -->
    <div v-show="activeTab === 'playlist'" class="tab-content">
      <div class="list-header">
        <h3 class="section-title">当前播放列表 ({{ songList.length }}/1000)</h3>
        <el-button
            v-if="songList.length > 0"
            type="danger"
            link
            size="small"
            @click="$emit('clear-playlist')"
        >
          清空列表
        </el-button>
      </div>

      <div class="scroll-list-wrapper" v-if="songList.length > 0">
        <div class="song-list">
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
              <button class="action-btn" title="下载" @click="$emit('download', item)">📥</button>
              <button class="action-btn" title="移出列表" @click="$emit('remove', index)">✕</button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-holder">
        <span>🎵 播放列表为空，快去搜索添加歌曲吧~</span>
      </div>
    </div>

    <!-- Tab 2: 搜索与推荐页 -->
    <div v-show="activeTab === 'search'" class="tab-content">
      <div class="search-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
              v-model="searchKeyword"
              placeholder="搜索歌曲或歌手..."
              @keyup.enter="handleSearch"
              class="search-input"
          />
        </div>
        <el-button
            type="primary"
            :loading="searching"
            :disabled="searching || !searchKeyword.trim()"
            @click="handleSearch"
            class="glow-btn"
        >
          搜索
        </el-button>
      </div>

      <div class="panel-scroll-content">
        <!-- 搜索结果区 -->
        <div v-if="searchResults.length > 0" class="search-results-section">
          <div class="list-header">
            <h3 class="section-title">🔍 搜索结果</h3>
            <el-button type="primary" link size="small" @click="$emit('add-all', searchResults)">
              + 全部加入列表
            </el-button>
          </div>
          <div class="song-list">
            <div
                v-for="item in searchResults"
                :key="item.id"
                class="song-item"
                @click="$emit('play-now', item)"
            >
              <img :src="item.coverUrl" class="res-cover" alt="cover" />
              <div class="song-meta">
                <span class="song-name">{{ item.name }}</span>
                <span class="song-artist">{{ item.artist }}</span>
              </div>

              <div class="item-actions" @click.stop>
                <button
                    class="action-btn add-btn"
                    title="添加到播放列表"
                    @click="$emit('add-only', item)"
                >
                  ➕
                </button>
                <button
                    class="action-btn play-now-btn"
                    title="立即播放"
                    @click="$emit('play-now', item)"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
          <div class="divider"></div>
        </div>

        <!-- 猜你喜欢 -->
        <div class="recommend-block">
          <h3 class="section-title">✨ 猜你喜欢</h3>
          <div class="recommend-cards">
            <div
                v-for="item in recentPlayed"
                :key="item.id"
                class="rec-card"
                @click="$emit('play-now', item)"
            >
              <img :src="item.coverUrl" class="rec-cover" alt="cover" />
              <div class="rec-info">
                <span class="rec-name">{{ item.name }}</span>
                <span class="rec-artist">{{ item.artist }}</span>
              </div>
              <button class="add-circle-btn" title="加到列表" @click.stop="$emit('add-only', item)">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { searchMusic } from '@/api/music/music.js'

const props = defineProps({
  isOpen: Boolean,
  activeTab: String,
  songList: Array,
  currentIndex: Number,
  isPlaying: Boolean,
  recentPlayed: Array
})

const emit = defineEmits([
  'close', 'select-track', 'download', 'remove',
  'clear-playlist', 'add-only', 'play-now', 'add-all'
])

const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref([])

const extractRecords = (res) => {
  const data = res?.data?.data || res?.data || res
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.records)) return data.records
  return []
}

const handleSearch = async () => {
  if (!searchKeyword.value.trim() || searching.value) return
  searching.value = true
  try {
    const res = await searchMusic(searchKeyword.value)
    searchResults.value = extractRecords(res)
    if (searchResults.value.length === 0) ElMessage.warning('未找到相关歌曲')
  } catch (error) {
    ElMessage.error('搜索请求失败')
  } finally {
    searching.value = false
  }
}
</script>