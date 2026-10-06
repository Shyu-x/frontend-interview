---
title: AI Agent 概览
description: AI Agent 篇的学习地图：从框架选型与基础概念，到分层架构、推理模式、工具与 MCP、主流框架、RAG 与多 Agent，再到评测部署和源码剖析。
tags:
  - ai-agent
date: 2026-05-17
---

# AI Agent 概览

本篇面向有前端或全栈背景、希望系统掌握 LLM Agent 工程实践的读者，覆盖从概念到生产的完整链路：Agent 框架与选型、分层架构与状态管理、ReAct 与规划-执行等推理模式、工具系统与 MCP 协议、LangChain/LangGraph/CrewAI/AutoGen 等框架、RAG 与多 Agent 协作、评测与部署，以及 Claude Code、OpenCode 的源码剖析。内容均配有可运行的 TypeScript/Python 示例。

## 1. 学习路径

建议按以下阶段顺序阅读，每个阶段内的页面可按需跳读。

1. **基础入门**：先了解生态全景，再通过一个流式对话应用建立整体印象。
    - [Agent 框架对比](foundations/agent-frameworks.md)
    - [Coding Agent 对比](foundations/coding-agent-comparison.md)
    - [流式对话应用设计](foundations/streaming-chat-app.md)
2. **核心架构**：理解 Agent 的分层结构、状态机与记忆。
    - [分层架构总览](architecture/layered-architecture.md)，再依次阅读 [感知层](architecture/layer-perception.md)、[认知层](architecture/layer-cognition.md)、[决策层](architecture/layer-decision.md)、[执行层](architecture/layer-execution.md)、[通信层](architecture/layer-communication.md)、[扩展层](architecture/layer-extension.md)
    - [状态机与编排](architecture/state-machine-patterns.md)
    - [记忆系统](architecture/memory-system.md)
3. **推理与规划**：掌握 Agent 如何思考与分解任务。
    - [ReAct 模式](reasoning/react-pattern.md)
    - 规划-执行系列：[原理与规划器](reasoning/plan-execute-planner.md)、[执行器与完整实现](reasoning/plan-execute-executor.md)、[混合模式与优化](reasoning/plan-execute-hybrid.md)
4. **工具系统与 MCP**：让 Agent 连接外部世界。
    - [工具调用模式](tools/tool-patterns.md)
    - 工具编排系列：[并行与串行](tools/tool-orchestration-basics.md)、[混合与选择策略](tools/tool-orchestration-hybrid.md)、[实现与高级话题](tools/tool-orchestration-implementation.md)
    - [MCP 协议集成](mcp/mcp-integration.md)、[MCP 服务器生态与开发](mcp/mcp-servers-ecosystem.md)、[MCP 安全与配置示例](mcp/mcp-security-config.md)
5. **框架深度**：[LangChain](frameworks/langchain-deep-dive.md)、[LangGraph](frameworks/langgraph-checkpointing.md)、[CrewAI](frameworks/crewai-flows.md)、[AutoGen](frameworks/autogen-groupchat.md)。
6. **高级应用**：RAG 系列（[原理与检索](applications/rag-principles-retrieval.md)、[知识库构建](applications/rag-knowledge-base.md)、[Agent 集成与高级 RAG](applications/rag-agent-advanced.md)、[代码实现](applications/rag-implementation.md)），以及[多模型集成](applications/multi-model-integration.md)、[多 Agent 协作](applications/multi-agent-patterns.md)、[流式传输](applications/streaming-patterns.md)。
7. **生产与实战**：[评测与基准](production/agent-evaluation.md)、[生产部署](production/production-deployment.md)，并通过 [Claude Code 源码剖析](case-studies/claude-code-analysis.md) 等案例印证前面的概念。

## 2. 页面速览

### 2.1 基础入门

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [Agent 框架对比](foundations/agent-frameworks.md) | 主流 Agent 框架的能力、架构与适用场景，以及选型建议 | 基础 |
| [Coding Agent 对比](foundations/coding-agent-comparison.md) | Claude Code、Cursor、OpenCode 等 AI 编程助手的架构与扩展机制对比 | 基础 |
| [流式对话应用设计](foundations/streaming-chat-app.md) | 基于 React + NestJS + SSE 的 Agent 对话应用整体设计 | 基础 |

