---
title: JavaScript 手写题解：队列、Promise 与对象图 W001–W008
description: 从链式 LazyMan、Promise.all 和循环引用深拷贝推导闭包与队列实现，再用 curry、once、memoize、EventBus、flatten 练习参数累积、身份缓存和有序遍历。
tags: [coding, interview, javascript, workshop]
date: 2026-10-13
level: intermediate
prerequisites:
  - JavaScript 函数、闭包、数组、Map 与 Promise
  - Node.js 20+
runnable: true
tested_with:
  - node@24.16.0
verified_at: 2026-10-13
source_commit: 27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb
---

# JavaScript 手写题解 队列、Promise 与对象图 W001–W008

下面每题都从一个可观察的调用开始。完整实现和可复制测试在 [`core.mjs`](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/web/core.mjs) 与 [`core.test.mjs`](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/web/core.test.mjs)。在仓库根目录运行 `node --test scripts/teaching-labs/web/core.test.mjs`，23 项测试应通过。

## W001 LazyMan 链式调用为何先收集再执行 {#w001}

日志工具要接受 `lazyMan('Mia').eat('tea').sleep(20).sleepFirst(5)`。经典顺序是先等 5ms，再问候，再吃茶，最后等 20ms。链式方法同步返回同一对象；这版在当前同步调用栈结束后自动启动，不要求调用者补 `done()`。

第一步是让问候也成为普通任务。若在 runner 里直接调用 `log`，优先等待最多只能排在 `Hi` 的前面或后面，无法同时共享同一套顺序规则。

