---
title: 多 Agent 协作模式
description: 多智能体系统架构设计模式，涵盖 Hub-and-Spoke 模式、分层模式和关键编排策略。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 多 Agent 协作模式

## 1. Overview

Multi-agent systems represent the evolution from single AI models to collaborative AI teams. By distributing tasks across specialized agents, these systems handle complex workflows that single agents cannot manage effectively.

## 2. Architecture Patterns

### 2.1 Hub-and-Spoke Pattern

One central agent coordinates all tasks and delegates to specialized agents:

```
        [User]
           |
      [Orchestrator]
       /    |    \
   [Agent A] [Agent B] [Agent C]
```

### 2.2 Hierarchical Pattern

Agents organized in levels, with higher-level agents managing lower-level ones:

```
       [Director Agent]
            |
    [Team Lead] [Team Lead]
         |           |
   [Worker] [Worker] [Worker] [Worker]
```

### 2.3 Pipeline Pattern

Agents process data sequentially, each adding value:

```
[Input] -> [Agent 1] -> [Agent 2] -> [Agent 3] -> [Output]
```

### 2.4 Graph/State Machine Pattern (LangGraph)

Workflows modeled as directed graphs with state persistence:

- **Nodes**: Agent actions or tool executions
- **Edges**: State transitions between nodes
- **State**: Shared context across the graph

## 3. Core Frameworks Comparison

| Framework | Core Paradigm | Best For | Complexity |
|-----------|---------------|----------|------------|
| **LangGraph** | State Machine/Graph | Complex industrial workflows | High |
| **CrewAI** | Role-based Chain | Content generation, reports | Low |
| **AutoGen** | Free-form Chat | Code generation, research | Medium |
| **AgentX** | Enterprise Stack | Government/Finance (security) | Medium |

### 3.1 LangGraph

Best for: Complex workflows requiring state persistence, human-in-the-loop, and checkpointing.

```python
from typing import TypedDict, List
from langgraph.graph import StateGraph, END

class AgentState(TypedDict):
    messages: List
    context: dict
    iteration: int

# Define nodes as functions
def research_agent(state: AgentState):
    # Research task implementation
    return {"context": {"research": "..."}}

def writer_agent(state: AgentState):
    # Writing task implementation
    return {"context": {"draft": "..."}}

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("researcher", research_agent)
workflow.add_node("writer", writer_agent)
workflow.set_entry_point("researcher")
workflow.add_edge("researcher", "writer")
workflow.add_edge("writer", END)

app = workflow.compile()
```

### 3.2 CrewAI

Best for: Quick prototyping with role-based collaboration.

```python
from crewai import Agent, Task, Crew, Process

# Define agents with roles
researcher = Agent(
    role="Research Analyst",
    goal="Find accurate information",
    backstory="Expert at gathering and analyzing data"
)

writer = Agent(
    role="Content Writer",
    goal="Create engaging content",
    backstory="Skilled at writing clear, compelling text"
)

# Define tasks
task1 = Task(description="Research latest AI trends", agent=researcher)
task2 = Task(description="Write article based on research", agent=writer)

# Create crew with process
crew = Crew(agents=[researcher, writer], tasks=[task1, task2], process=Process.hierarchical)
result = crew.kickoff()
```

### 3.3 AutoGen

Best for: Flexible conversations between agents, code execution.

