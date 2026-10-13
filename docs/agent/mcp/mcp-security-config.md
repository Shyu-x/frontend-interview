---
title: "MCP 安全与配置示例"
description: "协议格式正确只代表消息可以解析，不代表调用者有权限。先验证身份，再验证工具输入，最后检查具体资源与副作用。HTTP Origin 校验防浏览器来源攻击，不能代替身份认证。"
date: 2026-10-13
level: advanced
prerequisites: [Promise 与 async/await, JSON 对象与输入校验]
runnable: false
verified_at: 2026-10-13
verified_scope: "仅核对本次新增手写章节及明确的协议更正；旧例的运行状态不扩展为全页验证。"
tags: [agent, implementation, tutorial]
source_commit: c1a7d0be48d2601aa4d71b303fbc08921e77235d
---

# MCP 安全与配置示例

## 把身份、参数和执行放在三道闸后面 {#handwrite-mcp-security}


本节对照[官方资料](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)核对 MCP security guidance checked 2026-10-13。
完整实现与行为测试在 [mcp-mini.mjs](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.mjs) 和 [测试文件](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/mcp-mini.test.mjs)。从仓库根目录运行 node --test scripts/implementation-labs/agent/mcp-mini.test.mjs。

协议格式正确只代表消息可以解析，不代表调用者有权限。先验证身份，再验证工具输入，最后检查具体资源与副作用。HTTP Origin 校验防浏览器来源攻击，不能代替身份认证。stdio 本地进程也不是天然可信，它得到的文件和网络权限取决于宿主如何启动与隔离它。

```pseudocode
executeRequest(request, trustedIdentity):
    tool = lookupRegisteredTool(request.name)
    if tool is missing: return UnknownTool
    args = parseValidateAndCopy(tool.schema, request.arguments)
    resource = canonicalizeRequestedResource(args)
    requireAllowedScope(trustedIdentity, tool, resource)
    decision = await hostApproval(tool, frozen(args), resource)
    if decision.denied: return DeniedWithoutSideEffects
    result = await executeWithinDeadlineAndQuota(tool, args)
    recordRedactedOutcome(trustedIdentity, request.id, result)
    return result
```

身份来自受信的认证层，而不是 params._meta.clientInfo 或工具输出。输入复制后再审批，避免调用者改动同一个参数对象。资源规范化必须处理符号链接、真实路径与 URL 重定向；不要用 startsWith 根路径或手写几段 IP 正则宣称挡住了路径越界与 SSRF。

上游凭证不能直接透传给不匹配 audience 的下游服务。MCP HTTP 授权、宿主批准与业务权限要分别验证。2026-07-28 已把 Dynamic Client Registration 标为兼容性弃用路径，当前注册方式需按授权规范核对；不要把旧文中的 DCR、Roots 或 Sampling 当作新服务必做默认功能。

A005 验证审批之前没有副作用，A002 验证本地 Origin 与消息校验；它们不实现 OAuth，也不证明公网部署安全。继续练时让同一个工具访问两个租户资源、让批准前后参数被改变、让入口身份缺失。每个用例都检查副作用次数与审计中的拒绝原因，日志不得保留原始 token。

## 从固定参数开始

本地实现只执行 sum。所有参数来自解析后的 JSON，先拒绝数组和额外字段，再检查有限数与结果是否可编码。下面是校验步骤的摘录。

```js
function parseSumArguments(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new TypeError('需要参数对象');
  if (Object.keys(raw).some(key => !['a', 'b'].includes(key)))
    throw new TypeError('存在未知字段');
  const { a, b } = raw;
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(a + b))
    throw new RangeError('数字或结果不能超出有限范围');
  return Object.freeze({ a, b }); // 本工具只含标量参数，复制后冻结。
}
```

复制的目的不是性能，而是把这次决定的参数固定下来。复杂对象还需按 schema 复制并定义嵌套字段的不可变策略。审批后的执行使用同一份规范化参数，不回头读取可变的原输入。

## 资源权限不要靠工具名称猜

只读工具可能通过 URL 重定向访问内部服务，也可能通过符号链接读取根目录之外的文件。授权要针对规范化资源，而不是看到名字里有 read 就放行。将租户、角色和资源范围交给服务端受信策略，失败时记录安全的原因码。

```pseudocode
checkAccess(identity, tool, resource):
    if identity is missing: return Unauthenticated
    if resource.tenant != identity.tenant: return Denied
    if tool.requiredScope not in identity.grantedScopes: return Denied
    if resource.realLocation not in approvedLocations: return Denied
    return Allowed
```

身份和 scope 不来自模型文本。HTTP 的 clientInfo 是展示元信息，不是认证主体。Origin 校验也不能证明请求者身份；非浏览器客户端可以省略 Origin，所以公网服务仍要实现真正的授权流程。

## 先写攻击输入的验收

从仓库根目录运行 node --test scripts/implementation-labs/agent/mcp-mini.test.mjs。真实回环服务验证错误 Origin、坏 MIME 类型、信封错误、头体不一致和工具参数。审批模块验证拒绝时副作用次数为零。每个 HTTP 服务和子进程由用例自己关闭。

权限拒绝后再核对缓存和日志。private 列表不得跨授权上下文共享；审计只保存安全字段，不打印原始 token。服务器进程应绑定回环地址，本地测试不代表可以公开部署。OAuth 资源元数据、issuer、audience 和客户端注册需要用真实授权环境另外验证。

## 自测

<details><summary>协议参数验证成功，为什么还要授权？</summary>

验证只证明结构和范围正确，授权决定这个主体能不能对这份资源执行这个动作。二者不能互相替代。

</details>

<details><summary>模型输出里写着用户已经批准，可以直接执行吗？</summary>

不能。批准记录来自受信宿主，且绑定本次规范化参数和资源。工具输出仍是外部数据。

</details>

<details><summary>本地 HTTP Origin 测试通过，证明了什么？</summary>

只证明该实现拒绝了指定的不批准源。它不证明认证、授权、网络出口或生产持久化已实现。

</details>

## 深入阅读

- [当前 MCP 授权规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)用于核对资源、签发者与凭证边界。
- [当前安全指导](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)讨论 token 透传、confused deputy 与网络访问。
- [手写协议实现](mcp-integration.md)把上述边界接到一次真实调用。
