---
title: 测试与监控资料
description: 单元、组件、端到端测试、Mock、Storybook 以及线上错误监控与可观测性的权威资料
---

# 测试与监控资料

先建立测试策略，再选工具落地，最后补齐线上监控，形成发布前与发布后的闭环。

所有链接均已检查可访问。语言标签为资料正文语言；难度：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## 测试策略与理念

!!! tip "这一组怎么学"
    先读 Practical Test Pyramid 与 Kent C. Dodds 的测试文章（约 4 小时），弄清单元、集成、端到端的比例与取舍。然后审视自己项目的测试，写出一份「哪些该测、用什么层级测」的清单。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) | 文章 | English | 入门 | 读完用自己项目的例子标注每个测试属于哪一层。 |
| [Testing JavaScript](https://testingjavascript.com/) | 付费课程 | English | 进阶 | 查看课程大纲，了解从单元到端到端的完整路线。 |
| [Kent：Static vs Unit vs Integration vs E2E](https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests) | 博客 | English | 入门 | 读完说明各类测试的成本与信心差异。 |
| [Kent：测试奖杯](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) | 博客 | English | 进阶 | 对比金字塔，思考集成测试为何占比最大。 |
| [Kent：测试实现细节](https://kentcdodds.com/blog/testing-implementation-details) | 博客 | English | 进阶 | 把一个依赖内部 state 的测试改成基于用户行为。 |
| [Kent：怎么知道该测什么](https://kentcdodds.com/blog/how-to-know-what-to-test) | 博客 | English | 入门 | 用文中的覆盖率思路为一个模块挑出核心用例。 |
| [Kent：写测试](https://kentcdodds.com/blog/write-tests) | 博客 | English | 入门 | 读完记住「越像用户使用方式，越有信心」。 |
| [Kent：避免测试嵌套](https://kentcdodds.com/blog/avoid-nesting-when-youre-testing) | 博客 | English | 进阶 | 把一个多层 describe 的测试文件改成平铺用例。 |
| [Kent：有效的快照测试](https://kentcdodds.com/blog/effective-snapshot-testing) | 博客 | English | 进阶 | 检查项目里过大的快照，缩小到关键片段。 |
| [Kent：到底什么是 Mock](https://kentcdodds.com/blog/but-really-what-is-a-javascript-mock) | 博客 | English | 进阶 | 手写一个最小的 mock 函数，理解其原理。 |
| [Kent：不要 Mock fetch](https://kentcdodds.com/blog/stop-mocking-fetch) | 博客 | English | 进阶 | 读完把一个 fetch mock 换成网络层拦截。 |
| [Google Testing Blog](https://testing.googleblog.com/) | 博客 | English | 进阶 | 读测试可靠性与 flaky 测试相关文章。 |
| [JavaScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices) | 清单 | English | 进阶 | 对照 50 多条实践给现有测试评分。 |
| [Stryker 变异测试](https://stryker-mutator.io/docs/) | 工具文档 | English | 深入 | 对一个模块跑变异测试，检查测试是否真能发现缺陷。 |

## 单元与组件测试

!!! tip "这一组怎么学"
    选 Vitest 或 Jest 之一跑通示例（约 2 小时），再读 Testing Library 指导原则与查询优先级，给一个表单组件写 5 个基于角色查询的用例（约 4 小时）。最后练习 mock 模块与定时器。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Vitest 指南](https://vitest.dev/guide/) | 官方文档 | English | 入门 | 在 Vite 项目中配置并运行第一个测试。 |
| [Vitest 中文指南](https://cn.vitest.dev/guide/) | 官方文档 | 中文 | 入门 | 中文版入门，快速跑通。 |
| [Vitest Mock](https://vitest.dev/guide/mocking) | 官方文档 | English | 进阶 | 练习模块 mock、定时器与网络请求 mock。 |
| [Vitest 浏览器模式](https://vitest.dev/guide/browser/) | 官方文档 | English | 进阶 | 在真实浏览器中运行组件测试，对比 jsdom 的差异。 |
| [Jest 文档](https://jestjs.io/docs/getting-started) | 官方文档 | English | 入门 | 作为存量项目最常见的框架，跑一遍快照与异步测试。 |
| [Jest 中文文档](https://jestjs.io/zh-Hans/docs/getting-started) | 官方文档 | 中文 | 入门 | 中文版入门文档。 |
| [Jest Mock 函数](https://jestjs.io/docs/mock-functions) | 官方文档 | English | 进阶 | 练习 jest.fn 与 spyOn 的断言用法。 |
| [Testing Library 指导原则](https://testing-library.com/docs/guiding-principles) | 官方文档 | English | 入门 | 理解为什么按用户可见行为查询。 |
| [Testing Library 查询优先级](https://testing-library.com/docs/queries/about#priority) | 官方文档 | English | 入门 | 把自己测试里的 testid 查询尽量换成 role 查询。 |
| [React Testing Library 简介](https://testing-library.com/docs/react-testing-library/intro/) | 官方文档 | English | 入门 | 给一个组件写渲染、交互、断言三步测试。 |
| [Testing Library 总入口](https://testing-library.com/docs/) | 官方文档 | English | 进阶 | 以用户行为为导向的组件测试理念与 API。 |
| [Kent：RTL 常见错误](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) | 博客 | English | 进阶 | 逐条检查自己测试是否犯了同样的错误。 |
| [Kent：修复 not wrapped in act 警告](https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning) | 博客 | English | 进阶 | 在自己项目复现警告并按文中方式消除。 |
| [jest-dom](https://github.com/testing-library/jest-dom) | 工具 | English | 入门 | 引入自定义匹配器，让断言更可读。 |
| [fast-check 文档](https://fast-check.dev/) | 工具文档 | English | 深入 | 为一个解析函数写属性测试。 |
| [Node.js 内置测试运行器](https://nodejs.org/api/test.html) | 官方文档 | English | 进阶 | 用 node:test 为一个工具库写测试，免装依赖。 |

## 端到端与组件工作台

!!! tip "这一组怎么学"
    选 Playwright 做主力：读最佳实践与编写测试（约 3 小时），为一个登录加列表流程写 3 条用例，并用 Trace Viewer 调试一次失败。随后用 Storybook 官方教程为组件建立工作台，再对比 Cypress 的差异。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Playwright 文档](https://playwright.dev/docs/intro) | 官方文档 | English | 入门 | 跨浏览器端到端测试官方文档，先安装并跑示例。 |
| [Playwright：编写测试](https://playwright.dev/docs/writing-tests) | 官方文档 | English | 入门 | 写出带自动等待与断言的测试。 |
| [Playwright 最佳实践](https://playwright.dev/docs/best-practices) | 官方文档 | English | 进阶 | 对照清单改写不稳定的用例。 |
| [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer-intro) | 官方文档 | English | 进阶 | 故意让用例失败，用 trace 逐步回放定位原因。 |
| [Playwright Codegen](https://playwright.dev/docs/codegen) | 官方文档 | English | 入门 | 录制操作生成脚本，再手工改成稳定定位器。 |
| [Playwright 网络](https://playwright.dev/docs/network) | 官方文档 | English | 进阶 | 用路由拦截 mock 接口，覆盖错误响应场景。 |
| [Playwright UI 模式](https://playwright.dev/docs/test-ui-mode) | 官方文档 | English | 入门 | 用 UI 模式查看时间线与观察选择器。 |
| [Playwright 源码仓库](https://github.com/microsoft/playwright) | 源码 | English | 深入 | 阅读 issues 与发布说明了解行为变化。 |
| [Cypress 为什么选](https://docs.cypress.io/app/get-started/why-cypress) | 官方文档 | English | 入门 | 了解它的运行架构与 Playwright 的差异。 |
| [Cypress 最佳实践](https://docs.cypress.io/app/core-concepts/best-practices) | 官方文档 | English | 进阶 | 对照列表检查选择器与测试隔离。 |
| [Cypress 组件测试](https://docs.cypress.io/app/component-testing/get-started) | 官方文档 | English | 进阶 | 为一个组件写挂载测试。 |
| [WebdriverIO 入门](https://webdriver.io/docs/gettingstarted) | 官方文档 | English | 进阶 | 了解基于 WebDriver 协议的方案。 |
| [Storybook 文档](https://storybook.js.org/docs) | 官方文档 | English | 入门 | 为项目安装 Storybook 并为三个组件写故事。 |
| [Storybook 教程](https://storybook.js.org/tutorials/) | 官方教程 | English | 入门 | 选与自己框架匹配的教程做完。 |
| [Intro to Storybook（React）](https://storybook.js.org/tutorials/intro-to-storybook/react/en/get-started/) | 官方教程 | English | 入门 | 跟着教程建立 UI 组件开发与测试工作流。 |
| [Chromatic 文档](https://www.chromatic.com/docs/) | 产品文档 | English | 进阶 | 了解基于 Storybook 的视觉回归流程。 |
| [Lost Pixel](https://github.com/lost-pixel/lost-pixel) | 开源工具 | English | 进阶 | 自建视觉回归检查，与 Chromatic 对比。 |
| [WebDriver 规范](https://www.w3.org/TR/webdriver2/) | 规范 | English | 深入 | 了解浏览器自动化协议的标准。 |

## Mock 与契约测试

!!! tip "这一组怎么学"
    先用 MSW 在测试与开发环境里统一拦截接口（约 3 小时），让同一套 handlers 同时服务单元测试与浏览器开发。多团队协作时再读 Pact 的契约测试概念。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MSW 文档](https://mswjs.io/docs/) | 官方文档 | English | 入门 | 读核心概念，理解在网络层拦截请求的方式。 |
| [MSW 快速开始](https://mswjs.io/docs/getting-started) | 官方教程 | English | 入门 | 为一个页面写 handlers 并在测试中复用。 |
| [Pact 文档](https://docs.pact.io/) | 官方文档 | English | 深入 | 读消费者驱动契约的流程，评估是否适合团队。 |
| [Pactflow：什么是契约测试](https://pactflow.io/blog/what-is-contract-testing/) | 文章 | English | 进阶 | 读完说明契约测试与端到端测试的区别。 |
| [Martin Fowler：微服务测试](https://martinfowler.com/articles/microservice-testing/) | 文章 | English | 深入 | 理解各层测试策略，对应到前端调用后端的场景。 |

## 线上监控与可观测性

!!! tip "这一组怎么学"
    先在项目接入 Sentry，上传 sourcemap 并触发一次真实错误，确认能看到还原后的堆栈（约 3 小时）。再读 OpenTelemetry 的可观测性概念，了解追踪、指标、日志三类数据。有预算时对比 Datadog RUM 与 Grafana Faro 的会话与性能能力。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Sentry JavaScript 文档](https://docs.sentry.io/platforms/javascript/) | 产品文档 | English | 入门 | 接入 SDK 并产生一次错误上报。 |
| [Sentry React 指南](https://docs.sentry.io/platforms/javascript/guides/react/) | 产品文档 | English | 入门 | 配置错误边界并验证组件栈信息。 |
| [Sentry Sourcemaps](https://docs.sentry.io/platforms/javascript/sourcemaps/) | 产品文档 | English | 进阶 | 在构建流程中上传 sourcemap 并验证堆栈还原。 |
| [Sentry 会话回放](https://docs.sentry.io/product/session-replay/) | 产品文档 | English | 进阶 | 理解回放如何录制 DOM，注意隐私遮罩配置。 |
| [OpenTelemetry JS 文档](https://opentelemetry.io/docs/languages/js/) | 官方文档 | English | 进阶 | 在一个 Node 服务里接入自动埋点并输出 span。 |
| [可观测性入门](https://opentelemetry.io/docs/concepts/observability-primer/) | 官方文档 | English | 入门 | 弄清追踪、指标、日志的定义与关系。 |
| [Datadog 浏览器 RUM](https://docs.datadoghq.com/real_user_monitoring/browser/) | 产品文档 | English | 进阶 | 了解 RUM 采集的会话、资源与错误数据模型。 |
| [Grafana 前端可观测性](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/) | 产品文档 | English | 进阶 | 读接入流程，与其他 RUM 产品比较。 |
| [Grafana Faro Web SDK](https://github.com/grafana/faro-web-sdk) | 开源 SDK | English | 进阶 | 阅读源码里的采集实现，学习自建监控思路。 |
| [rrweb](https://github.com/rrweb-io/rrweb) | 开源库 | English | 深入 | 读 README 与原理，理解 DOM 序列化与回放。 |
| [PostHog 文档](https://posthog.com/docs) | 产品文档 | English | 进阶 | 了解产品分析、会话回放与功能开关的集成。 |
| [Reporting API（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/Reporting_API) | 参考文档 | English | 进阶 | 用它收集 CSP 违规与弃用报告。 |
| [Google SRE：监控分布式系统](https://sre.google/sre-book/monitoring-distributed-systems/) | 在线书章 | English | 深入 | 读四个黄金信号，思考前端对应的指标。 |
| [web-vitals 库](https://github.com/GoogleChrome/web-vitals) | 开源库 | English | 进阶 | 把指标上报与错误监控放在同一个看板上。 |
