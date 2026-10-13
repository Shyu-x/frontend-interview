---
title: Go 并发安全与资源生命周期
description: 通过六道完整题解处理计数、库存扣减、共享资源关闭、任务取消、配置热切换和 HTTP 优雅关停；用竞态测试与真实服务器验证资源边界。
tags: [go, concurrency, systems]
date: 2026-10-13
level: intermediate
prerequisites:
  - sync、sync/atomic 与 context.Context 基础
  - net/http.Server 生命周期基础
runnable: true
tested_with:
  - go@1.27.1
verified_at: 2026-10-13
source_commit: 27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb
---

# Go 并发安全与资源生命周期

并发安全不是“到处加锁”。只计数时原子变量更直接；必须把检查和扣减一起完成时要用互斥锁；共享关闭操作用 Once；一组相关任务要能取消并等待；配置读多写少时可发布不可变快照。本页把这些选择放进订单和 HTTP 服务生命周期里。

~~~mermaid
flowchart LR
  Request["请求并发"] --> Counter["独立计数：atomic"]
  Request --> Inventory["检查并扣减：mutex"]
  Shutdown["退出信号"] --> Group["取消任务并等待"]
  Shutdown --> Server["排空 HTTP 请求"]
  Reload["配置更新"] --> Snapshot["原子替换只读快照"]
  Cleanup["多个清理入口"] --> Closer["只关闭一次"]
~~~

沿着请求边界查看哪些状态必须一起变化，再看进程退出时有哪些工作和资源需要等待。同步原语解决的不是同一类问题，选错会留下超卖、竞态或关停挂起。

## 运行与验收

~~~sh
cd scripts/teaching-labs/go
go test ./...
go test -race ./...
~~~

G031、G032 和 G033 会真实启动并发 goroutine；G036 在本机 loopback listener 上运行标准 HTTP server。通过标准是所有测试完成，race detector 无报告，server goroutine 返回 http.ErrServerClosed。listener、goroutine 均由测试显式关闭并等待。

## G031–G036 同步原语与资源退出 {#g031}

### G031 并发请求计数 {#g031}

题目给出 100 个并发调用，每次加一，最终读数必须为 100。计数器没有其他关联字段，也不要求每次更新都触发回调。

#### 先判断状态是不是独立整数

单个数字的加减可以用 atomic.Int64。Add 本身是原子读改写；用普通 int64 做读加写会丢失同时到达的更新。

~~~go
func (c *AtomicCounter) Add(delta int64) int64 { return c.value.Add(delta) }
func (c *AtomicCounter) Load() int64           { return c.value.Load() }
~~~

完整实现见 [AtomicCounter](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle.go)，对应测试见 [TestG031AtomicCounter](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle_test.go)。当更新必须和时间戳、标签等其他字段一起保持一致时，多个独立原子操作并不构成一个事务。可以练习把计数改为“状态与更新时间”快照。

### G032 防止并发超卖 {#g032}

仓库库存初始为 10，40 个 goroutine 各尝试预留 1 件。恰好 10 个调用成功，最后库存为 0。

#### 将检查与扣减放在同一把锁内

如果检查库存和更新库存之间允许其他请求插入，两个订单都可能看见最后一件。锁覆盖整个判断与减法；无效数量在取得锁前拒绝。

~~~go
if count > i.available {
  return false
}
i.available -= count
~~~

完整实现见 [Inventory](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle.go)，对应测试见 [TestG032Inventory](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle_test.go)。若只给 available 的读取加锁、写操作不加锁，map-free 也仍有数据竞争和超卖。下一步可把 Reserve 改为预留 token，使调用方能确认或释放预留。

### G033 多条清理路径只关闭一次 {#g033}

多个 goroutine 同时调用同一个 Close，底层关闭函数只能执行一次；底层返回的错误要被每个调用方观察到。

#### 用 Once 保存关闭结果

sync.Once 保证函数只执行一次，字段 err 保存第一次执行结果。所有并发调用返回 Once 完成后的相同错误。

~~~go
c.once.Do(func() {
  if c.closeFn != nil { c.err = c.closeFn() }
})
return c.err
~~~

完整实现见 [OnceCloser](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle.go)，对应测试见 [TestG033OnceCloser](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle_test.go)。不要把 Once 当作普通可重试锁；第一次关闭失败仍不会再次调用 closeFn。下一步可以区分“关闭失败是否可以重试”和“底层资源可能已部分关闭”的契约。

### G034 后台任务失败时取消同组任务 {#g034}

任务组中一个操作返回错误，兄弟任务应收到 context 取消；Wait 必须等所有已启动任务退出，并返回第一个错误。父 context 取消也必须保留取消结果。

