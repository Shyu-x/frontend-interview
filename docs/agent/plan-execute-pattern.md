---
title: Plan-and-Execute Agent 模式深度解析
description: 深度解析规划-执行分离模式，将任务分解为规划阶段和执行阶段以处理复杂多步骤任务。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# Plan-and-Execute Agent 模式深度解析

## 概述

Plan-and-Execute（规划-执行）模式是一种将任务分解为规划阶段和执行阶段分离的 Agent 架构模式。这种模式的核心思想是：在执行任何操作之前，先通过一个专门的规划器（Planner）分析任务、分解步骤、验证计划的可行性，然后再由执行器（Executor）按照计划逐步完成任务。

与传统的 ReAct（Reasoning + Acting）模式相比，Plan-and-Execute 模式更适合处理复杂的多步骤任务，特别是在需要全局视角、长周期执行、以及失败恢复能力的场景中。

---

## 1. Plan-and-Execute 模式原理

### 1.1 为什么要先规划

在 Agent 系统中，"先规划后执行" 的设计哲学源于以下几个核心考量：

#### 1.1.1 全局视角与局部优化的矛盾

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

#### 1.1.2 资源分配与时间优化

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

#### 1.1.3 失败预判与容错设计

规划阶段可以提前识别潜在的失败点，并设计相应的恢复策略：

```typescript
interface RiskAssessment {
  stepId: string;
  riskLevel: 'low' | 'medium' | 'high';
  potentialFailures: string[];
  mitigationStrategy: string;
  rollbackPlan: RollbackPlan;
}

interface RollbackPlan {
  checkpointSteps: string[];
  rollbackActions: Map<string, () => Promise<void>>;
  statePreservation: StatePreservationStrategy;
}

// 规划器进行风险评估
async function assessRisks(plan: ExecutionPlan): Promise<RiskAssessment[]> {
  const assessments: RiskAssessment[] = [];
  
  for (const step of plan.steps) {
    const risks = await analyzeStepRisks(step);
    
    assessments.push({
      stepId: step.id,
      riskLevel: calculateRiskLevel(risks),
      potentialFailures: risks.map(r => r.description),
      mitigationStrategy: designMitigation(risks),
      rollbackPlan: designRollback(risks)
    });
  }
  
  return assessments;
}
```

### 1.2 与 ReAct 的区别

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

#### 1.2.1 决策流程对比图

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

#### 1.2.2 代码层面的具体差异

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

### 1.3 执行 vs 计划权衡

#### 1.3.1 何时选择 Plan-and-Execute

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

#### 1.3.2 自适应规划开销

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

---

## 2. 规划器设计

### 2.1 任务分解算法

任务分解是规划器的核心功能。一个好的分解算法需要能够：

1. 将复杂任务拆分为可执行的原子步骤
2. 确保步骤间的逻辑连贯性
3. 处理抽象级别的不一致性
4. 识别隐式依赖关系

#### 2.1.1 层次化任务分解

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

#### 2.1.2 基于工具的任务映射

```typescript
interface ToolCapability {
  name: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
  applicableActions: string[];
  examples: string[];
}

class ToolBasedDecomposer {
  private tools: Tool[];
  private capabilityIndex: Map<string, ToolCapability>;
  
  constructor(tools: Tool[]) {
    this.tools = tools;
    this.capabilityIndex = this.buildCapabilityIndex(tools);
  }
  
  async decompose(task: string): Promise<TaskStep[]> {
    // 1. 理解任务意图
    const intent = await this.extractIntent(task);
    
    // 2. 识别所需能力
    const requiredCapabilities = await this.matchCapabilities(intent);
    
    // 3. 按能力排序并分组
    const orderedSteps: TaskStep[] = [];
    const usedTools = new Set<string>();
    
    for (const capability of requiredCapabilities) {
      const compatibleTools = this.findCompatibleTools(capability, usedTools);
      
      for (const tool of compatibleTools) {
        const step = this.createStepFromTool(tool, capability);
        orderedSteps.push(step);
        usedTools.add(tool.name);
      }
    }
    
    return orderedSteps;
  }
  
  private async extractIntent(task: string): Promise<TaskIntent> {
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
  
  private async matchCapabilities(intent: TaskIntent): Promise<string[]> {
    const allCapabilities = Array.from(this.capabilityIndex.values());
    
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

#### 2.1.3 图搜索式分解

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

### 2.2 依赖分析

#### 2.2.1 显式依赖 vs 隐式依赖

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

#### 2.2.2 依赖图的构建与分析

```typescript
class DependencyGraph {
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseList: Map<string, Set<string>> = new Map();
  private inDegree: Map<string, number> = new Map();
  
