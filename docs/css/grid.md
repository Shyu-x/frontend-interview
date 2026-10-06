---
title: Grid 布局
description: Grid 核心概念、fr 与 minmax、auto-fill 与 auto-fit，以及 Grid 与 Flex 的取舍。
tags:
  - css
---

# Grid 布局


## 1. Grid 布局

### 1.1 定义与核心概念

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

### 1.2 Grid 核心单位与函数

| 单位/函数 | 含义 | 示例 |
|---------|------|------|
| `fr` | 剩余空间比例单位（fraction） | `1fr 2fr` = 按 1:2 分配剩余空间 |
| `auto` | 自动填充内容大小（由内容决定） | `auto 1fr` = auto 列优先，1fr 列占剩余 |
| `minmax(min, max)` | 最小最大尺寸约束 | `minmax(200px, 1fr)` |
| `repeat(count, size)` | 重复轨道 | `repeat(3, 1fr)` = 1fr 1fr 1fr |
| `auto-fill` | 尽可能多填轨道（填不满留空位） | `repeat(auto-fill, minmax(200px, 1fr))` |
| `auto-fit` | 尽可能多填轨道（无内容时压缩空轨道） | `repeat(auto-fit, minmax(200px, 1fr))` |
| `fit-content(n)` | 根据内容，最大不超过 n | `fit-content(300px)` |

### 1.3 auto-fill vs auto-fit（关键区别）

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

### 1.4 容器属性详解

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

### 1.5 Grid 与 Flex 对比表

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

### 1.6 ASCII 网格布局示例

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

### 1.7 React / Next.js / TS 代码示例

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

### 1.8 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| `grid-template-columns: 1fr 1fr 1fr` 与 `auto-fill` 混淆 | 固定列数用 `fr`；响应式列数用 `repeat(auto-fit, minmax())` |
| `auto-fit` 和 `auto-fill` 分不清 | 有剩余空白列时：auto-fill 留空位，auto-fit 压缩空位并放大内容 |
| Grid 子元素不受 `vertical-align` 控制 | Grid 布局用 `align-items` / `justify-items` 控制对齐 |
| 嵌套 Grid 不生效 | 子元素要单独设 `display: grid` 才能创建新的 GFC |
| `fr` 和百分比混用导致不确定行为 | `fr` 和固定单位可以混用，但两个 `fr` 之间是分配"剩余空间" |

### 1.9 面试题

**Q1: `auto-fill` 和 `auto-fit` 的区别是什么？在什么场景下选哪个？**

> 参考答案：当列轨道数量不足以填满容器宽度时，`auto-fill` 会保留空列轨道（空占位），而 `auto-fit` 会压缩空列轨道，使有内容的项目等比放大填满容器。选择建议：① 希望所有列等宽留空位 → `auto-fill`；② 希望项目填满容器、无空白 → `auto-fit`（更常用）。实际开发中 `auto-fit` 更常见，因为它能充分利用视口空间。

**Q2: CSS Grid 的 `fr` 单位是什么？和百分比有什么区别？**

> 参考答案：`fr` 是"剩余空间比例单位"（fraction），表示从容器剩余空间中按比例分配。只有在有剩余空间时 `fr` 才有效，且分配的是**剩余空间**（非总空间）。例如 `1fr 2fr`：先计算内容总尺寸，再用剩余空间按 1:2 分配。百分比则是相对于**容器总尺寸**，与 `fr` 的计算基准不同，两者可以混用（`200px 1fr 20%`）。

**Q3: Grid 布局如何实现圣杯布局（经典三栏布局：header + sidebar + main + footer）？相比 Flex 有什么优势？**

> 参考答案：用 `grid-template-areas` 命名区域：`"header header header" "sidebar main aside" "footer footer footer"`，然后每个区域对应到子元素即可。相比 Flex：Grid 用命名区域语义更清晰，sidebar/main/aside 对齐更精确（二维同时控制），不需要嵌套 Flex；Flex 则需要多层嵌套或依赖 `flex-grow` 实现。Grid 的二维特性使其在处理行列对齐时比 Flex 更强大。


## 2. 面试精讲：Grid 布局，Grid vs Flex 区别

### 2.1 Grid 基础

