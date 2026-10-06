---
title: 包管理与交付
description: pnpm、npm/yarn/pnpm 对比、CI/CD 与 Docker
---

# 包管理与交付

> 本页按「概念、原理、代码」逐题展开相关面试专题。

## 1. pnpm 为什么快（硬链接 + 内容寻址存储）

```
pnpm vs npm/yarn 磁盘模型：

npm/yarn（扁平化）：
  node_modules/
    vue/
    lodash/
    lodash-es/
  → 同一库的不同版本各存一份，占用大量磁盘

pnpm（非扁平化 + 内容寻址存储）：
  .pnpm/
    vue@3.0.0/node_modules/vue/   ← 全局唯一存储（内容寻址）
    lodash@4.17.0/node_modules/lodash/
  项目 node_modules/
    vue → hardlink → .pnpm/vue@3.0.0/node_modules/vue/
    lodash → hardlink → .pnpm/lodash@4.17.0/node_modules/lodash/

硬链接原理：
  - 文件系统 inode 引用，同一物理文件多个路径
  - 删除一个硬链接，其他硬链接仍存在（引用计数>0）
  - 不复制文件内容，创建硬链接几乎是 O(1) 操作

pnpm 安装流程：
  1. 检查 store（~/.pnpm-store）是否有目标包
  2. 有 → 立即创建硬链接（秒级）
  3. 无 → 下载 → 存入 store → 创建硬链接
```

```
npm install vs pnpm install（node_modules/ 大时差距巨大）：

npm:  每次都从 registry 下载 + 大量文件 IO 解压
      → 速度慢 3-10 倍

pnpm: 硬链接复用全局 store
      → 安装速度极快
      → 磁盘占用极小（全局只存一份）
```

## 2. npm / yarn / pnpm 区别

| 特性 | npm | yarn | pnpm |
|------|-----|------|------|
| 安装速度 | 慢 | 中 | 快（硬链接）|
| 磁盘占用 | 大（重复存储） | 中 | 小（内容寻址）|
| 幽灵依赖 | 有（扁平化） | 有 | 无（非扁平化）|
| lock文件 | package-lock.json | yarn.lock | pnpm-lock.yaml |
| monorepo | npm workspaces v7+ | yarn workspaces | pnpm workspaces |

```bash
# pnpm workspaces
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

## 3. CI/CD 与 Git rebase vs merge

### 3.1 CI/CD

```
CI (Continuous Integration)：
  - 每次 push 自动运行：lint → test → build
  - 工具：GitHub Actions, GitLab CI, Jenkins, CircleCI

CD (Continuous Deployment/Delivery)：
  - CI 通过后自动部署到测试/生产环境
  - 工具：GitHub Actions + AWS/GCP, ArgoCD

流程：
  push → GitHub Actions → lint + test → build
                                        ↓
                                  通知（Slack/钉钉）
                                        ↓
                                  自动部署到 Staging
                                        ↓
                                  人工审批（可选）
                                        ↓
                                  自动部署到 Production
```

### 3.2 Git rebase vs merge

```
A---B---C  (feature)
     \
      D---E  (main)

merge:
  git checkout main && git merge feature
  结果：A---B---C---D---E---(merge commit)
  优点：保留完整分支历史
  缺点：提交历史可能混乱

rebase:
  git checkout feature && git rebase main
  结果：A---B---D---E---C'（C被重新应用在E之上）
  优点：提交历史线性、清晰
  缺点：重写提交（不要对已推送的提交 rebase！）

原则：
  - 本地分支 → 可以 rebase（整理提交历史）
  - 已推送的共享分支 → 只 merge
  - squash merge：git merge --squash → 将多个提交压缩为一个
```

## 4. Docker 为什么流行

```
Docker = 容器化技术，轻量级虚拟化

