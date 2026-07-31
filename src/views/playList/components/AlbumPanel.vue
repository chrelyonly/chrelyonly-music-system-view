<template>
  <aside class="album-panel">
    <!-- 播放中的唱片状态 -->
    <div v-if="track" class="album-card">
      <div :class="['vinyl-wrapper', { 'is-playing': isPlaying }]">
        <!-- 唱针动效 -->
        <div class="tonearm"></div>

        <!-- 黑胶唱片本体 -->
        <div class="vinyl-disc">
          <div class="disc-rings"></div>
          <img :src="track.coverUrl" class="cover-img" alt="封面" loading="lazy" />
        </div>
      </div>

      <!-- 歌曲文字信息 -->
      <div class="track-info" :key="track.id">
        <h2 class="track-title" :title="track.name">{{ track.name }}</h2>
        <p class="track-artist">{{ track.artist }}</p>
      </div>
    </div>

    <!-- 未播放时的占位状态 -->
    <div v-else class="album-card empty-card">
      <div class="vinyl-wrapper empty-vinyl">
        <div class="vinyl-disc">
          <div class="empty-cover">🎵</div>
        </div>
      </div>
      <div class="track-info">
        <h2 class="track-title">未在播放</h2>
        <p class="track-artist">请从列表选择歌曲</p>
      </div>
    </div>
  </aside>
</template>

<script setup>
/**
 * AlbumPanel.vue - 唱片展示组件
 *
 * 职责：
 * 1. 渲染黑胶唱片旋转动画
 * 2. 处理唱针根据播放状态的平滑摆动
 * 3. 展示歌曲封面与基本信息
 */
defineProps({
  track: {
    type: Object,
    default: null
  },
  isPlaying: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
/* ==========================================================================
   1. 布局与 3D 透视
   ========================================================================= */
.album-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  perspective: 1200px; /* 增加透视感 */
}

.album-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vinyl-wrapper {
  position: relative;
  width: clamp(240px, 48vw, 320px);
  height: clamp(240px, 48vw, 320px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

/* ==========================================================================
   2. 唱针 (Tonearm) 动效
   ========================================================================= */
.tonearm {
  position: absolute;
  top: -20px;
  right: 22%;
  width: 36px;
  height: 80px;
  border-right: 4px solid rgba(255, 255, 255, 0.8);
  border-top: 4px solid rgba(255, 255, 255, 0.8);
  border-top-right-radius: 18px;
  z-index: 12;
  transform-origin: 100% 0;
  transform: rotate(-30deg);
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6));
}

/* 播放时唱针落到唱片上 */
.vinyl-wrapper.is-playing .tonearm {
  transform: rotate(-2deg);
}

/* 播放时的外围光晕 */
.vinyl-wrapper::before {
  content: '';
  position: absolute;
  inset: -15px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 77, 125, 0.2) 0%, transparent 75%);
  opacity: 0;
  transition: opacity 1s ease;
  pointer-events: none;
}

.vinyl-wrapper.is-playing::before {
  opacity: 1;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(0.96); opacity: 0.4; }
  50% { transform: scale(1.04); opacity: 0.7; }
}

/* ==========================================================================
   3. 黑胶唱片 (Vinyl Disc) 样式
   ========================================================================= */
.vinyl-disc {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, #15151a 18%, #2a2a30 20%, #1c1c22 22%, #222228 78%, #08080a 100%);
  box-shadow:
    0 25px 50px rgba(0, 0, 0, 0.8),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 25s linear infinite;
  animation-play-state: paused;
  transition: box-shadow 0.8s ease;
}

/* 播放时开启旋转动画 */
.vinyl-wrapper.is-playing .vinyl-disc {
  animation-play-state: running;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 77, 125, 0.12);
}

/* 模拟唱片纹路 */
.disc-rings {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: repeating-radial-gradient(circle at center, transparent 0, transparent 6px, rgba(255, 255, 255, 0.02) 7px, transparent 8px);
}

.cover-img {
  width: 55%;
  height: 55%;
  border-radius: 50%;
  object-fit: cover;
  border: 5px solid #000;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.8);
  z-index: 2;
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ==========================================================================
   4. 歌曲文字信息
   ========================================================================= */
.track-info {
  margin-top: 24px;
  text-align: center;
  max-width: 85vw;
}

.track-title {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

/* ==========================================================================
   5. PC 端细节调整
   ========================================================================= */
@media (min-width: 769px) {
  .vinyl-wrapper { width: 340px; height: 340px; }
  .track-title { font-size: 28px; }
}
</style>
