---
title: CrewAI Flows 编排
description: 介绍 CrewAI Flows 的高级编排功能，涵盖从基础装饰器到复杂状态管理和错误恢复策略。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# CrewAI Flows 编排

本文档介绍 CrewAI Flows 的高级编排功能，涵盖从基础装饰器到复杂状态管理和错误恢复策略的全部核心概念。

## 1. CrewAI Flow 概述

CrewAI Flows 是 CrewAI 框架中用于构建**有向无环工作流**（DAG）的模块。它允许开发者以声明式方式编排多个 Agent、任务和工具的执行顺序，支持顺序执行、并行执行以及条件分支逻辑。

Flows 的核心设计目标：

- **可组合性**：将复杂任务拆分为可复用的步骤
- **可观测性**：内置状态跟踪和执行日志
- **灵活性**：支持自定义 Python 逻辑、循环和条件判断
- **可靠性**：内置错误处理和恢复机制

Flows 适用于构建自动化流水线、多阶段数据处理管道、以及需要人机协作的复杂任务链。

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

## 3. 顺序执行、并行执行与条件执行

### 3.1 顺序执行（Sequential）

顺序执行是最基本的编排模式，任务按定义顺序依次执行，每个任务在前一个任务完成后才开始。

```python
# 第 1 段：导入依赖——分清“流程层”和“团队层”两套 API
# Flow/flow/start 属于流程层：负责把多个步骤串成有状态、可比分支的编排单元；
# Agent/Task/Crew 属于团队层：Agent 是“谁来做”，Task 是“做什么”，Crew 是把两者组装起来的执行容器。
# 关键数据流：Agent 实例 → Task 实例（绑定 Agent）→ Crew → kickoff() 的返回值。
# 易错点：这里的 start 在本片段中没有被使用，说明该教学片段只保留了“顺序执行”这一条主线；
# 真实项目里带分支/循环的流程，入口通常由被 @start 标注的方法（或 @router 分支）承担。
from crewai.flow.flow import Flow, flow, start
from crewai import Agent, Task, Crew

# 第 2 段：把普通函数注册成一条可被框架驱动的流程入口
# @flow 把函数的函数体声明为流程的“主分支”，返回值即这次流程运行的产物；
# 之所以能这样写，是因为本例没有分支、没有循环、没有需要跨步骤共享的状态，
# 用一个无参函数就足以表达“一条直线跑到底”的流水线。
# 易错点：@flow 修饰的是“流程定义”而不是普通工具函数，不要把它与业务函数混用；
# 一旦后续需要外部输入或状态读写，就该改用带 state 的 Flow 子类，而不是在这里加参数。
@flow
def sequential_pipeline_flow():
    # 第 3 段：先建 Agent，再依赖 Agent 建 Task，顺序不可颠倒
    # create_agents()/create_tasks() 是外部封装（本片段省略了实现），这种拆分让“角色定义”与“任务定义”解耦，
    # 便于单独测试角色提示词，也方便复用同一批 Agent 跑不同任务集。
    # 关键数据流：agents 列表被作为参数交给 create_tasks，因为每个 Task 必须绑定一个 Agent 来决定“谁来干”；
    # 若先建 tasks 再造 agents，就只能事后回填 Task.agent，破坏依赖方向且容易漏绑。
    agents = create_agents()
    tasks = create_tasks(agents)
    
    # 第 4 段：声明式装配 Crew——构造阶段不产生任何 LLM 调用
    # 这段代码只是“描述”执行计划：把 Agent 池和 Task 序列交给 Crew，真正的开销全部推迟到 kickoff() 时发生，
    # 所以 Crew(...) 构造本身很快，不能把它当作“已经开始跑了”。
    # agents 与 tasks 传入的是同一批对象的引用（不是深拷贝），构造后再改动 agent 的属性会连带影响已装配的 crew。
    crew = Crew(
        agents=agents,
        tasks=tasks,  # tasks 列表顺序即执行顺序；Crew 默认不会替你做拓扑排序，依赖要靠 Task.context 显式表达
        verbose=True  # 打印每个 Agent 的推理与工具调用过程：教学/排障用，生产环境会明显增加日志噪声与开销
    )
    
    # 第 5 段：启动执行并把结果交给上层流程
    # kickoff() 是同步阻塞调用，默认按 tasks 列表顺序串行推进，复杂度约等于 Σ(每个 Task 触发的 LLM 调用次数 × 单次调用成本)，
    # 而 Task 的“重试 + 工具调用轮次”通常才是真正的耗时来源，Agent 数量只是放大系数。
    # 边界与易错点：返回值是 CrewOutput（结构化结果对象），此处直接作为流程函数的输出，框架会把它当作该 flow 的产物；
    # 任何 LLM/工具异常都会向上冒泡并中断整条流程，需要重试或兜底时应在这一层外面包一层策略，而不是在 Crew 里硬改。
    # 另外，若某个 Task 绑定的 Agent 不在 agents 列表中，会在运行时才报错——这是装配阶段最容易漏的检查。
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

# 第 1 段：导入依赖（编排框架 + 日志 + 异步运行时）
# Flow/flow 提供"把普通函数声明成流程"的能力，FlowLogger 用于流程级日志追踪，
# asyncio 是并行协程调度的底座——三者缺一，后面要么没有流程语义，要么无法并发。
# 注意：Flow 此处虽未直接使用，通常是作为类型标注/继承基类的保留导入，勿删。

# 第 2 段：用 @flow 声明一个"并行编排"流程入口
# @flow 会把被装饰函数注册成一个可被框架调度/观测的 Flow，而不是普通函数；
# 因此这里的返回值语义是"流程要执行的内容"，而非最终业务数据。
@flow
def parallel_flows():
    # 使用 asyncio.gather 并行执行多个 Flow

    # 第 3 段：定义内部协程，并用 gather 并发拉起多个子流程
    # 为什么要包一层 async def：gather 必须运行在事件循环里，外层同步的 parallel_flows
    # 只负责"声明"，真正 await 的动作交给返回的这个协程，避免在定义阶段就阻塞。
    # 关键点 return_exceptions=True：任一子流程抛错时不会被立即中断，
    # 而是把异常对象当作结果塞回 results 列表——保证三个分支的成败都能被聚合观察，
    # 由调用方按位置判断第 i 项是结果还是 Exception（易错点：不做判断直接取值会踩异常）。
    # 并发收益：总耗时约为 max(flow_a, flow_b, flow_c)，而非三者之和。
    async def run_parallel():
        results = await asyncio.gather(
            flow_a(),
            flow_b(),
            flow_c(),
            return_exceptions=True
        )
        return results

    # 第 4 段：返回协程对象交由外层事件循环驱动
    # 注意此处没有 await，返回的是"待执行的协程"，调用方需 await 或
    # asyncio.run(...) 才会真正触发 run_parallel；直接取返回值不会产生任何执行。
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
# 第 1 段：导入依赖与定义"路由标签"枚举（这一段建立流程可用的分支标识）
# 说明：@router 装饰器通过"上游节点返回的标签"与"下游节点声明的 route_options"做等值匹配，
# 因此标签必须是稳定、可比较的值；用 Enum 而非裸字符串可避免拼写错误导致的静默丢分支。
# 易错点：本段只导入了 Flow/flow/router/Route，但后面用了 @start，实际运行时需要额外
# 从 crewai.flow.flow 导入 start（或使用该库提供的等效入口），否则会在类定义阶段报 NameError。
from crewai.flow.flow import Flow, flow, router, Route
from enum import Enum

class RouteOptions(Enum):
    # 枚举值（右侧字符串）是真正参与匹配和持久化的内容；成员名只是代码里的可读别名。
    HIGH_PRIORITY = "high_priority"
    STANDARD = "standard"
    LOW_PRIORITY = "low_priority"
    ESCALATE = "escalate"

# 第 2 段：定义 Flow 主体与唯一入口节点（这一段负责"读文档 → 分类 → 写入共享状态"）
# @flow 会把普通类改造成可编排的 Flow：自动收集 @start/@router/@listen 标记的方法并生成执行图。
# @start() 声明流程起点，它没有任何上游依赖，所以整个流程从这里被触发。
@flow
class DocumentProcessingFlow(Flow):
    @start()
    def classify_document(self):
        # 关键数据流：self.state 是整条流程唯一的跨节点数据总线，
        # 分类结果必须以 state 形式落地，下游 router 才能读到，不能只靠局部变量传递。
        # 注意：classify 是未定义的外部占位函数，教学示例需自行实现或注入。
        # 本节点没有 return，即隐式返回 None —— 这是刻意的：它不通过返回值向后传递，
        # 而是由下游 @router(classify_document) 显式声明"我在这个节点之后运行"。
        self.state["classification"] = classify(self.state["document"])

    # 第 3 段：优先级路由器（这一段把连续的 priority 数值离散成 4 个互斥的 RouteOptions 标签）
    # @router(上游节点) 表示本节点在上游完成后执行，并且返回的标签将决定走哪条分支。
    # 关键意图：把"业务判断"和"具体处理逻辑"解耦，新增档位时只改这里，不动下游处理器。
    # 易错点：必须从高到低用 elif 判断，且阈值为 >=9 / >=5 / >=2 / <2，
    # 区间是左闭右开的分段（9-∞、5-8、2-4、<2）；顺序颠倒或写成 > 会漏掉边界值。
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
    
    # 第 4 段：四条互斥分支处理器（这一段按标签各自执行对应策略，并回写处理结果）
    # 四个节点都挂在同一个上游 route_based_on_priority 上，靠 route_options 做白名单过滤：
    # 只有"上游返回值 ∈ route_options"的那个节点会被激活，其余三个被跳过。
    # 由于上游每次只返回一个枚举值，实际是四选一的分支，而不是四路并行。
    # 复杂度：每个分支内部都是一次 O(1)（或由 process_* 自身决定）的委托调用，流程开销在调度层。
    @router(route_based_on_priority, route_options=[RouteOptions.HIGH_PRIORITY])
    def process_high_priority(self):
        # process_expedited / process_standard / process_batch 均为外部占位函数，需自行实现。
        # 返回值同时承担两个职责：写入 state 供后续节点使用，并作为该节点的输出参与流程记录。
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
    
    # 边界条件：priority < 2（含非法/缺失值落入 else）时才走到这里。
    # 该分支不产生 processed，而是打上 escalated 标记并触发人工介入，属于"逃逸路径"，
    # 因此返回整个 state（便于人工看到分类上下文），而不是单一处理结果。
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
# 第 1 段：依赖导入（引入工具基类与流程装饰器）
# BaseTool 是 CrewAI 提供的"可被 Agent 调用"的工具抽象，子类只需实现 _run，
# 参数校验、错误包装、调用日志都由框架在 run() 里完成，因此业务方不该绕过它。
from crewai.tools import BaseTool
# flow 是把普通函数标记为流程入口的装饰器；它并不等于 Flow 子类那套
# @start/@listen 事件驱动 API，两者别混用（Flow 被导入但此处未用到）。
from crewai.flow.flow import Flow, flow

# 第 2 段：校验工具的类声明与元信息
# name/description 不是给人看的装饰：LLM 正是依据它们决定"何时选用这个工具"，
# 措辞含糊会直接拉低 Agent 的选工具准确率，所以必须与 _run 的真实行为严格一致。
class DataValidationTool(BaseTool):
    name: str = "data_validation"
    description: str = "Validates input data against defined rules"
    
    # 第 3 段：校验主逻辑——逐字段比对规则，累积全部错误而非遇到首个错误就中断
    # 用列表累积而不是抛异常：批量表单场景下一次性返回所有问题，调用方可一轮改完，
    # 避免"改一个、报一个"的多轮往返，也让输出天然可 JSON 序列化。
    def _run(self, data: dict, rules: dict) -> dict:
        errors = []
        
        # 第 4 段：遍历规则，先处理"字段是否存在"这一层
        # 顺序是关键：必须先判缺失再判类型，否则对不存在的 key 取 data[field] 会直接
        # KeyError 把流程打断。required 缺省 False，意味着"缺失但非必需"时静默跳过，
        # 这正是"可选字段"语义的落地方式。
        for field, rule in rules.items():
            if field not in data:
                if rule.get("required", False):
                    errors.append(f"Missing required field: {field}")
            # 第 5 段：字段存在时做类型校验
            # 用 rule.get("type") 作真值判断，等于说没配 type 的规则整段跳过——校验是
            # "按需生效"的，这也让同一套 rules 能混合必填检查和类型检查。
            # 易错点：isinstance 遵循继承链，issubclass(bool, int) 为真，于是 age=True
            # 会被判为合法 int；业务上要拒绝布尔就得额外排除 bool。
            elif rule.get("type"):
                expected_type = rule["type"]
                if not isinstance(data[field], expected_type):
                    # 报错串同时给出期望类型名与实际类型名，便于调用方或 LLM
                    # 直接定位并自行修复，无需再去翻代码猜参数格式。
                    errors.append(
                        f"Invalid type for {field}: "
                        f"expected {expected_type.__name__}, "
                        f"got {type(data[field]).__name__}"
                    )
        
        # 第 6 段：汇总并返回结果
        # 固定返回 {valid, errors} 两个键，把"是否通过"和"为何没通过"合成一个可序列化
        # 对象，作为工具输出回传给 Agent。复杂度 O(F)，F 为规则条数，与 data 的字段
        # 总量无关——未被规则覆盖的字段一律不检查。
        return {"valid": len(errors) == 0, "errors": errors}

# 第 7 段：流程入口（被 @flow 装饰的函数即编排起点）
# @flow 把普通函数接入 CrewAI 流程运行时；入参 data 是外部原始输入，函数内不直接
# 改动它，而是把各阶段快照放进 state，保证原始数据始终可追溯、可回放。
@flow
def validated_processing_flow(data: dict):
    # 第 8 段：初始化流程状态
    # 用三个槽位分别记录数据在"原始 / 已校验 / 已处理"阶段的形态，出问题时一眼能看出
    # 是哪一步把数据改坏的；validated_data 初值为 None，兼作"尚未通过校验"的哨兵。
    state = {"original_data": data, "validated_data": None, "processed": None}
    
    # 第 9 段：实例化校验工具并执行校验
    # 调用的是 BaseTool.run 而非 _run：run 才是框架暴露的公开入口，负责参数绑定、
    # 结果封装与异常兜底，直接调 _run 会绕开这些保护。
    # 规则字典在此硬编码，真实项目通常外置为配置或由上游传入，以便按业务切换。
    validator = DataValidationTool()
    validation_result = validator.run(
        data=data,
        rules={
            "name": {"required": True, "type": str},
            "age": {"required": True, "type": int},
            "email": {"required": True, "type": str}
        }
    )
    
    # 第 10 段：校验失败分支——提前返回，阻断后续处理
    # 遵循 fail-fast：不合规数据绝不流入 process_validated_data，防止脏数据落库；
    # errors 写进 state 供调用方读取明细。
    # 边界条件：本分支的返回结构比成功分支多一个 "errors" 键，两条出口的 shape 不一致，
    # 调用方必须按 valid 与否分别取值，否则会踩 KeyError。
    if not validation_result["valid"]:
        state["errors"] = validation_result["errors"]
        return state
    
    # 第 11 段：校验通过分支——回填状态并触发处理
    # 先写 validated_data 再调用处理函数，这样即便处理阶段抛异常，state 里也留有
    # "该数据已通过校验"的证据，便于断点重试。
    # 注意：process_validated_data 在本文件中并未定义，运行时需由外部注入或同模块提供，
    # 否则此处会抛 NameError——这是这段代码作为示例留白的最大坑。
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

## 5. Flow 状态管理

### 5.1 状态类定义

```python
# 第 1 段：导入依赖（搭好 Flow 框架、类型系统与枚举工具的入口）
# CrewAI 的 Flow 负责"节点编排 + 状态携带"，TypedDict 提供静态结构校验，Enum 保证状态取值收敛。
# 注意：这里只导入了 Flow 和 flow，下面用到的 @start 并未导入——真实运行前需补 `from crewai.flow.flow import start`，否则会在装饰阶段抛 NameError。
from crewai.flow.flow import Flow, flow
from typing import TypedDict
from enum import Enum