解决的问题：
  1. 环境一致性问题："在我机器上能跑" → 开发/测试/生产一致
  2. 快速启动：虚拟机（分钟级）vs Docker（秒级）
  3. 资源隔离：CPU/内存/网络/文件系统隔离

核心概念：
  Image（镜像）: 只读模板（类比：类）
  Container（容器）: Image 的运行实例（类比：对象）
  Dockerfile: 构建镜像的指令文件
  Registry: 镜像仓库（Docker Hub、私有registry）
```

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t my-app:1.0 .
docker run -p 3000:3000 my-app:1.0
docker push my-registry.com/my-app:1.0
```

**容器编排**：Docker Compose（单机多容器）→ Kubernetes K8s（生产级大规模集群管理）。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [pnpm 文档](https://pnpm.io/zh/motivation) | 官方说明硬链接与内容寻址，直击 pnpm 快的根因。 | 读 store 与 symlink 两节，对照 node_modules 结构，再装一次包观察 .pnpm 目录。 |
| [npm 文档](https://docs.npmjs.com/) | package.json、语义化版本与 scripts 的权威定义，比较包管理器前必读。 | 查 dependencies 与 scripts 章节，核对 semver 符号含义，读完整理一页对照笔记。 |
| [Yarn 入门](https://yarnpkg.com/getting-started) | 官方讲 PnP 与 node_modules 方案取舍，便于横向比较三者。 | 读 Plug'n'Play 与迁移章节，带着“为什么 pnpm 更快”的疑问做对比表。 |
| [Git 官方命令文档](https://git-scm.com/docs) | rebase、merge 的准确语义与示例，消除操作歧义。 | 查 merge 与 rebase 的 DESCRIPTION、EXAMPLES，动手在测试仓库各跑一次。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [pnpm 工作区（中文）](https://pnpm.io/zh/workspaces) | 可照做的 workspace 示例，理解 monorepo 下的依赖链接。 | 按文建两个包，用 workspace 协议互引，再观察 node_modules 里的软链。 |
| [pnpm 目录 catalogs](https://pnpm.io/catalogs) | 示例展示如何统一多包依赖版本，交付一致性更好。 | 照文档配一个 catalog，把两个包的同名依赖收敛到同一版本。 |
| [npm 来源证明 provenance](https://docs.npmjs.com/generating-provenance-statements) | CI 发布供应链安全实践，可运行的 provenance 示例。 | 按步骤在 CI 发布一个测试包，回看 npm 页面上的 provenance 标记。 |
| [发布 npm 包](https://nodejs.org/en/learn/modules/publishing-a-package) | 从零发布包的最小示例，验证 exports 配置是否正确。 | 发布测试包后，在另一项目里按 exports 路径 import，确认解析成功。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Learn Git Branching 中文](https://learngitbranching.js.org/?locale=zh_CN) | 可视化闯关式练习，rebase、cherry-pick 一练就懂。 | 通关 rebase 与 cherry-pick 关卡，每关先预测结构再拖拽验证。 |
| [Atlassian Git 教程](https://www.atlassian.com/git/tutorials) | 系统对比 Git Flow 与主干开发，回答团队该怎么协作。 | 读工作流对比文，结合团队发布节奏，判断该用 merge 还是 rebase。 |
| [Pro Git 中文版](https://git-scm.com/book/zh/v2) | 中文完整讲透分支与重写历史，最扎实的 Git 教材。 | 精读分支、重写历史、内部原理三章，边读边在命令行复现例子。 |
| [Docker 入门](https://docs.docker.com/get-started/) | 官方入门，快速理解镜像与容器的基本工作方式。 | 照做把一个前端项目打成镜像并跑容器，记录每条命令的作用。 |
| [Docker 构建最佳实践](https://docs.docker.com/build/building/best-practices/) | 官方最佳实践，解释分层缓存与多阶段构建为何省时省空间。 | 用多阶段构建改写上一步的 Dockerfile，对比镜像体积与构建耗时。 |

