---
title: 状态管理与性能优化
description: Zustand/Jotai/Recoil、Redux、React Query、性能优化与大规模状态管理相关面试题
---

# 状态管理与性能优化

> 本页按「概念、原理、代码」逐题展开相关面试专题。

## 1. 状态管理: Zustand / Jotai / Recoil

### 1.1 Zustand原理

```javascript
// Zustand: 极简状态管理 (~100行核心)
import { create } from 'zustand';

const useStore = create((set, get) => ({
  bears: 0,
  increase: () => set(s => ({ bears: s.bears + 1 })),
}));

function Counter() {
  const bears = useStore(s => s.bears); // 精确选择,减少re-render
  return <h1>{bears}</h1>;
}

// 极简实现:
function createStore(init) {
  let state; const listeners = new Set();
  const set = (partial) => {
    state = { ...state, ...(typeof partial==='function' ? partial(state) : partial) };
    listeners.forEach(l => l(state));
  };
  state = init(set, () => state);
  return { getState: () => state, setState: set,
    subscribe: l => { listeners.add(l); return () => listeners.delete(l); } };
}
```

### 1.2 Jotai原理

```javascript
// Jotai: 原子(Atom)模型,细粒度响应式
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const doubledAtom = atom(get => get(countAtom) * 2); // 派生原子

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const [doubled] = useAtom(doubledAtom);
  return (
    <div>
      <span>{count} ({doubled})</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}
// 原理: React外部存储 + Subscription + 依赖追踪
```

### 1.3 Recoil原理

```javascript
// Recoil: atom+selector模型,与React并发模式深度集成
const todoListState = atom({ key: 'todoList', default: [] });

const filteredState = selector({
  key: 'filtered',
  get: ({ get }) => get(todoListState).filter(t => t.done),
});

// useRecoilState读取Fiber tree的lane上下文
// 自动参与React的并发调度
```

## 2. Redux单向数据流

**数据流：** Action → Dispatch → Reducer → New State

**为什么单向数据流重要：**
- 可预测性：任何状态变化都来自明确的 action
- 可追踪：action 是纯文本描述 `{type:'INCREMENT'}`
- 可重现：同 action 序列产生同状态
- 可测试：reducer 是纯函数
- 时间旅行：action 序列可存储/回放（Redux DevTools）

```
Redux vs MobX vs Zustand:

Redux: Store→Action→Reducer→Store→UI (纯函数)
       大型项目 + DevTools时间旅行

MobX: Action↔Observable State↔Computed↔UI (响应式)
       中型项目,自动追踪依赖

Zustand: Store(极简) → UI
       轻量项目,无样板代码
```

## 3. React性能优化

### 3.1 避免重复渲染

```jsx
// 原因1: 父组件渲染 → 所有子组件无条件重新渲染
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>+{count}</button>
      <Header />   {/* 不需要count,但每次re-render */}
      <SideBar />  {/* 不需要count,但每次re-render */}
    </div>
  );
}

// 原因2: 每次新建对象/数组引用
<Child config={{ theme: 'dark' }} />  // 每次都是新对象

// 原因3: 每次新建函数
<Child onClick={() => doSomething()} />
```

### 3.2 React.memo / useMemo / useCallback

```jsx
// React.memo: 浅比较props,相同则跳过render
const MemoChild = React.memo(function Child({ data, onClick }) {
  return <div onClick={onClick}>{data.title}</div>;
});

// useMemo: 缓存计算结果
const filtered = useMemo(() => items.filter(f), [items, filter]);

// useCallback: 缓存函数引用
const handleClick = useCallback(() => action(id), [id]);
```

### 3.3 Immutable原则

```javascript
// 创建新引用
setState({ ...state, items: [...state.items, newItem] });

// Immer
import { produce } from 'immer';
setState(produce(draft => { draft.items.push(newItem); }));

// 为什么重要: React.memo/useMemo基于浅比较(===)
```

### 3.4 React.memo原理

