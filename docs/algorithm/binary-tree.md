---
title: 二叉树题型
description: LeetCode Hot 100 二叉树题目：遍历、二叉搜索树验证、层序遍历、深度与路径和。
tags:
  - algorithm
  - leetcode
date: 2026-05-17
---

# 二叉树题型

## 1. #94 二叉树的中序遍历

**核心思路**：深度优先搜索（DFS），左-根-右的遍历顺序。递归版本简洁，迭代版本使用栈模拟递归过程。

**核心实现**：

```typescript
// 递归版本
function inorderTraversal(root: TreeNode | null): number[] {
  const result: number[] = [];
  
  function inorder(node: TreeNode | null): void {
    if (!node) return;
    inorder(node.left);
    result.push(node.val);
    inorder(node.right);
  }
  
  inorder(root);
  return result;
}

// 迭代版本（使用栈）
function inorderTraversalIterative(root: TreeNode | null): number[] {
  const result: number[] = [];
  const stack: TreeNode[] = [];
  let current = root;
  
  while (current || stack.length > 0) {
    // 先遍历到最左节点
    while (current) {
      stack.push(current);
      current = current.left;
    }
    // 弹出栈顶，访问根节点
    current = stack.pop()!;
    result.push(current.val);
    // 转向右子树
    current = current.right;
  }
  
  return result;
}
```

**复杂度**：时间 O(n)，空间 O(h)，其中 h 为树的高度（递归栈深度）。

---

## 2. #98 验证二叉搜索树

**核心思路**：利用 BST 的性质：左子树所有节点 < 根节点 < 右子树所有节点。中序遍历 BST 会得到递增序列。递归时传递上下界约束。

**核心实现**：

```typescript
// 第 1 段：入口 —— 用「开区间 (min, max)」刻画 BST 约束
// 为什么直接给根传 ±Infinity：根没有祖先限制，(-∞, +∞) 等价于"无约束"，
// 这样省掉了对根的特判。注意是"开"区间，所以后面用 <= / >= 判非法（等值也不允许）。
// 约束只从父节点向子节点单向传递，递归深度即树高 h，额外空间 O(h)（退化链表 O(n)）。
function isValidBST(root: TreeNode | null): boolean {
  // 第 2 段：递归校验 —— 当前节点必须落在祖先链传下来的 (min, max) 之内
  // 易错点 1：不能只比较父子（左<父<右），必须携带整条祖先链的边界；
  //   反例：5 的右子树里出现 3，父子比较看似合法，却违反了根 5 给出的下界。
  // 易错点 2：用 number 承载 min/max 对普通整数树成立；若节点值本身可能是 ±Infinity，边界语义会失真。
  function validate(node: TreeNode | null, min: number, max: number): boolean {
    // 第 3 段：空节点视为满足约束（空树合法，也是叶子递归的收敛出口）
    if (!node) return true;
    
    // 第 4 段：越界判定 —— 开区间语义，等于边界同样非法（BST 不允许重复键）
    if (node.val <= min || node.val >= max) {
      return false;
    }
    
    // 第 5 段：分治下推 —— 关键是"换边"：左子树的新上界收紧为 node.val，右子树的新下界抬高为 node.val
    // 用 && 短路：左子树一旦非法，右子树就不必再算，实践中常可省掉大量递归。
    // 复杂度：时间 O(n)（每个节点至多访问一次），空间 O(h) 递归栈。
    return validate(node.left, min, node.val) && 
           validate(node.right, node.val, max);
  }
  
  return validate(root, -Infinity, Infinity);
}

// 第 6 段：中序遍历版本（验证递增性）—— 与上下界法等价的另一条思路
// 原理：BST 的中序遍历序列必然严格递增。好处是递归时不必沿栈携带 min/max，只需记住"前驱值"。
// 数据流：prev 是闭包中的可变状态，被整棵树的递归共享，始终表示中序序列里上一个被访问的元素。
function isValidBSTInorder(root: TreeNode | null): boolean {
  let prev: number = -Infinity;
  
  // 第 7 段：中序递归（左 → 根 → 右），递增性检查放在"根"这一步做
  // 边界条件：prev 哨兵取 -Infinity，隐含要求所有节点值 > -Infinity；
  //   若 -Infinity 是合法键值，该哨兵失效，得改用 boolean 标记或 null 表示"尚无前驱"。
  function inorder(node: TreeNode | null): boolean {
    if (!node) return true;
    
    // 第 8 段：先处理左子树，并靠返回值短路 —— 左侧已破坏递增就无需再验证右侧
    // 这个早退让算法在遇到明显非法结构时不必遍历全树（最坏仍是 O(n)，栈空间 O(h)）。
    if (!inorder(node.left)) return false;
    
    // 第 9 段：访问当前节点 —— 与前驱比较 + 更新前驱
    // 用 <=（严格递增）：BST 定义下重复键被视为非法。
    // 易错点：prev = node.val 必须写在比较之后，否则就成了拿自己和自己比，恒为合法。
    if (node.val <= prev) return false;
    prev = node.val;
    
    return inorder(node.right);
  }
  
  return inorder(root);
}
```
**复杂度**：时间 O(n)，空间 O(h)。