  constructor(steps: TaskStep[], dependencies: Dependency[]) {
    this.buildGraph(steps, dependencies);
  }
  
  private buildGraph(steps: TaskStep[], dependencies: Dependency[]): void {
    // 初始化
    for (const step of steps) {
      this.adjacencyList.set(step.id, new Set());
      this.reverseList.set(step.id, new Set());
      this.inDegree.set(step.id, 0);
    }
    
    // 添加依赖边（source 依赖 target，即 source -> target）
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
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // 发现循环
          const cycleStart = path.indexOf(neighbor);
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }
      
      recursionStack.delete(nodeId);
    };
    
    for (const nodeId of this.adjacencyList.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }
    
    return cycles;
  }
  
  // 拓扑排序
  topologicalSort(): string[] | null {
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      console.error('存在循环依赖，无法拓扑排序:', cycles);
      return null;
    }
    
    const result: string[] = [];
    const queue: string[] = [];
    
    // 入度为 0 的节点入队
    for (const [nodeId, degree] of this.inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);
      
      for (const neighbor of this.adjacencyList.get(nodeId) || []) {
        const newDegree = this.inDegree.get(neighbor)! - 1;
        this.inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    return result;
  }
  
  // 识别可并行的批次
  identifyParallelBatches(): string[][] {
    const batches: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(this.adjacencyList.keys());
    
    while (remaining.size > 0) {
      // 找出所有依赖都已完成的步骤
      const ready: string[] = [];
      
      for (const nodeId of remaining) {
        const dependencies = this.reverseList.get(nodeId) || new Set();
        const allDependenciesMet = [...dependencies].every(dep => completed.has(dep));
        
        if (allDependenciesMet) {
          ready.push(nodeId);
        }
      }
      
      if (ready.length === 0 && remaining.size > 0) {
        throw new Error('依赖图中存在循环');
      }
      
      batches.push(ready);
      
      for (const nodeId of ready) {
        completed.add(nodeId);
        remaining.delete(nodeId);
      }
    }
    
    return batches;
  }
}
```

### 2.3 优先级排序

#### 2.3.1 多维度优先级评估

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

#### 2.3.2 动态优先级调整

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

### 2.4 计划验证

#### 2.4.1 计划完整性检查

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

class PlanValidator {
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
    errors.push(...dependencyCheck.errors);
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
      warnings.push({
        code: 'TIME_CONSTRAINT_VIOLATION',
        message: `预计耗时 ${timeCheck.estimated} 超过限制 ${timeCheck.limit}`,
        severity: 'warning'
      });
    }
    
    // 5. 生成优化建议
    suggestions.push(...this.generateSuggestions(plan, errors, warnings));
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
  
  private checkGoalCoverage(plan: ExecutionPlan): { complete: boolean; missingGoals: string[] } {
    const targetGoals = plan.targetGoals;
    const coveredGoals = new Set(
      plan.steps.flatMap(s => s.achievesGoals || [])
    );
    
    const missingGoals = targetGoals.filter(g => !coveredGoals.has(g));
    
    return {
      complete: missingGoals.length === 0,
      missingGoals
    };
  }
  
  private checkDependencies(plan: ExecutionPlan): { 
    errors: ValidationError[]; 
    warnings: ValidationWarning[] 
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    const graph = new DependencyGraph(plan.steps, plan.dependencies);
    
    // 检查循环依赖
    const cycles = graph.detectCycles();
    if (cycles.length > 0) {
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: `检测到循环依赖: ${cycles.map(c => c.join(' -> ')).join('; ')}`,
        severity: 'error'
      });
    }
    
    // 检查缺失依赖
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

#### 2.4.2 计划可执行性模拟

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

---

## 3. 执行器设计

### 3.1 步骤执行

#### 3.1.1 执行上下文管理

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

#### 3.1.2 条件执行与分支处理

```typescript
class ConditionalExecutor {
  private llm: LLM;
  
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
    
