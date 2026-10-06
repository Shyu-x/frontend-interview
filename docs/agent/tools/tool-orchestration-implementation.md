---
title: 工具编排：实现与高级话题
description: 工具编排的代码实现、高级话题与模式选择指南。
tags:
  - ai-agent
  - tools
date: 2026-05-17
---

# 工具编排：实现与高级话题

> 本文是「工具编排」系列第 3 篇（共 3 篇）。上一篇：[工具编排：混合与选择策略](tool-orchestration-hybrid.md)

## 1. 代码实现

### 1.1 拓扑排序算法

```python
from typing import List, Dict, Set, Optional, Any
from dataclasses import dataclass, field

@dataclass
class GraphNode:
    """图节点"""
    id: str
    data: Any = None
    dependencies: Set[str] = field(default_factory=set)

class TopologicalSorter:
    """拓扑排序实现"""

    @staticmethod
    def kahn_bfs(nodes: List[GraphNode]) -> List[str]:
        """
        Kahn 算法 (BFS 实现)
        返回拓扑排序结果，如果存在环则返回空列表
        """
        # 构建邻接表和入度表
        in_degree = {node.id: 0 for node in nodes}
        adjacency = {node.id: [] for node in nodes}

        node_map = {node.id: node for node in nodes}

        for node in nodes:
            for dep in node.dependencies:
                if dep in adjacency:
                    adjacency[dep].append(node.id)
                    in_degree[node.id] += 1

        # 初始化队列
        queue = [node_id for node_id, deg in in_degree.items() if deg == 0]
        result = []

        while queue:
            # 取出入度为0的节点
            current = queue.pop(0)
            result.append(current)

            # 更新依赖该节点的节点
            for neighbor in adjacency[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # 检测环
        if len(result) != len(nodes):
            return []

        return result

    @staticmethod
    def dfs(node_id: str, adjacency: Dict[str, List[str]],
            visited: Set[str], rec_stack: Set[str],
            result: List[str]) -> bool:
        """DFS 辅助函数"""

        visited.add(node_id)
        rec_stack.add(node_id)

        for neighbor in adjacency[node_id]:
            if neighbor not in visited:
                if TopologicalSorter.dfs(neighbor, adjacency, visited, rec_stack, result):
                    return True
            elif neighbor in rec_stack:
                # 发现环
                return True

        rec_stack.remove(node_id)
        result.insert(0, node_id)  # 逆序添加实现拓扑排序
        return False

    @staticmethod
    def dfs_method(nodes: List[GraphNode]) -> List[str]:
        """
        DFS 方法实现拓扑排序
        """
        adjacency = {node.id: [] for node in nodes}
        node_map = {node.id: node for node in nodes}

        for node in nodes:
            for dep in node.dependencies:
                if dep in adjacency:
                    adjacency[dep].append(node.id)

        visited = set()
        rec_stack = set()
        result = []

        for node in nodes:
            if node.id not in visited:
                if TopologicalSorter.dfs(node.id, adjacency, visited, rec_stack, result):
                    return []  # 有环

        return result

    @staticmethod
    def parallel_levels(nodes: List[GraphNode]) -> List[List[str]]:
        """
        计算可并行执行的层级
        返回嵌套列表，每个子列表内的节点可并行执行
        """
        in_degree = {node.id: len(node.dependencies) for node in nodes}
        adjacency = {node.id: [] for node in nodes}

        for node in nodes:
            for dep in node.dependencies:
                if dep in adjacency:
                    adjacency[dep].append(node.id)

        levels = []
        processed = set()

        while len(processed) < len(nodes):
            # 找出所有入度为0的节点
            current_level = [
                node_id for node_id, deg in in_degree.items()
                if deg == 0 and node_id not in processed
            ]

            if not current_level:
                raise ValueError("Circular dependency detected")

            levels.append(current_level)
            processed.update(current_level)

            # 更新依赖节点的入度
            for node_id in current_level:
                for neighbor in adjacency[node_id]:
                    in_degree[neighbor] -= 1

        return levels

    @staticmethod
    def weighted_topo_sort(
        nodes: List[GraphNode],
        weight_func: callable
    ) -> List[str]:
        """
        带权重的拓扑排序
        优先选择权重更高的路径上的节点
        """

        # 首先进行标准拓扑排序
        topo_order = TopologicalSorter.kahn_bfs(nodes)
        if not topo_order:
            return []

        # 计算每个节点的权重影响
        node_weights = {}
        for node_id in topo_order:
            node = next(n for n in nodes if n.id == node_id)
            node_weights[node_id] = weight_func(node)

        # 按权重重新排序（保持依赖约束）
        def can_reorder(node_id: str, before: List[str], node_map: Dict) -> bool:
            """检查节点是否可以移动到列表前面"""
            node = node_map[node_id]
            for other in before:
                if node.id in node_map[other].dependencies:
                    return False
            return True

        # 冒泡排序直到稳定
        ordered = topo_order.copy()
        node_map = {n.id: n for n in nodes}

        for i in range(len(ordered)):
            for j in range(i + 1, len(ordered)):
                if node_weights[ordered[j]] > node_weights[ordered[i]]:
                    if can_reorder(ordered[j], ordered[:i], node_map):
                        ordered[i], ordered[j] = ordered[j], ordered[i]

        return ordered
```

### 1.2 并行执行器

