---
title: 渲染与编译
description: Vue diff、patchFlag/Block Tree、模板编译与模板相对 JSX 的优势
---

# 渲染与编译

> 本页按「概念、原理、代码」逐题展开相关面试专题。

## 1. Vue diff 原理（patch策略 + 递归diff + key的重要性）

### 1.1 diff策略（同层比较）

| 节点操作 | 说明 |
|---------|------|
| div (same) | 同节点，diff children |
| p (same) | 同节点，diff children |
| span (moved) | 同节点，移动 |
| h1 (removed) | 不同节点，删除 |

**核心**：`updateChildren` 方法，4 指针头尾比较

Vue2 diff 核心：`updateChildren` 方法，4指针头尾比较

```
旧 children: [A, B, C, D]
新 children: [A, B, E, C]

指针: oldS=0(A) oldE=3(D)  newS=0(A) newE=2(C)

Step1: A vs A → same → 复用，oldS++, newS++
Step2: B vs B → same → 复用，oldS++, newS++
Step3: D vs E → patch → 复用但内容变，oldE--, newS++
Step4: C vs C → same → 复用，oldS++, newS++
Step5: E vs D → (尾部比较) → 移动
```

### 1.2 key 的重要性

```html
<!-- 没有 key: 所有节点 patch，但可能不移动 -->
<div v-for="item in items" :key="item.id">
  <!-- 正确：唯一标识，节点可复用 -->
</div>

<!-- 问题案例：没有 key 时，删除中间项 -->
<!-- items: [A, B, C] → [A, C] -->
<!-- 无key：patch比较，发现C内容匹配B标签，B标签被复用 -->
<!-- 有key：直接知道删除了B，效率更高 -->
```

**无 key 陷阱**：
```html
<!-- 计数器列表，不用key导致状态错位 -->
<div v-for="(item, index) in list" :key="index"> <!-- index作key危险 -->
  <input v-model="item.value" />
</div>
<!-- 列表前插入新项，index全部变化，DOM全部重新创建 -->
```

**有 key 优势**：
1. 精确匹配节点，最小化 DOM 操作
2. 列表重排时触发正确的 transition
3. 保持组件状态（如 input 焦点）

## 2. patchFlag 与 Block Tree

### 2.1 patchFlag（动态标记）

```javascript
// 编译器输出示例
const __sfc = {
  render(_ctx) {
    return _h('div', {
      class: 'static-class',  // 静态，无标记
      id: _ctx.dynamicId,      // 动态 → 需要 patchFlag
    }, [
      _h('span', 1 /* TEXT */, _ctx.msg),        // 文本动态
      _h('span', 8 /* CLASS */, _ctx.className), // CLASS 动态
    ])
  }
}
```

**patchFlag 标志位**：
| 标志 | 含义 |
|------|------|
| 1 | TEXT，仅文本内容变化 |
| 2 | CLASS，class 变化 |
| 4 | STYLE，style 变化 |
| 8 | PROPS，props 变化 |
| 16 | FULL_PROPS，所有 props 变化 |
| 32 | HYDRATE_EVENTS，事件绑定变化 |
| 64 | STABLE_FRAGMENT，fragment 子节点稳定 |

### 2.2 Block Tree（块树）

```javascript
// Vue3 编译器为每个 block 生成独立的 children 数组
// 只有 block 内的动态节点才需要 diff

// 模板:
<div>
  <h1>{{ title }}</h1>     <!-- 动态：patchFlag=1 -->
  <p>{{ desc }}</p>          <!-- 动态：patchFlag=1 -->
  <span>静态文本</span>       <!-- 静态：不在 diff 范围内 -->
</div>

// 编译后 block tree：
Block {
  dynamicChildren: [
    { type: 'span', patchFlag: 1, children: title },   // 只 diff 这些
    { type: 'p', patchFlag: 1, children: desc }
  ],
  children: [ /* 全部静态+动态节点 */ ]
}
// diff 时只遍历 dynamicChildren，O(动态节点数) 而非 O(总节点数)
```

