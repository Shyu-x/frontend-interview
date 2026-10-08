---
title: 组件与组合式 API
description: keep-alive、Teleport/Suspense、Composition API、Vue3 性能与宏
---

# 组件与组合式 API

> 本页按「概念、原理、代码」逐题展开相关面试专题。

## 1. keep-alive 原理

### 1.1 核心思想

`keep-alive` 缓存组件实例而非销毁，保留组件状态（data、滚动位置等）。

```
<keep-alive :include="['Home', 'About']" :exclude="'Login'">
  <component :is="currentView" />
</keep-alive>
```

### 1.2 缓存策略

```javascript
// 内部维护两个 Map（LRU 最近最少使用）
this.cache = new Map()   // key → vnode
this.keys = []           // 按访问顺序记录 key，max 限制后淘汰最老的

// 命中缓存
if (cache[key]) {
  vnode.componentInstance = cache[key].componentInstance
  remove(keys, key)
  keys.push(key)
} else {
  cache[key] = vnode
  keys.push(key)
  if (max && keys.length > max) {
    const oldKey = keys.shift()
    delete cache[oldKey]
  }
}
```

### 1.3 activated / deactivated 钩子

```javascript
// 被缓存的组件：
export default {
  activated() {
    // 组件从缓存中被激活
    console.log('组件被激活')
  },
  deactivated() {
    // 组件被停用（切走但未销毁）
    console.log('组件被停用')
  }
}
```

### 1.4 生命周期调用时机

```
首次挂载: created → mounted → activated
切走（缓存）: deactivated
切回（缓存）: activated
销毁: deactivated → beforeUnmount → unmounted
```

## 2. Teleport 与 Suspense

### 2.1 Teleport（传送门）

```vue
<!-- 将 modal 传送到 body -->
<teleport to="body">
  <div class="modal">内容</div>
</teleport>

<!-- 条件传送 -->
<teleport to="body" :disabled="!isOpen">
  <div>只在 isOpen 时传送</div>
</teleport>
```

**原理**：在挂载时将真实 DOM 移动到指定位置，渲染逻辑仍在当前组件，输出位置在目标节点。

### 2.2 Suspense（悬念）

```vue
<suspense>
  <template #default>
    <async-component />
  </template>
  <template #fallback>
    <loading-spinner />
  </template>
</suspense>
```

Suspense 利用 `async setup`（返回 Promise），在 setup resolve 前显示 `#fallback`，resolve 后渲染 `#default`。

## 3. setup 为什么更强，Composition API 为什么出现

### 3.1 Options API 的问题

```vue
<!-- Vue2 Options API: 相关逻辑被拆分到各处 -->
<script>
export default {
  data() { return { count: 0 } },
  computed: { double() { return this.count * 2 } },
  methods: { increment() { this.count++ } },
  watch: { count(val) { console.log(val) } }
  // 问题：count 相关逻辑分散在 4 个地方
}
</script>
```

### 3.2 Composition API 的优势

```vue
<script setup>
import { ref, computed, watch } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)
const increment = () => count.value++
watch(count, val => console.log(val))

// 复用：抽取为 composable
export function useCounter() {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  return { count, double }
}
</script>
```

**三大优势**：

1. **逻辑复用**：mixin 有命名冲突、来源不明的问题，composable 函数清晰可控
2. **代码组织**：按功能而非选项类型组织大型组件代码
3. **类型推导**：更好的 TypeScript 支持

## 4. Vue3 为什么更快

1. **Proxy 响应式**：惰性代理，初始化快，内存占用低
2. **Block Tree**：diff 只遍历动态节点，跳过静态子树
3. **patchFlag**：精确标记动态类型，switch-case 快速分发
4. **静态提升**： hoistStatic 将静态节点提升到渲染函数外部，避免重复创建
5. **事件缓存**：静态事件 `onClick={handleClick}` 只创建一次
6. **v-memo**：跳过子树的更新
7. **Virtual DOM 重写**：整体比 Vue2 快约 50%

```
Vue2 更新一棵组件树：遍历所有节点 → O(N)
Vue3 更新一棵组件树：遍历 dynamicChildren → O(动态节点数 << N)
```

