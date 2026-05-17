
---
title: 手写代码题汇总
description: 收录 30 道高频手写题，包括 Promise 系列、函数式编程、工具函数、数据结构等完整可运行的实现代码。
tags:
  - coding
  - interview
date: 2026-05-17
---

> 本章收录 30 道高频手写题，每道均有完整、可运行的实现代码。

---

### 1. 手写 Promise

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

---

### 2. 手写 Promise.all

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

---

### 3. 手写 Promise.race

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

---

### 4. 手写 Promise.allSettled

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

---

### 5. 手写 Promise.retry

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

---

### 6. 手写 async/await（Generator + co）

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

---

### 7. 手写 call

```javascript
// 手写call：调用函数，this指向第一个参数，其余参数逐个传递
Function.prototype.myCall = function(context = window, ...args) {
  // 排除null/undefined（使其指向window）
  if (context === null || context === undefined) context = window;
  // 用Symbol避免属性名冲突
  const fn = Symbol('fn');
  // 把this（当前函数）挂到context上
  context[fn] = this;
  // 通过context调用this，参数展开
  const result = context[fn](...args);
  // 清理
  delete context[fn];
  return result;
};

// 测试：
function greet(greeting, punct) {
  return `${greeting}, I'm ${this.name}${punct}`;
}
console.log(greet.myCall({ name: '张三' }, '你好', '！')); // 你好, I'm 张三！
console.log(greet.myCall({ name: '李四' }, '您好', '。')); // 您好, I'm 李四。
```

---

### 8. 手写 apply

```javascript
// 手写apply：调用函数，this指向第一个参数，其余参数用数组
Function.prototype.myApply = function(context = window, args = []) {
  if (context === null || context === undefined) context = window;
  const fn = Symbol('fn');
  context[fn] = this;
  const result = context[fn](...args);
  delete context[fn];
  return result;
};

// 测试：
function greet(greeting, punct) {
  return `${greeting}, I'm ${this.name}${punct}`;
}
console.log(greet.myApply({ name: '张三' }, ['你好', '！'])); // 你好, I'm 张三！
console.log(greet.myApply({ name: '李四' }, ['您好', '。'])); // 您好, I'm 李四。
```

---

### 9. 手写 bind

```javascript
// 手写bind：返回新函数，this永久绑定到第一个参数
Function.prototype.myBind = function(context = window, ...bindArgs) {
  const originalFn = this;

  function boundFn(...callArgs) {
    // new调用时，this是实例本身（优先级最高，忽略context）
    const isNew = this instanceof originalFn;
    const finalThis = isNew ? this : (context || window);
    return originalFn.apply(finalThis, [...bindArgs, ...callArgs]);
  }

  // 继承原型链：boundFn.prototype = Object.create(originalFn.prototype)
  function Empty() {}
  Empty.prototype = originalFn.prototype;
  boundFn.prototype = new Empty();

  return boundFn;
};

// 测试：
function greet(greeting) { return `${greeting}, I'm ${this.name}`; }
const bound = greet.myBind({ name: '张三' });
console.log(bound('你好'));  // 你好, I'm 张三
console.log(bound.call({ name: '无效' }, 'hi')); // hi, I'm 张三（bind无法覆盖）

// new优先级：
function Person(name, age) {
  this.name = name; this.age = age;
}
const BoundPerson = Person.myBind(null, '张三');
const p = new BoundPerson(18);
console.log(p.name, p.age); // 张三, 18（new时this指向实例）
```

---

### 10. 手写 new 操作符

```javascript
// 手写new：创建实例，原型绑定，this绑定
function myNew(Constructor, ...args) {
  if (typeof Constructor !== 'function') {
    throw new TypeError('Constructor is not a function');
  }

  // 1. 创建新对象，原型指向构造函数的prototype
  const obj = Object.create(Constructor.prototype);

  // 2. 调用构造函数，this指向新对象
  const result = Constructor.apply(obj, args);

  // 3. 返回：如果构造函数显式返回对象/函数，就用那个；否则返回新对象
  // 注意：构造函数若返回原始值则忽略，仍返回新对象
  if (result !== null && (typeof result === 'object' || typeof result === 'function')) {
    return result;
  }
  return obj;
}

// 测试：
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.greet = function() {
  return `我是${this.name}，${this.age}岁`;
};

