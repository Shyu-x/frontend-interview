---
title: 响应式与观察者模式
description: 手写 EventEmitter、观察者模式与基于 Proxy 的简化版 reactive。
tags:
  - coding
  - interview
  - pattern
date: 2026-05-17
---

# 响应式与观察者模式

## 1. 手写 EventEmitter

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

## 2. 手写观察者模式

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

## 3. 手写 reactive（Proxy响应式简化版）

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

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 元编程](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming) | 用 Proxy/Reflect 实现带校验对象的元编程入门，概念讲得清楚。 | 读「可撤销代理」「Reflect」小节，问「get/set 如何织入逻辑」，读后改写为收集依赖的 reactive。 |
| [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) | Proxy 总览，handler 陷阱与不变式的权威入口。 | 读开头示例与「陷阱转发」表，带着「响应式需要哪几个陷阱」的问题读，读后选定 get/set/deleteProperty。 |
| [Proxy.revocable()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/revocable) | revocable 用于代理失效，理解响应式系统清理与内存释放。 | 读语法与示例，问「何时该撤销代理」，读后给你的 reactive 加一个 stop 能力。 |
| [handler.deleteProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/deleteProperty) | delete 拦截，让响应式能感知属性删除并触发更新。 | 读参数与返回值说明，问「删除后如何通知依赖」，读后在 trigger 里补上 delete 分支。 |
| [handler.get()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get) | get 陷阱是取值收集依赖的核心，语义与不当用法都有说明。 | 重点读参数与 Reflect.get 建议，问「何时该 track」，读后写出 get 中收集当前 effect 的代码。 |
| [handler.has()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/has) | has 陷阱对应 in 操作符，扩展响应式对存在性判断的追踪。 | 读示例与不变量，问「in 判断是否需要收集依赖」，读后给 reactive 加 has 拦截试试。 |
| [handler.set()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/set) | set 陷阱是赋值触发更新的入口，含成功返回值语义。 | 读参数与返回值说明，问「新旧值相同时是否触发」，读后在 set 里实现 trigger 并做去重。 |
| [handler.ownKeys()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/ownKeys) | ownKeys 陷阱，理解遍历与键收集如何被拦截。 | 读不变量部分，问「for...in 能否触发响应」，读后为遍历场景补一个 key 级依赖。 |
| ['Lifecycle of Reactive Effects'](https://react.dev/learn/lifecycle-of-reactive-effects) | 官方讲响应式副作用生命周期，解释依赖切换与清理。 | 读「依赖切换」「清理函数」两节，问「effect 何时该重跑」，读后给自写 effect 加清理回调。 |
| [Appendix: How does the Reactive System Work?](https://book.leptos.dev/appendix_reactive_graph.html) | 官方附录简述响应式系统内部结构，与手写实现逐条对应。 | 通读全文并画出依赖图，问「signal、computed、effect 如何互连」，读后对照自己的实现补漏。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 2 响应式源码目录](https://github.com/vuejs/vue/tree/main/src/core/observer) | 看 defineProperty 版源码，与 Proxy 版对比理解两种拦截思路。 | 读 observer 与 dep 目录，问「Vue 2 为何拦截不到新增属性」，读后改造自己的 Proxy 版 reactive。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 响应式深入](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html) | 体系化讲透依赖收集与触发更新，可直接对照手写 reactive/effect。 | 先读「响应式原理」章节，带着「依赖何时收集」的问题，读后自己实现 track/trigger 并跑通示例。 |

## 应用与行业实践

读到这里，你已经能手写 EventEmitter、观察者模式和 reactive。这一章说清楚三件事：它们各自出现在哪些真实场景里、怎么落地、怎么证明改动有效。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|:---|:---|:---|:---|
| 后台管理系统的万行表格，改一个单元格要刷新本行与底部合计 | 手写 EventEmitter 的 on / off / emit | Vue 3 + Pinia，或自写事件总线 | 行卸载时必须注销订阅，否则通知量随行数增长 |
| 低端安卓机的首屏列表渲染 | 手写 reactive 的依赖收集 | Vue 3 或 @vue/reactivity | 只代理首屏用到的字段，未展开的详情延后代理 |
| 多人协作白板的笔迹与光标同步 | 观察者模式加事件总线 | Yjs，或自写 EventEmitter 加 WebSocket | 远端回放的消息不能再上行，否则回环放大出站流量 |
| 表单字段联动校验，选完国家才出现省份 | reactive 的依赖收集与计算属性 | Vue 3 computed，或手写 reactive 加 watch | getter 里不要写副作用，重复收集会重复触发 |
| 埋点上报的开关与批量队列 | 发布订阅解耦上报方与消费方 | 自写 EventEmitter，消费端接 sendBeacon | 一个监听器抛错不能中断其余监听器 |
| 组件库的主题切换 | 观察者模式里的主题对象 | CSS 变量加 Subject | 订阅跟随组件卸载，否则切主题会通知到已销毁组件 |
| Node 服务端配置热更新 | Node 内置 events 模块 | Node.js EventEmitter | 默认单事件监听器上限为 10，超出会打印内存泄漏告警 |
| 浏览器多标签页的登录态同步 | reactive 加跨页广播 | BroadcastChannel 加 Proxy | 多标签同时写入要定先后顺序，关闭标签要解除订阅 |

### 三个场景拆解

#### 场景 1：后台管理系统的万行表格联动

**业务背景**

订单列表一屏显示几十行，总行数在万级，用户会连续编辑数量字段。早期做法是每次编辑重算整张表，输入框里的光标会被卡住，滚动也掉帧。

**怎么用本页知识解决**

思路是先按字段粒度切分通知：改动 `price` 只通知订阅了 `price` 的那几行，底部合计单独订阅。每行记录自己的注销函数，行滚出可视区就全部注销。

```js
// 每行只订阅自己关心的字段，避免整表重算
function createRow(id, bus) {
  const offs = [];                       // 记录本行全部注销函数
  function watch(field, render) {
    const handler = (p) => {
      if (p.id === id) render(p.value);  // 只处理本行事件
    };
    bus.on(`cell:${field}`, handler);
    offs.push(() => bus.off(`cell:${field}`, handler));
  }
  function set(field, value) {
    bus.emit(`cell:${field}`, { id, value }); // 通知同字段订阅者
  }
  function destroy() {
    offs.forEach((off) => off());         // 行滚出可视区时注销
    offs.length = 0;
  }
  return { watch, set, destroy };
}
```

- 事件名带上字段，订阅者数量从"行数"降到"读过该字段的行数"。
- `offs` 数组把注销收在一处，行销毁只调一次 `destroy`。
- 底部合计订阅同一条事件，不必重扫全表。
- 虚拟列表的行回收要和 `destroy` 绑定，否则订阅会累积。
- EventEmitter 的 `emit` 内部要 copy 一份监听器数组再遍历，防止回调里 off 自己造成跳过。

**怎么度量收益**

用 Chrome DevTools 的 Performance 面板录制"连续编辑十次"的完整操作，看 Main 轨道上超过 50ms 的 Long Task 条数，以及面板顶部的 Total Blocking Time。代码里用 `performance.mark` / `performance.measure` 打点，量从 `set` 到合计栏文本更新之间的耗时，取多次的中位数做对比。

**什么时候不该用**

- 数据只有几十行、层级不超过两层时，props 加回调能直接读懂数据流向，引入总线只会让断点调试变难。
- 跨行计算有严格顺序要求时（例如按录入顺序累加），事件驱动的通知顺序不稳定，应改用集中式 store 里的同步计算。
- 需要把整张表序列化后提交给后端做校验时，事件驱动产生的中间态与提交态可能不一致，应保留一份单一数据源。

#### 场景 2：低端安卓机上的首屏渲染

**业务背景**

首屏是一个卡片列表，卡片展开后才显示明细字段。中端机上首屏内容出现得够快，低端安卓机上脚本执行占了首屏时间的多数。把整份接口数据递归包一遍 reactive，是主要开销来源。

**怎么用本页知识解决**

思路是让代理按需创建、依赖按需收集：只有真正被读到的字段才进依赖表，只有被展开的嵌套对象才建 Proxy。

```js
function lazilyReactive(target) {
  const cache = new Map();               // 每层对象只建一次 Proxy
  return new Proxy(target, {
    get(obj, key) {
      const value = Reflect.get(obj, key);
      if (value && typeof value === 'object') {
        if (!cache.has(key)) cache.set(key, lazilyReactive(value)); // 用到才递归代理
        return cache.get(key);
      }
      track(obj, key); return value;     // 只有被读到的字段才收集依赖
    },
    set(obj, key, value) {
      Reflect.set(obj, key, value);
      trigger(obj, key);                 // 只通知读过该字段的副作用
      return true;
    },
  });
}
```

- `cache` 保证同一层对象被读两次时返回同一个 Proxy，依赖表不会分裂。
- 未展开的明细字段不建 Proxy，首屏少掉这部分创建开销。
- `track` 与 `trigger` 沿用前一章手写 reactive 的实现，只改调用时机。
- 数组要单独处理 `length` 与索引的读取，否则展开操作收集不到依赖。
- 深拷贝这份数据后再包代理，避免代理对象被别的模块直接改。

**怎么度量收益**

用 Lighthouse 在真机上跑，看 LCP 与 TBT 两项。真机调试走 `chrome://inspect` 远程连接，用 Performance 面板录制从导航到首屏内容出现的过程，看 Scripting 时长。自己加计数器统计 `lazilyReactive` 被调用的次数，对比改造前后。

**什么时候不该用**

- 首屏数据结构本身就是扁平的、字段不超过十来个时，这层判断省不下多少时间。
- 需要把响应式对象交给 `structuredClone` 或 `postMessage` 传输时，Proxy 包过的对象无法被结构化克隆，会抛 DataCloneError，应先 `toRaw` 再传。
- 数据来自不可变快照、每次整体替换时，Proxy 的逐字段拦截用不上，直接换引用加浅比较就够了。

#### 场景 3：多人协作白板的光标与笔迹同步

**业务背景**

白板支持同房间多人同时画线，笔迹按指针移动事件产生，频率是每帧多次。做法是本地先画，再把操作广播给其他人；如果广播回来的消息又被广播一次，出站流量会成倍增长，光标还会抖动。

**怎么用本页知识解决**

思路是给每条操作打上来源标记，事件总线只在收到本地来源时才上行。笔迹按帧合并，一帧只发一次。

```js
const board = new EventEmitter();
board.on('op', (op) => {
  if (op.origin === 'remote') {      // 远端操作只回放，不再上行
    apply(op);
    return;
  }
  apply(op);                          // 本地操作先本地生效
  socket.send(op);                    // 再上行给其他协作者
});
let frame = [];                       // 一帧内的笔迹先攒起来
function onStroke(op) {
  frame.push(op);
  if (frame.length > 1) return;
  requestAnimationFrame(() => {
    board.emit('op', { strokes: frame, origin: 'local' }); // 一帧广播一次
    frame = [];
  });
}
```

- `origin` 是回环抑制的关键，缺了它，同一条消息会在两端来回弹。
- `apply` 要同时处理单条操作与批量 `strokes` 两种入参。
- 指针事件读数是原生的，别把它包成响应式，否则每帧都触发依赖通知。
- WebSocket 断线重连后要重放未确认的本地操作，事件总线里留一个待确认队列。
- 光标位置属于高频低价值数据，和笔迹分开走不同通道，别混在一个事件名里。

**怎么度量收益**

看四个指标：单位时间内的出站 WS 帧数（Chrome DevTools 的 Network 面板筛 WS 可以逐帧查看）、自埋点的 `board.emit` 调用次数、`apply` 在单帧内的耗时分布、断线重连后的操作丢失条数。冲突相关的指标可以统计本地操作被回滚的次数。

**什么时候不该用**

- 只有一个人使用的画板，或者操作必须由服务端定序后才生效的场景（例如带审计要求的审批批注），本地先画再广播的顺序保证不够。
- 需要强一致收敛的富文本协同，自己写广播很难处理并发插入的合并，应改用现成的 CRDT 或 OT 库。

### 行业先进实践

**Proxy 响应式加 effectScope 统一停止副作用（出处：Vue.js 官方文档 Reactivity in Depth 与 effectScope 页面）**
Vue 3 用 Proxy 拦截读写来收集依赖，并用 effectScope 把一组副作用打包，一次 `stop()` 全部停止。这样组件卸载时不需要逐个取消订阅，遗漏一处就会泄漏。你的项目可以把一个页面的全部订阅放进同一个 scope，路由离开时统一停止。

**error 事件约定与 setMaxListeners（出处：Node.js 官方文档 events 模块）**
Node 的 EventEmitter 在没有 error 监听器时会把错误抛出，默认单个事件超过十个监听器会打印内存泄漏告警。这两条把"忘加错误处理"和"忘删监听器"暴露在开发阶段。你的项目可以在事件名上区分业务事件与 error，并在测试里断言监听器数量回到基线。

**addEventListener 的 signal 选项（出处：MDN Web Docs 的 AbortSignal 与 EventTarget.addEventListener 条目）**
DOM 事件订阅可以传入 `{ signal }`，调用 `abort()` 时自动移除监听器，省去保存每个回调引用的步骤。off 需要传入同一个函数引用，这一步容易写错。你的项目可以在初始化时创建一个 AbortController，把 signal 传给该模块内的全部 DOM 订阅。

**共享类型与 observe 回调（出处：Yjs 官方文档）**
Yjs 用 CRDT 合并并发编辑，共享类型提供 `observe` 与 `observeDeep`，把增量变化推给订阅者。合并逻辑交给数据结构后，应用层只处理事件订阅这一件事。若你要做协同编辑，先评估能否直接使用共享类型，再决定是否自写广播。

**Subject 多播与操作符管道（出处：RxJS 官方文档）**
RxJS 的 Subject 同时是观察者与可观察对象，能把一个事件源多播给多个订阅者，再用操作符做节流与去重，取消订阅统一走 Subscription。项目里已经有 RxJS 时，用它替代自写事件总线可以少维护一套注销逻辑；没有就不要为单个功能引入整个库。

### 从学到用：落地路线

1. **在一处试点**：挑一个能单独回滚、改动又频繁的页面，把页面内层层传递的回调换成事件总线。验收标准：该页面卸载后，总线上的监听器数量回到进入前的计数。
2. **验证收益**：对试点页面录制同一段操作，对比改造前后的 Long Task 条数与内存快照中的监听器对象数。验收标准：两项指标都有可复现的测量记录，且改动的代码能被单独回滚。
3. **推广到同类页面**：把试点的订阅与注销写法沉淀成一个小工具函数（例如 `useSubscription`），在同类页面逐个替换。验收标准：替换后的页面在路由切换十次后，内存快照里的监听器对象数不增长。
4. **防止回退**：在代码评审清单和 CI 里加一条检查，禁止在组件里直接调用总线而不返回注销函数。验收标准：CI 中有一条能失败的检查用例，人为去掉注销代码时流水线变红。

### 动手作业

**目标**

给一个任务列表页面接入事件总线与响应式：编辑任一单元格只刷新受影响的 DOM，页面卸载后全部订阅归零。

**步骤**

1. 用第 1 节的手写 EventEmitter 实现 `on` / `off` / `emit`，`off` 不传回调时清空该事件的全部订阅。
2. 造 2000 条任务数据，字段包含 `title`、`done`、`owner`，用前一章的手写 reactive 包一层。
3. 写渲染函数，只订阅当前可见行的字段变化，行滚出可视区就调用注销函数。
4. 加一条顶部统计栏，订阅 `done` 字段，显示完成数。
5. 在页面入口建一个订阅数组或 effect scope，卸载时统一停止。
6. 用 MutationObserver 统计一次编辑引起的 DOM 变更节点数。
7. 写单元测试覆盖 `on`、`off`、`emit` 三个方法的边界情况。

**验收标准**

- 编辑任意一行的 `title`，MutationObserver 记录的变更节点数不超过 3（该行文本、统计栏文本、必要的属性）。
- 卸载页面后，EventEmitter 内部每个事件的监听器数组长度为 0。
- 2000 行数据下录制一次编辑操作，Main 轨道上没有超过 50ms 的 Long Task；测试机型号与浏览器版本需写在作业文档里。
- `off` 一个未注册的回调不抛错，某个监听器抛错时其余监听器仍被调用。
- 单元测试全部通过，且覆盖"重复注册同一个函数只生效一次"这一条。