## 5. defineExpose / defineProps / defineEmits 原理

```vue
<!-- Parent.vue -->
<template>
  <Child ref="childRef" />
  <button @click="childRef.exposedMethod()">调用子组件方法</button>
</template>

<!-- Child.vue -->
<script setup>
const props = defineProps({ title: String, count: { type: Number, default: 0 } })
const emit = defineEmits(['update', 'delete'])

defineExpose({
  exposedMethod() { console.log('called') }
})
</script>
```

**原理**：

- `defineProps/defineEmits/defineExpose` 是编译器在编译 `<script setup>` 时识别的特殊编译器宏
- 编译后生成 `__sfc__` 元数据，供 devtools 和 HMR 使用
- 运行时它们是编译器宏，不是真正的函数调用

```javascript
// 编译后大概等价于：
const __sfc__ = {
  __name: 'Child',
  props: { title: String, count: { type: Number, default: 0 } },
  emits: ['update', 'delete'],
  setup(props, { emit }) {
    defineExpose({ exposedMethod })
    return () => h('div', props.title)
  }
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue RFCs](https://github.com/vuejs/rfcs) | 官方 RFC 记录 Composition API 与 script setup 的设计动机与取舍。 | 先读 Composition API 的动机与渲染函数部分，再读 script setup，读完列出 setup 语法糖解决的问题。 |
| [<Suspense>](https://react.dev/reference/react/Suspense) | 对照 React Suspense 的边界，理解 Vue Suspense 的挂起与回退。 | 读 fallback 与 lazy 示例，再用 Vue 异步 setup 写一例，比较两者对错误与嵌套的处理。 |
| ['Suspense'](https://yew.rs/docs/concepts/suspense) | 换一个框架看异步组件，帮助提炼 Suspense 的共性抽象。 | 只读概念与示例段，画出从挂起到 resolve 的状态流，再与 Vue Suspense 对照。 |
| [Pinia 文档](https://pinia.vuejs.org/zh/) | setup store 是组合式 API 在状态层的直接落地，可动手验证。 | 读 Defining a Store 的 setup 写法，把购物车改成 setup store，观察 ref 与 computed 复用。 |
| [React API 参考](https://react.dev/reference/react) | 对照 Hooks 的调用规则与闭包陷阱，理解 setup 只执行一次的收益。 | 只读 Caveats 与 Troubleshooting，列出 Hooks 限制，再看 setup 如何绕开依赖数组。 |
| [Keep-Alive header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Keep-Alive) | 澄清同名 HTTP 头，别把连接复用与组件缓存混为一谈。 | 读语义与示例，再写一遍 KeepAlive 的 include/exclude 与 activated 钩子笔记。 |
| [Plugin API](https://vite.dev/guide/api-plugin) | 用 transform 钩子看 SFC 编译产物，理解 defineProps 等宏如何被编译。 | 写一个 transform 插件打印 .vue 输出，对比宏编译前后的代码差异。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [esbuild](https://github.com/evanw/esbuild) | 读构建器源码架构，理解 Vite 与 Vue3 启动、编译提速的底层原因。 | 读 architecture.md 的分层设计，带着“为什么快”对照 Vue3 的编译优化。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vite：插件 API（中文）](https://cn.vitejs.dev/guide/api-plugin.html) | 中文教程带你写插件，顺路观察 SFC 编译与热更新流程。 | 照步骤写 transform 钩子插件并打印执行顺序，套在含 defineProps 的组件上。 |
| [网道 Web API 教程](https://wangdoc.com/webapi/) | 补 DOM 基础，才看得清 Teleport 与 keep-alive 对真实节点的操作。 | 读节点的创建移动与移除章节，读完后写一个不依赖框架的显隐小示例。 |

## 应用与行业实践

本页前面的内容是概念与原理，这一章回答"这些知识落到哪个页面、怎么验收"。每段都给出可复现的测量方法，不讲没有测量口径的结论。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格滚动 | Vue 3 的编译期与运行时优化 | el-table-v2 虚拟化表格、VueUse useVirtualList | 行高固定才能算出可视区；过滤放在 computed 里，别写进模板表达式 |
| 低端安卓机的首屏 | Suspense 与异步组件、编译期优化 | 路由懒加载、骨架屏、Vite 代码分割 | 首屏 chunk 要先测基线再压，不设目标数字就等于没测 |
| 多人协作白板 | Teleport | Teleport to="body"、自定义指令 | 浮层挂到 body 后，位置要跟着画布的缩放与平移一起算 |
| 富文本编辑器工具栏与气泡菜单 | Teleport、defineProps / defineEmits | Teleport 加浮层定位 | 目标容器必须早于组件挂载存在 |
| 微前端子应用挂载 | defineExpose、setup | 手动 mount、defineExpose 暴露方法 | 暴露函数，不要把 ref 对象本身交出去 |
| 大屏可视化定时轮询 | setup、生命周期钩子 | 组合式函数封装轮询 | 被 KeepAlive 缓存时，定时器要放在 activated / deactivated 里启停 |
| 移动端 Tab 切换的长列表 | keep-alive 原理 | KeepAlive 的 max 与 include | 缓存条数要有上限，数据变更靠 activated 刷新 |
| 内部组件库发布 | defineProps / defineEmits / defineExpose 原理 | 组件库加 d.ts 导出 | props 与 emits 的声明就是对外契约，改名字要让编译器报错 |
| 服务端渲染的首屏 | Suspense | Nuxt 异步数据、onServerPrefetch | Suspense 在服务端与水合阶段的行为需核对官方文档 |

### 三个场景拆解

#### 场景 1：后台订单列表的筛选条件回填

**业务背景**：运营在订单列表筛完条件、点进某条详情、再返回时，筛选框和滚动位置都被重置，需要重新操作一遍。列表数据量在千行以上，靠分页或虚拟滚动承载，每次返回都重新请求。

**怎么用本页知识解决**：用 KeepAlive 把列表页实例留在内存里，筛选状态随实例保留；进入详情后如果数据可能被改动，就在 activated 里重新请求，由列表页把刷新方法 expose 给父组件。

```vue
<script setup>
import { ref, onActivated } from 'vue'

