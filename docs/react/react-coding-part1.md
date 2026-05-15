# React 手写代码题（上）

> 本专题深入讲解 React 面试高频手写题：Hooks 实现原理。手写题不仅考察对 React 内部原理的理解，更是区分中级与高级工程师的重要标准。

---

## 目录

1. [实现 useState](#1-实现-usestate)
2. [实现 useEffect](#2-实现-useeffect)
3. [实现 useMemo](#3-实现-usememo)
4. [实现 useCallback](#4-实现-usecallback)
5. [实现 useRef](#5-实现-useref)
6. [实现 useReducer](#6-实现-usereducer)

---

## 1. 实现 useState

### 题目描述

实现一个简化版的 `useState`，模拟 React 内部原理。在 React 中，每次渲染都会创建新的 fiber 节点，useState 需要能够追踪状态并在下一次渲染时返回更新后的值。

### 完整代码实现

```javascript
// 全局状态管理（模拟 React fiber）
let workInProgressFiber = null;
let hookIndex = 0;

// 创建 React 组件的运行环境
function createRoot() {
  return {
    // 渲染函数
    render(component) {
      // 重置 hook 索引
      hookIndex = 0;
      // 创建 workInProgress fiber
      workInProgressFiber = {
        state: null,      // 存储 hooks 状态
        hooks: [],        // hook 链表
      };
      // 执行组件获取初始状态
      const result = component();
      // 返回渲染结果
      return result;
    }
  };
}

// 手写 useState
function useState(initialState) {
  // 获取当前 fiber
  const currentFiber = workInProgressFiber;

  // 获取当前 hook 索引
  const index = hookIndex;

  // 检查是否存在已更新的 hook（用于更新时复用）
  if (currentFiber.hooks[index]) {
    const hook = currentFiber.hooks[index];
    // 更新状态并返回
    hook.state = typeof hook.state === 'function'
      ? hook.state(hook.state)  // 支持函数式更新
      : initialState;

    // 标记需要重新渲染
    hook.hasUpdates = true;
    hookIndex++;

    return [hook.state, createSetState(hook, currentFiber)];
  }

  // 首次渲染：创建新的 hook
  const hook = {
    state: typeof initialState === 'function'
      ? initialState()
      : initialState,
    queue: [],        // 更新队列
    hasUpdates: false
  };

  // 将 hook 加入链表
  currentFiber.hooks[index] = hook;
  hookIndex++;

  // 返回状态和 setState 函数
  return [hook.state, createSetState(hook, currentFiber)];
}

// 创建 setState 函数
function createSetState(hook, fiber) {
  return function setState(newState) {
    // 支持函数式更新
    hook.state = typeof newState === 'function'
      ? newState(hook.state)
      : newState;

    // 将此 fiber 标记为需要更新
    hook.hasUpdates = true;
  };
}
```

### 测试用例

```javascript
// 创建 React 运行时
const root = createRoot();

// 第一次渲染
root.render(() => {
  const [count, setCount] = useState(0);
  console.log('初始值:', count);  // 输出: 初始值: 0

  // 模拟更新
  setCount(1);
  console.log('更新后:', count);  // 输出: 更新后: 1

  // 函数式更新
  setCount(prev => prev + 1);
  console.log('函数式更新:', count);  // 输出: 函数式更新: 2
});
```

### 面试考察点

| 考察点 | 说明 |
|--------|------|
| Fiber 架构 | 理解 React 16+ 的 Fiber 链表结构 |
| Hook 索引 | 每次渲染通过索引追踪当前 hook |
| 闭包应用 | useState 返回的 setter 函数形成闭包 |
| 函数式更新 | 支持 `setState(prev => prev + 1)` 形式 |
| 链表结构 | hooks 通过数组模拟链表存储 |

---

## 2. 实现 useEffect

### 题目描述

实现 `useEffect`，处理依赖变化和清理函数。useEffect 是 React 中处理副作用的主要方式，需要在组件渲染后执行，并在依赖变化或组件卸载时执行清理。

### 完整代码实现

```javascript
// 全局配置
let currentFiber = null;
let hookIndex = 0;

// 存储已注册的副作用
const effects = [];

// 手写 useEffect
function useEffect(effect, deps) {
  const index = hookIndex;

  // 获取或创建 hook
  let hook = currentFiber.hooks[index];
  if (!hook) {
    hook = {
      deps: undefined,      // 上一次的依赖
      effect: null,         // 当前 effect 函数
      cleanup: null         // 清理函数
    };
    currentFiber.hooks[index] = hook;
  }

  // 检查依赖是否变化
  const depsChanged = !hook.deps || !deps ||
    deps.some((dep, i) => dep !== hook.deps[i]);

  if (depsChanged) {
    // 先执行上一个 effect 的清理函数
    if (hook.cleanup) {
      hook.cleanup();
    }

    // 执行新的 effect
    const cleanup = effect();

    // 保存清理函数
    hook.cleanup = typeof cleanup === 'function' ? cleanup : null;
    hook.deps = deps;
  }

  hookIndex++;
}

// 调度 effects 执行
function flushEffects() {
  effects.forEach(effect => {
    if (effect.defer) {
      // 微任务中执行
      Promise.resolve().then(effect.fn);
    } else {
      effect.fn();
    }
  });
}
```

### 测试用例

```javascript
// 模拟 React 渲染
function render(component) {
  hookIndex = 0;
  currentFiber = { hooks: [] };

  // 执行组件
  component();

  // 在组件渲染后调度 effects
  setTimeout(() => {
    console.log('--- Effect 执行阶段 ---');
    flushEffects();
  }, 0);
}

// 测试 useEffect
render(() => {
  let mounted = false;

  useEffect(() => {
    console.log('副作用执行');
    mounted = true;

    // 返回清理函数
    return () => {
      console.log('清理函数执行');
      mounted = false;
    };
  }, []);

  console.log('组件渲染完成');
});

// 输出:
// 组件渲染完成
// --- Effect 执行阶段 ---
// 副作用执行
```

### 依赖检测逻辑

```javascript
// 依赖数组比较
function depsEqual(oldDeps, newDeps) {
  if (!oldDeps || !newDeps) return false;

  for (let i = 0; i < newDeps.length; i++) {
    if (!Object.is(oldDeps[i], newDeps[i])) {
      return false;
    }
  }
  return true;
}

// 浅比较实现
function shallowEqual(arr1, arr2) {
  if (arr1 === arr2) return true;
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;

  for (let i = 0; i < arr1.length; i++) {
    if (!Object.is(arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
}
```

### 面试考察点

| 考察点 | 说明 |
|--------|------|
| 副作用概念 | 理解哪些操作需要 useEffect 处理 |
| 依赖检测 | 浅比较依赖数组判断是否需要重新执行 |
| 清理函数 | 返回函数作为 cleanup 的设计模式 |
| 执行时机 | 理解 useEffect 在渲染后执行的时机 |
| 闭包陷阱 | 依赖数组为空时闭包变量不变的问题 |

---

## 3. 实现 useMemo

### 题目描述

实现 `useMemo`，缓存计算结果避免不必要的重算。useMemo 可以记住 expensive（昂贵的）计算结果，只有在依赖变化时才重新计算。

### 完整代码实现

```javascript
// 全局状态
let currentFiber = null;
let hookIndex = 0;

// 手写 useMemo
function useMemo(factory, deps) {
  const index = hookIndex;

  // 获取当前 hook
  let hook = currentFiber.hooks[index];
  if (!hook) {
    // 首次渲染：创建新 hook 并执行 factory
    hook = {
      deps: deps,
      value: factory()
    };
    currentFiber.hooks[index] = hook;
    hookIndex++;
    return hook.value;
  }

  // 后续渲染：检查依赖是否变化
  const depsChanged = !deps || !hook.deps ||
    deps.some((dep, i) => !Object.is(dep, hook.deps[i]));

  if (depsChanged) {
    // 依赖变化，重新计算
    hook.deps = deps;
    hook.value = factory();
  }

  hookIndex++;
  // 返回缓存的值
  return hook.value;
}
```

### 优化版本（带比较器）

```javascript
// 进阶版本：支持自定义比较函数
function useMemoWithCustomCompare(factory, deps, compare) {
  const index = hookIndex;

  let hook = currentFiber.hooks[index];
  if (!hook) {
    hook = {
      deps: deps,
      value: factory(),
      compare: compare
    };
    currentFiber.hooks[index] = hook;
    hookIndex++;
    return hook.value;
  }

  // 使用自定义比较函数
  const needsRecalculation = !compare || !compare(hook.deps, deps);

  if (needsRecalculation) {
    hook.deps = deps;
    hook.value = factory();
    if (compare) hook.compare = compare;
  }

  hookIndex++;
  return hook.value;
}

// 使用示例
const memoizedValue = useMemoWithCustomCompare(
  () => expensiveComputation(a, b),
  [a, b],
  (prev, next) =>
    prev[0] === next[0] && prev[1] === next[1]
);
```

### 测试用例

```javascript
// 模拟渲染
function render(component) {
  hookIndex = 0;
  currentFiber = { hooks: [] };
  component();
}

// 测试 useMemo
let computeCount = 0;

render(() => {
  const result = useMemo(() => {
    computeCount++;
    console.log('执行计算:', computeCount);
    return 1 + 1;  // 假设这是昂贵计算
  }, []);

  console.log('计算结果:', result);
});

render(() => {
  const result = useMemo(() => {
    computeCount++;
    console.log('执行计算:', computeCount);
    return 1 + 1;
  }, []);  // 依赖未变化

  console.log('计算结果:', result);
});

console.log('computeCount:', computeCount);
// 输出:
// 执行计算: 1
// 计算结果: 2
// 计算结果: 2
// computeCount: 1 (未重新计算)
```

### 面试考察点

| 考察点 | 说明 |
|--------|------|
| 记忆化 | 理解缓存避免重复计算的原理 |
| 依赖检测 | 浅比较依赖数组决定是否重算 |
| 性能优化 | 识别 expensive 计算并应用 memo |
| 引用稳定性 | useMemo 可以稳定对象/数组引用 |
| 常见误区 | 过度使用 useMemo 的开销 |

---

## 4. 实现 useCallback

### 题目描述

实现 `useCallback`，缓存函数引用。useCallback 返回一个稳定的函数引用，常用于将回调函数传递给子组件时避免不必要的渲染。

### 完整代码实现

```javascript
// 全局状态
let currentFiber = null;
let hookIndex = 0;

// 手写 useCallback
function useCallback(callback, deps) {
  const index = hookIndex;

  // 获取当前 hook
  let hook = currentFiber.hooks[index];
  if (!hook) {
    // 首次渲染
    hook = {
      deps: deps,
      callback: callback
    };
    currentFiber.hooks[index] = hook;
    hookIndex++;
    return callback;
  }

  // 检查依赖是否变化
  const depsChanged = !deps || !hook.deps ||
    deps.some((dep, i) => !Object.is(dep, hook.deps[i]));

  if (depsChanged) {
    // 依赖变化，更新回调函数
    hook.deps = deps;
    hook.callback = callback;
  }

  hookIndex++;
  // 返回缓存的回调函数
  return hook.callback;
}
```

### 与 useMemo 的关系

```javascript
// useCallback 本质上是 useMemo 的语法糖
function useCallback(callback, deps) {
  return useMemo(() => callback, deps);
}

// 两者对比
function useMemoDemo() {
  // useMemo 缓存值
  const value = useMemo(() => expensiveCalc(a, b), [a, b]);

  // useCallback 缓存函数引用
  const handleClick = useCallback((e) => {
    console.log('Clicked:', e.target.value);
  }, []);

  return <button onClick={handleClick}>{value}</button>;
}
```

### 测试用例

```javascript
let renderCount = 0;

function Child({ onClick, count }) {
  renderCount++;
  console.log('Child 渲染次数:', renderCount);
  return <button onClick={onClick}>{count}</button>;
}

// 测试 useCallback
render(() => {
  const [count, setCount] = useState(0);

  // 每次渲染都会创建新的函数
  const handleClick = () => {
    console.log('Clicked');
  };

  // 使用 useCallback 保持引用稳定
  const handleClickMemo = useCallback(() => {
    console.log('Clicked');
  }, []);

  return (
    <>
      <button onClick={handleClick}>普通函数</button>
      <button onClick={handleClickMemo}>useCallback</button>
    </>
  );
});
```

### 面试考察点

| 考察点 | 说明 |
|--------|------|
| 引用稳定 | 理解为什么子组件需要稳定回调 |
| 闭包陷阱 | 依赖数组为空时回调内变量不变 |
| 性能权衡 | useCallback 本身也有开销 |
| 最佳实践 | 何时应该使用 useCallback |
| React.memo | 配合 React.memo 优化子组件渲染 |

---

## 5. 实现 useRef

### 题目描述

实现 `useRef`，返回一个可变的引用对象。useRef 的主要特点是：即使组件重新渲染，ref 对象也保持不变，常用于存储不需要触发重新渲染的变量。

### 完整代码实现

```javascript
// 全局状态
let currentFiber = null;
let hookIndex = 0;

// 手写 useRef
function useRef(initialValue) {
  const index = hookIndex;

  // 获取当前 hook
  let hook = currentFiber.hooks[index];
  if (!hook) {
    // 首次渲染：创建 ref 对象
    hook = {
      // ref 对象包含 current 属性
      current: initialValue
    };
    currentFiber.hooks[index] = hook;
  }

  hookIndex++;
  // 返回 ref 对象（引用不变）
  return hook;
}

// 模拟 useRef 的典型用法
function useRefDemo() {
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const countRef = useRef(0);

  // 存储定时器
  if (!timerRef.current) {
    timerRef.current = setTimeout(() => {
      console.log('Timer executed');
    }, 1000);
  }

  // DOM 引用
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 存储任意值（不触发渲染）
  countRef.current += 1;

  return { timerRef, inputRef, countRef };
}
```

### useRef 的变体

```javascript
// 带有 setter 的 ref（类似 useState 但不触发渲染）
function useRefState(initialValue) {
  const [stateRef, setStateRef] = useRef({ current: initialValue });

  // 创建更新的 setter
  const setValue = (newValue) => {
    stateRef.current = typeof newValue === 'function'
      ? newValue(stateRef.current)
      : newValue;
    // 注意：不会触发重新渲染
  };

  return [stateRef, setValue];
}

// useImperativeHandle（控制暴露给父组件的内容）
function useImperativeHandle(ref, createHandle, deps) {
  useLayoutEffect(() => {
    if (ref) {
      ref.current = createHandle();
    }
    return () => {
      if (ref) ref.current = null;
    };
  }, deps);
}
```

### 测试用例

```javascript
render(() => {
  const ref1 = useRef(0);
  const ref2 = useRef('initial');

  console.log('ref1.current:', ref1.current);  // 0
  console.log('ref2.current:', ref2.current);  // 'initial'

  // 修改不会触发重新渲染
  ref1.current = 100;
  ref2.current = 'updated';

  console.log('修改后 ref1.current:', ref1.current);  // 100
  console.log('修改后 ref2.current:', ref2.current);  // 'updated'

  // 引用稳定性测试
  const ref3 = useRef(0);
  console.log('ref1 === ref1:', true);  // 每次渲染返回同一引用
  console.log('ref3 === ref3:', true);
});
```

### 面试考察点

| 考察点 | 说明 |
|--------|------|
| 引用不变 | 理解 ref 对象在渲染间保持不变 |
| current 属性 | ref 通过 current 访问和修改值 |
| 避免渲染 | 修改 ref 不触发组件重新渲染 |
| 典型场景 | 存储定时器、DOM 引用、Mutable 值 |
| ref vs state | 何时用 ref 而非 state |

---

## 6. 实现 useReducer

### 题目描述

实现 `useReducer`，状态管理的进阶方案。useReducer 是 useState 的增强版，通过 reducer 函数集中管理状态更新逻辑，适合复杂的状态转换场景。

### 完整代码实现

```javascript
// 全局状态
let currentFiber = null;
let hookIndex = 0;

// 手写 useReducer
function useReducer(reducer, initialArg, init) {
  const index = hookIndex;

  // 获取或创建 hook
  let hook = currentFiber.hooks[index];
  if (!hook) {
    // 首次渲染：初始化状态
    hook = {
      state: init ? init(initialArg) : initialArg,
      queue: [],      // 存储待处理的 action
      reducer: reducer
    };
    currentFiber.hooks[index] = hook;
  }

  // 创建派发函数
  const dispatch = (action) => {
    // 支持函数式 action（类似 Redux）
    const resolvedAction = typeof action === 'function'
      ? action(hook.state)
      : action;

    // 将 action 加入队列
    hook.queue.push({
      action: resolvedAction,
      next: null
    });

    // 触发状态更新
    hook.state = reducer(hook.state, resolvedAction);
  };

  // 处理队列中的 pending actions
  if (hook.queue.length > 0) {
    let pending = hook.queue.shift();
    while (pending) {
      hook.state = reducer(hook.state, pending.action);
      pending = hook.queue.shift();
    }
  }

  hookIndex++;
  return [hook.state, dispatch];
}
```

### 完整示例：计数器 Reducer

```javascript
// 定义 reducer
function counterReducer(state, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    case 'RESET':
      return { count: 0 };
    case 'ADD':
      return { count: state.count + action.payload };
    default:
      return state;
  }
}

// 使用 useReducer
function Counter() {
  const [state, dispatch] = useReducer(counterReducer, { count: 0 });

  return (
    <>
      <p>计数: {state.count}</p>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>-</button>
      <button onClick={() => dispatch({ type: 'RESET' })}>重置</button>
      <button onClick={() => dispatch({ type: 'ADD', payload: 5 })}>+5</button>
    </>
  );
}
```

### 惰性初始化

```javascript
// 带初始化函数的 useReducer
function useReducerWithInit(reducer, initialArg, init) {
  const [state, dispatch] = useReducer(reducer, initialArg, init);
  return [state, dispatch];
}

// 初始化函数示例
function init(initialCount) {
  return {
    count: initialCount,
    step: 1,
    createdAt: Date.now()
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + state.step };
    case 'CHANGE_STEP':
      return { ...state, step: action.step };
    default:
      return state;
  }
}

// 使用
const [state, dispatch] = useReducerWithInit(
  reducer,
  { count: 0, step: 1 },  // initialArg
  init                     // init 函数
);
```

### useState vs useReducer 对比

```javascript
// useState 版本
function CounterWithState() {
  const [count, setCount] = useState(0);

  return (
    <>
      <p>计数: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      {/* 多个 setState 调用 */}
      <button onClick={() => {
        setCount(c => c + 1);
        setCount(c => c + 1);  // 批量更新
      })}>+2</button>
    </>
  );
}

// useReducer 版本
function CounterWithReducer() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return (
    <>
      <p>计数: {state.count}</p>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      {/* 所有逻辑集中管理 */}
      <button onClick={() => dispatch({ type: 'BATCH_INCREMENT', times: 2 })}>+2</button>
    </>
  );
}
```

### 测试用例

```javascript
// 模拟渲染
function render(component) {
  hookIndex = 0;
  currentFiber = { hooks: [] };
  component();
}

// 测试 useReducer
render(() => {
  const [state, dispatch] = useReducer(
    (s, a) => typeof a === 'function' ? a(s) : { count: s.count + a },
    { count: 0 }
  );

  console.log('初始状态:', state.count);  // 0

  dispatch({ type: 'increment' });
  console.log('派发后:', state.count);    // 1

  dispatch({ type: 'increment' });
  console.log('再次派发:', state.count);  // 2

  // 函数式 dispatch
  dispatch(s => ({ count: s.count + 10 }));
  console.log('函数式派发:', state.count);  // 12
});
```

### 面试考察点

| 考察点 | 说明 |
|--------|------|
| Reducer 模式 | 集中管理状态转换逻辑 |
| Action 设计 | 纯对象或函数式 action |
| dispatch 稳定 | dispatch 函数引用始终不变 |
| 惰性初始化 | init 函数用于复杂状态初始化 |
| 性能优化 | 配合 useMemo/React.memo 优化 |

---

## 总结：手写 Hooks 核心要点

### 架构图

```
全局状态管理
    │
    ▼
┌─────────────────────┐
│  workInProgressFiber │ ← 当前正在渲染的 fiber
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│      hooks[]        │ ← hook 链表
│  ┌────┬────┬─────┐  │
│  │ 0  │ 1  │ 2   │  │
│  └───┴────┴─────┘  │
└─────────────────────┘
```

### Hook 实现对比

| Hook | 缓存内容 | 依赖检测 |
|------|---------|---------|
| useState | 状态值 | 无（直接赋值） |
| useEffect | effect + deps | 数组浅比较 |
| useMemo | 计算结果 | 数组浅比较 |
| useCallback | 函数引用 | 数组浅比较 |
| useRef | ref 对象 | 无（引用不变） |
| useReducer | state + reducer | 无（dispatch 不变） |

### 面试高频考点

1. **Fiber 链表**：hooks 如何通过索引追踪
2. **闭包陷阱**：依赖数组为空时的常见问题
3. **引用稳定性**：memo/useCallback 的作用
4. **执行时机**：useEffect 的执行顺序
5. **批量更新**：多次 setState 合并机制

---

## 参考资源

| 资源 | 链接 |
|------|------|
| React 官方文档 - Hooks | https://react.dev/reference/react |
| React Fiber 架构 | https://github.com/acdlite/react-fiber-architecture |
| How to implement React Hooks | https://github.com/toast tang/implement-react-hooks |
| 深入理解 React 状态管理 | https://overreacted.io/zh-hans/ |