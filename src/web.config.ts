import { components, defineConfig, logger } from 'node-karin'
import _ from 'node-karin/lodash'
import { Root } from '@/root'
import type { ConfigType } from './types'
import { cfg } from './utils/Config'
import { checkVersionExists, downloadFFmpegVersion, cleanupOtherVersions } from './index'

export default defineConfig({
  info: {
    id: '@karinjs/plugin-ffmpeg',
    name: 'FFmpeg 插件',
    description: `一个为 Karin 提供开箱即用的 FFmpeg 二进制文件的插件。v${Root.version}`,
    icon: {
      name: 'video_settings',
      color: '#12f352ff'
    },
    version: Root.version,
    author: [
      {
        name: 'ikenxuan',
        home: 'https://github.com/ikenxuan',
        avatar: 'https://github.com/ikenxuan.png'
      }
    ]
  },
  components: async () => {
    const Config = cfg.get()
    return [
      components.radio.group('ffmpegVersion', {
        label: '定义 FFmpeg 版本',
        orientation: 'vertical',
        description: '选择下载并提供的 FFmpeg 版本，默认使用 8.0',
        defaultValue: Config.ffmpegVersion,
        radio: [
          components.radio.create('ffmpegVersion:radio-1', {
            label: 'FFmpeg 8.0',
            value: '8.0'
          }),
          components.radio.create('ffmpegVersion:radio-2', {
            label: 'FFmpeg 7.1',
            value: '7.1'
          }),
          components.radio.create('ffmpegVersion:radio-3', {
            label: 'FFmpeg 6.1',
            value: '6.1'
          }),
        ]
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
          const version = config.ffmpegVersion
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
        message: `保存成功，正在后台下载 FFmpeg v${config.ffmpegVersion}，请稍后查看日志`
      }
    }

    // 版本未变化，正常返回
    return {
      success: true,
      message: '保存成功'
    }
  }
})