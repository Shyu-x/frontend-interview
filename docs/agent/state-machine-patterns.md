# Agent 状态机与编排模式

本文档涵盖 Agent 状态机设计、任务编排系统、并行执行模式及错误恢复策略。

---

## 1. 状态机基础

### 1.1 状态定义

状态机由有限状态集合和状态转换规则组成。

```typescript
// 状态定义
type State = string;
type Event = string;
type TransitionFn = (context: Context) => State | Promise<State>;

// 基础状态机接口
interface StateMachine<S extends string, E extends string> {
  getState(): S;
  transition(event: E): Promise<void>;
  onTransition(from: S, to: S, handler: () => void): void;
}

// 上下文对象
interface StateContext {
  agentId: string;
  taskId: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}
```

### 1.2 状态转换规则

```typescript
// 转换规则定义
interface TransitionRule<S extends string, E extends string> {
  from: S | '*';           // '*' 表示任意状态
  event: E;
  to: S;
  condition?: (ctx: StateContext) => boolean;
  guard?: string;          // 守卫名称
}

// 规则表
const rules: TransitionRule<string, string>[] = [
  { from: 'idle', event: 'start', to: 'running' },
  { from: 'running', event: 'pause', to: 'paused' },
  { from: 'paused', event: 'resume', to: 'running' },
  { from: 'running', event: 'complete', to: 'completed' },
  { from: 'running', event: 'error', to: 'failed' },
  { from: '*', event: 'abort', to: 'aborted' },
];
```

### 1.3 状态机实现模式

```typescript
// 状态机工厂
class StateMachineBuilder<S extends string, E extends string> {
  private states: Set<S> = new Set();
  private transitions: Map<string, TransitionRule<S, E>> = new Map();
  private handlers: Map<string, Array<() => void | Promise<void>>> = new Map();

  state(s: S): this {
    this.states.add(s);
    return this;
  }

  transition(from: S, event: E, to: S, guard?: string): this {
    const key = `${from}:${event}`;
    this.transitions.set(key, { from, event, to, guard });
    return this;
  }

  onTransition(from: S | '*', to: S, handler: () => void | Promise<void>): this {
    const key = `${from}:*:${to}`;
    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }
    this.handlers.get(key)!.push(handler);
    return this;
  }

  build(initialState: S): StateMachine<S, E> {
    return new StateMachineImpl(this.states, this.transitions, this.handlers, initialState);
  }
}

class StateMachineImpl<S extends string, E extends string> implements StateMachine<S, E> {
  private currentState: S;
  private states: Set<S>;
  private transitions: Map<string, TransitionRule<S, E>>;
  private handlers: Map<string, Array<() => void | Promise<void>>>;

  constructor(
    states: Set<S>,
    transitions: Map<string, TransitionRule<S, E>>,
    handlers: Map<string, Array<() => void | Promise<void>>>,
    initialState: S
  ) {
    this.states = states;
    this.transitions = transitions;
    this.handlers = handlers;
    this.currentState = initialState;
  }

  getState(): S {
    return this.currentState;
  }

  async transition(event: E): Promise<void> {
    const key = `${this.currentState}:${event}`;
    const wildcardKey = `*:${event}`;
    
    const rule = this.transitions.get(key) || this.transitions.get(wildcardKey);
    
    if (!rule) {
      throw new Error(`No transition for event '${event}' from state '${this.currentState}'`);
    }

    if (rule.condition && !rule.condition({} as StateContext)) {
      throw new Error(`Guard condition failed for transition ${this.currentState} --[${event}]--> ${rule.to}`);
    }

    const fromState = this.currentState;
    this.currentState = rule.to;

    // 触发 handlers
    const handlers = this.handlers.get(`${fromState}:*:${rule.to}`) || [];
    for (const handler of handlers) {
      await handler();
    }
  }
}
```

---

## 2. Agent 状态机实现

### 2.1 Agent 状态定义

```typescript
// Agent 生命周期状态
enum AgentState {
  IDLE = 'idle',           // 空闲，等待任务
  THINKING = 'thinking',    // 思考中，分析任务
  EXECUTING = 'executing',  // 执行中，调用工具
  WAITING = 'waiting',     // 等待中，等待外部响应
  COMPLETED = 'completed', // 已完成
  ERROR = 'error',         // 错误状态
  PAUSED = 'paused',       // 暂停
  TERMINATED = 'terminated' // 已终止
}

// Agent 事件
enum AgentEvent {
  START = 'start',
  THINK = 'think',
  EXECUTE = 'execute',
  WAIT = 'wait',
  RESUME = 'resume',
  COMPLETE = 'complete',
  FAIL = 'fail',
  ABORT = 'abort',
  RETRY = 'retry',
  RESET = 'reset'
}
```

