---
title: 认知层
description: Agent 分层架构之认知层：理解、推理、记忆与知识表示。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 认知层

认知层是 AI Agent 的"大脑"，负责推理、规划、记忆和知识管理。这一层决定了 Agent 的智能水平。

## 1. 推理引擎 (Reasoner Engine)

推理引擎负责对输入进行深度分析，生成推理链和结论。

```typescript
// 推理类型
type ReasoningType = 'deductive' | 'inductive' | 'abductive' | 'causal' | 'analogical';

interface ReasoningResult {
  type: ReasoningType;
  conclusion: string;
  confidence: number;
  chain: ReasoningStep[];
  evidence: Evidence[];
  alternatives: AlternativeReasoning[];
}

interface ReasoningStep {
  index: number;
  premise: string;
  inference: string;
  conclusion: string;
  rule: InferenceRule;
}

interface InferenceRule {
  id: string;
  name: string;
  type: string;
  premises: string[];
  conclusion: string;
}

// 推理引擎
class ReasonerEngine {
  private rules: Map<string, InferenceRule> = new Map();
  private reasoningStrategies: Map<ReasoningType, ReasoningStrategy> = new Map();
  private knowledgeBase: KnowledgeBase;
  private contextCache: Map<string, any> = new Map();

  constructor(config: ReasonerConfig) {
    this.initializeRules();
    this.initializeStrategies();
    this.knowledgeBase = new KnowledgeBase(config.knowledgeBasePath);
  }

  private initializeRules(): void {
    // 添加常见的推理规则

    // 肯定前件 (Modus Ponens)
    this.rules.set('modus_ponens', {
      id: 'modus_ponens',
      name: 'Modus Ponens',
      type: 'deductive',
      premises: ['If P then Q', 'P'],
      conclusion: 'Q'
    });

    // 否定后件 (Modus Tollens)
    this.rules.set('modus_tollens', {
      id: 'modus_tollens',
      name: 'Modus Tollens',
      type: 'deductive',
      premises: ['If P then Q', 'Not Q'],
      conclusion: 'Not P'
    });

    // 假言三段论 (Hypothetical Syllogism)
    this.rules.set('hypothetical_syllogism', {
      id: 'hypothetical_syllogism',
      name: 'Hypothetical Syllogism',
      type: 'deductive',
      premises: ['If P then Q', 'If Q then R'],
      conclusion: 'If P then R'
    });

    // 选言三段论 (Disjunctive Syllogism)
    this.rules.set('disjunctive_syllogism', {
      id: 'disjunctive_syllogism',
      name: 'Disjunctive Syllogism',
      type: 'deductive',
      premises: ['P or Q', 'Not P'],
      conclusion: 'Q'
    });
  }

  private initializeStrategies(): void {
    this.reasoningStrategies.set('deductive', new DeductiveStrategy());
    this.reasoningStrategies.set('inductive', new InductiveStrategy());
    this.reasoningStrategies.set('abductive', new AbductiveStrategy());
    this.reasoningStrategies.set('causal', new CausalReasoningStrategy());
    this.reasoningStrategies.set('analogical', new AnalogicalReasoningStrategy());
  }

  async reason(input: ParsedInput, context: Context, options: ReasoningOptions = {}): Promise<ReasoningResult> {
    // 选择推理策略
    const strategy = this.selectStrategy(input, context, options);

    // 执行推理
    const result = await strategy.execute(input, context, this);

    // 补充证据
    result.evidence = await this.gatherEvidence(result.chain, context);

    // 生成备选推理
    result.alternatives = await this.generateAlternatives(input, context, result);

    return result;
  }

  private selectStrategy(
    input: ParsedInput,
    context: Context,
    options: ReasoningOptions
  ): ReasoningStrategy {
    // 基于输入特征选择策略
    const inputType = this.classifyInput(input);

    switch (inputType) {
      case 'rule_based':
        return this.reasoningStrategies.get('deductive')!;

      case 'observation_based':
        return this.reasoningStrategies.get('inductive')!;

      case 'explanation_based':
        return this.reasoningStrategies.get('abductive')!;

      case 'cause_effect':
        return this.reasoningStrategies.get('causal')!;

      case 'similarity_based':
        return this.reasoningStrategies.get('analogical')!;

      default:
        // 组合使用多种策略
        return new CompositeStrategy(Array.from(this.reasoningStrategies.values()));
    }
  }

  private classifyInput(input: ParsedInput): string {
    // 检测输入类型
    const text = input.normalizedText;

    if (/如果.*那么/.test(text) || /假设.*则/.test(text)) {
      return 'rule_based';
    }

    if (/所有.*都是/.test(text) || /一般.*/.test(text)) {
      return 'observation_based';
    }

    if (/为什么/.test(text) || /原因/.test(text)) {
      return 'cause_effect';
    }

    if (/类似/.test(text) || /如同/.test(text)) {
      return 'similarity_based';
    }

    return 'general';
  }

  async applyRule(
    rule: InferenceRule,
    premises: string[],
    context: Context
  ): Promise<ReasoningStep> {
    // 应用推理规则
    const matchedPremises = this.matchPremises(rule.premises, premises, context);

    if (matchedPremises.length !== rule.premises.length) {
      throw new RuleApplicationError(rule.id, 'Premises not fully matched');
    }

    // 生成结论
    const conclusion = this.deriveConclusion(rule.conclusion, matchedPremises);

    return {
      index: context.session.turnCount,
      premise: matchedPremises.join('; '),
      inference: `Applied rule: ${rule.name}`,
      conclusion,
      rule
    };
  }

  private matchPremises(
    rulePremises: string[],
    facts: string[],
    context: Context
  ): string[] {
    const matched: string[] = [];

    for (const premise of rulePremises) {
      const match = facts.find(f => this.unify(premise, f, context)) ||
        this.inferFromKnowledge(premise, context);

      if (match) {
        matched.push(match);
      }
    }

    return matched;
  }

  private unify(pattern: string, fact: string, context: Context): boolean {
    // 简单的模式匹配统一
    const patternParts = pattern.split(/\s+/);
    const factParts = fact.split(/\s+/);

    if (patternParts.length !== factParts.length) {
      return false;
    }

    return patternParts.every((part, i) => {
      if (part.startsWith('?')) return true;
      return part === factParts[i];
    });
  }

  private async inferFromKnowledge(premise: string, context: Context): Promise<string | null> {
    // 从知识库推断
    const query = this.parseQuery(premise);
    const results = await this.knowledgeBase.query(query);

    return results[0]?.statement || null;
  }

  private deriveConclusion(ruleConclusion: string, premises: string[]): string {
    // 简单结论推导
    // 实际实现需要更复杂的变量替换逻辑
    return ruleConclusion;
  }

  private async gatherEvidence(chain: ReasoningStep[], context: Context): Promise<Evidence[]> {
    const evidence: Evidence[] = [];

    for (const step of chain) {
      const stepEvidence = await this.collectEvidenceForStep(step, context);
      evidence.push(...stepEvidence);
    }

    return evidence;
  }

  private async collectEvidenceForStep(step: ReasoningStep, context: Context): Promise<Evidence[]> {
    const evidence: Evidence[] = [];

    // 从记忆中收集证据
    const relevantMemories = await this.knowledgeBase.search(step.conclusion, { limit: 3 });

    for (const memory of relevantMemories) {
      evidence.push({
        source: 'knowledge_base',
        content: memory.content,
        relevance: memory.score,
        timestamp: memory.timestamp
      });
    }

    return evidence;
  }

  private async generateAlternatives(
    input: ParsedInput,
    context: Context,
    primary: ReasoningResult
  ): Promise<AlternativeReasoning[]> {
    const alternatives: AlternativeReasoning[] = [];

    for (const [type, strategy] of this.reasoningStrategies) {
      if (type === primary.type) continue;

      try {
        const alt = await strategy.execute(input, context, this);

        if (alt.confidence > 0.5) {
          alternatives.push({
            type,
            conclusion: alt.conclusion,
            confidence: alt.confidence,
            explanation: `Alternative ${type} reasoning path`
          });
        }
      } catch {
        // 忽略失败的其他策略
      }
    }

    return alternatives.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }
}

// 推理策略基类
abstract class ReasoningStrategy {
  abstract execute(
    input: ParsedInput,
    context: Context,
    engine: ReasonerEngine
  ): Promise<ReasoningResult>;

  protected buildChain(steps: ReasoningStep[]): ReasoningChain {
    return {
      steps,
      isComplete: steps.length > 0 && steps.every(s => s.conclusion),
      hasLoop: this.detectLoop(steps)
    };
  }

  private detectLoop(steps: ReasoningStep[]): boolean {
    const seen = new Set<string>();
    for (const step of steps) {
      if (seen.has(step.conclusion)) return true;
      seen.add(step.conclusion);
    }
    return false;
  }
}

// 演绎推理策略
class DeductiveStrategy extends ReasoningStrategy {
  async execute(
    input: ParsedInput,
    context: Context,
    engine: ReasonerEngine
  ): Promise<ReasoningResult> {
    const steps: ReasoningStep[] = [];

    // 解析输入中的条件语句
    const conditionals = this.extractConditionals(input.normalizedText);

    for (const conditional of conditionals) {
      const rule = engine.getRule('modus_ponens');

      if (conditional.hasAntecedent) {
        const step = await engine.applyRule(rule, [
          conditional.condition,
          conditional.antecedent
        ], context);
        steps.push(step);
      }
    }

    const conclusion = steps[steps.length - 1]?.conclusion || input.normalizedText;

    return {
      type: 'deductive',
      conclusion,
      confidence: this.calculateConfidence(steps),
      chain: steps,
      evidence: [],
      alternatives: []
    };
  }

  private extractConditionals(text: string): Conditional[] {
    const conditionals: Conditional[] = [];

    // 匹配"如果...那么..."模式
    const pattern = /如果(.+)，那么(.+)/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      conditionals.push({
        condition: match[1],
        consequent: match[2],
        antecedent: null,
        hasAntecedent: false
      });
    }

    return conditionals;
  }

  private calculateConfidence(steps: ReasoningStep[]): number {
    if (steps.length === 0) return 0.5;

    // 每个有效步骤增加置信度
    const baseConfidence = 0.8;
    const stepBonus = 0.05 * steps.length;

    return Math.min(baseConfidence + stepBonus, 0.99);
  }
}

// 归纳推理策略
class InductiveStrategy extends ReasoningStrategy {
  async execute(
    input: ParsedInput,
    context: Context,
    engine: ReasonerEngine
  ): Promise<ReasoningResult> {
    const observations = this.extractObservations(input.normalizedText);
    const patterns = this.findPatterns(observations);
    const generalization = this.generalize(patterns);

    return {
      type: 'inductive',
      conclusion: generalization,
      confidence: this.calculateInductiveConfidence(patterns, observations.length),
      chain: [{
        index: 0,
        premise: observations.join('; '),
        inference: 'Induction: Generalizing from observations',
        conclusion: generalization,
        rule: { id: 'induction', name: 'Induction', type: 'inductive', premises: [], conclusion: '' }
      }],
      evidence: observations.map(o => ({
        source: 'input',
        content: o,
        relevance: 1
      })),
      alternatives: []
    };
  }

  private extractObservations(text: string): string[] {
    // 提取观察陈述
    const observations: string[] = [];

    // 匹配"X是Y"模式
    const pattern = /(.+?)是(.+?)[。.]/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      observations.push(match[0]);
    }

    return observations;
  }

  private findPatterns(observations: string[]): Pattern[] {
    // 简化模式检测
    return observations.map(obs => ({
      subject: obs.split('是')[0],
      predicate: obs.split('是')[1]
    }));
  }

  private generalize(patterns: Pattern[]): string {
    if (patterns.length === 0) return '无法归纳';

    // 提取共性
    const subjects = patterns.map(p => p.subject);
    const predicates = patterns.map(p => p.predicate);

    // 检查是否所有主体相同
    const allSameSubject = subjects.every(s => s === subjects[0]);

    // 检查是否所有谓词相同
    const allSamePredicate = predicates.every(p => p === predicates[0]);

    if (allSameSubject) {
      return `所有观察的${subjects[0]}都共享相同的特征`;
    }

    return `基于${patterns.length}个观察的归纳结论`;
  }

  private calculateInductiveConfidence(patterns: Pattern[], count: number): number {
    // 归纳置信度与观察数量正相关
    const base = 0.5;
    const countBonus = Math.min(count * 0.05, 0.4);

    return Math.min(base + countBonus, 0.95);
  }
}
```

