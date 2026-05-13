# JavaScript 核心技术详解（第13-18节）

---

## 13. Promise

### 13.1 Promise 原理与三种状态

Promise 是 ES6 引入的异步编程解决方案，是一个对象，用于获取异步操作的消息。从本意上讲，它是一个"容器"，里面存放着某个未来才会结束的事件（通常是一个异步操作）的结果。

#### 三种状态

```
pending（进行中）───resolve()──→ fulfilled（已成功）
      │
      └───reject()──→ rejected（已失败）

状态一旦改变就不可逆
```

| 状态 | 说明 | 能否继续改变 |
|------|------|------------|
| pending | 初始状态，等待中 | 可以变成 fulfilled 或 rejected |
| fulfilled | 操作成功完成 | 不能再改变 |
| rejected | 操作失败 | 不能再改变 |

#### 手写 Promise 完整版

```javascript
class MyPromise {
  static PENDING = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED = 'rejected';

  constructor(executor) {
    this.state = MyPromise.PENDING;
    this.value = undefined;
    this.callbacks = [];

    const resolve = (value) => {
      if (this.state !== MyPromise.PENDING) return;
      if (value instanceof MyPromise) {
        // Promise套Promise：递归解析
        value.then(resolve, reject);
        return;
      }
      this.state = MyPromise.FULFILLED;
      this.value = value;
      this.callbacks.forEach(cb => cb.onFulfilled(value));
    };

    const reject = (reason) => {
      if (this.state !== MyPromise.PENDING) return;
      this.state = MyPromise.REJECTED;
      this.value = reason;
      this.callbacks.forEach(cb => cb.onRejected(reason));
    };

    try { executor(resolve, reject); }
    catch (e) { reject(e); }
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handle = (callback, fallback) => {
        queueMicrotask(() => {
          try {
            const fn = typeof callback === 'function' ? callback : fallback;
            const result = fn(this.value);
            // then回调的返回值决定下一个Promise的状态
            result instanceof MyPromise
              ? result.then(resolve, reject)
              : resolve(result);
          } catch (e) { reject(e); }
        });
      };

      if (this.state === MyPromise.FULFILLED) {
        handle(onFulfilled, v => v);
      } else if (this.state === MyPromise.REJECTED) {
        handle(onRejected, e => { throw e; });
      } else {
        this.callbacks.push({
          onFulfilled: () => handle(onFulfilled, v => v),
          onRejected: () => handle(onRejected, e => { throw e; })
        });
      }
    });
  }

  catch(onRejected) { return this.then(null, onRejected); }
  finally(fn) { return this.then(fn, fn); }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise(r => r(value));
  }

  static reject(reason) {
    return new MyPromise((_, r) => r(reason));
  }
}
```

#### Promise.then 返回值规则

| then 回调返回值 | 下一个 Promise 的状态 |
|----------------|---------------------|
| 普通值         | resolved（该值）     |
| Promise        | 采用该 Promise 的最终状态 |
| throw 错误     | rejected（错误）      |
| thenable 对象  | resolved（调用 thenable.then） |

**thenable 例子**：拥有 `.then()` 方法的对象，会被 Promise.resolve 采用。

```javascript
const thenable = { then(resolve) { resolve(42); } };
Promise.resolve(thenable).then(x => console.log(x)); // 42
```

#### Promise 链式调用原理

```javascript
new Promise(r => r(1))
  .then(x => x + 1)      // p1 resolved 为 2
  .then(x => x * 2)      // p2 resolved 为 4
  .then(console.log);    // 打印 4
```

### 13.2 async / await 原理

`async` 函数返回 Promise，`await` 等待 Promise resolve 时会暂停 async 函数执行。

```javascript
// async 函数本质上返回 Promise
async function fn() { return 1; }
// 等价于：
function fn() { return Promise.resolve(1); }

// await 的执行顺序
async function main() {
  console.log('A');           // 同步执行
  await Promise.resolve();    // 暂停，产生微任务
  console.log('B');           // 微任务执行时打印
}
console.log('C');             // 同步
main();                       // 同步
console.log('D');             // 同步
// 输出：C, A, D, B
```

#### async/await 是 Generator 的语法糖

```javascript
// 手写 async 实现：asyncToGenerator
function asyncToGenerator(generatorFn) {
  return function(...args) {
    const gen = generatorFn.apply(this, args);
    return new Promise((resolve, reject) => {
      function step(key, value) {
        let result;
        try { result = gen[key](value); }  // gen.next() 或 gen.throw()
        catch (e) { return reject(e); }
        const { value: val, done } = result;
        if (done) { resolve(val); }
        else { Promise.resolve(val).then(v => step('next', v), e => step('throw', e)); }
      }
      step('next');
    });
  };
}

// co 函数：自动执行 Generator
function co(gen) {
  return new Promise((resolve, reject) => {
    if (typeof gen === 'function') gen = gen();
    function onFulfilled(val) {
      let result;
      try { result = gen.next(val); }
      catch (e) { return reject(e); }
      if (result.done) return resolve(result.value);
      Promise.resolve(result.value).then(onFulfilled, onThrow);
    }
    function onThrow(err) {
      let result;
      try { result = gen.throw(err); }
      catch (e) { return reject(e); }
      if (result.done) return resolve(result.value);
      Promise.resolve(result.value).then(onFulfilled, onThrow);
    }
    onFulfilled();
  });
}
```

### 13.3 Promise.all / race / allSettled / any

