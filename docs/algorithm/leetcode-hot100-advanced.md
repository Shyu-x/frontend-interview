# LeetCode Hot 100 进阶题型整理

> 涵盖树、图、动态规划、递归回溯四大类型，每道题包含核心思路、TypeScript/JavaScript 实现及复杂度分析。

---

## 一、二叉树（Binary Tree）

### #94 二叉树的中序遍历

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

### #98 验证二叉搜索树

**核心思路**：利用 BST 的性质：左子树所有节点 < 根节点 < 右子树所有节点。中序遍历 BST 会得到递增序列。递归时传递上下界约束。

**核心实现**：

```typescript
function isValidBST(root: TreeNode | null): boolean {
  function validate(node: TreeNode | null, min: number, max: number): boolean {
    if (!node) return true;
    
    if (node.val <= min || node.val >= max) {
      return false;
    }
    
    return validate(node.left, min, node.val) && 
           validate(node.right, node.val, max);
  }
  
  return validate(root, -Infinity, Infinity);
}

// 中序遍历版本（验证递增性）
function isValidBSTInorder(root: TreeNode | null): boolean {
  let prev: number = -Infinity;
  
  function inorder(node: TreeNode | null): boolean {
    if (!node) return true;
    
    if (!inorder(node.left)) return false;
    
    if (node.val <= prev) return false;
    prev = node.val;
    
    return inorder(node.right);
  }
  
  return inorder(root);
}
```

**复杂度**：时间 O(n)，空间 O(h)。

---

### #102 二叉树的层序遍历

**核心思路**：广度优先搜索（BFS），使用队列按层处理。记录每层节点数量，逐一处理同一层的节点。

**核心实现**：

```typescript
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: number[] = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      currentLevel.push(node.val);
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    result.push(currentLevel);
  }
  
  return result;
}
```

**复杂度**：时间 O(n)，空间 O(w)，w 为最大层宽度（最坏情况 O(n)）。

---

### #104 二叉树的最大深度

**核心思路**：后序遍历，先计算左右子树的深度，再取较大值加1。也可以用层序遍历，记录层数。

**核心实现**：

```typescript
// 递归版本（后序遍历）
function maxDepth(root: TreeNode | null): number {
  if (!root) return 0;
  
  const leftDepth = maxDepth(root.left);
  const rightDepth = maxDepth(root.right);
  
  return Math.max(leftDepth, rightDepth) + 1;
}

// 层序遍历版本
function maxDepthBFS(root: TreeNode | null): number {
  if (!root) return 0;
  
  let depth = 0;
  const queue: TreeNode[] = [root];
  
  while (queue.length > 0) {
    depth++;
    const levelSize = queue.length;
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  
  return depth;
}
```

**复杂度**：时间 O(n)，空间 O(h)。

---

### #124 二叉树中的最大路径和

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

---

## 二、动态规划（Dynamic Programming）

### #70 爬楼梯

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

### #53 最大子数组和

**核心思路**：贪心 + 动态规划。遍历数组，维护以当前元素结尾的最大子序和（`dp[i] = max(dp[i-1] + nums[i], nums[i])`）。当累积和为负时，丢弃之前的累加从头开始。

**核心实现**：

```typescript
function maxSubArray(nums: number[]): number {
  let maxSum = nums[0];
  let currentSum = nums[0];
  
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  
  return maxSum;
}

// 动态规划标准版
function maxSubArrayDP(nums: number[]): number {
  const n = nums.length;
  const dp: number[] = new Array(n);
  dp[0] = nums[0];
  let max = dp[0];
  
  for (let i = 1; i < n; i++) {
    dp[i] = Math.max(dp[i - 1] + nums[i], nums[i]);
    max = Math.max(max, dp[i]);
  }
  
  return max;
}
```

**复杂度**：时间 O(n)，空间 O(1)。

---

### #198 打家劫舍

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

### #322 零钱兑换

**核心思路**：完全背包问题。状态转移：`dp[j] = min(dp[j], dp[j - coin] + 1)`。j 从 coin 到 amount 遍历（正序，因为每种硬币可用无限次）。

**核心实现**：

