<script setup>

import MusicPlayer from "@/views/playList/components/MusicPlayer.vue";
</script>

<template>
  <MusicPlayer></MusicPlayer>
</template>


<style>
.player-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  background-color: #0b0c10;
  overflow: hidden;
  user-select: none;
}

.bg-cover {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(60px) saturate(1.8) brightness(0.35);
  transform: scale(1.15);
  transition: background-image 0.8s ease-in-out;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(15, 15, 25, 0.2) 0%, rgba(5, 5, 10, 0.85) 100%);
  z-index: 2;
}

.header {
  position: relative;
  z-index: 10;
  height: 60px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.nav-tabs { display: flex; gap: 8px; }

.nav-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  padding: 5px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.nav-btn.active, .nav-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
}

.main-content {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  padding: 10px 20px 10px;
  gap: 20px;
  overflow: hidden;
}

/* 毛玻璃卡片基类 */
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(25px) saturate(160%);
  -webkit-backdrop-filter: blur(25px) saturate(160%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.list-panel {
  width: 360px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  transition: transform 0.3s ease-in-out;
}

.mobile-drawer-handle {
  display: none;
}

.tab-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.scroll-list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.scroll-list-wrapper::-webkit-scrollbar,
.panel-scroll-content::-webkit-scrollbar {
  width: 4px;
}

.scroll-list-wrapper::-webkit-scrollbar-thumb,
.panel-scroll-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.25);
  border-radius: 4px;
}

.search-bar { display: flex; gap: 8px; margin-bottom: 12px; }

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 0 10px;
}

.search-input {
  width: 100%;
  background: transparent;
  border: none;
  padding: 8px 0;
  color: #fff;
  font-size: 13px;
  outline: none;
}

.glow-btn {
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
  border-radius: 10px !important;
}

.panel-scroll-content {
  flex: 1;
  overflow-y: auto;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title { font-size: 13px; font-weight: 600; opacity: 0.85; }

.song-list { display: flex; flex-direction: column; gap: 4px; }

.song-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.song-item:hover { background: rgba(255, 255, 255, 0.1); }

.song-item.playing {
  background: rgba(255, 255, 255, 0.18);
  border-left: 3px solid #fff;
}

.res-cover { width: 36px; height: 36px; border-radius: 6px; margin-right: 10px; object-fit: cover; }
.song-index { width: 28px; font-size: 12px; opacity: 0.6; }

.song-meta { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.song-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.song-artist { font-size: 11px; opacity: 0.5; }

.item-actions { display: flex; gap: 6px; opacity: 0.8; }

.action-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.action-btn:hover { background: rgba(255, 255, 255, 0.2); color: #fff; }

.add-circle-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
}

.empty-holder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  opacity: 0.5;
}

/* 舞台中央布局区域 */
.player-center-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 20px;
  overflow: hidden;
}

.lyrics-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  overflow: hidden;
}

.lyrics-container {
  width: 100%;
  max-width: 450px;
  height: 85%;
  overflow-y: auto;
  text-align: center;
  mask-image: linear-gradient(180deg, transparent 0%, #000 15%, #000 85%, transparent 100%);
}

.lyrics-container::-webkit-scrollbar { display: none; }

.lyric-line {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.35);
  margin: 16px 0;
  transition: all 0.3s;
}

.lyric-line.active {
  font-size: 18px;
  color: #ffffff;
  font-weight: 600;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
}

.album-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.vinyl-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tonearm {
  position: absolute;
  top: -20px;
  right: 10px;
  width: 50px;
  height: 70px;
  border-right: 3px solid rgba(255, 255, 255, 0.7);
  border-top: 3px solid rgba(255, 255, 255, 0.7);
  border-top-right-radius: 14px;
  z-index: 10;
  transform-origin: 100% 0;
  transform: rotate(-25deg);
  transition: transform 0.5s ease;
}

.vinyl-wrapper.is-playing .tonearm { transform: rotate(0deg); }