```javascript
// 简化实现:
function memo(Component, arePropsEqual) {
  return function MemoizedComponent(props) {
    if (prevProps && (arePropsEqual
      ? arePropsEqual(prevProps, props)
      : shallowEqual(prevProps, props))) {
      return null; // 跳过render,复用上次DOM
    }
    prevProps = props;
    return <Component {...props} />;
  };
}

// shallowEqual: 对第一层属性做 === 比较
```

### 3.5 useMemo为什么不能乱用

```
避免: 过早优化: useMemo(() => 1+1, []) → 计算极快,缓存开销更大
避免: 错误依赖: useMemo(() => compute(count), []) → 永远是初始值
避免: 渲染中setState: useMemo里调用setState → 可能死循环

推荐: 昂贵计算: 排序/搜索/复杂计算 → 收益大于开销
推荐: 稳定引用: 传给React.memo子组件的对象/数组
推荐: 派生计算: 避免每次render重新计算
```

## 4. React Query原理

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function User({ id }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user', id],        // 唯一缓存键
    queryFn: () => fetch(`/api/users/${id}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,     // 5分钟内不重新获取
    cacheTime: 10 * 60 * 1000,    // 缓存保留10分钟后GC
    retry: 3,                      // 失败重试3次
  });
  if (isLoading) return <Spinner />;
  return <div>{data.name}</div>;
}

// 乐观更新: 立即更新UI,出错时回滚
const mutation = useMutation({
  mutationFn: (todo) => api.createTodo(todo),
  onMutate: async (todo) => {
    await queryClient.cancelQueries(['todos']);
    const previous = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], old => [...old, todo]);
    return { previous }; // 返回给onError回滚
  },
  onError: (err, todo, ctx) => {
    queryClient.setQueryData(['todos'], ctx.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries(['todos']); // 最终同步
  },
});
```

```
React Query缓存生命周期:
  1. queryFn执行 → loading
  2. 数据返回 → 存入cache (staleTime计时开始)
  3. staleTime内 → 直接用缓存
  4. staleTime后 → 后台重新获取 + 同时返回缓存
  5. cacheTime后无引用 → GC清理
```

## 5. React大规模状态管理方案

**大规模 React 应用状态分层：**

| 层级 | 方案 | 使用场景 |
|------|------|---------|
| Global | Redux Toolkit / Zustand | 用户认证、主题、全局通知、跨页面共享状态 |
| Feature | Context / Jotai | 功能模块内共享（多个独立 Context/Store，避免单一巨型 Context） |
| Local | useState / useReducer | 组件私有：表单、临时 UI、动画 |

**实践建议：**
1. 状态尽量下沉（不放根组件）
2. Context 按功能拆分（AuthContext, ThemeContext...）
3. Server State 用 React Query/SWR（不放 Redux）
4. URL 作为状态（搜索/筛选/分页 URLSearchParams）
5. 派生状态用 selector/memo：避免重复计算
6. Immutable 优先：方便 DevTools 调试

```
推荐架构组合:

  React 18 + Concurrent Rendering
        +
  Next.js App Router (RSC)      ← Server State
        +
  TanStack Query (Client RPC)   ← Server Cache State
        +
  Zustand (Global UI State)     ← 用户偏好/认证/主题
        +
  Jotai (Feature State)         ← 局部复杂交互
        +
  useState (Component State)    ← 表单/UI

不推荐单一Redux用于所有状态:
  - Server State在Redux中 → 手动管理缓存/重试/轮询
  - boilerplate → Redux Toolkit减少
  - DevTools → 仍是最好的时间旅行调试工具
```

---

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [TanStack Query 文档](https://tanstack.com/query/latest) | React Query 核心机制的第一手说明，缓存、失效、预取都有据可查。 | 重点读 Caching、Query Invalidation、Optimistic Updates 三节，边读边问「数据何时变旧」，再为项目接口写一遍配置。 |
| [TanStack Query 概览](https://tanstack.com/query/latest/docs/framework/react/overview) | Important Defaults 讲清 staleTime 与 gcTime，是理解 React Query 原理的 | 先读 Important Defaults 与概览中的状态图，带着「为什么默认不重复请求」问题读，读完画一张缓存生命周期图。 |
| [Jotai 文档](https://jotai.org/docs/introduction) | 原子化状态管理的官方说明，与 Zustand、Redux 形成对照。 | 读 Core 与 Derived atoms，用一个联动表单把两个输入框拆成 atom，体会细粒度更新与重渲染范围。 |
| [useContext](https://react.dev/reference/react/useContext) | Context 是内置状态共享方案，也是小规模状态管理的基准。 | 读 Caveats 与「何时不用 Context」部分，思考它为何不适合高频更新场景，再对比外部 store 方案。 |
| [useCallback](https://react.dev/reference/react/useCallback) | 官方讲清 useCallback 的适用边界，避免无意义记忆化。 | 只读 Caveats 与 Troubleshooting，问「这里不 memo 会怎样」，再用 Profiler 验证一处优化是否真有效。 |
| [useDeferredValue](https://react.dev/reference/react/useDeferredValue) | useDeferredValue 是渲染优先级优化的常用手段，文档给出可运行示例。 | 读用法示例与陷阱一节，把项目里的搜索过滤列表改造成延迟版本，对比输入卡顿是否消失。 |
| [useTransition](https://react.dev/reference/react/useTransition) | 并发特性下区分紧急与非紧急更新，是性能优化的核心 API。 | 读 useTransition 与 startTransition 区别、Caveats，在一个筛选或路由切换场景中接入并观察 pending 状态。 |
| [React Compiler 介绍](https://react.dev/learn/react-compiler/introduction) | 编译器自动记忆化，可能让手写 memo 优化思路整体改变。 | 在 Vite 小项目按文档启用，开启前后各跑一次 Profiler 记录重渲染次数，整理哪些手写 memo 可以删。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [React 源码仓库](https://github.com/facebook/react) | 直接读协调器源码，能把重渲染与调度的说法落到代码上。 | 从 packages/react-reconciler 的 beginWork 与 completeWork 读起，配断点跟一次状态更新，画出提交阶段流程图。 |
| [React Fiber 架构笔记](https://github.com/acdlite/react-fiber-architecture) | Fiber 架构笔记用图讲清 work loop，补足源码阅读的前置知识。 | 读完对照 Build Your Own React 的 Fiber 章节，自己画一张 work loop 与优先级调度流程图，再回看源码。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [TkDodo：Practical React Query](https://tkdodo.eu/blog/practical-react-query) | 维护者写的实战系列，把抽象概念落到真实业务写法上。 | 从第一篇按顺序读，每篇挑一个结论写进项目：先做分页查询，再做乐观更新，最后加失效策略。 |
| [TkDodo 博客](https://tkdodo.eu/blog) | 维护者博客能补充文档没讲的取舍与坑，适合深挖原理。 | 按 React Query 标签挑「为什么这样设计」类文章读，读完记录一条与文档结论冲突或补充的点。 |
| [Redux Essentials](https://redux.js.org/tutorials/essentials/part-1-overview-concepts) | Redux 官方教程，单向数据流与不可变更新的最佳入门材料。 | 做完 Part 1 到 Part 3，重点看数据流图与 reducer 写法，再手写一遍 removeTodo 并画出 action→store→view 链路。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行订单表格 | React 性能优化（memo、按字段订阅）、Zustand selector | Zustand + TanStack Virtual + React.memo | 选中态拆到行级订阅，否则勾选一行触发整表渲染 |
| 面向低端安卓的商城首屏 | React Query 缓存与预取、React.lazy 代码分割 | TanStack Query + React.lazy + web-vitals | 预取前判断网络类型，弱网下预取会抢首屏带宽 |
| 多人协作白板 | 大规模状态管理方案、渲染性能优化 | Zustand 或自建外部 store + Yjs | 指针移动写外部 store，抬手才提交协作后端 |
| 跨页面的购物车与库存 | Redux 单向数据流、React Query 缓存失效 | Redux Toolkit + RTK Query | 服务端数据与客户端 UI 状态分开放 |
| 聊天消息无限下拉与乐观发送 | React Query 原理（queryKey、乐观更新） | TanStack Query 的 useInfiniteQuery | queryKey 里塞游标会让缓存碎片化 |
| 多步运营配置表单与草稿 | Jotai 原子化状态、状态提升 | Jotai + react-hook-form | 原子拆得过细，提交时的聚合读取会绕 |
| 离线优先的巡检清单 | React Query 缓存持久化、状态可序列化 | TanStack Query 持久化插件 + IndexedDB | 持久化缓存要带版本号与迁移函数 |
| 微前端聚合后台 | React 大规模状态管理方案 | 子应用各自 store + 事件总线 | 不共享可变 store 实例，避免版本冲突 |

### 三个场景拆解

#### 场景 1：后台管理的万行订单表格

**业务背景**：运营后台在一张表里展示数万行订单，勾选、排序、翻页都在同一页完成。用户滚动时掉帧，勾选一行会让整张表重新渲染。

**怎么用本页知识解决**：思路是把"哪些行被选中"从数组改成 Set，把行组件改成只订阅自己那一行；列定义与行数据用 useMemo 与 React.memo 固定引用。

```tsx
// 用 Set 存选中行 id，勾选时复制 Set 保持不可变更新
const useSelection = create(set => ({
  ids: new Set<string>(),
  toggle: (id: string) =>
    set(state => {
      const next = new Set(state.ids);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ids: next }; // 返回新 Set，旧快照不被改写
    }),
}));

// 每行只订阅自己的选中状态，其他行变化不触发本行
function Row({ id }: { id: string }) {
  const checked = useSelection(s => s.ids.has(id)); // 返回布尔值，值不变不渲染
  const toggle = useSelection(s => s.toggle);       // 函数引用稳定
  return <input type="checkbox" checked={checked} onChange={() => toggle(id)} />;
}
```

- Set 的判重与增删代价只和选中数量有关，和总行数无关。
- selector 返回布尔值，Zustand 用 Object.is 比较，值没变就不渲染该行。
- 把 toggle 这类函数放进 store，组件不会因为函数重建而重渲染。
- 列定义用 useMemo、行组件用 React.memo，父组件渲染时不牵连行组件。
- 可视区外的行交给 TanStack Virtual，DOM 节点数量和屏幕高度挂钩。

**怎么度量收益**：看三个指标，勾选一行到界面更新的耗时、滚动时每帧耗时、每个操作触发的 commit 次数。工具用 React DevTools Profiler 看 commit 与渲染耗时，用 Chrome DevTools Performance 面板录制 10 秒滚动看 FPS 与长任务，用 PerformanceObserver 采集 longtask。测量前用脚本生成同一份模拟数据集，改动前后各录一遍。

**什么时候不该用**：

- 表格只有几十行且 Profiler 里看不到掉帧，引入虚拟滚动与按行订阅只增加代码维护面。
- 行内需要跨行聚合（如"已选中订单的合计金额"），状态打散到每行会让聚合逻辑在多个组件里重复。

#### 场景 2：面向低端安卓的商城首屏

**业务背景**：面向新兴市场的 H5 商城，设备内存偏小，网络在 3G 与 4G 之间波动。首屏要同时展示商品列表和购物车角标，两处都要读登录态与购物车数量。

**怎么用本页知识解决**：把服务端数据交给 React Query，用 queryKey 描述缓存粒度；把购物车数量这类客户端状态交给 Zustand，按组件订阅；页面级组件用 React.lazy 拆分。

```tsx
// 服务端数据交给 React Query，queryKey 决定缓存粒度
const { data } = useQuery({
  queryKey: ['products', categoryId], // 分类变化才重新请求
  queryFn: () => fetchProducts(categoryId),
  staleTime: 60_000,                  // 一分钟内命中缓存，不再发请求
});

// 购物车数量是客户端状态，放进 Zustand 单独订阅
const cartCount = useCart(s => s.count);

// 手指按下时预取详情页数据，点击后直接命中缓存
const queryClient = useQueryClient();
const prefetch = (id: string) => queryClient.prefetchQuery({
  queryKey: ['product', id],
  queryFn: () => fetchProduct(id),
});
// 列表项：<li onPointerDown={() => prefetch(item.id)} />
```

- queryKey 用分类 id，切回看过的分类直接命中缓存，不会重新请求。
- staleTime 设 60 秒，从详情页返回列表时不重复拉取同一批商品。
- pointerdown 时预取，从按下到页面渲染这段时间数据已经在路上。
- 购物车数量放在 Zustand，角标单独订阅，商品列表渲染不带角标。
- 路由级 React.lazy 让首屏只加载当前页面的 JS。

**怎么度量收益**：指标用 FCP、LCP、TTI、首屏请求数与传输字节数。工具用 Lighthouse 的移动端预设配合限速，用 Chrome DevTools Network 面板看请求瀑布，用 web-vitals 把真实用户指标打到监控。同一份限速配置下改动前后各跑 5 次，取中位数比较。

**什么时候不该用**：

- 商品价格与库存必须实时准确，缓存会展示过期价格，此时 staleTime 要设为 0 或不走缓存。
- 首屏只有一个组件读这份数据，抽到全局 store 或缓存层只增加一层间接调用。

#### 场景 3：多人协作白板

**业务背景**：一个白板房间有几十个协作者同时拖拽元素，指针事件每秒产生上百次坐标更新。每次移动都走 React 状态，输入会出现可见延迟。

**怎么用本页知识解决**：把高频、瞬时的坐标放在 React 之外的 store，用订阅驱动画布更新；只有抬手这个"提交"动作才写回协作后端。

```tsx
// 高频坐标放在 React 之外的 store，避免每次指针移动都调度渲染
const dragStore = {
  pos: { x: 0, y: 0 },
  listeners: new Set<() => void>(),
  set(x: number, y: number) {
    this.pos = { x, y };                // 覆盖快照，保持新引用
    this.listeners.forEach(l => l());   // 通知订阅者
  },
  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  },
  getSnapshot: () => dragStore.pos,     // 两次渲染之间返回同一引用
};

// React 侧读取快照，只有订阅 store 的覆盖层组件重渲染
const pos = useSyncExternalStore(dragStore.subscribe, dragStore.getSnapshot);
// 抬手时才提交：onPointerUp={() => commitElement(id, dragStore.getSnapshot())}
```

- 指针移动只写普通对象，不进入 React 调度，移动期间的渲染次数由订阅者数量决定。
- 订阅者集合只放需要跟随的元素，更新范围可控。
- useSyncExternalStore 让 React 读取外部 store 时保持一致，不会读到撕裂的中间值。
- 抬手时提交最终坐标，网络请求次数与手势次数同级，不是与指针事件同级。
- 并发冲突交给 CRDT 或操作变换层，React 只负责把结果画出来。

**怎么度量收益**：指标用拖拽期间每帧耗时、事件处理耗时（PerformanceObserver 的 event timing，看 processingStart 到 processingEnd）、提交接口的 QPS。工具用 Chrome DevTools Performance 面板录制一段拖拽，用 PerformanceObserver 采集 longtask 与 event 条目，后端看接口调用量。

**什么时候不该用**：

- 单人使用、拖拽频率低的画板，直接 useState 就够，外部 store 会带来订阅清理的负担。
- 拖拽过程要和表单校验联动（如拖出边界就报错），绕过 React 状态后校验逻辑读不到中间态。

### 行业先进实践

- **Redux Toolkit 的 slice 与 RTK Query 标签失效（出处：Redux 官方文档）**：官方文档的 Redux Essentials 教程建议用 createSlice 按业务域拆分 reducer，用 RTK Query 的 providesTags 与 invalidatesTags 描述缓存失效关系。这样服务端缓存和客户端 UI 状态各自有归属，失效规则写在接口定义旁边。借鉴方式：先把登录态与购物车搬进一个 slice，再把请求逐条迁到 RTK Query。
- **Zustand 的按切片订阅与浅比较（出处：Zustand 官方文档）**：官方文档给出 Preventing rerenders with useShallow 的做法，当 selector 必须返回对象时用浅比较避免每次新建对象导致重渲染。借鉴方式：把返回多字段的 selector 拆成多次单字段订阅，或包一层 useShallow。
- **TanStack Query 的乐观更新流程（出处：TanStack Query 官方文档）**：官方文档的 Optimistic Updates 章节给出 onMutate 取消在途查询并写入乐观结果、onError 回滚、onSettled 重新拉取的流程。这套流程把"先改界面再等响应"和"出错回退"写成固定套路。借鉴方式：先给点赞、勾选待办这类动作加乐观更新，把回滚逻辑和错误提示一起写。
- **React 官方文档的 "You Might Not Need an Effect" 与状态提升（出处：react.dev）**：文档指出能从 props 或已有状态算出的值不要放进 state，也不要用 Effect 去同步两个状态字段。借鉴方式：先删掉组件里用来同步派生字段的 Effect，改成渲染期直接计算。
- **Jotai 的原子派生与 selectAtom（出处：Jotai 官方文档）**：需核对官方文档：确认当前版本推荐的派生 atom 写法和 selectAtom 的导出路径，再决定是否用它做细粒度订阅。

### 从学到用：落地路线

1. **试点**：选状态最乱的一个页面（如购物车抽屉），把服务端数据和客户端 UI 状态分开，只在这一页引入新方案。验收标准是该页没有组件直接发请求，也没有 Effect 用来同步派生状态。
2. **验证**：用 React DevTools Profiler 录制一条固定操作路径，与改造前的 commit 次数和渲染耗时逐项对照，同时手动走完离线、弱网、报错三个分支。验收标准是录制脚本可重复执行，改造前后各留一份记录，错误分支和空态都能手动复现。
3. **推广**：把 slice 与 queryKey 的命名规范、目录结构写进仓库文档，新页面按规范建文件；老页面按改动频率排序，改到哪个就顺手迁哪个。验收标准是代码评审清单里有对应条目，新增页面全部符合规范。
4. **防回退**：用 ESLint 规则禁止在组件里直接写 fetch，给 reducer 与请求失败分支补单元测试，用 size-limit 之类的体积门禁接进 CI。验收标准是违规代码无法通过 CI，打包体积回退超过阈值时流水线报警。

### 动手作业

**目标**：做一个待办看板，只保留两个功能，勾选任务与乐观新增任务。

**步骤**：

1. 用 Vite 起一个 React + TypeScript 项目，安装 zustand 与 @tanstack/react-query。
2. 用 json-server 暴露 `/tasks` 的 GET 与 PATCH 接口，让请求有真实延迟。
3. 筛选条件与关键字放进 Zustand，任务列表放进 React Query。
4. 实现勾选任务：在 onMutate 里写入新列表，在 onError 里回滚，在 onSettled 里失效缓存。
5. 给任务行加 selector 订阅，在行组件里打印渲染日志，确认勾选一行只渲染该行。
6. 用 React.lazy 把"已完成"视图拆成独立 chunk，在 Network 面板确认它按需加载。
7. 打开 React DevTools Profiler，记录勾选一行时的 commit 数量，再关掉 selector 订阅跑一遍做对照。

**验收标准**：

- Profiler 里勾选一行时只出现该行组件的渲染记录，其他行没有记录。
- 断网或接口返回 500 时，界面回到勾选前的状态，控制台没有未处理异常。
- 未点击"已完成"视图前，Network 面板里没有它的 JS 请求。
- 首屏用同一份限速配置录制的长任务数量，不高于改造前的那次记录。
- 仓库 README 写清测量步骤，另一个人按步骤能复现出同样结论。