```python
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.tools import AgentTool
from autogen_ext.models.openai import OpenAIChatCompletionClient

# 第 1 段：依赖导入与运行环境准备（这一段做什么）
# AssistantAgent 是"单体智能体"：自带 system_message + 可选工具，内部自己跑对话循环；
# AgentTool 是适配器，把"一个智能体"伪装成"一个工具"塞给别的智能体调用；
# OpenAIChatCompletionClient 是异步模型客户端，所有 Agent 都复用它发起 LLM 请求。
# 易错点：autogen_agentchat 与 autogen_ext 是两个分发包，只装前者会在运行期 ImportError。

# 第 2 段：异步入口（这一段做什么）
# 整个多智能体流程是 IO 密集的（大量 await LLM 网络调用），必须跑在事件循环里；
# 注意 asyncio 虽被导入，但下方并没有 asyncio.run(main())，所以本文件直接执行时"什么都不会发生"——
# 这是教学示例常见的隐藏边界条件，真正运行需要外部补一句 asyncio.run(main())。
async def main():
    # 第 3 段：构建共享的模型客户端（这一段做什么）
    # 单一 client 被所有 Agent 复用，好处是连接池/超时配置统一、少建 TCP 连接；
    # 代价是并发调用会共享同一个 client 的限流与重试策略，高并发场景需自行加并发控制；
    # 此处只写 model 名，某些版本还会要求 model_info（如上下文长度、是否支持工具调用）才能正常路由。
    model_client = OpenAIChatCompletionClient(model="gpt-4")

    # 第 4 段：声明两个领域专家 Agent（这一段做什么）
    # 这里只"定义"不"执行"：system_message 决定了角色与输出风格，是后续被调度时的行为契约；
    # 两个 Agent 共用同一个 client 但各自维护独立的对话状态，互不污染上下文。
    math_agent = AssistantAgent("math_expert", model_client=model_client,
                                 system_message="You are a math expert.")
    coding_agent = AssistantAgent("coder", model_client=model_client,
                                  system_message="You are a coding expert.")

    # 第 5 段：把 math_agent 包装成可被调用的工具（这一段做什么）
    # Use agent as a tool
    # AgentTool 的本质是"子智能体的调用入口"：外层 Agent 生成一次工具调用，
    # 内层 math_agent 就跑完整的一轮对话并把结果回传，相当于一次受控的递归/委托；
    # return_value_as_last_message=True 表示只把子 Agent 的最后一条消息文本回传，
    # 而不是整段消息历史——这能显著压降 token 消耗，也避免中间推理过程污染上层上下文。
    math_tool = AgentTool(math_agent, return_value_as_last_message=True)

    # 第 6 段：声明协调者 Agent 并挂载工具（这一段做什么）
    # coordinator 没有 system_message，属于示例省略；生产中建议显式写清"何时委派给哪个工具"的分工规则；
    # 注意这里两个工具的返回语义不对称：math_tool 只回最后一条消息，
    # 而 AgentTool(coding_agent) 使用默认 return_value_as_last_message=False，
    # 会把 coder 的完整消息序列塞回 coordinator，既更费 token，也可能让模型被冗长上下文干扰。
    coordinator = AssistantAgent("coordinator", model_client=model_client,
                                  tools=[math_tool, AgentTool(coding_agent)])

    # 第 7 段：启动一次任务并等待收敛（这一段做什么）
    # run() 返回整条任务的结果消息序列，此处未接收返回值，仅演示触发流程；
    # 复杂度取决于"工具调用次数 × 每次子 Agent 内部轮数"，存在组合放大的风险，
    # 因此工具化 Agent 时通常要设 max_tool_iterations / 终止条件，防止互相委派形成长链或死循环。
    await coordinator.run(task="Calculate prime numbers up to 100")
```
## 4. Collaboration Strategies

### 4.1 Task Decomposition

Break complex tasks into atomic units assignable to specialized agents.

```python
def decompose_task(task: str) -> List[dict]:
    """Decompose task into sub-tasks with dependencies"""
    decomposition_prompt = f"""
    Decompose this task into 3-5 atomic sub-tasks:
    Task: {task}

    For each sub-task provide:
    - task_id: unique identifier
    - description: what this task does
    - required_skills: expertise needed
    - depends_on: task_ids this depends on
    """
    # Use LLM to decompose
    ...
```

### 4.2 Role Assignment Strategies

1. **Static Assignment**: Pre-defined roles based on task type
2. **Dynamic Assignment**: LLM determines best agent based on context
3. **Capability Matching**: Match agent capabilities to task requirements

```python
def assign_role(task: dict, agents: List[Agent]) -> Agent:
    """Match task to best-suited agent"""
    scores = {}
    for agent in agents:
        match_score = calculate_skill_match(task, agent.capabilities)
        availability_bonus = 1.0 if agent.available else 0.5
        scores[agent.id] = match_score * availability_bonus

    return agents[max(scores, key=scores.get)]
```

### 4.3 Communication Protocols

- **Direct Messaging**: Agent-to-agent explicit communication
- **Shared State**: All agents read/write to common state object
- **Broadcast**: One agent informs all others
- **Request/Response**: Synchronous question-answer pattern

## 5. Task Delegation Patterns

### 5.1 Sequential Delegation

