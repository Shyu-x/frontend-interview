---
title: CrewAI Flows 高级编排指南
description: 介绍 CrewAI Flows 的高级编排功能，涵盖从基础装饰器到复杂状态管理和错误恢复策略。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# CrewAI Flows 高级编排指南

本文档介绍 CrewAI Flows 的高级编排功能，涵盖从基础装饰器到复杂状态管理和错误恢复策略的全部核心概念。

---

## 1. CrewAI Flow 概述

CrewAI Flows 是 CrewAI 框架中用于构建**有向无环工作流**（DAG）的模块。它允许开发者以声明式方式编排多个 Agent、任务和工具的执行顺序，支持顺序执行、并行执行以及条件分支逻辑。

Flows 的核心设计目标：

- **可组合性**：将复杂任务拆分为可复用的步骤
- **可观测性**：内置状态跟踪和执行日志
- **灵活性**：支持自定义 Python 逻辑、循环和条件判断
- **可靠性**：内置错误处理和恢复机制

Flows 适用于构建自动化流水线、多阶段数据处理管道、以及需要人机协作的复杂任务链。

---

## 2. 使用 @flow 装饰器定义 Flow

`@flow` 装饰器是 CrewAI Flows 的入口点。任何继承自 `CrewFlow` 基类并使用该装饰器标记的方法都成为一个可执行的 Flow。

### 2.1 基础用法

```python
from crewai.flow.flow import Flow, flow, start
from crewai import Agent, Task, Crew

@flow
def my_first_flow():
    # Flow 的逻辑写在这里
    pass
```

### 2.2 带状态初始化的 Flow

```python
from crewai.flow.flow import Flow, flow, start
from crewai.flow.utils import Output

@flow
def research_flow():
    # 定义初始状态
    state = {"topic": "AI Agents", "findings": [], "summary": ""}
    
    # 执行业务逻辑
    state["findings"] = search_and_collect(state["topic"])
    state["summary"] = synthesize(state["findings"])
    
    return state
```

### 2.3 Crew 集成的 Flow

```python
from crewai import Agent, Task, Crew

@flow
def content_creation_flow(topic: str):
    # 创建 Agent
    researcher = Agent(
        role="Research Analyst",
        goal="Gather comprehensive information",
        backstory="Expert at gathering and analyzing information.",
        verbose=True
    )
    
    writer = Agent(
        role="Content Writer",
        goal="Write engaging content",
        backstory="Skilled writer with expertise in creating compelling narratives.",
        verbose=True
    )
    
    # 创建 Task
    research_task = Task(
        description=f"Research the topic: {topic}",
        agent=researcher,
        expected_output="Comprehensive research notes"
    )
    
    write_task = Task(
        description="Write an article based on research",
        agent=writer,
        expected_output="A well-structured article"
    )
    
    # 创建 Crew 并执行
    crew = Crew(
        agents=[researcher, writer],
        tasks=[research_task, write_task],
        verbose=True
    )
    
    result = crew.kickoff()
    return {"article": result}
```

---

## 3. 顺序执行、并行执行与条件执行

### 3.1 顺序执行（Sequential）

顺序执行是最基本的编排模式，任务按定义顺序依次执行，每个任务在前一个任务完成后才开始。

```python
from crewai.flow.flow import Flow, flow, start
from crewai import Agent, Task, Crew

@flow
def sequential_pipeline_flow():
    agents = create_agents()
    tasks = create_tasks(agents)
    
    crew = Crew(
        agents=agents,
        tasks=tasks,  # tasks 列表顺序即执行顺序
        verbose=True
    )
    
    return crew.kickoff()
```

```python
# 显式顺序执行示例
@flow
def explicit_sequential_flow(data: str):
    result1 = step_one(data)      # 第一步
    result2 = step_two(result1)   # 第二步，等待第一步完成
    result3 = step_three(result2) # 第三步，等待第二步完成
    return result3
```

### 3.2 并行执行（Parallel）

并行执行允许多个任务同时进行，显著提升执行效率。CrewAI 通过 Crew 的 `process` 参数控制并行策略。

