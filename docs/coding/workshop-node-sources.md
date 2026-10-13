---
title: Node 工程实验参考资料
description: Node v24 内置 worker、stream、HTTP、文件系统与测试 API 的核对入口，以及 Express、Fastify、Undici 的工程实践文档。
tags: [nodejs, references]
date: 2026-10-13
level: reference
prerequisites:
  - Node.js 24.16.0
runnable: false
verified_at: 2026-10-13
source_commit: f682da9816e3f5454a3f1d8d8cb074d0de53236b
---

# Node 工程实验参考资料

页面中的规则和运行结果在 2026-10-13 对照 Node.js v24.16.0 执行。每个 API 链接锁定 v24 文档；示例工程链接指向项目自己的维护文档，读者应以页面标注的版本与语义为准。

## Node.js 官方文档

- [Worker threads（v24.16.0）](https://nodejs.org/download/release/v24.16.0/docs/api/worker_threads.html)：区分 CPU 密集型任务与异步 I/O；查阅 `Worker`、消息克隆、转移和线程终止。
- [Streams（v24.16.0）](https://nodejs.org/download/release/v24.16.0/docs/api/stream.html)：查阅 `write()`/`drain` 背压、`pipeline()` 错误传播及资源销毁语义。
- [HTTP（v24.16.0）](https://nodejs.org/download/release/v24.16.0/docs/api/http.html)：查阅 request/header 超时、`server.close()` 与连接关闭行为。
- [File system（v24.16.0）](https://nodejs.org/download/release/v24.16.0/docs/api/fs.html)：查阅 `mkdtemp`、流式文件 I/O、`rename` 和文件句柄 API。原子替换依赖同一文件系统内的重命名语义；跨设备搬移不能假设原子。
- [Test runner（v24.16.0）](https://nodejs.org/download/release/v24.16.0/docs/api/test.html)：查阅内置测试、生命周期清理和隔离执行选项。
- [Fetch 与 AbortSignal（v24.16.0）](https://nodejs.org/download/release/v24.16.0/docs/api/globals.html#fetch)：查阅内置 Fetch、`AbortSignal.timeout()` 与 `AbortSignal.any()`。

## 工程项目实践

- [Express 5 middleware guide](https://expressjs.com/en/guide/writing-middleware.html)：中间件通过 `next` 传递控制权；既不结束响应也不调用 `next` 会让请求停住。N006 用纯 Node 写出同一控制流并检测重复调用。
- [Fastify lifecycle reference](https://fastify.dev/docs/latest/Reference/Lifecycle/) 与 [server shutdown reference](https://fastify.dev/docs/latest/Reference/Server/)：展示请求阶段、应用级 handler 超时、请求取消信号和关机 drain 顺序。N010、N019 将关键生命周期缩成标准库实现。
- [Undici RetryHandler](https://github.com/nodejs/undici/blob/main/docs/docs/api/RetryHandler.md)：只对可恢复错误与允许的状态重试；不可重放的流式请求体不能安全重试。N024 因此仅接受幂等方法并限制次数。

## 对应实现与验收

所有题解在 [labs.mjs](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/node/labs.mjs)，Worker 入口在 [compute-worker.mjs](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/node/workers/compute-worker.mjs)，完整自动验收在 [labs.test.mjs](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/node/labs.test.mjs)。在仓库根目录运行 `node --test scripts/teaching-labs/node/labs.test.mjs`；测试仅使用临时目录、临时端口和测试创建的 Worker，结束时关闭并清理。
