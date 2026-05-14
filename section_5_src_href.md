# Section 5: src vs href 的区别

## 5.1 基本定义

### src (Source)

`src` 是 **source** 的缩写，意为"来源"。它告诉浏览器**替换当前元素的内容**——浏览器必须下载并解析该资源才能呈现该元素。

- **会阻塞渲染**（render-blocking）
- 下载和解析是**同步**的，浏览器必须等待资源就绪才能继续
- 用于替换型元素：`<img>`、`<script>`、`<iframe>`、`<video>`、`<audio>`、`<input type="image">`

### href (Hypertext Reference)

`href` 是 **Hypertext Reference** 的缩写，意为"超文本引用"。它用于**建立当前文档与引用资源之间的关联关系**，但不替换任何元素内容。

- **不会阻塞渲染**（non-render-blocking）
- 浏览器可以**并行下载**资源，同时继续解析 HTML
- 用于链接型元素：`<link>`、`<a>`、`<area>`

---

## 5.2 浏览器行为对比 ASCII 图

```
[无 src/href 属性时的 HTML 解析过程]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  HTML Parse    ████████████░░░░░░░░░░░░░░░░░░░░
               ├──────────┬──────────────────────┤
               0ms        100ms                   200ms


[有 href 属性的 <link>（如 CSS）]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  HTML Parse    ████████████████████████████████  ← 不阻塞，持续进行
               ├───────────────────────────────┤
               0ms                              300ms

  Link Fetch   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                ← 并行下载，不阻塞解析


[有 src 属性的 <script>（无 async/defer）]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  HTML Parse    ████░░░░░░░░░░░░░░░░░░░░░░░░░░░
               ├──────┬──────────────────────────┤
               0ms   50ms                        200ms
                      ▼
               遇到 <script src> → 暂停解析 → 下载JS → 执行JS → 恢复解析
                      ◄──── 阻塞点 ────►


[有 src 属性的 <img>]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  HTML Parse    ██████████████████████████████████████████████
               ├─────────────────────────────────────────────┤
               0ms                                              300ms

  Img Fetch              ▓▓▓▓▓▓▓▓▓▓▓▓  ← 图片下载与解析并行
                         [img 在下载期间不阻塞解析，但渲染时需要等待]
```

**核心差异**：`href` 告诉浏览器"这份资源与你有关联，去提前获取"，浏览器会并行处理；`src` 告诉浏览器"这份资源是这个元素的内容，你必须等它就绪才能继续"。

---

## 5.3 典型场景对比

### 5.3.1 img src — 图片加载（可延迟渲染）

```html
<!-- src: 浏览器必须获取图片才能渲染该 <img> 元素 -->
<img src="avatar.png" alt="User Avatar" />

<!-- 图片加载期间，HTML 解析继续（不阻塞解析器）， -->
<!-- 但图片位置会留下一个空白占位区域。 -->
```

**行为**：
- 下载与 HTML 解析并行
- 渲染树（Render Tree）构建时，`img` 需要图片数据才能绘制 → **渲染被阻塞**
- 图片下载完成后触发重绘（repaint）

### 5.3.2 link href — 样式表链接（非阻塞）

```html
<!-- href: 建立文档与 CSS 的关系，不替换任何内容 -->
<link rel="stylesheet" href="styles.css" />

<!-- 浏览器行为： -->
<!-- 1. 发现 href，识别为 CSS 资源 -->
<!-- 2. 发起并行下载，不停顿地继续解析 HTML -->
<!-- 3. CSS 下载完成后，应用样式 -->
```

**行为**：
- **下载**与解析并行
- CSSOM（CSS Object Model）构建期间，**渲染被阻塞**（因为 CSS 是渲染阻塞资源）
- 但 HTML 解析器本身**不被阻塞**，可以继续构建 DOM

### 5.3.3 script src — 脚本加载（阻塞解析）

```html
<!-- 无属性: 同步加载+执行，完全阻塞解析 -->
<script src="app.js"></script>

<!-- 阻塞过程： HTML parser ──► 遇到 script ──► 暂停 ──►
               下载 JS ──► 执行 JS ──► 恢复 HTML 解析 -->
```

**关键区别**：即使 `<link>` 和 `<script src>` 都会在下载期间引发资源请求，`link` 的下载**不暂停解析器**，而 `script src` **会暂停解析器**。

---

## 5.4 边缘场景

### 5.4.1 link rel="preload" — 提前加载关键资源

