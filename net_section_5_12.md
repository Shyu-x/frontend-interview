# 浏览器原理与网络协议（Chapter 5 & 12 深度版）

---

## 目录

- [5.1 浏览器多进程架构](#51-浏览器多进程架构)
- [5.5 输入 URL 到页面展示：完整 14 步](#55-输入-url-到页面展示完整-14-步)
- [5.6 DNS 解析全过程与 DNS 缓存](#56-dns-解析全过程与-dns-缓存)
- [5.7 浏览器缓存机制：强缓存 vs 协商缓存](#57-浏览器缓存机制强缓存-vs-协商缓存)
- [5.13 跨 Tab 通信](#513-跨-tab-通信)
- [5.14 Cookie：大小限制与跨域限制](#514-cookie大小限制与跨域限制)
- [5.15 同源策略、CSP、iframe sandbox 及 CORB/CORP/COEP/COOP](#515-同源策略cspiframe-sandbox-及-corbcorpcoepcoop)
- [5.16 HTTPS 与 TLS 1.3 握手详解](#516-https-与-tls-13-握手详解)

---

## 5.1 浏览器多进程架构

### 定义/背景

现代浏览器采用多进程架构，将浏览器拆分为多个独立进程，以实现进程隔离、安全沙箱和多 Tab 并行稳定运行。引入多进程解决了单进程架构中"一个 Tab 崩溃导致全浏览器崩溃"的核心矛盾。

### 架构全景图

```
+------------------------------------------------------------------+
|                        浏览器主进程 (Browser Process)             |
|  +------------+  +-------------+  +-----------+  +------------+   |
|  | UI线程     |  | 网络线程     |  | 存储线程   |  | 插件线程    |   |
|  | (地址栏/    |  | (DNS/TCP/   |  | (读写      |  | (PDF/Flash |   |
|  | 前进后退)   |  | TLS/HTTP)   |  | localStorage|  |  等插件)   |   |
|  +------------+  +-------------+  +-----------+  +------------+   |
+------------------------------------------------------------------+
              |              |              |              |
    +---------+---+    +-----+----+   +-----+----+   +-----+-----+
    | 渲染进程 1  |    | 渲染进程 2  |   | 渲染进程 3  |   | GPU进程  |
    | (Tab 1)    |    | (Tab 2)    |   | (Tab 3)    |   | (GPU合成) |
    | JS引擎/V8  |    | JS引擎/V8  |   | JS引擎/V8  |   |          |
    | Blink渲染   |    | Blink渲染  |   | Blink渲染  |   |          |
    | 事件循环    |    | 事件循环   |   | 事件循环   |   |          |
    +-----------+     +-----------+   +-----------+   +-----------+
```

### 渲染进程内部结构

```
渲染进程
+------------------------------------------------------------------+
|  主线程 (Main Thread)                                            |
|  +---------+ +---------+ +---------+ +---------+ +------------+  |
|  | HTML    | | CSS     | | DOM     | | Layout  | | Paint      |  |
|  | Parser  | | Parser  | | Tree    | | Tree    | | (Layer)    |  |
|  +---------+ +---------+ +---------+ +---------+ +------------+  |
|  +------------+  +-----------+  +------------+  +--------------+  |
|  | JavaScript |  | Style     |  | Composite  |  | 事件分发器   |  |
|  | Engine(V8) |  | Calculator|  | 器          |  | (Hit Test)  |  |
|  +------------+  +-----------+  +------------+  +--------------+  |
|  +--------------------------------------------------------------+  |
|  | 预扫描器 (Preload Scanner) — 不阻塞解析，快速扫描资源链接     |  |
|  +--------------------------------------------------------------+  |
+------------------------------------------------------------------+
|  合成线程 (Compositor Thread)                                    |
|  +-------------+  +-------------+  +------------+                |
|  | 合成层管理   |  | 光栅化调度   |  | 帧提交      |                |
|  +-------------+  +-------------+  +------------+                |
+------------------------------------------------------------------+
|  工作线程池 (Worker Thread Pool)                                 |
|  +----------+  +----------+  +----------+                         |
|  | Web Worker|  | Service  |  | Worklet  |                         |
|  |           |  | Worker   |  | (Paint/  |                         |
|  +----------+  +----------+  +----------+                         |
+------------------------------------------------------------------+
```

### 各进程职责对比

| 进程 | 职责 | 是否多实例 |
|------|------|----------|
| 浏览器主进程 | 地址栏、书签、前进后退、UI绘制、网络请求管理 | 唯一 |
| 渲染进程 | HTML/CSS 解析、JS 执行、页面渲染、事件处理 | 每个 Tab 一个 |
| GPU 进程 | CSS 动画、3D 变换、GPU 合成 | 可多个 (Chrome 77+) |
| 网络进程 | DNS、TCP、TLS、HTTP 请求 (Chromium 架构) | 唯一 |
| 插件进程 | PDF、Flash 等插件 | 按需创建 |

### Site Isolation（站点隔离）

Chrome 2018 年引入的安全机制，确保不同站点的页面运行在不同渲染进程中，缩小 Spectre 类侧信道攻击面。

```
无 Site Isolation:
  渲染进程 X:
    +--- iframe: a.example.com (子资源)
    +--- iframe: b.example.com (子资源)
    → 同进程，a.com 的 JS 可通过 Spectre 侧信道读取 b.com 数据

有 Site Isolation:
  渲染进程 A: a.example.com 主页面 + a 子 iframe
  渲染进程 B: b.example.com 主页面 + b 子 iframe
  渲染进程 C: cdn.example.com 子资源 (img/css/js)
  → 不同进程，Spectre 攻击面大幅缩小
```

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| 在渲染进程中执行复杂计算 | 阻塞主线程，导致卡顿 | 使用 Web Worker 将计算移至后台线程 |
| 大量同时打开的 Tab | 每个 Tab 一个渲染进程，内存消耗大 | Chrome 会自动合并相同站点的渲染进程 (process reuse) |
| Service Worker 注册过多 | 可能占用过多进程资源 | 合并 Service Worker，按需注册 |
| 滥用 postMessage | 频繁跨进程消息通信有开销 | 用 BroadcastChannel 代替，对大数据用 SharedArrayBuffer |

### 面试追问

**Q1: 为什么 Chrome 要把渲染进程做成沙箱？**

渲染进程沙箱禁止其直接访问文件系统、GPU 设备、摄像头等系统资源。所有特权操作（如网络请求、文件读写）必须通过 IPC 发送到主进程，由主进程代为执行并返回结果。即使渲染进程被恶意代码攻破，攻击者仍无法直接控制操作系统。

**Q2: Site Isolation 和同源策略有什么区别？**

同源策略是浏览器安全模型的基础规则，限制不同源的 document/JS 彼此访问。Site Isolation 是更深层的进程级隔离——即使同源策略允许跨域访问，Chrome 仍会将不同站点的渲染进程分离，彻底杜绝 Spectre 类 CPU 侧信道攻击（利用 CPU 缓存时间差异读取其他进程内存）。

**Q3: 渲染进程和主进程之间如何通信？**

通过 IPC（Inter-Process Communication）通道。渲染进程使用 `window.chrome.ipcRenderer`，主进程使用 `chrome.ipcMain`。消息类型分为控制消息（navigation、create window）、路由消息（URL 请求）和数据消息。此外还有 `SharedMemory`/`SharedArrayBuffer` 实现高效共享内存。

---

## 5.5 输入 URL 到页面展示：完整 14 步

### 定义/背景

从用户在地址栏按下回车键，到页面首次渲染完成，浏览器需要经历 DNS 解析、TCP/TLS 握手、HTTP 请求、渲染流水线等多个阶段。理解这 14 步是排查白屏问题、分析首屏性能瓶颈的理论基础。

### 完整时序流程图

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
Step 3: DNS 解析（详见 5.6 节）
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
Step 8: 检查缓存（强缓存/协商缓存，详见 5.7 节）
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

### 各阶段耗时分析代码

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

### 关键时间节点对比

| 指标 | 定义 | 优化目标 |
|------|------|---------|
| TTFB (Time to First Byte) | 收到第一个字节的时间 | < 200ms |
| FCP (First Contentful Paint) | 首次内容绘制 | < 1.8s |
| LCP (Largest Contentful Paint) | 最大内容绘制 | < 2.5s |
| TTI (Time to Interactive) | 可交互时间 | < 3.8s |
| CLS (Cumulative Layout Shift) | 累计布局偏移 | < 0.1 |
| TBT (Total Blocking Time) | 总阻塞时间 | < 200ms |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| DNS 解析慢 | 首次访问需完整 DNS 查询链 | 使用 `<link rel="dns-prefetch">` 预解析 |
| TLS 握手耗时 | HTTPS 额外 1-2 RTT | 开启 TLS 1.3 (1-RTT)，开启 OCSP Stapling |
| 串行资源加载 | JS 阻塞 CSS/HTML 解析 | 使用 `defer`/`async`，CSS 放 `<head>`，JS 放 `</body>` 前 |
| 服务端 TTFB 慢 | 数据库/后端处理慢 | 服务端缓存、CDN、边缘计算 |
| 渲染阻塞 | 大 JS bundle 阻塞首屏 | Code Splitting、Tree Shaking、预加载关键资源 |

### 面试追问

**Q1: 为什么 `<script>` 默认会阻塞 HTML 解析？**

因为 JS 可能通过 `document.write()` 改变已经解析的 DOM 结构，如果允许并行解析会导致 HTML Parser 的 token 流和 DOM 树不一致。因此浏览器默认在 `<script>` 处暂停 HTML 解析，等 JS 下载并执行完成后再继续。使用 `defer` 或 `async` 可以消除阻塞。

**Q2: 什么是 bfcache（Back/Forward Cache）？**

bfcache 是浏览器对整个页面（包括 JS 堆）做快照保存到内存中，当用户点击后退/前进按钮时，无需重新发起网络请求，直接从内存恢复页面。好处是页面"秒开"，坏处是 JS `unload` 事件不可靠（现代浏览器建议使用 `visibilitychange` 代替）。

**Q3: Preload Scanner 是如何工作的？**

HTML Parser 在主线程解析 HTML 时，如果遇到 `<script>`（同步）会暂停解析。但 Preload Scanner 是一个轻量级后台扫描器，即使主线程被 JS 阻塞，它也能继续扫描 HTML token 流，发现 `<link>`、`<img>`、`<script src>` 等资源，提前通知网络线程发起请求，充分利用网络带宽。

---

## 5.6 DNS 解析全过程与 DNS 缓存

### 定义/背景

DNS（Domain Name System）是将人类可读域名（如 `www.example.com`）转换为机器 IP 地址（如 `93.184.216.34`）的分布式层级数据库。由于其分布式层级设计，完整 DNS 解析可能涉及多跳递归/迭代查询，理解各层缓存和查询类型是网络性能优化的基础。

### DNS 解析完整流程

```
浏览器 DNS 缓存 (Chrome: chrome://net-internals/#dns)
     │ [命中则直接返回，跳过后续]
     ▼ [不存在]
系统 DNS 缓存 (Windows: ipconfig /displaydns, macOS: scutil --dns)
     │ [命中则直接返回]
     ▼ [不存在]
本地 DNS 解析器 (/etc/resolv.conf，通常为 ISP DNS 或 8.8.8.8)
     │
     ▼ [递归查询模式]
┌────────────────────────────────────────────────────────────┐
│  本地 DNS 解析器开始递归查询                                  │
│                                                            │
│  Step 1: 查询根域名服务器 (.) —— 全球 13 组根服务器         │
│       . → 返回 .com TLD 服务器地址                          │
│                                                            │
│  Step 2: 查询 .com TLD 顶级域名服务器                        │
│       .com → 返回 example.com 权威服务器地址                │
│                                                            │
│  Step 3: 查询 example.com 权威域名服务器                    │
│       example.com → 返回 A 记录: 93.184.216.34             │
│                    → 返回 AAAA 记录: 2606:2800:...         │
│                                                            │
│  最终返回: IP 地址                                          │
└────────────────────────────────────────────────────────────┘
```

### 递归查询 vs 迭代查询

```
递归查询（Resolver 替客户端完成所有查询）:
  客户端 → DNS Resolver → 根服务器 → TLD → 权威服务器 → DNS Resolver → 客户端
  (客户端只发一次请求，等一个结果)

迭代查询（每一步只返回最佳答案，客户端决定下一步）:
  客户端 → 根服务器 → [返回 TLD 地址]
  客户端 → TLD 服务器 → [返回权威地址]
  客户端 → 权威服务器 → [返回 IP]
  (DNS Resolver 通常做递归，DNS 服务器之间用迭代)
```

### DNS 缓存层级

| 缓存位置 | 存活时间 | 优先级 | 备注 |
|---------|---------|-------|------|
| 浏览器 DNS 缓存 | TTL 分钟数或数分钟 | 最高 | Chrome 关闭后清除 |
| 操作系统 DNS 缓存 | TTL 分钟数 | 次高 | Windows/macOS 内置 |
| 本地 DNS 解析器缓存 | 可配置 | 视配置 | ISP DNS 或公共 DNS |
| 递归 DNS 服务器 | 取决于 TTL | 中 | 各大厂商 DNS 劫持案例高发区 |
| 权威 DNS 服务器 | 由域名所有者设定 | 来源 | TTL 太长会导致更新延迟 |

### DNS 劫持案例分析

```
案例1: 运营商 DNS 劫持（最常见）
  用户访问 example.com → ISP DNS 返回劫持 IP（插广告）
  → 解决: 使用 DNSCrypt 或 DoH (DNS-over-HTTPS)

案例2: 百度/360 等国内厂商 DNS 污染
  访问 Google → DNS 返回错误 IP
  → 解决: DoH 绕过本地 DNS，直接与可信 DNS 通信

案例3: DNS 缓存投毒 (Kaminsky Attack)
  攻击者伪造 DNS 响应，提前注入错误 IP 到递归 DNS 缓存
  → 解决: 随机源端口 + DNSSEC 验证

案例4: 移动端 WiFi 强制跳转
  连接公共 WiFi 后访问任何网站都被重定向到登录页
  → 解决: DoH / DoT (DNS-over-TLS) / 4G 数据网络
```

### DNS 代码示例

```javascript
// 场景1: HTML 中声明 DNS 预解析（最常用）
// 在 <head> 中声明，提前解析 CDN 域名
const html = `
  <link rel="dns-prefetch" href="//cdn.example.com" />
  <link rel="preconnect" href="https://cdn.example.com"
        crossorigin="anonymous" />
`;
// dns-prefetch: 仅 DNS 解析（低开销）
// preconnect: DNS + TCP + TLS 预连接（高开销，但效果更好）

// 场景2: 使用 fetch 间接触发 DNS 解析
fetch('https://example.com/favicon.ico', { mode: 'no-cors' })
  .then(() => console.log('DNS 已解析'));

// 场景3: DNS-over-HTTPS (DoH) — 防止 DNS 劫持
// 使用 Cloudflare / Google Public DNS / Quad9
async function dnsQueryDoH(domain) {
  const response = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
    { headers: { 'Accept': 'application/dns-json' } }
  );
  const data = await response.json();
  return data.Answer?.[0]?.data; // e.g. "93.184.216.34"
}

// 场景4: DNS-over-TLS (DoT) — 加密 DNS 流量
// Node.js 示例（使用 DoT 端口 853）
import https from 'node:dns/promises';
// 注意：Node.js 原生 DoT 支持在 Node 18+ 中通过自定义 TLS 连接实现
// 实际生产环境推荐使用 dns.resolve() 并配合系统级 DoT 配置

// 场景5: 查看 Chrome DNS 缓存（仅供调试参考）
// 在浏览器地址栏输入: chrome://net-internals/#dns
// 查看 DNS Cache 状态

// 场景6: 监控 DNS 解析时间
const { promisify } = await import('node:dns');
const dns = promisify(require('node:dns'));
const start = Date.now();
const { address } = await dns.resolve4('example.com');
const duration = Date.now() - start;
console.log(`DNS 解析耗时: ${duration}ms, IP: ${address}`);
```

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| DNS 解析阻塞主线程 | 同步 DNS 解析会卡住浏览器 | 避免同步 DNS 调用，使用 `dns-prefetch` 预解析 |
| TTL 设置过长 | 域名 IP 变更后用户无法及时更新 | 静态资源域名 TTL 设置较短，及时更新配置 |
| 运营商 DNS 劫持 | ISP DNS 返回插广告的劫持页面 | 使用 DoH / DoT，使用公共 DNS（如 8.8.8.8） |
| 多个域名增加 DNS 开销 | 每个新域名都需要额外 DNS 查询 | 合并域名到同源，减少 DNS 查询数 |
| DNS 预解析失效 | HTTPS 页面对 HTTP 域名预解析被浏览器阻止 | 确保 `dns-prefetch` 和 `preconnect` 使用 HTTPS |

### 面试追问

**Q1: DNS 劫持和 DNS 污染有什么区别？**

DNS 劫持指运营商/网关篡改了 DNS 解析结果，将用户引导到指定 IP（通常是广告页面），属于主动篡改。DNS 污染（DNS pollution）指在 DNS 查询传输过程中，网络中间节点（如长城防火墙）对特定域名的查询返回虚假 IP，属于网络层面的过滤。两者都导致用户无法访问正确站点，DoH/DoT 可以同时防御。

**Q2: 什么是 DNSSEC？为什么国内很少使用？**

DNSSEC（DNS Security Extensions）通过数字签名验证 DNS 响应未被篡改。域名注册商需要在 DNS 区为每条记录配置签名，用户 resolver 验证签名链。但它不能加密 DNS 流量（需要 DoH/DoT），部署复杂，且国内运营商 DNS 劫持场景下签名验证会失败，因此国内部署率极低。

**Q3: 浏览器 DNS 缓存和 TCP 连接复用有什么关系？**

HTTP Keep-Alive 复用的是 TCP 连接，连接建立后域名已被解析，不需要再次 DNS 查询。但如果连接断开重连，就需要重新 DNS 查询。使用 HTTP/2 或 HTTP/3 时，同一域名的多个请求可以共用连接，减少 DNS 查询频率。结合 `preconnect` 可以同时预热 DNS + TCP + TLS。

---

## 5.7 浏览器缓存机制：强缓存 vs 协商缓存

### 定义/背景

浏览器缓存是减少不必要网络传输、提升页面加载速度的核心机制。强缓存通过设定过期时间直接使用本地缓存，无需与服务端通信；协商缓存通过服务端验证缓存有效性决定是否使用缓存。两者配合构成完整的缓存策略，是性能优化必考题。

### 完整缓存决策流程

```
HTTP 响应到达浏览器
         │
         ▼
检查 Cache-Control: max-age / Expires (强缓存)
         │
    ┌────┴────┐
    │  命中    │ 不命中
    ▼         ▼
直接使用缓存   检查 ETag / Last-Modified (协商缓存)
(200 OK)          │
             ┌────┴────┐
             │  命中    │ 不命中
             ▼         ▼
         使用缓存    发送条件请求
         (304)       (If-None-Match / If-Modified-Since)
                         │
                   ┌─────┴─────┐
                   │ 服务端确认 │
                   ▼           ▼
              304 Not        200 返回
              Modified       新资源 + 新 ETag/Last-Modified
```

### 强缓存详解

```http
# 优先级: Cache-Control > Expires（Expires 是 HTTP/1.0 遗留字段）
Cache-Control: max-age=3600           # 相对时间，3600秒后过期
Cache-Control: s-maxage=7200          # 代理服务器（CDN）缓存时间
Cache-Control: no-cache               # 每次使用前必须和服务器确认（走协商缓存）
Cache-Control: no-store               # 完全不缓存（包括磁盘）
Cache-Control: public                  # 可被任何节点缓存（浏览器、CDN、代理）
Cache-Control: private                # 只有浏览器能缓存，CDN/代理不能缓存
Cache-Control: must-revalidate        # 缓存过期后必须从源站验证
Cache-Control: immutable              # 响应内容永远不会变（对版本化资源很有用）
Expires: Mon, 01 Jan 2027 00:00:00 GMT  # 绝对时间（依赖客户端时钟，有误差）
```

### no-cache vs no-store 对比

| 指令 | 含义 | 网络请求 | 适用场景 |
|------|------|---------|---------|
| `Cache-Control: no-store` | 完全不缓存，任何地方都不存 | 每次完整下载 | 金融网站、登录接口（包含 Token/PII） |
| `Cache-Control: no-cache` | 缓存，但使用前必须重新验证 | 发送条件请求（304/200） | 敏感但需要缓存节省带宽的数据 |
| `Cache-Control: max-age=0` | 等价于 no-cache | 发送条件请求 | 强制每次验证 |

### 协商缓存详解

```http
# 服务端响应头（告诉浏览器缓存的标识）
ETag: "abc123def456"        # 文件内容的哈希/版本标识（精确）
Last-Modified: Tue, 01 Jan 2026 12:00:00 GMT  # 文件最后修改时间（粗粒度）

# 浏览器后续请求头（带上缓存标识，询问服务器是否过期）
If-None-Match: "abc123def456"     # 对应 ETag
If-Modified-Since: Tue, 01 Jan 2026 12:00:00 GMT  # 对应 Last-Modified
```

### ETag vs Last-Modified 对比

| 特性 | ETag | Last-Modified |
|------|------|--------------|
| 精度 | 精确（内容哈希，md5/sha1） | 粗粒度（秒级，文件系统时间） |
| 精度问题 | 小文件秒内修改可能丢失 | 无法区分秒内多次修改 |
| 计算成本 | 需计算哈希（CPU 消耗） | 直接读文件时间（快速） |
| 分布式兼容 | 需确保多服务器 ETag 一致（否则 200 返回） | 天然一致（文件系统时间） |
| 推荐场景 | API 响应、频繁更新的动态内容 | 静态文件、大文件 |

### Express 服务端缓存代码实现

```typescript
import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const app = express();

// 强缓存 + 协商缓存完整实现
app.get('/static/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'public', req.params.filename);
  const stat = fs.statSync(filePath);
  const mtime = stat.mtime.toUTCString();

  // 生成 ETag（使用 Weak ETag 标记 "W/"）
  const fileBuffer = fs.readFileSync(filePath);
  const etag = `W/"${crypto.createHash('sha1').update(fileBuffer).digest('base64')}"`;

  // 协商缓存：检查客户端请求头
  // 优先级：If-None-Match (ETag) > If-Modified-Since (Last-Modified)
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();  // 命中协商缓存
    return;
  }
  if (req.headers['if-modified-since'] === mtime) {
    res.status(304).end();
    return;
  }

  // 设置缓存策略
  const filename = req.params.filename;
  if (filename.endsWith('.html')) {
    // HTML: 不缓存，确保用户总是拿到最新版本
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else {
    // 静态资源（JS/CSS/图片）: 长期缓存 + immutable
    // 版本化文件名（app.a1b2c3.js）天然实现了更新逻辑
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', mtime);
  // Vary 头：告知缓存根据 Accept-Encoding 头区分缓存版本
  res.setHeader('Vary', 'Accept-Encoding');
  res.sendFile(filePath);
});

// Service Worker 缓存策略示例（TypeScript）
const CACHE_NAME = 'v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/bundle.js',
  '/style.css',
];

// 缓存优先策略（适合静态资源）
async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

// 网络优先策略（适合 API 数据）
async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Stale-While-Revalidate（最适合混合场景）
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
    return response;
  });
  return cached || networkPromise;
}
```

### 6 种缓存决策场景对比

| 场景 | Cache-Control | Expires | ETag/Last-Modified | 行为 |
|------|--------------|---------|---------------------|------|
| 长期缓存静态资源 | `max-age=31536000, immutable` | — | 有 | 命中强缓存，1 年不请求 |
| HTML 页面 | `no-cache, no-store` | — | — | 每次加载最新内容 |
| 用户相关数据 | `private, max-age=0` | — | 有 | 每次验证，用户独占 |
| CDN 缓存 | `s-maxage=7200` | — | — | CDN 缓存 2 小时 |
| API 响应（频繁更新） | `no-cache` + ETag | — | 有 | 条件请求，节省带宽 |
| 永不变化的资源 | `public, max-age=31536000` | — | — | 永久缓存，版本化文件名 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| HTML 设置了强缓存 | 用户无法获取新版本 JS/CSS | HTML 用 `no-cache`，静态资源用长期缓存 + 版本化 |
| `Expires` 和 `Cache-Control` 同时设置 | 不同浏览器行为不一致 | 只设置 `Cache-Control`，`Expires` 作为降级 |
| CDN 和源站 ETag 不一致 | 多 CDN 节点 ETag 不同，协商缓存失效 | 用内容哈希作为版本号，不用 ETag |
| `no-store` 误用于非敏感数据 | 每次都下载完整内容，浪费带宽 | 敏感数据用 `no-store`，其他用 `no-cache` |
| 浏览器前进后退使用 bfcache | bfcache 恢复页面，不经过缓存检查 | 用 `pageshow` 事件监听，`persisted` 标志判断 |

### 面试追问

**Q1: 打开一个网站后立刻按 F5 刷新和先关闭再重新打开，有什么区别？**

F5 刷新（`location.reload()`）：浏览器发送 `Cache-Control: max-age=0`（等同于 `no-cache`），会走协商缓存验证（发送 `If-None-Match`/`If-Modified-Since`），如果资源未过期则 304 Not Modified。关闭标签页再打开：如果是 bfcache，恢复内存快照，完全不经过网络。如果非 bfcache（如 Firefox 的 bfcache 不支持 WebSocket 等特性），走完整强缓存流程。

**Q2: Service Worker 的缓存和 HTTP 缓存有什么区别？**

HTTP 缓存由浏览器自动管理，遵循 HTTP 头指令。Service Worker 缓存是 JS 代码控制的缓存代理，可以实现细粒度的缓存策略（Stale-While-Revalidate、Network-First 等），可以拦截/修改请求，实现离线能力（Progressive Web App），但增加了开发复杂度。

**Q3: 如何实现"缓存更新但用户不刷新就看不到新版本"？**

核心思路是缓存失效后强制更新。方案有四：（1）给资源文件名加哈希（`bundle.a1b2c3.js`），内容变则文件名变，绕过强缓存；（2）使用 Service Worker 的 `skipWaiting()` + `Clients.claim()` 强制新 SW 立即生效；（3）在 HTML 中内联 SW 注册代码，SW 文件名加版本号；（4）通过版本号检测 + 弹窗提示用户刷新。

---

## 5.13 跨 Tab 通信

### 定义/背景

同源策略限制了不同 Tab/窗口之间的 JS 访问，但现代 Web 应用（多 Tab 管理面板、实时协作编辑器）需要跨 Tab 通信。浏览器提供了 BroadcastChannel、postMessage、SharedWorker、localStorage 监听等多种方案，各有适用场景。

### 通信方式全景对比

```
Tab A                                           Tab B
  │                                               │
  │── BroadcastChannel (同源，推荐) ────────────>│  支持频道订阅，简单易用
  │── localStorage + storage 事件 ─────────────>│  仅跨 Tab 通知，需轮询
  │── SharedWorker ─────────────────────────────>│  共享状态，适合复杂场景
  │── postMessage (需引用对方 window) ─────────>│  iframe/新窗口通信
```

### BroadcastChannel（现代，推荐）

```typescript
// Tab A: 发送消息
const channel = new BroadcastChannel('app-channel');

// 发送消息
channel.postMessage({ type: 'USER_LOGIN', payload: { userId: 42, name: 'Alice' } });

// Tab B: 接收消息
const channel = new BroadcastChannel('app-channel');
channel.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;
  if (type === 'USER_LOGIN') {
    console.log('用户已登录:', payload.name);
  }
};

// 关闭频道
channel.close();

// 跨 Tab 状态同步示例
class TabSync {
  private channel: BroadcastChannel;
  private storageKey: string;
  private onUpdate: (data: unknown) => void;

  constructor(channelName: string, storageKey: string, onUpdate: (data: unknown) => void) {
    this.channel = new BroadcastChannel(channelName);
    this.storageKey = storageKey;
    this.onUpdate = onUpdate;

    this.channel.onmessage = (e) => {
      if (e.data.key === storageKey) {
        onUpdate(JSON.parse(e.data.value));
      }
    };
  }

  update(data: unknown): void {
    const value = JSON.stringify(data);
    localStorage.setItem(this.storageKey, value);
    this.channel.postMessage({ key: this.storageKey, value });
  }
}
```

### SharedWorker（共享状态，适合复杂场景）

```javascript
// shared-worker.js — 独立 JS 文件
const connections = new Map(); // port -> 客户端信息
let sharedState = { theme: 'light', user: null };

self.onconnect = (e) => {
  const port = e.ports[0];
  const clientId = Date.now() + Math.random();
  connections.set(clientId, port);

  // 发送当前共享状态给新连接的 Tab
  port.postMessage({ type: 'SYNC_STATE', state: sharedState });

  port.onmessage = (event) => {
    const { type, payload } = event.data;

    if (type === 'UPDATE_STATE') {
      // 更新共享状态，并广播给所有其他 Tab
      sharedState = { ...sharedState, ...payload };
      connections.forEach((p, id) => {
        if (id !== clientId) {
          p.postMessage({ type: 'STATE_UPDATED', state: sharedState });
        }
      });
    }
  };

  port.start();
};

// 主线程使用 SharedWorker
const worker = new SharedWorker('/shared-worker.js');
worker.port.onmessage = (e) => {
  const { type, state } = e.data;
  if (type === 'SYNC_STATE' || type === 'STATE_UPDATED') {
    console.log('状态同步:', state);
    // 更新当前 Tab 的 UI
  }
};
worker.port.start();
```

### postMessage（iframe / 新窗口通信）

```javascript
// 方式1: 向 iframe 发送消息
const iframe = document.querySelector('iframe');
iframe.contentWindow.postMessage(
  { type: 'CONFIG_UPDATE', config: { apiUrl: 'https://api.example.com' } },
  'https://trusted.example.com'  // 目标源，安全限制
);

// 接收消息
window.addEventListener('message', (event) => {
  // 验证来源，防止钓鱼
  if (event.origin !== 'https://trusted.example.com') {
    console.warn('忽略来自未知源的消息:', event.origin);
    return;
  }
  console.log('收到消息:', event.data);
});

// 方式2: 向新窗口发送消息
const popup = window.open('/popup.html', 'Popup', 'width=400,height=300');
popup?.postMessage('AUTH_SUCCESS', 'https://example.com');

// 方式3: 使用 MessageChannel 建立双向通道
const channel = new MessageChannel();
// 为iframe端创建port
iframe.contentWindow.postMessage('init', '*', [channel.port2]);
// 主窗口监听port消息
channel.port1.onmessage = (e) => console.log('iframe说:', e.data);
channel.port1.postMessage('你好 iframe');
```

### localStorage + storage 事件

```javascript
// Tab A: 写入
localStorage.setItem('auth_token', 'abc123');
localStorage.setItem('app_state', JSON.stringify({ sidebar: 'open' }));

// Tab B/C/D: 监听 storage 变化
window.addEventListener('storage', (event) => {
  console.log({
    key: event.key,           // 变化的键
    oldValue: event.oldValue, // 旧值（其他 Tab 删掉则为 null）
    newValue: event.newValue, // 新值（其他 Tab 删掉则为 null）
    url: event.url,           // 触发变化的文档 URL
    storageArea: event.storageArea, // localStorage 或 sessionStorage
  });
});

// 轮询方案（storage 事件不触发自身 Tab）
let lastValue = localStorage.getItem('data');
setInterval(() => {
  const current = localStorage.getItem('data');
  if (current !== lastValue) {
    console.log('本地值被外部 Tab 改变:', current);
    lastValue = current;
  }
}, 1000);
```

### 四种方案对比

| 方案 | 同源限制 | 跨域 | 数据量 | 实时性 | 适用场景 |
|------|---------|------|--------|--------|---------|
| BroadcastChannel | 是 | 否 | 任意大小 | 立即 | 同源多 Tab 状态同步（推荐） |
| localStorage + storage | 是 | 否 | ~5MB | 延迟（事件触发） | 配置同步、登录状态广播 |
| SharedWorker | 是 | 否 | 共享内存 | 立即 | 需要共享状态、多 Tab 共享连接 |
| postMessage | 否 | 可指定 | 任意大小 | 立即 | iframe 通信、跨域通信 |
| MessageChannel | 端口端绑定 | 否 | 任意大小 | 立即 | Worker 通信、双向通道 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| BroadcastChannel 同源限制 | 不同子域名的 Tab 无法通信 | 使用 postMessage + 同一父域名代理，或 postMessage + BroadcastChannel 组合 |
| storage 事件不触发自身 | 自身 Tab 修改 localStorage 不触发 storage 事件 | 用额外的 BroadcastChannel 或轮询 |
| SharedWorker 内存泄漏 | 忘记 `port.start()` 或未移除连接 | 确保在 `beforeunload` 中清理连接 |
| postMessage 安全漏洞 | 未验证 `event.origin` | 始终检查 `event.origin === 期望的源` |
| 序列化开销 | 跨 Tab 传递大对象，深拷贝开销大 | 使用 SharedArrayBuffer 或 MessageChannel transfer |

### 面试追问

**Q1: BroadcastChannel 和 postMessage 的核心区别是什么？**

BroadcastChannel 是"频道订阅"模式，同频道的所有 Tab 互为广播，无需持有对方引用，适合状态同步。postMessage 是"定向投递"模式，必须持有 `window`/iframe 的引用，适合 iframe 或 `window.open()` 场景。BroadcastChannel 更简洁，postMessage 更通用。

**Q2: SharedWorker 和 Web Worker 的区别是什么？**

Web Worker 是一个独立的线程，运行独立 JS 文件，不阻塞主线程，但没有共享状态。SharedWorker 是可以被多个 Tab/页面共享的 Worker，所有连接共享同一个 JS 实例和内存状态，适合跨 Tab 共享长连接（如 WebSocket）或共享状态。SharedWorker 兼容性比 Web Worker 稍差。

**Q3: localStorage 和 sessionStorage 的区别是什么？**

`localStorage`：永久存储，同源共享，跨 Tab 有效，除非手动清除或浏览器清除。`sessionStorage`：仅当前标签页有效，关闭标签页即清除，不跨 Tab 共享。两者都只存储字符串，都是同步 API（会阻塞主线程）。对于需要跨 Tab 实时同步的场景，用 `localStorage + storage` 事件。

---

## 5.14 Cookie：大小限制与跨域限制

### 定义/背景

Cookie 是浏览器存储在客户端的小型文本数据，随每个 HTTP 请求自动发送到服务器端，是实现会话管理、用户偏好、身份认证的基础机制。由于同源策略限制，Cookie 只能发送给同源服务器，因此也天然具备跨站请求伪造（CSRF）防护能力。

### 完整属性解析

```http
# 服务器端设置 Cookie（Set-Cookie 头）
Set-Cookie: sessionId=abc123xyz; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600

# HttpOnly: JS 无法通过 document.cookie 读取（防止 XSS 盗取 Cookie）
# Secure: 仅在 HTTPS 连接下发送（防止中间人攻击）
# SameSite: CSRF 防护机制（详见下表）
# Path=/: Cookie 发送的路径范围（/api 下的请求才会携带）
# Domain: Cookie 生效的域名（不设置则只能是当前精确域名）
# Max-Age=3600: Cookie 存活秒数（Expires 用绝对时间）
```

### SameSite 属性对比

| 值 | 导航 GET 请求 | POST/JSON 等非导航请求 | 图片/JS 资源请求 | 适用场景 |
|----|-------------|----------------------|--------------|---------|
| `Strict` | 不携带 | 不携带 | 不携带 | 最安全，适合银行类业务 |
| `Lax`（默认） | 携带（导航） | 不携带 | 携带 | 兼顾安全与用户体验 |
| `None` | 携带 | 携带 | 携带 | 跨站 API（如嵌入 iframe 支付）需配合 Secure |

```
SameSite=Lax 行为示意:
  用户在 example.com 点击链接导航到 shop.com → 携带 shop.com 的 Lax Cookie
  用户在 example.com 发起 POST /api/orders → 不携带 shop.com 的 Cookie（防 CSRF）
  <img src="https://shop.com/track"> → 携带 Cookie（用于统计分析）
```

### Cookie 限制与大小

| 限制 | 值 |
|------|---|
| 单个 Cookie 大小 | 最大 4KB（RFC 6265 规范限制） |
| 单个域名下 Cookie 总数 | 通常限制 150-180 个（浏览器实现各异） |
| Cookie 数量超额 | 早期 Cookie 被删除（无明确顺序），现代浏览器随机删除 |
| Cookie 总大小 | 建议单个域名下所有 Cookie 总和不超过 4KB（实际限制更宽松） |

### Cookie 操作代码示例

```javascript
// ❌ 不推荐：直接拼接 Cookie（XSS 风险）
document.cookie = `session=${userInput}`; // 若 userInput 包含 ; 会污染 Cookie

// ✅ 推荐：使用 encodeURIComponent
document.cookie = `session=${encodeURIComponent(sessionToken)}; Path=/; Max-Age=3600`;

// 读取所有 Cookie（返回字符串，需手动解析）
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// 删除 Cookie（设置 Max-Age=0）
document.cookie = `session=; Path=/; Max-Age=0`;

// 服务器端设置（Node.js/Express）
import cookie from 'cookie';

app.use((req, res, next) => {
  const cookies = cookie.parse(req.headers.cookie || '');
  // 验证 session
  next();
});

res.setHeader('Set-Cookie', cookie.serialize('sessionId', sessionToken, {
  httpOnly: true,   // JS 无法读取
  secure: true,     // 仅 HTTPS
  sameSite: 'Strict', // CSRF 防护
  path: '/',
  maxAge: 3600,     // 1 小时
  domain: '.example.com', // 根域名，子域名共享
}));

// Cookie 分割：超过 4KB 时按优先级拆分到多个 Cookie
function splitCookie(name: string, value: string): void {
  const MAX_SIZE = 4000; // 留余量
  const chunks = Math.ceil(value.length / MAX_SIZE);
  for (let i = 0; i < chunks; i++) {
    document.cookie = `${name}_${i}=${value.slice(i * MAX_SIZE, (i + 1) * MAX_SIZE)}; Path=/`;
  }
}
```

### Cookie vs Web Storage vs IndexedDB

| 特性 | Cookie | localStorage | sessionStorage | IndexedDB |
|------|--------|-------------|----------------|-----------|
| 大小 | ~4KB/个 | ~5MB | ~5MB | ~50MB+ |
| 随请求发送 | 自动（每次 HTTP 请求） | 不自动 | 不自动 | 不自动 |
| JS 访问 | 可读写（无 HttpOnly） | 可读写 | 可读写 | API |
| 生命周期 | 可设置 Max-Age | 永久 | 标签页关闭 | 永久 |
| 跨域 | 受 SameSite 限制 | 不同 | 不同 | 不同 |
| 适用场景 | 会话认证 | 配置持久化 | 临时状态 | 大型结构化数据 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| Cookie 在 HTTP 下传输 | 明文传输，可被中间人窃取 | 务必设置 `Secure`，全站 HTTPS |
| JS 可以读取 Cookie | XSS 攻击可获取敏感 Cookie | 设置 `HttpOnly`（会话 Cookie 必须 HttpOnly） |
| 未设置 SameSite | 遭受 CSRF 攻击风险 | 始终显式设置 `SameSite=Strict/Lax` |
| Cookie 大小超 4KB | 被浏览器截断或丢弃 | 大数据存 IndexedDB，Cookie 只存 sessionId |
| 多余 Cookie 随请求发送 | 增加请求大小（浪费带宽） | 设置精确 `Path`，及时删除过期 Cookie |
| 将 Token 存在 localStorage | 容易被 XSS 盗取 | 使用 HttpOnly Cookie 存储敏感 Token |

### 面试追问

**Q1: `SameSite=None` 必须配合 `Secure`，这是为什么？**

`SameSite=None` 允许跨站 Cookie 发送，在 HTTP 页面上发送明文 Cookie 容易被中间人截获，造成安全风险。RFC 6265 因此规定 `SameSite=None` 必须同时标记 `Secure`（即仅 HTTPS 下发送），强制跨站 Cookie 必须在加密通道中传输，防止被窃取。

**Q2: Cookie 的 `Domain` 属性和同源策略有什么关系？**

`Domain` 属性允许 Cookie 发送给子域名（默认只能发送给设置 Cookie 的精确域名）。例如在 `api.example.com` 设置 `Domain=example.com`，则 Cookie 也会发送给 `www.example.com` 和 `shop.example.com`。但不能设置为父域的反向（如 `example.com` 不能设为 `Domain=com`）。这是 Cookie 的"有限共享"，与同源策略中跨子域名的限制（不同源）并行生效。

**Q3: HttpOnly Cookie 能防御什么攻击？**

XSS（跨站脚本攻击）攻击者通过注入 JS 脚本读取 `document.cookie` 获得 Cookie，进而伪造用户身份发起请求。`HttpOnly` 属性使 Cookie 只能通过 HTTP 请求发送，JS 无法访问，即使用户页面存在 XSS 漏洞，攻击者也无法直接拿到 Cookie。注意：`HttpOnly` 不能防御 CSRF（跨站请求伪造），因为 CSRF 请求由浏览器自动用 Cookie 发起，无需 JS 读取。

---

## 5.15 同源策略、CSP、iframe sandbox 及 CORB/CORP/COEP/COOP

### 定义/背景

同源策略（SOP）是浏览器的核心安全基石，严格限制不同源的 document 和 JS 彼此访问。Content Security Policy（CSP）通过响应头声明允许加载的资源来源，防止 XSS 注入攻击。iframe sandbox 提供细粒度的嵌入隔离。CORB/CORP/COEP/COOP 则是现代浏览器引入的 Spectre 防护机制。

### 同源策略（Same-Origin Policy）

```
同源定义: 协议（scheme）+ 域名（host）+ 端口（port）三者完全相同

https://example.com:443 (基准)
  ✅ https://example.com:443       → 同源
  ✅ https://example.com/          → 同源（路径不同没关系）
  ❌ http://example.com:443        → 协议不同
  ❌ https://sub.example.com:443   → 子域名不同（不同源）
  ❌ https://example.com:8080       → 端口不同

注意: www.example.com 和 example.com 是不同域名（同源策略中视为不同源）
```

### 同源限制的具体表现

```javascript
// 1. DOM 访问限制：不同源的 iframe.contentWindow 无法访问
const iframe = document.querySelector('iframe');
try {
  iframe.contentWindow.document; // SecurityError: blocked
} catch (e) { console.error(e); }

// 2. AJAX 请求限制：fetch/xhr 只能请求同源（除非 CORS）
fetch('https://other-domain.com/api'); // CORS 预检失败则被阻断

// 3. localStorage/IndexedDB 限制：不同源数据隔离
localStorage.getItem('token'); // 只能访问当前源的存储

// 4. Cookie 限制：默认只能发给设置它的精确域名
// Domain=example.com 的 Cookie 不会发给 sub.example.com（除非显式声明）
```

### CSP（Content Security Policy）

```http
# 服务器响应头设置 CSP（多层防护）
Content-Security-Policy:
  default-src 'self';                    # 默认仅允许同源
  script-src 'self' 'nonce-abc123';      # 仅同源 + 带 nonce 标签的内联脚本
  style-src 'self' https://fonts.googleapis.com;  # 同源 + Google Fonts
  img-src 'self' data: https:;           # 同源 + data: + https 图片
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com;    # AJAX/WebSocket 目标
  frame-ancestors 'none';               # 不允许被任何 frame 嵌入
  base-uri 'self';                      # 限制 <base> 目标
  report-uri /csp-violation;            # 违规报告地址
```

```html
<!-- meta 标签设置 CSP（不推荐用于报告 URI） -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'nonce-abc123';" />

<!-- nonce 策略：每次页面加载生成随机 nonce，内联脚本需匹配才能执行 -->
<script nonce="abc123">
  // 带有匹配 nonce 的内联脚本才会执行
  // 攻击者的 XSS 注入脚本没有 nonce，无法执行
</script>
```

### iframe sandbox

```html
<!-- 基本用法：完全隔离 -->
<iframe src="/sandboxed.html" sandbox></iframe>
<!-- 等价于: sandbox="allow-scripts" (默认仅允许脚本执行，禁止其他所有权限) -->

<!-- 细粒度权限控制 -->
<iframe
  src="https://untrusted.example.com/page.html"
  sandbox="
    allow-scripts         # 允许执行脚本
    allow-forms          # 允许表单提交
    allow-same-origin    # 允许访问同源内容（⚠️ 降低隔离级别）
    allow-top-navigation # 允许顶层导航（⚠️ 安全风险）
    allow-popups         # 允许弹窗
  "
></iframe>

<!-- 最严格的 sandbox（适合完全不可信的内容）: 不允许脚本 + 表单 + 导航 -->
<iframe src="untrusted.html" sandbox="allow-scripts"></iframe>
```

### CORB/CORP/COEP/COOP（Spectre 防护机制）

```
Spectre 攻击原理:
  攻击者利用 CPU 预测执行（Speculative Execution）的副作用，
  通过测量缓存访问时间差异，读取同一进程（渲染进程）内其他数据的内存内容。
  只要两个数据在同一进程内，即使不同源也可能被读取。

浏览器的进程级防御（Site Isolation）将不同站点分离到不同进程，大幅减少攻击面。
  但 CORB/CORP/COEP/COOP 提供更深层的跨进程防护。
```

| 机制 | 英文全称 | 作用 | 设置方式 |
|------|---------|------|---------|
| CORB | Cross-Origin Read Blocking | 阻止跨源 JS 读取跨源资源（图片/音频等） | 自动生效（Chrome 67+） |
| CORP | Cross-Origin Resource Policy | 服务端声明禁止某些源读取资源 | `Cross-Origin-Resource-Policy: same-origin` |
| COEP | Cross-Origin-Embedder Policy | 要求所有跨源资源明确授权 | `Cross-Origin-Embedder-Policy: require-corp` |
| COOP | Cross-Origin-Opener Policy | 关闭跨源窗口的 opener 引用，防止 Spectre 通道 | `Cross-Origin-Opener-Policy: same-origin` |

```http
# CORP：服务端声明，不允许跨域请求我的资源
Cross-Origin-Resource-Policy: same-origin    # 仅同源可读
Cross-Origin-Resource-Policy: same-site      # 仅同站可读（同协议+同域名）
Cross-Origin-Resource-Policy: cross-origin  # 允许跨域读取（需配合 CORS）

# COEP：配合 CORP 使用，确保所有跨源资源明确授权
Cross-Origin-Embedder-Policy: require-corp
# 启用后，fetch/cross-origin resources 必须有 CORS 或 CORP 头
# 否则资源不加载，适合高安全要求场景

# COOP：防止利用 window.open 建立 Spectre 通道
Cross-Origin-Opener-Policy: same-origin         # 强制隔离，最严格
Cross-Origin-Opener-Policy: same-origin-allow-popups  # 允许 popup，但 opener 隔离
Cross-Origin-Opener-Policy: unsafe-none        # 默认值，允许 opener 引用

# 组合使用（OWASP 建议的高安全配置）:
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
# 配合 CORP: same-origin
# 结果：完全跨进程隔离，SharedArrayBuffer 等 API 可用（需此配置）
```

### 对比：同源策略 vs CSP vs iframe sandbox

| 机制 | 控制对象 | 设置位置 | 防护目标 |
|------|---------|---------|---------|
| 同源策略（SOP） | DOM/Cookie/Storage/AJAX | 浏览器强制 | 不同源 JS 相互访问 |
| CSP | 资源加载来源 | HTTP 响应头 / meta | XSS 注入 / 资源劫持 |
| iframe sandbox | 嵌入页面能力 | iframe 属性 | 恶意嵌入内容 |
| CORB | 跨源数据读取 | 浏览器自动 | 跨源"被动"资源（图片等）被 JS 读取 |
| CORP | 跨源资源提供 | HTTP 响应头 | 禁止跨源读取敏感资源 |
| COEP | 跨源资源嵌入授权 | HTTP 响应头 | 所有跨源资源必须明确授权 |
| COOP | window.opener | HTTP 响应头 | 跨窗口引用链利用 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| 误用 `allow-same-origin` | sandbox 中允许 same-origin 会绕过同源策略 | 除非必要，不用 `allow-same-origin` |
| CORS 配置过于宽松 | `Access-Control-Allow-Origin: *` 允许所有来源 | 指定精确域名，尽量不用 `*` |
| CSP 包含 `unsafe-inline` | 完全绕过 CSP 的 XSS 防护 | 使用 nonce 或 hash 策略 |
| COEP 影响跨源资源 | 开启 COEP 后无 CORP/CORS 的资源不加载 | 审查所有跨源依赖，添加 CORP 或 CORS 头 |
| COOP 影响第三方服务 | `window.open`/`window.opener` 被切断 | 使用 `same-origin-allow-popups` 而非 `same-origin` |
| CORB 误拦截图片请求 | CORB 可能将非图片响应识别为图片并阻断 JS 读取 | 服务端设置 `X-Content-Type-Options: nosniff` |

### 面试追问

**Q1: 为什么 `allow-same-origin` + `allow-scripts` 在 sandbox 中危险？**

`sandbox="allow-same-origin"` 允许 sandbox 内的页面将其 document.domain 设为与嵌入页面的父框架相同（绕过同源策略）。配合 `allow-scripts` 可以执行 JS，进而通过调整 document.domain 访问父框架的 DOM/Cookie。这是沙箱逃逸（sandbox escape）路径。正确做法是：如果内容不可信，坚决不使用 `allow-same-origin`。

**Q2: 使用 COEP/COOP 的副作用是什么？**

开启 `Cross-Origin-Embedder-Policy: require-corp` 后，所有跨源 fetch/资源必须显式通过 CORS 或 CORP 授权，否则资源加载失败。这可能破坏依赖第三方 CDN 资源但未配置 CORP 的现有项目。开启 `Cross-Origin-Opener-Policy: same-origin` 会使 `window.open()` 返回的 popup window 的 opener 为 `null`，影响第三方登录回调等功能。使用前需要全面审计跨源资源。

**Q3: CORS 和 CSP 有什么区别？**

CORS（Cross-Origin Resource Sharing）解决的是"浏览器是否允许前端 JS 读取跨源 HTTP 响应"的问题，是服务器端授权客户端 JS 读取数据。CSP（Content Security Policy）解决的是"浏览器是否允许页面加载/执行某些资源"的问题，是页面端声明可信任资源来源。CORS 侧重数据读取权限，CSP 侧重代码注入防护。

---

## 5.16 HTTPS 与 TLS 1.3 握手详解

### 定义/背景

HTTPS 是 HTTP over TLS，在 HTTP 和 TCP 之间插入 TLS 层，提供加密传输、服务器身份认证和数据完整性保护。TLS 1.3 是 2018 年标准化的最新版本，将完整握手从 2-RTT 减少到 1-RTT（甚至 0-RTT），并移除了不安全的加密套件，是现代互联网的安全基石。

### TLS 1.2 vs TLS 1.3 握手对比

```
TLS 1.2 — 完整握手（2-RTT）:
  客户端                          服务器
    │                              │
    │──── ClientHello ───────────>│  RTT 1: 发送支持的加密套件 + 随机数
    │<─── ServerHello + 证书 + ...│  RTT 1: 返回证书 + 服务器随机数
    │──── ClientKeyExchange ─────>│  发送 PreMasterSecret
    │  [双方计算会话密钥]           │
    │──── ChangeCipherSpec ─────>│
    │──── Finished ─────────────>│
    │<─── ChangeCipherSpec ──────│
    │<─── Finished ─────────────│
    │  HTTP 请求（加密）────────────>│  RTT 2: 实际请求（加密后）

TLS 1.3 — 完整握手（1-RTT）:
  客户端                          服务器
    │                              │
    │──── ClientHello              │  RTT 1: 发送支持的加密套件 + 随机数
    │      + supported_versions    │         + (ClientHello 本身就是加密的!)
    │      + key_share (ECDH 公钥) │
    │<─── ServerHello              │
    │      + key_share (ECDH 公钥) │  RTT 1: 返回 ServerHello + ECDH 公钥
    │      + 证书 + 签名           │         + 证书 + 签名
    │  [双方立即计算会话密钥]        │
    │  HTTP 请求（加密）────────────>│  RTT 1: 握手完成，立即发送加密请求！

TLS 1.3 — 0-RTT（Resumption）：
  客户端                          服务器
    │                              │
    │──── ClientHello              │
    │      + early_data (加密数据) │  使用上次的 PSK（预共享密钥）
    │      + key_share            │  立即发送加密请求，0-RTT
    │<─── ServerHello + ...        │  ⚠️ 重放攻击风险，不适合关键操作
```

### TLS 1.3 相比 TLS 1.2 的改进

| 特性 | TLS 1.2 | TLS 1.3 |
|------|---------|---------|
| 完整握手 RTT | 2-RTT | 1-RTT |
| 0-RTT | 不支持 | 支持（PSK 恢复会话） |
| RSA 密钥交换 | 支持（不提供前向安全） | **移除** |
| CBC 模式 | 支持（易受 BEAST/POODLE 攻击） | **移除** |
| SHA-1 签名 | 支持（弱安全） | **移除** |
| 主动加密握手 | 否 | 是（ClientHello 加密） |
| 密钥交换算法 | RSA / ECDHE | **仅 ECDHE**（提供前向安全） |
| 加密套件数量 | 30+ | **仅 5 个**（协商简化） |
| 握手可见性 | ClientHello 明文 | ClientHello 可选加密 |

### 完整 HTTPS 请求代码（Node.js）

```typescript
import https from 'node:https';
import http from 'node:http';

// HTTPS 请求示例：验证服务器证书
const options = {
  hostname: 'example.com',
  port: 443,
  path: '/api/data',
  method: 'GET',
  rejectUnauthorized: true, // ✅ 验证服务器证书（必须开启！）
  // 自定义 CA（企业内网场景）
  // ca: fs.readFileSync('/path/to/internal-ca.crt'),
};

const req = https.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`TLS 版本: ${res.socket.getProtocol()}`); // TLSv1.3
  console.log(`Cipher: ${res.socket.getCipher()}`);       // TLS_AES_256_GCM_SHA384

  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});

req.on('error', (e) => console.error('请求错误:', e.message));

// TLS 会话恢复（节省握手时间）
import TLS from 'node:tls';

const session = TLS.createSecureContext({ ... });
req.on('socket', (socket) => {
  socket.setSession(session); // 复用会话，快速恢复
});

// 服务端配置 TLS 1.3
const serverOptions: https.ServerOptions = {
  key: fs.readFileSync('/path/to/server.key'),
  cert: fs.readFileSync('/path/to/server.crt'),
  minVersion: 'TLSv1.3',           // 强制 TLS 1.3
  maxVersion: 'TLSv1.3',
  // 优先使用 AEAD 加密套件
  honorCipherOrder: true,
  // 必须开启 SNI（Server Name Indication）
  SNICallback: (servername, cb) => {
    const ctx = createSecureContextForHost(servername);
    cb(null, ctx);
  },
  // HSTS（HTTP Strict Transport Security）
  // 通过 response 头设置，不在 TLS 层配置
};

https.createServer(serverOptions, (req, res) => {
  res.setHeader('Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload');
  res.end('Hello HTTPS');
}).listen(443);
```

### 前向安全（Forward Secrecy）与 ECDHE

```javascript
// RSA 密钥交换：服务端用公钥加密 PreMasterSecret 发送给客户端
// 问题：如果服务端私钥被泄露，历史流量可被解密（无前向安全）

// ECDHE 密钥交换（TLS 1.3 唯一支持）：
// 双方各自生成临时 ECDH 密钥对，用对方的公钥和自己的私钥计算共享密钥
// 每次会话使用新的临时密钥，即使长期私钥泄露，历史会话仍安全
// 公式: shared_secret = ECDH(client_private, server_public)
//              = ECDH(server_private, client_public)

import crypto from 'node:crypto';

// 模拟 ECDHE 握手（简化版）
function ecdheHandshake() {
  // 客户端：生成 ECDH 密钥对
  const client = crypto.createECDH('secp256r1');
  client.generateKeys();
  const clientPublicKey = client.getPublicKey();

  // 服务器：生成 ECDH 密钥对
  const server = crypto.createECDH('secp256r1');
  server.generateKeys();
  const serverPublicKey = server.getPublicKey();

  // 双方各自用自己的私钥 + 对方的公钥，计算出相同的共享密钥
  const clientSharedSecret = client.computeSecret(serverPublicKey);
  const serverSharedSecret = server.computeSecret(clientPublicKey);

  // 双方独立导出会话密钥（HKDF）
  const clientKey = crypto.createHash('sha256').update(clientSharedSecret).digest();
  const serverKey = crypto.createHash('sha256').update(serverSharedSecret).digest();

  console.log('共享密钥一致:', clientKey.equals(serverKey));
  return clientKey;
}

ecdheHandshake();
// 临时密钥对每次会话不同，私钥泄露不影响历史会话
```

### 证书链与 CA 验证

```
证书链（从叶子到根）:
  Leaf Certificate（服务器证书）
    签发者: Intermediate CA（中级证书）
      签发者: Root CA（根证书）
        内置于操作系统/浏览器受信任根存储

验证流程（浏览器自动完成）:
  1. 服务器发送完整证书链（不含根证书）
  2. 浏览器用中间证书的公钥验证叶子证书签名
  3. 浏览器用根证书的公钥验证中间证书签名
  4. 验证根证书在本地受信任存储中
  5. 验证证书的 Common Name / SAN 匹配域名
  6. 验证证书未过期（notBefore < now < notAfter）
  7. 验证证书未被吊销（OCSP / CRL）
  8. 验证域名与请求 Host 匹配
```

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| `rejectUnauthorized: false` | 跳过证书验证，中间人攻击 | 生产环境必须开启 `rejectUnauthorized: true` |
| 使用自签名证书 | 浏览器不信任 | 使用 Let's Encrypt（免费）或购买商业 CA |
| TLS 版本配置过旧 | TLS 1.0/1.1 有已知漏洞 | 配置 `minVersion: 'TLSv1.3'` |
| 混用 HTTP 和 HTTPS | HTTPS 页面的 HTTP 资源被浏览器阻止 | 全站 HTTPS，用 CSP upgrade-insecure-requests |
| 证书链不完整 | 中间证书缺失导致部分客户端验证失败 | 服务端配置完整证书链（含中间证书） |
| 未配置 HSTS | 首次 HTTP 请求可被降级攻击 | 添加 HSTS 响应头，建议提交到 HSTS Preload List |
| 0-RTT 用于关键操作 | 0-RTT 有重放攻击风险 | 0-RTT 仅用于幂等操作（如 GET 请求），幂等操作禁止带状态 |

### 面试追问

**Q1: 什么是前向安全（Forward Secrecy）？为什么 TLS 1.3 只支持 ECDHE？**

前向安全指即使攻击者事后获取了服务端的长期私钥，也无法解密之前记录的加密通信流量。TLS 1.2 的 RSA 密钥交换中，会话密钥由客户端用服务端公钥加密发送，若攻击者获取服务端私钥即可解密所有历史会话。TLS 1.3 只支持 ECDHE，每次会话使用临时 ECDH 密钥对，私钥泄露只能影响当前会话，历史会话因临时密钥已销毁而无法解密。

**Q2: 什么是 OCSP Stapling？它解决了什么问题？**

传统证书验证时，浏览器需向 CA 的 OCSP 服务器查询证书是否被吊销，增加一次 HTTP 请求（可能慢，且泄露用户访问的域名）。OCSP Stapling 允许服务端定期从 CA 获取 OCSP 响应并附在 TLS 握手时发送给客户端，浏览器直接使用附带的 OCSP 响应，无需额外请求。Node.js 的 `https.createServer` 在配置证书链时默认支持 OCSP Stapling。

**Q3: HTTPS 会降低服务器性能吗？如何优化？**

TLS 1.3 的 1-RTT 握手已大幅减少性能损耗，ECDHE 的 CPU 开销比 RSA 更低。优化方案：（1）开启 TLS 1.3，减少 RTT；（2）开启会话恢复（Session Resumption / PSK），重复连接跳过握手；（3）开启 OCSP Stapling，避免客户端额外查询；（4）使用硬件加速（AES-NI）；（5）使用 HTTP/2/HTTP/3 多路复用，在一个连接上处理多个请求。

---

> 📚 参考：
> - https://developer.mozilla.org/zh-CN/docs/Web/Security/Same-origin_policy（同源策略）
> - https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP（Content Security Policy）
> - https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Cookies（Cookie）
> - https://developer.mozilla.org/zh-CN/docs/Web/API/Window/postMessage（postMessage）
> - https://developer.mozilla.org/zh-CN/docs/Web/API/BroadcastChannel（BroadcastChannel）
> - https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers（Web Worker）
> - https://blog.chromium.org/2018/07/mitigating-spectre-with-site-isolation.html（Site Isolation）
> - https://www.chromium.org/Home/chromium-security/site-isolation（Chrome Site Isolation）
> - https://web.dev/articles/same-site-same-origin（同源 vs 同站）
> - https://blog.cloudflare.com/road-to-0-rtt（TLS 1.3 0-RTT）
> - https://www.cloudflare.com/learning/dns/dns-security/（DNS 安全）
> - https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/（TLS 握手详解）
> - https://blog.cloudflare.com/doH/（DNS-over-HTTPS）
> - https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Caching（Caching HTTP）
> - https://web.dev/articles/http-cache（HTTP 缓存深度指南）
> - https://www.chromium.org/developers/design-documents/os-allocations（沙箱设计文档）
> - https://www.jb51.net/article/282533.htm（Map/Set/WeakMap/WeakSet 详解）
> - https://blog.csdn.net/qi_bai_jin/article/details/158261107（V8 垃圾回收原理）
> - https://cloud.tencent.com/developer/news/2263970（Vue3 Proxy + Reflect 响应式）