    const response = await this.llm.generate(prompt);
    return response.toLowerCase().includes('true');
  }
  
  async executeBranch(
    branches: ConditionalBranch[], 
    context: ExecutionContext
  ): Promise<BranchResult> {
    for (const branch of branches) {
      const satisfied = await this.evaluateCondition(branch.condition, context);
      
      if (satisfied) {
        return {
          selectedBranch: branch.id,
          steps: branch.steps,
          context: this.updateContextForBranch(context, branch)
        };
      }
    }
    
    // 默认分支
    const defaultBranch = branches.find(b => b.isDefault);
    if (defaultBranch) {
      return {
        selectedBranch: defaultBranch.id,
        steps: defaultBranch.steps,
        context
      };
    }
    
    throw new Error('No branch condition satisfied and no default branch provided');
  }
}
```

### 3.2 状态同步

#### 3.2.1 共享状态管理

```typescript
interface StateSnapshot {
  timestamp: number;
  stepId: string;
  data: Map<string, any>;
  version: number;
}

class StateManager {
  private stateHistory: StateSnapshot[] = [];
  private currentState: Map<string, any> = new Map();
  private version: number = 0;
  private listeners: StateChangeListener[] = [];
  
  get(key: string): any {
    return this.currentState.get(key);
  }
  
  set(key: string, value: any): void {
    const oldValue = this.currentState.get(key);
    this.currentState.set(key, value);
    this.version++;
    
    this.notifyListeners({
      type: 'change',
      key,
      oldValue,
      newValue: value,
      version: this.version
    });
  }
  
  snapshot(stepId: string): StateSnapshot {
    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      stepId,
      data: new Map(this.currentState),
      version: this.version
    };
    
    this.stateHistory.push(snapshot);
    
    // 限制历史记录大小
    if (this.stateHistory.length > MAX_HISTORY_SIZE) {
      this.stateHistory.shift();
    }
    
    return snapshot;
  }
  
  restore(snapshot: StateSnapshot): void {
    this.currentState = new Map(snapshot.data);
    this.version = snapshot.version;
    this.notifyListeners({
      type: 'restore',
      snapshot
    });
  }
  
  // 状态对比
  diff(snapshotA: StateSnapshot, snapshotB: StateSnapshot): StateDiff {
    const changes: StateChange[] = [];
    
    for (const [key, valueA] of snapshotA.data) {
      const valueB = snapshotB.data.get(key);
      
      if (!snapshotB.data.has(key)) {
        changes.push({ key, type: 'removed', oldValue: valueA });
      } else if (!deepEqual(valueA, valueB)) {
        changes.push({ key, type: 'modified', oldValue: valueA, newValue: valueB });
      }
    }
    
    for (const [key, valueB] of snapshotB.data) {
      if (!snapshotA.data.has(key)) {
        changes.push({ key, type: 'added', newValue: valueB });
      }
    }
    
    return { changes };
  }
}
```

#### 3.2.2 跨步骤数据流

```typescript
interface DataFlowEdge {
  sourceStep: string;
  targetStep: string;
  variableName: string;
  transformation?: DataTransformation;
}

class DataFlowManager {
  private edges: DataFlowEdge[] = [];
  private valueCache: Map<string, any> = new Map();
  
  registerDataFlow(edge: DataFlowEdge): void {
    this.edges.push(edge);
  }
  
