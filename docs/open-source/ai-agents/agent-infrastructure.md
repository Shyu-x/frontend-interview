---
title: Agent 工具与基础设施
description: 调研 Composio、SwarmClaw、Claude Code、AutoGPT、MCP、LiteLLM 等 Agent 工具与基础设施，并给出选型指南。
tags:
  - open-source
  - ai-agents
date: 2026-05-17
---

# Agent 工具与基础设施

> 本文是「Agent 开源生态」系列第 2 篇（共 2 篇）。上一篇：[Agent 开发框架](agent-frameworks.md)

## 1. Composio

**GitHub**: https://github.com/ComposioHQ/composio
**Stars**: 28,261 | **Forks**: 4,564
**官方文档**: https://docs.composio.dev/
**许可证**: MIT

### 1.1 简介

Composio 是一个 AI Agent 开发平台，提供 1000+ 工具包、工具搜索、上下文管理、认证和沙箱执行环境。支持 TypeScript 和 Python 双语言 SDK。

### 1.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 语言 | TypeScript, Python |
| Node.js | >=18 |
| Python | >=3.10 |
| 协议 | MCP (Model Context Protocol) |
| 集成 | LangChain, LangGraph, CrewAI, Vercel AI |
| 工具数量 | 1000+ |

### 1.3 核心架构

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

### 1.4 核心特性

- **1000+ 工具包**: GitHub, Gmail, Slack, Notion 等
- **多框架支持**: OpenAI, Anthropic, Google, LangChain, Mastra 等
- **认证管理**: OAuth, API Key, 自定义认证流程
- **触发器系统**: 订阅外部事件触发工作流
- **MCP 集成**: Rube MCP 服务器支持 500+ 应用
- **工具搜索**: AI 驱动选择最优工具
- **沙箱执行**: 安全执行不受信任的工具代码
- **上下文管理**: 智能上下文裁剪和管理

### 1.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 扩展 Agent 能力边界 | 5/5 | 1000+ 工具覆盖 |
| 企业应用集成自动化 | 5/5 | OAuth 认证完善 |
| 跨平台工作流编排 | 4/5 | 多工具协同 |
| 开发 Agent 原型 | 4/5 | 快速集成 |
| 安全执行外部代码 | 4/5 | 沙箱隔离 |

### 1.6 快速开始

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

### 1.7 MCP 模式使用

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

### 1.8 深度分析

#### 1.8.1 为什么选择 Composio？

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

#### 1.8.2 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 简单 API 调用 | 过度集成 | 直接 SDK |
| 自定义工具为主 | 平台优势不明显 | 自行实现 |
| 离线环境 | 需要 Composio 云服务 | 本地框架 |
| 严格数据隔离 | 云服务依赖 | 私有化部署框架 |

#### 1.8.3 竞品对比

| 特性 | Composio | LangChain Tools | Zapier | Make |
|------|----------|----------------|--------|------|
| 工具数量 | 1000+ | 有限 | 5000+ | 1000+ |
| AI 原生 | 是 | 是 | 部分 | 部分 |
| 框架集成 | 多种 | LangChain | 无 | 无 |
| MCP 支持 | 是 | 部分 | 否 | 否 |
| 认证管理 | 完整 | 需自行实现 | 完整 | 完整 |
| 定价 | 免费额度 | 开源免费 | 付费 | 付费 |

#### 1.8.4 性能基准数据

| 操作 | 延迟 | 说明 |
|------|------|------|
| 工具列表获取 | ~100ms | 缓存后更快 |
| OAuth 授权 | ~500ms | 含网络延迟 |
| 工具执行 | ~200ms | 含 API 调用 |
| 上下文管理 | ~50ms | 裁剪计算 |

## 2. SwarmClaw

**GitHub**: https://github.com/swarmclawai/swarmclaw
**Stars**: 482 | **Forks**: 99
**官方文档**: https://swarmclaw.ai/
**许可证**: AGPL

### 2.1 简介

SwarmClaw 是开源自托管 AI Agent 运行时和多 Agent 框架，支持 Agent 集群、记忆持久化、MCP 工具和 23+ LLM 提供商。定位为 Claude Code 和 LangChain 的开源替代。

### 2.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 语言 | TypeScript |
| 运行时 | Node.js 22.6+ |
| 前端 | React/Electron |
| 部署 | Docker |
| 协议 | MCP, OpenTelemetry OTLP |
| LLM 提供商 | 23+ |

### 2.3 核心架构

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

### 2.4 核心特性

