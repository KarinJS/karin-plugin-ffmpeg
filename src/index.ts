import { FFPaths } from '@/types'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import axios from 'node-karin/axios'
import { cfg } from './utils/Config'
import { logger } from 'node-karin'
import { Root } from './root'

/**
 * 镜像条目类型
 * @property id 条目 ID
 * @property category 类别
 * @property name 名称
 * @property date 创建时间
 * @property type 条目类型
 * @property url 下载地址
 * @property modified 修改时间
 * @property size 文件大小
 */
type MirrorEntry = {
  id: string
  category: string
  name: string
  date: string
  type: 'dir' | 'file'
  url: string
  modified: string
  size?: number
}

/**
 * tar 执行函数
 * @param file 可执行文件
 * @param args 参数
 */
const execFileAsync = promisify(execFile)

/**
 * 解压 tar.xz 压缩包
 * @param archivePath 压缩包路径
 * @param targetDir 目标目录
 */
const extractArchive = async (archivePath: string, targetDir: string): Promise<void> => {
  const args = ['-xf', archivePath, '-C', targetDir]
  try {
    await execFileAsync('tar', args)
  } catch (error) {
    throw new Error('系统未找到可用的 tar 命令或解压失败')
  }
}

/**
 * 镜像根地址
 */
const mirrorRootUrl = 'https://registry.npmmirror.com/-/binary/ffmpeg-builds/'

/**
 * 版本缓存根目录
 */
const cacheRoot = path.join(os.homedir(), '.cache', 'ffmpeg')

/**
 * 当前缓存路径
 */
let cachedPaths: FFPaths = {
  ffmpegPath: null,
  ffprobePath: null,
  ffplayPath: null
}

/**
 * 初始化 Promise
 */
let initPromise: Promise<FFPaths> | null = null

/**
 * 解析版本号
 * @param dirName 目录名
 * @param platformKey 平台标识
 * @returns 版本号
 */
const parseVersionFromDir = (dirName: string, platformKey: string): string | null => {
  const prefix = `ffmpeg-${platformKey}-`
  if (!dirName.startsWith(prefix)) return null
  return dirName.slice(prefix.length)
}

/**
 * 同步查找缓存二进制
 * @param platformKey 平台标识
 * @returns 二进制路径
 */
const findCachedPathsSync = (platformKey: string): FFPaths => {
  if (!fs.existsSync(cacheRoot)) {
    return { ffmpegPath: null, ffprobePath: null, ffplayPath: null }
  }

  const extension = process.platform === 'win32' ? '.exe' : ''
  const entries = fs.readdirSync(cacheRoot, { withFileTypes: true })
  const candidates = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .map(name => ({ name, version: parseVersionFromDir(name, platformKey) }))
    .filter(item => item.version !== null) as Array<{ name: string, version: string }>

  if (candidates.length === 0) {
    return { ffmpegPath: null, ffprobePath: null, ffplayPath: null }
  }

  candidates.sort((a, b) => compareVersions(a.version, b.version)).reverse()

  for (const candidate of candidates) {
    const versionDir = path.join(cacheRoot, candidate.name)
    const extractedDir = fs.readdirSync(versionDir, { withFileTypes: true })
      .find(entry => entry.isDirectory() && entry.name.startsWith(`ffmpeg-${candidate.version}-${platformKey}-`))
    if (!extractedDir) continue
    const binDir = path.join(versionDir, extractedDir.name, 'bin')
    const ffmpegPath = path.join(binDir, `ffmpeg${extension}`)
    const ffprobePath = path.join(binDir, `ffprobe${extension}`)
    const ffplayPath = path.join(binDir, `ffplay${extension}`)
    if (fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath)) {
      return {
        ffmpegPath,
        ffprobePath,
        ffplayPath: fs.existsSync(ffplayPath) ? ffplayPath : null
      }
    }
  }

  return { ffmpegPath: null, ffprobePath: null, ffplayPath: null }
}

/**
 * 读取 JSON 列表
 * @param url 请求地址
 * @returns JSON 数据
 */
const fetchJson = async <T> (url: string): Promise<T> => {
  const response = await axios.get<T>(url, { responseType: 'json' })
  return response.data
}

/**
 * 版本号对比
 * @param a 版本号 A
 * @param b 版本号 B
 * @returns 对比结果
 */
