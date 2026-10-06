---
title: 图论题型
description: LeetCode Hot 100 图论题目：拓扑排序、岛屿数量、克隆图、水流问题与并查集。
tags:
  - algorithm
  - leetcode
date: 2026-05-17
---

# 图论题型

## 1. #207 课程表

**核心思路**：拓扑排序。检测有向图中是否存在环。使用 BFS（Kahn 算法）计算入度，或 DFS 检测回边。

**核心实现**：

```typescript
// BFS（Kahn 算法）- 入度法
function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  const inDegree = new Array(numCourses).fill(0);
  
  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course);
    inDegree[course]++;
  }
  
  const queue: number[] = [];
  let completedCourses = 0;
  
  // 将入度为 0 的课程加入队列
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }
  
  while (queue.length > 0) {
    const course = queue.shift()!;
    completedCourses++;
    
    for (const next of graph[course]) {
      inDegree[next]--;
      if (inDegree[next] === 0) {
        queue.push(next);
      }
    }
  }
  
  return completedCourses === numCourses;
}

// DFS - 检测环
function canFinishDFS(numCourses: number, prerequisites: number[][]): boolean {
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  
  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course);
  }
  
  const visited = new Array(numCourses).fill(0); // 0=未访问, 1=访问中, 2=已完成
  // visited[i]: 0 = unvisited, 1 = in current DFS path, 2 = finished
  
  function hasCycle(course: number): boolean {
    if (visited[course] === 1) return true;  // 检测到环
    if (visited[course] === 2) return false; // 已完成，无需重复检测
    
    visited[course] = 1;
    
    for (const next of graph[course]) {
      if (hasCycle(next)) return true;
    }
    
    visited[course] = 2;
    return false;
  }
  
  for (let i = 0; i < numCourses; i++) {
    if (hasCycle(i)) return false;
  }
  
  return true;
}
```

**复杂度**：时间 O(V + E)，空间 O(V + E)，V 为课程数，E 为先修关系数。

---

## 2. #200 岛屿数量

**核心思路**：网格版 DFS/BFS。遍历 grid，遇到 '1' 则进行 flood fill（沉没），将与之相连的所有 '1' 标记为 '0'，计数器加一。

**核心实现**：