# 第 2 段：处理状态枚举（把"字符串魔法值"升级为受约束的有限状态机）
# 继承 str 是为了让枚举值能直接被 JSON 序列化 / 与数据库字符串字段比较，无需额外转换。
# 枚举成员是单例，比较用 `is` 或 `==` 都安全；但拼接字符串时拿到的是成员而非值，需显式 .value。
class ProcessingStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

# 第 3 段：文档状态契约（定义整条流程共享的 state 形状）
# total=False 表示所有键都可选：流程刚启动时 state 是空字典，节点只能"逐步填充"，不能假设字段已存在。
# 边界条件：TypedDict 只在静态检查期生效，运行时不会做类型校验，误写键名或类型错误不会被自动拦截。
class DocumentState(TypedDict, total=False):
    document_id: str
    content: str
    status: ProcessingStatus
    metadata: dict
    results: list[dict]
    error: str | None

# 第 4 段：声明 Flow 并接入初始化节点（流程入口，负责建立状态基线）
# @flow 把普通类转换成 CrewAI 可调度的流程对象；Flow[DocumentState] 让成员方法内的 self.state 获得类型提示。
# @start() 标记该方法为流程的起始节点，执行顺序由装饰器决定而非代码书写顺序，因此初始化必须写在最前面。
@flow
class DocumentStateFlow(Flow[DocumentState]):
    @start()
    def initialize(self):
        # 显式写入三个字段，避免后续节点读到不存在的键而触发 KeyError；这是"先建契约、再填数据"的防御式写法。
        self.state["status"] = ProcessingStatus.PENDING  # 起始态统一为 PENDING，后续节点按需推进到 IN_PROGRESS/COMPLETED/FAILED
        self.state["results"] = []  # 用可变列表做累加容器；注意不要用可变对象做默认参数，这里每次调用都新建实例
        self.state["error"] = None  # 用 None 而非空字符串，便于用 `is None` 区分"未出错"和"出错但信息为空"
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

