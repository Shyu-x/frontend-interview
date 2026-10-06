---
title: 工具编排：混合与选择策略
description: 混合编排模式与工具选择策略。
tags:
  - ai-agent
  - tools
date: 2026-05-17
---

# 工具编排：混合与选择策略

> 本文是「工具编排」系列第 2 篇（共 3 篇）。上一篇：[工具编排：并行与串行](tool-orchestration-basics.md)　下一篇：[工具编排：实现与高级话题](tool-orchestration-implementation.md)

## 1. 混合编排

### 1.1 分阶段执行

将复杂任务分解为多个阶段，每个阶段内部并行，阶段之间串行。

```python
from typing import List, Dict, Any, Callable, Optional
from dataclasses import dataclass, field
from enum import Enum

class StageType(Enum):
    PARALLEL = "parallel"
    SEQUENTIAL = "sequential"
    CONDITIONAL = "conditional"

@dataclass
class Stage:
    """执行阶段"""
    name: str
    stage_type: StageType
    tools: List[Callable]
    dependencies: List[str] = field(default_factory=list)
    on_success: Optional[str] = None  # 下个阶段名称
    on_failure: Optional[str] = None

@dataclass
class StageResult:
    """阶段结果"""
    stage_name: str
    success: bool
    results: List[ExecutionResult] = field(default_factory=list)
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class PhasedOrchestrator:
    """分阶段编排器"""

    def __init__(self):
        self.stages: Dict[str, Stage] = {}
        self.current_phase: str = "init"
        self.stage_results: Dict[str, StageResult] = {}

    def add_stage(self, stage: Stage):
        self.stages[stage.name] = stage

    def execute(self) -> Dict[str, StageResult]:
        """执行所有阶段"""
        # 找到起始阶段
        start_stage = self._find_start_stage()

        current_stage_name = start_stage

        while current_stage_name:
            stage = self.stages[current_stage_name]
            result = self._execute_stage(stage)

            self.stage_results[current_stage_name] = result

            # 根据结果决定下一个阶段
            if result.success and stage.on_success:
                current_stage_name = stage.on_success
            elif not result.success and stage.on_failure:
                current_stage_name = stage.on_failure
            else:
                # 按顺序找下一个阶段
                current_stage_name = self._find_next_stage(current_stage_name)

        return self.stage_results

    def _execute_stage(self, stage: Stage) -> StageResult:
        """执行单个阶段"""
        # 检查依赖阶段是否完成
        for dep_name in stage.dependencies:
            if dep_name not in self.stage_results:
                return StageResult(
                    stage_name=stage.name,
                    success=False,
                    error=f"Dependency {dep_name} not completed"
                )

        # 根据阶段类型执行
        if stage.stage_type == StageType.PARALLEL:
            return self._execute_parallel_stage(stage)
        elif stage.stage_type == StageType.SEQUENTIAL:
            return self._execute_sequential_stage(stage)
        elif stage.stage_type == StageType.CONDITIONAL:
            return self._execute_conditional_stage(stage)

    def _execute_parallel_stage(self, stage: Stage) -> StageResult:
        """并行执行阶段"""
        executor = ParallelExecutor(max_workers=len(stage.tools))

        # 准备输入
        inputs = [
            self._prepare_inputs(stage, result)
            for result in self.stage_results.values()
        ]

        try:
            results = executor.execute_parallel(stage.tools, inputs)
            return StageResult(
                stage_name=stage.name,
                success=True,
                results=results,
                output=self._aggregate_results(results)
            )
        except Exception as e:
            return StageResult(
                stage_name=stage.name,
                success=False,
                error=str(e)
            )

    def _execute_sequential_stage(self, stage: Stage) -> StageResult:
        """串行执行阶段"""
        results = []
        context = {}

        for tool in stage.tools:
            try:
                # 从上下文准备输入
                input_data = self._prepare_context_inputs(context, stage)
                result = tool(input_data)
                results.append(ExecutionResult(
                    tool_id=str(id(tool)),
                    success=True,
                    data=result
                ))
                context.update(result if isinstance(result, dict) else {"result": result})
            except Exception as e:
                results.append(ExecutionResult(
                    tool_id=str(id(tool)),
                    success=False,
                    error=str(e)
                ))

        return StageResult(
            stage_name=stage.name,
            success=all(r.success for r in results),
            results=results,
            output=context
        )

    def _execute_conditional_stage(self, stage: Stage) -> StageResult:
        """条件执行阶段"""
        # 基于前面阶段的结果决定执行哪个工具
        condition_results = self.stage_results.get(stage.dependencies[-1])

        if condition_results and condition_results.output:
            condition_value = condition_results.output.get("condition", "default")

            # 根据条件选择工具
            if condition_value == "option_a":
                selected_tools = stage.tools[:len(stage.tools)//2]
            else:
                selected_tools = stage.tools[len(stage.tools)//2:]
        else:
            selected_tools = stage.tools

        executor = ParallelExecutor()
        results = executor.execute_parallel(selected_tools, [{}] * len(selected_tools))

        return StageResult(
            stage_name=stage.name,
            success=any(r.success for r in results),
            results=results
        )

    def _prepare_inputs(self, stage: Stage, prev_result: StageResult) -> Dict[str, Any]:
        """准备阶段输入"""
        return {"data": prev_result.output}

    def _prepare_context_inputs(self, context: Dict, stage: Stage) -> Dict[str, Any]:
        """准备上下文输入"""
        return context

    def _aggregate_results(self, results: List[ExecutionResult]) -> Dict[str, Any]:
        """聚合结果"""
        aggregator = ResultAggregator(AggregationStrategy.MERGE)
        return aggregator.aggregate(results)

    def _find_start_stage(self) -> Optional[str]:
        """找到起始阶段"""
        stage_names = set(self.stages.keys())
        for stage in self.stages.values():
            stage_names -= set(stage.dependencies)
        return next(iter(stage_names)) if stage_names else None

    def _find_next_stage(self, current: str) -> Optional[str]:
        """找到下一个阶段"""
        for name, stage in self.stages.items():
            if current in stage.dependencies:
                return name
        return None
```

