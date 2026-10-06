---
title: "Object API 与属性描述符"
description: "属性描述符、冻结、原型与对象 API 深度"
---

# Object API 与属性描述符

!!! abstract "核心结论"
    - 属性描述符是对象属性的元数据层，决定 writable/enumerable/configurable 与 value/get/set；defineProperty、freeze、Object.assign 等 API 都建立在同一套 [[Get]]/[[Set]]/[[DefineOwnProperty]] 内部方法之上。
    - 非 configurable 属性上的重定义必须满足规范不变式：不可改回 configurable、不可改 enumerable、不可在数据属性与访问器属性之间切换、non-writable 时不可改 value。
    - freeze/seal/preventExtensions 都只作用于对象自身，且不可逆；freeze 不会阻止访问器 setter 执行，也不会冻结原型链上的对象。
    - 属性枚举顺序不是简单的插入顺序：整数键按数值升序排在最前，字符串键按插入顺序，Symbol 键按插入顺序排在最后。
    - Proxy 拦截的是运行时操作（可撤销、可自动拦截新增属性），defineProperty 是定义时刻的一次性修改；immer 式不可变更新利用 Proxy 加写时复制实现结构共享。

## 1. 属性描述符：规范算法与引擎表示

### 1.1 数据属性与访问器属性

ECMA-262 中普通对象的每个自有属性都以 Property Descriptor（属性描述符）记录存在。描述符分为两类，二者互斥：

数据属性（data property）包含四个字段：

| 字段 | 含义 | 默认值 |
| --- | --- | --- |
| [[Value]] | 属性值 | undefined |
| [[Writable]] | 是否可赋值修改 | false |
| [[Enumerable]] | 是否出现在 for...in / Object.keys 等枚举中 | false |
| [[Configurable]] | 是否可删除、是否可改其它字段 | false |

访问器属性（accessor property）包含：

| 字段 | 含义 | 默认值 |
| --- | --- | --- |
| [[Get]] | getter 函数或 undefined | undefined |
| [[Set]] | setter 函数或 undefined | undefined |
| [[Enumerable]] | 同上 | false |
| [[Configurable]] | 同上 | false |

一次属性读取 `obj.x` 的规范过程是：调用 `obj` 的 [[Get]] 内部方法，即 OrdinaryGet：先在自有属性中查找，命中数据属性则返回 [[Value]]，命中访问器属性则调用 [[Get]]（以 `obj` 为 this）；未命中则沿 [[Prototype]] 链继续查找，直到 null。写操作 [[Set]]（OrdinarySet）类似：自有数据属性且 writable 为 true 时更新值；writable 为 false 时返回 false（严格模式调用方抛 TypeError）；访问器有 setter 则调用 setter；属性不存在则沿原型链查找，最终可能在 receiver 上创建自有数据属性。

从引擎视角看（以 V8 的公开设计为例，具体实现随版本演进，需核对 V8 文档）：对象有隐藏类（hidden class，V8 内部称 Map）用于快速确定属性在内存中的偏移，属性本身存储在 inline properties 和 properties backing store 中；描述符属性（READ_ONLY、DONT_ENUM、DONT_DELETE）作为属性元数据保存。频繁 delete、大量动态属性、defineProperty 设置非常规 attribute 会使对象从快速属性布局降级到字典模式（NameDictionary），访问速度显著下降，这也解释了为什么动态增删属性是性能敏感操作。

### 1.2 手写 safeDefineProperty：实现 OrdinaryDefineOwnProperty 的核心不变式

下面是简化版 `safeDefineProperty`，它先按规范检查不变式，再调用 `Reflect.defineProperty` 完成写入。真实规范使用完整 Property Descriptor Record 区分“字段缺失”与“显式 undefined”，本实现以 `!== undefined` 近似判断字段存在，教学用途够用。

```js
// 运行时：Node.js 18+，保存为 safe-define-property.mjs 后可直接 node 运行

function isAccessorDesc(d) {
  return d.get !== undefined || d.set !== undefined;
}

function isDataDesc(d) {
  return d.value !== undefined || d.writable !== undefined;
}

// 等价于规范中 OrdinaryDefineOwnProperty 对“已有自有属性”与“非扩展对象”的检查
function safeDefineProperty(obj, key, desc) {
  const current = Object.getOwnPropertyDescriptor(obj, key);
  const fields = ['value', 'writable', 'get', 'set', 'enumerable', 'configurable']
    .filter((f) => desc[f] !== undefined);

  // 空描述符：规范允许直接返回成功，不做任何修改
  if (fields.length === 0) return obj;

  const extensible = Object.isExtensible(obj);

  if (current === undefined) {
    // 属性不存在：对象必须可扩展
    if (!extensible) {
      throw new TypeError(`Cannot define property ${String(key)}: object is not extensible`);
    }
    if (!Reflect.defineProperty(obj, key, desc)) {
      throw new TypeError(`Reflect.defineProperty failed for ${String(key)}`);
    }
    return obj;
  }

  if (current.configurable === false) {
    // 不变量 1：不可把 configurable 改回 true
    if (desc.configurable === true) {
      throw new TypeError('Cannot set configurable to true on non-configurable property');
    }
    // 不变量 2：不可改变 enumerable
    if (desc.enumerable !== undefined && desc.enumerable !== current.enumerable) {
      throw new TypeError('Cannot change enumerable of non-configurable property');
    }
    const currentIsAccessor = current.get !== undefined || current.set !== undefined;
    // 不变量 3：数据属性与访问器属性不可互转（纯 generic 描述符除外）
    if ((isDataDesc(desc) || isAccessorDesc(desc)) && isAccessorDesc(desc) !== currentIsAccessor) {
      throw new TypeError('Cannot switch between data and accessor property');
    }
    if (currentIsAccessor) {
      // 不变量 4a：不可更换 getter / setter
      if (desc.get !== undefined && desc.get !== current.get) throw new TypeError('Cannot change getter');
      if (desc.set !== undefined && desc.set !== current.set) throw new TypeError('Cannot change setter');
    } else if (current.writable === false) {
      // 不变量 4b：non-writable 时，不可改回 writable，也不可改 value
      if (desc.writable === true) throw new TypeError('Cannot set writable to true on non-writable property');
      if (desc.value !== undefined && !Object.is(desc.value, current.value)) {
        throw new TypeError('Cannot change value of non-writable property');
      }
    }
  }

  if (!Reflect.defineProperty(obj, key, desc)) {
    throw new TypeError(`Reflect.defineProperty failed for ${String(key)}`);
  }
  return obj;
}

export { safeDefineProperty };
```

```js
// 验证标准：Node.js 18+，保存为 verify-safe-define-property.mjs 运行
// 预期输出：全部断言通过，进程正常退出，无输出
import assert from 'node:assert/strict';
import { safeDefineProperty } from './safe-define-property.mjs';

const o = {};
safeDefineProperty(o, 'x', { value: 1, writable: false, enumerable: true, configurable: false });
assert.strictEqual(o.x, 1);

// non-writable + non-configurable：值不同时禁止重定义
assert.throws(() => safeDefineProperty(o, 'x', { value: 2 }), TypeError);
// 同一值允许（SameValue 检查）
safeDefineProperty(o, 'x', { value: 1 });
// writable false 不可改回 true
assert.throws(() => safeDefineProperty(o, 'x', { writable: true }), TypeError);
// configurable false 不可改回 true
assert.throws(() => safeDefineProperty(o, 'x', { configurable: true }), TypeError);
// enumerable 不可变
assert.throws(() => safeDefineProperty(o, 'x', { enumerable: false }), TypeError);

// 访问器属性：冻结后不可换 getter、不可转成数据属性
const accessor = {};
safeDefineProperty(accessor, 'v', { get: () => 1, configurable: false });
assert.throws(() => safeDefineProperty(accessor, 'v', { get: () => 2 }), TypeError);
assert.throws(() => safeDefineProperty(accessor, 'v', { value: 2 }), TypeError);

// 非扩展对象不允许新增属性
const sealed = Object.freeze({ a: 1 });
assert.throws(() => safeDefineProperty(sealed, 'b', { value: 2 }), TypeError);

console.log('safeDefineProperty 全部断言通过');
```

