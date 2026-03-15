import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { karinPathBase } from 'node-karin'

const __filename = fileURLToPath(import.meta.url)
let filePath = path.resolve(__filename.replace(/\\/g, '/'), '../../..')
if (!fs.existsSync(path.join(filePath, 'package.json'))) {
  filePath = path.resolve(__filename.replace(/\\/g, '/'), '../..')
}

const readPackageJson = () => {
  const pkgPath = path.join(filePath, 'package.json')
  const content = fs.readFileSync(pkgPath, 'utf-8')
  return JSON.parse(content)
}

let cachedPkg: any = null

export const Root = {
  /** 插件绝对路径 */
  dir: filePath,
  /** 插件 package.json */
  get pkg () {
    if (!cachedPkg) {
      cachedPkg = readPackageJson()
    }
    return cachedPkg
  },
  /** 插件名 */
  get name () {
    return this.pkg.name.replace(/\//g, '-')
  },
  /** 插件版本 */
  get version () {
    return this.pkg.version
  },
  /** 插件在 @karinjs 中的目录 */
  get BaseDir () {
    return path.join(karinPathBase, this.name)
  },
  /** 配置文件路径 */
  get ConfigDir () {
    return path.join(this.BaseDir, 'config')
  }
}