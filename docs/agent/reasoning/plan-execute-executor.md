---
title: 规划-执行：执行器与完整实现
description: 规划-执行模式的执行器（Executor）设计与端到端完整实现。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 规划-执行：执行器与完整实现

> 本文是「规划-执行模式」系列第 2 篇（共 3 篇）。上一篇：[规划-执行：原理与规划器](plan-execute-planner.md)　下一篇：[规划-执行：混合模式与优化](plan-execute-hybrid.md)

## 1. 执行器设计

### 1.1 步骤执行

#### 1.1.1 执行上下文管理

```typescript
interface ExecutionContext {
  plan: ExecutionPlan;
  currentStepIndex: number;
  sharedState: Map<string, any>;
  toolRegistry: ToolRegistry;
  checkpointManager: CheckpointManager;
  eventEmitter: EventEmitter;
}

class StepExecutor {
  private context: ExecutionContext;
  private executionPolicy: ExecutionPolicy;
  
  constructor(context: ExecutionContext, policy: ExecutionPolicy) {
    this.context = context;
    this.executionPolicy = policy;
  }
  
  async executeStep(step: TaskStep): Promise<StepResult> {
    this.context.eventEmitter.emit('step:start', { step });
    
    try {
      // 1. 准备执行环境
      const environment = await this.prepareEnvironment(step);
      
      // 2. 执行前钩子
      await this.executionPolicy.beforeExecute(this.context, step);
      
      // 3. 执行核心逻辑
      const result = await this.executeCore(step, environment);
      
      // 4. 执行后钩子
      await this.executionPolicy.afterExecute(this.context, step, result);
      
      // 5. 更新上下文状态
      this.updateContext(step, result);
      
      this.context.eventEmitter.emit('step:complete', { step, result });
      
      return result;
      
    } catch (error) {
      const errorResult = this.handleExecutionError(step, error);
      this.context.eventEmitter.emit('step:error', { step, error: errorResult });
      return errorResult;
    }
  }
  
  private async executeCore(
    step: TaskStep, 
    environment: ExecutionEnvironment
  ): Promise<StepResult> {
    const startTime = Date.now();
    
    // 根据步骤类型选择执行策略
    switch (step.type) {
      case 'tool_invocation':
        return this.executeToolInvocation(step, environment);
        
      case 'llm_generation':
        return this.executeLLMGeneration(step, environment);
        
      case 'script_execution':
        return this.executeScript(step, environment);
        
      case 'conditional_branch':
        return this.executeConditionalBranch(step, environment);
        
      case 'parallel_execution':
        return this.executeParallelSteps(step, environment);
        
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }
  
  private async executeToolInvocation(
    step: TaskStep, 
    environment: ExecutionEnvironment
  ): Promise<StepResult> {
    const tool = this.context.toolRegistry.get(step.toolName);
    
    if (!tool) {
      return {
        success: false,
        error: new Error(`Tool not found: ${step.toolName}`)
      };
    }
    
    // 注入输入参数
    const inputs = this.resolveInputs(step.inputs, environment);
    
    // 执行工具
    const output = await tool.execute(inputs);
    
    return {
      success: true,
      output,
      metadata: {
        toolName: step.toolName,
        executionTime: Date.now() - environment.startTime
      }
    };
  }
  
  private async executeParallelSteps(
    step: TaskStep, 
    environment: ExecutionEnvironment
  ): Promise<StepResult> {
    const substeps = step.substeps || [];
    const maxConcurrency = this.executionPolicy.maxConcurrency;
    
    // 分批执行（控制并发）
    const batches = this.batchSteps(substeps, maxConcurrency);
    const allResults: StepResult[] = [];
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(substep => this.executeStep(substep))
      );
      allResults.push(...batchResults);
      
      // 检查批次中是否有失败
      const failures = batchResults.filter(r => !r.success);
      if (failures.length > 0 && this.executionPolicy.failFast) {
        return {
          success: false,
          error: new Error(`Parallel execution failed: ${failures.length} subtasks failed`),
          partialResults: allResults
        };
      }
    }
    
    return {
      success: true,
      outputs: allResults.map(r => r.output),
      metadata: { batchCount: batches.length }
    };
  }
}
```

#### 1.1.2 条件执行与分支处理

```typescript
// 第 1 段：类定义与模型依赖
// 把"条件判定"这一横切关注点从主流程里抽出来单独成类，便于被不同流程引擎复用；
// llm 是唯一外部依赖，只有 llm_guided 分支会用到它，其余分支是纯计算/纯工具调用，
// 因此这类很适合做单元测试——注入假 LLM 即可覆盖全部路径。
class ConditionalExecutor {
  private llm: LLM;
  
  // 第 2 段：条件求值的类型分发器（策略路由）
  // 用 switch 而非 if-else 链，是为了让"条件种类"成为显式的可枚举分支，新增类型时定位清晰。
  // 关键数据流：只有 llm_guided / tool_based 需要运行时 context，simple / compound 是纯静态判断，
  // 所以这里统一接收 context 再按需下传，避免调用方为不同条件准备不同入参。
  // 易错点：switch 没有 default。它依赖 ConditionalExpression 是可辨识联合（discriminated union）
  // 来保证穷尽性——新增一个 type 却漏写 case 时，TS 会因"并非所有路径都 return"报错；
  // 但若类型被宽松成 string，运行时就会静默返回 undefined，导致等待方拿到非布尔值。
  async evaluateCondition(
    condition: ConditionalExpression, 
    context: ExecutionContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'simple':
        return this.evaluateSimpleCondition(condition);
        
      case 'compound':
        return this.evaluateCompoundCondition(condition);
        
      case 'llm_guided':
        return this.evaluateLLMGuidedCondition(condition, context);
        
      case 'tool_based':
        return this.evaluateToolBasedCondition(condition);
    }
  }
  
  // 第 3 段：LLM 引导的语义判定（把非结构化状态交给模型判断）
  // 之所以用 LLM，是因为这类条件往往是自然语言描述、无法用规则穷举（如"用户是否已表达明确购买意向"）。
  // 数据流：condition.description 是人写的判定标准，formatContextForLLM(context) 把运行时状态压成文本，
  // 二者拼进模板，让模型在"看到当前状态"的前提下给出 true/false。
  private async evaluateLLMGuidedCondition(
    condition: LLMGuidedCondition, 
    context: ExecutionContext
  ): Promise<boolean> {
    const prompt = `
      评估以下条件是否满足：
      
      条件描述：${condition.description}
      
      当前状态：
      ${this.formatContextForLLM(context)}
      
      请判断是否满足条件，返回 true 或 false。
    `;
    
    // 易错点：这是"子串包含"而非解析，模型若输出 "not true" / "无法判断为 true" 也会被误判为真。
    // 生产环境更稳妥的做法是要求结构化输出（如 JSON）后再严格解析，并对无法解析的响应抛错或降级。
    const response = await this.llm.generate(prompt);
    return response.toLowerCase().includes('true');
  }
  
  // 第 4 段：分支选择——按顺序取首个满足者（优先级由数组顺序隐式编码）
  // 复杂度 O(n)，但每个 branch 的 evaluateCondition 可能是 LLM 或工具调用，真实代价是 n 次外部请求，
  // 因此分支顺序既是业务优先级、也是性能优化点：把高命中率的条件放前面可提前短路。
  async executeBranch(
    branches: ConditionalBranch[], 
    context: ExecutionContext
  ): Promise<BranchResult> {
    for (const branch of branches) {
      const satisfied = await this.evaluateCondition(branch.condition, context);
      
      if (satisfied) {
        // 命中分支会"派生"出一份新 context（updateContextForBranch），
        // 而默认分支原样返回旧 context——这个不对称是常见踩坑点：
        // 若默认分支也期望携带分支级状态，需显式补上更新逻辑。
        return {
          selectedBranch: branch.id,
          steps: branch.steps,
          context: this.updateContextForBranch(context, branch)
        };
      }
    }
    
    // 默认分支：作为兜底，保证"有条件都不满足"时流程仍能继续而非中断。
    // find 取第一个 isDefault=true 的分支；若配置了多个默认分支，后者会被忽略。
    const defaultBranch = branches.find(b => b.isDefault);
    if (defaultBranch) {
      return {
        selectedBranch: defaultBranch.id,
        steps: defaultBranch.steps,
        context
      };
    }
    
    // 既无命中分支又无默认分支属于配置错误（数据问题而非运行时偶发），
    // 这里选择快速失败抛出，避免上层拿到缺字段的结果继续执行造成难以追踪的连锁问题。
    throw new Error('No branch condition satisfied and no default branch provided');
  }
}
```
### 1.2 状态同步

#### 1.2.1 共享状态管理

