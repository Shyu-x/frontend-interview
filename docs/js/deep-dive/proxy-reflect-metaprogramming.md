---
title: "Proxy、Reflect 与元编程：MDN 精读"
description: "13 个陷阱(trap)、不变式与响应式/校验/代理实战"
---

# Proxy、Reflect 与元编程：MDN 精读

!!! abstract "核心结论"
    - `Proxy` 通过 `target + handler` 拦截对象内部方法，让开发者能自定义“基本操作”的语义；空 handler 的代理行为与 target 几乎一致。
    - 全部对象操作最终都会落到 `[[Get]]`、`[[Set]]`、`[[DefineOwnProperty]]`、`[[OwnPropertyKeys]]` 等内部方法上，`Proxy` 的 13 个 trap 分别对应这些内部方法。
    - 引擎会依据 target 的“不可扩展性”与“不可配置属性”校验陷阱返回值，违反不变式会抛出 `TypeError`，因此 trap 不能随意撒谎。
    - 在 trap 中应使用 `Reflect` 转发默认行为，并在涉及访问器属性时传入 `receiver`，否则 getter 中的 `this` 会丢失原型链语义。
    - `Proxy` 是独立对象，不能直接转发私有字段、`Map` 等含内部槽的对象，需要把 `this` 恢复到 target 上。

## 1. 底层原理：对象内部方法与 13 个陷阱

### 1.1 对象操作如何落到内部方法

JavaScript 并没有提供直接操作对象属性存储的语法，而是由对象自身定义一组内部方法。例如读取 `obj.x` 时，语言层只是调用 `obj` 的 `[[Get]]` 内部方法。普通对象默认的 `[[Get]]` 会沿原型链查找属性，再根据数据属性或访问器属性返回结果；数组的 `[[DefineOwnProperty]]` 会同步维护 `length`，这类内部方法不同于普通对象的对象被称为 exotic object。

`Proxy` 本质上允许开发者创建自己的 exotic object：它把对 target 的操作拦截到 handler 中，从而在没有直接修改对象内部实现的情况下改变行为。

### 1.2 13 个 handler 方法与调用时机

| handler 方法 | 对应内部方法 | 典型调用时机 |
| --- | --- | --- |
| `get` | `[[Get]]` | `proxy.foo`、`proxy[key]`、`Object.create(proxy)[foo]` |
| `set` | `[[Set]]` | `proxy.foo = 1`、继承属性赋值 |
| `has` | `[[HasProperty]]` | `key in proxy`、`Object.create(proxy)` 上的 `in` |
| `deleteProperty` | `[[Delete]]` | `delete proxy.foo` |
| `getOwnPropertyDescriptor` | `[[GetOwnProperty]]` | `Object.getOwnPropertyDescriptor`、`Object.keys` 等 |
| `defineProperty` | `[[DefineOwnProperty]]` | `Object.defineProperty`、class field 定义语义 |
| `getPrototypeOf` | `[[GetPrototypeOf]]` | `Object.getPrototypeOf`、`__proto__` 读取 |
| `setPrototypeOf` | `[[SetPrototypeOf]]` | `Object.setPrototypeOf` |
| `isExtensible` | `[[IsExtensible]]` | `Object.isExtensible` |
| `preventExtensions` | `[[PreventExtensions]]` | `Object.preventExtensions`、`Object.seal`、`Object.freeze` |
| `ownKeys` | `[[OwnPropertyKeys]]` | `Object.keys`、`Reflect.ownKeys`、`JSON.stringify` |
| `apply` | `[[Call]]` | `proxy(...args)`、`proxy.call`、`proxy.apply` |
| `construct` | `[[Construct]]` | `new proxy(...args)`、`Reflect.construct` |

需要特别注意 `[[Set]]` 与 `[[DefineOwnProperty]]` 的区别：普通对象赋值使用 `[[Set]]`，它会调用 setter；`Object.defineProperty` 使用 `[[DefineOwnProperty]]`，不会调用 setter。class field 也采用 `[[DefineOwnProperty]]` 语义，因此派生类声明同名字段时不会触发父类 setter。

### 1.3 不变式：违反时抛 TypeError

trap 的返回值必须尊重 target 的不可扩展性与不可配置属性。常见的约束包括：

- 如果 target 不可扩展，`ownKeys` 不能返回 target 实际不存在的 key，也不能漏掉 target 已有的 key。
- 对 target 上不可配置的自有属性，`getOwnPropertyDescriptor` 不能报告为不存在，也不能报告为可配置。
- 对不可配置且不可写的数据属性，`get` 不能返回不同的 `value`，`set` 不能返回 `true`。
- `has` 不能隐藏 target 上不可配置的自有属性。
- 如果 target 不可扩展但扩展性相关 trap 返回错误结果，会直接抛错。

下面用 `get` 违反不变式来验证引擎的强制行为。

```js
'use strict';
const assert = require('node:assert/strict');

// 第 1 段：在 target 上定义一个不可配置且不可写的数据属性
const target = {};
Object.defineProperty(target, 'fixed', {
  value: 1,
  writable: false,
  configurable: false,
});

// 第 2 段：trap 试图对 fixed 返回不同的 value
const proxy = new Proxy(target, {
  get(t, prop) {
    if (prop === 'fixed') {
      // 违反不变式：不可配置且不可写的属性必须返回原始 value
      return 2;
    }
    return Reflect.get(t, prop);
  },
});

// 第 3 段：访问 fixed 时，引擎在 trap 返回后会做不变式校验并抛 TypeError
assert.throws(() => proxy.fixed, TypeError);

console.log('invariant ok');
```

验证标准：`node invariant.js` 输出 `invariant ok`，断言 `proxy.fixed` 抛出 `TypeError` 通过。

这段代码要验证的是：trap 返回值不是所有情况下都能生效，引擎会把它拉回 target 的真实约束内。以上代码中，虽然 `get` trap 返回 `2`，但 target 的 `fixed` 是不可配置且不可写的数据属性，所以 `[[Get]]` 必须直接抛错，而不是返回 `2`。

1. 第 1 段用 `Object.defineProperty` 制造不可配置且不可写属性，这是触发不变式校验的前提。
2. 第 2 段故意返回不同值，模拟“代理撒谎”场景。
3. 第 3 段的 `assert.throws` 验证抛错类型为 `TypeError`，说明不变式由引擎强制执行，而不是由 handler 自己保证。