  // 自动推断数据流依赖
  async inferDataFlow(steps: TaskStep[]): Promise<DataFlowEdge[]> {
    const inferredEdges: DataFlowEdge[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const sourceStep = steps[i];
        const targetStep = steps[j];
        
        const dataFlow = await this.checkDataFlow(sourceStep, targetStep);
        
        if (dataFlow) {
          inferredEdges.push(dataFlow);
          this.registerDataFlow(dataFlow);
        }
      }
    }
    
    return inferredEdges;
  }
  
  // 获取步骤的输入数据（包含数据流依赖的值）
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
          
          inputs.set(edge.variableName, value);
        }
      }
    }
    
    return inputs;
  }
  
  private applyTransformation(
    value: any, 
    transformation: DataTransformation
  ): any {
    switch (transformation.type) {
      case 'field_extraction':
        return this.extractField(value, transformation.fieldPath);
        
      case 'filter':
        return value.filter(transformation.filterFn);
        
      case 'map':
        return value.map(transformation.mapFn);
        
      case 'aggregate':
        return this.aggregate(value, transformation.aggregationType);
        
      case 'type_cast':
        return this.castType(value, transformation.targetType);
        
      case 'custom':
        return transformation.customFn(value);
    }
  }
}
```

### 3.3 回滚机制

#### 3.3.1 检查点策略

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

#### 3.3.2 补偿事务模式

```typescript
interface CompensableAction {
  action: () => Promise<void>;
  compensation: () => Promise<void>;
  description: string;
}

class CompensationManager {
  private transactionLog: CompensableAction[][] = [];
  
  async executeWithCompensation(
    actions: CompensableAction[]
  ): Promise<CompensationResult> {
    const executed: CompensableAction[] = [];
    const errors: Error[] = [];
    
    for (const action of actions) {
      try {
        await action.action();
        executed.push(action);
      } catch (error) {
        errors.push(error as Error);
        
        // 发生错误，执行补偿
        await this.compensate(executed);
        
        return {
          success: false,
          failedAction: action,
          errors,
          compensatedActions: executed.length
        };
      }
    }
    
    return {
      success: true,
      executedActions: executed.length
    };
  }
  
  private async compensate(actions: CompensableAction[]): Promise<void> {
    // 逆序执行补偿操作
    const reversed = [...actions].reverse();
    
    for (const action of reversed) {
      try {
        await action.compensation();
      } catch (compensationError) {
        console.error(
          `补偿操作失败: ${action.description}`,
          compensationError
        );
        // 记录但继续执行其他补偿
      }
    }
  }
}

// 使用示例
async function exampleTransaction() {
  const manager = new CompensationManager();
  
  const actions: CompensableAction[] = [
    {
      action: async () => await fileSystem.createDirectory('/temp/project'),
      compensation: async () => await fileSystem.deleteDirectory('/temp/project'),
      description: '创建临时目录'
    },
    {
      action: async () => await git.cloneRepository('https://github.com/example/repo'),
      compensation: async () => await fileSystem.deleteDirectory('/temp/project/repo'),
      description: '克隆仓库'
    },
    {
      action: async () => await packageManager.install('/temp/project/repo'),
      compensation: async () => await packageManager.clean('/temp/project/repo'),
      description: '安装依赖'
    }
  ];
  
  return await manager.executeWithCompensation(actions);
}
```

### 3.4 进度追踪

#### 3.4.1 进度计算模型

```typescript
interface ProgressState {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  currentStep: string | null;
  percentComplete: number;
  estimatedTimeRemaining: number | null;
  criticalPathProgress: number;
}

class ProgressTracker {
  private plan: ExecutionPlan;
  private startTime: number;
  private stepTimings: Map<string, number> = new Map();
  private eventEmitter: EventEmitter;
  
  constructor(plan: ExecutionPlan, eventEmitter: EventEmitter) {
    this.plan = plan;
    this.startTime = Date.now();
    this.eventEmitter = eventEmitter;
  }
  
  async recordStepStart(stepId: string): Promise<void> {
    this.stepTimings.set(stepId, Date.now());
    this.eventEmitter.emit('progress:step_start', { stepId });
  }
  
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
  