### 1.2 动态编排

根据执行结果动态调整后续执行计划。

```python
# 第 1 段：导入与"决策"数据契约（把一次调度判断固化成可传递的对象）
# 说明：本片段假定 Stage / StageResult 由文件其余部分或调用方提供，
# 它们需暴露 .name / .success / .output / .error 这几个字段，否则后续引用会在运行期报 AttributeError。
# 用 dataclass 而非裸 dict 承载 Decision：字段拼写错误能在实例化时立刻暴露，也便于静态检查。
from typing import Any, Dict, List, Callable, Optional, Type
from dataclasses import dataclass, field

@dataclass
class Decision:
    """执行决策"""
    action: str  # "continue", "retry", "skip", "fallback", "abort"
    target: Optional[str] = None  # 决策作用对象（阶段名/处理器名）；None 表示"不指名"
    parameters: Dict[str, Any] = field(default_factory=dict)  # 必须用 default_factory：可变默认值会被所有实例共享，是经典陷阱

# 第 2 段：规划器状态与注册接口（把"策略"与"执行"解耦，由外部注入规则与兜底）
# 设计意图：DynamicPlanner 本身不写死任何业务判断，rules/fallback_handlers 都是运行期可增删的策略槽位，
# 因此同一套执行骨架能适配不同流程，测试时也只需替换规则函数。
class DynamicPlanner:
    """动态规划器"""

    def __init__(self):
        # rules 是"按顺序短路求值"的判定链；fallback_handlers 以阶段名为键做 O(1) 兜底查找
        self.rules: List[Callable[[Dict[str, Any]], Decision]] = []
        self.fallback_handlers: Dict[str, Callable] = {}

    def add_rule(self, rule: Callable[[Dict[str, Any]], Decision]):
        # 只追加、不排序：注册顺序即优先级，先注册的规则先被询问
        self.rules.append(rule)

    def add_fallback(self, stage_name: str, handler: Callable):
        # 同一阶段名重复注册会静默覆盖，后注册者生效（无告警，属于易错点）
        self.fallback_handlers[stage_name] = handler

    # 第 3 段：规则引擎 decide（顺序询问，首个"真值"决策胜出）
    # 关键机制：decide 恒返回 Decision 实例，故 `if decision` 永远为真——
    # 只要有规则返回对象就不会继续问后面的规则，规则顺序直接决定语义；
    # 若想让某条规则"不表态"，必须显式 return None。
    # 复杂度 O(k)，k 为规则数，每次决策都从头线性扫描。
    def decide(self, context: Dict[str, Any]) -> Decision:
        """基于规则做出决策"""
        for rule in self.rules:
            decision = rule(context)
            if decision:
                return decision

        return Decision(action="continue")  # 无规则命中时的安全默认：不改变控制流，让流程照常前进

    # 第 4 段：执行循环的初始化（拷贝上下文、准备结果表与游标）
    # context 用浅拷贝隔离调用方入参；但嵌套的可变对象仍是共享引用，
    # 若阶段内部改动嵌套结构，仍会"泄漏"回原始 dict，需要强隔离时应改用 copy.deepcopy。
    def execute_dynamic(
        self,
        plan: List[Stage],
        initial_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """动态执行计划"""
        context = initial_context.copy()
        results = {}
        i = 0  # 手动游标而非 for 循环：retry 需要"原地不动"，for 的隐式自增无法表达这种控制流

        # 第 5 段：主循环——成功路径与上下文回填
        # 数据流：阶段成功 => 结果按 name 存入 results，同时以 "<stage>_result" 写回 context，
        # 后续阶段的规则函数与兜底处理器即可读到前序产出，形成可传递的上下文链。
        while i < len(plan):
            stage = plan[i]

            # 尝试执行阶段
            try:
                stage_result = self._execute_stage_with_fallback(stage, context)

                if stage_result.success:
                    results[stage.name] = stage_result
                    context[f"{stage.name}_result"] = stage_result.output
                    i += 1  # 仅在成功时推进游标，保证游标语义是"已提交的阶段数"

                else:
                    # 第 6 段：阶段返回失败（success=False）时，交由规则引擎决定下一步
                    # 先用 **context 展开再做增量合并：规则能看到完整上下文，外加 stage/result/error 三个定位线索。
                    # 注意合并方向——外部键会覆盖 context 中的同名键，规则若依赖影子字段需自行规避命名冲突。
                    decision = self.decide({
                        **context,
                        "stage": stage.name,
                        "result": stage_result,
                        "error": stage_result.error
                    })

                    if decision.action == "retry":
                        # 重试：i 不变，重新执行同一阶段。若规则恒返回 retry 且无外部状态变化，
                        # 这里会死循环——实践中必须配合重试计数或指数退避。
                        continue
                    elif decision.action == "skip":
                        # 跳过：仍把失败结果记入 results（保留可观测性），并用 "<stage>_skipped" 打标记，
                        # 让下游规则能区分"没跑过"和"跑了但跳过"。
                        results[stage.name] = stage_result
                        context[f"{stage.name}_skipped"] = True
                        i += 1
                    elif decision.action == "fallback":
                        # 使用备选方案：此处约定 handler 的返回值是"新的 context"整体替换旧值；
                        # 若处理器无返回值，context 会变成 None，导致后续 `**context` 直接抛 TypeError。
                        fallback = self.fallback_handlers.get(stage.name)
                        if fallback:
                            context = fallback(context)
                        i += 1  # 无论兜底是否真的存在，都推进游标——缺失兜底会被静默放过
                    elif decision.action == "abort":
                        break  # 立即终止，i 停在当前失败阶段，便于外部定位卡点

            # 第 7 段：异常兜底（阶段直接抛错，连 StageResult 都拿不到）
            # 与第 6 段互斥：这里是"崩溃"，那里是"正常返回了失败结果"。
            # 该分支只识别 continue，其他动作一律 break，因此 retry/skip/fallback 在这条路径上等价于中止。
            except Exception as e:
                decision = self.decide({
                    **context,
                    "stage": stage.name,
                    "exception": e
                })

                if decision.action == "continue":
                    i += 1  # 显式认定"这个异常可以忽略"，才继续下一阶段
                else:
                    break

        # 第 8 段：收尾——一次性返回三类产出
        # final_index 是语义核心：它等于"已提交的阶段数"，可用于断点续跑；
        # break 退出时指向未完成的阶段，循环自然走完时等于 len(plan)。
        return {"results": results, "context": context, "final_index": i}

    # 第 9 段：单阶段执行 + 异常兜底包装
    # 易错点：这里复用了同一个 fallback_handlers，但协议与第 6 段不同——
    # 此处 handler 必须返回 StageResult，而第 6 段要求它返回新的 context。
    # 一个注册表承载两种返回值约定，是这段代码最容易误用的地方。
    def _execute_stage_with_fallback(
        self,
        stage: Stage,
        context: Dict[str, Any]
    ) -> StageResult:
        """执行阶段，支持回退"""
        try:
            return self._execute_stage(stage, context)
        except Exception as e:
            fallback = self.fallback_handlers.get(stage.name)
            if fallback:
                return fallback(context)
            raise  # 无兜底就原样上抛，交给第 7 段的异常分支决策，绝不静默吞掉错误
```
### 1.3 自适应策略

