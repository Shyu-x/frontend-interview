---
title: JavaScript 微任务 vs 宏任务：经典事件循环面试题
description: 通过 10 道经典事件循环面试题，深入理解 JavaScript 宏任务、微任务及 Event Loop 执行顺序。
tags:
  - javascript
  - event-loop
date: 2026-05-17
---

# JavaScript 微任务 vs 宏任务：经典事件循环面试题

## 核心概念速查表

| 类型 | 来源 | 示例 |
|------|------|------|
| **宏任务 (Macrotask)** | setTimeout, setInterval, setImmediate, I/O, UI rendering | `setTimeout(() => {}, 0)` |
| **微任务 (Microtask)** | Promise.then/catch/finally, queueMicrotask, MutationObserver | `Promise.resolve().then()` |
| **Node.js 特有** | process.nextTick (最高优先级微任务) | `process.nextTick(() => {})` |

### 事件循环执行顺序

```
同步代码 → 微任务队列 → 宏任务队列 → 渲染更新
              ↑            ↑
         Promise回调    setTimeout/setImmediate
         queueMicrotask
```

---

## 题目一：基础顺序题

```javascript
// 题目：下面代码的输出顺序是什么？

console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

Promise.resolve().then(() => {
  console.log('3');
});

console.log('4');
```

**输出：**
```
1
4
3
2
```

**解析：**

| 阶段 | 执行内容 | 说明 |
|------|----------|------|
| 同步执行 | `1` → `4` | 主脚本同步代码立即执行 |
| 微任务检查 | `3` | Promise.then 回调进入微任务队列，在当前宏任务结束后执行 |
| 宏任务执行 | `2` | setTimeout 回调进入宏任务队列，等待下一轮事件循环 |

**队列状态变化：**

- 宏任务队列：`[setTimeout回调]`
- 微任务队列：`[Promise.then回调]`

---

## 题目二：queueMicrotask 与 Promise.then 对比

```javascript
// 题目：queueMicrotask 和 Promise.then 谁先执行？

queueMicrotask(() => {
  console.log('queueMicrotask');
});

Promise.resolve().then(() => {
  console.log('Promise.then');
});
```

**输出：**
```
queueMicrotask
Promise.then
```

**解析：**

两者都属于微任务，**queueMicrotask 先于 Promise.then 执行**。

微任务队列内部顺序：
1. 先入先出 (FIFO)
2. queueMicrotask 回调先被加入队列
3. Promise.then 回调后加入

**队列状态：**

- 微任务队列：`[queueMicrotask回调, Promise.then回调]`

---

## 题目三：嵌套 Promise 链式调用

```javascript
// 题目：分析输出顺序

console.log('start');

Promise.resolve()
  .then(() => {
    console.log('p1');
    return Promise.resolve();
  })
  .then(() => {
    console.log('p2');
  });

setTimeout(() => {
  console.log('setTimeout');
}, 0);

console.log('end');
```

**输出：**
```
start
end
p1
p2
setTimeout
```

**解析：**

关键点：`return Promise.resolve()` 会创建一个新的 Promise，这个操作本身是同步的，但其 `.then` 回调会作为下一个微任务处理。

**执行流程：**

```
阶段1: 同步执行
  └─ console.log('start')    → 输出 "start"
  └─ Promise.resolve()        → 创建 Promise
  └─ .then()                  → 回调1加入微任务队列
  └─ setTimeout()            → 回调加入宏任务队列
  └─ console.log('end')      → 输出 "end"

阶段2: 微任务执行
  └─ 回调1执行
      └─ console.log('p1')   → 输出 "p1"
      └─ return Promise.resolve()
          └─ 微任务队列已清空
  └─ 回调2执行
      └─ console.log('p2')   → 输出 "p2"

阶段3: 宏任务执行
  └─ setTimeout 回调
      └─ console.log('setTimeout') → 输出 "setTimeout"
```

---

## 题目四：async/await 底层原理

```javascript
// 题目：async/await 实际上是怎么执行的？

async function asyncFn() {
  console.log('async start');
  await console.log('await value');
  console.log('async end');
}

console.log('1');
asyncFn();
console.log('2');
```

**输出：**
```
1
async start
await value
2
async end
```

**解析：**

`async` 函数执行过程：
1. `asyncFn()` 调用是同步的，函数体立即执行
2. `await` 关键字后的表达式**同步执行**
3. `await` 下面的代码作为微任务执行

**等价转换 (伪代码)：**

```javascript
// 上面代码等价于：
console.log('1');

(function() {
  console.log('async start');
  Promise.resolve()
    .then(() => {
      console.log('await value');  // 实际上 await 表达式本身的结果
      console.log('async end');
    });
})();

console.log('2');
```

---

## 题目五：多个 setTimeout 的执行顺序

```javascript
// 题目：多个 setTimeout 的输出顺序

console.log('A');

setTimeout(() => console.log('B'), 0);

setTimeout(() => {
  console.log('C');
  Promise.resolve().then(() => console.log('D'));
}, 0);

setTimeout(() => console.log('E'), 0);

Promise.resolve().then(() => console.log('F'));
```

