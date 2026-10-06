---
title: 在线工具
description: 在线运行环境、编译与解析、API 调试、性能与安全检查、绘图与 CSS 工具的分类清单
---

# 在线工具

面试准备与日常开发中可直接使用的在线工具，按用途分组。选工具的原则：每类只固定使用 1 到 2 个，熟练到不看菜单。

所有链接均已检查可访问。语言标签为工具界面语言。

## 怎么使用这些工具学习

!!! tip "这一组怎么学"
    工具是学习的“实验台”。每学一个概念，都用对应的工具做一次可观察的实验，把结论截图或记录到笔记里。下面是概念与工具的对应关系。

| 想验证的问题 | 使用的工具 | 实验做法 |
| --- | --- | --- |
| 事件循环输出顺序 | [Loupe](http://latentflip.com/loupe/)、[JS Visualizer 9000](https://www.jsv9000.app/) | 先预测输出顺序，再运行并观察队列 |
| 类型系统行为 | [TypeScript Playground](https://www.typescriptlang.org/play) | 修改编译选项并观察 `.d.ts` 与 JS 输出 |
| 编译器如何转换代码 | [Babel REPL](https://babeljs.io/repl)、[AST Explorer](https://astexplorer.net/) | 输入一段新语法，观察输出与 AST |
| 某个包是否值得引入 | [Bundlephobia](https://bundlephobia.com/)、[pkg-size.dev](https://pkg-size.dev/) | 比较同类包的体积与依赖 |
| 页面为什么慢 | [PageSpeed Insights](https://pagespeed.web.dev/)、DevTools Performance | 记录基线，改动后对比 |
| 接口请求怎么构造 | [curlconverter](https://curlconverter.com/)、[HTTPie](https://httpie.io/app) | 把浏览器的 cURL 转为代码并重放 |

## 运行环境与代码沙盒

!!! tip "这一组怎么学"
    用于快速验证想法与分享最小复现。提问或写博客时附上沙盒链接，比贴截图更容易得到有效反馈。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MDN Playground](https://developer.mozilla.org/en-US/play) | 在线沙盒 | English | 初级，入门 | 运行 HTML、CSS、JS 小实验 |
| [CodeSandbox](https://codesandbox.io/) | 在线 IDE | English | 初到中级，入门 | 创建框架项目模板，分享最小复现 |
| [StackBlitz](https://stackblitz.com/) | 在线 IDE | English | 初到中级，入门 | 在浏览器内运行 Node，适合复现构建问题 |
| [JSFiddle](https://jsfiddle.net/) | 在线沙盒 | English | 初级，入门 | 快速测试 DOM 与 CSS 片段 |
| [TypeScript Playground](https://www.typescriptlang.org/play) | 在线沙盒 | English | 初到高级，入门 | 查看类型推断结果，分享类型问题的复现链接 |
| [Babel REPL](https://babeljs.io/repl) | 在线编译 | English | 中级，进阶 | 选择预设，观察语法转换后的输出 |
| [Rust Playground](https://play.rust-lang.org/) | 在线沙盒 | English | 初到中级，入门 | 学 Rust 时运行官方书中的示例 |
| [Go Playground](https://go.dev/play/) | 在线沙盒 | English | 初级，入门 | 运行 Go 小示例 |
| [Compiler Explorer（Godbolt）](https://godbolt.org/) | 在线编译 | English | 中到高级，深入 | 查看 C、C++、Rust 代码生成的汇编与 Wasm |
| [WasmExplorer](https://mbebenita.github.io/WasmExplorer/) | 在线编译 | English | 中级，进阶 | 把 C 与 C++ 编译为 Wasm 并查看文本格式 |
| [Python Tutor（JavaScript）](https://pythontutor.com/javascript.html) | 代码可视化 | English | 初级，入门 | 单步执行并观察作用域与调用栈 |

## 解析、转换与可视化

!!! tip "这一组怎么学"
    用来“看见”代码。把抽象概念（AST、事件循环、正则状态）变成可操作的图像，是理解的捷径。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [AST Explorer](https://astexplorer.net/) | 在线解析 | English | 中级，进阶 | 切换 acorn、Babel、TypeScript 解析器，比较节点结构 |
| [Loupe](http://latentflip.com/loupe/) | 可视化 | English | 初级，入门 | 可视化事件循环 |
| [JS Visualizer 9000](https://www.jsv9000.app/) | 可视化 | English | 初到中级，入门 | 观察 Promise、微任务与定时器的执行顺序 |
| [Regex101](https://regex101.com/) | 在线正则 | English | 初到高级，入门 | 在线正则测试与解释，查看分步匹配 |
| [RegExr](https://regexr.com/) | 在线正则 | English | 初级，入门 | 悬停表达式查看含义，学习语法 |
| [JSON Crack](https://jsoncrack.com/editor) | JSON 可视化 | English | 初级，入门 | 把大 JSON 画成图，便于理解结构 |
| [transform.tools](https://transform.tools/) | 格式转换 | English | 初到中级，入门 | JSON、TypeScript、CSS 等格式互转 |
| [quicktype](https://app.quicktype.io/) | 类型生成 | English | 初到中级，进阶 | 把 JSON 样例生成 TypeScript 类型 |
| [JSONPath](https://jsonpath.com/) | 在线查询 | English | 初级，入门 | 练习 JSONPath 表达式 |
| [jq play](https://jqplay.org/) | 在线查询 | English | 中级，进阶 | 练习命令行 jq，用于日志与接口数据处理 |
| [JSON Formatter](https://jsonformatter.org/) | JSON 工具 | English | 初级，入门 | 格式化与校验 JSON |

## 兼容性与文档

!!! tip "这一组怎么学"
    使用任何新特性前先查兼容性与 Baseline 状态，再决定是否降级或使用 polyfill。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Can I use](https://caniuse.com/) | 兼容性查询 | English | 所有人，入门 | 查询特性浏览器兼容性，关注全球占比数据 |
| [Baseline](https://web.dev/baseline) | 标准 | English | 中级，进阶 | Web 平台特性可用性标准 |
| [Web Platform Status](https://webstatus.dev/) | 特性追踪 | English | 中级，进阶 | 按特性查询各浏览器的实现状态 |
| [Chrome Platform Status](https://chromestatus.com/) | 特性追踪 | English | 中级，进阶 | 查看新特性的实现与标准讨论链接 |
| [DevDocs](https://devdocs.io/) | 文档聚合 | English | 所有人，入门 | 聚合多种文档的离线检索工具 |
| [CSS Reference](https://cssreference.io/) | 速查 | English | 初级，入门 | 以图示速查 CSS 属性 |
| [HTML Reference](https://htmlreference.io/) | 速查 | English | 初级，入门 | 速查 HTML 元素与属性 |
| [Can I email](https://www.caniemail.com/) | 兼容性查询 | English | 中级，进阶 | 邮件客户端 HTML 与 CSS 兼容性 |
| [Web Platform Tests](https://wpt.fyi/) | 测试结果 | English | 高级，深入 | 查看各浏览器对标准用例的通过情况 |

## API 调试与网络

!!! tip "这一组怎么学"
    从浏览器 DevTools 的 Network 面板复制 cURL，再转换为代码或导入工具重放，是定位接口问题最快的流程。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [curlconverter](https://curlconverter.com/) | 转换工具 | English | 初到中级，入门 | 把 cURL 命令转换为 fetch 或其他语言代码 |
| [HTTPie for Web](https://httpie.io/app) | API 客户端 | English | 初到中级，入门 | 在浏览器中构造请求，查看响应头 |
| [Hoppscotch](https://hoppscotch.io/) | API 客户端 | English | 初到中级，入门 | 轻量开源 API 测试，支持 REST 与 WebSocket |
| [Postman](https://www.postman.com/) | API 客户端 | English | 初到高级，入门 | 管理接口集合与环境变量 |
| [Insomnia](https://insomnia.rest/) | API 客户端 | English | 初到中级，入门 | 构造请求并保存集合 |
| [Bruno](https://usebruno.com/) | API 客户端 | English | 初到中级，进阶 | 请求集合以文件保存，可进入 Git 管理 |
| [httpbin](https://httpbin.org/) | 测试服务 | English | 初级，入门 | 用于测试各类状态码、延迟与请求头回显 |
| [JSONPlaceholder](https://jsonplaceholder.typicode.com/) | 假数据服务 | English | 初级，入门 | 练习前端请求时的免费 REST 数据源 |
| [Webhook.site](https://webhook.site/) | 请求捕获 | English | 初到中级，进阶 | 生成临时地址并查看收到的请求 |
| [ngrok](https://ngrok.com/) | 隧道 | English | 中级，进阶 | 把本地服务暴露到公网，调试回调接口 |
| [Mock Service Worker](https://mswjs.io/) | Mock 库 | English | 中级，进阶 | 在浏览器与 Node 中拦截请求，写不依赖后端的测试 |
| [Mockoon](https://mockoon.com/) | Mock 服务 | English | 初到中级，进阶 | 本地搭建模拟 API |
| [JWT.io](https://jwt.io/) | 解码工具 | English | 初到中级，入门 | 解码并理解 JWT 的三个部分，不要粘贴生产令牌 |

## 性能与安全检查

!!! tip "这一组怎么学"
    每次优化前先留基线数据。实验室数据（Lighthouse）用于排查，真实用户数据（CrUX）用于判断是否真的变好。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [PageSpeed Insights](https://pagespeed.web.dev/) | 性能检测 | English | 初到高级，入门 | 同时查看实验室数据与真实用户数据 |
| [web.dev Measure](https://web.dev/measure/) | 性能检测 | English | 初到中级，入门 | 运行 Lighthouse 并阅读优化建议 |
| [Chrome UX Report](https://developer.chrome.com/docs/crux) | 数据源 | English | 中级，进阶 | 了解真实用户性能数据的来源与查询方式 |
| [DebugBear](https://www.debugbear.com/) | 性能监控 | English | 中级，进阶 | 阅读其性能文章与工具，了解持续监控 |
| [Squoosh](https://squoosh.app/) | 图片压缩 | English | 初级，入门 | 图片压缩与格式转换，比较 WebP 与 AVIF 的体积 |
| [SVGOMG](https://jakearchibald.github.io/svgomg/) | SVG 优化 | English | 初到中级，入门 | 压缩 SVG，逐项开关优化选项观察效果 |
| [Bundlephobia](https://bundlephobia.com/) | 包体积 | English | 初到中级，入门 | 查看 npm 包体积 |
| [pkg-size.dev](https://pkg-size.dev/) | 包体积 | English | 初到中级，入门 | 查看包的安装体积与依赖 |
| [bundlejs](https://bundlejs.com/) | 在线打包 | English | 中级，进阶 | 在线打包并查看压缩后体积与 tree-shaking 效果 |
| [npm trends](https://npmtrends.com/) | 对比 | English | 初到中级，入门 | 比较同类包的下载趋势 |
| [MDN Observatory](https://observatory.mozilla.org/) | 安全检查 | English | 初到中级，进阶 | 检查站点的安全响应头 |
| [CSP Evaluator](https://csp-evaluator.withgoogle.com/) | 安全检查 | English | 中级，进阶 | 检查内容安全策略的缺陷 |
| [SSL Labs](https://www.ssllabs.com/ssltest/) | 安全检查 | English | 中级，进阶 | 检测站点 TLS 配置 |

## 浏览器 DevTools 技巧

!!! tip "这一组怎么学"
    DevTools 技巧的收益最高：每周学 1 条，立即在手头项目里用一次。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Chrome DevTools 文档](https://developer.chrome.com/docs/devtools/) | 官方文档 | English | 初到高级，进阶 | 按面板顺序读：Elements、Network、Performance、Memory |
| [DevTools 提示](https://developer.chrome.com/docs/devtools/tips) | 官方文档 | English | 初到中级，入门 | 阅读短小技巧并逐条尝试 |
| [DevTools Tips](https://devtoolstips.org/) | 技巧合集 | English | 初到中级，入门 | 每周挑 1 条用于项目调试 |
| [Dev Tips（Umar Hansa）](https://umaar.com/dev-tips/) | 技巧合集 | English | 初到中级，入门 | 阅读带 GIF 的 DevTools 技巧 |

## 绘图与设计

!!! tip "这一组怎么学"
    学会用图表达架构，是面试与协作中的高回报技能。每学完一个主题，画一张流程图或架构图。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Excalidraw](https://excalidraw.com/) | 白板 | English | 初级，入门 | 手绘风白板与架构草图，用于面试系统设计练习 |
| [Mermaid Live Editor](https://mermaid.live/) | 图表语言 | English | 初到中级，入门 | 在线编写流程图与时序图，写完粘贴到本站文档 |
| [draw.io](https://app.diagrams.net/) | 图表工具 | English | 初到中级，入门 | 通用图表工具，适合较复杂的架构图 |
| [Coolors](https://coolors.co/) | 配色 | English | 初级，入门 | 生成并导出配色方案 |
| [OKLCH Color Picker](https://oklch.com/) | 配色 | English | 中级，进阶 | 理解 OKLCH 色彩空间并生成 CSS 值 |
| [Color.js Picker](https://colorjs.io/apps/picker/) | 配色 | English | 中级，进阶 | 在不同色彩空间下比较颜色 |

## CSS 练习与生成

!!! tip "这一组怎么学"
    CSS 靠练习，不靠记忆。先用游戏化工具熟悉 Flexbox 与 Grid，再用生成器查看输出代码并理解其含义。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Flexbox Froggy](https://flexboxfroggy.com/) | 游戏 | English | 初级，入门 | 完成全部关卡，再口述每个属性的作用 |
| [CSS Grid Garden](https://cssgridgarden.com/) | 游戏 | English | 初级，入门 | 完成全部关卡后，用 Grid 重做一个页面布局 |
| [CSS Diner](https://flukeout.github.io/) | 游戏 | English | 初级，入门 | 练习选择器，完成全部关卡 |
| [CSSBattle](https://cssbattle.dev/) | 练习 | English | 中级，进阶 | 用最少代码复刻图形，练习布局与定位 |
| [Layoutit Grid](https://grid.layoutit.com/) | 生成器 | English | 初到中级，入门 | 可视化生成 Grid，读生成的代码 |
| [CSS Generators](https://css-generators.com/) | 生成器 | English | 中级，进阶 | 研究波浪、锯齿等形状背后的 CSS 原理 |
| [cubic-bezier.com](https://cubic-bezier.com/) | 动画工具 | English | 初到中级，入门 | 调整缓动曲线并预览 |
| [Easing Functions Cheat Sheet](https://easings.net/) | 速查 | English | 初级，入门 | 选择常用缓动函数 |