```python
import asyncio
from typing import List, Callable, Any, Optional, Dict
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, Future
from dataclasses import dataclass, field
from enum import Enum
import time
from functools import partial

class ExecutorType(Enum):
    THREAD = "thread"
    PROCESS = "process"
    ASYNC = "async"

@dataclass
class TaskConfig:
    """任务配置"""
    timeout: float = 30.0
    retries: int = 3
    retry_delay: float = 1.0
    priority: int = 0

@dataclass
class Task:
    """任务定义"""
    id: str
    func: Callable
    args: tuple = field(default_factory=tuple)
    kwargs: Dict[str, Any] = field(default_factory=dict)
    config: TaskConfig = field(default_factory=TaskConfig)
    dependencies: List[str] = field(default_factory=list)

class ParallelExecutor:
    """高性能并行执行器"""

    def __init__(
        self,
        max_workers: int = 4,
        executor_type: ExecutorType = ExecutorType.THREAD
    ):
        self.max_workers = max_workers
        self.executor_type = executor_type
        self.executor = self._create_executor()
        self.results: Dict[str, Any] = {}

    def _create_executor(self):
        """创建执行器"""
        if self.executor_type == ExecutorType.THREAD:
            return ThreadPoolExecutor(max_workers=self.max_workers)
        elif self.executor_type == ExecutorType.PROCESS:
            return ProcessPoolExecutor(max_workers=self.max_workers)
        else:
            return None

    def execute(self, tasks: List[Task]) -> Dict[str, Any]:
        """执行任务列表"""
        # 按依赖分组
        groups = self._group_by_dependencies(tasks)

        results = {}
        for group in groups:
            group_results = self._execute_group(group)
            results.update(group_results)

        return results

    def _group_by_dependencies(self, tasks: List[Task]) -> List[List[Task]]:
        """按依赖关系分组"""
        # 构建依赖图
        task_map = {t.id: t for t in tasks}
        in_degree = {t.id: len(t.dependencies) for t in tasks}

        groups = []
        remaining = list(tasks)

        while remaining:
            # 找出无依赖的任务
            current_group = [
                t for t in remaining
                if in_degree[t.id] == 0
            ]

            if not current_group:
                raise ValueError("Circular dependency detected")

            groups.append(current_group)

            # 更新入度
            completed_ids = {t.id for t in current_group}
            for task in remaining:
                task_deps = set(task.dependencies)
                if task_deps & completed_ids:
                    # 有依赖完成，减少入度
                    new_deps = task_deps - completed_ids
                    in_degree[task.id] = len(new_deps)
                    task.dependencies = list(new_deps)

            remaining = [t for t in remaining if t.id not in completed_ids]

        return groups

    def _execute_group(self, tasks: List[Task]) -> Dict[str, Any]:
        """执行一组任务"""
        if self.executor_type == ExecutorType.ASYNC:
            return asyncio.run(self._execute_group_async(tasks))
        else:
            return self._execute_group_sync(tasks)

    def _execute_group_sync(self, tasks: List[Task]) -> Dict[str, Any]:
        """同步执行一组任务"""
        futures = {}
        results = {}

        # 提交所有任务
        for task in tasks:
            future = self.executor.submit(
                self._execute_with_retry,
                task
            )
            futures[task.id] = future

        # 收集结果
        for task_id, future in futures.items():
            try:
                results[task_id] = future.result(timeout=30)
            except Exception as e:
                results[task_id] = {"error": str(e)}

        return results

    async def _execute_group_async(self, tasks: List[Task]) -> Dict[str, Any]:
        """异步执行一组任务"""
        async def execute_async(task: Task):
            return await asyncio.to_thread(self._execute_with_retry, task)

        task_results = await asyncio.gather(
            *[execute_async(t) for t in tasks],
            return_exceptions=True
        )

        return {t.id: r for t, r in zip(tasks, task_results)}

    def _execute_with_retry(self, task: Task) -> Any:
        """带重试的任务执行"""
        last_error = None

        for attempt in range(task.config.retries):
            try:
                # 准备带超时的执行
                result = self._execute_with_timeout(
                    task.func,
                    task.args,
                    task.kwargs,
                    task.config.timeout
                )
                return {"success": True, "result": result}
            except Exception as e:
                last_error = e
                if attempt < task.config.retries - 1:
                    time.sleep(task.config.retry_delay * (attempt + 1))

        return {"success": False, "error": str(last_error)}

    def _execute_with_timeout(
        self,
        func: Callable,
        args: tuple,
        kwargs: Dict[str, Any],
        timeout: float
    ) -> Any:
        """带超时的执行"""
        future = self.executor.submit(func, *args, **kwargs)
        return future.result(timeout=timeout)

    def shutdown(self, wait: bool = True):
        """关闭执行器"""
        if self.executor:
            self.executor.shutdown(wait=wait)
```

### 1.3 状态机编排

