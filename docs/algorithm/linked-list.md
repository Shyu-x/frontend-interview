---
title: 链表题型
description: LeetCode Hot 100 链表类题目：反转、合并、环形检测、删除节点、相交与 K 路合并。
tags:
  - algorithm
  - leetcode
date: 2026-05-17
---

# 链表题型

## 1. 反转链表

**题号**: 206  
**名称**: Reverse Linked List  
**链接**: https://leetcode.cn/problems/reverse-linked-list/

**核心思路**: 迭代或递归。迭代使用三个指针 prev、curr、next 反转方向。

**TypeScript 实现**:

```typescript
interface ListNode {
  val: number;
  next: ListNode | null;
}

// 第 1 段：迭代法反转链表（原地修改指针，O(n) 时间 / O(1) 空间）
// 核心思想：用 prev/curr 两个游标沿链表前进，把每个节点的 next 从"指向后继"改为"指向已处理部分"，
// 因此必须先用 next 暂存后继，否则改完指针就再也找不到剩余链表（最常见的易错点）。
function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  // prev 代表"已反转部分的头"，初始为 null：反转后原头节点的 next 应指向 null（即新链表尾）。
  let curr = head;
  // curr 代表"尚未处理的第一个节点"，从头开始向右推进。

  // 第 2 段：主循环——逐个摘取节点并头插到反转段
  // 不变量：循环体执行前，prev 是已反转子链表的头，curr 是未反转子链表的头。
  // 每次循环后这两个子链表各自都是合法链表，边界条件 curr === null 时未反转段为空。
  while (curr !== null) {
    const next = curr.next;
    // 先保存后继。此时 curr.next 即将被覆盖，next 是找回剩余链表的唯一入口。
    curr.next = prev;
    // 关键一步：把当前节点接到已反转部分的头部（即"反转"这个动作本身）。
    prev = curr;
    // 反转段扩张：prev 前移到刚接上的节点。
    curr = next;
    // 未反转段收缩：curr 移到原来的后继，两个游标同步右移一位。
  }

  return prev;
  // 循环结束时 curr 为 null，prev 指向原链表最后一个节点，也就是新链表的头。
}

// 第 3 段：递归版本（自底向上反转，O(n) 时间 / O(n) 递归栈空间）
// 思路与迭代相反：先递归到链表末端，从尾部往前逐层改写指针。
// 返回值始终是同一个"新头"，即原链表的尾节点；这是递归正确串联的关键。
// 递归版本
function reverseListRecursive(head: ListNode | null): ListNode | null {
  // 第 4 段：递归基——空链表或只剩一个节点时，反转结果就是它自己
  // 这同时兜住了 head.next === null 的末端情况，避免访问 null.next 抛异常。
  if (head === null || head.next === null) {
    return head;
  }
  // 第 5 段：先深度递归处理子链表，再把当前节点接到"子链表反转结果"的尾部
  // 注意：此处 head.next 仍指向子链表原头（也是反转后的尾），所以 head.next.next 才能用来回指 head。
  const newHead = reverseListRecursive(head.next);
  // 子链表 [head.next ...] 已被完全反转，newHead 是整个链表的新头，需要向上透传。
  head.next.next = head;
  // 让子链表的"新尾部"（原 head.next）回指 head，完成本层反转。
  head.next = null;
  // head 成为新链表的尾，必须断开原有的正向指针，否则会形成 head <-> head.next 的双向环。
  return newHead;
  // 始终返回最深层的尾节点作为新头，保证各层返回一致。
}
```

**复杂度分析**:

- 时间复杂度: O(n)
- 空间复杂度: O(1) - 迭代版本，O(n) - 递归版本（调用栈）

---

## 2. 合并两个有序链表

**题号**: 21  
**名称**: Merge Two Sorted Lists  
**链接**: https://leetcode.cn/problems/merge-two-sorted-lists/

**核心思路**: 归并思想，使用虚拟头节点简化操作。

**TypeScript 实现**:

```typescript
function mergeTwoLists(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const dummy = new ListNode(0);
  let curr = dummy;

  while (l1 !== null && l2 !== null) {
    if (l1.val <= l2.val) {
      curr.next = l1;
      l1 = l1.next;
    } else {
      curr.next = l2;
      l2 = l2.next;
    }
    curr = curr.next;
  }

  curr.next = l1 !== null ? l1 : l2;
  return dummy.next;
}
```

