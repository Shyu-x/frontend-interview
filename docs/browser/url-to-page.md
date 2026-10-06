---
title: 输入 URL 到页面展示
description: 从地址栏输入到首屏渲染的 14 个步骤、时序与耗时分析。
---

# 输入 URL 到页面展示

## 1. 输入 URL 到页面展示：完整 14 步

### 1.1 定义/背景

从用户在地址栏按下回车键，到页面首次渲染完成，浏览器需要经历 DNS 解析、TCP/TLS 握手、HTTP 请求、渲染流水线等多个阶段。理解这 14 步是排查白屏问题、分析首屏性能瓶颈的理论基础。

### 1.2 完整时序流程图

```
用户输入 URL
     │
     ▼
Step 1: URL 解析
     - 地址栏判断是搜索词还是 URL
     - 无协议前缀，自动补全 https://
     - Chrome Omnibox 同时启动预搜索建议
     │
     ▼
Step 2: HSTS 预加载列表检查
     - 若命中 HSTS (HTTP Strict Transport Security) 列表
     - HTTP 请求强制升级为 HTTPS
     │
     ▼
Step 3: DNS 解析（详见 network/dns 页）
     - 浏览器 DNS 缓存 → 系统 DNS 缓存 → hosts 文件
     - → 本地 DNS 解析器 (ISP) → 根服务器 → TLD → 权威 DNS
     │
     ▼
Step 4: TCP 连接（三次握手）
     - SYN → SYN-ACK → ACK（往返 1 RTT）
     - 若 HTTPS，追加 TLS 1.3 握手（1 RTT 或 0-RTT）
     │
     ▼
Step 5: TLS 握手（HTTPS）
     - 交换证书、验证身份、协商加密套件
     - 完成后得到对称密钥，后续加密通信
     │
     ▼
Step 6: 发送 HTTP 请求
     GET /index.html HTTP/1.1
     Host: www.example.com
     Accept: text/html
     Accept-Encoding: gzip, deflate, br
     ...
     │
     ▼
Step 7: 服务器处理，返回 HTTP 响应
     │
     ▼
Step 8: 检查缓存（强缓存/协商缓存，详见 http-cache 页）
     │
     ▼
Step 9: 准备渲染进程
     - Site Isolation 规则分配/复用渲染进程
     - process reuse：已存在相同站点进程时复用
     │
     ▼
Step 9a: 解析 HTML → DOM Tree
     - HTML Parser 边扫描边构建 Token → DOM 节点
     - 遇到 <link> 触发 CSS 解析 → CSSOM
     - 遇到 <script>（无 defer/async）阻塞 HTML 解析
     - 预扫描器发现 <img>/<script src> 并通知网络线程
     │
     ▼
Step 9b: 解析 CSS → CSSOM Tree
     - CSS Parser 构建 CSS 规则树
     - 计算每个 DOM 节点的最终样式（Style Calculation）
     │
     ▼
Step 9c: 生成 Render Tree
     - DOM Tree + CSSOM Tree → Render Tree
     - 可见节点 + 样式信息，display:none 节点不进入
     │
     ▼
Step 9d: Layout（布局/回流）
     - 计算每个元素的几何信息（位置、大小）
     - 涉及回流（reflow）——最昂贵的布局计算
     │
     ▼
Step 9e: Paint（绘制）
     - 将布局信息转换为绘制记录（Paint Records）
     - 分层（Layer），每个合成层独立绘制
     │
     ▼
Step 9f: 分层与合成（Composite）
     - Compositor Thread 对各合成层进行光栅化
     - 合成层按 z-index 叠加，生成最终帧
     │
     ▼
Step 10: 首次内容绘制 (First Contentful Paint / FCP)
     │
     ▼
Step 11: 执行 JavaScript
     - Web Worker 并行执行，不阻塞主线程
     - requestAnimationFrame 调度动画回调
     - Intersection Observer 触发懒加载
     │
     ▼
Step 12: 加载执行剩余资源
     - 懒加载图片、Code Splitting 动态导入
     - Intersection Observer 触发图片加载
     │
     ▼
Step 13: 页面可交互 (Time to Interactive / TTI)
     │
     ▼
Step 14: 后台标签静默期
     - 预渲染（Back/Forward Cache / bfcache）
     - 定期触发回流/重绘以保持活性
```

