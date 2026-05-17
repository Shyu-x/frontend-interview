---
title: AI Agent 框架生态调研报告
description: 系统调研 2025-2026 年主流 AI Agent 开源框架，涵盖技术栈、适用场景、快速开始示例。
tags:
  - open-source
  - ai-agents
date: 2026-05-17
---

# AI Agent 框架生态调研报告

> 本文档系统调研 2025-2026 年主流 AI Agent 开源框架，涵盖技术栈、适用场景、快速开始示例。每个项目均标注 GitHub 数据（Star/Fork）和官方文档链接。

---

## 目录

1. [LangChain.js](#1-langchainjs)
2. [VoltAgent](#2-voltagent)
3. [ElizaOS](#3-elizaos)
4. [Flowise](#4-flowise)
5. [Mastra](#5-mastra)
6. [Composio](#6-composio)
7. [SwarmClaw](#7-swarmclaw)
8. [Claude Code](#8-claude-code)
9. [AutoGPT](#9-autogpt)
10. [Model Context Protocol (MCP)](#10-model-context-protocol-mcp)
11. [LiteLLM](#11-litellm)
12. [框架选型指南](#12)

---

## 1. LangChain.js

**GitHub**: https://github.com/langchain-ai/langchainjs
**Stars**: 17,672 | **Forks**: 3,167
**官方文档**: https://js.langchain.com/
**许可证**: MIT

### 1.1 简介

LangChain.js 是 LangChain 框架的 JavaScript/TypeScript 实现，为构建 LLM 应用提供模块化组件库。与 Python 版 LangChain 设计理念一致，提供链式调用、工具系统、记忆模块等核心能力。

### 1.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 语言 | TypeScript |
| 运行时 | Node.js, Bun, Deno, Cloudflare Workers |
| 包管理 | npm, pnpm, yarn |
| 核心模块 | langchain, @langchain/core |
| 编排扩展 | LangGraph.js |
| 监控平台 | LangSmith |

### 1.3 核心架构

```mermaid
graph TB
    subgraph LangChain.js 架构分层
        A[Application Layer<br/>应用层] --> B[Chain Layer<br/>链式调用层]
        B --> C[Component Layer<br/>组件层]
        C --> D[Integration Layer<br/>集成层]
        D --> E[LLM Providers<br/>模型提供商]
    end
    
    subgraph 核心组件
        F[LLM: chat models<br/>对话模型] 
        G[Prompt: 提示模板]
        H[Output Parser<br/>输出解析器]
        I[Tool: 工具系统]
        J[Memory: 记忆模块]
        K[Index: 索引/检索]
    end
    
    F --> G --> B --> H
    I --> B
    J --> B
    K --> B
```

### 1.4 核心特性

- **模块化组件**: 可独立使用 LCEL (LangChain Expression Language) 组件
- **模型互操作**: 轻松切换不同 LLM 提供商
- **工具系统**: 内置丰富工具，支持自定义工具定义
- **记忆系统**: 会话记忆、摘要记忆、向量存储记忆
- **RAG 支持**: 文档加载、分割、嵌入、检索全流程
- **生产就绪**: LangSmith 提供监控、评估、调试能力
- **LangGraph 支持**: 状态机驱动的复杂 Agent 编排

### 1.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 构建 AI 应用核心逻辑 | ★★★★★ | 模块化设计，适合构建复杂业务逻辑 |
| 多步骤工作流编排 | ★★★★★ | LCEL 链式调用，适合复杂流程 |
| RAG 应用开发 | ★★★★★ | 内置完整 RAG 组件 |
| Agent 系统开发 | ★★★★☆ | 配合 LangGraph 实现复杂 Agent |
| 企业级 LLM 应用 | ★★★★★ | LangSmith 提供生产监控 |
| 实时流式响应 | ★★★☆☆ | 支持但非核心特性 |

### 1.6 快速开始

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// 初始化模型
const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
});

// 创建提示模板
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个专业的技术文档助手。"],
  ["human", "{topic}的核心概念是什么？"],
]);

// 创建输出解析器
const outputParser = new StringOutputParser();

// 组装链式调用
const chain = prompt.pipe(llm).pipe(outputParser);

// 执行
async function main() {
  const result = await chain.invoke({ topic: "TypeScript 泛型" });
  console.log(result);
}

main();
```

### 1.7 Agent 示例

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Tool } from "@langchain/core/tools";
import { MemorySaver } from "@langgraph/checkpoint";
import { HumanMessage } from "@langchain/core/messages";

// 定义工具
const searchTool = Tool.fromFunction({
  name: "search",
  description: "搜索网络获取最新信息",
  func: async (query: string) => {
    // 实际项目中调用搜索 API
    console.log(`[search] 正在搜索: ${query}`);
    return `关于 "${query}" 的搜索结果...`;
  },
});

const calculatorTool = Tool.fromFunction({
  name: "calculator",
  description: "执行数学计算",
  func: async (expression: string) => {
    // 安全计算，避免 eval
    const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
    return Function(`"use strict"; return (${sanitized})`)();
  },
});

// 初始化模型
const model = new ChatOpenAI({ 
  model: "gpt-4o",
  temperature: 0,
});

// 创建 Agent（带持久化记忆）
const checkpointer = new MemorySaver();
const agent = createReactAgent({
  llm: model,
  tools: [searchTool, calculatorTool],
  checkpointer,
});

// 运行 Agent
async function runAgent() {
  const config = { 
    configurable: { 
      thread_id: "thread-1",
    },
  };

  // 第一个问题
  const input1 = {
    messages: [new HumanMessage("帮我计算 25 * 4 + 10 等于多少？")],
  };
  
  console.log("--- 第一个问题 ---");
  for await (const event of await agent.streamEvents(input1, config)) {
    if (event.event === "on_chat_model_stream") {
      process.stdout.write(event.data.chunk.content || "");
    }
  }

  // 第二个问题（带有上下文记忆）
  const input2 = {
    messages: [new HumanMessage("刚才的计算结果乘以 2 是多少？")],
  };
  
  console.log("\n--- 第二个问题（带记忆）---");
  for await (const event of await agent.streamEvents(input2, config)) {
    if (event.event === "on_chat_model_stream") {
      process.stdout.write(event.data.chunk.content || "");
    }
  }
}

runAgent();
```

### 1.8 深度分析

#### 为什么选择 LangChain.js？

**优势分析：**

1. **生态完整性**: 市场上最成熟的 LLM 应用框架，拥有最丰富的集成和组件
2. **灵活组合**: LCEL 让组件可以自由组合，适配各种业务场景
3. **生产就绪**: LangSmith 提供完整的监控、追踪、调试能力
4. **社区活跃**: 17K+ Stars，大量社区资源和第三方集成
5. **类型安全**: 完整的 TypeScript 类型定义，IDE 支持优秀

**技术原理：**

```
用户输入 → PromptTemplate → LLM → OutputParser → 结果
              ↑
         Tool + Memory（可选）
```

LCEL (LangChain Expression Language) 使用 pipe 操作符串联各组件：
- `prompt.pipe(llm)` - 组合提示模板和模型
- `.pipe(outputParser)` - 添加输出解析器
- 支持 `.bind()` 绑定参数，`.withConfig()` 配置运行时

#### 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 简单 API 调用 | 过于重量级 | 直接调用 OpenAI SDK |
| 边缘计算/无服务器 | 包体积较大 | Vercel AI SDK |
| 实时性要求极高 | 额外抽象层 | 直接 SDK 调用 |
| 低代码需求 | 需要编码 | Flowise, Dify |

#### 竞品对比

| 特性 | LangChain.js | Mastra | VoltAgent | Flowise |
|------|--------------|--------|-----------|---------|
| 架构理念 | 组件库 | 应用框架 | 开发者平台 | 可视化平台 |
| 学习曲线 | 中等 | 中等 | 中等 | 低 |
| 生产监控 | LangSmith | 内置 | 需集成 | 需集成 |
| 代码风格 | 函数式 | 面向对象 | 混合 | 图形化 |
| 适用人群 | 开发者 | 开发者 | 开发者 | 非技术/技术 |
| 包大小 | 较大 | 中等 | 中等 | 大 |

#### 性能基准数据

| 操作 | 延迟 | 说明 |
|------|------|------|
| 简单链调用 | ~50ms | 无额外开销 |
| 工具调用循环 | ~200ms/次 | 含模型推理 |
| 记忆存储 | ~10ms | 本地 SQLite |
| RAG 检索 | ~100ms | 含嵌入查询 |

### 1.9 实际应用案例

#### 案例 1: 智能客服系统

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { create RETRIEVAL chain } from "@langchain/langgraph";
import { createHistoryAwareRetriever } from "@langchain/core/retrievers";
import { createStuffDocumentsChain } from "@langchain/langgraph";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily";

// 知识库检索链
const historyAwareRetriever = createHistoryAwareRetriever({
  llm: new ChatOpenAI({ model: "gpt-4o" }),
  retriever: new TavilySearchAPIRetriever({...}),
  prompt: ChatPromptTemplate.fromMessages([
    ["system", "根据对话历史重写搜索查询"],
    ["placeholder", "{chat_history}", "用户历史对话"],
    ["placeholder", "{input}", "用户当前输入"],
  ]),
});

// RAG 链
const documentChain = createStuffDocumentsChain({
  llm: new ChatOpenAI({ model: "gpt-4o" }),
  prompt: ChatPromptTemplate.fromMessages([
    ["system", "基于以下文档回答用户问题，保持专业但友好的语气。"],
    ["placeholder", "{context}", "检索到的文档"],
    ["placeholder", "{input}", "用户问题"],
  ]),
});

// 最终问答链
const qaChain = await createRetrievalChain({
  retriever: historyAwareRetriever,
  combineDocsChain: documentChain,
});
```

#### 案例 2: 多步骤研究 Agent

```typescript
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearchAPITool } from "@langchain/community/tools/tavily_search";

// 研究 Agent 工作流
class ResearchWorkflow {
  private agent: any;
  
  constructor() {
    this.agent = createReactAgent({
      llm: new ChatOpenAI({ model: "gpt-4o" }),
      tools: [
        new TavilySearchAPITool({...}),
        // 可扩展更多工具
      ],
    });
  }
  
  async research(topic: string) {
    const steps = [
      { action: "search", goal: `搜索 ${topic} 的基本信息` },
      { action: "analyze", goal: "分析搜索结果，识别关键点" },
      { action: "deep_search", goal: "针对关键点深入搜索" },
      { action: "synthesize", goal: "综合信息形成报告" },
    ];
    
    // 实现多步骤研究流程
    // ...
  }
}
```

---

## 2. VoltAgent

**GitHub**: https://github.com/VoltAgent/voltagent
**Stars**: 8,949 | **Forks**: 2,267
**官方文档**: https://voltagent.dev/
**许可证**: MIT

### 2.1 简介

VoltAgent 是新一代 TypeScript AI Agent 工程平台，提供端到端的 Agent 开发框架与可视化运维平台。强调类型安全、工具注册和工作流编排能力。

### 2.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 语言 | TypeScript |
| 核心包 | @voltagent/core |
| 内存适配器 | @voltagent/libsql (LibSQL) |
| Web 服务 | @voltagent/server-hono (Hono) |
| LLM 适配 | ai-sdk (Vercel) |
| 工具定义 | Zod |
| 日志 | Pino |
| 协议 | MCP |

### 2.3 核心架构

```mermaid
graph TB
    subgraph VoltAgent 架构
        A[VoltAgent Application<br/>应用层] --> B[Agent Runtime<br/>运行时层]
        B --> C[Tool Registry<br/>工具注册表]
        B --> D[Memory System<br/>记忆系统]
        B --> E[Model Adapter<br/>模型适配器]
        C --> F[MCP Servers<br/>MCP 服务器]
        D --> G[LibSQL Storage<br/>持久化存储]
        E --> H[OpenAI/Anthropic<br/>Google/Groq]
    end
    
    subgraph 工作流引擎
        I[Supervisor Pattern<br/>监督者模式] --> J[Sub-Agents<br/>子 Agent]
        J --> K[Task Distribution<br/>任务分发]
        K --> L[Result Aggregation<br/>结果聚合]
    end
    
    B --- M[Hono Server<br/>Web 服务]
    M --> N[SSE/WebSocket<br/>实时通信]
```

### 2.4 核心特性

- **类型安全的工具系统**: Zod schema 定义工具输入/输出
- **工作流引擎**: 声明式多步骤自动化，支持暂停/恢复
- **Supervisor 模式**: 监督者协调多个子 Agent
- **MCP 原生支持**: 集成 Model Context Protocol
- **多模型支持**: OpenAI, Anthropic, Google 等
- **持久化记忆**: LibSQL 适配器存储 Agent 上下文
- **语音能力**: TTS/STT 集成
- **Guardrails**: 输入输出验证

### 2.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 企业级 Agent 应用开发 | ★★★★★ | 类型安全，生产就绪 |
| 多 Agent 协作系统 | ★★★★★ | Supervisor 模式完善 |
| RAG 知识库应用 | ★★★★☆ | 集成向量存储 |
| 语音交互 Agent | ★★★★☆ | TTS/STT 内置支持 |
| 工作流自动化 | ★★★★★ | 声明式工作流引擎 |

### 2.6 快速开始

```bash
npm create voltagent-app@latest
cd my-voltagent-app
npm install
npm run dev
```

```typescript
import { VoltAgent, Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// 定义工具（类型安全的 Zod Schema）
const weatherTool = {
  name: "get_weather",
  description: "获取指定城市的天气信息",
  parameters: z.object({
    city: z.string().describe("城市名称"),
    country: z.string().optional().describe("国家代码，如 CN、US"),
  }),
  execute: async ({ city, country = "CN" }: { city: string; country?: string }) => {
    // 实际项目中调用天气 API
    console.log(`[weather] 查询 ${city}, ${country}`);
    return {
      city,
      country,
      temperature: 25,
      condition: "晴天",
      humidity: 45,
    };
  },
};

// 初始化持久化记忆
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
});

// 创建 Agent
const agent = new Agent({
  name: "weather-assistant",
  instructions: `你是一个有帮助的天气助手。
    - 使用中文回答
    - 温度单位使用摄氏度
    - 提供穿衣建议`,
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory,
  // Guardrails 配置
  guardrails: {
    input: {
      maxLength: 1000,
      blockPatterns: [/spam/i, /hack/i],
    },
    output: {
      maxLength: 5000,
    },
  },
});

// 启动服务
new VoltAgent({
  agents: { agent },
  server: honoServer({
    cors: { origin: "*" },
  }),
}).listen(3000);

// 测试 API
async function testAgent() {
  const response = await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent: "weather-assistant",
      message: "北京今天的天气怎么样？",
      sessionId: "user-123",
    }),
  });

  const data = await response.json();
  console.log("响应:", data);
}

testAgent();
```

### 2.7 多 Agent 示例

```typescript
import { Supervisor, Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// 创建专业子 Agent
const researcher = new Agent({
  name: "researcher",
  instructions: `你是一个专业的研究员。
    - 负责信息收集和整理
    - 提供事实性回答
    - 引用数据来源`,
  model: openai("gpt-4o"),
  tools: [
    {
      name: "webSearch",
      description: "搜索网络信息",
      parameters: z.object({
        query: z.string().describe("搜索关键词"),
        limit: z.number().optional().default(5),
      }),
      execute: async ({ query, limit = 5 }) => {
        // 实现搜索逻辑
        return [{ title: "相关结果", url: "https://...", snippet: "..." }];
      },
    },
  ],
});

const writer = new Agent({
  name: "writer",
  instructions: `你是一个专业的技术作家。
    - 负责撰写报告和文档
    - 语言简洁专业
    - 结构清晰`,
  model: openai("gpt-4o-mini"),
});

const critic = new Agent({
  name: "critic",
  instructions: `你是一个严格的评审。
    - 评审报告质量和准确性
    - 提供改进建议
    - 评估逻辑完整性`,
  model: openai("gpt-4o"),
});

// 创建 Supervisor
const supervisor = new Supervisor({
  name: "report-supervisor",
  agents: { researcher, writer, critic },
  model: openai("gpt-4o"),
  // 协作模式配置
  mode: "sequential", // sequential | parallel | hierarchical
});

// 执行工作流
async function generateReport() {
  const result = await supervisor.run({
    task: "撰写一份关于 AI Agent 发展趋势的研究报告",
    context: {
      audience: "技术决策者",
      length: "中等",
      format: "结构化报告",
    },
    // 中间结果回调
    onStep: (step: any) => {
      console.log(`[${step.agent}] ${step.status}: ${step.message}`);
    },
  });

  console.log("最终报告:", result.finalOutput);
  console.log("评审意见:", result.critique);
}

generateReport();
```

### 2.8 深度分析

#### 为什么选择 VoltAgent？

**优势分析：**

1. **类型安全**: 深度集成 TypeScript 和 Zod，运行时验证工具参数
2. **多 Agent 编排**: Supervisor 模式成熟，支持复杂协作场景
3. **持久化记忆**: LibSQL 提供可靠的本地持久化
4. **轻量级**: 相比 LangChain 更轻量，适合中型项目
5. **Hono 集成**: 高性能 Web 服务框架

**架构设计理念：**

VoltAgent 采用"工具注册表"模式，所有工具通过统一接口注册：
```
Tool Registry
├── MCP Tools (外部 MCP 服务器)
├── Native Tools (本地定义)
└── Function Tools (动态函数)
```

**Supervisor 模式原理：**

```mermaid
sequenceDiagram
    participant User as 用户
    participant Super as Supervisor
    participant Agent1 as Sub-Agent 1
    participant Agent2 as Sub-Agent 2
    
    User->>Super: 任务请求
    Super->>Super: 任务分解
    Super->>Agent1: 分发子任务 A
    Super->>Agent2: 分发子任务 B
    Agent1-->>Super: 结果 A
    Agent2-->>Super: 结果 B
    Super->>Super: 结果聚合
    Super-->>User: 最终响应
```

#### 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 超简单项目 | 轻量但仍需配置 | 直接 AI SDK |
| Python 为主 | 主要 TypeScript | LangChain Python |
| 已有 LangChain 项目 | 迁移成本高 | 继续 LangChain |
| 超大规模多 Agent | 需企业级编排 | LangGraph, CrewAI |

#### 竞品对比

| 特性 | VoltAgent | LangChain.js | Mastra | SwarmClaw |
|------|-----------|--------------|--------|-----------|
| Supervisor 模式 | 原生支持 | LangGraph 实现 | 工作流引擎 | 层级委托 |
| 记忆持久化 | LibSQL | 多种 | 多种 | 向量存储 |
| MCP 集成 | 原生 | 支持 | 支持 | 支持 |
| Web 服务 | Hono | 需自行集成 | 需集成 | 内置 |
| 类型安全 | Zod 深度 | 类型定义 | 类型定义 | 类型定义 |

---

## 3. ElizaOS

**GitHub**: https://github.com/elizaOS/eliza
**Stars**: 18,376 | **Forks**: 5,537
**官方文档**: https://elizaos.github.io/eliza/
**许可证**: MIT

### 3.1 简介

ElizaOS 是一个开源框架，用于构建自主 AI Agent，支持多渠道连接、插件系统和多 Agent 编排。源自 AI16Z 生态，专注于社交场景和企业自动化。

### 3.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 运行时 | Node.js v24+, Bun |
| 语言 | TypeScript |
| 核心包 | @elizaos/core, @elizaos/agent |
| UI | Vite + React |
| 插件 | @elizaos/app-core, @elizaos/prompts |
| 存储 | PostgreSQL, SQLite |

### 3.3 核心架构

```mermaid
graph TB
    subgraph ElizaOS 系统架构
        A[Client Adapters<br/>客户端适配器] --> B[Agent Runtime<br/>Agent 运行时]
        B --> C[Character System<br/>角色系统]
        B --> D[Memory System<br/>记忆系统]
        B --> E[Action System<br/>动作系统]
        
        F[Plugin Registry<br/>插件注册表] --> E
        G[RAG Pipeline<br/>RAG 管道] --> D
        
        C --> H[Behavior Engine<br/>行为引擎]
        H --> I[Decision Making<br/>决策模块]
        I --> J[Response Generation<br/>响应生成]
    end
    
    subgraph 渠道支持
        K[Discord] --> A
        L[Telegram] --> A
        M[Twitter/X] --> A
        N[Slack] --> A
    end
```

### 3.4 核心特性

- **多渠道支持**: Discord, Telegram, Slack, Twitter 等
- **模型无关**: 支持 OpenAI, Claude, Gemini, Llama, Grok
- **插件系统**: 高度可扩展的插件架构
- **多 Agent 编排**: 支持 Agent 团队协作
- **RAG 文档处理**: 内置文档摄取和检索
- **Web 管理面板**: 实时监控和配置
- **Agent 特性**: 记忆、情绪、决策能力
- **Character 系统**: 可定制的 Agent 角色定义

### 3.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| Discord/Telegram 聊天机器人 | ★★★★★ | 完整渠道适配器 |
| Web3 自动化交易 Agent | ★★★★☆ | 区块链集成 |
| 游戏 NPC 和虚拟角色 | ★★★★★ | Character 系统强大 |
| 客户服务自动化 | ★★★★☆ | 多渠道支持 |
| 多 Agent 社交网络 | ★★★★☆ | 团队协作能力 |

### 3.6 快速开始

```bash
# 全局安装 CLI
bun add -g elizaos

# 创建新项目
elizaos create my-agent --template project
cd my-agent
bun install
bun run dev
```

```typescript
import { Agent, Runtime } from "@elizaos/core";
import { DiscordAdapter } from "@elizaos/adapter-discord";
import { TwitterAdapter } from "@elizaos/adapter-twitter";

// 定义 Agent Character
const agentCharacter = {
  name: "Cyber Assistant",
  description: "一个赛博朋克风格的 AI 助手",
  
  // 提示词配置
  prompts: {
    base: "你是一个赛博朋克世界观的 AI 助手...",
    responses: {
      greeting: "嘿，伙计。欢迎来到赛博空间。",
      farewell: "下次见，数据流的旅人。",
    },
  },
  
  // 能力配置
  capabilities: {
    webSearch: true,
    imageGeneration: false,
    codeExecution: true,
  },
  
  // 记忆配置
  memory: {
    type: "document",
    vectorStore: {
      provider: "pinecone",
      index: "cyber-assistant-memory",
    },
  },
};

// 创建 Agent 实例
const agent = new Agent({
  character: agentCharacter,
  model: "claude-sonnet-4-20250514",
  instructions: "保持赛博朋克风格回应。",
  
  // 配置情绪系统
  emotion: {
    enabled: true,
    decay: 0.95,
    range: [-1, 1],
  },
});

// 配置多个渠道适配器
const discord = new DiscordAdapter({
  token: process.env.DISCORD_TOKEN,
  serverId: "123456789",
  channels: ["general", "ai-chat"],
});

const twitter = new TwitterAdapter({
  apiKey: process.env.TWITTER_API_KEY,
  apiSecret: process.env.TWITTER_API_SECRET,
  mentions: true,
  dms: true,
});

// 创建运行时
const runtime = new Runtime({
  agent,
  adapters: [discord, twitter],
  
  // 配置 RAG
  rag: {
    provider: "local",
    chunkSize: 500,
    overlap: 50,
  },
  
  // 插件配置
  plugins: [
    "@elizaos/plugin-web-search",
    "@elizaos/plugin-image-generation",
  ],
});

// 启动服务
runtime.start();

// 优雅关闭
process.on("SIGINT", () => runtime.stop());
```

### 3.7 插件开发示例

```typescript
import { Plugin, Skill, Action, Provider } from "@elizaos/core";
import { z } from "zod";

// 定义技能
const weatherSkill: Skill = {
  name: "weather",
  description: "查询天气预报",
  actions: [
    {
      name: "getWeather",
      description: "获取指定城市的天气",
      parameters: z.object({
        city: z.string().describe("城市名称"),
        units: z.enum(["celsius", "fahrenheit"]).default("celsius"),
      }),
      handler: async (context: { city: string; units: string }) => {
        // 实现天气查询逻辑
        return {
          city: context.city,
          temperature: 22,
          condition: "多云",
          humidity: 65,
        };
      },
    } as Action,
  ],
};

// 定义 Provider（数据源）
const marketDataProvider: Provider = {
  name: "market-data",
  description: "提供市场数据",
  fetch: async (symbol: string) => {
    // 从 API 获取数据
    return { symbol, price: 150.25, volume: 1000000 };
  },
};

// 创建插件
export const weatherPlugin: Plugin = {
  name: "weather-plugin",
  version: "1.0.0",
  description: "天气查询插件",
  
  // 插件配置
  config: {
    apiKey: process.env.WEATHER_API_KEY,
    defaultUnits: "celsius",
  },
  
  // 注册技能
  skills: [weatherSkill],
  
  // 注册 Provider
  providers: [marketDataProvider],
  
  // 生命周期钩子
  async onLoad() {
    console.log("[weather-plugin] 插件加载完成");
    // 初始化资源
  },
  
  async onUnload() {
    console.log("[weather-plugin] 插件卸载");
    // 清理资源
  },
  
  // 事件监听
  events: {
    "message:received": async (message) => {
      // 处理接收到的消息
    },
  },
};
```

### 3.8 深度分析

#### 为什么选择 ElizaOS？

**优势分析：**

1. **多渠道开箱即用**: 内置主流社交平台适配器，无需自行开发
2. **Character 系统**: 强大的 Agent 角色定制能力
3. **情绪系统**: 内置情绪感知和响应
4. **插件架构**: 高度可扩展，第三方插件丰富
5. **AI16Z 生态**: 依托 AI16Z 社区，持续活跃开发

**Character 系统详解：**

```mermaid
graph LR
    A[Character Definition<br/>角色定义] --> B[Behavior Rules<br/>行为规则]
    A --> C[Response Templates<br/>响应模板]
    A --> D[Memory Banks<br/>记忆库]
    B --> E[Response Generation<br/>响应生成]
    C --> E
    D --> E
```

#### 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 企业级后台应用 | 面向社交场景 | LangChain.js, Mastra |
| 简单 API 集成 | 相对重量级 | VoltAgent |
| 实时金融交易 | 非核心场景 | 专用交易框架 |
| 代码生成辅助 | 非设计目标 | Claude Code |

#### 竞品对比

| 特性 | ElizaOS | SwarmClaw | Claude Code | AutoGPT |
|------|---------|-----------|-------------|---------|
| 定位 | 社交 Agent | 通用 Agent | 编码助手 | 自动化 Agent |
| 渠道支持 | 多种 | 多种 | 无 | 多种 |
| Character 系统 | 完整 | 基础 | 无 | 无 |
| 插件生态 | 丰富 | 中等 | MCP | 丰富 |
| Web UI | 完整 | 基础 | 无 | 完整 |

---

## 4. Flowise

**GitHub**: https://github.com/FlowiseAI/Flowise
**Stars**: 52,840 | **Forks**: 24,342
**官方文档**: https://flowiseai.com/
**许可证**: Apache License 2.0

### 4.1 简介

Flowise 是一个低代码/无代码平台，用于可视化构建 AI Agent 和 LLM 应用。通过拖拽组件，用户可以快速创建复杂的 AI 工作流，无需编写代码。

### 4.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 后端 | Node.js |
| 前端 | React |
| 包管理 | PNPM |
| 数据库 | PostgreSQL, SQLite |
| 部署 | Docker, 云服务 |
| LLM 支持 | OpenAI, Anthropic, Azure, 本地模型 |

### 4.3 核心架构

```mermaid
graph TB
    subgraph Flowise 系统架构
        A[Flowise UI<br/>可视化编辑器] --> B[Flow Engine<br/>流程引擎]
        B --> C[Node Registry<br/>节点注册表]
        C --> D[LLM Nodes<br/>LLM 节点]
        C --> E[Tool Nodes<br/>工具节点]
        C --> F[Memory Nodes<br/>记忆节点]
        C --> G[RAG Nodes<br/>RAG 节点]
        
        B --> H[Data Sources<br/>数据源]
        B --> I[Vector Stores<br/>向量存储]
        
        J[API Layer<br/>API 层] --> B
        K[Auth & Users<br/>认证用户] --> J
    end
    
    subgraph 节点类型
        L[Chat Model] --> D
        M[Completion Model] --> D
        N[Web Search] --> E
        O[Calculator] --> E
        P[Buffer Memory] --> F
        Q[Document Loader] --> G
        R[Vector Store Retriever] --> G
    end
```

### 4.4 核心特性

- **可视化编辑器**: 拖拽式流程构建
- **丰富的节点库**: LLM、向量存储、工具、链式调用
- **多模型支持**: OpenAI, Claude, Gemini, Llama 等
- **RAG 流程**: 内置文档摄取和检索流程
- **Agent 类型**: 对话 Agent、工具 Agent、ReAct Agent
- **团队协作**: 分享和版本控制
- **API 导出**: 一键生成 API 调用代码
- **本地部署**: 完全自托管，数据隐私

### 4.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 快速原型验证 AI 应用 | ★★★★★ | 拖拽即可创建 |
| 非技术用户构建 AI 工作流 | ★★★★★ | 无需编码 |
| 企业内部 AI 工具搭建 | ★★★★☆ | 自托管保证隐私 |
| 客户支持聊天机器人 | ★★★★☆ | 快速部署 |
| 知识库问答系统 | ★★★★★ | 完整 RAG 节点 |

### 4.6 快速开始

```bash
# 全局安装
npm install -g flowise

# 启动服务
npx flowise start

# 或使用 Docker
docker run -p 3000:3000 flowiseai/flowise
```

访问 http://localhost:3000 打开可视化编辑器。

### 4.7 API 调用示例

```bash
# 创建 Chatflow
curl -X POST http://localhost:3000/api/v1/chatflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Chatbot",
    "flowData": "{...}"
  }'
```

```typescript
// 前端集成示例
class FlowiseChatbot {
  private flowId: string;
  private apiBase: string;

  constructor(flowId: string, apiBase = "http://localhost:3000") {
    this.flowId = flowId;
    this.apiBase = apiBase;
  }

  // 流式对话
  async *chatStream(message: string, sessionId?: string) {
    const response = await fetch(
      `${this.apiBase}/api/v1/prediction/${this.flowId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: message,
          streaming: true,
          chatId: sessionId || crypto.randomUUID(),
        }),
      }
    );

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      
      // 解析 SSE 数据
      // format: data: {"type":"chunk","content":"..."}\n\n
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          if (data.type === "chunk") {
            yield data.content;
          }
        }
      }
    }
  }

  // 同步对话（简单场景）
  async chat(message: string, sessionId?: string): Promise<string> {
    const response = await fetch(
      `${this.apiBase}/api/v1/prediction/${this.flowId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: message,
          chatId: sessionId || crypto.randomUUID(),
        }),
      }
    );

    const data = await response.json();
    return data.text || data.response;
  }
}

