---
title: Vue 响应式系统
description: Vue2/Vue3 差异、响应式原理、ref/reactive、computed、watch 与 nextTick
---

# Vue 响应式系统

> 本页按「概念、原理、代码」逐题展开相关面试专题。

## 1. Vue2 vs Vue3区别

### 1.1 响应式系统

**Vue2: Object.defineProperty**

```javascript
// Vue2 响应式原理（简化版）
function defineReactive(obj, key, val) {
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      console.log(`读取 ${key}`)
      return val
    },
    set(newVal) {
      if (newVal !== val) {
        console.log(`设置 ${key}: ${newVal}`)
        val = newVal
        // 触发通知更新
      }
    }
  })
}
```

缺陷：
- **无法监听新增属性**：`Vue.set(obj, 'newProp', 1)` 变通方案
- **无法监听删除**：`Vue.delete(obj, 'prop')` 变通方案
- **数组下标**：Vue2.2+ 才支持通过索引设置（性能代价大）
- 深度嵌套时需要递归，初始化时性能差

**Vue3: Proxy**

```javascript
// Vue3 响应式原理
// 第 1 段：入口——用 Proxy 创建"读时收集、写时派发"的代理对象
// 选 Proxy 而非 Object.defineProperty：可拦截 get/set/deleteProperty 等操作，天然支持新增属性、数组下标与 length 变化，
// 无需像 Vue2 那样初始化时递归遍历所有 key 逐个劫持。
// 依赖前提：track / trigger 定义在本文件之外，底层用 WeakMap<target, Map<key, Set<effect>>> 保存依赖关系。
function reactive(obj) {
  return new Proxy(obj, {
    // 第 2 段：get 拦截器——读取时收集依赖，并惰性递归代理子对象
    // 收集放在 get 里是为了"按需追踪"：只有副作用真正读到的 key 才建立 key→effect 映射，减少无关重渲染。
    // 易错点：null 与数组/Date 等边界判断不严（typeof null === 'object' 会误入 reactive），且无 WeakMap 缓存，
    // 同一对象多次 reactive 会产生不同代理，破坏引用相等比较。
    get(target, key, receiver) {
      // 用 Reflect.get 并透传 receiver，保证访问器 getter 内的 this 指向代理对象，
      // 使 getter 中继续访问的属性也能被收集依赖（原型链上的 getter 同理）。
      const res = Reflect.get(target, key, receiver)
      track(target, key) // 此刻 currentEffect 指向正在执行的副作用，登记它依赖 key
      return typeof res === 'object' ? reactive(res) : res // 惰性递归：子对象只在被访问时才包装成代理
    },
    // 第 3 段：set 拦截器——先写入，再按"值是否真的变化"决定是否派发更新
    // 关键数据流：取旧值 → Reflect.set 落盘 → 新旧值不全等才 trigger(target, key)，通知依赖集合重跑。
    // 边界：oldValue !== value 为全等比较，对同一对象重复赋值天然防抖；NaN !== NaN 会导致 NaN 赋值反复触发。
    set(target, key, value, receiver) {
      const oldValue = target[key] // 必须在写入前取旧值，写在 Reflect.set 之后拿到的永远是 new 值
      const res = Reflect.set(target, key, value, receiver)
      if (oldValue !== value) {
        trigger(target, key)
      }
      return res // 必须回传布尔结果：set 返回 false 时严格模式下赋值语句会抛 TypeError
    },
    // 第 4 段：deleteProperty 拦截器——删除属性后要通知依赖（如 v-for 遍历项被 delete）
    // hadKey 判断"删除前属性是否存在"：删除一个本就不存在的键不应引发更新。
    // 两个条件同时成立（原先有 + 删除成功）才 trigger；res 为 false 表示属性不可配置、删除失败。
    deleteProperty(target, key) {
      const hadKey = key in target
      const res = Reflect.deleteProperty(target, key)
      if (hadKey && res) {
        trigger(target, key)
      }
      return res
    }
  })
}
```
### 1.2 TypeScript支持

