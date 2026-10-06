---
title: 前端框架资料
description: React、Vue、Svelte、Solid、Angular 及元框架、状态管理、UI 与可视化的官方文档、教程与原理资料
---

# 前端框架资料

优先阅读官方文档，再通过原理类文章与源码加深理解。

所有链接均已检查可访问。语言标签为资料正文语言；难度：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## React

!!! tip "这一组怎么学"
    第 1 周：按顺序做完 react.dev Learn 的 Quick Start、Thinking in React、Managing State，每章末尾的挑战题都亲手写一遍（约 12 小时）。第 2 周：读 You Might Not Need an Effect 与 Synchronizing with Effects，把自己写过的 useEffect 逐个检查是否可删除（约 4 小时）。第 3 周起：读 Overreacted 的 useEffect 完整指南与 React as a UI Runtime，再看 Fiber 架构笔记，能用自己的话讲清渲染、提交、调度三步（约 6 小时）。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [React 官方文档](https://react.dev/) | 官方文档 | English | 入门 | 从首页 Quick Start 做起，边读边在页内沙盒里改代码。 |
| [React 官方中文文档](https://zh-hans.react.dev/) | 官方文档 | 中文 | 入门 | 英文吃力时用它通读，术语以中文版为准再对照英文。 |
| [React Learn 教程入口](https://react.dev/learn) | 官方教程 | English | 入门 | 按左侧目录顺序学，每章做完 Challenges 再进下一章。 |
| [Thinking in React](https://react.dev/learn/thinking-in-react) | 官方教程 | English | 入门 | 照文中五步，自己用一个待办清单需求从零拆组件并划分 state。 |
| [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) | 官方教程 | English | 进阶 | 对照文中示例，把自己项目里的 useEffect 重构为事件处理或派生值。 |
| [中文版：你可能不需要 Effect](https://zh-hans.react.dev/learn/you-might-not-need-an-effect) | 官方教程 | 中文 | 进阶 | 先读中文版理解八类场景，再回英文版核对细节。 |
| [React API 参考](https://react.dev/reference/react) | 官方参考 | English | 进阶 | 遇到不熟的 Hook 先查此页，只读 Caveats 与 Troubleshooting 两节。 |
| [React Compiler 介绍](https://react.dev/learn/react-compiler/introduction) | 官方文档 | English | 进阶 | 在 Vite 项目中按文档启用编译器，对比开启前后 Profiler 的重渲染次数。 |
| [React 19 发布博客](https://react.dev/blog/2024/12/05/react-19) | 官方博客 | English | 进阶 | 逐个运行文中 Actions、use、ref 作为 prop 的示例，整理与 18 的差异表。 |
| [React Server Components 参考](https://react.dev/reference/rsc/server-components) | 官方参考 | English | 进阶 | 读完后在 Next.js App Router 项目里分别写一个服务端与客户端组件并观察产物。 |
| [React 官方博客](https://react.dev/blog) | 官方博客 | English | 进阶 | 了解 Server Components、Compiler 等新特性的设计动机，每月翻一次更新。 |
| [React Working Group 与 RFC](https://github.com/reactjs/rfcs) | 设计提案 | English | 深入 | 挑 Hooks 与 Server Components 两份 RFC，读 Motivation 一节并写摘要。 |
| [React Fiber 架构笔记](https://github.com/acdlite/react-fiber-architecture) | 源码解读 | English | 深入 | 读完后对照 Build Your Own React 的 Fiber 章节，画出 work loop 流程图。 |
| [React 源码仓库](https://github.com/facebook/react) | 源码 | English | 深入 | 从 packages/react-reconciler 的 beginWork 与 completeWork 读起，配合断点调试。 |
| [Dan Abramov：Overreacted](https://overreacted.io/) | 博客 | English | 深入 | 理解渲染与副作用的心智模型，按文章列表从旧到新读。 |
| [Overreacted：useEffect 完整指南](https://overreacted.io/a-complete-guide-to-useeffect/) | 博客 | English | 进阶 | 照文中 count 与 setInterval 示例自己复现闭包过期问题。 |
| [Overreacted：Before You memo()](https://overreacted.io/before-you-memo/) | 博客 | English | 进阶 | 照文中两种重构手法，把一个慢组件不用 memo 改快。 |
| [Overreacted：React as a UI Runtime](https://overreacted.io/react-as-a-ui-runtime/) | 博客 | English | 深入 | 分段读，每读完一节用一句话复述 React 做了什么。 |
| [Overreacted：The Two Reacts](https://overreacted.io/the-two-reacts/) | 博客 | English | 进阶 | 读完后说明客户端与服务端组件分别负责什么，作为理解 RSC 的入口。 |
| [Kent C. Dodds 博客](https://kentcdodds.com/blog) | 博客 | English | 进阶 | 按 React 标签挑三篇，每篇写一个最小复现示例。 |
| [Kent：State colocation](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster) | 博客 | English | 进阶 | 把自己项目中一个全局 state 下沉到使用处，记录重渲染变化。 |
| [Kent：useMemo 与 useCallback](https://kentcdodds.com/blog/usememo-and-usecallback) | 博客 | English | 进阶 | 用 Profiler 实测文中案例，明确什么时候缓存才有收益。 |
| [Epic React](https://epicreact.dev/) | 付费课程 | English | 进阶 | 看免费预览章节，判断是否需要系统性刻意练习。 |
| [Josh Comeau：React 专题](https://www.joshwcomeau.com/react/) | 交互式博客 | English | 入门 | 一次读一篇，照文中的交互演示动手改参数理解。 |
| [Josh Comeau：The Perils of Rehydration](https://www.joshwcomeau.com/react/the-perils-of-rehydration/) | 博客 | English | 进阶 | 在自己的 SSR 项目里复现 hydration mismatch 并按文中方案修复。 |
| [Josh Comeau：Server Components](https://www.joshwcomeau.com/react/server-components/) | 博客 | English | 进阶 | 读完画一张服务端与客户端组件边界图，再对照项目代码。 |
| [Josh Comeau：常见初学者错误](https://www.joshwcomeau.com/react/common-beginner-mistakes/) | 博客 | English | 入门 | 对照清单检查自己代码里是否出现同样的写法。 |

## Vue

!!! tip "这一组怎么学"
    第 1 周：完成官方交互式教程（约 3 小时），然后通读指南的基础与深入组件两部分（约 8 小时）。第 2 周：读响应式深入与渲染机制，手写一个 50 行的 reactive 与 effect（约 6 小时）。第 3 周：用 Pinia 与 Vue Router 做一个带登录守卫的小应用，再回头读源码仓库里 reactivity 包（约 10 小时）。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Vue 官方文档](https://cn.vuejs.org/) | 官方文档 | 中文 | 入门 | Vue 3 官方中文文档，先读「快速上手」与「基础」。 |
| [Vue 官方交互式教程](https://cn.vuejs.org/tutorial/) | 官方教程 | 中文 | 入门 | 在浏览器内做完全部步骤，每步先自己写再点「显示答案」。 |
| [Vue 官方英文文档](https://vuejs.org/guide/introduction.html) | 官方文档 | English | 入门 | 对照中文版阅读，更新通常先出现在英文版。 |
| [Vue 响应式深入](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html) | 官方文档 | 中文 | 深入 | 读完后手写 reactive、effect、computed，面试响应式原理题的好素材。 |
| [Vue 渲染机制](https://cn.vuejs.org/guide/extras/rendering-mechanism.html) | 官方文档 | 中文 | 深入 | 讲解虚拟 DOM、编译优化与静态提升，在模板编译器演示站对照输出。 |
| [Vue SSR 指南](https://vuejs.org/guide/scaling-up/ssr.html) | 官方文档 | English | 进阶 | 读完后回答 hydration 的前提与常见 mismatch 原因。 |
| [Vue 核心源码仓库](https://github.com/vuejs/core) | 源码 | English | 深入 | 从 packages/reactivity 读起，先读 ref 与 effect 再读 computed。 |
| [Vue RFCs](https://github.com/vuejs/rfcs) | 设计提案 | English | 深入 | 读 Composition API 与 script setup 的 RFC，理解设计取舍。 |
| [Vue DevTools 文档](https://devtools.vuejs.org/) | 工具文档 | English | 入门 | 安装后在自己项目里用时间线与组件检查器定位一次状态问题。 |
| [Vue Mastery](https://www.vuemastery.com/) | 视频课程 | English | 入门 | 先看免费课程，跟着做配套项目。 |
| [Vue School](https://vueschool.io/) | 视频课程 | English | 入门 | 选与当前项目相关的单门课程学习，不求全看。 |
| [Pinia 文档](https://pinia.vuejs.org/zh/) | 官方文档 | 中文 | 入门 | 用 setup store 重写一个 Vuex 风格的购物车状态。 |
| [Vue Router 文档](https://router.vuejs.org/zh/) | 官方文档 | 中文 | 入门 | 官方路由库文档，实现嵌套路由与导航守卫两个功能。 |

## 其他前端框架

!!! tip "这一组怎么学"
    选一个与 React 或 Vue 响应式思路不同的框架做对照：Svelte 看编译思路，Solid 看细粒度响应式，Angular 看依赖注入与企业级约定。每个框架先做官方教程（2 到 3 小时），再用它重写同一个待办应用，对比代码量与更新粒度。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Svelte 文档](https://svelte.dev/docs) | 官方文档 | English | 进阶 | 编译型框架官方文档，重点读 runes 相关章节。 |
| [Svelte 交互式教程](https://svelte.dev/tutorial/svelte/welcome-to-svelte) | 官方教程 | English | 入门 | 按顺序做完基础部分，约 2 小时。 |
| [Svelte 旧版教程入口](https://learn.svelte.dev/) | 官方教程 | English | 入门 | 作为教程的备用入口，和上一条择一学习。 |
| [SvelteKit 文档](https://svelte.dev/docs/kit) | 官方文档 | English | 进阶 | 读 Routing 与 Load 两章，写一个带表单 action 的页面。 |
| [SolidJS 文档](https://docs.solidjs.com/) | 官方文档 | English | 进阶 | 先读 Concepts 里的响应式部分，理解 signal 与 effect。 |
| [Solid 交互式教程](https://www.solidjs.com/tutorial/introduction_basics) | 官方教程 | English | 入门 | 做完 Reactivity 小节，对比 React 的 state 更新方式。 |
| [Angular 概览](https://angular.dev/overview) | 官方文档 | English | 入门 | 先读概览与 Essentials，了解组件、信号与依赖注入。 |
| [Angular Essentials](https://angular.dev/essentials) | 官方教程 | English | 入门 | 按页面顺序做完，每页动手写示例。 |
| [Angular 教程集](https://angular.dev/tutorials) | 官方教程 | English | 入门 | 从 Learn Angular 做起，再选一个进阶教程。 |
| [Qwik 文档](https://qwik.dev/docs/) | 官方文档 | English | 进阶 | 读 resumability 概念，对比 hydration 的开销。 |
| [htmx 文档](https://htmx.org/docs/) | 官方文档 | English | 入门 | 用 htmx 做一个无前端框架的搜索与分页页面。 |
| [Hypermedia Systems](https://hypermedia.systems/) | 在线书籍 | English | 进阶 | 读前几章理解超媒体驱动应用，对比 SPA 思路。 |
| [Lit 文档](https://lit.dev/docs/) | 官方文档 | English | 进阶 | 写一个 Web Component 并在 React 与 Vue 页面中复用。 |

## 元框架与路由

!!! tip "这一组怎么学"
    先挑一个主力元框架：React 路线走 Next.js Learn，Vue 路线走 Nuxt，内容站走 Astro。完成官方教程后，自己部署一个含 SSR、SSG 与 API 路由的小项目（约 8 小时），并说出每页使用的渲染模式与原因。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Next.js 文档](https://nextjs.org/docs) | 官方文档 | English | 进阶 | App Router、SSR/SSG、Server Actions 的官方文档。 |
| [Next.js App Router 文档](https://nextjs.org/docs/app) | 官方文档 | English | 进阶 | 读 Routing、Data Fetching、Caching 三部分并各做一个例子。 |
| [Next.js Learn](https://nextjs.org/learn) | 官方教程 | English | 入门 | 完成 Dashboard 应用教程，约 6 小时。 |
| [Nuxt 文档](https://nuxt.com/docs) | 官方文档 | English | 进阶 | Vue 生态元框架官方文档，服务端渲染与全栈能力。 |
| [Nuxt 入门](https://nuxt.com/docs/getting-started/introduction) | 官方文档 | English | 入门 | 跟着目录结构与自动导入两节建一个项目。 |
| [Astro 文档](https://docs.astro.build/zh-cn/getting-started/) | 官方文档 | 中文 | 进阶 | 内容型站点与 Islands 架构的官方文档。 |
| [Astro 博客教程](https://docs.astro.build/en/tutorial/0-introduction/) | 官方教程 | English | 入门 | 做完整个博客教程，观察产物里的零 JS 页面。 |
| [React Router 文档](https://reactrouter.com/home) | 官方文档 | English | 进阶 | 读 data loading 与 actions，实现一个带 loader 的路由。 |
| [Remix 文档](https://remix.run/docs/en/main) | 官方文档 | English | 进阶 | 读嵌套路由与表单思想，对照 Web 标准的使用方式。 |
| [TanStack Router 文档](https://tanstack.com/router/latest/docs/framework/react/overview) | 官方文档 | English | 进阶 | 体验类型安全路由，把一个小项目的路由迁过来。 |

## 状态与数据

!!! tip "这一组怎么学"
    先区分服务端状态与客户端状态：服务端状态用 TanStack Query，客户端状态在 Redux Toolkit、Zustand、Jotai 中选一个。每个库各做一个计数器加列表请求的 Demo，比较样板代码量，再用 XState 写一个有限状态机（总计约 10 小时）。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [TanStack Query 文档](https://tanstack.com/query/latest) | 官方文档 | English | 进阶 | 服务端状态管理库，学习缓存、失效与数据请求设计。 |
| [TanStack Query 概览](https://tanstack.com/query/latest/docs/framework/react/overview) | 官方文档 | English | 入门 | 先读 Important Defaults，理解 staleTime 与 gcTime。 |
| [TkDodo：Practical React Query](https://tkdodo.eu/blog/practical-react-query) | 博客系列 | English | 进阶 | 维护者之一的系列文章，按顺序读并在项目里试验。 |
| [TanStack Table 文档](https://tanstack.com/table/latest) | 官方文档 | English | 进阶 | 实现一个带排序与分页的无样式表格。 |
| [Redux Toolkit 快速上手](https://redux-toolkit.js.org/tutorials/quick-start) | 官方教程 | English | 入门 | 照教程做出 counter，再改写成带 createAsyncThunk 的版本。 |
| [Redux Essentials](https://redux.js.org/tutorials/essentials/part-1-overview-concepts) | 官方教程 | English | 入门 | 做完 Part 1 到 Part 3，理解单向数据流。 |
| [Redux 中文文档](https://cn.redux.js.org/) | 官方文档 | 中文 | 入门 | 中文翻译版，与英文教程对照学习。 |
| [Zustand 文档](https://zustand.docs.pmnd.rs/) | 官方文档 | English | 入门 | 用一个 store 实现购物车，再试 persist 中间件。 |
| [Jotai 文档](https://jotai.org/docs/introduction) | 官方文档 | English | 入门 | 用派生 atom 实现联动表单，体会原子化状态。 |
| [XState 文档](https://stately.ai/docs) | 官方文档 | English | 进阶 | 把一个多步骤表单建模成状态机并画出状态图。 |
| [MobX 文档](https://mobx.js.org/README.html) | 官方文档 | English | 进阶 | 用 observable 与 observer 改写一个组件，理解自动追踪依赖。 |
| [MobX 中文文档](https://cn.mobx.js.org/) | 官方文档 | 中文 | 进阶 | 中文版入门，注意版本可能落后于英文版。 |
| [Pinia 入门](https://pinia.vuejs.org/zh/introduction.html) | 官方文档 | 中文 | 入门 | 读完核心概念，对比 Vuex 的区别。 |

## UI、样式、动画与可视化

!!! tip "这一组怎么学"
    先用 Tailwind 文档把原子类写熟（约 6 小时），再用 Radix 与 shadcn/ui 学无障碍组件的拼装方式。动画先用 Motion 做声明式过渡，再用 GSAP 做时间线。可视化用 D3 理解数据绑定，业务图表用 ECharts，每个工具各出一个 Demo。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Tailwind CSS 文档](https://tailwindcss.com/docs) | 官方文档 | English | 入门 | 按左侧目录一类一类过，边读边在 Playground 中试写。 |
| [Tailwind 安装指南](https://tailwindcss.com/docs/installation) | 官方文档 | English | 入门 | 在 Vite 项目中完成安装并写一个响应式卡片。 |
| [Radix Primitives 文档](https://www.radix-ui.com/primitives/docs/overview/introduction) | 官方文档 | English | 进阶 | 读 Dialog 与 Dropdown，对照 WAI-ARIA 键盘行为。 |
| [shadcn/ui 文档](https://ui.shadcn.com/docs) | 官方文档 | English | 入门 | 用 CLI 加入三个组件，阅读生成的源码再自行改造。 |
| [Ant Design 中文文档](https://ant.design/docs/react/introduce-cn) | 官方文档 | 中文 | 入门 | 做一个含表单与表格的后台页，学习 Form 的校验用法。 |
| [Motion 文档](https://motion.dev/docs) | 官方文档 | English | 进阶 | 做一个列表进出场与布局动画，体验声明式动画 API。 |
| [GSAP 文档](https://gsap.com/docs/v3/) | 官方文档 | English | 进阶 | 用 Timeline 编排一段三步动画，再接入 ScrollTrigger。 |
| [Josh Comeau：CSS 过渡](https://www.joshwcomeau.com/animation/css-transitions/) | 交互式博客 | English | 入门 | 照文中的交互示例调整缓动曲线，理解时间函数。 |
| [D3 入门](https://d3js.org/getting-started) | 官方文档 | English | 进阶 | 用 selection 与 scale 手画一张柱状图。 |
| [ECharts 中文手册](https://echarts.apache.org/handbook/zh/get-started/) | 官方文档 | 中文 | 入门 | 做折线、柱状、饼图各一个，再试 dataset 与交互联动。 |
| [ECharts 官网与示例](https://echarts.apache.org/en/index.html) | 示例库 | English | 入门 | 在示例库中复制一个相近图表改成自己的数据。 |

## 框架原理

!!! tip "这一组怎么学"
    掌握使用后再读原理：先按 Build Your Own React 手写简化版（约 4 小时），再读渲染模式合集，说出每种模式的首屏与交互权衡。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Build Your Own React](https://pomb.us/build-your-own-react/) | 手写教程 | English | 深入 | 一步步手写简化版 React（含 Fiber），理解调度与协调。 |
| [patterns.dev](https://www.patterns.dev/) | 模式合集 | English | 进阶 | 渲染模式与设计模式合集，覆盖 SSR、岛屿、流式渲染等。 |
| [patterns.dev：React 模式](https://www.patterns.dev/react/) | 模式合集 | English | 进阶 | 挑 HOC、Hooks、Compound 三种模式各写一个示例。 |
