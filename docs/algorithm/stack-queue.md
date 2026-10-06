---
title: 栈与队列题型
description: LeetCode Hot 100 栈与队列类题目：有效括号、单调栈、最小栈、栈实现队列与逆波兰表达式。
tags:
  - algorithm
  - leetcode
date: 2026-05-17
---

# 栈与队列题型

## 1. 有效的括号

**题号**: 20  
**名称**: Valid Parentheses  
**链接**: https://leetcode.cn/problems/valid-parentheses/

**核心思路**: 栈匹配。遇到左括号入栈，遇到右括号与栈顶匹配。

**JavaScript 实现**:

```javascript
// 第 1 段：初始化"记忆容器"与配对字典（为后续的括号匹配准备数据结构）
// 栈保存"尚未闭合的左括号"，且必须满足后进先出：只有最近打开的括号才允许被最近遇到的右括号闭合。
// map 把右括号映射到它期望的左括号，使每次校验都是 O(1) 查表，避免写一堆 if-else 分支。
function isValid(s) {
  const stack = [];
  const map = {
    ')': '(',
    '}': '{',
    ']': '['
  };

  // 第 2 段：单次线性扫描，按字符类型分流（左括号入栈 / 右括号立即结算）
  // 用 for...of 而非下标循环，是按"字符"而非"UTF-16 码元"遍历，语义上对应题目的一串括号。
  for (const char of s) {
    if ('({['.includes(char)) {
      stack.push(char); // 左括号一律先记账，匹配与否推迟到遇见右括号时再判断
    } else {
      // 第 3 段：右括号的即时校验——"弹出栈顶"与"查表期望值"做比较
      // 关键点在于 stack.pop() 的返回值：栈空时它返回 undefined，因此多余的右括号会自动对不上任何左括号而判定失败，无需额外判空。
      // 一旦不匹配即可 return false，因为括号序列的合法性是"全称命题"，一个反例就足以否定整体，无需继续扫描。
      if (stack.pop() !== map[char]) {
        return false;
      }
    }
  }

  // 第 4 段：收尾判定——所有左括号都必须已被闭合
  // 扫描结束仍有残留，说明存在"只开不闭"的情况；用长度比较而不是逐元素检查，因为此时栈内元素必定都是左括号。
  // 易错点：输入若混入非括号字符，map[char] 为 undefined，可能与空栈的 pop() 结果相等而被放过；本题约定输入只含括号。
  // 整体复杂度：时间 O(n)（每个字符最多入栈/出栈一次），空间 O(n)（最坏情况如 "(((((" 全部入栈）。
  return stack.length === 0;
}
```
**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(n) - 栈空间

---

## 2. 每日温度

**题号**: 739  
**名称**: Daily Temperatures  
**链接**: https://leetcode.cn/problems/daily-temperatures/

**核心思路**: 单调递减栈。存储索引，若遇到更大温度则弹出并计算距离。

**JavaScript 实现**:

```javascript
function dailyTemperatures(temperatures) {
  // 第 1 段：预处理与结果容器初始化（先把"每个位置至少等 0 天"的默认答案铺好）
  // 结果数组用 0 填充：题设要求"之后不会升温则记 0"，这样后面只需回填真正能找到更暖日子的位置，无需再补默认值。
  // 栈里存的是"还没找到更暖日子的下标"，而非温度值本身——因为答案要的是天数差 i - prevIndex，存下标才能算距离。
  const n = temperatures.length;
  const result = new Array(n).fill(0);
  const stack = []; // 存储索引

  // 第 2 段：单调栈主循环（线性扫描，用当前温度去"结算"栈中更冷的日子）
  // 栈从底到顶对应的温度单调不增：越靠近栈顶，越是"又晚又冷"、最容易先被当前这天满足的日子。
  // 因此一旦 temperatures[i] 大于栈顶温度，栈顶那天的最优答案就被 i 唯一确定，可以立刻弹出并结算（贪心 + 单调性保证正确）。
  // 用 while 而非 if：当前这天可能一次性终结栈内连续多个更冷的日子。整体每个下标最多入栈、出栈各一次，时间复杂度 O(n)。
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {
      const prevIndex = stack.pop();
      result[prevIndex] = i - prevIndex; // 天数差 = 当前下标 - 被结算下标，即"等待的天数"
    }
    // 第 3 段：当前下标入栈，等待未来某天来"结算"它
    // 注意：即使 temperatures[i] 等于栈顶温度也不能结算（题设严格大于才算更暖），所以相等的情况会继续留在栈里。
    stack.push(i);
  }

  // 第 4 段：收尾返回（留在栈中的下标始终未被弹出，其 result 保持初始的 0，语义正好是"此后不再升温"）
  return result;
}
```
**复杂度分析**:
- 时间复杂度: O(n) - 每个元素最多入栈出栈各一次
- 空间复杂度: O(n) - 栈空间

