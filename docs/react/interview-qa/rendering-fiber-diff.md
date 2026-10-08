---
title: 虚拟 DOM、Fiber 与 Diff
description: 虚拟 DOM、Fiber、Diff 算法、key 与 Lane 调度相关面试题
---

# 虚拟 DOM、Fiber 与 Diff

> 本页按「概念、原理、代码」逐题展开相关面试专题。

## 1. React为什么出现与虚拟DOM

### 1.1 为什么需要React

```javascript
// 原生DOM操作的问题:
const container = document.getElementById('root');
const list = ['苹果', '香蕉', '橘子'];
const ul = document.createElement('ul');
list.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item;
  ul.appendChild(li);
});
container.appendChild(ul);
// 数据变化时: 需要精确知道哪些DOM要更新 → 极难维护
```

**React的核心思想：** UI = f(state)，用声明式编程替代命令式DOM操作：

```jsx
// React: 描述"UI应该是什么样"
function FruitList({ fruits }) {
  return (
    <ul>
      {fruits.map(fruit => (
        <li key={fruit.id}>{fruit.name}</li>
      ))}
    </ul>
  );
}
// 数据变化时 → 重新调用函数 → React自动计算差异并更新DOM
```

### 1.2 虚拟DOM

```
虚拟DOM的本质: 用JS对象描述真实DOM结构

真实DOM:
  <div class="container"><h1>Hello</h1></div>

虚拟DOM (JS对象):
  { type: 'div', props: { className: 'container', children: [
    { type: 'h1', props: { children: 'Hello' } }
  ]}}

React渲染流程:
  JSX → React.createElement() → 虚拟DOM对象
    → 旧虚拟DOM树 vs 新虚拟DOM树 → React Diff算法 → 最小化DOM操作
```

**虚拟DOM的优势：**

1. 跨平台: React Native用同一套虚拟DOM渲染原生组件
2. 声明式: 开发体验好,无需手动追踪更新
3. 批量更新: 多个setState只触发一次渲染
4. 函数式: 纯函数,易于测试和推理

## 2. Fiber架构

### 2.1 为什么需要Fiber

React 15的Stack Reconciler存在致命问题：**同步递归无法中断**：

```
React 15协调器的问题:
  用户点击 → setState
    → React开始递归调和(reconcile), 10000个组件 → 100ms+
    → 期间无法响应用户输入/动画 → 页面卡顿 (jank)
```

Fiber的核心目标：**将协调过程拆分为可中断的工作单元**。

### 2.2 Fiber节点数据结构

```javascript
function FiberNode(tag, pendingProps, key, mode) {
  // 节点标识
  this.tag = tag;           // FunctionComponent/ClassComponent/...
  this.key = key;
  this.type = null;         // div/button/MyComponent
  this.stateNode = null;    // 真实DOM节点或组件实例

  // Fiber树链 (双向链表)
  this.return = null;     // 父Fiber
  this.child = null;       // 第一个子Fiber
  this.sibling = null;     // 下一个兄弟Fiber

  // 状态
  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.memoizedState = null; // 组件内部状态(Hooks链表)

  // 优先级与调度
  this.lanes = 0;            // 任务优先级
  this.alternate = null;     // 双缓冲: 另一个版本的Fiber
}
```

**Fiber树结构（双缓冲）：**

| 阶段 | 说明 |
|------|------|
| current tree | 已渲染，显示中 |
| setState | 触发更新 |
| workInProgress tree | 构建中 |
| 切换 | 构建完成后 alternate 指针切换，current = workInProgress（原子性替换） |

**Fiber 双缓冲优势：**

1. 屏幕上始终展示完整的旧树，没有半成品状态
2. 新树构建完成后再一次性替换，更新原子化
3. 通过 `alternate` 指针实现 O(1) 的树切换

### 2.3 Work Loop (可中断的协调)

```javascript
function workLoop(deadline) {
  // 是否应让出控制权给浏览器
  while (nextUnitOfWork && deadline.timeRemaining() > 0) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // 处理完一个Fiber后检查: 剩余时间够吗?
    // 不够 → 停止,让出主线程
  }

  if (nextUnitOfWork) {
    requestIdleCallback(workLoop); // 空闲时继续
  } else {
    commitRoot(); // 全部完成,提交
  }
}

function performUnitOfWork(fiber) {
  // 1. 创建/更新DOM节点
  // 2. 为每个子Fiber创建工作(建立链表)
  // 3. 返回下一个待处理的Fiber:
  // child → sibling → return.sibling → 回溯
}
```