## 2. Object.defineProperty 与 Proxy 对比

二者常被放在一起讨论，但解决的是不同层面的问题。`Object.defineProperty` 在“属性定义”这一时刻修改对象自身；`Proxy` 在“属性访问、赋值、删除、遍历”等每一次运行时操作处拦截，目标对象可以完全不被改动。

```js
// 运行时：Node.js 18+；演示 Proxy 可自动拦截“新属性”，这是 defineProperty 做不到的
const target = { x: 1 };
const p = new Proxy(target, {
  get(t, k, r) {
    console.log(`get ${String(k)}`);
    return Reflect.get(t, k, r);
  },
  set(t, k, v, r) {
    console.log(`set ${String(k)} = ${String(v)}`);
    return Reflect.set(t, k, v, r);
  },
});
p.x;       // 控制台打印：get x
p.y = 2;   // 控制台打印：set y = 2，新增属性同样被拦截
```

| 维度 | Object.defineProperty | Proxy |
| --- | --- | --- |
| 操作粒度 | 每次定义一个属性 | 拦截约 13 类内部方法（get/set/has/ownKeys/deleteProperty 等） |
| 是否修改目标对象 | 是，直接修改且默认不可逆 | 否，通过 trap 决定是否转发给目标 |
| 对新增属性自动生效 | 否，新增属性需要再次调用 defineProperty | 是，set trap 对任意 key 生效 |
| 拦截数组索引与 length | 困难，Vue 2 需要重写数组方法 | 能直接拦截 |
| 拦截 delete/in/遍历 | 不能 | 能（deleteProperty/has/ownKeys） |
| 可撤销性 | 否 | 是（Proxy.revocable） |
| 性能 | 定义时刻一次性成本 | 每次操作都有 trap 开销，易破坏 JIT 内联缓存，需要谨慎使用 |

## 3. 完整性三件套：preventExtensions / seal / freeze 与浅层性

### 3.1 三个 API 的规范语义

三者都是不可逆操作，且都只把目标对象的 [[Extensible]] 置为 false：

`Object.preventExtensions(obj)`：仅禁止新增属性，属性仍可删除、可修改、可改描述符（受 configurable 限制）。

`Object.seal(obj)`：在 preventExtensions 基础上，把全部自有属性的 [[Configurable]] 置为 false。不能再删除、不能再改描述符，但 writable 为 true 的数据属性仍可改值。

`Object.freeze(obj)`：在 seal 基础上，再把全部自有数据属性的 [[Writable]] 置为 false。访问器属性没有 [[Writable]] 字段，无法被置为只读，因此其 setter 仍然可以执行。

| 能力 | preventExtensions | seal | freeze |
| --- | --- | --- | --- |
| 新增属性 | 禁止 | 禁止 | 禁止 |
| 删除属性 | 允许 | 禁止 | 禁止 |
| 修改已有数据属性值 | 允许（若 writable 为 true） | 允许（若 writable 为 true） | 禁止 |
| 修改已有属性描述符 | 允许（若 configurable 为 true） | 禁止 | 禁止 |
| 访问器 setter 是否仍可执行 | 是 | 是 | 是 |
| 是否把 [[Extensible]] 置 false | 是 | 是 | 是 |
| 是否影响原型对象 | 否 | 否 | 否 |
| 是否可逆 | 否 | 否 | 否 |

```js
// 运行时：Node.js 18+，ESM 严格模式
import assert from 'node:assert/strict';

const o = { a: 1 };
Object.preventExtensions(o);
assert.throws(() => { o.b = 2; }, TypeError); // 新增属性失败
delete o.a;                                    // 仍可删除
assert.ok(!('a' in o));

const s = Object.seal({ n: 1 });
s.n = 2;                                       // writable 仍为 true，可改值
assert.strictEqual(s.n, 2);
assert.throws(() => { delete s.n; }, TypeError); // 删除失败

const f = Object.freeze({ n: 1 });
assert.throws(() => { f.n = 2; }, TypeError);    // 修改失败

// freeze 不能阻止访问器 setter 执行
let inner = 1;
const acc = {};
Object.defineProperty(acc, 'v', {
  get: () => inner,
  set: (x) => { inner = x; },
  configurable: false,
});
Object.freeze(acc);
acc.v = 100;
assert.strictEqual(inner, 100);
assert.strictEqual(acc.v, 100);
console.log('完整性三件套断言通过');
```

### 3.2 浅层性：嵌套对象不受影响，原型对象也不受影响

freeze 只作用于目标对象自身。嵌套对象仍是可变的，原型链上的对象也仍是可变的。另一个容易忽略的事实：因为 [[Extensible]] 为 false，所以这三个 API 都会阻止对目标对象调用 `Object.setPrototypeOf` 更换原型（SameValue 相同则允许，不同原型抛 TypeError），但它们不会去冻结原型对象本身。

```js
// 运行时：Node.js 18+，ESM 严格模式
import assert from 'node:assert/strict';

const proto = { deep: 1 };
const obj = Object.freeze(Object.create(proto));
obj.deep = 2;            // 严格模式抛 TypeError，非严格模式静默失败
assert.throws(() => { obj.deep = 2; }, TypeError);
proto.deep = 99;         // 原型对象未被冻结，仍然可变
assert.strictEqual(obj.deep, 99); // 继承值随之变化

// 非扩展对象不能更换原型
const frozen = Object.freeze({ a: 1 });
assert.throws(() => Object.setPrototypeOf(frozen, {}), TypeError);
// 相同原型允许
assert.strictEqual(Object.setPrototypeOf(frozen, Object.prototype), frozen);
```

### 3.3 手写 deepFreeze

```js
// 运行时：Node.js 18+，保存为 deep-freeze.mjs 可运行
// 说明：只冻结普通对象与数组；用 WeakMap 记录已访问对象以支持循环引用。

function deepFreeze(value, seen = new WeakMap()) {
  // 基本类型直接返回；函数对象在此实现中不处理
  if (value === null || typeof value !== 'object') return value;
  // 已冻结的对象跳过，避免重复遍历
  if (Object.isFrozen(value)) return value;
  // 循环引用保护：已在本轮访问过就返回
  if (seen.has(value)) return value;
  seen.set(value, true);

  // Reflect.ownKeys 同时覆盖字符串键与 Symbol 键
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key], seen);
  }
  return Object.freeze(value);
}

export { deepFreeze };
```