**复杂度分析**:

- 时间复杂度: O(n + m)
- 空间复杂度: O(1)

---

## 3. 环形链表

**题号**: 141  
**名称**: Linked List Cycle  
**链接**: https://leetcode.cn/problems/linked-list-cycle/

**核心思路**: Floyd 判圈算法。快慢指针，若相遇则有环。

**TypeScript 实现**:

```typescript
// 第 1 段：单链表判环的函数签名（Floyd 判圈算法 / 龟兔赛跑）
// 选用快慢双指针：慢指针每次走 1 步、快指针每次走 2 步。若存在环，两者必在有限步内相遇；
// 若无环，快指针会率先触达链表末尾。时间 O(n)、空间 O(1)，优于哈希表记录访问节点的 O(n) 空间方案。
function hasCycle(head: ListNode | null): boolean {
  // 第 2 段：空链表与单节点链表的边界剪枝
  // 0 或 1 个节点在结构上不可能形成环，直接返回 false；提前退出也能避免后续初始化的无谓开销。
  if (head === null || head.next === null) {
    return false;
  }

  // 第 3 段：初始化双指针，同时从 head 起步
  // 两者起点相同只是"起跑线"一致，并不代表相遇；真正判环依赖循环中步速差带来的相对位移。
  let slow = head;
  let fast = head;

  // 第 4 段：循环推进双指针并检测相遇
  // 循环条件用 fast 判空：fast 走得快，只要它（或其 next）为 null 就说明已到链尾，必然无环；
  // 该条件也保证 fast.next.next 不会对 null 取属性，避免运行时错误。
  while (fast !== null && fast.next !== null) {
    slow = slow.next;        // 慢指针前进 1 步
    fast = fast.next.next;   // 快指针前进 2 步（上一步已确保 fast.next 非空）

    // 相遇即入环：在环内快指针每轮相对慢指针追上 1 步，因此最多环长步内必定重合。
    if (slow === fast) {
      return true;
    }
  }

  // 第 5 段：循环自然结束说明无环
  // 快指针已走到链表末端而未与慢指针相遇，故不存在环。
  return false;
}
```

**复杂度分析**:

- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

## 4. 删除链表的倒数第 N 个节点

**题号**: 19  
**名称**: Remove Nth Node From End of List  
**链接**: https://leetcode.cn/problems/remove-nth-node-from-end-of-list/

**核心思路**: 快慢指针。先让快指针走 n 步，再一起移动。

**TypeScript 实现**:

```typescript
function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {
  // 第 1 段：建立哨兵（dummy）节点，把"删除头节点"这个特例统一成一般情况
  // 为什么要 dummy：如果 n 恰好等于链表长度，要删的是 head 本身，没有前驱节点可指向；
  // 引入 dummy 后 head 也有了"前驱"，删除逻辑无需任何分支判断。
  // 边界：dummy.next 指向 head，最终返回 dummy.next（即新头）而不是 head。
  const dummy = new ListNode(0);
  dummy.next = head;

  // 第 2 段：初始化快慢指针，二者都从 dummy 出发
  // 关键数据流：两指针之间始终保持固定间距，slow 落后于 fast 的位置正是"被删节点的前驱"。
  // 初始时二者间距为 0，间距会在下一段被拉开到 n+1。
  let fast = dummy;
  let slow = dummy;

  // 第 3 段：让 fast 先走 n+1 步，制造出 n+1 个节点的固定间距
  // 为什么是 n+1 而不是 n：目标是让 slow 停在待删节点的"前驱"上，所以要额外多错开 1 个节点。
  // 易错点：循环条件是 i <= n（共执行 n+1 次）。题目保证 1 <= n <= 链表长度，
  //   因此过程中 fast.next 必不为 null，无需空值保护；若 n 非法则这里会抛错。
  for (let i = 0; i <= n; i++) {
    fast = fast.next;
  }

  // 第 4 段：快慢指针同步前进，直到 fast 越过链尾（null）
  // 原理：此时 fast 距终点 0 步、slow 距终点 n+1 步，slow 恰好落在倒数第 (n+1) 个节点，
  //   也就是待删节点（倒数第 n 个）的前驱。
  // 若 n 等于链表长度，第 3 段结束时 fast 已经为 null，本循环一次都不执行，slow 停在 dummy。
  while (fast !== null) {
    slow = slow.next;
    fast = fast.next;
  }

  // 第 5 段：执行删除并返回结果
  // slow 现在是待删节点的前驱，直接跳过它的后继即完成删除（被跳过的节点会被 GC 回收）。
  // 无需 free：dummy 方案天然覆盖"删除头节点"（此时 slow === dummy，slow.next 即为新头）。
  // 复杂度：时间 O(len)（一次遍历）、空间 O(1)（只用了两个指针和一个哨兵）。
  slow.next = slow.next.next;
  return dummy.next;
}
```

