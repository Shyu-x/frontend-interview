---
title: 规划-执行：混合模式与优化
description: 规划-执行与 ReAct 的混合模式，以及成本、延迟与稳定性方面的优化策略。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 规划-执行：混合模式与优化

> 本文是「规划-执行模式」系列第 3 篇（共 3 篇）。上一篇：[规划-执行：执行器与完整实现](plan-execute-executor.md)

## 1. 混合模式

### 1.1 Plan-then-Act

Plan-then-Act 是最基本的混合模式，先规划后执行，但允许在执行过程中进行局部重新规划：

```typescript
// plan-then-act.ts

// 第 1 段：配置契约（用类型把"能调什么旋钮"固定下来）
// 先规划后行动（Plan-then-Act）的核心矛盾是"规划质量"与"执行成本"的权衡：
// initialPlanningDepth 决定前期投入多少算力，maxReplanningAttempts 则给重规划封顶，
// 防止 agent 在"失败 → 重规划 → 再失败"的循环里无限烧 token（这是最常见的失控点）。
interface PlanThenActConfig {
  initialPlanningDepth: 'light' | 'moderate' | 'deep';
  allowReplanning: boolean;
  replanningTriggers: ReplanningTrigger[];
  maxReplanningAttempts: number;
}

// 第 2 段：重规划触发条件（用可辨识联合建模"何时该推翻原计划"）
// 每种触发条件携带的字段不同，用 discriminated union 而非可选字段堆砌，
// 好处是 switch 时 TypeScript 能自动收窄类型，不会误读不属于该分支的数据。
// 注意：这里只声明"规则"，真正的判定逻辑在 checkReplanningTriggers 里。
type ReplanningTrigger = 
  | { type: 'failure'; afterAttempts?: number }
  | { type: 'time_budget_exceeded' }
  | { type: 'external_feedback' }
  | { type: 'environment_change' };

// 第 3 段：Agent 主体与状态（把"计划 + 重规划计数"作为可变状态持有）
// replanningCount 与 currentPlan 是实例级状态：run() 会被反复调用，但计数器
// 若不在每轮 run 开头归零，就会跨任务累加，导致后续任务过早耗尽重规划配额。
class PlanThenActAgent {
  private planner: Planner;
  private executor: Executor;
  private config: PlanThenActConfig;
  private currentPlan: ExecutionPlan | null = null;
  private replanningCount: number = 0;
  
  // 第 4 段：主循环（规划 → 执行一步 → 判定是否重规划 → 更新进度）
  // 这是 Plan-then-Act 的骨架：外层 while 以"任务是否完成"为终止条件，
  // 每次只推进一个 step，从而在每步之后都有机会重新评估计划是否还成立。
  // 数据流：planner 产出 currentPlan → executor 消费并返回 stepResult → 
  // 依据 stepResult 决定是否用 replan() 覆盖 currentPlan。
  async run(task: string): Promise<AgentResult> {
    // 阶段 1：初始规划
    this.currentPlan = await this.planner.createPlan(
      task, 
      this.config.initialPlanningDepth
    );
    
    // 阶段 2：执行并监控
    // 易错点：isComplete() 必须能感知 executor 的推进，否则 currentPlan 为 null
    // 或 executor 无法前进时会死循环；这里隐含依赖 executor 内部有终止态。
    while (!this.isComplete()) {
      const stepResult = await this.executor.executeNextStep(this.currentPlan);
      
      // 检查是否需要重新规划
      // 双重门禁：先看配置是否允许，再看是否命中触发条件且未超重规划上限。
      // 上限判断放在触发判断之后，是为了让"允许重规划"的语义完全由 triggers 表达，
      // maxReplanningAttempts 只做最后一道熔断。
      if (this.config.allowReplanning) {
        const shouldReplan = await this.checkReplanningTriggers(stepResult);
        
        if (shouldReplan && this.replanningCount < this.config.maxReplanningAttempts) {
          this.currentPlan = await this.replan(task);
          this.replanningCount++;
        }
      }
      
      // 更新进度
      this.updateProgress(stepResult);
    }
    
    return this.compileResult();
  }
  
  // 第 5 段：触发条件判定（把配置里的规则逐条翻译成布尔判定）
  // 返回"任一规则命中即为 true"，即短路 OR 语义，规则之间没有优先级。
  // 注意 time_budget_exceeded 与 environment_change 的差异：前者是本地廉价同步判断，
  // 后者需要 await 外部探测（如文件/依赖/服务状态），因此循环体是 async 的。
  private async checkReplanningTriggers(
    lastResult: StepResult
  ): Promise<boolean> {
    for (const trigger of this.config.replanningTriggers) {
      switch (trigger.type) {
        case 'failure':
          // failure 触发支持"失败 N 次后才重规划"：afterAttempts 缺省表示首次失败即触发；
          // 若多次失败已累计到阈值也触发，避免在瞬时抖动上过早推翻计划。
          if (!lastResult.success) {
            if (!trigger.afterAttempts || 
                lastResult.metadata.attempts >= trigger.afterAttempts) {
              return true;
            }
          }
          break;
          
        case 'time_budget_exceeded':
          if (this.hasExceededTimeBudget()) {
            return true;
          }
          break;
          
        case 'environment_change':
          if (await this.hasEnvironmentChanged()) {
            return true;
          }
          break;
      }
    }
    
    return false;
  }
  
  // 第 6 段：重规划（把"失败上下文 + 已积累知识"喂回 planner）
  // 这里不回传整条执行轨迹，只压缩成 failedStep / 当前计划 / 累积知识三件套，
  // 目的是控制提示词长度并聚焦纠错；originalTask 始终保留，防止重规划跑偏原目标。
  // 复杂度：一次 replan 约等于一次完整规划调用，所以调用方必须靠 maxReplanningAttempts 兜底。
  private async replan(task: string): Promise<ExecutionPlan> {
    const context = {
      originalTask: task,
      failedStep: this.executor.getLastFailedStep(),
      currentPlan: this.currentPlan,
      accumulatedKnowledge: this.gatherAccumulatedKnowledge()
    };
    
    return await this.planner.createPlanWithContext(task, context);
  }
}
```
### 1.2 动态重规划

