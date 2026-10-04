import { components, defineConfig, logger } from 'node-karin'
import { Root } from '@/root'
import type { ConfigType } from './types'
import { cfg } from './utils/Config'
import {
  checkVersionExists,
  cleanupOtherVersions,
  downloadFFmpegVersion,
  getAvailableVersions,
  resolveVersion,
} from './index'

export default defineConfig({
  info: {
    id: '@karinjs/plugin-ffmpeg',
    name: 'FFmpeg 插件',
    description: `一个为 Karin 提供开箱即用的 FFmpeg 二进制文件的插件。v${Root.version}`,
    icon: {
      name: 'video_settings',
      color: '#12f352ff',
    },
    version: Root.version,
    author: [
      {
        name: 'KarinJS',
        home: 'https://github.com/KarinJS',
        avatar: 'https://github.com/KarinJS.png',
      },
      {
        name: 'ikenxuan',
        home: 'https://github.com/ikenxuan',
        avatar: 'https://github.com/ikenxuan.png',
      },
    ],
  },
  components: async () => {
    const Config = cfg.get()
    // 版本线列表来自镜像源，随上游发布自动增长
    const releases = await getAvailableVersions()

    // 确保当前配置的版本始终出现在选项中
    if (!releases.some(item => item.version === Config.ffmpegVersion)) {
      releases.unshift({ version: Config.ffmpegVersion, latest: Config.ffmpegVersion })
    }

    return [
      components.radio.group('ffmpegVersion', {
        label: 'FFmpeg 版本选择',
        orientation: 'vertical',
        description:
          '选择要使用的 FFmpeg 版本线，保存后自动下载该版本线的最新构建并清理旧版本文件。列表来自镜像源，随上游发布自动更新',
        defaultValue: Config.ffmpegVersion,
        radio: releases.map((release, index) =>
          components.radio.create(`ffmpegVersion:radio-${index + 1}`, {
            label: `FFmpeg ${release.version}`,
            value: release.version,
            description:
              index === 0
                ? `最新版本线，将自动下载最新构建 v${release.latest}，推荐使用`
                : `将自动下载该版本线的最新构建 v${release.latest}`,
          }),
        ),
      }),
    ]
  },

  /** 前端点击保存之后调用的方法 */
  save: async (config: ConfigType) => {
    const oldConfig = cfg.get()
    const versionChanged = oldConfig.ffmpegVersion !== config.ffmpegVersion

    // 先保存配置
    cfg.write(config)

    // 如果版本变化，异步处理下载
    if (versionChanged) {
      // 不等待，异步执行
      void (async () => {
        try {
          // 版本线解析为镜像上的最新构建（如 8.1 -> 8.1.3）
          const version = await resolveVersion(config.ffmpegVersion)
          logger.info(`检测到 FFmpeg 版本变更: ${oldConfig.ffmpegVersion} -> ${version}`)

          // 检查版本是否已存在
          const exists = await checkVersionExists(version)
          if (exists) {
            logger.info(`FFmpeg v${version} 已存在，跳过下载`)
          } else {
            logger.info(`开始下载 FFmpeg v${version}`)
            await downloadFFmpegVersion(version)
          }

          // 清理其他版本
          await cleanupOtherVersions(version)
          logger.info('旧版本清理完成')
        } catch (error) {
          logger.error('FFmpeg 版本更新失败:', error)
        }
      })()

      // 返回版本变更提示
      return {
        success: true,
        message: `保存成功，正在后台下载 FFmpeg v${config.ffmpegVersion}，请稍后查看日志`,
      }
    }

    // 版本未变化，正常返回
    return {
      success: true,
      message: '保存成功',
    }
  },
})
