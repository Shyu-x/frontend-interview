---
title: MCP 集成：逐请求元数据与无会话服务
description: "先写一个只做加法的服务。我们要解决的不是模型推理，而是客户端怎样发现函数、怎样传参数、怎样把结果配回原来的调用。连接只负责传递消息。协议版本和客户端能力必须跟着每个请求走，不能保存在“已经握手”的连接变量里。"
tags: [ai-agent, mcp, protocol]
date: 2026-10-13
level: advanced
prerequisites: [Promise 与 async/await, JSON 对象与输入校验]
runnable: false
tested_with: [node@24.16.0]
verified_at: 2026-10-13
verified_scope: "仅核对本次新增手写章节及明确的协议更正；旧例的运行状态不扩展为全页验证。"
source_commit: c1a7d0be48d2601aa4d71b303fbc08921e77235d
---

# MCP 集成：逐请求元数据与无会话服务

这页按 `2026-07-28` 写一个可运行的 MCP 教学子集。它支持 `server/discover`、`tools/list`、`tools/call`，并留出空的 resources/prompts 列表；不支持认证、资源读取、提示获取、任务、订阅、扩展、分页或完整 JSON Schema 校验，不能称为完整 MCP 实现。

## 从一次调用写出服务端 {#mcp-2026-07-28}