# 第 1 段：依赖导入与外部符号约定（本文件的可移植性边界）
# json 负责状态序列化，Path 提供跨平台的路径对象，datetime 生成可读、可排序的 ISO 时间戳。
# 注意：Flow、start、perform_work 在本文件中未定义也未导入，属于运行时注入或同包内其他模块提供的符号；
# 教学演示时需补上 `from crewai.flow.flow import Flow, start` 之类的导入，否则会 NameError。

class PersistentStateFlow(Flow):
    # 第 2 段：构造与状态载入（决定"首次运行"与"恢复运行"两条分支）
    # 状态文件路径写死在当前工作目录，意味着进程的 CWD 就是状态的"身份标识"：
    # 换个目录启动同一个流程会读到一份全新的空状态，这是隐式耦合，生产环境应改成可注入路径。
    def __init__(self):
        super().__init__()
        self.state_file = Path("flow_state.json")
        self._load_state()
    
    # 第 3 段：_load_state —— 用"文件是否存在"区分冷启动与热恢复
    # 已存在则整体替换 self.state，而不是做 key 级合并：旧文件里缺失的字段不会自动补默认值，
    # 因此后续代码必须用 .get() 之类的容错读取，不能假设某个键一定存在。
    # 冷启动只写入 created_at 而不落盘——真正持久化要等到第一次 _save_state 调用。
    def _load_state(self):
        if self.state_file.exists():
            with open(self.state_file, "r") as f:
                self.state = json.load(f)
        else:
            self.state = {"created_at": datetime.now().isoformat()}
    
    # 第 4 段：_save_state —— 每次落盘前刷新时间戳的统一出口
    # 把 updated_at 的写入收敛在这一个方法里，保证任何调用点都自动获得最新时间，避免调用方漏写。
    # 易错点有三：default=str 是兜底，遇到 datetime/自定义对象会退化成字符串而非报错，
    # 反序列化时拿到的是 str 而不是原类型；indent=2 便于人读但增大体积；
    # 这里是"就地覆盖写"，没有写临时文件 + rename 的原子性，进程在写一半时崩溃会留下损坏的 JSON。
    def _save_state(self):
        self.state["updated_at"] = datetime.now().isoformat()
        with open(self.state_file, "w") as f:
            json.dump(self.state, f, indent=2, default=str)
    
    # 第 5 段：process 主流程（@start 标记入口）——"改状态 → 落盘 → 干活 → 再落盘"的检查点模式
    # 分两次落盘是刻意的：第一次记录"已进入该步骤"，第二次记录"结果已产出"。
    # 若 perform_work 中途崩溃，重启后仍能从文件里看到 step=1，从而判断任务曾被中断（即最小可用的断点恢复）。
    # 边界条件：state.get("data") 在冷启动时为 None，perform_work 必须能处理这种输入；
    # 另外本方法没有 try/except，异常会直接向上抛出，此时 updated_at 保留的是上一次成功保存的时间。
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
# 第 1 段：任务入口与输入契约（@flow 包装的并行结果汇总单元）
# @flow 让本函数成为可被编排、重试、观测的独立任务节点，因此函数体必须"纯"：只依赖入参、只产出返回值。
# parallel_results 是各并行分支的局部结果列表；调用方只保证它是 list，**不保证每个 dict 内部字段齐全**，
# 这一点决定了第 3 段必须全部使用 .get(...) 而不是下标取值。
@flow
def merging_state_flow(parallel_results: list[dict]):
    # 合并多个并行执行的结果
    # 第 2 段：预置累加器骨架（先定形状，再填内容）
    # 先把"最终结果的完整形状"一次性写死（空列表 + 零值指标），这样即使 parallel_results 为空，
    # 也能返回结构一致的 merged，下游不必写 None / 缺键判断（这一步是幂等合并的前提）。
    # 易错点：必须用全新字面量而非类属性或共享引用，否则多次调用会交叉污染。
    merged = {
        "total_items": 0,
        "all_items": [],
        "aggregated_metrics": {
            # count 只是占位，最终会被第 4 段用 total_items 覆盖；sum 则一直保留原始累加和。
            "count": 0,
            "sum": 0,
            # avg 预置 0 是为了空输入时不出现缺键，但它在语义上代表"未定义"，见第 4 段边界说明。
            "avg": 0
        }
    }

    # 第 3 段：单次遍历的顺序归并（时间 O(n)，额外空间 O(所有 items 元素数)）
    # 一个循环同时推进三个累加量，避免多次遍历；每处都用 .get(key, 默认值)，
    # 使"分支跳过/失败导致字段缺失"等价于"该分支贡献 0 或空集合"，从而不抛 KeyError。
    # 易错点：extend 是浅扩展，items 里的元素仍是原对象的引用，后续改动双方可见；
    # 且 all_items 的顺序 = 并行结果被收集的顺序，不保证稳定，依赖序的下游需自行排序。
    for result in parallel_results:
        merged["total_items"] += result.get("count", 0)  # 行尾：count 缺失按 0 计
        merged["all_items"].extend(result.get("items", []))  # 行尾：items 缺失按空列表计
        merged["aggregated_metrics"]["sum"] += result.get("total", 0)  # 行尾：total 缺失按 0 计

    # 第 4 段：派生指标收口（唯一的分支点，也是 avg 的唯一定义处）
    # count 与 total_items 对齐，语义统一为"条目数"；再用守卫条件做除法，
    # 避免空输入触发 ZeroDivisionError。
    # 边界/易错点：total_items 为 0 时 avg 保持占位值 0，含义是"未定义"而非"平均值为 0"；
    # 另外 sum 来自各分支的 total，count 来自各分支的 count，若同一分支这两者口径不一致，
    # 算出的 avg 是混合口径的近似值——需在数据源头保证 count 与 total 同量纲。
    merged["aggregated_metrics"]["count"] = merged["total_items"]
    if merged["aggregated_metrics"]["count"] > 0:
        merged["aggregated_metrics"]["avg"] = (
            merged["aggregated_metrics"]["sum"] / 
            merged["aggregated_metrics"]["count"]
        )

    # 第 5 段：返回合并快照
    # 返回的是本地新建的容器，与 parallel_results 只共享 items 中的元素引用，不共享容器本身；
    # 调用方对 merged 的增删改不会回写任何分支结果。
    return merged
