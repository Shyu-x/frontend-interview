# 前端面试扩充：Canvas vs SVG + 响应式图片 + Web Storage + Web Worker

> 本文档是对前端面试全家桶中四个核心知识点的深度扩充。
>
> **最后更新时间：2026-05-10**
>
> **参考来源：** MDN、web.dev、Chrome Blog、Journal of Imaging (2026)

---

## 一、Canvas vs SVG 深度解析

---

### 1.1 核心原理：位图 vs 矢量

这是二者最本质的差异，决定了后续所有行为和性能特征。

**Canvas（位图/Raster）：**

Canvas 在内存中维护一个**像素数组（Frame Buffer）**。当你调用 `ctx.fillRect(10, 10, 100, 50)`，浏览器直接将对应区域的像素值写入这个数组。一旦绘制完成，那个矩形只是一个颜色块——你不会在内存中找到"矩形对象"，只能找到染色后的像素。这被称为"fire and forget"模型。

```
Canvas 绘制流程：
  JavaScript API 调用
     → 渲染上下文 2D 状态机（fillStyle, strokeStyle, lineWidth...）
        → 光栅化引擎（Skia / Direct2D / CoreGraphics）
           → 像素数据写入显存
              → 合成器 Composite → 显示在屏幕
```

**SVG（矢量/Vector）：**

SVG 将每个图形描述为一个保留在 DOM 树中的、用 XML 表达的**矢量对象**。`<circle cx="50" cy="50" r="30" fill="red"/>` 在浏览器内部是一个可寻址的 `SVGCircleElement` DOM 节点，参与完整的 DOM 管线：

```
SVG 渲染流程：
  XML 解析 → DOM Tree → Style Calculation → Layout（Reflow）
     → Painting（矢量 → 像素光栅化）→ Composite → 显示在屏幕
```

关键区别：**Canvas 只经过 Composite；SVG 经过全部 4-5 步。**

---

### 1.2 DOM 节点 vs 像素渲染的性能边界

根据 Journal of Imaging 2026 年 1 月发表的跨平台基准测试（8 种动画技术在 5 个操作系统下的对比），精确的性能边界如下：

| 图形数量 | Canvas 2D | SVG（DOM） | 推荐 |
|---------|-----------|-----------|------|
| ≤ 100 个 | 60 FPS 稳定 | 60 FPS 稳定 | **SVG**（交互更简单） |
| ~300 个 | 60 FPS 稳定 | 轻微降帧（~50 FPS） | SVG 仍可用 |
| ~500 个 | 60 FPS 稳定 | 明显退化（~30-40 FPS） | **Canvas** 开始占优 |
| 1,000 个 | 60 FPS 稳定 | 严重掉帧（< 20 FPS） | **Canvas** 强势 |
| 5,000 个 | 30-50 FPS | 基本不可用（< 5 FPS） | **Canvas** |
| 10,000 个 | 接近极限（~15 FPS） | 浏览器崩溃 | Canvas + Web Worker 或 WebGL |

**实测数据（1,000 粒子的粒子系统）：**
- Canvas：**2ms/帧**
- SVG：**15ms/帧**
- 差距：**7.5 倍**

**为什么 DOM 节点如此昂贵？**
- 每个 `<circle>` / `<rect>` / `<path>` 在 V8/SpiderMonkey 堆中分配一个完整的 C++ `Element` 对象
- 长出的 DOM 树导致 `getComputedStyle`、querySelector、CSS 选择器匹配全部变慢
- 任何样式变更触发的 Layout 需要遍历整棵树，时间复杂度 O(n)

---

### 1.3 代码级示例

#### Canvas 绘制完整流程 + DPR 适配

```javascript
// ========== 1. DPR 适配（防模糊） ==========
function createHiDPICanvas(canvas, width, height) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // 限制最大 2x，3x 收益递减
  const rect = canvas.getBoundingClientRect();

  // 绘图表面 = CSS尺寸 × DPR
  canvas.width = (rect.width || width) * dpr;
  canvas.height = (rect.height || height) * dpr;

  // CSS 控制显示尺寸
  canvas.style.width = (rect.width || width) + 'px';
  canvas.style.height = (rect.height || height) + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr); // 缩放坐标系，后续代码以 CSS 像素思考
  return ctx;
}

// ========== 2. 游戏循环模式 ==========
class CanvasGame {
  constructor(canvas) {
    this.ctx = createHiDPICanvas(canvas, 800, 600);
    this.entities = [];
    this.running = false;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000; // delta time（秒）
    this.lastTime = now;

    this.update(dt);
    this.render();

    requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    for (const entity of this.entities) {
      entity.x += entity.vx * dt;
      entity.y += entity.vy * dt;
    }
  }

  render() {
    const { ctx } = this;
    // 每次帧完全重绘 —— Canvas 模式的核心
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (const entity of this.entities) {
      ctx.save();
      ctx.translate(entity.x, entity.y);
      ctx.fillStyle = entity.color;
      ctx.fillRect(-entity.w / 2, -entity.h / 2, entity.w, entity.h);
      ctx.restore();
    }
  }
}

// ========== 3. 手动 hit-testing（Canvas 无法直接绑定事件） ==========
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / (rect.width * (window.devicePixelRatio || 1));
  const scaleY = canvas.height / (rect.height * (window.devicePixelRatio || 1));
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  // 倒序遍历实体（后绘制的在上层）
  for (let i = entities.length - 1; i >= 0; i--) {
    if (entities[i].containsPoint(x, y)) {
      console.log('点击了实体:', entities[i].id);
      break;
    }
  }
});

// ========== 4. 图像处理示例 ==========
function applyGrayscale(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg;       // R
    data[i + 1] = avg;   // G
    data[i + 2] = avg;   // B
    // data[i + 3] = alpha 不变
  }

  ctx.putImageData(imageData, 0, 0);
}
```

#### SVG 事件绑定 + 批量操作

```javascript
// ========== SVG 直接绑定事件（零成本 hit-testing） ==========
// HTML:
// <svg id="chart" viewBox="0 0 800 600">
//   <circle cx="100" cy="100" r="30" fill="blue" class="data-point"/>
//   <circle cx="200" cy="200" r="30" fill="red" class="data-point"/>
// </svg>

const svg = document.getElementById('chart');

// 事件委托 —— 推荐方式，避免每个节点都挂监听器
svg.addEventListener('click', (e) => {
  const target = e.target.closest('.data-point');
  if (!target) return;
  console.log('点击了:', target.getAttribute('cx'), target.getAttribute('cy'));
  target.setAttribute('fill', 'gold');
});

svg.addEventListener('mouseenter', (e) => {
  const target = e.target.closest('.data-point');
  if (!target) return;
  target.style.transform = 'scale(1.2)'; // CSS 动画
}, true);

svg.addEventListener('mouseleave', (e) => {
  const target = e.target.closest('.data-point');
  if (!target) return;
  target.style.transform = 'scale(1)';
}, true);

// ========== 批量创建 SVG 元素（使用 DocumentFragment 或 innerHTML） ==========
// 性能较好的创建方式（一次性设置 innerHTML）
function createSVGCircles(count) {
  const NS = 'http://www.w3.org/2000/svg';
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `<circle cx="${Math.random() * 800}" cy="${Math.random() * 600}" r="10"
                     fill="hsl(${Math.random() * 360}, 70%, 50%)" class="data-point"/>`;
  }
  svg.innerHTML += html; // 比逐个 createElementNS 快 3-5 倍
}

// ========== 使用 CSS 动画高效移动 SVG 元素 ==========
// CSS: .pulse { animation: pulse 0.3s ease; }
// @keyframes pulse { 0% { r: 10; } 50% { r: 18; } 100% { r: 10; } }
function pulsePoint(circle) {
  circle.classList.add('pulse');
  circle.addEventListener('animationend', () => {
    circle.classList.remove('pulse');
  }, { once: true });
}
```