```typescript
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  
  for (const coin of coins) {
    for (let j = coin; j <= amount; j++) {
      dp[j] = Math.min(dp[j], dp[j - coin] + 1);
    }
  }
  
  return dp[amount] === Infinity ? -1 : dp[amount];
}

// BFS（最短路径）
function coinChangeBFS(coins: number[], amount: number): number {
  if (amount === 0) return 0;
  
  const visited = new Set<number>();
  const queue: number[] = [0];
  let depth = 0;
  
  while (queue.length > 0) {
    const size = queue.length;
    depth++;
    
    for (let i = 0; i < size; i++) {
      const current = queue.shift()!;
      
      for (const coin of coins) {
        const next = current + coin;
        
        if (next === amount) return depth;
        
        if (next < amount && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  
  return -1;
}
```

**复杂度**：时间 O(n * amount)，空间 O(amount)。

---

### #139 单词拆分

**核心思路**：完全背包问题。状态 dp[j] 表示字符串前 j 个字符能否被拆分。遍历所有单词判断是否匹配。

**核心实现**：

```typescript
function wordBreak(s: string, wordDict: string[]): boolean {
  const wordSet = new Set(wordDict);
  const n = s.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;
  
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && wordSet.has(s.substring(j, i))) {
        dp[i] = true;
        break;
      }
    }
  }
  
  return dp[n];
}

// Trie 优化版本
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd: boolean = false;
}

function wordBreakWithTrie(s: string, wordDict: string[]): boolean {
  const root = new TrieNode();
  
  for (const word of wordDict) {
    let node = root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isEnd = true;
  }
  
  const n = s.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;
  
  for (let i = 1; i <= n; i++) {
    let node = root;
    for (let j = i - 1; j >= 0; j--) {
      node = node.children.get(s[j]);
      if (!node) break;
      
      if (node.isEnd && dp[j]) {
        dp[i] = true;
        break;
      }
    }
  }
  
  return dp[n];
}
```

**复杂度**：时间 O(n * m)，空间 O(n)，其中 m 为字典单词平均长度。

---

### #62 不同路径

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

---

## 三、回溯算法（Backtracking）

### #46 全排列

**核心思路**：深度优先搜索 + 回溯。使用 used 数组标记已使用的元素，逐个尝试将元素加入当前排列。

**核心实现**：

```typescript
function permute(nums: number[]): number[][] {
  const result: number[][] = [];
  const current: number[] = [];
  const used = new Array(nums.length).fill(false);
  
  function backtrack(): void {
    if (current.length === nums.length) {
      result.push([...current]);
      return;
    }
    
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      
      used[i] = true;
      current.push(nums[i]);
      backtrack();
      current.pop();
      used[i] = false;
    }
  }
  
  backtrack();
  return result;
}

// 交换法（原地交换，无需 used 数组）
function permuteSwap(nums: number[]): number[][] {
  const result: number[][] = [];
  
  function swapAndBacktrack(start: number): void {
    if (start === nums.length) {
      result.push([...nums]);
      return;
    }
    
    for (let i = start; i < nums.length; i++) {
      [nums[start], nums[i]] = [nums[i], nums[start]];
      swapAndBacktrack(start + 1);
      [nums[start], nums[i]] = [nums[i], nums[start]]; // 回溯恢复
    }
  }
  
  swapAndBacktrack(0);
  return result;
}
```

**复杂度**：时间 O(n!)，空间 O(n)（递归栈 + 路径存储）。

---

### #78 子集

**核心思路**：回溯枚举每个子集。对于每个元素，可以选择加入或不加入。使用 start 参数避免重复组合。

**核心实现**：

```typescript
function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  const current: number[] = [];
  
  function backtrack(start: number): void {
    result.push([...current]);
    
    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);
      backtrack(i + 1);
      current.pop();
    }
  }
  
  backtrack(0);
  return result;
}

// 迭代方法（逐个添加元素）
function subsetsIterative(nums: number[]): number[][] {
  const result: number[][] = [[]];
  
  for (const num of nums) {
    const newSubsets = result.map(subset => [...subset, num]);
    result.push(...newSubsets);
  }
  
  return result;
}
```

**复杂度**：时间 O(n * 2^n)，空间 O(n)。

---

### #39 组合总和

**核心思路**：回溯 + 剪枝。 candidates 按升序排列，若当前和已超过 target 则跳过。可重复选取同一元素，所以 start 不变。

**核心实现**：