```javascript
// Promise.all：全部成功才成功，一个失败整体 reject
// 返回值顺序由输入顺序决定（即使完成顺序不同）
const p1 = Promise.resolve(1);
const p2 = new Promise(r => setTimeout(() => r(2), 100));
const p3 = Promise.resolve(3);
Promise.all([p1, p2, p3]).then(console.log); // [1, 2, 3] 按输入顺序

// Promise.all 实现
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = new Array(promises.length);
    let settled = 0;
    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        v => { results[i] = v; if (++settled === promises.length) resolve(results); },
        e => reject(e)
      );
    });
    if (promises.length === 0) resolve([]);
  });
}

// Promise.race：返回最先 settle 的 Promise（无论成功或失败）
Promise.race([
  new Promise(r => setTimeout(() => r(1), 300)),
  new Promise((_, r) => setTimeout(() => r(2), 100)),
  new Promise(r => setTimeout(() => r(3), 200))
]).then(console.log, console.error); // 2（第二个先失败）

// Promise.allSettled：等待所有 Promise settled（ES2020），不会因失败而 reject
Promise.allSettled([
  Promise.resolve(1),
  Promise.reject('error'),
  Promise.resolve(3)
]).then(results => results.forEach(r => {
  if (r.status === 'fulfilled') console.log(r.value);
  else console.error(r.reason);
}));
// [{status:'fulfilled',value:1}, {status:'rejected',reason:'error'}, {status:'fulfilled',value:3}]

// Promise.any：返回第一个 fulfilled 的 Promise，全部失败才 reject（AggregateError）
Promise.any([
  Promise.reject('err1'),
  Promise.reject('err2'),
  Promise.resolve(1)
]).then(console.log); // 1
```

#### 对比表格

| 方法 | 成功条件 | 失败条件 | 返回值 |
|------|---------|---------|--------|
| `Promise.all` | 全部 fulfilled | 一个 rejected | 所有结果的数组 |
| `Promise.race` | 一个 settled | 一个 settled | 那个 Promise 的结果 |
| `Promise.allSettled` | 全部 settled | 从不 reject | 每个结果的对象 |
| `Promise.any` | 一个 fulfilled | 全部 rejected | 那个 fulfilled 的结果 |

### 13.4 错误处理与 try/catch

```javascript
// Promise 错误处理优先级
async function handleError() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('请求失败:', err);
    return fallbackData;
  }
}

// try/catch 配合 Promise.allSettled
const results = await Promise.allSettled([
  fetch('/api/users').then(r => r.json()),
  fetch('/api/posts').then(r => r.json()),
]);

const { fulfilled, rejected } = results.reduce((acc, r, i) => {
  r.status === 'fulfilled' ? acc.fulfilled.push(r.value) : acc.rejected.push({ index: i, reason: r.reason });
  return acc;
}, { fulfilled: [], rejected: [] });
```

### 13.5 微任务队列与 Promise

Promise 的 `.then()`/`.catch()`/`.finally()` 回调都是微任务，在当前同步代码执行完后尽快执行。

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| Promise 嵌套 | 在 `.then()` 中 return new Promise() 而忘记 await | 统一在 async 函数中用 await |
| 忘记 return | `.then()` 中不 return，下一个 `.then()` 拿不到值 | 箭头函数简写 `() => value` 自动 return |
| catch 吞噬错误 | 空 catch 块导致错误静默消失 | 至少记录日志，或 re-throw |
| 并行请求取消 | 多个请求中某个失败导致整体失败 | 用 `Promise.allSettled()` 或 `Promise.any()` |
| 构造函数中同步抛错 | executor 中同步 throw 等同于 reject | 用 try/catch 包裹 executor |
| async 函数隐式 Promise | async 函数即使没有 return 也返回 Promise | 理解 async 函数是 Promise 包装器 |

### 面试追问

**Q1: Promise.then().then().catch() 中，catch 之后还能继续链式调用吗？**
可以。`.catch()` 本身也返回 Promise，所以可以继续 `.then()`。

```javascript
Promise.reject('err')
  .catch(e => { console.error(e); return 'recovered'; })
  .then(v => console.log('继续:', v)); // 继续: recovered
```

**Q2: 如何实现 Promise.retry（自动重试）？**

```javascript
async function promiseRetry(fn, retries = 3, delay = 1000) {
  try { return await fn(); }
  catch (e) {
    if (retries <= 0) throw e;
    await new Promise(r => setTimeout(r, delay));
    return promiseRetry(fn, retries - 1, delay * 2); // 指数退避
  }
}

await promiseRetry(() => fetch('/api/data'), 3, 1000);
```

**Q3: `await Promise.all()` 和 `Promise.all(await ...)` 有何区别？**
前者是等待数组中的 Promise 并行执行，后者是逐个等待（串行），性能差异巨大。

```javascript
// 并行（好）：三个请求同时发出
const [users, posts, comments] = await Promise.all([
  fetch('/api/users').then(r => r.json()),
  fetch('/api/posts').then(r => r.json()),
  fetch('/api/comments').then(r => r.json()),
]);

// 串行（差）：一个接一个发出
const users = await fetch('/api/users').then(r => r.json());
const posts = await fetch('/api/posts').then(r => r.json());
const comments = await fetch('/api/comments').then(r => r.json());
```

---

## 14. 事件循环（Event Loop）

### 14.1 宏任务 vs 微任务

JavaScript 是单线程语言，所有同步任务在主线程（调用栈）中执行，形成执行栈。任务队列分为**宏任务队列（macrotask）**和**微任务队列（microtask）**。

