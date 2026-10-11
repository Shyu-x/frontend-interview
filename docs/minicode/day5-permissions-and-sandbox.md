---
title: "Day 5：权限决策与工作区路径边界"
tags: [ai-agent, tutorial]
date: 2026-10-11
level: intermediate
runnable: true
tested_with: [node@22.18.0, typescript@5.9.3]
verified_at: 2026-10-12
source_commit: Shyu-x/frontend-interview@4da5f302ef0ac69069e17543d795d82da3a42faa
description: "把模型提出的文件操作当作不可信请求，在执行前检查能力和路径"
---

# Day 5：权限决策与工作区路径边界

## 学习目标

- 区分权限决策与实际执行：获准不等于已隔离。
- 追踪读写请求的路径规范化，以及 `..` 和符号链接逃逸检查。
- 解释教学版对写入、执行、网络和破坏性操作要求审批的策略。

## 前置与项目位置

- 前置：完成 Day 3，理解工具执行前的授权钩子；熟悉 Promise 和文件路径。
- 环境：Node.js 22.18 或更高版本。
- 项目：`examples/minicode/`
- 阅读：`src/security.ts`、`src/tools.ts`、`tests/session-security.test.ts` 中权限相关用例。

## 运行

```bash
cd examples/minicode
npm run typecheck
npm test
```

测试会在临时目录中创建越界路径和符号链接，不会访问真实用户文件。

## 观察行为

`PermissionGate.decision()` 先检查构造时传入的 `deniedCapabilities`，命中返回 `deny`，用户批准也不能绕过；其余写、执行、网络和破坏性请求返回 `ask`，读请求默认 `allow`。`authorize()` 对读写路径先检查工作区范围，再执行权限决策；审批回调默认拒绝。`resolvePath()` 检查父目录和符号链接真实路径，避免仅靠字符串前缀误判边界。

注册表 `ToolRegistry` 还有单独的授权钩子：标记为 `mutates` 的工具未配置授权时默认拒绝。权限策略和工具本身的参数验证是两道不同的门。

## 源码走读：写入请求为什么先验证路径再询问

测试使用一个临时目录作为工作区，创建 `new PermissionGate(workspace)`，再授权 `write` 到 `note.md`：

1. `authorize()` 看到 capability 是 `write`，所以先调用 `resolvePath("note.md")`。
2. `resolvePath()` 对工作区调用 `realpath()`，将相对路径解析到工作区下；再对父目录做 `realpath()`，防止父目录符号链接把目标带出工作区。
3. 文件尚不存在时，`lstat()` 抛 `ENOENT`，实现将它作为可创建的目标处理。父目录已经确认，候选文件仍位于工作区内。
4. `decision()` 对 `write` 返回 `ask`。默认 `approve` 函数返回 `false`，于是 `authorize()` 抛出“用户未批准: write”。
5. 测试再用 `new PermissionGate(workspace, async () => true)`，相同路径先通过范围验证，再通过审批回调，`authorize()` 正常结束。

第二个测试场景在工作区创建 `escape` 符号链接，指向工作区外的 `secret.txt`。`resolvePath("escape")` 检查到目标是符号链接，再用 `realpath()` 检查目标路径，发现其相对工作区的路径越界，因此在权限询问前拒绝。

## 核心机制与设计取舍

### 路径范围检查与能力审批分层

路径检查回答“这个目标是否位于授权工作区”；权限决策回答“该类动作是否可直接允许、需要询问或拒绝”。写请求即使路径合法仍要询问；路径越界即使审批回调为 true 也会先失败。

把两类判断分开，使测试可以分别覆盖目录逃逸与审批策略。不过 `PermissionGate` 本身不执行文件操作，调用方必须确保获批的路径就是之后实际使用的路径。

### 默认策略采用最小放行

当前策略对普通 `read` 返回 `allow`；`write`、`execute`、`network` 和显式标记 `destructive` 的请求返回 `ask`。没有提供审批回调时默认拒绝询问请求。

这是教学上的保守默认，不是适合所有产品的完整策略语言。这里没有显式配置的 `deny` 规则表，也没有规则优先级；复杂产品需要清晰、可审计的策略来源。

### 注册表授权和路径 Gate 不是自动连通

`ToolRegistry` 接收可选 `authorize(tool, input, context)` 回调。若不传回调，非写工具可继续，`mutates: true` 工具直接拒绝。`PermissionGate` 暴露的是 `authorize({ capability, target })`，必须由应用层显式写一个映射适配器，把工具元数据和参数转换成权限请求。

当前 demo 的 `add` 是 `mutates: false`，没有展示文件写工具；测试也直接测 `PermissionGate`。因此不能说现有 demo 已经把所有文件工具接入此 Gate。

## 典型失败路径

- `../outside.txt`：规范化后的相对路径越出工作区，抛路径越界错误。
- `escape` 指向外部文件：通过父目录检查后仍在符号链接真实目标检查阶段被拒绝。
- 写入未设置审批回调：路径合法，但审批默认返回 false，动作被拒绝。
- 执行或网络请求：没有文件路径可检查，直接按 ask 流程处理；默认仍拒绝。

路径检查和之后打开文件之间可能发生竞态；当前代码不锁定 inode，也不使用 OS 沙箱。要在高风险环境执行文件操作，需要将路径验证与实际操作放在更强隔离或原子 API 中。

## 实战任务

在 `tests/session-security.test.ts` 增加一项断言：审批回调返回 `false` 时，`write` 请求拒绝；返回 `true` 时，同一工作区内的写入请求通过授权。沿用临时工作区夹具。

**通过标准：**`npm test` 通过；拒绝和批准两条路径都被覆盖；越界符号链接测试仍然失败关闭。

## 故障练习

把路径检查临时改成只判断 `candidate.startsWith(workspace)`，运行路径越界测试并解释为什么字符串前缀可能把相似目录名误判为子目录。恢复实现后，检查 `resolvePath("../outside.txt")` 与越界符号链接都被拒绝。

## 验收与面试提问

- 验收：能描述“规范化路径 → 检查边界 → 做权限决策 → 执行”的顺序，并指出默认审批策略。
- 面试：路径穿越和符号链接为什么要分别考虑？授权回调为什么应默认拒绝？提示词限制能否代替权限检查？

## 边界

这里的 gate 只做应用层检查，不会把进程放进 OS 容器或限制 CPU、网络、系统调用。代码中的审批回调也是教学接口，不含真实用户界面或审计服务。路径检查与后续文件操作之间仍可能存在竞态；生产沙箱需要操作系统级隔离和更完整的竞态防护。