### 2.2 状态转换图

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
┌──────┐  start  ┌─────────┐  think  ┌─────────┐  execute ┌──────────┐
│ idle │ ──────▶ │ thinking │ ──────▶ │ executing│ ────────▶ │ waiting │
└──────┘         └─────────┘         └──────────┘          └────┬─────┘
                                                               │
    ┌───────────────────────────────────────────┐              │
    │                                           │              │
    │         resume                             │              │
    │                                           ▼              │
    │              ┌──────────┐  complete   ┌───────────┐      │
    └─────────────▶│  paused  │ ◀───────────│  waiting  │──────┘
                   └──────────┘             └───────────┘
                       │                         ▲
                       │                         │
                       │                    wait for
                       │                   external event
                       │
                       ▼
                ┌───────────┐   fail   ┌─────────┐
                │ completed │ ◀──────── │ error   │
                └───────────┘           └─────────┘
                                            │
                                            ▼
              ┌───────────┐  reset   ┌──────┐
              │ aborted   │ ──────▶ │ idle │
              └───────────┘          └──────┘
```

### 2.3 Agent 状态机实现

```typescript
interface AgentContext {
  id: string;
  task: Task;
  tools: Tool[];
  memory: Memory;
  metadata: Record<string, unknown>;
}

class AgentStateMachine {
  private state: AgentState;
  private context: AgentContext;
  private listeners: Map<AgentEvent, Array<(ctx: AgentContext) => void>> = new Map();
  private history: Array<{ state: AgentState; event: AgentEvent; timestamp: number }> = [];

  constructor(context: AgentContext, initialState = AgentState.IDLE) {
    this.context = context;
    this.state = initialState;
  }

  getState(): AgentState {
    return this.state;
  }

  async handleEvent(event: AgentEvent): Promise<void> {
    const transition = this.getTransition(event);
    
    if (!transition) {
      console.warn(`No transition for ${event} from state ${this.state}`);
      return;
    }

    const fromState = this.state;
    await transition(this.context);
    this.state = this.getNextState(event);
    
    this.history.push({
      state: this.state,
      event,
      timestamp: Date.now()
    });

    this.notifyListeners(event);
  }

  private getTransition(event: AgentEvent): ((ctx: AgentContext) => Promise<void>) | null {
    const transitions: Record<AgentState, Partial<Record<AgentEvent, () => Promise<void>>>> = {
      [AgentState.IDLE]: {
        [AgentEvent.START]: async (ctx) => {
          ctx.metadata.startTime = Date.now();
        }
      },
      [AgentState.THINKING]: {
        [AgentEvent.EXECUTE]: async (ctx) => {
          // 执行工具调用
        }
      },
      [AgentState.EXECUTING]: {
        [AgentEvent.WAIT]: async (ctx) => {
          ctx.metadata.waitStart = Date.now();
        },
        [AgentEvent.COMPLETE]: async (ctx) => {
          delete ctx.metadata.waitStart;
        },
        [AgentEvent.FAIL]: async (ctx) => {
          ctx.metadata.errorTime = Date.now();
        }
      },
      [AgentState.WAITING]: {
        [AgentEvent.RESUME]: async (ctx) => {
          delete ctx.metadata.waitStart;
        }
      },
      [AgentState.PAUSED]: {
        [AgentEvent.RESET]: async (ctx) => {
          ctx.metadata = {};
        }
      },
      [AgentState.ERROR]: {
        [AgentEvent.RETRY]: async (ctx) => {
          ctx.metadata.retryCount = (ctx.metadata.retryCount || 0) + 1;
        },
        [AgentEvent.RESET]: async (ctx) => {
          ctx.metadata = {};
        }
      }
    };

    return transitions[this.state]?.[event]?.bind(null, this.context) || null;
  }

  private getNextState(event: AgentEvent): AgentState {
    const stateMap: Record<string, AgentState> = {
      'idle:start': AgentState.THINKING,
      'thinking:execute': AgentState.EXECUTING,
      'executing:wait': AgentState.WAITING,
      'executing:complete': AgentState.COMPLETED,
      'executing:fail': AgentState.ERROR,
      'waiting:resume': AgentState.EXECUTING,
      'waiting:complete': AgentState.COMPLETED,
      'error:retry': AgentState.THINKING,
      'error:reset': AgentState.IDLE,
      'paused:resume': AgentState.THINKING,
      '*:abort': AgentState.TERMINATED
    };

    return stateMap[`${this.state}:${event}`] || this.state;
  }

  on(event: AgentEvent, handler: (ctx: AgentContext) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  private notifyListeners(event: AgentEvent): void {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(handler => handler(this.context));
  }

  getHistory(): Array<{ state: AgentState; event: AgentEvent; timestamp: number }> {
    return [...this.history];
  }
}
```

### 2.4 状态持久化

```typescript
interface PersistedAgentState {
  agentId: string;
  state: AgentState;
  context: AgentContext;
  history: Array<{ state: AgentState; event: AgentEvent; timestamp: number }>;
  version: number;
}

class AgentStatePersistence {
  private storage: Map<string, PersistedAgentState> = new Map();

  async save(agent: AgentStateMachine): Promise<void> {
    const state: PersistedAgentState = {
      agentId: agent['context'].id,
      state: agent.getState(),
      context: agent['context'],
      history: agent.getHistory(),
      version: Date.now()
    };
    this.storage.set(state.agentId, state);
  }

  async load(agentId: string): Promise<AgentStateMachine | null> {
    const state = this.storage.get(agentId);
    if (!state) return null;

    return new AgentStateMachine(state.context, state.state);
  }