// 使用示例
async function main() {
  const chatbot = new FlowiseChatbot("your-flow-id");
  
  // 流式输出
  console.log("AI: ");
  for await (const chunk of chatbot.chatStream("你好，请介绍一下你自己")) {
    process.stdout.write(chunk);
  }
  console.log("\n");
}

main();
```

### 4.8 深度分析

#### 为什么选择 Flowise？

**优势分析：**

1. **零编码**: 拖拽即可创建复杂 AI 工作流
2. **快速原型**: 几分钟内完成应用原型
3. **52K Stars**: 最大的可视化 AI 编排平台
4. **API 导出**: 一键生成集成代码
5. **自托管**: 完全控制数据，隐私保证

**可视化编排原理：**

```mermaid
graph LR
    A[User drags nodes<br/>拖拽节点] --> B[Canvas State<br/>画布状态]
    B --> C[Node Configuration<br/>节点配置]
    C --> D[Flow JSON<br/>流程配置]
    D --> E[Execution Engine<br/>执行引擎]
    E --> F[Result Output<br/>结果输出]
```

#### 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 复杂定制逻辑 | 可视化限制 | LangChain.js 代码 |
| 大规模生产部署 | 单体架构 | LangGraph 分布式 |
| 嵌入式集成 | 需要独立服务 | Vercel AI SDK |
| 实时性要求高 | 有额外延迟 | 直接 API |

#### 竞品对比

| 特性 | Flowise | Dify | LangFlow | AutoGPT |
|------|---------|------|----------|---------|
| 界面 | React Web | React Web | Python Tk | Web UI |
| 部署 | Docker/云 | Docker/云 | 本地 | Docker |
| 节点丰富度 | 高 | 高 | 中 | 中 |
| API 支持 | 完整 | 完整 | 有限 | 完整 |
| 团队协作 | 是 | 是 | 否 | 是 |

---

## 5. Mastra

**GitHub**: https://github.com/mastra-ai/mastra
**Stars**: 23,922 | **Forks**: 2,076
**官方文档**: https://mastra.ai/
**许可证**: MIT

### 5.1 简介

Mastra 是由 Gatsby 团队打造的 TypeScript AI 应用框架，专注于从原型到生产的 AI 应用开发。提供 Agent、Workflow、Model routing 等完整能力。

### 5.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 语言 | TypeScript |
| 运行时 | Node.js |
| 框架集成 | React, Next.js |
| 协议 | MCP (Model Context Protocol) |
| AI SDK | Vercel AI SDK |
| 监控 | 内置 evals, observability |

### 5.3 核心架构

```mermaid
graph TB
    subgraph Mastra 架构
        A[Mastra Application<br/>Mastra 应用] --> B[Agent Runtime<br/>Agent 运行时]
        B --> C[Tool System<br/>工具系统]
        B --> D[Memory Manager<br/>记忆管理]
        B --> E[Context Manager<br/>上下文管理]
        
        F[Workflow Engine<br/>工作流引擎] --> B
        G[Step Orchestration<br/>步骤编排] --> F
        H[Branch Logic<br/>分支逻辑] --> F
        
        I[Model Router<br/>模型路由] --> J[OpenAI<br/>Anthropic<br/>Google<br/>Ollama]
        
        K[MCP Integration<br/>MCP 集成] --> C
    end
    
    subgraph 工作流 API
        L[.then()] --> G
        M[.branch()] --> H
        N[.parallel()] --> G
    end
