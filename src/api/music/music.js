import request from '@/axios/axiosConfig.js';


/**
 * 根据歌名搜索音乐列表
 * @param {string} musicName
 */
export function searchMusic(musicName) {
    return request({
        url: "/music-app/song/searchMusic",
        method: "get",
        params: {
            keywords: musicName,
            size: 20
        }
    })
}
// 2. 获取常听
export function getRecentRecommendList() {
    return request({
        url: '/music-app/song/hot',
        method: 'get'
    })
}
export const recordPlayCount = (id) => {
    return request({
        url: '/music-app/song/play',
        method: 'post',
        params: { id }
    })
}