动态重规划允许在执行过程中根据实际情况调整计划：

```typescript
// dynamic-replanner.ts

// 第 1 段：决策结果的数据契约
// ReplanningDecision 是整个重规划模块对外的唯一"出口协议"：调用方只需根据 action 分派后续行为，
// 而不必理解内部是如何分析执行状态的。这种"决策与执行分离"的设计让重规划策略可以独立演进。
// 注意 abort 虽然在联合类型中声明，但本类从未产出——它属于更上层编排器的职责（如成本/超时熔断）。
interface ReplanningDecision {
  action: 'continue' | 'modify' | 'regenerate' | 'abort';
  modifiedPlan?: ExecutionPlan; // 仅当 action 为 'modify' 时才有意义，continue/regenerate 时为 undefined
  reason: string; // 必须是可观测的：解释"为什么这样决策"，这是排查自动规划失控的关键线索
}

// 第 2 段：类结构与依赖
// 把 monitor 与 llm 作为构造期注入的依赖（而非在方法内 new 出来），
// 好处是单测时可以替换为 stub，从而在无真实 LLM 调用的情况下验证决策分支。
class DynamicReplanner {
  private monitor: ExecutionMonitor;
  private llm: LLMClient;
  
  // 第 3 段：重规划主入口 shouldReplan——先"度量"再"决策"
  // 核心思想：绝不凭直觉触发昂贵的 LLM 重规划，而是先把执行状态压缩成少量标量指标（analysis），
  // 再用阈值做代价极低的判断；只有确实需要改写计划时，才付出 LLM 调用成本。
  async shouldReplan(
    executionState: ExecutionState,
    plan: ExecutionPlan
  ): Promise<ReplanningDecision> {
    // 1. 分析当前执行状态 —— 唯一的"事实采集"点，后续所有分支都消费同一份 analysis，
    // 保证多次判断基于一致快照，避免边算边改导致的指标漂移。
    const analysis = await this.analyzeExecutionState(executionState, plan);
    
    // 2. 评估是否需要重规划
    // 分支优先级即风险优先级：最严重的"推倒重来"放在最前，
    // 否则会先命中低优先级的 modify 分支，把一个已经濒临失败的计划"打补丁"而不是重构。
    // 该分支同时要求"进度低"与"失败多"两个条件，防止仅因失败率高（但整体已接近完成）就整体重来。
    if (analysis.completionRate < 0.3 && analysis.failureRate > 0.5) {
      return {
        action: 'regenerate',
        reason: 'High failure rate with low progress - full replan needed'
      };
      // 此处不返回 modifiedPlan：重规划必须由上游基于新状态重新生成整份计划，
      // 本类避免在"高失败"场景下用局部补丁掩盖系统性问题。
    }
    
    // 第 4 段：偏差分支——计划仍然可用，但现实偏离预期
    // deviationFromPlan 是"预期进度 vs 实际进度"的绝对差（见 analyzeExecutionState），
    // 阈值 0.3 意味着偏差超过 30% 就值得让 LLM 重新裁剪后续步骤。
    if (analysis.deviationFromPlan > 0.3) {
      return {
        action: 'modify',
        modifiedPlan: await this.suggestModifications(analysis),
        reason: 'Significant deviation from original plan'
      };
      // 注意：这里 await 了 LLM 调用，属于"决策即产出"的写法——
      // 返回时计划已经是可直接执行的成品，调用方无需二次补全。
    }
    
    // 第 5 段：机会分支——进度正常，但环境中出现了更优路径
    // 与偏差分支同为 'modify'，但驱动因素不同：这里不是"纠偏"而是"增益"，
    // 因此走的是 integrateOpportunities（在保留原计划骨架的前提下合并增量机会）。
    if (analysis.newOpportunities.length > 0) {
      return {
        action: 'modify',
        modifiedPlan: await this.integrateOpportunities(
          plan, 
          analysis.newOpportunities
        ),
        reason: 'New optimization opportunities detected'
      };
    }
    
    // 第 6 段：兜底分支——默认不动比乱动更安全
    // 三个风险条件均未触发时明确返回 'continue'，
    // 而不是返回 undefined/抛错，让调用方可以无条件信任返回值的完整性。
    return {
      action: 'continue',
      reason: 'Execution proceeding as expected'
    };
  }
  
  // 第 7 段：把"偏差分析"翻译成 LLM 可消费的提示词
  // 这里用 JSON.stringify(..., null, 2) 而非默认压缩输出：结构化文本对 LLM 更友好，
  // 缩进与键名能显著降低模型在长上下文中漏读字段的概率（代价只是少量 token）。
  private async suggestModifications(
    analysis: ExecutionAnalysis
  ): Promise<ExecutionPlan> {
    const prompt = `
      基于以下分析结果，建议对计划进行修改：
      
      执行分析：
      ${JSON.stringify(analysis, null, 2)}
      
      原计划：
      ${JSON.stringify(analysis.originalPlan, null, 2)}
      
      请提供：
      1. 需要修改的步骤
      2. 修改的具体内容
      3. 修改的原因
      4. 预期的效果
    `;
    
    // 第 8 段：受约束的结构化输出 + 本地落地
    // structuredOutput(prompt, Schema) 强制模型返回符合 ModificationSchema 的 JSON，
    // 避免"自由文本再解析"这一最常见的 LLM 集成故障点（解析失败/字段缺失）。
    // applyModifications 再做一次确定性的合并，保证计划对象的不可变语义与字段完整性。
    const suggestion = await this.llm.structuredOutput(prompt, ModificationSchema);
    
    return this.applyModifications(analysis.originalPlan, suggestion);
  }
  
  // 第 9 段：状态度量化——把杂乱的执行记录压缩成 4 个可比较的指标
  // 该方法本身不调用 LLM（除 detectNewOpportunities 外），属于纯计算为主的"廉价前置筛选"，
  // 目的是让 shouldReplan 的绝大多数调用都能在本地完成判断，不产生网络与费用开销。
  private async analyzeExecutionState(
    state: ExecutionState,
    plan: ExecutionPlan
  ): Promise<ExecutionAnalysis> {
    // 计算完成率
    // 用 Set.size 而非数组长度，隐含假设：completedSteps 是去重后的步骤 ID 集合，
    // 因此同一步骤被重复上报完成也不会把完成率算虚高。
    // 易错点/边界：plan.steps 为空时 totalCount 为 0，completionRate 会变成 NaN，
    // 后续所有 </> 阈值比较都会返回 false 并静默落到 'continue' —— 调用方需保证计划非空。
    const completedCount = state.completedSteps.size;
    const totalCount = plan.steps.length;
    const completionRate = completedCount / totalCount;
    
    // 计算失败率
    // 关键数据流：这里的分母用的是 completedCount 而不是 totalCount，
    // 即失败率被定义为"已完成步骤中失败所占的比例"，语义上更接近"重试消耗率"。
    // 边界条件：completedCount 为 0 时直接取 0，显式规避 0/0=NaN（否则分支判断会被污染）。
    const failedCount = state.failedSteps.size;
    const failureRate = completedCount > 0 ? failedCount / completedCount : 0;
    
    // 计算计划偏差
    // 把"时间维度"的预期（calculateExpectedProgress 按耗时/里程碑推算）与"数量维度"的实际做差，
    // 取绝对值是因为提前完成与滞后完成同样值得触发重规划（都说明预估模型失准）。
    const expectedProgress = this.calculateExpectedProgress(state);
    const actualProgress = completionRate;
    const deviationFromPlan = Math.abs(expectedProgress - actualProgress);
    
    // 识别新机会
    // 唯一可能需要外部信息的指标（可能查工具目录/环境变化），故为 async；
    // 放在最后计算，保证前三个廉价指标可以先算出来，便于未来做短路优化。
    const newOpportunities = await this.detectNewOpportunities(state);
    
    // 第 10 段：打包分析结果
    // 同时携带 originalPlan 与 executionState 原始引用，是为了让下游的 prompt 构造与合并逻辑
    // 无需再回查外部上下文；代价是分析结果对象较大，不适合长期缓存（复杂度上看是 O(plan 大小) 的复制）。
    return {
      completionRate,
      failureRate,
      deviationFromPlan,
      newOpportunities,
      originalPlan: plan,
      executionState: state
    };
  }
}
```
### 1.3 自适应规划