```js
// 验证标准：Node.js 18+，保存为 verify-deep-freeze.mjs 运行
// 预期输出：全部断言通过，控制台打印一行 deepFreeze 全部断言通过
import assert from 'node:assert/strict';
import { deepFreeze } from './deep-freeze.mjs';

const obj = {
  a: { b: 1 },
  arr: [1, { c: 2 }],
};
const frozen = deepFreeze(obj);
assert.strictEqual(frozen, obj);
assert.ok(Object.isFrozen(obj));
assert.ok(Object.isFrozen(obj.a));
assert.ok(Object.isFrozen(obj.arr));
assert.ok(Object.isFrozen(obj.arr[1]));

// ESM 严格模式：写冻结属性抛 TypeError
assert.throws(() => { obj.a.b = 99; }, TypeError);
assert.throws(() => { obj.arr[1].c = 99; }, TypeError);

// 循环引用不爆栈
const cycle = { name: 'cycle' };
cycle.self = cycle;
deepFreeze(cycle);
assert.ok(Object.isFrozen(cycle.self));

console.log('deepFreeze 全部断言通过');
```

## 4. 原型链：手写 Object.create 与 new

### 4.1 手写 create

`Object.create(proto, properties)` 做两件事：创建以 proto 为 [[Prototype]] 的普通对象；如果传入了第二个参数，用 `Object.defineProperties` 定义属性。下面的手写 `create` 先创建空对象，再显式设置原型；真实规范在创建对象时直接填入 [[Prototype]]，此处为了可读性使用 `Object.setPrototypeOf`。

```js
// 运行时：Node.js 18+，保存为 create.mjs 可运行

function create(proto, properties) {
  // 规范要求原型必须是对象、函数或 null
  if ((typeof proto !== 'object' && typeof proto !== 'function') && proto !== null) {
    throw new TypeError('Object prototype may only be an Object or null: ' + proto);
  }
  const obj = {};
  if (proto !== undefined) {
    Object.setPrototypeOf(obj, proto);
  }
  if (properties !== undefined) {
    Object.defineProperties(obj, properties);
  }
  return obj;
}

export { create };
```

```js
// 验证标准：Node.js 18+，保存为 verify-create.mjs 运行
// 预期输出：全部断言通过，控制台打印一行 create 全部断言通过
import assert from 'node:assert/strict';
import { create } from './create.mjs';

const proto = { greet() { return 'hi'; } };
const obj = create(proto, {
  x: { value: 42, enumerable: true },
  doubleX: { get() { return this.x * 2; } },
});
assert.strictEqual(Object.getPrototypeOf(obj), proto);
assert.strictEqual(obj.greet(), 'hi');
assert.strictEqual(obj.x, 42);
assert.strictEqual(obj.doubleX, 84);
assert.strictEqual(obj.propertyIsEnumerable('doubleX'), false); // 描述符默认 enumerable false

// null 原型对象：没有 Object.prototype 上的方法
const n = create(null);
assert.strictEqual(Object.getPrototypeOf(n), null);
assert.strictEqual(typeof n.toString, 'undefined');

assert.throws(() => create(42), TypeError); // 数字不能作为原型
console.log('create 全部断言通过');
```

### 4.2 手写 new

`new Constructor(...args)` 的规范语义（OrdinaryCreateFromConstructor + Construct）简化为四步：创建以 `Constructor.prototype` 为原型的对象；以该对象为 this 调用构造函数；若构造函数返回对象或函数则返回该返回值，否则返回新建对象。

```js
// 运行时：Node.js 18+，保存为 my-new.mjs 可运行

function myNew(Ctor, ...args) {
  if (typeof Ctor !== 'function') {
    throw new TypeError('Constructor must be a function');
  }
  // 1. 创建原型链正确的空对象
  const instance = Object.create(Ctor.prototype);
  // 2. 以 instance 为 this 调用构造函数
  const result = Ctor.apply(instance, args);
  // 3. 构造函数返回对象或函数时，覆盖默认返回值
  if ((typeof result === 'object' && result !== null) || typeof result === 'function') {
    return result;
  }
  return instance;
}

export { myNew };
```

```js
// 验证标准：Node.js 18+，保存为 verify-my-new.mjs 运行
// 预期输出：全部断言通过，控制台打印一行 myNew 全部断言通过
import assert from 'node:assert/strict';
import { myNew } from './my-new.mjs';

function Point(x, y) {
  this.x = x;
  this.y = y;
}
const p = myNew(Point, 1, 2);
assert.ok(p instanceof Point);
assert.deepStrictEqual([p.x, p.y], [1, 2]);

function ReturnsObject() {
  return { custom: true };
}
assert.deepStrictEqual(myNew(ReturnsObject), { custom: true });

function ReturnsPrimitive() {
  this.a = 1;
  return 42;
}
assert.strictEqual(myNew(ReturnsPrimitive).a, 1);

console.log('myNew 全部断言通过');
```

注意：上面的 `myNew` 使用 `apply` 调用构造函数，无法支持 ES class（class constructor 只能通过 [[Construct]] 调用，`apply` 会抛 “Class constructor cannot be invoked without new”）。若需要支持 class，可改用 `Reflect.construct(Ctor, args)` 完成构造，其内部走的正是 [[Construct]]。

### 4.3 setPrototypeOf 的性能陷阱

`Object.setPrototypeOf` 在运行时动态修改原型会破坏引擎对隐藏类与内联缓存的假设。以 V8 为例，修改原型会使相关对象进入慢速路径，属于“deoptimization killer”之一。生产代码应优先用 `Object.create(proto)` 在创建时确定原型，而不是创建后再 setPrototypeOf。这一性能结论与 V8 具体版本相关，实际表现需以官方基准与文档为准。

## 5. 遍历与枚举 API：顺序规则与边界

### 5.1 属性枚举顺序的规范算法

`Reflect.ownKeys` 与 `Object.getOwnPropertyNames` 遵循 OrdinaryOwnPropertyKeys 的顺序：

1. 整数键（array index，规范定义是 canonical numeric string，即 0 到 2^32 - 2 且 `ToString(ToUint32(P)) === P`）按数值升序排列，与定义顺序无关。
2. 其余字符串键按插入顺序排列，`'01'`、`'-1'`、`'1.5'` 这类不属于整数键。
3. Symbol 键按插入顺序排在最后。

注意 `2^32 - 1`（即 `'4294967295'`）不是整数键；删除后重新插入的字符串键会排到字符串键末尾，而整数键始终按数值升序。

```js
// 运行时：Node.js 18+
const sym1 = Symbol('s1');
const sym2 = Symbol('s2');
const obj = {
  b: 'B',
  a: 'A',
  2: 'two',
  1: 'one',
  c: 'C',
  '01': 'zero-one',
  [sym2]: 'sym2',
  [sym1]: 'sym1',
};
// 整数键 [1, 2] 升序在前；字符串键按插入顺序 b a c 01；Symbol 按插入顺序在后
console.log(JSON.stringify(Object.keys(obj)));
// 期望打印：["1","2","b","a","c","01"]
console.log(JSON.stringify(Object.getOwnPropertyNames(obj)));
// 期望打印：["1","2","b","a","c","01"]（不含 Symbol）
console.log(Object.getOwnPropertySymbols(obj).map((s) => s.toString()).join(','));
// 期望打印：Symbol(s2),Symbol(s1)
console.log(Reflect.ownKeys(obj).map((k) => (typeof k === 'symbol' ? k.toString() : k)).join(' | '));
// 期望打印：1 | 2 | b | a | c | 01 | Symbol(s2) | Symbol(s1)

// 删除后重新插入的字符串键移到字符串键末尾
const d = { z: 1, y: 2, x: 3 };
delete d.z;
d.z = 99;
console.log(JSON.stringify(Object.keys(d)));
// 期望打印：["y","x","z"]
```

