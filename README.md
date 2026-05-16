# 前端面试全家桶

> 前端面试高频知识点配套代码示例与图解，助你系统复习、斩获 Offer。

[![Deploy to GitHub Pages](https://github.com/Shyu-x/frontend-interview/actions/workflows/deploy.yml/badge.svg)](https://github.com/Shyu-x/frontend-interview/actions)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fshyu-x.github.io%2Ffrontend-interview)](https://shyu-x.github.io/frontend-interview)
[![GitHub Stars](https://img.shields.io/github/stars/Shyu-x/frontend-interview?color=gold)](https://github.com/Shyu-x/frontend-interview)

## 在线阅读

**🌐 https://shyu-x.github.io/frontend-interview**

支持深色/浅色模式切换，代码一键复制，全文搜索。

## 内容覆盖

| 模块 | 章节数 | 状态 |
|------|--------|------|
| HTML | 9 章节 | ✅ 完整 |
| CSS | 10+ 章节 | ✅ 完整 |
| JavaScript | 10+ 章节 | ✅ 完整 |
| TypeScript | 10+ 章节 | ✅ 完整 |
| 网络协议 | 20 章节 | ✅ 完整 |
| 性能优化 | 10+ 章节 | ✅ 完整 |
| 手写代码 | 30+ 题 | ✅ 完整 |
| AI Agent | 25+ 文档 | ✅ 完整 |
| **开源项目赏析** | **52 个项目** | ✅ **新增** |

---

## 🏆 开源项目赏析

> 高质量开源项目深度技术指南，52 个项目，17K+ 行内容

[![🤖 AI Agent](https://img.shields.io/badge/🤖-AI_Agent框架-11个-blue?style=for-the-badge&logo=robot)](docs/open-source/ai-agents.md)
[![⚛️ 前端框架](https://img.shields.io/badge/⚛️-前端框架-8个-green?style=for-the-badge&logo=react)](docs/open-source/frontend-frameworks.md)
[![🛠️ 工具链](https://img.shields.io/badge/🛠️-构建工具-11个-orange?style=for-the-badge&logo=gears)](docs/open-source/tooling.md)
[![📦 工程化](https://img.shields.io/badge/📦-工程化库-10个-purple?style=for-the-badge&logo=npm)](docs/open-source/engineering.md)
[![🚀 新兴趋势](https://img.shields.io/badge/🚀-新兴趋势-12个-red?style=for-the-badge&logo=rocket)](docs/open-source/trending.md)

### 项目总览

| 分类 | 文档 | 项目数 | 代表项目 |
|------|------|--------|----------|
| 🤖 AI Agent | [ai-agents.md](docs/open-source/ai-agents.md) | 11 | Claude Code, LangChain.js, MCP |
| ⚛️ 前端框架 | [frontend-frameworks.md](docs/open-source/frontend-frameworks.md) | 8 | Next.js, Astro, Svelte 5 |
| 🛠️ 工具链 | [tooling.md](docs/open-source/tooling.md) | 11 | Vite 6, esbuild, Turbopack |
| 📦 工程化 | [engineering.md](docs/open-source/engineering.md) | 10 | tRPC, Prisma, Zustand |
| 🚀 新兴趋势 | [trending.md](docs/open-source/trending.md) | 12 | HTMX, Bun, shadcn/ui |

### 热门项目

| 分类 | Top 3 项目 | Stars | 一句话描述 |
|------|------------|-------|------------|
| AI Agent | Claude Code | 124K | Anthropic 官方终端编码 Agent |
| AI Agent | AutoGPT | 184K | 自动化 AI Agent 先驱 |
| AI Agent | LangChain.js | 18K | 全功能 LLM 应用开发框架 |
| 前端框架 | Next.js | 130K | React 全栈框架 |
| 前端框架 | Astro | 45K | 岛屿架构，零 JS |
| 前端框架 | Svelte | 78K | 编译型框架 |
| 工具链 | Vite | 81K | 下一代构建工具 |
| 工具链 | Bun | 91K | 一体化 JS 工具链 |
| 工具链 | esbuild | 40K | Go 编写的极速打包器 |

### 特色内容

- 📊 **106 个 Mermaid 架构图** - 可视化核心原理
- 🔄 **竞品对比表格** - 选型决策有依据
- 📈 **性能基准数据** - benchmark 对比
- 💻 **150+ 代码示例** - TypeScript/JavaScript
- 🎯 **选型决策树** - 快速找到适合方案

👉 [查看完整开源项目赏析](docs/open-source/index.md)

## 快速开始

### 本地开发

```bash
# 安装依赖
pip install mkdocs mkdocs-material

# 启动开发服务器
mkdocs serve --dev-addr 127.0.0.1:8000

# 构建静态站点
mkdocs build --clean
```

### 目录结构

```
frontend-interview/
├── docs/                    # 文档源文件 (Markdown)
│   ├── index.md             # 首页
│   ├── html/                # HTML 章节
│   ├── css/                 # CSS 章节
│   ├── js/                  # JavaScript 章节
│   ├── typescript/          # TypeScript 章节
│   ├── network/            # 网络协议章节
│   ├── performance/         # 性能优化章节
│   ├── coding/              # 手写代码题库
│   └── stylesheets/         # 自定义样式
├── mkdocs.yml               # MkDocs 配置
├── CLAUDE.md                # Claude Code 开发指南
├── split_chapters.py        # 文档拆分脚本
└── .github/
    └── workflows/
        └── deploy.yml       # CI/CD 部署脚本
```

## 贡献指南

### 添加新内容

1. 在对应章节目录添加 `.md` 文件
2. 更新 `mkdocs.yml` 中的 `nav` 配置
3. 本地验证：`mkdocs build`
4. 提交 PR

### 更新主文档

如果修改 `frontend-interview-master.md`，运行脚本拆分章节：

```bash
python split_chapters.py
```

### 主题定制

- **样式修改**：`docs/stylesheets/extra.css`
- **主题配置**：`mkdocs.yml` 中的 `theme` 和 `palette` 部分
- **插件配置**：`mkdocs.yml` 中的 `plugins` 和 `markdown_extensions` 部分

## 技术栈

- **框架**：MkDocs
- **主题**：Material for MkDocs
- **字体**：Noto Sans SC / JetBrains Mono
- **CI/CD**：GitHub Actions + GitHub Pages

## 维护状态

| 指标 | 状态 |
|------|------|
| 部署状态 | ✅ 正常 |
| 最近部署 | 2026-05-14 |
| 构建频率 | push to main |
| 覆盖率 | 核心章节 100% |

## License

MIT License