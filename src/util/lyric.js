/**
 * 解析 LRC 格式歌词
 * @param {string} lrcText
 * @returns {Array<{ time: number, text: string }>}
 */
export function parseLrc(lrcText) {
    if (!lrcText) return []

    const lines = lrcText.split('\n')
    const result = []
    const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/

    for (const line of lines) {
        const match = timeExp.exec(line)
        if (match) {
            const minutes = parseInt(match[1], 10)
            const seconds = parseInt(match[2], 10)
            const milliseconds = parseInt(match[3], 10)
            const time = minutes * 60 + seconds + milliseconds / (match[3].length === 3 ? 1000 : 100)
            const text = line.replace(timeExp, '').trim()
            if (text) {
                result.push({ time, text })
            }
        }
    }

    return result.sort((a, b) => a.time - b.time)
}