## 2. Reflect 与 receiver 参数

### 2.1 Reflect 为何与 trap 一一对应

`Reflect` 不是函数对象，它提供与 Proxy trap 同名的静态方法，用于执行对应内部方法的默认反射语义。典型用法是在 trap 里调用 `Reflect.get(...arguments)` 或显式传入 target、key、receiver，从而完成默认转发。

### 2.2 receiver 会改变访问器中的 this

访问器属性的 getter 在调用时，`this` 是属性的实际访问起点，也就是 receiver。如果在 `get` trap 中写 `target[prop]`，等于用 target 作为 this 访问属性，原型链下游对象的属性就会被忽略；若使用 `Reflect.get(target, prop, receiver)`，getter 的 this 会保持为外部实际调用者。

### 2.3 可运行验证

```js
'use strict';
const assert = require('node:assert/strict');

// 第 1 段：target 上定义访问器，getter 读取 this.name
const target = {
  name: 'target',
  get label() {
    return this.name;
  },
};

// 第 2 段：默认空 handler 转发，receiver 被保留
const goodProxy = new Proxy(target, {});
const goodChild = Object.create(goodProxy);
goodChild.name = 'child';
assert.equal(goodChild.label, 'child');

// 第 3 段：错误写法 target[prop] 会丢失 receiver
const badProxy = new Proxy(target, {
  get(t, prop) {
    return t[prop];
  },
});
const badChild = Object.create(badProxy);
badChild.name = 'child';
assert.equal(badChild.label, 'target');

// 第 4 段：显式使用 Reflect.get 并传入 receiver 是标准修复方式
const fixedProxy = new Proxy(target, {
  get(t, prop, receiver) {
    return Reflect.get(t, prop, receiver);
  },
});
const fixedChild = Object.create(fixedProxy);
fixedChild.name = 'child';
assert.equal(fixedChild.label, 'child');

console.log('receiver ok');
```

验证标准：`node receiver.js` 输出 `receiver ok`，预期断言依次为 `child`、`target`、`child`。

这段代码要解决的问题是：访问器属性沿原型链被读取时，`this` 到底是 target 还是下游对象。`receiver` 参数就是语言层传入的“实际属性访问起点”。

1. 第 1 段定义 `label` 访问器，结果是 `this.name`。
2. 第 2 段空 handler 默认转发，语言层会把 `goodChild` 作为 receiver 传入，所以 getter 读到 `child`。
3. 第 3 段直接 `t[prop]`，显式以 target 作为 this 取 getter，结果是 `target`。
4. 第 4 段使用 `Reflect.get(t, prop, receiver)`，重新把 receiver 传回访问器，恢复标准语义。

## 3. 日志代理与只读代理

### 3.1 日志代理

日志代理用于观察属性读取、写入、存在性检查与删除，不改变原始行为。它验证 Proxy 能拦截高频对象操作，并可作为审计或调试基础。

```js
'use strict';
const assert = require('node:assert/strict');

function createLogProxy(target, label = 'obj') {
  return new Proxy(target, {
    get(target, prop, receiver) {
      console.log(`[${label}] get ${String(prop)}`);
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      console.log(`[${label}] set ${String(prop)} = ${String(value)}`);
      return Reflect.set(target, prop, value, receiver);
    },
    has(target, prop) {
      console.log(`[${label}] has ${String(prop)}`);
      return Reflect.has(target, prop);
    },
    deleteProperty(target, prop) {
      console.log(`[${label}] delete ${String(prop)}`);
      return Reflect.deleteProperty(target, prop);
    },
  });
}

// 第 1 段：创建代理并修改 count
const raw = { count: 0 };
const proxy = createLogProxy(raw, 'counter');
proxy.count += 1;
assert.equal(raw.count, 1);

// 第 2 段：检查与删除属性
console.log('count' in proxy);
delete proxy.count;
assert.equal('count' in raw, false);

console.log('log proxy ok');
```

验证标准：`node log-proxy.js` 预期输出依次为以下内容，最后输出 `log proxy ok`。

```text
[counter] get count
[counter] set count = 1
[counter] has count
true
[counter] delete count
log proxy ok
```

这段代码要解决的问题是：在不修改原对象的前提下，完整记录属性生命周期。每个 trap 都使用 `Reflect` 做默认转发，避免改变真实读写语义。

1. `proxy.count += 1` 实际上先触发 `get count`，再触发 `set count = 1`，说明复合赋值不是单一内部操作。
2. `in` 触发 `has`，`delete` 触发 `deleteProperty`，日志代理因此能观察到四种典型操作。
3. 断言直接检查 `raw`，证明代理没有制造第二份数据，而是始终以 target 为存储后端。

### 3.2 只读代理

只读代理用于冻结写路径：读取保持正常，但赋值、定义属性、删除属性都抛错。这里额外加入对象值的懒包装，使嵌套对象也不能被直接修改。

```js
'use strict';
const assert = require('node:assert/strict');

function readonly(target) {
  const cache = new WeakMap();

  function wrap(value) {
    if (value && typeof value === 'object') {
      if (cache.has(value)) {
        return cache.get(value);
      }
      const proxy = new Proxy(value, {
        get(t, prop, receiver) {
          // 读取时继续包装对象，实现深层只读
          return wrap(Reflect.get(t, prop, receiver));
        },
        set(t, prop) {
          throw new TypeError(`Cannot assign to read-only property: ${String(prop)}`);
        },
        defineProperty(t, prop) {
          throw new TypeError(`Cannot define read-only property: ${String(prop)}`);
        },
        deleteProperty(t, prop) {
          throw new TypeError(`Cannot delete read-only property: ${String(prop)}`);
        },
      });
      cache.set(value, proxy);
      return proxy;
    }
    return value;
  }

  return wrap(target);
}

// 第 1 段：创建嵌套只读对象
const state = readonly({
  user: { name: 'Alice' },
  nums: [1, 2],
});

// 第 2 段：读路径保持正常
assert.equal(state.user.name, 'Alice');
assert.deepEqual(state.nums.slice(), [1, 2]);

// 第 3 段：写路径全部抛 TypeError
assert.throws(() => {
  state.user.name = 'Bob';
}, TypeError);
assert.throws(() => {
  state.nums.push(3);
}, TypeError);

assert.equal(state.user.name, 'Alice');

console.log('readonly ok');
```

验证标准：`node readonly.js` 输出 `readonly ok`，所有 `TypeError` 断言通过。