**复杂度分析**:

- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

## 5. 相交链表

**题号**: 160  
**名称**: Intersection of Two Linked Lists  
**链接**: https://leetcode.cn/problems/intersection-of-two-linked-lists/

**核心思路**: 双指针法。A 走完到 B，B 走完到 A，若相交必相遇。

**TypeScript 实现**:

```typescript
// 第 1 段：空链表兜底——任一链表为空就不可能有交点，直接返回 null
// 先处理边界可以避免后续 while 里对 null 做多余的指针切换判断；
// 注意这里的 null 既表示"没有节点"，也是题目要求返回的"无交点"信号，语义被复用。
function getIntersectionNode(headA: ListNode | null, headB: ListNode | null): ListNode | null {
  if (headA === null || headB === null) return null;

  // 第 2 段：双指针初始化——各自从自己链表的头部出发
  // 两个指针最终会走完"两条链表总长"的相同距离，这是让它们能对齐的前提；
  // 用局部变量而非直接改 headA/headB，是为了保留原链头，切换时还能回到对方起点。
  let pA = headA;
  let pB = headB;

  // 第 3 段：核心循环——靠"到达尾部就去对方起点"来补齐长度差
  // 关键数据流：当 pA 走完 A 链就接到 B 链头，pB 走完 B 链就接到 A 链头。
  // 这样两个指针在相遇前都恰好走了 lenA + lenB 步，天然对齐了公共尾巴；
  // 若无交点，二者会在同时变为 null 时相等（null === null），循环结束并返回 null。
  // 易错点：判断必须用 `pA === null`（走到尾部）而不是 `pA.next === null`，否则会漏掉切换时机；
  // 复杂度：时间 O(m + n)，空间 O(1)，因为只用两个指针、没有额外容器。
  while (pA !== pB) {
    pA = pA === null ? headB : pA.next;
    pB = pB === null ? headA : pB.next;
  }

  // 第 4 段：pA === pB 时即为交点（或同为 null 表示无交点），直接返回该节点
  // 有交点时返回的是两条链表共享的同一个节点引用，而非值相等的两个不同节点。
  return pA;
}
```

**复杂度分析**:

- 时间复杂度: O(n + m)
- 空间复杂度: O(1)

---

## 6. 合并 K 个升序链表

**题号**: 23  
**名称**: Merge K Sorted Lists  
**链接**: https://leetcode.cn/problems/merge-k-sorted-lists/

**核心思路**: 最小堆或分治合并。堆的最小复杂度为 O(n log k)。

**TypeScript 实现**:

```typescript
// 第 1 段：建立最小堆，作为整条流水线的“调度中心”
// 思路：k 条链表各自有序，全局最小值必然出现在这 k 个头节点之中，
// 于是只需用一个大小为 k 的最小堆维护“当前各链表未合并部分的头”，
// 每次取出堆顶即为下一个应输出的节点，避免每轮都扫描 k 个头（否则退化 O(N·k)）。
// 代码基于 @datastructures-js/priority-queue：enqueue(元素, 优先级)，dequeue() 返回 { element, priority }。
function mergeKLists(lists: Array<ListNode | null>): ListNode | null {
  const priorityQueue = new MinPriorityQueue();

  // 第 2 段：把所有非空链表头入堆，堆的优先级取节点值 val
  // 边界条件：lists 中允许出现 null（空链表），必须跳过，否则后面取 element.val 会直接抛错。
  // 初始堆大小 ≤ k（k = lists.length），这也是整段算法空间复杂度的来源 O(k)。
  for (const list of lists) {
    if (list !== null) {
      priorityQueue.enqueue(list, list.val); // 优先级即节点值，堆按值升序弹
    }
  }

  // 第 3 段：哨兵节点 + 尾指针，用“尾插法”串接结果链表
  // dummy 充当虚拟头，避免对第一个节点做特殊判断（少写一层 if），
  // curr 始终指向已合并结果链表的最后一个节点，是唯一的可变状态。
  const dummy = new ListNode(0);
  let curr = dummy;

  // 第 4 段：主循环——弹出全局最小节点，接入结果链，再把它的后继“补票”进堆
  // 数据流：dequeue → 接链 → 若 element.next 非空则 enqueue(element.next, element.next.val)。
  // 这一步保证了堆中任何时候都恰好存有每条链表当前的头节点，故堆顶必为全局最小。
  // 易错点：dequeue() 返回的是对象包 { element, priority }，必须取 .element（节点），
  // 不能取 .priority（数值），否则会拼出错误的链表结构。
  while (!priorityQueue.isEmpty()) {
    const { element } = priorityQueue.dequeue(); // 解构出最小节点
    curr.next = element; // 尾插：接到结果链末尾
    curr = curr.next; // 尾指针前移

    // 该节点被消费后，它所在链表的下一个节点成为新的候选头，必须立即入堆
    if (element.next !== null) {
      priorityQueue.enqueue(element.next, element.next.val);
    }
  }

  // 第 5 段：返回哨兵的后继
  // 全部链表都被耗尽时堆自然为空（循环终止条件），因此无需额外检查。
  // 若所有 list 都是 null，dummy.next 仍为 null，正好符合“空结果返回 null”的语义。
  // 整体复杂度：时间 O(N log k)，空间 O(k)，N 为节点总数、k 为链表条数。
  return dummy.next;
}
```

**复杂度分析**:

- 时间复杂度: O(n log k) - k 为链表数量
- 空间复杂度: O(k) - 堆大小

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理系统的万行日志表格 | 合并两个有序链表 | React + react-window，或 AG Grid 的虚拟滚动 | 合并时同时间戳要保序，用 `<=` 取旧数据保证稳定 |
| 低端安卓机首屏图片加载队列 | 反转链表 | Coil 或 Glide 的请求队列 | 反转只作用于当前可视区，回滚时要恢复原顺序 |
| 多人协作白板的撤销重做 | 反转链表 | Yjs 等 CRDT 库 + 本地操作日志 | 重放前按 opId 去重，避免网络回包重复执行 |
| 地图导航的多路候选路线归并 | 合并 K 个升序链表 | 优先队列 + K 路归并 | 各路数据源的时间戳要先对齐到同一基准 |
| 音乐 App 的"上一首"播放历史 | 反转链表 | SQLite 表 + 内存链表缓存 | 跨设备同步时以服务端返回顺序覆盖本地链 |
| 分布式追踪的尾采样丢弃 | 删除倒数第 N 个节点 | OpenTelemetry Collector 的 tail sampling | 并发追加 span 时用锁或原子指针保护头尾 |
| 浏览器 DevTools 网络面板日志 | 环形链表 | 环形缓冲区 + 双向链表 | 读指针与写指针的可见性要用原子变量或单线程约束 |
| Git 服务的合并基点计算 | 相交链表 | Git 提交图遍历 | 提交图是 DAG 不是单链表，需先按代际排序 |
| 代码编辑器的多光标区间同步 | 合并两个有序链表 | Monaco Editor 的装饰区间 | 插入与删除对偏移量的影响方向相反，要分别处理 |

### 三个场景拆解

#### 场景 1：后台管理系统的万行日志表格

**业务背景**：运维后台一次查询返回十万行日志，用户停留时每秒新到两百行。每次全量重排会让主线程出现长任务，滚动掉帧。

**怎么用本页知识解决**：思路是把已渲染的窗口段和新到批次都当作按时间升序的链表，只做一次两路归并，不重排全量数据。

```js
// 按 timestamp 升序合并两段已排序的日志链表
function merge(logs, batch) {
  const head = { ts: -Infinity };  // 哨兵节点，省掉头节点特判
  let tail = head;                 // tail 指向结果链表的尾部
  while (logs && batch) {          // 两段都没走完就继续比较
    if (logs.ts <= batch.ts) {     // 相等时取旧数据，保证稳定排序
      tail.next = logs;
      logs = logs.next;
    } else {
      tail.next = batch;
      batch = batch.next;
    }
    tail = tail.next;              // 尾指针前移，追加是 O(1)
  }
  tail.next = logs || batch;       // 接上剩余未走完的那一段
  return head.next;                // 哨兵不进结果
}
```