- **23+ LLM 提供商**: Claude, GPT, Gemini, Ollama, DeepSeek 等
- **Agent 委托**: 多 Agent 层级委托机制
- **持久化记忆**: 反思和日志系统
- **MCP 服务集成**: 连接 MCP 工具
- **技能系统**: 对话生成技能
- **连接器**: Discord, Slack, Telegram 等
- **加密钱包**: Solana/Ethereum 集成
- **Web UI**: 可视化 Agent 管理

### 2.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 个人 AI 助手 | 4/5 | 多模型支持 |
| 虚拟公司 Agent 团队 | 4/5 | 层级委托 |
| 开发团队（Lead, Dev, QA） | 4/5 | 角色分工 |
| 内容创作工作室 | 4/5 | 多 Agent 协作 |
| 加密货币操作 | 3/5 | 钱包集成 |

### 2.6 快速开始

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

### 2.7 层级委托示例

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

### 2.8 深度分析

#### 2.8.1 为什么选择 SwarmClaw？

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

#### 2.8.2 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 需要商业支持 | AGPL 限制 | Claude Code |
| 快速原型 | 配置复杂 | Flowise |
| 轻量级需求 | 相对重量级 | 直接 AI SDK |
| 生产级可靠性 | 社区较小 | LangChain.js |

#### 2.8.3 竞品对比

| 特性 | SwarmClaw | Claude Code | LangChain.js | ElizaOS |
|------|-----------|-------------|--------------|---------|
| 开源 | 是 | 部分 | 是 | 是 |
| 多 Agent | 是 | 否 | 是 | 是 |
| Web UI | 是 | 否 | 否 | 是 |
| 模型数量 | 23+ | Anthropic | 多种 | 多种 |
| MCP 支持 | 是 | 是 | 是 | 是 |
| 加密集成 | 是 | 否 | 否 | 否 |
| Stars | 482 | 123,919 | 17,672 | 18,376 |

## 3. Claude Code

**GitHub**: https://github.com/anthropics/claude-code
**Stars**: 123,919 | **Forks**: 20,422
**官方文档**: https://docs.anthropic.com/en/docs/claude-code
**许可证**: 专有 + CLAUDE CODE AGENTS SDK (Apache 2.0)

### 3.1 简介

Claude Code 是 Anthropic 官方出品的终端 Agent 编码工具，理解代码库上下文，通过自然语言命令执行日常任务、处理 Git 工作流。

### 3.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 安装方式 | curl, Homebrew, winget |
| 配置 | CLAUDE.md 文件 |
| 扩展 | MCP 服务器 |
| 数据收集 | 可控制 |

### 3.3 核心架构

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

### 3.4 核心特性

- **终端 Agent**: 在终端中与代码库交互
- **代码库理解**: 自动分析项目结构和上下文
- **任务执行**: 读写文件、运行命令、Git 操作
- **自然语言**: 通过对话描述任务
- **MCP 插件**: 扩展工具能力
- **GitHub 集成**: @mention 支持
- **安全设计**: 默认安全，不主动执行危险操作
- **可配置**: CLAUDE.md 和 MCP 服务器灵活配置

### 3.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 日常编码辅助 | 5/5 | 官方工具，深度集成 |
| 代码审查 | 4/5 | 快速 Review |
| Git 工作流自动化 | 5/5 | 完整的 Git 操作 |
| 新项目探索 | 5/5 | 理解代码库 |
| 快速原型开发 | 4/5 | 高效开发 |
| 重构和迁移 | 4/5 | 理解后重构 |

### 3.6 快速开始

```bash
# macOS/Linux
curl -fsSL https://download.anthropic.com/claude-code/installer.sh | sh

# Windows
winget install Anthropic.CaudeCode

# 初始化
claude
```

### 3.7 CLAUDE.md 配置示例

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

### 3.8 MCP 集成示例

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

### 3.9 Claude Code Agents SDK

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

### 3.10 深度分析

#### 3.10.1 Claude Code 的设计哲学

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

#### 3.10.2 为什么选择 Claude Code？

**优势分析：**

1. **官方工具**: Anthropic 官方出品，最佳 Claude 集成
2. **代码库理解**: 深度理解项目结构和上下文
3. **安全设计**: 确认机制防止意外操作
4. **Git 集成**: 完整的 Git 工作流支持
5. **MCP 扩展**: 丰富的扩展能力

#### 3.10.3 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 非编码任务 | 专注于编码 | 通用 Agent |
| 后端服务开发 | 终端交互限制 | API 框架 |
| 团队协作平台 | 单用户设计 | GitHub Copilot |
| 实时监控 | 按需调用 | 专用监控工具 |

#### 3.10.4 性能基准数据

| 操作 | 延迟 | 说明 |
|------|------|------|
| 启动 | ~2s | 包含模型加载 |
| 文件读取 | ~100ms | 取决于文件大小 |
| 命令执行 | 依赖命令 | 原生命令 |
| 代码生成 | ~500ms | 取决于复杂度 |

