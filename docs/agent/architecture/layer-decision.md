---
title: 决策层
description: Agent 分层架构之决策层：规划、策略选择与行动决策。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 决策层

决策层根据认知层的结果做出最优的行动决策。

## 1. 模型选择器 (Model Selector)

模型选择器负责为不同任务选择最合适的 AI 模型。

```typescript
// 模型定义
interface AIModel {
  id: string;
  name: string;
  provider: string;
  capability: ModelCapability;
  cost: ModelCost;
  latency: LatencyProfile;
  contextWindow: number;
  strengths: string[];
  weaknesses: string[];
}

interface ModelCapability {
  reasoning: number;
  creativity: number;
  speed: number;
  accuracy: number;
  codeGeneration: number;
  language: string[];
}

interface ModelCost {
  input: number;  // per 1M tokens
  output: number;
  currency: string;
}

// 模型选择器
class ModelSelector {
  private models: Map<string, AIModel> = new Map();
  private selector: SelectionStrategy;

  constructor(config: ModelSelectorConfig) {
    this.loadModels(config.models);
    this.selector = new CompositeSelector([
      new CapabilityMatcher(),
      new CostOptimizer(),
      new LatencyMinimizer()
    ]);
  }

  async select(context: DecisionContext): Promise<SelectedModel> {
    // 候选模型筛选
    const candidates = this.filterCandidates(context);

    if (candidates.length === 0) {
      throw new NoAvailableModelError();
    }

    // 多维度评分
    const scores = await this.scoreModels(candidates, context);

    // 综合排名
    const ranked = this.rankModels(scores, context);

    // 选择最佳模型
    const selected = ranked[0];

    return {
      model: selected.model,
      confidence: selected.score,
      alternatives: ranked.slice(1, 4).map(r => r.model)
    };
  }

  private filterCandidates(context: DecisionContext): AIModel[] {
    return Array.from(this.models.values()).filter(model => {
      // 上下文窗口检查
      if (context.inputLength > model.contextWindow) {
        return false;
      }

      // 能力要求检查
      if (context.requiredCapabilities) {
        for (const [cap, minLevel] of Object.entries(context.requiredCapabilities)) {
          const capability = model.capability[cap as keyof ModelCapability];
          if (capability < (minLevel as number)) {
            return false;
          }
        }
      }

      // 预算检查
      const estimatedCost = this.estimateCost(model, context);
      if (estimatedCost > context.maxBudget) {
        return false;
      }

      return true;
    });
  }

  private async scoreModels(
    candidates: AIModel[],
    context: DecisionContext
  ): Promise<ModelScore[]> {
    const scores: ModelScore[] = [];

    for (const model of candidates) {
      const score = await this.selector.calculate(model, context, this);

      scores.push({
        model,
        totalScore: score.total,
        breakdown: score.dimensions
      });
    }

    return scores;
  }

  private rankModels(scores: ModelScore[], context: DecisionContext): RankedModel[] {
    const weights = context.priorities || {
      capability: 0.4,
      cost: 0.3,
      latency: 0.3
    };

    return scores
      .map(s => ({
        model: s.model,
        score: s.totalScore,
        weightedScore:
          s.breakdown.capability * weights.capability +
          s.breakdown.cost * weights.cost +
          s.breakdown.latency * weights.latency
      }))
      .sort((a, b) => b.weightedScore - a.weightedScore);
  }

  private estimateCost(model: AIModel, context: DecisionContext): number {
    const inputTokens = Math.ceil(context.inputLength / 1000);
    const outputTokens = Math.ceil(context.expectedOutputLength / 1000);

    return (inputTokens * model.cost.input) + (outputTokens * model.cost.output);
  }

  private loadModels(models: AIModelConfig[]): void {
    for (const config of models) {
      this.models.set(config.id, {
        id: config.id,
        name: config.name,
        provider: config.provider,
        capability: config.capability,
        cost: config.cost,
        latency: config.latency,
        contextWindow: config.contextWindow,
        strengths: config.strengths || [],
        weaknesses: config.weaknesses || []
      });
    }
  }

  async selectWithFallback(
    context: DecisionContext,
    maxAttempts: number = 3
  ): Promise<ModelWithFallback> {
    const attempts: Attempt[] = [];

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const selected = await this.select(context);

        return {
          primary: selected,
          attempts: attempts.length,
          success: true
        };
      } catch (error) {
        attempts.push({
          attempt: i + 1,
          error: error as Error
        });

        // 调整上下文后重试
        context = this.adjustContext(context, error as Error);
      }
    }

    throw new AllModelsFailedError(attempts);
  }

  private adjustContext(context: DecisionContext, error: Error): DecisionContext {
    // 简化重试调整
    return {
      ...context,
      maxBudget: context.maxBudget * 1.5,
      requiredCapabilities: context.requiredCapabilities
    };
  }
}

// 选择策略接口
interface SelectionStrategy {
  calculate(model: AIModel, context: DecisionContext, selector: ModelSelector): Promise<ScoreResult>;
}

interface ScoreResult {
  total: number;
  dimensions: {
    capability: number;
    cost: number;
    latency: number;
  };
}

// 能力匹配策略
class CapabilityMatcher implements SelectionStrategy {
  async calculate(model: AIModel, context: DecisionContext, selector: ModelSelector): Promise<ScoreResult> {
    let capabilityScore = 0;

    if (context.taskType) {
      capabilityScore = this.scoreForTaskType(model, context.taskType);
    }

    return {
      total: capabilityScore,
      dimensions: {
        capability: capabilityScore,
        cost: 0,
        latency: 0
      }
    };
  }

  private scoreForTaskType(model: AIModel, taskType: string): number {
    const taskScores: Record<string, keyof ModelCapability> = {
      'reasoning': 'reasoning',
      'coding': 'codeGeneration',
      'creative': 'creativity',
      'analysis': 'accuracy'
    };

    const capabilityKey = taskScores[taskType];
    if (capabilityKey) {
      return model.capability[capabilityKey];
    }

    return 0.7; // 默认分数
  }
}

// 成本优化策略
class CostOptimizer implements SelectionStrategy {
  async calculate(model: AIModel, context: DecisionContext, selector: ModelSelector): Promise<ScoreResult> {
    const normalizedCost = this.normalizeCost(model, context);

    return {
      total: normalizedCost,
      dimensions: {
        capability: 0,
        cost: normalizedCost,
        latency: 0
      }
    };
  }

  private normalizeCost(model: AIModel, context: DecisionContext): number {
    const estimatedCost = (model.cost.input + model.cost.output) / 2;
    const maxCost = Math.max(...Array.from(selector['models'].values()).map(m =>
      (m.cost.input + m.cost.output) / 2
    ));

    return 1 - (estimatedCost / maxCost);
  }
}

// 延迟最小化策略
class LatencyMinimizer implements SelectionStrategy {
  async calculate(model: AIModel, context: DecisionContext, selector: ModelSelector): Promise<ScoreResult> {
    const latencyScore = this.scoreLatency(model.latency);

    return {
      total: latencyScore,
      dimensions: {
        capability: 0,
        cost: 0,
        latency: latencyScore
      }
    };
  }

  private scoreLatency(latency: LatencyProfile): number {
    const avgLatency = (latency.p50 + latency.p95) / 2;
    return Math.max(0, 1 - (avgLatency / 10000)); // 10秒为基准
  }
}

// 复合选择器
class CompositeSelector implements SelectionStrategy {
  private strategies: SelectionStrategy[];
  private weights: number[];

  constructor(strategies: SelectionStrategy[]) {
    this.strategies = strategies;
    this.weights = strategies.map(() => 1 / strategies.length);
  }

  async calculate(model: AIModel, context: DecisionContext, selector: ModelSelector): Promise<ScoreResult> {
    const results = await Promise.all(
      this.strategies.map(s => s.calculate(model, context, selector))
    );

    const combined: ScoreResult = {
      total: 0,
      dimensions: { capability: 0, cost: 0, latency: 0 }
    };

    for (const result of results) {
      combined.dimensions.capability += result.dimensions.capability;
      combined.dimensions.cost += result.dimensions.cost;
      combined.dimensions.latency += result.dimensions.latency;
    }

    combined.total = (combined.dimensions.capability + combined.dimensions.cost + combined.dimensions.latency) / 3;

    return combined;
  }
}
```