### 1.3 各阶段耗时分析代码

```javascript
// 使用 Performance API 分析各阶段耗时
const [navigation] = performance.getEntriesByType('navigation');

console.log({
  // 网络阶段
  dns: navigation.domainLookupEnd - navigation.domainLookupStart,     // DNS 解析
  tcp: navigation.connectEnd - navigation.connectStart,              // TCP 握手
  tls: navigation.secureConnectionStart > 0
    ? navigation.requestStart - navigation.secureConnectionStart
    : 0,                                                             // TLS 握手
  ttfb: navigation.responseStart - navigation.requestStart,          // 首字节时间
  download: navigation.responseEnd - navigation.responseStart,       // 响应下载

  // 渲染阶段（通过 Performance Observer 观测）
  domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
  load: navigation.loadEventEnd - navigation.startTime,
});

// 使用 Server Timing API（服务端设置 PerformanceServerTiming 头）
// 客户端可读取：
navigation.serverTiming.forEach(entry => {
  console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
});
```

### 1.4 关键时间节点对比

| 指标 | 定义 | 优化目标 |
|------|------|---------|
| TTFB (Time to First Byte) | 收到第一个字节的时间 | < 200ms |
| FCP (First Contentful Paint) | 首次内容绘制 | < 1.8s |
| LCP (Largest Contentful Paint) | 最大内容绘制 | < 2.5s |
| TTI (Time to Interactive) | 可交互时间 | < 3.8s |
| CLS (Cumulative Layout Shift) | 累计布局偏移 | < 0.1 |
| TBT (Total Blocking Time) | 总阻塞时间 | < 200ms |

### 1.5 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| DNS 解析慢 | 首次访问需完整 DNS 查询链 | 使用 `<link rel="dns-prefetch">` 预解析 |
| TLS 握手耗时 | HTTPS 额外 1-2 RTT | 开启 TLS 1.3 (1-RTT)，开启 OCSP Stapling |
| 串行资源加载 | JS 阻塞 CSS/HTML 解析 | 使用 `defer`/`async`，CSS 放 `<head>`，JS 放 `</body>` 前 |
| 服务端 TTFB 慢 | 数据库/后端处理慢 | 服务端缓存、CDN、边缘计算 |
| 渲染阻塞 | 大 JS bundle 阻塞首屏 | Code Splitting、Tree Shaking、预加载关键资源 |

### 1.6 面试追问

**Q1: 为什么 `<script>` 默认会阻塞 HTML 解析？**

因为 JS 可能通过 `document.write()` 改变已经解析的 DOM 结构，如果允许并行解析会导致 HTML Parser 的 token 流和 DOM 树不一致。因此浏览器默认在 `<script>` 处暂停 HTML 解析，等 JS 下载并执行完成后再继续。使用 `defer` 或 `async` 可以消除阻塞。

**Q2: 什么是 bfcache（Back/Forward Cache）？**

bfcache 是浏览器对整个页面（包括 JS 堆）做快照保存到内存中，当用户点击后退/前进按钮时，无需重新发起网络请求，直接从内存恢复页面。好处是页面"秒开"，坏处是 JS `unload` 事件不可靠（现代浏览器建议使用 `visibilitychange` 代替）。

**Q3: Preload Scanner 是如何工作的？**

HTML Parser 在主线程解析 HTML 时，如果遇到 `<script>`（同步）会暂停解析。但 Preload Scanner 是一个轻量级后台扫描器，即使主线程被 JS 阻塞，它也能继续扫描 HTML token 流，发现 `<link>`、`<img>`、`<script src>` 等资源，提前通知网络线程发起请求，充分利用网络带宽。

## 2. 输入 URL 到页面展示（速记版）

