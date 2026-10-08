---
title: 动态规划题型
description: LeetCode Hot 100 动态规划题目：爬楼梯、最大子数组和、打家劫舍、零钱兑换、单词拆分与不同路径。
tags:
  - algorithm
  - leetcode
date: 2026-05-17
---

# 动态规划题型

## 1. #70 爬楼梯

**核心思路**：经典斐波那契数列，第 n 阶 = 第 n-1 阶走1步 + 第 n-2 阶走2步。状态转移方程：`dp[i] = dp[i-1] + dp[i-2]`。

**核心实现**：

```typescript
// 动态规划（空间优化）
function climbStairs(n: number): number {
  if (n <= 2) return n;
  
  let prev1 = 2;  // dp[2]
  let prev2 = 1;  // dp[1]
  
  for (let i = 3; i <= n; i++) {
    const current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }
  
  return prev1;
}

// 矩阵快速幂（O(log n)）
function climbStairsMatrix(n: number): number {
  const base = [[1, 1], [1, 0]];
  
  function matrixMultiply(a: number[][], b: number[][]): number[][] {
    const result: number[][] = [[0, 0], [0, 0]];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        for (let k = 0; k < 2; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  }
  
  function matrixPower(matrix: number[][], power: number): number[][] {
    let result = [[1, 0], [0, 1]]; // 单位矩阵
    let base = matrix;
    
    while (power > 0) {
      if (power % 2 === 1) {
        result = matrixMultiply(result, base);
      }
      base = matrixMultiply(base, base);
      power = Math.floor(power / 2);
    }
    
    return result;
  }
  
  const powered = matrixPower(base, n);
  return powered[0][0] + powered[0][1];
}
```

**复杂度**：时间 O(n) 或 O(log n)，空间 O(1)。

---

## 2. #53 最大子数组和

**核心思路**：贪心 + 动态规划。遍历数组，维护以当前元素结尾的最大子序和（`dp[i] = max(dp[i-1] + nums[i], nums[i])`）。当累积和为负时，丢弃之前的累加从头开始。

**核心实现**：

```typescript
// 第 1 段：函数签名与初始状态（Kadane 算法的空间优化版入口）
// 目标：在 O(n) 时间内求出「和最大的连续子数组」的和，要求至少取一个元素。
// maxSum 记录全局历史最优；currentSum 记录「以当前下标结尾」的子数组最优和，
// 二者都以 nums[0] 初始化，从而天然覆盖「全为负数」的边界：此时答案就是最大单元素，
// currentSum 会在每一步被 nums[i] 重新起头，不会被负前缀拖累。
function maxSubArray(nums: number[]): number {
  let maxSum = nums[0];
  let currentSum = nums[0];
  
  // 第 2 段：单次线性扫描（状态转移与全局更新合并在一个循环里）
  // 转移方程：以 i 结尾的最优和 = max(nums[i], 以 i-1 结尾的最优和 + nums[i])。
  // 直觉：若「前面的累计和 + 当前值」还不如「从当前值重新开始」，说明旧前缀是负资产，果断抛弃。
  // 注意 currentSum 必须先于 maxSum 更新，否则 maxSum 会读到上一轮的旧值。
  // 时间复杂度 O(n)，空间被压到 O(1)（dp 数组只保留了上一项，故无需数组）。
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]); // 决策点：延续旧段 or 以 nums[i] 另起一段
    maxSum = Math.max(maxSum, currentSum); // 全局最优可能出现在任意位置，故每步都收编
  }
  
  // 第 3 段：返回结果
  // 循环结束后 maxSum 已是所有 currentSum 的历史最大值，即答案。
  return maxSum;
}
// （注：题目已保证 nums.length ≥ 1，故无需处理空数组；若允许空数组需在入口另行约定返回值。）

// 第 4 段：动态规划标准版（数组实现，与上面的滚动变量版等价）
// 这里显式保留 dp 数组，目的是把「状态」可视化，便于教学时对照转移方程。
// 代价是空间 O(n)；而上一版正是把这个数组压缩成单个变量 currentSum 得到的优化解。
// 动态规划标准版
function maxSubArrayDP(nums: number[]): number {
  const n = nums.length;
  // 第 5 段：状态定义与初始化
  // dp[i] 语义：以 nums[i] 结尾的连续子数组的最大和（必须包含 nums[i]，这是转移成立的前提）。
  // 只定义不填充（new Array(n) 里是空洞），随后仅赋 dp[0]，避免无谓的 fill 开销。
  const dp: number[] = new Array(n);
  dp[0] = nums[0]; // 起点唯一，只能取它自己
  let max = dp[0]; // 同时用 max 做滚动最大值，省去最后一次 O(n) 的 Math.max(...dp) 扫描
  
  // 第 6 段：自底向上递推
  // 每个 dp[i] 只需 dp[i-1]，说明状态有「一维前向依赖」，这正是可做空间压缩的结构性证据。
  // 递推完立刻与 max 比较，答案在递推过程中就确定了，无需回看整个 dp。
  // 注意：这里用 max 作变量名会遮蔽 Math.max 吗？不会——JS 里成员函数与局部变量命名空间独立。
  for (let i = 1; i < n; i++) {
    dp[i] = Math.max(dp[i - 1] + nums[i], nums[i]); // 二选一：接上前一段，或从本元素重启
    max = Math.max(max, dp[i]); // 由于 dp[i] 必须含 nums[i]，全局最优需靠 max 另行维护
  }
  
  // 第 7 段：返回结果
  // max 覆盖了所有可能的结尾位置，即以任意位置结尾的子数组中的最大和，即题目所求。
  return max;
}
```

