---
title: AI Agent 学习路线与验收表
date: 2026-10-11
description: 将 Agent 课程拆为面试速通、从零构建 MiniCode、生产工程三条路线；每一步声明前置、产出、真实验收和预计时间。
tags:
  - ai-agent
  - learning-path
level: entry
prerequisites:
  - JavaScript 异步与 Promise
  - Node.js 与 TypeScript 基础
runnable: false
verified_at: 2026-10-11
---

# AI Agent 学习路线与验收表

选择路线的依据是你要交付什么，不是文章数量。每一步的“验收”都是继续下一步的门槛；读完但无法完成验收，应该回到前一步修正，而不是增加更多框架或提示词。

## 共同规则

| 规则 | 含义 |
|---|---|
| 单 Agent 基线优先 | 先记录单 Agent 的任务通过率、成本、延迟与失败轨迹；没有基线，不能宣称多 Agent 带来收益。 |
| 可运行才算产出 | 标有 `runnable: true` 的页面必须给出命令、版本、预期输出和测试；示意代码不能作为验收依据。 |
| 证据随结果返回 | 工具或子 Agent 的结论附文件路径、命令输出摘要、trace 或引用；只返回自然语言总结不能合并。 |
| 权限显式化 | 读、写、执行、网络、秘密分别授权；拒绝、超时和取消同样要记录。 |
| 事实可追溯 | 版本敏感结论标记 `verified_at` 与来源；源码分析还需 `source_commit`。 |

## 路线 A：面试速通

适合临近面试、需要在有限时间内建立可靠判断框架的人。它不替代动手构建；完成后能回答问题，也能明确自己还不能声称“做过生产 Agent”。

**前置**：会解释 Promise、`async/await`、HTTP 请求和基本的错误处理。

**最终产出**：一张从用户输入到工具执行、权限判断、观测与评测的架构图；10 张问答卡；一个用单 Agent 基线判断是否需要拆分的案例。

**总验收（20 分钟）**：不看资料完成下表的 30 秒答案和 2 分钟追问；用一个具体任务说出指标、证据和失败处理，而不是只背术语。

| 顺序 | 阅读与练习 | 产出 | 验收 | 预计时间 |
|---:|---|---|---|---:|
| 1 | [工程体系总览](system/agent-engineering-map.md)、[Harness 全景](harness/harness-overview.md) | 最小 loop 时序图 | 30 秒：Agent 与 workflow 的边界；图中写出模型、工具、observation、停止条件 | 35 分钟 |
| 2 | [Agent Loop 解剖](harness/agent-loop-anatomy.md)、[上下文膨胀](context/context-bloat-and-rot.md) | 失败轨迹卡片 | 2 分钟：模型连续调用工具为何不能无限循环；给出轮数/预算/上下文三个停止条件 | 35 分钟 |
| 3 | [权限模型](security/permission-models-spectrum.md)、[记忆全景](memory/memory-taxonomy.md) | 权限与记忆边界表 | 30 秒：记忆不是“把聊天记录全塞回去”；说出 write/read 审批点 | 35 分钟 |
| 4 | [Agentic RAG 与 grep](rag/agentic-rag-vs-grep-search.md) | 检索选型理由 | 2 分钟：为何编码 Agent 常先用 grep/目录索引；何时才引入向量检索和对应指标 | 25 分钟 |
| 5 | [单/多 Agent 决策](multi/single-vs-multi-agent.md)、[评测从零搭建](ops/agent-evals-from-scratch.md) | 一页 ADR | 2 分钟：用单 Agent 基线、分解独立性、写冲突、成本和可观测性说明“为什么不拆/为什么要拆” | 50 分钟 |

### 面试训练的最低答案标准

| 题目 | 30 秒回答必须包含 | 2 分钟追问必须补充 |
|---|---|---|
| 什么是 Agent Loop？ | 模型决策、工具调用、observation 回灌、停止条件 | schema 校验、工具异常如何回灌、轮数/token/金额预算、取消信号 |
| 为什么上下文会失效？ | 长上下文有成本和注意力稀释，不是无限内存 | 保留什么、压缩何时触发、摘要如何验证不丢约束、如何量化回归 |
| 为什么不能默认给 Agent shell 权限？ | 工具能力放大错误和提示注入 | allow/ask/deny、realpath/符号链接、沙箱、审计、最小权限与人工确认 |
| 何时使用多 Agent？ | 只有可独立分解、结果可合并且单 Agent 基线不足时 | 父子契约、独立预算、取消、写所有权、证据回传、与基线的质量/成本/延迟对比 |
| 怎么证明系统变好？ | 固定任务集和可重复的通过条件 | 轨迹断言、失败分类、成本/p95、回放、阈值和 CI 门禁 |

