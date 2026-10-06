---
title: Flex 布局
description: Flexbox 容器与项目属性、flex:1 的含义、grow/shrink/basis 与常见实战布局。
tags:
  - css
---

# Flex 布局


## 1. Flex 布局

### 1.1 定义与背景

Flexbox（弹性盒布局）是 CSS 3 引入的一维布局模型，专门用于解决元素在容器中的对齐、方向、顺序和自适应的需求。核心概念：容器（Flex Container）和项目（Flex Item）。

### 1.2 容器属性（父元素）

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

### 1.3 项目属性（子元素）

| 属性 | 说明 |
|------|------|
| `order` | 排列顺序（默认 0，数值越小越靠前） |
| `flex-grow` | 放大比例（默认 0，不放大；>=1 时填满剩余空间） |
| `flex-shrink` | 缩小比例（默认 1，可缩小；0 表示不缩小） |
| `flex-basis` | 初始主轴尺寸（默认 auto，即项目本身尺寸） |
| `flex` | 简写：`flex-grow flex-shrink flex-basis` |
| `align-self` | 覆盖容器 align-items（单个项目） |

### 1.4 `flex: 1` 详解（最常见考点）

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

### 1.5 ASCII 轴向示意图

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

### 1.6 React / Next.js / TS 代码示例

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

### 1.7 Flex vs Grid 对比表

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

### 1.8 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| `flex: 1` 不生效 | 父元素必须设 `display: flex`，否则子元素不受影响 |
| 混淆 `align-items` 和 `align-content` | `align-items` 控制单行对齐，`align-content` 控制多行换行后对齐 |
| `flex-basis` 和 `width` 冲突 | `flex-basis` 优先于 `width`；在 `flex` 简写中 `width` 即 `basis` |
| `flex-grow` 不按预期填满 | 检查 `flex-basis`，若设为具体值则 grow 分配的是"剩余空间"而非"总空间" |
| 子元素变成 Flex Item（意外行为） | `display: flex` 会让**直接子元素**变成 Flex Item，深层元素不受影响 |

### 1.9 面试题

**Q1: `flex: 1` 的完整含义是什么？它和 `flex: auto` 有什么区别？**

> 参考答案：`flex: 1` = `flex: 1 1 0%`（grow=1, shrink=1, basis=0%）；`flex: auto` = `flex: 1 1 auto`（grow=1, shrink=1, basis=auto）。核心区别在 `basis`：0% 会使项目初始尺寸为 0，然后平等分配剩余空间（填满）；auto 会保留项目的原有内容尺寸，在此基础上分配剩余空间。常用场景：`flex: 1` 用于等分网格，`flex: auto` 用于自适应内容。

**Q2: `align-items` 和 `align-content` 的区别是什么？什么条件下 `align-content` 才生效？**

> 参考答案：`align-items` 作用于**单行**，控制所有项目在交叉轴上的对齐；`align-content` 作用于**多行**（即 `flex-wrap: wrap` 且项目换行后产生多行时），控制各行之间的间距分布。`align-content` 只在 `flex-wrap: wrap` 且交叉轴有剩余空间时生效。

**Q3: 如何用 Flex 实现 Sticky Footer（内容不足时页脚贴底，内容超出时随页面滚动）？**

> 参考答案：关键是中间内容区设置 `flex: 1 1 auto`（grow=1, shrink=1, basis=auto），而 header 和 footer 设置 `flex-shrink: 0`（不允许缩小）。这样当内容少时，main 的 `flex: 1` 会填满中间所有剩余空间，将 footer 推到页面底部；当内容多时，main 被撑开，footer 自然跟随在下方。


## 2. 面试精讲：Flex 布局原理，flex:1 含义

### 2.1 Flex 布局基本概念

**Flex 容器与项目：**

```
+------------------------------------------+
|            flex container                |
|  +--------+ +--------+ +--------+        |
|  | flex-  | | flex-  | | flex-  |        |
|  | item 1 | | item 2 | | item 3 |        |
|  +--------+ +--------+ +--------+        |
+------------------------------------------+
```

**核心概念：**

| 概念 | 说明 |
|------|------|
| 主轴（main axis） | 默认水平，flex-direction 控制 |
| 交叉轴（cross axis） | 默认垂直，与主轴垂直 |
| main start / main end | 主轴的起点和终点 |
| cross start / cross end | 交叉轴的起点和终点 |

### 2.2 flex 容器属性