```

### 5.4 核心特性

- **Model Routing**: 统一接口连接 40+ AI 提供商
- **Agent 构建**: 自主推理和工具使用
- **工作流引擎**: 图编排支持 `.then()`, `.branch()`, `.parallel()`
- **Human-in-the-Loop**: 暂停/恢复执行等待用户确认
- **上下文管理**: 对话历史、语义召回、工作记忆
- **MCP 服务器**: 内置 MCP 服务器创建能力
- **评估工具**: 内置 AI 行为评估
- **监控仪表盘**: 实时观察 Agent 行为

### 5.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 构建自主 AI Agent | ★★★★★ | 完整 Agent 生命周期 |
| 复杂多步骤业务流程编排 | ★★★★★ | 强大工作流引擎 |
| React/Next.js AI 应用 | ★★★★★ | 官方集成 |
| 人机协作工作流 | ★★★★★ | Human-in-the-Loop |
| 企业数据源集成 | ★★★★☆ | MCP 和数据源集成 |

### 5.6 快速开始

```bash
npm create mastra@latest
cd my-mastra-app
npm install
npm run dev
```

```typescript
import { Agent, Workflow, Step, Memory } from "@mastra/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// 定义工具
const searchTool = {
  name: "webSearch",
  description: "搜索网络信息",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词"),
  }),
  execute: async ({ query }: { query: string }) => {
    console.log(`[search] 搜索: ${query}`);
    return `关于 "${query}" 的搜索结果...`;
  },
} as Tool;

