---
title: 框架集成与编译性能
description: 讲解 Vue、React 与 TypeScript 的结合，以及 TypeScript 编译性能优化。
tags:
  - typescript
date: 2026-05-17
---

# 框架集成与编译性能

## 1. Vue / React 结合 TS

```typescript
// React + TS：
// 1. 组件类型
interface Props { name: string; age?: number; }
function UserCard({ name, age = 18 }: Props) { return <div>{name}</div>; }

// 2. FC + children
interface LayoutProps { children: React.ReactNode; }
function Layout({ children }: LayoutProps) { return <div>{children}</div>; }

// 3. 事件处理
function Input() {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };
  return <input onChange={handleChange} />;
}

// 4. 状态类型
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);

// 5. Ref类型
const inputRef = useRef<HTMLInputElement>(null);
// inputRef.current?.focus();

// 6. 泛型组件
function GenericList<T>({ items, render }: { items: T[]; render: (item: T) => React.ReactNode }) {
  return items.map(render);
}

// 7. useCallback/useMemo类型
const memoizedFn = useCallback<(a: number) => number>((a) => a * 2, []);

// 8. HOC类型
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthWrapper(props: P) {
    // 检查权限...
    return <Component {...props} />;
  };
}

// Vue3 + TS：
// 1. defineProps
const props = defineProps<{
  name: string;
  age?: number;
  sexes?: number;
  callback?: (id: number) => void;
}>();
// 或者用withDefaults
const props = withDefaults(defineProps<{
  name: string;
  age?: number;
}>(), { age: 18 });

// 2. defineEmits
const emit = defineEmits<{
  (e: "update", value: number): void;
  (e: "delete", id: string): void;
}>();

// 3. defineExpose
defineExpose({ getData: () => data });

// 4. 组合式函数类型
function useCounter(initial = 0) {
  const count = ref(initial);
  const increment = () => count.value++;
  return [readonly(count), increment] as const;
}

// 5. ref/reactive类型推断
const name = ref<string>("张三"); // 显式指定
const state = reactive<{ count: number }>({ count: 0 });

// 6. 组件类型约束
import type { VNode } from 'vue';
function renderSlot(slots: VNode[]) {}
```

## 2. TS 编译性能优化

```typescript
// TS编译慢的原因：
// 1. 类型检查是 O(N^2) 的（需要比较类型关系）
// 2. 大型项目依赖解析时间长
// 3. 每个文件都做类型解析
// 4. 复杂的泛型和条件类型开销大

// 优化方案：

// 1. skipLibCheck: true（最重要）
// 跳过 node_modules/@types/**/*.d.ts 的类型检查
// 可能节省 30-80% 时间

// 2. incremental: true
// 生成 .tsbuildinfo 增量缓存文件
// 第二次编译只检查变更文件

// 3. 减少 include 范围
// 不要 include 整个 src，可以精确到特定目录

// 4. 使用 project references（项目引用）
// 把大仓库拆成小project，每个独立编译
{
  "references": [
    { "path": "./shared" },
    { "path": "./utils" }
  ]
}

// 5. noEmit: true（如果只做类型检查）
// tsconfig for lint（只检查不出包）：
// { "noEmit": true, "skipLibCheck": true }

// 6. 避免过于复杂的泛型
// 条件类型嵌套过深会显著增加检查时间

// 7. ts-build mode（--build）
// tsc --build 是增量模式，比普通模式快
// 只编译outDir改变的模块

// 8. 选择更快的编译器
// esbuild-loader / swc-loader 替代 ts-loader
// 比原生tsc快10-100倍（但功能有限）
// vite使用esbuild做TS编译（开发模式）

// 9. 分离类型检查和编译
// lint阶段只做类型检查（noEmit）
// 打包阶段用swc/esbuild快速编译

// 10. 使用transpileOnly
// ts-loader: { transpileOnly: true }（不检查类型，只转译）
// 类型检查交给fork-ts-checker-webpack-plugin（独立进程）
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 渲染机制](https://cn.vuejs.org/guide/extras/rendering-mechanism.html) | 讲模板编译优化与静态提升，直接决定 Vue 编译产物的性能。 | 在模板编译器演示站对照输出，对比静态提升前后渲染函数差异，记录可优化写法。 |
| [React Compiler 介绍](https://react.dev/learn/react-compiler/introduction) | 构建期编译器接入与优化收益的官方说明，含配置步骤。 | 在 Vite 项目按文档启用编译器，用 Profiler 对比开启前后重渲染次数。 |
| [React 官方文档](https://react.dev/) | 含 TypeScript 使用与构建工具建议，是 TS 集成的权威入口。 | 读 Using TypeScript 与构建工具相关章节，逐条对照自己项目的 tsconfig。 |
| [React 19 发布博客](https://react.dev/blog/2024/12/05/react-19) | 一次发布集中呈现编译器、Actions 等与构建相关的变更。 | 逐个运行文中示例，整理与 18 的差异表，重点标注编译与类型相关项。 |
| [Vue 官方文档](https://cn.vuejs.org/) | Vue 3 官方中文文档，含 TS 与工具链的权威章节。 | 先读快速上手与「TypeScript 与组合式 API」，再回看构建工具一节。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [babel.config-react-compiler.js](https://github.com/facebook/react/blob/main/babel.config-react-compiler.js) | 官方仓库里 React Compiler 的真实 Babel 接入配置。 | 看插件顺序与选项，对照自己项目的 babel/vite 配置做减法实验。 |
| [babel.config.js](https://github.com/facebook/react/blob/main/babel.config.js) | 多环境 Babel 配置的组织样例，可借鉴按需加载思路。 | 只看 env 分支与 preset 组合，思考如何减少开发态编译耗时。 |
| [babel.config-ts.js](https://github.com/facebook/react/blob/main/babel.config-ts.js) | TS 经 Babel 转译的官方配置样例，可直接参照改写。 | 对比自己项目的 preset-typescript 与 include/exclude，记录可裁剪项。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Thinking in React](https://react.dev/learn/thinking-in-react) | 从需求拆组件与 state，是 TS 类型建模前的必经步骤。 | 用待办清单走完五步，再给 props 与 state 补类型并开启 strict 校验。 |
| [Kent C. Dodds 博客](https://kentcdodds.com/blog) | 多篇 React 工程化与类型实践文章，贴近真实项目。 | 按 React 标签挑三篇，每篇写一个最小复现示例并补上类型注解。 |
| [Josh Comeau：React 专题](https://www.joshwcomeau.com/react/) | 图文交互讲解渲染与性能，易理解重渲染成因。 | 一次读一篇，照文中演示改参数，记录影响编译与重渲染的因素。 |
| [Vue 官方交互式教程](https://cn.vuejs.org/tutorial/) | 浏览器内动手写模板，迁移到 TS 的最快路径。 | 完成基础步骤后把代码改写成 script setup lang="ts"，观察类型报错并修正。 |