```
┌─────────────────────────────────────────────────────────────┐
│                    浏览器事件循环流程                         │
│                                                             │
│  ┌──────────┐    ┌──────────────────┐    ┌──────────────┐   │
│  │  执行栈   │───→│  微任务队列(清空)  │───→│  渲染(如有)  │   │
│  │(同步代码) │    │ Promise.then     │    │              │   │
│  │          │    │ queueMicrotask   │    │              │   │
│  │          │    │ MutationObserver │    │              │   │
│  │          │    └────────┬─────────┘    └──────┬───────┘   │
│  │          │             │  循环直到空          │          │
│  └──────────┘             └──────────────────────┘          │
│                                    ↑                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              宏任务队列（每次取一个）                       │   │
│  │  setTimeout  setInterval  I/O  UI渲染  requestAnimationFrame │
│  └───────────────────────────────────────────────────────┘   │
│                                    │                         │
│  每执行完一个宏任务 ─────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

#### 微任务 vs 宏任务 完整对比

| 分类 | 来源 | 说明 |
|------|------|------|
| 微任务 | `Promise.then/catch/finally` | resolve/reject 后入队 |
| 微任务 | `queueMicrotask()` | 手动入队微任务 |
| 微任务 | `MutationObserver` | DOM 变化微任务 |
| 微任务 | `process.nextTick` (Node) | 比 Promise 微任务优先级更高 |
| 宏任务 | `setTimeout / setInterval` | 定时器宏任务 |
| 宏任务 | `I/O` | 文件读写、网络请求回调 |
| 宏任务 | `UI rendering` | 浏览器每帧渲染 |
| 宏任务 | `requestAnimationFrame` | 每帧动画回调 |
| 宏任务 | `requestIdleCallback` | 空闲时低优先级任务 |
| 宏任务 | `setImmediate` (Node) | I/O 回调后执行 |
| 宏任务 | 事件回调 | click, keydown 等 |

### 14.2 经典输出顺序题

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
Promise.resolve().then(() => console.log('4'));
console.log('5');
// 输出：1, 5, 3, 4, 2
// 同步：1, 5 → 微任务：3, 4 → 宏任务：2
```

```javascript
// 复杂题：多个微任务链式
Promise.resolve().then(() => console.log('3'));
Promise.resolve().then(() => {
  console.log('4');
  Promise.resolve().then(() => console.log('5'));
});
Promise.resolve().then(() => console.log('6'));
// 输出：3, 4, 6, 5
// 微任务队列按顺序执行，4中产生了新的微任务5，放到队列末尾继续执行
```

### 14.3 async/await 与微任务

```javascript
// await Promise.resolve() 的执行流程
async function test() {
  console.log('A');              // 同步
  await Promise.resolve();       // 微任务入队，暂停函数执行
  console.log('B');               // 微任务执行时打印
}

console.log('C');                 // 同步
test();                          // 同步（开始执行 async 函数）
console.log('D');                 // 同步
// 输出：C, A, D, B
```

### 14.4 浏览器 vs Node.js 事件循环

Node.js 使用 libuv 实现事件循环，包含多个阶段：

```
┌────────────────────────────┐
│  timers                    │  setTimeout / setInterval 回调
│  pending callbacks         │  延后的 close callbacks
│  idle, prepare            │  内部使用
│  poll                     │  获取新的 I/O 事件
│  check                    │  setImmediate 回调
│  close callbacks          │  close 事件回调
└────────────────────────────┘
```

**关键区别：**

| 特性 | 浏览器 | Node.js |
|------|--------|--------|
| 微任务 | `Promise.then` | `Promise.then` + `process.nextTick`（优先级更高） |
| `setTimeout` vs `setImmediate` | 只有 setTimeout | 在 I/O 回调中：immediate 先于 timeout |
| 渲染 | 每帧渲染 | 无 UI 渲染（Node 服务端） |

```javascript
// Node 中 nextTick 优先级高于 Promise 微任务
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('microtask'));
// 输出：nextTick, microtask

// setTimeout vs setImmediate 在 I/O 回调中
const fs = require('fs');
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
  // 几乎总是 immediate 先输出（check 阶段在 poll 阶段后）
});
```

### 14.5 setTimeout(fn, 0) 不精确的原因

```javascript
// setTimeout(fn, 0) 不保证立即执行，因为：
// 1. 要等当前同步代码和微任务队列清空
// 2. 要等浏览器渲染（如果需要）
// 3. 后台标签页（Chrome）最低精度降到 1 秒

// 为什么 requestAnimationFrame 比 setTimeout 更适合动画？
// - rAF：每帧渲染前执行，浏览器统一调度，不掉帧
// - setTimeout(..., 16.7)：不管渲染时机，可能在渲染期间执行，导致重复渲染

// 更精确的定时：Web Worker 中没有渲染，精度更高
// 或者使用 MessageChannel
const channel = new MessageChannel();
channel.port1.postMessage(null); // 产生一个宏任务（不涉及渲染）
```

### 14.6 requestAnimationFrame

```javascript
// rAF 在浏览器渲染前执行（每帧一次），约 16.67ms（60fps）
// 与 setTimeout(fn, 16.7) 的本质区别：
// rAF：保证在渲染前执行，浏览器统一调度，不掉帧
// setTimeout：到时间就执行，可能在渲染期间执行，造成重复渲染

// 使用 rAF 实现流畅动画
function animate(element, targetOpacity) {
  let current = parseFloat(getComputedStyle(element).opacity);

  function step() {
    const delta = targetOpacity - current;
    if (Math.abs(delta) < 0.01) {
      element.style.opacity = targetOpacity;
      return;
    }
    current += delta * 0.1; // 缓动
    element.style.opacity = current;
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// rAF 节流（配合滚动事件）
let pending = false;
function onScroll() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    handleScroll();           // 同步到渲染时机
    pending = false;
  });
}
```

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| 在微任务中创建大量微任务 | 可能在微任务处理中又添加微任务，导致队列不断增长 | 避免在 `.then()` 中直接创建大量同步 Promise |
| `setTimeout(0)` 滥用 | 不精确，会阻塞渲染 | 需要精确时用 `requestAnimationFrame` |
| 混淆微任务和宏任务优先级 | `await` 后面跟着的代码优先级低于其他同步代码 | 理解 `await` 等价于 `.then()` 的微任务性质 |
| 动画用 setTimeout 而非 rAF | 可能掉帧或重复渲染 | 动画统一使用 `requestAnimationFrame` |
| 后台页面 setTimeout 精度丢失 | Chrome 后台化标签页降低定时器精度到 1 秒 | 使用 `visibilitychange` 暂停不必要的定时器 |

