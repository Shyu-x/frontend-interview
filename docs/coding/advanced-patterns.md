---
title: 高级手写题：发布订阅、代理与反射
description: 深入讲解前端面试高频手写题：发布订阅模式、Proxy 代理、Reflect 反射，每道题包含完整代码、测试用例和关键考点解析。
tags:
  - coding
  - interview
date: 2026-05-17
---

# 高级手写题：发布订阅、代理与反射

> 本专题深入讲解前端面试中的高频手写题：发布订阅模式（Pub-Sub）、Proxy 代理、Reflect 反射。每道题包含完整代码、测试用例和关键考点解析。

---

## 目录

1. [发布订阅模式](#一发布订阅模式)
2. [Proxy 代理模式](#二proxy-代理模式)
3. [Reflect 反射](#三reflect-反射)
4. [综合应用](#四综合应用)

---

## 一、发布订阅模式

### 1.1 基础 EventEmitter 实现

**核心思路**：使用对象存储事件名与回调函数数组的映射，通过 `on` 注册、`emit` 触发、`off` 移除实现基本的事件发布订阅功能。

```javascript
class EventEmitter {
  constructor() {
    this.events = {};
  }

  // 订阅事件
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
    return this; // 支持链式调用
  }

  // 发布事件
  emit(eventName, ...args) {
    const callbacks = this.events[eventName];
    if (!callbacks || callbacks.length === 0) {
      return false;
    }
    callbacks.forEach(callback => {
      callback.apply(this, args);
    });
    return true;
  }

  // 取消订阅
  off(eventName, callback) {
    const callbacks = this.events[eventName];
    if (!callbacks) return this;

    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
    return this;
  }
}
```

**测试**：

```javascript
const emitter = new EventEmitter();

const handler1 = (data) => console.log('Handler 1:', data);
const handler2 = (data) => console.log('Handler 2:', data);

emitter.on('user-login', handler1);
emitter.on('user-login', handler2);

emitter.emit('user-login', { username: 'Alice' });
// 输出:
// Handler 1: { username: 'Alice' }
// Handler 2: { username: 'Alice' }

emitter.off('user-login', handler1);
emitter.emit('user-login', { username: 'Bob' });
// 输出:
// Handler 2: { username: 'Bob' }
```

**关键考点**：
- `this.events` 对象存储结构：键为事件名，值为回调数组
- `emit` 时遍历数组依次执行回调
- `off` 使用 `indexOf` + `splice` 移除指定回调

---

### 1.2 支持 once 的完整 EventEmitter

**核心思路**：使用包装函数包裹原始回调，在第一次执行后自动移除自身，实现"只执行一次"的效果。

```javascript
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
    return this;
  }

  once(eventName, callback) {
    const onceWrapper = (...args) => {
      this.off(eventName, onceWrapper);
      callback.apply(this, args);
    };
    this.on(eventName, onceWrapper);
    return this;
  }

  emit(eventName, ...args) {
    const callbacks = this.events[eventName];
    if (!callbacks || callbacks.length === 0) {
      return false;
    }
    // 浅拷贝防止emit过程中修改数组
    [...callbacks].forEach(callback => {
      callback.apply(this, args);
    });
    return true;
  }

  off(eventName, callback) {
    const callbacks = this.events[eventName];
    if (!callbacks) return this;

    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
    return this;
  }
}
```

**测试**：

```javascript
const emitter = new EventEmitter();

let count = 0;
const handler = () => {
  count++;
  console.log(`Called ${count} times`);
};

emitter.once('single', handler);

emitter.emit('single'); // 输出: Called 1 times
emitter.emit('single'); // 无输出
emitter.emit('single'); // 无输出

console.log(count); // 1
```

**关键考点**：
- `once` 使用闭包创建 `onceWrapper`，执行后调用 `off` 移除自身
- `emit` 使用 `[...callbacks]` 浅拷贝避免循环中修改数组导致的问题

---

### 1.3 带错误处理的 EventEmitter

**核心思路**：在 `emit` 中使用 `try-catch` 包裹每个回调执行，防止单个回调报错导致整个事件系统崩溃。

```javascript
class EventEmitter {
  constructor() {
    this.events = {};
    this.listenerLimit = 100;
  }

  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    if (this.events[eventName].length >= this.listenerLimit) {
      console.warn(`事件 ${eventName} 的监听器数量已达上限`);
      return this;
    }

    this.events[eventName].push(callback);
    return this;
  }

  emit(eventName, ...args) {
    const callbacks = this.events[eventName];
    if (!callbacks || callbacks.length === 0) {
      return { handled: false, errors: [] };
    }

    const errors = [];
    callbacks.forEach((callback, index) => {
      try {
        callback.apply(this, args);
      } catch (err) {
        errors.push({ index, error: err });
        console.error(`事件 ${eventName} 的第 ${index + 1} 个监听器出错:`, err);
      }
    });

    return { handled: true, errors };
  }

  off(eventName, callback) {
    if (!this.events[eventName]) return this;

    if (!callback) {
      delete this.events[eventName];
    } else {
      const index = this.events[eventName].indexOf(callback);
      if (index !== -1) {
        this.events[eventName].splice(index, 1);
      }
    }
    return this;
  }
}
```

**测试**：

```javascript
const emitter = new EventEmitter();

emitter.on('data', () => console.log('Normal handler'));
emitter.on('data', () => { throw new Error('Intentional error'); });
emitter.on('data', () => console.log('Another normal handler'));

const result = emitter.emit('data');
// 输出:
// Normal handler
// Another normal handler
// 控制台错误: 事件 data 的第 2 个监听器出错: Error: Intentional error

console.log(result.errors.length); // 1
console.log(result.handled); // true
```

---

### 1.4 支持优先级的 EventEmitter

**核心思路**：为每个监听器添加 `priority` 属性，执行时按优先级排序。

```javascript
class PriorityEventEmitter {
  constructor() {
    this.events = {};
  }

  on(eventName, callback, priority = 0) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push({ callback, priority });
    this.events[eventName].sort((a, b) => b.priority - a.priority);
    return this;
  }

  emit(eventName, ...args) {
    const listeners = this.events[eventName];
    if (!listeners || listeners.length === 0) return false;

    listeners.forEach(({ callback }) => {
      callback.apply(this, args);
    });
    return true;
  }

  off(eventName, callback) {
    if (!this.events[eventName]) return this;

    this.events[eventName] = this.events[eventName]
      .filter(item => item.callback !== callback);
    return this;
  }
}
```

**测试**：

```javascript
const emitter = new PriorityEventEmitter();

emitter.on('log', () => console.log('Low priority'), 1);
emitter.on('log', () => console.log('High priority'), 100);
emitter.on('log', () => console.log('Medium priority'), 50);

emitter.emit('log');
// 输出顺序（按优先级）:
// High priority
// Medium priority
// Low priority
```

---

### 1.5 全局事件总线（单例模式）

**核心思路**：创建全局单例事件总线，通过 `Vue.prototype.$bus` 或 `React Context` 在组件间共享。

```javascript
class EventBus {
  constructor() {
    if (EventBus.instance) {
      return EventBus.instance;
    }
    this.events = {};
    EventBus.instance = this;
    return this;
  }

  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
    return this;
  }

  emit(eventName, ...args) {
    const callbacks = this.events[eventName];
    if (!callbacks) return false;
    callbacks.forEach(cb => cb(...args));
    return true;
  }

  off(eventName, callback) {
    if (!this.events[eventName]) return this;

    this.events[eventName] = this.events[eventName]
      .filter(cb => cb !== callback);
    return this;
  }
}

export const eventBus = new EventBus();
```

---

## 二、Proxy 代理模式

### 2.1 基础 Proxy 实现

**核心思路**：通过 `new Proxy(target, handler)` 创建代理对象，在 handler 中拦截属性的读取、设置、删除操作。

```javascript
const target = { message: 'Hello', count: 0 };
const handler = {
  get(target, prop, receiver) {
    console.log(`Getting ${prop}`);
    return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value, receiver) {
    console.log(`Setting ${prop} = ${value}`);
    return Reflect.set(target, prop, value, receiver);
  },
  deleteProperty(target, prop) {
    console.log(`Deleting ${prop}`);
    return Reflect.deleteProperty(target, prop);
  }
};

const proxy = new Proxy(target, handler);

console.log(proxy.message);      // Getting message → Hello
proxy.message = 'World';         // Setting message = World
delete proxy.count;             // Deleting count
```

---

### 2.2 实现 Vue3 响应式系统（reactive）

**核心思路**：使用 Proxy 拦截 get/set，在 get 时收集依赖（track），在 set 时触发更新（trigger）。

```javascript
const depsMap = new WeakMap();
let activeEffect = null;

function track(target, key) {
  if (activeEffect) {
    let dep = depsMap.get(target);
    if (!dep) {
      dep = new Map();
      depsMap.set(target, dep);
    }

    let effects = dep.get(key);
    if (!effects) {
      effects = new Set();
      dep.set(key, effects);
    }
    effects.add(activeEffect);
  }
}

function trigger(target, key) {
  const dep = depsMap.get(target);
  if (!dep) return;

  const effects = dep.get(key);
  if (effects) {
    effects.forEach(effect => effect());
  }
}

function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      track(target, key);
      if (typeof res === 'object' && res !== null) {
        return reactive(res);
      }
      return res;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const res = Reflect.set(target, key, value, receiver);
      if (oldValue !== value) {
        trigger(target, key);
      }
      return res;
    }
  });
}

function effect(fn) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}
```

**测试**：

```javascript
const state = reactive({ count: 0, user: { name: 'Alice' } });

effect(() => {
  console.log('Count changed:', state.count);
});

effect(() => {
  console.log('User name:', state.user.name);
});

state.count = 1;          // 输出: Count changed: 1
state.count = 2;          // 输出: Count changed: 2
state.user.name = 'Bob';  // 输出: User name: Bob
```

---

### 2.3 数组边界拦截

**核心思路**：Proxy 拦截数组操作，实现数组越界保护、负索引访问等功能。

```javascript
function createArrayProxy(arr) {
  return new Proxy(arr, {
    get(target, key, receiver) {
      // 处理负索引（如 arr.n1 获取最后一个元素）
      if (typeof key === 'string' && key.startsWith('n')) {
        const index = parseInt(key.slice(1));
        if (!isNaN(index) && index > 0) {
          return target[target.length - index];
        }
      }

      // 处理越界访问
      if (typeof key === 'string' && !isNaN(key)) {
        const index = parseInt(key);
        if (index < 0 || index >= target.length) {
          console.warn(`数组索引 ${index} 越界`);
          return undefined;
        }
      }

      return Reflect.get(target, key, receiver);
    },

    set(target, key, value, receiver) {
      return Reflect.set(target, key, value, receiver);
    }
  });
}
```

**测试**：

```javascript
const arr = createArrayProxy([10, 20, 30, 40, 50]);

console.log(arr[0]);     // 10
console.log(arr[10]);    // 警告: 数组索引 10 越界 → undefined
console.log(arr.n1);     // 50 (倒数第一个)
console.log(arr.n2);     // 40 (倒数第二个)
```

---

### 2.4 只读代理（readonly）

**核心思路**：创建不可修改的代理对象，任何修改操作都抛出错误。

```javascript
function readonly(obj, depth = 0) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  return new Proxy(obj, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (typeof value === 'object' && value !== null && depth > 0) {
        return readonly(value, depth - 1);
      }
      return value;
    },

    set(target, key, value) {
      throw new Error(`Cannot modify readonly property: ${String(key)}`);
    },

    deleteProperty(target, key) {
      throw new Error(`Cannot delete readonly property: ${String(key)}`);
    }
  });
}

function deepReadonly(obj) {
  return readonly(obj, Infinity);
}
```

**测试**：

```javascript
const config = readonly({
  apiUrl: 'https://api.example.com',
  timeout: 5000
});

console.log(config.apiUrl); // https://api.example.com

try {
  config.apiUrl = 'https://new.com';
} catch (e) {
  console.error(e.message); // Cannot modify readonly property: apiUrl
}
```

---

### 2.5 函数参数验证代理

**核心思路**：使用 Proxy 包装函数，在调用前验证参数类型和范围。

```javascript
function createValidatingFunction(fn, validators) {
  return new Proxy(fn, {
    apply(target, thisArg, args) {
      args.forEach((arg, index) => {
        const validator = validators[index];
        if (validator && !validator(arg)) {
          throw new TypeError(`参数 ${index + 1} 验证失败`);
        }
      });

      return Reflect.apply(target, thisArg, args);
    }
  });
}

const validators = {
  number: (val) => typeof val === 'number',
  positive: (val) => val > 0
};

const safeDivide = createValidatingFunction(
  (a, b) => a / b,
  [validators.number, (b) => b !== 0]
);

console.log(safeDivide(10, 2));  // 5
console.log(safeDivide(10, 0));   // 抛出: 参数 2 验证失败
```

---

## 三、Reflect 反射

### 3.1 手写 call / apply / bind（基于 Reflect）

**核心思路**：通过将函数临时挂载到目标对象上执行，利用 `Reflect.apply` 实现参数传递。

```javascript
Function.prototype.myCall = function(context, ...args) {
  context = context || globalThis;
  const fnKey = Symbol('tempFn');
  context[fnKey] = this;
  const result = context[fnKey](...args);
  delete context[fnKey];
  return result;
};

Function.prototype.myApply = function(context, args = []) {
  context = context || globalThis;
  const fnKey = Symbol('tempFn');
  context[fnKey] = this;
  const result = context[fnKey](...args);
  delete context[fnKey];
  return result;
};

Function.prototype.myBind = function(context, ...bindArgs) {
  const fn = this;
  return function(...args) {
    return fn.myCall(context, ...bindArgs, ...args);
  };
}
```

**测试**：

```javascript
const obj = { name: 'Alice' };
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

console.log(greet.myCall(obj, 'Hello', '!'));   // Hello, Alice!
console.log(greet.myApply(obj, ['Hi', '.']));  // Hi, Alice.

const boundGreet = greet.myBind(obj);
console.log(boundGreet('Hey', '~'));           // Hey, Alice~
```

---

### 3.2 Reflect 与 Proxy 配合实现只读代理

**核心思路**：Proxy 的 handler 方法与 Reflect 的方法一一对应，实现只读、验证等多种代理。

```javascript
function createReadOnlyProxy(target) {
  return new Proxy(target, {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },

    set(target, prop, value) {
      throw new Error(`[ReadOnlyError] 属性 ${String(prop)} 是只读的`);
    },

    deleteProperty(target, prop) {
      throw new Error(`[ReadOnlyError] 属性 ${String(prop)} 是只读的`);
    }
  });
}

function createValidatedProxy(target, validationRules) {
  return new Proxy(target, {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },

    set(target, prop, value) {
      const rules = validationRules[prop];

      if (rules) {
        if (rules.type && typeof value !== rules.type) {
          throw new TypeError(`属性 ${String(prop)} 期望 ${rules.type} 类型`);
        }
        if (rules.min !== undefined && value < rules.min) {
          throw new RangeError(`属性 ${String(prop)} 值 ${value} 小于最小值 ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          throw new RangeError(`属性 ${String(prop)} 值 ${value} 大于最大值 ${rules.max}`);
        }
      }

      return Reflect.set(target, prop, value);
    }
  });
}
```

**测试**：

```javascript
const user = createValidatedProxy({}, {
  age: { type: 'number', min: 0, max: 150 },
  name: { type: 'string' }
});

