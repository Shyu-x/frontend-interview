---
title: 后端与数据库资料
description: Node.js 框架、ORM、SQL、事务、Redis、消息队列、部署与系统设计的官方文档与教程，每条资源附学习动作
---

# 后端与数据库资料

前端同学进入后端，建议顺序：Node.js 与一个框架，SQL 与一个 ORM，缓存与队列，再到部署和系统设计。

所有链接均已检查可访问。语言标签为资料正文语言；级别：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## Node.js 与后端框架

!!! tip "这一组怎么学"
    第 1 周：读 Node.js Learn，用 Express 或 Hono 写一个带路由、校验与错误处理的 CRUD 服务。第 2 周：换成 Fastify 或 NestJS，体会插件与依赖注入的差异。
    练习：实现待办 API，含登录、分页与统一错误格式。
    预期耗时：约 2 周。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Node.js Learn](https://nodejs.org/en/learn) | 官方教程 | English | 入门 | 读完 Getting Started 并运行 HTTP 服务示例。 |
| [Node.js 简介](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs) | 官方教程 | English | 入门 | 读后说明事件循环对并发的影响。 |
| [Express](https://expressjs.com/) | 官方文档 | English | 入门 | 写路由与中间件，实现统一错误处理中间件。 |
| [Fastify 文档](https://fastify.dev/docs/latest/) | 官方文档 | English | 进阶 | 用 JSON schema 做请求校验并体验插件机制。 |
| [Hono 文档](https://hono.dev/docs/) | 官方文档 | English | 入门 | 同一份代码部署到 Node 与 Cloudflare Workers。 |
| [NestJS 文档](https://docs.nestjs.com/) | 官方文档 | English | 进阶 | 按 Overview 建模块、控制器与服务，理解依赖注入。 |
| [roadmap.sh 后端路线](https://roadmap.sh/backend) | 路线图 | English | 入门 | 标出已会节点，列出接下来四周计划。 |
| [The Twelve-Factor App](https://12factor.net/) | 方法论 | English | 进阶 | 逐条检查你的服务，尤其配置与日志。 |
| [Prisma 文档](https://www.prisma.io/docs) | 官方文档 | English | 入门 | 定义 schema、迁移并完成关联查询。 |
| [Drizzle 文档](https://orm.drizzle.team/docs/overview) | 官方文档 | English | 进阶 | 用 Drizzle 写同一查询，对比与 SQL 的接近程度。 |

## SQL 与数据库原理

!!! tip "这一组怎么学"
    第 1 周：SQLBolt 或廖雪峰 SQL 教程做完全部练习。第 2 周：PostgreSQL Tutorial 学联表与窗口函数，Use The Index Luke 学索引。之后读事务隔离与 Jepsen。
    练习：为订单系统设计表，写 5 条带 JOIN 与聚合的查询并用 EXPLAIN 看计划。
    预期耗时：3 到 4 周。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [SQLBolt](https://sqlbolt.com/) | 交互课程 | English | 入门 | 一天内做完全部练习。 |
| [廖雪峰 SQL 教程](https://liaoxuefeng.com/books/sql/introduction/) | 教程 | 中文 | 入门 | 跟着章节在本地数据库逐条运行。 |
| [Mode SQL Tutorial](https://mode.com/sql-tutorial) | 教程 | English | 入门 | 完成 Advanced 部分的窗口函数练习。 |
| [PostgreSQL 官方教程](https://www.postgresql.org/docs/current/tutorial.html) | 官方文档 | English | 进阶 | 按教程建库建表并做查询。 |
| [PostgreSQL 事务隔离](https://www.postgresql.org/docs/current/transaction-iso.html) | 官方文档 | English | 进阶 | 开两个 psql 会话复现不可重复读与幻读。 |
| [roadmap.sh SQL 路线](https://roadmap.sh/sql) | 路线图 | English | 入门 | 对照标出尚未学过的概念。 |
| [Use The Index, Luke](https://use-the-index-luke.com/) | 在线书 | English | 进阶 | 读 Anatomy of an Index，并在自己的表上建索引对比。 |
| [小林 coding：图解 MySQL](https://xiaolincoding.com/mysql/) | 图解教程 | 中文 | 进阶 | 读索引、事务与锁章节，回答 MVCC 如何实现。 |
| [Jepsen 一致性模型图](https://jepsen.io/consistency) | 参考图 | English | 深入 | 查隔离级别与一致性模型的包含关系。 |
| [Designing Data-Intensive Applications](https://dataintensive.net/) | 书籍 | English | 深入 | 先读复制与事务章节，为每章写一页笔记。 |
| [Redis 文档](https://redis.io/docs/latest/) | 官方文档 | English | 入门 | 逐个试用数据类型并实现一个排行榜。 |
| [Redis University](https://university.redis.io/) | 免费课程 | English | 入门 | 完成入门课程并获取证书测验。 |
| [Redis Learn](https://redis.io/learn) | 教程 | English | 进阶 | 选缓存与会话示例做一遍。 |
| [小林 coding：图解 Redis](https://xiaolincoding.com/redis/) | 图解教程 | 中文 | 进阶 | 读缓存雪崩、穿透、击穿并说明对策。 |
| [AWS 缓存最佳实践](https://aws.amazon.com/caching/best-practices/) | 指南 | English | 进阶 | 总结缓存策略对比表，为你的接口选择方案。 |

## 消息队列与异步任务

!!! tip "这一组怎么学"
    先用 BullMQ 实现邮件发送队列（半天），再读 RabbitMQ 教程理解交换机与路由，最后读 Kafka 简介理解日志与分区。
    预期耗时：1 周。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [BullMQ 文档](https://docs.bullmq.io/) | 官方文档 | English | 入门 | 实现带重试与延迟的任务队列。 |
| [RabbitMQ 教程](https://www.rabbitmq.com/tutorials) | 官方教程 | English | 进阶 | 依次完成 Hello World 到 Topics 的教程。 |
| [Kafka 简介](https://kafka.apache.org/intro) | 官方文档 | English | 进阶 | 读后说明 topic、partition 与消费组的关系。 |

## 容器、部署与云

!!! tip "这一组怎么学"
    先把你的服务写成 Dockerfile 跑起来，再看 Kubernetes 基础教程，了解即可。Serverless 部分任选一个平台部署一个函数。
    预期耗时：1 周。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Docker Get Started](https://docs.docker.com/get-started/) | 官方教程 | English | 入门 | 把你的服务容器化并用 compose 连数据库。 |
| [Kubernetes Basics](https://kubernetes.io/docs/tutorials/kubernetes-basics/) | 官方教程 | English | 进阶 | 在在线终端完成部署与扩缩容练习。 |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/) | 官方文档 | English | 入门 | 部署一个 Hono 应用到 Workers。 |
| [Vercel 文档](https://vercel.com/docs) | 官方文档 | English | 入门 | 部署带 API Route 的项目并配置环境变量。 |
| [AWS Lambda 开发者指南](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html) | 官方文档 | English | 进阶 | 创建一个函数并配置触发器。 |

## 系统设计与后端安全

!!! tip "这一组怎么学"
    先读 system-design-primer 的基础概念，再用 ByteByteGo 与 Hello Interview 的案例练习：每周设计一个系统（短链接、聊天室、限流器），画图并估算容量。安全部分用 OWASP 清单检查自己的服务。
    预期耗时：6 周，每周 3 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [system-design-primer](https://github.com/donnemartin/system-design-primer) | 开源教程 | English | 进阶 | 读基础部分，完成其中一个设计题。 |
| [system-design-101](https://github.com/ByteByteGoHq/system-design-101) | 图解 | English | 入门 | 每天看一张图，用自己的话复述。 |
| [ByteByteGo](https://bytebytego.com/) | 课程与博客 | English | 进阶 | 读系统设计案例并先自己画图再对照。 |
| [Hello Interview System Design](https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction) | 教程 | English | 进阶 | 读解题框架，套用到一道题。 |
| [High Scalability](https://highscalability.com/) | 博客 | English | 进阶 | 选一篇公司架构文章，总结扩展手段。 |
| [awesome-scalability](https://github.com/binhnguyennus/awesome-scalability) | 资源清单 | English | 进阶 | 选一个你熟悉公司的文章细读。 |
| [roadmap.sh 系统设计路线](https://roadmap.sh/system-design) | 路线图 | English | 入门 | 标出需补的概念并排期。 |
| [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x00-header/) | 安全清单 | English | 进阶 | 逐条审查你的 API 并写修复项。 |
| [OWASP Top Ten](https://owasp.org/www-project-top-ten/) | 安全清单 | English | 入门 | 读十类风险并为注入类写一个防御示例。 |
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | 速查表 | English | 进阶 | 查 Authentication 与 Session 速查表核对实现。 |
| [JavaGuide](https://javaguide.cn/) | 知识库 | 中文 | 入门 | 读高并发与分布式章节补系统设计概念。 |