这段代码要解决的问题是：用代理实现全局只读语义，同时避免为每个嵌套对象预先递归创建代理。`cache` 与 `wrap` 的组合即“懒代理”：只有真正访问到的对象才会被包装。

1. `wrap` 只包装对象，基本类型直接返回，避免创建无意义代理。
2. 读路径 `Reflect.get(t, prop, receiver)` 后再调用 `wrap`，使嵌套对象第一次被读取时才变成只读代理。
3. 写路径的三类 trap 都显式抛 `TypeError`，保证严格模式下有明确的失败信息。
4. `WeakMap` 缓存确保同一个对象始终返回同一个代理，便于比较行为一致。

## 4. 响应式系统：嵌套懒代理与数组

### 4.1 核心实现

下面实现一个极简响应式系统：`effect` 注册副作用，`track` 收集依赖，`trigger` 派发更新，`reactive` 通过 `get` 做嵌套懒代理。数组支持由数组内部方法与 `length` 触发的特性自然获得。

```js
'use strict';
const assert = require('node:assert/strict');

// 第 1 段：activeEffect 与依赖容器
let activeEffect = null;
const targetMap = new WeakMap();

function track(target, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let deps = depsMap.get(key);
  if (!deps) {
    deps = new Set();
    depsMap.set(key, deps);
  }
  deps.add(activeEffect);
}

function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  if (!deps) return;
  for (const fn of [...deps]) {
    fn();
  }
}

// 第 2 段：effect 注册与执行
function effect(fn) {
  const run = () => {
    activeEffect = run;
    try {
      fn();
    } finally {
      activeEffect = null;
    }
  };
  run();
  return run;
}

// 第 3 段：reactive 懒代理
const reactiveCache = new WeakMap();

function isObject(value) {
  return value !== null && typeof value === 'object';
}

function reactive(target) {
  if (!isObject(target)) return target;
  if (reactiveCache.has(target)) return reactiveCache.get(target);

  const proxy = new Proxy(target, {
    get(t, key, receiver) {
      track(t, key);
      const value = Reflect.get(t, key, receiver);
      if (isObject(value)) {
        return reactive(value);
      }
      return value;
    },
    set(t, key, value, receiver) {
      const old = Reflect.get(t, key, receiver);
      const ok = Reflect.set(t, key, value, receiver);
      if (ok && !Object.is(old, value)) {
        trigger(t, key);
      }
      return ok;
    },
    deleteProperty(t, key) {
      const had = Object.prototype.hasOwnProperty.call(t, key);
      const ok = Reflect.deleteProperty(t, key);
      if (ok && had) {
        trigger(t, key);
      }
      return ok;
    },
  });

  reactiveCache.set(target, proxy);
  return proxy;
}

// 验证标准
const state = reactive({
  count: 0,
  user: { name: 'Ada' },
  nums: [1, 2],
});

// 第 4 段：基本响应式
const seen = [];
const stop = effect(() => seen.push(`count=${state.count}`));
state.count = 1;
state.count = 2;
assert.deepEqual(seen, ['count=0', 'count=1', 'count=2']);
stop();

// 第 5 段：嵌套懒代理
const nestedSeen = [];
const stopNested = effect(() => nestedSeen.push(state.user.name));
state.user.name = 'Grace';
assert.deepEqual(nestedSeen, ['Ada', 'Grace']);
stopNested();

// 第 6 段：数组 length 与 push
const arrSeen = [];
const stopArr = effect(() => arrSeen.push(state.nums.length));
state.nums.push(3);
assert.deepEqual(arrSeen, [2, 3]);
stopArr();

console.log('reactive ok');
```

验证标准：`node reactive.js` 输出 `reactive ok`，预期三个 `deepEqual` 分别为 `['count=0', 'count=1', 'count=2']`、`['Ada', 'Grace']`、`[2, 3]`。

这段代码要解决的问题是：实现可运行的最小响应式内核，并证明它同时支持普通属性、嵌套对象与数组。其可靠性依赖 `WeakMap -> Map -> Set` 三级依赖结构和 Proxy 对数组内部方法的可拦截性。

1. 第 1 段中 `activeEffect` 标记当前正在运行的 effect，`track` 只有在其非空时收集依赖，避免普通读取造成污染。
2. 第 2 段 `effect` 第一次同步执行 `fn`，之后每次被 `trigger` 再执行；这里没有做依赖清理，是刻意的简化。
3. 第 3 段 `get` 先 `track(t, key)`，读到对象值时返回 `reactive(value)`，实现嵌套懒代理；函数不满足 `isObject`，所以方法不会被错误包装。
4. 第 4 段每次 `state.count` 赋值都触发 effect，结果按时间顺序压入数组。
5. 第 5 段读取 `state.user.name` 时会分别在 state 的 `user` 键和 user 的 `name` 键上收集依赖，修改 `name` 时能触发 effect。
6. 第 6 段 `push` 会通过 `[[Set]]` 修改 `length`，数组自身的 exotic 行为使该路径仍然经过 Proxy，最终触发 `length` 键的 effect。

## 5. 校验代理与负索引数组

### 5.1 校验代理

校验代理用于在数据进入 target 之前执行类型与范围检查，赋值和 `Object.defineProperty` 两条写入路径都覆盖。

```js
'use strict';
const assert = require('node:assert/strict');

function createValidator(target, rules) {
  return new Proxy(target, {
    set(t, prop, value, receiver) {
      if (rules[prop]) {
        const result = rules[prop](value);
        if (result !== true) {
          throw new TypeError(result || `Invalid value for ${String(prop)}`);
        }
      }
      return Reflect.set(t, prop, value, receiver);
    },
    defineProperty(t, prop, descriptor) {
      if (rules[prop] && 'value' in descriptor) {
        const result = rules[prop](descriptor.value);
        if (result !== true) {
          throw new TypeError(result || `Invalid value for ${String(prop)}`);
        }
      }
      return Reflect.defineProperty(t, prop, descriptor);
    },
  });
}

// 第 1 段：通过 set 路径校验
const person = createValidator({}, {
  age(value) {
    if (!Number.isInteger(value)) return 'age must be integer';
    if (value < 0 || value > 200) return 'age out of range';
    return true;
  },
});

person.age = 30;
assert.equal(person.age, 30);

// 第 2 段：非法值必须抛错
assert.throws(() => {
  person.age = 'old';
}, /age must be integer/);
assert.throws(() => {
  person.age = 300;
}, /age out of range/);

// 第 3 段：defineProperty 路径也要校验
assert.throws(() => {
  Object.defineProperty(person, 'age', { value: 18.5 });
}, /age must be integer/);

console.log('validator ok');
```