const compareVersions = (a: string, b: string): number => {
  const aParts = a.split('.').map(part => Number(part))
  const bParts = b.split('.').map(part => Number(part))
  const length = Math.max(aParts.length, bParts.length)

  for (let index = 0; index < length; index += 1) {
    const aValue = aParts[index] ?? 0
    const bValue = bParts[index] ?? 0
    if (aValue !== bValue) return aValue - bValue
  }

  return 0
}

/**
 * 读取可用版本
 * @returns 版本号列表
 */
const fetchAvailableVersions = async (): Promise<string[]> => {
  const list = await fetchJson<MirrorEntry[]>(mirrorRootUrl)
  return list
    .filter(item => item.type === 'dir' && item.name.startsWith('v'))
    .map(item => item.name.replace('/', '').replace(/^v/, ''))
}

/**
 * 获取版本候选列表
 * @returns 版本候选列表
 */
const resolveVersionCandidates = async (): Promise<string[]> => {
  const versions = await fetchAvailableVersions()
  if (versions.length === 0) {
    throw new Error('未找到可用版本')
  }
  return versions.sort(compareVersions).reverse()
}

/**
 * 计算平台标识
 * @returns 平台标识
 */
const resolvePlatformKey = (): string | null => {
  const platform = process.platform
  const arch = process.arch

  if (platform === 'win32') {
    if (arch === 'x64') return 'win32-x64'
    if (arch === 'arm64') return 'win32-arm64'
    if (arch === 'ia32') return 'win32-ia32'
  }

  if (platform === 'linux') {
    if (arch === 'x64') return 'linux-x64'
    if (arch === 'arm64') return 'linux-arm64'
    if (arch === 'ia32') return 'linux-ia32'
  }

  return null
}

/**
 * 异步查找缓存二进制
 * @param platformKey 平台标识
 * @returns 二进制路径
 */
const findCachedPaths = async (platformKey: string): Promise<FFPaths> => {
  if (!await fs.promises.stat(cacheRoot).then(() => true).catch(() => false)) {
    return { ffmpegPath: null, ffprobePath: null, ffplayPath: null }
  }

  const extension = process.platform === 'win32' ? '.exe' : ''
  const entries = await fs.promises.readdir(cacheRoot, { withFileTypes: true })
  const candidates = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .map(name => ({ name, version: parseVersionFromDir(name, platformKey) }))
    .filter(item => item.version !== null) as Array<{ name: string, version: string }>

  if (candidates.length === 0) {
    return { ffmpegPath: null, ffprobePath: null, ffplayPath: null }
  }

  candidates.sort((a, b) => compareVersions(a.version, b.version)).reverse()

  for (const candidate of candidates) {
    const versionDir = path.join(cacheRoot, candidate.name)
    const extractedDir = (await fs.promises.readdir(versionDir, { withFileTypes: true }))
      .find(entry => entry.isDirectory() && entry.name.startsWith(`ffmpeg-${candidate.version}-${platformKey}-`))
    if (!extractedDir) continue
    const binDir = path.join(versionDir, extractedDir.name, 'bin')
    const ffmpegPath = path.join(binDir, `ffmpeg${extension}`)
    const ffprobePath = path.join(binDir, `ffprobe${extension}`)
    const ffplayPath = path.join(binDir, `ffplay${extension}`)
    if (await fileExists(ffmpegPath) && await fileExists(ffprobePath)) {
      return {
        ffmpegPath,
        ffprobePath,
        ffplayPath: await fileExists(ffplayPath) ? ffplayPath : null
      }
    }
  }

  return { ffmpegPath: null, ffprobePath: null, ffplayPath: null }
}

const platformKeyForSync = resolvePlatformKey()
if (platformKeyForSync) {
  cachedPaths = findCachedPathsSync(platformKeyForSync)
}

/**
 * 选择下载文件
 * @param entries 镜像条目
 * @param version 版本号
 * @param platformKey 平台标识
 * @returns 选中的条目
 */
const selectArchiveEntry = (entries: MirrorEntry[], version: string, platformKey: string): MirrorEntry | null => {
  const prefix = `ffmpeg-${version}-${platformKey}-`
  const candidates = entries.filter(item => item.type === 'file' && item.name.startsWith(prefix) && item.name.endsWith('.tar.xz'))

  const prioritySuffixes = [
    'gpl.tar.xz',
    'lgpl.tar.xz',
    'gpl-shared.tar.xz',
    'lgpl-shared.tar.xz'
  ]

  for (const suffix of prioritySuffixes) {
    const match = candidates.find(item => item.name.endsWith(suffix))
    if (match) return match
  }

  return candidates[0] ?? null
}