- 哨兵节点把"结果为空"和"插入到头部"两种情况合并成一条分支。
- 比较用 `<=` 而不是 `<`，时间戳相同的日志保持原有先后。
- 归并只改 `next` 指针，不复制日志对象，内存增量与批次大小同阶。
- 结果链表可以直接交给虚拟滚动组件按索引切片，不需要转回数组。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板录制一段滚动，看 Long Task 条数和总阻塞时间。用 `performance.mark` / `performance.measure` 包住 `merge` 调用，统计单次耗时 P95。用 `requestAnimationFrame` 打点统计滚动帧间隔 P95。

**什么时候不该用**：如果新日志来自多台机器且时钟漂移超过业务容忍阈值，合并前必须先排序，此时两路归并不成立。如果表格只展示最近 100 行并用固定环形缓冲，直接覆盖尾指针比走一次归并少一层循环。

#### 场景 2：多人协作白板的撤销重做

**业务背景**：一次会议白板会产生上千次绘制与拖拽操作，撤销要按逆序回放。用户按下撤销后需要立刻看到画面变化，重做栈要整体倒过来执行。

**怎么用本页知识解决**：思路是把操作日志存成单链表，撤销时就地反转，再顺序调用每个操作的逆操作，避免为倒序申请一份数组。

```js
// 就地反转操作链表，返回新的头节点
function reverse(head) {
  let prev = null;            // prev 是已经反转完成那段的头
  let cur = head;             // cur 是还没处理那段的头
  while (cur) {
    const next = cur.next;    // 先缓存后继，防止断链后找不到
    cur.next = prev;          // 当前节点接到已反转段的前面
    prev = cur;               // 已反转段的头前移一位
    cur = next;               // 待处理段的头前移一位
  }
  return prev;                // 循环结束时 prev 指向原链表尾
}
```

- 反转是 O(n) 时间、O(1) 额外空间，只改指针不动业务数据。
- 每个操作节点里存 opId 和逆操作参数，反转后按顺序调用 `applyInverse`。
- 如果撤销只需要回退一步，可以直接用双端栈，不必反转整条链。
- 反转前后都要按 opId 去重，防止网络回包导致同一操作被执行两次。

**怎么度量收益**：用 `performance.now()` 包住整次撤销，记录 P95 耗时。用 Chrome DevTools 的 Memory 面板对比反转前后的堆快照，确认堆增长不随操作数线性上升。

**什么时候不该用**：如果操作日志存在数据库且撤销范围由时间条件决定，交给 SQL 的 `ORDER BY ... DESC` 处理，不要在应用层反转。如果操作之间存在依赖（后一步依赖前一步的选择集），反转顺序执行会破坏依赖，需要按依赖图拓扑排序。

#### 场景 3：分布式追踪的尾采样丢弃

**业务背景**：一次请求链路可能产生几百条 span，采样器只保留最近 N 条用于故障定位。采样器要在常数时间内从链头摘掉多余的那一条，不能每次重建数组。

**怎么用本页知识解决**：思路是用快慢指针定位倒数第 N+1 个节点，直接改它的 `next`，一次遍历完成。

```js
function dropNthFromEnd(head, n) {
  const dummy = { next: head };   // 哨兵，统一删除头节点的写法
  let fast = dummy;
  let slow = dummy;
  for (let i = 0; i <= n; i++) {  // 快指针先走 n+1 步
    fast = fast.next;
  }
  while (fast) {                  // 快慢指针同步前进
    fast = fast.next;
    slow = slow.next;             // 快指针到尾时慢指针停在待删节点前一个
  }
  slow.next = slow.next.next;     // 摘掉倒数第 n 个节点
  return dummy.next;              // 返回真实头节点
}
```

- 快指针先走 n+1 步是关键，多走一步才能让慢指针停在待删节点的前驱。
- 哨兵节点让"删除头节点"和"删除中间节点"共用一条代码路径。
- 整个过程一次遍历，时间 O(L)、空间 O(1)，L 是当前链长。
- 追加 span 与摘除 span 会在两端并发发生，头尾指针要用锁或原子操作保护。

**怎么度量收益**：用 k6 或 wrk 压固定 QPS，观察 P99 延迟是否随保留条数 N 线性变化。用 Prometheus 的 `process_resident_memory_bytes` 观察常驻内存是否稳定。用 Jaeger 查询单条 trace，核对保留的 span 数量等于 N。