---

### 1.4 选型决策框架

```
你的场景是什么？
│
├─ 需要绘制大量图形（>500 个）且高频更新（>30 FPS）
│   → Canvas（游戏、实时数据可视化、粒子效果、物理模拟）
│
├─ 需要每个元素的精细交互（hover/tooltip/drag）
│   → SVG（图表、地图、流程图编辑器、可视化设计器）
│
├─ 需要像素级操作（滤镜、颜色替换、图像合成）
│   → Canvas（图像编辑器、视频滤镜、热力图、OCR 预处理）
│
├─ 需要无损缩放（Retina/4K + 打印）
│   → SVG（Logo、图标系统、打印报表、PDF 导出）
│
├─ 需要无障碍 + SEO 支持
│   → SVG（屏幕阅读器可读取 <title>/<desc>，搜索引擎可索引文本内容）
│
├─ 混合场景（静态底图 + 动态数据 + 交互覆盖）
│   → 三层架构：SVG（底图）+ Canvas（动态层）+ HTML（交互层）
│
├─ 需要导出矢量文件
│   → SVG（直接序列化为 .svg 文件，AI/Figma 可编辑）
│
└─ 文本密集型（段落、换行、排版）
    → 永远不要用 Canvas fillText() —— 用 HTML/CSS
```

**典型混合架构示例（智慧交通系统）：**

```
Layer 1: SVG 底图
  - 道路网络、行政区划、图例
  - 分辨率无关，缩放永远清晰
  - 事件委托处理静态元素点击

Layer 2: Canvas 动态层
  - 2000+ 实时车辆轨迹（2-3ms/帧）
  - 热力图、路径预测
  - requestAnimationFrame 60FPS 循环

Layer 3: HTML 覆盖层
  - 工具提示（div + CSS）
  - 搜索框、筛选面板
  - 完全无障碍支持
```

---

### 1.5 常见坑点深入

#### 坑 1：Canvas DPR 适配不完整

```javascript
// ❌ 错误：仅设置 canvas.width/height，未缩放坐标系
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
// 忘记 ctx.scale(dpr, dpr) → 所有坐标要手动 × dpr，极易出错

// ❌ 错误：仅用 CSS 设置尺寸
canvas.style.width = '800px';  // 只设 CSS
canvas.style.height = '600px'; // canvas.width 仍是默认 300
// 结果：绘图表面 300×150，CSS 显示 800×600 → 严重模糊

// ✅ 正确：三步法
function setupCanvas(canvas, cssWidth, cssHeight) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

// ✅ 监听 DPR 变化（窗口拖到不同 DPI 显示器）
window.matchMedia('(resolution: 2dppx)').addEventListener('change', () => {
  setupCanvas(canvas, container.clientWidth, container.clientHeight);
  redraw();
});
```

#### 坑 2：SVG 内存泄漏（闭包 + 事件监听器）

```javascript
// ❌ 典型泄漏场景 1：闭包持有已移除的 SVG 元素
function createInteractiveChart(svgEl) {
  const circles = svgEl.querySelectorAll('circle');
  function updateData(newData) {
    // 旧的 circles NodeList 仍然被闭包引用
    circles.forEach(c => {
      // 即使这些 circle 已从 DOM 移除，引用仍在
    });
  }
  document.addEventListener('data-update', updateData);
  // 忘记 removeEventListener → 泄漏
}

// ✅ 修复：使用 weak event pattern
function createInteractiveChart(svgEl) {
  const controller = new AbortController();
  const updateData = (e) => {
    // 总是重新查询 DOM
    const circles = svgEl.querySelectorAll('circle');
    circles.forEach(c => { /* ... */ });
  };
  document.addEventListener('data-update', updateData, {
    signal: controller.signal // 调用 controller.abort() 即可自动移除
  });
  return controller; // 调用方负责在组件卸载时 controller.abort()
}

// ❌ 典型泄漏场景 2：SVG 动画库未清理
// D3 / svg.js 等库创建的 running animation 会持有 DOM 引用
const chart = svg.selectAll('.bar').data(data)
  .transition().duration(1000) // 动画进行中
  .attr('height', d => d.value);
// 如果在动画完成前移除元素，detached 节点被动画引用 → 泄漏

// ✅ 修复：先中断动画，再移除元素
svg.selectAll('.bar').interrupt(); // 停止所有动画
svg.selectAll('.bar').remove();     // 再移除
```

#### 坑 3：Canvas 内存管理

```javascript
// ❌ 在 requestAnimationFrame 中创建大量临时 Canvas
function badRender() {
  const offscreen = document.createElement('canvas'); // 每帧一个！
  // ... 使用后未清理，等着 GC
  requestAnimationFrame(badRender);
}

// ✅ 复用离屏 Canvas
const offscreen = document.createElement('canvas');
const offCtx = offscreen.getContext('2d');
function goodRender() {
  offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
  // ... 使用 offCtx
  requestAnimationFrame(goodRender);
}

// ✅ getImageData 的数据量很大：width × height × 4 字节
// 1920×1080 Canvas → getImageData() 返回 ~8MB 的 Uint8ClampedArray
// 避免在动画循环中频繁调用
```

---

### 1.6 面试追问

> **Q1: 为什么 Canvas 不能像 SVG 一样直接绑定 click 事件？怎么实现 Canvas 上的点击交互？**
>
> Canvas 是位图，绘制后图形变成像素，无法像 DOM 一样冒泡。实现交互需要**手动 hit-testing**：
> 1. 记录每个图形的逻辑坐标（如 `{x, y, w, h}`），点击时计算鼠标在 Canvas 上的逻辑坐标，遍历实体做碰撞检测
> 2. 也可以使用 2D 引擎内置的 hitArea（如 PixiJS、Fabric.js）
> 3. 还有一个技巧是使用"离屏 Canvas 颜色索引法"——每个图形分配唯一颜色 ID，点击时读取离屏 Canvas 的颜色，反查 ID

> **Q2: 一个页面上同时使用 SVG 和 Canvas 有什么好处？怎么实现分层架构？**
>
> 这称为 **Hybrid Architecture（混合架构）**。利用 CSS `position: absolute` 把 SVG、Canvas、HTML 三层叠在一起：
> - SVG 处理静态的、需要缩放的、需要交互的背景（地图底图、坐标轴、网格线）
> - Canvas 处理高频更新的数据层（实时轨迹、热力图、粒子）
> - HTML 处理 UI 控件和弹窗（tooltip、面板），天然支持无障碍
> 关键是各层的 `pointer-events` 控制：SVG 和 Canvas 设为 `pointer-events: none` 或按需穿透。