---

## 3. #102 二叉树的层序遍历

**核心思路**：广度优先搜索（BFS），使用队列按层处理。记录每层节点数量，逐一处理同一层的节点。

**核心实现**：

```typescript
// 第 1 段：空树快速返回（递归/迭代遍历的共同前置守卫）
// 若 root 为 null，层级序列应为空数组而非 [null] 之类的占位，因此提前 return。
// 这一守卫同时保证后续 queue 初始化为 [root] 时 root 一定非空，避免类型与运行时双重判空。
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  
  // 第 2 段：结果容器与 BFS 队列的初始化
  // result 按“层”聚合，外层下标即层号，天然满足题目要求的二维结构。
  // queue 用数组充当 FIFO 队列，初始只放根节点，代表第 0 层的全部元素。
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  
  // 第 3 段：外层循环——每轮消费掉“当前整层”，并快照层大小
  // while 判空而非固定层数，是因为树深度事先未知，队列空即遍历完成。
  // levelSize 必须在此刻取快照：内层循环会不断 push 下一层节点，
  // 若在循环条件里直接写 queue.length，就会把新入队的子节点也算进本层，
  // 导致层级被“压平”成一条线，这是本题最常见的易错点。
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: number[] = [];
    
    // 第 4 段：内层循环——逐个出队本层节点，收集值并按序播种下一层
    // 循环上界是快照值 levelSize，恰好出队本层全部节点，不多不少。
    // 先左后右的入队顺序，保证同一层内是同层从左到右的序列。
    // shift() 从数组头部取出元素：数组实现下是 O(n) 搬移，n 为队列长度；
    // 整体最坏时间 O(n^2)，若追求严格 O(n) 应改用索引指针或双端队列。
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      currentLevel.push(node.val);
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    // 第 5 段：本层收集完毕，整体挂到结果上
    // 放在 for 之后而非内部，才能确保一个 currentLevel 只对应一层，
    // 保证输出层序与树的深度严格对齐。
    result.push(currentLevel);
  }
  
  // 第 6 段：返回层序遍历结果
  // 时间复杂度 O(n)（节点各进出队一次，忽略 shift 搬移则为 O(n)，否则 O(n·h) 量级）；
  // 空间复杂度 O(w)，w 为树的最大宽度，即队列峰值大小（也常写作 O(n) 上界）。
  return result;
}
```
**复杂度**：时间 O(n)，空间 O(w)，w 为最大层宽度（最坏情况 O(n)）。

---

## 4. #104 二叉树的最大深度

**核心思路**：后序遍历，先计算左右子树的深度，再取较大值加1。也可以用层序遍历，记录层数。

**核心实现**：

