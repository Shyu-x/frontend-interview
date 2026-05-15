# JavaScript 核心技术详解（第19-25节）

---

## 19. Proxy 与 Reflect

### 19.1 Proxy 原理与 Trap 体系

`Proxy` 是 ES6 引入的元编程能力，用于拦截和自定义对象的基本操作（get、set、delete 等）。每个拦截行为称为一个 **trap**（陷阱），与 `Reflect` API 一一对应。

![Proxy 拦截方法](assets/images/mermaid/proxy-traps.png)


#### 完整 Proxy Handler 示例

```javascript
const target = { name: 'Alice', age: 18, _secret: 42 };
const handler = {
  // 属性读取拦截
  get(target, prop, receiver) {
    if (prop.startsWith('_')) {
      throw new Error('私有属性不可访问');
    }
    const value = Reflect.get(target, prop, receiver);
    console.log(`读取 ${prop}: ${value}`);
    return value;
  },

  // 属性设置拦截
  set(target, prop, value, receiver) {
    if (prop === 'age' && (value < 0 || value > 150)) {
      throw new Error('年龄不合理');
    }
    console.log(`设置 ${prop} = ${value}`);
    return Reflect.set(target, prop, value, receiver);
  },

  // in 操作符拦截（'name' in proxy）
  has(target, prop) {
    if (prop.startsWith('_')) return false; // 私有属性不在 in 中出现
    return Reflect.has(target, prop);
  },

  // delete 操作拦截
  deleteProperty(target, prop) {
    if (prop.startsWith('_')) {
      throw new Error('不能删除私有属性');
    }
    console.log(`删除 ${prop}`);
    return Reflect.deleteProperty(target, prop);
  },

  // Object.keys / Object.entries 等枚举操作
  ownKeys(target) {
    return Reflect.ownKeys(target).filter(k => !k.toString().startsWith('_'));
  },

  // Object.getOwnPropertyDescriptor
  getOwnPropertyDescriptor(target, prop) {
    return Reflect.getOwnPropertyDescriptor(target, prop);
  },

  // Object.defineProperty
  defineProperty(target, prop, descriptor) {
    console.log(`定义属性 ${prop}`);
    return Reflect.defineProperty(target, prop, descriptor);
  },

  // Object.preventExtensions
  preventExtensions(target) {
    console.log('阻止扩展');
    return Reflect.preventExtensions(target);
  },

  // getPrototypeOf
  getPrototypeOf(target) {
    return Reflect.getPrototypeOf(target);
  },

  // setPrototypeOf
  setPrototypeOf(target, proto) {
    console.log('设置原型');
    return Reflect.setPrototypeOf(target, proto);
  },

  // isExtensible
  isExtensible(target) {
    return Reflect.isExtensible(target);
  },

  // apply（拦截函数调用）
  apply(target, thisArg, args) {
    console.log(`调用函数，参数: ${args}`);
    return Reflect.apply(target, thisArg, args);
  },

  // construct（拦截 new 操作）
  construct(target, args) {
    console.log('使用 new 构造');
    return Reflect.construct(target, args);
  }
};

const proxy = new Proxy(target, handler);
console.log(proxy.name);        // 读取 name: Alice
proxy.age = 25;                 // 设置 age = 25
console.log('name' in proxy);  // true
console.log('_secret' in proxy); // false（has trap 拦截）
```

### 19.2 Vue3 响应式原理（Proxy + Reflect）

Vue3 使用 Proxy 完全重写了响应式系统，相比 Vue2 的 `Object.defineProperty` 有质的飞跃。

```javascript
// Vue3 reactive 简化实现
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      // track：依赖收集，记录谁在读取这个属性
      track(target, key);
      const value = Reflect.get(target, key, receiver);
      // 如果属性仍是对象，递归包装为响应式（Vue3 的深度响应式）
      if (value !== null && typeof value === 'object') {
        return reactive(value); // 返回新代理（lazy 深度响应式）
      }
      return value;
    },

    set(target, key, value, receiver) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);
      // trigger：触发更新，通知所有依赖这个属性的 effect
      if (result && oldValue !== value) {
        trigger(target, key, value, oldValue);
      }
      return result;
    },

    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const result = Reflect.deleteProperty(target, key);
      if (result && hadKey) {
        trigger(target, key);
      }
      return result;
    },

    has(target, key) {
      const result = Reflect.has(target, key);
      track(target, key);
      return result;
    },

    // 支持 Map / Set 操作
    get(target, key, receiver) {
      if (key === 'size') {
        track(target, ITERATOR_KEY);
        return Reflect.get(target, key, receiver);
      }
      // ... Map.set / Map.get / Map.has 等
      return reactive(target[key]);
    }
  });
}

// shallowReactive：只代理第一层（性能优化）
function shallowReactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key);
      return Reflect.get(target, key, receiver); // 不递归包装
    },
    set(target, key, value, receiver) {
      Reflect.set(target, key, value, receiver);
      trigger(target, key);
      return true;
    }
  });
}

// computed 的简化实现
function computed(getter) {
  let value;
  let dirty = true;

  const effect = () => { dirty = true; /* 重新计算 */ };

  return {
    get value() {
      if (dirty) {
        value = getter();
        dirty = false;
      }
      return value;
    }
  };
}

// watchEffect 的简化实现
function watchEffect(effect) {
  effect(); // 首次执行，触发 track
  // 当 reactive 对象变化时，trigger 调用此 effect
}
```

