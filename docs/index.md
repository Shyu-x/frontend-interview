---
title: 前端面试全家桶
description: 涵盖前端面试高频知识点，配套代码示例与图解，助你系统复习、斩获 Offer。覆盖 HTML/CSS/JavaScript/TypeScript/网络/React/AI Agent 等模块。
tags:
  - docs
  - index
date: 2026-05-17
---

# 前端面试全家桶

> 本文档涵盖前端面试中的高频知识点，配套代码示例与图解，助你系统复习、斩获 Offer。

!!! info "文档信息"
    **最后更新：** 2026-05-16 | **版本：** 2.1 | **覆盖：** HTML / CSS / JavaScript / TypeScript / 网络 / React / AI Agent / 工程化 / 性能优化

---

## 🎯 模块总览

!!! tip "难度说明"
    - ⭐ 基础 — 面试必问，必须掌握
    - ⭐⭐ 进阶 — 深入理解，展示深度
    - ⭐⭐⭐ 高级 — 原理剖析，高分必备

### ⭐ 基础篇

| 模块 | 文档 | 主题 |
|------|------|------|
| HTML | [超高频八股](html/hyper-frequencies.md) | 语义化、meta、viewport |
| CSS | [超高频八股](css/hyper-frequencies.md) | 选择器、盒模型、优先级 |
| JavaScript | [超高频八股](js/hyper-frequencies.md) | 作用域、闭包、原型 |

### ⭐⭐ 进阶级

| 模块 | 文档 | 主题 |
|------|------|------|
| JavaScript | [专题 13-18](js/section-13-18.md) | 异步、Event Loop、手写 Promise |
| JavaScript | [专题 19-25](js/section-19-25.md) | 代理、反射、模块化 |
| CSS | [核心原理](css/section-1-5.md) | BFC、IFC、Position、Flexbox |
| CSS | [布局进阶](css/section-6-10.md) | Grid、响应式、动画 |
| 网络 | [协议专题 5-12](network/section-5-12.md) | HTTP、TCP、DNS |
| 网络 | [协议专题 13-20](network/section-13-20.md) | WebSocket、HTTP/2、安全 |

### ⭐⭐⭐ 高级篇

| 模块 | 文档 | 主题 |
|------|------|------|
| React | [核心基础](react/react-18-core.md) | 组件、Hooks、Fiber |
| React | [新特性](react/react-18-new-features.md) | Concurrent、Server Components |
| 性能优化 | [终极题库](performance/index.md) | Core Web Vitals、懒加载 |
| 手写代码 | [终极题库](coding/index.md) | 数组、字符串、树结构 |
| TypeScript | [核心概念](typescript/index.md) | 类型系统、泛型、装饰器 |

---

## 📚 专项模块

### 🤖 AI Agent 篇

!!! abstract "新增长篇"
    深度解析 AI Agent 开发，包括架构设计、工具系统、流式对话。

| 文档 | 说明 |
|------|------|
| [Agent 概述](agent/index.md) | Agent 基本概念与分类 |
| [Agent 对比](agent/agent-comparison.md) | 主流框架对比分析 |
| [状态机模式](agent/state-machine-patterns.md) | Agent 执行流程控制 |
| [工具系统](agent/tool-patterns.md) | 工具定义与编排 |
| [MCP 协议](agent/mcp-integration.md) | Model Context Protocol |
| [流式模式](agent/streaming-patterns.md) | SSE/流式响应实现 |
| [Claude Code 分析](agent/claude-code-analysis.md) | 源码深度解析 |

### 🛠️ 构建工具篇

| 文档 | 说明 |
|------|------|
| [全景图](build-tools/index.md) | 构建工具总览 |
| [Vite 深度解析](build-tools/vite-deep-dive.md) | Vite 8.x 核心原理 |
| [打包工具对比](build-tools/bundler-comparison.md) | 工具选型指南 |

### ⚡ 运行时篇

| 文档 | 说明 |
|------|------|
| [Node.js 核心](runtime/nodejs-core.md) | 事件循环、模块系统 |
| [Bun 使用指南](runtime/bun-guide.md) | Bun 2.x 新特性 |
| [Deno 使用指南](runtime/deno-guide.md) | Deno 2.x 新特性 |

### 📊 算法篇

| 文档 | 说明 |
|------|------|
| [算法索引](algorithm/index.md) | 面试算法总览 |
| [LeetCode 热题 - 基础](algorithm/leetcode-hot100-basics.md) | 必刷基础题 |
| [LeetCode 热题 - 进阶](algorithm/leetcode-hot100-advanced.md) | 高频难题 |

### 🏆 开源项目赏析

!!! success "新增章节"
    52 个高质量开源项目深度分析，17000+ 行内容。

| 分类 | 项目数 | 说明 |
|------|--------|------|
| [AI Agent 框架](open-source/ai-agents.md) | 11 | Claude Code、LangChain.js、MCP |
| [前端框架](open-source/frontend-frameworks.md) | 8 | Next.js、Astro、Svelte 5 |
| [工具链](open-source/tooling.md) | 11 | Vite、Rolldown、esbuild |
| [工程化库](open-source/engineering.md) | 10 | tRPC、Prisma、Zustand |
| [新兴趋势](open-source/trending.md) | 12 | HTMX、Bun、shadcn/ui |

---

## 🚀 快速导航

### 按难度选择

```mermaid
flowchart LR
    A[面试准备] --> B{基础扎实?}
    B -->|是| C[深入进阶]
    B -->|否| D[先打基础]
    C --> E[攻克高级]
    D --> F[HTML/CSS/JS八股]
    F --> C
    E --> G[拿到Offer]
```

### 推荐学习路径

| 阶段 | 建议 | 目标 |
|------|------|------|
| 1 | HTML/CSS 基础 + 八股 | ⭐ 基础扎实 |
| 2 | JavaScript 核心 + 专题 | ⭐⭐ 进阶理解 |
| 3 | React/网络 + 手写代码 | ⭐⭐⭐ 高级掌握 |

---

## 📖 使用指南

!!! note "学习建议"
    1. 先刷超高频八股，建立知识框架
    2. 按专题深入，理解原理
    3. 手写代码题，锻炼实现能力
    4. 结合开源项目，提升工程视角

### 本地开发

```bash
# 安装依赖
pip install mkdocs mkdocs-material

# 启动开发服务器
mkdocs serve --dev-addr 127.0.0.1:8000

# 构建静态站点
mkdocs build --clean
```

### 在线阅读

**🌐 [https://shyu-x.github.io/frontend-interview](https://shyu-x.github.io/frontend-interview)**

支持深色/浅色模式切换、代码一键复制、全文搜索。

---

## 📊 内容统计

| 指标 | 数值 |
|------|------|
| 文档数量 | 80+ |
| 代码示例 | 500+ |
| 面试题 | 1000+ |
| Mermaid 图表 | 200+ |

---

!!! quote "祝拿到满意 Offer"
    系统复习，稳步提升，前端面试全家桶助你一臂之力！