One agent completes task, then delegates to next:

```
Agent A -> [task] -> Agent B -> [task] -> Agent C -> [result]
```

### 5.2 Parallel Delegation

Multiple agents work simultaneously on independent tasks:

```
        [Task]
           |
    +------+------+
    |      |      |
[Agent A] [Agent B] [Agent C]
    |      |      |
    +------+------+
           |
        [Merge]
```

### 5.3 Hierarchical Delegation

Manager assigns subtasks to workers:

```python
class ManagerAgent:
    def delegate(self, task: Task, workers: List[WorkerAgent]):
        # 第 1 段：任务分解——把面向用户的大任务切成可独立执行的子任务
        # 主流程整体是「分解 → 并发派发 → 按序收集 → 聚合」四步，下面的代码段依次对应。
        # 关键数据流：decompose 产出的 subtasks 顺序就是结果顺序的基准，
        # 因为第 3 段的 results 是按下标与 subtasks 一一对应的（见该段易错点）。
        subtasks = self.decompose(task)
        # 第 2 段：并发派发——为每个子任务选一个 worker 并立刻异步启动
        # 为什么这样写：execute_async 返回 future 后主线程不阻塞，所有子任务得以并行推进，
        # 总耗时接近「最慢子任务」而不是「各子任务耗时之和」，这是本方法的核心收益。
        # 关键点：future 必须与派发顺序同序 append，否则第 3 段拿到的结果会与子任务错配。
        futures = []
        for subtask in subtasks:
            worker = self.select_worker(subtask, workers)
            future = worker.execute_async(subtask)
            futures.append(future)

        # 第 3 段：收集结果——列表推导会按 futures 顺序逐个调用 result() 阻塞等待
        # 易错点：result() 是阻塞调用，写成列表推导意味着即使后面的 future 早已完成，
        # 只要排在前面那个还没好，整体就会被卡住，无法做流式/乱序处理；这是用顺序换实现简单的取舍。
        # 边界条件：任一子任务的异常会在此处被重新抛出到主线程，直接中断整个聚合过程。
        results = [f.result() for f in futures]
        # 第 4 段：结果聚合——把各子任务结果合并成一份最终交付物
        # 复杂度：整体由「最慢子任务（并发段）」加 integrate 自身的合并开销决定；
        # workers 数量不足或 select_worker 分配不均，会直接拉低并发度、放大尾延迟。
        return self.integrate(results)
```
## 6. Code Implementation Examples

### 6.1 TypeScript Implementation

