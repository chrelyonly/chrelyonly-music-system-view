<template>
  <section class="lyrics-panel">
    <!-- 歌词主容器 -->
    <div class="lyrics-container" ref="lyricsContainerRef">
      <!-- 列表存在时的滚动区域 -->
      <div v-if="lyrics.length > 0" class="lyrics-scroll">
        <p
            v-for="(line, idx) in lyrics"
            :key="idx"
            :class="['lyric-line', { active: currentIndex === idx }]"
            :ref="el => { if (currentIndex === idx) currentLyricEl = el }"
        >
          {{ line.text }}
        </p>
      </div>

      <!-- 无歌词时的占位显示 -->
      <div v-else class="no-lyric">
        <span class="disc-icon">🎵</span>
        <p>暂无歌词或纯音乐作品</p>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * LyricPanel.vue - 歌词展示组件
 *
 * 核心功能：
 * 1. 动态歌词解析与渲染
 * 2. 自动跟随进度滚动，并保持当前行在垂直中心
 * 3. 响应式布局自适应 (PC/Mobile)
 */
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  lyrics: {
    type: Array,
    default: () => []
  },
  currentIndex: {
    type: Number,
    default: -1
  }
})

const lyricsContainerRef = ref(null)
const currentLyricEl = ref(null)

/**
 * 核心滚动算法：确保当前高亮行始终处于容器的垂直几何中心
 */
const scrollLyric = () => {
  if (currentLyricEl.value && lyricsContainerRef.value) {
    const container = lyricsContainerRef.value
    const el = currentLyricEl.value

    // 获取容器可视高度
    const containerHeight = container.offsetHeight
    // 获取当前行相对于滚动内容顶部的距离
    const offsetTop = el.offsetTop
    // 获取当前行自身的高度 (处理换行情况)
    const lineHeight = el.offsetHeight

    /**
     * 计算目标滚动位置 (scrollTop)
     * 公式原理：让 [行的顶部] 移动到 [容器一半] 的位置，再往回补 [半个行高]
     */
    const scrollTarget = offsetTop - (containerHeight / 2) + (lineHeight / 2)

    container.scrollTo({
      top: scrollTarget,
      behavior: props.currentIndex <= 0 ? 'auto' : 'smooth' // 第一行直接跳，后续平滑滚
    })
  }
}

/**
 * 监听播放行索引的变化
 * 使用 flush: 'post' 确保在 DOM 更新后执行滚动计算
 */
watch(() => props.currentIndex, () => {
  // 增加微小延迟，确保 active 类名的缩放动画不影响 offsetTop 测量准确性
  setTimeout(scrollLyric, 50)
}, { flush: 'post', immediate: true })

/**
 * 监听歌词列表变化 (换歌)
 * 换歌时立即重置滚动位置到顶部
 */
watch(() => props.lyrics, () => {
  nextTick(() => {
    if (lyricsContainerRef.value) {
      lyricsContainerRef.value.scrollTop = 0
    }
  })
}, { deep: true })

/**
 * 窗口尺寸变化监听 (处理 PC 端缩放导致的中点偏移)
 */
onMounted(() => window.addEventListener('resize', scrollLyric))
onUnmounted(() => window.removeEventListener('resize', scrollLyric))
</script>

<style scoped>
/* ==========================================================================
   1. 歌词面板布局
   ========================================================================= */
.lyrics-panel {
  width: 100%;
  flex: 1;
  max-height: 42vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.5s ease;
}

.lyrics-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  text-align: center;
  /* 上下虚化渐变遮罩 */
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  scrollbar-width: none; /* 隐藏火狐滚动条 */
  scroll-behavior: smooth;
}

.lyrics-container::-webkit-scrollbar { display: none; } /* 隐藏 Chrome 滚动条 */

.lyrics-scroll {
  /* 关键：提供足够的上下内边距，让首尾行也能滚动到中心 */
  padding: 45vh 0;
  position: relative;
  min-height: 100%;
}

/* ==========================================================================
   2. 歌词行样式与动效
   ========================================================================= */
.lyric-line {
  font-size: 16px;
  line-height: 2.2;
  color: rgba(255, 255, 255, 0.38);
  margin: 10px 0;
  transition: all 0.5s cubic-bezier(0.12, 0.4, 0.29, 1.46);
  padding: 0 40px;
  cursor: default;
  will-change: transform, opacity, color;
}

/* 活跃行高亮样式 */
.lyric-line.active {
  font-size: 22px;
  background: linear-gradient(135deg, #ffffff 0%, #ffc2d6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
  transform: scale(1.08);
  opacity: 1;
  text-shadow: 0 0 15px rgba(255, 77, 125, 0.3);
}

.no-lyric {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.25);
  gap: 16px;
}

.disc-icon {
  font-size: 48px;
  opacity: 0.3;
  animation: rotate-slow 12s linear infinite;
}

@keyframes rotate-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ==========================================================================
   3. PC 端适配
   ========================================================================= */
@media (min-width: 769px) {
  .lyrics-panel { max-height: 65vh; }
  .lyric-line { font-size: 18px; margin: 18px 0; }
  .lyric-line.active { font-size: 25px; }
}
</style>
