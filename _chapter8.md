---

## Chapter 8: React超完整题库

### 8.1 React为什么出现与虚拟DOM

#### 8.1.1 为什么需要React

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

#### 8.1.2 虚拟DOM

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

---

### 8.2 Fiber架构

#### 8.2.1 为什么需要Fiber

React 15的Stack Reconciler存在致命问题：**同步递归无法中断**：

```
React 15协调器的问题:
  用户点击 → setState
    → React开始递归调和(reconcile), 10000个组件 → 100ms+
    → 期间无法响应用户输入/动画 → 页面卡顿 (jank)
```

Fiber的核心目标：**将协调过程拆分为可中断的工作单元**。

#### 8.2.2 Fiber节点数据结构

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

```
Fiber树结构 (双缓冲):

  ┌─────────────────────────────────────────────┐
  │          current tree (已渲染,显示中)          │
  │           A (Fiber)                           │
  │         /  |   \                              │
  │        B   C    D                             │
  │       / \       |                             │
  │      E   F      G                             │
  └─────────────────────────────────────────────┘
                      ↓ setState
                      ↓ 克隆A创建A' (workInProgress)
  ┌─────────────────────────────────────────────┐
  │        workInProgress tree (构建中)          │
  │           A' (Fiber, alternate=A)           │
  │         /  |   \                              │
  │        B'  C'   D'                           │
  │                                             │
  │   构建完成后 → alternate指针切换              │
  │   current = workInProgress  (原子性替换)     │
  └─────────────────────────────────────────────┘
```

#### 8.2.3 Work Loop (可中断的协调)

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
  //    child → sibling → return.sibling → 回溯
}
```

**Fiber双缓冲优势：**
1. 屏幕上始终展示完整的旧树，没有半成品状态
2. 新树构建完成后再一次性替换，更新原子化
3. 通过`alternate`指针实现O(1)的树切换

---

### 8.3 React Diff算法

React Diff是Fiber架构的"协调"阶段，通过比较新旧虚拟DOM树找出最小更新集合。

#### 8.3.1 三大策略

```
React Diff的三个核心前提:
  1. Web DOM节点跨层级操作很少 → tree diff用O(n)算法
  2. 不同类型的元素产生不同树 → component diff
  3. 通过key标记稳定元素 → element diff

                    React Diff
                       │
        ┌──────────────┼──────────────┐
        │ Tree Diff    │ Component Diff│  Element Diff
        │ O(n) 层级比较  │ 类型比较      │ key比较
        │ 只同层比较     │ 不同→卸载重建  │ 移动/新增/删除
        └──────────────┴──────────────┘
```

#### 8.3.2 Tree Diff

```
策略: 同层比较,不同则删除该层及以下所有节点

旧树: A→B→C → 新树: A→D→C
  1. 比较A(相同,保留)
  2. 比较B vs D (不同类型) → 卸载B,C → 创建D
  3. 创建C (挂到D下)

跨层级移动代价高 → 同层移动只需sibling指针调整
```

#### 8.3.3 Component Diff

```
策略: 同一层级比较组件类型
  类型相同 → diff该组件
  类型不同 → 卸载旧组件树 → 挂载新组件树

注意: PureComponent/React.memo可优化diff效率
React会先比较props,相同则跳过render
```

#### 8.3.4 Element Diff

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

---

### 8.4 为什么key不能用index

```jsx
// ❌ key=index: 删除中间项时,index对应的元素变了
// items=[A,B,C] key=[0,1,2]
// 删除A后: items=[B,C] key=[0,1]
// React diff:
//   key=0: B vs A → 内容变了 → UPDATE (应为DELETE!)
//   key=1: C vs B → 内容变了 → UPDATE (应为复用!)
// 总共2次UPDATE而不是1次DELETE+1次复用

// 有局部状态时更严重:
// items=[A,B,C] input值=[A,B,C]
// 删除A后: items=[B,C] → input值错位为[B,C]!