```css
.container {
  display: flex;

  /* 主轴方向 */
  flex-direction: row | row-reverse | column | column-reverse;

  /* 换行规则 */
  flex-wrap: nowrap | wrap | wrap-reverse;

  /* 方向 + 换行（简写） */
  flex-flow: row wrap;

  /* 主轴对齐 */
  justify-content: flex-start | flex-end | center |
                   space-between | space-around | space-evenly;

  /* 交叉轴对齐 */
  align-items: stretch | flex-start | flex-end | center | baseline;

  /* 多行对齐（flex-wrap: wrap 时生效） */
  align-content: flex-start | flex-end | center |
                 space-between | space-around | stretch;
}
```

### 2.3 flex item 属性

```css
.item {
  /* 分配剩余空间 */
  flex-grow: 0;   /* 默认0，不放大 */
  flex-shrink: 1; /* 默认1，可缩小 */
  flex-basis: auto; /* 初始基准尺寸 */

  /* flex 简写 */
  flex: 1;        /* = flex: 1 1 0% */
  flex: auto;     /* = flex: 1 1 auto */
  flex: none;     /* = flex: 0 0 auto */

  /* 单独对齐（覆盖 align-items） */
  align-self: auto | flex-start | flex-end | center | stretch | baseline;

  /* 排列顺序 */
  order: 0; /* 默认0，值越小越靠前 */
}
```

### 2.4 flex:1 详解

```css
.item { flex: 1; }
/* 完整展开：flex-grow: 1; flex-shrink: 1; flex-basis: 0%; */

/* flex-basis: 0% 的含义：
   不以内容为基准，直接从 0 开始分配剩余空间 */

/* flex: 2 = flex: 2 1 0%（占 2 份） */
/* flex: 1 = flex: 1 1 0%（占 1 份） */
/* flex: 1 和 flex: 2 的元素，比例约为 1:2 */

/* flex: 1 vs flex: auto 的区别：
   flex: 1  → flex-basis: 0%，从 0 开始分配
   flex: auto → flex-basis: auto，保留内容尺寸后再分配

   例子：两个 flex: 1 的元素，内容分别为 "Hello" 和 "Hi"
   flex: 1（0%基准）：各占 50%（从 0 开始平分）
   flex: auto（auto基准）：先保留各自内容宽度，剩余空间平分 */
```

### 2.5 flex-grow / shrink / basis 区别

| 属性 | 作用 | 默认值 | 数值含义 |
|------|------|--------|---------|
| `flex-grow` | 分配剩余空间 | 0 | 0=不分配；>0=按比例分配 |
| `flex-shrink` | 收纳溢出空间 | 1 | 0=不缩小；>0=按比例收缩 |
| `flex-basis` | 初始基准尺寸 | auto | auto=内容尺寸；固定值=固定宽度 |

```css
/* 分配剩余空间示例 */
.container { width: 600px; }
.item1 { flex-grow: 1; } /* 剩余 400px，获得 400px */
.item2 { flex-grow: 2; } /* 剩余 400px，获得 266.67px */

/* 收缩溢出空间示例 */
.container { width: 300px; }
.item1 { width: 200px; flex-shrink: 1; } /* 溢出 100px，贡献 50px */
.item2 { width: 400px; flex-shrink: 1; } /* 溢出 100px，贡献 50px */
/* 收缩量 = 溢出量 × (自身基准 / 所有基准之和) */
```

### 2.6 常见 Flex 布局实战

