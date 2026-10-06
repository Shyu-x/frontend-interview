---
title: 规划-执行：原理与规划器
description: 规划-执行模式的基本原理与规划器（Planner）设计：任务分解、计划表示与动态重规划。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 规划-执行：原理与规划器

> 本文是「规划-执行模式」系列第 1 篇（共 3 篇）。下一篇：[规划-执行：执行器与完整实现](plan-execute-executor.md)

## 1. 概述

Plan-and-Execute（规划-执行）模式是一种将任务分解为规划阶段和执行阶段分离的 Agent 架构模式。这种模式的核心思想是：在执行任何操作之前，先通过一个专门的规划器（Planner）分析任务、分解步骤、验证计划的可行性，然后再由执行器（Executor）按照计划逐步完成任务。

与传统的 ReAct（Reasoning + Acting）模式相比，Plan-and-Execute 模式更适合处理复杂的多步骤任务，特别是在需要全局视角、长周期执行、以及失败恢复能力的场景中。

## 2. Plan-and-Execute 模式原理

### 2.1 为什么要先规划

在 Agent 系统中，"先规划后执行" 的设计哲学源于以下几个核心考量：

#### 2.1.1 全局视角与局部优化的矛盾

传统的反应式 Agent（如 ReAct）在每一步都会根据当前状态做出决策。这种方式在简单任务中表现良好，但在复杂任务中容易陷入"局部最优陷阱"——每一步的看似合理决策，最终可能导致整体方案的低效或不可行。

```javascript
// ReAct 模式的困境示例
// 假设任务：重构一个包含 50 个文件的模块架构

// ReAct 方式：每一步都基于当前状态决策
while (!taskComplete) {
  const state = getCurrentState();      // 获取当前状态
  const reasoning = await think(state); // 推理下一步
  const action = await act(reasoning);  // 执行动作
  
  // 问题：没有全局视角，可能走回头路
  // 第 5 步可能撤销第 3 步的工作
}
```

规划器模式的优势在于，它会在执行前构建完整的任务图：

```javascript
// Plan-and-Execute 模式
class Planner {
  async plan(task) {
    // 1. 分析任务需求
    const goal = this.analyzeGoal(task);
    
    // 2. 生成完整的任务序列
    const taskGraph = this.decompose(goal);
    
    // 3. 验证计划可行性
    const validatedPlan = this.validate(taskGraph);
    
    // 4. 返回可执行的计划
    return validatedPlan;
  }
}

// 执行器按照计划执行，无需重新决策
const plan = await planner.plan(complexTask);
await executor.execute(plan);
```

#### 2.1.2 资源分配与时间优化

规划阶段可以提前识别资源需求，从而实现更优的资源分配和时间规划：

```typescript
interface TaskStep {
  id: string;
  name: string;
  estimatedTime: number;    // 预估耗时
  requiredCapabilities: string[]; // 所需能力
  parallelizable: boolean;   // 是否可并行
  dependencies: string[];     // 依赖项
}

interface ExecutionPlan {
  steps: TaskStep[];
  totalEstimatedTime: number;
  criticalPath: string[];    // 关键路径
  parallelBatches: TaskStep[][]; // 可并行的批次
}

// 规划器可以分析并行机会
function optimizeExecutionPlan(steps: TaskStep[]): ExecutionPlan {
  // 识别可并行的步骤
  const parallelBatches = groupParallelizable(steps);
  
  // 计算关键路径
  const criticalPath = findCriticalPath(steps);
  
  // 计算总预估时间（考虑并行）
  const totalTime = calculateTotalTime(steps, parallelBatches);
  
  return { steps, totalEstimatedTime: totalTime, criticalPath, parallelBatches };
}
```

#### 2.1.3 失败预判与容错设计

规划阶段可以提前识别潜在的失败点，并设计相应的恢复策略：

```typescript
// 第 1 段：定义风险评估的数据契约（RiskAssessment）
// 用接口而非 class，是为了让"风险报告"成为可序列化的纯数据（Durable/passable），
// 便于在规划器各阶段之间传递、落盘或日志化；rollbackPlan 内嵌而非引用 id，
// 保证一条评估记录自包含，回滚时无需再回查其他结构。
interface RiskAssessment {
  stepId: string;
  riskLevel: 'low' | 'medium' | 'high';
  potentialFailures: string[];
  mitigationStrategy: string;
  rollbackPlan: RollbackPlan;
}

// 第 2 段：定义回滚计划（RollbackPlan），它是"高风险步骤"的安全网
// checkpointSteps 记录可回退的检查点；rollbackActions 用 Map 建立
// "步骤 id -> 异步补偿动作"的映射，函数类型 () => Promise<void> 保证回滚可 await；
// statePreservation 单独抽出策略，是因为"回滚"往往难在状态如何保留/恢复，
// 这块逻辑易变，独立成策略便于替换而不动主干。
interface RollbackPlan {
  checkpointSteps: string[];
  rollbackActions: Map<string, () => Promise<void>>;
  statePreservation: StatePreservationStrategy;
}

// 第 3 段：规划器进行风险评估
// 串行 for-await 而非 Promise.all：每一步的风险分析可能依赖前一步结果（如共享状态、
// 资源配额），且串行能让评估顺序与 plan.steps 一致，输出可预测。
// 复杂度 O(n) 次异步调用；若 analyzeStepRisks 抛错，整个函数会中断——
// 这里刻意不吞异常，让上层决定是降级还是终止规划。
async function assessRisks(plan: ExecutionPlan): Promise<RiskAssessment[]> {
  const assessments: RiskAssessment[] = [];  // 结果累积器，顺序与 plan.steps 严格对应
  
  for (const step of plan.steps) {
    const risks = await analyzeStepRisks(step);  // 每步单独分析，返回原始风险清单供后续派生多项字段
    
    // 由同一份 risks 派生出五个字段：保证 riskLevel、潜在失败、缓解与回滚
    // 都基于同一证据快照，不会各自重新分析导致不一致（易错点：勿多次调用 analyzeStepRisks）。
    assessments.push({
      stepId: step.id,
      riskLevel: calculateRiskLevel(risks),        // 归并风险等级，通常是最高危项决定整体等级
      potentialFailures: risks.map(r => r.description),  // 只留人类可读描述，丢弃内部结构，便于展示与存储
      mitigationStrategy: designMitigation(risks),  // 预防性策略：如何在执行前降低发生概率
      rollbackPlan: designRollback(risks)           // 兜底策略：失败后如何安全回退到检查点
    });
  }
  
  return assessments;  // 边界条件：plan.steps 为空时返回空数组，调用方需能处理"无评估"情形
}
```
### 2.2 与 ReAct 的区别

Plan-and-Execute 模式与 ReAct 模式代表了两种不同的 Agent 设计哲学。下表详细对比了两种模式的差异：

| 维度 | ReAct 模式 | Plan-and-Execute 模式 |
|------|-----------|----------------------|
| **决策时机** | 每步决策（Reactive） | 规划阶段集中决策（Deliberative） |
| **状态依赖** | 高度依赖当前状态 | 规划不依赖中间状态 |
| **执行灵活性** | 高（可随时调整） | 低（按计划执行） |
| **规划开销** | 低（无显式规划） | 高（需要额外规划时间） |
| **适用场景** | 简单、探索性任务 | 复杂、结构化任务 |
| **失败恢复** | 自然重新规划 | 需要显式回滚机制 |
| **全局优化** | 无（贪心策略） | 支持（基于完整计划） |
| **调试难度** | 低（步骤清晰） | 高（规划逻辑复杂） |

