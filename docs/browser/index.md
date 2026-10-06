---
title: 浏览器原理
description: 从多进程架构、URL 到页面的全流程、渲染流水线，到缓存、存储与跨 Tab 通信的浏览器核心机制。
---

# 浏览器原理

本目录讲解浏览器如何工作：先理解多进程架构与 V8，再顺着“输入 URL 到页面展示”的主线走完网络、解析、渲染，最后掌握缓存、Cookie 与 Web Storage、跨 Tab 通信以及运行时事件、内存与性能问题。每个主题同时给出深度讲解与速记版，便于先学后复习。

## 1. 学习路径

1. [多进程架构、站点隔离与 V8](multi-process-architecture.md)
2. [输入 URL 到页面展示](url-to-page.md)
3. [渲染流水线与阻塞](rendering-pipeline.md)
4. [HTTP 缓存](http-cache.md)
5. [Cookie 与 Web Storage](storage.md)
6. [跨 Tab 通信](cross-tab-communication.md)
7. [事件、内存与性能](events-memory-performance.md)

## 2. 页面一览

| 页面 | 你将学到 | 难度 |
| --- | --- | --- |
| [多进程架构、站点隔离与 V8](multi-process-architecture.md) | 为什么浏览器是多进程、各进程职责、沙箱与站点隔离、V8 为什么快 | 基础 |
| [输入 URL 到页面展示](url-to-page.md) | 导航全流程、各阶段耗时与优化切入点 | 基础 |
| [渲染流水线与阻塞](rendering-pipeline.md) | 渲染各阶段、重排重绘合成、CSS/JS 阻塞行为 | 进阶 |
| [HTTP 缓存](http-cache.md) | 缓存决策流程、响应头配置、常见缓存问题 | 进阶 |
| [Cookie 与 Web Storage](storage.md) | 各存储方案对比、Cookie 属性与限制 | 基础 |
| [跨 Tab 通信](cross-tab-communication.md) | 四类跨 Tab 通信方案的原理与取舍 | 进阶 |
| [事件、内存与性能](events-memory-performance.md) | 事件模型、内存泄漏定位、性能优化清单 | 进阶 |
