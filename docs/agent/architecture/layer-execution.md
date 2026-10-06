---
title: 执行层
description: Agent 分层架构之执行层：工具调用、行动执行与结果反馈。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 执行层

执行层负责实际执行决策层产生的行动计划。

## 1. 工具编排器 (Tool Orchestrator)

工具编排器管理和协调各种工具的调用。

```typescript
// 工具定义
interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  returns: ReturnSchema;
  capabilities: string[];
  limitations?: string[];
  cost?: number;
  latency?: LatencyProfile;
}

type ToolCategory = 'web' | 'code' | 'data' | 'communication' | 'system';

// 工具执行结果
interface ToolExecution {
  toolId: string;
  success: boolean;
  result?: any;
  error?: Error;
  duration: number;
  tokensUsed?: number;
}

// 工具编排器
class ToolOrchestrator {
  private tools: Map<string, Tool> = new Map();
  private executors: Map<string, ToolExecutor> = new Map();
  private retryPolicy: RetryPolicy;

  constructor(config: OrchestratorConfig) {
    this.loadTools(config.tools);
    this.initializeExecutors(config.executors);
    this.retryPolicy = config.retryPolicy;
  }

  async execute(action: Action, context: ExecutionContext): Promise<ToolExecution> {
    const tool = this.getTool(action.tool!);

    // 参数验证
    this.validateParameters(tool, action.parameters);

    // 选择执行器
    const executor = this.selectExecutor(tool);

    // 执行
    const startTime = Date.now();

    try {
      const result = await executor.execute(tool, action.parameters, context);

      return {
        toolId: tool.id,
        success: true,
        result,
        duration: Date.now() - startTime
      };
    } catch (error) {
      // 重试逻辑
      const retryResult = await this.handleRetry(tool, action.parameters, context, error as Error);

      if (retryResult) {
        return retryResult;
      }

      return {
        toolId: tool.id,
        success: false,
        error: error as Error,
        duration: Date.now() - startTime
      };
    }
  }

  async orchestrate(actions: Action[], context: ExecutionContext): Promise<ToolExecution[]> {
    const results: ToolExecution[] = [];

    for (const action of actions) {
      const result = await this.execute(action, context);
      results.push(result);

      // 传播错误处理
      if (!result.success && context.stopOnError) {
        break;
      }
    }

    return results;
  }

  private getTool(toolId: string): Tool {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new ToolNotFoundError(toolId);
    }
    return tool;
  }

  private validateParameters(tool: Tool, params: Map<string, any>): void {
    for (const param of tool.parameters) {
      const value = params.get(param.name);

      if (param.required && (value === undefined || value === null)) {
        throw new MissingParameterError(tool.id, param.name);
      }

      if (value !== undefined) {
        this.validateType(param, value);
      }
    }
  }

  private validateType(param: ToolParameter, value: any): void {
    const expectedType = param.type;

    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          throw new TypeMismatchError(param.name, expectedType, typeof value);
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          throw new TypeMismatchError(param.name, expectedType, typeof value);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new TypeMismatchError(param.name, expectedType, typeof value);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          throw new TypeMismatchError(param.name, expectedType, typeof value);
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new TypeMismatchError(param.name, expectedType, typeof value);
        }
        break;

      case 'enum':
        if (!param.enum?.includes(value)) {
          throw new InvalidEnumValueError(param.name, value, param.enum!);
        }
        break;
    }
  }

  private selectExecutor(tool: Tool): ToolExecutor {
    const executor = this.executors.get(tool.category);
    if (!executor) {
      throw new NoExecutorError(tool.category);
    }
    return executor;
  }

  private async handleRetry(
    tool: Tool,
    params: Map<string, any>,
    context: ExecutionContext,
    error: Error
  ): Promise<ToolExecution | null> {
    if (!this.retryPolicy.enabled) {
      return null;
    }

    const maxRetries = this.retryPolicy.maxRetries || 3;
    const baseDelay = this.retryPolicy.baseDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // 指数退避
      const delay = baseDelay * Math.pow(2, attempt - 1);

      await this.sleep(delay);

      try {
        const executor = this.selectExecutor(tool);
        const result = await executor.execute(tool, params, context);

        return {
          toolId: tool.id,
          success: true,
          result,
          duration: 0
        };
      } catch {
        if (attempt === maxRetries) {
          return null;
        }
      }
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private loadTools(toolConfigs: ToolConfig[]): void {
    for (const config of toolConfigs) {
      this.tools.set(config.id, {
        id: config.id,
        name: config.name,
        description: config.description,
        category: config.category,
        parameters: config.parameters,
        returns: config.returns,
        capabilities: config.capabilities,
        limitations: config.limitations,
        cost: config.cost,
        latency: config.latency
      });
    }

    // 注册内置工具
    this.registerBuiltinTools();
  }

  private registerBuiltinTools(): void {
    // 注册默认执行器
    this.executors.set('web', new WebToolExecutor());
    this.executors.set('code', new CodeToolExecutor());
    this.executors.set('data', new DataToolExecutor());
    this.executors.set('communication', new CommunicationExecutor());
    this.executors.set('system', new SystemExecutor());
  }

  private initializeExecutors(executorConfigs?: ExecutorConfig[]): void {
    if (!executorConfigs) return;

    for (const config of executorConfigs) {
      this.executors.set(config.category, this.createExecutor(config));
    }
  }

  private createExecutor(config: ExecutorConfig): ToolExecutor {
    switch (config.type) {
      case 'http':
        return new HTTPExecutor(config.options);

      case 'process':
        return new ProcessExecutor(config.options);

      case 'function':
        return new FunctionExecutor(config.options);

      default:
        throw new UnknownExecutorTypeError(config.type);
    }
  }

  async getToolCapabilities(): Promise<Map<string, string[]>> {
    const capabilities = new Map<string, string[]>();

    for (const [id, tool] of this.tools) {
      capabilities.set(id, tool.capabilities);
    }

    return capabilities;
  }
}

// Web 工具执行器
class WebToolExecutor implements ToolExecutor {
  async execute(tool: Tool, params: Map<string, any>, context: ExecutionContext): Promise<any> {
    const url = params.get('url');
    const method = params.get('method') || 'GET';
    const headers = params.get('headers') || {};

    // 模拟 HTTP 请求
    return { status: 200, data: 'Response data' };
  }
}

// 代码执行器
class CodeToolExecutor implements ToolExecutor {
  async execute(tool: Tool, params: Map<string, any>, context: ExecutionContext): Promise<any> {
    const code = params.get('code');
    const language = params.get('language') || 'javascript';

    // 模拟代码执行
    return { output: 'Executed successfully', language };
  }
}
```