#### 2.2.1 决策流程对比图

```
ReAct 模式流程：
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ┌─────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌─────┐│
│   │Start│───▶│Think │───▶│ Act  │───▶│Observe│───▶│End? ││
│   └─────┘    └──────┘    └──────┘    └──────┘    └─────┘│
│                    ▲            │           │           │
│                    │            │           │           │
│                    └────────────┴───────────┘           │
│                         循环决策                         │
└─────────────────────────────────────────────────────────┘

Plan-and-Execute 模式流程：
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ┌─────────────────────────────────────────────────────┐│
│   │                    规划阶段                          ││
│   │  ┌───────┐   ┌─────────┐   ┌────────┐   ┌────────┐ ││
│   │  │Analyze│──▶│Decompose│──▶│Validate│──▶│Optimize│ ││
│   │  └───────┘   └─────────┘   └────────┘   └────────┘ ││
│   └─────────────────────────────────────────────────────┘│
│                          │                              │
│                          ▼                              │
│   ┌─────────────────────────────────────────────────────┐│
│   │                    执行阶段                          ││
│   │  ┌───────┐   ┌─────────┐   ┌────────┐   ┌────────┐ ││
│   │  │ Check │──▶│ Execute │──▶│ Verify │──▶│Commit? │ ││
│   │  └───────┘   └─────────┘   └────────┘   └────────┘ ││
│   │                                     │              ││
│   │                                     ▼              ││
│   │                              ┌──────────┐            ││
│   │                              │ Rollback │ (if fail) ││
│   │                              └──────────┘            ││
│   └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

#### 2.2.2 代码层面的具体差异

```typescript
// ReAct Agent 实现
class ReActAgent {
  async run(task: string, tools: Tool[]) {
    let state = { task, history: [], currentStep: 0 };
    
    while (!this.isComplete(state)) {
      // 1. 思考：基于当前状态推理下一步
      const context = this.buildContext(state);
      const reasoning = await this.llm.reason(context, tools);
      
      // 2. 行动：根据推理结果选择工具
      const action = reasoning.action;
      const result = await this.executeTool(action, tools);
      
      // 3. 观察：更新状态
      state.history.push({ reasoning, action, result });
      state.currentStep++;
    }
    
    return this.extractAnswer(state);
  }
}

// Plan-and-Execute Agent 实现
class PlanExecuteAgent {
  async run(task: string, tools: Tool[]) {
    // 阶段 1：规划（一次性完成所有决策）
    const plan = await this.planner.createPlan(task, tools);
    
    // 阶段 2：执行（按计划执行，不重新决策）
    let executionState = { plan, completedSteps: [], checkpoint: null };
    
    for (const step of plan.steps) {
      const result = await this.executor.executeStep(step);
      
      if (result.success) {
        executionState.completedSteps.push(step);
        executionState.checkpoint = this.saveCheckpoint(step, result);
      } else {
        // 失败时按预设策略处理
        const recovery = await this.handleFailure(step, result, executionState);
        // 可能的回滚或重规划
      }
    }
    
    return this.compileResults(executionState);
  }
}
```

### 2.3 执行 vs 计划权衡

#### 2.3.1 何时选择 Plan-and-Execute

规划的开销是真实存在的。在某些场景下，详细的规划反而是累赘：

```typescript
// 决策矩阵：根据任务特征选择模式

interface TaskCharacteristics {
  stepsCount: number;        // 预估步骤数
  stepDependencies: number;  // 步骤间依赖度
  explorationFactor: number;  // 探索性程度 (0-1)
  reversibility: number;       // 可逆性程度 (0-1)
  timeSensitivity: number;    // 时间敏感度 (0-1)
}

function recommendPattern(task: TaskCharacteristics): 'react' | 'plan-execute' | 'hybrid' {
  const score = calculatePlanningMerit(task);
  
  if (score > 0.7) return 'plan-execute';
  if (score < 0.3) return 'react';
  return 'hybrid';
}

function calculatePlanningMerit(task: TaskCharacteristics): number {
  // 更多步骤、更高依赖、更低探索性 = 更需要规划
  const complexityFactor = Math.min(task.stepsCount / 10, 1) * 0.3;
  const dependencyFactor = task.stepDependencies * 0.3;
  const explorationFactor = (1 - task.explorationFactor) * 0.2;
  const reversibilityFactor = (1 - task.reversibility) * 0.1;
  const timeSensitivityFactor = (1 - task.timeSensitivity) * 0.1;
  
  return complexityFactor + dependencyFactor + explorationFactor + 
         reversibilityFactor + timeSensitivityFactor;
}
```

#### 2.3.2 自适应规划开销

真正的系统需要能够自适应地选择规划深度：

```typescript
enum PlanningDepth {
  NONE = 0,           // 无规划（ReAct 模式）
  LIGHT = 1,          // 轻量规划（粗略步骤列表）
  MODERATE = 2,       // 中等规划（包含依赖分析）
  DEEP = 3,           // 深度规划（完整风险评估与优化）
}

class AdaptivePlanner {
  async plan(task: string, context: PlanningContext): Promise<ExecutionPlan> {
    const depth = this.determinePlanningDepth(task, context);
    
    switch (depth) {
      case PlanningDepth.NONE:
        return this.createEmptyPlan(task); // 直接执行，ReAct 模式
        
      case PlanningDepth.LIGHT:
        return this.createRoughPlan(task);
        
      case PlanningDepth.MODERATE:
        return this.createModeratePlan(task);
        
      case PlanningDepth.DEEP:
        return this.createDeepPlan(task);
    }
  }
  
  private determinePlanningDepth(task: string, context: PlanningContext): PlanningDepth {
    const complexity = this.estimateComplexity(task);
    const availableTime = context.timeBudget;
    const taskUrgency = context.urgency;
    
    // 时间紧迫且任务简单：用轻量规划
    if (taskUrgency > 0.8 && complexity < 0.3) {
      return PlanningDepth.LIGHT;
    }
    
    // 复杂任务且时间充足：用深度规划
    if (complexity > 0.7 && availableTime > 5000) {
      return PlanningDepth.DEEP;
    }
    
    return PlanningDepth.MODERATE;
  }
}
```

## 3. 规划器设计

### 3.1 任务分解算法

任务分解是规划器的核心功能。一个好的分解算法需要能够：

1. 将复杂任务拆分为可执行的原子步骤
2. 确保步骤间的逻辑连贯性
3. 处理抽象级别的不一致性
4. 识别隐式依赖关系

#### 3.1.1 层次化任务分解

```typescript
interface TaskNode {
  id: string;
  description: string;
  abstractionLevel: 'high' | 'medium' | 'low';
  children?: TaskNode[];
  estimatedComplexity: number;
  requiredCapabilities: string[];
}

// 层次化分解算法
class HierarchicalTaskDecomposer {
  private llm: LLM;
  
  async decompose(task: string, targetLevel: 'medium' | 'low'): Promise<TaskNode> {
    const root: TaskNode = {
      id: generateId(),
      description: task,
      abstractionLevel: 'high',
      estimatedComplexity: await this.estimateComplexity(task),
      requiredCapabilities: []
    };
    
    // 递归分解直到达到目标抽象级别
    await this.decomposeNode(root, targetLevel);
    
    return root;
  }
  
