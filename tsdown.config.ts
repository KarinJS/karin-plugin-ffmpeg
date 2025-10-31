import { defineConfig } from 'tsdown'
import type { Options } from 'tsdown'

/**
 * @description `tsdown` configuration options
 */
export const options: Options = {
  entry: {
    index: 'src/index.ts',
    download: 'src/download.ts',
    postinstall: 'src/postinstall.ts'
  }, // 入口文件
  format: ['esm'], // 输出格式
  target: 'node18', // 目标环境
  sourcemap: false, // 是否生成 sourcemap
  clean: true, // 是否清理输出目录
  dts: true, // 生成类型定义文件
  outDir: 'lib', // 输出目录
  treeshake: false, // 树摇优化
  minify: false, // 压缩代码
  external: [
    'node-karin',
  ],
  shims: true,
  bundle: true, // 打包所有依赖
}

export default defineConfig(options)
