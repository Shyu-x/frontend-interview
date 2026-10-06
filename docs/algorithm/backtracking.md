---
title: 回溯算法题型
description: LeetCode Hot 100 回溯题目：全排列、子集、组合总和、单词搜索与电话号码字母组合。
tags:
  - algorithm
  - leetcode
date: 2026-05-17
---

# 回溯算法题型

## 1. #46 全排列

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

## 2. #78 子集

**核心思路**：回溯枚举每个子集。对于每个元素，可以选择加入或不加入。使用 start 参数避免重复组合。

**核心实现**：

```typescript
// 第 1 段：回溯法——初始化"全局结果集"与"路径栈"
// result 收集所有合法子集（含空集）；current 是当前递归路径上的"已选元素序列"。
// 关键点：两者都在闭包外声明，因此回溯过程中被共享/修改，而不是每层新建。
function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  const current: number[] = [];

  // 第 2 段：回溯函数定义——用 start 作为"决策边界"
  // start 表示下一层只能从 nums[start] 起选，保证 [1,2] 与 [2,1] 不会同时出现，
  // 从而把"组合型枚举"限制在一棵无重复的决策树上（而非全排列树）。
  function backtrack(start: number): void {
    // 第 3 段：每个节点都收集，而不是只在叶子收集
    // 子集问题的答案分布在决策树的"所有节点"上（根节点就是空集），
    // 因此进入函数立刻快照 current；必须用 [...current] 深拷贝一层，
    // 否则存的是同一个数组引用，后续 pop 会把已收集的结果改空。
    result.push([...current]);

    // 第 4 段：枚举本层可选的"下一个元素"，并做选择 → 递归 → 撤销
    // i 从 start 开始而非 0，是避免重复组合的核心；push 后 current 的长度即递归深度，
    // backtrack(i+1) 保证同一元素不被重复选取（子集不允许重复用同一个下标）。
    // pop 是"状态还原"：回到本层时 current 必须与进入循环前一致，否则兄弟分支会污染。
    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);
      backtrack(i + 1);
      current.pop();
    }
  }

  // 第 5 段：启动回溯并返回
  // 从下标 0 开始，整棵决策树遍历完成后 result 即包含全部 2^n 个子集。
  // 复杂度：时间 O(n·2^n)（共 2^n 个节点，每个快照拷贝 O(n)），
  // 递归栈空间 O(n)，不计输出的话额外空间为 O(n)。
  backtrack(0);
  return result;
}

// 第 6 段：迭代法——从"已知子集集合"出发，逐个元素扩展
// 与回溯的搜索视角不同，这里是构造视角：处理到第 k 个元素时，
// result 恰好保存了前 k 个元素能生成的所有子集。
// 起点 [[]] 必须包含空集，否则"一个都不选"的情况会丢失。
// 迭代方法（逐个添加元素）
function subsetsIterative(nums: number[]): number[][] {
  const result: number[][] = [[]];

  // 第 7 段：每个新元素把当前集合规模翻倍
  // 对已有每个子集 subtree，追加 num 得到"选 num"的新分支；
  // 旧子集本身保留，代表"不选 num"。于是 |result| 每轮 ×2，最终为 2^n。
  // 易错点：必须先用 map 生成 newSubsets，再 push 回 result。
  // 若边遍历 result 边 push，循环会读到不断增长的新元素（甚至无限循环）；
  // 同时 map 内的 [...subset, num] 不可写成 subset.push(num)，
  // 否则会原地改写已存进 result 的旧子集，破坏"不选"分支。
  for (const num of nums) {
    const newSubsets = result.map(subset => [...subset, num]);
    result.push(...newSubsets);
  }

  // 第 8 段：返回结果
  // 与回溯版内容等价但顺序不同：本方法按"子集大小分层"产出，
  // 回溯版按"字典序深度优先"产出。
  // 注意 result.push(...newSubsets) 用展开传参，元素极多时可能触碰实参个数上限，
  // 教学场景下 n 较小无碍，工程中可改为循环逐个 push。
  return result;
}
```
**复杂度**：时间 O(n * 2^n)，空间 O(n)。

