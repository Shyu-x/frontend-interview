---
title: MCP 服务器生态：选择实现并核对协议版本
description: "选服务器时，先确定你的客户端支持哪种协议和传输，再验证所需的工具。下载量、截图和工具名字不能证明互通。尤其不要把 SDK 包版本当成协议版本。一个 SDK 可以支持多版协议，一个已经运行的服务器也可能只支持旧版初始化。"
tags: [ai-agent, mcp, open-source]
date: 2026-10-13
level: advanced
prerequisites: [Promise 与 async/await, JSON 对象与输入校验]
runnable: false
tested_with: [node@24.16.0]
verified_at: 2026-10-13
verified_scope: "仅核对本次新增手写章节及明确的协议更正；旧例的运行状态不扩展为全页验证。"
source_commit: c1a7d0be48d2601aa4d71b303fbc08921e77235d
---

# MCP 服务器生态：选择实现并核对协议版本

## 用探测程序选择兼容的服务器 {#handwrite-server-selection}


本节对照[官方资料](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)核对 MCP 2026-07-28 versioning。
完整实现与行为测试在 [mcp-mini.mjs](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.mjs) 和 [测试文件](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.test.mjs)。从仓库根目录运行 node --test scripts/implementation-labs/agent/mcp-mini.test.mjs。

选服务器时，先确定你的客户端支持哪种协议和传输，再验证所需的工具。下载量、截图和工具名字不能证明互通。尤其不要把 SDK 包版本当成协议版本。一个 SDK 可以支持多版协议，一个已经运行的服务器也可能只支持旧版初始化。探测结果应该记录具体版本、工具 schema 和错误，而不是简单保存一个 connected 布尔值。

```pseudocode
probe(server, clientSupportedVersions):
    response = sendDiscover(preferredVersion)
    if response is UnsupportedProtocolVersionError:
        choices = intersect(response.supported, clientSupportedVersions)
        if choices is empty: reportIncompatibleVersions()
        else retryDiscover(selectVersion(choices))
    else if response is DiscoverResult:
        verifyResultTypeAndSupportedVersions(response)
        verifyRequiredServerCapabilities(response)
        tools = requestToolsListWithChosenVersion()
        verifyRequiredToolNamesAndSchemas(tools)
        runReadOnlySmokeCall()
    else:
        if explicitLegacySupportEnabled: probeLegacyLifecycle()
        else reportUnsupportedServerEra()
```

先计算版本交集。收到 -32022 已经说明对方理解现代协议，不应该转去 initialize。只有支持双时代的客户端，才按规范指定的传输探测规则回退旧生命周期。stdio 超时与 HTTP 错误不能粗暴使用同一判定；HTTP 还要读错误体，区分现代方法不存在和旧端点不存在。

工具列表只证明服务端描述了能力。再检查参数约束、必要授权和返回数据。用只读调用做烟雾测试，避免为了验证连接就创建资源或删除文件。把读调用返回的版本与错误记录下来，升级客户端后重放同一组探测。

本仓库 A001/A002 提供可运行的现代子集，用它练习 discover、工具列表与 HTTP 失败。未做第三方 SDK 互通测试时，不要写成“支持所有宿主”。任务、MCP Apps 和其他扩展还需双方声明兼容能力。服务器目录变化很快，这一节固定的是选择方法和 2026-07-28 协议边界，不维护一个永远最新的排行榜。

挑选 MCP server 时，先记录它暴露的能力、传输方式、认证边界和明确支持的协议版本。仓库活跃度、语言或工具数量不能替代协议兼容性检查；尤其不要把 2025 版初始化握手误当成 2026-07-28 必需步骤。

## 先看兼容性证据

对于目标服务器，逐项确认以下内容：

