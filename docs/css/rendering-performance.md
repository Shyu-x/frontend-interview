---
title: 回流、重绘与渲染性能
description: 回流/重绘的触发与优化、transform 与 GPU 加速、will-change、opacity/visibility/display 的差异以及 CSS 加载性能。
tags:
  - css
---

# 回流、重绘与渲染性能


## 1. 面试精讲：回流（reflow）vs 重绘（repaint），如何减少回流

### 1.1 渲染流水线

```
DOM Tree → Style → Layout → Paint → Composite
                      ↑        ↑
                   回流      重绘
                   (reflow)  (repaint)
                   (最重)    (中等)
                               ↓
                            Composite
                            (最轻)
```

- **回流（reflow）**：几何属性改变，元素大小/位置/布局重新计算
- **重绘（repaint）**：外观改变，但不影响几何属性（如 color, visibility, background）

**回流必定触发重绘，重绘不一定回流。**

### 1.2 触发回流的操作

```javascript
// 读取布局属性（offset, scroll, client, getBoundingClientRect）
const width = el.offsetWidth;   // 触发回流
const height = el.scrollHeight; // 触发回流
el.clientTop;                   // 触发回流
el.getBoundingClientRect();     // 触发回流

// 修改布局相关属性
el.style.width = '200px';      // 触发回流
el.style.padding = '10px';     // 触发回流
el.style.margin = '20px';      // 触发回流
el.style.fontSize = '20px';    // 触发回流

// 添加/移除 DOM 元素
document.body.appendChild(child); // 触发回流

// 改变元素尺寸/内容
el.innerHTML = '新内容';         // 触发回流
```

### 1.3 如何减少回流

**原则：读操作和写操作分离，批量写，动画用 transform**

```javascript
// 错误：交替读写，触发多次回流
el.style.width = el.offsetWidth + 10 + 'px';
el.style.height = el.offsetHeight + 10 + 'px';

// 正确：读操作集中，写操作集中
const width = el.offsetWidth;
const height = el.offsetHeight;
requestAnimationFrame(() => {
  el.style.transform = `translate(${width + 10}px, ${height + 10}px)`;
});
```

**CSS 优化策略：**
```css
/* 1. 动画使用 transform/opacity */
.animated {
  animation: move 1s ease;
}
@keyframes move {
  0%   { transform: translateX(0); }
  100% { transform: translateX(100px); }
}

/* 2. 使用 will-change 提前创建合成层 */
.animated {
  will-change: transform;
}

/* 3. 批量修改 DOM（离线操作） */
const el = document.getElementById('list');
el.style.display = 'none';        // 脱离渲染树
modifyDOM();
el.style.display = 'block';       // 重新渲染（只触发一次回流）

/* 4. 避免设置多项内联样式（用 class 替代） */
el.classList.add('large-size');   /* 好 */
el.style.width = '200px';          /* 差 */
```


## 2. 面试精讲：transform 为什么不触发回流，GPU 加速原理，will-change

### 2.1 transform 不触发回流的原因

**渲染流水线对比：**

| 阶段 | 说明 | 性能 |
|------|------|------|
| Layout | 回流，计算几何属性 | 昂贵 |
| Paint | 重绘，填充像素 | 中等 |
| Composite | GPU 合成 | 快速 |

**transform/opacity 优化：**

| 变化 | 流水线 | 说明 |
|------|--------|------|
| 普通属性变化 | DOM → Style → Layout → Paint → Composite | 触发回流/重绘 |
| transform/opacity 变化 | DOM → Style → [跳过Layout] → [跳过Paint] → Composite | 直接交给 GPU 处理 |

**原理：** 浏览器知道 transform/opacity 变化不影响几何属性，可以直接交给 GPU 处理，不触发回流/重绘。

### 2.2 GPU 加速原理

**为什么 GPU 加速快？**

- GPU 是专门处理图像并行计算的硬件（数千个核心）
- CSS 渲染合成层时，GPU 直接在内存中处理像素，不经过 CPU
- 合成层独立于主线程，主线程 JS 阻塞不影响动画

**什么时候创建合成层（Compositor Layer）？**
```css
/* 1. 3D/透视变换 */
transform: translate3d(0, 0, 0);
transform: perspective(1000px);

/* 2. will-change 提示 */
will-change: transform;
will-change: opacity;

/* 3. video / canvas / iframe */

/* 4. 动画或过渡的 opacity / transform */

/* 5. 硬件加速别名 */
transform: translateZ(0);
```

**注意事项：合成层过多会导致内存占用过大。**

### 2.3 will-change 作用