/**
 * 检查文件是否存在
 * @param filePath 文件路径
 * @returns 是否存在
 */
const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    const stats = await fs.promises.stat(filePath)
    return stats.isFile() && stats.size > 0
  } catch {
    return false
  }
}

/**
 * 递归查找文件
 * @param dir 目录路径
 * @param pattern 匹配正则
 * @returns 匹配结果
 */
const findFiles = async (dir: string, pattern: RegExp): Promise<string[]> => {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
  const results: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const subResults = await findFiles(fullPath, pattern)
      results.push(...subResults)
    } else if (pattern.test(fullPath)) {
      results.push(fullPath)
    }
  }

  return results
}

/**
 * 规范化可执行文件路径
 * @param targetDir 目标目录
 * @param binaryName 二进制名称
 * @param extension 扩展名
 * @returns 二进制路径
 */
const normalizeBinaryPath = async (targetDir: string, binaryName: string, extension: string): Promise<string | null> => {
  const candidates = await findFiles(targetDir, new RegExp(`[/\\\\]bin[/\\\\]${binaryName}${extension}$`, 'i'))

  if (candidates.length === 0) {
    return null
  }

  return candidates[0]
}

/**
 * 清理根目录旧二进制
 * @param targetDir 目标目录
 * @param extension 扩展名
 */
const cleanupRootBinaries = async (targetDir: string, extension: string): Promise<void> => {
  const binaries = ['ffmpeg', 'ffprobe', 'ffplay']
  for (const binary of binaries) {
    const filePath = path.join(targetDir, `${binary}${extension}`)
    if (await fileExists(filePath)) {
      await fs.promises.unlink(filePath).catch(() => { })
    }
  }
}

/**
 * 设置可执行权限
 * @param filePath 文件路径
 */
const ensureExecutable = async (filePath: string | null): Promise<void> => {
  if (!filePath) return
  if (process.platform === 'win32') return
  try {
    await fs.promises.chmod(filePath, 0o755)
  } catch { }
}

