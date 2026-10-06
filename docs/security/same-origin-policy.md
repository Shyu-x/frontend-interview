---
title: 浏览器安全模型与同源策略
description: Web 安全本质、沙箱机制，以及同源的定义、限制表现与常见误区。
---

# 浏览器安全模型与同源策略

## 1. Web安全本质与浏览器安全模型

### 1.1 Web安全本质

Web安全本质是**在不可信的网络环境中构建可信的应用**。攻击者的目标是窃取数据、劫持会话、执行任意代码；防御者的目标是确保数据的机密性、完整性和可用性（CIA 三元组）。

浏览器作为Web应用的运行时，是安全攻防的主战场。浏览器安全模型由多层防护机制构成：

**浏览器安全模型：**

| 防护机制 | 说明 |
|---------|------|
| 1. 进程隔离 | 渲染进程 vs 浏览器主进程隔离 |
| 2. 同源策略 (SOP) | 域间隔离 |
| 3. 沙箱机制 | 限制代码能力 |
| 4. 安全上下文 | HTTPS / localhost |
| 5. CSP / CORS | 资源加载控制 |
| 6. CORB / CORP / COEP | 侧信道攻击缓解 |
| 7. SameSite Cookie | CSRF 防护 |

### 1.2 浏览器进程隔离

**多进程架构：**

| 进程 | 说明 |
|------|------|
| 浏览器主进程 (Browser) | 地址栏、网络请求、插件管理、存储管理 |
| 渲染进程 A (Renderer) | JS引擎、DOM树、布局引擎、事件循环 |
| 渲染进程 B (Renderer) | JS引擎、DOM树、布局引擎、事件循环 |

**进程间通信：** IPC（进程间通信）

**说明：** 每个标签页运行在独立的渲染进程中，通过 IPC 与浏览器主进程通信。渲染进程的 JS 无法直接访问文件系统，网络进程只能通过 MessageChannel 与渲染进程通信。

## 2. 浏览器沙箱机制

**浏览器沙箱层级：**

| 层级 | 说明 |
|------|------|
| 操作系统 | Ring 0 - 内核 |
| 浏览器主进程 | 网络/磁盘/GPU 访问 |
| 渲染进程 | 沙箱内，受限 syscall |
| JS引擎 (V8) | 执行 JS |
| DOM/CSS引擎 | 解析 DOM/CSS |
| 事件系统 | 处理用户交互 |

**约束：**
- 只能通过 IPC 与浏览器主进程通信
- 无法直接访问文件系统
- 无法直接调用系统 API

**Chrome 进程模型：**
- Site Isolation：不同站点页面在独立进程中
- 每个渲染进程沙箱化，即使 V8 被攻破也难以逃逸

## 3. 同源策略 (Same-Origin Policy, SOP)

### 3.1 什么是同源

**同源**指协议 + 域名 + 端口三者完全相同。

| URL A                          | URL B                      | 是否同源    |
|--------------------------------|----------------------------|-----------|
| `https://a.example.com:443`    | `https://a.example.com:443`| 同源        |
| `https://a.example.com:443`    | `https://b.example.com:443`| 不同源(域不同)|
| `https://a.example.com:443`    | `http://a.example.com:443` | 不同源(协议不同)|
| `https://a.example.com:443`    | `https://a.example.com:8080`| 不同源(端口不同)|

### 3.2 SOP限制了什么


### 3.3 SOP限制了什么

同源策略限制以下跨域行为：

| 行为 | 是否允许 | 说明 |
|------|---------|------|
| Cookie / LocalStorage / IndexedDB 访问 | 禁止 | 跨域无法读写 |
| DOM 跨域读写 | 禁止 | 无法操作跨域 iframe 内容 |
| XMLHttpRequest / Fetch 跨域请求 | 禁止 | 需要 CORS 头 |
| iframe 跨域内容访问 | 禁止 | 无法读取跨域 iframe 内容 |

**可跨域访问的资源（无需 CORS）：**

| 资源 | 说明 |
|------|------|
| `<script src>` | 可跨域加载 JS |
| `<link href>` | 可跨域加载 CSS |
| `<img src>` | 可跨域加载图片 |
| `@font-face` | 可跨域字体 |

