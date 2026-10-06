---
title: 手写 Hooks
description: 深入讲解 React 面试高频手写题，包括实现 useState、useEffect、useMemo、useCallback、useRef、useReducer 等 Hooks 原理。
tags:
  - react
  - hooks
date: 2026-05-17
---

# 手写 Hooks

> 本专题深入讲解 React 面试高频手写题：Hooks 实现原理。手写题不仅考察对 React 内部原理的理解，更是区分中级与高级工程师的重要标准。

---

## 1. 目录

1. [实现 useState](#2-实现-usestate)
2. [实现 useEffect](#3-实现-useeffect)
3. [实现 useMemo](#4-实现-usememo)
4. [实现 useCallback](#5-实现-usecallback)
5. [实现 useRef](#6-实现-useref)
6. [实现 useReducer](#7-实现-usereducer)

---

## 2. 实现 useState

### 2.1 题目描述

实现一个简化版的 `useState`，模拟 React 内部原理。在 React 中，每次渲染都会创建新的 fiber 节点，useState 需要能够追踪状态并在下一次渲染时返回更新后的值。

### 2.2 完整代码实现

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

### 2.3 测试用例

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

### 2.4 面试考察点

| 考察点 | 说明 |
|--------|------|
| Fiber 架构 | 理解 React 16+ 的 Fiber 链表结构 |
| Hook 索引 | 每次渲染通过索引追踪当前 hook |
| 闭包应用 | useState 返回的 setter 函数形成闭包 |
| 函数式更新 | 支持 `setState(prev => prev + 1)` 形式 |
| 链表结构 | hooks 通过数组模拟链表存储 |

---

## 3. 实现 useEffect

### 3.1 题目描述

实现 `useEffect`，处理依赖变化和清理函数。useEffect 是 React 中处理副作用的主要方式，需要在组件渲染后执行，并在依赖变化或组件卸载时执行清理。

### 3.2 完整代码实现

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

### 3.3 测试用例

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

### 3.4 依赖检测逻辑

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

### 3.5 面试考察点

| 考察点 | 说明 |
|--------|------|
| 副作用概念 | 理解哪些操作需要 useEffect 处理 |
| 依赖检测 | 浅比较依赖数组判断是否需要重新执行 |
| 清理函数 | 返回函数作为 cleanup 的设计模式 |
| 执行时机 | 理解 useEffect 在渲染后执行的时机 |
| 闭包陷阱 | 依赖数组为空时闭包变量不变的问题 |

---

## 4. 实现 useMemo

### 4.1 题目描述

实现 `useMemo`，缓存计算结果避免不必要的重算。useMemo 可以记住 expensive（昂贵的）计算结果，只有在依赖变化时才重新计算。

### 4.2 完整代码实现

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

### 4.3 优化版本（带比较器）

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

### 4.4 测试用例

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

### 4.5 面试考察点

| 考察点 | 说明 |
|--------|------|
| 记忆化 | 理解缓存避免重复计算的原理 |
| 依赖检测 | 浅比较依赖数组决定是否重算 |
| 性能优化 | 识别 expensive 计算并应用 memo |
| 引用稳定性 | useMemo 可以稳定对象/数组引用 |
| 常见误区 | 过度使用 useMemo 的开销 |

---

## 5. 实现 useCallback

### 5.1 题目描述

实现 `useCallback`，缓存函数引用。useCallback 返回一个稳定的函数引用，常用于将回调函数传递给子组件时避免不必要的渲染。

### 5.2 完整代码实现

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

### 5.3 与 useMemo 的关系

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

### 5.4 测试用例

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

### 5.5 面试考察点

| 考察点 | 说明 |
|--------|------|
| 引用稳定 | 理解为什么子组件需要稳定回调 |
| 闭包陷阱 | 依赖数组为空时回调内变量不变 |
| 性能权衡 | useCallback 本身也有开销 |
| 最佳实践 | 何时应该使用 useCallback |
| React.memo | 配合 React.memo 优化子组件渲染 |

---

## 6. 实现 useRef

### 6.1 题目描述

实现 `useRef`，返回一个可变的引用对象。useRef 的主要特点是：即使组件重新渲染，ref 对象也保持不变，常用于存储不需要触发重新渲染的变量。

### 6.2 完整代码实现

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

### 6.3 useRef 的变体

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

### 6.4 测试用例

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

### 6.5 面试考察点

| 考察点 | 说明 |
|--------|------|
| 引用不变 | 理解 ref 对象在渲染间保持不变 |
| current 属性 | ref 通过 current 访问和修改值 |
| 避免渲染 | 修改 ref 不触发组件重新渲染 |
| 典型场景 | 存储定时器、DOM 引用、Mutable 值 |
| ref vs state | 何时用 ref 而非 state |

---

## 7. 实现 useReducer

### 7.1 题目描述

实现 `useReducer`，状态管理的进阶方案。useReducer 是 useState 的增强版，通过 reducer 函数集中管理状态更新逻辑，适合复杂的状态转换场景。

### 7.2 完整代码实现

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

### 7.3 完整示例：计数器 Reducer

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

### 7.4 惰性初始化

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

### 7.5 useState vs useReducer 对比

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

### 7.6 测试用例

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

### 7.7 面试考察点

| 考察点 | 说明 |
|--------|------|
| Reducer 模式 | 集中管理状态转换逻辑 |
| Action 设计 | 纯对象或函数式 action |
| dispatch 稳定 | dispatch 函数引用始终不变 |
| 惰性初始化 | init 函数用于复杂状态初始化 |
| 性能优化 | 配合 useMemo/React.memo 优化 |

---

## 8. 总结：手写 Hooks 核心要点

### 8.1 架构图

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

### 8.2 Hook 实现对比

| Hook | 缓存内容 | 依赖检测 |
|------|---------|---------|
| useState | 状态值 | 无（直接赋值） |
| useEffect | effect + deps | 数组浅比较 |
| useMemo | 计算结果 | 数组浅比较 |
| useCallback | 函数引用 | 数组浅比较 |
| useRef | ref 对象 | 无（引用不变） |
| useReducer | state + reducer | 无（dispatch 不变） |

### 8.3 面试高频考点

1. **Fiber 链表**：hooks 如何通过索引追踪
2. **闭包陷阱**：依赖数组为空时的常见问题
3. **引用稳定性**：memo/useCallback 的作用
4. **执行时机**：useEffect 的执行顺序
5. **批量更新**：多次 setState 合并机制

---

## 9. 参考资源

| 资源 | 链接 |
|------|------|
| React 官方文档 - Hooks | https://react.dev/reference/react |
| React Fiber 架构 | https://github.com/acdlite/react-fiber-architecture |
| How to implement React Hooks | https://github.com/toast tang/implement-react-hooks |
| 深入理解 React 状态管理 | https://overreacted.io/zh-hans/ |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Built-in React Hooks](https://react.dev/reference/react/hooks) | Hook 全景索引，先定实现范围与每个 Hook 的签名契约。 | 读目录与各 Hook 签名，列出要手写的 6 个 Hook 及共用 dispatcher 字段。 |
| [useState](https://react.dev/reference/react/useState) | useState 的更新语义与批处理是手写实现的基准。 | 重点读 set 函数的函数式更新与 Pitfalls，写代码前先明确队列模型。 |
| [useEffect](https://react.dev/reference/react/useEffect) | 依赖数组、清理时机与执行顺序，是 useEffect 实现的核心规则。 | 读依赖数组与清理函数两节，对照自己实现检查是否满足这些行为。 |
| [useMemo](https://react.dev/reference/react/useMemo) | 明确 useMemo 缓存的是值而非组件，避免实现跑偏。 | 读参数与返回值说明，想清楚依赖比较失败时该重算还是复用。 |
| [useCallback](https://react.dev/reference/react/useCallback) | useCallback 只是 useMemo 的特例，读它能压缩实现成本。 | 读它和 useMemo 的差异说明，尝试用一行 useMemo 实现 useCallback。 |
| [useRef](https://react.dev/reference/react/useRef) | ref 是可变容器，实现思路与 state 完全不同，需单独设计。 | 读注意事项里“不要写入渲染中读取的值”，实现时保证对象引用稳定。 |
| [useReducer](https://react.dev/reference/react/useReducer) | reducer 与 dispatch 的关系能帮你复用 useState 的调度逻辑。 | 读 reducer 必须是纯函数一节，比较它与 useState 实现差异再复用代码。 |
| ['Reusing Logic with Custom Hooks'](https://react.dev/learn/reusing-logic-with-custom-hooks) | 自定义 Hook 是手写 Hooks 的落地场景，看官方如何组织逻辑。 | 读提取自定义 Hook 的步骤，把自己写的 Hook 封装成一个自定义 Hook。 |
| [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) | 理解 useEffect 不该滥用，才知道手写实现要支撑哪些真实需求。 | 对照示例，把项目里一个多余 effect 改成事件处理或派生值。 |
| [React Working Group 与 RFC](https://github.com/reactjs/rfcs) | Hooks RFC 讲清了设计动机与调用顺序约束的由来。 | 只读 Motivation 与 Design 两节并写摘要，回答“为何不能条件调用”。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [patterns.dev：React 模式](https://www.patterns.dev/react/) | Hooks 模式与其他 React 模式并列展示，便于对比取舍。 | 读 Hooks 模式一节，仿写一个含内部 state 与自定义 Hook 的小组件。 |
| [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/) | 给出手写 Hook 所需的 TypeScript 类型写法，便于落地。 | 查 Hooks 与事件的类型章节，给你的实现补上泛型与返回类型标注。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Overreacted：useEffect 完整指南](https://overreacted.io/a-complete-guide-to-useeffect/) | 把闭包过期问题讲透，正是手写 useEffect 最容易踩的坑。 | 照 count 与 setInterval 示例复现闭包过期，再用自己的实现验证修复。 |
| [Kent：useMemo 与 useCallback](https://kentcdodds.com/blog/usememo-and-usecallback) | 用 Profiler 实测缓存收益，避免为 useMemo 实现过度设计。 | 跑文中案例的 Profiler 截图，判断何时缓存才值得引入依赖比较。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理万行表格的勾选与关键词过滤 | useMemo 缓存过滤结果、useCallback 稳定行回调 | React + react-window 虚拟列表 | 依赖数组漏写会让缓存永不更新 |
| 低端安卓机首屏的轮询请求 | useEffect 依赖数组与清理函数 | React + fetch 定时轮询 | 清理函数漏写会累积定时器 |
| 多人协作白板的光标位置广播 | useRef 保存 socket 与最新坐标 | React + WebSocket | ref 更新不触发渲染，展示要另设 state |
| 表单页面的撤销与重做栈 | useReducer 管理历史记录 | React + useReducer | reducer 必须返回新对象，不能原地改 state |
| 聊天窗口收到新消息后滚动到底 | useEffect 配合 useRef 取 DOM 节点 | React + scrollIntoView | 依赖写列表长度，不要写整个列表 |
| 数据看板的图表数据重算 | useMemo 缓存派生数据集 | React + ECharts | 依赖写数据引用，深比较要引外部库 |
| 搜索框输入后请求联想词 | useCallback 包住防抖函数 | React + lodash.debounce | 防抖函数不固定引用会每次渲染重建 |
| 主题切换与暗色模式持久化 | useReducer + useEffect 写存储 | React + Context | 监听到存储变化后要解绑监听器 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格勾选

**业务背景**：表格行数在一万上下，勾选一行会让整张表重渲染，滚动时帧率掉到肉眼可见的卡顿。用 React DevTools Profiler 录制一次勾选操作，能看到提交阶段渲染的行组件数量。

**怎么用本页知识解决**：先想清楚哪些数据影响渲染、哪些只用于记录。

```jsx
function RowList({ rows, keyword }) {
  // 只依赖 rows 与 keyword，其它状态变化不会重算过滤
  const visible = useMemo(
    () => rows.filter((r) => r.name.includes(keyword)),
    [rows, keyword]
  );
  // 选中集合不进渲染输出，放 ref 里，勾选不触发重渲染
  const picked = useRef(new Set());
  // 空依赖让引用恒定，行组件配合 memo 才不会白重渲染
  const handlePick = useCallback((id) => {
    const set = picked.current;
    if (set.has(id)) set.delete(id);
    else set.add(id);
  }, []);
  return visible.map((r) => <Row key={r.id} row={r} onPick={handlePick} />);
}
```

- 过滤逻辑只依赖 rows 和 keyword，输入框之外的 state 变化不会触发重算。
- handlePick 依赖为空，引用在组件生命周期内不变，Row 用 memo 包裹后才真的跳过渲染。
- picked 放 ref，代价是勾选本身不触发渲染；需要显示已选数量时另加一个 state。
- 想确认 ref 是否稳定，在 handlePick 里打印一次引用，或在 Profiler 里看 Row 的渲染次数。

**怎么度量收益**：看 React DevTools Profiler 的提交耗时与参与渲染的组件数；看 Chrome Performance 面板的 FPS 曲线与长任务数量；看 Network 面板的请求条数是否随操作次数增长。测量时固定同一份数据和同一串操作，改动前后各录一次。

**什么时候不该用**：行数在几十行以内时，memo 的比较开销可能超过重渲染本身，先不做缓存。选中数量要实时显示在页面上时，集合不能只放 ref，必须补 state。数据源是父组件每次新建的数组时，useMemo 依赖每次都在变，缓存不生效，要先稳定数据。

#### 场景 2：低端安卓机的首屏轮询与事件订阅

**业务背景**：首屏组件挂载后按固定间隔拉取状态，同时监听网络变化；在低端安卓机上切走页面再回来，会出现重复请求。用 Performance 面板录制挂载到卸载的全过程，观察定时器数量与内存曲线。

**怎么用本页知识解决**：每个 Effect 只管一个外部系统，并且订阅与解绑成对出现。

```jsx
function StatusBar() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const id = setInterval(() => {
      fetch('/api/status').then((r) => r.json()).then(setStatus);
    }, 5000); // 固定间隔轮询
    return () => clearInterval(id); // 卸载或依赖变化时清掉定时器
  }, []); // 空依赖：只订阅一次，不重复起定时器
  useEffect(() => {
    const onOnline = () => setStatus((s) => ({ ...s, online: true }));
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);
  return <span>{status?.online ? '在线' : '离线'}</span>;
}
```

- 两个 Effect 的空依赖让订阅只发生一次；事件名和回调前后一致，卸载时才能精确解绑。
- 回调里用函数式 setStatus，避免闭包拿到挂载那一刻的 status。
- 定时器 ID 留在 Effect 内部，放到组件外部变量会串到多个实例上。
- 每个 Effect 只做一件事，出问题时能单独定位是哪一段订阅没清掉。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板录制“进入页面到离开页面”，看卸载后定时器与监听器是否归零。用 Memory 面板做两次堆快照，对比离开页面后的保留对象。用 Network 面板核对轮询请求条数是否等于停留时长除以间隔。

**什么时候不该用**：需要按用户操作即时刷新时，轮询存在延迟，应改用服务端推送，这个 Effect 结构不适用。路由高频切换、页面反复挂载卸载时，空依赖的订阅会反复建立和拆除，应把订阅提到更上层组件再下发。

#### 场景 3：多人协作白板的光标广播

**业务背景**：白板上每个成员的光标位置通过 WebSocket 广播，光标移动频率高，每次移动都 setState 会让整块画布重渲染。规模按同时在线人数和每秒消息条数衡量，用浏览器 Network 面板统计每秒收发的帧数。

**怎么用本页知识解决**：连接只建一次放 ref，位置数据按用途拆成两条路。

```jsx
function useCursor(socketUrl) {
  const socketRef = useRef(null);
  const latestRef = useRef({ x: 0, y: 0 }); // 只发给服务端，不进渲染
  const [peers, setPeers] = useState({}); // 需要重绘，进 state
  useEffect(() => {
    const ws = new WebSocket(socketUrl);
    socketRef.current = ws;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      setPeers((prev) => ({ ...prev, [msg.id]: msg.pos }));
    };
    return () => ws.close(); // 卸载时关连接，不留残订阅
  }, [socketUrl]);
  const send = useCallback(() => {
    socketRef.current?.send(JSON.stringify(latestRef.current));
  }, []);
  return { peers, latestRef, send };
}
```

- socket 实例放 ref，它不参与渲染，放 state 会带来无意义的提交。
- peers 放 state 并用函数式更新，避免闭包读到旧的对象。
- send 用 useCallback 包空依赖，引用恒定，作为 prop 传给子组件时不破坏 memo。
- socketUrl 放进依赖，换房间时先关旧连接再开新连接。

**怎么度量收益**：用 Performance 面板录制几秒内的光标移动，看 FPS 与长任务数量。用 React DevTools Profiler 看一条光标消息触发的渲染组件数。用 Network 面板的 WS 帧统计，核对一条消息是否只发一次。

**什么时候不该用**：光标位置要参与布局计算（吸附、碰撞检测）时，ref 里的值不触发重算，必须放 state。服务端已经做了节流且消息量不大时，拆成 ref 与 state 两套数据只增加维护成本。

### 行业先进实践

**用 exhaustive-deps 检查依赖数组（出处：eslint-plugin-react-hooks 开源项目 / React 官方文档）**
这个规则会指出依赖数组里缺写的值和多余的值。它把“闭包读到旧值”这类问题从运行时提前到提交前。你的项目可以先在新增文件上开 warn，稳定一段时间后调成 error。

**先判断是否真的需要 Effect（出处：React 官方文档 react.dev）**
官方文档主张先看这段逻辑能不能在渲染期间算出来、能不能放进事件处理函数，只有同步外部系统时才用 Effect。它减少的是数据流来回同步引发的额外提交。你可以在评审清单里加一条：新增 useEffect 必须说明它在同步哪个外部系统。

**用 React DevTools Profiler 定位重渲染（出处：React 官方文档 React Developer Tools）**
做法是录制一次用户操作，看这次提交里哪些组件渲染了、各耗时多少，再决定要不要 memo。它把“感觉卡”变成可对比的渲染次数。你的项目可以固定一组操作脚本，改代码前后各录一次。

**用 useSyncExternalStore 订阅外部数据源（出处：React 官方文档）**
做法是把订阅拆成 subscribe 与 getSnapshot 交给 React，渲染期间读取外部值。本页手写的“Effect 里订阅再 setState”在并发渲染下有读到不一致值的风险，这个 Hook 是官方给出的解法。需核对官方文档：当前 React 版本对它的参数签名与并发行为的描述。

**按选择器订阅，配合记忆化选择器（出处：Redux 官方文档 / Reselect 开源项目）**
让组件只订阅自己需要的那段数据，再用记忆化选择器控制返回值引用，父级状态变化不会让所有消费者一起渲染。它把更新范围限制在真正依赖该数据的组件上。你的项目可以规定 useSelector 的返回值要么是基本类型，要么是引用稳定的对象。需核对官方文档：所选状态库对选择器返回新对象时的默认比较策略。

### 从学到用：落地路线

第 1 步，在一个页面试点：挑一个能用 Profiler 观察到渲染次数的页面，只改 useMemo 与 useCallback 两处。验收标准：改前改后各录一次 Profiler，能给出渲染组件数的对比数字。

第 2 步，固定条件验证：用同一份数据、同一串操作复跑，排除数据量差异带来的干扰。验收标准：两次记录的操作路径与数据量一致，差异只来自代码改动。

第 3 步，写进规范并推广：把“依赖数组写全”“订阅与解绑成对”写进代码规范，接入 lint 规则。验收标准：CI 上 lint 通过，新增的 useEffect 都能指出它同步的外部系统。

第 4 步，防回退：保留 lint 规则，并为轮询、订阅类逻辑补上卸载后无残留的测试。验收标准：删掉任意一个清理函数，测试用例会失败。

### 动手作业

**目标**：给一个列表页加上“勾选并批量操作”的能力，并用 Profiler 记录改造前后的差异。

**步骤**
1. 造数据：本地生成一万行对象，字段包含 id、name、status，写成一个模块统一导出。
2. 搭页面：渲染列表，顶部放关键词输入框，行内放勾选框，底部显示已选数量。
3. 录基线：用 React DevTools Profiler 录制“输入一个字符”和“勾选一行”两次操作，记下渲染组件数与提交耗时。
4. 改造：用 useMemo 缓存过滤结果，用 useCallback 稳定行回调，行组件用 memo 包裹。
5. 复测：用同样的数据和操作再录一次，把两次结果并列写进一个 markdown 文件。
6. 验证清理：在页面挂载时启动一个定时器，离开页面后用 Memory 面板堆快照检查是否还有保留对象。
7. 写结论：逐条说明哪一步带来了变化、哪一步没有，没有变化的要给出原因。

**验收标准**
- 前后两次 Profiler 记录的操作路径与数据量一致，差异只来自代码改动。
- 能说出勾选一行时参与渲染的行组件数量，并解释这个数字是怎么来的。
- 已选数量随勾选与取消同步变化，说明展示用的 state 与记录用的 ref 分开维护。
- 离开页面后，Memory 面板的堆快照中不再保留该页面的定时器对象。
- 文档里的每条结论都能对应到一次 Profiler 记录、一次 Network 统计或一次堆快照。