## 路线 B：从零构建 MiniCode

这是默认主线。使用同一个 TypeScript 项目逐日递增，不把 Markdown 里的独立片段当作项目交付。

**前置**：Node.js 22.18+、TypeScript、文件系统与命令行基础；会安装 npm 依赖并运行脚本。

**最终产出**：一个默认离线测试的 Agent 教学骨架，覆盖模型适配契约、单次入口、loop/工具、JSONL 会话、有损摘录、工作区路径权限、文件记忆与子任务编排。伴随工程没有真实模型适配、代码编辑工具、进程级沙箱或持久后台队列；技能、待办和后台任务属于扩展阅读与设计练习。

**总验收**：在 Node.js 22.18+ 下执行伴随项目 README 中的 `npm ci`、`npm run verify` 和 `npm run demo`。确认自动测试使用 FakeModel、不会访问外部模型；再用 README 的完成标准逐项解释错误 observation、预算、尾行恢复、工作区路径边界、父子取消和子任务证据指标。真实模型、操作系统级隔离和持久队列不计入本项目已交付能力。

| 日 | 页面 | 前置 | 当日产出 | 真实验收 | 预计时间 |
|---:|---|---|---|---|---:|
| 1 | [模型契约与 FakeModel](../minicode/day1-claude-sdk-from-scratch.md) | 对象、Promise | 消息、工具调用与 `ModelAdapter` 契约 | 能读懂 `types.ts` 与 `fake-model.ts`，说明真实供应商适配仍是扩展点 | 1.5 小时 |
| 2 | [入口与单次 Agent](../minicode/day2-entry-and-single-call-agent.md) | Day 1 | 单次请求与可观察入口 | 运行 demo，指出输入、模型适配器与返回结果在入口中的位置 | 1.5 小时 |
| 3 | [Loop 与工具](../minicode/day3-agent-loop-and-tools.md) | Day 2 | loop、工具参数校验、错误 observation 与预算 | `npm run verify` 通过；能解释坏参数、未知工具和预算耗尽如何处理 | 2 小时 |
| 4 | [会话与压缩](../minicode/day4-session-and-compaction.md) | Day 3 | JSONL 恢复、尾行损坏处理与压缩 | 测试确认中间损坏会报错、截断尾行可恢复；能指出压缩策略的边界 | 2 小时 |
| 5 | [权限与沙箱](../minicode/day5-permissions-and-sandbox.md) | Day 4 | 工作区路径边界与 allow/ask/deny 决策 | 能说明 `..` 与越界符号链接为何被拒绝，以及 execute/network 为何需要审批；项目不提供 OS 级进程沙箱 | 2 小时 |
| 6 | [记忆、技能与待办](../minicode/day6-memory-skills-todo.md) | Day 5 | 有来源、可更新的文件记忆 | 测试确认相同 key 的更正覆盖旧值且可检索；技能与待办是课程扩展设计，不列作伴随工程验收 | 2 小时 |
| 7 | [子 Agent 与后台任务](../minicode/day7-subagents-and-background-tasks.md) | Day 6 | 子任务契约、独立预算、取消、并发和证据指标 | 测试确认父子取消、部分失败与写所有权约束；后台任务句柄/持久队列是课程设计内容，不是伴随工程实现 | 2 小时 |

完成 Day 7 后，用 [MiniCode 复盘](../minicode/review-compare-projects.md) 把能力映射到真实开源项目。不要把“实现了更多角色”当进步：先对同一任务与单 Agent 基线比较通过率、总 token、总耗时和写冲突数。

表内路线所列页面构成 canonical 主线。每阶段先交付表中的产物并通过验收，再决定是否需要深入参考；百科文章数量不构成课程进度。

## 路线 C：生产工程

适合已有可工作的单 Agent，准备接入真实仓库、业务数据或后台任务。该路线按风险从低到高展开。