### 3.4 为什么必须有SOP

如果浏览器没有SOP，任意网页的JS都能读取`bank.com`的Cookie、DOM和LocalStorage：

```javascript
// 恶意网站 https://evil.com 的JS
fetch('https://bank.com/api/balance')  // 自动携带cookie
  .then(r => r.json())
  .then(data => sendToAttacker(data));

document.getElementById('bank-frame').contentDocument; // 读取iframe内容
```

**SOP是浏览器安全的基石**，它将Web划分为安全域，防止恶意脚本访问敏感资源。

## 4. 同源策略与浏览器安全机制对比（深度）

### 4.1 定义/背景

同源策略（SOP）是浏览器的核心安全基石，严格限制不同源的 document 和 JS 彼此访问。Content Security Policy（CSP）通过响应头声明允许加载的资源来源，防止 XSS 注入攻击。iframe sandbox 提供细粒度的嵌入隔离。CORB/CORP/COEP/COOP 则是现代浏览器引入的 Spectre 防护机制。

### 4.2 同源策略（Same-Origin Policy）

```
同源定义: 协议（scheme）+ 域名（host）+ 端口（port）三者完全相同

https://example.com:443 (基准)
  正确：https://example.com:443       → 同源
  正确：https://example.com/          → 同源（路径不同没关系）
  错误：http://example.com:443        → 协议不同
  错误：https://sub.example.com:443   → 子域名不同（不同源）
  错误：https://example.com:8080       → 端口不同

注意: www.example.com 和 example.com 是不同域名（同源策略中视为不同源）
```

### 4.3 同源限制的具体表现

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

### 4.4 对比：同源策略 vs CSP vs iframe sandbox

| 机制 | 控制对象 | 设置位置 | 防护目标 |
|------|---------|---------|---------|
| 同源策略（SOP） | DOM/Cookie/Storage/AJAX | 浏览器强制 | 不同源 JS 相互访问 |
| CSP | 资源加载来源 | HTTP 响应头 / meta | XSS 注入 / 资源劫持 |
| iframe sandbox | 嵌入页面能力 | iframe 属性 | 恶意嵌入内容 |
| CORB | 跨源数据读取 | 浏览器自动 | 跨源"被动"资源（图片等）被 JS 读取 |
| CORP | 跨源资源提供 | HTTP 响应头 | 禁止跨源读取敏感资源 |
| COEP | 跨源资源嵌入授权 | HTTP 响应头 | 所有跨源资源必须明确授权 |
| COOP | window.opener | HTTP 响应头 | 跨窗口引用链利用 |

### 4.5 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| 误用 `allow-same-origin` | sandbox 中允许 same-origin 会绕过同源策略 | 除非必要，不用 `allow-same-origin` |
| CORS 配置过于宽松 | `Access-Control-Allow-Origin: *` 允许所有来源 | 指定精确域名，尽量不用 `*` |
| CSP 包含 `unsafe-inline` | 完全绕过 CSP 的 XSS 防护 | 使用 nonce 或 hash 策略 |
| COEP 影响跨源资源 | 开启 COEP 后无 CORP/CORS 的资源不加载 | 审查所有跨源依赖，添加 CORP 或 CORS 头 |
| COOP 影响第三方服务 | `window.open`/`window.opener` 被切断 | 使用 `same-origin-allow-popups` 而非 `same-origin` |
| CORB 误拦截图片请求 | CORB 可能将非图片响应识别为图片并阻断 JS 读取 | 服务端设置 `X-Content-Type-Options: nosniff` |

### 4.6 面试追问

**Q1: 为什么 `allow-same-origin` + `allow-scripts` 在 sandbox 中危险？**

`sandbox="allow-same-origin"` 允许 sandbox 内的页面将其 document.domain 设为与嵌入页面的父框架相同（绕过同源策略）。配合 `allow-scripts` 可以执行 JS，进而通过调整 document.domain 访问父框架的 DOM/Cookie。这是沙箱逃逸（sandbox escape）路径。正确做法是：如果内容不可信，坚决不使用 `allow-same-origin`。

**Q2: 使用 COEP/COOP 的副作用是什么？**