本节对照[官方资料](https://modelcontextprotocol.io/specification/2026-07-28/basic)核对 MCP 2026-07-28。
完整实现与行为测试在 [mcp-mini.mjs](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.mjs) 和 [测试文件](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.test.mjs)。从仓库根目录运行 node --test scripts/implementation-labs/agent/mcp-mini.test.mjs。

先写一个只做加法的服务。我们要解决的不是模型推理，而是客户端怎样发现函数、怎样传参数、怎样把结果配回原来的调用。连接只负责传递消息。协议版本和客户端能力必须跟着每个请求走，不能保存在“已经握手”的连接变量里。下面的代码是完整实现中的分段摘录，完整方法分发、校验和错误处理都在本页链接的源码中。

### 先写消息，再写业务

```js
const versionKey = 'io.modelcontextprotocol/protocolVersion';
const capabilityKey = 'io.modelcontextprotocol/clientCapabilities';
const request = {
  jsonrpc: '2.0', id: 1, method: 'tools/call',
  params: {
    name: 'sum', arguments: { a: 2, b: 3 },
    _meta: { [versionKey]: '2026-07-28', [capabilityKey]: {} },
  },
};
```

先检查信封。ID 只能是字符串或整数，不能是 null。params 是对象。再检查 _meta 中的两个必需字段。空能力对象表示不提供可选客户端能力；tools 是服务端能力，不要虚构客户端 tools 标志。元数据通过后才判断工具名称和参数。

### 把发现结果和调用结果分开

```js
const discovery = {
  resultType: 'complete', supportedVersions: ['2026-07-28'],
  capabilities: { tools: {}, resources: {}, prompts: {} },
  ttlMs: 60_000, cacheScope: 'public',
  _meta: { 'io.modelcontextprotocol/serverInfo': {
    name: 'mini-agent-server', version: '1.0.0',
  } },
};
const result = {
  resultType: 'complete', content: [{ type: 'text', text: '5' }],
  structuredContent: { value: 5 }, isError: false,
};
```

server/discover 告诉客户端支持哪些版本。tools/list 另外返回工具的 inputSchema、缓存寿命和范围。tools/call 才执行加法。客户端收到响应后按同一个 ID 结算 Promise，不按到达顺序结算。列表缓存的 public/private 不等于调用权限，执行之前仍要重新校验。

最后写失败路径。缺元数据用 -32602，不支持版本用 -32022，并附上 supported 与 requested。未知方法用 -32601。结果必须可编码成 JSON，两个有限数相加仍可能溢出，不能让 Infinity 被序列化成 null。先测试这些输入，再把传输接上。

从仓库根目录运行 node --test scripts/implementation-labs/agent/mcp-mini.test.mjs。A001 验证发现、调用、元数据缺失和版本不支持；端到端用例另启动真实 HTTP 服务与子进程。旧 initialize、notifications/initialized 和 Mcp-Session-Id 仅用于旧协议迁移，当前实现不靠它们建立状态。此项目未实现授权、完整 JSON Schema、MRTR、订阅或扩展。
## 运行本地实现与测试

仓库源码：[mcp-mini.mjs](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.mjs)；测试：[mcp-mini.test.mjs](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.test.mjs)。工作目录为仓库根目录，不需安装包、密钥或付费 API。

```bash
node --test scripts/implementation-labs/agent/mcp-mini.test.mjs
```

预期摘要为 `tests 112`、`pass 112`，另有 107 项快捷行为检查的日志。快捷检查与独立 test 场景分开计数，总场景数由 Node test runner 给出。测试启动真实回环 HTTP 服务和 Node 子进程；第三方 SDK 的互通需要另做集成测试。

## 按职责读实现

`makeRequest` 把必需元数据放入每条请求的 `params._meta`。即使同一 stdio 进程连续处理两个调用，也分别检查元数据，避免把“进程还活着”误当成握手状态。

`dispatch` 处理四类本课方法。`server/discover` 是必须实现的发现入口；`tools/list` 固定返回排序稳定的工具描述、`ttlMs` 与 `cacheScope`；`tools/call` 再次验证参数并回传结构化结果。`resources/list` 和 `prompts/list` 只展示列表外形，不支持读取资源或获取 prompt。

`createMcpHttpServer` 按 HTTP 方法、JSON Content-Type、Origin、请求体大小、`Mcp-Method` 与 body 的一致性分层拒绝。`Mcp-Name` 在请求参数带 `name` 或 `uri` 时必须镜像对应值。头与 body 不一致返回 HTTP 400 和 `-32020`。教学服务器没有实现全部传输绑定头、认证挑战、SSE/流响应和扩展行为。

`createLineDecoder` 通过 UTF-8 `StringDecoder` 处理操作系统分块，按换行切帧并限制每帧大小。stdio 的 stdout 只写协议帧，异常诊断写 stderr；半帧 EOF 与超长帧直接失败，不会把残缺 JSON 当成完整请求。

## 手写并发 RPC 客户端 {#rpc-client-pending-map}

客户端可能同时发出 `tools/list` 与 `server/discover`，响应顺序不保证与请求顺序一致。用 `Map<id, pending>` 保存 resolve/reject 和计时器；接收响应时按 ID 找到 Promise。关闭连接时必须拒绝所有 pending 项，否则调用端会永久等待。

```js
class RpcClient {
  #send; #pending = new Map(); #nextId = 0; #closed = false;
  constructor(send) { this.#send = send; }
  request(method, params = {}, { timeoutMs = 1000 } = {}) {
    if (this.#closed) return Promise.reject(new Error('RPC client is closed'));
    const id = ++this.#nextId;
    const message = makeRequest(id, method, params); // 按请求写入 _meta
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.#pending.delete(id); reject(new Error(`request ${id} timed out`)); }, timeoutMs);
      this.#pending.set(id, { resolve, reject, timer });
      try { this.#send(message); } catch (error) { clearTimeout(timer); this.#pending.delete(id); reject(error); }
    });
  }
}
```

1. 先注册 ID，再发送消息，避免同步传输回调早于 Map 写入。
2. 超时只清理对应 ID；迟到的响应在 `accept()` 中因找不到 pending 项而被忽略。
3. `accept()` 按响应 ID 取出调用，清除计时器，成功结果 resolve，远端错误按 code reject。
4. `close()` 逐个拒绝剩余 Promise 并清空 Map；已完成和超时的调用不会重复结算。

失败例：如果只保存最后一个 `resolve`，并发的第二个请求会覆盖第一个；响应先后顺序一变，结果就会交给错误的调用。完整 `RpcClient` 还处理发送异常、错误数据和 close，见源码。测试以 ID 2 先返回、ID 1 后返回，验证两条 Promise 不串线。

## 手写 Streamable HTTP 客户端 {#http-client-send}

HTTP 客户端将传输头复制自 body，服务端再验证一致性。成功读取响应前检查 Content-Type、JSON-RPC 版本和响应 ID，错误状态也应保留服务器返回的 JSON-RPC error code。

```js
async function callMcpHttp(endpoint, method, params, id) {
  const body = makeRequest(id, method, params);
  const name = body.params.name ?? body.params.uri;
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream',
    'mcp-protocol-version': VERSION, 'mcp-method': method };
  if (name !== undefined) headers['mcp-name'] = String(name);
  const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.headers.get('content-type')?.startsWith('application/json')) throw new Error('unexpected response type');
  const message = await response.json();
  if (message.jsonrpc !== '2.0' || message.id !== id) throw new Error('response correlation failed');
  if (!response.ok || message.error) throw Object.assign(new Error(message.error?.message ?? `HTTP ${response.status}`), message.error);
  return message.result;
}
```

这段客户端发送的是实际 POST，不是假设 SDK API。工作方式按 4 步检查：组装每请求元数据；镜像方法、版本和适用的名称；发送规定的 Accept；最后核对响应 ID 和错误。客户端只解析 `application/json` 的本地教学服务器响应，并只接受 `resultType: complete`；虽然 Accept 声明也愿意接收 SSE，它没有 SSE parser，不能作为通用 Streamable HTTP 客户端。服务端负责 Origin 校验、body 限长和 HTTP 状态映射，不能因客户端头合法而省略。

## 失败时按证据定位

| 可观察结果 | 最可能的错误 | 检查位置 |
| --- | --- | --- |
| `-32602` | `_meta` 缺少版本或能力，或参数无效 | 请求体 `params._meta` 与方法参数 |
| `-32021` | 服务端需要客户端未声明的可选能力 | 例如 `elicitation.form`；`tools` 是服务端能力 |
| `-32022` | 每请求版本不是 `2026-07-28` | `protocolVersion` 与服务支持列表 |
| HTTP 400 / `-32020` | `Mcp-Method`、`Mcp-Name`、版本头与 JSON body 不一致 | HTTP headers/body |
| 客户端读到多余文本 | 服务端把日志打印到 stdout | 把日志改写到 stderr |
| stdio 一直等数据 | 没有换行结束帧，或进程没有 flush | 检查换行与写入流的结束条件 |
| 并发 RPC 结果串线 | 用单一回调变量保存未决请求 | 改用 ID 到 Promise 的 Map，并在超时/close 时清理 |

## 面试回答

**30 秒：**MCP 2026-07-28 是无会话协议；每个请求都带版本和能力元数据，服务端通过 `server/discover` 暴露自身能力，列表结果携带缓存 TTL 与范围。传输可复用连接，但不能把连接当成会话状态。

**2 分钟：**我会把每请求 `_meta`、方法分发和传输分开。HTTP 层先校验 JSON 类型、Origin 和镜像头，再交 JSON-RPC 路由；stdio 用换行分帧并保证 stdout 纯协议数据。测试要覆盖缺元数据、版本错误、能力缺失、头 body 不一致、拆包 UTF-8、无换行 EOF，以及真实子进程和回环 HTTP。简化实现必须声明未覆盖的 resources/prompts、授权、流、任务与 JSON Schema 行为，避免把教学子集称为合规服务器。

## 深入阅读

- [MCP 2026-07-28 overview](https://modelcontextprotocol.io/specification/2026-07-28/basic)：核对无状态、逐请求 `_meta`、结果类型与错误码。
- [MCP 2026-07-28 tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)：核对 `server/discover`、工具列表缓存字段与工具调用形状。
- [OpenAI MCP servers guide](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)：了解 Responses API 连接远程 MCP 与 Secure MCP Tunnel 的边界。