---

## 3. 最小栈

**题号**: 155  
**名称**: Min Stack  
**链接**: https://leetcode.cn/problems/min-stack/

**核心思路**: 使用两个栈，一个普通栈一个最小栈同步维护。

**JavaScript 实现**:

```javascript
// MinStack：在 O(1) 时间内完成 push / pop / top / getMin 的栈。
// 核心思路是"空间换时间"——用第二个辅助栈单独记录每个阶段的历史最小值，
// 从而避免每次查询最小值都去遍历主栈（那样会是 O(n)）。

// 第 1 段：构造函数——初始化两套存储（这一段搭建双栈骨架）
class MinStack {
  constructor() {
    this.stack = [];    // 主栈：完整保存压入的所有元素，决定真实的进出顺序
    this.minStack = []; // 辅助栈：单调不增栈，栈顶永远是当前主栈中的最小值
    // 易错点：minStack 与 stack 长度并不一一对应，它只记录"曾被打破的最小值"，
    // 所以千万不要用同一下标去访问两个栈，只能各自读栈顶。
  }

  // 第 2 段：push——压入元素并同步维护最小值栈（这一段保证 getMin 的 O(1) 前提）
  push(val) {
    this.stack.push(val);
    // 只有当新值"不大于"当前最小值时才入辅助栈：等于时也入栈，
    // 否则重复的最小值被弹出时会误删辅助栈记录，导致 getMin 提前失效。
    if (this.minStack.length === 0 || val <= this.minStack[this.minStack.length - 1]) {
      this.minStack.push(val);
    }
  }

  // 第 3 段：pop——弹出元素并同步回收最小值记录（这一段维持两栈一致性）
  pop() {
    const val = this.stack.pop(); // 边界：空栈时返回 undefined，调用方需自行保证栈非空
    // 仅当被弹出的正是辅助栈栈顶时，才说明"当前最小值的最后一次出现"被移除，
    // 此时辅助栈也必须弹出；若 val 更大，说明最小值仍在主栈里，无需处理。
    if (val === this.minStack[this.minStack.length - 1]) {
      this.minStack.pop();
    }
  }

  // 第 4 段：top——读取主栈栈顶（这一段只关心真实栈顶，与最小值无关）
  top() {
    return this.stack[this.stack.length - 1]; // 空栈时返回 undefined
  }

  // 第 5 段：getMin——直接取辅助栈栈顶（这一段是双栈设计换来的 O(1) 查询）
  getMin() {
    return this.minStack[this.minStack.length - 1]; // 不遍历、不比较，辅助栈栈顶已是最小值
    // 整体复杂度：每个元素最多在辅助栈进出各一次，故各操作均摊 O(1)，额外空间 O(n)。
  }
}
```
**复杂度分析**:
- 时间复杂度: O(1) - 所有操作
- 空间复杂度: O(n)

---

## 4. 用栈实现队列

**题号**: 232  
**名称**: Implement Queue using Stacks  
**链接**: https://leetcode.cn/problems/implement-queue-using-stacks/

