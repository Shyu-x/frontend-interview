---
title: Coding Agent 对比
description: 全面对比主流 AI 编程助手，涵盖架构设计、技术特性、扩展机制和使用场景。
tags:
  - ai-agent
  - evaluation
date: 2026-05-17
---

# Coding Agent 对比

> 本文档全面对比当前主流 AI 编程助手，涵盖架构设计、技术特性、扩展机制和使用场景，为技术选型提供参考依据。

## 1. Agent 生态全景

### 1.1 产品概览

| Agent | 开发商 | 核心定位 | 开源状态 | 活跃度 |
|-------|--------|----------|----------|--------|
| **Claude Code** | Anthropic | 官方 CLI 工具，高质量代码生成与重构 | 部分开源 | 非常高 |
| **Cursor** | Cursor AI | 集成化 IDE，AI-First 编辑体验 | 闭源 | 非常高 |
| **GitHub Copilot** | Microsoft/OpenAI | IDE 插件形态，紧耦合工作流 | 闭源 | 非常高 |
| **OpenCode** | opencode.ai | 轻量级开源方案，自托管友好 | 完全开源 | 中等 |
| **CodeGPT** | Visual Studio Code 插件 | VS Code 原生扩展，生态丰富 | 闭源/部分开源 | 中等 |
| **Roo Code** | VS Code 插件 | 注重可定制性的 Copilot 替代 | 开源 | 中等 |
| **Continue.dev** | Continue.dev | 开源 AI 代码助手框架 | 完全开源 | 增长中 |

### 1.2 各 Agent 详细介绍

#### 1.2.1 Claude Code

```bash
# 安装方式
npm install -g @anthropic-ai/claude-code

# 基本使用
claude # 启动交互式会话
claude --print "实现一个防抖函数" # 单次执行
claude --resume # 恢复上次的会话
```

**核心优势**：
- 基于 Claude 3.5 Sonnet/Opus 等顶级模型
- 原生支持复杂的多步骤任务规划
- 与 Anthropic API 深度集成
- 支持本地代码库深度索引

**适用人群**：追求代码质量、需要进行复杂重构的中高级开发者。

#### 1.2.2 Cursor

```bash
# Cursor 是一款独立 IDE，基于 VS Code 分支
# 下载地址: https://cursor.sh
```

**核心优势**：
- 内置 AI 编辑功能（Tab 补全、Inline Chat、Composer）
- 支持多文件联合编辑
- 强大的上下文感知能力
- 专业的代码库问答系统

**适用人群**：希望获得无缝 AI 集成 IDE 体验的开发者。

#### 1.2.3 GitHub Copilot

```json
// .vscode/settings.json 配置示例
{
  "github.copilot.enable": {
    "*": true,
    "yaml": false,
    "plaintext": false,
    "markdown": false
  },
  "github.copilot.inlineSuggest.enable": true
}
```

**核心优势**：
- 与 GitHub 生态深度集成
- 支持多种 IDE（VS Code、JetBrains、Vim）
- 企业级安全合规
- 丰富的代码审查功能

**适用人群**：已在 GitHub 生态中的个人开发者和企业团队。

#### 1.2.4 OpenCode

```bash
# 安装
curl -L https://raw.githubusercontent.com/opencode-ai/opencode/main/install.sh | sh

# 使用
opencode "实现一个 Promise.allPolyfill"
```

**核心优势**：
- 完全开源，支持自托管
- 轻量级，资源占用低
- 支持多种后端模型

**适用人群**：需要本地部署、数据隐私敏感的场景。

#### 1.2.5 CodeGPT

```bash
# VS Code 扩展市场安装
# 扩展ID: danielptmx.vscode-codegpt
```

**核心优势**：
- VS Code 原生体验
- 支持多个 AI 提供商（Claude、GPT-4、Gemini 等）
- 代码解释和重构功能

**适用人群**：VS Code 重度用户，需要灵活切换 AI 提供商。

#### 1.2.6 Roo Code

```json
// roo-code.config.json
{
  "model": "claude-sonnet-4-20250514",
  "provider": "anthropic",
  "maxTokens": 8192,
  "temperature": 0.7,
  "autoScroll": true,
  "workspaceSymbols": true
}
```

**核心优势**：
- 完全可定制的工作流
- 支持自定义提示词模板
- 注重开发者控制权

**适用人群**：喜欢深度定制工作流的开发者。

#### 1.2.7 Continue.dev

```json
// .continue/config.json
{
  "models": [
    {
      "title": "Claude",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-latest"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Starcoder",
    "provider": "ollama",
    "model": "starcoder-3b"
  }
}
```

**核心优势**：
- 完全开源，可扩展
- 支持本地模型（Ollama）
- VS Code 和 JetBrains 插件

**适用人群**：开源爱好者，需要本地运行的团队。

## 2. 核心架构对比

### 2.1 模型选择策略

