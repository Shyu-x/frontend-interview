---
title: transition 与 animation
description: 过渡与关键帧动画的区别、动画性能与 GPU 加速。
tags:
  - css
---

# transition 与 animation


## 1. transition vs animation

### 1.1 定义与对比

| 维度 | `transition` | `@keyframes animation` |
|------|-------------|----------------------|
| **触发方式** | 需状态变化（hover/click/JS 修改） | 无需触发，自动/立即执行 |
| **关键帧** | 始终是 2 个状态（起点→终点） | 任意数量（0% ~ 100%） |
| **循环能力** | 单次 | 通过 `animation-iteration-count: infinite` 循环 |
| **暂停能力** | 不支持（状态固定） | `animation-play-state: paused` 暂停 |
| **方向控制** | 单一方向 | `animation-direction` 控制正/逆向/交替 |
| **性能** | 较好（自动优化） | 取决于属性（可触发 GPU 加速） |
| **适用场景** | 简单的状态切换 | 复杂的多阶段动画 |

### 1.2 transition 详解

```css
/* 完整语法：transition: 属性 时长 缓动函数 延迟 */
.box {
  width: 100px;
  background: #4ecdc4;
  transition:
    width 0.3s ease,
    background 0.3s ease;
}

/* 触发状态 */
.box:hover {
  width: 200px;
  background: #ff6b6b;
}

/* 常用缓动函数 */
transition-timing-function:
  ease        /* 慢-快-慢（默认） */
  linear      /* 匀速 */
  ease-in     /* 慢开始 */
  ease-out    /* 慢结束 */
  ease-in-out /* 慢-开始-慢结束 */
  cubic-bezier(0.25, 0.1, 0.25, 1) /* 自定义贝塞尔曲线 */
```

### 1.3 @keyframes animation 详解

```css
/* 定义关键帧动画 */
@keyframes slideIn {
  0%   { transform: translateX(-100%); opacity: 0; }
  50%  { transform: translateX(10px); opacity: 0.8; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* 绑定动画 */
.element {
  animation-name: slideIn;
  animation-duration: 0.5s;
  animation-timing-function: ease-out;
  animation-delay: 0.2s;
  animation-iteration-count: 1;    /* 或 infinite */
  animation-direction: normal;       /* normal / reverse / alternate */
  animation-fill-mode: forwards;    /* forwards: 动画结束后保持最后状态 */
  animation-play-state: running;   /* running / paused */
}

/* 简写：animation: name duration timing-function delay count direction fill-mode */
.element {
  animation: slideIn 0.5s ease-out 0.2s 1 forwards;
}
```

### 1.4 性能优化与 GPU 加速

**触发 GPU 加速的属性（推荐用于动画）**：
- `transform: translate() / scale() / rotate()`
- `opacity`
- `filter: blur()`

**不推荐动画的属性（会触发重排/重绘）**：
- `width` / `height`（重排）
- `margin` / `padding`（重排）
- `left` / `top` / `right` / `bottom`（重排）
- `background-color`（重绘）

**GPU 加速机制**：
```
浏览器合成层（Compositor Layer）：
当元素触发 GPU 加速时 → 浏览器为其创建独立的合成层
→ 动画在 GPU 上完成 → 不触发主线程重排/重绘 → 60fps 流畅

will-change 使用建议：
will-change: transform;    /* 提前告知浏览器将变化，优化处理 */
transform: translate3d(0,0,0); /* 触发独立合成层（同理） */
```

### 1.5 ASCII 动画时序图

```
transition（2 状态）：
时间 →  0s ─────────────────────→ 0.3s
状态    [原状态] ──────────────→ [新状态]
        线性过渡，单次

animation（多关键帧）：

@keyframes bounce {
  0%   { top: 0; }
  50%  { top: 50px; }
  100% { top: 0; }
}

时间 →  0s ───→ 0.5s ───→ 1.0s
状态    0%        50%       100%
状态   top:0 ─→ top:50 ─→ top:0  ← 往复弹跳（alternate）
```

### 1.6 React / Next.js / TS 代码示例

