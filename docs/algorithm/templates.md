---
title: 算法模板与复杂度速查
description: 滑动窗口、双指针、单调栈等通用算法模板，以及进阶题型的时间与空间复杂度速查表。
tags:
  - algorithm
  - leetcode
  - template
date: 2026-05-17
---

# 算法模板与复杂度速查

## 1. 通用算法模板

### 1.1 滑动窗口

```javascript
// 滑动窗口模板（固定/可变窗口）
function slidingWindow(nums, target) {
  let left = 0;
  let sum = 0;
  let result = 0;

  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];

    while (sum >= target) {
      // 更新结果
      result = Math.max(result, right - left + 1);
      // 收缩左边界
      sum -= nums[left];
      left++;
    }
  }

  return result;
}
```

### 1.2 双指针

```javascript
// 双指针模板（链表/数组）
function twoPointers(arr) {
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    // 处理逻辑
    const sum = arr[left] + arr[right];

    if (sum === target) {
      return [left, right];
    } else if (sum < target) {
      left++;
    } else {
      right--;
    }
  }

  return [];
}
```

### 1.3 单调栈

```javascript
// 单调栈模板（求下一个更大元素）
function nextGreaterElement(nums) {
  const result = new Array(nums.length).fill(-1);
  const stack = []; // 存索引

  for (let i = 0; i < nums.length; i++) {
    // 维护单调递减栈
    while (stack.length && nums[i] > nums[stack[stack.length - 1]]) {
      const index = stack.pop();
      result[index] = nums[i];
    }
    stack.push(i);
  }

  return result;
}
```

## 2. 题型模板

### 2.1 滑动窗口模板

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

### 2.2 双指针模板

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

### 2.3 单调栈模板

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

## 3. 进阶题型复杂度速查表

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