```python
from crewai import Crew

@flow
def parallel_research_flow(topics: list[str]):
    agents = []
    tasks = []
    
    for topic in topics:
        agent = Agent(
            role=f"Researcher for {topic}",
            goal=f"Research {topic}",
            backstory=f"Expert researcher specializing in {topic}."
        )
        
        task = Task(
            description=f"Research and summarize: {topic}",
            agent=agent,
            expected_output="A detailed summary with key points"
        )
        
        agents.append(agent)
        tasks.append(task)
    
    # 顺序模式
    crew_sequential = Crew(
        agents=agents,
        tasks=tasks,
        process=Process.sequential
    )
    
    # 并行模式（所有任务同时开始）
    crew_parallel = Crew(
        agents=agents,
        tasks=tasks,
        process=Process.hierarchical  # 也可使用并行执行
    )
    
    return crew_parallel.kickoff()
```

### 3.3 使用 `or` 运算符并行执行多个 Flow

```python
from crewai.flow.flow import Flow, flow
from crewai.flow.logger import FlowLogger
import asyncio

@flow
def parallel_flows():
    # 使用 asyncio.gather 并行执行多个 Flow
    async def run_parallel():
        results = await asyncio.gather(
            flow_a(),
            flow_b(),
            flow_c(),
            return_exceptions=True
        )
        return results
    
    return run_parallel()
```

### 3.4 条件执行（Conditional）

条件执行允许根据中间结果动态决定下一步执行路径。

```python
from crewai.flow.flow import Flow, flow, start
from crewai.flow.utils import Condition

@flow
def conditional_analysis_flow(data: dict):
    state = {"data": data, "analysis_type": None, "results": {}}
    
    # 第一步：初步分析
    state["initial_result"] = perform_initial_analysis(state["data"])
    
    # 条件判断
    if state["initial_result"]["confidence"] > 0.8:
        state["analysis_type"] = "deep"
        state["results"] = perform_deep_analysis(state["data"])
    elif state["initial_result"]["confidence"] > 0.5:
        state["analysis_type"] = "standard"
        state["results"] = perform_standard_analysis(state["data"])
    else:
        state["analysis_type"] = "manual_review"
        state["results"] = flag_for_manual_review(state["data"])
    
    # 根据分析类型选择后续步骤
    if state["analysis_type"] == "deep":
        state["final_report"] = generate_detailed_report(state["results"])
    else:
        state["final_report"] = generate_summary_report(state["results"])
    
    return state
```

### 3.5 使用 Route 装饰器实现条件路由

```python
from crewai.flow.flow import Flow, flow, router, Route
from enum import Enum

class RouteOptions(Enum):
    HIGH_PRIORITY = "high_priority"
    STANDARD = "standard"
    LOW_PRIORITY = "low_priority"
    ESCALATE = "escalate"

@flow
class DocumentProcessingFlow(Flow):
    @start()
    def classify_document(self):
        self.state["classification"] = classify(self.state["document"])
    
    @router(classify_document)
    def route_based_on_priority(self):
        priority = self.state["classification"]["priority"]
        
        if priority >= 9:
            return RouteOptions.HIGH_PRIORITY
        elif priority >= 5:
            return RouteOptions.STANDARD
        elif priority >= 2:
            return RouteOptions.LOW_PRIORITY
        else:
            return RouteOptions.ESCALATE
    
    @router(route_based_on_priority, route_options=[RouteOptions.HIGH_PRIORITY])
    def process_high_priority(self):
        self.state["processed"] = process_expedited(self.state["document"])
        return self.state["processed"]
    
    @router(route_based_on_priority, route_options=[RouteOptions.STANDARD])
    def process_standard(self):
        self.state["processed"] = process_standard(self.state["document"])
        return self.state["processed"]
    
    @router(route_based_on_priority, route_options=[RouteOptions.LOW_PRIORITY])
    def process_low_priority(self):
        self.state["processed"] = process_batch(self.state["document"])
        return self.state["processed"]
    
    @router(route_based_on_priority, route_options=[RouteOptions.ESCALATE])
    def escalate(self):
        self.state["escalated"] = True
        notify_human(self.state["document"])
        return self.state
```

### 3.6 条件循环执行