开启 `Cross-Origin-Embedder-Policy: require-corp` 后，所有跨源 fetch/资源必须显式通过 CORS 或 CORP 授权，否则资源加载失败。这可能破坏依赖第三方 CDN 资源但未配置 CORP 的现有项目。开启 `Cross-Origin-Opener-Policy: same-origin` 会使 `window.open()` 返回的 popup window 的 opener 为 `null`，影响第三方登录回调等功能。使用前需要全面审计跨源资源。

**Q3: CORS 和 CSP 有什么区别？**

CORS（Cross-Origin Resource Sharing）解决的是"浏览器是否允许前端 JS 读取跨源 HTTP 响应"的问题，是服务器端授权客户端 JS 读取数据。CSP（Content Security Policy）解决的是"浏览器是否允许页面加载/执行某些资源"的问题，是页面端声明可信任资源来源。CORS 侧重数据读取权限，CSP 侧重代码注入防护。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN：同源策略](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy) | 同源策略概念与跨源限制的权威入门，示例直观易验证。 | 精读定义与示例后，动手实验 iframe、fetch、Cookie 在不同源下的表现并记录结论。 |
| [RFC 6454 Web Origin Concept](https://www.rfc-editor.org/rfc/rfc6454) | Origin 的规范定义来源，能厘清同源与同站的真实差别。 | 读 Origin 语法与序列化部分，回答同源比较哪些字段，再据此推导跨源判定规则。 |
| [MDN Web 安全](https://developer.mozilla.org/zh-CN/docs/Web/Security) | 把同源策略、CSP 与常见攻击放在同一张知识地图上。 | 先读同源策略与 CSP 两篇，再浏览攻击与防御索引，列出本页后续要展开的要点。 |
| [Cross-Origin Resource Policy (CORP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cross-Origin_Resource_Policy) | 讲跨源资源加载的额外防护，与同源策略形成互补视角。 | 读 CORP 与 no-cors 的交互说明，思考 SOP 为何不足，再检查项目的响应头配置。 |
| [Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Permissions_Policy) | 展示按源与框架收窄能力的思路，可与 SOP 隔离思想对照。 | 读指令列表与 iframe allow 属性，写一个页面禁用某特性并观察控制台报错。 |
| [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) | 内容层防线，帮助理解 SOP 之外还有哪些限制手段。 | 读指令、nonce 与严格模式部分，在测试页加一条策略并查看违规报告。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Web Platform Tests](https://wpt.fyi/) | 各浏览器同源、CORS 等标准的可读一致性测试源码。 | 搜索 origin 与 CORS 相关测试文件，读断言逻辑，对照各浏览器结果差异。 |
| [MDN Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) | 同源多标签页通信的最小可运行示例，利于验证隔离边界。 | 实现同源多标签页登录登出同步，再用跨源页面尝试通信以验证被隔离。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN：浏览器如何工作](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work) | 先建立进程、渲染与脚本执行的整体框架，再读细节更顺。 | 通读一遍并画出多进程与渲染流程简图，带着沙箱问题再进后面的章节。 |
| [The Tangled Web（No Starch）](https://nostarch.com/tangledweb) | 系统讲同源策略由来与内容隔离的经典著作，讲得透彻。 | 读同源策略与内容隔离章节，对照本站安全栏目，写下三条设计权衡笔记。 |
| [OWASP Web 安全测试指南](https://owasp.org/www-project-web-security-testing-guide/) | 从攻击者视角检验 SOP 边界与常见绕过手法。 | 选跨站请求伪造与 DOM 相关类别，在自建环境按步骤复现并记录结果。 |
| [Hacker101](https://hacker101.com/) | 视频讲浏览器侧漏洞原理，配合练习巩固印象。 | 先看 Web 安全相关视频，再做配套 CTF 练习，复盘每处失败的原因。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 多人协作白板嵌入客户后台 | postMessage 与 origin 校验、iframe sandbox | 独立子域承载白板 + 白名单校验 | 发送与接收两侧都要校验，禁止用 `*` 当目标源 |
| 后台管理万行表格跨域导出报表 | CORS 预检、凭证模式、`Vary: Origin` | 网关统一注入 CORS 响应头 | 带 Cookie 时来源必须回显具体值，不能填 `*` |
| 低端安卓首屏加载第三方客服与统计 | iframe sandbox、CSP、同源边界 | 第三方脚本放独立子域 + `loading="lazy"` | sandbox 不写 `allow-same-origin`，脚本读不到主站存储 |
| 支付收银台嵌入商户页面 | 同源三要素、`frame-ancestors` | 收银台独立域名 + CSP 白名单 | 商户域名清单放配置中心，改动需回归测试 |
| 微前端主应用挂载子应用 | 同源三要素、`document.domain` 已废弃 | 单域名路径分发，或 qiankun 一类微前端框架 | 放弃靠跨域子域共享 Cookie 的老做法 |
| SaaS 报表嵌入客户站点读取登录态 | 第三方 Cookie 分区、Storage Access API | CHIPS、Storage Access API | 需核对官方文档：浏览器支持范围与降级路径 |
| 本地路由器管理页被网页探测 | 同源策略、私网访问限制 | 私网访问预检、Origin 与 Host 双校验 | 内网设备不能默认请求都可信 |
| 在线音视频剪辑需要共享内存 | 跨域隔离 COOP 与 COEP | `COOP: same-origin` + `COEP: require-corp` | 所有跨域子资源要带 CORP 或 CORS 响应头 |
| 前端埋点跨站上报 | 同源策略对发送的宽松、Fetch Metadata | `sendBeacon` + CSP `connect-src` | 上报接口走无 Cookie 凭证，避免被 CSRF 利用 |

### 三个场景拆解

#### 场景 1：多人协作白板嵌入客户后台

- **业务背景**：白板以 iframe 形式嵌进客户自己的管理后台，客户后台域名与你方白板域名不同源，双方都改不了对方的部署。规模量级看同时在线白板数，可用压测工具同时开 N 个标签页观察消息延迟。
- **怎么用本页知识解决**：跨文档通信走 `postMessage`，两侧都用 origin 白名单做入口过滤，白板进程跑在独立子域并配最小 sandbox 权限。

```html
<!-- 客户后台侧：白板放独立子域，父页面只向白板源发消息 -->
<iframe id="board" src="https://board.example.com/embed" sandbox="allow-scripts"></iframe>
```
```js
const frame = document.querySelector('#board')
// 目标源写成字符串，用 "*" 会把消息广播给任意来源
frame.contentWindow.postMessage({ type: 'init', docId: 'd-1' }, 'https://board.example.com')

window.addEventListener('message', (e) => {
  // 第一道：来源必须命中白名单
  if (e.origin !== 'https://board.example.com') return
  // 第二道：只接受白板 iframe 这个窗口发来的消息
  if (e.source !== frame.contentWindow) return
  applyRemoteEdit(e.data)
})
```

- `event.origin` 是浏览器填的，页面脚本改不了，可以当身份依据。
- `event.source` 比对能挡掉同源但不同窗口的伪造消息。
- 不发消息时不要注册监听，避免长期持有的处理器被利用。
- 消息体只当数据用，不要 `eval`，也不要直接拼进 DOM。
- 白板侧回消息时同样校验父页面 origin，双向都做。

- **怎么度量收益**：在 DevTools Console 里统计自定义拒绝日志条数；用 Reporting API 收集 `frame-ancestors` 违规报告；前端错误监控里看 "Blocked a frame" 类错误的变化趋势。
- **什么时候不该用**：嵌入方与被嵌方本来就同源同站时，直接访问 DOM 比传消息少一层解析，引入 postMessage 只增加复杂度。需要在两侧之间高频同步大块二进制数据时，结构化克隆会复制数据，同源部署下应改用共享的本地缓存。

#### 场景 2：后台管理万行表格跨域导出报表

- **业务背景**：报表服务部署在独立域名，管理后台在另一个域名，导出按钮要带上当前登录态去拉数据。量级看单次导出请求的行数与并发导出人数，可用压测脚本在同一账号下并发触发导出。
- **怎么用本页知识解决**：走带凭证的跨域请求，先由浏览器自动发预检，服务端把允许的来源、方法、头部逐项回显，并让缓存层按来源分桶。

```http
// 浏览器自动发出的预检请求
OPTIONS /api/export HTTP/1.1
Origin: https://admin.example.com
Access-Control-Request-Method: GET
Access-Control-Request-Headers: x-csrf-token
```
```http
// 预检响应：四项必须与请求逐项对应
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://admin.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: x-csrf-token
Access-Control-Max-Age: 600
Vary: Origin
```

- `Access-Control-Allow-Origin` 回显具体来源，写 `*` 时浏览器会直接拒绝带凭证的响应。
- `Access-Control-Allow-Headers` 少写一项，预检就失败，前端只看到网络错误。
- `Vary: Origin` 让 CDN 按来源分别缓存，防止 A 站拿到 B 站的响应。
- `Max-Age` 内的重复请求跳过预检，导出按钮连点不会放大往返次数。
- 预检通过只代表浏览器放行，服务端仍要校验会话与权限。

- **怎么度量收益**：Network 面板筛 `OPTIONS` 看预检次数与耗时；Performance 面板看导出请求对主线程的影响；在服务端按 `Origin` 维度统计 403 与预检失败比例。
- **什么时候不该用**：同源部署的接口不要为了统一而额外加 CORS 头，多出来的配置面只会带来误配风险。只需要读公开数据、不涉及登录态时，用 `no-cors` 模式或后端代理反而更难排查，应直接让后端同源出接口。

#### 场景 3：低端安卓首屏加载第三方客服与统计

- **业务背景**：首屏要塞进客服、统计、A/B 实验三类第三方脚本，低端机型上首屏可交互时间被明显拉长。量级看主线程被第三方脚本占用的毫秒占比，可在 DevTools Performance 面板按域名分组统计。
- **怎么用本页知识解决**：把第三方组件从主文档挪进独立子域的 iframe，用 sandbox 收窄权限，再让它们延迟到首屏渲染之后加载。

```html
<!-- 客服组件：独立子域，加载时机推迟到首屏之后 -->
<iframe src="https://chat.vendor.example.com/widget"
        sandbox="allow-scripts allow-forms"
        loading="lazy"
        referrerpolicy="no-referrer"
        title="在线客服"></iframe>

<!-- 不给 allow-same-origin，脚本运行在唯一不透明源里：
     读不到主站 Cookie 与 localStorage，
     也无法用同源 fetch 携带凭证访问你的接口。 -->
```

- sandbox 里加 `allow-scripts` 与 `allow-same-origin` 同时存在，等于放开了同源能力，要避免。
- iframe 拿不到主站存储，需要登录态时改用后端签发的短时 token 传参。
- `loading="lazy"` 让组件排在首屏关键渲染之后，主线程先处理首屏。
- `referrerpolicy="no-referrer"` 减少把内页 URL 泄露给第三方。
- 统计类组件若只做上报，可换成 `sendBeacon`，连 iframe 都不需要。

- **怎么度量收益**：Lighthouse 看 Total Blocking Time；`PerformanceObserver` 或 web-vitals 库取 LCP；DevTools Performance 面板用 4 倍 CPU 降速跑 5 次取中位数做前后对比。
- **什么时候不该用**：组件本身就是首屏核心内容（例如支付按钮）时，`loading="lazy"` 会把关键内容推迟，应改为同步加载并合入主包。组件业务上必须读主站登录态、又无法接受 token 方案时，去掉 `allow-same-origin` 会直接让功能失效，此时应改用同源代理而不是硬上 sandbox。

### 行业先进实践

**Fetch Metadata 请求头校验（出处：W3C Fetch Metadata Request Headers 规范 / Chrome 开发者文档）** 服务端读取 `Sec-Fetch-Site`、`Sec-Fetch-Mode`、`Sec-Fetch-Dest`，直接拒绝跨站发起的非导航类写请求。这套头由浏览器生成、页面脚本无法伪造，比单纯看 `Referer` 可靠。借鉴方式：在网关层对写接口加规则，先用观察模式记录命中量再切拦截。

**严格 CSP 配合 nonce 与 strict-dynamic（出处：W3C CSP Level 3 规范 / MDN Content-Security-Policy）** 每次响应生成一次性 nonce，只放行带该 nonce 的脚本，`strict-dynamic` 让受信脚本动态插入的脚本继承信任。它把 XSS 的可利用面从"任意注入点"收窄到"能拿到 nonce 的注入点"。借鉴方式：先开 `Content-Security-Policy-Report-Only` 收集违规，再逐步升级为强制。

**COOP 与 COEP 跨域隔离（出处：web.dev "Making your website cross-origin isolated" / MDN Cross-Origin-Opener-Policy）** 同时下发 `COOP: same-origin` 与 `COEP: require-corp` 后，页面进入跨域隔离状态，才能使用 `SharedArrayBuffer` 与高精度计时接口。它同时也切断了跨窗口引用与部分侧信道。借鉴方式：白板、在线剪辑这类需要共享内存的产品把它列入上线前检查项。

**SameSite 默认收紧与分区 Cookie（出处：IETF RFC6265bis 草案 / W3C CHIPS 规范草案）** 跨站请求默认不再携带 Cookie，第三方 Cookie 按顶层站点分区存储，同一嵌入方在不同站点拿到不同的存储桶。借鉴方式：把跨站嵌入场景的会话改为走 Storage Access API 申请。需核对官方文档：CHIPS 与 Storage Access API 的当前浏览器支持矩阵、属性写法与降级路径。

**站点隔离与跨域读取阻断（出处：Chromium 项目 Site Isolation 设计文档）** 不同站点被放进不同渲染进程，配合跨域读取阻断机制，让一个站点的渲染进程被攻破后无法直接读另一个站点的内存。借鉴方式：理解进程模型后，不要再依赖"同进程内可共享变量"这类假设写跨站逻辑。需核对官方文档：跨域读取阻断规则在不同浏览器中的实现差异。

### 从学到用：落地路线

1. **试点**：挑一个跨域调用最集中的页面（例如后台的导出报表），把它现有的跨域配置整理成一张表，列出来源、方法、头部、凭证四项。验收标准是这张表能被另一个人照着复现出一致的响应头。
2. **验证**：为该页面补齐 CORS 响应头与 postMessage origin 校验，并在预发环境用 DevTools Network 面板逐条核对预检请求与响应。验收标准是正常路径零控制台报错，故意改错来源时能观察到拒绝日志。
3. **推广**：把试点验证过的响应头模板与前端校验函数抽成公共库，在网关层统一注入，再按业务域逐个接入。验收标准是接入清单上的域全部通过同一套检查脚本。
4. **防回退**：把 CORS 头与 CSP 的检查写进 CI，用固定的测试请求断言响应头内容。验收标准是任何人改错来源配置都会让流水线失败，而不是等到上线后由浏览器报错。

### 动手作业

**目标**：在两个不同源的页面上完成一次安全的跨文档通信，并亲身验证 origin 校验、sandbox 与 `frame-ancestors` 各自拦住了什么。

**步骤**：
1. 建两个目录，分别用 `python3 -m http.server 8000` 和 `python3 -m http.server 8080` 启动，把它们当作两个源。
2. 在 8000 的页面里放一个指向 8080 的 iframe，父页面注册 `message` 监听并对 `event.origin` 做白名单校验。
3. 在 8080 的页面里，收到消息后只向 `http://localhost:8000` 回发一条确认消息。
4. 把父页面的白名单改成 `http://localhost:9999`，重新加载，观察消息被丢弃并打印拒绝日志。
5. 给 8080 的响应加 `Content-Security-Policy: frame-ancestors http://localhost:8000`，再把父页面换成 `http://127.0.0.1:8000` 访问。
6. 给 iframe 加上 `sandbox="allow-scripts"`，在子页面里访问 `localStorage`，观察抛出的错误。
7. 记录每一步 Console 与 Network 面板的差异，整理成一页说明。

**验收标准**：
- 正常路径下父子页面各打印一条通过校验的日志，日志里的 `event.origin` 与预期字符串一致。
- 白名单改成 `http://localhost:9999` 后，接收端的渲染函数不被调用，Console 出现自定义拒绝日志。
- CSP 生效后，用 `127.0.0.1` 访问父页面时 iframe 拒绝加载，Console 出现 `frame-ancestors` 违规提示。
- iframe 不带 `allow-same-origin` 时，子页面访问 `localStorage` 抛出 SecurityError。
- 提交的说明中每一步都写明改动内容与观察到的现象，能被他人照着复现。