```
### 5.5 类型安全的状态管理

```python
from pydantic import BaseModel, Field
from crewai.flow.flow import Flow, flow

# 第 1 段：定义状态模型——把整个流程的“共享内存”声明成一个强类型对象
# 为什么这么做：CrewAI 的 Flow 在步骤之间传递数据时，需要一个显式的状态载体；
# 用 Pydantic 模型声明状态，等于给流程加了一份可校验、可序列化、可调试的数据契约。
# 易错点：可变默认值（list/dict）必须用 default_factory，若写成 `= []` 会被 Pydantic
# 在类定义阶段拒绝或造成所有实例共享同一对象；`Field` 就是为此引入的。
class AnalysisState(BaseModel):
    input_data: str                                    # 唯一必填字段：外部传入的原始数据，作为流程的起点
    processed_data: str = ""                           # 清洗/转换后的中间态，默认空串便于“未处理”可判定
    analysis_results: list[str] = Field(default_factory=list)   # 每次分析产出的多条结论，工厂函数保证实例间互不共享
    final_report: str = ""                             # 面向最终用户的成品文本，仅在末段被写入
    metadata: dict = Field(default_factory=dict)       # 预留的开放扩展位：耗时、模型名、trace_id 等都不必改模型
    iteration_count: int = 0                           # 执行计数：用于重试上限、幂等性判断或循环终止条件

# 第 2 段：用 @flow 把普通函数升级为可编排的 Flow
# 关键点：装饰器会把函数体包装进一个动态生成的 Flow 子类，函数本身变成其中
# 的一个步骤；返回类型标注 AnalysisState 让框架能推断出状态模型（类型即配置）。
# 注意 `Flow` 是导入的基类，此处未直接使用，属于为扩展自定义 Flow 类预留的入口。
@flow
def typed_state_flow(data: str) -> AnalysisState:
    # 第 3 段：初始化状态——构造唯一的状态实例
    # 数据流：外部入参 data -> state.input_data，此后所有步骤都只读写 state，不再碰裸参数，
    # 这样流程无论被谁调用、在哪一步中断，状态都是自洽可恢复的。
    state = AnalysisState(input_data=data)
    
    # Pydantic 会自动验证类型
    # 第 4 段：数据转换与计数——把原始输入变成可分析的形态
    # 赋值时 Pydantic 会做类型校验/强制转换，若 transform_data 返回非字符串会立刻在此抛错，
    # 相当于把“脏数据”挡在入口，而不是等到生成报告时才失败（fail-fast）。
    # 复杂度取决于 transform_data 的实现，此处仅是一次 O(1) 赋值 + 自增。
    state.processed_data = transform_data(state.input_data)
    state.iteration_count += 1                         # 计数放在转换之后：只有真正跑过一遍才计入，便于统计有效执行次数
    
    # 第 5 段：核心计算——分析并生成报告（流水线顺序依赖）
    # 这两步是串行强依赖：analyze 只读 processed_data，generate_report 只读 analysis_results；
    # 这种“窄接口”让每一步都能被单独替换或单测，而不必构造整个上游状态。
    # 边界条件：若 analysis_results 为空列表，generate_report 应自行处理空输入，而不是靠调用方兜底。
    state.analysis_results = analyze(state.processed_data)
    state.final_report = generate_report(state.analysis_results)
    
    # 第 6 段：收尾——序列化后返回
    # 为什么用 model_dump()：Flow 的输出需要跨进程/跨序列化边界（日志、API、持久化），
    # 返回纯 dict（含 list/dict 等原生类型）比返回模型实例更通用。
    # 易错点：函数签名标注的是 AnalysisState，实际返回的是 dict——注解表达“逻辑上的状态类型”，
    # 而非运行时类型；若下游按模型属性访问会失败，需要 AnalysisState(**result) 重建。
    return state.model_dump()
