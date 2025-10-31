#!/usr/bin/env node

import chalk from 'chalk'
import { getSystemInfo, getStorageDir, downloadFFmpeg } from './download'

async function main (): Promise<void> {
  try {
    const systemInfo = getSystemInfo()
    const storageDir = await getStorageDir()

    // 快速检查文件是否已存在
    const { checkFileExists } = await import('./download')
    const { join } = await import('path')

    const ffmpegPath = join(storageDir, `ffmpeg${systemInfo.extension}`)
    const ffprobePath = join(storageDir, `ffprobe${systemInfo.extension}`)

    console.log('ffmpegPath:', ffmpegPath)
    console.log('ffprobePath:', ffprobePath)

    const [ffmpegExists, ffprobeExists] = await Promise.all([
      checkFileExists(ffmpegPath),
      checkFileExists(ffprobePath)
    ])

    console.log('ffmpegExists:', ffmpegExists)
    console.log('ffprobeExists:', ffprobeExists)

    // 如果文件已存在，静默退出（不输出任何信息）
    if (ffmpegExists && ffprobeExists) {
      console.log('文件已存在，跳过下载')
      return
    }

    // 只有在需要下载时才显示完整界面
    const separator = chalk.gray('━'.repeat(50))

    console.log(separator)

    console.log(chalk.cyan('系统信息:'))
    console.log(chalk.gray(`  平台: ${systemInfo.platform}`))
    console.log(chalk.gray(`  架构: ${systemInfo.arch}`))
    console.log(chalk.gray(`  存储: ${storageDir}`))

    // 从环境变量读取代理设置
    // FFMPEG_PROXY_INDEX: 0=直连, 1-12=指定源, 不设置=自动选择
    const proxyIndexEnv = process.env.FFMPEG_PROXY_INDEX
    const proxyIndex = proxyIndexEnv ? parseInt(proxyIndexEnv) : undefined

    if (proxyIndex !== undefined) {
      console.log(chalk.yellow(`  代理: 手动指定 (索引 ${proxyIndex})`))
    } else {
      console.log(chalk.gray('  代理: 自动选择'))
    }

    console.log(separator + '\n')

    // 下载并解压 FFmpeg
    const paths = await downloadFFmpeg(systemInfo, storageDir, proxyIndex)

    console.log(separator)
    console.log(chalk.green.bold('\n✓ FFmpeg 安装成功！\n'))
    console.log(chalk.cyan('已安装的组件:'))
    console.log(chalk.green(`  ✓ ffmpeg:  ${paths.ffmpegPath}`))
    console.log(chalk.green(`  ✓ ffprobe: ${paths.ffprobePath}`))
    if (paths.ffplayPath) {
      console.log(chalk.green(`  ✓ ffplay:  ${paths.ffplayPath}`))
    }
    console.log('\n' + separator + '\n')
  } catch (error) {
    const separator = chalk.gray('━'.repeat(50))

    console.log('\n' + separator)
    console.error(chalk.red.bold('\n✗ FFmpeg 安装失败\n'))
    console.error(chalk.yellow('错误信息:'))
    console.error(chalk.gray(`  ${error instanceof Error ? error.message : String(error)}`))
    console.error(chalk.yellow('\n建议:'))
    console.error(chalk.gray('  1. 检查网络连接'))
    console.error(chalk.gray('  2. 手动重试: node lib/postinstall.js'))
    console.error(chalk.gray('  3. 指定源: FFMPEG_PROXY_INDEX=1~20 node lib/postinstall.js'))
    console.log('\n' + separator + '\n')
    process.exit(0) // 不阻止安装
  }
}

main()