```css
/* 1. 水平居中 */
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 2. 导航栏 */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

/* 3. Sticky Footer（页面最小高度时，footer 贴底） */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.content { flex: 1; }

/* 4. 三栏等高布局 */
.columns {
  display: flex;
  gap: 20px;
}
.column { flex: 1; } /* 自动等高（align-items: stretch 默认） */
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [`flex` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/flex) | flex 简写的官方定义，flex:1 的展开规则以它为准 | 读语法与取值表，确认 flex:1 展开为 1 1 0%，再用 DevTools 看计算值验证 |
| [`<flex>` CSS type](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/flex_value) | 解释 flex-grow/shrink/basis 三值语义与省略写法 | 带着“flex:1、flex:auto、flex:none 差在哪”读，读完手写三种简写并推导 basis |
| [Controlling ratios of flex items along the main axis](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Controlling_flex_item_ratios) | 讲透 grow/shrink/basis 如何算出主轴最终尺寸 | 重点读 grow 与 shrink 分配算法小节，用两个不同 basis 的盒子手算一遍再写 demo |
| [Aligning items in a flex container](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Aligning_items) | 主轴与交叉轴对齐属性的完整梳理，含 align-self | 按 main/cross 轴整理属性表，写一个同时用 justify-content 与 align-items 的例子 |
| [Ordering flex items](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Ordering_items) | order 与视觉顺序、无障碍阅读顺序的差异说明 | 读 order 与键盘 tab 顺序段落，做一次键盘聚焦实验验证顺序未变 |
| [Mastering wrapping of flex items](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Wrapping_items) | flex-wrap 换行后尺寸与 align-content 生效的规则 | 读换行后 align-content 才生效的原因，写一个三行换行容器观察对齐变化 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Josh Comeau：交互式 Flexbox 指南](https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/) | 交互式演示 flex 尺寸计算，比静态图直观得多 | 逐个操作交互组件并先预测结果，读完用自己的话复述 flex:1 的分配过程 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [阮一峰：Flex 布局语法篇](https://www.ruanyifeng.com/blog/2015/07/flex-grammar.html) | 中文入门经典，容器与项目属性齐全且示例短小 | 按 6+6 属性清单通读，逐条写最小示例并跑一遍，形成自己的速查表 |

## 应用与行业实践

### 应用场景地图

下面这些场景都能在真实项目里对上号，先看地图，再挑三个拆开讲。

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格 | `flex: 1 1 0` 分配剩余宽度、`min-width: 0` 解除自动最小尺寸 | 原生 table 或 div 行 + 虚拟滚动库 | 行数上万时不要全量渲染 DOM，先看 DevTools 的 Layout 耗时 |
| 低端安卓的首屏骨架 | 纵向容器、头尾 `flex: 0 0 auto`、中间区 `flex: 1 1 0` | WebView 页面 + 100dvh | 移动端地址栏收放会改视口高度，用 dvh 并核对兼容性 |
| 多人协作白板 | 容器与项目的关系、剩余空间归属 | Canvas 或 SVG + 横向 flex 工作区 | 画布要跟着容器 resize 重设尺寸，注意 devicePixelRatio |
| 聊天页的消息列表与输入栏 | `align-items`、`flex: 0 0 auto` | 移动端 H5 消息流 | 输入栏高度变化后要把列表贴底，读 scrollHeight 后回写 scrollTop |
| 设计系统的按钮组 | `align-items: center`、`justify-content`、`gap` | React 组件库的 Button Group | 间距用 gap，避免 margin 叠加出双重间距 |
| 表单标签与输入框对齐 | `align-items: baseline`、`flex-wrap` | 表单组件库 Form / FormItem | 长标签换行会破坏对齐，给标签固定 `flex-basis` |
| 商品卡片列表等高 | 默认 `align-items: stretch`、内部再嵌纵向 flex | 卡片组件 + 瀑布或等宽网格 | 卡片底部按钮要贴底，必须让卡片自身成为纵向 flex 容器 |
| 后台侧边栏折叠 | `flex-basis` 切换加 transition | 布局组件 ProLayout 一类 | 动画作用在 flex-basis 上，不要同时写死 width |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：表格列数在 10 到 20 之间，其中备注列内容长度差异大，短则两三字，长则整段文本。行数在压测时用脚本生成到两万行，滚动时页面出现明显卡顿。

**怎么用本页知识解决**：把每一行做成 flex 容器，固定列用 `flex: 0 0` 写死宽度，弹性列用 `flex: 1 1 0` 分剩余宽度，再给弹性列加 `min-width: 0` 让省略号生效。

```css
.row {                        /* 表格每一行作为 flex 容器 */
  display: flex;
  align-items: center;        /* 单元格内容垂直居中对齐 */
}
.cell--id {
  flex: 0 0 88px;             /* 固定列宽，不参与伸缩 */
}
.cell--remark {
  flex: 1 1 0;                /* 剩余宽度全部给备注列 */
  min-width: 0;               /* 解除自动最小尺寸，内容才允许被压缩 */
  overflow: hidden;
  text-overflow: ellipsis;    /* 压缩后显示省略号 */
  white-space: nowrap;
}
```

- `flex: 0 0 88px` 三个值分别是 grow、shrink、basis，grow 为 0 表示不抢剩余空间。
- `flex: 1 1 0` 的 basis 写 0，列宽完全由剩余空间按比例切分，不掺内容宽度。
- `min-width: 0` 是关键一行，去掉它以后弹性列会被内容顶宽，省略号不出现。
- 行容器只负责水平分配，垂直对齐交给 `align-items`，两者不要混在一层写。
- 表头用同一套类名，列宽才能与数据行逐列对齐。

**怎么度量收益**：用 Chrome DevTools Performance 面板录制 10 秒匀速滚动，对比改前改后 Recalculate Style 与 Layout 两项的合计耗时。同时在 Console 里跑 `document.querySelectorAll('.row').length` 确认实际渲染的 DOM 行数。长任务用 `PerformanceObserver` 观察 `longtask` 条目数量。

**什么时候不该用**：需要行列严格对齐、且单元格会换行的报表，用 table 或 CSS Grid 更稳。行数上万时不要把全部行交给 flex 排布，必须先做虚拟滚动，只渲染视口内的行。

#### 场景 2：低端安卓的首屏加载

**业务背景**：页面在低端安卓机上打开时，顶栏和底部导航会随页面一起滚走，用户找不到入口。整页高度不确定，内容区有时撑不满一屏，有时超出一屏。

**怎么用本页知识解决**：整页做成一个纵向 flex 容器并锁死高度，顶栏底栏按内容高度不伸缩，中间区吃掉剩余高度并自己滚动。

```css
.page {
  display: flex;
  flex-direction: column;     /* 主轴改为纵向 */
  height: 100dvh;             /* 容器高度确定，伸缩才有参照 */
}
.topbar, .tabbar {
  flex: 0 0 auto;             /* 头尾按内容高度，不被压缩 */
}
.main {
  flex: 1 1 0;                /* 中间区吃掉全部剩余高度 */
  min-height: 0;              /* 解除自动最小高度，内部滚动才生效 */
  overflow-y: auto;
}
```

- 父容器高度必须是确定值，`height: 100dvh` 或 `100%` 皆可，不写高度时 `flex: 1` 没有可分配的空间。
- `flex: 0 0 auto` 表示按内容高度渲染，长标题挤压页面时头尾不会被压扁。
- `min-height: 0` 与场景 1 的 `min-width: 0` 是同一回事，只是换了轴向。
- 滚动只发生在 `.main` 上，页面本身不滚动，头尾自然固定。
- 需要兼容老 WebView 时把 dvh 换成 vh，并接受地址栏收放带来的高度跳变。

**怎么度量收益**：用 Lighthouse 移动端默认节流配置跑 5 次，取 Cumulative Layout Shift 的中位数。用 DevTools Rendering 面板打开 Layout Shift Regions，滚动页面观察头尾是否出现位移色块。再用 Performance 面板查看首屏的 Layout 次数。

**什么时候不该用**：页面设计就是整页滚动、不需要固定头尾时，套 flex 骨架会多一层无意义嵌套。内容区依赖系统键盘顶起时，固定 `100dvh` 可能与键盘弹起行为冲突。

#### 场景 3：多人协作白板

**业务背景**：白板左侧是宽度随按钮增减变化的工具栏，右侧画布要占满剩余区域。多人同时拖动图形时，画布尺寸与容器不匹配会出现鼠标坐标偏移。

**怎么用本页知识解决**：工作区做横向 flex，工具栏按内容宽度，画布容器用 `flex: 1 1 0` 拿剩余宽度，画布元素用绝对定位贴合容器。

```css
.workspace {
  display: flex;
  height: 100%;
}
.toolbar {
  flex: 0 0 auto;             /* 宽度由按钮内容决定 */
}
.canvas-wrap {
  flex: 1 1 0;                /* 占满剩余宽度 */
  min-width: 0;
  position: relative;         /* 给画布绝对定位提供参照 */
}
.canvas {
  position: absolute;         /* 贴合容器四边 */
  top: 0; left: 0; right: 0; bottom: 0;
}
```

- 工具栏不写死像素宽度，按钮增减时画布自动让出或收回空间。
- 画布容器加 `min-width: 0`，工具栏按钮变多时容器才会真正收窄。
- 绝对定位让画布的显示尺寸与容器一致，避免行内元素基线留出空隙。
- 画布的真实像素尺寸要在 ResizeObserver 回调里重设，并与 devicePixelRatio 相乘。
- 工具栏与画布之间的间距用 gap，不用 margin，避免容器宽度计算出现偏差。

**怎么度量收益**：在 ResizeObserver 回调里断言 `canvas.width === Math.round(rect.width * devicePixelRatio)`。用 Performance 面板录制 10 秒连续拖拽，看每帧的 Layout 次数是否稳定。再用 `getBoundingClientRect()` 对比画布与容器的四边坐标。

**什么时候不该用**：画布需要按内容高度自适应而不是占满剩余高度时，`flex: 1 1 0` 会把高度压到剩余空间。工具栏需要浮动在画布之上时，用绝对定位叠加，别塞进 flex 主轴里。

### 行业先进实践

- **区分 `flex: 1` 与 `flex: auto`（出处：MDN CSS `flex` 属性文档）**。MDN 说明 `flex: 1` 展开为 `1 1 0%`，`flex: auto` 展开为 `1 1 auto`，前者只按剩余空间等比分配，后者会先算内容宽度。团队规范里要求写全三个值，评审时一眼能看出分配依据。

- **用 `min-width: 0` 解除自动最小尺寸（出处：MDN `min-width` 文档）**。flex item 的自动最小尺寸默认取内容最小尺寸，省略号和内部滚动会被它顶开，显式写 0 才能压住。建议封装成 `.ellipsis` 一类工具类，避免每个页面各写一遍。需核对官方文档：W3C CSS Flexible Box Layout 规范中 automatic minimum size 一节的表述，以及各浏览器在嵌套 flex 下的实现差异。

- **把布局能力拆成工具类（出处：Bootstrap 官方文档 Utilities 的 Flex 章节、Tailwind CSS 官方文档的 Flex 与 Grid 工具类章节）**。两套框架都把 `display: flex`、`justify-content`、`align-items` 拆成原子类，在模板里直接组合，布局决策从组件 CSS 移到模板，改动范围可控。借鉴方式：只在页面骨架层用工具类，组件内部仍写语义化类名。

- **栅格组件基于 flex 实现（出处：Ant Design 官方文档的 Grid 栅格组件）**。Row 作为 flex 容器负责对齐与换行，Col 用百分比 flex-basis 表达 24 栅格，断点只切换数值。自研栅格时可以把 gutter 换成 gap，绕开负 margin 引起的横向滚动条。需核对官方文档：当前版本的 Row 是否已改用 gap 实现 gutter。

- **跨端框架复用 Flexbox 心智模型（出处：React Native 官方文档 Layout with Flexbox、Yoga 开源项目）**。React Native 把 Flexbox 的子集编译成原生布局，默认主轴为纵向，与 Web 不同。跨端组件写布局前先确认各端默认值。需核对官方文档：React Native 中 flexShrink、flexBasis 的默认值与 Web 的差异，并写进团队备忘。

### 从学到用：落地路线

1. 试点：挑一个页面骨架改造，例如后台首页的侧边栏加内容区，只动外层容器，不碰组件内部。验收标准：侧栏折叠展开时内容区宽度跟着变，页面无横向滚动条，`scrollWidth` 等于 `clientWidth`。

2. 验证：在试点页面跑 DevTools Performance 录制 10 秒滚动，记录 Layout 与 Recalculate Style 的合计耗时，与改造前的基线对比。验收标准：没有新增 longtask，耗时不超过基线。

3. 推广：把骨架层的 flex 写法固化成 3 到 5 个类名或模板片段，新增页面直接引用。验收标准：新页面骨架 CSS 里不出现 float 和写死宽度的整页布局。

4. 防回退：加 Stylelint 规则或 CI 脚本，禁止骨架层使用 float，并在评审清单中加入"滚动区是否带 min-height: 0"。验收标准：CI 能拦下一个故意写错的提交。

### 动手作业

**目标**：做一个自适应工作台页面，包含顶栏、可折叠侧栏、主内容滚动区、底部状态栏，四块区域全部用 Flexbox 排布。

**步骤**：

1. 新建 `index.html` 与 `style.css`，写出顶栏、侧栏、主内容、底栏四个区块，先给不同背景色方便观察。
2. 外层 `.app` 设 `display: flex; flex-direction: column; height: 100dvh`。
3. 顶栏与底栏设 `flex: 0 0 auto`；主区域设 `flex: 1 1 0; min-height: 0; overflow-y: auto`。
4. 主区域内部再建一层横向 flex：侧栏 `flex: 0 0 200px`，内容区 `flex: 1 1 0; min-width: 0`。
5. 加一个按钮切换 `.app` 上的 `.is-collapsed` 类，把侧栏改为 `flex-basis: 56px`，并给 flex-basis 加 transition。
6. 在主内容里放 200 行文字，确认滚动只发生在主区域，顶栏与底栏位置不动。
7. 用 DevTools 的 Device Toolbar 依次切到 360px 与 1440px 宽，检查两种宽度下的表现。

**验收标准**：

- 在 360px 与 1440px 宽度下都没有横向滚动条，`document.documentElement.scrollWidth` 等于 `clientWidth`。
- 侧栏折叠前后，用 `getBoundingClientRect().width` 读出的主内容宽度差值，等于侧栏宽度差值。
- 200 行文字只让主区域出现滚动条，顶栏与底栏坐标不变。
- 删掉主区域的 `min-height: 0` 后滚动失效，加回后恢复，说明这条约束确实在起作用。
- Performance 面板录制折叠动画期间，不出现超过 50ms 的 longtask，该阈值由你自己设定并记录在 README 里。