```
## 6. 错误处理与恢复

### 6.1 基础错误处理

```python
# 第 1 段：装饰器与函数签名（把普通函数注册为可编排的流程单元）
# @flow（通常来自 Prefect 等编排框架）会把这层函数包装成一个可被调度、观测状态的 Flow，
# 从而自动获得运行记录、日志与重试能力；去掉装饰器函数仍可运行，但会退化成普通函数。
@flow
def error_handling_flow(data: str):
    # 第 2 段：状态容器初始化（把输入、结果、错误、重试次数收拢进一个字典）
    # 用单个 dict 承载整个流程状态，而非多个局部变量：返回值只暴露 state 一个对象，
    # 调用方无需关心内部变量个数；retry_count 先占位 0，为后续失败重试逻辑预留字段。
    state = {"data": data, "result": None, "error": None, "retry_count": 0}
    
    # 第 3 段：受保护的核心调用（执行可能抛异常的外部/不可信操作）
    # 只把 risky_operation 这一句放进 try，刻意收窄保护范围：若把返回值的后续处理也塞进来，
    # 处理阶段的异常会被误判成"操作本身"的异常，掩盖真实错误来源，调试时极难定位。
    try:
        state["result"] = risky_operation(data)
    # 第 4 段：按类型分层捕获异常（从具体到宽泛，顺序不可颠倒）
    # except 自上而下匹配，而 Exception 是绝大多数异常的基类；一旦把它排在前面，
    # 后面的 ValueError / ConnectionError 分支将永远不可达——Python 不报错，只会静默吞掉，属高危易错点。
    # 各分支只写 state["error"] 而不 re-raise，使成功与失败都能走统一出口，返回结构一致的 state 供上层判断。
    except ValueError as e:
        state["error"] = f"Validation error: {str(e)}"
    except ConnectionError as e:
        state["error"] = f"Connection failed: {str(e)}"
    except Exception as e:
        state["error"] = f"Unexpected error: {str(e)}"
    
    # 第 5 段：统一返回（成功与失败共用同一出口）
    # 成功时 error 为 None，失败时 result 为 None，二者互为镜像，便于调用方用同一套逻辑判定。
    # 边界条件：SystemExit、KeyboardInterrupt 等 BaseException 子类不会被 Exception 捕获，函数会直接中断，
    # 这是有意设计——避免吞掉用户主动终止的信号。时间复杂度 O(1)（不含 risky_operation 自身开销）。
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
# 第 1 段：依赖与状态机枚举（熔断器的三态定义）
# 熔断器本质是一个有限状态机：CLOSED →（连续失败达阈值）→ OPEN →（超时冷却）→ HALF_OPEN →（探测成功）→ CLOSED，
# 或从 HALF_OPEN（探测失败）→ OPEN。先把状态枚举固定下来，后续所有判断都只依赖这三个值，避免用字符串裸奔导致拼写错误。
import time
from enum import Enum

class CircuitState(str, Enum):
    # 同时继承 str，使枚举值在 JSON 序列化/日志打印/== 字符串比较时都能直接使用（教学站点常忽略这点）
    CLOSED = "closed"      # 正常状态
    OPEN = "open"          # 熔断状态
    HALF_OPEN = "half_open"  # 半开状态

# 第 2 段：熔断器构造与阈值配置（把"策略参数"与"运行时状态"分开）
# failure_threshold 是进入 OPEN 的失败次数阈值，timeout 是 OPEN 的冷却秒数；
# 二者是业务策略，来自构造参数以便不同依赖配置不同策略（例如读服务宽、写服务严）。
# 易错点：last_failure_time 初值设为 None 而不是 0，因为 time.time() 很大，用 0 会让"未失败过"也判定为已超时。
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0            # 连续失败计数，成功后必须清零，否则是"累计失败"而非"连续失败"
        self.last_failure_time = None     # 记录最近一次失败的墙钟时间，用于判断冷却是否结束
        self.state = CircuitState.CLOSED

    # 第 3 段：调用入口 call（先做准入判断，再代理执行）
    # 数据流：调用方传入 func/参数 → 熔断器决定"直接拒绝"还是"放行执行" → 成功/失败回调更新状态 → 结果或异常向上抛。
    # 设计意图：熔断判断必须是同步、O(1) 的，绝不能自身产生阻塞或远程调用，否则熔断器会变成新的故障点。
    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            # 只有 OPEN 状态且冷却时间已过，才降级为 HALF_OPEN 放行一次探测；否则快速失败（fail-fast），
            # 避免故障依赖被持续打爆，也给下游留出恢复时间。
            if time.time() - self.last_failure_time > self.timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenError("Circuit breaker is open")

        # 注意：这里同时覆盖 CLOSED 与 HALF_OPEN 两条路径——HALF_OPEN 恰好只允许这一路探测流量通过。
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            # 捕获宽泛的 Exception 是刻意的：任何异常都应计入失败并触发熔断，而不是只挑特定的网络异常。
            # 关键顺序：先更新状态再 raise，保证调用方看到的异常不会被熔断逻辑吞掉。
            self._on_failure()
            raise

    # 第 4 段：成功回调——把状态机"归零复位"
    # 一个成功信号即可认定依赖已恢复，因此同时清空失败计数并回到 CLOSED；
    # 若只改状态不清计数，下一次单次失败就可能立刻重新熔断，导致抖动。
    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    # 第 5 段：失败回调——累计失败并在达阈值时跳闸
    # 复杂度 O(1)。边界条件：在 HALF_OPEN 下探测失败时，failure_count 本已 >= threshold，
    # 自增后仍满足条件，于是状态重新落回 OPEN，last_failure_time 也被刷新，冷却期从头开始计时。
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

# 第 6 段：业务编排流（把熔断器包进一条可观测的流水线）
# 前置依赖：@flow、fragile_api_call、fallback_response、CircuitBreakerOpenError 需由外部框架/模块提供，
# 本段示例未定义它们——这是最容易踩的坑，直接运行会报 NameError，不代表结构有误。
# 数据流：data 原样保存在 state 里传递，执行结果写回 state["result"]，同时用 state["circuit_state"]
# 记录本次走的是成功、降级还是异常分支，方便上层做监控与重试决策。
@flow
def circuit_breaker_flow(data: dict):
    # 每次调用都新建 breaker，因此熔断窗口是"每请求独立"的；生产环境应把 breaker 提为模块级/单例，
    # 否则失败计数无法跨请求累计，熔断功能形同虚设。
    breaker = CircuitBreaker(failure_threshold=3, timeout=30)
    state = {"data": data, "result": None, "circuit_state": None}
    
    # 异常处理顺序是刻意设计的：CircuitBreakerOpenError 分支必须在 Exception 之前，
    # 否则"熔断打开"会被通用分支吞掉，降级逻辑永远不会执行。
    try:
        state["result"] = breaker.call(fragile_api_call, data)
        state["circuit_state"] = "success"
    except CircuitBreakerOpenError:
        # 快速失败路径：不重试、不再触碰下游，直接返回兜底数据，保证响应延迟可控。
        state["result"] = fallback_response()
        state["circuit_state"] = "fallback_used"
    except Exception as e:
        # 真实调用失败（如超时、5xx）：此时 breaker 内部已计入失败，这里只负责记录并继续向上交付状态。
        state["circuit_state"] = "error"
        state["error"] = str(e)
    
    return state
```
### 6.4 超时处理

```python
# 第 1 段：导入依赖（含一个隐藏的致命前提）
# signal 是 Unix 信号机制入口：SIGALRM + alarm() 只能在「主线程」注册与触发，
# 因此下面整套超时方案在子线程、Windows 或非主解释器里会失效甚至直接报错。
# wraps 用来把被装饰函数的元信息（__name__/__doc__ 等）复制到 wrapper，避免调试与框架反射时“身份丢失”。
# flow 是 CrewAI 的流程装饰器，把普通函数注册成可编排的 flow；Flow 是类式写法基类，本片段未直接使用。
import signal
from functools import wraps
from crewai.flow.flow import Flow, flow


# 第 2 段：自定义超时异常与信号处理函数
# 不复用内建 TimeoutError 而是单独定义，是为了把“信号触发的超时”与内建/第三方同名异常区分开，
# 便于上层精确捕获，避免误吞其它模块抛出的 TimeoutError。
# timeout_handler 必须签名 (signum, frame)：signum 是触发的信号号，frame 是中断处的栈帧，这里都用不到。
class TimeoutError(Exception):
    pass