const p = myNew(Person, '张三', 18);
console.log(p.name);      // 张三
console.log(p.greet());   // 我是张三，18岁
console.log(p instanceof Person); // true
console.log(p.constructor === Person); // true
```

---

### 11. 手写 instanceof

```javascript
// instanceof：检查对象是否在构造函数的原型链上
function myInstanceOf(left, right) {
  if (left === null || typeof left !== 'object') return false;
  if (typeof right !== 'function') throw new TypeError('Right-hand side of instanceof must be a function');

  let proto = Object.getPrototypeOf(left);
  const prototype = right.prototype;

  while (proto !== null) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

// 测试：
function Parent() {}
function Child() {}
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;

const c = new Child();
console.log(myInstanceOf(c, Child));    // true
console.log(myInstanceOf(c, Parent));    // true
console.log(myInstanceOf(c, Object));    // true
console.log(myInstanceOf({}, Object));   // true
console.log(myInstanceOf('str', String)); // false（字符串不是对象）
console.log(myInstanceOf(null, Object)); // false
```

---

### 12. 手写 Object.create

```javascript
// 手写Object.create：创建对象，原型指向传入的proto
function myObjectCreate(proto) {
  if (typeof proto !== 'object' && typeof proto !== 'function' && proto !== null) {
    throw new TypeError('Object prototype may only be an Object or null');
  }

  // 临时构造函数
  function Temp() {}

  // 原型指向传入的proto
  Temp.prototype = proto;

  // 返回新对象，其__proto__ === proto
  return new Temp();
}

// 测试：
const parent = { name: 'parent' };
const child = myObjectCreate(parent);
console.log(child.name); // parent
console.log(Object.getPrototypeOf(child) === parent); // true
console.log(child instanceof Object); // true（因为parent的原型链上有Object）
```

---

### 13. 手写深拷贝

```javascript
// 手写深拷贝：支持循环引用、Symbol、Date、RegExp、函数、Map、Set等
function deepClone(target, hash = new WeakMap()) {
  // 处理原始类型
  if (target === null || typeof target !== 'object') return target;

  // 处理循环引用
  if (hash.has(target)) return hash.get(target);

  // 处理Date
  if (target instanceof Date) return new Date(target);

  // 处理RegExp
  if (target instanceof RegExp) return new RegExp(target.source, target.flags);

  // 处理Error
  if (target instanceof Error) {
    const err = new Error(target.message);
    err.name = target.name;
    err.stack = target.stack;
    return err;
  }

  // 处理函数
  if (typeof target === 'function') {
    if (target.prototype) {
      // 普通函数：返回包装函数
      return function(...args) { return target.apply(this, args); };
    }
    // 箭头函数：直接返回
    return target;
  }

  // 处理Map
  if (target instanceof Map) {
    const clone = new Map();
    hash.set(target, clone);
    target.forEach((v, k) => clone.set(deepClone(k, hash), deepClone(v, hash)));
    return clone;
  }

  // 处理Set
  if (target instanceof Set) {
    const clone = new Set();
    hash.set(target, clone);
    target.forEach(v => clone.add(deepClone(v, hash)));
    return clone;
  }

  // 处理数组和普通对象
  const clone = Array.isArray(target) ? [] : {};
  hash.set(target, clone);
  for (const key of Object.keys(target)) {
    clone[key] = deepClone(target[key], hash);
  }
  return clone;
}

// 测试：
const original = {
  date: new Date(),
  regex: /test/gi,
  map: new Map([['a', 1]]),
  set: new Set([1, 2]),
  nested: { fn: () => 'hello' }
};
original.circular = original; // 循环引用
const cloned = deepClone(original);
console.log(cloned.date instanceof Date); // true
console.log(cloned.regex.source); // test
console.log(cloned.map.get('a')); // 1
console.log(cloned.circular === original); // false（不是同一个引用）
console.log(cloned.nested.fn()); // hello
```

---

### 14. 手写防抖 debounce

```javascript
// 防抖：n秒后执行，n秒内再次触发则重新计时
function debounce(fn, delay, immediate = false) {
  let timer = null;

  return function(...args) {
    const context = this;
    // 立即执行模式（第一次触发立即执行）
    if (immediate && !timer) {
      fn.apply(context, args);
    }
    // 清除之前的定时器，重新计时
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!immediate) {
        fn.apply(context, args);
      }
      timer = null;
    }, delay);
  };
}

// 进阶：返回函数，允许手动取消和立即执行
function debounceAdvanced(fn, delay, options = {}) {
  let timer = null;
  let lastArgs = null;
  const { leading = false, trailing = true, maxWait } = options;

  let maxTimer = null;

  function invoke() {
    if (lastArgs) {
      fn.apply(this, lastArgs);
      lastArgs = null;
      clearTimeout(maxTimer);
      maxTimer = null;
    }
  }

  return function(...args) {
    const context = this;

    // leading：立即执行
    if (leading && !timer) {
      fn.apply(context, args);
    }

    clearTimeout(timer);
    lastArgs = args;

    // trailing：在delay后执行
    timer = setTimeout(() => {
      invoke.call(context);
      timer = null;
    }, delay);

    // maxWait：在超过maxWait后强制执行（防抖+节流的混合）
    if (maxWait !== undefined && !maxTimer) {
      maxTimer = setTimeout(() => {
        invoke.call(context);
        maxTimer = null;
      }, maxWait);
    }
  };
}

// 使用：
const handleSearch = debounce(async (query) => {
  const res = await fetch(`/search?q=${query}`);
  render(await res.json());
}, 300);
input.addEventListener('input', e => handleSearch(e.target.value));
```

---

### 15. 手写节流 throttle

```javascript
// 节流：n秒内只执行一次（固定频率）
function throttle(fn, delay) {
  let lastTime = 0;

  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

// 进阶：支持leading和trailing
function throttleAdvanced(fn, delay, options = {}) {
  let lastTime = 0;
  let timer = null;
  const { leading = true, trailing = true } = options;

  return function(...args) {
    const context = this;
    const now = Date.now();

    if (!lastTime && !leading) lastTime = now;

    const remaining = delay - (now - lastTime);
    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      lastTime = now;
      fn.apply(context, args);
    } else if (!timer && trailing) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        lastTime = leading ? Date.now() : 0;
        timer = null;
        fn.apply(context, args);
      }, remaining);
    }
  };
}