#### Proxy vs Object.defineProperty 对比

| 维度 | `Object.defineProperty`（Vue2） | `Proxy`（Vue3） |
|------|-------------------------------|----------------|
| 检测粒度 | 属性级（需遍历所有 key） | 对象级（拦截所有操作） |
| 新增属性 | 需 `Vue.set` | 自动拦截，无需特殊处理 |
| 删除属性 | 需 `Vue.delete` | 自动拦截 |
| 数组下标 | 需重写 7 个方法（`push`/`pop` 等） | 原生支持，数组操作自动拦截 |
| Map/Set/WeakMap/WeakSet | 不支持 | 完全支持 |
| 嵌套对象 | 需 `deep` 选项 + 递归 | 自动递归代理（lazy） |
| 性能 | 初始化时开销大 | 按需代理，运行时开销更小 |
| 浏览器兼容 | IE9+ | IE 不支持（无 polyfill） |

### 19.3 Reflect 详解

`Reflect` 是 ES6 提供的内置对象，将 `Object` 上的操作以函数形式统一封装，返回值语义更一致（失败返回 `false` 而非抛错）。

```javascript
// Reflect vs Object 核心方法对应
Reflect.get(target, prop, receiver)       // 替代 obj[prop]
Reflect.set(target, prop, value)          // 替代 obj[prop] = value
Reflect.has(target, prop)                 // 替代 prop in obj
Reflect.deleteProperty(target, prop)      // 替代 delete obj[prop]
Reflect.ownKeys(target)                   // 替代 Object.keys() + Symbol
Reflect.getPrototypeOf(target)            // 替代 Object.getPrototypeOf()
Reflect.setPrototypeOf(target, proto)     // 替代 Object.setPrototypeOf()
Reflect.isExtensible(target)             // 替代 Object.isExtensible()
Reflect.preventExtensions(target)         // 替代 Object.preventExtensions()
Reflect.getOwnPropertyDescriptor()        // 替代 Object.getOwnPropertyDescriptor()
Reflect.defineProperty(target, prop, desc) // 替代 Object.defineProperty()
Reflect.apply(fn, thisArg, args)          // 替代 Function.prototype.apply.call()

// 为什么 Proxy handler 中用 Reflect？
// Proxy handler 的核心职责：自定义行为 + 调用默认行为
// Reflect 提供的正是这个"默认行为"的实现

const target = { name: 'Alice' };
const proxy = new Proxy(target, {
  get(target, prop, receiver) {
    // 自定义行为：日志
    console.log(`log: ${prop}`);
    // 调用默认行为：返回属性值
    // 注意 receiver：如果 proxy 被继承，receiver 是 proxy 本身
    // 不使用 Reflect.get 的话，直接 return target[prop] 在继承场景下会出错
    return Reflect.get(target, prop, receiver);
  }
});

// Reflect.apply 替代老写法
// 老：Function.prototype.apply.call(fn, thisArg, args)
// 好：
Reflect.apply(Math.floor, undefined, [1.6]);   // 1
Reflect.apply(String.prototype.toUpperCase, 'abc', []); // 'ABC'

// Reflect.construct：替代 new 操作符（用于 Proxy construct trap）
function Person(name) { this.name = name; }
const p = Reflect.construct(Person, ['Alice'], Person);
// 等价于 new Person('Alice')，但可用于在 Proxy 中拦截 new
```

### 19.4 Mongoose / 表单验证模式

Proxy 可用于实现类似 Mongoose 的 Schema 验证模式：

```javascript
// 基于 Proxy 的数据验证（模拟 Mongoose Schema）
function createSchema(schema) {
  const validators = {};

  // 收集所有字段的验证规则
  for (const [field, rules] of Object.entries(schema)) {
    validators[field] = {
      type: rules.type,
      required: rules.required,
      min: rules.min,
      max: rules.max,
      pattern: rules.pattern,
      enum: rules.enum,
    };
  }

  return function createModel(initialData = {}) {
    const data = { ...initialData };

    return new Proxy(data, {
      get(target, prop) {
        if (prop === 'toJSON') return () => ({ ...target });
        if (prop === 'validate') return () => validateAll(target);
        return target[prop];
      },

      set(target, prop, value) {
        const rules = validators[prop];
        if (!rules) {
          // 动态添加字段（Schema-less）
          target[prop] = value;
          return true;
        }

        // 类型检查
        if (rules.type && typeof value !== rules.type) {
          throw new TypeError(`${prop} 期望类型 ${rules.type}，实际 ${typeof value}`);
        }
        // required 检查
        if (rules.required && (value === null || value === undefined || value === '')) {
          throw new Error(`${prop} 是必填字段`);
        }
        // 枚举检查
        if (rules.enum && !rules.enum.includes(value)) {
          throw new Error(`${prop} 必须是 ${rules.enum.join('|')} 之一`);
        }
        // 范围检查
        if (rules.min !== undefined && value < rules.min) {
          throw new Error(`${prop} 不能小于 ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          throw new Error(`${prop} 不能大于 ${rules.max}`);
        }

        target[prop] = value;
        return true;
      }
    });
  };
}

// 使用示例
const UserSchema = createSchema({
  name: { type: 'string', required: true },
  age: { type: 'number', min: 0, max: 150 },
  role: { type: 'string', enum: ['admin', 'user', 'guest'] },
});

