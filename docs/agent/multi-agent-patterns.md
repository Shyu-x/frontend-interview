# Multi-Agent System Patterns

## Overview

Multi-agent systems represent the evolution from single AI models to collaborative AI teams. By distributing tasks across specialized agents, these systems handle complex workflows that single agents cannot manage effectively.

## 1. Architecture Patterns

### 1.1 Hub-and-Spoke Pattern

One central agent coordinates all tasks and delegates to specialized agents:

```
        [User]
           |
      [Orchestrator]
       /    |    \
   [Agent A] [Agent B] [Agent C]
```

### 1.2 Hierarchical Pattern

Agents organized in levels, with higher-level agents managing lower-level ones:

```
       [Director Agent]
            |
    [Team Lead] [Team Lead]
         |           |
   [Worker] [Worker] [Worker] [Worker]
```

### 1.3 Pipeline Pattern

Agents process data sequentially, each adding value:

```
[Input] -> [Agent 1] -> [Agent 2] -> [Agent 3] -> [Output]
```

### 1.4 Graph/State Machine Pattern (LangGraph)

Workflows modeled as directed graphs with state persistence:

- **Nodes**: Agent actions or tool executions
- **Edges**: State transitions between nodes
- **State**: Shared context across the graph

## 2. Core Frameworks Comparison

| Framework | Core Paradigm | Best For | Complexity |
|-----------|---------------|----------|------------|
| **LangGraph** | State Machine/Graph | Complex industrial workflows | High |
| **CrewAI** | Role-based Chain | Content generation, reports | Low |
| **AutoGen** | Free-form Chat | Code generation, research | Medium |
| **AgentX** | Enterprise Stack | Government/Finance (security) | Medium |

### 2.1 LangGraph

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

### 2.2 CrewAI

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

### 2.3 AutoGen

Best for: Flexible conversations between agents, code execution.

```python
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.tools import AgentTool
from autogen_ext.models.openai import OpenAIChatCompletionClient

async def main():
    model_client = OpenAIChatCompletionClient(model="gpt-4")

    math_agent = AssistantAgent("math_expert", model_client=model_client,
                                 system_message="You are a math expert.")
    coding_agent = AssistantAgent("coder", model_client=model_client,
                                  system_message="You are a coding expert.")

    # Use agent as a tool
    math_tool = AgentTool(math_agent, return_value_as_last_message=True)

    coordinator = AssistantAgent("coordinator", model_client=model_client,
                                  tools=[math_tool, AgentTool(coding_agent)])

    await coordinator.run(task="Calculate prime numbers up to 100")
```

## 3. Collaboration Strategies

### 3.1 Task Decomposition

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

### 3.2 Role Assignment Strategies

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

### 3.3 Communication Protocols

- **Direct Messaging**: Agent-to-agent explicit communication
- **Shared State**: All agents read/write to common state object
- **Broadcast**: One agent informs all others
- **Request/Response**: Synchronous question-answer pattern

## 4. Task Delegation Patterns

### 4.1 Sequential Delegation

One agent completes task, then delegates to next:

```
Agent A -> [task] -> Agent B -> [task] -> Agent C -> [result]
```

### 4.2 Parallel Delegation

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

### 4.3 Hierarchical Delegation

Manager assigns subtasks to workers:

```python
class ManagerAgent:
    def delegate(self, task: Task, workers: List[WorkerAgent]):
        subtasks = self.decompose(task)
        futures = []
        for subtask in subtasks:
            worker = self.select_worker(subtask, workers)
            future = worker.execute_async(subtask)
            futures.append(future)

        results = [f.result() for f in futures]
        return self.integrate(results)
```

## 5. Code Implementation Examples

### 5.1 TypeScript Implementation

