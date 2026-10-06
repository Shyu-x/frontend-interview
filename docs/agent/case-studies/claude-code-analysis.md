---
title: Claude Code 源码剖析
description: 详细分析 Claude Code 的项目结构、核心模块、请求处理流程、工具系统实现和状态管理机制。
tags:
  - ai-agent
  - evaluation
date: 2026-05-17
---

# Claude Code 源码剖析

本文档详细分析 Claude Code 的项目结构、核心模块、请求处理流程、工具系统实现和状态管理机制。

## 1. 项目概述

Claude Code 是 Anthropic 公司开发的终端 AI 编程助手，本质上是一套完整的终端 Agent 运行时。

### 1.1 核心能力层

| 能力层 | 说明 |
|--------|------|
| 启动与模式分流 | CLI/SDK/Desktop 多入口 |
| 终端 UI 与状态管理 | Ink + React TUI |
| 命令系统 | ~80 个斜杠命令 |
| 模型查询与工具执行闭环 | Agent Loop |
| Task/Agent 异步任务系统 | 后台任务 + 子代理 |
| 插件/技能/MCP/远程桥接 | 扩展层 |

### 1.2 仓库规模

src/ 目录约 1902 个文件：
- src/utils/ 564 个文件 - 横切能力
- src/components/ 389 个文件 - 终端 UI 组件
- src/commands/ 207 个文件 - 命令系统
- src/tools/ 184 个文件 - 模型可调用工具
- src/services/ 130 个文件 - API、MCP、LSP 等服务

一句话概括：Claude Code 是一个基于 Bun + TypeScript + React + Ink 的终端 AI 编程助手。

## 2. 项目结构分析

### 2.1 源码目录结构

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

### 2.2 三层架构概览

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
// 第 1 段：定义工具的抽象契约（所有工具的基类）
// 用 abstract 而非 interface，是为了让子类既继承统一的字段约定，又能共享未来可能加入的公共实现（如日志、重试）。
// 这里只声明“有哪些能力”，不规定“怎么实现”，从而让上层调度逻辑只依赖这套稳定契约，而不耦合具体工具。
export abstract class Tool {
  // 工具的唯一标识名，注册表以它为键，因此实现类必须保证全局不重名，否则会被后续注册覆盖。
  abstract name: string;
  // 给模型/调用方阅读的自然语言说明，直接决定模型能否正确选用该工具，需写清用途与适用场景。
  abstract description: string;
  // 参数校验用的 JSON Schema 对象；用 object 这种宽类型是因为各工具的 schema 形状差异极大，此处不做收窄。
  abstract inputSchema: object;

  // 统一执行入口：input 用 unknown 而非 any，强制实现方在做业务前先显式收窄类型（守住外部输入的边界）。
  // context 传入运行时环境（如工作目录、取消信号、权限），result 统一包装成功/失败，保证调用方拿到一致结构。
  abstract execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}

// 第 2 段：全局工具注册表
// 用 Map 而非普通对象，既避免原型链键名污染，又保证 O(1) 查找、稳定的插入顺序，且键类型被约束为 string。
// const 只锁定引用，Map 内容仍可变，因此注册是“就地写入”，无需重建表。
const toolRegistry = new Map<string, Tool>();