// RAF节流（最精确，配合屏幕刷新率）：
function throttleRAF(fn) {
  let pending = false;
  return function(...args) {
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        fn.apply(this, args);
        pending = false;
      });
    }
  };
}

// 使用：
const handleScroll = throttleRAF(() => {
  const scrollY = window.scrollY;
  // 执行滚动相关逻辑
});
window.addEventListener('scroll', handleScroll);
```

---

### 16. 手写 EventEmitter

```javascript
// 手写EventEmitter：发布订阅模式
class EventEmitter {
  constructor() {
    this.events = {}; // { eventName: [handler1, handler2, ...] }
  }

  // 订阅
  on(event, handler) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(handler);
    return this; // 支持链式调用
  }

  // 只订阅一次
  once(event, handler) {
    const onceHandler = (...args) => {
      this.off(event, onceHandler); // 先取消，再执行
      handler.apply(this, args);
    };
    return this.on(event, onceHandler);
  }

  // 取消订阅
  off(event, handler) {
    if (!handler) {
      this.events[event] = []; // 移除该事件所有handler
      return this;
    }
    this.events[event] = (this.events[event] || []).filter(h => h !== handler);
    return this;
  }

  // 发布（同步）
  emit(event, ...args) {
    const handlers = this.events[event] || [];
    handlers.forEach(h => h.apply(this, args));
    return this;
  }

  // 移除所有订阅（或指定事件）
  removeAllListeners(event) {
    if (event) delete this.events[event];
    else this.events = {};
    return this;
  }

  // 返回订阅数（用于测试）
  listenerCount(event) {
    return (this.events[event] || []).length;
  }
}

// 测试：
const emitter = new EventEmitter();

function onClick(data) { console.log('click:', data); }
function onMove(data) { console.log('move:', data); }

emitter.on('click', onClick);
emitter.on('move', onMove);
emitter.once('click', (d) => console.log('once:', d));

emitter.emit('click', { x: 1 }); // click: {x:1}, once: {x:1}
emitter.emit('click', { x: 2 }); // click: {x:2}（once已移除）
emitter.off('click', onClick);
emitter.emit('click', { x: 3 }); // 无输出（已取消）

emitter.removeAllListeners('move');
emitter.emit('move', {}); // 无输出
```

---

### 17. 手写观察者模式

```javascript
// 观察者模式：目标（Subject）管理观察者（Observer），状态变化时通知
class Subject {
  constructor() {
    this.observers = new Set(); // 用Set保证唯一性
  }

  // 添加观察者
  attach(observer) {
    this.observers.add(observer);
  }

  // 移除观察者
  detach(observer) {
    this.observers.delete(observer);
  }

  // 通知所有观察者
  notify() {
    this.observers.forEach(observer => observer.update(this));
  }
}

// 具体目标：气象站
class WeatherStation extends Subject {
  constructor() {
    super();
    this.temperature = 0;
    this.humidity = 0;
  }

  setMeasurements(temp, humidity) {
    this.temperature = temp;
    this.humidity = humidity;
    this.notify(); // 状态变化，通知所有观察者
  }
}

// 具体观察者：手机App显示
class MobileApp {
  constructor(station) {
    this.station = station;
    station.attach(this); // 订阅
  }

  update(subject) {
    console.log(`手机App: 温度=${subject.temperature}°C, 湿度=${subject.humidity}%`);
  }
}

// 具体观察者：大屏显示
class Dashboard {
  constructor(station) {
    this.station = station;
    station.attach(this);
  }

  update(subject) {
    console.log(`大屏: ${subject.temperature}°C | ${subject.humidity}%`);
  }
}

// 测试：
const station = new WeatherStation();
const mobile = new MobileApp(station);
const dash = new Dashboard(station);

station.setMeasurements(25, 60);
// 手机App: 温度=25°C, 湿度=60%
// 大屏: 25°C | 60%

station.detach(mobile); // 取消订阅
station.setMeasurements(28, 55);
// 大屏: 28°C | 55%（手机不再收到通知）

// 观察者 vs 发布订阅：
// 观察者：Subject直接持有Observer引用（紧耦合）
// 发布订阅：通过EventEmitter解耦（更灵活）
```

---

### 18. 手写柯里化 curry

```javascript
// 柯里化：把多参数函数转为系列单参数函数
function curry(fn) {
  // 获取原函数参数个数
  const arity = fn.length;

  return function curried(...args) {
    // 参数够数就执行，不够就继续返回函数收集参数
    if (args.length >= arity) {
      return fn.apply(this, args);
    }
    return function(...args2) {
      return curried.apply(this, args.concat(args2));
    };
  };
}

// 自动柯里化（参数不够时自动收集）
function curryAuto(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...args2) => curried.apply(this, args.concat(args2));
  };
}

