<p align="right"><a href="README.md">English</a></p>

# Hexo Desktop Client（Hexo 桌面客户端）

一个现代化的 [Hexo](https://hexo.io/) 博客桌面客户端。无需命令行，通过可视化界面完成写作、预览、配置和发布。

## 功能特性

- **博客项目管理** — 新建、导入、多项目切换，自动检测 package.json 和 _config.yml
- **Markdown 编辑器** — 实时 HTML 预览、图片拖拽上传、`marked` 渲染引擎
- **Front Matter 编辑器** — 可视化编辑标题、日期（一键生成时间戳）、标签、分类
- **配置文件管理** — 图形化编辑 `_config.yml`（站点 + 主题），折叠式分区
- **主题安装器** — 浏览热门主题，一键 Git 克隆安装
- **实时预览** — 内置 hexo server，自动检测端口
- **一键发布** — Git add/commit/push + hexo deploy，日志面板实时输出
- **深色模式** — 深色 / 浅色 / 跟随系统
- **环境检测** — 自动检测 Node.js、Git、Hexo CLI，缺失时给出安装指引
- **多语言** — 简体中文 + English

## 截图

*Coming soon*

## 系统要求

- **Windows 10+** (x64) 或 **Linux** (x64)
- **Node.js** >= 18.x
- **npm** >= 9.x
- **Git** >= 2.x
- **Hexo CLI**（`npm install -g hexo-cli`）

## 下载

从 [GitHub Releases](https://github.com/Zcxx0322/HexoDesktopClient/releases) 下载最新版本。

- **Windows**：`Hexo Desktop Client-1.0.1-Setup-x64.exe`
- **Linux**：`Hexo Desktop Client-1.0.1-x64.tar.gz`

## 快速开始

### 开发模式

```bash
git clone https://github.com/Zcxx0322/HexoDesktopClient.git
cd hexo-desktop-client
npm install
npm run electron:dev
```

### 构建打包

```bash
# Windows 安装包
node scripts/build.js win

# Linux AppImage（需在 Linux 环境构建）
node scripts/build.js linux
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 33 |
| 前端 | React 18 + TypeScript + Vite 6 |
| 样式 | TailwindCSS 3 + Typography |
| 状态管理 | Zustand 5 |
| 数据库 | SQLite (better-sqlite3) |
| Git 操作 | simple-git |
| Markdown 渲染 | marked |
| YAML 解析 | js-yaml |
| 打包 | electron-builder |

## License

MIT
