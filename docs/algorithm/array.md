---
title: 数组题型
description: LeetCode Hot 100 数组类题目：哈希表、滑动窗口、双指针、前缀积等典型解法与复杂度分析。
tags:
  - algorithm
  - leetcode
date: 2026-05-17
---

# 数组题型

## 1. 两数之和

**题号**: 1  
**名称**: Two Sum  
**链接**: https://leetcode.cn/problems/two-sum/

**核心思路**: 使用哈希表存储已遍历的元素及其索引，对每个元素检查 target - num 是否在哈希表中。

**JavaScript 实现**:

```javascript
function twoSum(nums, target) {
  const map = new Map(); // 存储 {值: 索引}

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }

  return [];
}
```

**复杂度分析**:
- 时间复杂度: O(n) - 遍历数组一次
- 空间复杂度: O(n) - 哈希表存储

---

## 2. 长度最小的子数组

**题号**: 209  
**名称**: Minimum Size Subarray Sum  
**链接**: https://leetcode.cn/problems/minimum-size-subarray-sum/

**核心思路**: 滑动窗口。维护一个窗口 sum，当 sum >= target 时收缩左边界，记录最小长度。

**JavaScript 实现**:

```javascript
function minSubArrayLen(target, nums) {
  // 第 1 段：初始化滑动窗口的边界与统计量
  // 这类"和 ≥ target 的最短连续子数组"题，前提是数组元素均为正数：只有正数才能保证
  // 窗口和随右指针扩张单调不减、随左指针收缩单调不增，从而让双指针可以安全地"同向推进"。
  // 若存在负数，窗口和不具单调性，本算法（及该模板）会失效。
  let left = 0;          // 窗口左边界（闭区间），仅向右移动，永不回退
  let sum = 0;           // 当前窗口 [left, right] 内所有元素之和，增量维护避免重复求和
  let minLen = Infinity; // 用 Infinity 作为"尚未找到合法窗口"的哨兵，避免用 0 造成歧义

  // 第 2 段：外层循环扩张右边界，把 nums[right] 纳入窗口
  // right 从 0 扫到末尾，每个元素最多被左右指针各访问一次，因此整体是 O(n)。
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right]; // 入窗：O(1) 更新窗口和，替代对窗口重新遍历求和

    // 第 3 段：内层循环收缩左边界，寻找"以当前 right 结尾"的最短合法窗口
    // 当 sum >= target 时，说明当前窗口达标。由于再加元素只会更长，
    // 所以此刻右端已固定，应尽可能右移 left 来压缩长度，直到窗口不再达标为止。
    // 关键点：left 只增不减，内层 while 的总执行次数在全过程也是 O(n)，不会退化成 O(n²)。
    while (sum >= target) {
      minLen = Math.min(minLen, right - left + 1); // +1 是因为 left/right 都是闭区间下标
      sum -= nums[left]; // 出窗：先把最左元素从和中剔除，再推进 left，顺序不能颠倒
      left++;
    }
    // 内层循环退出时 sum < target，窗口"欠账"，交给下一轮 right 扩张继续补足。
  }

  // 第 4 段：处理边界——若从未出现过达标窗口，minLen 仍为 Infinity，应返回 0
  // 边界条件：target 大于整个数组之和时返回 0；nums 为空数组时循环不执行，同样返回 0。
  return minLen === Infinity ? 0 : minLen;
}
```
**复杂度分析**:
- 时间复杂度: O(n) - 每个元素最多被访问两次
- 空间复杂度: O(1) - 只用常数额外空间

---

## 3. 盛水容器

**题号**: 11  
**名称**: Container With Most Water  
**链接**: https://leetcode.cn/problems/container-with-most-water/

**核心思路**: 双指针。从两端向中间移动，较短边向内移动（因为移动较长边只会使宽度减小而高度不会增加）。

**JavaScript 实现**:

```javascript
// 第 1 段：函数签名——明确输入语义与契约
// 入参 height 是"柱状图各位置的高度"数组，返回能盛下的最大水量（面积）。
// 这是一个双指针求最大值的经典题：面积 = 两边界间距 × 两边界中较矮的那个高度。
// 易错点：函数名 maxArea 与内部局部变量同名（下文会声明 let maxArea），
// 作用域上互不冲突（函数声明在外部作用域，局部变量在函数体内），但阅读时别混淆。
function maxArea(height) {
  // 第 2 段：初始化左右指针与最优解——把搜索区间设为整个数组
  // left/right 指向当前考虑的容器两侧边界，初始为 [0, n-1]，
  // 这是"从最宽区间开始、逐步收窄"的贪心式搜索起点。
  // 复杂度铺垫：区间只会单向收缩，故整个循环最多执行 n-1 次，时间 O(n)、空间 O(1)。
  let left = 0;
  let right = height.length - 1;
  // 用 0 作为哨兵初值是安全的：高度均为非负数，任意合法容器面积都 ≥ 0。
  let maxArea = 0;

  // 第 3 段：主循环——每次收缩一根"较矮的柱子"所在侧
  // 关键推理：当前区间宽度已是该对指针下的最大宽度（width = right - left），
  // 若此时还有可能得到更大面积，唯一出路是让"较矮的一侧"往内移动，
  // 因为保留矮柱、只减小宽度，面积只可能不变或变小——这是剪枝的正确性依据。
  while (left < right) {
    // 第 4 段：计算当前容器的面积并更新全局最优
    // 容器有效高度由两边界中较矮者决定（水会从矮的一侧溢出），
    // 所以取 min 而非 max；width * h 即当前容器的盛水量。
    const width = right - left;
    const h = Math.min(height[left], height[right]);
    // 每个区间都要参与比较，不能只留最后一轮；maxArea 保证答案不回退。
    maxArea = Math.max(maxArea, width * h);

    // 第 5 段：指针移动策略——丢弃较矮的一侧（贪心核心）
    // 相等时走哪边都等价：两侧都不会成为更优解的"短板瓶颈"，此处统一收缩右指针。
    // 边界条件：left 与 right 相对推进，循环条件 left < right 保证不会交叉或越界。
    if (height[left] < height[right]) {
      left++;
    } else {
      right--;
    }
  }

  // 第 6 段：返回结果
  // 循环结束时所有"可能成为最优解"的区间都已被枚举（被剪枝的区间严格劣于已访问者），
  // 因此 maxArea 即全局最大盛水量。数组长度 < 2 时返回初始值 0，符合"无法围成容器"的语义。
  return maxArea;
}
```
**复杂度分析**:
- 时间复杂度: O(n) - 双指针遍历
- 空间复杂度: O(1) - 常数额外空间

---

## 4. 最大子序和

**题号**: 53  
**名称**: Maximum Subarray  
**链接**: https://leetcode.cn/problems/maximum-subarray/

**核心思路**: Kadane 算法。遍历数组，维护当前连续和与最大和，若当前和为负则重新开始。

**JavaScript 实现**:

```javascript
// 第 1 段：初始化状态（确定"必须以某个位置结尾"的子数组和与全局最优的起点）
// 为什么两个变量都取 nums[0] 而不是 0：题目要求子数组非空，若初始化为 0，
// 当整个数组全为负数时会把"空子数组的和 0"误当成答案返回。
// maxSum 记录"到目前为止见过的最大子数组和"，currentSum 记录"以当前位置结尾的最大子数组和"。
function maxSubArray(nums) {
  let maxSum = nums[0];
  let currentSum = nums[0];

  // 第 2 段：线性扫描 + 状态转移（Kadane 算法的核心递推）
  // 每个位置 i 只有两种选择：把 nums[i] 接到前面的子数组后面，或者从 nums[i] 重新开一段。
  // 由于 currentSum 为负时 currentSum + nums[i] < nums[i]，Math.max 天然等价于
  // "前缀和为负就丢弃"，这也说明递推的不变式：currentSum 始终是"以 i 结尾"的最优解。
  // 边界：nums.length === 1 时循环体一次都不执行，直接在下文返回 nums[0]。
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]); // 要么续接，要么另起一段，取更优者
    maxSum = Math.max(maxSum, currentSum); // 答案不要求以末尾结尾，故每步都要尝试刷新全局最优
  }

  // 第 3 段：返回结果（复杂度小结）
  // 循环只跑 n-1 次，每次 O(1) 比较，整体时间 O(n)、额外空间 O(1)，无需前缀和数组或分治。
  // 易错点：不要把 maxSum 当作 currentSum 返回（后者的结尾被固定在最后一个元素）；
  // 也无需担心 JS 中整数溢出，但求和使用普通 Number 时受 2^53 精度限制。
  return maxSum;
}
```
**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