```css
/* 提前告诉浏览器元素的哪些属性会变化 */
.animated {
  will-change: transform;    /* 浏览器提前创建合成层 */
}

/* 动画结束后移除 */
.animated {
  will-change: auto; /* 动画结束后关闭 */
}

/* 不推荐的写法：全局应用 */
* { will-change: transform; } /* 内存爆炸 */
```


## 3. 面试精讲：opacity vs visibility vs display 区别

| 属性 | 值 | 可见性 | 交互（点击等） | 渲染 | 过渡动画 |
|------|-----|-------|-------------|------|---------|
| `display: none` | - | 不可见 | 不存在 | **不渲染**，不占位 | 不可过渡 |
| `visibility: hidden` | - | 不可见 | 不可交互 | **渲染但不可见**，占位 | 可过渡 |
| `visibility: collapse` | - | 不可见（表格行/列塌陷） | 不可交互 | 渲染但行为特殊 | 可过渡 |
| `opacity: 0` | 0-1 | 不可见 | **可交互** | **渲染**，占位 | 可过渡 |

```css
/* display: none */
.hidden { display: none; }
/* → 不渲染（不占位，DOM 仍存在但不渲染） */
/* → 无法通过 transition 过渡 */

/* visibility: hidden */
.hidden { visibility: hidden; }
/* → 渲染但不可见（占位，opacity: 0 但可交互） */
/* → visibility 可过渡：hidden → visible */
/* → 子元素可用 visibility: visible 覆盖显示 */

/* opacity: 0 */
.hidden { opacity: 0; }
/* → 渲染且可见度为0（占位，仍可点击/交互！） */
/* → 可过渡：0 → 1 */

.hidden {
  opacity: 0;
  pointer-events: none; /* 结合 pointer-events 禁用交互 */
}
```


## 4. 面试精讲：CSS 阻塞渲染，link vs @import，CSS 性能优化

### 4.1 CSS 阻塞渲染原理

```
浏览器渲染流水线：

HTML 解析
    ↓
CSS 下载 + 解析（render-blocking）
    ↓
DOM Tree + CSSOM → Render Tree
    ↓
Layout（计算布局）
    ↓
Paint（绘制）
    ↓
Composite（合成）
    ↓
显示

CSS 是 render-blocking 资源：
→ 浏览器不会渲染任何内容，直到 CSSOM 构建完成
```

### 4.2 link vs @import

```html
<!-- link（推荐）：并行下载，不阻塞 HTML 解析 -->
<link rel="stylesheet" href="style.css">

<!-- @import（不推荐）：串行下载，阻塞渲染 -->
<style>
  @import url("other.css");
  @import url("another.css");
</style>
```

**@import 加载顺序：** 串行！一个失败全失败！link 并行：所有 CSS 同时下载。

### 4.3 CSS 性能优化

**减少 CSS 体积：**
```css
/* 1. CSS 压缩（cssnano / csso / clean-css） */

/* 2. 移除未使用的 CSS（PurgeCSS / UnCSS） */

/* 3. 提取关键 CSS，内联首屏样式 */

/* 4. 使用 CSS 变量，减少重复定义 */
:root {
  --primary: #0066ff;
  --spacing: 8px;
}
```

**减少渲染阻塞：**
```html
<!-- 1. Critical CSS 内联 -->
<head>
  <style>/* 首屏关键样式 */</style>
</head>

<!-- 2. 非关键 CSS 异步加载 -->
<link rel="stylesheet" href="non-critical.css"
      media="print" onload="this.media='all'">

<!-- 3. preload 关键资源 -->
<link rel="preload" href="font.woff2" as="font" crossorigin type="font/woff2">

<!-- 4. font-display 优化字体加载 -->
@font-face {
  font-family: 'MyFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}
```

