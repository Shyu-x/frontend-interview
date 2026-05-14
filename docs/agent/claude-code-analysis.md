# Claude Code 源码剖析与架构分析

本文档详细分析 Claude Code 的项目结构、核心模块、请求处理流程、工具系统实现和状态管理机制。

## 1. 项目概述

Claude Code 是 Anthropic 公司开发的终端 AI 编程助手，本质上是一套完整的终端 Agent 运行时。

### 核心能力层

| 能力层 | 说明 |
|--------|------|
| 启动与模式分流 | CLI/SDK/Desktop 多入口 |
| 终端 UI 与状态管理 | Ink + React TUI |
| 命令系统 | ~80 个斜杠命令 |
| 模型查询与工具执行闭环 | Agent Loop |
| Task/Agent 异步任务系统 | 后台任务 + 子代理 |
| 插件/技能/MCP/远程桥接 | 扩展层 |

### 仓库规模

src/ 目录约 1902 个文件：
- src/utils/ 564 个文件 - 横切能力
- src/components/ 389 个文件 - 终端 UI 组件
- src/commands/ 207 个文件 - 命令系统
- src/tools/ 184 个文件 - 模型可调用工具
- src/services/ 130 个文件 - API、MCP、LSP 等服务

一句话概括：Claude Code 是一个基于 Bun + TypeScript + React + Ink 的终端 AI 编程助手。

## 2. 项目结构分析

### 源码目录结构

```
src/
├── entrypoints/           # 入口层
│   ├── cli.tsx            # CLI 入口（bootstrap 模式）
│   └── init.ts            # 初始化入口
├── main.tsx               # 主程序（参数解析、模式分流）
├── query.ts               # 核心查询循环（Agent Loop）
├── QueryEngine.ts         # SDK 模式封装
├── Tool.ts                # 工具基类
├── tools.ts               # 工具注册与执行
├── commands.ts            # 命令注册
├── components/            # UI 组件（REPL.tsx、screens/、ink.tsx）
├── services/              # 服务层（api/、mcp/、tools/）
├── state/                 # 状态管理（AppStateStore.ts、store.ts）
└── bridge/               # 远程桥接（remote/）
```

### 三层架构概览

```
用户/CLI/SDK/Desktop
         │
         ▼
启动层: main.tsx (参数解析 + 模式分流)
         │
    ┌────┼────┐
    ▼    ▼    ▼
REPL QueryEngine Bridge
    │    │     │
    └────┼────┘
         ▼
核心层: query.ts
- while(true) 主循环
- callModel() streaming
- 工具并行执行
         │
         ▼
工具层: tools.ts
- Read/Write/Bash等
- AgentTool/MCPTool
```

## 3. 核心模块与职责

### 3.1 入口层 (cli.tsx)

cli.tsx 的 bootstrap 模式：

```typescript
async function bootstrap(): Promise<void> {
  // 1. 快速路径检查（避免加载完整模块）
  if (process.argv.includes('--version')) {
    console.log(`Claude Code v${VERSION}`);  // 零导入 < 10ms
    return;
  }

  // 2. 其他快速路径标志
  if (process.argv.includes('--dump-system-prompt')) {
    return;
  }

  // 3. 完整 CLI（延迟加载）
  const { main } = await import('../main.js');
  await main();
}
```

设计要点：使用延迟导入实现零成本快速路径。

### 3.2 查询引擎层 (QueryEngine.ts + query.ts)

QueryEngine.ts 封装 query.ts：

```typescript
export class QueryEngine {
  private session: Session;
  private permissionDeniedTracker: Map<string, number>;

  async submitMessage(input: string): Promise<Result> {
    return query(this.session, input);
  }
}
```

query.ts - 核心 Agent Loop：

```typescript
async function query(session: Session, input: string): Promise<void> {
  let state = initializeState();

  // while(true) 循环（避免递归栈溢出）
  while (true) {
    // 1. 调用模型（streaming）
    const response = await callModel(session, state);

    // 2. 检查是否有工具调用
    if (response.toolUses && response.toolUses.length > 0) {
      // 3. 工具编排与并行执行
      const executor = new StreamingToolExecutor(config);
      const results = await executor.execute(response.toolUses);

      // 4. 更新状态
      state = transitionState(state, results);
      continue;
    } else {
      // 5. 返回结果
      return finalize(state);
    }
  }
}
```

### 3.3 工具层 (tools.ts)

工具接口定义、注册、批量执行：

```typescript
export abstract class Tool {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: object;

  abstract execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}

const toolRegistry = new Map<string, Tool>();

export function registerTool(tool: Tool): void {
  toolRegistry.set(tool.name, tool);
}
```