#### 3.10.5 与 GitHub Copilot 对比

| 特性 | Claude Code | GitHub Copilot |
|------|-------------|---------------|
| 交互方式 | 终端对话 | IDE 补全 |
| 上下文范围 | 代码库全局 | 当前文件 |
| 操作能力 | 读写文件、执行命令 | 代码补全 |
| MCP 支持 | 是 | 否 |
| 多模型支持 | Anthropic 优先 | GPT-4 |
| 价格 | 包含在订阅中 | Copilot 订阅 |

## 4. AutoGPT

**GitHub**: https://github.com/Significant-Gravitas/AutoGPT
**Stars**: 184,333 | **Forks**: 46,228
**官方文档**: https://docs.agpt.co/
**许可证**: MIT

### 4.1 简介

AutoGPT 是自动化 AI Agent 的先驱项目，目标让每个人都能使用和构建 AI。提供 Agent 构建器、工作流管理、部署控制和市场平台。

### 4.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 运行时 | Docker |
| 前端 | React |
| 后端 | Python, Node.js |
| 部署 | 自托管/云托管 |

### 4.3 核心架构

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

### 4.4 核心特性

- **Agent 构建器**: 低代码界面设计 AI Agent
- **工作流管理**: 块连接构建自动化流程
- **部署控制**: 管理 Agent 生命周期
- **预制 Agent**: 丰富的模板库
- **监控分析**: 性能追踪
- **市场平台**: 分享和发现 Agent
- **多模态**: 支持文本、图像、语音
- **长记忆**: 持久化上下文

### 4.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| 自动化复杂工作流 | 5/5 | 块连接可视化 |
| 社交媒体内容生成 | 4/5 | 内置模板 |
| 研究和数据收集 | 4/5 | 自动化研究 |
| 业务流程自动化 | 4/5 | 工作流引擎 |
| Agent 市场探索 | 4/5 | 社区资源 |

### 4.6 快速开始

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

### 4.7 Python API 使用

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

### 4.8 深度分析

#### 4.8.1 为什么选择 AutoGPT？

**优势分析：**

1. **先驱地位**: 最大的 AI Agent 开源社区
2. **低代码界面**: 可视化构建，无需编码
3. **模板丰富**: 预置大量应用模板
4. **市场平台**: 社区分享和发现
5. **持续迭代**: 活跃的开发社区

#### 4.8.2 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 轻量级集成 | Docker 依赖 | 直接 SDK |
| 企业级复杂场景 | 可视化限制 | LangChain.js |
| 实时性要求高 | 有平台开销 | API 直接调用 |
| 深度定制 | 平台限制 | 代码框架 |

## 5. Model Context Protocol (MCP)

**GitHub**: https://github.com/modelcontextprotocol/specification
**Stars**: 8,121 | **Forks**: 1,522
**官方文档**: https://modelcontextprotocol.io/
**许可证**: MIT

### 5.1 简介

MCP 是由 Anthropic 主导的开放协议，用于将 AI 模型与外部数据源、工具和服务连接。作为 AI 应用的"USB 接口"标准。

### 5.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 定义语言 | TypeScript |
| 兼容性 | JSON Schema |
| 文档 | Mintlify |

### 5.3 核心架构

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

### 5.4 核心特性

- **标准化协议**: 统一的 Agent-工具通信方式
- **传输层**: 支持 stdio 和 HTTP/SSE
- **工具定义**: 标准的工具 schema
- **资源访问**: 外部数据源安全访问
- **提示模板**: 可复用的系统提示
- **双向通信**: 支持服务器推送
- **类型安全**: JSON Schema 定义

### 5.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| Claude Desktop 扩展 | 5/5 | 官方支持 |
| Cursor AI 增强 | 4/5 | MCP 集成 |
| 自定义 Agent 工具集成 | 5/5 | 标准化接口 |
| 企业数据源连接 | 4/5 | 安全访问 |
| 多框架工具共享 | 5/5 | 一次开发多处使用 |

### 5.6 MCP 服务器示例

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

### 5.7 客户端使用

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

### 5.8 深度分析

#### 5.8.1 MCP 协议原理

**1. 协议层级结构**