// 测试：
function add(a, b, c) { return a + b + c; }
const curriedAdd = curry(add);
console.log(curriedAdd(1)(2)(3));   // 6
console.log(curriedAdd(1, 2)(3));   // 6
console.log(curriedAdd(1)(2, 3));   // 6
console.log(curriedAdd(1, 2, 3));   // 6

// 应用：参数预填充（partial application）
const add10 = curry(add)(10);
console.log(add10(20)(30)); // 60

// 实际例子：日志
const log = curry((level, message, meta) =>
  console.log(`[${level}] ${message}`, meta)
);
const info = log('INFO');
info('系统启动', { pid: 123 });
info('用户登录', { uid: 456 });
```

---

### 19. 手写 compose

```javascript
// compose：从右到左组合多个函数
// compose(f, g, h)(x) === f(g(h(x)))
function compose(...fns) {
  if (fns.length === 0) return x => x;
  if (fns.length === 1) return fns[0];
  return fns.reduceRight((f, g) =>
    (...args) => f(g(...args))
  );
}

// pipe：从左到右组合（更直观）
function pipe(...fns) {
  if (fns.length === 0) return x => x;
  if (fns.length === 1) return fns[0];
  return fns.reduce((f, g) =>
    (...args) => g(f(...args))
  );
}

// trace：调试compose中间结果
const trace = label => x => { console.log(`${label}:`, x); return x; };

// 测试：
const double = x => x * 2;
const addOne = x => x + 1;
const square = x => x * x;

const process = compose(
  trace('输入'),
  double,
  trace('翻倍后'),
  addOne,
  trace('加一后'),
  square,
  trace('平方后')
);
process(2);
// 输入: 2
// 平方后: 4
// 加一后: 5
// 翻倍后: 10
// 输入: 20

// composeRight（从左到右执行）：
function composeRight(...fns) {
  return fns.reduceRight((f, g) => (...args) => g(f(...args)));
}

// 实际应用：数据处理管道
const processUser = pipe(
  validateInput,        // 验证输入
  normalizeData,        // 规范化
  removeDuplicates,     // 去重
  enrichWithMeta,       // 补充元信息
  formatOutput          // 格式化输出
);
```

---

### 20. 手写数组扁平化 flatten

```javascript
// 手写flatten：数组扁平化（指定深度）
function flatten(arr, depth = 1) {
  const result = [];
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      // 递归扁平化（深度-1）
      result.push(...flatten(item, depth - 1));
    } else {
      result.push(item);
    }
  }
  return result;
}

// 无限深度版
function flattenDeep(arr) {
  return arr.reduce((acc, item) =>
    Array.isArray(item) ? acc.concat(flattenDeep(item)) : acc.concat(item)
  , []);
}

// ES2019 flat（内置）
const r = [1, [2, [3, [4]]]].flat(2); // [1, 2, 3, [4]]
const rDeep = [1, [2, [3, [4]]]].flat(Infinity); // [1, 2, 3, 4]

// 手动实现.flat（用于理解）：
Array.prototype.myFlat = function(depth = 1) {
  const result = [];
  const flat = (arr, d) => {
    for (const item of arr) {
      if (Array.isArray(item) && d > 0) {
        flat(item, d - 1);
      } else {
        result.push(item);
      }
    }
  };
  flat(this, depth);
  return result;
};

// 带separator的join（不常用）：
function flattenWithSeparator(arr, separator = ',') {
  return arr.toString().split(separator);
}

// 测试：
console.log(flatten([1, [2, [3, [4]]]], 1)); // [1, 2, [3, [4]]]
console.log(flatten([1, [2, [3, [4]]]], 2)); // [1, 2, 3, [4]]
console.log(flattenDeep([1, [2, [3, [4]]]])); // [1, 2, 3, 4]
```

---

### 21. 手写 LRU 缓存

```javascript
// LRU Cache：最近最少使用缓存（淘汰最久未使用的）
// 实现：HashMap + 双向链表（O(1) get/put）

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // Map保持插入顺序
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    // 读取后移到最后（最近使用）
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      // 更新，移到最后
      this.cache.delete(key);
      this.cache.set(key, value);
    } else {
      // 新增
      if (this.cache.size >= this.capacity) {
        // 淘汰最老的（Map的第一个key）
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, value);
    }
  }
}

// 用双向链表实现（面试时展示原理）：
class LRUCache链表 {
  constructor(capacity) {
    this.capacity = capacity;
    this.head = new Node(null, null); // 虚拟头
    this.tail = new Node(null, null); // 虚拟尾
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const node = this.cache.get(key);
    this.moveToTail(node); // 移到尾部（最近使用）
    return node.value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      this.moveToTail(node);
    } else {
      if (this.cache.size >= this.capacity) {
        const first = this.head.next;
        this.remove(first);
        this.cache.delete(first.key);
      }
      const newNode = new Node(key, value);
      this.cache.set(key, newNode);
      this.addToTail(newNode);
    }
  }

  addToTail(node) {
    node.prev = this.tail.prev;
    node.next = this.tail;
    this.tail.prev.next = node;
    this.tail.prev = node;
  }

  remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  moveToTail(node) {
    this.remove(node);
    this.addToTail(node);
  }
}

class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

