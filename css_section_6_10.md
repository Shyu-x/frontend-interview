# CSS 深入掌握（二）：Grid / 响应式 / 浮动 / 选择器优先级 / 动画

> 本文档为前端面试 CSS 系列扩展文档，涵盖 Grid 布局、响应式布局、浮动原理、选择器优先级、Transition vs Animation 共 5 个核心主题，每个主题含定义、原理图、代码示例、对比表、避坑指南及面试题。

---

## 目录

6. [Grid 布局](#6-grid-布局)
7. [响应式布局](#7-响应式布局)
8. [浮动原理](#8-浮动原理)
9. [选择器优先级](#9-选择器优先级)
10. [transition vs animation](#10-transition-vs-animation)

---

## 6. Grid 布局

### 6.1 定义与核心概念

CSS Grid（网格布局）是 CSS 3 引入的二维布局系统，同时控制行和列，特别适合页面整体布局和卡片阵列。

```
Grid 核心概念 ASCII 图：

网格容器（Grid Container）  ←  设置 display: grid 的元素
  │
  ├── 列网格线（Column Lines）:  1 | 2 | 3 | 4  （垂直线，从左到右编号 1,2,3...）
  ├── 行网格线（Row Lines）:     1 | 2 | 3      （水平线，从上到下编号 1,2,3...）
  ├── 列轨道（Column Tracks）:  [====100px====][====1fr====][====200px====]
  ├── 行轨道（Row Tracks）:      [====100px====]
  │                              [====auto=====]
  ├── 网格单元格（Grid Cell）:   两个相邻行线 × 两个相邻列线交叉的区域
  └── 网格区域（Grid Area）:     由多条网格线围成的任意矩形区域（可命名）
```

### 6.2 Grid 核心单位与函数

| 单位/函数 | 含义 | 示例 |
|---------|------|------|
| `fr` | 剩余空间比例单位（fraction） | `1fr 2fr` = 按 1:2 分配剩余空间 |
| `auto` | 自动填充内容大小（由内容决定） | `auto 1fr` = auto 列优先，1fr 列占剩余 |
| `minmax(min, max)` | 最小最大尺寸约束 | `minmax(200px, 1fr)` |
| `repeat(count, size)` | 重复轨道 | `repeat(3, 1fr)` = 1fr 1fr 1fr |
| `auto-fill` | 尽可能多填轨道（填不满留空位） | `repeat(auto-fill, minmax(200px, 1fr))` |
| `auto-fit` | 尽可能多填轨道（无内容时压缩空轨道） | `repeat(auto-fit, minmax(200px, 1fr))` |
| `fit-content(n)` | 根据内容，最大不超过 n | `fit-content(300px)` |

### 6.3 auto-fill vs auto-fit（关键区别）

```
容器宽度 = 900px，minmin = 200px，4 个项目

auto-fill: 尽可能多列，有空位就保留
列数 = floor(900/200) = 4
| [item1] | [item2] | [item3] | [item4] | ← 留有空白列轨道
          ↑ 空列占位

auto-fit: 尽可能多列，无内容时压缩空轨道
列数 = 实际项目数 = 4（有内容时才占列）
| [item1] | [item2] | [item3] | [item4] | ← 空轨道被压缩，项目等比放大

容器宽度 = 900px，min=200px，只有 2 个项目

auto-fill:
| [item1] | [item2] | [  ] | [  ] |  ← 空轨道仍然存在
          ↑ 空白列轨道保留

auto-fit:
|   [item1]   |   [item2]   |  ← 无空白列轨道，项目等比放大填满容器
```

### 6.4 容器属性详解

```css
.container {
  display: grid; /* 或 inline-grid */

  /* 定义行列 */
  grid-template-columns: 100px 1fr 200px;       /* 3列：固定+弹性+固定 */
  grid-template-rows: auto 200px auto;           /* 3行：auto+固定+auto */
  grid-template-areas:
    "header header header"
    "sidebar main aside"
    "footer footer footer";                      /* 命名网格区域 */

  /* 简写 */
  grid-template: auto 200px auto / 100px 1fr 200px; /* rows / columns */

  /* 间隙 */
  gap: 20px;           /* 行列间隙相同 */
  row-gap: 20px;       /* 行间隙 */
  column-gap: 10px;     /* 列间隙 */

  /* 自动放置 */
  grid-auto-flow: row;     /* row（默认）/ column / dense（填满空位） */
  grid-auto-rows: 100px;   /* 隐式行高（超出定义行时） */
  grid-auto-columns: 100px; /* 隐式列宽 */
}
```

### 6.5 Grid 与 Flex 对比表

| 维度 | Flexbox | CSS Grid |
|------|---------|---------|
| 布局维度 | 一维（单轴） | 二维（行+列） |
| 布局思路 | 内容驱动（内容决定大小） | 容器驱动（先定义网格，再放内容） |
| 轨道尺寸 | `flex-basis` / `flex-grow` | `fr` / `minmax` / `px` |
| 响应式 | 需媒体查询 + flex-wrap | `auto-fill/fit` 自动响应 |
| 项目定位 | 按主/交叉轴顺序 | 按网格线编号或命名区域 |
| 适合场景 | 导航栏、Card 列表、水平居中 | 页面整体布局、相册、仪表盘 |
| 课程表/甘特图 | 困难 | 天然适合（网格线对齐） |
| 学习成本 | 较低 | 较高 |

### 6.6 ASCII 网格布局示例

```
页面整体布局（grid-template-areas）：

|←——————— grid-template-columns: 200px 1fr 200px ————————→|
+----------+------------------------+----------+
|          |                        |          |
| header   |        header          |  header  |
| (span 3) |                        |  (span 3)|
+----------+------------------------+----------+
|          |                        |          |
| sidebar  |        main            |   aside  |
|          |                        |          |
+----------+------------------------+----------+
|          |                        |          |
| footer   |        footer          |  footer  |
| (span 3) |                        |  (span 3)|
+----------+------------------------+----------+
  row 1      row 1                   row 1
```

### 6.7 React / Next.js / TS 代码示例

```tsx
// components/GridDashboard.tsx
// 使用 Grid 实现响应式仪表盘布局
export function GridDashboard() {
  return (
    <div
      style={{
        display: 'grid',
        // 2 列：sidebar 200px，main 自动填满剩余空间
        gridTemplateColumns: '200px 1fr',
        // 行高：header 60px，main auto（填满中间），footer 48px
        gridTemplateRows: '60px auto 48px',
        // 命名区域
        gridTemplateAreas: '"header header" "sidebar main" "footer footer"',
        minHeight: '100vh',
        gap: '8px',
        padding: '8px',
      }}
    >
      <div
        style={{
          gridArea: 'header',
          background: '#1a73e8',
          borderRadius: '8px',
        }}
      >
        <Header />
      </div>
      <div style={{ gridArea: 'sidebar', background: '#f1f3f4', borderRadius: '8px' }}>
        <Sidebar />
      </div>
      <main style={{ gridArea: 'main', background: '#fff', borderRadius: '8px' }}>
        <MainContent />
      </main>
      <div style={{ gridArea: 'footer', background: '#f1f3f4', borderRadius: '8px' }}>
        <Footer />
      </div>
    </div>
  );
}

// components/ResponsiveCardGrid.tsx
// auto-fit + minmax 自动响应式卡片网格
interface CardItem {
  id: number;
  title: string;
  content: string;
  color: string;
}

export function ResponsiveCardGrid({ cards }: { cards: CardItem[] }) {
  return (
    <div
      style={{
        display: 'grid',
        // 核心：每列最小 250px，自动填满，超出自动换行
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        padding: '20px',
      }}
    >
      {cards.map((card) => (
        <div
          key={card.id}
          style={{
            backgroundColor: card.color,
            borderRadius: '12px',
            padding: '24px',
            color: '#fff',
            minHeight: '180px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{card.title}</h3>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>{card.content}</p>
        </div>
      ))}
    </div>
  );
}

// TypeScript: Grid 配置类型
type GridAutoFlow = 'row' | 'column' | 'dense';

interface GridConfig {
  columns: string | number;
  rows?: string | number;
  gap?: number;
  autoFlow?: GridAutoFlow;
}

function resolveGridTemplate(config: GridConfig): string {
  const { columns, rows, gap } = config;
  const colTemplate = typeof columns === 'number'
    ? `repeat(${columns}, 1fr)`
    : columns;
  return rows
    ? `${rows} / ${colTemplate}`
    : colTemplate;
}
```

### 6.8 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| `grid-template-columns: 1fr 1fr 1fr` 与 `auto-fill` 混淆 | 固定列数用 `fr`；响应式列数用 `repeat(auto-fit, minmax())` |
| `auto-fit` 和 `auto-fill` 分不清 | 有剩余空白列时：auto-fill 留空位，auto-fit 压缩空位并放大内容 |
| Grid 子元素不受 `vertical-align` 控制 | Grid 布局用 `align-items` / `justify-items` 控制对齐 |
| 嵌套 Grid 不生效 | 子元素要单独设 `display: grid` 才能创建新的 GFC |
| `fr` 和百分比混用导致不确定行为 | `fr` 和固定单位可以混用，但两个 `fr` 之间是分配"剩余空间" |

### 6.9 面试题

**Q1: `auto-fill` 和 `auto-fit` 的区别是什么？在什么场景下选哪个？**

> 参考答案：当列轨道数量不足以填满容器宽度时，`auto-fill` 会保留空列轨道（空占位），而 `auto-fit` 会压缩空列轨道，使有内容的项目等比放大填满容器。选择建议：① 希望所有列等宽留空位 → `auto-fill`；② 希望项目填满容器、无空白 → `auto-fit`（更常用）。实际开发中 `auto-fit` 更常见，因为它能充分利用视口空间。

**Q2: CSS Grid 的 `fr` 单位是什么？和百分比有什么区别？**

> 参考答案：`fr` 是"剩余空间比例单位"（fraction），表示从容器剩余空间中按比例分配。只有在有剩余空间时 `fr` 才有效，且分配的是**剩余空间**（非总空间）。例如 `1fr 2fr`：先计算内容总尺寸，再用剩余空间按 1:2 分配。百分比则是相对于**容器总尺寸**，与 `fr` 的计算基准不同，两者可以混用（`200px 1fr 20%`）。

**Q3: Grid 布局如何实现圣杯布局（经典三栏布局：header + sidebar + main + footer）？相比 Flex 有什么优势？**

> 参考答案：用 `grid-template-areas` 命名区域：`"header header header" "sidebar main aside" "footer footer footer"`，然后每个区域对应到子元素即可。相比 Flex：Grid 用命名区域语义更清晰，sidebar/main/aside 对齐更精确（二维同时控制），不需要嵌套 Flex；Flex 则需要多层嵌套或依赖 `flex-grow` 实现。Grid 的二维特性使其在处理行列对齐时比 Flex 更强大。

---

## 7. 响应式布局

### 7.1 定义与背景

响应式布局（Responsive Design）通过使网页"适应"不同设备的屏幕宽度和特性，提供最佳浏览体验。核心工具是 CSS 媒体查询（Media Queries），结合相对单位实现。

### 7.2 核心工具：媒体查询

```css
/* 基本语法 */
@media media-type and (media-feature) {
  /* CSS 规则 */
}

/* 常用媒体查询场景 */
@media (max-width: 768px) { ... }              /* 平板及以下 */
@media (min-width: 769px) { ... }              /* 平板及以上 */
@media (min-width: 769px) and (max-width: 1024px) { ... } /* 平板 */
@media (orientation: portrait) { ... }         /* 竖屏 */
@media (hover: hover) { ... }                  /* 有悬停能力的设备 */
```

### 7.3 Mobile-First vs Desktop-First

| 策略 | 定义 | 写法 | 适用场景 |
|------|------|------|---------|
| **Mobile-First**（推荐） | 先写移动端样式，再向上渐进增强 | `@media (min-width: ...)` | 新项目、追求最优性能 |
| **Desktop-First** | 先写桌面端样式，向下兼容 | `@media (max-width: ...)` | 旧项目改造、维护为主 |

```css
/* Mobile-First 写法（推荐） */
.container { width: 100%; padding: 16px; }  /* 默认移动端基准 */

@media (min-width: 768px) {
  .container { width: 720px; padding: 24px; }
  .cards { display: flex; gap: 16px; }
}

@media (min-width: 1024px) {
  .container { width: 960px; padding: 32px; }
  .layout { display: grid; grid-template: ... }
}

/* Desktop-First 写法 */
.container { width: 960px; margin: 0 auto; }

@media (max-width: 1023px) {
  .container { width: 720px; }
}

@media (max-width: 767px) {
  .container { width: 100%; }
}
```

### 7.4 常用断点参考

| 设备 | 断点范围 | 常用 breakpoint |
|------|---------|---------------|
| 手机 | < 576px | `@media (max-width: 575px)` |
| 平板（竖） | 576-767px | `@media (min-width: 576px)` |
| 平板（横）/ 小桌面 | 768-991px | `@media (min-width: 768px)` |
| 桌面 | 992-1199px | `@media (min-width: 992px)` |
| 大桌面 | >= 1200px | `@media (min-width: 1200px)` |

### 7.5 rem / em / px 单位对比

| 单位 | 基准 | 特点 | 适用场景 |
|------|------|------|---------|
| `px` | 固定像素 | 精确但不适应缩放 | 边框、阴影、字号（固定值） |
| `em` | 相对于**当前元素** font-size | 相对于父元素继承值，会累积 | 少用（累积效应复杂） |
| `rem` | 相对于**根元素**（`<html>`）font-size | 全局统一基准，推荐 | 间距、内边距、字体大小 |
| `clamp()` | min/opt/max 动态约束 | 响应式数值范围 | 流畅排版（fluid typography） |

```css
/* rem 方案：基于 16px 根字号 */
html { font-size: 16px; }

.section { padding: 1rem 2rem; }       /* 16px 32px */
h1 { font-size: 2rem; }               /* 32px */
h2 { font-size: 1.5rem; }             /* 24px */

/* clamp() 方案：流畅排版 */
.fluid-heading {
  font-size: clamp(1.5rem, 2vw + 1rem, 3rem);
  /* min: 1.5rem |  preferred: 2vw + 1rem  | max: 3rem */
}
```

### 7.6 Container Queries（容器查询，CSS 2023 新特性）

媒体查询是相对于**视口**的条件判断，而容器查询是相对于**父容器**的条件判断。

```css
/* 传统媒体查询 */
@media (min-width: 600px) {
  .card { display: flex; }
}

/* 容器查询（父容器宽度决定内部样式） */
.card-wrapper {
  container-type: inline-size; /* 定义为容器 */
}

@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 150px 1fr;
  }
}
```

### 7.7 React / Next.js / TS 代码示例

```tsx
// hooks/useWindowSize.ts
import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      setSize({
        width: w,
        height: window.innerHeight,
        isMobile: w < 576,
        isTablet: w >= 576 && w < 992,
        isDesktop: w >= 992,
      });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// components/ResponsiveLayout.tsx
export function ResponsiveLayout() {
  const { isMobile, isTablet, isDesktop } = useWindowSize();

  return (
    <div
      style={{
        padding: isMobile ? '12px' : isTablet ? '20px' : '32px',
        maxWidth: isDesktop ? '1200px' : '100%',
        margin: '0 auto',
        display: isDesktop ? 'grid' : 'flex',
        flexDirection: isDesktop ? 'row' : 'column',
        gap: isMobile ? '12px' : '24px',
      }}
    >
      <aside style={{ width: isDesktop ? '250px' : '100%', background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
        Sidebar
      </aside>
      <main style={{ flex: 1, background: '#fff', padding: '16px', borderRadius: '8px' }}>
        Main Content
      </main>
    </div>
  );
}

// utils/responsive.ts
/** 将 px 转换为 rem */
export function pxToRem(px: number, base = 16): string {
  return `${px / base}rem`;
}

/** 生成响应式 clamp 值 */
export function fluidClamp(minPx: number, maxPx: number, viewportMin = 320, viewportMax = 1200, base = 16): string {
  const minRem = minPx / base;
  const maxRem = maxPx / base;
  return `clamp(${minRem}rem, ${((maxRem - minRem) / (viewportMax - viewportMin) * 100).toFixed(2)}vw + ${(minRem + (maxRem - minRem) * viewportMin / (viewportMax - viewportMin) / base * base).toFixed(2)}rem, ${maxRem}rem)`;
}
```

### 7.8 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| 仅用媒体查询，不考虑内容本身 | 结合 Container Queries，让组件自响应 |
| 混用 em/rem 导致基准混乱 | 统一用 rem 作为间距单位，用 `clamp()` 做 fluid typography |
| Desktop-First 写媒体查询覆盖层过多 | 新项目使用 Mobile-First，减少代码量 |
| 断点设置过于随意 | 使用业界通用断点（576/768/992/1200px）或设计稿断点 |
| 忽略 `prefers-color-scheme` 等媒体特性 | 兼顾暗色模式：`@media (prefers-color-scheme: dark)` |

### 7.9 面试题

**Q1: 什么是 Mobile-First 响应式设计？相比 Desktop-First 有什么优势？**

> 参考答案：Mobile-First 先为移动设备编写基础样式，再通过 `min-width` 媒体查询逐步增强到平板、桌面。优势：① 移动端样式最简单，代码量最少，性能最优；② 渐进增强思路更符合"功能降级"理念；③ `min-width` 媒体查询堆叠更清晰，`max-width` 堆叠容易出现样式冲突；④ 避免桌面端代码向移动端"裁剪"时覆盖层过多的问题。

**Q2: `rem` 和 `em` 有什么区别？为什么推荐用 `rem` 做响应式布局？**

> 参考答案：`em` 相对于当前元素的 `font-size`，若嵌套多层会累积（`1em` 在 `0.8em` 父元素下实际是 `0.8em`）；`rem` 相对于根元素 `<html>` 的 `font-size`，全局统一基准，不会累积。推荐 `rem`：因为响应式布局通常希望间距和字体基于同一个全局基准缩放，用 `rem` 可以通过修改 `<html>` 的 `font-size` 一次控制全局缩放比例（如用户缩放页面或主题切换）。

**Q3: CSS Container Queries 和 Media Queries 的区别是什么？各自适用什么场景？**

> 参考答案：Media Queries 基于**视口**（viewport）条件判断，不关心组件的父容器宽度；Container Queries 基于**父容器**宽度条件判断，使组件能独立响应其所在容器的尺寸变化。适用场景：① 组件库中的卡片在侧边栏和主内容区展示不同布局；② 可复用模块在页面不同位置展示不同样式；③ Media Query 做不到的"同一组件在不同容器中自适应"的场景。注意：Container Queries 目前已得到现代浏览器支持（Chrome 105+），但 IE 不支持。

---

## 8. 浮动原理

### 8.1 定义与背景

`float` 是 CSS 2.1 引入的布局属性，最初用于实现文字绕排（图片周围环绕文字），后被广泛用于多栏布局。其核心特性：使元素脱离正常文档流，向左或向右移动直到碰到容器边缘或另一个浮动元素。

### 8.2 浮动行为规则

```
浮动元素的行为规则 ASCII 图：

正常文档流块级元素：
+----------+
| Block A  |
+----------+
+----------+
| Block B  |
+----------+

给 Block A 加 float: left 后：
+----------+  +----------+  +----------+
| Block A  |  | Block B  |  | Block C  | ← B 和 C 填入 A 右侧空白区域
| (float)  |  |          |  |          |
+----------+  +----------+  +----------+

两个浮动元素：
+-------------+-------------+
| float: left | float: left | ← 并排直到父容器宽度不够
+-------------+-------------+

float: right:
+-------------+-------------+
| float: right| float: right| ← 从右到左排列
+-----------------------------+
```

**浮动三规则**：
1. 浮动元素脱离文档流，但不脱离文字流（文字会绕排）
2. 浮动元素向左/向右移动，直到碰到**容器边缘**或**另一个浮动元素**
3. 多个同方向浮动元素会并排排列，容器宽度不够时自动换行

### 8.3 清除浮动方法对比

| 方法 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| `clear: both` 伪元素 | 伪元素放在浮动元素之后，触发清除 | 兼容性好，语义清晰 | 需额外 CSS |
| `overflow: hidden/auto` | 触发 BFC，包含浮动元素高度 | 一行代码 | 可能裁剪内容 |
| `display: flow-root` | 纯 BFC，无副作用 | 无裁剪副作用 | 旧浏览器不支持 |
| 父元素也加 `float` | 共同浮动，父元素自适应 | 简单 | 父元素失去居中能力 |
| 空 `<div>` 加 `clear` | 清除浮动 | 兼容 | 污染 HTML 结构，不推荐 |

### 8.4 Clearfix 详解

```css
/* 最常用的 clearfix 方案 */
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}

/* 加强版（兼容 display: table 等） */
.clearfix::before,
.clearfix::after {
  content: '';
  display: table;
}
.clearfix::after {
  clear: both;
}

/* 方案对比：伪元素 vs overflow */
.clearfix-overflow {
  overflow: hidden; /* 或 auto */
  /* 等价于 display: flow-root（但可能有裁剪） */
}

.clearfix-flow-root {
  display: flow-root; /* 纯 BFC，无 overflow 副作用 */
}
```

### 8.5 float vs flex（现代对比）

| 维度 | float | flexbox |
|------|-------|--------|
| 提出时间 | CSS 2.1（2009 年） | CSS 3（2012 年） |
| 布局能力 | 伪二维（只能左/右） | 真二维（主轴+交叉轴） |
| 脱离文档流 | 是 | Flex 项目仍参与 flex 容器布局 |
| 文字绕排 | 原生支持 | 需额外处理 |
| 换行 | 手动处理 | `flex-wrap: wrap` |
| 垂直对齐 | 困难 | `align-items` 轻松实现 |
| 居中能力 | 困难 | `justify-content: center` 一行 |
| 现代项目推荐 | 不推荐（已淘汰） | 优先使用 |

### 8.6 React / Next.js / TS 代码示例

```tsx
// components/FloatImageText.tsx
// 浮动典型场景：文字绕排图片
export function FloatImageText() {
  return (
    <article style={{ maxWidth: '600px', lineHeight: 1.8, padding: '20px' }}>
      <img
        src="https://picsum.photos/200/150"
        alt="示例图片"
        style={{
          float: 'left',
          marginRight: '16px',
          marginBottom: '8px',
          borderRadius: '8px',
          width: '200px',
          height: '150px',
          objectFit: 'cover',
        }}
      />
      <p style={{ margin: 0, textAlign: 'justify' }}>
        这段文字会环绕在浮动图片的右侧显示。当文字长度超过图片高度时，
        会自动流到图片下方继续排版。这是 float 最原生的使用场景——
        实现图片与文字的环绕效果，而不是做页面布局。
      </p>
      <div style={{ clear: 'both' }} /> {/* 清除浮动，使后续内容从左边缘开始 */}
    </article>
  );
}

// components/GridUsingFloat.tsx
// 模拟 Grid 的等高列效果（不推荐，仅作演示）
export function GridUsingFloat() {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
  return (
    <div className="clearfix" style={{ margin: '16px' }}>
      {colors.map((color, i) => (
        <div
          key={i}
          style={{
            float: 'left',         /* 关键：float 使列并排 */
            width: 'calc(25% - 12px)',
            marginRight: '16px',
            backgroundColor: color,
            borderRadius: '8px',
            padding: '24px',
            color: '#fff',
            minHeight: '120px',
          }}
        >
          列 {i + 1}
        </div>
      ))}
    </div>
  );
}

// 配合 CSS Module 的 clearfix（推荐方式）
// Clearfix.module.css
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}
```

### 8.7 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| 用 float 做页面布局 | 现代 CSS 使用 Flexbox 或 Grid，float 只做文字绕排 |
| 浮动导致父元素塌陷 | 使用 clearfix 或 `display: flow-root` |
| float 和绝对定位混合使用 | float 主要用于内容排版，绝对定位用于 UI 组件，分工明确 |
| 忘记 `clear: both` | 浮动段结束后加清除，防止影响后续内容 |
| `overflow: hidden` 清除浮动导致内容被裁剪 | 使用 `display: flow-root` 或 `clearfix` 代替 |

### 8.8 面试题

**Q1: 浮动的原理是什么？浮动元素会脱离文档流，但对谁"不脱离"？**

> 参考答案：浮动元素会脱离正常文档流（不占位），向左/向右移动直到碰到包含块边缘或另一个浮动元素。关键：浮动元素不脱离**文字流**（text flow），文字会绕排到浮动元素旁边（这是 float 设计初衷）。此外，浮动元素的父元素仍然受其影响（父元素高度塌陷），需要清除浮动。

**Q2: 清除浮动的几种方法？哪种最推荐？**

> 参考答案：① 空 div + `clear: both`（不推荐，污染 HTML）；② 父元素加 `overflow: hidden/auto`（触发 BFC，但可能裁剪内容）；③ Clearfix 伪元素 `::after { content:''; display:block; clear:both; }`（最常用，兼容性好）；④ `display: flow-root`（现代最推荐，无副作用）。当前最佳实践是 `display: flow-root`，语义清晰且无裁剪风险。

**Q3: 为什么 float 不适合现代布局？有哪些场景仍然需要用到 float？**

> 参考答案：float 设计初衷是实现文字绕排，而非页面布局。用 float 做布局需要配合 clearfix hack，且无法做垂直居中、换行对齐、等高列等现代布局需求。Flexbox/Grid 可以优雅地解决这些问题。现代仍需要 float 的场景：① 图片与文字的绕排（CSS Shapes）；② 需要文字沿曲线排布的 CSS Shapes 功能；③ 老项目维护。日常页面布局不推荐使用 float。

---

## 9. 选择器优先级

### 9.1 定义与计算规则

CSS 选择器优先级（Specificity）决定了当多个 CSS 规则作用于同一元素时，哪条规则优先生效。计算方式为三维权重比较。

### 9.2 优先级计算表

| 选择器类型 | 示例 | 权重分值 | 写法 |
|---------|------|--------|------|
| 通配符 / 组合器 | `*`, ` `, `>`, `+`, `~` | 0,0,0 | 不加分 |
| 元素 / 伪元素 | `div`, `::before`, `::placeholder` | 0,0,1 | A=0 B=0 C=1 |
| 类 / 属性 / 伪类 | `.card`, `[type="text"]`, `:hover` | 0,1,0 | A=0 B=1 C=0 |
| ID 选择器 | `#header`, `#nav.active` | 1,0,0 | A=1 B=0 C=0 |
| 内联样式 | `<div style="...">` | 1,0,0,0 | 最高优先 |
| `!important` | `color: red !important` | 最高 | 最高优先 |

**优先级顺序（从低到高）**：
```
通配符/组合器 < 元素/伪元素 < 类/属性/伪类 < ID < 内联样式 < !important
```

**比较规则**：
- 逐位比较（A > B > C），高一位胜出则不再比较低位
- `(0,1,0)` 强于 `(0,0,9)`（B 位胜出）
- `(1,0,0)` 强于 `(0,9,9)`（A 位胜出）

### 9.3 优先级计算示例

```css
/* 权重: 0,1,1 → (0,1,1) */
div.articles .title { color: red; }

/* 权重: 0,1,0 → (0,1,0) */
.title { color: blue; }                    /* 被上面覆盖 */

/* 权重: 1,0,0 → (1,0,0) */
#header { color: green; }                  /* 覆盖上面的 .articles .title */

/* 权重: 1,0,1 → (1,0,1) */
#header h1 { color: purple; }             /* 覆盖上面的 #header */

/* 内联样式: 最高优先 */
<div style="color: orange">...</div>      /* 覆盖 #header h1 */

/* !important: 最高最高 */
.title { color: pink !important; }        /* 覆盖内联样式 */
```

### 9.4 !important 与 CSS @layer 层级

**级联顺序（由高到低）**：
```
!important 用户代理 < !important 用户样式 < !important 作者样式
作者样式（按 @layer 顺序）
  @layer reset < @layer base < @layer components < @layer utilities
  无名称层（最后定义，覆盖所有 @layer）
一般样式（按 !important 相反顺序）
作者样式 < 用户样式 < 用户代理样式
```

**@layer 语法示例**：
```css
/* 定义层顺序（声明顺序即优先级） */
@layer reset, base, components, utilities;

@layer reset {
  * { box-sizing: border-box; margin: 0; padding: 0; }
}
@layer base {
  body { font-family: system-ui; }
}
@layer components {
  .btn { padding: 8px 16px; border-radius: 4px; }
}
@layer utilities {
  .hidden { display: none; }
}
```

### 9.5 React / Next.js / TS 代码示例

```tsx
// utils/specificity.ts
// TypeScript 优先级计算工具

type SpecificityTuple = [number, number, number];

const SELECTOR_WEIGHTS = {
  universal: [0, 0, 0] as SpecificityTuple,
  element: [0, 0, 1] as SpecificityTuple,
  class: [0, 1, 0] as SpecificityTuple,
  id: [1, 0, 0] as SpecificityTuple,
  inline: [1, 0, 0] as SpecificityTuple, // inline style
} as const;

function compareSpecificity(a: SpecificityTuple, b: SpecificityTuple): number {
  // 从 A 位到 C 位逐位比较
  if (a[0] !== b[0]) return a[0] - b[0]; // ID 比较
  if (a[1] !== b[1]) return a[1] - b[1]; // Class 比较
  return a[2] - b[2];                    // Element 比较
}

function parseSelector(selector: string): SpecificityTuple {
  let a = 0, b = 0, c = 0;
  // 简单解析：ID、Class、Element 分别计数
  const idMatches = selector.match(/#[\w-]+/g) || [];
  const classMatches = selector.match(/\.[\w-]+/g) || [];
  const attrMatches = selector.match(/\[[\w="'-]+\]/g) || [];
  const pseudoClassMatches = selector.match(/:[\w-]+(?!\()[^:(]*/g) || [];
  const elementMatches = selector.match(/^([\w-]+|\*)/g) || [];

  a = idMatches.length; // ID count
  b = classMatches.length + attrMatches.length + pseudoClassMatches.length; // Class count
  c = elementMatches.length; // Element count

  return [a, b, c];
}

// 伪元素 vs 伪类：伪元素也占 C 位（和元素同级）
// :hover       → (0,1,0)   伪类
// ::before     → (0,0,1)   伪元素

// CSS Modules 中避免优先级战争：用类名替代 ID
// Button.module.css
// .button { background: blue; }  覆盖：.button.primary
// 不要用 .button#uniqueId {}  增加优先级复杂度
```

### 9.6 优先级常见陷阱

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| `!important` 滥用 | 导致样式难以维护和覆盖 | 避免使用，优先用级联层 `@layer` |
| 选择器过长 | `.wrapper .container .card .card-body p span` 权重的陷阱 | 用 BEM / CSS Modules 减少嵌套 |
| 内联样式覆盖 | React `style={}` 优先级过高，难以被 CSS 覆盖 | 用 className + CSS Modules |
| ID 选择器陷阱 | ID 权重过高（0,1,0）比任何单类选择器都高 | 避免在样式文件中用 ID 选择器 |
| 层叠顺序混乱 | 无 `@layer` 时，不同源样式互相覆盖 | 用 `@layer` 声明优先级层级 |

### 9.7 面试题

**Q1: CSS 优先级是如何计算的？用公式说明选择器 `#nav .menu-item a::hover` 的权重。**

> 参考答案：CSS 优先级用三维权重 `[A, B, C]` 表示：`(ID数, 类/属性/伪类数, 元素/伪元素数)`。计算 `#nav .menu-item a::hover`：ID `#nav` = [1,0,0]；类 `.menu-item` = [0,1,0]；元素 `a` = [0,0,1]；伪类 `:hover` = [0,1,0]；总计 [1, 2, 1]，即 A=1, B=2, C=1。比较时从 A 位开始，A 位胜出则 B、C 不再比较。

**Q2: `!important` 的优先级是什么？滥用会带来什么问题？**

> 参考答案：`!important` 声明具有最高优先级（高于内联样式），但当多个 `!important` 同时存在时，仍然按正常优先级规则比较。滥用问题：① 所有用 `!important` 的样式都必须再用 `!important` 才能覆盖，形成恶性循环；② 影响第三方样式库（用户无法用正常优先级覆盖）；③ 调试困难，样式来源不清晰。最佳实践：不使用 `!important`，用 `@layer` 管理优先级层级。

**Q3: CSS `@layer` 是什么？如何用 `@layer` 解决大型项目的样式优先级冲突？**

> 参考答案：`@layer` 是 CSS 2022 年引入的级联层机制，用于显式定义样式的优先级层级。先声明层顺序 `@layer reset, base, components, utilities;`，越后声明的层优先级越高（同层内按 `!important` 规则）。用法：① 在层中编写样式；② 使用 `@import` 指定层；③ 任何不在命名层中的样式属于"默认层"（优先级最高）。优势：无需增加选择器特异性即可覆盖第三方库样式，保持代码清晰可维护。

---

## 10. transition vs animation

### 10.1 定义与对比

| 维度 | `transition` | `@keyframes animation` |
|------|-------------|----------------------|
| **触发方式** | 需状态变化（hover/click/JS 修改） | 无需触发，自动/立即执行 |
| **关键帧** | 始终是 2 个状态（起点→终点） | 任意数量（0% ~ 100%） |
| **循环能力** | 单次 | 通过 `animation-iteration-count: infinite` 循环 |
| **暂停能力** | 不支持（状态固定） | `animation-play-state: paused` 暂停 |
| **方向控制** | 单一方向 | `animation-direction` 控制正/逆向/交替 |
| **性能** | 较好（自动优化） | 取决于属性（可触发 GPU 加速） |
| **适用场景** | 简单的状态切换 | 复杂的多阶段动画 |

### 10.2 transition 详解

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

### 10.3 @keyframes animation 详解

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

### 10.4 性能优化与 GPU 加速

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

### 10.5 ASCII 动画时序图

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

### 10.6 React / Next.js / TS 代码示例

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

### 10.7 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| 用 `transition` 做循环动画 | 应该用 `@keyframes animation` |
| `transition` 用在 `display: none → block` | `display` 不是可过渡属性，用 `opacity` + `visibility` 替代 |
| 动画所有属性 | 只动画 `transform`/`opacity`（GPU 加速），避免重排/重绘 |
| `will-change` 滥用 | 只在动画开始前短期使用，动画结束后清除 |
| `animation-fill-mode` 未设置 | 需要保持结束状态时加 `forwards`，否则恢复初始状态 |
| 缓动函数全用 `ease` | 进场动画用 `ease-out`，退场动画用 `ease-in`，循环用 `linear` |

### 10.8 面试题

**Q1: `transition` 和 `@keyframes animation` 的核心区别是什么？什么情况下必须用 animation？**

> 参考答案：① `transition` 需要状态变化触发（hover、JS 修改类名），只能连接两个状态；`@keyframes` 可以定义任意多个关键帧，无需触发即可执行。② 必须用 animation 的场景：循环动画（loader、转圈）、自动播放的入场动画、骨架屏闪烁效果、交错延迟动画、`animation-play-state` 暂停/恢复动画、`animation-direction: alternate` 往复运动。

**Q2: 哪些 CSS 属性适合做动画（性能好），哪些不适合？为什么？**

> 参考答案：适合（GPU 加速，合成层）：`transform`（translate/scale/rotate）、`opacity`、`filter: blur()`。不适合（触发重排/重绘）：`width/height/margin/padding`（几何属性）、`left/top/right/bottom`（定位属性）、`background-color`（重绘）。原因：GPU 合成层的动画在 Compositor Thread 执行，不触发主线程 Layout/Paint；而几何属性变化会导致浏览器重新计算布局，性能损耗大。

**Q3: `will-change` 的作用是什么？使用不当会造成什么问题？**

> 参考答案：`will-change` 提示浏览器该元素即将发生动画，浏览器提前为其创建独立的合成层（Compositor Layer），使动画在 GPU 上执行。滥用问题：① 每个元素都创建合成层会占用大量 GPU 内存（每个合成层约 2-4MB）；② 过度使用可能导致页面卡顿。最佳实践：① 仅在动画即将开始前应用，动画结束后移除；② 优先使用 `transform: translate3d(0,0,0)` 触发合成层（同效果，更可控）；③ 只对少量高频动画元素使用。

---

## 📚 参考

- [MDN CSS Grid Layout](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Grid_Layout)
- [MDN CSS Flexbox](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Flexible_Box_Layout)
- [MDN Media Queries](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Media_Queries)
- [MDN @keyframes rule](https://developer.mozilla.org/zh-CN/docs/Web/CSS/@keyframes)
- [MDN CSS animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/CSS_JavaScript_animation_performance)
- [MDN CSS z-index](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Positioning/Understanding_z_index)
- [CSS Grid auto-fill vs auto-fit - SegmentFault](https://segmentfault.com/a/1190000040116599)
- [CSS flex: 1 vs flex: auto - 掘金](https://juejin.cn/)
- [CSS Container Queries - Chrome Developers](https://developer.chrome.com/docs/css-container-queries/)
- [CSS @layer 级联层 - CSDN](https://blog.csdn.net/weixin_41455464/article/details/155615503)
- [CSS float 与 BFC - 腾讯云开发者社区](https://cloud.tencent.com/developer/article/2543541)
- [CSS transition vs animation - 知乎](https://zhuanlan.zhihu.com/p/688210155)
- [CSS 选择器优先级计算 - 博客园](https://www.cnblogs.com/emanlee/p/18226215)