// ✅ key=id: 精确追踪元素
// items=[{id:1,A},{id:2,B},{id:3,C}]
// 删除id=1后: React精确识别 → 1次DELETE,2次复用
```

---

### 8.5 React调度机制与Lane模型

#### 8.5.1 Lane模型

```javascript
// 32位bit表示优先级 (位运算: O(1))
const lanes = {
  SyncLane:             0b0000000000000000000000000000001, // 同步最高
  InputContinuousLane:  0b0000000000000000000000000000100, // 拖拽/滚动
  DefaultLane:          0b0000000000000000000000000100000, // 普通setState
  TransitionLane:       0b0000000000000000000010000000000, // useTransition
  IdleLane:             0b0100000000000000000000000000000, // 空闲最低
};

// 位运算优势:
// lanes = laneA | laneB  标记多个优先级
// (lanes & lane) > 0    冲突检测
// lanes &= ~lane        清除已处理车道
```

```
Lane模型 (车道优先级):
  Bit:  31 ... 12 ... 8 ... 4 ... 0
         │           │    │    │
         │           │    │    ├─ SyncLane (用户点击)
         │           │    ├─ InputContinuousLane (拖拽)
         │           │    ├─ DefaultLane (普通更新)
         │           │    └─ TransitionLane (低优先)
         └────────────┴── (更高位=更低优先级)

调度流程:
  setState() → 分配lane → root.pendingLanes |= lane
    → scheduler.scheduleCallback(priority, callback)
    → 等待主线程空闲时执行

高优先级插队: 用户点击(SyncLane)可打断DefaultLane
  → 先处理SyncLane → 完成后恢复DefaultLane

useTransition:
  startTransition(() => setCount(1000));
  // setCount标记为TransitionLane (低优先级,可被打断)
```

---

### 8.6 Hooks原理

#### 8.6.1 Hooks基于Fiber链表的存储

```javascript
// 每个组件的Hooks按调用顺序串联成链表
// 挂在Fiber.memoizedState上

function MyComponent() {
  const [count, setCount] = useState(0);   // Hook #1
  const [name, setName] = useState('');    // Hook #2
  useEffect(() => {}, []);                  // Hook #3
}

// Fiber.memoizedState链表:
// ┌─────────┐    ┌─────────┐    ┌──────────┐
// │ Hook #1  │ → │ Hook #2  │ → │ Hook #3   │
// │ state:0  │    │ state:'' │    │ effect:fn │
// └─────────┘    └─────────┘    └──────────┘

// 为什么不能用条件:
// 第一次: [Hook#1, Hook#2, Hook#3]
// 第二次: [Hook#1, Hook#3]  (条件跳过#2)
// → Hook#3被错配到Hook#2的位置 → 状态错乱!
```

#### 8.6.2 Mount vs Update阶段

```javascript
function useState(initialValue) {
  const hook = currentlyRenderingFiber.memoizedState;

  if (hook) {
    // UPDATE: 复用已有Hook,遍历队列计算最新状态
    let update = hook.queue.pending;
    while (update) {
      hook.memoizedState = typeof update.action === 'function'
        ? update.action(hook.memoizedState)   // setState(prev=>...)
        : update.action;                      // setState(value)
      update = update.next;
    }
    return [hook.memoizedState, dispatch];
  }

  // MOUNT: 创建新Hook节点,初始化状态
  const newHook = createHook(initialValue);
  return [initialValue, dispatch];
}
```

#### 8.6.3 useEffect异步 vs useLayoutEffect同步

```javascript
// useEffect: 异步执行 (不阻塞paint)
useEffect(() => { /* 请求/订阅/定时器 */ }, [deps]);

// useLayoutEffect: 同步执行 (阻塞paint)
useLayoutEffect(() => { /* DOM测量/同步修改 */ }, [deps]);
```

```
执行时机:
  render() → commit(DOM mutations) → layoutEffect(同步)
    → paint(浏览器绘制) → effect(异步)

为什么useEffect是异步:
  - 不阻塞浏览器渲染,保证UI流畅
  - 多个effect可批量处理

为什么useLayoutEffect是同步:
  - DOM已更新但屏幕未绘制 → 可做同步测量
  - 修改后与paint在同帧 → 不会出现闪烁
```

---

### 8.7 React批量更新与React 18自动批处理

```javascript
// React 17: 事件处理器中自动批量 ✓
handleClick() {
  this.setState({ a: 1 }); // 不立即render
  this.setState({ b: 2 }); // 合并为1次render
}