```python
@flow
def iterative_refinement_flow(initial_content: str, max_iterations: int = 3):
    self.state = {
        "content": initial_content,
        "iterations": 0,
        "quality_score": 0.0,
        "feedback_history": []
    }
    
    while self.state["iterations"] < max_iterations:
        if self.state["quality_score"] >= 0.9:
            break  # 质量达标，提前退出
        
        # 改进内容
        improved = improve_content(self.state["content"])
        
        # 评估质量
        self.state["quality_score"] = evaluate_quality(improved)
        self.state["feedback_history"].append(self.state["quality_score"])
        
        # 更新内容
        self.state["content"] = improved
        self.state["iterations"] += 1
    
    return self.state
```

---

## 4. 自定义逻辑与代码集成

### 4.1 集成外部 API

```python
import requests
from crewai.flow.flow import Flow, flow

@flow
def api_integration_flow(query: str):
    state = {"query": query, "api_results": None, "processed": None}
    
    # 调用外部 API
    response = requests.post(
        "https://api.example.com/analyze",
        json={"query": query},
        headers={"Authorization": "Bearer YOUR_API_KEY"},
        timeout=30
    )
    
    if response.status_code == 200:
        state["api_results"] = response.json()
    else:
        state["api_results"] = {"error": f"API error: {response.status_code}"}
    
    # 处理 API 结果
    state["processed"] = transform_results(state["api_results"])
    
    return state
```

### 4.2 集成数据库操作

```python
import psycopg2
from crewai.flow.flow import Flow, flow

@flow
def database_workflow_flow(user_id: int):
    state = {"user_id": user_id, "user_data": None, "report": None}
    
    # 连接数据库
    conn = psycopg2.connect(
        host="localhost",
        database="mydb",
        user="admin",
        password="password"
    )
    
    try:
        with conn.cursor() as cursor:
            # 查询用户数据
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            state["user_data"] = cursor.fetchone()
            
            # 执行更新操作
            cursor.execute(
                "UPDATE users SET last_accessed = NOW() WHERE id = %s",
                (user_id,)
            )
            conn.commit()
    finally:
        conn.close()
    
    state["report"] = generate_user_report(state["user_data"])
    return state
```

### 4.3 集成文件处理

```python
import json
from pathlib import Path
from crewai.flow.flow import Flow, flow

@flow
def file_processing_flow(input_file: str):
    state = {"input_file": input_file, "results": []}
    
    input_path = Path(input_file)
    
    if input_path.is_file():
        # 处理单个文件
        state["results"] = process_file(input_path)
    elif input_path.is_dir():
        # 处理目录中的所有文件
        for file_path in input_path.glob("*.json"):
            result = process_file(file_path)
            state["results"].append(result)
    
    # 保存结果
    output_file = input_path.parent / f"{input_path.stem}_processed.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(state["results"], f, ensure_ascii=False, indent=2)
    
    return state
```

### 4.4 自定义工具函数

```python
from crewai.tools import BaseTool
from crewai.flow.flow import Flow, flow

class DataValidationTool(BaseTool):
    name: str = "data_validation"
    description: str = "Validates input data against defined rules"
    
    def _run(self, data: dict, rules: dict) -> dict:
        errors = []
        
        for field, rule in rules.items():
            if field not in data:
                if rule.get("required", False):
                    errors.append(f"Missing required field: {field}")
            elif rule.get("type"):
                expected_type = rule["type"]
                if not isinstance(data[field], expected_type):
                    errors.append(
                        f"Invalid type for {field}: "
                        f"expected {expected_type.__name__}, "
                        f"got {type(data[field]).__name__}"
                    )
        
        return {"valid": len(errors) == 0, "errors": errors}


@flow
def validated_processing_flow(data: dict):
    state = {"original_data": data, "validated_data": None, "processed": None}
    
    validator = DataValidationTool()
    validation_result = validator.run(
        data=data,
        rules={
            "name": {"required": True, "type": str},
            "age": {"required": True, "type": int},
            "email": {"required": True, "type": str}
        }
    )
    
    if not validation_result["valid"]:
        state["errors"] = validation_result["errors"]
        return state
    
    state["validated_data"] = data
    state["processed"] = process_validated_data(data)
    
    return state
```

### 4.5 LLM 工具集成

