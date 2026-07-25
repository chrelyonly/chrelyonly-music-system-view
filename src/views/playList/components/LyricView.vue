<!-- components/music/LyricView.vue -->
<template>
  <section class="lyrics-panel">
    <div class="lyrics-container" ref="lyricsContainerRef">
      <div v-if="parsedLyrics.length > 0" class="lyrics-scroll">
        <p
            v-for="(line, idx) in parsedLyrics"
            :key="idx"
            :class="['lyric-line', { active: currentLyricIndex === idx }]"
            :ref="el => { if (currentLyricIndex === idx) currentLyricEl = el }"
        >
          {{ line.text }}
        </p>
      </div>
      <div v-else class="no-lyric">
        <span class="disc-icon">🎵</span>
        <p>暂无歌词或纯音乐</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { parseLrc } from '@/util/lyric.js'

const props = defineProps({
  lyricRaw: { type: String, default: '' },
  currentTime: { type: Number, default: 0 }
})

const lyricsContainerRef = ref(null)
const currentLyricEl = ref(null)

const parsedLyrics = computed(() => parseLrc(props.lyricRaw))

const currentLyricIndex = computed(() => {
  if (!parsedLyrics.value.length) return -1
  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (props.currentTime >= parsedLyrics.value[i].time) return i
  }
  return 0
})

watch(currentLyricIndex, () => {
  nextTick(() => {
    if (currentLyricEl.value && lyricsContainerRef.value) {
      const container = lyricsContainerRef.value
      const el = currentLyricEl.value
      container.scrollTo({
        top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2,
        behavior: 'smooth'
      })
    }
  })
})
</script>