**减少选择器复杂度：**
```css
/* 复杂选择器 */
.header nav ul li a span { }

/* 简单选择器 */
.nav-link { }
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [`will-change` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change) | 官方定义将元素提升为合成层的提示，并警告滥用代价。 | 重点读「不要过度使用」一节，想清楚何时该加、何时该在动画结束后移除。 |
| [`transform` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform) | 理解 transform 只影响绘制与合成、不触发布局的核心属性参考。 | 看取值与 transform-origin，写动画对比 top/left，观察是否触发回流。 |
| [`visibility` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/visibility) | 说明 visibility 隐藏仍占位、可过渡、子元素可覆盖的语义。 | 读取值与可访问性说明，配合 display、opacity 做隐藏三态对比实验。 |
| [`opacity` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/opacity) | 讲清 opacity 的合成层行为以及与 visibility 的语义差别。 | 读层叠上下文与性能提示，测试透明元素是否仍能接收点击。 |
| [`display` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/display) | display 的 none 与多关键字语法是判断重排的根本依据。 | 重点读 none 与内部外部显示类型，解释切换 display 为何整页重排。 |
| [`@import` CSS at-rule](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@import) | 官方说明 @import 的加载与阻塞行为，便于与 link 对照。 | 读性能相关段落，测同时用 link 与 @import 时的加载瀑布图差异。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN CSS 过渡](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions) | 可运行示例，验证 hover 过渡只触发合成而非布局。 | 照文中按钮过渡复刻一遍，用 Performance 面板确认只有 Composite 记录。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [渲染性能](https://web.dev/articles/rendering-performance) | 系统梳理布局、绘制、合成三阶段与各阶段优化手段。 | 读避免大型复杂布局一节，把动画从 top 改成 transform 前后各测一次。 |
| [web.dev：仅合成器属性与图层数量](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count) | 从图层视角解释 will-change 与 transform 的收益和显存代价。 | 按步骤打开 DevTools Layers，数一数滥用 will-change 后图层数量的变化。 |
| [CSS 与网络性能](https://csswizardry.com/2018/11/css-and-network-performance/) | 讲透 CSS 阻塞渲染的机制与关键 CSS、媒体查询拆分思路。 | 读完后列出首屏必需样式并内联，其余用媒体查询或异步方式加载。 |
| [浏览器工作原理（Inside look 第 1 部分）](https://developer.chrome.com/blog/inside-browser-part1) | 从多进程架构解释渲染主线程与合成线程的分工。 | 读后画出 Browser、Renderer、GPU、Network 分工图，标出回流发生的位置。 |
| [Harry Roberts：CSS Wizardry](https://csswizardry.com/) | 资深性能工程师的实战文章，讲阻塞渲染与资源提示判断。 | 挑渲染阻塞相关篇目精读，读后给站点补 preload 与媒体查询拆分。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格滚动 | 几何属性变化触发回流，transform 只走合成 | 窗口化渲染 + translate3d 定位行 | 固定行高才好算偏移，变高行要缓存测量结果 |
| 低端安卓机的活动页首屏 | CSS 阻塞渲染，link 与 @import 的加载差别 | 关键 CSS 内联，其余异步 link | 内联体积过大会拖慢 HTML 下载 |
| 多人协作白板拖动图形 | transform 与 opacity 不触发回流，合成层交给 GPU | Canvas 或 DOM + will-change | 合成层数量上升会占显存 |
| 电商秒杀倒计时与按钮动画 | opacity、transform 走合成，display 触发布局 | CSS animation + transform: scale | 动画帧里读 offsetWidth 会强制同步布局 |
| 聊天窗口插入新消息 | 节点插入引发回流，visibility 与 display 代价不同 | 预留占位高度 + transform 插入动画 | 插到顶部会顶动下面全部内容 |
| 数据看板实时刷新图表 | 重绘代价与绘制面积相关 | Canvas 绘制替代大量 DOM 节点 | 高频刷新要合并到 rAF |
| 移动端瀑布流下拉加载 | 回流范围与节点层级、尺寸是否已知有关 | 固定容器尺寸 + 占位图 | 图片不设尺寸会二次回流 |
| 弹窗遮罩的显示隐藏 | visibility 保留布局，display 移除布局 | visibility + opacity 过渡 | display: none 无法参与过渡 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格滚动

**业务背景**：运营后台一次列出全部订单记录，行数从几百涨到上万。滚动时每帧都要重新布局并绘制整表，低配办公机上的滚动会掉帧。

**怎么用本页知识解决**：思路是只渲染视口内的行，用 transform 位移容器，滚动过程中不改动整表结构。

```js
const ROW_H = 40;   // 行高固定，偏移量用乘法算
const PAD = 5;      // 上下多渲染几行，滚动不出空白