  private async decomposeNode(node: TaskNode, targetLevel: 'medium' | 'low'): Promise<void> {
    if (node.abstractionLevel === targetLevel) {
      return; // 达到目标级别，停止分解
    }
    
    // 调用 LLM 生成子任务
    const subtasks = await this.llm.decomposeTask(node.description);
    
    node.children = subtasks.map((subtask: string) => ({
      id: generateId(),
      description: subtask,
      abstractionLevel: this.elevateLevel(node.abstractionLevel),
      estimatedComplexity: this.estimateLocalComplexity(subtask),
      requiredCapabilities: this.inferCapabilities(subtask)
    }));
    
    // 递归分解子任务
    for (const child of node.children) {
      await this.decomposeNode(child, targetLevel);
    }
  }
  
  private elevateLevel(current: 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
    const levels: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    const currentIndex = levels.indexOf(current);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }
}
```

#### 3.1.2 基于工具的任务映射

```typescript
// 第 1 段：能力描述契约——把"工具能做什么"抽象成可比对的结构
// 分解决策的核心是把任务需求与工具能力做匹配，而非直接猜工具名。
// 因此先定义能力画像：schema 用于校验参数/返回值，applicableActions 描述
// 该能力适用的动作语义，examples 既是给 LLM 的少样本提示，也是人工审计依据。
interface ToolCapability {
  name: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
  applicableActions: string[];
  examples: string[];
}

// 第 2 段：分解器主体——持有原始工具集与"能力 → 工具"索引
// 两级结构（tools 与 capabilityIndex）是刻意的冗余：tools 保留完整对象供执行期使用，
// capabilityIndex 是 O(1) 的能力反查表，避免每次分解都线性扫全部工具。
class ToolBasedDecomposer {
  private tools: Tool[];
  private capabilityIndex: Map<string, ToolCapability>;
  
  // 构造函数即完成索引构建：索引是不可变派生数据，提前算好可避免
  // 把构建成本摊到每次 decompose 调用上（分解常被高频调用）。
  constructor(tools: Tool[]) {
    this.tools = tools;
    this.capabilityIndex = this.buildCapabilityIndex(tools);
  }
  
  // 第 3 段：分解主流程——"意图 → 能力 → 工具 → 有序步骤"的三级映射
  // 关键数据流：自然语言任务先被语义化为 TaskIntent，再映射为抽象能力序列，
  // 最后落地为具体工具调用步骤。分两跳（意图→能力→工具）而非一步到位，
  // 是为了让能力匹配可复用、可缓存，且与具体工具实现解耦。
  async decompose(task: string): Promise<TaskStep[]> {
    // 1. 理解任务意图
    // 先做语义归一化：后续匹配只依赖结构化 intent，不再碰原始文本，
    // 这样换词表/换模型时只需重跑这一步。
    const intent = await this.extractIntent(task);
    
    // 2. 识别所需能力
    // 让 LLM 只负责"选能力并排序"，不直接选工具，缩小其决策空间、降低幻觉。
    const requiredCapabilities = await this.matchCapabilities(intent);
    
    // 3. 按能力排序并分组
    // orderedSteps 顺序即执行顺序；usedTools 做去重，防止同一工具被多个
    // 能力重复选中（例如通用 shell 工具可能同时匹配多个能力）。
    const orderedSteps: TaskStep[] = [];
    const usedTools = new Set<string>();
    
    // 外层遍历保证能力顺序（LLM 给出的执行序）不被打破，
    // 内层再挑具体工具，做到"顺序由能力定，实现由工具定"。
    for (const capability of requiredCapabilities) {
      const compatibleTools = this.findCompatibleTools(capability, usedTools);
      
      // 同一能力可展开为多个步骤（如分页抓取），因此是内层循环而非单点赋值。
      for (const tool of compatibleTools) {
        const step = this.createStepFromTool(tool, capability);
        orderedSteps.push(step);
        usedTools.add(tool.name);
      }
    }
    
    return orderedSteps;
  }
  
  // 第 4 段：意图抽取——非结构化文本 → 结构化 TaskIntent
  // 用 structuredOutput + Schema 强约束输出，把"尽力而为的解析"变成
  // 可校验的契约，下游就不必再做防御式字段检查。
  private async extractIntent(task: string): Promise<TaskIntent> {
    // 提示词显式索要目标/约束/成功标准四要素：约束与成功标准常被忽略，
    // 但它们是后续步骤排序与终止判断的依据。模板变量直接内插 task，
    // 注意生产环境需防提示注入（用户文本可能含指令性内容）。
    const prompt = `
      分析以下任务的意图和目标：
      任务：${task}
      
      请提取：
      1. 主要目标
      2. 次要目标
      3. 约束条件
      4. 成功标准
    `;
    
    return await this.llm.structuredOutput(prompt, TaskIntentSchema);
  }
  
  // 第 5 段：能力匹配——意图 + 能力目录 → 有序能力名列表
  // 只投喂能力名称而非完整 schema，是为了压缩提示长度、聚焦语义匹配；
  // 代价是匹配不感知参数细节，故把参数校验推迟到建步骤/执行阶段。
  private async matchCapabilities(intent: TaskIntent): Promise<string[]> {
    // 从 Map 取 values 得能力全集；顺序即工具注册顺序，作为 LLM 的稳定输入，
    // 避免因顺序抖动导致同一任务分解结果不可复现。
    const allCapabilities = Array.from(this.capabilityIndex.values());
    
    // 依赖 LLM 的 reason 做组合与排序：单能力选择易，难在多能力间的先后依赖，
    // 交给模型推理再以 OutputSchema 收敛格式，返回 orderedCapabilities 数组。
    const matches = await this.llm.reason(
      `任务意图：${JSON.stringify(intent)}
       可用能力：${JSON.stringify(allCapabilities.map(c => c.name))}
       
       请匹配最合适的能力组合，按执行顺序排列。`,
      OutputSchema
    );
    
    return matches.orderedCapabilities;
  }
}
```
#### 3.1.3 图搜索式分解

将任务分解建模为图搜索问题：

```typescript
interface DecompositionNode {
  task: string;
  gScore: number;  // 已消耗的"分解代价"
  fScore: number;  // f(n) = g(n) + h(n)
  parent: DecompositionNode | null;
}

class GraphSearchDecomposer {
  private goalTest: (task: string) => Promise<boolean>;
  private successorFn: (task: string) => Promise<string[]>;
  private heuristicFn: (task: string) => number;
  
  constructor(config: DecomposerConfig) {
    this.goalTest = config.goalTest;
    this.successorFn = config.successorFn;
    this.heuristicFn = config.heuristicFn;
  }
  
  // A* 搜索风格的分解
  async decompose(startTask: string): Promise<TaskStep[]> {
    const openSet: DecompositionNode[] = [{
      task: startTask,
      gScore: 0,
      fScore: this.heuristicFn(startTask),
      parent: null
    }];
    
    const closedSet = new Set<string>();
    const goalNodes: DecompositionNode[] = [];
    
    while (openSet.length > 0) {
      // 取出 f(n) 最小的节点
      openSet.sort((a, b) => a.fScore - b.fScore);
      const current = openSet.shift()!;
      
      // 检查是否达到目标
      if (await this.goalTest(current.task)) {
        goalNodes.push(current);
        continue; // 继续找其他解
      }
      
      closedSet.add(current.task);
      
      // 扩展子节点
      const successors = await this.successorFn(current.task);
      
      for (const successor of successors) {
        if (closedSet.has(successor)) continue;
        
        const gScore = current.gScore + 1;
        const hScore = this.heuristicFn(successor);
        
        const existingNode = openSet.find(n => n.task === successor);
        
        if (!existingNode) {
          openSet.push({
            task: successor,
            gScore,
            fScore: gScore + hScore,
            parent: current
          });
        } else if (gScore < existingNode.gScore) {
          existingNode.gScore = gScore;
          existingNode.fScore = gScore + hScore;
          existingNode.parent = current;
        }
      }
    }
    
    // 重建最优解路径
    return this.reconstructPath(goalNodes[0]);
  }
  