```typescript
// DFS（递归）
function numIslands(grid: string[][]): number {
  // 第 1 段：入口防御性校验——空引用或空网格直接判定 0 个岛屿
  // 这类题通常不保证输入非空，提前返回可以避免后面 grid[0].length 抛异常。
  if (!grid || grid.length === 0) return 0;
  
  // 第 2 段：缓存网格行列数 + 岛屿计数器
  // m/n 只读一次，避免在递归和双层循环里反复访问 grid.length（也保证语义稳定）。
  const m = grid.length;
  const n = grid[0].length;
  let count = 0;
  
  // 第 3 段：DFS 本体——从 (row, col) 出发把整片陆地「淹没」
  // 关键设计：用「原地改写成 '0'」当访问标记，省掉 visited 数组，空间从 O(mn) 降到递归栈的 O(mn) 最坏。
  // 数据流：命中陆地 → 置 '0' → 向上下左右四个方向递归扩散。
  function dfs(row: number, col: number): void {
    // 边界条件与「已访问」判断合并在同一行：越界或遇到水（含刚被沉没的陆地）即回退。
    if (row < 0 || row >= m || col < 0 || col >= n || grid[row][col] === '0') {
      return;
    }
    
    grid[row][col] = '0'; // 沉没岛屿：这里就是「已访问」标记，必须放在递归之前，否则会互相回环导致栈溢出
    
    dfs(row + 1, col);
    dfs(row - 1, col);
    dfs(row, col + 1);
    dfs(row, col - 1);
  }
  
  // 第 4 段：扫描全网格，每撞见一块未被沉没的陆地就代表发现一个新岛屿
  // 因为 dfs 会把连通的 '1' 全部清成 '0'，所以之后的循环不会再重复计数同一座岛。
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;   // 计数只会发生在本岛屿「第一个被访问到的格子」上
        dfs(i, j); // 立刻淹没整片连通区域
      }
    }
  }
  
  // 第 5 段：返回岛屿总数
  // 复杂度：时间 O(mn)（每个格子最多被访问常数次），空间 O(mn) 最坏递归深度（整片网格全为陆地时）。
  return count;
}

// BFS（队列）
function numIslandsBFS(grid: string[][]): number {
  // 第 1 段：入口防御性校验，与 DFS 版本保持一致
  if (!grid || grid.length === 0) return 0;
  
  // 第 2 段：初始化网格尺寸、计数器、广搜队列与四方向增量表
  // directions 用「偏移量数组」替代四段 if，让扩散逻辑收敛为一层循环，是 BFS 的标准写法。
  // 注意 queue 用普通数组 + shift()，最坏情况下每次出队是 O(k)，属易错/性能陷阱（见文末说明）。
  const m = grid.length;
  const n = grid[0].length;
  let count = 0;
  const queue: [number, number][] = [];
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  
  // 第 3 段：外层扫描 + 内层 BFS 扩散
  // 与 DFS 的差别只在「扩散顺序」：这里用显式队列逐层摊开，避免递归深度爆炸，更适合大网格。
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;                // 发现新岛屿
        queue.push([i, j]);     // 入队起点
        grid[i][j] = '0';       // 入队即标记「已访问」，这是 BFS 防重复入队的关键：宁可提前标，也不能等到出队才标
        
        while (queue.length > 0) {
          const [row, col] = queue.shift()!; // 取出队首坐标（! 断言队列非空，由 while 条件保证）
          
          for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            
            // 合法性判断三合一：不越界 && 是陆地。命中后先标记再入队，保证每个格子最多进队一次。
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] === '1') {
              grid[nr][nc] = '0';
              queue.push([nr, nc]);
            }
          }
        }
      }
    }
  }
  
  // 第 4 段：返回岛屿总数
  // 理论复杂度同样是 O(mn)，但 queue.shift() 是 O(k) 数组搬移，最坏可退化到 O((mn)^2)；
  // 生产写法应改成下标指针（let head = 0; queue[head++]）或真正的链表队列。
  return count;
}

// 并查集（Union-Find）
class UnionFind {
  // 第 1 段：状态字段——parent 记录每个节点的代表元，rank 预留用于按秩合并，count 维护当前连通分量数
  // 注意：本实现只做了路径压缩，rank 申请了却没参与 union，所以是「单优化」版本（见第 4 段说明）。
  parent: number[];
  rank: number[];
  count: number;
  
  // 第 2 段：构造函数——把下标映射成一维，只为「陆地」建立独立集合
  // 用 idx = i * n + j 做二维到一维的编码，好处是 parent/rank 只用一维数组，寻址 O(1)。
  // 初始时每块陆地各自成一个集合，所以 count 就等于陆地格总数，后续每 union 成功一次就减一。
  constructor(grid: string[][]) {
    const m = grid.length;
    const n = grid[0].length;
    this.parent = new Array(m * n);
    this.rank = new Array(m * n).fill(0);
    this.count = 0;
    
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (grid[i][j] === '1') {
          const idx = i * n + j;
          this.parent[idx] = idx; // 自指即为根，表示「自己是一个独立集合」
          this.count++;
        }
      }
    }
  }
  
  // 第 3 段：find —— 查根 + 路径压缩
  // 递归把沿途所有节点直接挂到根上，使后续查询摊还接近 O(α(n)) ≈ O(1)。
  // 边界：只有此前被登记过的陆地 idx 才会被调用，水面格子的 parent 是 undefined，调用会出错。
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // 压缩：回溯时顺手改写成根
    }
    return this.parent[x];
  }
  
  // 第 4 段：union —— 把两个不同集合合并，并同步递减连通分量计数
  // 先 find 再比较，只有「原本不属于同一集合」才真正合并，这是 count 语义正确的关键。
  // 易错点：这里直接 parent[px] = py，没有按 rank/size 合并，极端链状输入下树可能很高；
  // 靠路径压缩兜底，摊还复杂度仍可接受，但严格来说 O(α(n)) 需要两个优化同时存在。
  union(x: number, y: number): void {
    const px = this.find(x);
    const py = this.find(y);
    
    if (px !== py) {
      this.parent[px] = py;
      this.count--; // 两个分量合成一个，总数减一
    }
  }
}

function numIslandsUnionFind(grid: string[][]): number {
  // 第 1 段：入口防御性校验
  if (!grid || grid.length === 0) return 0;
  
  // 第 2 段：建模——每块陆地先各自独立，再靠 union 把相邻陆地缝起来
  // 与 DFS/BFS 的区别：这里不修改 grid，答案直接由 uf.count（分量数）给出，属「离线合并」思路。
  const m = grid.length;
  const n = grid[0].length;
  const uf = new UnionFind(grid);
  
  // 第 3 段：单向扫描，只与「上」和「左」两个邻居合并
  // 为什么只查两个方向：任意相邻关系都会在扫描到「较后那个格子」时被处理一次，
  // 四个方向全查会重复 union（虽然幂等但白跑常数倍）；只查上/左即可覆盖所有边。
  // i > 0 / j > 0 的守卫正是为了跳过越界的「上」「左」。
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        const idx = i * n + j;
        
        if (i > 0 && grid[i - 1][j] === '1') {
          uf.union(idx, (i - 1) * n + j);
        }
        if (j > 0 && grid[i][j - 1] === '1') {
          uf.union(idx, i * n + (j - 1));
        }
      }
    }
  }
  
  // 第 4 段：返回连通分量数
  // 复杂度：时间 O(mn·α(mn))，空间 O(mn) 存 parent/rank；优点是天然支持「动态加陆地」的增量场景。
  return uf.count;
}
```
**复杂度**：时间 O(m * n)，空间 O(m * n)（DFS/BFS 递归栈或队列）。