**Fiber双缓冲优势：**

1. 屏幕上始终展示完整的旧树，没有半成品状态
2. 新树构建完成后再一次性替换，更新原子化
3. 通过`alternate`指针实现O(1)的树切换

## 3. React Diff算法

React Diff是Fiber架构的"协调"阶段，通过比较新旧虚拟DOM树找出最小更新集合。

### 3.1 三大策略

| 策略 | 说明 |
|------|------|
| Tree Diff | DOM 节点跨层级操作很少，只同层比较，O(n) 算法 |
| Component Diff | 不同类型的元素产生不同树，类型不同则卸载重建 |
| Element Diff | 通过 key 标记稳定元素，支持移动/新增/删除 |

**React Diff 三大核心前提：**

1. Web DOM 节点跨层级操作很少（tree diff 用 O(n) 算法）
2. 不同类型的元素产生不同树（component diff）
3. 通过 key 标记稳定元素（element diff）

### 3.2 Tree Diff

```
策略: 同层比较,不同则删除该层及以下所有节点

旧树: A→B→C → 新树: A→D→C
  1. 比较A(相同,保留)
  2. 比较B vs D (不同类型) → 卸载B,C → 创建D
  3. 创建C (挂到D下)

跨层级移动代价高 → 同层移动只需sibling指针调整
```

### 3.3 Component Diff

```
策略: 同一层级比较组件类型
  类型相同 → diff该组件
  类型不同 → 卸载旧组件树 → 挂载新组件树

注意: PureComponent/React.memo可优化diff效率
React会先比较props,相同则跳过render
```

### 3.4 Element Diff

```javascript
// 无key: O(n²), 所有元素被标记为移动
[A, B, C] → [A, C, B]  →  B和C都被标记为移动到新位置

// 有key: O(n), 精确识别新增/删除/移动
keys: 1(A),2(B),3(C) → 1(A),3(C),2(B)
  1(A) vs 1(A) → 复用 ✓
  2(B) vs 3(C) → 删除B,创建C
  3(C) vs 2(B) → 不存在 → 已处理
  // C被复用(只移动),B被删除并重建
```

## 4. 为什么key不能用index

```jsx
// key=index: 删除中间项时,index对应的元素变了
// items=[A,B,C] key=[0,1,2]
// 删除A后: items=[B,C] key=[0,1]
// React diff:
// key=0: B vs A → 内容变了 → UPDATE (应为DELETE!)
// key=1: C vs B → 内容变了 → UPDATE (应为复用!)
// 总共2次UPDATE而不是1次DELETE+1次复用

// 有局部状态时更严重:
// items=[A,B,C] input值=[A,B,C]
// 删除A后: items=[B,C] → input值错位为[B,C]!

// key=id: 精确追踪元素
// items=[{id:1,A},{id:2,B},{id:3,C}]
// 删除id=1后: React精确识别 → 1次DELETE,2次复用
```

## 5. React调度机制与Lane模型

### 5.1 Lane模型

**32位bit表示优先级（位运算：O(1)）：**

| Lane | 说明 |
|------|------|
| SyncLane | 同步最高（用户点击） |
| InputContinuousLane | 拖拽/滚动 |
| DefaultLane | 普通 setState |
| TransitionLane | 低优先级（useTransition） |
| IdleLane | 空闲最低 |

**位运算优势：**

- `lanes = laneA | laneB`：标记多个优先级
- `(lanes & lane) > 0`：冲突检测
- `lanes &= ~lane`：清除已处理车道

**调度流程：**

1. setState() 分配 lane → root.pendingLanes
2. scheduler.scheduleCallback(priority, callback)
3. 等待主线程空闲时执行
4. 高优先级插队：用户点击（SyncLane）可打断 DefaultLane
5. 先处理 SyncLane，完成后恢复 DefaultLane