## 5. 移动零

**题号**: 283  
**名称**: Move Zeroes  
**链接**: https://leetcode.cn/problems/move-zeroes/

**核心思路**: 双指针，将所有非零元素移到数组前面，保持相对顺序。

**JavaScript 实现**:

```javascript
// 第 1 段：初始化——用一个"写指针"标记下一个非零元素应该落到的位置
// 思路：与其删除零再补零（数组中间会留空洞、或需 O(n) 额外空间），不如把非零元素整体"压缩"到前面。
// 不变式：insertPos 之前的区间永远只含非零元素且保持原有相对顺序，insertPos 本身等于已收集到的非零元素个数。
function moveZeroes(nums) {
  let insertPos = 0; // 慢指针（写指针），初值为 0 表示前部还没有任何非零元素

  // 第 2 段：快指针扫描——把所有非零元素按原顺序前移，等价于"原地压缩"
  // 为什么可行：写入位置恒有 insertPos <= i，被覆盖的 nums[insertPos] 要么已处理过、要么就是这个 nums[i] 本身，绝不会丢掉还没读的元素。
  // 易错点：判断必须写成 !== 0，若写成 if (nums[i]) 会把 -0、NaN 等假值一并当作零处理，语义就变了。
  for (let i = 0; i < nums.length; i++) { // i 是快指针：逐一看每个元素，零元素只是被跳过、不写入
    if (nums[i] !== 0) {
      nums[insertPos] = nums[i]; // 非零元素前移；insertPos === i 时属自我赋值，无需特判
      insertPos++; // 写指针推进，维持"前缀全部非零"的不变式
    }
  }

  // 第 3 段：收尾补零——快指针走完后，[insertPos, n) 这段就是被"挤"出来的空位，全部置 0
  // 循环次数恰为零元素个数，加上前面的遍历，时间 O(n)、额外空间 O(1)，且非零元素相对次序稳定（类似稳定版原地分区）。
  // 边界：全为非零时 insertPos === nums.length，while 一次都不执行；全为零时前缀为空，整段被填 0。
  // 易错点：终止条件必须用 insertPos 而不是某个提前记下的定值，否则非零元素不足时会多写 0 覆盖有效数据。
  while (insertPos < nums.length) {
    nums[insertPos] = 0;
    insertPos++;
  }
}
// 说明：本函数就地修改传入的数组，不返回新数组（返回值为 undefined）；调用方需要继续使用 nums 本身来读取结果。
```
**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

## 6. 合并区间

**题号**: 56  
**名称**: Merge Intervals  
**链接**: https://leetcode.cn/problems/merge-intervals/

**核心思路**: 先按区间起点排序，然后遍历合并重叠区间。

**JavaScript 实现**:

```javascript
function merge(intervals) {
  // 第 1 段：空/单元素短路返回（把退化输入挡在排序和扫描之前）
  // 长度 0 或 1 的区间集合天然「已合并」，无须排序，直接原样返回；
  // 若省掉这一步，下面的 intervals.sort、intervals[0] 虽多数情况下也能跑通，
  // 但对空数组取值属于「靠巧合成立」，显式短路更稳且省掉 O(n log n) 的无谓开销。
  if (intervals.length <= 1) return intervals;

  // 第 2 段：按左端点升序排序（整个贪心策略成立的前提）
  // 只有排好序，才能保证「后面的区间左端 >= 前面」，于是只需拿当前区间和
  // 结果集里的最后一个区间比较，一次线扫即可判定重叠。
  // 注意 sort 会原地修改入参数组；比较函数用 a[0] - b[0] 是因为左端点保证是数字，
  // 若返回布尔值（如 a[0] > b[0]）在 V8 中会被转成 0/1，排序结果错误。
  // 此处时间复杂度 O(n log n)，是整体复杂度的瓶颈。
  intervals.sort((a, b) => a[0] - b[0]);
  const result = [intervals[0]];

  // 第 3 段：单遍扫描合并（核心贪心循环）
  // 关键不变量：result 中始终保存「已合并且互不重叠、按左端点递增」的区间序列，
  // 因此只需要和它的最后一个区间比对即可。从 i = 1 开始，跳过已放入的 intervals[0]。
  // 易错点：result[0] 与 intervals[0] 是同一个对象引用，所以下面的 last[1] = ...
  // 会直接改写调用方传入的区间对象（有副作用，必要时应先做浅拷贝再放入 result）。
  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1];
    const current = intervals[i];

    // 第 4 段：重叠判定与合并 / 冲突则另起一段
    // 因为已按左端点排序，只需判断 current[0] <= last[1]（能接上或插入）。
    // 用 Math.max 而非直接赋值 last[1] = current[1]，是为了覆盖「当前区间被 last 完全包含」
    // 的边界情形（如 last = [1,10]、current = [2,3]），此时右端点不应被缩短。
    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      // 左端点已越过 last 的右端点（注意 <= 视为重叠，仅 > 才是真正分离），
      // 新区间与后面所有区间都不可能再与 last 重叠，安全地追加为新的尾区间。
      result.push(current);
    }
  }

  // 第 5 段：返回结果
  // result 中区间互不重叠且已按左端点递增；总复杂度 O(n log n)（排序主导），
  // 扫描本身 O(n)，额外空间 O(n)（最坏情况无任何重叠）。
  return result;
}
```
**复杂度分析**:
- 时间复杂度: O(n log n) - 排序
- 空间复杂度: O(n) - 结果存储