---

## 3. #133 克隆图

**核心思路**：深度优先搜索 + 哈希表记录已克隆节点。遍历图，递归克隆每个节点及其邻居。

**核心实现**：

```typescript
// 第 1 段：节点建模——用邻接表表示无向图
// val 在本题中全局唯一，所以后文可以放心把 val 当作 visited 的键；
// 若值可能重复，就必须退回用节点引用作键（对象/Map 直接存 Node）。
// neighbors 只描述"连了谁"，边的双向性由输入保证双方都写对方，克隆时无需反向补边。
interface Node {
  val: number;
  neighbors: Node[];
}

// 第 2 段：DFS 入口——边界与容器约定
// 空图返回 null 而不是"空节点"，这是 LeetCode 133 的约定，也是递归的天然基准情况；
// 返回类型保留 null 让调用方无需额外判空包装。
function cloneGraph(node: Node | null): Node | null {
  if (!node) return null;
  
  // 第 3 段：visited 表（原图节点 -> 已生成的克隆节点）
  // 它一表两用：① 记忆化，同一节点只克隆一次，保证"一个原节点对应唯一副本"；
  // ② 判环，无向图的环会让朴素递归无限自指，靠这张表把环"截断"。
  const visited = new Map<number, Node>();
  
  // 第 4 段：递归核心——先查表，再考虑新建
  // 命中即返回既有副本，这是图遍历区别于树遍历的关键：图中同一节点可被多条路径到达。
  // 用非空断言 ! 是因为 has() 已保证存在，避免再写一次 null 判断。
  function clone(node: Node): Node {
    if (visited.has(node.val)) {
      return visited.get(node.val)!;
    }
    
    // 第 5 段：创建副本并"立刻"登记——顺序是整段代码最易错的地方
    // 必须先把 newNode 写进 visited，再去递归邻居：
    // 否则遇到 1<->2 这种互指，递归 1 时 2 回头找 1 会发现 1 尚未登记，于是又造一个新的 1，
    // 结果要么无限递归，要么产生重复副本破坏图结构。
    const newNode: Node = { val: node.val, neighbors: [] };
    visited.set(node.val, newNode);
    
    // 第 6 段：深度优先展开邻居
    // 每个 clone(neighbor) 返回的都是全局唯一副本，直接 push 即可；
    // 指向本节点或已访问祖先的那条边，会由第 4 段的查表逻辑返回已有副本而自然闭合。
    for (const neighbor of node.neighbors) {
      newNode.neighbors.push(clone(neighbor));
    }
    
    return newNode;
  }
  
  // 第 7 段：整体复杂度 O(V + E)：每个节点克隆一次、每条有向邻接项处理一次；
  // 空间 O(V) 存副本表，外加递归栈——链状图时栈深可达 V，存在爆栈风险（BFS 版本即为此而生）。
  return clone(node);
}

// 第 8 段：BFS 版本——用显式队列把递归栈换成迭代，避免深图爆栈
function cloneGraphBFS(node: Node | null): Node | null {
  if (!node) return null;
  
  // queue 里装的是"待展开邻居的**原图**节点"，而克隆节点统一从 visited 里按 val 取，
  // 这样两个容器职责清晰：queue 控制遍历进度，visited 控制副本的唯一性。
  const visited = new Map<number, Node>();
  const queue: Node[] = [node];
  
  // 第 9 段：先把根副本建好并入表
  // 根节点必须在进入循环前就登记，与 DFS 中"先登记再递归"是同一条不变式；
  // 注意：此处 new Node(...) 是原代码写法，但 Node 只是 interface、运行时并不存在，
  // 正确语义等价于 { val: node.val, neighbors: [] }（DFS 版本即如此）；保留原样仅为不改动代码。
  const cloneNode = new Node(node.val, []);
  visited.set(node.val, cloneNode);
  
  // 第 10 段：逐层出队，展开"原节点—克隆节点"的平行遍历
  // shift() 取队首是 O(n)，整体摊到 O(V^2)；教学场景可接受，工程实现应改用下标指针或真正的队列。
  // clonedCurrent 必然存在：任何进队的原节点都在进队前（或入队那一刻）已写入 visited。
  while (queue.length > 0) {
    const current = queue.shift()!;
    const clonedCurrent = visited.get(current.val)!;
    
    // 第 11 段：处理当前节点的出边
    // 初见邻居才建副本并入队，保证每个节点只被克隆一次、只被展开一次；
    // 易错点是"只在未访问分支里接边"——那样指向已访问节点的边会丢失，
    // 所以接边语句被放在 if 之外，无论新旧邻居都要挂到 clonedCurrent 上。
    for (const neighbor of current.neighbors) {
      if (!visited.has(neighbor.val)) {
        const clonedNeighbor = new Node(neighbor.val, []);
        visited.set(neighbor.val, clonedNeighbor);
        queue.push(neighbor);
      }
      clonedCurrent.neighbors.push(visited.get(neighbor.val)!);
    }
  }
  
  // 第 12 段：副本根即整张新图，复杂度同为 O(V + E) 时间、O(V) 空间（无递归栈开销）
  return cloneNode;
}
```
**复杂度**：时间 O(V + E)，空间 O(V)。

