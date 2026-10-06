---
title: API 设计与通信协议资料
description: REST、OpenAPI、GraphQL、gRPC、tRPC、实时通信、认证授权与 API 测试的规范、文档与教程，每条资源附学习动作
---

# API 设计与通信协议资料

先掌握 HTTP 语义与 REST 设计，再按项目需要选 GraphQL、gRPC 或类型安全 RPC，最后补认证授权与测试。

所有链接均已检查可访问。语言标签为资料正文语言；级别：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## REST 与 HTTP 语义

!!! tip "这一组怎么学"
    第 1 天：读阮一峰 RESTful 文章和 Richardson 成熟度模型建立概念。第 2 到 3 天：读 Microsoft 与 Zalando 指南，把你现有一个接口按指南改写。第 4 天起：查 RFC 9110 的方法与状态码语义，以及 RFC 9457 错误格式。
    练习：为"文章与评论"设计 8 个端点，写出路径、方法、状态码与错误响应。
    预期耗时：约 1 周，每天 1 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [理解 RESTful 架构（阮一峰）](https://www.ruanyifeng.com/blog/2014/05/restful_api.html) | 博客 | 中文 | 入门 | 读完后把你项目里的一个动词式 URL 改成资源式 URL。 |
| [Fielding 博士论文第 5 章 REST](https://roy.gbiv.com/pubs/dissertation/rest_arch_style.htm) | 论文 | English | 深入 | 只读第 5 章，列出六个架构约束并各写一句话解释。 |
| [Richardson Maturity Model（Martin Fowler）](https://martinfowler.com/articles/richardsonMaturityModel.html) | 文章 | English | 进阶 | 判断你现有 API 处于第几级，写出升一级要改什么。 |
| [Microsoft Web API Design 最佳实践](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design) | 设计指南 | English | 入门 | 对照清单检查你的命名、分页、版本策略并列出整改项。 |
| [Google API Improvement Proposals](https://google.aip.dev/) | 设计指南 | English | 进阶 | 读资源导向设计与标准方法（AIP-121、AIP-131 至 135），用于设计 CRUD。 |
| [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/) | 设计指南 | English | 进阶 | 读 Must 条目并整理成团队评审清单。 |
| [JSON:API 规范](https://jsonapi.org/) | 规范 | English | 进阶 | 阅读 Fetching Data 部分，实现 include 与 sparse fieldsets 一个示例。 |
| [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) | 规范 | English | 深入 | 查方法的幂等与安全性表，核对你的 PUT 与 PATCH 用法。 |
| [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) | 规范 | English | 进阶 | 把你的错误响应改成 problem+json 格式并更新前端处理。 |
| [roadmap.sh API 设计路线](https://roadmap.sh/api-design) | 路线图 | English | 入门 | 对照路线图标出尚未掌握节点，排入后续学习。 |
| [Stripe 速率限制设计](https://stripe.com/blog/rate-limiters) | 工程文章 | English | 进阶 | 读四种限流器，用令牌桶在 Node 里实现一个中间件。 |
| [Sam Newman：BFF 模式](https://samnewman.io/patterns/architectural/bff/) | 架构文章 | English | 进阶 | 画出你前端各端（Web 与移动）对应的 BFF 边界。 |
| [阮一峰：Fetch API 教程](https://www.ruanyifeng.com/blog/2020/12/fetch-tutorial.html) | 博客 | 中文 | 入门 | 用 fetch 对你设计的端点完成增删改查并处理错误状态。 |

## OpenAPI 与文档工具

!!! tip "这一组怎么学"
    先在 learn.openapis.org 理解结构，再为一个小接口手写 OpenAPI YAML，用 Scalar 或 Redocly 渲染成文档，最后接入 lint 和代码生成。
    预期耗时：2 到 3 天。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Learn OpenAPI](https://learn.openapis.org/) | 官方教程 | English | 入门 | 跟教程写出一份含 paths 与 schemas 的最小文档。 |
| [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) | 规范 | English | 深入 | 遇到 oneOf、callbacks 等细节时查阅规范对应章节。 |
| [Swagger 文档](https://swagger.io/docs/) | 官方文档 | English | 入门 | 用 Swagger Editor 粘贴你的 YAML，修正报错。 |
| [Scalar 文档](https://docs.scalar.com/) | 工具文档 | English | 进阶 | 用 Scalar 渲染你的 OpenAPI 文件，并启用在线调试。 |
| [Redocly 文档](https://redocly.com/docs/) | 工具文档 | English | 进阶 | 配置 Redocly lint 规则，把检查加入 CI。 |
| [AsyncAPI 文档](https://www.asyncapi.com/docs) | 规范与教程 | English | 进阶 | 为一个 WebSocket 或 MQTT 主题写 AsyncAPI 描述。 |
| [CloudEvents](https://cloudevents.io/) | 规范 | English | 进阶 | 把你的事件载荷改成 CloudEvents 信封格式。 |

## GraphQL

!!! tip "这一组怎么学"
    第 1 到 2 天：graphql.org Learn 学查询、变异与 Schema。第 3 到 5 天：用 GraphQL Yoga 或 Pothos 搭服务，用 Apollo 或 urql 写客户端。后续：了解 Relay 的分页与片段，学习 N+1 与 DataLoader。
    练习：为博客站点实现带分页与嵌套评论的 Schema。
    预期耗时：约 1 周。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [GraphQL Learn](https://graphql.org/learn/) | 官方教程 | English | 入门 | 按顺序读 Queries、Schemas 与 Execution，在 playground 执行查询。 |
| [GraphQL 规范](https://spec.graphql.org/) | 规范 | English | 深入 | 查阅 Execution 与 Validation 章节，理解错误传播规则。 |
| [Principled GraphQL](https://principledgraphql.com/) | 原则 | English | 进阶 | 读十条原则，对照你的 Schema 找违背之处。 |
| [Apollo 文档](https://www.apollographql.com/docs/) | 官方文档 | English | 进阶 | 在 React 项目里用 Apollo Client 实现查询与缓存更新。 |
| [urql 文档](https://commerce.nearform.com/open-source/urql/docs/) | 官方文档 | English | 进阶 | 对比 urql 与 Apollo 的缓存机制，写出选型笔记。 |
| [Relay 文档](https://relay.dev/docs/) | 官方文档 | English | 深入 | 读 Fragments 与分页章节，改写一个组件使用片段。 |
| [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server/docs) | 官方文档 | English | 进阶 | 用 Yoga 起一个服务并加入订阅功能。 |
| [Pothos](https://pothos-graphql.dev/docs) | 官方文档 | English | 进阶 | 用代码优先方式定义类型，体验端到端类型安全。 |
| [Hasura 文档](https://hasura.io/docs/) | 官方文档 | English | 进阶 | 连接一个 Postgres，自动生成 GraphQL API 并配置权限。 |

## RPC 与类型安全接口

!!! tip "这一组怎么学"
    全栈 TypeScript 项目先学 tRPC 或 Hono RPC（半天），跨语言服务学 Protobuf 加 gRPC 或 Connect（2 到 3 天）。每种方案都实现同一个"创建待办"接口，对比代码量和类型体验。
    预期耗时：约 1 周。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [tRPC 文档](https://trpc.io/docs) | 官方文档 | English | 入门 | 跟 Quickstart 建 router，在前端直接调用并观察类型提示。 |
| [ts-rest](https://ts-rest.com/) | 官方站点 | English | 进阶 | 定义共享 contract，同时给出 REST 服务端与客户端。 |
| [oRPC 文档](https://orpc.unnoq.com/docs/getting-started) | 官方文档 | English | 进阶 | 实现同一接口并与 tRPC 对比 OpenAPI 生成能力。 |
| [Hono RPC](https://hono.dev/docs/guides/rpc) | 官方文档 | English | 入门 | 用 hc 客户端调用 Hono 路由，体验类型共享。 |
| [gRPC 文档](https://grpc.io/docs/) | 官方文档 | English | 进阶 | 完成 Node 或 Go 的 Quick start 并实现一个流式方法。 |
| [gRPC 简介](https://grpc.io/docs/what-is-grpc/introduction/) | 官方文档 | English | 入门 | 读完说明四种调用模式的区别。 |
| [Protobuf proto3 指南](https://protobuf.dev/programming-guides/proto3/) | 语言指南 | English | 进阶 | 写一份含枚举与嵌套消息的 proto，并理解字段编号演进规则。 |
| [Connect RPC](https://connectrpc.com/docs/introduction) | 官方文档 | English | 进阶 | 在浏览器中直接调用 Connect 服务，不借助代理。 |
| [grpc-web](https://github.com/grpc/grpc-web) | 开源仓库 | English | 进阶 | 阅读 README 中代理要求，理解为何浏览器需要它。 |
| [JSON-RPC 2.0 规范](https://www.jsonrpc.org/specification) | 规范 | English | 入门 | 15 分钟读完，手写一个批量请求示例。 |
| [Model Context Protocol 简介](https://modelcontextprotocol.io/docs/getting-started/intro) | 协议文档 | English | 进阶 | 注意 MCP 基于 JSON-RPC，对照消息格式读一遍。 |
| [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) | 协议文档 | English | 深入 | 阅读 specification 的初始化流程，理解编辑器与服务器通信。 |
| [SOAP 1.2 Primer](https://www.w3.org/TR/soap12-part0/) | W3C 规范 | English | 进阶 | 读示例消息，了解遗留系统的信封结构。 |
| [WSDL 2.0 Primer](https://www.w3.org/TR/wsdl20-primer/) | W3C 规范 | English | 深入 | 只看示例章节，能读懂一份旧 WSDL 即可。 |

## 实时通信与事件

!!! tip "这一组怎么学"
    先用 SSE 实现单向推送（半天），再用 WebSocket 做双向聊天（1 天），学会心跳与重连。Webhook 单独练习签名校验与幂等。
    预期耗时：3 到 4 天。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [阮一峰：WebSocket 教程](https://www.ruanyifeng.com/blog/2017/05/websocket.html) | 博客 | 中文 | 入门 | 跟着示例写一个回显服务并在浏览器连接。 |
| [MDN WebSockets API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) | 参考文档 | English | 入门 | 实现带断线重连与心跳的客户端封装。 |
| [RFC 6455 WebSocket 协议](https://www.rfc-editor.org/rfc/rfc6455) | 规范 | English | 深入 | 阅读握手与帧格式章节，用抓包验证。 |
| [Socket.IO 文档](https://socket.io/docs/v4/) | 官方文档 | English | 进阶 | 实现房间与广播，了解它与原生 WebSocket 的差别。 |
| [WHATWG Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) | 规范 | English | 深入 | 查阅事件流格式与重连规则。 |
| [MDN 使用 SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) | 教程 | English | 入门 | 用 EventSource 实现通知推送。 |
| [MDN WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API) | 参考文档 | English | 进阶 | 读概念与示例，了解其相对 WebSocket 的优势。 |
| [W3C WebTransport](https://www.w3.org/TR/webtransport/) | 规范 | English | 深入 | 查阅流与数据报接口定义。 |
| [Stripe Webhooks](https://docs.stripe.com/webhooks) | 官方文档 | English | 进阶 | 实现签名校验并处理重复事件投递。 |
| [GitHub Webhooks 最佳实践](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks) | 官方文档 | English | 进阶 | 按清单检查你的接收端是否快速响应与校验密钥。 |
| [MQTT 入门](https://mqtt.org/getting-started/) | 官方文档 | English | 入门 | 用公共 broker 订阅并发布一个主题消息。 |

## 认证与授权

!!! tip "这一组怎么学"
    先读阮一峰的 OAuth 与 JWT 文章建立概念，再读 oauth.com 完整流程，然后实现一次授权码加 PKCE 登录。RFC 原文只在需要确认细节时查。
    预期耗时：约 1 周。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [OAuth 2.0 的一个简单解释（阮一峰）](https://www.ruanyifeng.com/blog/2019/04/oauth_design.html) | 博客 | 中文 | 入门 | 读完后画出四种授权模式的对比。 |
| [GitHub OAuth 第三方登录示例（阮一峰）](https://www.ruanyifeng.com/blog/2019/04/github-oauth.html) | 教程 | 中文 | 入门 | 照着实现一个 GitHub 登录。 |
| [JWT 入门教程（阮一峰）](https://www.ruanyifeng.com/blog/2018/07/json_web_token-tutorial.html) | 博客 | 中文 | 入门 | 手动解码一个 JWT 并说明三部分含义。 |
| [OAuth 2.0 Simplified](https://www.oauth.com/) | 在线书 | English | 进阶 | 读授权码与 PKCE 章节，再对照一个真实登录请求。 |
| [oauth.net OAuth 2.0](https://oauth.net/2/) | 资源站 | English | 进阶 | 浏览扩展规范列表，了解 DPoP 与 Token Exchange 等。 |
| [oauth.net OAuth 2.1](https://oauth.net/2.1/) | 资源站 | English | 进阶 | 阅读与 2.0 的差异，把隐式模式从你的方案中去掉。 |
| [RFC 6749 OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749) | 规范 | English | 深入 | 阅读授权码流程章节并核对你的实现。 |
| [RFC 7636 PKCE](https://www.rfc-editor.org/rfc/rfc7636) | 规范 | English | 深入 | 实现 code_verifier 与 challenge 的生成。 |
| [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html) | 规范 | English | 深入 | 阅读 ID Token 校验步骤并实现校验。 |
| [How OpenID Connect Works](https://openid.net/developers/how-connect-works/) | 官方介绍 | English | 入门 | 读后说明 OIDC 与 OAuth 的分工。 |
| [RFC 7519 JWT](https://www.rfc-editor.org/rfc/rfc7519) | 规范 | English | 深入 | 查 claims 定义，实现 exp 与 aud 校验。 |
| [jwt.io Introduction](https://jwt.io/introduction) | 教程 | English | 入门 | 用在线调试器修改 payload，观察签名失效。 |
| [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x00-header/) | 安全清单 | English | 进阶 | 逐条检查你的 API，重点查对象级授权。 |

## API 测试与调试

!!! tip "这一组怎么学"
    先用 Postman 或 Hurl 手工验证接口，再用 MSW 在前端测试里模拟，最后用 Pact 做契约测试、k6 做压测。
    预期耗时：3 天。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Postman Learning Center](https://learning.postman.com/docs/introduction/overview/) | 官方文档 | English | 入门 | 建一个 Collection 并写 3 个测试断言。 |
| [Hurl 文档](https://hurl.dev/docs/manual.html) | 官方文档 | English | 进阶 | 用纯文本文件写接口测试并在 CI 运行。 |
| [MSW 文档](https://mswjs.io/docs/) | 官方文档 | English | 进阶 | 在组件测试中用 MSW 模拟一个失败响应。 |
| [Pact 文档](https://docs.pact.io/) | 官方文档 | English | 深入 | 写一个消费者契约并在提供方验证。 |
| [k6 文档](https://grafana.com/docs/k6/latest/) | 官方文档 | English | 进阶 | 写一个 50 并发持续 1 分钟的脚本并读报告。 |
