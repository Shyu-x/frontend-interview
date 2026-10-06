---
title: 常用 CSS 技巧与暗黑模式
description: 多行省略、0.5px 边框、CSS 图形、瀑布流与暗黑模式的实现。
tags:
  - css
---

# 常用 CSS 技巧与暗黑模式


## 1. 面试精讲：多行省略，0.5px 实现，三角形/正方形/自适应高度/瀑布流

### 1.1 多行文本省略

```css
/* 单行省略（常用） */
.single-line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 多行省略（CSS 实现，需 WebKit） */
.multi-line {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3; /* 显示3行 */
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### 1.2 0.5px 边框实现

```css
/* 方法1：transform: scaleY（最常用） */
.scale-border {
  position: relative;
}
.scale-border::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: #000;
  transform: scaleY(0.5);
}

/* 方法2：box-shadow */
.box-shadow-border {
  box-shadow: inset 0 -0.5px #000;
}

/* 方法3：渐变 */
.gradient-border {
  background:
    linear-gradient(to bottom, #000 50%, transparent 50%) bottom / 100% 1px no-repeat;
  background-position: 0 100%;
}
```

### 1.3 CSS 图形实现

```css
/* 三角形：利用 border 对边等宽原理 */
.triangle-up {
  width: 0;
  height: 0;
  border-left: 50px solid transparent;
  border-right: 50px solid transparent;
  border-bottom: 100px solid red;
}

.triangle-down {
  width: 0;
  height: 0;
  border-left: 50px solid transparent;
  border-right: 50px solid transparent;
  border-top: 100px solid blue;
}

/* 正方形：利用 aspect-ratio */
.square {
  width: 50%;
  aspect-ratio: 1; /* 现代 CSS */
}

/* 自适应高度：视口高度 */
.full-height {
  height: 100vh;
  height: 100dvh; /* 动态视口高度（移动端地址栏变化时更新） */
}
```

### 1.4 瀑布流布局

```css
/* 方式1：CSS columns（最简单） */
.waterfall {
  column-count: 3;
  column-gap: 10px;
}
.waterfall-item {
  break-inside: avoid;
  margin-bottom: 10px;
}

/* 方式2：grid + dense 流 */
.waterfall-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 10px;
  grid-auto-flow: row dense;
}
.item:nth-child(1) { grid-row: span 20; }
.item:nth-child(2) { grid-row: span 15; }
.item:nth-child(3) { grid-row: span 25; }
```


## 2. 面试精讲：暗黑模式，prefers-color-scheme

### 2.1 prefers-color-scheme 媒体查询

```css
/* 系统级暗黑模式检测 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #121212;
    --text-color: #e0e0e0;
    --link-color: #8ab4f8;
  }
}

@media (prefers-color-scheme: light) {
  :root {
    --bg-color: #ffffff;
    --text-color: #000000;
    --link-color: #1a73e8;
  }
}

/* 使用 CSS 变量 */
body {
  background: var(--bg-color);
  color: var(--text-color);
}
```

### 2.2 JS 检测

```javascript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// 监听变化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (e.matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
});
```

### 2.3 HTML 手动切换

```html
<meta name="color-scheme" content="light dark">
```

```css
/* 手动切换：data-theme 属性 */
[data-theme="dark"] {
  --bg-color: #121212;
  --text-color: #e0e0e0;
}
[data-theme="light"] {
  --bg-color: #ffffff;
  --text-color: #000000;
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [`prefers-color-scheme` CSS media feature](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme) | 官方条目，明确 dark/light 取值语义与生效前提。 | 读语法与示例节，写一套双主题，再用 JS 强制切换验证覆盖逻辑。 |
| [MDN 媒体查询](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries) | 把用户偏好查询放回媒体查询体系，理解范围写法。 | 先读语法与逻辑运算符，再组合 prefers-color-scheme 与 prefers-reduced-motion 测试。 |
| [MDN CSS 自定义属性](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) | 自定义属性是组织亮暗主题变量最实用的落点。 | 读继承与 JS 读写两节，把页面色值抽成变量，实现一键换肤并试回退值。 |
| [CSS backgrounds and borders](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Backgrounds_and_borders) | 三角形、圆角与 0.5px 边框都依赖背景边框模型。 | 重点读 border 与 border-radius，用零宽高加透明边框手写三角形复现。 |
| [MDN Grid 布局（中文）](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_grid_layout) | 网格线定位是瀑布流与自适应相册布局的基础。 | 读基本概念与网格线定位，实现跨行跨列相册，再用多列属性做对比。 |
| [CSS layout cookbook](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook) | 官方布局配方，覆盖卡片、列布局与自适应高度场景。 | 挑 Card 与 Column layouts 两篇照做，改造成暗色主题并记录取舍。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSS-Tricks](https://css-tricks.com/) | Almanac 可按属性速查，含多行省略等技巧现状说明。 | 搜 line-clamp、aspect-ratio、column-count，对比兼容性后选定方案。 |
| [fe-interview（haizlin）](https://github.com/haizlin/fe-interview) | CSS 分类题库，可检验本页面试考点的掌握程度。 | 挑 CSS 分类十题限时自测，标出省略、0.5px、暗黑模式错题回读。 |
| [web-interview](https://github.com/febobo/web-interview) | 面试题库，适合限时口述本页考点的标准答案。 | 选 CSS 分类限时口述每题答案，记录卡壳点，回到 MDN 对应条目补漏。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSS in Depth（Manning）](https://www.manning.com/books/css-in-depth-second-edition) | 从层叠与布局讲清原理，解释技巧为何成立。 | 先读布局与层叠章节，每章写一个实验页，用主题切换验证变量作用域。 |
| [CSS for JavaScript Developers](https://css-for-js.dev/) | 补齐 CSS 心智模型，讲清布局与颜色为何反直觉。 | 按模块顺序过布局与颜色部分，完成配套项目巩固主题变量用法。 |
| [Kevin Powell](https://www.youtube.com/@KevinPowell) | 视频演示技巧落地过程，适合跟随模仿写法。 | 挑多行省略、形状、暗色主题相关视频，看完暂停自己复刻一遍。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格 | 单行省略三件套、`table-layout: fixed` | 固定列宽 + 虚拟滚动表格组件 | 省略三件套缺一条就不生效；flex 子项要加 `min-width: 0` |
| 低端安卓的首屏商品列表 | 自适应高度、正方形占位 | `aspect-ratio` 或 `padding-top` 百分比 | 图片未返回前先占位，否则列表会跳动 |
| 多人协作白板的工具栏 | 三角形（border 绘制） | 纯 CSS 三角形 + `transform` 旋转 | 三角形靠 border 宽度控制，改色要同时改对应边的颜色 |
| 电商 App 的订单卡片列表 | 多行省略、0.5px 分隔线 | `-webkit-line-clamp` + `scale` 缩放边框 | 多行省略要配固定 `line-height`，否则可能截到半个字 |
| 数据大屏的卡片墙 | 瀑布流、正方形封面 | `column-count` 或 JS 计算绝对定位 | 多列布局按列填充，按时间排序的内容不能用 |
| IM 聊天的消息气泡 | 多行省略、暗黑模式变量 | `line-clamp` + CSS 变量主题 | 气泡最大宽度用百分比；暗色下别用纯黑气泡贴纯黑背景 |
| 后台系统的暗黑模式 | `prefers-color-scheme`、`color-scheme` | 媒体查询 + `html[data-theme]` 覆盖 | 要同时处理表单控件、滚动条和内嵌 iframe |
| 图片缩略图预览墙 | 正方形、0.5px 边框 | `aspect-ratio` + `scale` 缩放边框 | 缩放边框要设 `transform-origin`，否则边框偏出容器 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：一张表有二十多列，标题和地址字段长度差异大，产品要求单元格不换行、超出显示省略号。行数在千级以上，改一次列宽要回归全部列，省略失效就会被当成 bug 反复提。

**怎么用本页知识解决**：先固定表格布局让列宽由表头决定，再给单元格加省略三件套。用 flex 排版单元格时补 `min-width: 0`，否则内容会把列撑开。

```css
/* 固定布局：列宽不再由内容决定，省略位置可预期 */
.table { table-layout: fixed; width: 100%; }

/* 三件套：不换行、裁剪、省略号，缺一条都不显示省略号 */
.cell {
  white-space: nowrap;      /* 文本保持单行 */
  overflow: hidden;         /* 超出容器的部分裁剪掉 */
  text-overflow: ellipsis;  /* 在裁剪处显示省略号 */
}

/* flex 单元格要允许收缩，默认最小尺寸是内容宽度 */
.cell--flex { display: flex; min-width: 0; }

/* 标题列设宽度上限，避免单列吃掉整张表 */
.cell--title { max-width: 240px; }
```

- `table-layout: fixed` 让第一行或 `colgroup` 决定列宽，长内容不再改变布局。
- `overflow: hidden` 提供裁剪边界，没有它 `text-overflow` 没有作用位置。
- `min-width: 0` 覆盖 flex 子项默认的内容最小宽度，这是列被撑开的主因。
- 被省略的单元格补 `title` 属性，鼠标悬停可读全文。
- 表头右侧留出排序图标宽度，否则省略号会压住图标。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板录制表格滚动，看 Frames 一栏的长任务与掉帧；用 Rendering 面板打开 Layout Shift Regions，确认改列宽时表格没有位移；用 Elements 面板逐列检查是否出现横向滚动条。

**什么时候不该用**：

- 金额、订单号、身份证号这类字段必须完整可读，省略会隐藏关键信息。
- 单元格内容是用户要复制粘贴的正文，视觉被截断会让用户误判内容缺失。

#### 场景 2：移动端商品卡片的双列瀑布流

**业务背景**：首页是双列商品卡片，封面图比例不一致，图片走网络加载。图片没回来之前，卡片高度为 0，内容到位后整屏往下跳。

**怎么用本页知识解决**：用 `aspect-ratio` 给封面留出固定比例的位置，用多列布局搭瀑布流，用缩放伪元素画 0.5px 边框。

```css
/* 封面正方形：宽度变化时高度跟随，图片未到先占位 */
.card__cover {
  width: 100%;
  aspect-ratio: 1 / 1;   /* 宽高比 1:1，替代 padding-top 百分比写法 */
  object-fit: cover;     /* 图片填满容器且不变形 */
}

/* 双列瀑布流：多列布局，列内顺序为从上到下 */
.masonry { column-count: 2; column-gap: 8px; }
.masonry > .card { break-inside: avoid; margin-bottom: 8px; }

/* 0.5px 边框：画 2 倍尺寸的 1px 边框再缩小一半 */
.card { position: relative; }
.card::after {
  content: ""; position: absolute; left: 0; top: 0;
  width: 200%; height: 200%;            /* 放大到容器两倍 */
  border: 1px solid rgba(0, 0, 0, .12);
  transform: scale(.5); transform-origin: 0 0;  /* 以左上角为原点缩半 */
  pointer-events: none;                 /* 不挡卡片点击 */
}
```

- `aspect-ratio` 在图片加载前就占住高度，卡片位置不再由图片决定。
- `object-fit: cover` 裁切而非拉伸封面，比例不一致的图不会变形。
- `column-count` 的填充顺序是先把第一列填满，列表顺序会按列读取。
- `break-inside: avoid` 阻止卡片被拆到两列之间。
- 伪元素缩放后不占事件，`pointer-events: none` 保证卡片可点击。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板看 CLS 与图片加载前后的布局偏移；用 Network 面板切 Slow 4G 复现弱网，观察卡片是否整体下跳；用 Rendering 面板的 Paint flashing 检查缩放边框有没有引发额外重绘。

**什么时候不该用**：

- 内容要按发布时间严格从上到下排序，多列布局会打乱阅读顺序。
- 卡片高度差异大到底部只剩一列有内容，双列会留下大片空白。

#### 场景 3：跟随系统的暗黑模式

**业务背景**：用户在系统设置里切换深浅色，应用要跟着变；同时产品要求保留手动切换，并且手动选择在下次打开时仍然有效。主题变量覆盖背景、文字、边框三类颜色。

**怎么用本页知识解决**：把颜色抽成 CSS 变量，媒体查询负责跟随系统，`data-theme` 属性负责手动覆盖，选择结果写入本地存储。

```css
/* 默认浅色变量，页面其余样式只引用变量 */
:root { --bg: #fff; --fg: #1f2328; --border: rgba(0, 0, 0, .12); }

/* 系统切到深色时自动换变量，不需要 JS 参与 */
@media (prefers-color-scheme: dark) {
  :root { --bg: #1f2328; --fg: #e6e6e6; --border: rgba(255, 255, 255, .18); }
}

/* 手动覆盖优先级更高：html 上有 data-theme 时以它为准 */
html[data-theme="dark"] { --bg: #1f2328; --fg: #e6e6e6; }
html[data-theme="light"] { --bg: #fff; --fg: #1f2328; }

body { background: var(--bg); color: var(--fg); }
```

- 变量定义在 `:root`，组件样式只写 `var(--bg)`，换主题不动组件。
- `html[data-theme]` 选择器权重高于 `:root`，能盖住媒体查询的结果。
- 两个选择器要写在媒体查询之后，保证手动值最后生效。
- 切主题的脚本只改 `html` 的属性，不遍历 DOM 改样式。
- 首次进入时读本地存储，没有记录就不设属性，交给系统决定。

**怎么度量收益**：在 Chrome DevTools 的 Rendering 面板用 Emulate CSS prefers-color-scheme 分别选 light 与 dark，检查两套配色；用 Lighthouse 的 Accessibility 审计看文字对比度是否达标；在 Network 面板勾选 Disable cache，确认切主题不产生新请求。

**什么时候不该用**：

- 页面用途是打印或导出 PDF，深色背景会消耗墨粉并让图表看不清。
- 品牌方要求浅色固定配色并写进了交付规范，跟随系统会违反规范。

### 行业先进实践

**声明页面支持的主题（出处：MDN Web Docs 的 color-scheme 条目）**：在 `html` 上写 `color-scheme: light dark`，同时在 head 里加 `<meta name="color-scheme" content="light dark">`。浏览器会据此调整滚动条、表单控件和默认背景，不会出现深色页面里嵌一块白色输入框。借鉴方式是在入口先加这两处声明，再写自定义变量。

**深色表面用亮度分层（出处：Material Design 官方文档的 Dark theme 页面）**：该文档建议深色主题的组件表面按层级叠加半透明白来区分高度，正文避免使用纯白文字。这样做能降低眩光与光晕，层级关系靠亮度差表达。借鉴方式是定义三层表面变量，而不是全局用一个背景色。

**主题切换用类名加 CSS 变量（出处：Tailwind CSS 官方文档的 Dark mode 页面、Element Plus 官方文档的暗黑模式页面）**：两套方案都支持媒体查询与类名两种策略，类名策略通过给根元素加标记覆盖变量。这样手动选择与系统默认可以并存，且样式集中在变量层。借鉴方式是把变量层与组件层分开，组件内只引用变量。

**长列表用渲染跳过（出处：web.dev 的 content-visibility 文章）**：`content-visibility: auto` 让浏览器跳过屏外元素的渲染，配合 `contain-intrinsic-size` 给出占位尺寸，避免滚动条长度跳动。它适合条目多但每条结构相同的列表。借鉴方式是在评论列表或订单列表上先测量滚动是否顺畅，再决定是否启用。

**需核对官方文档：CSS Grid 原生瀑布流的语法与实现状态**：需要核对 CSS Grid Layout Module 中 `grid-template-rows: masonry` 的当前定义，以及各浏览器对该关键字的支持情况。项目里若用 JS 计算绝对定位实现瀑布流，应先确认原生方案是否可用于目标浏览器，再决定是否替换。

### 从学到用：落地路线

**第 1 步：在一个列表页试点**。选列数固定、字段长度差异大的表格或卡片列表，只改这一个页面，不动公共组件。验收标准：该页面所有长文本单元格都显示省略号，横向滚动条不再出现。

**第 2 步：用工具验证效果**。在 Chrome DevTools 的 Performance 面板录一次滚动，在 Rendering 面板打开 Layout Shift Regions，对比改动前后的布局偏移与掉帧记录。验收标准：滚动过程中没有因文本撑开列宽而产生的布局位移，截图留档。

**第 3 步：抽成公共样式与变量**。把省略三件套、正方形封面、缩放边框、主题变量整理成可复用的类与变量文件，在三个以上页面接入。验收标准：新页面接入时不写重复的省略与边框代码，主题切换只改根元素属性。

**第 4 步：加防回退检查**。在代码检查规则里禁止给可收缩单元格写固定 `width` 代替 `min-width: 0`，并把暗色截图纳入发布前检查清单。验收标准：连续两次发版后，试点页面仍通过第 2 步的检查项。

### 动手作业

**目标**：做一个移动端商品卡片列表页，要求封面保持正方形、卡片支持双列瀑布流、边框呈细线，并且支持跟随系统与手动切换的深浅色主题。

**步骤**：

1. 写页面骨架，在 head 加入 color-scheme 的 meta 声明，在 `:root` 定义背景、文字、边框三个浅色变量。
2. 用 `@media (prefers-color-scheme: dark)` 覆盖同一组变量，再写 `html[data-theme="dark"]` 与 `html[data-theme="light"]` 两套覆盖规则，位置放在媒体查询之后。
3. 用 `column-count: 2` 搭双列容器，卡片加 `break-inside: avoid` 与下边距。
4. 封面用 `aspect-ratio: 1 / 1` 与 `object-fit: cover`，图片地址用本地占位图，先让部分图片加载失败以观察占位。
5. 卡片用伪元素画 1px 边框，`width` 与 `height` 设为 200%，`transform: scale(.5)`，`transform-origin: 0 0`，并加 `pointer-events: none`。
6. 写切换脚本：点按钮时在 `html` 上设 `data-theme`，把结果写入 `localStorage`，刷新时先读取再渲染。
7. 用 DevTools 的 Rendering 面板分别模拟 light 与 dark，用 Device Toolbar 在 375px 与 768px 两个宽度下截图。

**验收标准**：

- 系统切到深色后刷新页面，背景与文字跟随变化，不需要点按钮。
- 手动点按钮切浅色后页面变浅，刷新后仍是浅色。
- 窗口宽度从 375px 改到 768px，封面长宽保持相等，图片没有拉伸变形。
- 在 2 倍像素密度的设备模拟下，卡片边框在截图中占 1 个物理像素。
- 双列底部没有出现一整列空白的区域。