验证标准：`node validator.js` 输出 `validator ok`，预期抛出的 `TypeError` 消息分别包含 `age must be integer`、`age out of range`、`age must be integer`。

这段代码要解决的问题是：保证 `set` 和 `defineProperty` 两条写入路径都不可绕过校验。规则函数返回 `true` 表示通过，否则抛出带原因的 `TypeError`。

1. 第 1 段只对 `age` 属性挂载规则，写入合法值时使用 `Reflect.set` 完成默认写入。
2. 第 2 段验证字符串年龄和越界年龄分别触发不同错误消息。
3. 第 3 段说明 `Object.defineProperty` 不经过 `set` trap，所以必须单独实现 `defineProperty`。

### 5.2 负索引数组

负索引数组让 `arr[-1]` 等价于访问 `arr[arr.length - 1]`，同时保留数组原有 `length` 语义。

```js
'use strict';
const assert = require('node:assert/strict');

function createNegArray(source) {
  return new Proxy(source, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && /^-\d+$/.test(prop)) {
        const real = target.length + Number(prop);
        return Reflect.get(target, real, receiver);
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      if (typeof prop === 'string' && /^-\d+$/.test(prop)) {
        const real = target.length + Number(prop);
        if (real < 0) {
          throw new RangeError('negative index out of range');
        }
        return Reflect.set(target, real, value, receiver);
      }
      return Reflect.set(target, prop, value, receiver);
    },
  });
}

// 第 1 段：读取负索引
const arr = createNegArray(['a', 'b', 'c']);
assert.equal(arr[-1], 'c');
assert.equal(arr[-2], 'b');

// 第 2 段：写入负索引
arr[-1] = 'C';
assert.equal(arr[2], 'C');
assert.equal(arr[-1], 'C');
assert.equal(arr.length, 3);

// 第 3 段：越界行为
assert.equal(arr[-5], undefined);
assert.throws(() => {
  arr[-9] = 'x';
}, RangeError);

console.log('neg-index ok');
```

验证标准：`node neg-index.js` 输出 `neg-index ok`，预期读取 `arr[-1]` 返回 `'c'`，写入后返回 `'C'`，`arr[-9] = 'x'` 抛 `RangeError`。

这段代码要解决的问题是：让数组支持 `-1`、`-2` 等负索引语法，同时不破坏数组原始的索引与 `length` 行为。关键是负索引不是数组自带语义，必须由 `get` 和 `set` trap 统一换算。

1. `prop` 在属性访问时会被转换为字符串，因此正则 `/^-\d+$/` 能匹配 `'-1'`。
2. `real` 通过 `target.length + Number(prop)` 换算，再交给 `Reflect` 执行真实数组操作。
3. `set` 中对 `real < 0` 抛 `RangeError`，这是自定义行为；`get` 对越界负索引返回 `undefined`，与普通越界数组读取保持一致。

## 6. 观察者与 Proxy.revocable

### 6.1 观察者

观察者代理在属性读取、写入、删除时通知回调，可用于监控对象变更。这里用 `on` 返回取消订阅函数，避免监听器永久泄漏。

```js
'use strict';
const assert = require('node:assert/strict');

function observable(target) {
  const listeners = new Map();

  function emit(prop, type, value, oldValue) {
    const direct = listeners.get(prop) || new Set();
    const all = listeners.get('*') || new Set();
    for (const cb of direct) cb({ type, prop, value, oldValue });
    for (const cb of all) cb({ type, prop, value, oldValue });
  }

  const proxy = new Proxy(target, {
    get(t, prop, receiver) {
      const value = Reflect.get(t, prop, receiver);
      if (typeof prop === 'string') {
        emit(prop, 'get', value, undefined);
      }
      return value;
    },
    set(t, prop, value, receiver) {
      const old = Reflect.get(t, prop, receiver);
      const ok = Reflect.set(t, prop, value, receiver);
      if (ok) {
        emit(prop, 'set', value, old);
      }
      return ok;
    },
    deleteProperty(t, prop) {
      const old = Reflect.get(t, prop);
      const ok = Reflect.deleteProperty(t, prop);
      if (ok) {
        emit(prop, 'delete', undefined, old);
      }
      return ok;
    },
  });

  return {
    proxy,
    on(prop, cb) {
      if (!listeners.has(prop)) {
        listeners.set(prop, new Set());
      }
      listeners.get(prop).add(cb);
      return () => listeners.get(prop).delete(cb);
    },
  };
}

// 第 1 段：订阅 name 属性
const seen = [];
const source = observable({ name: 'Ada' });
const off = source.on('name', (e) => seen.push(`${e.type}:${e.value}`));

// 第 2 段：读取与写入
assert.equal(source.proxy.name, 'Ada');
source.proxy.name = 'Grace';
assert.deepEqual(seen, ['get:Ada', 'set:Grace']);

// 第 3 段：取消订阅后不再通知
off();
source.proxy.name = 'Linus';
assert.deepEqual(seen, ['get:Ada', 'set:Grace']);

console.log('observer ok');
```

验证标准：`node observer.js` 输出 `observer ok`，预期 `seen` 数组最终为 `['get:Ada', 'set:Grace']`。

这段代码要解决的问题是：在不侵入业务对象的前提下，建立基于属性事件的观察者机制。`listeners` 是普通 `Map`，每个 key 对应一组回调，`on` 返回的取消函数方便生命周期管理。

1. `get` trap 在读取属性时发出 `get` 事件，但需要排除 `Symbol` key 等非字符串属性，避免内部遍历产生噪音。
2. `set` trap 先用 `Reflect.get` 取旧值，再用 `Reflect.set` 写新值，成功后发出 `set` 事件。
3. `on` 返回 `() => listeners.get(prop).delete(cb)`，第 3 段验证取消订阅后不会再追加事件。

### 6.2 Proxy.revocable

`Proxy.revocable` 返回 `{ proxy, revoke }`。调用 `revoke` 后，对 proxy 的任何拦截操作都会抛 `TypeError`，但 `typeof` 不会触发 trap。

