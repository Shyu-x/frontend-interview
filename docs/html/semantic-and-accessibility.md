---
title: 语义化与无障碍
description: HTML 语义化的原理与模板，以及微格式、ARIA、WCAG 与屏幕阅读器相关的无障碍知识。
---

# 语义化与无障碍

## 1. HTML 语义化

### 1.1 定义与核心原理

**HTML 语义化**是指使用具有明确含义的 HTML 标签来描述页面结构和内容，使机器（浏览器、爬虫、屏幕阅读器）和开发者都能理解代码的意图。

**核心原则：**
> "Use an element for its intended purpose. If it is a button, use `<button>`. If it is a link, use `<a>`."

```html
<!-- 非语义化写法 -->
<div class="header">
  <div class="nav">
    <div class="nav-item">首页</div>
  </div>
</div>
<div class="content">
  <div class="article">
    <div class="title">文章标题</div>
    <div class="text">文章内容...</div>
  </div>
</div>

<!-- 语义化写法 -->
<header>
  <nav>
    <a href="/">首页</a>
  </nav>
</header>
<main>
  <article>
    <h1>文章标题</h1>
    <p>文章内容...</p>
  </article>
</main>
```

**语义化的核心价值：**

| 维度 | 价值 |
|------|------|
| **可访问性（a11y）** | 屏幕阅读器能正确识别页面结构，视觉障碍用户可顺畅导航 |
| **SEO** | 搜索引擎能理解页面主题和内容层级，提升排名和摘要质量 |
| **可维护性** | 开发者通过标签名即可理解代码意图，降低协作成本 |
| **跨设备兼容** | 语义化结构在解析时更稳定，不依赖特定 CSS 类名或样式 |

### 1.2 产生背景与历史演进

**为什么需要语义化标签？**

| 历史阶段 | 特征 | 问题 |
|---------|------|------|
| HTML 4.01 | `<div>` 被大量滥用做布局 | 机器无法区分"导航区"和"正文区" |
| XHTML 1.0 | 严格语法，推动标准化 | 仍缺乏页面结构语义 |
| **HTML5（2014）** | 引入 `<header>/<nav>/<article>/<section>/<main>` | 浏览器兼容性（现均已解决） |
| WCAG 2.1（2018） | POUR 原则系统化 | 与 HTML5 语义化并行发展 |
| WAI-ARIA 1.2（2023） | 自定义组件语义补充 | 针对复杂 SPA 组件 |

**语义化解决了 5 个核心问题：**

1. **`<div>` 地狱**：机器无法区分 `div class="nav"` 和 `div class="sidebar"`
2. **SEO 瓶颈**：早期爬虫靠 title/meta/关键词密度，无法理解页面结构层次
3. **无障碍鸿沟**：视障用户依赖屏幕阅读器，`div` 对阅读器毫无含义
4. **可维护性危机**：`div class="box-1"` 对新加入的开发者零含义提示
5. **跨团队协作**：设计师、前端、后端需要共同的结构语言

### 1.3 运行机制：浏览器如何解析语义标签

```
HTML 源码
  ↓
[解析器 Parser] → 构建 DOM 树（所有节点，包括语义元素）
  ↓
[CSS 计算] → 样式计算（UA 样式表对语义元素有默认样式）
  ↓
[Accessibility Tree 生成]
  ↓  映射为 Accessibility API
  ↓  (Windows: IAccessible2 / macOS: NSAccessibility / Linux: ATK)
  ↓
屏幕阅读器（NVDA/JAWS/VoiceOver）消费 Accessibility API
```

**UA 样式表内置语义：**
```css
/* 浏览器内置默认样式（Chrome 简化示例） */
nav, main, article, section, aside, header, footer { display: block; }
button {
  display: inline-block;
  /* 内置 focus ring、cursor: pointer、border 等 */
}
a { color: -webkit-link; text-decoration: underline; }
```

### 1.4 代码级示例：完整语义化页面模板