  async checkpoint(agentId: string): Promise<string> {
    const state = this.storage.get(agentId);
    return JSON.stringify(state);
  }

  async restore(checkpoint: string): Promise<AgentStateMachine> {
    const state: PersistedAgentState = JSON.parse(checkpoint);
    return new AgentStateMachine(state.context, state.state);
  }
}
```

---

## 3. 任务编排系统

### 3.1 任务队列

```typescript
interface Task {
  id: string;
  type: string;
  priority: number;
  payload: unknown;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

class TaskQueue {
  private queue: PriorityQueue<Task>;
  private running: Map<string, Task> = new Map();
  private completed: Map<string, Task> = new Map();
  private failed: Map<string, Task> = new Map();

  constructor() {
    this.queue = new PriorityQueue<Task>((a, b) => b.priority - a.priority);
  }

  enqueue(task: Task): void {
    if (task.dependencies.length > 0) {
      // 检查依赖是否满足
      const depsSatisfied = task.dependencies.every(depId => {
        const dep = this.completed.get(depId);
        return dep?.status === 'completed';
      });
      if (!depsSatisfied) {
        // 延迟入队
        this.scheduleDependencyCheck(task);
        return;
      }
    }
    this.queue.push(task);
  }

  dequeue(): Task | undefined {
    return this.queue.pop();
  }

  async scheduleDependencyCheck(task: Task): Promise<void> {
    const checkInterval = setInterval(() => {
      const depsSatisfied = task.dependencies.every(depId => {
        return this.completed.has(depId);
      });
      if (depsSatisfied) {
        clearInterval(checkInterval);
        this.queue.push(task);
      }
    }, 1000);
  }

  markRunning(taskId: string, task: Task): void {
    task.status = 'running';
    task.startedAt = Date.now();
    this.running.set(taskId, task);
  }

  markCompleted(taskId: string): void {
    const task = this.running.get(taskId);
    if (task) {
      task.status = 'completed';
      task.completedAt = Date.now();
      this.running.delete(taskId);
      this.completed.set(taskId, task);
    }
  }

  markFailed(taskId: string, error: Error): void {
    const task = this.running.get(taskId);
    if (task) {
      task.retryCount++;
      if (task.retryCount < task.maxRetries) {
        // 重试
        task.status = 'pending';
        this.running.delete(taskId);
        this.queue.push(task);
      } else {
        task.status = 'failed';
        this.running.delete(taskId);
        this.failed.set(taskId, task);
      }
    }
  }

  getStats(): { pending: number; running: number; completed: number; failed: number } {
    return {
      pending: this.queue.size(),
      running: this.running.size,
      completed: this.completed.size,
      failed: this.failed.size
    };
  }
}

// 优先级队列实现
class PriorityQueue<T> {
  private items: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  push(item: T): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  size(): number {
    return this.items.length;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.comparator(this.items[index], this.items[parent]) <= 0) break;
      [this.items[index], this.items[parent]] = [this.items[parent], this.items[index]];
      index = parent;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (left < this.items.length && this.comparator(this.items[left], this.items[smallest]) < 0) {
        smallest = left;
      }
      if (right < this.items.length && this.comparator(this.items[right], this.items[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === index) break;
      [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
      index = smallest;
    }
  }
}
```

### 3.2 优先级调度

```typescript
interface SchedulerConfig {
  maxConcurrent: number;
  priorityBoost?: (task: Task) => number;
  timeSlice?: number;
}

class PriorityScheduler {
  private queue: TaskQueue;
  private config: SchedulerConfig;
  private running: Set<string> = new Set();
  private scheduler: NodeJS.Timeout | null = null;

  constructor(queue: TaskQueue, config: SchedulerConfig) {
    this.queue = queue;
    this.config = config;
  }

  start(executor: (task: Task) => Promise<void>): void {
    this.scheduler = setInterval(() => {
      this.scheduleNext(executor);
    }, this.config.timeSlice || 100);
  }

  stop(): void {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
  }

  private async scheduleNext(executor: (task: Task) => Promise<void>): Promise<void> {
    if (this.running.size >= this.config.maxConcurrent) {
      return;
    }

    const task = this.queue.dequeue();
    if (!task) return;

    const taskId = task.id;
    this.running.add(taskId);
    this.queue.markRunning(taskId, task);

    try {
      await executor(task);
      this.queue.markCompleted(taskId);
    } catch (error) {
      this.queue.markFailed(taskId, error as Error);
    } finally {
      this.running.delete(taskId);
    }
  }

  // 优先级提升
  boostPriority(taskId: string, boost: number): void {
    // 重新计算优先级并调整队列位置
  }
}
```

### 3.3 依赖管理

```typescript
class DependencyGraph {
  private adjacencyList: Map<string, Set<string>> = new Map();
  private inDegree: Map<string, number> = new Map();

  addNode(taskId: string): void {
    if (!this.adjacencyList.has(taskId)) {
      this.adjacencyList.set(taskId, new Set());
      this.inDegree.set(taskId, 0);
    }
  }

  addEdge(from: string, to: string): void {
    this.addNode(from);
    this.addNode(to);
    
    const neighbors = this.adjacencyList.get(from)!;
    if (!neighbors.has(to)) {
      neighbors.add(to);
      this.inDegree.set(to, (this.inDegree.get(to) || 0) + 1);
    }
  }