根据系统状态和执行历史动态调整策略。

```python
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import time

class ExecutionMode(Enum):
    CONSERVATIVE = "conservative"
    AGGRESSIVE = "aggressive"
    BALANCED = "balanced"

@dataclass
class PerformanceMetrics:
    """性能指标"""
    success_rate: float = 0.0
    avg_execution_time: float = 0.0
    error_count: int = 0
    cache_hit_rate: float = 0.0
    parallel_efficiency: float = 0.0

class AdaptiveStrategy:
    """自适应策略"""

    def __init__(self):
        self.metrics = PerformanceMetrics()
        self.execution_history: List[Dict[str, Any]] = []
        self.current_mode = ExecutionMode.BALANCED

        # 阈值配置
        self.thresholds = {
            "success_rate_low": 0.7,
            "success_rate_high": 0.95,
            "execution_time_high": 5.0,
            "error_rate_high": 0.3
        }

    def record_execution(self, execution_data: Dict[str, Any]):
        """记录执行数据"""
        self.execution_history.append({
            **execution_data,
            "timestamp": time.time()
        })

        # 只保留最近100条
        if len(self.execution_history) > 100:
            self.execution_history.pop(0)

        self._update_metrics()

    def _update_metrics(self):
        """更新性能指标"""
        if not self.execution_history:
            return

        recent = self.execution_history[-20:]  # 最近20次

        success_count = sum(1 for e in recent if e.get("success", False))
        self.metrics.success_rate = success_count / len(recent)

        exec_times = [e.get("execution_time", 0) for e in recent]
        self.metrics.avg_execution_time = sum(exec_times) / len(exec_times)

        self.metrics.error_count = sum(1 for e in recent if not e.get("success", False))

    def get_current_strategy(self) -> Dict[str, Any]:
        """获取当前策略配置"""
        self._adjust_mode()

        strategies = {
            ExecutionMode.CONSERVATIVE: {
                "max_parallel": 2,
                "timeout": 60,
                "retry_count": 5,
                "cache_enabled": True,
                "validation_enabled": True
            },
            ExecutionMode.BALANCED: {
                "max_parallel": 4,
                "timeout": 30,
                "retry_count": 3,
                "cache_enabled": True,
                "validation_enabled": False
            },
            ExecutionMode.AGGRESSIVE: {
                "max_parallel": 8,
                "timeout": 15,
                "retry_count": 1,
                "cache_enabled": False,
                "validation_enabled": False
            }
        }

        return strategies[self.current_mode]

    def _adjust_mode(self):
        """根据指标调整模式"""
        if self.metrics.success_rate < self.thresholds["success_rate_low"]:
            # 切换到保守模式
            self.current_mode = ExecutionMode.CONSERVATIVE
        elif self.metrics.success_rate > self.thresholds["success_rate_high"]:
            # 可以切换到激进模式
            if self.metrics.avg_execution_time < self.thresholds["execution_time_high"]:
                self.current_mode = ExecutionMode.AGGRESSIVE
        else:
            self.current_mode = ExecutionMode.BALANCED

    def should_use_parallel(self) -> bool:
        """判断是否应使用并行执行"""
        if self.current_mode == ExecutionMode.CONSERVATIVE:
            return len(self.execution_history) < 5  # 只有在稳定后才并行
        return self.metrics.success_rate > 0.8

    def should_enable_validation(self) -> bool:
        """判断是否应启用验证"""
        return (
            self.metrics.success_rate < self.thresholds["success_rate_high"] or
            self.current_mode == ExecutionMode.CONSERVATIVE
        )

class AdaptiveOrchestrator:
    """自适应编排器"""

    def __init__(self):
        self.strategy = AdaptiveStrategy()
        self.base_orchestrator = PhasedOrchestrator()

    def execute(self, plan: List[Stage], context: Dict[str, Any]) -> Dict[str, Any]:
        """自适应执行"""
        start_time = time.time()

        # 获取当前策略
        current_strategy = self.strategy.get_current_strategy()

        # 根据策略调整执行器
        self.base_orchestrator = self._configure_orchestrator(current_strategy)

        try:
            results = self.base_orchestrator.execute(plan, context)

            # 记录执行数据
            execution_time = time.time() - start_time
            success = all(r.success for r in results.values() if hasattr(r, 'success'))

            self.strategy.record_execution({
                "success": success,
                "execution_time": execution_time,
                "strategy": current_strategy
            })

            return results

        except Exception as e:
            self.strategy.record_execution({
                "success": False,
                "execution_time": time.time() - start_time,
                "error": str(e)
            })
            raise

    def _configure_orchestrator(self, strategy: Dict[str, Any]):
        """根据策略配置编排器"""
        orchestrator = PhasedOrchestrator()

        # 配置并行执行器
        max_workers = strategy.get("max_parallel", 4)
        # ... 其他配置

        return orchestrator
```

