---
title: 函数式编程
description: 讲解纯函数、柯里化、函数组合、不可变数据等函数式编程核心概念及其 JavaScript 实现。
tags:
  - javascript
  - functional
date: 2026-05-17
---

# 函数式编程

## 1. 概念

```javascript
// 纯函数：给定相同输入，总是返回相同输出，无副作用
// 副作用：修改外部状态（修改参数、I/O、网络请求、DOM操作、console）

// 副作用示例：
let total = 0;
function add(n) { total += n; return total; } // 修改外部变量， impure
function addPure(n) { return total + n; }    // 不修改外部，pure
// 建议：纯函数更容易测试和推理

// Immutable：永远不修改原数据
const arr = [1, 2, 3];
const newArr = [...arr, 4]; // 不修改arr，返回新数组
// Immutable.js：结构共享的持久数据结构
import { List, Map } from 'immutable';
const list = List([1, 2, 3]);
const newList = list.push(4); // 原list不变，newList是新引用
// 原理：只记录变化路径，不复制整个结构（结构共享）
```

## 2. 柯里化

```javascript
// 柯里化：把多参数函数转为一系列单参数函数
function add(a, b, c) { return a + b + c; }
function currying(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function(...args2) {
      return curried.apply(this, args.concat(args2));
    };
  };
}
const curriedAdd = currying(add);
console.log(curriedAdd(1)(2)(3));   // 6
console.log(curriedAdd(1, 2)(3));   // 6
console.log(curriedAdd(1, 2, 3));   // 6

// 实际应用：参数复用 + 延迟执行
const log = currying((level, message) => console.log(`[${level}] ${message}`));
const infoLog = log('INFO');
infoLog('系统启动');   // [INFO] 系统启动
infoLog('用户登录');   // [INFO] 用户登录
```

## 3. 高阶函数与 compose

```javascript
// 高阶函数：接受函数或返回函数的函数
// 常见：map, filter, reduce, forEach, sort, some, every, find

// compose：组合多个函数，从右到左执行
// f(g(h(x))) = compose(f, g, h)(x)
function compose(...fns) {
  if (fns.length === 0) return x => x;
  if (fns.length === 1) return fns[0];
  return fns.reduceRight((f, g) => (...args) => f(g(...args)));
}

// pipe：compose的变种，从左到右执行
function pipe(...fns) {
  if (fns.length === 0) return x => x;
  if (fns.length === 1) return fns[0];
  return fns.reduce((f, g) => (...args) => g(f(...args)));
}

// 示例：数据处理管道
const processUser = pipe(
  validateInput,           // 1. 验证输入
  normalizeData,           // 2. 规范化数据
  removeDuplicates,       // 3. 去重
  enrichWithMeta,          // 4. 补充元信息
  formatOutput             // 5. 格式化输出
);

// trace：调试compose中间结果
const trace = label => x => { console.log(`${label}:`, x); return x; };
const debug = pipe(
  trace('输入'),
  double,
  trace('翻倍后'),
  addOne,
  trace('加一后')
);

// reduce实现map：
const myMap = (fn, arr) => arr.reduce((acc, x) => [...acc, fn(x)], []);
// filter基于reduce：
const myFilter = (pred, arr) => arr.reduce((acc, x) => pred(x) ? [...acc, x] : acc, []);
```

## 4. RxJS 简介

```javascript
// RxJS：响应式编程库，基于Observable + 操作符
// 核心：把异步事件流当成值来处理

// 常用创建操作符：
import { of, from, interval, fromEvent } from 'rxjs';

// Observable：可观察对象（生产者）
// Observer：观察者（消费者）
// Subscription：订阅关系

// 操作符：
// map, filter, debounceTime, switchMap, mergeMap, take, takeUntil, distinctUntilChanged, scan, reduce

// 示例：搜索防抖
fromEvent(searchInput, 'input').pipe(
  debounceTime(300),
  map(e => e.target.value),
  distinctUntilChanged(),
  switchMap(query => ajax(`/search?q=${query}`)) // 取消之前的请求
).subscribe(results => render(results));

// 为什么switchMap能取消前一个？
// switchMap内部会unsubscribe前一个Observable，再subscribe新的
// 实现：每次新值来时，调用innerObservable.subscribe()
// 管理innerSubscription，如果新值来就unsubscribe旧的
```