  calculateProgress(
    completedSteps: Set<string>, 
    failedSteps: Set<string>
  ): ProgressState {
    const totalSteps = this.plan.steps.length;
    const completedCount = completedSteps.size;
    const failedCount = failedSteps.size;
    
    // 计算百分比（考虑失败步骤也完成了）
    const percentComplete = ((completedCount + failedCount) / totalSteps) * 100;
    
    // 计算剩余时间预估
    const avgStepTime = this.calculateAverageStepTime();
    const remainingSteps = totalSteps - completedCount - failedCount;
    const estimatedTimeRemaining = avgStepTime * remainingSteps;
    
    // 计算关键路径进度
    const criticalPathProgress = this.calculateCriticalPathProgress(completedSteps);
    
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
  
  private calculateCriticalPathProgress(completedSteps: Set<string>): number {
    const criticalPath = this.plan.criticalPath || [];
    const completedInCritical = criticalPath.filter(id => completedSteps.has(id));
    
    return (completedInCritical.length / criticalPath.length) * 100;
  }
  
  generateProgressReport(completedSteps: Set<string>, failedSteps: Set<string>): string {
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
        const status = completedSteps.has(step.id) ? '✓' : 
                      failedSteps.has(step.id) ? '✗' : '·';
        return `  ${status} ${step.name}`;
      })
    ];
    
    return lines.join('\n');
  }
}
```

---

## 4. 完整实现

### 4.1 TypeScript 实现

#### 4.1.1 核心架构

```typescript
// types.ts - 类型定义
export interface TaskStep {
  id: string;
  name: string;
  description: string;
  type: 'tool_invocation' | 'llm_generation' | 'script_execution' | 
        'conditional_branch' | 'parallel_execution' | 'checkpoint';
  toolName?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, string>;
  dependencies: string[];
  estimatedTime: number;
  requiredCapabilities: string[];
  rollbackAction?: () => Promise<void>;
  onFailure?: 'retry' | 'skip' | 'abort' | 'rollback';
  retryConfig?: RetryConfig;
}

export interface ExecutionPlan {
  id: string;
  task: string;
  steps: TaskStep[];
  dependencies: Dependency[];
  targetGoals: string[];
  metadata: PlanMetadata;
  createdAt: number;
  validated: boolean;
}

export interface Dependency {
  type: 'data' | 'control' | 'resource';
  source: string;
  target: string;
  criticality: 'required' | 'preferred';
}

export interface StepResult {
  success: boolean;
  output?: any;
  error?: Error;
  metadata: StepMetadata;
}

export interface StepMetadata {
  stepId: string;
  startTime: number;
  endTime: number;
  duration: number;
  attempts: number;
  toolName?: string;
}

