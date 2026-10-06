---
title: 运行时、WebAssembly 与 Rust 资料
description: Node.js、Bun、Deno、边缘运行时，以及 Rust 与 WebAssembly 在前端工具链和浏览器中的学习资源
---

# 运行时、WebAssembly 与 Rust 资料

先弄清 JavaScript 运行时的差异，再学 Rust 基础，最后用 WebAssembly 把两者连接到浏览器与工具链中。

所有链接均已检查可访问。语言标签为资料正文语言；难度：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## Node.js 运行时

!!! tip "这一组怎么学"
    读 Node.js Learn 入门与事件循环（约 4 小时），再依次读流与背压、Worker 线程、性能分析。每读一篇写一个 50 行以内的脚本验证。最后读最佳实践仓库，建立服务端工程的检查清单。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Node.js 简介](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs) | 官方教程 | English | 入门 | 读运行模型部分，理解单线程加事件循环。 |
| [Node.js Learn](https://nodejs.org/en/learn) | 官方教程 | English | 入门 | 按目录顺序读，选与当前工作相关的主题。 |
| [Node.js API 文档](https://nodejs.org/api/) | 官方参考 | English | 进阶 | 需要时查接口，先读 Stability 标注。 |
| [Node.js 事件循环](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick) | 官方教程 | English | 进阶 | 写打印顺序题，验证各阶段执行顺序。 |
| [Node.js Stream](https://nodejs.org/api/stream.html) | 官方文档 | English | 进阶 | 用 pipeline 处理一个大文件，观察内存占用。 |
| [Stream 背压](https://nodejs.org/en/learn/modules/backpressuring-in-streams) | 官方教程 | English | 深入 | 故意忽略背压，对比内存曲线。 |
| [Worker Threads](https://nodejs.org/api/worker_threads.html) | 官方文档 | English | 进阶 | 把一个 CPU 密集任务放到 worker 并测量耗时。 |
| [Node.js 性能分析](https://nodejs.org/en/learn/getting-started/profiling) | 官方教程 | English | 进阶 | 用 --prof 或 inspector 生成并阅读一份 profile。 |
| [Node.js 诊断入门](https://nodejs.org/en/learn/diagnostics/user-journey) | 官方教程 | English | 进阶 | 按症状查找对应的诊断方法。 |
| [Node.js 内置测试运行器](https://nodejs.org/en/learn/test-runner/introduction) | 官方教程 | English | 入门 | 为一个模块写 node:test 用例。 |
| [发布 npm 包](https://nodejs.org/en/learn/modules/publishing-a-package) | 官方教程 | English | 入门 | 发布一个测试包，检查 exports 配置。 |
| [Node.js Addons](https://nodejs.org/api/addons.html) | 官方文档 | English | 深入 | 了解原生扩展机制，理解为什么出现 N-API。 |
| [N-API 的 Rust 绑定 napi-rs](https://napi.rs/docs/introduction/getting-started) | 官方文档 | English | 深入 | 写一个 Rust 函数并从 Node 调用。 |
| [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices) | 清单 | English | 进阶 | 对照项目逐条评分，挑三条落地。 |
| [Node.js 最佳实践（中文）](https://github.com/goldbergyoni/nodebestpractices/blob/master/README.chinese.md) | 清单 | 中文 | 进阶 | 中文版清单，便于团队内分享。 |

## Bun、Deno 与边缘运行时

!!! tip "这一组怎么学"
    用 Bun 与 Deno 各重写一遍同一个小型 HTTP 服务（各约 2 小时），记录权限、模块、TypeScript 支持差异。再读 WinterTC 标准化的 Web API 子集，把服务部署到 Cloudflare Workers 并比较冷启动与限制。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Bun 文档](https://bun.sh/docs) | 官方文档 | English | 入门 | 用 Bun 运行与打包一个小项目。 |
| [Bun 博客](https://bun.sh/blog) | 官方博客 | English | 进阶 | 读性能与兼容性文章了解设计取舍。 |
| [Bun 测试运行器](https://bun.sh/docs/cli/test) | 官方文档 | English | 入门 | 用 bun test 跑一遍测试，与 Vitest 对比。 |
| [Deno 文档](https://docs.deno.com/runtime/) | 官方文档 | English | 入门 | 体验权限模型与内置工具。 |
| [Deno 测试](https://docs.deno.com/runtime/fundamentals/testing/) | 官方文档 | English | 入门 | 用 deno test 写用例。 |
| [Deno 博客](https://deno.com/blog) | 官方博客 | English | 进阶 | 读与 Node 兼容性相关的文章。 |
| [WinterTC](https://wintertc.org/) | 标准组织 | English | 进阶 | 读它定义的跨运行时 Web API 最小集合。 |
| [WinterCG 旧站](https://wintercg.org/) | 标准组织 | English | 进阶 | 了解 WinterTC 前身的历史与背景。 |
| [Minimum Common API 提案](https://min-common-api.proposal.wintertc.org/) | 标准提案 | English | 深入 | 对照列表检查自己的代码是否可跨运行时。 |
| [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/) | 官方文档 | English | 入门 | 读概念后部署一个 Worker。 |
| [Workers 快速上手](https://developers.cloudflare.com/workers/get-started/guide/) | 官方教程 | English | 入门 | 用命令行创建并发布一个 Hello 服务。 |
| [Workers 运行时 API](https://developers.cloudflare.com/workers/runtime-apis/) | 官方参考 | English | 进阶 | 查可用 API 与限制，与 Node 差异对照。 |
| [Workers 的 Node.js 兼容](https://developers.cloudflare.com/workers/runtime-apis/nodejs/) | 官方文档 | English | 进阶 | 检查哪些 node: 模块可用。 |
| [workerd](https://github.com/cloudflare/workerd) | 开源运行时 | English | 深入 | 阅读 README 与配置，本地运行 Workers 运行时。 |
| [Hono 文档](https://hono.dev/docs/) | 官方文档 | English | 入门 | 用一个框架写可跨 Workers、Deno、Bun 的服务。 |
| [UnJS](https://unjs.io/) | 生态站点 | English | 进阶 | 浏览通用工具库，了解跨运行时的基础包。 |
| [Nitro](https://nitro.build/) | 官方文档 | English | 进阶 | 理解一套服务端代码如何适配多种部署目标。 |
| [Vercel Edge Runtime](https://edge-runtime.vercel.app/) | 官方文档 | English | 进阶 | 了解边缘函数的运行时约束。 |

## Rust 基础

!!! tip "这一组怎么学"
    Rust Book 通读前 10 章（约 25 小时，所有权与生命周期部分慢读），同时用 Rustlings 做练习（约 10 小时）。再读 Rust By Example 补充代码示例。中文读者可直接读《Rust 程序设计语言》简体中文版。目标是能写一个命令行工具并读懂前端工具链中的 Rust 项目。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [The Rust Programming Language](https://doc.rust-lang.org/book/) | 官方书籍 | English | 入门 | 按章节读并敲每个示例，所有权章节读两遍。 |
| [Rust 程序设计语言（简体中文版）](https://kaisery.github.io/trpl-zh-cn/) | 官方书籍翻译 | 中文 | 入门 | 中文读者首选，章节与英文版一致。 |
| [Rustlings](https://github.com/rust-lang/rustlings) | 练习 | English | 入门 | 安装后每天做 5 题，卡住再查书对应章节。 |
| [Rustlings 官网](https://rustlings.rust-lang.org/) | 练习 | English | 入门 | 查看安装与使用说明。 |
| [Rust By Example](https://doc.rust-lang.org/rust-by-example/) | 官方示例 | English | 入门 | 作为 Rust Book 的补充，遇到不懂的语法查对应示例。 |
| [Rust 学习入口](https://www.rust-lang.org/learn) | 官方导航 | English | 入门 | 按目标选择阅读路径。 |
| [Cargo 手册](https://doc.rust-lang.org/cargo/) | 官方手册 | English | 入门 | 读工作区与特性两节，对应前端的 monorepo 概念。 |
| [Rust 异步书](https://rust-lang.github.io/async-book/) | 官方书籍 | English | 进阶 | 读 Future 与 async 基础，为学习 Tokio 做准备。 |
| [Tokio 教程](https://tokio.rs/tokio/tutorial) | 官方教程 | English | 进阶 | 做完迷你 Redis 教程。 |
| [Rustonomicon](https://doc.rust-lang.org/nomicon/) | 官方书籍 | English | 深入 | 在熟悉所有权后阅读 unsafe 相关章节。 |
| [roadmap.sh Rust](https://roadmap.sh/rust) | 学习路线 | English | 入门 | 对照路线图标记自己已掌握的主题。 |
| [Tauri 文档](https://v2.tauri.app/start/) | 官方文档 | English | 进阶 | 用前端技术加 Rust 后端做一个桌面应用。 |
| [Oxc 源码仓库](https://github.com/oxc-project/oxc) | 源码 | English | 深入 | 读一个前端工具的 Rust 实现，从解析器入口开始。 |

## WebAssembly 基础与规范

!!! tip "这一组怎么学"
    先读 MDN 的 WebAssembly 概念页与 webassembly.org 开发者指南（约 3 小时），用 WAT 在线工具手写一个加法函数并从 JS 调用。想理解细节再读 JS API 规范与核心规范，规范只当查阅手册。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [WebAssembly 官网](https://webassembly.org/) | 官网 | English | 入门 | 了解项目背景与支持情况。 |
| [WebAssembly 开发者指南](https://webassembly.org/getting-started/developers-guide/) | 官方指南 | English | 入门 | 选一种语言路线，编译一个最小模块。 |
| [MDN WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly) | 参考文档 | English | 入门 | 读概念页后动手实例化一个模块。 |
| [MDN WebAssembly 中文](https://developer.mozilla.org/zh-CN/docs/WebAssembly) | 参考文档 | 中文 | 入门 | 中文版入口，适合先建立概念。 |
| [MDN：Wasm 概念](https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Concepts) | 参考文档 | English | 入门 | 读完说明模块、实例、内存、表四个核心对象。 |
| [MDN：从 Rust 编译到 Wasm](https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Rust_to_Wasm) | 官方教程 | English | 入门 | 跟着教程做出第一个 Rust 到浏览器的例子。 |
| [WAT 在线转换 wabt demo](https://webassembly.github.io/wabt/demo/wat2wasm/) | 在线工具 | English | 进阶 | 手写 WAT 并查看二进制与 JS 调用结果。 |
| [WebAssembly 核心规范](https://webassembly.github.io/spec/core/) | 规范 | English | 深入 | 作为查阅手册，遇到指令语义再读对应章节。 |
| [WebAssembly JS API 规范](https://webassembly.github.io/spec/js-api/) | 规范 | English | 深入 | 读 instantiate 与 Memory 接口，理解与 JS 的交互边界。 |
| [WABT 工具集](https://github.com/WebAssembly/wabt) | 工具 | English | 进阶 | 用 wasm2wat 反汇编自己编译的产物。 |
| [Surma：Rust 与 WebAssembly](https://surma.dev/things/rust-to-webassembly/) | 博客 | English | 进阶 | 读它如何不借助工具链手工编译，理解底层细节。 |

## Rust 与 WebAssembly 工具链

!!! tip "这一组怎么学"
    读 Rust and WebAssembly 书与 wasm-bindgen 指南，用 wasm-pack 做一个图像处理函数并在前端页面调用，测量与纯 JS 版本的耗时（约 10 小时）。想用 Rust 写整个前端界面再选 Leptos、Yew、Dioxus 之一，不必全学。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Rust and WebAssembly 书](https://rustwasm.github.io/docs/book/) | 官方书籍 | English | 进阶 | 做完 Game of Life 教程，理解 JS 与 Wasm 内存边界。 |
| [wasm-bindgen 指南](https://wasm-bindgen.github.io/wasm-bindgen/) | 官方指南 | English | 进阶 | 读类型映射一节，写出带结构体的导出函数。 |
| [wasm-pack 文档](https://rustwasm.github.io/docs/wasm-pack/) | 官方文档 | English | 进阶 | 用它构建并发布一个 npm 包。 |
| [Trunk 文档](https://trunk-rs.github.io/trunk/) | 官方文档 | English | 进阶 | 用 Trunk 打包一个纯 Rust 前端应用。 |
| [Leptos Book](https://book.leptos.dev/) | 官方书籍 | English | 进阶 | 做一个细粒度响应式计数器，对比 Solid 的思路。 |
| [Leptos 官网](https://leptos.dev/) | 官网 | English | 进阶 | 查看示例与生态。 |
| [Yew 文档](https://yew.rs/docs/getting-started/introduction) | 官方文档 | English | 进阶 | 对比其组件模型与 React 的相似与差异。 |
| [Dioxus 文档](https://dioxuslabs.com/learn/0.7/) | 官方文档 | English | 进阶 | 用同一套代码尝试 Web 与桌面目标。 |
| [Rust and WebAssembly 旧站](https://rustwasm.github.io/book/) | 官方书籍 | English | 进阶 | 作为备用入口，内容与上方书籍一致。 |

## WASI、组件模型与其他语言

!!! tip "这一组怎么学"
    读 WASI 与 Component Model 文档了解 Wasm 走出浏览器的方向（约 4 小时），用 Wasmtime 运行一个 WASI 程序。需要在 JS 中使用组件时试用 jco。C 与 C++ 代码迁移选 Emscripten，TypeScript 背景选 AssemblyScript。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [WASI 官网](https://wasi.dev/) | 官网 | English | 进阶 | 读目标与提案列表，理解系统接口标准化。 |
| [WASI 仓库](https://github.com/WebAssembly/wasi) | 规范仓库 | English | 深入 | 浏览各接口提案的状态。 |
| [Component Model 文档](https://component-model.bytecodealliance.org/) | 官方文档 | English | 进阶 | 读设计与接口类型部分，理解 WIT 的作用。 |
| [Component Model 规范仓库](https://github.com/WebAssembly/component-model) | 规范仓库 | English | 深入 | 读设计文档，了解提案进展。 |
| [Component Model：JavaScript](https://component-model.bytecodealliance.org/language-support/javascript.html) | 官方文档 | English | 进阶 | 照文档把一段 JS 编译为组件。 |
| [jco](https://github.com/bytecodealliance/jco) | 工具 | English | 进阶 | 在 Node 中运行一个 Wasm 组件。 |
| [Bytecode Alliance](https://bytecodealliance.org/) | 组织官网 | English | 进阶 | 浏览项目列表与博客，了解运行时生态。 |
| [Wasmtime 文档](https://docs.wasmtime.dev/) | 官方文档 | English | 进阶 | 安装后运行一个 WASI 程序。 |
| [Wasmer](https://wasmer.io/) | 运行时 | English | 进阶 | 对比其与 Wasmtime 的定位。 |
| [WasmEdge 文档](https://wasmedge.org/docs/) | 官方文档 | English | 进阶 | 了解面向云原生与边缘的运行时。 |
| [Extism 文档](https://extism.org/docs/overview) | 官方文档 | English | 进阶 | 理解用 Wasm 做插件系统的方案。 |
| [Emscripten 入门](https://emscripten.org/docs/getting_started/index.html) | 官方文档 | English | 进阶 | 把一个小 C 程序编译成 Wasm 并在网页运行。 |
| [AssemblyScript 介绍](https://www.assemblyscript.org/introduction.html) | 官方文档 | English | 进阶 | 用类 TypeScript 语法编写 Wasm 模块。 |
| [AssemblyScript 仓库](https://github.com/AssemblyScript/assemblyscript) | 源码 | English | 深入 | 阅读编译器结构，对比 Rust 路线。 |
| [Mozilla Hacks：WASI 标准化](https://hacks.mozilla.org/2019/03/standardizing-wasi-a-webassembly-system-interface/) | 文章 | English | 进阶 | 读它了解 WASI 的提出背景。 |