```typescript
// 第 1 段：状态快照的数据契约（定义"时间旅行"需要冻结哪些信息）
// 快照必须同时携带「数据 + 版本号 + 时间戳 + 步骤标识」四要素，缺一不可：
// data 用 Map 浅拷贝，保证快照与后续修改解耦；version 用于恢复时让外部观察者感知到"版本回退"。
interface StateSnapshot {
  timestamp: number;           // 快照创建时刻，用于排查"哪一步导致状态异常"的时间线
  stepId: string;              // 语义化步骤名（如 'step-3-validate'），比单调递增的序号更利于日志检索
  data: Map<string, any>;      // 状态数据的不可变副本；结构性拷贝由 snapshot() 负责，此处只声明类型
  version: number;             // 快照诞生时的全局版本号，restore 时需一并回滚，否则版本会"跳跃"
}

class StateManager {
  // 第 2 段：内部状态与订阅者（三份数据的职责划分）
  // stateHistory 是环形缓冲（超出上限 shift 淘汰最旧），currentState 是唯一可变真源，
  // version 单调递增用于乐观并发/变更去重，listeners 保存外部观察者回调。
  private stateHistory: StateSnapshot[] = [];
  private currentState: Map<string, any> = new Map();
  private version: number = 0;
  private listeners: StateChangeListener[] = [];
  
  // 第 3 段：读路径（无副作用，便于在渲染/计算中反复调用）
  // 直接委托给 Map，未命中返回 undefined 而非抛错——把"键是否存在"的判断权交给调用方。
  get(key: string): any {
    return this.currentState.get(key);
  }
  
  // 第 4 段：写路径（先记录旧值 → 落库 → 升版本 → 广播，顺序不可颠倒）
  // 先在本地缓存 oldValue 再 set，是因为 Map.set 会就地覆盖，事后无法再取回旧值；
  // 版本号在通知之前自增，保证监听器读到的 version 与本次变更严格对应。
  set(key: string, value: any): void {
    const oldValue = this.currentState.get(key);   // 必须先取旧值：set 之后旧值即被覆盖丢失
    this.currentState.set(key, value);
    this.version++;                                // 每次写入都推进版本，即使值相等也视为一次变更
    
    this.notifyListeners({
      type: 'change',
      key,
      oldValue,                                    // 可能为 undefined，表示该键是首次新增
      newValue: value,
      version: this.version
    });
  }
  
  // 第 5 段：创建快照（用浅拷贝切断与 currentState 的引用共享）
  // new Map(this.currentState) 只复制键值对的引用，因此嵌套对象仍与外部共享——
  // 若调用方会原地修改对象属性，需自行深拷贝，否则快照会被"悄悄污染"。
  snapshot(stepId: string): StateSnapshot {
    const snapshot: StateSnapshot = {
      timestamp: Date.now(),                       // 采集当前墙钟时间，快照之间可用它排序/计算耗时
      stepId,
      data: new Map(this.currentState),            // 结构性浅拷贝：新增/删除键互不影响，属性修改仍共享
      version: this.version                        // 记录版本，使快照可定位到确切的变更点
    };
    
    this.stateHistory.push(snapshot);
    
    // 限制历史记录大小
    // shift() 是 O(n) 的数组头部删除，但只在越界时才触发；长跑场景下更推荐环形索引，
    // 这里选择简单方案，代价是历史窗口固定为最近 MAX_HISTORY_SIZE 个快照。
    if (this.stateHistory.length > MAX_HISTORY_SIZE) {
      this.stateHistory.shift();
    }
    
    return snapshot;                               // 返回对象与历史中的元素同引用，调用方改动会同步反映到历史
  }
  
  // 第 6 段：回滚状态（用快照数据整体替换，并把版本号拉回过去）
  // 注意 version 被"倒退"而非继续递增，这在依赖单调版本的场景（如增量 diff 缓存）中需要额外小心；
  // restore 不写入 stateHistory，因此"回滚"这一动作本身不可被再次撤销。
  restore(snapshot: StateSnapshot): void {
    this.currentState = new Map(snapshot.data);    // 再拷贝一层，避免外部继续持有 snapshot 时被本次恢复间接改动
    this.version = snapshot.version;
    this.notifyListeners({
      type: 'restore',
      snapshot
    });
  }
  
  // 状态对比
  // 第 7 段：快照差异计算（双向往返：先找 A→B 的删除/修改，再找 B→A 的新增）
  // 复杂度 O(|A| + |B|) 次 Map 查找；deepEqual 决定"值相同但引用不同"是否算变更，
  // 若它是深比较且值很大，则整体开销由它主导，可能远超遍历成本。
  diff(snapshotA: StateSnapshot, snapshotB: StateSnapshot): StateDiff {
    const changes: StateChange[] = [];
    
    // 第 8 段：正向遍历 A —— 覆盖"被删除"与"被修改"两类语义
    // 先判 has 再比对值：若直接用 valueB === undefined 来判断，会与"键存在但值恰为 undefined"混淆。
    for (const [key, valueA] of snapshotA.data) {
      const valueB = snapshotB.data.get(key);
      
      if (!snapshotB.data.has(key)) {
        changes.push({ key, type: 'removed', oldValue: valueA });
      } else if (!deepEqual(valueA, valueB)) {     // deepEqual 为假才记 modified，避免同值写入产生噪音
        changes.push({ key, type: 'modified', oldValue: valueA, newValue: valueB });
      }
    }
    
    // 第 9 段：反向遍历 B —— 只挑出 A 中不存在的键，即"新增"
    // 因为删除/修改已在上一轮处理，这里仅需补集运算，无需再比较值。
    for (const [key, valueB] of snapshotB.data) {
      if (!snapshotA.data.has(key)) {
        changes.push({ key, type: 'added', newValue: valueB });
      }
    }
    
    return { changes };                            // changes 顺序：先 removed/modified，后 added，UI 渲染时需自行排序
  }
}
```
#### 1.2.2 跨步骤数据流

```typescript
interface DataFlowEdge {
  sourceStep: string;
  targetStep: string;
  variableName: string;
  transformation?: DataTransformation;
}

// 第 1 段：定义数据流边的数据结构（描述"谁的输出经过什么加工后喂给谁"）
// 一条边 = 上游步骤 + 下游步骤 + 变量名，三者共同决定下游输入表中某个 key 的来源。
// transformation 可选：不填表示原样透传上游 output，填了则在下游取值前先做一次加工，避免上游为适配下游而污染自身输出。

class DataFlowManager {
  private edges: DataFlowEdge[] = [];
  private valueCache: Map<string, any> = new Map();
  
  registerDataFlow(edge: DataFlowEdge): void {
    this.edges.push(edge);
  }
  
  // 自动推断数据流依赖
  // 第 2 段：登记已确认的数据流边（本类唯一的写入入口）
  // 用 push 追加而不去重：同一步骤对可能因多次推断产生重复边，副作用是 getStepInputs 里同名变量会被后写入的值覆盖，
  // edges 的遍历顺序（即注册顺序）因此隐式决定了变量覆盖优先级。valueCache 预留给按边缓存转换结果的场景。

  // 第 3 段：推断数据流依赖——对所有步骤做双指针全量比对
  // 只枚举 i < j 的组合，隐含"数据只能从更早的步骤流向更晚的步骤"这一有向无环假设；
  // 两两组合使复杂度为 O(n²)，每次还要 await 一次语义检查（可能走 LLM/静态分析），n 大时是主要瓶颈。
  async inferDataFlow(steps: TaskStep[]): Promise<DataFlowEdge[]> {
    const inferredEdges: DataFlowEdge[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const sourceStep = steps[i];
        const targetStep = steps[j];
        
        const dataFlow = await this.checkDataFlow(sourceStep, targetStep);
        
        if (dataFlow) {
          inferredEdges.push(dataFlow);
          this.registerDataFlow(dataFlow); // 立即落库，使后续步骤推断时能看到刚建立的依赖
        }
      }
    }
    
    return inferredEdges; // 只返回本轮新推断出的边，不含历史上已注册的边
  }
  
  // 获取步骤的输入数据（包含数据流依赖的值）
  // 第 4 段：为某个待执行步骤组装输入表，分"显式输入"和"数据流输入"两层
  // 先铺显式输入再叠数据流输入，是为了让上游产出能覆盖调用方硬编码的同名默认值；
  // 边界：上游未完成或执行失败时直接跳过该边，不注入任何值（下游可能因此缺参，由调用方兜底）。
  async getStepInputs(
    step: TaskStep, 
    completedSteps: Map<string, StepResult>
  ): Promise<Map<string, any>> {
    const inputs = new Map<string, any>();
    
    // 1. 处理显式输入
    for (const [key, value] of step.explicitInputs) {
      inputs.set(key, value);
    }
    
    // 2. 处理数据流输入
    for (const edge of this.edges) {
      if (edge.targetStep === step.id) {
        const sourceResult = completedSteps.get(edge.sourceStep);
        
        if (sourceResult && sourceResult.success) {
          let value = sourceResult.output;
          
          // 应用数据转换
          if (edge.transformation) {
            value = this.applyTransformation(value, edge.transformation);
          }
          
          inputs.set(edge.variableName, value); // 变量名取自边定义，而非上游 output 的 key
        }
      }
    }
    
    return inputs;
  }
  
  // 第 5 段：转换分发器——把声明式的 DataTransformation 落到具体执行
  // 设计意图是"数据流边只描述怎么转，真正转多久/怎么转由这里集中实现"，便于新增转换类型时只改一处。
  // 易错点：switch 六个分支全部 return 但没有 default，遇到未知 type 会返回 undefined（开启 noImplicitReturns 会直接编译报错），
  // 且 filter/map 直接调用数组方法、custom 直接调用外部函数，对非数组输入或抛异常的函数没有防御。
  private applyTransformation(
    value: any, 
    transformation: DataTransformation
  ): any {
    switch (transformation.type) {
      case 'field_extraction':
        return this.extractField(value, transformation.fieldPath); // 从对象/嵌套结构中按路径取值
        
      case 'filter':
        return value.filter(transformation.filterFn); // 保留满足谓词的元素，结果仍是数组
        
      case 'map':
        return value.map(transformation.mapFn); // 逐元素映射，元素个数不变
        
      case 'aggregate':
        return this.aggregate(value, transformation.aggregationType); // 多值折叠为单值，如 sum/max/avg
        
      case 'type_cast':
        return this.castType(value, transformation.targetType); // 类型适配，负责下游对数据形态的硬性要求
        
      case 'custom':
        return transformation.customFn(value); // 逃生舱：用外部函数处理内置类型覆盖不了的场景
    }
  }
}
```
### 1.3 回滚机制

#### 1.3.1 检查点策略