## 2. 规划器 (Planner)

规划器负责将高层目标分解为可执行的行动计划。

```typescript
// 行动计划
interface ActionPlan {
  id: string;
  goal: string;
  steps: PlanStep[];
  estimatedCost: Cost;
  estimatedDuration: number;
  prerequisites: string[];
  risks: Risk[];
  status: PlanStatus;
}

interface PlanStep {
  id: string;
  action: Action;
  preconditions: Condition[];
  effects: Effect[];
  dependencies: string[];
  estimatedDuration: number;
  retryPolicy?: RetryPolicy;
}

interface Action {
  type: ActionType;
  target?: string;
  parameters: Map<string, any>;
  tool?: string;
}

type ActionType = 'invoke' | 'query' | 'transform' | 'create' | 'update' | 'delete' | 'wait' | 'branch';

// 规划器
class Planner {
  private planners: Map<string, PlanningAlgorithm> = new Map();
  private planCache: LRUCache<string, ActionPlan>;
  private costEstimator: CostEstimator;

  constructor(config: PlannerConfig) {
    this.initializePlanners();
    this.planCache = new LRUCache(config.cacheSize || 100);
    this.costEstimator = new CostEstimator(config.costModel);
  }

  private initializePlanners(): void {
    this.planners.set('hierarchical', new HierarchicalTaskNetwork());
    this.planners.set('linear', new LinearPlanner());
    this.planners.set('reactive', new ReactivePlanner());
    this.planners.set('goalGraph', new GoalGraphPlanner());
  }

  async plan(goal: string, context: Context, options: PlanningOptions = {}): Promise<ActionPlan> {
    // 检查缓存
    const cacheKey = this.generateCacheKey(goal, context);
    const cached = this.planCache.get(cacheKey);

    if (cached && !options.forceRefresh) {
      return cached;
    }

    // 选择规划算法
    const algorithm = this.selectAlgorithm(goal, context, options);

    // 生成计划
    const plan = await algorithm.generate(goal, context, this);

    // 验证计划
    const validated = await this.validate(plan, context);

    // 缓存计划
    this.planCache.set(cacheKey, validated);

    return validated;
  }

  private selectAlgorithm(
    goal: string,
    context: Context,
    options: PlanningOptions
  ): PlanningAlgorithm {
    // 根据目标特征选择算法
    if (options.algorithm) {
      const algorithm = this.planners.get(options.algorithm);
      if (algorithm) return algorithm;
    }

    // 自动选择
    const goalType = this.classifyGoal(goal);

    switch (goalType) {
      case 'sequential':
        return this.planners.get('linear')!;

      case 'hierarchical':
        return this.planners.get('hierarchical')!;

      case 'reactive':
        return this.planners.get('reactive')!;

      case 'goal_network':
        return this.planners.get('goalGraph')!;

      default:
        return this.planners.get('hierarchical')!;
    }
  }

  private classifyGoal(goal: string): string {
    if (/首先|然后|接着|最后/.test(goal)) return 'sequential';
    if (/分解|分为|包括/.test(goal)) return 'hierarchical';
    if (/当|如果|条件/.test(goal)) return 'reactive';

    return 'goal_network';
  }

  private generateCacheKey(goal: string, context: Context): string {
    return `${goal}:${context.user.id}:${context.session.id}`;
  }

  private async validate(plan: ActionPlan, context: Context): Promise<ActionPlan> {
    // 检查前置条件
    for (const step of plan.steps) {
      const satisfied = await this.checkPreconditions(step.preconditions, context);

      if (!satisfied.all) {
        // 添加修复步骤
        const repairSteps = await this.generateRepairSteps(step, satisfied.unsatisfied, context);
        plan.steps.unshift(...repairSteps);
      }
    }

    // 估算成本
    plan.estimatedCost = await this.costEstimator.estimate(plan);

    // 检测风险
    plan.risks = await this.assessRisks(plan, context);

    return plan;
  }

  private async checkPreconditions(
    preconditions: Condition[],
    context: Context
  ): Promise<{ all: boolean; unsatisfied: Condition[] }> {
    const unsatisfied: Condition[] = [];

    for (const condition of preconditions) {
      const satisfied = await this.evaluateCondition(condition, context);
      if (!satisfied) {
        unsatisfied.push(condition);
      }
    }

    return {
      all: unsatisfied.length === 0,
      unsatisfied
    };
  }

  private async evaluateCondition(condition: Condition, context: Context): Promise<boolean> {
    // 评估条件是否满足
    switch (condition.type) {
      case 'exists':
        return await this.checkExistence(condition.target!, context);

      case 'equals':
        return await this.checkEquality(condition.left!, condition.right!, context);

      case 'greaterThan':
        return await this.compareValues(condition.left!, condition.right!, context) > 0;

      case 'hasCapability':
        return await this.checkCapability(condition.target!, context);

      default:
        return true;
    }
  }

  private async checkExistence(target: string, context: Context): Promise<boolean> {
    // 检查目标是否存在
    return context.entities.has(target) || await this.knowledgeBase.exists(target);
  }

  private async checkEquality(left: string, right: string, context: Context): Promise<boolean> {
    return left === right;
  }

  private async compareValues(left: string, right: string, context: Context): Promise<number> {
    return parseFloat(left) - parseFloat(right);
  }

  private async checkCapability(target: string, context: Context): Promise<boolean> {
    const capabilities = await this.getCapabilities(context);
    return capabilities.includes(target);
  }

  private async getCapabilities(context: Context): Promise<string[]> {
    // 获取当前可用的能力列表
    return ['web_search', 'code_execution', 'file_read', 'api_call'];
  }

  private async generateRepairSteps(
    step: PlanStep,
    unsatisfied: Condition[],
    context: Context
  ): Promise<PlanStep[]> {
    const repairSteps: PlanStep[] = [];

    for (const condition of unsatisfied) {
      const repairAction = this.createRepairAction(condition);
      if (repairAction) {
        repairSteps.push({
          id: `repair_${step.id}_${condition.type}`,
          action: repairAction,
          preconditions: [],
          effects: [condition],
          dependencies: []
        });
      }
    }

    return repairSteps;
  }

  private createRepairAction(condition: Condition): Action | null {
    switch (condition.type) {
      case 'exists':
        return { type: 'create', target: condition.target };

      case 'hasCapability':
        return { type: 'invoke', tool: `setup_${condition.target}` };

      default:
        return null;
    }
  }

  private async assessRisks(plan: ActionPlan, context: Context): Promise<Risk[]> {
    const risks: Risk[] = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      // 检查依赖风险
      if (step.dependencies.length > 0) {
        const failedDeps = await this.checkDependencyHealth(step.dependencies, plan.steps);
        if (failedDeps.length > 0) {
          risks.push({
            type: 'dependency_failure',
            severity: 'high',
            affectedSteps: [step.id, ...failedDeps],
            mitigation: 'Add redundant paths or checkpoints'
          });
        }
      }

      // 检查成本风险
      const stepCost = await this.costEstimator.estimateStep(step);
      if (stepCost > context.user.preferences.maxCostPerStep) {
        risks.push({
          type: 'cost_exceed',
          severity: 'medium',
          affectedSteps: [step.id],
          mitigation: 'Consider alternative approaches'
        });
      }

      // 检查时间风险
      const totalDuration = plan.steps.slice(i).reduce((sum, s) => sum + s.estimatedDuration, 0);
      if (totalDuration > context.task.deadline) {
        risks.push({
          type: 'deadline_miss',
          severity: 'high',
          affectedSteps: plan.steps.slice(i).map(s => s.id),
          mitigation: 'Parallelize steps or reduce scope'
        });
      }
    }

    return risks;
  }

  async replan(plan: ActionPlan, failedStep: string, error: Error, context: Context): Promise<ActionPlan> {
    // 找到失败步骤
    const stepIndex = plan.steps.findIndex(s => s.id === failedStep);

    if (stepIndex === -1) {
      throw new Error(`Step ${failedStep} not found in plan`);
    }

    // 生成替代方案
    const alternatives = await this.generateAlternatives(plan.steps[stepIndex], context);

    if (alternatives.length > 0) {
      // 替换失败的步骤
      plan.steps[stepIndex] = alternatives[0];
    } else {
      // 回退到上一个检查点
      const checkpoint = this.findNearestCheckpoint(plan, stepIndex);
      plan.steps = plan.steps.slice(0, checkpoint + 1);
    }

    // 重新验证
    return this.validate(plan, context);
  }

  private async generateAlternatives(step: PlanStep, context: Context): Promise<PlanStep[]> {
    const alternatives: PlanStep[] = [];

    // 尝试不同的工具
    const availableTools = await this.getAvailableTools(step.action.type);

    for (const tool of availableTools) {
      if (tool !== step.action.tool) {
        alternatives.push({
          ...step,
          id: `${step.id}_alt_${tool}`,
          action: { ...step.action, tool }
        });
      }
    }

    return alternatives;
  }

  private async getAvailableTools(actionType: ActionType): Promise<string[]> {
    // 返回可用的工具列表
    return ['default_tool', 'backup_tool_1', 'backup_tool_2'];
  }

  private findNearestCheckpoint(plan: ActionPlan, currentIndex: number): number {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (plan.steps[i].effects.some(e => e.type === 'checkpoint')) {
        return i;
      }
    }
    return 0;
  }
}

// HTN规划器
class HierarchicalTaskNetwork implements PlanningAlgorithm {
  async generate(
    goal: string,
    context: Context,
    planner: Planner
  ): Promise<ActionPlan> {
    const steps: PlanStep[] = [];

    // 分解目标
    const tasks = this.decomposeGoal(goal);

    for (const task of tasks) {
      if (task.isPrimitive) {
        steps.push(this.createStep(task));
      } else {
        // 递归分解
        const subSteps = await this.decomposeTask(task, context, planner);
        steps.push(...subSteps);
      }
    }

    return {
      id: this.generateId(),
      goal,
      steps,
      estimatedCost: { tokens: 0, money: 0, time: 0 },
      estimatedDuration: steps.reduce((sum, s) => sum + s.estimatedDuration, 0),
      prerequisites: [],
      risks: [],
      status: 'pending'
    };
  }

  private decomposeGoal(goal: string): Task[] {
    // 简化的目标分解
    const tasks: Task[] = [];

    // 检测并列任务
    const parallelPattern = /以及|和|并/;
    if (parallelPattern.test(goal)) {
      const parts = goal.split(parallelPattern);
      for (const part of parts) {
        tasks.push({
          id: this.generateId(),
          name: part.trim(),
          isPrimitive: this.isPrimitiveTask(part),
          subtasks: []
        });
      }
    } else {
      tasks.push({
        id: this.generateId(),
        name: goal,
        isPrimitive: this.isPrimitiveTask(goal),
        subtasks: []
      });
    }

    return tasks;
  }

  private isPrimitiveTask(task: string): boolean {
    // 判断是否为原子任务
    const primitiveIndicators = ['搜索', '查询', '获取', '读取', '返回'];
    return primitiveIndicators.some(indicator => task.includes(indicator));
  }

  private async decomposeTask(
    task: Task,
    context: Context,
    planner: Planner
  ): Promise<PlanStep[]> {
    // 递归分解复杂任务
    const steps: PlanStep[] = [];

    // 示例分解逻辑
    if (task.name.includes('搜索并分析')) {
      steps.push(
        { id: this.generateId(), action: { type: 'query', parameters: new Map() }, preconditions: [], effects: [], dependencies: [] },
        { id: this.generateId(), action: { type: 'transform', parameters: new Map() }, preconditions: [{ type: 'exists', target: 'search_result' }], effects: [], dependencies: [steps[0]?.id || ''] }
      );
    }

    return steps;
  }

  private createStep(task: Task): PlanStep {
    return {
      id: task.id,
      action: { type: 'invoke', parameters: new Map([['task', task.name]]) },
      preconditions: [],
      effects: [{ type: 'complete', target: task.id }],
      dependencies: [],
      estimatedDuration: 1000
    };
  }

  private generateId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## 3. 记忆系统 (Memory System)

记忆系统管理 Agent 的所有历史信息和知识。

```typescript
// 记忆类型
type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'working';

interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
  importance: number;
  accessCount: number;
  lastAccessed: number;
}

interface MemoryMetadata {
  createdAt: number;
  source: 'user' | 'agent' | 'system';
  context?: string;
  tags: string[];
  expiresAt?: number;
}

// 记忆系统
class MemorySystem {
  private stores: Map<MemoryType, MemoryStore> = new Map();
  private indexer: MemoryIndexer;
  private importanceCalculator: ImportanceCalculator;
  private retentionPolicy: RetentionPolicy;

  constructor(config: MemoryConfig) {
    this.initializeStores(config);
    this.indexer = new MemoryIndexer();
    this.importanceCalculator = new ImportanceCalculator(config.importanceModel);
    this.retentionPolicy = new RetentionPolicy(config.retention);
  }

  private initializeStores(config: MemoryConfig): void {
    // 情景记忆 - 短期事件
    this.stores.set('episodic', new VectorStore({
      dimension: 1536,
      maxSize: config.episodicLimit || 1000
    }));

    // 语义记忆 - 事实知识
    this.stores.set('semantic', new GraphStore({
      maxSize: config.semanticLimit || 10000
    }));

    // 程序记忆 - 技能和流程
    this.stores.set('procedural', new KeyValueStore({
      ttl: Infinity
    }));

    // 工作记忆 - 当前上下文
    this.stores.set('working', new WorkingMemory({
      capacity: config.workingCapacity || 10
    }));
  }

