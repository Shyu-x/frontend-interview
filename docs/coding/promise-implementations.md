---
title: 手写 Promise 与异步控制
description: 手写 Promise 及 all、race、allSettled、retry、async/await（Generator + co）和并发控制的完整实现。
tags:
  - coding
  - interview
  - promise
date: 2026-05-17
---

# 手写 Promise 与异步控制

## 1. 手写 Promise

```javascript
// 手写Promise：状态管理 + thenable + 链式调用
class MyPromise {
  static PENDING = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED = 'rejected';

  constructor(executor) {
    this.state = MyPromise.PENDING;
    this.value = undefined;
    this.handlers = []; // [{onFulfilled, onRejected, promise}]

    const resolve = (value) => {
      if (this.state !== MyPromise.PENDING) return;
      if (value instanceof MyPromise) {
        // Promise套Promise：递归解析
        value.then(resolve, reject);
        return;
      }
      this.state = MyPromise.FULFILLED;
      this.value = value;
      this.handlers.forEach(h => h.onFulfilledCallback());
    };

    const reject = (reason) => {
      if (this.state !== MyPromise.PENDING) return;
      this.state = MyPromise.REJECTED;
      this.value = reason;
      this.handlers.forEach(h => h.onRejectedCallback());
    };

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  _addHandler(onFulfilled, onRejected) {
    this.handlers.push({
      onFulfilledCallback: () => this._handleCallback(onFulfilled, true),
      onRejectedCallback: () => this._handleCallback(onRejected, false)
    });
  }

  _handleCallback(callback, isFulfilled) {
    // 异步执行回调（微任务）
    queueMicrotask(() => {
      if (typeof callback !== 'function') {
        // 没有传回调：直接传递value
        if (isFulfilled) this._resolve(this.value);
        else this._reject(this.value);
        return;
      }
      try {
        const result = callback(this.value);
        this._resolve(result);
      } catch (e) {
        this._reject(e);
      }
    });
  }

  _resolve(value) {
    // 处理thenable
    if (value && (typeof value === 'object' || typeof value === 'function')) {
      let called = false;
      try {
        const then = value.then;
        if (typeof then === 'function') {
          then.call(
            value,
            v => { if (called) return; called = true; this._resolve(v); },
            e => { if (called) return; called = true; this._reject(e); }
          );
          return;
        }
      } catch (e) { if (!called) { this._reject(e); return; } }
    }
    // 普通值：状态变为fulfilled
    this.state = MyPromise.FULFILLED;
    this.value = value;
    this.handlers.forEach(h => h.onFulfilledCallback());
  }

  _reject(reason) {
    this.state = MyPromise.REJECTED;
    this.value = reason;
    this.handlers.forEach(h => h.onRejectedCallback());
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handler = {
        onFulfilledCallback: () => {
          if (typeof onFulfilled !== 'function') {
            resolve(this.value); return;
          }
          try {
            const result = onFulfilled(this.value);
            resolve(result);
          } catch (e) { reject(e); }
        },
        onRejectedCallback: () => {
          if (typeof onRejected !== 'function') {
            reject(this.value); return;
          }
          try {
            const result = onRejected(this.value);
            resolve(result);
          } catch (e) { reject(e); }
        }
      };

      if (this.state === MyPromise.PENDING) {
        this.handlers.push(handler);
      } else if (this.state === MyPromise.FULFILLED) {
        queueMicrotask(handler.onFulfilledCallback);
      } else {
        queueMicrotask(handler.onRejectedCallback);
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(fn) {
    return this.then(
      v => { fn(); return v; },
      e => { fn(); throw e; }
    );
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise(r => r(value));
  }

  static reject(reason) {
    return new MyPromise((_, r) => r(reason));
  }
}

// 测试：
const p = new MyPromise((resolve, reject) => {
  setTimeout(() => resolve(1), 100);
});
p.then(v => v + 1).then(v => v * 2).then(console.log); // 4
```

## 2. 手写 Promise.all