```typescript
interface Checkpoint {
  id: string;
  stepId: string;
  timestamp: number;
  stateSnapshot: StateSnapshot;
  resourceState: Map<string, ResourceState>;
}

class CheckpointManager {
  private checkpoints: Checkpoint[] = [];
  private stateManager: StateManager;
  private resourceManager: ResourceManager;
  
  async createCheckpoint(step: TaskStep, context: ExecutionContext): Promise<Checkpoint> {
    // 1. 保存状态快照
    const stateSnapshot = this.stateManager.snapshot(step.id);
    
    // 2. 保存资源状态
    const resourceState = await this.resourceManager.captureState();
    
    // 3. 创建检查点
    const checkpoint: Checkpoint = {
      id: generateId(),
      stepId: step.id,
      timestamp: Date.now(),
      stateSnapshot,
      resourceState
    };
    
    this.checkpoints.push(checkpoint);
    
    // 4. 清理旧检查点（保留必要的回滚点）
    this.pruneOldCheckpoints();
    
    return checkpoint;
  }
  
  async rollbackTo(checkpoint: Checkpoint): Promise<RollbackResult> {
    const actions: RollbackAction[] = [];
    
    // 1. 恢复状态
    this.stateManager.restore(checkpoint.stateSnapshot);
    actions.push({ type: 'state_restored', checkpointId: checkpoint.id });
    
    // 2. 恢复资源
    const resourceResult = await this.resourceManager.restoreState(
      checkpoint.resourceState
    );
    actions.push({ type: 'resources_restored', details: resourceResult });
    
    // 3. 清理后续检查点
    const checkpointIndex = this.checkpoints.findIndex(c => c.id === checkpoint.id);
    this.checkpoints = this.checkpoints.slice(0, checkpointIndex + 1);
    
    return {
      success: true,
      restoredCheckpoint: checkpoint,
      actions,
      timestamp: Date.now()
    };
  }
  
  // 智能回滚点选择
  async findOptimalRollbackPoint(
    failedStepId: string, 
    plan: ExecutionPlan
  ): Promise<Checkpoint | null> {
    const failedStepIndex = plan.steps.findIndex(s => s.id === failedStepId);
    
    // 找到最后一个安全的检查点（不影响已成功完成的关键步骤）
    for (let i = this.checkpoints.length - 1; i >= 0; i--) {
      const checkpoint = this.checkpoints[i];
      const checkpointStep = plan.steps.find(s => s.id === checkpoint.stepId);
      
      // 检查点应该是在失败步骤之前
      if (!checkpointStep) continue;
      
      const checkpointIndex = plan.steps.indexOf(checkpointStep);
      
      if (checkpointIndex < failedStepIndex) {
        // 检查是否有步骤依赖于已完成的步骤
        const hasBlockingDependencies = this.hasDependenciesBeyond(
          checkpoint.stepId, 
          failedStepId, 
          plan
        );
        
        if (!hasBlockingDependencies) {
          return checkpoint;
        }
      }
    }
    
    return null;
  }
}
```

#### 1.3.2 补偿事务模式

```typescript
// 第 1 段：定义"可补偿动作"的契约——Saga 模式的最小执行单元
// 每个动作必须自带撤销能力，编排器才可能在失败时回滚；action 与 compensation 都用 Promise<void>，
// 表示"成功即 resolve、失败即 reject"，副作用本身通过闭包捕获，不靠返回值传递。
// 边界约定：compensation 应尽量幂等且不抛错——它可能在部分成功后被调用，抛错会阻断后续回滚。
interface CompensableAction {
  action: () => Promise<void>; // 正向操作，抛异常即视为该步骤失败
  compensation: () => Promise<void>; // 反向操作，语义上应抵消 action 的副作用
  description: string; // 人类可读标识，仅用于日志与排查
}

// 第 2 段：补偿管理器——负责编排的"事务协调者"
// transactionLog 用二维数组按批次分组，是为将来支持嵌套事务/子事务预留的结构；
// 当前实现把执行记录放在方法局部变量里，该字段暂未被写入，属于预留设计。
class CompensationManager {
  private transactionLog: CompensableAction[][] = [];
  
  // 第 3 段：正向串行执行——失败即中止，并对"已成功的前缀"整体回滚
  // 必须串行 await：动作之间通常有依赖（先建目录才能克隆仓库），
  // 也只有严格顺序才能唯一定位"已产生副作用"的那段前缀，作为补偿依据。
  // 复杂度：时间 O(n)、空间 O(n)，n 为动作数，代价主要来自补偿阶段的串行 I/O。
  async executeWithCompensation(
    actions: CompensableAction[]
  ): Promise<CompensationResult> {
    const executed: CompensableAction[] = []; // 只记录真正成功的动作（成功前缀）
    const errors: Error[] = []; // 用数组收集，便于将来扩展为"多错误聚合返回"
    
    for (const action of actions) {
      try {
        await action.action();
        executed.push(action); // 关键：成功后才入栈，保证补偿集合与实际副作用严格对齐
      } catch (error) {
        errors.push(error as Error); // catch 到的是 unknown，这里断言为 Error 以适配返回类型
        
        // 发生错误，执行补偿
        // 这里是"快速失败 + 整体回滚"语义：不补偿尚未执行的动作，因为它们没产生副作用。
        await this.compensate(executed);
        
        return {
          success: false,
          failedAction: action,
          errors,
          compensatedActions: executed.length // 补偿的是已成功的那批，不含当前失败动作
        };
      }
    }
    
    // 全部成功：走快路径，完全不触发补偿，返回零副作用的成功结果
    return {
      success: true,
      executedActions: executed.length
    };
  }
  
  // 第 4 段：逆序补偿——用 LIFO 保证回滚时的依赖关系正确
  // 后执行的动作通常依赖先执行的动作（仓库依赖目录、依赖依赖仓库），
  // 因此必须倒着撤销，否则会出现"先删父目录再删子目录"这类无效或报错的操作。
  // 先复制再 reverse，是为了不破坏调用方传入的数组（executed 后续还要读 length）。
  private async compensate(actions: CompensableAction[]): Promise<void> {
    // 逆序执行补偿操作
    const reversed = [...actions].reverse();
    
    // 关键边界：单个补偿失败不能中断整条回滚链，否则会留下更难清理的中间状态。
    for (const action of reversed) {
      try {
        await action.compensation();
      } catch (compensationError) {
        // 只记录不抛出：尽力而为（best-effort）语义，失败只能靠日志/告警人工介入。
        console.error(
          `补偿操作失败: ${action.description}`,
          compensationError
        );
        // 记录但继续执行其他补偿
      }
    }
  }
}

// 第 5 段：使用示例——用真实业务动作组装一个三段式 Saga
// 这是典型的"构建沙箱"流程：造目录 → 拉代码 → 装依赖，每一步都配好了对应的清理动作；
// 任意一步失败，前面已完成的步骤都会被逆序撤销，最终回到调用前的干净状态。
async function exampleTransaction() {
  const manager = new CompensationManager();
  
  const actions: CompensableAction[] = [
    {
      // 步骤 1：目录是后续所有步骤的物理前提，所以它的补偿是删除整棵目录树
      action: async () => await fileSystem.createDirectory('/temp/project'),
      compensation: async () => await fileSystem.deleteDirectory('/temp/project'),
      description: '创建临时目录'
    },
    {
      // 步骤 2：clone 把内容写进 /temp/project 下，因此只清理 repo 子目录；
      // 易错点：若这里也删父目录，会与步骤 1 的补偿重复，且逆序时先删父目录会连带生效。
      action: async () => await git.cloneRepository('https://github.com/example/repo'),
      compensation: async () => await fileSystem.deleteDirectory('/temp/project/repo'),
      description: '克隆仓库'
    },
    {
      // 步骤 3：install 的副作用（node_modules、缓存等）由 clean 回收；
      // 注意 clean 必须幂等——目录不存在时也不应抛错，否则会阻断后续补偿。
      action: async () => await packageManager.install('/temp/project/repo'),
      compensation: async () => await packageManager.clean('/temp/project/repo'),
      description: '安装依赖'
    }
  ];
  
  // 直接把结果透传给调用方：success/errors/compensatedActions 等字段由编排器统一构造
  return await manager.executeWithCompensation(actions);
}
```
### 1.4 进度追踪

#### 1.4.1 进度计算模型

