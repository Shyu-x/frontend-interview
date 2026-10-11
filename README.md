# 前端面试全家桶

面向前端工程师的系统化教程：从 HTML、CSS、JavaScript 的语言底层，到浏览器、网络、框架、工程化，再到 AI Agent。内容按可验证的学习目标组织：阅读概念后运行实验、检查输出，再用题目或项目验收掌握程度；可在线阅读，也可下载 PDF 分册离线读。

[![Deploy](https://github.com/Shyu-x/frontend-interview/actions/workflows/deploy.yml/badge.svg)](https://github.com/Shyu-x/frontend-interview/actions/workflows/deploy.yml)

**在线阅读：<https://shyu-x.github.io/frontend-interview/>**　支持深色模式、全文搜索、代码一键复制。
**PDF 分册：** [Releases](https://github.com/Shyu-x/frontend-interview/releases)（16 开，按主题拆成多册）

## 内容与验证状态

当前导航收录 479 篇页面（含首页），按主题分为八个栏目。篇数来自 `mkdocs.yml` 的导航叶子节点；它是范围统计，不等于已掌握或已验证。

| 栏目 | 篇数 | 包含 |
|---|---:|---|
| 前端基础 | 100 | HTML、CSS、JavaScript（语言底层、异步、模块、内存）、TypeScript |
| 浏览器与网络 | 75 | 浏览器原理、网络协议、网络安全、API 设计与通信、浏览器 API |
| 框架 | 59 | React 19、Vue 与框架生态 |
| 工程化与性能 | 73 | 工程化、构建工具、包管理器与运行时、性能优化 |
| 编程实战 | 22 | 手写代码、算法 |
| AI 与开源 | 122 | Agent 三条路线、七天 MiniCode、工程专题、百科参考与开源项目赏析 |
| 教学资源 | 20 | 分门别类的权威学习资料，附学习路线与怎么学 |
| 设计与写作规范 | 7 | 设计系统、书籍排版规范、教程写作规范 |

### 如何判断内容可用

| 状态 | 你能依赖什么 | 如何检查 |
|---|---|---|
| 可运行实验 | 页面标注 `runnable: true`，给出环境、命令、预期输出与验收 | 在干净环境运行页面或配套项目的测试命令；不能运行就不要把示例当结论 |
| 已核验事实 | 页面标注 `verified_at`；源码/产品行为另有 `source_commit` 或稳定来源 | 对照所标日期、版本和来源；超过核验期的 API/价格/产品行为须重新确认 |
| 概念与参考 | 未承诺可运行，或明确标为旧版、示意、历史对照 | 用于理解术语和设计取舍，不能代替项目验收 |

AI Agent 不再按“文章越多越靠后”的方式浏览：

- [面试速通](docs/agent/learning-paths.md#路线-a面试速通)：3–4 小时，交付可复述的架构图和问答卡。
- [从零构建 MiniCode](docs/agent/learning-paths.md#路线-b从零构建-minicode)：7 天，交付通过测试的离线 Agent 教学骨架。
- [生产工程](docs/agent/learning-paths.md#路线-c生产工程)：4–6 天，交付权限、评测、trace、预算和发布门禁。
- 百科参考保留在 Agent 导航末尾，框架、案例和旧版资料按需查阅。

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

本仓库采用 [MIT 许可](LICENSE)，涵盖文档内容与代码示例。站内与 PDF 使用的字体均为 SIL OFL 1.1 许可。