```python
from typing import Dict, Any, Callable, Optional, List
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod

class StateTransition(Enum):
    """状态转换"""
    SUCCESS = "success"
    FAILURE = "failure"
    TIMEOUT = "timeout"
    CANCEL = "cancel"

@dataclass
class Transition:
    """转换定义"""
    from_state: str
    to_state: str
    trigger: StateTransition
    condition: Optional[Callable[[Dict], bool]] = None
    action: Optional[Callable[[Dict], Dict]] = None

@dataclass
class StateMachineConfig:
    """状态机配置"""
    initial_state: str
    final_states: List[str]
    transitions: List[Transition]
    on_enter: Optional[Callable[[str, Dict], None]] = None
    on_exit: Optional[Callable[[str, Dict], None]] = None

class StateMachine:
    """状态机编排器"""

    def __init__(self, config: StateMachineConfig):
        self.config = config
        self.current_state = config.initial_state
        self.context: Dict[str, Any] = {}
        self.history: List[str] = [config.initial_state]

        # 构建转换表
        self._transition_map: Dict[str, Dict[StateTransition, Transition]] = {}

        for trans in config.transitions:
            if trans.from_state not in self._transition_map:
                self._transition_map[trans.from_state] = {}
            self._transition_map[trans.from_state][trans.trigger] = trans

    def trigger(self, event: StateTransition, context_update: Optional[Dict] = None):
        """触发状态转换"""
        if context_update:
            self.context.update(context_update)

        # 查找转换
        if self.current_state not in self._transition_map:
            return False

        transition_map = self._transition_map[self.current_state]
        if event not in transition_map:
            # 尝试默认转换
            return False

        trans = transition_map[event]

        # 检查条件
        if trans.condition and not trans.condition(self.context):
            return False

        # 执行动作
        if trans.action:
            result = trans.action(self.context)
            if result:
                self.context.update(result)

        # 状态转换
        if self.config.on_exit:
            self.config.on_exit(self.current_state, self.context)

        self.current_state = trans.to_state
        self.history.append(self.current_state)

        if self.config.on_enter:
            self.config.on_enter(self.current_state, self.context)

        return True

    def is_final(self) -> bool:
        """检查是否到达终态"""
        return self.current_state in self.config.final_states

    def get_state(self) -> str:
        """获取当前状态"""
        return self.current_state

    def get_history(self) -> List[str]:
        """获取状态历史"""
        return self.history.copy()

class ToolStateMachine:
    """工具编排状态机"""

    def __init__(self):
        self.states = {
            "idle": self._create_idle_state(),
            "planning": self._create_planning_state(),
            "executing": self._create_executing_state(),
            "verifying": self._create_verifying_state(),
            "completed": self._create_completed_state(),
            "failed": self._create_failed_state()
        }

        self.machine = None
        self._setup_machine()

    def _create_idle_state(self) -> Dict[str, Any]:
        return {
            "name": "idle",
            "actions": [],
            "entry_action": None,
            "exit_action": None
        }

    def _create_planning_state(self) -> Dict[str, Any]:
        return {
            "name": "planning",
            "actions": ["analyze_task", "select_tools", "build_plan"],
            "entry_action": self._on_enter_planning,
            "exit_action": self._on_exit_planning
        }

    def _create_executing_state(self) -> Dict[str, Any]:
        return {
            "name": "executing",
            "actions": ["execute_tools", "collect_results"],
            "entry_action": self._on_enter_executing,
            "exit_action": self._on_exit_executing
        }

    def _create_verifying_state(self) -> Dict[str, Any]:
        return {
            "name": "verifying",
            "actions": ["validate_results", "check_quality"],
            "entry_action": self._on_enter_verifying,
            "exit_action": self._on_exit_verifying
        }

    def _create_completed_state(self) -> Dict[str, Any]:
        return {
            "name": "completed",
            "actions": [],
            "entry_action": self._on_enter_completed,
            "exit_action": None
        }

    def _create_failed_state(self) -> Dict[str, Any]:
        return {
            "name": "failed",
            "actions": ["log_error", "cleanup"],
            "entry_action": self._on_enter_failed,
            "exit_action": None
        }

    def _setup_machine(self):
        """设置状态机"""
        transitions = [
            Transition("idle", "planning", StateTransition.SUCCESS),
            Transition("planning", "executing", StateTransition.SUCCESS),
            Transition("executing", "verifying", StateTransition.SUCCESS),
            Transition("verifying", "completed", StateTransition.SUCCESS),
            Transition("executing", "failed", StateTransition.FAILURE),
            Transition("planning", "failed", StateTransition.FAILURE),
            Transition("verifying", "executing", StateTransition.FAILURE),
            Transition("idle", "idle", StateTransition.FAILURE),
        ]

        config = StateMachineConfig(
            initial_state="idle",
            final_states=["completed", "failed"],
            transitions=transitions
        )

        self.machine = StateMachine(config)

    def run(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """运行状态机"""
        while not self.machine.is_final():
            current = self.machine.get_state()

            if current == "planning":
                result = self._run_planning(task)
                if result.get("success"):
                    self.machine.trigger(StateTransition.SUCCESS, {"plan": result})
                else:
                    self.machine.trigger(StateTransition.FAILURE, {"error": result.get("error")})

            elif current == "executing":
                result = self._run_execution(task)
                if result.get("success"):
                    self.machine.trigger(StateTransition.SUCCESS, {"results": result})
                else:
                    self.machine.trigger(StateTransition.FAILURE, {"error": result.get("error")})

            elif current == "verifying":
                result = self._run_verification(task)
                if result.get("success"):
                    self.machine.trigger(StateTransition.SUCCESS, {"verified": True})
                else:
                    self.machine.trigger(StateTransition.FAILURE, {"error": result.get("error")})

        return {
            "final_state": self.machine.get_state(),
            "history": self.machine.get_history(),
            "context": self.machine.context
        }

    def _run_planning(self, task: Dict) -> Dict[str, Any]:
        """执行规划阶段"""
        # 简化的规划逻辑
        return {
            "success": True,
            "tools": ["search", "analyze", "format"]
        }

    def _run_execution(self, task: Dict) -> Dict[str, Any]:
        """执行阶段"""
        return {"success": True, "output": "Execution result"}

    def _run_verification(self, task: Dict) -> Dict[str, Any]:
        """验证阶段"""
        return {"success": True}

    # 状态进入/退出回调
    def _on_enter_planning(self, state: str, context: Dict):
        pass

    def _on_exit_planning(self, state: str, context: Dict):
        pass

    def _on_enter_executing(self, state: str, context: Dict):
        pass

    def _on_exit_executing(self, state: str, context: Dict):
        pass

    def _on_enter_verifying(self, state: str, context: Dict):
        pass

    def _on_exit_verifying(self, state: str, context: Dict):
        pass

    def _on_enter_completed(self, state: str, context: Dict):
        pass

    def _on_enter_failed(self, state: str, context: Dict):
        pass
```

### 1.4 超时控制