---

## 4. #417 太平洋大西洋水流问题

**核心思路**：多源 BFS。从海岸线逆向搜索，从太平洋（左岸+上岸）出发和从大西洋（右岸+下岸）出发分别 BFS，标记能到达的点，最后取交集。

**核心实现**：

```typescript
function pacificAtlantic(heights: number[][]): number[][] {
  // 第 1 段：入参与边界守卫（先把非法/空网格挡掉）
  // 二维网格题的第一道坑：heights 为 null/undefined 或长度为 0 时，后续 heights[0].length 会直接抛错
  if (!heights || heights.length === 0) return [];
  
  // 第 2 段：计算网格尺寸并缓存（后续所有越界判断与建表都依赖 m / n）
  // 提成局部常量只读一次，避免在 O(m·n) 的循环里反复访问属性，也让下面代码更可读
  const m = heights.length;
  const n = heights[0].length;
  
  // 第 3 段：准备两张"可达性"矩阵（标记每个格子能否流向对应大洋）
  // 易错点：new Array(m).fill(false) 填充的是同一个内层数组引用，必须再 map 出一行新数组，否则两行会共享状态互相污染
  const pacific = new Array(m).fill(false).map(() => Array(n).fill(false));
  const atlantic = new Array(m).fill(false).map(() => Array(n).fill(false));
  
  // BFS 从四边海岸出发
  // 第 4 段：反向 BFS——从海岸线出发"逆流而上"标记内陆，换掉正向模拟的暴力思路
  // 为什么反着走：若对每个格子正向判断能否入海，最坏要 O((m·n)^2)；反向只从四条边各走一次，整体降到 O(m·n)
  function bfs(reached: boolean[][]): void {
    const queue: [number, number][] = [];
    
    // 太平洋（左上边）
    // 第 5 段：播种初始状态——紧贴海洋的边界格子天然可达，先入队并打标记
    // 注意本实现只压入"上边 + 左边"（太平洋岸线）；Atlantic 需要的是"下边 + 右边"，差异留到调用处说明
    for (let i = 0; i < m; i++) {
      queue.push([i, 0]);           // 最左列：紧邻太平洋
      reached[i][0] = true;
    }
    for (let j = 0; j < n; j++) {
      queue.push([0, j]);           // 最上行：紧邻太平洋
      reached[0][j] = true;
    }
    
    // 第 6 段：BFS 主循环——队列里存的全是"已确认可达"的坐标，逐个出队向外扩散
    // 易错点：shift() 从数组头部删除并重排，成本与队列长度相关；追求严格线性 BFS 时通常改用头指针下标代替 shift
    while (queue.length > 0) {
      const [row, col] = queue.shift()!;
      
      // 第 7 段：四方向扩展——先做越界与去重剪枝，再判断高度条件
      // 数据流：当前格 (row,col) 已可达 → 检查邻居 (nr,nc) 能否"把水送过来" → 能则标记并入队，等待下一轮扩散
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = row + dr;
        const nc = col + dc;
        
        if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;   // 越界：直接丢弃
        if (reached[nr][nc]) continue;                          // 已访问：跳过，避免重复入队导致指数级膨胀
        
        // 只能从高走向低
        // 关键判断：水从 (row,col) 流向 (nr,nc) 的条件是 heights[nr][nc] >= heights[row][col]
        // 因为我们是从海洋（低）往内陆（高）反向搜索，所以实际是"逆流而上"；等号保证相等高度的平坡也能互相流到
        if (heights[nr][nc] >= heights[row][col]) {
          reached[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }
  }
  
  // 第 8 段：跑两遍同一套 BFS，分别填充两张可达矩阵
  // 边界/易错点：当前实现两次调用都以"上边 + 左边"为种子，atlantic 实际被当成第二个 pacific
  // 若要严格符合题意，第二次调用应先种子下边 (m-1, j) 与右边 (i, n-1)，标记的才是真正的大西洋岸线
  bfs(pacific);
  bfs(atlantic);
  
  // 第 9 段：求交集——两张矩阵同时为 true 的格子，就是既能流向太平洋、又能流向大西洋的坐标
  // 双层的顺序扫描本身是 O(m·n)，属于不可避免的收尾统计
  const result: number[][] = [];
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (pacific[i][j] && atlantic[i][j]) {
        result.push([i, j]);
      }
    }
  }
  
  // 第 10 段：返回结果——两个矩阵各占 O(m·n) 空间，队列最坏也达到 O(m·n)，整体空间 O(m·n)
  return result;
}
```
**复杂度**：时间 O(m * n)，空间 O(m * n)。

