---
title: AI 与 Agent 资料
description: LLM 应用、Agent、MCP、RAG 与评测的官方文档、论文、课程与开源教程，每条资源附学习动作
---

# AI 与 Agent 资料

先读官方文档与 Building effective agents，再读 ReAct 等论文理解原理，最后用框架动手实践。

所有链接均已检查可访问。语言标签为资料正文语言；级别：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## 官方文档与 Agent 方法论

!!! tip "这一组怎么学"
    第 1 天：读 Building effective agents，画出 workflow 与 agent 的区别。第 2 到 3 天：用 Anthropic 或 OpenAI 的 API 写一个带 2 个工具的 tool use 循环。第 4 天起：读 Agent 工程文章（工具设计、上下文工程、多 Agent）。
    练习：不借助框架，用 100 行以内代码实现"模型调用工具并把结果返回模型"的循环。
    预期耗时：约 1 周，每天 1 到 2 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Anthropic 文档](https://docs.anthropic.com/) | 官方文档 | English | 入门 | 先读 Messages API 快速开始，在本地跑通第一个请求。 |
| [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | 工程文章 | English | 进阶 | 读完后列出文中 5 种 workflow 模式，各举一个你项目里的使用场景。 |
| [Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | 工程文章 | English | 进阶 | 按文中原则审查你已有的一个工具定义，改写名称与描述后对比调用成功率。 |
| [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | 工程文章 | English | 进阶 | 读完后检查你的 Agent 提示，删掉重复上下文并记录 token 变化。 |
| [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) | 工程文章 | English | 进阶 | 画出文中 lead agent 与 subagent 的调用关系图，思考何时值得拆分多 Agent。 |
| [Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) | 技术文章 | English | 进阶 | 在一小批文档上实现"为每个分块补上下文"的做法，对比召回率。 |
| [Claude Code 最佳实践](https://www.anthropic.com/engineering/claude-code-best-practices) | 工程文章 | English | 入门 | 把文中的 CLAUDE.md 与计划先行做法应用到你的一个仓库，运行一周后复盘。 |
| [Claude Code 文档](https://code.claude.com/docs/en/overview) | 官方文档 | English | 入门 | 安装后依次尝试 slash commands、hooks 与 subagents 三个章节的示例。 |
| [Claude Code Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) | 官方文档 | English | 进阶 | 写一个在提交前自动运行 lint 的 hook，并验证它会阻止失败的操作。 |
| [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp) | 官方文档 | English | 进阶 | 接入一个文件系统或 GitHub MCP 服务器，让 Claude Code 完成一个读写任务。 |
| [Claude Agent SDK 概览](https://docs.claude.com/en/api/agent-sdk/overview) | 官方文档 | English | 进阶 | 用 SDK 写一个能读取本地目录并总结的小 Agent，观察工具调用日志。 |
| [Claude Agent SDK（TypeScript）](https://github.com/anthropics/claude-agent-sdk-typescript) | 开源 SDK | English | 进阶 | 克隆后运行 README 示例，再把自己的函数注册成自定义工具。 |
| [Claude Tool Use 概览](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview) | 官方文档 | English | 入门 | 手写一遍工具定义 JSON schema，调试模型传参错误的场景。 |
| [Agent Skills 概览](https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview) | 官方文档 | English | 进阶 | 为你常做的一个任务写一个 SKILL.md，测试 Agent 是否按需加载。 |
| [Claude 子 Agent 文档](https://docs.claude.com/en/docs/claude-code/sub-agents) | 官方文档 | English | 进阶 | 创建一个只读代码审查 subagent，限制其工具权限后运行一次审查。 |
| [anthropics/skills 仓库](https://github.com/anthropics/skills) | 示例仓库 | English | 进阶 | 阅读两个官方 skill 的目录结构，仿写一个自己的 skill。 |
| [anthropics/claude-code 仓库](https://github.com/anthropics/claude-code) | 开源仓库 | English | 入门 | 阅读 README 与 plugins 目录，了解插件与命令的组织方式。 |
| [OpenAI 文档](https://platform.openai.com/docs) | 官方文档 | English | 入门 | 先读 Function Calling 与结构化输出两个指南，各写一个最小示例。 |
| [OpenAI Function Calling 指南](https://platform.openai.com/docs/guides/function-calling) | 官方文档 | English | 入门 | 实现一个天气或计算器工具，处理模型返回多个工具调用的情况。 |
| [OpenAI Structured Outputs 指南](https://platform.openai.com/docs/guides/structured-outputs) | 官方文档 | English | 入门 | 用 JSON schema 约束一个信息抽取任务，统计格式错误率。 |
| [OpenAI Agents 指南](https://platform.openai.com/docs/guides/agents) | 官方文档 | English | 进阶 | 对比其 handoff 与 guardrail 概念和 Anthropic 文章里的模式。 |
| [OpenAI Agents SDK（Python）](https://openai.github.io/openai-agents-python/) | 官方文档 | English | 进阶 | 复现 Quickstart，再加一个 handoff 让两个 Agent 协作。 |
| [OpenAI Agents SDK（JS）](https://openai.github.io/openai-agents-js/) | 官方文档 | English | 进阶 | 前端同学用 TypeScript 跑通示例，把输出接到简单页面。 |
| [A practical guide to building agents（OpenAI）](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | 白皮书 PDF | English | 进阶 | 读完后用其"模型、工具、指令"三要素检查你的 Agent 设计。 |
| [OpenAI Cookbook](https://cookbook.openai.com/) | 示例集 | English | 进阶 | 选一个与你场景相近的 notebook 运行并改一处参数观察变化。 |
| [Gemini API 文档](https://ai.google.dev/gemini-api/docs) | 官方文档 | English | 入门 | 对同一提示在 Gemini 与其他模型上各跑一次，比较输出与延迟。 |
| [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook) | 示例集 | English | 进阶 | 克隆仓库，运行 tool_use 与 RAG 目录里的 notebook 并改成自己的数据。 |
| [Anthropic Courses](https://github.com/anthropics/courses) | 课程仓库 | English | 入门 | 按顺序完成 Prompt Engineering 与 Tool Use 两个课程 notebook。 |
| [Anthropic Learn](https://www.anthropic.com/learn) | 学习中心 | English | 入门 | 浏览学习中心目录，挑与你岗位相关的 2 篇完成阅读与练习。 |
| [Anthropic Engineering 博客](https://www.anthropic.com/engineering) | 博客 | English | 进阶 | 订阅并每月读 1 篇，写一段 3 句话的摘要与可借鉴点。 |
| [Vercel AI SDK 文档](https://ai-sdk.dev/docs) | 官方文档 | English | 进阶 | 在 Next.js 项目里跑通 chat 示例，加一个工具调用与流式展示。 |
| [Vercel AI SDK Agents](https://ai-sdk.dev/docs/agents/overview) | 官方文档 | English | 进阶 | 用 SDK 的 agent 抽象实现多步工具调用，设置最大步数并观察终止。 |
| [Vercel AI SDK 仓库](https://github.com/vercel/ai) | 开源仓库 | English | 深入 | 阅读 provider 抽象目录，理解它如何统一多家模型接口。 |
| [Mastra 文档](https://mastra.ai/docs) | 官方文档 | English | 进阶 | 用 TypeScript 创建一个带 workflow 与 memory 的 Agent 并本地运行。 |
| [Mastra 仓库](https://github.com/mastra-ai/mastra) | 开源仓库 | English | 深入 | 阅读 examples 目录，选一个示例改造成你的业务场景。 |
| [Google ADK 文档](https://google.github.io/adk-docs/) | 官方文档 | English | 进阶 | 用 ADK 快速开始建一个多工具 Agent，并运行其评测功能。 |
| [Google ADK（Python）仓库](https://github.com/google/adk-python) | 开源仓库 | English | 深入 | 读 samples 目录，对比其 Agent 抽象和你熟悉的框架。 |
| [LangChain 文档](https://python.langchain.com/docs/introduction/) | 官方文档 | English | 进阶 | 先用最小链完成问答，再替换模型厂商，感受抽象层。 |
| [LangGraph 文档](https://langchain-ai.github.io/langgraph/) | 官方文档 | English | 进阶 | 把一个线性流程改画成带条件分支的图并实现。 |
| [LangGraph 概览（新版文档）](https://docs.langchain.com/oss/python/langgraph/overview) | 官方文档 | English | 进阶 | 读 durable execution 与 human-in-the-loop 部分，实现一次人工审批中断。 |
| [LangGraph 教程入门](https://langchain-ai.github.io/langgraph/tutorials/introduction/) | 官方教程 | English | 入门 | 按教程逐步构建聊天机器人，加入记忆与工具节点。 |
| [Why LangGraph](https://langchain-ai.github.io/langgraph/concepts/why-langgraph/) | 概念文章 | English | 入门 | 读完用自己的话说明何时需要图式编排而非普通函数调用。 |
| [LangChain Academy](https://academy.langchain.com/) | 官方课程 | English | 入门 | 完成 LangGraph 入门课程的 notebook 练习。 |
| [LlamaIndex 文档](https://docs.llamaindex.ai/en/stable/) | 官方文档 | English | 进阶 | 用 5 行代码建一个文档问答索引，再逐步替换检索器。 |
| [LlamaIndex 博客](https://www.llamaindex.ai/blog) | 博客 | English | 进阶 | 读 agentic RAG 相关文章，把其中一种检索策略加入你的 RAG。 |
| [CrewAI 文档](https://docs.crewai.com/) | 官方文档 | English | 进阶 | 创建 2 个角色 Agent 协作写一篇摘要，观察任务委派过程。 |
| [AutoGen 文档](https://microsoft.github.io/autogen/stable/) | 官方文档 | English | 进阶 | 跑通双 Agent 对话示例，再加入一个代码执行工具。 |
| [Hugging Face 文档](https://huggingface.co/docs) | 官方文档 | English | 进阶 | 在 Hub 找一个小模型，用 transformers 本地推理一次。 |
| [smolagents 文档](https://huggingface.co/docs/smolagents/index) | 官方文档 | English | 进阶 | 用 CodeAgent 完成一个需要计算的任务，对比工具调用与代码行动两种方式。 |
| [smolagents 仓库](https://github.com/huggingface/smolagents) | 开源仓库 | English | 深入 | 阅读不到千行的核心代码，理解最小 Agent 循环的实现。 |
| [pi 编码 Agent 工具集](https://github.com/earendil-works/pi) | 开源工具集 | English | 深入 | 阅读其 agent loop 与统一 LLM API 的实现，对照自己写的循环找差异。 |
| [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) | 开源仓库 | English | 深入 | 阅读 README 中"一切皆插件"的设计，思考如何把你的工具封装成插件。 |
| [OpenAI Swarm](https://github.com/openai/swarm) | 教学仓库 | English | 进阶 | 阅读不到 500 行的核心代码，理解 handoff 的最小实现。 |
| [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) | 开源仓库 | English | 入门 | 浏览其架构文档，了解早期自主 Agent 的设计及局限。 |

## MCP 与 Agent 协议

!!! tip "这一组怎么学"
    先读 MCP 介绍与架构概念，再动手：用官方 SDK 写一个只暴露 2 个工具的 MCP 服务器，用 Inspector 调试，最后接入 Claude Code 或其他客户端。规范原文留到遇到协议细节问题时查。
    预期耗时：3 到 5 天，每天 1 到 2 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Model Context Protocol 文档](https://modelcontextprotocol.io/) | 官方文档 | English | 入门 | 读 Introduction 并运行 quickstart，理解客户端与服务器角色。 |
| [MCP 入门介绍](https://modelcontextprotocol.io/docs/getting-started/intro) | 官方文档 | English | 入门 | 读完后画出 host、client、server 的关系图。 |
| [MCP 架构概念](https://modelcontextprotocol.io/docs/learn/architecture) | 官方文档 | English | 进阶 | 对照 tools、resources、prompts 三类能力，为你的场景各列一个例子。 |
| [MCP Tools 概念](https://modelcontextprotocol.io/docs/concepts/tools) | 官方文档 | English | 进阶 | 为一个 API 设计 tool schema，写出描述与输入校验。 |
| [MCP 规范](https://modelcontextprotocol.io/specification) | 规范 | English | 深入 | 阅读 transport 与 lifecycle 章节，核对你的服务器实现是否合规。 |
| [MCP 规范（最新版本）](https://modelcontextprotocol.io/specification/latest) | 规范 | English | 深入 | 查看版本变更，确认 SDK 对应的协议版本。 |
| [MCP 官方服务器集合](https://github.com/modelcontextprotocol/servers) | 示例仓库 | English | 进阶 | 阅读 filesystem 服务器源码，仿写一个自己的服务器。 |
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | 开源 SDK | English | 进阶 | 按 README 搭建服务器，用 stdio 传输接入本地客户端。 |
| [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) | 开源 SDK | English | 进阶 | 用 FastMCP 写一个暴露数据库查询的工具。 |
| [MCP Inspector](https://github.com/modelcontextprotocol/inspector) | 调试工具 | English | 进阶 | 用 Inspector 连上你的服务器，逐个调用工具查看原始消息。 |
| [Hugging Face MCP 课程](https://huggingface.co/learn/mcp-course/unit0/introduction) | 免费课程 | English | 入门 | 完成第一单元并按课程构建一个 MCP 服务器。 |
| [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | 资源清单 | English | 入门 | 挑 3 个与你工作相关的服务器安装试用，记录体验。 |
| [Agent Client Protocol](https://agentclientprotocol.com/) | 协议文档 | English | 深入 | 读协议概览，理解编辑器与编码 Agent 的通信方式。 |
| [AGENTS.md](https://agents.md/) | 约定说明 | English | 入门 | 为你的仓库写一份 AGENTS.md，列出构建与测试命令。 |

## 论文与课程

!!! tip "这一组怎么学"
    论文按"ReAct → Chain-of-Thought → Toolformer → Reflexion"读，每篇先读摘要、图 1 和结论，再决定是否精读。每读完一篇写 5 行笔记：问题、方法、结果、局限、你能用在哪。
    课程部分选一门完成即可：英文基础用 DeepLearning.AI，中文系统学习用 Datawhale。
    预期耗时：每篇论文 1 到 2 小时；一门短课 2 到 4 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [ReAct 论文](https://arxiv.org/abs/2210.03629) | 论文 | English | 深入 | 读 Figure 1 的轨迹示例，然后手写一个 Thought、Action、Observation 循环。 |
| [Chain-of-Thought Prompting](https://arxiv.org/abs/2201.11903) | 论文 | English | 深入 | 在同一道数学题上对比有无思维链示例的结果。 |
| [Toolformer](https://arxiv.org/abs/2302.04761) | 论文 | English | 深入 | 读方法部分，理解模型如何自动标注何时调用工具。 |
| [Reflexion](https://arxiv.org/abs/2303.11366) | 论文 | English | 深入 | 实现"失败后写反思再重试"的循环，并比较成功率。 |
| [Tree of Thoughts](https://arxiv.org/abs/2305.10601) | 论文 | English | 深入 | 在 24 点任务上手工模拟分支搜索，理解与 CoT 的区别。 |
| [Generative Agents](https://arxiv.org/abs/2304.03442) | 论文 | English | 深入 | 读 memory stream 设计，思考如何给你的 Agent 加记忆检索。 |
| [AutoGen 论文](https://arxiv.org/abs/2308.08155) | 论文 | English | 深入 | 读多 Agent 对话编程的抽象，对照 AutoGen 文档的 API。 |
| [Retrieval-Augmented Generation 论文](https://arxiv.org/abs/2005.11401) | 论文 | English | 深入 | 读方法图，理解检索器与生成器如何联合工作。 |
| [RAG 综述（Gao et al.）](https://arxiv.org/abs/2312.10997) | 综述论文 | English | 深入 | 按 Naive、Advanced、Modular 三阶段整理一张对比表。 |
| [GPT-3 论文](https://arxiv.org/abs/2005.14165) | 论文 | English | 深入 | 读 few-shot 章节，理解上下文学习的起点。 |
| [InstructGPT 论文](https://arxiv.org/abs/2203.02155) | 论文 | English | 深入 | 读 RLHF 流程图，理解模型为何能听从指令。 |
| [Attention Is All You Need](https://arxiv.org/abs/1706.03762) | 论文 | English | 深入 | 配合下方图解或课程读，实现一个单头注意力的 numpy 版本。 |
| [LLM Powered Autonomous Agents（Lilian Weng）](https://lilianweng.github.io/posts/2023-06-23-agent/) | 博客综述 | English | 进阶 | 精读规划、记忆、工具三部分，各写一段你的理解。 |
| [Agents（Chip Huyen）](https://huyenchip.com/2025/01/07/agents.html) | 博客综述 | English | 进阶 | 读工具与规划章节，对照你的 Agent 找出缺失环节。 |
| [Patterns for building LLM-based systems（Eugene Yan）](https://eugeneyan.com/writing/llm-patterns/) | 博客综述 | English | 进阶 | 在七种模式里选两种应用到你的项目并写下评估方法。 |
| [Agentic pattern（Philipp Schmid）](https://www.philschmid.de/agentic-pattern) | 博客 | English | 进阶 | 对照文中的模式实现一个最小示例。 |
| [Context Engineering（Philipp Schmid）](https://www.philschmid.de/context-engineering) | 博客 | English | 进阶 | 检查你应用的上下文来源，按文中分类整理并删减。 |
| [DeepLearning.AI 短课程](https://www.deeplearning.ai/short-courses/) | 免费课程 | English | 入门 | 选 Agent 或 RAG 主题的一门，边看视频边在 notebook 里改参数。 |
| [DeepLearning.AI Agentic AI](https://www.deeplearning.ai/courses/agentic-ai/) | 课程 | English | 入门 | 查看课程大纲，选与你需求匹配的模块学习并完成练习。 |
| [Hugging Face Agents Course](https://huggingface.co/learn/agents-course/unit0/introduction) | 免费课程 | English | 入门 | 完成 Unit 1 并提交一个小 Agent 到 Space。 |
| [Hugging Face LLM Course](https://huggingface.co/learn/llm-course/chapter1/1) | 免费课程 | English | 入门 | 读第一章建立 Transformer 与推理基础概念，再做第二章动手练习。 |
| [AI Agents for Beginners（Microsoft）](https://github.com/microsoft/ai-agents-for-beginners) | 开源课程 | English | 入门 | 每天一课，运行课内 notebook 并替换成自己的数据。 |
| [Generative AI for Beginners（Microsoft）](https://github.com/microsoft/generative-ai-for-beginners) | 开源课程 | English | 入门 | 选与应用开发相关的 3 课运行示例代码。 |
| [roadmap.sh AI Agents 路线](https://roadmap.sh/ai-agents) | 路线图 | English | 入门 | 用路线图自测，标出尚未接触的节点并排期。 |
| [roadmap.sh AI 工程师路线](https://roadmap.sh/ai-engineer) | 路线图 | English | 入门 | 对照路线图中应用层节点，补齐 embeddings 与向量库部分。 |
| [Hello-Agents（Datawhale）](https://datawhalechina.github.io/hello-agents/) | 中文教程 | 中文 | 入门 | 按章节顺序阅读并运行代码，完成末尾的实战项目。 |
| [Hello-Agents 仓库](https://github.com/datawhalechina/hello-agents) | 中文教程仓库 | 中文 | 入门 | 克隆仓库，提 issue 或笔记记录你遇到的运行问题。 |
| [Happy-LLM（Datawhale）](https://github.com/datawhalechina/happy-llm) | 中文教程 | 中文 | 进阶 | 读 Transformer 与预训练章节，跟着代码实现一个小模型。 |
| [LLM Cookbook（Datawhale）](https://github.com/datawhalechina/llm-cookbook) | 中文教程 | 中文 | 入门 | 对照吴恩达短课程中文版练习，每课完成配套 notebook。 |
| [Self-LLM（Datawhale）](https://github.com/datawhalechina/self-llm) | 中文教程 | 中文 | 进阶 | 选一个开源模型，按教程在本地或云 GPU 部署并调用。 |
| [All-in-RAG（Datawhale）](https://github.com/datawhalechina/all-in-rag) | 中文教程 | 中文 | 进阶 | 按章节实现数据处理、检索与生成，最后搭一个完整 RAG 应用。 |
| [Prompt Engineering Guide](https://www.promptingguide.ai/zh) | 中文指南 | 中文 | 入门 | 读基础提示技巧章节，每个技巧写一个自己的例子。 |
| [Prompt Engineering Guide（仓库）](https://github.com/dair-ai/Prompt-Engineering-Guide) | 开源指南 | English | 入门 | 浏览 notebooks 目录，运行其中一个示例。 |
| [Anthropic Prompt Engineering 指南](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) | 官方文档 | English | 入门 | 按文中顺序改写一个现有提示，记录每一步改动带来的变化。 |
| [OpenAI Prompt Engineering 指南](https://platform.openai.com/docs/guides/prompt-engineering) | 官方文档 | English | 入门 | 将六条策略逐条应用到同一任务并对比输出。 |
| [roadmap.sh Prompt Engineering 路线](https://roadmap.sh/prompt-engineering) | 路线图 | English | 入门 | 用路线图补全你缺失的提示技巧。 |
| [DeepLearning.AI 课程入口（learn.deeplearning.ai）](https://learn.deeplearning.ai/) | 课程平台 | English | 入门 | 登录后搜索 Agent 关键词，选一门免费课开始。 |
| [GenAI_Agents（NirDiamant）](https://github.com/NirDiamant/GenAI_Agents) | 教程集 | English | 进阶 | 选一个与你场景相近的 notebook，运行并改造。 |
| [Awesome LLM Apps](https://github.com/Shubhamsaboo/awesome-llm-apps) | 示例集 | English | 入门 | 挑一个小应用本地运行，阅读其提示与工具定义。 |
| [Awesome AI Agents](https://github.com/e2b-dev/awesome-ai-agents) | 资源清单 | English | 入门 | 浏览分类，选两个同类 Agent 对比设计取舍。 |

## RAG 与向量检索

!!! tip "这一组怎么学"
    先用 LlamaIndex 或 LangChain 搭一个 50 行以内的最小 RAG，再逐项优化：分块大小、混合检索、重排序、上下文增强。每次只改一个变量，用 20 个固定问题记录命中率。
    预期耗时：最小 RAG 半天；系统优化 1 到 2 周。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [RAG_Techniques（NirDiamant）](https://github.com/NirDiamant/RAG_Techniques) | 示例集 | English | 进阶 | 依次运行基础 RAG、重排序、查询改写三个 notebook，比较结果。 |
| [OpenAI Retrieval 指南](https://platform.openai.com/docs/guides/retrieval) | 官方文档 | English | 入门 | 用托管向量存储上传文档，做一次语义检索。 |
| [Pinecone Learning Center](https://www.pinecone.io/learn/) | 教程 | English | 入门 | 读 embeddings 与向量检索入门，再看 chunking 策略。 |
| [Pinecone RAG 系列](https://www.pinecone.io/learn/series/rag/) | 教程系列 | English | 进阶 | 按系列顺序读，每篇文末的实验自己复现一次。 |
| [Weaviate Learn](https://weaviate.io/learn) | 教程 | English | 进阶 | 选混合搜索教程，在本地起实例并跑示例。 |
| [Qdrant 文档](https://qdrant.tech/documentation/) | 官方文档 | English | 进阶 | 按 quickstart 本地启动，写入并检索 1000 条向量。 |
| [Chroma 文档](https://docs.trychroma.com/) | 官方文档 | English | 入门 | 用 Chroma 建一个本地集合，完成增删改查。 |
| [Retrieval-Augmented Generation（Prompt Guide 中文）](https://www.promptingguide.ai/zh/research/rag) | 中文指南 | 中文 | 入门 | 读完用一句话区分 Naive RAG 与 Advanced RAG。 |

## 评测与可观测性

!!! tip "这一组怎么学"
    先写 20 到 30 条代表性测试用例（输入加期望要点），再选一个评测工具自动跑，最后把评测接入 CI。先读 Hamel 的评测文章建立方法，再上手工具。
    预期耗时：搭建第一套评测约 1 天；持续迭代长期进行。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Your AI Product Needs Evals（Hamel Husain）](https://hamel.dev/blog/posts/evals/) | 博客 | English | 进阶 | 照文中三级评测方法，给你的应用写第一批断言型测试。 |
| [OpenAI Evals 仓库](https://github.com/openai/evals) | 开源框架 | English | 进阶 | 阅读 eval 注册方式，写一个最小的分类评测。 |
| [OpenAI Evals 指南](https://platform.openai.com/docs/guides/evals) | 官方文档 | English | 进阶 | 在平台里建一个数据集评测，对比两版提示分数。 |
| [Inspect AI](https://inspect.aisi.org.uk/) | 评测框架 | English | 进阶 | 用 Inspect 写一个带 solver 与 scorer 的任务并运行。 |
| [Inspect AI 仓库](https://github.com/UKGovernmentBEIS/inspect_ai) | 开源仓库 | English | 深入 | 阅读 examples 里的 agent 评测，了解沙箱与工具评分。 |
| [Promptfoo 文档](https://www.promptfoo.dev/docs/intro/) | 评测工具 | English | 入门 | 写一个 YAML 配置对比两个模型，在 CI 里运行。 |
| [Ragas 文档](https://docs.ragas.io/) | RAG 评测 | English | 进阶 | 用 faithfulness 与 context precision 指标评测你的 RAG。 |
| [Langfuse 文档](https://langfuse.com/docs) | 可观测性 | English | 进阶 | 自托管或云端接入追踪，查看一次 Agent 调用的完整链路。 |
| [LangSmith 文档](https://docs.smith.langchain.com/) | 可观测性 | English | 进阶 | 给你的应用加追踪，定位一次错误调用的原因。 |
| [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/) | 规范 | English | 深入 | 对照规范属性，为你的 LLM 调用补充标准化指标。 |
| [SWE-bench](https://swe-bench.github.io/) | 基准 | English | 进阶 | 浏览排行榜与任务格式，理解编码 Agent 如何被评测。 |
| [Anthropic 论 SWE-bench 的 Agent 设计](https://www.anthropic.com/engineering/swe-bench-sonnet) | 工程文章 | English | 进阶 | 读最小工具集设计，对照你的编码 Agent 删减不必要工具。 |