## 2. 工具选择策略

### 2.1 模型驱动的工具选择

利用 LLM 的推理能力选择合适的工具。

```python
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass
from openai import OpenAI
import json

@dataclass
class Tool:
    """工具定义"""
    name: str
    description: str
    capabilities: List[str]
    input_schema: Dict[str, Any]
    cost: float = 1.0
    latency_estimate: float = 1.0

class ModelDrivenSelector:
    """模型驱动的工具选择器"""

    def __init__(self, model: str = "gpt-4", api_key: Optional[str] = None):
        self.client = OpenAI(api_key=api_key) if api_key else None
        self.model = model
        self.tool_registry: Dict[str, Tool] = {}

    def register_tool(self, tool: Tool):
        """注册工具"""
        self.tool_registry[tool.name] = tool

    def select_tools(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        max_tools: int = 5
    ) -> List[Tool]:
        """为任务选择工具"""

        # 构建工具描述
        tool_descriptions = "\n".join([
            f"- {name}: {tool.description} (capabilities: {', '.join(tool.capabilities)})"
            for name, tool in self.tool_registry.items()
        ])

        # 构建 prompt
        prompt = f"""Task: {task}

Available tools:
{tool_descriptions}

Context: {json.dumps(context or {}, ensure_ascii=False)}

Select the most appropriate tools for this task. Return a JSON array of tool names.
Consider:
1. Tool capabilities match task requirements
2. Tool efficiency (cost and latency)
3. Tool compatibility with context

Return format: ["tool1", "tool2", ...]
"""

        # 调用模型
        if self.client:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a tool selection assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )

            selected_names = json.loads(response.choices[0].message.content)
        else:
            # 简化版本：基于关键词匹配
            selected_names = self._keyword_based_selection(task)

        return [self.tool_registry[name] for name in selected_names if name in self.tool_registry]

    def _keyword_based_selection(self, task: str) -> List[str]:
        """基于关键词的工具选择"""
        task_lower = task.lower()

        # 定义关键词映射
        keyword_map = {
            "search": ["web_search", "database_query"],
            "分析": ["analyzer", "statistical_tool"],
            "生成": ["generator", "formatter"],
            "计算": ["calculator", "processor"]
        }

        selected = []
        for keyword, tools in keyword_map.items():
            if keyword in task_lower:
                selected.extend(tools)

        return list(set(selected))[:5]

    def select_with_reasoning(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """选择工具并返回推理过程"""

        # 构建详细的 prompt
        prompt = f"""Analyze the following task and select appropriate tools.

Task: {task}
Context: {json.dumps(context or {}, ensure_ascii=False)}

Available tools with their attributes:
{self._format_tool_attributes()}

Provide your analysis in the following format:
1. Task breakdown
2. Required capabilities
3. Selected tools with justification
4. Execution order

Return as JSON with keys: breakdown, capabilities, selected_tools (with justification), execution_order
"""

        if self.client:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a tool selection expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5
            )

            result = json.loads(response.choices[0].message.content)

            return {
                "tools": [self.tool_registry[name] for name in result.get("selected_tools", [])],
                "reasoning": result,
                "execution_order": result.get("execution_order", [])
            }

        return {"tools": [], "reasoning": {}, "execution_order": []}

    def _format_tool_attributes(self) -> str:
        """格式化工具属性"""
        lines = []
        for name, tool in self.tool_registry.items():
            lines.append(
                f"- {tool.name}: {tool.description}\n"
                f"  Capabilities: {', '.join(tool.capabilities)}\n"
                f"  Cost: {tool.cost}, Latency: {tool.latency_estimate}s"
            )
        return "\n".join(lines)
```