```typescript
// 递归版本（后序遍历）
function maxDepth(root: TreeNode | null): number {
  // 第 1 段：空树判定——整个递归的终止条件
  // 递归必须有出口，否则会一路下探到 null 之上再访问 .left 而崩溃；
  // 这里把"空节点的高度"定义成 0，于是叶子节点的高度自然满足
  // max(0,0)+1=1，无需为叶子单独写特判分支。
  if (!root) return 0;
  
  // 第 2 段：先递归求解左右两个子问题（后序：先拿子结果再汇总）
  // 本层的答案依赖两棵子树的高度，所以必须先算完；两次调用彼此独立，
  // 概念上可并行，但当前是同一线程内的串行调用，属于典型的"分治"骨架。
  const leftDepth = maxDepth(root.left);
  const rightDepth = maxDepth(root.right);
  
  // 第 3 段：合并子结果，得到本层高度
  // 树高由更深的一侧决定，故取 max；+1 是加上当前根节点本身占据的那一层。
  // 复杂度：时间 O(n)（每个节点恰好被访问一次），空间 O(h)（递归栈深度）；
  // 最坏情形是链状树 h=n，退化为 O(n)，平衡树才接近 O(log n)。
  return Math.max(leftDepth, rightDepth) + 1;
}

// 层序遍历版本
function maxDepthBFS(root: TreeNode | null): number {
  // 第 1 段：空树兜底
  // BFS 同样要拦住 null，否则会把 null 当作节点塞进队列，
  // 后续在读取 node.left / node.right 时立刻抛 TypeError。
  if (!root) return 0;
  
  // 第 2 段：状态初始化
  // depth 语义是"已经完整处理完的层数"，也就是最终要返回的高度；
  // queue 用数组模拟 FIFO 队列，初始仅含根节点，即第 1 层。
  let depth = 0;
  const queue: TreeNode[] = [root];
  
  // 第 3 段：按层推进的主循环
  // 每进入一轮 while，队列里留存的节点恰构成完整的一层，所以进来就先给深度 +1；
  // 循环条件用动态的 length>0，而不是预设层数，因此对任意形状的树都成立。
  while (queue.length > 0) {
    depth++;
    const levelSize = queue.length;
    
    // 第 4 段：消费一整层，同时把下一层注入队尾
    // 关键易错点：levelSize 必须在 for 开始前"快照"固定下来。
    // 因为循环体内部 push 子节点会让 queue.length 增长，若拿 queue.length
    // 当上界，就会把下一层节点也一并弹出，层边界被抹平导致答案偏大。
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      // 只有非空子节点才入队，保证队列里始终都是真实节点，
      // 与上面的快照机制配合，才能严格实现"逐层推进"。
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  
  // 第 5 段：返回累计层数即最大深度
  // 复杂度：时间 O(n)；空间 O(w)，w 为树的最大宽度（队列的峰值大小），
  // 完全二叉树最后一层可达 n/2，故最坏仍是 O(n)。相比递归版，它把
  // 深度信息转移到了堆上的队列里，避免了深树递归可能引发的栈溢出。
  return depth;
}
```
**复杂度**：时间 O(n)，空间 O(h)。

---

## 5. #124 二叉树中的最大路径和

**核心思路**：后序遍历，每个节点返回向上延伸的最大路径贡献（max(0, 左贡献, 右贡献) + 节点值），同时更新全局最大路径和（左右贡献 + 节点值）。

**核心实现**：

```typescript
function maxPathSum(root: TreeNode | null): number {
  let maxSum = -Infinity;
  
  function dfs(node: TreeNode | null): number {
    if (!node) return 0;
    
    const leftGain = Math.max(0, dfs(node.left));
    const rightGain = Math.max(0, dfs(node.right));
    
    // 更新最大路径和（经过当前节点的路径）
    const currentPathSum = leftGain + rightGain + node.val;
    maxSum = Math.max(maxSum, currentPathSum);
    
    // 返回向上延伸的最大贡献
    return Math.max(leftGain, rightGain) + node.val;
  }
  
  dfs(root);
  return maxSum;
}
```

**复杂度**：时间 O(n)，空间 O(h)。

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理万行表格的分类汇总与可视区渲染 | 中序遍历的迭代写法、用栈保存游标 | 虚拟滚动 + 二叉搜索树索引 + 显式栈迭代器 | 不要一次性递归全量遍历；每帧只输出可视行数 |
| 低端安卓首屏嵌套评论列表 | 层序遍历、最大深度限制 | 队列惰性展开 + RecyclerView 按层适配器 | 用索引指针代替 shift；深度超限改成“展开更多” |
| 多人协作白板图层 z-order 重排 | 中序遍历、验证二叉搜索树的区间判断 | 命令栈 + 不可变树 + 游标保存 | 撤销需要保存遍历栈；重复 zIndex 会破坏严格 BST |
| 在线代码评审的目录 diff | 层序遍历定位变更层级、最大深度避免全量展开 | 广度优先队列 + 目录树 diff 算法 | 深目录全量展开会占满内存；只展开到变更层级 |
| 配置中心 JSON Schema 生成表单 | 中序遍历排序键、验证 BST 的上下界 | 有序键遍历 + schema 校验器 | 键必须唯一且可排序；空节点边界要显式处理 |
| 数据库索引页健康巡检 | 验证二叉搜索树、中序升序检查 | 索引页读取器 + 单调栈校验 | 只检查相邻节点不够，要验证全局上下界 |
| 游戏场景树包围盒裁剪渲染 | 最大深度、路径和思想的贡献聚合 | 四叉/八叉树 + 深度上限 + 剔除队列 | 每个节点只计一次贡献，防止重复计数 |
| 表达式编辑器自动补全 | 中序遍历生成符号表、层序构建候选树 | 前缀树 + 遍历缓存 + 增量更新 | 变更后增量更新，不全量重建树 |

