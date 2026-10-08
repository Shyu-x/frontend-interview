---
title: Canvas、SVG 与多媒体标签
description: Canvas 与 SVG 的取舍，以及 picture、source、audio、video 多媒体标签。
---

# Canvas、SVG 与多媒体标签

## 1. Canvas vs SVG 区别

### 1.1 定义与核心原理

| 技术 | 核心定义 | 渲染模型 |
|------|---------|---------|
| **Canvas** | 通过 JavaScript 在位图画布上逐**像素**绑制图形的 HTML5 API |  Immediate Mode（立即模式）：绑定后像素进入显存，丢失绘图命令 |
| **SVG** | 用 XML 语言描述**矢量图形**，由浏览器渲染引擎解析并绘制为矢量 | Retained Mode（保留模式）：每个图形是 DOM 节点，浏览器维护对象树 |

**根本区别：**
```
Canvas：Pixels in → Bitmap in GPU memory（绑定后无法单独修改某个像素）
SVG：DOM Node Tree → Render Engine → Vector Pixels（每个节点独立，可单独修改）
```

### 1.2 性能边界（面试高频）

**Canvas 优势区间（什么时候选 Canvas）：**

| 条件 | Canvas 表现 | SVG 表现 |
|------|------------|---------|
| 图形数量 > **1000** | 是 60fps 流畅 | 否 严重卡顿（DOM 节点过多） |
| 高频更新（**>30fps**） | 是 直接重绘帧缓冲区 | 否 频繁 DOM 更新 + 重排 |
| 像素级操作（滤镜/像素抓取） | 是 原生支持 getImageData | 否 难以实现 |
| 游戏（帧同步） | 是 requestAnimationFrame 驱动 | 否 不适合 |
| 图表/数据可视化（实时数据） | 是 大数据量渲染 | 数据点 <500 可行 |

**SVG 优势区间（什么时候选 SVG）：**

| 条件 | SVG 表现 | Canvas 表现 |
|------|---------|------------|
| 图形数量 < **500** | 是 流畅 | 也可以 |
| 需要交互（点击/悬停） | 是 天然 DOM 事件 | 否 需手动坐标检测 |
| 需要 CSS 样式控制 | 是 直接用 CSS | 否 需重新绑定 |
| 需要导出矢量文件 | 是 原生 SVG | 否 需 toDataURL 转换 |
| 响应式（不同尺寸清晰） | 是 矢量，放大不失真 | 否 依赖分辨率 |
| 图标/UI 组件 | 是 最佳选择 | 否 过度设计 |

**经验公式：**
> 图形数量 < 500 且需要交互 → **SVG**
> 图形数量 > 1000 或需要像素级操作 → **Canvas**
> 两者之间 → 根据具体场景权衡

### 1.3 代码级示例

**Canvas 完整工作流（高清屏适配 + 动画）：**
```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// 高清屏适配（必须）
const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
ctx.scale(dpr, dpr); // 将逻辑像素坐标系缩放回 CSS 像素坐标系

// 绑定图形
ctx.fillStyle = '#ff6b6b';
ctx.beginPath();
ctx.arc(100, 100, 50, 0, Math.PI * 2);
ctx.fill();

// 动画循环（游戏场景）
let angle = 0;
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空画布
  angle += 0.05;
  ctx.save();
  ctx.translate(rect.width / 2, rect.height / 2);
  ctx.rotate(angle);
  ctx.fillRect(-25, -25, 50, 50);
  ctx.restore();
  requestAnimationFrame(animate);
}
animate();

// 导出为图片
const dataUrl = canvas.toDataURL('image/png');
```

**SVG 完整工作流（交互 + CSS + 动画）：**
```html
<svg viewBox="0 0 200 200" width="200" height="200">
  <!-- CSS 控制样式 -->
  <style>
    .bar { fill: #4ecdc4; transition: fill 0.2s; }
    .bar:hover { fill: #ff6b6b; cursor: pointer; }
  </style>

  <!-- DOM 事件天然支持 -->
  <rect class="bar" x="10" y="10" width="50" height="80"
        data-value="80"
        onclick="console.log('Clicked!', this.dataset.value)"
        onmouseover="console.log('Value:', this.dataset.value)"/>
</svg>

<!-- 通过 JS 操作 SVG DOM -->
<script>
  const rect = document.querySelector('.bar');
  rect.setAttribute('fill', '#f39c12');
  rect.style.transform = 'scale(1.1)'; // CSS transform 驱动
</script>
```

### 1.4 Canvas 内存管理与高清屏适配