// 测试：
const cache = new LRUCache(3);
cache.put('a', 1);
cache.put('b', 2);
cache.put('c', 3);
console.log(cache.get('a')); // 1（a移到末尾：[b,c,a]）
cache.put('d', 4); // 淘汰b：[c,a,d]
console.log(cache.get('b')); // -1（已淘汰）
```

---

### 22. 手写虚拟 DOM 和 diff

```javascript
// 虚拟DOM：h函数创建vnode + patch打补丁 + diff简化版

// h函数：创建虚拟节点
function h(tag, props = {}, children = []) {
  return { tag, props, children };
}

// patch：对比新旧vnode，打补丁
function patch(oldVnode, newVnode) {
  if (oldVnode.tag !== newVnode.tag) {
    // 标签不同，直接替换
    const oldEl = oldVnode.el;
    const newEl = createElement(newVnode);
    oldEl.parentNode.replaceChild(newEl, oldEl);
    return newEl;
  }

  // 相同标签：比较props
  const el = oldVnode.el;
  newVnode.el = el;

  // 更新props
  updateProps(el, oldVnode.props, newVnode.props);

  // diff children
  patchChildren(el, oldVnode.children, newVnode.children);

  return el;
}

function patchChildren(el, oldChildren, newChildren) {
  const oldLen = oldChildren.length;
  const newLen = newChildren.length;
  const minLen = Math.min(oldLen, newLen);

  // 更新前面的（复用节点）
  for (let i = 0; i < minLen; i++) {
    patch(oldChildren[i], newChildren[i]);
  }

  // 新children更长：新增
  if (newLen > oldLen) {
    for (let i = oldLen; i < newLen; i++) {
      el.appendChild(createElement(newChildren[i]));
    }
  }
  // 旧children更长：删除
  else if (newLen < oldLen) {
    for (let i = minLen; i < oldLen; i++) {
      el.removeChild(oldChildren[i].el);
    }
  }
}

function updateProps(el, oldProps, newProps) {
  // 移除旧的props
  for (const key of Object.keys(oldProps)) {
    if (!newProps[key]) el.removeAttribute(key);
  }
  // 设置新的props
  for (const key of Object.keys(newProps)) {
    if (el[key] !== newProps[key]) el[key] = newProps[key];
  }
}

function createElement(vnode) {
  const el = document.createElement(vnode.tag);
  vnode.el = el;
  // 设置props
  updateProps(el, {}, vnode.props);
  // 递归创建子节点
  vnode.children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(createElement(child));
    }
  });
  return el;
}

// render函数：把vnode渲染到container
function render(vnode, container) {
  container.appendChild(createElement(vnode));
}

// 测试：
const vnode1 = h('div', { class: 'container' }, [
  h('h1', {}, ['Hello']),
  h('p', {}, ['Virtual DOM'])
]);

const vnode2 = h('div', { class: 'wrapper' }, [
  h('h1', {}, ['Hello World']),
  h('p', {}, ['Updated content']),
  h('span', {}, ['New element'])
]);

// 模拟diff：直接patch根节点
const container = document.getElementById('app');
render(vnode1, container);
patch(vnode1, vnode2); // diff更新
```

---

### 23. 手写 React useState 简化版

```javascript
// 手写useState：React Hooks简化版（渲染驱动更新）

let isRendering = false;
let currentlyRenderingFiber = null;
let workInProgressHook = null;

function useState(initial) {
  // 获取当前hook
  const hook = currentlyRenderingFiber.memoizedState;

  if (hook !== null) {
    // 不是首次渲染，返回当前状态
    return [hook.memoizedState, (action) => {
      hook.memoizedState = typeof action === 'function'
        ? action(hook.memoizedState)
        : action;
      // 触发重新渲染
      currentlyRenderingFiber.sibling = null;
      schedule(); // 模拟React的调度
    }];
  }

  // 首次渲染：初始化state
  hook.memoizedState = initial;

  const setState = (action) => {
    hook.memoizedState = typeof action === 'function'
      ? action(hook.memoizedState)
      : action;
    schedule();
  };

  return [hook.memoizedState, setState];
}

// Fiber节点
function createFiber(vnode) {
  return {
    type: vnode.tag,
    props: vnode.props,
    child: null,
    sibling: null,
    memoizedState: null, // hooks链表
    stateNode: createDOM(vnode)
  };
}

function createDOM(vnode) {
  if (typeof vnode === 'string') {
    return document.createTextNode(vnode);
  }
  const el = document.createElement(vnode.tag);
  // 设置props
  for (const [key, value] of Object.entries(vnode.props || {})) {
    el[key] = value;
  }
  // 递归创建子节点
  (vnode.children || []).forEach(child => {
    el.appendChild(typeof child === 'object' ? createDOM(child) : document.createTextNode(child));
  });
  return el;
}

// 简化调度
let taskQueue = null;
function schedule() {
  if (!taskQueue) {
    taskQueue = setTimeout(() => {
      isRendering = true;
      currentlyRenderingFiber = null;
      // 重新执行App（模拟React.render）
      workLoop();
      isRendering = false;
      taskQueue = null;
    }, 0);
  }
}

function workLoop() {
  while (workInProgressHook !== null) {
    workInProgressHook = workInProgressHook.next;
  }
}