## 2. 策略引擎 (Strategy Engine)

策略引擎根据当前状态选择最优行动策略。

```typescript
// 策略定义
interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  conditions: StrategyCondition[];
  actions: StrategyAction[];
  priority: number;
  timeout?: number;
}

type StrategyType = 'deterministic' | 'probabilistic' | 'adaptive' | 'reactive';

interface StrategyCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
  value: any;
}

interface StrategyAction {
  type: ActionType;
  parameters: Map<string, any>;
  expectedOutcome?: string;
}

// 策略引擎
class StrategyEngine {
  private strategies: Map<string, Strategy> = new Map();
  private activeStrategy: Strategy | null = null;
  private history: StrategyExecution[] = [];

  constructor(config: StrategyConfig) {
    this.loadStrategies(config.strategies);
  }

  async select(context: DecisionContext): Promise<SelectedStrategy> {
    const applicable = this.findApplicableStrategies(context);

    if (applicable.length === 0) {
      // 使用默认策略
      return this.getDefaultStrategy();
    }

    // 按优先级排序
    const ranked = applicable.sort((a, b) => b.priority - a.priority);

    // 选择最佳策略
    const selected = await this.evaluateStrategy(ranked[0], context);

    this.activeStrategy = selected;

    return {
      strategy: selected,
      reasoning: this.explainSelection(selected, context),
      alternatives: ranked.slice(1, 3).map(s => s)
    };
  }

  private findApplicableStrategies(context: DecisionContext): Strategy[] {
    const applicable: Strategy[] = [];

    for (const strategy of this.strategies.values()) {
      if (this.evaluateConditions(strategy.conditions, context)) {
        applicable.push(strategy);
      }
    }

    return applicable;
  }

  private evaluateConditions(conditions: StrategyCondition[], context: DecisionContext): boolean {
    return conditions.every(condition => {
      const value = this.getFieldValue(condition.field, context);

      switch (condition.operator) {
        case 'eq':
          return value === condition.value;
        case 'ne':
          return value !== condition.value;
        case 'gt':
          return (value as number) > (condition.value as number);
        case 'lt':
          return (value as number) < (condition.value as number);
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'in':
          return (condition.value as any[]).includes(value);
        default:
          return true;
      }
    });
  }

  private getFieldValue(field: string, context: DecisionContext): any {
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      value = value?.[part];
    }

    return value;
  }

  private async evaluateStrategy(strategy: Strategy, context: DecisionContext): Promise<Strategy> {
    // 可以在这里添加策略评估逻辑
    return strategy;
  }

  private explainSelection(strategy: Strategy, context: DecisionContext): string {
    return `Selected strategy "${strategy.name}" based on matching conditions: ${strategy.conditions.map(c => c.field).join(', ')}`;
  }

  private getDefaultStrategy(): SelectedStrategy {
    const defaultStrategy = this.strategies.get('default');
    if (!defaultStrategy) {
      throw new NoApplicableStrategyError();
    }

    return {
      strategy: defaultStrategy,
      reasoning: 'No specific strategy matched, using default',
      alternatives: []
    };
  }

  async execute(strategy: Strategy, context: DecisionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const execution: StrategyExecution = {
      id: this.generateId(),
      strategyId: strategy.id,
      startTime,
      status: 'running'
    };

    this.history.push(execution);

    try {
      const results: ActionResult[] = [];

      for (const action of strategy.actions) {
        const result = await this.executeAction(action, context);
        results.push(result);

        // 检查超时
        if (strategy.timeout && Date.now() - startTime > strategy.timeout) {
          throw new StrategyTimeoutError(strategy.id);
        }
      }

      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.results = results;

      return {
        success: true,
        results,
        duration: execution.endTime - execution.startTime
      };
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.error = error as Error;

      return {
        success: false,
        error: error as Error,
        results: execution.results || []
      };
    }
  }

  private async executeAction(action: StrategyAction, context: DecisionContext): Promise<ActionResult> {
    // 动作执行逻辑
    return {
      type: action.type,
      parameters: action.parameters,
      success: true,
      output: {}
    };
  }

  async adapt(strategy: Strategy, feedback: ExecutionFeedback): Promise<Strategy> {
    // 策略自适应
    const adapted = { ...strategy };

    // 调整优先级
    if (feedback.success && feedback.score > 0.8) {
      adapted.priority = Math.min(adapted.priority + 1, 10);
    } else if (!feedback.success || feedback.score < 0.5) {
      adapted.priority = Math.max(adapted.priority - 1, 1);
    }

    return adapted;
  }

  private loadStrategies(strategyConfigs: StrategyConfig[]): void {
    for (const config of strategyConfigs) {
      this.strategies.set(config.id, {
        id: config.id,
        name: config.name,
        type: config.type,
        conditions: config.conditions,
        actions: config.actions,
        priority: config.priority,
        timeout: config.timeout
      });
    }
  }

  private generateId(): string {
    return `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## 3. 风险评估器 (Risk Assessor)

