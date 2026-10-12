---
title: 前端面试全家桶
description: 系统整理前端面试知识：从 HTML/CSS/JavaScript 基础，到浏览器、网络、框架、工程化与 AI Agent，配套代码示例与图解。
tags:
  - docs
  - index
date: 2026-10-12
---

# 前端面试全家桶

本站按学习顺序整理前端面试所需的知识，每个专题都配有代码示例与图解，并给出面试常考点索引。你可以从头顺序学习，也可以直接跳到薄弱的专题。

## 1. 学习路线

建议按「基础 → 进阶 → 框架 → 工程化 → AI」的顺序推进。每个专题的概览页都列出了页面顺序与难度。

### 1.1 基础

<div class="grid cards" markdown>

- **[HTML](html/index.md)**

    语义化、表单、媒体与常见面试题。

- **[CSS](css/index.md)**

    选择器、盒模型、布局与动画。

- **[JavaScript](js/index.md)**

    作用域、闭包、原型、异步与模块化。

</div>

### 1.2 进阶

<div class="grid cards" markdown>

- **[TypeScript](typescript/index.md)**

    类型系统、泛型与工程实践。

- **[浏览器](browser/index.md)**

    渲染流程、事件机制与存储。

- **[网络](network/index.md)**

    HTTP、TCP、DNS 与 WebSocket。

- **[安全](security/index.md)**

    常见攻击与防御手段。

</div>

### 1.3 框架

<div class="grid cards" markdown>

- **[React](react/index.md)**

    组件、Hooks、Fiber 与新特性。

- **[Vue](vue/index.md)**

    响应式原理、组件与生态。

</div>

### 1.4 工程化

<div class="grid cards" markdown>

- **[工程化](engineering/index.md)**

    规范、测试、CI/CD 与架构实践。

- **[性能优化](performance/index.md)**

    指标、加载、渲染与监控。

- **[构建工具](build-tools/index.md)**

    Vite、Webpack 等工具的原理与选型。

- **[包管理器](package-manager/index.md)**

    npm、pnpm 与 Yarn 的机制对比。

- **[运行时](runtime/index.md)**

    Node.js、Bun 与 Deno。

- **[手写代码](coding/index.md)**

    高频手写题与实现思路。

- **[算法](algorithm/index.md)**

    面试算法与 LeetCode 热题。

</div>

### 1.5 AI Agent：按目标选择入口

<div class="grid cards" markdown>

- **[AI Agent 课程总览](agent/index.md)**

    先按目标选择路线，不必从百科目录开始。

- **[面试速通](agent/learning-paths.md#路线-a面试速通)**

    3–4 小时建立 loop、工具、上下文、安全、评测和单/多 Agent 的回答框架。

- **[从零构建 MiniCode](agent/learning-paths.md#路线-b从零构建-minicode)**

    7 天递增实现同一个编码 Agent，Day 5 权限/沙箱与 Day 7 子 Agent 都是必修闭环。

- **[生产工程](agent/learning-paths.md#路线-c生产工程)**

    把原型补成可审计的系统：存储、安全、评测、trace、成本和部署。

- **[Agent 百科与参考](agent/index.md#3-百科与参考)**

    框架、源码案例、RAG 旧版与深挖专题按需查阅，不和必修路线混排。

- **[开源项目](open-source/index.md)**

    优秀开源项目的设计分析。

- **[学习资源](resources/index.md)**

    延伸阅读与参考资料。

</div>

### 1.6 深入系统：从原理到可验证的证据

从 [全仓内容地图与深入路线](resources/content-map-and-roadmap.md) 按目标选择：框架与编译器、V8 与运行时、Wasm 与数据库、Pretext 与图形、Web3D 与媒体、本地优先与协同。每条路线连接源码、反例和实验，不以项目热度代替机制；已实跑的 Node／库实验与未验证的浏览器、GPU、输入法和辅助技术行为分别标明。

### 1.7 真实面试与手写训练

先查 [真实题目出处](resources/real-interview-question-bank.md) 的公司、年份、岗位、轮次与证据性质，再进入 [360 道前端与全栈手写练习](coding/handwritten-practice-360.md)。保留原有 48 题，新增 12 个题册、312 道进阶题，覆盖组件、调度、框架、编译、HTTP、事务、安全、同步、算法、协议、图形与内存。可训练 [动画引擎](coding/animation-engine-handwritten.md)、[倒计时与打字机](coding/deadline-clock-and-typewriter.md)、[窗口算法与版本协议](coding/autumn-exam-algorithms.md)及[三道挑战题完整解答](coding/handwritten-challenge-solutions.md)，或用 [7 类场景题](coding/real-interview-scenarios.md) 练故障分析。题量不等于已实现答案数量；个人回忆、自主练习和实跑实现分别标注。

## 2. 如何使用本站

1. 先读各专题的概览页，了解范围、学习路径与每页难度。
2. 按页面顺序阅读，先理解原理，再看面试常考点索引。
3. 动手运行示例代码，并用手写代码与算法专题检验掌握程度。
4. 使用顶部搜索框快速定位知识点，右上角可切换深色与浅色模式。

!!! tip "难度说明"
    各概览页中的难度分为基础、进阶、高级：基础是面试必问，进阶用于展示理解深度，高级涉及原理剖析。

## 3. 本地运行

```bash
pip install mkdocs mkdocs-material
mkdocs serve --dev-addr 127.0.0.1:8000
```

在线阅读：[shyu-x.github.io/frontend-interview](https://shyu-x.github.io/frontend-interview)