- Vue2: 通过 `vue-property-decorator` 等装饰器库模拟类型支持，不够原生
- Vue3: 源码完全用 TypeScript 重写，提供完美的类型推导

```typescript
// Vue3 defineProps 类型推断
const props = defineProps<{
  name: string
  age?: number
}>()

// withDefaults 提供默认值
const props = withDefaults(defineProps<{
  list: string[]
}>(), {
  list: () => []
})
```

### 1.3 Composition API

Vue2 使用 Options API（data/computed/methods/watch 分散）；Vue3 提供 Composition API，相同逻辑可以聚合，代码复用更优雅（mixin → composables）。

### 1.4 Virtual DOM实现

Vue2: 基于 `src/core/vdom/create-element.js`，手动编写 VNode 类型判断。Vue3: 引入 `block tree` 和 `patchFlag`，虚拟 DOM 遍历大幅减少。

### 1.5 性能

- 打包体积：Vue3 (22KB gzipped) vs Vue2 (~33KB)
- 初始渲染：快 20-50%（Proxy + block tree）
- 更新性能：平均快 2-3 倍
- 内存占用：减少近 50%

## 2. Vue响应式原理（defineProperty缺点 vs Proxy优势）

### 2.1 defineProperty 的三大缺陷

```javascript
// 缺陷1：新增属性不响应
const vm = new Vue({ data: { a: 1 } })
vm.b = 2        // 不触发更新
vm.$set(vm, 'b', 2) // 变通方案

// 缺陷2：删除属性不响应
delete vm.a     // 不触发更新
vm.$delete(vm, 'a') // 变通方案

// 缺陷3：数组直接用索引赋值不响应
vm.items[0] = {} // 在Vue2中不响应
vm.$set(vm.items, 0, {}) //
vm.items.splice(0, 1, {}) //
```

### 2.2 Proxy 的优势

```javascript
// 优势1：天然支持新增/删除属性
const obj = reactive({ a: 1 })
obj.b = 2     // 自动触发 set
delete obj.a  // 自动触发 deleteProperty

// 优势2：支持数组下标
const arr = reactive([1, 2, 3])
arr[0] = 10   // 正常工作

// 优势3：惰性代理（按需递归）
// Vue3只在访问时才对嵌套对象做代理，Vue2初始化时递归所有属性

// 优势4：非原始值自动嵌套
const state = reactive({
  user: { name: 'John', address: { city: 'BJ' } }
})
state.user.address.city = 'SH' // 深层响应式

// 优势5：性能更好，不需要defineProperty的get/set包装
// 优势6：可以拦截更多操作（has: key in obj, apply: 函数调用等）
```

### 2.3 Vue3 的依赖追踪（基于 Proxy）

```
访问响应式属性 → track(target, key) 记录当前activeEffect
设置响应式属性 → trigger(target, key) 找到所有依赖的effect执行
```

## 3. ref vs reactive 区别

| 特性 | ref | reactive |
|------|-----|---------|
| 接受类型 | 基本类型 + 对象 | 仅对象/数组 |
| 实现方式 | 对基本类型包装为{value: x}，内部用reactive处理对象 | 直接用Proxy |
| 模板访问 | 自动展开（不需要.value） | 直接访问 |
| 解构 | 丢失响应式 | 解构后丢失响应式（需用toRefs） |
| 类型推导 | 需要泛型指定 | 自动推导 |

```typescript
// ref: 基本类型必须用ref，对象内部会自动转reactive
const count = ref(0)
count.value++

const obj = ref({ a: 1 })
obj.value.a++          // 需要 .value

// reactive: 适合复杂响应式状态
const state = reactive({
  count: 0,
  user: { name: 'John' }
})

// reactive解构丢失响应式 → 使用toRefs
const state = reactive({ a: 1, b: 2 })
const { a, b } = toRefs(state) // a, b 变成 ref，保留响应式

// toRef: 创建一个 ref，保持与源属性的引用关系
const age = toRef(state, 'a') // age.value === state.a
```

