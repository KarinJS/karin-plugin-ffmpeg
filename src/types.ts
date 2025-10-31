/**
 * 存储FFmpeg相关二进制文件路径的接口
 */
export interface FFPaths {
  ffmpegPath: string | null
  ffprobePath: string | null
  ffplayPath: string | null
}

/**
 * 下载源配置接口
 */
export interface DownloadSource {
  name: string
  baseUrl: string
}

/**
 * 系统信息接口
 */
export interface SystemInfo {
  platform: 'win32' | 'darwin' | 'linux'
  arch: 'x64' | 'arm64' | 'ia32'
  extension: string
}
