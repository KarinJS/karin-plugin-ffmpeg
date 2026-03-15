import { builtinModules } from 'node:module'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'web.config': 'src/web.config.ts',
  }, // 入口文件
  format: ['esm'], // 输出格式
  target: 'node22', // 目标环境
  sourcemap: false, // 是否生成 sourcemap
  clean: true, // 是否清理输出目录
  dts: true, // 生成类型定义文件
  outDir: 'dist', // 输出目录
  treeshake: false, // 树摇优化
  minify: false, // 压缩代码
  deps: {
    neverBundle: [
      ...builtinModules,
      ...builtinModules.map((mod) => `node:${mod}`),
      ...[/^node-karin/],
    ],
  },
  shims: true,
  unbundle: false, // 打包所有依赖
})