| Agent | 支持的模型 | 默认模型 | 模型切换灵活性 |
|-------|-----------|----------|---------------|
| Claude Code | Claude 3.5 Haiku/Sonnet/Opus | Claude 3.5 Sonnet | 高（可通过 API 配置） |
| Cursor | GPT-4o/Claude 3.5/自定义 | GPT-4o | 中（需要订阅） |
| Copilot | GPT-4 + 自研模型 | 闭源模型 | 低（无选择） |
| OpenCode | OpenAI/Claude/本地模型 | 可配置 | 高 |
| CodeGPT | 多提供商 | 可配置 | 高 |
| Roo Code | Claude/GPT-4/Gemini | 可配置 | 高 |
| Continue.dev | 任意 LLM API | 可配置 | 极高 |

### 2.2 工具系统设计

#### 2.2.1 Claude Code 工具系统

```typescript
// Claude Code 的核心工具类型
interface Tool {
  name: string;
  description: string;
  input_schema: object;
}

// 主要内置工具
const BUILTIN_TOOLS = [
  "Read",      // 读取文件
  "Write",     // 写入文件
  "Edit",      // 编辑文件
  "Bash",      // 执行命令
  "Grep",      // 搜索代码
  "Glob",      // 查找文件
  "WebSearch", // 网页搜索
  "WebFetch",  // 获取网页内容
];
```

**特点**：
- 工具数量精简，职责单一
- 统一的错误处理机制
- 支持工具链组合

#### 2.2.2 Cursor 工具系统

```typescript
// Cursor 的工具系统基于 LSP
interface CursorTool {
  // 文件操作
  file_read(path: string): string;
  file_write(path: string, content: string): void;
  file_edit(patch: EditPatch): void;

  // 代码搜索
  search(query: string, options?: SearchOptions): SearchResult[];

  // 终端操作
  terminal(command: string): TerminalResult;

  // Git 操作
  git(command: string): GitResult;
}
```

**特点**：
- 与 IDE 功能深度集成
- 支持光标位置感知
- 代码高亮和语法分析

#### 2.2.3 Continue.dev 工具系统

```typescript
// Continue.dev 的工具架构
class CustomTool {
  name: string;
  description: string;

  async invoke(args: any): Promise<string> {
    // 允许注册自定义工具
  }
}

// 内置工具集
const builtInTools = [
  new FileSystemTools(),
  new TerminalTools(),
  new SearchTools(),
  new LLM Tools(),
];
```

**特点**：
- 完全可扩展
- 支持工具版本控制
- 社区贡献的工具库

### 2.3 上下文管理策略

| Agent | 上下文策略 | 最大上下文 | 记忆机制 |
|-------|------------|------------|----------|
| Claude Code | 智能摘要 + 文件索引 | 200K tokens | 会话级记忆 |
| Cursor | 编辑器上下文 + 文件树 | 128K tokens | 窗口级记忆 |
| Copilot | 邻近代码 + 注释 | 4K-16K tokens | 无持久记忆 |
| OpenCode | 滚动窗口 | 可配置 | 会话级记忆 |
| CodeGPT | 对话级上下文 | 取决于提供商 | 无 |
| Roo Code | 动态窗口调整 | 可配置 | 可选持久化 |
| Continue.dev | 自定义策略 | 取决于模型 | 可配置 |

#### 2.3.1 上下文管理代码示例

```typescript
// Continue.dev 的自定义上下文策略
interface ContextStrategy {
  selectFiles(query: string): Promise<File[]>;
  buildContext(files: File[]): Promise<string>;
  compressContext(context: string): Promise<string>;
}

// 自定义上下文加载器示例
const customContextStrategy: ContextStrategy = {
  async selectFiles(query: string) {
    // 只选择最近修改的文件
    const recent = await getRecentlyModified(7);
    const relevant = await semanticSearch(query, recent);
    return relevant.slice(0, 10);
  },

  async buildContext(files: File[]) {
    // 包含文件路径和内容
    return files
      .map(f => `// ${f.path}\n${f.content}`)
      .join('\n\n');
  },

  async compressContext(context: string) {
    // 使用 LLM 进行摘要压缩
    return await compressWithLLM(context, { maxTokens: 32000 });
  }
};
```

### 2.4 状态管理方案

```typescript
// 各 Agent 的状态管理对比

// Claude Code: 基于会话的状态
interface ClaudeSession {
  sessionId: string;
  conversationHistory: Message[];
  workspaceState: {
    modifiedFiles: Set<string>;
    activeBranch: string;
  };
}

// Cursor: 基于 IDE 项目的状态
interface CursorProjectState {
  projectPath: string;
  openFiles: string[];
  cursorPositions: Map<string, Position>;
  aiContext: {
    recentEdits: Edit[];
    activeComposer: ComposerState | null;
  };
}