```python
import asyncio
from typing import Any, Callable, Dict, Optional, List
from dataclasses import dataclass, field
from enum import Enum
import time
from concurrent.futures import TimeoutError

class TimeoutStrategy(Enum):
    """超时策略"""
    HARD = "hard"          # 超时直接失败
    SOFT = "soft"          # 超时继续执行但不等待结果
    GRACEFUL = "graceful"  # 优雅取消，带清理
    EXTENDABLE = "extendable"  # 可延长超时

@dataclass
class TimeoutConfig:
    """超时配置"""
    default_timeout: float = 30.0
    max_timeout: float = 300.0
    warning_threshold: float = 0.8  # 80% 时发出警告
    strategy: TimeoutStrategy = TimeoutStrategy.GRACEFUL

@dataclass
class ExecutionContext:
    """执行上下文"""
    task_id: str
    start_time: float
    timeout: float
    cancelled: bool = False
    warnings: List[str] = field(default_factory=list)

class TimeoutController:
    """超时控制器"""

    def __init__(self, config: TimeoutConfig):
        self.config = config
        self.active_contexts: Dict[str, ExecutionContext] = {}

    def start(self, task_id: str, timeout: Optional[float] = None) -> ExecutionContext:
        """开始计时"""
        actual_timeout = timeout or self.config.default_timeout

        context = ExecutionContext(
            task_id=task_id,
            start_time=time.time(),
            timeout=actual_timeout
        )

        self.active_contexts[task_id] = context
        return context

    def check(self, task_id: str) -> float:
        """检查剩余时间"""
        if task_id not in self.active_contexts:
            return 0.0

        context = self.active_contexts[task_id]
        elapsed = time.time() - context.start_time
        remaining = context.timeout - elapsed

        # 检查警告阈值
        if remaining <= context.timeout * (1 - self.config.warning_threshold):
            context.warnings.append(
                f"Time running low: {remaining:.2f}s remaining"
            )

        return max(0, remaining)

    def is_timeout(self, task_id: str) -> bool:
        """检查是否超时"""
        return self.check(task_id) <= 0

    def extend(self, task_id: str, additional_time: float) -> bool:
        """延长超时"""
        if task_id not in self.active_contexts:
            return False

        context = self.active_contexts[task_id]
        new_timeout = context.timeout + additional_time

        if new_timeout <= self.config.max_timeout:
            context.timeout = new_timeout
            return True

        return False

    def cancel(self, task_id: str):
        """取消任务"""
        if task_id in self.active_contexts:
            self.active_contexts[task_id].cancelled = True

    def cleanup(self, task_id: str):
        """清理上下文"""
        if task_id in self.active_contexts:
            del self.active_contexts[task_id]

class TimeoutExecutor:
    """带超时控制的执行器"""

    def __init__(self, config: Optional[TimeoutConfig] = None):
        self.config = config or TimeoutConfig()
        self.controller = TimeoutController(self.config)

    def execute(
        self,
        func: Callable,
        args: tuple = (),
        kwargs: Optional[Dict] = None,
        timeout: Optional[float] = None,
        on_timeout: Optional[Callable] = None
    ) -> Any:
        """执行带超时控制"""
        import threading

        task_id = str(id(func))
        kwargs = kwargs or {}

        context = self.controller.start(task_id, timeout)
        result = None
        exception = None
        completed = threading.Event()

        def run():
            nonlocal result, exception
            try:
                result = func(*args, **kwargs)
            except Exception as e:
                exception = e
            finally:
                completed.set()

        thread = threading.Thread(target=run)
        thread.start()

        # 等待完成或超时
        if self.config.strategy == TimeoutStrategy.HARD:
            if not completed.wait(timeout=context.timeout):
                thread.join(timeout=1)
                raise TimeoutError(f"Task exceeded timeout of {context.timeout}s")
        else:
            completed.wait(timeout=context.timeout)

        self.controller.cleanup(task_id)

        if exception:
            raise exception

        return result

    async def execute_async(
        self,
        coro: Callable,
        timeout: Optional[float] = None,
        on_timeout: Optional[Callable] = None
    ) -> Any:
        """异步执行带超时"""
        task_id = str(id(coro))
        context = self.controller.start(task_id, timeout)

        try:
            if timeout:
                result = await asyncio.wait_for(coro(), timeout=timeout)
            else:
                result = await coro()

            return result

        except asyncio.TimeoutError:
            if on_timeout:
                return await asyncio.to_thread(on_timeout)

            if self.config.strategy == TimeoutStrategy.GRACEFUL:
                # 优雅取消
                return {"error": "timeout", "cancelled": True}
            else:
                raise

        finally:
            self.controller.cleanup(task_id)

class TimeoutOrchestrator:
    """超时编排器"""

    def __init__(self, global_timeout: float = 60.0):
        self.global_timeout = global_timeout
        self.executor = TimeoutExecutor()

    def execute_with_stages(
        self,
        stages: List[Callable],
        stage_timeouts: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """分阶段执行，每阶段有独立超时"""

        results = {}
        total_elapsed = 0

        for i, stage in enumerate(stages):
            timeout = stage_timeouts[i] if stage_timeouts else self.global_timeout / len(stages)

            remaining_timeout = self.global_timeout - total_elapsed
            actual_timeout = min(timeout, remaining_timeout)

            try:
                start = time.time()
                result = self.executor.execute(
                    stage,
                    timeout=actual_timeout
                )
                elapsed = time.time() - start
                total_elapsed += elapsed

                results[f"stage_{i}"] = {
                    "success": True,
                    "result": result,
                    "elapsed": elapsed
                }

            except Exception as e:
                results[f"stage_{i}"] = {
                    "success": False,
                    "error": str(e),
                    "elapsed": time.time() - start
                }
                break

        return {
            "results": results,
            "total_elapsed": total_elapsed,
            "completed_stages": len([r for r in results.values() if r.get("success")]),
            "total_stages": len(stages)
        }
```

## 2. 高级话题

### 2.1 工具组合

将多个工具组合成新的复合工具。

```python
from typing import List, Dict, Any, Callable, Optional
from dataclasses import dataclass, field

@dataclass
class ToolComposition:
    """工具组合"""
    name: str
    description: str
    tools: List[Callable]
    connectors: List[Callable]  # 连接器函数，用于传递结果
    output_transformer: Optional[Callable] = None

class ToolComposer:
    """工具组合器"""

    def __init__(self):
        self.compositions: Dict[str, ToolComposition] = {}

    def compose(
        self,
        name: str,
        description: str,
        tools: List[Callable],
        input_mapping: Optional[Dict[int, int]] = None
    ) -> ToolComposition:
        """
        创建工具组合

        input_mapping: 从前一个工具输出到后一个工具输入的映射
                     key: 目标工具索引, value: 源工具索引
        """

        # 创建默认连接器
        if input_mapping is None:
            connectors = [self._default_connector] * (len(tools) - 1)
        else:
            connectors = []
            for i in range(len(tools) - 1):
                if i in input_mapping:
                    connectors.append(
                        self._create_connector(input_mapping[i])
                    )
                else:
                    connectors.append(self._default_connector)

        composition = ToolComposition(
            name=name,
            description=description,
            tools=tools,
            connectors=connectors
        )

        self.compositions[name] = composition
        return composition

    def execute_composition(
        self,
        name: str,
        initial_input: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行工具组合"""
        if name not in self.compositions:
            raise ValueError(f"Composition {name} not found")

        comp = self.compositions[name]
        context = {"input": initial_input, "outputs": []}

        # 顺序执行
        for i, tool in enumerate(comp.tools):
            # 准备输入
            if i == 0:
                input_data = initial_input
            else:
                # 使用连接器准备输入
                prev_output = context["outputs"][-1]
                input_data = comp.connectors[i - 1](prev_output)

            # 执行工具
            try:
                output = tool(input_data)
                context["outputs"].append(output)
            except Exception as e:
                context["error"] = str(e)
                context["failed_at"] = i
                break

        # 应用输出转换器
        if comp.output_transformer and "error" not in context:
            context["final_output"] = comp.output_transformer(context["outputs"])
        elif context["outputs"]:
            context["final_output"] = context["outputs"][-1]

        return context

    def _default_connector(self, prev_output: Any) -> Dict[str, Any]:
        """默认连接器"""
        if isinstance(prev_output, dict):
            return prev_output
        return {"data": prev_output}

    def _create_connector(self, source_index: int) -> Callable:
        """创建自定义连接器"""
        def connector(prev_output: Any) -> Dict[str, Any]:
            # 从指定源提取数据
            if isinstance(prev_output, dict):
                return {"source_data": prev_output.get("result", prev_output)}
            return {"source_data": prev_output}
        return connector

    def parallel_compose(
        self,
        name: str,
        description: str,
        parallel_tools: List[List[Callable]],
        reducer: Optional[Callable] = None
    ) -> ToolComposition:
        """
        创建并行组合
        多个工具同时执行，结果通过 reducer 合并
        """

        def parallel_wrapper(inputs: List[Dict]) -> List[Any]:
            results = []
            for tool_group in parallel_tools:
                group_results = []
                for tool in tool_group:
                    try:
                        result = tool(inputs)
                        group_results.append(result)
                    except Exception:
                        group_results.append(None)
                results.append(group_results)
            return results

        composition = ToolComposition(
            name=name,
            description=description,
            tools=[parallel_wrapper],
            connectors=[],
            output_transformer=reducer
        )

        self.compositions[name] = composition
        return composition
```