```css
.grid {
  display: grid;

  /* 定义列 */
  grid-template-columns: 200px 1fr 200px;
  grid-template-columns: repeat(3, 1fr);
  grid-template-columns: 100px auto 100px;
  grid-template-columns: minmax(100px, 1fr) 2fr;

  /* 定义行 */
  grid-template-rows: 100px auto 100px;
  grid-template-rows: repeat(3, minmax(50px, auto));

  /* 简写：grid-template（不建议混用） */
  grid-template: 100px auto / 1fr 1fr 1fr;

  /* gap */
  gap: 20px;
  column-gap: 20px;
  row-gap: 10px;

  /* 区域定义 */
  grid-template-areas:
    "header header header"
    "sidebar main aside"
    "footer footer footer";
}

/* 网格线编号定位 */
.item {
  grid-column: 1 / 3;  /* 从第1条线到第3条线（跨2列） */
  grid-column: 1 / span 2; /* 从第1条线跨2列 */
  grid-column: 1 / -1;  /* 贯穿所有列 */
  grid-row: 2 / 4;      /* 从第2条线到第4条线（跨2行） */
}

/* 命名区域定位 */
.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }

/* 隐式网格（自动创建行/列） */
grid-auto-rows: 100px; /* 自动创建的行高度 */
grid-auto-flow: row dense; /* dense 填充空白 */
```

### 2.2 fr 单位与 minmax

```css
/* fr：fraction，剩余空间比例单位 */
grid-template-columns: 1fr 2fr 1fr;
/* 总共 4fr，第一列 1/4，第二列 2/4，第三列 1/4 */

grid-template-columns: repeat(3, 1fr);
/* 三等分 */

/* minmax(min, max)：尺寸范围 */
grid-template-columns: minmax(200px, 1fr) 1fr 1fr;
/* 第一列：最小 200px，最大 1fr */

/* auto-fill vs auto-fit */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
/* auto-fill：尽可能填入网格，空格保留 */
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
/* auto-fit：所有空白压缩（让已有列占满） */

/* 实际效果对比：
   容器宽度 700px，每列 minmax(200px, 1fr)
   auto-fill: 3列 → 实际 4列（200*3=600，1列空白）
   auto-fit:  3列 → 列宽自动扩展填满 700px */
```

### 2.3 Grid vs Flex 区别

| 特性 | Flexbox | Grid |
|------|---------|------|
| 维度 | 一维（行或列） | 二维（行和列） |
| 布局方向 | 单轴线排列 | 网格轨道排列 |
| 适用场景 | 导航栏、列表、卡片组、居中 | 页面整体布局、数据表格、相册 |
| 对齐方向 | 主轴 + 交叉轴两个方向 | 行对齐 + 列对齐 |
| 项目定位 | 按顺序/方向排列 | 可精确指定行列位置 |
| 内容驱动 | flex-grow 分配剩余空间 | 由轨道定义决定尺寸 |
| 空间利用 | 适合内容不规则的流式布局 | 适合规则对齐的网格式布局 |