### 2.2 规则驱动的工具选择

基于预定义规则进行工具选择。

```python
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
import re

class RuleType(Enum):
    CONDITIONAL = "conditional"     # 条件规则
    PRIORITY = "priority"          # 优先级规则
    COST_BASED = "cost_based"      # 成本规则
    CAPABILITY_MATCH = "capability" # 能力匹配

@dataclass
class SelectionRule:
    """选择规则"""
    rule_type: RuleType
    condition: Callable[[Dict[str, Any]], bool]
    action: Callable[[Dict[str, Any]], List[str]]
    priority: int = 0

@dataclass
class ToolSelectionConfig:
    """工具选择配置"""
    max_tools: int = 5
    max_cost: float = 100.0
    max_latency: float = 30.0
    require_all_capabilities: bool = False

class RuleBasedSelector:
    """基于规则的工具选择器"""

    def __init__(self):
        self.rules: List[SelectionRule] = []
        self.tool_registry: Dict[str, Tool] = {}
        self.config = ToolSelectionConfig()

    def add_rule(self, rule: SelectionRule):
        self.rules.append(rule)
        self.rules.sort(key=lambda r: r.priority, reverse=True)

    def register_tool(self, tool: Tool):
        self.tool_registry[tool.name] = tool

    def set_config(self, config: ToolSelectionConfig):
        self.config = config

    def select_tools(self, task: Dict[str, Any]) -> List[Tool]:
        """基于规则选择工具"""
        candidates = list(self.tool_registry.values())

        # 应用规则过滤
        for rule in self.rules:
            if rule.condition(task):
                selected_names = rule.action(task)
                candidates = [
                    c for c in candidates
                    if c.name in selected_names
                ]

        # 应用约束
        candidates = self._apply_constraints(candidates, task)

        return candidates[:self.config.max_tools]

    def _apply_constraints(
        self,
        candidates: List[Tool],
        task: Dict[str, Any]
    ) -> List[Tool]:
        """应用约束条件"""
        required_caps = task.get("required_capabilities", [])
        max_cost = task.get("max_cost", self.config.max_cost)
        max_latency = task.get("max_latency", self.config.max_latency)

        filtered = []

        for tool in candidates:
            # 检查成本约束
            if tool.cost > max_cost:
                continue

            # 检查延迟约束
            if tool.latency_estimate > max_latency:
                continue

            # 检查能力要求
            if required_caps:
                if self.config.require_all_capabilities:
                    if not all(cap in tool.capabilities for cap in required_caps):
                        continue
                else:
                    if not any(cap in tool.capabilities for cap in required_caps):
                        continue

            filtered.append(tool)

        return filtered

    def select_with_priority(
        self,
        task: Dict[str, Any]
    ) -> List[Tool]:
        """基于优先级选择"""
        candidates = list(self.tool_registry.values())

        # 优先级排序
        def calculate_priority(tool: Tool) -> float:
            score = 0.0

            # 能力匹配分数
            required = task.get("required_capabilities", [])
            matches = sum(1 for cap in required if cap in tool.capabilities)
            score += (matches / len(required)) * 100 if required else 50

            # 成本效率分数
            score += max(0, 50 - tool.cost * 10)

            # 延迟效率分数
            score += max(0, 30 - tool.latency_estimate * 5)

            return score

        candidates.sort(key=calculate_priority, reverse=True)

        return candidates[:self.config.max_tools]
```

### 2.3 成本感知的选择

考虑执行成本的最优工具选择。

