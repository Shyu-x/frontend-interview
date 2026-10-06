---
title: 框架原理手写
description: 手写虚拟 DOM 与 diff、React useState 简化版以及 Hash 模式前端路由。
tags:
  - coding
  - interview
  - framework
date: 2026-05-17
---

# 框架原理手写

## 1. 手写虚拟 DOM 和 diff

```javascript
// 虚拟DOM：h函数创建vnode + patch打补丁 + diff简化版

// h函数：创建虚拟节点
function h(tag, props = {}, children = []) {
  return { tag, props, children };
}

// patch：对比新旧vnode，打补丁
function patch(oldVnode, newVnode) {
  if (oldVnode.tag !== newVnode.tag) {
    // 标签不同，直接替换
    const oldEl = oldVnode.el;
    const newEl = createElement(newVnode);
    oldEl.parentNode.replaceChild(newEl, oldEl);
    return newEl;
  }

  // 相同标签：比较props
  const el = oldVnode.el;
  newVnode.el = el;

  // 更新props
  updateProps(el, oldVnode.props, newVnode.props);

  // diff children
  patchChildren(el, oldVnode.children, newVnode.children);

  return el;
}

function patchChildren(el, oldChildren, newChildren) {
  const oldLen = oldChildren.length;
  const newLen = newChildren.length;
  const minLen = Math.min(oldLen, newLen);

  // 更新前面的（复用节点）
  for (let i = 0; i < minLen; i++) {
    patch(oldChildren[i], newChildren[i]);
  }

  // 新children更长：新增
  if (newLen > oldLen) {
    for (let i = oldLen; i < newLen; i++) {
      el.appendChild(createElement(newChildren[i]));
    }
  }
  // 旧children更长：删除
  else if (newLen < oldLen) {
    for (let i = minLen; i < oldLen; i++) {
      el.removeChild(oldChildren[i].el);
    }
  }
}

function updateProps(el, oldProps, newProps) {
  // 移除旧的props
  for (const key of Object.keys(oldProps)) {
    if (!newProps[key]) el.removeAttribute(key);
  }
  // 设置新的props
  for (const key of Object.keys(newProps)) {
    if (el[key] !== newProps[key]) el[key] = newProps[key];
  }
}

function createElement(vnode) {
  const el = document.createElement(vnode.tag);
  vnode.el = el;
  // 设置props
  updateProps(el, {}, vnode.props);
  // 递归创建子节点
  vnode.children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(createElement(child));
    }
  });
  return el;
}

// render函数：把vnode渲染到container
function render(vnode, container) {
  container.appendChild(createElement(vnode));
}

// 测试：
const vnode1 = h('div', { class: 'container' }, [
  h('h1', {}, ['Hello']),
  h('p', {}, ['Virtual DOM'])
]);

const vnode2 = h('div', { class: 'wrapper' }, [
  h('h1', {}, ['Hello World']),
  h('p', {}, ['Updated content']),
  h('span', {}, ['New element'])
]);

// 模拟diff：直接patch根节点
const container = document.getElementById('app');
render(vnode1, container);
patch(vnode1, vnode2); // diff更新
```

## 2. 手写 React useState 简化版

```javascript
// 手写useState：React Hooks简化版（渲染驱动更新）

let isRendering = false;
let currentlyRenderingFiber = null;
let workInProgressHook = null;

function useState(initial) {
  // 获取当前hook
  const hook = currentlyRenderingFiber.memoizedState;

  if (hook !== null) {
    // 不是首次渲染，返回当前状态
    return [hook.memoizedState, (action) => {
      hook.memoizedState = typeof action === 'function'
        ? action(hook.memoizedState)
        : action;
      // 触发重新渲染
      currentlyRenderingFiber.sibling = null;
      schedule(); // 模拟React的调度
    }];
  }

  // 首次渲染：初始化state
  hook.memoizedState = initial;

  const setState = (action) => {
    hook.memoizedState = typeof action === 'function'
      ? action(hook.memoizedState)
      : action;
    schedule();
  };

  return [hook.memoizedState, setState];
}

// Fiber节点
function createFiber(vnode) {
  return {
    type: vnode.tag,
    props: vnode.props,
    child: null,
    sibling: null,
    memoizedState: null, // hooks链表
    stateNode: createDOM(vnode)
  };
}

function createDOM(vnode) {
  if (typeof vnode === 'string') {
    return document.createTextNode(vnode);
  }
  const el = document.createElement(vnode.tag);
  // 设置props
  for (const [key, value] of Object.entries(vnode.props || {})) {
    el[key] = value;
  }
  // 递归创建子节点
  (vnode.children || []).forEach(child => {
    el.appendChild(typeof child === 'object' ? createDOM(child) : document.createTextNode(child));
  });
  return el;
}

// 简化调度
let taskQueue = null;
function schedule() {
  if (!taskQueue) {
    taskQueue = setTimeout(() => {
      isRendering = true;
      currentlyRenderingFiber = null;
      // 重新执行App（模拟React.render）
      workLoop();
      isRendering = false;
      taskQueue = null;
    }, 0);
  }
}

function workLoop() {
  while (workInProgressHook !== null) {
    workInProgressHook = workInProgressHook.next;
  }
}

// 测试（概念演示，实际需配合React运行时）
// 注意：这是简化版思路，真正React需要Fiber架构、reconciliation等完整实现
```