### 2.2 工具管道

创建数据流管道，实现工具间的流水线处理。

```python
from typing import List, Dict, Any, Callable, Optional
from dataclasses import dataclass, field
from enum import Enum

class PipelineStage(Enum):
    """管道阶段"""
    SOURCE = "source"
    TRANSFORM = "transform"
    FILTER = "filter"
    AGGREGATE = "aggregate"
    SINK = "sink"

@dataclass
class PipelineConfig:
    """管道配置"""
    name: str
    buffer_size: int = 100
    max_retries: int = 3
    error_handling: str = "skip"  # skip, stop, fallback
    checkpoint_enabled: bool = False

class PipelineStageDef:
    """管道阶段定义"""

    def __init__(
        self,
        name: str,
        stage_type: PipelineStage,
        processor: Callable,
        config: Optional[Dict] = None
    ):
        self.name = name
        self.stage_type = stage_type
        self.processor = processor
        self.config = config or {}

class ToolPipeline:
    """工具管道"""

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.stages: List[PipelineStageDef] = []
        self.buffer = []
        self.checkpoints = []

    def add_stage(self, stage_def: PipelineStageDef):
        self.stages.append(stage_def)

    def pipe(
        self,
        name: str,
        processor: Callable,
        stage_type: PipelineStage = PipelineStage.TRANSFORM
    ) -> "ToolPipeline":
        """链式添加阶段"""
        self.add_stage(PipelineStageDef(name, stage_type, processor))
        return self

    def execute(self, initial_data: Any) -> Dict[str, Any]:
        """执行管道"""
        context = {
            "data": initial_data,
            "errors": [],
            "processed": 0,
            "skipped": 0
        }

        checkpoint_data = {}

        for stage in self.stages:
            try:
                if stage.stage_type == PipelineStage.FILTER:
                    # 过滤器：决定是否继续
                    should_continue = stage.processor(context["data"])
                    if not should_continue:
                        context["skipped"] += 1
                        if self.config.error_handling == "stop":
                            break
                        continue

                elif stage.stage_type == PipelineStage.AGGREGATE:
                    # 聚合器：收集数据但不立即处理
                    self.buffer.append(context["data"])
                    if len(self.buffer) >= self.config.buffer_size:
                        context["data"] = stage.processor(self.buffer)
                        self.buffer = []
                    continue

                else:
                    # 标准转换
                    context["data"] = stage.processor(context["data"])

                context["processed"] += 1

                # 记录检查点
                if self.config.checkpoint_enabled:
                    checkpoint_data[stage.name] = context["data"]
                    self.checkpoints.append(checkpoint_data.copy())

            except Exception as e:
                context["errors"].append({
                    "stage": stage.name,
                    "error": str(e)
                })

                if self.config.error_handling == "stop":
                    break
                elif self.config.error_handling == "fallback":
                    # 使用默认结果继续
                    context["data"] = stage.config.get("fallback_value")

        # 处理剩余的缓冲数据
        if self.buffer:
            last_agg_stage = next(
                (s for s in reversed(self.stages) if s.stage_type == PipelineStage.AGGREGATE),
                None
            )
            if last_agg_stage:
                context["data"] = last_agg_stage.processor(self.buffer)

        context["stages_completed"] = len(self.stages) - len(context["errors"])
        context["checkpoints"] = self.checkpoints

        return context

    def execute_streaming(self, data_iter) -> List[Any]:
        """流式执行管道"""
        results = []

        for data in data_iter:
            result = self.execute(data)
            if "error" not in result or result.get("stages_completed", 0) > 0:
                results.append(result.get("final_output", result.get("data")))

        return results

    def restore_from_checkpoint(self, checkpoint_index: int):
        """从检查点恢复"""
        if 0 <= checkpoint_index < len(self.checkpoints):
            return self.checkpoints[checkpoint_index]
        return None
```

### 2.3 条件执行

基于条件的动态工具选择和执行。