const user = new UserSchema({ name: 'Alice', age: 18, role: 'user' });
user.name = 'Bob';           // OK
user.age = -5;               // Error: age 不能小于 0
user.role = 'superadmin';   // Error: role 必须是 admin|user|guest 之一

function validateAll(data) {
  // 验证所有字段的 required
  return Object.entries(data).filter(([k, v]) => v === undefined || v === '');
}
```

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| `receiver` 参数忽视 | 继承场景中 `receiver` 是代理对象本身，直接用 `target[prop]` 会导致 this 绑定错误 | 始终在 Proxy 的 get/set 中使用 `Reflect.get/set(..., receiver)` |
| Proxy 嵌套自身 | 在 `get` trap 中对同一对象调用 `reactive(target[key])` 可能陷入死循环 | 做好类型判断：`if (isObject(val)) return reactive(val)` |
| Proxy 无法被 polyfill | IE 等旧浏览器没有 Proxy | 需要兼容旧浏览器时降级到 `Object.defineProperty` |
| Proxy 拦截 `in` 操作 | `'key' in proxy` 会触发 `has` trap，但 `for...in` 触发 `ownKeys` | 两者分开处理 |
| Proxy 的 `this` 绑定 | 在 Proxy 内部方法中 `this` 指向 Handler 还是 Target | 始终通过 `target` 操作真实对象 |

### 面试追问

**Q1: `Reflect.get` 中的第三个参数 `receiver` 有什么用？**
当 Proxy 被作为另一个对象的原型或被继承时，`receiver` 指向调用链中的对象（通常是 Proxy 本身）。如果直接 `return target[prop]`，在 getter/setter 场景中，`this` 绑定会指向 `target` 而非 `proxy`，导致继承链断裂。`Reflect.get(target, prop, receiver)` 确保属性访问的 `this` 绑定正确。

**Q2: Vue3 为什么选择 Proxy 而不是 `Object.defineProperty`？**
`defineProperty` 只能监听已有属性，新增属性需要 `Vue.set`；无法监听数组下标直接赋值（Vue2 重写了 7 个数组方法）；无法监听 `delete`；无法处理 `Map/Set`。Proxy 原生拦截所有操作，新增/删除属性自动响应，数组操作天然支持，且性能更好（按需代理 vs 初始化时全量遍历）。

**Q3: 如何实现一个可撤销的 Proxy？**
```javascript
const { proxy, revoke } = Proxy.revocable(target, handler);
// 使用 proxy...
revoke(); // 一旦调用，proxy 的所有操作都抛出 TypeError
```

---

## 20. ESModule vs CommonJS

### 20.1 核心区别与对比

![ESM 与 CJS 对比](assets/images/mermaid/esm-vs-cjs.png)


### 20.2 编译时 vs 运行时

```javascript
// ESM：编译时解析（静态分析）
// 优点：打包工具可以在不执行模块的情况下分析依赖关系
// import 必须出现在模块顶层（不能放在 if/function 中）
import { a } from './a.js';     // ✓ 静态
import defaultExport from 'lib'; // ✓ 静态

// CJS：运行时解析
// require 可以是动态的
const path = process.env.NODE_ENV === 'production' ? './prod.js' : './dev.js';
const module = require(path);    // ✓ 动态

// 动态 import（返回 Promise，支持代码分割）
const module = await import('./module.js'); // ESM 语法，但动态
```

### 20.3 循环引用机制

```
ESM 循环引用：暂时性死区（TDZ）

// a.mjs
import { b } from './b.mjs';   // 先执行：执行到这里时暂停，先去加载 b.mjs
export const a = 'a';
console.log(b);                // 此时 b 是 undefined（b.mjs 还未完成初始化）

// b.mjs
import { a } from './a.mjs';   // b.mjs 执行到此处，a 仍是 TDZ 中的 undefined
export const b = 'b';
console.log(a);                // undefined

Node.js ESM 规则：遇到 import 时，被导入模块开始执行直到所有 import 完成，
                        第一个模块在 import 语句处暂停，等被导入模块完成后再继续
```

```javascript
// CommonJS 循环引用：基于缓存
// 缓存机制：require 时立即执行，结果缓存到 require.cache
// a.js
console.log('a 开始');
exports.done = false;
const b = require('./b.js');
console.log('a: b.done =', b.done);
exports.done = true;
console.log('a 结束');

// b.js
console.log('b 开始');
exports.done = false;
const a = require('./a.js');
console.log('b: a.done =', a.done);
exports.done = true;
console.log('b 结束');

// main.js
const a = require('./a.js');
console.log('main: a.done =', a.done);

// 关键点：
// 1. require('a') 开始执行 a.js
// 2. a.js 执行到 require('b')，开始执行 b.js
// 3. b.js 执行到 require('a')，require('a') 返回缓存中的 a（exports.done = false）
// 4. b.js 继续完成
// 5. a.js 继续（exports.done = true）
// 6. main.js 拿到 a.done = true
```

### 20.4 import 绑定的只读性

```javascript
// lib.mjs
export let count = 0;
export function increment() { count++; }

// main.mjs
import { count, increment } from './lib.mjs';