## 3. 手写简易 Router（Hash模式）

```javascript
// 手写简易Router：Hash模式
class Router {
  constructor(routes = []) {
    this.routes = routes;
    this.currentPath = this.getPath();

    // 监听hash变化
    window.addEventListener('hashchange', () => {
      const path = this.getPath();
      if (path !== this.currentPath) {
        this.currentPath = path;
        this.render();
      }
    });

    // 初始渲染
    this.render();
  }

  getPath() {
    return window.location.hash.slice(1) || '/';
  }

  navigate(path) {
    window.location.hash = path;
  }

  match(path) {
    // 精确匹配 > 动态路由匹配
    const exact = this.routes.find(r => r.path === path && !r.path.includes(':'));
    if (exact) return exact;

    // 动态路由：/user/:id
    return this.routes.find(r => {
      if (!r.path.includes(':')) return false;
      const pattern = r.path.replace(/:[^/]+/g, '([^/]+)');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(path);
    });
  }

  getParams(path, route) {
    const params = {};
    const keys = (route.path.match(/:([^/]+)/g) || []).map(k => k.slice(1));
    const values = path.match(new RegExp(route.path.replace(/:[^/]+/g, '([^/]+)')));
    keys.forEach((key, i) => params[key] = values[i + 1]);
    return params;
  }

  render() {
    const path = this.currentPath;
    const route = this.match(path);

    if (!route) {
      this.onNotFound();
      return;
    }

    const params = this.getParams(path, route);
    route.component({ path, params, navigate: this.navigate.bind(this) });
  }

  onNotFound() {
    console.warn('Route not found:', this.currentPath);
  }
}

// 示例：定义组件
const Home = () => console.log('Home页面');
const User = ({ params }) => console.log('User:', params.id);
const Article = ({ params }) => console.log('Article:', params.id);

// 创建Router
const router = new Router([
  { path: '/', component: Home },
  { path: '/user/:id', component: User },
  { path: '/article/:id', component: Article }
]);

// 跳转
router.navigate('/user/123');
router.navigate('/article/456');
console.log(router.currentPath); // /article/456

// History模式（类似，只是监听popstate）
class HistoryRouter {
  constructor(routes) {
    this.routes = routes;
    this.currentPath = window.location.pathname;
    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname;
      this.render();
    });
    this.render();
  }

  navigate(path) {
    history.pushState(null, '', path);
    this.currentPath = path;
    this.render();
  }
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [React Router 文档](https://reactrouter.com/home) | 学习官方 HashRouter 的 API 与实现约定。 | 读 HashRouter 与 useNavigate 部分，理解 hash 变化如何驱动渲染，再写一个迷你版。 |
| [React DOM APIs](https://react.dev/reference/react-dom) | 官方 DOM API 规范，明确手写 render 的接口边界。 | 读 createRoot、render、hydrate 等条目，对照手写 render 需要实现哪些行为。 |
| [useState](https://react.dev/reference/react/useState) | 官方 useState 语义与边界，是手写 hooks 的对照标准。 | 读用法、Caveats 与 Troubleshooting，读完实现一个支持批量更新的简化版。 |
| [React 官方中文文档](https://zh-hans.react.dev/) | 中文官方文档，降低 useState 与 Context 的理解成本。 | 通读 useState 与 Context 章节，术语对照英文版，再回到源码实现。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [petite-vue](https://github.com/vuejs/petite-vue) | 源码短小，展示无虚拟 DOM 的响应式渲染，便于对比。 | 读 src/index.ts，重点看响应式与模板渲染，思考它为何不需要 diff。 |
| [Solid](https://github.com/solidjs/solid) | 细粒度响应式不依赖虚拟 DOM，提供另一种架构视角。 | 读 README 与 packages/solid，问为什么不需要虚拟 DOM，对比手写 diff 的取舍。 |
| [React 源码仓库](https://github.com/facebook/react) | 真实 reconciler 源码，看 diff 与 hooks 如何落地。 | 从 packages/react-reconciler 的 beginWork 与 completeWork 读起，配合断点调试。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Build Your Own React](https://pomb.us/build-your-own-react/) | 一步步手写简化 React，直接覆盖 diff、Fiber 与 hooks。 | 按步骤实现到 hooks 章节，重点看 reconcile 与 useState 如何挂到 Fiber 上。 |
| [Vue 渲染机制](https://cn.vuejs.org/guide/extras/rendering-mechanism.html) | 讲透虚拟 DOM、diff 与编译优化，可与 React 对照。 | 读虚拟 DOM 与 diff 章节，在模板编译器演示站对照输出，比较两种 diff 策略。 |
| [网道 Web API 教程](https://wangdoc.com/webapi/) | Hash 路由依赖原生 hashchange，先掌握底层 API。 | 读 location 与 hashchange 章节，写一个监听 hash 变化并渲染对应组件的迷你路由。 |
| [React Fiber 架构笔记](https://github.com/acdlite/react-fiber-architecture) | 理解 Fiber 调度与协调，对照手写 work loop。 | 读完后对照 Build Your Own React 的 Fiber 章节，画出 work loop 流程图。 |
| [Overreacted：React as a UI Runtime](https://overreacted.io/react-as-a-ui-runtime/) | 从运行时视角解释 React 的核心机制，适合建立心智模型。 | 分段读，每读完一节用一句话复述 React 做了什么，再回看手写实现。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格滚动 | h 创建行 vnode、key 复用、patch 增量更新 | 自研虚拟滚动 + 本页 h/patch | key 用业务 ID；行高必须可测量 |
| 低端安卓的首屏加载 | 分块 patch、首屏只描述可视区块 | requestIdleCallback 分片 patch | 首屏 LCP 区块不要延后提交 |
| 多人协作白板 | key 稳定时 patch 只改变化节点 | WebSocket 增量 + h/patch 重建列表 | 高频拖拽中间态先合帧再 patch |
| 长表单字段联动校验 | diff 只改错误文本节点 | 受控 state + h/patch | 输入框焦点与光标不能被重建 |
| 聊天窗口历史消息倒序插入 | 列表同层 diff、key 定位插入点 | WebSocket + patch 前置插入 | 插入后要按锚点修正滚动位置 |
| Hash 路由切换页面 | Hash Router + patch 替换视图 | hashchange + patch | 离开页面要解绑监听函数 |
| 拖拽排序列表 | 同层 key diff 移动节点 | 自研 drag + h/patch | 拖拽过程改 transform，落点再 patch |
| 同构首屏水合 | 服务端 vnode 与客户端 vnode 对齐 | 需核对官方文档：水合不匹配的报错形式 | 客户端首帧结构必须与服务端一致 |
| 富文本编辑器嵌入表格 | patch 边界止于编辑器容器 | 第三方编辑器 + 外层 patch | 编辑器内部 DOM 交给它自己管理 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**

表格一次要展示上万行，直接给每行建 DOM 会让首帧和滚动都卡住。用 DevTools Performance 录制滚动 10 秒，看每帧 Scripting 耗时是否超过 16ms，就能复现。

**怎么用本页知识解决**

思路是只把可视区那几十行转成 vnode，其余行不进入 diff。滚动时重算起止下标，再交给 patch 打补丁。

```js
// 每行用业务 ID 做 key，diff 才能复用已有 DOM 节点
function rowVNode(row) {
  return h('tr', { key: row.id }, [
    h('td', null, row.name),
    h('td', null, String(row.size)),
  ]);
}

