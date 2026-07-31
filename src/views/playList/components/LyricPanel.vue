<template>
  <section class="lyrics-panel">
    <div class="lyrics-container" ref="lyricsContainerRef">
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
      <div v-else class="no-lyric">
        <span class="disc-icon">🎵</span>
        <p>暂无歌词或纯音乐作品</p>
      </div>
    </div>
  </section>
</template>

<script setup>
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
 * 核心滚动逻辑：确保当前行处于容器垂直中心
 */
const scrollLyric = () => {
  if (currentLyricEl.value && lyricsContainerRef.value) {
    const container = lyricsContainerRef.value
    const el = currentLyricEl.value

    // 测量容器可视高度
    const containerHeight = container.clientHeight
    // 测量歌词行相对于其 offsetParent (即 .lyrics-scroll) 的距离
    const offsetTop = el.offsetTop
    // 测量歌词行自身高度
    const lineHeight = el.clientHeight

    // 计算滚动位置：行中点需要对准容器中点
    // 公式：滚动距离 = 行顶距离 - (容器高度 / 2) + (行高 / 2)
    const scrollTarget = offsetTop - (containerHeight / 2) + (lineHeight / 2)

    container.scrollTo({
      top: scrollTarget,
      behavior: 'smooth'
    })
  }
}

// 监听索引变化触发滚动
watch(() => props.currentIndex, () => {
  nextTick(scrollLyric)
})

// 监听窗口大小变化（处理 PC 端缩放或窗口调整）
onMounted(() => {
  window.addEventListener('resize', scrollLyric)
})

onUnmounted(() => {
  window.removeEventListener('resize', scrollLyric)
})
</script>

<style scoped>
.lyrics-panel {
  width: 100%;
  flex: 1;
  max-height: 40vh;
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
  /* 渐变遮罩实现上下虚化效果 */
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
  scrollbar-width: none;
  scroll-behavior: smooth;
}

.lyrics-container::-webkit-scrollbar {
  display: none;
}

.lyrics-scroll {
  /* 关键：使用 vh 单位确保上下有足够空间滚动到中心 */
  padding: 50vh 0;
  position: relative;
}

.lyric-line {
  font-size: 16px;
  line-height: 2;
  color: rgba(255, 255, 255, 0.4);
  margin: 12px 0;
  transition: all 0.5s cubic-bezier(0.12, 0.4, 0.29, 1.46);
  padding: 0 40px;
  cursor: default;
  will-change: transform, opacity, color;
}

.lyric-line.active {
  font-size: 22px;
  background: linear-gradient(135deg, #ffffff 0%, #ffc2d6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
  transform: scale(1.1);
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
  opacity: 0.4;
  animation: rotate-slow 10s linear infinite;
}

@keyframes rotate-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (min-width: 769px) {
  .lyrics-panel {
    max-height: 65vh;
  }
  .lyric-line {
    font-size: 18px;
    margin: 24px 0;
  }
  .lyric-line.active {
    font-size: 24px;
  }
}
</style>