export interface PlanMetadata {
  totalEstimatedTime: number;
  criticalPath: string[];
  parallelBatches: string[][];
  riskLevel: 'low' | 'medium' | 'high';
  complexity: number;
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

#### 4.1.2 Agent 主类

```typescript
// agent.ts - Plan-and-Execute Agent 主类
export class PlanExecuteAgent {
  private planner: Planner;
  private executor: Executor;
  private config: AgentConfig;
  private eventEmitter: EventEmitter;
  
  constructor(config: AgentConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    this.planner = new Planner(config.planner);
    this.executor = new Executor(this.planner, config.executor);
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.planner.on('planner:complete', (data) => {
      this.eventEmitter.emit('plan_created', data.plan);
    });
    
    this.executor.on('executor:step_complete', (data) => {
      this.eventEmitter.emit('step_progress', data);
    });
    
    this.executor.on('executor:complete', (data) => {
      this.eventEmitter.emit('execution_complete', data);
    });
  }
  
  async run(task: string): Promise<AgentResult> {
    this.eventEmitter.emit('agent:start', { task });
    
    try {
      // 规划阶段
      const plan = await this.planner.createPlan(task, this.config.tools);
      
      // 执行阶段
      const executionResult = await this.executor.execute(plan);
      
      return {
        success: executionResult.success,
        plan,
        execution: executionResult,
        summary: this.generateSummary(executionResult)
      };
      
    } catch (error) {
      this.eventEmitter.emit('agent:error', { error });
      return {
        success: false,
        error: error as Error,
        summary: `Agent 执行失败: ${(error as Error).message}`
      };
    }
  }
  
  on(event: string, handler: (data: any) => void): void {
    this.eventEmitter.on(event, handler);
  }
  
  off(event: string, handler: (data: any) => void): void {
    this.eventEmitter.off(event, handler);
  }
}
```

### 4.2 LangChain 实现

#### 4.2.1 LangChain 风格的 Agent

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

#### 4.2.2 自定义 Tool 集成

```typescript
// langchain-tools.ts
import { StructuredTool, z } from '@langchain/core/tools';
import { ToolExecutor } from './executor';

export class PlanExecuteTool extends StructuredTool {
  name = 'plan_execute';
  description = 'Use this tool to plan and execute complex multi-step tasks. Input should be a detailed description of the task you want to accomplish.';
  
  schema = z.object({
    task: z.string().describe('The task to plan and execute'),
    options: z.object({
      maxSteps: z.number().optional().describe('Maximum number of steps'),
      timeout: z.number().optional().describe('Timeout in milliseconds'),
      failFast: z.boolean().optional().describe('Stop on first failure')
    }).optional()
  });
  
  constructor(private agent: PlanExecuteAgent) {
    super();
  }
  
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

// 注册工具到 LangChain
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

### 4.3 状态机设计

#### 4.3.1 Agent 状态机

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

#### 4.3.2 可视化状态图

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

---

## 5. 混合模式

### 5.1 Plan-then-Act

Plan-then-Act 是最基本的混合模式，先规划后执行，但允许在执行过程中进行局部重新规划：

```typescript
// plan-then-act.ts
interface PlanThenActConfig {
  initialPlanningDepth: 'light' | 'moderate' | 'deep';
  allowReplanning: boolean;
  replanningTriggers: ReplanningTrigger[];
  maxReplanningAttempts: number;
}

type ReplanningTrigger = 
  | { type: 'failure'; afterAttempts?: number }
  | { type: 'time_budget_exceeded' }
  | { type: 'external_feedback' }
  | { type: 'environment_change' };

class PlanThenActAgent {
  private planner: Planner;
  private executor: Executor;
  private config: PlanThenActConfig;
  private currentPlan: ExecutionPlan | null = null;
  private replanningCount: number = 0;
  