// 只把可视区切片转成 vnode，其余行不进入 diff
function viewVNodes(rows, start, end) {
  const out = [];
  for (let i = start; i < end; i++) out.push(rowVNode(rows[i]));
  return h('tbody', null, out);
}

// 滚动时只重算起止下标，再交给 patch 打补丁
window.addEventListener('scroll', () => {
  const start = Math.floor(scrollTop / ROW_H);
  patch(tbodyEl, viewVNodes(rows, start, start + VISIBLE));
});
```

- 起止下标由 scrollTop 除以固定行高得到，行高固定才能算准。
- 可视区行数取"容器高度 / 行高 + 2"，多出的 2 行用于缓冲滚动抖动。
- key 必须是业务 ID，用数组下标会在排序后导致 DOM 节点被错误复用。
- patch 的父节点固定为同一个 tbody，diff 只比较同层子节点。
- 上下留白用一个空 tr 撑高，避免总高度塌缩。

**怎么度量收益**

指标看滚动帧的 Scripting 耗时与 Long Task 次数，工具用 Chrome DevTools Performance 录制 10 秒滚动，再对比每帧 Scripting 是否落在 16ms 内。可用 PerformanceObserver 采集 longtask 条目做回归监控。

**什么时候不该用**

- 表格需要浏览器原生 Ctrl+F 整表搜索时，未渲染的行搜不到。
- 行高由内容撑开且无法预测量时，虚拟滚动的偏移量会算错，应先固定行高。

#### 场景 2：低端安卓的首屏加载

**业务背景**

首屏 HTML 到位后一次性 patch 整棵 vnode，在低端机型上会形成长任务，用户看到的是白屏。复现方法：DevTools 开 6 倍 CPU 降速加 Slow 4G，录制从导航到首屏可点。

**怎么用本页知识解决**

思路是把页面拆成区块，首屏只 patch 用户第一眼能看到的区块，其余区块先放占位节点，空闲时逐块替换。

```js
// 首屏骨架：只描述用户第一眼能看到的区块
function renderSkeleton() {
  return h('div', { class: 'page' }, [
    h('header', null, '标题'),
    h('div', { class: 'hero' }, '首屏区块'),
    h('div', { id: 'below-fold' }), // 占位，先不渲染内容
  ]);
}

