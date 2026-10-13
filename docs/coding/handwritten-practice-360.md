---
title: 前端与全栈手写练习
description: 从经典 JavaScript、浏览器交互走到 Node.js 服务、Go 并发和系统工程。按学习任务连接 360 道练习与完整注释实现，提供场景、推导、失败反例和测试入口，帮助把读懂代码转化为独立完成需求的能力。
tags: [interview, coding, fullstack, exercises]
date: 2026-10-13
level: reference
prerequisites:
  - JavaScript 函数、数组、对象和 Promise
  - HTTP 请求响应与命令行运行程序
runnable: false
verified_at: 2026-10-13
source_commit: a489bf9bbebe96c3653c0dbe6bf1e97343aaf655
---

# 前端与全栈手写练习

先学一个完整实现，再改变需求重新写。每份题解从具体输入输出开始。接着选择状态和数据结构，写出带注释的代码。最后用失败用例检查它。不要把看过题面当作已经会写。

## 从哪里开始

| 现在的困难 | 先学什么 | 练完能写什么 |
| --- | --- | --- |
| 看得懂答案，空白编辑器写不出来 | [代码熟练度训练](coding-fluency.md) | 不看答案写一个有测试的模块 |
| 闭包和异步时序总写错 | [JavaScript 经典实现](workshop-web-javascript.md) | 链式任务、Promise 聚合、对象图复制 |
| 请求一多就乱，取消后仍写回 | [浏览器异步编排](workshop-web-async.md) | 请求封装、取消、重试、并发和增量读取 |
| 组件只能鼠标操作，卸载后泄漏 | [DOM 与可访问交互](workshop-web-dom.md) | 键盘操作、焦点、事件委托和资源清理 |
| UI 能画出来，业务状态写不稳 | [业务状态题解](workshop-web-business.md) | 购物车、乐观更新、分页、自动保存与结账 |
| 只会调用工具，不知道内部怎么写 | [缓存、编译与图形](workshop-web-engineering.md) | 缓存策略、表达式解析、命中检测与帧调度 |
| 将异步池误当成线程池 | [Node 线程与流](workshop-node-workers-streams.md) | 真 Worker 池、管道与背压 |
| Node 服务没有失败路径 | [HTTP 与生命周期](workshop-node-http-lifecycle.md) | 路由、中间件、SSE、超时与关机 |
| 上传和缓存只写成功分支 | [上传存储](workshop-node-upload-storage.md)、[服务韧性](workshop-node-service-resilience.md) | 分片校验、原子落盘、限流与幂等 |
| 构建与配置问题靠猜 | [构建与配置](workshop-node-build-config.md) | 构建图、模块边界和配置验证 |
| 学 Go 只会写语法练习 | [Go 并发](workshop-go-concurrency.md)、[Go HTTP](workshop-go-http.md) | 可取消的并发管道和可测试服务 |
| Go 程序跑通，资源和数据边界不清 | [流与文件](workshop-go-streams.md)、[数据结构](workshop-go-structures.md)、[生命周期](workshop-go-lifecycle.md) | 安全解析、缓存、锁和资源关闭 |

题解按 W（Web）、N（Node）、G（Go）编号。各页有完整源码和测试链接。[企业题型索引](company-question-playbook.md)可以按公开面经选择练习。[Web 实战入口](workshop-web-lab-index.md)可以定位每个浏览器和 JavaScript 实现。

## 360 道限时练习

有题解的练习先尝试，再比较。挑战题先把预期输出和反例写成测试。编号只用于定位，不要求从头刷到尾。

| 编号 | 题册 | 主要练什么 |
| --- | --- | --- |
| H001–H048 | [经典与面试练习](handwritten-question-catalog.md) | 异步、语言、UI、工程与业务 |
| H049–H074 | [UI 与可访问组件](practice-ui-components.md) | 键盘、焦点、编辑与卸载 |
| H075–H100 | [异步编排与调度](practice-async-orchestration.md) | 公平、取消、背压与重入 |
| H101–H126 | [框架与状态系统](practice-framework-state.md) | 订阅、缓存、渲染与资源归属 |
| H127–H152 | [编译器与工具链](practice-compilers-tooling.md) | 语法、IR、构建图与热更新 |
| H153–H178 | [Node 与 HTTP](practice-node-http.md) | 流、连接、协议与服务生命周期 |
| H179–H204 | [数据库与事务](practice-databases-transactions.md) | 冲突、快照、索引与恢复 |
| H205–H230 | [鉴权与安全](practice-auth-security.md) | 租户、会话、授权与输入边界 |
| H231–H256 | [分布式同步](practice-distributed-sync.md) | 幂等、租约、重放与因果关系 |
| H257–H282 | [算法与数据结构](practice-algorithms-structures.md) | 区间、图、编辑与索引 |
| H283–H308 | [解析器与协议](practice-parsers-protocols.md) | 跨 chunk、损坏输入与编码 |
| H309–H334 | [图形与媒体](practice-graphics-media.md) | 空间查询、资产与媒体时间 |
| H335–H360 | [运行时与内存](practice-runtime-memory.md) | 代次、arena、跨线程与 ABI |

## 把一个实现练成不同场景

请求只能让最新结果写回。搜索框用它避免旧关键词覆盖新列表。自动保存用它避免旧版本覆盖最新草稿。地图用它避免旧视口的数据覆盖当前视口。

但不能原样复制代码。搜索取消可以丢弃结果。保存请求可能已经在服务器产生副作用。地图还需要回收缓存和渲染资源。每次先写出新需求，再修改状态和测试。

| 练习阶段 | 要写出的东西 | 怎么检查 |
| --- | --- | --- |
| 追踪 | 状态变化和输出顺序 | 手算结果与测试结果一致 |
| 独立实现 | 函数、状态和错误路径 | 不看答案通过正常与失败用例 |
| 变式 | 新约束对应的修改 | 新测试能击败旧实现 |
| 故障排查 | 最小复现与原因 | 修复前失败，修复后通过 |

较长的专题还有[动画引擎](animation-engine-handwritten.md)、[倒计时与打字机](deadline-clock-and-typewriter.md)、[笔试算法](autumn-exam-algorithms.md)、[拆帧、CAS 与代次句柄](handwritten-challenge-solutions.md)。它们分别深入时间推进、Unicode、算法验证和资源复用。

## 运行与定位

在仓库根目录检查已有题库和示例。

```sh
node scripts/check-handwritten-bank.mjs --check
node --test scripts/content-labs/challenges/models.test.mjs
```

新题解的命令在各专题开头。失败时先定位测试名中的 W/N/G 编号，再检查输入、状态变化和清理路径。浏览器、线程、文件与 Go 的环境要求也分别写在题解中。

## 参考

- [面经与机制资料](handwritten-practice-sources.md)
- [题目机器索引](../assets/research/handwritten-bank-360.json)
- [全仓学习地图](../resources/content-map-and-roadmap.md)