---

## 7. 除自身以外数组的乘积

**题号**: 238  
**名称**: Product of Array Except Self  
**链接**: https://leetcode.cn/problems/product-of-array-except-self/

**核心思路**: 左右乘积数组。先从左到右计算前缀积，再从右到左计算后缀积。

**JavaScript 实现**:

```javascript
function productExceptSelf(nums) {
  // 第 1 段：准备工作——算出规模并预分配结果数组
  // 结果数组不是额外开销而是题目要求的输出，因此除它之外只允许 O(1) 辅助空间；
  // 这里刻意不创建左积/右积两个数组，是为了把空间从 O(n) 压到 O(1)。
  const n = nums.length;
  const result = new Array(n);

  // 第 2 段：正向扫描填“左积”——result[i] 先承载 nums[0..i-1] 的乘积
  // 关键顺序：先写入再累乘，保证 result[i] 恰好“不含自己”，这是本题的第一条易错点；
  // 若写成先乘后写，结果会把 nums[i] 也卷进去，语义立刻错位。
  // 数据流：prefix 始终等于当前下标左侧所有元素的乘积，随 i 递增单调扩张。
  let prefix = 1;
  for (let i = 0; i < n; i++) {
    result[i] = prefix; // 此刻 prefix = nums[0] * ... * nums[i-1]，i=0 时为乘法单位元 1
    prefix *= nums[i];
  }

  // 第 3 段：反向扫描乘入“右积”——把右侧缺失的那一半补齐
  // 同样先乘再更新：result[i] 乘上的是 nums[i+1..n-1] 的乘积，与第 2 段的左积相乘后恰好覆盖“除自己以外”的全部元素；
  // suffix 是右侧滑动的累积量，与 prefix 对称但方向相反。
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    result[i] *= suffix; // 复用左积结果原地叠加，避免再开数组
    suffix *= nums[i];
  }

  // 第 4 段：返回结果
  // 整体时间 O(n)、额外空间 O(1)，且不做除法——因此即使 nums 中含 0 也无需特判，
  // 单个 0 只会让包含它的下标变为非零其余为 0，多个 0 时全部退化为 0，这正是用乘积代替除法的鲁棒之处。
  return result;
}
```
**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1) - 不计算输出数组

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理万行表格批量排期 | 合并区间 | 排序后单次扫描，提交合并后的紧凑区间 | 相邻区间合并策略要在产品文档中写清 |
| 低端安卓首屏卡片批量对比价格 | 除自身以外数组的乘积 | 前缀积数组加后缀积数组，或单输出数组复用 | 避免同时保留两个大数组，先算前缀再复用 |
| 多人协作白板图层清理 | 移动零 | 读写指针原位搬移 | 搬移后要截断数组，否则尾部残留空值 |
| API 网关滑动窗口限流 | 长度最小子数组 | 双指针维护窗口内请求数 | 输入时间戳必须递增，乱序先排序 |
| 订单对账两笔流水勾销 | 两数之和 | Map 按金额记录原始行号 | 金额转整数分，避免浮点误差 |
| 金融K线盘中连续涨跌段监控 | 最大子序和 | Kadane 单次扫描 | 全负数组要明确是否允许空段 |
| 广告库存排期查询 | 合并区间加长度最小子数组 | 先合并已售时段，再找最短空闲段 | 起止端点左闭右开要统一 |