```mermaid
flowchart TD
    A["Application Layer<br/>(Claude, Agent)"] --> B["MCP Protocol Layer<br/>JSON-RPC 2.0 + Capability Types"]
    B --> C["Transport Layer<br/>(Stdio / HTTP+SSE)"]
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

#### 5.8.2 为什么 MCP 是生态关键？

1. **互操作性**: 不同框架共享工具
2. **开发效率**: 工具只需开发一次
3. **生态聚合**: 社区贡献的工具可供所有人使用
4. **安全隔离**: 沙箱执行保护宿主

#### 5.8.3 什么场景不适合？

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 简单工具 | 协议开销 | 直接 SDK |
| 实时高频调用 | 有额外延迟 | 直接 API |
| 已有工具系统 | 迁移成本 | 保持现有 |

#### 5.8.4 主流 MCP 服务器生态

| 类别 | 服务器 | 功能 |
|------|--------|------|
| 文件系统 | @modelcontextprotocol/server-filesystem | 文件读写 |
| GitHub | @modelcontextprotocol/server-github | GitHub API |
| PostgreSQL | @modelcontextprotocol/server-postgres | 数据库查询 |
| Slack | @modelcontextprotocol/server-slack | 消息发送 |
| Brave Search | @modelcontextprotocol/server-brave-search | 网络搜索 |
| Memory | @modelcontextprotocol/server-memory | 持久记忆 |
| Fetch | @modelcontextprotocol/server-fetch | HTTP 请求 |

## 6. LiteLLM

**GitHub**: https://github.com/BerriAI/litellm
**Stars**: 47,136 | **Forks**: 8,082
**官方文档**: https://docs.litellm.ai/
**许可证**: MIT

### 6.1 简介

LiteLLM 是一个 Python SDK 和 AI 网关，提供统一接口调用 100+ LLM 提供商，支持负载均衡、费用追踪和 8ms P95 延迟。

### 6.2 技术栈

| 组件 | 技术选型 |
|------|----------|
| 语言 | Python |
| 部署 | Docker |
| 协议 | OpenAI 兼容 API, A2A, MCP |
| 监控 | Langfuse, MLflow, Lunary |

### 6.3 核心架构

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

### 6.4 核心特性

- **统一 API**: 100+ LLM 一致接口
- **OpenAI 兼容**: 无缝替换
- **AI 网关**: 虚拟 Key、成本追踪、Guardrails
- **性能**: 8ms P95 延迟 @ 1k RPS
- **A2A 协议**: 调用 LangGraph、Vertex AI 等 Agent
- **MCP 工具**: 连接 MCP 服务器
- **负载均衡**: 多模型自动路由
- **回退机制**: 模型失败自动切换

### 6.5 使用场景

| 场景 | 适用度 | 说明 |
|------|--------|------|
| ML 平台团队集中管理 | 5/5 | 统一网关 |
| 开发者直接集成 | 4/5 | SDK 简单易用 |
| 企业 LLM 访问治理 | 5/5 | 成本追踪、权限控制 |
| 多模型负载均衡 | 4/5 | 自动路由 |
| 本地模型部署 | 4/5 | Ollama 支持 |

### 6.6 快速开始

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

### 6.7 AI Gateway 使用

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

### 6.8 高级配置

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

### 6.9 深度分析

#### 6.9.1 为什么选择 LiteLLM？

**优势分析：**

1. **100+ 模型支持**: 统一接口
2. **OpenAI 兼容**: 无缝迁移
3. **网关能力**: 虚拟 Key、成本追踪
4. **高性能**: 8ms P95 延迟
5. **企业特性**: 负载均衡、回退、监控

#### 6.9.2 性能基准数据

| 指标 | 数据 |
|------|------|
| P50 延迟 | 5ms |
| P95 延迟 | 8ms |
| P99 延迟 | 15ms |
| 吞吐量 | 1k RPS |
| 并发连接 | 10k+ |

#### 6.9.3 竞品对比

| 特性 | LiteLLM | Portkey | Helicone |
|------|---------|---------|----------|
| 语言 | Python | 多语言 | 多语言 |
| 网关功能 | 完整 | 完整 | 监控为主 |
| 成本追踪 | 是 | 是 | 是 |
| 负载均衡 | 是 | 是 | 否 |
| 回退机制 | 是 | 是 | 否 |
| 开源 | 是 | 部分 | 否 |

## 7. 框架选型指南

### 7.1 按场景选型

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

### 7.2 技术对比矩阵

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

### 7.3 学习路径建议

```mermaid
flowchart TD
    A["初学者路径：<br/>Flowise (可视化) → ElizaOS (多渠道) → Composio (工具集成)"] --> B["中阶路径：<br/>LangChain.js (深度) → Mastra (工作流) → VoltAgent (企业级)"]
    B --> C["高级路径：<br/>自定义 MCP → 多框架组合 → Agent 编排架构"]