```typescript
function combinationSum(candidates: number[], target: number): number[][] {
  const result: number[][] = [];
  const current: number[] = [];
  
  candidates.sort((a, b) => a - b);
  
  function backtrack(start: number, remaining: number): void {
    if (remaining === 0) {
      result.push([...current]);
      return;
    }
    
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break; // 剪枝
      
      current.push(candidates[i]);
      backtrack(i, remaining - candidates[i]); // 可重复选取
      current.pop();
    }
  }
  
  backtrack(0, target);
  return result;
}

// 去重版本（candidates 有重复元素）
function combinationSumUnique(candidates: number[], target: number): number[][] {
  const result: number[][] = [];
  const current: number[] = [];
  
  candidates.sort((a, b) => a - b);
  
  function backtrack(start: number, remaining: number): void {
    if (remaining === 0) {
      result.push([...current]);
      return;
    }
    
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break;
      if (i > start && candidates[i] === candidates[i - 1]) continue; // 去重
      
      current.push(candidates[i]);
      backtrack(i + 1, remaining - candidates[i]);
      current.pop();
    }
  }
  
  backtrack(0, target);
  return result;
}
```

**复杂度**：时间 O(k * n^k)，空间 O(k)，k 为结果中元素的平均数量。

---

### #79 单词搜索

**核心思路**：DFS + 回溯。从 board 每个位置出发，在四个方向搜索。使用 visited 标记已访问的单元格。

**核心实现**：

```typescript
function exist(board: string[][], word: string): boolean {
  const m = board.length;
  const n = board[0].length;
  const visited = new Array(m).fill(false).map(() => Array(n).fill(false));
  
  function dfs(row: number, col: number, index: number): boolean {
    if (index === word.length) return true;
    
    if (row < 0 || row >= m || col < 0 || col >= n) return false;
    if (visited[row][col] || board[row][col] !== word[index]) return false;
    
    visited[row][col] = true;
    
    const found = dfs(row + 1, col, index + 1) ||
                  dfs(row - 1, col, index + 1) ||
                  dfs(row, col + 1, index + 1) ||
                  dfs(row, col - 1, index + 1);
    
    visited[row][col] = false;
    
    return found;
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (dfs(i, j, 0)) return true;
    }
  }
  
  return false;
}

// Trie 优化（多个单词搜索时效率更高）
function existWithTrie(board: string[][], words: string[]): string[] {
  const found: string[] = [];
  const m = board.length;
  const n = board[0].length;
  const visited = new Array(m).fill(false).map(() => Array(n).fill(false));
  
  // 构建 Trie
  class TrieNode {
    children: Map<string, TrieNode> = new Map();
    word: string | null = null;
  }
  
  const root = new TrieNode();
  for (const word of words) {
    let node = root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.word = word;
  }
  
  function dfs(row: number, col: number, node: TrieNode): void {
    const char = board[row][col];
    const childNode = node.children.get(char);
    
    if (!childNode) return;
    
    if (childNode.word) {
      found.push(childNode.word);
      childNode.word = null; // 避免重复
    }
    
    visited[row][col] = true;
    
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < m && nc >= 0 && nc < n && !visited[nr][nc]) {
        dfs(nr, nc, childNode);
      }
    }
    
    visited[row][col] = false;
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (root.children.has(board[i][j])) {
        dfs(i, j, root);
      }
    }
  }
  
  return found;
}
```

**复杂度**：时间 O(m * n * 4^L)，空间 O(L)，L 为单词长度。

---

### #17 电话号码的字母组合

**核心思路**：回溯生成所有组合。数字串中每个数字映射到多个字母，递归生成所有可能的字符串组合。

**核心实现**：

```typescript
function letterCombinations(digits: string): string[] {
  if (!digits) return [];
  
  const letterMap: Record<string, string> = {
    '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
    '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
  };
  
  const result: string[] = [];
  const current: string[] = [];
  
  function backtrack(index: number): void {
    if (index === digits.length) {
      result.push(current.join(''));
      return;
    }
    
    const letters = letterMap[digits[index]];
    for (const letter of letters) {
      current.push(letter);
      backtrack(index + 1);
      current.pop();
    }
  }
  
  backtrack(0);
  return result;
}
```

**复杂度**：时间 O(4^n)，空间 O(n)。

---

## 四、图论（Graph Theory）

### #207 课程表

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

### #200 岛屿数量

