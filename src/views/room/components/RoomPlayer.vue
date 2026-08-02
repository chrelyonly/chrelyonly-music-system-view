<template>
  <div class="room-player">
    <!-- 舞台背景灯光效 -->
    <div class="stage-lights">
      <div class="light light-1"></div>
      <div class="light light-2"></div>
    </div>

    <div class="player-stage">
      <!-- 唱片区 -->
      <div class="album-section">
        <div :class="['vinyl-disc', { 'is-playing': isPlaying }]">
          <div class="vinyl-rings"></div>
          <img :src="currentTrack?.coverUrl" class="cover-img" v-if="currentTrack" />
          <div class="empty-cover" v-else>🎵</div>
        </div>

        <transition name="fade-up" mode="out-in">
          <div class="track-meta" v-if="currentTrack" :key="currentTrack.id">
            <h2 class="song-name">{{ currentTrack.name }}</h2>
            <p class="song-artist">{{ currentTrack.artist }}</p>
          </div>
        </transition>
      </div>

      <!-- 歌词区：居中滚动 -->
      <div class="lyric-section" ref="lyricContainerRef">
        <div class="lyric-scroll" :style="{ transform: `translateY(${lyricOffset}px)` }">
          <p
              v-for="(line, index) in parsedLyrics"
              :key="index"
              :class="['lyric-line', { active: currentLyricIndex === index }]"
              :ref="el => { if (currentLyricIndex === index) currentLyricEl = el }"
          >
            {{ line.text }}
          </p>
        </div>
      </div>
    </div>

    <!-- 底部状态显示 -->
    <div class="player-footer">
       <div class="sync-indicator">
         <span class="pulse-dot"></span>
         LIVE SYNC
       </div>

       <div class="progress-container">
         <span class="time-label">{{ formatTime(currentTime) }}</span>
         <div class="progress-bar">
            <div class="fill" :style="{ width: `${progressPercent}%` }"></div>
         </div>
         <span class="time-label">{{ formatTime(duration) }}</span>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { parseLrc } from '@/util/lyric.js'

const props = defineProps({
  currentTrack: Object,
  currentTime: Number,
  duration: Number,
  isPlaying: Boolean
})

const lyricContainerRef = ref(null)
const currentLyricEl = ref(null)
const lyricOffset = ref(0)

const parsedLyrics = computed(() => {
  if (!props.currentTrack?.nameLyric) return [{ time: 0, text: '暂无歌词' }]
  return parseLrc(props.currentTrack.nameLyric)
})

const currentLyricIndex = computed(() => {
  if (!parsedLyrics.value.length) return -1
  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (props.currentTime >= parsedLyrics.value[i].time) return i
  }
  return 0
})

const progressPercent = computed(() => {
  if (!props.duration) return 0
  return (props.currentTime / props.duration) * 100
})

const formatTime = (time) => {
  if (!time || isNaN(time)) return '00:00'
  const m = Math.floor(time / 60)
  const s = Math.floor(time % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// 自动对齐歌词中点
const alignLyrics = () => {
  if (currentLyricEl.value && lyricContainerRef.value) {
    const container = lyricContainerRef.value
    const el = currentLyricEl.value
    lyricOffset.value = (container.clientHeight / 2) - el.offsetTop - (el.clientHeight / 2)
  }
}

watch(currentLyricIndex, () => {
  nextTick(alignLyrics)
})

// 处理换歌时的位置重置
watch(() => props.currentTrack?.id, () => {
  lyricOffset.value = 100 // 稍微向下偏一点
  nextTick(alignLyrics)
})
</script>

<style scoped>
.room-player {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  padding: 40px;
}

/* 舞台光效 */
.stage-lights {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.light {
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.15;
  animation: move-light 10s infinite alternate ease-in-out;
}

.light-1 {
  background: #ff4d7d;
  top: -100px;
  left: -100px;
}

.light-2 {
  background: #7000ff;
  bottom: -100px;
  right: -100px;
  animation-delay: -5s;
}

@keyframes move-light {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(100px, 100px) scale(1.2); }
}

.player-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 60px;
  z-index: 5;
}

/* 唱片组件 */
.vinyl-disc {
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: #000;
  border: 12px solid #18181c;
  box-shadow: 0 30px 80px rgba(0,0,0,0.8), inset 0 0 0 2px rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: rotate 25s linear infinite;
  animation-play-state: paused;
}

.vinyl-disc.is-playing { animation-play-state: running; }

.vinyl-rings {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: repeating-radial-gradient(circle at center, transparent 0, transparent 4px, rgba(255,255,255,0.03) 5px);
}

.cover-img {
  width: 60%;
  height: 60%;
  border-radius: 50%;
  object-fit: cover;
  z-index: 2;
  border: 4px solid #000;
}

.track-meta {
  margin-top: 24px;
  text-align: center;
}

.song-name { font-size: 28px; font-weight: 800; color: #fff; margin: 0 0 10px; }
.song-artist { font-size: 16px; color: rgba(255,255,255,0.4); margin: 0; }

/* 歌词系统 */
.lyric-section {
  width: 100%;
  height: 300px;
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(to bottom, transparent 0%, black 50%, transparent 100%);
  text-align: center;
}

.lyric-scroll {
  transition: transform 0.8s cubic-bezier(0.2, 1, 0.3, 1);
}

.lyric-line {
  font-size: 20px;
  color: rgba(255,255,255,0.2);
  margin: 28px 0;
  transition: all 0.5s ease;
}

.lyric-line.active {
  color: #fff;
  font-weight: 800;
  font-size: 32px;
  transform: scale(1.05);
  text-shadow: 0 0 30px rgba(255, 77, 125, 0.6);
}

/* 底部状态 */
.player-footer {
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 900;
  color: #00ff88;
  letter-spacing: 2px;
  background: rgba(0, 255, 136, 0.1);
  padding: 4px 12px;
  border-radius: 4px;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: #00ff88;
  border-radius: 50%;
  box-shadow: 0 0 10px #00ff88;
  animation: pulse 1s infinite;
}

.progress-container {
  width: 100%;
  max-width: 600px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar .fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4d7d, #ff8fb3);
  transition: width 0.4s linear;
}

.time-label { font-size: 11px; color: rgba(255,255,255,0.3); font-variant-numeric: tabular-nums; }

/* 动画 */
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }

.fade-up-enter-active, .fade-up-leave-active { transition: all 0.4s ease; }
.fade-up-enter-from { opacity: 0; transform: translateY(10px); }
.fade-up-leave-to { opacity: 0; transform: translateY(-10px); }

@media (min-width: 1024px) {
  .player-stage { flex-direction: row; gap: 100px; }
  .lyric-section { height: 450px; flex: 1; }
  .album-section { flex: 0 0 400px; }
}
</style>