```python
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import math

class CostModel(Enum):
    LINEAR = "linear"      # 线性成本
    QUADRATIC = "quadratic" # 二次成本
    STEP = "step"          # 阶梯成本

@dataclass
class CostEstimate:
    """成本估算"""
    monetary_cost: float
    time_cost: float
    resource_cost: float
    total: float

    @classmethod
    def calculate(
        cls,
        tool: Tool,
        input_size: int,
        model: CostModel = CostModel.LINEAR
    ) -> "CostEstimate":
        """计算工具执行成本"""

        if model == CostModel.LINEAR:
            monetary = tool.cost + 0.1 * input_size
        elif model == CostModel.QUADRATIC:
            monetary = tool.cost + 0.01 * (input_size ** 2)
        else:  # STEP
            monetary = tool.cost * math.ceil(input_size / 1000)

        time_cost = tool.latency_estimate * 0.5  # 时间价值系数
        resource_cost = 0.2 * input_size  # 资源成本

        total = monetary + time_cost + resource_cost

        return cls(
            monetary_cost=monetary,
            time_cost=time_cost,
            resource_cost=resource_cost,
            total=total
        )

class CostAwareSelector:
    """成本感知的工具选择器"""

    def __init__(self, budget: float = 100.0):
        self.budget = budget
        self.total_spent = 0.0
        self.tool_registry: Dict[str, Tool] = {}

    def register_tool(self, tool: Tool):
        self.tool_registry[tool.name] = tool

    def select_optimal_tools(
        self,
        task: Dict[str, Any],
        required_output: int = 1
    ) -> List[Tuple[Tool, CostEstimate]]:
        """选择最优工具组合"""

        available_tools = list(self.tool_registry.values())
        remaining_budget = self.budget - self.total_spent

        # 计算每个工具的成本
        tool_costs = []
        for tool in available_tools:
            input_size = task.get("input_size", 1000)
            cost = CostEstimate.calculate(tool, input_size)

            if cost.total <= remaining_budget:
                tool_costs.append((tool, cost))

        # 按成本排序
        tool_costs.sort(key=lambda x: x[1].total)

        # 选择满足输出需求的最小工具集
        selected = []
        total_cost = 0.0
        coverage = set()

        required_caps = set(task.get("required_capabilities", []))

        for tool, cost in tool_costs:
            if cost.total + total_cost > remaining_budget:
                continue

            # 检查能力覆盖
            tool_caps = set(tool.capabilities)
            new_coverage = required_caps - coverage

            if new_coverage:
                selected.append((tool, cost))
                total_cost += cost.total
                coverage.update(tool_caps)

                if coverage >= required_caps:
                    break

        self.total_spent += total_cost

        return selected

    def select_with_budget_constraint(
        self,
        tasks: List[Dict[str, Any]],
        total_budget: float
    ) -> Dict[str, List[Tuple[Tool, CostEstimate]]]:
        """在总预算约束下分配任务"""

        results = {}
        remaining = total_budget

        for task in tasks:
            if remaining <= 0:
                break

            # 选择该任务的最优工具
            selected = self.select_optimal_tools(task)

            # 估算总成本
            total_cost = sum(cost.total for _, cost in selected)

            if total_cost <= remaining:
                results[task.get("id", str(len(results)))] = selected
                remaining -= total_cost

        return results

    def select_with_quality_constraint(
        self,
        tasks: List[Dict[str, Any]],
        min_quality: float = 0.8
    ) -> List[Tuple[Tool, CostEstimate]]:
        """在质量约束下选择最优成本工具"""

        all_tools = list(self.tool_registry.values())
        best_combination = []
        best_cost = float('inf')

        def evaluate_combination(tools: List[Tool]) -> Tuple[float, float]:
            """评估工具组合的质量和成本"""
            if not tools:
                return 0.0, float('inf')

            # 计算覆盖度
            all_caps = set()
            for tool in tools:
                all_caps.update(tool.capabilities)

            coverage = len(all_caps) / max(len(all_tools), 1)
            quality = coverage * 0.7 + (1 - min(tool.cost for tool in tools) / 100) * 0.3

            cost = sum(tool.cost for tool in tools)

            return quality, cost

        # 简单的组合搜索（实际应用中需要更优化）
        for tool in all_tools:
            quality, cost = evaluate_combination([tool])

            if quality >= min_quality and cost < best_cost:
                best_combination = [tool]
                best_cost = cost

        return [(t, CostEstimate.calculate(t, 1000)) for t in best_combination]
```

## 应用与行业实践

把可调用的能力（函数、接口、模型、SDK）当成"工具"，编排就是决定谁先跑、谁并行、谁兜底。本页聚焦两件事：把串行、并行、条件分支拼在一条链路里，叫混合编排；在多条可选路径里挑一条，叫工具选择策略。下面给场景地图、三个拆解、行业做法和落地路线。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 客服工单自动分诊 | 选择策略：规则优先、模型兜底；混合编排：只读工具并行、写工具串行 | 规则引擎 + 支持工具调用的模型 API | 写操作前必须留人工确认闸门 |
| 后台管理的万行表格 | 混合编排：先取列定义再取数据；选择策略：按筛选是否命中索引选本地或远程 | 前端请求编排、服务端分页接口 | 取消已发出的过期请求，防止旧结果覆盖新结果 |
| 低端安卓的首屏加载 | 混合编排：必需步骤串行、可延后步骤入后台队列 | Android 协程、Macrobenchmark | 按内存等级降级，弱机不跑满并行 |
| 多人协作白板 | 选择策略：本地先应用、服务端为权威 | CRDT 库、WebSocket | 回滚要能定位到具体操作 |
| CI 里的代码检查 | 混合编排：扇出到各检查器、汇聚结果 | 流水线并行 stage | 必需检查失败即中止，可选检查只告警 |
| 车载语音助手的离线指令 | 选择策略：置信度低于阈值走本地小模型 | 端侧推理运行时 | 端云工具集要版本对齐 |
| 电商大促的商品详情 | 混合编排：风控串行前置，价格与库存并行 | 缓存 + 服务端聚合层 | 超时要给降级内容，不能返回空白 |