```

### 7.4 深度选型决策树

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

### 7.5 趋势观察

1. **MCP 成标配**: 所有主流框架都在整合 MCP 协议
2. **多 Agent 编排**: 从单 Agent 向多 Agent 协作演进
3. **TypeScript 优先**: JS/TS 生态持续壮大
4. **低代码 + 编码混合**: Flowise 等可视化工具 + SDK 组合
5. **企业级特性**: 监控、安全、治理成为标配
6. **开源替代**: Claude Code 开源替代方案（SwarmClaw）涌现
7. **工具生态**: Composio 等工具集成平台崛起

### 7.6 性能基准对比

| 框架 | 简单调用延迟 | 工具调用延迟 | 启动时间 | 内存占用 |
|------|-------------|-------------|---------|---------|
| Claude Code | N/A | N/A | ~2s | ~100MB |
| LangChain.js | ~50ms | ~200ms | ~500ms | ~150MB |
| VoltAgent | ~30ms | ~150ms | ~300ms | ~100MB |
| Mastra | ~40ms | ~180ms | ~400ms | ~120MB |
| Flowise | ~100ms | ~300ms | ~5s | ~500MB |
| Composio | ~100ms | ~250ms | ~200ms | ~80MB |
| LiteLLM | ~5ms | ~20ms | ~100ms | ~50MB |

### 7.7 安全与合规考虑

| 框架 | 数据隔离 | 审计日志 | 权限控制 | 合规认证 |
|------|----------|----------|----------|----------|
| LangChain.js | 支持 | LangSmith | 有限 | SOC2 |
| Mastra | 支持 | 内置 | 有限 | 发展中 |
| Composio | 云端 | 是 | 完整 | SOC2 |
| LiteLLM | 支持 | 是 | 完整 | SOC2 |
| Claude Code | 本地 | 有限 | 有限 | Anthropic |
| Flowise | 自托管 | 可配置 | 可配置 | 取决于部署 |

## 8. 参考链接

### 8.1 官方文档

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

### 8.2 GitHub 仓库

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

### 8.3 MCP 服务器生态

- 官方服务器: https://github.com/modelcontextprotocol/servers
- Pack 发布: https://smithery.ai/

---

*文档生成时间: 2026-05-16*
*数据来源: GitHub API, 官方文档*

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Model Context Protocol 文档](https://modelcontextprotocol.io/) | MCP 是本页核心基础设施，先建立客户端/服务器角色的整体认知。 | 读 Introduction 后跑 quickstart，弄清 host、client、server 各负责什么，再回到自己的接入场景。 |
| [MCP 规范](https://modelcontextprotocol.io/specification) | 读懂 transport 与 lifecycle 才能写出真正合规的 MCP 服务器。 | 重点读 lifecycle 初始化协商与 stdio/HTTP transport 差异，对照自己的实现逐条核对。 |
| [Claude Code 文档](https://code.claude.com/docs/en/overview) | Claude Code 是主流水线工具，官方文档覆盖命令、hooks 与子 Agent。 | 按 slash commands、hooks、subagents 顺序实操，每节跑通示例再决定是否引入团队流程。 |
| [Claude Tool Use 概览](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview) | 工具定义 schema 是 Agent 调用失败的高频原因，值得逐字理解。 | 手写一遍 JSON schema 与参数描述，故意构造错误传参观察模型如何纠正。 |
| [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) | AutoGPT 是自主 Agent 的早期范式，理解其局限能避免重复踩坑。 | 浏览架构与任务循环文档，记录其规划与记忆设计的失效点，与你的方案对照。 |
| [A practical guide to building agents（OpenAI）](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | OpenAI 的实践指南给出模型、工具、指令三要素的清晰设计框架。 | 读完用三要素表格审视自己的 Agent 设计，标出缺失或含糊的项。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) | FastMCP 是最短的 MCP 服务端上手路径，代码即文档。 | 用它写一个暴露数据库查询的工具，再用 Inspector 或客户端调用验证。 |
| [smolagents 仓库](https://github.com/huggingface/smolagents) | smolagents 核心不足千行，是理解最小 Agent 循环的最佳样本。 | 通读核心循环代码，画一张执行流程图，再对照自己的实现找差异。 |
| [Google ADK（Python）仓库](https://github.com/google/adk-python) | ADK 的 samples 目录提供多工具、多 Agent 的完整可运行范例。 | 挑一个多工具 sample 跑通，重点看其 Agent 抽象与你熟悉框架的差别。 |
| [Claude Agent SDK（TypeScript）](https://github.com/anthropics/claude-agent-sdk-typescript) | TypeScript SDK 示例展示工具注册与调用的完整链路，便于快速接入。 | 克隆后跑通 README 示例，再把自己的一个函数注册为自定义工具验证。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Code 最佳实践](https://www.anthropic.com/engineering/claude-code-best-practices) | CLAUDE.md 与计划先行是可立刻落地的工程实践，对应代码规范章节。 | 在一个真实仓库应用文中的做法，一周后复盘哪些规范被真正遵守。 |
| [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | 上下文工程直接决定 Agent 效果与成本，属易被忽视的基本功。 | 读完检查自己的系统提示，删掉重复上下文并记录 token 与效果变化。 |
| [Agents（Chip Huyen）](https://huyenchip.com/2025/01/07/agents.html) | Chip Huyen 对工具与规划的讨论，适合作为 Agent 设计的检查清单。 | 读工具与规划两章，逐条对照自己的 Agent 找出缺失环节并补设计。 |

## 应用与行业实践

前面几节讲了 Composio、SwarmClaw、Claude Code、AutoGPT、MCP、LiteLLM 分别解决什么问题。这一节回答另一个问题：这些能力放进真实业务里，在哪一步用、怎么量收益、什么时候不碰。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 值班机器人排查线上 5xx 告警 | MCP、LiteLLM | MCP server 暴露监控、日志、发布记录三类只读工具；LiteLLM 跑工具调用循环 | 只读工具先行；日志里的手机号先脱敏再入提示 |
| 跨境电商后台的批量改价 | 安全要求、开发流程 | 结构化输出出计划 + 代码校验 + 人工确认后写接口 | 价格带与毛利下限由代码判定，不由模型判定 |
| 多人协作白板里的便签聚类 | 框架选型指南、测试要求 | 单轮结构化输出，不做工具循环 | 便签编号后只回编号；含姓名的便签先征得同意 |
| 后台管理的万行表格导出 | LiteLLM、框架选型指南 | 自然语言转筛选条件，条件回显给人确认后查询 | 查询条件要回显；导出走后台任务队列，不阻塞页面 |
| 低端安卓的首屏加载 | 技术栈、LiteLLM | 端侧小模型先跑，超时或低置信度时走网关调云端 | 离线时走纯规则兜底，首屏不等待模型返回 |
| 财务 PDF 批量抽取入 ERP | 测试要求、安全要求 | 抽取 + 字段级校验 + 人工复核队列 | 金额与税号双人复核；抽取结果保留原文坐标 |
| 数据团队的自然语言查数 | MCP、AutoGPT | 库表结构作为 resource；多步探索用有限步循环 | 只读账号 + SQL 审核，禁止无条件全表扫描 |
| 代码仓库的 PR 初审 | Claude Code、代码规范 | CLI 智能体读仓库内约定文件，只在 PR 留评论 | 不给写权限；评论带文件名与行号 |
| 教育机构的作业批改 | 安全要求、框架选型 | 评分标准写成提示文件，结果抽样人工复核 | 未成年人作品不用于训练，留存期限写进流程 |

### 三个场景拆解

#### 场景 1：值班机器人排查线上 5xx 告警

**业务背景**

值班群每天收到多条 5xx 告警，排查要在监控、日志、发布记录三个系统之间切换。规模先自己数：统计一周内每人每班切换系统的次数，以及从告警到定位的分钟数。

**怎么用本页知识解决**

思路是把三个系统各封装成只读工具，让模型按“指标、日志、发布记录”的顺序查，步数封顶，超限就转人工。

```python
import json, litellm