风险评估器评估行动方案的潜在风险。

```typescript
// 风险定义
interface Risk {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  probability: number;
  impact: RiskImpact;
  mitigation: string[];
  affectedComponents: string[];
}

type RiskType = 'technical' | 'operational' | 'financial' | 'compliance' | 'reputational';
type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';

interface RiskImpact {
  cost: number;
  time: number;
  quality: number;
  userTrust: number;
}

// 风险评估器
class RiskAssessor {
  private riskModels: Map<RiskType, RiskModel> = new Map();
  private thresholds: RiskThresholds;

  constructor(config: RiskConfig) {
    this.loadRiskModels(config.models);
    this.thresholds = config.thresholds;
  }

  async assess(action: Action, context: DecisionContext): Promise<RiskAssessment> {
    const risks: Risk[] = [];

    // 技术风险
    const technicalRisks = await this.assessTechnicalRisks(action, context);
    risks.push(...technicalRisks);

    // 操作风险
    const operationalRisks = await this.assessOperationalRisks(action, context);
    risks.push(...operationalRisks);

    // 合规风险
    const complianceRisks = await this.assessComplianceRisks(action, context);
    risks.push(...complianceRisks);

    // 计算总体风险评分
    const overallScore = this.calculateOverallRisk(risks);

    // 生成建议
    const recommendations = this.generateRecommendations(risks);

    return {
      overallScore,
      risks,
      isAcceptable: overallScore <= this.thresholds.acceptable,
      recommendations
    };
  }

  private async assessTechnicalRisks(action: Action, context: DecisionContext): Promise<Risk[]> {
    const risks: Risk[] = [];

    // 检查系统可用性
    if (action.type === 'invoke' && action.tool) {
      const toolAvailable = await this.checkToolAvailability(action.tool);
      if (!toolAvailable) {
        risks.push({
          id: this.generateId(),
          type: 'technical',
          severity: 'high',
          probability: 0.8,
          impact: { cost: 0, time: 10, quality: 0.5, userTrust: 0.3 },
          mitigation: ['Use alternative tool', 'Queue request'],
          affectedComponents: [action.tool]
        });
      }
    }

    // 检查资源限制
    if (context.resourceUsage?.memory > 0.9) {
      risks.push({
        id: this.generateId(),
        type: 'technical',
        severity: 'medium',
        probability: 0.6,
        impact: { cost: 0, time: 5, quality: 0.3, userTrust: 0.1 },
        mitigation: ['Reduce batch size', 'Clear cache'],
        affectedComponents: ['memory']
      });
    }

    return risks;
  }

  private async assessOperationalRisks(action: Action, context: DecisionContext): Promise<Risk[]> {
    const risks: Risk[] = [];

    // 检查超时风险
    if (action.parameters.get('timeout') < 1000) {
      risks.push({
        id: this.generateId(),
        type: 'operational',
        severity: 'medium',
        probability: 0.5,
        impact: { cost: 0, time: 3, quality: 0.2, userTrust: 0.1 },
        mitigation: ['Increase timeout', 'Add retry logic'],
        affectedComponents: ['timeout_handler']
      });
    }

    return risks;
  }

  private async assessComplianceRisks(action: Action, context: DecisionContext): Promise<Risk[]> {
    const risks: Risk[] = [];

    // 数据隐私检查
    if (action.type === 'create' && context.containsPII) {
      risks.push({
        id: this.generateId(),
        type: 'compliance',
        severity: 'critical',
        probability: 1.0,
        impact: { cost: 10000, time: 0, quality: 0, userTrust: 0.8 },
        mitigation: ['Encrypt data', 'Apply access control', 'Audit logging'],
        affectedComponents: ['data_storage', 'access_control']
      });
    }

    return risks;
  }

  private calculateOverallRisk(risks: Risk[]): number {
    if (risks.length === 0) return 0;

    // 加权风险评分
    let totalRisk = 0;
    let maxSeverity = 0;

    for (const risk of risks) {
      const severityWeight = this.getSeverityWeight(risk.severity);
      totalRisk += risk.probability * severityWeight;
      maxSeverity = Math.max(maxSeverity, severityWeight);
    }

    // 综合评分
    const avgRisk = totalRisk / risks.length;
    const maxFactor = maxSeverity / 5;

    return Math.min(avgRisk * (1 + maxFactor), 1);
  }

  private getSeverityWeight(severity: RiskSeverity): number {
    switch (severity) {
      case 'critical': return 1.0;
      case 'high': return 0.75;
      case 'medium': return 0.5;
      case 'low': return 0.25;
    }
  }

  private generateRecommendations(risks: Risk[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const risk of risks) {
      if (risk.severity === 'critical' || risk.severity === 'high') {
        for (const mitigation of risk.mitigation) {
          recommendations.push({
            riskId: risk.id,
            action: mitigation,
            priority: risk.severity === 'critical' ? 'immediate' : 'soon'
          });
        }
      }
    }

    return recommendations;
  }

  private async checkToolAvailability(tool: string): Promise<boolean> {
    // 模拟工具可用性检查
    return Math.random() > 0.1;
  }

  private loadRiskModels(models: RiskModelConfig[]): void {
    for (const config of models) {
      this.riskModels.set(config.type, {
        type: config.type,
        factors: config.factors,
        weights: config.weights
      });
    }
  }

  private generateId(): string {
    return `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## 4. 成本优化器 (Cost Optimizer)