```typescript
interface Agent {
  id: string;
  role: string;
  capabilities: string[];
  execute(task: Task): Promise<Result>;
}

interface MultiAgentOrchestrator {
  agents: Map<string, Agent>;
  workflow: Workflow;

  async execute(workflow: Workflow, initialState: State): Promise<State> {
    let state = initialState;

    for (const step of workflow.steps) {
      const agent = this.agents.get(step.agentId);
      if (!agent) throw new Error(`Agent ${step.agentId} not found`);

      const result = await agent.execute(step.task);
      state = this.updateState(state, step.outputKey, result);

      if (step.condition) {
        const shouldContinue = await this.evaluateCondition(step.condition, state);
        if (!shouldContinue) break;
      }
    }

    return state;
  }
}

// Example workflow
const workflow: Workflow = {
  steps: [
    { agentId: 'researcher', task: 'gather_data', outputKey: 'research' },
    { agentId: 'analyst', task: 'analyze', inputKeys: ['research'], outputKey: 'analysis' },
    { agentId: 'writer', task: 'report', inputKeys: ['analysis'], outputKey: 'report' }
  ]
};
```

### 5.2 Python Implementation with LangGraph

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

## 6. Real-World Use Cases

### 6.1 Code Review System

- **Coder Agent**: Writes initial code
- **Reviewer Agent**: Checks for bugs, security issues
- **Manager Agent**: Decides whether to approve or request changes
- **Loop**: Continues until approved or max iterations reached

### 6.2 Content Creation Pipeline

- **Researcher**: Gathers information
- **Planner**: Structures content outline
- **Writer**: Creates draft
- **Editor**: Reviews and refines
- **Publisher**: Formats and prepares for distribution

### 6.3 Customer Service System

- **Classifier**: Routes to appropriate department
- **Specialist**: Handles specific domain queries
- **Escalation**: Identifies complex cases for human agents
- **Follow-up**: Tracks resolution and satisfaction

### 6.4 Research Assistant

- **Searcher**: Finds relevant papers/sources
- **Reader**: Extracts key information
- **Synthesizer**: Combines findings
- **Writer**: Produces summary report

## 7. Best Practices

### 7.1 Design Principles

1. **Single Responsibility**: Each agent should have a clear, focused role
2. **Explicit Boundaries**: Define what each agent can/cannot do
3. **Clear Communication**: Use structured messages between agents
4. **State Management**: Centralize shared state, avoid conflicts
5. **Error Handling**: Implement graceful fallbacks for agent failures

### 7.2 Scaling Considerations

- **Connection Pooling**: Reuse LLM connections across agents
- **Async Processing**: Execute independent tasks in parallel
- **Caching**: Cache agent responses for repeated tasks
- **Rate Limiting**: Respect API limits per agent

### 7.3 Monitoring

- Log all agent interactions
- Track task completion rates
- Monitor token consumption
- Set up alerts for failures

## 8. Common Pitfalls

### 8.1 Over-Engineering

**Problem**: Creating too many specialized agents for simple tasks.

**Solution**: Start simple, add complexity only when needed.

### 8.2 Communication Overhead

**Problem**: Agents spend more time coordinating than doing useful work.

**Solution**: Minimize inter-agent communication; batch information transfer.

### 8.3 State Concurrency

**Problem**: Multiple agents modifying shared state causes conflicts.

**Solution**: Use atomic operations, implement locking where necessary.

### 8.4 Infinite Loops

**Problem**: Agents keep deferring to each other without reaching conclusion.

**Solution**: Implement max iteration limits and explicit termination conditions.

### 8.5 Context Loss

**Problem**: Agents lose context of the overall task.

**Solution**: Pass comprehensive state through workflow; include task history.

## 9. Framework Selection Guide

| Scenario | Recommended Framework |
|----------|----------------------|
| Rapid prototyping, content generation | CrewAI |
| Complex workflows, enterprise applications | LangGraph |
| Code generation, research exploration | AutoGen |
| Government/Finance, security-critical | AgentX |

## 10. Resources

- [CrewAI Documentation](https://docs.crewai.org.cn/)
- [LangGraph Official Site](https://langgraph.com)
- [AutoGen GitHub](https://github.com/microsoft/autogen)
- [LangChain Documentation](https://python.langchain.com/docs/langgraph)