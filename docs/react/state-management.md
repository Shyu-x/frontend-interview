# React 状态管理方案

> 状态管理是 React 应用架构的核心议题。本文系统梳理从 useState 到 Redux Toolkit 的演进路径，并提供决策框架帮助在实际项目中做出合理选择。

---

## 1. 状态管理演进

React 状态管理经历了从简单到复杂的演进过程，每个阶段都解决了特定场景下的问题：

![state-management diagram](assets/images/mermaid/react-state-management-5.png)

| 阶段 | 工具 | 适用场景 | 局限性 |
|------|------|----------|--------|
| 本地状态 | `useState` | 组件私有 UI 状态 | 无法跨组件共享 |
| 状态提升 | Props Drilling | 少量组件层级 | 深层嵌套时代价高 |
| Context | `useContext` | 中等复杂度共享 | 易触发全局重渲染 |
| 状态库 | Zustand/Jotai/Redux | 复杂应用 | 引入额外依赖 |

---

## 2. useState vs useReducer vs useContext 选择

### 决策矩阵

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| 简单 UI 状态（toggle、input） | `useState` | 无额外开销，直观 |
| 复杂状态逻辑（多状态相互依赖） | `useReducer` | 状态转换清晰，测试友好 |
| 跨组件共享（主题、用户信息） | `useContext` | 避免 prop drilling |
| 跨层级共享 + 频繁更新 | Zustand/Jotai | 细粒度订阅，避免重渲染 |
| 复杂异步逻辑 + 数据获取 | Redux Toolkit / RTK Query | 内置中间件和缓存 |

### useState 适用场景

```tsx
function Toggle() {
  const [isOn, setIsOn] = useState(false);

  return (
    <button onClick={() => setIsOn(!isOn)}>
      {isOn ? '开启' : '关闭'}
    </button>
  );
}
```

### useReducer 适用场景

```tsx
function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return (
    <>
      <span>{state.count}</span>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+1</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>-1</button>
    </>
  );
}

function reducer(state, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    default:
      return state;
  }
}
```

---

## 3. Context 原理与优化

### 3.1 Context 触发重渲染的问题

Context 本质上是一个 Provider-Consumer 模式。当 Provider 的 value 变化时，**所有消费该 Context 的组件都会重新渲染**：

![state-management diagram](assets/images/mermaid/react-state-management-4.png)

### 3.2 分离 Context 模式

将不同关注点的状态分离到独立的 Context，避免一处变化触发全局重渲染：

```tsx
// 主题状态（变化频繁）
const ThemeContext = createContext<ThemeState>(defaultTheme);

// 用户状态（变化较少）
const UserContext = createContext<UserState>(defaultUser);

// 将两个 Context 分离，主题变化不会影响 UserContext 消费者
```

### 3.3 useMemo 优化

对于包含对象或函数的 Context value，使用 `useMemo` 避免不必要的引用变化：

```tsx
const ThemeContext = createContext<ThemeContextType>(null!);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  // 只有 theme 真正变化时才创建新对象
  const value = useMemo(() => ({
    theme,
    setTheme,
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### 3.4 选择性订阅模式

使用 `useContext` 时配合选择器，只订阅需要的数据片段：

```tsx
// 通用选择器 hook
function useContextSelector(context, selector) {
  const contextValue = useContext(context);
  return useMemo(
    () => selector(contextValue),
    [contextValue, selector]
  );
}

// 使用示例
const isLoggedIn = useContextSelector(
  AuthContext,
  (auth) => auth.isAuthenticated
);
```

---

## 4. Zustand 设计解析

Zustand 是一个极简的状态管理库，其核心设计基于发布-订阅模式：

### 4.1 核心实现原理

```javascript
// Zustand 核心实现
const create = (createState) => {
  let state;
  const listeners = new Set();

  const setState = (partial) => {
    const nextState = typeof partial === 'function'
      ? partial(state)
      : partial;

    if (!Object.is(nextState, state)) {
      state = Object.assign({}, state, nextState);
      listeners.forEach(listener => listener(state));
    }
  };

  const getState = () => state;

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const destroy = () => {
    listeners.clear();
  };

  return { setState, getState, subscribe, destroy };
};
```

### 4.2 状态流图

![state-management diagram](assets/images/mermaid/react-state-management-3.png)

### 4.3 实际使用示例

```tsx
import { create } from 'zustand';

// 定义 Store 类型
interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

// 创建 Store
const useCounterStore = create<CounterStore>((set, get) => ({
  count: 0,

  increment: () => set((state) => ({ count: state.count + 1 })),

  decrement: () => set((state) => ({ count: state.count - 1 })),

  reset: () => set({ count: 0 }),
}));

// 组件中使用
function Counter() {
  const { count, increment } = useCounterStore();

  return (
    <>
      <span>计数: {count}</span>
      <button onClick={increment}>+1</button>
    </>
  );
}
```

### 4.4 性能优化：选择器模式

```tsx
// 只订阅 count 变化，increment 变化不会触发重渲染
const count = useCounterStore((state) => state.count);

// 使用 shallow 比较处理对象选择器
const { count, increment } = useCounterStore(
  (state) => ({ count: state.count, increment: state.increment }),
  shallow
);
```

---

## 5. Jotai 原子模型

Jotai 采用了与 Zustand 不同的原子（Atom）模型，借鉴了 Recoil 的设计理念：

### 5.1 基本概念

![state-management diagram](assets/images/mermaid/react-state-management-2.png)

### 5.2 核心 API

```tsx
import { atom, useAtom } from 'jotai';