### 三个场景拆解

#### 场景 1：客服工单自动分诊

**业务背景**：工单量在活动期会翻几倍，人工按关键词转派会漏派和错派。单张工单的判定预算在秒级，且必须可追溯用了哪条规则、哪个工具。

**怎么用本页知识解决**：先让规则跑一遍，命中就直接定链路；没命中再交给模型在只读工具清单里选。只读工具并行发，写工具串行发。

```python
def 处理工单(工单):
    # 规则优先：命中退款或发票关键词直接定链路，省一次模型调用
    链路 = 规则表.匹配(工单)
    if 链路 is None:
        # 模型兜底：只下发只读工具的名称与用途，不给写权限
        链路 = 模型选工具(工单, 工具清单=只读工具)
    # 混合编排：只读工具并行扇出，各自带 800ms 超时与默认返回值
    只读结果 = 并行调用(链路.只读工具, 参数=工单, 超时毫秒=800, 失败返回=None)
    # 汇聚后校验：缺关键字段就转人工，不进入写链路
    if 只读结果.缺关键字段:
        return 转人工(工单, 原因="信息不足")
    # 写工具串行执行，前一步成功才执行下一步
    for 写工具 in 链路.写工具:
        结果 = 调用(写工具, 只读结果)
        if not 结果.成功:
            return 转人工(工单, 原因=结果.错误码)
    return 已完成
```

- 规则优先让高频路径不付模型调用成本，规则带版本号就能回溯。
- 模型只拿到只读工具，写权限留在应用侧，模型无法自己发起写操作。
- 并行扇出带独立超时，单个只读工具卡住不会拖垮整张工单。
- 汇聚后补一次字段校验，缺字段直接转人工，避免带着空值进写链路。
- 写工具串行且短路，一步失败即停，不会留下半完成状态。

**怎么度量收益**：选路准确率用离线标注集跑混淆矩阵。端到端时延看 OpenTelemetry 的 span 时长，用 Prometheus histogram_quantile 取 p50 与 p95。并行收益做对照：改成串行再跑同一批工单，比总时长。

**什么时候不该用**：
- 工单里写操作占比接近全部时，并行扇出省不下时间，只留下乱序风险。
- 规则表长期稳定且覆盖率高时，引入模型选路只增加一条需要监控的链路。
- 合规要求逐步人工审批时，自动写工具本身就不该出现在链路里。

#### 场景 2：后台管理的万行表格

**业务背景**：运营后台一次要展示上万行订单，首屏卡顿主要来自串行请求和全量渲染。数据源有本地缓存与服务端查询两条路，选错会让首屏等待翻倍。

**怎么用本页知识解决**：先用一次串行请求拿列定义与筛选器 schema，再并行取首页数据和总数。选择策略按筛选条件是否命中索引，决定走本地缓存还是远程查询。

```js
async function 加载表格(筛选条件) {
  // 串行第一步：列定义决定后续取哪些字段，必须先拿到
  const schema = await 取列定义();
  // 选择策略：筛选命中已建索引的字段才走远程，否则读本地缓存
  const 走远程 = schema.已索引字段.some(字段 => 字段 in 筛选条件);
  // 混合编排：首页数据与总数互不依赖，并行发起
  const [首页, 总数] = await Promise.all([
    走远程 ? 远程查询(筛选条件, schema) : 本地筛选(筛选条件, schema),
    取总数(筛选条件, schema),
  ]);
  // 汇总后一次性交给渲染层，减少逐行测量带来的抖动
  return 渲染(首页, 总数, schema.列宽);
}
```

- 串行只保留列定义这一步，它决定后续请求的字段集合。
- 首页与总数并行，两者没有数据依赖，等待时间取两者较长的一边。
- 选择策略落在索引判断上，命中索引走远程，未命中读本地缓存。
- 新筛选条件到来时中止上一次未完成的请求，防止旧结果覆盖新结果。
- 列宽在渲染前一次算完，避免逐行测量触发布局抖动。

**怎么度量收益**：Chrome DevTools Performance 面板看 Largest Contentful Paint 与 Long Task 数量。网络瀑布图数串行段数，React Profiler 看 commit 时长。服务端用 OpenTelemetry span 时长区分查询与序列化。

**什么时候不该用**：
- 数据总量只有几百行且一次返回时，远程与本地双路的判断成本高于收益。
- 筛选条件全部走服务端聚合（例如按月统计）时，本地缓存拿不到完整数据集。
- 表格是只读报表且刷新频率低于分钟级时，整页缓存即可，不需要两路选择。

#### 场景 3：低端安卓的首屏加载

**业务背景**：同一份首屏逻辑在中低端机型上会掉帧，来源是同时发起的多项初始化。内存与网络都紧张时，把可选步骤全部并行会拖长首屏时间。

**怎么用本页知识解决**：把步骤分三类：阻塞渲染的串行做，与首屏无关的入后台队列，按条件触发的挂到事件上。选择策略按内存等级挑图片解码路径。