### 5.2 枚举相关 API 对比表

| API | 范围 | 只含自有属性 | 只含可枚举 | 含 Symbol 键 | 含不可枚举属性 |
| --- | --- | --- | --- | --- | --- |
| for...in | 自身 + 原型链 | 否 | 是 | 否 | 否 |
| Object.keys / values / entries | 自身 | 是 | 是 | 否 | 否 |
| Object.getOwnPropertyNames | 自身 | 是 | 否 | 否 | 是 |
| Object.getOwnPropertySymbols | 自身 | 是 | 否 | 是 | 是 |
| Reflect.ownKeys | 自身 | 是 | 否 | 是 | 是 |
| JSON.stringify | 自身 | 是 | 是 | 否 | 否 |

`for...in` 的在历史规范中长期没有严格定义遍历顺序；现代引擎普遍与 Object.keys 采用相同的整数键优先策略，但遍历过程中动态增删属性的行为属于历史遗留语义，细节仍需谨慎，面试回答时建议强调“现代引擎遵循整数键优先，但 for...in 覆盖原型链且顺序保证弱于 Reflect.ownKeys”。

### 5.3 hasOwn / getOwnPropertyDescriptors / entries / fromEntries 验证

```js
// 运行时：Node.js 18+，保存为 verify-object-api.mjs 运行
// 预期输出：按注释逐行打印，最终打印一行 object API 全部断言通过
import assert from 'node:assert/strict';

// Object.hasOwn：只查自有属性，不触发原型链；null 原型对象也能用
const proto = { inherited: 'I' };
const child = Object.create(proto);
child.own = 'O';
assert.strictEqual(Object.hasOwn(child, 'own'), true);
assert.strictEqual(Object.hasOwn(child, 'inherited'), false);
assert.strictEqual('inherited' in child, true); // in 会查原型链
const nullObj = Object.create(null);
nullObj.x = 1;
assert.strictEqual(Object.hasOwn(nullObj, 'x'), true); // hasOwnProperty 在这里会直接报错

// Object.getOwnPropertyDescriptors：拿到完整描述符（含不可枚举、Symbol）
const s = Symbol('desc');
const src = {};
Object.defineProperties(src, {
  hidden: { value: 1, enumerable: false },
  vis: { value: 2, enumerable: true, writable: true },
  [s]: { value: 3, enumerable: false },
});
const descs = Object.getOwnPropertyDescriptors(src);
console.log(JSON.stringify(Object.keys(descs))); // 期望：["hidden","vis"]
console.log(Reflect.ownKeys(descs).map((k) => (typeof k === 'symbol' ? k.toString() : k)).join(',')); // 期望：hidden,vis,Symbol(desc)
const copy = Object.defineProperties({}, descs);
assert.strictEqual(copy.hidden, 1);
assert.strictEqual(copy[s], 3);
assert.strictEqual(Object.getOwnPropertyDescriptor(copy, 'hidden').enumerable, false);
assert.strictEqual(Object.getOwnPropertyDescriptor(copy, 'vis').writable, true);

// Object.entries 顺序遵循整数键优先
console.log(JSON.stringify(Object.entries({ 2: 'b', 1: 'a' })));
// 期望：[[\"1\",\"a\"],[\"2\",\"b\"]]

// Object.fromEntries：重复键后者覆盖；Symbol 键可创建；__proto__ 走 CreateDataProperty 不污染原型
assert.deepStrictEqual(Object.fromEntries([['x', 1], ['x', 2], ['y', 3]]), { x: 2, y: 3 });
const symKey = Symbol('fromEntries');
const symObj = Object.fromEntries([[symKey, 'sv']]);
assert.strictEqual(symObj[symKey], 'sv');
assert.strictEqual(symObj.hasOwnProperty(symKey), true);
const safe = Object.fromEntries([['__proto__', { polluted: true }]]);
assert.strictEqual(Object.getPrototypeOf(safe), Object.prototype);
assert.strictEqual(Object.hasOwn(safe, '__proto__'), true);

console.log('object API 全部断言通过');
```

## 6. 手写 Object.assign

`Object.assign(target, ...sources)` 的规范要点：target 先 ToObject；null 或 undefined 的 source 会被跳过；只复制 source 的自有可枚举属性（含 Symbol 键）；读取 source 走 [[Get]]（getter 被求值），写入 target 走 [[Set]]（target setter 被调用）；返回 target 对象本身。

```js
// 运行时：Node.js 18+，保存为 assign.mjs 可运行

function assign(target, ...sources) {
  if (target === null || target === undefined) {
    throw new TypeError('Cannot convert undefined or null to object');
  }
  const to = Object(target);
  for (const source of sources) {
    // 规范：null / undefined 源直接忽略
    if (source === null || source === undefined) continue;
    const from = Object(source);
    for (const key of Reflect.ownKeys(from)) {
      const desc = Object.getOwnPropertyDescriptor(from, key);
      if (desc && desc.enumerable) {
        to[key] = from[key]; // 读 source 走 [[Get]]，写 target 走 [[Set]]
      }
    }
  }
  return to;
}

export { assign };
```

```js
// 验证标准：Node.js 18+，保存为 verify-assign.mjs 运行
// 预期输出：全部断言通过，控制台打印一行 assign 全部断言通过
import assert from 'node:assert/strict';
import { assign } from './assign.mjs';

const sym = Symbol('s');
const src = { a: 1, get b() { return 2; }, [sym]: 3 };
Object.defineProperty(src, 'hidden', { value: 4, enumerable: false });

const target = {};
let setterCalled = 0;
Object.defineProperty(target, 'a', {
  get() { return this._a; },
  set(v) { setterCalled += 1; this._a = v; },
  enumerable: true,
  configurable: true,
});

assign(target, src, null, undefined); // null / undefined 源被忽略
assert.strictEqual(target.a, 1);
assert.strictEqual(target.b, 2);        // getter 被求值成数据属性
assert.strictEqual(target[sym], 3);     // Symbol 键也被复制
assert.ok(!('hidden' in target));       // 不可枚举属性不复制
assert.strictEqual(setterCalled, 1);    // 目标上的 setter 被调用

assert.deepStrictEqual(assign({}, { x: 1 }), { x: 1 });
console.log('assign 全部断言通过');
```

重要区别：`Object.assign` 写入时走 [[Set]]，因此把 `"__proto__"` 作为 source 键时，可能命中 `Object.prototype.__proto__` 访问器，从而修改 target 的原型，形成原型污染（prototype pollution）。`Object.fromEntries` 和 `Object.defineProperty` 使用 CreateDataProperty（定义自有数据属性），不会触发该访问器。

## 7. 用 Proxy 构建可观测对象

```js
// 运行时：Node.js 18+，保存为 observable.mjs 可运行

function observable(target) {
  const listeners = new Set();

  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      // Reflect.get 保留访问器属性的 this 绑定
      return Reflect.get(obj, key, receiver);
    },
    set(obj, key, value, receiver) {
      const oldValue = Reflect.get(obj, key, receiver);
      const ok = Reflect.set(obj, key, value, receiver);
      if (ok && !Object.is(oldValue, value)) {
        listeners.forEach((fn) => fn({ type: 'set', key, oldValue, value }));
      }
      return ok;
    },
    deleteProperty(obj, key) {
      const had = Object.prototype.hasOwnProperty.call(obj, key);
      const ok = Reflect.deleteProperty(obj, key);
      if (ok && had) {
        listeners.forEach((fn) => fn({ type: 'delete', key }));
      }
      return ok;
    },
  });

  return {
    proxy,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export { observable };
```