// 测试（概念演示，实际需配合React运行时）
// 注意：这是简化版思路，真正React需要Fiber架构、reconciliation等完整实现
```

---

### 24. 手写简易 Router（Hash模式）

```javascript
// 手写简易Router：Hash模式
class Router {
  constructor(routes = []) {
    this.routes = routes;
    this.currentPath = this.getPath();

    // 监听hash变化
    window.addEventListener('hashchange', () => {
      const path = this.getPath();
      if (path !== this.currentPath) {
        this.currentPath = path;
        this.render();
      }
    });

    // 初始渲染
    this.render();
  }

  getPath() {
    return window.location.hash.slice(1) || '/';
  }

  navigate(path) {
    window.location.hash = path;
  }

  match(path) {
    // 精确匹配 > 动态路由匹配
    const exact = this.routes.find(r => r.path === path && !r.path.includes(':'));
    if (exact) return exact;

    // 动态路由：/user/:id
    return this.routes.find(r => {
      if (!r.path.includes(':')) return false;
      const pattern = r.path.replace(/:[^/]+/g, '([^/]+)');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(path);
    });
  }

  getParams(path, route) {
    const params = {};
    const keys = (route.path.match(/:([^/]+)/g) || []).map(k => k.slice(1));
    const values = path.match(new RegExp(route.path.replace(/:[^/]+/g, '([^/]+)')));
    keys.forEach((key, i) => params[key] = values[i + 1]);
    return params;
  }

  render() {
    const path = this.currentPath;
    const route = this.match(path);

    if (!route) {
      this.onNotFound();
      return;
    }

    const params = this.getParams(path, route);
    route.component({ path, params, navigate: this.navigate.bind(this) });
  }

  onNotFound() {
    console.warn('Route not found:', this.currentPath);
  }
}

// 示例：定义组件
const Home = () => console.log('Home页面');
const User = ({ params }) => console.log('User:', params.id);
const Article = ({ params }) => console.log('Article:', params.id);

// 创建Router
const router = new Router([
  { path: '/', component: Home },
  { path: '/user/:id', component: User },
  { path: '/article/:id', component: Article }
]);

// 跳转
router.navigate('/user/123');
router.navigate('/article/456');
console.log(router.currentPath); // /article/456

// History模式（类似，只是监听popstate）
class HistoryRouter {
  constructor(routes) {
    this.routes = routes;
    this.currentPath = window.location.pathname;
    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname;
      this.render();
    });
    this.render();
  }

  navigate(path) {
    history.pushState(null, '', path);
    this.currentPath = path;
    this.render();
  }
}
```

---

### 25. 手写 reactive（Proxy响应式简化版）

```javascript
// 手写响应式：Proxy实现Vue3风格的reactive
let activeEffect = null;

function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      // 收集依赖（track）
      if (activeEffect) {
        if (!depMap.has(target)) depMap.set(target, new Map());
        if (!depMap.get(target).has(key)) depMap.get(target).set(key, new Set());
        depMap.get(target).get(key).add(activeEffect);
      }
      // 深层响应式
      if (value !== null && typeof value === 'object') {
        return reactive(value);
      }
      return value;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);
      // 触发更新（trigger）
      if (oldValue !== value) {
        const deps = depMap.get(target)?.get(key);
        if (deps) {
          deps.forEach(effect => effect());
        }
      }
      return result;
    }
  });
}

// 依赖收集表：target → key → [effect1, effect2, ...]
const depMap = new WeakMap();

// effect：副作用函数，执行时自动收集依赖
function effect(fn) {
  const wrapped = () => {
    activeEffect = wrapped;
    fn();
    activeEffect = null;
  };
  wrapped(); // 执行一次，收集依赖
}

// computed：计算属性
function computed(fn) {
  let value;
  let dirty = true;
  const runner = effect(() => {
    if (!dirty) return value;
    value = fn();
    dirty = false;
  });
  return () => {
    if (dirty) {
      value = fn();
      dirty = false;
    }
    return value;
  };
}

// watch：监听变化
function watch(source, cb) {
  let oldValue, newValue;
  const getter = typeof source === 'function' ? source : () => source;
  const job = () => {
    newValue = getter();
    if (newValue !== oldValue) {
      cb(newValue, oldValue);
      oldValue = newValue;
    }
  };
  effect(job);
}

// 测试：
const state = reactive({ count: 0, name: '张三' });

effect(() => {
  console.log('count变化了:', state.count);
});
effect(() => {
  console.log('name变化了:', state.name);
});

state.count++; // 打印: count变化了: 1
state.count = 5; // 打印: count变化了: 5
state.name = '李四'; // 打印: name变化了: 李四

// computed
const double = computed(() => state.count * 2);
console.log(double()); // 2
state.count = 3;
console.log(double()); // 6
```

---

### 26. 手写并发控制（限制并发数）

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

---

### 27. 手写图片懒加载（IntersectionObserver）

```javascript
// 手写图片懒加载：IntersectionObserver
class LazyLoad {
  constructor(options = {}) {
    this.root = options.root || null;
    this.rootMargin = options.rootMargin || '200px'; // 提前200px加载
    this.threshold = options.threshold || 0;
    this.onLoad = options.onLoad || (() => {});

    this.observer = new IntersectionObserver(
      this._onIntersect.bind(this),
      { root: this.root, rootMargin: this.rootMargin, threshold: this.threshold }
    );
  }

