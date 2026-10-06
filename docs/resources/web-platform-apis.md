---
title: Web 平台 API 资料
description: DOM、存储、通信、PWA、Web Components、WebAssembly 与图形 API 的学习资料，附具体学习方式
---

# Web 平台 API 资料

先在 MDN 找到对应 API 的概述页，读完概述后跑通一个最小示例，再读规范确认边界行为。

所有链接均已用 curl 检查可访问。语言标签为资料正文语言；难度：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。使用任何 API 前先在 MDN 兼容性表和 Can I use 确认目标浏览器支持情况。

## DOM、导航与观察者

!!! tip "这一组怎么学"
    1. 先通读现代 JavaScript 教程「文档」部分（DOM、事件、冒泡与捕获），约 8 小时。
    2. 用 MDN 的 Intersection、Resize、Mutation Observer 各写一个小示例，如懒加载图片、自适应图表、监听 DOM 变化。
    3. 再读 DOM 规范的事件分发部分确认细节。预计 15 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MDN DOM 概述](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) | 官方文档 | English | 入门 | 读概述与节点、元素、文档三个接口，在控制台遍历一棵 DOM 树。 |
| [现代 JavaScript 教程：文档](https://zh.javascript.info/document) | 教程 | 中文 | 入门 | 顺序学习 DOM 导航、搜索、修改与样式，做完章末任务。 |
| [现代 JavaScript 教程：冒泡与捕获](https://zh.javascript.info/bubbling-and-capturing) | 教程 | 中文 | 入门 | 读完后写出点击事件的捕获、目标、冒泡三阶段顺序并实验验证。 |
| [现代 JavaScript 教程：Mutation Observer](https://zh.javascript.info/mutation-observer) | 教程 | 中文 | 进阶 | 用它监听一个容器的子节点变化，并输出变化记录。 |
| [MDN Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) | 官方文档 | English | 进阶 | 实现图片懒加载与无限滚动，比较与 scroll 事件的性能。 |
| [MDN Resize Observer](https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API) | 官方文档 | English | 进阶 | 用它让一个元素根据自身宽度切换布局，避免监听 window 的 resize。 |
| [MDN MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) | 官方文档 | English | 进阶 | 观察属性与子树变化，并说明与微任务队列的关系。 |
| [MDN History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) | 官方文档 | English | 入门 | 用 pushState 与 popstate 实现一个无刷新的简易前端路由。 |
| [MDN Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) | 官方文档 | English | 进阶 | 用 navigate 事件重写上面的路由，比较与 History API 的差别。 |
| [MDN URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL_API) | 官方文档 | English | 入门 | 用 URL 与 URLSearchParams 解析并重写查询参数。 |
| [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) | 官方文档 | English | 入门 | 在页面隐藏时暂停轮询，并用 visibilitychange 事件恢复。 |
| [MDN Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API) | 官方文档 | English | 进阶 | 用 PerformanceObserver 采集 LCP 与长任务，并上报到控制台。 |
| [MDN Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) | 官方文档 | English | 进阶 | 用 element.animate 复现一个 CSS 动画，并用 JS 控制暂停与反向。 |
| [现代 JavaScript 教程：动画](https://zh.javascript.info/animation) | 教程 | 中文 | 入门 | 读 requestAnimationFrame 一节，并用它写一个匀速移动的元素。 |
| [DOM 标准](https://dom.spec.whatwg.org/) | 规范 | English | 深入 | 读事件分发一节，核对 stopPropagation 与 stopImmediatePropagation 的语义。 |
| [MDN dom-examples 仓库](https://github.com/mdn/dom-examples) | 工具 | English | 入门 | 克隆后挑一个示例，阅读源码并修改参数观察效果。 |
| [Pointer Events（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | 官方文档 | English | 进阶 | 用 pointer 事件实现一个同时支持鼠标与触屏的拖动手势。 |
| [Pointer Events 规范](https://w3c.github.io/pointerevents/) | 规范 | English | 深入 | 阅读指针捕获与 touch-action 一节，解释手势与滚动的冲突。 |
| [MDN 拖放 API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) | 官方文档 | English | 入门 | 实现一个拖拽排序列表，重点理解 dragover 必须调用 preventDefault。 |
| [web.dev：拖放](https://web.dev/articles/drag-and-drop) | 教程 | English | 入门 | 对照文中示例，加入文件拖入上传的功能。 |
| [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) | 官方文档 | English | 入门 | 实现一个复制按钮，并处理权限被拒绝的情况。 |
| [web.dev：异步剪贴板](https://web.dev/articles/async-clipboard) | 教程 | English | 进阶 | 读写图片到剪贴板，并说明与 execCommand 方案的取舍。 |
| [Clipboard API 规范](https://w3c.github.io/clipboard-apis/) | 规范 | English | 深入 | 查阅权限与用户激活要求，解释何时调用会失败。 |

## 文件、存储与离线

!!! tip "这一组怎么学"
    1. 先读 web.dev「Web 存储」概述，了解各种存储的容量与清理规则。
    2. 用 IndexedDB 实现一个离线待办列表，再加入 idb 封装对比 API 体验。
    3. 最后学 Service Worker 与 PWA 课程，做一个可安装的离线页面。预计 20 至 30 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MDN File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API) | 官方文档 | English | 入门 | 用 FileReader 与 Blob URL 实现图片本地预览。 |
| [现代 JavaScript 教程：文件](https://zh.javascript.info/file) | 教程 | 中文 | 入门 | 学习 Blob、File 与 FileReader，完成章末任务。 |
| [MDN 文件系统 API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) | 官方文档 | English | 进阶 | 实现读取并保存本地文本文件，了解权限提示。 |
| [web.dev：Origin Private File System](https://web.dev/articles/origin-private-file-system) | 教程 | English | 进阶 | 在 Worker 中用同步访问句柄读写文件，并测量速度。 |
| [web.dev：Web 存储概览](https://web.dev/articles/storage-for-the-web) | 教程 | English | 进阶 | 用 navigator.storage.estimate 查看配额，并理解持久化存储申请。 |
| [MDN Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API) | 官方文档 | English | 进阶 | 调用 persist 与 estimate，对比不同浏览器的行为。 |
| [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | 官方文档 | English | 进阶 | 先读概念页，了解数据库、对象存储、事务与游标。 |
| [MDN IndexedDB（中文）](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API) | 官方文档 | 中文 | 进阶 | 中文版快速建立概念，细节以英文版为准。 |
| [MDN 使用 IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) | 教程 | English | 进阶 | 跟着教程实现增删改查，并处理版本升级。 |
| [现代 JavaScript 教程：IndexedDB](https://zh.javascript.info/indexeddb) | 教程 | 中文 | 进阶 | 读事务与错误处理两节，完成一个键值读写封装。 |
| [idb 库](https://github.com/jakearchibald/idb) | 工具 | English | 进阶 | 用 Promise 版封装重写上面的待办示例，对比代码量。 |
| [IndexedDB 规范](https://w3c.github.io/IndexedDB/) | 规范 | English | 深入 | 查询事务生命周期与自动提交规则，解释事务意外结束的原因。 |
| [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) | 官方文档 | English | 进阶 | 实现缓存优先的离线页面，并在 DevTools 观察缓存与生命周期。 |
| [MDN Service Worker（中文）](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API) | 官方文档 | 中文 | 进阶 | 阅读使用指南，复现注册与拦截请求的基本流程。 |
| [web.dev Learn PWA](https://web.dev/learn/pwa) | 教程 | English | 进阶 | 按章节学习，最后完成一个可安装、可离线的应用。 |
| [web.dev Learn PWA：Service Workers](https://web.dev/learn/pwa/service-workers) | 教程 | English | 进阶 | 读生命周期与更新一节，复现一次新版本等待激活的情况。 |
| [MDN 渐进式 Web 应用](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) | 官方文档 | English | 入门 | 读 manifest 与可安装条件，使 Lighthouse 的 PWA 检查通过。 |
| [What PWA Can Do Today](https://whatpwacando.today/) | 工具 | English | 入门 | 在手机与桌面分别测试各能力，记录支持差异。 |
| [Workbox 文档](https://developer.chrome.com/docs/workbox) | 官方文档 | English | 进阶 | 用 Workbox 实现 stale-while-revalidate，并与手写 Service Worker 对比。 |
| [Service Worker 规范](https://w3c.github.io/ServiceWorker/) | 规范 | English | 深入 | 阅读 Update 算法，解释浏览器何时检查新版本脚本。 |
| [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) | 官方文档 | English | 进阶 | 读订阅与推送消息流程，理解需要服务端与 VAPID 密钥的原因。 |
| [web.dev：推送通知概述](https://web.dev/articles/push-notifications-overview) | 教程 | English | 进阶 | 按文中流程画出浏览器、推送服务、应用服务器三方交互图。 |
| [MDN Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) | 官方文档 | English | 入门 | 先实现在用户点击后请求权限并发出本地通知。 |

## 通信、安全 API 与并发

!!! tip "这一组怎么学"
    1. 先学 Fetch 与 WebSocket，再学 Web Workers，每个做一个独立小 demo。
    2. WebRTC 先读 WebRTC for the Curious 建立原理，再用 MDN 信令示例动手。
    3. WebAuthn 与 Web Crypto 先读概念站，再做注册与签名各一次。预计 30 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MDN Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) | 官方文档 | English | 入门 | 用 AbortController 实现可取消的请求，并处理非 2xx 状态。 |
| [现代 JavaScript 教程：网络请求](https://zh.javascript.info/network) | 教程 | 中文 | 入门 | 顺序学习 Fetch、FormData、跨域与 WebSocket，完成每章任务。 |
| [MDN WebSockets API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) | 官方文档 | English | 入门 | 写一个回声服务器与客户端，处理断线重连。 |
| [现代 JavaScript 教程：WebSocket](https://zh.javascript.info/websocket) | 教程 | 中文 | 入门 | 学习握手、扩展、心跳，并实现一个聊天室。 |
| [MDN Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) | 官方文档 | English | 进阶 | 用 ReadableStream 分块读取 fetch 响应并显示进度。 |
| [Streams 标准](https://streams.spec.whatwg.org/) | 规范 | English | 深入 | 阅读背压的定义，解释 highWaterMark 的作用。 |
| [MDN Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) | 官方文档 | English | 进阶 | 读类型总览，区分专用、共享与 Service Worker。 |
| [MDN Web Workers API（中文）](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API) | 官方文档 | 中文 | 进阶 | 中文版快速建立概念。 |
| [MDN 使用 Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) | 教程 | English | 进阶 | 把一个耗时计算移入 Worker，用 Performance 面板验证主线程不再阻塞。 |
| [Comlink](https://github.com/GoogleChromeLabs/comlink) | 工具 | English | 进阶 | 用它改写上面的 Worker 通信，对比 postMessage 的样板代码。 |
| [HTML 规范：Workers](https://html.spec.whatwg.org/multipage/workers.html) | 规范 | English | 深入 | 阅读 Worker 的创建与事件循环模型，核对线程间数据结构化克隆规则。 |
| [MDN Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) | 官方文档 | English | 入门 | 实现同源多标签页之间的登出同步。 |
| [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) | 官方文档 | English | 进阶 | 读概述与连接流程，理解 ICE、STUN、TURN 的分工。 |
| [MDN WebRTC（中文）](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API) | 官方文档 | 中文 | 进阶 | 先读中文概述，再对照英文版的新增部分。 |
| [MDN WebRTC 信令与视频通话](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling) | 教程 | English | 进阶 | 照教程实现一对一视频通话，并自己写一个 WebSocket 信令服务。 |
| [WebRTC for the Curious](https://webrtcforthecurious.com/) | 书 | English | 深入 | 免费开源，按章节读信令、NAT 穿透、媒体传输，对应抓包验证。 |
| [webrtc.org](https://webrtc.org/) | 官方文档 | English | 入门 | 浏览入门指南，了解各平台实现。 |
| [WebRTC 官方示例](https://webrtc.github.io/samples/) | 工具 | English | 入门 | 运行示例并阅读源码，选一个修改后重新运行。 |
| [web.dev：WebRTC 基础](https://web.dev/articles/webrtc-basics) | 教程 | English | 入门 | 读完后画出获取媒体流、建立连接、传输数据的步骤。 |
| [MDN 屏幕捕获 API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API) | 官方文档 | English | 进阶 | 实现一个屏幕录制按钮，并处理用户取消的情况。 |
| [MDN Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API) | 官方文档 | English | 进阶 | 读注册与认证流程，理解公钥凭据和挑战的作用。 |
| [MDN WebAuthn：Attestation 与 Assertion](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Attestation_and_Assertion) | 官方文档 | English | 深入 | 读完后说明注册与登录各自返回的数据及服务端验证内容。 |
| [webauthn.guide](https://webauthn.guide/) | 教程 | English | 入门 | 先按图读完流程，再在页面内的演示里注册一个凭据。 |
| [passkeys.dev](https://passkeys.dev/) | 教程 | English | 进阶 | 阅读实现指南，了解通行密钥与传统 WebAuthn 的关系。 |
| [WebAuthn 规范](https://w3c.github.io/webauthn/) | 规范 | English | 深入 | 阅读服务端验证步骤，对照自己实现中的每项检查。 |
| [MDN Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) | 官方文档 | English | 进阶 | 用 AES-GCM 加解密一段文本，说明为何需要随机的 IV。 |
| [MDN SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) | 官方文档 | English | 进阶 | 实现 SHA-256 摘要与 HMAC 签名，并与 Node 的结果对比。 |
| [MDN Payment Request API](https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API) | 官方文档 | English | 进阶 | 阅读流程与支持范围，了解它与支付网关的分工。 |
| [MDN Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) | 官方文档 | English | 入门 | 实现获取位置并处理拒绝授权，注意隐私提示的写法。 |
| [Chrome Web 平台能力](https://developer.chrome.com/docs/capabilities) | 官方文档 | English | 进阶 | 浏览能力列表，选一个在 MDN 兼容性表确认后尝试。 |
| [What Web Can Do Today](https://whatwebcando.today/) | 工具 | English | 入门 | 在目标设备打开，记录各 API 是否可用。 |
| [View Transitions 文档](https://developer.chrome.com/docs/web-platform/view-transitions) | 官方文档 | English | 进阶 | 给一个页面切换加上过渡，再处理不支持的浏览器回退。 |
| [Web Audio API（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | 官方文档 | English | 进阶 | 用振荡器与增益节点实现一个简单合成器。 |
| [Web Speech API（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) | 官方文档 | English | 入门 | 实现一次语音合成，再试语音识别并记录浏览器差异。 |

## Web Components

!!! tip "这一组怎么学"
    1. 先读 MDN Web Components 概述与自定义元素、Shadow DOM 两篇（约 3 小时）。
    2. 手写一个计数器组件，再用 Lit 重写，比较代码量与更新机制。
    3. 最后查看 open-wc 的测试与工具建议。预计 15 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MDN Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) | 官方文档 | English | 入门 | 读概述，区分 Custom Elements、Shadow DOM、HTML 模板三项技术。 |
| [MDN Web Components（中文）](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components) | 官方文档 | 中文 | 入门 | 先读中文概述，再对照英文版。 |
| [MDN 使用自定义元素](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) | 教程 | English | 入门 | 实现带生命周期回调与 observedAttributes 的自定义元素。 |
| [MDN 使用 Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) | 教程 | English | 入门 | 验证样式隔离，并尝试用 slot 与 ::part 对外暴露定制点。 |
| [web.dev：Custom Elements v1](https://web.dev/articles/custom-elements-v1) | 教程 | English | 进阶 | 读最佳实践部分，并检查自己的组件是否遵守。 |
| [web.dev：Shadow DOM v1](https://web.dev/articles/shadowdom-v1) | 教程 | English | 进阶 | 读事件重定向与 slot 部分，验证事件如何穿越 Shadow 边界。 |
| [现代 JavaScript 教程：Web Components](https://zh.javascript.info/web-components) | 教程 | 中文 | 入门 | 顺序学习并完成其中的组件示例。 |
| [Lit 官网](https://lit.dev/) | 官方文档 | English | 入门 | 先看首页示例并在 Playground 里修改。 |
| [Lit 文档](https://lit.dev/docs/) | 官方文档 | English | 进阶 | 学习响应式属性与模板，之后把手写组件迁移到 Lit。 |
| [open-wc](https://open-wc.org/) | 工具 | English | 进阶 | 阅读测试与代码检查建议，给组件加上单元测试。 |
| [Web Components Guide](https://webcomponents.guide/) | 教程 | English | 入门 | 按章节学习，并在页面上用原生 API 实现各示例。 |

## WebAssembly、Canvas 与图形

!!! tip "这一组怎么学"
    1. Canvas 先过 MDN Canvas 教程（约 6 小时），做一个粒子动画。
    2. WebGL 按 webglfundamentals 顺序读到「三维」章节，每课手敲代码。
    3. WebAssembly 先读 MDN 概念，再用 wasmbyexample 的示例选一种语言编译。WebGPU 作为进阶选修。预计 40 小时以上。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) | 官方文档 | English | 入门 | 先读概述，了解 2D 上下文与 OffscreenCanvas。 |
| [MDN Canvas API（中文）](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API) | 官方文档 | 中文 | 入门 | 阅读中文概述，快速建立绘图概念。 |
| [MDN Canvas 教程](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial) | 教程 | English | 入门 | 顺序做完路径、变换、动画章节，最后做一个小游戏。 |
| [web.dev：OffscreenCanvas](https://web.dev/articles/offscreen-canvas) | 教程 | English | 进阶 | 把绘制移到 Worker，并用 Performance 面板验证主线程变化。 |
| [MDN WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) | 官方文档 | English | 进阶 | 读概述与教程，作为 webglfundamentals 的补充参考。 |
| [WebGL Fundamentals](https://webglfundamentals.org/) | 教程 | English | 进阶 | 从第一课按顺序读到三维透视，每课手敲并修改参数。 |
| [WebGL Fundamentals（中文）](https://webglfundamentals.org/webgl/lessons/zh_cn/) | 教程 | 中文 | 进阶 | 中文版入口，遇到译文歧义时对照英文版。 |
| [WebGL2 Fundamentals](https://webgl2fundamentals.org/) | 教程 | English | 进阶 | 在已掌握 WebGL1 的基础上阅读与 WebGL2 的差异。 |
| [The Book of Shaders](https://thebookofshaders.com/?lan=ch) | 书 | 中文 | 进阶 | 按章节学片段着色器，每章用示例做一个自己的图案。 |
| [Three.js 手册](https://threejs.org/manual/) | 教程 | English | 进阶 | 学习场景、相机、渲染器基础后，做一个可旋转的模型展示。 |
| [MDN WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) | 官方文档 | English | 进阶 | 读概述，了解设备、管线与命令编码器的关系。 |
| [WebGPU Fundamentals](https://webgpufundamentals.org/) | 教程 | English | 进阶 | 先完成三角形与计算着色器两课，再读后续章节。 |
| [WebGPU Fundamentals（中文）](https://webgpufundamentals.org/webgpu/lessons/zh_cn/) | 教程 | 中文 | 进阶 | 中文入口，核对术语时回看英文版。 |
| [Chrome WebGPU 文档](https://developer.chrome.com/docs/web-platform/webgpu) | 官方文档 | English | 进阶 | 阅读入门与新特性文章，注意浏览器支持状态。 |
| [WebGPU 规范](https://gpuweb.github.io/gpuweb/) | 规范 | English | 深入 | 作为接口与行为的查证来源，用于确认限制与默认值。 |
| [MDN WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly) | 官方文档 | English | 进阶 | 读概念与加载 Wasm 模块两篇，用 JS 调用一个导出函数。 |
| [MDN WebAssembly（中文）](https://developer.mozilla.org/zh-CN/docs/WebAssembly) | 官方文档 | 中文 | 进阶 | 中文入口，先建立概念。 |
| [MDN WebAssembly 概念](https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Concepts) | 官方文档 | English | 入门 | 读完后说出模块、实例、内存、表四个核心概念。 |
| [WebAssembly by Example](https://wasmbyexample.dev/) | 教程 | English | 进阶 | 选 Rust 或 AssemblyScript 示例，编译并在页面中调用。 |
| [MDN webassembly-examples 仓库](https://github.com/mdn/webassembly-examples) | 工具 | English | 进阶 | 运行仓库中的示例，阅读 JS 加载代码。 |
| [WebAssembly 官网](https://webassembly.org/) | 官方文档 | English | 入门 | 了解设计目标与功能路线图，并查看各引擎支持状态。 |
| [WebAssembly 核心规范](https://webassembly.github.io/spec/core/) | 规范 | English | 深入 | 阅读结构与执行章节，用于理解模块验证与内存模型。 |