**复杂度**：时间 O(n)，空间 O(1)。

---

## 3. #198 打家劫舍

**核心思路**：状态转移方程：`dp[i] = max(dp[i-1], dp[i-2] + nums[i-1])`。dp[i] 表示偷到第 i 间房时能获得的最大金额。

**核心实现**：

```typescript
function rob(nums: number[]): number {
  const n = nums.length;
  if (n === 0) return 0;
  if (n === 1) return nums[0];
  
  let prev2 = 0;  // dp[0]
  let prev1 = nums[0];  // dp[1] = max(dp[0], 0 + nums[0])
  
  for (let i = 1; i < n; i++) {
    const current = Math.max(prev1, prev2 + nums[i]);
    prev2 = prev1;
    prev1 = current;
  }
  
  return prev1;
}

// 环形房屋版本
function robCircular(nums: number[]): number {
  if (nums.length === 1) return nums[0];
  
  const robRange = (start: number, end: number): number => {
    let prev2 = 0;
    let prev1 = 0;
    
    for (let i = start; i <= end; i++) {
      const current = Math.max(prev1, prev2 + nums[i]);
      prev2 = prev1;
      prev1 = current;
    }
    
    return prev1;
  };
  
  // 两种情况：不偷第一间或不偷最后一间
  return Math.max(robRange(0, nums.length - 2), robRange(1, nums.length - 1));
}
```

**复杂度**：时间 O(n)，空间 O(1)。

---

## 4. #322 零钱兑换

**核心思路**：完全背包问题。状态转移：`dp[j] = min(dp[j], dp[j - coin] + 1)`。j 从 coin 到 amount 遍历（正序，因为每种硬币可用无限次）。

**核心实现**：

