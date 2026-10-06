---
title: 框架性能优化
description: React 与 Vue 的常见性能优化手段。
tags:
  - performance
  - react
  - vue
date: 2026-05-17
---

# 框架性能优化

## 1. React 性能优化

```javascript
// React性能优化核心：

// 1. React.memo（防止不必要的重渲染）
const Button = React.memo(function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
});
// 只有props变化时才重渲染（浅比较）

// 2. useMemo（缓存计算结果）
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
// 依赖[a,b]不变时，返回缓存值，不重新计算

// 3. useCallback（缓存回调函数）
const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
// handleClick引用稳定，memo的子组件不会因为函数变化而重渲染

// 4. 列表使用key（稳定key，key变化才重渲染）
// key用ID不用index（index变化会导致所有子组件重渲染）
{items.map(item => <Item key={item.id} data={item} />)}

// 5. 虚拟列表（渲染大量列表项）
import { FixedSizeList } from 'react-window';
<FixedSizeList height={400} itemCount={10000} itemSize={50}>
  {({ index, style }) => <div style={style}>Row {index}</div>}
</FixedSizeList>

// 6. 组件拆分（减少粒度）
// 大组件任何props变化都重渲染，拆小后只有相关部分重渲染

// 7. Immutable数据（避免对象引用变化导致重渲染）
import { immutable } from 'react-immutable';
// 对象更新时返回新引用，组件可以通过浅比较判断变化

// 8. 懒加载（减少首屏JS量）
const HeavyChart = React.lazy(() => import('./HeavyChart'));

// 9. 状态提升 vs 状态下沉
// 频繁变化的状态放在需要它的最近父组件，避免不必要的prop传递

// 10. useTransition（标记非紧急更新）
import { useTransition } from 'react';
const [isPending, startTransition] = useTransition();
startTransition(() => { setQuery(e.target.value); });
// 用户输入（urgent）不被搜索更新（non-urgent）卡住

// 11. useDeferredValue（延迟更新值）
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);
// deferredQuery可以延迟更新，配合css transition实现防抖效果

// 避免重渲染的常用模式：
// render方法中创建新对象/数组/函数 → 每次render引用都变化
function BadComponent() {
  return <Child onClick={() => console.log('click')} />; // 新函数，每次render新引用
}
function GoodComponent() {
  const handleClick = useCallback(() => console.log('click'), []); // 稳定引用
  return <Child onClick={handleClick} />;
}
```

## 2. Vue 性能优化

```javascript
// Vue性能优化：

// 1. computed缓存（避免重复计算）
computed: {
  // 依赖不变时不重新计算
  fullName() { return this.firstName + ' ' + this.lastName; }
}
// vs method：每次调用都重新计算

// 2. Object.freeze（冻结不变的数据）
export default {
  data() {
    return {
      // 大列表不需要响应式（更新时不需要跟踪）
      rows: Object.freeze(largeData)
    };
  },
  // 需要更新时：this.rows = Object.freeze(newData)
}

// 3. v-once（只渲染一次，不更新）
<span v-once>{{ msg }}</span>
// 用于静态内容

// 4. keep-alive（缓存组件实例）
<keep-alive include="UserList,Settings">
  <component :is="currentView" />
</keep-alive>
// 切换后不销毁组件，保留状态

// 5. v-memo（缓存子树，Vue3.2+）
<div v-memo="[item.id, item.status]">
  <ComplexComponent :item="item" />
</div>
// item.id和item.status不变时，整个div不重渲染

// 6. v-show vs v-if
// v-if：条件false时不渲染（适合不频繁切换）
// v-show：始终渲染，切换display（适合频繁切换）
// v-show不会触发组件重新创建，重渲染成本低

// 7. 路由懒加载
const routes = [
  { path: '/home', component: () => import('./Home.vue') }
];

// 8. 大列表使用虚拟滚动
// vue-virtual-scroller / vue-virtual-scroll-list

// 9. 避免深层响应式（Vue3的Proxy）
// 深层响应式有开销，大数据结构可用shallowRef
import { shallowRef } from 'vue';
const list = shallowRef(largeArray);
// 整体替换时触发更新，内部元素不变时不需要响应式追踪

// 10. 事件销毁
// 组件卸载时清理定时器、事件监听
onUnmounted(() => {
  clearInterval(this.timer);
  window.removeEventListener('resize', this.handleResize);
});
// 或者用onceEventListener（只绑定一次）

// 11. 减少watcher
// 多个相关状态合并为一个computed
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [React 官方文档](https://react.dev/) | React 官方文档是渲染与性能优化的权威基线，概念不会跑偏。 | 先读 Quick Start 与性能相关章节，边读边在页内沙盒改代码，整理可优化点清单。 |
| [React Compiler 介绍](https://react.dev/learn/react-compiler/introduction) | React Compiler 自动做记忆化，是当前最省力的重渲染优化手段。 | 在 Vite 项目按文档启用编译器，用 Profiler 对比开启前后重渲染次数并记录结论。 |
| [useCallback](https://react.dev/reference/react/useCallback) | 弄清 useCallback 的适用边界，避免无意义的记忆化反而增加开销。 | 重点读 Caveats 与何时该用两节，回自己代码删掉无效的 useCallback 再测一次。 |
| [useTransition](https://react.dev/reference/react/useTransition) | useTransition 把重渲染标记为非紧急，是并发特性的性能入口。 | 读 Caveats，给一个长列表搜索加上 transition，用 Profiler 看输入是否不再卡顿。 |
| [useDeferredValue](https://react.dev/reference/react/useDeferredValue) | useDeferredValue 让昂贵子树降级更新，改善输入响应体验。 | 对比它与 useTransition 的取舍，套在慢组件上试用，测量输入延迟变化。 |
| [Vue 官方文档](https://cn.vuejs.org/) | Vue 官方文档是理解响应式与更新机制的起点，性能结论以此为准。 | 读快速上手与基础、响应式章节，整理一张更新触发条件的检查清单。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 渲染机制](https://cn.vuejs.org/guide/extras/rendering-mechanism.html) | 讲透虚拟 DOM、编译优化与静态提升，直接对应 Vue 渲染性能。 | 在模板编译器演示站对照静态提升前后的输出，看清编译器替你做了哪些优化。 |
| [React 源码仓库](https://github.com/facebook/react) | 从 reconciler 源码理解渲染流程，优化手段才有依据而非盲试。 | 读 beginWork 与 completeWork，打断点观察一次更新中哪些节点被跳过。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [React Fiber 架构笔记](https://github.com/acdlite/react-fiber-architecture) | Fiber 架构笔记把 work loop 讲透，解释并发渲染为何不阻塞。 | 读完对照 Build Your Own React 的 Fiber 章节，自己画一张 work loop 流程图。 |
| [Vue 响应式深入](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html) | 手写响应式能看清依赖收集与触发，判断优化是否真的生效。 | 跟着实现 reactive、effect、computed，再回头分析组件为何重复渲染。 |
| [Josh Comeau：React 专题](https://www.joshwcomeau.com/react/) | Josh Comeau 用交互演示讲渲染与重渲染，通俗且不牺牲准确性。 | 一次读一篇，照交互演示改参数观察差异，总结可复用的判断规则。 |
| [Josh Comeau：The Perils of Rehydration](https://www.joshwcomeau.com/react/the-perils-of-rehydration/) | hydration mismatch 既是正确性问题，也直接影响首屏性能。 | 在自己的 SSR 项目复现该问题，按文中方案修复并对比首屏耗时。 |