  // 拓扑排序 (Kahn 算法)
  topologicalSort(): string[] {
    const result: string[] = [];
    const queue: string[] = [];
    const inDegreeCopy = new Map(this.inDegree);

    // 入度为 0 的节点入队
    for (const [node, degree] of inDegreeCopy) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = this.adjacencyList.get(current) || new Set();
      for (const neighbor of neighbors) {
        const newDegree = (inDegreeCopy.get(neighbor) || 0) - 1;
        inDegreeCopy.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // 检测循环依赖
    if (result.length !== this.adjacencyList.size) {
      throw new Error('Circular dependency detected');
    }

    return result;
  }

  // 获取直接依赖
  getDependencies(taskId: string): string[] {
    return Array.from(this.adjacencyList.get(taskId) || []);
  }

  // 获取反向依赖 (哪些任务依赖此任务)
  getDependents(taskId: string): string[] {
    const dependents: string[] = [];
    for (const [node, neighbors] of this.adjacencyList) {
      if (neighbors.has(taskId)) {
        dependents.push(node);
      }
    }
    return dependents;
  }

  // 检测循环依赖
  hasCycle(): boolean {
    try {
      this.topologicalSort();
      return false;
    } catch {
      return true;
    }
  }
}
```

### 3.4 异常恢复

```typescript
interface RecoveryStrategy {
  maxRetries: number;
  backoffMs: number;
  exponentialBackoff?: boolean;
  fallbackTask?: string;
}

class TaskRecoveryManager {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private retryCount: Map<string, number> = new Map();

  registerStrategy(taskType: string, strategy: RecoveryStrategy): void {
    this.strategies.set(taskType, strategy);
  }

  async recover(task: Task, error: Error): Promise<'retry' | 'skip' | 'fallback' | 'abort'> {
    const strategy = this.strategies.get(task.type) || {
      maxRetries: 3,
      backoffMs: 1000
    };

    const currentRetry = this.retryCount.get(task.id) || 0;

    if (currentRetry >= strategy.maxRetries) {
      if (strategy.fallbackTask) {
        return 'fallback';
      }
      return 'abort';
    }

    this.retryCount.set(task.id, currentRetry + 1);

    // 等待后重试
    const delay = strategy.exponentialBackoff
      ? strategy.backoffMs * Math.pow(2, currentRetry)
      : strategy.backoffMs;

    await this.sleep(delay);
    return 'retry';
  }

