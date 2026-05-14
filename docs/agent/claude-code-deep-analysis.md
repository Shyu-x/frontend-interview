# Claude Code 架构深度解析

> 本文档对 Claude Code 的源码架构、核心系统、算法实现进行深度剖析。
> 基于 DeepWiki 知识库与 CHANGELOG.md 构建，涵盖 1902 个源文件的分类整理。

---

## 目录

1. [源码目录树详解](#1-源码目录树详解)
2. [入口层深度剖析](#2-入口层深度剖析)
3. [Query Engine 深度解析](#3-query-engine-深度解析)
4. [工具系统深度实现](#4-工具系统深度实现)
5. [状态管理深度](#5-状态管理深度)
6. [扩展机制深度](#6-扩展机制深度)
7. [关键算法分析](#7-关键算法分析)
8. [附录：参考架构图](#8-附录参考架构图)

---

## 1. 源码目录树详解

### 1.1 顶层结构概览

```
claude-code/
├── src/                          # 核心源码 (主工程)
│   ├── utils/                    # 564 个工具函数
│   ├── components/               # 389 个 UI 组件
│   ├── commands/                # 207 个命令
│   ├── tools/                   # 184 个工具定义
│   ├── services/                # 130 个服务
│   ├── agents/                  # Agent 实现
│   ├── hooks/                   # 钩子系统
│   ├── mcp/                     # MCP 客户端
│   ├── state/                   # 状态管理
│   └── api/                     # API 调用封装
├── plugins/                      # 官方插件 (13 个)
│   ├── agent-sdk-dev/
│   ├── code-review/
│   ├── feature-dev/
│   ├── frontend-design/
│   ├── ralph-wiggum/
│   └── ...
├── .claude/                      # 用户配置目录
│   ├── skills/                   # 用户自定义技能
│   ├── sessions/                # 会话存储
│   ├── settings.json            # 用户设置
│   └── hooks/                   # 用户钩子脚本
├── .github/
│   └── workflows/               # CI/CD 工作流
└── .devcontainer/               # 开发容器配置
```

### 1.2 文件分类统计

```
| 目录              | 文件数 | 占比   | 主要职责                    |
|-------------------|--------|--------|-----------------------------|
| src/utils/        |   564  | 29.7%  | 通用工具函数、字符串处理      |
| src/components/   |   389  | 20.5%  | React UI 组件、终端渲染       |
| src/commands/     |   207  | 10.9%  | Slash 命令定义                |
| src/tools/        |   184  |  9.7%  | 工具实现（Bash/Read/Write）   |
| src/services/     |   130  |  6.8%  | API 调用、认证、会话管理      |
| src/agents/       |    ~80 |  4.2%  | Agent 核心逻辑                |
| src/hooks/        |    ~60 |  3.2%  | 钩子处理器                   |
| src/mcp/          |    ~50 |  2.6%  | MCP 协议客户端                |
| src/state/        |    ~40 |  2.1%  | 状态存储、持久化              |
| plugins/          |   ~200 | 10.5%  | 官方插件扩展                  |
| 总计              |  1902  | 100%   |                             |
```

### 1.3 src/utils/ 564 个工具函数分析

```
src/utils/
├── string/           # 字符串处理 (42 个)
│   ├── sanitize.ts          # 输入清理、HTML 转义
│   ├── truncate.ts          # 字符串截断
│   ├── template.ts          # 模板替换
│   └── tokenize.ts          # Token 计数估算
├── path/            # 路径操作 (38 个)
│   ├── resolve.ts           # 路径解析
│   ├── find.ts              # 文件搜索
│   ├── is-safe-path.ts      # 安全路径检查
│   └── glob.ts              # Glob 模式匹配
├── system/          # 系统调用 (56 个)
│   ├── exec.ts              # 命令执行
│   ├── spawn.ts             # 子进程生成
│   ├── which.ts             # 命令查找
│   └── environment.ts       # 环境变量
├── async/           # 异步工具 (47 个)
│   ├── debounce.ts          # 防抖
│   ├── throttle.ts          # 节流
│   ├── pool.ts              # 并发池
│   └── retry.ts             # 重试策略
├── crypto/          # 加密工具 (23 个)
│   ├── hash.ts              # 哈希计算
│   ├── hmac.ts              # HMAC 签名
│   └── random.ts            # 随机数生成
└── validation/      # 验证工具 (35 个)
    ├── schema.ts            # JSON Schema 验证
    ├── type.ts              # 类型检查
    └── permission.ts        # 权限规则验证
```

**核心工具函数示例**：

```typescript
// src/utils/path/is-safe-path.ts
export function isSafePath(baseDir: string, targetPath: string): boolean {
  const resolved = path.resolve(baseDir, targetPath);
  return resolved.startsWith(baseDir);
}

// src/utils/async/pool.ts - 并发池实现
export class AsyncPool<T> {
  constructor(private concurrency: number) {}
  
  async map<R>(
    items: T[], 
    fn: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;
    
    const workers = Array.from(
      { length: Math.min(this.concurrency, items.length) },
      () => this.worker(items, fn, results, () => index++)
    );
    
    await Promise.all(workers);
    return results;
  }
  
  private async worker(
    items: T[],
    fn: (item: T) => Promise<R>,
    results: R[],
    next: () => number
  ): Promise<void> {
    let index = next();
    while (index < items.length) {
      results[index] = await fn(items[index]);
      index = next();
    }
  }
}
```

### 1.4 src/components/ 389 个 UI 组件

```
src/components/
├── terminal/                 # 终端渲染 (87 个)
│   ├── Terminal.tsx          # 主终端组件
│   ├── Output.tsx            # 输出面板
│   ├── Input.tsx             # 输入框
│   ├── StatusBar.tsx         # 状态栏
│   └── Message.tsx           # 消息气泡
├── prompt/                   # 提示系统 (54 个)
│   ├── Suggestion.tsx        # 自动补全
│   ├── ContextMenu.tsx       # 右键菜单
│   └── Tooltip.tsx           # 工具提示
├── layout/                   # 布局组件 (43 个)
│   ├── Sidebar.tsx           # 侧边栏
│   ├── Panel.tsx             # 可折叠面板
│   └── Split.tsx             # 分屏布局
├── markdown/                 # Markdown 渲染 (38 个)
│   ├── Code.tsx              # 代码高亮
│   ├── Table.tsx             # 表格
│   ├── Image.tsx             # 图片
│   └── Mermaid.tsx          # Mermaid 图表
└── common/                   # 通用组件 (167 个)
    ├── Button.tsx
    ├── Modal.tsx
    ├── Dropdown.tsx
    └── ...
```

### 1.5 src/commands/ 207 个命令

```
src/commands/
├── navigation/      # 导航命令 (32 个)
│   ├── goto.ts              # 跳转到定义
│   ├── find.ts             # 全局搜索
│   └── search.ts           # 模糊搜索
├── edit/            # 编辑命令 (45 个)
│   ├── edit.ts             # 文件编辑
│   ├── create.ts           # 文件创建
│   ├── delete.ts           # 文件删除
│   └── move.ts             # 文件移动
├── analysis/        # 分析命令 (38 个)
│   ├── explain.ts          # 代码解释
│   ├── trace.ts            # 执行追踪
│   ├── graph.ts            # 依赖图生成
│   └── audit.ts            # 代码审计
├── git/             # Git 命令 (28 个)
│   ├── commit.ts           # 提交
│   ├── branch.ts           # 分支管理
│   ├── diff.ts             # 差异对比
│   └── push.ts             # 推送
└── devtools/        # 开发工具 (64 个)
    ├── test.ts              # 运行测试
    ├── build.ts            # 构建项目
    ├── lint.ts             # 代码检查
    └── format.ts           # 代码格式化
```

### 1.6 src/tools/ 184 个工具定义

```
src/tools/
├── bash/           # Bash 工具集 (23 个)
│   ├── BashTool.ts          # Shell 执行
│   ├── PowerShellTool.ts     # PowerShell 执行
│   └── DockerTool.ts        # Docker 操作
├── file/           # 文件工具集 (31 个)
│   ├── Read.ts              # 文件读取
│   ├── Write.ts             # 文件写入
│   ├── Edit.ts              # 智能编辑
│   ├── Grep.ts              # 内容搜索
│   └── Glob.ts              # 文件匹配
├── web/            # 网络工具集 (19 个)
│   ├── WebSearch.ts         # 网页搜索
│   ├── WebFetch.ts          # 内容抓取
│   └── WebScreenshot.ts     # 页面截图
├── code/           # 代码工具集 (42 个)
│   ├── Lint.ts              # 代码检查
│   ├── Format.ts            # 格式化
│   ├── TypeCheck.ts         # 类型检查
│   └── Transform.ts         # 代码转换
├── mcp/            # MCP 协议工具 (38 个)
│   ├── MCPTool.ts           # MCP 工具封装
│   ├── MCPClient.ts         # MCP 客户端
│   └── MCPTransport.ts      # 传输层
└── skill/          # 技能工具集 (31 个)
    ├── SkillInvoke.ts       # 技能调用
    ├── SkillSearch.ts       # 技能搜索
    └── SkillInstall.ts       # 技能安装
```

### 1.7 src/services/ 130 个服务

```
src/services/
├── api/            # API 服务 (28 个)
│   ├── AnthropicAPI.ts      # Anthropic API 调用
│   ├── StreamingClient.ts   # 流式客户端
│   ├── RateLimiter.ts       # 限流器
│   └── RetryHandler.ts      # 重试处理
├── auth/           # 认证服务 (15 个)
│   ├── Credentials.ts      # 凭证管理
│   ├── TokenRefresh.ts      # Token 刷新
│   └── SSO.ts              # SSO 集成
├── session/        # 会话服务 (22 个)
│   ├── SessionManager.ts    # 会话管理
│   ├── SessionStore.ts      # 会话存储
│   ├── SessionResume.ts     # 会话恢复
│   └── SessionCompact.ts    # 会话压缩
├── plugin/         # 插件服务 (18 个)
│   ├── PluginLoader.ts     # 插件加载器
│   ├── PluginRegistry.ts   # 插件注册表
│   └── PluginSandbox.ts   # 插件沙箱
└── mcp/            # MCP 服务 (25 个)
    ├── MCPConnection.ts     # MCP 连接
    ├── MCPDiscovery.ts      # 服务发现
    └── MCPOAuth.ts         # OAuth 认证
```

---

## 2. 入口层深度剖析

### 2.1 CLI Bootstrap 机制

```
                ┌─────────────────────────────────────┐
                │           claude binary               │
                │         (native binary)              │
                └──────────────────┬──────────────────┘
                                   │
                                   ▼
                ┌─────────────────────────────────────┐
                │     cli.tsx (Bootstrap Entry)        │
                │  ┌─────────────────────────────┐     │
                │  │  1. Load settings.json      │     │
                │  │  2. Initialize telemetry    │     │
                │  │  3. Setup error handlers    │     │
                │  │  4. Load CLI extensions    │     │
                │  └─────────────────────────────┘     │
                └──────────────────┬──────────────────┘
                                   │
                                   ▼
                ┌─────────────────────────────────────┐
                │     main.tsx (Main Entry)            │
                │  ┌─────────────────────────────┐     │
                │  │  1. Parse CLI arguments     │     │
                │  │  2. Handle flags/options    │     │
                │  │  3. Route to subcommands    │     │
                │  │  4. Execute preActions      │     │
                │  └─────────────────────────────┘     │
                └──────────────────┬──────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
              ▼                                         ▼
   ┌──────────────────┐                     ┌──────────────────┐
   │  快速路径        │                     │  慢速路径        │
   │  (Quick Path)    │                     │  (Slow Path)     │
   ├──────────────────┤                     ├──────────────────┤
   │  --help          │                     │  Interactive     │
   │  --version       │                     │  Session         │
   │  --print-config  │                     │  (Agent Loop)    │
   │  Single command  │                     │                  │
   └──────────────────┘                     └──────────────────┘
```

### 2.2 main.tsx 参数解析流程

```typescript
// src/main.tsx (伪代码实现)
export async function main(argv: string[]): Promise<number> {
  // Step 1: Parse raw arguments
  const parser = new ArgumentParser({
    prog: 'claude',
    description: 'Claude Code CLI',
    addHelp: true,
  });

  parser.addArgument(['--model'], { defaultValue: 'claude-3-5' });
  parser.addArgument(['--no-stream']);
  parser.addArgument(['--print']);
  parser.addArgument(['--dangerously-skip-permissions']);
  parser.addArgument(['--resume']);
  parser.addArgument(['--prompt']);
  parser.addArgument(['INPUT'], { nargs: '?' });

  const args = parser.parse(argv);

  // Step 2: Early exit for non-interactive commands
  if (args.print_config) {
    return printConfiguration();
  }
  if (args.version) {
    return printVersion();
  }

  // Step 3: Determine execution path
  const isQuickPath = args.help || args.version || args.print_config 
                    || args.input && !args.interactive;
  
  if (isQuickPath) {
    return executeQuickPath(args);
  }

  // Step 4: Full bootstrap for interactive session
  return executeSlowPath(args);
}
```

### 2.3 preActions 钩子系统

```
preActions 执行流程:

┌──────────────────────────────────────────────────────────────┐
│                     Session Lifecycle                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   SessionStart ──► preActions ──► [Agent Loop] ──► SessionEnd │
│                         │                                     │
│                         │                                     │
│                    ┌────┴────┐                               │
│                    ▼         ▼                                │
│              ┌─────────┐ ┌─────────┐                          │
│              │ Pre-    │ │ Pre-    │                          │
│              │ Actions │ │ Hooks   │                          │
│              │ (Sync)  │ │ (Async) │                          │
│              └────┬────┘ └────┬────┘                          │
│                   │           │                               │
│                   ▼           ▼                               │
│              ┌─────────┐ ┌─────────┐                          │
│              │ Execute │ │ Trigger │                          │
│              │ Scripts │ │ Hooks   │                          │
│              └────┬────┘ └────┬────┘                          │
│                   │           │                               │
│                   ▼           ▼                               │
│              ┌──────────────────────────────────┐             │
│              │   Additional Context Injection   │             │
│              └──────────────────────────────────┘             │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**preActions 完整列表**：

```typescript
// src/hooks/preActions.ts
export const preActions: PreAction[] = [
  {
    name: 'loadUserSettings',
    sync: true,
    execute: async () => {
      await settings.reload(); // Hot-reload settings
    },
  },
  {
    name: 'initializePlugins',
    sync: true,
    execute: async () => {
      await pluginManager.loadEnabled(); // Load enabled plugins
    },
  },
  {
    name: 'setupTelemetry',
    sync: false,
    execute: async () => {
      await telemetry.initialize(); // Async telemetry setup
    },
  },
  {
    name: 'validatePermissions',
    sync: true,
    execute: async () => {
      await permissionManager.validateRules(); // Validate permission rules
    },
  },
  {
    name: 'prepareSession',
    sync: true,
    execute: async (ctx) => {
      if (ctx.resume) {
        await sessionManager.resume(ctx.sessionId); // Resume session
      } else {
        await sessionManager.create(); // Create new session
      }
    },
  },
];
```

### 2.4 快速路径 vs 慢速路径

```
快速路径 (Quick Path):
════════════════════════
  场景:
  ├── claude --help                    → 显示帮助信息
  ├── claude --version                → 显示版本
  ├── claude --print-config           → 打印配置
  └── claude "single command"         → 执行单条命令后退出

  特点:
  ├── 无需启动完整 Agent Loop
  ├── 不加载 UI 组件
  ├── 无需会话持久化
  └── 响应时间 < 100ms


慢速路径 (Slow Path):
════════════════════════
  场景:
  ├── claude                          → 启动交互式会话
  ├── claude --resume <session-id>    → 恢复会话
  └── claude --interactive           → 强制交互模式

  特点:
  ├── 启动完整 Agent Loop
  ├── 加载 Terminal UI 组件
  ├── 启用会话持久化
  ├── 启动所有服务 (API、MCP、Hooks)
  └── 支持多轮对话
```

---

## 3. Query Engine 深度解析

### 3.1 while(true) 循环设计哲学

```
┌────────────────────────────────────────────────────────────────────┐
│                      Query Engine Architecture                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐                                                   │
│  │   START     │                                                   │
│  └──────┬──────┘                                                   │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              while (true) {                                  │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │  1. WAIT FOR INPUT                                     │   │   │
│  │  │     - User prompt                                      │   │   │
│  │  │     - Hook injection                                   │   │   │
│  │  │     - Tool result                                      │   │   │
│  │  │     - External event                                   │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │                          │                                    │   │
│  │                          ▼                                    │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │  2. ASSEMBLE MESSAGE                                   │   │   │
│  │  │     - System prompt                                    │   │   │
│  │  │     - Conversation history                             │   │   │
│  │  │     - Context window                                   │   │   │
│  │  │     - Available tools                                  │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │                          │                                    │   │
│  │                          ▼                                    │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │  3. SEND TO LLM                                       │   │   │
│  │  │     - streaming response                              │   │   │
│  │  │     - token-by-token rendering                        │   │   │
│  │  │     - tool_use blocks                                 │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │                          │                                    │   │
│  │                          ▼                                    │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │  4. PROCESS RESPONSE                                 │   │   │
│  │  │     - Parse tool calls                               │   │   │
│  │  │     - Execute tools (parallel)                        │   │   │
│  │  │     - Collect results                                │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │                          │                                    │   │
│  │     ┌────────────────────┴────────────────────┐            │   │
│  │     │                                         │            │   │
│  │     ▼                                         ▼            │   │
│  │  ┌──────────┐                           ┌──────────────┐  │   │
│  │  │ more     │                           │ loop again   │  │   │
│  │  │ work?    │                           │ (continue)   │  │   │
│  │  └───┬──────┘                           └──────────────┘  │   │
│  │      │ YES                                    │            │   │
│  │      │                                        │            │   │
│  │      ▼                                        │            │   │
│  │  ┌──────────┐                                 │            │   │
│  │  │ EXECUTE  │ ◄────────────────────────────────┘            │   │
│  │  │ TOOLS    │                                              │   │
│  │  └──────────┘                                              │   │
│  │      │                                                     │   │
│  │      │ NO                                                 │   │
│  │      ▼                                                     │   │
│  │  ┌──────────┐                                              │   │
│  │  │  EXIT    │                                              │   │
│  │  └──────────┘                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 状态机实现

```typescript
// src/engine/QueryStateMachine.ts
enum QueryState {
  IDLE = 'IDLE',
  WAITING_INPUT = 'WAITING_INPUT',
  ASSEMBLING_MESSAGE = 'ASSEMBLING_MESSAGE',
  SENDING_TO_LLM = 'SENDING_TO_LLM',
  PROCESSING_TOOL_CALLS = 'PROCESSING_TOOL_CALLS',
  EXECUTING_TOOLS = 'EXECUTING_TOOLS',
  COLLECTING_RESULTS = 'COLLECTING_RESULTS',
  CHECKING_CONTINUATION = 'CHECKING_CONTINUATION',
  COMPACTING_CONTEXT = 'COMPACTING_CONTEXT',
  EXITING = 'EXITING',
}

export class QueryStateMachine {
  private state: QueryState = QueryState.IDLE;
  private history: QueryState[] = [];

  transition(newState: QueryState): void {
    const validTransitions: Record<QueryState, QueryState[]> = {
      [QueryState.IDLE]: [QueryState.WAITING_INPUT],
      [QueryState.WAITING_INPUT]: [
        QueryState.ASSEMBLING_MESSAGE,
        QueryState.EXITING,
      ],
      [QueryState.ASSEMBLING_MESSAGE]: [QueryState.SENDING_TO_LLM],
      [QueryState.SENDING_TO_LLM]: [
        QueryState.PROCESSING_TOOL_CALLS,
        QueryState.CHECKING_CONTINUATION,
      ],
      [QueryState.PROCESSING_TOOL_CALLS]: [QueryState.EXECUTING_TOOLS],
      [QueryState.EXECUTING_TOOLS]: [QueryState.COLLECTING_RESULTS],
      [QueryState.COLLECTING_RESULTS]: [
        QueryState.WAITING_INPUT,
        QueryState.COMPACTING_CONTEXT,
      ],
      [QueryState.CHECKING_CONTINUATION]: [
        QueryState.WAITING_INPUT,
        QueryState.EXITING,
      ],
      [QueryState.COMPACTING_CONTEXT]: [
        QueryState.WAITING_INPUT,
        QueryState.EXITING,
      ],
      [QueryState.EXITING]: [QueryState.IDLE],
    };

    if (!validTransitions[this.state].includes(newState)) {
      throw new Error(
        `Invalid state transition: ${this.state} -> ${newState}`
      );
    }

    this.history.push(this.state);
    this.state = newState;
    this.emit('stateChange', { from: this.history.at(-2), to: newState });
  }

  canContinue(): boolean {
    return this.state === QueryState.CHECKING_CONTINUATION;
  }

  shouldExit(): boolean {
    return this.state === QueryState.EXITING;
  }
}
```

### 3.3 消息组装策略

```
消息组装流程:

┌─────────────────────────────────────────────────────────────────┐
│                    Message Assembly Pipeline                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│  │   System    │    │   Context  │    │   Tool     │           │
│  │   Prompt    │ +  │   Window   │ +  │   Schema   │           │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘           │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                   │
│                            │                                       │
│                            ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Token Budget Calculator                  │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  max_tokens = context_window - reserved - history  │  │  │
│  │  │                                                      │  │  │
│  │  │  reserved = max_output_tokens + safety_margin       │  │  │
│  │  │  safety_margin = 200 tokens                         │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            │                                       │
│                            ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Message Truncation                      │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  1. Sort history by importance (recency + relevance) │  │  │
│  │  │  2. Binary search for max messages fit in budget      │  │  │
│  │  │  3. Preserve system prompt (never truncate)          │  │  │
│  │  │  4. Keep last N user/assistant pairs                 │  │  │
│  │  │  5. Truncate tool results > 50KB to disk             │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            │                                       │
│                            ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Final Message Array                      │  │
│  │  [system_message, ...conversation_history, current_turn]  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**消息组装核心代码**：

```typescript
// src/engine/MessageAssembler.ts
export class MessageAssembler {
  constructor(
    private contextWindow: number,
    private maxOutputTokens: number,
    private tokenizer: Tokenizer
  ) {}

  assemble(
    systemPrompt: string,
    history: Message[],
    currentTurn: Message,
    availableTools: Tool[]
  ): Message[] {
    // Calculate token budgets
    const systemTokens = this.tokenizer.count(systemPrompt);
    const toolTokens = this.estimateToolTokens(availableTools);
    const safetyMargin = 200;
    const reservedTokens = this.maxOutputTokens + safetyMargin;
    const availableTokens = this.contextWindow - systemTokens 
                           - toolTokens - reservedTokens;

    // Build messages within budget
    const messages: Message[] = [];
    
    // Always include system prompt
    messages.push({ role: 'system', content: systemPrompt });

    // Add history messages (oldest first for proper context)
    let tokenCount = systemTokens;
    for (const msg of history) {
      const msgTokens = this.tokenizer.count(msg.content);
      if (tokenCount + msgTokens > availableTokens) {
        break; // Budget exhausted
      }
      messages.push(msg);
      tokenCount += msgTokens;
    }

    // Add current turn
    messages.push(currentTurn);

    return messages;
  }

  private estimateToolTokens(tools: Tool[]): number {
    // MCP tool descriptions capped at 2KB each
    return tools.reduce((sum, tool) => {
      const desc = tool.description.substring(0, 2048);
      return sum + this.tokenizer.count(desc);
    }, 0);
  }
}
```

### 3.4 Streaming 响应处理

```
Streaming 响应处理流水线:

┌──────────────────────────────────────────────────────────────────────┐
│                        Streaming Pipeline                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   API Response (SSE)                                                  │
│   │                                                                    │
│   │  data: {"type":"content_block_delta","delta":{"type":"text_delta",│
│   │         "text":"Hello"}}                                         │
│   │  data: {"type":"content_block_delta","delta":{"type":"text_delta",│
│   │         "text":" world"}}                                         │
│   │  data: {"type":"content_block_stop"}                              │
│   │                                                                    │
│   └──────────────────┬───────────────────────────────────────────────┘
│                      │
│                      ▼
│   ┌───────────────────────────────────────────────────────────────┐
│   │                    Delta Assembler                            │
│   │  ┌─────────────────────────────────────────────────────────┐ │
│   │  │  1. Accumulate deltas into content blocks               │ │
│   │  │  2. Identify block boundaries (text vs tool_use)         │ │
│   │  │  3. Handle streaming interruptions                      │ │
│   │  └─────────────────────────────────────────────────────────┘ │
│   └───────────────────────────────────────────────────────────────┘
│                      │
│          ┌───────────┴───────────┐
│          │                       │
│          ▼                       ▼
│   ┌─────────────┐         ┌─────────────┐
│   │   Text      │         │  tool_use   │
│   │   Block     │         │   Block     │
│   │  (Streaming │         │  (Complete) │
│   │   Output)   │         │             │
│   └──────┬──────┘         └──────┬──────┘
│          │                       │
│          ▼                       ▼
│   ┌───────────────────────────────────────────────────────────────┐
│   │                    UI Renderer                               │
│   │  ┌─────────────────────────────────────────────────────────┐ │
│   │  │  1. Token-by-token display (configurable speed)         │ │
│   │  │  2. Syntax highlighting                                 │ │
│   │  │  3. Code block formatting                               │ │
│   │  │  4. Progress indicator for tool calls                   │ │
│   │  └─────────────────────────────────────────────────────────┘ │
│   └───────────────────────────────────────────────────────────────┘
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 4. 工具系统深度实现

### 4.1 Tool 基类设计

```
Tool 基类继承层次:

┌─────────────────────────────────────────────────────────────────┐
│                      Tool Interface                              │
├─────────────────────────────────────────────────────────────────┤
│  + name: string                                                  │
│  + description: string                                           │
│  + inputSchema: JSONSchema                                       │
│  + execute(input: unknown): Promise<ToolResult>                 │
│  + validate(input: unknown): ValidationResult                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BaseTool (Abstract)                            │
├─────────────────────────────────────────────────────────────────┤
│  - permissionLevel: PermissionLevel                             │
│  - sandboxRequired: boolean                                      │
│  - timeout: number                                                │
│  + preExecute(hook: PreToolUse): HookResult                      │
│  + postExecute(result: ToolResult): void                        │
│  # createSuccessResult(data: unknown): ToolResult               │
│  # createErrorResult(error: Error): ToolResult                  │
└─────────────────────────────────────────────────────────────────┘
           │                    │                   │
           ▼                    ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    BashTool     │  │   FileTool      │  │   WebTool      │
│   (extends)     │  │   (extends)     │  │   (extends)    │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ - shell: string │  │ - baseDir: str  │  │ - timeout: num │
│ - allowedCmds   │  │ - safetyChecks  │  │ - headers      │
│ + execute()     │  │ + execute()     │  │ + execute()    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Tool 基类实现**：

```typescript
// src/tools/BaseTool.ts
export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: {
    duration_ms: number;
    tokens_used?: number;
    cached?: boolean;
  };
}

export enum PermissionLevel {
  SAFE = 'SAFE',           // Auto-allow when sandboxed
  REQUIRES_APPROVAL = 'REQUIRES_APPROVAL',
  DANGEROUS = 'DANGEROUS', // Requires explicit allow rule
  BLOCKED = 'BLOCKED',     // Cannot be used
}

export abstract class BaseTool implements Tool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: JSONSchema;
  
  protected timeout: number = 30000; // 30s default
  protected permissionLevel: PermissionLevel = PermissionLevel.REQUIRES_APPROVAL;
  protected sandboxRequired: boolean = false;

  constructor(protected sandbox: SandboxEnvironment) {}

  async execute(input: ToolInput): Promise<ToolResult> {
    const startTime = Date.now();
    
    // 1. Validate input
    const validation = this.validate(input);
    if (!validation.valid) {
      return this.createErrorResult(
        new Error(`Invalid input: ${validation.errors.join(', ')}`)
      );
    }

    // 2. Execute pre-hook
    const hookResult = await this.preExecute(input);
    if (hookResult.blocked) {
      return this.createErrorResult(
        new Error(`Blocked by PreToolUse hook: ${hookResult.reason}`)
      );
    }

    // 3. Execute with sandbox if required
    try {
      const output = this.sandboxRequired
        ? await this.sandbox.execute(() => this.performExecute(input))
        : await this.performExecute(input);

      // 4. Post-execute hook
      await this.postExecute(output);

      return this.createSuccessResult(output, Date.now() - startTime);
    } catch (error) {
      return this.createErrorResult(error as Error);
    }
  }

  abstract performExecute(input: ToolInput): Promise<unknown>;

  protected validate(input: ToolInput): ValidationResult {
    // JSON Schema validation
    return validateSchema(input, this.inputSchema);
  }
}
```

### 4.2 工具注册表实现

```
工具注册表架构:

┌─────────────────────────────────────────────────────────────────┐
│                      Tool Registry                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    ToolRegistry                           │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │  private tools: Map<string, Tool>                  │   │  │
│  │  │  private byCategory: Map<string, Tool[]>           │   │  │
│  │  │  private byCapability: Map<string, Tool[]>        │   │  │
│  │  │                                                    │   │  │
│  │  │  + register(tool: Tool): void                    │   │  │
│  │  │  + unregister(name: string): void                │   │  │
│  │  │  + get(name: string): Tool | undefined           │   │  │
│  │  │  + list(): Tool[]                                 │   │  │
│  │  │  + search(query: string): Tool[]                 │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                      │
│                            ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Built-in Tools                          │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │  │
│  │  │   Bash     │ │   Read    │ │   Write    │  ...       │  │
│  │  └────────────┘ └────────────┘ └────────────┘            │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │  │
│  │  │   Edit     │ │   Grep    │ │   Glob    │  ...       │  │
│  │  └────────────┘ └────────────┘ └────────────┘            │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │  │
│  │  │   Web      │ │   Task    │ │   Agent   │  ...       │  │
│  │  │   Search   │ │           │ │            │            │  │
│  │  └────────────┘ └────────────┘ └────────────┘            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                      │
│                            ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   MCP Tools (Dynamic)                     │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │  │
│  │  │   MCP      │ │   MCP      │ │   MCP      │  ...       │  │
│  │  │   Server   │ │   Server   │ │   Server   │            │  │
│  │  │   1 Tools  │ │   2 Tools  │ │   3 Tools  │            │  │
│  │  └────────────┘ └────────────┘ └────────────┘            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                      │
│                            ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Plugin Tools                             │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │  │
│  │  │  Plugin    │ │  Plugin    │ │  Skill     │  ...       │  │
│  │  │  Custom    │ │  Custom    │ │  Custom    │            │  │
│  │  │  Tool 1    │ │  Tool 2    │ │  Tool 1    │            │  │
│  │  └────────────┘ └────────────┘ └────────────┘            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 权限管理器

```
权限决策流程:

┌─────────────────────────────────────────────────────────────────────┐
│                     Permission Manager                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Tool Call Request                                                 │
│   │                                                                   │
│   │   tool: "Bash"                                                   │
│   │   command: "npm install react"                                   │
│   │                                                                   │
│   └────────────────────────┐                                        │
│                            │                                        │
│                            ▼                                        │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                    Permission Check                          │  │
│   │                                                                   │  │
│   │   ┌─────────────────────────────────────────────────────────┐ │  │
│   │   │  1. Check explicit rules (settings.json)               │ │  │
│   │   │     rules: [                                            │ │  │
│   │   │       { "tool": "Bash(npm *)", "effect": "allow" }    │ │  │
│   │   │       { "tool": "Bash(rm -rf *)", "effect": "deny" }  │ │  │
│   │   │     ]                                                   │ │  │
│   │   └─────────────────────────────────────────────────────────┘ │  │
│   │                            │                                   │  │
│   │                            ▼                                   │  │
│   │   ┌─────────────────────────────────────────────────────────┐ │  │
│   │   │  2. Check auto-allow rules                             │ │  │
│   │   │     - sandboxed + safe command → auto-allow           │ │  │
│   │   │     - read-only operations → consider allow           │ │  │
│   │   └─────────────────────────────────────────────────────────┘ │  │
│   │                            │                                   │  │
│   │                            ▼                                   │  │
│   │   ┌─────────────────────────────────────────────────────────┐ │  │
│   │   │  3. Check dangerous path patterns                       │ │  │
│   │   │     - /etc/*, ~/.ssh/*, .claude/* → always block       │ │  │
│   │   │     - network redirects, env var injection → block    │ │  │
│   │   └─────────────────────────────────────────────────────────┘ │  │
│   │                            │                                   │  │
│   └────────────────────────────┼───────────────────────────────────┘  │
│                                │                                      │
│          ┌─────────────────────┼─────────────────────┐               │
│          │                     │                     │               │
│          ▼                     ▼                     ▼               │
│   ┌────────────┐       ┌────────────┐       ┌────────────┐         │
│   │    ASK     │       │   ALLOW    │       │    DENY    │         │
│   │            │       │            │       │            │         │
│   │ Prompt user│       │ Execute    │       │ Block with │         │
│   │ for confirm│       │ tool       │       │ explanation│         │
│   └────────────┘       └────────────┘       └────────────┘         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**权限管理器核心实现**：

```typescript
// src/tools/permission/PermissionManager.ts
export interface PermissionRule {
  tool: string;        // e.g., "Bash(npm *)", "Skill(name *)"
  effect: 'allow' | 'deny' | 'ask';
  reason?: string;
}

export class PermissionManager {
  private rules: PermissionRule[] = [];
  private skillRules: Map<string, PermissionRule> = new Map();

  async checkPermission(toolCall: ToolCall): Promise<PermissionDecision> {
    // 1. Check wildcard pattern matching
    for (const rule of this.rules) {
      if (this.matchesPattern(toolCall.tool, rule.tool) 
          || this.matchesPattern(toolCall.input, rule.tool)) {
        return {
          decision: rule.effect,
          reason: rule.reason ?? `Matched rule: ${rule.tool}`,
          rule,
        };
      }
    }

    // 2. Check auto-allow for sandboxed environment
    if (this.sandbox.isActive && this.isSafeCommand(toolCall)) {
      return { decision: 'allow', reason: 'Auto-allow in sandbox' };
    }

    // 3. Default to ask for unknown commands
    return { decision: 'ask', reason: 'No matching rule found' };
  }

  private matchesPattern(input: string, pattern: string): boolean {
    // Support wildcards: *, prefix, suffix
    // e.g., "Bash(npm *)" matches "npm install", "npm test"
    // e.g., "Skill(name *)" matches "skill:name" for all skills
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\(/, '\\(').replace(/\)/, '\\)') + '$'
    );
    return regex.test(input);
  }

  private isSafeCommand(toolCall: ToolCall): boolean {
    // Safe = no dangerous path patterns, no env var injection, etc.
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,           // rm -rf /
      />\s*\/\.ssh\//,           // Write to .ssh
      /\$\{.*\}/,                // Env var expansion
      /;\s*rm\s+/,               // Command injection
    ];
    return !dangerousPatterns.some(p => p.test(toolCall.input.toString()));
  }
}
```

### 4.4 沙箱执行机制

```
沙箱执行架构:

┌──────────────────────────────────────────────────────────────────────┐
│                      Sandbox Architecture                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   Tool Execute Request                                                │
│   │                                                                   │
│   └────────────────────────┐                                         │
│                            │                                         │
│                            ▼                                         │
│   ┌───────────────────────────────────────────────────────────────┐  │
│   │                    Sandbox Manager                             │  │
│   │  ┌─────────────────────────────────────────────────────────┐  │  │
│   │  │  sandbox.enabled: true                                   │  │  │
│   │  │  sandbox.network: "isolated" | "limited" | "full"      │  │  │
│   │  │  sandbox.filesystem: { allowWrite: ["/project/*"] }    │  │  │
│   │  │  sandbox.excludedCommands: ["sudo", "su"]               │  │  │
│   │  └─────────────────────────────────────────────────────────┘  │  │
│   └───────────────────────────────────────────────────────────────┘  │
│                            │                                          │
│              ┌─────────────┴─────────────┐                           │
│              │                           │                           │
│              ▼                           ▼                           │
│   ┌─────────────────────┐     ┌─────────────────────┐              │
│   │   Linux Sandbox     │     │  macOS/Windows      │              │
│   │   (PID namespace)    │     │  (Simplified)       │              │
│   ├─────────────────────┤     ├─────────────────────┤              │
│   │  - seccomp-bpf      │     │  - Path restrictions │              │
│   │  - cgroups          │     │  - Command whitelist │              │
│   │  - AppArmor         │     │  - Network limits   │              │
│   │  - User namespaces   │     │                     │              │
│   └─────────────────────┘     └─────────────────────┘              │
│                            │                                          │
│                            ▼                                          │
│   ┌───────────────────────────────────────────────────────────────┐  │
│   │                    Security Policies                         │  │
│   │  ┌─────────────────────────────────────────────────────────┐ │  │
│   │  │  filesystem:                                            │ │  │
│   │  │    - Block: ~/.claude/skills, ~/.ssh, /etc/passwd      │ │  │
│   │  │    - Allow: project dir (configurable)                 │ │  │
│   │  │                                                         │ │  │
│   │  │  network:                                               │ │  │
│   │  │    - allowMachLookup (macOS specific)                  │ │  │
│   │  │    - enableWeakerNetworkIsolation                      │ │  │
│   │  │                                                         │ │  │
│   │  │  process:                                               │ │  │
│   │  │    - maxProcesses: 100                                 │ │  │
│   │  │    - maxMemory: 512MB                                 │ │  │
│   │  └─────────────────────────────────────────────────────────┘ │  │
│   └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.5 工具编排算法

```
工具并行执行算法:

┌───────────────────────────────────────────────────────────────────────┐
│                    Parallel Tool Execution                            │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Agent Response with Tool Calls                                       │
│   │                                                                     │
│   │   tool_use: [                                                      │
│   │     { "name": "Bash", "input": { "command": "npm test" } },       │
│   │     { "name": "Read", "input": { "file_path": "src/a.ts" } },      │
│   │     { "name": "Read", "input": { "file_path": "src/b.ts" } },      │
│   │     { "name": "Bash", "input": { "command": "git status" } },      │
│   │   ]                                                                │
│   │                                                                     │
│   └─────────────────────────────┬─────────────────────────────────────┘
│                                │
│                                ▼
│   ┌─────────────────────────────────────────────────────────────────┐ │
│   │                    Dependency Analysis                          │ │
│   │  ┌───────────────────────────────────────────────────────────┐   │ │
│   │  │  1. Build dependency graph                               │   │ │
│   │  │     - A depends on B if A reads output of B              │   │ │
│   │  │     - File write → subsequent reads of same file depends  │   │ │
│   │  │                                                           │   │ │
│   │  │  DAG Result:                                             │   │ │
│   │  │  ┌─────────┐                                             │   │ │
│   │  │  │ Bash(npm)│ ─┐                                         │   │ │
│   │  │  └────┬────┘  │ (no dependency)                          │   │ │
│   │  │       │       │                                          │   │ │
│   │  │       ▼       ▼                                          │   │ │
│   │  │  ┌─────────┐ ┌─────────┐                                 │   │ │
│   │  │  │Read(a.ts)│ Read(b.ts)│ (parallel)                    │   │ │
│   │  │  └─────────┘ └─────────┘                                 │   │ │
│   │  │       │       │                                          │   │ │
│   │  │       └───────┴──────────────────┐                       │   │ │
│   │  │                                   │                      │   │ │
│   │  │                                   ▼                      │   │ │
│   │  │                              ┌─────────┐                 │   │ │
│   │  │                              │Bash(git)│ (last)        │   │ │
│   │  │                              └─────────┘                 │   │ │
│   │  └───────────────────────────────────────────────────────────┘   │ │
│   └─────────────────────────────────────────────────────────────────┘ │
│                                │                                       │
│                                ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────┐ │
│   │                    Execution Schedule                            │ │
│   │  ┌───────────────────────────────────────────────────────────┐   │ │
│   │  │  Wave 1 (parallel): Bash(npm), Read(a.ts), Read(b.ts)    │   │ │
│   │  │  Wave 2 (sequential): Bash(git)                          │   │ │
│   │  │                                                           │   │ │
│   │  │  maxConcurrency: 5 (configurable)                        │   │ │
│   │  │  timeout per tool: 30000ms (default)                     │   │ │
│   │  │  fail fast: true (stop on first failure, configurable)   │   │ │
│   │  └───────────────────────────────────────────────────────────┘   │ │
│   └─────────────────────────────────────────────────────────────────┘ │
│                                │                                       │
│                                ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────┐ │
│   │                    Result Collection                            │ │
│   │  ┌───────────────────────────────────────────────────────────┐   │ │
│   │  │  results: [                                                │   │ │
│   │  │    { "tool": "Bash", "success": true, "output": "..." },  │   │ │
│   │  │    { "tool": "Read", "success": true, "output": "..." },  │   │ │
│   │  │    { "tool": "Read", "success": true, "output": "..." },  │   │ │
│   │  │    { "tool": "Bash", "success": true, "output": "..." },  │   │ │
│   │  │  ]                                                        │   │ │
│   │  │                                                           │   │ │
│   │  │  Note: Independent mutations complete even if sibling    │   │ │
│   │  │        read-only commands fail (configurable)             │   │ │
│   │  └───────────────────────────────────────────────────────────┘   │ │
│   └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 5. 状态管理深度

### 5.1 AppStateStore 实现

```
AppStateStore 架构:

┌───────────────────────────────────────────────────────────────────────┐
│                      AppStateStore                                   │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Observable State Container                                     │  │
│  │  ┌───────────────────────────────────────────────────────────┐  │  │
│  │  │  interface AppState {                                      │  │  │
│  │  │    session: SessionState;                                  │  │  │
│  │  │    tools: ToolState;                                       │  │  │
│  │  │    cost: CostState;                                        │  │  │
│  │  │    context: ContextState;                                  │  │  │
│  │  │    ui: UIState;                                            │  │  │
│  │  │  }                                                         │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│          ┌───────────────────┼───────────────────┐                  │
│          │                   │                   │                  │
│          ▼                   ▼                   ▼                  │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐          │
│  │   Session     │   │    Tools      │   │     Cost     │          │
│  │   Manager     │   │    Manager    │   │   Tracker    │          │
│  ├───────────────┤   ├───────────────┤   ├───────────────┤          │
│  │ - sessionId   │   │ - available  │   │ - totalCost   │          │
│  │ - history     │   │ - executing  │   │ - cacheHits   │          │
│  │ - title       │   │ - results    │   │ - tokenCounts │          │
│  │ - metadata    │   │ - pending    │   │ - byModel     │          │
│  └───────────────┘   └───────────────┘   └───────────────┘          │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**AppStateStore 核心实现**：

```typescript
// src/state/AppStateStore.ts
type Listener<T> = (prev: T, next: T) => void;

export class AppStateStore<T extends object> {
  private state: T;
  private listeners: Map<keyof T, Set<Listener<unknown>>> = new Map();
  private version: number = 0;

  constructor(initialState: T) {
    this.state = initialState;
    // Initialize listener sets for each key
    Object.keys(initialState).forEach(key => {
      this.listeners.set(key as keyof T, new Set());
    });
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    const prev = this.state[key];
    if (prev === value) return; // No change, skip update

    this.state[key] = value;
    this.version++;

    // Notify listeners
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(listener => {
        try {
          listener(prev, value);
        } catch (error) {
          console.error('Listener error:', error);
        }
      });
    }
  }

  update<K extends keyof T>(key: K, updater: (prev: T[K]) => T[K]): void {
    const prev = this.state[key];
    const next = updater(prev);
    this.set(key, next);
  }

  subscribe<K extends keyof T>(
    key: K,
    listener: Listener<T[K]>
  ): () => void {
    const keyListeners = this.listeners.get(key)!;
    keyListeners.add(listener as Listener<unknown>);

    // Return unsubscribe function
    return () => {
      keyListeners.delete(listener as Listener<unknown>);
    };
  }

  // Batch updates for atomic operations
  batch(updates: Partial<T>): void {
    const prev = { ...this.state };
    
    Object.entries(updates).forEach(([key, value]) => {
      this.state[key as keyof T] = value as T[keyof T];
    });
    
    this.version++;
    
    // Notify all changed keys
    Object.keys(updates).forEach(key => {
      const keyListeners = this.listeners.get(key as keyof T);
      if (keyListeners) {
        keyListeners.forEach(listener => {
          listener(prev[key as keyof T], updates[key as keyof T]!);
        });
      }
    });
  }

  // Snapshot for persistence
  snapshot(): { state: T; version: number } {
    return {
      state: structuredClone(this.state),
      version: this.version,
    };
  }

  // Restore from snapshot
  restore(snapshot: { state: T; version: number }): void {
    this.state = structuredClone(snapshot.state);
    this.version = snapshot.version;
  }
}
```

### 5.2 订阅发布机制

```
Pub/Sub 事件系统:

┌───────────────────────────────────────────────────────────────────────┐
│                      Event Bus Architecture                           │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                        Event Bus                                │  │
│   │  ┌───────────────────────────────────────────────────────────┐ │  │
│   │  │  private handlers: Map<EventType, Set<EventHandler>>      │ │  │
│   │  │  private onceHandlers: Map<EventType, Set<EventHandler>>   │ │  │
│   │  │                                                             │ │  │
│   │  │  + on(type, handler): Unsubscribe                          │ │  │
│   │  │  + once(type, handler): void                              │ │  │
│   │  │  + off(type, handler): void                                │ │  │
│   │  │  + emit(type, event): Promise<void>                        │ │  │
│   │  │  + emitSync(type, event): void                            │ │  │
│   │  └───────────────────────────────────────────────────────────┘ │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              │  emit('toolUse', event)                  │
│                              │                                          │
│          ┌───────────────────┼───────────────────┐                      │
│          │                   │                   │                      │
│          ▼                   ▼                   ▼                      │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐            │
│   │  PreToolUse   │   │  PostToolUse  │   │     UI        │            │
│   │   Hook        │   │   Hook        │   │   Updates     │            │
│   │   Handler     │   │   Handler     │   │   Handler     │            │
│   └───────────────┘   └───────────────┘   └───────────────┘            │
│                                                                        │
│   Event Types:                                                         │
│   ─────────────                                                        │
│   • toolUse        → Tool execution started                            │
│   • toolResult     → Tool execution completed                          │
│   • messageSend    → Message sent to LLM                               │
│   • messageReceive → Message received from LLM                         │
│   • stateChange    → Application state changed                         │
│   • sessionStart   → New session started                               │
│   │ sessionEnd     → Session ended                                    │
│   │ contextCompact → Context window compacted                         │
│   │ costUpdate     → Cost/tokens updated                              │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### 5.3 状态持久化

```
会话持久化流程:

┌───────────────────────────────────────────────────────────────────────┐
│                      Session Persistence                              │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Session Data Flow                                                    │
│   │                                                                     │
│   │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│   │   │   Runtime    │───►│   Session    │───►│   Disk       │       │
│   │   │   State      │    │   Store      │    │   Storage    │       │
│   │   └──────────────┘    └──────────────┘    └──────────────┘       │
│   │         │                  │                  │                    │
│   │         │                  │                  ▼                    │
│   │         │                  │          ~/.claude/sessions/          │
│   │         │                  │                  │                    │
│   │         │                  │         ┌───────┴───────┐             │
│   │         │                  │         │               │             │
│   │         │                  │         ▼               ▼             │
│   │         │                  │   session-xxx.json  transcript.md    │
│   │         │                  │         │               │             │
│   │         │                  │         │               │             │
│   │         │                  │         ▼               ▼             │
│   │         │                  │    [State JSON]   [Markdown]         │
│   │         │                  │                                     │
│   │         │                  │                                     │
│   └────────┴──────────────────┴─────────────────────────────────────┘
│                                                                        │
│   Persistence Triggers:                                               │
│   ──────────────────────                                               │
│   • Auto-flush: Every 30 seconds for active sessions                   │
│   • On message: After each user/assistant turn                         │
│   • On tool use: After each tool execution                            │
│   • On exit: Graceful shutdown flush                                  │
│   • On error: Emergency backup before crash                           │
│                                                                        │
│   Session File Structure:                                              │
│   ──────────────────────                                               │
│   {                                                                    │
│     "version": 2,                                                      │
│     "sessionId": "abc123",                                             │
│     "createdAt": "2024-01-15T10:30:00Z",                             │
│     "updatedAt": "2024-01-15T11:45:00Z",                              │
│     "title": "Fix login bug",                                         │
│     "model": "claude-3-5-sonnet-20241022",                            │
│     "messages": [...],                                                │
│     "cost": {                                                         │
│       "totalTokens": 125000,                                          │
│       "inputTokens": 100000,                                          │
│       "outputTokens": 25000,                                          │
│       "cacheHits": 45000                                              │
│     },                                                                │
│     "metadata": {                                                    │
│       "project": "/path/to/project",                                  │
│       "workingDir": "/path/to/project"                               │
│     }                                                                 │
│   }                                                                    │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### 5.4 成本追踪

```
成本追踪系统:

┌───────────────────────────────────────────────────────────────────────┐
│                      Cost Tracking System                             │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Cost State Structure                                                │
│   │                                                                     │
│   │   ┌─────────────────────────────────────────────────────────────┐ │
│   │   │  interface CostState {                                     │ │
│   │   │    totalCost: number;           // Total USD               │ │
│   │   │    inputTokens: number;         // Total input tokens      │ │
│   │   │    outputTokens: number;        // Total output tokens     │ │
│   │   │    cacheHits: number;           // Cached input tokens     │ │
│   │   │    byModel: Record<string, ModelCost>;                    │ │
│   │   │  }                                                         │ │
│   │   │                                                             │ │
│   │   │  interface ModelCost {                                     │ │
│   │   │    inputTokens: number;                                    │ │
│   │   │    outputTokens: number;                                   │ │
│   │   │    cacheHits: number;                                      │ │
│   │   │    costUSD: number;                                        │ │
│   │   │  }                                                         │ │
│   │   └─────────────────────────────────────────────────────────────┘ │
│   │                                                                     │
│   └─────────────────────────────────────────────────────────────────────┘
│                                                                        │
│   Pricing by Model (per 1M tokens):                                   │
│   ─────────────────────────────                                        │
│   ┌─────────────────────────┬──────────┬───────────┬──────────┐        │
│   │        Model           │  Input   │  Output   │ Cache    │        │
│   ├─────────────────────────┼──────────┼───────────┼──────────┤        │
│   │ claude-opus-4-20250514  │   $15.00 │   $75.00  │  $1.50   │        │
│   │ claude-sonnet-4        │    $3.00 │   $15.00  │   $0.30  │        │
│   │ claude-3-5-sonnet      │    $3.00 │   $15.00  │   $0.30  │        │
│   │ claude-3-haiku         │    $0.25 │    $1.25  │   $0.04  │        │
│   └─────────────────────────┴──────────┴───────────┴──────────┘        │
│                                                                        │
│   Cost Display:                                                        │
│   ────────────                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │  Cost: $0.42 | Tokens: 12.5k | Cache: 4.5k (36%)              │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   Note: Streaming fallback maintains accurate tracking even when      │
│         API falls back to non-streaming mode.                           │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 6. 扩展机制深度

### 6.1 插件生命周期

```
插件生命周期状态机:

┌───────────────────────────────────────────────────────────────────────┐
│                      Plugin Lifecycle                                  │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────┐                                                          │
│   │ INSTALL │                                                          │
│   └───┬─────┘                                                          │
│       │                                                                │
│       ▼                                                                │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                    Plugin Directory Structure                  │  │
│   │  ┌───────────────────────────────────────────────────────────┐ │  │
│   │  │  plugin-name/                                             │ │  │
│   │  │  ├── .claude-plugin/                                      │ │  │
│   │  │  │   └── plugin.json          # Required manifest        │ │  │
│   │  │  ├── commands/                  # Slash commands (.md)    │ │  │
│   │  │  ├── agents/                    # Subagent definitions  │ │  │
│   │  │  ├── skills/                    # Skill bundles          │ │  │
│   │  │  │   └── skill-name/                                    │ │  │
│   │  │  │       └── SKILL.md        # Required                  │ │  │
│   │  │  ├── hooks/                     # Hook handlers          │ │  │
│   │  │  │   └── hooks.json         # Event config              │ │  │
│   │  │  ├── .mcp.json                 # MCP server defs        │ │  │
│   │  │  └── README.md                  # Documentation           │ │  │
│   │  └───────────────────────────────────────────────────────────┘ │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│       │                                                                │
│       ▼                                                                │
│   ┌─────────┐                                                          │
│   │ ENABLE  │ ──► PluginLoader.load()                                 │
│   └───┬─────┘                                                          │
│       │                                                                │
│       ▼                                                                │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                    Loading Process                               │  │
│   │  ┌───────────────────────────────────────────────────────────┐ │  │
│   │  │  1. Read plugin.json manifest                            │ │  │
│   │  │  2. Validate schema and dependencies                      │ │  │
│   │  │  3. Load commands (parse .md files)                      │ │  │
│   │  │  4. Load agents (parse .md files)                        │ │  │
│   │  │  5. Load skills (parse SKILL.md files)                  │ │  │
│   │  │  6. Register hooks (parse hooks.json + scripts)          │ │  │
│   │  │  7. Initialize MCP servers (if .mcp.json exists)       │ │  │
│   │  │  8. Emit 'pluginLoaded' event                            │ │  │
│   │  └───────────────────────────────────────────────────────────┘ │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│       │                                                                │
│       ▼                                                                │
│   ┌─────────┐                                                          │
│   │  ACTIVE │ ──► Available in session                                │
│   └───┬─────┘                                                          │
│       │                                                                │
│       ├── /reload-plugins ──► Reload pending changes                  │
│       │                                                                │
│       ▼                                                                │
│   ┌─────────┐                                                          │
│   │ DISABLE │ ──► PluginLoader.unload()                               │
│   └───┬─────┘                                                          │
│       │                                                                │
│       ▼                                                                │
│   ┌─────────┐                                                          │
│   │REMOVED  │                                                          │
│   └─────────┘                                                          │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### 6.2 技能注册和执行

```
技能注册与执行流程:

┌───────────────────────────────────────────────────────────────────────┐
│                      Skill System                                      │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Skill Discovery & Loading                                            │
│   │                                                                     │
│   │   ┌─────────────────────────────────────────────────────────────┐   │
│   │   │  Load locations:                                           │   │
│   │   │  1. .claude/skills/          (User skills - hot-reload)    │   │
│   │   │  2. plugins/*/skills/        (Plugin skills)              │   │
│   │   │  3. Built-in skills          (Core functionality)         │   │
│   │   └─────────────────────────────────────────────────────────────┘   │
│   │                                                                     │
│   └─────────────────────────────────────────────────────────────────────┘
│                                                                        │
│   SKILL.md Structure:                                                   │
│   ┌─────────────────────────────────────────────────────────────────┐ │
│   │  ---                                                             │ │
│   │  name: frontend-design                                          │ │
│   │  description: Create distinctive frontend interfaces            │ │
│   │  trigger: "design", "frontend", "UI", "interface"                │ │
│   │  context: fork                    # Execution context            │ │
│   │  agent: sonnet                    # Agent type                 │ │
│   │  maxTokens: 8000                 # Token budget                 │ │
│   │  ---                                                             │ │
│   │                                                                     │
│   │  # Skill Instructions                                             │
│   │  You are a frontend design expert...                            │ │
│   │                                                                     │
│   │  ## Design Principles                                            │
│   │  - Use production-grade components                              │ │
│   │  - Follow accessibility guidelines                              │ │
│   │  ...                                                             │ │
│   │                                                                     │
│   │  ## Output Format                                                 │
│   │  Always include design rationale...                             │ │
│   └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│   Skill Execution Flow:                                                │
│   │                                                                     │
│   │   User Input: "design a login page"                               │
│   │   │                                                                     │
│   │   │   ┌─────────────┐                                              │
│   │   │   │ Skill      │                                              │
│   │   │   │ Matcher    │ ──► Matches: "frontend-design"              │
│   │   │   └──────┬─────┘                                              │
│   │   │          │                                                     │
│   │   │          ▼                                                     │
│   │   │   ┌─────────────┐                                              │
│   │   │   │ Skill      │                                              │
│   │   │   │ Loader     │ ──► Parse SKILL.md                           │
│   │   │   └──────┬─────┘                                              │
│   │   │          │                                                     │
│   │   │          ▼                                                     │
│   │   │   ┌────────────────────────────────────────────────────────┐   │
│   │   │   │ Fork Subagent with skill instructions                │   │
│   │   │   │  ┌────────────────────────────────────────────────┐  │   │
│   │   │   │  │ system: [base_prompt, skill.instructions]    │  │   │
│   │   │   │  │ model: sonnet (from skill.agent)              │  │   │
│   │   │   │  │ maxTokens: 8000 (from skill.maxTokens)        │  │   │
│   │   │   │  │ tools: [limited tool set]                      │  │   │
│   │   │   │  └────────────────────────────────────────────────┘  │   │
│   │   │   └────────────────────────────────────────────────────────┘   │
│   │   │          │                                                     │
│   │   │          ▼                                                     │
│   │   │   ┌────────────────────────────────────────────────────────┐   │
│   │   │   │ Wait for completion, merge results                    │   │
│   │   │   │ - Output merged into main transcript                   │   │
│   │   │   │ - Cost added to session total                           │   │
│   │   │   └────────────────────────────────────────────────────────┘   │
│   │   │          │                                                     │
│   │   └──────────┼────────────────────────────────────────────────────┘ │
│   │              │                                                     │
│   │              ▼                                                     │
│   │   ┌─────────────────────────────────────────────────────────────┐   │
│   │   │ Main Agent receives skill output, continues work          │   │
│   │   └─────────────────────────────────────────────────────────────┘   │
│   │                                                                     │
└───────────────────────────────────────────────────────────────────────┘
```

### 6.3 MCP 客户端实现

```
MCP (Model Context Protocol) 客户端架构:

┌───────────────────────────────────────────────────────────────────────┐
│                      MCP Client Architecture                           │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                    MCP Configuration (.mcp.json)               │  │
│   │  ┌───────────────────────────────────────────────────────────┐ │  │
│   │  │  [                                                            │  │
│   │  │    {                                                           │  │
│   │  │      "mcpServers": {                                          │  │
│   │  │        "filesystem": {                                        │  │
│   │  │          "command": "npx",                                     │  │
│   │  │          "args": ["-y", "@modelcontextprotocol/server-files"]│ │
│   │  │        }                                                        │  │
│   │  │      }                                                          │  │
│   │  │    }                                                            │  │
│   │  │  ]                                                              │  │
│   │  └───────────────────────────────────────────────────────────┘ │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                    MCP Client Manager                            │  │
│   │  ┌───────────────────────────────────────────────────────────┐ │  │
│   │  │  private clients: Map<string, MCPClient>                  │ │  │
│   │  │  private tools: Map<string, MCPTool>                    │ │  │
│   │  │                                                               │  │
│   │  │  + addServer(config: ServerConfig): Promise<void>      │ │  │
│   │  │  + removeServer(name: string): void                    │ │  │
│   │  │  + listTools(): MCPTool[]                               │ │  │
│   │  │  + callTool(name: string, args: object): Promise<...> │ │  │
│   │  └───────────────────────────────────────────────────────────┘ │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                    MCP Transport Layer                         │  │
│   │  ┌───────────────────────────────────────────────────────────┐ │  │
│   │  │                    Transport Options                       │ │  │
│   │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐           │ │  │
│   │  │  │   stdio   │  │    SSE    │  │   HTTP    │           │ │  │
│   │  │  │ (default)│  │ (streaming│  │  (WebSocket│           │ │  │
│   │  │  │           │  │  fallback)│  │   fallback)│           │ │  │
│   │  │  └───────────┘  └───────────┘  └───────────┘           │ │  │
│   │  │                                                               │ │  │
│   │  │  Features:                                                    │ │  │
│   │  │  - Auto-reconnection on disconnect (SSE)                      │ │  │
│   │  │  - OAuth flow support                                         │ │  │
│   │  │  - SSE frame capping (context optimization)                  │ │  │
│   │  └───────────────────────────────────────────────────────────┘ │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                    Tool Search Optimization                      │  │
│   │  ┌───────────────────────────────────────────────────────────┐ │  │
│   │  │  auto mode (default):                                      │ │  │
│   │  │  - Defer tool descriptions > context threshold            │ │  │
│   │  │  - Reduces context usage on startup                       │ │  │
│   │  │  - Batched token counting for performance                │ │  │
│   │  │                                                             │ │  │
│   │  │  Token management:                                          │ │  │
│   │  │  - Descriptions capped at 2KB (OpenAPI servers)          │ │  │
│   │  │  - Server instructions capped at 2KB                      │ │  │
│   │  │  - Batched API call for token counting                    │ │  │
│   │  └───────────────────────────────────────────────────────────┘ │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                    Elicitation Support                           │  │
│   │  ┌───────────────────────────────────────────────────────────┐ │  │
│   │  │  MCP servers can request structured input via:          │ │  │
│   │  │  - Elicitation dialog (interactive)                      │ │  │
│   │  │  - ElicitationResult hooks                               │ │  │
│   │  │  - Supported by Claude.ai connectors                     │ │  │
│   │  └───────────────────────────────────────────────────────────┘ │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### 6.4 远程桥接协议

```
远程桥接协议架构:

┌───────────────────────────────────────────────────────────────────────┐
│                    Remote Bridge Protocol                              │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Bridge Connection                                                     │
│   │                                                                     │
│   │   ┌─────────────────────────────────────────────────────────────┐  │
│   │   │  Local Session                      claude.ai/code          │  │
│   │   │  ┌─────────────┐                   ┌─────────────┐         │  │
│   │   │  │   Claude   │◄──────Bridge─────►│   Web       │         │  │
│   │   │  │   Code CLI  │    (WebSocket)     │   Interface │         │  │
│   │   │  └─────────────┘                   └─────────────┘         │  │
│   │   │       │                                 │                    │  │
│   │   │       │   ┌─────────────────────────────────────────────┐   │  │
│   │   │       │   │  Commands:                                  │   │  │
│   │   │       │   │  /remote-control - Start bridge           │   │  │
│   │   │       │   │  claude-cli:// - Deep link protocol        │   │  │
│   │   │       │   │  --channels - MCP push notifications       │   │  │
│   │   │       │   └─────────────────────────────────────────────┘   │  │
│   │   │       │                                                  │   │  │
│   │   └───────┼──────────────────────────────────────────────────┼───┘  │
│   │           │                                                  │       │
│   │           ▼                                                  ▼       │
│   │   ┌─────────────────────────────────────────────────────────────────┐ │
│   │   │                    Protocol Messages                            │ │
│   │   │  ┌───────────────────────────────────────────────────────────┐ │ │
│   │   │  │  {                                                         │ │ │
│   │   │  │    "type": "session_sync",                                │ │ │
│   │   │  │    "sessionId": "abc123",                                 │ │ │
│   │   │  │    "messages": [...],                                     │ │ │
│   │   │  │    "state": {...}                                         │ │ │
│   │   │  │  }                                                         │ │ │
│   │   │  └───────────────────────────────────────────────────────────┘ │ │
│   │   │  ┌───────────────────────────────────────────────────────────┐ │ │
│   │   │  │  {                                                         │ │ │
│   │   │  │    "type": "tool_approval_request",                      │ │ │
│   │   │  │    "tool": "Bash",                                       │ │ │
│   │   │  │    "input": { "command": "rm -rf /" },                  │ │ │
│   │   │  │    "channel": "phone"      // Forward to phone          │ │ │
│   │   │  │  }                                                         │ │ │
│   │   │  └───────────────────────────────────────────────────────────┘ │ │
│   │   │  ┌───────────────────────────────────────────────────────────┐ │ │
│   │   │  │  {                                                         │ │ │
│   │   │  │    "type": "user_input",                                  │ │ │
│   │   │  │    "prompt": "Fix the login bug",                        │ │ │
│   │   │  │    "source": "web"                                        │ │ │
│   │   │  │  }                                                         │ │ │
│   │   │  └───────────────────────────────────────────────────────────┘ │ │
│   │   └─────────────────────────────────────────────────────────────────┘ │
│   │                                                                       │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│   Deep Link Protocol (claude-cli://):                                       │
│   ┌────────────────────────────────────────────────────────────────────────┐ │
│   │  claude-cli://open?path=/project&prompt=Fix%20bug                  │ │
│   │  claude-cli://resume?session=abc123                                │ │
│   └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 7. 关键算法分析

### 7.1 工具并行执行算法

```typescript
// src/engine/parallel-executor.ts
export class ParallelToolExecutor {
  constructor(
    private maxConcurrency: number = 5,
    private failFast: boolean = true
  ) {}

  async execute(
    toolCalls: ToolCall[],
    registry: ToolRegistry,
    permissionManager: PermissionManager
  ): Promise<ToolResult[]> {
    // Step 1: Build dependency graph
    const graph = this.buildDependencyGraph(toolCalls);
    
    // Step 2: Topological sort into execution waves
    const waves = this.topologicalSort(graph);
    
    // Step 3: Execute each wave
    const results: ToolResult[] = new Array(toolCalls.length);
    const indexMap = new Map(toolCalls.map((tc, i) => [tc, i]));

    for (const wave of waves) {
      const waveResults = await Promise.all(
        wave.map(tc => this.executeTool(
          tc,
          registry,
          permissionManager
        ))
      );

      // Map results back to original indices
      wave.forEach((tc, i) => {
        results[indexMap.get(tc)!] = waveResults[i];
      });

      // Fail fast check
      if (this.failFast && waveResults.some(r => !r.success)) {
        // Mark remaining tools as skipped
        const remaining = toolCalls.slice(indexMap.get(wave[wave.length - 1])! + 1);
        remaining.forEach(tc => {
          results[indexMap.get(tc)!] = {
            success: false,
            error: 'Skipped due to sibling failure',
          };
        });
        break;
      }
    }

    return results;
  }

  private buildDependencyGraph(toolCalls: ToolCall[]): DependencyGraph {
    const graph = new DependencyGraph();
    
    // Build graph edges based on file access patterns
    for (let i = 0; i < toolCalls.length; i++) {
      for (let j = i + 1; j < toolCalls.length; j++) {
        if (this.dependsOn(toolCalls[j], toolCalls[i])) {
          graph.addEdge(toolCalls[j], toolCalls[i]);
        }
      }
    }
    
    return graph;
  }

  private dependsOn(consumer: ToolCall, producer: ToolCall): boolean {
    // Read after Write to same file → depends
    if (producer.name === 'Write' && consumer.name === 'Read') {
      return consumer.input.file_path === producer.input.file_path;
    }
    
    // Any tool after Write to same file → depends
    if (producer.name === 'Write') {
      const producerPath = producer.input.file_path;
      if (consumer.input.file_path === producerPath) return true;
    }
    
    return false;
  }

  private topologicalSort(graph: DependencyGraph): ToolCall[][] {
    const waves: ToolCall[][] = [];
    const remaining = new Set(graph.nodes);
    const inDegree = new Map(graph.nodes.map(n => [n, graph.inDegree(n)]));

    while (remaining.size > 0) {
      // Find nodes with no dependencies
      const ready = [...remaining].filter(n => inDegree.get(n) === 0);
      
      if (ready.length === 0) {
        throw new Error('Circular dependency detected');
      }
      
      waves.push(ready);
      
      // Remove processed nodes and update in-degrees
      for (const node of ready) {
        remaining.delete(node);
        for (const neighbor of graph.outNeighbors(node)) {
          inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        }
      }
    }

    return waves;
  }
}
```

### 7.2 依赖分析算法

```
依赖分析算法详解:

┌───────────────────────────────────────────────────────────────────────┐
│                    Dependency Analysis                                 │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Input: Tool calls from single LLM response                           │
│   │                                                                     │
│   │   tool_use: [                                                      │
│   │     Read("src/main.ts"),                                           │
│   │     Read("src/utils.ts"),                                          │
│   │     Write("src/main.ts", "..."),                                   │
│   │     Read("src/main.ts"),  // ← depends on previous Write          │
│   │     Bash("npm test"),      // ← no dependencies                   │
│   │   ]                                                                │
│   │                                                                     │
│   └─────────────────────────────────────────────────────────────────────┘
│                                                                        │
│   Algorithm:                                                           │
│   │                                                                     │
│   │   Step 1: Extract file references from each tool call             │
│   │   │                                                                     │
│   │   │   ┌────────────────────────────────────────────────────────┐   │
│   │   │   │  Read("src/main.ts")  → files: ["src/main.ts"]        │   │
│   │   │   │  Read("src/utils.ts")  → files: ["src/utils.ts"]      │   │
│   │   │   │  Write("src/main.ts") → files: ["src/main.ts"], mutated │   │
│   │   │   │  Read("src/main.ts")  → files: ["src/main.ts"]        │   │
│   │   │   │  Bash("npm test")     → files: [], shell: true       │   │
│   │   │   └────────────────────────────────────────────────────────┘   │
│   │   │                                                                     │
│   │   └─────────────────────────────────────────────────────────────────────┘ │
│   │   │                                                                     │
│   │   ▼                                                                     │
│   │                                                                     │
│   │   Step 2: Build dependency edges                                    │
│   │   │                                                                     │
│   │   │   Rule 1: Read after Write to same file → DEPENDS              │
│   │   │   Rule 2: Any tool after Write to same file → DEPENDS          │
│   │   │   Rule 3: Read after Read to same file → INDEPENDENT           │
│   │   │   Rule 4: Bash with shell expansion → INDEPENDENT             │
│   │   │                                                                     │
│   │   │   Edges:                                                         │
│   │   │   Write → Read("src/main.ts") = depends                        │
│   │   │   Write → Bash("npm test") = depends                           │
│   │   │   Read("src/main.ts") → Bash = depends                        │
│   │   │   Read("src/utils.ts") = independent                          │
│   │   │                                                                     │
│   │   └─────────────────────────────────────────────────────────────────────┘ │
│   │   │                                                                     │
│   │   ▼                                                                     │
│   │                                                                     │
│   │   Step 3: Detect cycles                                             │
│   │   │                                                                     │
│   │   │   If cycle detected:                                             │
│   │   │     - Throw error with cycle description                        │
│   │   │     - Agent receives: "Cannot resolve dependencies: A→B→C→A"  │
│   │   │                                                                     │
│   │   └─────────────────────────────────────────────────────────────────────┘ │
│   │   │                                                                     │
│   │   ▼                                                                     │
│   │                                                                     │
│   │   Step 4: Topological sort                                          │
│   │   │                                                                     │
│   │   │   DAG:                                                           │
│   │   │   ┌──────────────────────┐                                     │
│   │   │   │  Read("src/main.ts")  │ ─┐                                  │
│   │   │   └──────────────────────┘  │ (no deps)                        │
│   │   │   ┌──────────────────────┐  │                                  │
│   │   │   │  Read("src/utils.ts") │ ─┼──────────────────────────────────┐│
│   │   │   └──────────────────────┘  │                                  ││
│   │   │   ┌──────────────────────┐  │                                  ││
│   │   │   │  Write("src/main.ts")│ ◄┘                                  ││
│   │   │   └──────────────────────┘  │                                  ││
│   │   │   ┌──────────────────────┐  │                                  ││
│   │   │   │  Read("src/main.ts") │ ◄┤ (depends on Write)               ││
│   │   │   └──────────────────────┘  │                                  ││
│   │   │   ┌──────────────────────┐  │                                  ││
│   │   │   │  Bash("npm test")     │ ◄┘ (depends on Write & Read)       ││
│   │   │   └──────────────────────┘                                     │
│   │   │                                                                     │
│   │   └─────────────────────────────────────────────────────────────────────┘ │
│   │   │                                                                     │
│   │   ▼                                                                     │
│   │                                                                     │
│   │   Output: Execution waves                                           │
│   │   │                                                                     │
│   │   │   Wave 1 (parallel): Read("main"), Read("utils")               │
│   │   │   Wave 2 (parallel): Write("main")                             │
│   │   │   Wave 3 (parallel): Read("main"), Bash("npm test")            │
│   │   │                                                                     │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### 7.3 降级策略算法

```
降级策略系统:

┌───────────────────────────────────────────────────────────────────────┐
│                    Degradation Strategies                             │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Degradation Trigger Points:                                          │
│   │                                                                     │
│   │   ┌───────────────────────────────────────────────────────────────┐  │
│   │   │  1. API Rate Limit                                          │  │
│   │   │     - 429 Too Many Requests                                 │  │
│   │   │     - Exponential backoff: 1s → 2s → 4s → 8s → max 60s   │  │
│   │   │     - Switch to fallback model if available                │  │
│   │   └───────────────────────────────────────────────────────────┘  │
│   │   │                                                                     │
│   │   │  2. Context Window Near Limit                                │
│   │   │     - Tokens > 80% of context window                         │
│   │   │     - Trigger automatic compaction                          │
│   │   │     - Circuit breaker: stop after 3 consecutive failures   │
│   │   │     - Output actionable error to user                       │
│   │   └───────────────────────────────────────────────────────────┘  │
│   │   │                                                                     │
│   │   │  3. Tool Execution Failure                                   │
│   │   │     - Parse failure → fallback deny-rule                     │
│   │   │     - Timeout → retry with increased timeout                 │
│   │   │     - Permission denied → graceful message to user           │
│   │   │     - Sandbox unavailable → continue without sandbox         │
│   │   └───────────────────────────────────────────────────────────┘  │
│   │   │                                                                     │
│   │   │  4. Streaming Fallback                                       │
│   │   │     - SSE connection lost → switch to polling               │
│   │   │     - Maintain accurate cost tracking                       │
│   │   │     - Seamless user experience                              │
│   │   └───────────────────────────────────────────────────────────┘  │
│   │   │                                                                     │
│   │   │  5. Model Fallback Chain                                      │
│   │   │     - Primary: claude-opus-4                                  │
│   │   │     - Fallback 1: claude-3-5-sonnet                          │
│   │   │     - Fallback 2: claude-3-haiku                            │
│   │   │     - Each fallback reduces cost                             │
│   │   └───────────────────────────────────────────────────────────┘  │
│   │                                                                     │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│   PowerShell Parse-Fail Degradation:                                   │
│   │                                                                     │
│   │   ┌────────────────────────────────────────────────────────────┐   │
│   │   │  On parse failure:                                        │   │
│   │   │  1. Log detailed parse error                             │   │
│   │   │  2. Return fallback deny-rule response                    │   │
│   │   │  3. Suggest correction to user                            │   │
│   │   │  4. Security: deny rather than execute unparsed command   │   │
│   │   └────────────────────────────────────────────────────────────┘   │
│   │                                                                     │
│   Context Compaction Circuit Breaker:                                  │
│   │                                                                     │
│   │   ┌────────────────────────────────────────────────────────────┐   │
│   │   │  compactFailures = 0                                       │   │
│   │   │  MAX_COMPACT_FAILURES = 3                                  │   │
│   │   │                                                              │   │
│   │   │  onCompactionAttempt():                                   │   │
│   │   │    if (compactionFails) {                                  │   │
│   │   │      compactFailures++                                    │   │
│   │   │      if (compactFailures >= MAX_COMPACT_FAILURES) {      │   │
│   │   │        stop("Context compaction failed 3 times")          │   │
│   │   │      }                                                      │   │
│   │   │    }                                                        │   │
│   │   │  }                                                          │   │
│   │   │                                                              │   │
│   │   │  onContextRefill():                                        │   │
│   │   │    if (refilled_to_limit_immediately) {                    │   │
│   │   │      // Context refilled to limit right after compacting   │   │
│   │   │      // Indicates conversation grown too large             │   │
│   │   │      stop("Conversation too large for available context") │   │
│   │   │    }                                                        │   │
│   │   └────────────────────────────────────────────────────────────┘   │
│   │                                                                     │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 8. 附录：参考架构图

### 8.1 完整系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Claude Code System Architecture                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                              CLI Layer                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   claude    │  │  --help    │  │ --version  │  │ --print-cfg │  │   │
│  │  │  binary     │  │   flag     │  │   flag     │  │    flag     │  │   │
│  │  └──────┬──────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └────────┼────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Bootstrap Layer                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  cli.tsx    │  │  main.tsx   │  │ preActions │  │   Hooks    │  │   │
│  │  │ Bootstrap   │  │  Parser     │  │   System    │  │   System   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Query Engine Layer                             │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                      while(true) Loop                         │   │   │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │   │   │
│  │  │  │  State    │  │  Message  │  │   LLM     │  │   Tool    │  │   │   │
│  │  │  │  Machine  │  │ Assembler │  │  Client   │  │  Router   │  │   │   │
│  │  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│  ┌────────┼────────────────────────────────────────────────────────────┐   │
│  │        │                    Execution Layer                         │   │
│  │  ┌─────┴─────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   Tool    │  │ Permission  │  │  Sandbox    │  │   Hook      │  │   │
│  │  │ Registry  │  │  Manager    │  │  Executor   │  │   Pipeline  │  │   │
│  │  └─────┬─────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └────────┼────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Tools Layer                                  │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐        │   │
│  │  │   Bash    │  │   File    │  │   Web     │  │   MCP     │        │   │
│  │  │   Tool    │  │   Tools   │  │   Tools   │  │   Tools   │        │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Extension Layer                                │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐        │   │
│  │  │  Plugin   │  │   Skill  │  │    MCP    │  │   Hook    │        │   │
│  │  │  System   │  │  System  │  │  Client   │  │  System   │        │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      State & Persistence Layer                      │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐        │   │
│  │  │ AppState  │  │  Session  │  │   Cost    │  │  Settings │        │   │
│  │  │   Store   │  │   Store   │  │  Tracker  │  │  Manager  │        │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 数据流图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Data Flow Diagram                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Input                                                               │
│   │                                                                        │
│   │   "Fix the login bug"                                                 │
│   │                                                                        │
│   └─────────────────────┬───────────────────────────────────────────────────┘
│                        │                                                        │
│                        ▼                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  1. UserPromptSubmit Hook → Additional context injection            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                        │                                                        │
│                        ▼                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  2. Message Assembly                                                │   │
│   │     - System prompt                                                  │   │
│   │     - Conversation history (token budget)                           │   │
│   │     - Tool schemas                                                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                        │                                                        │
│                        ▼                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  3. LLM Request                                                     │   │
│   │     - streaming: true                                               │   │
│   │     - model: claude-3-5-sonnet-20241022                            │   │
│   │     - max_tokens: 4096                                              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                        │                                                        │
│                        ▼                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  4. LLM Streaming Response                                           │   │
│   │     - Token-by-token rendering                                      │   │
│   │     - tool_use blocks detected                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                        │                                                        │
│                        ▼                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  5. Tool Call Processing                                             │   │
│   │     - Parse tool_use blocks                                          │   │
│   │     - Dependency analysis                                             │   │
│   │     - Permission checks                                              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                        │                                                        │
│                        ▼                                                        │
│   ┌───────────┐ ┌───────────┐ ┌───────────────────────────────────────────┐   │
│   │ PreToolUse│ │  Execute  │ │ PostToolUse                                 │   │
│   │  Hook     │ │  Tools    │ │ Hook                                         │   │
│   └───────────┘ └───────────┘ └───────────────────────────────────────────┘   │
│                        │                                                        │
│                        ▼                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  6. Collect Results                                                 │   │
│   │     - tool_result blocks                                             │   │
│   │     - Persist large results to disk (>50KB)                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                        │                                                        │
│                        ▼                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  7. Continue Loop or Exit                                          │   │
│   │     - More work? → Back to step 2                                  │   │
│   │     - Done? → SessionEnd hook → Exit                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                        │                                                        │
│                        ▼                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  8. Session Persistence                                            │   │
│   │     - Save messages to session file                                │   │
│   │     - Update cost tracking                                         │   │
│   │     - Update context percentage                                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                        │                                                        │
│                        ▼                                                        │
│   Assistant Output                                                             │
│   │                                                                        │
│   │   "I've fixed the login bug by updating the authentication logic..."  │
│   │                                                                        │
│   └──────────────────────────────────────────────────────────────────────────┘
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 参考资料

- [DeepWiki - Claude Code Overview](https://deepwiki.com/anthropics/claude-code)
- [DeepWiki - System Architecture](https://deepwiki.com/anthropics/claude-code#1.1)
- [DeepWiki - Tool System & Permissions](https://deepwiki.com/anthropics/claude-code#3.2)
- [DeepWiki - Hook System](https://deepwiki.com/anthropics/claude-code#3.4)
- [DeepWiki - MCP Server Integration](https://deepwiki.com/anthropics/claude-code#3.5)
- [DeepWiki - Plugin System](https://deepwiki.com/anthropics/claude-code#3.6)
- [DeepWiki - Skill System](https://deepwiki.com/anthropics/claude-code#3.7)

---

*本文档由 Claude Code 自动生成，基于 DeepWiki 知识库与 CHANGELOG.md 构建。*
*生成日期: 2026/05/15*