patch(app, renderSkeleton());

// 首屏之后把占位逐个换成真实内容
const blocks = loadBelowFold(); // 按优先级排好的区块 vnode 工厂
function flushOne(deadline) {
  while (deadline.timeRemaining() > 4 && blocks.length) {
    const el = document.getElementById('below-fold');
    patch(el, blocks.shift()()); // 每次只 patch 一块
  }
}
requestIdleCallback(flushOne);
```

- 首屏骨架里的节点数量控制在几十个以内，patch 一次就能同步完成。
- 占位节点保留 id，后续按 id 取到父节点再 patch，节点位置不会漂移。
- 每轮循环用 timeRemaining 卡住时间预算，避免拼成长任务。
- 区块工厂是函数，只有真正用到时才创建 vnode，减少对象分配。
- 首屏区块不放进空闲队列，否则 LCP 会被推迟到空闲回调之后。

**怎么度量收益**

指标看 LCP 与 Total Blocking Time，工具用 Lighthouse 移动端模式并开启默认节流。首屏 patch 次数和耗时用 performance.mark 与 performance.measure 打点，在 Performance 面板的 User Timing 轨道上核对。

**什么时候不该用**

- 页面区块少于 3 块时，拆分的调度开销大于收益。
- 首屏内容需要整页可打印或可 Ctrl+F 时，延后 patch 会让打印结果缺内容。

#### 场景 3：多人协作白板

**业务背景**

多人同时拖动便签时，远端每秒推来多次增量操作，整块重建 DOM 会让本地正在编辑的输入框失焦。复现方法：本地脚本按 20 次/秒模拟远端推送，观察输入框是否丢焦点。

**怎么用本页知识解决**

思路是每条便签用远端 ID 做 key，远端操作只改数据，然后整棵白板列表重建 vnode，由 diff 找出真正变化的那一个节点。

```js
// 每个便签用远端 ID 做 key，patch 时只动变化的那个节点
function noteVNode(note) {
  return h('div', {
    key: note.id,
    class: 'note',
    style: `left:${note.x}px;top:${note.y}px`, // 位置来自远端状态
  }, note.text);
}