```css
/* Flex：适合内容驱动的单行/单列 */
.flex-nav {
  display: flex;
  gap: 20px;
}
.flex-nav a {
  padding: 8px 16px;
  /* 每个 a 根据内容自适应宽度 */
}

/* Grid：适合二维网格 */
.grid-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.gallery-item:nth-child(1) {
  grid-column: span 2; /* 某些项目可跨列 */
}
.gallery-item:nth-child(4) {
  grid-row: span 2;   /* 某些项目可跨行 */
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSS grid layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout) | MDN Grid 指南总入口，属性与场景索引最全。 | 先看目录定位「基本概念」「常见布局」两节，读后列出还需查的属性清单。 |
| [Basic concepts of grid layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Basic_concepts) | 讲清网格线、轨道、单元格等术语，面试常问。 | 精读术语定义并记英文名，再用 grid-template-columns 手写三列布局验证。 |
| [Grid layout using line-based placement](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Line-based_placement) | 网格线定位是 Grid 最核心用法，示例可直接上手。 | 跟着示例写 grid-column、grid-row 跨行跨列，再用 grid-area 简写改写一次。 |
| [Grid template areas](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Grid_template_areas) | 区域命名让布局意图一目了然，适合搭页面骨架。 | 用 grid-template-areas 画出页面骨架，再配媒体查询在窄屏重排。 |
| [Relationship of grid layout to other layout methods](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Relationship_with_other_layout_methods) | 直接对比 Grid 与其他布局方式，正对面试题。 | 读完总结 Grid 与 Flex 各自擅长的维度，写成一页对比笔记。 |
| [CSS Grid Layout Level 1](https://www.w3.org/TR/css-grid-1/) | 权威规范，属性定义的最终依据。 | 只读轨道尺寸算法概述与 fr 定义，解释 fr 与 auto 的区别。 |
| [Box alignment in grid layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_alignment/In_grid_layout) | 把 justify、align 系列属性一次讲透，易混点集中。 | 带着「justify 与 align 各作用在哪个轴」的问题读，并画出轴示意图。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSS Grid Garden](https://cssgridgarden.com/#zh-cn) | 游戏化练习，几分钟建立 grid-column 手感。 | 通关全部关卡后，用 grid-template-areas 把同一布局重写一遍。 |
| [Layoutit Grid](https://grid.layoutit.com/) | 可视化拖拽生成 Grid 代码，适合快速验证想法。 | 拖出目标布局后读生成代码，逐行猜含义，删掉再手写一遍。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSS-Tricks Grid 完全指南](https://css-tricks.com/snippets/css/complete-guide-grid/) | 属性速查与图示齐全，卡壳时最省时间。 | 当速查表用：先自己写布局，卡在哪条属性再查对应图示。 |
| [阮一峰：CSS Grid 网格布局教程](https://www.ruanyifeng.com/blog/2019/03/grid-layout-tutorial.html) | 中文入门友好，示例短小可直接跑。 | 跟着示例敲一遍，再用 MDN 补齐文中未覆盖的属性。 |
| [web.dev Learn CSS：Grid](https://web.dev/learn/css/grid) | 章节化实战教程，从 12 栏到命名区域全覆盖。 | 照章节实现 12 栏网格，再用 grid-template-areas 重写一遍。 |
| [阮一峰：Flex 布局语法篇](https://www.ruanyifeng.com/blog/2015/07/flex-grammar.html) | Flex 属性速览，配合本页做 Grid vs Flex 对比。 | 对照 6 个容器属性与 6 个项目属性各写一例，并记录何时该改用 Grid。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理系统的页面骨架（顶栏、侧栏、内容区） | grid-template-areas、fr 单位、gap | 原生 CSS Grid 写外壳，框架只渲染内容 | 万行数据的行渲染交给虚拟滚动，Grid 只做外壳 |
| 入门档安卓机的首屏卡片阵列 | repeat(auto-fill, minmax())、gap | 原生 Grid 加 content-visibility | 用 @supports 兜底，先核对兼容表 |
| 多人协作白板的画布与属性面板 | grid-template-columns/rows 二维分区、min-width: 0 | 原生 Grid 做外壳，Canvas 或 SVG 画面 | 画布内部图形坐标由渲染引擎管，不用 Grid |
| 商城大促的商品卡片墙 | auto-fill 与 auto-fit 的区别、justify-items | Grid 加图片懒加载 | 卡片数量大时给每张卡片加 contain |
| 数据看板的 12 栅格拖拽面板 | repeat(12, 1fr)、grid-column: span | Grid 铺栅格，拖拽逻辑自己写或用现成库 | 拖拽库若基于绝对定位，栅格只当视觉参考 |
| 邮件客户端的三栏阅读视图 | grid-template-areas、独立滚动区 | Grid 加 overflow-y: auto | 列表与正文各自滚动，页面不整体滚动 |
| 表单的标签与控件对齐 | 子网格，或 grid-template-columns: max-content 1fr | Grid 或 subgrid | 用 subgrid 前核对目标浏览器支持 |
| 打印报表的 A4 分页 | grid-template-rows、@media print | 原生 Grid 打印样式 | 打印不认部分交互样式，先导出 PDF 校对 |

### 三个场景拆解

#### 场景 1：后台管理系统的页面骨架

**业务背景**：后台有十来个二级页面，顶栏、侧栏、内容区三块结构一致。改造前每个页面各写一套 float 与 margin，改一次侧栏宽度要动十来个文件。

**怎么用本页知识解决**：把三块区域写成命名网格区域，行列尺寸交给 fr 与固定值，页面不再靠 margin 拼位置。

```css
.app {
  display: grid;
  grid-template-columns: 240px 1fr;   /* 侧栏定宽，主区吃掉剩余宽度 */
  grid-template-rows: 56px 1fr;       /* 顶栏定高，主区吃掉剩余高度 */
  grid-template-areas:
    "top  top"                         /* 顶栏横跨两列 */
    "side main";                       /* 侧栏与主区并排，二维定位 */
  gap: 8px;                            /* 行列间距统一，免写 margin */
  height: 100vh;                       /* 撑满视口，子区才能各自滚动 */
}
.app__side { grid-area: side; overflow-y: auto; }  /* 侧栏自己滚 */
.app__main { grid-area: main; min-width: 0; overflow-y: auto; }
@media (max-width: 768px) {
  .app {
    grid-template-columns: 1fr;        /* 窄屏收成单列 */
    grid-template-areas: "top" "main"; /* 侧栏进抽屉，不再占列 */
  }
}
```

- grid-template-areas 把三块的相对位置写成字符串矩阵，改版只动这张图，不动 DOM 顺序。
- 240px 与 1fr 的组合把侧栏钉死宽度，主区随窗口变化。
- 侧栏与主区各自 overflow-y: auto，两块滚动互不干扰。
- 主区的 min-width: 0 不能省，否则内部的宽表格会把网格列撑破。
- 断点里只改列数与区域图，媒体查询数量从每页三处降到一处。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板录制首屏，比较改造前后 Layout 任务的耗时；用 Lighthouse 记录 CLS；用 PerformanceObserver 监听 layout-shift 条目，统计首屏内的偏移次数。

**什么时候不该用**：
- 万行表格的行不要做成网格项目，行数增长会让布局节点数量随之增长，行渲染交给虚拟滚动加普通表格行。
- 只有一栏的移动端列表不要上 Grid，单列排列用块级流即可。
- 行高需要随图片比例变化的瀑布流不要用固定 grid-template-rows，改用 auto-rows 或交给瀑布流脚本。

#### 场景 2：入门档安卓机的首屏卡片阵列

**业务背景**：卡片墙页面首屏要挂上数百张商品卡，在入门档安卓机上出现掉帧与滚动条跳动。卡片高度一致，宽度随容器变化。

**怎么用本页知识解决**：列数交给容器宽度决定，屏外卡片交给浏览器跳过渲染，占位尺寸写死避免滚动条跳动。

```css
.card-wall {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  /* 上面一行按容器宽度自动定列数，省掉逐断点的媒体查询 */
  gap: 12px;
  padding: 12px;
}
.card {
  content-visibility: auto;             /* 视口外的卡片跳过渲染 */
  contain-intrinsic-size: 160px 220px;  /* 给占位尺寸，滚动条不跳动 */
  contain: layout paint;                /* 重排重绘限制在卡片内部 */
}
@supports not (content-visibility: auto) {
  .card { contain: layout paint; }      /* 不支持时至少保留 contain */
}
```

- auto-fill 会保留空轨道，卡片不足一行时每张宽度仍然一致。
- minmax(160px, 1fr) 给出卡片宽度下限，窗口变窄时列数先减少，卡片不会被压扁。
- content-visibility: auto 让屏外卡片跳过渲染，首屏布局工作量随可见数量决定。
- contain-intrinsic-size 提供占位高度，滚动条长度不因卡片是否渲染而跳动。
- @supports 分支保留降级路径，不支持该属性的浏览器仍拿到 contain。

**怎么度量收益**：用 Lighthouse 记录 LCP 与 TBT；用 DevTools 的 Rendering 面板打开 Paint flashing 与 Frame Rendering Stats，滚动时看重绘范围；用 PerformanceObserver 监听 largest-contentful-paint，对比改造前后的取值。

**什么时候不该用**：
- 卡片宽度需要按图片原始比例变化时，等宽轨道不适用，改用 Flex 换行。
- 目标浏览器不支持 content-visibility 时不要硬上，先核对兼容表，保留 contain 作为降级。
- 首屏卡片总数不足一行时，跳过渲染带来的收益低于调试成本，去掉该属性。

#### 场景 3：多人协作白板的画布与属性面板

**业务背景**：白板要在同一屏内放工具栏、画布、属性面板三块，画布尺寸随窗口变化。多人在线拖动元素时，属性面板的重绘会带动画布。

**怎么用本页知识解决**：用两行两列把三块切出来，工具栏跨满列，画布与面板各自限制溢出，重绘范围被关在各自区域内。

```css
.board {
  display: grid;
  grid-template-columns: 1fr 280px;  /* 画布区加右侧属性面板 */
  grid-template-rows: 48px 1fr;      /* 工具栏加主区 */
  height: 100vh;
}
.board__toolbar {
  grid-column: 1 / -1;               /* 工具栏横跨全部列 */
  display: flex;                     /* 工具栏内部一维排列交给 Flex */
  gap: 8px;
}
.board__canvas {
  position: relative;                /* 给浮层与选中框提供定位参照 */
  min-width: 0;                      /* 防止画布被内部内容撑破网格 */
  overflow: hidden;
}
.board__panel { overflow-y: auto; }  /* 属性面板独立滚动 */
```

- 两行两列把屏幕切成三块，区域关系写在 grid-template-columns 与 grid-template-rows 里。
- grid-column: 1 / -1 让工具栏跨满列，不必在 DOM 里额外包一层容器。
- 工具栏内部是一维排列，交给 Flex；二维分区交给 Grid，两类布局各管一层。
- 画布的 min-width: 0 防止内部元素把网格列撑大，窗口缩小时画布跟着缩。
- 面板 overflow-y: auto 让属性多时只滚面板，画布位置不动。

**怎么度量收益**：用 DevTools 的 Performance 面板录制拖拽过程，看帧率曲线与 Layout 区段；用 requestAnimationFrame 采样帧间隔，统计超过 16.7ms（60Hz 下的单帧预算）的帧数量。

**什么时候不该用**：
- 画布内部的图形定位不要用 Grid，坐标交给 Canvas 2D 变换或 SVG 的 viewBox。
- 屏幕上只有工具栏与画布两块时，用 Flex 单列布局足够，不必上 Grid。
- 属性面板宽度需要随内容自适应的场景不要写死 280px，改成 max-content 加上限。

### 行业先进实践

- **命名网格区域搭页面骨架**（出处：MDN Web Docs 的 CSS Grid Layout 指南）：该指南的 grid-template-areas 一节演示把页面结构写成字符串矩阵，改版时只改字符串。有效原因是区域名与 DOM 顺序解耦，改版不牵动模板结构。借鉴方式：把后台骨架抽成全站模板，评审时比对字符串矩阵。
- **auto-fill 加 minmax 的响应式卡片阵列**（出处：MDN Web Docs《Realizing common layouts using grids》）：文档给出用 repeat(auto-fill, minmax()) 实现免媒体查询的卡片布局。有效原因是列数由容器宽度算出，断点数与窗口档位不再绑定。借鉴方式：卡片墙默认走这条规则，只有需要跨列特例时才加媒体查询。
- **把布局封成原语**（出处：开源项目 Every Layout）：该项目用自定义元素与 CSS 自定义属性把 Stack、Sidebar 等布局封成可复用原语，阈值通过自定义属性传入。有效原因是布局决策集中在一处，页面只传参。借鉴方式：把骨架列宽与间距做成 CSS 变量，页面只改变量值。
- **用 content-visibility 跳过屏外渲染**（出处：web.dev 的 content-visibility 主题文章）：文中说明 content-visibility: auto 让浏览器跳过屏外子树的渲染工作，并提示与 contain-intrinsic-size 搭配使用。借鉴方式：长卡片墙先加这两条声明，再用 Rendering 面板对比重绘范围。
- **用 subgrid 对齐嵌套子项**（出处：MDN Web Docs 的 Subgrid 页面）：子网格复用父网格轨道，解决卡片内部标题与按钮跨卡片对齐。需核对官方文档：目标浏览器对 subgrid 的支持情况与降级写法。

### 从学到用：落地路线

1. **试点**：挑一个二级页面，用 grid-template-areas 重写骨架，主区放卡片阵列。验收标准：375px、768px、1440px 三个宽度下都不出现横向滚动条。
2. **验证**：用 DevTools 的 Performance 面板录制首屏，用 Lighthouse 记录 CLS 与 LCP，改造前后各测一轮。验收标准：CLS 取值不超过 0.1，且 Layout 任务耗时未上升。
3. **推广**：把骨架与卡片阵列抽成模板片段加 CSS 变量，供其他页面引用。验收标准：新页面改变量值就能换列宽与间距，代码评审中不再出现用 margin 拼版的写法。
4. **防回退**：在 CI 加视觉回归截图与样式检查。验收标准：三个断点的截图比对通过，出现偏移即阻断合并。

### 动手作业

**目标**：做一个响应式后台页面，包含顶栏、侧栏、主区卡片阵列，并在三档宽度下通过检查。

**步骤**：
1. 写 HTML，用 header、aside、main、footer 四个语义标签，DOM 顺序按移动端阅读顺序排。
2. 给容器写 grid-template-areas，桌面端为两列两行，侧栏在主区左侧。
3. 主区用 repeat(auto-fill, minmax(160px, 1fr)) 加 gap 排卡片，卡片数量不少于 12 张。
4. 给侧栏与主区加 overflow-y: auto，容器高度设为视口高度。
5. 加一个断点，窄屏把侧栏从列里拿掉，改成顶部可展开区域。
6. 用 DevTools 设备模拟在 375px、768px、1440px 三档截图，记录每档实际列数。
7. 用 Lighthouse 跑一次，把 CLS 与 LCP 的取值和测量步骤写进 README。

**验收标准**：
- 三档宽度下无横向滚动条，卡片实际宽度不低于 160px。
- 侧栏内容超长时只有侧栏滚动，页面滚动位置保持不变。
- 窄屏下侧栏不占列，主区占满可用宽度。
- README 记录的 CLS 取值不超过 0.1，并写明测量工具与复现步骤。