// 定义原始原子
const countAtom = atom(0);
const prefixAtom = atom('计数: ');

// 定义派生原子（读取其他原子）
const displayAtom = atom((get) => {
  return `${get(prefixAtom)}${get(countAtom)}`;
});

// 在组件中使用
function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const [display] = useAtom(displayAtom);

  return (
    <>
      <span>{display}</span>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </>
  );
}
```

### 5.3 Provider 机制

```tsx
import { Provider } from 'jotai';
import { counterStore } from './stores';

function App() {
  return (
    <Provider store={counterStore}>
      <Counter />
      <AnotherCounter />
    </Provider>
  );
}
```

---

## 6. Recoil 与原子图

Recoil 是 Facebook 推出的状态管理库，引入了原子图（Atom Graph）的概念：

### 6.1 Atom 与 Selector

```tsx
import { atom, selector, useRecoilState, useRecoilValue } from 'recoil';

// Atom - 状态的最小单元
const todoListState = atom({
  key: 'todoList',
  default: [],
});

// Selector - 派生状态（类似 Jotai 的 Derived Atom）
const todoListStatsState = selector({
  key: 'todoListStats',
  get: ({ get }) => {
    const todos = get(todoListState);
    return {
      total: todos.length,
      completed: todos.filter(t => t.isComplete).length,
      uncompleted: todos.filter(t => !t.isComplete).length,
    };
  },
});

function TodoList() {
  const [todos, setTodos] = useRecoilState(todoListState);
  const stats = useRecoilValue(todoListStatsState);

  return (
    <>
      <span>已完成: {stats.completed}/{stats.total}</span>
      {/* todo list rendering */}
    </>
  );
}
```

### 6.2 Data Ghosts 与异步 Selector

```tsx
// 异步 Selector 用于数据获取
const currentUserQuery = selector({
  key: 'CurrentUser',
  get: async ({ get }) => {
    const userId = get(currentUserIDState);
    const response = await fetchUser(userId);
    return response.data;
  },
});

// 在组件中使用
function UserProfile() {
  const [user, setUser] = useRecoilState(currentUserQuery);

  if (user.state === 'loading') {
    return <Loading />;
  }

  if (user.state === 'error') {
    return <Error error={user} />;
  }

  return <div>{user.data.name}</div>;
}
```

---

## 7. Redux Toolkit 现代用法

Redux Toolkit (RTK) 是 Redux 的现代替代方案，简化了传统 Redux 的样板代码：

### 7.1 createSlice

```tsx
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
  status: 'idle' | 'loading';
}

const initialState: CounterState = {
  value: 0,
  status: 'idle',
};

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    setValue: (state, action: PayloadAction<number>) => {
      state.value = action.payload;
    },
  },
});

export const { increment, decrement, setValue } = counterSlice.actions;
export default counterSlice.reducer;
```

### 7.2 createAsyncThunk

```tsx
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// 异步 Thunk
export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);

interface UserState {
  entities: Record<string, User>;
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
}

const usersSlice = createSlice({
  name: 'users',
  initialState: { entities: {}, loading: 'idle' } as UserState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loading = 'pending';
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.entities[action.payload.id] = action.payload;
      })
      .addCase(fetchUserById.rejected, (state) => {
        state.loading = 'failed';
      });
  },
});
```

### 7.3 RTK Query

RTK Query 是专为数据获取和缓存设计的 API：

```tsx
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// 定义 API
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
    }),
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
    }),
    createUser: builder.mutation<User, Partial<User>>({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
} = api;
```

---

## 8. 状态管理选择决策树

![state-management diagram](assets/images/mermaid/react-state-management-1.png)

### 选择指南

| 场景 | 推荐方案 | 说明 |
|------|----------|------|
| 简单表单状态 | `useState` | 无需引入额外依赖 |
| 组件内复杂状态 | `useReducer` | 状态转换逻辑清晰 |
| 主题/语言切换 | Context | 低频更新，避免 prop drilling |
| 中等复杂度共享 | Zustand | API 简洁，性能优秀 |
| 需要派生状态 | Jotai | 原子模型，声明式 |
| 大型复杂应用 | Redux Toolkit | 成熟生态，完善调试工具 |
| 服务端数据管理 | RTK Query | 内置缓存和轮询 |

---

## 总结

| 方案 | 包体积 | 学习曲线 | 适用规模 | 特点 |
|------|--------|----------|----------|------|
| useState/useReducer | 0 KB | 低 | 任意 | React 内置 |
| Context | 0 KB | 中 | 中小型 | 简单共享 |
| Zustand | ~1.5 kb | 低 | 中小型 | 极简 API |
| Jotai | ~2.5 kb | 中 | 中型 | 原子模型 |
| Recoil | ~50 kb | 中 | 中型 | 原子图 |
| Redux Toolkit | ~100 kb | 中 | 大型 | 成熟生态 |

选择状态管理方案时，应优先考虑项目当前规模和团队熟悉度。随着应用复杂度提升，可以逐步从简单的 `useState` 过渡到轻量库如 Zustand，必要时再引入 Redux Toolkit 处理大型应用的复杂需求。

---

*本文档属于「前端面试全家桶」系列，深入理解 React 状态管理机制是构建高性能应用的基础。*