  async store(memory: Memory): Promise<void> {
    // 计算重要性
    memory.importance = await this.importanceCalculator.calculate(memory);

    // 存储到对应类型
    const store = this.stores.get(memory.type);
    await store.add(memory);

    // 更新索引
    await this.indexer.index(memory);

    // 检查保留策略
    await this.retentionPolicy.check(memory, this.stores);
  }

  async retrieve(query: string, options: RetrievalOptions = {}): Promise<Memory[]> {
    const { type, limit, threshold } = options;

    // 确定查询的记忆类型
    const typesToSearch = type ? [type] : Array.from(this.stores.keys());

    const results: Memory[] = [];

    for (const memType of typesToSearch) {
      const store = this.stores.get(memType)!;
      const memories = await store.search(query, {
        limit: limit || 10,
        threshold: threshold || 0.7
      });
      results.push(...memories);
    }

    // 更新访问统计
    for (const memory of results) {
      memory.accessCount++;
      memory.lastAccessed = Date.now();
    }

    // 按相关性排序
    return results.sort((a, b) => b.importance - a.importance);
  }

  async retrieveContext(window: number = 5): Promise<Memory[]> {
    const workingStore = this.stores.get('working') as WorkingMemory;
    return workingStore.getRecent(window);
  }

  async update(id: string, updates: Partial<Memory>): Promise<void> {
    for (const store of this.stores.values()) {
      const exists = await store.exists(id);
      if (exists) {
        await store.update(id, updates);
        break;
      }
    }
  }

