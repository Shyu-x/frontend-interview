# 前端面试全家桶

面向前端工程师的系统化教程：从 HTML、CSS、JavaScript 的语言底层，到浏览器、网络、框架、工程化，再到 AI Agent。每一篇都按"问题、模型、机制、手写实现、应用、易错点"展开，配图、代码、自测题齐全，可在线阅读，也可下载 PDF 分册离线读。

[![Deploy](https://github.com/Shyu-x/frontend-interview/actions/workflows/deploy.yml/badge.svg)](https://github.com/Shyu-x/frontend-interview/actions/workflows/deploy.yml)

**在线阅读：<https://shyu-x.github.io/frontend-interview/>**　支持深色模式、全文搜索、代码一键复制。
**PDF 分册：** [Releases](https://github.com/Shyu-x/frontend-interview/releases)（16 开，按主题拆成多册）

## 内容

约 470 篇，按主题分为八个栏目：

| 栏目 | 篇数 | 包含 |
|---|---|---|
| 前端基础 | 118 | HTML、CSS、JavaScript（语言底层、异步、模块、内存）、TypeScript |
| 浏览器与网络 | 75 | 浏览器原理、网络协议、网络安全、API 设计与通信、浏览器 API |
| 框架 | 59 | React 19、Vue 与框架生态 |
| 工程化与性能 | 55 | 工程化、构建工具、包管理器与运行时、性能优化 |
| 编程实战 | 22 | 手写代码、算法 |
| AI 与开源 | 118 | AI Agent（Harness、记忆与 RAG、权限、多 Agent、会话存储）、七天 MiniCode、开源项目赏析 |
| 教学资源 | 20 | 分门别类的权威学习资料，附学习路线与怎么学 |
| 设计与写作规范 | 7 | 设计系统、书籍排版规范、教程写作规范 |

## 本地运行

需要 [uv](https://docs.astral.sh/uv/) 与 Node.js 22。

```bash
make install    # 安装 Python 依赖
make dev        # http://127.0.0.1:8000
make build      # 构建站点到 site/
make seo        # 构建并校验 sitemap、llms.txt、结构化数据
```

## 生成 PDF

```bash
npm ci --prefix book
node book/scripts/sync-fonts.mjs
python3 -m venv .venv-fonts && .venv-fonts/bin/pip install fonttools brotli
.venv-fonts/bin/python book/scripts/merge-fonts.py
make build
node book/build.mjs --plan          # 查看分册方案
node book/build.mjs --volume 13     # 构建单册
```

发布由 `release-pdf` 工作流完成：手动触发，或推送 `books-*` 标签。详见站内《书籍排版规范》。

## 仓库结构

```text
docs/             文档源文件（Markdown）
  design/         设计系统与写作规范
  javascripts/    图表渲染器（网页与 PDF 共用）
  stylesheets/    设计令牌 tokens.css 与站点样式
book/             PDF 流水线：分册规则、排版样式、校验脚本
hooks/seo.py      构建时生成 sitemap、llms.txt、JSON-LD、书籍目录清单
overrides/        Material 主题模板覆盖
scripts/          SEO 校验、Mermaid 校验
mkdocs.yml        站点配置与导航
```

## 参与

想改一篇内容或新增一篇，先读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可

文档内容与代码示例采用 MIT 许可。站内与 PDF 使用的字体均为 SIL OFL 1.1 许可。
