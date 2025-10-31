/**
 * 简单测试脚本
 */

import ffmpeg from './src/index'

async function test () {
  console.log('测试 FFmpeg 插件...\n')

  // 测试 1：立即同步获取（导入时已开始初始化，但可能还未完成）
  console.log('测试 1 - 立即同步获取（可能为 null）:')
  console.log('  ffmpegPath:', ffmpeg.ffmpegPath)
  console.log('  ffprobePath:', ffmpeg.ffprobePath)
  console.log('  ffplayPath:', ffmpeg.ffplayPath)

  // 测试 2：异步获取（推荐方式）
  console.log('\n测试 2 - 异步获取（等待初始化完成）...')
  const paths = await ffmpeg.ready()

  console.log('  ffmpegPath:', paths.ffmpegPath)
  console.log('  ffprobePath:', paths.ffprobePath)
  console.log('  ffplayPath:', paths.ffplayPath)

  // 测试 3：再次同步获取（此时已初始化完成）
  console.log('\n测试 3 - 再次同步获取（已初始化）:')
  console.log('  ffmpegPath:', ffmpeg.ffmpegPath)
  console.log('  ffprobePath:', ffmpeg.ffprobePath)
  console.log('  ffplayPath:', ffmpeg.ffplayPath)

  if (paths.ffmpegPath) {
    console.log('\n✓ FFmpeg 已安装')
  } else {
    console.log('\n✗ FFmpeg 未安装，请运行: node lib/postinstall.js')
  }
}

test().catch(console.error)