  async consolidate(): Promise<void> {
    // 记忆整合 - 将工作记忆中的信息整合到长期记忆
    const workingStore = this.stores.get('working') as WorkingMemory;
    const episodicStore = this.stores.get('episodic') as VectorStore;

    const recentMemories = await workingStore.getAll();

    for (const memory of recentMemories) {
      if (memory.importance > 0.7) {
        await episodicStore.add({
          ...memory,
          type: 'episodic'
        });
      }
    }

    // 清空工作记忆
    await workingStore.clear();
  }

  async getSummary(timeRange?: TimeRange): Promise<MemorySummary> {
    const episodicStore = this.stores.get('episodic') as VectorStore;
    const semanticStore = this.stores.get('semantic') as GraphStore;

    return {
      episodicCount: await episodicStore.count(timeRange),
      semanticCount: await semanticStore.count(),
      mostAccessed: await this.getMostAccessed(10),
      recentTopics: await this.extractTopics(timeRange)
    };
  }

  private async getMostAccessed(limit: number): Promise<Memory[]> {
    const allMemories: Memory[] = [];

    for (const store of this.stores.values()) {
      allMemories.push(...await store.getAll());
    }

    return allMemories
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  private async extractTopics(timeRange?: TimeRange): Promise<string[]> {
    const episodicStore = this.stores.get('episodic') as VectorStore;
    const memories = await episodicStore.getAll(timeRange);

    // 简单的主题提取
    const topicCounts = new Map<string, number>();

    for (const memory of memories) {
      const tags = memory.metadata.tags;
      for (const tag of tags) {
        topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic]) => topic);
  }
}

// 向量存储
class VectorStore implements MemoryStore {
  private vectors: Map<string, { memory: Memory; vector: number[] }> = new Map();
  private dimension: number;
  private maxSize: number;

  constructor(config: { dimension: number; maxSize: number }) {
    this.dimension = config.dimension;
    this.maxSize = config.maxSize;
  }

  async add(memory: Memory): Promise<void> {
    if (this.vectors.size >= this.maxSize) {
      await this.evict();
    }

    const vector = await this.embed(memory.content);
    this.vectors.set(memory.id, { memory, vector });
  }

  async search(query: string, options: { limit: number; threshold: number }): Promise<Memory[]> {
    const queryVector = await this.embed(query);
    const results: Array<{ memory: Memory; similarity: number }> = [];

    for (const { memory, vector } of this.vectors.values()) {
      const similarity = this.cosineSimilarity(queryVector, vector);
      if (similarity >= options.threshold) {
        results.push({ memory, similarity });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit)
      .map(r => r.memory);
  }

  private async embed(text: string): Promise<number[]> {
    // 实际实现应调用嵌入模型
    return new Array(this.dimension).fill(0).map(() => Math.random());
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async evict(): Promise<void> {
    // 驱逐最少访问的记忆
    let oldest: Memory | null = null;

    for (const { memory } of this.vectors.values()) {
      if (!oldest || memory.lastAccessed < oldest.lastAccessed) {
        oldest = memory;
      }
    }

    if (oldest) {
      this.vectors.delete(oldest.id);
    }
  }

  async getAll(): Promise<Memory[]> {
    return Array.from(this.vectors.values()).map(v => v.memory);
  }

  async exists(id: string): Promise<boolean> {
    return this.vectors.has(id);
  }

  async update(id: string, updates: Partial<Memory>): Promise<void> {
    const entry = this.vectors.get(id);
    if (entry) {
      entry.memory = { ...entry.memory, ...updates };
    }
  }

  async count(): Promise<number> {
    return this.vectors.size;
  }
}

// 工作记忆
class WorkingMemory implements MemoryStore {
  private memories: Memory[] = [];
  private capacity: number;

  constructor(config: { capacity: number }) {
    this.capacity = config.capacity;
  }

  async add(memory: Memory): Promise<void> {
    this.memories.push(memory);

    if (this.memories.length > this.capacity) {
      // 遗忘最旧的记忆
      this.memories.shift();
    }
  }

  async getRecent(count: number): Promise<Memory[]> {
    return this.memories.slice(-count);
  }

  async getAll(): Promise<Memory[]> {
    return [...this.memories];
  }

  async clear(): Promise<void> {
    this.memories = [];
  }

  async exists(): Promise<boolean> {
    return this.memories.length > 0;
  }

  async update(): Promise<void> {}
}

// 重要性计算器
class ImportanceCalculator {
  private model: ImportanceModel;

  constructor(config: ImportanceConfig) {
    this.model = this.loadModel(config.modelPath);
  }

  async calculate(memory: Memory): Promise<number> {
    let score = 0.5; // 基础分数

    // 来源权重
    switch (memory.metadata.source) {
      case 'user':
        score += 0.2;
        break;
      case 'agent':
        score += 0.1;
        break;
      default:
        break;
    }

    // 标签权重
    const priorityTags = ['important', 'decision', 'error', 'success'];
    const hasPriorityTag = memory.metadata.tags.some(tag =>
      priorityTags.includes(tag.toLowerCase())
    );
    if (hasPriorityTag) score += 0.15;

    // 访问频率
    score += Math.min(memory.accessCount * 0.02, 0.15);

    return Math.min(score, 1);
  }
}
```

## 4. 知识图谱 (Knowledge Graph)

知识图谱存储和管理结构化的知识关系。

```typescript
// 知识图谱节点
interface KGNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Map<string, any>;
  embeddings?: number[];
}

type NodeType = 'entity' | 'concept' | 'event' | 'document';

// 知识图谱边
interface KGEdge {
  id: string;
  source: string;
  target: string;
  relation: RelationType;
  weight: number;
  properties: Map<string, any>;
}

type RelationType =
  | 'is_a'
  | 'part_of'
  | 'has_property'
  | 'causes'
  | 'depends_on'
  | 'similar_to'
  | 'precedes'
  | 'references';

// 知识图谱
class KnowledgeGraph {
  private nodes: Map<string, KGNode> = new Map();
  private edges: Map<string, KGEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private indexer: GraphIndexer;