// React 17: setTimeout/Promise中不批量 ✗
setTimeout(() => {
  this.setState({ a: 1 }); // 触发render #1
  this.setState({ b: 2 }); // 触发render #2  (共2次!)
}, 0);

// React 18: 所有场景都自动批处理 ✓
setTimeout(() => {
  setState({ a: 1 });
  setState({ b: 2 });
}); // 只触发1次render!

// createRoot() 开启自动批处理 (默认)
const root = ReactDOM.createRoot(el);
root.render(<App />);
```

---

### 8.8 Concurrent Mode (React 18)

```
阻塞渲染 vs 并发渲染:

阻塞 (React 17):
  Task1(500ms)→Task2(300ms)→Task3(200ms) = 1000ms

并发 (React 18):
  Task1(500ms)────────────→|
  Task2(300ms)──────→|
  Task3(200ms)→|           = ~500ms

React可在执行中暂停/恢复 → 不阻塞主线程
```

**Suspense:**

```jsx
<Suspense fallback={<Loading />}>
  <Profile />  {/* 异步加载时显示fallback */}
</Suspense>

const Profile = React.lazy(() => import('./Profile'));
// lazy原理:
// 返回Promise → 视为suspended child
// → 向上查找Suspense boundary → 显示fallback
// → Promise resolved → 重新渲染,显示实际组件
```

**useTransition:**

```jsx
function App() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = (e) => {
    setQuery(e.target.value); // 高优先级 (立即响应)

    startTransition(() => {
      setResults(search(e.target.value)); // 低优先级 (可中断)
    });
  };

  return (
    <div>
      <input value={query} onChange={handleSearch} />
      {isPending ? <Spinner /> : <Results items={results} />}
    </div>
  );
}
```

---

### 8.9 Next.js SSR原理

```javascript
// getStaticProps: 构建时生成静态HTML
export async function getStaticProps(context) {
  const posts = await fetchPosts();
  return { props: { posts }, revalidate: 60 }; // ISR
}

// getServerSideProps: 每次请求时SSR
export async function getServerSideProps(context) {
  const data = await fetchDataFromDB();
  return { props: { data } };
  // 或 { notFound: true } / { redirect: { destination: '/login' } }
}
```

```
ISR (Incremental Static Regeneration):

请求 → 检查缓存
  ├─ 无缓存 → SSR → 缓存HTML → 返回
  ├─ 未过期 → 直接返回缓存
  └─ 已过期 → 返回旧缓存 + 触发后台revalidate → 下次返回新缓存
```

---

### 8.10 Server Component 与 React Compiler

#### 8.10.1 Server Component (RSC)

```jsx
// Server Component (默认): 服务端执行,不发送JS
async function UsersPage() {
  const users = await db.query('SELECT * FROM users');
  return <UserList users={users} />;
}

// Client Component: 有hooks和交互
'use client';
function UserCard({ user }) {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>{user.name}</button>;
}
```

```
Server Component vs Client Component:

Server:  服务端执行,无bundle | 直接访问DB | async/await | ✗ hooks/状态
Client:  hooks/事件/浏览器API | bundle包含 | ✗ 直接访问DB
```

#### 8.10.2 React Compiler & React Forget

```javascript
// React Compiler: Babel Plugin,自动优化
// 源码:
function Counter({ count, onIncrement }) {
  return <button onClick={onIncrement}>{count}</button>;
}

// 编译后(自动添加memo+比较函数):
const _comp = React.memo(function Counter({ count, onIncrement }) {
  return <button onClick={onIncrement}>{count}</button>;
});

// React Forget: 更激进的优化编译器
// - 自动添加 React.memo
// - 自动修正 useCallback/useMemo
// - 自动提取不必要的闭包捕获
```

---

### 8.11 状态管理: Zustand / Jotai / Recoil

#### 8.11.1 Zustand原理

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

#### 8.11.2 Jotai原理

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

#### 8.11.3 Recoil原理

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

---

### 8.12 Redux单向数据流

```
Action → Dispatch → Reducer → New State → View Update
  ↑                                              │
  └──────────────────────────────────────────────┘