const page = ref(1)
const keyword = ref('')
const rows = ref([])

async function load() {                    // 只拉当前页，筛选参数留在组件内
  rows.value = await fetchPage({ page: page.value, keyword: keyword.value })
}

onActivated(load)                          // 返回时命中缓存实例，只重发请求
defineExpose({ load })                     // 父组件调 ref.load()，不暴露 ref 本身
</script>
```

- KeepAlive 缓存的是组件实例，返回时不会重新创建，筛选条件和滚动位置留在内存里。
- onActivated 在首次挂载时也会触发，如果页面里同时写了 onMounted 请求，会发出两次请求，保留一个即可。
- defineExpose 交出的是函数，父组件通过 ref 拿到的是代理对象，调用时机要在挂载完成之后。
- include 匹配的是组件名，`<script setup>` 的组件名取自文件名，需要核对官方文档确认命名推断规则。

**怎么度量收益**：看两个指标。返回耗时用 performance.mark 在点击返回处和首行渲染处打点、performance.measure 输出；接口请求条数在 Network 面板筛选 Fetch/XHR，数一次返回交互内的条数。内存变化在 Performance 面板勾选 Memory，记录交互前后的 JS 堆大小。

**什么时候不该用**：一是列表必须每次进入都拿到服务端最新值（比如库存、排队号）时，缓存只会让你显示旧数据；二是一次性页面（登录后跳转、下单成功页），缓存既不省请求又占内存；三是缓存对象里带大字符串（富文本正文）时，必须配 max 限制条数，否则内存随访问过的页面数增长。

#### 场景 2：多人协作白板上的浮动工具条

**业务背景**：白板画布用 CSS transform 做缩放和平移，容器设了 overflow: hidden。工具条要跟着光标出现，放在画布容器内会被裁掉，缩放后还容易漂移。

**怎么用本页知识解决**：把浮层 Teleport 到 body，让它的 DOM 位置脱离画布的裁剪与层级；坐标由父组件算好，用 props 传进来，用户在浮层上的选择用 emits 抛回去。

```vue
<template>
  <Teleport to="body">                     <!-- 挂到 body，脱离画布容器的 overflow 裁剪 -->
    <div v-if="visible" class="toolbar" :style="pos">
      <button @click="$emit('pick', 'pen')">画笔</button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ visible: Boolean, x: Number, y: Number })
