---
title: "Day 4：JSONL 会话恢复与上下文压缩"
tags: [ai-agent, tutorial]
date: 2026-10-11
level: intermediate
runnable: true
tested_with: [node@22.18.0, typescript@5.9.3]
verified_at: 2026-10-12
source_commit: Shyu-x/frontend-interview@4da5f302ef0ac69069e17543d795d82da3a42faa
description: "用追加日志恢复消息，并明确教学版压缩的取舍"
---

# Day 4：JSONL 会话恢复与上下文压缩

## 学习目标

- 解释为什么一行一个事件的 JSONL 适合追加写和顺序回放。
- 区分可忽略的末尾半行与必须报告的中间损坏。
- 说明当前压缩函数只是保留最近消息并拼接旧消息，不是语义摘要。

## 前置与项目位置

- 前置：完成 Day 3，理解消息历史与工具结果 observation。
- 环境：Node.js 22.18 或更高版本。
- 项目：`examples/minicode/`
- 阅读：`src/session.ts`、`tests/session-security.test.ts` 中会话相关用例。

## 运行

```bash
cd examples/minicode
npm run typecheck
npm test
```

该工程没有单独的 session CLI；用项目测试验证文件读写和恢复行为，不照抄与现有入口无关的 `node session-manager.js` 命令。

## 观察行为

`JsonlSessionStore.append()` 为每个事件追加一行 JSON。`load()` 按行解析；文件末尾未写完整时设置 `ignoredTrailingLine` 并保留此前事件，中间行损坏则抛错。`messages()` 从事件中筛出消息。`compactMessages()` 在超过保留数量时把较早消息转成一段标记为“历史摘要”的文本，再保留最近消息。

## 源码走读一：追加一条消息，再从日志恢复

测试先创建临时目录和 `session.jsonl`，构造 `JsonlSessionStore(path)`，然后调用：

```ts
await store.append({
  type: "message",
  at: new Date(0).toISOString(),
  message: { role: "user", content: "hello" },
});
```

`append()` 先验证事件时间和消息结构，再确保父目录存在，最后把序列化后的事件加换行符追加到文件。文件内容是一行完整 JSON。测试随后在文件末尾直接加上 `{broken`，模拟进程在写一行时中断。

`load()` 读完整文件并以换行拆分。合法的第一行通过 `JSON.parse` 与 `validateEvent`；损坏行恰好是最后一个数组元素，因此被忽略，并将 `ignoredTrailingLine` 设为 `true`。`messages()` 再筛出 `type: "message"` 的事件，恢复出 user 的 `hello`。

如果损坏的是中间一行，后面仍有数据，`load()` 会抛出带行号的错误。中间损坏可能代表丢失了历史边界，静默跳过会把不完整日志伪装成完整会话。

## 源码走读二：压缩十二条交替消息

测试生成 `m0` 到 `m11`，偶数索引是 user，奇数索引是 assistant，然后运行 `compactMessages(messages, 4)`：

1. 十二条大于 `keepLatest=4`，初始切点为 `12 - 4 = 8`。
2. `messages[8]` 是 user，因此切点不必往前移动。这样最近部分从一个新的 user turn 开始，而不会留下半个 assistant/tool 交互。
3. 旧前缀 `m0` 到 `m7` 转成带有损声明的 excerpt；最近部分保留 `m8` 到 `m11`。
4. 返回数组共五项：一条摘要包装消息，加四条原始最近消息。测试检查摘要含 `m0`，最后一条仍为 `m11`。

这个函数的结果名称虽然沿用 `compactMessages`，内容不是模型生成的语义总结。它是有字符上限的文本摘录，可能直接截断旧前缀。

## 核心机制与设计取舍

### JSONL 以追加换取简单回放

一行一个事件使追加写无需重写整个日志，也容易按序恢复。事件带 `type` 与时间，后续可以在同一流中区分 message 和 checkpoint。代价是文件增长后需要单独设计轮转、索引和备份。

### 校验结构，区分尾部损坏和中段损坏

JSON 可解析不代表事件可信，所以加载后还要检查事件类型、日期、角色和工具调用结构。只容忍最后一行的 JSON 解析失败，是针对“最后一次追加被截断”的有限恢复策略。

被截断但仍是合法 JSON 的语义错误会被结构验证拒绝；当前也没有校验所有事件之间的业务关系。这个策略不是通用日志修复工具。

### 压缩保留完整 user turn，但摘要有损

切点回退到 user 消息，确保保留区从一个新用户回合开始，避免把最近助手消息与工具结果拆成孤立片段。若无法找到合适 user 切点，函数宁可不压缩，避免切出不完整尾段。

旧区仅保留最多 `maxSummaryChars` 的角色文本 excerpt，并明确标记“有损”“省略消息”“不保留工具调用状态”。保留完整 user turn 约束的是新尾段边界，不意味着旧摘要保留完整内容或工具语义。

## 典型失败路径

- 最后一行是 `{broken`：前面的事件仍可恢复，返回 `ignoredTrailingLine: true`。
- 第一行损坏而后面还有合法行：报 `会话日志第 1 行损坏`，不继续伪装成功。
- `keepLatest` 不是正整数，或摘要上限太短：在压缩前抛出参数错误。
- 尾段找不到可安全切分的 user 边界：返回完整消息副本，可能仍超出实际模型上下文预算。

这些行为说明持久化恢复和上下文压缩是两个机制：日志保存全量事件，压缩只影响送入模型的上下文副本，不应覆盖原始日志。

## 实战任务

中间损坏已有 `regressions.test.ts` 断言。加练：新增“最后一行是完整 JSON、但事件结构错误”的用例，例如非法日期或不存在的事件类型，确认不会把它误当作被截断的尾行静默忽略。保留已有尾行截断和中间损坏测试。

**通过标准：**`npm test` 通过；末尾半行仍可恢复，中间损坏会失败并指出行号；没有静默丢弃中间事件。

## 故障练习

在临时测试文件末尾追加 `{broken`，确认已有测试报告 `ignoredTrailingLine: true`。把损坏内容放到完整事件之前，观察策略变化。比较两者对会话完整性的风险。

## 验收与面试提问

- 验收：能说清追加日志、按序恢复和末尾截断恢复各解决什么问题。
- 面试：如果两个进程同时追加同一文件会怎样？为什么字符数截断不能替代 token 预算？摘要遗漏重要事实时如何降低风险？

## 边界

当前实现没有消息 ID、并发写锁、索引或语义摘要器；压缩文本可能超过 token 限制，也可能丢失关键信息。需要多进程写入、检索或强恢复保证时，应补充锁/数据库和校验策略，并针对真实模型上下文长度测量。
