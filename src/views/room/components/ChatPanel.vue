<template>
  <div class="chat-panel">
    <!-- 顶部状态栏 -->
    <div class="chat-header">
      <span class="chat-title">实时交流</span>
      <span class="active-dot"></span>
    </div>

    <!-- 消息滚动区 -->
    <el-scrollbar class="message-list" ref="scrollRef">
      <div class="msg-container">
        <div v-for="(msg, index) in messages" :key="index" :class="['message-wrap', msg.type]">
          <!-- 系统公告 -->
          <div v-if="msg.type === 'system'" class="system-bubble">
            <span class="icon">📢</span>
            {{ msg.content }}
          </div>

          <!-- 用户对话 -->
          <div v-else class="user-bubble">
            <div class="user-info">
              <span class="name">{{ msg.userName }}</span>
              <span class="time">{{ msg.time }}</span>
            </div>
            <div class="content">{{ msg.content }}</div>
          </div>
        </div>
      </div>
    </el-scrollbar>

    <!-- 底部发送区 -->
    <div class="chat-footer">
      <!-- 快捷语栏 -->
      <div class="quick-phrases">
        <div
            v-for="phrase in phrases"
            :key="phrase"
            class="phrase-tag"
            @click="$emit('send', phrase)"
        >
          {{ phrase }}
        </div>
      </div>

      <div class="input-container">
        <el-input
            v-model="inputContent"
            placeholder="和大家聊聊吧..."
            @keyup.enter="handleSend"
        >
          <template #suffix>
            <el-button link class="send-icon" @click="handleSend" :disabled="!inputContent.trim()">
              <el-icon><Position /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['send'])

const inputContent = ref('')
const scrollRef = ref(null)

const phrases = ['🎶 好听！', '🍓 莓莓 666', '给大佬点歌', '循环一整天', '表白歌手']

const handleSend = () => {
  if (!inputContent.value.trim()) return
  emit('send', inputContent.value)
  inputContent.value = ''
}

// 自动滚动底部逻辑
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (scrollRef.value) {
      const wrap = scrollRef.value.wrapRef
      if (wrap) {
        wrap.scrollTo({
          top: wrap.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  })
}, { immediate: true })
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(0, 0, 0, 0.1);
}

.chat-header {
  height: 50px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.chat-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.active-dot {
  width: 6px;
  height: 6px;
  background: #00ff88;
  border-radius: 50%;
  box-shadow: 0 0 8px #00ff88;
}

.message-list {
  flex: 1;
}

.msg-container {
  padding: 20px 16px;
}

.message-wrap {
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 系统消息 */
.system-bubble {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 77, 125, 0.1);
  border: 1px solid rgba(255, 77, 125, 0.2);
  border-radius: 20px;
  font-size: 12px;
  color: #ff8fb3;
  margin: 0 auto;
}

/* 用户消息 */
.user-bubble {
  display: flex;
  flex-direction: column;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.user-info .name {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
}

.user-info .time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.2);
}

.user-bubble .content {
  background: rgba(255, 255, 255, 0.05);
  padding: 10px 14px;
  border-radius: 4px 16px 16px 16px;
  font-size: 14px;
  color: #fff;
  line-height: 1.5;
  align-self: flex-start;
  max-width: 90%;
}

/* 底部区域 */
.chat-footer {
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
}

.quick-phrases {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 12px;
  scrollbar-width: none;
}

.quick-phrases::-webkit-scrollbar { display: none; }

.phrase-tag {
  white-space: nowrap;
  font-size: 11px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s;
}

.phrase-tag:hover {
  background: rgba(255, 77, 125, 0.2);
  color: #ff4d7d;
}

.input-container :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px;
  box-shadow: none !important;
}

.send-icon {
  font-size: 18px;
  color: #ff4d7d !important;
}
</style>