### 面试追问

**Q1: 下面代码的输出顺序是什么？**

```javascript
async function async1() {
  console.log('1');
  await async2();
  console.log('2');
}
async function async2() {
  console.log('3');
}
console.log('4');
setTimeout(() => console.log('5'), 0);
async1();
console.log('6');

// 答案：4, 1, 3, 6, 2, 5
// 同步：4, 1, 3（async函数同步部分执行）, 6
// 微任务：2（await async2() 后，async2() 已完成，直接执行后续的微任务）
// 宏任务：5
```

**Q2: 如何用微任务实现一个简单的 `nextTick`？**

```javascript
function nextTick(fn) {
  // 浏览器环境
  if (typeof queueMicrotask !== 'undefined') {
    queueMicrotask(fn);
  } else {
    Promise.resolve().then(fn);
  }
}
```

**Q3: Node.js 和浏览器事件循环的主要区别是什么？**
Node.js 有多个阶段（timers → poll → check），且 `process.nextTick` 优先级高于 Promise 微任务。浏览器只有单一宏任务队列和微任务队列，且有渲染阶段。

---

## 16. 深拷贝与浅拷贝

### 16.1 概念定义

```
浅拷贝（Shallow Copy）
┌─────────────────────────┐
│  原对象                   │
│  ┌───────────────┐      │
│  │ obj: {x:1} ──┼──→ 共享同一个引用
│  └───────────────┘      │
│                         │
│  拷贝对象                 │
│  ┌───────────────┐      │
│  │ obj: {x:1} ←──┴── 指向同一块内存
│  └───────────────┘      │
└─────────────────────────┘

深拷贝（Deep Copy）
┌─────────────────────────┐
│  原对象                   │
│  ┌───────────────┐      │
│  │ obj: {x:1}    │      │
│  └───────────────┘      │
│                         │
│  拷贝对象（完全独立）       │
│  ┌───────────────┐      │
│  │ obj: {x:1}    │  ←── 新的独立引用
│  └───────────────┘      │
└─────────────────────────┘
```

### 16.2 主流深拷贝方法对比

#### 1. JSON.parse(JSON.stringify())

```javascript
const original = { name: 'Alice', nested: { score: 90 } };
const clone = JSON.parse(JSON.stringify(original));
clone.nested.score = 100;
console.log(original.nested.score); // 90（未受影响）
```

**缺点（注意）：**

| 问题 | 示例 |
|------|------|
| 函数、`undefined`、`Symbol` 丢失 | `{ fn: () => {}, u: undefined }` → `{}` |
| 无法处理循环引用 | 抛 `TypeError: Converting circular structure to JSON` |
| Date 变成字符串 | `new Date()` → `"2024-01-01T..."` |
| RegExp 变成空对象 | `/test/g` → `{}` |
| Error 丢失 | `new Error("msg")` → `{}` |
| BigInt 报错 | `BigInt(123)` → `TypeError` |
| Map/Set 变成 `{}` | `new Map([[1,2]])` → `{}` |
| 原型链丢失 | 丢失 constructor 等 |

#### 2. structuredClone（现代浏览器 / Node 17+）

```javascript
// structuredClone：浏览器原生深拷贝，使用结构化克隆算法
// 支持：循环引用、BigInt、Date、RegExp、Error、TypedArray、Map、Set、Blob 等
const original = {
  date: new Date(),
  big: 123n,
  map: new Map([[1, 2]]),
  regex: /test/gi,
  nested: { value: 42 }
};
const clone = structuredClone(original);
clone.nested.value = 100;
console.log(original.nested.value);  // 42
clone.big === 123n;                  // true
clone.date instanceof Date;          // true
clone.map instanceof Map;             // true

// structuredClone 的 transfer 选项（转移所有权，不拷贝）
const buffer = new ArrayBuffer(8);
const clone2 = structuredClone({ buffer }, { transfer: [buffer] });
// buffer 在原位置被"掏空"（长度为 0），transfer 数组中获得所有权
```

**structuredClone 不支持的类型**：函数、Symbol 键、DOM 节点（Node）、Error（部分实现）。

#### 3. 手写深拷贝（完整版）

```javascript
function deepClone(target, memory = new WeakMap()) {
  // 处理原始类型和 null
  if (target === null || typeof target !== 'object') return target;

  // 处理循环引用：发现已拷贝的对象，直接返回该拷贝的引用
  if (memory.has(target)) return memory.get(target);

  // 处理 Date
  if (target instanceof Date) return new Date(target);

  // 处理 RegExp
  if (target instanceof RegExp) return new RegExp(target.source, target.flags);

  // 处理 Error
  if (target instanceof Error) {
    const err = new Error(target.message);
    err.name = target.name;
    err.stack = target.stack;
    return err;
  }

  // 处理函数（区分箭头函数和普通函数）
  if (typeof target === 'function') {
    if (!target.prototype) return target; // 箭头函数无自己的this
    return function(...args) { return target.apply(this, args); };
  }

  // 处理 Map
  if (target instanceof Map) {
    const cloneMap = new Map();
    memory.set(target, cloneMap);
    target.forEach((v, k) => cloneMap.set(deepClone(k, memory), deepClone(v, memory)));
    return cloneMap;
  }

  // 处理 Set
  if (target instanceof Set) {
    const cloneSet = new Set();
    memory.set(target, cloneSet);
    target.forEach(v => cloneSet.add(deepClone(v, memory)));
    return cloneSet;
  }

  // 处理 Array 和 Object
  const clone = Array.isArray(target) ? [] : {};
  memory.set(target, clone);
  for (const key of Reflect.ownKeys(target)) {
    // 使用 Reflect.ownKeys 包含 Symbol 键
    clone[key] = deepClone(target[key], memory);
  }
  return clone;
}
```

