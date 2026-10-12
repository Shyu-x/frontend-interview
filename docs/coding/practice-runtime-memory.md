---
title: 前端高阶手写题：运行时与内存 26 题
description: 面向 JavaScript、Worker、SharedArrayBuffer 与 WebAssembly 的系统级练习，涵盖句柄代次、arena 生命周期、消息邮箱、原子同步、线性内存、ABI、垃圾回收模型与隔离边界；每题给出资源上限和失败合同。
tags: [interview, coding, runtime, memory]
date: 2026-10-12
level: advanced
prerequisites:
  - JavaScript TypedArray、Promise 与 Worker 基础
  - 二进制布局、并发状态和内存安全基本概念
runnable: false
verified_at: 2026-10-12
source_commit: 84bf0f53f02065bdcc27cadb30d4c0e1569798d9
---

# 前端高阶手写题：运行时与内存 26 题

运行时题需要区分语言可观察行为与教学模型。JavaScript 程序不能替代 V8 垃圾回收器；本页练习描述句柄、分配器、消息队列和 ABI 的可测试抽象，不声称控制引擎私有堆或真实机器性能。

```mermaid
flowchart LR
    A[逻辑对象] --> B[句柄与代次]
    B --> C[内存区域]
    C --> D[所有权与同步]
    D --> E[释放或失效]
```

五层练题法依次说现象、规则、机制、实现、边界。先确定谁拥有内存、何时可读写、失败是否回滚，再讨论对齐或复杂度。所有复杂度都是模型分析，不是 CPU/GPU 实测。

## 句柄、分配器与所有权

### H335. 带 generation 的槽位句柄池