```js
// 验证标准：Node.js 18+，保存为 verify-observable.mjs 运行
// 预期输出：控制台打印 ["set:count","delete:nested"]，再打印 observable 全部断言通过
import assert from 'node:assert/strict';
import { observable } from './observable.mjs';

const state = observable({ count: 0, nested: { x: 1 } });
const events = [];
const off = state.subscribe((e) => events.push(`${e.type}:${String(e.key)}`));

state.proxy.count = 1;
state.proxy.count = 1;      // Object.is 相等，不触发事件
delete state.proxy.nested;  // 删除事件
off();
state.proxy.count = 2;      // 已取消订阅，不再收事件

console.log(JSON.stringify(events));          // 期望：["set:count","delete:nested"]
assert.strictEqual(state.proxy.count, 2);
assert.ok(!('nested' in state.proxy));
assert.strictEqual(events.length, 2);
console.log('observable 全部断言通过');
```

## 8. structuredClone 的能力边界

`structuredClone(value)` 使用 HTML 规范中的结构化克隆算法（Structured Clone Algorithm）进行深拷贝，与 JSON 深拷贝有本质区别：它支持循环引用、共享引用、稀疏数组、Map/Set/Date/RegExp/ArrayBuffer/类型化数组等；但 Function、Symbol、WeakMap、DOM 节点、Proxy 等直接抛 DataCloneError。自定义 class 实例的克隆结果会丢失原型，成为普通对象，因此 `instanceof` 判定为 false（具体行为以 MDN 与 HTML 规范为准，平台对象支持范围随环境变化）。

| 值类型 | structuredClone 支持 | 说明 |
| --- | --- | --- |
| number/string/boolean/bigint/undefined/null | 是 | 基本类型直接复制 |
| Symbol | 否 | 抛 DataCloneError |
| Function | 否 | 抛 DataCloneError |
| 普通对象 / 数组（含循环引用、共享引用、稀疏数组） | 是 | 引用关系与 holes 保留 |
| Map / Set / Date / RegExp / ArrayBuffer / TypedArray / DataView | 是 | 依据结构化克隆算法 |
| Blob / File / ImageData 等平台对象 | 视环境 | 浏览器支持 Blob；Node 部分内置类型需核对官方文档 |
| DOM 节点 | 否 | 抛 DataCloneError |
| WeakMap / WeakSet / WeakRef / FinalizationRegistry | 否 | 抛 DataCloneError |
| Proxy | 否 | 抛 DataCloneError |
| 自定义 class 实例 | 数据保留但原型丢失 | 克隆结果变普通对象，`instanceof` 通常为 false |
| 访问器属性 | 只克隆求值结果 | getter 被调用，克隆后变成数据属性，描述符不保留 |

```js
// 验证标准：Node.js 18+，保存为 verify-structured-clone.mjs 运行
// 预期输出：全部断言通过，控制台打印一行 structuredClone 全部断言通过
import assert from 'node:assert/strict';

// 循环引用深拷贝
const cyclic = { name: 'root' };
cyclic.self = cyclic;
const cloned = structuredClone(cyclic);
assert.notStrictEqual(cloned, cyclic);
assert.strictEqual(cloned.self, cloned);
assert.strictEqual(cloned.name, 'root');

// 自定义 class 实例克隆后失去原型
class Todo {
  constructor() { this.done = false; }
}
const todo = new Todo();
const clonedTodo = structuredClone(todo);
assert.strictEqual(clonedTodo.done, false);
assert.strictEqual(clonedTodo instanceof Todo, false);
assert.strictEqual(Object.getPrototypeOf(clonedTodo), Object.prototype);

// Function 与 Symbol 不能克隆
assert.throws(() => structuredClone(() => {}), DOMException);
assert.throws(() => structuredClone(Symbol('x')), DOMException);

// getter 被求值，克隆成数据属性
const getter = { get x() { return 42; } };
const clonedGetter = structuredClone(getter);
assert.strictEqual(clonedGetter.x, 42);
assert.strictEqual(Object.getOwnPropertyDescriptor(clonedGetter, 'x').get, undefined);

console.log('structuredClone 全部断言通过');
```

## 9. 简化版 produce：基于 Proxy 与写时复制

immer 的 `produce(base, recipe)` 核心机制是：给 base 包一层 Proxy 草稿（draft），recipe 中对 draft 的所有读取都惰性地为子对象创建嵌套 Proxy；第一次写操作时，把被写对象浅拷贝一份，并沿父链向上逐级浅拷贝、重接引用，未修改的分支继续共享原引用。最终若草稿从未被写入，直接返回 base（引用不变）；若被写入，返回根级浅拷贝。

下面实现支持普通对象与数组，不支持 Map/Set、class 实例内部深度修改、冻结等边缘语义；真实 immer 还会做最终冻结、补丁生成与异步草稿，本文省略。

```js
// 运行时：Node.js 18+，保存为 produce.mjs 可运行

function produce(base, recipe) {
  if (base === null || typeof base !== 'object') {
    return recipe(base);
  }

  const drafts = new WeakMap();       // 原始对象 -> 草稿状态
  const proxyToState = new WeakMap(); // 代理对象 -> 草稿状态

  function shallowCopy(obj) {
    if (Array.isArray(obj)) return obj.slice();
    // 用完整描述符浅拷贝，保留不可枚举属性与 Symbol 键
    return Object.defineProperties(
      Object.create(Object.getPrototypeOf(obj)),
      Object.getOwnPropertyDescriptors(obj),
    );
  }

  function currentOf(state) {
    return state.copy !== null ? state.copy : state.target;
  }

  // 确保当前对象已复制，并把复制结果接到父链的副本上
  function markCopied(state) {
    if (state.copy !== null) return state.copy;
    const copy = shallowCopy(state.target);
    state.copy = copy;
    if (state.parent !== null) {
      const parentCopy = markCopied(drafts.get(state.parent));
      parentCopy[state.parentKey] = copy;
    }
    return copy;
  }

  // 写入一个草稿对象时，把它解包成真正的副本或原始对象
  function unwrap(value) {
    if (value !== null && typeof value === 'object' && proxyToState.has(value)) {
      return currentOf(proxyToState.get(value));
    }
    return value;
  }

  function createProxy(target, parent, parentKey) {
    if (drafts.has(target)) return drafts.get(target).proxy;

    const state = { target, copy: null, parent, parentKey, proxy: null };
    const proxy = new Proxy(target, {
      get(_, key, receiver) {
        const source = currentOf(state);
        const value = Reflect.get(source, key, receiver);
        if (value !== null && typeof value === 'object') {
          const proto = Object.getPrototypeOf(value);
          if (Array.isArray(value) || proto === Object.prototype || proto === null) {
            return createProxy(value, target, key);
          }
        }
        return value;
      },
      set(_, key, value) {
        const copy = markCopied(state);
        return Reflect.set(copy, key, unwrap(value));
      },
      deleteProperty(_, key) {
        const copy = markCopied(state);
        return Reflect.deleteProperty(copy, key);
      },
    });

    state.proxy = proxy;
    drafts.set(target, state);
    proxyToState.set(proxy, state);
    return proxy;
  }

  const rootProxy = createProxy(base, null, null);
  recipe(rootProxy);

  const rootState = drafts.get(base);
  return rootState.copy !== null ? rootState.copy : base;
}

export { produce };
```