### 16.3 TypeScript Deep Merge

```typescript
// TypeScript 深度合并工具类型
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

function deepMerge<T extends object>(target: T, ...sources: DeepPartial<T>[]): T {
  return sources.reduce((acc, src) => {
    for (const key in src) {
      const srcVal = (src as any)[key];
      const accVal = (acc as any)[key];
      if (
        srcVal !== null &&
        typeof srcVal === 'object' &&
        !Array.isArray(srcVal) &&
        accVal !== null &&
        typeof accVal === 'object' &&
        !Array.isArray(accVal)
      ) {
        (acc as any)[key] = deepMerge(accVal, srcVal as any);
      } else if (srcVal !== undefined) {
        (acc as any)[key] = srcVal;
      }
    }
    return acc;
  }, { ...target });
}

// 使用示例
interface Config {
  server: {
    host: string;
    port: number;
    options: { timeout: number; retries: number };
  };
  logging: { level: string };
}

const defaultConfig: Config = {
  server: { host: 'localhost', port: 3000, options: { timeout: 5000, retries: 3 } },
  logging: { level: 'info' },
};

const userConfig: DeepPartial<Config> = {
  server: { port: 8080, options: { timeout: 10000 } },
};

const finalConfig = deepMerge(defaultConfig, userConfig);
// finalConfig.server.options.retries === 3（保留默认值）
// finalConfig.server.port === 8080（覆盖）
// finalConfig.logging.level === 'info'（保留默认值）
```

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| `JSON.stringify` 处理 Date | Date 变成字符串 | 用 `structuredClone` 或手动处理 |
| 循环引用 | `JSON.stringify` 报错 | 用 `structuredClone` 或带 memo 的手写实现 |
| 函数丢失 | `JSON.stringify` 丢失函数 | 用手写深拷贝，箭头函数直接返回，普通函数返回包装函数 |
| Symbol 键 | 手写深拷贝时遗漏 | 用 `Reflect.ownKeys()` 或 `Object.getOwnPropertySymbols()` |
| 原型链 | `JSON.parse` 丢失 constructor | 用 `Object.create(Object.getPrototypeOf(obj))` |
| Map/Set 作为键的对象 | 深拷贝时键未正确克隆 | 在带 memo 的实现中处理 Map/Set 类型的键 |
| 性能问题 | 大对象深拷贝性能差 | 用 `structuredClone`（原生实现，性能最优） |

### 面试追问

**Q1: 如何处理带有循环引用的对象进行深拷贝？**

```javascript
// 方法1: structuredClone（最简洁）
const obj = { name: 'test' };
obj.self = obj;  // 循环引用
const clone = structuredClone(obj);

// 方法2: 带 WeakMap 的手写实现（见上文的 deepClone 函数）
// 方法3: 使用 lodash
// import { cloneDeep } from 'lodash';
// const clone = _.cloneDeep(obj);
```

**Q2: `structuredClone` 和 `JSON.stringify` 的核心区别是什么？**
`structuredClone` 使用结构化克隆算法（浏览器内部算法，用于 `postMessage`/IndexedDB），支持循环引用、BigInt、TypedArray、Map、Set、Date、RegExp、Error 等复杂类型，但不支持函数和 Symbol 键。`JSON.stringify` 是文本序列化，不支持循环引用，会丢失函数/undefined/Symbol/BigInt，Date 变字符串，RegExp 变空对象。

**Q3: 如何实现一个高性能的深拷贝？**
优先使用 `structuredClone`（原生实现，无 JS 开销）。需要手写时，用 `WeakMap` 做 memo 避免重复拷贝（尤其是处理图结构时），对 TypedArray 用 `.slice()` 拷贝（比递归快），对普通对象用 `Object.assign({}, obj)` 配合递归。

---

## 17. Map / Set / WeakMap / WeakSet

### 17.1 概念与内存模型

```
Map vs Object 内存结构示意

Map（任意类型键，内部哈希表）
┌───────────────────────────────────────────┐
│  键值对存储（Hash Table）                    │
│  ┌──────────┐  ┌──────────┐              │
│  │ {} ──→ 1 │  │ NaN ──→ 2│  键可以是对象！ │
│  └──────────┘  └──────────┘              │
│  ┌──────────┐  ┌──────────┐              │
│  │ fn ──→ 3 │  │ "str" ──→4│             │
│  └──────────┘  └──────────┘              │
│  size: 4  .get()/.set()/.has() O(1)       │
└───────────────────────────────────────────┘

Object（字符串/Symbol键，V8 内部属性存储）
┌───────────────────────────────────────────┐
│  属性存储（Hidden Class + Properties）     │
│  name: "Alice"   age: 18                 │
│  键只能是 string 或 symbol                 │
│  继承的属性也会被枚举（需 hasOwnProperty）  │
└───────────────────────────────────────────┘
```

### 17.2 Map vs Object