count = 5;       // TypeError: Cannot assign to 'count'（只读绑定）
increment();     // OK，lib.mjs 内部可以修改自己的变量
console.log(count); // 1（因为 increment 修改了）
```

### 20.5 Tree Shaking 原理

Tree Shaking 是打包工具（Rollup、Webpack 4+）通过静态分析 ESM 依赖图，消除未使用的导出代码（dead code elimination）。

![Tree Shaking 原理](assets/images/mermaid/tree-shaking-process.png)

### 20.5 Tree Shaking 条件

#### Tree Shaking 条件

```javascript
// 1. 必须是 ESM 模块（静态 import/export）
// CJS 的 require() 是运行时求值，无法静态分析

// 2. 导出函数必须是"纯函数"（无副作用）
// 有副作用的代码不会被 shaking
import { unused } from 'side-effect-lib'; // 可能不会被 shaking（side-effect 风险）

// package.json sideEffects 字段
{
  "sideEffects": [
    "./src/polyfill.js",  // 有副作用的文件
    "*.css"                // CSS 文件有副作用
  ]
}
// sideEffects: false → 所有导出都没副作用，可以大胆 shaking
// sideEffects: ["file"] → 只有这些文件有副作用，其他可安全 shaking
}

// 3. 不能有动态 import
// import('./module.js').then(m => m.used) ← 打包工具无法静态分析

// 实际案例：lodash-es vs lodash
import { debounce } from 'lodash-es';   // ✓ 可以 tree shaking，只打包 debounce
import debounce from 'lodash';           // ✗ 整个 lodash 被打包
import debounce from 'lodash/debounce'; // ✓ 单独导入，可以 shaking（部分模块支持）
```

### 20.6 动态 import 与 top-level await

```javascript
// 动态 import：返回 Promise，用于代码分割（路由懒加载）
const { showModal } = await import('./modal.js'); // 等价于 .then()

// React Router v6 路由懒加载
const Home = lazy(() => import('./Home'));
const About = lazy(() => import('./About'));

// top-level await（ES2022）：模块顶层直接 await
// 相当于模块内自动包裹了 async 函数
const config = await fetch('/api/config').then(r => r.json());
export { config };

// top-level await 限制：
// 1. 只能在 ESM 模块顶层
// 2. 阻塞模块执行（可以用作模块级初始化）
// 3. 在 Node.js 中，顶层 await 使当前模块成为一个异步模块

// 应用：ESM 模块初始化（替代 IIFE）
const db = await createDatabaseConnection(); // 模块初始化
export { db };

// 与动态 import 的关系：import() 本身返回 Promise，所以可以 await
const module = await import('./feature.js');
```

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| 混淆 ESM 导出方式 | 同时用 `export default` 和 `export const` 造成混乱 | 统一风格（推荐：默认导出 + 按名导出混用） |
| 循环依赖导致 undefined | ESM 循环引用中导出的值在导入时可能是 undefined | 避免循环依赖，或在循环引用中使用函数调用而非直接读取值 |
| `require` vs `import` 混用 | 在同一个项目中混用 CJS 和 ESM 导致互操作问题 | Node.js 中通过 `.mjs` / `package.json` `type` 字段区分 |
| 在循环中 require | 每次循环都 require 造成性能问题 | 移到循环外一次 require |
| Side effect 文件被 shaking | 有副作用的 polyfill 文件被误删除 | 在 `package.json` 的 `sideEffects` 中声明 |

### 面试追问

**Q1: CJS 和 ESM 可以在同一个文件中混用吗？**
在 Node.js 中，`import` 语句可以引用 CJS 模块（`require()` 的结果被当作默认导出），但 `require()` 不能引用 ESM 模块（因为 ESM 是编译时加载）。ESM 可以用 `import()` 动态引用 CJS。

**Q2: Tree Shaking 为什么只能用于 ESM？**
ESM 的 `import`/`export` 是编译时静态分析，依赖关系在打包阶段就能确定。打包工具在构建时就能判断哪些导出没有被任何地方引用。CJS 的 `require()` 是运行时求值，参数可以是变量/函数返回值，打包工具无法在不执行代码的情况下判断模块间的依赖关系。

**Q3: `import * as` 和 `import { a, b }` 有什么区别？**
`import { a } from './mod'` 直接解构获取命名导出，是导入绑定（live binding），值与原模块实时同步（通过 `get` 拦截）。`import * as mod` 导入整个模块命名空间对象，两者都能被 Tree Shaking，但按名导入更容易分析具体使用了哪些导出。

---

## 21. 垃圾回收（GC）

### 21.1 V8 内存架构与 GC 分代

![Map 与 Object 对比](assets/images/mermaid/map-vs-object.png)



### 21.2 GC 算法详解

#### 标记-清除（Mark-Sweep）

![标记-清除算法](assets/images/mermaid/mark-sweep.png)


#### 标记-整理（Mark-Compact）

```javascript
// Mark-Compact 在 Mark-Sweep 基础上增加"整理"步骤
// 将存活对象向一端移动，消除内存碎片
// 代价：需要额外的移动和更新指针操作，时间更长
```

#### 增量标记 + 懒清理

```javascript
// V8 策略：增量标记（Incremental Marking）+ 懒清理（Lazy Sweeping）
// 原理：全量 GC 会导致长停顿（Stop-The-World），影响用户体验
// 增量标记：将标记过程分成多个小步骤，穿插在 JS 执行中间
// 每执行一小段 JS，就执行一点 GC 标记，逐步完成整个堆的标记
// 减少单次 GC 停顿时间，改善页面响应
```

#### 引用计数（历史方案）

```javascript
// 引用计数：每个对象记录被引用次数
// 为0时立即回收
// 缺点：无法处理循环引用
let a = { name: 'A' };
let b = { name: 'B' };
a.ref = b; // b引用+1
b.ref = a; // a引用+1
// a 和 b 互相引用，但外部没有引用了，应该被回收
// 引用计数看不到这个"外部引用缺失"，永远无法回收 → 内存泄漏
// V8 选择 Mark-Sweep 解决这个问题
```

### 21.3 WeakRef 与 FinalizationRegistry（ES2021+）

```javascript
// WeakRef：持有对象的弱引用，不阻止 GC
const ref = new WeakRef({ name: 'target' });
console.log(ref.deref()?.name); // 'target'（如果对象还在）

