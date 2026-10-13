---
title: SQL、MVCC 与事务边界手写题 H179–H204
description: 用 PostgreSQL 18 风格的 SQL 合同练习 keyset 分页、索引选择、MVCC 可见性、隔离级别、库存扣减、事务消息、迁移和连接池边界。每题给出输入输出、并发不变量、可复现的事务时序与失败判定，强调数据库原子性来自真实 SQL 约束，不把进程内模拟冒充生产事务。
tags: [interview, coding, databases, postgresql, transactions]
date: 2026-10-12
level: advanced
prerequisites:
  - SQL SELECT、JOIN、索引和事务基础
  - PostgreSQL 事务、锁与连接池基本概念
  - JavaScript async/await 与数据库驱动的连接租借模型
runnable: false
verified_at: 2026-10-12
source_commit: 84bf0f53f02065bdcc27cadb30d4c0e1569798d9
---

# SQL、MVCC 与事务边界手写题 H179–H204

<!-- Solution routes -->
先跟着代码写一遍，可读[幂等与共享加载](workshop-node-service-resilience.md)和[CAS 模型](handwritten-challenge-solutions.md)。下方练习再增加新约束。

库存页显示某商品剩余 1 件，两个结账请求几乎同时到达。若应用先 SELECT 再在内存减一，两边都可能读到 1 并都确认成功；若把扣减、订单和消息拆成彼此独立的写入，进程崩溃后页面和消息可能各说各话。本组题把可见性、约束、隔离和资源租借写成能复现的 SQL 或事件合同。题面为原创练习，不宣称是招聘公司真题；PostgreSQL 文档引用只用于机制说明。

事务和读路径的心智模型如下：

```mermaid
flowchart LR
    A[请求参数] --> B[SQL 谓词与索引]
    B --> C[MVCC 快照]
    C --> D[约束或行锁]
    D --> E[提交或回滚]
    E --> F[外部副作用边界]
```