  constructor() {
    this.indexer = new GraphIndexer();
  }

  async addNode(node: KGNode): Promise<void> {
    this.nodes.set(node.id, node);
    this.adjacencyList.set(node.id, new Set());

    await this.indexer.indexNode(node);
  }

  async addEdge(edge: KGEdge): Promise<void> {
    // 验证节点存在
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      throw new NodeNotFoundError(edge.source, edge.target);
    }

    this.edges.set(edge.id, edge);

    // 更新邻接表
    this.adjacencyList.get(edge.source)!.add(edge.target);
    this.adjacencyList.get(edge.target)!.add(edge.source); // 无向图

    await this.indexer.indexEdge(edge);
  }

  async query(query: KGQuery): Promise<KGQueryResult> {
    switch (query.type) {
      case 'path':
        return this.findPath(query.from, query.to, query.maxLength);

      case 'neighbors':
        return this.findNeighbors(query.node, query.depth);

      case 'pattern':
        return this.findPattern(query.pattern);

      case 'semantic':
        return this.semanticSearch(query.text, query.limit);

      default:
        return { nodes: [], edges: [] };
    }
  }

  private async findPath(
    from: string,
    to: string,
    maxLength: number
  ): Promise<KGQueryResult> {
    const visited = new Set<string>();
    const path: string[] = [];
    const edges: KGEdge[] = [];

    const found = this.dfs(from, to, maxLength, visited, path, edges);

    if (found) {
      return {
        nodes: path.map(id => this.nodes.get(id)!),
        edges
      };
    }

    return { nodes: [], edges: [] };
  }

