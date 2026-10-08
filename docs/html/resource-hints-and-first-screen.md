---
title: 资源提示与首屏 HTML 优化
description: preload、prefetch、preconnect、dns-prefetch 的区别，以及 favicon 与首屏 HTML 优化。
---

# 资源提示与首屏 HTML 优化

## 1. preload/prefetch/preconnect 区别

### 1.1 定义与核心原理

这三个指令都是浏览器**资源提示（Resource Hints）**，用于在浏览器自然发现资源之前**提前告知浏览器**即将需要的资源，从而减少等待时间。

**关键区别：**

| 指令 | 连接 | 下载资源 | 优先级 | 执行时机 |
|------|------|---------|--------|---------|
| `dns-prefetch` | 是 仅 DNS | 否 | 中 | 立即 DNS 解析 |
| `preconnect` | 是 DNS + TCP + TLS | 否 | 高 | 立即建立连接 |
| `preload` | 是（复用已有） | 是 **立即下载** | **High** | 解析到 link 时立即下载 |
| `prefetch` | 是（复用已有） | 是 **空闲时下载** | **Lowest** | 网络空闲时下载 |
| `modulepreload` | 是 | 是 立即下载模块 | High | 立即下载 ESM 模块 |

### 1.2 详细工作原理

**dns-prefetch：** 仅解析 DNS，不建立 TCP 连接。
```html
<!-- 老旧浏览器不支持 preconnect 时的降级方案 -->
<link rel="dns-prefetch" href="//cdn.example.com">
```

**preconnect：** DNS + TCP 握手 + TLS 握手全部提前完成（以 Google Fonts 为例）：
```
无 preconnect：
  → DNS(50ms) → TCP(50ms) → TLS(100ms) → 请求(200ms)
  总计：~400ms

有 preconnect：
  → preconnect 完成 DNS+TCP+TLS（~200ms，并行）
  → 实际请求：~200ms
  总计：~200ms（节省约 50%）
```

**preload 的"延迟执行"机制：**
```html
<!-- 浏览器在解析到 link 时立即下载，但不阻塞解析 -->
<link rel="preload" href="/api/user" as="fetch" crossorigin>

<!-- 脚本中真正需要时才执行请求（此时资源已在缓存中） -->
<script>
  // 此时 /api/user 早已下载好，直接使用
  const res = await fetch('/api/user');
</script>
```

**`as` 属性的关键作用（缺少 as 会导致错误加载）：**

| as 值 | 触发效果 |
|-------|---------|
| `as="font"` | 正确缓存；正确 CORS；正确优先级；必须加 `crossorigin` |
| `as="image"` | 正确优先级；正确缓存 |
| `as="script"` | 正确优先级；避免重复执行 |
| `as="style"` | 正确优先级；正确加载 CSS |
| `as="fetch"` | 正确优先级（High）；正确 CORS |
| `as="video"`/`as="audio"` | 正确优先级 |

> **最常见错误：** 预加载字体时不加 `crossorigin`，导致 CORS 失败，字体下载后被丢弃：
> ```html
> <!-- 错误：缺 crossorigin，字体被 CORS 拦截并丢弃 -->
> <link rel="preload" href="/fonts/Lato.woff2" as="font">
> <!-- 正确 -->
> <link rel="preload" href="/fonts/Lato.woff2" as="font" crossorigin>
> ```

### 1.3 完整代码示例

```html
<head>
  <!-- 1. 预连接即将请求的第三方域名（节省 ~200ms） -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- 2. 预加载首屏关键资源（当前页面必需，优先加载） -->
  <!-- LCP 图片（最大内容绘制） -->
  <link rel="preload" href="/hero.webp" as="image" fetchpriority="high">
  <!-- 字体文件（防止 FOIT） -->
  <link rel="preload" href="/fonts/Lato.woff2" as="font" crossorigin type="font/woff2">
  <!-- 关键 CSS（首屏渲染必需） -->
  <link rel="preload" href="/critical.css" as="style">
  <!-- 入口脚本（依赖 DOM 的模块） -->
  <link rel="preload" href="/main.js" as="script">

  <!-- 3. 预取下一个导航的资源（空闲时加载，不影响当前页面） -->
  <link rel="prefetch" href="/about.js" as="script">
  <link rel="prefetch" href="/api/recommendations" as="fetch">

  <!-- 4. ES Module 预加载（比 prefetch 更精确） -->
  <link rel="modulepreload" href="/utils/format.js">
</head>
```

