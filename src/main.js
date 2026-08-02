import {createApp, nextTick} from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from "./router/router.js";

const elementApp = createApp(App);
elementApp.use(router)


import {http} from '@/api/https';
import request from '@/axios/axiosConfig.js';
// 饿了么
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    elementApp.component(key, component)
}
elementApp.use(ElementPlus)
// AVUE
import Avue,{findObject} from '@smallwei/avue';
import '@smallwei/avue/lib/index.css';
elementApp.use(Avue, { axios:request })
window.$findObject = findObject;
window.$https = http;
// 引入自用缓存工具
import {clearStore, getStore, setStore} from "@/stores/store.js";
import {connectMqtt} from "@/util/mqttUtil.js";
window.$setStore = setStore;
window.$getStore = getStore;
window.$clearStore = clearStore;

// 引入状态管理
elementApp.use(createPinia())
elementApp.mount('#app')
// 在 Vue 实例挂载后隐藏 loading
nextTick (() => {
    try {
        window.$mqttServer = connectMqtt()
        window.$mqttServer.on('connect', () => {
            console.log('✅ MQTT 全局已连接')
        })
        window.$mqttServer.on('error', (err) => {
            console.error('❌ MQTT 连接失败:', err)
        })
    }catch (e) {
        console.log("链接mqtt服务器异常")
    }
    
    
    const loadingElement = document.getElementById('loading')
    if (loadingElement) {
        loadingElement.style.opacity = '0'
        loadingElement.style.visibility = 'hidden'
    }
})