```typescript
// 第 1 段：Agent —— 单个智能体的能力契约
// 编排器只依赖这个最小接口，不关心背后是 LLM、规则引擎还是远程服务，
// 因此新增 agent 类型无需改动调度逻辑（面向接口编程 / 开闭原则）。
interface Agent {
  id: string;                            // 路由键：编排时用它在 agents Map 中做 O(1) 查找
  role: string;                          // 语义标签，供 prompt 组装或日志观测使用，不参与路由
  capabilities: string[];                // 能力清单，可在运行前校验"任务是否匹配该 agent"
  execute(task: Task): Promise<Result>;  // 唯一执行入口；返回 Promise 以便编排器 await 或并发
}

// 第 2 段：MultiAgentOrchestrator —— 编排器的状态与依赖
// agents 选 Map 而非数组，是为了把按 id 的查找从 O(n) 降到 O(1)；
// workflow 既可作为实例字段保存，也允许在 execute 时显式传入（见下方参数）。
interface MultiAgentOrchestrator {
  agents: Map<string, Agent>;
  workflow: Workflow;

  // 第 3 段：execute 主流程 —— 以"状态折叠（fold/reduce）"方式串行推进工作流
  // 关键数据流：initialState → 每步被 updateState 覆写成新对象 → 最终返回该 state。
  // 注意 state 是"不可变替换"而非原地 mutate，避免步骤之间相互污染、也便于回溯每一版状态。
  async execute(workflow: Workflow, initialState: State): Promise<State> {
    let state = initialState; // 用局部变量累积状态，不改动调用方传入的对象

    // 第 4 段：遍历每个步骤，完成"取 agent → 执行 → 回写状态"
    for (const step of workflow.steps) {
      const agent = this.agents.get(step.agentId);
      // fail-fast：配置引用不存在的 agent 时立即抛错，
      // 比静默跳过更能暴露工作流配置缺陷，也避免后续步骤读到缺失的 state key。
      if (!agent) throw new Error(`Agent ${step.agentId} not found`);

      // 串行 await 保证依赖顺序（下一步的 inputKeys 可能来自本步 outputKey）。
      // 复杂度：n 步、各 agent 延迟 t_i 时总耗时为 Σt_i，而非并行的 max(t_i)——
      // 这是正确性换吞吐的取舍，依赖允许时才可考虑并发。
      const result = await agent.execute(step.task);

      // 纯函数式更新：把本次结果写入 step.outputKey，返回新 state 而非修改旧 state。
      state = this.updateState(state, step.outputKey, result);

      // 第 5 段：条件边（conditional edge）——决定是否继续执行后续步骤
      // 只有当前步骤声明了 condition 才求值；用当前 state 判定，可读取前面步骤的产物。
      // 这是实现分支、提前终止与循环的基础；边界：无 condition 时默认继续（隐式 true）。
      if (step.condition) {
        const shouldContinue = await this.evaluateCondition(step.condition, state);
        if (!shouldContinue) break; // 用 break 而非 return，统一走函数末尾的 return state
      }
    }

    return state; // 无论正常跑完还是被 break 短路，都返回当前累积状态
  }
}

// 第 6 段：示例工作流 —— 线性三步，依赖关系隐含在 key 的读写之间
// researcher 产出 research，analyst 读 research 产出 analysis，
// writer 再读 analysis 产出 report；outputKey 与 inputKeys 共同勾勒出隐式 DAG 边。
// 易错点：这里的 inputKeys 只是声明意图，真正保证"读到上一步结果"靠的是上面的串行 await，
// 若改为并发执行，必须显式做依赖拓扑排序。
// 边界：本文件未给出 Task / Result / State / Workflow / updateState / evaluateCondition 的定义，
// 它们是该编排器需要外部提供的类型与能力。
const workflow: Workflow = {
  steps: [
    { agentId: 'researcher', task: 'gather_data', outputKey: 'research' },
    { agentId: 'analyst', task: 'analyze', inputKeys: ['research'], outputKey: 'analysis' },
    { agentId: 'writer', task: 'report', inputKeys: ['analysis'], outputKey: 'report' }
  ]
};
```
### 6.2 Python Implementation with LangGraph

```python
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI

class WorkflowState(TypedDict):
    task: str
    results: dict
    current_step: int
    history: List[str]

def create_multi_agent_workflow(agents_config: List[dict]):
    llm = ChatOpenAI(model="gpt-4")

    workflow = StateGraph(WorkflowState)

    # Add agent nodes
    for config in agents_config:
        def make_node(agent_config):
            def node_fn(state: WorkflowState):
                prompt = agent_config['prompt_template'].format(**state)
                response = llm.invoke(prompt)
                return {
                    'results': {**state['results'], agent_config['id']: response.content},
                    'history': state['history'] + [f"{agent_config['id']}: {response.content[:100]}"]
                }
            return node_fn

        workflow.add_node(config['id'], make_node(config))

    # Define routing logic
    def router(state: WorkflowState):
        next_step = state['current_step'] + 1
        if next_step >= len(agents_config):
            return END
        return agents_config[next_step]['id']

    # Set up edges
    for i, config in enumerate(agents_config[:-1]):
        workflow.add_edge(config['id'], agents_config[i+1]['id'])

    workflow.set_entry_point(agents_config[0]['id'])
    return workflow.compile()

# Usage
workflow = create_multi_agent_workflow([
    {'id': 'researcher', 'prompt_template': 'Research: {task}'},
    {'id': 'writer', 'prompt_template': 'Write report based on: {results["researcher"]}'}
])

result = workflow.invoke({'task': 'AI trends', 'results': {}, 'current_step': 0, 'history': []})
```

## 7. Real-World Use Cases

### 7.1 Code Review System

- **Coder Agent**: Writes initial code
- **Reviewer Agent**: Checks for bugs, security issues
- **Manager Agent**: Decides whether to approve or request changes
- **Loop**: Continues until approved or max iterations reached

### 7.2 Content Creation Pipeline