**原理简析**：
- `ref` 内部创建了一个包裹对象，通过 `get value() / set value()` 拦截，当 value 是对象时内部调用 `reactive()` 处理。
- `reactive` 直接返回 `new Proxy(target, ...)`。

## 4. computed 原理

```typescript
// 用法
const doubleCount = computed(() => count.value * 2)

// 惰性求值 + 缓存
// 只有依赖变化时才重新计算，否则返回缓存值
```

**computed 原理：**

| 步骤 | 说明 |
|------|------|
| 首次访问 | 执行 getter，返回结果，收集依赖 (a, b) |
| 依赖变化 | a.value 变化 → trigger(computed) → computed.dirty = true |
| dirty check | 通知所有依赖 computed 的 effect |
| 再次访问 | dirty=true 重新执行 getter 返回新值，dirty=false 直接返回缓存值 |

**源码级实现要点**：
```javascript
// 简化版
class ComputedRefImpl {
  constructor(getter) {
    this._dirty = true
    this._value = null
    this.effect = effect(getter, () => {
      this._dirty = true   // 依赖变化时标记 dirty
      trigger(this, 'value')
    })
  }

  get value() {
    if (this._dirty) {
      this._value = this.effect.run() // 重新计算
      this._dirty = false
    }
    return this._value
  }
}
```

关键点：computed 本质是一个有缓存的 effect，`dirty` 标志实现惰性重算。

## 5. watch vs watchEffect 区别

| 特性 | watch | watchEffect |
|------|-------|------------|
| 依赖收集 | 手动指定 source | 自动收集（立即执行） |
| 首次执行 | 不执行（默认） | 立即执行一次 |
| 回调参数 | (newVal, oldVal) | 没有 oldVal |
| 停止 | 返回 stop() | 同上 |

```typescript
// watch: 惰性，只有变化才执行，可访问旧值
watch(() => state.count, (newVal, oldVal) => {
  console.log(`${oldVal} → ${newVal}`)
}, { immediate: true }) // immediate: true 时首次也执行

// watchEffect: 自动追踪回调中用到的所有响应式数据
watchEffect(() => {
  console.log(state.count) // 自动追踪 count 依赖
  console.log(state.name)  // 自动追踪 name 依赖
})

// 监听多个源
watch([ref1, ref2], ([v1, v2], [o1, o2]) => {
  console.log(v1, v2)
})

// 深度监听
watch(() => deepObj, (val) => {}, { deep: true })

// 停止监听
const stop = watch(...)
stop() // 停止
```

**选择策略**：
- 需要旧值 → `watch`
- 回调内明确知道依赖 → `watch`
- 只需响应式状态副作用，不关心旧值 → `watchEffect`（更简洁）

## 6. nextTick 原理（微任务队列 + flush callbacks）

```javascript
// 用法
async function update() {
  state.name = 'new name'
  await nextTick()  // DOM已更新
  console.log(document.querySelector('.title').textContent)
}
```

**nextTick 原理：**

| 步骤 | 说明 |
|------|------|
| nextTick(callback) | callback 推入 callbacks 队列 |
| flushCallbacks | 调用 flushCallbacks（异步执行队列中所有回调） |
| 微任务执行 | `Promise.resolve().then(flushCallbacks)` |
| 执行回调 | `while(queue.length) queue.shift()()`，依次执行所有入队的回调 |

**微任务选择**：Vue3 优先使用 `Promise.resolve()` → 微任务；Vue2 依次降级：`Promise` → `MutationObserver` → `setImmediate` → `setTimeout(fn, 0)`。

