---
title: "Day 1：模型适配契约与 FakeModel（不是 Claude SDK）"
tags: [ai-agent, tutorial]
date: 2026-10-11
level: intermediate
runnable: true
tested_with: [node@22.18.0, typescript@5.9.3]
verified_at: 2026-10-12
source_commit: Shyu-x/frontend-interview@4da5f302ef0ac69069e17543d795d82da3a42faa
description: "从消息与工具调用协议入门，用离线 FakeModel 看清 Agent 和模型之间的边界"
---

# Day 1：模型适配契约与 FakeModel（不是 Claude SDK）

!!! note "先划清边界"
    本仓库没有 Claude API 客户端，也不会发送 HTTP/SSE 请求。今天学习的是通用的模型适配边界，并用 `FakeModel` 在本地回放预设响应。它帮助验证 Agent 数据契约，不代表 Anthropic SDK 或真实 Messages API 的完整行为。

## 学习目标

- 说清 `ModelAdapter` 的输入、输出和取消信号。
- 区分普通文本、工具描述、模型返回的工具调用。
- 解释为什么供应商请求字段应留在适配器内部。

## 前置与项目位置

- 前置：会读 TypeScript 类型、`async` 函数和 JSON 对象。
- 环境：Node.js 22.18 或更高版本。
- 项目：`examples/minicode/`
- 阅读：`src/types.ts`、`src/fake-model.ts`、`src/demo.ts`。

## 运行

```bash
cd examples/minicode
npm ci
npm run typecheck
npm run demo
```

`npm run demo` 使用固定的两条 FakeModel 响应，不需密钥、网络或真实模型账号。

## 观察数据怎么走

`ModelAdapter.complete(messages, tools, signal)` 接收当前消息、工具描述和可选的取消信号，返回 `ModelResponse`。`FakeModel` 把构造时给定的响应依次取出，同时记录收到的请求与工具列表。查看 `src/demo.ts`，追踪第一条响应中的 `toolCalls`，以及第二条最终回答。

注意：`ToolDescriptor` 是给模型看的工具名称、说明和输入 schema；`ToolCall` 是模型提出的一次调用；实际执行发生在后续课程的本地工具注册表里。工具调用是数据，不是模型直接执行代码。

## 源码走读：一条响应如何进入 Agent

从 `src/demo.ts` 的第一条 FakeModel 响应开始。它是项目内部 `ModelResponse`，不是某个供应商的原生 JSON：

```ts
{
  content: "我先调用加法工具。",
  toolCalls: [{ id: "call-1", name: "add", arguments: { a: 2, b: 3 } }],
  usage: { inputTokens: 20, outputTokens: 8 },
}
```

按调用顺序逐步追踪：

1. `demo.ts` 把这条响应和最终回答一起传给 `new FakeModel([...])`。
2. `AgentLoop.run("计算 2 加 3")` 把用户消息追加到消息数组，然后调用 `complete(messages, descriptors, signal)`。
3. `FakeModel.complete()` 先把收到的消息与工具描述复制进 `requests` 和 `tools`，再从响应队列取出第一项。
4. Agent 检查返回结构合法，将文本和工具调用保存为 assistant 消息；累计用量为 `20 + 8 = 28`。
5. 由于 `toolCalls` 有一项，响应尚不是最终结果。控制流转到工具执行阶段。
6. 工具结果回灌后，Agent 第二次调用 `complete()`，FakeModel 返回 `{ content: "2 + 3 = 5", toolCalls: [] }`。
7. 第二条响应没有工具调用，Agent 以 `reason: "final"` 结束，最终文本为 `2 + 3 = 5`。

FakeModel 没有生成这些答案，也没有发 HTTP 请求。它只按队列回放对象，适合检查“Agent 收到某种响应后会怎么走”。

## 核心机制与设计取舍

### 内部契约与供应商适配

`ModelAdapter` 把 Agent 需要的能力收敛到 `complete(messages, tools, signal)`。真实适配器可以在内部转换消息格式与工具声明，再把结果映射回 `ModelResponse`。这样 Agent 不需要知道供应商的鉴权字段或原始响应结构。

这个接口也有意收窄：当前消息只有文本，工具参数是 `unknown`，没有图片、音频、流式 token 或原始供应商元数据。如果应用需要它们，就要扩展内部契约，而不能假设适配器能无损表达所有内容。

### 工具调用是数据，不是执行权限

响应中的 `{ id, name, arguments }` 只描述模型提出的请求。实际执行由本地注册表按工具名分发，随后进行参数验证与授权。模型无法凭借返回一段 JSON 就获得文件系统或网络访问权。

这要求服务端保持唯一执行入口：不能让模型生成的字符串直接交给 `eval` 或 shell。工具 schema 是说明，真正的参数安全仍要由本地校验代码负责。

### 固定响应换取可重复性

FakeModel 用 `structuredClone` 复制预设响应和记录的输入，避免测试后续修改对象影响已观察的数据。测试可精确规定第一轮调工具、第二轮收敛为最终回答。

取舍是它不会模拟随机输出、延迟、服务端错误、重试、限流或真实 tokenizer。因此它能证明控制流符合预期，不能证明真实模型回答正确或网络集成可靠。

## 典型失败路径

把响应数组缩短为第一条后，首轮正常返回 `call-1`；Agent 执行工具后再次询问模型，FakeModel 队列已空，于是抛出 `FakeModel 响应队列已耗尽`。这说明回放夹具没覆盖完整对话轮次，不是模型服务拒绝请求。

若模型响应里的 `toolCalls` 为空，Agent 直接把该轮文本当最终回答；若有未知工具名或错误参数，则后续本地注册表拒绝执行。两种情况下模型适配层都不应擅自替本地执行层“猜”参数。

## 接入真实服务时的边界

本课不提供 Claude API 客户端，也不描述 Messages API 的具体字段。接入时需根据所选服务的当前官方文档实现单独适配器，并验证鉴权、请求结构、错误映射、重试、取消和流式处理。不要把本地 `ModelResponse` 称为 Claude 原生格式。

## 实战任务

在 `src/demo.ts` 中把加法工具改成乘法工具，调整工具名、描述、参数和两条 FakeModel 响应，让示例计算 `4 × 6`。运行 `npm run typecheck` 和 `npm run demo`。

**通过标准：**终端先显示一次工具调用事件，最后回答为 `4 × 6 = 24`；修改没有添加真实 API 密钥或网络请求。

## 故障练习

把 FakeModel 的响应队列删到只剩第一条，再运行 demo。观察 `FakeModel 响应队列已耗尽`，解释为什么第二次模型请求需要第二个预设响应。恢复响应后，再把 `toolCalls` 设为空，观察 Agent 不会调用工具。

## 验收与面试提问

- 验收：能从 `ModelAdapter` 类型指出输入、输出和取消信号；能解释 `FakeModel` 的响应队列何时耗尽。
- 面试：如果接入某个真实模型服务，哪些变化放进适配器，哪些类型应保持稳定？工具调用 JSON 为什么仍需本地校验？

## 边界

本课契约只覆盖文本、工具调用和可选 token 用量，不涵盖图片、多模态、流式增量、重试、限流或供应商错误。真实服务的字段、鉴权和流格式应按该服务当前官方文档实现并验证；不要把本仓库说成 Claude SDK 的手写实现。