### 三个场景拆解

#### 场景 1：后台管理万行表格的批量排期

**业务背景**：后台管理页展示约 1 万行日程记录，运营人员一次框选数百到上千行提交排期。多选产生的起止时间经常重叠，前端直接提交会放大请求体积，后端要重复校验。

**怎么用本页知识解决**：先按开始时间排序，再用单次扫描合并重叠或相邻区间。排序后每个区间只比较一次相邻项，避免双重循环。

```js
function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]); // 按开始时间升序
  const merged = [[intervals[0][0], intervals[0][1]]];
  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    const last = merged[merged.length - 1];
    if (start <= last[1]) { // 重叠或相邻，可合并
      last[1] = Math.max(last[1], end); // 保留最晚结束时间
    } else {
      merged.push([start, end]); // 新开一个区间
    }
  }
  return merged;
}
```

- 排序后，重叠区间会集中在下一项，只需判断相邻项。
- `start <= last[1]` 表示重叠或首尾相接，产品需要确认相邻是否合并。
- `Math.max` 防止内嵌区间缩短上一段的结束时间。
- 如果相邻不合并，把 `<=` 改成 `<`。
- 万行数据单次扫描，不随选中片段数量出现平方级比较。

**怎么度量收益**：看提交区间数量从原始选中片段数量降到合并后数量。测量时用 Chrome DevTools Performance 录制合并前后主线程耗时，再用同机同数据对比旧双重循环。

**什么时候不该用**：如果后端已接受重叠区间且要求保留原始选择边界，合并会丢失用户选择路径。如果区间只有几十条且只提交一次，排序加合并的代码会增加维护面，可直接提交。

#### 场景 2：API 网关滑动窗口限流

**业务背景**：单机网关用毫秒时间戳记录请求到达时间，判断任意滚动窗口内是否达到限流阈值。时间戳数组持续增长，每次判断都全量计数会让单次判断时间随数组长度线性上升。

**怎么用本页知识解决**：把每个时间戳视作一个请求，用双指针维护窗口内请求数。右指针加入请求，左指针移出请求，找到最短达到阈值的跨度。

```js
function hitLimit(ts, threshold, windowMs) {
  let left = 0;
  let count = 0; // 窗口内请求数
  let minSpan = Infinity;
  for (let right = 0; right < ts.length; right++) {
    count += 1; // 右指针进入一个请求
    while (count >= threshold) {
      minSpan = Math.min(minSpan, ts[right] - ts[left]); // 最短达阈跨度
      count -= 1; // 左指针移出一个请求
      left += 1;
    }
  }
  return minSpan <= windowMs; // 达阈跨度是否在窗口内
}
```

- `count` 是窗口内请求数，相当于原题中的子数组和。
- 一旦达到阈值，记录当前时间跨度并左移收缩窗口，寻找更短达阈跨度。
- 如果最短达阈跨度不超过 1 分钟，说明触发限流。
- 双指针各走一遍，时间复杂度 O(n)。
- 时间戳递增是前提，乱序输入要先排序。

**怎么度量收益**：用 `process.hrtime.bigint()` 或 `console.time` 在 10 万条时间戳上对比全量计数与滑动窗口，记录 P95 单次判断耗时。CPU 采样可用 Node.js 内置 `--prof`。

**什么时候不该用**：分布式网关要跨实例统计限流状态，单机滑动窗口不够，需要 Redis 等共享存储。如果需求是固定分钟边界，如 00:00:00 到 00:01:00，直接按时间分桶比滚动窗口更直接。

#### 场景 3：订单对账两笔流水勾销

**业务背景**：财务在页面勾选数千条流水后，要找出两笔金额之和等于目标结算额。如果每次勾选都做双重循环，比较次数会超过百万级，页面可能在按键后停住。

**怎么用本页知识解决**：遍历流水时，用 Map 记录“金额到原始行号”，每次只查目标金额减当前金额是否存在。命中即返回两笔行号，避免双重循环。

```js
function findTwoOrders(orders, target) {
  const seen = new Map(); // 金额 -> 原始行号
  for (let i = 0; i < orders.length; i++) {
    const amount = orders[i].amount; // 单位：分，避免浮点
    const need = target - amount;
    if (seen.has(need)) {
      return [seen.get(need), i]; // 先、后两笔行号
    }
    seen.set(amount, i);
  }
  return [-1, -1]; // 未命中
}
```

