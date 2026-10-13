---
title: 按企业找题，再按能力练习
description: 汇集十九家企业的公开前端面经题型，将语言手写、异步、组件、图形、工程和服务端问题连接到站内题解。通过跨企业归并找到共同机制，再用不同输入、失败路径与业务需求练习独立实现，而不是机械记住公司标签。
tags: [interview, companies, coding, practice]
date: 2026-10-13
level: reference
prerequisites:
  - JavaScript 与浏览器基础
  - 能独立运行一个测试文件
runnable: false
verified_at: 2026-10-13
source_commit: a489bf9bbebe96c3653c0dbe6bf1e97343aaf655
---

# 按企业找题，再按能力练习

同一道深拷贝，会在不同公司出现。真正要练的是对象图、循环引用和类型边界，不是记住公司名字。下面先列公开面经记录的主题，再给出练习方向。右栏是教学路径，不表示公司要求使用同一份实现。

## 语言与异步

| 企业 | 面经记录的题型 | 怎么练 |
| --- | --- | --- |
| 字节跳动 | Promise.all、reduce 实现 map、频率统计 | 从[Promise 聚合](workshop-web-javascript.md)写到输入顺序、空集合、拒绝和 thenable；再改成有界任务池 |
| 腾讯 | 异步加法、大数加法、百万单词查询 | 先确定依赖图，再选择串行或并行；大数保留字符串；查询从 Set 走到 Trie，[经典实现](workshop-web-javascript.md)和[Go 数据结构](workshop-go-structures.md)可配合练习 |
| 拼多多 | 并发重启、旧结果作废、版本比较、图片超时 | 写请求身份，再加失败和取消；版本用分段比较；[异步题解](workshop-web-async.md)与[笔试算法](autumn-exam-algorithms.md)分别练时序和排序规则 |
| 快手 | flat 的层级参数、重试、call、new、全排列 | 不止写正常结果。flat 测深度，重试测次数和等待期间取消；接着练[异步编排](workshop-web-async.md) |
| 滴滴 | 二分、深拷贝、数组展开、括号匹配、可停止定时循环 | 给二分写循环不变量；给定时循环保存句柄；给复制写共享引用反例，[经典实现](workshop-web-javascript.md)可先练对象图 |
| 携程 | Promise.race 思路、函数与对象复制、路由模式 | 区分比赛结果和底层工作取消。把超时封装与取消接起来，再用[HTTP 题解](workshop-node-http-lifecycle.md)验证请求确实结束 |

## 组件、业务与图形

| 企业 | 面经记录的题型 | 怎么练 |
| --- | --- | --- |
| 百度 | 星级评分、发布订阅、模板解析、TypeScript Pick | 评分加键盘操作；订阅加重入和卸载；模板先分词再替换，[DOM](workshop-web-dom.md)与[编译练习](workshop-web-engineering.md)可继续深入 |
| 美团 | 无限滚动、视口检测、深拷贝、Promise | 分页要区分加载中、没有更多、请求失败。旧页返回不能追加到新筛选条件，[业务状态](workshop-web-business.md)和[DOM](workshop-web-dom.md)可以串起来练 |
| 小米 | 数组交集、每天首次提醒、首次进入视口、触底加载 | 保存“已发生”的状态。视口题只观察一次，分页题区分 loading 和 hasMore，[DOM](workshop-web-dom.md)与[业务状态](workshop-web-business.md)有完整练习 |
| 网易 | Canvas 用途、富文本解析、事件委托、不冒泡事件 | 先写委托和监听清理。再练命中检测和表达式解析，[图形与工具](workshop-web-engineering.md)展示数据结构选择 |
| 京东 | 数组分组、Ajax、长列表、五万点图表 | 小数组写分组边界；请求写 HTTP 与网络错误；大图表写视口裁剪和抽稀，[异步](workshop-web-async.md)与[图形](workshop-web-engineering.md)分别练 |
| 小红书 | 数组转树、Semaphore、LRU、上传、可视区域 | 先练并发名额和 LRU 淘汰，再把取消加入等待队列。上传按分片、校验和发布顺序写，[Node 上传](workshop-node-upload-storage.md)可运行 |
| 哔哩哔哩 | 防抖、事件循环、跨域、Vue 指令区别 | 给防抖加取消和尾调用测试；给事件循环写输出追踪。接着用[业务状态](workshop-web-business.md)练自动保存，而不是只背定时器代码 |

## 工程、网络与服务