1. 它是否支持所用版本的 `server/discover`？2026-07-28 的服务器必须能发现自身版本和能力。
2. 每个请求是否携带 `_meta` 中的版本与客户端能力？客户端和服务端不能依赖连接状态保存协商结果。
3. `tools/list`、`resources/list` 或 `prompts/list` 的返回是否含 `ttlMs` 和 `cacheScope`？客户端不得自选更宽的缓存范围。
4. HTTP 传输是否验证 `Mcp-Method`、`Mcp-Name` 等镜像头与请求体？本地服务器是否把 stdout 留给 stdio 帧？
5. 工具是否需要 OAuth、专属账号或外部服务？把凭据、写操作和数据范围列入接入审批。

旧版服务可能只理解 `initialize`、`notifications/initialized` 与 `Mcp-Session-Id`。这些是较早协议版本的迁移背景；不能把旧客户端能连接作为新版本合规证据。需要连接旧服务时，使用实现明确支持的版本/兼容模式，单独记录所用版本，并测试升级路径。

## 不用在线生态也能检查协议行为

仓库内的 [mcp-mini.mjs](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.mjs) 是一个无依赖教学服务。它不代表任何第三方仓库，不连接真实服务，也不实现完整 MCP；子集限制见 [集成页](mcp-integration.md#按职责读实现)。

```bash
node scripts/implementation-labs/agent/mcp-mini.test.mjs
```

命令会启动一个真实本地 HTTP 服务和 Node 子进程，通过发现、列表、错误分支与逐行 framing 检查请求路径。没有外部 API key、私有服务器或付费依赖。成功摘要含 `tests 109`、`pass 109`，并打印 `通过：107 项快捷行为检查（另有独立命名 test 场景；HTTP 与 stdio 均使用真实本地端点）`。这是本地子集测试，不是与第三方实现互通的证明。

## 自己接入一个服务器

先把连接信息写成一个审查表，而不是先复制启动配置：

| 检查项 | 要记录的值 | 拒绝接入的例子 |
| --- | --- | --- |
| 传输 | stdio / Streamable HTTP | 只写“远程”却无 endpoint 或进程命令 |
| 版本 | 明确 MCP 版本与兼容区间 | 只写“支持 MCP” |
| 方法 | 实际发现到的工具/资源/prompt | 依赖 README 推测运行时方法 |
| 数据权限 | 读写范围、认证主体、审批门 | token 放在命令参数或仓库文件 |
| 可观测性 | stderr、HTTP 错误体、请求 ID | 日志写入 stdio stdout |

本地 stdio server 以子进程环境接收凭据，不应使用 HTTP 授权规范代替本地密钥管理。远程 HTTP server 则按 MCP 的 HTTP 授权规范和自身资源策略实施访问控制；仅设置 Origin 检查不等于身份认证。

## OpenAI 产品连接时的两种路径

Responses API 的 MCP 工具可直接连接公开 HTTPS MCP server；私有、本机或内网 server 可通过 Secure MCP Tunnel，从内网发起到 OpenAI 的出站通道。Tunnel 需要自己的配置与身份，不是给 server 加一个公开 URL，也不应把 OpenAI 托管的 tunnel endpoint 填进 `server_url`。Agents API 的 MCP 会话连接配置与 Responses API 请求字段也不同，选运行时后按对应文档配置。

此选择信息核对自 [OpenAI MCP servers guide](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) 与 [Secure MCP Tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)。本页不枚举会变化的 GitHub 星数、排名或“最流行”清单；这些数据不构成协议质量证据。

## 验收

运行上述 Node 命令，检查 stdout 只有一行一个 JSON-RPC 响应；把请求元数据版本改成旧值，应观察到 `-32022`；把 `Mcp-Method` 改成与 body 不同的值，应观察 HTTP 400 与 `-32020`。测试结束会关闭本地监听器，子进程写入完成后退出。

## 深入阅读

- [MCP versioning and compatibility](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)：区分版本适用规则与旧协议迁移。
- [MCP overview](https://modelcontextprotocol.io/specification/2026-07-28/basic)：核对 stateless 请求和 `_meta` 字段。
- [OpenAI MCP servers](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)：查看 Responses API 远程 server、审批和隧道入口。