```js
'use strict';
const assert = require('node:assert/strict');

// 第 1 段：创建可撤销代理
const { proxy, revoke } = Proxy.revocable({}, {
  get(target, prop) {
    return `[[${String(prop)}]]`;
  },
});

// 第 2 段：撤销前正常
assert.equal(proxy.foo, '[[foo]]');

// 第 3 段：撤销后读取、写入、删除全部抛 TypeError
revoke();
assert.throws(() => proxy.foo, TypeError);
assert.throws(() => {
  proxy.foo = 1;
}, TypeError);
assert.throws(() => {
  delete proxy.foo;
}, TypeError);

// typeof 不触发 trap，因此不会抛错
assert.equal(typeof proxy, 'object');

console.log('revocable ok');
```

验证标准：`node revocable.js` 输出 `revocable ok`，预期撤销后三类操作均抛 `TypeError`，`typeof proxy` 返回 `'object'`。

这段代码要解决的问题是：提供一条“关闭代理”的硬路径。可用于构建一次性权限对象、临时审计窗口，或在数据暴露后撤销访问。

1. `Proxy.revocable` 的第二个参数与 `new Proxy` 的 handler 完全一致。
2. `revoke` 是幂等关闭函数，调用后代理不再可操作。
3. `typeof proxy` 不依赖任何对象内部方法，因此撤销后仍返回 `'object'`。

## 7. this 绑定与内部槽

### 7.1 私有字段无法简单转发

Proxy 与 target 是不同身份的对象，因此私有字段读取依赖的 `this` 必须是原始实例，而不是 proxy。下面用私有字段和私有方法验证。

```js
'use strict';
const assert = require('node:assert/strict');

class Secret {
  #secret;
  constructor(secret) {
    this.#secret = secret;
  }
  getSecret() {
    return this.#secret;
  }
}

const original = new Secret('123456');

// 第 1 段：朴素空代理读取私有字段会失败
const naive = new Proxy(original, {});
assert.throws(() => naive.getSecret(), TypeError);

// 第 2 段：访问器 getter 依赖 this 时同样要恢复 target
class Accessor {
  #value = 42;
  get value() {
    return this.#value;
  }
}

const accessor = new Accessor();
const fixedAccessor = new Proxy(accessor, {
  get(target, prop, receiver) {
    const value = target[prop];
    return value;
  },
});
assert.equal(fixedAccessor.value, 42);

// 第 3 段：方法需要 this-recovering 包装
const fixedMethod = new Proxy(original, {
  get(target, prop, receiver) {
    const value = target[prop];
    if (typeof value === 'function') {
      return function (...args) {
        const self = this === receiver ? target : this;
        return value.apply(self, args);
      };
    }
    return value;
  },
});
assert.equal(fixedMethod.getSecret(), '123456');

console.log('private-field ok');
```

验证标准：`node private-field.js` 输出 `private-field ok`，预期 `naive.getSecret()` 抛 `TypeError`，两个修复后的代理返回 `42` 与 `'123456'`。

这段代码要解决的问题是：Proxy 无法通过 `proxy.method()` 自然保留私有槽访问所需的 `this`，必须显式把方法调用时的 this 恢复到 target。

1. 第 1 段 `naive.getSecret()` 中，方法内部的 `this` 是 proxy，而 proxy 没有 `#secret` 私有槽，因此抛错。
2. 第 2 段直接使用 `target[prop]` 读取 accessor，使 getter 的 this 是 target，适用于只读访问器。
3. 第 3 段对函数做包装：如果调用方 this 是 receiver，则替换为 target；否则保留外部显式绑定的 this。

### 7.2 Map 内部槽

`Map` 的方法和 `size` 访问器依赖内部槽 `[[MapData]]`。空代理会因 this 不是真实 Map 而抛 `TypeError`。

```js
'use strict';
const assert = require('node:assert/strict');

const map = new Map([['k', 1]]);

// 第 1 段：空代理读取 size 会失败
const naive = new Proxy(map, {});
assert.throws(() => naive.size, TypeError);

// 第 2 段：恢复 this 后即可正常工作
const fixed = new Proxy(map, {
  get(target, prop, receiver) {
    const value = target[prop];
    if (typeof value === 'function') {
      return function (...args) {
        const self = this === receiver ? target : this;
        return value.apply(self, args);
      };
    }
    return value;
  },
});

assert.equal(fixed.size, 1);
assert.equal(fixed.get('k'), 1);
fixed.set('k2', 2);
assert.equal(map.get('k2'), 2);

console.log('map-slot ok');
```

验证标准：`node map-slot.js` 输出 `map-slot ok`，预期 `naive.size` 抛 `TypeError`，修复后 `size`、`get`、`set` 均正常。

这段代码要解决的问题是：对 `Map`、`Set`、`Date` 等含内部槽的内建对象，不能靠空 handler 做“无操作转发”，因为内部槽访问依赖真实的 this 身份。

1. 第 1 段验证 `size` 读取失败，错误来自 `Map.prototype.size` 的 this 校验。
2. 第 2 段复用 this-recovering 包装方法，使 `set` 调用能写入原始 `map`。
3. 该方案只适用于可以通过 target 读取的方法和属性，不能真正“协议级转发” Map 操作，但足以修复常见调用路径。

### 7.3 对比表：Proxy vs Object.defineProperty vs getter/setter

| 维度 | Proxy | Object.defineProperty | getter/setter |
| --- | --- | --- | --- |
| 拦截范围 | 13 种内部方法：读、写、删除、in、遍历、定义、原型、函数调用等 | 仅单个属性的 get、set、value、writable、configurable、enumerable | 仅单个属性的读与写 |
| 新增属性 | 自动拦截 | 新增属性需再次定义 | 新增属性不会自动拦截 |
| 数组索引与 length | 可拦截 | 需预设索引或 length 描述符 | 处理困难 |
| 删除、in、Object.keys | 可拦截 | 不可直接拦截 | 不可直接拦截 |
| 配置成本 | 对象级一次创建 | 属性级多次调用 | 属性级编写 |
| 原型链与 receiver | 需在 trap 中正确处理 | 受 getter/setter 自身 this 规则约束 | 受 this 约束 |
| 适合场景 | 全量响应式、校验、日志、虚拟对象 | 精确控制单个已有属性 | 局部封装访问器 |

## 8. 常见陷阱