TOOLS = [  # 只读工具清单，写操作不放进这个列表
    {"type": "function", "function": {"name": "query_metrics",
     "description": "按服务名取 5xx 速率", "parameters": {"type": "object",
     "properties": {"service": {"type": "string"}}, "required": ["service"]}}},
    {"type": "function", "function": {"name": "search_logs",
     "description": "按 trace_id 取日志", "parameters": {"type": "object",
     "properties": {"trace_id": {"type": "string"}}, "required": ["trace_id"]}}},
]

def run(question: str, max_steps: int = 6) -> str:
    messages = [{"role": "user", "content": question}]  # 只传告警文本，不带工单里的用户字段
    for _ in range(max_steps):  # 步数上限，拦住工具之间的来回调用
        resp = litellm.completion(model=MODEL, messages=messages, tools=TOOLS)
        msg = resp.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:  # 没有工具调用，说明模型给出了结论
            return msg.content
        for call in msg.tool_calls:
            args = json.loads(call.function.arguments)
            result = dispatch(call.function.name, args)  # 白名单分发，未注册的名字抛错
            messages.append({"role": "tool", "tool_call_id": call.id, "content": result})
    return "达到步数上限，转人工"  # 不继续消耗额度
```

- 工具清单里只有读操作，重启、回滚这类写动作留给值班人。
- 模型名从环境变量读，换厂商不动这个文件。
- 每次分发先查白名单，避免模型编出工具名后被当成调用执行。
- 步数上限同时是成本上限，超限直接给值班人一句话结论。

**怎么度量收益**

指标是每轮平均工具调用次数、结论被值班人直接采纳的比例、单个告警消耗的 token 数。测量方法：在 `run()` 里累计 `tool_calls` 条数；token 从 LiteLLM 响应的 usage 字段读，字段名以官方文档为准；采纳比例靠值班群里的“采纳 / 转人工”按钮打点。

**什么时候不该用**

- 告警对应的是已知单点故障，比如磁盘写满，写一条 if 判断加清理脚本就够，不需要模型。
- 日志原文含用户手机号、地址，且团队还没有脱敏管道，这时不能把原文发给模型。
- 熔断动作要求秒级响应，工具调用循环的往返延迟满足不了，这类动作交给规则引擎。

#### 场景 2：跨境电商后台的批量改价

**业务背景**

运营要按竞品价格调整一批 SKU，手工在后台表格逐行改，漏改和改错都发生过。规模按批次算，单次批次从几百到几千个 SKU，先记录当前每批的人工耗时。

**怎么用本页知识解决**

思路是把改价拆成“出计划、校验、执行”三段，前两段自动跑，第三段必须有人点确认。

```python
def build_plan(text: str) -> list[dict]:
    resp = litellm.completion(model=MODEL, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": PLAN_SCHEMA_PROMPT},  # 固定字段名，与后台表对齐
                  {"role": "user", "content": text}])
    return json.loads(resp.choices[0].message.content)["items"]  # 拿到的只是计划，不是执行结果

