# Section 19: 清除浏览器默认样式

## 一、为什么浏览器有默认样式

浏览器的 **User Agent Stylesheet**（浏览器内置样式表）是 HTML 规范的刻意设计，目的是在没有自定义 CSS 的情况下，让文档「看起来能看」。核心目的：

1. **基本可读性**：段落有间距、标题有字号，链接有颜色，裸 HTML 页面可读
2. **语义传达**：不同标签在视觉上有所区分
3. **向后兼容**：早期互联网页面不依赖外链 CSS，内置样式是唯一样式来源

不同浏览器（Chrome、Firefox、Safari）的默认值存在差异，这正是 CSS Reset / Normalize 诞生的背景。

---

## 二、normalize.css vs reset.css vs sanitize.css 对比

### 2.1 CSS Reset（重置样式）

**理念**：先破后立 —— 把所有浏览器默认样式全部清零，再自行按需重建。

```css
/* YUI3 Reset 核心代码 */
body, div, dl, dt, dd, ul, ol, li,
h1, h2, h3, h4, h5, h6,
pre, form, fieldset, input, textarea, p, blockquote, th, td {
  margin: 0; padding: 0;
}
table {
  border-collapse: collapse; border-spacing: 0;
}
fieldset, img { border: 0; }
img { display: block; }
ol, ul { list-style: none; }
caption, th { text-align: left; }
h1, h2, h3, h4, h5, h6 { font-weight: normal; font-size: 100%; }
q:before, q:after { content: ''; }
```

**缺点**：暴力清零，丢失有用的默认样式（button、input 的系统外观），`*{ }` 有性能问题。

### 2.2 normalize.css（规范化样式）

**理念**：保留有用的浏览器默认样式，消除浏览器差异，修复跨浏览器 bug。核心目标：

| 目标 | 说明 |
|------|------|
| 保护有用默认样式 | 不清零，保留 button/input 等浏览器原生样式 |
| 一般化处理 | 为大部分 HTML 元素提供一致的基准样式 |
| 修复浏览器 BUG | 针对各浏览器的已知样式 BUG 进行修复 |
| 解释性注释 | 每个规则都有注释说明原因 |
| 支持 HTML5 新元素 | main/header/nav 等需 display:block |

```css
/* normalize.css 核心示例 */
button {
  overflow: visible; /* IE 修复 */
  -webkit-appearance: button; appearance: button;
}
img { border-style: none; vertical-align: middle; }
a { color: inherit; text-decoration: none; }
main, header, nav, section, article, aside, footer {
  display: block; /* IE9 及之前需要 */
}
```

被用于 Twitter Bootstrap、HTML5 Boilerplate、GOV.UK、Rdio。

### 2.3 sanitize.css

**理念**：在 normalize.css 基础上，额外处理无障碍（Accessibility）和安全性。

```css
/* sanitize.css 额外处理 */
img, video, svg {
  max-width: 100%; height: auto; /* 防止撑破布局 */
}
[hidden] { display: none !important; } /* 确保 hidden 生效 */
input, button, select, textarea {
  font-family: inherit; font-size: inherit;
  line-height: inherit; color: inherit;
}
```

### 2.4 对比总览

| 维度 | CSS Reset | normalize.css | sanitize.css |
|------|:---:|:---:|:---:|
| 核心理念 | 全部清零，再重建 | 消除差异，保留有用样式 | 规范化 + 无障碍 + 安全 |
| 跨浏览器一致性 | 最高 | 高 | 高 |
| 工作量 | 高 | 中 | 低 |
| 无障碍支持 | 差 | 中 | 强 |
| SVG/媒体安全 | 无 | 无 | 有 |
| 适合场景 | 设计系统级定制 | 通用项目 | 高安全/无障碍需求 |

---

## 三、关键默认行为详解

### 3.1 box-sizing

默认值：**`content-box`**（width 只含内容区）。这是现代布局的核心坑。

```css
/* content-box（默认） */
.sidebar { width: 300px; padding: 20px; border: 1px solid #ccc; }
/* 实际渲染宽度 = 300 + 20*2 + 1*2 = 342px —— 数学痛苦 */

/* border-box（现代标准） */
.sidebar { box-sizing: border-box; width: 300px; padding: 20px; border: 1px solid #ccc; }
/* 实际渲染宽度 = 300px —— 所见即所得 */
```

### 3.2 margin collapse（外边距折叠）

三个场景会发生折叠：

```html
<!-- 场景 1：相邻兄弟元素垂直 margin 取 max -->
<div style="margin-bottom: 20px">A</div>
<div style="margin-top: 40px">B</div>
<!-- 实际间距 = max(20,40) = 40px，不是 60px -->

<!-- 场景 2：父子元素（无 border/padding 阻隔） -->
<div style="margin-top: 20px"><div style="margin-top: 40px">child</div></div>
<!-- 折叠后取 max(20,40) = 40px -->

<!-- 场景 3：空块自身上下 margin 折叠 -->
<div style="margin: 20px 0"></div>
<!-- 上下 margin 也会折叠 -->
```

**阻止折叠**：`overflow: hidden`、`border-top: 1px solid transparent`、`display: flex`（BFC 阻断）。

### 3.3 font-size 默认值

浏览器默认基础字号 `16px`。`rem` 基于根元素固定换算，`em` 基于当前元素换算（易受父元素影响导致嵌套放大）。

```css
/* em 的嵌套问题 */
.parent { font-size: 20px; }
.parent h1 { font-size: 2em; } /* 2 * 20px = 40px，而非 32px */

/* 正确做法：始终用 rem */
html { font-size: 16px; }
h1 { font-size: 2rem; } /* 始终 32px */
```