```typescript
// 第 1 段：定义进度快照的数据契约（对外暴露的只读结构）
// ProgressState 是"某一时刻的进度切片"，把原始的两个 Set（已完成/失败）折算成可直接展示的指标。
// 它被设计成纯数据对象（无方法），便于序列化后经事件总线或 HTTP 传给 UI，避免 UI 反查 plan。
interface ProgressState {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  currentStep: string | null;
  percentComplete: number;
  estimatedTimeRemaining: number | null;
  criticalPathProgress: number;
}

// 第 2 段：私有状态与构造初始化
// 追踪器只持有"引用"（plan/eventEmitter）和"计时事实"（startTime/stepTimings），
// 不保存步骤是否完成——完成状态由调用方传入的 Set 决定，这样追踪器无状态副作用、可重复计算。
class ProgressTracker {
  private plan: ExecutionPlan;
  private startTime: number;
  // key 为 stepId；value 的含义是"可变的"：开始时存绝对时间戳，完成后被覆写成耗时（毫秒）。
  // 这是刻意的复用，但也埋下类型混淆的隐患，见第 4 段。
  private stepTimings: Map<string, number> = new Map();
  private eventEmitter: EventEmitter;
  
  constructor(plan: ExecutionPlan, eventEmitter: EventEmitter) {
    this.plan = plan;
    // 构造即开始计时：整个工作流的"墙钟起点"，用于后续兜底估算单步耗时。
    this.startTime = Date.now();
    this.eventEmitter = eventEmitter;
  }
  
  // 第 3 段：记录单个步骤的开始
  // 只写入起始时间戳并广播事件，不做校验——调用方保证同一 stepId 不会并发 start。
  // 若重复 start，前一次的时间戳会被覆盖，导致该步耗时被低估。
  async recordStepStart(stepId: string): Promise<void> {
    this.stepTimings.set(stepId, Date.now());
    this.eventEmitter.emit('progress:step_start', { stepId });
  }
  
  // 第 4 段：记录单个步骤的结束（成功或失败）
  // 数据流：优先采用执行方上报的 actualDuration；缺失时用"现在 - 开始时间"兜底，
  // 再把该 stepId 的值从"时间戳"改写为"耗时"，形成自校准的历史样本供平均耗时使用。
  // 易错点：actualDuration 为 0 时会因 || 走兜底分支；startTime 为 undefined 时相减得 NaN，
  // 该 NaN 会污染 calculateAverageStepTime，所以调用方必须保证先 start 后 complete。
  async recordStepComplete(
    stepId: string, 
    success: boolean, 
    actualDuration?: number
  ): Promise<void> {
    const startTime = this.stepTimings.get(stepId);
    const duration = actualDuration || (Date.now() - startTime);
    
    this.stepTimings.set(stepId, duration);
    this.eventEmitter.emit('progress:step_complete', { stepId, success, duration });
  }
  
  // 第 5 段：把"完成/失败集合"折算成一份完整进度快照
  // 这是纯粹的聚合计算（O(n + m)），不修改任何内部状态，因此可以在渲染循环里反复调用。
  calculateProgress(
    completedSteps: Set<string>, 
    failedSteps: Set<string>
  ): ProgressState {
    const totalSteps = this.plan.steps.length;
    const completedCount = completedSteps.size;
    const failedCount = failedSteps.size;
    
    // 计算百分比（考虑失败步骤也完成了）
    // 语义：失败也算"已处理"，否则进度条永远到不了 100%。分母为 0 时结果会是 NaN/Infinity，调用方需保证 plan 非空。
    const percentComplete = ((completedCount + failedCount) / totalSteps) * 100;
    
    // 计算剩余时间预估
    // 基于已完成步骤的历史平均耗时做线性外推（ETA），只对"未处理"步骤计数。
    // 局限：不区分步骤权重、忽略重试与关键路径，长尾步骤多时估不准，所以字段允许为 null。
    const avgStepTime = this.calculateAverageStepTime();
    const remainingSteps = totalSteps - completedCount - failedCount;
    const estimatedTimeRemaining = avgStepTime * remainingSteps;
    
    // 计算关键路径进度
    // 与整体百分比分开统计：整体进度可能很高，但真正决定总工期的那条链还没走完。
    const criticalPathProgress = this.calculateCriticalPathProgress(completedSteps);
    
    // 当前步骤 = 第一个尚未进入 completed/failed 的步骤，用于 UI 高亮"正在做什么"。
    const currentStep = this.findCurrentStep(completedSteps, failedSteps);
    
    return {
      totalSteps,
      completedSteps: completedCount,
      failedSteps: failedCount,
      currentStep,
      percentComplete,
      estimatedTimeRemaining,
      criticalPathProgress
    };
  }
  
  // 第 6 段：单独计算关键路径进度
  // 用一个 filter 求"关键路径 ∩ 已完成"的交集大小，再按关键路径自身长度归一化。
  // 边界：criticalPath 为空数组时 length 为 0，会得到 NaN，展示层应把它们当作 0 处理。
  private calculateCriticalPathProgress(completedSteps: Set<string>): number {
    const criticalPath = this.plan.criticalPath || [];
    const completedInCritical = criticalPath.filter(id => completedSteps.has(id));
    
    return (completedInCritical.length / criticalPath.length) * 100;
  }
  
  // 第 7 段：生成面向人（终端/日志）的多行文本报告
  // 思路是先拼"汇总头"，再用 map 把每个步骤渲染成一行；三目运算用符号区分完成/失败/待办。
  // 易错点：三目链的判定顺序是 completed → failed → 其它，所以一个步骤同时出现在两个 Set 里时按"已完成"显示；
  // 另外 lines.join('\n') 是唯一拼接点，保证行数 = 8 行头（含空行）+ steps.length 行。
  generateProgressReport(completedSteps: Set<string>, failedSteps: Set<string>): string {
    // 复用同一套计算逻辑，保证报告与 UI 的数字完全一致（单一数据源）。
    const progress = this.calculateProgress(completedSteps, failedSteps);
    
    const lines = [
      `进度: ${progress.percentComplete.toFixed(1)}%`,
      `已完成: ${progress.completedSteps}/${progress.totalSteps}`,
      `失败: ${progress.failedSteps}`,
      `当前: ${progress.currentStep || '无'}`,
      `预计剩余: ${this.formatDuration(progress.estimatedTimeRemaining)}`,
      `关键路径: ${progress.criticalPathProgress.toFixed(1)}%`,
      '',
      '详细进度:',
      ...this.plan.steps.map(step => {
        const status = completedSteps.has(step.id) ? '' :
                      failedSteps.has(step.id) ? '' : '·';
        return `  ${status} ${step.name}`;
      })
    ];
    
    return lines.join('\n');
  }
}
```
## 2. 完整实现

### 2.1 TypeScript 实现

#### 2.1.1 核心架构

```typescript
// types.ts - 类型定义
// 本文件只承载"契约"：用纯类型描述执行引擎的数据形状，不含任何运行时代码。
// 这样编排器（planner）、调度器（scheduler）、回滚器可以各自实现，却共享同一套结构约定。

// 第 1 段：TaskStep —— 计划中的最小可执行单元，是整条执行链的核心数据模型
// 每个字段都对应执行期的一个决策点：跑什么(type/toolName)、吃什么(inputs)、依赖谁(dependencies)、
// 失败怎么办(onFailure/rollbackAction/retryConfig)。设计上把这些"策略"内聚到步骤里，
// 而非集中在引擎中，是为了让将来新增步骤类型时只需扩展类型、无需改动调度逻辑。
export interface TaskStep {
  id: string;
  name: string;
  description: string;
  // 判别式联合（discriminated union）的判别字段：调度器用 switch(type) 决定执行器分支，
  // 新增种类会在此处报编译错误，从而强制所有分支同步更新，避免静默漏处理。
  type: 'tool_invocation' | 'llm_generation' | 'script_execution' | 
        'conditional_branch' | 'parallel_execution' | 'checkpoint';
  toolName?: string;              // 仅当 type 为 tool_invocation 时有意义，选填而非必填可兼容其他类型
  inputs?: Record<string, any>;   // 运行时入参；键名约定由依赖注入解析，any 是刻意的逃生舱
  outputs?: Record<string, string>; // 把本步骤产出绑定到变量名，供下游步骤按名引用，是数据流的"接线板"
  dependencies: string[];         // 前置步骤 id 列表；构成有向图，调度器据此拓扑排序（含环检测）
  estimatedTime: number;          // 预估耗时（毫秒/秒由调用方约定），用于关键路径与并行批次计算
  requiredCapabilities: string[]; // 能力标签，用于把步骤匹配到具备该能力的执行者/工具
  rollbackAction?: () => Promise<void>; // 补偿函数；只对有副作用且可逆的步骤注入，异步以覆盖网络/IO 回滚
  onFailure?: 'retry' | 'skip' | 'abort' | 'rollback'; // 失败策略；rollback 需与 rollbackAction 同时存在才有效
  retryConfig?: RetryConfig;      // 退避参数；仅在 onFailure === 'retry' 时被读取（定义在别处，此处仅引用）
}

// 第 2 段：ExecutionPlan —— 一次任务规划的整体产物，是引擎的输入快照
// 之所以把 task 原文、steps、dependencies、目标、元数据都装进同一个对象，
// 是为了让计划可序列化、可缓存、可审计：给定 (id, createdAt, validated) 即可判定复用还是重算。
export interface ExecutionPlan {
  id: string;
  task: string;                 // 用户原始诉求，回放/重规划时作为唯一事实来源，避免只存二次加工后的步骤
  steps: TaskStep[];            // 平铺存放全部步骤，图结构靠 id 引用表达而非嵌套，便于增量修改与 diff
  dependencies: Dependency[];   // 与 steps 分离的边集合，支持跨步骤的隐式约束（如同一资源互斥）
  targetGoals: string[];        // 验收目标；执行完毕后按此逐项核验，是"做完"与"做对"的分界
  metadata: PlanMetadata;       // 派生指标，均由 steps/dependencies 计算得出，属于缓存而非真相
  createdAt: number;            // 时间戳，用于 TTL 过期判断与新旧计划对比
  validated: boolean;           // 校验闸门：false 表示尚未做环检测/能力可达性检查，引擎应拒绝直接执行
}

// 第 3 段：Dependency —— 步骤之间的有向边，描述"为什么 B 必须等 A"
// 显式区分 data/control/resource 三类：前者可推导出传参、中者只约束顺序、
// 后者用于资源互斥。criticality 则让调度器在冲突时可权衡——required 不可违反，preferred 只是优化建议。
export interface Dependency {
  type: 'data' | 'control' | 'resource';
  source: string;   // 前驱步骤 id
  target: string;   // 后继步骤 id
  criticality: 'required' | 'preferred';
}

// 第 4 段：StepResult / StepMetadata —— 单步执行的返回值与埋点，双双服务于观测与恢复
// 成功与否、输出或错误、耗时与重试次数在恢复时都不可或缺：
// 只有 metadata 才能判断"是首次超时"还是"重试第三次仍失败"，进而决定继续退避还是止损。
export interface StepResult {
  success: boolean;
  output?: any;         // 成功时存在；失败时通常缺失，调用方必须做空值保护
  error?: Error;        // 失败时存在；保留原始 Error 以持有 stack，便于归因与上报
  metadata: StepMetadata; // 无论成败都必填，是日志、指标、断点续跑的统一来源
}

export interface StepMetadata {
  stepId: string;
  startTime: number;    // 绝对时间戳，用于跨步骤对齐时间线
  endTime: number;      // 失败提前返回时也应尽量填充，避免 duration 计算出现空洞
  duration: number;     // 冗余字段：便于聚合统计时免去相减，但需保证与 endTime-startTime 一致
  attempts: number;     // 从 1 开始计数；与 retryConfig.maxAttempts 比较即可判断是否该放弃
  toolName?: string;    // 记录实际命中的工具，可能因降级/替换而不同于计划中的 toolName
}

// 第 5 段：PlanMetadata —— 计划的派生指标，供调度、预算与风险评估使用
// 这些字段全部可由 steps + dependencies 重建，因此属于缓存：计算成本高（关键路径、批次划分），
// 但一旦 figures 与图不一致就会误导决策，所以更新计划后必须整体重算而非局部修补。
export interface PlanMetadata {
  totalEstimatedTime: number; // 串行上界（或按并行批次折算后的期望值），用于超时预算
  criticalPath: string[];     // 决定最短完工时间的步骤序列；优化时应优先压缩这条路径
  parallelBatches: string[][]; // 按层分组的可并发集合；组内无依赖可并行，组间必须顺序推进
  riskLevel: 'low' | 'medium' | 'high'; // 由不可逆步骤数量、失败策略分布等综合得出的启发式等级
  complexity: number;         // 复杂度分值，通常由步骤数、边数与平均入度拟合，用于选择规划策略
}
```
```typescript
// planner.ts - 规划器实现
import { EventEmitter } from 'events';
import { LLMClient } from './llm-client';

export class Planner extends EventEmitter {
  private llm: LLMClient;
  private decomposer: TaskDecomposer;
  private dependencyAnalyzer: DependencyAnalyzer;
  private validator: PlanValidator;
  
  constructor(config: PlannerConfig) {
    super();
    this.llm = new LLMClient(config.llmConfig);
    this.decomposer = new HierarchicalTaskDecomposer(this.llm);
    this.dependencyAnalyzer = new DependencyAnalyzer(this.llm);
    this.validator = new PlanValidator();
  }
  
  async createPlan(task: string, tools: Tool[]): Promise<ExecutionPlan> {
    this.emit('planner:start', { task });
    
    try {
      // 1. 任务分析
      const analysis = await this.analyzeTask(task);
      
      // 2. 任务分解
      const steps = await this.decomposer.decompose(task, tools, analysis);
      
      // 3. 依赖分析
      const dependencies = await this.dependencyAnalyzer.analyze(steps);
      
      // 4. 构建计划
      const plan = this.buildPlan(task, steps, dependencies);
      
      // 5. 验证计划
      const validation = await this.validator.validate(plan);
      
      if (!validation.valid) {
        // 尝试修复计划
        const fixedPlan = await this.fixPlan(plan, validation.errors);
        this.emit('planner:complete', { plan: fixedPlan, validation });
        return fixedPlan;
      }
      
      this.emit('planner:complete', { plan, validation });
      return plan;
      
    } catch (error) {
      this.emit('planner:error', { error });
      throw error;
    }
  }
  
  private async analyzeTask(task: string): Promise<TaskAnalysis> {
    const prompt = `
      分析以下任务，提供详细的任务理解：
      
      任务：${task}
      
      请提供：
      1. 主要目标
      2. 子目标列表
      3. 约束条件
      4. 成功标准
      5. 预估复杂度 (1-10)
      6. 所需能力
    `;
    
    return await this.llm.structuredOutput(prompt, TaskAnalysisSchema);
  }
  
  private buildPlan(
    task: string, 
    steps: TaskStep[], 
    dependencies: Dependency[]
  ): ExecutionPlan {
    // 计算关键路径
    const graph = new DependencyGraph(steps, dependencies);
    const criticalPath = graph.findCriticalPath();
    
    // 识别并行批次
    const parallelBatches = graph.identifyParallelBatches();
    
    // 计算总预估时间
    const totalEstimatedTime = this.calculateTotalTime(steps, parallelBatches);
    
    return {
      id: generateId(),
      task,
      steps,
      dependencies,
      targetGoals: this.extractGoals(steps),
      metadata: {
        totalEstimatedTime,
        criticalPath,
        parallelBatches,
        riskLevel: this.assessRiskLevel(steps, dependencies),
        complexity: steps.length
      },
      createdAt: Date.now(),
      validated: false
    };
  }
  
  private async fixPlan(
    plan: ExecutionPlan, 
    errors: ValidationError[]
  ): Promise<ExecutionPlan> {
    let fixedPlan = { ...plan };
    
    for (const error of errors) {
      switch (error.code) {
        case 'CIRCULAR_DEPENDENCY':
          fixedPlan = await this.breakCircularDependency(fixedPlan, error);
          break;
          
        case 'MISSING_DEPENDENCY':
          fixedPlan = await this.addMissingDependency(fixedPlan, error);
          break;
          
        case 'INCOMPLETE_GOAL':
          fixedPlan = await this.addMissingSteps(fixedPlan, error);
          break;
          
        default:
          console.warn(`Unknown error type: ${error.code}`);
      }
    }
    
    // 重新验证
    const validation = await this.validator.validate(fixedPlan);
    fixedPlan.validated = validation.valid;
    
    return fixedPlan;
  }
}
```