.vinyl-disc {
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: radial-gradient(circle, #0c0c0c 25%, #181818 26%, #0c0c0c 27%, #121212 80%, #000 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 20s linear infinite;
  animation-play-state: paused;
  box-shadow: 0 10px 20px rgba(0,0,0,0.5);
}

.vinyl-wrapper.is-playing .vinyl-disc { animation-play-state: running; }

.cover-img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid #080808; }

.track-info {
  text-align: center;
}

.track-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.track-artist { font-size: 12px; opacity: 0.6; }

@keyframes spin { 100% { transform: rotate(360deg); } }

/* 底部播放栏：毛玻璃卡片 */
.glass-card-bar {
  background: rgba(20, 20, 30, 0.65);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
}

.player-bar {
  position: relative;
  z-index: 20;
  padding: 12px 25px calc(12px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.time { font-size: 11px; opacity: 0.6; width: 36px; text-align: center; font-weight: 500; }

.progress-bar {
  flex: 1;
  height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  touch-action: none;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 3px;
  position: relative;
  overflow: visible;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffffff 0%, #e0e0e0 100%);
  border-radius: 3px;
  position: relative;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}

.progress-thumb {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.6), 0 0 4px rgba(255, 255, 255, 0.8);
  transition: transform 0.1s ease;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.controls { display: flex; align-items: center; gap: 16px; }

.icon-btn { background: transparent; border: none; color: rgba(255, 255, 255, 0.8); cursor: pointer; display: flex; align-items: center; }
.play-btn { width: 42px; height: 42px; border-radius: 50%; background: #ffffff; color: #000; justify-content: center; box-shadow: 0 0 12px rgba(255,255,255,0.3); }

.extra-controls { display: flex; align-items: center; gap: 12px; }

.rate-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  cursor: pointer;
}

.volume-container { display: flex; align-items: center; gap: 8px; }

.volume-bar {
  width: 70px;
  height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  touch-action: none;
}

.volume-fill {
  height: 100%;
  background: #ffffff;
  border-radius: 3px;
  position: relative;
  pointer-events: none;
}

.volume-thumb {
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
}

.recommend-cards { display: flex; flex-direction: column; gap: 6px; }
.rec-card { display: flex; align-items: center; gap: 8px; padding: 6px; background: rgba(255, 255, 255, 0.05); border-radius: 6px; cursor: pointer; }
.rec-cover { width: 32px; height: 32px; border-radius: 4px; }
.rec-info { flex: 1; display: flex; flex-direction: column; }
.rec-name { font-size: 12px; }
.rec-artist { font-size: 10px; opacity: 0.5; }

.playing-waves { display: flex; gap: 2px; align-items: flex-end; height: 10px; }
.playing-waves i { width: 2px; height: 100%; background: #fff; animation: wave 0.8s infinite ease-in-out; }
.playing-waves i:nth-child(2) { animation-delay: 0.2s; }
.playing-waves i:nth-child(3) { animation-delay: 0.4s; }
@keyframes wave { 0%, 100% { height: 2px; } 50% { height: 10px; } }

/* =========================================================
   📱 移动端响应式适配 (Media Queries)
   ========================================================= */
@media (max-width: 768px) {
  .header {
    height: 50px;
    padding: 0 16px;
  }

  .main-content {
    padding: 10px;
    flex-direction: column;
  }

  /* 抽屉遮罩 */
  .mobile-drawer-mask {
    position: fixed;
    inset: 0;
    z-index: 90;
  }

  /* 左侧面板在手机端变为底部/侧边滑出的抽屉卡片 */
  .list-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 82vw;
    max-width: 320px;
    height: 100vh;
    z-index: 100;
    border-radius: 0 20px 20px 0;
    transform: translateX(-100%);
    box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
  }

  .list-panel.mobile-open {
    transform: translateX(0);
  }

  .mobile-drawer-handle {
    display: block;
    text-align: right;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    padding-bottom: 10px;
    cursor: pointer;
  }

  /* 手机端舞台中央垂直串联 */
  .player-center-stage {
    flex-direction: column;
    justify-content: center;
    gap: 15px;
  }

  .vinyl-wrapper {
    width: 160px;
    height: 160px;
  }

  .vinyl-disc {
    width: 150px;
    height: 150px;
  }

  .cover-img {
    width: 80px;
    height: 80px;
  }

  .tonearm {
    width: 40px;
    height: 55px;
    top: -15px;
  }

  .lyrics-container {
    height: 180px;
  }

  .lyric-line {
    font-size: 13px;
    margin: 12px 0;
  }

  .lyric-line.active {
    font-size: 16px;
  }

  /* 手机端隐藏电脑端音量条 */
  .desktop-only {
    display: none;
  }

  .player-bar {
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  }
}
</style>