#### 由组拥有派生 context

每个任务共享组 context。第一个错误通过 Once 保存并取消 context；Wait 等待所有 goroutine 后再返回。调用约定是先启动完所有任务，再调用 Wait。

~~~go
if err := task(g.ctx); err != nil {
  g.once.Do(func() { g.err = err; g.cancel() })
}
~~~

完整实现见 [TaskGroup](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle.go)，对应测试见 [TestG034TaskGroup](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle_test.go)。如果任务忽略 context 且永久阻塞，Wait 也会一直等；Go 不会强行终止 goroutine。下一步可以增加启动错误后拒绝新的 Go 调用。

### G035 热更新只读路由配置 {#g035}

读取方应在配置切换时得到完整的旧版或新版，不应看到半更新字段。写入方在替换后不再修改已经发布的 map。

#### 原子发布指针，不共享可变对象

atomic.Pointer 让指针替换本身原子化。它不能自动保护指针指向的 map，所以发布后的对象必须视作不可变。

~~~go
func (s *Snapshot[T]) Store(v *T) { s.value.Store(v) }
func (s *Snapshot[T]) Load() *T   { return s.value.Load() }
~~~

完整实现见 [Snapshot](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle.go)，对应测试见 [TestG035Snapshot](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle_test.go)。若 Store 后继续修改 map，读者仍可能发生数据竞争。下一步可以封装复制构造函数，避免调用者保留并改写底层 map。

### G036 优雅关闭 HTTP 服务 {#g036}

服务器接到关停信号后最多等待一个给定期限；在期限内排空活动请求，超时则强制关闭连接。正常关停时 Serve goroutine 必须结束。

#### 先优雅等待，再强制兜底

http.Server.Shutdown 停止接受新连接并等待活动请求；如果 context 超时或关停出错，再调用 Close 释放 listener 和连接。nil server 返回明确错误。

~~~go
if err := server.Shutdown(ctx); err != nil {
  closeErr := server.Close()
  if closeErr != nil { return errors.Join(err, closeErr) }
  return err
}
~~~

完整实现见 [ShutdownHTTP](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle.go)，对应测试见 [TestG036ShutdownHTTP](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/lifecycle_test.go)。只取消业务 context 而不停止 listener，进程仍会继续接收请求。下一步可以为 handler 增加一个有界活动请求，并分别验证排空和超时强制关闭。

## 面试回答与真实验收

30 秒回答：原子操作适合彼此独立的标量；mutex 保护由多个步骤组成的不变量；Once 只执行一次清理；任务组需要取消和 join；HTTP Shutdown 先排空，再在 deadline 到期后 Close。

2 分钟回答：库存问题要求检查与扣减不可分割，所以使用 mutex；单独计数用 atomic 避免多余锁；配置通过 atomic.Pointer 替换不可变对象，而非原子化 map 内容；任务组将子任务绑定到派生 context，第一个错误取消其余任务，Wait 确认 goroutine 退出。服务关停传入有 deadline 的 context，Shutdown 等待活动请求，Close 为超时提供清理兜底。测试通过真实并发和 loopback server 检查最终状态与退出。

验收运行于 Go 1.27.1。本机 listener 在 TestG036ShutdownHTTP 中创建，测试结束前消费 Serve 的完成结果；其它后台任务由 WaitGroup join。普通测试检查行为，race 检查已触发路径；未模拟操作系统断电或真实负载。

真实实现可看 [Go net/http Server.Shutdown 文档](https://pkg.go.dev/net/http#Server.Shutdown) 与 [标准库 Server 源码](https://go.dev/src/net/http/server.go)。生产服务示例可对照 [Caddy 的启动与关闭代码](https://github.com/caddyserver/caddy/tree/master/caddy) 和 [Kubernetes apiserver 的 server 生命周期](https://github.com/kubernetes/kubernetes/tree/master/staging/src/k8s.io/apiserver/pkg/server)，观察进程级关停如何组织监听器和后台组件。

## 自测与深入阅读

1. 哪类逻辑适合 atomic，哪类需要 mutex？
2. context 取消后，为什么还要等待 goroutine？
3. 发布不可变配置时，atomic.Pointer 保护了什么、没有保护什么？

答案：独立标量用 atomic，复合不变量用 mutex；取消只是通知，等待确保释放和退出完成；指针替换原子，指针指向的可变对象不受保护。深入阅读 [Go Race Detector](https://go.dev/doc/articles/race_detector)，了解动态竞态检测能发现什么，以及为什么还需要覆盖真实并发路径。
