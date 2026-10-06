---
title: 响应式布局
description: 媒体查询、移动优先、断点、容器查询与响应式核心思路。
tags:
  - css
---

# 响应式布局


## 1. 响应式布局

### 1.1 定义与背景

响应式布局（Responsive Design）通过使网页"适应"不同设备的屏幕宽度和特性，提供最佳浏览体验。核心工具是 CSS 媒体查询（Media Queries），结合相对单位实现。

### 1.2 核心工具：媒体查询

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

### 1.3 Mobile-First vs Desktop-First

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

### 1.4 常用断点参考

| 设备 | 断点范围 | 常用 breakpoint |
|------|---------|---------------|
| 手机 | < 576px | `@media (max-width: 575px)` |
| 平板（竖） | 576-767px | `@media (min-width: 576px)` |
| 平板（横）/ 小桌面 | 768-991px | `@media (min-width: 768px)` |
| 桌面 | 992-1199px | `@media (min-width: 992px)` |
| 大桌面 | >= 1200px | `@media (min-width: 1200px)` |

### 1.5 Container Queries（容器查询，CSS 2023 新特性）

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

### 1.6 React / Next.js / TS 代码示例

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

### 1.7 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| 仅用媒体查询，不考虑内容本身 | 结合 Container Queries，让组件自响应 |
| 混用 em/rem 导致基准混乱 | 统一用 rem 作为间距单位，用 `clamp()` 做 fluid typography |
| Desktop-First 写媒体查询覆盖层过多 | 新项目使用 Mobile-First，减少代码量 |
| 断点设置过于随意 | 使用业界通用断点（576/768/992/1200px）或设计稿断点 |
| 忽略 `prefers-color-scheme` 等媒体特性 | 兼顾暗色模式：`@media (prefers-color-scheme: dark)` |

### 1.8 面试题

**Q1: 什么是 Mobile-First 响应式设计？相比 Desktop-First 有什么优势？**

> 参考答案：Mobile-First 先为移动设备编写基础样式，再通过 `min-width` 媒体查询逐步增强到平板、桌面。优势：① 移动端样式最简单，代码量最少，性能最优；② 渐进增强思路更符合"功能降级"理念；③ `min-width` 媒体查询堆叠更清晰，`max-width` 堆叠容易出现样式冲突；④ 避免桌面端代码向移动端"裁剪"时覆盖层过多的问题。

**Q2: `rem` 和 `em` 有什么区别？为什么推荐用 `rem` 做响应式布局？**

> 参考答案：`em` 相对于当前元素的 `font-size`，若嵌套多层会累积（`1em` 在 `0.8em` 父元素下实际是 `0.8em`）；`rem` 相对于根元素 `<html>` 的 `font-size`，全局统一基准，不会累积。推荐 `rem`：因为响应式布局通常希望间距和字体基于同一个全局基准缩放，用 `rem` 可以通过修改 `<html>` 的 `font-size` 一次控制全局缩放比例（如用户缩放页面或主题切换）。

**Q3: CSS Container Queries 和 Media Queries 的区别是什么？各自适用什么场景？**

> 参考答案：Media Queries 基于**视口**（viewport）条件判断，不关心组件的父容器宽度；Container Queries 基于**父容器**宽度条件判断，使组件能独立响应其所在容器的尺寸变化。适用场景：① 组件库中的卡片在侧边栏和主内容区展示不同布局；② 可复用模块在页面不同位置展示不同样式；③ Media Query 做不到的"同一组件在不同容器中自适应"的场景。注意：Container Queries 目前已得到现代浏览器支持（Chrome 105+），但 IE 不支持。


## 2. 面试精讲：响应式布局核心

### 2.1 响应式布局核心