```js
// 验证标准：Node.js 18+，保存为 verify-produce.mjs 运行
// 预期输出：全部断言通过，控制台打印一行 produce 全部断言通过
import assert from 'node:assert/strict';
import { produce } from './produce.mjs';

const base = {
  title: 'todos',
  list: [
    { id: 1, done: false },
    { id: 2, done: true },
  ],
  meta: { count: 2 },
};

const next = produce(base, (draft) => {
  draft.list[0].done = true;          // 修改嵌套对象
  draft.meta.count = draft.meta.count + 1; // 修改另一分支
  draft.list.push({ id: 3, done: false }); // 数组方法同样走 set trap
});

// base 完全不被修改
assert.strictEqual(base.list[0].done, false);
assert.strictEqual(base.meta.count, 2);
assert.strictEqual(base.list.length, 2);

// next 是新结构
assert.strictEqual(next.list[0].done, true);
assert.strictEqual(next.meta.count, 3);
assert.strictEqual(next.list.length, 3);
assert.notStrictEqual(next, base);
assert.notStrictEqual(next.list, base.list);
assert.notStrictEqual(next.meta, base.meta);
assert.notStrictEqual(next.list[0], base.list[0]);

// 结构共享：未被修改的元素保持同一引用
assert.strictEqual(next.list[1], base.list[1]);

// 没有写入时返回原对象本身
const base2 = { a: { b: 1 } };
const untouched = produce(base2, (draft) => { void draft.a.b; });
assert.strictEqual(untouched, base2);

console.log('produce 全部断言通过');
```

## 10. 常见陷阱

1. 冻结是浅层的。`Object.freeze(obj)` 后 `obj.a.b = 1` 依然合法（若 obj.a 未被冻结）；需要冻结整个对象图请显式 deepFreeze。原型对象同样不会被冻结，继承值仍可能变化。

2. 写只读属性在严格模式抛 TypeError，在非严格模式静默失败。测试代码如果放在 CommonJS 非严格脚本中，`assert.throws` 可能捉不到错误，需要加 `'use strict'` 或改用 ESM。

3. freeze 不能阻止访问器属性的 setter 执行。因为访问器属性没有 [[Writable]]，freeze 只是把 [[Configurable]] 置 false，getter/setter 函数依然能被调用。

4. `Object.assign` 与对象展开 `{ ...obj }` 会丢描述符：不可枚举属性不复制，getter/setter 变成普通数据属性。需要完整复制请用 `Object.getOwnPropertyDescriptors` 配合 `Object.defineProperties`。

5. `Object.assign` 走 [[Set]]，遇到 key 为 `"__proto__"` 的 source 时可能原型污染；`Object.fromEntries` 和 `defineProperty` 走 CreateDataProperty，不会触发该访问器。

6. Proxy 的 ownKeys trap 受不变式约束：如果目标不可扩展，返回键列表必须包含目标的所有不可配置自有属性，否则抛 TypeError。自定义响应式对象时很容易踩到。

7. 属性枚举顺序：整数键总是按数值升序排在前面，与定义顺序无关；删除后重新插入的字符串键会排到字符串键末尾。把 `'01'` 当数组索引是常见误判。

8. `Object.hasOwn` 只查自有属性；`in` 会查原型链；`hasOwnProperty` 可以被覆盖，且在 null 原型对象上不存在。三者不要混用。

9. `structuredClone` 会调用 getter 并把结果固化为数据属性；自定义 class 实例克隆后原型丢失；Function、Symbol、Proxy 直接抛错。

10. `setPrototypeOf` 会破坏引擎优化。避免在热路径上动态修改原型；若必须修改，尽量通过 `Object.create` 在创建时完成。

## 11. 面试题与答题要点

1. `Object.defineProperty` 和直接赋值 `obj.x = 1` 有什么区别？

   答题要点：直接赋值创建的是可写、可枚举、可配置的普通数据属性，且会触发原型链查找与 setter。defineProperty 默认创建不可写、不可枚举、不可配置的属性；可以定义 getter/setter；在某些同样条件下（如属性不存在且对象可扩展）二者产生的属性描述符不同；赋值无法定义不可枚举属性，defineProperty 能精确控制 writable/enumerable/configurable。

2. `Object.freeze`、`Object.seal`、`Object.preventExtensions` 三个 API 的区别？

   答题要点：三者都把 [[Extensible]] 置 false 且都不可逆。preventExtensions 只禁新增；seal 额外把全部自有属性 [[Configurable]] 置 false，禁删除和改描述符；freeze 再额外把数据属性 [[Writable]] 置 false。三者都只影响对象自身，嵌套对象不变；freeze 后访问器 setter 仍可执行。可以补充：三者都会阻止 setPrototypeOf 更换原型。

3. JS 对象属性枚举顺序的规则是什么？

   答题要点：整数键按数值升序在最前；其余字符串键按插入顺序；Symbol 键按插入顺序在最后。整数键定义是 canonical numeric string，`'01'`、`'-1'`、`'1.5'` 不算，且 4294967295 不在范围。for...in 会包含原型链可枚举属性，历史顺序保证弱于 Reflect.ownKeys。可用 `{2:'b',1:'a',b:'B',[Symbol()]:1}` 举例。

4. `Object.keys`、`for...in`、`Reflect.ownKeys` 的区别？

   答题要点：范围上，for...in 包含原型链，其余只含自有属性；可枚举性上，keys 与 for...in 只取可枚举，Reflect.ownKeys 全取；键类型上，keys 与 for...in 不含 Symbol，Reflect.ownKeys 含 Symbol。配合 `Object.getOwnPropertyNames` 与 `Object.getOwnPropertySymbols` 说明完整覆盖。可补充 `Object.hasOwn` 与 `in` 的差异。

5. `Object.getOwnPropertyDescriptors` 有什么用途？

   答题要点：它是完整复制对象自有属性的关键，能同时拿到字符串键与 Symbol 键，且保留 enumerable/configurable/writable/get/set。用 `Object.defineProperties({}, descriptors)` 可以得到一个保留描述符的浅拷贝；相比之下展开运算符与 Object.assign 会丢描述符。

6. `new` 操作符做了什么？和 `Object.create` 有什么关系？

   答题要点：new 创建以 Constructor.prototype 为原型的对象，以该对象为 this 调用构造函数，若返回对象或函数则用返回值替换。Object.create 只负责设置原型，不调用构造函数。可指出手写 new 的实现，以及 `instanceof` 的内层含义：判断 Ctor.prototype 是否出现在对象原型链上.

7. `structuredClone` 和 `JSON.parse(JSON.stringify(obj))` 的区别？structuredClone 不能处理什么？

   答题要点：structuredClone 支持循环引用、共享引用、Map/Set/Date/RegExp/ArrayBuffer/类型化数组；JSON 方式会丢失 undefined、函数、Symbol 键、循环引用，Date 变字符串。structuredClone 不能处理 Function、Symbol、WeakMap、DOM 节点、Proxy；自定义 class 实例克隆后原型丢失。补充：structuredClone 会调用 getter，把访问器属性变数据属性。