> **Q3: 为什么在高清屏上 Canvas 会模糊？如何彻底解决？**
>
> Canvas 默认绘图表面分辨率按 CSS 像素，在 2x/3x 屏幕上，1 个 CSS 像素被拉伸到 4/9 个物理像素——浏览器使用双线性插值拉伸，导致模糊。解决公式：
> ```
> canvas.width = CSS_WIDTH × devicePixelRatio
> canvas.height = CSS_HEIGHT × devicePixelRatio
> canvas.style.width = CSS_WIDTH（不变）
> canvas.style.height = CSS_HEIGHT（不变）
> ctx.scale(devicePixelRatio, devicePixelRatio)
> ```
> 同时建议限制最大 DPR 为 2（`Math.min(window.devicePixelRatio, 2)`），因为 3× 带来的视觉提升几乎不可见，但像素数量是 2× 的 2.25 倍。

> **Q4: 场景中有 5000 个 SVG 元素全部需要动画，怎么做性能优化？**
>
> 1. **降到 Canvas 方案**——5000 个 SVG 动画基本不可行，每个元素的样式变更都触发重绘
> 2. 如果必须用 SVG，**使用 CSS `will-change: transform` + `transform` 代替 `x`/`y`/`cx`/`cy`**——transform 在 GPU 上进行，不触发 Reflow
> 3. **使用 `requestAnimationFrame` 批量更新**而不是逐个触发布局
> 4. **虚拟化显示**——只渲染视口内的元素（类似虚拟列表的思想）
> 5. 最实用的方案：用 Canvas 绘制 5000 个元素，单独用一个透明的 SVG 层处理悬停/点击

