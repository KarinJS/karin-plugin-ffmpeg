# @karinjs/plugin-ffmpeg

一个为 Karin 提供开箱即用的 FFmpeg 二进制文件的插件，运行时自动下载 FFmpeg。

## 📦 安装

```bash
pnpm add @karinjs/plugin-ffmpeg -w
```

运行时会从淘宝源镜像下载 FFmpeg、FFprobe 和 FFplay（仅 Windows）二进制文件。

## 🛠️ 开发

### 本地开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build
# 测试
pnpm test

# 代码检查
pnpm lint

# 格式化
pnpm fmt
```

### 使用方式

```ts
import ffmpeg, { getAvailableVersions, resolveVersion } from '@karinjs/plugin-ffmpeg'

const paths = await ffmpeg.ready()
console.log(paths.ffmpegPath)

const syncPaths = ffmpeg.readySync()
console.log(syncPaths.ffmpegPath)
```

### FFmpeg 版本

Web 面板中的版本列表来自镜像源，随上游发布自动增长，无需手动维护。
每条版本线（如 `8.1`）在保存后会自动解析并下载其在镜像上的最新构建（如 `8.1.3`）。

也可以在代码中使用：

```ts
// 获取可用版本线（新版本在前）
const lines = await getAvailableVersions()
// 将版本线解析为镜像上的最新构建版本号
const version = await resolveVersion('8.1')
```

### 项目结构

```
src/
├── index.ts        # 主入口，提供 FFmpeg 路径访问
└── types.ts        # TypeScript 类型定义

dist/               # 编译输出目录
├── index.mjs
└── index.d.mts
```

## 💡 常见问题

### 下载失败怎么办？

插件会自动从淘宝源镜像拉取可用版本并下载匹配平台的包，如果所有源都失败，请检查网络连接与镜像是否可访问。

运行时解压依赖系统 tar 命令，请确保系统可用。

### FFmpeg 来源

本插件使用 [KarinJS/FFmpeg-Builds](https://github.com/KarinJS/FFmpeg-Builds) 的构建产物，并通过淘宝源镜像下载。

### 下载源列表

下载镜像入口：

- https://registry.npmmirror.com/-/binary/ffmpeg-builds/

### 支持哪些平台？

- Windows (x64, x86)
- Linux (x64, arm64, i686)
- macOS (暂不支持，构建产物不包含 darwin 目标)

### 存储位置

FFmpeg 二进制文件会下载到 `~/.cache/ffmpeg/ffmpeg-<platform>-<version>/` 目录中。

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