```typescript
function coinChange(coins: number[], amount: number): number {
  // 第 1 段：初始化 DP 表——dp[j] 表示"凑出金额 j 所需的最少硬币数"
  // 用 Infinity 而非 0 或 -1 作初值，是为了让 Math.min 在后续递推中自动忽略"不可达"状态：
  // 只要某个状态从未被真正凑出，它就会一直保持 Infinity，最后统一映射成题目要求的 -1。
  // 下标开到 amount + 1，是为了让 dp[amount] 直接对应答案，避免每次做 -1 偏移换算。
  const dp = new Array(amount + 1).fill(Infinity);
  // 边界：凑 0 元需要 0 枚硬币。这是整条递推链的种子，缺了它所有状态都不可达。
  dp[0] = 0;
  
  // 第 2 段：完全背包的状态转移——外层枚举"硬币种类"，内层枚举"金额"
  // 关键点在于两层循环的顺序：外层为硬币、内层 j 正向递增，意味着同一枚硬币可以被
  // 重复使用（dp[j - coin] 可能已经用过当前 coin），这正是"完全背包/无限次取用"的写法；
  // 若把两层对调、或内层倒序遍历，就退化成"每枚硬币只能用一次"的 0/1 背包，答案会偏大。
  // 复杂度：O(coins.length × amount) 时间，O(amount) 空间。
  for (const coin of coins) {
    // j 从 coin 起步：金额小于 coin 时 dp[j - coin] 会取到负下标，直接跳过更省事也更安全。
    for (let j = coin; j <= amount; j++) {
      // 取 min 即"用一枚 coin 接在子问题 dp[j - coin] 后面"与"不动用 coin"的较优者；
      // dp[j - coin] 为 Infinity 时该分支自然失效。
      dp[j] = Math.min(dp[j], dp[j - coin] + 1);
    }
  }
  
  // 第 3 段：答案出口——不可达的 Infinity 统一转成 -1，这是题面约定的返回值。
  return dp[amount] === Infinity ? -1 : dp[amount];
}

// BFS（最短路径）
function coinChangeBFS(coins: number[], amount: number): number {
  // 第 1 段：边界与数据结构准备——把问题建模成图上的最短路径
  // 每个"已凑出的金额"是一个节点，加一枚硬币是一条权值为 1 的边，
  // 于是"最少硬币数"= 从 0 到 amount 的最少边数，BFS 逐层扩展恰好保证首次到达即为最短。
  if (amount === 0) return 0;
  
  // visited 防止同一金额被重复入队（否则图存在环，队列会指数级膨胀且永不收敛）。
  const visited = new Set<number>();
  const queue: number[] = [0];
  // depth 记录当前正在处理的层号；因为扩展一层就等于"多用一枚硬币"，所以 depth 就是硬币枚数。
  let depth = 0;
  
  // 第 2 段：按层（level-by-level）扩展 BFS
  // 易错点：必须在每层开始前先记住 size，否则内层 push 出来的新节点会被同一轮循环消费，
  // depth 的语义就被破坏、"层"不再等于"硬币数"。
  while (queue.length > 0) {
    const size = queue.length;
    depth++;
    
    for (let i = 0; i < size; i++) {
      // 这里用 shift() 取队首（O(n)）；严格意义上应换成下标指针或双端队列以避免整体搬移，
      // 在 amount 较大时这里是隐藏的性能瓶颈。! 断言用于消除可能为 undefined 的类型告警。
      const current = queue.shift()!;
      
      for (const coin of coins) {
        const next = current + coin;
        
        // 命中目标立刻返回：BFS 的层序保证这是第一次到达 amount，也就是最少的硬币枚数，
        // 无需继续搜索（这也是它比 DP 更早停止、在某些输入上更快的原因）。
        if (next === amount) return depth;
        
        // 只把"未越界且未访问过"的金额入队：越界剪枝 + visited 去重，
        // 是保证 BFS 时间 O(amount × coins.length) 上界的关键两件事。
        if (next < amount && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  
  // 第 3 段：队列耗尽仍未命中，说明 amount 无法由这些硬币组合而成。
  return -1;
}
```

**复杂度**：时间 O(n * amount)，空间 O(amount)。

---

## 5. #139 单词拆分

**核心思路**：完全背包问题。状态 dp[j] 表示字符串前 j 个字符能否被拆分。遍历所有单词判断是否匹配。

**核心实现**：