### 2.2 核心架构

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [分层架构总览](architecture/layered-architecture.md) | 感知、认知、决策、执行、通信、扩展六层的职责与数据流 | 进阶 |
| [感知层](architecture/layer-perception.md) | 输入解析、多模态感知与上下文采集 | 进阶 |
| [认知层](architecture/layer-cognition.md) | 推理引擎、规划器、记忆与知识图谱 | 进阶 |
| [决策层](architecture/layer-decision.md) | 策略选择、行动决策与风险控制 | 进阶 |
| [执行层](architecture/layer-execution.md) | 工具执行、沙箱与结果反馈 | 进阶 |
| [通信层](architecture/layer-communication.md) | Agent 间消息协议与协作通信 | 进阶 |
| [扩展层](architecture/layer-extension.md) | 插件、技能与生态扩展机制 | 进阶 |
| [状态机与编排](architecture/state-machine-patterns.md) | 状态机设计、任务编排、并行执行与错误恢复 | 进阶 |
| [记忆系统](architecture/memory-system.md) | 短期与长期记忆、上下文管理与高级记忆模式 | 进阶 |

### 2.3 推理与规划

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [ReAct 模式](reasoning/react-pattern.md) | 推理与行动交替的 Agent 循环、变体与实现 | 进阶 |
| [规划-执行：原理与规划器](reasoning/plan-execute-planner.md) | 规划与执行分离的思想，计划表示与重规划 | 进阶 |
| [规划-执行：执行器与完整实现](reasoning/plan-execute-executor.md) | 执行器设计与端到端实现 | 高级 |
| [规划-执行：混合模式与优化](reasoning/plan-execute-hybrid.md) | 与 ReAct 的混合模式及成本、延迟优化 | 高级 |

### 2.4 工具系统与 MCP

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [工具调用模式](tools/tool-patterns.md) | 工具 Schema、执行生命周期、错误处理与沙箱安全 | 进阶 |
| [工具编排：并行与串行](tools/tool-orchestration-basics.md) | 并行与串行两种基础编排模式 | 进阶 |
| [工具编排：混合与选择策略](tools/tool-orchestration-hybrid.md) | 混合编排与工具选择策略 | 高级 |
| [工具编排：实现与高级话题](tools/tool-orchestration-implementation.md) | 编排引擎实现与高级话题 | 高级 |
| [MCP 协议集成](mcp/mcp-integration.md) | MCP 协议架构与服务器、客户端实现 | 进阶 |
| [MCP 服务器生态与开发](mcp/mcp-servers-ecosystem.md) | 官方与第三方服务器、安装配置与自定义开发 | 进阶 |
| [MCP 安全与配置示例](mcp/mcp-security-config.md) | 权限模型、安全实践与完整配置示例 | 高级 |

### 2.5 框架深度

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [LangChain 深度指南](frameworks/langchain-deep-dive.md) | 核心概念、工具、Agent、记忆、RAG 与监控 | 进阶 |
| [LangGraph 检查点机制](frameworks/langgraph-checkpointing.md) | 状态持久化、线程化检查点与跨会话状态 | 高级 |
| [CrewAI Flows 编排](frameworks/crewai-flows.md) | Flow 装饰器、条件与并行执行、状态与错误恢复 | 进阶 |
| [AutoGen 群聊协作](frameworks/autogen-groupchat.md) | GroupChat 模式、嵌套聊天与 Human-in-the-Loop | 进阶 |

### 2.6 高级应用

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [RAG：原理与检索系统](applications/rag-principles-retrieval.md) | RAG 原理、向量检索、混合检索与重排序 | 进阶 |
| [RAG：知识库构建](applications/rag-knowledge-base.md) | 文档解析、分块、嵌入与索引管理 | 进阶 |
| [RAG：Agent 集成与高级 RAG](applications/rag-agent-advanced.md) | Agentic RAG、GraphRAG 等高级技术 | 高级 |
| [RAG：代码实现与展望](applications/rag-implementation.md) | 完整 RAG 系统实现与前沿展望 | 高级 |
| [多模型集成](applications/multi-model-integration.md) | LLM 适配层、模型选择、降级重试与成本控制 | 进阶 |
| [多 Agent 协作模式](applications/multi-agent-patterns.md) | Hub-and-Spoke、分层等多 Agent 架构与委派策略 | 进阶 |
| [流式传输模式](applications/streaming-patterns.md) | SSE 实现、背压、重连与性能优化 | 进阶 |

