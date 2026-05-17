---
title: CSS 深入掌握（一）：盒模型 / BFC / IFC·GFC·FFC / Position / Flexbox
description: 深入掌握 CSS 盒模型、BFC、格式化上下文、Position、Flexbox 等核心知识点。
tags:
  - css
  - layout
date: 2026-05-17
---

# CSS 深入掌握（一）：盒模型 / BFC / IFC·GFC·FFC / Position / Flexbox

> 本文档为前端面试 CSS 系列扩展文档，涵盖盒模型、BFC、格式化上下文、Position、Flexbox 共 5 个核心主题，每个主题含定义、原理图、代码示例、对比表、避坑指南及面试题。

---

## 目录

1. [盒模型（Box Model）](#1-盒模型box-model)
2. [margin 塌陷与 BFC](#2-margin-塌陷与-bfc)
3. [IFC / GFC / FFC](#3-ifcgfcffc-格式化上下文)
4. [position 属性](#4-position-属性)
5. [Flex 布局](#5-flex-布局)

---

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

---

## 2. margin 塌陷与 BFC

### 2.1 定义

**Margin Collapse（外边距合并）**：在块级盒子垂直方向上，相邻元素的 margin 会发生合并，最终间距取两者较大值（而非相加），这个现象称为 margin collapse。

**BFC（Block Formatting Context，块级格式化上下文）**：BFC 是 CSS 页面渲染的一个隔离机制，是一块独立的渲染区域，内部的布局不受外部影响，反之亦然。创建 BFC 可以阻断 margin 合并、包含浮动。

### 2.2 margin collapse 三条核心规则

#### 规则一：相邻兄弟块级元素垂直 margin 合并

```
上方元素: margin-bottom: 50px
下方元素: margin-top:    30px
实际间距 = max(50, 30) = 50px（合并取大值）
```

#### 规则二：父子块级元素（父元素没有 padding/border/inline-content 隔开时）上/下 margin 合并

```
父元素: margin-top: 20px
子元素: margin-top: 40px
实际间距 = max(20, 40) = 40px（子元素 margin "穿透"父元素）
```

#### 规则三：单个元素上下 margin 合并（取大值）

```
元素A: margin-top: 100px; margin-bottom: 60px;
实际间距 = max(100, 60) = 100px
```

### 2.3 BFC 创建条件（满足任一即可）

| 触发条件 | 推荐指数 | 说明 |
|---------|---------|------|
| 根元素 `<html>` | 默认 | 页面根节点天然创建 BFC |
| `float` 不为 none | 中 | 会带来浮动副作用 |
| `position: absolute / fixed` | 高 | 定位元素创建 BFC |
| `display: inline-block / table-cell / table-caption` | 中 | 行内块化 |
| `display: flex / grid` 子元素 | 高 | FFC/GFC 自动创建 |
| `overflow` 不为 visible | 高（最常用） | `hidden/auto/scroll` |
| `display: flow-root` | 高（推荐） | 纯 BFC，无副作用 |
| `contain: layout / content / paint` | 低 | contain 属性 |

### 2.4 BFC 三大使用场景

#### 场景 A：清除浮动（父元素高度塌陷）

```
未创建 BFC：                    创建 BFC 后：
+-------------------------+    +-------------------------+
| float-left  | float-left|    | float-left  | float-left|
| (不占高度，父塌陷)        |    | (参与高度计算，父容器被撑开)|
+-------------------------+    +-------------------------+
```

```css
/* 方法一：overflow 触发 BFC（最常用） */
.parent {
  overflow: hidden; /* 或 auto / scroll */
}

/* 方法二：display: flow-root（推荐，最干净） */
.parent {
  display: flow-root;
}

/* 方法三：clearfix 伪元素 */
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}
```

#### 场景 B：阻止 margin 合并

```css
/* 父子 margin 穿透问题：给父元素创建 BFC */
.parent {
  display: flow-root; /* 阻止子元素 margin 与父元素合并 */
}

/* 相邻元素 margin 合并：给任一元素创建 BFC */
.child-1 {
  display: flow-root; /* 与 .child-2 的 margin 不再合并 */
}
```

#### 场景 C：多栏布局（与浮动元素互不重叠）

```css
.container {
  display: flow-root; /* 形成 BFC，不与浮动元素重叠 */
}
```

### 2.5 display: flow-root vs overflow 方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| `display: flow-root` | 无副作用，纯创建 BFC，语义清晰 | 较新（旧版 IE 不支持） |
| `overflow: hidden/auto` | 兼容性好，老项目常用 | 可能裁剪内部内容、隐藏溢出 |
| `overflow: visible` | 无 | 无法创建 BFC |
| `float: left` | 简单 | 副作用多，不推荐 |
| `clearfix::after` | 兼容好，语义可控 | 需额外元素，维护成本高 |

### 2.6 React / Next.js / TS 代码示例

```tsx
// 使用 flow-root 解决浮动和 margin 合并问题
// components/FloatContainer.tsx

interface FloatContainerProps {
  children: React.ReactNode;
}

export function FloatContainer({ children }: FloatContainerProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flow-root', // 纯 BFC，无 overflow 副作用
  };
  return <div style={containerStyle}>{children}</div>;
}

// BFC 创建工具函数
function canCreateBFC(props: {
  float?: string;
  position?: string;
  overflow?: string;
  display?: string;
}): boolean {
  const { float, position, overflow, display } = props;
  return (
    (float && float !== 'none') ||
    (position === 'absolute' || position === 'fixed') ||
    (overflow !== undefined && overflow !== 'visible') ||
    display === 'flow-root' ||
    ['flex', 'grid', 'inline-block', 'table-cell'].includes(display || '')
  );
}

// 防 margin 合并的 Card 组件（用 padding 替代 margin）
interface CardProps {
  children: React.ReactNode;
  gap?: number; // 用 gap 代替子元素 margin
}

export function Card({ children, gap = 16 }: CardProps) {
  return (
    <div
      style={{
        display: 'flow-root',        // 阻止 margin 塌陷穿透
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: gap,                // 用 padding 代替 margin 做间距
      }}
    >
      {children}
    </div>
  );
}
```

### 2.7 面试题

**Q1: 什么是 BFC？如何触发 BFC？列举至少 4 种方式。**

> 参考答案：BFC 是块级格式化上下文，是页面中独立的渲染区域。触发方式：① 根元素；② `float` 不为 none；③ `position: absolute/fixed`；④ `display: inline-block/flex/grid/table-cell`；⑤ `overflow` 不为 visible；⑥ `display: flow-root`（推荐）。

**Q2: 父子元素的 margin-top 为什么会合并？如何阻止？**

> 参考答案：这是 BFC 中的默认行为（规则二），当父元素没有 padding-top、border-top 或内联内容（文字）隔开父子 margin 时，子元素的 margin-top 会和父元素的 margin-top 合并，实际表现为子元素 margin"穿透"到父元素外面。解决方法：① 给父元素设置 `overflow: hidden`（或 `auto`）；② 使用 `display: flow-root`；③ 给父元素设置 padding-top 或 border-top；④ 使用 `display: flex`（FFC 自动创建独立上下文）。

**Q3: `display: flow-root` 相比 `overflow: hidden` 清除浮动有什么优势？**

> 参考答案：① `overflow: hidden` 会裁剪超出的内容（使用 `transform` 等时会出现问题），而 `flow-root` 不改变溢出行为；② `flow-root` 语义更清晰，专门为创建 BFC 而设计；③ `overflow` 的副作用（裁剪、出现滚动条）在布局中往往是意外的，而 `flow-root` 是"零副作用"的 BFC 方案。

---

## 3. IFC / GFC / FFC（格式化上下文）

### 3.1 定义

格式化上下文（Formatting Context, FC）是 CSS 渲染引擎中的概念，指一块渲染区域，该区域有一套渲染规则，决定了其子元素如何定位以及与其他元素的相互作用。

| 缩写 | 全称 | 触发条件 | CSS 版本 |
|------|------|---------|---------|
| BFC | Block Formatting Context（块级格式化上下文） | 块级容器 | CSS 2.1 |
| IFC | Inline Formatting Context（行内格式化上下文） | 块容器内只有行内元素 | CSS 2.1 |
| FFC | Flex Formatting Context（弹性盒格式化上下文） | `display: flex / inline-flex` | CSS 3 |
| GFC | Grid Formatting Context（网格格式化上下文） | `display: grid / inline-grid` | CSS 3 |

### 3.2 IFC（行内格式化上下文）

**触发条件**：块容器（块级元素）内部**不包含**任何块级盒子，即全是行内盒子。

**布局规则**：
- 行内元素从左到右水平排列，超出一行自动换行
- 每行生成一个 **Line Box（行盒）**，高度由内部实际高度最高的元素决定
- 垂直方向的 `padding` / `margin` 不撑开 Line Box 高度
- 水平方向对齐由 `text-align` 控制，默认 `left`
- 垂直方向对齐由 `vertical-align` 控制，默认 `baseline`
- 浮动元素会扰乱 Line Box 的左右贴紧特性

```
+------------------+  ← Line Box（行盒）
| 行内元素1 | 行内元素2 |  ← 水平排列
| 行内元素3 |        |
+------------------+

ASCII 布局图：
|←——————— container width ——————————→|
|+-line box 1----------------------------+|
|| [span1] [span2] [span3]              ||
|+----------------------------------------+|
|+-line box 2----------------------------+|
|| [span4]                               ||
|+----------------------------------------+|
```

### 3.3 GFC（网格格式化上下文）

**触发条件**：`display: grid` 或 `display: inline-grid`。

**核心概念**：
- **Grid Container（网格容器）**：设置了 `display: grid` 的元素
- **Grid Lines（网格线）**：构成网格的水平和垂直线，从 1 开始编号
- **Grid Tracks（网格轨道）**：两条相邻网格线之间的区域（行/列）
- **Grid Cell（网格单元格）**：行×列交叉区域
- **Grid Area（网格区域）**：由多条网格线围成的矩形区域

```
           列网格线 1    2     3     4
                 |-----|-----|-----|
行网格线 1        | A   | B   | C   |
                 |-----|-----|-----|
行网格线 2        | D   | E   | F   |
                 |-----|-----|-----|

grid-template-columns: 1fr 1fr 1fr;  /* 三列等宽 */
grid-template-rows: auto auto;        /* 两行自动高度 */
```

### 3.4 FFC（弹性盒格式化上下文）

**触发条件**：`display: flex` 或 `display: inline-flex`。

**核心概念**：
- **主轴（Main Axis）**：默认水平，从左到右
- **交叉轴（Cross Axis）**：默认垂直，从上到下
- **主轴起点/终点**：`main start` / `main end`
- **Flex Container**：弹性容器
- **Flex Item**：弹性项目，容器内的直接子元素

```
主轴方向（默认 row）：
←—————————— main axis ——————————→
|  [item1] | [item2] | [item3] |  → main end
↑
cross start（交叉轴起点）

flex-direction 变化：
row-reverse: ←——————— main axis ——————————→
column:      ↓
             cross axis（向下）
             main end
```

### 3.5 四种 FC 对比表

| 特性 | BFC | IFC | FFC | GFC |
|------|-----|-----|-----|-----|
| **触发方式** | 块级容器 | 块容器内只有行内元素 | display:flex/inline-flex | display:grid/inline-grid |
| **排列方向** | 垂直（从上到下） | 水平（从左到右） | 由 flex-direction 决定 | 由 grid-template 决定 |
| **对齐方向** | 水平填满容器 | 水平对齐 | 主轴 + 交叉轴双重对齐 | 行 + 列双重对齐 |
| **换行行为** | 独占一行 | 自动换行（Line Box） | 由 flex-wrap 决定 | 由 grid-template 决定 |
| **浮动影响** | BFC 内参与高度计算 | 受浮动扰乱 | 不受影响 | 不受影响 |
| **margin 合并** | 同 BFC 内合并 | 不合并 | 不合并 | 不合并 |
| **CSS 版本** | CSS 2.1 | CSS 2.1 | CSS 3 | CSS 3 |

### 3.6 React / Next.js 代码示例

```tsx
// IFC 示例：文本行内布局
// components/InlineText.tsx
export function InlineText() {
  return (
    <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
      {/* 块级容器 div 内部只有文字节点 → IFC */}
      普通文本&nbsp;
      <span style={{ verticalAlign: 'super', fontSize: '10px' }}>上标</span>
      &nbsp;
      <strong>加粗</strong>
      &nbsp;
      <a href="#" style={{ color: 'blue' }}>链接</a>
    </div>
  );
}

// FFC 示例：Flex 弹性布局
// components/FlexGallery.tsx
export function FlexGallery() {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',       // 超出换行
        gap: '16px',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            flex: '1 1 200px', // grow=1, shrink=1, basis=200px
            minWidth: '150px',
            height: '120px',
            background: `hsl(${i * 50}, 70%, 60%)`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
          }}
        >
          Item {i}
        </div>
      ))}
    </div>
  );
}

// GFC 示例：Grid 网格布局
// components/GridLayout.tsx
export function GridLayout() {
  return (
    <div
      style={{
        display: 'grid',
        // repeat(auto-fit, minmax(200px, 1fr)) 实现自动响应式列
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gridTemplateRows: 'auto',
        gap: '16px',
        padding: '16px',
      }}
    >
      {/* 使用命名网格线 */}
      {['header', 'sidebar', 'main', 'footer'].map((area) => (
        <div
          key={area}
          style={{
            background: area === 'main' ? '#f5f5f5' : '#e8e8e8',
            padding: '20px',
            textAlign: 'center',
            borderRadius: '4px',
            fontWeight: 'bold',
            textTransform: 'capitalize',
          }}
        >
          {area}
        </div>
      ))}
    </div>
  );
}
```

### 3.7 面试题

**Q1: BFC、IFC、GFC、FFC 分别是什么？它们分别由什么 CSS 属性触发？**

> 参考答案：BFC 是块级格式化上下文，IFC 是行内格式化上下文（块容器内只有行内盒子时触发），GFC 是网格格式化上下文（`display: grid`），FFC 是弹性盒格式化上下文（`display: flex`）。CSS 2.1 只有 BFC 和 IFC，GFC/FFC 是 CSS 3 新增的。

**Q2: IFC 中垂直方向的 padding/margin 为什么撑不开 Line Box 的高度？有什么替代方案？**

> 参考答案：IFC 的 Line Box 高度由内部行内元素中**实际高度最高**的元素决定，padding/margin 的垂直部分不计入。替代方案：① 使用 `line-height` 控制行高；② 使用 `vertical-align: top/bottom/middle` 调整垂直对齐；③ 用 `display: inline-block` 包裹块级内容来控制高度。

**Q3: 为什么说 GFC 和 FFC 比传统 BFC 更适合做复杂布局？**

> 参考答案：BFC 本质是块级元素垂直排列的一维布局，而 GFC（网格）和 FFC（弹性）提供了二维布局能力：GFC 可以同时控制行和列（`grid-template`），FFC 可以灵活控制主轴/交叉轴对齐和换行行为。此外，GFC/FFC 的子元素天然不受浮动影响，不需要额外 BFC 处理，是现代 CSS 布局的核心工具。

---

## 4. position 属性

### 4.1 五种 position 值

| 值 | 中文 | 是否脱离文档流 | 参照物 | 典型场景 |
|----|------|-------------|--------|---------|
| `static` | 静态定位 | 否 | 正常文档流位置 | 默认，无定位需求时 |
| `relative` | 相对定位 | 否（占位） | 自身原位置 | 微调元素位置、作为子绝父相的参照 |
| `absolute` | 绝对定位 | 是（不占位） | 最近已定位祖先 / body | 弹窗、Tooltip、下拉菜单 |
| `fixed` | 固定定位 | 是（不占位） | 视口（Viewport） | 固定导航栏、回到顶部按钮 |
| `sticky` | 粘性定位 | 否（占位）→固定 | 滚动容器的可视区域 | 吸顶导航、侧边栏跟踪 |

### 4.2 包含块（Containing Block）规则

**定义**：绝对定位元素相对于其"包含块"进行偏移。包含块是 position 不为 static 的最近祖先元素。

```
Containing Block 确定规则：

position: static / relative
  → 包含块 = 块级父元素（正常文档流中的最近块级祖先）

position: absolute
  → 包含块 = 最近的定位祖先（position 不为 static）
  → 若没有定位祖先 → 相对于 <html>（初始包含块）

position: fixed
  → 包含块 = 视口（viewport）（不受滚动影响）
  → 注意：若祖先有 transform/perspective/filter，fixed 相对于该祖先

position: sticky
  → 包含块 = 最近的滚动祖先（overflow 不为 visible 的祖先）
  → 若没有滚动祖先 → 相对于视口
```

### 4.3 堆叠上下文（Stacking Context）原理

**z-index 生效条件**：`z-index` 只对**定位元素**（position 不为 static）有效。

**Stacking Context 创建条件（满足任一）**：
- 根元素 `<html>`
- `position: relative/absolute` + `z-index` 不为 auto
- `position: fixed / sticky`
- Flex 项目 + `z-index` 不为 auto
- `opacity < 1`
- `transform / filter / perspective`（非 none 值）
- `contain: layout / paint`
- `mix-blend-mode` 不为 normal

**层叠顺序（从底到顶）**：

```
层叠顺序（数值越小越靠下）：
1. 负 z-index 的定位元素（在最低层）
2. 未定位块级元素（z-index: auto 的 static 元素）
3. 浮动元素
4. 未定位行内元素
5. z-index: auto / 0 的定位元素
6. 正 z-index 的定位元素（最顶层）
```

### 4.4 ASCII 堆叠示意图

```
视口（Viewport）
+------------------------------------------+
|  z-index: 10  (fixed header)            |  ← 层叠顶层
|  +-----------------------------------+  |
|  |  z-index: 5   (modal dialog)       |  |
|  |  +------------------------------+  |  |
|  |  |  z-index: 2 (dropdown)       |  |  |
|  |  +------------------------------+  |  |
|  +-----------------------------------+  |
|  z-index: 0  (普通内容块)                 |
|  浮动元素（float: left/right）            |
|  z-index: -1 (背景层/阴影层)              |
+------------------------------------------+
```

### 4.5 React / Next.js / TS 代码示例

```tsx
// components/StickyNav.tsx
// Sticky 粘性定位：滚动超过阈值后固定在顶部
export function StickyNav() {
  return (
    <nav
      style={{
        position: 'sticky',
        top: '0',           // 距顶部 0px 时触发粘性
        zIndex: 100,
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '12px 24px',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', gap: '24px' }}>
        {['首页', '产品', '关于', '联系'].map((item) => (
          <a key={item} href="#" style={{ textDecoration: 'none', color: '#333' }}>
            {item}
          </a>
        ))}
      </div>
    </nav>
  );
}

// components/Modal.tsx
// Absolute 定位：相对于父容器定位
// Fixed 定位：遮罩层相对于视口定位
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const dialogStyle: React.CSSProperties = {
    position: 'relative',  // 配合 z-index 创建新的堆叠上下文
    zIndex: 1001,
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    minWidth: '320px',
    maxWidth: '480px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 16px' }}>{title}</h2>
        <div>{children}</div>
        <button
          onClick={onClose}
          style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}

// TypeScript：定位类型定义
type PositionValue = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';

interface PositionConfig {
  position: PositionValue;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  zIndex?: number;
}

function resolveContainingBlock(
  element: HTMLElement
): HTMLElement | null {
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    const pos = window.getComputedStyle(current).position;
    if (pos !== 'static') return current;
    current = current.parentElement;
  }
  return null; // 相对于 html
}
```

### 4.6 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| 子元素 absolute 不生效（找不到定位祖先） | 父元素必须设 `position: relative`（或其他非 static） |
| `z-index: 999` 滥用导致层叠冲突 | 建立统一的 z-index 分层体系（base=0, nav=100, modal=1000, toast=2000） |
| `position: sticky` 在父容器 overflow: hidden 时失效 | 确保父容器不是 overflow: hidden 或 auto |
| `fixed` 定位在 transform 祖先上失效 | `transform` 会创建新的 containing block，使 fixed 相对于该元素定位 |
| 多层 absolute 嵌套导致定位混乱 | 使用 React Context 或 CSS 变量管理位置，避免深层嵌套 |

### 4.7 面试题

**Q1: `position: absolute` 和 `position: fixed` 的区别是什么？各自相对于什么定位？**

> 参考答案：absolute 相对于**最近已定位祖先元素**定位（若没有则相对于初始包含块 html）；fixed 相对于**视口（viewport）**定位，不随页面滚动而移动。两者都脱离文档流，但定位基准不同。补充：若 fixed 的祖先设置了 `transform`/`perspective`/`filter` 非 none 值，则 fixed 相对于该祖先而非视口定位（这是容易被忽视的陷阱）。

**Q2: 如何理解 CSS 的层叠上下文（Stacking Context）？什么情况下元素会创建新的层叠上下文？**

> 参考答案：层叠上下文是 HTML 元素在 Z 轴上的层叠顺序上下文。创建条件包括：根元素、定位+非 auto z-index、opacity<1、transform/filter/perspective 非 none、flex/grid 项目+z-index 非 auto 等。子元素的 z-index 只在父层叠上下文内比较，不会跨上下文比较——这是"z-index 失效"的常见原因。

**Q3: `position: sticky` 的生效条件是什么？为什么有时候不生效？**

> 参考答案：sticky 生效需满足：① 设置了 `top`/`bottom` 等偏移量（没有则等同于 relative）；② 最近的滚动祖先（overflow 不为 visible 的祖先）可滚动；③ 距离未达到阈值之前表现为 relative，超过阈值后表现为 fixed。常见不生效原因：父容器设置了 `overflow: hidden`（吞噬了滚动事件）、父容器高度不够、或没有设置偏移量。

---

## 5. Flex 布局

### 5.1 定义与背景

Flexbox（弹性盒布局）是 CSS 3 引入的一维布局模型，专门用于解决元素在容器中的对齐、方向、顺序和自适应的需求。核心概念：容器（Flex Container）和项目（Flex Item）。

### 5.2 容器属性（父元素）

| 属性 | 可选值 | 说明 |
|------|--------|------|
| `display` | `flex` / `inline-flex` | 设为 Flex 容器 |
| `flex-direction` | `row`（默认）/ `row-reverse` / `column` / `column-reverse` | 主轴方向 |
| `flex-wrap` | `nowrap`（默认）/ `wrap` / `wrap-reverse` | 是否换行 |
| `flex-flow` | `[flex-direction] [flex-wrap]` | 简写 |
| `justify-content` | `flex-start`（默认）/ `flex-end` / `center` / `space-between` / `space-around` / `space-evenly` | 主轴对齐 |
| `align-items` | `stretch`（默认）/ `flex-start` / `flex-end` / `center` / `baseline` | 交叉轴对齐（单行） |
| `align-content` | `flex-start` / `flex-end` / `center` / `space-between` / `space-around` / `stretch` | 交叉轴对齐（多行） |
| `gap` | `<length>` 或 `<percentage>` | 项目间距（无需 calc） |

### 5.3 项目属性（子元素）

| 属性 | 说明 |
|------|------|
| `order` | 排列顺序（默认 0，数值越小越靠前） |
| `flex-grow` | 放大比例（默认 0，不放大；>=1 时填满剩余空间） |
| `flex-shrink` | 缩小比例（默认 1，可缩小；0 表示不缩小） |
| `flex-basis` | 初始主轴尺寸（默认 auto，即项目本身尺寸） |
| `flex` | 简写：`flex-grow flex-shrink flex-basis` |
| `align-self` | 覆盖容器 align-items（单个项目） |

### 5.4 `flex: 1` 详解（最常见考点）

```css
/* flex: 1 的完整含义：*/
flex: 1 1 0%;
/*       ↑  ↑  ↑
   grow=1  shrink=1  basis=0%

含义：
1. 当有剩余空间时，项目等比例分配（grow=1）
2. 当空间不足时，项目等比例缩小（shrink=1）
3. 初始尺寸为 0（basis=0），所以每个项目分配到的空间是相等的
*/

/* 常见组合：*/
flex: 1;        /* 等分剩余空间 */
flex: auto;     /* flex: 1 1 auto → 项目原有尺寸基础上分配（常用） */
flex: none;     /* flex: 0 0 auto → 不伸缩，保持自身尺寸 */
flex: 0 0 200px; /* 固定 200px */
```

### 5.5 ASCII 轴向示意图

```
justify-content（主轴对齐）:
←———————————————————————————————————→
flex-start   center   flex-end   space-between
[ item ]                          [ item ]
[ item ]       [ item ]   [ item ]

align-items（交叉轴对齐）:
←———————————————————————————————————→
stretch    flex-start    center    baseline
[ item ]    [ item ]   [ item ]  [ item ]
[ item ]               [ item ]  [~~~~~~]  ← 基线对齐
（填满）

flex-wrap: wrap 行为:
row 方向，不够换行：
|←——————— container ———————→|
| [item1] [item2] [item3]    |
| [item4] [item5]            |
```

### 5.6 React / Next.js / TS 代码示例

```tsx
// components/FlexGrid.tsx
// 使用 flex-wrap 实现自动换行网格（类似 Grid 效果）
export function FlexGrid() {
  const items = [
    { id: 1, title: '卡片1', color: '#ff6b6b' },
    { id: 2, title: '卡片2', color: '#4ecdc4' },
    { id: 3, title: '卡片3', color: '#45b7d1' },
    { id: 4, title: '卡片4', color: '#96ceb4' },
    { id: 5, title: '卡片5', color: '#ffeaa7' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '16px',
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            flex: '1 1 200px',       // basis=200px，grow=1，shrink=1
            minWidth: '150px',      // 最小宽度保护
            maxWidth: '300px',
            height: '120px',
            backgroundColor: item.color,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '16px',
          }}
        >
          {item.title}
        </div>
      ))}
    </div>
  );
}

// 水平垂直居中（经典面试题）
// components/CenteredBox.tsx
export function CenteredBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',  // 主轴居中
        alignItems: 'center',     // 交叉轴居中
        minHeight: '200px',
        backgroundColor: '#f0f0f0',
      }}
    >
      {children}
    </div>
  );
}

// Sticky Footer 布局（经典 Flex 场景）
// components/StickyFooterLayout.tsx
export function StickyFooterLayout({
  header,
  main,
  footer,
}: {
  header: React.ReactNode;
  main: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <header style={{ flexShrink: 0 }}>{header}</header>
      <main style={{ flex: '1 1 auto' }}>{main}</main>
      {/* flex: 1 使 main 填满中间剩余空间，footer 始终贴底 */}
      <footer style={{ flexShrink: 0 }}>{footer}</footer>
    </div>
  );
}

// TypeScript 类型定义
interface FlexItemConfig {
  grow?: number;
  shrink?: number;
  basis?: string | number;
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
}

function resolveFlex(config: FlexItemConfig): string {
  const { grow = 0, shrink = 1, basis = 'auto' } = config;
  return `${grow} ${shrink} ${typeof basis === 'number' ? `${basis}px` : basis}`;
}
```

### 5.7 Flex vs Grid 对比表

| 维度 | Flexbox | CSS Grid |
|------|--------|----------|
| 维度 | 一维（主轴 OR 交叉轴） | 二维（行 AND 列） |
| 布局模式 | 沿主轴依次排列，超出换行 | 按网格线/区域定位 |
| 空间分配 | 内容驱动（content-first） | 容器驱动（container-first） |
| 换行行为 | `flex-wrap: wrap` | `grid-template-columns` + `auto-fill/fit` |
| 典型场景 | 导航栏、Card 列表、水平居中 | 页面整体布局、相册、表单 |
| 响应式 | 需要媒体查询配合 | `auto-fill/fit` 自动响应 |
| 对齐能力 | 主轴+交叉轴 | 行轴+列轴+单元格 |
| 学习曲线 | 较低 | 较高（概念更多） |

### 5.8 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| `flex: 1` 不生效 | 父元素必须设 `display: flex`，否则子元素不受影响 |
| 混淆 `align-items` 和 `align-content` | `align-items` 控制单行对齐，`align-content` 控制多行换行后对齐 |
| `flex-basis` 和 `width` 冲突 | `flex-basis` 优先于 `width`；在 `flex` 简写中 `width` 即 `basis` |
| `flex-grow` 不按预期填满 | 检查 `flex-basis`，若设为具体值则 grow 分配的是"剩余空间"而非"总空间" |
| 子元素变成 Flex Item（意外行为） | `display: flex` 会让**直接子元素**变成 Flex Item，深层元素不受影响 |

### 5.9 面试题

**Q1: `flex: 1` 的完整含义是什么？它和 `flex: auto` 有什么区别？**

> 参考答案：`flex: 1` = `flex: 1 1 0%`（grow=1, shrink=1, basis=0%）；`flex: auto` = `flex: 1 1 auto`（grow=1, shrink=1, basis=auto）。核心区别在 `basis`：0% 会使项目初始尺寸为 0，然后平等分配剩余空间（填满）；auto 会保留项目的原有内容尺寸，在此基础上分配剩余空间。常用场景：`flex: 1` 用于等分网格，`flex: auto` 用于自适应内容。

**Q2: `align-items` 和 `align-content` 的区别是什么？什么条件下 `align-content` 才生效？**

> 参考答案：`align-items` 作用于**单行**，控制所有项目在交叉轴上的对齐；`align-content` 作用于**多行**（即 `flex-wrap: wrap` 且项目换行后产生多行时），控制各行之间的间距分布。`align-content` 只在 `flex-wrap: wrap` 且交叉轴有剩余空间时生效。

**Q3: 如何用 Flex 实现 Sticky Footer（内容不足时页脚贴底，内容超出时随页面滚动）？**

> 参考答案：关键是中间内容区设置 `flex: 1 1 auto`（grow=1, shrink=1, basis=auto），而 header 和 footer 设置 `flex-shrink: 0`（不允许缩小）。这样当内容少时，main 的 `flex: 1` 会填满中间所有剩余空间，将 footer 推到页面底部；当内容多时，main 被撑开，footer 自然跟随在下方。

---

## 附录：参考资料

### 官方文档

| 资源 | 说明 |
|------|------|
| [MDN - CSS 盒模型](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Box_Model) | 盒模型详解 |
| [MDN - box-sizing](https://developer.mozilla.org/zh-CN/docs/Web/CSS/box-sizing) | box-sizing 属性 |
| [MDN - BFC 块格式化上下文](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Display) | BFC 定义 |
| [MDN - z-index 与层叠上下文](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Positioning/Understanding_z_index) | 层叠顺序 |
| [MDN - CSS Flexbox](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Flexible_Box_Layout) | Flexbox 布局 |
| [MDN - CSS Grid](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Grid_Layout) | Grid 布局 |

### 精选文章

| 资源 | 说明 |
|------|------|
| [腾讯云 - CSS 100道面试题](https://cloud.tencent.com/developer/article/2564400) | CSS 面试题汇总 |
| [CSDN - CSS 专题之 BFC](https://blog.csdn.net/m0_56326830/article/details/147133068) | BFC 详解 |
| [张鑫旭 - flow-root 详解](https://www.zhangxinxu.com/wordpress/?p=9404) | display:flow-root |
| [PHP中文网 - CSS @layer 级联层](https://www.php.cn/faq/490369.html) | CSS 级联层 |
| [W3Schools - Flexbox](https://www.w3schools.com/css/css3_flexbox.asp) | Flexbox 教程 |
| [Envato - CSS Grid 响应式](https://webdesign.tutsplus.com/tutorials/css-grid-layout-going-responsive--cms-27270) | Grid 响应式 |