```typescript
// 第 1 段：词典哈希化 + DP 状态定义 —— 把"能否拼出前缀"转成一张前缀布尔表
// 为什么用 Set：双层循环里最热的内层操作是"查这个词在不在词典"，哈希查表平均 O(1)，
// 比线性扫描 wordDict 的 O(m) 便宜得多。dp[i] 语义：s 的前 i 个字符 s[0..i) 能否被词典完整切分；
// dp[0]=true 是空串可切分的递归基底，也是后续所有转移能够启动的唯一起点。
function wordBreak(s: string, wordDict: string[]): boolean {
  const wordSet = new Set(wordDict);
  const n = s.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;
  
  // 第 2 段：自左向右填表 —— 固定终点 i，枚举"最后一刀"的起点 j
  // 转移方程：dp[i] = ∃j<i 使得 dp[j] && s[j..i) ∈ 词典，本质是在所有合法切分点里找一条连通的路径。
  // 易错点：先判 dp[j] 再加 substring，利用短路求值跳过大量不可达前缀的字符串切片开销。
  // 复杂度：O(n^2) 次区间检查，每次 substring+哈希最坏 O(n)，故 O(n^3)；DP 数组 O(n)（不计词典）。
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && wordSet.has(s.substring(j, i))) { // break 是剪枝：一旦找到一种切法，无需再试更小的 j
        dp[i] = true;
        break;
      }
    }
  }
  
  // 第 3 段：答案即整串可切分性 —— dp[n] 对应最后一次切分恰好落在字符串末尾
  return dp[n];
}

// Trie 优化版本
// 第 4 段：Trie 节点定义 —— 用 Map 而非定长数组，兼容任意 Unicode 字符集
// isEnd 标记"从根走到本节点恰好构成一个完整单词"，让匹配过程可以边走边判定命中，而不是走完再回头比对。
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd: boolean = false;
}

// 第 5 段：构建 Trie —— 按公共前缀把词典压缩成树，为"从某起点持续向后扫描"提供数据结构
// 关键收益：不再对每个区间做 substring 再哈希，而是沿树逐字符推进，单次扫描代价只与匹配深度挂钩。
function wordBreakWithTrie(s: string, wordDict: string[]): boolean {
  const root = new TrieNode();
  
  for (const word of wordDict) {
    let node = root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!; // 非空断言：上一行已保证该 key 必然存在
    }
    node.isEnd = true; // 词尾打标记，供后续扫描判定"此刻刚好扫完一个词"
  }
  
  // 第 6 段：DP 初始化 —— 语义与朴素版完全一致，dp[i] 表示前缀 s[0..i) 可被切分
  const n = s.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;
  
  // 第 7 段：逆序增量匹配 —— 固定终点 i，从 i-1 起向左沿 Trie 回溯
  // 为什么倒序：词典匹配天然是从起点向右读，这里令 j 递减、每步喂入 s[j]，恰好等价于"起点不断左移"，
  // 一次线性扫描就覆盖了所有可能的起点，避免了对每个起点重复建指针。
  // 边界：node 为空说明当前这个起点已经不可能匹配任何词前缀，更靠左的起点只会让前缀更长，故直接 break。
  // 复杂度：最坏 O(n^2)（每个 i 最多扫 i 步，每步 O(1)），相比朴素版省掉了 substring 的 O(n)；
  // 建树空间为词典总字符数，dp 仍为 O(n)。注意 node 此处可能被赋成 undefined，靠下一行判空兜底。
  for (let i = 1; i <= n; i++) {
    let node = root;
    for (let j = i - 1; j >= 0; j--) {
      node = node.children.get(s[j]);
      if (!node) break;
      
      if (node.isEnd && dp[j]) { // 命中整词 且 左侧前缀可切，才构成对 dp[i] 的一次有效转移
        dp[i] = true;
        break;
      }
    }
  }
  
  // 第 8 段：返回整串是否可切分
  return dp[n];
}
```

**复杂度**：时间 O(n * m)，空间 O(n)，其中 m 为字典单词平均长度。

---

## 6. #62 不同路径

**核心思路**：机器人只能向下或向右移动。第 (i,j) 格的路径数 = 第 (i-1,j) 格 + 第 (i,j-1) 格的路径数。

**核心实现**：

```typescript
// 动态规划
function uniquePaths(m: number, n: number): number {
  const dp: number[][] = Array.from({ length: m }, () => 
    Array(n).fill(1)
  );
  
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
    }
  }
  
  return dp[m - 1][n - 1];
}

// 空间优化（一维数组）
function uniquePathsOptimized(m: number, n: number): number {
  const dp = new Array(n).fill(1);
  
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[j] += dp[j - 1];
    }
  }
  
  return dp[n - 1];
}

// 数学方法（组合数）
function uniquePathsMath(m: number, n: number): number {
  // 需要走 (m-1) 步向下 + (n-1) 步向右，共 (m+n-2) 步
  // 从 (m+n-2) 步中选 (m-1) 步向下
  let result = 1;
  const k = Math.min(m - 1, n - 1);
  
  for (let i = 0; i < k; i++) {
    result = result * (m + n - 2 - i) / (i + 1);
  }
  
  return Math.round(result);
}
```