自适应规划根据任务特征动态调整规划策略：

```typescript
// adaptive-planner.ts
interface PlanningStrategy {
  name: string;
  planningDepth: PlanningDepth;
  replanningFrequency: 'never' | 'on_failure' | 'periodic' | 'continuous';
  parallelExecution: boolean;
  maxStepComplexity: number;
}

class AdaptivePlanner {
  private baseStrategies: Map<TaskType, PlanningStrategy> = new Map([
    ['code_generation', {
      name: 'code_generation',
      planningDepth: PlanningDepth.MODERATE,
      replanningFrequency: 'on_failure',
      parallelExecution: false,
      maxStepComplexity: 5
    }],
    ['data_analysis', {
      name: 'data_analysis',
      planningDepth: PlanningDepth.DEEP,
      replanningFrequency: 'periodic',
      parallelExecution: true,
      maxStepComplexity: 3
    }],
    ['research', {
      name: 'research',
      planningDepth: PlanningDepth.LIGHT,
      replanningFrequency: 'continuous',
      parallelExecution: true,
      maxStepComplexity: 7
    }]
  ]);
  
  async createAdaptivePlan(
    task: string,
    tools: Tool[]
  ): Promise<ExecutionPlan> {
    // 1. 分析任务类型
    const taskType = await this.classifyTask(task);
    
    // 2. 选择基础策略
    const baseStrategy = this.baseStrategies.get(taskType) || 
      this.baseStrategies.get('generic')!;
    
    // 3. 根据上下文调整策略
    const context = this.gatherContext();
    const adjustedStrategy = this.adjustStrategy(baseStrategy, context);
    
    // 4. 根据策略配置规划器
    const planner = this.configurePlanner(adjustedStrategy);
    
    // 5. 创建计划
    return await planner.createPlan(task, tools);
  }
  
  private adjustStrategy(
    base: PlanningStrategy,
    context: PlanningContext
  ): PlanningStrategy {
    let adjusted = { ...base };
    
    // 根据可用时间调整规划深度
    if (context.timeBudget < 5000) {
      adjusted.planningDepth = Math.min(
        adjusted.planningDepth, 
        PlanningDepth.LIGHT
      );
    } else if (context.timeBudget > 60000) {
      adjusted.planningDepth = PlanningDepth.DEEP;
    }
    
    // 根据资源可用性调整并行度
    if (context.availableConcurrency < 2) {
      adjusted.parallelExecution = false;
    }
    
    // 根据任务紧迫度调整重规划频率
    if (context.urgency > 0.8) {
      adjusted.replanningFrequency = 'on_failure';
    }
    
    return adjusted;
  }
  
  private async classifyTask(task: string): Promise<TaskType> {
    const prompt = `
      分析以下任务，判断其类型：
      
      任务：${task}
      
      类型选项：
      - code_generation: 代码编写、调试、重构
      - data_analysis: 数据处理、分析、可视化
      - research: 信息检索、文档生成
      - automation: 流程自动化、脚本执行
      - generic: 其他通用任务
      
      请输出最合适的类型。
    `;
    
    const response = await this.llm.generate(prompt);
    return this.parseTaskType(response);
  }
}
```

## 2. 优化策略

### 2.1 计划缓存

#### 2.1.1 缓存策略设计

