<!-- components/music/AlbumStage.vue -->
<template>
  <div class="player-center-stage">
    <!-- 唱片展示 -->
    <aside class="album-panel">
      <div class="album-card glass-card" v-if="currentTrack">
        <div :class="['vinyl-wrapper', { 'is-playing': isPlaying }]">
          <div class="tonearm"></div>
          <div class="vinyl-disc">
            <img :src="currentTrack.coverUrl" class="cover-img" alt="专辑封面" />
          </div>
        </div>

        <div class="track-info">
          <h2 class="track-title">{{ currentTrack.name }}</h2>
          <p class="track-artist">{{ currentTrack.artist }}</p>
        </div>
      </div>
    </aside>

    <!-- 歌词展示 -->
    <LyricView
        :lyric-raw="currentTrack?.nameLyric || ''"
        :current-time="currentTime"
    />
  </div>
</template>

<script setup>
import LyricView from './LyricView.vue'

defineProps({
  currentTrack: Object,
  isPlaying: Boolean,
  currentTime: Number
})
</script>