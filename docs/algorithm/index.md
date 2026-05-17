---
title: 算法篇
description: 涵盖 LeetCode Hot 100 基础题型（数组、字符串、链表、栈队列）和进阶题型（二叉树、动态规划、回溯、图论）的完整总结。
tags:
  - algorithm
  - leetcode
date: 2026-05-17
---

# 算法篇

> 本章涵盖 LeetCode Hot 100 中的经典题型，分为基础和进阶两部分。

---

## 内容导航

### 基础题型

| 分类 | 题目数 | 说明 |
|------|--------|------|
| [数组题型](leetcode-hot100-basics.md#一数组题型) | 7 道 | 哈希表、滑动窗口、双指针 |
| [字符串题型](leetcode-hot100-basics.md#二字符串题型) | 6 道 | 滑动窗口、子串匹配 |
| [链表题型](leetcode-hot100-basics.md#三链表题型) | 6 道 | 反转、合并、环形检测 |
| [栈队列题型](leetcode-hot100-basics.md#四栈队列题型) | 6 道 | 有效括号、单调栈、最小栈 |

**基础题型总计**: 25 道

### 进阶题型

| 分类 | 题目数 | 说明 |
|------|--------|------|
| [二叉树题型](leetcode-hot100-advanced.md#一二叉树题型) | 5 道 | 遍历、构造、路径 |
| [动态规划](leetcode-hot100-advanced.md#二动态规划) | 6 道 | 背包、股票、打家劫舍 |
| [回溯算法](leetcode-hot100-advanced.md#三回溯算法) | 5 道 | 排列组合、N皇后 |
| [图论算法](leetcode-hot100-advanced.md#四图论算法) | 5 道 | 拓扑排序、岛屿问题 |

**进阶题型总计**: 23 道

---

## 核心算法模板

### 滑动窗口

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

### 双指针

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

### 单调栈

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

---

## 学习路线

```
入门 → 基础算法 → 进阶专题 → 高频面试题

1. 先掌握数组、字符串、链表基础题
2. 再攻克二叉树、动态规划难点
3. 最后刷回溯、图论扩展题
```

---

## 参考资源

| 资源 | 链接 |
|------|------|
| LeetCode Hot 100 | https://leetcode.cn/problem-list/2ckc9c7r/ |
| 代码随想录 | https://programmercarl.com/ |
| 宫水三叶の刷题日记 | https://shimo.im/docs/ |