---
title: 源码阅读路线
description: 由易到难的开源仓库阅读顺序，每个仓库给出入口文件、阅读问题与迷你练习
---

# 源码阅读路线

读源码的目标不是读完仓库，而是带着一个问题读一个文件，然后能不看源码手写出它的核心。下面的顺序由易到难，前一个仓库的概念会在后一个仓库里反复出现。

## 阅读方法

!!! tip "这一组怎么学"
    每个仓库按同样的四步走，一个仓库控制在 2 到 4 小时内。

1. 先读 README 与 `package.json`，确认入口文件和对外 API。
2. 只读“起点文件”，不要沿着调用链一路深入；遇到不懂的辅助函数先跳过。
3. 回答“阅读问题”，把答案写成 5 行笔记。
4. 做“迷你练习”：关闭源码，手写一个 50 到 100 行的版本，并用原仓库的测试用例或你自己写的用例验证。

阅读时用 GitHub 的符号搜索与 `git log -p 文件名` 查看某个设计是怎样演变的。已经安装在 `node_modules` 里的包，可以直接打开其 `dist` 或 `src` 并加断点调试。

## 第一梯队：50 到 200 行的小库

!!! tip "这一组怎么学"
    这一组用于建立读源码的信心。每个库一次读完，当天手写一遍。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [mitt](https://github.com/developit/mitt) | 仓库 | English | 阶段 0 之后，入门 | 起点 [src/index.ts](https://github.com/developit/mitt/blob/main/src/index.ts)。问：事件表用什么数据结构，`*` 通配如何实现。练习：加 `once` 方法并写测试 |
| [p-limit](https://github.com/sindresorhus/p-limit) | 仓库 | English | 阶段 1，入门 | 起点 [index.js](https://github.com/sindresorhus/p-limit/blob/main/index.js)。问：并发上限如何用队列表达，任务完成后如何唤醒下一个。练习：手写 `asyncPool`，用 20 个延迟任务验证最大并发数 |
| [the-super-tiny-compiler](https://github.com/jamiebuilds/the-super-tiny-compiler) | 仓库 | English | 阶段 1，入门 | 起点 [the-super-tiny-compiler.js](https://github.com/jamiebuilds/the-super-tiny-compiler/blob/master/the-super-tiny-compiler.js)。问：tokenizer、parser、transformer、generator 各自的输入输出是什么。练习：增加一种新的节点类型并贯通四个阶段 |
| [path-to-regexp](https://github.com/pillarjs/path-to-regexp) | 仓库 | English | 阶段 1，进阶 | 起点 [src/index.ts](https://github.com/pillarjs/path-to-regexp/blob/master/src/index.ts)。问：路径模式如何被解析为 token 再变成正则。练习：实现支持 `:id` 与 `*` 的路径匹配函数 |
| [ky](https://github.com/sindresorhus/ky) | 仓库 | English | 阶段 1，进阶 | 起点 [source/core/Ky.ts](https://github.com/sindresorhus/ky/blob/main/source/core/Ky.ts)。问：重试、超时、钩子是怎样包在 fetch 外面的。练习：给自己的请求封装加超时与指数退避重试 |

## 第二梯队：状态管理与中间件

!!! tip "这一组怎么学"
    这一组的共同主题是“订阅发布”与“函数组合”。读完要能说清楚状态变化如何通知到组件。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [zustand](https://github.com/pmndrs/zustand) | 仓库 | English | 阶段 2，入门 | 起点 [src/vanilla.ts](https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts)，再读 [src/react.ts](https://github.com/pmndrs/zustand/blob/main/src/react.ts)。问：状态存在哪里，React 如何订阅它。练习：用 `useSyncExternalStore` 手写 50 行的 mini zustand |
| [redux](https://github.com/reduxjs/redux) | 仓库 | English | 阶段 2，进阶 | 起点 [createStore.ts](https://github.com/reduxjs/redux/blob/master/src/createStore.ts)、[compose.ts](https://github.com/reduxjs/redux/blob/master/src/compose.ts)、[applyMiddleware.ts](https://github.com/reduxjs/redux/blob/master/src/applyMiddleware.ts)。问：中间件为什么写成三层函数，`compose` 的执行顺序是什么。练习：手写 `applyMiddleware` 并实现一个日志中间件与一个 thunk 中间件 |
| [jotai](https://github.com/pmndrs/jotai) | 仓库 | English | 阶段 2，进阶 | 起点 [vanilla/atom.ts](https://github.com/pmndrs/jotai/blob/main/src/vanilla/atom.ts) 与 [vanilla/store.ts](https://github.com/pmndrs/jotai/blob/main/src/vanilla/store.ts)。问：派生状态的依赖图怎么维护。练习：实现带一个派生 atom 的最小原子状态库 |
| [koa](https://github.com/koajs/koa) 与 [koa-compose](https://github.com/koajs/compose) | 仓库 | English | 阶段 4，进阶 | 起点 [lib/application.js](https://github.com/koajs/koa/blob/master/lib/application.js) 与 [compose/index.js](https://github.com/koajs/compose/blob/master/index.js)。问：洋葱模型靠什么实现，`next()` 被调用两次会怎样。练习：手写 `compose` 并用它搭一个 30 行的 HTTP 框架 |
| [express](https://github.com/expressjs/express) | 仓库 | English | 阶段 4，进阶 | 起点 [lib/express.js](https://github.com/expressjs/express/blob/master/lib/express.js) 与 [lib/application.js](https://github.com/expressjs/express/blob/master/lib/application.js)。问：路由与中间件如何合并成一条处理链，错误中间件为何要 4 个参数。练习：实现支持路径参数与错误处理的 mini express，与 koa 的写法比较 |

## 第三梯队：UI 运行时

!!! tip "这一组怎么学"
    这一组是框架原理的核心。先读 Preact 的小体量实现，再读 Vue 响应式，最后读 React 调度。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Build your own React（Didact）](https://pomb.us/build-your-own-react/) 与 [didact 仓库](https://github.com/pomber/didact) | 教程与仓库 | English | 阶段 2，进阶 | 先读教程再读代码。问：为什么需要 fiber 与可中断的渲染。练习：跟着教程写出支持函数组件与 `useState` 的版本 |
| [preact](https://github.com/preactjs/preact) | 仓库 | English | 阶段 2，进阶 | 起点 [create-element.js](https://github.com/preactjs/preact/blob/main/src/create-element.js)、[diff/index.js](https://github.com/preactjs/preact/blob/main/src/diff/index.js)、[diff/children.js](https://github.com/preactjs/preact/blob/main/src/diff/children.js)。问：子节点 diff 时如何利用 key 复用 DOM。练习：实现 `h()` 与只更新变化属性的 `patch()` |
| [Vue core：reactivity](https://github.com/vuejs/core/tree/main/packages/reactivity) | 仓库 | English | 阶段 2，进阶 | 起点 [reactive.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/reactive.ts)、[ref.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/ref.ts)、[effect.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts)、[dep.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/dep.ts)。问：依赖在读取时如何被收集，触发时如何找到对应的副作用。练习：用 `Proxy` 实现 `reactive`、`effect`、`computed`，并支持嵌套对象；对照 [Vue 官方响应式原理](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html) |
| [petite-vue](https://github.com/vuejs/petite-vue) | 仓库 | English | 阶段 2，进阶 | 起点 [src/index.ts](https://github.com/vuejs/petite-vue/blob/main/src/index.ts)。问：没有虚拟 DOM 时，指令是怎样直接绑定到真实 DOM 的。练习：实现 `v-text` 与 `v-on` 两个指令 |
| [React Scheduler](https://github.com/facebook/react/tree/main/packages/scheduler) | 仓库 | English | 阶段 2，深入 | 起点 [Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js) 与 [SchedulerMinHeap.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/SchedulerMinHeap.js)。问：任务按什么排序，为何用 `MessageChannel` 让出主线程。练习：用最小堆与 `MessageChannel` 写一个时间切片调度器，并用长任务验证页面不卡顿 |
| [Solid](https://github.com/solidjs/solid) | 仓库 | English | 阶段 2，深入 | 阅读 README 与 `packages/solid` 目录。问：为什么细粒度响应式不需要虚拟 DOM。练习：对比 Solid 的 `createSignal` 与 Vue 的 `ref`，写一页差异笔记 |

## 第四梯队：编译器与构建工具

!!! tip "这一组怎么学"
    先读解析器理解 AST，再读打包器理解模块图，最后读 Vite 理解“开发时不打包”的设计。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [acorn](https://github.com/acornjs/acorn) | 仓库 | English | 阶段 5，进阶 | 起点 [tokenize.js](https://github.com/acornjs/acorn/blob/master/acorn/src/tokenize.js) 与 [state.js](https://github.com/acornjs/acorn/blob/master/acorn/src/state.js)。问：词法分析如何处理正则与除号的歧义。练习：用 acorn 解析一段代码并写脚本统计函数个数，用 [AST Explorer](https://astexplorer.net/) 对照结果 |
| [Babel Handbook](https://github.com/jamiebuilds/babel-handbook) | 文档 | English | 阶段 5，进阶 | 通读“Plugin Handbook”。问：访问者模式如何遍历 AST。练习：写一个把 `console.log` 删除的 Babel 插件 |
| [rollup](https://github.com/rollup/rollup) | 仓库 | English | 阶段 5，深入 | 起点 [Graph.ts](https://github.com/rollup/rollup/blob/master/src/Graph.ts)、[ModuleLoader.ts](https://github.com/rollup/rollup/blob/master/src/ModuleLoader.ts)、[Bundle.ts](https://github.com/rollup/rollup/blob/master/src/Bundle.ts)。问：模块图如何构建，tree-shaking 在哪一步决定保留哪些语句。练习：手写 100 行的打包器，处理 ES 模块的相对路径导入并输出单文件 |
| [esbuild](https://github.com/evanw/esbuild) | 仓库 | English | 阶段 5，深入 | 起点 [docs/architecture.md](https://github.com/evanw/esbuild/blob/main/docs/architecture.md)。问：为什么 esbuild 比同类工具快一个数量级。练习：用 esbuild 的 JS API 写一个把 `.txt` 文件当字符串导入的插件，并与 Rollup 的同类插件比较 |
| [vite](https://github.com/vitejs/vite) | 仓库 | English | 阶段 3 与阶段 5，深入 | 起点 [server/index.ts](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/index.ts)、[middlewares/transform.ts](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/middlewares/transform.ts)、[pluginContainer.ts](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/pluginContainer.ts)。问：一个 `import` 请求到达开发服务器后依次经过哪些中间件与插件钩子。练习：用 Node 写一个能把 `import 'vue'` 改写为 `/node_modules/.vite/deps/vue.js` 的最小开发服务器 |

## 第五梯队：AI Agent 内核

!!! tip "这一组怎么学"
    先读本站的架构文章建立地图，再对照源码确认细节。Agent 内核的核心是循环、工具协议、上下文与中止，每读一个文件只关注其中一项。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [pi（含 pi-agent-core）](https://github.com/earendil-works/pi) | 仓库 | English | 阶段 6，进阶 | 起点 [packages/agent/src/agent.ts](https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent.ts) 与 [agent-loop.ts](https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent-loop.ts)。问：一个 turn 的边界在哪里，工具并行与顺序执行如何切换。练习：手写不超过 100 行的 Agent 循环，带两个工具与中止信号，对照本站 [手写 mini harness](../agent/harness/build-mini-harness.md) |
| DeepSeek harness（本站解读） | 站内文章 | 中文 | 阶段 6，进阶 | 依次读 [架构](../agent/harness/deepseek-harness-architecture.md)、[核心包](../agent/harness/deepseek-harness-core-packages.md)、[Agent 循环](../agent/harness/deepseek-harness-agent-loop.md)。问：它与 pi 在循环与扩展点上的取舍有何不同，可参考 [对比文章](../agent/harness/harness-comparison-pi-deepseek.md)。练习：画一张两者的循环对比图 |
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | 仓库 | English | 阶段 6，进阶 | 从 README 的服务器示例开始，再读 `src/server` 目录。问：工具列表与调用在协议里是哪两类消息。练习：写一个暴露 `read_file` 与 `list_dir` 的 MCP 服务器 |
| [OpenAI Agents SDK（JS）](https://github.com/openai/openai-agents-js) | 仓库 | English | 阶段 6，进阶 | 阅读 README 与 `packages` 目录。问：它如何抽象 handoff 与 guardrail。练习：用它重写你的 mini 循环，比较两者的代码量与可观测性 |
| [Vercel AI SDK](https://github.com/vercel/ai) | 仓库 | English | 阶段 6，进阶 | 阅读 `packages/ai` 中的流式与工具调用实现。问：不同模型提供商的差异在哪一层被抹平。练习：写一个适配两个提供商的最小接口层 |

## 配套资料

!!! tip "这一组怎么学"
    读不动时回到这里：先读讲解类资料，再回仓库。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Vue 3 响应式原理（官方）](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html) | 文档 | 中文 | 阶段 2，进阶 | 读完后再读 reactivity 源码 |
| [Vue 2 响应式源码目录](https://github.com/vuejs/vue/tree/main/src/core/observer) | 仓库 | English | 阶段 2，进阶 | 与 Vue 3 实现对比 `Object.defineProperty` 与 `Proxy` 的差异 |
| [mqyqingfeng/Blog](https://github.com/mqyqingfeng/Blog) | 博客仓库 | 中文 | 阶段 1，进阶 | 读其中的 JavaScript 专题系列，配合手写练习 |
| [Node.js 贡献文档](https://github.com/nodejs/node/blob/main/doc/contributing) | 文档 | English | 阶段 5，深入 | 想读 Node 源码时先读它，了解目录结构与构建方式 |
| [本站：手写系列与源码练习](../coding/index.md) | 站内栏目 | 中文 | 阶段 1 到 2，进阶 | 与上表仓库对应练习，先写再对照 |