// 使用场景：缓存大对象（不被 WeakRef 阻止 GC）
function createCache() {
  const cache = new Map();
  const weakCache = new WeakMap();

  return {
    set(key, value) {
      cache.set(key, value);
      weakCache.set(value, key);
    },
    get(key) {
      return cache.get(key);
    },
    // GC 后自动清理 cache 中对应的键（需配合 FinalizationRegistry）
  };
}

// FinalizationRegistry：对象被 GC 后执行回调
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`对象 ${heldValue} 已被垃圾回收`);
});

let obj = { name: 'data' };
registry.register(obj, obj.name);
obj = null; // 失去引用，迟早被 GC，届时触发回调
// 警告：FinalizationRegistry 回调时机不确定（由 GC 决定）
// 不要在回调中执行重要逻辑，只能用于辅助清理
```

### 21.4 内存泄漏场景

| 场景 | 说明 | 解决方案 |
|------|------|---------|
| 意外全局变量 | `function f() { big = new Array(100000); }` 变成 `window.big` | 用 `use strict` + lint 规则 |
| 定时器未清理 | `setInterval` / `setTimeout` 引用大对象 | `clearInterval` / `clearTimeout` |
| 闭包引用大对象 | 闭包持有外部作用域的引用 | 闭包用完置 null，或拆分函数 |
| DOM 引用 | DOM 从页面移除后 JS 仍持有引用 | `elements.body = null` 手动清引用 |
| 事件监听未移除 | `addEventListener` 后未 `removeEventListener` | 组件销毁时移除监听，或用 `{ once: true }` |
| Map/Set 缓存无限增长 | 缓存不清理导致内存暴涨 | 用 `WeakMap` / `WeakSet` 作为缓存，或手动清理 |
| console.log 调试 | 生产环境保留大量 console.log | 上线前移除或用工具过滤 |

```javascript
// Vue / React 组件内存泄漏示例
class Chart extends React.Component {
  componentDidMount() {
    // 全局事件监听（不清理会泄漏）
    window.addEventListener('resize', this.handleResize);

    // 定时器（不清理会泄漏）
    this.timer = setInterval(() => this.fetchData(), 5000);

    // 大数据缓存
    this.cache = new Map(); // 不清理会持续增长
  }

  componentWillUnmount() {
    // 清理所有副作用
    window.removeEventListener('resize', this.handleResize);
    clearInterval(this.timer);
    this.cache.clear(); // 手动清缓存
    this.cache = null;
  }
}
```

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| `delete obj.prop` vs `obj.prop = null` | `delete` 会改变对象结构（导致 V8 优化失效），性能差 | 用 `obj.prop = null` 而非 `delete` |
| 大量字符串拼接 | `str += 'a'` 在 V8 中每步创建新字符串 | 用数组 `+ .join('')` 或模板字符串 |
| 意外创建大数组 | `Array(1000000).fill(0)` 直接分配大内存 | 分批处理或用 TypedArray |
| WeakRef 误用 | 以为 WeakRef 能立即回收 | WeakRef 不保证何时回收，FinalizationRegistry 回调时机也不确定 |
| 全局变量污染 | 大量全局变量增加 GC 扫描范围 | 最小化全局变量，用 IIFE / 模块封装 |

### 面试追问

**Q1: V8 为什么用分代回收？**
大多数对象都是"朝生夕死"（生命周期很短），只有少数对象存活很久。分代回收利用这个规律：新生代用 Scavenge（快但费空间，50%空间换速度），老生代用 Mark-Sweep+Compact（慢但省空间）。这样大多数对象的回收在新生代快速完成，只有存活久的对象才进入老生代，减少了 GC 开销。

**Q2: 如何排查 JavaScript 内存泄漏？**
Chrome DevTools → Memory 面板：1. 使用 **Allocation Timeline** 记录一段时间的内存分配，找出持续增长的对象。2. 使用 **Heap Snapshot** 拍快照，对比两个时间点的差异，找出"保留树"中没有被回收的大对象。3. 用 **Performance Monitor** 观察 JS Heap 大小曲线，线性上升即为泄漏。4. 检查 `FinalizationRegistry` 回调确认对象被回收。

**Q3: `WeakRef` 和 `WeakMap` 有什么本质区别？**
`WeakMap` 的弱引用针对**键**（必须是对象），值是强引用。无键时整个条目消失。`WeakRef` 的弱引用针对**整个对象**（目标），提供 `.deref()` 方法获取对象（强引用）或 null（已被 GC）。`WeakRef` 更灵活但更底层，`WeakMap` 更适合做对象到值的映射缓存。

---

## 22. Web Worker

### 22.1 为什么需要 Web Worker

![浏览器事件循环流程](assets/images/mermaid/event-loop.png)




JavaScript 单线程的根本原因：DOM 是单线程共享的。如果 JS 多线程同时修改 DOM，结果不可预测。Web Worker 通过独立线程执行 JS，不共享内存，通过消息传递通信，不阻塞主线程。

### 22.2 Worker 类型与创建

```javascript
// 1. Dedicated Worker（专用 Worker，当前页面独占）
const worker = new Worker('/worker.js'); // 传入脚本路径
const worker = new Worker(
  new URL('./worker.js', import.meta.url), // Vite/Webpack 推荐写法
  { type: 'module' } // 支持 ESM
);