**微任务选择**：Vue3 优先使用 `Promise.resolve()` → 微任务；Vue2 依次降级：`Promise` → `MutationObserver` → `setImmediate` → `setTimeout(fn, 0)`。

**为什么需要 flush callbacks 队列？**

```javascript
// 场景：连续多次修改同一个响应式数据
state.count = 1
state.count = 2
state.count = 3
await nextTick() // 只在最后一次微任务中更新一次DOM，而不是三次
```

Vue 批量更新（Batching）：同一事件循环内的多次状态变更会被合并，只触发一次 DOM 更新。`flushSchedulerQueue` 是批量的核心，它在微任务中执行所有 pending 的 watcher 更新。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 官方文档](https://cn.vuejs.org/) | 官方中文文档，响应式基础与深入响应式章节覆盖本页全部概念。 | 先读「响应式基础」「深入响应式」，带着 ref vs reactive、watch vs watchEffect 的选择问题做笔记。 |
| [Vue 官方英文文档](https://vuejs.org/guide/introduction.html) | 英文版更新更快，API 行为描述比中文版更准确细致。 | 对照中文版读 Reactivity API 与 Watchers 两节，核对版本变更和 watchEffect 刷新时机说明。 |
| [Object.defineProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) | 理解 Vue 2 用 defineProperty 只能劫持已有属性的根源。 | 读语法与存取器描述符部分，想清楚为何新增属性、删除属性和数组下标无法被检测。 |
| [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) | Proxy 是 Vue 3 响应式基石，先懂拦截机制才能看懂源码。 | 读概述与陷阱列表，重点看 get/set 拦截，再回源码对照 track 与 trigger 的挂载位置。 |
| [handler.get()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get) | get 陷阱对应 Vue 3 依赖收集 track 的入口。 | 读语法与拦截时机，读完回答：为什么依赖收集必须写在 get 而不能写在 set 里。 |
| [handler.set()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/set) | set 陷阱对应 Vue 3 触发更新 trigger 的入口。 | 读返回值约束与 Reflect.set 的配合，理解为何拦截器必须返回布尔值。 |
| [Vue RFCs](https://github.com/vuejs/rfcs) | Composition API RFC 说清 ref、reactive 与 watch 的设计取舍。 | 读 Composition API RFC，带着「为何不能只有 reactive」的问题读，整理出 ref 存在理由。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 核心源码仓库](https://github.com/vuejs/core) | 官方源码仓库，ref、effect、computed 实现可直接阅读。 | 按 packages/reactivity 下 ref.ts、effect.ts、computed.ts 顺序读，边读边打断点跑测试。 |
| [Vue core：reactivity](https://github.com/vuejs/core/tree/main/packages/reactivity) | Vue core reactivity 入口，从 reactive.ts 顺藤摸瓜最清晰。 | 从 reactive.ts 出发，沿 baseHandlers.ts 追 track/trigger 调用链，画一张完整流程图。 |
| [Vue 2 响应式源码目录](https://github.com/vuejs/vue/tree/main/src/core/observer) | Vue 2 响应式源码，与 Vue 3 对比 defineProperty 与 Proxy 最直观。 | 读 observer/index.js 的 defineReactive，与 Vue 3 的 Proxy 写法逐点列差异表。 |
| [Vue 响应式深入](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html) | 由浅入深讲响应式，读完能自己手写核心逻辑。 | 跟做 reactive、effect、computed 三部分，手写一遍再回看源码验证实现细节。 |
| [MDN 元编程](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming) | 用 Proxy 与 Reflect 写小示例，快速建立元编程直觉。 | 跟着实现带校验的对象，再用同样思路写一个极简的 track/trigger 小 demo。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Node.js 事件循环](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick) | 讲清微任务与事件循环，是理解 nextTick 队列的前提。 | 读事件循环与微任务章节，自写打印顺序题验证 nextTick 与 Promise.then 的先后。 |
| [Jake Archibald：In The Loop（JSConf.Asia）](https://www.youtube.com/watch?v=cCOL7MC4Pl0) | 深入讲解任务与微任务，帮助你彻底弄清 nextTick 的时机。 | 看完先预测十道事件循环输出题再验证，然后回源码读 flush callbacks 的实现。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格 | ref 深层代理开销、shallowRef | Vue 3 + 虚拟滚动 | 就地改行数据不触发更新，需 triggerRef 或整体替换 |
| 低端安卓的首屏加载 | 代理建立成本、nextTick | Vue 3 + 路由分包 + 骨架屏 | 首屏数据别整块塞进 reactive，先上骨架再取数 |
| 多人协作白板 | reactive 深层代理、markRaw | shallowReactive + Canvas 引擎 | 引擎实例进响应式对象会拖慢每帧绘制 |
| 每秒千条推送的行情大屏 | computed 缓存、watch 的 flush | shallowRef + requestAnimationFrame | 每条推送都写响应式数据会引发刷新风暴 |
| 表单实时校验 | computed 派生 | Vue 3 computed + 校验库 | computed 内不写副作用，异步校验交给 watch |
| 大文件上传进度与取消 | nextTick 的 DOM 更新时机 | ref + nextTick + AbortController | 读进度条 DOM 尺寸要放在 nextTick 之后 |
| 移动端下拉刷新长列表 | ref 与 reactive 的选择 | Vue 3 + toRefs | 从 reactive 解构基本类型会丢响应性 |
| 图表库实例挂载 | markRaw、shallowRef | ECharts 实例 | 实例进 reactive 后内部属性被代理，出现异常或掉帧 |
| SSR 首屏水合 | ref 在服务端的行为 | Nuxt | 每次请求新建应用实例，避免 ref 状态跨请求复用 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：一页渲染 500 行、每行 8 个字段，滚动时输入框输入会卡住。用 Chrome DevTools Performance 录一段 10 秒滚动即可复现。

**怎么用本页知识解决**：行数据只关心整体替换，用 shallowRef 存，绕开每行属性的代理；就地编辑时手动 triggerRef 通知一次。

```js
import { shallowRef, triggerRef } from 'vue'
// 表格数据：只关心整体替换，不对每行做深层代理
const rows = shallowRef([])
// 翻页时整体替换数组，一次触发更新
async function loadPage(page) {
  // fetch 返回普通对象数组，不进入 Proxy
  rows.value = await fetchRows(page)
}
// 单元格就地编辑：改完手动通知依赖
function patchCell(index, key, value) {
  // 直接写原始对象，跳过代理层
  rows.value[index][key] = value
  // 手动触发，视图只刷新一次
  triggerRef(rows)
}
```

- shallowRef 只跟踪 `.value` 的替换，数组里每个对象的属性不会被代理。
- 整体替换写法让一次网络请求只对应一次组件更新。
- 就地编辑走 triggerRef，避免为了改一个格重建整个数组。
- triggerRef 是手动开关，漏调用就会出现"数据变了视图不动"。
- 行数少、字段少时不需要这套写法，直接 ref 更省心。

**怎么度量收益**：在 Chrome DevTools Performance 面板录制同一段滚动，读 Scripting 汇总时间与 Frames 行的掉帧位置。用 PerformanceObserver 监听 longtask，统计超过 50ms 的任务条数。在 Vue Devtools 里看表格行组件的渲染次数。

**什么时候不该用**：单元格之间需要互相驱动计算时，浅层代理会漏掉依赖收集，改用 reactive 并拆分细粒度状态。数据只有几十行、没有滚动压力时，引入 triggerRef 只会让维护者多记一条规则。

#### 场景 2：多人协作白板

**业务背景**：画布上有几百个图形，每位操作者持续产生笔迹点，绘制与状态同步交替发生。用 Performance 面板看每帧耗时即可判断哪一段在抢时间。

**怎么用本页知识解决**：几何数据交给渲染引擎自己管，不进响应式系统；只让图层列表和选中态驱动视图。

```js
import { shallowReactive, markRaw } from 'vue'
// 渲染引擎自己管状态，不放进响应式系统
const engine = markRaw(createRenderer(canvasEl))
// 只有图层列表和选中态需要驱动视图
const state = shallowReactive({
  layers: [],      // 浅层，只跟踪数组整体替换
  selectedId: null // 基本类型，正常跟踪
})
// 绘制结束，用引擎产出的新数组替换旧数组
function commit(nextLayers) {
  state.layers = nextLayers // 一次赋值触发一次更新
}
// 选中态走响应式，几何数据直接写引擎
function select(id) {
  state.selectedId = id
  engine.select(id) // 绕开 Proxy
}
```

- markRaw 给引擎实例打标记，Proxy 不再包装它及内部对象。
- 每帧写入的坐标点留在引擎里，响应式系统不参与逐点比较。
- 图层列表按次替换，面板与缩略图跟着刷新一次。
- 选中态是低频操作，走响应式不会形成压力。
- 引擎实例一旦被代理，绘制循环里的属性读写都会经过拦截器。

**怎么度量收益**：Performance 面板看 Frames 行与每帧耗时。在 requestAnimationFrame 回调里记录帧间隔，用 console.table 输出分布。对比改造前后同样一段笔迹绘制操作。

**什么时候不该用**：图形属性需要在右侧面板里逐项双向绑定时，浅层结构要到处手动触发，直接用 reactive 更符合写法。图形总量在几十个以内时，深层代理的开销不构成瓶颈，加这层设计只增加理解成本。

#### 场景 3：低端安卓的首屏加载

**业务背景**：首屏要在中低端安卓机上打开，从进入页面到可交互的耗时是核心关注点。用 Lighthouse 移动端模式跑一次即可看到 LCP 与 TBT。

**怎么用本页知识解决**：首屏只让加载开关参与响应式，面板数据用 shallowRef 存整体；先渲染骨架屏，等 DOM 落位后再取数。

```js
import { ref, shallowRef, nextTick } from 'vue'
// 首屏只有加载开关参与响应式
const ready = ref(false)
// 面板数据体量大，用 shallowRef 存整体
const panel = shallowRef(null)
async function bootstrap() {
  ready.value = true          // 先让骨架屏上屏
  await nextTick()            // 等 DOM 落位
  const box = document.querySelector('.panel')
  const width = box.clientWidth // 量取容器宽度后再取数
  panel.value = await fetchPanel(width) // 整体赋值触发一次
}
```

- ready 是基本类型，代理成本可以忽略。
- nextTick 保证量取尺寸时骨架屏的 DOM 已经存在。
- 先上骨架再取数，把首次绘制与网络请求拆成两段。
- panel 整体赋值，避免大对象逐层建立依赖。
- 骨架屏期间的等待时间要与真实网络耗时对齐，否则会闪一下再变。

**怎么度量收益**：Lighthouse 移动端模式的 LCP 与 TBT。Chrome DevTools Performance 面板的 Scripting 时间。Network 面板看骨架屏与数据请求的先后顺序。

**什么时候不该用**：服务端已经直出首屏数据、页面无需二次请求时，骨架屏这一步是多余的。数据量小、面板内容固定时，shallowRef 带来的手动触发开销超过它省下的代理成本。

### 行业先进实践

`shallowRef 承载大型不可变数据（出处：Vue 官方文档《响应式 API：进阶》）`

官方文档在"减少大型不可变结构的响应性开销"一节里说明：数据整体替换、内部不修改时，用 shallowRef 可以跳过多层代理。它有效的原因是依赖追踪只发生在 `.value` 一层。借鉴方式是把分页结果、配置快照这类整体替换的数据先挑出来。

`markRaw 跳过第三方实例的代理（出处：Vue 官方文档《响应式 API：进阶》markRaw 条目）`

文档说明 markRaw 会给对象打标记，让它永远不会被转成响应式代理。图表、地图、编辑器这类自己维护内部状态的实例，被代理后容易出现行为异常。借鉴方式是封装一个 `useChart` 组合式函数，把实例创建、markRaw 标记、销毁写在同一个文件里。

`storeToRefs 解构 store（出处：Pinia 官方文档《Store》的"从 Store 解构"）`

Pinia 文档指出，直接用解构会丢掉响应性，要用 storeToRefs 保留对 state 与 getter 的引用。原因是 storeToRefs 返回的是 ref 而不是快照值。借鉴方式是把它写进团队代码规范，配合 ESLint 规则拦截对 store 的直接解构。

`useVirtualList 渲染长列表（出处：VueUse 开源项目）`

VueUse 提供 useVirtualList，把长列表收敛成可视区窗口加缓冲行。容器里真实存在的 DOM 节点数量被固定在一个区间，单帧的 diff 工作量随之固定。借鉴方式是先量出单行高度与容器高度，再决定缓冲行数，并给它加一条滚动到底部的加载用例。

`v-memo 跳过列表项子树更新（出处：Vue 官方文档《内置指令》的 v-memo 条目）`

v-memo 接收依赖数组，数组每一项与上次相同就跳过整个子树的更新。它适合依赖项稳定、更新频率低的列表行。借鉴方式是先确认这一行的依赖数组写全，再把它加到热点列表项上，并用渲染次数验证确实跳过了。

### 从学到用：落地路线

第 1 步：选渲染次数最高的那个列表组件试点，把大数组换成 shallowRef，就地修改处补 triggerRef。验收标准：该组件功能用例全部通过，Vue Devtools 里滚动期间的渲染次数低于改造前基线。

第 2 步：用 Chrome DevTools Performance 在同一台设备、同一段操作脚本下录制改造前后两次。验收标准：两次录制文件都在，Scripting 时间与长任务条数的差值可复现。

第 3 步：把触发时机、依赖写法整理成评审清单，推广到同类列表页与图表页。验收标准：清单每条都带正反代码示例，评审时能指出具体违规行。

第 4 步：给关键页面加自动化的性能守卫。验收标准：CI 中运行 Lighthouse CI 或自建基准脚本，指标超过阈值时任务失败并附报告。

### 动手作业

目标：把一个 5000 行的表格从"全量响应式 + 全量渲染"改造成浅层响应式加虚拟滚动，并用可复现的录制证明改动有效。

步骤：

1. 用脚本生成 5000 行对象，每行 8 个字段，先不接虚拟滚动，记录一次全量渲染的耗时。
2. 打开 Vue Devtools，滚动 10 秒，记下表格行组件的渲染次数作为基线。
3. 把行数据从 ref 改成 shallowRef，单元格编辑改成改原始对象后调用 triggerRef。
4. 接入虚拟滚动，只渲染可视区窗口加缓冲行，容器高度按行高乘行数计算。
5. 用 Chrome DevTools Performance 录制同一段滚动操作，与步骤 2 的基线对比 Scripting 时间和长任务条数。
6. 用 Lighthouse 移动端模式跑一次，导出 TBT 与 LCP 报告，与改造前的报告放在一起。
7. 在 README 里列一条改动对应一个知识点：shallowRef、triggerRef、nextTick、虚拟滚动。

验收标准：

- 编辑任意单元格后视图能更新，逐格编辑与批量粘贴的用例全部通过。
- 滚动 10 秒期间 Vue Devtools 里的渲染次数低于基线，且两次操作脚本一致。
- Performance 面板的两份录制文件都已提交，Scripting 与长任务条数可直接对比。
- Lighthouse 移动端报告含改造前后两份，指标出处与运行条件写清。
- README 中每条改动都能指到本页对应的知识点。