- **Researcher**: Gathers information
- **Planner**: Structures content outline
- **Writer**: Creates draft
- **Editor**: Reviews and refines
- **Publisher**: Formats and prepares for distribution

### 7.3 Customer Service System

- **Classifier**: Routes to appropriate department
- **Specialist**: Handles specific domain queries
- **Escalation**: Identifies complex cases for human agents
- **Follow-up**: Tracks resolution and satisfaction

### 7.4 Research Assistant

- **Searcher**: Finds relevant papers/sources
- **Reader**: Extracts key information
- **Synthesizer**: Combines findings
- **Writer**: Produces summary report

## 8. Best Practices

### 8.1 Design Principles

1. **Single Responsibility**: Each agent should have a clear, focused role
2. **Explicit Boundaries**: Define what each agent can/cannot do
3. **Clear Communication**: Use structured messages between agents
4. **State Management**: Centralize shared state, avoid conflicts
5. **Error Handling**: Implement graceful fallbacks for agent failures

### 8.2 Scaling Considerations

- **Connection Pooling**: Reuse LLM connections across agents
- **Async Processing**: Execute independent tasks in parallel
- **Caching**: Cache agent responses for repeated tasks
- **Rate Limiting**: Respect API limits per agent

### 8.3 Monitoring

- Log all agent interactions
- Track task completion rates
- Monitor token consumption
- Set up alerts for failures

## 9. Common Pitfalls

### 9.1 Over-Engineering

**Problem**: Creating too many specialized agents for simple tasks.

**Solution**: Start simple, add complexity only when needed.

### 9.2 Communication Overhead

**Problem**: Agents spend more time coordinating than doing useful work.

**Solution**: Minimize inter-agent communication; batch information transfer.

### 9.3 State Concurrency

**Problem**: Multiple agents modifying shared state causes conflicts.

**Solution**: Use atomic operations, implement locking where necessary.

### 9.4 Infinite Loops

**Problem**: Agents keep deferring to each other without reaching conclusion.

**Solution**: Implement max iteration limits and explicit termination conditions.

### 9.5 Context Loss

**Problem**: Agents lose context of the overall task.

**Solution**: Pass comprehensive state through workflow; include task history.

## 10. Framework Selection Guide

| Scenario | Recommended Framework |
|----------|----------------------|
| Rapid prototyping, content generation | CrewAI |
| Complex workflows, enterprise applications | LangGraph |
| Code generation, research exploration | AutoGen |
| Government/Finance, security-critical | AgentX |

## 11. Resources

