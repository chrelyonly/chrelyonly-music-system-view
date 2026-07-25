<!-- components/music/PlayerControls.vue -->
<template>
  <footer class="player-bar glass-card-bar">
    <!-- 进度条 -->
    <div class="progress-container">
      <span class="time">{{ formatTime(isDraggingProgress ? tempCurrentTime : currentTime) }}</span>
      <div
          ref="progressBarRef"
          class="progress-bar"
          @mousedown="onProgressMouseDown"
          @touchstart="onProgressTouchStart"
      >
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }">
            <div class="progress-thumb"></div>
          </div>
        </div>
      </div>
      <span class="time">{{ formatTime(duration) }}</span>
    </div>

    <!-- 核心控制区 -->
    <div class="controls-row">
      <!-- 播放模式 -->
      <button class="icon-btn mode-btn" @click="$emit('toggle-mode')" :title="playModeText">
        <span>{{ playModeIcon }}</span>
      </button>

      <!-- 播放/暂停/切歌 -->
      <div class="controls">
        <button class="icon-btn" @click="$emit('prev')" title="上一首">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button class="icon-btn play-btn" @click="$emit('toggle-play')" title="播放/暂停">
          <svg v-if="!isPlaying" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button class="icon-btn" @click="$emit('next')" title="下一首">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
      </div>

      <!-- 倍速与音量 -->
      <div class="extra-controls">
        <button class="rate-btn" @click="$emit('change-rate')" title="切换播放速度">
          {{ playbackRate }}x
        </button>

        <div class="volume-container desktop-only">
          <button class="icon-btn" @click="$emit('toggle-mute')">
            <span v-if="isMuted || volume === 0">🔇</span>
            <span v-else>🔊</span>
          </button>
          <div
              ref="volumeBarRef"
              class="volume-bar"
              @mousedown="onVolumeMouseDown"
              @touchstart="onVolumeTouchStart"
          >
            <div class="progress-track">
              <div class="volume-fill" :style="{ width: (isMuted ? 0 : volume * 100) + '%' }">
                <div class="volume-thumb"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps({
  currentTime: Number,
  duration: Number,
  isPlaying: Boolean,
  playMode: Number,
  playbackRate: Number,
  volume: Number,
  isMuted: Boolean
})

const emit = defineEmits([
  'seek', 'toggle-play', 'prev', 'next',
  'toggle-mode', 'change-rate', 'toggle-mute', 'update-volume'
])

const progressBarRef = ref(null)
const volumeBarRef = ref(null)

const isDraggingProgress = ref(false)
const tempCurrentTime = ref(0)
const isDraggingVolume = ref(false)

const playModeIcon = computed(() => ['🔁', '🔂', '🔀'][props.playMode])
const playModeText = computed(() => ['列表循环', '单曲循环', '随机播放'][props.playMode])

const progressPercent = computed(() => {
  if (!props.duration) return 0
  const displayTime = isDraggingProgress.value ? tempCurrentTime.value : props.currentTime
  return (displayTime / props.duration) * 100
})

const formatTime = (time) => {
  if (!time || isNaN(time)) return '00:00'
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
}

const calculateRatio = (clientX, element) => {
  if (!element) return 0
  const rect = element.getBoundingClientRect()
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
}

// 进度条拖拽逻辑
const updateProgressPosition = (clientX) => {
  if (!props.duration) return
  const ratio = calculateRatio(clientX, progressBarRef.value)
  tempCurrentTime.value = ratio * props.duration
}

const onProgressMouseDown = (e) => {
  if (!props.duration) return
  isDraggingProgress.value = true
  updateProgressPosition(e.clientX)
  window.addEventListener('mousemove', onProgressMouseMove)
  window.addEventListener('mouseup', onProgressMouseUp)
}

const onProgressMouseMove = (e) => {
  if (isDraggingProgress.value) updateProgressPosition(e.clientX)
}

const onProgressMouseUp = (e) => {
  if (isDraggingProgress.value) {
    updateProgressPosition(e.clientX)
    emit('seek', tempCurrentTime.value)
    isDraggingProgress.value = false
    window.removeEventListener('mousemove', onProgressMouseMove)
    window.removeEventListener('mouseup', onProgressMouseUp)
  }
}

const onProgressTouchStart = (e) => {
  if (!props.duration) return
  isDraggingProgress.value = true
  updateProgressPosition(e.touches[0].clientX)
  window.addEventListener('touchmove', onProgressTouchMove, { passive: false })
  window.addEventListener('touchend', onProgressTouchEnd)
}

const onProgressTouchMove = (e) => {
  if (isDraggingProgress.value) {
    if (e.cancelable) e.preventDefault()
    updateProgressPosition(e.touches[0].clientX)
  }
}

const onProgressTouchEnd = () => {
  if (isDraggingProgress.value) {
    emit('seek', tempCurrentTime.value)
    isDraggingProgress.value = false
    window.removeEventListener('touchmove', onProgressTouchMove)
    window.removeEventListener('touchend', onProgressTouchEnd)
  }
}

// 音量条拖拽逻辑
const updateVolumePosition = (clientX) => {
  const ratio = calculateRatio(clientX, volumeBarRef.value)
  emit('update-volume', ratio)
}

const onVolumeMouseDown = (e) => {
  isDraggingVolume.value = true
  updateVolumePosition(e.clientX)
  window.addEventListener('mousemove', onVolumeMouseMove)
  window.addEventListener('mouseup', onVolumeMouseUp)
}

const onVolumeMouseMove = (e) => {
  if (isDraggingVolume.value) updateVolumePosition(e.clientX)
}

const onVolumeMouseUp = () => {
  if (isDraggingVolume.value) {
    isDraggingVolume.value = false
    window.removeEventListener('mousemove', onVolumeMouseMove)
    window.removeEventListener('mouseup', onVolumeMouseUp)
  }
}

const onVolumeTouchStart = (e) => {
  isDraggingVolume.value = true
  updateVolumePosition(e.touches[0].clientX)
  window.addEventListener('touchmove', onVolumeTouchMove, { passive: false })
  window.addEventListener('touchend', onVolumeTouchEnd)
}

const onVolumeTouchMove = (e) => {
  if (isDraggingVolume.value) {
    if (e.cancelable) e.preventDefault()
    updateVolumePosition(e.touches[0].clientX)
  }
}

const onVolumeTouchEnd = () => {
  if (isDraggingVolume.value) {
    isDraggingVolume.value = false
    window.removeEventListener('touchmove', onVolumeTouchMove)
    window.removeEventListener('touchend', onVolumeTouchEnd)
  }
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onProgressMouseMove)
  window.removeEventListener('mouseup', onProgressMouseUp)
  window.removeEventListener('touchmove', onProgressTouchMove)
  window.removeEventListener('touchend', onProgressTouchEnd)
  window.removeEventListener('mousemove', onVolumeMouseMove)
  window.removeEventListener('mouseup', onVolumeMouseUp)
  window.removeEventListener('touchmove', onVolumeTouchMove)
  window.removeEventListener('touchend', onVolumeTouchEnd)
})
</script>