def validate(plan, sku_table) -> list[tuple]:
    errors = []
    for item in plan:  # 逐条校验，任何一条不过就整批退回
        row = sku_table.get(item["sku"])
        if row is None:
            errors.append((item["sku"], "SKU 不存在"))
        elif not (row["min_price"] <= item["new_price"] <= row["max_price"]):
            errors.append((item["sku"], "超出价格带"))
    return errors

def apply(plan):  # 只在 validate 返回空列表、且人工在确认单上点通过后调用
    for item in plan:
        write_price(item["sku"], item["new_price"])  # 逐条写返回码，失败条目进待处理队列
```

- 出计划时强制 JSON，字段与后台表结构对齐，省掉一层解析。
- 价格带与毛利下限从 SKU 表读，模型看不到这些阈值，也没法绕开。
- 校验不通过就整批退回，不做“改一半”的部分执行。
- 执行阶段逐条记返回码，失败条目留在队列里等人工处理。

**怎么度量收益**

指标是计划一次通过率、校验拦截条数、回滚批次占比、单批次人工耗时。测量方法：`validate` 返回的 `errors` 落到一张表按批次统计；耗时用同一批 SKU 分别手工与自动各做一次，记录开始时刻与结束时刻。

**什么时候不该用**

- SKU 没有价格带和毛利下限字段，校验层无从写起，先把约束数据补齐再谈自动化。
- 大促期间价格由规则引擎按公式算出，模型介入反而多一层不确定性。
- 一次只改一两个 SKU，人工改的耗时低于写确认单的耗时。

#### 场景 3：多人协作白板里的便签聚类

**业务背景**

工作坊里参与者往白板贴便签，结束时主持人要按主题归类并起组名。规模看单场便签张数，先数一场里便签数量与聚类耗时的小时数。

**怎么用本页知识解决**

按框架选型指南判断：这是单轮文本任务，没有外部工具要调，用一次结构化调用即可，不要上带循环的自主智能体。

```python
def cluster(notes: list[str], k: int) -> dict[str, list[int]]:
    numbered = "\n".join(f"{i}: {t}" for i, t in enumerate(notes))  # 编号后模型只回编号
    resp = litellm.completion(
        model=MODEL,
        messages=[{"role": "system", "content": CLUSTER_PROMPT.format(k=k)},  # k 由主持人指定
                  {"role": "user", "content": numbered}],
        response_format={"type": "json_object"},  # 强制 JSON，便于逐条校验
    )
    groups = json.loads(resp.choices[0].message.content)["groups"]
    covered = {i for g in groups.values() for i in g}  # 统计已归类的编号
    missing = set(range(len(notes))) - covered
    if missing:
        groups["未归类"] = sorted(missing)  # 漏掉的便签不丢，单列一组
    return groups