```tsx
// components/AnimatedButton.tsx
import { useState } from 'react';

// 带 transition 的交互按钮
export function AnimatedButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 32px',
        fontSize: '16px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: hovered ? '#4ecdc4' : '#1a73e8',
        color: '#fff',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
        // transition: 属性 时长 缓动函数 延迟
        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {hovered ? 'Hovered!' : 'Hover me'}
    </button>
  );
}

// components/Spinner.tsx
// 使用 @keyframes 动画的加载指示器
const spinnerKeyframes = `
  @keyframes spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
`;

// 注入keyframes（SSR 安全的写法）
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinnerKeyframes;
  document.head.appendChild(style);
}

export function Spinner() {
  return (
    <div
      style={{
        width: '40px',
        height: '40px',
        border: '4px solid #e0e0e0',
        borderTopColor: '#1a73e8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}

// components/FadeInList.tsx
import { useEffect, useState } from 'react';

export function FadeInList({ items }: { items: string[] }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((item, i) => (
        <li
          key={item}
          style={{
            padding: '8px 16px',
            marginBottom: '8px',
            background: '#f5f5f5',
            borderRadius: '4px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: `all 0.3s ease ${i * 0.1}s`, // 逐个延迟出现
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

// 性能优化：will-change 使用 hook
function useWillChange(enabled: boolean) {
  return enabled ? 'transform, opacity' : 'auto';
}
```

### 1.7 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| 用 `transition` 做循环动画 | 应该用 `@keyframes animation` |
| `transition` 用在 `display: none → block` | `display` 不是可过渡属性，用 `opacity` + `visibility` 替代 |
| 动画所有属性 | 只动画 `transform`/`opacity`（GPU 加速），避免重排/重绘 |
| `will-change` 滥用 | 只在动画开始前短期使用，动画结束后清除 |
| `animation-fill-mode` 未设置 | 需要保持结束状态时加 `forwards`，否则恢复初始状态 |
| 缓动函数全用 `ease` | 进场动画用 `ease-out`，退场动画用 `ease-in`，循环用 `linear` |

### 1.8 面试题

**Q1: `transition` 和 `@keyframes animation` 的核心区别是什么？什么情况下必须用 animation？**

> 参考答案：① `transition` 需要状态变化触发（hover、JS 修改类名），只能连接两个状态；`@keyframes` 可以定义任意多个关键帧，无需触发即可执行。② 必须用 animation 的场景：循环动画（loader、转圈）、自动播放的入场动画、骨架屏闪烁效果、交错延迟动画、`animation-play-state` 暂停/恢复动画、`animation-direction: alternate` 往复运动。

**Q2: 哪些 CSS 属性适合做动画（性能好），哪些不适合？为什么？**

> 参考答案：适合（GPU 加速，合成层）：`transform`（translate/scale/rotate）、`opacity`、`filter: blur()`。不适合（触发重排/重绘）：`width/height/margin/padding`（几何属性）、`left/top/right/bottom`（定位属性）、`background-color`（重绘）。原因：GPU 合成层的动画在 Compositor Thread 执行，不触发主线程 Layout/Paint；而几何属性变化会导致浏览器重新计算布局，性能损耗大。

**Q3: `will-change` 的作用是什么？使用不当会造成什么问题？**

> 参考答案：`will-change` 提示浏览器该元素即将发生动画，浏览器提前为其创建独立的合成层（Compositor Layer），使动画在 GPU 上执行。滥用问题：① 每个元素都创建合成层会占用大量 GPU 内存（每个合成层约 2-4MB）；② 过度使用可能导致页面卡顿。最佳实践：① 仅在动画即将开始前应用，动画结束后移除；② 优先使用 `transform: translate3d(0,0,0)` 触发合成层（同效果，更可控）；③ 只对少量高频动画元素使用。


## 2. 面试精讲：transition vs animation 区别，CSS 动画性能差的原因，transform 性能更好原因

### 2.1 transition vs animation

| 特性 | transition | animation |
|------|-----------|-----------|
| 触发方式 | 需要状态改变（hover/JS/class变化） | 自动/循环播放 |
| 定义帧数 | 只能定义开始和结束（两帧） | 可定义多帧（关键帧） |
| 循环 | 需要额外触发 | `animation-iteration-count: infinite` |
| 控制 | 简单，不能暂停/倒退 | 丰富（暂停/倒退/延迟） |