defineEmits(['pick'])                      // 事件写进声明，父模板才有类型提示
const pos = computed(() => ({ left: `${props.x}px`, top: `${props.y}px` }))
</script>
```

- Teleport 只改 DOM 挂载位置，组件的父子关系、props 传递和事件处理都还在原来的组件树上。
- to 的目标在挂载时必须已经存在，写在 index.html 里的 body 满足条件；由第三方脚本后插入的节点不满足。
- 浮层落在 body 上后，与画布不再有 DOM 包含关系，点外部关闭要用事件坐标判断，不能再用 contains 过滤。
- 位置由父组件算、浮层只负责渲染，缩放逻辑改动时不用同步改浮层代码。

**怎么度量收益**：位置误差在滚动和缩放后读 getBoundingClientRect，与光标坐标求差并打印到控制台。拖拽是否掉帧用 Performance 面板录制，看 Frames 行里出现红条的位置。点击外部关闭是否生效，先在 Elements 面板确认浮层父节点是 body，再在画布与浮层上各点一次。

**什么时候不该用**：一是浮层本来就应该被滚动容器裁剪（表格单元格内的下拉），Teleport 到 body 反而要手写位置同步；二是目标容器由第三方脚本在插件初始化时才创建，to 的字符串选择器在挂载时取不到，要走 ref 或先自建容器；三是服务端渲染期间没有 body，这一段需核对官方文档确认处理方式。

#### 场景 3：低端安卓机弱网下的首屏

**业务背景**：手机端首屏里放了一个体积大的图表组件，网速差时白屏时间被它拖住。用户在弱网下打开页面，先看到的应该是可交互的外壳，而不是等待全部模块下载完。

**怎么用本页知识解决**：把图表拆成异步组件，让构建工具单独出 chunk；用 Suspense 包住它，在 fallback 里铺与真实内容同尺寸的骨架屏，先渲染外壳再补图表。

```vue
<script setup>
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))
// 工厂函数返回 import()，构建工具会把这个模块切成独立 chunk
</script>

<template>
  <Suspense>
    <HeavyChart />
    <template #fallback>
      <div class="skeleton" />             <!-- 骨架尺寸与图表一致，避免切换时跳版 -->
    </template>
  </Suspense>