user.age = 25;              // 正常
try {
  user.age = -1;           // 抛出: 属性 age 值 -1 小于最小值 0
} catch (e) {
  console.error(e.message);
}
```

---

### 3.3 实现 mixin 混入模式

**核心思路**：使用 Reflect 将源对象的属性方法混入目标对象，支持多重继承。

```javascript
function mix(target, ...sources) {
  sources.forEach(source => {
    const sourceKeys = Reflect.ownKeys(source);

    sourceKeys.forEach(key => {
      if (key === 'constructor') return;

      const descriptor = Reflect.getOwnPropertyDescriptor(source, key);
      if (descriptor) {
        Reflect.defineProperty(target, key, descriptor);
      }
    });
  });
  return target;
}
```

**测试**：

```javascript
const LoggerMixin = {
  log(msg) { console.log(`[LOG] ${msg}`); }
};

const ValidatorMixin = {
  validate(value, rule) { return rule.test(value); }
};

class User {
  constructor(name) { this.name = name; }
  greet() { return `Hello, ${this.name}`; }
}

mix(User.prototype, LoggerMixin, ValidatorMixin);

const user = new User('Alice');
user.log('User created');                           // [LOG] User created
console.log(user.validate('a@b.com', /^\S+@\S+\.\S+$/)); // true
```

---

## 四、综合应用

### 4.1 异步事件处理（带 Promise 支持）

```javascript
class AsyncEventEmitter {
  constructor() {
    this.events = {};
  }

  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
    return this;
  }

  async emit(eventName, ...args) {
    const callbacks = this.events[eventName];
    if (!callbacks || callbacks.length === 0) {
      return [];
    }

    const results = await Promise.all(
      callbacks.map(async (callback) => {
        const result = callback(...args);
        return result instanceof Promise ? await result : result;
      })
    );

    return results;
  }

  off(eventName, callback) {
    if (!this.events[eventName]) return this;

    this.events[eventName] = this.events[eventName]
      .filter(cb => cb !== callback);
    return this;
  }
}
```

**测试**：

```javascript
const emitter = new AsyncEventEmitter();