---

## 3. #39 组合总和

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

## 4. #79 单词搜索

**核心思路**：DFS + 回溯。从 board 每个位置出发，在四个方向搜索。使用 visited 标记已访问的单元格。

**核心实现**：

```typescript
function exist(board: string[][], word: string): boolean {
  // 第 1 段：准备网格尺寸与访问标记矩阵（DFS 的回溯状态）
  // visited 必须每个格子独立一份，因此用 map 逐行生成，否则所有行会共享同一个数组引用。
  // 这里选择布尔矩阵而非原地改写 board，是为了不改动输入、语义更清晰；代价是 O(m*n) 额外空间。
  const m = board.length;
  const n = board[0].length;
  const visited = new Array(m).fill(false).map(() => Array(n).fill(false));
  
  // 第 2 段：深度优先搜索——沿当前路径逐字符匹配 word
  // index 表示"已经匹配到 word 的第几个字符"，也是递归深度的度量。
  function dfs(row: number, col: number, index: number): boolean {
    // 先判断成功：index 走到 word.length 说明整词匹配完成，无需再检查坐标。
    if (index === word.length) return true;
    
    // 边界检查放在后面，是因为成功判定与坐标无关；越界即此路不通，直接剪枝。
    if (row < 0 || row >= m || col < 0 || col >= n) return false;
    // 双重剪枝：已访问（防止走回头路）+ 字符不匹配（当前路径作废）。
    if (visited[row][col] || board[row][col] !== word[index]) return false;
    
    // 第 3 段：标记当前格为"路径中"，进入下一步递归
    // 标记后才递归，保证同一格在同一条路径里不会被重复使用。
    visited[row][col] = true;
    
    // 第 4 段：向上下左右四个方向继续匹配下一个字符
    // 用 || 短路：任一方向成功即整体成功，省去多余搜索。方向顺序不影响正确性，只影响命中早晚。
    const found = dfs(row + 1, col, index + 1) ||
                  dfs(row - 1, col, index + 1) ||
                  dfs(row, col + 1, index + 1) ||
                  dfs(row, col - 1, index + 1);
    
    // 第 5 段：回溯——撤销当前格的标记，让其他路径可以再次经过它
    // 这一步是回溯算法的灵魂，漏掉会导致后续起点搜索被错误屏蔽；必须在 return 前执行。
    visited[row][col] = false;
    
    return found;
  }
  
  // 第 6 段：枚举所有起点并触发 DFS
  // 单词可能从任意一格开始；时间复杂度最坏 O(m*n*4^L)（L 为单词长度），空间 O(m*n)。
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (dfs(i, j, 0)) return true;
    }
  }
  
  return false;
}

// Trie 优化（多个单词搜索时效率更高）
function existWithTrie(board: string[][], words: string[]): string[] {
  // 第 1 段：收集结果与初始化访问矩阵
  // found 顺序取决于遍历顺序，题目通常只要求返回集合，不保证字典序。
  const found: string[] = [];
  const m = board.length;
  const n = board[0].length;
  const visited = new Array(m).fill(false).map(() => Array(n).fill(false));
  
  // 构建 Trie
  // 第 2 段：定义 Trie 节点结构
  // children 用 Map 而非固定大小数组，是为了适配任意字符集（含中文、Unicode）。
  // word 只在单词结尾节点非空，等于"把整词挂在终点"，回溯时可直接取出答案。
  class TrieNode {
    children: Map<string, TrieNode> = new Map();
    word: string | null = null;
  }
  
  // 第 3 段：把所有待搜索单词插入 Trie
  // 共享前缀的单词只存一份路径，使 DFS 能同时推进多个候选词，避免每个词各跑一遍棋盘。
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
  
  // 第 4 段：棋盘上的 Trie 引导 DFS——沿树边走边匹配，而非逐词比对
  // node 代表"当前已匹配前缀所处的 Trie 节点"，递归深入即匹配下一个字符。
  function dfs(row: number, col: number, node: TrieNode): void {
    const char = board[row][col];
    const childNode = node.children.get(char);
    
    // 无对应子节点说明当前前缀无法延伸，整条分支剪掉（Trie 天然剪枝）。
    if (!childNode) return;
    
    // 命中完整单词就收集；随后把 word 置空，避免同一单词被多条路径重复收录。
    if (childNode.word) {
      found.push(childNode.word);
      childNode.word = null; // 避免重复
    }
    
    visited[row][col] = true;
    
    // 第 5 段：以方向数组统一展开四个邻居
    // 只需判断"未访问"，边界由坐标范围校验承担；它天然保证了 board[row][col] 可安全读取。
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < m && nc >= 0 && nc < n && !visited[nr][nc]) {
        dfs(nr, nc, childNode);
      }
    }
    
    // 回溯撤销，恢复棋盘可复用状态；注意 Trie 节点本身不做撤销，避免重复收录是永久生效的。
    visited[row][col] = false;
  }
  
  // 第 6 段：枚举起点，仅从 Trie 根节点能接上的字符出发
  // 先做 root.children.has 判断，相当于一次常数级预剪枝，省掉大量注定失败的 dfs 调用。
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

## 5. #17 电话号码的字母组合

**核心思路**：回溯生成所有组合。数字串中每个数字映射到多个字母，递归生成所有可能的字符串组合。

**核心实现**：

```typescript
// 第 1 段：前置校验与数字→字母映射表（把问题输入转换成可查表的静态字典）
// 递归开始前必须先把"不可能有解"的输入挡掉：空串没有任何按键，答案是空数组，
// 否则后续 backtrack(0) 会以 index===0===digits.length 直接推入一个空字符串 ''，得到错误的 ['']。
function letterCombinations(digits: string): string[] {
  if (!digits) return [];

  // 映射表覆盖 2~9；注意 '7' 与 '9' 对应 4 个字母，其余为 3 个，
  // 这个"每个数字字母数不等"的事实正是后面最坏时间复杂度取 4^n 的原因。
  const letterMap: Record<string, string> = {
    '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
    '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
  };

  // 第 2 段：结果集与"路径"状态（DFS 回溯的核心数据结构）
  // current 用字符数组而不是字符串，是为了让 push/pop 都是 O(1)；
  // 只有需要落盘时才 join 成字符串，避免在递归过程中反复做 O(n) 的字符串拼接。
  const result: string[] = [];
  const current: string[] = [];

  // 第 3 段：递归函数签名与终止条件（走到叶子即得到一个完整组合）
  // index 表示"当前正在决策 digits 的第几位"，它同时充当递归深度，
  // 因此不需要额外的 used 数组——这个问题的选择是按位推进的，天然不会重复选取。
  function backtrack(index: number): void {
    if (index === digits.length) {
      // 递归边界：每一位都已选好字母，路径长度为 n，此刻的路径就是一个解。
      // 这里用 join('') 做一次快照拷贝，否则后续 pop 会污染已加入 result 的内容。
      result.push(current.join(''));
      return;
    }

    // 第 4 段：本层可选项展开 —— 选一个字母、深入下一层、再撤销（choose / explore / unchoose）
    // letters 是本层数字对应的候选字母集，循环体就是 DFS 的分支展开点。
    const letters = letterMap[digits[index]];
    for (const letter of letters) {
      current.push(letter);      // 做选择：把当前字母加入路径
      backtrack(index + 1);      // 进入下一位的决策层
      current.pop();             // 撤销选择：回到本层起点，供下一个兄弟分支复用同一数组
    }
  }

  // 第 5 段：入口调用与返回（自底向上把完整解收集完毕后统一返回）
  // 复杂度：时间 O(4^n · n)，每个叶子输出一次 O(n) 的 join；空间 O(n) 为递归栈与 current，
  // result 本身占用 O(4^n · n)，属于必要输出、不计入额外空间。
  backtrack(0);
  return result;
}
```
**复杂度**：时间 O(4^n)，空间 O(n)。

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理"万行表格"的导出列组合 | #39 组合总和 | 浏览器 Web Worker + 递归枚举 | 列数超过 20 时组合数爆炸，先定硬上限 |
| 低端安卓首屏资源分包 | #39 组合总和 + 剪枝 | Gradle 插件 + 离线 Python 脚本 | 体积单位统一成 KB，否则剪枝条件失效 |
| 多人协作白板的连线校验 | #79 单词搜索 | Canvas + 吸附网格 + DFS | 网格先降采样成固定间距再搜索 |
| 客服 IVR 短号候选词扩展 | #17 电话号码的字母组合 | Trie + DFS 前缀剪枝 | 前缀查询方法要自己在 Trie 里实现 |
| CI 构建变体矩阵生成 | #78 子集 | CI 配置模板 + 递归展开 | 变体数量设硬上限，避免流水线被拖住 |
| 角色-菜单权限排列去重 | #46 全排列 + used 标记 | 位掩码 + Set 去重 | 有重复项时先排序，同层跳过相同值 |
| 表单联动规则的字段依赖校验 | #46 全排列 + 冲突剪枝 | 前端校验库 + DFS | 冲突判定要能 O(1) 查询，否则剪枝白做 |
| 棋盘类关卡可达性自检 | #79 单词搜索 | 关卡编辑器 + DFS | 大棋盘改用双向 BFS 控制节点扩展 |

### 三个场景拆解

#### 场景 1：低端安卓首屏资源分包

**业务背景**：低端机上首屏加载慢，团队想给首屏资源定一个体积预算，从候选资源里挑出刚好装满预算的一组。候选资源数量从几十涨到几百后，人工试组合已经不可行。

**怎么用本页知识解决**：先把话说白，能装满预算就算一组可行解，术语叫组合总和。每个资源只能用一次，所以递归从 i+1 往后走；单个资源超预算直接跳过，同体积的资源在同一层只试一次。

```python
def pick_assets(items, budget):
    # items: [(name, kb)]，budget: 首屏资源预算上限（KB）
    res, path = [], []
    items.sort(key=lambda x: -x[1])          # 大文件先试，更早触发剪枝
    def dfs(start, remain):
        if remain == 0:                      # 预算装满，记录一组可行解
            res.append(path.copy()); return
        for i in range(start, len(items)):
            kb = items[i][1]
            if kb > remain: continue         # 剪枝：单个资源超预算直接跳过
            if i > start and kb == items[i - 1][1]: continue  # 同层同体积去重
            path.append(items[i][0])
            dfs(i + 1, remain - kb)          # 每个资源只用一次，从 i+1 继续
            path.pop()                       # 回溯：撤销本次选择
    dfs(0, budget)
    return res
