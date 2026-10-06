---
title: Vue 概览
description: Vue 响应式、渲染编译、组件与生态面试专题的学习路径。
---

# Vue 概览

本目录整理 Vue 2/3 的核心原理与高频面试题，从响应式系统出发，经过渲染与编译、组件与组合式 API，最后覆盖路由、状态管理、SSR 与大型项目架构。建议按下列顺序阅读。

## 1. 学习路径

1. [Vue 响应式系统](reactivity.md)
2. [渲染与编译](rendering-compiler.md)
3. [组件与组合式 API](components-composition.md)
4. [生态与项目架构](ecosystem-and-architecture.md)

## 2. 页面一览

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [Vue 响应式系统](reactivity.md) | Vue2/Vue3 差异、响应式原理、ref/reactive、computed、watch 与 nextTick | 基础 |
| [渲染与编译](rendering-compiler.md) | Vue diff、patchFlag/Block Tree、模板编译与模板相对 JSX 的优势 | 高级 |
| [组件与组合式 API](components-composition.md) | keep-alive、Teleport/Suspense、Composition API、Vue3 性能与宏 | 进阶 |
| [生态与项目架构](ecosystem-and-architecture.md) | Vue Router、Vuex 与 Pinia、Vue SSR、Nuxt、权限管理与大型项目架构 | 高级 |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 官方文档](https://cn.vuejs.org/) | 官方中文文档，学习路径的起点与长期参照 | 先读「快速上手」与「基础」，边读边在本地跑一个组件，读完独立写出待办列表 |
| [Vue 官方英文文档](https://vuejs.org/guide/introduction.html) | 英文版更新更早，可补齐中文版的滞后与遗漏 | 中文页读不懂或版本不一致时切到英文页，重点看迁移指南与更新说明 |
| [Vue 响应式深入](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html) | 把响应式讲透，也是面试高频考点 | 重点读 reactive、effect、computed 三节，读后用 Proxy 手写一版最小实现 |
| [Vue 渲染机制](https://cn.vuejs.org/guide/extras/rendering-mechanism.html) | 讲清虚拟 DOM 与编译优化，理解性能从哪来 | 读虚拟 DOM 与静态提升两节，在模板编译演示站对照输出，再回看自己的组件 |
| [Vue RFCs](https://github.com/vuejs/rfcs) | 官方设计文档，看清 API 为何长成这样 | 读 Composition API 与 script setup 两篇 RFC，带着「为何不用选项式」的问题读 |
| [Vue Router 文档](https://router.vuejs.org/zh/) | 路由是多数 Vue 应用的刚需能力 | 读「入门」与「导航守卫」，在自己项目里实现嵌套路由和一个登录守卫 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 核心源码仓库](https://github.com/vuejs/core) | 真实生产级源码，从可读的小模块入手 | 从 packages/reactivity 读起，先 ref 与 effect 再 computed，读完画依赖收集流程图 |
| [Vue core：reactivity](https://github.com/vuejs/core/tree/main/packages/reactivity) | 定位到具体文件的源码入口，省去翻仓库 | 打开 reactive.ts，顺 createReactiveObject 往下读，打断点观察一次更新流程 |
| [Vue 2 响应式源码目录](https://github.com/vuejs/vue/tree/main/src/core/observer) | 对比两代实现，理解 Proxy 带来的变化 | 读 Vue 2 的 defineReactive，列出与 Proxy 方案的三点关键差异 |
| [MDN 元编程](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming) | Proxy 与 Reflect 的权威入门，读懂响应式底层 | 读 Proxy 与 Reflect 两节，动手实现带校验的对象，再回看 Vue 3 响应式 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 官方交互式教程](https://cn.vuejs.org/tutorial/) | 动手式教程，比只读文档记得更牢 | 在浏览器内做完全部步骤，每步先自己写再点「显示答案」，最后复述核心概念 |
| [Vue Mastery](https://www.vuemastery.com/) | 配套项目式视频，适合跟着完整敲一遍 | 先看免费课程，跟着做配套项目，遇到卡点再回官方文档查对应章节 |