  private reconstructPath(node: DecompositionNode): TaskStep[] {
    const steps: TaskStep[] = [];
    let current: DecompositionNode | null = node;
    
    while (current) {
      steps.unshift({
        id: generateId(),
        name: current.task,
        action: this.inferAction(current.task),
        estimatedTime: current.gScore * UNIT_TIME
      });
      current = current.parent;
    }
    
    return steps;
  }
}
```

### 3.2 依赖分析

#### 3.2.1 显式依赖 vs 隐式依赖

```typescript
interface Dependency {
  type: 'explicit' | 'implicit' | 'data' | 'temporal';
  source: string;  // 依赖方步骤 ID
  target: string; // 被依赖方步骤 ID
  description: string;
  criticality: 'required' | 'preferred' | 'optional';
}

// 依赖分析器
class DependencyAnalyzer {
  // 检测隐式依赖（数据流依赖）
  async detectImplicitDependencies(steps: TaskStep[]): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];
    const variableTracker = new VariableTracker();
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // 提取步骤产生和消费的变量
      const outputs = this.extractOutputs(step);
      const inputs = this.extractInputs(step);
      
      // 检查数据流依赖
      for (const input of inputs) {
        const producerStep = variableTracker.findProducer(input);
        
        if (producerStep && producerStep !== step.id) {
          dependencies.push({
            type: 'data',
            source: step.id,
            target: producerStep,
            description: `${step.name} 需要 ${input}，由 ${producerStep} 提供`,
            criticality: 'required'
          });
        }
      }
      
      // 更新变量追踪器
      variableTracker.recordStep(step.id, outputs);
    }
    
    return dependencies;
  }
  
  // 语义依赖分析
  async detectSemanticDependencies(steps: TaskStep[]): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const dependency = await this.checkSemanticDependency(steps[i], steps[j]);
        
        if (dependency) {
          dependencies.push(dependency);
        }
      }
    }
    
    return dependencies;
  }
  
  private async checkSemanticDependency(
    earlier: TaskStep, 
    later: TaskStep
  ): Promise<Dependency | null> {
    const prompt = `
      判断以下两个任务步骤之间是否存在语义上的依赖关系：
      
      步骤 A：${earlier.description}
      步骤 B：${later.description}
      
      检查维度：
      1. B 是否需要 A 的输出作为输入？
      2. B 是否依赖于 A 产生的副作用？
      3. A 和 B 的执行顺序是否有语义要求？
      4. 是否存在资源共享或冲突？
      
      如果存在依赖，说明依赖类型和原因。
    `;
    
    const result = await this.llm.structuredOutput(prompt, DependencySchema);
    
    if (result.hasDependency) {
      return {
        type: result.dependencyType,
        source: later.id,
        target: earlier.id,
        description: result.explanation,
        criticality: result.criticality
      };
    }
    
    return null;
  }
}
```

#### 3.2.2 依赖图的构建与分析

```typescript
class DependencyGraph {
  // 第 1 段：三个索引表——同一张依赖图的三份冗余"视图"
  // adjacencyList 存正向边（前置 → 后继），供 DFS/拓扑排序顺流而下；reverseList[node] 是 node 的全部前置集合，
  // 供并行分批时回答"我的依赖是否都已完成"；inDegree 是 Kahn 算法的启动条件。
  // 易错点：inDegree 只统计 required 边，而 reverseList 把 required 与 preferred 一并记入，
  // 二者对"依赖"的定义并不一致，导致第 5、6 段对同一张图给出不同强度的约束（见第 6 段的说明）。
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseList: Map<string, Set<string>> = new Map();
  private inDegree: Map<string, number> = new Map();
  
  // 第 2 段：构造函数——把入参一次性物化成图结构
  // 只在构造期读取 steps/dependencies，之后不再持有它们的引用；这样即使外部改动原数组，图也不会"半更新"而自相矛盾。
  // 代价是新增步骤必须重建实例，属于典型的以可预知性换灵活性。
  constructor(steps: TaskStep[], dependencies: Dependency[]) {
    this.buildGraph(steps, dependencies);
  }
  
  // 第 3 段：建图——两轮遍历，先铺点、后连边
  // 整体 O(V + E)。刻意拆成两轮是为了防止"边引用了未登记节点的 id"：若边先于点处理，get(...) 会返回 undefined，
  // 后面的 !.add 会直接抛错；先铺满所有点可让依赖数据里的脏 id 无害地落成一个新 Set 分支。
  private buildGraph(steps: TaskStep[], dependencies: Dependency[]): void {
    // 初始化
    // 给每个步骤占位（哪怕它是毫无依赖的孤立点）：后续拓扑排序与分批算法都靠遍历 Map 的 keys 发现节点。
    // 同时利用 Map/Set 的插入序，让之后同层节点的输出顺序稳定可复现。
    for (const step of steps) {
      this.adjacencyList.set(step.id, new Set());
      this.reverseList.set(step.id, new Set());
      this.inDegree.set(step.id, 0);
    }
    
    // 添加依赖边（source 依赖 target，即 source -> target）
    // 实际落库方向与这行描述相反：代码是 adjacencyList[target].add(source)，即边由"被依赖者指向依赖者"。
    // 这样拓扑序天然是前置先出，Kahn 的出队顺序就直接是可执行顺序；只需反转语义理解，不需要反转图。
    // criticality 的门槛：required 与 preferred 都连边（都会参与判环与分批），但只有 required 加到入度上——
    // preferred 是"软顺序"，不阻塞拓扑排序，却仍会被第 6 段的批划分尊重。
    for (const dep of dependencies) {
      if (dep.criticality === 'required' || dep.criticality === 'preferred') {
        this.adjacencyList.get(dep.target)!.add(dep.source);
        this.reverseList.get(dep.source)!.add(dep.target);
        
        if (dep.criticality === 'required') {
          this.inDegree.set(dep.source, this.inDegree.get(dep.source)! + 1);
        }
      }
    }
  }
  