## 2. 并行/串行执行器 (Parallel/Sequential Executor)

并行和串行执行控制器管理任务的执行模式。

```typescript
// 执行计划
interface ExecutionPlan {
  id: string;
  steps: ExecutionStep[];
  mode: ExecutionMode;
  dependencies: DependencyGraph;
}

type ExecutionMode = 'parallel' | 'sequential' | 'hybrid';

interface ExecutionStep {
  id: string;
  action: Action;
  dependencies: string[];
  parallelGroup?: string;
  estimatedDuration: number;
}

interface DependencyGraph {
  nodes: string[];
  edges: Array<{ from: string; to: string }>;
}

// 混合执行引擎
class ExecutionEngine {
  private maxConcurrency: number;
  private executionQueue: ExecutionStep[];
  private runningTasks: Map<string, Promise<any>> = new Map();
  private results: Map<string, any> = new Map();

  constructor(config: ExecutionConfig) {
    this.maxConcurrency = config.maxConcurrency || 5;
  }

  async execute(plan: ExecutionPlan): Promise<ExecutionResult> {
    const startTime = Date.now();

    switch (plan.mode) {
      case 'parallel':
        return this.executeParallel(plan);

      case 'sequential':
        return this.executeSequential(plan);

      case 'hybrid':
        return this.executeHybrid(plan);

      default:
        throw new UnknownExecutionModeError(plan.mode);
    }
  }

  private async executeParallel(plan: ExecutionPlan): Promise<ExecutionResult> {
    const results: Map<string, any> = new Map();
    const errors: Map<string, Error> = new Map();

    // 按并行组分组
    const groups = this.groupByParallel(plan.steps);

    for (const group of groups) {
      const tasks = group.map(step => this.executeStep(step));
      const groupResults = await Promise.allSettled(tasks);

      groupResults.forEach((result, index) => {
        const stepId = group[index].id;

        if (result.status === 'fulfilled') {
          results.set(stepId, result.value);
        } else {
          errors.set(stepId, result.reason);
        }
      });
    }

    return {
      results: Object.fromEntries(results),
      errors: Object.fromEntries(errors),
      duration: Date.now() - startTime
    };
  }

  private async executeSequential(plan: ExecutionPlan): Promise<ExecutionResult> {
    const results: Map<string, any> = new Map();
    const errors: Map<string, Error> = new Map();

    for (const step of plan.steps) {
      // 检查依赖
      const depsSatisfied = this.checkDependencies(step, results);

      if (!depsSatisfied) {
        errors.set(step.id, new DependencyNotSatisfiedError(step.id));
        continue;
      }

      try {
        const result = await this.executeStep(step);
        results.set(step.id, result);
      } catch (error) {
        errors.set(step.id, error as Error);
      }
    }

    return {
      results: Object.fromEntries(results),
      errors: Object.fromEntries(errors),
      duration: Date.now() - startTime
    };
  }

  private async executeHybrid(plan: ExecutionPlan): Promise<ExecutionResult> {
    const results: Map<string, any> = new Map();
    const errors: Map<string, Error> = new Map();

    // 构建执行图
    const executionGraph = this.buildExecutionGraph(plan);

    // 拓扑排序
    const sortedSteps = this.topologicalSort(executionGraph);

    // 按层级执行
    let currentLevel = 0;

    while (sortedSteps.length > 0) {
      const levelSteps = sortedSteps.filter(step =>
        this.getLevel(step, executionGraph) === currentLevel
      );

      if (levelSteps.length === 0) {
        break;
      }

      // 并行执行同层步骤
      const tasks = levelSteps.map(step => this.executeStep(step));
      const levelResults = await Promise.allSettled(tasks);

      levelResults.forEach((result, index) => {
        const stepId = levelSteps[index].id;

        if (result.status === 'fulfilled') {
          results.set(stepId, result.value);
        } else {
          errors.set(stepId, result.reason);
        }
      });

      // 移除已执行的步骤
      for (const step of levelSteps) {
        const idx = sortedSteps.indexOf(step);
        if (idx > -1) sortedSteps.splice(idx, 1);
      }

      currentLevel++;
    }

    return {
      results: Object.fromEntries(results),
      errors: Object.fromEntries(errors),
      duration: Date.now() - startTime
    };
  }

  private groupByParallel(steps: ExecutionStep[]): ExecutionStep[][] {
    const groups: Map<string, ExecutionStep[]> = new Map();

    for (const step of steps) {
      const groupId = step.parallelGroup || `standalone_${step.id}`;

      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }

      groups.get(groupId)!.push(step);
    }

    return Array.from(groups.values());
  }

  private checkDependencies(step: ExecutionStep, results: Map<string, any>): boolean {
    for (const depId of step.dependencies) {
      if (!results.has(depId)) {
        return false;
      }
    }
    return true;
  }

  private async executeStep(step: ExecutionStep): Promise<any> {
    // 模拟步骤执行
    return { stepId: step.id, status: 'completed' };
  }

  private buildExecutionGraph(plan: ExecutionPlan): DependencyGraph {
    const nodes = plan.steps.map(s => s.id);
    const edges: Array<{ from: string; to: string }> = [];

    for (const step of plan.steps) {
      for (const depId of step.dependencies) {
        edges.push({ from: depId, to: step.id });
      }
    }

    return { nodes, edges };
  }

  private topologicalSort(graph: DependencyGraph): ExecutionStep[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // 初始化
    for (const node of graph.nodes) {
      inDegree.set(node, 0);
      adjacency.set(node, []);
    }

    // 构建邻接表和入度
    for (const edge of graph.edges) {
      adjacency.get(edge.from)!.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    // 拓扑排序
    const queue: string[] = [];
    const result: ExecutionStep[] = [];

    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push({ id: node } as ExecutionStep);

      for (const neighbor of adjacency.get(node) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  private getLevel(stepId: string, graph: DependencyGraph): number {
    // 简化的层级计算
    let level = 0;

    for (const edge of graph.edges) {
      if (edge.to === stepId) {
        level = Math.max(level, 1);
      }
    }

    return level;
  }
}
```