**核心思路**: 双栈，输入栈和输出栈。队首元素在输出栈顶。

**JavaScript 实现**:

```javascript
// 第 1 段：数据结构初始化——用两个栈模拟一个队列（核心思路：栈是后进先出 LIFO，队列是先进先出 FIFO，靠两次「反转」把顺序掰回来）
class MyQueue {
  // inStack 只负责「进」，outStack 只负责「出」。把读写分到两个栈上，是为了避免每次操作都整体搬移数据
  constructor() {
    this.inStack = [];
    this.outStack = [];
  }

  // 第 2 段：入队 push——新元素一律压入 inStack（O(1)，不碰 outStack）
  push(x) {
    // 关键约定：push 绝不触碰 outStack，否则会打乱 outStack 中已经倒好的出队顺序
    this.inStack.push(x);
  }

  // 第 3 段：倒栈 transfer——惰性搬运，本实现的时间复杂度关键所在
  transfer() {
    // 只有 outStack 空了才搬运：若 outStack 还有元素，它顶部就是更早入队的元素，此时再搬会把新元素压在上面，顺序就错了
    if (this.outStack.length === 0) {
      // 把 inStack 全部弹出并压入 outStack：一次整体反转，使栈顶变成最早入队的元素
      while (this.inStack.length > 0) {
        this.outStack.push(this.inStack.pop());
      }
    }
  }

  // 第 4 段：出队 pop——先保证 outStack 有货，再从栈顶取走队首
  pop() {
    this.transfer();
    // 边界条件：队列为空时 outStack.pop() 返回 undefined，这里不做抛错处理，属于「未定义行为」而非异常
    return this.outStack.pop();
  }

  // 第 5 段：取队首 peek——与 pop 共用 transfer 逻辑，唯一区别是只读不删
  // 易错点：必须先 transfer，否则 outStack 为空或尚未倒序，取到的不是真正的队首；直接读 inStack[0] 也是错的，因为队首可能还压在 outStack 里
  peek() {
    this.transfer();
    return this.outStack[this.outStack.length - 1];
  }

  // 第 6 段：判空 empty——两个栈都空，队列才真的空（只看一个栈会漏判）
  empty() {
    return this.inStack.length === 0 && this.outStack.length === 0;
  }
}
```
**复杂度分析**:
- 时间复杂度: 均摊 O(1)
- 空间复杂度: O(n)

---

## 5. 下一个更大元素 I

**题号**: 496  
**名称**: Next Greater Element I  
**链接**: https://leetcode.cn/problems/next-greater-element-i/

**核心思路**: 单调栈从后向前遍历 nums2，同时用哈希表记录结果。

**JavaScript 实现**:

```javascript
function nextGreaterElement(nums1, nums2) {
  // 第 1 段：准备"值 → 下一个更大元素"的查询容器，把暴力双层查找降成 O(1) 查表
  // map 的 key 是 nums2 中的某个数值，value 是该值右侧第一个严格比它大的数（不存在则为 -1）。
  // 选 Map 而非普通对象：题目元素是数值，Map 对任意类型 key 都安全，也不会误命中
  // 原型链上的同名属性（如 "constructor"），避免查表时出现假阳性。
  const map = new Map();
  const stack = [];

  // 第 2 段：从右往左扫描 nums2，用单调栈一次性算出每个元素的下一个更大值
  // 逆序是关键：走到 i 时，栈里存放的都是 nums2[i] 右侧尚未被淘汰的元素，
  // 且栈底到栈顶单调递减，因此栈顶天然是"距离最近且可能更大"的那个候选。
  for (let i = nums2.length - 1; i >= 0; i--) {
    // 弹出所有 <= 当前值的元素：比当前值小的元素既不能当 nums2[i] 的答案（要求严格更大），
    // 也不可能再当更左侧元素的答案——因为 nums2[i] 更靠左且不小于它们，会先被取到，
    // 所以它们可以永久丢弃，这正是均摊 O(n) 的来源。
    // 边界易错点：必须用 <= 而不是 <，重复值不算"更大"，相等时同样要弹掉。
    while (stack.length > 0 && stack[stack.length - 1] <= nums2[i]) {
      stack.pop();
    }
    // 弹净后栈顶就是唯一可能的下一个更大元素；栈空表示右侧没有更大的数，按题意记 -1。
    map.set(nums2[i], stack.length === 0 ? -1 : stack[stack.length - 1]);
    // 当前值入栈，供更左侧的元素复用。因为它一定 <= 弹栈后的栈顶，栈的递减单调性得以保持。
    // 注意顺序：先查询并记录答案，再把自己入栈，颠倒会把自己当成自己的候选。
    stack.push(nums2[i]);
  }

  // 第 3 段：用预处理好的映射批量回答 nums1 的查询
  // 复杂度：每个元素最多入栈、出栈各一次，整体时间 O(n + m)，空间 O(n)（栈 + map）。
  // 边界：nums2 为空时循环不执行、map 为空；题面保证 nums1 是 nums2 的子集（且均无重复元素），
  // 因此每个 key 必定命中，不会把 undefined 混进结果。
  return nums1.map(num => map.get(num));
}
```
**复杂度分析**:
- 时间复杂度: O(n + m)
- 空间复杂度: O(n)

---

## 6. 逆波兰表达式求值

**题号**: 150  
**名称**: Evaluate Reverse Polish Notation  
**链接**: https://leetcode.cn/problems/evaluate-reverse-polish-notation/

**核心思路**: 栈操作。遇数字入栈，遇运算符弹出两个元素计算后入栈。

**JavaScript 实现**:

```javascript
// 第 1 段：初始化——准备一个栈和运算符白名单
// 逆波兰表达式（后缀表达式）天然适合用栈求解：遇到数字就压栈，遇到运算符就弹出
// 栈顶的两个数做运算，再把结果压回去，因此不需要处理括号和运算优先级。
function evalRPN(tokens) {
  const stack = [];
  // 用数组 + includes 做成员判断，写成常量表比一串 === 更易读也便于扩展。
  const operators = ['+', '-', '*', '/'];

  // 第 2 段：从左到右扫描每个 token，按“运算符 / 操作数”二分处理
  // 一次线性扫描即可完成求值，不需要递归或回溯。
  for (const token of tokens) {
    // 第 3 段：运算符分支——先取操作数，再按类型计算，最后回填
    if (operators.includes(token)) {
      // 注意弹出顺序：先弹出的是右操作数 b，后弹出的才是左操作数 a。
      // 对 '-' 和 '/' 而言颠倒了会得到相反结果，这是本题最经典的易错点。
      const b = stack.pop();
      const a = stack.pop();
      let result;
      // switch 只在 4 个分支间跳转，避免了 if-else 链的重复比较；
      // 由于 operators 已判过成员，这里无需 default，result 必定被赋值。
      switch (token) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        // 题目要求整除时向零截断（如 -7 / 2 = -3），故用 Math.trunc 而非 Math.floor
        // （Math.floor(-3.5) 会得到 -4，语义就错了）。
        case '/': result = Math.trunc(a / b); break;
      }
      // 中间结果重新入栈，等价于把这一小段子表达式“折叠”成一个数。
      stack.push(result);
    } else {
      // 第 4 段：操作数分支——字符串转数字后直接压栈
      // parseInt 会从首个字符起解析；本题 token 均为合法整数，
      // 用 Number(token) 亦可，这里保留原实现的写法。
      stack.push(parseInt(token));
    }
  }

  // 第 5 段：收尾——合法表达式扫描完毕后栈中只剩一个元素，即最终答案
  // 边界：tokens 为空时 stack[0] 为 undefined；表达式非法时栈内元素数会不为 1。
  // 复杂度：时间 O(n)（每个 token 只进/出栈常数次），空间 O(n)（最坏全是数字）。
  return stack[0];
}
```
**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(n)

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理万行表格的单元格公式校验 | 有效的括号 | 前端 TypeScript 单遍扫描 + 下标栈 | 公式含字符串字面量时要先跳过引号内字符 |
| 交易风控里的"当前窗口最小值" | 最小栈 | Java `ArrayDeque` 双栈同步入出 | 两个栈必须同时压同时弹，漏一个结果就错 |
| 监控看板的告警冷却天数 | 每日温度 | Python/Java 单调递减栈 | 栈里存下标而不是数值，否则算不出天数 |
| 电商价格页的"下一个更高价"提示 | 下一个更大元素 I | 单调栈 + 哈希表做下标映射 | 子集元素要先映射回父数组下标再查表 |
| 单线程任务调度器的任务缓冲 | 用栈实现队列 | 两个栈，或直接用 `deque` | 均摊 O(1)，单次出队可能触发整栈搬移 |
| 低配安卓首屏的运营规则求值 | 逆波兰表达式求值 | Kotlin `LongArray` 作栈，预分配 | 先取右操作数，减法和除法的顺序容易写反 |
| 代码编辑器的括号自动配对与高亮 | 有效的括号 | 编辑器插件走 LSP 诊断 | 大文件只扫可视区加前后偏移，别全量扫 |
| 浏览器前进后退的历史记录 | 栈（LIFO） | History API + 前进栈、后退栈 | 产生新历史时要清空前进栈 |
| 多人协作白板的撤销重做 | 栈（LIFO） | 前端命令栈 + 服务端操作日志 | 栈要有容量上限，超出后丢弃最早的命令 |