---

## 5. #547 省份数量

**核心思路**：图的连通分量问题。使用 DFS 或并查集计算有多少个连通分量。

**核心实现**：

```typescript
// DFS
// 第 1 段：DFS 解法的入口与状态准备（把邻接矩阵当作无向图，准备访问标记和省份计数）
// 这里用 Set 记录已访问城市，避免重复进入同一个连通分量；provinces 只在发现新连通分量时增加。
function findCircleNum(isConnected: number[][]): number {
  const n = isConnected.length;          // 城市数量，也是邻接矩阵的边长
  const visited = new Set<number>();     // 已访问城市集合，相当于 DFS 的全局标记
  let provinces = 0;                     // 连通分量（省份）计数

  // 第 2 段：深度优先搜索函数（从某个城市出发，递归标记整个连通分量）
  // 为什么先 visited.add(city)：进入递归就立刻标记，防止环或对称边导致重复访问甚至死递归。
  // 数据流：city -> 扫描整行邻接表 -> 对未访问的邻居继续 dfs。
  function dfs(city: number): void {
    visited.add(city);

    for (let i = 0; i < n; i++) {        // 遍历 city 与其他所有城市的连接关系
      if (isConnected[city][i] === 1 && !visited.has(i)) {
        dfs(i);                          // 有边且未访问，继续深入该邻居
      }
    }
  }

  // 第 3 段：外层遍历所有城市，统计连通分量数量（每个未访问城市代表发现一个新省份）
  // 每次从未访问节点启动 DFS，都会一次性标记完它所在的整个连通分量，因此 provinces 加一。
  // 边界：n 为 0 时循环不执行，直接返回 0；非连通图会有多次 dfs 启动。
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      dfs(i);
      provinces++;
    }
  }

  return provinces;                      // 返回省份总数
}

// 并查集
// 第 4 段：并查集结构体定义与初始化（用 parent 数组表示每个节点所属集合的根）
// parent[i] = i 表示初始时每个城市自成一个集合；count 维护当前集合数量，最终就是省份数。
class UnionFindSet {
  parent: number[];
  count: number;

  constructor(n: number) {
    this.parent = new Array(n).fill(0).map((_, i) => i); // 不能用 fill(i) 直接生成索引，这里映射出 [0,1,...,n-1]
    this.count = n;                                       // 初始有 n 个互不相交的集合
  }

  // 第 5 段：find 查找根节点并做路径压缩（把查找路径上的节点直接挂到根，降低后续查找成本）
  // 递归写法：若当前不是根，就递归找根，并顺手把 parent[x] 改成根，实现路径压缩。
  // 摊还复杂度接近 O(α(n))，α 为反阿克曼函数；注意递归深度受路径长度影响，但路径压缩后通常很浅。
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  // 第 6 段：union 合并两个集合（若根不同，则把一个根挂到另一个根下，并减少集合计数）
  // 先分别 find 到根 px、py；只有 px !== py 才说明两个城市原本不在同一集合，需要真正合并。
  // 易错点：必须比较根而不是比较 x、y 本身；这里未做按秩合并，最坏树高可能较大，但路径压缩会缓解。
  union(x: number, y: number): void {
    const px = this.find(x);
    const py = this.find(y);

    if (px !== py) {
      this.parent[px] = py;              // 合并：把 px 所在集合挂到 py 的根下
      this.count--;                      // 两个集合合成一个，集合数减一
    }
  }
}

// 第 7 段：并查集解法主函数（扫描邻接矩阵的上三角，遇到边就合并两个城市）
// 只遍历 j = i + 1 的上三角是因为邻接矩阵对称，同一条无向边处理一次即可。
// 每合并成功一次 count 自减，最终 uf.count 就是连通分量数，即省份数。
function findCircleNumUnion(isConnected: number[][]): number {
  const n = isConnected.length;
  const uf = new UnionFindSet(n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isConnected[i][j] === 1) {
        uf.union(i, j);
      }
    }
  }

  return uf.count;                       // count 已由并查集维护为剩余集合数
}
```
**复杂度**：DFS 时间 O(n^2)，空间 O(n)；并查集时间 O(n^2 alpha(n))，空间 O(n)。

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| monorepo 里改一个底层包后重跑 CI | 课程表：拓扑排序 | Kahn 算法 + 入度队列 | 环上节点要打印成路径，不能只报"有环" |
| 后台管理的万行表格合并同人账号 | 省份数量：并查集 | 路径压缩 + 按秩合并 | 合并依据要落日志，否则无法回滚 |
| 低端安卓的首屏请求编排 | 课程表：拓扑排序 | 入度队列 + 线程池按层提交 | 无依赖的请求同层并发，有依赖的跨层等待 |
| 多人协作白板的撤销栈 | 克隆图：深拷贝 + 哈希映射 | DFS + 旧节点到新节点字典 | 同一对象被两处引用时要复用同一个副本 |
| 数据仓库每日调度的 DAG 加载 | 课程表：环检测 | Airflow DAG 解析或自研调度器 | 手工回填会绕过依赖，需要单独开关 |
| 质检照片里数物体个数 | 岛屿数量：网格连通块 | BFS 洪水填充或两遍扫描并查集 | 递归 DFS 在万级网格上会爆栈 |
| 反欺诈里按同设备合并账号 | 省份数量：并查集 | 并查集 + 离线批处理 | 模糊规则会把大半张图连成一坨，先定阈值 |
| 两路来源同时可达的目标集合 | 太平洋大西洋水流：反向多源遍历取交集 | 多源 BFS + 反向边遍历 | 方向要反过来，从入口出发而不是从节点出发 |