def timeout_handler(signum, frame):
    # 关键机制：信号处理器会在“当前执行点”直接抛异常，从而打断正在运行的业务代码（栈展开到最近的 try）。
    # 注意：只能打断纯 Python 字节码；若函数正阻塞在 C 层调用（某些 IO/锁），异常要等其返回后才生效。
    raise TimeoutError("Operation timed out")


# 第 3 段：with_timeout —— 参数化的超时装饰器工厂
# 采用「工厂套装饰器」两层结构：外层接收 seconds 配置，内层返回可复用的 decorator，
# 这样才能写成 @with_timeout(30)（先调用工厂拿到 decorator），而不是把它当成单层装饰器使用。
def with_timeout(seconds: int):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 每次调用都重新注册：handler 是进程级全局状态，可能被其它代码覆盖，重设最稳妥。
            signal.signal(signal.SIGALRM, timeout_handler)
            # 设定 seconds 秒后向本进程投递一次 SIGALRM；粒度是整数秒，且 alarm 不叠加只覆盖。
            signal.alarm(seconds)
            try:
                result = func(*args, **kwargs)
            finally:
                # 易错点核心：无论正常返回还是抛异常都要取消定时器（alarm(0)），
                # 否则函数提前结束后残留的定时器会在“完全无关”的后续代码里炸出 TimeoutError。
                signal.alarm(0)
            return result
        return wrapper
    return decorator


# 第 4 段：入口流程函数与状态容器
# @flow 让 CrewAI 识别该函数为流程节点，可直接被编排/调用。
# 用普通 dict 承载 state，是“显式状态机”写法：调用方拿到的永远是同一结构，含结果、超时标记与错误信息。
@flow
def timeout_protected_flow(data: dict, timeout_seconds: int = 30):
    state = {"data": data, "result": None, "timed_out": False}
    
    # 第 5 段：把待执行的重活包进超时装饰器
    # 这里刻意用「内层闭包 + 捕获 data」来绑定本次调用的数据：装饰器本身不认识业务参数，
    # 于是超时能力与业务逻辑解耦，long_running_process 无需关心超时。
    @with_timeout(timeout_seconds)
    def timed_operation():
        return long_running_process(data)
    
    # 第 6 段：分级异常处理与降级
    # except 顺序不能颠倒：自定义 TimeoutError 继承自 Exception，
    # 若先写 except Exception 会把超时也吞掉，导致 timed_out 永远为 False。
    try:
        state["result"] = timed_operation()
    except TimeoutError:
        # 超时不是“失败”，而是可预期分支：置位标记并退化为部分结果，保证流程仍能继续往下走。
        state["timed_out"] = True
        state["result"] = partial_results(data)
    except Exception as e:
        # 其它异常统一收敛成字符串塞进 state，避免异常穿出破坏 flow 编排，同时保留可诊断信息。
        state["error"] = str(e)
    
    # 无论走哪个分支都返回；state 结构恒定，调用方靠 timed_out/error 判断实际结局。
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

# 第 1 段：引入依赖，搭建"状态容器 + 流程编排"所需的三块基石
# - dataclass/field 用来声明一个可变、可聚合的状态对象，让恢复逻辑在一个地方读写；
# - Optional 用于表达 checkpoint/error "可能为空"的语义，配合后续 None 判断实现断点续跑；
# - Flow/flow 是 CrewAI 的流程装饰器入口，@flow 会把普通函数注册成可被框架调度/持久化的 flow。
# 易错点：Flow 与 flow 在此处被导入但未直接使用，是预留的框架 API，删除反而可能影响扩展。

# 第 2 段：定义恢复状态（RecoveryState），所有跨步骤的"记忆"都集中在这里
# 为什么这样写：把 data/checkpoint/error/尝试次数等散落状态收进一个 dataclass，
# 恢复处理器只需操作一个对象，天然支持序列化持久化，重启后可原样回填继续跑。
# 关键数据流：data 是贯穿全流程的载荷；checkpoint 记录"当前/最近失败的步骤名"；
# checkpoints_completed 是已完成步骤的有序日志，用于断点续跑时跳过。
@dataclass
class RecoveryState:
    data: dict
    checkpoint: Optional[str] = None
    error: Optional[str] = None
    recovery_attempts: int = 0
    max_recovery_attempts: int = 3
    # 用 field(default_factory=list) 而非 `= []`：避免可变默认参数被所有实例共享的经典陷阱，
    # 保证每个 RecoveryState 实例都拿到独立列表，否则 checkpoint 记录会相互污染。
    checkpoints_completed: list[str] = field(default_factory=list)

# 第 3 段：流程入口与状态初始化
# @flow 让该函数成为框架可识别、可（在部分后端下）编排的 flow，是断点续跑能力的挂载点。
# 入参 initial_data 是不可变意图的输入，立刻封装进 RecoveryState，后续所有变更都走 state，避免副作用散逸。
@flow
def recoverable_flow(initial_data: dict):
    state = RecoveryState(data=initial_data)
    
    # 第 4 段：把执行管线声明为"有序的 (步骤名, 处理函数) 列表"
    # 为什么这样写：用数据描述流程顺序，而不是写死一长串顺序调用，
    # 这样"步骤名"既能当 checkpoints_completed 的标识，又能在恢复时定位断点；
    # 新增/调序步骤只需改这张表，主循环无需变动。
    checkpoints = [
        ("validate", validate_data),
        ("transform", transform_data),
        ("analyze", analyze_data),
        ("report", generate_report)
    ]
    
    # 第 5 段：逐步骤执行 + 失败恢复的主循环
    # 数据流：state.data 如同"传送带"，依次流经各 checkpoint_func，被前一步的输出覆盖；
    # 复杂度：对 N 个步骤线性 O(N)，每步最多重试 max_recovery_attempts 次，最坏 O(N * A)。
    for checkpoint_name, checkpoint_func in checkpoints:
        try:
            if state.checkpoint and state.checkpoint != checkpoint_name:
                # 从断点恢复：checkpoint 非空说明是续跑场景而非全新执行
                # 从断点恢复，跳过已完成的步骤
                # 依据 checkpoints_completed 判断该步是否已成功，已成功则 continue，
                # 从而避免重复执行产生副作用或重复计费；边界条件：checkpoint 为 None（首次运行）时整体跳过此分支。
                if checkpoint_name in state.checkpoints_completed:
                    continue
            
            # 关键行：把本步处理结果回写 state.data，形成"上一步输出=下一步输入"的链式数据流
            state.data = checkpoint_func(state.data)
            # 执行成功即登记完成日志，并推进 checkpoint 指针，为下次恢复提供锚点
            state.checkpoints_completed.append(checkpoint_name)
            state.checkpoint = checkpoint_name
            
        except CheckpointError as e:
            # 只捕获 CheckpointError（可预期的业务级失败），其余异常向上抛出，
            # 防止把真正的程序 bug 误当成"可恢复故障"而掩盖问题。
            state.error = str(e)
            
            if state.recovery_attempts < state.max_recovery_attempts:
                # 尚未耗尽重试额度：自增计数并交由 recovery_handler 修复/降级数据，
                # 注意循环不会在此重试同一步，而是继续走后续步骤（依赖修复后的 state.data）。
                state.recovery_attempts += 1
                state.data = recovery_handler(checkpoint_name, state.data)
            else:
                # 恢复额度耗尽：把失败步骤记为 checkpoint 并 break，
                # 使流程携带错误信息提前退出，同时保留断点供外部重启后续跑。
                state.checkpoint = checkpoint_name
                break
    
    # 第 6 段：组装对外返回结果
    # 除最终数据外，一并暴露 checkpoints（进度审计）、error（失败原因）与
    # recovered（是否发生过恢复，等价于 attempts>0），让调用方可据此决定重试或告警。
    return {
        "result": state.data,
        "checkpoints": state.checkpoints_completed,
        "error": state.error,
        "recovered": state.recovery_attempts > 0
    }
