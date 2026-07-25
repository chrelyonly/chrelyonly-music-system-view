<!-- components/music/PlayerHeader.vue -->
<template>
  <header class="header">
    <div class="logo">
      <span class="logo-icon">🍓</span>
      <span class="title">莓莓音乐</span>
    </div>

    <nav class="nav-tabs">
      <button
          :class="['nav-btn', { active: activeTab === 'playlist' }]"
          @click="$emit('select-tab', 'playlist')"
      >
        🎶 列表
      </button>
      <button
          :class="['nav-btn', { active: activeTab === 'search' }]"
          @click="$emit('select-tab', 'search')"
      >
        🔍 搜索
      </button>
    </nav>
  </header>
</template>

<script setup>
defineProps({
  activeTab: { type: String, default: 'playlist' }
})
defineEmits(['select-tab'])
</script>