  _onIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          img.classList.remove('lazy');
          this.observer.unobserve(img);
          this.onLoad(img);
        }
      }
    });
  }

  // 观察一个或多个图片元素
  observe(element) {
    if (typeof element === 'string') {
      document.querySelectorAll(element).forEach(el => this.observer.observe(el));
    } else {
      this.observer.observe(element);
    }
  }

  // 停止观察
  disconnect() {
    this.observer.disconnect();
  }
}

// 使用：
const lazy = new LazyLoad({
  rootMargin: '300px',
  onLoad: (img) => img.classList.add('loaded')
});
lazy.observe('img.lazy'); // 观察所有.lazy图片

// 或者直接用：
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
}, { rootMargin: '200px' });

document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
```

---

### 28. 手写虚拟列表

```javascript
// 手写虚拟列表：只渲染可见区域，支持固定高度
class VirtualList {
  constructor({ container, list, itemHeight, renderItem, overscan = 3 }) {
    this.container = container;
    this.list = list;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;
    this.overscan = overscan; // 上下多渲染几行
    this.scrollTop = 0;

    // 总高度容器（形成滚动条）
    this.spacer = document.createElement('div');
    this.spacer.style.cssText = `position:relative;height:${list.length * itemHeight}px;`;
    container.appendChild(this.spacer);

    // 列表容器
    this.listContainer = document.createElement('div');
    this.listContainer.style.cssText = 'position:absolute;top:0;left:0;right:0;';
    container.appendChild(this.listContainer);

    // 绑定滚动
    container.addEventListener('scroll', () => {
      this.scrollTop = container.scrollTop;
      this.render();
    });

    this.render();
  }

  getStartIndex() {
    return Math.floor(this.scrollTop / this.itemHeight);
  }

  getEndIndex() {
    const visibleCount = Math.ceil(this.container.clientHeight / this.itemHeight);
    return this.getStartIndex() + visibleCount;
  }

  render() {
    const start = Math.max(0, this.getStartIndex() - this.overscan);
    const end = Math.min(this.list.length - 1, this.getEndIndex() + this.overscan);

    this.listContainer.innerHTML = '';

    for (let i = start; i <= end; i++) {
      const el = this.renderItem(this.list[i], i);
      el.style.cssText = `position:absolute;top:${i * this.itemHeight}px;left:0;right:0;height:${this.itemHeight}px;`;
      this.listContainer.appendChild(el);
    }
  }

  scrollToIndex(index) {
    this.container.scrollTop = index * this.itemHeight;
  }

  updateList(list) {
    this.list = list;
    this.spacer.style.height = `${list.length * this.itemHeight}px`;
    this.render();
  }
}