成本优化器在保证质量的前提下最小化资源消耗。

```typescript
// 成本模型
interface CostModel {
  tokenCost: number;
  computeCost: number;
  apiCallCost: number;
  storageCost: number;
  timeCost: number;
}

// 成本项
interface CostItem {
  type: CostType;
  amount: number;
  unitCost: number;
  total: number;
}

type CostType = 'tokens' | 'compute' | 'api' | 'storage' | 'time';

// 成本优化器
class CostOptimizer {
  private costModel: CostModel;
  private budgetLimit: number;
  private optimizationTargets: CostType[];

  constructor(config: CostOptimizerConfig) {
    this.costModel = config.costModel;
    this.budgetLimit = config.budgetLimit;
    this.optimizationTargets = config.targets || ['tokens', 'time'];
  }

  async optimize(context: OptimizationContext): Promise<OptimizationResult> {
    const baseline = await this.calculateBaseline(context);

    // 检查是否超出预算
    if (baseline.total > this.budgetLimit) {
      return this.applyOptimizations(context, baseline);
    }

    return {
      accepted: true,
      baseline,
      savings: { total: 0, breakdown: {} },
      recommendations: []
    };
  }

  private async calculateBaseline(context: OptimizationContext): Promise<CostItem[]> {
    const items: CostItem[] = [];

    // Token 成本
    const tokenCost = this.calculateTokenCost(context);
    items.push(tokenCost);

    // 计算成本
    const computeCost = this.calculateComputeCost(context);
    items.push(computeCost);

    // API 调用成本
    const apiCost = this.calculateAPICost(context);
    items.push(apiCost);

    // 存储成本
    const storageCost = this.calculateStorageCost(context);
    items.push(storageCost);

    // 时间成本
    const timeCost = this.calculateTimeCost(context);
    items.push(timeCost);

    return items;
  }

  private calculateTokenCost(context: OptimizationContext): CostItem {
    const inputTokens = context.inputTokens || 0;
    const outputTokens = context.outputTokens || 0;

    const total = (inputTokens * this.costModel.tokenCost) +
      (outputTokens * this.costModel.tokenCost * 2);

    return {
      type: 'tokens',
      amount: inputTokens + outputTokens,
      unitCost: this.costModel.tokenCost,
      total
    };
  }

  private calculateComputeCost(context: OptimizationContext): CostItem {
    const computeUnits = context.computeUnits || 1;
    const duration = context.estimatedDuration || 1;

    const total = computeUnits * duration * this.costModel.computeCost;

    return {
      type: 'compute',
      amount: computeUnits * duration,
      unitCost: this.costModel.computeCost,
      total
    };
  }

  private calculateAPICost(context: OptimizationContext): CostItem {
    const apiCalls = context.apiCalls || 0;

    return {
      type: 'api',
      amount: apiCalls,
      unitCost: this.costModel.apiCallCost,
      total: apiCalls * this.costModel.apiCallCost
    };
  }

  private calculateStorageCost(context: OptimizationContext): CostItem {
    const storageUnits = context.storageUsage || 0;

    return {
      type: 'storage',
      amount: storageUnits,
      unitCost: this.costModel.storageCost,
      total: storageUnits * this.costModel.storageCost
    };
  }

  private calculateTimeCost(context: OptimizationContext): CostItem {
    const duration = context.estimatedDuration || 0;

    return {
      type: 'time',
      amount: duration,
      unitCost: this.costModel.timeCost,
      total: duration * this.costModel.timeCost
    };
  }

  private async applyOptimizations(
    context: OptimizationContext,
    baseline: CostItem[]
  ): Promise<OptimizationResult> {
    const optimizations: Optimization[] = [];
    let totalSavings = 0;
    const breakdown: Record<CostType, number> = {
      tokens: 0,
      compute: 0,
      api: 0,
      storage: 0,
      time: 0
    };

    // Token 优化
    if (this.optimizationTargets.includes('tokens')) {
      const tokenOpt = this.optimizeTokens(context);
      optimizations.push(tokenOpt);
      breakdown.tokens = tokenOpt.savings;
      totalSavings += tokenOpt.savings;
    }

    // 时间优化
    if (this.optimizationTargets.includes('time')) {
      const timeOpt = this.optimizeTime(context);
      optimizations.push(timeOpt);
      breakdown.time = timeOpt.savings;
      totalSavings += timeOpt.savings;
    }

    // API 调用优化
    if (this.optimizationTargets.includes('api')) {
      const apiOpt = this.optimizeAPICalls(context);
      optimizations.push(apiOpt);
      breakdown.api = apiOpt.savings;
      totalSavings += apiOpt.savings;
    }

    const baselineTotal = baseline.reduce((sum, item) => sum + item.total, 0);
    const newTotal = baselineTotal - totalSavings;

    return {
      accepted: newTotal <= this.budgetLimit,
      baseline: baseline,
      savings: { total: totalSavings, breakdown },
      recommendations: optimizations.map(o => o.recommendation)
    };
  }

  private optimizeTokens(context: OptimizationContext): Optimization {
    const currentTokens = (context.inputTokens || 0) + (context.outputTokens || 0);
    let savings = 0;
    let recommendation = '';

    // 检查是否可以压缩
    if (currentTokens > 1000) {
      const compressionRatio = 0.7; // 假设可以压缩30%
      savings = currentTokens * (1 - compressionRatio) * this.costModel.tokenCost;
      recommendation = 'Apply context compression to reduce token usage by ~30%';
    }

    return {
      type: 'token_compression',
      savings,
      recommendation
    };
  }

  private optimizeTime(context: OptimizationContext): Optimization {
    const currentDuration = context.estimatedDuration || 0;
    let savings = 0;
    let recommendation = '';

    if (currentDuration > 5000) {
      const speedupRatio = 0.8; // 假设可以提速20%
      savings = currentDuration * (1 - speedupRatio) * this.costModel.timeCost;
      recommendation = 'Enable parallel execution to reduce duration by ~20%';
    }

    return {
      type: 'parallel_execution',
      savings,
      recommendation
    };
  }

  private optimizeAPICalls(context: OptimizationContext): Optimization {
    const currentCalls = context.apiCalls || 0;
    let savings = 0;
    let recommendation = '';

    if (currentCalls > 5) {
      const batchRatio = 0.5; // 假设可以批量减少50%调用
      const reducedCalls = currentCalls * (1 - batchRatio);
      savings = reducedCalls * this.costModel.apiCallCost;
      recommendation = 'Batch API calls to reduce call count by ~50%';
    }

    return {
      type: 'api_batching',
      savings,
      recommendation
    };
  }

  async estimateCost(action: Action, context: DecisionContext): Promise<number> {
    // 快速成本估算
    let estimate = 0;

    if (action.type === 'invoke') {
      estimate += this.costModel.apiCallCost;
    }

    if (action.parameters.get('model')) {
      // 添加模型相关成本
      estimate += this.costModel.tokenCost * 1000;
    }

    return estimate;
  }
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Model Context Protocol 文档](https://modelcontextprotocol.io/) | 决策层要接入多种模型与工具，MCP 是当前事实标准协议，先读官方定义。 | 读 Introduction 并跑通 quickstart，明确客户端与服务器职责边界；读完画出决策层的调用链，标出模型选择落点。 |
| [Component Model 文档](https://component-model.bytecodealliance.org/) | 用 WIT 定义策略接口，让模型选择器与策略引擎解耦、可替换。 | 重点读设计与接口类型两节，带着“策略插件如何声明输入输出”的问题读，读完为一条策略写出接口草案。 |
| [Component Model 规范仓库](https://github.com/WebAssembly/component-model) | 规范仓库能看清组件模型提案的边界与限制，避免选型踩坑。 | 浏览设计文档目录，只读与沙箱、资源限制相关的提案，判断当前成熟度是否支撑线上策略隔离。 |
| [PWA example threat model](https://developer.mozilla.org/en-US/docs/Web/Security/Threat_modeling/PWA_threat_model) | 给出威胁建模的标准提问框架，可直接迁移到决策层的风险评估器设计。 | 读威胁清单的组织方式，带着“决策层会被谁滥用”的问题读，读完列出本页的四类资产与对应威胁。 |
| [Example threat model](https://developer.mozilla.org/en-US/docs/Web/Security/Threat_modeling/Example_threat_model) | 一份完整威胁建模范例，比抽象方法更容易照抄落地。 | 逐条对照示例填写自己的威胁表，标出高风险项与缓解措施，作为风险评估器的规则初稿。 |
| [JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model) | 策略在宿主执行，理解执行模型才能评估同步阻塞与时序风险。 | 读执行上下文与 job queue 部分，分析策略回调的调度时机与阻塞点，读完给出超时与降级方案。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Build a Large Language Model (From Scratch)（Manning）](https://www.manning.com/books/build-a-large-language-model-from-scratch) | 亲手实现一遍模型，才能对参数量、显存与推理成本有准确直觉。 | 配合代码仓库逐章运行，重点看注意力与生成循环，读完估算不同规模模型的延迟与单位成本。 |
| [Component Model：JavaScript](https://component-model.bytecodealliance.org/language-support/javascript.html) | 最短路径把 JS 编译成组件，验证策略插件能否安全热插拔。 | 照文档编译一段 JS 为组件并加载运行，观察能力受限情况，读完决定策略引擎的沙箱形态。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [The Cost of JavaScript 2019](https://v8.dev/blog/cost-of-javascript-2019) | 讲透“字节相同但代价不同”，是成本优化器建立度量意识的好入口。 | 读完回答为何 JS 比同体积图片更贵，并把这套解析、执行、内存三段成本模型套到决策层调用上。 |
| [Richardson Maturity Model（Martin Fowler）](https://martinfowler.com/articles/richardsonMaturityModel.html) | 用成熟度分级审视接口设计，可迁移为策略引擎的分层演进路线。 | 读完判断当前策略接口处于第几级，写出升一级需要改什么，作为策略引擎的迭代清单。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格批量标注 | 策略引擎分流、模型选择器、成本优化器 | 决策表规则引擎、模型路由网关、结果缓存 | 规则命中率下降时要能整体回退到全量模型 |
| 低端安卓应用首屏加载 | 模型选择器（端云分流）、成本优化器 | 端侧小模型、缓存直出、A/B 实验平台 | 端侧模型体积要计入安装包预算 |
| 多人协作白板的笔迹冲突合并 | 策略引擎、风险评估器 | CRDT 或 OT 引擎、同步网关 | 强制服务端裁定会抬高操作确认延迟 |
| 电商客服自动回复的排队调度 | 风险评估器、成本优化器 | 优先级队列、限流器、人工兜底通道 | 高风险工单不得由系统自动关闭 |
| 发票 OCR 的批量入账 | 策略引擎、风险评估器 | OCR 服务、金额规则校验、双人复核 | 金额超阈值时强制转人工，不做自动过账 |
| 车载语音助手的唤醒响应 | 模型选择器（本地或云端）、成本优化器 | 端侧唤醒词、联网判定、降级话术 | 断网时必须存在本地可执行动作 |
| 大促期间的推荐结果预取 | 成本优化器、风险评估器 | 预取队列、缓存预热、熔断器 | 预取失败不能阻塞主链路的下发 |
| 跨区域内网的文件同步调度 | 策略引擎、成本优化器 | 带宽预算、时间窗、断点续传 | 限速策略要支持热更新，避免重启同步进程 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格批量标注

**业务背景**：运营后台一次导出上万行订单，需要逐行给出风险等级与处理建议。人工逐行判读在该量级下无法在当次操作内完成，接口整体耗时预算按秒计。

**怎么用本页知识解决**：思路是先让零成本的规则把绝大多数行分流出去，只把规则未覆盖或高风险的行交给模型选择器，最后由成本优化器合并批次。下面是与框架无关的伪代码，函数名按本页四个组件命名。

```python
# 决策层入口：输入认知层给出的行特征与置信度，输出可执行计划
def decide(rows, budget_ms=3000, budget_yuan=0.5):
    plan = {"auto": [], "escalate": [], "manual": []}
    for row in rows:
        # 策略引擎先走零成本规则，命中即分流，不占用模型预算
        rule = strategy_engine.match(row)          # 返回 None 表示规则未覆盖
        if rule and rule.confidence >= 0.9:
            plan["auto"].append((row.id, rule.action))
            continue
        # 风险评估器给自动执行设门槛：可逆性加金额双条件
        if risk_assessor.is_reversible(row) and row.amount < 200:
            plan["auto"].append((row.id, "标记待复核"))
            continue
        # 未覆盖或高风险的行进入模型选择器，按行特征与剩余预算选档
        model = model_selector.pick(row.features, budget_yuan)
        plan["escalate"].append((row.id, model))
    # 成本优化器把同档模型的行合并成批次，降低调用次数
    return cost_optimizer.batch(plan, budget_ms, budget_yuan)
