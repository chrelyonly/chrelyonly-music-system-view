<template>
  <footer class="player-bar glass-card-bar">
    <!-- 进度条 -->
    <div class="progress-container">
      <span class="time">{{ formatTime(displayTime) }}</span>
      <el-slider
          v-model="displayTime"
          :max="duration > 0 ? duration : 0.001"
          :disabled="!duration"
          :format-tooltip="formatTime"
          @input="onSliderInput"
          @change="onSliderChange"
          class="custom-slider"
      />
      <span class="time">{{ formatTime(duration) }}</span>
    </div>

    <!-- 核心控制区 -->
    <div class="controls-row">
      <!-- 模式切换 -->
      <el-button link class="mode-btn-capsule" @click="$emit('toggle-play-mode')" :title="playModeText">
        <span class="mode-icon">{{ playModeIcon }}</span>
        <span class="mode-text desktop-only">{{ playModeText }}</span>
      </el-button>

      <!-- 核心切歌与播放 -->
      <div class="controls">
        <el-button link icon="Back" class="ctrl-btn" @click="$emit('prev')" title="上一首" />
        <el-button
            circle
            type="primary"
            class="play-btn"
            :icon="isPlaying ? 'VideoPause' : 'VideoPlay'"
            @click="$emit('toggle-play')"
        />
        <el-button link icon="Right" class="ctrl-btn" @click="$emit('next')" title="下一首" />
      </div>

      <!-- 倍速与音量调整 -->
      <div class="extra-controls">
        <el-button size="small" round class="rate-btn" @click="$emit('change-rate')">
          {{ playbackRate }}x
        </el-button>

        <div class="volume-container desktop-only">
          <el-button
              link
              class="vol-icon-btn"
              :icon="isMuted || volume === 0 ? 'Mute' : 'Microphone'"
              @click="$emit('toggle-mute')"
          />
          <el-slider
              :model-value="volume"
              :max="1"
              :step="0.01"
              :show-tooltip="false"
              @input="onVolumeInput"
              class="volume-slider"
          />
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  currentTime: Number,
  duration: Number,
  isPlaying: Boolean,
  playModeIcon: String,
  playModeText: String,
  playbackRate: Number,
  volume: Number,
  isMuted: Boolean
})

const emit = defineEmits([
  'update:currentTime',
  'update:volume',
  'progress-change',
  'toggle-play',
  'prev',
  'next',
  'toggle-play-mode',
  'change-rate',
  'toggle-mute',
  'volume-change'
])

const isDragging = ref(false)
const displayTime = ref(0)

// 监听父组件传来的进度更新
watch(() => props.currentTime, (val) => {
  if (!isDragging.value) {
    displayTime.value = val
  }
}, { immediate: true })

const formatTime = (time) => {
  if (time === undefined || time === null || isNaN(time)) return '00:00'
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const onSliderInput = (val) => {
  isDragging.value = true
  displayTime.value = val
}

const onSliderChange = (val) => {
  isDragging.value = false
  emit('progress-change', val)
}

const onVolumeInput = (val) => {
  emit('volume-change', val)
}
</script>

<style scoped>
.glass-card-bar {
  background: rgba(15, 16, 25, 0.75);
  backdrop-filter: blur(40px) saturate(1.8);
  -webkit-backdrop-filter: blur(40px) saturate(1.8);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6);
}

.player-bar {
  position: relative;
  z-index: 20;
  padding: 12px 32px calc(14px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  width: 44px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.custom-slider :deep(.el-slider__runway) {
  background-color: rgba(255, 255, 255, 0.12) !important;
  height: 4px;
  border-radius: 2px;
}

.custom-slider:hover :deep(.el-slider__runway) {
  height: 6px;
}

.custom-slider :deep(.el-slider__bar) {
  background: linear-gradient(90deg, #ff4d7d, #ff8fb3);
  height: 100%;
  border-radius: 2px;
}

.custom-slider :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff;
  background-color: #ff4d7d;
  box-shadow: 0 0 10px rgba(255, 77, 125, 0.8);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.custom-slider :deep(.el-slider__button-wrapper:hover .el-slider__button) {
  transform: scale(1.4);
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.controls {
  display: flex;
  align-items: center;
  gap: 32px;
}

.ctrl-btn {
  color: rgba(255, 255, 255, 0.85) !important;
  font-size: 26px !important;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
}

.ctrl-btn:hover {
  color: #ff8fb3 !important;
  transform: scale(1.2);
}

.play-btn {
  width: 56px !important;
  height: 56px !important;
  font-size: 28px !important;
  background: #ff4d7d !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(255, 77, 125, 0.4);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

.play-btn:hover {
  transform: scale(1.05) !important;
  background: #ff6692 !important;
  box-shadow: 0 6px 20px rgba(255, 77, 125, 0.5) !important;
}

.play-btn:active {
  transform: scale(0.9) !important;
}

.mode-btn-capsule {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px !important;
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 20px !important;
  color: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 0.3s ease !important;
}

.mode-btn-capsule:hover {
  background: rgba(255, 77, 125, 0.2) !important;
  border-color: rgba(255, 77, 125, 0.5) !important;
  color: #ffffff !important;
}

.extra-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.rate-btn {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: rgba(255, 255, 255, 0.9) !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
}

.rate-btn:hover {
  background: rgba(255, 77, 125, 0.2) !important;
  border-color: rgba(255, 77, 125, 0.5) !important;
}

.volume-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vol-icon-btn {
  color: rgba(255, 255, 255, 0.8) !important;
  font-size: 20px !important;
}

.volume-slider {
  width: 90px;
}

.volume-slider :deep(.el-slider__runway) {
  background-color: rgba(255, 255, 255, 0.2) !important;
  height: 4px;
}

.volume-slider :deep(.el-slider__bar) {
  background-color: rgba(255, 255, 255, 0.9);
  height: 4px;
}

.volume-slider :deep(.el-slider__button) {
  width: 10px;
  height: 10px;
  border: none;
  background-color: #ffffff;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
}

@media (min-width: 769px) {
  .player-bar {
    padding: 16px 48px 20px;
  }
}
</style>
