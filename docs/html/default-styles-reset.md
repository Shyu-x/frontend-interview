---
title: 清除浏览器默认样式
description: 浏览器默认样式的来源，以及 normalize.css、reset.css、sanitize.css 的取舍。
---

# 清除浏览器默认样式

## 1. 为什么浏览器有默认样式

浏览器的 **User Agent Stylesheet**（浏览器内置样式表）是 HTML 规范的刻意设计，目的是在没有自定义 CSS 的情况下，让文档「看起来能看」。核心目的：

1. **基本可读性**：段落有间距、标题有字号，链接有颜色
2. **语义传达**：不同标签在视觉上有所区分
3. **向后兼容**：早期互联网页面不依赖外链 CSS，内置样式是唯一样式来源

---

## 2. normalize.css vs reset.css vs sanitize.css

### 2.1 CSS Reset（重置样式）

**理念**：先破后立 —— 把所有浏览器默认样式全部清零，再自行按需重建。

```css
/* 最简化的 reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* YUI3 Reset 核心代码 */
body, div, dl, dt, dd, ul, ol, li,
h1, h2, h3, h4, h5, h6,
pre, form, fieldset, input, textarea, p, blockquote, th, td {
  margin: 0; padding: 0;
}
table { border-collapse: collapse; border-spacing: 0; }
fieldset, img { border: 0; }
img { display: block; }
ol, ul { list-style: none; }
```

**缺点**：暴力清零，丢失有用的默认样式（button、input 的系统外观）。

### 2.2 normalize.css（规范化样式）

**理念**：保留有用的浏览器默认样式，消除浏览器差异，修复跨浏览器 bug。

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

被用于 Twitter Bootstrap、HTML5 Boilerplate、GOV.UK。

### 2.3 sanitize.css

**理念**：在 normalize.css 基础上，额外处理无障碍（Accessibility）和安全性。

```css
/* sanitize.css 额外处理 */
img, video, svg { max-width: 100%; height: auto; }
[hidden] { display: none !important; }
input, button, select, textarea {
  font-family: inherit; font-size: inherit;
  line-height: inherit; color: inherit;
}
```

---

## 3. 常见默认样式清除

```css
/* 移除列表标记 */
ul, ol { list-style: none; }

/* 图片：去除底部间隙（行内块元素默认 baseline 对齐） */
img, video { display: block; width: 100%; }

/* 去除 a 和 button 的默认样式 */
a { color: inherit; text-decoration: none; }
button { font: inherit; cursor: pointer; border: none; background: none; }

/* 表格：合并边框 */
table { border-collapse: collapse; }

/* 表单元素 */
input, textarea, select {
  font: inherit;
  outline: none; /* 通常需要自定义 focus 样式 */
}

/* 隐藏元素但保持可访问性 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## 4. 面试 follow-up 问题

### 4.1 Q1: CSS Reset 和 normalize.css 各自适合什么场景？

**答案：**
- **CSS Reset**：适合完全自定义 UI 的项目（如设计系统、组件库），需要从零构建所有样式。缺点是会丢失浏览器原生的 button/input 样式，需要自己实现。
- **normalize.css**：适合需要保留部分原生行为但消除浏览器差异的项目（如内容型网站、CMS），或依赖浏览器原生表单控件的场景。

---

### 4.2 Q2: `box-sizing: border-box` 为什么推荐全局设置？

**答案：**
传统 `content-box`（标准盒模型）让 width/height 只包含内容区，padding 和 border 会撑大元素，导致布局计算复杂（特别是需要精确计算宽度的场景）。

`border-box` 让 width/height 包含 padding 和 border，布局更直观：

```css
/* content-box: width=200px + padding:40px + border:4px = 244px 实际宽度 */
.box1 { width: 200px; padding: 20px; border: 2px solid #333; }

/* border-box: width=200px 包含 padding 和 border */
.box2 { box-sizing: border-box; width: 200px; padding: 20px; border: 2px solid #333; }
```

现代 CSS 框架（Bootstrap、Tailwind）默认使用 `border-box`，已成为事实标准。

---

### 4.3 Q3: `.sr-only` 的作用是什么？为什么不用 `display:none`？

**答案：**
`.sr-only`（Screen Reader Only）让元素视觉上隐藏但仍可被屏幕阅读器读取：

| 方式 | 视觉隐藏 | 屏幕阅读器 | 搜索引擎 |
|------|---------|-----------|---------|
| `display:none` | 是 | 否 不读 | 否 不索引 |
| `visibility:hidden` | 是 | 否 不读 | 否 不索引 |
| `opacity:0` | 是 | 取决于实现 | 是 索引 |
| `.sr-only` | 是 | 是 读 | 是 索引 |

典型场景：图标按钮（`<button><svg></svg></button>`）需要为屏幕阅读器提供 "搜索" 文本。

---

> 参考：
> - https://necolas.github.io/normalize.css/ （normalize.css 官方）
> - https://github.com/csstools/sanitize.css （sanitize.css）
> - https://github.com/sindresorhus/modern-normalize （modern-normalize）