8. immer 的 produce 是怎么用 Proxy 实现不可变更新的？

   答题要点：核心是 Proxy 与写时复制。draft 是惰性嵌套 Proxy，读取时给子对象也包 Proxy；第一次写入时浅拷贝被写对象，并沿着父链逐级浅拷贝、把父副本的子引用指向子副本，未修改分支共享引用。过程结束若根没有副本则返回原对象，否则返回根副本。这样既有不可变更新语义，又获得结构共享，比全量深拷贝省内存，配合浅比较可以做高性能渲染优化。

9. Vue 2 与 Vue 3 响应式系统的区别，为什么迁移到 Proxy？

   答题要点：Vue 2 用 Object.defineProperty 递归劫持已有属性，无法监听新增删除属性，数组索引与 length 拦截困难，需要重写数组方法。Vue 3 用 Proxy 按需拦截运行时操作，自动覆盖新增删除，可直接处理数组，惰性递归且无需在初始化时遍历全部属性。可结合缺陷：defineProperty 修改目标对象本身，Proxy 不改目标；Proxy 有 ownKeys 等不变式约束。

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格 | 枚举顺序：整数键在前、字符串键按插入顺序 | TanStack Virtual + 分页缓存 | 行数据别用整数当键，否则顺序被打乱 |
| 低端安卓的首屏加载 | freeze 只作用于自身；不可扩展对象跳过响应式代理 | Vue 3 + 生产构建 | 冻结后运行期改配置会抛错 |
| 多人协作白板 | Proxy 拦截运行期写入；写时复制与结构共享 | Yjs + immer | 广播前做 diff，别发全量快照 |
| 表单库的字段定义 | defineProperty 与 configurable 不变式 | React Hook Form / JSON Schema | 字段描述符要留 configurable: true |
| 组件库主题 token | freeze 的浅层性与不可逆 | design tokens + CSS 变量 | 冻结前先留一层可变映射做切换 |
| 埋点 SDK 的可观测对象 | Proxy 的可撤销与新增属性拦截 | Proxy + revoke | 撤销后读取抛 TypeError，卸载阶段要兜住 |
| 状态管理的时间旅行调试 | 不可变更新与结构共享 | Redux DevTools + produce | 未改动分支必须保持同一引用 |
| Node 服务端配置加载 | preventExtensions / seal 的区别 | zod 校验后再 freeze | 冻结是浅层的，嵌套对象要递归处理 |
| Electron 主进程与渲染进程通信 | structuredClone 的能力边界 | contextBridge + IPC | 函数、类实例、Symbol 键会丢或抛错 |

### 三个场景拆解

#### 场景 1：低端安卓的首屏加载

**业务背景**：启动配置在构建期生成，运行期只读，却常被塞进响应式系统做深层代理。配置嵌套三层以上时，代理安装与依赖收集会挤占首屏预算。

**怎么用本页知识解决**：先冻结配置对象，再交给响应式系统，让它跳过代理建立。

```js
// config.js：构建期生成，运行期不改的启动配置
export const config = Object.freeze({
  apiBase: '/api',
  retry: 2,
  flags: Object.freeze({ newHome: true }), // 冻结是浅层的，嵌套对象要手动再冻结
});

// main.js：交给响应式系统时避开深层代理
import { shallowRef } from 'vue';
const appConfig = shallowRef(config); // shallowRef 只跟踪 .value 替换，不递归代理内部
```

- Object.freeze 只处理对象自身，嵌套对象要逐层补冻。
- freeze 会把 writable 与 configurable 置为 false，之后改不回来。
- 不可扩展的对象会被部分响应式实现跳过代理，行为以你所用版本的源码为准。
- shallowRef 不深度代理，读 config.flags.newHome 不产生依赖收集。

**怎么度量收益**：用 Lighthouse 移动端配置看 Total Blocking Time 与 First Contentful Paint；用 Chrome DevTools Performance 录 5 秒启动，看 Scripting 时长与 Long Task 数量；用 performance.mark 与 performance.measure 包住启动，取 20 次的中位数。

**什么时候不该用**：
- 运行期设置页要改写配置项时，冻结后的写入在严格模式抛 TypeError。
- 配置带 setter 且 setter 有副作用时，freeze 拦不住它执行。
- 配置对象要交给会就地写入的第三方库时，先做可写副本。

#### 场景 2：多人协作白板

**业务背景**：一块画布上同时有几十个光标和上千个图元，每次拖动都要提交状态并广播。痛点是全量替换状态导致无关组件跟着重渲染。

**怎么用本页知识解决**：用 Proxy 记录写入，用写时复制生成新快照，未改动的分支保留原引用。

```js
function createBoard(initial, onCommit) {
  let snapshot = initial;                    // 对外暴露的不可变快照
  return new Proxy({}, {
    get: (_, key) => snapshot[key],          // 读一律走快照
    set: (_, key, value) => {
      if (Object.is(snapshot[key], value)) return true; // 值没变就不提交
      const next = { ...snapshot, [key]: value };       // 写时复制：只换这一层
      snapshot = next;
      onCommit(next);                        // 交给协作层做 diff 与广播
      return true;
    },
  });
}
```

- Proxy 拦的是运行期 set，新增键也会被拦；defineProperty 只在定义时刻生效一次。
- 未改动分支保持同一引用，React.memo 与 useMemo 的浅比较才命中。
- 快照是浅拷贝，深层对象仍共享，深层修改要递归生成新对象。
- onCommit 拿到的是全量对象，广播前应做 diff，别发全量。

**怎么度量收益**：用 React DevTools Profiler 看 commit 时长与渲染组件数；用 Yjs 的 update 事件统计每次广播字节数；用 Chrome DevTools Performance 看 Long Task 计数与 INP 指标。

**什么时候不该用**：
- 需要审计"谁改了哪个字段"时，Proxy 的 set 只给新值，旧值要自己存。
- 对象有几千个键时，每次写入都展开复制，开销随键数增长。
- 状态本身是数字或字符串时，套 Proxy 拿不到额外信息。

#### 场景 3：后台管理的万行表格

**业务背景**：表格要展示上万行，列可以配置，翻页与排序频繁触发重渲染。痛点是每次渲染都重新计算列键，并且行键顺序被整数规则打乱。

**怎么用本页知识解决**：行数据放 Map 保证插入顺序，列键只在列定义变化时算一次，并用 freeze 锁住列定义。

```js
// 1. 行数据放 Map：遍历顺序就是插入顺序，不受整数键规则影响
const rows = new Map();

// 2. 列定义用字符串键，避免 "1" "2" 被排到最前
const columns = { name: '姓名', age: '年龄', dept: '部门' };

// 3. 列键只在列定义变化时计算，渲染循环里直接复用
let cachedColumnKeys = null;
function getColumnKeys() {
  if (cachedColumnKeys === null) cachedColumnKeys = Object.keys(columns);
  return cachedColumnKeys;
}

// 4. 冻结列定义，防止误改（注意：浅冻结，嵌套的列配置要单独处理）
Object.freeze(columns);
```

- Object.keys 的顺序是：整数键按数值升序在最前，字符串键按插入顺序，Symbol 键在最后。
- Object.keys 只返回可枚举的自有字符串键，Symbol 键要用 Reflect.ownKeys 才拿得到。
- 缓存键数组后，渲染路径里不再重复分配数组，GC 压力下降。
- 列定义冻结后写入静默失败或抛错，能挡住误改。