const summarizeTool = {
  name: "summarize",
  description: "总结文本内容",
  inputSchema: z.object({
    text: z.string().describe("待总结的文本"),
    maxLength: z.number().optional().default(200),
  }),
  execute: async ({ text, maxLength = 200 }: { text: string; maxLength?: number }) => {
    return text.slice(0, maxLength) + "...";
  },
} as Tool;

// 创建专业 Agent
const researcher = new Agent({
  name: "researcher",
  instructions: `你是一个专业的研究助手。
    - 擅长信息收集和分析
    - 提供结构化的研究报告
    - 引用可靠来源`,
  model: openai("gpt-4o"),
  tools: [searchTool],
});

const summarizer = new Agent({
  name: "summarizer",
  instructions: "你负责将长文本总结为简洁的要点。",
  model: openai("gpt-4o-mini"),
  tools: [summarizeTool],
});

// 创建工作流
const researchWorkflow = new Workflow({
  name: "research-workflow",
  triggerSchema: z.object({
    topic: z.string().describe("研究主题"),
    depth: z.enum(["basic", "detailed"]).default("basic"),
  }),
});

// 定义工作流步骤
researchWorkflow
  .step(
    new Step({
      id: "search",
      agent: researcher,
      outputSchema: z.object({
        findings: z.array(z.string()),
        sources: z.array(z.string()),
      }),
    })
  )
  .then(
    new Step({
      id: "summarize",
      agent: summarizer,
      input: (context) => ({
        text: context.get("search").findings.join("\n"),
      }),
      outputSchema: z.object({
        summary: z.string(),
      }),
    })
  )
  .branch({
    if: (context) => context.trigger().depth === "detailed",
    then: new Step({
      id: "deep-dive",
      agent: researcher,
    }),
  });

// 添加并行处理步骤（可选）
researchWorkflow.step(
  new Step({
    id: "background-check",
    agent: researcher,
  })
).parallel({
  name: "parallel-research",
  steps: ["search", "background-check"],
});

// 运行工作流
async function runResearchWorkflow() {
  const result = await researchWorkflow.run({
    input: { topic: "AI Agent 的发展趋势", depth: "detailed" },
  });

  console.log("搜索结果:", result.get("search"));
  console.log("摘要:", result.get("summarize"));
  
  // 获取完整执行轨迹
  console.log("执行轨迹:", result.steps);
}

runResearchWorkflow();
```

### 5.7 Human-in-the-Loop 示例

```typescript
import { Workflow, Step, PausePoint } from "@mastra/core";

const approvalWorkflow = new Workflow({
  name: "content-approval",
});

// 定义暂停点
approvalWorkflow.step(
  new Step({
    id: "generate-content",
    output: "draft",
  })
).pauseAt({
  // 暂停等待人工审批
  point: PausePoint.BEFORE_STEP,
  stepId: "publish",
  timeout: 24 * 60 * 60 * 1000, // 24小时超时
});

// 审批步骤
approvalWorkflow.step(
  new Step({
    id: "publish",
    condition: (context) => context.get("approval").approved === true,
  })
);

// 处理审批
async function handleApproval() {
  const pendingApprovals = await approvalWorkflow.getPendingApprovals();
  
  for (const approval of pendingApprovals) {
    console.log(`待审批: ${approval.content}`);
    
    // 模拟人工审批
    const isApproved = await simulateHumanApproval(approval);
    
    await approvalWorkflow.resolveApproval({
      stepId: approval.stepId,
      workflowRunId: approval.runId,
      decision: {
        approved: isApproved,
        comments: isApproved ? "通过" : "需要修改",
        approver: "admin@example.com",
      },
    });
  }
}
```

### 5.8 深度分析

#### 为什么选择 Mastra？

**优势分析：**

1. **工作流引擎强大**: 支持复杂的步骤编排、分支逻辑、并行处理
2. **Human-in-the-Loop**: 内置审批流程，适合企业场景
3. **Model Routing**: 40+ 提供商统一接口
4. **Next.js 集成**: 官方推荐的 React 框架
5. **评估工具**: 内置 AI 行为评估能力

**工作流编排原理：**

```mermaid
sequenceDiagram
    participant T as Trigger
    participant W as Workflow Engine
    participant S1 as Step 1
    participant S2 as Step 2
    participant S3 as Step 3
    
    T->>W: 触发工作流
    W->>S1: 执行步骤 1
    S1-->>W: 输出结果
    W->>W: 判断分支条件
    alt 条件 A
        W->>S2: 执行步骤 2
        S2-->>W: 结果
    else 条件 B
        W->>S3: 执行步骤 3
        S3-->>W: 结果
    end
    W-->>T: 返回最终结果
```

#### 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 轻量级 API 调用 | 相对重量级 | Vercel AI SDK |
| 可视化流程构建 | 纯代码方式 | Flowise |
| 简单聊天机器人 | 功能过剩 | ElizaOS |
| Python 项目 | TypeScript 优先 | LangChain Python |

#### 竞品对比

| 特性 | Mastra | LangChain.js | VoltAgent | Flowise |
|------|--------|--------------|-----------|---------|
| 工作流引擎 | 强大 | 需 LangGraph | 中等 | 可视化 |
| Human-in-the-Loop | 原生支持 | 需实现 | 需实现 | 需实现 |
| 模型路由 | 40+ | 多种 | 多种 | 多种 |
| MCP 支持 | 是 | 是 | 是 | 是 |
| React 集成 | 官方 | 第三方 | 第三方 | 无 |
| 评估工具 | 内置 | LangSmith | 需集成 | 需集成 |

---

## 6. Composio

**GitHub**: https://github.com/ComposioHQ/composio
**Stars**: 28,261 | **Forks**: 4,564
**官方文档**: https://docs.composio.dev/
**许可证**: MIT

### 6.1 简介

Composio 是一个 AI Agent 开发平台，提供 1000+ 工具包、工具搜索、上下文管理、认证和沙箱执行环境。支持 TypeScript 和 Python 双语言 SDK。

### 6.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 语言 | TypeScript, Python |
| Node.js | >=18 |
| Python | >=3.10 |
| 协议 | MCP (Model Context Protocol) |
| 集成 | LangChain, LangGraph, CrewAI, Vercel AI |
| 工具数量 | 1000+ |

### 6.3 核心架构

```mermaid
graph TB
    subgraph Composio 平台架构
        A[Agent SDK<br/>Agent SDK] --> B[Tool Gateway<br/>工具网关]
        B --> C[Authentication Layer<br/>认证层]
        B --> D[Tool Registry<br/>工具注册表]
        
        D --> E[1000+ Tools<br/>1000+ 工具]
        D --> F[MCP Servers<br/>MCP 服务器]
        D --> G[Custom Tools<br/>自定义工具]
        
        C --> H[OAuth Manager<br/>OAuth 管理]
        C --> I[API Key Manager<br/>API Key 管理]
        C --> J[Sandbox Executor<br/>沙箱执行]
        
        K[Context Manager<br/>上下文管理] --> A
        L[Tool Selector<br/>工具选择器] --> B
    end
    
    subgraph 支持平台
        M[GitHub] --> E
        N[Gmail] --> E
        O[Slack] --> E
        P[Notion] --> E
        Q[Salesforce] --> E
    end
```

### 6.4 核心特性

- **1000+ 工具包**: GitHub, Gmail, Slack, Notion 等
- **多框架支持**: OpenAI, Anthropic, Google, LangChain, Mastra 等
- **认证管理**: OAuth, API Key, 自定义认证流程
- **触发器系统**: 订阅外部事件触发工作流
- **MCP 集成**: Rube MCP 服务器支持 500+ 应用
- **工具搜索**: AI 驱动选择最优工具
- **沙箱执行**: 安全执行不受信任的工具代码
- **上下文管理**: 智能上下文裁剪和管理

### 6.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 扩展 Agent 能力边界 | ★★★★★ | 1000+ 工具覆盖 |
| 企业应用集成自动化 | ★★★★★ | OAuth 认证完善 |
| 跨平台工作流编排 | ★★★★☆ | 多工具协同 |
| 开发 Agent 原型 | ★★★★☆ | 快速集成 |
| 安全执行外部代码 | ★★★★☆ | 沙箱隔离 |

### 6.6 快速开始

```bash
# TypeScript SDK
npm install @composio/core