// worker.js（独立文件，或 Blob URL）
self.onmessage = (event) => {
  const { type, data } = event.data;
  if (type === 'calc') {
    const result = heavyComputation(data);
    self.postMessage(result);
  }
};

// 主线程通信
worker.postMessage({ type: 'calc', data: [1, 2, 3] });
worker.onmessage = (e) => console.log('结果:', e.data);
worker.onerror = (e) => console.error('Worker 错误:', e.message, e.lineno);

// 2. SharedWorker（多个页面/标签页共享）
const sharedWorker = new SharedWorker('/shared-worker.js');
sharedWorker.port.start();
sharedWorker.port.onmessage = (e) => console.log('SharedWorker:', e.data);
sharedWorker.port.postMessage('hello');

// shared-worker.js
self.onconnect = (e) => {
  const port = e.ports[0];
  port.onmessage = (e) => {
    port.postMessage(`收到: ${e.data}`);
  };
  port.start();
};
```

### 22.3 postMessage 与数据传输

```javascript
// postMessage 传输机制

// 1. 结构化克隆（Structured Clone，默认）
// 支持：基本类型、对象、数组、Date、RegExp、Map/Set（不循环引用）、Blob、File
worker.postMessage({ type: 'result', data: { user: { name: 'Alice' } } });
// 数据被完整复制（深拷贝），Worker 端和主线程端独立

// 2. Transferable 对象（所有权转移，比克隆快得多）
const buffer = new ArrayBuffer(8);
worker.postMessage(buffer, [buffer]); // 转移所有权
// 主线程中 buffer.byteLength === 0
// 适用于：ArrayBuffer、MessagePort、ImageBitmap、OffscreenCanvas

// 3. SharedArrayBuffer（共享内存，需要 COEP 头）
const sharedBuffer = new SharedArrayBuffer(1024);
const view = new Int32Array(sharedBuffer);
worker.postMessage(sharedBuffer, [], [sharedBuffer]); // 转移共享内存

// Worker 中
self.onmessage = (e) => {
  const sharedBuffer = e.data;
  const view = new Int32Array(sharedBuffer);
  Atomics.add(view, 0, 1); // 原子操作
  Atomics.notify(view, 0, 1);
};
// 使用 SharedArrayBuffer 需要服务器设置响应头：
// Cross-Origin-Embedder-Policy: require-corpop
// Cross-Origin-Opener-Policy: same-origin
```

### 22.4 OffscreenCanvas（Worker 中绘制）

```javascript
// OffscreenCanvas：将 Canvas 控制权转移到 Worker
// 用途：在 Worker 中完成所有绘制，不阻塞主线程

// 主线程
const canvas = document.getElementById('display-canvas');
const offscreen = canvas.transferControlToOffscreen(); // 转移控制权

worker.postMessage(
  { type: 'init', canvas: offscreen }, // 传递 OffscreenCanvas
  [offscreen]                          // 转移所有权
);

// worker.js
self.onmessage = (e) => {
  if (e.data.type === 'init') {
    const canvas = e.data.canvas;
    const ctx = canvas.getContext('2d');

    function render() {
      // 在 Worker 中绘制
      ctx.fillStyle = 'blue';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.fillText('Worker Rendering', 50, 50);

      // 下一帧继续绘制
      self.requestAnimationFrame(render); // Worker 中也有 rAF
    }
    render();
  }
};
```

### 22.5 Worker 限制与注意事项

| 限制 | 说明 |
|------|------|
| 无 DOM | 不能 `document.getElementById()` / `window.alert()` |
| 无主线程全局对象 | `window`、`document`、`parent` 不可用 |
| 独立上下文 | Worker 内的 `self` === 全局对象 |
| 内存不共享 | 通过消息传递（克隆或 Transferable） |
| `importScripts` | Worker 专用脚本加载（同步，阻塞） |
| 同源限制 | Worker 脚本必须同源（或 CORS 允许） |
| 兼容性 | `SharedWorker` / `OffscreenCanvas` / `SharedArrayBuffer` 兼容性较差 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| 在 Worker 中同步 `importScripts` | 阻塞 Worker 线程 | 用 `import`（ESM Worker）或动态 `import()` |
| postMessage 传大对象用克隆 | 大对象克隆耗时 | 用 Transferable 对象（ArrayBuffer/ImageBitmap） |
| Worker 泄漏 | 忘记 `worker.terminate()` | 任务完成后主动终止，避免 Worker 持续占用资源 |
| Worker 中直接操作 DOM | 不支持 | 用 OffscreenCanvas 或传回主线程处理 |
| SharedWorker 兼容性 | Safari/旧版不支持 | 降级到 Dedicated Worker |

### 面试追问

**Q1: Worker 与主线程之间如何通信？**
通过 `postMessage` API：发送方调用 `.postMessage(data, transferList)`，接收方通过 `.onmessage = (e) => {}` 事件处理。数据通过**结构化克隆算法**深拷贝传输，或者通过 Transferable 对象转移所有权（主线程失去对象引用，Worker 获得）。Transferable 比克隆快 10 倍以上，适合大数据传输。

**Q2: SharedWorker 和 DedicatedWorker 的区别？**
DedicatedWorker 只能被创建它的页面使用，关闭页面即终止。SharedWorker 可被多个同源的页面/标签页共享，通过端口（port）通信。适合跨标签页共享状态（如多人协作工具）。缺点是 Safari 不支持，且调试复杂。

**Q3: 什么场景适合用 Web Worker？**
1. **计算密集型**：大数据排序、图像处理、加密解密、压缩解压、3D 计算。
2. **长时任务**：大文件解析（如 CSV/JSON 流处理）、复杂算法。
3. **高频率任务**：实时数据流处理、聊天消息加密。
4. **不适用**：需要频繁 DOM 操作的场景、简单计算（通信开销反而更大）。

---

## 24. 防抖与节流

### 24.1 概念定义与对比

![防抖与节流对比](assets/images/mermaid/debounce-vs-throttle.png)



| 维度 | 防抖（Debounce） | 节流（Throttle） |
|------|----------------|----------------|
| 核心思想 | N 秒内无新触发才执行 | 固定时间间隔内最多执行一次 |
| 定时器行为 | 每次触发重置计时器 | 不重置，等时间窗口结束 |
| 执行时机 | 尾部（默认）或头部（`immediate`） | 头部（默认）或尾部 |
| 适用场景 | 搜索输入、窗口 resize 停止后、提交按钮 | 滚动、拖拽、射击游戏点击 |
| 性能影响 | 更节省（只执行一次） | 稳定（定期执行） |

### 24.2 防抖实现（完整版）

```javascript
// 基础防抖（尾部执行）
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