| 特性 | Map | Object |
|------|-----|--------|
| 键类型 | 任意（对象、函数、NaN 等） | 只能是 string 或 symbol |
| 有序性 | 按插入顺序严格遍历 | 基本有序（非确定性） |
| 大小 | `map.size` | `Object.keys(obj).length` |
| 迭代 | 直接 `for...of` / `.forEach()` | 需要 `Object.keys()` |
| 性能 | 插入/删除 O(1)，键为对象时更快 | 插入/删除 O(1)（但有额外开销） |
| 原型链 | 无默认原型（可选 Map[Symbol.hasInstance]） | 有（需 `hasOwnProperty`） |
| JSON | 不能直接序列化 | 可以 `JSON.stringify()` |
| 使用场景 | 键值对集合、字典、图结构 | 配置对象、DTO、建模实体 |

```javascript
// Map 键可以是任意类型
const cache = new Map();
const keyObj = { id: 1 };
cache.set(keyObj, 'user data');
console.log(cache.get(keyObj)); // 'user data'

// NaN 可以作为键（Map 用 SameValueZero 比较）
const m = new Map();
m.set(NaN, 'not a number');
m.get(NaN);               // 'not a number'
m.get(Number.NaN);         // 'not a number'（SameValueZero）

// Map 可直接迭代
const m = new Map([['a', 1], ['b', 2]]);
for (const [k, v] of m) { console.log(k, v); }       // a 1, b 2
m.forEach((v, k) => console.log(k, v));              // a 1, b 2
[...m.entries()];   // [['a',1],['b',2]]
[...m.keys()];      // ['a', 'b']
[...m.values()];    // [1, 2]
```

### 17.3 Set vs Array

| 特性 | Set | Array |
|------|-----|--------|
| 唯一性 | 自动去重 | 可能有重复 |
| 查找性能 | `O(1)`（`.has()`） | `O(n)`（`.includes()`） |
| 添加/删除 | `O(1)` | `O(n)`（中间位置） |
| 天然适合去重 | `[...new Set(arr)]` | `[...new Set(arr)]` |
| 有序性 | 按插入顺序 | 按索引顺序 |

```javascript
// 数组去重（Set 的经典用法）
const arr = [1, 2, 2, 3, 3, 3, NaN, NaN, {}, {}];
[...new Set(arr)];                    // [1, 2, 3, NaN, {}, {}]（NaN 可去重，{} 不行因为引用不同）
[...new Set(arr)].length === 5;       // true

// Set 的 .has 比 Array 的 .includes 快（大数据集时差距明显）
// 大数组查找：Set O(1) vs Array O(n)
const largeArr = Array.from({ length: 100000 }, (_, i) => i);
const largeSet = new Set(largeArr);
largeSet.has(99999);   // O(1)，快
largeArr.includes(99999); // O(n)，慢
```

### 17.4 WeakMap / WeakSet 与垃圾回收

这是 Map/Set 最重要的区别：**弱引用**。当唯一剩余的引用是 WeakMap/WeakSet 对键的弱引用时，键对象可以被垃圾回收。

```
WeakMap 弱引用示意

WeakMap 持有对 {name: 'obj'} 的弱引用（不阻止 GC）
┌──────────────────────────────────────────────────┐
│  WeakMap   ──weak ref──→  {name: 'obj'}          │
│                              ↑                   │
│  外部引用（如果存在）           │                  │
│  const ref = {name:'obj'}    │                  │
│                              │                  │
│  如果 ref = null：           │                  │
│  WeakMap 的条目自动消失 ←──────┘                  │
│  对象被 GC 回收                                      │
└──────────────────────────────────────────────────┘
```

#### WeakMap vs Map

| 特性 | WeakMap | Map |
|------|---------|-----|
| 键类型 | **只能是对象**（非 null） | 任意类型 |
| 弱引用 | 键是弱引用（可 GC） | 强引用（不可 GC） |
| 迭代 | **不可迭代**（`.size`/`.forEach()` 等不可用） | 可迭代 |
| 内存 | 键对象无其他引用时自动被回收 | 需手动 `.delete()` 才能释放 |
| 使用场景 | 私有属性、DOM 数据关联、缓存 |

```javascript
// WeakMap 三大经典应用场景：

// 场景1: 私有属性（不污染对象，不阻止 GC）
const privateData = new WeakMap();

class User {
  constructor(name, age) {
    privateData.set(this, { name, age }); // this 作为键
  }
  getName() { return privateData.get(this).name; }
  getAge() { return privateData.get(this).age; }
}
// User 实例无其他引用时，privateData 中的条目自动消失

// 场景2: 缓存计算结果（key 为对象，内存自动回收）
const computeCache = new WeakMap();
function processData(dataObj) {
  if (computeCache.has(dataObj)) {
    return computeCache.get(dataObj); // 命中缓存
  }
  const result = heavyComputation(dataObj);
  computeCache.set(dataObj, result);
  return result;
}
// dataObj 无外部引用时，被 GC 回收，缓存条目自动消失

// 场景3: DOM 节点关联元数据（不阻止 DOM GC）
const elementMetadata = new WeakMap();
function tagElement(el, meta) { elementMetadata.set(el, meta); }
function getMeta(el) { return elementMetadata.get(el); }
// DOM 元素从页面移除后，elementMetadata 中对应的条目自动消失
```

#### WeakSet vs Set

| 特性 | WeakSet | Set |
|------|---------|-----|
| 存储内容 | **只能是对象** | 任意类型 |
| 弱引用 | 成员是弱引用（可 GC） | 强引用（不可 GC） |
| 迭代 | 不可迭代 | 可迭代 |

