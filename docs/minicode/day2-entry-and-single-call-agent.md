---
title: "Day 2：程序入口与一次可观察的 Agent 运行"
tags: [ai-agent, tutorial]
date: 2026-10-11
level: intermediate
runnable: true
tested_with: [node@22.18.0, typescript@5.9.3]
verified_at: 2026-10-12
source_commit: Shyu-x/frontend-interview@f7525abd111f84a86a51b6a9113460ba0573fbb3
description: "从 demo.ts 追踪一次离线模型调用和工具结果"
---

# Day 2：程序入口与一次可观察的 Agent 运行

## 学习目标

- 沿着入口读出模型、工具注册表、Agent 的创建顺序。
- 用事件日志区分模型响应、工具执行和最终回答。
- 说明当前 demo 是固定输入的单次运行，不是交互式 CLI。

## 前置与项目位置

- 前置：完成 Day 1，理解 `ModelAdapter`、`ModelResponse` 和 `FakeModel`。
- 环境：Node.js 22.18 或更高版本。
- 项目：`examples/minicode/`
- 阅读：`src/demo.ts`，并回看 `src/agent.ts` 的构造函数与 `run()`。

## 运行

```bash
cd examples/minicode
npm run typecheck
npm run demo
```

入口已在 `package.json` 配置为 `npm run demo`。不需要创建另一份 `main.js` 或自行拼接不可运行的示例。

## 观察行为

demo 先建立带两条响应的 FakeModel，再注册 `add` 工具，最后创建 Agent 并传入事件回调。预期事件顺序是：`turn:start`、`model:end`、`tool:start`、`tool:end`、第二轮 `turn:start`、`model:end`、`run:end`。最终输出 `2 + 3 = 5`。

入口负责组装依赖；`AgentLoop` 负责运行过程；回调只负责把事件展示出来。这个分层让测试可以替换模型和工具，而不需要启动真实服务。

## 源码走读：`demo.ts` 的一次完整运行

沿着当前代码逐句看，不需要假设有未实现的命令行解析器：

1. `new FakeModel([...])` 创建两项响应队列。第一项写着“我先调用加法工具”，并请求 `add({ a: 2, b: 3 })`；第二项写着“2 + 3 = 5”，不含工具调用。
2. `new ToolRegistry()` 创建空注册表，随后注册 `add`。`numberPair` 只接受对象且要求 `a`、`b` 都是有限数字；`execute` 返回两数之和。
3. `new AgentLoop(model, tools, { onEvent })` 把两个依赖传入 Agent。这个 demo 只监听事件并 `console.log`，没有启动服务器或读取配置文件。
4. `run("计算 2 加 3")` 把 user 消息放进 `agent.messages`。第一轮开始后，FakeModel 记录请求，再返回第一项响应。
5. Agent 校验响应结构、累计 28 个 token，并保存 assistant 的文本与工具调用。事件先显示 `model:end`，接着工具执行发出 `tool:start` 和 `tool:end`。
6. 工具返回数字 `5`，Agent 把它序列化到 `role: "tool"` 消息。第二轮请求因此带着 user、assistant 调用和 tool observation。
7. FakeModel 返回队列第二项。由于 `toolCalls` 为空，Agent 返回最终结果；demo 最后一行打印 `result.answer`。

事件次序可以压缩成：

```text
turn:start(1) → model:end(1, 1 tool) → tool:start(add)
→ tool:end(add, ok) → turn:start(2) → model:end(2, 0 tools) → run:end(final)
```

这里“入口”的职责是创建对象并连线；`AgentLoop` 才是控制流程。理解这条边界后，测试可直接传入 FakeModel，而生产入口未来可以传入真实适配器，主体 loop 不必改写。

## 核心机制与设计取舍

### 依赖注入让流程可替换

Agent 构造函数接收 `ModelAdapter` 和 `ToolRegistry`。它没有在内部偷偷创建网络客户端或全局工具，因此测试可用响应确定的 FakeModel，也能单独构造只含少数工具的注册表。

代价是调用方必须提供这些依赖，并正确完成装配。依赖注入不会自动解决配置验证、生命周期管理或真实模型连接；这些要由未来的入口层明确处理。

### 事件观察不等于业务结果

`onEvent` 接收轮次开始、模型返回、工具开始/结束和运行结束等轻量事件。最终 `RunResult` 则包含答案、消息历史、调用数和停止原因。日志适合看进度；调用方判断成功应检查结果，而不是仅凭日志里出现 `run:end`。

当前事件不含完整模型文本或工具输出，避免把可能很大的内容塞入每条进度通知。需要审计时，应设计专门的结构化日志和隐私策略，而不是依赖 `console.log(event)`。

### 单次 demo 与交互式 CLI 的范围不同

当前程序只有源码固定的输入，运行一次后结束。交互 CLI 还需要参数解析、配置加载、输入校验、退出信号、会话恢复和用户可见错误。这些层次不能从 `demo.ts` 的存在推断为已经完成。

## 典型失败路径

移除 FakeModel 的第二项响应：第一轮仍正常，工具也仍会执行；Agent 随后请求第二轮时，队列耗尽并抛错。失败发生在“模型适配调用”，不是加法工具。

把工具参数 `a` 改为字符串：FakeModel 仍返回结构合法的工具调用，但 `numberPair` 校验失败。Agent 把失败写入 tool observation；只有预设了下一条模型响应时，流程才可能继续并给出最终答复。

若连续让模型请求工具，Agent 最多执行配置预算内的次数，并在 `maxTurns` 之后停止。限制轮数与限制工具调用数分别保护不同资源，不能只靠其中一个。

## 实战任务

把 `src/demo.ts` 的请求改成 `10 + 15`，并同步调整 FakeModel 的工具参数与最终回答。运行 `npm run demo`。

**通过标准：**最终结果为 `10 + 15 = 25`，事件仍包含一次工具开始、一次工具结束和两次模型响应。

## 故障练习

把第二条 FakeModel 响应移除并运行 demo，记录错误发生在哪次模型请求。恢复后，将最终响应改成仍带一个工具调用，观察运行是否继续；结合 `maxTurns` 解释何时停止。

## 验收与面试提问

- 验收：能指出 demo 中依赖的创建顺序，并按事件说明一次运行经过的阶段。
- 面试：为什么把模型和工具作为构造参数传给 Agent？事件回调与 Agent 的业务结果各自负责什么？

## 边界

当前入口没有命令行参数、配置文件、用户输入循环或持久会话。它用预设数据演示依赖组装，不能据此声称已具备生产 CLI 的启动配置与错误处理。