**输出：**
```
A
F
B
C
D
E
```

**解析：**

**执行时间线：**

```
t=0: 主脚本执行
  └─ A (同步)
  └─ 3个 setTimeout 加入宏任务队列
  └─ Promise.then 加入微任务队列
  └─ "F" 输出

t=下一个事件循环:
  └─ 微任务队列清空
  └─ 宏任务队列: [B回调, C回调, E回调]
  └─ 执行 B回调 → "B" 输出

t=再下一个事件循环:
  └─ 宏任务队列: [C回调, E回调]
  └─ 执行 C回调 → "C" 输出
  └─ Promise.then 加入微任务队列

t=微任务执行:
  └─ "D" 输出
  └─ 微任务队列清空

t=再下一个事件循环:
  └─ 宏任务队列: [E回调]
  └─ 执行 E回调 → "E" 输出
```

---

## 题目六：setTimeout(fn, 0) 并不保证立即执行

```javascript
// 题目：这段代码会输出什么？

console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => {
  console.log('3');
  Promise.resolve().then(() => console.log('4'));
});

console.log('5');

Promise.resolve().then(() => console.log('6'));
```

**输出：**
```
1
5
3
6
4
2
```

**解析：**

**关键点：** 微任务队列在同一个宏任务内会**全部清空**后才开始下一个宏任务。

**执行流程：**

```
阶段1: 同步执行
  └─ "1", "5" 输出

阶段2: 第一轮微任务
  └─ 微任务队列: [then3, then6]
  └─ 执行 then3
      └─ "3" 输出
      └─ then4 加入微任务队列
  └─ 执行 then6
      └─ "6" 输出
  └─ 微任务队列: [then4]
  └─ 执行 then4
      └─ "4" 输出

阶段3: 宏任务执行
  └─ setTimeout 回调
      └─ "2" 输出
```

---

## 题目七：requestAnimationFrame 执行时机

```javascript
// 题目：requestAnimationFrame 在事件循环中的位置

console.log('start');

setTimeout(() => console.log('setTimeout'), 0);

requestAnimationFrame(() => {
  console.log('requestAnimationFrame');
});

Promise.resolve().then(() => console.log('Promise'));

console.log('end');
```

**输出（浏览器）：**
```
start
end
Promise
requestAnimationFrame
setTimeout
```

**解析：**

**事件循环中的位置（简化版）：**

```
┌─────────────────────┐
│  同步代码执行       │
└─────────────────────┘
            ↓
┌─────────────────────┐
│  微任务队列         │ ← Promise.then, queueMicrotask
└─────────────────────┘
            ↓
┌─────────────────────┐
│  宏任务队列         │ ← setTimeout, setInterval
└─────────────────────┘
            ↓
┌─────────────────────┐
│  渲染更新阶段       │ ← requestAnimationFrame
└─────────────────────┘
            ↓
┌─────────────────────┐
│  下一轮事件循环     │
└─────────────────────┘
```

**注意：** requestAnimationFrame 回调只在需要渲染时才会执行，在没有视觉更新的环境中（如 Node.js）行为可能不同。

---

## 题目八：Node.js 特殊队列顺序

> **环境：Node.js**

```javascript
// 题目：在 Node.js 环境中运行，以下输出顺序是什么？

const fs = require('fs');

console.log('1');

process.nextTick(() => {
  console.log('nextTick');
});

Promise.resolve().then(() => {
  console.log('Promise.then');
});

setImmediate(() => {
  console.log('setImmediate');
});

console.log('2');
```

**输出（Node.js）：**
```
1
2
nextTick
Promise.then
setImmediate
```

**解析：**

**Node.js 事件循环的微任务优先级：**

```
微任务队列优先级（从高到低）：
1. process.nextTick()     ← 最高优先级
2. Promise.then()        ← 普通微任务
3. queueMicrotask()      ← 与 Promise.then 同级
```

**Node.js 事件循环简化架构：**

```
┌─────────────────────┐
│  主脚本（同步代码）  │
└─────────────────────┘
            ↓
┌─────────────────────┐
│  nextTick 队列      │ ← process.nextTick（最高优先级微任务）
└─────────────────────┘
            ↓
┌─────────────────────┐
│  微任务队列         │ ← Promise.then
└─────────────────────┘
            ↓
┌─────────────────────┐
│  宏任务队列         │ ← setTimeout, setImmediate, I/O
└─────────────────────┘
```

**关键区别：**
- `process.nextTick()` 的回调会在**当前操作完成后、下一个微任务之前**立即执行
- `setImmediate()` 在 I/O 回调之后执行，与 `setTimeout(fn, 0)` 不同

---

## 题目九：setTimeout vs setImmediate（Node.js I/O 场景）

> **环境：Node.js**

