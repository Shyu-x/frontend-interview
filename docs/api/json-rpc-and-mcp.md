---
title: JSON-RPC、LSP 与 MCP：从消息信封到无会话传输
description: "HTTP 头让代理不解析 JSON 也能看见方法名。但它不是第二份可以任意修改的事实。先从请求体读出方法、版本和适用的工具名称，再对照头部。两处不一致必须拒绝，不能让代理认为请求在读文件，后端却在执行写文件。"
tags: [api, json-rpc, mcp, protocol]
date: 2026-10-13
level: advanced
prerequisites: [Promise 与 async/await, JSON 对象与输入校验]
runnable: false
tested_with: [node@24.16.0]
verified_at: 2026-10-13
verified_scope: "仅核对本次新增手写章节及明确的协议更正；旧例的运行状态不扩展为全页验证。"
source_commit: c1a7d0be48d2601aa4d71b303fbc08921e77235d
---

# JSON-RPC、LSP 与 MCP：从消息信封到无会话传输

JSON-RPC 2.0 规定消息形状；LSP 与 MCP 在它上面规定各自的方法、状态和传输约束。先分清这三层，才能知道一个字段来自通用 JSON-RPC 还是特定应用协议。

## 1. JSON-RPC 消息的最小判断

请求包含 `jsonrpc: "2.0"`、字符串方法名和调用 ID。通用 JSON-RPC 允许但不推荐 null ID，MCP 额外禁止它。通知省略 ID，接收方不返回响应；成功响应包含 `result`，错误响应包含 `error`。ID 原样关联请求和响应。

```js
const request = { jsonrpc: '2.0', id: 7, method: 'sum', params: { a: 2, b: 3 } };
const response = { jsonrpc: '2.0', id: 7, result: 5 };
const notification = { jsonrpc: '2.0', method: 'log/event', params: { kind: 'start' } };
```

JSON-RPC 通用层不理解 `tools/call` 或 `textDocument/definition`。具体协议必须再定义方法名、参数 schema、错误语义和传输规则。

## 2. 相同信封不代表相同生命周期

LSP 与 MCP 都采用 JSON-RPC，但各自有独立的消息集合和版本规则。不要从“看起来都是请求/响应”推断一个协议的方法能用于另一个协议。错误码也属于具体协议语义：例如 MCP `2026-07-28` 分配 `-32020` 到 `-32022`，旧版 `-32002` 的 resource-not-found 语义已迁到 `-32602`；新服务不得继续发旧码。

## JSON-RPC 的 null ID 与批量 {#jsonrpc-batch}

通用 JSON-RPC 2.0 允许请求 ID 是字符串、数字或 null；null 不推荐，数字也不应带小数。没有 `id` 才是通知，服务端不得回复。JSON-RPC 批量顶层是非空数组，数组里的响应可能乱序，必须用每项 ID 配对；通知项不产出响应，如果整个数组都是通知，服务端不发空数组。

下面的函数展示通用 JSON-RPC 批量收集规则。它不代表 MCP 支持批量：MCP 当前 HTTP 每个 POST body 必须是单条 request 或 notification；MCP Request ID 也不能为 null。

```js
function collectBatchReplies(requests, route) {
  if (!Array.isArray(requests)) return route(requests);
  if (requests.length === 0) return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } };
  const replies = [];
  for (const request of requests) {
    const reply = route(request);
    if (reply !== undefined) replies.push(reply);
  }
  return replies.length ? replies : undefined;
}
const replies = collectBatchReplies([
  { jsonrpc: '2.0', id: null, method: 'legacyLookup' },
  { jsonrpc: '2.0', method: 'notify' },
], (request) => Object.hasOwn(request, 'id') ? { jsonrpc: '2.0', id: request.id, result: 'ok' } : undefined);
console.log(replies.map(({ id }) => id)); // [null]：保留通用 JSON-RPC 的 null ID，不创建通知响应
```

路由负责信封校验、通知不回包，以及为非法项生成错误响应。收集器只过滤没有响应的项，不能再次用原始输入是否有 ID 过滤，否则非法项的错误会消失，null 项还会触发异常。反例是 `requests.map(route)`，通知变成 undefined 项，整批通知还可能错误地回空数组。切到 MCP 时需额外应用它的 schema 与传输规定。