**核心思路**：网格版 DFS/BFS。遍历 grid，遇到 '1' 则进行 flood fill（沉没），将与之相连的所有 '1' 标记为 '0'，计数器加一。

**核心实现**：

```typescript
// DFS（递归）
function numIslands(grid: string[][]): number {
  if (!grid || grid.length === 0) return 0;
  
  const m = grid.length;
  const n = grid[0].length;
  let count = 0;
  
  function dfs(row: number, col: number): void {
    if (row < 0 || row >= m || col < 0 || col >= n || grid[row][col] === '0') {
      return;
    }
    
    grid[row][col] = '0'; // 沉没岛屿
    
    dfs(row + 1, col);
    dfs(row - 1, col);
    dfs(row, col + 1);
    dfs(row, col - 1);
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;
        dfs(i, j);
      }
    }
  }
  
  return count;
}

// BFS（队列）
function numIslandsBFS(grid: string[][]): number {
  if (!grid || grid.length === 0) return 0;
  
  const m = grid.length;
  const n = grid[0].length;
  let count = 0;
  const queue: [number, number][] = [];
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;
        queue.push([i, j]);
        grid[i][j] = '0';
        
        while (queue.length > 0) {
          const [row, col] = queue.shift()!;
          
          for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] === '1') {
              grid[nr][nc] = '0';
              queue.push([nr, nc]);
            }
          }
        }
      }
    }
  }
  
  return count;
}

// 并查集（Union-Find）
class UnionFind {
  parent: number[];
  rank: number[];
  count: number;
  
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
          this.parent[idx] = idx;
          this.count++;
        }
      }
    }
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    const px = this.find(x);
    const py = this.find(y);
    
    if (px !== py) {
      this.parent[px] = py;
      this.count--;
    }
  }
}

function numIslandsUnionFind(grid: string[][]): number {
  if (!grid || grid.length === 0) return 0;
  
  const m = grid.length;
  const n = grid[0].length;
  const uf = new UnionFind(grid);
  
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
  
  return uf.count;
}
```

**复杂度**：时间 O(m * n)，空间 O(m * n)（DFS/BFS 递归栈或队列）。

---

### #133 克隆图

**核心思路**：深度优先搜索 + 哈希表记录已克隆节点。遍历图，递归克隆每个节点及其邻居。

**核心实现**：

```typescript
// Node 定义
interface Node {
  val: number;
  neighbors: Node[];
}

function cloneGraph(node: Node | null): Node | null {
  if (!node) return null;
  
  const visited = new Map<number, Node>();
  
  function clone(node: Node): Node {
    if (visited.has(node.val)) {
      return visited.get(node.val)!;
    }
    
    const newNode: Node = { val: node.val, neighbors: [] };
    visited.set(node.val, newNode);
    
    for (const neighbor of node.neighbors) {
      newNode.neighbors.push(clone(neighbor));
    }
    
    return newNode;
  }
  
  return clone(node);
}

// BFS 版本
function cloneGraphBFS(node: Node | null): Node | null {
  if (!node) return null;
  
  const visited = new Map<number, Node>();
  const queue: Node[] = [node];
  
  const cloneNode = new Node(node.val, []);
  visited.set(node.val, cloneNode);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const clonedCurrent = visited.get(current.val)!;
    
    for (const neighbor of current.neighbors) {
      if (!visited.has(neighbor.val)) {
        const clonedNeighbor = new Node(neighbor.val, []);
        visited.set(neighbor.val, clonedNeighbor);
        queue.push(neighbor);
      }
      clonedCurrent.neighbors.push(visited.get(neighbor.val)!);
    }
  }
  
  return cloneNode;
}
```

**复杂度**：时间 O(V + E)，空间 O(V)。

---

### #417 太平洋大西洋水流问题

**核心思路**：多源 BFS。从海岸线逆向搜索，从太平洋（左岸+上岸）出发和从大西洋（右岸+下岸）出发分别 BFS，标记能到达的点，最后取交集。

**核心实现**：