**前置**：完成路线 B 至少 Day 4；已有可保存 session、记录工具调用的原型。

**最终产出**：可审计的运行状态、权限策略、评测集、trace、成本预算与部署检查表。

**总验收**：在 CI 或等价的干净环境中跑评测；所有破坏性工具经过策略；每个失败运行能按 trace 定位；部署前有回滚和密钥检查。

| 顺序 | 阅读与练习 | 产出 | 验收 | 预计时间 |
|---:|---|---|---|---:|
| 1 | [会话/记忆存储](storage/session-storage-overview.md)、[混合存储](storage/jsonl-sqlite-hybrid-handwritten.md)、[存储故障模式](storage/storage-failure-modes-ops.md) | session 与索引恢复设计 | 重启、迁移、索引重建和损坏记录都可演练；事实来源与派生索引分离 | 0.5–1 天 |
| 2 | [Harness 安全](harness/harness-security-permissions.md)、[沙箱](security/sandboxing-technologies.md)、[提示注入](security/prompt-injection-defense.md) | 威胁模型与策略测试 | 工具最小权限；秘密不进 prompt/trace；攻击样例和拒绝记录可复现 | 1 天 |
| 3 | [评测](ops/agent-evals-from-scratch.md)、[可观测](harness/harness-evals-observability.md)、[成本预算](ops/cost-latency-budgeting.md) | 任务集、trace、预算阈值 | PR 前跑固定任务集；报告通过率、p95、token/金额和失败分类 | 1–2 天 |
| 4 | [生产部署](production/production-deployment.md)、[企业治理](security/enterprise-agent-governance.md) | 发布/回滚与审计清单 | 租户隔离、密钥轮换、回滚、告警、保留期均有负责人和演练记录 | 1 天 |
| 5 | [子 Agent 编排](harness/subagents-orchestration.md)、[失败模式](multi/multi-agent-failure-modes.md) | 多 Agent ADR 与基线报告 | 仅在质量收益超过预算增量时启用；每个 worker 写所有权唯一、可取消、结果带证据 | 1 天 |

## 何时进入百科与参考

| 你正在解决的问题 | Canonical 起点 | 深入参考（按需） |
|---|---|---|
| loop、工具和 Harness 边界 | [Agent Loop 解剖](harness/agent-loop-anatomy.md)、[Harness 全景](harness/harness-overview.md) | [工具调用协议](harness/tool-calling-protocol.md)、steering/abort、Harness 源码案例 |
| 上下文、会话与恢复 | [上下文膨胀](context/context-bloat-and-rot.md)、[会话存储总览](storage/session-storage-overview.md) | 压缩策略对比、JSONL/SQLite、存储故障与 KV cache |
| 工具权限和提示注入 | [权限模型](security/permission-models-spectrum.md)、[提示注入防护](security/prompt-injection-defense.md) | 沙箱技术、企业治理、MCP 安全配置 |
| 检索与记忆 | [Agentic RAG 与 grep](rag/agentic-rag-vs-grep-search.md)、[记忆全景](memory/memory-taxonomy.md) | 向量索引、混合检索、记忆读写与安全评估 |
| 多 Agent 与效果证明 | [单/多 Agent 决策](multi/single-vs-multi-agent.md)、[评测从零搭建](ops/agent-evals-from-scratch.md) | 编排模式、隔离与失败模式、trace 和成本预算 |

上表右列是问题驱动的深入参考，不是必修阶段。框架对比和产品源码分析适合在形成自己的接口与基线后，用作设计比较。

以下内容不是遗漏，而是故意从必修路线移出：

- **框架与架构**：当你能写出自己的接口边界后，再用 LangChain、LangGraph、CrewAI、AutoGen 或分层架构文章对照取舍。
- **RAG 与向量数据库**：先验证 grep/全文检索不足，再选择切块、嵌入、重排与向量索引；必须同时阅读评测与失败模式。
- **DeepSeek Harness、Claude Code、OpenCode 等案例**：作为带日期/提交的快照阅读；实现与产品行为可能已经变化。
- **旧版 RAG 专题**：仅用于理解演进和术语映射，不作为新项目设计依据。

回到 [课程总览](index.md) 或从左侧导航进入相应参考主题。