```

- 排序是为了让大文件先进入递归，剩余预算收缩得快，跳过的分支变少。
- `i + 1` 保证同一资源不会被重复选中，这是"每个元素用一次"的直接体现。
- `if i > start and kb == items[i-1][1]` 处理同体积资源，避免输出重复组合。
- `path.pop()` 是回溯的收尾动作，缺了它下一轮分支会带着脏数据。
- 脚本放在离线流水线跑，产出的组合表再交给 Gradle 插件打包。

**怎么度量收益**：看三个指标，首屏 FCP 与 LCP、离线枚举耗时、产出的组合数量。FCP 与 LCP 用 Lighthouse 跑同一台低端机或同一档 CPU 降速配置；枚举耗时用 hyperfine 跑 10 次取中位数；组合数量直接打印结果数组长度。

**什么时候不该用**：
- 候选资源在 20 个以内、预算又宽松时，按体积降序贪心取前几个就行，枚举开销大于收益。
- 每个资源带权重且可以有多个版本时，问题变成带权背包，用动态规划描述状态比枚举组合直接。

#### 场景 2：多人协作白板的连线校验

**业务背景**：白板上用户拖出一条连线后，前端要判断这条线是否按顺序经过了指定锚点，连错就给出提示。白板网格是固定间距的，一次拖拽产生的锚点序列长度通常在 3 到 8 之间。

**怎么用本页知识解决**：这是单词搜索的变形，网格里存锚点类型，待匹配的是锚点序列。用 used 集合标记本路径走过的格子，四个方向递归，任一起点命中即可返回。

```python
def link_ok(grid, anchors):
    # grid: 白板吸附网格；anchors: 连线经过的锚点序列
    R, C, used = len(grid), len(grid[0]), set()   # used 记录本路径占用的格子
    def dfs(r, c, k):
        if k == len(anchors): return True         # 锚点全部匹配，路径成立
        if not (0 <= r < R and 0 <= c < C): return False          # 越界，剪枝
        if grid[r][c] != anchors[k] or (r, c) in used: return False  # 不符或已走，剪枝
        used.add((r, c))                          # 标记当前格子
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):  # 四个方向逐个试
            if dfs(r + dr, c + dc, k + 1):
                used.remove((r, c)); return True  # 命中后先撤销标记再返回
        used.remove((r, c))                       # 四个方向都失败，撤销标记
        return False
    return any(dfs(r, c, 0) for r in range(R) for c in range(C))  # 任一起点命中即可