```javascript
// Promise.all：全部成功才成功，一个失败整体reject
// 返回值顺序由输入顺序决定（即使完成顺序不同）

function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('promises must be an array'));
    }
    const results = new Array(promises.length);
    let settled = 0; // 已完成数

    promises.forEach((p, i) => {
      // Promise.resolve 处理：可能是值或thenable
      Promise.resolve(p).then(
        value => {
          results[i] = value;
          if (++settled === promises.length) resolve(results);
        },
        reason => reject(reason) // 一个失败立即reject
      );
    });

    if (promises.length === 0) resolve([]);
  });
}

// 测试：
promiseAll([
  Promise.resolve(1),
  new Promise(r => setTimeout(() => r(2), 50)),
  Promise.resolve(3)
]).then(console.log); // [1, 2, 3]

promiseAll([
  Promise.resolve(1),
  Promise.reject('err'),
  Promise.resolve(3)
]).catch(e => console.log('reject:', e)); // reject: err

// 变体：Promise.allSettled（不reject，全部settle）
function promiseAllSettled(promises) {
  return Promise.all(promises.map(p =>
    Promise.resolve(p).then(
      v => ({ status: 'fulfilled', value: v }),
      e => ({ status: 'rejected', reason: e })
    )
  ));
}
```

## 3. 手写 Promise.race

```javascript
// Promise.race：返回最先settle（无论成功或失败）的Promise
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => {
      Promise.resolve(p).then(resolve, reject); // 谁先settle谁决定结果
    });
  });
}

// 测试：
promiseRace([
  new Promise(r => setTimeout(() => r(1), 300)),
  new Promise((_, r) => setTimeout(() => r(2), 100)),
  new Promise(r => setTimeout(() => r(3), 200))
]).then(
  v => console.log('resolved:', v),
  e => console.log('rejected:', e)
); // rejected: 2（第二个先失败）
```

## 4. 手写 Promise.allSettled

```javascript
// Promise.allSettled：等所有Promise settled，不因失败而reject
function promiseAllSettled(promises) {
  return new Promise((resolve) => {
    const results = new Array(promises.length);
    let settled = 0;

    if (promises.length === 0) { resolve([]); return; }

    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        value => { results[i] = { status: 'fulfilled', value }; onSettled(); },
        reason => { results[i] = { status: 'rejected', reason }; onSettled(); }
      );
    });

    function onSettled() {
      if (++settled === promises.length) resolve(results);
    }
  });
}

// 测试：
promiseAllSettled([
  Promise.resolve(1),
  Promise.reject('error'),
  new Promise((_, r) => setTimeout(() => r('late'), 100))
]).then(results => results.forEach(r => {
  if (r.status === 'fulfilled') console.log('ok:', r.value);
  else console.log('err:', r.reason);
}));
// ok: 1
// err: error
// err: late
```

## 5. 手写 Promise.retry

```javascript
// Promise.retry：失败后自动重试（可配置次数和间隔）
function promiseRetry(fn, { retries = 3, delay = 1000, backoff = 1 } = {}) {
  return new Promise(async (resolve, reject) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return resolve(await fn());
      } catch (e) {
        lastError = e;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, delay * Math.pow(backoff, attempt)));
        }
      }
    }
    reject(lastError);
  });
}

// 测试：
let count = 0;
promiseRetry(
  () => new Promise((_, reject) => {
    count++;
    if (count < 3) reject(new Error('fail'));
    else resolve('success');
  }),
  { retries: 3, delay: 100 }
).then(console.log, e => console.log('final error:', e));
// 打印：success（重试3次后成功）

// 变体：带指数退避（exponential backoff）
// delay * 2^attempt：1s, 2s, 4s...
// 可选加随机抖动（jitter）避免惊群效应
function retryWithBackoff(fn, { maxRetries = 5, baseDelay = 1000 } = {}) {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i <= maxRetries; i++) {
      try { return resolve(await fn()); }
      catch (e) {
        if (i === maxRetries) return reject(e);
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 100;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  });
}
```

## 6. 手写 async/await（Generator + co）

```javascript
// async是Generator的语法糖，本质相同
// 手写co函数：自动执行Generator直到完成

function co(gen) {
  return new Promise((resolve, reject) => {
    if (typeof gen === 'function') gen = gen();
    if (!gen || typeof gen.next !== 'function') return resolve(gen);

    onFulfilled();

    function onFulfilled(val) {
      let result;
      try { result = gen.next(val); }
      catch (e) { return reject(e); }
      next(result);
    }

    function onRejected(err) {
      let result;
      try { result = gen.throw(err); }
      catch (e) { return reject(e); }
      next(result);
    }

    function next({ value, done }) {
      if (done) return resolve(value);
      Promise.resolve(value).then(onFulfilled, onRejected);
    }
  });
}

// 测试：
function* gen() {
  const a = yield Promise.resolve(1);
  const b = yield Promise.resolve(a + 10);
  const c = yield Promise.resolve(b + 100);
  return c;
}
co(gen).then(v => console.log(v)); // 111

// 实际用法（模拟async）：
function asyncToGenerator(generatorFn) {
  return function(...args) {
    const gen = generatorFn.apply(this, args);
    return co(gen);
  };
}

// 手写async函数（模拟简化）：
function myAsync(fn) {
  return function(...args) {
    const gen = fn.apply(this, args);
    return co(gen);
  };
}
```