```html
<!DOCTYPE html>
<!-- 第 1 段：文档类型与根元素 —— 声明让浏览器进入 HTML5 标准模式，并标记整页的主语言 -->
<!-- `<!DOCTYPE html>` 必须是文件第一个字符，前面出现空白或注释在某些旧浏览器会退回 quirks 模式，盒模型尺寸计算随之改变；lang="zh-CN" 让屏幕阅读器选择中文发音、也让搜索引擎与翻译服务判定语种 -->
<html lang="zh-CN">
<head>
<!-- 第 2 段：head 基础元信息 —— 字符编码、移动端视口与页面标题，构成首屏渲染与 SEO 的最小配置 -->
<!-- charset 必须出现在文档前 1024 字节内，否则浏览器可能先按错误编码解析出乱码后才回退重解析；viewport 的 initial-scale=1 关掉移动端默认缩放，同时刻意不写 user-scalable=no，避免破坏用户放大阅读的无障碍能力 -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>前端技术博客 — 文章列表</title>
<!-- 第 3 段：schema.org JSON-LD 结构化数据 —— 给爬虫的机器可读元信息，不参与页面渲染 -->
<!-- 原注释：schema.org JSON-LD 结构化数据。数据流是"爬虫读 script 内容 → 生成富媒体摘要"，因此内容必须与页面可见文字一致，否则属于作弊；datePublished 必须是 ISO 8601，@type 决定 Google 展示为文章卡片而非普通网页 -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "前端技术博客",
    "author": { "@type": "Person", "name": "张三" },
    "datePublished": "2026-05-10"
  }
  </script>
</head>
<body>
<!-- 第 4 段：跳链（skip link）—— 键盘与屏幕阅读器用户可直接越过导航到正文 -->
<!-- 原注释：跳链：键盘用户直接跳过导航到主要内容。它必须是 body 内第一个可聚焦元素才能率先响应 Tab；href="#main-content" 依赖目标 id 存在且可聚焦，本项目用 CSS（.skip-link）在默认态把它视觉隐藏、聚焦时才显现 -->
  <a href="#main-content" class="skip-link">跳转到主要内容</a>

<!-- 第 5 段：页头与全局主导航 —— 用 landmark 语义划分站点级导航区域 -->
<!-- role="banner"/"navigation" 与原生 <header>/<nav> 重复，这里显式写出是为了兼容仍需 role 的老旧辅助技术；aria-label 区分同一页面上多个 nav（主导航 vs 页脚导航）；aria-current="page" 是唯一标识"当前所在页"的语义，不能靠 CSS class 代替 -->
  <header role="banner">
    <nav role="navigation" aria-label="主导航">
      <ul>
        <li><a href="/" aria-current="page">首页</a></li>
        <li><a href="/articles">文章</a></li>
      </ul>
    </nav>
  </header>

<!-- 第 6 段：主内容区骨架 —— main + section + article 头部的三级语义嵌套 -->
<!-- role="main" 保证全页只有一个主内容锚点；section 的 aria-labelledby 指向 h1 的 id，从而把这个 section 变成有名字的区域（读屏用户可按区域跳转），比 aria-label 更好之处在于复用可见标题、避免文案重复维护；article 表示可独立分发的内容单元，嵌套的 header 只服务于该文章而非整页 -->
  <main id="main-content" role="main">
    <section aria-labelledby="section-title">
      <h1 id="section-title">最新文章</h1>
      <article>
        <header>
          <h2>CSS Grid 布局实战</h2>
          <p>
            <!-- datetime 给机器读（可被日历/爬虫解析），标签内文本给人读，两者格式不同是刻意为之，改文本不影响语义 -->
            <time datetime="2026-05-10">2026年5月10日</time>
          </p>
        </header>
<!-- 第 7 段：配图与图注 —— figure/figcaption 把图片和它的说明绑成一个语义整体 -->
<!-- 显式写 width/height 是为了让浏览器在图片下载完成前就按宽高比预留空间，避免布局抖动（CLS）；alt 描述的是内容而非文件名；figcaption 与 alt 互为补充，不重复即可 -->
        <figure>
          <img src="grid-demo.png" alt="CSS Grid 三栏布局示意图" width="800" height="400">
          <figcaption>图1: CSS Grid 三栏响应式布局示例</figcaption>
        </figure>
<!-- 第 8 段：文章尾部的标签元数据 —— 用 rel="tag" 声明这是指向该文章所属分类的关系链接 -->
<!-- rel 属性是给爬虫/浏览器看的关系声明，spec 中的 tag 类型表示链接目标是本文的标签页；放在 article 内部的 footer 里，语义上归属于这篇文章，而不是整页 -->
        <footer>
          <a href="/tag/css" rel="tag">CSS</a>
        </footer>
      </article>
    </section>
  </main>

<!-- 第 9 段：侧边栏补充内容 —— 与主内容弱相关，用 aside + complementary 标记以便快速跳过 -->
<!-- 注意这里的标题从 h2 跳到 h3：HTML 大纲要求层级连续，页面只有一个 h1，文章标题占 h2，侧栏子模块因此从 h3 起；aria-labelledby 同样把 section 命名为"热门文章" -->
  <aside role="complementary" aria-label="侧边栏">
    <section aria-labelledby="popular-title">
      <h3 id="popular-title">热门文章</h3>
      <ul>
        <li><a href="/article-2">React 18 新特性</a></li>
      </ul>
    </section>
  </aside>

<!-- 第 10 段：整页页脚 —— contentinfo 定位版权/法律类信息区，内部 nav 无需 aria-label 之外的额外 role -->
<!-- 页脚 nav 有独立 aria-label，避免与上方"主导航"重名导致读屏的 landmarks 列表里出现两个相同项而无法区分；landmark 数量越多跳转负担越大，所以只在必要处加语义 -->
  <footer role="contentinfo">
    <nav aria-label="页脚导航">
      <a href="/privacy">隐私政策</a>
    </nav>
  </footer>
</body>
</html>
```

