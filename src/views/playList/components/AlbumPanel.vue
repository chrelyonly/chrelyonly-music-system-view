<template>
  <aside class="album-panel">
    <div v-if="track" class="album-card">
      <div :class="['vinyl-wrapper', { 'is-playing': isPlaying }]">
        <div class="tonearm"></div>
        <div class="vinyl-disc">
          <div class="disc-rings"></div>
          <img :src="track.coverUrl" class="cover-img" alt="封面" />
        </div>
      </div>

      <div class="track-info" :key="track.id">
        <h2 class="track-title" :title="track.name">{{ track.name }}</h2>
        <p class="track-artist">{{ track.artist }}</p>
      </div>
    </div>

    <div v-else class="album-card empty-card">
      <div class="vinyl-wrapper empty-vinyl">
        <div class="vinyl-disc">
          <div class="empty-cover">🎵</div>
        </div>
      </div>
      <div class="track-info">
        <h2 class="track-title">未在播放音乐</h2>
        <p class="track-artist">请从列表选择或搜索添加歌曲</p>
      </div>
    </div>
  </aside>
</template>

<script setup>
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
.album-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  perspective: 1000px;
}

.album-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.vinyl-wrapper {
  position: relative;
  width: clamp(230px, 46vw, 320px);
  height: clamp(230px, 46vw, 320px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 唱针设计与旋转 */
.tonearm {
  position: absolute;
  top: -24px;
  right: 22%;
  width: 38px;
  height: 80px;
  border-right: 4px solid rgba(255, 255, 255, 0.85);
  border-top: 4px solid rgba(255, 255, 255, 0.85);
  border-top-right-radius: 16px;
  z-index: 12;
  transform-origin: 100% 0;
  transform: rotate(-32deg);
  transition: transform 0.7s cubic-bezier(0.34, 1.3, 0.64, 1);
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.8));
}

.tonearm::before {
  content: '';
  position: absolute;
  top: -7px;
  right: -7px;
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
}

.tonearm::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: -2px;
  width: 10px;
  height: 14px;
  background: #cccccc;
  border-radius: 2px;
  transform: rotate(15deg);
}

.vinyl-wrapper.is-playing .tonearm {
  transform: rotate(-2deg);
}

/* 唱片播放光晕 */
.vinyl-wrapper::before {
  content: '';
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 77, 125, 0.25) 0%, transparent 75%);
  opacity: 0;
  transition: opacity 1s ease;
  pointer-events: none;
  z-index: -1;
}

.vinyl-wrapper.is-playing::before {
  opacity: 1;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1.05); opacity: 0.8; }
}

/* 黑胶唱片样式 */
.vinyl-disc {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, #121216 18%, #28282e 20%, #1a1a1e 22%, #202025 78%, #0a0a0d 100%);
  box-shadow:
    0 25px 50px rgba(0, 0, 0, 0.9),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 30s linear infinite;
  animation-play-state: paused;
  transition: box-shadow 0.8s ease;
}

.vinyl-wrapper.is-playing .vinyl-disc {
  animation-play-state: running;
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.9),
    0 0 40px rgba(255, 77, 125, 0.15);
}

.disc-rings {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: repeating-radial-gradient(
      circle at center,
      transparent 0,
      transparent 6px,
      rgba(255, 255, 255, 0.03) 7px,
      transparent 8px
  );
  pointer-events: none;
}

.disc-rings::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(115deg, rgba(255, 255, 255, 0.09) 0%, transparent 28%, transparent 72%, rgba(255, 255, 255, 0.05) 100%);
}

.cover-img {
  width: 54%;
  height: 54%;
  border-radius: 50%;
  object-fit: cover;
  border: 6px solid #0a0a0d;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  z-index: 2;
}

.empty-vinyl .vinyl-disc {
  background: radial-gradient(circle, #101014 18%, #1c1c20 20%, #121215 22%, #17171b 78%, #08080a 100%);
  border: 1px dashed rgba(255, 255, 255, 0.12);
}

.empty-cover {
  font-size: 48px;
  opacity: 0.35;
  filter: grayscale(0.3);
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.track-info {
  margin-top: 24px;
  text-align: center;
  max-width: 80vw;
  animation: fade-up 0.5s ease both;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.track-title {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.2px;
}

.track-artist {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 769px) {
  .vinyl-wrapper {
    width: 320px;
    height: 320px;
  }
}
</style>