## 3. 状态机 (State Machine)

状态机管理执行过程中的状态转换。

```typescript
// 状态定义
interface State {
  id: string;
  type: StateType;
  data: Map<string, any>;
  timestamp: number;
  transitions: Transition[];
}

type StateType =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface Transition {
  from: StateType;
  to: StateType;
  trigger: string;
  condition?: (state: State) => boolean;
  guard?: () => boolean;
}

// 状态机
class StateMachine {
  private states: Map<string, State> = new Map();
  private currentState: State | null = null;
  private transitions: Map<string, Transition> = new Map();
  private listeners: Map<string, StateListener[]> = new Map();
  private history: StateHistoryEntry[] = [];

  constructor(config: StateMachineConfig) {
    this.initializeTransitions(config.transitions);
    this.setInitialState(config.initialState);
  }

  private initializeTransitions(transitions: TransitionConfig[]): void {
    for (const config of transitions) {
      const transition: Transition = {
        from: config.from,
        to: config.to,
        trigger: config.trigger,
        condition: config.condition,
        guard: config.guard
      };

      this.transitions.set(`${config.from}:${config.trigger}`, transition);
    }
  }

  private setInitialState(stateType: StateType): void {
    const state: State = {
      id: this.generateId(),
      type: stateType,
      data: new Map(),
      timestamp: Date.now(),
      transitions: []
    };

    this.states.set(state.id, state);
    this.currentState = state;

    this.recordTransition(null, state);
  }

  async transition(trigger: string, data?: Map<string, any>): Promise<State> {
    if (!this.currentState) {
      throw new NoCurrentStateError();
    }

    const key = `${this.currentState.type}:${trigger}`;
    const transition = this.transitions.get(key);

    if (!transition) {
      throw new InvalidTransitionError(this.currentState.type, trigger);
    }

    // 检查条件
    if (transition.condition && !transition.condition(this.currentState)) {
      throw new TransitionConditionFailedError(this.currentState.type, trigger);
    }

    // 检查守卫
    if (transition.guard && !transition.guard()) {
      throw new TransitionGuardFailedError(this.currentState.type, trigger);
    }

    // 执行转换
    const previousState = this.currentState;

    const newState: State = {
      id: this.generateId(),
      type: transition.to,
      data: data || new Map(),
      timestamp: Date.now(),
      transitions: []
    };

    this.states.set(newState.id, newState);
    this.currentState = newState;

    // 记录历史
    this.recordTransition(previousState, newState);

    // 通知监听器
    this.notifyListeners('transition', {
      from: previousState,
      to: newState,
      trigger
    });

    return newState;
  }

  private recordTransition(from: State | null, to: State): void {
    this.history.push({
      id: this.generateId(),
      timestamp: Date.now(),
      fromState: from?.type || null,
      toState: to.type,
      data: to.data
    });
  }

  getCurrentState(): State {
    if (!this.currentState) {
      throw new NoCurrentStateError();
    }
    return this.currentState;
  }

  getStateHistory(): StateHistoryEntry[] {
    return [...this.history];
  }

  async run(action: () => Promise<any>): Promise<void> {
    await this.transition('run');

    try {
      await action();
      await this.transition('complete');
    } catch (error) {
      await this.transition('fail', new Map([['error', error]]));
    }
  }

  async pause(): Promise<void> {
    await this.transition('pause');
  }

  async resume(): Promise<void> {
    await this.transition('resume');
  }

  async cancel(): Promise<void> {
    await this.transition('cancel');
  }

  on(event: string, listener: StateListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  private notifyListeners(event: string, data: any): void {
    const eventListeners = this.listeners.get(event) || [];

    for (const listener of eventListeners) {
      listener(event, data);
    }
  }

  private generateId(): string {
    return `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 状态验证
  isValidState(stateType: StateType): boolean {
    return ['idle', 'running', 'waiting', 'paused', 'completed', 'failed', 'cancelled']
      .includes(stateType);
  }

  // 检查是否可以转换
  canTransition(trigger: string): boolean {
    if (!this.currentState) return false;

    const key = `${this.currentState.type}:${trigger}`;
    return this.transitions.has(key);
  }
}