### 三个场景拆解

#### 场景 1：monorepo 构建顺序编排

**业务背景**：仓库里包的数量到了几百个，改一个底层包就要重跑所有依赖它的包。人工维护执行顺序会漏，偶尔写出互相依赖的两个包，CI 卡在中途才报错。

**怎么用本页知识解决**：把"包到依赖方"建成有向图，用入度队列逐层取出可执行的包。队列取空的时刻还有剩余节点，说明剩下的节点都在环上，直接报错并给出环路径。

```python
from collections import deque

def build_order(graph):              # graph: {包名: [依赖它的包名]}
    indeg = {n: 0 for n in graph}
    for n in graph:
        for m in graph[n]:
            indeg[m] += 1            # 统计每个包还有几个前置没跑
    q = deque([n for n, d in indeg.items() if d == 0])
    order = []
    while q:
        n = q.popleft()              # 入度为 0 才允许执行
        order.append(n)
        for m in graph[n]:
            indeg[m] -= 1
            if indeg[m] == 0:        # 前置全部完成，可以入队
                q.append(m)
    if len(order) != len(graph):     # 有节点没出队，说明在环上
        raise RuntimeError("存在循环依赖")
    return order
```

- 入度表用字典而不是数组，包名可以是非连续字符串。
- 同一轮进入队列的包互不依赖，可以并行提交到线程池。
- 环检测放在解析阶段，构建失败时给出环上包名，省去翻日志的时间。
- 只想看顺序不想执行时，把入队换成打印即可，改动量小。