### 三个场景拆解

#### 场景 1：后台管理万行表格的分类汇总与可视区渲染

**业务背景**：后管系统一次返回 1 万多行订单，分类汇总在前端完成。本地构造 10000 行、最深 5000 层的二叉树时，递归中序会触发栈溢出或长任务。

**怎么用本页知识解决**：把分类树抽象成二叉搜索树，按中序输出排序后的行。下面只取当前屏需要的 limit 行，剩余部分用 next 和 stack 继续遍历。

```javascript
function inorderWindow(root, limit) {
  const stack = [];      // 显式栈，替代递归调用栈
  let node = root;
  let count = 0;
  const rows = [];
  while ((node || stack.length) && count < limit) {
    while (node) {       // 先压入所有左子节点
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();  // 取出当前中序节点
    rows.push(node.row); // 输出可视区要渲染的行
    count += 1;
    node = node.right;   // 再进入右子树
  }
  return { rows, next: node, stack };
}
```

- 先压入左链，再弹栈输出，最后进入右子树，得到左-根-右顺序。
- 每次只取 limit 行，不构建完整有序数组，主线程占用受控。
- next 与 stack 组成游标，滚动到下一屏时继续遍历，不必从头开始。
- 与递归版对比：在深度 5000 的链式树上跑 10 次，记录堆栈错误次数。

**怎么度量收益**：看可视区更新耗时、长任务次数、滚动帧率、最大调用栈深度。工具用 Chrome DevTools Performance、Lighthouse 的 Total Blocking Time、performance.measure 打点。方法：同一份 10000 行数据分别用递归中序和迭代中序，各跑 10 次取 P95 比较。

**什么时候不该用**：
- 服务端已经完成按分类排序和汇总，前端再来一遍是重复计算。
- 业务顺序不是稳定按键排序，例如按人工拖拽顺序，中序会给出错误顺序。

#### 场景 2：低端安卓首屏嵌套评论列表

**业务背景**：低端安卓机打开有大量嵌套回复的评论页，无限递归展开会造成冷启动卡顿和崩溃。测试中构造 3000 层评论链，把首屏加载时间录进 Perfetto 对比。

**怎么用本页知识解决**：评论树首屏不需要全部展开。用队列做层序访问，depth 超过 maxDepth 的节点不进入可见列表，下层用“展开更多”再请求。

```javascript
function flattenVisibleComments(root, maxDepth) {
  const q = [{ node: root, depth: 0 }];  // 队列保存待访问节点和深度
  let head = 0;
  const flat = [];
  while (head < q.length) {              // 用 head 索引读取队列头
    const { node, depth } = q[head++];
    if (!node || depth > maxDepth) continue; // 超过展开上限的节点丢弃
    flat.push(node);                         // 生成可见列表项
    q.push({ node: node.left, depth: depth + 1 });
    q.push({ node: node.right, depth: depth + 1 });
  }
  return flat;
}
```

- 层序保证上层先进入渲染列表，首屏优先级高于深层回复。
- maxDepth 限制每轮展开节点数，减少低端机首帧的布局和测量开销。
- 用 head 索引读取队列头，避免数组头移出带来的连续移动。
- 深于 maxDepth 的节点不丢弃业务数据，而是挂到“展开更多”入口。

**怎么度量收益**：看首屏可交互时间、启动崩溃率、滚动掉帧率。工具用 Android Studio Profiler、Firebase Crashlytics、Perfetto。方法：A/B 两组，一组 maxDepth 设为 4 且提供“展开更多”，一组全量递归展开；各测 20 次冷启动记录 P95。

**什么时候不该用**：
- 评论排序按热度或人工置顶，层序结果与业务顺序无关。
- 首屏要求一次展示全部楼层，浅层展开会产生大量“展开更多”点击。

#### 场景 3：多人协作白板图层 z-order 重排

**业务背景**：协作白板要求每层按 z-index 稳定叠加，撤销重排要能回到上一次遍历位置。生成 20000 个随机图层和 5000 层深树，测量重排耗时和游标保存内存。

