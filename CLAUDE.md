# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**前端面试全家桶** - 使用 MkDocs + Material 主题构建的前端面试知识库，托管于 GitHub Pages。

- **仓库**：https://github.com/Shyu-x/frontend-interview
- **在线阅读**：https://shyu-x.github.io/frontend-interview
- **部署方式**：GitHub Actions 自动构建 + GitHub Pages 托管

---

## 技术架构

### 核心组件

| 组件 | 说明 |
|------|------|
| `mkdocs.yml` | 站点配置：主题、导航、插件 |
| `docs/` | 文档源文件（Markdown） |
| `site/` | 生成的静态 HTML（不直接编辑） |
| `frontend-interview-master.md` | 单一源文件（完整文档） |
| `split_chapters.py` | 文档拆分脚本 |

### 文档目录结构

```
docs/
├── index.md              # 首页
├── html/                 # HTML 章节 (section 1-15)
│   └── hyper-frequencies.md
├── css/                  # CSS 章节
│   ├── hyper-frequencies.md
│   ├── section-1-5.md
│   └── section-6-10.md
├── js/                   # JavaScript 章节
│   ├── hyper-frequencies.md
│   ├── section-13-18.md
│   └── section-19-25.md
├── typescript/           # TypeScript 章节
│   └── index.md
├── network/             # 网络协议章节
│   ├── section-5-12.md
│   └── section-13-20.md
├── performance/          # 性能优化章节
│   └── index.md
├── coding/              # 手写代码题库
│   └── index.md
└── stylesheets/
    └── extra.css        # 自定义样式覆盖
```

---

## 日常维护命令

### 开发与构建

```bash
# 本地开发服务器（热重载）
mkdocs serve --dev-addr 127.0.0.1:8000

# 构建生产站点
mkdocs build --clean

# 仅构建（保留现有 site/）
mkdocs build
```

### Git 操作

```bash
# 查看状态
git status

# 提交更改
git add .
git commit -m "描述"
git push

# 推送后 GitHub Actions 会自动部署
```

### 部署验证

```bash
# 查看 GitHub Actions 状态
gh run list --repo Shyu-x/frontend-interview

# 查看 Pages 状态
gh api repos/Shyu-x/frontend-interview/pages
```

---

## 常见维护场景

### 1. 添加新章节

1. 在 `docs/{topic}/` 创建 `.md` 文件
2. 在 `mkdocs.yml` 的 `nav` 中添加导航项
3. 本地验证：`mkdocs build`
4. 提交并推送

### 2. 更新主文档后拆分

```bash
# 修改 frontend-interview-master.md 后
python split_chapters.py

# 检查生成的文件
git diff docs/
```

### 3. 修改主题样式

- **CSS 覆盖**：`docs/stylesheets/extra.css`
- **主题配置**：`mkdocs.yml` 中的 `theme:` 部分
- 可调配置：配色、字体、导航栏行为、代码高亮等

### 4. 添加插件

```bash
# 安装插件
pip install mkdocs-{plugin-name}

# 在 mkdocs.yml 的 plugins: 下添加
```

---

## CI/CD 流程

```
Push → GitHub → Actions 触发 → mkdocs build → 部署到 Pages
```

**自动部署条件**：
- push 到 main 分支
- `.github/workflows/deploy.yml` 定义的工作流

**手动部署**：
- GitHub Actions 页面 → Run workflow

---

## 内容管理规范

### 文档格式要求

- 使用 `<!--toc-->` 生成目录
- 标题层级：`##` 一级章节 > `###` 二级 > `####` 三级
- 代码块标注语言：`html`/`css`/`javascript`/`typescript`
- 表格用于对比场景
- 引用块 `>` 用于重点强调

### 命名规范

- 文件名：`kebab-case.md`（小写+连字符）
- 章节标题使用中文：`## 一、xxx`

### 图片资源

- 放置在 `docs/assets/images/`
- 使用相对路径引用：`![描述](../assets/images/xxx.png)`

---

## 维护检查清单

### 发布前验证

- [ ] `mkdocs build --clean` 成功
- [ ] 导航链接可访问
- [ ] 代码块语法高亮正常
- [ ] 深色/浅色模式切换正常

### 定期检查

- [ ] GitHub Pages 可访问
- [ ] 依赖包无安全漏洞：`pip check`
- [ ] Actions 无失败记录
- [ ] 外部链接有效性

---

## 故障排查

### 构建失败

```bash
# 查看详细错误
mkdocs build --verbose

# 常见问题：缺少依赖
pip install mkdocs mkdocs-material
```

### 部署失败

```bash
# 检查 Actions 日志
gh run view --log --repo Shyu-x/frontend-interview

# 检查 Pages 配置
gh api repos/Shyu-x/frontend-interview/pages
```

### 本地样式不生效

- 清除浏览器缓存
- 检查 `extra_css` 路径是否正确
- 确认 `extra_css` 在 `mkdocs.yml` 中声明

---

## 参考资源

- [MkDocs 文档](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- [GitHub Pages 文档](https://docs.github.com/en/pages)