```python
from crewai import LLM

@flow
def llm_augmented_flow(user_query: str):
    state = {"query": user_query, "context": None, "response": None}
    
    # 使用 LLM 增强上下文理解
    llm = LLM(model="gpt-4o")
    
    # 生成搜索关键词
    context_prompt = f"""
    Analyze the following user query and extract key concepts for research:
    Query: {user_query}
    
    Extract:
    1. Main topic
    2. Related concepts
    3. Potential search terms
    """
    
    llm_response = llm.call(context_prompt)
    state["context"] = parse_llm_response(llm_response)
    
    # 基于 LLM 上下文进行进一步处理
    state["response"] = generate_response(state["context"])
    
    return state
```

---

## 5. Flow 状态管理

### 5.1 状态类定义

```python
from crewai.flow.flow import Flow, flow
from typing import TypedDict
from enum import Enum

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class DocumentState(TypedDict, total=False):
    document_id: str
    content: str
    status: ProcessingStatus
    metadata: dict
    results: list[dict]
    error: str | None

@flow
class DocumentStateFlow(Flow[DocumentState]):
    @start()
    def initialize(self):
        self.state["status"] = ProcessingStatus.PENDING
        self.state["results"] = []
        self.state["error"] = None
```

### 5.2 状态初始化与更新

```python
@flow
def state_management_flow(initial_data: dict):
    # 方式一：直接赋值
    state = {
        "data": initial_data,
        "step": 1,
        "history": []
    }
    
    # 第一步
    result1 = step_one(state["data"])
    state["step_result_1"] = result1
    state["history"].append({"step": 1, "result": result1})
    
    # 第二步
    result2 = step_two(result1)
    state["step_result_2"] = result2
    state["history"].append({"step": 2, "result": result2})
    
    # 最终结果
    state["final"] = combine_results(result1, result2)
    
    return state
```

### 5.3 持久化状态

```python
import json
from pathlib import Path
from datetime import datetime

class PersistentStateFlow(Flow):
    def __init__(self):
        super().__init__()
        self.state_file = Path("flow_state.json")
        self._load_state()
    
    def _load_state(self):
        if self.state_file.exists():
            with open(self.state_file, "r") as f:
                self.state = json.load(f)
        else:
            self.state = {"created_at": datetime.now().isoformat()}
    
    def _save_state(self):
        self.state["updated_at"] = datetime.now().isoformat()
        with open(self.state_file, "w") as f:
            json.dump(self.state, f, indent=2, default=str)
    
    @start()
    def process(self):
        self.state["step"] = 1
        self._save_state()
        
        self.state["result"] = perform_work(self.state.get("data"))
        self._save_state()
        
        return self.state
```

### 5.4 状态合并策略

```python
@flow
def merging_state_flow(parallel_results: list[dict]):
    # 合并多个并行执行的结果
    merged = {
        "total_items": 0,
        "all_items": [],
        "aggregated_metrics": {
            "count": 0,
            "sum": 0,
            "avg": 0
        }
    }
    
    for result in parallel_results:
        merged["total_items"] += result.get("count", 0)
        merged["all_items"].extend(result.get("items", []))
        merged["aggregated_metrics"]["sum"] += result.get("total", 0)
    
    merged["aggregated_metrics"]["count"] = merged["total_items"]
    if merged["aggregated_metrics"]["count"] > 0:
        merged["aggregated_metrics"]["avg"] = (
            merged["aggregated_metrics"]["sum"] / 
            merged["aggregated_metrics"]["count"]
        )
    
    return merged
```

### 5.5 类型安全的状态管理

```python
from pydantic import BaseModel, Field
from crewai.flow.flow import Flow, flow

class AnalysisState(BaseModel):
    input_data: str
    processed_data: str = ""
    analysis_results: list[str] = Field(default_factory=list)
    final_report: str = ""
    metadata: dict = Field(default_factory=dict)
    iteration_count: int = 0

@flow
def typed_state_flow(data: str) -> AnalysisState:
    state = AnalysisState(input_data=data)
    
    # Pydantic 会自动验证类型
    state.processed_data = transform_data(state.input_data)
    state.iteration_count += 1
    
    state.analysis_results = analyze(state.processed_data)
    state.final_report = generate_report(state.analysis_results)
    
    return state.model_dump()
```

---

## 6. 错误处理与恢复

### 6.1 基础错误处理

```python
@flow
def error_handling_flow(data: str):
    state = {"data": data, "result": None, "error": None, "retry_count": 0}
    
    try:
        state["result"] = risky_operation(data)
    except ValueError as e:
        state["error"] = f"Validation error: {str(e)}"
    except ConnectionError as e:
        state["error"] = f"Connection failed: {str(e)}"
    except Exception as e:
        state["error"] = f"Unexpected error: {str(e)}"
    
    return state
```