**复杂度**：DP 版本时间 O(m*n)，空间 O(n)（一维优化）或 O(m*n)（二维）；数学方法时间 O(k)。

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 支付收银台的券组合计算（目标金额 100 到 500 元档） | #322 零钱兑换 | Java 后端 + Caffeine 或 Redis 缓存 | 面额大于目标金额要跳过；无解要返回明确标记，不能返回 0 |
| 后台管理万行表格的滚动定位（2 万行以上） | #70 爬楼梯的滚动变量、#62 不同路径的二维递推 | React + react-window 或 Vue 虚拟滚动组件 | 行高变化要重算偏移表；表头插入数据会让整段前缀偏移失效 |
| 推送频控的时段选择（同一天相邻时段互斥） | #198 打家劫舍 | 规则引擎 + 用户维度最近发送时间 | 时间窗滑动时状态要重算；互斥范围不只是相邻一条 |
| 网关日志的连续异常段定位（单机每分钟十万行） | #53 最大子数组和 | Flink 滑动窗口或自研流式聚合 | 阈值要按基线浮动；全为负值时按产品定义返回空或单个最小项 |
| 对象存储的分片上传进度推进 | #70 爬楼梯 | 前端状态机 + 后端任务表 | 块大小固定时步长固定；块大小可变时状态空间变大 |
| 自定义协议与 URL 白名单校验 | #139 单词拆分 | 前缀树 + 布尔 DP | 词典要限制最大词长；大小写与编码先做归一化 |
| 灰度发布路径组合计数（阶段数乘分支数） | #62 不同路径 | CI 配置生成脚本 | 组合数增长快，超过 2^53 要用大整数 |
| 低端安卓首屏资源分批预取（并发上限 4） | #322 零钱兑换 | 构建期脚本 + 资源清单 | 按体积分批时零头处理要固定；预取失败要有回退分支 |

### 三个场景拆解

#### 场景 1：收银台优惠券组合的最少张数

**业务背景**：结算页要在 200 毫秒内给出用券方案，券面额从 5 元到 100 元不等，目标金额集中在 100 到 500 元档。用户改数量后要重算，日调用量在百万级。

**怎么用本页知识解决**：把目标金额当作状态，`dp[i]` 表示凑出 `i` 元所需的最少张数，从 1 元推到目标金额。每个金额只依赖更小的金额，天然按金额递增顺序求解。

```python
def min_coupons(coins, target):
    INF = float('inf')
    dp = [0] + [INF] * target          # dp[0]=0，其余先标记不可达
    for i in range(1, target + 1):     # 外层走金额，保证子问题先算好
        for c in coins:
            if c <= i and dp[i - c] + 1 < dp[i]:
                dp[i] = dp[i - c] + 1  # 用一张面额 c 转移到 i
    return -1 if dp[target] == INF else dp[target]   # 不可达时返回 -1

def min_coupons_capped(coins, target, cap):
    best = min_coupons(coins, target)  # cap 是用户实际持券张数上限
    return best if 0 <= best <= cap else -1
```

- `dp[0] = 0` 之外全部置为不可达，避免把"凑不出"当成 0 元返回。
- 外层循环走金额、内层走面额，保证每个金额只算一次，不重复展开。
- 结果要跟用户持券张数比较，超过上限的方案不能下发。
- 目标金额超过 5000 元时只对出现过的金额建备忘录，控制状态数量。
- 返回张数不返回组合，需要组合时再沿 dp 表回溯一次。

**怎么度量收益**：看接口 P99 延迟（Prometheus 的 `http_request_duration_seconds` 直方图）、缓存命中率、返回不可行方案的请求占比。测量方法：预发环境用 k6 压同一批金额，对比直算组与查表组两个进程的 P99 与 CPU 占用。

