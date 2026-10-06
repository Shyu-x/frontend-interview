---
title: JavaScript 概览
description: JavaScript 高频面试知识总览：语言基础、异步、数据与对象、模块与运行时的学习路径。
tags:
  - javascript
date: 2026-05-17
---

# JavaScript 概览

> JavaScript 是前端工程师的核心技能。本栏目覆盖高频面试题，从数据类型到异步编程、模块与运行时，按由浅入深的顺序组织。

## 1. 范围与用法

共分五个阶段：语言基础、异步编程、数据与对象、模块与运行时、实用技巧与面试题。每页末尾的“精简回顾”适合面试前快速复习。

## 2. 学习路径

- 语言基础：数据类型、闭包与作用域、this、原型与继承、函数式编程
- 异步编程：Promise、事件循环、事件循环题库
- 数据与对象：深浅拷贝、Map/Set、迭代器与生成器、Proxy 与 Reflect
- 模块与运行：ESM 与 CJS、垃圾回收、Web Worker
- 实用与参考：防抖节流、参考资料

具体阅读顺序：

1. [数据类型与类型转换](data-types.md)
2. [闭包、作用域与变量声明](closure-scope.md)
3. [this 指向与函数调用](this-binding.md)
4. [原型链与继承](prototype-inheritance.md)
5. [函数式编程](functional-programming.md)
6. [Promise 与 async/await](promise-async.md)
7. [事件循环与定时器](event-loop.md)
8. [事件循环经典面试题](event-loop-practice.md)
9. [深拷贝与浅拷贝](deep-copy.md)
10. [Map、Set 与 WeakMap、WeakSet](map-set.md)
11. [迭代器与生成器](iterator-generator.md)
12. [Proxy 与 Reflect](proxy-reflect.md)
13. [ESModule 与 CommonJS](esm-commonjs.md)
14. [垃圾回收与内存管理](garbage-collection.md)
15. [单线程模型与 Web Worker](web-worker.md)
16. [防抖与节流](debounce-throttle.md)
17. [JavaScript 参考资料](references.md)

## 3. 页面一览

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [数据类型与类型转换](data-types.md) | 类型体系、运算符与比较、隐式转换、Symbol 与 BigInt | 基础 |
| [闭包、作用域与变量声明](closure-scope.md) | 闭包、作用域链、var/let/const | 基础 |
| [this 指向与函数调用](this-binding.md) | this 规则、new 原理、call/apply/bind | 基础 |
| [原型链与继承](prototype-inheritance.md) | 原型链、instanceof、继承方案 | 进阶 |
| [函数式编程](functional-programming.md) | 纯函数、柯里化、组合、不可变数据 | 进阶 |
| [Promise 与 async/await](promise-async.md) | Promise 状态机与手写、async/await 原理、组合方法 | 进阶 |
| [事件循环与定时器](event-loop.md) | 宏任务与微任务、浏览器与 Node 差异、定时器调度 | 进阶 |
| [事件循环经典面试题](event-loop-practice.md) | 10 道输出顺序题与事件循环核心规则 | 高级 |
| [深拷贝与浅拷贝](deep-copy.md) | 拷贝方案对比、structuredClone、手写深拷贝 | 进阶 |
| [Map、Set 与 WeakMap、WeakSet](map-set.md) | 集合内存模型、与 Object/Array 对比、弱引用 | 进阶 |
| [迭代器与生成器](iterator-generator.md) | 迭代协议、Generator、异步迭代器 | 进阶 |
| [Proxy 与 Reflect](proxy-reflect.md) | Trap 体系、Vue3 响应式、Reflect | 高级 |
| [ESModule 与 CommonJS](esm-commonjs.md) | 模块加载差异、循环引用、Tree Shaking | 进阶 |
| [垃圾回收与内存管理](garbage-collection.md) | V8 分代回收、GC 算法、内存泄漏 | 高级 |
| [单线程模型与 Web Worker](web-worker.md) | 单线程原因、Worker 通信、OffscreenCanvas | 进阶 |
| [防抖与节流](debounce-throttle.md) | 概念对比、完整实现、rAF 节流、React Hook | 基础 |
| [JavaScript 参考资料](references.md) | 各专题 MDN 与社区资料 | 基础 |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) | 最权威的查证入口，覆盖语言与浏览器 API 全部主题。 | 先浏览左侧目录建立索引，遇到不确定的内置对象行为立刻回来查证具体条目。 |
| [JavaScript language overview](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Language_overview) | 一页读完语言全貌，适合快速建立整体地图。 | 通读一遍并标出不熟悉的概念，再分别跳到对应的 MDN 指南章节深入。 |
| [Introduction](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction) | 官方指南开篇，交代 JS 是什么与常用工具链。 | 读完后列出自己还没接触过的概念，把它当作后续学习清单。 |
| [MDN 事件循环](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) | 理解事件循环是理解单线程与异步行为的前提。 | 读完后画出一次点击同时触发 Promise 与定时器的完整时序图。 |
| [ESTree 规范](https://github.com/estree/estree) | 候选中的规范类资源，AST 是读懂工具链的起点。 | 写规则或用 Babel 时按节点名当字典查，先看 Program 与各类表达式。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Exercism JavaScript](https://exercism.org/tracks/javascript) | 动手练习加对比他人解法，最快养成惯用写法。 | 先自己写通过测试，再看社区解法，记录三处比自己更简洁的写法。 |
| [mqyqingfeng/Blog](https://github.com/mqyqingfeng/Blog) | 中文专题系列，把语言核心机制讲得细并配手写练习。 | 按专题顺序读，每篇读完合上文章，凭记忆手写一遍实现再对照。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Eloquent JavaScript](https://eloquentjavascript.net/) | 免费在线经典教材，边读边做题效果最好。 | 每章末尾习题必做，第 8 至 11 章重点读错误处理与异步。 |
| [现代 JavaScript 教程](https://zh.javascript.info/) | 结构清晰的中文教程，从语言核心到浏览器 API 全覆盖。 | 按目录顺序学，每章任务先自己做再看参考答案。 |
| [Exploring JS 系列（Axel Rauschmayer）](https://exploringjs.com/) | 按主题组织的免费在线书，适合针对性补薄弱点。 | 按目录挑一本最贴近自己短板，先读导读写笔记再进正文。 |