```javascript
// 题目：在 I/O 操作后，setTimeout 和 setImmediate 谁先执行？

const fs = require('fs');

fs.readFile('./package.json', () => {
  console.log('I/O 回调');

  setTimeout(() => {
    console.log('setTimeout 在 I/O 后');
  }, 0);

  setImmediate(() => {
    console.log('setImmediate 在 I/O 后');
  });
});
```

**输出（可能）：**
```
I/O 回调
setImmediate 在 I/O 后
setTimeout 在 I/O 后
```

**或者（有时）：**
```
I/O 回调
setTimeout 在 I/O 后
setImmediate 在 I/O 后
```

**解析：**

**为什么结果不固定？**

在 I/O 回调完成后，`setTimeout` 和 `setImmediate` 的执行顺序取决于**事件循环的当前阶段**：

```
事件循环阶段：
┌────────────────────────┐
│  timers                │ ← setTimeout(fn, 0)
├────────────────────────┤
│  pending callbacks     │
├────────────────────────┤
│  idle, prepare         │
├────────────────────────┤
│  poll                  │ ← I/O 操作在此阶段执行
├────────────────────────┤
│  check                 │ ← setImmediate 回调在此执行
├────────────────────────┤
│  close callbacks       │
└────────────────────────┘
```

**结论：**
- 在**文件 I/O 回调后**，通常 `setImmediate` **先于** `setTimeout` 执行
- 因为 I/O 完成后进入 `check` 阶段，而 `setTimeout` 在下一轮的 `timers` 阶段
- 但如果事件循环已经进入 `timers` 阶段，则 `setTimeout` 先执行

---

## 题目十：综合复杂题

```javascript
// 题目：终极复杂题，分析执行顺序

async function async1() {
  console.log('async1 start');
  await async2();
  console.log('async1 end');
}

async function async2() {
  console.log('async2');
}

console.log('script start');

setTimeout(() => {
  console.log('setTimeout1');
  Promise.resolve().then(() => console.log('Promise in setTimeout'));
}, 0);

new Promise((resolve) => {
  console.log('Promise executor');
  resolve();
}).then(() => {
  console.log('Promise.then1');
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('setTimeout in Promise.then');
      resolve();
    }, 0);
  });
}).then(() => {
  console.log('Promise.then2');
});

async1();

console.log('script end');
```

**输出：**
```
script start
Promise executor
async1 start
async2
script end
async1 end
Promise.then1
setTimeout1
Promise in setTimeout
setTimeout in Promise.then
Promise.then2
```

**解析：**

**执行时间线：**

```
t=0: 主脚本同步执行
  ├─ "script start"
  ├─ setTimeout1 加入宏任务队列
  ├─ Promise executor 同步执行 → "Promise executor"
  │   then1 加入微任务队列
  ├─ async1() 调用（同步）
  │   ├─ "async1 start"（同步）
  │   ├─ async2() 调用
  │   │   └─ "async2"（同步）
  │   ├─ await 后面的代码加入微任务队列
  ├─ "script end"

t=微任务执行（第一轮）
  ├─ async1 await 后代码
  │   └─ "async1 end"
  ├─ Promise.then1
  │   └─ "Promise.then1"
  │   └─ setTimeout in Promise.then 加入宏任务队列

t=宏任务执行（第一轮）
  ├─ setTimeout1
  │   └─ "setTimeout1"
  │   └─ Promise in setTimeout 加入微任务队列

t=微任务执行（第二轮）
  └─ Promise in setTimeout
      └─ "Promise in setTimeout"

t=宏任务执行（第二轮）
  ├─ setTimeout in Promise.then
  │   └─ "setTimeout in Promise.then"
  │   └─ resolve() → 触发下一个 then

t=微任务执行（第三轮）
  └─ Promise.then2
      └─ "Promise.then2"
```

---

## 总结：事件循环核心规则

### 浏览器环境

| 优先级 | 类型 | 示例 |
|--------|------|------|
| 1 | 同步代码 | `console.log()` |
| 2 | 微任务 | `Promise.then()`, `queueMicrotask()`, `await` |
| 3 | 宏任务 | `setTimeout()`, `setInterval()`, `requestAnimationFrame()` |
| 4 | 渲染 | 更新 DOM（requestAnimationFrame 之后） |

### Node.js 环境

| 优先级 | 类型 | 示例 |
|--------|------|------|
| 1 | 同步代码 | `console.log()` |
| 2 | nextTick | `process.nextTick()` |
| 3 | 微任务 | `Promise.then()`, `queueMicrotask()` |
| 4 | 宏任务 | `setTimeout()`, `setInterval()` |
| 5 | check 阶段 | `setImmediate()` |
| 6 | I/O 轮询 | `fs.readFile()` |

### 面试高频考点

1. **微任务先于宏任务执行**
2. **微任务队列在同一宏任务内全部清空**
3. **async/await 底层基于 Promise**
4. **process.nextTick 优先级高于 Promise.then (Node.js)**
5. **setTimeout(fn, 0) 不保证立即执行**
6. **requestAnimationFrame 在渲染阶段执行**
7. **Node.js 中 setImmediate vs setTimeout 在 I/O 后的顺序不固定**