## MCP 2026-07-28 请求边界 {#mcp-2026-07-28}

這一版本移除了全局 `initialize` / `notifications/initialized` 流程和 `Mcp-Session-Id` 会话头。协议变为 stateless：即使请求复用同一 HTTP 连接或 stdio 进程，服务端也不得将之前请求的版本、能力或身份当成本次输入。

每个 MCP 请求必须在 `params._meta` 携带：

| 键 | 类型 | 本版要求 | 失败结果 |
| --- | --- | --- | --- |
| `io.modelcontextprotocol/protocolVersion` | string | 每个请求必须有 | 不支持版本时 `-32022` |
| `io.modelcontextprotocol/clientCapabilities` | object | 每个请求必须有 | 缺少字段按 `-32602` 处理；服务端需要未声明能力时 `-32021` |
| `io.modelcontextprotocol/clientInfo` | object | 可选；客户端宜每次发送 | 只用于展示或诊断，不能用于安全授权 |

服务端必须支持 `server/discover`。成功 JSON-RPC 结果须包含 `resultType: "complete"`；`tools/list`、`resources/list`、`prompts/list` 等列表结果要声明 `ttlMs` 和 `cacheScope`。新协议定义的错误码中，`-32020` 是 HTTP header 与 body 不一致，`-32021` 是缺少必需客户端能力，`-32022` 是不支持的协议版本。

`subscriptions/listen` 是订阅与通知的新模式名；`input_required` 用于服务端还需要客户端输入的多往返结果。Tasks 属于 opt-in extension，不是核心方法。JSON Schema 默认方言为 2020-12；实现不可自动访问网络解析 `$ref`，并应限制组合 schema 的深度和验证成本。

## stdio 按字节流分帧 {#stdio-framing}

stdio 用换行分隔 JSON-RPC 帧。它不是 `Content-Length` 协议；也不能假设一次操作系统 `data` 回调正好对应一条消息。先用增量 UTF-8 解码，再按换行切帧，并对单帧设字节上限。stdout 只留协议帧，日志写 stderr。字节解码必须跨 chunk 保留 UTF-8 残留；若每个 chunk 独立 `toString()`，一个汉字拆在两个字节块中会变成替代字符。

仓库内实现采用 `StringDecoder` 处理多字节字符被拆在不同 chunk 中的情况，并拒绝过长帧和结束时仍未闭合的半帧。按步骤先运行回环测试，再看 `createLineDecoder.push()` 如何积累剩余字节、解析换行、校验每帧字节上限，最后由 `end()` 拒绝不完整尾帧。运行方式：

```bash
node scripts/implementation-labs/agent/mcp-mini.test.mjs
```

这条命令无需安装包或 API key；它启动真实 Node 子进程，检查两条请求和两条按 ID 对应的响应。源码见 [mcp-mini.mjs](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.mjs)，测试见 [mcp-mini.test.mjs](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.test.mjs)。

## 先验证 HTTP，再派发协议方法 {#http-mcp-headers}


本节对照[官方资料](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)核对 MCP 2026-07-28 HTTP binding。
完整实现与行为测试在 [mcp-mini.mjs](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.mjs) 和 [测试文件](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.test.mjs)。从仓库根目录运行 node --test scripts/implementation-labs/agent/mcp-mini.test.mjs。

HTTP 头让代理不解析 JSON 也能看见方法名。但它不是第二份可以任意修改的事实。先从请求体读出方法、版本和适用的工具名称，再对照头部。两处不一致必须拒绝，不能让代理认为请求在读文件，后端却在执行写文件。这里实现本地 JSON 响应路径，不宣称实现全部 Streamable HTTP 客户端能力。