```typescript
// plan-cache.ts
interface CacheEntry {
  plan: ExecutionPlan;
  key: string;
  createdAt: number;
  lastAccessedAt: number;
  hitCount: number;
  ttl: number;
}

class PlanCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private evictionPolicy: EvictionPolicy;
  
  constructor(config: CacheConfig) {
    this.config = config;
    this.evictionPolicy = new EvictionPolicy(config.eviction);
  }
  
  generateCacheKey(task: string, context: PlanningContext): string {
    const components = [
      this.normalizeTask(task),
      context.availableTools.sort().join(','),
      context.constraintHash
    ];
    
    return this.hashString(components.join('|'));
  }
  
  private normalizeTask(task: string): string {
    // 规范化任务描述（去除不重要的细节）
    return task
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[0-9]+/g, '#')  // 替换数字
      .replace(/"[^"]*"/g, '""'); // 泛化引号内容
  }
  
  async get(key: string): Promise<ExecutionPlan | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // 检查 TTL
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // 更新访问统计
    entry.lastAccessedAt = Date.now();
    entry.hitCount++;
    
    return entry.plan;
  }
  
  async set(key: string, plan: ExecutionPlan): Promise<void> {
    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      await this.evict();
    }
    
    const entry: CacheEntry = {
      plan,
      key,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      hitCount: 0,
      ttl: this.config.defaultTtl
    };
    
    this.cache.set(key, entry);
  }
  
  private async evict(): Promise<void> {
    const toEvict = this.evictionPolicy.selectEvictionCandidates(
      Array.from(this.cache.values())
    );
    
    for (const key of toEvict) {
      this.cache.delete(key);
    }
  }
}

// LFU 驱逐策略
class LFUEvictionPolicy implements EvictionPolicy {
  selectEvictionCandidates(entries: CacheEntry[]): string[] {
    return entries
      .sort((a, b) => a.hitCount - b.hitCount)
      .slice(0, Math.ceil(entries.length * 0.1))
      .map(e => e.key);
  }
}

// LRU 驱逐策略
class LRUEvictionPolicy implements EvictionPolicy {
  selectEvictionCandidates(entries: CacheEntry[]): string[] {
    return entries
      .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)
      .slice(0, Math.ceil(entries.length * 0.1))
      .map(e => e.key);
  }
}

// TTL 驱逐策略
class TTLEvictionPolicy implements EvictionPolicy {
  selectEvictionCandidates(entries: CacheEntry[][]): string[] {
    const now = Date.now();
    return entries
      .filter(e => now - e.createdAt > e.ttl)
      .map(e => e.key);
  }
}
```

#### 2.1.2 语义缓存

```typescript
// semantic-cache.ts
// 第 1 段：类的状态定义——语义缓存把"向量索引"与"计划存储"拆成两个独立的 Map/对象
// 之所以分开存：embeddings 负责近似检索（可先筛出候选），cache 负责取真正的 ExecutionPlan（可能体积大/可被淘汰）。
// 关键不变量：两条记录以同一个 key 关联，但它们的生命周期并不原子（见第 3 段），因此读取时必须容忍"有向量却没有计划"的悬挂项。
class SemanticPlanCache {
  private embeddings: Map<string, number[]> = new Map(); // key -> 任务语义向量；只用于相似度粗筛
  private cache: PlanCache; // key -> ExecutionPlan 的真实存储，可能是 LRU/Redis 等会被逐出的后端
  private embeddingModel: EmbeddingModel; // 向量化模型，必须与写入时用的是同一个，否则空间不可比
  private similarityThreshold: number = 0.85; // 余弦阈值：越高越保守（少误命中），越低越激进（省调用但风险错答案）
  
  // 第 2 段：检索路径——给定新任务，找出语义最接近且可用的历史计划
  // 数据流：task 只 embed 一次 → 与全部缓存向量比对 → 取超过阈值的最高分 → 回表 cache.get 拿计划。
  // 复杂度：O(N·d)，N 为缓存条目数、d 为向量维度；这里未做索引加速，适合中小规模，规模大时应换成向量库 ANN 检索。
  // 易错点：阈值判断用严格大于（>），等于阈值不算命中；cache.get 是异步的，可能返回空（被淘汰/过期）。
  async findSimilarPlan(task: string): Promise<ExecutionPlan | null> {
    const taskEmbedding = await this.embeddingModel.embed(task); // 只算一次查询向量，循环内复用，避免 N 次重复 embed
    
    let bestMatch: { key: string; plan: ExecutionPlan; similarity: number } | null = null; // 手写"取最大"累加器，初值 null 便于表达"尚未命中"
    
    for (const [key, cachedEmbedding] of this.embeddings) {
      const similarity = this.cosineSimilarity(taskEmbedding, cachedEmbedding); // 与每条缓存向量逐一打分
      
      if (similarity > this.similarityThreshold) { // 先过阈值再回表：避免为低分候选做昂贵的 cache.get
        const plan = await this.cache.get(key); // 按 key 取真实计划；可能为空，说明索引与存储在这一点上不同步
        
        if (plan && (!bestMatch || similarity > bestMatch.similarity)) { // plan 存在 且 是当前最优，才更新；!bestMatch 处理首次命中
          bestMatch = { key, plan, similarity };
        }
      }
    }
    
    // 全部未超过阈值或对应计划都已失效时返回 null，语义即"没有可复用的计划"
    return bestMatch?.plan || null;
  }
  
  // 第 3 段：写入路径——把新计划与它的语义向量一起落库
  // 意图：让后续同义/近义任务能命中这条记录；两条记录共用同一 key，保证检索能顺着 key 找回计划。
  // 易错点：两次写入不是事务性的——若 cache.set 抛错，embeddings 里已经留下的向量就成了"只会被扫描却永远取不到计划"的孤儿（第 2 段的 plan 为空判断正是为兜底它）；
  // 另外重复 key 会重复 embed 并覆盖旧向量，调用方应保证 key 的语义唯一性。
  async cacheWithEmbedding(key: string, plan: ExecutionPlan, task: string): Promise<void> {
    const embedding = await this.embeddingModel.embed(task); // 注意是对"任务描述 task"做向量化，而不是对 plan 内容
    
    this.embeddings.set(key, embedding); // 先写索引：即使随后落库失败，也最多留下可被安全忽略的孤儿向量
    await this.cache.set(key, plan); // 再写真实计划，await 确保调用方拿到的是"已落库"的语义
  }
  
  // 第 4 段：相似度原语——余弦相似度，取值 [-1, 1]，越大越同向；0.85 阈值意味着要求高度同向
  // 原理：dot(a,b) / (|a|·|b|) 等价于两向量夹角的余弦，天然对向量长度不敏感（只比方向），适合比对不同长度的嵌入。
  // 易错点：a 比 b 长时 b[i] 为 undefined，结果变 NaN 却不会报错；任一向量为零向量时分母为 0，返回 NaN/Infinity，会静默逃过阈值比较。
  // 复杂度：O(d)，reduce 三次遍历，可合并为一次循环以常数级优化（此处保留可读性）。
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0); // 点积：逐维相乘再求和
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0)); // a 的 L2 模长，用于归一化
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0)); // b 的 L2 模长
    
    return dotProduct / (magnitudeA * magnitudeB); // 归一化后即为夹角余弦；阈值 0.85 对应约 31.8° 以内
  }
}
```
### 2.2 并行规划

