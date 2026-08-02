<template>
  <header class="room-header">
    <div class="left-section">
      <el-button link class="back-btn" icon="ArrowLeft" @click="$router.push('/')" />
      <div class="room-info">
        <h1 class="room-title">莓莓 KTV 直播间</h1>
        <div class="room-stats">
          <span class="live-tag">LIVE</span>
          <span class="online-count">
            <el-icon><User /></el-icon>
            {{ userCount }} 人正在听
          </span>
        </div>
      </div>
    </div>

    <div class="right-section">
      <div class="user-avatars">
        <div v-for="i in 3" :key="i" class="mini-avatar" :style="{ zIndex: 4 - i }"></div>
        <div class="mini-avatar more">+{{ userCount > 3 ? userCount - 3 : 0 }}</div>
      </div>
      <el-button type="primary" round class="share-btn" icon="Share">邀请好友</el-button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  userCount: {
    type: Number,
    default: 1
  }
})
</script>

<style scoped>
.room-header {
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 100;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.8) !important;
}

.room-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: #fff;
}

.room-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.live-tag {
  font-size: 10px;
  font-weight: 900;
  background: #ff4d7d;
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 1px;
  animation: breathe 2s infinite;
}

.online-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  gap: 4px;
}

.right-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-avatars {
  display: flex;
  align-items: center;
  margin-right: 8px;
}

.mini-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #1a1b26;
  background: #333;
  margin-left: -8px;
}

.mini-avatar.more {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.share-btn {
  background: linear-gradient(135deg, #ff4d7d 0%, #c92c63 100%) !important;
  border: none !important;
  font-weight: 600;
  font-size: 13px;
}

@keyframes breathe {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.95); }
}
</style>