**什么时候不该用**：

- 券之间有互斥和门槛（满 300 才能用某张），状态要加上门槛维度，一维 dp 覆盖不到。
- 目标金额上万且面额种类上百时，`O(目标 × 种类)` 的循环会拖慢结算，应改用整数规划求解器或先做金额分桶。

#### 场景 2：后台管理万行表格的滚动定位

**业务背景**：运营后台单页要展示两万行订单，行高随内容变化，滚动时出现白屏与错位。低端办公机上帧率掉到 30 以下，反馈集中在拖动滚动条这个动作。

**怎么用本页知识解决**：先算每行顶部偏移形成偏移表，累加只用滚动变量，状态只依赖上一行。滚动时对偏移表二分定位，只渲染窗口内的行。

```ts
// heights: 每行实测高度；返回每行顶部偏移
function buildOffsets(heights: number[]): number[] {
  const offsets = new Array(heights.length);
  let running = 0;                 // running 等价于 dp[i-1]，只留前一项
  for (let i = 0; i < heights.length; i++) {
    offsets[i] = running;          // dp[i] = dp[i-1] + heights[i-1]
    running += heights[i];
  }
  return offsets;
}

function findStart(offsets: number[], scrollTop: number): number {
  let lo = 0, hi = offsets.length - 1;
  while (lo < hi) {                // 找最后一个偏移不大于 scrollTop 的行
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= scrollTop) lo = mid; else hi = mid - 1;
  }
  return lo;
}
```

- 偏移表只在行高变化时重建，滚动过程中不再遍历全部行。
- 滚动变量把额外空间压到一个累加值，两万行不需要额外数组存中间状态。
- 二分定位让每次滚动只做对数级比较，拖动滚动条时不产生长任务。
- 行高实测后回写 offsets，用增量方式修正后续行的偏移。
- 表头插入新行会改动整段前缀偏移，需要重建或改用 Fenwick 树维护。

**怎么度量收益**：看 Chrome DevTools Performance 面板的 Long Tasks 数量与 FPS 曲线、Lighthouse 的 Total Blocking Time、Memory 面板的 JS 堆曲线。测量方法：同一份两万行数据，在低端安卓真机上录 10 秒滚动并导出 trace，对比改动前后两份 trace。

**什么时候不该用**：

- 行高完全固定时，偏移等于行号乘行高，直接计算即可，不必维护偏移表。
- 数据频繁在表头插入或按列重排时，前缀偏移整段失效，应改用 Fenwick 树或跳表维护累加。

#### 场景 3：推送频控的时段选择

**业务背景**：运营要在一天内挑若干时段给用户发提醒，同一用户相邻两个时段不能都发，否则退订集中出现。时段按半小时切分，一天 48 个时段，用户量在百万级。

**怎么用本页知识解决**：给每个时段一个价值分，问题变成相邻互斥约束下求最大总价值。每个时段只有选与不选两种状态，只依赖前两个时段的结论，用两个变量滚动即可。

```python
def best_schedule(values):
    # values[i] 是第 i 个时段的价值分，相邻时段不能同时选
    prev2, prev1 = 0, 0              # prev2 = dp[i-2]，prev1 = dp[i-1]
    for v in values:
        cur = max(prev1, prev2 + v)  # 不选当前时段，或选它并跳过前一个
        prev2, prev1 = prev1, cur    # 滚动两个变量，空间压到常数
    return prev1
```

- `dp[0] = 0` 表示一个时段都不选，跳过的时段不产生价值也不产生惩罚。
- 价值分允许为负，表示该时段历史退订率偏高，模型会自动跳过。
- 48 个时段一次遍历完成，不需要开数组，迁移到前端也没有压力。
- 要输出具体时段时，沿 dp 表回溯并记录每步选择。
- 用户的已发送记录要作为约束输入，只算价值分会突破频控。

**怎么度量收益**：看单用户日均推送条数、推送退订率、频控规则命中次数（埋点写入 Prometheus counter）。测量方法：灰度 5% 用户，实验组用 dp 选时段、对照组按固定时段发，跑满两周后对比两组退订率。