### 3.4 状态层 (state/)

中央状态存储，支持 UI 渲染、工具执行上下文、任务状态刷新：

```typescript
// 轻量级 Store 实现（非 Redux）
export function createStore<T>(initialState: T) {
  let state = initialState;
  const subscribers = new Set<() => void>();

  return {
    getState: () => state,
    setState: (updater: T | ((prev: T) => T)) => {
      state = typeof updater === 'function'
        ? (updater as (prev: T) => T)(state)
        : updater;
      subscribers.forEach(fn => fn());
    },
    subscribe: (fn: () => void) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
```

## 4. 请求处理流程

### 4.1 完整执行链路

```
用户输入 / 命令触发
         │
         ▼
cli.tsx bootstrap - 检查快速路径标志
         │
         ▼
main.tsx - 参数解析 - preActions钩子 - 模式分流
         │
    ┌────┼────┐
    ▼    ▼    ▼
REPL QueryEngine Bridge
    │    │     │
    └────┼────┘
         ▼
query.ts while(true)循环
  - 消息组装
  - callModel() streaming
  - 解析响应
  - 工具编排
  - 工具执行
  - 状态转换
         │
         ▼
工具执行 - 状态更新 - UI渲染/结果返回
```

### 4.2 三种运行模式

1. **交互模式 (REPL)**：main.tsx -> REPL.tsx -> query.ts
2. **SDK 模式**：QueryEngine.submitMessage() -> query.ts
3. **远程模式**：Bridge 桥接，WebSocket 会话管理

### 4.3 工具调用流程

```typescript
async function executeToolCalls(toolCalls: ToolCall[]): Promise<void> {
  // 1. 工具编排决策
  const plan = toolOrchestration.decide(toolCalls);

  // 2. 执行工具组
  for (const group of plan.groups) {
    const results = await Promise.all(
      group.map(tc => executeSingleTool(tc))
    );

    // 3. 将结果添加到消息上下文
    session.messages.push(...results.map(toolResultToMessage));
  }
}

async function executeSingleTool(toolCall: ToolCall): Promise<ToolResult> {
  const tool = toolRegistry.get(toolCall.name);

  // 权限检查
  if (!await checkPermission(toolCall)) {
    return { success: false, error: 'Permission denied' };
  }

  // 执行前钩子
  await toolHooks.beforeExecute.fire(toolCall);

  // 实际执行
  const result = await tool.execute(toolCall.input, context);

  // 执行后钩子
  await toolHooks.afterExecute.fire(result);

  return result;
}
```

## 5. 工具系统实现

### 5.1 工具架构核心

Command 与 Tool 的分离是架构中最重要的划分：

```
Command (命令)        Tool (工具)
    │                    │
    ├─ 入口点            ├─ 模型可调用
    ├─ 意图转换          ├─ 原子能力
    └─ 用户交互          └─ 底层操作
```

### 5.2 内置工具列表

| 工具 | 描述 |
|------|------|
| BashTool | 执行 Shell 命令 |
| ReadTool | 读取文件内容 |
| WriteTool | 写入文件内容 |
| EditTool | 编辑文件（智能修改） |
| GlobTool | 文件模式匹配 |
| GrepTool | 内容搜索 |
| WebSearchTool | 网络搜索 |
| AgentTool | 创建子代理 |
| SkillTool | 调用技能 |
| MCPTool | MCP 协议工具 |
| TodoWriteTool | 任务列表写入 |
| TaskTool | 后台任务管理 |

### 5.3 工具实现示例

#### BashTool

```typescript
export class BashTool extends Tool {
  name = 'Bash';
  description = 'Execute shell commands in the terminal';

  async execute(input: { command: string; timeout?: number }, context) {
    // 权限检查
    if (!context.permissions.has('bash')) {
      return { success: false, error: 'Permission denied' };
    }

    // 沙箱执行
    try {
      const result = await sandbox.execute(input.command, {
        timeout: input.timeout || 60000,
        cwd: context.projectPath,
      });
      return { success: true, output: result.stdout };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

#### ReadTool

```typescript
export class ReadTool extends Tool {
  name = 'Read';