### 三个场景拆解

#### 场景 1：后台管理系统的万行表格公式校验

**业务背景**：财务后台允许用户在一万行以上的表格里手写含括号的公式，嵌套上限三层。用户漏写右括号时，保存后才会在计算阶段报错，排查要翻整行。

**怎么用本页知识解决**：思路是从左到右扫一遍，遇到左括号压入下标，遇到右括号弹出并比对类型。栈里放下标而不是字符，报错时能直接给出列号。整个过程单遍扫描，额外空间等于嵌套深度。

```python
def check_formula(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []                        # 只存左括号的下标
    for i, ch in enumerate(s):
        if ch in '([{':
            stack.append(i)           # 记下标，报错时能定位到列
        elif ch in pairs:
            if not stack or s[stack.pop()] != pairs[ch]:
                return i              # 返回第一个不匹配的位置
    return stack[0] if stack else -1   # 非 -1 表示还有括号没闭合
```

- 返回值是字符下标，前端拿它直接算出单元格列号并标红。
- 弹出前先判空，避免对空栈调用 `pop`。
- 左括号多余返回最早未闭合的下标，右括号多余返回当前下标，两种情况给不同提示文案。
- 扫描不修改原字符串，可以放在输入框的防抖回调里反复调用。

**怎么度量收益**：前端用埋点统计每千次编辑的校验报错次数，看保存前拦截比例。用 Chrome DevTools 的 Performance 面板录一次输入事件，看 scripting 段耗时。后端用 Prometheus 计数器记录校验接口的 p95 延迟。

**什么时候不该用**：

- 公式里出现 `"a)b"` 这类字符串字面量时，纯括号匹配会把引号内的括号算进去，要先做词法切分。
- 只有一层括号（如 `=A1+B1`）时，用计数器加减就够了，引入栈是多余开销。
- 需要按语法树做增量重算时，括号校验只给出合法性，求值要另建 AST。

#### 场景 2：监控看板里的告警冷却天数

**业务背景**：运维看板按天展示每个服务的告警次数，要标出再过几天才会出现更高的告警次数。数据规模是单服务上千天、上百个服务同时计算，用户拖动时间轴时要即时刷新。