| 企业 | 面经记录的题型 | 怎么练 |
| --- | --- | --- |
| 阿里 | 深拷贝、灯泡切换、Canvas/SVG、LCP、构建工具 | 状态切换先画允许的转移；图形选择先问交互与规模。再做[帧预算](workshop-web-engineering.md)和[构建图](workshop-node-build-config.md) |
| 蚂蚁集团 | 根据输入类型遍历 array 或 object，再执行回调 | 先判断遍历对象与回调参数，再定义空输入、返回值和异常。用[经典实现](workshop-web-javascript.md)练函数组合，再脱稿写工具函数 |
| Shopee | safeGet、sleep、compose、对象合并、千分位、Node 接口 | 路径取值先定义缺失值；中间件先定义执行顺序；接口加输入上限，[经典实现](workshop-web-javascript.md)与[Node HTTP](workshop-node-http-lifecycle.md)可交叉练习 |
| 顺丰科技 | 大数相加、命名转换、异步组件、loader/plugin | 大数不用 Number 偷渡精度；命名转换测试连续大写与数字；构建先写依赖图，[构建练习](workshop-node-build-config.md)讲顺序与环 |
| 360 | 数组重复元素、继承、JSONP、事件委托 | 用计数或 Set 明确重复的定义。委托要保留目标和容器边界；JSONP 还要清理 script 与全局回调，[DOM](workshop-web-dom.md)可练清理所有权 |
| 万兴科技 | 多人图片编辑、断线同步、没有 WebSocket 时的替代方案 | 先定操作 ID、版本和冲突规则。再区分运输协议与同步模型，[同步练习](practice-distributed-sync.md)与[场景专题](real-interview-scenarios.md)继续深入 |

## 把题目练到能变通

先挑一题，写两个最小输入。正常用例告诉你要交付什么。失败用例告诉你不能省掉什么。写完后换一个约束，不要只改函数名。

| 原题机制 | 第一个变式 | 第二个变式 |
| --- | --- | --- |
| LazyMan / QQMan 链式任务 | sleepFirst 放到问候前面 | 任务失败、取消与重入 |
| 请求重试 | 等待期间取消 | 非幂等写入超时后的查询与对账 |
| 发布订阅 | 回调移除自己或添加监听 | once 回调同步再次 emit |
| LRU | 容量从条数改为字节 | TTL 与共享加载的取消归属 |
| 线程池 | 满队列直接拒绝 | Worker 崩溃后恢复与关机 |
| 文件上传 | 一次失败不发布半成品 | 同序号分片重复与最终摘要不匹配 |

[JavaScript](workshop-web-javascript.md)、[Node](workshop-node-workers-streams.md)和[Go](workshop-go-concurrency.md)题解分别提供完整实现。先做一版，再解释为什么另一种语言需要不同的等待和清理方式。

## 面经链接

记录来自公开面经，不是公司公布的完整题库。具体日期和未披露字段保留在[登记表](../assets/research/interview-provenance-20261012.json)。下面只放阅读入口，不在每段重复介绍来源性质。

| 企业 | 阅读入口 |
| --- | --- |
| 字节、网易、京东 | [三家前端一面记录](https://www.nowcoder.com/discuss/762390659880734720) |
| 腾讯 | [腾讯云前端实习](https://www.nowcoder.com/feed/main/detail/2c141f34992d47f7a2492bfe3648846b) |
| 拼多多 | [笔试记录](https://www.nowcoder.com/feed/main/detail/f184630a893040e4acbf929f8eb0f2c5) |
| 快手 | [秋招前端面经](https://www.nowcoder.com/discuss/524599136524558336) |
| 滴滴 | [前端一面](https://www.nowcoder.com/discuss/455374820369276928)、[用户体验平台](https://www.nowcoder.com/discuss/821065073501155328) |
| 携程 | [前端面试](https://www.nowcoder.com/discuss/679282678595608576?sourceSSR=subject) |
| 百度 | [智能云一二三面](https://www.nowcoder.com/discuss/389080636894572544) |
| 美团 | [前端实习一面](https://www.nowcoder.com/discuss/689797806030163968)、[深拷贝与异步](https://www.nowcoder.com/feed/main/detail/1a6ecdf6581c482a841c4a70418494b6) |
| 小米 | [前端实习](https://www.nowcoder.com/discuss/372064176255107072) |
| 小红书 | [一面](https://www.nowcoder.com/discuss/801727788586696704)、[二面](https://www.nowcoder.com/discuss/723947677808852992) |
| 哔哩哔哩 | [前端实习](https://www.nowcoder.com/discuss/353159092741021696) |
| 阿里 | [大文娱暑期](https://www.nowcoder.com/feed/main/detail/dbf40616a89d41bf82409a6c2864eabe)、[控股暑期](https://www.nowcoder.com/feed/main/detail/480807e5eeb449d7a392f5df4fb5f0fc) |
| 蚂蚁 | [多家公司前端暑期面经](https://www.nowcoder.com/discuss/353159343954665472) |
| Shopee | [秋招一面](https://www.nowcoder.com/discuss/666740466037121024)、[新加坡前端](https://www.nowcoder.com/discuss/353158486123028480) |
| 顺丰 | [前端一二面](https://www.nowcoder.com/discuss/353158617958391808) |
| 360 | [前端一面](https://www.nowcoder.com/discuss/353159040438050816)、[多家公司面经](https://www.nowcoder.com/discuss/353154141528727552) |
| 京东场景 | [五年前端面试总结](https://www.nowcoder.com/discuss/792083064158507008) |
| 万兴 | [前端一面](https://www.nowcoder.com/discuss/865618997453123584) |

[LazyMan / QQMan 题解](workshop-web-javascript.md)从队列开始，一步一步写出链式调度。