```kotlin
suspend fun 加载首屏(设备档位: 档位) = coroutineScope {
    // 串行：主题与布局参数决定后续渲染，先取
    val 主题 = 读主题()
    // 并行：图片与文案互不依赖，同时发起
    val 图片任务 = async { 取图片(主题, 解码路径(设备档位)) }  // 选择策略在这里生效
    val 文案任务 = async { 取文案(主题) }
    // 首屏只等必需图片，文案可以延后填充
    val 首屏图 = 图片任务.await()
    // 可延后步骤放入应用级作用域，不阻塞首屏返回
    后台作用域.launch { 上报埋点(主题) }
    // 文案未就绪先渲染占位，到达后局部刷新
    渲染首屏(首屏图, 文案任务)
}

fun 解码路径(档位: 档位) = when (档位.内存等级) {
    1 -> 低清优先      // 弱机先出低清图，再按需替换
    else -> 原图直出
}
```

- 串行只留读主题一步，它是后续所有请求的输入。
- 图片与文案并行发起，两者之间没有依赖关系。
- 选择策略按内存等级切换解码路径，弱机先出低清图。
- 可延后步骤移到应用级作用域，首屏返回不再等埋点上报。
- 占位渲染让文案迟到只触发局部刷新，不会整屏重绘。

**怎么度量收益**：Android Macrobenchmark 的 FrameTimingMetric 取启动帧时长分布。Perfetto 看主线程阻塞段，adb shell dumpsys gfxinfo 看掉帧计数。并发收益用同机型两版对照，比 p90 帧时长。

**什么时候不该用**：
- 首屏步骤之间存在强依赖且无法拆解时，分级只增加调度开销。
- 设备档位判定本身要读磁盘或联网时，判定成本会吃掉分级收益。
- 首屏只有一个网络请求时，并行与分级都没有可编排的对象。

### 行业先进实践

**模型只产出调用参数，执行留在应用侧（出处：OpenAI 官方文档 Function calling 指南）**。模型返回工具名与 JSON 参数，执行、鉴权、审计由应用完成。这样能在执行前插入校验与白名单。借鉴方式：把写操作工具统一包一层策略闸门，闸门决定放行、改写参数还是转人工。

**用 tool_choice 收窄可用工具集合（出处：Anthropic 官方文档 Tool use；具体参数名与取值集合需核对官方文档：核对是否支持强制指定单个工具、是否支持禁用全部工具）**。在框架层把工具集限死，模型就没有机会选到不该选的工具。借鉴方式：按会话阶段动态下发工具清单，只读阶段不暴露写工具。

**工具通过标准协议暴露与发现（出处：Model Context Protocol 官方文档）**。服务端声明工具名称、入参 schema 与用途描述，客户端统一发现、授权与调用。接入新工具时编排代码不用改。借鉴方式：内部工具按同一份 schema 注册，编排层只依赖描述，不依赖具体实现。

**请求进入系统前经过一串准入检查（出处：Kubernetes 官方文档 Admission Controllers）**。每个检查器可以拒绝或改写请求，顺序与失败策略在配置里显式声明。借鉴方式：把工具选择策略做成可插拔的准入链，每一环记录命中原因，便于回溯某次选路为什么发生。

**重试要带超时与抖动退避（出处：Amazon Builders' Library 的文章 Timeouts, retries, and backoff with jitter）**。每次重试设上限并加随机抖动，避免大量调用同时重发。借鉴方式：工具回退链最多走两级，每级带独立超时，回退事件单独打点。

### 从学到用：落地路线

1. 试点选一条调用量中等、失败可人工兜底的链路，例如工单分诊的只读查询段。验收标准：该链路每次工具调用都能在日志里看到入参、耗时与命中策略。
2. 在试点链路上做对照实验，把混合编排换成全串行、把选择策略换成固定路径，各跑同一批输入。验收标准：两次运行的指标对比表能说明每条策略各自的贡献。
3. 把验证过的编排模板抽成配置，其他链路只改配置不改代码。验收标准：新链路接入时编排代码零改动，只提交一份配置。
4. 建立回退开关与回归样例集，策略上线前先跑样例集。验收标准：任一策略都能在不改代码的情况下关闭，关闭后链路按固定路径运行。

### 动手作业

**目标**：把一条含 4 个工具调用的链路，从全串行改造成混合编排，并加一层工具选择策略。

**步骤**：
1. 准备一份可离线跑的输入集合（例如 30 条历史工单或 30 组筛选条件），存成 JSON。
2. 写一版全串行实现：4 个工具按固定顺序调用，记录每个工具的开始与结束时间。
3. 标出哪些工具只读、哪些带写副作用，只把只读工具改成并行扇出。
4. 加一个选择策略：命中规则走固定链路，未命中再按工具描述打分选一条。
5. 给每个工具加超时与回退，回退最多两级，记录回退原因。
6. 用同一份输入集合跑改造前与改造后两版，导出每次调用的耗时与选中的链路。
7. 写一页对比：总耗时分布、选路分布、失败与回退次数、转人工次数。

**验收标准**：
- 同一份输入在两版实现上产出一致，写副作用的调用次数相同。
- 改造后的总耗时 p50 与 p90 能从导出数据算出，且能指出哪几次调用是并行的。
- 选择策略的每次命中都带原因字段，人工可读。
- 把任一工具改成返回失败后，链路按回退规则走完，不抛未捕获异常。
- 关掉选择策略后，链路回到固定路径，行为与第 2 步的实现一致。