  async run(task: string): Promise<AgentResult> {
    // 阶段 1：初始规划
    this.currentPlan = await this.planner.createPlan(
      task, 
      this.config.initialPlanningDepth
    );
    
    // 阶段 2：执行并监控
    while (!this.isComplete()) {
      const stepResult = await this.executor.executeNextStep(this.currentPlan);
      
      // 检查是否需要重新规划
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
  
  private async checkReplanningTriggers(
    lastResult: StepResult
  ): Promise<boolean> {
    for (const trigger of this.config.replanningTriggers) {
      switch (trigger.type) {
        case 'failure':
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

### 5.2 动态重规划

动态重规划允许在执行过程中根据实际情况调整计划：

```typescript
// dynamic-replanner.ts
interface ReplanningDecision {
  action: 'continue' | 'modify' | 'regenerate' | 'abort';
  modifiedPlan?: ExecutionPlan;
  reason: string;
}

class DynamicReplanner {
  private monitor: ExecutionMonitor;
  private llm: LLMClient;
  
  async shouldReplan(
    executionState: ExecutionState,
    plan: ExecutionPlan
  ): Promise<ReplanningDecision> {
    // 1. 分析当前执行状态
    const analysis = await this.analyzeExecutionState(executionState, plan);
    
    // 2. 评估是否需要重规划
    if (analysis.completionRate < 0.3 && analysis.failureRate > 0.5) {
      return {
        action: 'regenerate',
        reason: 'High failure rate with low progress - full replan needed'
      };
    }
    
    if (analysis.deviationFromPlan > 0.3) {
      return {
        action: 'modify',
        modifiedPlan: await this.suggestModifications(analysis),
        reason: 'Significant deviation from original plan'
      };
    }
    
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
    
    return {
      action: 'continue',
      reason: 'Execution proceeding as expected'
    };
  }
  
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
    
    const suggestion = await this.llm.structuredOutput(prompt, ModificationSchema);
    
    return this.applyModifications(analysis.originalPlan, suggestion);
  }
  
  private async analyzeExecutionState(
    state: ExecutionState,
    plan: ExecutionPlan
  ): Promise<ExecutionAnalysis> {
    // 计算完成率
    const completedCount = state.completedSteps.size;
    const totalCount = plan.steps.length;
    const completionRate = completedCount / totalCount;
    
    // 计算失败率
    const failedCount = state.failedSteps.size;
    const failureRate = completedCount > 0 ? failedCount / completedCount : 0;
    
    // 计算计划偏差
    const expectedProgress = this.calculateExpectedProgress(state);
    const actualProgress = completionRate;
    const deviationFromPlan = Math.abs(expectedProgress - actualProgress);
    
    // 识别新机会
    const newOpportunities = await this.detectNewOpportunities(state);
    
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

### 5.3 自适应规划

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

---

## 6. 优化策略

### 6.1 计划缓存

#### 6.1.1 缓存策略设计

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

#### 6.1.2 语义缓存

```typescript
// semantic-cache.ts
class SemanticPlanCache {
  private embeddings: Map<string, number[]> = new Map();
  private cache: PlanCache;
  private embeddingModel: EmbeddingModel;
  private similarityThreshold: number = 0.85;
  
  async findSimilarPlan(task: string): Promise<ExecutionPlan | null> {
    const taskEmbedding = await this.embeddingModel.embed(task);
    
    let bestMatch: { key: string; plan: ExecutionPlan; similarity: number } | null = null;
    
    for (const [key, cachedEmbedding] of this.embeddings) {
      const similarity = this.cosineSimilarity(taskEmbedding, cachedEmbedding);
      
      if (similarity > this.similarityThreshold) {
        const plan = await this.cache.get(key);
        
        if (plan && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { key, plan, similarity };
        }
      }
    }
    
    return bestMatch?.plan || null;
  }
  
  async cacheWithEmbedding(key: string, plan: ExecutionPlan, task: string): Promise<void> {
    const embedding = await this.embeddingModel.embed(task);
    
    this.embeddings.set(key, embedding);
    await this.cache.set(key, plan);
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
```

### 6.2 并行规划

#### 6.2.1 并行分解策略

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

#### 6.2.2 规划结果合并

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

### 6.3 失败恢复

#### 6.3.1 分层恢复策略

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

#### 6.3.2 优雅降级

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

---

## 总结

Plan-and-Execute 模式是处理复杂 Agent 任务的重要架构模式。通过将规划阶段和执行阶段分离，该模式能够：

1. **提供全局视角**：在执行前完整分析任务，避免局部最优陷阱
2. **支持依赖管理**：通过依赖图分析优化执行顺序，发现循环依赖
3. **实现失败恢复**：通过检查点和回滚机制处理执行失败
4. **优化执行效率**：识别并行机会，计算关键路径
5. **自适应规划**：根据任务特征动态调整规划策略

在实际应用中，Plan-and-Execute 模式需要与混合模式结合使用，通过动态重规划和优雅降级来应对复杂多变的执行环境。选择合适的规划深度和重规划策略是在效率和可靠性之间取得平衡的关键。

---

## 参考资源

- [LangChain Plan-and-Execute](https://python.langchain.com/docs/tutorials/plan_and_execute/)
- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [AutoGPT: An Autonomous GPT-4 Agent](https://github.com/Significant-Gravitas/AutoGPT)
- [BabyAGI: Task-Driven Autonomous Agent](https://github.com/yoheinakajima/babyagi)