# Python SDK
pip install composio
```

```typescript
import { Composio } from "@composio/core";
import { Agent, run } from "@openai/agents";

// 初始化 Composio
const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
});

// 创建会话
const session = composio.create({
  userId: "user@acme.org",
  // 配置认证
  auth: {
    github: {
      type: "oauth",
      scopes: ["repo", "read:user"],
    },
  },
});

// 获取工具
const tools = await session.tools.get({
  toolkits: ["github", "gmail"],
  actions: [
    "github_fork_repository",
    "github_create_issue",
    "gmail_send_email",
  ],
  // 过滤条件
  filter: {
    categories: ["code", "communication"],
    maxResults: 10,
  },
});

// 创建 Agent
const agent = new Agent({
  name: "dev-assistant",
  instructions: `你是一个专业的开发助手。
    - 帮助处理 GitHub 操作
    - 管理邮件通信
    - 保持专业和高效`,
  tools: tools,
});

// 运行 Agent
async function handleUserRequest(userMessage: string) {
  const result = await run(agent, userMessage);
  
  console.log("最终输出:", result.finalOutput);
  console.log("执行的操作:", result.toolCalls);
  console.log("消耗的 token:", result.usage);
  
  return result;
}

// 使用示例
handleUserRequest(
  "帮我 fork anthropics/claude-code 仓库，然后创建一个 issue，标题是 'Test Issue'"
);
```

### 6.7 MCP 模式使用

```typescript
import { Composio } from "@composio/core";

// MCP 模式：无需特定 provider 包
async function mcpMode() {
  const composio = new Composio();
  const session = composio.create({ userId: "user123" });

  // 获取 MCP 服务器配置
  const mcpConfig = await session.mcp.getConfig({
    toolkits: ["filesystem", "websearch"],
  });

  console.log("MCP Server Config:", mcpConfig);
  
  // 启动 MCP 服务器
  const mcpServer = await session.mcp.start({
    port: 3001,
    config: mcpConfig,
  });

  console.log(`MCP Server running at ${mcpServer.url}`);
  
  // 通过 stdio 连接（用于 Claude Desktop 等）
  const stdioConfig = await session.mcp.getStdioConfig();
  console.log("Stdio command:", stdioConfig.command);
  
  return mcpServer;
}

// 本地开发模式
async function localDevelopment() {
  const composio = new Composio({
    mode: "local", // 使用本地工具执行
  });

  const session = composio.create({
    userId: "dev-user",
  });

  // 直接执行工具（无需 API Key）
  const result = await session.tools.execute({
    name: "calculator",
    parameters: { expression: "2 + 2" },
  });

  console.log("Result:", result);
}

mcpMode();
```

### 6.8 深度分析

#### 为什么选择 Composio？

**优势分析：**

1. **工具数量**: 1000+ 预置工具，覆盖主流应用
2. **认证管理**: OAuth/API Key 统一管理，开箱即用
3. **多框架集成**: 与 LangChain, CrewAI, Vercel AI 无缝集成
4. **MCP 生态**: 深度 MCP 协议支持
5. **工具搜索**: AI 驱动的工具选择

**工具选择原理：**

```mermaid
graph LR
    A[User Request] --> B[Tool Selector<br/>工具选择器]
    B --> C[Semantic Matching<br/>语义匹配]
    B --> D[Permission Check<br/>权限检查]
    B --> E[Context Window<br/>上下文窗口]
    
    C --> F[Top-K Tools<br/>Top-K 工具]
    D --> F
    E --> F
    
    F --> G[Filtered Tools<br/>过滤后工具]
    G --> H[Agent Execution<br/>Agent 执行]
```

#### 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 简单 API 调用 | 过度集成 | 直接 SDK |
| 自定义工具为主 | 平台优势不明显 | 自行实现 |
| 离线环境 | 需要 Composio 云服务 | 本地框架 |
| 严格数据隔离 | 云服务依赖 | 私有化部署框架 |

#### 竞品对比

| 特性 | Composio | LangChain Tools | Zapier | Make |
|------|----------|----------------|--------|------|
| 工具数量 | 1000+ | 有限 | 5000+ | 1000+ |
| AI 原生 | 是 | 是 | 部分 | 部分 |
| 框架集成 | 多种 | LangChain | 无 | 无 |
| MCP 支持 | 是 | 部分 | 否 | 否 |
| 认证管理 | 完整 | 需自行实现 | 完整 | 完整 |
| 定价 | 免费额度 | 开源免费 | 付费 | 付费 |

#### 性能基准数据

| 操作 | 延迟 | 说明 |
|------|------|------|
| 工具列表获取 | ~100ms | 缓存后更快 |
| OAuth 授权 | ~500ms | 含网络延迟 |
| 工具执行 | ~200ms | 含 API 调用 |
| 上下文管理 | ~50ms | 裁剪计算 |

---

## 7. SwarmClaw

**GitHub**: https://github.com/swarmclawai/swarmclaw
**Stars**: 482 | **Forks**: 99
**官方文档**: https://swarmclaw.ai/
**许可证**: AGPL

### 7.1 简介

SwarmClaw 是开源自托管 AI Agent 运行时和多 Agent 框架，支持 Agent 集群、记忆持久化、MCP 工具和 23+ LLM 提供商。定位为 Claude Code 和 LangChain 的开源替代。

### 7.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 语言 | TypeScript |
| 运行时 | Node.js 22.6+ |
| 前端 | React/Electron |
| 部署 | Docker |
| 协议 | MCP, OpenTelemetry OTLP |
| LLM 提供商 | 23+ |

### 7.3 核心架构

```mermaid
graph TB
    subgraph SwarmClaw 架构
        A[SwarmClaw Runtime<br/>运行时] --> B[Agent Cluster<br/>Agent 集群]
        B --> C[Lead Agent<br/>主导 Agent]
        C --> D[Sub-Agents<br/>子 Agent]
        
        E[Memory System<br/>记忆系统] --> B
        F[Tool Registry<br/>工具注册表] --> B
        G[MCP Gateway<br/>MCP 网关] --> F
        
        H[Web UI<br/>Web 界面] --> A
        I[API Layer<br/>API 层] --> A
        
        J[LLM Providers<br/>LLM 提供商] --> B
    end
    
    subgraph 委托机制
        C -->|层级委托| D1[Dev Agent]
        D1 -->|辅助| D2[QA Agent]
        D1 -->|辅助| D3[Design Agent]
    end
```

### 7.4 核心特性

- **23+ LLM 提供商**: Claude, GPT, Gemini, Ollama, DeepSeek 等
- **Agent 委托**: 多 Agent 层级委托机制
- **持久化记忆**: 反思和日志系统
- **MCP 服务集成**: 连接 MCP 工具
- **技能系统**: 对话生成技能
- **连接器**: Discord, Slack, Telegram 等
- **加密钱包**: Solana/Ethereum 集成
- **Web UI**: 可视化 Agent 管理

### 7.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 个人 AI 助手 | ★★★★☆ | 多模型支持 |
| 虚拟公司 Agent 团队 | ★★★★☆ | 层级委托 |
| 开发团队（Lead, Dev, QA） | ★★★★☆ | 角色分工 |
| 内容创作工作室 | ★★★★☆ | 多 Agent 协作 |
| 加密货币操作 | ★★★☆☆ | 钱包集成 |

### 7.6 快速开始

```bash
# npm 全局安装
npm i -g @swarmclawai/swarmclaw
swarmclaw
# 访问 http://localhost:3456
```

```bash
# Docker 部署
git clone https://github.com/swarmclawai/swarmclaw.git
cd swarmclaw
docker compose up -d --build
```

```typescript
import { SwarmClaw, Agent, Memory } from "@swarmclawai/core";
import { z } from "zod";

// 创建专业 Agent
const leadDeveloper = new Agent({
  name: "lead-developer",
  role: "tech-lead",
  instructions: `你是一个经验丰富的技术负责人。
    - 负责架构设计和代码审查
    - 协调团队工作
    - 确保代码质量`,
  model: "claude-3-opus",
  memory: new Memory({
    type: "vector",
    provider: "chromadb",
  }),
  tools: [
    {
      name: "codeReview",
      description: "审查代码质量",
      parameters: z.object({
        code: z.string(),
        language: z.string(),
      }),
    },
  ],
});

const codeAgent = new Agent({
  name: "code-developer",
  role: "developer",
  instructions: "你是一个高效的开发者，负责实现功能代码。",
  model: "gpt-4o",
  memory: new Memory({ type: "vector" }),
});

const qaAgent = new Agent({
  name: "qa-tester",
  role: "qa",
  instructions: "你是一个细致的 QA，负责测试和找 bug。",
  model: "gemini-pro",
  memory: new Memory({ type: "vector" }),
});

// 创建 Agent 集群
const swarm = new SwarmClaw({
  name: "development-team",
  
  // 层级配置
  hierarchy: {
    lead: leadDeveloper,
    members: [codeAgent, qaAgent],
    // 委托规则
    delegationRules: {
      codeWriting: "code-developer",
      codeReview: "lead-developer",
      testing: "qa-tester",
    },
  },
  
  // MCP 集成
  mcp: {
    servers: [
      "filesystem",
      "github",
    ],
  },
  
  // Web UI 配置
  ui: {
    port: 3456,
    auth: {
      enabled: true,
      type: "local",
    },
  },
});

// 启动集群
async function startTeam() {
  await swarm.start();
  console.log(`SwarmClaw running at http://localhost:3456`);
  
  // 提交任务
  const task = "实现一个用户登录功能";
  const result = await swarm.assignTask(task, {
    priority: "high",
    deadline: "2h",
  });
  
  console.log("任务结果:", result);
}

startTeam();
```

### 7.7 层级委托示例

```typescript
// 高级用法：自定义委托策略
const swarm = new SwarmClaw({
  name: "custom-team",
  
  // 委托策略配置
  delegation: {
    // 自动判断委托
    autoDelegate: true,
    
    // 委托规则
    rules: [
      {
        trigger: /code|implement|build|write/i,
        assignTo: "code-developer",
      },
      {
        trigger: /test|bug|fix/i,
        assignTo: "qa-tester",
      },
      {
        trigger: /architecture|design|review/i,
        assignTo: "lead-developer",
      },
    ],
    
    // 回退策略
    fallback: "lead-developer",
    
    // 并行执行阈值
    parallelThreshold: 3,
  },
  
  // 反思配置
  reflection: {
    enabled: true,
    interval: "1h",
    minConfidence: 0.7,
  },
});