```css
/* 移动优先：min-width（逐步增强） */
/* 桌面优先：max-width（逐步降级） */

/* 断点参考 */
@media (min-width: 576px)  { /* 小屏手机 */ }
@media (min-width: 768px)  { /* 平板 */ }
@media (min-width: 992px)  { /* 小屏笔记本 */ }
@media (min-width: 1200px) { /* 大屏桌面 */ }
@media (min-width: 1400px) { /* 超大屏 */ }
```

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理系统的万行数据表格，运营在 1366px 笔记本与 375px 手机之间切换 | 媒体查询断点、相对单位、容器宽度与视口宽度的区别 | `overflow-x: auto` + 首列 `position: sticky` + `max-width` 媒体查询转卡片 | `sticky` 的祖先元素不能设 `overflow: hidden`；卡片模式要由 `data-label` 回填列名 |
| 低端安卓机的电商首屏加载 | 媒体查询中按视口宽度分支、相对单位控制尺寸 | `<img srcset>` 与 `sizes`、`width`/`height` 属性预占位 | 首屏主图不要加 `loading="lazy"`；候选图档位控制在 2 到 3 个 |
| 多人协作白板，画布随窗口拖拽与折叠屏展开变化 | 容器查询、相对单位、位图尺寸与 CSS 尺寸的换算 | `container-type` + `@container`、`ResizeObserver`、`devicePixelRatio` | 必须先声明容器再写查询；回调里合并多次尺寸变化 |
| 手机端长表单填写，例如注册、报销、工单提交 | 媒体查询、相对单位、视口高度单位 | `min-width` 断点、输入框字号不小于 16px、`dvh` 单位 | iOS 上输入框字号过小会触发自动缩放；地址栏收起会改变可用高度 |
| 大屏数据看板投屏，宽度在 1920px 与 2560px 之间切换 | 媒体查询断点、相对单位 | `clamp()` 控制字号、`minmax()` 网格、按 `min-width` 逐级放大 | 宽屏不要无限拉伸单列内容，给内容区设最大宽度或多列网格 |
| 折叠屏与分屏窗口，应用宽度在 300px 到 900px 之间连续变化 | 容器查询、`flex-wrap` 的自然换行 | `@container`、`ResizeObserver` | 视口宽度不等于组件可用宽度，布局判断要落在容器上 |
| A4 报表在浏览器打印预览与 PDF 导出 | 媒体查询的媒体类型分支 | `@media print`、`@page`、`break-inside: avoid` | 打印里 `position: sticky` 行为与屏幕不同；交互控件要在打印前隐藏 |
| HTML 邮件在手机端邮件客户端中阅读 | 媒体查询的兼容边界 | 内联样式为主，`<style>` 内补少量 `min-width` 查询 | 部分客户端会剥离样式表或改写颜色，落地前核对目标客户端文档 |
| 车机与电视浏览器，横屏加遥控器方向键操作 | 媒体查询的方向与宽高特性、相对单位 | `@media (orientation: landscape)`、`rem` 放大、焦点样式 | 没有悬停指针，`:hover` 样式不可依赖；焦点可见性必须保留 |

### 三个场景拆解

#### 场景 1：后台管理的万行数据表格

**业务背景**：工单列表在 1366px 笔记本上一屏能看 8 列，到了 375px 手机上门户被撑破，用户要左右滑动才能把值和列名对上。列表规模在千行以上，翻页与筛选都由服务端完成。

**怎么用本页知识解决**：宽屏保留表格结构并冻结首列，窄屏用媒体查询把每一行改成卡片，列名从 `data-label` 属性取出，写进 `td::before`。

```css
.table-wrap { overflow-x: auto; }
.table-wrap th:first-child,
.table-wrap td:first-child {
  position: sticky; left: 0;   /* 首列冻结，横向滚动时保持可见 */
  background: #fff;            /* 要有背景色，否则下层内容透出 */
}
@media (max-width: 640px) {
  .table-wrap thead { display: none; }   /* 窄屏隐藏表头 */
  .table-wrap tr { display: block; border: 1px solid #e5e7eb; }
  .table-wrap td {
    display: flex; gap: 8px;              /* 列名与值排在同一行 */
    padding: 6px 10px;
    word-break: break-word;               /* 长工单号不撑破卡片 */
  }
  .table-wrap td::before {
    content: attr(data-label);            /* 列名由 HTML 属性提供 */
    flex: 0 0 6em;
  }
}
```

- 服务端渲染时给每个 `td` 写 `data-label="工单号"`，卡片模式的列名与表头来自同一份数据，不会两处维护。
- 首列冻结要求滚动容器只处理横向溢出，纵向溢出交给页面，否则 `sticky` 的参照系会变成容器本身。
- 卡片模式下 `td` 用 `display: flex`，标签列固定 `6em`，值列自动换行，长文本不会把卡片顶出视口。
- 同一份 HTML 同时服务两种布局，不要用 JS 判断屏幕宽度再切换 DOM 结构，否则筛选后重渲染容易漏掉状态。

**怎么度量收益**：在 DevTools 设备工具栏选 375×667，Console 里执行 `document.documentElement.scrollWidth > document.documentElement.clientWidth`，检查是否仍有横向滚动。用 `PerformanceObserver` 监听 `longtask`，在窄屏下滚动表格 10 秒，统计超过 50ms 的条目数量。对比改动前后 `document.body.scrollHeight`，判断卡片模式是否把页面拉得过长。

**什么时候不该用**：表格只有 3 列以内且都是短数字时，窄屏保留横向滚动就够，转卡片只会增加页面高度。需要逐行横向比对同一列数值的场景，例如对账页面，转卡片后用户无法对齐阅读，应改成折叠次要列加展开行。