```js
const jobs = [() => log(`Hi, I'm ${name}`)];
```

普通动作追加到队尾。任务保存的是函数，而不是执行后的结果，所以登记 `sleep` 时不会真的等待：

```js
sleep(ms) {
  jobs.push(async () => {
    await wait(ms);
    log(`Wake after ${ms}`);
  });
  return api;
}
```

`sleepFirst` 也登记一个异步任务，但把它放到队首。队列此时是“优先等待、问候、普通动作”：

```js
sleepFirst(ms) {
  jobs.unshift(async () => {
    await wait(ms);
    log(`Wake first after ${ms}`);
  });
  return api;
}
```

最后需要确定启动时机。构造器刚创建就同步执行，会早于链上的 `eat()` 和 `sleepFirst()`；等到微任务则能让这一整段同步链先完成：

```js
if (autoStart) queueMicrotask(done);
```

`done()` 只创建一次运行 Promise。队列逐项 `await`，因此前一个等待完成后才开始下一个；同一个 Promise 也让重复调用 `done()` 不会重跑副作用：

```js
if (runPromise) return runPromise;
runPromise = Promise.resolve().then(async () => {
  for (const job of jobs) await job();
});
runPromise.catch(() => {});
return runPromise;
```

先登记 Promise，再在下一微任务执行任务。这样即使日志回调同步再次调用 `done()`，也能拿到同一个 Promise，不会递归启动。

内部 catch 避免自动启动产生未观察的拒绝。`done()` 仍能观察原来的失败。某个等待拒绝后，循环退出，不再运行后续任务。

测试可传 `{ autoStart: false }` 控制启动时机。默认日志函数是 `console.log`。QQMan 换成 `play()`、`rest()`、`restFirst()`，仍使用同一个任务队列。

```js
qqMan('Q').play('chess').rest(20).restFirst(5);
// Rested first 5, Hi, I'm Q, Play chess, Rested 20
```

## W002 Promise.all 完成顺序不等于结果顺序 {#w002}

`promiseAll(new Set([slowUser, fastCart, 7]))` 按输入下标返回 `[user, cart, 7]`，空 iterable 返回 `[]`，任一拒绝使整体拒绝。输入必须实现 iterable 协议；数字、普通对象和只有 `length` 的类数组都会拒绝。异步仪表盘正需要保持卡片的输入顺序。

先读取一次 `Symbol.iterator`，并把保存下来的迭代器交给 `Array.from`。这一步也避免把 `Array.from` 对普通类数组的便利行为误当成 `Promise.all` 的输入规则：

```js
const iteratorMethod = iterable?.[Symbol.iterator];
if (typeof iteratorMethod !== 'function') throw new TypeError('Expected an iterable');
const iterator = iteratorMethod.call(iterable);
const values = Array.from({ [Symbol.iterator]: () => iterator });
```

然后在每项安装处理函数前创建固定长度结果数组：

```js
const result = new Array(values.length);
let remaining = values.length;
values.forEach((value, index) => Promise.resolve(value).then(item => {
  result[index] = item;
  if (--remaining === 0) resolve(result);
}, reject));
```

闭包中的 `index` 是槽位，`remaining` 是未完成计数。用 `push` 会让快请求排在慢请求前面；不特殊处理空输入则计数永远到不了零。测试包括普通值、空列表、thenable 归一化、非 iterable、迭代器 getter 只读一次和拒绝。

## W003 深拷贝 复制对象图而非递归树 {#w003}

离线表单草稿有 `Date`、`Map`、Symbol 属性、两个字段共享同一个子对象，草稿本身还存在 `draft.self = draft`。复制后修改副本不可触碰原图，而且 `copy.self === copy`、两个引用仍指向同一副本节点。

`WeakMap` 在递归下行前登记源与副本的身份对应。这个规则也要用于 Date、RegExp 和 ArrayBuffer；否则同一个内建对象出现两次就会被复制成两个对象，共享 buffer 的视图也会断开：

```js
if (seen.has(value)) return seen.get(value);
if (value instanceof Date) {
  const copy = new Date(value.getTime());
  seen.set(value, copy);
  return copy;
}
if (value instanceof RegExp) {
  const copy = new RegExp(value.source, value.flags);
  copy.lastIndex = value.lastIndex;
  seen.set(value, copy);
  return copy;
}
const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
seen.set(value, copy); // 先登记，递归遇到环时才能返回当前副本
for (const key of Reflect.ownKeys(value)) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if ('value' in descriptor) descriptor.value = deepClone(descriptor.value, seen);
  Object.defineProperty(copy, key, descriptor);
}
```

循环先取所有自有键，包含 Symbol，再逐个取属性描述符。数据属性的 `value` 递归复制，访问器描述符原样保留，所以不会执行输入对象的 getter；最后 `defineProperty` 保留可枚举、可写、getter/setter 等属性特征。Map、Set、Date、RegExp、ArrayBuffer 与 typed view 都在递归前进入 `WeakMap`，因此共享的日期、正则和视图 buffer 会保留身份关系；RegExp 也保留 `lastIndex`。JSON stringify/parse 会把日期转字符串、丢掉 Symbol 键并在循环引用时报错。函数和 DOM 节点按原始值返回，不能把它称为任意对象的通用克隆。测试检查循环、共享内建对象和 DataView 字节。

## W004 curry 依据目标元数决定何时调用 {#w004}

`curry((a,b,c)=>a+b+c)(1)(2,3)` 得 `6`。表单校验规则可分步收集字段名、规则和错误文案；一次调用也可以提供多个参数。

闭包保存已经收到的参数，达到 arity 时才调用原函数：

```js
const collect = args => (...next) => {
  const all = [...args, ...next];
  return all.length >= arity ? fn(...all) : collect(all);
};
```

这里采用 `fn.length` 作为默认 arity，默认参数会影响该值，调用者可显式传入。反例是每次只接收一个参数，会拒绝题目允许的 `f(1, 2)` 分组形式。边界测试覆盖零元函数与未收齐时仍返回函数。

## W005 once 先锁门，后做副作用 {#w005}

付款按钮的双击包装器仅允许调用支付适配器一次，并把第一次返回值返回给重复调用者。即使适配器同步抛错，这个 at-most-once 合同也不再重试。

```js
return function (...args) {
  if (called) return result;
  called = true; // 在执行用户代码前设闸，防止同步重入
  result = fn.apply(this, args);
  return result;
};
```

若等到成功后才标记，底层函数在内部再次调用包装器时会递归进入。若业务要求失败后可重试，需要 `idle/running/done` 三态并缓存 Promise，不能偷偷改变此题合同。测试验证 `this`、参数、返回值和抛错后再次调用。

## W006 memoize 参数键必须保留身份 {#w006}

`memoize(findUser)(userObject)` 对同一个对象复用结果，对内容相同但身份不同的对象重新计算；`undefined` 结果也能被缓存。商品筛选可用已规范化的查询对象缓存昂贵本地计算。

逐层 Map 以每个实参为 Map 键，末端另存结果与 `hasValue`：

```js
const root = { children: new Map(), hasValue: false, value: undefined };
return function (...args) {
  let node = root;
  for (const arg of args) {
    if (!node.children.has(arg)) node.children.set(arg, { children: new Map(), hasValue: false, value: undefined });
    node = node.children.get(arg);
  }
  if (node.hasValue) return node.value;
  node.value = fn.apply(this, args); node.hasValue = true; return node.value;
};
```

把参数拼成字符串会把不同对象、Symbol 或 `undefined` 混为一谈；用 `value !== undefined` 判断缓存也无法缓存 `undefined`。本实现保留 `this`，但没有淘汰策略，长生命周期的无界输入集合会增长；测试区分相同对象、不同对象与零参数函数。

## W007 EventBus 一次 emit 使用稳定快照 {#w007}

订单页的 `order:paid` 事件通知角标和埋点。监听者可以在回调中取消自己、注册新监听者；本次 `emit` 仍按开始时的订阅快照执行，新监听从下一次开始。

```js
emit(type, payload) {
  for (const listener of [...(this.#events.get(type) ?? [])]) listener(payload);
}
once(type, listener) {
  let dispose;
  dispose = this.on(type, value => { dispose(); listener(value); });
  return dispose;
}
```

遍历原 Set 时修改集合会令当前发送语义依赖迭代器的细节。`once` 在调用用户回调前移除，因此重入 emit 不会重复触发。当前策略是监听器异常向调用方传播并停止后续调用；测试明确了快照与重入，若产品要隔离错误需另定错误上报接口。

## W008 flatten 显式栈消除递归深度风险 {#w008}

树形菜单的路径层数组 `[1,[2,[3]]]` 全展开成 `[1,2,3]`；深度 `1` 则得到 `[1,2,[3]]`。空数组不产生空元素。

```js
const output = []; const stack = [];
const pushChildren = (array, remaining) => { for (let i = array.length - 1; i >= 0; i--) if (i in array) stack.push({ value: array[i], depth: remaining }); };
pushChildren(input, depth);
while (stack.length) {
  const item = stack.pop();
  if (Array.isArray(item.value) && item.depth > 0) pushChildren(item.value, item.depth - 1);
  else output.push(item.value);
}
return output;
```

LIFO 栈要求逆序压入子项，输出才能与原数组同序；`i in array` 跳过稀疏空槽，和 `Array.prototype.flat` 一致。每个栈项带自己的剩余深度，避免不同分支共享错误深度。递归版本在极深配置数据上可能耗尽调用栈。测试覆盖深度、顺序、稀疏数组和 `null` 等标量。

## 来源与复现

题型范围来自 [BFE.dev 的 LazyMan #130](https://bigfrontend.dev/problem/create-lazyman) 与 [GreatFrontEnd JavaScript 题型指南](https://www.greatfrontend.com/front-end-interview-playbook/javascript)，代码为本仓库独立实现。ECMAScript 对象和 Promise 行为可对照 [ECMAScript 规范](https://tc39.es/ecma262/)；浏览器 API 不在本页验收范围。