const formatBytes = (value: number): string => {
  if (!Number.isFinite(value)) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const rounded = Math.ceil(seconds)
  const mins = Math.floor(rounded / 60)
  const secs = rounded % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const renderProgressLine = (label: string, received: number, total: number, startTime: number): void => {
  if (!process.stdout.isTTY) return
  const elapsed = Math.max((Date.now() - startTime) / 1000, 0.1)
  const speed = received / elapsed
  if (total > 0) {
    const ratio = Math.min(received / total, 1)
    const barWidth = 24
    const filled = Math.round(ratio * barWidth)
    const bar = `${'█'.repeat(filled)}${'░'.repeat(barWidth - filled)}`
    const percent = Math.round(ratio * 100)
    const remaining = Math.max(total - received, 0)
    const eta = speed > 0 ? formatDuration(remaining / speed) : '00:00'
    process.stdout.write(`\r下载中 FFmpeg ${label} ${percent}% ${bar} ${formatBytes(received)}/${formatBytes(total)} ${formatBytes(speed)}/s ETA ${eta}`)
  } else {
    process.stdout.write(`\r下载中 FFmpeg ${label} ${formatBytes(received)} ${formatBytes(speed)}/s`)
  }
}

/**
 * 下载压缩包
 * @param url 下载地址
 * @param archivePath 目标路径
 */
const downloadArchive = async (url: string, archivePath: string, label: string): Promise<void> => {
  const tempPath = `${archivePath}.downloading`
  const response = await axios.get<NodeJS.ReadableStream>(url, { responseType: 'stream' })
  const total = Number(response.headers['content-length'] ?? 0)
  let received = 0
  let lastRender = 0
  const startTime = Date.now()
  response.data.on('data', (chunk: Buffer) => {
    received += chunk.length
    const now = Date.now()
    if (now - lastRender >= 120) {
      lastRender = now
      renderProgressLine(label, received, total, startTime)
    }
  })
  const fileStream = fs.createWriteStream(tempPath)
  try {
    await pipeline(response.data, fileStream)
  } catch (error) {
    await fs.promises.unlink(tempPath).catch(() => { })
    if (process.stdout.isTTY) process.stdout.write('\n')
    throw error
  }
  renderProgressLine(label, received, total, startTime)
  if (process.stdout.isTTY) process.stdout.write('\n')
  await fs.promises.rename(tempPath, archivePath)
}

/**
 * 校验压缩包头
 * @param archivePath 压缩包路径
 * @returns 是否有效
 */
const verifyArchiveHeader = async (archivePath: string): Promise<boolean> => {
  const fileHandle = await fs.promises.open(archivePath, 'r')
  const headerBuffer = Buffer.alloc(6)
  await fileHandle.read(headerBuffer, 0, 6, 0)
  await fileHandle.close()
  const magicHeader = Buffer.from([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])
  return headerBuffer.equals(magicHeader)
}

/**
 * 下载并解压
 * @param version 版本号
 * @param platformKey 平台标识
 * @returns 二进制路径
 */
const downloadAndExtract = async (version: string, platformKey: string): Promise<FFPaths> => {
  const versionDir = path.join(cacheRoot, `ffmpeg-${platformKey}-${version}`)
  await fs.promises.mkdir(versionDir, { recursive: true })

  const extension = process.platform === 'win32' ? '.exe' : ''
  const ffmpegTarget = path.join(versionDir, `ffmpeg${extension}`)
  const ffprobeTarget = path.join(versionDir, `ffprobe${extension}`)
  const ffplayTarget = path.join(versionDir, `ffplay${extension}`)

  const exists = await Promise.all([
    fileExists(ffmpegTarget),
    fileExists(ffprobeTarget)
  ])

  if (exists.every(Boolean)) {
    return {
      ffmpegPath: ffmpegTarget,
      ffprobePath: ffprobeTarget,
      ffplayPath: await fileExists(ffplayTarget) ? ffplayTarget : null
    }
  }

  const listUrl = `${mirrorRootUrl}v${version}/`
  const entries = await fetchJson<MirrorEntry[]>(listUrl)
  const selected = selectArchiveEntry(entries, version, platformKey)

  if (!selected) {
    throw new Error(`未找到对应平台的压缩包: ${platformKey}`)
  }

  const archivePath = path.join(versionDir, selected.name)

  const label = `v${version} ${platformKey}`
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await downloadArchive(selected.url, archivePath, label)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOSPC') {
        throw error
      }
      if (attempt === 1) throw error
      continue
    }
    const isValid = await verifyArchiveHeader(archivePath)
    if (!isValid) {
      await fs.promises.unlink(archivePath).catch(() => { })
      continue
    }

    try {
      await extractArchive(archivePath, versionDir)
      await fs.promises.unlink(archivePath).catch(() => { })
      logger.info(`解压完成: ${versionDir}`)
      break
    } catch (error) {
      await fs.promises.unlink(archivePath).catch(() => { })
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOSPC') {
        throw error
      }
      if (attempt === 1) throw error
    }
  }

  await cleanupRootBinaries(versionDir, extension)

  const ffmpegPath = await normalizeBinaryPath(versionDir, 'ffmpeg', extension)
  const ffprobePath = await normalizeBinaryPath(versionDir, 'ffprobe', extension)
  const ffplayPath = await normalizeBinaryPath(versionDir, 'ffplay', extension)

  await ensureExecutable(ffmpegPath)
  await ensureExecutable(ffprobePath)
  await ensureExecutable(ffplayPath)

  return { ffmpegPath, ffprobePath, ffplayPath }
}

/**
 * 解析并准备路径
 * @returns 二进制路径
 */