- **题目契约：**实现 createHandlePool(capacity)，提供 allocate(value)、get(handle)、release(handle)、snapshot()；句柄是 {slot,generation} 结构对象。
- **约束与不变量：**capacity 为 1..100000；满时 allocate 抛 RangeError；同池陈旧或已释放句柄 get/release 抛 RangeError；get 返回原 value 引用；snapshot 仅含 used 与 generation。
- **用例 A：**容量 1 分配 A 得 h，释放后再分配 B 得同 slot 且 generation 增 1；get(h) 抛 RangeError，get(新句柄) 返回 B。
- **用例 B：**释放 A 后 snapshot 为 `[{generation:1,used:false}]` 且不含 A 引用；分配 B 填满容量，再分配 C 抛错，snapshot 与申请 C 前的快照完全一致。
- **实现提示：**槽位存 generation、used、value；释放清空 value 并递增 generation，空闲索引可用栈维护，验证同时检查 slot 范围与代次。
- **进阶追问：**generation 溢出会导致 ABA，怎样拒绝回绕或扩大位宽；句柄不含池 ID，只能在所属池使用且不是防伪安全令牌。
- **难度 / 建议时长：**中，30 分钟；需测试复用、快照不保留值和错误原子性。
- **依据与状态：**作者原创派生练习，Node 教学模型已实现并实跑，5 项句柄池测试通过；[完整源码与验收](handwritten-challenge-solutions.md)不提供跨池防伪、真实 GC 或多线程保证；机制参考[ECMAScript](handwritten-practice-sources.md#s11)和[WebAssembly Core](handwritten-practice-sources.md#s24)。

### H336. 对齐 arena 与嵌套 checkpoint

- **题目契约：**实现 createArena(size)、alloc(bytes,alignment)、checkpoint()、rollback(mark)，mark 后分配可整体回退。
- **约束与不变量：**size≤64 MiB；alignment 为 2 的幂；只允许 LIFO 回滚；越界分配失败且 cursor 不变。
- **用例 A：**size=64，alloc(3,8) 返回 0，后续 alloc(4,16) 返回 16；回滚 checkpoint 后 cursor 恢复。
- **用例 B：**以旧 mark 跨越较新 checkpoint 回滚报 StateError；alloc(65,1) 抛 RangeError。
- **实现提示：**单一 ArrayBuffer 加 byte cursor；对齐公式先做安全加法；mark 携 arena 身份、cursor 与嵌套序号。
- **进阶追问：**如何处理对象析构副作用；为何 arena 回滚只恢复字节空间而不能撤销外部引用？
- **难度 / 建议时长：**难，40 分钟；说明栈式生命周期前提。
- **依据与状态：**作者原创派生练习，未实现/未实跑；线性内存机制参考[WebAssembly Core](handwritten-practice-sources.md#s24)和[ECMAScript](handwritten-practice-sources.md#s11)。

### H337. 固定大小对象池与析构队列

- **题目契约：**实现 acquire() 与 release(handle)，管理固定尺寸槽位；release 将对象标记待清理，由 drainFinalizers(limit) 执行清理回调。
- **约束与不变量：**槽数 1..1,000,000；同对象清理恰一次；待清理对象不可再次 get；析构回调异常不能阻止其他条目清理。
- **用例 A：**释放两个槽后 drainFinalizers(1) 只清第一个；再 drain 一次清第二个。
- **用例 B：**重复 release 返回 false；第一个 finalizer 抛错时仍处理下一项，最后汇总首个异常。
- **实现提示：**状态 free/live/pending/finalized 明确区分；空闲槽栈与最终清理 FIFO 分开维护。
- **进阶追问：**如何避免用户 finalizer 重入池造成双重分配；GC finalizer 为何不能作为确定释放 API？
- **难度 / 建议时长：**难，45 分钟；独立模型不表示 JavaScript 可控制真实 GC。
- **依据与状态：**作者原创派生练习，未实现/未实跑；对象状态参考[ECMAScript](handwritten-practice-sources.md#s11)与[WebAssembly Core](handwritten-practice-sources.md#s24)。

### H338. 移动堆压缩与 forwarding 指针修复

- **题目契约：**实现 compact(heap, roots)，把存活对象移动到紧凑地址区，返回新 roots 与旧地址到新地址映射。
- **约束与不变量：**教学堆对象大小为 8 字节倍数；对象字段只含标量或对象地址；压缩前后根可达对象图同构且无悬空边。
- **用例 A：**地址 0 的 A 指向 16 的 B，地址 8 的垃圾对象被移除；压缩后 A 在 0、B 在 8，A 的边更新到 8。
- **用例 B：**root 指向不存在地址时拒绝且原 heap 不变；空 roots 回收所有对象。
- **实现提示：**先从 roots 标记存活，再按旧地址顺序计算新地址，建立 forwarding map，最后重写 roots 与存活对象的引用字段。
- **进阶追问：**并发 mutator 如何与压缩同步；pin 住的对象会如何形成空洞并改变压缩策略？
- **难度 / 建议时长：**挑战，55 分钟；这是堆图教学模型，不实现或声称替代 V8 GC。
- **依据与状态：**作者原创派生练习，未实现/未实跑；可达性参考[ECMAScript](handwritten-practice-sources.md#s11)与[WebAssembly Core](handwritten-practice-sources.md#s24)。

### H339. TypedArray 视图生命周期借用检查器

- **题目契约：**实现 borrow(buffer,offset,length) 与 invalidate(buffer)，借用视图 read/write 前验证 backing buffer 仍有效且范围未变化。
- **约束与不变量：**输入是非 detached ArrayBuffer；所有偏移按字节计且安全加法；invalidate 后旧借用全部失效。
- **用例 A：**借用 offset=4、length=8 写入 byte 0x7F，仅影响底层索引 4；invalidate 后 read 抛 DetachedError。
- **用例 B：**offset+length 超 buffer.byteLength 时 RangeError；零长范围合法且不能读写元素。
- **实现提示：**借用记录 generation、byteOffset、byteLength；每次访问核对 generation 与当前 buffer 状态，不把视图视为所有权。
- **进阶追问：**真实 ArrayBuffer transfer 后如何观察 detached 状态；ResizableArrayBuffer 改变长度需额外哪些规则？
- **难度 / 建议时长：**中，30 分钟；这里是教学检查器，不取代引擎访问验证。
- **依据与状态：**作者原创派生练习，未实现/未实跑；视图和 buffer 语义参考[ECMAScript](handwritten-practice-sources.md#s11)与[Node worker threads](handwritten-practice-sources.md#s27)。

### H340. Buffer slab 分配与外部引用计数

- **题目契约：**实现 allocate(size) 从固定 slab 返回 view 和 release()，多个小 view 可共享 slab，但 slab 最后一个 view 释放后才归还。
- **约束与不变量：**slab=64 KiB；单次 request≤slab；release 幂等返回布尔；保留 view 不得在逻辑释放后继续由本管理器写入。
- **用例 A：**分配 20 KiB、10 KiB 两 view 后释放第一项，slab 仍占用；释放第二项后回到 free pool。
- **用例 B：**请求 64 KiB+1 抛 RangeError；同一 view 重复 release 第二次 false。
- **实现提示：**slab 维护空闲区间与 live allocation map；外部 view 不可撤销，因此管理器只承诺拒绝自身后续操作。
- **进阶追问：**一个很小 view 如何钉住大 slab；碎片合并何时可做且不会使活 view 改址？
- **难度 / 建议时长：**难，40 分钟；明确系统无法撤销用户持有的 TypedArray。
- **依据与状态：**作者原创派生练习，未实现/未实跑；buffer 行为参考[ECMAScript](handwritten-practice-sources.md#s11)与[Node worker threads](handwritten-practice-sources.md#s27)。

### H341. 资源所有权转移审计器

- **题目契约：**实现 transfer(resource,from,to) 与 assertOwner(resource,worker)，对资源所有者变更建立事件日志并拒绝双重拥有。
- **约束与不变量：**worker ID 固定集合；转移原子；转移后 source 不能读写；不存在的资源和错误 owner 返回 OwnershipError。
- **用例 A：**R 初属 W1，转给 W2 后 W1 访问失败，W2 访问成功，日志仅一条转移事件。
- **用例 B：**W3 尝试转移 W1 的 R 被拒绝，所有者和日志长度不变。
- **实现提示：**Map 维护 resource→owner 与 generation；事件追加仅在状态校验成功后提交。
- **进阶追问：**真实 postMessage transfer list 的可观察后果是什么；普通对象结构化克隆是否等于共享所有权？
- **难度 / 建议时长：**中，30 分钟；模拟合同不代表可拦截任意 JavaScript 属性访问。
- **依据与状态：**作者原创派生练习，未实现/未实跑；转移机制参考[Node worker threads](handwritten-practice-sources.md#s27)和[ECMAScript](handwritten-practice-sources.md#s11)。

## Worker mailbox 与 SharedArrayBuffer 同步

### H342. 带序号的有界 Worker mailbox

- **题目契约：**实现 mailbox(capacity)，提供 send(message)、receive()；队列满时 send 返回 backpressure，消息以递增序号 FIFO 交付。
- **约束与不变量：**capacity 1..65,536；消息引用不克隆；序号不重复；close 后 send 拒绝，已排队消息仍可 drain。
- **用例 A：**容量 2 发送 A、B 成功，发送 C 返回 backpressure；接收 A 后发送 C 成功且序号为 3。
- **用例 B：**close 后接收剩余 B、C，队空后返回 closed；重复 close 不改变状态。
- **实现提示：**环形数组 head/tail/count；生产者消费者均更新计数，状态转换作为原子模型操作。
- **进阶追问：**消息结构化克隆会如何影响发送成本；如何处理 worker 崩溃后未确认消息？
- **难度 / 建议时长：**中，30 分钟；这个模型不实现浏览器调度。
- **依据与状态：**作者原创派生练习，未实现/未实跑；mailbox 参考[Node worker threads](handwritten-practice-sources.md#s27)与[ECMAScript](handwritten-practice-sources.md#s11)。

### H343. SharedArrayBuffer SPSC 环形队列

- **题目契约：**实现单生产者单消费者队列，enqueue(uint32)、dequeue() 使用 SharedArrayBuffer 与 Atomics，容量为 2 的幂。
- **约束与不变量：**只有一个 producer 和一个 consumer；head/tail 用无符号递增序号，空满判断正确处理回绕；不能依赖非原子共享读写。
- **用例 A：**容量 4 入队 10、11 后依序出队 10、11；空队列 dequeue 返回 EMPTY。
- **用例 B：**满队列第五项返回 FULL 且队列内容不变；容量非二次幂构造失败。
- **实现提示：**单调 uint32 head/tail，slot = index & mask；发布元素后 Atomics.store tail，消费前 Atomics.load tail 建立顺序。
- **进阶追问：**为什么 SPSC 简化不能直接扩成 MPMC；浏览器 cross-origin isolation 对 SAB 可用性有何影响？
- **难度 / 建议时长：**挑战，55 分钟；说明内存顺序和角色唯一性。
- **依据与状态：**作者原创派生练习，未实现/未实跑；原子与 Worker 参考[ECMAScript](handwritten-practice-sources.md#s11)和[Node worker threads](handwritten-practice-sources.md#s27)。

### H344. Atomics.wait 序列号通知模型

- **题目契约：**实现 publish(view,index,sequence) 为 Atomics.store 后 Atomics.notify；waitForChange(view,index,observed,timeout) 包装原生 wait，返回 changed、timed-out 或 not-equal。
- **约束与不变量：**只允许规范支持的整数 typed array；sequence 单调增加；wrapper 收到 native ok 后重读，值仍等于 observed 时继续等待，直到值变化或超时。
- **用例 A：**当前值 4、observed=3 立即 not-equal；仍为 4 时 worker publish 5，等待者醒来并重读后返回 changed。
- **用例 B：**timeout=0 返回 timed-out；在浏览器主线程拒绝阻塞 wait 并提示 waitAsync，Node 主线程若调用则会阻塞事件循环。
- **实现提示：**原生 wait 的 ok/not-equal/timed-out 与本题 wrapper 结果不是同一枚举；notify 只唤醒等待者，不保证业务条件成立。
- **进阶追问：**先通知后写为何丢失状态；waitAsync 的 Promise 调度引入什么竞态？
- **难度 / 建议时长：**难，40 分钟；区分写入、通知、原生状态和业务状态。
- **依据与状态：**作者原创派生练习，未实现/未实跑；原子通知参考[ECMAScript](handwritten-practice-sources.md#s11)和[Node worker threads](handwritten-practice-sources.md#s27)。

### H345. 原子门闩与超时取消

- **题目契约：**实现 AsyncGate(parties)，worker 到达后等待所有参与者；支持 AbortSignal 与超时，取消整组并向全体返回同一错误。
- **约束与不变量：**parties≥1；成功一代只放行一次；取消后代次永久结束，不允许迟到 worker 误入下一代。
- **用例 A：**三参与者前两者等待，第三者到达后全部 fulfilled 且 generation 同为 1。
- **用例 B：**第二位 abort 后所有等待者 reject AbortError；之后任何 arrive 均报 GateClosed。
- **实现提示：**代次对象拥有 count、Promise、取消原因；注册 abort listener 后必须在成功/失败两条路径移除。
- **进阶追问：**可复用 barrier 如何隔离下一代；一个参与者永不抵达时系统如何释放资源？
- **难度 / 建议时长：**难，40 分钟；用可控时钟测超时，不依赖真实等待时长。
- **依据与状态：**作者原创派生练习，未实现/未实跑；Worker 异步模型参考[Node worker threads](handwritten-practice-sources.md#s27)及[ECMAScript Promise](handwritten-practice-sources.md#s11)。

### H346. 多生产者 sequence-slot 队列模型

- **题目契约：**实现模型化 bounded MPMC queue，每槽保存 sequence 与 value，enqueue/dequeue 用 compareExchange 争夺位置。
- **约束与不变量：**容量二次幂；序号差用于判断空、满、可写；CAS 失败重试有上限，超出返回 contention 而非丢数据。
- **用例 A：**两个 producer 并发各发 100 个唯一整数，最终消费集合大小 200 且无重复、无缺失。
- **用例 B：**容量 2 满队列插入第三项返回 FULL；序号回绕模拟到边界不得误判为空。
- **实现提示：**将 algorithm 描述成可执行状态机，用线性化点标识成功读写；JavaScript 真实共享对象运行限制需单独说明。
- **进阶追问：**内存回收与槽重用如何避免 ABA；为何单纯 fetchAdd 预留位置在消费者失败时会留下洞？
- **难度 / 建议时长：**挑战，70 分钟；本题以伪并发模型验证，不声称跑出硬件无锁性能。
- **依据与状态：**作者原创派生练习，未实现/未实跑；原子基本操作参考[ECMAScript](handwritten-practice-sources.md#s11)和[Node worker threads](handwritten-practice-sources.md#s27)。

### H347. Worker 邮箱确认与重放窗口

- **题目契约：**实现 receiveEnvelope({epoch,seq,payload})，按 epoch 与序号去重、确认并识别缺口。
- **约束与不变量：**seq 从 1 连续递增；同 seq 同 payload hash 为 duplicate；同 seq 不同 hash 是 protocol error；窗口≤1024。
- **用例 A：**接收 1、2、2，第三次标记 duplicate 并重发 ack=2，不重复执行 handler。
- **用例 B：**先收 2 返回 gap=1；epoch 变化后旧 epoch 消息拒绝。
- **实现提示：**先校验 envelope 和 hash，再提交去重表与应用状态；处理失败不能先发成功 ack。
- **进阶追问：**进程崩溃时怎样持久化已提交序号；消息 exactly-once 为何需要业务事务配合？
- **难度 / 建议时长：**难，40 分钟；区分至少一次传递与恰好一次副作用。
- **依据与状态：**作者原创派生练习，未实现/未实跑；消息语义参考[Node worker threads](handwritten-practice-sources.md#s27)和[ECMAScript](handwritten-practice-sources.md#s11)。

## WebAssembly 线性内存与 ABI

### H348. Wasm linear memory bump allocator

- **题目契约：**实现 allocate(bytes,alignment) 与 grow(pages)，对给定线性内存大小分配无重叠字节区间。
- **约束与不变量：**page 为 64 KiB；地址与长度不得超过当前 buffer；增长页数受 maxPages 限制；失败返回明确 exhaustion。
- **用例 A：**初始 1 page 分配 12 bytes 对齐 8，地址为 0；下一分配地址为 16。
- **用例 B：**请求超过 maxPages 返回 OUT_OF_MEMORY；cursor 不动且既有数据未被改写。
- **实现提示：**用 64 位中间值做对齐和上界计算；grow 可能搬迁宿主视图，调用者需重新获取 TypedArray view。
- **进阶追问：**memory.grow 的页语义与 JS view 失效有什么关系；free list 如何处理外部线性地址引用？
- **难度 / 建议时长：**中，30 分钟；这是线性内存教学分配器。
- **依据与状态：**作者原创派生练习，未实现/未实跑；memory 参考[WebAssembly Core](handwritten-practice-sources.md#s24)和[ECMAScript](handwritten-practice-sources.md#s11)。

### H349. Wasm 导出函数 ABI 参数打包器

- **题目契约：**实现教学 ABI 的 packCall(signature,args,heap)，把 i32/i64/f32/f64 和字符串降为 ptr+len 写入栈区；Wasm Core 函数签名本身不含 string 类型。
- **约束与不变量：**签名参数数目精确；i64 使用 BigInt；字符串布局为 pointer+byteLength；栈按 16 字节对齐且调用后恢复。
- **用例 A：**教学签名 (i32,ptr,len)->i32，值 7 与“猫”产出 [7,ptr,3]，ptr 指向 E7 8C AB 三字节。
- **用例 B：**传 Number 给 i64 报 TypeError；分配越界时不调用 wasm export 且 stack pointer 恢复。
- **实现提示：**先验证参数再写 heap；用 DataView 明确 little-endian；把错误路径也包在栈恢复 finally 内。
- **进阶追问：**多返回值如何映射；异常跨语言边界为何需要显式错误码或异常桥？
- **难度 / 建议时长：**难，45 分钟；这是自定义教学 ABI，不冒充 wasm 标准 ABI。
- **依据与状态：**作者原创派生练习，未实现/未实跑；调用规则参考[WebAssembly Core](handwritten-practice-sources.md#s24)与[WHATWG Encoding](handwritten-practice-sources.md#s25)。

### H350. Wasm 句柄表跨边界代理

- **题目契约：**实现 hostHandleTable.allocate(object)、invoke(handle,method,args)、release(handle)，仅将整数句柄交给 Wasm。
- **约束与不变量：**句柄含 slot 和 generation；方法白名单；释放后旧代次拒绝；参数和结果必须属于允许的标量/字符串/句柄类型。
- **用例 A：**分配对象句柄后 invoke getName 返回字符串；release 后再次 invoke 抛 StaleHandle。
- **用例 B：**method=__proto__ 不在白名单而拒绝；伪造越界 slot 不触及宿主对象。
- **实现提示：**宿主 Map 保存对象和 generation；每次导出调用都检查代次和能力表，不能把任意属性名当反射入口。
- **进阶追问：**句柄可猜测时怎样最小化权限；为何 Wasm 沙箱不能自动替代宿主 API 授权？
- **难度 / 建议时长：**难，40 分钟；强调句柄是引用桥不是安全证明本身。
- **依据与状态：**作者原创派生练习，未实现/未实跑；宿主边界参考[WebAssembly Core](handwritten-practice-sources.md#s24)和[ECMAScript](handwritten-practice-sources.md#s11)。

### H351. Wasm 指针与长度的边界验证器

- **题目契约：**实现 readWasmBytes(memory,ptr,len)，在调用 DataView 前验证线性内存切片并复制到宿主-owned Uint8Array。
- **约束与不变量：**ptr/len 为非负整数；加法不溢出；范围须在 memory.buffer.byteLength 内；不返回可被后续 grow 失效的临时 view。
- **用例 A：**memory 64 KiB，ptr=100,len=3 返回独立三字节副本；修改副本不改 Wasm 内存。
- **用例 B：**ptr=65535,len=2 拒绝；len=0 且 ptr=65536 合法空切片。
- **实现提示：**使用 len≤total-ptr 的形式验证避免 ptr+len 溢出；复制前再次检查 memory buffer 未改变。
- **进阶追问：**何时零拷贝 view 合理；宿主与 Wasm 并发共享 memory 时如何防 TOCTOU？
- **难度 / 建议时长：**中，30 分钟；题目明确选择复制所有权。
- **依据与状态：**作者原创派生练习，未实现/未实跑；线性内存参考[WebAssembly Core](handwritten-practice-sources.md#s24)和[ECMAScript](handwritten-practice-sources.md#s11)。

### H352. Wasm 多值结果与错误 ABI

- **题目契约：**实现 decodeResult(exportsResult,layout)，把 status、返回值和可选错误字符串解码为 Result<T,E>。
- **约束与不变量：**status 0 表成功；非零 status 的错误指针长度必须合法；成功时错误区域忽略但不读取；未知 status 报 ABIError。
- **用例 A：**status=0,value=42 返回 Ok(42)，不访问错误缓冲区。
- **用例 B：**status=2、错误字符串 UTF-8 截断报 DecodeError；status=99 返回 ABIError。
- **实现提示：**先解析固定头，再按 status 分支读取可变区；返回宿主结构不泄漏线性内存 view。
- **进阶追问：**错误信息复制的内存成本；异常 unwind 不支持环境如何确保不会跨边界抛 JS exception？
- **难度 / 建议时长：**中，30 分钟；该 ABI 是练习合同。
- **依据与状态：**作者原创派生练习，未实现/未实跑；Wasm 调用参考[WebAssembly Core](handwritten-practice-sources.md#s24)和[WHATWG Encoding](handwritten-practice-sources.md#s25)。

### H353. Wasm memory.grow 视图刷新封装

- **题目契约：**实现 MemoryView.refresh() 与 grow(pages)，在内存增长后重建所有缓存 TypedArray/DataView 并递增 epoch。
- **约束与不变量：**grow 返回失败时 epoch 不变；成功后旧 view 标记失效；每个 accessor 在读写前核验创建时 epoch。
- **用例 A：**初始 1 页 grow 1 页后 byteLength 变 131072，旧 view 访问报 StaleView，新 view 可读新区域。
- **用例 B：**超过 max 页 grow 失败，旧 view 仍有效且 epoch 不变。
- **实现提示：**集中保存 memory.buffer 身份和 epoch；增长后一次性替换所有 view，不把 detached 行为假定为各引擎相同。
- **进阶追问：**共享 memory 的 buffer 长度表现如何不同；Resizable buffer 支持对封装提出什么额外要求？
- **难度 / 建议时长：**中，30 分钟；用显式 epoch 给视图缓存失效。
- **依据与状态：**作者原创派生练习，未实现/未实跑；内存增长参考[WebAssembly Core](handwritten-practice-sources.md#s24)和[ECMAScript](handwritten-practice-sources.md#s11)。

### H354. ABI 结构体布局与填充计算

- **题目契约：**实现 layoutStruct(fields)，按给定 ABI 对齐规则返回每字段 offset、padding 和总 size。
- **约束与不变量：**字段类型限 i8/i16/i32/i64/f32/f64；alignment 为自然对齐且最大 8；结构体总尺寸按最大字段 alignment 向上取整。
- **用例 A：**字段 i8,i32,i16 得 offset 0,4,8，总 size 12。
- **用例 B：**空结构体 size=0；未知类型报 TypeError；不能把 JS object property 顺序当作 ABI 内存布局。
- **实现提示：**cursor 向上取整到字段 alignment 再放字段；分离字段对齐与结构体尾部 padding。
- **进阶追问：**嵌套结构、数组 stride 和 packed struct 如何扩展；不同 toolchain 的 ABI 是否都相同？
- **难度 / 建议时长：**中，30 分钟；本题规则显式给定，不声称通用 C ABI。
- **依据与状态：**作者原创派生练习，未实现/未实跑；布局参考[WebAssembly Core](handwritten-practice-sources.md#s24)与[ECMAScript TypedArray](handwritten-practice-sources.md#s11)。

### H355. Wasm 导入函数能力白名单

- **题目契约：**实现 buildImports(moduleSpec, hostApis)，仅按声明绑定原生 Wasm 导入；例如日志函数 ABI 使用 log(ptr,len)，由宿主 wrapper 解码为字符串。
- **约束与不变量：**模块名和字段名精确匹配；宿主 API 要求的签名需与 moduleSpec 一致；拒绝自动暴露 globalThis。
- **用例 A：**模块只声明 log(ptr,len)，绑定结果仅含该函数；宿主 wrapper 解码并限长 4 KiB。
- **用例 B：**请求不存在的 fs.readFile 导入时报 LinkError；声明签名不匹配也拒绝。
- **实现提示：**按模块字段建立新普通对象；每个 wrapper 做参数校验、权限检查和错误映射。
- **进阶追问：**Wasm sandbox 的边界为何取决于导入；资源耗尽如何通过 fuel 或请求预算限制？
- **难度 / 建议时长：**难，35 分钟；不把沙箱当作自动权限系统。
- **依据与状态：**作者原创派生练习，未实现/未实跑；导入机制参考[WebAssembly Core](handwritten-practice-sources.md#s24)和[ECMAScript](handwritten-practice-sources.md#s11)。

## GC、隔离与运行时模型

### H356. 教学 mark-sweep 可达性模拟器

- **题目契约：**实现 HeapModel.allocate(fields)、setRoot(id)、collect()，对自定义对象图执行标记清扫并返回回收 ID。
- **约束与不变量：**根集合显式提供；对象字段只存模型 ID；环可回收；本模型不读取或控制 JavaScript 引擎堆。
- **用例 A：**A→B、B→A 且 A 为根时回收 0；移除根后 collect 回收 A、B。
- **用例 B：**字段指向不存在 ID 时拒绝写入；重复 collect 不重复报告已回收对象。
- **实现提示：**显式栈遍历避免递归深度；标记 epoch 可省每轮清零；sweep 阶段删除未标对象。
- **进阶追问：**增量标记需要何种 write barrier；弱引用为何不能作为强可达边？
- **难度 / 建议时长：**中，30 分钟；输出明确称为教学图模型。
- **依据与状态：**作者原创派生练习，未实现/未实跑；对象可达性参考[ECMAScript](handwritten-practice-sources.md#s11)与[WebAssembly Core](handwritten-practice-sources.md#s24)。

### H357. 三色增量标记写屏障

- **题目契约：**实现 ColorHeap.step(budget)、writeField(owner,target)，模拟增量三色标记并维护黑对象到白对象不变量。
- **约束与不变量：**颜色为 white/gray/black；预算是每步扫描字段数；新建对象按合同标黑；写屏障须将目标变 gray。
- **用例 A：**A 已 black，写入指向 white 的 C 后，C 下一轮被扫描且不能被本轮回收。
- **用例 B：**budget=0 不推进状态；引用目标不存在时报错且原字段不变。
- **实现提示：**gray 队列逐字段推进；写屏障将新目标入队并避免重复；完成扫描后只 sweep white。
- **进阶追问：**SATB 与 incremental-update barrier 的差异；本模型省略并发写时会有何漏洞？
- **难度 / 建议时长：**挑战，50 分钟；教学模型不能据此断言 V8 内部算法细节。
- **依据与状态：**作者原创派生练习，未实现/未实跑；可达性和语言状态参考[ECMAScript](handwritten-practice-sources.md#s11)与[WebAssembly Core](handwritten-practice-sources.md#s24)。

### H358. JavaScript isolate 请求隔离模型

- **题目契约：**实现 createIsolate(id,quota)，提供 run(task)、post(message)、terminate()，将任务状态和资源计数限定在 isolate 模型内。
- **约束与不变量：**每 isolate 独立 task queue 与 quota，quota 表示排队加运行中的最大任务数；终止后拒绝新任务并清空待执行任务；共享只允许显式 message payload。
- **用例 A：**I1 任务排队不改变 I2 状态；I1 发消息后 I2 仅在 receive 时得到 payload 副本。
- **用例 B：**超 quota 的任务在执行前拒绝；terminate 后排队任务不再运行。
- **实现提示：**使用独立对象图和调度队列模拟隔离；真实 Worker 有 structured clone/transfer 语义，不共享同一 JS realm。
- **进阶追问：**CPU 长任务如何强制中止；消息复制成本和 transfer ownership 如何取舍？
- **难度 / 建议时长：**中，35 分钟；题目是概念模型，不重做浏览器 Worker API。
- **依据与状态：**作者原创派生练习，未实现/未实跑；隔离与 Worker 参考[Node worker threads](handwritten-practice-sources.md#s27)和[ECMAScript](handwritten-practice-sources.md#s11)。

### H359. FinalizationRegistry 延迟通知模型

- **题目契约：**实现教学模型 enqueueFinalization(targetId,heldValue)、deliverBatch(limit)，targetId 是模型 ID，不代表原生 FinalizationRegistry 的对象 identity。
- **约束与不变量：**heldValue 不得引用模型目标；通知可延迟且无确定顺序；取消 token 后不可再交付；模型不触发真实 GC。
- **用例 A：**目标被模型标 unreachable 后入队，deliverBatch(1) 只处理一条 heldValue。
- **用例 B：**heldValue 等于 targetId 时按本练习的 ID 等价规则拒绝；取消 token 后排队项跳过。
- **实现提示：**分开 registry entry、模型可达性和 delivery queue；清理回调异常不得让其他批次永久丢失。
- **进阶追问：**为何不能依赖 finalizer 关闭文件或解锁；回调重新引用宿主对象会有何生命周期问题？
- **难度 / 建议时长：**中，30 分钟；教学判等与真实规范对象身份不同，不能声称原生行为。
- **依据与状态：**作者原创派生练习，未实现/未实跑；回收接口参考[ECMAScript](handwritten-practice-sources.md#s11)与[Node worker threads](handwritten-practice-sources.md#s27)。

### H360. Worker 崩溃隔离与 attempt fencing

- **题目契约：**实现 WorkerPool.run(job)、onWorkerExit(workerId)、replaceWorker()；崩溃时将未确认 job 以新 attempt 重派，旧 attempt 的迟到结果必须被 fencing 丢弃。
- **约束与不变量：**worker 数 1..32；job 有稳定 ID 与递增 attempt；只接受当前 attempt 的一次结果；已确认副作用不得盲目重试。
- **用例 A：**W1 执行 J attempt 1 后崩溃，J 由 W2 attempt 2 完成；随后到达的 attempt 1 结果被忽略。
- **用例 B：**job 已提交副作用但 ack 丢失时标记 outcome-unknown 并要求幂等键查询；不得直接声称失败可安全重做。
- **实现提示：**job 状态包含 dispatched/committed/unknown；worker exit 只回收未提交任务，attempt token 随派发递增，结果提交前比较 fencing token。
- **进阶追问：**怎样把 fencing token 带到服务端防旧 worker 写入；worker terminate 与浏览器进程崩溃有哪些不同可观察信号？
- **难度 / 建议时长：**挑战，55 分钟；重点是故障恢复合同，不是普通并发 Promise 池。
- **依据与状态：**作者原创派生练习，未实现/未实跑；Worker 生命周期参考[Node worker threads](handwritten-practice-sources.md#s27)与[ECMAScript](handwritten-practice-sources.md#s11)。

## 常见误区

| 误区 | 可观察失败 | 修正 |
|---|---|---|
| 只用 slot 不保存代次 | 旧句柄误指向复用对象 | generation 随生命周期递增 |
| 把 JS GC 当确定释放器 | 文件或 buffer 生命周期不可预测 | 显式 close/release，GC 仅作回收 |
| 把 SharedArrayBuffer 当普通数组 | 读写竞态与丢唤醒 | 通过 Atomics 定义发布与观察顺序 |

## 面试作答

**30 秒：**说清内存谁拥有、句柄如何失效、同步点在哪里，再给容量耗尽或旧引用的明确结果。

**2 分钟：**按状态机走一次分配、转移、释放或等待；解释边界检查、失败原子性和真实运行时/API 的限制；避免把教学 GC 模型说成 V8 实现。

## 自测

<details>
<summary>展开 3 道自测题与验收要点</summary>

1. slot 复用后为何增加 generation？让旧句柄即使 slot 相同也无法匹配新对象。
2. memory.grow 后为何刷新视图？原视图可能绑定旧 buffer 或旧长度假设。
3. finalizer 能否保证及时关闭资源？不能，调用时间不确定，必须提供显式释放路径。

</details>

## 未实现题面的验收边界

除 H335 对应仓库已验收的句柄池实现外，其余 25 题尚未实现、未运行。验收需加入容量边界、失效旧句柄、重入、回滚、并发乱序和异常清理；涉及真实 Worker、Atomics、WebAssembly 的行为，应记录运行时版本并只声称实际观测结果。

## 深入阅读

- [ECMAScript 规范](handwritten-practice-sources.md#s11)：核对 TypedArray、Promise、对象和原子相关语义。
- [Node worker_threads](handwritten-practice-sources.md#s27)：查看 Worker、transfer 与共享内存接口。
- [WebAssembly Core](handwritten-practice-sources.md#s24)：理解线性内存、函数调用和模块边界。
- [WHATWG Encoding](handwritten-practice-sources.md#s25)：理解 UTF-8 字节与字符串转换。