## 7. 手写并发控制（限制并发数）

```javascript
// 手写并发控制：限制同时运行的Promise数量
// 也叫"Promise池"

class PromisePool {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  // 添加任务到池
  add(taskFn) {
    return new Promise((resolve, reject) => {
      const task = () => {
        this.running++;
        Promise.resolve()
          .then(() => taskFn())
          .then(resolve, reject)
          .finally(() => {
            this.running--;
            this.next();
          });
      };

      if (this.running < this.maxConcurrent) {
        task();
      } else {
        this.queue.push(task);
      }
    });
  }

  // 取出下一个任务
  next() {
    if (this.queue.length > 0) {
      this.queue.shift()();
    }
  }

  // 当前运行中的任务数
  get size() { return this.running; }
}

// 简化版（一次性提交批量任务）：
function limitConcurrency(tasks, max) {
  return new Promise((resolve, reject) => {
    let running = 0;
    let index = 0;
    const results = new Array(tasks.length);
    const len = tasks.length;

    function runTask(i) {
      running++;
      tasks[i]()
        .then(val => { results[i] = { success: true, value: val }; })
        .catch(err => { results[i] = { success: false, reason: err }; })
        .finally(() => {
          running--;
          if (index < len) runTask(index++);
          else if (running === 0) resolve(results);
        });
    }

    // 启动初始任务
    while (running < max && index < len) {
      runTask(index++);
    }
  });
}

// 测试：
const tasks = Array.from({ length: 10 }, (_, i) => () =>
  new Promise(r => setTimeout(() => { console.log(`task ${i} done`); r(i); }, Math.random() * 1000))
);

limitConcurrency(tasks, 3).then(results => {
  console.log('全部完成', results.map(r => r.value));
});
// 最多同时运行3个任务
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Promises/A+ 规范](https://promisesaplus.com/) | Promise/A+ 规范是手写实现的验收标准，明确 then 的全部行为约束。 | 逐条对照 2.1-2.3 节实现，重点读状态转换与 then 返回规则，用 promises-aplus-tests 跑通。 |
| [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) | MDN Promise 页总览构造器、状态与静态方法，是查漏补缺的权威入口。 | 先读链式调用与状态小节，写完后回来核对每个 API 的行为约定，补上遗漏方法。 |
| [Promise.prototype.then()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) | then 是手写 Promise 的核心难点，返回值与 thenable 处理都在这。 | 重点读返回值与 thenable 两段，实现后专门测 then 返回 Promise 时的展开逻辑。 |
| [Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) | 手写 all 前需明确计数、顺序、失败即拒三个聚合语义要点。 | 读参数可迭代与失败即拒两节，实现后用空数组和含拒绝项的用例验证。 |
| [Promise.race()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race) | race 的“第一个 settled 即定局”语义简单但易错，需精确对照。 | 读返回值与描述部分，注意落败 Promise 仍会执行，顺势写一个超时封装练习。 |
| [Promise.allSettled()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) | allSettled 的不拒绝语义与结果对象结构是手写时的对照标准。 | 读返回对象 status/value/reason 说明，实现后与 Promise.all 对比失败行为差异。 |
| [Promise.withResolvers()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers) | withResolvers 提供 retry 与并发池所需的 deferred 模式，避免构造器陷阱。 | 读其用法示例，用它重构实现中把 resolve/reject 外提的写法，简化计时器与队列逻辑。 |
| [async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) | async function 的语法与返回值包装规则是手写 async/await 的等价目标。 | 重点读返回值与异常如何转成 Promise，把这两条作为实现 co 自动执行器的行为基准。 |
| [Generator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator) | Generator 是手写 async/await 的执行引擎，next/throw 协议是核心。 | 读 next、throw、return 三方法，先写驱动生成器的执行器，再让 yield 的值按 Promise 处理。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [BigFrontEnd.dev 题目列表](https://bigfrontend.dev/problem) | 练习题库提供 Promise 实现题与并发控制题，能检验手写完整度。 | 筛 Promise 标签挑 5 题（含并发控制），先自己写再对照社区答案查漏。 |
| [JS Visualizer 9000](https://www.jsv9000.app/) | 可视化执行顺序，直观看到 then 回调在微任务中排队与出队的时机。 | 跑一段含 Promise 与 setTimeout 的代码，逐步执行并记录微任务队列的变化。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [现代 JavaScript 教程：异步](https://zh.javascript.info/async) | 从回调到 async/await 的系统讲解与练习，适合先建立异步模型。 | 做完 Promise 与 async/await 章节练习，再把习题里的链式调用改写成自己的实现。 |
| [MDN 使用 Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) | 链式与错误处理两节讲清使用侧心智模型，可直接反推实现要点。 | 读完这两节，把一段回调地狱改成 async/await，再对照自己的实现单步调试。 |
| [MDN 事件循环](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) | 事件循环是判断手写实现微任务时机是否正确的底层依据。 | 读微任务队列一节，画出 Promise.then 与 setTimeout 的先后顺序并写代码验证。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格导出补全 | 手写并发控制、Promise.allSettled、Promise.retry | 自写队列或 p-limit | 后端已有批量接口时优先走服务端 |
| 低端安卓首屏加载非关键接口 | Promise.all、Promise.allSettled、并发控制 | 原生 Promise 加自写 runWithLimit | 非关键接口失败必须可以降级 |
| 多人协作白板断网恢复后的操作同步 | 手写 Promise.retry、串行队列 | 自写串行队列或 async.queue | 必须保序，否则操作乱序 |
| 电商商品详情页多个下游源聚合 | Promise.allSettled | 原生 Promise.allSettled | 单个源失败时页面要有降级值 |
| 文件分片上传 | 并发控制、Promise.retry | 自写池或 p-limit | 分片完成后需按序合并 |
| 搜索框联想词的竞态处理 | 手写 Promise、Promise.race | AbortController 加 race 或自写标记 | 旧请求晚到必须丢弃 |
| 灰度发布配置拉取 | Promise.all、Promise.allSettled | fetch 加 Promise 静态方法 | 关键配置缺失要阻断，非关键缺失只告警 |
| Node 服务端预取多个模板数据 | 手写 async/await（Generator + co） | 自写 co 或生成器执行器 | 注意错误栈和 catch 位置 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格批量补全

**业务背景**：后台管理报表页要导出约一万行客户数据，每行实时请求风控接口补充状态。风控接口每秒限流 10 次，无并发控制会同时发起近万请求，触发 HTTP 429 并占满浏览器连接池。

**怎么用本页知识解决**：思路是先把每行请求包装成惰性任务，用并发控制器保持最多 5 个在途；用 `Promise.allSettled` 分别收集成功和失败；失败项用 `promiseRetry` 重试一次。

```js
const tasks = rows.map(row => () =>                    // 惰性任务：调用时才发起请求
  fetch(`/api/risk/${row.id}`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)     // 非 2xx 转成 reject
    return r.json()
  })
)