```html
<!-- preload 是一种 hint，告诉浏览器提前获取该资源 -->
<!-- 与 href 不同的是：preload 专门用于关键路径资源优化 -->
<link rel="preload" href="critical-font.woff2" as="font" crossorigin="anonymous" />
<link rel="preload" href="main.js" as="script" />

<!-- 对比普通 href： -->
<link rel="stylesheet" href="styles.css" />    <!-- 非关键，不阻塞解析 -->
<link rel="preload" href="critical.css" as="style" /> <!-- 关键，优先级最高 -->
```

| 属性 | 用途 | 阻塞解析器？ | 阻塞渲染？ |
|------|------|-------------|-----------|
| `href`（link） | 建立关联 | 否 | 看资源类型 |
| `src` | 替换内容 | 是（需等资源就绪） | 是（需等资源就绪） |
| `rel="preload"` | 提前获取但不应用 | 否 | 否（只预获取） |

### 5.4.2 link rel="preconnect" — 提前建立 TCP 连接

```html
<!-- preconnect 提前建立网络连接，不获取资源 -->
<link rel="preconnect" href="https://api.example.com" />
<link rel="dns-prefetch" href="https://api.example.com" />

<!-- preconnect 包含 DNS 解析 + TCP handshake + TLS（如果是 HTTPS） -->
<!-- 比 dns-prefetch 更全面，现代浏览器优先使用 preconnect -->
```

**为什么用 preconnect 而不是 preload？** preload 用于资源本体；preconnect 只建立连接，为后续资源请求节省 DNS+TCP 时间。

---

## 5.5 面试追问

### Q1：为什么 CSS 用 link href 而不是 link src？

**答**：CSS 文件不是用来"替换" `<link>` 元素的——`<link>` 是一个空元素，没有可供替换的内容。`href` 的语义是"建立关系"，`rel="stylesheet"` 告诉浏览器这个关系是样式表关联。CSS 的作用是影响已有 DOM 的渲染，而非替换任何元素。

反过来，如果用 `src`，语义就变成"这个 link 元素的内容就是 styles.css"——这在概念上是错误的，因为 link 元素没有内容区可以放样式。

---

### Q2：`<a href="page.html">` 和 `<img src="photo.jpg">` 哪个会阻塞渲染？

**答**：

- `<a href>`：**不阻塞渲染**。它只是声明一个链接关系，浏览器不会预加载目标页面（除非被 `<link rel="prefetch">` 提示）。点击时才导航。
- `<img src>`：**不阻塞 HTML 解析**，但**阻塞渲染**。图片下载完成后，浏览器才能绘制该区域。

本质上，两者都不阻塞 HTML 解析器的继续工作。关键区别在于渲染：CSS 是渲染阻塞资源（必须等所有 CSS 下载和应用后才能绘制），图片下载完成后才绘制（异步）。

---

### Q3：什么情况下 `href` 也会阻塞页面？

**答**：当 href 指向的资源是**渲染阻塞型资源**时，会间接导致渲染阻塞。最典型的情况是 CSS：

1. `<link rel="stylesheet" href="main.css">` 被解析
2. HTML 解析器继续工作，DOM 在增长
3. CSS 文件下载完成，CSSOM 构建
4. DOM + CSSOM 合并为 Render Tree
5. **在 CSSOM 完成之前，渲染被阻塞**（不会先绘制没有完整样式的页面，避免 FOUC）

所以 `href` 本身不阻塞解析器，但如果它关联的是 CSS，就会阻塞**渲染**。

---

## 5.6 总结对比表

| 维度 | `src` | `href` |
|------|-------|--------|
| 语义 | 内容来源（替换当前元素） | 关系引用（建立关联） |
| 典型元素 | img, script, iframe, video | link, a, area |
| HTML 解析器阻塞？ | 是（同步下载+执行） | 否（并行下载） |
| 渲染阻塞？ | 是（需资源就绪才能渲染元素） | 取决于资源类型（CSS 阻塞，preload 不阻塞） |
| 执行时机 | 立即替换元素内容 | 不直接"执行"，只是建立关系 |
| 能否省略结束标签 | 替换型空元素可以（如 `<img />`） | link 等也为空元素 |

---

> 📚 参考：
> - https://blog.csdn.net/Bianca427/article/details/125421327
> - https://www.cnblogs.com/gavinzzh-firstday/p/5735010.html
> - https://blog.csdn.net/weixin_42420703/article/details/83213799