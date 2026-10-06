---
title: 性能与质量资料
description: Core Web Vitals、测量与诊断工具、加载与渲染优化、性能文章与可访问性的权威资料
---

# 性能与质量资料

以 Core Web Vitals 为主线：先会测量，再按指标逐项优化；可访问性以 WCAG 与 MDN 为准。

所有链接均已检查可访问。语言标签为资料正文语言；难度：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## 核心指标与测量工具

!!! tip "这一组怎么学"
    第 1 步：读 Core Web Vitals 与 LCP、INP、CLS 三篇定义，记住阈值（约 2 小时）。第 2 步：用 PageSpeed Insights 测一个真实站点，区分实验室数据与真实用户数据（约 1 小时）。第 3 步：在自己项目接入 web-vitals 库并上报到控制台（约 2 小时）。第 4 步：读 CrUX 文档，理解 75 分位的含义。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Core Web Vitals](https://web.dev/articles/vitals) | 官方文档 | English | 入门 | LCP/INP/CLS 指标定义与阈值的官方说明。 |
| [web.dev 性能专题](https://web.dev/performance) | 文章合集 | English | 进阶 | 按加载、交互、渲染分类各读两篇。 |
| [web.dev Learn Performance](https://web.dev/learn/performance) | 官方课程 | English | 入门 | 按章节顺序学完，每章末尾对照自己站点检查。 |
| [LCP 说明](https://web.dev/articles/lcp) | 官方文档 | English | 入门 | 读完在 DevTools 里找出自己页面的 LCP 元素。 |
| [INP 说明](https://web.dev/articles/inp) | 官方文档 | English | 入门 | 读完用 DevTools 录制一次点击交互，看输入延迟、处理与呈现延迟。 |
| [CLS 说明](https://web.dev/articles/cls) | 官方文档 | English | 入门 | 读完用 Layout Shift 区域高亮找出页面偏移来源。 |
| [TTFB 说明](https://web.dev/articles/ttfb) | 官方文档 | English | 进阶 | 拆分重定向、DNS、连接、服务器处理的耗时。 |
| [RAIL 性能模型](https://web.dev/articles/rail) | 官方文档 | English | 入门 | 记住响应、动画、空闲、加载四类预算数字。 |
| [Lighthouse 文档](https://developer.chrome.com/docs/lighthouse/overview) | 官方文档 | English | 入门 | 自动化审计工具，了解各评分项来源。 |
| [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) | 工具 | English | 进阶 | 接入 CI，设定分数断言，防止性能回退。 |
| [PageSpeed Insights](https://pagespeed.web.dev/) | 在线工具 | English | 入门 | 输入 URL 即得实验室与真实用户数据。 |
| [Chrome UX Report](https://developer.chrome.com/docs/crux) | 官方文档 | English | 进阶 | 真实用户性能数据来源，理解 field data。 |
| [CrUX 指南](https://developer.chrome.com/docs/crux/guides) | 官方文档 | English | 进阶 | 读数据集与 API 说明，查询自己站点的指标分布。 |
| [web-vitals 库](https://github.com/GoogleChrome/web-vitals) | 开源库 | English | 进阶 | 线上采集 Core Web Vitals 的官方库，读 README 的归因构建部分。 |
| [Web Vitals 现场测量最佳实践](https://web.dev/articles/vitals-field-measurement-best-practices) | 官方文档 | English | 进阶 | 对照文中建议检查自己的上报方案。 |
| [在真实用户数据中定位慢交互](https://web.dev/articles/find-slow-interactions-in-the-field) | 官方文档 | English | 进阶 | 用 web-vitals 归因数据定位具体元素与脚本。 |
| [Sentry 性能监控文档](https://docs.sentry.io/product/performance/) | 产品文档 | English | 进阶 | 读追踪与指标概念，了解线上性能监控的数据模型。 |

## 浏览器 DevTools 与诊断

!!! tip "这一组怎么学"
    按 Performance、Network、Memory 的顺序使用 DevTools：各录一次真实页面（每项约 2 小时），读火焰图找最长的任务，再用 Memory 面板拍两次堆快照对比泄漏。最后读 Brendan Gregg 的火焰图页面理解其来源。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Chrome DevTools 文档](https://developer.chrome.com/docs/devtools/) | 官方文档 | English | 入门 | 作为总目录，先浏览各面板的 Overview。 |
| [DevTools Performance 面板](https://developer.chrome.com/docs/devtools/performance) | 官方文档 | English | 进阶 | 录制一次页面加载，识别长任务与主线程阻塞。 |
| [DevTools Network 面板](https://developer.chrome.com/docs/devtools/network) | 官方文档 | English | 入门 | 用节流模拟弱网，查看瀑布图与优先级。 |
| [DevTools 内存问题](https://developer.chrome.com/docs/devtools/memory-problems) | 官方文档 | English | 进阶 | 制造一个闭包泄漏并用堆快照找到它。 |
| [Brendan Gregg：火焰图](https://www.brendangregg.com/flamegraphs.html) | 原作者文章 | English | 深入 | 学会读火焰图的宽度与堆栈含义，再回到 DevTools 对照。 |
| [Brendan Gregg 主页](https://www.brendangregg.com/) | 博客 | English | 深入 | 挑性能分析方法论相关文章，学习系统化排查思路。 |
| [长任务优化](https://web.dev/articles/optimize-long-tasks) | 官方文档 | English | 进阶 | 用 scheduler.yield 或 setTimeout 拆分一个长任务并复测 INP。 |
| [Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames) | 官方文档 | English | 深入 | 在页面中用 PerformanceObserver 采集并找出慢脚本。 |
| [V8 文档](https://v8.dev/docs) | 官方文档 | English | 深入 | 读关于性能分析与优化的页面，理解 JS 引擎行为。 |
| [V8 博客](https://v8.dev/blog) | 官方博客 | English | 深入 | 挑性能相关文章，读隐藏类、内联缓存等原理。 |
| [The Cost of JavaScript 2019](https://v8.dev/blog/cost-of-javascript-2019) | 官方博客 | English | 进阶 | 读完说明为什么字节数相同的 JS 比图片更贵。 |

## 加载与渲染优化实践

!!! tip "这一组怎么学"
    按指标做实验：LCP 看图片与关键资源优先级，INP 看长任务，CLS 看占位。每项挑一篇文章做一次改动并用 Lighthouse 复测，记录改动前后的数字（总计约 10 小时）。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MDN Web 性能](https://developer.mozilla.org/zh-CN/docs/Web/Performance) | 参考文档 | 中文 | 入门 | 性能概念与优化手段的中文梳理。 |
| [优化 LCP](https://web.dev/articles/optimize-lcp) | 官方文档 | English | 进阶 | LCP 分解与优化步骤，逐段测自己页面的四个子部分耗时。 |
| [优化 INP](https://web.dev/articles/optimize-inp) | 官方文档 | English | 进阶 | 交互延迟优化方法，替代 FID 的新指标。 |
| [优化输入延迟](https://web.dev/articles/optimize-input-delay) | 官方文档 | English | 进阶 | 排查交互开始前被主线程占用的原因。 |
| [优化 CLS](https://web.dev/articles/optimize-cls) | 官方文档 | English | 进阶 | 布局偏移成因与修复，为图片与广告位添加固定尺寸。 |
| [预加载关键资源](https://web.dev/articles/preload-critical-assets) | 官方文档 | English | 进阶 | 给首屏字体与图片加 preload 并观察瀑布图变化。 |
| [Fetch Priority](https://web.dev/articles/fetch-priority) | 官方文档 | English | 进阶 | 给 LCP 图片加 fetchpriority 高优先级并复测。 |
| [关键渲染路径](https://web.dev/articles/critical-rendering-path) | 官方文档 | English | 入门 | 读完画出从 HTML 到像素的流程。 |
| [渲染性能](https://web.dev/articles/rendering-performance) | 官方文档 | English | 进阶 | 区分布局、绘制、合成，用 transform 替代 top 做动画。 |
| [HTTP 缓存](https://web.dev/articles/http-cache) | 官方文档 | English | 进阶 | 为静态资源配置 immutable 与哈希文件名。 |
| [Service Worker 与 HTTP 缓存](https://web.dev/articles/service-worker-caching-and-http-caching) | 官方文档 | English | 进阶 | 弄清两层缓存的叠加行为，避免缓存陈旧资源。 |
| [bfcache](https://web.dev/articles/bfcache) | 官方文档 | English | 进阶 | 在 DevTools 中测试页面是否可进入 bfcache，修复阻止原因。 |
| [浏览器级图片懒加载](https://web.dev/articles/browser-level-image-lazy-loading) | 官方文档 | English | 入门 | 给首屏外图片加 loading=lazy，首屏图片不要加。 |
| [预渲染页面](https://developer.chrome.com/docs/web-platform/prerender-pages) | 官方文档 | English | 进阶 | 用 Speculation Rules 给下一跳页面加预渲染。 |
| [View Transitions](https://developer.chrome.com/docs/web-platform/view-transitions) | 官方文档 | English | 进阶 | 写一个页面切换过渡并测量其对 INP 的影响。 |
| [代码拆分减小 JS 体积](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting) | 官方文档 | English | 进阶 | 用动态 import 拆分路由，查看产物变化。 |
| [字体最佳实践](https://web.dev/articles/font-best-practices) | 官方文档 | English | 进阶 | 配置 font-display 与子集化，减少字体导致的偏移。 |
| [字体加载优化](https://web.dev/articles/optimize-webfont-loading) | 官方文档 | English | 进阶 | 对比 swap 与 optional 的体验差异。 |
| [性能预算入门](https://web.dev/articles/performance-budgets-101) | 官方文档 | English | 进阶 | 为项目制定体积与指标预算并写入 CI。 |
| [web.dev Learn Images](https://web.dev/learn/images) | 官方课程 | English | 进阶 | 图片格式、响应式图片、懒加载的官方课程。 |
| [Essential Image Optimization](https://images.guide/) | 电子书 | English | 进阶 | Addy Osmani 的图片优化指南，按清单优化一批图片。 |
| [Bundlephobia](https://bundlephobia.com/) | 在线工具 | English | 入门 | 引入依赖前先查体积与替代品。 |
| [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) | 工具 | English | 进阶 | 分析产物构成，找出最大的三个模块并优化。 |

## 性能文章、课程与社区

!!! tip "这一组怎么学"
    每周读一到两篇博客并在笔记中记录一个可复用的结论。入门先读 Harry Roberts 的关键路径文章；系统化学习用 High Performance Browser Networking 与 Frontend Masters 课程。年度报告用来了解行业数据（约 3 小时）。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Addy Osmani 博客](https://addyosmani.com/blog/) | 博客 | English | 进阶 | 挑加载策略与 JS 性能文章，并用自己项目验证。 |
| [Harry Roberts：CSS Wizardry](https://csswizardry.com/) | 博客 | English | 进阶 | 读性能相关文章，学习阻塞渲染与资源提示。 |
| [CSS 与网络性能](https://csswizardry.com/2018/11/css-and-network-performance/) | 博客 | English | 进阶 | 照文中方法检查哪些 CSS 在阻塞渲染。 |
| [SpeedCurve 博客](https://speedcurve.com/blog/) | 博客 | English | 进阶 | 看真实站点的指标案例，积累诊断思路。 |
| [Calibre 博客](https://calibreapp.com/blog) | 博客 | English | 进阶 | 读性能监控与预算实践文章。 |
| [DebugBear 博客](https://www.debugbear.com/blog) | 博客 | English | 进阶 | 读 Lighthouse 与 CrUX 指标解读文章。 |
| [Patterns.dev](https://www.patterns.dev/) | 模式合集 | English | 进阶 | 读渲染与加载性能模式，对应到自己框架的做法。 |
| [High Performance Browser Networking](https://hpbn.co/) | 在线书籍 | English | 深入 | 读 TCP、TLS、HTTP2 章节，理解网络层性能根源。 |
| [Frontend Masters：Web Performance](https://frontendmasters.com/courses/web-perf/) | 视频课程 | English | 进阶 | 查看课程大纲并按需选择学习。 |
| [HTTP Archive Web Almanac 2024 性能章](https://almanac.httparchive.org/en/2024/performance) | 年度报告 | English | 进阶 | 读数据章节，了解行业整体指标水平。 |
| [Web Almanac 2022 性能章（中文）](https://almanac.httparchive.org/zh-CN/2022/performance) | 年度报告 | 中文 | 进阶 | 中文版数据报告，对照自己站点所处的分位。 |
| [MDN Performance API](https://developer.mozilla.org/zh-CN/docs/Web/API/Performance_API) | 参考文档 | 中文 | 进阶 | 写一段脚本读取 navigation 与 resource 计时。 |
| [PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) | 参考文档 | English | 进阶 | 订阅 largest-contentful-paint 条目并打印。 |
| [W3C Performance Timing 入门](https://w3c.github.io/perf-timing-primer/) | 规范入门 | English | 深入 | 理解各种性能时间线条目之间的关系。 |
| [Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/) | 规范 | English | 深入 | 对照规范时间图理解导航各阶段时间点。 |
| [Sentry JavaScript 文档](https://docs.sentry.io/platforms/javascript/) | 产品文档 | English | 进阶 | 在项目中接入并产生一次性能追踪。 |

## 可访问性

!!! tip "这一组怎么学"
    先读 web.dev Learn Accessibility 与 MDN 入门，建立语义化与键盘操作概念（约 4 小时）。再用 axe 与 WebAIM 工具审计一个页面并修复前三类问题；组件实现以 APG 为准；WCAG 原文用作查表。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 标准 | English | 深入 | 可访问性国际标准原文，遇到争议时查对应条款。 |
| [WCAG 快速参考](https://www.w3.org/WAI/WCAG22/quickref/) | 速查表 | English | 进阶 | 按条目筛选的 WCAG 速查表，用来核对审计结果。 |
| [MDN 可访问性](https://developer.mozilla.org/zh-CN/docs/Web/Accessibility) | 参考文档 | 中文 | 入门 | ARIA、键盘操作、语义化的中文入门资料。 |
| [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) | 实现指南 | English | 进阶 | 常见组件（对话框、菜单、选项卡）的无障碍实现模式。 |
| [web.dev Learn Accessibility](https://web.dev/learn/accessibility) | 官方课程 | English | 入门 | 官方可访问性课程，按章节做完。 |
| [Deque axe](https://www.deque.com/axe/) | 工具 | English | 入门 | 安装浏览器扩展审计页面并逐条修复。 |
| [WebAIM](https://webaim.org/) | 资源站 | English | 入门 | 用其对比度检查器与屏幕阅读器调查报告。 |
| [A11Y Project 检查清单](https://a11yproject.com/checklist/) | 清单 | English | 入门 | 把清单作为每次上线前的自查项。 |