function render(scrollTop) {
  const h = innerHeight;                              // 视口高度
  const start = Math.max(0, scrollTop / ROW_H - PAD | 0);
  const end = start + h / ROW_H + PAD * 2;
  renderRows(start, end);        // 只替换可视区的行，不重建整表
  list.style.transform =         // 用 transform 位移，不改 top
    `translate3d(0, ${start * ROW_H}px, 0)`;
}
let queued = false;
addEventListener('scroll', () => {
  if (queued) return;            // 一帧只处理一次
  queued = true;
  requestAnimationFrame(() => {
    render(scrollY);
    queued = false;
  });
});
```

- 行高固定后，第 N 行的位置是一次乘法，不需要逐行读 `offsetTop`，避开了强制同步布局。
- 滚动回调只记录状态，渲染放进 `requestAnimationFrame`，一帧最多写一次 DOM。
- 位移用 `transform` 而不是 `top`，transform 不参与布局计算，只更新图层位置。
- 行节点复用，DOM 总量保持在视口行数加缓冲行的量级，绘制面积不随数据量增长。
- 筛选和排序时先算出结果数组，再一次性替换可视区节点，不在循环里逐行插入。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板录制滚动 3 秒，看超过 16.7 ms 的帧数、Layout 事件的次数与耗时；再用 PerformanceObserver 的 `longtask` 统计长任务总时长。

**什么时候不该用**：

- 行数在几十行以内、行高由内容撑开时，直接渲染全部行代码量最小，窗口化还要处理高度测量。
- 需要整表打印、浏览器原生 Ctrl+F 查找、跨行文本选择时，未渲染的行无法被找到或选中。

#### 场景 2：低端安卓机的活动页首屏

**业务背景**：面向移动端的活动页在 head 里引用了体积偏大的 UI 框架样式。低端安卓机 CPU 弱，样式下载和解析期间页面保持白屏。

**怎么用本页知识解决**：CSS 阻塞渲染，是因为渲染树要等样式表就绪。思路是首屏必需的样式内联进 HTML，非首屏样式改成不阻塞首次渲染的方式加载。

```html
<head>
  <!-- 首屏必需样式内联，随 HTML 一起到达，不额外发请求 -->
  <style>/* 头部、按钮、骨架屏的最小样式 */</style>

  <!-- 非首屏样式用 media 降级为不阻塞，加载完再切回 all -->
  <link rel="stylesheet" href="detail.css" media="print" onload="this.media='all'">
  <!-- 脚本关闭时 onload 不执行，用它兜底 -->
  <noscript><link rel="stylesheet" href="detail.css"></noscript>
</head>
```

- `link` 在 head 里会阻塞渲染，`@import` 还要等父样式表下载完才知道有这份子样式，等待被串起来。
- `media="print"` 让浏览器以非阻塞优先级下载这份样式，`onload` 时改成 `all` 再应用。
- 内联的关键 CSS 覆盖首屏可见区域，超出首屏的样式放外链。
- 关闭 JS 时 `onload` 不触发，`noscript` 里的 `link` 保证样式仍然可用。

**怎么度量收益**：Chrome DevTools 的 Lighthouse 看 FCP 与 LCP，Performance 面板看 Render blocking 标记的时长；真机上用 web-vitals 库上报 LCP 与 CLS 的分位数。

**什么时候不该用**：

- 页面是单页应用、首屏 HTML 由 JS 生成时，内联关键 CSS 的收益会被 JS 执行时间吃掉，要先测再改。
- 站点 CSP 禁止内联样式时，`<style>` 与 onload 内联事件处理器都会被拦，需改用外链加 nonce 或 hash。

#### 场景 3：多人协作白板

**业务背景**：白板上同时存在几十个图形元素，多人拖动时持续产生位置更新。每个元素一个 DOM 节点，拖动时改 left/top 会让整块画布回流。

**怎么用本页知识解决**：把位置更新换成 transform，只给正在拖动的元素开 will-change，交互结束立刻撤销，避免合成层堆积。

```js
function startDrag(el) {
  // 拖动期间声明要变的是 transform，浏览器提前做准备
  el.style.willChange = 'transform';
  el._x = el.offsetLeft;   // 读取一次，缓存基准位置
  el._y = el.offsetTop;
}

function onMove(el, dx, dy) {
  // 只改 transform，元素不参与布局重算
  el.style.transform = `translate(${dx}px, ${dy}px)`;
}

