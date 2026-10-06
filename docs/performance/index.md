---
title: 性能优化概览
description: 前端性能优化的学习路径：指标与诊断、加载、资源、渲染、框架、上传与监控。
tags:
  - performance
  - optimization
date: 2026-05-17
---

# 性能优化概览

## 1. 本章范围

前端性能直接影响用户体验和业务指标。本章覆盖从加载到渲染的全链路优化：先学会用指标衡量与定位问题，再依次优化加载、资源与渲染，最后落到框架层优化与线上监控。

## 2. 学习路径

1. [性能指标与诊断](core-web-vitals.md)：Lighthouse、Core Web Vitals、瓶颈定位
2. [加载优化](loading-optimization.md)：首屏、白屏、SSR
3. [资源优化](resource-optimization.md)：图片、懒加载、路由懒加载、Brotli、CDN
4. [渲染与运行时优化](rendering-optimization.md)：长列表、虚拟列表、Web Worker、requestIdleCallback
5. [框架性能优化](framework-optimization.md)：React 与 Vue 优化手段
6. [大文件上传](large-file-upload.md)：分片、断点续传、并发控制
7. [前端监控](monitoring.md)：性能、错误与行为监控体系

## 3. 页面一览

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [性能指标与诊断](core-web-vitals.md) | Lighthouse、Core Web Vitals、瓶颈定位 | 基础 |
| [加载优化](loading-optimization.md) | 首屏、白屏、SSR | 基础 |
| [资源优化](resource-optimization.md) | 图片、懒加载、路由懒加载、Brotli、CDN | 进阶 |
| [渲染与运行时优化](rendering-optimization.md) | 长列表、虚拟列表、Web Worker、requestIdleCallback | 进阶 |
| [框架性能优化](framework-optimization.md) | React 与 Vue 优化手段 | 进阶 |
| [大文件上传](large-file-upload.md) | 分片、断点续传、并发控制 | 高级 |
| [前端监控](monitoring.md) | 性能、错误与行为监控体系 | 高级 |

## 4. 参考资源

| 资源 | 链接 |
|------|------|
| Google Web Vitals | https://web.dev/vitals/ |
| Lighthouse 文档 | https://developer.chrome.com/docs/lighthouse/ |
| MDN 性能 | https://developer.mozilla.org/zh-CN/docs/Web/Performance |
| Web Vitals 库 | https://github.com/GoogleChrome/web-vitals |