// Continue.dev: 可插拔的状态管理
interface ContinueState {
  config: Config;
  session: Session;
  customState: Record<string, any>; // 用户自定义
}
```

## 3. 技术特性对比

### 3.1 支持的语言和框架

| Agent | 前端 | 后端 | 移动端 | 数据科学 |
|-------|------|------|--------|----------|
| Claude Code | Vue/React/Angular/Svelte | Node/Python/Java/Go/Rust | React Native/Flutter | Pandas/TensorFlow |
| Cursor | 全部支持 | 全部支持 | 有限支持 | 支持 |
| Copilot | 优秀 | 优秀 | 一般 | 优秀 |
| OpenCode | 支持 | 支持 | 支持 | 支持 |
| CodeGPT | 取决于提供商 | 取决于提供商 | 取决于提供商 | 取决于提供商 |
| Roo Code | 良好 | 良好 | 有限 | 一般 |
| Continue.dev | 完全可配置 | 完全可配置 | 完全可配置 | 完全可配置 |

### 3.2 编辑器集成

| Agent | VS Code | JetBrains | Neovim | Emacs | 独立 IDE |
|-------|---------|----------|--------|-------|----------|
| Claude Code | CLI | CLI | CLI | CLI | - |
| Cursor | - | - | - | - | 原生支持 |
| Copilot | 官方插件 | 官方插件 | 社区插件 | 社区插件 | - |
| OpenCode | CLI | CLI | CLI | CLI | - |
| CodeGPT | 官方插件 | - | - | - | - |
| Roo Code | 官方插件 | - | - | - | - |
| Continue.dev | 官方插件 | 官方插件 | 社区插件 | - | - |

### 3.3 Git 集成能力

| Agent | Commit | Branch | Diff | PR | Stash |
|-------|--------|--------|------|-----|-------|
| Claude Code | 自动生成 | 创建/切换 | 查看 | 创建/审查 | 模拟 |
| Cursor | 智能提交 | 支持 | Diff 视图 | PR 助手 | 模拟 |
| Copilot | 提交消息 | 切换 | - | 审查建议 | - |
| OpenCode | 基础 | 基础 | 查看 | 基础 | - |
| CodeGPT | 提交消息 | - | - | - | - |
| Roo Code | 完整 | 完整 | 完整 | 完整 | 完整 |
| Continue.dev | 取决于配置 | 取决于配置 | 取决于配置 | 取决于配置 | - |

### 3.4 Claude Code Git 集成示例

```bash
# Claude Code 的 Git 命令
claude "创建一个新分支 feature/user-auth"
claude "帮我写提交消息" # 分析 diff 生成描述
claude "审查这个 PR 的改动"
```

### 3.5 调试能力

| Agent | 断点 | 变量查看 | 错误分析 | 性能分析 |
|-------|------|----------|----------|----------|
| Claude Code | - | - | 优秀 | 优秀 |
| Cursor | 集成 VS Code | 集成 VS Code | 优秀 | 良好 |
| Copilot | - | - | 基础 | - |
| OpenCode | - | - | 基础 | - |
| CodeGPT | - | - | 取决于提供商 | - |
| Roo Code | - | - | 良好 | - |
| Continue.dev | - | - | 取决于配置 | - |

### 3.6 流式输出支持

```typescript
// 各 Agent 的流式输出实现

// Claude Code: SSE 流式响应
const claudeStream = await anthropic.messages.stream({
  model: "claude-sonnet-4-20250514",
  messages: [{ role: "user", content: "实现排序算法" }],
  stream: true,
});

for await (const event of claudeStream) {
  if (event.type === "content_block_delta") {
    process.stdout.write(event.delta.text);
  }
}

// Continue.dev: 自定义流处理
import { llmStream } from "@continue/core";

const stream = await llmStream({
  model: "gpt-4",
  messages: [...],
  onChunk: (chunk: string) => {
    appendToEditor(chunk);
  },
});
```

## 4. 扩展机制对比

### 4.1 MCP 支持

| Agent | MCP 支持 | MCP 服务器数 | 自定义 MCP |
|-------|----------|-------------|------------|
| Claude Code | 原生支持 | 官方 + 社区 | 支持 |
| Cursor | 通过 API | 有限 | 有限 |
| Copilot | 有限 | 官方 | 不支持 |
| OpenCode | 支持 | 有限 | 支持 |
| CodeGPT | - | - | - |
| Roo Code | 支持 | 可配置 | 支持 |
| Continue.dev | 支持 | 完全可配置 | 支持 |

#### 4.1.1 MCP 配置示例

```json
// Claude Code / Roo Code MCP 配置
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"],
      "env": {}
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

### 4.2 插件系统

| Agent | 插件系统 | 插件市场 | API 开放 |
|-------|----------|----------|----------|
| Claude Code | 工具注册 | - | 部分开放 |
| Cursor | 内置功能 | 有限 | 有限 |
| Copilot | Extensions API | GitHub Marketplace | 企业 API |
| OpenCode | 模块化 | - | 完全开放 |
| CodeGPT | 扩展市场 | VS Code 市场 | API |
| Roo Code | VS Code 扩展 | VS Code 市场 | 有限 |
| Continue.dev | 插件架构 | 社区 | 完全开放 |

#### 4.2.1 Continue.dev 自定义插件示例

```typescript
// Continue.dev 插件示例
import { BaseContinuePlugin } from "@continue/core";

class MyPlugin extends BaseContinuePlugin {
  name = "my-custom-plugin";
  displayName = "My Custom Plugin";

  tools = [
    {
      name: "my_custom_tool",
      description: "执行自定义任务",
      parameters: {
        type: "object",
        properties: {
          input: { type: "string" }
        }
      },
      run: async ({ input }: { input: string }) => {
        // 自定义实现
        return `处理结果: ${input}`;
      }
    }
  ];

  slashCommands = [
    {
      name: "mycommand",
      description: "执行自定义命令",
      run: async (args: string) => {
        // 实现命令逻辑
      }
    }
  ];
}

export default MyPlugin;
```