**useTransition 示例：**
```javascript
startTransition(() => setCount(1000));
// setCount 标记为 TransitionLane（低优先级，可被打断）
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [React 官方文档](https://react.dev/) | React 官方入口，权威且持续更新，适合打基础。 | 从 Quick Start 做起，边读边在页内沙盒改代码，理解虚拟 DOM 角色。 |
| [React API 参考](https://react.dev/reference/react) | API 参考，查调度相关 Hook 的 Caveats 与 Troubleshooting。 | 遇到不熟的 Hook 先查此页，只读 Caveats 与 Troubleshooting 两节。 |
| [useTransition](https://react.dev/reference/react/useTransition) | useTransition 体现并发调度，理解 Lane 模型的应用。 | 读用法与 Caveats，重点看 startTransition 如何标记非紧急更新。 |
| [useDeferredValue](https://react.dev/reference/react/useDeferredValue) | useDeferredValue 展示延迟更新，与调度优先级相关。 | 读用法与注意事项，对比 useTransition，理解调度优先级。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Build Your Own React](https://pomb.us/build-your-own-react/) | 手写简化版 React，直观理解 Fiber、协调与调度。 | 跟着实现到 Fiber 章节，重点看 render 与 commit 阶段，再对比官方源码。 |
| [Solid](https://github.com/solidjs/solid) | 对比 Solid 细粒度响应式，理解虚拟 DOM 的取舍。 | 读 README 与 packages/solid 目录，问为何不需要虚拟 DOM，写对比笔记。 |
| [React 源码仓库](https://github.com/facebook/react) | 直接阅读 Reconciler 源码，深入 Fiber 与 Lane 模型实现。 | 从 packages/react-reconciler 的 beginWork 与 completeWork 读起，配合断点调试。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [React Fiber 架构笔记](https://github.com/acdlite/react-fiber-architecture) | 系统梳理 Fiber 架构与 work loop，适合理解调度机制。 | 通读后对照 Build Your Own React 的 Fiber 章节，亲手画出 work loop 流程图。 |
| [Vue 渲染机制](https://cn.vuejs.org/guide/extras/rendering-mechanism.html) | 讲解虚拟 DOM、编译优化与 diff，帮助理解 key 的作用。 | 重点读 diff 与静态提升部分，在模板编译器演示站对照输出。 |
| [Overreacted：React as a UI Runtime](https://overreacted.io/react-as-a-ui-runtime/) | 从运行时角度理解 React 的调度与更新机制。 | 分段读，每读完一节用一句话复述 React 做了什么，再画调度流程图。 |
| [Josh Comeau：常见初学者错误](https://www.joshwcomeau.com/react/common-beginner-mistakes/) | 常见错误清单，很可能涵盖 key 用 index 的问题。 | 对照清单检查自己代码里的 key 写法，找出用 index 的场景并修复。 |
| [Solid 交互式教程](https://www.solidjs.com/tutorial/introduction_basics) | 交互式对比 React 与 Solid 的状态更新方式。 | 做完 Reactivity 小节，对比 React 的 state 更新，记录差异。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格 | key 不能用 index、React Diff 同层比较 | 窗口化渲染库 + 后端主键 | 排序后 index 全变，用 index 作 key 会把输入框内容留在原位置 |
| 低端安卓的首屏加载 | Fiber 可中断渲染、Lane 优先级 | 路由级代码分割 + transition 更新 | 首屏需要的模块不要拆包，否则多一轮请求瀑布 |
| 多人协作白板 | 虚拟 DOM 的批处理、Diff 最小化 | canvas 绘制 + React 管工具栏 | 指针轨迹不要进 React 状态，否则每个事件排一次更新 |
| 聊天消息流的反向加载 | key 稳定性、Diff 复用节点 | 稳定消息 id 作 key | 用 index 作 key 时向上翻页会让整列状态错位 |
| 搜索框实时联想 | Lane 优先级、可中断渲染 | useDeferredValue 或 transition | 输入框本身的状态不能降级，否则光标位置会跳 |
| 表单超长页面的联动校验 | 虚拟 DOM 批量更新、状态位置 | 状态下沉到字段组件 | 状态提到顶层会让一处输入触发整页 Diff |
| 监控大屏的秒级刷新 | Diff 成本与 reconcile 开销 | 只替换数据切片 | 每次刷新重建整棵配置树，比更新数值慢一个量级 |
| 富文本编辑器的撤销重做 | key 与组件身份绑定 | 文档版本号控制重挂载 | 用 index 作 key 时撤销会把节点状态串到别的段落 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：运营后台的订单表默认按时间倒序，行数在万级，运营会连续点表头排序、按状态筛选、在某行备注框里填字。痛点是排序之后备注框里的半截文字跑到了别的行上。

**怎么用本页知识解决**：先把 key 换成数据主键，让排序、删除后 React 仍按身份复用节点；再把可视区以外的行裁掉，让一次提交只比较窗口内的行。

```jsx
const rows = useMemo(
  // 排序在渲染前完成，React 只处理排序结果的 Diff
  () => [...data].sort((a, b) => a[sortKey] - b[sortKey]),
  [data, sortKey]
);

