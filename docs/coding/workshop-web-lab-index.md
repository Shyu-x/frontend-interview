---
title: Web 手写题解工作坊：40 道题的实现与验收入口
description: 按 JavaScript、浏览器异步、业务状态、DOM 无障碍和缓存编译图形五组浏览 40 道独立手写题解；每题链接完整实现和 Node 测试，并说明真实浏览器 API 的验收边界。
tags: [coding, interview, web, index]
date: 2026-10-13
level: reference
prerequisites:
  - JavaScript 函数、对象与 Promise
  - Node.js 20+
runnable: true
tested_with:
  - node@24.16.0
verified_at: 2026-10-13
source_commit: f682da9816e3f5454a3f1d8d8cb074d0de53236b
---

# Web 手写题解工作坊 40 道题的实现与验收入口

每页按题目解释输入输出、数据结构、关键代码和失败边界。完整映射另见 [`catalog.json`](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/web/catalog.json)，源码与测试都在 [`scripts/teaching-labs/web/`](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/web/)。

| 主题 | 教学页 | 题目范围 | 对应源码 | 定向测试 |
|---|---|---:|---|---|
| JavaScript 语言与组合 | [W001–W008](workshop-web-javascript.md) | LazyMan、Promise.all、深拷贝、curry、once、memoize、EventBus、flatten | `core.mjs` | `core.test.mjs` |
| 浏览器异步与流 | [W009–W016](workshop-web-async.md) | XHR、Fetch、latest-wins、重试、并发池、超时、UTF-8 流、上传进度 | `async.mjs` | `async.test.mjs` |
| 真实业务状态 | [W017–W024](workshop-web-business.md) | 购物车、乐观收藏、token refresh、分页、自动保存、checkout、草稿冲突、URL 筛选 | `business.mjs` | `business.test.mjs` |
| DOM 与无障碍 | [W025–W032](workshop-web-dom.md) | 事件委托、折叠、dialog、combobox、图片懒加载、字段错误、Tab 边界、提交门控 | `dom.mjs` | `dom.test.mjs` |
| 缓存、编译与图形 | [W033–W040](workshop-web-engineering.md) | LRU、TTL、SWR、稳定 key、tokenizer、Pratt parser、Canvas hit test、帧预算 | `engineering.mjs` | `engineering.test.mjs` |

## 从真实输入开始练

先挑一道题，口头说清数据输入和成功/失败结果，再不看源码写一遍。之后跑对应测试，逐条解释反例为什么会失败。Node 测试全部运行命令是：

```sh
node --test scripts/teaching-labs/web/*.test.mjs
```

40 题共 90 个自动测试。每题都测试正常结果和失败或边界。至少 24 道直接放进产品场景，包括表单、订单、搜索、分页、上传、离线草稿、结算和图表调度。

[`demo.html`](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/web/demo.html)使用真实 DOM。[`network-demo.html`](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/web/network-demo.html)使用真实 XHR 与 Fetch。Node 中注入对象的测试只检查适配器。CORS、上传事件和真实 Canvas 布局需要各自的浏览器用例。

## 题型来源

题型广度按 [BFE.dev](https://bigfrontend.dev/) 的 JavaScript/DOM 练习、[GreatFrontEnd JavaScript Playbook](https://www.greatfrontend.com/front-end-interview-playbook/javascript) 的常见函数与 UI 编码题，以及 MDN 的 [XHR](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API)、[Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)、[Streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)、[IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) 文档整理。实现为独立教学代码，不表示复制平台答案或公司真题。