  private dfs(
    current: string,
    target: string,
    remaining: number,
    visited: Set<string>,
    path: string[],
    edges: KGEdge[]
  ): boolean {
    if (remaining < 0) return false;

    visited.add(current);
    path.push(current);

    if (current === target) return true;

    const neighbors = this.adjacencyList.get(current) || new Set();

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        // 找到连接边
        const edge = this.findEdge(current, neighbor);
        if (edge) edges.push(edge);

        if (this.dfs(neighbor, target, remaining - 1, visited, path, edges)) {
          return true;
        }

        edges.pop(); // 回溯
      }
    }

    path.pop();
    return false;
  }

  private findEdge(source: string, target: string): KGEdge | null {
    for (const edge of this.edges.values()) {
      if (edge.source === source && edge.target === target) {
        return edge;
      }
    }
    return null;
  }

  private async findNeighbors(nodeId: string, depth: number): Promise<KGQueryResult> {
    const resultNodes = new Set<KGNode>();
    const resultEdges: KGEdge[] = [];

    const queue: Array<{ id: string; level: number }> = [{ id: nodeId, level: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;

      if (visited.has(id) || level > depth) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (node) resultNodes.add(node);

      const neighbors = this.adjacencyList.get(id) || new Set();

      for (const neighborId of neighbors) {
        const edge = this.findEdge(id, neighborId);
        if (edge) resultEdges.push(edge);

        queue.push({ id: neighborId, level: level + 1 });
      }
    }

    return {
      nodes: Array.from(resultNodes),
      edges: resultEdges
    };
  }

  private async findPattern(pattern: GraphPattern): Promise<KGQueryResult> {
    const matchingNodes = new Set<KGNode>();

    // 简单的模式匹配
    for (const node of this.nodes.values()) {
      if (this.matchNodePattern(node, pattern.nodePattern)) {
        matchingNodes.add(node);
      }
    }

    return {
      nodes: Array.from(matchingNodes),
      edges: []
    };
  }

  private matchNodePattern(node: KGNode, pattern: NodePattern): boolean {
    if (pattern.type && node.type !== pattern.type) return false;
    if (pattern.label && !node.label.includes(pattern.label)) return false;

    if (pattern.properties) {
      for (const [key, value] of Object.entries(pattern.properties)) {
        if (node.properties.get(key) !== value) return false;
      }
    }

    return true;
  }

  private async semanticSearch(text: string, limit: number): Promise<KGQueryResult> {
    const queryEmbedding = await this.embed(text);
    const results: Array<{ node: KGNode; similarity: number }> = [];

    for (const node of this.nodes.values()) {
      if (node.embeddings) {
        const similarity = this.cosineSimilarity(queryEmbedding, node.embeddings);
        results.push({ node, similarity });
      }
    }

    return {
      nodes: results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(r => r.node),
      edges: []
    };
  }

  private async embed(text: string): Promise<number[]> {
    // 嵌入实现
    return new Array(1536).fill(0).map(() => Math.random());
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }

  async expand(nodeId: string, depth: number = 1): Promise<KGNode[]> {
    const neighbors = await this.findNeighbors(nodeId, depth);
    return neighbors.nodes;
  }

  async infer(type: RelationType, from: string): Promise<KGNode[]> {
    // 关系推理
    const inferred: KGNode[] = [];

    // 传递闭包
    const visited = new Set<string>();
    const queue = [from];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current)) continue;
      visited.add(current);

      const edges = this.getOutgoingEdges(current);

      for (const edge of edges) {
        if (edge.relation === type) {
          const targetNode = this.nodes.get(edge.target);
          if (targetNode) inferred.push(targetNode);
        }

        queue.push(edge.target);
      }
    }

    return inferred;
  }

  private getOutgoingEdges(nodeId: string): KGEdge[] {
    return Array.from(this.edges.values()).filter(e => e.source === nodeId);
  }

  async export(format: 'json' | 'rdf' | 'owl'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify({
          nodes: Array.from(this.nodes.values()),
          edges: Array.from(this.edges.values())
        }, null, 2);

      default:
        throw new UnsupportedFormatError(format);
    }
  }
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 文件系统 API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) | 用最小 API 把记忆持久化到本地文件，顺带看清权限模型。 | 先跑通读取示例，再写一个把对话历史落盘的函数，留意权限提示出现时机。 |
| [Mastra 文档](https://mastra.ai/docs) | 在 TypeScript 里把 workflow 与 memory 串成可运行的 Agent。 | 跑通带 memory 的 workflow 示例，再加一个自定义步骤，观察状态如何传递。 |
| [WebAssembly JS API 规范](https://webassembly.github.io/spec/js-api/) | instantiate 与 Memory 接口界定了推理引擎的沙箱与数据边界。 | 读实例化与 Memory 两节，想清哪些推理步骤放 Wasm，再跑一个最小调用验证。 |
| [Memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management) | GC 与引用语义是任何记忆抽象之下的真实成本，常被忽略。 | 读垃圾回收与常见泄漏两节，对照自己的记忆缓存，检查是否存在无界增长。 |
| [File System Router](https://bun.sh/docs/runtime/file-system-router) | 按路径约定解析路由，可类比知识与工具的检索入口设计。 | 读路由约定与匹配规则，据此设计一套工具与知识的命名和检索路径。 |
| [Appendix: How does the Reactive System Work?](https://book.leptos.dev/appendix_reactive_graph.html) | 细粒度依赖图如何追踪与传播更新，与知识图谱推理同构。 | 读依赖收集与更新传播两节，画出自己的推导依赖图，再实现最小版本。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Generative Agents](https://arxiv.org/abs/2304.03442) | 记忆流与检索加权的经典开源实现，直接对应记忆系统一节。 | 读 memory stream 的检索打分与反思触发两段，想清自己该存什么，再改写一版检索逻辑。 |
| [web.dev：Origin Private File System](https://web.dev/articles/origin-private-file-system) | Worker 内同步读写文件并计时，给记忆落盘提供性能参考。 | 实现句柄同步读写并测量耗时，据此决定记忆放内存还是落盘、多久刷一次。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) | 讲清 lead agent 如何分解任务、派给 subagent 并汇合结果。 | 画出调用关系图，标出规划点与汇合点，判断自己的任务是否值得拆多 Agent。 |
| [Hello Interview System Design](https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction) | 通用解题框架可迁移为规划器的任务分解与取舍模板。 | 读框架四步后套一道 Agent 设计题，先写分解与取舍，再与自己的直觉对照。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格批量改价 | 规划器、推理引擎 | 计划与执行分离、幂等写库 | 改价不可逆，要先预览再落库 |
| 低端安卓的首屏加载诊断 | 推理引擎 | 端侧小模型加规则校验 | 端上算力有上限，延迟预算写死 |
| 多人协作白板的会议纪要与待办 | 记忆系统 | 滚动摘要加向量检索 | 说话人归属错会把待办派错人 |
| 企业制度问答机器人 | 知识图谱、记忆系统 | 图查询加权限过滤 | 制度有时效，节点必须带版本 |
| 代码仓库的跨文件重构 | 规划器、知识图谱 | 依赖图加分步补丁 | 改动边界要能回滚，逐文件验证 |
| 客服工单自动分诊与回复草稿 | 推理引擎、知识图谱 | 两跳图查询加引用核对 | 覆盖不足的草稿必须转人工 |
| 长跑数据管道的排障 | 记忆系统 | 轨迹回放加摘要压缩 | 上下文窗口会挤掉关键日志行 |
| 医院预约改期的多轮对话 | 规划器、记忆系统 | 槽位状态机加长期记忆 | 状态不一致会重复下单 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格批量改价

**业务背景**

运营在后台勾选整页商品，按成本加成规则统一调价，选中行数从几百到上万。人工逐行改的耗时按分钟计，改错了只能靠事后对账发现。

规模口径：统计"单次操作覆盖的行数"与"人工完成同样行数花费的分钟数"，两者相除得到吞吐对比。

**怎么用本页知识解决**

思路：规划器先算出一份完整计划，执行器再逐步落库，每步带幂等键。推理引擎只把自然语言规则翻成参数，不直接写库。

```python
def make_plan(rows, rule, fn):
    plan = []
    for r in rows:                            # rows 是后台当前选中的行
        new = fn(r["cost"], rule)             # 纯函数算新价，先不碰数据库
        if new <= r["cost"]:
            plan.append({"id": r["id"], "skip": "低于成本"})  # 计划阶段就拦下
        else:
            plan.append({
                "id": r["id"], "op": "update_price", "value": new,
                "key": "price:%s:%s" % (r["id"], r["version"]),  # 幂等键
            })
    return plan
def run(plan, db, dry=True):
    for step in plan:
        if "skip" in step or db.seen(step["key"]):
            continue                          # 跳过的和已执行的都不再动
        if dry:
            yield step                        # 预览阶段只回显差异
        else:
            db.apply(step)                    # 执行阶段逐条记录，便于回滚
```

- 计划与执行分两段：模型只产出 plan，落库由 run 完成。
- 幂等键用 id 加 version，重试或重放同一批不会二次生效。
- 预览阶段 dry 为真，只回显差异，运营确认后才写库。
- 低于成本的条目在计划阶段被标记 skip，不进入执行。
- 回滚读执行日志逐条反向写回，不重新调用模型。

**怎么度量收益**

- 计划正确率：回放历史改价批次，比对最终价格与人工结果。
- 幂等性：对同一 plan 连续执行两次，用数据库快照 diff 验证第二次无变更。
- 端到端耗时：用 pytest 跑 1000 行批次，记录 make_plan 与 run 的耗时分布。
- 线上观察：自定义 Prometheus 计数器统计已执行与已跳过的条数。

**什么时候不该用**

- 选中行只有十几行、规则每月才变一次：维护计划器的成本高于人工改。
- 涉及合同价或监管限价：规则无法写成纯函数，应由审批流决定。
- 备注列是人工填的自由文本且需要解读：解析错误的代价高，先做字段规范化。

#### 场景 2：客服工单自动分诊与回复草稿

**业务背景**

一线客服处理同一产品线的重复问题，答复集中在少数几种故障上。新人靠翻历史工单上手，口径不一致会被质检退回。

规模口径：统计"同一知识节点被引用的工单数"除以"当日工单总数"，得到重复问题占比。

**怎么用本页知识解决**

思路：先用知识图谱锁定问题节点，把两跳内的事实交给模型写草稿，再逐句核对引用。

```python
def triage(ticket, graph, llm):
    facts = graph.query(ticket.product, depth=2)   # 只取该产品两跳内的节点
    if not facts:
        return {"route": "人工", "why": "图中无匹配知识"}
    draft = llm(build_prompt(ticket.text, facts))  # 事实进上下文，约束编造
    cov = check_citations(draft, facts)            # 草稿逐句回查是否来自 facts
    if cov.ratio < 0.8 or cov.conflict:
        return {"route": "人工复核", "draft": draft}
    return {"route": "自动回复", "draft": draft}
```

- 图查询限定两跳，避免把无关产品的事实塞进上下文。
- 事实为空直接转人工，不让模型凭参数记忆回答。
- 引用核对把草稿每句映射回事实节点，覆盖不足就降级。
- 冲突检测处理同一节点存在多个有效版本的情况。
- 路由结果与草稿一起落库，供事后质检抽样。

**怎么度量收益**

- 自动回复占比与人工改写率：在工单系统埋点，按周统计路由分布。
- 引用覆盖率：用人工标注的问答对离线评 cov.ratio 分布。
- 错误答复数：每周随机抽样人工复核，统计需撤回的条数。
- 一线处理时长：对比同期工单的首次响应与结单时间中位数。

**什么时候不该用**

- 产品资料还没整理成带版本的图，节点之间互相矛盾：先做知识整理。
- 工单涉及退款金额与赔付承诺：这类答复由有权限的人给出。
- 问题主体是情绪安抚与投诉升级：图中没有对应节点，硬套会答非所问。

#### 场景 3：多人协作白板的会议纪要与待办抽取

**业务背景**

多人白板会议常见一小时以上，会后靠一个人回放录制整理待办，口头承诺容易漏掉。待办散落在对话里，缺负责人和时间点就无法跟踪。

规模口径：统计"待办条目数除以会议分钟数"，以及"整理耗时除以会议时长"。

**怎么用本页知识解决**

思路：会中滚动维护工作记忆，超出预算就从最老的轮次压缩；会后把待办与摘要写入长期记忆，供跨会议追问。

```python
def on_turn(mem, turn, budget=2000):
    mem.recent.append(turn)                     # 保留最近若干轮原文
    if sum(len(t) for t in mem.recent) > budget:
        old = mem.recent.pop(0)                 # 超预算就从最老的开始压缩
        mem.summary = merge(mem.summary, old)   # 摘要保留决策与未决分歧
    for task in extract_tasks(turn.text):       # 抽待办，带说话人与时间戳
        mem.tasks.append({"who": turn.speaker, "text": task, "at": turn.ts})
    return mem.summary, mem.tasks

def on_close(mem, store):
    store.write(mem.summary, mem.tasks)         # 会后写入长期记忆
```

- 工作记忆保留最近若干轮原文，指代（比如"这个方案"）才能解析。
- 超过 token 预算时从最老轮次压缩，摘要保留决策与未决分歧。
- 待办带说话人和时间戳，没有负责人的条目标记为未指派。
- 长期记忆检索按项目与日期过滤，结构化字段先行。
- 摘要与原文分开存，追问细节时可回到原文片段。

**怎么度量收益**

- 待办召回率：以人工标注的会后纪要为基准，比对系统抽出的条目。
- 摘要压缩比：统计原始转写 token 与摘要 token 的比值。
- 跨会议追问命中：构造"上次谁负责登录改造"这类问题，看检索是否命中。
- 会中延迟：用浏览器 Performance 面板记录每轮处理耗时，确认不阻塞输入。

**什么时候不该用**

- 会议内容涉及人事与法务，不能长期留存：只做当场摘要，不写长期记忆。
- 以屏幕共享演示为主、口头内容少：转写噪声大，抽待办准确率低。
- 待办已有工单系统自动派单：两套来源冲突，选一处作为唯一来源。

### 行业先进实践

1. 工具调用与结构化输出（出处：OpenAI 官方文档 Function calling 与 Structured Outputs 章节）
做法是把工具名称与参数结构交给模型，模型返回结构化参数，由程序执行副作用。有效点是模型只选工具、填参数，写操作留给代码控制。借鉴方式：把所有写操作包成带 JSON Schema 的函数，拒绝自由文本指令。

2. ReAct 交替推理与行动（出处：论文 ReAct: Synergizing Reasoning and Acting in Language Models，arXiv:2210.03629）
做法是让模型每步输出思考与动作，观察结果再进入下一步。有效点是观察结果会纠正错误的中间假设。借鉴方式：把工具返回值写进轨迹，不要只留最终答案。

3. 检索增强生成（出处：论文 Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks，arXiv:2005.11401）
做法是先检索外部文档，再把片段拼进上下文生成答案。有效点是知识更新不必重训模型。借鉴方式：检索走两路，向量召回加结构化过滤，权限判断放在过滤层。

4. 工作流优先，自主循环其次（出处：Anthropic 工程博客 Building effective agents）
做法是先用固定提示链与路由拼出流程，只有步骤无法预先确定时才用自主循环。有效点是路径可预测、失败可定位。借鉴方式：把批量改价这类步骤固定的任务写成工作流。

5. 分层记忆与自我编辑（出处：论文 MemGPT，arXiv:2310.08560，及 Letta 开源项目）
做法是把上下文当成可换页的内存，模型通过工具在快记忆与慢记忆之间搬运。有效点是长对话不必把历史全塞进窗口。借鉴方式：先做摘要压缩与检索两层，再考虑自我编辑；具体接口需核对官方文档：核对工具定义与页式内存的字段。

### 从学到用：落地路线

1. 试点：选一个只读、可回放的场景，比如工单分诊，先跑离线评测集，不接线上写操作。验收标准：评测集上引用覆盖率与人工基线接近，失败样本能逐条解释。
2. 验证：把试点接成影子模式，与人工结果并行产出，只记录不改线上数据。验收标准：连续两周对比日志中一致率稳定，分歧样本完成归类。
3. 推广：把调好的计划器、检索层、记忆层抽成公共模块，接入第二个场景。验收标准：第二个场景复用模块时，改动只在配置与提示词范围内。
4. 防回退：为每个场景建回归集与指标看板，发布前必须跑通。验收标准：回归集通过率低于阈值时阻断发布，每季度做一次回滚演练。

### 动手作业

**目标**：做一个能回答"上周这个项目谁承诺了什么"的小助手，覆盖记忆的写入、压缩与检索。

**步骤**

1. 造数据：手写或导出 3 段会议转写，每段 20 到 40 轮，标注说话人与时间戳。
2. 建工作记忆：实现滚动窗口，超过 token 预算就从最老轮次压缩成摘要。
3. 抽待办：用规则或模型抽取含负责人、动作、时间点的句子，输出 JSON。
4. 建长期记忆：把摘要与待办写入 SQLite，字段含项目、日期、说话人。
5. 建检索：实现向量召回加项目与日期过滤两条路径，合并后排序。
6. 建评测集：人工写出 15 个问题与标准答案，覆盖同会议与跨会议两类。
7. 接入命令行入口，把检索片段与答案一起打印出来。

**验收标准**

- 15 个问题中，检索命中的片段包含标准答案依据的比例达到你预设的阈值。
- 连续写入 3 段会议后，进程内存占用不随写入量线性增长。
- 删除任一段会议数据后，相关问题不再返回该段内容。
- 摘要长度不超过原转写的设定比例，且决策句未被丢弃。
- 全部步骤能在一台笔记本上离线跑通，不依赖付费接口。