return (
  <div style={{ height: ROW_H * rows.length, position: 'relative' }}>
    {rows.slice(startIndex, startIndex + WINDOW).map((row, i) => (
      // row.id 来自后端主键，排序后节点身份不变
      <Row key={row.id} style={{ top: (startIndex + i) * ROW_H }} data={row} />
    ))}
  </div>
);
```

- key 用 `row.id`：排序或删除后 React 按身份匹配节点，备注框里的未提交内容跟着数据行走。
- `slice` 窗口：commit 阶段比较的节点数由窗口大小决定，与总行数无关。
- 绝对定位的 `top` 由下标算出，位置变化不改变组件身份。
- 滚动位置先写进 ref，节流后再 setState，避免每个滚动事件排一次更新。

**怎么度量收益**：用 React DevTools Profiler 记录该页一次排序的 commit 时长，用 Chrome DevTools Performance 面板看 Layout 与 Recalculate Style 的耗时，再用 PerformanceObserver 订阅 `longtask` 看滚动时是否还有超过 50ms 的任务。

**什么时候不该用**：表格要整表导出成图片或直接打印，虚拟化后打印会缺行。行高不固定且依赖内容撑开，窗口化前必须先测量每行高度，测量成本可能高于收益。需要浏览器原生 Ctrl+F 查找行内文字时，被裁掉的行找不到。

#### 场景 2：低端安卓的首屏加载

**业务背景**：面向线下门店的 H5 页面，用户设备以千元安卓机为主，首屏包含一个数据报表入口。痛点是点击入口后页面卡住一两秒才出现内容，输入和点击都没有反馈。

**怎么用本页知识解决**：把报表模块拆成独立 chunk 延迟加载，把切换动作标记为可中断更新，让 Fiber 在渲染报表时把主线程让给点击反馈。

```jsx
// 首屏只加载必要模块，报表模块在需要时再取
const Report = React.lazy(() => import('./Report'));

function App() {
  const [tab, setTab] = React.useState('home');

  function selectTab(next) {
    // 标为 transition，Lane 模型把它当低优先级更新处理
    React.startTransition(() => setTab(next));
  }

  return (
    <>
      <TabBar onSelect={selectTab} />
      {/* 模块未到时先渲染占位，父组件不整体挂起 */}
      <React.Suspense fallback={<Skeleton />}>
        {tab === 'report' ? <Report /> : <Home />}
      </React.Suspense>
    </>
  );
}
```

- `React.lazy` 把报表代码切到独立文件，首屏要解析的 JS 减少。
- `startTransition` 让 tab 切换可被打断，用户点击时高优先级更新先执行。
- `Suspense` 只接管子树，TabBar 保持可交互，加载期间点击不会丢失。
- 首屏自身需要的模块保留在入口 chunk 里，避免多一层请求。

**怎么度量收益**：用 Lighthouse 看 FCP 与 Total Blocking Time，用 web-vitals 采集 LCP、INP、CLS，用 Performance 面板确认长任务被切成小于 50ms 的片段。

**什么时候不该用**：首屏主要内容就在被拆的模块里，延迟加载会把一次请求变两次，首屏可见时间推后。页面只在 Wi-Fi 环境打开且模块体积小，拆包带来的请求开销大于并行解析的收益。

#### 场景 3：多人协作白板

**业务背景**：白板支持多人同时画线、拖动图形、撤销重做，一帧内可能有几十个指针事件。痛点是画笔跟着手指走的时候会掉帧，撤销时个别图形样式错乱。

**怎么用本页知识解决**：把指针轨迹这类高频数据留在 React 之外，React 只管理工具栏和图层面板；图形用 id 作 key，撤销通过版本号让订阅组件重新取快照。

```jsx
const strokeRef = React.useRef([]);

function onPointerMove(e) {
  strokeRef.current.push({ x: e.clientX, y: e.clientY });
  // 直接画到 canvas，不进入虚拟 DOM 的比较与提交流程
  ctx.lineTo(e.clientX, e.clientY);
  ctx.stroke();
}

