---
title: 浏览器、网络与安全资料
description: 浏览器原理、HTTP 协议与 Web 安全资料，附每条资料的具体学习方式
---

# 浏览器、网络与安全资料

先读浏览器工作原理与 MDN HTTP，再根据需要深入 HPBN 和 RFC；安全部分以 OWASP 为准。

所有链接均已用 curl 检查可访问。语言标签为资料正文语言；难度：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## 浏览器原理与调试

!!! tip "这一组怎么学"
    1. 先读 Chrome「Inside look at modern web browser」四篇（约 2 小时），能口述「输入 URL 到页面展示」的全过程。
    2. 再读 web.dev 的关键渲染路径与渲染性能，并在 DevTools Performance 面板对照看。
    3. 之后学 Core Web Vitals 指标与优化。预计 15 至 20 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [web.dev 学习路径](https://web.dev/learn) | 教程 | English | 入门 | 浏览课程目录，按薄弱点选择性能、PWA、隐私等课程。 |
| [web.dev Learn Performance](https://web.dev/learn/performance) | 教程 | English | 进阶 | 按章节学习，每章后用 Lighthouse 检查自己的页面并记录改进。 |
| [Chrome for Developers](https://developer.chrome.com/docs) | 官方文档 | English | 进阶 | 订阅其博客与文档更新，每月读一篇与你工作相关的新特性。 |
| [Chrome DevTools 文档](https://developer.chrome.com/docs/devtools) | 官方文档 | English | 入门 | 按面板顺序学习 Elements、Network、Performance，各做一次实际排查。 |
| [DevTools：Performance 面板](https://developer.chrome.com/docs/devtools/performance) | 官方文档 | English | 进阶 | 录制一次页面加载，识别长任务、布局抖动与绘制开销。 |
| [DevTools：Network 面板](https://developer.chrome.com/docs/devtools/network) | 官方文档 | English | 入门 | 分析一次请求的瀑布图，指出阻塞渲染的资源并解释原因。 |
| [DevTools：内存问题](https://developer.chrome.com/docs/devtools/memory-problems) | 官方文档 | English | 进阶 | 用堆快照对比定位一个泄漏的 DOM 节点。 |
| [浏览器工作原理（Inside look 第 1 部分）](https://developer.chrome.com/blog/inside-browser-part1) | 教程 | English | 进阶 | 读完后画出 Browser、Renderer、GPU、Network 进程分工图。 |
| [Inside look 第 2 部分：导航](https://developer.chrome.com/blog/inside-browser-part2) | 教程 | English | 进阶 | 读完后写出从输入 URL 到提交导航的步骤。 |
| [Inside look 第 3 部分：渲染进程](https://developer.chrome.com/blog/inside-browser-part3) | 教程 | English | 进阶 | 读完后解释渲染进程内的主线程、合成线程分别负责什么。 |
| [Inside look 第 4 部分：输入事件](https://developer.chrome.com/blog/inside-browser-part4) | 教程 | English | 进阶 | 读完后解释为何 passive 监听器能改善滚动流畅度。 |
| [How Browsers Work（Tali Garsiel）](https://www.html5rocks.com/en/tutorials/internals/howbrowserswork/) | 教程 | English | 进阶 | 经典长文，重点读解析与渲染树构建，注意内容撰写年代较早，细节以现行文档为准。 |
| [关键渲染路径](https://web.dev/articles/critical-rendering-path) | 教程 | English | 进阶 | 读完后在 Performance 面板标出 DOM、CSSOM、布局、绘制各阶段。 |
| [MDN：浏览器如何工作](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work) | 官方文档 | English | 入门 | 作为上一篇的简版，先读它建立整体框架。 |
| [web.dev：渲染性能](https://web.dev/articles/rendering-performance) | 教程 | English | 进阶 | 读完后将一个触发布局的动画改成只触发合成。 |
| [web.dev：仅合成器属性与图层数量](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count) | 教程 | English | 进阶 | 用 DevTools Layers 查看图层数量，验证 will-change 的代价。 |
| [RenderingNG 概览](https://developer.chrome.com/docs/chromium/renderingng) | 官方文档 | English | 深入 | 读完概览后再读架构篇，了解现代 Chrome 渲染管线。 |
| [RenderingNG 架构](https://developer.chrome.com/docs/chromium/renderingng-architecture) | 官方文档 | English | 深入 | 画出管线各阶段的输入与输出，并与自己的性能问题对应。 |
| [Web Vitals 概览](https://web.dev/articles/vitals) | 教程 | English | 进阶 | 记住 LCP、INP、CLS 的定义与阈值，并查看自己页面的实际数据。 |
| [LCP](https://web.dev/articles/lcp) | 教程 | English | 进阶 | 找到页面的 LCP 元素，记录它的资源加载时间线。 |
| [优化 LCP](https://web.dev/articles/optimize-lcp) | 教程 | English | 进阶 | 按文中四个子部分分解自己页面 LCP 时间，针对最大一项优化。 |
| [INP](https://web.dev/articles/inp) | 教程 | English | 进阶 | 在 DevTools 中找出一次慢交互，并拆分输入延迟与处理耗时。 |
| [CLS](https://web.dev/articles/cls) | 教程 | English | 进阶 | 用 Performance 面板的 Layout Shift 轨道找到位移元素并预留空间。 |
| [MDN 性能指南](https://developer.mozilla.org/en-US/docs/Web/Performance) | 官方文档 | English | 入门 | 阅读加载与运行时性能的概述，补齐指标之外的基础知识。 |
| [MDN 性能指南（中文）](https://developer.mozilla.org/zh-CN/docs/Web/Performance) | 官方文档 | 中文 | 入门 | 中文版阅读速度更快，遇到术语对照英文版。 |
| [V8 官方博客](https://v8.dev/blog) | 教程 | English | 深入 | 选读垃圾回收、隐藏类相关文章，理解引擎层面的性能差异。 |
| [MDN Web API 参考](https://developer.mozilla.org/zh-CN/docs/Web/API) | 官方文档 | 中文 | 入门 | 作为 API 查证入口，用到时再查。 |
| [web.dev：Service Worker 生命周期](https://web.dev/articles/service-worker-lifecycle) | 教程 | English | 进阶 | 在 DevTools Application 面板观察 install 与 activate 过程。 |
| [Jake Archibald：Offline Cookbook](https://jakearchibald.com/2014/offline-cookbook/) | 教程 | English | 进阶 | 选三种缓存策略用 Service Worker 各实现一次。 |
| [Jake Archibald 博客](https://jakearchibald.com/) | 教程 | English | 深入 | 选读关于渲染、事件循环、Web 平台的文章，并运行文中示例。 |
| [Chromium 开发文档](https://chromium.googlesource.com/chromium/src/+/main/docs/README.md) | 官方文档 | English | 深入 | 需要了解实现细节时从目录定位主题，不必通读。 |

## 网络与协议

!!! tip "这一组怎么学"
    1. 先读 MDN HTTP 概述、缓存、CORS、Cookie 四篇，用 curl 与 DevTools 实际观察一次请求。
    2. 再读 HPBN 的 TCP、TLS、HTTP/2 章节，理解连接与延迟。
    3. 需要精确语义时查 RFC，先读摘要和目录，不要从头硬读。预计 25 至 35 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MDN HTTP 文档](https://developer.mozilla.org/zh-CN/docs/Web/HTTP) | 官方文档 | 中文 | 入门 | 先读概述，再读缓存、CORS、Cookie、状态码，每篇用 DevTools 验证一次。 |
| [MDN HTTP 概述](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview) | 官方文档 | English | 入门 | 读完后写出一次请求与响应的报文结构。 |
| [MDN HTTP 演进](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Evolution_of_HTTP) | 官方文档 | English | 入门 | 读完后概括 HTTP/1.0、1.1、2、3 各自解决的问题。 |
| [MDN HTTP 缓存（中文）](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Caching) | 官方文档 | 中文 | 入门 | 用 Cache-Control 的不同取值做实验，观察 Network 面板中的缓存命中。 |
| [MDN HTTP 缓存（English）](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) | 官方文档 | English | 进阶 | 阅读新增的缓存失效与 stale-while-revalidate 内容。 |
| [MDN CORS（中文）](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS) | 官方文档 | 中文 | 入门 | 本地起两个端口复现简单请求与预检请求，并配置响应头。 |
| [MDN CORS（English）](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) | 官方文档 | English | 进阶 | 阅读凭据请求与通配符限制两节，解释常见报错原因。 |
| [MDN Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies) | 官方文档 | English | 入门 | 设置 SameSite、Secure、HttpOnly 并在 DevTools 观察效果。 |
| [MDN HTTP 状态码](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) | 官方文档 | English | 入门 | 用 curl 触发 301、304、401、429 等并记录响应头。 |
| [MDN HTTP 头部](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers) | 官方文档 | English | 入门 | 按分类浏览，把你项目里出现的头部逐个对应其含义。 |
| [High Performance Browser Networking](https://hpbn.co/) | 书 | English | 深入 | 先读 TCP、TLS、HTTP/2 三章，每章用一个自己页面的请求来验证。 |
| [HTTP.dev](https://http.dev/) | 教程 | English | 入门 | 作为方法、头部、状态码的速查站，遇到不熟悉的项时查询。 |
| [HTTP Working Group 规范索引](https://httpwg.org/specs/) | 规范 | English | 深入 | 把它作为各 RFC 的入口，选择 Semantics 与 Caching 阅读。 |
| [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) | 规范 | English | 深入 | 先读方法与状态码章节，并用 curl 验证幂等性与安全性定义。 |
| [RFC 9111 HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111) | 规范 | English | 深入 | 读缓存新鲜度计算一节，手算一个响应的有效期。 |
| [RFC 9112 HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112) | 规范 | English | 深入 | 阅读报文格式与分块传输一节，用 nc 手写一个请求。 |
| [RFC 9113 HTTP/2](https://www.rfc-editor.org/rfc/rfc9113) | 规范 | English | 深入 | 读帧与流的定义，配合 Wireshark 观察 HTTP/2 帧。 |
| [RFC 9114 HTTP/3](https://www.rfc-editor.org/rfc/rfc9114) | 规范 | English | 深入 | 读与 HTTP/2 的差异部分，理解队头阻塞的变化。 |
| [RFC 9000 QUIC](https://www.rfc-editor.org/rfc/rfc9000) | 规范 | English | 深入 | 读概述与连接建立，了解 QUIC 如何整合传输与加密。 |
| [RFC 8446 TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446) | 规范 | English | 深入 | 读握手流程章节，并结合 tls13.xargs.org 的逐字节解析。 |
| [RFC 6265 HTTP State Management（Cookie）](https://www.rfc-editor.org/rfc/rfc6265) | 规范 | English | 深入 | 读 Cookie 的解析与存储模型，理解域与路径匹配。 |
| [RFC 6455 WebSocket](https://www.rfc-editor.org/rfc/rfc6455) | 规范 | English | 深入 | 读握手与帧格式，用抓包观察 Upgrade 过程。 |
| [RFC 6454 Web Origin Concept](https://www.rfc-editor.org/rfc/rfc6454) | 规范 | English | 深入 | 读 Origin 定义，解释同源与同站的差别。 |
| [RFC 6749 OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749) | 规范 | English | 深入 | 先读授权码流程章节，并画出各角色之间的交互。 |
| [Fetch 标准（含 CORS）](https://fetch.spec.whatwg.org/) | 规范 | English | 深入 | 阅读 CORS 协议一节，对照 MDN 的预检流程。 |
| [URL 标准](https://url.spec.whatwg.org/) | 规范 | English | 深入 | 阅读 URL 解析算法，理解 URL 对象的行为差异。 |
| [HTML 规范：浏览上下文与同源](https://html.spec.whatwg.org/multipage/browsers.html) | 规范 | English | 深入 | 阅读 origin 与跨源隔离部分，对应 COOP 与 COEP。 |
| [TLS 1.3 逐字节图解](https://tls13.xargs.org/) | 教程 | English | 深入 | 对照每一帧字节解释握手各字段，并与 RFC 8446 互相印证。 |
| [TLS 1.2 逐字节图解](https://tls12.xargs.org/) | 教程 | English | 深入 | 与 TLS 1.3 版本对比，说明握手往返次数的差别。 |
| [How DNS Works](https://howdns.works/) | 教程 | English | 入门 | 阅读漫画，随后用 dig +trace 验证一次递归查询。 |
| [Julia Evans：HTTP zine](https://wizardzines.com/zines/http/) | 书 | English | 入门 | 阅读样张了解风格，作为 HTTP 入门的补充速览。 |
| [Beej 网络编程指南](https://beej.us/guide/bgnet/) | 书 | English | 进阶 | 读前几章了解套接字，理解浏览器之下的 TCP 连接。 |
| [Everything curl](https://everything.curl.dev/) | 书 | English | 入门 | 读 HTTP 相关章节，并用 curl -v 复现浏览器请求。 |
| [HTTP/2 explained](https://http2-explained.haxx.se/) | 书 | English | 进阶 | 读完后概括多路复用与头部压缩的原理。 |
| [HTTP/3 explained](https://http3-explained.haxx.se/) | 书 | English | 进阶 | 读完后对比 QUIC 与 TCP 的连接迁移与丢包恢复。 |
| [HTTP Toolkit](https://httptoolkit.com/) | 工具 | English | 入门 | 安装后拦截浏览器与 Node 请求，查看真实的头部与响应。 |
| [HTTP Toolkit 博客](https://httptoolkit.com/blog/) | 教程 | English | 进阶 | 选读关于 HTTP 细节与调试的文章，并用同款工具复现。 |
| [Wireshark 用户指南](https://www.wireshark.org/docs/wsug_html_chunked/) | 官方文档 | English | 进阶 | 先读捕获与显示过滤器两章，再抓一次自己访问网页的包。 |
| [Wireshark 文档入口](https://www.wireshark.org/docs/) | 官方文档 | English | 入门 | 从此处找到入门指南与过滤器参考，抓取一次 TCP 三次握手。 |
| [Cloudflare 博客](https://blog.cloudflare.com/) | 教程 | English | 进阶 | 选读 HTTP/3、TLS 与性能相关的工程文章，关注测量数据。 |
| [阮一峰：DNS 原理入门](https://www.ruanyifeng.com/blog/2016/06/dns.html) | 教程 | 中文 | 入门 | 读完后用 dig 查询一次域名，并解释每条记录。 |
| [阮一峰：SSL/TLS 协议运行机制](https://www.ruanyifeng.com/blog/2014/09/illustration-ssl.html) | 教程 | 中文 | 入门 | 读完后用自己的话描述握手流程，再对照 TLS 1.3 的变化。 |
| [阮一峰：RESTful API 设计理解](https://www.ruanyifeng.com/blog/2014/05/restful_api.html) | 教程 | 中文 | 入门 | 对照一个你用过的接口，检查它与文中约定的差异。 |
| [阮一峰：跨域资源共享 CORS 详解](https://www.ruanyifeng.com/blog/2016/04/cors.html) | 教程 | 中文 | 入门 | 读完后用 Node 实现简单请求与预检请求的响应头。 |

## 安全

!!! tip "这一组怎么学"
    1. 先通读 OWASP Top 10，再读 XSS、CSRF、CSP 三份 Cheat Sheet，约 6 小时。
    2. 然后在 PortSwigger Web Security Academy 做对应实验（XSS、CSRF、CORS 各至少 3 个），这是巩固的主要方式。
    3. 最后用 Juice Shop 或 WebGoat 做完整练习。预计 30 至 50 小时。所有练习只在自己的环境或官方靶场进行。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [OWASP Top 10（项目页）](https://owasp.org/www-project-top-ten/) | 官方文档 | English | 进阶 | 先读各类风险的概述，再对照自己项目列出可能存在的三项。 |
| [OWASP Top 10 最新版](https://owasp.org/Top10/) | 官方文档 | English | 进阶 | 逐项阅读描述、示例与预防，整理成自己项目的检查清单。 |
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | 官方文档 | English | 进阶 | 按主题查询落地措施，写代码前先读相关一篇。 |
| [OWASP Cheat Sheet 仓库](https://github.com/OWASP/CheatSheetSeries) | 官方文档 | English | 进阶 | 需要查看更新记录或提交修订时使用，日常直接读网页版即可。 |
| [XSS 防护 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) | 官方文档 | English | 进阶 | 理解按输出位置转义的规则，并检查自己项目中使用 innerHTML 的位置。 |
| [CSRF 防护 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) | 官方文档 | English | 进阶 | 对比 token 与 SameSite 方案，并在示例项目中实现其中一种。 |
| [CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) | 官方文档 | English | 进阶 | 先用 report-only 模式部署，再逐步收紧策略。 |
| [HTTP 安全头 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) | 官方文档 | English | 进阶 | 列出自己站点响应头，逐项对比推荐配置。 |
| [会话管理 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | 官方文档 | English | 进阶 | 检查自己项目会话标识的生成、存储与过期策略。 |
| [认证 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) | 官方文档 | English | 进阶 | 对照密码存储、登录错误提示与多因素部分做一次自查。 |
| [OWASP Web 安全测试指南](https://owasp.org/www-project-web-security-testing-guide/) | 书 | English | 深入 | 选择一个测试类别，在自己的测试环境中按步骤执行。 |
| [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) | 规范 | English | 深入 | 以 Level 1 条目为清单，对一个小项目逐条打勾。 |
| [OWASP WebGoat](https://owasp.org/www-project-webgoat/) | 工具 | English | 进阶 | 在本地部署，按课程顺序完成注入与访问控制练习。 |
| [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) | 工具 | English | 进阶 | 本地运行，按难度星级从低到高完成挑战，并记录每个漏洞的修复方法。 |
| [PortSwigger Web Security Academy](https://portswigger.net/web-security) | 教程 | English | 进阶 | 免费注册后按学习路径做实验，每个主题先读文章再做实验。 |
| [PortSwigger：全部主题](https://portswigger.net/web-security/all-topics) | 教程 | English | 进阶 | 作为目录，挑选与前端相关的主题优先学习。 |
| [PortSwigger：学习路径](https://portswigger.net/web-security/learning-paths) | 教程 | English | 入门 | 选择服务端与客户端漏洞路径，按顺序完成。 |
| [PortSwigger：XSS](https://portswigger.net/web-security/cross-site-scripting) | 教程 | English | 进阶 | 读完反射型、存储型、DOM 型三种后各做一个实验。 |
| [PortSwigger：CSRF](https://portswigger.net/web-security/csrf) | 教程 | English | 进阶 | 读完后做 SameSite 绕过相关实验，理解其局限。 |
| [PortSwigger：CORS](https://portswigger.net/web-security/cors) | 教程 | English | 进阶 | 完成配置错误导致的跨域实验，并总结安全的配置原则。 |
| [PortSwigger：请求走私](https://portswigger.net/web-security/request-smuggling) | 教程 | English | 深入 | 读完 HTTP/1 与 HTTP/2 的走私原理，再选一个实验。 |
| [PortSwigger Research](https://portswigger.net/research) | 教程 | English | 深入 | 阅读年度十大 Web 黑客技术，了解攻击研究的前沿。 |
| [Google XSS Game](https://xss-game.appspot.com/) | 工具 | English | 入门 | 完成全部关卡，并为每一关写出对应的防护方式。 |
| [Hacksplaining](https://www.hacksplaining.com/lessons) | 教程 | English | 入门 | 交互式课程，每个漏洞做完课程后再读其防护页。 |
| [Hacker101](https://hacker101.com/) | 视频 | English | 进阶 | 先看 Web 安全相关视频，再做配套的 CTF 练习。 |
| [MDN Web 安全](https://developer.mozilla.org/zh-CN/docs/Web/Security) | 官方文档 | 中文 | 入门 | 先读同源策略与 CSP 两篇，再浏览攻击与防御索引。 |
| [MDN：安全实施指南](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides) | 官方文档 | English | 进阶 | 选用 CSP、Cookie、HTTPS 等指南，对站点逐项落实。 |
| [MDN：常见攻击](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks) | 官方文档 | English | 入门 | 读后列出每类攻击的一个防御措施。 |
| [MDN：同源策略](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy) | 官方文档 | English | 入门 | 读完后实验 iframe、fetch、Cookie 在不同源下的表现。 |
| [MDN：子资源完整性](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) | 官方文档 | English | 进阶 | 给一个 CDN 脚本加上 integrity，并故意改错哈希观察报错。 |
| [MDN：CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) | 官方文档 | English | 进阶 | 在测试页面添加策略，查看控制台违规报告。 |
| [CSP 规范 Level 3](https://www.w3.org/TR/CSP3/) | 规范 | English | 深入 | 查询指令的精确定义，用于解释实际行为差异。 |
| [web.dev：内容安全策略](https://web.dev/articles/csp) | 教程 | English | 进阶 | 照文中的严格 CSP 方案配置 nonce 并验证。 |
| [CSP Evaluator](https://csp-evaluator.withgoogle.com/) | 工具 | English | 进阶 | 粘贴自己的策略，修复评估器指出的绕过风险。 |
| [Mozilla Observatory](https://observatory.mozilla.org/) | 工具 | English | 入门 | 扫描自己的站点，按报告逐项修复并重新扫描。 |
| [Mozilla Web 安全指南](https://infosec.mozilla.org/guidelines/web_security) | 官方文档 | English | 进阶 | 作为配置基线，对照站点的头部与 TLS 配置做评审。 |
| [web.dev：SameSite Cookie 详解](https://web.dev/articles/samesite-cookies-explained) | 教程 | English | 进阶 | 在测试页面分别设置三种 SameSite 值，观察跨站请求中的 Cookie。 |
| [web.dev：同站与同源](https://web.dev/articles/same-site-same-origin) | 教程 | English | 入门 | 读完后判断五组 URL 是否同源、同站。 |
| [web.dev：跨源隔离指南](https://web.dev/articles/cross-origin-isolation-guide) | 教程 | English | 深入 | 读完后在测试页启用 COOP 与 COEP，确认 crossOriginIsolated 为 true。 |
| [web.dev：COOP 与 COEP](https://web.dev/articles/coop-coep) | 教程 | English | 深入 | 阅读两个头部的作用，理解它们与 SharedArrayBuffer 的关系。 |
| [web.dev：Trusted Types](https://web.dev/articles/trusted-types) | 教程 | English | 深入 | 在测试页启用后，修复所有触发违规的 innerHTML 赋值。 |
| [web.dev：为什么 HTTPS 很重要](https://web.dev/articles/why-https-matters) | 教程 | English | 入门 | 读完后列出 HTTP 站点面临的三类风险。 |
| [web.dev Learn Privacy](https://web.dev/learn/privacy) | 教程 | English | 进阶 | 按章节学习，并检查自己站点使用的第三方 Cookie。 |
| [Privacy Sandbox 文档](https://developer.chrome.com/docs/privacy-sandbox) | 官方文档 | English | 进阶 | 阅读各 API 的目标与状态，注意内容随浏览器策略变化。 |
| [CWE Top 25](https://cwe.mitre.org/top25/) | 规范 | English | 进阶 | 与 OWASP Top 10 对照阅读，了解弱点分类编号。 |
| [阮一峰：同源政策](https://www.ruanyifeng.com/blog/2016/04/same-origin-policy.html) | 教程 | 中文 | 入门 | 读完后列出三种同源限制，并写出对应的绕过与合法方案。 |