#### 2.2.1 并行分解策略

```typescript
// parallel-planning.ts
class ParallelPlanner {
  private llm: LLMClient;
  private maxConcurrency: number;
  
  async parallelDecompose(task: string, tools: Tool[]): Promise<TaskStep[]> {
    // 1. 识别任务的正交维度
    const dimensions = await this.identifyDimensions(task);
    
    // 2. 并行探索每个维度
    const dimensionPlans = await Promise.all(
      dimensions.map(dim => this.exploreDimension(task, dim, tools))
    );
    
    // 3. 合并结果
    return this.mergePlans(dimensionPlans);
  }
  
  private async exploreDimension(
    task: string, 
    dimension: TaskDimension,
    tools: Tool[]
  ): Promise<TaskStep[]> {
    const prompt = `
      专注于以下维度，分解任务的这个方面：
      
      任务：${task}
      维度：${dimension.name}
      维度描述：${dimension.description}
      
      请列出完成这个维度的具体步骤。
    `;
    
    const steps = await this.llm.structuredOutput(prompt, StepsSchema);
    return steps.map(s => ({ ...s, dimension: dimension.name }));
  }
  
  private async identifyDimensions(task: string): Promise<TaskDimension[]> {
    const prompt = `
      分析以下任务，识别其正交维度（可以独立探索的方面）：
      
      任务：${task}
      
      常见维度包括：
      - 功能实现
      - 错误处理
      - 测试覆盖
      - 文档编写
      - 性能优化
      - 安全考虑
      
      请识别任务的主要维度。
    `;
    
    return await this.llm.structuredOutput(prompt, DimensionsSchema);
  }
}
```

#### 2.2.2 规划结果合并

```typescript
// plan-merger.ts
class PlanMerger {
  private conflictResolver: ConflictResolver;
  
  mergePlans(plans: ExecutionPlan[]): ExecutionPlan {
    if (plans.length === 1) {
      return plans[0];
    }
    
    // 1. 收集所有步骤
    const allSteps = plans.flatMap(p => p.steps);
    
    // 2. 检测并解决冲突
    const conflicts = this.detectConflicts(allSteps);
    const resolvedSteps = this.resolveConflicts(allSteps, conflicts);
    
    // 3. 合并依赖
    const mergedDependencies = this.mergeDependencies(plans);
    
    // 4. 去重
    const uniqueSteps = this.deduplicateSteps(resolvedSteps);
    
    // 5. 重新排序
    const sortedSteps = this.topologicalSort(uniqueSteps, mergedDependencies);
    
    return {
      id: generateId(),
      task: plans[0].task,
      steps: sortedSteps,
      dependencies: mergedDependencies,
      targetGoals: this.mergeGoals(plans),
      metadata: this.mergeMetadata(plans),
      createdAt: Date.now(),
      validated: false
    };
  }
  
  private detectConflicts(steps: TaskStep[]): Conflict[] {
    const conflicts: Conflict[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const conflict = this.checkStepConflict(steps[i], steps[j]);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }
    
    return conflicts;
  }
  
  private checkStepConflict(stepA: TaskStep, stepB: TaskStep): Conflict | null {
    // 检查资源冲突
    if (stepA.resourceRequirements && stepB.resourceRequirements) {
      const resourceOverlap = stepA.resourceRequirements.some(
        r => stepB.resourceRequirements.includes(r)
      );
      
      if (resourceOverlap) {
        return {
          type: 'resource',
          steps: [stepA.id, stepB.id],
          description: `步骤 ${stepA.name} 和 ${stepB.name} 竞争相同资源`
        };
      }
    }
    
    // 检查输出冲突
    if (stepA.outputFiles && stepB.outputFiles) {
      const fileOverlap = stepA.outputFiles.filter(
        f => stepB.outputFiles.includes(f)
      );
      
      if (fileOverlap.length > 0) {
        return {
          type: 'output',
          steps: [stepA.id, stepB.id],
          description: `步骤 ${stepA.name} 和 ${stepB.name} 写入相同文件`
        };
      }
    }
    
    return null;
  }
  
  private resolveConflicts(steps: TaskStep[], conflicts: Conflict[]): TaskStep[] {
    let resolvedSteps = [...steps];
    
    for (const conflict of conflicts) {
      resolvedSteps = this.conflictResolver.resolve(resolvedSteps, conflict);
    }
    
    return resolvedSteps;
  }
}
```

### 2.3 失败恢复

#### 2.3.1 分层恢复策略