### 4.3 API 开放性

| Agent | REST API | WebSocket | SDK | Hooks |
|-------|----------|-----------|-----|-------|
| Claude Code | - | - | Node.js/Python | 有限 |
| Cursor | - | - | - | - |
| Copilot | 企业级 | - | 有限 | 有限 |
| OpenCode | 完整 | - | 完整 | 完整 |
| CodeGPT | API 密钥 | - | - | - |
| Roo Code | - | - | - | 有限 |
| Continue.dev | 完整 | 支持 | 完整 | 完整 |

## 5. 使用场景分析

### 5.1 个人开发场景

```
┌─────────────────────────────────────────────────────────────────┐
│                      个人开发者画像                             │
├─────────────────────────────────────────────────────────────────┤
│  需求特点：                                                      │
│  - 追求开发效率最大化                                             │
│  - 需要快速上手，零配置                                          │
│  - 预算有限，关注性价比                                           │
│  - 希望跨项目统一体验                                             │
├─────────────────────────────────────────────────────────────────┤
│  推荐方案：                                                       │
│  第 1 Cursor - 一体化体验，开箱即用                                │
│  第 2 Claude Code + MCP - 灵活强大，可扩展                         │
│  第 3 GitHub Copilot - 生态成熟，稳定可靠                          │
└─────────────────────────────────────────────────────────────────┘
```

**场景细分**：

| 使用场景 | 推荐工具 | 原因 |
|----------|----------|------|
| 快速原型开发 | Cursor | 实时编辑，即时反馈 |
| 复杂重构 | Claude Code | 深度理解上下文，规划能力强 |
| 轻量任务 | Copilot | 无缝集成，开销低 |
| 开源项目 | Continue.dev | 完全可控，社区支持 |

### 5.2 团队协作场景

```
┌─────────────────────────────────────────────────────────────────┐
│                      团队协作画像                               │
├─────────────────────────────────────────────────────────────────┤
│  需求特点：                                                      │
│  - 代码风格一致性                                                │
│  - 知识共享与传承                                                │
│  - 统一的代码规范                                                │
│  - 可审计的 AI 交互记录                                          │
├─────────────────────────────────────────────────────────────────┤
│  推荐方案：                                                       │
│  第 1 GitHub Copilot Business - 企业级管理，合规性强               │
│  第 2 Cursor Team - 共享上下文，协作增强                          │
│  第 3 Continue.dev + 自托管 - 完全可控，数据安全                   │
└─────────────────────────────────────────────────────────────────┘
```

**团队配置示例**：

```json
// Continue.dev 团队配置文件
{
  "team": {
    "sharedConfig": {
      "codingStandards": "./.team/coding-standards.md",
      "commonPatterns": "./.team/patterns/",
      "doNotModify": [".env", "*.secret.*"]
    },
    "contextProviders": [
      {
        "type": "codebase",
        "includePatterns": ["src/**", "lib/**"],
        "excludePatterns": ["*.test.ts", "*.spec.ts"]
      },
      {
        "type": "documentation",
        "paths": ["./docs/**", "README.md", "CHANGELOG.md"]
      }
    ]
  }
}
```

### 5.3 企业部署场景

```
┌─────────────────────────────────────────────────────────────────┐
│                      企业部署画像                               │
├─────────────────────────────────────────────────────────────────┤
│  需求特点：                                                      │
│  - 数据安全和隐私合规                                            │
│  - 企业身份集成（SSO/LDAP）                                     │
│  - 集中管理和审计                                                │
│  - 定制化训练和微调                                              │
├─────────────────────────────────────────────────────────────────┤
│  推荐方案：                                                       │
│  第 1 OpenCode 自托管 - 完全私有，数据不离境                       │
│  第 2 Claude API + 企业部署 - 高质量，可控                        │
│  第 3 Continue.dev 自托管 - 开源可控，社区活跃                    │
└─────────────────────────────────────────────────────────────────┘
```

**企业级架构示例**：

```yaml
# OpenCode 企业部署架构
# docker-compose.yml

version: '3.8'
services:
  opencode:
    image: opencode-ai/opencode:latest
    ports:
      - "8080:8080"
    environment:
      - DEFAULT_MODEL=claude-3-5-sonnet-latest
      - API_PROVIDER=anthropic
      - API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./config:/app/config
      - ./data:/app/data

  mcp-servers:
    - name: internal-docs
      type: filesystem
      config:
        path: /shared/docs

    - name: database-schema
      type: postgres
      config:
        connection: ${INTERNAL_DB_URL}
```

## 6. 选型建议

### 6.1 根据场景推荐矩阵

