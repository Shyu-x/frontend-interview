---
title: 把原理串成可以交付的代码
description: 从订单搜索、离线笔记和工具助手三个完整场景出发，把页面交互、并发、缓存、协议、权限和资源清理串起来。先确定可观察结果，再选择状态与数据结构，逐步写出正常路径和失败路径，用仓库内的手写实现与测试检查每一层。
tags: [coding, implementation, systems, practice]
date: 2026-10-13
level: intermediate
prerequisites:
  - 能用 async/await 写请求，并解释 Promise 的失败传播
  - 能运行 node --test，并看懂断言失败的位置
runnable: false
verified_at: 2026-10-14
verified_scope: 三个项目蓝图、学习链接及 MCP 2026-07-28 范围，不宣称完整项目已部署。
source_commit: c1a7d0be48d2601aa4d71b303fbc08921e77235d
---

# 把原理串成可以交付的代码

先挑一个场景。把它写到失败后也能收拾干净，再换下一个。

下面的状态机是项目设计用的伪代码。它们不连接真实订单、数据库或模型。完整的小实现和自动测试在各节的链接里。不要把一个模拟器通过测试，理解成浏览器、分布式服务或第三方协议全部通过验收。

## 订单搜索不只是一个 fetch {#orders}

用户输入关键词，服务器返回分页结果。最早的版本只需要一个输入框和一条请求。再加三个条件，代码结构就会改变。

- 用户可以继续输入。旧响应不能覆盖新结果。
- 用户可能用输入法。候选字确认前不要把方向键当作选择订单。
- 用户可能离开页面。请求、订阅和监听必须结束。

先写出屏幕能显示的状态。不能用 `items.length === 0` 同时代表未查询和查无结果。

```js
const search = {
  generation: 0,
  phase: 'idle', // 另有 loading、ready、empty、failed
  query: '',
  items: [],
  error: null,
};
```

`generation` 表示哪次查询还拥有更新界面的资格。取消请求能省资源，但代次检查才决定结果能不能提交。两者不是同一件事。

再写事件处理。这里用伪代码展示先后关系，省掉具体视图库，但没有省略取消与清理的决策。

```pseudocode
onQueryConfirmed(text):
    generation = generation + 1
    mine = generation
    if activeRequest exists: cancel activeRequest
    query = text
    items = []
    error = null
    if trim(text) is empty:
        phase = idle
        return
    phase = loading
    activeRequest = startRequest(text)
    try:
        response = await activeRequest
        if disposed or mine != generation: return
        if response is not successful: throw HttpFailure(response.status)
        items = validateOrderRows(response.body)
        phase = empty if items is empty else ready
    catch failure:
        if disposed or mine != generation or failure is Cancellation: return
        error = failure
        phase = failed

onDispose():
    disposed = true
    generation = generation + 1
    if activeRequest exists: cancel activeRequest
    unsubscribeStore()
    removeKeyboardListeners()
```

先让 `old` 查询晚于 `new` 返回。检查最终屏幕仍然显示 `new`。再让用户在响应回来前离开。检查旧回调没有重新订阅，也没有恢复加载状态。

按层练习，不要一开始就堆框架。

