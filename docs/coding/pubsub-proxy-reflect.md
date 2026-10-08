---
title: 发布订阅、Proxy 与 Reflect
description: 深入讲解前端面试高频手写题：发布订阅模式、Proxy 代理、Reflect 反射，每道题包含完整代码、测试用例和关键考点解析。
tags:
  - coding
  - interview
date: 2026-05-17
---

# 发布订阅、Proxy 与 Reflect

> 本专题深入讲解前端面试中的高频手写题：发布订阅模式（Pub-Sub）、Proxy 代理、Reflect 反射。每道题包含完整代码、测试用例和关键考点解析。

---

## 1. 发布订阅模式

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
// 第 1 段：类骨架与事件表初始化（建立"事件名 → 回调数组"的映射容器）
class EventEmitter {
  constructor() {
    // 用一个普通对象当字典：键是事件名，值是回调函数数组。
    // 注意这里故意用 {} 而非 Object.create(null)，所以事件名若取 'constructor'、'toString'
    // 等原型链上的名字，读写时会命中原型属性，属于这门实现的一个已知边界坑。
    this.events = {};
  }

  // 第 2 段：on —— 注册订阅（惰性建桶 + 追加，支持链式调用）
  on(eventName, callback) {
    // 惰性初始化：只有真正有人订阅该事件时才创建数组，避免为未使用的事件名预分配空间。
    // 不这么写直接 push 会在首次订阅时因 this.events[eventName] 为 undefined 而抛错。
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    // 同一个事件名允许多个回调，按注册先后顺序入桶，emit 时会依此顺序同步触发。
    this.events[eventName].push(callback);
    return this; // 返回实例本身，从而支持 emitter.on(a).on(b) 的链式写法。
  }

  // 第 3 段：once —— 一次性订阅（用闭包包装器实现"触发即注销"）
  once(eventName, callback) {
    // 关键技巧：真正注册进事件表的是这个包装函数，而不是 callback 本身。
    // 包装函数通过闭包同时持有 eventName 和 callback，因此才能在触发时把自己摘掉。
    const onceWrapper = (...args) => {
      // 必须先注销再执行业务回调：若先调用 callback，而 callback 内部又 emit 了同名事件，
      // 就会在下一次派发中再次命中自己，形成重复触发甚至无限递归。
      this.off(eventName, onceWrapper);
      // 透传 emit 收到的全部参数；apply 使业务回调内部的 this 默认指向 emitter 实例。
      callback.apply(this, args);
    };
    // 注册的是包装器，所以外部若想用原 callback 调 off 是删不掉的——只能靠包装器自注销。
    this.on(eventName, onceWrapper);
    return this;
  }

  // 第 4 段：emit —— 派发事件（快照遍历，同步触发，返回是否有监听者）
  emit(eventName, ...args) {
    // 用剩余参数收集除事件名外的全部实参，再原样透传给每个回调，参数个数不受限。
    const callbacks = this.events[eventName];
    // 区分"没人订阅"与"订阅过但已全部退订"：两者都视为派发失败，返回 false，
    // 调用方可据此判断事件是否真的有人处理（这也是 emit 返回布尔值的语义所在）。
    if (!callbacks || callbacks.length === 0) {
      return false;
    }
    // 浅拷贝防止emit过程中修改数组
    // 改写成遍历快照还有一层深意：回调内部若调用 on/off 改动原数组，
    // 直接 forEach 原数组会导致索引漂移（漏触发或跳过元素），快照则保证本次派发集合固定。
    [...callbacks].forEach(callback => {
      // 同步、串行调用：前一个回调抛出的异常会中断后续回调的执行，
      // 且异常会一路冒泡出 emit，因此这里没有 try/catch 隔离。
      callback.apply(this, args);
    });
    return true;
  }