### 6.2 重试机制

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from crewai.flow.flow import Flow, flow

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(ConnectionError)
)
def unreliable_api_call(data: dict):
    # 可能失败的 API 调用
    response = requests.post(
        "https://api.example.com/unstable-endpoint",
        json=data,
        timeout=30
    )
    response.raise_for_status()
    return response.json()

@flow
def resilient_flow(data: dict):
    state = {"data": data, "result": None, "attempts": 0}
    
    try:
        state["result"] = unreliable_api_call(data)
    except Exception as e:
        state["error"] = str(e)
        # 降级处理
        state["result"] = fallback_processing(data)
    
    return state
```

### 6.3 断路器模式

```python
import time
from enum import Enum

class CircuitState(str, Enum):
    CLOSED = "closed"      # 正常状态
    OPEN = "open"          # 熔断状态
    HALF_OPEN = "half_open"  # 半开状态

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenError("Circuit breaker is open")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN


@flow
def circuit_breaker_flow(data: dict):
    breaker = CircuitBreaker(failure_threshold=3, timeout=30)
    state = {"data": data, "result": None, "circuit_state": None}
    
    try:
        state["result"] = breaker.call(fragile_api_call, data)
        state["circuit_state"] = "success"
    except CircuitBreakerOpenError:
        state["result"] = fallback_response()
        state["circuit_state"] = "fallback_used"
    except Exception as e:
        state["circuit_state"] = "error"
        state["error"] = str(e)
    
    return state
```

### 6.4 超时处理

```python
import signal
from functools import wraps
from crewai.flow.flow import Flow, flow

