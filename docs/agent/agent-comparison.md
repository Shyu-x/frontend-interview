# AI Coding Agent 对比分析文档

> 本文档全面对比当前主流 AI 编程助手，涵盖架构设计、技术特性、扩展机制和使用场景，为技术选型提供参考依据。

---

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

#### Claude Code

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

#### Cursor

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

#### GitHub Copilot

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

#### OpenCode

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

#### CodeGPT

```bash
# VS Code 扩展市场安装
# 扩展ID: danielptmx.vscode-codegpt
```

**核心优势**：
- VS Code 原生体验
- 支持多个 AI 提供商（Claude、GPT-4、Gemini 等）
- 代码解释和重构功能

**适用人群**：VS Code 重度用户，需要灵活切换 AI 提供商。

#### Roo Code

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

#### Continue.dev

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

---

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

#### Claude Code 工具系统

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

#### Cursor 工具系统

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

#### Continue.dev 工具系统

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

#### 上下文管理代码示例

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

---

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

### Claude Code Git 集成示例

```bash
# Claude Code 的 Git 命令
claude "创建一个新分支 feature/user-auth"
claude "帮我写提交消息" # 分析 diff 生成描述
claude "审查这个 PR 的改动"
```

### 3.4 调试能力

| Agent | 断点 | 变量查看 | 错误分析 | 性能分析 |
|-------|------|----------|----------|----------|
| Claude Code | - | - | 优秀 | 优秀 |
| Cursor | 集成 VS Code | 集成 VS Code | 优秀 | 良好 |
| Copilot | - | - | 基础 | - |
| OpenCode | - | - | 基础 | - |
| CodeGPT | - | - | 取决于提供商 | - |
| Roo Code | - | - | 良好 | - |
| Continue.dev | - | - | 取决于配置 | - |

### 3.5 流式输出支持

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

---

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

#### MCP 配置示例

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

#### Continue.dev 自定义插件示例

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

---

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
│  🥇 Cursor - 一体化体验，开箱即用                                │
│  🥈 Claude Code + MCP - 灵活强大，可扩展                         │
│  🥉 GitHub Copilot - 生态成熟，稳定可靠                          │
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
│  🥇 GitHub Copilot Business - 企业级管理，合规性强               │
│  🥈 Cursor Team - 共享上下文，协作增强                          │
│  🥉 Continue.dev + 自托管 - 完全可控，数据安全                   │
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
│  🥇 OpenCode 自托管 - 完全私有，数据不离境                       │
│  🥈 Claude API + 企业部署 - 高质量，可控                        │
│  🥉 Continue.dev 自托管 - 开源可控，社区活跃                    │
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

---

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

#### 从 Copilot 迁移

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

#### 从 Claude Code 迁移到 Continue.dev

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

#### 多工具共存配置

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

---

## 附录

### A. 快速对比表

| 特性 | Claude Code | Cursor | Copilot | OpenCode | Continue |
|------|-------------|--------|---------|----------|----------|
| 开源 | 部分 | 否 | 否 | 是 | 是 |
| 自托管 | 支持 | 否 | 企业版 | 支持 | 支持 |
| 模型选择 | 灵活 | 有限 | 无 | 灵活 | 完全灵活 |
| 价格 | API | 订阅 | 订阅 | 免费+API | 免费+API |
| 上手 | 中等 | 简单 | 简单 | 中等 | 中等 |
| 企业特性 | 有限 | 中等 | 完善 | 自定义 | 自定义 |

### B. 参考资源

- [Claude Code 官方文档](https://docs.anthropic.com/claude-code)
- [Cursor 官网](https://cursor.sh)
- [GitHub Copilot 文档](https://docs.github.com/copilot)
- [OpenCode GitHub](https://github.com/opencode-ai/opencode)
- [Continue.dev 文档](https://docs.continue.dev)
- [MCP 官方协议](https://modelcontextprotocol.io)

### C. 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-05-14 | 1.0.0 | 初始文档创建 |