| 步骤 | 说明 |
|------|------|
| **Step 1** | URL 解析：地址栏判断是搜索词还是 URL，若无协议前缀自动补全 https:// |
| **Step 2** | 检查 HSTS 预加载列表：若命中从 HTTP 升级到 HTTPS |
| **Step 3** | DNS 解析：浏览器缓存 -> 系统缓存 -> hosts -> 递归查询 |
| **Step 4** | 建立 TCP 连接（三次握手），HTTPS 还要 TLS 握手 |
| **Step 5** | 发送 HTTP 请求（GET /index.html HTTP/1.1） |
| **Step 6** | 服务器处理请求，返回 HTTP 响应 |
| **Step 7** | 检查缓存（强缓存/协商缓存） |
| **Step 8** | 准备渲染进程：根据 Site Isolation 规则分配/复用渲染进程 |
| **Step 9** | 渲染进程主线程工作：解析 HTML -> DOM Tree、解析 CSS -> CSSOM、生成 Render Tree、Layout、Paint、Composite |
| **Step 10** | 显示页面内容（First Contentful Paint / FCP） |
| **Step 11** | 执行 JavaScript：Web Worker 并行、requestAnimationFrame 调度、Intersection Observer 触发 |
| **Step 12** | 加载执行剩余资源：懒加载图片、Code Splitting 动态导入 |
| **Step 13** | 页面可交互（Time to Interactive / TTI） |
| **Step 14** | 后台标签静默期：预渲染（bfcache）、定期触发回流/重绘保持活性 |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [URL 标准](https://url.spec.whatwg.org/) | 权威定义 URL 解析算法，解释地址栏输入如何被切分 | 读 URL 解析器与序列化小节，用三个含用户名、查询串的地址手算解析结果 |
| [`url()` CSS function](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/url_function) | 说明 CSS 中引用的资源 URL 如何解析、何时触发加载 | 读语法与相对路径部分，验证 <base> 改变后 url() 的解析基准是否随之变化 |
| ['`<input type="url">` HTML attribute value'](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/url) | HTML 层对 URL 输入的校验与规范化行为 | 读属性与校验小节，写表单测试带空格、缺协议的输入会被如何拒绝或修正 |
| [`<base>` HTML document base URL element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/base) | 决定文档内相对 URL 的解析基准，直接影响真实请求地址 | 读 href 与 target 说明，加 <base> 后对比图片和链接实际发出的请求 URL |
| [PageSpeed Insights](https://pagespeed.web.dev/) | 官方工具，用真实加载数据验证理论步骤对应的耗时 | 输入一个站点，看实验室与真实用户指标，把 LCP、TTFB 对应回导航各阶段 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL_API) | 带可运行示例，把 URL 解析逻辑落到代码里直接观察 | 在控制台用 URL 与 URLSearchParams 解析完整地址，改写查询参数并打印 href、pathname |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Inside look 第 2 部分：导航](https://developer.chrome.com/blog/inside-browser-part2) | 从浏览器内部视角串起输入 URL 到导航提交的完整链路 | 边读边画流程图；读完后默写从输入 URL 到提交导航的步骤，再对照原文补漏 |
| [web.dev：同站与同源](https://web.dev/articles/same-site-same-origin) | 讲清同源与同站的差别，理解导航中的跨源检查与凭证携带 | 读完给五组 URL 判同源同站，再用 location.origin 与 Cookie 域验证结论 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 低端安卓机型的首屏白屏排查 | 渲染流水线、HTTP 请求阶段 | Lighthouse 移动端模拟、真机 Performance 面板 | 模拟降速不能替代真机复测 |
| 后台管理系统的万行表格 | 渲染流水线的布局与绘制阶段 | 固定行高虚拟滚动、IntersectionObserver | 行高不固定时滚动条会跳动 |
| 多人协作白板 | DNS 解析、TCP/TLS 握手 | WebSocket、preconnect 预热信令域名 | 重连要退避，否则会把服务端打满 |
| 跨境电商的多地域访问 | DNS 解析、连接建立阶段 | 多地 CDN、HTTP/3 | 就近调度要看真实解析结果 |
| 静态博客部署 | DNS 解析、HTTP 请求阶段 | CDN 回源、Cache-Control | 缓存时间过长会让发布不生效 |
| H5 活动页秒开 | 解析 + 连接 + 渲染三段耗时 | dns-prefetch、preconnect、内联关键 CSS | 预热域名过多会抢首屏带宽 |
| 微前端子应用加载 | HTTP 请求、渲染流水线 | 预加载子应用入口、框架提供的占位组件 | 子应用注入样式会触发重排 |
| 登录态与 TLS 会话恢复 | TCP/TLS 握手 | TLS 1.3 会话恢复、连接复用 | 会话票据过期后仍要完整握手 |

### 三个场景拆解

#### 场景 1：低端安卓机型的首屏白屏排查

**业务背景**：页面面向机型分布跨度大的移动端用户，团队在按机型分桶的埋点里看到低端机型的首屏出现时间明显落后。复现方式是在中低端真机上用同一份构建产物跑 Lighthouse，并与桌面 Chrome 的结果对照。

**怎么用本页知识解决**：先把首屏耗时按 14 步拆开，确认时间花在 DNS、连接还是渲染，再决定加资源提示还是改渲染路径。下面这段 HTML 把接口域名的解析与连接提前到解析阶段。

```html
<head>
  <!-- 提前解析接口域名，省掉 DNS 查询那一段 -->
  <link rel="dns-prefetch" href="//api.example.com">
  <!-- 提前做 TCP 与 TLS 握手，把连接阶段挪到解析 HTML 之前 -->
  <link rel="preconnect" href="https://api.example.com" crossorigin>
  <!-- 首屏样式内联，去掉渲染前的 CSS 请求等待 -->
  <style>/* 首屏骨架样式 */</style>
</head>
<body>
  <div id="skeleton">加载中</div>
  <script>
    // 首帧绘制时间，用来判断白屏持续了多久
    new PerformanceObserver((list) => {
      const fcp = list.getEntriesByName('first-contentful-paint')[0];
      if (!fcp) return;
      // 上报时带上机型与网络类型，便于分桶
      navigator.sendBeacon('/rum', JSON.stringify({ name: 'fcp', value: fcp.startTime }));
    }).observe({ type: 'paint', buffered: true });
  </script>
</body>
```

- `dns-prefetch` 只做解析，代价小，适合域名多但不确定都会用到的页面。
- `preconnect` 会占用一条连接和相应内存，只对首屏确定要请求的跨域域名加。
- 内联关键样式能缩短渲染前的等待，但会让 HTML 体积上升，需要控制内联量。
- 用 `sendBeacon` 上报可以在页面卸载时也把数据送出去。
- 采集要按机型和网络类型分桶，否则中位数会被高端机型掩盖。

**怎么度量收益**：看 FCP、LCP、TTFB 三个指标。FCP 与 LCP 用 PerformanceObserver 采集或引入 web-vitals 库上报，TTFB 用 Navigation Timing 的 `responseStart` 减去 `startTime`。测量方法是在 Chrome DevTools 的 Network 面板勾选 Disable cache，设置 Slow 4G 与 4x CPU 降速，录制冷启动后导出 trace。

**什么时候不该用**：首屏没有跨域请求的纯静态页加 `preconnect` 只增加连接开销；低端机上同时预热多个域名会和首屏资源抢带宽。接口已经在同域且首个请求就在 HTML 里的页面，也拿不到预热收益。

#### 场景 2：多人协作白板的连接建立与重连

**业务背景**：一个画布同时有数十人在线编辑，任何一次断线都会让其他协作者看到过期画面。复现方式是用压测工具模拟并发长连接，观察建连成功率与重连耗时。

**怎么用本页知识解决**：把用户的等待拆成“建连”与“同步”两段，先压缩握手耗时，再让重连只补拉缺失的操作。下面的代码预热信令域名，并在重连后带序号增量同步。

```js
// 提前对信令域名做 DNS 与握手，把这部分挪到解析 JS 之前
const link = document.createElement('link');
link.rel = 'preconnect';
link.href = 'https://ws.example.com';
link.crossOrigin = '';
document.head.appendChild(link);

let retry = 0;
let lastSeq = 0; // 本地已应用的最后一个操作序号
function connect() {
  const ws = new WebSocket('wss://ws.example.com/board'); // 建立 TLS 连接
  ws.onopen = () => {
    retry = 0;
    ws.send(JSON.stringify({ type: 'sync', since: lastSeq })); // 只补拉缺失操作
  };
  ws.onclose = () => {
    // 指数退避，避免客户端在同一时刻集中重连
    setTimeout(connect, Math.min(30000, 500 * 2 ** retry++));
  };
}
connect();
```

- 连接建立属于 14 步里的 DNS 与握手阶段，预热只能缩短这一段，不改变同步逻辑。
- 重连后带 `since` 序号，服务端只回缺失操作，避免整份画布重传。
- 指数退避要设上限，否则长时间断网后恢复时间会被拉长。
- 断线期间本地操作要先落队列，重连后按序重放再合并远端数据。
- `wss` 走完整 TLS 握手，证书链越长，握手往返越多。

**怎么度量收益**：看首帧到达时间（`onopen` 时间减用户点击时间）、重连成功率、重连耗时。连接阶段的耗时用 PerformanceResourceTiming 的 `connectStart` 与 `connectEnd` 差值测量，WebSocket 帧用 DevTools 的 Network 面板查看。压测用 k6 或 artillery 模拟并发连接。

**什么时候不该用**：用户停留时间短的抽奖活动页，建连成本摊不回来；秒级同步就够用的公告栏用轮询即可，不必维护长连接。跨域域名既不做鉴权也不做心跳的场景，加 `preconnect` 只会多占一条连接。

#### 场景 3：后台管理系统的万行表格

**业务背景**：单个页面要展示上万行审批记录，用户反馈滚动时卡顿、首屏出现时间长。复现方式是用 DevTools 的 Performance 面板录制一次从顶部到底部的滚动过程。

**怎么用本页知识解决**：瓶颈在渲染流水线的布局与绘制阶段，加上一次性发出的接口请求。思路是只渲染视口附近的行，并把请求按可见区切片。

```js
const ROW_H = 48; // 固定行高，滚动条高度可以预先算出
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const i = Number(e.target.dataset.i);
    fetchRow(i); // 进入视口才发请求，控制并发连接数
  });
}, { root: scroller, rootMargin: '300px' }); // 提前 300px 预取，滚动时不留空白

function paint() {
  const start = Math.floor(scroller.scrollTop / ROW_H); // 只重排可见区间
  for (let i = start; i < start + VISIBLE; i++) renderCell(i);
}
// 每帧只重排一次，避免滚动事件里连续触发同步布局
scroller.addEventListener('scroll', () => requestAnimationFrame(paint));
```

- 固定行高让总高度可算，省掉读取每行真实高度引发的同步布局。
- `IntersectionObserver` 的回调不在滚动事件里，能减少一次强制重排。
- 请求按可见区切片，同时打开的连接数下降，服务端压力随之下降。
- `requestAnimationFrame` 把重排收敛到每帧一次，滚动更稳。
- 数据量回到几百行时，这套机制带来的复杂度会超过收益。

**怎么度量收益**：看 INP、滚动时的长任务数量、首屏可见行渲染完成时间。测量方法是用 Performance 面板的 Frames 与 Long Tasks 轨道，配合 web-vitals 上报 INP，Network 面板观察并发连接数。

**什么时候不该用**：行高依赖异步图片、高度不固定的表格用固定行高会出现滚动条跳动；数据行数在几百行以内时，直接渲染即可。需要整表导出或整表打印的页面也不能只渲染可见行。

### 行业先进实践

**资源提示 preconnect 与 dns-prefetch**（出处：MDN Web Docs 的 link 元素 rel 属性条目，Google web.dev 的 Preconnect to required origins）。做法是在 HTML 解析早期就完成 DNS、TCP、TLS 三段，让它们与后续资源下载并行。借鉴时只对首屏必需的接口域名与 CDN 域名加 `preconnect`，其余域名降级为 `dns-prefetch`。

**HTTP 103 Early Hints**（出处：RFC 8297，MDN 的 103 Early Hints 条目）。服务端在最终响应生成之前先返回 103，附带 Link 头，浏览器据此提前请求 CSS 与 JS。借鉴前需核对官方文档：反向代理与 CDN 是否透明转发 1xx 响应。

**关键 CSS 内联**（出处：Google web.dev 的 Extract critical CSS，Lighthouse 的 Eliminate render-blocking resources 审计）。把首屏需要的样式写进 HTML，去掉渲染前的 CSS 请求等待，其余样式改为异步加载。借鉴时需核对构建插件是否支持当前构建工具的版本。

**用 PerformanceObserver 采集 Core Web Vitals**（出处：Google web.dev 的 Core Web Vitals，Chrome 开发者文档的 PerformanceObserver 条目）。在页面内直接观测 LCP、CLS、INP，并按机型与网络类型分桶上报。借鉴时先采 FCP、LCP、TTFB 三个与 14 步直接对应的指标，再补 INP。

**HTTP/3 与 TLS 1.3 会话恢复**（出处：RFC 9114，RFC 8446）。HTTP/3 基于 QUIC，把传输握手与加密握手合并，减少建连往返；TLS 1.3 会话恢复让回访用户少一次往返。借鉴方式是先在 CDN 侧开启，用同一台设备的冷启动与二次访问分别录制，对比 `connectEnd` 与 `requestStart` 的差值。

### 从学到用：落地路线

**第 1 步 选点**：挑一个首屏有跨域接口请求、且埋点能按机型分桶的页面作为试点。验收标准是连续 7 天有 FCP、LCP、TTFB 三个指标上报，且能在看板按网络类型拆分。

**第 2 步 验证**：在这个页面上为接口域名加 `dns-prefetch` 与 `preconnect`，用同一台真机做改动前后对照。验收标准是各跑 10 次取中位数，把测量环境、次数与结论写进文档。

**第 3 步 推广**：把验证过的资源提示写进项目的 HTML 模板，让新页面默认带上。验收标准是构建产物的首页 HTML 里能查到这些标签，且域名数量不超过约定上限。

**第 4 步 防回退**：在 CI 里加一条检查，HTML 模板缺少首屏域名提示或超出上限就报错。验收标准是故意删掉一个 `preconnect` 后流水线失败。

### 动手作业

**目标**：用本地静态页复现从输入 URL 到首屏渲染的各阶段耗时，并验证一次资源提示改动带来的变化。

**步骤**

1. 建一个静态页面，包含一个首屏接口请求（用本地 Node 服务模拟），首屏样式内联。
2. 用 PerformanceObserver 采集 FCP 与 LCP，用 Navigation Timing 的 `responseStart` 减 `startTime` 算出 TTFB。
3. 在 DevTools 的 Network 面板勾选 Disable cache，设置 Slow 4G 与 4x CPU 降速，录制冷启动并导出 trace。
4. 记录改动前的三个指标，同条件跑 10 次取中位数。
5. 在 HTML 里为接口域名加 `dns-prefetch` 与 `preconnect`，重复第 3、4 步。
6. 对照两次数据，写出 DNS 与连接阶段耗时的变化，并说明与预期是否一致。
7. 把结论写成一页说明，包含测量环境、次数与中位数。

**验收标准**

- 能导出一份 trace，里面能看到 DNS、连接、请求、渲染各阶段的时间戳。
- 改动前后的 TTFB 中位数差值有记录，且注明网络类型与设备条件。
- 报告能指出首屏时间主要花在 DNS、连接、首字节还是渲染哪一段。
- 采集脚本在不支持 PerformanceObserver 的浏览器上不会抛错。
- 所有数值都来自本机重复测量，没有引用外部数据。