为什么单向数据流重要:
  - 可预测性: 任何状态变化都来自明确的action
  - 可追踪: action是纯文本描述 {type:'INCREMENT'}
  - 可重现: 同action序列 → 同状态
  - 可测试: reducer是纯函数
  - 时间旅行: action序列可存储/回放(Redux DevTools)
```

```
Redux vs MobX vs Zustand:

Redux: Store→Action→Reducer→Store→UI (纯函数)
       大型项目 + DevTools时间旅行

MobX: Action↔Observable State↔Computed↔UI (响应式)
       中型项目,自动追踪依赖

Zustand: Store(极简) → UI
       轻量项目,无样板代码
```

---

### 8.13 React性能优化

#### 8.13.1 避免重复渲染

```jsx
// ❌ 原因1: 父组件渲染 → 所有子组件无条件重新渲染
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

// ❌ 原因2: 每次新建对象/数组引用
<Child config={{ theme: 'dark' }} />  // 每次都是新对象

// ❌ 原因3: 每次新建函数
<Child onClick={() => doSomething()} />
```

#### 8.13.2 React.memo / useMemo / useCallback

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

#### 8.13.3 Immutable原则

```javascript
// ✅ 创建新引用
setState({ ...state, items: [...state.items, newItem] });

// ✅ Immer
import { produce } from 'immer';
setState(produce(draft => { draft.items.push(newItem); }));

// 为什么重要: React.memo/useMemo基于浅比较(===)
```

#### 8.13.4 React.memo原理

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

#### 8.13.5 useMemo为什么不能乱用

```
❌ 过早优化: useMemo(() => 1+1, []) → 计算极快,缓存开销更大
❌ 错误依赖: useMemo(() => compute(count), []) → 永远是初始值
❌ 渲染中setState: useMemo里调用setState → 可能死循环

✅ 昂贵计算: 排序/搜索/复杂计算 → 收益大于开销
✅ 稳定引用: 传给React.memo子组件的对象/数组
✅ 派生计算: 避免每次render重新计算
```

---

### 8.14 React合成事件原理

```
React 17+ Fiber上的事件处理:

用户点击button → 浏览器dispatchEvent('click')
  ↓
React捕获事件(挂载在root节点, 而非document)
  ↓
构建SyntheticEvent (跨浏览器兼容)
  ↓
从target fiber向上遍历(通过return指针):
  FiberNode(button) → fiber.return → ... → root
    │
    │ 收集所有onClick处理器
    │ 按capturing → target → bubbling顺序执行
    │
  FiberNode(div)

为什么用合成事件:
  1. 跨浏览器兼容 (IE/Firefox/Chrome行为一致)
  2. 事件委托 (减少绑定数量)
  3. 对象池复用 (减少GC压力)
  4. React 17+根节点隔离 (支持多版本React共存)
```

---

### 8.15 Hooks为什么不能条件调用

```javascript
// ❌ 错误:
function Comp({ show }) {
  const [a, setA] = useState(0);  // Hook #1
  if (show) {
    const [b, setB] = useState('');  // Hook #2 (条件)
  }
  const [c, setC] = useState(0);  // Hook #3/#2?
  return <div>{a}{show && b}{c}</div>;
}

// show=true: Hook链表=[#1, #2, #3]
// show=false: Hook链表=[#1, #3]
// → Hook#3被错配到Hook#2的位置 → 状态错乱!

// ✅ 正确: 始终按顺序调用
function Comp({ show }) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(''); // 始终调用
  const [c, setC] = useState(0);
  return <div>{a}{show && b}{c}</div>;
}
```

---

### 8.16 React Router原理

#### 8.16.1 Hash路由 vs History路由

```javascript
// Hash: https://app.com/#/home
//   ✓ 不需要服务器配置,刷新不404
//   ✗ URL带#号,SEO不友好

// History: https://app.com/home
//   ✓ 干净URL,SEO友好
//   ✗ 需要服务器配置(所有路径返回index.html)
```

#### 8.16.2 React Router实现原理

```javascript
// 1. 监听路由变化
function useRouter() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const fn = () => setPath(window.location.pathname);
    window.addEventListener('popstate', fn);
    return () => window.removeEventListener('popstate', fn);
  }, []);
  return path;
}