```typescript
// executor.ts - 执行器实现
export class Executor extends EventEmitter {
  private plan: ExecutionPlan;
  private context: ExecutionContext;
  private stateManager: StateManager;
  private checkpointManager: CheckpointManager;
  private progressTracker: ProgressTracker;
  
  constructor(plan: ExecutionPlan, config: ExecutorConfig) {
    super();
    this.plan = plan;
    this.stateManager = new StateManager();
    this.checkpointManager = new CheckpointManager(
      this.stateManager, 
      config.resourceManager
    );
    this.progressTracker = new ProgressTracker(plan, this);
    
    this.context = this.createContext(config);
  }
  
  async execute(): Promise<ExecutionResult> {
    this.emit('executor:start', { planId: this.plan.id });
    
    const completedSteps = new Set<string>();
    const failedSteps = new Set<string>();
    const stepResults = new Map<string, StepResult>();
    
    // 按拓扑排序执行
    const graph = new DependencyGraph(this.plan.steps, this.plan.dependencies);
    const executionOrder = graph.topologicalSort();
    
    for (const stepId of executionOrder) {
      const step = this.plan.steps.find(s => s.id === stepId)!;
      
      // 等待依赖完成
      await this.waitForDependencies(step, completedSteps);
      
      this.emit('executor:step_start', { step });
      
      const result = await this.executeStep(step);
      stepResults.set(step.id, result);
      
      if (result.success) {
        completedSteps.add(step.id);
        this.progressTracker.recordStepComplete(step.id, true, result.metadata.duration);
      } else {
        failedSteps.add(step.id);
        this.progressTracker.recordStepComplete(step.id, false);
        
        const handleResult = await this.handleStepFailure(step, result, completedSteps);
        
        if (handleResult.action === 'abort') {
          return {
            success: false,
            completedSteps: [...completedSteps],
            failedSteps: [...failedSteps, step.id],
            stepResults,
            error: handleResult.error
          };
        } else if (handleResult.action === 'rollback') {
          // 回滚逻辑
          return handleResult.rollbackResult;
        }
        // skip 或 retry 继续
      }
    }
    
    return {
      success: failedSteps.size === 0,
      completedSteps: [...completedSteps],
      failedSteps: [...failedSteps],
      stepResults,
      finalState: this.stateManager.getCurrentState()
    };
  }
  
  private async executeStep(step: TaskStep): Promise<StepResult> {
    const startTime = Date.now();
    let attempts = 0;
    const retryConfig = step.retryConfig || { maxAttempts: 3, backoff: 'exponential' };
    
    while (attempts < retryConfig.maxAttempts) {
      attempts++;
      
      try {
        // 创建检查点
        const checkpoint = await this.checkpointManager.createCheckpoint(step, this.context);
        
        // 执行步骤
        const result = await this.executeStepCore(step);
        
        return {
          success: true,
          output: result.output,
          metadata: {
            stepId: step.id,
            startTime,
            endTime: Date.now(),
            duration: Date.now() - startTime,
            attempts,
            toolName: step.toolName
          }
        };
        
      } catch (error) {
        console.error(`Step ${step.name} failed (attempt ${attempts}):`, error);
        
        if (attempts >= retryConfig.maxAttempts) {
          return {
            success: false,
            error: error as Error,
            metadata: {
              stepId: step.id,
              startTime,
              endTime: Date.now(),
              duration: Date.now() - startTime,
              attempts
            }
          };
        }
        
        // 等待后重试
        const backoffDelay = this.calculateBackoff(retryConfig, attempts);
        await this.delay(backoffDelay);
      }
    }
    
    throw new Error('Max retry attempts exceeded');
  }
  
  private async handleStepFailure(
    step: TaskStep,
    result: StepResult,
    completedSteps: Set<string>
  ): Promise<FailureHandlingResult> {
    switch (step.onFailure) {
      case 'retry':
        // 已经在 executeStep 中处理
        return { action: 'continue' };
        
      case 'skip':
        this.emit('executor:step_skipped', { step, error: result.error });
        return { action: 'continue' };
        
      case 'rollback':
        const rollbackPoint = await this.checkpointManager.findOptimalRollbackPoint(
          step.id, 
          this.plan
        );
        
        if (rollbackPoint) {
          const rollbackResult = await this.checkpointManager.rollbackTo(rollbackPoint);
          return { action: 'rollback', rollbackResult };
        }
        
        return { 
          action: 'abort', 
          error: new Error('Cannot find rollback point') 
        };
        
      case 'abort':
      default:
        return { 
          action: 'abort', 
          error: result.error 
        };
    }
  }
}
```

#### 2.1.2 Agent 主类