const settled = await pAllSettled(tasks, 5)            // 并发 5，单条失败不中断
const retried = await pAllSettled(settled.map((s, i) => 
  s.status === 'rejected'                              // 只重试 rejected 项
    ? () => pRetry(tasks[i], { times: 1, backoff: 300 })
    : async () => s.value
), 5)
```

- `rows.map` 只创建函数，不触发请求，避免执行到这一行就占满连接池。
- `pAllSettled(tasks, 5)` 保证任意时刻最多 5 个请求在途，匹配后端限流余量。
- 状态收集让一次导出不会因为单条 500 而中断。
- 第二次 `pAllSettled` 只调度 rejected 项，避免重复请求成功项。
- `backoff: 300` 给后端 300ms 恢复窗口；实际数值按后端限流响应头调整。

**怎么度量收益**：

- 浏览器 DevTools Network 面板筛选 `/api/risk/`，记录并发连接数或瀑布图面积；限流后应稳定在 5。
- Chrome DevTools Performance 录制从点击导出到表格完成时间，限流前后各录 5 次，比较 P95。
- 后端网关日志统计 429 响应个数；应从近万降到接近 0。

**什么时候不该用**：

- 后端已提供批量风控接口时，前端逐条请求会放大延迟和请求数。
- 用户导出频率低且单批不超过 50 行，接口也没有 429 时，加并发控制只会增加队列维护成本。
- 导出任务耗时超过 1 分钟时，应改后端异步导出任务，不用浏览器端长任务。

#### 场景 2：低端安卓首屏加载非关键接口

**业务背景**：首屏要取用户信息、AB 实验、公告、广告位、配置、权益共 8 个接口。低端安卓机同时发起 8 个请求会与首屏渲染争抢连接，慢接口可能拖住可交互时间。

**怎么用本页知识解决**：思路是把接口分成关键 2 个和非关键 6 个。关键接口用 `Promise.all`，失败即阻断；非关键用 `pAllSettled` 且并发 2，失败降级。

```js
const critical = await Promise.all([
  fetch('/api/user').then(r => r.json()),              // 关键：用户信息
  fetch('/api/ab').then(r => r.json())                 // 关键：AB 实验
])