| 评估维度 | Claude Code | Cursor | Copilot | OpenCode | Continue |
|----------|-------------|--------|---------|----------|----------|
| **上手难度** | 中 | 低 | 低 | 中 | 中 |
| **代码质量** | 极高 | 高 | 高 | 中 | 取决于配置 |
| **响应速度** | 快 | 快 | 快 | 取决于模型 | 取决于模型 |
| **上下文深度** | 200K | 128K | 16K | 可配置 | 可配置 |
| **协作功能** | 有限 | 中 | 高 | 中 | 高 |
| **数据隐私** | 高 | 中 | 中 | 极高 | 极高 |
| **成本** | API 费用 | 订阅制 | 订阅制 | 自托管 | 自托管 |
| **扩展性** | 高 | 中 | 低 | 高 | 极高 |

### 6.2 成本考虑

```
成本分析对比（按月估算）

个人用户：
┌──────────────────────────────────────────────────────────────────┐
│  工具              │ 月成本（估算）│ 备注                      │
├────────────────────┼──────────────┼────────────────────────────┤
│  Claude Code       │ $20-100      │ 按 API 用量计费            │
│  Cursor Pro        │ $20          │ 固定订阅                   │
│  Copilot           │ $10-19       │ 个人版/VS Code 版          │
│  OpenCode          │ $0-50        │ 完全免费，仅 API 费用      │
│  Continue.dev      │ $0-50        │ 完全免费，仅 API 费用      │
└──────────────────────────────────────────────────────────────────┘

企业用户：
┌──────────────────────────────────────────────────────────────────┐
│  工具              │ 月成本（估算）│ 备注                      │
├────────────────────┼──────────────┼────────────────────────────┤
│  Copilot Business  │ $19/人       │ 含管理控制台              │
│  Copilot Enterprise│ $39/人       │ 含 SSO 和高级功能         │
│  OpenCode 自托管   │ Varies       │ 服务器 + API 费用          │
│  Continue 自托管   │ Varies       │ 服务器 + API 费用          │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 迁移策略

#### 6.3.1 从 Copilot 迁移

```bash
# 1. 导出 Copilot 配置
# 位置: ~/.config/Code/User/globalStorage/github-copilot/

# 2. 迁移到 Cursor
# - 安装 Cursor
# - 登录相同账号
# - 启用 Copilot 兼容模式（设置中）

# 3. 配置替代工具
{
  "cursor.enableCopilotCompatibility": true,
  "cursor.copilotModel": "claude-3-5-sonnet-latest"
}
```

#### 6.3.2 从 Claude Code 迁移到 Continue.dev

```json
// continue/config.json
{
  "models": [
    {
      "title": "Claude",
      "provider": "anthropic",
      "model": "claude-sonnet-4-20250514",
      "apiKey": process.env.ANTHROPIC_API_KEY
    }
  ],
  "embeddings": {
    "provider": "openai",
    "model": "text-embedding-3-small"
  }
}
```

#### 6.3.3 多工具共存配置

```json
// 推荐的多工具共存配置
{
  "editor": "Cursor",
  "cli": "Claude Code",
  "local": "Continue.dev",
  "vscode-plugins": ["Roo Code", "CodeGPT"],
  "usage": {
    "quick-complete": "Copilot / Roo Code",
    "complex-task": "Claude Code",
    "deep-analysis": "Cursor Composer",
    "local-model": "Continue.dev + Ollama"
  }
}
```

### 6.4 决策流程图

```
                    开始选型
                       │
                       ▼
              ┌────────────────┐
              │  预算多少？     │
              └───────┬────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
    预算充足                    预算有限
        │                           │
        ▼                           ▼
   ┌─────────┐                ┌─────────────┐
   │企业级？ │                │自托管可行？ │
   └────┬────┘                └──────┬──────┘
        │                            │
    ┌───┴───┐                    ┌───┴───┐
    ▼       ▼                    ▼       ▼
   是      否                   是      否
    │       │                    │       │
    ▼       ▼                    ▼       ▼
┌────────┐Cursor/        ┌──────────┐Roo Code/
└────────┘Copilot        │OpenCode/ │Copilot
                        │Continue  │
                        └──────────┘