#### 场景 2：低端安卓机的活动页首屏

**业务背景**：活动页主图只有一个大文件，窄屏设备也下载整张图，图片没有预留高度，加载完成后内容向下跳动导致用户点错按钮。页面在入门安卓机上打开，网络常在 4G 与弱网之间波动。

**怎么用本页知识解决**：用 `srcset` 与 `sizes` 把选图交给浏览器，用 `width` 与 `height` 属性给图片预留空间，把首屏主图的加载优先级提到最高。

```html
<img src="hero-800.jpg"
     srcset="hero-400.jpg 400w,
             hero-800.jpg 800w,
             hero-1600.jpg 1600w"
     sizes="(max-width: 640px) 100vw, 50vw"
     width="800" height="600"
     fetchpriority="high"
     alt="活动主图">
```

- `srcset` 里的 `w` 描述符写的是图片本身的像素宽度，浏览器结合 `sizes` 算出的显示宽度和屏幕像素比挑选文件。
- `sizes` 只在配合 `w` 描述符时生效，写成固定 `px` 值会让浏览器按错误宽度选图。
- `width` 与 `height` 属性配合 CSS 的 `height: auto`，浏览器在图片到达前就能算出宽高比并占位，减少 CLS。
- 首屏主图不加 `loading="lazy"`，懒加载会把它排到后面；`fetchpriority="high"` 只给这一张图，不要给列表里的每张图都加。

**怎么度量收益**：Network 面板按 Img 过滤，记录 320px 视口下选中的文件名与 Size，与改动前的单一大图对照。用 `web-vitals` 库或 Lighthouse 报告读取 LCP 与 CLS，测试时把 Network 设为 Slow 4G、CPU 设为 4x slowdown，同一设备跑 5 次取中位数。用 Lighthouse 的 Properly size images 审计项检查是否仍有超尺寸图片。

**什么时候不该用**：页面上只有一张体积已经压得很小的图，或者这张图是 SVG 图标时，加 `srcset` 只增加 HTML 复杂度，测不出差异。图片由用户上传、尺寸不可控时，应该在服务端生成多档尺寸，而不是在前端列候选文件。

#### 场景 3：多人协作白板的画布容器

**业务背景**：白板组件既作为整页使用，也嵌在右侧栏里，用户拖动窗口或展开折叠屏时可用宽度连续变化。组件在两个位置共用同一份样式，之前靠外层传类名区分，改动一处就会漏掉另一处。

**怎么用本页知识解决**：把布局判断从视口转移到组件容器上，用容器查询决定横向排列还是纵向堆叠，画布位图尺寸按 `devicePixelRatio` 换算。

```css
/* 组件自己声明可被查询的容器，按内联方向尺寸建立查询上下文 */
.panel { container-type: inline-size; }

.panel__body { display: flex; gap: 12px; }

/* 面板可用宽度不足时纵向堆叠，与窗口宽度无关 */
@container (max-width: 320px) {
  .panel__body { display: block; }
  .panel__canvas { width: 100%; }
}
```

- `container-type: inline-size` 让容器按内联方向尺寸参与查询，没有这一行 `@container` 不会生效。
- 查询条件写的是容器宽度，组件放进侧栏和放进整页走同一套规则，不需要外层传类名。
- 画布位图尺寸按 CSS 宽度乘以 `devicePixelRatio` 设置 `canvas.width`，再用 CSS 宽度缩回，避免高分屏发虚。
- `ResizeObserver` 的回调里用 `requestAnimationFrame` 合并连续变化，拖拽窗口时不要每次回调都同步读布局。

**怎么度量收益**：用 Performance 面板录制 5 秒窗口拖拽过程，统计超过 50ms 的脚本任务数量。打开 Rendering 面板的 Paint flashing，确认重绘区域只在画布内。把组件分别放进侧栏与整页截图对照，确认布局分支只有一套。

**什么时候不该用**：组件宽度始终等于视口宽度、也不会跨区域复用时，容器查询带来的样式层数换不到收益，直接写媒体查询更省事。需要按指针类型、网络状况或用户偏好切换时，容器查询拿不到这些信息，应改用媒体查询或对应的媒体特性。

### 行业先进实践

做法名称：移动优先的断点策略（出处：MDN Web Docs《Responsive design》《Using media queries》）
官方文档给出的做法是先写窄屏基础样式，再用 `min-width` 媒体查询逐级覆盖。这样基础样式在任意宽度下都能先渲染出可用布局，覆盖规则只做加法，排查冲突时从宽到窄看一条链。借鉴方式是把项目基础样式表按 320px 宽度过一遍，只对确有必要的地方补 `min-width` 断点。