// 第 3 段：注册函数——把工具实例登记的对外唯一入口
// 以 tool.name 为键写入，同名工具会被静默覆盖（这是易错点：若需要防重复注册，应在此加 has 校验并抛错）。
export function registerTool(tool: Tool): void {
  toolRegistry.set(tool.name, tool);
}
```
### 3.4 状态层 (state/)

中央状态存储，支持 UI 渲染、工具执行上下文、任务状态刷新：

```typescript
// 轻量级 Store 实现（非 Redux）
// 第 1 段：工厂函数签名与闭包私有状态（创建隔离的 Store 实例）
// 用函数+闭包而非 class 封装状态：外部拿不到 state/subscribers 的引用，只能经暴露的方法读写，
// 天然实现数据私有，且每次调用 createStore 都生成互不干扰的独立实例。
export function createStore<T>(initialState: T) {
  // 唯一数据源，被下方所有方法以闭包方式共享；注意 getState 返回的是引用，
  // 若存对象而调用方直接改返回值，会绕过通知机制——这是本实现的边界条件。
  let state = initialState;
  // 用 Set 而非数组存订阅者：注册/注销均摊 O(1) 且天然去重，
  // 可避免同一个 fn 被重复加入而一次 setState 触发多次通知。
  const subscribers = new Set<() => void>();

  // 第 2 段：对外返回的 Store 接口对象（读取入口）
  // 三个方法闭包捕获同一份 state/subscribers，保持数据流一致；
  // 全部用箭头函数书写，便于调用方解构后直接使用而不丢失 this（本实现本就不依赖 this）。
  return {
    // getState：同步读取当前快照，不触发通知，复杂度 O(1)。
    getState: () => state,
    // 第 3 段：setState —— 兼容“值”与“更新函数”两种入参（写入与广播）
    // 传函数时基于最新 state 计算新值，可规避批量/异步场景下读到陈旧闭包变量的问题；
    // 传值则直接覆盖。它是唯一会改变 state 并通知订阅者的入口。
    setState: (updater: T | ((prev: T) => T)) => {
      // 这里用 as 显式收窄签名：仅靠 typeof === 'function' 无法让 TS 排除 T 本身可能是函数的情况。
      state = typeof updater === 'function'
        ? (updater as (prev: T) => T)(state)
        : updater;
      // 顺序关键：先落库再广播，保证订阅者回调里 getState() 读到的是新值；
      // forEach 为 O(n)，若订阅者在回调中增删自身，其迭代语义需自行留意。
      subscribers.forEach(fn => fn());
    },
    // 第 4 段：subscribe —— 注册监听并返回退订函数（生命周期管理）
    // 返回 unsubscribe 闭包而非让调用方持有 fn，便于 React useEffect 等直接 return 完成清理，防止订阅泄漏。
    subscribe: (fn: () => void) => {
      subscribers.add(fn);
      // delete 对不存在的元素是安全 no-op，因此重复退订不会抛错，复杂度 O(1)。
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

#### 5.3.1 BashTool

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

#### 5.3.2 ReadTool

```typescript
// 第 1 段：声明工具身份——把"读文件"抽象成一个可被上层 Agent 调度的工具对象。
// 每个工具靠固定的 name 注册进工具表，LLM 调用时按名字路由到这里；
// name 用常量字段而不是构造函数参数，是为了让工具实例可以是无状态的单例。
export class ReadTool extends Tool {
  name = 'Read';

  // 第 2 段：执行入口。input 只描述"要读什么、读哪几行"，context 承载会话/权限等运行时依赖（此处未用到，属于预留位）。
  // 整个方法 async，因为读盘是 IO；返回值约定为结构化对象而非抛异常，便于上层统一格式化给模型看。
  async execute(input: { file_path: string; offset?: number; limit?: number }, context) {
    // 用动态 import 而非顶层 import：模块顶层不绑定 node 内置模块，便于在浏览器/沙箱/测试里替换或延迟加载，也能缩短冷启动。
    // 动态 import 返回 Promise，所以必须 await；重复调用时走的是模块缓存，开销可忽略。
    const fs = await import('fs/promises');

    // 第 3 段：真正读取文件。try 把"IO 可能失败"这一事实显式圈出来，保证任何异常都能转成 success:false 而不是冒泡崩掉调用方。
    try {
      // 必须显式指定 'utf-8'：否则 readFile 返回 Buffer，后面的 split 会按字节切分，中文等多字节字符会被从中间劈开。
      const content = await fs.readFile(input.file_path, 'utf-8');
      // 以 \n 切行得到一个"行数组"，后面的偏移/限量都在这个数组上做，避免反复扫描字符串。
      // 注意：CRLF 文件的每行末尾会残留 \r；此处不做规范化，是本实现的已知粗糙点。
      const lines = content.split('\n');
      // offset 语义是 0-based 的行下标（不是行号）；用 || 而非 ?? 意味着传入 0 和未传等价处理。
      const offset = input.offset || 0;
      // 未传 limit 就默认取总行数，即"读到文件末尾"。
      // 易错点：limit 也用 ||，所以 limit=0 会被当成"未提供"而返回全部行，而不是空结果。
      const limit = input.limit || lines.length;
      // slice 的结束索引是排他的，恰好覆盖 [offset, offset+limit) 这 limit 行；
      // 越界不会报错，会静默截断，因此这个工具天然容忍超范围请求。
      // 复杂度：整文件读取 O(文件大小)，切行 O(总行数)，切片 O(输出行数)；limit 只能省内存，不能省 IO。
      const selected = lines.slice(offset, offset + limit).join('\n');

      // 第 4 段：包装成功结果。把内容塞进 ``` 围栏并在首行标注文件路径，
      // 目的是让上层模型把文件内容当"被引用的数据"而不是可执行指令，降低 prompt 注入风险，同时让来源可追溯。
      return {
        success: true,
        output: '```' + input.file_path + '\n' + selected + '\n```'
      };
    } catch (error) {
      // 第 5 段：失败兜底。不区分"文件不存在 / 权限不足 / 编码错"等具体原因，一律降级为 success:false，让模型自行改路径重试。
      // 易错点：TS 严格模式下 catch 变量是 unknown，error.message 会编译报错，通常需要类型窄化或用 any 才能通过；
      // 另外这里只回传 message，丢弃了 stack 与 errno/code，排查线上问题时信息量偏少。
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
// 第 1 段：类结构与会话内计数状态
// deniedCount 只存在于当前进程/实例的内存中，用来累计每个工具被拒绝的次数。
// 选择 Map 而不是普通对象，是为了让任意 toolName 都能安全作为 key，且读写是 O(1)。
export class PermissionManager {
  private deniedCount = new Map<string, number>();

  // 第 2 段：权限查询（读路径）
  // 每次调用都实时读取全局 store 的最新快照，保证不缓存过期权限；
  // 只有显式被标记为 'denied' 才返回 false，未配置(undefined)或其它值一律视为放行。
  async checkPermission(toolName: string): Promise<boolean> {
    const state = appStateStore.getState();
    return state.permissions[toolName] !== 'denied';
  }

  // 第 3 段：记录一次拒绝，并在累计到阈值时把权限升级为永久 denied
  recordDenial(toolName: string): void {
    // 先取旧值再自增：count 是"本次之前"的累计次数，随后写入 count+1。
    // 注意这个顺序埋了一个易错点：判断用的是旧值，所以真正触发是在第 4 次调用（详见下方）。
    const count = this.deniedCount.get(toolName) || 0;
    this.deniedCount.set(toolName, count + 1);

    if (count >= 3) {  // 超过阈值则永久拒绝
      // 用函数式 setState 拿 prev，避免并发更新时丢失其它字段的修改；
      // 同时展开 permissions 新对象而非原地改，维持不可变更新约定（触发订阅者重渲染）。
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
// 第 1 段：类声明与内部计费累加器初始化（承载一次会话内的累计用量状态）
// 把「累计值」放进实例字段而不是每次向外读取，避免依赖上游响应对象的完整性；
// 用字面量一次性初始化三个计数器，保证字段始终存在，后续 += 不会因 undefined 变成 NaN。
export class CostTracker {
  private costs = {
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0, // 以「美元」为单位的浮点累加值，仅在展示时才 toFixed 截断，避免过早丢精度
  };

  // 第 2 段：消费一次模型响应并做增量累加（数据流的入口）
  // 每次响应只贡献自己的增量，所以这里必须是「累加」而非「赋值」；
  // 输入/输出 token 分开记，便于后续按各自单价差异单独核算。
  updateFromResponse(response: ModelResponse): void {
    this.costs.inputTokens += response.usage.input_tokens;
    this.costs.outputTokens += response.usage.output_tokens;
    this.costs.totalCost += calculateCost(response.usage); // 单价表由 calculateCost 封装，这里只取增量

    // 第 3 段：把最新累计值同步到全局 store，驱动界面重渲染
    // 用函数式 setState 读 prev，避免闭包捕获过期 state（并发更新下的经典易错点）；
    // 先展开 prev 保留其它字段，再浅拷贝 this.costs 做快照，防止外部持有内部可变对象后被后续累加污染。
    appStateStore.setState(prev => ({
      ...prev,
      costTracker: { ...this.costs },
    }));
  }

  // 第 4 段：生成人类可读的单行摘要（展示层，纯读取无副作用）
  // 不修改任何状态，可安全重复调用；toFixed(4) 保留 4 位小数，兼顾小额成本的可读性与精度。
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
  // 第 1 段：工厂入口——用静态方法隔离「选择策略」与「使用策略」两件事
  // 调用方只关心拿到一个 ToolExecutor，无需知道具体实现类，从而避免在业务代码里
  // 散落 new XxxExecutor() 的 if/else；新增策略时改动集中在这一处（符合开闭原则）。
  // 注意：create 是静态方法，说明工厂本身不需要持有状态，纯函数式地依据配置做决策。
  static create(config: ClaudeConfig): ToolExecutor {
    // 第 2 段：第一优先级——并行执行
    // 先判断并行，意味着「并行」是能力最强的模式：一旦开启，即便同时开启了子代理，
    // 也以并行为准。这里隐含了策略优先级，改动判断顺序会直接改变最终返回的实例类型。
    if (config.features.enableParallelExecution) {
      return new ParallelToolExecutor();
    } else if (config.features.enableSubagents) {
      // 第 3 段：第二优先级——子代理模式
      // 只有「未开启并行」且「开启了子代理」时才会走到这里，是典型的互斥优先级链。
      // 易错点：这是 else if，若误写成两个独立 if，后面的 return 会让子代理分支永远无法命中。
      return new AgentToolExecutor();
    }
    // 第 4 段：兜底分支——串行执行
    // 当前面两个开关都关闭时返回最保守的串行实现，保证任何配置组合下都有可用执行器（永不返回 undefined）。
    // 边界条件：config.features 必须存在；若上层可能传空对象，需要在此防御性判空。
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
// 第 1 段：定义工具执行上下文（执行期依赖的"注入契约"）
// 把工具运行所需的一切外部能力（路径、会话、权限、遥测、钩子）收拢成一个接口，
// 让 executeTool 与 Tool 实现都不依赖具体单例，便于测试时替换成假对象（DI 思路）。
// 注意：这里只声明形状，不含任何实现，因此每处调用方都要负责把 5 个字段都填齐。
interface ToolExecutionContext {
  // 项目根目录：工具做文件读写时的相对路径基准，必须由调用方归一化为绝对路径
  projectPath: string;
  // 会话对象：承载多轮对话状态；跨工具共享，工具内部不应整体替换它
  session: Session;
  // 权限管理器：真正做"是否允许该操作"的裁决，工具本身不应硬编码权限规则
  permissions: PermissionManager;
  // 遥测服务：用于埋点/耗时统计，异步上报时不要阻塞主执行链路
  telemetry: TelemetryService;
  // 生命周期钩子：在工具执行前后插入横切逻辑（如审计、拦截、改写输入）
  hooks: ToolHooks;
}

// 第 2 段：工具执行入口（唯一的调度函数）
// input 故意声明为 unknown：调用方可能传入模型生成的不受信数据，
// 类型收窄/校验的责任下沉到各个 tool.execute 内部（合作式约定而非强制）。
// deps 是必传的，因为它等同于"运行时环境"，缺失任一字段都会在工具内部才爆炸。
async function executeTool(tool: Tool, input: unknown, deps: ToolExecutionContext) {
  // 第 3 段：调用工具并透传上下文
  // { ...deps } 是浅拷贝：防止工具把 deps 上的字段重新赋值（如 deps.session = other）
  // 而污染调用方的对象；但嵌套对象（session/permissions 等）仍是同一引用，
  // 所以"深层的状态变更"依旧会外泄，这是本写法最易踩的坑。
  // 另外此处没有 try/catch、也没有调用 deps.hooks / deps.telemetry，
  // 说明错误处理与钩子触发被有意留给外层编排（例如工具包装器或中间件）承担。
  const result = await tool.execute(input, { ...deps });
  // 直接返回而不做结果包装/校验，保持零额外开销；代价是返回类型完全由 Tool 决定
  return result;
}
```
## 8. 扩展机制

Claude Code 提供了多层次的扩展机制，支持不同维度的定制。

### 8.1 插件系统

```typescript
// 第 1 段：插件契约（Plugin 接口）——定义"一个插件长什么样"
// 这里只声明能力，不做实现：宿主只依赖这个结构化契约，任何满足形状的对象/模块都能被装载，
// 因此插件作者可以用任意方式组织代码，宿主无需知道其内部结构。
// 注意 onLoad/onUnload 返回 Promise，意味着生命周期是异步的（可能要读配置、开连接、拉远程清单）。
interface Plugin {
  name: string; // 插件的唯一标识，后续 Map 的键、卸载时的查找依据都来自它
  version: string; // 仅作文本记录/兼容性判断用，本类不据此做版本仲裁
  hooks: PluginHooks; // 钩子集合：真正介入主流程的入口，见下一段
  onLoad(): Promise<void>; // 装载时调用；此时钩子应已就绪
  onUnload(): Promise<void>; // 卸载时调用；用于释放资源（监听器、定时器、外部连接）
}

// 第 2 段：钩子集合（PluginHooks）——用"全可选"实现最小侵入的扩展点
// 全部字段可选：插件只实现自己关心的一两个钩子即可，宿主必须在调用前做存在性判断，
// 这也是下面 loadPlugin/unloadPlugin 之外、真正调用钩子的代码需要 `?.` 或 if 保护的原因。
// 每个钩子都返回 Promise，且 onMessage/onAgentLoop 是"接收旧值、返回新值"的变换语义：
// 宿主若不接收返回值，插件的修改就会静默丢失——这是最常见的易错点。
interface PluginHooks {
  onBeforeToolExecute?: (tool: ToolCall) => Promise<void>; // 工具执行前：可做校验/改写/审计，返回 void 即"不许改参数"
  onAfterToolExecute?: (result: ToolResult) => Promise<void>; // 工具执行后：观察结果，同样返回值被忽略
  onMessage?: (message: Message) => Promise<Message>; // 消息管道：宿主必须用返回值覆盖原消息才能生效
  onAgentLoop?: (state: QueryState) => Promise<QueryState>; // Agent 主循环：可整体改写状态，属最强扩展点
}

// 第 3 段：管理器本体与插件注册表
// 用 Map 而不是数组：装载/卸载/查找都是按 name 的 O(1)，避免每次钩子触发时线性扫描。
// 声明为 private 保证外部只能走 load/unload 两个入口，防止绕过生命周期直接改表。
// 依赖的外部类型（ToolCall/ToolResult/Message/QueryState）由宿主其它模块提供，本文件不定义。
export class PluginManager {
  private plugins = new Map<string, Plugin>();

  // 第 4 段：装载插件——动态导入 + 先 onLoad 后注册
  // 用动态 import(pluginPath) 而非顶层 import：路径在运行时才知道（用户配置/插件目录），
  // 且按需加载，未启用的插件不进入模块图，也就不承担其体积与副作用。
  // 顺序很关键：先 await onLoad() 再 set()，形成"要么完全可用、要么完全不注册"的原子性——
  // 若 onLoad 抛错（配置错、依赖缺失），异常向上冒泡，注册表保持干净，不会留下半成品插件。
  // 边界：同一 name 二次装载会直接覆盖旧值，旧插件既不会收到 onUnload，其资源也不会被释放（潜在泄漏）。
  async loadPlugin(pluginPath: string): Promise<void> {
    const plugin = await import(pluginPath); // 模块命名空间对象；这里默认导出与命名导出同形，故可直接取属性
    await plugin.onLoad(); // 失败即中止：await 保证注册动作发生在其成功之后
    this.plugins.set(plugin.name, plugin); // 以插件自报的 name 为键，信任插件提供唯一名
  }

  // 第 5 段：卸载插件——先 onUnload 再删除，并容忍"插件不存在"
  // 用 get 判空而非直接 delete：卸载不存在的插件是幂等操作，静默返回比抛错更适合收尾/清理场景
  // （例如宿主关闭时无差别遍历卸载列表）。
  // 顺序同样关键：先 await onUnload() 后 delete，确保插件在"仍可从注册表查到"的状态下完成清理，
  // 否则清理过程中若需要回查自身（如注销自己注册的钩子）会查到 undefined。
  // 边界：若 onUnload 抛错，delete 永不执行，插件会残留为"已关闭但仍注册"的僵尸状态；
  // 若要强一致，应把 delete 放进 finally，本实现选择让异常显式暴露给调用方。
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
// 第 1 段：类骨架与连接台账——用类级别长期持有「服务名 → 活跃连接」的映射
// 之所以不放在方法内的临时变量：连接要跨多次 connect/disconnect 调用存活，
// 且断开时调用方只给出 name，必须能反查回 connection 对象。
export class MCPClient {
  private connections = new Map<string, MCPConnection>(); // 用 Map 而非数组：按名检索是 O(1)，避免每次断开的线性扫描；key 取 config.name 以便外部按名管理

  // 第 2 段：建立连接——握手 → 登记台账 → 发现工具并注册
  // 数据流：config → connection → connections → 工具描述列表 → 全局 toolRegistry。
  // 易错点：set 必须早于 discoverTools，否则发现阶段抛错会留下「已连接却无法回收」的孤儿连接；同名重复 connect 会直接覆盖旧条目而不关闭它。
  async connect(config: MCPConfig): Promise<void> {
    const connection = await createConnection(config); // 真正的 I/O 与鉴权发生在这里，抛错则整个 connect 失败且不写入台账
    this.connections.set(config.name, connection); // 先登记，保证后续任何异常都有回收路径

    const mcpTools = await connection.discoverTools(); // 二次往返，拉取对端暴露的工具清单
    toolRegistry.register(mcpTools); // 汇入全局注册表，之后本地 agent 才能按名调用这些远程工具
  }

  // 第 3 段：断开连接——按名查找 → 优雅关闭 → 从台账移除
  // 边界：name 不存在时静默返回（幂等），不抛错，调用方无需先判断是否连接过。
  // 顺序：close() 在前、delete() 在后，若 close 抛错则条目保留，可重试关闭，避免「连接已泄漏但台账已清空」。
  async disconnect(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (connection) {
      await connection.close(); // 释放底层 socket / 子进程等资源
      this.connections.delete(name); // 确认关闭成功后才摘除，使失败场景可重试
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

## 10. 参考资源

- Claude Code 官方文档：https://docs.anthropic.com/claude-code
- Anthropic API 文档：https://docs.anthropic.com/api
- MCP 协议规范：https://modelcontextprotocol.io

---

文档版本：v1.0 | 更新日期：2026-05-14

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Code 文档](https://code.claude.com/docs/en/overview) | 官方文档，逐一覆盖扩展机制涉及的 slash commands、hooks、subagents | 安装后按 hooks 与 subagents 章节顺序读，边读边在源码里找对应实现位置 |
| [Claude Tool Use 概览](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview) | 工具调用的官方规范，直接对应工具系统实现章节 | 先手写工具定义 JSON schema 并故意传错参数，再回源码核对校验逻辑 |
| [Claude 子 Agent 文档](https://docs.claude.com/en/docs/claude-code/sub-agents) | 子 Agent 官方说明，解释工具权限隔离与职责划分 | 建一个只读代码审查 subagent 跑一次，再定位源码中权限限制的实现 |
| [Claude Code Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) | Hooks 文档是理解扩展机制与生命周期挂载点的入口 | 写一个提交前 lint 的 hook 并验证能拦截失败，再找源码里的触发时机 |
| [RFC 7636 PKCE](https://www.rfc-editor.org/rfc/rfc7636) | OAuth PKCE 规范，对应登录与请求鉴权流程 | 读 verifier 生成与 challenge 校验两节，回到源码核对实现是否一致 |
| [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp) | MCP 接入文档，说明外部工具如何被注入工具系统 | 接一个文件系统 MCP 服务器跑通读写，再追源码中工具注册与调用链 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Agent SDK 概览](https://docs.claude.com/en/api/agent-sdk/overview) | SDK 概览附示例，可观察 Agent 循环与工具调用过程 | 用 SDK 写一个读取目录并总结的小 Agent，对照源码的循环实现 |
| [Claude Agent SDK（TypeScript）](https://github.com/anthropics/claude-agent-sdk-typescript) | TypeScript SDK 含可读源码，便于对照工具注册实现 | 克隆后跑 README 示例，再注册自定义工具，观察参数如何流入执行器 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Code 最佳实践](https://www.anthropic.com/engineering/claude-code-best-practices) | 官方最佳实践，折射出项目对 CLAUDE.md 与计划先行的设计取向 | 在自己仓库试一周，重点看上下文管理与计划先行，再回看源码对应模块 |
| [TanStack Query 文档](https://tanstack.com/query/latest) | 服务端状态管理经典设计，可对照状态管理机制章节 | 读缓存、失效与请求去重几节，比对源码状态层的取舍与简化 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 终端里的单仓库改码助手，一轮对话改 1 到 3 个文件 | 请求处理流程、工具系统实现 | Node.js + TypeScript CLI，流式输出，工具循环上限 8 轮 | 循环必须有硬上限，否则单次请求的成本与耗时不可控 |
| 后台管理系统的万行表格，用 agent 生成增删改查代码 | 核心模块与职责、工具系统实现 | 编辑器插件 + 只读工具（read、grep）+ 补丁工具 | 先只开只读工具，写入工具按目录白名单逐级放开 |
| 低端安卓首屏加载排查，agent 读构建产物与网络日志 | 状态管理机制、扩展机制 | MCP server 暴露日志查询，会话内只保留最近 N 轮 | 大日志先截断再进上下文，避免 token 一次打满 |
| 多人协作白板的前端仓库，agent 处理合并冲突 | 请求处理流程、关键设计模式 | CLI + git 工具 + 会话快照 | 冲突解决后先跑测试再提交，不允许直接 push |
| CI 流水线里由 PR 触发的自动修复机器人 | 项目结构分析、状态管理机制 | 无状态容器，每个 PR 独立会话目录 | 会话不能跨 PR 复用，否则上下文互相污染 |
| 金融内网代码问答，每一次工具调用都要留痕 | 工具系统实现、扩展机制 | 自建工具网关 + 审计日志 | 工具参数要落盘，权限校验放服务端而不是模型侧 |
| 编辑器内结对编程插件，用户在编辑区直接看 diff | 状态管理机制、关键设计模式 | 编辑器扩展 + 事件流 | UI 状态与 agent 状态分开存，避免回放错乱 |
| 内存 2GB 的开发容器里跑 agent | 项目结构分析、扩展机制 | 按需加载工具模块，重活放远端执行 | 裁剪模块后要回归核心路径的测试用例 |

### 三个场景拆解

#### 场景 1：终端里的单仓库改码助手

**业务背景**：用户在终端发起一条改码任务，希望 agent 自己找文件、改文件、跑测试。仓库规模可用 `git ls-files | wc -l` 量出，从几十个文件到几千个文件都有人用这种方式。

**怎么用本页知识解决**：思路是把"模型决策"和"工具执行"拆成两个边界清晰的环节，循环只负责转发消息，权限校验独立成函数，这样任意一环出问题都能单独替换。

```ts
// 伪代码：请求处理循环，工具调用轮数到上限就停
const MAX_ROUNDS = 8;                       // 硬上限，防住工具调用失控
let messages = [{ role: "user", content: task }];

for (let round = 0; round < MAX_ROUNDS; round++) {
  const res = await model.stream({ messages, tools });  // 流式返回，边到边显示
  const calls = collectToolCalls(res);      // 收集本轮模型想调用的工具
  if (calls.length === 0) break;            // 没有工具调用，说明模型给了结论
  for (const call of calls) {
    if (!allow(call.name, call.args)) {     // 权限校验：目录白名单 + 只读/可写分级
      messages.push(denyResult(call));      // 拒绝也要回灌，让模型换方案而不是卡死
      continue;
    }
    messages.push(await run(call));         // 执行工具，结果作为下一条消息
  }
}
```

- `MAX_ROUNDS` 是成本闸门，取值按"典型任务需要几轮"定，先用 8 轮跑一批任务再调。
- `allow()` 把权限做成纯函数，输入是工具名和参数，输出是布尔值，方便单测覆盖。
- 拒绝路径必须回灌结果，否则模型会重复发起同一次调用，把轮数耗光。
- `run()` 的返回值要带截断，工具输出超过阈值时只回传头部和尾部。

**怎么度量收益**：看三个指标——单任务工具调用轮数、超限退出率、补丁被采纳率。测量方法是在循环里把轮数打到 stdout，用 `jq` 汇总；或按 OpenTelemetry 的 span 结构上报，接进现有 APM。

**什么时候不该用**：任务要跨 20 个以上文件做重构时，8 轮上限会把任务截在半路，应改成按阶段拆成多次人工确认。生产环境的机器上不要开可写工具，只留只读工具做诊断。

#### 场景 2：长会话的日志排障助手

**业务背景**：一次排障对话会持续几十轮，中间夹杂大量日志片段和命令输出。上下文体量增长的速度由每轮注入的字符数量决定，可用 `wc -c` 记录每轮追加的字节数来估。

**怎么用本页知识解决**：思路是把会话状态当成一个受预算约束的列表，每轮结束做一次裁剪，系统提示固定保留，最新的对话优先保留，被挤掉的部分压成一条摘要。

```ts
// 伪代码：每轮之后按 token 预算裁剪会话状态
type Turn = { role: string; content: string; tokens: number };

function compact(turns: Turn[], budget: number): Turn[] {
  const pinned = turns.filter(t => t.role === "system");  // 系统提示永远保留
  const rest = turns.filter(t => t.role !== "system");
  let used = sumTokens(pinned);
  const kept: Turn[] = [];
  for (let i = rest.length - 1; i >= 0; i--) {            // 从最新往回留
    if (used + rest[i].tokens > budget) break;
    kept.unshift(rest[i]);
    used += rest[i].tokens;
  }
  const dropped = rest.slice(0, rest.length - kept.length);
  if (dropped.length > 0) kept.unshift(summarize(dropped));  // 挤掉的部分压成摘要
  return [...pinned, ...kept];
}
```

- `pinned` 与 `rest` 分开处理，避免裁剪把系统提示挤掉导致行为不稳定。
- 裁剪方向从最新往回，符合排障场景"最近输出最相关"的分布。
- `summarize()` 本身要花一次模型调用，所以只在真正发生丢弃时才触发。
- `tokens` 在写入时就算好并缓存，不要每次裁剪重算整段。

**怎么度量收益**：看上下文 token 占用峰值、摘要触发次数、以及答案需要引用早期信息时的错误率。前两项在本地打点统计，第三项靠固定题集回归：准备 20 条需要回溯早期日志的问题，每次改动后跑一遍看通过数。

**什么时候不该用**：合规场景要求逐字引用原始日志时不要启用摘要，压缩后的文本无法作为证据。会话长度还没到预算时也不要开，白花一次摘要调用。

#### 场景 3：企业内网代码检索接入 agent

**业务背景**：团队希望 agent 能查私有仓库，但不允许它直接读写文件系统。仓库分多个权限域，可用 `git ls-files | wc -l` 按域分别量出规模。

**怎么用本页知识解决**：思路是把检索能力做成独立进程，通过扩展机制暴露给 agent，工具 schema、鉴权、脱敏都在这个进程里完成。

```ts
// 伪代码：MCP server 暴露一个只读检索工具
server.tool({
  name: "search_code",                   // 工具名，模型据此决定何时调用
  description: "在指定私有仓库中按关键词检索代码片段，只读",  // 描述写清边界，影响调用准确率
  inputSchema: {                         // 入参 schema，模型按此生成参数
    type: "object",
    properties: { q: { type: "string" }, repo: { type: "string" } },
    required: ["q"],
  },
  handler: async ({ q, repo }) => {      // 鉴权放服务端，不能靠模型自律
    const hits = await index.search(q, { repo, limit: 10 });
    return hits.map(redact);             // 返回前脱敏，密钥与个人信息不进上下文
  },
});
```

- 工具描述里写明"只读"，能减少模型发起写入类调用的次数。
- `inputSchema` 用 `required` 收窄必填项，参数缺字段的失败会明显下降。
- `redact()` 放在 handler 内部，保证任何调用方拿到的都是脱敏结果。
- `limit` 固定上限，避免一次检索把大量代码片段灌进上下文。

**怎么度量收益**：看调用成功率、参数校验失败率、检索命中被采纳进最终回答的比例。前两项由 server 记录日志统计，第三项靠人工标注固定的一批问题。

**什么时候不该用**：需要改代码时不要用只读检索 server，能力边界对不上。检索 P99 延迟超过 5 秒时不要放进同步工具循环，改成异步任务加轮询。

### 行业先进实践

Model Context Protocol 规范（出处：MCP 官方文档）。做法是用 JSON-RPC 统一暴露工具、资源与提示模板，客户端一次接入即可复用多个 server。有效的原因是工具契约与传输解耦，鉴权留在 server 侧。借鉴方式是把内部检索、构建、发布能力各写成一个独立 server，agent 只持有工具名列表。

Building effective agents（出处：Anthropic 官方工程博客同名文章）。做法是先判断任务能否用固定工作流解决，只有需要动态决策时才引入自主循环。有效的原因是固定流程的失败模式可枚举，成本上限可预算。借鉴方式是把本文场景 1 的循环留给探索型任务，把格式化、跑测试做成工作流节点。

LangGraph 的持久化与 checkpointer（出处：LangGraph 官方文档 Persistence 相关章节）。做法是在每个节点执行后保存状态快照，支持中断后从中断点恢复。有效的原因是长任务不必一次跑完，失败重试的代价被压到单节点。借鉴方式是把会话状态落盘为 JSON，重启后从最近快照续跑。

OpenTelemetry 的生成式 AI 语义约定（出处：OpenTelemetry 官方文档 Semantic Conventions）。需核对官方文档：span 命名规则、属性键名、以及当前处于哪个稳定性等级。借鉴方式是先按自己的字段名打点，等约定稳定后再做字段映射，避免过早绑定。

Aider 的 git 集成（出处：Aider 开源项目文档）。做法是每次改动后自动生成一次提交，改动历史与代码历史对齐。有效的原因是回退粒度细，审阅时能逐个提交看。借鉴方式是在 agent 执行写操作前先建分支或 stash，工具失败时用 `git checkout` 回到干净状态。

### 从学到用：落地路线

第 1 步：试点。选一个仓库、一个只读场景（例如代码检索问答），把工具循环上限设为 8 轮。验收标准：连续跑 30 个真实问题，全部能在 8 轮内返回结果，且没有一次触发权限拒绝之外的异常退出。

第 2 步：验证。对同一批问题分别用"无工具"和"带工具"两种配置跑一遍，记录工具轮数、token 占用、回答被采纳数。验收标准：指标有落盘记录，能画出两次运行的对照结果。

第 3 步：推广。把工具 schema、权限函数、会话裁剪抽成独立包，接入第二个场景。验收标准：新场景只添加配置不改动循环代码，且第 2 步的回归题集全部通过。

第 4 步：防回退。把回归题集接进 CI，每次改动工具或提示词都跑一遍。验收标准：通过数下降时 CI 失败并给出是哪几条题集退化。

### 动手作业

**目标**：做一个只读的代码问答 agent，具备工具循环上限、权限校验和会话裁剪，并能输出度量数据。

**步骤**：

1. 选一个本地仓库，用 `git ls-files | wc -l` 记录文件数，作为后续回归的固定输入。
2. 定义两个工具：一个按关键词检索文件内容，一个按路径读取指定行范围，两者都只读。
3. 写出 `allow(name, args)` 权限函数，规则是路径必须在仓库根目录内，越界一律拒绝。
4. 按场景 1 的伪代码实现请求循环，把 `MAX_ROUNDS` 设为 8，把每轮的轮数、工具名、耗时打到日志。
5. 按场景 2 的伪代码实现 `compact()`，预算先设成一个固定值，记录摘要触发次数。
6. 准备 20 个问题，跑两遍：一遍带工具，一遍不带工具，把日志存成两份文件。
7. 写一个统计脚本，从日志里算出平均轮数、超限次数、token 峰值。

**验收标准**：

1. 20 个问题全部有返回结果，没有进程崩溃或死循环。
2. 越界路径的调用被拒绝，且拒绝记录能在日志里查到对应的工具名和参数。
3. 摘要触发次数与 token 峰值出现在统计脚本的输出里，数值可复现。
4. 带工具与不带工具两份日志的对照结果能说明工具是否带来帮助。
5. `MAX_ROUNDS` 从 8 改成 3 后重跑，能观察到超限退出次数上升，说明上限确实在起作用。