```typescript
// agent.ts - Plan-and-Execute Agent 主类
// 第 1 段：类声明与成员字段（定义 Agent 的组成部件与依赖）
// Plan-and-Execute 范式的核心思想是"先规划、再执行"：把 LLM 的推理与工具调用拆成两个阶段，
// 避免长任务中模型"边想边做"导致的上下文漂移。因此本类持有一个 planner 与一个 executor。
export class PlanExecuteAgent {
  private planner: Planner;        // 负责把自然语言任务拆解成结构化步骤列表
  private executor: Executor;      // 负责逐步执行 planner 产出的计划，并可回调 planner 做动态重规划
  private config: AgentConfig;     // 全局配置：planner/executor 各自的子配置、可用工具集等
  private eventEmitter: EventEmitter; // 对外统一事件出口，屏蔽内部 planner/executor 的事件细节
  
  // 第 2 段：构造函数（依赖注入 + 装配 + 事件接线）
  // 用 config 的不同子字段分别构造内部组件，做到"配置隔离"：planner 与 executor 互不感知对方配置。
  // executor 依赖 planner 实例，是为了在步骤失败时能请求重新规划（re-plan），这是本范式抗错的关键。
  constructor(config: AgentConfig) {
    this.config = config;                                  // 保存原始配置，run() 中取 tools 时仍需使用
    this.eventEmitter = new EventEmitter();                 // 创建对外事件总线，供 on/off 注册的监听者消费
    
    this.planner = new Planner(config.planner);             // 用 planner 专属配置构造规划器
    this.executor = new Executor(this.planner, config.executor); // 注入 planner，支持执行中动态重规划
    
    this.setupEventHandlers();                              // 必须在此处完成事件转发，否则 run 早期的 emit 会丢失
  }
  
  // 第 3 段：内部事件转发（把两个子组件的事件"翻译"成对外语义）
  // 设计意图是「适配器模式」：外部只依赖 plan_created / step_progress / execution_complete 这套稳定接口，
  // 内部 planner/executor 的事件名可自由重构而不会破坏调用方。注意每次转发都要解构出真正的载荷。
  private setupEventHandlers(): void {
    // planner 完成规划 -> 对外通知计划已就绪，只透出 plan 本体（其余元数据不外泄）
    this.planner.on('planner:complete', (data) => {
      this.eventEmitter.emit('plan_created', data.plan);
    });
    
    // executor 每完成一步 -> 转为进度事件，data 原样透传以保留 step 索引、结果、耗时等细节
    this.executor.on('executor:step_complete', (data) => {
      this.eventEmitter.emit('step_progress', data);
    });
    
    // executor 全部执行完毕 -> 通知整体完成，便于调用方在 run 的 Promise 之外做流式 UI 更新
    this.executor.on('executor:complete', (data) => {
      this.eventEmitter.emit('execution_complete', data);
    });
  }
  
  // 第 4 段：主入口 run（编排"规划 -> 执行 -> 汇总"三阶段并统一错误出口）
  // 这是唯一的异步边界：内部 planner/executor 无论内部实现如何，最终都被 await 收敛成一个 AgentResult。
  // 关键点：所有异常在此被捕获并降级为 success:false 的结果对象，保证调用方永远拿到返回值而非抛错。
  async run(task: string): Promise<AgentResult> {
    this.eventEmitter.emit('agent:start', { task });    // 先发开始事件，让订阅者能立刻展示"正在处理"
    
    try {
      // 规划阶段
      // 把可用工具集显式传给 planner：规划时的工具能力边界必须与执行时完全一致，
      // 否则模型可能规划出执行器无法完成的步骤（典型易错点：规划用全集、执行用子集）。
      const plan = await this.planner.createPlan(task, this.config.tools);
      
      // 执行阶段
      // 只接收 plan 作为输入，执行阶段不再接触原始 task，避免执行器"重新理解需求"而导致与计划偏离。
      const executionResult = await this.executor.execute(plan);
      
      // 汇总阶段：保持 plan 原始引用便于调用方审计"计划 vs 实际"
      return {
        success: executionResult.success,               // 成功与否完全由执行结果决定，规划成功不等于任务成功
        plan,
        execution: executionResult,
        summary: this.generateSummary(executionResult)  // 生成人类可读摘要，供日志/前端展示
      };
      
    } catch (error) {
      // 边界条件：规划阶段或执行阶段的任何异常都走这里；这里不再向上抛，而是返回结构化失败结果。
      // 注意 error 类型为 unknown，交给调用方前用 as Error 收窄，并只取 message 生成摘要。
      this.eventEmitter.emit('agent:error', { error });
      return {
        success: false,
        error: error as Error,
        summary: `Agent 执行失败: ${(error as Error).message}`
      };
    }
  }
  
  // 第 5 段：对外事件订阅 API（薄封装，暴露受控的观察点）
  // 直接用 EventEmitter 的事件名透传，不做白名单校验：给调用方最大灵活性，
  // 代价是拼错事件名时静默失效，可通过类型化事件名（keyof）在后续版本改进。
  on(event: string, handler: (data: any) => void): void {
    this.eventEmitter.on(event, handler);
  }
  
  // 提供 off 是为了让长生命周期进程能解绑监听器，防止 handler 闭包引用导致的组件无法被 GC（内存泄漏）。
  off(event: string, handler: (data: any) => void): void {
    this.eventEmitter.off(event, handler);
  }
}
```
### 2.2 LangChain 实现

#### 2.2.1 LangChain 风格的 Agent

```typescript
// langchain-agent.ts
import { 
  Agent, 
  AgentExecutor, 
  AgentStep,
  BaseMessage,
  HumanMessage,
  AIMessage,
  Tool
} from '@langchain/core/language_models';
import { ChainValues } from '@langchain/core/utils/chaining';

interface PlanExecuteState {
  plan: Plan | null;
  currentStepIndex: number;
  completedSteps: string[];
  failedSteps: string[];
  stepResults: Map<string, any>;
}

class PlanExecuteAgentState {
  state: PlanExecuteState;
  
  constructor() {
    this.state = {
      plan: null,
      currentStepIndex: 0,
      completedSteps: [],
      failedSteps: [],
      stepResults: new Map()
    };
  }
  
  updatePlan(plan: Plan): void {
    this.state.plan = plan;
  }
  
  markStepComplete(stepId: string, result: any): void {
    this.state.completedSteps.push(stepId);
    this.state.stepResults.set(stepId, result);
    this.state.currentStepIndex++;
  }
  
  markStepFailed(stepId: string, error: any): void {
    this.state.failedSteps.push(stepId);
    this.state.stepResults.set(stepId, { error });
  }
}

// Plan 节点
const planNode = async (state: PlanExecuteAgentState): Promise<PlanExecuteState> => {
  const lastMessage = state.messages[state.messages.length - 1];
  const task = (lastMessage as HumanMessage).content;
  
  // 调用规划器
  const plan = await planner.createPlan(task, tools);
  
  return {
    ...state.state,
    plan
  };
};

// 执行节点
const executeNode = async (state: PlanExecuteAgentState): Promise<PlanExecuteAgentState> => {
  const { plan, currentStepIndex, completedSteps, failedSteps } = state.state;
  
  if (!plan) {
    throw new Error('No plan available');
  }
  
  const currentStep = plan.steps[currentStepIndex];
  
  if (!currentStep) {
    // 所有步骤完成
    return state.state;
  }
  
  try {
    // 执行当前步骤
    const result = await executor.executeStep(currentStep);
    
    const newState = { ...state.state };
    if (result.success) {
      newState.completedSteps = [...completedSteps, currentStep.id];
      newState.stepResults.set(currentStep.id, result.output);
    } else {
      newState.failedSteps = [...failedSteps, currentStep.id];
      newState.stepResults.set(currentStep.id, { error: result.error });
    }
    
    return newState;
    
  } catch (error) {
    return {
      ...state.state,
      failedSteps: [...failedSteps, currentStep.id]
    };
  }
};

// 判断是否继续执行
const shouldContinue = (state: PlanExecuteAgentState): string => {
  const { plan, currentStepIndex, failedSteps } = state.state;
  
  // 如果有失败且是必需的步骤，停止
  if (failedSteps.length > 0) {
    const currentStep = plan?.steps[currentStepIndex];
    if (currentStep?.onFailure === 'abort') {
      return 'stop';
    }
  }
  
  // 如果计划已完成
  if (!plan || currentStepIndex >= plan.steps.length) {
    return 'stop';
  }
  
  return 'continue';
};

// LangGraph 图定义
const workflow = new StateGraph({
  stateSchema: PlanExecuteAgentState,
  configSchema: z.object({})
})
  .addNode('planner', planNode)
  .addNode('executor', executeNode)
  .addEdge('__start__', 'planner')
  .addEdge('planner', 'executor')
  .addConditionalEdges('executor', shouldContinue, {
    continue: 'executor',
    stop: '__end__'
  })
  .compile();

export const agent = new AgentExecutor({
  agent: workflow,
  tools
});
```

#### 2.2.2 自定义 Tool 集成

```typescript
// langchain-tools.ts
// 第 1 段：依赖导入与工具元信息声明（把"计划-执行"能力包装成 LangChain 可识别的工具）
import { StructuredTool, z } from '@langchain/core/tools';
import { ToolExecutor } from './executor';

export class PlanExecuteTool extends StructuredTool {
  // name/description 是给 LLM 看的"接口文档"：模型靠 description 判断何时调用本工具，
  // 因此这里刻意强调"复杂多步任务"与"输入应为详细任务描述"，引导模型正确路由。
  name = 'plan_execute';
  description = 'Use this tool to plan and execute complex multi-step tasks. Input should be a detailed description of the task you want to accomplish.';
  
  // 第 2 段：入参 Schema（用 zod 做运行时校验 + 自动转成 LLM 的函数签名）
  // options 整体是可选的，内部字段也各自 optional，形成"三层可选"：
  // 模型只传 task 也能跑，是否传 maxSteps/timeout/failFast 由模型按任务复杂度自行决定。
  schema = z.object({
    task: z.string().describe('The task to plan and execute'),
    options: z.object({
      maxSteps: z.number().optional().describe('Maximum number of steps'),
      timeout: z.number().optional().describe('Timeout in milliseconds'),
      failFast: z.boolean().optional().describe('Stop on first failure')
    }).optional()
  });
  
  // 第 3 段：构造器依赖注入（把 Agent 实例交给工具持有）
  // 用参数属性 private agent 注入而非在内部 new，是为了让工具可被单测替换/复用同一个 Agent 状态。
  constructor(private agent: PlanExecuteAgent) {
    super();
  }
  
  // 第 4 段：流式事件通道（试图把 Agent 的中间进度增量推给上游）
  // 注意：AsyncGenerator 只能由生成器函数体本身 yield，在其内部注册的回调里写 yield 属于语法/语义错误，
  // 且 run() 是 await 一轮跑完后才注册监听，事件早已错过——正确做法是 yield* 转发一个 AsyncIterable。
  async *_streamEvents(input: z.infer<typeof this.schema>): AsyncGenerator<any> {
    const result = await this.agent.run(input.task);
    
    // 流式返回进度
    this.agent.on('step_progress', (data) => {
      yield {
        event: 'step_progress',
        data
      };
    });
    
    return result;
  }
  
  // 第 5 段：同步调用路径（LangChain 工具的实际执行入口）
  // 关键数据流：input.task -> agent.run() -> 只把"结论性字段"序列化成字符串回给 LLM，
  // 而不是把整个执行轨迹塞回去，避免上下文膨胀；缩进 2 空格是为了让模型更易读 JSON。
  async call(input: z.infer<typeof this.schema>): Promise<string> {
    const result = await this.agent.run(input.task);
    
    return JSON.stringify({
      success: result.success,
      summary: result.summary,
      completedSteps: result.execution.completedSteps,
      failedSteps: result.execution.failedSteps
    }, null, 2);
  }
}

// 第 6 段：工厂函数——把 Agent 实例与工具绑定，并组装成可对外使用的 Agent
// 注册工具到 LangChain
// systemMessage 里内置了"路由策略"：简单任务直答、复杂任务才调工具，这是降低工具误调用率的关键手段；
// 边界条件：config.llm 必须已配置，否则 Agent.fromTools 会在运行期才报错（属于延迟失败点）。
export const createLangChainAgent = (config: AgentConfig) => {
  const agent = new PlanExecuteAgent(config);
  const tool = new PlanExecuteTool(agent);
  
  return Agent.fromTools([tool], {
    llm: config.llm,
    systemMessage: `你是一个智能助手，可以使用 plan_execute 工具来规划和执行复杂任务。
    
    使用指南：
    1. 对于简单的单步任务，直接回答
    2. 对于复杂的多步任务，使用 plan_execute 工具
    3. 在调用工具时，提供详细的任务描述`
  });
};
```
### 2.3 状态机设计

