---
title: React 概览
description: React 学习路径：基础原理、Hooks、Fiber、版本特性、状态与模式、性能、手写代码与面试题库。
---

# React 概览

本目录按学习路径组织 React 内容：先理解基础原理与 Hooks，再深入 Fiber 架构与版本特性，随后学习状态管理、组件模式与性能优化，最后通过手写代码题与面试题库查漏补缺。

## 1. 学习路径

1. [React 18 核心概念](foundations/react-18-core-concepts.md)
2. [Hooks 深入原理](hooks/hooks-internals.md)
3. [Fiber 架构](architecture/fiber.md)
4. [React 18 新特性](versions/react-18-features.md)
5. [React 19 新特性](versions/react-19-features.md)
6. [状态管理方案](patterns/state-management.md)
7. [组件模式大全](patterns/component-patterns.md)
8. [性能优化实战](performance/optimization.md)
9. [手写 Hooks](coding/hooks-implementation.md)
10. [手写自定义 Hooks](coding/custom-hooks-implementation.md)
11. [虚拟 DOM、Fiber 与 Diff](interview-qa/rendering-fiber-diff.md)
12. [Hooks 与更新机制](interview-qa/hooks-and-updates.md)
13. [状态管理与性能优化](interview-qa/state-and-performance.md)
14. [SSR、路由与应用架构](interview-qa/ssr-routing-architecture.md)

## 2. 页面一览

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [React 18 核心概念](foundations/react-18-core-concepts.md) | 深入剖析 React 18 的核心机制，包括并发渲染 Automatic Batching、useTransition、Suspense 与 Streaming SSR 等架构设计。 | 基础 |
| [Hooks 深入原理](hooks/hooks-internals.md) | 深入剖析 React Hooks 的内部实现原理，包括 useState/useReducer 状态管理、useEffect 执行时机、useRef 引用机制、useCallback 与 useMemo 缓存策略。 | 进阶 |
| [Fiber 架构](architecture/fiber.md) | 深入剖析 React 16 引入的 Fiber 架构，详解双缓冲机制、渲染阶段与提交阶段、Lane 优先级调度等核心原理。 | 高级 |
| [React 18 新特性](versions/react-18-features.md) | 全面解析 React 18 的核心新特性，包括 Automatic Batching、Concurrent Features、Suspense 进阶、New Root API 等革命性更新。 | 进阶 |
| [React 19 新特性](versions/react-19-features.md) | 预览 React 19 核心新特性，包括 Actions、useOptimistic、use() Hook、文档元数据、资源预加载 API 与 React 编译器优化。 | 进阶 |
| [状态管理方案](patterns/state-management.md) | 系统梳理 React 状态管理从 useState 到 Redux Toolkit 的演进路径，提供决策框架帮助在实际项目中做出合理选择。 | 进阶 |
| [组件模式大全](patterns/component-patterns.md) | 全面介绍 React 九大组件模式，包括 HOC、Render Props、复合组件、受控/非受控组件等核心概念与代码示例。 | 进阶 |
| [性能优化实战](performance/optimization.md) | 从渲染机制到并发模式，深入探讨 React 应用性能优化的核心策略，包括 React.memo、useMemo、Code Splitting 等实战技巧。 | 进阶 |
| [手写 Hooks](coding/hooks-implementation.md) | 深入讲解 React 面试高频手写题，包括实现 useState、useEffect、useMemo、useCallback、useRef、useReducer 等 Hooks 原理。 | 高级 |
| [手写自定义 Hooks](coding/custom-hooks-implementation.md) | 深入探讨 React 高级自定义 Hooks 的手写实现，涵盖 useSyncExternalStore、useDebounce、useLocalStorage、useInterval 等核心模式。 | 高级 |
| [虚拟 DOM、Fiber 与 Diff](interview-qa/rendering-fiber-diff.md) | 虚拟 DOM、Fiber、Diff 算法、key 与 Lane 调度相关面试题 | 进阶 |
| [Hooks 与更新机制](interview-qa/hooks-and-updates.md) | Hooks 原理、批量更新、并发模式与合成事件相关面试题 | 进阶 |
| [状态管理与性能优化](interview-qa/state-and-performance.md) | Zustand/Jotai/Recoil、Redux、React Query、性能优化与大规模状态管理相关面试题 | 进阶 |
| [SSR、路由与应用架构](interview-qa/ssr-routing-architecture.md) | Next.js SSR、Server Component、React Router、权限系统与 Module Federation 微前端相关面试题 | 高级 |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [React 官方文档](https://react.dev/) | 一手权威来源，覆盖全部概念与 API，术语最准。 | 从首页 Quick Start 做起，边读边在页内沙盒里改代码，改完再回读解释。 |
| [React 官方中文文档](https://zh-hans.react.dev/) | 英文吃力时的对照版本，可与英文版互校术语。 | 先通读一篇中文版，再回英文版核对关键句，术语以英文为准并记笔记。 |
| [React API 参考](https://react.dev/reference/react) | 查漏补缺的词典，Caveats 一节最见设计取舍。 | 遇到不熟的 Hook 先查此页，只读 Caveats 与 Troubleshooting，再回项目改代码。 |
| [React Server Components 参考](https://react.dev/reference/rsc/server-components) | 官方说明服务端组件的边界与限制，避免想当然误用。 | 读完后在 Next.js App Router 里分别写服务端与客户端组件，对比产物差异。 |
| [React 官方博客](https://react.dev/blog) | 官方发布与设计动机的第一现场，比二手解读可靠。 | 每月翻一次更新，挑新特性动机段落读，整理成一页变更摘要。 |
| [React Working Group 与 RFC](https://github.com/reactjs/rfcs) | RFC 的 Motivation 直接解释为什么要这样设计。 | 挑 Hooks 与 Server Components 两份 RFC，只读 Motivation，各写两百字摘要。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [React 源码仓库](https://github.com/facebook/react) | 唯一能验证所有二手说法的一手来源。 | 从 packages/react-reconciler 的 beginWork 与 completeWork 读起，配合断点跟一次渲染。 |
| [React Fiber 架构笔记](https://github.com/acdlite/react-fiber-architecture) | 补上「React 内部怎么跑」这一环，衔接源码与概念。 | 读完对照 Build Your Own React 的 Fiber 章节，亲手画出 work loop 流程图。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [React Learn 教程入口](https://react.dev/learn) | 官方系统课程，按顺序学不会漏掉基础。 | 按左侧目录顺序学，每章做完 Challenges 再进下一章，卡住就回看前章。 |
| [Thinking in React](https://react.dev/learn/thinking-in-react) | 把需求拆成组件树的经典方法，值得反复练。 | 照文中五步，用自己的待办清单需求从零拆组件、定 state 位置，写完再对照。 |
| [Overreacted：React as a UI Runtime](https://overreacted.io/react-as-a-ui-runtime/) | 从运行时视角把 React 的本质模型讲透。 | 分段读，每读完一节用一句话复述 React 做了什么，读完全文画一张模型图。 |
| [Josh Comeau：React 专题](https://www.joshwcomeau.com/react/) | 交互式讲解，把抽象概念变成可动手的演示。 | 一次读一篇，照文中交互演示动手改参数，观察结果差异并记下结论。 |
| [Josh Comeau：Server Components](https://www.joshwcomeau.com/react/server-components/) | 用图讲清服务端与客户端组件的边界与取舍。 | 读完画一张边界图，再对照自己项目代码标注每个组件的运行位置。 |