  // 第 4 段：循环依赖检测——带"当前路径"标记的 DFS
  // 判别依据是回边：只有指向 recursionStack（本次 DFS 路径上尚未回溯的节点）的边才成环；
  // 指向已 visited 但不在栈上的节点，说明那条支路已经走完，不可能再回到自己，忽略即可。
  // 复杂度：节点/边各访问一次是 O(V + E)；但 [...path] 每次递归都复制整条路径，最坏退化为 O(V * E) 级别的复制开销。
  // 检测循环依赖
  detectCycles(): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];
    
    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      
      for (const neighbor of this.adjacencyList.get(nodeId) || []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);   // 传副本：让每条支路拿到独立的路径快照，从而无需在回溯时手写 pop 也能保证 path 正确
        } else if (recursionStack.has(neighbor)) {
          // 发现循环
          // indexOf 定位环的入口节点，slice 出环体后再追加一个 neighbor，使返回值首尾同节点，
          // 调用方能一眼看出闭环的起点；自环（source === target）在这里会得到形如 [x, x] 的结果。
          const cycleStart = path.indexOf(neighbor);
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }
      
      recursionStack.delete(nodeId);   // 关键回溯：离开节点必须出栈，否则已完成的节点会被误判为回边端点，凭空造出环
    };
    
    // 外层循环兜住非连通图：每个未访问节点都作为新 DFS 的根，保证所有弱连通分量（以及入度非 0 却被孤立的环）都被覆盖。
    for (const nodeId of this.adjacencyList.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }
    
    return cycles;   // 空数组即无环；同一个环可能被不同起点重复报告，调用方不要假设各元素互不重复
  }
  
  // 第 5 段：拓扑排序——Kahn 入度法（BFS 剥离）
  // 思路：反复取出入度为 0 的节点，把它从图中摘掉（其后继入度减一），能全部摘完说明无环。
  // 复杂度 O(V + E)；queue 用数组 + shift() 时出队是 O(V)，V 大时建议改指针下标或真双端队列（此处不修改实现）。
  // 重大副作用：本方法原地改写 this.inDegree，实例因此变成"一次性"的——重复调用，或先调用本方法再调用第 6 段，
  // 都会因入度已被扣减而得到错误结果。需要多次排序应重新 buildGraph，或先复制一份入度表。
  // 拓扑排序
  topologicalSort(): string[] | null {
    // 先显式判环：把"有环"这一失败原因和"图不连通"彻底区分开，有环时统一以 null 上报，
    // 逼迫调用方在类型层面处理这个空值分支，而不是拿到一个缺斤少两的数组继续用。
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      console.error('存在循环依赖，无法拓扑排序:', cycles);
      return null;
    }
    
    const result: string[] = [];
    const queue: string[] = [];
    
    // 入度为 0 的节点入队
    // 这些是没有任何 required 前置的步骤，也是天然的并行起点；迭代 Map 相当于按 steps 的登记顺序入队，
    // 使同层节点的输出次序稳定，便于测试断言与结果 diff。
    for (const [nodeId, degree] of this.inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;   // 非空判断由循环条件保证，! 只是为了让 TS 接受
      result.push(nodeId);
      
      // 摘除当前节点：每个后继的 required 前置数减一，减到 0 就意味着它的约束全部满足，可以入队了
      for (const neighbor of this.adjacencyList.get(nodeId) || []) {
        const newDegree = this.inDegree.get(neighbor)! - 1;
        this.inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    // 前面已判过环，正常情况下队列必然排空所有节点；这里不做长度校验属于隐式信任，
    // 若日后 inDegree 与邻接表被外部改动，此处可能静默返回残缺序列，是值得留意的边界。
    return result;
  }
  
  // 第 6 段：并行批次识别——按"层"剥离的贪心分组
  // 与 Kahn 的关键差异：这里用 reverseList 判断前置是否全部完成，而 reverseList 含 preferred 边，
  // 所以 preferred 会真实影响批次划分（比拓扑排序更严格）——这是两段逻辑对 criticality 处理不对称之处，也是本类最易被误解的语义。
  // 复杂度：最坏 O(V^2 + E)，每轮都要全量扫描 remaining 及其前置集合；批次数等于依赖图的关键路径长度。
  // 识别可并行的批次
  identifyParallelBatches(): string[][] {
    const batches: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(this.adjacencyList.keys());   // 用 Set 而非数组，是为了在 O(1) 里删除已完成节点，避免每轮重建列表
    
    while (remaining.size > 0) {
      // 找出所有依赖都已完成的步骤
      // 下面的 || new Set() 只是防御性兜底：节点在构造阶段已全部登记，正常情况下不会走到这里。
      const ready: string[] = [];
      
      for (const nodeId of remaining) {
        const dependencies = this.reverseList.get(nodeId) || new Set();
        const allDependenciesMet = [...dependencies].every(dep => completed.has(dep));
        
        if (allDependenciesMet) {
          ready.push(nodeId);
        }
      }
      
      // 一轮下来无法推进任何节点，只能是环：无前置的节点理论上早该被摘走了。
      // 注意这里用 throw，而第 5 段的失败是返回 null——两种失败契约不一致，调用方必须分场景处理（catch vs 判空）。
      if (ready.length === 0 && remaining.size > 0) {
        throw new Error('依赖图中存在循环');
      }
      
      batches.push(ready);   // ready 内部两两无依赖，可完全并行；批内顺序不影响调度语义，只影响展示
      
      for (const nodeId of ready) {
        completed.add(nodeId);
        remaining.delete(nodeId);
      }
    }
    
    return batches;   // 批次数即并行调度的最少"轮数"；空图返回 []，调用方无需特判
  }
}
```
### 3.3 优先级排序

#### 3.3.1 多维度优先级评估

```typescript
interface PriorityFactors {
  urgency: number;           // 紧急程度 (0-1)
  importance: number;        // 重要程度 (0-1)
  dependency: number;         // 依赖度（被多少其他步骤依赖）
  blockingFactor: number;    // 阻塞因子（是否是其他步骤的前置条件）
  resourceAvailability: number; // 资源可用性 (0-1)
  estimatedEffort: number;   // 预估工作量
}

class PriorityCalculator {
  calculatePriority(step: TaskStep, context: PlanningContext): number {
    const factors = this.computeFactors(step, context);
    
    // 加权计算优先级
    const weights = {
      urgency: 0.25,
      importance: 0.25,
      blockingFactor: 0.20,
      dependency: 0.10,
      resourceAvailability: 0.10,
      effortEfficiency: 0.10
    };
    
    // 努力效率：越小的工作越优先
    const effortEfficiency = 1 / (1 + factors.estimatedEffort);
    
    const score = 
      factors.urgency * weights.urgency +
      factors.importance * weights.importance +
      factors.blockingFactor * weights.blockingFactor +
      factors.dependency * weights.dependency +
      factors.resourceAvailability * weights.resourceAvailability +
      effortEfficiency * weights.effortEfficiency;
    
    return this.normalizeScore(score);
  }
  
  sortByPriority(steps: TaskStep[], context: PlanningContext): TaskStep[] {
    return steps.sort((a, b) => {
      const priorityA = this.calculatePriority(a, context);
      const priorityB = this.calculatePriority(b, context);
      return priorityB - priorityA; // 降序排列
    });
  }
  
  // 生成执行顺序建议（考虑依赖约束）
  generateExecutionOrder(
    steps: TaskStep[], 
    dependencies: Dependency[]
  ): TaskStep[] {
    const graph = new DependencyGraph(steps, dependencies);
    const topologicalOrder = graph.topologicalSort();
    
    if (!topologicalOrder) {
      throw new Error('无法生成执行顺序：存在循环依赖');
    }
    
    // 按照拓扑排序的顺序，但在每个批次内按优先级排序
    const batches = graph.identifyParallelBatches();
    const result: TaskStep[] = [];
    const stepMap = new Map(steps.map(s => [s.id, s]));
    
    for (const batch of batches) {
      const batchSteps = batch.map(id => stepMap.get(id)!);
      const sortedBatch = this.sortByPriority(batchSteps, this.context);
      result.push(...sortedBatch);
    }
    
    return result;
  }
}
```

#### 3.3.2 动态优先级调整

```typescript
class DynamicPriorityManager {
  private basePriorities: Map<string, number> = new Map();
  private runtimeFactors: Map<string, RuntimeFactor> = new Map();
  