```

## 7. 附录

### 7.1 A. 快速对比表

| 特性 | Claude Code | Cursor | Copilot | OpenCode | Continue |
|------|-------------|--------|---------|----------|----------|
| 开源 | 部分 | 否 | 否 | 是 | 是 |
| 自托管 | 支持 | 否 | 企业版 | 支持 | 支持 |
| 模型选择 | 灵活 | 有限 | 无 | 灵活 | 完全灵活 |
| 价格 | API | 订阅 | 订阅 | 免费+API | 免费+API |
| 上手 | 中等 | 简单 | 简单 | 中等 | 中等 |
| 企业特性 | 有限 | 中等 | 完善 | 自定义 | 自定义 |

### 7.2 B. 参考资源

- [Claude Code 官方文档](https://docs.anthropic.com/claude-code)
- [Cursor 官网](https://cursor.sh)
- [GitHub Copilot 文档](https://docs.github.com/copilot)
- [OpenCode GitHub](https://github.com/opencode-ai/opencode)
- [Continue.dev 文档](https://docs.continue.dev)
- [MCP 官方协议](https://modelcontextprotocol.io)

### 7.3 C. 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-05-14 | 1.0.0 | 初始文档创建 |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Agent SDK 概览](https://docs.claude.com/en/api/agent-sdk/overview) | 官方 SDK 概览，理解编码 Agent 的工具调用与循环模型。 | 读 Quickstart 与工具章节，再写一个读本地目录并总结的小 Agent，观察工具调用日志。 |
| [A practical guide to building agents（OpenAI）](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | OpenAI 官方指南，用模型、工具、指令三要素拆解 Agent 设计。 | 通读后用三要素检查自己的 Agent 设计，列出缺失项并补齐。 |
| [Agent Client Protocol](https://agentclientprotocol.com/) | 编辑器与编码 Agent 的通信协议规范，理解客户端集成边界。 | 读协议概览与会话生命周期，思考编辑器如何驱动 Agent 完成编辑。 |
| [Agent Skills 概览](https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview) | 官方说明 Skills 的按需加载机制，是扩展机制对比的关键。 | 读结构定义与加载时机，为常用任务写一个 SKILL.md 验证是否按需加载。 |
| [Claude 子 Agent 文档](https://docs.claude.com/en/docs/claude-code/sub-agents) | 子 Agent 的权限与上下文隔离设计，适合对比多 Agent 方案。 | 读配置字段，创建一个只读代码审查 subagent，限制工具权限后跑一次。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [smolagents 仓库](https://github.com/huggingface/smolagents) | 核心代码不足千行，是理解最小 Agent 循环的最佳样本。 | 顺主循环读工具解析与终止条件，再自己重写一遍循环对比。 |
| [Claude Agent SDK（TypeScript）](https://github.com/anthropics/claude-agent-sdk-typescript) | 可运行的 TypeScript SDK 仓库，示例完整便于对照实现。 | 跑通 README 示例，再把自己的函数注册成自定义工具观察调用链。 |
| [pi 编码 Agent 工具集](https://github.com/earendil-works/pi) | 编码 Agent 的 agent loop 与统一 LLM API 实现，可直接对照。 | 读 agent loop 与模型适配层，对照自己的循环记下差异点。 |
| [Google ADK（Python）仓库](https://github.com/google/adk-python) | 官方 Python 仓库，samples 展示 Agent 抽象与工具组织方式。 | 读 samples 下两三个例子，对比你熟悉框架的抽象差异。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [LLM Powered Autonomous Agents（Lilian Weng）](https://lilianweng.github.io/posts/2023-06-23-agent/) | 经典综述，把规划、记忆、工具三条主线讲得很透彻。 | 精读规划、记忆、工具三部分，各写一段理解并对照自己的 Agent。 |
| [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) | 一线多 Agent 系统复盘，讲清 lead agent 与 subagent 的拆分代价。 | 画出文中调用关系图，据此判断自己的场景是否值得拆多 Agent。 |
| [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | 上下文工程的实操原则，直接影响 Agent 的稳定性与成本。 | 读完后检查自己的 Agent 提示，删掉重复上下文并记录 token 变化。 |
| [Agents（Chip Huyen）](https://huyenchip.com/2025/01/07/agents.html) | 系统梳理 Agent 的工具与规划环节，适合做设计查漏。 | 读工具与规划章节，逐条对照找出自己 Agent 缺失的环节。 |
| [Awesome AI Agents](https://github.com/e2b-dev/awesome-ai-agents) | 按类别汇总 Agent 项目，快速建立生态全景认知。 | 浏览分类，挑两个同类 Agent 对比其设计取舍与定位差异。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格改造（单页渲染 5 万行） | 仓库索引与上下文召回（核心架构对比） | 带仓库索引的编码代理 + 组件库文档 MCP 服务 | 单次改动跨 30 个以上文件时先分批提交，否则 diff 无法评审 |
| 低端安卓手机的首屏加载优化 | 工具调用与外部产物读取（技术特性对比） | 编码代理 + 导出的 trace 文件 + 产物分析命令 | 代理看不到真机，必须把性能录制结果落盘再喂给它 |
| 多人协作白板的实时冲突排查 | 子代理与任务分解（核心架构对比） | 编码代理 + 本地可跑的并发复现脚本 | 时序缺陷必须先有稳定复现脚本，否则改动无法验证 |
| 单体后端拆出接口兼容层 | 跨仓库检索与调用点更新（核心架构对比） | 编码代理 + 语言服务器诊断 | 纯文本搜索会漏掉反射与动态调用，要叠加类型检查 |
| CI 流水线里自动修 lint 与类型错误 | 非交互模式与权限限制（技术特性对比） | 代理 CLI 非交互模式 + CI 机器人账号 | 限定可写路径，禁止代理改测试文件来让检查通过 |
| 遗留 Java 项目升级依赖大版本 | 长任务规划与错误反馈循环（核心架构对比） | 编码代理 + 构建工具报错重试 | 每轮只升一个依赖，保留可单独回滚的提交 |
| 数据报表 SQL 与指标口径对齐 | MCP 接入内部数据目录（扩展机制对比） | 编码代理 + 表结构 MCP 服务 | 代理不直连生产库，只接只读副本或脱敏样本 |
| 开源仓库 issue 初筛与复现脚本 | 自定义命令与提示模板（扩展机制对比） | 编码代理 + 仓库内命令定义 | 生成的脚本先人工确认再执行，防止任意代码执行 |
| 多语言文档与代码注释同步 | 规则文件与项目约定（扩展机制对比） | 编码代理 + 仓库内规则文件 | 术语表放进仓库，让代理和人引用同一份 |

### 三个场景拆解

#### 场景 1：后台管理系统的万行表格改造

**业务背景**：一个后台订单页的表格组件文件超过 3000 行，被 40 多个页面引用，列配置以复制粘贴方式散落。用 React DevTools Profiler 录一次滚动，能看到提交次数随行数线性上升。

**怎么用本页知识解决**：先让代理只读、产出调用点清单，再按目录分批改，每批一个提交。

```bash
# 1. 只读阶段：先落盘调用点清单，作为改造范围的证据
grep -rn "BigTable" src --include=*.tsx > /tmp/callers.txt
wc -l /tmp/callers.txt          # 统计受影响文件数，决定是否分批

