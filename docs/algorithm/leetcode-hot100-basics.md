---
title: LeetCode Hot 100 基础题型总结
description: 整理 LeetCode Hot 100 中的基础题型，包括数组、字符串、链表、栈队列的典型题目、核心思路及 JavaScript/TypeScript 实现。
tags:
  - algorithm
  - leetcode
date: 2026-05-17
---

# LeetCode Hot 100 基础题型总结

> 本文档整理了 LeetCode Hot 100 中的基础题型（数组、字符串、链表、栈队列），包含题号、名称、核心思路、JavaScript/TypeScript 实现及复杂度分析。

---

## 目录

1. [数组题型](#一数组题型)
   - [哈希表](#1.1-两数之和)
   - [滑动窗口](#1.2-长度最小的子数组)
   - [双指针](#1.3-盛水容器)
2. [字符串题型](#二字符串题型)
   - [滑动窗口](#2.1-无重复字符的最长子串)
   - [子串匹配](#2.2-最小覆盖子串)
3. [链表题型](#三链表题型)
   - [链表反转](#3.1-反转链表)
   - [链表合并](#3.2-合并两个有序链表)
   - [双指针](#3.3-环形链表)
4. [栈队列题型](#四栈队列题型)
   - [有效括号](#4.1-有效的括号)
   - [单调栈](#4.2-每日温度)

---

## 一、数组题型

### 1.1 两数之和

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

### 1.2 长度最小的子数组

**题号**: 209  
**名称**: Minimum Size Subarray Sum  
**链接**: https://leetcode.cn/problems/minimum-size-subarray-sum/

**核心思路**: 滑动窗口。维护一个窗口 sum，当 sum >= target 时收缩左边界，记录最小长度。

**JavaScript 实现**:

```javascript
function minSubArrayLen(target, nums) {
  let left = 0;
  let sum = 0;
  let minLen = Infinity;

  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];

    while (sum >= target) {
      minLen = Math.min(minLen, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }

  return minLen === Infinity ? 0 : minLen;
}
```

**复杂度分析**:
- 时间复杂度: O(n) - 每个元素最多被访问两次
- 空间复杂度: O(1) - 只用常数额外空间

---

### 1.3 盛水容器

**题号**: 11  
**名称**: Container With Most Water  
**链接**: https://leetcode.cn/problems/container-with-most-water/

**核心思路**: 双指针。从两端向中间移动，较短边向内移动（因为移动较长边只会使宽度减小而高度不会增加）。

**JavaScript 实现**:

```javascript
function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let maxArea = 0;

  while (left < right) {
    const width = right - left;
    const h = Math.min(height[left], height[right]);
    maxArea = Math.max(maxArea, width * h);

    if (height[left] < height[right]) {
      left++;
    } else {
      right--;
    }
  }

  return maxArea;
}
```

**复杂度分析**:
- 时间复杂度: O(n) - 双指针遍历
- 空间复杂度: O(1) - 常数额外空间

---

### 1.4 最大子序和

**题号**: 53  
**名称**: Maximum Subarray  
**链接**: https://leetcode.cn/problems/maximum-subarray/

**核心思路**: Kadane 算法。遍历数组，维护当前连续和与最大和，若当前和为负则重新开始。

**JavaScript 实现**:

```javascript
function maxSubArray(nums) {
  let maxSum = nums[0];
  let currentSum = nums[0];

  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }

  return maxSum;
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

### 1.5 移动零

**题号**: 283  
**名称**: Move Zeroes  
**链接**: https://leetcode.cn/problems/move-zeroes/

**核心思路**: 双指针，将所有非零元素移到数组前面，保持相对顺序。

**JavaScript 实现**:

```javascript
function moveZeroes(nums) {
  let insertPos = 0;

  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== 0) {
      nums[insertPos] = nums[i];
      insertPos++;
    }
  }

  while (insertPos < nums.length) {
    nums[insertPos] = 0;
    insertPos++;
  }
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

### 1.6 合并区间

**题号**: 56  
**名称**: Merge Intervals  
**链接**: https://leetcode.cn/problems/merge-intervals/

**核心思路**: 先按区间起点排序，然后遍历合并重叠区间。

**JavaScript 实现**:

```javascript
function merge(intervals) {
  if (intervals.length <= 1) return intervals;

  intervals.sort((a, b) => a[0] - b[0]);
  const result = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1];
    const current = intervals[i];

    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      result.push(current);
    }
  }

  return result;
}
```

**复杂度分析**:
- 时间复杂度: O(n log n) - 排序
- 空间复杂度: O(n) - 结果存储

---

### 1.7 除自身以外数组的乘积

**题号**: 238  
**名称**: Product of Array Except Self  
**链接**: https://leetcode.cn/problems/product-of-array-except-self/

**核心思路**: 左右乘积数组。先从左到右计算前缀积，再从右到左计算后缀积。

**JavaScript 实现**:

```javascript
function productExceptSelf(nums) {
  const n = nums.length;
  const result = new Array(n);

  let prefix = 1;
  for (let i = 0; i < n; i++) {
    result[i] = prefix;
    prefix *= nums[i];
  }

  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    result[i] *= suffix;
    suffix *= nums[i];
  }

  return result;
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1) - 不计算输出数组

---

## 二、字符串题型

### 2.1 无重复字符的最长子串

**题号**: 3  
**名称**: Longest Substring Without Repeating Characters  
**链接**: https://leetcode.cn/problems/longest-substring-without-repeating-characters/

**核心思路**: 滑动窗口 + 哈希集合。维护左右指针，遇重复字符时收缩左指针。

**JavaScript 实现**:

```javascript
function lengthOfLongestSubstring(s) {
  const set = new Set();
  let left = 0;
  let maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    while (set.has(s[right])) {
      set.delete(s[left]);
      left++;
    }
    set.add(s[right]);
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(min(m, n)) - m 为字符集大小

---

### 2.2 最小覆盖子串

**题号**: 76  
**名称**: Minimum Window Substring  
**链接**: https://leetcode.cn/problems/minimum-window-substring/

**核心思路**: 滑动窗口 + 哈希表计数。先扩展右边界找到可行解，再收缩左边界找最优解。

**JavaScript 实现**:

```javascript
function minWindow(s, t) {
  const need = new Map();
  const window = new Map();

  for (const c of t) {
    need.set(c, (need.get(c) || 0) + 1);
  }

  let left = 0, right = 0;
  let valid = 0;
  let start = 0, minLen = Infinity;

  while (right < s.length) {
    const c = s[right];
    right++;

    if (need.has(c)) {
      window.set(c, (window.get(c) || 0) + 1);
      if (window.get(c) === need.get(c)) {
        valid++;
      }
    }

    while (valid === need.size) {
      if (right - left < minLen) {
        start = left;
        minLen = right - left;
      }

      const d = s[left];
      left++;

      if (need.has(d)) {
        if (window.get(d) === need.get(d)) {
          valid--;
        }
        window.set(d, window.get(d) - 1);
      }
    }
  }

  return minLen === Infinity ? "" : s.substring(start, start + minLen);
}
```

**复杂度分析**:
- 时间复杂度: O(n + m) - n=s.length, m=t.length
- 空间复杂度: O(m)

---

### 2.3 字符串第一个唯一字符

**题号**: 387  
**名称**: First Unique Character in a String  
**链接**: https://leetcode.cn/problems/first-unique-character-in-a-string/

**核心思路**: 两次遍历。第一次统计频率，第二次找第一个频率为1的字符。

**JavaScript 实现**:

```javascript
function firstUniqChar(s) {
  const count = new Array(26).fill(0);

  for (const c of s) {
    count[c.charCodeAt(0) - 97]++;
  }

  for (let i = 0; i < s.length; i++) {
    if (count[s[i].charCodeAt(0) - 97] === 1) {
      return i;
    }
  }

  return -1;
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1) - 固定26个字母

---

### 2.4 有效的字母异位词

**题号**: 242  
**名称**: Valid Anagram  
**链接**: https://leetcode.cn/problems/valid-anagram/

**核心思路**: 哈希表计数或数组计数。

**JavaScript 实现**:

```javascript
function isAnagram(s, t) {
  if (s.length !== t.length) return false;

  const count = new Array(26).fill(0);

  for (let i = 0; i < s.length; i++) {
    count[s[i].charCodeAt(0) - 97]++;
    count[t[i].charCodeAt(0) - 97]--;
  }

  return count.every(c => c === 0);
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

### 2.5 找到字符串中所有字母异位词

**题号**: 438  
**名称**: Find All Anagrams in a String  
**链接**: https://leetcode.cn/problems/find-all-anagrams-in-a-string/

**核心思路**: 滑动窗口 + 固定大小窗口计数比较。

**JavaScript 实现**:

```javascript
function findAnagrams(s, p) {
  const need = new Array(26).fill(0);
  const window = new Array(26).fill(0);
  const result = [];

  for (const c of p) {
    need[c.charCodeAt(0) - 97]++;
  }

  let left = 0, right = 0;
  let valid = 0;

  while (right < s.length) {
    const c1 = s[right].charCodeAt(0) - 97;
    right++;
    window[c1]++;

    if (window[c1] <= need[c1]) {
      valid++;
    }

    if (right - left >= p.length) {
      if (valid === p.length) {
        result.push(left);
      }

      const c2 = s[left].charCodeAt(0) - 97;
      left++;

      if (window[c2] <= need[c2]) {
        valid--;
      }
      window[c2]--;
    }
  }

  return result;
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

### 2.6 最长回文子串

**题号**: 5  
**名称**: Longest Palindromic Substring  
**链接**: https://leetcode.cn/problems/longest-palindromic-substring/

**核心思路**: 中心扩展法。从每个位置向两边扩展，考虑奇数和偶数长度。

**JavaScript 实现**:

```javascript
function longestPalindrome(s) {
  if (s.length < 2) return s;

  let start = 0, maxLen = 1;

  function expand(left, right) {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      if (right - left + 1 > maxLen) {
        start = left;
        maxLen = right - left + 1;
      }
      left--;
      right++;
    }
  }

  for (let i = 0; i < s.length; i++) {
    expand(i, i);     // 奇数长度
    expand(i, i + 1); // 偶数长度
  }

  return s.substring(start, start + maxLen);
}
```

**复杂度分析**:
- 时间复杂度: O(n^2)
- 空间复杂度: O(1)

---

## 三、链表题型

### 3.1 反转链表

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

function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;

  while (curr !== null) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }

  return prev;
}

// 递归版本
function reverseListRecursive(head: ListNode | null): ListNode | null {
  if (head === null || head.next === null) {
    return head;
  }
  const newHead = reverseListRecursive(head.next);
  head.next.next = head;
  head.next = null;
  return newHead;
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1) - 迭代版本，O(n) - 递归版本（调用栈）

---

### 3.2 合并两个有序链表

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

### 3.3 环形链表

**题号**: 141  
**名称**: Linked List Cycle  
**链接**: https://leetcode.cn/problems/linked-list-cycle/

**核心思路**: Floyd 判圈算法。快慢指针，若相遇则有环。

**TypeScript 实现**:

```typescript
function hasCycle(head: ListNode | null): boolean {
  if (head === null || head.next === null) {
    return false;
  }

  let slow = head;
  let fast = head;

  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;

    if (slow === fast) {
      return true;
    }
  }

  return false;
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

### 3.4 删除链表的倒数第 N 个节点

**题号**: 19  
**名称**: Remove Nth Node From End of List  
**链接**: https://leetcode.cn/problems/remove-nth-node-from-end-of-list/

**核心思路**: 快慢指针。先让快指针走 n 步，再一起移动。

**TypeScript 实现**:

```typescript
function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {
  const dummy = new ListNode(0);
  dummy.next = head;

  let fast = dummy;
  let slow = dummy;

  for (let i = 0; i <= n; i++) {
    fast = fast.next;
  }

  while (fast !== null) {
    slow = slow.next;
    fast = fast.next;
  }

  slow.next = slow.next.next;
  return dummy.next;
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

### 3.5 相交链表

**题号**: 160  
**名称**: Intersection of Two Linked Lists  
**链接**: https://leetcode.cn/problems/intersection-of-two-linked-lists/

**核心思路**: 双指针法。A 走完到 B，B 走完到 A，若相交必相遇。

**TypeScript 实现**:

```typescript
function getIntersectionNode(headA: ListNode | null, headB: ListNode | null): ListNode | null {
  if (headA === null || headB === null) return null;

  let pA = headA;
  let pB = headB;

  while (pA !== pB) {
    pA = pA === null ? headB : pA.next;
    pB = pB === null ? headA : pB.next;
  }

  return pA;
}
```

**复杂度分析**:
- 时间复杂度: O(n + m)
- 空间复杂度: O(1)

---

### 3.6 合并 K 个升序链表

**题号**: 23  
**名称**: Merge K Sorted Lists  
**链接**: https://leetcode.cn/problems/merge-k-sorted-lists/

**核心思路**: 最小堆或分治合并。堆的最小复杂度为 O(n log k)。

**TypeScript 实现**:

```typescript
function mergeKLists(lists: Array<ListNode | null>): ListNode | null {
  const priorityQueue = new MinPriorityQueue();

  for (const list of lists) {
    if (list !== null) {
      priorityQueue.enqueue(list, list.val);
    }
  }

  const dummy = new ListNode(0);
  let curr = dummy;

  while (!priorityQueue.isEmpty()) {
    const { element } = priorityQueue.dequeue();
    curr.next = element;
    curr = curr.next;

    if (element.next !== null) {
      priorityQueue.enqueue(element.next, element.next.val);
    }
  }

  return dummy.next;
}
```

**复杂度分析**:
- 时间复杂度: O(n log k) - k 为链表数量
- 空间复杂度: O(k) - 堆大小

---

## 四、栈队列题型

### 4.1 有效的括号

**题号**: 20  
**名称**: Valid Parentheses  
**链接**: https://leetcode.cn/problems/valid-parentheses/

**核心思路**: 栈匹配。遇到左括号入栈，遇到右括号与栈顶匹配。

**JavaScript 实现**:

```javascript
function isValid(s) {
  const stack = [];
  const map = {
    ')': '(',
    '}': '{',
    ']': '['
  };

  for (const char of s) {
    if ('({['.includes(char)) {
      stack.push(char);
    } else {
      if (stack.pop() !== map[char]) {
        return false;
      }
    }
  }

  return stack.length === 0;
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(n) - 栈空间

---

### 4.2 每日温度

**题号**: 739  
**名称**: Daily Temperatures  
**链接**: https://leetcode.cn/problems/daily-temperatures/

**核心思路**: 单调递减栈。存储索引，若遇到更大温度则弹出并计算距离。

**JavaScript 实现**:

```javascript
function dailyTemperatures(temperatures) {
  const n = temperatures.length;
  const result = new Array(n).fill(0);
  const stack = []; // 存储索引

  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {
      const prevIndex = stack.pop();
      result[prevIndex] = i - prevIndex;
    }
    stack.push(i);
  }

  return result;
}
```

**复杂度分析**:
- 时间复杂度: O(n) - 每个元素最多入栈出栈各一次
- 空间复杂度: O(n) - 栈空间

---

### 4.3 最小栈

**题号**: 155  
**名称**: Min Stack  
**链接**: https://leetcode.cn/problems/min-stack/

**核心思路**: 使用两个栈，一个普通栈一个最小栈同步维护。

**JavaScript 实现**:

```javascript
class MinStack {
  constructor() {
    this.stack = [];
    this.minStack = [];
  }

  push(val) {
    this.stack.push(val);
    if (this.minStack.length === 0 || val <= this.minStack[this.minStack.length - 1]) {
      this.minStack.push(val);
    }
  }

  pop() {
    const val = this.stack.pop();
    if (val === this.minStack[this.minStack.length - 1]) {
      this.minStack.pop();
    }
  }

  top() {
    return this.stack[this.stack.length - 1];
  }

  getMin() {
    return this.minStack[this.minStack.length - 1];
  }
}
```

**复杂度分析**:
- 时间复杂度: O(1) - 所有操作
- 空间复杂度: O(n)

---

### 4.4 用栈实现队列

**题号**: 232  
**名称**: Implement Queue using Stacks  
**链接**: https://leetcode.cn/problems/implement-queue-using-stacks/

**核心思路**: 双栈，输入栈和输出栈。队首元素在输出栈顶。

**JavaScript 实现**:

```javascript
class MyQueue {
  constructor() {
    this.inStack = [];
    this.outStack = [];
  }

  push(x) {
    this.inStack.push(x);
  }

  transfer() {
    if (this.outStack.length === 0) {
      while (this.inStack.length > 0) {
        this.outStack.push(this.inStack.pop());
      }
    }
  }

  pop() {
    this.transfer();
    return this.outStack.pop();
  }

  peek() {
    this.transfer();
    return this.outStack[this.outStack.length - 1];
  }

  empty() {
    return this.inStack.length === 0 && this.outStack.length === 0;
  }
}
```

**复杂度分析**:
- 时间复杂度: 均摊 O(1)
- 空间复杂度: O(n)

---

### 4.5 下一个更大元素 I

**题号**: 496  
**名称**: Next Greater Element I  
**链接**: https://leetcode.cn/problems/next-greater-element-i/

**核心思路**: 单调栈从后向前遍历 nums2，同时用哈希表记录结果。

**JavaScript 实现**:

```javascript
function nextGreaterElement(nums1, nums2) {
  const map = new Map();
  const stack = [];

  for (let i = nums2.length - 1; i >= 0; i--) {
    while (stack.length > 0 && stack[stack.length - 1] <= nums2[i]) {
      stack.pop();
    }
    map.set(nums2[i], stack.length === 0 ? -1 : stack[stack.length - 1]);
    stack.push(nums2[i]);
  }

  return nums1.map(num => map.get(num));
}
```

**复杂度分析**:
- 时间复杂度: O(n + m)
- 空间复杂度: O(n)

---

### 4.6 逆波兰表达式求值

**题号**: 150  
**名称**: Evaluate Reverse Polish Notation  
**链接**: https://leetcode.cn/problems/evaluate-reverse-polish-notation/

**核心思路**: 栈操作。遇数字入栈，遇运算符弹出两个元素计算后入栈。

**JavaScript 实现**:

```javascript
function evalRPN(tokens) {
  const stack = [];
  const operators = ['+', '-', '*', '/'];

  for (const token of tokens) {
    if (operators.includes(token)) {
      const b = stack.pop();
      const a = stack.pop();
      let result;
      switch (token) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/': result = Math.trunc(a / b); break;
      }
      stack.push(result);
    } else {
      stack.push(parseInt(token));
    }
  }

  return stack[0];
}
```

**复杂度分析**:
- 时间复杂度: O(n)
- 空间复杂度: O(n)

---

## 附录：算法模板汇总

### 滑动窗口模板

```javascript
function slidingWindow(s) {
  const window = new Set();
  let left = 0;
  let maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    // 收缩左边界直到窗口有效
    while (/* 无效条件 */) {
      window.delete(s[left]);
      left++;
    }

    // 更新答案
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}
```

### 双指针模板

```javascript
function twoPointers(arr) {
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    // 根据题意处理
    if (/* 条件 */) {
      left++;
    } else {
      right--;
    }
  }
}
```

### 单调栈模板

```javascript
function monotonicStack(nums) {
  const stack = []; // 存储索引或值
  const result = new Array(nums.length).fill(-1);

  for (let i = 0; i < nums.length; i++) {
    while (stack.length > 0 && nums[i] > nums[stack[stack.length - 1]]) {
      const index = stack.pop();
      result[index] = i - index; // 或 nums[i]
    }
    stack.push(i);
  }

  return result;
}
```

---

## 参考资源

- [LeetCode 官网](https://leetcode.cn/)
- [LeetCode 热题 100](https://leetcode.cn/problemset/all/?popular=hot)
- [力扣加加题解仓库](https://github.com/azl397985856/leetcode)