// 2. 路由匹配 (将 /users/:id 转为正则)
function matchRoute(path, routePath) {
  const paramNames = [];
  const regex = routePath.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  const match = path.match(new RegExp('^' + regex + '$'));
  if (!match) return null;
  return paramNames.reduce((params, name, i) => {
    params[name] = match[i + 1];
    return params;
  }, {});
}

// 3. 嵌套路由通过<Outlet>渲染子路由
```

```
React Router匹配算法:

URL: /users/123/posts/456

Routes:
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/users/:userId" element={<User />}>
      <Route path="posts/:postId" element={<Post />} />
    </Route>
  </Routes>

匹配过程:
  1. / → 否
  2. /users/:userId → 是, userId=123
     → User渲染, Outlet渲染子路由
  3. posts/:postId → 是, postId=456 → Post渲染
```

---

### 8.17 React Query原理

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

---

### 8.18 React权限系统实现

```javascript
// 基于RBAC的权限系统:

const permissions = {
  'user:read':   ['admin','editor','viewer'],
  'user:write':  ['admin','editor'],
  'user:delete': ['admin'],
};

function usePermission(action, resource) {
  const { user } = useAuth();
  return permissions[`${resource}:${action}`]?.includes(user?.role) ?? false;
}

const Can = ({ action, resource, children, fallback = null }) => {
  return usePermission(action, resource) ? children : fallback;
};

// 使用:
<Can action="delete" resource="user" fallback={<span>无权限</span>}>
  <DeleteButton />
</Can>

// 高阶组件:
function withPermission(Component, action, resource) {
  return (props) => usePermission(action, resource)
    ? <Component {...props} /> : <AccessDenied />;
}
```

---

### 8.19 React微前端实现 (Module Federation)

```javascript
// Webpack 5 Module Federation: 共享代码,独立部署

// Host (主应用):
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    remoteApp: 'remoteApp@https://remote.com/remoteEntry.js',
  },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
});

// Remote (子应用):
new ModuleFederationPlugin({
  name: 'remoteApp',
  filename: 'remoteEntry.js',
  exposes: {
    './ProductList': './src/ProductList',
    './UserProfile': './src/UserProfile',
  },
  shared: { react: { singleton: true } },
});

// Host中使用Remote组件:
const RemoteProductList = React.lazy(() => import('remoteApp/ProductList'));
```

```
Module Federation架构:

┌────────────┐     remoteEntry.js     ┌────────────┐
│  Host App  │ ←────────────────────  │ Remote App │
│            │    ProductList.js      │            │
│  <Remote   │ ←──── chunk ─────────→ │ exposes:   │
│   Product  │                        │  ProductList│
│   List />  │   (共享react/react-dom) │  UserProfile│
└────────────┘                        └────────────┘
```

---

### 8.20 React大规模状态管理方案

```
大规模React应用状态分层:

┌─────────────────────────────────────────────────────────┐
│  Global (Redux Toolkit / Zustand)                       │
│  → 用户认证, 主题, 全局通知, 跨页面共享状态              │
└────────────────────┬────────────────────────────────────┘
┌────────────────────┴────────────────────────────────────┐
│  Feature (Context / Jotai)                              │
│  → 功能模块内共享: 多个独立Context/Store                 │
│  → 避免单一巨型Context (所有Consumer重渲染)               │
└────────────────────┬────────────────────────────────────┘
┌────────────────────┴────────────────────────────────────┐
│  Local (useState / useReducer)                         │
│  → 组件私有: 表单, 临时UI, 动画                          │
└─────────────────────────────────────────────────────────┘

实践建议:
  1. 状态尽量下沉 (不放根组件)
  2. Context按功能拆分 (AuthContext, ThemeContext分开)
  3. Server State → React Query/SWR (不放Redux)
  4. URL作为状态 (搜索/筛选/分页 → URLSearchParams)
  5. 派生状态用selector/memo: 避免重复计算
  6. Immutable优先: 方便DevTools调试
```

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

*（React终极题库 · 完）*
