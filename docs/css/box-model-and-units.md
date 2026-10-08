---
title: 盒模型与长度单位
description: 标准盒模型与 IE 盒模型、box-sizing，以及 rem/em/vw/vh 等单位的区别。
tags:
  - css
---

# 盒模型与长度单位


## 1. 盒模型（Box Model）

### 1.1 定义与背景

CSS 盒模型描述了 HTML 元素在页面上占据空间的方式。每个元素都被视为一个矩形盒子，由四层区域组成，从内到外依次是：

```
+-------------------------------+
|           margin              |
|  +---------------------------+|
|  |         border            ||
|  |  +-----------------------+||
|  |  |       padding         |||
|  |  |  +-----------------+  |||
|  |  |  |    content      |  |||
|  |  |  +-----------------+  |||
|  |  +-----------------------+||
|  +---------------------------+|
+-------------------------------+
```

- **content**：元素实际内容区域（文字、图片等），由 `width` / `height` 控制
- **padding**：内边距，位于 content 与 border 之间，背景色会填充
- **border**：边框，可设粗细、样式、颜色
- **margin**：外边距，元素与元素之间的间距，透明（不占据背景）

### 1.2 两种盒模型对比

| 属性 | `content-box`（标准盒模型） | `border-box`（替代盒模型 / 怪异盒模型） |
|------|------|------|
| 默认值 | 是（浏览器默认值） | 需手动声明 |
| `width` 包含 | 仅 content | content + padding + border |
| 增加 padding/border 后 | 实际宽度 = width + padding + border（撑大） | 实际宽度 = width（内容压缩） |
| 适用场景 | 内容尺寸需精确控制的旧项目 | 现代项目（推荐） |
| 实际占用计算 | `width + 2*padding + 2*border + 2*margin` | `width + 2*margin` |

**计算示例：**

```css
.box {
  width: 200px;
  padding: 10px;
  border: 2px solid #333;
  /* content-box: 实际宽度 = 200 + 20 + 4 = 224px（撑大） */
  /* border-box:  实际宽度 = 200px（padding/border 往里压缩 content） */
}
```

### 1.3 ASCII 原理图

```
content-box 效果（width = 200px, padding = 10px, border = 2px）:

|<-       200px content        ->|
|  padding(10)  | content |  padding(10)  |
|<-  border(2)   |         |   border(2)   ->|
总宽度 = 200 + 20 + 4 = 224px  [盒子被撑大]

border-box 效果（width = 200px, padding = 10px, border = 2px）:

|<-        200px 总宽度          ->|
|  border(2) | padding(10) | content | padding(10) | border(2)  |
content 实际可用宽度 = 200 - 20 - 4 = 176px  [content 被压缩]
```

### 1.4 React / Next.js / TS 代码示例

```tsx
// React 组件：使用 border-box 确保布局一致性
// globals.css / layout.module.css

// 推荐：在 CSS reset 中全局设置
*, *::before, *::after {
  box-sizing: border-box; // 现代项目必选项
}

// Next.js App Router：全局布局文件
// app/layout.tsx
import './globals.css'

// 组件示例：精确控制卡片尺寸
interface CardProps {
  width?: number | string;
  padding?: number;
  borderWidth?: number;
}

export function Card({ width = 300, padding = 16, borderWidth = 1 }: CardProps) {
  const cardStyle: React.CSSProperties = {
    boxSizing: 'border-box',          // 关键：保证 width 就是最终宽度
    width: typeof width === 'number' ? `${width}px` : width,
    padding: `${padding}px`,
    border: `${borderWidth}px solid #e0e0e0`,
    borderRadius: '8px',
    backgroundColor: '#fff',
    // 即使内部加 padding，总宽度始终等于 width
  };
  return <div style={cardStyle}>Card Content</div>;
}

// TypeScript 类型定义
type BoxSizing = 'content-box' | 'border-box' | 'padding-box';

interface BoxModelConfig {
  boxSizing: BoxSizing;
  width: number;
  height: number;
  padding: number;
  borderWidth: number;
  margin: number;
}