# 2. 按目录分批，每批单独分支，出错可整批丢弃
git checkout -b refactor/table-batch-1
# 提示词限定：只改 src/pages/order 下的调用点，对外 props 不变

# 3. 改完立刻跑类型检查和本批测试
npx tsc --noEmit                # 类型错误作为第一道闸门
npx jest src/pages/order --silent   # 只跑本批相关测试，缩短反馈

# 4. 提交前让代理把 diff 与清单对照，报告漏改项
git diff --stat                 # 核对改动文件数是否与清单一致
```

- 清单先行，把"改哪些文件"变成可核对的文件，避免代理边改边扩大范围。
- 分批提交让回滚粒度停在目录级，评审一次只看几十行。
- 类型检查放在测试之前，因为它几秒内就能给出结论。
- 提示词写死"对外 props 不变"，把兼容性约束交给编译器和调用方测试守。
- 最后一步的清单对照，用来发现代理漏改的调用点，而不是用来确认它改对了。

**怎么度量收益**：用 React DevTools Profiler 记录同一次滚动操作的提交次数与渲染耗时；用 Lighthouse 看该页面的 Total Blocking Time；用 `npx jest --coverage` 看改动目录的行覆盖率是否下降；用 `git diff --stat` 统计每批改动文件数。

**什么时候不该用**：
- 表格组件是第三方库且无源码，代理只能改包装层，改动落不到渲染热点上。
- 项目没有类型检查和测试基线，改完拿不到回归信号，等于盲改。
- 该页面下个迭代就要整体重写，改造投入收不回来。

#### 场景 2：低端安卓手机的首屏加载优化

**业务背景**：同一份前端产物在低端安卓机上首屏白屏时间明显长于旗舰机，团队只有旗舰机上的测量数据。需要固定设备与网络条件，把测量做成可重复的步骤。

**怎么用本页知识解决**：把性能录制导出成文件喂给代理，让它给出候选清单，真机验证由人跑。

```bash
# 1. 固定测试条件：同一台设备、同一网络、清缓存后再测
adb shell pm clear com.example.app     # 每次测量前清本地缓存，保证可比

# 2. 导出 trace 交给代理分析（代理看不到真机，只能读文件）
#    Chrome DevTools -> Performance -> 录制首屏 -> Export 存为 trace.json
ls -lh trace.json                      # 确认文件已落盘再让代理读