**怎么用本页知识解决**：图层树按 zIndex 组织为 BST。中序游标保存 node 和 stack，撤销时恢复，避免递归全量重排；验证器用上下界挡住重复 zIndex。

```javascript
function createZOrderCursor(root) {
  let node = root;
  const stack = [];
  return {
    next() {
      while (node) {              // 把左链压入栈
        stack.push(node);
        node = node.left;
      }
      if (!stack.length) return { done: true };
      const current = stack.pop(); // 弹出当前 z-order 最小的图层
      node = current.right;        // 下一次从右子树继续
      return { value: current, done: false };
    },
    save() { return { node, stack: stack.slice() }; } // 保存游标供撤销
  };
}
```

- 左根右输出得到稳定的 z-order 渲染顺序。
- save 保存 node 和 stack 切片，撤销时恢复遍历位置。
- 每次 next 只访问单个节点，不重建整棵树的顺序。
- 用验证 BST 的上下界检查 zIndex，重复或乱序节点在插入阶段被拦截。

**怎么度量收益**：看单次重排耗时、撤销恢复耗时、脏区刷新次数、顺序错误率。工具用 Vitest 基准、Chrome DevTools Performance、自定义埋点。方法：在 20000 节点树上连续做 100 次重排和 50 次撤销，记录 P95 和顺序校验失败数。

**什么时候不该用**：
- 图层允许相同 zIndex 或循环引用，严格 BST 校验会拒绝合法业务数据。
- 只需要局部重排且树结构每次大改时，游标恢复的复杂度高于全量重建。

### 行业先进实践

- 无栈 successor 迭代（出处：Linux 内核红黑树 rbtree 文档）。红黑树节点保存 parent 指针，通过 successor 在 O(1) 均摊时间完成无栈遍历，不依赖宿主调用栈。项目可给树节点增加 parent 指针，对外暴露 next() 游标。
- 工作队列标记对象图（出处：V8 官方博客 Orinoco 垃圾回收器）。垃圾回收标记阶段用工作队列而非递归遍历对象引用，防止深层对象图爆栈。项目可把目录扫描和依赖图遍历改成显式队列。
- amcheck 校验 B-tree 结构（出处：PostgreSQL amcheck 扩展文档）。扩展通过检查键顺序和页内上下界，发现索引损坏。项目可在构建 BST 后增加一次上下界校验，并纳入测试。
- 扁平化嵌套状态（出处：React 官方文档 Choosing the State Structure）。建议用扁平数组和 ID 引用代替深层嵌套对象，减少更新遍历深度。项目可给树节点建立 Map 索引，遍历时只访问 ID。
- 栈大小保护需核对（出处：需核对官方文档：Node.js `--stack-size` 选项与 V8 栈默认值）。不同版本默认栈大小不同，深递归在 CI 和本地表现不一致。核对后决定是否引入迭代版，或设置栈上限。

### 从学到用：落地路线

1. 第 1 步：在非核心模块试点，例如后台分类树把递归中序改成迭代中序。验收标准：10000 节点链式输入无栈溢出，单测通过。
2. 第 2 步：用基准脚本记录递归与迭代的耗时、最大栈深度，并跑验证 BST 用例。验收标准：P95 耗时差异有记录，错误树被拦截。
3. 第 3 步：在代码评审中加入深度遍历限制检查，推广到评论树、目录树等模块。验收标准：至少 3 个模块使用迭代遍历或显式深度上限。
4. 第 4 步：在 CI 中增加性能与深度回归测试，超过阈值阻断合并。验收标准：性能预算和单测全绿。

### 动手作业

目标：实现一个订单二叉搜索树的遍历与健康检查 CLI。

步骤：
1. 定义订单节点类型：id、amount、left、right。
2. 构造测试数据：随机生成 10000 个订单节点，键为 amount。
3. 实现迭代中序遍历，输出升序 amount 序列。
4. 实现验证二叉搜索树函数，用上下界检查每个节点。
5. 实现层序遍历计算最大深度，用索引队列避免 shift 开销。
6. 实现迭代后序计算最大路径和。
7. 编写基准脚本，运行递归与迭代版本各 10 次并输出 P95。

验收标准：
- 10000 节点链式树不抛 RangeError，中序输出长度等于 10000。
- 验证器能定位 1 个故意放错的节点并返回 false。
- 最大深度和最大路径和分别匹配单元测试期望值。
- 基准报告包含 P95 耗时和最大栈深度采集。
- 操作说明清楚，另一人可按文档在 5 分钟内复现实测。