```javascript
// WeakSet 场景：标记对象（"已访问"标记）
const visited = new WeakSet();

function dfs(node) {
  if (visited.has(node)) return; // 已访问过，跳过
  visited.add(node);              // 标记
  // 访问 node...
  node.children.forEach(child => dfs(child));
}
// 无需担心内存泄漏：访问过的节点无其他引用时被 GC，WeakSet 条目自动消失

// 对比：用普通 Set 标记的话，节点被访问后 Set 仍持有引用
// const visited = new Set();
// visited.add(node); // 节点永远在 Set 中，无法 GC
```

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| Map 键比较用 SameValueZero | `NaN === NaN` 为 false，但 Map 中 `m.set(NaN, v)` 后 `m.get(NaN)` 能获取到 | 了解 SameValueZero 语义 |
| 用 Object 模拟字典 | 对象作为键需要 `{} !== {}`，需用额外的 Map | 始终用 Map 作为字典数据结构 |
| WeakMap 不能迭代 | 无法用 `.forEach()` 或 `for...of` | 如果需要迭代，不要用 WeakMap |
| Set 去重对象引用 | `{a:1}` 和 `{a:1}` 是不同引用，Set 都会保留 | 需要自定义去重逻辑（比较字段） |
| Map 的 JSON 序列化 | Map 不能直接 `JSON.stringify()` | 用 `Object.fromEntries(map)` 或手动序列化 |

### 面试追问

**Q1: WeakMap 为什么键只能是对象，不能是基本类型？**
GC 需要追踪"对象的引用"，而基本类型（如字符串、数字）不存在于堆中，不涉及引用计数。如果允许基本类型作为键，GC 无法判断何时回收。设计为对象键确保只要对象在其他地方还有强引用，WeakMap 中的条目就保留；对象失去外部引用后，条目自动消失。

**Q2: WeakMap/WeakSet 的迭代器为什么设计为不可用？**
因为迭代过程中，如果遍历到的对象刚好没有其他强引用，GC 可能回收它，导致集合大小在迭代中变化，产生不确定行为。这是设计上的有意取舍：用弱引用特性换迭代能力。

**Q3: Map 和 Object 的性能差异在哪里？**
V8 中，对象属性的读写经过 Hidden Class + 内联缓存优化，理论上 O(1)。Map 在键为对象时更快（不需要将对象序列化为字符串），且 `.has()`/`.delete()` 比 `hasOwnProperty` + `delete obj[key]` 更直接。实际使用中，Map 在需要频繁增删键值对的场景（如实现 LRU 缓存）性能更稳定。

---

## 18. 迭代器与生成器

### 18.1 迭代器协议与可迭代协议

```
迭代器协议（Iterator Protocol）
┌─────────────────────────────────────────────────────────────┐
│  一个对象包含 next() 方法，返回 { value: any, done: boolean } │
│                                                             │
│  iterator.next() ──→ { value: 'a', done: false }           │
│  iterator.next() ──→ { value: 'b', done: false }           │
│  iterator.next() ──→ { value: undefined, done: true }      │
└─────────────────────────────────────────────────────────────┘

可迭代协议（Iterable Protocol）
┌─────────────────────────────────────────────────────────────┐
│  一个对象包含 [Symbol.iterator]() 方法，返回一个迭代器         │
│                                                             │
│  obj[Symbol.iterator]() ──→ iterator                        │
│                                                             │
│  内置可迭代对象：                                            │
│  Array, String, NodeList, Map, Set, TypedArray,             │
│  arguments, DOM TokenList, Generator, async Generator        │
└─────────────────────────────────────────────────────────────┘
```

#### for...of vs for...in

```javascript
const arr = [10, 20, 30];
arr.custom = 'hi';

for (let i in arr) { console.log(i); }  // 0, 1, 2, custom（索引+自定义属性）
for (let v of arr) { console.log(v); }  // 10, 20, 30（值）

// for...of 原理：调用 [Symbol.iterator]()
const iterator = arr[Symbol.iterator]();
console.log(iterator.next()); // {value: 10, done: false}
console.log(iterator.next()); // {value: 20, done: false}
console.log(iterator.next()); // {value: 30, done: false}
console.log(iterator.next()); // {value: undefined, done: true}
```

### 18.2 给 Object 添加迭代器

```javascript
// 普通 Object 默认不可迭代（for...of 报错）
const obj = { a: 1, b: 2, c: 3 };

// 方法1：Generator 函数
obj[Symbol.iterator] = function* () {
  for (const key of Object.keys(this)) {
    yield [key, this[key]];
  }
};
for (const [k, v] of obj) { console.log(k, v); } // a 1, b 2, c 3

// 方法2：类上定义（用于 class）
class OrderedMap {
  constructor() { this.items = {}; this.keys = []; }
  set(k, v) {
    if (!this.items[k]) this.keys.push(k);
    this.items[k] = v;
  }
  *[Symbol.iterator]() {
    for (const key of this.keys) {
      yield [key, this.items[key]];
    }
  }
}
```

### 18.3 生成器函数（Generator）

```javascript
// Generator：function*，调用不执行，返回迭代器
// 每次 .next() 执行到下一个 yield，暂停

function* createRange(start, end) {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}

const range = createRange(1, 5);
console.log(range.next());   // {value: 1, done: false}
console.log(range.next());   // {value: 2, done: false}
console.log(range.next());   // {value: 3, done: false}
console.log(range.next());   // {value: 4, done: false}
console.log(range.next());   // {value: 5, done: false}
console.log(range.next());   // {value: undefined, done: true}

// 生成器实现斐波那契数列（惰性求值，内存高效）
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// 取前10个斐波那契数，不需要生成整个数组
const fib = fibonacci();
for (let i = 0; i < 10; i++) {
  console.log(fib.next().value); // 0, 1, 1, 2, 3, 5, 8, 13, 21, 34
}

// yield* 委托另一个迭代器
function* gen1() { yield 1; yield 2; }
function* gen2() { yield* gen1(); yield 3; }
// 等价于：yield 1; yield 2; yield 3;

// next(val) 向 yield 传值
function* counter() {
  let n = 0;
  while (true) {
    const input = yield ++n; // yield 暂停，返回 n+1，下次 next(input) 给 input
    if (input === 'reset') n = 0;
  }
}
const it = counter();
console.log(it.next().value);         // 1
console.log(it.next().value);         // 2
console.log(it.next('reset').value);  // 1（reset 后 n=0，yield 返回 ++n=1）
```