  updatePriority(stepId: string, event: ExecutionEvent): number {
    const basePriority = this.basePriorities.get(stepId) || 0.5;
    const runtime = this.runtimeFactors.get(stepId) || {
      retryCount: 0,
      waitTime: 0,
      resourceContention: 0
    };
    
    switch (event.type) {
      case 'retry':
        // 重试降低优先级，但有下限
        runtime.retryCount++;
        return Math.max(0.1, basePriority - runtime.retryCount * 0.1);
        
      case 'resource_wait':
        // 等待资源超过阈值时提升优先级
        runtime.waitTime += event.duration;
        if (runtime.waitTime > 30000) { // 30秒
          return basePriority * 1.2;
        }
        return basePriority;
        
      case 'dependency_completed':
        // 依赖完成后，检查是否有任务在等待这个任务
        const waiters = this.findWaitingTasks(stepId);
        if (waiters.length > 0) {
          return basePriority * 1.1; // 稍微提升
        }
        return basePriority;
        
      case 'external_deadline':
        // 外部截止时间临近，大幅提升优先级
        const timeToDeadline = event.deadline - Date.now();
        if (timeToDeadline < 60000) { // 1分钟内
          return Math.min(1.0, basePriority + 0.3);
        }
        return basePriority;
        
      default:
        return basePriority;
    }
  }
}
```

### 3.4 计划验证

#### 3.4.1 计划完整性检查

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

class PlanValidator {
  // 第 1 段：校验入口——按固定顺序串联各专项检查
  // 设计意图：把"目标→依赖→资源→时间"四类检查串成一条流水线，前方检查产生的问题
  // 记录进 errors/warnings 后不中断流程，最终统一汇总，保证一次调用暴露尽可能多的缺陷。
  // 关键数据流：三个累积数组（errors/warnings/suggestions）作为贯穿全流程的可变状态，
  // valid 只在结尾由 errors.length 推导，避免中途提前判定导致漏报。
  async validate(plan: ExecutionPlan): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    
    // 1. 检查目标覆盖
    const goalCoverage = this.checkGoalCoverage(plan);
    if (!goalCoverage.complete) {
      errors.push({
        code: 'INCOMPLETE_GOAL',
        message: `目标未完全覆盖: ${goalCoverage.missingGoals.join(', ')}`,
        severity: 'error'
      });
    }
    
    // 2. 检查依赖完整性
    const dependencyCheck = this.checkDependencies(plan);
    errors.push(...dependencyCheck.errors);   // 用展开合并多错误，避免覆盖已有 errors
    warnings.push(...dependencyCheck.warnings);
    
    // 3. 检查资源需求
    const resourceCheck = this.checkResources(plan);
    if (!resourceCheck.satisfiable) {
      errors.push({
        code: 'INSUFFICIENT_RESOURCES',
        message: `资源不足: ${resourceCheck.insufficient.join(', ')}`,
        severity: 'error'
      });
    }
    
    // 4. 检查时间约束
    const timeCheck = this.checkTimeConstraints(plan);
    if (!timeCheck.feasible) {
      // 时间超限只降级为 warning：计划仍可能通过人工调整执行，不构成硬性阻断
      warnings.push({
        code: 'TIME_CONSTRAINT_VIOLATION',
        message: `预计耗时 ${timeCheck.estimated} 超过限制 ${timeCheck.limit}`,
        severity: 'warning'
      });
    }
    
    // 5. 生成优化建议
    // 放在最后执行：建议生成依赖前四步累积的 errors/warnings，作为上下文化输入
    suggestions.push(...this.generateSuggestions(plan, errors, warnings));
    
    // 6. 汇总结果——valid 是 errors 的纯函数，任何一处 error 都会使计划整体无效
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
  
  // 第 2 段：目标覆盖度检查——集合求差
  // 原理：把每个步骤声明的 achievesGoals 扁平化后装入 Set，用 O(1) 查找替代
  // 对 targetGoals 的双重遍历；整体复杂度 O(步骤数 × 每步目标数 + 目标数)。
  // 边界：achievesGoals 可能为 undefined，用 `|| []` 兜底防止 flatMap 抛错。
  private checkGoalCoverage(plan: ExecutionPlan): { complete: boolean; missingGoals: string[] } {
    const targetGoals = plan.targetGoals;
    const coveredGoals = new Set(
      plan.steps.flatMap(s => s.achievesGoals || [])
    );
    
    // 反向筛选出"声明了但没有任何步骤覆盖"的目标，即缺口
    const missingGoals = targetGoals.filter(g => !coveredGoals.has(g));
    
    return {
      complete: missingGoals.length === 0,
      missingGoals
    };
  }
  
  // 第 3 段：依赖完整性检查——图分析 + 引用完整性两层校验
  // 返回结构区分 errors/warnings 两类：循环依赖、悬空引用属结构性错误；
  // warnings 目前预留未产出，为后续"软性依赖告警"留扩展点。
  private checkDependencies(plan: ExecutionPlan): { 
    errors: ValidationError[]; 
    warnings: ValidationWarning[] 
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // 将步骤与依赖边一次性构建成图，后续检测复用同一份邻接结构
    const graph = new DependencyGraph(plan.steps, plan.dependencies);
    
    // 检查循环依赖
    // 前置条件：DAG 是调度可行的基础，存在环则任何拓扑排序都会失败
    const cycles = graph.detectCycles();
    if (cycles.length > 0) {
      // 每个环用 ' -> ' 还原可读路径、环之间用 '; ' 分隔，便于定位问题节点
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: `检测到循环依赖: ${cycles.map(c => c.join(' -> ')).join('; ')}`,
        severity: 'error'
      });
    }
    
    // 检查缺失依赖
    // 逐条依赖验证两端 id 是否落在 steps 集合内，防止悬空引用在调度期才爆雷。
    // 复杂度：对每条依赖各做一次 O(步数) 的 some 扫描，整体 O(依赖数 × 步数)；
    // 若规模增大，可先把步骤 id 预建为 Set 降到 O(依赖数)。
    for (const dep of plan.dependencies) {
      const sourceExists = plan.steps.some(s => s.id === dep.source);
      const targetExists = plan.steps.some(s => s.id === dep.target);
      
      if (!sourceExists) {
        errors.push({
          code: 'MISSING_DEPENDENCY_SOURCE',
          message: `依赖引用的源步骤不存在: ${dep.source}`,
          severity: 'error'
        });
      }
      
      // 源、目标分别独立判错：一条依赖可能两端同时失效，需各自成条上报
      if (!targetExists) {
        errors.push({
          code: 'MISSING_DEPENDENCY_TARGET',
          message: `依赖引用的目标步骤不存在: ${dep.target}`,
          severity: 'error'
        });
      }
    }
    
    return { errors, warnings };
  }
}
```
#### 3.4.2 计划可执行性模拟