```typescript
function pacificAtlantic(heights: number[][]): number[][] {
  if (!heights || heights.length === 0) return [];
  
  const m = heights.length;
  const n = heights[0].length;
  
  const pacific = new Array(m).fill(false).map(() => Array(n).fill(false));
  const atlantic = new Array(m).fill(false).map(() => Array(n).fill(false));
  
  // BFS 从四边海岸出发
  function bfs(reached: boolean[][]): void {
    const queue: [number, number][] = [];
    
    // 太平洋（左上边）
    for (let i = 0; i < m; i++) {
      queue.push([i, 0]);
      reached[i][0] = true;
    }
    for (let j = 0; j < n; j++) {
      queue.push([0, j]);
      reached[0][j] = true;
    }
    
    while (queue.length > 0) {
      const [row, col] = queue.shift()!;
      
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = row + dr;
        const nc = col + dc;
        
        if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
        if (reached[nr][nc]) continue;
        
        // 只能从高走向低
        if (heights[nr][nc] >= heights[row][col]) {
          reached[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }
  }
  
  bfs(pacific);
  bfs(atlantic);
  
  const result: number[][] = [];
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (pacific[i][j] && atlantic[i][j]) {
        result.push([i, j]);
      }
    }
  }
  
  return result;
}
```

**复杂度**：时间 O(m * n)，空间 O(m * n)。

---

### #547 省份数量

**核心思路**：图的连通分量问题。使用 DFS 或并查集计算有多少个连通分量。

**核心实现**：

```typescript
// DFS
function findCircleNum(isConnected: number[][]): number {
  const n = isConnected.length;
  const visited = new Set<number>();
  let provinces = 0;
  
  function dfs(city: number): void {
    visited.add(city);
    
    for (let i = 0; i < n; i++) {
      if (isConnected[city][i] === 1 && !visited.has(i)) {
        dfs(i);
      }
    }
  }
  
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      dfs(i);
      provinces++;
    }
  }
  
  return provinces;
}

// 并查集
class UnionFindSet {
  parent: number[];
  count: number;
  
  constructor(n: number) {
    this.parent = new Array(n).fill(0).map((_, i) => i);
    this.count = n;
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    const px = this.find(x);
    const py = this.find(y);
    
    if (px !== py) {
      this.parent[px] = py;
      this.count--;
    }
  }
}

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
  
  return uf.count;
}
```

**复杂度**：DFS 时间 O(n^2)，空间 O(n)；并查集时间 O(n^2 alpha(n))，空间 O(n)。

---

## 附录：复杂度速查表

| 题目 | 题号 | 类型 | 时间复杂度 | 空间复杂度 |
|------|------|------|-----------|-----------|
| 二叉树的中序遍历 | #94 | 树 | O(n) | O(h) |
| 验证二叉搜索树 | #98 | 树 | O(n) | O(h) |
| 二叉树的层序遍历 | #102 | 树 | O(n) | O(w) |
| 二叉树的最大深度 | #104 | 树 | O(n) | O(h) |
| 二叉树中的最大路径和 | #124 | 树 | O(n) | O(h) |
| 爬楼梯 | #70 | DP | O(n) | O(1) |
| 最大子数组和 | #53 | DP | O(n) | O(1) |
| 打家劫舍 | #198 | DP | O(n) | O(1) |
| 零钱兑换 | #322 | DP | O(n*amount) | O(amount) |
| 单词拆分 | #139 | DP | O(n*m) | O(n) |
| 不同路径 | #62 | DP | O(m*n) | O(min(m,n)) |
| 全排列 | #46 | 回溯 | O(n!) | O(n) |
| 子集 | #78 | 回溯 | O(n*2^n) | O(n) |
| 组合总和 | #39 | 回溯 | O(k*n^k) | O(k) |
| 单词搜索 | #79 | 回溯 | O(m*n*4^L) | O(L) |
| 电话号码的字母组合 | #17 | 回溯 | O(4^n) | O(n) |
| 课程表 | #207 | 图 | O(V+E) | O(V+E) |
| 岛屿数量 | #200 | 图 | O(m*n) | O(m*n) |
| 克隆图 | #133 | 图 | O(V+E) | O(V) |
| 太平洋大西洋水流 | #417 | 图 | O(m*n) | O(m*n) |
| 省份数量 | #547 | 图 | O(n^2) | O(n) |

**注**：n 为节点/元素数量，m/n 为网格维度，h 为树高度，V 为顶点数，E 为边数，L 为单词长度，w 为层宽度。

---

> 以上题目均来自 LeetCode Hot 100，涵盖面试中常见的进阶题型。建议按类别系统练习，理解每类问题的通用模式和解题思路。