**怎么用本页知识解决**：维护一个栈，栈里存还没找到答案的下标，对应数值从栈底到栈顶单调递减。新元素比栈顶大时弹出栈顶，等待天数就是两个下标之差。每个下标进出栈各一次，总时间 O(n)。

```python
def wait_days(counts):
    res = [0] * len(counts)           # 0 表示后面没有更高的值
    stack = []                        # 存下标，对应数值单调递减
    for i, c in enumerate(counts):
        while stack and counts[stack[-1]] < c:
            j = stack.pop()
            res[j] = i - j            # 弹出时才确定等待天数
        stack.append(i)
    return res
```

- 用 while 而不是 if，一个新值可能同时终结多个旧值。
- 剩下没弹出的下标保持 0，前端显示为"暂无更高值"。
- 判断用 `<` 还是 `<=` 决定"严格更高"还是"不低于"，要和产品定义对齐。
- 多服务批量计算时按天切片，一天一个内存数组，别一次性加载全部历史。
- 同一个模板把返回改成元素值，就能回答"下一个更大元素 I"那类问题。

**怎么度量收益**：本地用 Python `timeit` 或 Java JMH 跑单服务一千天数据的耗时，与"每个位置往后扫"的写法对比。线上用 Prometheus 直方图记录接口 p95 与 p99。前端用 Chrome DevTools 看拖动操作的长任务数量。

**什么时候不该用**：

- 需要任意区间查询"区间内下一个更大值"时，单调栈只能离线跑一次，要改用线段树或稀疏表。
- 数据按服务分组后时间乱序时，单调栈要求按下标顺序处理，得先排序再算。
- 只看最近 7 天数据时，两重循环最多比较 21 次，代码更短且不易写错。

#### 场景 3：低配安卓机首屏的运营规则求值

**业务背景**：App 首屏根据运营下发的规则串决定展示哪个楼层，规则串以 `3 4 + 2 *` 这样的后缀形式下发。低配机型首屏预算紧，解析过程不能频繁触发 GC。

**怎么用本页知识解决**：后缀表达式天然适配栈，数字入栈，遇到运算符弹出两个数计算后压回。全程用一个预分配数组当栈，运行期不产生装箱对象。运营后台负责把中缀转成后缀，客户端只做求值。

```kotlin
fun evalRpn(tokens: List<String>): Long {
    val stack = LongArray(tokens.size)  // 预分配，避免运行期扩容
    var top = 0                         // 栈顶指针，指向下一个空位
    for (tk in tokens) {
        when (tk) {
            "+" -> { stack[top - 2] += stack[top - 1]; top-- }
            "-" -> { stack[top - 2] -= stack[top - 1]; top-- }
            "*" -> { stack[top - 2] *= stack[top - 1]; top-- }
            else -> stack[top++] = tk.toLong()   // 数字直接入栈
        }
    }
    return stack[top - 1]
}
```

- 用 `LongArray` 加整型栈顶指针，运行期不创建对象，GC 压力可控。
- 写成 `stack[top-2] op stack[top-1]`，右操作数的顺序就不会搞反。
- 数组大小由 token 数量决定，越界直接抛错，不做动态扩容。
- 规则里出现变量时，要在入栈前替换成数值，求值器只处理算术。
- 这段逻辑放到 `Dispatchers.Default` 上跑，主线程只接收结果。
- 除法分支要单独处理除零，别让异常穿透到 UI 层。

**怎么度量收益**：用 Android Studio Profiler 看 CPU 时间与内存分配次数。用 Macrobenchmark 测冷启动到首屏可交互的耗时。线上用 Firebase Performance Monitoring 的自定义 trace 记录求值段耗时分布。

**什么时候不该用**：

- 规则只有几个固定分支时，用 `when` 或 JSON 配置直接判断，求值器是多余一层。
- 规则允许自定义函数和条件跳转时，后缀表达式表达不了控制流，要换表达式树解释器。
- 需要细粒度错误提示（指出哪一段写错）时，栈式求值丢了原始位置，得先用带下标的中缀解析。