| 这一层要写什么 | 从哪里动手 | 重点检查 |
| --- | --- | --- |
| XHR、fetch、取消与竞态 | [异步工作坊](workshop-web-async.md) | HTTP 失败不是正常业务数据 |
| 输入法与键盘选择 | [组合框状态机](../html/accessibility-aria-deep.md#handwrite-combobox-state) | composition 期间不吞掉输入法按键 |
| 稳定的数据快照 | [外部 store](../react/patterns/state-management.md#handwrite-stable-snapshot) | 没变的快照保持对象身份 |
| 分页缓存 | [缓存与工程实战](workshop-web-engineering.md) | 查询条件和身份进入正确的缓存键 |
| 边界数据校验 | [字段路径解析](../frameworks/forms-validation.md#handwrite-schema-parser) | 错误能定位到具体行与字段 |

下一步可以加入退款按钮。它与搜索不同。搜索超时可以重新读；退款超时可能意味着服务器已执行。先查询操作结果，再决定是否重试。接着练[幂等与恢复](workshop-node-service-resilience.md)。

## 离线笔记要分开本地保存和远端确认 {#notes}

用户按下保存后，界面立即显示内容。网络断开时也允许继续编辑。这里有三个不同的成功点。

本地视图更新了。本地日志落盘了。服务器确认了。不能把它们都叫“保存成功”。

先选择追加日志，而不是每次覆盖整篇笔记。日志项至少带上稳定的操作 ID、文档 ID 和内容版本。稳定 ID 在重试时不能改变。

```js
const operation = {
  id: 'local-op-42',
  documentId: 'note-7',
  baseRevision: 12,
  change: { type: 'replace-title', value: '会议纪要' },
  state: 'pending',
};
```

`baseRevision` 让服务端知道用户基于哪个版本编辑。它不能解决自动合并，只能把冲突显式暴露出来。需要协同编辑时，再选择能表达并发关系的更新格式。

接着写同步队列。下面采用显式冲突策略，不假装普通字符串覆盖就是 CRDT。

```pseudocode
saveLocal(change):
    operation = newOperationWithStableId(change, currentRevision)
    await appendDurableLog(operation)
    applyChangeToLocalView(change)
    enqueue(operation.id)

syncOne(id):
    operation = readDurableOperation(id)
    if operation.state == confirmed: return
    response = await sendWithIdempotencyKey(operation.id, operation)
    if response indicates conflict:
        persistState(id, conflict)
        showLocalAndRemoteVersions()
        return
    if response indicates success:
        await persistAcknowledgement(id, response.revision)
        removeFromRetryQueue(id)
    else:
        keepOperationPending(id)
        scheduleRetryWithinBudget()

recoverAfterRestart():
    for operation in durableLog:
        if operation.state == pending: enqueue(operation.id)
        if operation.state == conflict: showConflict(operation.id)
```

故障要插在中间。服务器完成写入后，客户端还没记录确认时关闭进程。重启后会重新发送同一个操作。检查服务端没有生成第二笔业务效果。

| 要拆开的机制 | 学习入口 | 改一条约束继续练 |
| --- | --- | --- |
| 追加日志与恢复 | [会话持久化](../agent/harness/sessions-branching-persistence.md) | 最后一条日志只写了一半 |
| 数据库事务 | [事务题组](practice-databases-transactions.md) | 业务写入成功，确认日志失败 |
| 重投、租约与恢复 | [同步与恢复](practice-distributed-sync.md) | 两个 worker 同时领取任务 |
| CRDT 更新合并 | [本地优先同步](../engineering/local-first-sync-crdt.md) | 更新重复、乱序和离线交错 |
| 请求和流的关闭 | [Node 生命周期](workshop-node-http-lifecycle.md) | 客户端先断开，服务端还在生成数据 |

先把单机日志的失败情况处理好。再换真实数据库验证事务。最后才验证多进程恢复。每换一层，测试环境也要跟着换。

## 工具助手要有可执行的边界 {#assistant}

让模型选工具，不等于允许模型决定权限。服务端返回的工具描述也不是授权凭据。

从一个只读工具开始。给它两个数字，返回和。先把发现、调用、失败和取消跑通，再接文件系统或外部服务。

阅读 [MCP 手写实现](../agent/mcp/mcp-integration.md)。当前教程按 `2026-07-28` 规范组织请求。版本和客户端能力随每次请求发送，不把连接当作完成握手的会话。

把助手拆成五个真正有用的步骤。

```pseudocode
runAssistant(userRequest, budget):
    conversation = [userRequest]
    while budget.remainingSteps > 0:
        checkCancellation()
        budget.consumeOneStep()
        proposal = await modelWithDeadline(conversation)
        if proposal is finalAnswer: return proposal.text
        tool = findRegisteredTool(proposal.toolName)
        if tool is missing: appendToolFailure("unknown tool"); continue
        arguments = validateArguments(tool.schema, proposal.arguments)
        decision = await permissionPolicy(tool, arguments, authenticatedUser)
        if decision is denied: appendToolFailure("denied"); continue
        result = await executeWithDeadline(tool, arguments)
        conversation.append(resultWithOriginalCallId(result))
    return ExplicitBudgetExceeded()
```

先保留原始调用 ID。多个工具同时执行时，结果顺序可能与发出顺序不同。不能按数组下标随便配对。

再验证权限。模型建议删除文件时，权限策略必须能拒绝它，而且拒绝后副作用次数应为零。然后测预算。每轮调用模型前都扣除一步，工具不存在或权限拒绝也不能绕过预算。一个不断申请同一工具的模型不能让循环无限运行。

最后测输入。工具返回的文章里即使写着“忽略之前的规则”，也只能作为待处理内容，不能获得运行命令或更改权限的资格。

接着练[权限门](../agent/security/permission-gate-handwritten.md)、[工具编排](../agent/tools/tool-orchestration-implementation.md)和[评估](../agent/ops/agent-evals-from-scratch.md)。每增加一个工具，至少补一个拒绝用例和一个资源结束用例。

## 先独立运行，再组合 {#run}

在仓库根目录运行新实现的测试。三组互不要求模型密钥，也不会调用外部业务服务。MCP 的端到端用例启动自己的本地端点。

```bash
node --test scripts/implementation-labs/agent/*.test.mjs
node --test scripts/implementation-labs/frontend/*.test.mjs
node --test scripts/implementation-labs/systems/*.test.mjs
```

完整实现分别在 [协议与 Agent](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/agent/catalog.json)、[语言与框架](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/frontend/catalog.json)、[浏览器与工程](https://github.com/Shyu-x/frontend-interview/blob/c1a7d0be48d2601aa4d71b303fbc08921e77235d/scripts/implementation-labs/systems/catalog.json)目录中。先做一个模块，记下失败结果。再把两个模块接起来，检查它们共享的状态是谁拥有。

写完后试着回答三个问题。

谁能提交最终结果？谁能取消工作？谁负责释放资源？如果答案还不清楚，先把状态收拢，再扩充功能。