emitter.on('fetch', async (url) => {
  console.log(`Fetching ${url}...`);
  return await fetch(url);
});

// 使用 async/await
async function main() {
  const results = await emitter.emit('fetch', 'https://api.example.com');
  console.log('All handlers completed:', results);
}

main();
```

---

### 4.2 观察者模式（带订阅确认）

```javascript
class Observable {
  constructor() {
    this.observers = new Map();
  }

  subscribe(event, observer) {
    if (!this.observers.has(event)) {
      this.observers.set(event, new Set());
    }
    this.observers.get(event).add(observer);

    return () => this.unsubscribe(event, observer);
  }

  unsubscribe(event, observer) {
    const observers = this.observers.get(event);
    if (observers) {
      observers.delete(observer);
    }
  }

  async notify(event, data) {
    const observers = this.observers.get(event);
    if (!observers || observers.size === 0) {
      return { notified: 0, responses: [] };
    }

    const responses = await Promise.all(
      Array.from(observers).map(observer => {
        const response = observer(data);
        return response instanceof Promise ? response : Promise.resolve(response);
      })
    );

    return { notified: observers.size, responses };
  }
}
```

---

## 总结

| 模式 | 核心 API | 关键考点 |
|------|---------|---------|
| 发布订阅 | `on/off/emit/once` | 事件映射、闭包、链式调用 |
| Proxy | `new Proxy(target, handler)` | get/set/deleteProperty/has 陷阱 |
| Reflect | `Reflect.get/set/apply/construct` | 与 Proxy 配套、替代 Object 操作符 |

---

## 参考资源

| 资源 | 链接 |
|------|------|
| MDN - Proxy | https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy |
| MDN - Reflect | https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect |
| 腾讯云 - Vue3 Proxy + Reflect | https://cloud.tencent.com/developer/news/2263970 |
| CSDN - Proxy vs defineProperty | https://blog.csdn.net/caishuangxi111/article/details/146554747 |