### 2.3 静态提升（Static Hoisting）

```javascript
// Vue3 编译时提升到 render 函数外部，只创建一次

// 编译前：
<div>
  <span>静态文本</span>
  <p>{{ dynamic }}</p>
</div>

// 编译后（Vue3）：
const _hoisted_1 = _createElementVNode('span', null, '静态文本')
return function render(_ctx, _cache) {
  return _openBlock(), _createElementBlock('div', null, [
    _hoisted_1,                        // 复用，提升的静态节点
    _createElementVNode('p', null, _ctx.dynamic)  // 动态创建
  ])
}
```

## 3. Vue Compiler 原理（template → render函数 → VNode）

### 3.1 编译三阶段

| 阶段 | 输入 | 输出 | 说明 |
|------|------|------|------|
| 1. parse（解析） | template 字符串 | template AST | 正则匹配标签、属性、指令、插值表达式 |
| 2. transform（转换） | AST | 增强 AST | 插件化：v-if 三元表达式，v-for 循环函数 |
| 3. codegen（代码生成） | 增强 AST | render 函数代码字符串 | `new Function('with(this) { return ' + code)` |

**生成代码示例：**
```javascript
_c('div', { id: _ctx.id }, [
  _v(_toDisplayString(_ctx.msg))
])
```

### 3.2 AST 节点类型

```javascript
// 第 1 段：编译器输入 —— 原始模板
// 这是 Vue 模板的源码形态，下面那个对象是解析器输出的 AST。两者对照阅读，可以看清"文本 → 结构"的映射关系。
// div id="app">{{ message }}<span v-if="show">条件</span></div>
// 第 2 段：根节点骨架
// 解析结果用 type 作判别式（discriminated union）：type 决定这个节点后续还有哪些字段真正有意义，所以各节点字段并不齐整，消费时必须先看 type 再取字段。
{
  type: 'Element', // 节点类型共三种：Element(元素) / Interpolation(插值) / Text(纯文本)
  tag: 'div', // 标签名，仅 Element 持有；编译期靠它查内置指令、判断组件还是原生标签
  props: [{ type: 'Attribute', name: 'id', value: 'app' }], // 静态属性也统一收进 props 数组，且属性自身仍是带 type 的子节点，这样遍历/转换逻辑只需一套
  // 第 3 段：children —— 子节点按文档顺序平铺
  // 数组顺序即渲染顺序（插值在前、span 在后），无需额外索引字段。注意插值没有被降级成字符串，而是保留独立节点，以便后续做依赖收集与 diff。
  children: [
    { type: 'Interpolation', content: { content: 'message' } }, // 双层 content：外层是节点载荷，内层才是表达式源码；这样插值与 Text 的 content 语义不会互相污染
    // 第 4 段：带 v-if 的元素节点
    // 关键点：v-if 在解析阶段就已被"消费"，指令不会出现在 props 中，取而代之的是 branchIndex —— 把运行时判断前移成了编译期的结构信息。
    {
      type: 'Element', tag: 'span',
      props: [], // 用空数组而非 undefined/null，让消费者可以无条件访问 .props.length，省去判空分支
      children: [{ type: 'Text', content: '条件' }],
      branchIndex: 0, // 该节点在所属分支组中的下标：同位置连续的 v-if / v-else-if / v-else 会依次得到 0/1/2…，运行时据此只渲染其中一支
    }
  ]
}
```
### 3.3 render 函数执行 → VNode

```javascript
// 运行时生成的 render 函数
render() {
  return _c('div', { id: 'app' }, [
    _v(_toDisplayString(_ctx.message)),
    _ctx.show ? _c('span', null, [_v('条件')]) : _createEmptyVNode()
  ])
}

function _c(tag, data, children) {
  return createVNode(tag, data, children)
}
```

