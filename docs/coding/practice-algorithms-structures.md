---
title: 前端高阶手写题：算法与数据结构 26 题
description: 面向编辑器、搜索、路由与大型数据视图的高阶手写练习，覆盖编辑距离、有权图、DAG、区间、树遍历、查询索引与可维护数据结构；每题给出函数合同、规模上限、可判定样例、失败边界与追问。
tags: [interview, coding, algorithms, data-structures]
date: 2026-10-12
level: advanced
prerequisites:
  - JavaScript 数组、Map、Set 与递归
  - 时间复杂度、图遍历和基本树结构
runnable: false
verified_at: 2026-10-12
source_commit: 84bf0f53f02065bdcc27cadb30d4c0e1569798d9
---

# 前端高阶手写题：算法与数据结构 26 题

<!-- Solution routes -->
先跟着代码写一遍，可读[Go 数据结构](workshop-go-structures.md)和[窗口与版本比较](autumn-exam-algorithms.md)。下方练习再增加新约束。

编辑器、搜索、依赖图和大型表格把经典算法放进了有状态产品。每题先说清身份、更新规则与错误合同，再选结构，并用可判定样例验收。

```mermaid
flowchart LR
    A[输入模型] --> B[不变量]
    B --> C[数据结构]
    C --> D[更新与查询]
    D --> E[边界验收]
```

沿图从输入追踪到输出。五层练题法依次回答现象、规则、机制、实现和边界；编码前先口述这五项，尤其说明平局、溢出和失败是否会改动旧状态。

## 序列、区间与检索

### H257. 带代价编辑距离脚本

实现 editScript(a,b,costs): {cost,ops}，返回把 a 变为 b 的最低代价插入、删除、替换操作序列，位置按每步执行时的当前字符串计。

按 Unicode code point 拆分，长度各≤2,000；代价为非负安全整数；每步执行后前缀与目标对齐；等代价回溯优先删除、再替换、最后插入。

- kitten→sitting 三代价皆 1，cost=3；顺序执行 ops 必须精确得到 sitting，不能只报告距离。
- 空串转“猫”、插入代价 2 得 cost=2；负代价构造返回 RangeError，不能进入未定义优化模型。

滚动行求距离，方向矩阵回溯操作；矩阵 O(mn)，若要线性空间需改用分治回溯并重新验证 tie-break。

只需阈值 k 内结果时如何带状 DP 截断；允许相邻换位后状态为何不同？解释输出脚本可能有多个最优解。

难，45 分钟；说明时间、空间、Unicode 与操作坐标的关系。

