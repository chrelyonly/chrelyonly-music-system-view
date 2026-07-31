<template>
  <footer class="player-bar glass-card-bar">
    <!-- 进度条区域 -->
    <div class="progress-container">
      <!-- 如果正在拖拽，显示拖拽中的时间，否则显示音频引擎的真实时间 -->
      <span class="time">{{ formatTime(isDragging ? displayTime : currentTime) }}</span>

      <el-slider
          v-model="displayTime"
          :max="duration > 0 ? duration : 0.001"
          :format-tooltip="formatTime"
          @input="onSliderInput"
          @change="onSliderChange"
          class="custom-slider"
      />

      <span class="time">{{ formatTime(duration) }}</span>
    </div>

    <!-- 核心控制面板 -->
    <div class="controls-row">
      <!-- 播放模式切换 (左) -->
      <el-button link class="mode-btn-capsule" @click="$emit('toggle-play-mode')" :title="playModeText">
        <span class="mode-icon">{{ playModeIcon }}</span>
        <span class="mode-text desktop-only">{{ playModeText }}</span>
      </el-button>

      <!-- 核心切歌与播放 (中) -->
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

      <!-- 倍速与音量调整 (右) -->
      <div class="extra-controls">
        <!-- 倍速按钮 -->
        <el-button size="small" round class="rate-btn" @click="$emit('change-rate')">
          {{ playbackRate }}x
        </el-button>

        <!-- 音量调节 (仅 PC 显示) -->
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
/**
 * PlayerBar.vue - 底部播放控制组件
 *
 * 处理：
 * 1. 进度条的实时展示与拖拽寻址
 * 2. 播放/暂停、上下一首、模式切换的交互触发
 * 3. 响应式布局下的音量与文字显示
 */
import { ref, watch } from 'vue'

const props = defineProps({
  currentTime: Number,  // 父组件传来的权威播放时间
  duration: Number,     // 歌曲总时长
  isPlaying: Boolean,
  playModeIcon: String,
  playModeText: String,
  playbackRate: Number,
  volume: Number,
  isMuted: Boolean
})

const emit = defineEmits([
  'progress-change',
  'toggle-play',
  'prev',
  'next',
  'toggle-play-mode',
  'change-rate',
  'toggle-mute',
  'volume-change'
])

// --- 本地交互状态 ---
const isDragging = ref(false)     // 用户是否正在拖拽滑块
const displayTime = ref(props.currentTime || 0) // 滑块绑定的本地显示值

/**
 * 监听权威时间更新
 * 只有在用户没拖拽时，滑块才跟随音频进度走
 */
watch(() => props.currentTime, (val) => {
  if (!isDragging.value) {
    displayTime.value = val
  }
}, { immediate: true })

/**
 * 深度修复刷新后的滑块钳位问题
 * 当时长从 0 变为有效值时，强制让滑块跳回权威进度
 */
watch([() => props.duration, () => props.currentTime], ([newDur, newTime]) => {
  if (newDur > 0 && !isDragging.value && Math.abs(displayTime.value - newTime) > 1) {
    displayTime.value = newTime
  }
})

/**
 * 时间格式化 (秒 -> mm:ss)
 */
const formatTime = (time) => {
  if (time === undefined || time === null || isNaN(time)) return '00:00'
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 滑块拖拽中：仅更新本地显示，不触发音频寻址
 */
const onSliderInput = (val) => {
  isDragging.value = true
  displayTime.value = val
}

/**
 * 滑块释放：通知父组件执行真正的音频寻址
 */
const onSliderChange = (val) => {
  isDragging.value = false
  emit('progress-change', val)
}

const onVolumeInput = (val) => {
  emit('volume-change', val)
}
</script>

<style scoped>
/* ==========================================================================
   1. 底部栏容器 (毛玻璃效果)
   ========================================================================= */
.glass-card-bar {
  background: rgba(15, 16, 25, 0.78);
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

/* ==========================================================================
   2. 进度条自定义样式
   ========================================================================= */
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

/* ==========================================================================
   3. 按钮与控制逻辑样式
   ========================================================================= */
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
  transition: all 0.3s ease !important;
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

.volume-slider { width: 90px; }
.volume-slider :deep(.el-slider__runway) { background-color: rgba(255, 255, 255, 0.2) !important; height: 4px; }
.volume-slider :deep(.el-slider__bar) { background-color: rgba(255, 255, 255, 0.9); height: 4px; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
}

@media (min-width: 769px) {
  .player-bar { padding: 16px 48px 20px; }
}
</style>