function calculateActualWidth(config: BoxModelConfig): number {
  if (config.boxSizing === 'content-box') {
    return config.width + config.padding * 2 + config.borderWidth * 2;
  }
  // border-box: width 已经是最终宽度
  return config.width;
}
```

### 1.5 IE 盒模型 quirks（历史背景）

IE6 及更早版本在"怪异模式"（Quirks Mode）下使用 border-box 盒模型。IE5.5 完全忽略 width，width 本身就等于 content + padding + border。这一行为后来被标准化为 `box-sizing: border-box`。

```css
/* IE6 quirks 兼容写法 */
*, *::before, *::after {
  box-sizing: border-box; /* 现代所有浏览器均支持 */
}

/* 渐进增强写法 */
.my-element {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box; /* 统一行为 */
  -webkit-box-sizing: border-box; /* Safari 旧版本 */
  -moz-box-sizing: border-box;    /* Firefox 旧版本 */
}
```

### 1.6 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| 忘记设置 `box-sizing` 导致 padding 撑大布局 | 全局 `*, *::before, *::after { box-sizing: border-box; }` |
| `box-sizing` 不继承，子元素需重复设置 | 使用继承写法，见上方代码示例 |
| `margin` 合并导致间距异常 | 了解 margin 塌陷规则（见第 2 节） |
| 混合使用 px / % / rem 导致计算混乱 | 统一单位，用 `calc()` 做混合计算 |

### 1.7 面试题

**Q1: `box-sizing: border-box` 和 `content-box` 的区别是什么？在什么场景下必须用 `border-box`？**

> 参考答案：`content-box` 的 width 仅包含内容，`border-box` 的 width 包含内容+padding+border。在需要精确控制总尺寸（如 UI 组件库、网格布局、百分比容器）时必须使用 border-box，否则 padding 会导致元素溢出父容器。

**Q2: 一个元素设置 `width: 200px; padding: 20px; border: 5px solid red;`，两种盒模型下实际占宽是多少？**

> 参考答案：content-box 下为 200+40+10=250px；border-box 下为 200px（padding 和 border 向内压缩 content）。

**Q3: `box-sizing` 属性可以继承吗？如何在大型项目中统一管理？**

> 参考答案：默认值不继承。最佳实践是在 CSS reset 中通过 `*, *::before, *::after { box-sizing: border-box; }` 全局覆盖，Next.js/Tailwind 项目通常在 globals.css 中完成此设置。


## 2. 面试精讲：CSS 盒模型

### 2.1 标准盒模型（W3C Box Model）

**从外到内的层次结构：**

| 层次 | 说明 |
|------|------|
| margin | 外边距，透明 |
| border | 边框 |
| padding | 内边距 |
| content | 内容区域 |
| width/height | 内容区的宽高 |

**元素总宽度计算公式：**
```
总宽度 = margin-left + border-left + padding-left + width + padding-right + border-right + margin-right
```

**元素总高度计算公式：**
```
总高度 = margin-top + border-top + padding-top + height + padding-bottom + border-bottom + margin-bottom
```

### 2.2 IE 盒模型（替代盒模型）

| 特点 | 说明 |
|------|------|
| width | 包含 content + padding + border（全部包含在 width 内） |
| height | 同理 |
| 层序 | margin → border → padding → content |

**计算方式：**
```
总宽度 = margin-left + width（含 padding + border）+ margin-right
```

### 2.3 box-sizing 属性

```css
/* 默认：标准盒模型（content-box） */
/* width = 内容区的宽度，不含 padding 和 border */
.box1 {
  box-sizing: content-box;
  width: 200px;
  padding: 20px;
  border: 10px solid #000;
  /* 实际渲染宽度 = 200 + 20*2 + 10*2 = 260px */
}