// 工具栏这类低频节点仍交给 React 管理
return <Toolbar onUndo={() => setVersion((v) => v + 1)} />;
```

- 高频数据放 ref，不触发 re-render，Fiber 不为每个指针事件排队。
- canvas 承担绘制，React 只负责工具栏、图层面板这些低频节点。
- 图形列表的 key 用图形 id，删除与层级调整后身份不变。
- 撤销改版本号让组件重取快照，而不是回放每个坐标点。

**怎么度量收益**：在 Performance 面板看 `onPointerMove` 的调用时长与每秒提交次数，用 `requestAnimationFrame` 记录相邻帧间隔，用 Profiler 数 commit 次数。

**什么时候不该用**：图形数量在几十个以内且需要 DOM 文本编辑能力，改用 DOM 加 React 状态实现成本低。图形需要被屏幕阅读器逐个读取时，纯 canvas 要额外补一套可访问结构。

### 行业先进实践

**用稳定 key 表达列表项身份（出处：React 官方文档 Rendering Lists）**。文档说明 key 用于告诉 React 每一项是谁，并指出用下标作 key 在插入、排序时会导致状态错位。借鉴方式是把它写进代码评审清单，遇到列表先问 key 从哪来。

**用 Profiler 定位重渲染热点（出处：React 官方文档 Profiler API）**。`<Profiler>` 的 `onRender` 回调提供 `actualDuration`、`baseDuration`、`commitTime` 等字段，Profiler 面板把这些数据画成火焰图。借鉴方式是在列表页外层包一层 Profiler，把 commit 时长打点上报。

**长列表窗口化渲染（出处：开源项目 react-window、TanStack Virtual）**。两者只挂载可视区域附近的行，把 DOM 节点数与总行数解耦。借鉴方式是先治理 key 再引入窗口化，否则节点复用被 key 破坏，收益会被抵消。

**区分紧急与非紧急更新（出处：React 官方文档 useTransition、React v18.0 官方博客）**。`startTransition` 把更新标为 transition，Fiber 在时间切片里先处理输入与点击。借鉴方式是把筛选、切 Tab 这类可等待的动作放进 transition，输入框保持默认优先级。

**观测长任务与 INP（出处：web.dev 官方文档、开源项目 web-vitals）**。Long Tasks API 报告超过 50ms 的主线程任务，web-vitals 把 INP 拆到具体交互上。借鉴方式是把 INP 按页面上报，与 Profiler 的 commit 时长对照，定位是渲染还是事件处理拖慢了响应。

### 从学到用：落地路线

第 1 步，挑一个列表页试点：选行数最多、排序最频繁的后台页面，先量基线再动代码。验收标准是 Profiler 里该页一次排序的 commit 时长有记录。

第 2 步，做对照验证：同一页做顶部插入、整列倒序、中间删除三组操作，分别记录改 key 前后的 commit 时长。验收标准是三组操作的 before/after 数据齐全，备注框错位不再出现。

第 3 步，按模板推广：把 key 规则和窗口化写法做成可复制片段，分批次替换其他列表页。验收标准是规范文档里有片段，试点页之外的页面按同一模板改完。

第 4 步，防回退：在 CI 里加静态检查与性能门槛。验收标准是 eslint-plugin-react 的 `react/no-array-index-key` 规则拦住 `key={index}` 写法，性能脚本在 commit 时长超出基线时让流水线失败。

### 动手作业

**目标**：做一个行数可调的列表页，用实测数据说明 key 的选择和窗口化各自影响哪一段耗时。

**步骤**：

1. 搭一个 React 页面，数据用本地生成的 1 万行对象，每行带稳定 id 与几个数值字段。
2. 每行放一个受控输入框，用来观察排序后状态是否错位。
3. 第一版用 index 作 key，分别做顶部插入一行、按某列倒序、删除中间一行，记录每次 commit 时长。
4. 改为用 id 作 key，重复同样三组操作并记录数据。
5. 加入窗口化渲染，只挂载可视区域附近的行，再记录一组数据。
6. 用 React DevTools Profiler 与 Performance 面板各测一遍，把结果填进同一张对比表。
7. 写一页结论，说明哪一步带来的变化最大，以及在什么条件下不值得引入窗口化。

**验收标准**：

- 三组操作在 index 与 id 两种 key 下的 commit 时长都有记录。
- 能指出输入框内容错位出现在哪一组操作里，并说明与 key 的关系。
- 总行数从 1 万改到 10 万时，窗口化版本的 commit 时长不随总行数成比例增长。
- 结论页给出一条不引入窗口化的判断依据。
- 代码里没有 `key={index}` 的写法，检查规则能拦住它。

