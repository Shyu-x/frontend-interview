---
title: 手写代码概览
description: 从经典 JavaScript 到浏览器交互、Node.js 服务与 Go 并发，按需求连接手写练习、完整实现和自动测试。先从小例子理解状态，再独立编码、改变约束和检查失败路径，逐步建立能迁移到真实项目的代码熟练度。
tags:
  - coding
  - interview
date: 2026-10-13
level: reference
prerequisites:
  - JavaScript 函数、数组、对象和 Promise
runnable: false
verified_at: 2026-10-13
source_commit: a489bf9bbebe96c3653c0dbe6bf1e97343aaf655
---

# 手写代码概览

从一个具体需求开始。先手算例子，再写状态和函数，最后跑测试。想提高独立编码能力，先读[怎样练得自然](coding-fluency.md)。想选题，打开[练习与题解入口](handwritten-practice-360.md)。

想把分散的知识用在一起，读[把原理串成可以交付的代码](implementation-paths.md)。从订单搜索、离线笔记和工具助手开始，把并发、缓存、协议、权限与清理接成完整流程。

新增实战有 106 道完整题解。Web 40 道，Node 30 道，Go 36 道。代码带注释，每题有测试。360 道限时练习另按 H 编号保留，不把题面数量当成已完成题解数量。

| 想练什么 | 学习入口 |
| --- | --- |
| 经典函数与链式调用 | [JavaScript 实战](workshop-web-javascript.md) |
| 请求、DOM 和业务状态 | [异步](workshop-web-async.md)、[DOM](workshop-web-dom.md)、[业务](workshop-web-business.md) |
| 缓存、解析器和图形 | [工程实战](workshop-web-engineering.md) |
| 真线程池、流和 HTTP | [Node 线程与流](workshop-node-workers-streams.md)、[HTTP](workshop-node-http-lifecycle.md) |
| 上传、幂等和构建 | [存储](workshop-node-upload-storage.md)、[韧性](workshop-node-service-resilience.md)、[构建](workshop-node-build-config.md) |
| Go 并发与服务 | [并发](workshop-go-concurrency.md)、[HTTP](workshop-go-http.md)、[生命周期](workshop-go-lifecycle.md) |
| Go 文件与算法 | [流与文件](workshop-go-streams.md)、[数据结构](workshop-go-structures.md) |
| 企业题型与场景 | [企业索引](company-question-playbook.md)、[场景专题](real-interview-scenarios.md) |

## 1. 范围与用法

覆盖 Promise 与异步控制、原生方法实现、工具函数、设计模式、框架原理和浏览器特性六大类。建议先理解对应的 JavaScript 原理（见 [JavaScript 栏目](../js/index.md)），再动手默写实现。

## 2. 学习路径

1. [手写原生方法](native-methods.md)
2. [手写 Promise 与异步控制](promise-implementations.md)
3. [手写工具函数](utility-functions.md)
4. [柯里化、compose 与中间件](functional-middleware.md)
5. [响应式与观察者模式](reactive-observer.md)
6. [发布订阅、Proxy 与 Reflect](pubsub-proxy-reflect.md)
7. [框架原理手写](framework-implementations.md)
8. [浏览器特性手写](browser-features.md)

## 3. 页面一览

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [手写原生方法](native-methods.md) | call/apply/bind/new/instanceof/Object.create | 基础 |
| [手写 Promise 与异步控制](promise-implementations.md) | Promise 及 all/race/allSettled/retry、async/await、并发控制 | 进阶 |
| [手写工具函数](utility-functions.md) | 深拷贝、防抖、节流、flatten、LRU | 基础 |
| [柯里化、compose 与中间件](functional-middleware.md) | curry、compose、Koa 洋葱模型 | 进阶 |
| [响应式与观察者模式](reactive-observer.md) | EventEmitter、观察者、Proxy 版 reactive | 进阶 |
| [发布订阅、Proxy 与 Reflect](pubsub-proxy-reflect.md) | EventEmitter 多种变体、Proxy 代理模式、Reflect 应用 | 高级 |
| [框架原理手写](framework-implementations.md) | 虚拟 DOM 与 diff、useState、Hash 路由 | 高级 |
| [浏览器特性手写](browser-features.md) | 图片懒加载、虚拟列表、JSONP | 进阶 |

