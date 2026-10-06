---
title: 书籍、课程与视频
description: 经过链接核验的前端相关书籍、在线课程、YouTube 频道、大会演讲与播客，附使用方法
---

# 书籍、课程与视频

本页收录 50 余本书、20 余门课程、频道与演讲。所有链接已用 HTTP 请求核验可访问，书籍链接指向出版社或作者官网。

选择原则：每个主题只选一本书加一门课，读完再换。读书时配合 [学习路线](learning-paths.md) 的周计划，每章做一个练习，而不是通读。

## JavaScript 与 TypeScript 书籍

!!! tip "这一组怎么学"
    先读一本入门书并做完全部练习，再读一本讲语言机制的书。TypeScript 书籍在能独立写出 JavaScript 项目之后再读。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Eloquent JavaScript（第 4 版，No Starch）](https://nostarch.com/eloquent-javascript-4th-edition) | 书 | English | 零基础到初级，入门 | 每章后做练习；第 14 章起的项目章节必须自己动手 |
| [JavaScript: The Definitive Guide（O'Reilly）](https://www.oreilly.com/library/view/javascript-the-definitive/9781491952016/) | 书 | English | 初级到中级，进阶 | 作参考书，按主题查阅，重点读类、迭代器、异步章节 |
| [JavaScript: The Good Parts（O'Reilly）](https://www.oreilly.com/library/view/javascript-the-good/9780596517748/) | 书 | English | 中级，进阶 | 读闭包与继承章节，理解语言设计取舍；语法部分已过时 |
| [You Don't Know JS Yet（GitHub 免费）](https://github.com/getify/You-Dont-Know-JS) | 书 | English | 中级，进阶 | 读《Scope & Closures》与《Objects & Classes》，每章末自测 |
| [Secrets of the JavaScript Ninja（Manning）](https://www.manning.com/books/secrets-of-the-javascript-ninja-second-edition) | 书 | English | 中级，进阶 | 读函数、闭包、原型章节，并手写书中的小示例 |
| [High Performance JavaScript（O'Reilly）](https://www.oreilly.com/library/view/high-performance-javascript/9781449382308/) | 书 | English | 中级，进阶 | 只读 DOM 操作与算法章节，用 DevTools 复测书中结论 |
| [ES6 入门教程（阮一峰）](https://es6.ruanyifeng.com/) | 在线书 | 中文 | 初到中级，入门 | 按章节读，每章在控制台跑一遍示例 |
| [现代 JavaScript 教程](https://zh.javascript.info/) | 在线书 | 中文 | 零基础到中级，入门 | 完成每章任务，再做文末练习 |
| [Learning TypeScript（O'Reilly）](https://www.oreilly.com/library/view/learning-typescript/9781098110321/) | 书 | English | 有 JS 基础，入门 | 把阶段 0 的项目改写为 TypeScript，边读边迁移 |
| [Effective TypeScript（第 2 版）](https://effectivetypescript.com/) | 书 | English | 有 TS 使用经验，进阶 | 每条建议对应一个小重构，在自己代码里找一处应用 |
| [Programming TypeScript（O'Reilly）](https://www.oreilly.com/library/view/programming-typescript/9781492037644/) | 书 | English | 中级，进阶 | 读类型系统与错误处理章节，对照 TS Playground 试验 |
| [TypeScript Quickly（Manning）](https://www.manning.com/books/typescript-quickly) | 书 | English | 中级，入门到进阶 | 前半本快速过语法，后半本做全栈示例 |
| [Total TypeScript Essentials](https://www.totaltypescript.com/books/total-typescript-essentials) | 书 | English | 有 JS 基础，入门到进阶 | 配合其练习题，做完每章练习再进入下一章 |

## CSS 与设计书籍

!!! tip "这一组怎么学"
    CSS 书籍的价值在布局思维。读完一章立刻复刻一个真实页面的相应部分，并用不同宽度验证。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [CSS in Depth（Manning）](https://www.manning.com/books/css-in-depth-second-edition) | 书 | English | 初到中级，进阶 | 先读布局与层叠章节，每章写一个实验页面 |
| [CSS: The Definitive Guide（O'Reilly）](https://www.oreilly.com/library/view/css-the-definitive/9781098117603/) | 书 | English | 中级，深入 | 按需查阅选择器、格式化模型章节 |
| [CSS Secrets（O'Reilly）](https://www.oreilly.com/library/view/css-secrets/9781449372736/) | 书 | English | 中级，进阶 | 每个技巧在 CodePen 重做一次，并查 Can I use 确认现状 |
| [Every Layout](https://every-layout.dev/) | 在线书 | English | 中级，进阶 | 理解“布局原语”思想，用其中三个原语搭一个页面 |
| [Refactoring UI](https://www.refactoringui.com/book) | 书 | English | 初级，入门 | 拿一个自己做的丑页面，按书中规则逐条改进并对比截图 |

## 浏览器、网络与安全书籍

!!! tip "这一组怎么学"
    带着阶段 1 的问题读：每读一章，在 DevTools 的 Network 面板验证一条结论。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [High Performance Browser Networking（O'Reilly）](https://www.oreilly.com/library/view/high-performance-browser/9781449344757/) | 书 | English | 中级，进阶 | 在线版 [hpbn.co](https://hpbn.co/) 免费；读 TCP、TLS、HTTP/2 章节并抓包验证 |
| [The Tangled Web（No Starch）](https://nostarch.com/tangledweb) | 书 | English | 中级，深入 | 读同源策略与内容隔离章节，对照本站安全栏目 |
| [Web Security for Developers（O'Reilly）](https://www.oreilly.com/library/view/web-security-for/9781492053101/) | 书 | English | 初到中级，入门 | 每章攻击示例在本地环境复现并修复 |
| [The Web Application Hacker's Handbook（O'Reilly）](https://www.oreilly.com/library/view/the-web-application/9781118026472/) | 书 | English | 中到高级，深入 | 选注入与会话管理章节，配合 [PortSwigger Web Security Academy](https://portswigger.net/web-security) 靶场 |
| [Web Performance in Action（Manning）](https://www.manning.com/books/web-performance-in-action) | 书 | English | 初到中级，进阶 | 用其优化流程改造一个自己的页面，保留前后数据 |
| [小林 coding](https://xiaolincoding.com/) | 在线书 | 中文 | 初到中级，入门 | 网络与操作系统图解，读后能口述 TCP 三次握手与四次挥手 |

## 框架、测试与架构书籍

!!! tip "这一组怎么学"
    架构类书籍等有 1 年以上项目经验再读收益更大。读每章时对照自己项目里一个具体问题。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Learning React（第 2 版，O'Reilly）](https://www.oreilly.com/library/view/learning-react-2nd/9781492051718/) | 书 | English | 有 JS 基础，入门 | 与 React 官方教程交替读，用其示例做阶段 2 项目 |
| [React in Action（Manning）](https://www.manning.com/books/react-in-action) | 书 | English | 初到中级，入门 | 边读边做书中的应用，再用 Hooks 改写 |
| [Testing JavaScript Applications（Manning）](https://www.manning.com/books/testing-javascript-applications) | 书 | English | 中级，进阶 | 把书中的测试方法应用到自己的 API 与前端项目 |
| [Node.js in Action（第 2 版，Manning）](https://www.manning.com/books/node-js-in-action-second-edition) | 书 | English | 初到中级，入门 | 完成示例服务，再换 Hono 或 Koa 重写 |
| [Patterns.dev](https://www.patterns.dev/) | 在线书 | English | 中级，进阶 | 读设计模式与渲染模式部分，对应写一个反例与一个正例 |
| [Building Micro-Frontends（O'Reilly）](https://www.oreilly.com/library/view/building-microfrontends/9781492082989/) | 书 | English | 中到高级，进阶 | 先读代价与适用场景，再决定是否采用；参考 [micro-frontends.org](https://micro-frontends.org/) |
| [Clean Code（O'Reilly）](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) | 书 | English | 初到中级，入门 | 读命名、函数、注释章节，对自己的代码做一次重构 |
| [The Pragmatic Programmer（Pragmatic Bookshelf）](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) | 书 | English | 初到中级，入门 | 每章挑一条原则，一周内在项目里落实 |
| [Clean Architecture（O'Reilly）](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/) | 书 | English | 中级，进阶 | 读依赖规则与边界章节，画出自己项目的依赖图 |
| [Design Patterns（O'Reilly）](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/) | 书 | English | 中级，进阶 | 只精读观察者、策略、装饰器、代理，各用 TypeScript 实现一次 |
| [Software Engineering at Google（O'Reilly）](https://www.oreilly.com/library/view/software-engineering-at/9781492082781/) | 书 | English | 中到高级，进阶 | 读测试、代码评审、依赖管理章节，用于团队实践讨论 |
| [Fundamentals of Software Architecture（O'Reilly）](https://www.oreilly.com/library/view/fundamentals-of-software/9781492043447/) | 书 | English | 中级，进阶 | 读架构特性与风格章节，用于系统设计面试准备 |

## 后端、数据与系统设计书籍

!!! tip "这一组怎么学"
    《Designing Data-Intensive Applications》信息密度很高，建议每周一章，并为每章写一页摘要。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Designing Data-Intensive Applications](https://dataintensive.net/) | 书 | English | 中到高级，深入 | 每周一章，读完用自己的话向他人讲解复制与分区 |
| [Building Microservices（第 2 版，O'Reilly）](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/) | 书 | English | 中到高级，进阶 | 读拆分与通信章节，评估自己项目是否需要微服务 |
| [Accelerate（O'Reilly）](https://www.oreilly.com/library/view/accelerate/9781457191435/) | 书 | English | 中级，进阶 | 读交付指标章节，度量自己团队的部署频率与恢复时间 |
| [The Phoenix Project（O'Reilly）](https://www.oreilly.com/library/view/the-phoenix-project/9781457191350/) | 书 | English | 初级，入门 | 作为小说一周读完，理解 DevOps 动机 |
| [Grokking Algorithms（第 2 版，Manning）](https://www.manning.com/books/grokking-algorithms-second-edition) | 书 | English | 零基础，入门 | 读图解后用 JavaScript 重写每个算法 |
| [ByteByteGo 系统设计课程](https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users) | 在线课 | English | 初到中级，入门 | 先读第一章的扩展路径，再对照 [面试练习](interview-practice.md) 做设计题 |

## 编译器、运行时与底层书籍

!!! tip "这一组怎么学"
    这些书都要边读边写代码。《Crafting Interpreters》免费在线，是最推荐的起点。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Crafting Interpreters](https://craftinginterpreters.com/) | 在线书 | English | 中级，进阶 | 用 TypeScript 实现第一部分的解释器，每章提交一次 |
| [Writing An Interpreter In Go](https://interpreterbook.com/) | 书 | English | 中级，进阶 | 不会 Go 也可读思路；用 TypeScript 重写词法与语法分析 |
| [Writing A Compiler In Go](https://compilerbook.com/) | 书 | English | 中级，进阶 | 在读完前一本后阅读，关注字节码与虚拟机设计 |
| [The Rust Programming Language](https://doc.rust-lang.org/book/) | 在线书 | English | 初级，入门 | 完成官方练习；中文版见 [Rust 程序设计语言](https://kaisery.github.io/trpl-zh-cn/) |
| [Rust for Rustaceans（No Starch）](https://nostarch.com/rust-rustaceans) | 书 | English | 已会 Rust，深入 | 读完 Rust 基础后再读，聚焦 API 设计与异步章节 |
| [Programming WebAssembly with Rust（Pragmatic Bookshelf）](https://pragprog.com/titles/khrust/programming-webassembly-with-rust/) | 书 | English | 中级，进阶 | 跟着做浏览器与服务端的 Wasm 示例 |
| [WebAssembly: The Definitive Guide（O'Reilly）](https://www.oreilly.com/library/view/webassembly-the-definitive/9781492089834/) | 书 | English | 中级，深入 | 读二进制格式与执行模型章节，用 wasm 文本格式手写一个函数 |
| [Computer Systems: A Programmer's Perspective](https://csapp.cs.cmu.edu/) | 书 | English | 中到高级，深入 | 读内存层级与链接章节，配合课程实验 |
| [Operating Systems: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/) | 在线书 | English | 初到中级，进阶 | 读虚拟化与并发部分，理解进程、线程、调度 |
| [Nand2Tetris](https://www.nand2tetris.org/) | 书与课程 | English | 零基础，进阶 | 前半部分硬件项目每周一个，理解计算机如何由逻辑门构成 |

## AI 与 LLM 书籍

!!! tip "这一组怎么学"
    先读应用类（AI Engineering），再读原理类（从零构建 LLM）。每读一章记录一个可落地的评测或设计决策。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [AI Engineering（Chip Huyen，O'Reilly）](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) | 书 | English | 中级，进阶 | 读评测与应用架构章节，作为 Agent 项目的设计参考 |
| [Building Applications with AI Agents（O'Reilly）](https://www.oreilly.com/library/view/building-applications-with/9781098176495/) | 书 | English | 中级，进阶 | 与本站 [AI Agent](../agent/index.md) 栏目对照阅读，比较设计取舍 |
| [Hands-On Large Language Models（O'Reilly）](https://www.oreilly.com/library/view/hands-on-large-language/9781098150952/) | 书 | English | 中级，进阶 | 跑通配套笔记本，理解分词、嵌入、检索 |
| [Build a Large Language Model (From Scratch)（Manning）](https://www.manning.com/books/build-a-large-language-model-from-scratch) | 书 | English | 中到高级，深入 | 配合 [代码仓库](https://github.com/rasbt/LLMs-from-scratch) 逐章运行 |
| [Designing Machine Learning Systems（O'Reilly）](https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/) | 书 | English | 中级，进阶 | 读数据与部署章节，了解模型上线的工程问题 |

## 在线课程平台

!!! tip "这一组怎么学"
    付费课程只在有明确缺口时购买。先用免费课程完成一遍路线，再用付费课程补强某个方向，并要求自己完成全部练习。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Frontend Masters](https://www.frontendmasters.com/) | 视频课程 | English | 初到高级，覆盖全程 | 按 [学习路线](learning-paths.md) 选一条课程路径，跟敲代码 |
| [Egghead](https://egghead.io/) | 短视频课程 | English | 中级，进阶 | 每集 3 到 5 分钟，适合专题补缺，看完立刻手写 |
| [Epic Web](https://www.epicweb.dev/) | 工作坊 | English | 中到高级，进阶 | 全栈 Web 工作坊，按其练习仓库逐步完成 |
| [Epic React](https://www.epicreact.dev/) | 工作坊 | English | 中级，进阶 | 每个练习先自己实现再看解答 |
| [Total TypeScript](https://www.totaltypescript.com/tutorials) | 教程与练习 | English | 初到高级，进阶 | 按教程顺序完成类型练习，与 [type-challenges](https://github.com/type-challenges/type-challenges) 搭配 |
| [CSS for JavaScript Developers](https://css-for-js.dev/) | 视频课程 | English | 中级，进阶 | 补全 CSS 心智模型，每个模块完成配套项目 |
| [Joshua Comeau：React 相关教程](https://www.joshwcomeau.com/react/) | 文章与互动 | English | 初到中级，入门 | 交互式文章，边读边操作示例 |
| [freeCodeCamp](https://www.freecodecamp.org/) | 免费课程 | 中文、English | 零基础，入门 | 按课程顺序完成认证项目，不要跳过项目 |
| [The Odin Project](https://www.theodinproject.com/) | 免费课程 | English | 零基础，入门 | 严格按路径推进，每个项目提交到 GitHub |
| [Scrimba](https://scrimba.com/) | 交互式课程 | English | 零基础，入门 | 在视频中直接改代码，每节暂停后自己重写 |
| [CS50x（哈佛）](https://cs50.harvard.edu/x/) | 免费课程 | English | 零基础，入门 | 每周一个 problem set，补齐计算机基础 |
| [CS50 Web：Python 与 JavaScript](https://cs50.harvard.edu/web/) | 免费课程 | English | 有编程基础，进阶 | 完成其 5 个项目，覆盖 Git、Django、前端与部署 |
| [MIT The Missing Semester](https://missing.csail.mit.edu/) | 免费课程 | English | 初级，入门 | 学 shell、Git、调试、构建，每讲完成课后练习 |
| [Coursera：Algorithms Part I（Princeton）](https://www.coursera.org/learn/algorithms-part1) | 大学课程 | English | 中级，进阶 | 完成编程作业，算法基础比刷题更系统 |
| [Coursera：Data Structures and Algorithms 专项](https://www.coursera.org/specializations/data-structures-algorithms) | 大学课程 | English | 中级，进阶 | 每周完成作业，和 LeetCode 并行 |
| [Coursera：Meta Front-End Developer 证书](https://www.coursera.org/professional-certificates/meta-front-end-developer) | 认证课程 | English | 零基础，入门 | 作为系统化入门路径，完成其项目 |
| [edX：CS50 入口](https://www.edx.org/cs50) | 大学课程 | English | 零基础，入门 | 想要证书时使用 edX 版本 |
| [MIT 6.006 算法导论](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) | 大学课程 | English | 中到高级，深入 | 看讲义与视频，做习题集 |
| [MIT 6.004 计算结构](https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/) | 大学课程 | English | 中级，进阶 | 补硬件与指令集知识，适合阶段 5 |
| [Stanford CS142 Web 应用](https://web.stanford.edu/class/cs142/) | 大学课程 | English | 中级，进阶 | 阅读讲义和项目要求，自己实现各项目 |
| [Stanford CS193X Web 编程](https://cs193x.stanford.edu/) | 大学课程 | English | 初到中级，进阶 | 阅读讲义，完成作业 |
| [Hugging Face Agents Course](https://huggingface.co/learn/agents-course) | 免费课程 | English | 中级，入门 | 完成单元作业，理解 Agent 基本循环 |
| [Hugging Face MCP Course](https://huggingface.co/learn/mcp-course) | 免费课程 | English | 中级，入门 | 实现一个 MCP 服务器与客户端 |
| [DeepLearning.AI 短课程](https://www.deeplearning.ai/short-courses/) | 免费短课 | English | 初到中级，入门 | 选择 Agent 与 RAG 相关短课，每门 1 小时内完成并复现 |
| [Anthropic Learn](https://www.anthropic.com/learn) | 官方教程 | English | 初到中级，入门 | 按官方指南理解提示与工具调用 |

## YouTube 频道

!!! tip "这一组怎么学"
    视频适合建立直觉，不适合当作唯一来源。看完一个视频后合上视频，自己实现一遍，再回头查差异。每周看视频的时间不超过学习总时间的三分之一。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Fireship](https://www.youtube.com/@Fireship) | 频道 | English | 所有人，入门 | 100 秒系列用于快速建立概念，不替代文档 |
| [Theo（t3.gg）](https://www.youtube.com/@t3dotgg) | 频道 | English | 中级，进阶 | 了解业界对框架与工具的观点，看完自己判断 |
| [Web Dev Simplified](https://www.youtube.com/@WebDevSimplified) | 频道 | English | 初级，入门 | 按主题看短视频并跟敲 |
| [Kevin Powell](https://www.youtube.com/@KevinPowell) | 频道 | English | 初到中级，入门 | CSS 最佳视频来源，每个视频后复刻其示例 |
| [Jake Archibald](https://www.youtube.com/@jakearchibald) | 频道 | English | 中到高级，进阶 | 浏览器与 Web 平台深度内容 |
| [Chrome for Developers](https://www.youtube.com/@ChromeDevs) | 频道 | English | 中级，进阶 | 订阅 Chrome Dev Summit、DevTools、性能系列 |
| [Google for Developers](https://www.youtube.com/@GoogleDevelopers) | 频道 | English | 中级，进阶 | 查看 Google I/O 的 Web 与 AI 主题场次 |
| [Matt Pocock](https://www.youtube.com/@mattpocockuk) | 频道 | English | 中级，进阶 | TypeScript 技巧，看完在 TS Playground 复现 |
| [Traversy Media](https://www.youtube.com/@TraversyMedia) | 频道 | English | 初级，入门 | 完整项目教程，适合阶段 0 到 2 |
| [freeCodeCamp.org](https://www.youtube.com/@freecodecamp) | 频道 | English | 零基础到中级，入门 | 长课程适合按章节分多天学习 |
| [Frontend Masters 频道](https://www.youtube.com/@FrontendMasters) | 频道 | English | 中级，进阶 | 选看免费公开的课程片段与会议演讲 |
| [Scrimba 频道](https://www.youtube.com/@scrimba) | 频道 | English | 初级，入门 | 用于免费入门课程 |
| [Vue Mastery](https://www.youtube.com/@VueMastery) | 频道 | English | 初到中级，入门 | Vue 生态教程与新闻 |
| [ByteGrad](https://www.youtube.com/@bytegrad) | 频道 | English | 初到中级，入门 | React 与 Next.js 项目教程 |
| [The Coding Train](https://www.youtube.com/@TheCodingTrain) | 频道 | English | 初级，入门 | 创意编程与算法可视化，适合保持兴趣 |
| [Computerphile](https://www.youtube.com/@Computerphile) | 频道 | English | 初到中级，入门 | 计算机科学概念讲解 |
| [CS50](https://www.youtube.com/@cs50) | 频道 | English | 零基础，入门 | CS50 讲座与研讨会视频 |
| [MIT OpenCourseWare](https://www.youtube.com/@mitocw) | 频道 | English | 中到高级，深入 | 与 MIT 课程配套的完整讲座 |
| [Andrej Karpathy](https://www.youtube.com/@AndrejKarpathy) | 频道 | English | 中到高级，深入 | 从零实现神经网络与 GPT 的系列，跟着写代码 |
| [3Blue1Brown](https://www.youtube.com/@3blue1brown) | 频道 | English | 初到中级，入门 | 数学与神经网络直观讲解 |
| [Low Level](https://www.youtube.com/@LowLevelTV) | 频道 | English | 中级，进阶 | 底层与安全相关内容，辅助阶段 5 |
| [ThePrimeagen](https://www.youtube.com/@ThePrimeagen) | 频道 | English | 中级，进阶 | 工程师观点与编辑器效率，选择性观看 |

## 大会与演讲

!!! tip "这一组怎么学"
    大会演讲适合用来理解“某个设计为什么这样做”。先看一场，用一页纸总结要点与反驳点，再去读对应的规范或源码。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Jake Archibald：In The Loop（JSConf.Asia）](https://www.youtube.com/watch?v=cCOL7MC4Pl0) | 演讲 | English | 中级，进阶 | 看完后预测 10 道事件循环输出题再验证 |
| [Philip Roberts：What the heck is the event loop anyway?（JSConf EU）](https://www.youtube.com/watch?v=8aGhZQkoFbQ) | 演讲 | English | 入门到中级，入门 | 配合 [Loupe](http://latentflip.com/loupe/) 或 [JS Visualizer 9000](https://www.jsv9000.app/) 观察调用栈 |
| [JSConf 频道](https://www.youtube.com/user/jsconfeu) | 大会视频 | English | 所有人，进阶 | 按主题搜索，选择近三年的引擎与标准类演讲 |
| [JSConf 官网](https://jsconf.com/) | 大会 | English | 所有人 | 了解各地 JSConf 举办信息 |
| [React Conf](https://conf.react.dev/) | 大会 | English | 中级，进阶 | 看 React 团队的主题演讲，理解官方路线图 |
| [Vue.js 官方大会](https://conf.vuejs.org/) | 大会 | English | 中级，进阶 | 看主题演讲，了解响应式与编译器方向 |
| [VueConf 中国](https://vueconf.cn/) | 大会 | 中文 | 中级，进阶 | 查看历届议程，选择与你项目相关的议题 |
| [ViteConf](https://viteconf.org/) | 大会 | English | 中级，进阶 | 看工具链生态的路线图，频道见 [ViteConf YouTube](https://www.youtube.com/@viteconf) |
| [Strange Loop](https://www.youtube.com/@strangeloopconf) | 大会 | English | 中到高级，深入 | 语言、系统、分布式主题，选看 2 到 3 场拓宽视野 |
| [Google I/O](https://io.google/) | 大会 | English | 所有人，进阶 | 在其议程中筛选 Web 与 Chrome 相关场次 |
| [Next.js Conf](https://nextjs.org/conf) | 大会 | English | 中级，进阶 | 了解全栈框架方向 |
| [Smashing Conference](https://smashingconf.com/) | 大会 | English | 中级，进阶 | 设计、CSS、性能相关议题 |
| [JSConf China](https://jsconf.cn/) | 大会 | 中文 | 所有人，进阶 | 查看国内社区的主题与讲师 |

## 播客

!!! tip "这一组怎么学"
    播客用于通勤时间补充行业动态。听到值得深挖的话题时，记下关键词，之后再用文档与源码核实。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Syntax FM](https://syntax.fm/) | 播客 | English | 初到中级，入门 | 选择与当前阶段相关的单集，每周 1 到 2 集 |
| [JS Party](https://changelog.com/jsparty) | 播客 | English | 初到中级，入门 | 每周一期，关注框架与标准动态 |
| [Changelog News](https://changelog.com/news) | 播客与周刊 | English | 初到中级，入门 | 快速了解开源与工具动态 |
| [Latent Space](https://www.latent.space/podcast) | 播客 | English | 中到高级，进阶 | AI 工程动态，阶段 6 期间订阅 |
| [The Pragmatic Engineer](https://newsletter.pragmaticengineer.com/) | 周刊 | English | 中到高级，进阶 | 了解工程组织与职业发展，选择主题阅读 |

## 怎么组合使用

!!! tip "这一组怎么学"
    下面是推荐的组合方式，避免资料过多反而学不完。

| 阶段 | 一本书 | 一门课 | 一个视频来源 |
| --- | --- | --- | --- |
| 阶段 0 | Eloquent JavaScript 或 现代 JavaScript 教程 | The Odin Project 或 freeCodeCamp | Kevin Powell 与 Web Dev Simplified |
| 阶段 1 | High Performance Browser Networking；Learning TypeScript | Total TypeScript | Jake Archibald 与 Philip Roberts 的事件循环演讲 |
| 阶段 2 | Learning React 或官方教程 | Epic React 或 Vue 官方教程 | React Conf 与 VueConf 主题演讲 |
| 阶段 3 | Web Performance in Action；Testing JavaScript Applications | Frontend Masters 工程化课程 | Chrome for Developers |
| 阶段 4 | Designing Data-Intensive Applications | Epic Web 或 CS50 Web | Theo |
| 阶段 5 | Crafting Interpreters；The Rust Programming Language | MIT 6.004 或 CS:APP 配套课 | Strange Loop |
| 阶段 6 | AI Engineering | Hugging Face Agents Course | Andrej Karpathy；Latent Space |

更多按阶段整理的权威文档与规范见 [资源导航](index.md)，读源码的顺序见 [源码阅读路线](source-code-reading.md)。