### 1.4 preload vs prefetch 场景对照表

| 场景 | 推荐 | 原因 |
|------|------|------|
| 首屏大图（LCP） | `preload` as="image" | 延迟加载会严重影响 LCP 分数 |
| 入口 JS 模块 | `preload` as="script" | 高优先级，立即下载，解析后执行 |
| 首屏字体 | `preload` as="font" crossorigin | 避免 FOIT（文字不可见闪烁） |
| 下一页面需要的资源 | `prefetch` | 网络空闲时下载，不抢当前页面带宽 |
| Google Maps SDK / 分析脚本 | `preconnect` | 即将使用但不确定具体资源，先建连接 |
| JS 动态引入的脚本 | 动态 `import()`（代码分割） | 比 preload 更精确地控制时机 |

### 1.5 常见坑点与最佳实践

| 坑点 | 说明 | 解决方案 |
|------|------|----------|
| **preload 后重复请求** | 同一资源被 preload 后，脚本中又 fetch/import，导致两次请求 | preload 仅用于后续不会自动发现的资源 |
| **字体缺 crossorigin** | 字体 CORS 失败，被浏览器丢弃 | 所有字体 preload 必须加 `crossorigin` |
| **prefetch 被 CSP 拦截** | Content-Security-Policy 可能阻止 prefetch | CSP 中声明允许的连接域 |
| **as 错误导致降级** | as 属性缺失或错误，浏览器降级为低优先级 | 严格匹配资源类型 |
| **prefetch 滥用** | prefetch 过多反而浪费带宽，影响当前页面加载 | 仅 prefetch 下一个确定会访问的页面 |

**Chrome DevTools 验证：**

- Network 面板中，preload 资源显示为 `preload` 类型（橙色）
- prefetch 资源显示为 `prefetch` 类型（灰色，`High` 优先级请求在末尾）
- 检查是否有 `preload-missing` 警告（说明 preload 了但未实际使用）

### 1.6 高频面试追问

**Q1：preload 了资源后，浏览器会重复请求吗？缓存策略是什么？**
> 不会重复请求。preload 将资源放入内存缓存（HTTP 缓存取决于 Cache-Control）。后续 `fetch()` 或 `import()` 找到缓存中的资源直接使用。但需注意：**preload 的 `as` 必须匹配实际请求类型**，否则会降级或被忽略。

**Q2：同时设置 `rel="preload"` 和 `rel="prefetch"` 同一个资源，会产生两次请求吗？**
> 不会。浏览器会对同一 URL 进行去重处理。但执行时机取决于优先级——preload 立即执行，prefetch 在空闲时执行。

**Q3：`modulepreload` 和 `preload as="script"` 在加载 ES Module 时有什么区别？**
> `modulepreload` 会：① 预解析模块文件；② 预解析依赖图（import 的子模块）；③ 预建立 CORS 连接。而 `preload as="script"` 仅下载主模块，不处理依赖图。大型 ESM 应用（Next.js/Nuxt）中 `modulepreload` 可显著减少首屏模块解析时间。