### 行业先进实践

**双栈表达式求值（出处：Algorithms 第四版官方配套站点 algs4.cs.princeton.edu，Stack 一节）**。该做法用两个栈分别存运算符和操作数，遇到右括号就弹出一对求值。它把括号匹配和求值合成一遍扫描。借鉴方式：先在后端把公式转成后缀，客户端只做单栈求值，前后端职责分开。

**用 ArrayDeque 代替 Stack（出处：Java SE 官方 API 文档，ArrayDeque 类说明）**。官方文档把 `ArrayDeque` 列为栈和队列的推荐实现，`Stack` 类的文档也指向 `Deque` 接口。借鉴方式：评审时禁止新增 `java.util.Stack`，用静态检查规则卡住。

**list 当栈、deque 当队列（出处：Python 官方文档 教程 "Data Structures" 一节）**。文档说明 list 在末尾追加和弹出是 O(1)，在头部插入删除是 O(n)，队列应使用 `collections.deque`。借鉴方式：把队列实现从 `list.pop(0)` 换成 `deque.popleft()`，并加 lint 规则拦截。

**Redis List 做队列（出处：Redis 官方文档 List 数据类型页面）**。文档给出 `LPUSH` 配 `BRPOP` 的生产者消费者模式，`RPOPLPUSH` 用于可靠出队。需核对官方文档：Stream 类型部分对"消息队列用 List 还是 Stream"的选型说明。借鉴方式：允许丢消息的轻任务用 List，需要消费组与确认时改用 Stream。

**单调栈模板化解题（出处：LeetCode 官方题解，"Daily Temperatures" 与 "Next Greater Element I"）**。两份题解共用"存下标 + 单调递减栈"的模板，差别只在返回值。借鉴方式：把模板抽成一个接受比较符和返回映射的函数，业务侧不再各写一份。

### 从学到用：落地路线

1. 试点：在一个前端表格的公式输入框接入括号校验，只上报不拦截。验收标准：埋点能记录每次编辑的校验结果，线上无新增报错。
2. 验证：用 Chrome DevTools Performance 与 timeit/JMH 压测万行数据的单遍扫描耗时，与两重循环写法对比。验收标准：单次校验 p95 低于团队自定阈值，录制中无超过 50ms 的长任务。
3. 推广：把校验逻辑抽成独立包，表格、富文本公式框、规则配置页三处复用。验收标准：三处调用同一份实现，重复实现文件数为 0，包的单测覆盖率高于 80%。
4. 防回退：在 CI 里加基准测试与复杂度检查，禁止在循环内重复整表扫描。验收标准：基准超出阈值即让流水线失败，评审清单里写明栈容量上限的要求。

### 动手作业

**目标**：写一个"公式校验与求值"小服务，把括号匹配、后缀求值、单调栈统计三段逻辑串起来。

**步骤**：

1. 定义输入：只含数字、`+ - * /`、`()` 的表达式，长度上限 1000 字符。
2. 实现 `check(s)`，返回第一个出错位置或 -1，用下标栈完成。
3. 写用例覆盖左括号多余、右括号多余、交叉嵌套（如 `([)]`）三类错误。
4. 实现中缀转后缀，再用单栈求值，除数为 0 时返回明确错误码。
5. 加统计接口：给定按小时排列的调用量数组，返回每个位置到下一个更高调用量的间隔，栈内只存下标。
6. 用 timeit（Python）或 JMH（Java）跑 1000 字符输入 1000 次，把耗时和测量命令写进 README。
7. 把 `check` 接进一个最小前端页面，输入时实时标红出错位置。

**验收标准**：

- 三类错误用例都返回正确的字符下标，而不是只返回 true/false。
- 合法输入上求值结果与 Python `eval` 一致，测试用例逐条对比。
- 统计接口对乱序输入返回明确报错，不返回错误结果。
- README 里有可复现的测量命令与耗时记录。
- 前端页面在本地测量下 200ms 内标红出错位置。