// 创建技能
swarm.defineSkill({
  name: "code-review",
  description: "代码审查技能",
  trigger: ["review", "check code"],
  actions: async (context) => {
    const code = context.message;
    const issues = await performCodeReview(code);
    return {
      score: issues.score,
      issues: issues.items,
      suggestions: issues.recommendations,
    };
  },
});
```

### 7.8 深度分析

#### 为什么选择 SwarmClaw？

**优势分析：**

1. **开源替代**: Claude Code 的开源替代方案
2. **多模型支持**: 23+ LLM 提供商
3. **层级委托**: 成熟的多 Agent 协作机制
4. **自托管**: 完全开源，可本地部署
5. **Web UI**: 内置可视化界面

**与 Claude Code 对比：**

| 特性 | SwarmClaw | Claude Code |
|------|-----------|-------------|
| 许可证 | AGPL | 专有 + SDK Apache 2.0 |
| 部署方式 | 自托管 | 云端 |
| 多 Agent | 原生支持 | 单 Agent |
| Web UI | 是 | 否 |
| MCP 支持 | 是 | 是 |
| 模型选择 | 23+ | Anthropic 优先 |
| 加密集成 | 是 | 否 |

#### 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 需要商业支持 | AGPL 限制 | Claude Code |
| 快速原型 | 配置复杂 | Flowise |
| 轻量级需求 | 相对重量级 | 直接 AI SDK |
| 生产级可靠性 | 社区较小 | LangChain.js |

#### 竞品对比

| 特性 | SwarmClaw | Claude Code | LangChain.js | ElizaOS |
|------|-----------|-------------|--------------|---------|
| 开源 | 是 | 部分 | 是 | 是 |
| 多 Agent | 是 | 否 | 是 | 是 |
| Web UI | 是 | 否 | 否 | 是 |
| 模型数量 | 23+ | Anthropic | 多种 | 多种 |
| MCP 支持 | 是 | 是 | 是 | 是 |
| 加密集成 | 是 | 否 | 否 | 否 |
| Stars | 482 | 123,919 | 17,672 | 18,376 |

---

## 8. Claude Code

**GitHub**: https://github.com/anthropics/claude-code
**Stars**: 123,919 | **Forks**: 20,422
**官方文档**: https://docs.anthropic.com/en/docs/claude-code
**许可证**: 专有 + CLAUDE CODE AGENTS SDK (Apache 2.0)

### 8.1 简介

Claude Code 是 Anthropic 官方出品的终端 Agent 编码工具，理解代码库上下文，通过自然语言命令执行日常任务、处理 Git 工作流。

### 8.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 安装方式 | curl, Homebrew, winget |
| 配置 | CLAUDE.md 文件 |
| 扩展 | MCP 服务器 |
| 数据收集 | 可控制 |

### 8.3 核心架构

```mermaid
graph TB
    subgraph Claude Code 架构
        A[Terminal Interface<br/>终端界面] --> B[Agent Core<br/>Agent 核心]
        B --> C[Context Builder<br/>上下文构建]
        B --> D[Task Executor<br/>任务执行器]
        
        C --> E[File Reader<br/>文件读取]
        C --> F[Git Analyzer<br/>Git 分析]
        C --> G[Project Structure<br/>项目结构]
        
        D --> H[Read/Write<br/>读写文件]
        D --> I[Command Runner<br/>命令执行]
        D --> J[Git Operations<br/>Git 操作]
        
        K[MCP Servers<br/>MCP 服务器] --> B
    end
    
    subgraph 配置层
        L[CLAUDE.md] --> B
        M[.claude/] --> B
        N[Environment<br/>环境变量] --> B
    end
```

### 8.4 核心特性

- **终端 Agent**: 在终端中与代码库交互
- **代码库理解**: 自动分析项目结构和上下文
- **任务执行**: 读写文件、运行命令、Git 操作
- **自然语言**: 通过对话描述任务
- **MCP 插件**: 扩展工具能力
- **GitHub 集成**: @mention 支持
- **安全设计**: 默认安全，不主动执行危险操作
- **可配置**: CLAUDE.md 和 MCP 服务器灵活配置

### 8.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 日常编码辅助 | ★★★★★ | 官方工具，深度集成 |
| 代码审查 | ★★★★☆ | 快速 Review |
| Git 工作流自动化 | ★★★★★ | 完整的 Git 操作 |
| 新项目探索 | ★★★★★ | 理解代码库 |
| 快速原型开发 | ★★★★☆ | 高效开发 |
| 重构和迁移 | ★★★★☆ | 理解后重构 |

### 8.6 快速开始

```bash
# macOS/Linux
curl -fsSL https://download.anthropic.com/claude-code/installer.sh | sh

# Windows
winget install Anthropic.CaudeCode

# 初始化
claude
```

### 8.7 CLAUDE.md 配置示例

```markdown
# CLAUDE.md

## 项目概述
这是一个 React + TypeScript 前端项目。

## 技术栈
- React 18
- TypeScript 5
- Vite
- Tailwind CSS

## 代码规范
- 使用 ESLint + Prettier
- 组件使用 PascalCase 命名
- 优先使用函数组件和 Hooks
- 使用 CSS Modules 或 Tailwind

## 测试要求
- 新功能需要添加测试
- 运行 `npm test` 验证
- 单元测试覆盖率 > 80%

## 安全要求
- 敏感信息使用环境变量
- 禁止在代码中硬编码密钥

## 开发流程
1. 创建 feature 分支
2. 实现功能
3. 添加测试
4. 提交 PR
5. Code Review
```

### 8.8 MCP 集成示例

```bash
# 安装官方 MCP 服务器
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem ./path/to/project

claude mcp add github -- npx -y @modelcontextprotocol/server-github

claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking

# 查看已安装的 MCP 服务器
claude mcp list

# 移除 MCP 服务器
claude mcp remove github
```

### 8.9 Claude Code Agents SDK

Claude Code 提供了 Agents SDK (Apache 2.0)，可用于构建自定义 Agent 应用：

```typescript
// 使用 Claude Code Agents SDK
import { Anthropic } from "@anthropic-ai/claude-code";
import { ToolUseProblem } from "@anthropic-ai/claude-code/tools";

// 创建 Claude Code 风格的 Agent
const client = new Anthropic();