### 1.5 `<section>` vs `<article>` vs `<div>` 区别

| 维度 | `<section>` | `<article>` | `<div>` |
|------|-------------|-------------|---------|
| 语义 | 文档中的章节（主题相关） | 独立可分发的内容单元 | 纯容器，无语义 |
| 标题 | **一般需要 `<h1>-<h6>`**（规范要求） | 通常有标题 | 无要求 |
| 使用场景 | 书籍章节、功能区块 | 博客文章、新闻、产品卡片 | 纯粹视觉分组、CSS 样式钩子 |
| 独立性 | 依赖周围内容 | **可独立存在**，脱离上下文仍完整 | 无所谓独立 |
| 对应 ARIA | `role="region"` | `role="article"` | 无默认 ARIA role |

> **黄金判断法**："这段内容拔出来放在 RSS 订阅里，读者能看懂吗？" 能 → `<article>`；不能但有意义关联 → `<section>`；纯布局 → `<div>`。

### 1.6 高频面试追问

**Q1：`<div role="banner">` 和 `<header>` 在无障碍层面是完全等价的吗？**
> 不完全等价。`<header>` 在**顶级页面**时语义等价于 `role="banner"`，但当 `<header>` 嵌套在 `<article>` 或 `<section>` 内时，它的语义变为"该区块的头部"，而非整页 banner。
> `<div role="banner">` 始终声明为 banner，不受嵌套影响。
> **建议**：优先使用原生语义标签 `<header>`，只有在无法用原生标签时才用 ARIA。

**Q2：为什么 `<button>` 比 `<div onclick>` 更好？**
> `<button>` 原生具有：键盘可操作（Space/Enter）、聚焦管理、内置 `cursor: pointer`、无障碍角色声明、UA 样式、禁止文本选择等行为。
> `<div onclick>` 需要手动补充 `tabindex="0"`、`onkeydown`（处理 Enter/Space）、`role="button"`、CSS 样式——而这些只要一个 `<button>` 标签就全部覆盖了。

**Q3：屏幕阅读器读取 SPA 时，JavaScript 动态注入的内容能被感知吗？**
> 默认情况下**不能感知**。解决方案：
>
> 1. **ARIA Live Regions**：动态内容区域设置 `aria-live="polite"`（不打断）或 `"assertive"`（打断）
> 2. **MutationObserver**：监听 DOM 变化，向 live region 写入内容
> 3. **路由切换时焦点管理**：SPA 路由跳转后，用 `focus()` 将焦点移到新页面的 `<main>` 或 `<h1>`

**Q4："No ARIA is better than bad ARIA" 这句话怎么理解？**
> WebAIM 2024 年调查数据显示：使用 ARIA 的页面平均无障碍错误率高出 41%。
> 原因：冗余 ARIA（如 `<nav role="navigation">`）、错误状态同步（如 `aria-checked` 但 DOM 未更新）、过时的 ARIA 属性。
> **原则**：能用原生 HTML 实现的功能，坚决不用 ARIA。