```

- 规则放在最前，是因为它的单位成本为零，命中一行就省下一行模型预算。
- 风险评估器只回答“这一步能不能自动做”，不参与选模型，职责分开便于单独调整阈值。
- 模型选择器接收剩余预算作为入参，预算耗尽时自动把剩余行落入 manual 桶。
- 成本优化器做的是合并同档请求，它不改变每行的策略结论，只改变执行方式。
- 三个桶（auto、escalate、manual）分别落库，便于事后按桶核对准确率。

**怎么度量收益**：看规则命中率、模型调用次数、决策链路 P95 耗时、每千行模型成本、人工复核率五项。用 OpenTelemetry 打点，落到 Prometheus 后用 Grafana 出图；离线用固定的一万行样本集回放同一批数据，比较改动前后的调用次数。

**什么时候不该用**：行数在几十行、人工一次就能看完时，搭建决策链路的维护成本高于收益。业务要求逐行人工签字确认时，自动分流不满足合规前提。

#### 场景 2：低端安卓应用的首屏加载

**业务背景**：同一份首屏代码要覆盖内存 2GB 档与 8GB 档两类设备，低端机在弱网下长时间白屏。首屏耗时的目标线由发布前的基准测试确定，测法可复现。

**怎么用本页知识解决**：把首屏内容装配当成一次决策，输入是设备档位、网络状态与缓存年龄，输出是渲染路径。低端机弱网直接走缓存，中高配机才启用端侧排序。

```kotlin
// 首屏装配决策：按设备档位与网络状态选择渲染路径，预算 800ms
fun decideFirstScreen(device: DeviceProfile, net: NetState): Plan {
    // 策略引擎先判定低端机加弱网，直接走缓存直出，不发起网络请求
    if (device.ramMb < 2048 && net.rttMs > 300) return Plan.CacheOnly
    // 风险评估器：缓存超过 10 分钟不允许直出，避免展示过期内容
    if (cache.ageMinutes > 10) return Plan.CloudRank
    // 成本优化器：端侧打分占用 CPU，只在非低端且非省电模式启用
    if (device.ramMb >= 4096 && !device.isLowPowerMode) return Plan.LocalRank
    return Plan.CacheThenRefresh   // 先出缓存，再异步替换为新结果
}
```

- 第一条判断把最差的设备组合挡在网络请求之前，这是首屏耗时收益的主要来源。
- 缓存年龄阈值属于风险判断，改这个阈值应走独立配置，不与设备判断混在一起。
- 端侧打分只在内存与省电两个条件都满足时启用，避免挤占主线程。
- CacheThenRefresh 是默认分支，它保证任何未命中的情况都有内容可渲染。

**怎么度量收益**：用 Android Macrobenchmark 测 timeToInitialDisplay，用 Firebase Performance 看线上首屏耗时分布。重点看 P90 首屏耗时、缓存直出率、内容过期投诉率三项，前两项下降而第三项上升说明阈值设得太松。

**什么时候不该用**：高端机型且网络稳定的用户群，多分支只会增加维护面。余额、行情一类要求强一致的内容，不允许直出旧缓存。

#### 场景 3：多人协作白板的笔迹冲突合并

**业务背景**：一块白板上多人同时绘制与擦除，网络抖动时本地操作会出现先后顺序不一致。冲突表现为撤回或笔迹跳动，用户感知为“画上去又没了”。

**怎么用本页知识解决**：为每个操作单独选合并策略与同步通道。可交换的增量图元本地先行，涉及他人内容或删除的操作等服务器裁定。

```ts
// 协作决策层：为每个操作选择合并策略与同步通道
function decideOp(op: Op, ctx: SessionCtx): Decision {
  // 策略引擎按操作类型分流：纯增量绘制可本地先行，等待异步确认
  if (op.type === "draw" && op.isCommutative) {
    return { merge: "crdt", channel: "websocket", ack: "async" };
  }
  // 风险评估器：删除或改动他人图元会与他人意图冲突，必须服务端裁定
  if (op.type === "delete" || op.targetOwner !== ctx.userId) {
    return { merge: "server", channel: "websocket", ack: "sync" };
  }
  // 成本优化器：断线时降级为本地队列，恢复后批量补发，不逐条重试
  if (ctx.offline) return { merge: "crdt", channel: "queue", ack: "async" };
  return { merge: "server", channel: "websocket", ack: "sync" };
}
```

- 判断可交换性是分流的依据，不可交换的操作本地先行必然产生回滚。
- 涉及他人图元时提高到同步确认，用延迟换正确性，这类操作占比低所以可接受。
- 断线分支走队列而不是重试，避免恢复瞬间向服务端打出请求尖峰。
- 三个返回值的 ack 字段决定 UI 是否显示“待确认”标记，前端据此给出即时反馈。

**怎么度量收益**：看操作确认 P95 延迟、冲突回滚次数、离线补发成功率三项。收敛性用日志回放验证：把同一段操作日志按不同顺序重放，比对最终文档的哈希值是否一致。

**什么时候不该用**：单人会话或只读分享场景，决策分支全部走默认值即可。表单字段锁定一类强顺序操作，本地先行会产生难以解释的状态回退。

### 行业先进实践

错误预算驱动的发布冻结（出处：Google SRE Book）。做法是把可用性目标折算成一段时间内允许的失败额度，额度耗尽时暂停功能发布，只允许修复类变更。它把“要不要发”从主观判断变成可计算的判断，与风险评估器的阈值设计同源。借鉴方式是先给决策链路定一个可观测的失败额度，再把额度消耗接入发布流程。

舱壁隔离与熔断降级（出处：Envoy 官方文档的 Outlier detection 章节、resilience4j 开源项目）。做法是把不同依赖拆到独立资源池，单个依赖连续失败时把它从可用集合中摘除，过一段时间再试探恢复。它限制故障半径，让一个模型供应商的超时不影响整条决策链。借鉴方式是给每个模型档位配置独立的并发上限与熔断阈值，而不是共用一个连接池。

功能开关做渐进放量（出处：OpenFeature 规范）。做法是把新逻辑藏在开关后，按用户比例或属性分批放量，异常时关闭开关即回退。它把回退成本从重新发版降到改一次配置。借鉴方式是把决策层的每条新规则都包在开关里，并记录开关状态与决策结果的对应关系。

Shuffle sharding 缩小故障影响面（出处：Amazon Builders' Library）。做法是把请求按标识哈希分配到多个小分片组合，而不是随机打到全量节点。两个请求撞进同一分片的概率很低，单点故障只影响少量用户。借鉴方式是在决策层做模型路由时，让同一租户稳定落在同一档位，避免同租户在档位之间反复跳变。

模型级联的降本做法（出处：需核对官方文档：核对 FrugalGPT 一类级联策略的公开评测口径与各家网关的级联实现文档）。做法是先用小模型给出结果与置信度，只在低置信区间调用大模型。它与本页模型选择器的差别在于级联是串行判断，选择器是并行打分。借鉴前需核对官方文档中的评测条件，确认与自己的任务分布可比。

### 从学到用：落地路线

第 1 步：选一条调用量大、失败可容忍的链路接入决策层，例如后台批量标注。验收标准是该链路的决策结果可落库、可按请求 ID 追溯。

第 2 步：用固定样本集回放，对比接入前后的调用次数、P95 耗时与准确率。验收标准是三项指标都有可复现的测量脚本，且准确率下降不超过预设阈值。

第 3 步：把决策配置抽成可热更新的形式，在两条以上链路复用同一套规则与阈值。验收标准是改一次配置能在不发版的情况下生效，且变更记录可查。

第 4 步：为每条规则设置开关与回退路径，把规则命中率和失败率接入告警。验收标准是任一条规则关闭后链路仍能返回结果，且告警能在阈值触发时通知到人。

### 动手作业

目标：为一个批量文本分类接口实现最小决策层，覆盖规则分流、模型选档、风险门槛、成本预算四个环节。

步骤：

1. 造一份 500 条带标注的样本集，字段包含文本、真实标签、金额或重要性分值。
2. 写规则分流函数，用关键词与长度两个条件命中一部分样本，记录命中率。
3. 为未命中的样本实现两档模型选择，一档用小模型、一档用大模型，接口用假实现，延迟用随机数加固定值模拟。
4. 加入风险评估器，规定分值超过阈值的样本不走自动路径。
5. 加入成本优化器，按剩余预算把同档请求合并成批次，预算耗尽时输出降级结果。
6. 用样本集回放，记录调用次数、总耗时、准确率三项，并与“全量走大模型”的基线对比。
7. 把四个环节的阈值写进配置文件，改配置重跑一次，确认结果随之变化。

验收标准：

- 500 条样本在预算未耗尽时全部返回结果，无异常中断。
- 输出报告包含规则命中率、各档调用次数、准确率、总耗时四个数字。
- 把预算调低一半后，大模型调用次数下降，且降级路径的结果条数上升。
- 关闭任一环节的开关后程序仍能跑完，输出结果条数不变。
- 用同一份样本集连续跑两次，四项指标完全一致。