<!-- Question record (index metadata)
- **题目契约：**实现 editScript(a,b,costs): {cost,ops}，返回把 a 变为 b 的最低代价插入、删除、替换操作序列，位置按每步执行时的当前字符串计。
- **约束与不变量：**按 Unicode code point 拆分，长度各≤2,000；代价为非负安全整数；每步执行后前缀与目标对齐；等代价回溯优先删除、再替换、最后插入。
- **用例 A：**kitten→sitting 三代价皆 1，cost=3；顺序执行 ops 必须精确得到 sitting，不能只报告距离。
- **用例 B：**空串转“猫”、插入代价 2 得 cost=2；负代价构造返回 RangeError，不能进入未定义优化模型。
- **实现提示：**滚动行求距离，方向矩阵回溯操作；矩阵 O(mn)，若要线性空间需改用分治回溯并重新验证 tie-break。
- **进阶追问：**只需阈值 k 内结果时如何带状 DP 截断；允许相邻换位后状态为何不同？解释输出脚本可能有多个最优解。
- **难度 / 建议时长：**难，45 分钟；说明时间、空间、Unicode 与操作坐标的关系。
- **依据与状态：**作者原创派生练习，未实现/未实跑；机制参考[算法资料](handwritten-practice-sources.md#s29)与[ECMAScript](handwritten-practice-sources.md#s11)。
-->

### H258. Myers 插删差分波前

实现 shortestEdit(a,b,maxD?)，求最短插入/删除差分，token 以 Object.is 判等，返回距离和半开区间 hunk。

序列长度各≤100,000；maxD 限制搜索深度；hunks 有序且应用后等于目标，替换按一次删除加一次插入计 2。

- [a,b,c] 对 [a,x,c] 距离 2，应用 hunk 后得到 [a,x,c]，保留前后公共 token。
- 空序列对空序列为距离 0、无 hunk；[1] 对 [2] 且 maxD=1 返回 null。

按对角线 k 记录最远 x，逐层扩展并贪心消费相同 token；保存层快照供回溯，避免覆盖所需 frontier。

重复 token 导致多种最短路径，如何保证确定输出；共享前后缀裁剪何时安全？

挑战，60 分钟；区别替换成本和插删距离。

<!-- Question record (index metadata)
- **题目契约：**实现 shortestEdit(a,b,maxD?)，求最短插入/删除差分，token 以 Object.is 判等，返回距离和半开区间 hunk。
- **约束与不变量：**序列长度各≤100,000；maxD 限制搜索深度；hunks 有序且应用后等于目标，替换按一次删除加一次插入计 2。
- **用例 A：**[a,b,c] 对 [a,x,c] 距离 2，应用 hunk 后得到 [a,x,c]，保留前后公共 token。
- **用例 B：**空序列对空序列为距离 0、无 hunk；[1] 对 [2] 且 maxD=1 返回 null。
- **实现提示：**按对角线 k 记录最远 x，逐层扩展并贪心消费相同 token；保存层快照供回溯，避免覆盖所需 frontier。
- **进阶追问：**重复 token 导致多种最短路径，如何保证确定输出；共享前后缀裁剪何时安全？
- **难度 / 建议时长：**挑战，60 分钟；区别替换成本和插删距离。
- **依据与状态：**作者原创派生练习，未实现/未实跑；差分机制参考[算法资料](handwritten-practice-sources.md#s29)与[ECMAScript](handwritten-practice-sources.md#s11)。
-->

### H259. 多模式 Aho–Corasick 扫描

实现 compile(patterns)、scan(text,automaton)，返回词典 ID、code point 起止位置；重叠匹配全保留。

模式≤50,000，总字符≤1,000,000；空模式拒绝；failure link 指向较短后缀，输出含当前状态与后缀状态命中。

- 模式 he/she/hers 扫描 ushers，输出 she:[1,4)、he:[2,4)、hers:[2,6)，按起点和 ID 排序。
- 重复模式 [a,a] 对 a 返回两个 ID；空词典扫描任意文本为空。

Trie 节点用 Map，BFS 构建 failure；扫描沿失配链回退，输出链可延迟遍历以避免继承表膨胀。

分块文本跨边界命中需保留何种状态；大量共享后缀如何限制内存？

挑战，55 分钟；说明构建、扫描和输出规模。

<!-- Question record (index metadata)
- **题目契约：**实现 compile(patterns)、scan(text,automaton)，返回词典 ID、code point 起止位置；重叠匹配全保留。
- **约束与不变量：**模式≤50,000，总字符≤1,000,000；空模式拒绝；failure link 指向较短后缀，输出含当前状态与后缀状态命中。
- **用例 A：**模式 he/she/hers 扫描 ushers，输出 she:[1,4)、he:[2,4)、hers:[2,6)，按起点和 ID 排序。
- **用例 B：**重复模式 [a,a] 对 a 返回两个 ID；空词典扫描任意文本为空。
- **实现提示：**Trie 节点用 Map，BFS 构建 failure；扫描沿失配链回退，输出链可延迟遍历以避免继承表膨胀。
- **进阶追问：**分块文本跨边界命中需保留何种状态；大量共享后缀如何限制内存？
- **难度 / 建议时长：**挑战，55 分钟；说明构建、扫描和输出规模。
- **依据与状态：**作者原创派生练习，未实现/未实跑；机制参考[算法资料](handwritten-practice-sources.md#s29)与[编码标准](handwritten-practice-sources.md#s25)。
-->

### H260. 过滤后的稳定 Top-K

实现 topK(items,k,query)，过滤后按 score 降序、创建序号升序取前 k，不改输入。

最多 1,000,000 项，k∈[0,10,000]；分数必须有限；缺字段策略显式约定，比较关系必须传递。

- 分数 5,8,8,3、序号 0,1,2,3，k=2 返回序号 1、2。
- k=0 返回空且不调用谓词；NaN 在带索引错误中拒绝，不能交给不传递比较器。

容量 k 的最小堆保存当前最差候选，最终仅排序 k 项，目标 O(n log k+k log k)。

条件固定时如何复用位图索引；数据在线更新如何让过期堆记录失效？

难，35 分钟；比较全排序与小 k 方案。

<!-- Question record (index metadata)
- **题目契约：**实现 topK(items,k,query)，过滤后按 score 降序、创建序号升序取前 k，不改输入。
- **约束与不变量：**最多 1,000,000 项，k∈[0,10,000]；分数必须有限；缺字段策略显式约定，比较关系必须传递。
- **用例 A：**分数 5,8,8,3、序号 0,1,2,3，k=2 返回序号 1、2。
- **用例 B：**k=0 返回空且不调用谓词；NaN 在带索引错误中拒绝，不能交给不传递比较器。
- **实现提示：**容量 k 的最小堆保存当前最差候选，最终仅排序 k 项，目标 O(n log k+k log k)。
- **进阶追问：**条件固定时如何复用位图索引；数据在线更新如何让过期堆记录失效？
- **难度 / 建议时长：**难，35 分钟；比较全排序与小 k 方案。
- **依据与状态：**作者原创派生练习，未实现/未实跑；堆参考[算法资料](handwritten-practice-sources.md#s29)与[SQLite 查询规划](handwritten-practice-sources.md#s30)。
-->

### H261. 只缩窄的时间窗聚合器

实现 push(time,value)、shrink(width)，维护 (now-width,now] 窗内 count、sum、min、max，窗口只准缩小，不支持恢复已淘汰记录。

时间单调不减、宽度非负且不增、值有限；过期项不参与结果；溢出时报错且不发布半成品快照。

- 宽 10，push(1,4),(5,2),(11,7)，窗口排除 t=1，得 count=2、sum=9、min=2、max=7。
- shrink(0) 后时刻边界上的项按半开规则排除；请求大于当前宽度返回 RangeError 且状态不变；时刻 10 后 push(9,1) 也抛 RangeError。

队列淘汰旧项，sum/count 增量维护，min/max 用带序号的单调双端队列；shrink 只执行淘汰，绝不宣称可恢复历史。

允许最多迟到 2 秒时水位线如何定义；支持任意历史撤销会让何种操作退化？

难，40 分钟；分别分析 push 和 resize 的摊还成本。

<!-- Question record (index metadata)
- **题目契约：**实现 push(time,value)、shrink(width)，维护 (now-width,now] 窗内 count、sum、min、max，窗口只准缩小，不支持恢复已淘汰记录。
- **约束与不变量：**时间单调不减、宽度非负且不增、值有限；过期项不参与结果；溢出时报错且不发布半成品快照。
- **用例 A：**宽 10，push(1,4),(5,2),(11,7)，窗口排除 t=1，得 count=2、sum=9、min=2、max=7。
- **用例 B：**shrink(0) 后时刻边界上的项按半开规则排除；请求大于当前宽度返回 RangeError 且状态不变；时刻 10 后 push(9,1) 也抛 RangeError。
- **实现提示：**队列淘汰旧项，sum/count 增量维护，min/max 用带序号的单调双端队列；shrink 只执行淘汰，绝不宣称可恢复历史。
- **进阶追问：**允许最多迟到 2 秒时水位线如何定义；支持任意历史撤销会让何种操作退化？
- **难度 / 建议时长：**难，40 分钟；分别分析 push 和 resize 的摊还成本。
- **依据与状态：**作者原创派生练习，未实现/未实跑；队列机制参考[算法资料](handwritten-practice-sources.md#s29)与[ECMAScript](handwritten-practice-sources.md#s11)。
-->

### H262. 支持合法删除的区间覆盖长度树

实现 add(l,r,delta)、coveredLength()，在预先给定坐标段上维护覆盖次数大于零的总长度，区间为 [l,r)。

边界严格递增；任何叶段计数不得为负；非法端点拒绝且失败不得改变树状态。

- 边界 0,2,5,9，加 [0,5) 与 [2,9) 后长度 9；移除第一段后长度 7。
- 仅加 [2,5) 一次后减两次，第二次抛错并回滚；空区间长度不变。

节点维护 lazy add、最小覆盖次数与达到最小值的长度；更新前查询目标区间最小覆盖，减法若会低于 0 则拒绝，覆盖长度由全长减去 min=0 的长度求得。

在线新增坐标时如何改为动态树；只加不删时是否值得采用更简单表示？

难，45 分钟；解释计数为何不能退化成布尔值。

<!-- Question record (index metadata)
- **题目契约：**实现 add(l,r,delta)、coveredLength()，在预先给定坐标段上维护覆盖次数大于零的总长度，区间为 [l,r)。
- **约束与不变量：**边界严格递增；任何叶段计数不得为负；非法端点拒绝且失败不得改变树状态。
- **用例 A：**边界 0,2,5,9，加 [0,5) 与 [2,9) 后长度 9；移除第一段后长度 7。
- **用例 B：**仅加 [2,5) 一次后减两次，第二次抛错并回滚；空区间长度不变。
- **实现提示：**节点维护 lazy add、最小覆盖次数与达到最小值的长度；更新前查询目标区间最小覆盖，减法若会低于 0 则拒绝，覆盖长度由全长减去 min=0 的长度求得。
- **进阶追问：**在线新增坐标时如何改为动态树；只加不删时是否值得采用更简单表示？
- **难度 / 建议时长：**难，45 分钟；解释计数为何不能退化成布尔值。
- **依据与状态：**作者原创派生练习，未实现/未实跑；机制参考[算法资料](handwritten-practice-sources.md#s29)与[SQLite 查询规划](handwritten-practice-sources.md#s30)。
-->

### H263. 区间最小值与条件定位

实现 update(i,v)、query(l,r)、firstAtMost(l,r,x)，最后一个返回半开区间最左满足条件索引或 null。

数组≤1,000,000；索引越界、NaN 抛错；树节点摘要等于其区间最小值。

- [8,3,7,2,6] 的 query(1,4)=2，firstAtMost(0,5,3)=1；update(3,9) 后 query(1,4)=3。
- firstAtMost(2,5,1)=null；空区间 query(4,4)=Infinity，越界 query 抛 RangeError。

迭代线段树做更新和区间查询；定位时剪掉不相交或最小值大于 x 的节点，优先左子树。

区间最大前缀和需要何种节点摘要；批量更新何时重建更合算？

中，35 分钟；同时说明聚合与树上剪枝查询。

<!-- Question record (index metadata)
- **题目契约：**实现 update(i,v)、query(l,r)、firstAtMost(l,r,x)，最后一个返回半开区间最左满足条件索引或 null。
- **约束与不变量：**数组≤1,000,000；索引越界、NaN 抛错；树节点摘要等于其区间最小值。
- **用例 A：**[8,3,7,2,6] 的 query(1,4)=2，firstAtMost(0,5,3)=1；update(3,9) 后 query(1,4)=3。
- **用例 B：**firstAtMost(2,5,1)=null；空区间 query(4,4)=Infinity，越界 query 抛 RangeError。
- **实现提示：**迭代线段树做更新和区间查询；定位时剪掉不相交或最小值大于 x 的节点，优先左子树。
- **进阶追问：**区间最大前缀和需要何种节点摘要；批量更新何时重建更合算？
- **难度 / 建议时长：**中，35 分钟；同时说明聚合与树上剪枝查询。
- **依据与状态：**作者原创派生练习，未实现/未实跑；结构参考[算法资料](handwritten-practice-sources.md#s29)与[SQLite 查询规划](handwritten-practice-sources.md#s30)。
-->

### H264. 静态区间 stabbing 索引

实现 build(intervals)、stab(point)，返回包含该点的闭区间 ID，按 ID 排序，构建后索引只读。

有限端点且 start≤end；最多 200,000 段、100,000 查询；重复段保留各 ID，端点命中。

- 段 [1,4]、[4,8]、[2,3] 查询 4 得 ID 0,1；查询 3 得 0,2。
- 空索引返回空；[5,2] 构建时报带索引错误，不得静默交换端点。

建立 interval tree，跨中点段按端点排序；查询扫描与点相关前缀并递归一侧，按输出敏感复杂度分析。

查与另一段相交的全部段是否仍可用 stabbing；输出 Ω(k) 下界如何表达？

难，40 分钟；给出结果数量带来的理论成本。

<!-- Question record (index metadata)
- **题目契约：**实现 build(intervals)、stab(point)，返回包含该点的闭区间 ID，按 ID 排序，构建后索引只读。
- **约束与不变量：**有限端点且 start≤end；最多 200,000 段、100,000 查询；重复段保留各 ID，端点命中。
- **用例 A：**段 [1,4]、[4,8]、[2,3] 查询 4 得 ID 0,1；查询 3 得 0,2。
- **用例 B：**空索引返回空；[5,2] 构建时报带索引错误，不得静默交换端点。
- **实现提示：**建立 interval tree，跨中点段按端点排序；查询扫描与点相关前缀并递归一侧，按输出敏感复杂度分析。
- **进阶追问：**查与另一段相交的全部段是否仍可用 stabbing；输出 Ω(k) 下界如何表达？
- **难度 / 建议时长：**难，40 分钟；给出结果数量带来的理论成本。
- **依据与状态：**作者原创派生练习，未实现/未实跑；区间机制参考[算法资料](handwritten-practice-sources.md#s29)与[SQLite 查询规划](handwritten-practice-sources.md#s30)。
-->

### H265. 含负值的树根叶路径和

实现 pathSum(root,target) 返回所有根到叶且和为 target 的节点 ID 路径，左子树优先。

≤100,000 节点，值为安全整数；可为负，不得据部分和提前剪枝；无共享子节点，输出路径复制。

- 根 5、左链 4→1、右链 2→8，target 10 返回左路径，且末节点必须是叶。
- 根 -2、叶 -3 与 1，target -5 只返回左路；空树不把空路径当作和 0。

DFS 维护显式路径和 BigInt 累加；命中叶时复制 ID；深树改显式栈防调用栈耗尽。

任意端点路径可用何种前缀和；结果指数多时如何设计迭代器与取消？

中，30 分钟；解释负数为何改变剪枝有效性。

<!-- Question record (index metadata)
- **题目契约：**实现 pathSum(root,target) 返回所有根到叶且和为 target 的节点 ID 路径，左子树优先。
- **约束与不变量：**≤100,000 节点，值为安全整数；可为负，不得据部分和提前剪枝；无共享子节点，输出路径复制。
- **用例 A：**根 5、左链 4→1、右链 2→8，target 10 返回左路径，且末节点必须是叶。
- **用例 B：**根 -2、叶 -3 与 1，target -5 只返回左路；空树不把空路径当作和 0。
- **实现提示：**DFS 维护显式路径和 BigInt 累加；命中叶时复制 ID；深树改显式栈防调用栈耗尽。
- **进阶追问：**任意端点路径可用何种前缀和；结果指数多时如何设计迭代器与取消？
- **难度 / 建议时长：**中，30 分钟；解释负数为何改变剪枝有效性。
- **依据与状态：**作者原创派生练习，未实现/未实跑；树与数值机制参考[算法资料](handwritten-practice-sources.md#s29)及[ECMAScript](handwritten-practice-sources.md#s11)。
-->

### H266. 二进制提升 LCA 查询器

实现 buildLca(root) 返回 lca(idA,idB)；缺失 ID 返回 null，多次查询共享预处理。

最多 200,000 节点，树构建后不变；祖先表 up[v][j] 指向向上 2^j 层，查询先对齐深度。

- 根 1 子女 2、3，节点 2 子女 4、5，lca(4,5)=2、lca(4,3)=1。
- lca(4,missing)=null，lca(2,2)=2，空树查询为 null。

DFS 建深度和父亲，再建 O(n log n) 表；最大位向下提升，查询 O(log n)。

只追加叶节点如何增量填表；动态 link/cut 后静态祖先假设何处失效？

难，40 分钟；给出空间与查询复杂度。

<!-- Question record (index metadata)
- **题目契约：**实现 buildLca(root) 返回 lca(idA,idB)；缺失 ID 返回 null，多次查询共享预处理。
- **约束与不变量：**最多 200,000 节点，树构建后不变；祖先表 up[v][j] 指向向上 2^j 层，查询先对齐深度。
- **用例 A：**根 1 子女 2、3，节点 2 子女 4、5，lca(4,5)=2、lca(4,3)=1。
- **用例 B：**lca(4,missing)=null，lca(2,2)=2，空树查询为 null。
- **实现提示：**DFS 建深度和父亲，再建 O(n log n) 表；最大位向下提升，查询 O(log n)。
- **进阶追问：**只追加叶节点如何增量填表；动态 link/cut 后静态祖先假设何处失效？
- **难度 / 建议时长：**难，40 分钟；给出空间与查询复杂度。
- **依据与状态：**作者原创派生练习，未实现/未实跑；LCA 参考[算法资料](handwritten-practice-sources.md#s29)和[ECMAScript](handwritten-practice-sources.md#s11)。
-->

## 图、依赖与规划

### H267. 有权图确定性 Dijkstra

实现 shortestPath(graph,source,target)，返回距离和节点路径；堆按 (distance,numericNodeId) 升序，等距候选只接受按节点 ID 排序邻边发现的首条路径。

节点 ID 为唯一整数；邻接表≤500,000 边；权重有限且非负，距离累加有限；每个邻接表按目标 ID 升序处理。

- A-B=4、A-C=1、C-B=2、B-D=1、C-D=8，A 到 D 距离 4、路径 A,C,B,D。
- 目标不可达返回 null；任一负边输入均拒绝，不能依赖它不在最终路径上。

最小堆存距离快照，弹出时对照 dist 丢弃旧项；前驱只在严格改进时更新。

负边无环应选什么算法；导航权重动态改变时如何使缓存结果失效？

中，35 分钟；说明 O((V+E)logV) 与堆重复条目。

<!-- Question record (index metadata)
- **题目契约：**实现 shortestPath(graph,source,target)，返回距离和节点路径；堆按 (distance,numericNodeId) 升序，等距候选只接受按节点 ID 排序邻边发现的首条路径。
- **约束与不变量：**节点 ID 为唯一整数；邻接表≤500,000 边；权重有限且非负，距离累加有限；每个邻接表按目标 ID 升序处理。
- **用例 A：**A-B=4、A-C=1、C-B=2、B-D=1、C-D=8，A 到 D 距离 4、路径 A,C,B,D。
- **用例 B：**目标不可达返回 null；任一负边输入均拒绝，不能依赖它不在最终路径上。
- **实现提示：**最小堆存距离快照，弹出时对照 dist 丢弃旧项；前驱只在严格改进时更新。
- **进阶追问：**负边无环应选什么算法；导航权重动态改变时如何使缓存结果失效？
- **难度 / 建议时长：**中，35 分钟；说明 O((V+E)logV) 与堆重复条目。
- **依据与状态：**作者原创派生练习，未实现/未实跑；机制参考[算法资料](handwritten-practice-sources.md#s29)与[SQLite 查询规划](handwritten-practice-sources.md#s30)。
-->

### H268. Bellman–Ford 负环影响集合

实现 bellmanFord(vertices,edges,source) 返回距离、前驱和受可达负环影响的节点集合。

≤20,000 顶点、100,000 边；仅从源可达环污染结果；V-1 轮后仍可松弛顶点进入污染传播。

- A→B=3、B→C=-5、A→C=1，C 距离 -2、路径 A,B,C，负边本身不表示负环。
- A→B=1、B→C=-3、C→B=1 标记 B,C；不可达分量负环不污染源的结果。

无变化时提前停；额外扫描收集变更点，再沿有向边 BFS 标记可达后继。

如何输出环见证；浮点权比较如何避免误差把近零环判错？

难，45 分钟；区分全图有环和查询受其影响。

<!-- Question record (index metadata)
- **题目契约：**实现 bellmanFord(vertices,edges,source) 返回距离、前驱和受可达负环影响的节点集合。
- **约束与不变量：**≤20,000 顶点、100,000 边；仅从源可达环污染结果；V-1 轮后仍可松弛顶点进入污染传播。
- **用例 A：**A→B=3、B→C=-5、A→C=1，C 距离 -2、路径 A,B,C，负边本身不表示负环。
- **用例 B：**A→B=1、B→C=-3、C→B=1 标记 B,C；不可达分量负环不污染源的结果。
- **实现提示：**无变化时提前停；额外扫描收集变更点，再沿有向边 BFS 标记可达后继。
- **进阶追问：**如何输出环见证；浮点权比较如何避免误差把近零环判错？
- **难度 / 建议时长：**难，45 分钟；区分全图有环和查询受其影响。
- **依据与状态：**作者原创派生练习，未实现/未实跑；机制参考[算法资料](handwritten-practice-sources.md#s29)与[ECMAScript](handwritten-practice-sources.md#s11)。
-->

### H269. DAG 最长关键链重建

实现 criticalPath(tasks,edges)，边 u→v 表示 v 等待 u，返回最长耗时链和稳定平局路径。

任务耗时非负安全整数；依赖须无环；拓扑处理中每边松弛一次，环错误提供闭合见证；等长路径取任务 ID 序列字典序较小者。

- A=3、B=4、C=2，A→B、A→C，输出 A,B 且 duration=7。
- A→B→C→A 报含三节点闭环；空图输出 0 和空路径。

Kahn 生成拓扑序，dist 保存完成时间和前驱；若剩余入度非零，用 DFS 回边重建环。

资源受限并行调度为何不等于关键路径；局部任务更新能否只重算后继？

中，35 分钟；说明边语义、节点耗时及 tie-break。

<!-- Question record (index metadata)
- **题目契约：**实现 criticalPath(tasks,edges)，边 u→v 表示 v 等待 u，返回最长耗时链和稳定平局路径。
- **约束与不变量：**任务耗时非负安全整数；依赖须无环；拓扑处理中每边松弛一次，环错误提供闭合见证；等长路径取任务 ID 序列字典序较小者。
- **用例 A：**A=3、B=4、C=2，A→B、A→C，输出 A,B 且 duration=7。
- **用例 B：**A→B→C→A 报含三节点闭环；空图输出 0 和空路径。
- **实现提示：**Kahn 生成拓扑序，dist 保存完成时间和前驱；若剩余入度非零，用 DFS 回边重建环。
- **进阶追问：**资源受限并行调度为何不等于关键路径；局部任务更新能否只重算后继？
- **难度 / 建议时长：**中，35 分钟；说明边语义、节点耗时及 tie-break。
- **依据与状态：**作者原创派生练习，未实现/未实跑；DAG 机制参考[算法资料](handwritten-practice-sources.md#s29)和[SQLite 查询规划](handwritten-practice-sources.md#s30)。
-->

### H270. 依赖边增量环检测

实现 addEdge(u,v)；只有新增边不成环才提交，拒绝时返回闭环且图状态不变。

节点固定、边只增不删；重复边成功空操作；自环立即成环，失败不能污染邻接表。

- 已有 A→B、B→C，加 C→A 拒绝并返回闭环；边数不变。
- 加 C→D 后重复加仍只存一条；X→X 返回 [X,X] 且不提交。

先从 v DFS 是否到达 u，parent 用于还原见证；确认无环后再写入新边。

频繁插边时动态拓扑如何局部重排；批量加边如何事务回滚？

难，40 分钟；强调校验在提交之前。

<!-- Question record (index metadata)
- **题目契约：**实现 addEdge(u,v)；只有新增边不成环才提交，拒绝时返回闭环且图状态不变。
- **约束与不变量：**节点固定、边只增不删；重复边成功空操作；自环立即成环，失败不能污染邻接表。
- **用例 A：**已有 A→B、B→C，加 C→A 拒绝并返回闭环；边数不变。
- **用例 B：**加 C→D 后重复加仍只存一条；X→X 返回 [X,X] 且不提交。
- **实现提示：**先从 v DFS 是否到达 u，parent 用于还原见证；确认无环后再写入新边。
- **进阶追问：**频繁插边时动态拓扑如何局部重排；批量加边如何事务回滚？
- **难度 / 建议时长：**难，40 分钟；强调校验在提交之前。
- **依据与状态：**作者原创派生练习，未实现/未实跑；图机制参考[算法资料](handwritten-practice-sources.md#s29)与[ECMAScript Map](handwritten-practice-sources.md#s11)。
-->

### H271. Floyd–Warshall 三态全源距离

实现 allPairs(vertices,edges) 返回 finite、unreachable、negative-cycle-affected 三态矩阵。

顶点≤300；平行边取最小权；每轮中间点 k 只用此前可达状态更新，不混淆 Infinity 与 NaN。

- A→B=2、B→C=3、A→C=9，A 到 C 为 5，C 到 A unreachable。
- 初始边 A→D=4、B→C=-3、C→B=1；B 到 C 标负环影响，A 到 D 仍为有限距离 4。

三重循环计算距离；末尾找 dist[k][k]<0，并标记所有可达 k 的 i 到可达 k 的 j。

稀疏图大规模时切换什么方案；如何侦测 Number 距离累加溢出？

难，45 分钟；解释 O(V³) 与 O(V²) 的适用尺度。

<!-- Question record (index metadata)
- **题目契约：**实现 allPairs(vertices,edges) 返回 finite、unreachable、negative-cycle-affected 三态矩阵。
- **约束与不变量：**顶点≤300；平行边取最小权；每轮中间点 k 只用此前可达状态更新，不混淆 Infinity 与 NaN。
- **用例 A：**A→B=2、B→C=3、A→C=9，A 到 C 为 5，C 到 A unreachable。
- **用例 B：**初始边 A→D=4、B→C=-3、C→B=1；B 到 C 标负环影响，A 到 D 仍为有限距离 4。
- **实现提示：**三重循环计算距离；末尾找 dist[k][k]<0，并标记所有可达 k 的 i 到可达 k 的 j。
- **进阶追问：**稀疏图大规模时切换什么方案；如何侦测 Number 距离累加溢出？
- **难度 / 建议时长：**难，45 分钟；解释 O(V³) 与 O(V²) 的适用尺度。
- **依据与状态：**作者原创派生练习，未实现/未实跑；全源最短路参考[算法资料](handwritten-practice-sources.md#s29)和[ECMAScript](handwritten-practice-sources.md#s11)。
-->

### H272. Unicode Trie 删除与剪枝

实现 insert(word)、delete(word)、hasPrefix(prefix)；按 code point 区分大小写，删除后剪枝无用节点。

总字符≤1,000,000；重复插入不重复计词；删除不存在词返回 false；terminal 与子边状态分离。

- 插入“猫眼”“猫粮”后删“猫眼”，前缀“猫”仍在、完整词不存在，另一词仍可查。
- 空串插入使空前缀/完整空词成立；删除空串只清 root terminal。

Map<codePoint,node> 存子边；递归删除返回是否可剪枝，默认不做 NFC 规范化。

压缩 radix edge 后怎样删中间前缀；如何与带状编辑距离联合做词典模糊查找？

中，30 分钟；明确 code point 与 grapheme 的差别。

<!-- Question record (index metadata)
- **题目契约：**实现 insert(word)、delete(word)、hasPrefix(prefix)；按 code point 区分大小写，删除后剪枝无用节点。
- **约束与不变量：**总字符≤1,000,000；重复插入不重复计词；删除不存在词返回 false；terminal 与子边状态分离。
- **用例 A：**插入“猫眼”“猫粮”后删“猫眼”，前缀“猫”仍在、完整词不存在，另一词仍可查。
- **用例 B：**空串插入使空前缀/完整空词成立；删除空串只清 root terminal。
- **实现提示：**Map<codePoint,node> 存子边；递归删除返回是否可剪枝，默认不做 NFC 规范化。
- **进阶追问：**压缩 radix edge 后怎样删中间前缀；如何与带状编辑距离联合做词典模糊查找？
- **难度 / 建议时长：**中，30 分钟；明确 code point 与 grapheme 的差别。
- **依据与状态：**作者原创派生练习，未实现/未实跑；Trie 参考[算法资料](handwritten-practice-sources.md#s29)和[编码标准](handwritten-practice-sources.md#s25)。
-->

### H273. 二维前缀和矩形索引

实现 sumRect(r1,c1,r2,c2) 查询静态矩阵半开矩形和，r 为行、c 为列。

矩阵≤5,000×5,000；元素和为安全整数；前缀表首行首列恒为 0，坐标越界报错。

- 矩阵 [[1,2,3],[4,5,6]] 查行列范围 (0,1)-(2,3) 得 16；单格范围 (1,1)-(2,2) 得 5。
- 零高区间得 0；非法坐标抛 RangeError，和溢出时抛而不是返回近似数。

构建 P[y+1][x+1]，四角容斥；内存不足时需另定分块合同。

在线点更新用二维 Fenwick 如何推导；稀疏矩阵如何压缩坐标？

中，25 分钟；说清空间 O(rows×cols)。

<!-- Question record (index metadata)
- **题目契约：**实现 sumRect(r1,c1,r2,c2) 查询静态矩阵半开矩形和，r 为行、c 为列。
- **约束与不变量：**矩阵≤5,000×5,000；元素和为安全整数；前缀表首行首列恒为 0，坐标越界报错。
- **用例 A：**矩阵 [[1,2,3],[4,5,6]] 查行列范围 (0,1)-(2,3) 得 16；单格范围 (1,1)-(2,2) 得 5。
- **用例 B：**零高区间得 0；非法坐标抛 RangeError，和溢出时抛而不是返回近似数。
- **实现提示：**构建 P[y+1][x+1]，四角容斥；内存不足时需另定分块合同。
- **进阶追问：**在线点更新用二维 Fenwick 如何推导；稀疏矩阵如何压缩坐标？
- **难度 / 建议时长：**中，25 分钟；说清空间 O(rows×cols)。
- **依据与状态：**作者原创派生练习，未实现/未实跑；前缀和参考[算法资料](handwritten-practice-sources.md#s29)与[SQLite 查询规划](handwritten-practice-sources.md#s30)。
-->

### H274. 稀疏坐标二维 Fenwick

实现 add(x,y,delta) 与 prefix(x,y)，仅构建时登记的点可更新，查询返回坐标不大于输入点的权重总和。

登记点≤100,000，整数坐标；重合坐标合并；未知点更新拒绝，和必须安全整数。

- 登记 (2,3),(5,1),(5,4) 并各加 1，prefix(5,3)=2、prefix(4,9)=1。
- prefix(0,0)=0；更新未知 (3,3) 抛错且后续结果不变。

外层 x Fenwick 节点各存覆盖点的压缩 y 表与内层树，更新查询 O(log²n)。

每节点为何不能都存全局 y 表；动态加点要重建还是改平衡树？

挑战，60 分钟；解释离线收集 y 的节点覆盖关系。

<!-- Question record (index metadata)
- **题目契约：**实现 add(x,y,delta) 与 prefix(x,y)，仅构建时登记的点可更新，查询返回坐标不大于输入点的权重总和。
- **约束与不变量：**登记点≤100,000，整数坐标；重合坐标合并；未知点更新拒绝，和必须安全整数。
- **用例 A：**登记 (2,3),(5,1),(5,4) 并各加 1，prefix(5,3)=2、prefix(4,9)=1。
- **用例 B：**prefix(0,0)=0；更新未知 (3,3) 抛错且后续结果不变。
- **实现提示：**外层 x Fenwick 节点各存覆盖点的压缩 y 表与内层树，更新查询 O(log²n)。
- **进阶追问：**每节点为何不能都存全局 y 表；动态加点要重建还是改平衡树？
- **难度 / 建议时长：**挑战，60 分钟；解释离线收集 y 的节点覆盖关系。
- **依据与状态：**作者原创派生练习，未实现/未实跑；机制参考[算法资料](handwritten-practice-sources.md#s29)和[SQLite 索引](handwritten-practice-sources.md#s30)。
-->

### H275. LRU-K 缓存淘汰器

实现容量 C、参数 K 的 get/set；淘汰最近 K 次访问中最久未访问项，历史不足 K 次者优先淘汰。

访问包括命中 get 和成功 set；序号严格递增；C=0 时不保留值，set 返回成功。

- C=2,K=2，set(a),set(b),get(a),set(c) 淘汰冷键 b；同为冷键时按最近一次成功访问时间较早者淘汰。
- C=0 后 get(a) 为 miss；覆盖现有键不改变键数，访问计数语义固定。

每 key 保留最近 K 序号，cold/hot 两类配有序索引；避免淘汰时全表扫描。

怎样做到 O(log C) 且历史空间有界；并发下序号分配的线性化点在哪？

难，45 分钟；先解释 set 是否计访问。

<!-- Question record (index metadata)
- **题目契约：**实现容量 C、参数 K 的 get/set；淘汰最近 K 次访问中最久未访问项，历史不足 K 次者优先淘汰。
- **约束与不变量：**访问包括命中 get 和成功 set；序号严格递增；C=0 时不保留值，set 返回成功。
- **用例 A：**C=2,K=2，set(a),set(b),get(a),set(c) 淘汰冷键 b；同为冷键时按最近一次成功访问时间较早者淘汰。
- **用例 B：**C=0 后 get(a) 为 miss；覆盖现有键不改变键数，访问计数语义固定。
- **实现提示：**每 key 保留最近 K 序号，cold/hot 两类配有序索引；避免淘汰时全表扫描。
- **进阶追问：**怎样做到 O(log C) 且历史空间有界；并发下序号分配的线性化点在哪？
- **难度 / 建议时长：**难，45 分钟；先解释 set 是否计访问。
- **依据与状态：**作者原创派生练习，未实现/未实跑；索引参考[SQLite 查询规划](handwritten-practice-sources.md#s30)与[ECMAScript](handwritten-practice-sources.md#s11)。
-->

### H276. 带周期衰减的 LFU 缓存

实现 get/set：成功命中 get 和成功 set 都计一次访问；最低频率先淘汰，同频最近访问更早者先淘汰；每 T 次成功访问频率向下折半且最小 1。

miss 不计操作数；频率不可溢出；新键频率为 1；覆盖键增频并更新时间；频率桶和链表须同步删除。

- 容量 2，a 命中三次、b 命中一次后插入 c，a 保留；衰减后同频按近访顺序决胜。
- miss 不触发衰减，T=0 构造抛 RangeError。

Map 键到节点、频率到双链表并维护最小频率；周期衰减需遍历，单次成本 O(C)。

惰性分代衰减如何证明等价；如何避免某次衰减造成长暂停？

挑战，55 分钟；指出衰减打破常见 LFU O(1) 保证。

<!-- Question record (index metadata)
- **题目契约：**实现 get/set：成功命中 get 和成功 set 都计一次访问；最低频率先淘汰，同频最近访问更早者先淘汰；每 T 次成功访问频率向下折半且最小 1。
- **约束与不变量：**miss 不计操作数；频率不可溢出；新键频率为 1；覆盖键增频并更新时间；频率桶和链表须同步删除。
- **用例 A：**容量 2，a 命中三次、b 命中一次后插入 c，a 保留；衰减后同频按近访顺序决胜。
- **用例 B：**miss 不触发衰减，T=0 构造抛 RangeError。
- **实现提示：**Map 键到节点、频率到双链表并维护最小频率；周期衰减需遍历，单次成本 O(C)。
- **进阶追问：**惰性分代衰减如何证明等价；如何避免某次衰减造成长暂停？
- **难度 / 建议时长：**挑战，55 分钟；指出衰减打破常见 LFU O(1) 保证。
- **依据与状态：**作者原创派生练习，未实现/未实跑；机制参考[SQLite 查询规划](handwritten-practice-sources.md#s30)与[ECMAScript](handwritten-practice-sources.md#s11)。
-->

### H277. Johnson 稀疏图全源最短路

实现 johnson(graph)，返回所有可达点对的距离矩阵；允许负边，不允许负环，节点 ID 为稳定整数序。

图≤100,000 顶点、1,000,000 边；虚拟源到每点加零边求势函数 h；重加权后边权非负，输出距离须还原。

- 边 A→B=2、A→C=5、B→C=-4，返回 A→C=-2；其他不可达点对明确为 unreachable。
- 加入 C→B=1 后形成负环，整体返回 NegativeCycle 并提供环见证，不能输出部分矩阵伪装成功。

Bellman–Ford 求 h；重权 w'=w+h(u)-h(v)；每个源跑 Dijkstra，最后 d(u,v)=d'(u,v)-h(u)+h(v)。

负环诊断如何恢复顶点序列；稠密图为何 Floyd–Warshall 可能更合适？

挑战，60 分钟；解释势函数、非负性证明和稀疏复杂度。

<!-- Question record (index metadata)
- **题目契约：**实现 johnson(graph)，返回所有可达点对的距离矩阵；允许负边，不允许负环，节点 ID 为稳定整数序。
- **约束与不变量：**图≤100,000 顶点、1,000,000 边；虚拟源到每点加零边求势函数 h；重加权后边权非负，输出距离须还原。
- **用例 A：**边 A→B=2、A→C=5、B→C=-4，返回 A→C=-2；其他不可达点对明确为 unreachable。
- **用例 B：**加入 C→B=1 后形成负环，整体返回 NegativeCycle 并提供环见证，不能输出部分矩阵伪装成功。
- **实现提示：**Bellman–Ford 求 h；重权 w'=w+h(u)-h(v)；每个源跑 Dijkstra，最后 d(u,v)=d'(u,v)-h(u)+h(v)。
- **进阶追问：**负环诊断如何恢复顶点序列；稠密图为何 Floyd–Warshall 可能更合适？
- **难度 / 建议时长：**挑战，60 分钟；解释势函数、非负性证明和稀疏复杂度。
- **依据与状态：**作者原创派生练习，未实现/未实跑；算法机制参考[算法资料](handwritten-practice-sources.md#s29)和[SQLite 查询规划](handwritten-practice-sources.md#s30)。
-->

### H278. B+ 树叶链与范围查询

实现内存 B+ 树 insert(key,value)、delete(key)、range(lo,hi)，闭区间查询；值在叶节点，内部只存分隔键。

最小度 t≥2，键唯一且全序；除根外节点满足键数下限；叶等深且双向叶链有序。

- t=2 插 1..9 后 range(3,7) 返回 3..7；叶链与树中序遍历一致。
- 删不存在键无变化；连续删最小值致根收缩后所有叶仍同层。

叶分裂复制分隔键至父；删除先借后并，叶链更新与父节点改写视为同次事务。

磁盘页大小如何影响扇出；并发范围读遇叶分裂如何保证快照？

挑战，70 分钟；限时可聚焦插入、范围和结构不变量。

<!-- Question record (index metadata)
- **题目契约：**实现内存 B+ 树 insert(key,value)、delete(key)、range(lo,hi)，闭区间查询；值在叶节点，内部只存分隔键。
- **约束与不变量：**最小度 t≥2，键唯一且全序；除根外节点满足键数下限；叶等深且双向叶链有序。
- **用例 A：**t=2 插 1..9 后 range(3,7) 返回 3..7；叶链与树中序遍历一致。
- **用例 B：**删不存在键无变化；连续删最小值致根收缩后所有叶仍同层。
- **实现提示：**叶分裂复制分隔键至父；删除先借后并，叶链更新与父节点改写视为同次事务。
- **进阶追问：**磁盘页大小如何影响扇出；并发范围读遇叶分裂如何保证快照？
- **难度 / 建议时长：**挑战，70 分钟；限时可聚焦插入、范围和结构不变量。
- **依据与状态：**作者原创派生练习，未实现/未实跑；索引参考[SQLite 查询规划](handwritten-practice-sources.md#s30)与[算法资料](handwritten-practice-sources.md#s29)。
-->

### H279. 倒排索引增量删除

实现 addDocument(id,text)、removeDocument(id)、search(term)，返回活跃文档 ID 升序；分词器由题面提供。

重复 term 在文档内只计一次；删除立即不可搜索；压缩不得丢活跃 posting；重用 ID 原子替换。

- D1 有 red blue red、D2 有 blue，search(blue) 得 D1,D2；删 D1 后只剩 D2。
- 删未知 ID 返回 false；替换文档解析失败时旧索引仍有效。

term→有序 posting，docID→terms 反向表；用 tombstone 暂删，达到阈值合并压缩。

posting 差分编码为何使删除需段合并；AND 多词为何先从最短列表求交？

难，40 分钟；定义分词规范化和提交原子性。

<!-- Question record (index metadata)
- **题目契约：**实现 addDocument(id,text)、removeDocument(id)、search(term)，返回活跃文档 ID 升序；分词器由题面提供。
- **约束与不变量：**重复 term 在文档内只计一次；删除立即不可搜索；压缩不得丢活跃 posting；重用 ID 原子替换。
- **用例 A：**D1 有 red blue red、D2 有 blue，search(blue) 得 D1,D2；删 D1 后只剩 D2。
- **用例 B：**删未知 ID 返回 false；替换文档解析失败时旧索引仍有效。
- **实现提示：**term→有序 posting，docID→terms 反向表；用 tombstone 暂删，达到阈值合并压缩。
- **进阶追问：**posting 差分编码为何使删除需段合并；AND 多词为何先从最短列表求交？
- **难度 / 建议时长：**难，40 分钟；定义分词规范化和提交原子性。
- **依据与状态：**作者原创派生练习，未实现/未实跑；倒排索引参考[SQLite 查询规划](handwritten-practice-sources.md#s30)与[算法资料](handwritten-practice-sources.md#s29)。
-->

### H280. 多字段复合游标索引

实现 buildIndex(rows,spec)、seek(cursor,limit)，按方向、空值规则和稳定 rowId 排序，并以游标分页。

字段比较须传递全序；null/undefined/NaN 顺序明示；limit 1..500；游标携带 spec 指纹。

- score 降序、name 升序、id 升序，第二行游标再取 2 项，结果连续无重无漏。
- spec 指纹不同报 InvalidCursor；所有字段相等时 rowId 决定稳定顺序。

复合键编码类型 tag、null rank 和方向；用最后一行全键二分 seek，不能简单拼字符串比较。

localeCompare 跨运行时会否让游标失效；数据更新时是否需快照版本？

难，40 分钟；解释游标排序与查询计划关系。

<!-- Question record (index metadata)
- **题目契约：**实现 buildIndex(rows,spec)、seek(cursor,limit)，按方向、空值规则和稳定 rowId 排序，并以游标分页。
- **约束与不变量：**字段比较须传递全序；null/undefined/NaN 顺序明示；limit 1..500；游标携带 spec 指纹。
- **用例 A：**score 降序、name 升序、id 升序，第二行游标再取 2 项，结果连续无重无漏。
- **用例 B：**spec 指纹不同报 InvalidCursor；所有字段相等时 rowId 决定稳定顺序。
- **实现提示：**复合键编码类型 tag、null rank 和方向；用最后一行全键二分 seek，不能简单拼字符串比较。
- **进阶追问：**localeCompare 跨运行时会否让游标失效；数据更新时是否需快照版本？
- **难度 / 建议时长：**难，40 分钟；解释游标排序与查询计划关系。
- **依据与状态：**作者原创派生练习，未实现/未实跑；复合索引参考[SQLite 查询规划](handwritten-practice-sources.md#s30)及[ECMAScript](handwritten-practice-sources.md#s11)。
-->

### H281. 增量维护拓扑顺序

实现 insertDependency(before,after) 和 order()；成环边返回环证据且不提交。

节点固定、边只加；初始边 A→D、B→C 且序列 A,B,C,D；每条 u→v 满足 position(u)<position(v)。

- 初始序列 A,B,C,D 加 D→B 后成为 A,D,B,C；再加 B→A 拒绝并返回闭环 A,D,B,A。
- 重复加边不改序；自环拒绝；失败后 order() 完全不变。

正确基线是可达检查后 Kahn 重算；优化只在被违反的序号区间搜索并先暂存旧位置。

局部方案最坏仍 O(V+E)，如何按工作负载决定优化；删边如何影响稳定序？

挑战，55 分钟；先证基线，再谈增量优化。

<!-- Question record (index metadata)
- **题目契约：**实现 insertDependency(before,after) 和 order()；成环边返回环证据且不提交。
- **约束与不变量：**节点固定、边只加；初始边 A→D、B→C 且序列 A,B,C,D；每条 u→v 满足 position(u)<position(v)。
- **用例 A：**初始序列 A,B,C,D 加 D→B 后成为 A,D,B,C；再加 B→A 拒绝并返回闭环 A,D,B,A。
- **用例 B：**重复加边不改序；自环拒绝；失败后 order() 完全不变。
- **实现提示：**正确基线是可达检查后 Kahn 重算；优化只在被违反的序号区间搜索并先暂存旧位置。
- **进阶追问：**局部方案最坏仍 O(V+E)，如何按工作负载决定优化；删边如何影响稳定序？
- **难度 / 建议时长：**挑战，55 分钟；先证基线，再谈增量优化。
- **依据与状态：**作者原创派生练习，未实现/未实跑；拓扑机制参考[算法资料](handwritten-practice-sources.md#s29)与[ECMAScript](handwritten-practice-sources.md#s11)。
-->

### H282. 稳定句柄双向链表

实现 insertBefore(handle,node)、remove(handle)、moveToFront(handle)；节点移动后句柄有效，释放后句柄不可复用。

≤1,000,000 节点；每节点仅属一链；sentinel 不暴露；无效或重复删除返回 false。

- a,b,c 中 moveToFront(c) 后为 c,a,b；此前 b 句柄仍可准确删除 b。
- 删除 b 两次得 true、false；以已失效 b 作插入锚点报 InvalidHandle 且状态不变。

节点持 prev/next 和 owner token；摘链再插链，sentinel 统一处理头尾边界；已定位句柄操作 O(1)。

跨链 splice 如何维护 owner；句柄跨 Worker 序列化后怎样防 slot 复用误认？

中，30 分钟；O(1) 建立在直接句柄定位上。

<!-- Question record (index metadata)
- **题目契约：**实现 insertBefore(handle,node)、remove(handle)、moveToFront(handle)；节点移动后句柄有效，释放后句柄不可复用。
- **约束与不变量：**≤1,000,000 节点；每节点仅属一链；sentinel 不暴露；无效或重复删除返回 false。
- **用例 A：**a,b,c 中 moveToFront(c) 后为 c,a,b；此前 b 句柄仍可准确删除 b。
- **用例 B：**删除 b 两次得 true、false；以已失效 b 作插入锚点报 InvalidHandle 且状态不变。
- **实现提示：**节点持 prev/next 和 owner token；摘链再插链，sentinel 统一处理头尾边界；已定位句柄操作 O(1)。
- **进阶追问：**跨链 splice 如何维护 owner；句柄跨 Worker 序列化后怎样防 slot 复用误认？
- **难度 / 建议时长：**中，30 分钟；O(1) 建立在直接句柄定位上。
- **依据与状态：**作者原创派生练习，未实现/未实跑；链表和身份参考[算法资料](handwritten-practice-sources.md#s29)与[ECMAScript](handwritten-practice-sources.md#s11)。
-->

## 常见误区

| 误区 | 可观察失败 | 修正 |
|---|---|---|
| 只求数值、不定义重建 | 结果不能应用或验收 | 明确前驱、回溯、平局顺序 |
| 默认权重非负 | 负边后最短路错误 | 输入校验与算法前提一致 |
| 更新多结构只改一份 | 链表、索引出现悬挂项 | 失败原子性覆盖所有结构 |


## 自测

<details>
<summary>展开 3 道自测题与验收要点</summary>

1. Dijkstra 为何不能带负边？已出队顶点可能被后续负边改短，最终化证明失效。
2. 区间覆盖为何保存次数？删除一个区间后仍需知道是否有其他区间覆盖子段。
3. 清缓存为何检查 in-flight 结果？旧计算可能晚到，发布前须复核依赖代次。

</details>


## 深入阅读

- [算法与数据结构资料](handwritten-practice-sources.md#s29)：图、区间、树、动态规划与字符串匹配。
- [SQLite 查询规划](handwritten-practice-sources.md#s30)：索引、排序和选择性对查询的影响。
- [ECMAScript 规范](handwritten-practice-sources.md#s11)：字符串、对象身份、Map 与数值行为。