---

## 四、Modern CSS Reset

随着 IE 基本消亡，面向现代浏览器的 CSS Reset 变得非常精简。

### 4.1 modern-normalize

[modern-normalize](https://github.com/sindresorhus/modern-normalize)（Sindre Sorhus 维护）是 normalize.css 的现代化精简版。

**与 normalize.css 的核心区别**：

| 特性 | normalize.css | modern-normalize |
|------|:---:|:---:|
| box-sizing | 需手动设置 | ✅ 默认 border-box |
| 体积 | ~300 行 | 小 60% |
| 浏览器支持 | 旧浏览器 | 仅最新 Chrome/Safari/Firefox |
| tab-size | 默认 8 | 默认 4 |

```bash
npm install modern-normalize
```

```css
/* modern-normalize 核心内容 */
*, *::before, *::after { box-sizing: border-box; }
html { -moz-tab-size: 4; tab-size: 4; }
body { font-family: var(--system-ui, system-ui,...); margin: 0; }
```

### 4.2 Josh Comeau's Modern CSS Reset

前端教育者 Josh Comeau 在 2020 年发布的现代 Reset，被社区广泛引用：

```css
/* https://www.joshwcomeau.com/css/custom-css-reset/ */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
img, picture, video, canvas, svg { display: block; max-width: 100%; }
input, button, textarea, select { font: inherit; }
p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }
#root, #__next { isolation: isolate; }
```

**亮点**：
- `overflow-wrap: break-word`：防止长 URL 撑破布局
- `#root, #__next isolation`：防止 CSS-in-JS / React 根元素的 margin 穿透
- `font: inherit`：表单元素默认不继承字体，统一行为

### 4.3 Mini Modern Reset（推荐）

```css
/* 现代项目 Minimal Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  min-height: 100vh;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
ul:where([role='list']), ol:where([role='list']) {
  list-style: none; margin: 0; padding: 0;
}
img, video { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
button { background: none; border: none; cursor: pointer; }
```

---

## 五、CSS Custom Properties 设计令牌

CSS 变量（自定义属性）是设计令牌（Design Tokens）的最佳载体。

### 5.1 设计令牌架构

```css
/* design-tokens.css */
:root {
  /* === 颜色 === */
  --color-primary: #3b82f6;
  --color-text: #111827;
  --color-muted: #6b7280;
  --color-bg: #ffffff;

  /* === 字体 === */
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: 'Fira Code', Consolas, monospace;
  --text-base: 1rem;   /* 16px */
  --text-sm: 0.875rem; /* 14px */

  /* === 间距 === */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-4: 1rem;     /* 16px */
  --space-8: 2rem;     /* 32px */

  /* === 圆角 === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-full: 9999px;

  /* === 阴影 === */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);

  /* === 过渡 === */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #e5e7eb;
    --color-bg: #111827;
    --color-primary: #60a5fa;
  }
}
```

### 5.2 Reset + 设计令牌组合

```css
/* reset.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}
img { max-width: 100%; display: block; }
ul { list-style: none; padding: 0; }
a { color: var(--color-primary); }
button { cursor: pointer; border: none; background: transparent; }
```

### 5.3 局限性

1. 不支持嵌套变量（需预处理器如 Sass）
2. 级联问题：变量有级联，可能产生非预期覆盖
3. 旧浏览器不兼容（构建工具可处理）
4. 无法条件覆盖（需借助 `[data-*]` 或 JS）

---

## 六、常见面试问题

### Q1: `margin: 0` vs `margin: 0 !important` vs `margin-block-start` 区别

`margin: 0` 是普通声明，`margin: 0 !important` 强制覆盖所有规则（在 Reset 中用于解决特定冲突，正常项目应避免）。`margin-block-start` 是 CSS 逻辑属性，对应书写模式方向（默认等于 `margin-top`），现代 CSS 推荐用逻辑属性以支持 RTL/垂直书写模式。

---

### Q2: CSS Reset 会影响可访问性吗？

会的。传统 Reset 重置 button 的 padding 可能破坏可点击区域，导致键盘可访问性受损。正确做法是使用 sanitize.css，或在 Reset 中保留：

```css
:focus-visible {
  outline: 2px solid Highlight;
  outline-offset: 2px; /* WCAG 2.1 焦点可见性要求 */
}
@media (prefers-reduced-motion) {
  * { animation: none !important; transition: none; }
}
```

---

### Q3: 如果页面上有两种设计主题，CSS Reset 应该怎么处理？

最佳实践是使用 CSS 自定义属性作为设计令牌，通过选择器覆盖变量：

```css
:root { --bg: #fff; --text: #111; }
[data-theme="dark"] { --bg: #0d0d0d; --text: #eee; }
body { background: var(--bg); color: var(--text); }
```

Reset 本身无需改动，只需在 `<html>` 上设置 `data-theme` 属性即可切换。也可使用 `@media (prefers-color-scheme: dark)` 自动检测系统主题。

> 📚 参考：
> - [normalize.css 官方仓库](https://github.com/necolas/normalize.css)
> - [modern-normalize 官方仓库](https://github.com/sindresorhus/modern-normalize)
> - [Josh Comeau's Custom CSS Reset](https://www.joshwcomeau.com/css/custom-css-reset/)
> - [MDN: CSS Reset 文档](https://developer.mozilla.org/zh-CN/docs/Glossary/CSS_reset)
> - [MDN: Using CSS custom properties](https://developer.mozilla.org/zh-CN/docs/Web/CSS/Using_CSS_custom_properties)
> - [MDN: Margin collapsing](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_box_model/Mastering_margin_collapsing)