```css
/* transition：两帧过渡 */
.box {
  width: 100px;
  transition: width 0.3s ease, background 0.5s ease;
}
.box:hover {
  width: 200px;
  background: red;
}

/* animation：多帧动画 */
@keyframes slideIn {
  0%   { transform: translateX(-100%); opacity: 0; }
  50%  { transform: translateX(10px); opacity: 0.5; }
  100% { transform: translateX(0); opacity: 1; }
}
.slide {
  animation: slideIn 0.5s ease-out;
}
```

### 2.2 CSS 动画性能差的原因

**性能差的 CSS 属性（触发布局/重绘）：**
- `width`, `height`
- `margin`, `padding`
- `top`, `left`, `right`, `bottom`
- `font-size`, `font-family`
- `border-width`, `border-color`
- `background`
- `color`

```
触发布局（reflow）→ 重新计算几何属性 → 重新绘制
                    ↑ 最昂贵
```

**动画性能好的 CSS 属性：**
- `transform`（translate, scale, rotate）
- `opacity`

```
触发合成（composite）→ 仅 GPU 合成，不触发布局/重绘
                        ↑ 最优
```

### 2.3 transform 性能更好的原因

```
浏览器渲染流水线（Pipeline）：

1. JavaScript（JS 线程）
         ↓
2. Style（计算样式）
         ↓
3. Layout（计算几何/位置）  ← transform 不触发
         ↓
4. Paint（填充像素）        ← transform 不触发
         ↓
5. Composite（合成层）       ← transform 在此层操作
         ↓
6. 显示在屏幕上

transform → 只在 Composite 阶段处理
         → 不需要 Layout/Paint
         → 直接由 GPU 合成，操作合成层（compositor layer）

opacity   → 仅在 Composite 阶段处理
         → 同样高效
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [`transition` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transition) | transition 各子属性与时间函数的权威定义，是与 animation 对比的基准。 | 读 property/duration/timing-function/delay 小节，带着「过渡能否中途反转」的问题，写一个 hover 示例验证。 |
| [`animation` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation) | animation 简写与子属性定义，明确多关键帧、循环等独有能力。 | 读 animation-name 与 iteration-count、fill-mode 小节，思考哪些效果 transition 做不到，各写一例对比。 |
| [`transform` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform) | transform 函数列表与合成相关说明，是「transform 更省」的出处。 | 查函数列表与是否创建合成层的说明，把示例中动画的 top 改成 translate，观察性能面板差异。 |
| [CSS and JavaScript animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/CSS_JavaScript_animation_performance) | 官方对比 CSS 与 JS 动画性能，讲清主线程与合成开销。 | 重点读 CSS transitions vs animations 与 GPU 加速小节，带着「何时掉帧」的问题读，再实测一次。 |
| [MDN CSS 动画](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations) | 从 @keyframes 到 animation 的完整入门，并覆盖可访问性降级。 | 按「使用 CSS 动画」写一个加载动画，补上 prefers-reduced-motion 媒体查询并验证效果。 |
| [Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames) | 把「动画卡顿」量化为长帧数据的官方 API，支撑性能结论。 | 读用法与示例，用 PerformanceObserver 采集长帧，找出导致掉帧的脚本并记录。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) | 用 JS 控制同一动画，直观理解 CSS 动画与 WAAPI 的对应关系。 | 用 element.animate 复现一个 CSS 动画，对比 pause/reverse 与 animation-play-state 的差异。 |
| [现代 JavaScript 教程：动画](https://zh.javascript.info/animation) | requestAnimationFrame 最小示例，说明 JS 动画为何更难优化。 | 读该节并写一个匀速移动元素，再用 CSS transform 重写，比较两者代码与流畅度。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Josh Comeau：CSS 过渡](https://www.joshwcomeau.com/animation/css-transitions/) | 交互式讲解过渡与缓动，直观体会时间函数对观感的影响。 | 照文中示例拖动缓动曲线，对比 linear 与 ease-out，把结论用到自己页面的按钮过渡上。 |
| [渲染性能](https://web.dev/articles/rendering-performance) | 讲清布局、绘制、合成三阶段，是「transform 更快」的根因。 | 读渲染流水线与合成章节，带着「top 为何触发重排」的问题，把示例动画改用 transform。 |
| [Harry Roberts：CSS Wizardry](https://csswizardry.com/) | 大量真实性能案例，补足动画之外阻塞渲染的认知。 | 挑动画与渲染性能相关文章精读，整理一份优化检查清单，回到本页示例逐条自查。 |
| [fe-interview（haizlin）](https://github.com/haizlin/fe-interview) | CSS 分类面试题可自测 transition/animation 相关考点。 | 按 CSS 分类挑出动画与性能题限时作答，标出答不出的点，回 MDN 对应章节补齐。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理系统的万行表格，鼠标扫过时整行高亮 | transition 的属性、时长、缓动函数、延迟四个分量 | `transition-property: transform, background-color` 配 `transform: translateY(-1px)` | `will-change` 只加在当前可视行，常驻声明会让合成层数量失控 |
| 低端安卓机的首屏骨架屏淡出 | transition 与 animation 的选择、opacity 可合成 | `opacity` 过渡加 `prefers-reduced-motion` 兜底 | 淡出期间要设 `pointer-events: none`，否则元素仍会吃掉点击 |
| 多人协作白板的协作者光标 | transform 在合成阶段完成的结论 | CSS 变量承载坐标，`translate3d` 加线性缓动 | 同一帧内的多次推送要先合并，再写一次样式 |
| 移动端底部抽屉弹出 | transition 完整语法、延迟分量 | `transform: translateY` 过渡 | 抽屉展开后要撑开真实高度时，不能用 transform 伪装 |
| 电商商品卡片悬停浮起 | transform 与 top/left 的开销差异 | `transform: translateY` 配 `box-shadow` 过渡 | `box-shadow` 过渡触发重绘，控制过渡元素的数量 |
| 拖拽排序列表松手归位 | transition 与 animation 的适用边界 | 拖拽中移除过渡，松手后按 FLIP 补回过渡 | 拖拽过程残留过渡会让元素跟不上指针 |
| 主题切换的整站配色变化 | transition 的属性白名单 | 只对 `color`、`background-color`、`border-color` 过渡 | 用 `*` 选择器挂过渡会让切换那一刻的样式重算暴涨 |
| 表单校验失败的抖动提示 | animation 的关键帧与播放控制 | `@keyframes` 加 `animationend` 回调 | 抖动是循环播放，属于 animation 的适用范围，不是 transition |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：列表一次渲染上千行数据，鼠标扫过时整行高亮，行数在筛选前后会变化。用户反馈扫行时指针反馈滞后，拖动滚动条时画面跳动。

**怎么用本页知识解决**：思路是把悬停反馈从触发布局的属性换成合成属性，并把过渡的作用范围收紧到两个属性上。

```css
/* 逐条列出参与过渡的属性，不用 all 把布局属性一并带进来 */
.table-row {
  transition-property: transform, background-color;
  transition-duration: 120ms;
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  transition-delay: 0ms;
}
.table-row:hover {
  /* 位移 1px 表达抬起，行高不变，相邻行不参与重排 */
  transform: translateY(-1px);
  background-color: #f5f7fa;
}
/* 由脚本按可视区增删这个类，给浏览器提前提升合成层的提示 */
.table-row.is-visible {
  will-change: transform;
}
```

- 不写 `transition: all`：`all` 会把 `height`、`padding` 一并纳入过渡，鼠标移入时触发重排。
- 用 `transform: translateY(-1px)` 而不是 `margin-top: -1px`：位移在合成阶段完成，不改文档布局。
- `will-change` 只挂在 `is-visible` 行上：这个属性会让浏览器提前分配合成层，行数多时显存占用上升。
- `transition-delay: 0ms` 显式写出：悬停反馈要求立刻跟手，加上延迟后快速扫行会看不到反馈。

**怎么度量收益**：在 Chrome DevTools 的 Performance 面板录制固定脚本（滚动 3 秒加悬停 20 行），对比两次录制里 Rendering 分类下的 Layout 与 Recalculate Style 耗时。同时统计 Frames 轨道上的 Dropped Frames 计数，并观察页面 INP 指标。

**什么时候不该用**：

- 点击行后要展开详情、撑开表格高度时，不能用 `transform` 位移代替真实高度变化，否则下方行不会让位。
- 首屏渲染全部行且每行都要悬停效果时，不要给每行加 `will-change`，合成层数量会超出显存预算。

#### 场景 2：低端安卓机的首屏骨架屏

**业务背景**：首屏接口返回慢，先用骨架屏占位，数据到达后骨架屏淡出、内容淡入。低端安卓机上淡出期间掉帧，且用户会在此刻点击到还没消失的骨架块。

**怎么用本页知识解决**：思路是只用 `opacity` 完成过渡，把时长压进用户能接受为装饰的量级，并对开启减弱动效的系统设置直接关掉过渡。

```css
.skeleton {
  opacity: 1;
  /* 只过渡 opacity，它在合成阶段完成，不触发布局 */
  transition: opacity 200ms ease-out 0ms;
}
.skeleton.is-done {
  opacity: 0;
  /* 淡出期间不接收指针事件，挡住误触 */
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    /* 系统要求减弱动效时直接切换，不留过渡时间 */
    transition-duration: 0ms;
  }
}
```

- 过渡属性只写 `opacity`：骨架屏没有位移需求，属性越少，过渡期间的样式重算越少。
- `pointer-events: none` 解决误触：`opacity: 0` 的元素仍在命中测试范围内，不挡就会吃掉点击。
- 用媒体查询关掉过渡：前庭功能敏感的用户会因淡入淡出不适，这是无障碍要求，不是可选装饰。
- 时长取 200ms：淡出属于装饰，拉长后用户会把等待归因到卡顿上。
- 骨架屏的呼吸效果用静态渐变而不是循环动画：循环动画会持续占用主线程与合成线程，首屏阶段应把资源留给内容渲染。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板录制冷启动到内容出现的过程，读 LCP 时间戳与 Frames 轨道的掉帧位置。用 Lighthouse 的移动端节流配置跑一遍，对比 LCP 与 CLS 两项。真机上用 `PerformanceObserver` 订阅 `largest-contentful-paint` 与 `layout-shift` 做埋点。

**什么时候不该用**：

- 骨架屏形状与真实内容尺寸差异大时，淡出会让布局跳动，应先固定占位尺寸再谈过渡。
- 数据在 100ms 内返回时，不要插入淡出过渡，直接替换不会产生额外一帧闪烁。

#### 场景 3：多人协作白板的协作者光标

**业务背景**：白板上同时有若干协作者，每个人的光标坐标通过长连接推送，推送间隔不均匀。光标如果出现跳变，协作者会误判对方停在了错误的位置。

**怎么用本页知识解决**：思路是把光标位置表达成 `transform`，用 CSS 变量接收坐标，用线性缓动补齐两次推送之间的空档。

```css
.remote-cursor {
  /* 坐标由脚本写入 CSS 变量，样式层不做数值计算 */
  transform: translate3d(var(--cursor-x), var(--cursor-y), 0);
  /* 线性缓动让两次推送之间的插值速度一致 */
  transition: transform 80ms linear;
  /* 位移只在合成层完成，不参与文档布局 */
  will-change: transform;
}
```

- 用 `translate3d` 而不是 `left` 与 `top`：后两者变化会触发布局，高频写入时每次都要重排。
- 用 CSS 变量承载坐标：脚本只写两个自定义属性，不必每帧拼接整条 `transform` 字符串。
- 缓动取 `linear`：推送间隔不规则时，线性插值不会在每段末尾减速再起步。
- 时长取 80ms：要略大于一次推送的间隔量级，覆盖两次推送之间的空档，同时不让人感到滞后。
- 在 `requestAnimationFrame` 回调里只应用本帧最后一条坐标：同一帧内的多次推送合并成一次样式写入。

**怎么度量收益**：在 Chrome DevTools 的 Performance 面板录制拖动本机光标 3 秒的过程，看 Rendering 分类里 Layout 的出现次数与总耗时。用 `PerformanceObserver` 订阅 `longtask`，统计超过 50ms 的任务条数。在 Layers 面板确认光标元素位于独立合成层。

**什么时候不该用**：

- 需要回放光标的真实轨迹时，不要用过渡插值，插值会掩盖真实采样点，应直接写入坐标。
- 页面同时显示几百个远端光标时，不要给每个元素加 `will-change: transform`，合成层数量会拖垮显存。

### 行业先进实践

`prefers-reduced-motion` 媒体查询（出处：MDN Web Docs 的 prefers-reduced-motion 页面）
做法是读取系统设置里的减弱动效偏好，命中时把过渡时长与动画时长置为 0。命中后浏览器不做插值，前庭功能敏感的用户不会看到位移与缩放。借鉴方式是在全局样式表加一条兜底规则，统一归零时长，个别组件再按需覆盖。

Web Animations API（出处：MDN Web Docs 的 Web Animations API 页面）
做法是用 `element.animate()` 拿到 `Animation` 对象，通过 `pause()`、`reverse()`、`currentTime` 控制播放进度。CSS 过渡只能靠切换类名间接表达状态，读不到当前进度。借鉴方式是只在需要中途暂停或反向时改用它，两态切换仍保留 CSS 过渡。

`content-visibility: auto`（出处：MDN Web Docs 的 content-visibility 页面与 W3C CSS Containment Module Level 2）
做法是给长列表容器声明该属性，浏览器跳过离屏元素的渲染工作。离屏元素不参与渲染，也就不会触发过渡的样式重算。借鉴方式是先在日志容器上试，同时用 `contain-intrinsic-size` 给出占位尺寸，观察滚动条是否跳动。

按需增删 `will-change`（出处：MDN Web Docs 的 will-change 页面）
该页面提示不要给大量元素常驻声明 `will-change`，建议在动画开始前加上、结束后移除。常驻声明会让浏览器提前提升合成层，层数增加后显存占用上升。借鉴方式是用事件委托在列表容器上监听 `mouseenter`，只给当前行加类名，离开时移除。

FLIP 列表重排（出处：需核对官方文档：核对 web.dev 上 FLIP 文章的标题、作者与发布链接）
待核对的内容是：FLIP 四个步骤在官方表述里的顺序、示例代码用的是 `transform` 还是 `translate`、文章是否仍挂在 web.dev 域名下。核对完成后再决定是否把 FLIP 写成项目里排序动画的默认方案。

### 从学到用：落地路线

第 1 步：在后台表格页试点，只改悬停高亮的实现方式。验收标准是改动只落在样式文件，不引入新依赖，交互行为与改动前一致。

第 2 步：用 Performance 面板按固定脚本录制改动前后两次结果。验收标准是同一脚本下 Rendering 分类的 Layout 总耗时下降，Frames 轨道没有新增掉帧。

第 3 步：把过渡属性白名单、`transform` 位移、减弱动效兜底三项写进组件默认样式与代码评审清单。验收标准是新提交的样式里不再出现 `transition: all`。

第 4 步：用样式检查工具把这三项固化成 CI 规则，脚本能拦下含 `transition: all` 的声明。验收标准是含违规声明的文件在 CI 阶段报错。

### 动手作业

目标：给一个 200 行的列表页加上悬停高亮与"更新成功"淡出提示，并用 DevTools 证明过渡只发生在合成属性上。

步骤：

1. 搭一个静态数据的列表页，渲染 200 行，每行包含标题与状态两列。
2. 用 `transition: all 200ms` 实现悬停高亮，用 Performance 面板录制滚动 3 秒，保存结果。
3. 改成 `transition-property: transform, background-color`，悬停时加 `transform: translateY(-1px)`，用同一脚本再录一次。
4. 对比两次录制中 Rendering 分类的 Layout 次数与 Frames 掉帧数，把两组数据写进 README。
5. 给标题加"更新成功"淡出提示，只用 `opacity` 过渡，在 `transitionend` 后移除节点。
6. 加上 `prefers-reduced-motion: reduce` 兜底把时长归零，用 DevTools 的 Rendering 面板模拟该媒体特性验证。
7. 给列表容器加 `content-visibility: auto` 与 `contain-intrinsic-size`，确认滚动条长度稳定。

验收标准：

- README 里有两次录制的数据，能指出改动前后 Layout 次数与掉帧数的差异。
- 样式文件中不出现 `transition: all`，参与过渡的属性逐条列出。
- 在 DevTools 的 Rendering 面板模拟 `prefers-reduced-motion: reduce` 后，悬停与淡出都不产生时长。
- 提示节点在 `transitionend` 后从 DOM 中移除，连续触发 10 次不发生节点堆积。
- 滚动到列表底部时滚动条长度稳定，不因 `content-visibility` 出现跳动。