**什么时候不该用**：

- 规则是"每天最多 N 条"这类计数窗口时，相邻互斥模型覆盖不到，要用计数器加队列。
- 需要跨用户分配总量（总预算固定）时，单用户维度的状态不够，要建全局约束模型。

### 行业先进实践

`记忆化递归用标准库缓存装饰器（出处：Python 官方文档 functools 模块的 lru_cache）`：递归表达式里保留转移方程，重复子问题的结果由装饰器缓存，调用次数从指数级降到状态数级别。这样能先用递归验证方程，再改写成按依赖顺序推进的循环。借鉴：原型阶段加缓存做对拍，确认方程正确后再考虑滚动数组。

`物化视图承载聚合结果（出处：PostgreSQL 官方文档 CREATE MATERIALIZED VIEW 与 REFRESH MATERIALIZED VIEW）`：把昂贵的聚合先算好落盘，查询读结果而不是每次重算，对应到 DP 就是把状态表持久化。刷新策略决定数据新鲜度，需要按业务选择全量或增量刷新。借鉴：报表类接口先落物化视图并定时刷新，别在请求路径里重算。

`虚拟列表按窗口渲染（出处：开源项目 react-window、vue-virtual-scroller）`：维护偏移表，只挂载窗口内的行，窗口外复用节点，DOM 节点数与数据总量脱钩。滚动时用偏移表定位起始行，避免逐行测量。借鉴：偏移表用滚动变量增量维护，定位用二分查找。

`序列比对用填表加回溯（出处：开源项目 EMBOSS 的 needle 与 water 程序）`：先填 Needleman-Wunsch 或 Smith-Waterman 得分表，再回溯得到比对路径，与"先算最优值再还原方案"的做法同构。借鉴：需要输出方案而不只是最优值时，要么保留整张表，要么逐步记录来源指针。

`解码用 Viterbi 束搜索（出处：开源项目 Kaldi）`：在 HMM 状态图上按帧推进，每帧只保留得分靠前的若干状态，丢掉低分分支，把状态数控制在可算范围内。借鉴：状态数大的 DP 可以按时序分帧做剪枝，但剪枝对结果精度的影响要先在离线数据上量一次。

### 从学到用：落地路线

第 1 步，挑一个金额上限固定、券种类不超过 20 的结算入口试点，用零钱兑换思路重写组合计算；验收标准是预发环境同一批请求的 P99 不高于改造前，且方案张数与旧逻辑逐条一致。

第 2 步，对状态表和偏移表做对拍，随机生成 1000 组输入与暴力枚举比对；验收标准是 1000 组结果全部一致，不可行输入的返回状态与产品定义一致。

第 3 步，把状态表与缓存封装成公共模块，其余入口按同一接口接入；验收标准是接入入口数量、缓存命中率、回滚开关三项在监控面板上可见。

第 4 步，把对拍用例和性能基线写进 CI，改动涉及该模块就自动跑一次；验收标准是基线用例失败会阻断合并，基线数值每次更新都有记录可查。

### 动手作业

**目标**：做一个用券组合计算器，输入券面额列表、目标金额、持券张数上限，输出最少张数、具体组合与本次耗时。

**步骤**：

1. 定义输入输出结构：面额数组、目标金额、张数上限、输出字段含耗时。
2. 写一版递归加备忘录的实现，作为正确性参照。
3. 改写成按金额从 1 到目标金额推进的循环版本，保留 dp 表。
4. 在 dp 表上回溯，还原用到的是哪几张券。
5. 加一层缓存，缓存键为面额列表加目标金额，命中直接返回。
6. 写对拍脚本，随机生成输入并与暴力枚举比对。
7. 用压测工具跑同一批输入，记录开启缓存前后的耗时分布。

**验收标准**：

- 随机 1000 组输入与暴力枚举结果完全一致。
- 目标金额 1000 元、面额种类 20 的输入，单次计算耗时在 10 毫秒以内，本机可复现。
- 缓存命中时不再进入循环，用计数器或日志验证。
- 无解输入返回明确的不可行标记，不返回 0 或空数组。
- 回溯出的组合金额之和等于目标金额。

