import { describe, expect, it } from 'vitest'
import ffmpeg from './src/index'

/**
 * 断言路径结构
 * @param value 路径
 * @returns 是否匹配
 */
const isExpectedPath = (value: string | null): boolean => {
  if (!value) return false
  return /[\\/]ffmpeg-[^\\/]+[\\/]bin[\\/]ffmpeg(\.exe)?$/i.test(value)
}

describe('ffmpeg 插件', () => {
  it('ready 后能拿到可用路径', async () => {
    const paths = await ffmpeg.ready()
    expect(paths.ffmpegPath).not.toBeNull()
    expect(isExpectedPath(paths.ffmpegPath)).toBe(true)
    const syncPaths = ffmpeg.readySync()
    expect(syncPaths.ffmpegPath).not.toBeNull()
    expect(isExpectedPath(syncPaths.ffmpegPath)).toBe(true)
  })
})
