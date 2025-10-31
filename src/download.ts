import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import stream from 'node:stream'
import chalk from 'chalk'
import cliProgress from 'cli-progress'
import { SystemInfo, DownloadSource } from './types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** BtbN/FFmpeg-Builds 下载源 */
const DOWNLOAD_SOURCES: DownloadSource[] = [
  {
    name: 'GitHub 官方',
    baseUrl: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  },
  {
    name: 'ghfast 镜像',
    baseUrl: 'https://ghfast.top/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  },
  {
    name: 'git.yylx 镜像',
    baseUrl: 'https://git.yylx.win/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  },
  {
    name: 'gh-proxy 镜像',
    baseUrl: 'https://gh-proxy.com/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  },
  {
    name: 'ghfile 镜像',
    baseUrl: 'https://ghfile.geekertao.top/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  },
  {
    name: 'gh-proxy.net 镜像',
    baseUrl: 'https://gh-proxy.net/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  },
  {
    name: '1win 镜像',
    baseUrl: 'https://j.1win.ggff.net/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  },
  {
    name: 'ghm 镜像',
    baseUrl: 'https://ghm.078465.xyz/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  },
  {
    name: 'gitproxy 镜像',
    baseUrl: 'https://gitproxy.127731.xyz/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  },
  {
    name: 'jiashu 镜像',
    baseUrl: 'https://jiashu.1win.eu.org/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  },
  {
    name: 'tbedu 镜像',
    baseUrl: 'https://github.tbedu.top/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  },
  {
    name: 'ghproxy 镜像',
    baseUrl: 'https://mirror.ghproxy.com/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/'
  }
]

/** 测试 URL（用于测速） */
const TEST_URL = 'https://raw.githubusercontent.com/BtbN/FFmpeg-Builds/master/README.md'

interface SpeedTestResult {
  source: DownloadSource
  speed: number
  success: boolean
}

/** 格式化速度显示 */
const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond === 0) return '0 B/s'

  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const k = 1024
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))

  return `${(bytesPerSecond / Math.pow(k, i)).toFixed(2)} ${units[i]}`
}

/** 测试单个源的速度 */
const testSourceSpeed = async (source: DownloadSource, timeout: number = 10000): Promise<SpeedTestResult> => {
  const startTime = Date.now()

  try {
    // 构建测试 URL
    const testUrl = source.baseUrl.includes('github.com')
      ? TEST_URL
      : `${source.baseUrl.replace(/\/releases\/download\/latest\/$/, '')}/${TEST_URL}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(testUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'karin-plugin-ffmpeg/1.0.0'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { source, speed: 0, success: false }
    }

    // 读取响应体来测速
    const buffer = await response.arrayBuffer()
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000 // 秒
    const speed = buffer.byteLength / duration // bytes per second

    return { source, speed, success: true }
  } catch (error) {
    return { source, speed: 0, success: false }
  }
}

/** 测试直连速度 */
const testDirectConnection = async (timeout: number = 10000): Promise<number> => {
  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(TEST_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'karin-plugin-ffmpeg/1.0.0'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) return 0

    const buffer = await response.arrayBuffer()
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000
    const speed = buffer.byteLength / duration

    return speed
  } catch {
    return 0
  }
}

/** 自动选择最快的下载源 */
const selectBestSource = async (): Promise<DownloadSource | null> => {
  console.log(chalk.cyan.bold('🚀 开始网络测速，选择最快的下载源...\n'))

  // 创建测速进度条
  const speedTestBar = new cliProgress.SingleBar({
    format: chalk.cyan('测速进度') + ' |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} 个源',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  })

  const totalSources = DOWNLOAD_SOURCES.length
  speedTestBar.start(totalSources, 0)

  // 测试直连
  const directSpeed = await testDirectConnection()
  speedTestBar.increment()

  let bestSpeed = directSpeed
  let bestSource: DownloadSource | null = directSpeed > 0 ? DOWNLOAD_SOURCES[0] : null

  // 并行测试所有代理源
  const testPromises = DOWNLOAD_SOURCES.slice(1).map(async (source) => {
    const result = await testSourceSpeed(source)
    speedTestBar.increment()
    return result
  })
  const results = await Promise.all(testPromises)

  speedTestBar.stop()

  // 找出最快的源并显示结果
  console.log(chalk.gray('\n测速结果:'))

  if (directSpeed > 0) {
    console.log(chalk.green(`  ✓ 直连 GitHub - ${formatSpeed(directSpeed)}`))
  } else {
    console.log(chalk.red('  ✗ 直连 GitHub - 失败'))
  }

  for (const result of results) {
    if (result.success && result.speed > 0) {
      const isBest = result.speed > bestSpeed
      if (isBest) {
        bestSpeed = result.speed
        bestSource = result.source
      }
      console.log(chalk.green(`  ✓ ${result.source.name} - ${formatSpeed(result.speed)}`))
    } else {
      console.log(chalk.gray(`  ✗ ${result.source.name} - 失败`))
    }
  }

  console.log() // 空行

  if (bestSource) {
    if (bestSource === DOWNLOAD_SOURCES[0] && directSpeed > 0) {
      console.log(chalk.green.bold(`✨ 将使用: 直连 GitHub (${formatSpeed(bestSpeed)})\n`))
    } else {
      console.log(chalk.green.bold(`✨ 将使用: ${bestSource.name} (${formatSpeed(bestSpeed)})\n`))
    }
  } else {
    console.log(chalk.yellow.bold('⚠️  所有源测试失败，将按顺序尝试\n'))
  }

  return bestSource
}

/** 获取系统信息 */
export const getSystemInfo = (): SystemInfo => {
  const platform = process.platform as SystemInfo['platform']
  const arch = process.arch as SystemInfo['arch']

  let extension = ''
  if (platform === 'win32') {
    extension = '.exe'
  }

  return { platform, arch, extension }
}

/** 获取二进制文件存储目录 */
export const getStorageDir = async (): Promise<string> => {
  // 使用 __dirname 获取当前模块所在目录
  const packageRoot = path.resolve(__dirname, '..')

  // 找到项目根目录的 node_modules
  const parts = packageRoot.split(path.sep)
  const firstNodeModulesIndex = parts.indexOf('node_modules')

  let projectNodeModules: string
  if (firstNodeModulesIndex !== -1) {
    // 找到了 node_modules，使用它的父目录作为项目根
    projectNodeModules = path.join(...parts.slice(0, firstNodeModulesIndex + 1))
  } else {
    // 没找到 node_modules（开发环境），使用包根目录
    projectNodeModules = packageRoot
  }

  const baseDir = path.join(projectNodeModules, '.ffmpeg')
  await fs.promises.mkdir(baseDir, { recursive: true })
  return baseDir
}

/** 检查文件是否已存在 */
export const checkFileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK)
    const stats = await fs.promises.stat(filePath)
    return stats.isFile() && stats.size > 0
  } catch {
    return false
  }
}

/** 获取 BtbN/FFmpeg-Builds 的文件名 */
const getBtbNFileName = (systemInfo: SystemInfo): string => {
  const { platform, arch } = systemInfo

  // BtbN/FFmpeg-Builds 的命名规则
  if (platform === 'win32') {
    const archStr = arch === 'x64' ? 'win64' : 'win32'
    return `ffmpeg-master-latest-${archStr}-gpl.zip`
  } else if (platform === 'linux') {
    const archStr = arch === 'arm64' ? 'arm64' : (arch === 'ia32' ? 'i686' : 'amd64')
    return `ffmpeg-master-latest-linux${archStr === 'amd64' ? '64' : archStr}-gpl.tar.xz`
  } else if (platform === 'darwin') {
    // macOS 需要使用其他源，BtbN 不提供 macOS 构建
    return ''
  }

  return ''
}

/** 下载并解压 FFmpeg 压缩包 */
export const downloadFFmpeg = async (
  systemInfo: SystemInfo,
  storageDir: string,
  proxyIndex?: number // 手动指定代理源索引 (0=直连, 1-N=指定源, undefined=自动选择)
): Promise<{ ffmpegPath: string; ffprobePath: string; ffplayPath: string }> => {
  const ffmpegPath = path.join(storageDir, `ffmpeg${systemInfo.extension}`)
  const ffprobePath = path.join(storageDir, `ffprobe${systemInfo.extension}`)
  const ffplayPath = path.join(storageDir, `ffplay${systemInfo.extension}`)

  // 检查是否已下载（提前检查，避免不必要的网络测速）
  const allExist = await Promise.all([
    checkFileExists(ffmpegPath),
    checkFileExists(ffprobePath)
  ])

  if (allExist.every(exists => exists)) {
    console.log(chalk.green.bold('✓ FFmpeg 组件已存在，跳过下载\n'))
    return { ffmpegPath, ffprobePath, ffplayPath }
  }

  // 只有在需要下载时才进行测速和准备
  const fileName = getBtbNFileName(systemInfo)
  if (!fileName) {
    throw new Error(`不支持的平台: ${systemInfo.platform}`)
  }

  let sourcesToTry: DownloadSource[]

  // 处理手动指定代理的情况
  if (proxyIndex !== undefined) {
    if (proxyIndex === 0) {
      console.log(chalk.yellow.bold('⚙️  手动指定: 使用直连（不使用代理）\n'))
      sourcesToTry = [DOWNLOAD_SOURCES[0]] // 只使用官方源
    } else if (proxyIndex > 0 && proxyIndex <= DOWNLOAD_SOURCES.length) {
      const selectedSource = DOWNLOAD_SOURCES[proxyIndex - 1]
      console.log(chalk.yellow.bold(`⚙️  手动指定: 使用 ${selectedSource.name}\n`))
      sourcesToTry = [selectedSource, ...DOWNLOAD_SOURCES.filter(s => s !== selectedSource)]
    } else {
      console.log(chalk.red(`⚠️  无效的代理索引 ${proxyIndex}，将自动选择\n`))
      const bestSource = await selectBestSource()
      sourcesToTry = bestSource
        ? [bestSource, ...DOWNLOAD_SOURCES.filter(s => s !== bestSource)]
        : DOWNLOAD_SOURCES
    }
  } else {
    // 自动选择最快的源
    const bestSource = await selectBestSource()
    sourcesToTry = bestSource
      ? [bestSource, ...DOWNLOAD_SOURCES.filter(s => s !== bestSource)]
      : DOWNLOAD_SOURCES
  }

  // 尝试所有下载源
  for (const source of sourcesToTry) {
    try {
      const url = `${source.baseUrl}${fileName}`
      console.log(chalk.cyan.bold(`📥 正在从 ${source.name} 下载 FFmpeg...`))
      console.log(chalk.gray(`   ${url}\n`))

      const response = await fetch(url)
      if (!response.ok) throw new Error(`下载失败: ${response.statusText}`)

      if (!response.body) throw new Error('响应体为空')

      // 下载到临时文件
      const tempFile = path.join(storageDir, `temp-${Date.now()}${fileName.endsWith('.zip') ? '.zip' : '.tar.xz'}`)

      const reader = response.body.getReader()
      const totalSize = parseInt(response.headers.get('content-length') || '0')
      let downloadedSize = 0
      const startTime = Date.now()

      // 创建下载进度条
      const downloadBar = new cliProgress.SingleBar({
        format: chalk.cyan('下载中') + ' |' + chalk.green('{bar}') + '| {percentage}% | {downloaded}/{total} | {speed} | ETA: {eta}s',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      })

      if (totalSize > 0) {
        downloadBar.start(totalSize, 0, {
          downloaded: '0 MB',
          total: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
          speed: '0 MB/s'
        })
      }

      const nodeStream = new stream.Readable({
        async read () {
          try {
            const { done, value } = await reader.read()
            if (done) {
              this.push(null)
            } else {
              downloadedSize += value.length

              // 更新进度条
              if (totalSize > 0) {
                const now = Date.now()
                const speed = downloadedSize / ((now - startTime) / 1000)
                downloadBar.update(downloadedSize, {
                  downloaded: `${(downloadedSize / 1024 / 1024).toFixed(2)} MB`,
                  total: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
                  speed: formatSpeed(speed)
                })
              }

              this.push(Buffer.from(value))
            }
          } catch (error) {
            this.destroy(error as Error)
          }
        }
      })

      await stream.promises.pipeline(nodeStream, fs.createWriteStream(tempFile))

      if (totalSize > 0) {
        downloadBar.stop()
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
      const avgSpeed = downloadedSize / (Date.now() - startTime) * 1000
      console.log(chalk.green.bold(`\n✓ 下载完成！用时 ${totalTime}s，平均速度 ${formatSpeed(avgSpeed)}`))
      console.log(chalk.cyan('📦 开始解压...\n'))

      // 解压文件
      await extractFFmpeg(tempFile, storageDir, systemInfo)

      // 删除临时文件
      await fs.promises.unlink(tempFile)

      // 在 Unix 系统上添加执行权限
      if (systemInfo.platform !== 'win32') {
        await fs.promises.chmod(ffmpegPath, 0o755)
        await fs.promises.chmod(ffprobePath, 0o755)
      }

      console.log(chalk.green.bold('✓ FFmpeg 安装成功\n'))
      return { ffmpegPath, ffprobePath, ffplayPath }
    } catch (error) {
      console.log(chalk.red(`\n✗ 从 ${source.name} 下载失败:`), chalk.gray(error instanceof Error ? error.message : String(error)))
      // 清理临时文件
      try {
        const tempFiles = [ffmpegPath, ffprobePath, ffplayPath]
        await Promise.all(tempFiles.map(f => fs.promises.unlink(f).catch(() => { })))
      } catch { }
      continue
    }
  }

  throw new Error('所有源都无法下载 FFmpeg')
}

/** 递归查找文件 */
const findFiles = async (dir: string, pattern: RegExp): Promise<string[]> => {
  const { readdir, stat } = await import('fs/promises')
  const results: string[] = []

  const files = await readdir(dir)

  for (const file of files) {
    const fullPath = path.join(dir, file)
    const fileStat = await stat(fullPath)

    if (fileStat.isDirectory()) {
      const subResults = await findFiles(fullPath, pattern)
      results.push(...subResults)
    } else if (pattern.test(fullPath)) {
      results.push(fullPath)
    }
  }

  return results
}

/** 解压 FFmpeg 压缩包 */
const extractFFmpeg = async (archivePath: string, targetDir: string, systemInfo: SystemInfo): Promise<void> => {
  if (archivePath.endsWith('.zip')) {
    // Windows: 使用 unzipper
    const unzipper = await import('unzipper')

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(archivePath)
        .pipe(unzipper.Extract({ path: targetDir }))
        .on('close', () => resolve())
        .on('error', reject)
    })

    // 查找并移动二进制文件到根目录
    const binFiles = await findFiles(targetDir, /bin[/\\](ffmpeg|ffprobe|ffplay)\.exe$/i)

    for (const oldPath of binFiles) {
      const fileName = oldPath.split(/[/\\]/).pop()!
      const newPath = path.join(targetDir, fileName)
      await fs.promises.rename(oldPath, newPath)
    }
  } else {
    // Linux: 使用 tar
    const tar = await import('tar')
    await tar.x({
      file: archivePath,
      cwd: targetDir,
      strip: 2, // 跳过前两层目录
      filter: (path: string) => {
        return path.includes('/bin/ffmpeg') || path.includes('/bin/ffprobe')
      }
    })
  }
}