```

- `used` 用集合而不是二维布尔数组，白板格子稀疏时内存占用小。
- 三个剪枝顺序有讲究，长度判断放最前，越界判断次之，字符比对放最后。
- 命中后先 `remove` 再 `return`，否则同一次会话里的下一次校验会读到脏标记。
- 外层用 `any` 短路，命中一个起点就不再试其余起点。
- 校验放在前端主线程外的 Worker 里，避免长递归阻塞拖拽。

**怎么度量收益**：看单次校验 P95 耗时和每秒校验次数。前端在调用前后用 performance.now() 打点并上报，再用 Chrome DevTools 的 Performance 面板核对是否存在长任务；服务端批量校验用 pytest-benchmark 或 wrk 压。

**什么时候不该用**：
- 网格达到几万格且要求返回最短路径时，双向 BFS 或 A* 的节点扩展次数低于全网格 DFS。
- 只判断两点是否连通、不关心路径形状时，用并查集或洪水填充做一次预处理即可回答后续查询。

#### 场景 3：客服 IVR 短号候选词扩展

**业务背景**：用户在电话里按一串数字键，系统要给出这串按键可能对应的业务词候选，方便坐席确认。按键序列长度一般是 3 到 6，词典规模在几千条量级。

**怎么用本页知识解决**：这是电话号码字母组合的直接套用，每个按键对应多个字母，逐层展开。差别在于展开时用 Trie 判断前缀是否存在，词典里没有的前缀整枝砍掉。

```python
KEY = {'2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
       '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'}

