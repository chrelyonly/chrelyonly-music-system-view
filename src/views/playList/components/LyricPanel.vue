<template>
  <section class="lyrics-panel">
    <!-- 歌词主容器 -->
    <div
        class="lyrics-container"
        ref="lyricsContainerRef"
        @touchstart="handleUserInteraction"
        @wheel="handleUserInteraction"
    >
      <!-- 列表存在时的滚动区域 -->
      <div v-if="lyrics.length > 0" class="lyrics-scroll">
        <p
            v-for="(line, idx) in lyrics"
            :key="idx"
            :ref="el => setLineRef(el, idx)"
            :class="['lyric-line', { active: currentIndex === idx }]"
            @click="$emit('select', idx)"
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
 * LyricPanel.vue - 动态歌词展示组件 (优化重构版)
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

defineEmits(['select'])

const lyricsContainerRef = ref(null)
const lineRefs = ref([])
const isUserInteracting = ref(false)

let animationFrameId = null
let userInteractionTimer = null

// 收集每行歌词的 DOM 节点
const setLineRef = (el, idx) => {
  if (el) {
    lineRefs.value[idx] = el
  }
}

/**
 * 用户手动滚动时，短暂停止自动吸附，提升交互体验
 */
const handleUserInteraction = () => {
  isUserInteracting.value = true
  if (userInteractionTimer) clearTimeout(userInteractionTimer)

  // 用户停止操作 3 秒后恢复自动跟随
  userInteractionTimer = setTimeout(() => {
    isUserInteracting.value = false
  }, 3000)
}

/**
 * 核心滚动算法：精准计算居中位置
 */
const scrollLyric = () => {
  if (isUserInteracting.value) return

  const container = lyricsContainerRef.value
  const activeEl = lineRefs.value[props.currentIndex]

  if (container && activeEl) {
    const containerHeight = container.clientHeight
    const elOffsetTop = activeEl.offsetTop
    const elHeight = activeEl.offsetHeight

    // 计算居中滚动目标点
    const targetScrollTop = elOffsetTop - (containerHeight / 2) + (elHeight / 2)

    // 使用 requestAnimationFrame 平滑平移
    if (animationFrameId) cancelAnimationFrame(animationFrameId)

    animationFrameId = requestAnimationFrame(() => {
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: props.currentIndex <= 0 ? 'auto' : 'smooth'
      })
    })
  }
}

// 监听播放索引变更
watch(
    () => props.currentIndex,
    () => {
      nextTick(() => {
        scrollLyric()
      })
    },
    { flush: 'post', immediate: true }
)

// 监听歌词列表重置
watch(
    () => props.lyrics,
    () => {
      lineRefs.value = []
      nextTick(() => {
        if (lyricsContainerRef.value) {
          lyricsContainerRef.value.scrollTop = 0
        }
      })
    },
    { deep: true }
)

// 处理 Resize
const handleResize = () => {
  scrollLyric()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (userInteractionTimer) clearTimeout(userInteractionTimer)
})
</script>

<style scoped>
/* ==========================================================================
   1. 歌词面板与容器布局
   ========================================================================= */
.lyrics-panel {
  width: 100%;
  height: 100%;
  max-height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.lyrics-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  text-align: center;
  /* 更平滑的上下遮罩 */
  mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(0,0,0,1) 20%,
      rgba(0,0,0,1) 80%,
      transparent 100%
  );
  -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(0,0,0,1) 20%,
      rgba(0,0,0,1) 80%,
      transparent 100%
  );
  /* 隐藏滚动条 */
  scrollbar-width: none;
}

.lyrics-container::-webkit-scrollbar {
  display: none;
}

.lyrics-scroll {
  /* 动态留白：根据容器高度自动缩放留白，保证首尾行可居中且不被遮罩完全吞掉 */
  padding-top: 50%;
  padding-bottom: 50%;
  box-sizing: border-box;
  min-height: 100%;
}

/* ==========================================================================
   2. 歌词行样式与高亮动效
   ========================================================================= */
.lyric-line {
  font-size: 16px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.4);
  margin: 14px 0;
  padding: 0 24px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1),
  opacity 0.4s ease,
  color 0.4s ease;
  will-change: transform, opacity;
  opacity: 0.7;
}

.lyric-line:hover {
  color: rgba(255, 255, 255, 0.7);
}

/* 活跃高亮行 */
.lyric-line.active {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  opacity: 1;
  transform: scale(1.06);
  /* 渐变文字 */
  background: linear-gradient(135deg, #ffffff 0%, #ffb3c6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 10px rgba(255, 128, 171, 0.2);
}

/* ==========================================================================
   3. 无歌词占位
   ========================================================================= */
.no-lyric {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  gap: 12px;
}

.disc-icon {
  font-size: 40px;
  animation: rotate-slow 16s linear infinite;
}

@keyframes rotate-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ==========================================================================
   4. 响应式适配 (桌面端)
   ========================================================================= */
@media (min-width: 769px) {
  .lyrics-panel {
    max-height: 60vh;
  }
  .lyric-line {
    font-size: 18px;
    margin: 18px 0;
  }
  .lyric-line.active {
    font-size: 24px;
  }
}
</style>