```
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

## 8. 相关资源

- [CrewAI 官方文档](https://docs.crewai.com/)
- [CrewAI Flows 指南](https://docs.crewai.com/concepts/flows)

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CrewAI 文档](https://docs.crewai.com/) | CrewAI 官方文档，Flow 与 Agent 编排 API 的权威出处。 | 先通读 Flows 相关章节，对照本页示例确认 Agent 与 Task 接法，再跑通最小 Flow。 |
| [Control Flow](https://book.leptos.dev/view/06_control_flow.html) | 官方 Control Flow 文档，讲清执行顺序与分支的规范写法。 | 精读控制流与条件分支章节，先画出本页 Flow 的分支决策图再落地实现。 |
| [CSS flow layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Flow_layout) | 官方 flow 布局总览，帮助厘清 flow 一词的本义。 | 带“文档流是什么”这一问题读定义段，读完用它作比喻讲解顺序执行。 |
| [Block and inline layout in normal flow](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Block_and_inline_layout) | 常规流下块级与行内布局规则，概念铺垫清晰。 | 读块级与行内差异小节，用其排队模型类比 Flow 中任务的先后次序。 |
| [In flow and out of flow](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/In_flow_and_out_of_flow) | 区分在流与脱离流，对应顺序与并行的边界。 | 读定义与示例小节，思考哪些任务可以脱离主流程并行执行。 |
| [Flow layout and overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Flow_layout_and_overflow) | 流布局与溢出处理，可类比任务溢出与降级策略。 | 读溢出处理策略小节，映射到 Flow 任务过多时的限流与降级思路。 |
| [Flow layout and writing modes](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Flow_layout_and_writing_modes) | 书写模式与流布局，说明流的走向是可以配置的。 | 浏览书写模式影响流方向一节，联想 Flow 执行顺序同样可配置。 |
| [MDN HTML 内容分类](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Content_categories) | HTML 内容分类规范，讲清嵌套与结构约束。 | 读内容分类一节，借约束思维检查各步骤输入输出的结构是否合法。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 使用 Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) | 含 Promise 链与错误处理示例，可对照并行执行写法。 | 读链式调用与错误处理两节，把串行任务改写为 Promise.all 风格再迁移。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Control flow and error handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling) | MDN 控制流与错误处理，异常捕获思路可直接迁移。 | 读 try/catch/finally 与抛出错误两节，带着 Flow 失败恢复问题做笔记并试写。 |
| [Atlassian Git 教程](https://www.atlassian.com/git/tutorials) | Git 工作流对比教程，帮助理解分支与主干并行模式。 | 读工作流对比部分，比较其分支并行与本页 Flow 顺序并行的差异。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格批量导出与字段补全 | 条件执行 + 并行执行 + 状态管理 | CrewAI Flow、分页任务队列、对象存储 | 设定单批行数上限，别把整表塞进 state |
| 低端安卓机型的首屏文案与降级素材生成 | 条件执行 + 状态管理 | CrewAI Flow、CDN、静态缓存 | Flow 只产出素材，首屏渲染不等待 Flow |
| 多人协作白板的会议纪要与待办抽取 | 并行执行 + 状态管理 + 人工审核 | CrewAI Flow、白板开放 API | 写回卡片要带幂等键，避免重复建卡 |
| 客服工单的意图分类与升级 | @flow 装饰器 + 错误处理与恢复 | CrewAI Flow、工单系统 Webhook | 分类失败的工单必须落人工队列 |
| 电商价格的每日巡检与改价建议 | 顺序执行 + 条件执行 | CrewAI Flow、cron 定时任务 | 只出建议，写价操作留在审批之后 |
| 代码仓库的 Issue 自动分诊 | 自定义逻辑与代码集成 + 状态管理 | CrewAI Flow、代码托管平台 API | 评论带幂等标记，重跑不重复评论 |
| 多语言文档的术语一致性检查 | 并行执行 + 状态合并 | CrewAI Flow、术语库文件 | 合并结果保留来源段落编号 |
| 合同条款的风险标注与复核 | @router 条件执行 + 人工审核 | CrewAI Flow、文档解析服务 | 每条标注可回溯到原文位置 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格批量导出

- **业务背景**：运营在后台导出订单表，行数从几百涨到上万，同步导出会把请求拖到超时。痛点是超时后不知道哪些行已经处理完，只能整表重跑。
- **怎么用本页知识解决**：先用 `@router` 按总行数分流，小表走同步分支，大表走分批分支；分批分支内部逐批处理，失败批次写入状态后继续下一批。
- 用 `@start` 读取总行数并写入 state，后续节点都能读到同一份数据。
- 用 `@router` 以行数为判断依据，把两条路径分开，避免同步路径被大表拖垮。
- 用 `@listen` 串联分批与执行两步，单批失败只记录批次编号，不中断整个 Flow。
- 重跑时先读 state 里的 `failed_batches`，只补失败批次。

```python
from crewai.flow.flow import Flow, listen, start, router
from pydantic import BaseModel

class ExportState(BaseModel):
    total_rows: int = 0              # 表格总行数
    batches: int = 0                 # 分批数量
    failed_batches: list[int] = []   # 失败批次编号

class ExportFlow(Flow[ExportState]):
    @start()
    def count(self):
        self.state.total_rows = count_rows()      # 读表统计行数并写入状态

    @router(count)
    def choose(self):
        return "batch" if self.state.total_rows > 5000 else "inline"  # 大表走分批

    @listen("batch")
    def split(self):
        self.state.batches = self.state.total_rows // 1000 + 1        # 每批约千行

    @listen(split)
    def run_batches(self):
        for i in range(self.state.batches):
            try:
                export_batch(i, size=1000)        # 处理第 i 批
            except Exception:
                self.state.failed_batches.append(i)   # 记录失败批次，继续下一批
```

- **怎么度量收益**：用 Prometheus Histogram 记录每批耗时，看 p50 与 p95；用 `failed_batches` 长度除以 `batches` 得到批次失败率。测量方法：导出同一份表格各跑一次 inline 分支与 batch 分支，记录总耗时与超时次数。成本指标在 LLM 调用处埋点，统计 token 数。
- **什么时候不该用**：表格只有几百行且数据库支持流式游标时，直接同步导出，引入 Flow 只增加排查成本。导出结果要求强一致快照时，分批读取跨越多个时间点，会读到不一致的数据。

#### 场景 2：低端安卓机型首屏文案与降级素材生成

- **业务背景**：首屏文案与图片要按机型档位出不同版本，低端机只能接受纯文本降级稿。痛点是素材生成流程串行跑，档位多的版本要排队等。
- **怎么用本页知识解决**：把档位作为分支标签，用 `@router` 分流，用 `or_` 把多个档位的结果汇到同一个缓存节点，客户端只读缓存。
- 用 state 存档位，分支逻辑只读状态，不在节点里重复判断。
- 用 `or_` 合并分支，低端与中端共享同一套缓存写入逻辑。
- 低端分支先产出纯文本降级稿，保证素材可用性优先。
- 缓存键包含档位与文案版本，避免旧素材被新版本覆盖。

```python
from crewai.flow.flow import Flow, listen, start, router, or_
from pydantic import BaseModel