```typescript
class PlanSimulator {
  async simulate(plan: ExecutionPlan): Promise<SimulationResult> {
    const state = this.initializeState(plan);
    const executionLog: SimulatedStep[] = [];
    
    for (const step of plan.steps) {
      // 检查前置条件
      const preconditionsMet = await this.checkPreconditions(step, state);
      
      if (!preconditionsMet.satisfied) {
        executionLog.push({
          stepId: step.id,
          status: 'blocked',
          reason: preconditionsMet.reason
        });
        
        // 记录阻塞但不停止模拟
        continue;
      }
      
      // 模拟执行
      const result = await this.simulateStep(step, state);
      executionLog.push(result);
      
      // 更新状态
      if (result.status === 'success') {
        state = this.applyStateChanges(state, step, result);
      } else if (result.status === 'failure') {
        // 模拟失败处理
        const recovery = await this.simulateRecovery(step, result, state);
        executionLog.push(...recovery);
      }
    }
    
    return this.compileSimulationResult(executionLog, state);
  }
  
  private async checkPreconditions(
    step: TaskStep, 
    state: SimulationState
  ): Promise<{ satisfied: boolean; reason?: string }> {
    for (const dep of step.dependencies) {
      if (!state.completedSteps.has(dep)) {
        const depStep = state.plan.steps.find(s => s.id === dep);
        return {
          satisfied: false,
          reason: `前置步骤 ${depStep?.name || dep} 未完成`
        };
      }
    }
    
    for (const req of step.requiredResources) {
      if (!this.checkResourceAvailability(req, state)) {
        return {
          satisfied: false,
          reason: `所需资源 ${req} 不可用`
        };
      }
    }
    
    return { satisfied: true };
  }
  
  private async simulateStep(
    step: TaskStep, 
    state: SimulationState
  ): Promise<SimulatedStep> {
    // 模拟可能的失败（基于历史数据和统计）
    const failureProbability = this.estimateFailureProbability(step);
    const random = Math.random();
    
    if (random < failureProbability) {
      return {
        stepId: step.id,
        status: 'failure',
        simulatedError: this.generateRealisticError(step)
      };
    }
    
    // 模拟执行时间
    const executionTime = this.estimateExecutionTime(step);
    
    return {
      stepId: step.id,
      status: 'success',
      simulatedOutput: this.generateSimulatedOutput(step),
      executionTime
    };
  }
}
```

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|------|-------------------|-------------|----------|
| 后台管理的万行表格导出 | 规划器拆分任务、执行器并行处理 | 按行数分片，每 2000 行一个子任务，Node.js worker_threads | 分片边界要对齐表头，避免导出文件缺列 |
| 低端安卓手机的首屏加载 | 规划器静态分析资源依赖，生成加载计划 | 按路由拆包，首屏只加载关键 chunk | 低内存设备上并行解压可能触发 OOM，需限制并发为 1 |
| 多人协作白板的增量同步 | 规划器把用户操作合并为批量任务 | CRDT 合并后按 50ms 窗口批量广播 | 合并不当会导致操作顺序错乱，需要版本号校验 |
| 电商大促的库存扣减 | 规划器预计算扣减顺序与回滚步骤 | Redis Lua 脚本执行原子扣减，失败时逆向回滚 | 回滚步骤要独立于正向步骤，避免部分成功卡死 |
| 视频转码流水线 | 规划器按分辨率生成有依赖关系的任务图 | ffmpeg 多路输出，按关键帧切分片段 | 依赖关系要写成 DAG，不能出现环 |
| 数据迁移的批量导入 | 规划器拆分批次并生成校验任务 | 按主键区间分 5000 行一批，每批后跑 COUNT 校验 | 校验任务要与导入任务分离，否则脏数据会中断全流程 |
| CI 流水线的测试调度 | 规划器按文件变更范围决定跑哪些测试 | 用依赖图分析，只跑受影响模块的测试 | 依赖图过老会漏跑测试，需要每次构建前更新 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格导出

- **业务背景**：运营人员需要从后台导出十万行订单数据做月末对账。一次性导出会占用 API 进程内存 2GB 以上，导致其他请求超时。用"能跑通"的同步导出，平均一次导出耗时 180 秒，期间页面无响应。

- **怎么用本页知识解决**：思路是把导出任务交给规划器，规划器按行数把十万行拆成 20 个 5000 行的子任务，每个子任务独立生成一份 CSV 分片，最后合并成一个 zip 文件。执行器控制并发为 3，避免数据库连接池被打满。

```javascript
// 规划器：生成子任务列表
const totalRows = await db.count({ status: 'paid' });      // 先查总行数，避免盲目拆分
const BATCH_SIZE = 5000;                                     // 每个子任务处理的行数
const tasks = [];
for (let offset = 0; offset < totalRows; offset += BATCH_SIZE) {
  tasks.push({ offset, limit: BATCH_SIZE });                 // 每个子任务带偏移量和行数
}

// 执行器：并发执行子任务，并发上限 3
const results = [];
const pool = new WorkerPool(3);                              // 并发 3 个 worker，防止连接池耗尽
for (const task of tasks) {
  pool.run(async () => {
    const rows = await db.find({ status: 'paid' })
      .skip(task.offset).limit(task.limit).toArray();         // 按偏移量取这一批
    const csv = toCsv(rows);                                 // 转成 CSV 字符串
    await fs.writeFile(`/tmp/export/part-${task.offset}.csv`, csv); // 写独立分片
  });
}
await pool.drain();                                          // 等所有子任务完成
await zipParts('/tmp/export');                               // 合并成 zip，释放内存
```

- 拆分粒度要按"单批内存峰值"反推：5000 行 CSV 在内存中约 5MB，3 个并发峰值 15MB，远低于 2GB 的风险线。
- `pool.drain()` 是关键：只有全部子任务落盘后才进入合并阶段，否则合并进程会读到半截文件。
- 合并用 zip 而不是单文件 CSV，因为 20 个分片并行写同一文件会产生交错内容。
- 每个子任务的 offset 和 limit 存在任务对象里，执行器不关心总行数，方便单独重跑失败分片。

- **怎么度量收益**：用 `time` 命令记录导出总耗时，对比改造前后从 180 秒降到多少。用 `process.memoryUsage().rss` 在导出期间每 5 秒采样一次，记录内存峰值。用 Grafana 看 API 进程的 p99 响应时间，确认导出期间其他请求不再超时。

- **什么时候不该用**：如果导出总行数小于 2000 行，拆分反而增加文件合并和进程调度的固定开销，直接同步查询并返回单个 CSV 更简单。如果数据库本身不支持按偏移量高效分页（例如深度 offset 扫描极慢），需要先改造成基于游标或主键范围的分批方式，否则子任务会越跑越慢。

#### 场景 2：多人协作白板的增量同步

- **业务背景**：白板上有 5000 个图形对象，5 个用户同时编辑，每次拖动会产生高频的坐标更新。如果每次更新都直接广播，单用户一秒拖动可以产生 60 条消息，5 人就是 300 条/秒，服务端需要处理 300 次广播，网络和 CPU 都扛不住。

- **怎么用本页知识解决**：思路是引入规划器，把 50ms 时间窗口内的多个坐标更新合并成一个批量任务，规划器先对操作做冲突检测和合并，再生成一个"批量广播"子任务交给执行器。用户在窗口内的连续拖动变成一次批量下发。

```go
// 规划器：收集 50ms 窗口内的操作并合并
type Planner struct {
    buffer map[string][]Op        // 按对象 ID 缓存操作
    ticker *time.Ticker           // 50ms 定时器触发合并
}

func (p *Planner) addOp(op Op) {
    p.buffer[op.ObjectID] = append(p.buffer[op.ObjectID], op) // 先缓存，不立即广播
}

func (p *Planner) flush() []BatchTask {
    var tasks []BatchTask
    for id, ops := range p.buffer {
        merged := mergeOps(ops)               // 同一对象的多次移动合并成一次
        if merged.Version < lastAcked[id] {   // 版本回退检测，丢弃过期操作
            continue
        }
        tasks = append(tasks, BatchTask{ID: id, Op: merged})
    }
    p.buffer = make(map[string][]Op)          // 清空缓冲，开始下一窗口
    return tasks
}
```

- 合并的核心是 `mergeOps`：同一对象在 50ms 内从 (10,10) 移到 (15,15) 再移到 (20,20)，合并后只保留终点 (20,20)，中间态不发出去。
- 版本回退检测放在规划器里，执行器拿到的任务已经是"可安全广播"的，不用再做冲突判断。
- 50ms 窗口是可调参数：窗口越大合并率越高但延迟越差，需要按"用户可感知延迟"设定，通常 30-50ms 是可以接受的。
- 执行器只需要按顺序把 BatchTask 推送到 WebSocket 广播通道，不需要理解合并逻辑。