// 防抖 + 头部执行（immediate）
function debounceLeadingTrailing(fn, delay, immediate = false) {
  let timer = null;
  return function(...args) {
    if (immediate && !timer) {
      // 头部：立即执行
      fn.apply(this, args);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!immediate) {
        // 尾部：延迟后执行
        fn.apply(this, args);
      }
      timer = null;
    }, delay);
  };
}

// 完整防抖（头部+尾部都执行）
function debounceFull(fn, delay) {
  let leadingTimer = null;
  let trailingTimer = null;
  let lastArgs = null;

  return function(...args) {
    lastArgs = args;

    // 尾部执行（延迟）
    clearTimeout(trailingTimer);
    trailingTimer = setTimeout(() => {
      fn.apply(this, lastArgs);
      leadingTimer = null;
      trailingTimer = null;
    }, delay);

    // 头部执行（立即，只在没有等待中的尾部时执行）
    if (!leadingTimer) {
      fn.apply(this, args);
      leadingTimer = setTimeout(() => { leadingTimer = null; }, delay);
    }
  };
}

// 使用示例
const debouncedSearch = debounce((query) => {
  console.log(`搜索: ${query}`);
  fetch(`/api/search?q=${query}`);
}, 300);

const input = document.getElementById('search');
input.addEventListener('input', (e) => debouncedSearch(e.target.value));
```

### 24.3 节流实现

```javascript
// 方式1：时间戳版（头部执行）
function throttleTimestamp(fn, delay) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

// 方式2：定时器版（尾部执行）
function throttleTimer(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) return; // 已注册，等待执行
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

// 方式3：时间戳+定时器混用（头部+尾部都保证执行）
function throttle(fn, delay) {
  let lastTime = 0;
  let timer = null;

  return function(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastTime);

    if (remaining <= 0 || remaining > delay) {
      // 超过等待时间，立即执行并重置
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      // 没超过等待时间，注册尾部执行
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}
```

### 24.4 requestAnimationFrame 节流

```javascript
// rAF 节流：最精确，匹配屏幕刷新率，60fps 约每 16.67ms 执行一次
// 优点：与屏幕刷新同步，不掉帧，不卡顿
// 缺点：标签页后台时不执行（节省资源），不保证执行频率

function throttleRAF(fn) {
  let requestId = null;
  let lastArgs = null;

  return function(...args) {
    lastArgs = args;

    if (requestId === null) {
      requestId = requestAnimationFrame(() => {
        fn.apply(this, lastArgs);
        requestId = null;
      });
    }
  };
}

// rAF 防抖：只在最后一次 rAF 帧执行
function debounceRAF(fn) {
  let requestId = null;
  return function(...args) {
    if (requestId !== null) {
      cancelAnimationFrame(requestId);
    }
    requestId = requestAnimationFrame(() => {
      fn.apply(this, args);
      requestId = null;
    });
  };
}

// 实际场景：滚动时更新位置指示器
function setupScrollProgress() {
  const progressBar = document.getElementById('progress');

  const updateProgress = throttleRAF(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    progressBar.style.width = `${progress}%`;
  });

  window.addEventListener('scroll', updateProgress, { passive: true });
}
```

### 24.5 React/TypeScript 防抖节流 Hook

```tsx
import { useEffect, useRef, useCallback } from 'react';
import { useMemo } from 'react';

// 防抖 Hook
function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current!);
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      clearTimeout(timerRef.current!);
      timerRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