// 状态历史条目
interface StateHistoryEntry {
  id: string;
  timestamp: number;
  fromState: StateType | null;
  toState: StateType;
  data: Map<string, any>;
}

// 状态监听器
type StateListener = (event: string, data: any) => void;
```

## 4. 回调系统 (Callback System)

回调系统处理异步执行结果和事件通知。

```typescript
// 回调定义
interface Callback {
  id: string;
  type: CallbackType;
  handler: CallbackHandler;
  trigger: CallbackTrigger;
  priority: number;
  timeout?: number;
}

type CallbackType = 'success' | 'error' | 'timeout' | 'progress' | 'custom';
type CallbackHandler = (data: any) => Promise<void> | void;

interface CallbackTrigger {
  type: 'event' | 'condition' | 'time';
  config: any;
}

// 回调管理器
class CallbackManager {
  private callbacks: Map<string, Callback> = new Map();
  private eventQueue: Event[] = [];
  private processing: boolean = false;

  constructor() {
    this.startProcessing();
  }

  register(callback: Callback): void {
    this.callbacks.set(callback.id, callback);
  }

  unregister(callbackId: string): void {
    this.callbacks.delete(callbackId);
  }

  async emit(event: Event): Promise<void> {
    this.eventQueue.push(event);

    // 通知所有匹配的回调
    const matching = this.findMatchingCallbacks(event);

    for (const callback of matching) {
      this.executeCallback(callback, event);
    }
  }

