# 前端面试全家桶

> 前端面试高频知识点配套代码示例与图解，助你系统复习、斩获 Offer。

[![Deploy to GitHub Pages](https://github.com/Shyu-x/frontend-interview/actions/workflows/deploy.yml/badge.svg)](https://github.com/Shyu-x/frontend-interview/actions)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fshyu-x.github.io%2Ffrontend-interview)](https://shyu-x.github.io/frontend-interview)

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