/* 推荐：IE 盒模型（border-box） */
/* width = 内容 + padding + border 的总宽度 */
.box2 {
  box-sizing: border-box;
  width: 200px;
  padding: 20px;
  border: 10px solid #000;
  /* 内容区实际宽度 = 200 - 20*2 - 10*2 = 140px */
  /* 总渲染宽度始终为 200px */
}
```

**为什么推荐 `box-sizing: border-box`：**

- 元素宽度更直观，方便布局计算
- 配合 Flexbox/Grid 使用时更易控制尺寸
- 避免"加了 padding/border 盒子就变大"的问题

```css
/* 全局设置（现代 CSS 项目推荐） */
*, *::before, *::after {
  box-sizing: border-box;
}
```


## 3. 面试精讲：rem / em / vw / vh / vmin / vmax 区别，px 为什么不是绝对单位

### 3.1 各单位详解

| 单位 | 定义 | 说明 |
|------|------|------|
| `px` | 像素 | 屏幕物理像素的 CSS 映射，非绝对单位 |
| `em` | 相对于自身 font-size | 无 font-size 时继承祖先 |
| `rem` | 相对于根元素 html 的 font-size | 通常 16px（浏览器默认值） |
| `vw` | 视口宽度的 1% | `100vw` = 视口宽度 |
| `vh` | 视口高度的 1% | `100vh` = 视口高度 |
| `vmin` | vw 和 vh 中较小值的 1% | 移动端横竖屏适配 |
| `vmax` | vw 和 vh 中较大值的 1% | 同上 |

```css
/* rem 示例：响应式字体 */
html { font-size: 16px; }
@media (max-width: 768px) {
  html { font-size: 14px; }
}
h1 { font-size: 2rem; } /* 桌面32px，移动28px */
p { font-size: 1rem; }

/* vw 示例：流体字体 */
h1 {
  font-size: clamp(24px, 5vw, 48px);
  /* 最小24px，随视口增长，最大48px */
}

/* em 示例：相对于自身 font-size */
p { font-size: 16px; line-height: 1.5em; /* 24px */ }
p strong { font-size: 1.25em; /* 16*1.25=20px */ }

/* vmin/vmax 示例：全屏容器 */
.hero {
  width: 100vmin; /* 宽高较小的那个的100% */
  height: 100vmin;
}
```

### 3.2 px 为什么不是绝对单位

传统认为 px 是"绝对单位"是因为它映射到屏幕物理像素。然而在现代显示设备上：

1. **设备像素比（DPR）**：`window.devicePixelRatio`，1 CSS px 可能对应 2 个或 3 个物理像素
   - iPhone Retina 屏幕：dpr=2，1 CSS px = 2 物理像素
   - 高分辨率屏幕：1 CSS px 可能跨越多个物理像素

2. **分辨率无关的真正绝对单位**：`cm`, `mm`, `in`, `pt`
   ```css
   .real-absolute {
     width: 1in; /* 在任何设备上物理上都是1英寸 */
     /* 但在屏幕上的实际像素取决于屏幕PPI */
   }
   ```
   这些单位基于物理尺寸（1in = 2.54cm），在屏幕上的渲染依赖屏幕 PPI，在屏幕上**也不是真正绝对**的。

3. **px 在屏幕上是相对的单位**：取决于输出介质的分辨率


## 4. 单位对比补充

### 4.1 rem / em / px 单位对比

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

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Introduction to the CSS box model](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_model/Introduction) | 盒模型最权威入门，四层结构与box-sizing定义清晰。 | 通读全文，用DevTools量一个div，画出content/padding/border/margin四层图。 |
| [CSS box sizing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_sizing) | 解释box-sizing为何改变宽度计算，面试高频追问点。 | 读content-box与border-box对比节，改一个固定宽度盒子，验证总宽度变化。 |
| [Mastering margin collapsing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_model/Margin_collapsing) | 外边距折叠是盒模型最易被问倒的细节，规范级解释。 | 读父子与兄弟折叠的触发条件，写三个小例子复现负margin下的折叠结果。 |
| [CSS 值与单位（CSS Values）](https://www.w3.org/TR/css-values-4/) | 长度单位定义与取值来源的权威依据，含全部相对单位。 | 查length一节，确认px是参考像素、vw/vh相对视口，再用DevTools核对rem计算值。 |
| [CSS 2 规范](https://www.w3.org/TR/CSS2/) | 块格式化上下文与外边距折叠的规范原文，回答原理层问题。 | 读视觉格式化模型中BFC与折叠小节，整理一份触发BFC的方式清单。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 盒模型简介](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model/Introduction_to_the_CSS_box_model) | 带任务的盒模型练习，直接落到公式与代码。 | 按任务切换box-sizing并测量尺寸，写下两种取值下宽度的计算公式。 |
| [web.dev Learn CSS：盒模型](https://web.dev/learn/css/box-model) | 以DevTools实操验证四层盒子，直观且可复现。 | 审查任意元素，对照本章逐项核对content到margin，做成截图对照表。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [web.dev Learn CSS](https://web.dev/learn/css) | 体系化CSS课程，盒模型与单位章节节奏适合补基础。 | 先读层叠继承与盒模型两章，每章写一个最小可复现例子并解释结果。 |
| [CSS for JavaScript Developers](https://css-for-js.dev/) | 补齐CSS心智模型，专治盒模型与单位凭感觉写的问题。 | 读布局与单位模块并完成配套项目，再用rem重写一遍所有尺寸。 |
| [Josh Comeau：理解布局算法](https://www.joshwcomeau.com/css/understanding-layout-algorithms/) | 用布局算法心智模型解释盒模型行为，理解更深一层。 | 读完后用文中模型解释一次自己写错的布局，写下原因与修正做法。 |
| [Kevin Powell](https://www.youtube.com/@KevinPowell) | 视频讲解直观，盒模型与长度单位主题有大量实操演示。 | 挑盒模型、单位相关视频观看，暂停后自己复刻示例并对比结果差异。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格 | border-box 宽度计算、padding 与列宽 | 虚拟滚动 + `table-layout: fixed` | 单元格左右 padding 相加会挤掉内容宽度 |
| 低端安卓的首屏加载 | rem 与 vw、视口单位 | 服务端渲染 + `clamp()` | 根字号放大后行高与点击区要一起放大 |
| 多人协作白板 | 盒模型四层区域、offset 系列属性 | Canvas 叠加 DOM 批注层 | 外框尺寸把边框与内边距算在内 |
| 移动端登录注册页 | padding 与 border-box、vh | 独立输入组件 | 地址栏收起时 `vh` 与实际可视高度不一致 |
| 导出 PDF 的月度报表 | pt 与 px 的换算、页边距 | 打印样式表 `@page` | 打印样式不解析 `vh` 与 `vw` |
| 响应式营销落地页 | vw、vmin、rem | CSS 变量 + 媒体查询 | 用 `vmin` 控制正方形元素不会溢出窄屏 |
| 富文本编辑器正文区 | 外边距折叠、盒模型高度 | `contenteditable` + ResizeObserver | 相邻块的外边距折叠会改变实际占用高度 |
| 设计系统的组件尺寸 | em 相对父级字号、rem 相对根字号 | design token + CSS 变量 | `em` 嵌套多层会累乘 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格列宽失控

**业务背景**：运维后台的订单表默认一页 100 行，字段 20 列以上，列宽靠内容自己撑。运营把浏览器字号调大一档后，列宽跳动，表格出现横向滚动条。

**怎么用本页知识解决**：先把宽度口径统一到外框，再用固定表格布局锁住列宽。

```css
/* 1. 宽度计算包含内边距与边框，列宽可预测 */
*,
*::before,
*::after { box-sizing: border-box; }