### 2.7 生产与实战

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [Agent 评测与基准](production/agent-evaluation.md) | 评测框架、指标、测试策略与优化技术 | 进阶 |
| [生产部署](production/production-deployment.md) | 部署架构、扩展、监控、安全与成本管理 | 高级 |
| [Claude Code 源码剖析](case-studies/claude-code-analysis.md) | 项目结构、核心模块与请求处理流程 | 进阶 |
| [Claude Code 架构深度解析](case-studies/claude-code-deep-analysis.md) | Query Engine、工具系统与关键算法 | 高级 |
| [OpenCode 架构分析](case-studies/opencode-analysis.md) | OpenCode 的架构、Agent 实现与扩展机制 | 进阶 |
| [教程资源研究报告](case-studies/research-findings.md) | 优质教程资源汇总与现有文档的差距分析 | 基础 |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Agent SDK 概览](https://docs.claude.com/en/api/agent-sdk/overview) | SDK 官方入口，快速了解 Agent 开发核心概念与最小闭环。 | 读概览与快速开始，带着“如何注册工具”问题，跑通后记录日志。 |
| [Claude 子 Agent 文档](https://docs.claude.com/en/docs/claude-code/sub-agents) | 子 Agent 是复杂系统基础，官方说明工具权限与协作方式。 | 读创建与权限章节，做一个只读审查子 Agent，跑一次代码审查。 |
| [OpenAI Agents SDK（Python）](https://openai.github.io/openai-agents-python/) | Python 版 Agents SDK 官方文档，含 handoff 等核心抽象。 | 复现 Quickstart，再加两个 Agent 的 handoff，观察任务如何转交。 |
| [Google ADK 文档](https://google.github.io/adk-docs/) | ADK 官方文档覆盖多工具 Agent、编排与评测，体系完整。 | 跟快速开始建多工具 Agent，重点看评测章节并跑示例。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Agent SDK（TypeScript）](https://github.com/anthropics/claude-agent-sdk-typescript) | TypeScript SDK 源码与示例，能看清工具调用和消息循环实现。 | 克隆后跑 README，再把自定义函数注册成工具并调试。 |
| [smolagents 仓库](https://github.com/huggingface/smolagents) | 核心代码不到千行，是理解最小 Agent 循环的极佳范本。 | 精读 agent loop 与工具调用部分，手写一个简化版循环。 |
| [pi 编码 Agent 工具集](https://github.com/earendil-works/pi) | 编码 Agent 的 loop 与 LLM API 实现，适合对照自己的循环。 | 读 agent loop 和统一 LLM API，列出与你实现的差异。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | 系统讲解上下文工程，直接决定 Agent 的稳定性与成本。 | 读完检查现有提示，删重复上下文，记录 token 与效果变化。 |
| [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) | 真实多 Agent 研究系统复盘，讲清何时拆分与如何编排。 | 画出 lead 与 subagent 调用图，判断你的任务是否需要多 Agent。 |
| [A practical guide to building agents（OpenAI）](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | OpenAI 的实践指南，用模型、工具、指令三要素拆解 Agent。 | 读后按三要素检查自己的设计，补齐缺失的工具或指令。 |
| [LLM Powered Autonomous Agents（Lilian Weng）](https://lilianweng.github.io/posts/2023-06-23-agent/) | 经典长文，规划、记忆、工具三部分讲得透彻。 | 精读三部分，各写一段理解，并对照自己的 Agent 找差距。 |
| [Agents（Chip Huyen）](https://huyenchip.com/2025/01/07/agents.html) | Chip Huyen 从工程视角讲 Agent 的工具与规划，接地气。 | 读工具与规划章节，列出你 Agent 缺失的环节并排优先级。 |
| [Hugging Face Agents Course](https://huggingface.co/learn/agents-course/unit0/introduction) | 免费动手课程，从零搭 Agent 并提交 Space，反馈快。 | 完成 Unit 1，边做边改参数，最后提交一个小 Agent 到 Space。 |