def expand(digits, trie):
    # trie: 项目内自建的词典前缀结构，提供 has_prefix 方法
    out = []
    def dfs(i, prefix):
        if i == len(digits):          # 按键走完，prefix 是一个候选词
            out.append(prefix); return
        for ch in KEY.get(digits[i], ''):
            nxt = prefix + ch
            if not trie.has_prefix(nxt):   # 词典无此前缀，整枝砍掉
                continue
            dfs(i + 1, nxt)           # 进入下一个按键
    dfs(0, '')
    return out
```

- `KEY` 是按键到字母的映射表，`get` 带默认空串，遇到 0 和 1 直接返回空结果。
- `has_prefix` 是项目内 Trie 的方法，不是标准库接口，需要自己实现并做单元测试。
- 前缀剪枝把候选量从 4 的 n 次方压到词典规模量级，这是本场景的关键改动。
- 递归深度等于按键个数，实际业务里不会超过 8 层，不需要改成显式栈。
- 输出排序按词频或业务权重，交给上层做首候选决策。

**怎么度量收益**：看首候选命中率、平均候选词数和扩展 P95 耗时。命中率用离线日志回放，把真实按键序列和坐席最终选择的词做比对；延迟用 pytest-benchmark 在固定词典上跑。

**什么时候不该用**：
- 词典只有几百条时，直接对每条词做按键编码再比对，省掉 Trie 的构建与维护成本。
- 需要容错一个按键的模糊匹配时，前缀剪枝会误杀正确分支，改用编辑距离的动态规划。

### 行业先进实践

约束传播加冲突学习（出处：Google OR-Tools CP-SAT 官方文档）。CP-SAT 在搜索过程中做约束传播，遇到冲突就回跳并记录冲突原因，减少重复探索同一片无效空间。借鉴方式是把"剩余预算上界"这类可推导的约束提前算出来，在递归入口先判断，而不是等到叶子节点才失败。

增量求解的 push 与 pop（出处：Z3 官方 Solver 文档）。Z3 允许把一批约束压栈，求解后弹栈复用前面的推理状态，避免每次从零重算。借鉴方式是在批量校验白板路径时，把已探索区域的结果缓存起来，新的校验请求先查缓存再决定是否进入递归。

位掩码表示访问标记（出处：Go 标准库 math/bits 包文档）。当元素数量不超过机器字长时，用一个整数表示 used，配合 OnesCount 做计数，替代布尔数组。借鉴方式是把元素数控制在 64 以内，用整数位表示"已选"，回溯时按位异或即可还原。

多模式串一次扫描（出处：Aho 与 Corasick 1975 年论文《Efficient String Matching: An Aid to Bibliographic Search》）。AC 自动机一趟扫描就能找出全部模式串的出现位置，省掉对每个模式串单独搜索的开销。借鉴方式是文本类敏感词检测不要套用网格 DFS，两者的问题形状不同。

显式栈替代递归（出处：需核对官方文档：核对 Node.js CLI 文档中 --stack-size 的当前说明与默认值）。递归深度受运行时栈限制，深度较大的枚举在部分运行时上会抛出栈溢出错误。借鉴方式是给递归加一个深度上限断言，超过阈值时改成显式栈实现，并在压测里专门覆盖深分支。

### 从学到用：落地路线

第 1 步，选一个候选规模在 50 到 200 之间的模块试点，例如离线资源分包脚本。验收标准：脚本能对同一份输入稳定输出同一组结果。

第 2 步，写基准测试对比回溯解与现有贪心解或人工解，记录耗时和结果质量。验收标准：基准脚本可用一条命令复现，输出包含输入规模、耗时中位数、结果条数。

第 3 步，把剪枝条件、输入规模上限、结果数量上限写成模块的使用说明，推广到其余枚举场景。验收标准：新增调用方按说明传参，超上限时接口返回明确的错误码而不是跑满 CPU。

第 4 步，把基准测试挂进 CI，设定规模上限与耗时阈值，超阈值即失败。验收标准：人为把输入规模翻倍后 CI 能红灯，回退到原规模后 CI 恢复绿灯。

### 动手作业

**目标**：实现一个"候选资源选包"小工具，输入一批带体积的资源和一个预算上限，输出所有刚好装满预算的组合，并给出耗时统计。

**步骤**：
1. 造测试数据，生成 20、40、80 三档资源数量，体积取 1 到 20 之间的整数。
2. 实现基础版递归枚举，不加任何剪枝，先跑通正确性。
3. 加入三条剪枝：单资源超预算跳过、剩余预算上界判断、同层同体积去重。
4. 加入输入规模上限和输出数量上限，超限时抛出自定义异常。
5. 用 pytest-benchmark 对三档规模各跑一次，记录耗时中位数。
6. 把递归改成显式栈版本，跑同一份基准，比较两种实现的耗时和最大递归深度。
7. 写一份 README，说明剪枝条件、复杂度量级和参数上限的取值理由。

**验收标准**：
- 基础版与剪枝版在同一份输入上的输出集合完全一致，可用集合比对断言。
- 80 个资源的用例在设定上限内返回结果或抛出明确异常，不出现无限等待。
- 基准脚本输出三档规模的耗时中位数，且同一档重复运行的结果差异可观察。
- 显式栈版本在深度超限的输入上不抛栈溢出错误。
- README 中列出的每条剪枝条件都能对应到代码里的具体行。