class TimeoutError(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutError("Operation timed out")

def with_timeout(seconds: int):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(seconds)
            try:
                result = func(*args, **kwargs)
            finally:
                signal.alarm(0)
            return result
        return wrapper
    return decorator

@flow
def timeout_protected_flow(data: dict, timeout_seconds: int = 30):
    state = {"data": data, "result": None, "timed_out": False}
    
    @with_timeout(timeout_seconds)
    def timed_operation():
        return long_running_process(data)
    
    try:
        state["result"] = timed_operation()
    except TimeoutError:
        state["timed_out"] = True
        state["result"] = partial_results(data)
    except Exception as e:
        state["error"] = str(e)
    
    return state
```

### 6.5 优雅降级

```python
@flow
def graceful_degradation_flow(data: dict):
    state = {"data": data, "execution_path": [], "result": None}
    
    # 主路径：完整处理
    try:
        state["execution_path"].append("primary")
        state["result"] = primary_processing_pipeline(data)
    except PrimaryProcessingError:
        # 降级路径 1：简化处理
        try:
            state["execution_path"].append("degraded_level_1")
            state["result"] = simplified_processing(data)
        except SimplifiedProcessingError:
            # 降级路径 2：最小化处理
            try:
                state["execution_path"].append("degraded_level_2")
                state["result"] = minimal_processing(data)
            except Exception as e:
                # 最终降级：返回原始数据
                state["execution_path"].append("fallback")
                state["result"] = {"data": data, "warning": "Processed with fallback"}
    
    return state
```

### 6.6 补偿事务

```python
@flow
def compensating_transaction_flow(operations: list[dict]):
    state = {
        "operations": operations,
        "completed": [],
        "rolled_back": [],
        "final_state": None
    }
    
    executed_actions = []
    
    try:
        for op in operations:
            # 执行操作
            result = execute_operation(op)
            executed_actions.append({"operation": op, "result": result})
            state["completed"].append(op["id"])
        
        state["final_state"] = "success"
    
    except Exception as e:
        state["error"] = str(e)
        state["final_state"] = "rolled_back"
        
        # 逆序执行补偿操作
        for action in reversed(executed_actions):
            try:
                compensate(action)
                state["rolled_back"].append(action["operation"]["id"])
            except CompensationError:
                # 记录无法补偿的操作，需要人工介入
                state["failed_compensation"] = action["operation"]["id"]
    
    return state
```

### 6.7 完整错误恢复示例

```python
from dataclasses import dataclass, field
from typing import Optional
from crewai.flow.flow import Flow, flow

@dataclass
class RecoveryState:
    data: dict
    checkpoint: Optional[str] = None
    error: Optional[str] = None
    recovery_attempts: int = 0
    max_recovery_attempts: int = 3
    checkpoints_completed: list[str] = field(default_factory=list)

@flow
def recoverable_flow(initial_data: dict):
    state = RecoveryState(data=initial_data)
    
    checkpoints = [
        ("validate", validate_data),
        ("transform", transform_data),
        ("analyze", analyze_data),
        ("report", generate_report)
    ]
    
    for checkpoint_name, checkpoint_func in checkpoints:
        try:
            if state.checkpoint and state.checkpoint != checkpoint_name:
                # 从断点恢复，跳过已完成的步骤
                if checkpoint_name in state.checkpoints_completed:
                    continue
            
            state.data = checkpoint_func(state.data)
            state.checkpoints_completed.append(checkpoint_name)
            state.checkpoint = checkpoint_name
            
        except CheckpointError as e:
            state.error = str(e)
            
            if state.recovery_attempts < state.max_recovery_attempts:
                state.recovery_attempts += 1
                state.data = recovery_handler(checkpoint_name, state.data)
            else:
                state.checkpoint = checkpoint_name
                break
    
    return {
        "result": state.data,
        "checkpoints": state.checkpoints_completed,
        "error": state.error,
        "recovered": state.recovery_attempts > 0
    }
```

---

## 7. 完整代码示例

以下是一个综合性的 Flow 示例，整合了顺序执行、并行处理、条件分支和错误恢复：

```python
"""
综合示例：多阶段数据分析流水线
包含：顺序执行、并行处理、条件路由、状态管理、错误恢复
"""

from crewai import Agent, Task, Crew
from crewai.flow.flow import Flow, flow, router, Route, start
from crewai.flow.state import State
from enum import Enum
from dataclasses import dataclass, field
from typing import TypedDict
import logging
from tenacity import retry, stop_after_attempt, wait_exponential

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProcessingLevel(str, Enum):
    QUICK = "quick"
    STANDARD = "standard"
    COMPREHENSIVE = "comprehensive"


class PipelineState(TypedDict):
    raw_data: dict
    validated_data: dict | None
    quick_results: list | None
    comprehensive_results: dict | None
    final_report: str | None
    processing_level: ProcessingLevel | None
    errors: list[str]
    checkpoints: list[str]


@flow
class DataPipelineFlow(Flow[PipelineState]):
    
    @start()
    def load_data(self, raw_data: dict):
        """步骤 1：加载并验证输入数据"""
        self.state["raw_data"] = raw_data
        self.state["errors"] = []
        self.state["checkpoints"] = ["load_data"]
        
        if not raw_data or not isinstance(raw_data, dict):
            raise ValueError("Invalid input data format")
        
        logger.info("Data loaded successfully")
    
    @router(load_data)
    def determine_processing_level(self) -> Route:
        """根据数据规模决定处理级别"""
        data_size = len(self.state["raw_data"].get("items", []))
        
        if data_size < 100:
            self.state["processing_level"] = ProcessingLevel.QUICK
            return Route.QUICK
        elif data_size < 1000:
            self.state["processing_level"] = ProcessingLevel.STANDARD
            return Route.STANDARD
        else:
            self.state["processing_level"] = ProcessingLevel.COMPREHENSIVE
            return Route.COMPREHENSIVE
    
    @router(determine_processing_level, route_options=[Route.QUICK])
    def quick_processing(self):
        """快速处理路径"""
        self.state["checkpoints"].append("quick_processing")
        
        items = self.state["raw_data"]["items"]
        self.state["quick_results"] = [
            simple_analysis(item) for item in items
        ]
        
        self.state["final_report"] = self._generate_summary_report()
        return self.state
    
    @router(determine_processing_level, route_options=[Route.STANDARD])
    def standard_processing(self):
        """标准处理路径"""
        self.state["checkpoints"].append("standard_processing")
        
        items = self.state["raw_data"]["items"]
        
        # 并行处理各个维度
        results = parallel_analytics(items)
        self.state["quick_results"] = results["basic"]
        self.state["comprehensive_results"] = results["detailed"]
        
        self.state["final_report"] = self._generate_standard_report()
        return self.state
    
    @router(determine_processing_level, route_options=[Route.COMPREHENSIVE])
    def comprehensive_processing(self):
        """全面处理路径（带 Crew 协作）"""
        self.state["checkpoints"].append("comprehensive_processing")
        
        # 定义多个专业 Agent
        data_agent = Agent(
            role="Data Analyst",
            goal="Extract and prepare data for analysis",
            backstory="Expert in data preprocessing and feature engineering"
        )
        
        insight_agent = Agent(
            role="Insight Generator",
            goal="Generate actionable insights from data",
            backstory="Expert in statistical analysis and pattern recognition"
        )
        
        # 创建分析任务
        tasks = [
            Task(
                description="Clean and prepare the dataset",
                agent=data_agent,
                expected_output="Cleaned dataset ready for analysis"
            ),
            Task(
                description="Perform comprehensive statistical analysis",
                agent=insight_agent,
                expected_output="Detailed insights and recommendations"
            )
        ]
        
        crew = Crew(
            agents=[data_agent, insight_agent],
            tasks=tasks,
            process="sequential"
        )
        
        crew_result = crew.kickoff()
        self.state["comprehensive_results"] = {
            "crew_output": crew_result,
            "additional_metrics": calculate_metrics(self.state["raw_data"])
        }
        
        self.state["final_report"] = self._generate_comprehensive_report()
        return self.state
    
    def _generate_summary_report(self) -> str:
        return f"""
        Quick Analysis Report
        =====================
        Items Analyzed: {len(self.state.get('quick_results', []))}
        Processing Level: {self.state['processing_level']}
        Status: Complete
        """
    
    def _generate_standard_report(self) -> str:
        return f"""
        Standard Analysis Report
        ========================
        Basic Results: {len(self.state.get('quick_results', []))}
        Detailed Results: {len(self.state.get('comprehensive_results', {}))}
        Processing Level: {self.state['processing_level']}
        Status: Complete
        """
    
    def _generate_comprehensive_report(self) -> str:
        return f"""
        Comprehensive Analysis Report
        =============================
        Processing Level: {self.state['processing_level']}
        Crew Results: Available
        Metrics: {len(self.state.get('comprehensive_results', {}).get('additional_metrics', []))}
        Status: Complete
        """


# 辅助函数
def simple_analysis(item: dict) -> dict:
    """简单分析单个项目"""
    return {"id": item.get("id"), "score": item.get("value", 0) * 0.8}


def parallel_analytics(items: list) -> dict:
    """并行执行多种分析"""
    import concurrent.futures
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        basic_future = executor.submit(analyze_basic, items)
        detailed_future = executor.submit(analyze_detailed, items)
        pattern_future = executor.submit(find_patterns, items)
        trend_future = executor.submit(analyze_trends, items)
        
        return {
            "basic": basic_future.result(),
            "detailed": detailed_future.result(),
            "patterns": pattern_future.result(),
            "trends": trend_future.result()
        }


def analyze_basic(items: list) -> list:
    return [simple_analysis(item) for item in items]


def analyze_detailed(items: list) -> dict:
    return {"total": len(items), "avg_value": sum(i.get("value", 0) for i in items) / len(items) if items else 0}


def find_patterns(items: list) -> list:
    return [{"pattern": i % 3, "count": i} for i in range(min(5, len(items)))]


def analyze_trends(items: list) -> dict:
    return {"trend": "increasing" if len(items) > 5 else "stable"}


def calculate_metrics(data: dict) -> list:
    return ["metric_1", "metric_2", "metric_3"]


# 使用示例
if __name__ == "__main__":
    # 创建示例数据
    sample_data = {
        "items": [
            {"id": i, "value": i * 10, "category": f"cat_{i % 3}"}
            for i in range(50)
        ]
    }
    
    # 执行流水线
    pipeline = DataPipelineFlow()
    result = pipeline.test(sample_data)
    
    print(f"Processing Level: {result['processing_level']}")
    print(f"Checkpoints: {result['checkpoints']}")
    print(f"Final Report:\n{result['final_report']}")
```

---

## 相关资源

- [CrewAI 官方文档](https://docs.crewai.com/)
- [CrewAI Flows 指南](https://docs.crewai.com/concepts/flows)
- [MkDocs Material 主题配置](./mkdocs-configuration.md)