</template>
```

- Suspense 的默认插槽里出现异步依赖时，先渲染 fallback，依赖解析完成后整体切换。
- 组件 `<script setup>` 顶层的 await 同样会让 Suspense 进入挂起状态，可以放在负责取数的那一层。
- 骨架屏的高度与真实图表对齐，切换时布局不动，CLS 才不会被拉高。
- 顶层 await 的组件外面要有 Suspense 或错误处理，否则渲染阶段出错只能看到白屏。

**怎么度量收益**：LCP 与 TBT 用 Lighthouse 移动端模式跑，或者用 Performance 面板读同一份 trace；传输体积在 Network 面板看首屏请求的 Transfer Size，构建产物用 vite build 的输出或 rollup-plugin-visualizer 对比；长任务用 PerformanceObserver 监听 longtask，记录条数与最长一条的时长。

**什么时候不该用**：一是首屏关键内容本身就由这个异步组件渲染（比如商品详情主体），骨架屏换不来可交互时间，应改成服务端渲染或提前预取；二是模块体积很小的时候，拆包多出一次网络往返，不如打进主包；三是内网工具这类网络稳定的场景，拆包只增加构建配置的维护成本。

### 行业先进实践

**用 include 与 max 控制缓存规模（出处：Vue 官方文档 KeepAlive）**。文档给出按组件名匹配的 include / exclude，以及限制缓存实例数量的 max，超出上限后按最近最久未使用淘汰。做法是把允许缓存的页面名写进 include，再配一个上限，让内存占用与访问过的页面数脱钩。借鉴时先在后台列表页试，记录缓存实例数随访问页面数的变化。

**异步组件与路由懒加载拆首屏（出处：Vue 官方文档「异步组件」、Vue Router 官方文档「懒加载路由」）**。用 `() => import()` 把首屏不需要的模块拆成独立 chunk，首屏只下载渲染当前视图需要的代码。借鉴时先跑一次构建，看产物里体积靠前的 chunk 是哪几个，再决定拆哪个，拆完用 Lighthouse 前后各跑一次对比。

**大列表虚拟化（出处：VueUse 官方文档 useVirtualList、Element Plus 官方文档 Table V2）**。只渲染可视区与缓冲区内的行，DOM 节点数不随数据总量增长。落地前先确认行高是否固定，行高由内容撑开时先给每行设固定高度，否则可视区计算会偏。

**把可复用逻辑抽成组合式函数（出处：Vue 官方文档「组合式 API 常见问答」）**。文档建议把同一功能的逻辑放在一起，用 useXxx 函数复用，并指出组合式函数里使用的生命周期钩子依赖当前组件实例。借鉴时把轮询开关、请求取消、事件监听解绑都写在函数内部，调用点只留一行。

**SSR 与 Suspense、客户端专属渲染的配合（出处：Vue 官方文档「服务端渲染」、Nuxt 官方文档）**。需核对官方文档：Suspense 在服务端渲染与客户端水合各阶段的行为，以及 Nuxt 里客户端专属渲染组件与异步取数的组合方式。核对完再决定首屏内容是否放进 Suspense。

### 从学到用：落地路线

第 1 步试点：挑一个后台列表页加上 KeepAlive（配 max），在返回处打点。验收标准是改动前后各 10 次返回耗时都有记录，且能说明请求条数的变化来源。

第 2 步验证：录一次完整交互的 Performance trace，并用 PerformanceObserver 记录长任务。验收标准是列出的每条长任务都能对应到具体代码位置，或确认没有新增超过 50 毫秒的任务。

第 3 步推广：把组件契约（props、emits、expose）和组合式函数命名写成页面模板，在评审清单里加三条检查项。验收标准是新增页面组件都能在评审记录里找到这三项检查结果。

第 4 步防回退：把首屏体积与返回耗时接进持续集成，超过基线就告警。验收标准是基线由团队按自己的历史数据设定，每次改动都能在流水线输出里看到前后对比。

### 动手作业

**目标**：做一个"带筛选的用户列表加详情抽屉"的小项目，把 keep-alive、Teleport、defineProps / defineEmits / defineExpose 三组知识点各用上一次。

**步骤**：

1. 用 Vite 建一个 Vue 3 加 TypeScript 的项目，路由使用 Vue Router，创建命令的当前写法需核对官方文档。
2. 列表页用脚本生成 2000 条本地假数据，做筛选框与分页，不接后端服务。
3. 给列表页套 `<KeepAlive :max="3">`，在 onActivated 与 onDeactivated 里各打一行带时间戳的日志。
4. 详情用 Teleport to="body" 的抽屉实现，开关状态与内容由父组件通过 props 传入。
5. 抽屉保存成功后 emit 一个事件，父组件用 ref 调用列表页 expose 出来的 load 方法刷新。
6. 用 Performance 面板录一次"列表到抽屉再返回"的完整流程，导出 trace 文件。
7. 用 PerformanceObserver 监听 longtask，把条数与最长一条的时长打印到控制台。

**验收标准**：

- 从抽屉返回列表时，Network 面板中列表请求条数能说清是 1 还是 0，以及为什么。
- Elements 面板中抽屉的父节点是 body，而不是列表页容器。
- 列表页 expose 出来的是函数或只读值，父组件通过 ref 调用时能在类型提示里看到方法签名。
- 整个"列表到抽屉再返回"流程里，超过 50 毫秒的长任务要么为零，要么每条都能定位到对应代码。
- onActivated 与 onDeactivated 的日志条数与访问过的页面数对应，缓存实例数不超过 max 设置。