# 3. 让代理基于 trace 与产物给出候选清单，不直接改代码
npx source-map-explorer dist/*.js      # 产物体积构成，作为候选排序依据

# 4. 每改一项，回到第 1 步用同一指标重测，只记录数值
```

- 清缓存这一步不能省，否则第二次测量读到的是磁盘缓存，数据不可比。
- trace 文件是代理能拿到的一手证据，比口头描述"卡"要有用。
- 产物体积构成决定先动哪个依赖，避免凭感觉压缩。
- 代理只出候选清单，是因为它无法判断真机上的原生启动开销。
- 每项改动单独重测，才能把收益归到具体那一项上。

**怎么度量收益**：Chrome DevTools Performance 面板的 First Contentful Paint 与 Total Blocking Time；Lighthouse 移动端模式的性能评分；同一份 trace.json 里主线程长任务的数量与总时长；`source-map-explorer` 给出的首屏包体积。

**什么时候不该用**：
- 瓶颈在网络往返或后端接口，前端改动动不到主线程。
- 只在旗舰机上测，测不出低端机与旗舰机的差异。
- 优化点落在原生启动流程或 WebView 内核版本上，代理改不到那层代码。

#### 场景 3：多人协作白板的实时冲突排查

**业务背景**：两个人同时拖动同一图形时，后到的操作偶发丢失。手工点击无法稳定复现，缺陷单挂了几周仍在。复现依赖操作到达服务端的顺序，需要把顺序写死。

**怎么用本页知识解决**：先让代理写可重复的并发脚本，稳定复现后再改合并逻辑。

```js
// 用两个客户端实例跑固定操作序列，把时序写死，保证每次结果一致
const a = makeClient('A');            // 客户端 A，独立状态
const b = makeClient('B');            // 客户端 B，独立状态
const ops = [                          // 操作序列写死在代码里，不靠手点
  () => a.move('rect-1', { x: 10 }),   // A 先移动图形
  () => b.move('rect-1', { x: 30 }),   // B 紧接着移动同一图形
  () => a.flush(),                     // A 把操作发给服务端
  () => b.flush(),                     // B 再发，制造乱序到达
];
run(ops);                              // 顺序执行，结果可重复
assert.equal(server.state('rect-1').x, 30); // 断言表达"期望谁赢"
```

- 先写断言再改实现，断言就是冲突规则的书面表达。
- 把顺序写死在数组里，缺陷从此可复现，代理才有反馈循环可用。
- 先跑一次确认断言失败，再让代理动合并逻辑，避免改到别的地方。
- 断言只写数值，不写"应该正确"这类判断，失败信息才可读。

**怎么度量收益**：用 `npx jest` 看冲突断言的通过数量；把操作序列随机排列 100 次做 fuzz，统计结果不一致的次数；线上用自定义计数器看冲突上报次数与协同会话中断率。

**什么时候不该用**：
- 产品以单人使用为主，协作是低频功能。
- 冲突的裁决规则还没定下来，先改代码等于把临时规则焊进实现。
- 本地起不了两个客户端加一个服务端，代理拿不到复现环境。

### 行业先进实践

**在仓库根目录放一份代理约定文件（出处：AGENTS.md 开源约定文档）**
做法是把构建命令、测试命令、代码风格写成仓库内的纯文本文件，代理每次开工先读它。它把团队约定从人的记忆搬到版本控制里，评审时也能一并看到约定变更。你的项目可以先写三条命令：装依赖、跑测试、跑类型检查。

**用 MCP 把内部工具接给代理（出处：Model Context Protocol 官方文档）**
MCP 是一套让代理调用外部工具与数据源的协议，服务端由你自己的团队实现。好处是工具清单和鉴权放在服务端统一管，不用给每个客户端单独写适配。借鉴时先从只读工具起步，例如查表结构、查工单状态。

**让代理在独立工作区改动（出处：Git 官方文档中的 worktree 与分支机制）**
把代理的改动限制在独立分支或独立工作树里，人只看 diff 决定是否合并。这样代理的实验不会污染主工作区，回滚成本停在删除分支这一步。落地时给代理分支加命名前缀，方便一次清理。

**按提示注入风险给外部内容分级（出处：OWASP Top 10 for LLM Applications）**
该清单把提示注入列为 LLM 应用的首要风险，来源包括 issue 正文、依赖包说明、网页内容。做法是区分"可信指令"（你自己写的提示词）与"不可信数据"（代理读到的外部文本），并限制代理在读到外部文本后能执行的动作。你的项目可以从禁止代理对拉取的外部内容自动执行脚本开始。

**需核对官方文档：代理在 CI 中的退出码与权限开关**
具体核对三件事：你的代理 CLI 在非交互模式下改动文件时的退出码约定、是否能配置允许写入的路径白名单、以及是否支持只读模式。核对完再决定它跑在 PR 校验阶段还是自动修复阶段。

### 从学到用：落地路线

1. **试点**：选一个改动范围可枚举、有测试覆盖的模块，让代理只做只读分析并产出清单。
   验收标准：清单里的文件数与 `grep` 结果一致，且试点期间没有代码被改动。
2. **验证**：在同一模块上让代理做一次真实改动，用测试与类型检查判定结果。
   验收标准：改动落在清单范围内，测试与类型检查全绿，diff 能被人逐行读完。
3. **推广**：把提示模板、约定文件和检查命令固化进仓库，其他模块照抄这一套。
   验收标准：另一位同事不看口头说明就能跑通同样的流程，产出同样的检查结果。
4. **防回退**：把检查命令接到 CI，代理改动必须通过同一组闸门才能合并。
   验收标准：故意引入一个类型错误时 CI 会失败，且失败信息指向具体文件与行号。

### 动手作业

**目标**：给一个存量前端项目建立"代理可安全改动"的最小闭环，覆盖约定文件、只读分析、受限改动、CI 闸门四件事。

**步骤**：
1. 选一个页面组件文件超过 800 行、且有测试覆盖的模块，记录它当前的测试命令与类型检查命令。
2. 在仓库根目录写代理约定文件，只写三条命令：装依赖、跑测试、跑类型检查，外加一条"改动前先列出受影响文件"。
3. 让代理只读运行，产出受影响文件清单，落盘为文本文件，人工与 `grep` 结果对照。
4. 按清单分批，每批一个分支一次提交，提示词里限定允许改动的目录。
5. 每批改完跑类型检查与测试，把两次结果贴进 PR 描述。
6. 把类型检查与测试接到 CI，设为合并前必须通过。
7. 故意提交一个类型错误，确认 CI 拦住它，然后修掉。

**验收标准**：
- 约定文件在仓库根目录，三条命令逐条可执行，不看说明也能照做。
- 只读阶段结束时 `git status` 无改动，清单文件存在且文件数与 `grep` 结果一致。
- 每批提交的 diff 文件数不超过清单范围，超出部分能指出原因。
- CI 在存在类型错误时失败，失败输出包含文件名与行号。
- 另一位同事按同样步骤操作，得到的检查结论与你一致。