### 18.4 异步迭代器（Async Iterator）

```javascript
// 同步迭代器：next() 返回 { value, done }
// 异步迭代器：next() 返回 Promise<{ value, done }>

// 手写异步迭代器（模拟分页 API）
const createAsyncIterator = (urls) => ({
  urls,
  index: 0,
  [Symbol.asyncIterator]() {
    return {
      next: () => {
        if (this.index >= this.urls.length) {
          return Promise.resolve({ value: undefined, done: true });
        }
        return fetch(this.urls[this.index++])
          .then(r => r.json())
          .then(data => ({ value: data, done: false }));
      }
    };
  }
});

// 使用 for await...of 遍历
async function fetchAllPages() {
  const iterator = createAsyncIterator([
    '/api/users?page=1',
    '/api/users?page=2',
    '/api/users?page=3',
  ]);

  for await (const user of iterator) {
    console.log(user);
  }
}

// 异步生成器（ES2018）：async function*，更简洁
async function* fetchUsers() {
  let page = 1;
  while (page <= 10) {
    const res = yield fetch(`/api/users?page=${page}`).then(r => r.json());
    const data = await res;
    if (data.isLastPage) break;
    page++;
  }
}

// 或者：
async function* asyncGen() {
  yield await fetch('/api/1').then(r => r.json());
  yield await fetch('/api/2').then(r => r.json());
}

async function main() {
  for await (const item of asyncGen()) {
    console.log(item);
  }
}
```

### 18.5 实用场景

```javascript
// 场景1：实现无限序列（惰性求值）
function* infiniteSequence(start = 0) {
  let i = start;
  while (true) yield i++;
}

// 场景2：分页数据流
async function* paginatedFetch(fetchPage) {
  let page = 1;
  while (true) {
    const data = await fetchPage(page);
    if (!data.items.length) break;
    yield data.items;
    page++;
  }
}

// 场景3：流式处理管道
function* pipeline(source) {
  for (const item of source) {
    const processed = item.filter(x => x > 0).map(x => x * 2);
    yield* processed;
  }
}
```

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| 生成器未调用 `.next()` | 生成器惰性，`.next()` 之前不执行任何代码 | 确认何时开始消费值 |
| `for...of` 遍历无限生成器 | 导致无限循环 | 用 `.take()` 或限制次数 |
| 在普通函数中用 `yield` | SyntaxError: yield 只能在 Generator 中使用 | 确认函数用 `function*` 声明 |
| 异步生成器与 `Promise.all` | 异步生成器每次 yield 一个 Promise | 用 `Promise.all([...])` 收集多批次结果 |
| Generator 和 Observable 混淆 | Generator 是同步拉取，Observable 是异步推送 | 根据场景选择：Generator 适合同步/确定数据流，Observable 适合异步/事件流 |

### 面试追问

**Q1: `for await...of` 的原理是什么？**
`for await...of` 调用对象的 `[Symbol.asyncIterator]()` 获取异步迭代器，然后反复调用 `.next()`（返回 Promise），等待 Promise resolve 后取出 `{ value, done }`，在 done 为 true 时停止。

**Q2: Generator 的 `return()` 和 `throw()` 有什么用？**

```javascript
function* gen() {
  yield 1;
  yield 2;
  yield 3;
}

const g = gen();
g.next();        // {value: 1, done: false}
g.return('stopped'); // {value: 'stopped', done: true}（提前结束）
g.next();        // {value: undefined, done: true}

function* gen2() {
  try { yield 1; }
  catch (e) { console.log('caught:', e.message); }
  yield 2;
}
const g2 = gen2();
g2.next();               // {value: 1}
g2.throw(new Error('oops')); // 向当前 yield 位置抛异常，caught: oops
```

**Q3: 如何用生成器实现一个 `take` 函数（从迭代器取前 n 个）？**

```javascript
function take(iterable, n) {
  return {
    [Symbol.iterator]() {
      const iterator = iterable[Symbol.iterator]();
      let i = 0;
      return {
        next() {
          if (i++ < n) {
            const { value, done } = iterator.next();
            return { value, done };
          }
          return { value: undefined, done: true };
        }
      };
    }
  };
}

// 使用
const nums = take(infiniteSequence(1), 5);
[...nums]; // [1, 2, 3, 4, 5]
```

---

> 📚 参考：
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Using_promises
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Event_loop
> - https://developer.mozilla.org/zh-CN/docs/Web/API/queueMicrotask
> - https://developer.mozilla.org/zh-CN/docs/Web/API/setTimeout
> - https://developer.mozilla.org/zh-CN/docs/Web/API/setAnimationFrame
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/structuredClone
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Iterators_and_generators
> - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator
> - https://blog.csdn.net/qi_bai_jin/article/details/158261107（V8 垃圾回收原理）
> - https://cloud.tencent.com/developer/news/2263970（Vue3 Proxy + Reflect 响应式）
> - https://blog.csdn.net/duqg/article/details/145037577（2025 Map/Set/WeakMap/WeakSet）
> - https://www.jb51.net/article/282533.htm（Map/Set/WeakMap/WeakSet 详解）