```python
from typing import Dict, Any, List, Callable, Optional
from dataclasses import dataclass, field
from enum import Enum
import re

class ConditionOperator(Enum):
    """条件操作符"""
    EQUALS = "eq"
    NOT_EQUALS = "ne"
    GREATER_THAN = "gt"
    LESS_THAN = "lt"
    CONTAINS = "contains"
    MATCHES = "matches"
    IN = "in"
    NOT_IN = "not_in"

@dataclass
class Condition:
    """执行条件"""
    field: str
    operator: ConditionOperator
    value: Any

    def evaluate(self, context: Dict[str, Any]) -> bool:
        """评估条件"""
        field_value = self._get_nested_value(context, self.field)

        if self.operator == ConditionOperator.EQUALS:
            return field_value == self.value
        elif self.operator == ConditionOperator.NOT_EQUALS:
            return field_value != self.value
        elif self.operator == ConditionOperator.GREATER_THAN:
            return field_value > self.value
        elif self.operator == ConditionOperator.LESS_THAN:
            return field_value < self.value
        elif self.operator == ConditionOperator.CONTAINS:
            return self.value in str(field_value)
        elif self.operator == ConditionOperator.MATCHES:
            return bool(re.match(self.value, str(field_value)))
        elif self.operator == ConditionOperator.IN:
            return field_value in self.value
        elif self.operator == ConditionOperator.NOT_IN:
            return field_value not in self.value

        return False

    def _get_nested_value(self, data: Dict, path: str) -> Any:
        """获取嵌套值"""
        keys = path.split('.')
        value = data
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
        return value

@dataclass
class ConditionalTool:
    """条件工具"""
    name: str
    tool: Callable
    conditions: List[Condition]
    condition_mode: str = "all"  # all, any, none

    def should_execute(self, context: Dict[str, Any]) -> bool:
        """判断是否应该执行"""
        if self.condition_mode == "all":
            return all(c.evaluate(context) for c in self.conditions)
        elif self.condition_mode == "any":
            return any(c.evaluate(context) for c in self.conditions)
        elif self.condition_mode == "none":
            return not any(c.evaluate(context) for c in self.conditions)
        return True

class ConditionalExecutor:
    """条件执行器"""

    def __init__(self):
        self.conditional_tools: List[ConditionalTool] = []
        self.default_tool: Optional[Callable] = None

    def register(
        self,
        name: str,
        tool: Callable,
        conditions: List[Condition],
        condition_mode: str = "all"
    ):
        """注册条件工具"""
        self.conditional_tools.append(
            ConditionalTool(name, tool, conditions, condition_mode)
        )

    def set_default(self, tool: Callable):
        """设置默认工具"""
        self.default_tool = tool

    def execute(self, context: Dict[str, Any]) -> Any:
        """根据条件执行工具"""
        # 查找匹配的工具
        for ct in self.conditional_tools:
            if ct.should_execute(context):
                return ct.tool(context)

        # 使用默认工具
        if self.default_tool:
            return self.default_tool(context)

        return None

    def execute_all_matching(self, context: Dict[str, Any]) -> List[Any]:
        """执行所有匹配的工具"""
        results = []

        for ct in self.conditional_tools:
            if ct.should_execute(context):
                try:
                    result = ct.tool(context)
                    results.append({
                        "tool": ct.name,
                        "success": True,
                        "result": result
                    })
                except Exception as e:
                    results.append({
                        "tool": ct.name,
                        "success": False,
                        "error": str(e)
                    })

        return results

class ConditionalPipeline:
    """条件流水线"""

    def __init__(self):
        self.stages: List[Dict[str, Any]] = []
        self.default_pipeline: Optional[List[Callable]] = None

    def add_conditional_stage(
        self,
        name: str,
        condition: Condition,
        tool: Callable,
        else_tool: Optional[Callable] = None
    ):
        """添加条件阶段"""
        self.stages.append({
            "name": name,
            "type": "conditional",
            "condition": condition,
            "tool": tool,
            "else_tool": else_tool
        })

    def add_branch(
        self,
        name: str,
        branches: List[Dict[str, Any]]  # [{"conditions": [], "pipeline": []}]
    ):
        """添加分支阶段"""
        self.stages.append({
            "name": name,
            "type": "branch",
            "branches": branches
        })

    def execute(self, initial_context: Dict[str, Any]) -> Dict[str, Any]:
        """执行条件流水线"""
        context = initial_context.copy()
        results = []

        for stage in self.stages:
            if stage["type"] == "conditional":
                result = self._execute_conditional_stage(stage, context)
                results.append(result)
                context[stage["name"]] = result

            elif stage["type"] == "branch":
                result = self._execute_branch_stage(stage, context)
                results.append(result)
                context[stage["name"]] = result

        return {
            "context": context,
            "stage_results": results
        }

    def _execute_conditional_stage(
        self,
        stage: Dict,
        context: Dict
    ) -> Any:
        """执行条件阶段"""
        condition = stage["condition"]

        if condition.evaluate(context):
            tool = stage["tool"]
        else:
            tool = stage.get("else_tool")

        if tool:
            try:
                return tool(context)
            except Exception as e:
                return {"error": str(e)}

        return None

    def _execute_branch_stage(
        self,
        stage: Dict,
        context: Dict
    ) -> Any:
        """执行分支阶段"""
        for branch in stage["branches"]:
            conditions = branch.get("conditions", [])
            pipeline = branch.get("pipeline", [])

            # 检查分支条件
            if self._check_conditions(conditions, context):
                results = []
                for tool in pipeline:
                    try:
                        result = tool(context)
                        results.append(result)
                        # 更新上下文
                        if isinstance(result, dict):
                            context.update(result)
                    except Exception as e:
                        results.append({"error": str(e)})

                return {"branch": branch.get("name"), "results": results}

        return None

    def _check_conditions(self, conditions: List[Condition], context: Dict) -> bool:
        """检查条件列表"""
        return all(c.evaluate(context) for c in conditions)
```

## 3. 附录：模式选择指南

| 场景 | 推荐模式 | 原因 |
|------|----------|------|
| 独立任务并行 | 并行执行 | 最大化吞吐量 |
| 有依赖关系 | 拓扑排序 + 串行 | 保证正确性 |
| 复杂工作流 | 分阶段编排 | 可控性强 |
| 不确定执行路径 | 动态编排 | 灵活性高 |
| 资源受限 | 成本感知选择 | 优化资源利用 |
| 长流程 + 中间结果 | 串行 + 缓存 | 性能优化 |

---

*本文档持续更新，涵盖工具编排的核心模式与最佳实践。*

## 应用与行业实践

前面几章讲了编排怎么写、混合策略怎么选。这一章把镜头拉到工程现场：同一套知识点，在不同场景里落到什么位置，怎么度量有没有效果。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 客服机器人一次会话跨 30+ 内部工具查工单、退款、物流 | 规则前置 + 向量召回 + 模型兜底的三段路由 | 规则引擎、向量检索、支持并行工具调用的模型 | 路由错一次就答错，先建离线回放集守住准确率 |
| 后台管理的万行表格导出成 CSV 并通知下载 | 分片编排、幂等键、断点续跑 | 任务队列、对象存储、分片写出 | 合并与通知拆成独立步骤，避免整任务重跑 |
| 低端安卓机的首屏加载 | 并行调用、超时降级、本地缓存兜底 | Promise.allSettled、客户端缓存、骨架屏 | 降级路径必须埋点，否则故障被静默吞掉 |
| 多人协作白板的增量同步 | 事件批处理与顺序依赖编排 | WebSocket、操作变换或 CRDT、批量提交 | 先定冲突解决顺序，再定批处理窗口大小 |
| 代码助手在单仓库里搜代码、读文件、跑测试 | 工具集裁剪与依赖分层 | 仓库索引检索、沙箱执行、只读文件工具 | 执行类工具单独隔离，不与只读工具共用超时 |
| 数据分析助手把自然语言转成 SQL 再出图 | 依赖 DAG：取数在前、绘图在后 | SQL 执行器、图表工具、结果裁剪 | 大结果集先聚合再回填，否则上下文被撑爆 |
| 大促下单链路校验支付、库存、优惠券 | 并行校验、熔断隔离、失败短路 | 独立线程池或信号量、熔断器 | 每个下游独立配额，一个慢调用不拖垮整条链路 |
| 企业内部工具网关统一接 MCP 服务 | 工具注册表、权限过滤、审计日志 | MCP server 分域、网关鉴权、调用留痕 | 按角色过滤工具清单，越权工具不要暴露给模型 |