**怎么度量收益**：用 Chrome DevTools Performance 的 Bottom-Up 视图按 Self Time 找 Object.keys 调用；用 React DevTools Profiler 看 commit 时长；看翻页交互的 INP 与 Long Task 数量。

**什么时候不该用**：
- 数据来自 JSON.parse 且键就是整数 ID 时，顺序由规范固定，改键名的改动面大于收益。
- 列顺序由用户拖拽决定时，顺序属于业务数据，应存数组而不是靠对象键序。
- 列数量只有个位数时，缓存带来的收益低于维护成本。

### 行业先进实践

**reactive() 跳过不可扩展对象（出处：Vue 3 开源项目 packages/reactivity/src/reactive.ts）**
`getTargetType` 对 `!Object.isExtensible(value)` 返回 INVALID，被冻结的对象原样返回，不建代理。冻结只读配置就能省掉深层 getter 安装。需核对官方文档：官方文档没有把"冻结即跳过代理"写成公开承诺，升级前读对应版本源码。

**const 断言配合运行期冻结（出处：TypeScript 官方文档 Handbook 的 const assertions 章节）**
`as const` 让属性推断为 readonly 字面量类型，Object.freeze 在运行期拦住写入。编译期与运行期各设一道闸，改配置会在两处暴露。借鉴方式：常量表同时加 `as const` 与 Object.freeze。

**structuredClone 作为深拷贝默认方案（出处：MDN Web Docs 的 structuredClone 条目与 HTML 规范的结构化序列化）**
它按结构化克隆算法复制，支持 Map、Set、Date、ArrayBuffer 与循环引用，遇到函数和 DOM 节点抛 DataCloneError。借鉴方式：把 JSON.parse(JSON.stringify(x)) 换成 structuredClone，并补一个断言函数字段会抛错的测试。

**produce 的写时复制与结构共享（出处：immer 开源项目 README 与源码 proxy.ts）**
produce 用 Proxy 记录被写入的路径，只复制路径上的对象，其余分支保留原引用。React 的浅比较因此能命中，未改动子树不重渲染。借鉴方式：状态树按领域拆层，避免顶层大对象整体替换。

**--frozen-intrinsics 冻结内置对象（出处：Node.js 官方文档 CLI 章节，该标志标注为实验性）**
启动时冻结 Object、Array 等内置对象及其原型，阻止运行期改写内置方法。借鉴方式：在安全敏感的服务进程里试开，先跑一遍完整依赖的测试。需核对官方文档：该标志在你使用的 Node 版本上是否仍为实验性、是否与现有依赖冲突。

### 从学到用：落地路线

第 1 步：先在配置层试点，把启动配置与只读常量表用 Object.freeze 包起来，不动状态层。验收标准：单测里 `Object.isFrozen(config)` 为 true，启动日志里没有写入报错。

第 2 步：用同一段脚本量化前后差异，用 Chrome DevTools Performance 录 5 秒启动并导出两份 JSON。验收标准：两份录制文件入库，Scripting 时长与 Long Task 数量的差值可复现。

第 3 步：推广到状态层，新代码走不可变更新，写操作集中在 store 的 reducer 或 produce 里。验收标准：store 目录外的文件里搜不到对 state 的直接赋值。

第 4 步：用 lint 与测试守住，加一条禁止对 props 与 state 直接赋值的 ESLint 规则，并接进 CI。验收标准：故意写一次直接赋值，CI 必须变红。

### 动手作业

**目标**：实现一个 todoStore，做到写入被拦截、未改动分支引用不变、非法重定义被拒绝。

**步骤**：
1. 用 Object.defineProperty 定义 store 的版本号属性，configurable 设 true，enumerable 设 false，打印 Reflect.ownKeys 看它出现在哪里。
2. 用 Proxy 的 set 拦截写入，写入前用 Object.is 比较旧值，相同就跳过提交。
3. 用写时复制生成新快照，把新快照交给订阅者回调。
4. 用 Object.freeze 冻结每份快照，嵌套的 todo 项单独冻结。
5. 用 Object.keys 与 Reflect.ownKeys 各打印一次键序，构造一个整数键看它是否被排到最前。
6. 用 structuredClone 复制快照，验证含函数的字段会抛 DataCloneError。
7. 写单测覆盖以上每一步，并在 CI 里跑。

**验收标准**：
- 对未改动分支做 `===` 比较返回 true。
- 在冻结快照上写入，严格模式下抛 TypeError。
- 同一 tick 内重复提交相同值，订阅者只被调用一次。
- Reflect.ownKeys 的输出里 Symbol 键排在最后，整数键排在最前。
- structuredClone 对含函数字段的快照抛 DataCloneError 的用例通过。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [handler.preventExtensions()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/preventExtensions) | 理解代理如何拦截不可扩展操作以及必须遵守的不变式。 | 读 invariants 与示例，带着“目标不可扩展时陷阱返回 true 会怎样”的问题读，写完做实验。 |
| [Object.freeze()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) | freeze 的语义与浅层冻结边界，是常见陷阱章节的核心。 | 读 Description 与冻结数组示例，验证嵌套对象仍可修改，然后自己写一个深冻结函数。 |
| [Object.seal()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal) | seal 与 freeze 的差别仅在 configurable，一页说清。 | 读对比说明，用 getOwnPropertyDescriptor 打印 seal 前后各字段，确认哪些操作仍被允许。 |
| [Object.preventExtensions()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/preventExtensions) | 完整性三件套里最弱的一环，也是另两者的基础。 | 读返回值与严格模式报错示例，分别在 sloppy 与 strict 下测试新增属性和赋值。 |
| [Object.assign()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) | 手写 Object.assign 的行为基准，覆盖 getter、Symbol 与异常中断。 | 读 Description 中 getter/setter 与 Symbol 键部分，先复现边缘用例，再对照自己的实现逐条修正。 |
| [Object.create()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create) | 原型链手写实现的关键，第二参数直接使用属性描述符。 | 读第二参数与 defineProperties 的等价说明，用 Object.create(null) 与 new 构造对比差异。 |
| [Object.defineProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) | 本页核心 API，描述符字段与默认值必须逐字记住。 | 读 Descriptor 与默认值表，重点验证 configurable、writable 缺省为 false 带来的后果。 |
| [The structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) | structuredClone 能复制什么、为何抛错，一页讲清能力边界。 | 读 supported types 列表，列出函数、Proxy、自定义原型三类不可复制项并现场验证。 |
| [Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) | 理解 structuredClone 的 transfer 选项与所有权转移语义。 | 读可转移对象列表，用 ArrayBuffer 转移前后对比 byteLength 与内存归属变化。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 2 响应式源码目录](https://github.com/vuejs/vue/tree/main/src/core/observer) | 直观对比 defineProperty 与 Proxy 两代响应式实现，理解描述符被劫持的过程。 | 读 Observer 与 defineReactive 如何用 getter/setter 改写属性，再手写一个最小 Proxy 版作对照。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 继承与原型链](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) | 把 prototype、__proto__、constructor 三者关系一次理顺。 | 读“不同方式创建对象与原型链”一节，跟着示例手搭三层链，用 console.dir 逐层校验。 |
| [MDN 元编程](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming) | 从 Proxy 与 Reflect 角度串起可观测对象与 defineProperty 的替代关系。 | 读 Proxy 与 Reflect 部分，写一个带校验的 set 陷阱，再解释 Vue 3 响应式的收集与触发。 |