const resolvePathsAsync = async (): Promise<FFPaths> => {
  const platformKey = resolvePlatformKey()
  if (!platformKey) {
    return { ffmpegPath: null, ffprobePath: null, ffplayPath: null }
  }

  const cached = await findCachedPaths(platformKey)
  if (cached.ffmpegPath && cached.ffprobePath) {
    cachedPaths = cached
    return cached
  }

  const versions = await resolveVersionCandidates()
  let lastError: unknown = null

  for (const version of versions) {
    try {
      const nextPaths = await downloadAndExtract(version, platformKey)
      cachedPaths = nextPaths
      return nextPaths
    } catch (error) {
      lastError = error
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }
  throw new Error('下载失败')
}

/**
 * 保证初始化完成
 * @returns 二进制路径
 */
const ensureInitialized = async (): Promise<FFPaths> => {
  if (!initPromise) {
    initPromise = resolvePathsAsync()
  }
  const result = await initPromise
  logger.info(`${logger.violet('[插件:@karinjs/plugin-ffmpeg]')} ${logger.green(`v${Root.version}`)} 初始化完成`)
  return result
}

/**
 * 异步初始化
 * @returns 二进制路径
 */
const initializeAsync = async (): Promise<FFPaths> => {
  try {
    return await ensureInitialized()
  } catch (error) {
    console.error('初始化FFmpeg组件失败:', error)
    return cachedPaths
  }
}

const initializeSync = (): FFPaths => {
  const platformKey = resolvePlatformKey()
  if (platformKey) {
    const cached = findCachedPathsSync(platformKey)
    if (cached.ffmpegPath && cached.ffprobePath) {
      cachedPaths = cached
    }
  }
  return cachedPaths
}

/**
 * 检查指定版本是否已下载
 * @param version 版本号
 * @returns 是否存在
 */
export const checkVersionExists = async (version: string): Promise<boolean> => {
  const platformKey = resolvePlatformKey()
  if (!platformKey) return false

  const versionDir = path.join(cacheRoot, `ffmpeg-${platformKey}-${version}`)
  if (!fs.existsSync(versionDir)) return false

  const extension = process.platform === 'win32' ? '.exe' : ''
  const ffmpegPath = await normalizeBinaryPath(versionDir, 'ffmpeg', extension)
  const ffprobePath = await normalizeBinaryPath(versionDir, 'ffprobe', extension)

  return !!(ffmpegPath && ffprobePath && await fileExists(ffmpegPath) && await fileExists(ffprobePath))
}

/**
 * 下载指定版本的 FFmpeg
 * @param version 版本号
 */
export const downloadFFmpegVersion = async (version: string): Promise<void> => {
  const platformKey = resolvePlatformKey()
  if (!platformKey) {
    throw new Error('不支持的平台')
  }

  const paths = await downloadAndExtract(version, platformKey)
  cachedPaths = paths
  initPromise = Promise.resolve(paths)
}

/**
 * 删除其他版本的 FFmpeg
 * @param keepVersion 保留的版本号
 */
export const cleanupOtherVersions = async (keepVersion: string): Promise<void> => {
  const platformKey = resolvePlatformKey()
  if (!platformKey) return

  if (!fs.existsSync(cacheRoot)) return

  const entries = await fs.promises.readdir(cacheRoot, { withFileTypes: true })
  const keepDirName = `ffmpeg-${platformKey}-${keepVersion}`

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith(`ffmpeg-${platformKey}-`) && entry.name !== keepDirName) {
      const dirPath = path.join(cacheRoot, entry.name)
      try {
        await fs.promises.rm(dirPath, { recursive: true, force: true })
        console.log(`已删除旧版本: ${entry.name}`)
      } catch (error) {
        console.error(`删除旧版本失败: ${entry.name}`, error)
      }
    }
  }
}

void ensureInitialized()
void cfg.get()

/**
 * FFmpeg 工具集
 */
export const ffmpegTools = {
  /**
   * FFmpeg 路径
   * @returns 路径
   */
  get ffmpegPath (): string | null {
    return cachedPaths.ffmpegPath
  },
  /**
   * FFprobe 路径
   * @returns 路径
   */
  get ffprobePath (): string | null {
    return cachedPaths.ffprobePath
  },
  /**
   * FFplay 路径
   * @returns 路径
   */
  get ffplayPath (): string | null {
    return cachedPaths.ffplayPath
  },
  /**
   * 等待初始化完成
   * @returns 二进制路径
   */
  async ready (): Promise<FFPaths> {
    return initializeAsync()
  },
  readySync (): FFPaths {
    return initializeSync()
  }
}

/**
 * 默认导出
 */
export default {
  /**
   * FFmpeg 路径
   * @returns 路径
   */
  get ffmpegPath (): string | null {
    return cachedPaths.ffmpegPath
  },
  /**
   * FFprobe 路径
   * @returns 路径
   */
  get ffprobePath (): string | null {
    return cachedPaths.ffprobePath
  },
  /**
   * FFplay 路径
   * @returns 路径
   */
  get ffplayPath (): string | null {
    return cachedPaths.ffplayPath
  },
  /**
   * 等待初始化完成
   * @returns 二进制路径
   */
  async ready (): Promise<FFPaths> {
    return initializeAsync()
  },
  readySync (): FFPaths {
    return initializeSync()
  }
}
