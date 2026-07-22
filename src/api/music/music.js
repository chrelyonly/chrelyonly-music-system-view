import request from '@/axios/axiosConfig.js';


/**
 * 根据歌名搜索音乐列表
 * @param {string} musicName
 */
export function getMusicList(musicName) {
    return request({
        url: "/music-app/song/searchMusic",
        method: "get",
        params: {
            keywords: musicName,
            size: 20
        }
    })
}