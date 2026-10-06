---
title: JavaScript 参考资料
description: JavaScript 各专题的 MDN 与社区参考资料汇总。
tags:
  - javascript
  - reference
date: 2026-05-17
---

# JavaScript 参考资料

## 1. Proxy 与 Reflect

| 资源 | 说明 |
|------|------|
| [MDN - Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy) | Proxy 代理对象 |
| [MDN - Reflect](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect) | Reflect 反射 |
| [腾讯云 - Vue3 Proxy + Reflect](https://cloud.tencent.com/developer/news/2263970) | Vue3 响应式原理 |
| [知乎 - Vue3 Proxy 详解](https://zhuanlan.zhihu.com/p/109252446) | Vue3 Proxy 详解 |
| [CSDN - Proxy vs defineProperty](https://blog.csdn.net/caishuangxi111/article/details/146554747) | Vue3 响应式对比 |

## 2. 模块与打包

| 资源 | 说明 |
|------|------|
| [CSDN - ESM vs CJS](https://blog.csdn.net/iChangebaobao/article/details/124176936) | ESM vs CJS + Tree Shaking |
| [腾讯云 - Webpack Tree Shaking](https://cloud.tencent.com/developer/article/2567183) | Tree Shaking 实践 |

## 3. 垃圾回收与内存

| 资源 | 说明 |
|------|------|
| [CSDN - V8 GC 分代回收](https://blog.csdn.net/qi_bai_jin/article/details/158261107) | V8 垃圾回收原理 |
| [CSDN - 垃圾回收详解](https://blog.csdn.net/yjh_OK/article/details/145779677) | V8 垃圾回收 |
| [MDN - WeakRef](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakRef) | WeakRef API |

## 4. Web Worker

| 资源 | 说明 |
|------|------|
| [CSDN - Web Workers 基本概念](https://www.jb51.net/article/2602211.htm) | Web Worker 入门 |
| [CSDN - Worker + OffscreenCanvas](https://blog.csdn.net/2501_92234528/article/details/148566011) | 多线程渲染 |

## 5. 性能优化

| 资源 | 说明 |
|------|------|
| [CSDN - 防抖与节流原理](https://blog.csdn.net/achievek/article/details/119696960) | 防抖节流详解 |
| [腾讯云 - Throttle 实现](https://cloud.tencent.com/developer/article/2552090) | Throttle 与 Debounce |

## 6. 补充阅读链接

> 参考：
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Using_promises
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Event_loop
> - https://developer.mozilla.org/zh-CN/docs/Web/API/queueMicrotask
> - https://developer.mozilla.org/zh-CN/docs/Web/API/setTimeout
> - https://developer.mozilla.org/zh-CN/docs/Web/API/setAnimationFrame
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/structuredClone
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Iterators_and_generators
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator
> - https://blog.csdn.net/qi_bai_jin/article/details/158261107（V8 垃圾回收原理）
> - https://cloud.tencent.com/developer/news/2263970（Vue3 Proxy + Reflect 响应式）
> - [Map/Set/WeakMap/WeakSet 详解](https://www.jb51.net/article/282533.htm)（2025 Map/Set/WeakMap/WeakSet）
> - https://www.jb51.net/article/282533.htm（Map/Set/WeakMap/WeakSet 详解）

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) | Proxy 总览与陷阱不变量约束，是查证所有 handler 行为的入口。 | 读术语与处理器两节，带着「哪些操作可拦截」的问题读，再挑 handler.get 动手试。 |
| [Reflect](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect) | Reflect 与 Proxy 陷阱一一对应，提供默认行为的标准调用方式。 | 对照 Proxy 页读方法列表，用 Reflect.get/set 重写前面的陷阱，观察默认行为差异。 |
| [MDN JavaScript 模块](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) | MDN 模块页覆盖 import/export 与加载流程，是模块化章节主线。 | 读导出导入、顶层 await 小节，写一个 type=module 页面并对比 CommonJS 的差异。 |
| [MDN 内存管理](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management) | 解释可达性、引用与泄漏成因，是内存章节的核心理论。 | 读完标记清除与常见泄漏两节，用 DevTools Memory 面板复现一次闭包泄漏。 |
| [MDN Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) | Worker 类型总览，快速分清专用、共享与 Service Worker 的边界。 | 读类型总览与限制一节，带着「何时该用哪种 Worker」的问题做一份选择清单。 |
| [MDN Web 性能](https://developer.mozilla.org/zh-CN/docs/Web/Performance) | 中文梳理性能概念与优化手段，适合建立整体框架。 | 通读关键渲染路径与加载优化两节，读完给项目列一份性能优化清单。 |
| [MDN 性能指南](https://developer.mozilla.org/en-US/docs/Web/Performance) | 从加载到运行时补齐性能基础，避免只看指标不懂原理。 | 读加载与运行时性能概述，带着「瓶颈在哪一层」的问题复看自己站点的数据。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 元编程](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming) | 以校验对象为例串起 Proxy/Reflect，并对照 Vue 3 响应式原理。 | 先读实现步骤，自己手写校验代理；再带着依赖收集问题看 Vue 3 reactive 源码。 |
| [MDN 闭包](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) | 讲透闭包与循环陷阱，帮助理解变量为何长期占用内存。 | 读实用闭包与循环陷阱两节，复现 var 循环问题并解释引用为何无法回收。 |
| [MDN 使用 Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) | 手把手把耗时计算搬进 Worker，是 Web Worker 入门的最佳范例。 | 照示例实现 Worker 通信，再用 Performance 面板对比主线程阻塞前后的长任务。 |
| [Web Performance Newsletter](https://perf.email/) | 性能优化文章与工具合集，用于持续跟进新手段与度量方式。 | 挑一篇讲 Core Web Vitals 优化的文章精读，把建议对照自己项目做一项改造。 |
| [HTTP Archive Web Almanac 2024 性能章](https://almanac.httparchive.org/en/2024/performance) | 行业级真实数据，帮助判断自己站点的性能处于什么分位。 | 读性能章的数据图表，记下三项核心指标的中位数，再与自有站点对比。 |
| [MDN 事件循环](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) | 事件循环是异步与性能问题的根源，读后能画清执行时序。 | 读完后画出一次点击触发 Promise 与定时器的完整时序，再解释微任务饥饿。 |