async function codingAssistant() {
  // 初始化 Agent
  const agent = await client.agent({
    model: "claude-sonnet-4-20250514",
    system: [
      "你是一个专业的编程助手。",
      "专注于编写高质量、可维护的代码。",
      "在执行操作前先解释你的计划。",
    ].join("\n"),
    
    tools: [
      {
        name: "read_file",
        description: "读取文件内容",
        input_schema: {
          type: "object",
          properties: {
            path: { type: "string" },
          },
          required: ["path"],
        },
      },
      {
        name: "write_file",
        description: "写入文件内容",
        input_schema: {
          type: "object",
          properties: {
            path: { type: "string" },
            content: { type: "string" },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "run_command",
        description: "运行 shell 命令",
        input_schema: {
          type: "object",
          properties: {
            command: { type: "string" },
            cwd: { type: "string" },
          },
          required: ["command"],
        },
      },
    ],
  });

  // 对话交互
  const response = await agent.userMessage(
    "帮我创建一个新的 React 组件，使用 TypeScript 和 Tailwind CSS"
  );

  console.log(response);
  
  // 继续对话
  const followUp = await agent.userMessage("修改这个组件，添加 prop types");
  console.log(followUp);
}

codingAssistant();
```

### 8.10 深度分析

#### Claude Code 的设计哲学

**1. 安全优先**
```mermaid
graph TB
    A[User Request] --> B{Confirm?<br/>确认?}
    B -->|No| C[Cancel]
    B -->|Yes| D[Execute]
    D --> E{Validate<br/>验证?}
    E -->|Dangerous| F[Block]
    E -->|Safe| G[Proceed]
    G --> H[Execute Command]
    H --> I[Review Result]
```

**2. 上下文感知**
- 自动读取相关文件
- 分析项目结构
- 理解依赖关系
- 维护对话历史

**3. 智能操作**
- 分步骤执行复杂任务
- 自动重试失败操作
- 提供替代方案
- 解释操作原因

#### 为什么选择 Claude Code？

**优势分析：**

1. **官方工具**: Anthropic 官方出品，最佳 Claude 集成
2. **代码库理解**: 深度理解项目结构和上下文
3. **安全设计**: 确认机制防止意外操作
4. **Git 集成**: 完整的 Git 工作流支持
5. **MCP 扩展**: 丰富的扩展能力

#### 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 非编码任务 | 专注于编码 | 通用 Agent |
| 后端服务开发 | 终端交互限制 | API 框架 |
| 团队协作平台 | 单用户设计 | GitHub Copilot |
| 实时监控 | 按需调用 | 专用监控工具 |

#### 性能基准数据

| 操作 | 延迟 | 说明 |
|------|------|------|
| 启动 | ~2s | 包含模型加载 |
| 文件读取 | ~100ms | 取决于文件大小 |
| 命令执行 | 依赖命令 | 原生命令 |
| 代码生成 | ~500ms | 取决于复杂度 |

#### 与 GitHub Copilot 对比

| 特性 | Claude Code | GitHub Copilot |
|------|-------------|---------------|
| 交互方式 | 终端对话 | IDE 补全 |
| 上下文范围 | 代码库全局 | 当前文件 |
| 操作能力 | 读写文件、执行命令 | 代码补全 |
| MCP 支持 | 是 | 否 |
| 多模型支持 | Anthropic 优先 | GPT-4 |
| 价格 | 包含在订阅中 | Copilot 订阅 |

---

## 9. AutoGPT

**GitHub**: https://github.com/Significant-Gravitas/AutoGPT
**Stars**: 184,333 | **Forks**: 46,228
**官方文档**: https://docs.agpt.co/
**许可证**: MIT

### 9.1 简介

AutoGPT 是自动化 AI Agent 的先驱项目，目标让每个人都能使用和构建 AI。提供 Agent 构建器、工作流管理、部署控制和市场平台。

### 9.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 运行时 | Docker |
| 前端 | React |
| 后端 | Python, Node.js |
| 部署 | 自托管/云托管 |

### 9.3 核心架构

```mermaid
graph TB
    subgraph AutoGPT 架构
        A[AutoGPT Platform<br/>平台层] --> B[Agent Builder<br/>Agent 构建器]
        A --> C[Workflow Manager<br/>工作流管理]
        A --> D[Deployment Control<br/>部署控制]
        
        B --> E[Low-Code Editor<br/>低代码编辑器]
        E --> F[Block Palette<br/>块面板]
        F --> G[Canvas<br/>画布]
        
        C --> H[Template Library<br/>模板库]
        D --> I[Container Orch<br/>容器编排]
        
        J[Marketplace<br/>市场] --> K[Pre-built Agents<br/>预置 Agent]
    end
    
    subgraph 执行层
        L[Execution Engine<br/>执行引擎] --> M[Tools<br/>工具]
        L --> N[Memory<br/>记忆]
        L --> O[Planner<br/>规划器]
    end
```

### 9.4 核心特性

- **Agent 构建器**: 低代码界面设计 AI Agent
- **工作流管理**: 块连接构建自动化流程
- **部署控制**: 管理 Agent 生命周期
- **预制 Agent**: 丰富的模板库
- **监控分析**: 性能追踪
- **市场平台**: 分享和发现 Agent
- **多模态**: 支持文本、图像、语音
- **长记忆**: 持久化上下文

### 9.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 自动化复杂工作流 | ★★★★★ | 块连接可视化 |
| 社交媒体内容生成 | ★★★★☆ | 内置模板 |
| 研究和数据收集 | ★★★★☆ | 自动化研究 |
| 业务流程自动化 | ★★★★☆ | 工作流引擎 |
| Agent 市场探索 | ★★★★☆ | 社区资源 |

### 9.6 快速开始

```bash
# macOS/Linux
curl -fsSL https://setup.agpt.co/install.sh -o install.sh
bash install.sh

# Windows PowerShell
powershell -c "iwr https://setup.agpt.co/install.bat -o install.bat; ./install.bat"
```

```bash
# Docker 快速启动
docker run -d -p 8000:8000 autogpt/autogpt
```

### 9.7 Python API 使用

```python
from autogpt import agent, task, skill
from autogpt.agents import Agent
from autogpt.memory import MemoryConfig

# 定义技能
@skill
def analyze_data(data_source: str) -> dict:
    """分析数据源"""
    return {
        "source": data_source,
        "records": 1000,
        "insights": ["趋势上升", "季节性模式"],
    }

# 定义任务
@task
def research_task(query: str):
    """执行研究任务"""
    return f"Research results for: {query}"

# 创建 Agent
research_agent = Agent(
    name="Researcher",
    role="Research Assistant",
    goals=[
        "搜索相关信息",
        "整理发现",
        "提供摘要",
    ],
    plugins=["web-search", "file-ops", "data-analysis"],
    memory=MemoryConfig(
        type="vector",
        provider="pinecone",
    ),
)

# 执行
result = research_agent.execute(
    input_data="AI Agent 的最新发展趋势",
    mode="research",
    depth="detailed",
)

print(result.final_output)
print(f"执行的工具: {result.tool_calls}")
print(f"Token 消耗: {result.token_usage}")
```

### 9.8 深度分析

#### 为什么选择 AutoGPT？

**优势分析：**

1. **先驱地位**: 最大的 AI Agent 开源社区
2. **低代码界面**: 可视化构建，无需编码
3. **模板丰富**: 预置大量应用模板
4. **市场平台**: 社区分享和发现
5. **持续迭代**: 活跃的开发社区

#### 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 轻量级集成 | Docker 依赖 | 直接 SDK |
| 企业级复杂场景 | 可视化限制 | LangChain.js |
| 实时性要求高 | 有平台开销 | API 直接调用 |
| 深度定制 | 平台限制 | 代码框架 |

---

## 10. Model Context Protocol (MCP)

**GitHub**: https://github.com/modelcontextprotocol/specification
**Stars**: 8,121 | **Forks**: 1,522
**官方文档**: https://modelcontextprotocol.io/
**许可证**: MIT

### 10.1 简介

MCP 是由 Anthropic 主导的开放协议，用于将 AI 模型与外部数据源、工具和服务连接。作为 AI 应用的"USB 接口"标准。

### 10.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 定义语言 | TypeScript |
| 兼容性 | JSON Schema |
| 文档 | Mintlify |

### 10.3 核心架构

```mermaid
graph TB
    subgraph MCP 协议架构
        A[Host Application<br/>宿主应用] <--> B[MCP Protocol<br/>MCP 协议]
        B <--> C[MCP Server<br/>MCP 服务器]
        
        subgraph 协议层
            D[JSON-RPC 2.0]
            E[Transport Layer<br/>传输层]
        end
        
        subgraph 服务器能力
            F[Tools<br/>工具]
            G[Resources<br/>资源]
            H[Prompts<br/>提示]
        end
        
        B --> D --> E
        C --> F
        C --> G
        C --> H
    end
    
    subgraph 传输方式
        I[Stdio<br/>标准输入输出]
        J[HTTP + SSE<br/>HTTP + 流式]
    end
    
    E --> I
    E --> J
```

### 10.4 核心特性

- **标准化协议**: 统一的 Agent-工具通信方式
- **传输层**: 支持 stdio 和 HTTP/SSE
- **工具定义**: 标准的工具 schema
- **资源访问**: 外部数据源安全访问
- **提示模板**: 可复用的系统提示
- **双向通信**: 支持服务器推送
- **类型安全**: JSON Schema 定义

### 10.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| Claude Desktop 扩展 | ★★★★★ | 官方支持 |
| Cursor AI 增强 | ★★★★☆ | MCP 集成 |
| 自定义 Agent 工具集成 | ★★★★★ | 标准化接口 |
| 企业数据源连接 | ★★★★☆ | 安全访问 |
| 多框架工具共享 | ★★★★★ | 一次开发多处使用 |

### 10.6 MCP 服务器示例

```typescript
import { MCPServer, Tool, Resource, Prompt } from "@modelcontextprotocol/sdk";

// 创建 MCP 服务器
const server = new MCPServer({
  name: "weather-mcp-server",
  version: "1.0.0",
  description: "天气查询 MCP 服务器",
});

// 定义工具
server.tool({
  name: "get_weather",
  description: "获取指定城市的当前天气",
  inputSchema: {
    type: "object",
    properties: {
      city: { 
        type: "string",
        description: "城市名称（中文或英文）",
      },
      units: {
        type: "string",
        enum: ["celsius", "fahrenheit"],
        default: "celsius",
      },
    },
    required: ["city"],
  },
  
  // 处理函数
  handler: async ({ city, units = "celsius" }) => {
    console.log(`[weather] 查询城市: ${city}`);
    
    // 实际项目中调用天气 API
    const weatherData = await fetchWeather(city, units);
    
    return {
      content: [
        {
          type: "text",
          text: `当前${city}天气：${weatherData.condition}，气温${weatherData.temp}°C，湿度${weatherData.humidity}%`,
        },
      ],
      // 可选的元数据
      meta: {
        source: "weather-api",
        timestamp: new Date().toISOString(),
      },
    };
  },
});

// 定义资源
server.resource({
  uri: "weather://cities",
  name: "City List",
  description: "支持的城市列表",
  mimeType: "application/json",
  
  handler: async () => {
    return {
      contents: [
        {
          uri: "weather://cities/list",
          mimeType: "application/json",
          text: JSON.stringify({
            cities: ["北京", "上海", "广州", "深圳", "杭州"],
          }),
        },
      ],
    };
  },
});

// 定义提示模板
server.prompt({
  name: "weather_report",
  description: "生成天气报告",
  
  arguments: [
    {
      name: "city",
      description: "城市名称",
      required: true,
    },
    {
      name: "days",
      description: "预报天数",
      required: false,
    },
  ],
  
  handler: async ({ city, days = 3 }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `请为 ${city} 生成一份 ${days} 天的天气预报，包括温度范围、天气状况和建议。`,
          },
        },
      ],
    };
  },
});

// 启动服务器（stdio 模式）
server.start();

// 或 HTTP + SSE 模式
server.start({
  transport: "http-sse",
  port: 3000,
});
```

### 10.7 客户端使用

```typescript
import { MCPClient } from "@modelcontextprotocol/client";

// 创建客户端连接
async function useMCPServer() {
  const client = new MCPClient({
    // stdio 连接
    command: "node",
    args: ["./weather-server.js"],
    
    // 或 HTTP 连接
    // url: "http://localhost:3000/mcp",
  });

  await client.connect();
  console.log("[client] MCP 客户端已连接");

  // 发现可用工具
  const tools = await client.listTools();
  console.log("可用工具:", tools.map((t) => t.name));

  // 发现可用资源
  const resources = await client.listResources();
  console.log("可用资源:", resources.map((r) => r.uri));

  // 调用工具
  const weatherResult = await client.callTool("get_weather", { 
    city: "北京",
    units: "celsius",
  });
  console.log("天气结果:", weatherResult);

  // 访问资源
  const cities = await client.readResource("weather://cities");
  console.log("城市列表:", cities);

  // 使用提示模板
  const promptResult = await client.getPrompt("weather_report", {
    city: "上海",
    days: 5,
  });
  console.log("提示结果:", promptResult);

  await client.disconnect();
}

useMCPServer();
```

### 10.8 深度分析

#### MCP 协议原理

**1. 协议层级结构**

```
┌─────────────────────────────────────┐
│        Application Layer           │
│         (Claude, Agent)            │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│        MCP Protocol Layer          │
│  JSON-RPC 2.0 + Capability Types  │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│       Transport Layer              │
│        (Stdio / HTTP+SSE)          │
└─────────────────────────────────────┘
```

**2. 通信流程**

```mermaid
sequenceDiagram
    participant H as Host (Claude)
    participant C as MCP Client
    participant S as MCP Server
    
    H->>C: 初始化请求
    C->>S: JSON-RPC: initialize
    S-->>C: capabilities
    
    H->>C: 工具调用请求
    C->>S: JSON-RPC: tools/call
    S->>S: 执行工具逻辑
    S-->>C: 工具结果
    C-->>H: 格式化响应
    
    H->>C: 资源访问请求
    C->>S: JSON-RPC: resources/read
    S-->>C: 资源内容
    C-->>H: 资源数据
```

**3. 核心优势**

| 优势 | 说明 |
|------|------|
| 标准化 | 一次开发，到处使用 |
| 类型安全 | JSON Schema 验证 |
| 双向通信 | 支持服务器推送事件 |
| 传输灵活 | Stdio 和 HTTP 多种选择 |
| 生态丰富 | 已有 1000+ MCP 服务器 |

#### 为什么 MCP 是生态关键？

1. **互操作性**: 不同框架共享工具
2. **开发效率**: 工具只需开发一次
3. **生态聚合**: 社区贡献的工具可供所有人使用
4. **安全隔离**: 沙箱执行保护宿主

#### 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 简单工具 | 协议开销 | 直接 SDK |
| 实时高频调用 | 有额外延迟 | 直接 API |
| 已有工具系统 | 迁移成本 | 保持现有 |

#### 主流 MCP 服务器生态

| 类别 | 服务器 | 功能 |
|------|--------|------|
| 文件系统 | @modelcontextprotocol/server-filesystem | 文件读写 |
| GitHub | @modelcontextprotocol/server-github | GitHub API |
| PostgreSQL | @modelcontextprotocol/server-postgres | 数据库查询 |
| Slack | @modelcontextprotocol/server-slack | 消息发送 |
| Brave Search | @modelcontextprotocol/server-brave-search | 网络搜索 |
| Memory | @modelcontextprotocol/server-memory | 持久记忆 |
| Fetch | @modelcontextprotocol/server-fetch | HTTP 请求 |

---

## 11. LiteLLM

**GitHub**: https://github.com/BerriAI/litellm
**Stars**: 47,136 | **Forks**: 8,082
**官方文档**: https://docs.litellm.ai/
**许可证**: MIT

### 11.1 简介

LiteLLM 是一个 Python SDK 和 AI 网关，提供统一接口调用 100+ LLM 提供商，支持负载均衡、费用追踪和 8ms P95 延迟。

### 11.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 语言 | Python |
| 部署 | Docker |
| 协议 | OpenAI 兼容 API, A2A, MCP |
| 监控 | Langfuse, MLflow, Lunary |

### 11.3 核心架构

```mermaid
graph TB
    subgraph LiteLLM 架构
        A[Client SDK<br/>客户端 SDK] --> B[Proxy Gateway<br/>代理网关]
        B --> C[Model Router<br/>模型路由器]
        
        C --> D[Load Balancer<br/>负载均衡器]
        C --> E[Fallback Manager<br/>回退管理器]
        C --> F[Cost Tracker<br/>费用追踪]
        
        D --> G[OpenAI]
        D --> H[Anthropic]
        D --> I[Azure]
        D --> J[Google]
        D --> K[Local Models]
        
        L[Logging<br/>日志] --> B
        M[Auth<br/>认证] --> B
        N[Guardrails<br/>安全过滤] --> B
    end
