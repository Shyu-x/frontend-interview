---
title: "Day 3：Agent Loop 与工具执行"
tags: [ai-agent, tutorial]
date: 2026-10-11
level: intermediate
runnable: true
tested_with: [node@22.18.0, typescript@5.9.3]
verified_at: 2026-10-12
source_commit: Shyu-x/frontend-interview@f7525abd111f84a86a51b6a9113460ba0573fbb3
description: "理解模型决策、工具执行、结果回灌与预算终止"
---

# Day 3：Agent Loop 与工具执行

## 学习目标

- 画出“请求模型 → 执行工具 → 回灌结果 → 再请求”的闭环。
- 解释工具描述、参数校验、授权和执行的先后关系。
- 区分轮数、工具调用数、token 用量和取消信号。

## 前置与项目位置

- 前置：完成 Day 1–2；熟悉 Promise、异常和 TypeScript 类型守卫。
- 环境：Node.js 22.18 或更高版本。
- 项目：`examples/minicode/`
- 阅读：`src/agent.ts`、`src/tools.ts`、`src/demo.ts`、`tests/agent.test.ts`。

## 运行

```bash
cd examples/minicode
npm run typecheck
npm test
npm run demo
```

测试无需真实模型。关注 Agent 测试中的事件顺序、工具 observation 和预算终止断言。

## 观察行为

`run()` 先把用户输入写入消息，再向模型请求响应。没有工具调用时返回最终答案；有工具调用时逐个交给 `ToolRegistry`。注册表依次检查工具是否存在、参数是否合法、是否获准，然后才执行。成功或失败都写成 `role: "tool"` 的 observation，下一轮模型因此能看到结果。

代码还限制最大轮数、工具调用数和 token 总量。取消信号会传入模型与工具调用。它们是不同的停止原因，排查时应查看 `RunResult.reason` 和事件，而不只看最终文本。

## 源码走读：参数错误如何变成可恢复 observation

使用 `tests/agent.test.ts` 里“工具参数错误作为 observation 回灌”的测试场景：

1. FakeModel 第一项响应包含 `{ id: "bad", name: "add", arguments: { a: "2" } }`。注意 `arguments` 在类型上是 `unknown`，因此编译器不会替运行时验证它。
2. `AgentLoop.run("计算")` 进入第一轮。响应通过外层结构检查，因为 `arguments` 字段存在；这一步只验证调用对象的基本形状。
3. Agent 将 assistant 工具调用写进历史，然后进入 `#executeTool()`。`ToolRegistry.call()` 先按名称查到 `add`。
4. `numberPair()` 检查 `a`、`b` 是否有限数字。`a` 是字符串，返回 `false`，所以 `execute` 加法函数没有运行。
5. `#executeTool()` 捕获这个普通工具错误，追加 `role: "tool"` 消息，内容类似 `{"ok":false,"error":"工具 add 参数校验失败"}`，并发出 `tool:end` 且 `ok: false`。
6. Agent 再请求模型。测试里的第二个响应是“参数错误，请补充 b”，没有工具调用，所以结果为 `reason: "final"`。

这条路径的关键状态变化是：模型调用本身不会被删除；失败原因以 tool message 绑定原 `toolCallId` 回到历史。这样模型或上层调用方能知道“尝试了什么、为什么没成功”。

## 核心机制与设计取舍

### 工具注册表分开做描述、验证、授权、执行

`descriptors()` 只向模型暴露名称、说明和 schema；`call()` 才执行本地逻辑。`call()` 的顺序是：取消检查、工具存在性、参数验证、授权回调、再次检查取消、调用 `execute()`。

`inputSchema` 是发给模型的描述数据，不是此实现里的通用 schema validator。真正校验由每个工具的 `validate()` 负责。该设计简单且可控，但每个工具都必须自己写严谨的运行时验证。

### 可恢复错误与中止错误分流

普通工具异常会作为失败 observation 回灌，使 Agent 有机会修正请求或解释失败。若 `AbortSignal` 已取消，则错误不会伪装成一次普通工具失败，而会向上抛出，结束本次 run。

这能区分“工具没做成”和“调用方要求停止”。但如果工具在抛错之前已经产生副作用，写入回滚并不会自动发生；具有副作用的工具需要幂等设计或事务边界。

### 多种预算控制不同成本

`maxTurns` 限制模型往返次数；`maxToolCalls` 限制本地工具执行次数；`maxTokens` 累计适配器报告的输入与输出用量。达到任一上限会形成不同终止原因。

这些预算并非等价：一次模型回复可以请求多个工具；没有工具的长对话也会消耗 token；模型若不报告 usage，则 token 累计为零。因此生产系统还应在适配器、时间和费用层加入对应约束。

### 会话并发的显式拒绝

Agent 内部的 `#running` 标记拒绝同一实例上的并发 `run()`，避免两条输入同时追加并交错修改同一消息数组。不同 Agent 实例仍可并发运行。这个局部互斥只保护内存会话状态，不是跨进程锁。

## 典型失败路径

未知工具名会在查表时失败；错误参数在验证时失败；写工具没配置授权时由默认授权器拒绝；执行函数本身抛错时则由 Agent 捕获并回灌。它们发生在不同阶段，诊断时不要都归类成“模型调用失败”。

若模型响应结构缺少 `toolCalls`、重复调用 ID 或给出非法 usage，Agent 会在记录 assistant 消息前拒绝响应。这样的模型协议错误不会被当作一个普通工具 observation，因为此时还没有合法的工具调用可供回灌。

## 实战任务

在 `tests/agent.test.ts` 为工具参数错误补一个断言：失败 observation 中 `ok` 为 `false`，但模型仍能在下一轮返回最终回答。使用现有的 FakeModel 两条响应模式。

**通过标准：**`npm test` 通过；结果为 `reason: "final"`；历史里保留失败工具调用的 observation；事件显示 Agent 又请求了一次模型。

## 故障练习

在 `src/demo.ts` 把工具参数中的一个数字改成字符串，运行 demo。观察校验错误如何进入 observation，而不是调用加法函数。恢复后将 `maxToolCalls` 设为 `1`，让 FakeModel 连续请求工具，观察 `tool_budget` 终止。

## 验收与面试提问

- 验收：能指出工具执行前的三道检查，并说明为什么失败 observation 也要回到上下文。
- 面试：如果工具会写文件，授权检查放在哪里？为什么不能只依赖模型遵守提示词？工具失败和用户取消应如何区分？

## 边界

工具 schema 当前只作为描述数据传递，参数安全依赖本地 `validate`；这不是完整 JSON Schema 校验器。预算的 token 数来自模型适配器报告值，不是精确 tokenizer。注册表授权回调也不是操作系统沙箱。