- **怎么度量收益**：用服务端日志统计每秒广播消息条数，改造前后对比。用客户端打点测量"操作到远端可见"的端到端延迟，确保 P50 不超过 100ms。用 Prometheus 的 `histogram` 指标记录每个窗口合并掉的操作数，衡量合并率。

- **什么时候不该用**：如果白板同时在线人数不超过 2 人且图形对象少于 100 个，合并窗口引入的 50ms 延迟大于收益，直接逐条广播更实时。如果操作本身有严格顺序要求（例如文本输入的回退/重做链），合并会破坏顺序语义，需要换成 OT 或 CRDT 的完整实现，不能只靠简单合并。

#### 场景 3：低端安卓手机的首屏加载

- **业务背景**：一个 H5 应用需要跑在 2GB 内存的低端安卓机上，首屏包含 15 个 JS 模块和 6 个 CSS 文件，全部加载需要 8 秒，期间白屏。用户跳出率很高，但团队不知道先优化哪一步。

- **怎么用本页知识解决**：思路是用规划器在构建阶段分析模块依赖图，生成"首屏最小加载计划"，把首屏不需要的模块标记为延迟加载。执行器按照计划先加载关键模块，再在空闲时预加载其余模块。

```javascript
// 构建阶段的规划器：分析依赖，生成加载计划
import { analyzeDeps } from './dep-analyzer.js';       // 用依赖分析工具解析模块图

const entry = 'src/main.js';                            // 入口文件
const depGraph = analyzeDeps(entry);                    // 生成完整的依赖图
const criticalModules = findCriticalPath(depGraph, entry); // 找出首屏渲染必须经过的模块

const plan = {
  critical: criticalModules,                            // 首屏立即加载的模块列表
  deferred: depGraph.allModules.filter(m => !criticalModules.includes(m)), // 延迟加载
};
writeFileSync('./dist/load-plan.json', JSON.stringify(plan)); // 计划写入构建产物
```

```javascript
// 运行时的执行器：按计划加载
const plan = await fetch('./load-plan.json').then(r => r.json()); // 读取加载计划
await Promise.all(plan.critical.map(m => import(m)));  // 首屏关键模块全部并行加载
onFirstPaint();                                        // 首屏渲染完成，用户可见

// 空闲时段预加载其余模块，不阻塞首屏
requestIdleCallback(() => {
  for (const m of plan.deferred) {
    import(m).catch(() => {});                         // 静默预加载，失败不阻塞
  }
});
```

- 规划器跑在构建阶段，不占用运行时性能：依赖分析和计划生成在打包时完成，手机上只执行计划。
- `findCriticalPath` 是关键函数：从入口出发，标记渲染首屏必须经过的模块，其余都进 deferred。
- 首屏关键模块用 `Promise.all` 并行加载，比逐个 `import` 的串行加载快。
- 延迟加载放在 `requestIdleCallback` 里，只在主线程空闲时执行，不影响首屏响应。

- **怎么度量收益**：用 Chrome DevTools 的 Performance 面板在 CPU 降速 6 倍（模拟低端机）下录制首屏时间，对比改造前后的 First Contentful Paint 和 Time to Interactive。用 `performance.mark` 在代码里埋点，记录 `onFirstPaint` 的触发时刻。用构建工具的分包报告（如 `webpack-bundle-analyzer`）查看 critical 和 deferred 的体积占比。

- **什么时候不该用**：如果目标设备全是中高端机（内存 6GB 以上），首屏 8 秒的问题不在模块加载顺序，而在网络或渲染性能，规划加载计划解决不了这个问题。如果应用本身就是单页工具型应用，所有模块在首屏都会用到，拆分后用户一交互就要二次加载，体验反而更差。

### 行业先进实践

Lazy Loading 与 Route-based Code Splitting（出处：webpack 官方文档 Code Splitting 章节）

webpack 文档明确建议按路由拆分代码，首屏只加载当前路由需要的模块，其他路由在导航时按需加载。这个做法的核心是"以后用到的代码以后加载"，与规划器"只执行当前需要执行的步骤"同构。你的项目可以在构建配置里按页面目录做 `splitChunks` 分组，再用手动 `import()` 触发按需加载。

Sagas 的任务可恢复设计（出处：redux-saga 官方文档）

redux-saga 的 saga 在任务中断后可以按步骤标记恢复执行，而不是从头开始。官方文档描述了 saga 是长期运行的事务性流程，具备可中断和可恢复特性。这个设计可以用来参考规划器任务的断点续跑：给每个子任务记录执行状态和中间产出，进程崩溃后从最后完成的状态继续，不重做已完成步骤。你的实现至少需要做子任务状态持久化。

Falcon 的 DAG 化部署（出处：Falcon 官方文档，Falcon 是一个公开的部署工具）

Falcon 的部署流程用 DAG 描述依赖关系，每个节点是独立的部署步骤，节点之间用边表达执行顺序。官方文档列出了部署步骤可以并行或串行执行。这个做法与规划器的依赖图分析一致：先画清任务依赖，再决定并行度。你的项目可以把"生成计划"和"执行计划"拆成两个模块，计划生成时输出 DAG，执行时按 DAG 的拓扑顺序调度。

### 从学到用：落地路线

第 1 步：先在一个可以接受出错的内部工具上试点，把一个大任务拆成两个子任务并验证跑通。验收标准：一个新任务从规划到执行全程可追踪，失败时能定位到具体子任务。

第 2 步：在试点工具上加入度量，记录任务拆分前后的耗时和内存峰值。验收标准：至少有一个可复现的实验显示拆分后内存峰值下降，且总耗时没有超过原方案的 1.2 倍。

第 3 步：把验证过的拆分模式推广到用户可见的功能，先从读多写少的查询类任务开始。验收标准：线上功能保留旧路径，通过开关切换，连续 7 天新路径错误率不高于旧路径。

第 4 步：建立回归防线，防止后续改动把任务拆分逻辑改坏。验收标准：每个拆分逻辑有单元测试覆盖，CI 中跑通全量测试才能合入主干。

### 动手作业

**目标**：为一个 Node.js 脚本写一个简单的规划-执行器，把处理 100 个 URL 的抓取任务拆成可并发执行的子任务，并且失败子任务可以单独重试。

**步骤**：

1. 准备一个 `urls.txt` 文件，每行一个 URL，共 100 行。
2. 写一个 `planner.js`，读取文件并把 URL 列表拆成 10 个包，每个包 10 个 URL，输出 JSON 格式的任务文件。
3. 写一个 `executor.js`，读取任务文件，用 `Worker` 或 `Promise` 池并发执行抓取，并发上限为 3。
4. 给每个子任务记录状态：`pending`、`running`、`done`、`failed`，状态写入一个 `status.json`。
5. 抓取失败（例如超时或非 200 状态码）时把该子任务标记为 `failed`，但不影响其他子任务。
6. 写一个 `retry.js`，读取 `status.json`，把所有 `failed` 的子任务重新入队执行。
7. 最后输出一个汇总报告：成功数量、失败数量、重试后仍失败的数量。

**验收标准**：

1. 运行 `node planner.js` 后能生成合法的任务文件和初始状态文件。
2. 运行 `node executor.js` 后，`status.json` 中每个子任务的状态都被更新为 `done` 或 `failed`。
3. 故意让 20 个 URL 指向本地不存在的端口，执行后退出的失败数正好是 20。
4. 运行 `node retry.js` 后，重试的失败子任务数量等于执行后标记为 `failed` 的数量。
5. 全程并发数不超过 3，可以通过在执行器里打印当前运行中的任务数来验证。