```

### 11.4 核心特性

- **统一 API**: 100+ LLM 一致接口
- **OpenAI 兼容**: 无缝替换
- **AI 网关**: 虚拟 Key、成本追踪、Guardrails
- **性能**: 8ms P95 延迟 @ 1k RPS
- **A2A 协议**: 调用 LangGraph、Vertex AI 等 Agent
- **MCP 工具**: 连接 MCP 服务器
- **负载均衡**: 多模型自动路由
- **回退机制**: 模型失败自动切换

### 11.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| ML 平台团队集中管理 | ★★★★★ | 统一网关 |
| 开发者直接集成 | ★★★★☆ | SDK 简单易用 |
| 企业 LLM 访问治理 | ★★★★★ | 成本追踪、权限控制 |
| 多模型负载均衡 | ★★★★☆ | 自动路由 |
| 本地模型部署 | ★★★★☆ | Ollama 支持 |

### 11.6 快速开始

```bash
pip install litellm
```

```python
from litellm import completion

# OpenAI 格式调用任何模型
response = completion(
    model="anthropic/claude-3-opus",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response)
```

### 11.7 AI Gateway 使用

```bash
# 启动网关
uv tool install 'litellm[proxy]'
litellm --model gpt-4o
```

```python
# 通过 OpenAI 客户端调用
from openai import OpenAI

client = OpenAI(
    api_key="anything",
    base_url="http://0.0.0.0:4000"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### 11.8 高级配置

```yaml
# litellm_config.yaml
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: os.environ/OPENAI_API_KEY
  
  - model_name: claude-opus
    litellm_params:
      model: anthropic/claude-3-opus-20240229
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: local-model
    litellm_params:
      model: ollama/llama3
      api_base: http://localhost:11434

litellm_settings:
  drop_params: true
  set_verbose: true

general_settings:
  master_key: sk-12345
  database_url: postgresql://user:pass@localhost:5432/litellm
```

```python
# 负载均衡示例
from litellm import completion, Router

router = Router(
    model_list=[
        {"model_name": "gpt-4o", "litellm_params": {"model": "gpt-4o"}},
        {"model_name": "gpt-4o-mini", "litellm_params": {"model": "gpt-4o-mini"}},
    ],
    routing_strategy: "latency-based-routing",  # 最低延迟
    redis_host: "localhost",
    redis_port: 6379,
)

# 自动路由到最快模型
response = router.completion(
    model="balanced-pool",
    messages=[{"role": "user", "content": "Hello!"}],
)
```

### 11.9 深度分析

#### 为什么选择 LiteLLM？

**优势分析：**

1. **100+ 模型支持**: 统一接口
2. **OpenAI 兼容**: 无缝迁移
3. **网关能力**: 虚拟 Key、成本追踪
4. **高性能**: 8ms P95 延迟
5. **企业特性**: 负载均衡、回退、监控

#### 性能基准数据

| 指标 | 数据 |
|------|------|
| P50 延迟 | 5ms |
| P95 延迟 | 8ms |
| P99 延迟 | 15ms |
| 吞吐量 | 1k RPS |
| 并发连接 | 10k+ |

#### 竞品对比

| 特性 | LiteLLM | Portkey | Helicone |
|------|---------|---------|----------|
| 语言 | Python | 多语言 | 多语言 |
| 网关功能 | 完整 | 完整 | 监控为主 |
| 成本追踪 | 是 | 是 | 是 |
| 负载均衡 | 是 | 是 | 否 |
| 回退机制 | 是 | 是 | 否 |
| 开源 | 是 | 部分 | 否 |

---

## 12. 框架选型指南

### 12.1 按场景选型

| 场景 | 推荐框架 | 理由 |
|------|----------|------|
| 企业级 AI 应用 | LangChain.js, Mastra | 完整生态、生产就绪 |
| 快速原型/MVP | Flowise, CrewAI | 低代码、高效率 |
| 社交/聊天机器人 | ElizaOS, SwarmClaw | 多渠道、内置集成 |
| 编码助手 | Claude Code | 官方工具、深度集成 |
| 工具生态集成 | Composio | 1000+ 工具覆盖 |
| 多模型路由 | Mastra, LiteLLM | 统一接口、灵活切换 |
| 可视化流程 | Flowise, AutoGPT | 拖拽构建 |
| 开源替代 Claude Code | SwarmClaw | AGPL 许可 |

### 12.2 技术对比矩阵

| 框架 | 语言 | 多 Agent | MCP 支持 | 可视化 | 上手难度 | Stars |
|------|------|----------|----------|--------|----------|-------|
| LangChain.js | TS/JS | Yes (LangGraph) | Yes | No | 中等 | 17.7K |
| VoltAgent | TypeScript | Yes | Yes | No | 中等 | 8.9K |
| ElizaOS | TypeScript | Yes | Yes | Web UI | 简单 | 18.4K |
| Flowise | TS/React | Yes | Yes | Yes | 简单 | 52.8K |
| Mastra | TypeScript | Yes | Yes | No | 中等 | 23.9K |
| Composio | TS/Python | Yes | Yes | No | 简单 | 28.3K |
| SwarmClaw | TypeScript | Yes | Yes | Web UI | 简单 | 482 |
| Claude Code | Shell | No | Yes | No | 简单 | 123.9K |
| AutoGPT | Python | Yes | Yes | Yes | 简单 | 184.3K |
| MCP | TypeScript | - | - | - | 中等 | 8.1K |
| LiteLLM | Python | Via A2A | Yes | Dashboard | 简单 | 47.1K |

### 12.3 学习路径建议

```
初学者路径：
┌─────────────────────────────────────────────────────────────┐
│  Flowise (可视化) → ElizaOS (多渠道) → Composio (工具集成) │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  中阶路径：                                                │
│  LangChain.js (深度) → Mastra (工作流) → VoltAgent (企业级)│
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  高级路径：                                                │
│  自定义 MCP → 多框架组合 → Agent 编排架构                  │
└─────────────────────────────────────────────────────────────┘
```

### 12.4 深度选型决策树

```mermaid
graph TD
    A[开始选型] --> B{项目类型?}
    
    B -->|编码辅助| C[Claude Code]
    B -->|社交机器人| D{需要多渠道?}
    D -->|是| E[ElizaOS]
    D -->|否| F[SwarmClaw]
    
    B -->|企业应用| G{需要可视化?}
    G -->|是| H[Flowise]
    G -->|否| I{复杂度?}
    I -->|简单| J[VoltAgent]
    I -->|复杂| K{LangChain.js vs Mastra}
    
    B -->|工具集成| L{工具数量?}
    L -->|>100| M[Composio]
    L -->|<100| N[自建 MCP]
    
    B -->|网关/路由| O[LiteLLM]
    
    K -->|强工作流| P[Mastra]
    K -->|强生态| Q[LangChain.js]
```

### 12.5 趋势观察

1. **MCP 成标配**: 所有主流框架都在整合 MCP 协议
2. **多 Agent 编排**: 从单 Agent 向多 Agent 协作演进
3. **TypeScript 优先**: JS/TS 生态持续壮大
4. **低代码 + 编码混合**: Flowise 等可视化工具 + SDK 组合
5. **企业级特性**: 监控、安全、治理成为标配
6. **开源替代**: Claude Code 开源替代方案（SwarmClaw）涌现
7. **工具生态**: Composio 等工具集成平台崛起

### 12.6 性能基准对比

| 框架 | 简单调用延迟 | 工具调用延迟 | 启动时间 | 内存占用 |
|------|-------------|-------------|---------|---------|
| Claude Code | N/A | N/A | ~2s | ~100MB |
| LangChain.js | ~50ms | ~200ms | ~500ms | ~150MB |
| VoltAgent | ~30ms | ~150ms | ~300ms | ~100MB |
| Mastra | ~40ms | ~180ms | ~400ms | ~120MB |
| Flowise | ~100ms | ~300ms | ~5s | ~500MB |
| Composio | ~100ms | ~250ms | ~200ms | ~80MB |
| LiteLLM | ~5ms | ~20ms | ~100ms | ~50MB |

### 12.7 安全与合规考虑

| 框架 | 数据隔离 | 审计日志 | 权限控制 | 合规认证 |
|------|----------|----------|----------|----------|
| LangChain.js | 支持 | LangSmith | 有限 | SOC2 |
| Mastra | 支持 | 内置 | 有限 | 发展中 |
| Composio | 云端 | 是 | 完整 | SOC2 |
| LiteLLM | 支持 | 是 | 完整 | SOC2 |
| Claude Code | 本地 | 有限 | 有限 | Anthropic |
| Flowise | 自托管 | 可配置 | 可配置 | 取决于部署 |

---

## 参考链接

### 官方文档

- LangChain.js: https://js.langchain.com/
- VoltAgent: https://voltagent.dev/
- ElizaOS: https://elizaos.github.io/eliza/
- Flowise: https://flowiseai.com/
- Mastra: https://mastra.ai/
- Composio: https://docs.composio.dev/
- Claude Code: https://docs.anthropic.com/en/docs/claude-code
- AutoGPT: https://docs.agpt.co/
- MCP: https://modelcontextprotocol.io/
- LiteLLM: https://docs.litellm.ai/

### GitHub 仓库

- https://github.com/langchain-ai/langchainjs
- https://github.com/VoltAgent/voltagent
- https://github.com/elizaOS/eliza
- https://github.com/FlowiseAI/Flowise
- https://github.com/mastra-ai/mastra
- https://github.com/ComposioHQ/composio
- https://github.com/swarmclawai/swarmclaw
- https://github.com/anthropics/claude-code
- https://github.com/Significant-Gravitas/AutoGPT
- https://github.com/modelcontextprotocol/specification
- https://github.com/BerriAI/litellm

### MCP 服务器生态

- 官方服务器: https://github.com/modelcontextprotocol/servers
- Pack 发布: https://smithery.ai/

---

*文档生成时间: 2026-05-16*
*数据来源: GitHub API, 官方文档*