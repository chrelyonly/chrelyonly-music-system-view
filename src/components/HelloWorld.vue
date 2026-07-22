<script setup>
import { computed, onBeforeMount } from "vue"
import { useRouter } from "vue-router"
import { ElMessage } from "element-plus"

const router = useRouter()

const userInfo = computed(() => {
  return (
      $getStore({
        name: "userInfo",
      }) || {}
  )
})

const hasLogin = computed(() => {
  return !!$getStore({
    name: "accessToken",
  })
})

function logout() {
  $clearStore({
    name: "accessToken",
  })
  router.push("/login")
}


const copyFunc = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success("复制成功")
  } catch (err) {
    ElMessage.error("复制失败:" +  err)
  }
}
</script>

<template>
  <div class="layout">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        🍓 Strawberry
      </div>

      <nav class="menu">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/device">设备管理</RouterLink>
        <RouterLink to="/forwardView">转发管理</RouterLink>
      </nav>

      <div
          class="right"
          v-if="hasLogin"
      >
        <span class="nickname">
          秘钥: <el-tag @click="copyFunc(userInfo.token)">{{userInfo.token}}</el-tag>
        </span>
        <span class="nickname">
          {{ userInfo.nickname || userInfo.username }}
        </span>

        <el-button
            type="danger"
            plain
            @click="logout"
        >
          退出登录
        </el-button>
      </div>
    </header>

    <!-- 页面 -->
    <main class="container">
      <div class="page-card">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>

/* =====================
   整体背景
===================== */

.layout {
  min-height: 100vh;
  background: #f5f7fb;
}

/* =====================
   顶部导航
===================== */

.header {

  position: sticky;
  top: 18px;

  z-index: 999;

  width: calc(100% - 40px);
  max-width: 1400px;

  margin: 18px auto 0;

  height: 72px;

  padding: 0 28px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  border-radius: 18px;

  background: rgba(255,255,255,.72);

  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);

  border: 1px solid rgba(255,255,255,.9);

  box-shadow:
      0 8px 30px rgba(15,23,42,.08);
}

/* =====================
   Logo
===================== */

.logo{

  font-size:22px;

  font-weight:700;

  color:#2563eb;

  user-select:none;
}

/* =====================
   菜单
===================== */

.menu{

  display:flex;

  gap:12px;
}

.menu a{

  text-decoration:none;

  color:#555;

  font-size:15px;

  font-weight:600;

  padding:10px 18px;

  border-radius:12px;

  transition:.25s;
}

.menu a:hover{

  background:#eef4ff;

  color:#2563eb;
}

.router-link-active{

  background:#2563eb;

  color:#fff !important;

  box-shadow:
      0 4px 12px rgba(37,99,235,.25);
}

/* =====================
   右侧
===================== */

.right{

  display:flex;

  align-items:center;

  gap:18px;
}

.nickname{

  color:#444;

  font-size:14px;

  font-weight:600;
}

/* =====================
   页面区域
===================== */

.container{

  max-width:1400px;

  margin:28px auto;

  padding:0 20px;
}

/* =====================
   内容卡片
===================== */

.page-card{

  min-height:calc(100vh - 150px);

  padding:28px;

  border-radius:22px;

  background:rgba(255,255,255,.72);

  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);

  border:1px solid rgba(255,255,255,.9);

  box-shadow:
      0 10px 35px rgba(15,23,42,.06);
}

/* =====================
   Element Plus
===================== */

:deep(.el-button){

  border-radius:12px;

  font-weight:600;

  height:38px;
}

:deep(.el-table){

  border-radius:14px;

  overflow:hidden;
}

:deep(.el-input__wrapper){

  border-radius:10px;
}

:deep(.el-card){

  border:none;

  border-radius:18px;

  box-shadow:none;
}

</style>