  private findMatchingCallbacks(event: Event): Callback[] {
    const matching: Callback[] = [];

    for (const callback of this.callbacks.values()) {
      if (callback.trigger.type === 'event' && callback.trigger.config.eventType === event.type) {
        matching.push(callback);
      }
    }

    return matching.sort((a, b) => b.priority - a.priority);
  }

  private async executeCallback(callback: Callback, event: Event): Promise<void> {
    const timeout = callback.timeout || 30000;

    try {
      await Promise.race([
        callback.handler(event.data),
        this.timeoutPromise(timeout)
      ]);
    } catch (error) {
      console.error(`Callback ${callback.id} failed:`, error);
    }
  }

  private timeoutPromise(ms: number): Promise<void> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Callback timeout')), ms)
    );
  }

  private startProcessing(): void {
    setInterval(async () => {
      if (this.processing || this.eventQueue.length === 0) return;

      this.processing = true;

      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;

        try {
          await this.processEvent(event);
        } catch (error) {
          console.error('Event processing failed:', error);
        }
      }

      this.processing = false;
    }, 100);
  }

  private async processEvent(event: Event): Promise<void> {
    // 事件处理逻辑
  }

  // 条件回调
  async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await this.sleep(100);
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 进度回调
  onProgress(callback: (progress: Progress) => void): void {
    this.register({
      id: this.generateId(),
      type: 'progress',
      handler: async (data) => callback(data as Progress),
      trigger: { type: 'event', config: { eventType: 'progress' } },
      priority: 1
    });
  }

  private generateId(): string {
    return `cb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 事件
interface Event {
  type: string;
  data: any;
  timestamp: number;
  source?: string;
}

// 进度
interface Progress {
  current: number;
  total: number;
  message?: string;
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Tool Use 概览](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview) | 官方工具定义规范，含 schema 与调用回合结构，是编排器输入契约的源头。 | 读 tool_use 参数与返回结构一节，对照自己编排器的入参格式，改写一份 schema。 |
| [MCP Tools 概念](https://modelcontextprotocol.io/docs/concepts/tools) | MCP 官方概念文档，明确工具描述、输入校验与调用方的职责边界。 | 重点读 Tools 与输入 schema 部分，为自己封装的工具写描述与校验。 |
| [Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates) | 讲清批量更新的排队与合并语义，是串行执行顺序的权威说明。 | 读批处理与更新函数两节，带着多次调用如何排队的问题验证执行顺序。 |
| [Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer) | 把散落的更新逻辑收敛为 reducer，等价于显式状态迁移表。 | 读抽取 reducer 的步骤，把自己的状态流转改成 switch 式迁移并补事件清单。 |
| [State as a Snapshot](https://react.dev/learn/state-as-a-snapshot) | 说明一次执行内状态是快照，帮助理解回调拿到的值为何滞后。 | 读快照与异步更新部分，用它解释并行回调里读到旧状态的 bug。 |
| [Reacting to Input with State](https://react.dev/learn/reacting-to-input-with-state) | 用状态驱动 UI 的建模法，本质是把交互写成状态机。 | 按文中步骤列出视觉状态与触发事件，映射成自己模块的状态迁移表。 |
| [Appendix: How does the Reactive System Work?](https://book.leptos.dev/appendix_reactive_graph.html) | 剖析响应式系统内部，讲清依赖收集与回调何时被触发。 | 读依赖图与 effect 调度一节，对照回调系统的注册与触发时机。 |
| ['State'](https://yew.rs/docs/concepts/function-components/state) | 框架官方对 state 的定义，区分状态存储与视图更新的职责。 | 读 state 与响应式更新小节，思考执行器状态该放组件内还是外部。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook) | 可运行的工具调用示例集，覆盖多轮工具循环与结果回填。 | 跑 tool_use 目录 notebook，改成自己的工具，观察多轮循环与错误重试。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) | 一线工程复盘，讲清 lead agent 如何拆分并并行调度子任务。 | 读编排与并行检索章节，画出主从调用图，判断自己哪些步骤可并行。 |
| [Anthropic Courses](https://github.com/anthropics/courses) | 成体系的工具使用课程，从定义到多轮编排逐步推进。 | 按序做 Tool Use 课程 notebook，重点看多工具串联与结果聚合的写法。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|:--|:--|:--|:--|
| 后台管理的万行表格首屏 | 并行执行器、回调系统 | Promise.allSettled + 虚拟滚动 | 分片失败要保留已到数据，不要整屏报错 |
| 低端安卓的首屏加载 | 串行执行器、状态机 | 状态机管 loading/ready/error | 串行步骤要设超时，首屏只跑关键任务 |
| 多人协作白板 | 状态机、回调系统 | CRDT + WebSocket 回调 | 回调要幂等，重连后按到达顺序回放 |
| 每日对账批处理 | 工具编排器、状态机 | Airflow DAG / Temporal Workflow | 重跑要幂等，每片状态落盘再标记完成 |
| 视频转码流水线 | 工具编排器、并行执行器 | 消息队列 + Worker 池 | 限制并发数，失败分片单独重试 |
| 支付结果通知入库 | 回调系统、状态机 | 签名校验 + 幂等键 | 同一事件重复投递只处理一次 |
| 模型多步工具调用 | 工具编排器、并行执行器 | Agent 循环 + 工具注册表 | 只读工具可并行，写操作必须串行 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格首屏

**业务背景**：表格要同时给出分页数据、合计列和筛选项。行数上万时，首屏白屏时间由最慢的那次请求决定。用 PerformanceObserver 记录导航开始到首屏渲染完成的耗时即可复现。

**怎么用本页知识解决**：先把首屏需求拆成互相不依赖的任务，能同时发的就一起发，也就是并行执行器；等结果都回来再统一交给渲染，也就是回调系统。

```js
// 三个无依赖的任务：分页、合计、筛选项
async function loadFirstScreen(filter) {
  const results = await Promise.allSettled([
    fetchPage(1, filter),   // 分页数据，首屏必须
    fetchSummary(filter),   // 合计列，首屏必须
    fetchOptions(),         // 筛选项，允许迟到
  ]);
  const [page, summary, options] = results;
  // 回调：按字段降级，单项失败不丢整屏
  render({
    rows: page.status === 'fulfilled' ? page.value : [],
    total: summary.status === 'fulfilled' ? summary.value : null,
    options: options.status === 'fulfilled' ? options.value : [],
  });
}
```

- 三个请求并行发出，首屏等待时间等于最慢的那个，而不是三个耗时相加。
- 用 allSettled 而不是 all，筛选项接口挂掉不会让表格整体报错。
- 渲染层拿到 status 字段，可以逐个字段决定显示真实值还是占位。
- 如果合计接口必须先知道分页的筛选条件，就把它改成串行，避免参数错位。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板看 Long Task 与网络瀑布图，用 PerformanceObserver 采集 largest-contentful-paint 和 longtask 条数。改造前后各跑 5 次冷加载，取中位数对比。

**什么时候不该用**：
- 接口之间有条件依赖，比如合计需要先拿到总数再算平均值，并行会把参数传错。
- 后端连接池容量小，并行请求把连接占满，会拖慢同一用户的其他页面。

#### 场景 2：多人协作白板

**业务背景**：多人同时拖动图形，本地要立即响应，远端操作要按顺序合并。冲突处理写散在各个事件回调里时，重连后容易把同一条操作应用两次。用一条消息计数日志就能复现重复应用。

**怎么用本页知识解决**：把白板的生命周期写成状态机，网络消息、本地操作、断线重连都作为事件驱动状态迁移；回调只负责分发，不做状态判断。

```js
// 白板状态机：只允许以下迁移
const transitions = {
  syncing: { synced: 'ready', fail: 'offline' },
  ready:   { drop: 'offline' },
  offline: { reconnect: 'syncing' },
};

function dispatch(state, event) {
  const next = transitions[state]?.[event.type];
  if (!next) return state;        // 非法事件丢弃，避免脏状态
  return next;
}

// 回调系统：远端消息先过状态机，再决定合并或入队
function onRemoteMessage(msg) {
  if (dispatch(current, { type: 'remoteEdit' }) !== 'ready') {
    return queue.push(msg);       // 未就绪先入队，重连后回放
  }
  merge(msg);                     // 就绪才真正合并到画布
}
```

- "能不能合并"收敛到一个判断点，事件处理器不用各写一份 if。
- 非法迁移直接丢弃，重连时不会把旧消息重复应用。
- 未就绪的消息进队列，进入 ready 后按到达顺序回放。
- 回调只做分发，状态迁移表可以单独写测试，不必启动 WebSocket。

**怎么度量收益**：用 OpenTelemetry 给 dispatch 和 merge 各打一个 span，统计非法迁移次数、队列积压长度和 merge 耗时分布。前端再用 PerformanceObserver 看 longtask，确认合并没有卡住渲染。

**什么时候不该用**：
- 单人使用的白板，加状态机只增加代码路径，直接合并即可。
- 业务规则是"最后写入者胜"且没有重连需求时，入队回放会引入顺序分歧。

#### 场景 3：每日对账批处理

**业务背景**：每晚要对两边的流水做比对，流程含拉取、清洗、比对、写结果四步。任一步失败如果从头发起，耗时随全量数据规模增长。用一次运行的总耗时除以分片数，就能算出单片成本。

**怎么用本页知识解决**：用工具编排器把四步注册成任务，用状态机记录每个分片走到哪一步，失败分片交给下一轮调度重试。

```python
state = load_state()            # 从磁盘读上次进度

for chunk in chunks:
    if state.get(chunk.id) == "done":
        continue                # 断点续跑，不重复处理
    try:
        rows = pull(chunk)      # 步骤 1：拉取
        clean = normalize(rows) # 步骤 2：清洗
        diff = compare(clean)   # 步骤 3：比对
        write(diff)             # 步骤 4：写结果
        state[chunk.id] = "done"
        save_state(state)       # 每片完成后落盘一次
    except TransientError:
        state[chunk.id] = "retry"  # 交给下一轮调度重试
        save_state(state)
```

- 分片是重试的最小单位，一片出错不影响其他片的结果。
- 状态落盘放在写结果之后，不会出现"标记完成但结果丢失"。
- 重跑入口只读状态文件，不需要人工判断从哪一步开始。
- 拉取与比对之间的中间结果单独存盘，便于排查两边数据的差异。

**怎么度量收益**：统计每次运行的失败分片数与重试次数，Airflow 看任务重试计数，Temporal 看 Activity 重试指标。人为注入一次失败，记录断点续跑耗时与全量重跑耗时的比值。

**什么时候不该用**：
- 四步之间有强事务要求，中间结果不能落盘，分片续跑会读到不一致的数据。
- 数据量只有几百行，全量重跑几秒完成，维护断点状态反而多一个出错点。

### 行业先进实践

**幂等键与安全重试（出处：AWS Architecture Blog 文章 "Making retries safe with idempotent APIs"）**：文章说明客户端重试会重复提交写请求，服务端用调用方生成的幂等键去重。这样做把重试和去重解耦，调用方不必知道上次请求是否到达。借鉴方式：给每个可重试的写操作生成唯一键，写入前先查该键是否已处理。

**Saga 补偿事务（出处：microservices.io 的 Saga 模式条目）**：把长流程拆成本地事务序列，每步配一个补偿操作，失败时反向执行补偿。这样避免跨服务长时间持有锁。借鉴方式：把对账流程的每一步写成"执行 + 补偿"对，补偿只做标记，不删原始数据。

**工作流确定性重放（出处：Temporal 官方文档关于 Workflow 确定性的说明）**：工作流代码按事件历史重放，恢复时重建内存状态而不重新执行副作用。这样进程崩溃后能从中断点继续，结果与一次跑完一致。借鉴方式：状态迁移写成纯函数，网络和磁盘操作放到 Activity 里。

**分布式 Map 状态机（出处：AWS Step Functions 官方文档的 Distributed Map）**：对大批量数据分片并行处理，支持设置并发上限和失败阈值。分片级重试比整体重试代价小。借鉴方式：给批量导出设并发上限，失败分片单独重放，其余分片不动。

**链路追踪埋点（出处：OpenTelemetry 官方文档的 Trace 与 Span 概念）**：每个任务创建一个 span，记录父子关系，跨进程用上下文传播。编排的总耗时能按步骤拆开，定位慢在哪一段。借鉴方式：在回调入口和任务出口各埋一个 span，按 span 时长排序找瓶颈。

### 从学到用：落地路线

1. **试点选址**：挑一个失败能人工兜底、每天执行次数能数清的流程先接。验收标准：画出该流程的步骤依赖图，标出可并行的边与必须串行的边。
2. **小范围验证**：在试点流程上接入状态落盘、回调与重试，跑够一周。验收标准：人为注入 3 次失败，3 次都从断点续跑，最终结果与改造前逐条一致。
3. **模块化推广**：把状态迁移表和回调接口抽成公共模块，新流程只提供任务定义。验收标准：接入第二个流程时不改公共模块代码，改动集中在任务定义文件。
4. **防止回退**：把非法迁移计数、重复执行计数做成监控指标，并写进持续集成。验收标准：删掉覆盖重复投递的那条测试用例后，流水线报错。

### 动手作业

**目标**：写一个小型任务编排器，支持串行与并行两种执行模式、断点续跑和执行进度回调。

**步骤**：
1. 定义任务结构：id、依赖 id 列表、执行函数、超时时间。
2. 按依赖做拓扑排序，把任务分成若干层，同层任务互不依赖。
3. 用 Promise.allSettled 执行同一层，记录每个任务的成功或失败状态。
4. 每层跑完把状态写进一个 JSON 文件，重跑时先读该文件跳过已完成任务。
5. 实现三个回调：onTaskStart、onTaskDone、onTaskFail，由调用方决定打日志还是更新进度条。
6. 写一个测试任务集，让第 3 个任务抛错，验证重跑只执行第 3 个及其后续未完成的任务。
7. 加超时与重试：任务超过设定时间标记失败，重试次数上限可配置，超过上限就终止整轮。

**验收标准**：
- 同一层任务的日志开始时间相差在 50 毫秒以内，不同层之间有明确先后。
- 第一次运行第 3 个任务失败，第二次运行只执行第 3 个及之后未完成的任务。
- 状态文件里不存在"标记完成但没有结果"的条目。
- 把重试上限设为 1 时，失败任务只被重试一次，之后整轮终止并返回失败码。
- 删掉状态文件后运行，行为与首次运行一致。