```pseudocode
handlePost(request):
    rejectInvalidOriginWith403()
    requirePostAndJsonMimeType()
    requireAcceptJsonAndEventStream()
    bytes = readBodyWithinByteLimit()
    message = parseJsonOrReturnParseError()
    validateObjectAndJsonRpcEnvelope(message)
    requirePerRequestMetadata(message)
    if routingHeadersDoNotMatch(message):
        return http400(error(-32020, readableId(message)))
    response = dispatch(message)
    if response.error.code == -32601: return http404(response)
    if response.error.code in [-32600, -32602, -32021, -32022]:
        return http400(response)
    return http200(response)
```

校验顺序决定诊断是否准确。合法 JSON null 是信封错误，不是解析错误。字段缺失和字段不同也要区分。Content-Type 先去掉参数再匹配 application/json，不能用字符串前缀接收 application/json-malicious。Origin 要解析并匹配批准源，解析失败直接拒绝，不能让异常逃出请求处理器。

Mcp-Name 针对 tools/call、resources/read、prompts/get 镜像 name 或 uri。本课的 sum 名称只用 ASCII。推广到非 ASCII 名称时，要实现规范的名称编码规则，不要直接塞进 HTTP 头。当前客户端虽然发出规定的 Accept，却只解析教学服务器的 JSON 响应；通用客户端还必须处理 SSE 请求响应流。

再写三组反例。保留 body 的 server/discover，只把头改成 tools/list，应得到 400 与 -32020。用正确头请求未知方法，应得到 404 与 -32601。把 JSON 改成半个花括号，应得到 -32700；去掉可读 ID 的错误不能伪造一个 null MCP ID。A002 的真实回环请求检查这些边界，A003 另外检查 stdio 分块。源码与测试见本页链接的 mcp-mini 模块。
## 旧版本迁移对照 {#mcp-legacy-migration}

| 2025-era 实现常见写法 | 2026-07-28 写法 |
| --- | --- |
| 一次 `initialize` 协商整个连接 | 每个请求在 `_meta` 提供版本与客户端能力 |
| `notifications/initialized` 作为握手结束标志 | 移除该生命周期步骤 |
| 通过 `Mcp-Session-Id` 关联会话 | 核心请求无会话；显式 ID 才能承载跨请求应用状态 |
| `tools/list` 仅有工具数组 | 加 `ttlMs`、`cacheScope` 等列表缓存政策 |
| 任意成功结果对象 | 带 `resultType`，通常为 `complete` |
| `-32002` 表示 resource not found | 新版本用 `-32602`；旧码只作迁移兼容读取 |

如果旧客户端或服务只支持旧协议，应固定旧版本并做显式兼容测试，不要把旧流程混进新版消息示例。

## 测试的子集与边界

测试脚本通过 `node --test` 暴露 109 个命名场景和 107 项快捷行为检查，另有用于关联字段、Promise 结算与清理的辅助断言；覆盖请求元数据、server discovery、三类列表缓存字段、工具参数拒绝、能力错误、版本错误、HTTP 头体一致性、真实 HTTP 往返、UTF-8 分片、EOF 半帧、帧大小和真实子进程。它没有验证官方完整 conformance suite；也未验证可选资源读取、prompt 获取、订阅、MRTR、任务、授权、SSE、取消与完整 JSON Schema dialect。因此通过测试只能说明这个教学子集的行为被验证。

## 运行与验收

仓库根目录执行：`node --test scripts/implementation-labs/agent/mcp-mini.test.mjs`。通过阈值为 109 个命名场景全部通过。头体错误检查 `validateHttpHeaders`；分帧问题检查 `createLineDecoder`；并发调用检查 `RpcClient` 的 ID Map；子进程卡住则检查 stdout/stderr 通道与结尾换行。脚本关闭回环 HTTP 监听器并等待子进程退出。

## 深入阅读

- [JSON-RPC 2.0 specification](https://www.jsonrpc.org/specification)：读 request、notification 和 response 的通用消息约束。
- [MCP 2026-07-28 overview](https://modelcontextprotocol.io/specification/2026-07-28/basic)：读 stateless 请求和 `_meta`。
- [MCP tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)：读发现、工具缓存和调用结构。
- [MCP changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)：逐项核对迁移 breaking changes。
- [OpenAI MCP servers](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)：区分 Responses API 的远程 MCP 与 Secure MCP Tunnel。