class VariantState(BaseModel):
    tier: str = "low"          # 设备档位：low / mid / high
    text: str = ""             # 生成的文案
    fallback_ready: bool = False   # 降级稿是否就绪

class FirstScreenFlow(Flow[VariantState]):
    @start()
    def detect(self):
        self.state.tier = read_device_tier()      # 读取客户端上报的机型档位

    @router(detect)
    def branch(self):
        return self.state.tier                    # 档位直接作为分支标签

    @listen("low")
    def gen_low(self):
        self.state.fallback_ready = True          # 低端档位先出纯文本降级稿

    @listen(or_("low", "mid", "high"))            # 三个档位汇到同一节点
    def write_cache(self):
        put_cache(self.state.tier, self.state.text)   # 按档位写缓存供客户端读取
```

- **怎么度量收益**：前端侧用 Lighthouse CI 在节流配置下测 LCP，线上用 Android Vitals 看 p75 LCP 与 INP。生成侧看缓存命中率与降级稿覆盖率，命中率用 CDN 访问日志统计。测量方法：固定同一批机型配置，对比接入前后各跑三次的 p75 数值。
- **什么时候不该用**：首屏文案不随档位变化时，分支只增加维护面，直接用同一份素材。素材生成耗时远超首屏预算、客户端又不能异步替换时，应把生成放到离线任务，而不是挂在请求链路上。

#### 场景 3：多人协作白板的会议纪要与待办抽取

- **业务背景**：白板会议转写文本按发言人分段，每段要抽待办并写回卡片，一次会议可能几十段。痛点是重复写回会产生重复卡片，人工确认前的中间结果也会被推送。
- **怎么用本页知识解决**：用 `@listen` 串起拉取、抽取、确认三步；抽取阶段按段落循环，写回时用幂等键去重；确认阶段通过后才推送通知。
- 转写文本一次写入 state，后续节点不再重复拉取接口。
- 每段独立抽取，单段失败不影响其他段落。
- 写回卡片用 `action_id` 作为幂等键，重跑只更新不新建。
- 人工确认作为独立节点，未确认时保持 `approved=False`，不触发通知。

```python
from crewai.flow.flow import Flow, listen, start
from pydantic import BaseModel

class BoardState(BaseModel):
    transcript: str = ""            # 转写文本
    actions: list[dict] = []        # 抽取出的待办
    approved: bool = False          # 人工是否确认

class MinutesFlow(Flow[BoardState]):
    @start()
    def load(self):
        self.state.transcript = fetch_transcript()    # 拉取白板转写文本

    @listen(load)
    def extract(self):
        for seg in split_by_speaker(self.state.transcript):   # 按发言人切段
            self.state.actions += extract_action(seg)         # 逐段抽取待办
        upsert_cards(self.state.actions, key="action_id")     # 幂等写回卡片

    @listen(extract)
    def confirm(self):
        if self.state.approved:
            notify_owners(self.state.actions)   # 仅在确认后推送负责人
```

- **怎么度量收益**：看卡片重复率，用白板审计日志按 `action_id` 统计重复创建条数。看人工确认耗时，用 Flow 状态里记录的两个时间戳相减。看抽取段落失败率，用失败段数除以总段数。
- **什么时候不该用**：会议只有两三个人、待办当场口头分配时，抽取流程带来的确认开销高于收益。白板接口不支持幂等键、又不允许去重查询时，重跑会污染协作空间，应先改接口。

### 行业先进实践

- 检查点与断点续跑（出处：LangGraph 官方文档）：LangGraph 用 checkpointer 保存图状态，配合 thread_id 从上次中断处恢复。这么做的价值是长流程重跑不必从头执行。借鉴方式：把 Flow 状态在每个节点结束后落盘，重跑时先读状态再决定起点。CrewAI Flows 侧的持久化接口需核对官方文档：核对装饰器名称、序列化字段范围与恢复方式。
- 重试策略与幂等 Activity（出处：Temporal 官方文档）：Temporal 允许为活动配置重试策略，并要求副作用操作可重复执行而不产生重复结果。有效原因是失败是常态，重试必须安全。借鉴方式：给 Flow 里每个外部写操作定义幂等键，重试前先查一次目标系统。
- 状态机式 Retry 与 Catch（出处：AWS Step Functions 官方文档）：Step Functions 用 Retry 与 Catch 字段声明错误处理，失败可跳到兜底状态而非中断整个流程。有效原因是错误分支被显式建模，排查路径清晰。借鉴方式：把失败分支写成 `@router` 的一个返回值，而不是只在节点里写 try/except。
- 期望状态与幂等 reconcile（出处：Kubernetes 官方文档）：控制器反复比对期望状态与实际状态，差值驱动下一步动作。有效原因是重复执行同一轮调谐不会改变结果。借鉴方式：Flow 重跑时先读外部系统当前状态，再决定写不写。
- 人工审核节点（出处：需核对官方文档：核对 CrewAI Flows 是否提供人工反馈装饰器、其名称与支持的版本区间）：核对清楚后再决定用内置能力还是自建审批表。自建方案把审批结果写进 state，用 `@router` 按确认结果分流。

### 从学到用：落地路线

1. 先在一个只读场景试点：选一个不写外部系统、失败也不影响业务的流程，把它改成 Flow。验收标准：能在本地一次跑通，并打印每个节点前后的 state 快照。
2. 用可复现实验验证：准备同一份输入，分别跑原流程和新 Flow 各三次，记录耗时、失败次数、外部调用次数。验收标准：三组数字落在同一份记录表里，且能指出差异来源。
3. 推广到写操作场景：给每个写操作补幂等键，把失败分支写成 router 返回值。验收标准：同一任务连续重跑两次，目标系统里的记录条数不增加。
4. 防止回退：把状态字段、幂等键、失败分支写成评审清单，改动 Flow 结构时逐条勾选。验收标准：清单进入合并请求模板，缺项时评审不予通过。

### 动手作业

**目标**：做一个"会议转写文本转待办卡片"的小 Flow，包含条件分支、失败记录与人工确认三步。

**步骤**：
1. 准备一份十段以上的转写文本，每段带发言人标记，存成本地文件。
2. 定义 state，包含转写文本、待办列表、失败段编号、是否确认四个字段。
3. 写 `@start` 节点读取文件并写入 state。
4. 写 `@router` 节点，按段落数量分流：少于五段同步处理，多于五段分批处理。
5. 写抽取节点，逐段生成待办，失败的段落编号写入失败列表。
6. 写确认节点，只在确认字段为真时输出待办清单。
7. 把待办写成本地 JSON 文件，用待办编号作为去重键。

**验收标准**：
- 同一份输入连续跑两次，输出 JSON 里的待办条数相同。
- 人为让一段抽取失败，运行结束后失败列表里能看到该段编号，其余段落正常输出。
- 确认字段为假时，不产生任何输出文件。
- 打印每个节点前后的 state，能看出字段在哪一步被写入。
- 输入换成二十段文本时，走分批分支，日志里能看到分批次数。