## 4. 分类速查

| 分类 | 内容 | 所在页面 |
|------|------|----------|
| Promise 与异步 | Promise、all、race、allSettled、retry、async/await、并发控制 | [手写 Promise 与异步控制](promise-implementations.md) |
| this 与函数 | call、apply、bind、new、instanceof、Object.create | [手写原生方法](native-methods.md) |
| 工具函数 | 深拷贝、防抖、节流、flatten、LRU | [手写工具函数](utility-functions.md) |
| 函数式与中间件 | 柯里化、compose、Koa 中间件 | [柯里化、compose 与中间件](functional-middleware.md) |
| 设计模式 | EventEmitter、观察者、reactive | [响应式与观察者模式](reactive-observer.md)、[发布订阅、Proxy 与 Reflect](pubsub-proxy-reflect.md) |
| 框架原理 | vdom + diff、useState、Router | [框架原理手写](framework-implementations.md) |
| 浏览器特性 | 图片懒加载、虚拟列表、JSONP | [浏览器特性手写](browser-features.md) |

## 5. 参考资料

### 5.1 JavaScript 核心

| 分类 | 资源 | 说明 |
|------|------|------|
| Promise | [MDN - Promise](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise) | Promise 规范与用法 |
| Promise | [MDN - Using Promises](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Using_promises) | Promise 使用指南 |
| 事件循环 | [MDN - Event Loop](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Event_loop) | 事件循环机制详解 |
| 微任务 | [MDN - queueMicrotask](https://developer.mozilla.org/zh-CN/docs/Web/API/queueMicrotask) | 微任务队列 API |
| 定时器 | [MDN - setTimeout](https://developer.mozilla.org/zh-CN/docs/Web/API/setTimeout) | 定时器详解 |
| 动画帧 | [MDN - setAnimationFrame](https://developer.mozilla.org/zh-CN/docs/Web/API/setAnimationFrame) | requestAnimationFrame |

### 5.2 数据结构

| 分类 | 资源 | 说明 |
|------|------|------|
| Map/Set | [MDN - Map](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Map) | Map 对象 |
| Map/Set | [MDN - Set](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Set) | Set 对象 |
| Map/Set | [CSDN - Map/Set/WeakMap/WeakSet 详解](https://www.jb51.net/article/282533.htm) | 2025 Map/Set/WeakMap/WeakSet 详解 |

### 5.3 代理与响应式

| 分类 | 资源 | 说明 |
|------|------|------|
| 代理 | [MDN - Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy) | Proxy 代理对象 |
| 反射 | [MDN - Reflect](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect) | Reflect 反射 |
| 响应式 | [腾讯云 - Vue3 Proxy + Reflect](https://cloud.tencent.com/developer/news/2263970) | Vue3 响应式原理 |
| 结构化克隆 | [MDN - structuredClone](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/structuredClone) | 结构化克隆算法 |

### 5.4 迭代器与生成器

| 分类 | 资源 | 说明 |
|------|------|------|
| 迭代器 | [MDN - Iterators and Generators](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Iterators_and_generators) | 迭代器与生成器指南 |
| 异步迭代 | [MDN - asyncIterator](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator) | Symbol.asyncIterator |

### 5.5 垃圾回收与内存

| 分类 | 资源 | 说明 |
|------|------|------|
| GC | [CSDN - V8 垃圾回收原理](https://blog.csdn.net/qi_bai_jin/article/details/158261107) | V8 垃圾回收机制 |
