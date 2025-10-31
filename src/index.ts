import { FFPaths } from './types'
import { getSystemInfo, getStorageDir, checkFileExists } from './download'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** 同步获取存储目录 */
const getStorageDirSync = (): string => {
  const packageRoot = path.resolve(__dirname, '..')

  // 找到项目根目录的 node_modules
  const parts = packageRoot.split(path.sep)
  const firstNodeModulesIndex = parts.indexOf('node_modules')

  let projectNodeModules: string
  if (firstNodeModulesIndex !== -1) {
    projectNodeModules = path.join(...parts.slice(0, firstNodeModulesIndex + 1))
  } else {
    projectNodeModules = packageRoot
  }

  // 将二进制文件存储在 node_modules/.ffmpeg
  const storageDir = path.join(projectNodeModules, '.ffmpeg')

  // 同步创建目录（如果不存在）
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true })
  }

  return storageDir
}

/** 同步检查文件是否存在 */
const checkFileExistsSync = (filePath: string): boolean => {
  try {
    fs.accessSync(filePath, fs.constants.F_OK)
    const stats = fs.statSync(filePath)
    return stats.isFile() && stats.size > 0
  } catch {
    return false
  }
}

/** 同步初始化函数 */
const initializeSync = (): FFPaths => {
  try {
    const systemInfo = getSystemInfo()
    const storageDir = getStorageDirSync()

    // 检查文件是否存在
    const ffmpegPath = path.join(storageDir, `ffmpeg${systemInfo.extension}`)
    const ffprobePath = path.join(storageDir, `ffprobe${systemInfo.extension}`)
    const ffplayPath = path.join(storageDir, `ffplay${systemInfo.extension}`)

    const ffmpegExists = checkFileExistsSync(ffmpegPath)
    const ffprobeExists = checkFileExistsSync(ffprobePath)
    const ffplayExists = checkFileExistsSync(ffplayPath)

    return {
      ffmpegPath: ffmpegExists ? ffmpegPath : null,
      ffprobePath: ffprobeExists ? ffprobePath : null,
      ffplayPath: ffplayExists ? ffplayPath : null
    }
  } catch (error) {
    console.error('初始化FFmpeg组件失败:', error)
    return {
      ffmpegPath: null,
      ffprobePath: null,
      ffplayPath: null
    }
  }
}

/** 异步初始化函数（用于 ready() 方法） */
const initializeAsync = async (): Promise<FFPaths> => {
  try {
    const systemInfo = getSystemInfo()
    const storageDir = await getStorageDir()

    // 检查文件是否存在
    const ffmpegPath = path.join(storageDir, `ffmpeg${systemInfo.extension}`)
    const ffprobePath = path.join(storageDir, `ffprobe${systemInfo.extension}`)
    const ffplayPath = path.join(storageDir, `ffplay${systemInfo.extension}`)

    const [ffmpegExists, ffprobeExists, ffplayExists] = await Promise.all([
      checkFileExists(ffmpegPath),
      checkFileExists(ffprobePath),
      checkFileExists(ffplayPath)
    ])

    return {
      ffmpegPath: ffmpegExists ? ffmpegPath : null,
      ffprobePath: ffprobeExists ? ffprobePath : null,
      ffplayPath: ffplayExists ? ffplayPath : null
    }
  } catch (error) {
    console.error('初始化FFmpeg组件失败:', error)
    return {
      ffmpegPath: null,
      ffprobePath: null,
      ffplayPath: null
    }
  }
}

/** 模块加载时立即同步初始化 */
const ffPaths: FFPaths = initializeSync()

export const ffmpegTools = {
  get ffmpegPath (): string | null {
    return ffPaths.ffmpegPath
  },
  get ffprobePath (): string | null {
    return ffPaths.ffprobePath
  },
  get ffplayPath (): string | null {
    return ffPaths.ffplayPath
  },
  async ready (): Promise<FFPaths> {
    return initializeAsync()
  }
}

export default {
  get ffmpegPath (): string | null {
    return ffPaths.ffmpegPath
  },
  get ffprobePath (): string | null {
    return ffPaths.ffprobePath
  },
  get ffplayPath (): string | null {
    return ffPaths.ffplayPath
  },
  ready: initializeAsync
}