```typescript
// recovery-strategies.ts
enum RecoveryLevel {
  RETRY = 'retry',
  SKIP = 'skip',
  SUBSTITUTE = 'substitute',
  ROLLBACK = 'rollback',
  REPLAN = 'replan'
}

class RecoveryManager {
  private strategies: Map<RecoveryLevel, RecoveryStrategy>;
  private attemptHistory: Map<string, AttemptRecord[]>;
  
  constructor() {
    this.strategies = new Map([
      [RecoveryLevel.RETRY, new RetryStrategy()],
      [RecoveryLevel.SKIP, new SkipStrategy()],
      [RecoveryLevel.SUBSTITUTE, new SubstituteStrategy()],
      [RecoveryLevel.ROLLBACK, new RollbackStrategy()],
      [RecoveryLevel.REPLAN, new ReplanStrategy()]
    ]);
    
    this.attemptHistory = new Map();
  }
  
  async attemptRecovery(
    failedStep: TaskStep,
    error: Error,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    // 记录尝试历史
    this.recordAttempt(failedStep.id, error);
    
    // 分析失败原因
    const failureAnalysis = this.analyzeFailure(failedStep, error);
    
    // 选择恢复策略
    const strategy = this.selectStrategy(failureAnalysis, context);
    
    // 执行恢复
    return await this.strategies.get(strategy)!.execute(failedStep, context);
  }
  
  private selectStrategy(
    analysis: FailureAnalysis,
    context: RecoveryContext
  ): RecoveryLevel {
    // 基于失败分析选择策略
    if (analysis.isTransient) {
      return RecoveryLevel.RETRY;
    }
    
    if (analysis.isNonCritical) {
      return RecoveryLevel.SKIP;
    }
    
    if (analysis.hasAlternative) {
      return RecoveryLevel.SUBSTITUTE;
    }
    
    if (analysis.canRollback && context.checkpointsAvailable > 0) {
      return RecoveryLevel.ROLLBACK;
    }
    
    return RecoveryLevel.REPLAN;
  }
  
  private analyzeFailure(
    step: TaskStep, 
    error: Error
  ): FailureAnalysis {
    return {
      isTransient: this.isTransientError(error),
      isNonCritical: step.onFailure === 'skip',
      hasAlternative: step.alternativeTool !== undefined,
      canRollback: step.rollbackAction !== undefined,
      errorType: this.classifyError(error),
      errorMessage: error.message
    };
  }
  
  private isTransientError(error: Error): boolean {
    const transientPatterns = [
      /timeout/i,
      /connection/i,
      /temporary/i,
      /network/i,
      /rate.limit/i
    ];
    
    return transientPatterns.some(p => p.test(error.message));
  }
}

// 重试策略
class RetryStrategy implements RecoveryStrategy {
  async execute(step: TaskStep, context: RecoveryContext): Promise<RecoveryResult> {
    const maxAttempts = step.retryConfig?.maxAttempts || 3;
    const backoff = step.retryConfig?.backoff || 'exponential';
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await context.executor.executeStep(step);
        
        if (result.success) {
          return { success: true, action: 'retry', attempts: attempt };
        }
        
        if (attempt < maxAttempts) {
          await this.delay(this.calculateBackoff(backoff, attempt));
        }
      } catch (error) {
        if (attempt === maxAttempts) {
          return { 
            success: false, 
            action: 'retry', 
            error,
            attempts: attempt 
          };
        }
      }
    }
    
    return { success: false, action: 'retry', attempts: maxAttempts };
  }
  
  private calculateBackoff(type: string, attempt: number): number {
    if (type === 'exponential') {
      return Math.min(1000 * Math.pow(2, attempt), 30000);
    }
    return 1000 * attempt;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 回滚策略
class RollbackStrategy implements RecoveryStrategy {
  async execute(step: TaskStep, context: RecoveryContext): Promise<RecoveryResult> {
    const rollbackResult = await context.checkpointManager.rollbackToPrevious(
      step.id
    );
    
    if (rollbackResult.success) {
      return {
        success: true,
        action: 'rollback',
        restoredSteps: rollbackResult.restoredSteps
      };
    }
    
    return {
      success: false,
      action: 'rollback',
      error: rollbackResult.error
    };
  }
}
```

#### 2.3.2 优雅降级

```typescript
// graceful-degradation.ts
interface GracefulDegradationPlan {
  primary: ExecutionPlan;
  fallback: ExecutionPlan;
  degradationLevels: DegradationLevel[];
}

interface DegradationLevel {
  level: number;
  name: string;
  criteria: DegradationCriteria;
  modifiedPlan: ExecutionPlan;
}

class GracefulDegradationManager {
  async createDegradationPlan(
    originalPlan: ExecutionPlan,
    constraints: ResourceConstraints
  ): Promise<GracefulDegradationPlan> {
    const degradationLevels: DegradationLevel[] = [];
    
    // 生成各个降级级别
    for (let level = 1; level <= 3; level++) {
      const modifiedPlan = this.generateDegradedPlan(originalPlan, level, constraints);
      
      degradationLevels.push({
        level,
        name: this.getDegradationName(level),
        criteria: this.getDegradationCriteria(level),
        modifiedPlan
      });
    }
    
    return {
      primary: originalPlan,
      fallback: degradationLevels[degradationLevels.length - 1].modifiedPlan,
      degradationLevels
    };
  }
  
  private generateDegradedPlan(
    plan: ExecutionPlan,
    level: number,
    constraints: ResourceConstraints
  ): ExecutionPlan {
    let steps = [...plan.steps];
    
    switch (level) {
      case 1: // 轻度降级：跳过可选步骤
        steps = steps.filter(s => s.criticality !== 'optional');
        break;
        
      case 2: // 中度降级：简化处理逻辑
        steps = steps.map(s => this.simplifyStep(s));
        break;
        
      case 3: // 重度降级：只保留核心功能
        steps = steps.filter(s => s.criticality === 'required');
        break;
    }
    
    return this.rebuildPlan(plan, steps);
  }
  
  private simplifyStep(step: TaskStep): TaskStep {
    // 用更简单的方式替换复杂工具
    if (step.toolName === 'complex_analysis') {
      return {
        ...step,
        toolName: 'simple_analysis',
        estimatedTime: step.estimatedTime * 0.3
      };
    }
    
    // 减少迭代次数
    if (step.maxIterations) {
      return {
        ...step,
        maxIterations: Math.ceil(step.maxIterations / 2)
      };
    }
    
    return step;
  }
  
  async selectDegradationLevel(
    degradationPlan: GracefulDegradationPlan,
    currentConstraints: ResourceConstraints
  ): Promise<ExecutionPlan> {
    for (const level of degradationPlan.degradationLevels) {
      if (this.meetsConstraints(level.modifiedPlan, currentConstraints)) {
        return level.modifiedPlan;
      }
    }
    
    return degradationPlan.fallback;
  }
}
```

## 3. 总结

Plan-and-Execute 模式是处理复杂 Agent 任务的重要架构模式。通过将规划阶段和执行阶段分离，该模式能够：