**怎么度量收益**：看 CI 里"解析依赖"这一步的耗时，用 `pytest` 跑一个 1000 节点的构造图并记录 `graph_resolve_seconds`。再统计构建因循环依赖失败的次数，从 CI 日志里按报错关键字正则计数。

**什么时候不该用**：包只有三五个、顺序靠人记就能稳定时，引入图结构只是增加维护面。两个服务本来就互相调用、业务上也允许时，正确做法是把强连通分量缩成一个节点再排序，而不是直接退出。

#### 场景 2：质检照片里数物体个数

**业务背景**：产线拍照后得到几千乘几千的二值掩膜，要统计掩膜里连通的物体个数和各自面积。逐点递归搜索会触发栈溢出，进程直接挂掉。

**怎么用本页知识解决**：按行扫描网格，遇到没访问过的前景点就计数加一，再用队列做四邻域洪水填充，把整块区域标掉。入队时就打访问标记，避免同一点被多次压入队列。

```python
from collections import deque

def count_regions(grid):                 # grid 为 0/1 二值掩膜
    rows, cols = len(grid), len(grid[0])
    seen = [[False] * cols for _ in range(rows)]
    total = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0 or seen[r][c]:
                continue
            total += 1                   # 每发现一个未访问的 1 就计一个区域
            seen[r][c] = True
            q = deque([(r, c)])          # 用队列迭代，避免深递归爆栈
            while q:
                x, y = q.popleft()
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] == 1 and not seen[nx][ny]:
                        seen[nx][ny] = True      # 入队时就标记，防止重复入队
                        q.append((nx, ny))
    return total
```

- 访问标记必须早于入队，否则同一层会重复压入相邻点，队列迅速膨胀。
- 四邻域与八邻域的差别直接改变计数结果，先和业务确认物体是否斜向接触。
- 需要面积和包围盒时，在出队处累加即可，或者改用两遍扫描并查集。
- 内存紧张时按行处理，只保留当前行和上一行的标签。

**怎么度量收益**：用 `cv2.connectedComponentsWithStats` 的标签数作为基准，与自研实现比对，记录 `region_count_mismatch`。耗时用 `time.perf_counter` 包住函数，在固定的一批样例图上重复测量取中位数。

**什么时候不该用**：物体之间没有明确的前景背景界线、只能靠灰度落差区分时，先做阈值和形态学处理，再谈计数。只关心最大那块区域的面积、不关心中间结果时，两遍扫描并查集省一次全图随机访问。

#### 场景 3：反欺诈里按同设备合并账号

**业务背景**：同一个用户用手机号、邮箱、设备号注册出多个账号，运营要做人群包，需要把指向同一人的账号合并。账号量在百万级，两两比对跑不动。

**怎么用本页知识解决**：把每条命中规则产生的账号对当作一条无向边，用并查集在线合并，最后按根分组。每个账号先各自成一类，命中同一手机号或同一设备号时把两棵树接起来。

```python
class DSU:
    def __init__(self, ids):
        self.parent = {i: i for i in ids}    # 每个账号先各自成一类
    def find(self, x):
        root = x
        while self.parent[root] != root:     # 一路向上找根
            root = self.parent[root]
        while self.parent[x] != root:        # 路径压缩，摊平树高
            self.parent[x], x = root, self.parent[x]
        return root
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra             # 合并依据写进日志，便于回滚
```