#### 2.3.1 Agent 状态机

```typescript
// state-machine.ts
enum AgentState {
  IDLE = 'idle',
  PLANNING = 'planning',
  PLAN_VALIDATED = 'plan_validated',
  PLAN_INVALID = 'plan_invalid',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

enum AgentEvent {
  START = 'START',
  PLAN_CREATED = 'PLAN_CREATED',
  PLAN_VALID = 'PLAN_VALID',
  PLAN_INVALID = 'PLAN_INVALID',
  PLAN_FIXED = 'PLAN_FIXED',
  STEP_START = 'STEP_START',
  STEP_COMPLETE = 'STEP_COMPLETE',
  STEP_FAILED = 'STEP_FAILED',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  COMPLETE = 'COMPLETE',
  ABORT = 'ABORT'
}

interface StateTransition {
  from: AgentState[];
  event: AgentEvent;
  to: AgentState;
  guard?: (context: AgentContext) => boolean;
  action?: (context: AgentContext) => Promise<void>;
}

class AgentStateMachine {
  private state: AgentState = AgentState.IDLE;
  private context: AgentContext;
  private transitions: StateTransition[];
  private listeners: Map<AgentState, Function[]>;
  
  constructor(context: AgentContext) {
    this.context = context;
    this.transitions = this.defineTransitions();
    this.listeners = new Map();
  }
  
  private defineTransitions(): StateTransition[] {
    return [
      {
        from: [AgentState.IDLE],
        event: AgentEvent.START,
        to: AgentState.PLANNING
      },
      {
        from: [AgentState.PLANNING],
        event: AgentEvent.PLAN_CREATED,
        to: AgentState.PLAN_VALIDATED
      },
      {
        from: [AgentState.PLAN_VALIDATED],
        event: AgentEvent.PLAN_VALID,
        to: AgentState.EXECUTING,
        action: async (ctx) => {
          await ctx.executor.execute();
        }
      },
      {
        from: [AgentState.PLAN_VALIDATED],
        event: AgentEvent.PLAN_INVALID,
        to: AgentState.PLAN_INVALID
      },
      {
        from: [AgentState.PLAN_INVALID],
        event: AgentEvent.PLAN_FIXED,
        to: AgentState.PLAN_VALIDATED,
        guard: (ctx) => ctx.validation.valid
      },
      {
        from: [AgentState.EXECUTING, AgentState.PAUSED],
        event: AgentEvent.STEP_COMPLETE,
        to: AgentState.EXECUTING,
        action: async (ctx) => {
          if (ctx.isPlanComplete()) {
            ctx.triggerEvent(AgentEvent.COMPLETE);
          } else {
            await ctx.executeNextStep();
          }
        }
      },
      {
        from: [AgentState.EXECUTING],
        event: AgentEvent.STEP_FAILED,
        to: AgentState.EXECUTING,
        guard: (ctx) => ctx.currentStep.onFailure !== 'abort',
        action: async (ctx) => {
          await ctx.handleStepFailure();
        }
      },
      {
        from: [AgentState.EXECUTING],
        event: AgentEvent.STEP_FAILED,
        to: AgentState.FAILED,
        guard: (ctx) => ctx.currentStep.onFailure === 'abort'
      },
      {
        from: [AgentState.EXECUTING],
        event: AgentEvent.PAUSE,
        to: AgentState.PAUSED
      },
      {
        from: [AgentState.PAUSED],
        event: AgentEvent.RESUME,
        to: AgentState.EXECUTING
      },
      {
        from: [AgentState.EXECUTING],
        event: AgentEvent.COMPLETE,
        to: AgentState.COMPLETED
      },
      {
        from: [AgentState.EXECUTING, AgentState.PAUSED, AgentState.PLANNING],
        event: AgentEvent.ABORT,
        to: AgentState.FAILED
      }
    ];
  }
  
  async transition(event: AgentEvent): Promise<void> {
    const validTransitions = this.transitions.filter(t => 
      t.from.includes(this.state) && t.event === event
    );
    
    for (const transition of validTransitions) {
      if (!transition.guard || transition.guard(this.context)) {
        const previousState = this.state;
        this.state = transition.to;
        
        if (transition.action) {
          await transition.action(this.context);
        }
        
        this.notifyListeners(previousState, this.state, event);
        return;
      }
    }
    
    throw new Error(`Invalid transition: ${event} from ${this.state}`);
  }
  
  getState(): AgentState {
    return this.state;
  }
  
  onStateChange(listener: (from: AgentState, to: AgentState, event: AgentEvent) => void): void {
    const stateKey = this.state;
    if (!this.listeners.has(stateKey)) {
      this.listeners.set(stateKey, []);
    }
    this.listeners.get(stateKey)!.push(listener);
  }
  
  private notifyListeners(from: AgentState, to: AgentState, event: AgentEvent): void {
    const stateListeners = this.listeners.get(to) || [];
    for (const listener of stateListeners) {
      listener(from, to, event);
    }
  }
}
```

#### 2.3.2 可视化状态图

```
Agent 状态转换图：

                    ┌──────────────────────────────────────────┐
                    │                                          │
                    ▼                                          │
              ┌──────────┐                                     │
              │   IDLE   │──────┐                               │
              └──────────┘      │                               │
                               START                            │
                               ▼                                │
                    ┌──────────────────┐                        │
                    │     PLANNING     │                        │
                    └──────────────────┘                        │
                               │                                │
                         PLAN_CREATED                           │
                               ▼                                │
              ┌────────────────────────────────────┐            │
              │                                    │            │
              ▼                                    │            │
    ┌─────────────────┐              ┌─────────────▼───────────┐│
    │  PLAN_VALIDATED │─────────────▶│    PLAN_INVALID       ││
    └────────┬────────┘              │         │               ││
             │                       │    PLAN_FIXED           ││
             │                       │         │               ││
             │                       └─────────┼───────────────┘│
             │                                 │               │
    PLAN_VALID                                PLAN_CREATED      │
             │                                 │               │
             ▼                                 │               │
    ┌──────────────────┐                       │               │
    │    EXECUTING     │◀──────────────────────┘               │
    └────────┬────────┘                       ▲                │
             │                                │                │
    ┌────────┴────────┐                       │                │
    │                 │                       │                │
    ▼                 ▼                       │                │
┌─────────┐    ┌──────────────┐               │                │
│STEP_COMPLETE   │  STEP_FAILED │              │                │
└────┬────┘    └──────┬───────┘               │                │
     │                 │                       │                │
     │     ┌───────────┴───────────┐           │                │
     │     │                       │           │                │
     │     ▼                       ▼           │                │
     │  ABORT                    ABORT         │                │
     │     │                       │           │                │
     │     ▼                       ▼           │                │
     │ ┌────────┐            ┌────────┐       │                │
     │ │ FAILED  │            │RETRY/SKIP      │                │
     │ └────────┘            └────┬────┘       │                │
     │                              │           │                │
     │                              ▼           │                │
     │                         (继续执行)        │                │
     │                              │           │                │
     │                              │           │                │
     │                              ▼           │                │
     │                         (下一个步骤)────┘                │
     │                              │                          │
     │                         COMPLETE                       │
     │                              │                          │
     │                              ▼                          │
     │                        ┌──────────┐                      │
     └───────────────────────▶│ COMPLETED│                      │
                    COMPLETE  └──────────┘                      │
                                                                 │
    ┌────────────────────────────────────────────────────────────┘
    │
    ▼
(任意状态)
    │
  ABORT
    │
    ▼
┌────────┐
│ FAILED │
└────────┘
```

## 应用与行业实践

前面两节讲的是执行器怎么设计、怎么拼出完整实现。这一节回答另一个问题：这些代码在真实项目里落在哪些位置。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格批量改状态 | 工具注册表 + 分批执行循环 | 前端虚拟滚动 + 后端批量接口 | 批次大小写进计划，单批失败要能定位到行 |
| 低端安卓机的首屏加载归因 | 超时与降级分支 | 本地规则执行器 + 启动埋点 | 冷启动预算按设备分档，超时走缓存分支 |
| 多人协作白板 | 并发执行与回填顺序 | CRDT + WebSocket | 回填带版本号，乱序结果不能覆盖新状态 |
| 客服工单生成回复草稿 | 审批中断 + 幂等键 | 工作流引擎 + 工单 API | 重试前查幂等键，避免重复发信 |
| 数据仓库夜间分区补数 | 断点续传 + 重试退避 | 调度器 + 分区元数据表 | 断点记到分区粒度，重跑跳过已完成分区 |
| CI 里的代码审查助手 | 并行工具调用 + 只读白名单 | 容器沙箱 + 静态检查 CLI | 并行数受 runner 数限制，超时后输出部分结论 |
| 跨境电商批量上架 | 步骤状态机 + 失败隔离 | 平台开放接口 + 队列 | 单条失败不终止整批，状态落库 |
| 仓库机器人拣货指令下发 | 执行器与规划器解耦 | 任务队列 + 设备指令协议 | 指令带序列号，设备离线时先缓存 |

### 三个场景拆解

