---
title: 事件、内存与性能
description: 事件捕获/冒泡与委托、内存泄漏排查流程、常见浏览器性能优化手段。
---

# 事件、内存与性能

## 1. 浏览器事件机制

### 1.1 冒泡 vs 捕获完整图解

```
事件流三个阶段:

捕获阶段 (Capture Phase) — 从根节点往下到目标节点
  window -> document -> <html> -> <body> -> <div>

目标阶段 (Target Phase) — 在目标节点上
  <div onclick="...">
  事件处理在目标元素上按添加顺序执行

冒泡阶段 (Bubble Phase) — 从目标节点往上到根节点
  <div> -> <body> -> <html> -> document -> window
```

```javascript
// 完整事件监听示例
const div = document.getElementById('outer');

// 捕获阶段处理（第三个参数为 true）
div.addEventListener('click', handler, true);

// 冒泡阶段处理（第三个参数为 false 或省略）
div.addEventListener('click', handler, false);

// 事件委托（利用冒泡）
document.getElementById('list').addEventListener('click', (e) => {
  const target = e.target.closest('li');
  if (target) {
    console.log('Clicked li:', target.textContent);
  }
  e.stopPropagation();
});

// passive 优化：提升滚动流畅度
window.addEventListener('scroll', handler, { passive: true });
```

### 1.2 不会冒泡的事件

```javascript
const nonBubblingEvents = [
  'focus', 'blur', 'load', 'unload', 'error',
  'mouseenter', 'mouseleave',
  'scroll',  // 在 window/document 上使用 passive 优化
];
```

## 2. 浏览器内存泄漏排查

### 2.1 常见内存泄漏场景

```javascript
// 场景1: 全局变量（隐式全局变量）
function leak() {
  temp = 'this creates a global variable';  // 未声明的变量挂在 window 上
}

// 场景2: 定时器未清理
const intervalId = setInterval(() => console.log(heavyData), 1000);
clearInterval(intervalId);

// 场景3: 事件监听器未移除
element.addEventListener('click', handler);
element.removeEventListener('click', handler);

// 场景4: 闭包引用
function createLeak() {
  const largeArray = new Array(100000).fill('x');
  return () => console.log(largeArray.length);
}

// 场景5: 分离的 DOM 引用
const detachedNodes = [];
const div = document.createElement('div');
document.body.appendChild(div);
document.body.removeChild(div);
detachedNodes.push(div);  // 内存泄漏
```

### 2.2 Performance API 使用

```javascript
// 1. 获取内存信息（Chrome 浏览器）
const memoryInfo = performance.memory;
console.log({
  usedJSHeapSize: memoryInfo.usedJSHeapSize / 1024 / 1024,
  totalJSHeapSize: memoryInfo.totalJSHeapSize / 1024 / 1024,
});

// 2. Performance Observer — 监控长任务
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.log('Long Task detected:', entry.duration, 'ms');
    }
  }
});
observer.observe({ entryTypes: ['longtask'] });

// 3. 监控 FP / FCP / LCP
const paintObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(entry.name, entry.startTime.toFixed(2), 'ms');
  });
});
paintObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

// 4. Timeline 分析
performance.mark('start-operation');
performance.mark('end-operation');
performance.measure('Duration', 'start-operation', 'end-operation');
```

### 2.3 Lighthouse 原理

**Lighthouse 工作流程：**

| 步骤 | 说明 |
|------|------|
| 1. 启动 | 通过 Chrome DevTools Protocol (CDP) 启动 |
| 2. 加载页面 | 通过 CDP 导航到目标 URL |
| 3. 全局检查 | Service Worker 检查、Computed CSS 收集、DOM 树信息收集 |
| 4. 运行 Auditors | 性能测试、PWA、最佳实践、SEO 等审计项 |
| 5. 生成报告 | 计算加权总分（0-100），输出优化建议，支持 HTML/JSON/CSV 格式 |
| 6. Lighthouse CI | 可集成到 CI/CD，阻止性能退化 |

**Auditors 审计项：**

- Performance: FCP / LCP / TBT / TTI / Speed Index
- PWA: service worker / manifest / offline
- Best Practices: deprecated APIs / console errors / HTTPS
- Accessibility: image aspect / color contrast

## 3. 浏览器性能优化

### 3.1 渲染性能优化

```javascript
// 1. 减少回流/重绘
// Bad
element.style.width = element.offsetWidth + 10 + 'px';
// Good: 使用 transform（合成线程，不触发回流）
element.style.transform = `translateX(${element.offsetWidth + 10}px)`;

// 2. will-change 优化动画性能
.animated-element {
  will-change: transform;
  transform: translateZ(0);
}

// 3. 批量 DOM 操作
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  fragment.appendChild(document.createElement('li'));
}
list.appendChild(fragment);

// 4. DOM 离线化
const hidden = document.createElement('div');
hidden.style.display = 'none';
document.body.appendChild(hidden);
// 在 hidden 中大量操作 DOM ...
document.body.removeChild(hidden);
```

### 3.2 资源调度优化

```
Preload Scanner 原理:

HTML 解析器在解析 HTML 时会暂停以执行 JS（JS 阻塞解析）
但 Preload Scanner 是一个轻量级后台扫描器（后台运行），
即使主线程被 JS 阻塞，它也能发现 <link>/<img>/<script> 等资源，
提前发起网络请求，充分利用网络带宽。

Code Splitting 实践:
import('module.js').then(module => module.doSomething());

// React.lazy 实现路由级代码分割
const Dashboard = React.lazy(() => import('./Dashboard'));
<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