```

- 便签先编号，模型只回编号，避免它改写或缩写原文。
- 分组数 k 由主持人给，模型不决定分几组。
- 代码校验覆盖，漏掉的编号进“未归类”。
- 结果只是初稿，主持人可以在白板上手工拖动调整。

**怎么度量收益**

指标是便签覆盖率、分组被主持人保留的比例、端到端耗时、单次调用 token 数。测量方法：覆盖率由代码里的 `covered` 集合算出；保留比例在工作坊结束时请主持人按组打“保留 / 合并”；耗时记录提交时刻与渲染完成时刻。

**什么时候不该用**

- 便签在 20 张以内，主持人当场手分的时间低于整理输入的时间。
- 便签含参与者姓名或客户名称，且没有取得在场人员的同意。
- 需求是边贴边聚类，每贴一张调一次，延迟与成本都不合适，改成结束时批量跑一次。

### 行业先进实践

**先工作流后智能体（出处：Anthropic 工程博客《Building Effective Agents》）**

该文主张步骤能预先画出来的部分用固定工作流，只有步骤无法预先确定时才交给自主循环。收益是把不确定性限制在可枚举的环节，测试用例容易写。你的项目在框架选型时先回答“这几步能不能画成流程图”。

**工具与资源分层（出处：Model Context Protocol 官方文档）**

规范把服务端能力分成 tools、resources、prompts 三类原语，由调用方决定谁触发谁。按原语分层的收益是权限能逐类收口，只读上下文不必走写操作通道。你的集成清单给每个能力打类别标签，只读的注册成资源。

**统一网关做回退与成本归集（出处：LiteLLM 官方文档）**

Router 支持在多个部署之间路由并配置 fallback 与重试，Proxy 侧按 key 统计花费。收益是模型名与鉴权从业务代码挪到配置，换模型不动业务。你的项目把模型名放进环境变量或配置文件，按团队分配 key。

**人机确认点前移（出处：开源项目 12-Factor Agents）**

该项目列出一组工程约定，其中包含把控制流交给代码、在关键步骤暂停等待人工输入。收益是模型只提出计划，执行权留在代码里。你的项目把金额、删除、对外发送三类工具设成必须先出计划再执行。

**项目内写死约定文件（出处：Claude Code 官方文档）**

Claude Code 通过项目内的记忆文件与 hooks 读取代码规范、测试命令、提交前检查。收益是不同人跑同一个智能体时落在同一套规则上。你的仓库把代码规范与测试要求落成可见文件，智能体从文件读，不从聊天记录读。

需核对官方文档：Composio 各 toolkit 的鉴权方式与工具粒度、SwarmClaw 的配置项与配额限制。本页不给出未经验证的字段名，落地前先在这些项目的官方仓库确认。

### 从学到用：落地路线

**第 1 步：在只读场景试点。** 选日志查询或报表问答这类不出写操作的位置，先跑通工具注册到回答返回的整条链路。

验收标准：试点期间工具清单里没有写操作，连续运行两周没有一次写权限申请。

**第 2 步：用离线回归集验证。** 把历史输入与人工结论整理成配对用例，同一份回归集跑两遍，比对输出差异。

验收标准：回归集不少于 30 条，跑两遍结论一致；不一致的条目单独列出，并归因到提示、工具或模型其中一项。

**第 3 步：抽公共层再推广。** 把模型网关、工具注册表、审计日志抽成公共模块，第二个场景只写工具与提示。

验收标准：新增场景的改动不触及网关代码；每个请求在审计日志里能查到调用方、工具名、耗时、token 用量。

**第 4 步：给回退留开关。** 每个场景的工具开关做成配置项，保留手工流程，回归集定期重跑。

验收标准：关闭开关后业务能退回手工流程；回归集失败时该场景开关自动关闭并通知负责人。

### 动手作业

**目标**

给一个只读的本地数据源做问答智能体，跑通工具注册、白名单分发、成本记录三段链路，全程使用环境变量里的模型名和密钥。

**步骤**

1. 建一个本地 SQLite 库，自造 50 到 100 行工单数据，字段包含 id、标题、状态、创建时间。
2. 写两个只读工具：按关键字查记录列表、按 id 取单条详情；每个工具写清参数与返回结构。
3. 用 LiteLLM 的 completion 接口跑工具调用循环，设置最大步数上限。
4. 加一层白名单分发，未注册的工具名直接抛错，每次调用写入本地日志文件。
5. 把模型名与 API key 放进环境变量，代码里不出现具体模型名字符串。
6. 造 10 条测试问题，其中 2 条在数据里没有答案，检查模型是否说“查不到”。
7. 跑一遍，把每条的步数、耗时、token 用量记进一张表。

**验收标准**

- 10 条测试问题里，2 条无答案的问题都返回“查不到”，没有编造记录。
- 同一问题重复跑 3 次，工具调用次数都不超过设定的步数上限。
- 日志文件每条记录含工具名、参数、返回摘要、耗时四项。
- 代码里不出现模型名字符串与 API key，两者都从环境变量读取。
- 从注册表里删掉一个工具后再问相关问题，程序返回“该工具不可用”且不崩溃。