```javascript
// Canvas 内存泄漏常见原因
// 1. requestAnimationFrame 循环未停止
let animId;
function animate() {
  draw();
  animId = requestAnimationFrame(animate);
}
animate();
// 页面切换时未清理
window.addEventListener('unload', () => cancelAnimationFrame(animId));

// 2. Canvas 内容未清空导致离屏缓存占用
// 离屏 Canvas 应在不用时设为 null
let offscreenCanvas = null;
function createOffscreenBuffer() {
  offscreenCanvas = document.createElement('canvas');
  // ...
}
// 清理
function cleanup() {
  offscreenCanvas = null;
}
```

### 1.5 SVG 常见性能问题与优化

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| SVG 内存泄漏 | 每个 SVG 节点是活跃的 DOM 对象 | 减少 SVG 中的 `<style>` 标签；用 CSS 类替代 |
| SVG 重绘慢 | 复杂路径在每次 DOM 变化时重新光栅化 | 用 `will-change: transform` 提示 GPU 加速 |
| SVG 首屏渲染慢 | 内嵌 SVG 大文件阻塞解析 | 外部引用 `<img src="icon.svg">` 而非内嵌 |
| SVG 不支持多线程解析 | SVG 解析在主线程 | 大型 SVG 考虑转为 Canvas 绘制一次 |

**SVG 首屏优化：**
```html
<!-- 错误：内嵌 SVG 大文件（阻塞 HTML 解析） -->
<svg>...5000 行 SVG...</svg>

<!-- 正确：外部引用（不阻塞解析，懒加载） -->
<img src="/illustrations/hero.svg" alt="Hero" width="800" height="600">

<!-- 正确：小图标用内嵌（减少请求数） -->
<svg width="24" height="24"><path d="..."/></svg>
```

### 1.6 高频面试追问

**Q1：Canvas 能实现 SVG 的放大不失真吗？**
> 不能。Canvas 是位图，放大后像素化。但可以通过**矢量图转 Canvas 预绘制**方案：外部 SVG 文件加载后，绘制到 Canvas，后续缩放操作只缩放 Canvas 位图，看起来不失真——但本质还是位图放大，不是真矢量。

**Q2：在 Vue/React 中渲染 10000 个数据点的折线图，用 Canvas 好还是 SVG 好？**
> Canvas。SVG 10000 个 DOM 节点会让浏览器渲染树爆炸（每个 `<path>`/`<circle>` 都是独立节点），即使有虚拟 DOM 也会因为节点数过多导致 diff 成本极高。Canvas 只需一个 `<canvas>` 元素 + JS 遍历 10000 个数据点绑制像素。

**Q3：Canvas 的 `toBlob()` 和 `toDataURL()` 有什么区别？**
> `toDataURL()` 返回 Base64 编码字符串（体积大 33%），`toBlob()` 返回 `Blob` 对象（体积小，可流式上传）。生产环境应优先用 `canvas.toBlob(callback, 'image/png', 0.9)`。