/* 2. 固定表格布局，列宽由首行与 col 决定，内容撑不开 */
.data-table { table-layout: fixed; width: 100%; }

/* 3. 字号挂到根字号上，整表一起缩放 */
.data-table td { padding: 4px 8px; font-size: 0.875rem; }

/* 4. 单元格只留一行，行高固定 */
.data-table td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 5. 表头吸顶，高度写死，偏移量才可预测 */
.data-table thead th { position: sticky; top: 0; height: 36px; }
```

- `box-sizing: border-box` 把内边距与边框算进声明宽度，列宽不再随 padding 变化。
- `table-layout: fixed` 让列宽由宽度声明决定，内容再长也不会把列撑开。
- 字号改成 rem 后，调一次根字号整张表一起缩放，不用逐列改 px。
- 省略号三件套保证单元格只有一行，行高稳定，吸顶表头的偏移量可算。
- 表头高度写死，是为了配合 `position: sticky` 的偏移计算。

**怎么度量收益**：看首屏的 Recalculate Style 与 Layout 耗时、滚动帧率。工具用 Chrome DevTools 的 Performance 面板录制 10 秒滚动，数 Frames 里超过 16.7ms 的帧；再用 Lighthouse 移动端跑一次。测量方法：同一台机器、同一网络节流、同一份 100 行数据各测 3 次取中位数。

**什么时候不该用**：

- 地址、备注这类列不能截断时，fixed 会把内容挤在一格宽度里，该保留自动布局或改成横向滚动。
- 表格只有 5 到 10 行且列数少，改 fixed 要多写一遍 col 宽度，维护成本换不到收益。
- 列宽需要随内容自动适应的看板表格，不要套这套写法。

#### 场景 2：低端安卓的首屏加载

**业务背景**：商品详情页要在千元机上打开，首屏被主图与标题占满。设计稿按 375px 宽交付，到 320px 宽与折叠屏上，标题换行数与图片高度都对不上。

**怎么用本页知识解决**：把字号与内边距挂到根字号上跟着视口缩放，首屏高度改用最小视口单位。

```html
<style>
  /* 1. 根字号跟随视口宽度，上下限避免极端屏宽下字过小或过大 */
  html { font-size: clamp(14px, 3.8vw, 18px); }
  /* 2. 首屏用 svh，取最小视口高度，地址栏展开时不溢出 */
  .hero { min-height: 60svh; padding: 1rem 1.25rem; }
  /* 3. 卡片声明 border-box，宽度即外框，内边距不做减法 */
  .card { box-sizing: border-box; border: 1px solid #e0e0e0; padding: 1rem; }
  /* 4. 图片容器声明宽高比，高度跟着宽度走 */
  .cover { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
</style>
```

- `clamp()` 给最小值、首选值、最大值三段，视口宽在中间区间时字号连续变化。
- `svh` 取的是最小视口高度，地址栏展开时首屏容器不会被推出屏幕。
- `box-sizing: border-box` 让 1px 边框与内边距算在声明宽度内，卡片在窄屏不溢出。
- `aspect-ratio` 由宽度算高度，图片没加载完时容器已有高度，后面内容不跳动。

**怎么度量收益**：看 Largest Contentful Paint、Cumulative Layout Shift、首屏 CSS 传输体积。工具用 Lighthouse 移动端默认节流、Chrome DevTools 的 Network 面板看 Transfer Size、Performance 面板看 Layout Shift 标记。测量方法：320px、375px、414px 三个宽度各跑一次 Lighthouse 移动端，把三份记录放在一起。

**什么时候不该用**：

- 页面嵌在固定高度的 iframe 里，视口单位取的是 iframe 的视口，`svh` 会算错，该用百分比或读容器高度。
- 设计走查要求字号与设计稿逐像素对齐时，根字号跟视口缩放会让字宽对不上，该锁死根字号。
- 内容需要放到 200% 才看清的用户，vw 主导的根字号会与浏览器缩放叠加，字会放得过大。

#### 场景 3：多人协作白板上的批注层错位

**业务背景**：白板用 Canvas 画图形，再用绝对定位的 DOM 元素挂批注框与光标。画布能缩放和拖动，缩放后批注框的位置偏移几个像素，几十人同时编辑时别人也能看到这个偏移。

**怎么用本页知识解决**：屏幕坐标先减画布原点，再除以缩放比，得到画布坐标；命中判定与绘制共用同一份宽高。

```js
// 1. 外框尺寸：rect 的宽高已包含边框与内边距
const rect = node.getBoundingClientRect();
// 2. 画布原点每次拖动都会变，同一帧内取一次
const boardRect = board.getBoundingClientRect();
// 3. 画布维护的缩放比，屏幕距离除以它得到画布距离
const scale = board.scale;
// 4. 换算左上角落点，得到画布坐标系里的位置
const x = (rect.left - boardRect.left) / scale;
const y = (rect.top - boardRect.top) / scale;
// 5. 命中框与绘制矩形口径一致，避免点不中
const hitBox = { x, y, w: rect.width / scale, h: rect.height / scale };
```

- `getBoundingClientRect()` 返回的是外框，宽高把边框与内边距算在内。
- 画布原点会随拖动变化，`boardRect` 不能缓存上一帧的值。
- 除以 `scale` 把屏幕距离换成画布距离，缩放比由画布自身维护。
- 命中判定与绘制共用 `hitBox`，两侧口径一致才不会出现点不中的情况。
- 读取放在 `requestAnimationFrame` 里，拖动回调中不重复触发布局计算。

**怎么度量收益**：看拖动 10 秒内超过 16.7ms 的帧数、批注框与图形边缘的偏移像素。工具用 Chrome DevTools 的 Performance 面板录制拖动过程看 Frames 行，在 `requestAnimationFrame` 里打点记录每帧耗时。可复现方法：同一份含 200 个批注的测试文档，从 100% 缩放到 300% 再拖回，记录偏移像素。

**什么时候不该用**：

- 批注节点用 CSS `transform` 做位移时，`getBoundingClientRect()` 返回变换后的值，该读 `offsetLeft` 这类布局属性。
- 节点上跑着入场动画，每帧矩形都在变，此时不要把矩形写进协作数据，等动画结束再取。
- 白板只有本地单人使用、不做同步时，偏差不会被放大，可以不引入这套换算。

### 行业先进实践

**全局 `box-sizing: border-box` 重置（出处：MDN Web Docs 的 `box-sizing` 条目）**
做法是在通配选择器与两个伪元素上把 box-sizing 设为 border-box。这样声明宽度就等于外框宽度，内边距与边框不用再心算。借鉴方式：写进项目 reset 文件，评审时检查组件有没有改回 content-box。

**Bootstrap 的栅格槽宽（出处：Bootstrap 官方文档的 Grid 章节）**
做法是列用左右 padding 留槽，行用负 margin 抵消两端多出的 padding。因为 padding 在盒子内部，列的百分比宽度不受槽宽影响。借鉴方式：自研栅格照这套写，不要用 margin 挤列宽。

**`aspect-ratio` 取代 padding-top 百分比占位（出处：MDN Web Docs 的 `aspect-ratio` 条目）**
做法是直接声明宽高比，高度由宽度按比例算出。旧写法靠 padding-top 百分比撑高，还要额外处理内部绝对定位层。借鉴方式：图片、视频、骨架屏容器统一换过来。

**逻辑属性写盒模型（出处：MDN Web Docs 的 CSS Logical Properties and Values 条目）**
做法是用 `padding-inline`、`margin-block`、`inset-inline-start` 代替 left/right 方向的属性。书写方向换成竖排时，盒子尺寸代码不用改。借鉴方式：新组件先按逻辑属性写，上线前用 RTL 语言核一遍。

**视口单位的三个高度档位（出处：MDN Web Docs 的 viewport units 条目）**
`svh` 取最小视口，`lvh` 取最大视口，`dvh` 跟随地址栏变化。首屏容器用 `svh`，地址栏展开时不会被推出屏幕，需要跟着收缩的浮层用 `dvh`。借鉴方式：替换现有 `100vh` 之前，先核对目标浏览器对这三个单位的支持范围。

### 从学到用：落地路线

1. **试点**：挑一个后台表格页，做全局 border-box 与 `table-layout: fixed`。验收标准：DevTools 盒模型面板能逐层核对，列宽之和等于表格宽度。
2. **验证**：用 Lighthouse 移动端与 DevTools Performance 各测一次改造前后。验收标准：两份记录写进同一个 MR，同事按同样步骤能测出接近的数字。
3. **推广**：把 reset 样式与栅格写法放进样式基座，其余页面按模块替换。验收标准：基座改动有提交记录，替换过的页面在 320px 宽无横向滚动条。
4. **防回退**：加 Stylelint 规则与评审清单，拦住单独改 box-sizing 的新组件。验收标准：CI 能拦住一次故意提交的违规改动。

### 动手作业

**目标**：给一个订单列表页做盒模型与长度单位改造，留下两份可复现的测量记录。

**步骤**：

1. 选一个 200 行以上、列数 10 列以上的表格页，导出一份 100 行的测试数据。
2. 用 Lighthouse 移动端与 DevTools Performance 各测一次，把 FCP、LCP、Layout 耗时抄进表格。
3. 在 reset 文件里加 border-box 全局设置，刷新页面确认没有元素被撑破。
4. 给表格加 `table-layout: fixed` 与 col 宽度，长文本用省略号截断。
5. 把表格内的 px 字号与内边距改成 rem，根字号用 `clamp()` 限定区间。
6. 把页面上的 padding-top 图片占位换成 `aspect-ratio`。
7. 重跑第 2 步的测量，把两份数字并列写进 MR 描述。

**验收标准**：

1. DevTools 盒模型面板能逐层核对任意一列的 content、padding、border、margin 四层数值。
2. 320px、768px、1280px 三个宽度下页面没有横向滚动条。
3. MR 里有两份测量记录，含工具名、指标名、测试数据行数与网络节流设置。
4. reset 文件的改动有评审意见，CI 的 Stylelint 检查通过。
5. 改造后的 LCP 数字不高于改造前。