#### 场景 1：客服工单的批量草稿与人工放行

**业务背景**

客服台一次要处理同主题的工单几百到几千条，逐条点开、复制、粘贴会耗掉整段时间。

量级可以自测：取同一批工单跑两遍人工流程，记录总耗时和条数，画出耗时随条数增长的曲线。

**怎么用本页知识解决**

思路是把"读工单、查知识库、写草稿、发信"拆成四步，前三步交给执行器自动跑，发信这一步挂起等人工确认。执行器按名字从注册表取工具，每步结果落库，进程重启后从没做完的那一步接着跑。

```python
def run_task(task, tools, store):
    # 状态落库，进程重启后可按 step_id 续跑
    for step in task.steps:
        if store.done(task.id, step.id):        # 已完成的步骤直接跳过，重复投递不产生副作用
            continue
        if step.needs_approval and not step.approved:
            store.pause(task.id, step.id)       # 挂起，等人工放行后从这一步继续
            return "paused"
        try:
            out = tools[step.name](**step.args) # 按名字查注册表分发，不写 if/else 长分支
        except TimeoutError:
            store.retry_later(task.id, step.id) # 超时按退避重排，不阻塞后面的步骤
            continue
        store.mark_done(task.id, step.id, out)  # 结果落库，供后续步骤和审计读取
    return "done"
```

- 注册表把工具名和函数对上，加工具只改注册表，不动循环。
- `store.done` 就是幂等键的检查点，重复投递同一任务不会重复发信。
- 超时不动整个任务，只重排这一步，其余步骤照常往下走。
- 挂起状态进数据库，人工放行后从同一步开始，前面的结果不重算。
- 每步结果落库后可回放，排查时能看见该步的输入和输出。

**怎么度量收益**

指标：任务端到端耗时（OpenTelemetry 里 `task.run` span 的 p95）、挂起等待时长（自定义计数 `task_paused_seconds`）、步骤重试次数（`step_retry_total`）。

测量方法：预发环境投同一批工单两次，一次开人工放行、一次全自动，在 Grafana 里按 task_id 对比两条曲线。

**什么时候不该用**

- 工单数量长期只有个位数，落库、幂等键、挂起状态的维护成本高于省下的时间。
- 每步都要人判断口径（例如法务回复），自动跑前三步只会产出要丢弃的草稿。

#### 场景 2：数据仓库夜间分区补数

**业务背景**

上游一张表延迟到达，凌晨的补数计划会列出几百个待重跑分区，逐个分区跑 SQL 再加等待，容易拖到天亮还没跑完。

分区规模可以复现：先查分区元数据表里当天的分区条数，再乘单分区平均耗时，得出总时长量级。

**怎么用本页知识解决**

思路是规划器给出分区清单，执行器按清单调度。执行器只做三件事：已产出的分区跳过，可重试错误退避重试，并发数用信号量卡住。

```python
async def run_plan(plan, pool, sem):
    async def one(step):
        async with sem:                          # 信号量限制并发，避免打满上游数据库
            if await done(step): return          # 分区已产出则跳过，重跑不重复写
            try:
                return await pool.call(step)     # 走连接池调用，超时与重试在一处配置
            except Transient:
                await sleep(step.backoff)        # 只对可重试错误退避，其他错误直接抛
                return await one(step)
    results = await gather(*(one(s) for s in plan), return_exceptions=True)
    failed = [s for s, r in zip(plan, results) if isinstance(r, Exception)]
    return failed                                # 失败分区清单写回，供下一轮补跑
```

- `done` 读的是分区元数据表，完成后写同一张表，执行器不持有真值。
- 信号量上限按上游库的连接数定，改一个数字就能把压力压回来。
- 只对 `Transient` 退避，语法错误这类不可重试错误立刻暴露。
- `return_exceptions=True` 让单个分区失败不打断整批。
- 返回的失败清单直接落库，下一轮补跑只读这张表。

**怎么度量收益**

指标：补数完成率（成功分区数 ÷ 计划分区数）、单分区时长（调度器 task instance duration 的 p95）、重试次数、上游连接数峰值。

测量方法：同一份分区清单跑两遍，一遍并发为 1，一遍按设定的并发上限，对比总时长和连接数峰值。PostgreSQL 侧用 `pg_stat_activity` 观察连接数。

**什么时候不该用**

- 分区只有几十个、单个分区秒级完成，全量重跑比维护断点表省事。
- 分区之间有严格先后依赖（后一分区读前一分区结果），并发调度会破坏顺序，此时串行加断点即可。

#### 场景 3：多人协作白板的分步回填

**业务背景**

白板上多人同时拖拽，AI 建议又会一次下发多个图形元素，客户端逐步应用后回填到共享状态。

并发回填碰上网络乱序，会让旧结果覆盖刚画好的新元素。

**怎么用本页知识解决**

思路是执行器并发跑各步骤，回填时比较元素版本号，旧版本直接丢弃。

```js
async function applySteps(steps, state) {
  const seen = new Map();                    // 元素 id 到已应用的最高版本号
  await Promise.all(steps.map(async (s) => {
    const r = await tools[s.name](s.args);   // 工具按注册表分发，各步骤并行执行
    if (r.version <= (seen.get(r.id) ?? 0)) return; // 旧版本结果丢弃，防止乱序覆盖
    seen.set(r.id, r.version);               // 记住已应用的最高版本
    state.apply(r);                          // 回填共享状态，订阅者随后重绘
  }));
}
```

- 版本号由规划阶段写进步骤参数，执行器只做比较，不生成版本。
- 用 Map 记已应用版本，这段逻辑不绑定具体 CRDT 实现。
- 并行执行缩短总等待，回填顺序由版本号决定，不由完成时间决定。
- 回填集中在 `state.apply` 一处，方便加埋点看每次回填的来源。

**怎么度量收益**

指标：回填延迟（`performance.now()` 从收到结果到重绘完成的差值）、Long Task 数量、WebSocket 消息积压长度。

测量方法：用 Chrome DevTools 的 Performance 面板录一段带并发的协作操作，对比加版本号前后 Long Task 数量与回填延迟的 p95。

**什么时候不该用**

- 单人使用或同一时刻只有一条写入通道，版本号比较是多出来的开销。
- 各步骤结果可交换且无覆盖关系（例如只改颜色），用集合合并语义即可。

### 行业先进实践

**编排者-工作者分工（出处：Anthropic 官方工程博客 Building effective agents）**

主流程写成编排者，只负责拆任务和汇总结果；子任务交给不共享上下文的工作者执行。单步的输入输出规模小，出错时只重跑那一步。借鉴方式：把"生成步骤列表"和"执行单个步骤"写成两个函数，参数只传当前步骤需要的字段。

**检查点与人工中断（出处：LangGraph 官方文档 Persistence）**

框架把每步状态存进 checkpointer，按 thread_id 恢复，遇到 interrupt 就停下等人。长任务因此能跨进程、跨天继续，人工介入点不写死在代码里。借鉴方式：你的 store 至少落三样东西，步骤 id、状态、结果。

**Activity 重试策略与工作流确定性（出处：Temporal 官方文档）**

Temporal 把重试参数（最大尝试次数、退避系数）配在 Activity 上，同时要求工作流代码保持确定性。重试不污染编排逻辑，回放历史事件就能重建状态。借鉴方式：重试配置写进工具的元数据，执行循环只读不判断。

**重试上限与截止时间（出处：Kubernetes 官方文档 Jobs）**

Job 用 backoffLimit 限制重试次数，用 activeDeadlineSeconds 限制总时长，超限就标记失败。两个上限把"卡住不退出的任务"变成可观测的失败。借鉴方式：给任务加一个总预算字段，执行循环每步检查一次。

**状态机上的 Retry 与 Catch（出处：AWS Step Functions 官方文档 Error handling）**

ASL 允许在单个状态上写 Retry（含 MaxAttempts、BackoffRate）和 Catch，把错误分流到别的状态。错误处理贴着步骤写，读代码时不用翻全局配置。借鉴方式：把 `except` 分支按错误类型分开，不可重试的错误走另一条步骤链。

### 从学到用：落地路线

1. 试点：选一个步骤数少于 10、失败后可人工重跑的任务接进执行器。验收标准：该任务连续跑 20 次，每次都留下完整步骤记录。
2. 验证：给这个任务注入两类故障，一次工具超时、一次进程中途退出，观察它能否续跑。验收标准：两类故障下任务都能从失败步骤恢复，且没有重复副作用。
3. 推广：把注册表、状态存储、重试配置抽成公共模块，新任务只写工具函数和步骤清单。验收标准：新增一个任务只改两个文件，不改执行循环。
4. 防回退：把步骤记录、重试次数、挂起时长接进监控，给关键任务配一条告警。验收标准：连续四周内，任何一次任务失败都能从监控里定位到具体步骤。

### 动手作业

**目标**：用 Python 标准库写一个迷你执行器，支持工具注册、状态落盘、超时、重试、断点续跑。

**步骤**

1. 定义 `Step` 数据结构，字段包含 id、工具名、参数、是否需人工放行。
2. 写一个注册表，用装饰器把函数按名字登记，例如 `@register("read_ticket")`。
3. 写执行循环：先查状态，已完成的跳过，需放行且未放行的挂起。
4. 用 `concurrent.futures` 提交工具调用，在 `future.result(timeout=...)` 处设超时，把 `TimeoutError` 交给退避逻辑。
5. 把步骤状态写进 SQLite，进程退出后用同一任务 id 再跑一次，验证只执行未完成的步骤。
6. 造 5 个假工具：两个正常返回、一个必超时、一个前两次抛错第三次成功、一个必失败。
7. 跑一遍完整任务，导出步骤记录，检查失败清单与重试次数。

**验收标准**

- 同一任务跑两次，第二次只执行第一次未完成的步骤，日志里能看到跳过记录。
- 必超时的工具触发超时分支，任务其余步骤照常完成。
- 前两次抛错的工具第三次成功，重试次数记为 2。
- 必失败的工具只影响自己的步骤，任务整体返回失败清单。
- 挂起步骤在放行后从原步骤继续，前面步骤的结果没有被重算。