- [CrewAI Documentation](https://docs.crewai.org.cn/)
- [LangGraph Official Site](https://langgraph.com)
- [AutoGen GitHub](https://github.com/microsoft/autogen)
- [LangChain Documentation](https://python.langchain.com/docs/langgraph)

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Code 文档](https://code.claude.com/docs/en/overview) | 官方 subagents 章节正是多 Agent 协作的第一手规范说明。 | 读 subagents、hooks 两节，带着'如何拆分子任务'的问题读，读后配两个子 Agent 试跑。 |
| [Claude Agent SDK 概览](https://docs.claude.com/en/api/agent-sdk/overview) | SDK 文档给出 Agent 循环与工具调用的权威接口定义。 | 先读概览中的 agent loop，再看工具调用示例，读完写一个单 Agent 再改造成双 Agent。 |
| [Claude Tool Use 概览](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview) | 工具定义是 Agent 间协作的接口契约，官方规范最可靠。 | 重点读 tool schema 与 tool_result 回传，边读边为你设计的委派工具写 schema。 |
| [Agent Skills 概览](https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview) | Skills 是官方定义的按需加载能力，关系到 Agent 职责划分。 | 读 SKILL.md 结构与加载时机一节，读完为自己的一个子 Agent 写一个技能包。 |
| [MCP 架构概念](https://modelcontextprotocol.io/docs/learn/architecture) | MCP 是跨 Agent 共享工具与上下文的通用协议，概念必读。 | 对照 tools/resources/prompts 三类能力，为协作场景各举一例再画调用时序图。 |
| [OpenAI Agents SDK（Python）](https://openai.github.io/openai-agents-python/) | 官方 SDK 的 handoff 原语是多 Agent 委派最标准的实现参考。 | 复现 Quickstart 后加一个 handoff，观察控制权转移时的上下文传递内容。 |
| [CrewAI 文档](https://docs.crewai.com/) | CrewAI 把角色、任务、委派做成了显式 API，适合对照理解协作模式。 | 读 Crews 与 Tasks 两节，建两个角色 Agent 协写摘要，记录任务如何被委派。 |
| [Vercel AI SDK Agents](https://ai-sdk.dev/docs/agents/overview) | 提供多步工具调用与终止条件的工程化抽象示例。 | 读 agent 与 maxSteps 部分，实现多步调用并观察步数耗尽时的行为。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Inspect AI 仓库](https://github.com/UKGovernmentBEIS/inspect_ai) | 真实评测仓库，可读 Agent 评测与沙箱运行的完整源码。 | 精读 examples 下一个 agent 评测样例，照着跑通后再改评分器做对比实验。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [A practical guide to building agents（OpenAI）](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | 体系化讲解 Agent 构建方法，适合作为整体设计框架。 | 通读后按'模型、工具、指令'三要素逐条审查自己的多 Agent 设计。 |
| [Patterns for building LLM-based systems（Eugene Yan）](https://eugeneyan.com/writing/llm-patterns/) | 归纳七种 LLM 系统模式，帮助把协作模式放回全局分类中。 | 选其中两种模式套到自己的项目，并写下对应的评估方法再动手实现。 |

## 应用与行业实践

前面章节讲的是机制与选型。这一节回答一个问题：这些机制落到具体业务里长什么样。下面先给一张场景地图，再拆三个场景，最后给路线和作业。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 电商后台十万行订单表格的批量改价核对 | Supervisor 架构 + 验证者回路 | LangGraph 的 supervisor 示例 + 沙箱里执行 SQL 校验 | 写操作先走 dry-run，比对影响行数与金额合计再提交 |
| 低端安卓机型首屏加载优化 | 规划者与执行者分工 | OpenAI Agents SDK 的 handoff + Lighthouse CI 做外部验收 | 设备档位写进任务契约，不能用旗舰机指标当验收 |
| 多人协作白板的冲突合并 | 共享状态与消息传递的取舍 | 自研协调器 + CRDT 库做确定性合并层 | 冲突合并交给确定性算法，模型只给语义级建议 |
| 客服工单自动分类与首轮回复 | 路由型委派 + 评审回路 | LangGraph 或 CrewAI 的角色分工 + 工单系统 API | 高风险类目直接转人工，回复先过规则校验 |
| 单仓库跨 20 个包的依赖升级重构 | Orchestrator-Workers 并行拆分 | Claude Agent SDK 或 AutoGen 并行 worker + git worktree 隔离 | 一个 worker 只改一个包，合并前跑通该包测试 |
| 招股书 PDF 的财务表格抽取与核对 | 多抽取器交叉验证 | 三路抽取（文本层、OCR、表格线规则）+ 一致性比对 | 三路不一致时输出差异单元格，不要投票取多数 |
| 线上告警根因排查 | 层级式委派：总控分派到日志、指标、变更三个专家 | AutoGen GroupChat 或自研 + 可观测性平台 API | 起步只给只读权限，结论必须附证据链接 |
| 多语言产品文案本地化审校 | 生产者与审校者双角色 | CrewAI 两角色 Crew + 术语库检索工具 | 术语表做成工具而不是提示词，便于更新和审计 |

### 三个场景拆解

#### 场景 1：客服工单的自动分类与首轮回复

**业务背景**

工单进量大时，人工分派和套模板回复吃掉客服大半工时，高峰期容易积压。规模量级先测一个数：当前处理每千条工单消耗的人工分钟数。

**怎么用本页知识解决**

思路是让主控只做分派，不写正文；领域 worker 起草，确定性规则做闸门。低置信度不猜，直接转人工。

```python
# 伪代码：supervisor 分派 + 专家 worker + 规则闸门
def handle_ticket(ticket):
    route = supervisor(ticket, labels=["退款", "物流", "账号"])  # 只做分类，不写正文
    if route.conf < 0.7:                                        # 置信度低就不猜
        return escalate(ticket, reason="low_confidence")
    draft = workers[route.label].draft(ticket)                  # 领域 worker 起草回复
    check = rule_gate(draft, ticket)                            # 确定性规则先过一遍
    if not check.passed:
        return escalate(ticket, reason=check.failed_rules)      # 规则不过就转人工
    return review_and_send(draft)                               # 评审通过后发出
```

- 主控只输出标签和置信度，上下文里不放回复模板，减少串味。
- 每个领域 worker 只挂本领域的知识检索，职责边界写进代码。
- 规则闸门用正则和字段校验实现，不用模型判断金额与时效。
- 转人工时带上失败原因，人工处理完可回流成评测样本。

**怎么度量收益**

看四个指标：自动分派准确率、首轮回复采纳率、人工接管率、端到端时延 P95。用 Langfuse 或 LangSmith 记录每条 trace，再拿一周历史工单做回放对照。成本指标记每千条工单的 token 消耗。

**什么时候不该用**

- 涉及金额争议、法律承诺、账号解封的类目，回复错误代价高，走人工。
- 工单量每天只有几十条时，维护评测集和规则闸门的成本高过收益。

#### 场景 2：单仓库跨 20 个包的依赖升级重构

**业务背景**

一次大版本升级要求全仓对齐，人工逐包改容易漏，漏一处 CI 就红。规模量级用一个可复现的测法：先跑 dry-run，统计涉及包数与每个包的平均改动文件数。

**怎么用本页知识解决**

先让规划者产出每个包的改动契约，再并行开 worker，一包一任务，各自在独立 worktree 里改。验证由测试执行结果决定，不由模型自评。

```python
# 伪代码：按包切分任务，每个 worker 在独立 worktree 内改
plan = planner(repo, target_version)                  # 产出每个包的改动契约
for pkg in plan.packages:                             # 一包一任务，边界清晰
    wt = make_worktree(pkg)                           # 隔离工作区，避免互相踩文件
    diff = worker(pkg, contract=plan.contract, cwd=wt)  # worker 只允许改本包文件
    ok = run_tests(pkg, cwd=wt)                       # 确定性验证：本包测试必须过
    if ok:
        collect(diff)
    else:
        retry_or_flag(pkg)                            # 失败进重试队列，不阻塞其他包
merge_and_run_full_ci(collected_diffs)                # 全量 CI 作为最终闸门
```

- 契约里写明允许改动的路径，worker 越界改文件直接判失败。
- 一包一 worktree，两个 worker 不会同时写同一个文件。
- 单包测试先跑，失败任务单独重试，不拖住整批。
- 全量 CI 只做最后一道闸门，不参与逐包重试。
- 规划者不写代码，避免它既当裁判又当选手。

**怎么度量收益**

指标：每包一次通过率、全量 CI 首次通过率、人工返工轮次、端到端耗时。工具用 GitHub Actions 或等价 CI 记录构建结果，git worktree 保证隔离可复现，trace 落到 LangSmith 观察每包的输入输出。

**什么时候不该用**

- 包之间存在循环依赖、必须一次性同步大改的场景，并行 worker 会互相打脸。
- 跨包公共接口签名变更需要统一决策的场景，分包改会产出互不兼容的版本。

#### 场景 3：招股书表格抽取与核对

**业务背景**

几百页 PDF 里财务表格跨页、脚注密集，单模型抽取偶发串行错位。规模量级：用页数乘以表格数估算，先抽 20 页人工标注做基线错误率。

**怎么用本页知识解决**

思路是让三条互相独立的路径各抽一遍，逐单元格比对。一致才自动落库，不一致就交人并附上差异位置，不做多数投票。

```python
# 伪代码：三路独立抽取 + 差异定位
a = extract_text_layer(pdf, page)     # 路径 A：PDF 文本层直接解析
b = extract_ocr(pdf, page)            # 路径 B：渲染成图后做 OCR
c = extract_rules(pdf, page)          # 路径 C：表格线与行列规则
result = compare(a, b, c)             # 逐单元格比对，不做多数投票
if result.agreement == "full":
    return result.value               # 三路一致才自动落库
else:
    return flag_for_human(page, result.diff_cells)  # 有分歧就交人，附差异单元格
```

- 三路抽取互相独立，避免同一种错误被复制三遍。
- 比对粒度到单元格，定位到行列坐标，人工复核不用重读整页。
- 不一致时输出差异而不是结论，防止错值静默入库。
- 每条记录保留来源路径，事后可追溯是哪一路抽的。

**怎么度量收益**

指标：单元格级准确率、分歧率、人工复核每页耗时。方法：把 20 页标注集固化成回归测试集，每次改抽取逻辑都重跑，用 promptfoo 或自建脚本比对结果。

**什么时候不该用**

- 表格结构固定、列位不变的场景，直接写规则解析，成本与稳定性都占优。
- 数据不能出内网或有合规限制的场景，外部模型抽取这条路直接排除。

### 行业先进实践

Orchestrator-Workers 与 Evaluator-Optimizer 模式（出处：Anthropic 官方文档 Building Effective Agents）。做法是把主控和子任务拆开，用固定的评审回路替代单次生成。原因是子任务上下文隔离，失败可单独重试。借鉴时先把主控职责压到路由与汇总，不让它写正文。

Handoff 作为显式交接原语（出处：OpenAI Agents SDK 官方文档）。做法是 agent 之间用 handoff 转移控制权，而不是把所有规则塞进一个巨型提示词。原因是责任边界写进代码，trace 上看得见谁交给了谁。借鉴时给每次 handoff 记录触发原因。

群聊式多角色对话与终止条件（出处：Microsoft AutoGen 官方文档）。做法是多个 agent 在同一会话里按发言策略轮流推进，同时设置显式的终止条件。原因是缺终止条件时对话会空转。借鉴时先设最大轮次和收敛判定，再调角色提示词。

图式状态机编排与检查点（出处：LangGraph 官方文档）。做法是把协作流程写成节点与边，支持中断和从检查点恢复。原因是长流程失败后能定位到具体节点重跑。借鉴时把人工审核做成一个中断节点，而不是散在代码里的 if。

SOP 驱动的角色分工（出处：MetaGPT 开源项目）。做法是把标准作业流程映射成固定角色与固定产出物，例如需求文档、设计文档、测试用例。原因是产出物之间有明确接口，交接可校验。借鉴时先固化产出物格式，再决定要几个 agent。

统一工具接入协议（出处：Model Context Protocol 官方文档，Anthropic）。做法是用统一协议把外部工具暴露给不同 agent。原因是工具层与 agent 实现解耦，同一个工具能被多个 agent 复用。借鉴时把内部 API 包装成 MCP server，先给只读工具。

云厂商托管的多 agent 协作（出处：需核对官方文档：具体核对 AWS Bedrock 多 agent collaboration 的创建方式、协作者数量上限与计费说明）。核对清这三项，再判断是否值得把编排交给托管层。

### 从学到用：落地路线

第 1 步：选一个只读、可回放的流程试点，例如工单分类。验收标准是用一周历史数据回放，产出与人工清单的对照表，过程可重复。

第 2 步：加上验证回路和成本上限，与单 agent 基线对照。验收标准是成功率、时延 P95、每任务 token 成本三项都有记录，且存在一键回退开关。

第 3 步：把试点固化成模板，复制到第二个流程。验收标准是第二个流程复用同一套 trace 与评测脚本，改动只落在配置层。

第 4 步：把评测集接进 CI，定期跑回归。验收标准是评测集在 CI 中执行，指标低于阈值时构建失败。

### 动手作业

**目标**

搭一个三 agent 的代码审查系统，跑在一个本地 git 仓库上，输出"阻塞或不阻塞"的结论并附证据。

**步骤**

1. 选一个本地仓库，从已合并的 PR 里挑 5 个作为回放集。
2. 定义三个角色：分类者判断改动类型，审查者提问题，裁决者给出是否阻塞。
3. 用统一的 JSON 契约约定消息字段：角色、结论、证据文件名与行号、置信度。
4. 编排采用串行调用，最大轮次设为 3，超过就输出"未收敛"。
5. 接确定性闸门：把 lint 和测试结果作为外部输入，不让模型判断。
6. 记录 trace：每轮输入摘要、输出、token 数、耗时。
7. 回放 5 个 PR，与人工标注的"应当阻塞"清单逐条对齐。

**验收标准**

- 5 个 PR 的结论与人工清单一致，一致率的阈值由你自己先测基线再定。
- 每条结论都带证据文件与行号，抽查能在仓库里定位到。
- 相同输入重跑两次，结论差异能解释清楚。
- 单 PR 的平均 token 成本与耗时都有记录。
- 超过 3 轮未收敛时输出"未收敛"，不给结论。