// 收到远端增量操作后，只更新对应数据再重建列表
function applyRemote(op) {
  const i = notes.findIndex(n => n.id === op.id);
  if (op.type === 'move') notes[i] = { ...notes[i], x: op.x, y: op.y };
  if (op.type === 'add') notes.push(op.note);
  patch(boardEl, h('div', { class: 'board' }, notes.map(noteVNode)));
}
```

- 简化版 diff 按同层顺序比较，所以 notes 必须按 ID 排序后再重建，否则 key 复用会失效。
- 便签内文本用独立文本节点承载，移动便签不会重置正在编辑的内容。
- 本地正在编辑的便签先不接收远端文本覆盖，避免光标跳到行首。
- 拖拽中间态直接改 transform，只在落点时把坐标写回数据并 patch 一次。
- 远端操作先攒进队列，用 requestAnimationFrame 每帧合并成一次 patch。

**怎么度量收益**

指标看 Recalculate Style 与 Layout 次数，工具用 DevTools Performance 录制 100 次远端操作，统计 Layout 触发次数。丢焦点次数可以监听 focusout 事件计数，作为功能回归指标。

**什么时候不该用**

- 白板用 canvas 绘制时，DOM patch 不参与绘制，本页知识只用于外层工具栏。
- 每秒上百次的拖拽中间态不该每次 patch，应先合帧，否则 diff 本身成为开销。

### 行业先进实践

编译期标记动态节点（出处：Vue 3 官方文档「渲染机制」章节）

文档说明编译器在 vnode 上写入 patchFlag，运行时同层比较只看带标记的节点，静态子树整体跳过。你的项目可以给 h 函数加第三个参数作为标记位，diff 时先按标记过滤候选节点。

细粒度响应式，跳过 vnode 比较（出处：SolidJS 官方文档）

文档说明更新由信号订阅直接驱动到具体 DOM 节点，不重建 vnode 树。借鉴方式是把表格单元格文本抽成独立订阅点，行列结构不变时根本不进 diff。

编译期生成 DOM 更新指令（出处：Svelte 官方文档）

文档说明模板在编译期就被转成直接操作 DOM 的语句，运行时不保留 vnode 层。可以这样借鉴：结构固定的骨架页用编译产物，结构随数据变化的部分保留 h 与 patch。

可中断的并发渲染（出处：React 官方文档）

文档说明渲染工作被拆成可中断单元，并按优先级决定先提交哪部分。对应到本页，就是把 patch 按区块提交，输入或滚动打断时先提交可视区块。

模块化 patch 与生命周期钩子（出处：Snabbdom 开源项目文档）

文档说明 patch 由 class、style、eventlistener 等模块和钩子组成，各模块独立处理一类属性。借鉴方式是把属性 diff 拆成独立模块，逐个写单测。

### 从学到用：落地路线

**第 1 步：在一个只读列表页试点**，把原来整表重建改成 h + patch 增量更新。验收标准：该页面功能与改前一致，DevTools 里 patch 次数可被打印出来。

**第 2 步：用录制对比验证收益**，改前改后各录 10 秒滚动过程。验收标准：同样的操作路径下，Scripting 耗时与 Layout 次数在录制结果里可比对，且无新增报错。

**第 3 步：抽成公共模块推广到同类列表**，把 h、patch、key 约定封装成可复用函数并补文档。验收标准：接入方只需传数据和行 vnode 工厂，接入页面不少于 3 个。

**第 4 步：加回归护栏防回退**，把 patch 次数与 longtask 次数纳入持续集成脚本。验收标准：超过阈值时流水线失败，且失败信息指向具体页面与测量命令。

### 动手作业

**目标**

做一个带 Hash 路由的任务列表页，用本页的 h、patch、简化版 diff 完成列表增删改与页面切换，全程不直接写 innerHTML。

**步骤**

1. 实现 h 函数，返回带 tag、props、children 的 vnode 对象。
2. 实现 patch 函数，支持首次挂载、文本节点替换、同层子节点按 key 比较。
3. 用 useState 简化版保存任务数组，任何写操作后触发一次 patch。
4. 列表项用任务 ID 做 key，实现新增、删除、完成状态切换。
5. 接入 Hash Router，在 `#/all` 与 `#/done` 之间切换时 patch 视图容器。
6. 给每个任务加输入框，验证编辑文本时输入框不丢焦点、光标不跳到行首。
7. 在 Performance 面板录制一次增删操作，记录 patch 次数与 Layout 次数。

**验收标准**

- 删除中间一项后，其后各项的 DOM 节点被复用而非重新创建，可用元素引用比对验证。
- 连续编辑某任务的文本时，focusout 事件计数为 0。
- 路由来回切换 20 次后，hashchange 监听函数数量不增长，可用 addEventListener 计数验证。
- patch 函数对相同 vnode 重复调用两次，第二次不产生 DOM 写操作。