// 使用：
const list = new VirtualList({
  container: document.getElementById('list'),
  list: Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i}` })),
  itemHeight: 50,
  renderItem: (item, index) => {
    const el = document.createElement('div');
    el.textContent = `${item.id}: ${item.name}`;
    return el;
  }
});
```

---

### 29. 手写 JSONP

```javascript
// 手写JSONP：动态创建script标签，利用callback跨域请求

function jsonp({ url, params = {}, callbackKey = 'callback', timeout = 10000 }) {
  return new Promise((resolve, reject) => {
    // 生成唯一的callback函数名
    const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // 构建URL参数
    const queryString = Object.entries({ ...params, [callbackKey]: callbackName })
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const fullUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;

    // 超时处理
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP request timeout'));
    }, timeout);

    // 清理函数
    function cleanup() {
      clearTimeout(timer);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    // 定义全局callback（服务端会调用它）
    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    // 创建script标签
    const script = document.createElement('script');
    script.src = fullUrl;
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP request failed'));
    };
    document.head.appendChild(script);
  });
}

// 简化版（无参数构建）：
function jsonpSimple(url, callbackName = 'callback') {
  return new Promise((resolve, reject) => {
    const cb = `jsonp_cb_${Date.now()}`;
    const timer = setTimeout(() => {
      delete window[cb];
      reject(new Error('timeout'));
    }, 10000);

    window[cb] = (data) => {
      clearTimeout(timer);
      delete window[cb];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(data);
    };

    const separator = url.includes('?') ? '&' : '?';
    const script = document.createElement('script');
    script.src = `${url}${separator}${callbackName}=${cb}`;
    document.head.appendChild(script);
  });
}

// 测试：
jsonp({
  url: 'https://api.example.com/data',
  params: { id: 123 },
  callbackKey: 'callback'
}).then(data => console.log(data));

// 服务端返回格式：callback({"name":"张三"})
// 会调用window['callback']函数
```

---

### 30. 手写 KOA 中间件（compose 洋葱模型）

```javascript
// 手写koa中间件：compose + 洋葱模型
// 洋葱模型：请求从外层进入，层层深入到核心，再层层返回

function compose(middleware) {
  return function(ctx, next) {
    let index = -1;

    function dispatch(i) {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;

      if (i === middleware.length) {
        // 所有中间件执行完毕，调用最后的next（如果有）
        return next ? Promise.resolve(next(ctx)) : Promise.resolve();
      }

      const fn = middleware[i];
      try {
        return Promise.resolve(
          fn(ctx, () => dispatch(i + 1))
        );
      } catch (e) {
        return Promise.reject(e);
      }
    }

    return dispatch(0);
  };
}

// 简化Koa类：
class Koa {
  constructor() {
    this.middlewares = [];
  }

  use(fn) {
    this.middlewares.push(fn);
    return this;
  }

  listen(port, callback) {
    const server = require('http').createServer(async (req, res) => {
      const ctx = { req, res, state: {}, body: null };

      // 设置res.json辅助
      ctx.json = (data) => {
        ctx.body = JSON.stringify(data);
        res.setHeader('Content-Type', 'application/json');
      };

      try {
        await this.callback(ctx);
      } catch (e) {
        console.error(e);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    return server.listen(port, callback);
  }

  callback(ctx) {
    const fn = compose(this.middlewares);
    return fn(ctx);
  }
}

// 示例中间件：
const logger = async (ctx, next) => {
  const start = Date.now();
  console.log(`${ctx.req.method} ${ctx.req.url}`);
  await next();
  console.log(`耗时: ${Date.now() - start}ms`);
};

const auth = async (ctx, next) => {
  const token = ctx.req.headers.authorization;
  if (!token) {
    ctx.res.statusCode = 401;
    ctx.body = 'Unauthorized';
    return;
  }
  ctx.state.user = { id: 1, name: '张三' };
  await next();
};

const render = async (ctx, next) => {
  ctx.body = { message: 'Hello, ' + ctx.state.user.name };
  await next(); // 洋葱模型的最后一层
};

// 使用：
const app = new Koa();
app.use(logger);
app.use(auth);
app.use(render);
app.listen(3000, () => console.log('Server running at 3000'));

// 请求流程：
// logger enter → auth enter → render enter → (body set) → render exit
// → auth exit → logger exit → response

// 中间件间共享数据：通过 ctx.state
// ctx.req/res 是原生node的req/res
// ctx.body 会写入response body
```

---

## 附录 A：参考资料

### A.1 JavaScript 核心

| 分类 | 资源 | 说明 |
|------|------|------|
| Promise | [MDN - Promise](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise) | Promise 规范与用法 |
| Promise | [MDN - Using Promises](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Using_promises) | Promise 使用指南 |
| 事件循环 | [MDN - Event Loop](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Event_loop) | 事件循环机制详解 |
| 微任务 | [MDN - queueMicrotask](https://developer.mozilla.org/zh-CN/docs/Web/API/queueMicrotask) | 微任务队列 API |
| 定时器 | [MDN - setTimeout](https://developer.mozilla.org/zh-CN/docs/Web/API/setTimeout) | 定时器详解 |
| 动画帧 | [MDN - setAnimationFrame](https://developer.mozilla.org/zh-CN/docs/Web/API/setAnimationFrame) | requestAnimationFrame |

### A.2 数据结构

| 分类 | 资源 | 说明 |
|------|------|------|
| Map/Set | [MDN - Map](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Map) | Map 对象 |
| Map/Set | [MDN - Set](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Set) | Set 对象 |
| Map/Set | [CSDN - Map/Set/WeakMap/WeakSet 详解](https://www.jb51.net/article/282533.htm) | 2025 Map/Set/WeakMap/WeakSet 详解 |

### A.3 代理与响应式

| 分类 | 资源 | 说明 |
|------|------|------|
| 代理 | [MDN - Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy) | Proxy 代理对象 |
| 反射 | [MDN - Reflect](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect) | Reflect 反射 |
| 响应式 | [腾讯云 - Vue3 Proxy + Reflect](https://cloud.tencent.com/developer/news/2263970) | Vue3 响应式原理 |
| 结构化克隆 | [MDN - structuredClone](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/structuredClone) | 结构化克隆算法 |

### A.4 迭代器与生成器

| 分类 | 资源 | 说明 |
|------|------|------|
| 迭代器 | [MDN - Iterators and Generators](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Iterators_and_generators) | 迭代器与生成器指南 |
| 异步迭代 | [MDN - asyncIterator](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator) | Symbol.asyncIterator |

### A.5 垃圾回收与内存

| 分类 | 资源 | 说明 |
|------|------|------|
| GC | [CSDN - V8 垃圾回收原理](https://blog.csdn.net/qi_bai_jin/article/details/158261107) | V8 垃圾回收机制 |

---

## 附录 B：手写题分类索引

| 分类 | 题号 | 内容 |
|------|------|------|
| **Promise** | 1-6 | Promise、all、race、allSettled、retry、async/await |
| **this 与函数** | 7-12 | call、apply、bind、new、instanceof、Object.create |
| **手写实现** | 13-21 | 深拷贝、防抖、节流、EventEmitter、观察者、柯里化、compose、flatten、LRU |
| **框架原理** | 22-25 | vdom+diff、useState、Router、reactive |
| **工程实践** | 26-30 | 并发控制、图片懒加载、虚拟列表、JSONP、Koa中间件 |

---

*以上为前十二章内容。JavaScript（第三章）、TypeScript（第四章）、性能优化（第十一章）、手写代码（第十二章）均已完整收录。*