> 参考：
>
> - [MDN — HTML Semantic Elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element)
> - [MDN — ARIA Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
> - [W3C WAI — WCAG 2.1](https://www.w3.org/WAI/standards-guidelines/wcag/)
> - [Schema.org — JSON-LD](https://schema.org/docs/gs.html)

## 2. 微格式（microdata）/ aria-* / a11y / screen reader

### 2.1 定义与核心原理

**微格式（HTML Microdata）** 是在 HTML 中嵌入语义化机器可读数据的 W3C 标准（现已逐渐被 JSON-LD 取代）。通过 `itemscope`/`itemprop` 属性，将语义数据嵌入 HTML 供搜索引擎和工具解析。

**ARIA（Accessible Rich Internet Applications）** 是一套为复杂自定义组件补充语义的标准，通过向 **Accessibility Tree** 注入额外语义节点，让屏幕阅读器能正确理解自定义组件的结构和状态。

### 2.2 微格式 vs JSON-LD（Schema.org）

**微格式（旧标准，逐步淘汰）：**
```html
<div itemscope itemtype="https://schema.org/Person">
  <h1 itemprop="name">张三</h1>
  <img itemprop="image" src="photo.jpg" alt="照片">
  <span itemprop="jobTitle">高级前端工程师</span>
  <a itemprop="email" href="mailto:zhang@example.com">邮箱</a>
</div>
```

**JSON-LD（现代标准，推荐）：**
```html
<!-- 在 <head> 中嵌入，SEO 最优，不污染 DOM 语义 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "张三",
  "jobTitle": "高级前端工程师",
  "email": "mailto:zhang@example.com",
  "image": "https://example.com/photo.jpg"
}
</script>
```

**为什么 JSON-LD 优于微格式？**

| 维度 | 微格式（Microdata） | JSON-LD |
|------|---------------------|--------|
| 位置 | 内嵌 HTML，污染 DOM | 独立 script 块，不影响 DOM |
| 语法验证 | 依赖 HTML 解析器 | 独立 JSON 验证 |
| 工具支持 | 逐渐减少 | Google / Bing / Yandex 全面支持 |
| 维护性 | 属性散落各处 | 集中在 head，维护简单 |
| 推荐度 | 否 逐步淘汰 | 是 **强烈推荐** |

### 2.3 ARIA 属性全景详解

**ARIA 的三条黄金定律（必背）：**
> 1. **能用原生 HTML 实现的功能，不使用 ARIA**
> 2. **不要在原生 HTML 元素上添加冗余 ARIA**（如 `<nav role="navigation">` 是冗余的）
> 3. **所有 ARIA 属性都必须有效**

**role（角色）分类：**

| 类别 | role 值 | 说明 |
|------|---------|------|
| 文档结构 | `banner/navigation/main/contentinfo/complementary` | 对应 HTML5 语义标签 |
| 组件角色 | `button/checkbox/radio/menuitem/tab/tabpanel` | 对应原生交互组件 |
| 组件结构 | `list/listitem/tree/treeitem` | 列表类组件 |
| 实时区域 | `status/alert/log/marquee/progressbar` | 动态内容区 |

**常用 aria-* 属性详解：**

```html
<!-- 标签类：提供可访问名称 -->
<button aria-label="关闭对话框">X</button>
<button aria-labelledby="title-id">打开</button>

<!-- 描述类：提供额外说明 -->
<input aria-describedby="error-hint password-hint">
<p id="error-hint">此字段必填</p>
<p id="password-hint">至少8位，包含数字和字母</p>

<!-- 状态类：声明组件状态 -->
<button aria-pressed="false">收藏</button>           <!-- 切换按钮 -->
<input aria-checked="true" type="checkbox">           <!-- 复选框 -->
<div aria-expanded="false" aria-controls="menu">菜单</div> <!-- 折叠 -->

<!-- 实时区域：通知屏幕阅读器动态变化 -->
<div aria-live="polite">新消息：3条未读</div>    <!-- 等待空闲时朗读 -->
<div aria-live="assertive">操作失败</div>        <!-- 立即打断当前朗读 -->
<div aria-atomic="true">更新计数器：5/10</div>  <!-- 整个区域作为整体播报 -->
```

**aria-live 的取值与行为：**

| 值 | 触发时机 | 典型场景 |
|---|---------|---------|
| `off`（默认） | 不通知 | 静态内容 |
| `polite` | 等待当前朗读结束后通知 | 消息列表追加、非紧急更新 |
| `assertive` | **立即打断**当前朗读 | 错误提示、支付失败、紧急通知 |

> **警告**：`aria-live="assertive"` 会立即打断用户当前操作，使用时极其谨慎——用 `polite` 能解决的场景坚决不用 `assertive`。

### 2.4 无障碍核心：WCAG POUR 原则

| 原则 | 核心要求 | 关键检查点 |
|------|---------|-----------|
| **P — Perceivable（可感知）** | 所有信息可通过某种方式感知 | 图片有 alt、视频有字幕、颜色对比度 ≥ 4.5:1 |
| **O — Operable（可操作）** | 所有功能可通过键盘操作 | Tab 导航、focus 可见、无键盘陷阱 |
| **U — Understandable（可理解）** | 信息和操作可理解 | 一致导航、错误提示、语言声明 `lang` |
| **R — Robust（健壮）** | 兼容各类辅助技术 | 符合 HTML 规范、ARIA 正确使用 |

**WCAG 2.1 AA 合规 checklist（前端必须检查项）：**

- [ ] 所有图片有 `alt` 属性（装饰性图片用 `alt=""` + `aria-hidden="true"`）
- [ ] 表单有显式 `<label>` 关联（不能用 placeholder 替代 label）
- [ ] 颜色对比度 ≥ 4.5:1（文字）/ 3:1（大文字 ≥ 18pt）
- [ ] 所有交互控件可通过键盘聚焦和操作
- [ ] Focus 顺序合理（Tab 顺序与视觉顺序一致）
- [ ] Focus 样式可见（不能 `outline: none` 而无替代）
- [ ] 无 heading 跳级（h1 → h3，跳过 h2 是不合规的）
- [ ] 页面有 `lang` 属性（`<html lang="zh-CN">`）

### 2.5 屏幕阅读器工作原理

```
DOM 树
  ↓
[Accessibility Tree 生成器]
  ↓ 注入 ARIA 语义
  ↓
Accessibility API 节点（Windows: IAccessible2 / macOS: NSAccessibility）
  ↓
屏幕阅读器（NVDA + Firefox / JAWS + Chrome / VoiceOver + Safari）
  ↓
语音/盲文输出给用户
```

**常见屏幕阅读器：**
| 平台 | 阅读器 | 推荐组合 |
|------|--------|---------|
| Windows | NVDA（免费）| + Firefox |
| Windows | JAWS（商业）| + Chrome |
| macOS/iOS | VoiceOver | + Safari |
| Android | TalkBack | + Chrome |

### 2.6 常见坑点与最佳实践

| 坑点 | 错误写法 | 正确写法 |
|------|---------|---------|
| placeholder 替代 label | `<input placeholder="邮箱">` | `<label for="e">邮箱</label><input id="e" placeholder="...">` |
| 装饰性图片无 alt | `<img src="decoration.svg">` | `<img src="decoration.svg" alt="" aria-hidden="true">` |
| 冗余 ARIA | `<nav role="navigation">` | `<nav>`（原生已携带 role） |
| 图片按钮无标签 | `<button><img src="close.png"></button>` | `<button><img src="close.png" alt="关闭"></button>` 或 `<button aria-label="关闭">` |
| 动态更新无通知 | `div.textContent = '已保存'` | `<div aria-live="polite">已保存</div>` |
| 模态框无焦点锁定 | dialog 打开后 Tab 跳到背景 | 焦点锁定在 dialog 内，关闭后焦点回触发元素 |

**Focus 管理最佳实践（模态框）：**
```javascript
class Modal {
  constructor() {
    this.previousFocus = null; // 记住打开前的焦点元素
  }

  open() {
    this.previousFocus = document.activeElement; // 记录
    this.dialog.showModal();
    // 焦点锁定到第一个可聚焦元素
    this.dialog.querySelector('button, [href], input').focus();
  }

  close() {
    this.dialog.close();
    // 焦点回到触发元素
    this.previousFocus?.focus();
  }
}

// CSS：dialog 外部不可聚焦
dialog::backdrop { background: rgba(0,0,0,0.5); }
dialog:not([open]) { display: none; }
```

### 2.7 高频面试追问

**Q1：`aria-label`、`aria-labelledby`、`aria-describedby` 三者的区别是什么？**
> `aria-label`：显式提供可访问名称，**覆盖**元素内部文本（当两者同时存在时，内部文本被忽略）
> `aria-labelledby`：引用页面中**另一个元素**的文本作为标签，优先级高于 `aria-label`
> `aria-describedby`：引用描述性文本，**补充** label，不替代——屏幕阅读器先读 label，再读 description
> 优先级：`aria-labelledby` > `aria-label` > 元素内部文本 > `aria-describedby`

**Q2：SPA 路由切换时，屏幕阅读器用户如何感知页面变化？**
> 默认情况下**无法感知**。解决方案：
>
> 1. 在每个页面 `<main>` 或 `<h1>` 上设置 `aria-live="polite"`
> 2. 路由切换时，向 live region 写入"已导航至 XX 页面"
> 3. 路由切换完成后，`focus()` 到新页面 `<h1>` 或 `<main>`
> 4. 配合 `document.title` 更新（屏幕阅读器会朗读标题）

**Q3：Lighthouse Accessibility 得分 100 分，是否等同于 WCAG 2.1 AA 合规？**
> **不等于**。Lighthouse 只能检测**静态可验证**的问题（约覆盖 WCAG 约 30-40% 的规则）。以下问题无法被自动检测：
>
> - 键盘焦点的实际顺序（需要手动 Tab 测试）
> - 颜色对比度的精确值（自动化只能检测 CSS 中的声明值）
> - 动态内容（AJAX/React/Vue 条件渲染）的无障碍性
> - 屏幕阅读器的真实朗读效果（必须用 NVDA/VoiceOver 实测）
> - 认知障碍用户的可用性

> 参考：
>
> - [W3C WAI — WCAG 2.1](https://www.w3.org/WAI/standards-guidelines/wcag/)
> - [MDN — ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
> - [MDN — ARIA Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
> - [WebAIM — WebAIM Million](https://webaim.org/projects/million/)
> - [axe-core — Accessibility Testing](https://www.deque.com/axe/)

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN HTML 元素参考](https://developer.mozilla.org/en-US/docs/Web/HTML/Element) | 按分类过一遍语义元素，能看清元素与 ARIA 角色的对应关系。 | 打开分类索引，逐个记下 nav、main、aside 的隐含角色，再用它们重写一个 div 布局。 |
| [HTML 规范：语义](https://html.spec.whatwg.org/multipage/semantics.html) | 规范原文界定 section、article、nav 的使用边界，比二手描述准确。 | 只读这三元素定义与内容模型，对照 MDN 描述差异，再为现有页面重选容器元素。 |
| [MDN HTML 内容分类](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Content_categories) | 内容模型决定元素能嵌在哪，是语义写作的底层规则。 | 读 flow、phrasing、sectioning 三类，解释 p 内为何不能放 div，再检查自己页面。 |
| [WHATWG HTML Living Standard](https://html.spec.whatwg.org/multipage/) | 语义与 ARIA 的最终依据，各方说法冲突时以它为准。 | 从目录进元素章节，读内容模型、属性表与 aria-* 全局属性，边读边做笔记。 |
| [Using microformats in HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Microformats) | 微格式用 class 表达语义，是理解微数据思路的低成本入口。 | 读 h-card 示例，照着给个人简介页加 microformats2 类名并验证。 |
| [HTML attribute reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes) | 全局属性表可确认 aria-* 等属性的适用元素与限制。 | 检索 aria- 前缀属性，读其可访问性说明，再为表单控件补上缺失属性。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Using microdata in HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Microdata) | 带完整 Person 微数据示例，可照着为页面补结构化数据。 | 抄一遍 itemscope/itemprop 示例，用验证器检查结构，再改写成自己的内容。 |
| [MDN Playground](https://developer.mozilla.org/en-US/play) | 无需搭建环境，即时验证语义元素与 aria 属性在小样中的效果。 | 粘贴语义元素与 aria 片段，切换属性观察结构差异，把结论写进笔记。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [A11Y Project 检查清单](https://a11yproject.com/checklist/) | 上线前自查清单，把无障碍要求落成可执行动作。 | 把清单存为检查项，对当前页面逐条勾选，记录未通过项及原因。 |
| [A11y Weekly](https://www.a11yweekly.com/) | 可访问性专题周报，持续跟进读屏与键盘测试的实践案例。 | 挑与读屏相关的几期，照其中方法对自己的页面做一次键盘与读屏走查。 |
| [web.dev Learn HTML](https://web.dev/learn/html) | 系统教程，示例与可访问性检查结合，适合从头打基础。 | 按章节顺序读语义与表单部分，在 CodePen 重做示例并补上键盘与读屏检查。 |
| [The A11Y Project](https://www.a11yproject.com/) | 社区可访问性权威站点，清单可直接用于真实页面审查。 | 用其清单逐项审查一个已有页面，修复发现的三个问题后复测。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格 | table/caption/th/scope、aria-sort | 原生 table 加虚拟滚动 | 虚拟滚动会删除行 DOM，需在容器补 role="grid" 与 aria-rowcount |
| 低端安卓机的首屏加载 | 用语义标签替代 div 嵌套 | 服务端渲染加原生标签 | 减少的 DOM 节点数要实测，不能只看标签名 |
| 多人协作白板 | canvas 无文本，需 aria 补齐 | canvas 加离屏文字摘要加 aria-live | 摘要更新要节流，否则读屏连续播报 |
| 电商商品列表进入搜索 | microdata、标题层级 | schema.org 的 Product 与 Offer | 结构化数据必须与可见内容一致 |
| 政务与企业站点合规改造 | 地标标签加跳转链接 | main/nav/header/footer 与 skip link | 一个页面只允许一个 main |
| 读屏用户填写长表单 | label/fieldset/legend/aria-describedby | 原生表单控件 | describedby 指向的节点必须存在且唯一 |
| 新闻聚合与正文抽取 | article/section/time、microdata | schema.org 的 Article | 时间要写 datetime 属性，不能只写中文日期 |
| 设计系统组件库 | 语义标签决定组件默认渲染 | Web Components 或框架组件 | 组件要提供 as 属性，允许替换渲染标签 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：运营要在订单列表里按列排序、按行核对，数据达到上万行。读屏用户用表格导航时，若缺少表头关联，会听不出每个数字属于哪一列。

**怎么用本页知识解决**：先把行列关系交给原生表格标签，排序状态交给 aria-sort，虚拟滚动只负责可见行。

```html
<table>                                  <!-- 原生表格，读屏能识别行列 -->
  <caption>订单列表</caption>            <!-- 说明表格用途，读屏先读它 -->
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">订单号</th>  <!-- 声明当前升序 -->
      <th scope="col">金额</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">A-1001</th>        <!-- 行首用 th，把本行绑到表头 -->
      <td>120.00</td>
    </tr>
  </tbody>
</table>
```

- caption 写在 table 内部，读屏进入表格时会先播报它。
- scope="col" 让列头关联整列，逐格朗读时能听到列名。
- scope="row" 让行首单元格成为本行的标签。
- 排序后更新 aria-sort 的值，读屏才知道当前按哪列排。
- 虚拟滚动删除行时，用 aria-rowcount 告诉读屏总行数。

**怎么度量收益**：axe-core 的 `th-has-data-cells` 与 `scope-attr-valid` 规则零违规。用 NVDA 加 Firefox，按 T 跳到表格，再用 Ctrl+Alt+方向键逐格走，记录听到列名所需的按键次数。

**什么时候不该用**：

- 只用于排版的网格不要用 table，读屏会把它当数据表播报行列坐标。
- 两列的键值对照用 dl，读屏读「术语—定义」比读行列坐标短。
- 只有一行一列的内容不要套表格，改用标题加段落。

#### 场景 2：多人协作白板

**业务背景**：白板用 canvas 画图，像素里没有文字，读屏读到的是一片空白。协同时多人改动，状态以秒级频率变化。

**怎么用本页知识解决**：给 canvas 一个整体标签，把图元状态同步成 DOM 里的文字摘要，再用 aria-live 播报并做节流。

```html
<div class="board">
  <canvas id="board-canvas" role="img"
          aria-label="白板画布"></canvas>   <!-- 画布需要一个可访问名称 -->
  <p id="board-summary" aria-live="polite">
    当前 3 个图形                          <!-- 供读屏读取的文字摘要 -->
  </p>
</div>
<script>
  const summary = document.getElementById('board-summary')
  let timer = null
  function onBoardChange (state) {
    clearTimeout(timer)                    // 合并短时间内的多次改动
    timer = setTimeout(() => {
      summary.textContent = `当前 ${state.shapes.length} 个图形`  // 只写文字
    }, 500)
  }
</script>
```

- role="img" 加 aria-label 让画布先有一个名字，读屏不会读成空白。
- 摘要节点必须是真实 DOM 文本，canvas 内部的绘制结果读屏拿不到。
- aria-live="polite" 让播报排队，不打断用户当前操作。
- 500 毫秒的合并窗口避免连续改动触发连续播报。
- 摘要只描述结构信息，不要试图逐条朗读每个图元。

**怎么度量收益**：用 axe-core 确认 canvas 有可访问名称。用 NVDA 记录一次新增图形到播报出现的延迟。用 PerformanceObserver 观察 long task 数量，确认摘要更新没有阻塞主线程。

**什么时候不该用**：

- 纯装饰的动效画布不要加 aria-live，读屏会被持续打断。
- 能用 DOM 画出的静态图表不要退回 canvas 再补 aria，直接输出列表或表格更省事。

#### 场景 3：内容站点的结构化数据

**业务背景**：文章站希望搜索与聚合平台识别标题、作者、发布时间。如果时间写成图片或纯中文文本，机器就抽不到字段。

**怎么用本页知识解决**：用 article 包住正文，用 time 的 datetime 给出机器格式，用 microdata 把字段名挂到可见节点上。

```html
<article itemscope itemtype="https://schema.org/Article">
  <h1 itemprop="headline">城市绿道使用报告</h1>   <!-- 标题与可见文本一致 -->
  <p>
    发布于
    <time itemprop="datePublished" datetime="2024-03-01">
      2024 年 3 月 1 日        <!-- 人读文本与机器格式分开写 -->
    </time>
  </p>
  <div itemprop="author" itemscope itemtype="https://schema.org/Person">
    <span itemprop="name">编辑部</span>
  </div>
</article>
```

- article 划定正文边界，聚合工具据此截取内容。
- time 的 datetime 属性给机器读，标签间的文字给人读。
- itemprop 挂在已经有可见文本的节点上，避免出现只在源码里存在的字段。
- 一个页面只有一篇文章时才用 Article，多篇摘要改用列表结构。
- 提交前核对字段值同页面上看到的内容是否一致。

**怎么度量收益**：用 Google Rich Results Test 检查「文章」项目能否被识别。在 Search Console 的「增强功能」报告里跟踪有效项目数与错误数。用 curl 取原始 HTML，确认字段出现在源码而不是渲染之后。

**什么时候不该用**：

- 内容由用户即时输入且没有审核流程时，先不要标 author，脏数据会进索引。
- 同一页混放多篇摘要时，不要给每段摘要都标 Article，改用 ItemList 描述列表关系。

### 行业先进实践

**WAI-ARIA Authoring Practices Guide（出处：W3C WAI-ARIA Authoring Practices Guide）**

做法是为每种组件列出键盘交互与角色属性的对应关系。它先约定行为再写代码，评审时能逐条对照。你的项目可以把它当作组件验收清单的模板。

**GOV.UK Design System 的组件文档（出处：GOV.UK Design System 官方文档）**

每个组件页面写明用到的标签、键盘行为与已知限制。它把语义决策写进文档，使用者不必重新判断。你的项目可以在设计系统里为每个组件加一节「语义与键盘」。

**Radix Primitives 的 asChild 模式（出处：Radix UI 官方文档）**

组件默认渲染一个语义元素，同时允许替换渲染节点并保留行为。它把「换外观不换语义」做成了接口。你的组件库可提供同类属性，避免调用方用 div 包一层。

**eslint-plugin-jsx-a11y（出处：开源项目 eslint-plugin-jsx-a11y）**

它在提交前拦截缺失 alt、错误 role 用法这类问题，把检查左移到编辑器。你的项目可以先只开推荐规则集，再按报错逐步收紧。

**axe-core 与 Lighthouse 的无障碍审计（出处：开源项目 axe-core / Chrome Lighthouse 官方文档）**

自动检查覆盖规则表中的条目，剩下的要靠人工与读屏验证。需核对官方文档：当前版本覆盖的规则清单，以及这些规则与 WCAG 版本的对应关系。

### 从学到用：落地路线

1. 试点：选一个读屏用户会用的表单页，改成原生标签与地标。验收：axe 无 critical 违规，人工读屏能走完一次提交。
2. 验证：在试点页记录任务耗时与按键次数，与改造前对比。验收：产出一份可复现的测量记录，写明工具名与指标名。
3. 推广：把试点用到的标签约定写进组件库与代码评审清单。验收：新组件必须声明语义标签与键盘行为。
4. 防回退：把 axe 与 lint 规则接入 CI，失败即阻止合并。验收：CI 报告中无障碍规则零新增违规。

### 动手作业

**目标**：把一个用 div 拼出的「活动报名表」改写成语义化页面，并交出可复现的测量记录。

**步骤**：

1. 保存改造前的 HTML 与一次 axe 报告，作为基线。
2. 用 header/nav/main/footer 划出地标，并加一个跳转到 main 的链接。
3. 把控件换成 label 加原生 input/select/textarea，分组用 fieldset 与 legend。
4. 给错误提示加 aria-describedby，检查每个 id 在页面内唯一。
5. 用 NVDA 或 VoiceOver 走一遍提交，记录按键次数与卡住的位置。
6. 提交改造后 HTML、axe 报告、测量记录三个文件。

**验收标准**：

- axe-core 报告中无 serious 与 critical 违规。
- 键盘 Tab 能到达全部可交互控件，焦点顺序与视觉顺序一致。
- 读屏能读出每个字段的名称、必填状态与错误提示。
- 页面只有一个 main，跳转链接在首次 Tab 时出现。
- 测量记录写明工具名、指标名与两次操作的步骤。