### 三个场景拆解

#### 场景 1：客服机器人跨 30+ 内部工具的路由

**业务背景**：工具从个位数涨到几十个之后，模型直接挑选的错误率上升，候选清单还把上下文占满。规模用「工具条数 × 每轮平均调用次数」衡量，先把这两个数数清楚。

**怎么用本页知识解决**：思路是分三步缩小决策空间，再让模型做最后一跳；互不依赖的查询并行跑，有依赖的按图分层。

```ts
// 伪代码：函数名按你的工程命名替换
const ruled = rules.filter(r => r.match(userText));        // 第一步：规则前置，覆盖高置信场景
if (ruled.length === 1) return callTool(ruled[0]);          // 命中唯一工具直接执行，跳过模型

const candidates = await recall(toolIndex, userText, 8);    // 第二步：向量召回，把候选压到 8 个
const picked = await llm.select({ text: userText, tools: candidates }); // 模型只在候选集内选

const plan = buildDag(picked);                              // 第三步：把选中工具拆成有向无环图
const result = await runDag(plan, { concurrency: 4, timeoutMs: 3000 }); // 无依赖并发，有依赖分层串行

if (result.degraded) return fallbackReply(result.reason);   // 第四步：降级走兜底话术，不外泄内部错误
return compose(result);
```

- 规则前置只处理高置信场景，比如「查物流单号」，命中就返回，省掉一次模型调用。
- 向量召回的 topK 不能凭手感定，用历史会话跑回放集，看命中率随 topK 的变化拐点。
- 模型只在候选集内选，参数缺失就反问用户，不要让模型自己编参数。
- 并行层只放查询类工具，写操作串行执行并带幂等键。
- 降级结果打上标记，监控按 degraded 维度单独看，别混进正常请求里。

**怎么度量收益**：

| 指标 | 测量方法 |
| --- | --- |
| 路由 top-1 准确率 | 历史会话构造离线回放集，统计命中与混淆矩阵 |
| 端到端 P50 / P95 延迟 | OpenTelemetry span 记录每次工具调用，Prometheus Histogram 汇总，Grafana 看分位 |
| 降级率、工具错误率 | 按 span 属性切分超时、参数错、下游 5xx |
| 单轮 token 消耗 | 统计候选清单长度与模型调用轮次 |

**什么时候不该用**：

- 工具总数在个位数且描述互不重叠时，全量给模型即可，加一层路由只是多一个故障点。
- 写操作占主体的场景，比如批量改配置，不要并行，也不要让模型在候选集外自行发挥。
- 一次性问答、没有多轮状态时，缓存和断点续跑都拿不到收益。

#### 场景 2：后台管理的万行表格导出

**业务背景**：运营点一次导出要等几分钟，中途失败就得从头再来；用户反复点击还会生成多份内容相同的文件。规模按「行数 ÷ 单分片行数」估，先拿一万行样本压一次，拿到耗时曲线再定分片。

**怎么用本页知识解决**：把一次导出拆成「分片写 → 合并 → 通知」三段，每段能独立重试；用业务字段算出幂等键，重复提交返回同一个任务。

```python
# 伪代码：每一步都可单独重试
def export(table_id, query):
    rows = fetch_rows(query)                            # 取数只做一次，结果落临时存储
    job_id = "export:%s:%s" % (table_id, digest(rows))  # 幂等键：同一份数据重复提交返回同一任务
    for i, chunk in enumerate(split(rows, 5000)):       # 分片大小先用样本压测再定
        part = "%s/part-%d" % (job_id, i)
        if store.exists(part):                          # 断点续跑：写过的分片直接跳过
            continue
        store.write(part, to_csv(chunk))                # 一个分片只做一件事，失败只重试这一片
    merge(job_id)                                       # 合并放最后，失败可重跑且不重复取数
    notify(job_id)                                      # 通知失败不回滚数据，只重试通知
```

- 取数与写出分开，取数失败不会留下半份文件，写出失败不用重新查库。
- 幂等键取业务字段的摘要，让「用户连点两次」和「队列重投」落到同一个 job_id。
- 分片写入保证单个分片失败只重试分片，重跑代价与分片数成正比，不与总行数成正比。
- 合并单独一步，方便并行读分片，也方便在合并前做抽样校验。
- 通知放在最后且不参与事务，避免「文件已生成但用户没收到」触发整任务回滚。

**怎么度量收益**：

| 指标 | 测量方法 |
| --- | --- |
| 导出成功率 | 任务队列的完成计数除以提交计数，Prometheus Counter |
| 失败后的重跑步数 | 统计重试时被跳过的分片数，对比分片总数 |
| 重复文件数 | 对象存储按 job_id 前缀计数，看是否存在同键多份 |
| P95 完成时间 | 从入队到通知的时间差，Histogram 看分位 |

**什么时候不该用**：

- 行数在千行以内、耗时几秒的场景，同步返回即可，加编排只增加代码量和排查面。
- 数据必须是一致性快照（比如财务对账），分片会读到不同时间点，改成一次查询加流式写出。

#### 场景 3：低端安卓机的首屏加载

**业务背景**：低端机上首屏请求串行等待，白屏时间长；弱网下某一个接口超时会把整屏拖住。规模用「接口数 × 单接口 P95」估，用真机加网络限速档位复现这个数值。

**怎么用本页知识解决**：把首屏请求按关键与非关键分层，关键请求并行发且有硬超时，超时读本地缓存；非关键请求推到空闲回调。