> 参考：
> - [web.dev — Preload, prefetch and priorities](https://web.dev/articles/preload-prefetch-and-priorities)
> - [MDN — Link prefetching FAQ](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/prefetch)
> - [MDN — modulepreload](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/modulepreload)

## 2. favicon 配置 / dns-prefetch / 首屏 HTML 优化

### 2.1 favicon 配置

```html
<!-- 现代多格式 favicon（放在 <head> 中） -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<!-- PNG favicon（兼容性最强） -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">

<!-- Apple Touch Icon（iOS 添加到主屏幕） -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- Windows 磁贴 -->
<meta name="msapplication-TileColor" content="#4A90E2">
<meta name="msapplication-TileImage" content="/tile.png">

<!-- theme-color：浏览器地址栏颜色 -->
<meta name="theme-color" content="#4A90E2">
```

### 2.2 dns-prefetch 预解析

```html
<!-- 提前解析第三方域名 DNS -->
<link rel="dns-prefetch" href="//fonts.googleapis.com">
<link rel="dns-prefetch" href="//cdn.example.com">
<link rel="dns-prefetch" href="//analytics.example.com">

<!-- preconnect：更进一步，预先建立 TCP + TLS 连接 -->
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

### 2.3 首屏 HTML 优化

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <!-- 1. charset 必须在最前面（前 1024 字节内） -->
  <meta charset="UTF-8">

  <!-- 2. viewport 必须 -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- 3. title 和 description -->
  <title>关键：快速加载的标题</title>
  <meta name="description" content="简短描述">

  <!-- 4. 关键 CSS 内联（避免渲染阻塞） -->
  <style>
    /* 首屏渲染必需的关键样式 */
    body { margin: 0; font-family: sans-serif; }
    .header { background: #fff; }
    /* 仅包含首屏可见内容所需的 CSS */
  </style>

  <!-- 5. 非关键 CSS 异步加载 -->
  <link rel="stylesheet" href="non-critical.css" media="print" onload="this.media='all'">

  <!-- 6. 预连接关键域名 -->
  <link rel="preconnect" href="https://your-cdn.com" crossorigin>

  <!-- 7. 预加载关键资源 -->
  <link rel="preload" href="fonts/main.woff2" as="font" crossorigin>
  <link rel="preload" href="hero-image.webp" as="image">

  <!-- 8. 延迟加载非首屏 JS -->
  <script defer src="analytics.js"></script>
</head>
<body>
  <!-- 9. 首屏内容直接可用（SSR 或 内联关键 HTML） -->
  <div id="app">
    <!-- 服务器端渲染的初始 HTML -->
  </div>

  <!-- 10. defer JS 在 body 末尾 -->
  <script defer src="app.js"></script>
</body>
</html>
```

**Critical CSS（关键渲染路径 CSS）：**

- 提取首屏可见内容所需的 CSS
- 内联到 `<head>` 中（避免额外网络请求）
- 非关键 CSS 异步加载（不阻塞渲染）

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| ['`rel="preconnect"` HTML attribute value'](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preconnect) | 讲清提前完成 DNS 与 TLS 握手能省哪一步，避免与 dns-prefetch 混用。 | 读适用场景与注意事项，带着"何时该用 preconnect 而非 dns-prefetch"去读，再给字体域加一行验证。 |
| ['`rel="dns-prefetch"` HTML attribute value'](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/dns-prefetch) | 最轻量的域名预解析，适合页面上大量第三方域名的场景。 | 看浏览器支持与 crossorigin 说明，思考它与 preconnect 的成本取舍，给 CDN 域加 dns-prefetch 后抓包确认。 |
| ['`rel="prefetch"` HTML attribute value'](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/prefetch) | 明确 prefetch 是预取下一次导航资源，而非当前页关键资源。 | 读优先级与触发时机两节，问 prefetch 会不会抢首屏带宽，写一个"预取下一页"的示例再观察网络面板。 |
| ['`rel="preload"` HTML attribute value'](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload) | as、type、crossorigin 的组合规则是 preload 不踩坑的关键。 | 重点读 as 取值表与 crossorigin 规则，问字体为何必须带 crossorigin，给自己的字体加 preload 看控制台警告。 |
| [WHATWG HTML Living Standard](https://html.spec.whatwg.org/multipage/) | link 元素与 rel 类型的权威定义，可查跨源与优先级边界行为。 | 在 link 相关章节查 preload/prefetch 的处理算法，回答同源与 crossorigin 的判定条件，回填到自己的页面配置。 |
| [Add JavaScript to your web page](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Add_JavaScript_to_your_web_page) | 讲清 script 位置与 defer/async 如何影响首屏渲染时机。 | 读 defer/async 一节，对照自己页面的 script 标签，把非关键脚本改成 defer 并测量首屏变化。 |
| [Author fast-loading HTML pages](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Author_fast-loading_HTML_pages) | 首屏 HTML 优化的清单式总览，与资源提示内容互补。 | 通读一遍，筛出适用于本页的条目，逐条在自己的首屏 HTML 上核对并记录未达标项。 |
| [Using responsive images in HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images) | 用 imagesrcset/sizes 配 preload 前，必须先懂响应式图片候选规则。 | 读 srcset、sizes 与 picture 部分，问 preload 如何命中同一候选图，再写一处带 imagesrcset 的预加载。 |
| [preconnect](https://react.dev/reference/react-dom/preconnect) | 框架级 preconnect API 视角，看资源提示如何被工程化封装。 | 读 API 签名与示例，对比手写 link 标签的差异，思考何时应交由框架统一注入预连接。 |
| [preload](https://react.dev/reference/react-dom/preload) | 展示 preload 的组件化用法与 as 参数约束，可与手写标签对照。 | 读参数表与示例，注意与原生 link 的异同，尝试在组件树里预加载首屏字体并验证是否去重。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [预加载关键资源](https://web.dev/articles/preload-critical-assets) | 可直接照做的实验，用瀑布图对比 preload 前后差异。 | 按步骤给首屏字体与图片加 preload，记录瀑布图与 LCP 变化，再删掉 preload 观察回退。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [关键渲染路径](https://web.dev/articles/critical-rendering-path) | 把 HTML 到像素的链路讲透，是理解资源提示收益的前提。 | 读关键路径与阻塞部分，画出自己页面的渲染链路图，标出哪些节点值得用 preload 提前。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格首屏 | preload 关键 JS/CSS、首屏 HTML 内联 | SSR 输出 `<link rel="preload" as="script">` | 表格数据的 `as="fetch"` 预加载若与真实请求模式不一致，会出现两次请求 |
| 低端安卓机上的电商详情页 | preload LCP 图 + fetchpriority、preconnect 图片 CDN | 图片 CDN 的 `imagesrcset` 候选集 | 只给首屏第一张图提优先级，折叠线以下的图片交给懒加载 |
| 多人协作白板进入房间 | preconnect 信令域、preload 初始化脚本与字体 | `<link rel="preconnect">` + 字体 preload | 信令域名只在房间列表页建连，不要放在首页全局 |
| 营销落地页的 LCP 大图 | preload 配合 `fetchpriority="high"` | 图片 CDN + 响应式 `imagesrcset` | preload 的候选集与正文 `srcset` 不一致时会二次下载 |
| 跨域托管字体与图标的官网 | preconnect + dns-prefetch 兜底、favicon 显式声明 | 自托管字体或字体 CDN | 字体 preload 必须带 crossorigin，即使字体与页面同源 |
| 单页应用列表页到详情页跳转 | prefetch 下一页的代码分块 | 构建工具的分块 prefetch 注释 | 用户下一步才可能访问的路由才值得预取，移动网络下先判断省流设置 |
| 弱网下 SSR 站点的首屏 | 首屏 HTML 内联关键样式、favicon 配置 | SSR + 内联 `<style>` + `<link rel="icon">` | 内联内容按首屏可见区域挑选，内联过多会拖慢 HTML 传输 |
| 视频站播放页的首帧 | preload 封面图、preconnect 视频域 | `<link rel="preload" as="image">` | 播放器脚本与封面图同时下载时，先把封面图放行 |
| 文档站搜索框的输入联想 | prefetch 接口资源、dns-prefetch | 空闲时 `rel="prefetch"` | 用户不触发输入时预取变成纯浪费，用 `requestIdleCallback` 延迟触发 |

### 三个场景拆解

#### 场景 1：低端安卓机上的电商详情页首屏

**业务背景**
详情页首屏由一张主图构成视觉主体，浏览器解析到 `img` 标签时才开始下载，弱网与低端机上这段等待被放大。首屏可见区域只有这一张图，其余图片都在折叠线以下。

**怎么用本页知识解决**
思路是把主图的下载时刻从「解析到 img」提前到「解析到 head」，同时提前与图片域建连。折叠线以下的图片维持默认优先级。

```html
<head>
  <!-- 图片域与主站不同源，先做 DNS 与 TLS 握手 -->
  <link rel="dns-prefetch" href="https://img.example-cdn.test">
  <!-- 图片是 no-cors 请求，preconnect 不写 crossorigin -->
  <link rel="preconnect" href="https://img.example-cdn.test">
  <!-- 首屏主图提前声明，候选集必须与正文 img 完全一致 -->
  <link rel="preload" as="image" fetchpriority="high"
        href="https://img.example-cdn.test/p/800.avif"
        imagesrcset="https://img.example-cdn.test/p/800.avif 800w,
                     https://img.example-cdn.test/p/1600.avif 1600w"
        imagesizes="100vw">
</head>
<body>
  <!-- 正文不再重复声明 fetchpriority，避免与 preload 抢同一优先级 -->
  <img src="https://img.example-cdn.test/p/800.avif"
       srcset="https://img.example-cdn.test/p/800.avif 800w,
               https://img.example-cdn.test/p/1600.avif 1600w"
       sizes="100vw" alt="商品主图">
</body>
```

- `dns-prefetch` 与 `preconnect` 同时写：支持 `preconnect` 的浏览器走完整建连，不支持的退回 DNS 解析。
- `imagesrcset` 与 `imagesizes` 让浏览器按视口选择候选，选择结果与正文 `img` 相同才能命中同一份缓存。
- `fetchpriority="high"` 提升的是优先级，不会改变图片的加载顺序依赖，仍需保证它在首屏可见区域内。
- 正文 `img` 不写 `fetchpriority`，否则同一资源两处声明会让优先级判断变得难以复现。

**怎么度量收益**
看 LCP（Chrome DevTools Performance 面板的 Timings 轨道、Lighthouse 的 Largest Contentful Paint 审计、web-vitals 库采集的字段数据）。看请求时序用 Network 面板的瀑布图与 Initiator 列。跨版本对比用 WebPageTest 的 filmstrip view 与 Start Render。

**什么时候不该用**

- 主图在折叠线以下：preload 会与关键样式、字体抢同一条连接，用户看不到的图先到。
- 图片 URL 由运行时逻辑拼接（例如按设备型号查表生成），HTML 里写不出确定的候选集，preload 与真实请求不匹配会产生下载两次。
- 页面同时存在轮播图的多张候选：只 preload 第一张，其余等用户操作后再加载。

#### 场景 2：单页应用列表页到详情页的跳转

**业务背景**
列表页点进详情页时，详情页的 JS 分块才开始下载，用户会看到一段空白或骨架。分块数量随页面增长，首屏一次性全量预取又会与关键资源争带宽。

**怎么用本页知识解决**
思路是把预取拆成两层：列表渲染完成后等浏览器空闲预取，指针或手指接触链接时再补一次。构建工具负责把目标模块切成独立分块并标记为 prefetch。

```js
// 列表首屏渲染完成后，等浏览器空闲再预取详情页分块
const prefetchDetail = () => {
  // magic comment 让构建工具把该分块标记为 prefetch，由浏览器空闲时下载
  import(/* webpackPrefetch: true */ '../pages/DetailPage');
};
const links = document.querySelectorAll('a[data-route="detail"]');
// 指针或手指碰到链接时触发，覆盖“点击前一瞬间”才开始的缺口
links.forEach((a) => a.addEventListener('pointerenter', prefetchDetail));
// 空闲回调兜底，避免在首屏渲染与滚动期间抢带宽
if ('requestIdleCallback' in window) requestIdleCallback(prefetchDetail);
```

- `import()` 有模块缓存，重复触发同一个分块不会重复下载，事件可以放心绑定到多个链接。
- prefetch 的请求优先级低于 preload，浏览器在空闲时才会真正发出。
- `pointerenter` 触发点早于 `click`，覆盖的是用户按下到路由切换之间的时间。
- 需要给预取加开关：`navigator.connection.saveData` 为 true 或 `effectiveType` 为慢速网络时跳过。

**怎么度量收益**
在路由点击前后各打一个 `performance.mark`，用 `performance.measure` 读取从点击到详情页首帧的时长。用 Network 面板核对点击瞬间是否还有新的 JS 分块请求，用 Performance 面板核对 prefetch 请求的 Priority 是否为 Low。

**什么时候不该用**

- 列表中占比高的链接指向需要登录、跳转后会重定向的页面，预取命中率低还会浪费请求。
- 用户在省流模式或按流量计费的网络下，预取的字节会直接变成用户成本。
- 分块本身体积大、用户设备内存紧张时，预取会占用内存与解码时间。

#### 场景 3：多人协作白板进入房间

**业务背景**
进入房间要建立 WebSocket 并拉取房间快照，信令域名在页面之外。用户从房间列表点进房间，等待集中在握手与初始化脚本这两段。

**怎么用本页知识解决**
思路是提前与信令域建连，并把首屏渲染的阻塞脚本与工具栏字体提前下载，同时显式声明 favicon 去掉默认探测请求。

```html
<head>
  <!-- 信令域名提前建连，进入房间时直接发 WebSocket 握手 -->
  <link rel="dns-prefetch" href="https://rt.example-board.test">
  <link rel="preconnect" href="https://rt.example-board.test">
  <!-- 画布初始化脚本是首屏渲染的阻塞点，提前下载 -->
  <link rel="preload" as="script" href="/app/board-init.js">
  <!-- 工具栏图标字体提前加载，字体 preload 必须带 crossorigin -->
  <link rel="preload" as="font" type="font/woff2"
        href="/fonts/board-icons.woff2" crossorigin>
  <!-- favicon 显式声明，省掉浏览器对 /favicon.ico 的默认探测 -->
  <link rel="icon" href="/favicon.ico" sizes="any">
  <!-- 工具栏与画布容器样式内联，省掉关键样式的一次往返 -->
  <style>/* 关键样式 */</style>
  <script src="/app/board-init.js" defer></script>
</head>
```

- 后面那个 `<script src>` 与上面的 preload 指向同一 URL 且模式一致，preload 缓存会被命中，不会产生第二次下载。
- 字体 preload 必须写 `crossorigin`，字体请求以 CORS 匿名模式发出，缺这个属性会导致同一字体下载两次。
- favicon 显式声明后，浏览器不再按默认路径探测，404 请求从请求列表里消失。
- `preconnect` 放在房间列表页而不是全站首页，只有在用户真的可能进房间的页面才付出建连成本。

**怎么度量收益**
Network 面板按域名筛选，看该域名首个请求的 Connection Start 与 SSL 时间戳是否与文档请求重合。跨域资源的 `connectStart`、`connectEnd` 需要响应头 `Timing-Allow-Origin` 才能在 `performance.getEntriesByType('resource')` 中读到。进房间到画布首帧用自定义 `performance.mark` 度量。

**什么时候不该用**

- 多数会话只在房间列表浏览、不进房间时，preconnect 与 preload 都是空付成本。
- 同一个页面 preconnect 多个第三方域，会占用连接与移动设备的电量，应该按优先级保留少量域名。
- 房间快照体积大且用户可能马上退出时，提前拉取等于把带宽浪费在一次不发生的会话上。

### 行业先进实践

**dns-prefetch 作为 preconnect 的兜底（出处：MDN Web Docs 的 `<link rel="dns-prefetch">` 页面）**
MDN 说明 `dns-prefetch` 覆盖的浏览器范围比 `preconnect` 宽，常与 `preconnect` 成对出现。支持 `preconnect` 的环境执行完整建连，不支持的环境退回 DNS 解析。你的项目可以把第三方域整理成一份配置，两条链接由同一份配置渲染。

**字体自托管并自动生成 preload（出处：Next.js 官方文档的字体章节）**
Next.js 的字体能力在构建期把字体文件放到自身域名，并生成 preload 链接与字体样式。这样做省掉了第三方字体的 DNS 与 TLS，也让字体请求在 HTML 早期发出。不用该框架的项目可以在构建流程里加一步字体子集化与自托管，再手写 preload 链接。

**用 103 Early Hints 提前下发预加载头（出处：RFC 8297；Cloudflare 官方文档的 Early Hints 章节）**
源站还没生成完整 HTML 时，先回一个 103 响应，带上 `Link: </style.css>; rel=preload` 这类头。预加载的触发时刻从 HTML 首字节提前到响应头阶段，对 TTFB 高的动态页面作用明显。落地前需核对官方文档：你的 CDN 与源站是否支持 103 的生成与透传。

**用 Speculation Rules 声明预取规则（出处：web.dev 的 Speculative loading 文章）**
用 `<script type="speculationrules">` 声明哪些 URL 做 prefetch 或 prerender，并用 `eagerness` 控制触发时机。规则由浏览器匹配执行，不需要为每个链接手写标签。可以先只对「列表页到详情页」这一条路径写规则，从保守的触发档位开始观察是否产生无用请求。

**用 fetchpriority 标记 LCP 元素（出处：web.dev 的 LCP 优化文章；MDN 的 `fetchpriority` 属性页面）**
给首屏 LCP 元素加 `fetchpriority="high"`，其余图片保持默认。浏览器的预加载扫描器对图片默认给出的优先级偏低，显式提升能让它先占用连接。每个模板只标记一个候选元素，再用真实用户监控核对选中的元素是否确实是 LCP 元素。

### 从学到用：落地路线

1. **试点**：选一个流量占比明确、结构稳定的模板（例如商品详情页），只改这一条路径，改动范围限制在 HTML head 与构建配置。验收标准：新增的资源提示不超过 3 条，且每条 URL 与正文引用完全一致。
2. **验证**：在同一台机器、同一网络限速下开关各跑 3 次以上，用 DevTools Performance 面板与 Lighthouse 对比。验收标准：Console 没有 preloaded but not used 警告，Network 面板无同名重复请求。
3. **推广**：把资源提示抽成模板层的公共片段，由统一配置生成 dns-prefetch、preconnect 与 preload。验收标准：新增第三方域时只改一处配置，全站模板自动带上对应链接。
4. **防回退**：加构建期校验，出现跨域 preconnect 时要求同域有 dns-prefetch，preload 的 URL 必须在页面里真实出现。验收标准：CI 中的校验脚本命中规则时构建失败，并输出文件路径与行号。

### 动手作业

**目标**
给一个静态详情页加上首屏资源提示，用同机同网络的对照实验判断每条提示的收益与代价。

**步骤**

1. 准备页面：首屏一张大图、一个自托管字体、一个第三方域上的图标资源；本地用不同端口模拟跨域。
2. 在 DevTools 里开 Slow 4G 限速跑基线，记录 Network 面板的请求顺序、Initiator 列与 LCP 数值。
3. 逐条加入 `dns-prefetch`、`preconnect`、`preload`，每加一条重跑一次并记录差异，保证单变量。
4. 故意制造两个错误：字体 preload 不写 `crossorigin`；preload 的图片候选集与 `img` 的 `srcset` 不一致。记录 Console 警告与重复请求。
5. 修正错误后重跑，确认请求条数与顺序回到预期。
6. 跑一次 Lighthouse，查看 Preload key requests 审计项与未被使用的字节。
7. 汇总一张表：每条资源提示分别影响了哪个指标的哪一段，代价是额外请求数还是额外字节。

**验收标准**

- 能展示开启前后的 Network 面板记录或 HAR，指出每个请求的 Initiator 是 parser 还是 preload。
- Console 中没有 preloaded but not used 警告。
- 同一 URL 在 Network 面板中只出现一次，字体请求带 crossorigin。
- 结论表里每条提示都有对应的指标变化或「无变化」的判定，并写出测量方法。