const nonCritical = await pAllSettled([
  () => fetch('/api/notice').then(r => r.json()),      // 公告
  () => fetch('/api/ads').then(r => r.json()),         // 广告位
  () => fetch('/api/config').then(r => r.json()),      // 配置
  () => fetch('/api/benefit').then(r => r.json())      // 权益
], 2)                                                 // 非关键最多 2 个并发

const failed = nonCritical.filter(s => s.status === 'rejected')
reportDegraded(failed.map(s => s.reason))              // 失败只上报，不阻断
```

- `Promise.all` 只放关键接口，失败会传回调用方，首屏显示错误页。
- 非关键接口并发限制为 2，减少低端设备上的连接和主线程竞争。
- `pAllSettled` 让公告失败不影响广告位和权益结果。
- `reportDegraded` 记录降级原因，便于上线后排查。
- 合并为 `critical` 和 `nonCritical` 两个分支，首屏先拿关键数据，非关键完成后再触发局部更新。

**怎么度量收益**：

- Chrome DevTools Performance 选择 CPU 4x slowdown 录制首屏；看 Long Tasks 数量和 TTI。
- Network 面板按接口分组，记录非关键接口并发数不超过 2，以及完成时间是否晚于首次内容绘制。
- 发布前在低端机上跑 Lighthouse，对比改动前后的 First Contentful Paint 和 Total Blocking Time。

**什么时候不该用**：

- 公告、广告位、权益任一失败都会影响主流程时，不能把它们划为非关键。
- 弱网下浏览器默认 6 连接并发可能比排队快，需要按实际网络录 5 组对照后再决定是否限制为 2。
- 接口都走 HTTP/2 时，连接数竞争比 HTTP/1.1 小，优先看响应优先级而不是硬性并发。

#### 场景 3：多人协作白板断网恢复后的操作同步

**业务背景**：多人协作白板在断网期间本地积压约 200 个操作。恢复后这 200 个操作如果同时发送，后端会乱序接收，画面出现跳变和覆盖。

**怎么用本页知识解决**：思路是用一个串行队列按积压顺序提交；每个操作重试最多 3 次并带退避；连续失败项单独记录，不阻塞后续操作。

```js
const queue = [...offlineOps]
let running = false                                     // 防止重复启动
const failedOps = []                                    // 最终失败项