**参考来源：**
- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [MDN SVG](https://developer.mozilla.org/en-US/docs/Web/SVG)
- [Journal of Imaging: Cross-Device Benchmark of Web Animation Systems (2026)](https://www.mdpi.com/2313-433X/12/1/45)
- [MDN Window.devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)
- [WebKit SVG removeEventListener Bug Fix](https://github.com/WebKit/WebKit/commit/b7af6e7efdb84eaf7ffa001a170cd0fb924b2699)

---

## 二、picture / source 响应式图片深度解析

---

### 2.1 srcset + sizes 属性详解

`srcset` 和 `sizes` 工作在 `<img>` 标签上，让浏览器**根据视口宽度和 DPR 自动选择最合适的图片**。

```html
<img
  src="hero-800.jpg"
  srcset="hero-400.jpg   400w,
          hero-800.jpg   800w,
          hero-1200.jpg 1200w,
          hero-2000.jpg 2000w"
  sizes="(max-width: 600px) 100vw,
         (max-width: 1200px) 50vw,
         33vw"
  alt="Hero banner"
  width="2000"
  height="1000"
/>
```

**浏览器选择算法：**

```
1. 评估 sizes 媒体条件，找到当前匹配的插槽宽度
   例如：视口 900px → 匹配 (max-width: 1200px) 50vw
   → 插槽宽度 = 900 × 0.5 = 450px

2. 用 DPR 修正：450px × 2（Retina）= 900px 等效宽度

3. 在 srcset 中找 ≥ 900px 的最小 w 描述符 → hero-1200.jpg

4. 若已缓存更大尺寸的图片，浏览器优先复用缓存
```

**`x` 描述符（DPR 切换，旧式）：**

```html
<!-- 仅看 DPR，不关心视口 -->
<img src="photo.jpg" srcset="photo-1x.jpg 1x, photo-2x.jpg 2x, photo-3x.jpg 3x" alt="">
```

**`w` 描述符 vs `x` 描述符：**
| 维度 | `w` 描述符 | `x` 描述符 |
|------|-----------|-----------|
| 选择依据 | 视口宽度 × DPR | 仅 DPR |
| 需要 sizes | 是（否则默认 100vw） | 否 |
| 灵活性 | 高：不同断点不同尺寸 | 低：固定 DPR 映射 |
| 推荐度 | **现代推荐** | 旧式，仅简单场景 |

> **关键规则：同一 `srcset` 中不能混用 `w` 和 `x` 描述符。**

---

### 2.2 格式协商：AVIF / WebP / JPEG 渐进增强

浏览器按 `<source>` 的**书写顺序**检查，找到第一个可用的就停止（first-match-wins）。

```html
<picture>
  <!-- 层 1：最优格式 AVIF（体积最小，约 JPEG 的 50%） -->
  <source srcset="hero.avif" type="image/avif">

  <!-- 层 2：次优格式 WebP（兼容性更好，约 JPEG 的 70%） -->
  <source srcset="hero.webp" type="image/webp">

  <!-- 层 3：兜底 JPEG（100% 兼容） -->
  <img src="hero.jpg" alt="Hero" width="1200" height="675">
</picture>
```

**2026 年格式对比：**

| 格式 | 压缩率（vs JPEG） | 浏览器支持 | 透明通道 | 动图 | 推荐场景 |
|------|-------------------|-----------|---------|------|---------|
| **AVIF** | ~50%（最小） | 87%+ | 支持 | 支持 | LCP 大图、高压缩需求 |
| **WebP** | ~70% | 97%+ | 支持 | 支持 | 通用首选 |
| **JPEG XL** | ~75% | 实验性 | 支持 | 支持 | 未来趋势（无损+有损） |
| **JPEG** | 100%（基准） | 100% | 不支持 | 不支持 | 兜底回退 |
| **PNG** | 无损 | 100% | 支持 | 不支持 | 图标、Logo、透明图 |

---

### 2.3 Art Direction（艺术指导）

Art direction 指在不同断点展示**构图不同的图片**（不仅仅是分辨率的缩放，而是裁剪、构图、内容的改变）。

```html
<picture>
  <!-- 桌面端：宽幅横构图 -->
  <source
    media="(min-width: 1024px)"
    srcset="hero-desktop.avif"
    type="image/avif"
  >
  <source
    media="(min-width: 1024px)"
    srcset="hero-desktop.webp"
    type="image/webp"
  >

  <!-- 平板端：中等构图 -->
  <source
    media="(min-width: 768px)"
    srcset="hero-tablet.avif"
    type="image/avif"
  >
  <source
    media="(min-width: 768px)"
    srcset="hero-tablet.webp"
    type="image/webp"
  >

  <!-- 手机端：竖构图、关键人物特写裁剪 -->
  <source srcset="hero-mobile.avif" type="image/avif">
  <source srcset="hero-mobile.webp" type="image/webp">

  <img
    src="hero-mobile.jpg"
    alt="产品宣传图 —— 桌面端展示完整场景，移动端突出核心产品"
    width="1200"
    height="675"
  >
</picture>
```

**Art direction vs Resolution switching：**

| 策略 | 用哪个 | 示例 |
|------|--------|------|
| 同一图片不同分辨率 | `<img>` + `srcset` + `sizes` | 同一张照片的 400/800/1200px 版本 |
| 不同裁剪/构图 | `<picture>` + `media` | 桌面横构图 vs 移动端方构图 |
| 不同格式 | `<picture>` + `type` | AVIF / WebP / JPEG 渐进增强 |
| 组合使用 | `<picture>` + `media` + `type` + `srcset` | 上述全部组合 |

---

### 2.4 loading="lazy" + decoding="async" + fetchpriority

**2026 年图片性能最佳实践矩阵：**

```html
<!-- LCP 图片（首屏最关键的图片）—— 最高优先级 -->
<img
  src="hero.avif"
  alt="Hero"
  fetchpriority="high"     <!-- 告诉浏览器优先预加载 -->
  loading="eager"          <!-- 不延迟加载（默认值） -->
  decoding="sync"          <!-- 同步解码，最快渲染 -->
  width="1200"
  height="675"             <!-- 固定宽高比，防止 CLS -->
>

<!-- 非首屏图片 —— 最低优先级 -->
<img
  src="gallery-photo.webp"
  alt="Gallery"
  loading="lazy"           <!-- 延迟到接近视口才加载 -->
  decoding="async"         <!-- 异步解码，不阻塞主线程 -->
  width="800"
  height="600"
>
```

**各属性的精确作用：**

| 属性 | 作用 | 注意事项 |
|------|------|---------|
| `loading="lazy"` | 延迟加载——图片在接近视口时才下载 | 绝不能用于 LCP 图片，会严重拖慢 FCP/LCP |
| `loading="eager"` | 立即加载（默认） | LCP 图片的标准配置 |
| `decoding="async"` | 异步解码——在后台线程解码图片 | 可能闪白（解码未完成时显示空白），非首屏再用 |
| `decoding="sync"` | 同步解码——主线程解码，最快显示 | LCP 图片首选，牺牲主线程换取最快的视觉呈现 |
| `fetchpriority="high"` | 提升网络请求优先级 | 每页仅对最重要的 1-2 张图使用 |
| `fetchpriority="low"` | 降低网络请求优先级 | 底部图片、非关键图片 |
| `width` + `height` | 预留布局空间 | 防止 CLS（Cumulative Layout Shift），浏览器据此计算 `aspect-ratio` |

**LCP 优化铁律：**

```
LCP 图片 = fetchpriority="high" + loading="eager" + decoding="sync" + width/height + AVIF/WebP
每页只标记一张 LCP 图片（通常是 Hero 图）
```

---

### 2.5 常见坑点

```html
<!-- ❌ 错误 1：AVIF source 放在 WebP 后面 -->
<picture>
  <source srcset="hero.webp" type="image/webp">
  <source srcset="hero.avif" type="image/avif">  <!-- 永远不会被选中！ -->
  <img src="hero.jpg" alt="">
</picture>
<!-- 浏览器匹配到 WebP 就停了，AVIF 形同虚设 -->

<!-- ✅ 正确：最优格式放最前面 -->
<picture>
  <source srcset="hero.avif" type="image/avif">  <!-- 先检查 AVIF -->
  <source srcset="hero.webp" type="image/webp">  <!-- 不支持 AVIF 再用 WebP -->
  <img src="hero.jpg" alt="">
</picture>

<!-- ❌ 错误 2：首屏图用了 loading="lazy" -->
<!-- LCP 图片被延迟加载 → LCP 时间飙升 1-2 秒 → Core Web Vitals 不合格 -->

<!-- ✅ 正确：LCP 图用 eager -->
<img src="hero.avif" loading="eager" fetchpriority="high" ...>

<!-- ❌ 错误 3：w 描述符忘记 sizes -->
<img srcset="img-800.jpg 800w" src="img.jpg" alt="">
<!-- 没有 sizes → 浏览器默认 sizes="100vw" → 手机端可能加载 800px 图 -->

<!-- ❌ 错误 4：混用 w 和 x 描述符 -->
<img srcset="img-800.jpg 800w, img-2x.jpg 2x" src="img.jpg">
<!-- 浏览器行为不确定，应只用一种描述符 -->
```

---

### 2.6 面试追问

> **Q1: 浏览器如何选择 `<source>`？如果 AVIF 和 WebP 都支持，浏览器选哪个？**
>
> `<picture>` 内的 `<source>` 采用 **first-match-wins** 策略。浏览器按书写顺序逐个检查 `<source>` 的条件：
> 1. 先检查 `type` 属性——浏览器是否支持此格式？
> 2. 再检查 `media` 属性——当前视口是否满足媒体查询？
> 3. 两个条件都满足，选择该 `<source>`，忽略后续所有 `<source>`
> 因此**务必把最佳格式写在最前面**。如果 AVIF 支持，就选 AVIF。

> **Q2: `srcset` 的 `w` 描述符和 `x` 描述符可以混用吗？为什么？**
>
> 不可混用。`w` 描述符告诉浏览器"这张图片的实际宽度是多少像素"，需配合 `sizes` 属性计算选择；`x` 描述符按设备像素比（DPR）选择。两者的选择逻辑完全不同，混用会导致行为不确定。同一 `srcset` 中必须统一使用一种描述符。

> **Q3: `sizes` 属性的默认值是什么？不写 `sizes` 会怎样？**
>
> 默认值是 `100vw`。如果不写 `sizes` 但使用了 `w` 描述符，浏览器假设图片总是占满整个视口宽度。对于 sidebar 图片（可能只占 300px 宽），这会导致浏览器加载远大于所需的图片。典型修复：`sizes="(max-width: 768px) 100vw, 300px"`。

> **Q4: 移动端 375px 设备加载了一张 1600px 的图，怎样排查是为什么？**
>
> 可能原因排查清单：
> 1. `sizes` 未设置 → 浏览器默认 `100vw` → 375×DPR(3)=1125 → 选 1200w
> 2. `w` 描述符对应的实际图片宽度标注错误（如把 1600px 图片标成 `400w`）
> 3. 浏览器使用了已缓存的大图（缓存优先策略）
> 4. 如果用了 CDN 自动调整尺寸，可能是 CDN 配置问题
> 5. 检查 DevTools Network 面板的 request URL 确认实际加载的图片

**参考来源：**
- [MDN Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- [web.dev: Image performance](https://web.dev/fast/#optimize-your-images)
- [MDN loading attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#loading)
- [web.dev: Browser-level image lazy loading](https://web.dev/browser-level-image-lazy-loading/)

---

## 三、Web Storage 深度解析

---

### 3.1 localStorage vs sessionStorage vs IndexedDB 完整对比

| 维度 | localStorage | sessionStorage | IndexedDB |
|------|-------------|----------------|-----------|
| **容量** | 5-10 MB（按源） | 5-10 MB（按源） | 磁盘可用空间的 20-50% |
| **生命周期** | 永久（除非手动清除或浏览器清理） | 标签页/窗口关闭时销毁 | 永久（除非手动清除） |
| **作用域** | 同源（协议+域名+端口）所有标签页共享 | 同源 + 同顶级浏览上下文 | 同源（所有标签页共享） |
| **API 类型** | 同步（阻塞主线程） | 同步（阻塞主线程） | 异步（基于事件/Promise） |
| **数据类型** | 仅字符串（需 JSON 序列化） | 仅字符串（需 JSON 序列化） | 对象、数组、Blob、File、ArrayBuffer、二进制 |
| **索引** | 无（仅 key-value） | 无（仅 key-value） | 支持多索引、复合索引 |
| **事务** | 无 | 无 | 完整 ACID 事务（失败自动回滚） |
| **查询** | `getItem(key)` | `getItem(key)` | 游标遍历、范围查询、索引排序 |
| **事件通知** | `storage` 事件（跨标签页） | `storage` 事件（同标签页 iframe） | `onversionchange` |
| **复杂度** | 极低 | 极低 | 中-高 |
| **主线程影响** | 大数据同步读写阻塞 UI | 同左 | 异步，不阻塞 |

---

### 3.2 storage 事件详解（跨 Tab 通信机制）

```javascript
// ========== storage 事件核心特性 ==========

// 1. 事件触发条件：
//    - 仅在「另一个」同源上下文修改时触发
//    - 当前页面自己写的，自己收不到事件

// 2. 事件携带的信息：
window.addEventListener('storage', (event) => {
  console.log('被修改的 key:', event.key);          // null 表示 clear() 被调用
  console.log('新值:', event.newValue);              // null 表示 removeItem()
  console.log('旧值:', event.oldValue);              // null 表示新增
  console.log('被修改的 Storage:', event.storageArea); // localStorage 或 sessionStorage
  console.log('触发修改的页面 URL:', event.url);      // 哪个页面改的
});

// ========== Tab A 写入 ==========
localStorage.setItem('user-theme', 'dark');
localStorage.setItem('user-lang', 'zh-CN');
localStorage.removeItem('old-config');
// Tab A 自己收不到 storage 事件！

// ========== Tab B 接收 ==========
window.addEventListener('storage', (e) => {
  switch (e.key) {
    case 'user-theme':
      applyTheme(e.newValue);
      break;
    case 'user-lang':
      // 语言切换但不刷新
      break;
    case null:
      // localStorage.clear() 被调用
      console.warn('存储被清空，来源:', e.url);
      break;
  }
});
```

**常见坑：当前页自己收不到 storage 事件**

```javascript
// 解决方案：封装一个自通知的 setItem
function broadcastSetItem(key, value) {
  const oldValue = localStorage.getItem(key);
  localStorage.setItem(key, value);

  // 手动构造并分发 storage 事件给自己
  window.dispatchEvent(new StorageEvent('storage', {
    key,
    newValue: value,
    oldValue,
    storageArea: localStorage,
    url: window.location.href,
  }));
}

// 或者使用 BroadcastChannel 作为替代（推荐，发送者也能收到）
const channel = new BroadcastChannel('app-storage');
function broadcastSetItem(key, value) {
  localStorage.setItem(key, value);
  channel.postMessage({ key, value }); // 自己也能收到
}
```

---

### 3.3 5MB 限制的实测 + Quota API

**各浏览器 localStorage 容量实测（2025-2026 数据）：**

| 浏览器 | 普通模式 | 无痕/隐私模式 | 备注 |
|--------|---------|-------------|------|
| Chrome | ~10 MB | ~10 MB | 按源，受磁盘空间影响 |
| Firefox | ~10 MB | ~10 MB | 按源 |
| Edge | ~10 MB | ~10 MB | 同 Chromium |
| Safari Desktop | ~5 MB | **setItem 直接抛异常** | 无痕模式下即使 1 字节也失败 |
| iOS Safari | ~5 MB | **不可用** | iOS 11 之后有所改善但不稳定 |
| Android Chrome | ~5-10 MB | 取决于实现 | 部分厂商定制浏览器更小 |

**精确测量代码：**

```javascript
// 测量当前浏览器的 localStorage 真实容量
function measureLocalStorageLimit() {
  const testKey = '__storage_test__';
  const chunk = 'x'.repeat(1024 * 100); // 100KB / chunk
  let totalBytes = 0;
  const keys = [];

  try {
    while (true) {
      const k = testKey + '_' + totalBytes;
      localStorage.setItem(k, chunk);
      keys.push(k);
      totalBytes += chunk.length;
    }
  } catch (e) {
    // 清理
    keys.forEach(k => localStorage.removeItem(k));
    return {
      limit: (totalBytes * 2 / 1024 / 1024).toFixed(2) + ' MB', // ×2 因为 JS 字符串是 UTF-16
      error: e.name,
      errorMessage: e.message,
      rawBytes: totalBytes * 2,
    };
  }
}

console.table(measureLocalStorageLimit());
// 典型 Chrome 输出: { limit: "10.00 MB", error: "QuotaExceededError", ... }
// 典型 Safari 无痕: { limit: "0.00 MB", error: "QuotaExceededError", ... }
```

**Quota API（`navigator.storage.estimate()`）：**

```javascript
// 查询当前源的存储配额和使用量（包括 localStorage + IndexedDB + Cache Storage 等）
async function checkStorageQuota() {
  const estimate = await navigator.storage.estimate();

  console.log('已使用:', (estimate.usage / 1024 / 1024).toFixed(2), 'MB');
  console.log('总配额:', (estimate.quota / 1024 / 1024).toFixed(2), 'MB');
  console.log('使用率:', ((estimate.usage / estimate.quota) * 100).toFixed(2), '%');
  console.log('剩余可用:', ((estimate.quota - estimate.usage) / 1024 / 1024).toFixed(2), 'MB');

  return estimate;
}

// 请求持久化存储（浏览器不会自动清理）
async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) {
    console.warn('不支持 Persistent Storage API');
    return false;
  }
  const isPersisted = await navigator.storage.persist();
  console.log('持久化存储:', isPersisted ? '已授予' : '被拒绝');

  // 检查是否已经被持久化
  const persisted = await navigator.storage.persisted();
  console.log('当前是否持久化:', persisted);

  return isPersisted;
}

// 配额变更监听
if (navigator.storage && navigator.storage.estimate) {
  // 注意：目前还没有标准的 Quota Change Event
  // 但可以在关键操作前检查
  setInterval(async () => {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage / quota > 0.8) {
      console.warn('存储使用超过 80%，建议清理');
    }
  }, 60_000); // 每分钟检查一次
}
```

**生产环境安全封装：**

```javascript
const SafeStorage = {
  _memoryFallback: new Map(),

  setItem(key, value) {
    try {
      // 先尝试写入 localStorage
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        console.warn(`localStorage 配额已满，降级到内存存储: ${key}`);
        this._memoryFallback.set(key, value);
        return false;
      }
      throw e;
    }
  },

  getItem(key) {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) return JSON.parse(val);
    } catch (e) {
      // localStorage 不可用（如 Safari 无痕）
    }
    // 降级到内存
    const memVal = this._memoryFallback.get(key);
    return memVal !== undefined ? memVal : null;
  },

  removeItem(key) {
    try { localStorage.removeItem(key); } catch (e) {}
    this._memoryFallback.delete(key);
  },

  isAvailable() {
    try {
      const testKey = '__availability_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  },
};
```

---

### 3.4 IndexedDB 实战：数据库版本迁移 + 事务

```javascript
// ========== 1. 数据库打开与版本升级 ==========
function openDatabase() {
  return new Promise((resolve, reject) => {
    const DB_VERSION = 3; // ← 修改版本号触发升级
    const request = indexedDB.open('MyAppDB', DB_VERSION);

    request.onerror = () => reject(request.error);

    // ========== 核心：onupgradeneeded ==========
    // 触发时机：首次创建 或 版本号升级
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const tx = event.target.transaction; // 这是 versionchange 事务
      const oldVersion = event.oldVersion; // 用户的旧版本（新用户为 0）

      console.log(`数据库升级: v${oldVersion} → v${DB_VERSION}`);

      // ★ 使用 switch fall-through 模式，确保所有中间版本都执行
      switch (oldVersion) {
        case 0:
          // 首次创建：建 users 表
          const userStore = db.createObjectStore('users', {
            keyPath: 'id',
            autoIncrement: true,
          });
          userStore.createIndex('email', 'email', { unique: true });
          userStore.createIndex('name', 'name', { unique: false });
          // fall through 到 case 1

        case 1:
          // v1 → v2: 新增 settings 表
          if (!db.objectStoreNames.contains('settings')) {
            const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
            // 插入默认配置
            settingsStore.put({ key: 'theme', value: 'light' });
            settingsStore.put({ key: 'lang', value: 'zh-CN' });
          }
          // fall through 到 case 2

        case 2:
          // v2 → v3: 给 users 表添加 lastLogin 索引 + 数据迁移
          const userStoreV3 = tx.objectStore('users');
          if (!userStoreV3.indexNames.contains('lastLogin')) {
            userStoreV3.createIndex('lastLogin', 'lastLogin', { unique: false });
          }

          // 数据迁移：给已有用户补充 lastLogin 字段
          const cursorReq = userStoreV3.openCursor();
          cursorReq.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              const user = cursor.value;
              if (!user.lastLogin) {
                user.lastLogin = new Date(0).toISOString(); // 默认时间
                cursor.update(user);
              }
              cursor.continue();
            } else {
              console.log('数据迁移完成');
            }
          };
          break; // 最后一个 case 要 break

        default:
          console.log('无需升级');
      }
    };

    // ========== 处理阻塞 ==========
    request.onblocked = () => {
      console.warn('升级被阻塞：请关闭其他标签页后刷新');
      // 生产环境应提示用户
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      // 监听其他标签页要求升级
      db.onversionchange = () => {
        db.close();
        console.warn('检测到新版本，请刷新页面');
        // location.reload();
      };

      resolve(db);
    };
  });
}

// ========== 2. 事务操作 ==========
async function addUser(user) {
  const db = await openDatabase();
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');

  // 事务有三种模式：
  // 'readonly'  - 只读，可多事务并发
  // 'readwrite' - 读写，互斥
  // 'versionchange' - 仅 upgradefeede 中可用

  return new Promise((resolve, reject) => {
    const request = store.add(user);

    tx.oncomplete = () => {
      console.log('事务完成');
      resolve(request.result);
    };

    tx.onerror = () => {
      console.error('事务失败:', tx.error);
      reject(tx.error);
    };

    tx.onabort = () => {
      console.warn('事务被中止');
      reject(new Error('Transaction aborted'));
    };
  });
}

// ========== 3. 索引查询 ==========
async function getUserByEmail(email) {
  const db = await openDatabase();
  const tx = db.transaction('users', 'readonly');
  const store = tx.objectStore('users');
  const index = store.index('email');

  return new Promise((resolve, reject) => {
    const request = index.get(email);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ========== 4. 游标遍历（分页） ==========
async function getUsersPaginated(pageSize = 20, lastId = 0) {
  const db = await openDatabase();
  const tx = db.transaction('users', 'readonly');
  const store = tx.objectStore('users');
  const users = [];

  const range = IDBKeyRange.lowerBound(lastId, true); // 不包含 lastId 本身
  const cursorReq = store.openCursor(range);

  return new Promise((resolve, reject) => {
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor && users.length < pageSize) {
        users.push(cursor.value);
        cursor.continue();
      } else {
        resolve({
          users,
          hasMore: cursor !== null,
          nextCursor: cursor ? cursor.key : null,
        });
      }
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

// ========== 5. 防多标签页升级冲突 ==========
// 当其他标签页需要升级数据库时，当前页的 db 对象会触发 versionchange
let db = null;
async function getDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MyAppDB', 3);

    request.onblocked = () => {
      alert('请关闭本网站的其他标签页后刷新');
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      db.onversionchange = () => {
        db.close();
        db = null;
        console.warn('数据库已升级，请刷新页面');
      };
      db.onclose = () => {
        db = null;
      };
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}
```

---

### 3.5 面试追问

> **Q1: 为什么修改 localStorage 的标签页自己收不到 storage 事件？如何解决？**
>
> 这是浏览器的有意设计——storage 事件的设计目标是与"其他"同源上下文同步状态，不是自我通知。如果你需要自己也能接收：
> 1. 手动 `dispatchEvent(new StorageEvent('storage', {...}))`——但要注意别陷入无限循环
> 2. 使用 **BroadcastChannel API**——它是专为广播设计的，发送者也能接收自己的消息
> 3. 使用 SharedWorker 作为中央消息总线

> **Q2: IndexedDB 的事务和数据库事务有什么区别？什么是 ACID？**
>
> IndexedDB 事务是**简化版 ACID**：
> - **A（原子性）**：事务中所有操作要么全部成功，要么全部回滚。`tx.abort()` 或出错时自动回滚
> - **C（一致性）**：事务结束后数据库保持一致状态。`onupgradeneeded` 中的 `createObjectStore` 等保证 schema 一致
> - **I（隔离性）**：同一 object store 同一时刻只能有一个 `readwrite` 事务。`readonly` 可以并发。但 IndexedDB 的隔离级别弱于真正的数据库（默认是快照隔离而不是可序列化隔离）
> - **D（持久性）**：事务完成后数据被持久化到磁盘。
> 关键差异：IndexedDB 事务是**自动提交**的——当控制流离开事件循环时自动提交，不需要显式 `commit()`。

> **Q3: 一个图片/文件如何存入 IndexedDB？直接从 File Input 存进去可以吗？**
>
> 可以直接存入 File 和 Blob 对象，不需要先转换成 Base64：
> ```javascript
> const fileInput = document.getElementById('upload');
> const file = fileInput.files[0]; // File 对象
> const tx = db.transaction('files', 'readwrite');
> tx.objectStore('files').put({ id: 1, name: file.name, blob: file }); // 直接存 File
> ```
> 读出时也是 Blob，可以用 `URL.createObjectURL()` 或 `FileReader` 显示。

> **Q4: 什么情况下 localStorage 会不可用？怎么优雅降级？**
>
> localStorage 不可用的场景：
> 1. **Safari 无痕/私密模式**——最经典的坑，setItem 直接抛 QuotaExceededError（无论存多少）
> 2. **配额已满**——其他数据占了全部 5-10MB
> 3. **浏览器禁用第三方存储**——部分隐私设置
> 4. **某些嵌入式 WebView**——厂商可能禁用了 Web Storage
> 优雅降级方案：try/catch 包裹所有 setItem/getItem，捕获后切换到内存 Map 作为回退。如上面的 `SafeStorage` 封装。

**参考来源：**
- [MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN Window: storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)
- [MDN Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
- [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [web.dev: Storage for the Web](https://web.dev/storage-for-the-web/)

---

## 四、Web Worker 深度解析

---

### 4.1 Worker 与主线程通信机制

Web Worker 的通信基于**结构化克隆算法 (Structured Clone Algorithm)**，不是简单的 JSON 序列化。

```
主线程                       Worker 线程
   │                              │
   │── postMessage(data) ────────>│  data 被结构化克隆
   │                              │  (支持: 对象、数组、Date、RegExp、Map、Set、
   │                              │         ArrayBuffer、ImageBitmap、Blob、File、
   │                              │         Error、URL 等，支持循环引用)
   │                              │
   │<──── postMessage(result) ────│  result 被结构化克隆回主线程
   │                              │
```

**结构化克隆 vs JSON 序列化：**

| 能力 | 结构化克隆 | JSON |
|------|-----------|------|
| 循环引用 | 支持 | 不支持（报错） |
| Date | 支持 | 转为字符串 |
| Map / Set | 支持 | 不支持 |
| RegExp | 支持 | 转为 {} |
| Blob / File | 支持 | 不支持 |
| ArrayBuffer | 支持（默认复制） | 不支持 |
| 函数 | 不支持 | 不支持 |
| DOM 节点 | 不支持 | 不支持 |
| Error | 支持（部分属性） | 转为 {} |
| 性能 | 快（浏览器内部实现） | 慢（JS 层面的序列化） |

```javascript
// ========== 基础通信模式 ==========
// main.js
const worker = new Worker('worker.js');

// 发送
worker.postMessage({ type: 'CALCULATE', data: [1, 2, 3, 4, 5] });

// 接收
worker.onmessage = (e) => {
  console.log('Worker 返回:', e.data.result);
};

worker.onerror = (e) => {
  console.error('Worker 错误:', e.message, '行:', e.lineno, '文件:', e.filename);
};

// worker.js
self.onmessage = (e) => {
  const { type, data } = e.data;
  if (type === 'CALCULATE') {
    const result = data.reduce((a, b) => a + b, 0);
    self.postMessage({ result });
  }
};

// ========== 高级：Transferable Objects（零拷贝传输） ==========
// 适用场景：大 ArrayBuffer 传输（加密、图像处理等）
const buffer = new ArrayBuffer(1024 * 1024 * 8); // 8MB
const uint8View = new Uint8Array(buffer);

// 填充数据...
for (let i = 0; i < uint8View.length; i++) {
  uint8View[i] = i % 256;
}

// ★ transfer 参数：所有权转移，零拷贝
worker.postMessage({ buffer }, [buffer]);
// 注意：buffer.byteLength 现在为 0！已被转移，主线程不再可用

// TypedArray 本身不可转移，必须转移其 .buffer
const data = new Float64Array(100000);
worker.postMessage(data, [data.buffer]); // 转移底层 ArrayBuffer
```

---

### 4.2 DedicatedWorker vs SharedWorker

| 特性 | DedicatedWorker | SharedWorker |
|------|-----------------|--------------|
| 构造函数 | `new Worker(url)` | `new SharedWorker(url)` |
| 全局作用域 | `DedicatedWorkerGlobalScope` | `SharedWorkerGlobalScope` |
| 访问范围 | 只能被创建它的页面访问 | 可被多个同源标签页/iframe 共享 |
| 通信方式 | 直接 `worker.postMessage()` | 必须通过 `worker.port.postMessage()` |
| Worker 端接收 | `self.onmessage` | `onconnect` → `e.ports[0].onmessage` |
| 端口 `start()` | 不需要 | 用 `addEventListener` 时需要 `port.start()` |
| 跨标签页共享状态 | 不能 | 可以（单实例，多连接） |
| 生命周期 | 页面关闭后终止 | 所有连接的页面关闭后才终止 |
| 调试 | DevTools → Sources → Workers | 同左 |
| 适用场景 | 单个页面的密集计算 | 多个标签页共享计算资源/状态 |

```javascript
// ========== SharedWorker 示例 ==========

// main.js（多个标签页都可以执行）
const sharedWorker = new SharedWorker('shared.js');

// ★ 必须通过 port 通信
sharedWorker.port.postMessage({ action: 'CONNECT', tabId: Date.now() });
sharedWorker.port.onmessage = (e) => {
  console.log('SharedWorker 广播:', e.data);
};

// 如果用 addEventListener，需要：sharedWorker.port.start();

// shared.js
const connections = new Set();

self.onconnect = (e) => {
  const port = e.ports[0];

  connections.add(port);
  console.log(`新连接建立，当前连接数: ${connections.size}`);

  port.onmessage = (e) => {
    // 广播给所有连接的标签页
    for (const conn of connections) {
      conn.postMessage({ from: 'SharedWorker', data: e.data, connections: connections.size });
    }
  };

  port.start(); // 如果用 addEventListener 方式绑定 onmessage，必须调用

  // 连接关闭时清理
  port.addEventListener('close', () => {
    connections.delete(port);
  });
};
```

---

### 4.3 典型适用场景

#### 场景 1：Web Crypto API 加密大文件

```javascript
// encrypt-worker.js
self.onmessage = async (e) => {
  const { fileBuffer, algorithm } = e.data;

  try {
    // 生成密钥
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );

    // 加密（大型 ArrayBuffer，不阻塞主线程）
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileBuffer
    );

    // 传回加密结果 + 密钥
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    self.postMessage({
      encrypted,
      key: exportedKey,
      iv,
    }, [encrypted]); // transfer 加密后的 buffer
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};

// main.js
async function encryptFile(file) {
  const worker = new Worker('encrypt-worker.js');
  const buffer = await file.arrayBuffer();

  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data);
      worker.terminate();
    };
    worker.postMessage({ fileBuffer: buffer, algorithm: 'AES-GCM' }, [buffer]);
  });
}
```

#### 场景 2：大文件 JSON 解析

```javascript
// worker.js
self.onmessage = (e) => {
  const { text } = e.data;
  // 在 Worker 线程解析，主线程完全不阻塞
  const data = JSON.parse(text);
  self.postMessage({ data }, [data]); // transfer 解析后的对象
};
```

#### 场景 3：图片处理（灰度转换）

```javascript
// image-worker.js
self.onmessage = (e) => {
  const { imageBitmap } = e.data;

  // 在 Worker 中创建离屏 Canvas
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);

  // 将 OffscreenCanvas 转换为 Blob
  canvas.convertToBlob().then((blob) => {
    self.postMessage({ blob });
  });
};
```

#### 场景 4：大量数据排序/搜索（性能对比实测）

```javascript
// 生成 100 万元素数组
const data = Array.from({ length: 1_000_000 }, () => Math.random());

// ❌ 主线程排序：阻塞 200-400ms，UI 冻结
console.time('main-thread');
const sorted = [...data].sort((a, b) => a - b);
console.timeEnd('main-thread');

// ✅ Worker 排序：UI 保持流畅
const worker = new Worker('sort-worker.js');
worker.postMessage(data, [data.buffer]); // 注意：data 是 Float64Array 时需要 transfer buffer
worker.onmessage = (e) => {
  console.log('排序完成，长度:', e.data.length);
  worker.terminate();
};
```

---

### 4.4 常见坑点

#### 坑 1：无法操作 DOM

```javascript
// ❌ Worker 中这样做会报错
self.onmessage = (e) => {
  const div = document.createElement('div'); // Uncaught ReferenceError: document is not defined
  const el = document.getElementById('app'); // 同样的错误
  window.alert('hello');                      // window 也不可用
};

// ✅ 可用 API 清单（部分）：
// - self, console, fetch, XMLHttpRequest
// - navigator（部分属性，如 navigator.onLine, navigator.language）
// - setTimeout, setInterval, clearTimeout, clearInterval
// - WebSocket, IndexedDB, FileReader
// - crypto.subtle, TextEncoder, TextDecoder
// - Worker（在 Worker 中创建子 Worker）
// - importScripts()
// - OffscreenCanvas
```

#### 坑 2：结构化克隆的性能开销

```javascript
// ❌ 发送超大对象时，默认复制可能很慢
worker.postMessage(hugeObject); // 主线程被结构化克隆阻塞

// ✅ 对于 ArrayBuffer，使用 transfer 零拷贝
worker.postMessage(hugeObject, [hugeObject.buffer]);

// ✅ 对于大对象，拆分成小块发送
for (const chunk of chunkedData) {
  worker.postMessage({ chunk });
}
```

#### 坑 3：Worker 生命周期管理

```javascript
// ❌ 创建 Worker 但忘记终止 → 内存泄漏
function startWorker() {
  const worker = new Worker('task.js');
  worker.postMessage(data);
  // 忘记 terminate()，Worker 一直存活
}

// ✅ 用完即终止，或使用终结器
function startWorker(data) {
  const worker = new Worker('task.js');
  worker.postMessage(data);
  worker.onmessage = (e) => {
    handleResult(e.data);
    worker.terminate(); // 明确终止
  };
  worker.onerror = () => worker.terminate(); // 出错也要终止
  return worker; // 调用方也可以用 AbortController 控制
}

// ✅ 使用 AbortController 模式
function startWorkerWithAbort(data, signal) {
  const worker = new Worker('task.js');
  signal.addEventListener('abort', () => worker.terminate());
  worker.postMessage(data);
  return worker;
}
```

#### 坑 4：同源限制

```javascript
// ❌ 跨域脚本无法作为 Worker
const worker = new Worker('https://other-domain.com/worker.js');
// SecurityError: Failed to construct 'Worker': Script at '...' cannot be accessed from origin '...'

// ✅ 解决方案 1：同源 Worker
const worker = new Worker('/workers/task.js');

// ✅ 解决方案 2：使用 Blob URL（动态生成 Worker 代码）
const workerCode = `
  self.onmessage = function(e) {
    self.postMessage(e.data * 2);
  };
`;
const blob = new Blob([workerCode], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));
URL.revokeObjectURL(blob);

// ✅ 解决方案 3：importScripts 不存在跨域限制
// worker.js
importScripts('https://cdn.example.com/library.js'); // 允许跨域
```

---

### 4.5 面试追问

> **Q1: postMessage 传的数据是深拷贝还是浅拷贝？传输一个 100MB 的 ArrayBuffer 效率如何？**
>
> 默认是**结构化克隆**（类似深拷贝），数据被完整复制到 Worker 的内存空间。对于 100MB 的 ArrayBuffer，复制会导致：
> - 100MB 的内存分配 + 拷贝耗时约 20-50ms
> - 内存翻倍（主线程 + Worker 各一份）
> 解决方案：使用 **Transferable Objects**，`postMessage(buffer, [buffer])`，所有权被转移而非复制——零拷贝、零耗时、内存不翻倍。但转移后原上下文不可再使用该 buffer。

> **Q2: SharedWorker 的生命周期是怎样的？什么时候会销毁？**
>
> SharedWorker 在所有连接的标签页/iframe/Worker 关闭后才会终止。生命周期规则：
> 1. `new SharedWorker(url)` 时，如果该 url 的 Worker 已存在，复用已有实例
> 2. 每个连接通过 `port` 通信，port 关闭时连接断开
> 3. 当所有 port 都断开（所有连接页面关闭或明确 `port.close()`），SharedWorker 线程被销毁
> 4. 可以在 SharedWorker 内部使用 `self.close()` 主动关闭
> 注意：不同 url 参数创建不同的 SharedWorker 实例（即使脚本内容相同）。

> **Q3: 为什么 Worker 不能操作 DOM？从架构层面解释。**
>
> 这是设计层面的决策，不是技术实现能力不足。原因：
> 1. **线程安全**：浏览器的主渲染引擎不是线程安全的。如果多个线程同时修改同一 DOM 节点，会导致竞态条件、内存损坏和不一致的渲染状态
> 2. **架构简化**：Chromium 的 Blink 引擎 V8 大量使用了"假设单线程"的数据结构。给 Worker 开放 DOM 需要对这些数据结构进行全局加锁，性能代价极大
> 3. **确定性渲染**：单线程 DOM 保证所有操作的可预测性和可复现性
> 4. OffscreenCanvas 是一个受控的例外——它只能被主线程或 Worker 中的一个使用（通过 `transferControlToOffscreen()` 转移所有权），本质上依然是单线程模型

> **Q4: 实际业务中，多大数据量的计算值得放进 Worker？100ms 规则是什么？**
>
> **100ms 经验规则**：如果计算在 RAIL 模型下超过 100ms，就值得考虑 Worker。
> - 解析 100KB JSON：~1ms，不需要 Worker
> - 解析 5MB JSON：~50ms，边界情况，可考虑 Worker
> - 解析 20MB JSON：~200ms，明确需要 Worker
> - 1 万条数据排序：~5ms，不需要
> - 100 万条数据排序：~200ms，需要 Worker
> - 简单的加减乘除：不需要
> - 密码学操作（AES-GCM 加密 50MB 文件）：需要 Worker（否则 UI 冻结数秒）
> 更重要的判断标准不是计算时间，而是**"计算期间用户能否交互"** ——能点按钮、能滚动、有反馈 = 不需要 Worker；界面卡住 = 需要 Worker。

**参考来源：**
- [MDN Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [MDN Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [MDN SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker)
- [MDN Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- [web.dev: Workers overview](https://web.dev/workers-overview/)

---

## 附录：速查卡片

### Canvas vs SVG 一句话决策

> **< 300 个图形 + 需要交互 + 要无损缩放 → SVG**
> **> 500 个图形 + 高频更新 + 像素操作 → Canvas**
> **两者都要 → 混合架构（SVG 底图 + Canvas 动态层 + HTML 交互层）**

### 图片性能铁三角

```
LCP 图:  fetchpriority="high" + loading="eager" + decoding="sync" + AVIF
普通图:  loading="lazy" + decoding="async" + WebP
```

### 存储选型速查

```
< 1MB 简单配置    → localStorage（try/catch 包裹）
标签页临时数据    → sessionStorage
> 1MB / 结构化    → IndexedDB
离线缓存资源      → Cache Storage + Service Worker
跨 Tab 通信       → BroadcastChannel（首选）或 storage 事件（兜底）
```

### Worker 使用口诀

```
计算 > 100ms   → 进 Worker
大 buffer 传输 → 用 transfer
多 Tab 共享    → SharedWorker
动态 Worker    → Blob URL
用完记着       → terminate()
不能摸 DOM     → 天生限制
```