- 在 `get` trap 中写 `return target[prop]` 而不是 `return Reflect.get(target, prop, receiver)`，会丢失原型链访问器中的 `this`。
- 在 trap 中调用 proxy 自身的方法，例如 `set` trap 中又执行 `proxy[prop] = value`，会产生无限递归。应操作 `target` 或使用 `Reflect.set(target, ...)`。
- `Reflect` 方法不会“脱代理”：如果对 proxy 调用 `Reflect.get(proxy, key)`，仍然会触发 proxy 的 `get` trap，可能递归。
- 对含私有字段的类实例或 `Map`、`Set`、`Date` 等内建对象做空代理，会因 this 或内部槽不匹配抛 `TypeError`。
- 违反 target 的不可扩展性或不可配置属性约束，会让引擎在 trap 返回后抛 `TypeError`；不要试图用 Proxy 隐藏 target 上不可配置的属性。
- `Proxy.revocable` 撤销后，大多数操作都会抛错，但 `typeof` 不触发 trap。
- class field 使用 `[[DefineOwnProperty]]` 语义，所以派生类字段不会触发父类同名的 setter；不要据此推断赋值和定义属性是同一回事。
- `ownKeys` 返回值必须是数组，且包含合法的 string 或 symbol key；非数组返回、重复 key 等都会导致引擎抛 `TypeError`。

## 9. 面试题与答题要点

1. Proxy 与 Reflect 分别解决什么问题？

要点：Proxy 负责拦截对象内部方法，Reflect 负责以函数形式调用这些内部方法的默认语义。它们的方法名一一对应，常见组合是 trap 中用 `Reflect.get/set` 完成转发，并用 receiver 保持 this。

2. 13 个 trap 分别对应哪些内部方法？

要点：`get/getOwnPropertyDescriptor/defineProperty/set/has/deleteProperty/ownKeys/getPrototypeOf/setPrototypeOf/isExtensible/preventExtensions/apply/construct`。要能说明 `Object.keys` 触发 ownKeys、`in` 触发 has、`new` 触发 construct、函数调用触发 apply。

3. 什么是 Proxy 的不变式？违反时会发生什么？

要点：不变式是与 target 的不可配置属性和不可扩展性相关的强制性语义。例如不可配置属性不能被报告为不存在，不可扩展对象不能多出新 key。trap 返回违反不变式的结果时，引擎抛出 `TypeError`。

4. `get` trap 中的 receiver 有什么作用？

要点：receiver 是属性访问的实际起点。访问器 getter 调用时 this 应指向 receiver。若在 trap 中只写 `target[prop]`，getter 的 this 变成 target；若用 `Reflect.get(target, prop, receiver)`，原型链下游访问者的属性才能被正确读取。

5. Proxy 与 Object.defineProperty 的核心差异是什么？

要点：Proxy 是对象级拦截，覆盖读写之外的删除、遍历、原型等 13 类操作，并且能拦截新增属性；defineProperty 是属性级拦截，只覆盖单个属性的描述符，新增属性需要再次定义。这也是 Vue 3 响应式转向 Proxy 的常见理由。

6. 为什么空 Proxy 包裹 Map 或含私有字段的对象会抛错？如何修复？

要点：Proxy 是独立身份，内部槽或私有字段访问校验 this 必须是原始对象。空代理转发后 this 变成 proxy，导致 TypeError。修复方式是在 get trap 中取到方法后做 this-recovering：如果调用时 this 是 receiver，则改为 target 调用原方法。

7. 如何实现负索引数组？

要点：在 `get` 和 `set` trap 中识别字符串形式的负整数 key，换算为 `target.length + Number(key)`，再用 `Reflect` 转发。写入越界负索引可自定义抛 `RangeError`，正常索引保持默认行为。

8. 简单说明响应式系统的 track 与 trigger 设计。