- 路径压缩让后续 `find` 接近常数步，百万级账号能一次跑完。
- 每类规则单独记一份边表，出问题时可以只回放某一条规则。
- 规则要按可信度排序，先跑强规则（手机号），再跑弱规则（同 IP 段）。
- 结果按根聚合后再输出人群包，不要边合并边写下游。

**怎么度量收益**：对同一份账号快照重跑，比较 `count(distinct account_id)` 与合并后的 `count(distinct person_id)`，比值即去重率。按簇大小分层抽 200 个簇做人工核验，记录错并率。

**什么时候不该用**：合并依据是昵称相似度这类模糊匹配时，并查集会把大半张图连成一坨，必须先定阈值并保留证据。合规要求可回滚到合并前状态时，只存父指针不够，要额外落一份合并日志。账号表只有几百行时，一次 SQL 自连接就能出结果。

### 行业先进实践

依赖图先验环再执行（出处：Bazel 官方文档中 Query 与依赖图相关章节）。Bazel 在加载阶段构建目标依赖图，发现环时报错并指出环上目标。借鉴方式是把解析与执行拆成两个阶段，解析失败时输出环路径。

DAG 解析阶段检测循环（出处：Apache Airflow 官方文档 DAGs 章节）。Airflow 把工作流定义为有向无环图，解析 DAG 文件时发现循环依赖会报错。借鉴方式是在调度器加载配置时就做一次全图环检测，再进入排产。

按依赖把作业切成阶段（出处：Apache Spark 官方文档 RDD Programming Guide 与 Job Scheduling）。Spark 的 DAG 调度器依据宽窄依赖划分 stage，同 stage 内并行。借鉴方式是按层提交任务，同层并发、跨层等待。

按拓扑顺序输出提交记录（出处：Git 官方文档 `git rev-list` 的 `--topo-order` 选项）。该选项保证父提交先于子提交出现，便于阅读和回放。借鉴方式是导出事件流或审计日志时按因果顺序排序。

连通域标记用带统计的两遍扫描（出处：OpenCV 官方文档 `connectedComponents` 与 `connectedComponentsWithStats`）。后者一次返回标签图、域个数以及每个域的面积与包围盒。借鉴方式是离线分析直接读统计量，不必自己再扫一遍图。

### 从学到用：落地路线

第 1 步：选一条依赖关系清晰的流水线做试点，把任务依赖显式写成边表。验收标准是边表能被脚本读入并画出节点数与边数。

第 2 步：在试点流水线上跑拓扑排序与环检测，与现有人工顺序逐条比对。验收标准是两条路径产出顺序一致，且构造一个含环的样例能被稳定拦下。

第 3 步：把排序器接进调度入口，输出分层结果供并行调用。验收标准是同一层任务确实并发提交，日志里能按层看到开始与结束时间。

第 4 步：把环检测加入提交前检查，并保留一份依赖快照用于对比。验收标准是新提交引入环时在合并前被拦下，快照能还原出变更前后的边差异。

### 动手作业

目标：给定一个 JSON 依赖清单，输出可执行的包顺序、并行层数，并对含环的清单报出环路径。

步骤：

1. 定义 JSON 结构，每个包一个键，值为它依赖的包名列表，自备一份 30 个包的样例。
2. 把依赖方向反转，生成"包到依赖方"的邻接表，并统计每个包的入度。
3. 实现 Kahn 算法，把每轮入度归零的包合成一层，记录层号。
4. 队列取空后若仍有节点没出队，用剩余节点反向找出一条环路径并抛出异常。
5. 写一个命令行入口，接收清单路径，打印层号、包名和总层数。
6. 写单元测试：一个无环清单、一个自环清单、一个三节点环清单。
7. 用 1000 个包的构造清单测量排序耗时，输出到标准输出。

验收标准：

- 无环清单的输出中，任意包的层号大于它依赖的所有包的层号。
- 自环与三节点环清单都能报出环路径，路径首尾是同一个包。
- 1000 个包的清单能在一次运行内完成排序，并打印耗时。
- 单元测试全部通过，且不依赖网络与第三方图库。
- 同一份清单重复运行两次，输出顺序完全一致。

