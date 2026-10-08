---
title: "Promise 与异步：MDN 精读与手写"
description: "using_promises 指南、Promise 静态方法与组合器的精读"
---

# Promise 与异步：MDN 精读与手写

!!! abstract "核心结论"
    - Promise 是异步操作最终完成或失败的对象；三态为 pending、fulfilled、rejected，settled 是 fulfilled 或 rejected 的统称。
    - then 永远返回新 promise：返回值决定新 promise 状态；thenable 会被“解锁”并采用其 settle 结果；非 thenable 直接 fulfill；throw 则 reject；缺省 handler 会透传值或 reason。
    - catch 本质是 then(null, onRejected)；错误会沿链向下寻找 catch，catch 之后仍可继续 then。
    - 回调永远在 microtask（job queue）中执行，先于 macrotask；已 settle 的 promise 上注册回调同样异步执行。
    - Promise.all/allSettled/any/race 是组合器，语义差异在于“何时 fulfill、何时 reject”；真正并行要 worker，主线程只是单线程并发交错调度。

## 1. Promise 状态机与 settle 语义

### 1.1 pending、fulfilled、rejected

Promise 是未来值的代理。一个 Promise 只能处于以下三种状态之一：

| 状态 | 含义 | 可转移状态 | 是否 settled |
|---|---|---|---|
| pending | 初始状态，尚未完成或失败 | fulfilled / rejected | 否 |
| fulfilled | 操作成功完成，带有 value | 不可转移 | 是 |
| rejected | 操作失败，带有 reason（通常是 error） | 不可转移 | 是 |

状态转移是单向、不可逆的。fulfilled 与 rejected 统称 settled。没有公开 API 能直接读取原生 Promise 的 state，state 是内部槽位，面试中要强调“状态只能通过 then/catch 的注册行为观察”。

### 1.2 resolved 不等同于 fulfilled

MDN 原文特别指出，resolved 表示 promise 已经“锁定”到某个结果的最终状态，或锁定到另一个 promise 的状态。resolved promise 仍可能 pending 或 rejected。

```js
// 运行环境：Node.js 18+ 或现代浏览器
// 这段代码要解决什么：演示“已 resolved 但不是 fulfilled”的语义。
const outer = new Promise((resolveOuter) => {
  // 第 1 段：同步调用 resolveOuter，但它接收的是另一个 promise。
  // 此时 outer 已经是 resolved，但它要跟随 inner 的最终状态。
  resolveOuter(
    new Promise((resolveInner) => {
      // 第 2 段：inner 一秒后才 fulfill，因此 outer 暂时 pending。
      setTimeout(resolveInner, 1000);
    }),
  );
});

outer.then((value) => {
  console.log("outer fulfilled with:", value);
});
```

解析：

1. executor 同步执行，`resolveOuter(innerPromise)` 同步调用。
2. outer 已 resolved，但尚未 fulfilled，因为它被“解锁”为 inner 的最终状态。
3. 一秒后 inner fulfill，outer 才 fulfill。
4. 这解释了为什么面试中“resolved 与 fulfilled 口语上常混用，但规范上不是一回事”。

## 2. then 链返回值规则与微任务时序

### 2.1 then 返回新 promise 的四条规则

`then()` 不是修改原 promise，而是返回一个新的 promise。新 promise 的 settle 结果由 handler 的执行结果决定：

| handler 返回 | 新 promise 状态 |
|---|---|
| 返回 thenable（含 Promise） | 采用该 thenable 的最终 settle 状态与值 |
| 返回非 thenable | fulfilled，值为该返回值 |
| 抛出异常 | rejected，reason 为该异常 |
| 未提供对应 handler | 与原 promise 透传相同的状态、value 或 reason |

关键点：如果 rejection handler 正常 return 一个值，新 promise 会从 rejected 恢复为 fulfilled。这就是“catch 之后可以继续业务链”的底层原因。

### 2.2 返回值规则验证

```js
// 运行环境：Node.js 18+，node:assert/strict 可用
// 这段代码要解决什么：验证 then 返回非 thenable、返回 thenable、抛出异常三种路径。
const assert = require("node:assert/strict");

(async () => {
  // 第 1 段：非 thenable 返回值直接 fulfill，下游收到拼接后的字符串。
  const p1 = Promise.resolve("a").then((v) => v + "b");

  // 第 2 段：返回一个 thenable，新 promise 会采用 thenable 的结果。
  const p2 = p1.then((v) => ({
    then(resolve) {
      resolve(v + "c");
    },
  }));

  // 第 3 段：if 触发 throw，新 promise reject，且中断后续同步语句。
  const p3 = p2
    .then((v) => {
      if (v === "abc") {
        throw new Error("reject at abc");
      }
      return v;
    })
    .catch((error) => `recovered:${error.message}`);

  assert.strictEqual(await p3, "recovered:reject at abc");
  console.log("PASS: then return value rules");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**验证标准（预期输出）**

`PASS: then return value rules`

逐段解析：

1. `v => v + "b"` 返回字符串，新 promise fulfill，下游得到 `"ab"`。
2. 返回对象存在 `then` 函数，即使它是同步调用 resolve，也是 thenable。新 promise 采用 `resolve("abc")` 的值。
3. handler 抛错后，执行流跳过 `return v`，进入 `.catch`；catch 返回字符串，最终 promise fulfill，而不是保持 rejected。
4. 这就是 catch restore 语义：catch handler 不抛错，链会恢复 fulfilled。

### 2.3 微任务时序：job queue

Promise 回调不会在当前同步栈中立即执行。每次 settle 或对已 settle promise 注册 handler，都会把任务追加到 job queue（microtask queue）尾部。Node.js 与浏览器环境下，这发生在 macrotask 之前。

```js
// 运行环境：Node.js 18+
// 这段代码要解决什么：验证已 settle promise 的 then 回调仍异步执行，并验证 microtask 顺序。
const assert = require("node:assert/strict");