// 节流 Hook（时间戳版）
function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastTimeRef = useRef(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastTimeRef.current >= delay) {
        lastTimeRef.current = now;
        fn(...args);
      }
    },
    [fn, delay]
  );
}

// 在 React 组件中使用
function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const debouncedSearch = useDebounce(async (q: string) => {
    if (!q) { setResults([]); return; }
    const res = await fetch(`/api/search?q=${q}`);
    setResults(await res.json());
  }, 300);

  return (
    <>
      <input onChange={e => {
        setQuery(e.target.value);
        debouncedSearch(e.target.value);
      }} />
      {/* results... */}
    </>
  );
}
```

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| 防抖在 `input` 事件中用 `keydown` | 每个按键都触发防抖，搜索体验差 | 用 `input` 事件而非 `keydown` |
| 节流间隔设置过短 | 失去节流意义，频繁执行 | 根据场景设合适间隔（滚动 16ms, resize 200ms） |
| `this` 指向丢失 | 防抖/节流包装后 `this` 可能指向错误 | 用 `fn.apply(this, args)` 或箭头函数 |
| 忘记取消定时器 | 内存泄漏、组件卸载后仍执行 | 在 `useEffect` return / `componentWillUnmount` 中清理 |
| `debounce` 尾部模式在懒加载场景失效 | 懒加载组件的防抖因组件挂载而失效 | 用 `useDebouncedCallback`（useCallback + debounce） |
| scroll 事件不用 `{ passive: true }` | scroll 是不可取消的宏任务，影响滚动性能 | `addEventListener('scroll', handler, { passive: true })` |

### 面试追问

**Q1: `leading: true` 和 `leading: false` 的防抖在什么场景分别适用？**

```javascript
// leading: true（头部执行）：用户体验"立即响应"
const save = debounceLeadingTrailing((data) => saveToServer(data), 1000, true);
// 场景：用户不希望等待，直接看到反馈

// leading: false（尾部执行，默认）：确保用户"最终完成"后才处理
const validate = debounceLeadingTrailing((data) => validateOnServer(data), 1000, false);
// 场景：搜索建议，用户输入完才请求
```

**Q2: 如何取消一个已防抖的函数调用？**

```javascript
const debouncedFn = debounce(doSomething, 1000);

// 方法1：调用 clearTimeout
debouncedFn.cancel?.(); // 需要在实现中加入 cancel 方法

// 改进的防抖（带 cancel）
function debounceCancelable(fn, delay) {
  let timer = null;
  const debounced = function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => { fn(...args); timer = null; }, delay);
  };
  debounced.cancel = () => { clearTimeout(timer); timer = null; };
  debounced.flush = () => { if (timer) { clearTimeout(timer); fn(...lastArgs); } };
  let lastArgs;
  return debounced;
}

const fn = debounceCancelable(doSomething, 1000);
fn.cancel(); // 取消等待中的调用
fn.flush();  // 立即执行
```

**Q3: `lodash` 的 `debounce` 和手写实现的区别？**
手写版本适用于简单场景。`lodash.debounce` 更完善：支持 `maxWait`（最大等待时间，即使频繁触发也至少执行一次）、`trailing`/`leading` 独立配置、`cancel()` 取消、`flush()` 立即执行、正确的 `this` 上下文。生产环境推荐使用 `lodash.debounce` 或 `lodash-es`（支持 Tree Shaking）。

---

## 附录：参考资料

### Proxy 与 Reflect

| 资源 | 说明 |
|------|------|
| [MDN - Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy) | Proxy 代理对象 |
| [MDN - Reflect](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect) | Reflect 反射 |
| [腾讯云 - Vue3 Proxy + Reflect](https://cloud.tencent.com/developer/news/2263970) | Vue3 响应式原理 |
| [知乎 - Vue3 Proxy 详解](https://zhuanlan.zhihu.com/p/109252446) | Vue3 Proxy 详解 |
| [CSDN - Proxy vs defineProperty](https://blog.csdn.net/caishuangxi111/article/details/146554747) | Vue3 响应式对比 |

### 模块与打包

| 资源 | 说明 |
|------|------|
| [CSDN - ESM vs CJS](https://blog.csdn.net/iChangebaobao/article/details/124176936) | ESM vs CJS + Tree Shaking |
| [腾讯云 - Webpack Tree Shaking](https://cloud.tencent.com/developer/article/2567183) | Tree Shaking 实践 |

### 垃圾回收与内存

| 资源 | 说明 |
|------|------|
| [CSDN - V8 GC 分代回收](https://blog.csdn.net/qi_bai_jin/article/details/158261107) | V8 垃圾回收原理 |
| [CSDN - 垃圾回收详解](https://blog.csdn.net/yjh_OK/article/details/145779677) | V8 垃圾回收 |
| [MDN - WeakRef](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakRef) | WeakRef API |

### Web Worker

| 资源 | 说明 |
|------|------|
| [CSDN - Web Workers 基本概念](https://www.jb51.net/article/2602211.htm) | Web Worker 入门 |
| [CSDN - Worker + OffscreenCanvas](https://blog.csdn.net/2501_92234528/article/details/148566011) | 多线程渲染 |

### 性能优化

| 资源 | 说明 |
|------|------|
| [CSDN - 防抖与节流原理](https://blog.csdn.net/achievek/article/details/119696960) | 防抖节流详解 |
| [腾讯云 - Throttle 实现](https://cloud.tencent.com/developer/article/2552090) | Throttle 与 Debounce |