```js
// 伪代码：首屏只编排关键请求
const critical = [
  request('/api/user', { timeoutMs: 800 }),   // 关键请求给硬超时，超时即降级
  request('/api/feed', { timeoutMs: 800 }),
];
const [user, feed] = await Promise.allSettled(critical);  // 并行发出，一个失败不阻塞另一个
renderSkeleton();                                          // 先渲染骨架，避免白屏
const userData = user.status === 'fulfilled' ? user.value : readCache('user'); // 失败读本地缓存
const feedData = feed.status === 'fulfilled' ? feed.value : readCache('feed');
render(userData, feedData);
onIdle(() => prefetch('/api/recommend'));   // 非关键请求进空闲回调，不抢首屏带宽
mark('first-screen-ready');                 // 埋点：首屏可交互时间从这一行起算
```

- 关键请求用 allSettled 而不是 all，单个失败不影响其余渲染。
- 硬超时值从真机弱网档位的 P95 倒推，不要直接抄桌面端的数值。
- 降级读缓存时必须把「数据可能过期」的标记一起渲染，避免用户按旧价格下单。
- 非关键请求放空闲回调，防止它与首屏请求争抢连接数。
- 先渲染骨架再填数据，让可交互时间与数据返回时间解耦。

**怎么度量收益**：

| 指标 | 测量方法 |
| --- | --- |
| 首屏可交互时间 | performance.mark 埋点上报，真机上用 Chrome DevTools Performance 与 Lighthouse 复测 |
| 请求失败率、降级命中率 | 按接口分别计数，区分超时、HTTP 错误、缓存命中 |
| 并发请求数 | 统计首屏窗口内的在途请求峰值，对照浏览器同域连接数上限 |

**什么时候不该用**：

- 页面只有 1 个接口且它本身就是首屏数据源，拆并行没有收益，应去优化后端耗时。
- 请求之间有前后依赖（先鉴权再取数据），强行并行只会多一次失败。
- 数据有时效强约束（余额、库存），降级读缓存会给出错误信息，宁可直接报错让用户重试。

### 行业先进实践

**可组合的工作流模式（出处：Anthropic 工程博客 Building effective agents）**：该文把常见编排归纳为提示链、路由、并行化、编排者-工作者几类可组合模式，并建议先直连模型 API，确认模式够用再引框架。这样做的价值在于把「选择」与「实现」拆开，选错模式时改动面小。你的项目可以先在纸上画出调用图，再决定要不要上框架。

**工具按需发现（出处：Model Context Protocol 官方文档）**：MCP 把工具、资源、提示词拆成由服务端声明、客户端发现的清单，会话开始时才知道有哪些能力可用。这样做的价值在于工具集可以按场景挂载。你的项目可以按业务域拆成多个 server，客服会话只挂客服域的工具。

**状态图与检查点（出处：LangGraph 官方文档）**：把编排建模成状态图，并在每步之后落检查点，进程重启后从最后一个检查点继续。这样做的价值在于长任务不必从头重跑。你的导出、批处理类任务可以照搬这个思路，把中间态写到队列或对象存储。

**并行工具调用（出处：OpenAI 官方文档的 function calling 指南）**：模型一次返回多个工具调用请求，客户端并发执行后再把结果回填给模型。这样做的价值在于减少模型往返轮次。你的项目在采用前要先定好结果裁剪规则，否则并行返回的大结果会挤爆上下文。

**熔断与舱壁隔离（出处：resilience4j 官方文档）**：为每个外部依赖配置独立的熔断器和线程池或信号量，某个依赖变慢时只影响它自己的配额。这样做的价值在于把故障限制在局部。你的项目要给每个工具单独设超时与并发上限，不要共用一个全局线程池。

**可观测性语义约定**：需核对官方文档：OpenTelemetry 的 GenAI semantic conventions 中 span 名称与属性是否已进入稳定状态，确认后再决定字段名是否直接用于生产仪表盘。

### 从学到用：落地路线

第 1 步，在一个工具数在 10 到 30 之间、调用量可控的内部助手上试点混合路由。验收标准：规则、召回、模型三段各自都有独立的日志与耗时记录。

第 2 步，用历史会话构造回放集，对比「全量给模型」与「三段路由」的 top-1 命中。验收标准：回放集能一键跑完，两份结果落在同一张对照表里。

第 3 步，把路由配置抽成独立文件，按业务域复制到第二个助手。验收标准：新助手接入时只改配置，不改路由代码。

第 4 步，把回放集跑进持续集成，命中率跌破阈值就拦住合并。验收标准：流水线上能看到每次提交的命中率变化，并有明确的阈值告警。

### 动手作业

**目标**：给一个命令行小助手接入 12 个本地工具（读文件、写文件、检索目录、查时间、算表达式、发 HTTP 请求等），实现规则前置加向量召回加模型兜底的三段路由，并产出可对比的度量表。可先用本地假数据集，不接外部付费服务。

**步骤**：

1. 给 12 个工具各写一段描述与参数说明，存成一份可读的配置；工具名与参数名保持唯一。
2. 实现规则层：写 5 条关键词规则，命中唯一工具时直接执行，并把「规则命中」写进日志。
3. 实现召回层：对工具描述建本地索引，给定用户输入返回 topK 候选，topK 从 3 到 12 各跑一遍。
4. 实现兜底层：把候选清单交给模型，要求返回工具名与参数；模型返回候选外工具时直接判为失败。
5. 实现执行层：无依赖的工具并发执行，有依赖的按依赖表分层；每个工具单独设超时与失败降级。
6. 准备 30 条测试输入与期望工具，覆盖规则命中、召回命中、需要兜底、需要澄清四类。
7. 跑出对照表：全量直选与三段路由各跑一轮，记录 top-1 命中、平均耗时、平均候选数。

**验收标准**：

- 30 条测试输入全部有明确结果，四类场景各自都有覆盖，失败用例能定位到是规则、召回还是兜底环节。
- topK 从 3 到 12 的实验结果都在同一张表里，能看出命中率的变化拐点，并说明你选定的 topK 理由。
- 每个工具调用都有独立日志，含工具名、耗时、是否降级三个字段。
- 故意让其中一个工具超时，程序能降级返回并继续处理其余工具，退出码为 0。
- 重复执行同一条写操作输入两次，产出结果一致，不产生第二份文件。