> 参考：
> - [MDN — Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
> - [MDN — SVG](https://developer.mozilla.org/en-US/docs/Web/SVG)
> - [Google Web Fundamentals — Canvas vs SVG](https://developers.google.com/web/fundamentals/design-and-ux/graphics/choosing-effective-m格式)

## 2. picture / source / audio / video 多媒体

### 2.1 picture 响应式图片

```html
<picture>
  <!-- 浏览器逐个检查 source，找到第一个匹配的 -->
  <!-- WebP 格式，优先 -->
  <source
    srcset="image.avif"
    type="image/avif"
  >
  <source
    srcset="image.webp"
    type="image/webm"
  >
  <!-- 大屏幕使用 2x 图片 -->
  <source
    srcset="image-800.jpg 1x, image-1600.jpg 2x"
    media="(min-width: 800px)"
  >
  <!-- 默认图片（兜底） -->
  <img
    src="image.jpg"
    alt="描述"
    width="800"
    height="600"
    loading="lazy"
    decoding="async"
  >
</picture>
```

**img srcset vs picture：**

- `img srcset`：在单个 img 元素内指定多个图片源
- `picture`：用 media 查询或 type 判断选择不同图片（适合 art direction 或格式协商）

### 2.2 audio / video

见 [HTML5 新特性](html5-new-features.md) 中的多媒体标签一节。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [`<canvas>` HTML graphics canvas element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas) | canvas 元素官方参考，属性、事件与替代内容一网打尽。 | 读 width/height 与事件小节，再照示例在页面插入 canvas 并提交 getContext('2d')。 |
| [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) | 系统梳理 2D 上下文全部绘图接口，是 Canvas 能力边界的权威清单。 | 读概述与接口方法列表，标记常用方法后回去改写教程示例。 |
| [Scaling SVG backgrounds](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Backgrounds_and_borders/Scaling_SVG_backgrounds) | 讲清 SVG 作为可缩放矢量背景的行为，正对 Canvas 与 SVG 的差异。 | 重点读尺寸与 viewBox 控制部分，思考同一图形用 canvas 位图绘制会怎样。 |
| [Use cross-origin images in a canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image) | 解释跨域图片画进 canvas 后为何被污染，是实战必踩的坑。 | 读示例中 crossOrigin 与回退分支，用本地服务器复现并解决 taint 报错。 |
| [`<video>` HTML video embed element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video) | video 元素官方参考，覆盖属性、格式支持与字幕轨道。 | 读属性表与 track 小节，给示例视频补上 controls 与 poster 再试效果。 |
| [`<source>` HTML media or image source element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/source) | source 在 picture 与音视频中有两种用法，常被混淆，本文一次讲清。 | 对照 type、media、srcset 属性表，分别写出 picture 与 video 各一份 source。 |
| [`<picture>` HTML picture element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture) | picture 响应式图片的官方定义，含艺术方向与格式回退示例。 | 读示例部分，按 srcset、media、type 三种条件各写一份自己的标记。 |
| [`<audio>` HTML embed audio element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/audio) | audio 元素完整参考，含格式支持与脚本控制接口。 | 读属性与事件小节，用 JS 控制 play/pause 并监听 ended 做播放列表。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [SVGOMG](https://jakearchibald.github.io/svgomg/) | 在线压缩 SVG 并实时对比，直观看到矢量文件的体积与结构。 | 拖入手写 SVG，逐项开关优化选项，观察路径与元数据变化后导出。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN Canvas 教程](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial) | 手把手教程，从路径到动画层层推进，最容易建立绘图手感。 | 顺序做完路径、变换、动画章节，最后独立实现一个弹球小游戏。 |
| [Web Audio API（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | 比 audio 标签更底层的音频编程入口，讲清音频图与节点。 | 按教程用振荡器与增益节点搭一个合成器，再尝试接入麦克风输入。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格 | Canvas 位图写入，无法单独修改像素 | Canvas 只画可见行，DOM 保留读屏文本 | 需要清空重绘，文本选择、复制要另做 DOM 或快捷键 |
| 低端安卓的首屏图片加载 | `<picture>`、`<source>`、`srcset` 响应式选择 | AVIF/WebP 优先，JPEG 回退 | 要在目标机型实测解码时间，不能只看文件字节 |
| 多人协作白板 | Canvas 位图绘图，指令重放 | 笔画指令数组 + `requestAnimationFrame` 整体重绘 | 对象级选中、缩放需要额外命中检测结构 |
| SVG 图标库与地图底图 | Canvas 与 SVG 的选择边界 | 小图标、可交互地图用内联 SVG `<symbol>`/`<use>` | SVG 节点上千后事件与布局会变慢 |
| 视频首屏背景 | `<video>`、`preload`、`playsinline` | `preload="metadata"`，静音自动播放 | 移动端自动播放策略可能拦截，必须提供静音与暂停按钮 |
| 商品图预览与截图 | Canvas `drawImage` 从图片或视频取帧 | 点击后把 `img`/`video` 当前帧绘制到 Canvas | 跨域资源需 `crossOrigin`，否则 Canvas 会被污染无法导出 |
| 游戏 HUD 与粒子特效 | Canvas 位图每帧重绘 | 单个全屏 Canvas + `requestAnimationFrame` | 主线程长时间绘制会掉帧，复杂场景需要 WebGL 或离屏画布 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

- **业务背景**：运营系统需要一次展示数万行订单或用户数据，DOM 表格会让首屏渲染和滚动变得很慢。业务验收要求滚动可操作、当前行可读屏朗读。
- **怎么用本页知识解决**：用 Canvas 作为绘制层，只画可见行；同时保留一个隐藏 DOM 文本节点给屏幕阅读器。像素无法单独修改，因此滚动后每次清空画布再画可见行。

```js
// 页面已有 <canvas id="tableCanvas"> 和隐藏的可访问日志节点
const canvas = document.getElementById('tableCanvas');
const ctx = canvas.getContext('2d');
const rows = fetchRows(); // 取回全量行数据
const rowHeight = 28;
let scrollTop = 0;

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 像素已写入，只能整层重清
  const first = Math.floor(scrollTop / rowHeight);
  const last = first + Math.ceil(canvas.height / rowHeight) + 1;
  for (let i = first; i < Math.min(last, rows.length); i++) {
    const y = i * rowHeight - scrollTop;
    ctx.fillText(rows[i].name, 20, y + 18); // 只绘制当前可见行
    ctx.fillText(rows[i].status, 300, y + 18);
  }
  updateA11y(rows.slice(first, last)); // 同步给屏幕阅读器
}
canvas.addEventListener('wheel', (e) => {
  scrollTop = Math.max(0, scrollTop + e.deltaY);
  requestAnimationFrame(render);
});
```

- Canvas 只画首尾可见行，避免数万行全部进入绘制循环。
- 每次滚动先 `clearRect` 清屏，因为 Canvas 像素写入后不能单独删除某个单元格。
- 隐藏 DOM 文本节点同步当前可见行内容，弥补 Canvas 文本不可直接读屏的问题。
- 如果同一页有筛选、排序，重绘前先更新 `rows`，再调用 `render`。
- 这个方案牺牲了自动换行和文本选择，只适合展示型表格。

- **怎么度量收益**：看首屏可交互时长、滚动帧率、内存占用。用 Chrome DevTools Performance 记录 `render` 耗时；用 `requestAnimationFrame` 采样滚动帧率；用 DevTools Memory 面板记录强制回收前后的堆内存。
- **什么时候不该用**：表格行数只有几百且需要原生文本选择、复制、打印时，直接 DOM 表格更合适。单元格内有大量输入框或下拉框时，Canvas 命中检测与焦点管理成本会抵消性能收益。

#### 场景 2：多人协作白板

- **业务背景**：白板页面需要同时呈现很多笔画，参会者连续画线时 SVG 节点会持续增加，部分设备在几百条线后出现拖动延迟。产品要求支持撤销和回放。
- **怎么用本页知识解决**：把每个笔画保存为指令，不在 Canvas 里直接存像素。每次重绘时清空画布，按指令重放所有笔画，因为像素写入后不能只修改新增的一个点。

```js
const strokes = [];
canvas.addEventListener('pointerdown', (e) => {
  strokes.push({ color: currentColor, points: [getPoint(e)] });
});
canvas.addEventListener('pointermove', (e) => {
  if (e.buttons !== 1) return;
  strokes[strokes.length - 1].points.push(getPoint(e));
  redrawAll();
});
function redrawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 不能只更新一个新点
  for (const s of strokes) {
    ctx.strokeStyle = s.color;
    drawPolyline(s.points); // 按指令重放整条线
  }
}
function undo() {
  strokes.pop(); // 撤销一条笔画
  redrawAll();
}
```

- 笔画数据与像素分离，撤销只需要删除指令再重放，不需要保存多张位图。
- 每条新线到达时都清空重画，这是 Canvas 像素不可局部修改带来的成本。
- 重放耗时会随笔画总数增长，后期需要把静态背景和正在绘制的笔画分层。
- 回放功能可以直接按时间戳顺序执行 `strokes`，不需要依赖最终位图。

- **怎么度量收益**：看笔画数上升后的绘制帧率、撤销重放耗时、指令数组内存。用 Chrome DevTools Performance 在 200、500、1000 条笔画下分别记录 `redrawAll` 耗时；用 Memory 面板观察 `strokes` 数组大小。
- **什么时候不该用**：需要单独选中、移动、缩放已有对象时，没有对象模型只靠像素无法判断命中。需要导出可编辑 SVG 给设计工具时，Canvas 位图不保存矢量结构。

#### 场景 3：低端安卓的首屏商品图加载

- **业务背景**：商品列表首屏把同一张高清图送到小屏手机，低端安卓设备解码慢，首屏内容出现明显等待。产品要求首屏图片不模糊，但不能阻塞正文出现。
- **怎么用本页知识解决**：用 `<picture>` 按格式和 DPR 提供多个候选，浏览器只下载第一个匹配的 `source`，避免把 2 倍图发给 1 倍屏。

```html
<picture>
  <source type="image/avif"
          srcset="cover-480.avif 1x, cover-960.avif 2x">
  <source type="image/webp"
          srcset="cover-480.webp 1x, cover-960.webp 2x">
  <img src="cover-960.jpg"
       srcset="cover-480.jpg 1x, cover-960.jpg 2x"
       alt="图书封面" width="480" height="640">
</picture>
```

- 浏览器按 `type` 和 `srcset` 选择第一个可解码的分支，不支持 AVIF 时才会尝试 WebP 或 JPEG。
- `1x`、`2x` 让 1 倍屏只下载 480px 版本，避免给低端机增加解码负担。
- 内层 `<img>` 同时承担回退和 `alt` 可访问名称，脚本不可用时仍可显示 JPEG。
- 需要确认 CDN 已生成多格式、多宽度文件，并保持宽高比一致。

- **怎么度量收益**：看 LCP、图片传输字节、图片解码时间。用 WebPageTest 的低端安卓模拟配置测首屏；用 Lighthouse 看 LCP 和图片诊断；用 Chrome DevTools Network 确认请求文件是 AVIF 还是 JPEG。
- **什么时候不该用**：用户上传的少量原图需要实时展示时，维护多格式副本会增加存储成本。医疗影像或印刷预览这类需要精确色彩和纹理的场景，格式转换可能改变像素。

### 行业先进实践

1. 响应式图片多源协商（出处：MDN Responsive images 官方文档）  
   `<picture>` 配合 `srcset`、`sizes`，浏览器只下载匹配屏幕和格式的候选。你的项目可以把商品图统一生成 AVIF、WebP、JPEG 三档，避免移动端加载大图。

2. Canvas 分层缓存（出处：HTML Standard 的 canvas 元素与性能优化章节，需核对官方文档：确认 OffscreenCanvas 在目标浏览器的 2D 上下文支持范围）  
   把静态背景和动态前景拆到不同 Canvas 或离屏画布，每帧只重绘变化层。白板和图表项目可把网格、背景、选区拆开，减少整屏清空与重绘面积。

3. SVG `<use>` 图标集（出处：MDN SVG `<use>` 官方文档）  
   一次定义 `symbol`，多个地方用 `<use>` 引用，减少重复路径和 DOM 节点。你的项目可把图标放到单个 SVG sprite，给每个 `<use>` 保留 `<title>` 作为可访问名称。

4. `<video>` 的 `preload="metadata"` 与 `playsinline` 组合（出处：MDN `<video>` 属性参考；Apple Developer 视频策略文档，需核对官方文档：确认 iOS 上 `playsinline` 默认行为与 `preload` 限制）  
   首屏背景视频只预加载元数据，可减少首帧解码与网络竞争。你的项目可对非关键视频使用该组合，并保留静音和暂停按钮。

### 从学到用：落地路线

1. 在后台管理表格试点 Canvas 绘制。验收：测试机上 10 万行数据滚动帧率不低于 50 fps，读屏可朗读当前行。
2. 用 Chrome DevTools Performance 和 Lighthouse 记录试点页与旧 DOM 页的 LCP、主线程耗时、内存。验收：有三轮可复现的测量数据和对比脚本。
3. 把验证过的模式推广到白板和多媒体页面，保留旧实现开关。验收：功能回归通过，性能不劣化，切换开关能回退。
4. 把性能预算写入 CI 和发布前检查。验收：图片字节或滚动帧率超出阈值自动告警，一键回退到旧实现。

### 动手作业

- **目标**：做一个响应式图书列表页，封面用 `<picture>` 多格式加载；点击封面后把图片绘制到 Canvas，并显示当前显示宽度。
- **步骤**：
  1. 用图片工具生成 480px 和 960px 宽的 AVIF、WebP、JPEG 六张封面。
  2. 页面里用 `<picture>` 和 `srcset` 写封面，保留 `alt`。
  3. 给封面加点击事件，把当前 `img` 绘制到 Canvas，按显示宽度缩放。
  4. 为 Canvas 区域放隐藏文本，内容为“封面预览，当前宽度 480px”。
  5. 用 Chrome DevTools Network 确认支持 AVIF 的浏览器只请求 AVIF 文件。
  6. 用 Performance 面板记录从点击到 Canvas 绘制完成的时间。
  7. 在低端安卓模拟器上对比只加载 1600px 原始 JPG 的页面，记录 LCP。
- **验收标准**：
  1. 支持 AVIF 的浏览器网络面板只出现 `cover-*.avif` 请求，不回退到 JPEG。
  2. 点击封面后 Canvas 出现缩放后的缩略图，隐藏文本可被读屏朗读。
  3. 测试设备上点击到绘制完成时间低于 100ms。
  4. 低端安卓模拟器上首屏图片字节比原始 1600px JPG 减少至少 30%。
  5. 脚本被禁用时，内层 `<img>` 仍能显示 JPEG 封面。