function endDrag(el, dx, dy) {
  // 收尾时把位移写回布局属性，再撤销 will-change
  el.style.left = `${el._x + dx}px`;
  el.style.top = `${el._y + dy}px`;
  el.style.transform = '';
  el.style.willChange = 'auto';
}
```

- `will-change: transform` 让浏览器提前把元素提升到合成层，拖动期间只更新图层位置。
- 拖动结束写回 left/top 并清掉 transform，元素回到正常布局流，后续对齐计算不受影响。
- `will-change` 用完设回 `auto`，长期挂着的合成层会占用显存。
- 一次拖动只在开始时读一次 `offsetLeft` 与 `offsetTop`，移动回调里不读布局属性。
- 合成层数量等于同时在拖的元素数，需要限制画布上可同时操作的元素个数。

**怎么度量收益**：Performance 面板录制拖动 5 秒，比较 Recalculate Style 与 Layout 的耗时和每帧时长；Rendering 面板打开 Layer borders 数合成层，Performance 的 GPU 内存行看显存占用。

**什么时候不该用**：

- 元素数量在十个以内、拖动不频繁时，直接改 left/top 代码更短，维护成本低于收益。
- 拖动过程要实时吸附对齐、反复读取元素真实位置时，transform 的结果不反映到 `offsetLeft`，读回坐标要额外换算。

### 行业先进实践

**content-visibility: auto 跳过屏外渲染（出处：MDN Web Docs 的 content-visibility 词条 / W3C CSS Containment 规范）**
给屏外的大块内容设 `content-visibility: auto`，浏览器跳过它的布局与绘制，接近视口时再恢复。渲染工作量只花在可见区域，配合 `contain-intrinsic-size` 声明占位高度可减少滚动条跳动。借鉴方式：在长文档、长列表的区块容器上启用，并给出占位尺寸。

**只用 transform 与 opacity 做动画（出处：web.dev 文章 High performance animations）**
这两条属性的变化可以交给合成线程处理，不进入布局与绘制阶段。借鉴方式：把常驻动画的关键帧过一遍，left/top/width/height 的动画改成 transform，并在 DevTools 的 Rendering 面板确认动画期间没有 Layout。

**用 Rendering 与 Performance 面板定位回流来源（出处：Chrome DevTools 官方文档）**
Rendering 面板的 Paint flashing 显示真实重绘区域，Layout Shift Regions 显示位移，Performance 录制里能看到 Layout 事件及其调用栈。它能区分耗时出在样式计算、布局还是绘制。借鉴方式：把同一段交互的录制脚本固定下来，作为性能验收的对照。

**will-change 按生命周期使用（出处：MDN Web Docs 的 will-change 词条）**
MDN 提示不要把它当作性能问题的第一手段，应在元素即将变化前添加、变化结束后移除。常驻的合成层会占内存，也可能带来额外的合成开销。借鉴方式：写成 pointerdown 添加、pointerup 移除，不写在全局样式里。

**窗口化渲染交给现成库（出处：TanStack Virtual 开源项目；Ant Design Table 文档）**
窗口化要处理动态行高、滚动锚定、无障碍，自行实现的边界问题多。TanStack Virtual 提供 headless 的测量与偏移计算，可与现有渲染逻辑组合。需核对官方文档：确认 Ant Design Table 当前版本是否提供虚拟滚动属性、动态行高是否支持、以及配套滚动容器的要求。

### 从学到用：落地路线

**第 1 步 试点**：选一个数据量最大的列表页做窗口化渲染改造。验收标准：滚动 10 秒的 Performance 录制里，没有超过 50 ms 的长任务。

**第 2 步 验证**：在同一台设备上用同一录制脚本对比试点页与对照页。验收标准：Layout 次数与长任务总时长两项都不高于对照页。

**第 3 步 推广**：把关键 CSS 内联、动画只用 transform 与 opacity、列表走同一套滚动组件写进代码评审清单。验收标准：新增列表页默认引用该组件，评审清单被实际勾选。

**第 4 步 防回退**：在 CI 里跑 Lighthouse CI，为 LCP 与 CLS 设定预算阈值。验收标准：超出预算的提交被拦截，并附上报告与对比数据。

### 动手作业

**目标**：做一个 5000 行的可筛选列表页，滚动与筛选时的每帧耗时可控，并留下一份可对比的性能记录。

**步骤**：

1. 用固定行高 40px 渲染 5000 条数据，录制滚动 10 秒的 Performance 结果，记录 Layout 次数与最长帧时长。
2. 实现窗口化渲染：只渲染视口行数加上下缓冲行，容器用 transform 位移。
3. 滚动回调里只记 `scrollTop`，渲染放进 `requestAnimationFrame`，加一帧一次的合流开关。
4. 给筛选输入加防抖，筛选时先算出结果数组，再一次性替换可视区节点。
5. 为拖动排序加 `will-change: transform` 开关，交互期间开启、结束后关闭，各录一次数据对比。
6. 打开 Rendering 面板的 Paint flashing 与 Layer borders，记录重绘区域与合成层数量的变化。
7. 把 CPU 降速 4 倍后重跑第 1 步的录制，对比两次结果。

**验收标准**：

- 滚动 10 秒内没有超过 50 ms 的长任务。
- 5000 行与 500 行两种数据量下，滚动期间的 Layout 次数处于同一量级。
- 筛选后可视区内容与数据源一致，滚动到底能看到最后一条。
- 交互结束后所有元素的 `will-change` 回到 `auto`，控制台无报错。
- 键盘 Tab 能依次聚焦可视区内的可交互元素，不出现焦点丢失。