  // 第 5 段：off —— 退订（按引用定位并删除一个匹配项）
  off(eventName, callback) {
    const callbacks = this.events[eventName];
    // 没订阅过该事件就无需处理，直接返回实例保证链式调用不断裂。
    if (!callbacks) return this;

    // 靠函数引用相等来定位，indexOf 只返回第一个匹配位置，
    // 所以同一回调被重复 on 多次时，需要调用 off 相同次数才能彻底清除。
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      // splice 原地修改数组：这是 emit 里必须做浅拷贝的根因之一。
      // 只删元素不删除空数组，事件名对应的桶会一直留在 events 中（长生命周期下属于轻微内存驻留）。
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
// 第 1 段：构造函数——初始化事件注册表
class EventEmitter {
  constructor() {
    // 用普通对象做「事件名 -> 回调数组」的哈希表；无需 Map 即可满足字符串键，代价是原型链键名（如 "constructor"）需自行防范
    this.events = {};
    // 单事件监听器上限：Node 的 EventEmitter 默认 10 并要求显式提高，这里放宽到 100，用于拦截内存泄漏式的无节制订阅
    this.listenerLimit = 100;
  }

  // 第 2 段：on 注册监听器——惰性建数组 + 上限保护 + 链式返回
  on(eventName, callback) {
    // 惰性初始化：只有真正有人订阅时才分配数组，避免为每个可能的事件名预留空数组
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    // 只告警不抛错，是刻意的取舍：抛错会中断调用方的初始化流程，而订阅超限通常只是泄漏信号，不应升级为致命错误
    if (this.events[eventName].length >= this.listenerLimit) {
      console.warn(`事件 ${eventName} 的监听器数量已达上限`);
      // 提前返回同样保持链式语义，让调用方不必区分"注册成功"与"被限流"的返回值形状
      return this;
    }

    // push 而非 unshift：保证监听器按注册顺序（FIFO）触发，这是事件模型可预测性的基石
    this.events[eventName].push(callback);
    // 返回 this 支持 a.on(x).on(y) 的链式写法，也是绝大多数事件库的约定
    return this;
  }

  // 第 3 段：emit 触发——隔离异常、汇总错误、报告是否有人消费
  emit(eventName, ...args) {
    // 先取快照引用（注意不是副本）：后续遍历期间若被 off 修改，会影响本次迭代，见下方易错点
    const callbacks = this.events[eventName];
    // 无人监听时返回 handled:false，让调用方能区分"事件被处理"与"事件被丢弃"，可用于默认行为兜底或埋点
    if (!callbacks || callbacks.length === 0) {
      return { handled: false, errors: [] };
    }

    // 一个监听器抛错不能阻断其余监听器：收集而非上抛，保证多播的原子性被打破得尽可能小
    const errors = [];
    callbacks.forEach((callback, index) => {
      try {
        // 用 apply 把 emit 时的 this 透传给回调，使监听器内部的 this 指向 emitter 实例；若改成 callback(...args)，this 会变成 undefined（严格模式）
        callback.apply(this, args);
      } catch (err) {
        // 记录下标（0-based）便于定位是第几个订阅者出问题；对外用 index + 1 转成人读的序号
        errors.push({ index, error: err });
        console.error(`事件 ${eventName} 的第 ${index + 1} 个监听器出错:`, err);
      }
    });

    // 返回完整的执行报告：handled 表示至少有一个监听器被调用，errors 为空数组而非 undefined，让调用方免于判空
    // 复杂度：单次 emit 为 O(n)，n 为该事件的监听器数；尾部 ...args 每次都会新建数组，是高频触发场景下的隐性分配成本
    return { handled: true, errors };
  }

  // 第 4 段：off 退订——支持"删整组"与"删单个"两种粒度
  off(eventName, callback) {
    // 不存在的事件直接静默返回：退订是幂等操作，重复调用不应报错，否则清理逻辑很难写
    if (!this.events[eventName]) return this;

    if (!callback) {
      // 省略 callback 视为"清空该事件"，用 delete 整键移除，顺带把空数组的内存和 keys 遍历噪音一起省掉
      delete this.events[eventName];
    } else {
      // 注意：只删除首个匹配项，同一函数被注册多次（bind 后每次引用不同，或显式重复 on）时需多次调用才能清完
      const index = this.events[eventName].indexOf(callback);
      if (index !== -1) {
        // 用 splice 原地移除而非 filter 重建：保持数组引用不变，避免正在遍历中的 emit 拿到一个被替换掉的旧数组
        this.events[eventName].splice(index, 1);
      }
    }
    // 两条分支都返回 this，维持与 on 一致的链式接口
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
// PriorityEventEmitter：按优先级顺序触发的发布-订阅事件总线。
// 设计核心：把监听器以 { callback, priority } 形式存入数组并按优先级降序排列，
// 于是触发时的遍历顺序天然就是"高优先级先执行"。

class PriorityEventEmitter {
  // 第 1 段：构造与数据结构——所有事件登记在"事件名 → 监听器数组"的字典里
  // 用普通对象而非 Map，换来字面量式访问与 JSON 友好，代价是继承自 Object.prototype，
  // 理论上 "toString"/"constructor" 之类键名存在原型污染隐患。
  constructor() {
    this.events = {};
  }

  // 第 2 段：注册监听器 on——把回调连同优先级塞进该事件的数组，并维持降序
  // 固定返回 this 是为了支持 on(...).on(...) 链式调用；
  // priority 默认 0，数值越大越先执行（b - a 即降序）。
  on(eventName, callback, priority = 0) {
    // 懒初始化：首次注册某事件时才创建数组，避免为从未监听的事件白白占内存
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push({ callback, priority });
    // 每次插入都整体重排，保证读取端 emit 拿到的永远是有序数组；
    // 代价是 n 次注册最坏 O(n²log n)，属于"写时排序换取读取简单"的取舍。
    this.events[eventName].sort((a, b) => b.priority - a.priority);
    return this;
  }

  // 第 3 段：触发事件 emit——取出监听器数组，按既定顺序逐个带参调用
  // 用展开参数 ...args 支持任意个实参；有监听器返回 true、无则 false，
  // 让调用方能判断"是否有人监听"，但不暴露回调本身的执行结果。
  emit(eventName, ...args) {
    const listeners = this.events[eventName];
    if (!listeners || listeners.length === 0) return false;

    // 解构只取 callback；apply(this, args) 把回调内的 this 绑定为发射器实例并原样透传参数。
    // 遍历的是数组引用：若某回调内部又 on 注册新监听器，forEach 会把它一并执行到本轮（经典易错点）；
    // 而 off 会整体替换数组，故不会影响当前这轮遍历。
    listeners.forEach(({ callback }) => {
      callback.apply(this, args);
    });
    return true;
  }

  // 第 4 段：移除监听器 off——按回调引用过滤，同一回调的重复注册会被一次性清光
  // 只比较 callback 不比较 priority，因此做不到"只删某个优先级的那一份"；
  // filter 生成新数组并整体替换，使得 emit 过程中移除监听器是安全的。
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
// 第 1 段：类定义与单例构造（保证全局只有一个事件总线实例）
class EventBus {
  constructor() {
    // 单例守门：第二次 new EventBus() 会直接返回首次构建的实例，
    // 从而绕过后面所有初始化逻辑——这是用 return 提前退出来实现单例的经典手法。
    // 易错点：若单例引用挂在类静态属性上，模块被重复加载/多副本打包时仍可能出现多个实例。
    if (EventBus.instance) {
      return EventBus.instance;
    }
    // events 采用「事件名 -> 回调数组」的散列结构：
    // 用对象做索引让注册/查找接近 O(1)，用数组保证同一事件的多个监听者按注册顺序被调用。
    this.events = {};
    EventBus.instance = this;
    return this;
  }

  // 第 2 段：注册监听 on（把一个回调追加到对应事件的回调列表尾部）
  on(eventName, callback) {
    // 首次监听某个事件时才创建数组，属于惰性初始化：
    // 避免为从未被订阅的事件名预先分配空数组，也省去遍历清理的负担。
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    // push 的顺序即后续 emit 的调用顺序（先注册先触发），
    // 这里不做去重：同一函数注册两次会被调用两次，去重责任交给调用方。
    this.events[eventName].push(callback);
    // 返回 this 以支持链式注册：bus.on('a',f).on('b',g)
    return this;
  }

  // 第 3 段：触发事件 emit（把实参原样转发给该事件的所有监听者）
  emit(eventName, ...args) {
    // 取出的是回调数组的「引用快照」，而不是元素副本：
    // forEach 每次迭代都会重新读取 length，所以派发过程中新增的监听者可能被本次一并调用。
    const callbacks = this.events[eventName];
    // 无人监听时返回 false，语义是「是否有订阅者」，而不是「成功调用了几个」。
    // 边界：返回 false 也不代表事件被丢弃报错，静默忽略是事件总线的常见约定。
    if (!callbacks) return false;
    // 逐个调用；...args 保留调用方的参数个数与类型，等价于透传。
    // 易错点：这里没有任何 try/catch 或错误隔离，任一回调抛异常都会中断 forEach，
    // 导致排在其后的监听者收不到本次事件（生产级实现通常会包裹 try/catch 或异步兜底）。
    callbacks.forEach(cb => cb(...args));
    // 走到这里说明该事件至少有一个监听者被派发，返回 true 供调用方判断要不要走降级逻辑。
    return true;
  }

  // 第 4 段：移除监听 off（按引用相等过滤掉指定回调）
  off(eventName, callback) {
    // 该事件从未被订阅：无事可做，直接返回 this 保持链式调用不断链。
    if (!this.events[eventName]) return this;

    // filter 生成新数组赋予原键（函数式写法，不原地 splice）：
    // 1) 引用相等判断 cb !== callback，匿名函数/绑定后的函数（如 f.bind(x)）无法这样移除；
    // 2) 若同一回调注册了多次，这里会一次性全部移除（不是只删一个）；
    // 3) 换新数组可避免正向遍历中 splice 造成的索引错位；
    // 4) 副作用是「正在 emit 的 forEach 仍持有旧数组」，因此派发途中 off 不影响本次派发，
    //    这与派发途中 on（写入 this.events[eventName]，即新数组）的行为并不对称，是该实现的微妙边界。
    this.events[eventName] = this.events[eventName]
      .filter(cb => cb !== callback);
    return this;
  }
}

// 第 5 段：模块级单例导出（导出实例而非类，调用方无需关心 new/单例细节）
// 模块只会被求值一次，因此这里天然只有一次构造；
// 后续任何地方 new EventBus() 也都拿到同一实例，保证跨模块监听/派发共享同一份事件表。
export const eventBus = new EventBus();
```
---

## 2. Proxy 代理模式

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
// 第 1 段：模块级状态——依赖表与"当前正在执行的副作用"指针
// depsMap 是整个响应式系统的中枢,结构为 WeakMap<target, Map<key, Set<effect>>>:
//   第一层用 WeakMap 以原始对象为键,保证 target 被回收时依赖记录随之消失,不会内存泄漏;
//   第二层用 Map 按属性名分桶;第三层用 Set 去重,避免同一副作用因多次读取同一 key 被重复登记。
// activeEffect 是收集期的"上下文",track 只能通过它知道"是谁在读",因此整个实现天然依赖单线程同步执行。
const depsMap = new WeakMap();
let activeEffect = null;

// 第 2 段：track——依赖收集(读取时登记)
// 采用"读时懒创建"策略:只有真的被访问到的 target/key 才会在表里占位,避免预先遍历整个对象树。
function track(target, key) {
  // 只在副作用执行期间收集;在 effect 之外读取属性(如控制台调试、模板外的计算)不应产生依赖。
  if (activeEffect) {
    // 逐层向下创建,任一层缺失就补一个空容器,属于典型的"分层懒初始化"。
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
    // 用 Set 的幂等性兜住重复收集:同一 effect 多次读同一 key,最终只记录一条。
    effects.add(activeEffect);
  }
}

// 第 3 段：trigger——派发通知(写入时触发)
// 只做"精确通知":命中不到该 key 就直接返回,不惊动其它属性上的副作用,这是响应式粒度足够细的关键。
function trigger(target, key) {
  const dep = depsMap.get(target);
  if (!dep) return; // 从未被读取过,自然没有依赖,静默返回

  const effects = dep.get(key);
  if (effects) {
    // forEach 遍历的是 Set 的实时视图:若某个 effect 执行中又写回同一 key 并新增依赖,新项会在本轮被访问到,
    // 严重时可能陷入自我触发的循环——这是简化版实现有意省略调度/去重队列的代价。
    effects.forEach(effect => effect());
  }
}

// 第 4 段：reactive——用 Proxy 把普通对象包装成可观测对象
// 选用 Proxy 而非 Object.defineProperty,是因为 Proxy 能原生拦截新增/删除属性而不必递归劫持所有 key。
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 用 Reflect 而非 target[key],是为了把 receiver 一路透传,保证 getter/继承链上的 this 指向代理而非原始对象。
      const res = Reflect.get(target, key, receiver);
      track(target, key);
      // 惰性深层代理:只有真正访问到嵌套对象时才递归包装。既省去初始化时的全量递归,也让深层依赖按需建立。
      // 易错点:这里每次读取都会 new 一个新 Proxy,同一嵌套对象两次访问会得到不同引用(=== 不相等),
      // 生产级实现通常再加一层缓存(如 raw->proxy 的 WeakMap)来保持身份稳定。
      if (typeof res === 'object' && res !== null) {
        return reactive(res);
      }
      return res;
    },
    set(target, key, value, receiver) {
      // 先取旧值做比较,再写入;用 Reflect.set 是为了正确处理原型链上的 setter 与 receiver 绑定。
      const oldValue = target[key];
      const res = Reflect.set(target, key, value, receiver);
      // 值未变化就不通知,过滤掉"重复赋相同值"产生的无谓渲染;注意 NaN !== NaN 会误判为变化而多发一次通知。
      if (oldValue !== value) {
        trigger(target, key);
      }
      return res;
    }
  });
}

// 第 5 段：effect——把函数登记为副作用并立即执行一次
// 同步执行 + 执行前后切换 activeEffect,构成"运行时收集"的最小闭环:先跑一遍才知道依赖谁。
function effect(fn) {
  activeEffect = fn;
  fn();
  // 收尾置空,防止 effect 结束后残留指针,把之后的普通读取也误记成依赖。
  // 已知边界:此写法不支持 effect 嵌套调用——内层执行完会把 activeEffect 清空,外层后续的读取将无法被收集;
  // 正确做法是把上一次的 activeEffect 存栈并在执行完后恢复。
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
// 第 1 段：递归出口——非对象与 null 直接原样返回（这一段决定"保护范围"到哪为止）
// 关键点：typeof 判断用 !== 'object' 而不是 '!== "object" 之外再查 function，
// 因此函数（typeof === 'function'）不会被包裹，函数对象上挂属性仍可被改写，这是刻意的取舍：包裹函数会破坏调用语义与 this 绑定，并且成本高。
// obj === null 必须单独判断，因为 typeof null === 'object'，否则会进入 Proxy 分支并在后续 Reflect 操作中出错。
function readonly(obj, depth = 0) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  // 第 2 段：用 Proxy 包一层只读外壳，拦截"读"——惰性包装 + 深度预算传递
  // 为什么用 Proxy 而不是 Object.freeze：freeze 是浅层且不可逆的，且会真的改写原对象描述符；
  // Proxy 不改动原对象、可与原引用共存，并且能按 depth 精确控制递归层数（有状态的访问控制）。
  return new Proxy(obj, {
    get(target, key, receiver) {
      // Reflect.get 必须把 receiver 透传，否则 getter 内部 this 会指向原始 target 而不是代理，
      // 导致 getter 里再访问的属性绕过只读包装。
      const value = Reflect.get(target, key, receiver);
      // depth > 0 表示"还有递归额度"：额度用尽时只返回原始引用（浅只读），
      // 这点很关键——深度受限时子对象是可变的，不要误以为整体都冻结了。
      // 注意深度是"访问路径长度"而非全局层数：每次 get 都消耗 1，越深的路径越早耗尽额度。
      if (typeof value === 'object' && value !== null && depth > 0) {
        return readonly(value, depth - 1);
      }
      return value;
    },

    // 第 3 段：拦截"写"与"删"——任何修改路径都直接抛错，形成 fail-fast 的写屏障
    // 为什么抛 Error 而不是 return false：return false 在非严格模式下会被静默忽略，
    // 调用方很难发现自己的写入丢了；抛错能让问题在第一次赋值时就暴露。
    // 易错点：模板字符串里拼接 Symbol 会抛 TypeError，所以这里必须用 String(key) 显式转换。
    // 副作用：数组的 push/pop/splice 会先触发 set，因而在只读代理上必然失败；
    // 若想支持"原地不可变更新"，应改为返回新数组而不是放宽 set。
    set(target, key, value) {
      throw new Error(`Cannot modify readonly property: ${String(key)}`);
    },

    deleteProperty(target, key) {
      throw new Error(`Cannot delete readonly property: ${String(key)}`);
    }
  });
}

// 第 4 段：深只读入口——把 depth 设为 Infinity 表示"永不为 0"
// 原理：Infinity - 1 === Infinity，所以递归不会终止于深度，而是终止于叶子（非对象值）。
// 代价：每次属性读取都会新建一个 Proxy，没有 WeakMap 缓存，因此同一子对象每次访问返回不同代理，
// 会造成 obj.a !== obj.a 的身份不一致，并让热路径上的对象分配变多；
// 若需要稳定身份或更高性能，可用 WeakMap<target, proxy> 做记忆化。
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

## 3. Reflect 反射

### 3.1 手写 call / apply / bind（基于 Reflect）

**核心思路**：通过将函数临时挂载到目标对象上执行，利用 `Reflect.apply` 实现参数传递。

```javascript
// 第 1 段：为 Function.prototype 挂载 myCall，模拟原生 Function.prototype.call 的能力
// 核心 trick 是"把函数临时寄存在宿主对象上，再用 obj.fn() 的调用形式触发 this 绑定"——
// 因为只有成员调用语法才能让引擎把 this 指向该对象，这是手写 call 的唯一可靠切入点。
Function.prototype.myCall = function(context, ...args) {
  // 第 2 段：确定 this 的实际宿主，处理 null / undefined 的默认指向
  // 这里用 || 兜底到 globalThis，与"非严格模式下 this 为 null 时指向全局对象"的表现一致；
  // 但注意原生 call 传原始值（数字/字符串）会先装箱成对象，这里未做 Object() 包装，属于简化版差异点。
  context = context || globalThis;
  // 第 3 段：用 Symbol 造一个绝不与宿主已有属性重名的临时键
  // 若用普通字符串键（如 'fn'），会覆盖用户自身同名属性造成数据丢失；Symbol 的唯一性彻底规避了这种冲突。
  const fnKey = Symbol('tempFn');
  context[fnKey] = this;
  // 第 4 段：以宿主为 this 真正执行原函数，并把参数逐项透传
  // 展开语法等价于原生 call 的"逐个实参"语义；此刻 this 已被绑定为 context。
  const result = context[fnKey](...args);
  // 第 5 段：清理临时属性并回传返回值，避免污染宿主对象
  // delete 必须紧跟在同步调用之后；易错点在于若原函数抛异常，这行不会执行，宿主上会残留"幽灵方法"，
  // 生产级实现应包 try/finally，此处为教学保持最简形态。
  delete context[fnKey];
  return result;
};

// 第 6 段：myApply —— 与 myCall 结构同构，唯一区别是接收"参数数组"而非可变参数
// 这样能直接消化数组入参场景（如 Math.max.apply(null, arr)），无需调用方自己展开。
Function.prototype.myApply = function(context, args = []) {
  context = context || globalThis;
  const fnKey = Symbol('tempFn');
  context[fnKey] = this;
  // 边界条件：默认值 [] 仅在实参为 undefined 时生效，传 null 会让 ...null 抛 TypeError；
  // 另外这里要求 args 可迭代，纯类数组对象（没有 Symbol.iterator）无法展开，而原生 apply 是支持的。
  const result = context[fnKey](...args);
  delete context[fnKey];
  return result;
};

// 第 7 段：myBind —— 不立即执行，而是返回一个"延迟调用"的包装函数
// bind 的语义是永久固定 this 并预设部分参数（偏函数 / partial application），
// 所以此处只捕获 context 与 bindArgs，留到真正被调用时才借用 myCall 完成绑定。
Function.prototype.myBind = function(context, ...bindArgs) {
  // 先缓存 this（即被绑定的原函数）：返回的是普通 function，其内部 this 取决于调用方式，
  // 不提前捕获就会丢失原函数引用。
  const fn = this;
  return function(...args) {
    // 参数按"预设在前、调用时在后"拼接，顺序与原生 bind 一致；
    // 已知局限：未处理 new 调用（原生 bind 返回的函数可作构造函数，且此时忽略绑定的 this），
    // 也未复制原函数的 length / name 等元信息。
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
// 第 1 段：只读代理工厂——为目标对象套一层"写操作一律抛错"的 Proxy 外壳
// 核心思路：Proxy 的 handler 只实现 get/set/deleteProperty 三个 trap，
// 其中 get 原样转发保持读行为不变，写相关的两个 trap 直接throw，
// 让"只读"语义在语言层面被强制，而不是靠调用方自觉。
function createReadOnlyProxy(target) {
  return new Proxy(target, {
    // 第 1.1 段：读取转发——必须把 receiver 透传给 Reflect.get
    // 传 receiver 才能让 target 上的 getter 里的 this 指向代理对象本身，
    // 否则 this 会变成原始 target，导致代理层被绕过、后续链式访问失效。
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver); // 保持原生读取语义（原型链、getter、Symbol 键都一致）
    },

    // 第 1.2 段：写入拦截——用 throw 而不是 return false
    // 返回 false 只在严格模式下才报 TypeError，非严格模式会"静默失败"，
    // 这类问题极难排查；主动抛错可保证任何调用场景都能立刻看到失败原因。
    set(target, prop, value) {
      throw new Error(`[ReadOnlyError] 属性 ${String(prop)} 是只读的`);
    },

    // 第 1.3 段：删除拦截——delete 操作同样属于"写"，必须一并封死
    // 边界：这里只保证了浅只读，target 内部嵌套的对象仍可被修改；
    // 若需深只读，要在 get 返回对象时递归包装（并做缓存避免重复建代理）。
    deleteProperty(target, prop) {
      throw new Error(`[ReadOnlyError] 属性 ${String(prop)} 是只读的`);
    }
  });
}

// 第 2 段：校验代理工厂——把"字段规则表"变成运行时的写入守门人
// 数据流：set 触发 → 用 prop 查 validationRules → 顺序执行 type/min/max 校验 →
// 全部通过才 Reflect.set 落到 target。校验与写入分离，target 只会存合法值。
function createValidatedProxy(target, validationRules) {
  return new Proxy(target, {
    // 第 2.1 段：读取同样原样转发，校验只针对"写"，读路径不应有额外开销与副作用
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },

    // 第 2.2 段：写入校验主流程
    // 复杂度 O(1)：一次属性查表 + 常数次比较，与目标对象大小无关。
    // 易错点：Reflect.set 返回布尔值，set trap 的返回值语义依赖它，
    // 若这里漏掉 return，严格模式下赋值会抛 TypeError（代理必须返回 true/false）。
    set(target, prop, value) {
      const rules = validationRules[prop]; // 注意 prop 可能是 Symbol；未配置规则的字段查得 undefined，直接放行

      // 第 2.3 段：规则存在时才逐条校验，实现"按字段可选的声明式约束"
      // 校验顺序刻意设计为 type → min → max：先保证类型正确，
      // 后续的大小比较才不会被字符串等类型做隐式转换而产生误判。
      if (rules) {
        if (rules.type && typeof value !== rules.type) {
          throw new TypeError(`属性 ${String(prop)} 期望 ${rules.type} 类型`);
        }
        if (rules.min !== undefined && value < rules.min) { // 用 !== undefined 判存，因为 min=0 是合法下界，真值判断会漏掉
          throw new RangeError(`属性 ${String(prop)} 值 ${value} 小于最小值 ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) { // 同理 max=0 这类边界值必须靠 undefined 判定，不能用 if (rules.max)
          throw new RangeError(`属性 ${String(prop)} 值 ${value} 大于最大值 ${rules.max}`);
        }
      }

      return Reflect.set(target, prop, value); // 校验通过才真正落盘，保证 target 永不持有非法数据（失败即不改状态）
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
// 第 1 段：入口签名与源参数收集（target 为被就地修改的目标，剩余参数 sources 收集所有混入源）
// 用 rest 参数可支持任意数量源；注意 target 会被直接改写并返回，若需纯函数应传入副本。
function mix(target, ...sources) {
  // 第 2 段：按声明顺序遍历源（后面的源会覆盖前面的同名属性，覆盖顺序由 forEach 的先后决定）
  // 源对象若为 null/undefined，Reflect.ownKeys 会抛 TypeError，因此调用方需保证每个 source 可被反射。
  sources.forEach(source => {
    // 第 3 段：取出源对象的全部自有键（含 Symbol 键与不可枚举键，这是比 Object.keys 更彻底的复制范围）
    // Reflect.ownKeys 返回 string | symbol 数组；它不读取原型链，因此不会误拿继承属性。
    const sourceKeys = Reflect.ownKeys(source);

    // 第 4 段：逐个键复制（嵌套遍历保证每个源独立处理，key 可能是字符串也可能是 Symbol）
    sourceKeys.forEach(key => {
      // 第 5 段：跳过 constructor（避免把源对象的构造器覆盖到目标上，破坏 target.constructor / instanceof 语义）
      if (key === 'constructor') return;

      // 第 6 段：读取属性描述符（用 descriptor 而非 target[key] = source[key]，可保留 getter/setter、不可枚举、只读等特性）
      const descriptor = Reflect.getOwnPropertyDescriptor(source, key);
      // 第 7 段：把描述符原样定义到目标（defineProperty 不触发 setter，若目标已有不可配置同名属性会抛 TypeError，属边界情况）
      if (descriptor) {
        Reflect.defineProperty(target, key, descriptor);
      }
    });
  });
  // 第 8 段：返回目标以支持链式调用（返回同一引用，符合“就地混入”语义；时间复杂度为各源自有键总数之和）
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

## 4. 综合应用

### 4.1 异步事件处理（带 Promise 支持）

```javascript
// 第 1 段：类的骨架与事件表 —— 用「事件名 → 回调数组」的普通对象做注册表
// 选 Object（而非 Map）是因为事件名多为字符串且量级小，查表 O(1)、写法直观；
// 代价是原型链上的键名（如 "toString"）理论上可能被误命中，生产代码常用 Object.create(null) 规避。
class AsyncEventEmitter {
  constructor() {
    this.events = {};
  }

  // 第 2 段：订阅 on —— 注册回调，并返回 this 以支持链式调用
  // 首次订阅某事件时惰性创建数组，避免预分配无用桶；
  // 同一回调可重复注册（后面 off 会一次性移除它的全部副本），这是刻意保留的语义而非 bug。
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback); // 只 push，不去重：保持"注册即计数"的简单模型
    return this; // 返回 this 让 emitter.on(...).on(...) 可链式书写
  }

  // 第 3 段：发布 emit（一）—— 取出快照并处理"无监听者"的边界
  // 先把数组引用赋给局部变量 callbacks，后续遍历基于这份引用，天然形成一次"快照"；
  // 无监听者时返回空数组而**不是**抛错，让调用方无需 try/catch 即可安全 emit。
  async emit(eventName, ...args) {
    const callbacks = this.events[eventName];
    if (!callbacks || callbacks.length === 0) {
      return []; // 空数组而非 undefined：统一返回类型，调用方可以直接 for...of / .length
    }

    // 第 4 段：发布 emit（二）—— 用 Promise.all 并发跑完全部回调并保序收集结果
    // 关键点：每个回调各自 await，慢回调不会互相堵塞；Promise.all 按 map 的索引顺序收集，
    // 因此 results[i] 恒对应 callbacks[i]，即使完成顺序是乱的。
    // 易错点：Promise.all 是"全成功才算成功"，任一回调 reject 会让整个 emit reject（fail-fast）；
    // 若业务要求"一个失败不影响其他"，需改用 Promise.allSettled 或在内部包 try/catch。
    const results = await Promise.all(
      callbacks.map(async (callback) => {
        const result = callback(...args); // 同步抛错也会被 async 包装成 rejected promise，交由 Promise.all 统一处理
        return result instanceof Promise ? await result : result; // 已是原生 Promise 就直接 await，省掉外层 async 多包一层带来的额外微任务；对非 Promise 值则原样返回（await 非 Promise 也只是原值透传，这里做判断是微优化 + 明确意图）
      })
    );

    return results; // 结果数组与注册顺序一一对应，供调用方按位置读取各监听者的返回值
  }

  // 第 5 段：取消订阅 off —— 用 filter 生成新数组，等价于"移除该回调的所有副本"
  // 用不可变替换而非 splice：实现简单、不会在遍历中途改变原数组长度；
  // 注意这里不删除空数组键（callbacks.length 为 0 仍占一个键），
  // 频繁增删不同事件名时属于轻微内存滞留，需要时可在末尾补 delete this.events[eventName]。
  off(eventName, callback) {
    if (!this.events[eventName]) return this; // 未注册过就静默返回，保证 off 幂等、可重复调用

    this.events[eventName] = this.events[eventName]
      .filter(cb => cb !== callback); // 引用相等比较：匿名函数每次传入都是新引用，无法被移除
    return this; // 同样返回 this，保持与 on 一致的链式风格
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
// 第 1 段：初始化观察者注册表（event -> 观察者集合 的两级索引）
class Observable {
  constructor() {
    // 用 Map 而不是普通对象：事件名可能是任意字符串（含 __proto__ 等），Map 不会与原型链冲突，
    // 且增删查都是 O(1)。第二层用 Set 而非数组，是为了让 "同一个函数重复订阅同一事件" 天然去重，
    // 同时把 unsubscribe 从 O(n) 的 indexOf+splice 降成 O(1) 的 delete。
    this.observers = new Map();
  }

  // 第 2 段：订阅。核心是"返回一个退订句柄"，把取消订阅的时机交给调用方（disposer 模式）
  subscribe(event, observer) {
    // 惰性建桶：只有真的有人订阅某个事件时才创建 Set，避免为从未使用过的事件名预留空间。
    if (!this.observers.has(event)) {
      this.observers.set(event, new Set());
    }
    // 注意 Set 的语义：同一函数引用订阅两次只会存一份，但两次 subscribe 都会各返回一个句柄；
    // 任一时刻调用其中一个句柄退订，另一次"订阅"就同时失效了。
    this.observers.get(event).add(observer);

    // 闭包捕获了 event 与 observer，调用方无需自己记参数，也就不容易退订错对象。
    return () => this.unsubscribe(event, observer);
  }

  // 第 3 段：退订。只删观察者，不删空桶
  unsubscribe(event, observer) {
    // 事件名从未被订阅过时 get 返回 undefined，必须先判空，否则 delete 会抛 TypeError。
    const observers = this.observers.get(event);
    if (observers) {
      observers.delete(observer);
    }
    // 易错点：这里刻意/遗漏地没有清理 size === 0 的空 Set。
    // 若业务上会海量、动态地产生一次性事件名，Map 会长期持有这些空桶，属于潜在的内存滞留。
  }

  // 第 4 段：广播。先做空集合短路，再并发派发并把所有返回值归一化成 Promise 后聚合
  async notify(event, data) {
    const observers = this.observers.get(event);
    // 快速失败路径：无人订阅时直接返回统一结构的空结果，而不是返回 undefined。
    // 这样调用方可以无脑解构 { notified, responses }，不必为"无人监听"写额外的分支。
    if (!observers || observers.size === 0) {
      return { notified: 0, responses: [] };
    }

    // Array.from 先把 Set 快照成数组：一是数组才有 map，二是快照期间若观察者在回调里退订，
    // 不会破坏本次遍历（但也因此，本轮"实际被调用的人数"与下面读到的 size 可能不一致）。
    // 关键时序：map 的回调是同步依次执行的，所有 observer(data) 会一个接一个地被立即调用，
    // 所谓"并发"只体现在后续 await 的等待阶段——如果某个观察者本身是耗时同步计算，仍会阻塞其他人。
    const responses = await Promise.all(
      Array.from(observers).map(observer => {
        const response = observer(data);
        // 把同步返回值包装成 Promise，让 Promise.all 拿到同构的输入。
        // 边界：instanceof Promise 无法识别跨 realm（iframe / vm）的 Promise 或 thenable；
        // 这些值会走 Promise.resolve 分支，而 Promise.resolve 本身也会递归展开 thenable，所以结果仍然正确。
        return response instanceof Promise ? response : Promise.resolve(response);
      })
    );

    // 易错点：这个对象字面量是在 await 之后才求值的，observers.size 是"此刻"的大小。
    // 若某个观察者在通知过程中退订了自己或别人，notified 就会小于 responses.length，
    // 需要对账的话应改为在派发前就把数量存进局部变量。
    // 另外 Promise.all 是 fail-fast：任一观察者抛错/拒绝，整个 notify 都会拒绝，
    // 其余观察者已经产生的响应会被丢弃——需要容错时得换成 allSettled 或逐个 try/catch。
    // 复杂度：单次广播 O(n)，n 为该事件的观察者数量。
    return { notified: observers.size, responses };
  }
}
```
---

## 5. 总结

| 模式 | 核心 API | 关键考点 |
|------|---------|---------|
| 发布订阅 | `on/off/emit/once` | 事件映射、闭包、链式调用 |
| Proxy | `new Proxy(target, handler)` | get/set/deleteProperty/has 陷阱 |
| Reflect | `Reflect.get/set/apply/construct` | 与 Proxy 配套、替代 Object 操作符 |

---

## 6. 参考资源

| 资源 | 链接 |
|------|------|
| MDN - Proxy | https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy |
| MDN - Reflect | https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect |
| 腾讯云 - Vue3 Proxy + Reflect | https://cloud.tencent.com/developer/news/2263970 |
| CSDN - Proxy vs defineProperty | https://blog.csdn.net/caishuangxi111/article/details/146554747 |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) | Proxy 对象总览，含全部 trap 与不变量。 | 读“处理器对象”与“不变量”小节，带着“哪些操作可拦截”阅读，读完整理 trap 对照表。 |
| [Proxy.revocable()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/revocable) | revocable 可撤销代理，适合发布订阅的取消订阅场景。 | 读“示例”与“使用 revocable 的原因”，思考如何撤销订阅，读完写一个可撤销监听器。 |
| [handler.get()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get) | get 陷阱是响应式读取的核心。 | 读参数与返回值及不变量，问“读取时如何收集依赖”，读完实现 get 拦截。 |
| [handler.has()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/has) | has 陷阱用于 in 操作，可判断订阅是否存在。 | 读“示例”与不变量，问“in 如何被拦截”，读完用 has 判断频道存在。 |
| [handler.set()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/set) | set 陷阱是响应式写入与发布通知的核心。 | 读参数与返回值，问“赋值如何触发更新”，读完实现 set 拦截并派发通知。 |
| [handler.ownKeys()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/ownKeys) | ownKeys 拦截枚举，可用于列出所有频道。 | 读参数与不变量，问“Object.keys 如何被拦截”，读完实现频道列表。 |
| [Reflect](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect) | Reflect 总览，与 Proxy 陷阱一一对应的默认行为。 | 读“方法列表”与“与 Proxy 的关系”，问“为何用 Reflect 而非直接操作”，读完对照实践。 |
| [Reflect.apply()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) | Reflect.apply 用于安全调用订阅者回调。 | 读示例与语法，问“如何指定 thisArg”，读完在发布逻辑中改写监听器调用。 |
| [Reflect.deleteProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/deleteProperty) | Reflect.deleteProperty 用于删除订阅时的默认行为。 | 读返回值与示例，问“delete 与返回布尔值的关系”，读完实现取消订阅。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 2 响应式源码目录](https://github.com/vuejs/vue/tree/main/src/core/observer) | Vue 2 响应式源码，对比 defineProperty 与 Proxy 差异。 | 读 observer/index.js 的 defineReactive，问为何无法监听新增属性，读完列出 Proxy 的优势。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 元编程](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming) | MDN 元编程指南，用 Proxy/Reflect 实现校验并关联 Vue 3 响应式。 | 读“用 Proxy 校验对象”一节，思考轨道/触发，读完手写一个带校验的响应式对象。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格，勾选与行内编辑 | Proxy 拦截行对象 set，发布订阅按 rowId 分发 | Vue 3 reactive、自建 rowId 频道总线 | 组件卸载要调用取消订阅函数，否则行对象一直持有已销毁的回调 |
| 低端安卓机型的首屏指标采集与上报 | 发布订阅聚合指标，空闲时批量 flush | 自建 event bus、requestIdleCallback、navigator.sendBeacon | 页面隐藏时必须强制 flush，否则批次留在内存里随页面丢掉 |
| 多人协作白板的光标与图形同步 | Proxy 拦截状态写入，发布订阅广播变更 | Yjs、自建 WebSocket 广播层 | 用 origin 标记区分本地与远端变更，否则收到自己的广播又发一遍 |
| 动态表单的字段显隐与联动校验 | Proxy 的 get/set 拦截，订阅字段变化 | Vue 3 reactive、自建 FormModel | set 拦截要覆盖数组下标、length 和 deleteProperty，漏掉就不触发校验 |
| 微前端主应用与子应用通信 | 发布订阅，全局事件总线 | qiankun 的 initGlobalState、CustomEvent | 子应用卸载时清空自己的订阅，事件名加应用前缀避免撞名 |
| Node.js 服务的配置热更新 | 发布订阅，EventEmitter | Node.js events 模块、Redis Pub/Sub | 没有监听者的 error 事件会让进程抛出，订阅者要在关闭时 off |
| 前端监控 SDK 的事件采集 | 发布订阅加采样 | 自建上报队列 | 上报失败要落到本地队列重试，网络抖动时不能直接丢事件 |
| 组件库的受控属性同步 | Proxy 加 Reflect | Vue 3 组件代理、自建默认值合并 | Reflect.set 要传 receiver，否则继承链上的 setter 语义会变 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格行级联动

- **业务背景**：表格要显示上万行订单，每行有勾选、备注编辑、行内状态标签。现在勾一行就重渲染整表，操作时主线程连续掉帧。
- **怎么用本页知识解决**：给每行数据套一层 Proxy，值真正改变时才发通知；通知按 rowId 分频道，只有订阅了该行的视图回调执行。

```js
// 发布订阅中心：按 rowId 分频道，避免整表广播
const hub = new Map();
const subscribe = (rowId, fn) => {
  if (!hub.has(rowId)) hub.set(rowId, new Set());
  hub.get(rowId).add(fn);
  return () => hub.get(rowId).delete(fn); // 返回取消订阅函数
};
const publish = (rowId) => hub.get(rowId)?.forEach((fn) => fn());

// Proxy：只在 set 真正改变值时通知
const observableRow = (row) =>
  new Proxy(row, {
    set(target, key, value, receiver) {
      const changed = target[key] !== value;
      const ok = Reflect.set(target, key, value, receiver); // 用 Reflect 保留默认写入语义
      if (changed) publish(row.id);
      return ok;
    },
  });
```

- 只有值变化才 publish，连续把同一个值写两遍不会触发视图刷新。
- 频道按 rowId 切分，改第 5 行只调用第 5 行的订阅者，与行数无关。
- subscribe 返回取消订阅函数，组件卸载时调用，避免行对象持有失效回调。
- 用 Reflect.set 并转发 receiver，代理对象被继承或包裹时写入语义保持一致。
- 读取路径没有拦截，所以列表渲染时不会因为 get 陷阱产生额外开销。

- **怎么度量收益**：用 Chrome DevTools 的 Performance 面板录制同一次"勾选 200 行"操作，对比 Scripting 与 Recalculate Style 两段的耗时；用 PerformanceObserver 监听 longtask，统计超过 50ms 的任务条数；在 Memory 面板前后各取一次 heap snapshot，比较 detached 节点数。
- **什么时候不该用**：行数据是接口返回的只读快照、整表本来就要刷新（例如切换筛选条件、翻页）时，加频道分发没有意义，直接重渲染即可。表格只有几十行且渲染函数本身很轻，引入 Proxy 与总线会让代码路径变长，评审和排查成本上升。服务端渲染场景里 Proxy 无法参与水合，不要在 SSR 首屏路径上依赖它。

#### 场景 2：低端安卓机型的首屏埋点上报

- **业务背景**：首屏要采集首帧时间、关键接口耗时、资源加载失败等事件，它们产生的时间点分散在整个页面生命周期。若每个事件产生时立刻发请求，低端机上会和首屏渲染抢主线程。
- **怎么用本页知识解决**：用发布订阅把所有指标汇到一个队列，空闲时批量发出；页面进入隐藏状态时立即冲刷，保证不丢数据。

```js
const bus = new Map();
const on = (type, fn) => {                     // 订阅，返回取消订阅函数
  bus.set(type, [...(bus.get(type) || []), fn]);
  return () => bus.set(type, bus.get(type).filter((f) => f !== fn));
};
const emit = (type, payload) => (bus.get(type) || []).forEach((fn) => fn(payload));

let queue = [];
const flush = () => {                          // 批量上报，队列为空直接返回
  if (queue.length === 0) return;
  const batch = queue; queue = [];
  navigator.sendBeacon('/report', JSON.stringify(batch)); // 卸载阶段也能发出
};
on('metric', (m) => {                          // 指标先入队，空闲时再冲刷
  queue.push(m);
  (window.requestIdleCallback || window.setTimeout)(flush);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush(); // 切后台或关闭前强制发送
});
```

- 采集点只负责 emit，不关心发送时机，新增指标不用改上报逻辑。
- 用了 requestIdleCallback，浏览器空闲才发送，并在不支持时退回 setTimeout。
- sendBeacon 在页面卸载时仍能发出请求，比同步 XHR 对关闭流程的阻塞小。
- visibilitychange 兜底，避免用户直接关页面时队列还没冲刷。
- on 返回取消订阅函数，单页应用里切路由时可以解绑旧页面的采集回调。

- **怎么度量收益**：Lighthouse 移动端节流模式下看 TBT 与 FCP；Performance 面板录制冷启动，看 Long Tasks 条数与最长任务时长；用 PerformanceObserver 监听 longtask 统计首屏期间的任务分布；在 Network 面板按时间轴数请求条数，确认由多次单发变成批量发送。
- **什么时候不该用**：整个页面只有一两个指标、且都在 load 之后才产生，直接发一次请求即可，队列与空闲调度属于多余层级。纯内网后台系统用户量小、网络稳定，不需要为丢包做队列重试，加了反而要处理重复上报。需要严格按顺序到达的服务端事件不要用 sendBeacon 批量发，批量合并会打乱事件顺序。

#### 场景 3：多人协作白板的远端同步

- **业务背景**：多人同时拖动图形，本地操作要立刻看到结果，远端变更要合入同一份画布状态。如果本地写入和远端写入走两条互不知情的路径，容易出现自己收到自己的广播再发一次。
- **怎么用本页知识解决**：用 Proxy 统一拦截画布状态的所有写入，在陷阱里判断变更来源，本地变更才广播，远端变更只通知视图刷新。

```js
const listeners = new Set();
const state = { shapes: {}, source: 'local' };
const canvas = new Proxy(state, {
  set(target, key, value, receiver) {
    const prev = target[key];
    const ok = Reflect.set(target, key, value, receiver); // 按原生语义写入
    if (ok && prev !== value && target.source === 'local') {
      broadcast({ key, value });            // 只广播本地产生的变更
    }
    listeners.forEach((fn) => fn(key, value)); // 视图层订阅刷新
    return ok;
  },
});
const applyRemote = (patch) => {
  state.source = 'remote';                  // 标记来源，避免回环广播
  canvas[patch.key] = patch.value;
  state.source = 'local';
};
```

- 所有写入都经过同一个陷阱，广播与刷新的逻辑只写一份，不会漏。
- source 字段区分本地与远端，远端变更不广播，直接切断回环。
- 值没变时不广播，拖动过程中重复写入相同坐标不会产生多余消息。
- 视图监听走 listeners 集合，与广播逻辑解耦，离线模式可以只发通知不广播。
- 用 Reflect.set 写入原始对象并返回布尔结果，避免代理内部出现静默失败。

- **怎么度量收益**：在 Network 面板按 WebSocket 过滤，统计每秒消息条数，对比加入来源判断前后的曲线；用 performance.mark 在 applyRemote 前后打点，用 performance.measure 量出从收到消息到下一帧渲染的耗时；Performance 面板看每帧 Scripting 段长度是否低于一帧预算。
- **什么时候不该用**：单人使用的本地编辑器没有远端来源，加 source 判断只会增加状态字段与分支。状态量很小且变更频率低（每分钟几次），直接推送整份快照重渲染，代码路径比拦截每个写操作短，出错也容易定位。需要严格的文本合并语义时，自己写 Proxy 拦截无法解决冲突，应该交给 CRDT 或 OT 库处理，Proxy 只用来接住变更事件。

### 行业先进实践

**用 Proxy 替代 Object.defineProperty 实现响应式**（出处：Vue 3 官方文档 Reactivity Fundamentals / Reactivity in Depth）。Vue 3 用 Proxy 拦截对象的读写，因此新增属性、删除属性、数组下标赋值都能被追踪，Vue 2 的 defineProperty 方案需要 $set 这类补丁方法。借鉴方式：自建状态容器时把拦截写在 Proxy 上，避免再为新增和删除键写专用 API。

**给每条变更带来源标记**（出处：Yjs 官方文档）。协作库在处理远端更新时会区分变更来源，视图层据此决定是否回写网络。借鉴方式：在自建的广播层给每条 patch 加 origin 字段，广播前先判断来源，不要在接收端靠内容比对去猜。

**EventEmitter 的订阅生命周期约定**（出处：Node.js 官方文档 Events 模块）。Node.js 的事件发射器规定没有监听者的 error 事件会抛出异常，并会对超过默认上限的监听者数量给出警告。借鉴方式：把监听上限与 error 处理写进封装层，模块关闭时统一 off，不要依赖调用方自觉。

**Pub/Sub 与 Streams 按投递语义分工**（出处：Redis 官方文档 Pub/Sub 与 Streams）。Pub/Sub 是即发即弃，客户端断线期间的消息收不到；需要回放和确认就改用 Streams。借鉴方式：前端埋点这类不能丢的数据走后端队列或 Streams，界面刷新通知这类可以丢的才走 Pub/Sub。

**需核对官方文档：确认 MobX 从哪个主版本开始以 Proxy 实现 observable**（出处：MobX 官方文档 Observable State）。核对点是官方文档或变更日志里对 Proxy 依赖的说明，以及低版本运行环境的兼容说明。核对清楚后再决定自建方案要不要跟随它的拦截粒度。

### 从学到用：落地路线

**第 1 步：在单张列表页试点**。只把"行选中状态"接进总线，不动数据请求层。验收标准：该页勾选 200 行时录制一次 Performance，Scripting 段耗时不再随勾选行数线性增长，两次录制的对比结果记录在 PR 描述里。

**第 2 步：验证订阅生命周期**。在测试环境反复挂载卸载该组件 50 次，同时观察内存。验收标准：Memory 面板的 heap snapshot 中，该列表相关的 detached 节点数回落到基线附近，且控制台没有重复订阅告警。

**第 3 步：抽成公共模块并推广**。把总线抽成只暴露 on、off、emit 的模块，开发环境下打印各频道的订阅者数量。验收标准：仓库里不再出现散落的 EventTarget 直接实例化，代码评审清单加入"检查订阅与取消订阅是否配对"这一项。

**第 4 步：用检查脚本防止回退**。在 CI 里加一段扫描脚本，找出调用订阅但没有对应解绑的代码位置，并在 PR 模板里加勾选项。验收标准：连续两个迭代合入的订阅类改动都能在评审记录里找到解绑位置。

### 动手作业

**目标**：用 Proxy 和发布订阅实现一个"可撤销的迷你状态容器"，并用它渲染一张 200 行的列表，验证只有被改动的行会刷新。

**步骤**

1. 实现总线模块：on 返回取消订阅函数，off 按函数引用移除，emit 按频道遍历调用。
2. 实现 observable：用 Proxy 拦截 set 与 deleteProperty，值真正变化时发布对应频道。
3. 在 set 与 deleteProperty 的陷阱里记录 patch（键、旧值、新值），压入历史栈。
4. 实现 undo：从栈顶取出 patch 反向应用，应用期间把来源标记为 undo，不写入新的历史记录。
5. 用原生 DOM 渲染 200 行列表，每行只订阅自己 rowId 对应的频道。
6. 写断言用例：改第 5 行后，统计第 5 行频道与第 6 行频道各自的回调次数。
7. 用 Performance 面板录制"连续修改 10 行"的操作，记录 Scripting 段耗时。

**验收标准**

1. 调用一次取消订阅函数后再次触发同频道变更，被取消的回调计数保持不变。
2. 连续执行 undo 直到历史栈为空，用 JSON.stringify 对比容器快照与初始快照，两者完全一致。
3. 200 行列表中只改一行，除该行频道外，其余频道的回调计数全部为 0。
4. 反复挂载卸载列表 50 次，heap snapshot 中该列表节点数回落到基线附近。
5. 代码走查确认：每一处订阅调用都能指出对应的取消订阅位置。