要点：用 `WeakMap<target, Map<key, Set<effect>>>` 保存依赖。读取属性时 `track(target, key)` 收集当前 activeEffect，写入属性时 `trigger(target, key)` 重新执行该 key 的 effect。嵌套对象可在 get 中返回 `reactive(value)` 做懒代理，数组通过代理拦截 length 变更实现响应。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Proxy.revocable()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/revocable) | 撤销代理是观察者模式的收尾关键，可避免内存泄漏。 | 读 revocable 返回值与示例，写一个销毁后访问抛 TypeError 的观察者。 |
| [this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this) | this 规则是理解 receiver 与内部槽报错的前提。 | 读普通函数、方法、箭头与 bind 各节，解释 receiver 为何能改写 this。 |
| [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) | 总览各陷阱与不变式，是本页知识地图。 | 先读 handler 表与不变量章节，再逐条对照自己写的代理验证。 |
| [Proxy() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy) | 构造器参数与 target/handler 限制常被忽略。 | 读参数说明与异常条件，验证 target 为 null 或非对象时的报错。 |
| [handler.getOwnPropertyDescriptor()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/getOwnPropertyDescriptor) | 该陷阱的不变式最易踩，涉及不可配置属性。 | 读不变量小节，构造不可配置属性场景，观察代理抛出的 TypeError。 |
| [handler.get()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get) | get 陷阱与 receiver 的官方定义，日志与懒代理必读。 | 重点读 receiver 说明与不变量，把日志代理的 get 改为 Reflect.get 传 receiver。 |
| [handler.has()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/has) | has 陷阱决定 in 与数组负索引的行为。 | 读不变量一节，实现负索引数组的 has，验证 -1 in arr 的结果。 |
| [handler.set()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/set) | set 陷阱是校验代理与响应式写入的核心。 | 读返回值与 receiver 说明，写只读代理并确认严格模式下抛错。 |
| [handler.ownKeys()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/ownKeys) | ownKeys 的不变式坑最多，牵涉不可配置与不可扩展。 | 读不变量章节，用 Object.keys 探测代理，验证 ownKeys 返回值约束。 |
| [Reflect](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect) | Reflect 与对象内部方法一一对应，是各种陷阱的解药。 | 读方法列表，把代理中每个操作换成 Reflect 同名调用并观察差异。 |
| [Reflect.apply()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) | Reflect.apply 用于修正 this，与内部槽章节直接相关。 | 读参数与示例，用它转发 Map.prototype.get 这类内部槽方法。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 2 响应式源码目录](https://github.com/vuejs/vue/tree/main/src/core/observer) | 对比 defineProperty 与 Proxy，理解响应式方案为何换代。 | 读 Vue 2 defineReactive 与数组劫持，列出 Proxy 能解决而它不能的三点。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 元编程](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming) | 边写校验代理边对照 Vue 3 响应式，把抽象 API 落到真实场景。 | 先自己实现校验 set/get，再对照文中 Vue 3 说明，画出依赖收集与触发流程。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格：列配置从服务端下发 | 只读代理、不可配置属性不变式 | 自写 `readonly()` 包装 + 原始配置保留 | target 被 `Object.freeze` 后，代理层不能再声称属性可写 |
| 低端安卓首屏加载：埋点 SDK 统计配置字段 | 日志代理、`Reflect.get` 的 receiver | `Proxy.revocable` 包住配置，首屏结束撤销 | 撤销后访问抛 `TypeError`，后续代码要改回原始对象 |
| 多人协作白板：图元节点模型 | 嵌套懒代理、内部槽与 this 恢复 | Proxy 包模型 + 差值协议 | `Map` 的方法要绑回 target，否则报内部槽错误 |
| 用户注册表单即时校验 | 校验代理、`set` 陷阱 | Proxy + 规则表 | 拦截失败要在写入前返回，不能先写入再回滚 |
| 前端埋点 SDK 采集点击元素属性 | 日志代理、`get` 陷阱 | Proxy 包事件目标 | 代理实例不能直接传给需要原生节点的 DOM API |
| 微前端沙箱隔离 `window` | 13 个陷阱、`defineProperty` 陷阱 | Proxy 代理 `window` 访问 | 逃逸到闭包里的原生对象会绕过代理，要配合快照还原 |
| Node 服务启动期配置只读 | 只读代理、Reflect 转发 | Proxy 包配置，启动完成后切换 | 代理对象不能直接 `JSON.stringify` 后当配置再加载 |
| 图表数据取末尾 N 项 | 负索引数组、`[[OwnPropertyKeys]]` | Proxy 包数组，`get` 陷阱映射负索引 | 数组 `length` 与不可配置索引会触发不变式检查 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格列配置下发

**业务背景**：平台把列配置从服务端下发到表格组件，业务线变多后配置变成三层嵌套，字段总数随业务线数量线性增加。线上出现过业务代码就地改配置，导致同一页面两次渲染的列不一致。

**怎么用本页知识解决**：思路是用只读代理包住下发配置，读到子对象时惰性包装，写入与删除直接抛 `TypeError`，让越权修改在开发阶段暴露出来。

```js
const cache = new WeakMap();                 // 同一子对象只包一次
function readonly(target) {
  if (!target || typeof target !== 'object') return target;
  if (cache.has(target)) return cache.get(target);
  const p = new Proxy(target, {
    get(t, key, receiver) {
      const v = Reflect.get(t, key, receiver);        // 转发读取并保留 receiver
      return typeof v === 'object' ? readonly(v) : v; // 子对象惰性包装
    },
    set() { throw new TypeError('列配置只读'); },      // 拦截赋值
    defineProperty() { throw new TypeError('列配置只读'); },
    deleteProperty() { throw new TypeError('列配置只读'); },
  });
  cache.set(target, p);
  return p;
}
const columns = readonly(rawColumns);        // 下发给业务组件
```

- `get` 陷阱用 `Reflect.get` 转发并传 `receiver`，配置里的 getter 才能拿到正确的 `this`。
- 子对象惰性包装：只有真被读到的分支才建代理，没读到的分支不付出成本。
- `set`、`defineProperty`、`deleteProperty` 覆盖写值、改描述符、删属性三条修改路径。
- target 若已被 `Object.freeze`，代理层不能再声称属性可配置，否则命中不变式抛 `TypeError`。
- 这里不需要 `Proxy.revocable`，列配置的生命周期与页面一致。

**怎么度量收益**：用 Chrome DevTools Performance 面板录制「打开表格页到首帧渲染」，对比接入前后的 Scripting 时长。代码里用 `performance.mark` 与 `performance.measure` 标记 `applyColumns`，指标是这段 measure 的时长与线上 `TypeError` 上报条数。

**什么时候不该用**：

- 配置只在启动时读一次并且随后丢弃，加代理只多出一层函数调用。
- 配置要 `postMessage` 或 `structuredClone` 给 Worker，代理对象不可克隆，必须先取原始对象。

#### 场景 2：低端安卓首屏加载的埋点 SDK

**业务背景**：首屏要从一份页面配置里读标题、按钮文案、实验开关这些字段，埋点 SDK 想知道哪些字段真被读到，用来裁剪配置体积。低端安卓上主线程被 JS 占满时，首屏白屏时间会拉长。

**怎么用本页知识解决**：思路是用 `Proxy.revocable` 包住配置，只统计首屏阶段的读取，首屏结束后立即撤销，把开销限制在一个时间段内。

```js
const stats = { count: 0, keys: new Set() };
const { proxy, revoke } = Proxy.revocable(config, {
  get(t, key, receiver) {
    if (typeof key === 'string') {          // Symbol 键不计入字段统计
      stats.count += 1;                     // 累计读取次数
      stats.keys.add(key);                  // 记录被读的字段名
    }
    return Reflect.get(t, key, receiver);   // 转发读取并保留 receiver
  },
});
renderFirstScreen(proxy);                   // 首屏阶段用代理读取配置
revoke();                                   // 首屏结束立刻撤销代理
```

- 撤销之后任何对 `proxy` 的读取都抛 `TypeError`，埋点开销不会留到交互阶段。
- 被撤销的是代理，原始 `config` 仍然可读，后续代码改读原始对象。
- 只统计 string 键，避免把 Symbol 键和引擎内部调用混进字段清单。
- 用 `Reflect.get` 传 `receiver`，配置里若有 getter，其 `this` 仍是访问发生的位置。
- 统计结果在撤销前上报，上报失败不影响首屏渲染。

**怎么度量收益**：在首屏开始与结束各打一个 `performance.mark`，用 `performance.measure` 取差值。同时看 Performance 面板里主线程超过 50ms 的长任务条数，指标是这段 measure 的 P75 与长任务条数。

**什么时候不该用**：

- 只需要字段清单时，构建期扫代码就能拿到读取点，运行期加代理是多一层开销。
- 读取发生在 `requestAnimationFrame` 回调里逐帧触发，陷阱调用次数随帧数放大。

#### 场景 3：多人协作白板的节点模型

**业务背景**：白板把每个图元存成一个对象，远端操作到达时按 id 找到节点并改属性，节点放在 `Map` 里。多人同时拖动时一秒内会收到成批操作，画布内容越多节点数量越大。

**怎么用本页知识解决**：思路是用 Proxy 包住模型对象，`get` 陷阱里把方法 `this` 绑回 target，嵌套对象惰性包装，`set` 陷阱用 target 当接收者。

```js
const cache = new WeakMap();                 // 同一对象只包一次
function wrap(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (cache.has(obj)) return cache.get(obj);
  const p = new Proxy(obj, {
    get(t, key, receiver) {
      const v = Reflect.get(t, key, receiver);
      if (typeof v === 'function') return v.bind(t);  // Map 方法 this 回到 target
      if (v && typeof v === 'object') return wrap(v);  // 嵌套对象惰性包装
      return v;
    },
    set(t, key, value, receiver) {
      return Reflect.set(t, key, value, t);            // 写入落在 target 上
    },
  });
  cache.set(obj, p);
  return p;
}
```

- 方法通过 `bind` 回到 target，`Map` 的内部槽才找得到，直接返回代理会在 `map.get` 时抛 `TypeError`。
- `set` 陷阱用 `t` 而不是 `receiver` 当接收者，属性落在 target 上，代理层不会被写脏。
- `WeakMap` 缓存保证同一对象两次读到同一个代理，可以用 `===` 比较。
- 嵌套对象惰性包装，远端只改一个节点时不遍历整棵树。
- 数组节点的负索引可在 `get` 陷阱里把 `-1` 映射到 `length - 1`，同时核对 `length` 与不可配置索引的不变式。

**怎么度量收益**：在「收到一批远端操作」到「画面更新完成」之间用 `performance.measure` 取时长。用 Memory 面板做堆快照，对比包装前后的对象数量与保留大小。

**什么时候不该用**：

- 白板只在单机使用、没有远端同步时，直接改对象就够。
- 节点要 `postMessage` 给 Worker 做几何计算，先深拷贝成普通对象。

### 行业先进实践

**Vue 3 的响应式依赖收集（出处：Vue 3 官方文档「响应式基础」与 @vue/reactivity 源码）**
官方文档写明 Vue 3 的响应式基于 Proxy，能拦截新增与删除属性。它把「读时收集依赖、写时触发更新」拆成 track 与 trigger，代理只负责转发到这两个函数。借鉴方式：代理层只做转发，副作用调度放到单独模块，便于单测。

**Proxy 沙箱隔离 `window`（出处：qiankun 官方文档「JS 沙箱」）**
文档描述用 Proxy 拦截子应用对 `window` 的读写，卸载时还原改动。这样做能让同页多个子应用共用全局对象而不互相污染。需核对官方文档：确认该节对 Proxy 拦截范围的说明，以及运行环境不支持 Proxy 时的降级方案。

**Immer 的 draft 与补丁记录（出处：Immer 官方文档）**
`produce` 返回的 draft 由 Proxy 实现，写入被记录成 patches，原始对象保持不变。把变更记录与应用变更分开，撤销与重放就有了数据来源。借鉴方式：需要撤销功能时，先让代理只记录变更，再决定何时应用到真实对象。

**MobX 的 Proxy 实现开关（出处：MobX 官方文档 configuration）**
MobX 的 configuration 提供 `useProxies` 选项，用来决定 observable 走 Proxy 实现还是 ES5 实现。这个开关让同一套 API 覆盖不同运行环境。借鉴方式：自研代理工厂也留一个能力检测入口，不支持 Proxy 时返回冻结的原对象。

**Valtio 的代理状态与快照（出处：Valtio 官方文档与 README）**
Valtio 把状态对象包成代理，读 `snapshot()` 得到不可变快照供渲染层使用。写操作落在代理上，快照负责让比较逻辑拿到稳定引用。借鉴方式：渲染与逻辑之间用快照隔开，避免把代理对象当作数据源传遍组件树。

### 从学到用：落地路线

1. **试点**：在只读配置或埋点统计这类边界清晰的模块里加一层代理，业务代码不改动。验收标准：该模块单测通过，并新增一条「写入即抛 `TypeError`」的用例。
2. **验证**：用 Performance 面板录制加代理前后的同一交互，比对 Scripting 时长，再做一次堆快照确认代理对象数量。验收标准：时长差值在第 1 步测出的基线范围内，不变式相关的 `TypeError` 只出现在测试里。
3. **推广**：把代理工厂抽成公共包，只允许 `get`、`set`、`defineProperty` 这几类陷阱，并附一份不变式检查清单。验收标准：README 写清支持的环境与不支持 Proxy 时的降级路径。
4. **防回退**：CI 里对每个导出的工厂断言「代理不可克隆」与「撤销后访问抛错」。验收标准：CI 全绿，新增陷阱必须同时补一条不变式用例。

### 动手作业

**目标**：实现 `guardedConfig(target)`，给配置对象同时加只读与字段访问统计，并提供不支持 Proxy 时的降级路径。

**步骤**：

1. 准备一份三层嵌套的配置对象，先写出深度遍历时预期访问到的键路径清单。
2. 实现 `guardedConfig`，`get` 陷阱记录字段名与次数，`set`、`defineProperty`、`deleteProperty` 陷阱抛 `TypeError`。
3. 在 `get` 陷阱里用 `Reflect.get(t, key, receiver)` 转发，给其中一个字段定义 getter，断言 getter 里的 `this` 是代理对象。
4. 用 `WeakMap` 缓存已包装的子对象，写用例断言同一子对象两次读取拿到同一个代理。
5. 用 `Proxy.revocable` 暴露 `revoke`，断言撤销后读代理抛 `TypeError`，读原始对象仍然正常。
6. 在 Node 与一个目标浏览器里各跑一次测试，用 `performance.now()` 包住 1000 次读取，把耗时记成基线。
7. 写降级路径：`typeof Proxy === 'undefined'` 时返回冻结后的原对象，并在 README 说明降级时统计功能不可用。

**验收标准**：

- 对配置写值、删属性、改属性描述符各抛一次 `TypeError`，测试断言错误类型。
- getter 用例里 `this === 返回的代理对象`，证明 `receiver` 传递正确。
- 同一嵌套子对象两次访问用 `===` 断言为同一个代理。
- `revoke` 之后读代理抛 `TypeError`，同一个键从原始对象读得到值。
- 两条运行命令的输出与耗时基线都贴进 README。