- Map 查找金额是 O(1)，整轮遍历是 O(n)。
- 金额先转整数分，避免 `0.1 + 0.2` 浮点误差。
- 先查再插，避免同一笔流水被用两次。
- 返回原始行号，可追溯到导出文件中的流水行。
- 重复金额会只保留最后索引，如需全部匹配，Map 的值要改成行号数组。

**怎么度量收益**：用 `console.time` 在同一 5000 条流水数据上对比双重循环与 Map 方案，记录主线程耗时和 `process.memoryUsage().heapUsed`。测试脚本固定数据和目标金额，避免随机波动。

**什么时候不该用**：如果目标金额可能由三笔及以上流水组成，两数之和无法处理，要改成三数之和或子集和。如果金额已排序，双指针省内存，此时 Map 不是唯一选择。

### 行业先进实践

- **列表虚拟化只渲染窗口行（出处：react-window 项目 README / React 官方文档“Optimizing Performance”）**：根据 `scrollTop` 和行高计算可视起始索引与结束索引，只渲染该窗口内的行。这符合滑动窗口只关心当前区间元素的做法，你的万行表格可先计算索引窗口，再交给渲染层。

- **稳定排序 Array.prototype.sort（出处：V8 官方博客《Getting things sorted in V8》）**：现代 V8 的排序稳定，合并区间按开始时间排序时，相同开始时间的原始顺序不会被打乱。你的项目可依赖稳定排序，但在旧 WebView 中需用原始索引映射兜底。

- **流式窗口聚合（出处：Apache Flink 官方文档 Windowing）**：把无界流按时间或元素个数切成有界窗口，再对窗口内状态计算。它避免对全量状态重复扫描，你的后端批处理任务可把长会话切成分钟窗口再合并。

- **段合并策略（出处：Apache Lucene 官方文档 Merge Policy）**：写入产生的小段按区间不断合并，减少文件碎片和跨段查询。你的多选区间合并可由后台低峰期任务承担，不要放在每次请求里实时归并。

- **日志索引的稀疏二分查找（出处：Apache Kafka 官方文档 Log 章节）**：日志段保存偏移索引，查找消息时先按偏移二分定位，再顺序扫描少量消息。你的有序日志或递增时间戳可借鉴二分加窗口扫描，替代全量遍历。

### 从学到用：落地路线

1. **第 1 步试点**：在后台日程页接入 `mergeIntervals`。验收：构造 1 万条区间跑单测，合并结果无重叠。
2. **第 2 步验证**：用 Chrome DevTools Performance 录制旧实现与新实现。验收：同机同数据跑 10 次，新实现 P95 主线程耗时低于旧实现。
3. **第 3 步推广**：抽成 `utils/arrayOps`，让订单匹配和限流窗口调用同一模块。验收：至少两个业务页引用同一函数，代码评审通过。
4. **第 4 步防回退**：CI 增加单测和基准脚本。验收：恢复双重循环的 PR 在 CI 失败。

### 动手作业

**目标**：写一个“忙闲区间整理器”，输入会议起止分钟数组，过滤无效区间、合并重叠区间、输出总忙碌时长与最短连续忙碌段。

**步骤**：

1. 创建 `meeting-utils.js`，输入 `intervals` 分钟整数二维数组。
2. 过滤 `start >= end` 的无效项，标记为 `null`。
3. 用移动零思路把无效项移到数组尾，再用 `length -= invalidCount` 截断。
4. 按开始分钟升序排序，合并重叠或相邻区间。
5. 计算总忙碌时长 `sum(end - start)`。
6. 用滑动窗口求最短连续会议段使忙碌时长达到 `targetMinutes`。
7. 把结果打印为 JSON，并导出 `mergeIntervals`、`minBusySpan`。

**验收标准**：

- 无效区间被移动且截断后，数组尾部不参与计算。
- 合并后任意两个区间不重叠，前一个区间的 `end <=` 后一个区间的 `start`。
- 总忙碌时长与手算一致。
- 对给定时长阈值，最短连续忙碌段返回的起止索引正确。
- `npm test` 通过至少 6 个断言，覆盖空数组、全无效、相邻区间、全重叠、未达阈值、仅一个有效区间。

