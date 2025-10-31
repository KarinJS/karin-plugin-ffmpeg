# @karinjs/plugin-ffmpeg

一个为 Karin 提供开箱即用的 FFmpeg 二进制文件的插件，安装时自动下载 FFmpeg。

## 📦 安装

```bash
pnpm add @karinjs/plugin-ffmpeg -w
```

安装过程中会自动测速并选择最快的镜像源下载 FFmpeg、FFprobe 和 FFplay（仅 Windows）二进制文件。

### ⚠️ pnpm 10 用户注意

如果你使用 pnpm 10，需要使用以下安装命令以允许执行安装脚本：

```bash
pnpm --allow-build=@karinjs/plugin-ffmpeg add @karinjs/plugin-ffmpeg -w
```

这是因为 pnpm 10 为了安全考虑，默认会阻止依赖包的安装脚本执行。本插件需要在安装时下载 FFmpeg 二进制文件，因此必须允许脚本执行。

<!-- ### 安装效果预览

```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
系统信息:
  平台: win32
  架构: x64
  存储: /node_modules/.ffmpeg
  代理: 自动选择
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 开始网络测速，选择最快的下载源...

测速进度 |████████████████████████████████████████| 100% | 12/12 个源

测速结果:
  ✓ 直连 GitHub - 1.48 KB/s
  ✓ ghfast 镜像 - 18.55 KB/s
  ✓ git.yylx 镜像 - 1.68 KB/s
  ...

✨ 将使用: ghfast 镜像 (18.55 KB/s)

📥 正在从 ghfast 镜像 下载 FFmpeg...

下载中 |████████████████████████████████████████| 100% | 197.06 MB/197.06 MB | 44.47 MB/s | ETA: 0s

✓ 下载完成！用时 4.4s，平均速度 44.45 MB/s
📦 开始解压...

✓ FFmpeg 安装成功！
``` -->

<!-- ### 手动指定下载源

如果自动选择的源不理想，可以通过环境变量手动指定：

```bash
# Windows (PowerShell)
$env:FFMPEG_PROXY_INDEX=0; pnpm add @karinjs/plugin-ffmpeg -w

# Linux/macOS
FFMPEG_PROXY_INDEX=0 pnpm add @karinjs/plugin-ffmpeg -w
```

可用的源索引：
- `0` - 直连 GitHub 官方（不使用镜像）
- `1` - GitHub 官方
- `2` - ghfast 镜像
- `3` - git.yylx 镜像
- `4` - gh-proxy 镜像
- `5` - ghfile 镜像
- `6` - gh-proxy.net 镜像
- `7` - 1win 镜像
- `8` - ghm 镜像
- `9` - gitproxy 镜像
- `10` - jiashu 镜像
- `11` - tbedu 镜像
- `12` - ghproxy 镜像
- 不设置 - 自动测速选择最快的源（推荐） -->

## 🛠️ 开发

### 本地开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 测试安装脚本
node lib/postinstall.js
```

### 项目结构

```
src/
├── index.ts        # 主入口，提供 FFmpeg 路径访问
├── download.ts     # 下载和解压逻辑
├── postinstall.ts  # 安装后脚本
└── types.ts        # TypeScript 类型定义

lib/                # 编译输出目录
├── index.js
├── download.js
└── postinstall.js
```

## 💡 常见问题

### 下载失败怎么办？

插件会自动测速并尝试多个下载源（包括 12 个国内镜像），如果所有源都失败，请检查网络连接。

你也可以手动运行安装脚本：

```bash
# 自动选择最快的源
node lib/postinstall.js

# 手动指定源（Windows PowerShell）
$env:FFMPEG_PROXY_INDEX=2; node lib/postinstall.js

# 手动指定源（Linux/macOS）
FFMPEG_PROXY_INDEX=2 node lib/postinstall.js
```

### FFmpeg 来源

本插件使用 [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds) 提供的每日构建版本。

### 下载源列表

插件内置 12 个镜像源，安装时会自动测速选择最快的：

- `1` - GitHub 官方
- `2` - ghfast 镜像
- `3` - git.yylx 镜像
- `4` - gh-proxy 镜像
- `5` - ghfile 镜像
- `6` - gh-proxy.net 镜像
- `7` - 1win 镜像
- `8` - ghm 镜像
- `9` - gitproxy 镜像
- `10` - jiashu 镜像
- `11` - tbedu 镜像
- `12` - ghproxy 镜像

### 支持哪些平台？

- Windows (x64, x86)
- Linux (x64, arm64, i686)
- macOS (暂不支持，BtbN 不提供 macOS 构建)

### 存储位置

FFmpeg 二进制文件会下载到项目根目录的 `node_modules/.ffmpeg` 文件夹中。

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