(async () => {
  const order = [];
  const settled = new Promise((resolve) => resolve(777));

  // 第 1 段：settled 已经 fulfilled，回调仍进入 microtask 队列。
  settled.then((value) => {
    order.push(`then:${value}`);
  });

  // 第 2 段：这个 microtask 排在 then 回调之后。
  queueMicrotask(() => {
    order.push("queueMicrotask");
  });

  // 第 3 段：同步代码立即执行，一定排在最前。
  order.push("sync");

  // 第 4 段：等待一个 macrotask，确保所有已有 microtask 完成。
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.deepStrictEqual(order, ["sync", "then:777", "queueMicrotask"]);
  console.log("PASS: microtask order sync -> promise then -> queueMicrotask");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**验证标准（预期输出）**

`PASS: microtask order sync -> promise then -> queueMicrotask`

逐段解析：

1. `settled.then(...)` 在 promise 已 settle 后仍不会同步调用，而是把任务加入 job queue。
2. microtask 队列按注册先后执行，所以 `then:777` 先于 `queueMicrotask`。
3. 同步 `order.push("sync")` 先完成，所以最终顺序为 sync -> then -> queueMicrotask。
4. 这个测试也解释了为什么所有 promise 回调都至少一个 loop-tick 后执行。

## 3. 错误传播与 catch 位置

### 3.1 catch 是 then(null, onRejected)

被 reject 的 promise 会沿链向下寻找最近的 rejection handler。如果中间 then 没有第二参数，该 rejection 不会被吞掉，而会继续穿透。

```js
// 运行环境：Node.js 18+
// 这段代码要解决什么：验证抛错中断当前 handler，catch 恢复后仍可继续 then。
const assert = require("node:assert/strict");

(async () => {
  const output = [];

  await Promise.resolve()
    .then(() => {
      throw new Error("Something failed");
      output.push("Do this");
    })
    .catch(() => {
      output.push("Do that");
    })
    .then(() => {
      output.push("Do this, no matter what happened before");
    });

  assert.deepStrictEqual(output, [
    "Do that",
    "Do this, no matter what happened before",
  ]);
  console.log("PASS: catch position and recovery");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**验证标准（预期输出）**

`PASS: catch position and recovery`

逐段解析：

1. `throw` 会阻止 `output.push("Do this")` 执行，这正是同步 try/catch 的异步对称。
2. 下游 `.catch` 捕获到 rejection，输出 `"Do that"`。
3. catch 正常 return `undefined`，所以后续 `.then` 继续执行。
4. 如果 catch 本身抛错，下一个没有 rejection handler 的 then 会继续向下透传。

### 3.2 嵌套 catch 只捕获内层范围

嵌套 then 是控制 catch 作用域的机制，不是简单的缩进问题。内层 catch 只处理内层链的 rejection，外层致命错误不会被内层 catch 吞掉。

```js
// 运行环境：Node.js 18+
// 这段代码要解决什么：验证内层 catch 与外层 catch 的作用域边界。
const assert = require("node:assert/strict");

(async () => {
  // 第 1 段：外层直接拒绝，证明 critical 错误不会被内层 catch 吞掉。
  const criticalLog = [];
  await Promise.reject(new Error("critical"))
    .then((result) =>
      Promise.reject(new Error("optional"))
        .then(() => criticalLog.push("optional ok"))
        .catch(() => criticalLog.push("inner catch")),
    )
    .then(() => criticalLog.push("after inner"))
    .catch((error) => criticalLog.push(`outer catch:${error.message}`));

  assert.deepStrictEqual(criticalLog, ["outer catch:critical"]);

  // 第 2 段：外层成功，可选步骤失败，内层 catch 恢复后继续外链。
  const optionalLog = [];
  await Promise.resolve("ok")
    .then((result) =>
      Promise.reject(new Error("optional"))
        .then(() => optionalLog.push("optional ok"))
        .catch(() => optionalLog.push("inner catch")),
    )
    .then(() => optionalLog.push("after inner"))
    .catch((error) => optionalLog.push(`outer catch:${error.message}`));

  assert.deepStrictEqual(optionalLog, ["inner catch", "after inner"]);
  console.log("PASS: nested catch scope");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**验证标准（预期输出）**

`PASS: nested catch scope`

逐段解析：

1. 第 1 段外层 initial promise 为 rejected，`then` 的成功 handler 不执行，rejection 传到外链 `.catch`，所以内层 catch 不触发。
2. `criticalLog` 只有外部 catch 记录，证明内层 catch 不覆盖外层错误。
3. 第 2 段外层 success 后进入嵌套链，内层 promise 拒绝被内层 catch 捕获并恢复，后续外链 `.then` 继续执行。
4. 这是 MDN 原示例“可选步骤失败不致命”的精确测试化版本。

## 4. 手写 Promise A+ 简化实现

### 4.1 完整代码

下面的实现遵循 Promises/A+ 核心机制：三态不可逆、then 返回新 promise、thenable 递归解锁、回调进入 microtask。运行环境为 Node.js 18+，原生提供 `queueMicrotask`。

```js
// 这段代码要解决什么：实现可用的 Promise 类，覆盖状态管理、then 链、thenable 解锁与异常捕获。
class MyPromise {
  // 第 1 段：构造函数初始化内部状态与回调队列。
  constructor(executor) {
    this.state = "pending";
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => this._resolve(value);
    const reject = (reason) => this._reject(reason);

    // 第 2 段：executor 抛错时自动 reject，避免同步异常逃逸。
    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  // 第 3 段：核心 resolution procedure，处理 thenable 与自解析。
  _resolve(value) {
    if (this.state !== "pending") return;

    if (value === this) {
      this._reject(new TypeError("Self resolution"));
      return;
    }

    if (
      value !== null &&
      (typeof value === "object" || typeof value === "function")
    ) {
      let called = false;

      try {
        const then = value.then;

        if (typeof then === "function") {
          then.call(
            value,
            (nextValue) => {
              if (called) return;
              called = true;
              this._resolve(nextValue);
            },
            (nextReason) => {
              if (called) return;
              called = true;
              this._reject(nextReason);
            },
          );
          return;
        }
      } catch (error) {
        if (!called) {
          called = true;
          this._reject(error);
        }
        return;
      }
    }

    this.state = "fulfilled";
    this.value = value;
    this.onFulfilledCallbacks.slice().forEach((fn) => fn());
  }

  _reject(reason) {
    if (this.state !== "pending") return;
    this.state = "rejected";
    this.reason = reason;
    this.onRejectedCallbacks.slice().forEach((fn) => fn());
  }

  // 第 4 段：then 返回新 promise；handler 缺省时做值透传或 reason 抛出。
  then(onFulfilled, onRejected) {
    const fulfilledHandler =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    const rejectedHandler =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          };

    // 第 5 段：promise2 在新 microtask 中运行 handler，并把结果交给 resolvePromise。
    const promise2 = new MyPromise((resolve, reject) => {
      const runFulfilled = () => {
        queueMicrotask(() => {
          try {
            const x = fulfilledHandler(this.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      };

      const runRejected = () => {
        queueMicrotask(() => {
          try {
            const x = rejectedHandler(this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      };

      if (this.state === "fulfilled") {
        runFulfilled();
      } else if (this.state === "rejected") {
        runRejected();
      } else {
        this.onFulfilledCallbacks.push(runFulfilled);
        this.onRejectedCallbacks.push(runRejected);
      }
    });

    return promise2;
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }
}

// 第 6 段：then 内部返回值的 resolution procedure，是 A+ 最关键的一环。
function resolvePromise(promise2, x, resolve, reject) {
  if (promise2 === x) {
    reject(new TypeError("Chaining cycle detected"));
    return;
  }

  let called = false;

  if (x !== null && (typeof x === "object" || typeof x === "function")) {
    try {
      const then = x.then;

      if (typeof then === "function") {
        then.call(
          x,
          (value) => {
            if (called) return;
            called = true;
            resolvePromise(promise2, value, resolve, reject);
          },
          (reason) => {
            if (called) return;
            called = true;
            reject(reason);
          },
        );
      } else {
        resolve(x);
      }
    } catch (error) {
      if (called) return;
      called = true;
      reject(error);
    }
  } else {
    resolve(x);
  }
}
```

逐段解析：

1. `constructor` 中 resolve/reject 用箭头函数绑定 this，避免解构或外部调用时丢失上下文。
2. executor 同步执行，异常被自动捕获并 reject。
3. `_resolve` 先判断 pending 和自解析，再判断 thenable。获取 `then` 可能抛错，因此必须 try/catch。
4. thenable 的 `then` 可能调用多次 resolve/reject，`called` 保证只采纳第一次调用。
5. `then` 注册的 handler 都包在 `queueMicrotask` 中，确保异步执行。
6. `resolvePromise` 是 then 返回新 promise 后，连接 handler 返回值和 promise2 的桥；它递归解锁 thenable。

### 4.2 验证标准

```js
// 运行环境：Node.js 18+
// 这段代码要解决什么：用 node:assert 验证 MyPromise 的关键行为。
const assert = require("node:assert/strict");

const delay = (ms, value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

(async () => {
  // 第 1 段：同步 resolve。
  const p1 = new MyPromise((resolve) => resolve(1));
  assert.strictEqual(await p1, 1);

  // 第 2 段：链式返回值。
  const p2 = new MyPromise((resolve) => resolve(1))
    .then((v) => v + 1)
    .then((v) => v * 2);
  assert.strictEqual(await p2, 4);

  // 第 3 段：catch 后 throw，确保 rejection 沿链传播。
  const p3 = new MyPromise((_, reject) => reject(new Error("boom"))).catch(
    (error) => {
      throw new Error(`caught:${error.message}`);
    },
  );
  await assert.rejects(() => p3, /caught:boom/);

  // 第 4 段：resolve 一个异步 thenable，验证递归解锁。
  const asyncThenable = {
    then(resolve) {
      setTimeout(() => resolve(42), 10);
    },
  };
  assert.strictEqual(await new MyPromise((resolve) => resolve(asyncThenable)), 42);

  // 第 5 段：时序用例，then 回调必须异步执行。
  const order = [];
  const p4 = new MyPromise((resolve) => resolve(1));
  p4.then(() => order.push("then"));
  order.push("sync");
  await delay(30, null);
  assert.deepStrictEqual(order, ["sync", "then"]);

  // 第 6 段：自解析必须 reject TypeError。
  const cyclic = new MyPromise((resolve) => {
    setTimeout(() => resolve(cyclic), 0);
  });
  await assert.rejects(() => cyclic, TypeError);

  console.log("PASS: MyPromise basic/chain/rejection/thenable/order/cycle");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**验证标准（预期输出）**

`PASS: MyPromise basic/chain/rejection/thenable/order/cycle`

## 5. 手写 Promise 组合器

### 5.1 静态方法语义差异表

| 方法 | 触发 fulfill | 触发 reject | 返回内容 | 空 iterable |
|---|---|---|---|---|
| Promise.all | 所有 promise fulfill | 任一 promise reject | fulfillment value 数组，顺序同输入 | fulfill 为 [] |
| Promise.allSettled | 所有 promise settle | 不 reject | [{status, value/reason}]，顺序同输入 | fulfill 为 [] |
| Promise.any | 任一 promise fulfill | 所有 promise reject | 第一个 fulfillment value | 资料截断，面试前需核对 MDN Promise.any 页面 |
| Promise.race | 任一 promise settle | 任一 promise reject | 第一个 settle 的 value 或 reason | 资料截断，面试前需核对 MDN Promise.race 页面 |
| Promise.withResolvers | 外部调用 resolve | 外部调用 reject | { promise, resolve, reject } | 不适用，不接收 iterable |

说明：由于本文所给官方资料在静态方法列表处被截断，Promise.any 与 Promise.race 的空 iterable 行为未完整给出，请以上述“需核对”位置为准，不要在未确认时只凭直觉回答“立即 fulfill”。

### 5.2 allSettled、any、race、withResolvers 手写实现

```js
// 运行环境：Node.js 18+
// 这段代码要解决什么：用原生 Promise 基础设施手写简化组合器，说明各自 settle 条件。
function promiseAllSettled(iterable) {
  // 第 1 段：转为数组，预先分配结果数组，避免竞态下的索引错乱。
  const items = Array.from(iterable);
  const results = new Array(items.length);
  let remaining = items.length;

  return new Promise((resolve) => {
    if (items.length === 0) {
      resolve(results);
      return;
    }

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => {
          results[index] = { status: "fulfilled", value };
          remaining -= 1;
          if (remaining === 0) resolve(results);
        },
        (reason) => {
          results[index] = { status: "rejected", reason };
          remaining -= 1;
          if (remaining === 0) resolve(results);
        },
      );
    });
  });
}

function promiseAny(iterable) {
  const items = Array.from(iterable);

  return new Promise((resolve, reject) => {
    if (items.length === 0) {
      reject(new AggregateError([], "All promises were rejected"));
      return;
    }

    const errors = new Array(items.length);
    let remaining = items.length;

    items.forEach((item, index) => {
      Promise.resolve(item).then(resolve, (reason) => {
        errors[index] = reason;
        remaining -= 1;
        if (remaining === 0) {
          reject(new AggregateError(errors, "All promises were rejected"));
        }
      });
    });
  });
}

function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) {
      Promise.resolve(item).then(resolve, reject);
    }
  });
}

function withResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
```

逐段解析：

1. `promiseAllSettled` 对每个输入分别注册成功与失败 handler，失败只写结果，不触发外层 reject。
2. `promiseAny` 第一次 fulfill 就 resolve；全部 reject 时收集 reasons 并 reject AggregateError。
3. `promiseRace` 不关心后续 settle，每个 promise 都挂 `resolve/reject`，最先触发的决定结果。
4. `withResolvers` 暴露 resolve/reject，适合把 Promise 控制权从 executor 移出。

### 5.3 验证标准

```js
// 运行环境：Node.js 18+
// 这段代码要解决什么：验证组合器的 settle 条件与 withResolvers 行为。
const assert = require("node:assert/strict");

const delayed = (ms, value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

(async () => {
  // 第 1 段：allSettled 同时记录 fulfilled 与 rejected。
  assert.deepStrictEqual(
    await promiseAllSettled([Promise.resolve(1), Promise.reject("x")]),
    [
      { status: "fulfilled", value: 1 },
      { status: "rejected", reason: "x" },
    ],
  );

  // 第 2 段：any 在第一个 fulfill 时成功，忽略之前的 rejection。
  assert.strictEqual(
    await promiseAny([Promise.reject("a"), delayed(20, "ok")]),
    "ok",
  );

  // 第 3 段：any 全部 reject 时回传 AggregateError。
  await assert.rejects(
    () => promiseAny([Promise.reject("a"), Promise.reject("b")]),
    AggregateError,
  );

  // 第 4 段：race 返回第一个 settle 的 value。
  assert.strictEqual(
    await promiseRace([delayed(20, "slow"), delayed(5, "fast")]),
    "fast",
  );

  // 第 5 段：race 遇到第一个 reject 立即失败。
  await assert.rejects(
    () => promiseRace([Promise.reject("boom"), delayed(10, "never")]),
    /boom/,
  );

  // 第 6 段：withResolvers 在 executor 外控制 settle。
  const wr = withResolvers();
  wr.resolve(42);
  assert.strictEqual(await wr.promise, 42);

  console.log("PASS: promiseAllSettled/promiseAny/promiseRace/withResolvers");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**验证标准（预期输出）**

`PASS: promiseAllSettled/promiseAny/promiseRace/withResolvers`

## 6. 常见陷阱

### 6.1 忘记 return 造成 floating promise

MDN 原文把没有 return 的内部 Promise 称为 floating promise。下一个 then 无法追踪它，也无法知道它是否成功。

```js
// 这段代码要解决什么：对比“忘 return”与“正确 return”的行为。
function mockFetch(url) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(`data:${url}`), 20);
  });
}

// 错误写法：内部 promise 未被 return，外部 then 立刻收到 undefined。
Promise.resolve("url")
  .then((url) => {
    mockFetch(url);
  })
  .then((result) => {
    console.log("bad result:", result); // undefined
  });

// 正确写法：把内部 promise return 到链上。
Promise.resolve("url")
  .then((url) => mockFetch(url))
  .then((result) => {
    console.log("good result:", result); // data:url
  });
```

### 6.2 嵌套而不是扁平链

嵌套不是语法错误，但会放大 catch 作用域混乱。如果没有精确捕获可选错误的诉求，应使用扁平链，把错误处理放在末尾。

### 6.3 unhandled rejection 与事件顺序

未被处理的 rejected promise 会冒泡到 host。Web 端触发 `unhandledrejection` 与 `rejectionhandled`；Node.js 触发 `unhandledRejection`，且 Node 默认策略在较新版本下可能导致进程退出。调试时要区分“没有 catch”和“catch 加得晚”。

### 6.4 组合器 handler 不会因提前 settle 被移除

MDN 明确说明，即使 `Promise.race` 已经提前 settle，其他输入 promise 上注册的 handler 也不会移除。反复对同一个 pending promise 调用组合器，会不断累积 handler。若 pending promise 不再需要，应优先考虑通过 AbortController 之类机制取消底层异步操作。

### 6.5 把 resolved 当成 fulfilled

`resolve(pendingPromise)` 会让当前 promise 跟随另一个 pending promise，当前 promise 并不立即 fulfilled。面试中若被问到“何时 fulfilled”，答案应是“跟随的 promise settle 时”。

## 7. 面试题与答题要点

1. Promise 的三种状态分别是什么，settled 与 resolved 有什么区别？

   要点：pending、fulfilled、rejected；settled 是 fulfilled 或 rejected 的并集；resolved 表示锁定最终结果或跟随另一个 promise，resolved promise 仍可能 pending 或 rejected。

2. then 的返回值如何决定下游 promise 状态？

   要点：then 返回新 promise；handler 返回 thenable 时递归解锁；返回非 thenable 时 fulfill；抛异常时 reject；未提供 handler 时透传原状态与值。

3. catch 在链中的位置有什么影响？

   要点：catch 是 then(null, onRejected)；错误沿链向下传播；catch 捕获的是它之前的链；catch 正常返回后，后续 then 可继续执行；嵌套 catch 只处理内层范围。

4. Promise.all、allSettled、any、race 的语义差异是什么？

   要点：all 等待全部 fulfill，任一 reject 立即 reject；allSettled 等待全部 settle，不 reject；any 任一 fulfill 即成功，全部 reject 给 AggregateError；race 第一个 settle 决定结果；返回值形态不同。

5. 为什么对已 fulfilled 的 promise 调用 then，回调仍然不是同步执行？

   要点：规范保证 promise action 异步；settled promise 的回调加入 job queue，至少一个 loop-tick 后才执行；这是为了消除运行时竞态，让调用方在同步代码结束后再处理结果。

6. 手写 Promise 时，为什么 resolve 一个 thenable 需要递归处理？

   要点：thenable 可能是另一个 Promise 实现；需要读取 then 并调用；读取 then 可能抛错；then 可能多次调用，必须用 called 守卫；只有 thenable 最终 settle，外层 promise 才能真正 settle。

7. 什么是 floating promise，为什么它会引发竞态？

   要点：then handler 内创建 promise 但不 return；后续 then 无法追踪它，下一 handler 可能提前执行；结果可能是 undefined 或读取到尚未写入的数据；正确做法是 return 内部 promise。

8. unhandled rejection 是怎么暴露给运行时的？

   要点：Web 端通过 unhandledrejection；Node.js 通过 unhandledRejection；事件携带 promise 与 reason；调试系统可通过全局监听兜底；rejectionhandled 表示迟到的 handler 已补挂。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Promises/A+ 规范](https://promisesaplus.com/) | A+ 规范原文，settle 语义与 then 行为的唯一权威依据。 | 先读术语与 2.1–2.3 节，边读边写实现，最后用 promises-aplus-tests 验证。 |
| [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) | 总览状态机、thenable 解析与静态方法，串联全章概念。 | 重点读状态与微任务段落，对照手写实现核对 resolvePromise 分支。 |
| [Promise() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise) | 讲清 executor 同步执行、resolve/reject 只生效一次。 | 带着“executor 抛错会怎样”读，再写用例验证双重 resolve 无效。 |
| [Promise.prototype.then()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) | then 返回值规则与链式透传的一手说明，含微任务时机。 | 读返回值与链式两节，手推 then 返回 thenable 时的执行顺序。 |
| [Promise.prototype.catch()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch) | catch 等价于 then(undefined, onRejected)，界定错误传播路径。 | 读示例后把 catch 换成 then 第二参，验证能否接住上一步错误。 |
| [Promise.prototype.finally()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally) | finally 不改值只透传，是错误传播与清理的易错点。 | 读返回值一节，实测 finally 内 throw 会覆盖原结果。 |
| [Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) | all 的短路拒绝与结果顺序保证，手写组合器的模板。 | 读返回值与示例，手写一版后对照它如何处理非 Promise 值。 |
| [Promise.allSettled()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) | allSettled 永不拒绝，是错误传播边界的对照组。 | 读返回的对象结构，思考它为何不需要 AggregateError。 |
| [Promise.any()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any) | any 的首个成功语义与全失败时的 AggregateError 路径。 | 读示例后与 race、all 对比，整理一张语义对照表。 |
| [Promise.race()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race) | race 的先行 settle 语义，超时控制场景的常用基础。 | 读示例并手写一版，留意空数组与立即值的差异。 |
| [MDN 事件循环](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) | 事件循环与微任务队列的权威讲解，解释时序疑问。 | 读到微任务检查点，画出 Promise 与 setTimeout 混排的时序图。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [JS Visualizer 9000](https://www.jsv9000.app/) | 可视化单步执行 Promise 与微任务，验证时序推理。 | 粘贴含链式 then 和定时器的代码，单步观察微任务队列变化。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [现代 JavaScript 教程：异步](https://zh.javascript.info/async) | 中文异步教程体系完整，习题多，适合练熟语法与语义。 | 做完回调、Promise、async/await 三章练习，再回看手写实现。 |
| [MDN 使用 Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) | MDN 官方使用指南，链式与错误处理写得实用。 | 读链式与错误处理两节，把一段回调代码改写后对比差异。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格翻页 | then 返回新 promise、错误传播 | fetch + AbortController + 虚拟滚动 | 旧响应后到会覆盖新数据，要按请求编号丢弃 |
| 低端安卓的首屏加载 | Promise.race、Promise.allSettled | fetch + 骨架屏 + Lighthouse 移动端模拟 | 超时只是拒绝，还要真的停在骨架屏 |
| 多人协作白板 | then 链顺序、回调在 microtask 执行 | WebSocket + promise 串行链 | 链会堆积操作，要合并或丢弃过期指令 |
| 表单多字段并行校验 | Promise.all 的 reject 短路 | 前端规则校验 + 后端校验接口 | 一个字段失败整体 reject，要转成字段级提示 |
| 埋点与日志上报 | 缺省 handler 透传值、catch 本质是 then | navigator.sendBeacon + allSettled | 上报失败不得阻塞业务链路 |
| 首屏推荐位与评论区 | allSettled 的局部降级 | 动态 import + 占位骨架 | 单块失败只降级该块，不影响主内容 |
| 支付结果轮询 | 已 settle 的 promise 上注册回调仍异步 | setTimeout + Promise 轮询 | 轮询要设上限与退避，不能无限等 |
| 单页应用统一错误兜底 | catch 位置与错误向下寻找 | window.unhandledrejection + 上报 SDK | 兜底要记录，同时保留控制台输出 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：表格分页加筛选，用户会连点页码和筛选条件，每次点击都发请求。网络慢时旧响应可能后到，表格显示的行和当前页码对不上，用户按错误数据做判断。

**怎么用本页知识解决**：给每次请求编号，响应回来先比对编号，过期就丢弃；同时用 AbortController 主动取消上一次请求，减少无用流量。错误按类型分流，主动取消不进重试提示。

```js
let seq = 0;                            // 最新请求编号，用于丢弃过期响应
let ctrl = null;                        // 当前请求控制器，便于取消上一次
async function loadPage(page) {
  ctrl?.abort();                        // 取消仍在飞行中的上一次分页请求
  ctrl = new AbortController();
  const mine = ++seq;                   // 本次请求的编号
  try {
    const res = await fetch(`/api/rows?page=${page}`, { signal: ctrl.signal });
    if (mine !== seq) return;           // 已有新请求，本次结果不写入表格
    const rows = await res.json();      // 解析也可能失败，放在 try 内
    render(rows);
  } catch (e) {
    if (e.name === 'AbortError') return; // 主动取消不算错误，直接返回
    showRetry(e);                        // 其余错误提示重试
  }
}
```

- abort 会让 fetch 以 AbortError 拒绝，靠 e.name 判断，不要靠 message 文本。
- 编号比对比"取消是否成功"可靠：取消可能发生在响应已到达之后。
- await res.json() 留在 try 内，JSON 解析失败走同一条 catch。
- AbortError 直接 return，不弹重试，否则用户每次连点都会看到报错。

**怎么度量收益**：在 DevTools Network 面板开启节流，连点页码 10 次，记录 canceled 请求数与最终页码是否一致。用 Performance 面板录制交互，看 Interaction to Next Paint 与长任务分布；线上用 RUM 采集页码与渲染行的不一致次数。

**什么时候不该用**：数据只有几十行、翻页不频繁时，取消与编号判断只增加代码量。查询走本地 IndexedDB 且结果立即可得时，不需要取消机制。

#### 场景 2：低端安卓的首屏加载

**业务背景**：低端安卓机在弱网下，关键接口返回慢，白屏时间拉长，用户直接退出。首屏还有推荐位、评论等非关键模块，它们失败会连带整页报错。

**怎么用本页知识解决**：关键请求用 Promise.race 加时间上限，超时就渲染骨架屏；非关键模块用 Promise.allSettled 并发拉取，各自判定成功或失败，单独降级。

```js
// 给任意 promise 加时间上限，先 settle 的结果生效
const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
]);

async function firstScreen() {
  try {
    const data = await withTimeout(loadCritical(), 800); // 关键数据上限 800ms
    renderFirstScreen(data);
  } catch {
    renderSkeleton();      // 超时或失败都先出骨架屏，避免白屏
  }
  // 非关键模块并发拉取，单个失败不拖垮其它模块
  const mods = await Promise.allSettled([loadA(), loadB(), loadC()]);
  mods.forEach((m, i) => m.status === 'fulfilled' && mount(i, m.value));
}
```

- Promise.race 采用第一个 settle 的结果，剩余分支被忽略，不会产生未处理拒绝。
- 超时走 rejected 分支，被 catch 接住，业务流程不中断。
- allSettled 只在入参不可迭代时才拒绝，正常情况永远 fulfill，无需 try。
- 每块模块只看自己的 status，失败就保留占位，不阻塞其它模块。
- 本示例的 setTimeout 未清理，真实项目应在 finally 里 clearTimeout。

**怎么度量收益**：用 Lighthouse 移动端预设（Slow 4G + 4x CPU 节流）连测 5 次，看 Largest Contentful Paint 与 First Contentful Paint 的中位数。线上用 web.dev 定义的 LCP 与 INP 作为核心指标，按机型分桶对比。

**什么时候不该用**：结算页金额这类必须完整数据才能渲染的页面，超时兜底会让用户看到不完整金额。强一致要求的写操作也不能用超时后继续渲染的做法。

#### 场景 3：多人协作白板

**业务背景**：多人同时画线、拖拽图形，本地要立即出效果，服务端要按顺序接收指令。指令乱序到达会让画布状态发散，回滚时又要区分哪些是本地未确认的操作。

**怎么用本页知识解决**：用一条 promise 链当作发送队列，保证指令按点击顺序发出；本地先 draw 做乐观更新，服务端确认后校准，被拒绝就回滚。

```js
let queue = Promise.resolve();            // 串行链尾，保证发送顺序
function send(op) {
  const run = queue.then(() => wsSend(op)); // 本次操作排在链尾之后
  queue = run.catch(() => {});            // 链尾吞掉失败，避免断链
  return run;                             // 返回真实结果给调用方
}
function drawLocal(op) {
  paint(op);                              // 乐观更新，先给即时反馈
  send(op).then(() => confirm(op)).catch(() => rollback(op)); // 失败回滚
}
```

- 前一个操作 settle 之后才发下一个，顺序由微任务调度保证。
- queue 换成 run.catch 后的版本，链尾始终是 fulfilled，一次失败不卡住后续。
- run 本身未捕获，调用方能拿到真实拒绝，用来决定回滚。
- 乐观更新让本地绘制不等网络，确认只做校准，避免画布跳动。
- 链只保证顺序，不保证吞吐，指令量大时要按图形 ID 合并。

**怎么度量收益**：用 performance.mark 和 performance.measure 记录从 paint 到 confirm 的间隔，看分位数。用 Performance 面板录制查看长任务，日志比对服务端收到的指令序号与本地点击序号的乱序次数。

**什么时候不该用**：光标位置、选中框这类可被覆盖的瞬时状态，串行链会引入无谓等待。单人在本地撤销重做时，指令不需要排队。

### 行业先进实践

**用 AbortController 取消过期请求（出处：MDN Web Docs，AbortController 与 AbortSignal）**。它把取消信号作为标准参数传给 fetch，拒绝原因是 name 为 AbortError 的 DOMException。做法有效在于取消发生在网络层，节省连接与解析开销。你的项目可以给搜索框、分页、路由切换三处统一封装带 signal 的请求函数。

**用 Promise.allSettled 做模块级降级（出处：MDN Web Docs，Promise.allSettled）**。它返回每个输入的状态与值，调用方按 status 分支处理。做法有效在于单个失败不会中断其余结果。你的项目可以把首屏各个卡片改成 allSettled 聚合，失败卡片保留占位与重试按钮。

**用 p-limit 限制并发数（出处：开源项目 sindresorhus/p-limit）**。它把任务包成受控队列，同时只跑指定数量的 promise。做法有效在于避免一次发出过多请求占满浏览器连接数。你的项目可以在批量导出、批量上传处套一层并发上限，而不是直接 Promise.all 全量并发。

**全局捕获未处理的拒绝（出处：MDN Web Docs 的 Window: unhandledrejection 事件；Node.js 官方文档的 process 事件 unhandledRejection）**。浏览器挂在 window 上，Node 挂在 process 上，用于记录逃出所有 catch 的拒绝。做法有效在于兜住遗漏的链尾。你的项目可以在该回调里上报并保留控制台输出，不要静默吞掉。需核对官方文档：Node.js 当前 --unhandled-rejections 的默认值与可选值。

**用 lint 规则约束链式写法（出处：开源项目 eslint-plugin-promise 文档）**。它的 catch-or-return、no-return-await 等规则能拦住忘记返回、在非 try 中 return await 之类写法。做法有效在于把 then 返回值规则变成静态检查。你的项目可以先把规则设为 warn，统计命中文件后再收紧为 error。需核对官方文档：规则名与当前插件版本是否一致。

### 从学到用：落地路线

**第 1 步：试点**。选一个已经出现竞态或白屏问题的页面，只加请求编号与 AbortController。验收标准：能在 Network 面板复现取消，代码评审通过。

**第 2 步：验证**。用 Lighthouse 移动端预设和 DevTools 节流，对比改动前后的 LCP 与 INP 中位数，并记录未处理拒绝数量。验收标准：指标不劣化，未处理拒绝为 0。

**第 3 步：推广**。把带 signal 的请求封装、allSettled 降级模板、全局拒绝上报整理成项目内工具函数与文档。验收标准：新页面默认引用这套封装，评审清单包含对应条目。

**第 4 步：防回退**。加 lint 规则与 CI 检查，把指标采集接入日常看板。验收标准：CI 拦截未带 signal 的裸 fetch，指标周报可追溯到具体页面。

### 动手作业

**目标**：写一个分页表格请求编排器，在随机延迟的假后端上稳定显示当前页数据。

**步骤**：

1. 用 fetch 拉取 `/api/rows?page=N`，先写出最简版本并渲染页码。
2. 加 AbortController，翻页时取消上一次请求。
3. 加请求编号，响应回来先比对编号再渲染。
4. 用 Promise.allSettled 同时拉取表格与统计卡片，卡片失败只显示占位。
5. 给表格请求加时间上限，超时渲染骨架屏并显示重试按钮。
6. 写一个 20 行的假后端，用 setTimeout 加随机延迟，制造乱序返回。
7. 在 DevTools 里开节流录制，导出 Performance 记录并截图 Network 面板。

**验收标准**：

- 快速连点 10 次翻页，Network 面板显示前 9 次为 canceled，表格只渲染最后一次数据。
- 断开统计卡片接口，表格仍正常渲染，页面无未捕获拒绝。
- 时间上限内未返回时出现骨架屏，返回后骨架屏被替换，无重复渲染。
- 关掉假后端随机延迟，表格内容与请求顺序一致。
- 控制台在整轮操作中不出现 unhandled rejection 提示。