看图时从谓词一路追到提交点：索引决定访问路径但不替代正确性；MVCC 决定快照看见哪些版本；锁和约束决定竞争写入如何裁决；事务提交之后的消息、文件和网络调用仍有独立失败边界。机制核验参考 [PostgreSQL 18 Transaction Isolation](handwritten-practice-sources.md#s14) 与 [PostgreSQL 18 SELECT](handwritten-practice-sources.md#s15)。


## 快照、分页与索引

### H179. 单进程教学版乐观版本 CAS

实现 createVersionedStore(entries)，id 必须是非空 string，初始记录形如 {id,value,version:0}；read(id) 返回隔离复制快照，compareAndSwap(id, expectedVersion, newValue) 返回成功的新版本或当前版本冲突。

成功仅当版本严格相等，原记录整体替换并递增一次；冲突不改变 value/version；读取或更新不存在记录抛 RangeError。仅单进程同步模型，不得描述为 SQL 事务或多进程原子。

- 读 id='7' 得 version 0，CAS('7',0,'b') 成功返回 version 1；随后 read 得到 b/1，早先快照对象仍保持旧值。
- CAS('7',0,'c') 因当前版本 1 返回 {ok:false,currentVersion:1}，记录仍为 b/1；CAS 不存在 id='missing' 抛 RangeError，不得静默创建。

用 Map 按 id 索引，read 对支持值做结构化复制；先读取版本、再同一同步临界段比较与写入，拒绝引用泄漏。教学实现边界要显眼。

若 value 内含循环引用或自定义实例，复制语义怎样收敛？如何在 PostgreSQL 中用 WHERE version=? 的 UPDATE 才获得跨进程 CAS？

中，25 分钟；题目强调快照隔离复制和冲突不变更。

<!-- Question record (index metadata)
- **题目契约：**实现 createVersionedStore(entries)，id 必须是非空 string，初始记录形如 {id,value,version:0}；read(id) 返回隔离复制快照，compareAndSwap(id, expectedVersion, newValue) 返回成功的新版本或当前版本冲突。
- **约束与不变量：**成功仅当版本严格相等，原记录整体替换并递增一次；冲突不改变 value/version；读取或更新不存在记录抛 RangeError。仅单进程同步模型，不得描述为 SQL 事务或多进程原子。
- **用例 A：**读 id='7' 得 version 0，CAS('7',0,'b') 成功返回 version 1；随后 read 得到 b/1，早先快照对象仍保持旧值。
- **用例 B：**CAS('7',0,'c') 因当前版本 1 返回 {ok:false,currentVersion:1}，记录仍为 b/1；CAS 不存在 id='missing' 抛 RangeError，不得静默创建。
- **实现提示：**用 Map 按 id 索引，read 对支持值做结构化复制；先读取版本、再同一同步临界段比较与写入，拒绝引用泄漏。教学实现边界要显眼。
- **进阶追问：**若 value 内含循环引用或自定义实例，复制语义怎样收敛？如何在 PostgreSQL 中用 WHERE version=? 的 UPDATE 才获得跨进程 CAS？
- **难度 / 建议时长：**中，25 分钟；题目强调快照隔离复制和冲突不变更。
- **依据与状态：**作者原创派生练习，Node 教学模型已实现并实跑，6 项 CAS 测试通过；[完整源码与验收](handwritten-challenge-solutions.md)限定同步、单进程与结构化复制范围，机制延伸见 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H180. 稳定 keyset 分页与复合游标

实现 SQL 查询 fetchOrders(tenantId, beforeCreatedAt, beforeId, limit)，按 created_at DESC、id DESC 返回下一页及下一游标。

id 作为唯一 tie-breaker；游标条件必须与排序方向一致；limit 限定在 1 到 100；不能使用 OFFSET 作为深页定位。

- 行集为 (id=9,created_at=12:00)、(id=7,created_at=12:00)、(id=5,created_at=11:00)，第一页 limit=1 返回 id=9、cursor=(12:00,9)；第二页返回 id=7、cursor=(12:00,7)，不漏行。
- 第一页返回 cursor=(12:00,9) 后插入 (id=11,created_at=13:00) 与 (id=4,created_at=10:00)，第二页不返回新 id=11，但返回更旧的 id=4；已返回的 id=9 不重复。

谓词使用 (created_at,id) 小于游标元组，ORDER BY 两列同向，建立 tenant_id、created_at DESC、id DESC 的复合索引。

若排序含 nullable 字段，游标需加入什么值？要跨多页保持同一快照时，成本和连接占用是什么？

难，35 分钟；需覆盖相同时间戳和并发插入。

<!-- Question record (index metadata)
- **题目契约：**实现 SQL 查询 fetchOrders(tenantId, beforeCreatedAt, beforeId, limit)，按 created_at DESC、id DESC 返回下一页及下一游标。
- **约束与不变量：**id 作为唯一 tie-breaker；游标条件必须与排序方向一致；limit 限定在 1 到 100；不能使用 OFFSET 作为深页定位。
- **用例 A：**行集为 (id=9,created_at=12:00)、(id=7,created_at=12:00)、(id=5,created_at=11:00)，第一页 limit=1 返回 id=9、cursor=(12:00,9)；第二页返回 id=7、cursor=(12:00,7)，不漏行。
- **用例 B：**第一页返回 cursor=(12:00,9) 后插入 (id=11,created_at=13:00) 与 (id=4,created_at=10:00)，第二页不返回新 id=11，但返回更旧的 id=4；已返回的 id=9 不重复。
- **实现提示：**谓词使用 (created_at,id) 小于游标元组，ORDER BY 两列同向，建立 tenant_id、created_at DESC、id DESC 的复合索引。
- **进阶追问：**若排序含 nullable 字段，游标需加入什么值？要跨多页保持同一快照时，成本和连接占用是什么？
- **难度 / 建议时长：**难，35 分钟；需覆盖相同时间戳和并发插入。
- **依据与状态：**作者原创派生练习，未实现/未实跑；排序与 LIMIT 语义见 [PostgreSQL SELECT](handwritten-practice-sources.md#s15)。
-->

### H181. 复合索引列顺序判定

给定查询 SELECT id, created_at FROM orders WHERE tenant_id=? AND status=? ORDER BY created_at DESC LIMIT 30，设计一条候选索引并写出适用与不适用场景。

索引须服务过滤与排序，不可声称索引保证唯一性或替代约束；选择列顺序要说明前缀谓词和数据分布假设。

- 索引候选 (tenant_id,status,created_at DESC) 能在相等 tenant/status 过滤后按时间取前 30 条；给出 EXPLAIN 期望节点而非固定成本数字。
- 若查询只按 tenant_id 过滤并需全局 created_at 排序，该索引中间 status 列会影响顺序利用；指出可能需要另一索引或排序。

对照实际谓词、ORDER BY、LIMIT 与选择性；考虑索引写放大和冷热状态分布，要求用 ANALYZE 后计划验证。

高基数 status 与低基数 status 对列顺序的影响？为什么 planner 可能选择顺序扫描而不是索引？

难，30 分钟；评分看证据链而非唯一答案。

<!-- Question record (index metadata)
- **题目契约：**给定查询 SELECT id, created_at FROM orders WHERE tenant_id=? AND status=? ORDER BY created_at DESC LIMIT 30，设计一条候选索引并写出适用与不适用场景。
- **约束与不变量：**索引须服务过滤与排序，不可声称索引保证唯一性或替代约束；选择列顺序要说明前缀谓词和数据分布假设。
- **用例 A：**索引候选 (tenant_id,status,created_at DESC) 能在相等 tenant/status 过滤后按时间取前 30 条；给出 EXPLAIN 期望节点而非固定成本数字。
- **用例 B：**若查询只按 tenant_id 过滤并需全局 created_at 排序，该索引中间 status 列会影响顺序利用；指出可能需要另一索引或排序。
- **实现提示：**对照实际谓词、ORDER BY、LIMIT 与选择性；考虑索引写放大和冷热状态分布，要求用 ANALYZE 后计划验证。
- **进阶追问：**高基数 status 与低基数 status 对列顺序的影响？为什么 planner 可能选择顺序扫描而不是索引？
- **难度 / 建议时长：**难，30 分钟；评分看证据链而非唯一答案。
- **依据与状态：**作者原创派生练习，未实现/未实跑；查询与排序机制参考 [PostgreSQL SELECT](handwritten-practice-sources.md#s15)。
-->

### H182. 覆盖索引与可见性边界

为查询 SELECT id, total FROM invoices WHERE tenant_id=? AND state='open' ORDER BY created_at DESC LIMIT 20 写出部分覆盖索引候选，并解释是否可能 index-only scan。

INCLUDE 列帮助覆盖返回列但不参与排序或搜索；MVCC 可见性仍可能要求访问 heap；部分谓词只适用于满足 predicate 的查询。

- 建立以 tenant_id、created_at DESC 为键，INCLUDE id,total 且 WHERE state='open' 的索引，查询列与谓词匹配时可考虑覆盖路径。
- 同一查询刚大量更新或 vacuum 尚未推进可见性信息时，计划可能仍访问 heap；不得以“有覆盖索引”断言每次都是 index-only。

区分 key columns、included columns 和 partial predicate；通过 EXPLAIN (ANALYZE, BUFFERS) 看 Heap Fetches 与读块数。

高频更新的 INCLUDE 列会造成什么写放大？索引膨胀和 vacuum 的维护成本如何衡量？

难，35 分钟；要求讲清索引结构与 MVCC 可见性。

<!-- Question record (index metadata)
- **题目契约：**为查询 SELECT id, total FROM invoices WHERE tenant_id=? AND state='open' ORDER BY created_at DESC LIMIT 20 写出部分覆盖索引候选，并解释是否可能 index-only scan。
- **约束与不变量：**INCLUDE 列帮助覆盖返回列但不参与排序或搜索；MVCC 可见性仍可能要求访问 heap；部分谓词只适用于满足 predicate 的查询。
- **用例 A：**建立以 tenant_id、created_at DESC 为键，INCLUDE id,total 且 WHERE state='open' 的索引，查询列与谓词匹配时可考虑覆盖路径。
- **用例 B：**同一查询刚大量更新或 vacuum 尚未推进可见性信息时，计划可能仍访问 heap；不得以“有覆盖索引”断言每次都是 index-only。
- **实现提示：**区分 key columns、included columns 和 partial predicate；通过 EXPLAIN (ANALYZE, BUFFERS) 看 Heap Fetches 与读块数。
- **进阶追问：**高频更新的 INCLUDE 列会造成什么写放大？索引膨胀和 vacuum 的维护成本如何衡量？
- **难度 / 建议时长：**难，35 分钟；要求讲清索引结构与 MVCC 可见性。
- **依据与状态：**作者原创派生练习，未实现/未实跑；SELECT 路径参考 [PostgreSQL SELECT](handwritten-practice-sources.md#s15)，MVCC 参考 [Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H183. 部分索引与稳定谓词

为只读取未归档文档的查询设计 partial index，给出索引谓词、目标 SELECT 和可证明不匹配的查询。

查询条件必须蕴含索引谓词，planner 才可安全使用；谓词不能依赖随时间变化的表达式；索引遗漏行不代表这些行不存在。

- 索引 WHERE archived_at IS NULL，查询同条件且按 tenant_id、updated_at 取页，可将活跃文档索引缩小。
- 查询条件使用 archived_at < now()-interval '30 days' 与固定谓词不一致，说明不能假设 planner 使用部分索引。

将业务状态定义为稳定列条件，避免在谓词中放 now()；使用 EXPLAIN 验证多个参数值下的计划。

prepared statement 的 generic plan 对参数化谓词有何影响？状态转换会如何改变索引维护与表膨胀？

中，30 分钟；给出可复现的命中与未命中查询。

<!-- Question record (index metadata)
- **题目契约：**为只读取未归档文档的查询设计 partial index，给出索引谓词、目标 SELECT 和可证明不匹配的查询。
- **约束与不变量：**查询条件必须蕴含索引谓词，planner 才可安全使用；谓词不能依赖随时间变化的表达式；索引遗漏行不代表这些行不存在。
- **用例 A：**索引 WHERE archived_at IS NULL，查询同条件且按 tenant_id、updated_at 取页，可将活跃文档索引缩小。
- **用例 B：**查询条件使用 archived_at < now()-interval '30 days' 与固定谓词不一致，说明不能假设 planner 使用部分索引。
- **实现提示：**将业务状态定义为稳定列条件，避免在谓词中放 now()；使用 EXPLAIN 验证多个参数值下的计划。
- **进阶追问：**prepared statement 的 generic plan 对参数化谓词有何影响？状态转换会如何改变索引维护与表膨胀？
- **难度 / 建议时长：**中，30 分钟；给出可复现的命中与未命中查询。
- **依据与状态：**作者原创派生练习，未实现/未实跑；查询规划参考 [PostgreSQL SELECT](handwritten-practice-sources.md#s15)。
-->

### H184. NULL 排序与游标完整性

实现 keyset SQL fetchTasks(priority, createdAt, id, limit)，按 nullable due_at ASC NULLS LAST、id ASC 分页并返回完整游标。

游标比较必须复刻 NULLS LAST 顺序；NULL 与任意时间戳不能用普通小于比较直接覆盖；id 保证同值稳定顺序。

- 行集为 (id=1,due=2026-01-01)、(id=2,due=NULL)、(id=3,due=NULL)，第一页 cursor=(2026-01-01,1)，下一页依序返回 id=2、id=3，cursor 分别为 (NULL,2)、(NULL,3)。
- 游标已处于 NULL 组时，仅用 due_at > NULL 会得到 UNKNOWN；SQL 必须显式分支判断 NULL 组。

可将排序拆为 null-rank、due_at、id 三元组，用与 ORDER BY 相同的键组成谓词和索引。

如何让游标可签名防客户端篡改？排序列被更新后，keyset 分页仍有哪些一致性限制？

难，35 分钟；优先验收 NULL 组转换。

<!-- Question record (index metadata)
- **题目契约：**实现 keyset SQL fetchTasks(priority, createdAt, id, limit)，按 nullable due_at ASC NULLS LAST、id ASC 分页并返回完整游标。
- **约束与不变量：**游标比较必须复刻 NULLS LAST 顺序；NULL 与任意时间戳不能用普通小于比较直接覆盖；id 保证同值稳定顺序。
- **用例 A：**行集为 (id=1,due=2026-01-01)、(id=2,due=NULL)、(id=3,due=NULL)，第一页 cursor=(2026-01-01,1)，下一页依序返回 id=2、id=3，cursor 分别为 (NULL,2)、(NULL,3)。
- **用例 B：**游标已处于 NULL 组时，仅用 due_at > NULL 会得到 UNKNOWN；SQL 必须显式分支判断 NULL 组。
- **实现提示：**可将排序拆为 null-rank、due_at、id 三元组，用与 ORDER BY 相同的键组成谓词和索引。
- **进阶追问：**如何让游标可签名防客户端篡改？排序列被更新后，keyset 分页仍有哪些一致性限制？
- **难度 / 建议时长：**难，35 分钟；优先验收 NULL 组转换。
- **依据与状态：**作者原创派生练习，未实现/未实跑；SELECT 排序与分页见 [PostgreSQL SELECT](handwritten-practice-sources.md#s15)。
-->

### H185. 统计分页与 COUNT 一致性合同

实现 listAndCount(tenantId, filters, limit, cursor)，返回 items 与 total，并声明 total 是同一语句快照、同一事务快照还是独立近似值。

不能因计数查询和列表查询分别执行而暗示它们必然看到相同行集；count 必须复用相同授权与过滤条件；空页仍返回合同规定的 total。

- 单语句窗口计数或同一 repeatable-read 事务中返回列表和总数，两者在测试快照里匹配。
- READ COMMITTED 下两次语句之间插入一行，list 长度与 count 可不同；接口标注为弱一致且测试可复现差异。

评估窗口 COUNT(*) OVER()、同事务两条 SQL 或独立近似统计；比较空页无法携带窗口总数时的备用查询策略。

全表精确 count 为何会随数据量变贵？产品是否真的需要精确总页数？

难，35 分钟；判断一致性承诺与成本。

<!-- Question record (index metadata)
- **题目契约：**实现 listAndCount(tenantId, filters, limit, cursor)，返回 items 与 total，并声明 total 是同一语句快照、同一事务快照还是独立近似值。
- **约束与不变量：**不能因计数查询和列表查询分别执行而暗示它们必然看到相同行集；count 必须复用相同授权与过滤条件；空页仍返回合同规定的 total。
- **用例 A：**单语句窗口计数或同一 repeatable-read 事务中返回列表和总数，两者在测试快照里匹配。
- **用例 B：**READ COMMITTED 下两次语句之间插入一行，list 长度与 count 可不同；接口标注为弱一致且测试可复现差异。
- **实现提示：**评估窗口 COUNT(*) OVER()、同事务两条 SQL 或独立近似统计；比较空页无法携带窗口总数时的备用查询策略。
- **进阶追问：**全表精确 count 为何会随数据量变贵？产品是否真的需要精确总页数？
- **难度 / 建议时长：**难，35 分钟；判断一致性承诺与成本。
- **依据与状态：**作者原创派生练习，未实现/未实跑；快照规则参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14) 与 [SELECT](handwritten-practice-sources.md#s15)。
-->

### H186. 可判定的索引计划验收器

实现 explainContract(sql, parameters, expected) 测试辅助器，解析 EXPLAIN JSON 并验证节点种类、扫描关系和缓冲区阈值。

不得锁定易波动的 cost 数值或强制 planner 在所有数据规模选同一路径；固定 PostgreSQL 版本、数据分布和统计信息。

- events 每行约 128 bytes，加载 1,000,000 行且 ANALYZE 后目标 tenant 恰有 1,000 行；EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) 必须含目标索引扫描且 shared hit+read blocks ≤ 80。
- tenant 覆盖 80% 行时顺序扫描可合理胜出；验收器不得把它误报为索引失效。

EXPLAIN ANALYZE 会执行 SQL，读写副作用需在回滚事务或隔离数据集内；检查实际行数与估计偏差。

统计信息陈旧如何造成计划漂移？如何在 CI 里减少不同机器上并行度差异造成的脆弱断言？

挑战，45 分钟；强调可重复实验条件与宽容断言。

<!-- Question record (index metadata)
- **题目契约：**实现 explainContract(sql, parameters, expected) 测试辅助器，解析 EXPLAIN JSON 并验证节点种类、扫描关系和缓冲区阈值。
- **约束与不变量：**不得锁定易波动的 cost 数值或强制 planner 在所有数据规模选同一路径；固定 PostgreSQL 版本、数据分布和统计信息。
- **用例 A：**events 每行约 128 bytes，加载 1,000,000 行且 ANALYZE 后目标 tenant 恰有 1,000 行；EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) 必须含目标索引扫描且 shared hit+read blocks ≤ 80。
- **用例 B：**tenant 覆盖 80% 行时顺序扫描可合理胜出；验收器不得把它误报为索引失效。
- **实现提示：**EXPLAIN ANALYZE 会执行 SQL，读写副作用需在回滚事务或隔离数据集内；检查实际行数与估计偏差。
- **进阶追问：**统计信息陈旧如何造成计划漂移？如何在 CI 里减少不同机器上并行度差异造成的脆弱断言？
- **难度 / 建议时长：**挑战，45 分钟；强调可重复实验条件与宽容断言。
- **依据与状态：**作者原创派生练习，未实现/未实跑；查询语义见 [PostgreSQL SELECT](handwritten-practice-sources.md#s15)。
-->

## 并发更新与隔离级别

### H187. 条件 UPDATE 的库存扣减

实现 reserveInventory(sku, quantity, orderId)，用 SQL 原子扣减库存并返回成功/库存不足；库存记录含 available 与 version。

available 不得为负；不得先读进程内数值再无条件写回；数量必须为正；同一 orderId 是否幂等须由唯一约束或订单状态定义。

- available=1 时两个事务各扣 1，最多一个 UPDATE 返回行，最终 available=0。
- quantity=0 或负数被 CHECK 或参数校验拒绝；失败事务不插入确认订单，库存保持原值。

单条条件 UPDATE 仅在 available 不小于 quantity 时扣减并 RETURNING 库存行；把扣减和订单行置于同一事务，影响行数为 0 表示库存不足。

促销配额是单库存行热点时如何拆分而不超卖？数据库连接在业务处理时被断开，客户端如何判断提交结果未知？

难，35 分钟；验收两个并发会话及约束拒绝。

<!-- Question record (index metadata)
- **题目契约：**实现 reserveInventory(sku, quantity, orderId)，用 SQL 原子扣减库存并返回成功/库存不足；库存记录含 available 与 version。
- **约束与不变量：**available 不得为负；不得先读进程内数值再无条件写回；数量必须为正；同一 orderId 是否幂等须由唯一约束或订单状态定义。
- **用例 A：**available=1 时两个事务各扣 1，最多一个 UPDATE 返回行，最终 available=0。
- **用例 B：**quantity=0 或负数被 CHECK 或参数校验拒绝；失败事务不插入确认订单，库存保持原值。
- **实现提示：**单条条件 UPDATE 仅在 available 不小于 quantity 时扣减并 RETURNING 库存行；把扣减和订单行置于同一事务，影响行数为 0 表示库存不足。
- **进阶追问：**促销配额是单库存行热点时如何拆分而不超卖？数据库连接在业务处理时被断开，客户端如何判断提交结果未知？
- **难度 / 建议时长：**难，35 分钟；验收两个并发会话及约束拒绝。
- **依据与状态：**作者原创派生练习，未实现/未实跑；并发事务行为参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H188. 可重复读下的快照更新冲突

给出两个会话对同一账户行的读写脚本，解释 PostgreSQL REPEATABLE READ 下各条语句成功、等待或报错，并写出应用重启事务策略。

同一事务快照不会随每条 SELECT 前进；并发更新已被本事务尝试修改的行可能产生 serialization failure；不可只重试失败 SQL。

- T1 在 REPEATABLE READ 开始并读 balance=100；T2 将 balance 改为 90 后提交；T1 执行 balance=80 的 UPDATE 得 SQLSTATE 40001 并回滚，不可静默覆盖。
- T1 只读后 T2 更新提交，T1 再读仍按其快照可见旧版本；提交结果与读结果分别解释。

逐语句编号两个 session 的 BEGIN/SELECT/UPDATE/COMMIT；记录 SQLSTATE 40001，并把重试边界设为完整事务函数。

READ COMMITTED 与 REPEATABLE READ 的语句快照差异？副作用已发邮件时为何不能盲目重放事务？

难，40 分钟；要基于具体时序而非背隔离级别名字。

<!-- Question record (index metadata)
- **题目契约：**给出两个会话对同一账户行的读写脚本，解释 PostgreSQL REPEATABLE READ 下各条语句成功、等待或报错，并写出应用重启事务策略。
- **约束与不变量：**同一事务快照不会随每条 SELECT 前进；并发更新已被本事务尝试修改的行可能产生 serialization failure；不可只重试失败 SQL。
- **用例 A：**T1 在 REPEATABLE READ 开始并读 balance=100；T2 将 balance 改为 90 后提交；T1 执行 balance=80 的 UPDATE 得 SQLSTATE 40001 并回滚，不可静默覆盖。
- **用例 B：**T1 只读后 T2 更新提交，T1 再读仍按其快照可见旧版本；提交结果与读结果分别解释。
- **实现提示：**逐语句编号两个 session 的 BEGIN/SELECT/UPDATE/COMMIT；记录 SQLSTATE 40001，并把重试边界设为完整事务函数。
- **进阶追问：**READ COMMITTED 与 REPEATABLE READ 的语句快照差异？副作用已发邮件时为何不能盲目重放事务？
- **难度 / 建议时长：**难，40 分钟；要基于具体时序而非背隔离级别名字。
- **依据与状态：**作者原创派生练习，未实现/未实跑；隔离语义参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H189. 写偏差与约束建模

设计值班表 SQL：任一日期至少一名医生值班，两位医生初始均在岗；给出并发取消两人的事务脚本以及安全修正。

每天至少一名医生 on_call=true；本题固定用 SERIALIZABLE，不提供替代方案；SQLSTATE 40001 时从 BEGIN 重跑整段事务。

- 初始 A=true、B=true；T1 与 T2 均读到在岗数 2 后各自关闭一人，T1 COMMIT 成功，T2 COMMIT 得 40001；重跑 T2 后读取在岗数 1 并拒绝关闭，最终恰有一人值班。
- T1 独自关闭 A 后提交，再启动 T2；T2 读取在岗数 1 并拒绝关闭 B，数据库仍为 A=false、B=true。

把“计数并决定是否 UPDATE”留在一个 SERIALIZABLE 事务函数中；捕获 40001 后新建事务重跑，禁止只重试失败语句。

用数据库触发器能否简单解决并发跨行约束？高并发下汇总锁行成为热点时如何权衡？

挑战，45 分钟；必须写出具体双会话时序。

<!-- Question record (index metadata)
- **题目契约：**设计值班表 SQL：任一日期至少一名医生值班，两位医生初始均在岗；给出并发取消两人的事务脚本以及安全修正。
- **约束与不变量：**每天至少一名医生 on_call=true；本题固定用 SERIALIZABLE，不提供替代方案；SQLSTATE 40001 时从 BEGIN 重跑整段事务。
- **用例 A：**初始 A=true、B=true；T1 与 T2 均读到在岗数 2 后各自关闭一人，T1 COMMIT 成功，T2 COMMIT 得 40001；重跑 T2 后读取在岗数 1 并拒绝关闭，最终恰有一人值班。
- **用例 B：**T1 独自关闭 A 后提交，再启动 T2；T2 读取在岗数 1 并拒绝关闭 B，数据库仍为 A=false、B=true。
- **实现提示：**把“计数并决定是否 UPDATE”留在一个 SERIALIZABLE 事务函数中；捕获 40001 后新建事务重跑，禁止只重试失败语句。
- **进阶追问：**用数据库触发器能否简单解决并发跨行约束？高并发下汇总锁行成为热点时如何权衡？
- **难度 / 建议时长：**挑战，45 分钟；必须写出具体双会话时序。
- **依据与状态：**作者原创派生练习，未实现/未实跑；隔离异常参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H190. SERIALIZABLE 事务重试包装

实现 withSerializableRetry(pool, work, maxAttempts)，每次 attempt 新建事务并在 SQLSTATE 40001 时重跑完整 work，返回成功结果或最后错误。

事务内不做邮件、HTTP 等不可回滚副作用；连接归还前确保 COMMIT/ROLLBACK；只重试已识别可重试错误，不把约束冲突全部吞掉。

- 第一次 COMMIT 得 40001，第二次在新事务成功，work 调用两次且外部副作用计数为 0。
- work 抛唯一约束错误，立即回滚并拒绝，不做第二次尝试；达到上限后抛最后一个序列化错误。

attempt 包住 BEGIN 至 COMMIT 的全生命周期；每轮租借连接并 finally 释放；若使用退避，时间由注入函数控制。

连接在 COMMIT 返回前断开时结果可能未知，和明确 40001 有何区别？幂等键如何帮助安全恢复？

难，40 分钟；fake pool 应观测事务边界与连接归还。

<!-- Question record (index metadata)
- **题目契约：**实现 withSerializableRetry(pool, work, maxAttempts)，每次 attempt 新建事务并在 SQLSTATE 40001 时重跑完整 work，返回成功结果或最后错误。
- **约束与不变量：**事务内不做邮件、HTTP 等不可回滚副作用；连接归还前确保 COMMIT/ROLLBACK；只重试已识别可重试错误，不把约束冲突全部吞掉。
- **用例 A：**第一次 COMMIT 得 40001，第二次在新事务成功，work 调用两次且外部副作用计数为 0。
- **用例 B：**work 抛唯一约束错误，立即回滚并拒绝，不做第二次尝试；达到上限后抛最后一个序列化错误。
- **实现提示：**attempt 包住 BEGIN 至 COMMIT 的全生命周期；每轮租借连接并 finally 释放；若使用退避，时间由注入函数控制。
- **进阶追问：**连接在 COMMIT 返回前断开时结果可能未知，和明确 40001 有何区别？幂等键如何帮助安全恢复？
- **难度 / 建议时长：**难，40 分钟；fake pool 应观测事务边界与连接归还。
- **依据与状态：**作者原创派生练习，未实现/未实跑；40001 与串行化机制参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H191. 固定顺序行锁与死锁定位

实现 transfer(fromId, toId, amount)，在同一事务锁定两账户、检查余额并更新；给出所有转账采用的统一锁顺序。

amount>0；账户余额不可为负；两个转账请求锁账户顺序一致；死锁或锁超时必须回滚整笔转账。

- T1 转 A→B、T2 转 B→A，若按 account id 升序锁，双方不形成 A/B 环路，最终账面总额守恒。
- T1 持有 A、T2 持有 B 的对照时序展示死锁 SQLSTATE 40P01；受害事务回滚后无单边扣款。

按排序后的账户 ID 执行 SELECT FOR UPDATE 锁定两行，再根据转账方向计算借贷；检查更新行数和余额约束。

锁等待超时和死锁检测分别怎样触发？事务持锁期间调用远程风控服务会制造什么问题？

难，35 分钟；两会话可重现实验。

<!-- Question record (index metadata)
- **题目契约：**实现 transfer(fromId, toId, amount)，在同一事务锁定两账户、检查余额并更新；给出所有转账采用的统一锁顺序。
- **约束与不变量：**amount>0；账户余额不可为负；两个转账请求锁账户顺序一致；死锁或锁超时必须回滚整笔转账。
- **用例 A：**T1 转 A→B、T2 转 B→A，若按 account id 升序锁，双方不形成 A/B 环路，最终账面总额守恒。
- **用例 B：**T1 持有 A、T2 持有 B 的对照时序展示死锁 SQLSTATE 40P01；受害事务回滚后无单边扣款。
- **实现提示：**按排序后的账户 ID 执行 SELECT FOR UPDATE 锁定两行，再根据转账方向计算借贷；检查更新行数和余额约束。
- **进阶追问：**锁等待超时和死锁检测分别怎样触发？事务持锁期间调用远程风控服务会制造什么问题？
- **难度 / 建议时长：**难，35 分钟；两会话可重现实验。
- **依据与状态：**作者原创派生练习，未实现/未实跑；行锁与隔离参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H192. SKIP LOCKED 数据库任务领取

实现 claimJobs(workerId, batchSize, leaseUntil)，在一个短事务内选择未领取或租约到期任务、锁定并写入租约，再返回任务 ID。

并发 worker 不领取同一时刻的同一行；claim 查询需有稳定排序和上限；业务执行在提交后发生，不能长时间持有行锁。

- worker A 锁住首两条，worker B 使用 SKIP LOCKED 领取接下来的两条；两者 ID 集不交叉。
- worker 崩溃且租约过期，后续 worker 能再次领取；旧 worker 仍运行时必须靠 fencing token 防止过期持有者写入。

事务内按 created_at 顺序选未领取行并使用 FOR UPDATE SKIP LOCKED，再更新 owner/lease 并 RETURNING 被领取行；为状态与 lease_until 设计索引并迅速提交。

租约延长与任务完成竞态如何判定？严格 FIFO 与跳过锁定的吞吐之间有什么冲突？

难，40 分钟；需结合事务锁与租约过期用例。

<!-- Question record (index metadata)
- **题目契约：**实现 claimJobs(workerId, batchSize, leaseUntil)，在一个短事务内选择未领取或租约到期任务、锁定并写入租约，再返回任务 ID。
- **约束与不变量：**并发 worker 不领取同一时刻的同一行；claim 查询需有稳定排序和上限；业务执行在提交后发生，不能长时间持有行锁。
- **用例 A：**worker A 锁住首两条，worker B 使用 SKIP LOCKED 领取接下来的两条；两者 ID 集不交叉。
- **用例 B：**worker 崩溃且租约过期，后续 worker 能再次领取；旧 worker 仍运行时必须靠 fencing token 防止过期持有者写入。
- **实现提示：**事务内按 created_at 顺序选未领取行并使用 FOR UPDATE SKIP LOCKED，再更新 owner/lease 并 RETURNING 被领取行；为状态与 lease_until 设计索引并迅速提交。
- **进阶追问：**租约延长与任务完成竞态如何判定？严格 FIFO 与跳过锁定的吞吐之间有什么冲突？
- **难度 / 建议时长：**难，40 分钟；需结合事务锁与租约过期用例。
- **依据与状态：**作者原创派生练习，未实现/未实跑；SELECT 锁子句参考 [PostgreSQL SELECT](handwritten-practice-sources.md#s15)。
-->

### H193. 乐观锁 SQL 版本更新

实现 updateProfile(id, expectedVersion, patch)，单条 SQL 仅在版本匹配时更新允许字段并 version+1，返回成功实体或冲突。

未匹配不得改任何列；不能把完整客户端对象覆盖数据库；字段白名单限定 patch；不存在与版本冲突应可区分。

- 当前 version=4，expectedVersion=4 返回 version=5 和更新字段；同一旧版本的第二个调用影响 0 行。
- patch 含 role/admin 等不可写字段时请求拒绝；id 不存在返回 not-found，不能模糊归为版本冲突。

UPDATE 同时限定 id 与 expectedVersion，并用 RETURNING 读回更新行；字段白名单生成参数化 SQL，若无返回行再查询区分缺行与版本冲突。

HTTP ETag/If-Match 可怎样表达版本？数据库更新成功但客户端响应丢失，重发请求如何识别？

中，30 分钟；需验证冲突不改变列值。

<!-- Question record (index metadata)
- **题目契约：**实现 updateProfile(id, expectedVersion, patch)，单条 SQL 仅在版本匹配时更新允许字段并 version+1，返回成功实体或冲突。
- **约束与不变量：**未匹配不得改任何列；不能把完整客户端对象覆盖数据库；字段白名单限定 patch；不存在与版本冲突应可区分。
- **用例 A：**当前 version=4，expectedVersion=4 返回 version=5 和更新字段；同一旧版本的第二个调用影响 0 行。
- **用例 B：**patch 含 role/admin 等不可写字段时请求拒绝；id 不存在返回 not-found，不能模糊归为版本冲突。
- **实现提示：**UPDATE 同时限定 id 与 expectedVersion，并用 RETURNING 读回更新行；字段白名单生成参数化 SQL，若无返回行再查询区分缺行与版本冲突。
- **进阶追问：**HTTP ETag/If-Match 可怎样表达版本？数据库更新成功但客户端响应丢失，重发请求如何识别？
- **难度 / 建议时长：**中，30 分钟；需验证冲突不改变列值。
- **依据与状态：**作者原创派生练习，未实现/未实跑；更新可见性参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H194. UPSERT 唯一冲突裁决

实现 recordEvent(tenantId, externalId, payload)，依据唯一键 (tenant_id, external_id) 插入新事件或返回已存在行，不重复产生副作用。

唯一约束必须由数据库承担；冲突时具体选择 DO NOTHING 还是更新需合同规定；并发插入只能有一个逻辑事件。

- 两个事务同时插入同键，最终只有一行；调用方恰有一方标记 newlyCreated=true。
- 同键但 payload 不同，合同选择返回冲突且不覆盖已存数据；数据库事务结束后才触发下游副作用。

使用 ON CONFLICT 指定唯一约束；必要时 CTE RETURNING 区分新建与已存在；避免先 SELECT 再 INSERT 的竞态。

READ COMMITTED 下冲突行可见性查询如何写？更新式 upsert 的触发器副作用会发生几次？

难，35 分钟；测试并发双插和 payload 冲突。

<!-- Question record (index metadata)
- **题目契约：**实现 recordEvent(tenantId, externalId, payload)，依据唯一键 (tenant_id, external_id) 插入新事件或返回已存在行，不重复产生副作用。
- **约束与不变量：**唯一约束必须由数据库承担；冲突时具体选择 DO NOTHING 还是更新需合同规定；并发插入只能有一个逻辑事件。
- **用例 A：**两个事务同时插入同键，最终只有一行；调用方恰有一方标记 newlyCreated=true。
- **用例 B：**同键但 payload 不同，合同选择返回冲突且不覆盖已存数据；数据库事务结束后才触发下游副作用。
- **实现提示：**使用 ON CONFLICT 指定唯一约束；必要时 CTE RETURNING 区分新建与已存在；避免先 SELECT 再 INSERT 的竞态。
- **进阶追问：**READ COMMITTED 下冲突行可见性查询如何写？更新式 upsert 的触发器副作用会发生几次？
- **难度 / 建议时长：**难，35 分钟；测试并发双插和 payload 冲突。
- **依据与状态：**作者原创派生练习，未实现/未实跑；冲突写入与查询语义参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H195. 部分唯一索引的活跃记录约束

设计 SQL 使每个 user 同时最多有一个 active subscription，历史 canceled 行可以保留；给出 insert/activate 操作。

并发激活时必须由唯一约束裁决；应用层先查再写不够；active 定义要与索引谓词完全一致。

- 同一 user 插入两条 active，第二条得到唯一冲突；不同 user 可各自存在 active。
- 先将旧订阅更新为 canceled 再新增 active 成功；历史记录仍可查，状态不是物理删除。

建立 user_id WHERE state='active' 的 partial unique index；对状态转换捕获指定唯一约束名。

NULL 状态能否绕开唯一规则？迁移存量重复数据时如何先诊断与修复？

中，30 分钟；必须展示数据库端并发冲突。

<!-- Question record (index metadata)
- **题目契约：**设计 SQL 使每个 user 同时最多有一个 active subscription，历史 canceled 行可以保留；给出 insert/activate 操作。
- **约束与不变量：**并发激活时必须由唯一约束裁决；应用层先查再写不够；active 定义要与索引谓词完全一致。
- **用例 A：**同一 user 插入两条 active，第二条得到唯一冲突；不同 user 可各自存在 active。
- **用例 B：**先将旧订阅更新为 canceled 再新增 active 成功；历史记录仍可查，状态不是物理删除。
- **实现提示：**建立 user_id WHERE state='active' 的 partial unique index；对状态转换捕获指定唯一约束名。
- **进阶追问：**NULL 状态能否绕开唯一规则？迁移存量重复数据时如何先诊断与修复？
- **难度 / 建议时长：**中，30 分钟；必须展示数据库端并发冲突。
- **依据与状态：**作者原创派生练习，未实现/未实跑；查询谓词和索引使用参考 [PostgreSQL SELECT](handwritten-practice-sources.md#s15)。
-->

### H196. 数据库约束与多租户复合键

设计 tenants、projects、members 三表，使 project 只能被本租户成员引用；写插入和授权查询 SQL。

外键应包含 tenant_id 与 project_id 复合关联；所有读写都带 tenant 条件；仅应用 WHERE 过滤不构成参照完整性。

- tenant A 的 member 尝试引用 tenant B 的 project，复合外键拒绝，数据库状态不变。
- 同 project_id 在不同 tenant 可合法存在时，单列主键不足，测试需证明复合主键语义。

明确主键、复合外键、唯一约束和删除行为；查询参数 tenantId 来自已验证的认证上下文。

Row-Level Security 与显式 tenant predicate 如何组合？连接池复用会怎样影响 session-level tenant 设置？

难，35 分钟；验收跨租户引用被数据库拒绝。

<!-- Question record (index metadata)
- **题目契约：**设计 tenants、projects、members 三表，使 project 只能被本租户成员引用；写插入和授权查询 SQL。
- **约束与不变量：**外键应包含 tenant_id 与 project_id 复合关联；所有读写都带 tenant 条件；仅应用 WHERE 过滤不构成参照完整性。
- **用例 A：**tenant A 的 member 尝试引用 tenant B 的 project，复合外键拒绝，数据库状态不变。
- **用例 B：**同 project_id 在不同 tenant 可合法存在时，单列主键不足，测试需证明复合主键语义。
- **实现提示：**明确主键、复合外键、唯一约束和删除行为；查询参数 tenantId 来自已验证的认证上下文。
- **进阶追问：**Row-Level Security 与显式 tenant predicate 如何组合？连接池复用会怎样影响 session-level tenant 设置？
- **难度 / 建议时长：**难，35 分钟；验收跨租户引用被数据库拒绝。
- **依据与状态：**作者原创派生练习，未实现/未实跑；事务一致性机制参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H197. DEFERRABLE 唯一约束下的排序号交换

表 entries(id, rank) 有 DEFERRABLE UNIQUE(rank)；实现 swapRanks(a,b)，在一个事务内交换两行 rank，提交时保持唯一。

约束初始为 DEFERRED，因此事务内可暂时重复 rank，但 COMMIT 时必须唯一；IMMEDIATE 模式下第一条 UPDATE 碰撞即失败并回滚；事务外查询只能看到已提交唯一状态。

- 初始 a.rank=1、b.rank=2；事务设置约束 deferred，先将 a 改为 2、再将 b 改为 1，提交后两行分别为 2、1。
- 同初始数据但设约束 immediate，首条 UPDATE a.rank=2 报 unique_violation，ROLLBACK 后仍为 a=1、b=2。

显式 SET CONSTRAINTS entries_rank_key DEFERRED/IMMEDIATE；读取回滚后的行验证原状，约束定义需 DEFERRABLE INITIALLY IMMEDIATE。

可延迟唯一约束为何不能作为 ON CONFLICT arbiter？三行循环换位如何安排临时值与提交约束？

难，35 分钟；验证 DEFERRED 提交和 IMMEDIATE 首条更新两种结果。

<!-- Question record (index metadata)
- **题目契约：**表 entries(id, rank) 有 DEFERRABLE UNIQUE(rank)；实现 swapRanks(a,b)，在一个事务内交换两行 rank，提交时保持唯一。
- **约束与不变量：**约束初始为 DEFERRED，因此事务内可暂时重复 rank，但 COMMIT 时必须唯一；IMMEDIATE 模式下第一条 UPDATE 碰撞即失败并回滚；事务外查询只能看到已提交唯一状态。
- **用例 A：**初始 a.rank=1、b.rank=2；事务设置约束 deferred，先将 a 改为 2、再将 b 改为 1，提交后两行分别为 2、1。
- **用例 B：**同初始数据但设约束 immediate，首条 UPDATE a.rank=2 报 unique_violation，ROLLBACK 后仍为 a=1、b=2。
- **实现提示：**显式 SET CONSTRAINTS entries_rank_key DEFERRED/IMMEDIATE；读取回滚后的行验证原状，约束定义需 DEFERRABLE INITIALLY IMMEDIATE。
- **进阶追问：**可延迟唯一约束为何不能作为 ON CONFLICT arbiter？三行循环换位如何安排临时值与提交约束？
- **难度 / 建议时长：**难，35 分钟；验证 DEFERRED 提交和 IMMEDIATE 首条更新两种结果。
- **依据与状态：**作者原创派生练习，未实现/未实跑；串行化行为参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

## 事务消息、迁移与连接租借

### H198. Transactional outbox 原子写入

实现 createOrderAndOutbox(input)，在同一数据库事务中插订单和 outbox 事件，事务提交后由独立 relay 发送消息。

订单提交意味着 outbox 行也存在，回滚则两者都不存在；relay 可至少一次投递，消费者必须能按 event_id 去重。

- 插订单与 outbox 后 commit，两张表各一行且 event 聚合键指向新订单。
- outbox insert 失败触发 rollback，订单表无新记录；relay 在发出消息后、标记 sent 前崩溃会重发同 event_id。

outbox 状态和 claim lease 存数据库；事务只包 DB 写入，不把远程 broker 调用放进长事务。

严格按 aggregate 排序如何分区和领取？已发送但未标记的重复发送如何由消费者安全处理？

难，40 分钟；验证回滚原子性与重复投递语义。

<!-- Question record (index metadata)
- **题目契约：**实现 createOrderAndOutbox(input)，在同一数据库事务中插订单和 outbox 事件，事务提交后由独立 relay 发送消息。
- **约束与不变量：**订单提交意味着 outbox 行也存在，回滚则两者都不存在；relay 可至少一次投递，消费者必须能按 event_id 去重。
- **用例 A：**插订单与 outbox 后 commit，两张表各一行且 event 聚合键指向新订单。
- **用例 B：**outbox insert 失败触发 rollback，订单表无新记录；relay 在发出消息后、标记 sent 前崩溃会重发同 event_id。
- **实现提示：**outbox 状态和 claim lease 存数据库；事务只包 DB 写入，不把远程 broker 调用放进长事务。
- **进阶追问：**严格按 aggregate 排序如何分区和领取？已发送但未标记的重复发送如何由消费者安全处理？
- **难度 / 建议时长：**难，40 分钟；验证回滚原子性与重复投递语义。
- **依据与状态：**作者原创派生练习，未实现/未实跑；事务机制参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H199. Inbox 去重与业务写同事务

实现 consumeEvent(eventId, handler)，在 inbox 唯一键成功插入与业务修改同一事务内完成；重复 eventId 作为已处理返回。

inbox 标记与业务效果必须原子提交；handler 失败回滚 inbox 行；并发重复事件最多提交一个业务变更。

- 首次 eventId=E 增加余额 5 并写 inbox；第二次相同 E 不再增加余额。
- 业务 update 违反约束时事务回滚，inbox 不留 E；修复后重投可以成功。

靠唯一约束或 ON CONFLICT 争抢事件所有权，再处理业务更新；若占有者需跨事务执行，另设计处理状态租约。

副作用含邮件或 HTTP 时 inbox 仍能提供 exactly-once 吗？如何定义“数据库内效果恰一次”和“投递至少一次”？

难，35 分钟；检查业务行与 inbox 同步回滚。

<!-- Question record (index metadata)
- **题目契约：**实现 consumeEvent(eventId, handler)，在 inbox 唯一键成功插入与业务修改同一事务内完成；重复 eventId 作为已处理返回。
- **约束与不变量：**inbox 标记与业务效果必须原子提交；handler 失败回滚 inbox 行；并发重复事件最多提交一个业务变更。
- **用例 A：**首次 eventId=E 增加余额 5 并写 inbox；第二次相同 E 不再增加余额。
- **用例 B：**业务 update 违反约束时事务回滚，inbox 不留 E；修复后重投可以成功。
- **实现提示：**靠唯一约束或 ON CONFLICT 争抢事件所有权，再处理业务更新；若占有者需跨事务执行，另设计处理状态租约。
- **进阶追问：**副作用含邮件或 HTTP 时 inbox 仍能提供 exactly-once 吗？如何定义“数据库内效果恰一次”和“投递至少一次”？
- **难度 / 建议时长：**难，35 分钟；检查业务行与 inbox 同步回滚。
- **依据与状态：**作者原创派生练习，未实现/未实跑；事务快照参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H200. 可恢复的 expand-contract 字段迁移

为 users.name 拆分 first_name/last_name 并新增 version BIGINT NOT NULL DEFAULT 0，写迁移阶段、双读/双写切换条件及回滚策略。

滚动部署期间旧版本和新版本并存；任一时刻请求读到的数据不丢；最终删除旧列前确认无旧代码读写。

- 旧行 id=7、name='Lin Q'、version=5；回填 worker 读到 version=5 后，新应用先写 first='Mei'、last='Z' 并把 version 改为 6；worker 执行 WHERE id=7 AND version=5 UPDATE 后影响 0 行，新值保持不变。
- 新版本部署失败时回滚应用，旧列 name 仍有 'Lin Q'；在确认所有实例不再读写旧列前不得 DROP name。

回填规则将第一个空格前置为 first_name、余下部分为 last_name，并以 id keyset 分批；UPDATE 谓词含 captured version，成功时 version+1；记录游标使任务可重入。

DDL 锁等待如何控制？两列双写出现不一致时哪一边是权威值，怎样监测？

挑战，45 分钟；提供阶段顺序、回滚点与完成判据。

<!-- Question record (index metadata)
- **题目契约：**为 users.name 拆分 first_name/last_name 并新增 version BIGINT NOT NULL DEFAULT 0，写迁移阶段、双读/双写切换条件及回滚策略。
- **约束与不变量：**滚动部署期间旧版本和新版本并存；任一时刻请求读到的数据不丢；最终删除旧列前确认无旧代码读写。
- **用例 A：**旧行 id=7、name='Lin Q'、version=5；回填 worker 读到 version=5 后，新应用先写 first='Mei'、last='Z' 并把 version 改为 6；worker 执行 WHERE id=7 AND version=5 UPDATE 后影响 0 行，新值保持不变。
- **用例 B：**新版本部署失败时回滚应用，旧列 name 仍有 'Lin Q'；在确认所有实例不再读写旧列前不得 DROP name。
- **实现提示：**回填规则将第一个空格前置为 first_name、余下部分为 last_name，并以 id keyset 分批；UPDATE 谓词含 captured version，成功时 version+1；记录游标使任务可重入。
- **进阶追问：**DDL 锁等待如何控制？两列双写出现不一致时哪一边是权威值，怎样监测？
- **难度 / 建议时长：**挑战，45 分钟；提供阶段顺序、回滚点与完成判据。
- **依据与状态：**作者原创派生练习，未实现/未实跑；迁移涉及的事务行为参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H201. 大表索引迁移与锁风险计划

为 2 亿行 events 增加 (tenant_id, created_at DESC) 索引，提交在线部署计划和验证、失败清理步骤。

生产流量持续读写；计划须区分普通索引创建与 concurrent build 的事务限制、失败残留及资源消耗。

- 部署前确认 PostgreSQL 版本、磁盘余量、长事务与复制延迟；完成后验证索引 valid 和查询计划。
- 并发建索引被取消产生 invalid index 时，不能把它当已可用；修复步骤需可重复并评估删除/重建影响。

用独立迁移步骤执行 CREATE INDEX CONCURRENTLY；监测锁、I/O 和 WAL；不要把该语句塞入不支持它的事务块。

构建期间写入会发生什么？索引成功后 planner 暂不使用，如何区分统计与语义问题？

挑战，45 分钟；答案是发布操作合同，不是纯 SQL 一行。

<!-- Question record (index metadata)
- **题目契约：**为 2 亿行 events 增加 (tenant_id, created_at DESC) 索引，提交在线部署计划和验证、失败清理步骤。
- **约束与不变量：**生产流量持续读写；计划须区分普通索引创建与 concurrent build 的事务限制、失败残留及资源消耗。
- **用例 A：**部署前确认 PostgreSQL 版本、磁盘余量、长事务与复制延迟；完成后验证索引 valid 和查询计划。
- **用例 B：**并发建索引被取消产生 invalid index 时，不能把它当已可用；修复步骤需可重复并评估删除/重建影响。
- **实现提示：**用独立迁移步骤执行 CREATE INDEX CONCURRENTLY；监测锁、I/O 和 WAL；不要把该语句塞入不支持它的事务块。
- **进阶追问：**构建期间写入会发生什么？索引成功后 planner 暂不使用，如何区分统计与语义问题？
- **难度 / 建议时长：**挑战，45 分钟；答案是发布操作合同，不是纯 SQL 一行。
- **依据与状态：**作者原创派生练习，未实现/未实跑；索引查询计划需结合 [PostgreSQL SELECT](handwritten-practice-sources.md#s15) 与版本化运维文档。
-->

### H202. 事务连接亲和性包装器

实现 withTransaction(pool, work)，BEGIN、work 内全部 query、COMMIT/ROLLBACK 始终使用同一个租借连接，并最终归还池。

事务回调中的 query 不得偷偷从 pool 再取连接；异常需 rollback；rollback 自身失败仍要释放连接并保留原始错误因果。

- work 执行两条 SQL，fake pool 观察到它们都在 connection id=3，BEGIN/COMMIT 也在 id=3。
- 第二条 SQL reject 后，同连接执行 ROLLBACK，release 恰一次；若 rollback reject，最终错误同时可追踪两种异常。

向回调注入受限 TransactionClient 而非全局 pool；用 finally 保证 release；禁止在连接已释放后提交。

事务回调意外启动未 await 查询会怎样？如何用类型或运行时状态阻止 commit 后再 query？

难，35 分钟；fake pool 需验证连接 ID 与每次结束路径。

<!-- Question record (index metadata)
- **题目契约：**实现 withTransaction(pool, work)，BEGIN、work 内全部 query、COMMIT/ROLLBACK 始终使用同一个租借连接，并最终归还池。
- **约束与不变量：**事务回调中的 query 不得偷偷从 pool 再取连接；异常需 rollback；rollback 自身失败仍要释放连接并保留原始错误因果。
- **用例 A：**work 执行两条 SQL，fake pool 观察到它们都在 connection id=3，BEGIN/COMMIT 也在 id=3。
- **用例 B：**第二条 SQL reject 后，同连接执行 ROLLBACK，release 恰一次；若 rollback reject，最终错误同时可追踪两种异常。
- **实现提示：**向回调注入受限 TransactionClient 而非全局 pool；用 finally 保证 release；禁止在连接已释放后提交。
- **进阶追问：**事务回调意外启动未 await 查询会怎样？如何用类型或运行时状态阻止 commit 后再 query？
- **难度 / 建议时长：**难，35 分钟；fake pool 需验证连接 ID 与每次结束路径。
- **依据与状态：**作者原创派生练习，未实现/未实跑；事务快照和提交边界参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H203. 连接池排队超时与泄漏诊断

实现 acquireWithDeadline(pool, timeoutMs)，返回租借连接或 PoolAcquireTimeout，并在取消、成功、池关闭时移除排队请求。

排队请求上限和租借数有明确界限；超时后迟到的连接不得被泄漏；连接只能归还一次；关闭时拒绝新借出并唤醒等待者。

- 池大小 1、首请求持有 connection C1，第二请求等待 100ms deadline；首请求在第 40ms 释放 C1，第二请求于第 40ms 获得 C1 且等待队列归零。
- 第二请求先超时、随后首请求释放，连接回到池中而非交给已取消请求；关闭后新请求立即失败。

维护 FIFO waiter 队列和状态；用 finally 清 timer 与取消监听；区分 acquire timeout、query timeout 和连接失效。

池满是慢 SQL、事务泄漏还是突发流量，怎样从 wait duration 与持有时间区分？是否需要拒绝过载而不是加大池？

难，40 分钟；验收等待者、租借和归还计数。

<!-- Question record (index metadata)
- **题目契约：**实现 acquireWithDeadline(pool, timeoutMs)，返回租借连接或 PoolAcquireTimeout，并在取消、成功、池关闭时移除排队请求。
- **约束与不变量：**排队请求上限和租借数有明确界限；超时后迟到的连接不得被泄漏；连接只能归还一次；关闭时拒绝新借出并唤醒等待者。
- **用例 A：**池大小 1、首请求持有 connection C1，第二请求等待 100ms deadline；首请求在第 40ms 释放 C1，第二请求于第 40ms 获得 C1 且等待队列归零。
- **用例 B：**第二请求先超时、随后首请求释放，连接回到池中而非交给已取消请求；关闭后新请求立即失败。
- **实现提示：**维护 FIFO waiter 队列和状态；用 finally 清 timer 与取消监听；区分 acquire timeout、query timeout 和连接失效。
- **进阶追问：**池满是慢 SQL、事务泄漏还是突发流量，怎样从 wait duration 与持有时间区分？是否需要拒绝过载而不是加大池？
- **难度 / 建议时长：**难，40 分钟；验收等待者、租借和归还计数。
- **依据与状态：**作者原创派生练习，未实现/未实跑；池生命周期不是事务隔离保证，事务机制参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

### H204. Savepoint 局部失败与幂等批写

实现 importRows(tx, rows)，整体事务写入最多 100 行；单行可预期唯一冲突时用 savepoint 跳过并报告该行，其他数据库错误整体回滚。

只有指定冲突被局部恢复；每个 savepoint 对应一行并按序释放；异常后连接事务状态恢复，未吞掉连接断开或语法错误。

- 输入 3 行，其中第二行命中指定唯一冲突，最终提交第 1、3 行并报告 skipped=[2]。
- 第三行触发连接中断或非预期约束错误，整个批次回滚，数据库无部分导入，报告失败行号。

使用 SAVEPOINT、ROLLBACK TO SAVEPOINT、RELEASE SAVEPOINT；谨慎依赖驱动对事务 aborted 状态的映射。

每行一个 savepoint 在大批量时有何成本？哪些冲突更适合预先去重或改用 ON CONFLICT？

难，40 分钟；验证局部跳过和整体失败两种结果。

<!-- Question record (index metadata)
- **题目契约：**实现 importRows(tx, rows)，整体事务写入最多 100 行；单行可预期唯一冲突时用 savepoint 跳过并报告该行，其他数据库错误整体回滚。
- **约束与不变量：**只有指定冲突被局部恢复；每个 savepoint 对应一行并按序释放；异常后连接事务状态恢复，未吞掉连接断开或语法错误。
- **用例 A：**输入 3 行，其中第二行命中指定唯一冲突，最终提交第 1、3 行并报告 skipped=[2]。
- **用例 B：**第三行触发连接中断或非预期约束错误，整个批次回滚，数据库无部分导入，报告失败行号。
- **实现提示：**使用 SAVEPOINT、ROLLBACK TO SAVEPOINT、RELEASE SAVEPOINT；谨慎依赖驱动对事务 aborted 状态的映射。
- **进阶追问：**每行一个 savepoint 在大批量时有何成本？哪些冲突更适合预先去重或改用 ON CONFLICT？
- **难度 / 建议时长：**难，40 分钟；验证局部跳过和整体失败两种结果。
- **依据与状态：**作者原创派生练习，未实现/未实跑；事务和错误恢复参考 [PostgreSQL Transaction Isolation](handwritten-practice-sources.md#s14)。
-->

## 错误对比与验收

| 容易写出的方案 | 失效证据 | 修正方式 |
|---|---|---|
| SELECT 库存后在应用里减值 | 两个会话均读 1 并写成功 | 条件 UPDATE、行锁或约束裁决 |
| OFFSET 深页分页 | 深页扫描变多且并发插入造成页漂移 | 复合唯一游标和对应排序 |
| 事务函数里直接调用全局 pool | SQL 跑在不同连接，不属于同一事务 | 注入单一租借的 TransactionClient |
| commit 后立即发消息 | DB 成功但消息丢失的崩溃窗口 | outbox 原子记录加可去重 relay |
| 应用层先查再插 | 并发同时通过检查 | 唯一约束作为最终仲裁 |




## 自测

??? question "1. READ COMMITTED 中两条 SELECT 必须看到同一快照吗？"
    不保证；每条语句可建立自己的快照。要承诺跨语句一致，需要选定事务隔离或单语句合同。

??? question "2. 事务回调中为什么要注入连接而不是 pool？"
    池可能为每条 query 租不同连接，导致语句脱离 BEGIN/COMMIT 所在事务。

??? question "3. outbox 是否提供 broker 端 exactly-once？"
    不提供；它把业务写与待发事件原子化，relay 仍可能重复投递，消费者需幂等去重。

## 深入阅读

- [PostgreSQL 18 Transaction Isolation](handwritten-practice-sources.md#s14)：读各隔离级别的可见性和并发更新说明，能为双会话时序解释结果。
- [PostgreSQL 18 SELECT](handwritten-practice-sources.md#s15)：读 LIMIT/OFFSET、排序和锁子句，能把分页与领取任务写成明确顺序合同。