async function drain() {
  if (running) return
  running = true
  while (queue.length) {
    const op = queue.shift()                            // 取最旧操作，保序
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        await submit(op)
        break                                           // 成功后跳出重试循环
      } catch (e) {
        if (attempt === 3) { failedOps.push({ op, e }); break }
        await new Promise(r => setTimeout(r, 200 * 2 ** attempt))
      }
    }
  }
  running = false
}
```

- `queue.shift()` 每次取最早操作，避免恢复后的版本顺序错乱。
- `running` 标志让 `drain` 只启动一次，防止外部多次调用产生两个队列消费器。
- 每个操作独立重试，不会重复发送已经成功的后续操作。
- 重试退避为 200ms、400ms、800ms，给后端恢复时间，避免一次失败就打满重试。
- 连续失败项被放入 `failedOps`，不阻塞后续操作，也不丢失问题现场。

**怎么度量收益**：

- 用 Charles 或 mitmproxy 设置每 10 个 POST 返回 2 次 500，观察最终同步成功率和失败项重试次数。
- Network 面板按开始时间排序，检查 `/api/ops` 请求顺序必须与 `offlineOps` 输入顺序一致。
- 白板测试用两条客户端离线 30 秒后同时恢复，回放操作日志，记录“乱序”“版本跳变”出现次数。

**什么时候不该用**：

- 后端提供批量应用操作接口时，串行队列会放大延迟，应一次批量提交。
- 操作之间依赖同一对象版本号，服务端需要做冲突合并时，返回重放可能覆盖他人的合法改动。
- 恢复积压超过 2000 条且单条平均耗时超过 50ms 时，仅靠前端串行重试会超过用户可接受同步时间。

### 行业先进实践

- `Promise.withResolvers()`（出处：MDN Web Docs《Promise.withResolvers()》） 它把 resolve、reject 从 executor 中拆出，适合在队列或取消控制器里手动结束 Promise。这样做可避免为了拿到 resolve/reject 而把不相关的初始化逻辑塞进 executor。
- `p-limit`（出处：sindresorhus/p-limit GitHub） 用队列加活动计数控制 Promise 并发，API 只暴露一个 `limit`。你的项目可以直接复用它的行为，或对照实现自己的 `pAllSettled`。
- `bluebird` 的 `Promise.map`（出处：Bluebird API Reference） 在单次批量调用里提供 `concurrency` 参数。它能减少“先 map 成 Promise 再写队列”这段重复代码。
- V8 官方博客《Faster async functions and promises》（出处：V8 官方博客） 记录 V8 对 async/await 和 Promise 微任务调度优化。阅读后你会知道不要用旧版表现的截图判断新版浏览器，关键路径必须用当前运行时做基准。
- `async` 库的 `eachLimit` 与 `queue`（出处：caolan/async GitHub） 是回调时代的并发控制常用实现。迁移旧代码时可以先识别 `eachLimit`，再替换成 Promise 版本。
- `no-async-promise-executor`（出处：ESLint 官方规则文档） 禁止 `new Promise(async (resolve) => ...)` 这种写法。这样可避免异步 executor 吞掉 reject 与资源泄漏。

### 从学到用：落地路线

1. 第一步：在一个非主流程页面做试点，例如运营后台的批量状态补全，使用 `pAllSettled` 和并发控制。验收：该页面导出任务的总请求数不变，429 响应数归零。
2. 第二步：用 DevTools Performance 对同一批任务录制限流前后各 5 次，比较 P95 完成时间。验收：P95 完成时间下降，最大在途请求数稳定在预设值。
3. 第三步：把 `pAllSettled`、`pRetry`、`runWithLimit` 封装成 `async-utils`，评审要求批量请求必须声明并发上限。验收：代码评审中新增批量请求不带 `limit` 不能合入。
4. 第四步：加入 ESLint 规则 `no-async-promise-executor`，并在 CI 执行异步单元测试。验收：当提交里出现无重试的裸 `Promise.all` 大批量请求，CI 用例失败。

### 动手作业

目标：做一个“保序分片上传调度器”：把 100 个分片按顺序上传，最多 3 个在途，单分片失败重试 2 次；收到取消信号后不再发起新上传。

步骤：

1. 写 `promiseRetry(fn, times, shouldRetry)`；失败时等待 `200 * attempt` ms 后重试。
2. 写 `limitQueue(list, limit, worker)`；维护 `active` 与 `queue`，每个任务结束后补下一个。
3. 把 100 个分片包装成惰性函数，任务内调用 `promiseRetry` 上传同一分片。
4. 增加取消标志；调度前检查，已取消时把剩余任务标记为 `canceled`。
5. 用 `Promise.allSettled` 汇总 100 个结果，输出 `fulfilled`、`rejected`、`canceled` 计数。
6. 写测试：成功、失败后重试成功、连续失败、取消后无新请求、最大并发为 3、完成顺序一致，共 6 条。
7. 用 Chrome DevTools Performance 对比 `limit` 为 3 与不限制时的完成时间，把结果写进 README。

验收标准：

- 任意时刻上传接口的 Network 并发数不超过 3。
- 单分片失败 1 次后自动重试，失败 3 次标记为 `rejected`。
- 取消后不再发起任何新请求，剩余任务标记为 `canceled`。
- 完成结果顺序与输入分片顺序一致。
- 6 条测试全部通过，README 里有限流与不限流完成的同机测量结果。