## 4. template 为什么比 JSX 更快

```
JSX: 所有组件调用都是动态的
     ↓
     每次 render 需要调用所有子组件函数
     → Virtual DOM diff 时才知道哪些变了
     → 无法预知哪些是动态的

Template: 编译时已知静态/动态边界
     ↓
     patchFlag 告诉运行时精确的动态类型
     block tree 只 diff 动态部分
     静态子树完全跳过 diff

性能差距来源：
  1. 编译期优化（patchFlag/静态提升）JSX 无法做到
  2. 运行时 diff 范围：template O(动态节点数)，JSX O(总节点数)
  3. 内存：JSX 每次创建新函数对象，template 更精简
```

JSX 的优势在于灵活性，template 的优势在于编译优化。Vue3 的 SFC（单文件组件）也支持 render 函数和 JSX，兼顾两边。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 官方文档](https://cn.vuejs.org/) | Vue 官方文档，系统讲解渲染机制与渲染函数，是理解编译与 diff 的起点。 | 读「渲染机制」「渲染函数 & JSX」两节，问：模板如何变成 VNode？读完画出编译流程图。 |
| [`<template>` HTML content template element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/template) | HTML 规范定义 template 元素，理解 Vue 模板编译的输入载体。 | 读属性与示例，问：template 内容为何默认不渲染？读完对比 Vue SFC 的 template 编译。 |
| [Template literals (Template strings)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) | 模板字符串规范，理解编译生成的 render 函数为何是字符串代码。 | 读标签模板与插值，问：编译器如何拼接 render 函数？尝试手写简单模板编译输出。 |
| [Writing Markup with JSX](https://react.dev/learn/writing-markup-with-jsx) | React 官方 JSX 写法教程，对比模板在编译期可静态分析的差异。 | 读 JSX 规则与表达式，问：JSX 为何难做模板级静态提升？读完列出 template 优势。 |
| [Render and Commit](https://react.dev/learn/render-and-commit) | React 渲染与提交流程，对比 Vue patch 的更新时机与粒度。 | 读 render 与 commit 两阶段，问：Vue 的 patchFlag 如何减少 diff 范围？读完对比流程。 |
| [Vue DevTools 文档](https://devtools.vuejs.org/) | Vue DevTools 文档，用工具观察组件更新与 key 变化对 patch 的影响。 | 安装后在项目改列表 key，用时间线与组件检查器观察复用，问：key 为何重要。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 核心源码仓库](https://github.com/vuejs/core) | Vue 核心源码仓库，可读 renderer 的 patch 策略与 block tree 实现。 | 读 packages/runtime-core/src/renderer.ts 的 patch 与 block，配合 compiler-core 看 patchFlag 生成。 |
| [ReactJSXElement.js](https://github.com/facebook/react/blob/main/packages/react/src/jsx/ReactJSXElement.js) | React JSX 元素工厂源码，查看 JSX 编译后的 VNode 结构。 | 读 ReactJSXElement.js 的创建流程，问：JSX 产物与 Vue h 函数有何异同？写完对比表。 |
| [preact](https://github.com/preactjs/preact) | Preact 极简 create-element 实现，快速理解 VNode 创建与 diff 基础。 | 读 create-element.js 与 diff 目录，问：key 在列表更新中如何影响复用？读完手写简化 diff。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 渲染机制](https://cn.vuejs.org/guide/extras/rendering-mechanism.html) | 系统讲解虚拟 DOM、编译优化与静态提升，直击本页核心概念。 | 读编译优化一节，在模板编译器演示站对照输出，问：patchFlag 与 Block Tree 如何生成。 |
| [React Compiler 介绍](https://react.dev/learn/react-compiler/introduction) | React 编译器介绍，对比编译期优化动机与 Vue 编译优化思路。 | 按文档启用编译器，对比 Profiler 重渲染次数，问：自动记忆化与 patchFlag 有何异同。 |
| [Solid](https://github.com/solidjs/solid) | Solid 细粒度响应式无需虚拟 DOM，反衬 diff 与编译优化的取舍。 | 读 README 与 packages/solid，问：为何 Solid 不需要 diff？读完写对比笔记。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理万行表格，行内有勾选与备注编辑 | key 的重要性、patchFlag、Block Tree | Vue 3 模板 + 分页或虚拟滚动 | key 用业务主键，不要用数组下标 |
| 低端安卓首屏营销页，正文旁挂一个图表 | 编译期静态提升、template 到 render 的产物 | Vue 3 + Vite 路由级代码分割 | 首屏主包不要带图表库；静态区块用 v-once |
| 多人协作白板，一局笔迹点以万计 | 递归 diff 成本、VNode 创建开销 | Vue 3 shallowRef + canvas 重绘 | 笔迹点不要放进深层响应式 |
| 拖拽式表单设计器，字段几百个 | Block Tree、patchFlag、v-memo | Vue 3 + v-memo | v-memo 依赖数组要写全，漏项会停在旧值 |
| 聊天消息流，历史消息上千条 | 列表 diff 与 key | Vue 3 + 虚拟滚动 + 稳定 key | key 用消息 id；加载历史时保持滚动锚点 |
| 数据大屏，定时器每秒刷数字 | 静态提升与 patchFlag | Vue 3 + v-once 静态图层 | 数字节点单独成块，别让整屏进 diff |
| 微前端里的子应用，宿主与子应用各带一份 runtime | 递归 diff 的边界、Block Tree 作用域 | Vue 3 createApp 独立挂载 | 两份 runtime 要版本一致，不要跨实例复用 VNode |
| SSR 内容站首屏，正文长、交互少 | template 到 render 的编译产物、静态提升 | Vue 3 SSR 或 SSG | 两端模板同源，否则 hydration 报错 |

### 三个场景拆解

#### 场景 1：后台管理万行表格的行内编辑

**业务背景**：运营后台订单表默认 200 行一页，每行有勾选、改状态、改备注三个入口。用户连续改多行时输入框丢焦、整表闪一下，录制一次连续改 10 行的操作就能复现。

**怎么用本页知识解决**：先确认哪些节点是动态绑定，再把更新范围收到命中那一行，让 diff 只走这一行。

```vue
<script setup>
import { shallowRef } from 'vue'
// shallowRef：只跟踪数组引用，行对象不被逐个代理
const rows = shallowRef([])

// 只替换命中行，其余行保持同一对象引用
function updateRow(id, patch) {
  const next = rows.value.slice()      // 浅复制一层
  const i = next.findIndex(r => r.id === id)
  next[i] = { ...next[i], ...patch }
  rows.value = next                    // 唯一触发点
}
</script>
<template>
  <!-- v-memo 依赖不变时跳过该行子树比对 -->
  <tr v-for="row in rows" :key="row.id" v-memo="[row.checked, row.remark]">
    <td>{{ row.name }}</td>
    <td>{{ row.remark }}</td>
  </tr>
</template>
```

- `:key="row.id"` 让行组件按主键复用，排序或筛选后焦点与滚动位置跟着那一行走。
- `shallowRef` 把触发点收敛到赋值那一行，编译产物里的动态子节点只比对一次。
- `v-memo` 依赖数组漏写字段时，界面会停在旧值，写完要逐字段试一遍。
- 提交只走 `updateRow`，未命中的行引用不变，配合 memo 收窄比对范围。

**怎么度量收益**：Chrome DevTools Performance 面板录制 10 次连续提交，看 Scripting 与 Recalculate Style 两段总时长；在 `updateRow` 前后用 `performance.mark` 与 `performance.measure` 打点，统计单次提交到渲染完成的耗时分布。同一构建产物、同一台测试机重复 5 次取中位数。

**什么时候不该用**：
- 一页只渲染 20 行、每次交互只改 1 行时，shallowRef 与 v-memo 带来的写法约束换不来可测收益。
- 团队还没统一行的不可变更新写法时，先补数据层约定，再加 memo，否则会出现行内容不刷新。

#### 场景 2：低端安卓上的首屏营销页

**业务背景**：营销页在低端安卓上打开，标题要等图表库下载并解析完才出现。同一台设备、同一档网络节流，录制三次首屏即可复现。

**怎么用本页知识解决**：把不会变的区块交给编译器静态化，把重组件挪出首屏主包。

```vue
<script setup>
import { defineAsyncComponent } from 'vue'
// 图表组件拆成独立 chunk，首屏主包不含它
const ChartPanel = defineAsyncComponent(() => import('./ChartPanel.vue'))
const showChart = ref(false)
</script>
<template>
  <!-- v-once：首次挂载后进静态块，后续更新不进 diff 队列 -->
  <header v-once>
    <SiteNav />
    <SearchBox />
  </header>
  <ChartPanel v-if="showChart" />
</template>
```

- `v-once` 让头部在首次挂载后不再参与比对，改的是渲染队列长度。
- `defineAsyncComponent` 把图表页拆成独立 chunk，首屏解析的代码里没有它。
- `v-if` 控制创建时机，由数据决定挂载，不由下载完成决定。
- 模板里的静态文本在编译期被提到 render 函数外，重复渲染复用同一批 VNode。

**怎么度量收益**：Lighthouse 移动端 preset 的 LCP 与 TBT，对比改动前后同一构建产物；Chrome DevTools Performance 火焰图里主线程 Scripting 段长度，录制时打开 CPU 4x 节流；用 `PerformanceObserver` 监听 `longtask`，统计首屏期间超过 50ms 的任务条数。

**什么时候不该用**：
- 首屏本身就是图表页时，异步拆分只多一次请求往返，图表直接放主包并按需初始化更合适。
- 页面走 SSR 且服务端已输出该区块时，`v-once` 在两端要一致，需核对官方文档：编译器对 v-once 的 SSR 处理与 hydration 校验规则。

#### 场景 3：多人协作白板的高频笔迹

**业务背景**：白板一局 10 分钟，笔迹点累计到几万，画布上还有光标与其他协作者位置。每个点写进 reactive 数组后，每次 pointermove 触发深层遍历，用录屏回放笔迹就能看到掉帧。

**怎么用本页知识解决**：让高频数据离开响应式深层追踪，VNode 树只保留低频节点。

```js
import { shallowRef, triggerRef } from 'vue'
// 笔迹是 {x, y, color} 的数组，元素上万
const strokes = shallowRef([])

function onPointerMove(pt) {
  const last = strokes.value[strokes.value.length - 1]
  last.points.push(pt)   // 直接改内部数组，不生成新的代理对象
  triggerRef(strokes)    // 手动通知一次，由画布层决定重绘范围
}
// 工具栏与参与者列表照常走模板，笔迹只走 canvas
```

- `shallowRef` 只跟踪数组引用，省掉每个点的 Proxy 创建开销。
- 更新通知收敛到 `triggerRef` 调用点，重绘矩形由画布层按脏区算。
- VNode 树里只有工具栏这类低频节点，diff 范围与点数无关。
- 回放按时间戳切片读同一份数组重绘，不依赖组件状态。

**怎么度量收益**：Chrome DevTools Performance 录制 10 秒连续书写，看帧间隔与长任务条数；在 `requestAnimationFrame` 回调里统计两次绘制间隔，取第 95 百分位；用 Vue Devtools 看组件更新次数，需核对官方文档：当前版本是否提供组件渲染耗时面板及其口径。

**什么时候不该用**：
- 白板节点只有几百个且需要模板双向绑定与 Devtools 追踪时，绕开响应式会断掉调试路径。
- 需要把每步操作作为不可变快照上传做协同合并时，直接改内部数组会破坏快照语义，应改为生成新数组。

### 行业先进实践

编译期标记动态节点（出处：Vue 官方文档《渲染机制》与《渲染函数》章节）：模板编译时给动态绑定打 patchFlag，并把动态节点收进 Block，diff 时按标记定位。项目里可把高频列表页按此思路拆成小块，先确认团队使用的 Vue 版本支持 Block Tree。

v-memo 做行级跳过（出处：Vue 官方文档 v-memo 章节）：依赖数组不变时跳过子树比对，适合行内容大部分稳定的表格。落地时把依赖写成该行参与渲染的字段全集，并逐字段验证更新可见。

编译期静态与动态分离（出处：Million.js 开源项目）：该项目把模板拆成静态骨架与动态插槽，运行时只更新动态部分。Vue 项目不直接使用它，但可借用这个拆分视角，先给列表页划出静态区域。需核对官方文档：该仓库当前的框架支持范围与维护状态。

在真实 DOM 上挂标记做原地比对（出处：Google 开源项目 incremental-dom）：它不保留完整 VNode 树，直接在 DOM 节点上存数据做比对，适合内存受限设备。Vue 生态不采用这套实现，可作为估算 diff 内存成本的参照。接入前需核对官方文档：该项目的维护状态与浏览器支持。

Vapor Mode 编译策略（需核对官方文档：可用状态、对现有 SFC 语法的兼容范围、与现有组件库的混用方式、迁移路径）：若可用，它把响应式绑定直接编译成 DOM 操作，省掉 VNode 这一层；在团队内推广前先核对版本与生态兼容性。

### 从学到用：落地路线

第 1 步，试点：挑一个行内编辑频繁的表单页，只改 key 与数据更新方式，不动模板结构。验收：连续改 10 行不丢焦点，性能录制里 Scripting 段不随行数线性增长。

第 2 步，验证：在试点页加 v-memo 与浅响应容器，用同一构建产物做前后对比录制。验收：单次提交到渲染完成的 `performance.measure` 中位数下降，且原有功能用例全通过。

第 3 步，推广：把行级更新约定写进代码规范与 review 清单，新列表页默认用业务主键做 key。验收：规范合入主干，抽查 5 个新页面 key 写法全部合规。

第 4 步，防回退：在 CI 里加静态检查，拦掉 `v-for` 用数组下标做 key 的写法，并对高频列表页跑一次 Lighthouse 记基线。验收：检查失败阻断合并，基线在每次发版前更新。

### 动手作业

**目标**：做一个 500 行的可编辑表格，行内有勾选、改状态、改备注，底部显示已勾选数量。用本页知识把行内编辑的渲染范围收窄到命中行。

**步骤**：
1. 用 Vue 3 + Vite 建页面，生成 500 行假数据，字段为 id、name、status、remark、checked。
2. 第一版用 `reactive([])` 存行、下标做 key，连续改 10 行备注，记录丢焦次数。
3. 第二版改成业务主键做 key，写一个只替换命中行的 `updateRow`，重跑同一操作。
4. 第三版把行数据放进 `shallowRef`，每次提交赋新数组，重跑同一操作。
5. 第四版给行加 `v-memo`，依赖写 `[row.checked, row.remark]`，重跑同一操作。
6. 用 Chrome DevTools Performance 分别录制四版的操作过程，把 Scripting 段时长列成表。
7. 写 README，说明每版改动对应本页哪个知识点，以及哪一版留在项目里。

**验收标准**：
- 连续改 10 行备注，输入框焦点不丢，已勾选数量始终正确。
- 四版录制的 Scripting 段时长有可复现的差异，测量设备、节流档位、录制次数都写在 README 里。
- `v-memo` 依赖覆盖该行所有参与渲染的字段，改 remark 与 checked 都能看到界面更新。
- 本地脚本或 CI 能报出下标 key 的写法。
- README 里不出现未验证的结论，所有时间数字都标注测量条件。