做法名称：组件级自适应用容器查询（出处：W3C CSS Containment Module Level 3 / MDN Web Docs《CSS container queries》）
规范把容器尺寸查询定义为组件按自身可用空间决定布局的能力，组件放进侧栏、主区、弹窗时共用一套样式。落地前需核对官方文档：MDN 的容器查询浏览器兼容表，确认目标浏览器版本是否支持，并判断是否要保留一份媒体查询兜底。

做法名称：响应式图片交给浏览器选图（出处：WHATWG HTML Living Standard 的 `srcset` 与 `sizes` 属性 / MDN Web Docs《Responsive images》）
HTML 标准用 `w` 描述符和 `sizes` 把选图逻辑交给浏览器，浏览器结合视口宽度与屏幕像素比挑候选文件，前端不再写 JS 判断屏幕宽度再改 `src`。借鉴方式是把首屏大图的候选尺寸列成 2 到 3 档，再用 Network 面板核对实际选中的文件。

做法名称：用 Core Web Vitals 做验收口径（出处：web.dev 的 Core Web Vitals / 开源项目 GoogleChrome/web-vitals）
公开定义的 LCP、CLS、INP 把加载速度与内容跳动变成可测数字，`web-vitals` 库把这三个指标上报出来。它把响应式改动的效果从主观判断变成同一设备、同一网络档位下的前后对比。借鉴方式是在改动前后各跑 5 次，固定 Network 与 CPU 档位，对比中位数。

做法名称：内在尺寸布局减少断点数量（出处：开源项目 Every Layout）
该项目的布局原语用 `minmax()`、`clamp()`、`flex-wrap` 让元素按可用空间自己换行和收缩，只在确有必要处写断点。断点越少，需要维护的中间状态越少。借鉴方式是先把一个列表页里的固定宽度换成 `minmax()` 与 `auto-fit` 网格，删掉只用于微调的断点，再用响应式模式从 320px 拖到 1440px 观察是否有跳变。

### 从学到用：落地路线

第 1 步试点：挑一个窄屏报障集中的页面，只改媒体查询与图片候选，不动业务逻辑。验收标准是在 320px、768px、1280px 三个宽度下截图，页面都不出现横向滚动条。

第 2 步验证：用 Playwright 或 Puppeteer 在同样三个宽度打开页面，断言 `document.documentElement.scrollWidth === document.documentElement.clientWidth`。验收标准是这段检查在合并请求里自动跑通，失败时输出具体视口宽度。

第 3 步推广：把试点页面的断点清单、图片尺寸档位、表格转卡片写法整理成项目内文档与代码片段，同类页面照抄。验收标准是同一模块下至少 3 个页面使用同一套断点值，评审时能直接引用这份清单。

第 4 步防回退：把视口宽度检查与 Core Web Vitals 采集接入发布流程，固定设备与网络档位。验收标准是每次发布后留一份对比记录，LCP 与 CLS 出现回退时有明确跟进人。

### 动手作业

目标：把一个已有的列表页改造成 320px 到 1440px 都能用的响应式页面，并留下一份可复现的测量记录。

步骤：

1. 选一个包含列表或表格、一张大图、一个表单的页面，用 DevTools 设备工具栏在 320px、768px、1024px 三个宽度截图，存作基线。
2. 在 Console 执行 `document.documentElement.scrollWidth > document.documentElement.clientWidth`，记录三个宽度下的结果。
3. 用 Network 面板按 Img 过滤，记录首屏图片的文件名与传输字节。
4. 按移动优先重写基础样式，再补 `min-width` 断点；表格在窄屏用媒体查询转卡片，并给每个 `td` 补 `data-label`。
5. 给首屏大图加 `srcset`、`sizes`、`width`、`height`，首屏图不加 `loading="lazy"`。
6. 重复第 2、3 步的测量，把 Network 设为 Slow 4G、CPU 设为 4x slowdown，跑 5 次取中位数对比 CLS 与 LCP。
7. 写一份不超过一页的记录：改了什么、测到什么、哪些宽度仍不合格。

验收标准：

- 320px、768px、1024px 三个宽度下 `document.documentElement.scrollWidth === document.documentElement.clientWidth` 成立。
- 三个宽度下的截图里没有文字被裁切，没有按钮超出视口。
- 320px 视口下首屏图片选中的文件与基线不同，Network 面板能看到文件名与体积变化。
- 320px 宽度下点击表单输入框，页面不横向滚动，也不发生整体缩放。
- 记录里的每条结论都能用第 2、3、6 步的命令或面板复现。