  reset(taskId: string): void {
    this.retryCount.delete(taskId);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 4. 并行与串行

### 4.1 并行工具执行

```typescript
interface Tool {
  name: string;
  execute: (params: unknown) => Promise<unknown>;
}

class ParallelExecutor {
  async executeAll(tools: Tool[], paramsList: unknown[]): Promise<unknown[]> {
    const promises = tools.map((tool, index) => 
      tool.execute(paramsList[index]).catch(error => ({ error: error.message }))
    );
    return Promise.all(promises);
  }

  async executeWithLimit(
    tools: Tool[],
    paramsList: unknown[],
    limit: number
  ): Promise<unknown[]> {
    const results: unknown[] = [];
    
    for (let i = 0; i < tools.length; i += limit) {
      const batch = tools.slice(i, i + limit);
      const paramsBatch = paramsList.slice(i, i + limit);
      
      const batchResults = await Promise.all(
        batch.map((tool, j) => 
          tool.execute(paramsBatch[j]).catch(error => ({ error: error.message }))
        )
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }
}

// 并行执行工具示例
async function parallelToolExecution() {
  const executor = new ParallelExecutor();
  
  const tools: Tool[] = [
    { name: 'search', execute: async (q) => search(q) },
    { name: 'fetch', execute: async (url) => fetch(url) },
    { name: 'parse', execute: async (data) => parse(data) }
  ];
  
  const params = ['query1', 'http://example.com', '{ "data": 123 }'];
  
  const results = await executor.executeAll(tools, params);
  // 所有工具同时执行
}
```

### 4.2 串行工具执行

```typescript
class SequentialExecutor {
  async executeChain(
    tools: Tool[],
    initialInput: unknown
  ): Promise<unknown> {
    let result = initialInput;
    
    for (const tool of tools) {
      result = await tool.execute(result);
    }
    
    return result;
  }

  async executeWithValidation(
    tools: Tool[],
    input: unknown,
    validator: (result: unknown, tool: Tool) => boolean
  ): Promise<{ success: boolean; results: unknown[]; failedAt?: number }> {
    const results: unknown[] = [];
    let currentInput = input;
    
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      try {
        const result = await tool.execute(currentInput);
        
        if (!validator(result, tool)) {
          return { success: false, results, failedAt: i };
        }
        
        results.push(result);
        currentInput = result;
      } catch (error) {
        return { success: false, results, failedAt: i };
      }
    }
    
    return { success: true, results };
  }
}

// 串行执行示例
async function sequentialToolExecution() {
  const executor = new SequentialExecutor();
  
  const pipeline = [
    { name: 'validate', execute: async (input) => validateInput(input) },
    { name: 'transform', execute: async (input) => transformData(input) },
    { name: 'enrich', execute: async (input) => enrichData(input) },
    { name: 'store', execute: async (input) => storeData(input) }
  ];
  
  const finalResult = await executor.executeChain(pipeline, userInput);
}
```

### 4.3 混合编排

```typescript
interface ExecutionPlan {
  type: 'parallel' | 'sequential' | 'conditional';
  tasks: (Tool | ExecutionPlan)[];
  condition?: (context: unknown) => boolean;
}

class HybridOrchestrator {
  private executor = new ParallelExecutor();
  private sequential = new SequentialExecutor();

  async execute(plan: ExecutionPlan, context: unknown): Promise<unknown> {
    switch (plan.type) {
      case 'parallel':
        return this.executeParallel(plan.tasks as Tool[], context);
      
      case 'sequential':
        return this.executeSequential(plan.tasks as Tool[], context);
      
      case 'conditional':
        if (plan.condition?.(context)) {
          return this.execute(plan.tasks[0] as ExecutionPlan, context);
        }
        return null;
      
      default:
        throw new Error(`Unknown execution type: ${plan.type}`);
    }
  }

  private async executeParallel(tools: Tool[], context: unknown): Promise<unknown[]> {
    const params = tools.map(() => context);
    return this.executor.executeAll(tools, params);
  }

  private async executeSequential(tools: Tool[], context: unknown): Promise<unknown> {
    return this.sequential.executeChain(tools, context);
  }

  // 条件并行：满足条件的任务并行执行
  async executeConditionalParallel(
    tools: Tool[],
    condition: (tool: Tool) => boolean,
    context: unknown
  ): Promise<unknown[]> {
    const parallelTools = tools.filter(condition);
    const sequentialTools = tools.filter(t => !condition(t));
    
    const parallelResults = await this.executor.executeAll(
      parallelTools, 
      parallelTools.map(() => context)
    );
    
    const sequentialResult = await this.sequential.executeChain(
      sequentialTools,
      context
    );
    
    return [...parallelResults, sequentialResult];
  }
}

// 混合编排示例
async function hybridExecution() {
  const orchestrator = new HybridOrchestrator();
  
  const plan: ExecutionPlan = {
    type: 'sequential',
    tasks: [
      // 第一步：并行获取数据
      {
        type: 'parallel',
        tasks: [
          { name: 'fetchUser', execute: async (id) => fetchUser(id) },
          { name: 'fetchPermissions', execute: async (id) => fetchPermissions(id) }
        ]
      },
      // 第二步：处理数据
      {
        type: 'conditional',
        tasks: [
          {
            type: 'sequential',
            tasks: [
              { name: 'process', execute: async (data) => processData(data) },
              { name: 'validate', execute: async (data) => validateResult(data) }
            ]
          }
        ],
        condition: (ctx) => ctx.needsValidation === true
      },
      // 第三步：存储
      { name: 'store', execute: async (data) => storeData(data) }
    ]
  };
  
  await orchestrator.execute(plan, { userId: '123', needsValidation: true });
}
```

### 4.4 拓扑排序执行

```typescript
class TopologicalExecutor {
  async executeWithDependencies(
    tasks: Map<string, Tool>,
    dependencies: Map<string, string[]>
  ): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();
    const graph = new DependencyGraph();
    
    // 构建依赖图
    for (const [taskId] of tasks) {
      graph.addNode(taskId);
      const deps = dependencies.get(taskId) || [];
      for (const dep of deps) {
        graph.addEdge(dep, taskId);
      }
    }
    
    // 获取执行顺序
    const order = graph.topologicalSort();
    
    // 按顺序执行
    for (const taskId of order) {
      const tool = tasks.get(taskId);
      if (!tool) continue;
      
      // 等待依赖完成
      const deps = dependencies.get(taskId) || [];
      const depResults = deps.map(dep => results.get(dep));
      
      // 执行任务，传入依赖结果
      const result = await tool.execute(depResults);
      results.set(taskId, result);
    }
    
    return results;
  }
}

// 拓扑排序执行示例
async function topologicalExecution() {
  const executor = new TopologicalExecutor();
  
  const tasks = new Map([
    ['fetch', { name: 'fetch', execute: async () => fetchData() }],
    ['parse', { name: 'parse', execute: async () => parseData() }],
    ['transform', { name: 'transform', execute: async () => transformData() }],
    ['store', { name: 'store', execute: async () => storeData() }]
  ]);
  
  const dependencies = new Map([
    ['fetch', []],                          // 无依赖
    ['parse', ['fetch']],                   // 依赖 fetch
    ['transform', ['parse']],              // 依赖 parse
    ['store', ['transform', 'fetch']]       // 依赖 transform 和 fetch
  ]);
  
  // 执行顺序: fetch -> parse -> transform -> store
  const results = await executor.executeWithDependencies(tasks, dependencies);
}
```

---

## 5. 回调与事件

### 5.1 事件系统

```typescript
type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

interface EventSubscription {
  id: string;
  event: string;
  handler: EventHandler;
  priority: number;
  once: boolean;
}

class EventEmitter {
  private handlers: Map<string, EventSubscription[]> = new Map();
  private wildcardHandlers: Array<{
    pattern: RegExp;
    subscription: EventSubscription;
  }> = [];
  private eventHistory: Map<string, unknown[]> = new Map();

  on<T>(event: string, handler: EventHandler<T>, priority = 0): string {
    const id = this.generateId();
    const subscription: EventSubscription = {
      id,
      event,
      handler: handler as EventHandler,
      priority,
      once: false
    };
    
    this.addSubscription(event, subscription);
    return id;
  }

  once<T>(event: string, handler: EventHandler<T>, priority = 0): string {
    const id = this.generateId();
    const subscription: EventSubscription = {
      id,
      event,
      handler: handler as EventHandler,
      priority,
      once: true
    };
    
    this.addSubscription(event, subscription);
    return id;
  }

  off(subscriptionId: string): void {
    for (const [event, subs] of this.handlers) {
      const index = subs.findIndex(s => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        break;
      }
    }
  }

  async emit<T>(event: string, payload: T): Promise<void> {
    // 记录历史
    if (!this.eventHistory.has(event)) {
      this.eventHistory.set(event, []);
    }
    this.eventHistory.get(event)!.push(payload);
    
    const subscriptions = this.handlers.get(event) || [];
    
    // 按优先级排序
    subscriptions.sort((a, b) => b.priority - a.priority);
    
    const toRemove: string[] = [];
    
    for (const sub of subscriptions) {
      try {
        await sub.handler(payload);
        if (sub.once) {
          toRemove.push(sub.id);
        }
      } catch (error) {
        console.error(`Event handler error for '${event}':`, error);
      }
    }
    
    // 移除一次性订阅
    for (const id of toRemove) {
      this.off(id);
    }
    
    // 触发通配符匹配
    for (const { pattern, subscription } of this.wildcardHandlers) {
      if (pattern.test(event)) {
        await subscription.handler(payload);
      }
    }
  }

  onWildcard(pattern: string, handler: EventHandler): string {
    const id = this.generateId();
    this.wildcardHandlers.push({
      pattern: new RegExp(pattern.replace(/\*/g, '.*')),
      subscription: { id, event: pattern, handler, priority: 0, once: false }
    });
    return id;
  }

  private addSubscription(event: string, subscription: EventSubscription): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(subscription);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getHistory(event: string): unknown[] {
    return this.eventHistory.get(event) || [];
  }
}

// 使用示例
const emitter = new EventEmitter();

emitter.on('task:start', (payload: { taskId: string }) => {
  console.log(`Task ${payload.taskId} started`);
});

emitter.on('task:complete', async (payload: { taskId: string; result: unknown }) => {
  await notifyCompletion(payload.taskId);
});

emitter.once('agent:initialized', () => {
  console.log('Agent initialized (will only fire once)');
});

emitter.onWildcard('task:*', (payload) => {
  console.log('All task events:', payload);
});

await emitter.emit('task:start', { taskId: '123' });
```

### 5.2 回调链

```typescript
type MiddlewareFn<T = unknown> = (
  context: T,
  next: () => Promise<void>
) => Promise<void>;

class CallbackChain<T = unknown> {
  private middlewares: MiddlewareFn<T>[] = [];

  use(middleware: MiddlewareFn<T>): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(context: T): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) {
        return;
      }
      const middleware = this.middlewares[index++];
      await middleware(context, next);
    };

    await next();
  }

  // 创建带条件的回调链
  static conditional<C>(
    condition: (ctx: C) => boolean,
    trueChain: CallbackChain<C>,
    falseChain: CallbackChain<C>
  ): MiddlewareFn<C> {
    return async (ctx, next) => {
      if (condition(ctx)) {
        await trueChain.execute(ctx);
      } else {
        await falseChain.execute(ctx);
      }
      await next();
    };
  }
}

// 回调链示例
interface TaskContext {
  taskId: string;
  status: string;
  data: unknown;
}

const loggingChain = new CallbackChain<TaskContext>();
loggingChain.use(async (ctx, next) => {
  console.log(`[${ctx.taskId}] Starting: ${ctx.status}`);
  await next();
  console.log(`[${ctx.taskId}] Finished: ${ctx.status}`);
});

const validationChain = new CallbackChain<TaskContext>();
validationChain.use(async (ctx, next) => {
  if (!ctx.taskId) {
    throw new Error('Task ID is required');
  }
  await next();
});

const processingChain = new CallbackChain<TaskContext>();
processingChain.use(async (ctx, next) => {
  // 实际处理逻辑
  ctx.data = await processTask(ctx.data);
  await next();
});

// 组合回调链
const fullChain = new CallbackChain<TaskContext>();
fullChain.use(loggingChain.middlewares[0]);
fullChain.use(validationChain.middlewares[0]);
fullChain.use(processingChain.middlewares[0]);

await fullChain.execute({ taskId: '123', status: 'processing', data: {} });
```

### 5.3 中间件模式

```typescript
interface MiddlewareContext {
  request: unknown;
  response: unknown;
  state: Record<string, unknown>;
  errors: Error[];
}

interface Middleware {
  name: string;
  priority: number;
  execute: (ctx: MiddlewareContext, next: () => Promise<void>) => Promise<void>;
}

class MiddlewarePipeline {
  private middlewares: Middleware[] = [];

  add(middleware: Middleware): this {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => b.priority - a.priority);
    return this;
  }

  async execute(context: MiddlewareContext): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware.execute(context, next);
      }
    };

    await next();
  }
}

// Agent 中间件示例
const authMiddleware: Middleware = {
  name: 'auth',
  priority: 100,
  execute: async (ctx, next) => {
    const token = ctx.request.headers?.authorization;
    if (!token) {
      ctx.errors.push(new Error('Unauthorized'));
      return;
    }
    ctx.state.user = await validateToken(token);
    await next();
  }
};

const loggingMiddleware: Middleware = {
  name: 'logging',
  priority: 50,
  execute: async (ctx, next) => {
    console.log(`[${ctx.state.user?.id}] ${JSON.stringify(ctx.request)}`);
    await next();
    console.log(`[${ctx.state.user?.id}] Response: ${JSON.stringify(ctx.response)}`);
  }
};

const errorHandlerMiddleware: Middleware = {
  name: 'errorHandler',
  priority: -100,
  execute: async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      ctx.errors.push(error as Error);
      ctx.response = { error: (error as Error).message };
    }
  }
};

const pipeline = new MiddlewarePipeline()
  .add(authMiddleware)
  .add(loggingMiddleware)
  .add(errorHandlerMiddleware);

await pipeline.execute({
  request: { url: '/api/tasks' },
  response: null,
  state: {},
  errors: []
});
```

---

## 6. 错误恢复

### 6.1 重试策略

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

type RetryPredicate = (error: Error) => boolean;

class RetryStrategy {
  private config: RetryConfig;
  private predicates: RetryPredicate[] = [];

  constructor(config: RetryConfig) {
    this.config = config;
  }

  shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.config.maxAttempts) {
      return false;
    }
    return this.predicates.some(pred => pred(error));
  }

  calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.initialDelayMs * 
      Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);
    
    if (this.config.jitter) {
      return Math.random() * cappedDelay;
    }
    
    return cappedDelay;
  }

  addRetryCondition(predicate: RetryPredicate): this {
    this.predicates.push(predicate);
    return this;
  }

  static default(): RetryStrategy {
    return new RetryStrategy({
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitter: true
    });
  }

  static exponential(): RetryStrategy {
    return new RetryStrategy({
      maxAttempts: 5,
      initialDelayMs: 500,
      maxDelayMs: 60000,
      backoffMultiplier: 3,
      jitter: false
    });
  }
}

// 使用重试策略
async function withRetry<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy
): Promise<T> {
  let attempt = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      if (!strategy.shouldRetry(error as Error, attempt)) {
        throw error;
      }
      
      const delay = strategy.calculateDelay(attempt);
      console.log(`Retry attempt ${attempt} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// 使用示例
const retryStrategy = RetryStrategy.exponential()
  .addRetryCondition(error => {
    // 只重试网络错误
    return error.message.includes('network') || error.message.includes('timeout');
  });

const result = await withRetry(
  () => callExternalAPI(),
  retryStrategy
);
```

### 6.2 降级机制

```typescript
interface FallbackConfig {
  primary: () => Promise<unknown>;
  fallback: () => Promise<unknown>;
  timeoutMs?: number;
  condition?: (error: Error) => boolean;
}

class FallbackManager {
  private fallbacks: Map<string, FallbackConfig> = new Map();

  register(name: string, config: FallbackConfig): void {
    this.fallbacks.set(name, config);
  }

  async execute<T>(name: string): Promise<T> {
    const config = this.fallbacks.get(name);
    if (!config) {
      throw new Error(`Fallback not registered: ${name}`);
    }

    try {
      const result = await Promise.race([
        config.primary() as Promise<T>,
        this.timeout(config.timeoutMs || 5000)
      ]);
      return result;
    } catch (primaryError) {
      if (config.condition && !config.condition(primaryError as Error)) {
        throw primaryError;
      }
      
      console.log(`Primary failed, executing fallback: ${name}`);
      return await config.fallback() as T;
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ms);
    });
  }
}

// 降级示例
const fallbackManager = new FallbackManager();

fallbackManager.register('search', {
  primary: async () => {
    // 尝试使用付费 API
    return await premiumSearchAPI(query);
  },
  fallback: async () => {
    // 降级到免费 API
    return await freeSearchAPI(query);
  },
  condition: (error) => {
    return error.message.includes('rate limit') || 
           error.message.includes('quota exceeded');
  }
});

const results = await fallbackManager.execute<SearchResult[]>('search');
```

### 6.3 熔断器

```typescript
enum CircuitState {
  CLOSED = 'closed',     // 正常，请求通过
  OPEN = 'open',          // 熔断，拒绝请求
  HALF_OPEN = 'half-open' // 半开，允许部分请求
}

interface CircuitBreakerConfig {
  failureThreshold: number;      // 失败多少次后打开熔断
  successThreshold: number;     // 半开时成功多少次后关闭
  timeout: number;               // 熔断持续时间(ms)
  halfOpenRequests: number;     // 半开时允许的请求数
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private halfOpenCount = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenCount = 0;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCount >= this.config.halfOpenRequests) {
        throw new Error('Circuit breaker half-open limit reached');
      }
      this.halfOpenCount++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        console.log('Circuit breaker CLOSED');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      console.log('Circuit breaker OPEN (half-open failure)');
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log('Circuit breaker OPEN');
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCount = 0;
  }
}

// 熔断器使用示例
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,
  halfOpenRequests: 2
});

async function resilientCall() {
  const result = await circuitBreaker.execute(async () => {
    return await externalService.fetch();
  });
  return result;
}

// 熔断器监控
setInterval(() => {
  console.log(`Circuit state: ${circuitBreaker.getState()}`);
}, 10000);
```

---

## 完整示例：Agent 编排系统

```typescript
// 整合所有模式的完整示例
class AgentOrchestrator {
  private stateMachine: AgentStateMachine;
  private taskQueue: TaskQueue;
  private scheduler: PriorityScheduler;
  private eventEmitter: EventEmitter;
  private retryManager: TaskRecoveryManager;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(config: OrchestratorConfig) {
    this.stateMachine = new AgentStateMachine({} as AgentContext);
    this.taskQueue = new TaskQueue();
    this.scheduler = new PriorityScheduler(this.taskQueue, {
      maxConcurrent: config.maxConcurrent,
      timeSlice: config.timeSlice
    });
    this.eventEmitter = new EventEmitter();
    this.retryManager = new TaskRecoveryManager();
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.eventEmitter.on('task:start', async (payload) => {
      await this.stateMachine.handleEvent(AgentEvent.START);
    });

    this.eventEmitter.on('task:complete', async (payload) => {
      await this.stateMachine.handleEvent(AgentEvent.COMPLETE);
    });

    this.eventEmitter.on('task:error', async (payload) => {
      const recovery = await this.retryManager.recover(payload.task, payload.error);
      
      switch (recovery) {
        case 'retry':
          await this.stateMachine.handleEvent(AgentEvent.RETRY);
          break;
        case 'fallback':
          await this.executeFallback(payload.task);
          break;
        case 'abort':
          await this.stateMachine.handleEvent(AgentEvent.ABORT);
          break;
      }
    });
  }

  private async executeFallback(task: Task): Promise<void> {
    const fallback = task.metadata?.fallback as (() => Promise<void>) | undefined;
    if (fallback) {
      await fallback();
    }
  }

  async submitTask(task: Task): Promise<string> {
    this.taskQueue.enqueue(task);
    await this.eventEmitter.emit('task:submitted', { taskId: task.id });
    return task.id;
  }

  start(): void {
    this.scheduler.start(async (task) => {
      await this.eventEmitter.emit('task:start', { task });
      
      const breaker = this.getCircuitBreaker(task.type);
      
      try {
        const result = await breaker.execute(() => this.executeTask(task));
        await this.eventEmitter.emit('task:complete', { task, result });
      } catch (error) {
        await this.eventEmitter.emit('task:error', { task, error });
      }
    });
  }

  private async executeTask(task: Task): Promise<unknown> {
    // 实现任务执行逻辑
    return {};
  }

  private getCircuitBreaker(type: string): CircuitBreaker {
    if (!this.circuitBreakers.has(type)) {
      this.circuitBreakers.set(type, new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        halfOpenRequests: 2
      }));
    }
    return this.circuitBreakers.get(type)!;
  }
}
```

---

## 状态图汇总

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐    start     ┌───────────┐    execute   ┌──────────┐         │
│  │  idle   │ ──────────▶  │ thinking  │ ──────────▶  │ executing│         │
│  └─────────┘              └───────────┘              └────┬─────┘         │
│                                                           │                │
│       ┌───────────────────────────────────────────────────┼───────────┐    │
│       │                                                   │           │    │
│       ▼                                                   ▼           │    │
│  ┌─────────┐    abort     ┌───────────┐    complete   ┌────────────┐│    │
│  │paused   │ ◀────────── │ waiting   │ ──────────▶  │ completed  ││    │
│  └─────────┘              └───────────┘              └────────────┘│    │
│       │                                                   ▲           │
│       │                                                   │           │
│       └─────────────────── resume ────────────────────────┘           │
│                                                                           │
│  ┌─────────┐    fail      ┌─────────┐    reset    ┌─────────┐          │
│  │  error  │ ──────────▶  │ aborted │ ──────────▶ │  idle   │          │
│  └─────────┘              └─────────┘             └─────────┘          │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          TASK QUEUE STATES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────┐   enqueue   ┌─────────┐   dequeue   ┌──────────┐  complete ┌───┤
│  │ pending│ ──────────▶ │ ready   │ ──────────▶ │ running  │ ────────▶ │   │
│  └────────┘             └─────────┘             └──────────┘            │   │
│                                                                       ▼   │
│                                                                   ┌────────┐│
│  ┌────────┐   retry   ┌─────────┐                                │ done   ││
│  │ failed │ ◀──────── │ retry   │                                └────────┘│
│  └────────┘           └─────────┘                                           │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 参考

- [有限状态机设计模式](https://en.wikipedia.org/wiki/Finite-state_machine)
- [Actor 模型](https://en.wikipedia.org/wiki/Actor_model)
- [Saga 模式](https://microservices.io/patterns/data/saga.html)