  async execute(input: { file_path: string; offset?: number; limit?: number }, context) {
    const fs = await import('fs/promises');

    try {
      const content = await fs.readFile(input.file_path, 'utf-8');
      const lines = content.split('\n');
      const offset = input.offset || 0;
      const limit = input.limit || lines.length;
      const selected = lines.slice(offset, offset + limit).join('\n');

      return {
        success: true,
        output: '```' + input.file_path + '\n' + selected + '\n```'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

### 5.4 工具编排服务

```typescript
export interface OrchestrationPlan {
  type: 'sequential' | 'parallel' | 'hybrid';
  groups: ToolCall[][];
}

export class ToolOrchestration {
  decide(toolCalls: ToolCall[]): OrchestrationPlan {
    // 1. 依赖分析
    // 2. 分类（独立 vs 有依赖）
    // 3. 策略决策（并行/串行/混合）
    if (independent.length > 0 && dependent.length === 0) {
      return { type: 'parallel', groups: [independent] };
    }
    // ...
  }
}
```

## 6. 状态管理机制

### 6.1 AppState 结构

```typescript
interface AppState {
  messages: Message[];           // 对话消息
  tasks: Task[];                  // 任务系统
  mcpConnections: MCPConnection[]; // MCP 连接
  plugins: Plugin[];              // 插件系统
  permissions: PermissionState;   // 权限状态
  costTracker: CostTracker;       // 成本追踪
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
}

interface Task {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  parentTaskId?: string;  // 用于子任务
}
```

### 6.2 状态更新流程

```typescript
// 消息添加
async function addMessage(role: Message['role'], content: string): Promise<void> {
  const message: Message = {
    id: generateId(),
    role,
    content,
    timestamp: Date.now(),
  };

  appStateStore.setState(prev => ({
    ...prev,
    messages: [...prev.messages, message],
  }));
}

// 任务状态更新
function updateTaskStatus(taskId: string, status: Task['status']): void {
  appStateStore.setState(prev => ({
    ...prev,
    tasks: prev.tasks.map(t =>
      t.id === taskId ? { ...t, status } : t
    ),
  }));
}
```

### 6.3 权限状态管理

```typescript
export class PermissionManager {
  private deniedCount = new Map<string, number>();

  async checkPermission(toolName: string): Promise<boolean> {
    const state = appStateStore.getState();
    return state.permissions[toolName] !== 'denied';
  }

  recordDenial(toolName: string): void {
    const count = this.deniedCount.get(toolName) || 0;
    this.deniedCount.set(toolName, count + 1);

    if (count >= 3) {  // 超过阈值则永久拒绝
      appStateStore.setState(prev => ({
        ...prev,
        permissions: { ...prev.permissions, [toolName]: 'denied' }
      }));
    }
  }
}
```

### 6.4 成本追踪

```typescript
export class CostTracker {
  private costs = {
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
  };

  updateFromResponse(response: ModelResponse): void {
    this.costs.inputTokens += response.usage.input_tokens;
    this.costs.outputTokens += response.usage.output_tokens;
    this.costs.totalCost += calculateCost(response.usage);

    appStateStore.setState(prev => ({
      ...prev,
      costTracker: { ...this.costs },
    }));
  }

  getSummary(): string {
    return 'Tokens: ' + this.costs.inputTokens + ' in / ' + 
           this.costs.outputTokens + ' out | Cost: $' + 
           this.costs.totalCost.toFixed(4);
  }
}
```

## 7. 关键设计模式

### 7.1 责任链模式 (Chain of Responsibility)

```
cli.tsx -> main.tsx -> QueryEngine -> query
```

每层职责清晰，上层不知道下层细节。

### 7.2 工厂模式 (Factory Pattern)

```typescript
export class ToolExecutorFactory {
  static create(config: ClaudeConfig): ToolExecutor {
    if (config.features.enableParallelExecution) {
      return new ParallelToolExecutor();
    } else if (config.features.enableSubagents) {
      return new AgentToolExecutor();
    }
    return new SequentialToolExecutor();
  }
}
```

### 7.3 状态机模式

query.ts 使用 while(true) 循环实现状态机：

```typescript
type QueryState =
  | { status: 'idle' }
  | { status: 'thinking' }
  | { status: 'executing_tools' }
  | { status: 'waiting_for_permission' }
  | { status: 'completed' }
  | { status: 'error' };
```

### 7.4 订阅发布模式 (Observer)

```typescript
// 状态订阅
appStateStore.subscribe((state) => {
  rerenderComponents();
});

// 工具执行订阅
toolHooks.on('beforeExecute', (toolCall) => {
  telemetry.track('tool_execute', { tool: toolCall.name });
});
```

### 7.5 依赖注入模式

```typescript
interface ToolExecutionContext {
  projectPath: string;
  session: Session;
  permissions: PermissionManager;
  telemetry: TelemetryService;
  hooks: ToolHooks;
}

async function executeTool(tool: Tool, input: unknown, deps: ToolExecutionContext) {
  const result = await tool.execute(input, { ...deps });
  return result;
}
```

## 8. 扩展机制

Claude Code 提供了多层次的扩展机制，支持不同维度的定制。

### 8.1 插件系统

```typescript
interface Plugin {
  name: string;
  version: string;
  hooks: PluginHooks;
  onLoad(): Promise<void>;
  onUnload(): Promise<void>;
}

interface PluginHooks {
  onBeforeToolExecute?: (tool: ToolCall) => Promise<void>;
  onAfterToolExecute?: (result: ToolResult) => Promise<void>;
  onMessage?: (message: Message) => Promise<Message>;
  onAgentLoop?: (state: QueryState) => Promise<QueryState>;
}

export class PluginManager {
  private plugins = new Map<string, Plugin>();

  async loadPlugin(pluginPath: string): Promise<void> {
    const plugin = await import(pluginPath);
    await plugin.onLoad();
    this.plugins.set(plugin.name, plugin);
  }

  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (plugin) {
      await plugin.onUnload();
      this.plugins.delete(name);
    }
  }
}
```

### 8.2 技能系统 (Skills)

技能是一组预定义的工具组合和工作流：

```typescript
interface Skill {
  name: string;
  description: string;
  tools: string[];           // 需要的工具
  systemPrompt: string;      // 技能专属提示
  constraints: SkillConstraint[];
  execute(context: SkillContext): Promise<SkillResult>;
}

const skillTool: Tool = {
  name: 'Skill',
  async execute(input: { skillName: string; params: any }, context) {
    const skill = skillRegistry.get(input.skillName);
    return skill.execute(context);
  },
};
```

### 8.3 MCP 协议 (Model Context Protocol)

MCP 允许连接外部数据源和服务：

```typescript
export class MCPClient {
  private connections = new Map<string, MCPConnection>();

  async connect(config: MCPConfig): Promise<void> {
    const connection = await createConnection(config);
    this.connections.set(config.name, connection);

    const mcpTools = await connection.discoverTools();
    toolRegistry.register(mcpTools);
  }

  async disconnect(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (connection) {
      await connection.close();
      this.connections.delete(name);
    }
  }
}
```

### 8.4 远程桥接

支持远程会话和桥接模式：

```typescript
export class RemoteSessionManager {
  async connect(sessionId: string, options: RemoteOptions): Promise<void> {
    // 1. 建立 WebSocket 连接
    const ws = new WebSocket('wss://' + options.host + '/session/' + sessionId);

    // 2. 心跳保活
    const heartbeat = setInterval(() => {
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    }, 30000);

    // 3. 消息转发
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleRemoteMessage(message);
    };
  }

  private handleRemoteMessage(message: RemoteMessage): void {
    switch (message.type) {
      case 'execute':
        executeCommand(message.command).then(result => {
          ws.send(JSON.stringify({ type: 'result', result }));
        });
        break;
    }
  }
}
```

### 8.5 扩展机制对比

| 扩展类型 | 适用场景 | 复杂度 |
|---------|---------|--------|
| 插件 | 修改核心行为、拦截工具执行 | 高 |
| 技能 | 封装工作流、领域知识 | 中 |
| MCP | 连接外部服务、数据库、API | 中 |
| 远程桥接 | 多设备协同、远程控制 | 中 |
| 命令 | 添加斜杠命令、UI 交互 | 低 |

## 9. 总结

### 9.1 核心架构要点

```
Claude Code = 终端 Agent 运行时
           = Query/Tool/Task 执行核心
           + Plugin/MCP/Skill 扩展机制
           + Ink/React UI 层
```

### 9.2 执行链路

```
用户输入 -> cli.tsx bootstrap -> main.tsx
        -> REPL.tsx / QueryEngine
        -> query.ts while(true) 循环
        -> callModel() streaming
        -> toolOrchestration 编排
        -> tools.ts 执行工具
        -> 状态更新 + 成本追踪
        -> UI 渲染 / 结果返回
```

### 9.3 关键设计决策

1. **延迟加载**：快速路径零导入，完整模块延迟加载
2. **状态隔离**：AppStateStore 集中管理，支持多订阅者
3. **工具编排**：智能决定串行/并行执行
4. **循环非递归**：while(true) 避免长会话栈溢出
5. **扩展分层**：插件、技能、MCP、桥接各司其职

### 9.4 学习建议

- 从 query.ts 入手理解 Agent Loop
- 研究 Tool.ts 和 tools.ts 理解工具系统
- 查看 state/store.ts 理解状态管理
- 阅读 services/ 理解服务层设计
- 参考 commands/ 学习命令系统实现

---

## 参考资源

- Claude Code 官方文档：https://docs.anthropic.com/claude-code
- Anthropic API 文档：https://docs.anthropic.com/api
- MCP 协议规范：https://modelcontextprotocol.io

---

文档版本：v1.0 | 更新日期：2026-05-14