**什么时候不该用**：如果业务要求保留链路最早的 N 条，删除位置在尾部而不是倒数第 N 个，快慢指针的走法完全不同。如果保留策略按服务名或错误码分组，单条链无法表达分组语义，需要每组一条链或换成环形缓冲。

### 行业先进实践

Linux 内核链表（出处：Linux 内核源码 `include/linux/list.h` 与内核文档）。做法是把 `next` / `prev` 抽成独立的 `list_head`，节点嵌进业务结构体，同一个对象可以同时挂在多条链上。因为指针操作与业务字段解耦，删除节点时不需要知道外层类型。你的项目可以把队列节点压缩成只含指针的小结构，业务字段放外层，便于同一对象进入多条队列。

OpenJDK 的 ArrayDeque 推荐（出处：OpenJDK `java.util.ArrayDeque` 类文档）。类文档把 ArrayDeque 列为栈与队列的推荐实现，指出数组型结构在访问模式上占用连续内存。你的项目可以约定：只有需要频繁在中间插入删除时才用链表，栈和队列优先用数组。需核对官方文档：该类文档中关于容量增长与 fail-fast 行为的原文表述。

Redis quicklist（出处：Redis 官方文档的 list 数据类型说明）。做法是链表节点里放一块 listpack 压缩块，块内元素连续存放。这样把每个元素的指针开销摊薄到一整块元素上。你的项目可以在链表节点里存一批元素而不是一个元素。需核对官方文档：quicklist 当前的配置项名称与默认值。

OpenTelemetry Collector 的 tail sampling processor（出处：opentelemetry-collector-contrib 仓库与 OpenTelemetry 文档）。做法是在 collector 内按时间窗缓存 trace 数据，窗口结束后再按策略决定是否保留。把"保留最近 N 条"的链表操作放在 collector 侧，业务代码不必感知。需核对官方文档：`decision_wait` 与 `num_traces` 的语义与默认值。

Git 的 merge-base（出处：Git 官方文档 `git-merge-base`）。文档说明该命令用于找出两个提交的最近共同祖先。它说明双指针求交点的思路在 DAG 上不成立，因为每个节点可能有多个父节点。你的项目遇到图而非链时，要先把节点按代际排序再比较。

### 从学到用：落地路线

1. 在日志表格的增量渲染上试点，只改一处合并逻辑。验收标准：新日志插入路径的单元测试覆盖时间戳相等、批次为空、批次跨越窗口三种输入。
2. 用 Chrome DevTools Performance 录制十分钟滚动，采集 Long Task 条数与滚动帧间隔 P95。验收标准：单次合并耗时 P95 低于 8 毫秒，且堆快照不随查询结果行数线性增长。
3. 把同一套链表工具函数推广到播放历史与撤销重做两处，统一放进入共享的工具包。验收标准：三处调用点共用同一份反转与归并实现，测试用例集中在一个文件。
4. 在 CI 里加一条基于固定输入的性能回归用例，阈值取试点阶段实测值的两倍。验收标准：合并耗时超标时流水线失败，并输出对比的基线数值。

### 动手作业

**目标**：写一个内存日志窗口模块，支持按时间升序追加日志，并在窗口超过上限时按策略丢弃。

**步骤**：

1. 定义节点结构，字段只放 `ts`、`seq` 和 `next`，`seq` 用于时间戳相同时保序。
2. 实现 `merge(logs, batch)`，用哨兵节点，返回新头节点。
3. 实现 `reverse(head)`，用迭代方式，不申请与节点数同规模的数组。
4. 实现 `dropNthFromEnd(head, n)`，用快慢指针，处理删除头节点的情况。
5. 给三个函数各写一组边界用例：空链表、单节点、全部元素相等。
6. 写一个压测脚本，按每秒两百行速率追加十分钟，记录每次合并耗时。
7. 输出一份结果表，列出耗时 P50 / P95 与堆内存峰值。

**验收标准**：

- 三个函数的单元测试全部通过，覆盖空链表与单节点输入。
- 时间戳相等的日志在合并后保持原有先后顺序。
- 压测十分钟后，窗口节点数稳定在上限，常驻内存不持续上升。
- 单次合并耗时 P95 低于 8 毫秒，结果可由脚本复现。
- 代码中不存在递归实现，深链表不会触发栈溢出。