1. **提供全局视角**：在执行前完整分析任务，避免局部最优陷阱
2. **支持依赖管理**：通过依赖图分析优化执行顺序，发现循环依赖
3. **实现失败恢复**：通过检查点和回滚机制处理执行失败
4. **优化执行效率**：识别并行机会，计算关键路径
5. **自适应规划**：根据任务特征动态调整规划策略

在实际应用中，Plan-and-Execute 模式需要与混合模式结合使用，通过动态重规划和优雅降级来应对复杂多变的执行环境。选择合适的规划深度和重规划策略是在效率和可靠性之间取得平衡的关键。

## 4. 参考资源

- [LangChain Plan-and-Execute](https://python.langchain.com/docs/tutorials/plan_and_execute/)
- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [AutoGPT: An Autonomous GPT-4 Agent](https://github.com/Significant-Gravitas/AutoGPT)
- [BabyAGI: Task-Driven Autonomous Agent](https://github.com/yoheinakajima/babyagi)

## 应用与行业实践

本页的知识点落到工程里，都是围绕三件事：计划怎么来、执行怎么控、失败怎么收。下面给出场景地图、三个拆解、行业做法和落地路线。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 客服工单的自动分诊与回复草稿 | 规则计划打底 + 局部重规划 | 规则引擎、模型规划器、工单系统 API | 重规划只覆盖失败步骤，不整单重跑 |
| 代码仓库批量依赖升级 | 分层计划 + 并行分支 + 幂等重试 | CI 定时任务、容器化构建、锁文件 | 并发度对齐 CI 配额，单仓库失败要隔离 |
| 后台管理的万行表格导出 | 分片计划 + 结果缓存 + 检查点 | 异步任务队列、对象存储、分片文件 | 分片键要稳定，重跑不能产生重复行 |
| 低端安卓设备首屏加载排查 | 测量-假设-验证循环 + 分支剪枝 | AndroidX Macrobenchmark、Perfetto | 只有同一构建哈希才可复用采样缓存 |
| 多人协作白板的离线合并回归 | 固定计划模板 + 断言校验器 | 单元测试套件、冲突模拟脚本 | 断言要覆盖合并顺序，不只覆盖最终状态 |
| 电商大促前的商品价格巡检 | 计划缓存 + 预算上限 + 降级 | 定时抓取服务、比价规则、告警通道 | 设步数与超时上限，避免整轮跑不完 |
| 财务月结的跨系统对账 | 依赖排序计划 + 重试 + 人工闸门 | 工作流引擎、对账规则库 | 金额类步骤必须幂等，重试不能重复入账 |
| 数据仓库的每日增量回补 | 依赖图规划 + 并行回填 + 检查点 | 调度器、分区表、断点续跑 | 回补窗口按分区切分，避免一次性锁表 |

### 三个场景拆解

#### 场景 1：客服工单的自动分诊与处理

**业务背景**：活动期工单量翻几倍，人工分诊排队变长。分诊规则表有几十条分支，每条分支的步骤又高度重复。

**怎么用本页知识解决**：先用规则生成骨架计划，命中常见分支；规则未命中时才让模型规划。执行器按步骤调工具，校验器判定结果，失败时只重规划受影响的后继步骤。

```python
def handle(ticket):
    plan = rule_plan(ticket)               # 规则先生成骨架计划，命中常见分支
    if plan is None:
        plan = llm_plan(ticket, TOOL_SPEC)  # 规则未命中才调用模型规划
    done = {}
    for step in plan.steps:
        if not ready(step, done):
            plan = replan(plan, step, done)  # 依赖缺失时只重排后继步骤
            break
        out = run_tool(step, cache=cache)    # 入参与账号相同的调用直接读缓存
        done[step.id] = out
        if not verify(step, out):            # 校验器拦截格式与权限问题
            plan = replan(plan, step, done)
            break
    return pack(plan, done)                  # 返回结果时附带计划与每步证据
```

- 规则计划覆盖多数工单，省掉一次模型往返，延迟下降可按步骤数测量。
- 重规划以步骤为粒度，未受影响的步骤结果留在 done 里，可直接复用。
- 校验器只做格式与权限断言，不做业务判断，避免写成第二个规划器。
- 缓存键取（工单类型，步骤名，入参哈希）；退款类工具还要带账号与幂等键。

**怎么度量收益**：用 OpenTelemetry 为每步打点，记录步骤数、重规划次数、工具调用次数与 token 数。延迟看 P50 与 P95 端到端耗时，业务看人工转接率与首次解决率。对照方式是按工单 ID 奇偶分流，跑两周再比。

**什么时候不该用**：
- 工单只有一条确定路径、规则表已全覆盖时，加规划器只多一次模型延迟。
- 每步结果无法预知且强依赖上一步输出时，静态计划反复失效，应改用循环式执行。

#### 场景 2：代码仓库批量依赖升级

**业务背景**：一个公共依赖升主版本，需要改几十个仓库的锁文件与调用点。逐个手工改动，排期按周计算。

**怎么用本页知识解决**：先做仓库级计划，再在单仓库内做步骤计划，形成两层。仓库之间并行执行，单仓库失败只标记自己那一支，第二轮只跑失败项。

```python
items = [{"repo": r, "state": "todo"} for r in list_repos()]
for rounds in range(2):                     # 最多两轮，避免无限重试
    todo = [i for i in items if i["state"] == "todo"]
    with ThreadPoolExecutor(max_workers=4) as pool:  # 并发度对齐 CI 配额
        futs = {pool.submit(upgrade_one, i): i for i in todo}
        for f in as_completed(futs):
            it = futs[f]
            try:
                it["diff"] = f.result()     # 单仓库失败只影响自己这一支
                it["state"] = "done"
            except Exception as e:
                it["state"] = "todo"
                it["err"] = repr(e)         # 记录原因，下一轮只重跑这一支
    if all(i["state"] == "done" for i in items):
        break
```

- 层级分开：仓库级计划管调度与并发，单仓库计划管改动顺序，两层互不干扰。
- 重试有上限：两轮仍失败的仓库进人工队列，不再占用 CI 配额。
- 幂等要求：升级脚本用锁文件哈希判断是否改过，重跑不产生第二个提交。
- 缓存复用：同一框架版本加同一依赖版本的仓库可共享依赖解析结果。

**怎么度量收益**：在 CI 侧记录每轮 job 数、失败仓库数、重试次数与端到端时长，数据来自 CI 平台任务指标加 OpenTelemetry 打点。业务侧记录进入人工队列的仓库占比。

**什么时候不该用**：
- 仓库只有两三个、改动各不相同时，手改加一次评审比写编排脚本省事。
- 升级涉及公共 API 的破坏性变更、需要业务语义判断时，只出补丁不自动合并。

#### 场景 3：低端安卓设备首屏加载排查

**业务背景**：低端机上首屏要几秒才可见，用户在下单前就离开。瓶颈每次不同，需要反复测量、假设、验证。

**怎么用本页知识解决**：把排查做成带预算的循环。测量步骤固定并缓存，假设生成交给模型，验证分支并行执行，被证伪的假设连带剪掉。

```python
key_base = build_hash(apk)                 # 缓存键绑定构建产物，换包即失效
plan = {"open": start_hypotheses(), "dead": set()}
for _ in range(MAX_STEPS):                 # 步数预算，防止无限排查
    if not plan["open"]:
        break
    h = plan["open"].pop(0)
    if h.name in plan["dead"]:
        continue                           # 已证伪的分支直接跳过
    sample = cache.get((key_base, h.name)) or measure_cold_start(h.variant)
    cache.set((key_base, h.name), sample)  # 同一构建下重复验证不再跑设备
    if below_budget(sample, BUDGET_MS):
        plan["dead"] |= set(h.depends)     # 结论不成立时剪掉后继假设
    else:
        plan["open"] += h.follow_up        # 只有拿到证据才展开下一层
report(plan, cache.hits)                   # 报告里带上步数与缓存命中率
```

- 测量步骤固定，采样结果才可比较；假设步骤交给模型，省去人工枚举。
- 剪枝写进计划状态，后继分支不再排队，设备机时按分支数下降。
- 缓存键含构建哈希，改代码后旧采样自动失效，避免用旧数据下结论。
- 步数预算到点就出报告，宁可结论不全，也不占满真机农场。

**怎么度量收益**：用 AndroidX Macrobenchmark 跑冷启动，看 timeToInitialDisplay 的 P90。用 Perfetto 抓 trace 定位主线程阻塞帧，对比要在同一设备型号与同一构建哈希下做。

**什么时候不该用**：
- 瓶颈已定位到单个已知项（比如一张未压缩的首屏大图）时，直接修，不用建循环。
- 手头没有真机农场、采样波动大于改动幅度时，循环给出的结论不可信。

### 行业先进实践

1. **orchestrator-workers 与 evaluator-optimizer 两种编排（出处：Anthropic 官方工程博客《Building effective agents》）**。做法是让一个编排者负责分解，让评估者循环负责收敛。瓶颈出在分解能力上时收益明显，其余情况先按固定工作流实现。

2. **把计划存成显式状态的 Plan-and-Execute 教程（出处：LangGraph 官方文档）**。做法是规划节点产出结构化计划，执行节点逐步消费，重规划单独成节点。计划可序列化，进程重启后能续跑。需核对官方文档：重规划节点的触发条件与计划对象字段。

3. **优先单 agent 加护栏的取舍（出处：OpenAI 官方指南《A practical guide to building agents》）**。做法是先用一个 agent 加工具与输入输出护栏，确认不足再拆多 agent。多 agent 会放大延迟与调试成本，先加步数上限更划算。

4. **确定性重放的工作流模型（出处：Temporal 官方文档）**。做法是工作流代码保持确定性，外部副作用放进 Activity，失败按事件历史重放。重试因此不会重复下单或重复发消息。需核对官方文档：Activity 重试策略默认值与超时字段。

5. **生成式 AI 的可观测约定（出处：OpenTelemetry 官方文档中的 GenAI 语义约定）**。做法是给模型调用与工具调用打统一的 span 与属性，延迟与成本可按步骤拆开。需核对官方文档：语义约定的稳定级别与属性名。

### 从学到用：落地路线

1. **试点**：选一个步骤固定、失败可容忍的内部任务（例如报表导出）接上规划-执行，先只做规则计划。验收标准：单次任务能打印完整计划与每步耗时。
2. **验证**：在同一输入上分别跑计划模式与循环模式，记录步骤数、重规划次数、端到端延迟与成本。验收标准：得到一张可复现的对比表，结论指向明确的适用条件。
3. **推广**：把计划模板、缓存键规则、校验器断言抽成公共库，按任务类型逐个接入。验收标准：新任务接入只改配置与断言，不改执行器代码。
4. **防回退**：把步数上限、预算上限与失败率阈值写进 CI 门禁，超限即拦截。验收标准：连续若干次发布中，超预算任务数维持在阈值内，且告警有人处理。

### 动手作业

目标：为一个本地任务集做出带计划与缓存的执行器，并在同一输入上对比计划模式与循环模式。

步骤：
1. 选一个可离线运行的任务集，例如把一批 Markdown 文件转成 HTML，任务数不少于 20。
2. 写规则计划函数：输入任务清单，输出带依赖关系与顺序的步骤列表。
3. 写执行器：支持按步骤执行、结果缓存、失败重试一次、步数上限。
4. 写校验器：对每步输出做断言，例如文件存在且长度大于零。
5. 加重规划入口：只在某一步失败时重排该步的后继步骤。
6. 接上打点：为每步记录开始时间、耗时、缓存命中与结果状态。
7. 再写一个循环式执行版本，不做计划，直接顺序执行全部任务。

验收标准：
- 两种模式在同一任务集上都能跑完，最终输出一致。
- 报告中能看到每步耗时、缓存命中次数与重规划次数。
- 人为让第 5 个任务失败一次，重规划后其余任务仍完成，且已成功步骤不重复执行。
- 把步数上限设为 3 时，执行器按上限停止并给出未完成清单。
- 第二次运行同一任务集时，缓存命中次数大于零。

