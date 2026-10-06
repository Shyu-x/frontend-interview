---
title: LangGraph 检查点机制
description: 详细介绍 LangGraph 的状态持久化（Checkpointing）机制、实现方式和最佳实践。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# LangGraph 检查点机制

> 本文档详细介绍 LangGraph 的状态持久化（Checkpointing）机制、实现方式和最佳实践。

## 1. 为什么需要检查点

### 1.1 长时运行的 Agent 问题

```mermaid
flowchart TD
    A[开始执行] --> B[Step 1]
    B --> C[Step 2]
    C --> D[Step 3]
    D --> E[Step 4]
    E --> F[Step 5]
    F --> G[网络中断!]
    G --> H[重新开始]
    H --> A
    style H fill:#ff6b6b,color:#1d1d1f
    style G fill:#ff6b6b,color:#1d1d1f
```

```mermaid
flowchart LR
    A[开始] --> B[Step 1]
    B --> C[Step 2]
    C --> D[Step 3]
    D --> E[保存检查点 A]
    E --> F[Step 4]
    F --> G[Step 5]
    G --> H[保存检查点 B]
    H --> I[Step 6]
    I --> J[网络中断]
    J --> K[从检查点B恢复]
    K --> L[Step 6]
    L --> M[Step 7]
    M --> N[完成]
    style E fill:#90EE90,color:#1d1d1f
    style H fill:#90EE90,color:#1d1d1f
    style K fill:#87CEEB,color:#1d1d1f
```

### 1.2 检查点核心价值

| 场景 | 无检查点 | 有检查点 |
|------|---------|---------|
| 网络中断 | 重新开始整个任务 | 从最后一个检查点恢复 |
| 服务重启 | 所有进度丢失 | 完全恢复执行状态 |
| 并发用户 | 无法共享状态 | 线程化隔离执行 |
| 超长任务 | 超时失败 | 分段执行+恢复 |
| 调试问题 | 无法回溯状态 | 历史检查点分析 |
| 资源释放 | 内存持续占用 | 检查点后可释放内存 |

### 1.3 典型应用场景

```python
# 场景 1: 长任务处理
async def process_large_dataset():
    """
    处理百万级数据，无法在单次请求中完成
    """
    # 每个批次后保存检查点
    for batch in get_batches(1000000):
        result = await process_batch(batch)
        await checkpoint_saver.save({
            "processed": processed_count,
            "last_batch_id": batch.id,
            "partial_results": result
        })

# 场景 2: 多轮对话 Agent
async def conversational_agent(user_id: str, message: str):
    """
    用户可能离开后回来继续对话
    """
    thread_id = f"user_{user_id}"
    state = await checkpoint_saver.load(thread_id)

    if state is None:
        state = {"messages": [], "context": {}}

    state["messages"].append({"role": "user", "content": message})
    response = await agent.ainvoke(state)
    state["messages"].append({"role": "assistant", "content": response})

    await checkpoint_saver.save(thread_id, state)
    return response
```

## 2. 核心概念与原语

### 2.1 检查点架构

```mermaid
flowchart TB
    subgraph AppLayer["应用层"]
        A[StateGraph]
        B[Agent节点]
        C[条件边]
    end
    
    subgraph CheckpointLayer["检查点层"]
        D[CheckpointSaver]
        E[状态快照]
        F[元数据]
    end
    
    subgraph StorageLayer["存储层"]
        G[Memory]
        H[SQLite]
        I[PostgreSQL]
        J[Redis]
    end
    
    A --> D
    B --> E
    C --> F
    D --> G
    D --> H
    D --> I
    D --> J
    style CheckpointLayer fill:#f9f,stroke:#333,stroke-width:2px,color:#1d1d1f
```

### 2.2 核心原语

#### 2.2.1 State（状态）

```python
from typing import TypedDict, Annotated
from langgraph.graph import add_messages
from langgraph.checkpoint.base import BaseCheckpointSaver

class AgentState(TypedDict):
    """Agent 执行状态"""
    messages: Annotated[list, add_messages]  # 消息列表，自动合并
    current_task: str | None                  # 当前任务
    task_history: list[str]                   # 任务历史
    metadata: dict                            # 元数据

    # 检查点相关字段
    checkpoint_id: str | None                # 检查点标识
    parent_checkpoint_id: str | None          # 父检查点（用于回溯）
```

#### 2.2.2 Checkpoint（检查点）

```python
@dataclass
class Checkpoint:
    """检查点数据结构"""
    id: str                    # 唯一标识符 (UUID)
    timestamp: float           # 创建时间戳
    parent_checkpoint_id: str | None  # 父检查点 ID（支持回溯）
    state: dict                # 状态的完整快照或差异
    metadata: dict             # 额外元数据

    # 版本控制
    version: int               # 乐观锁版本号
    thread_id: str             # 所属线程
    channel_values: dict       # 各 channel 的当前值
    channel_versions: dict     # 各 channel 的版本

@dataclass
class CheckpointMetadata:
    """检查点元数据"""
    thread_id: str
    checkpoint_id: str
    step_number: int           # 第几步
    created_at: datetime
    source: str                # 'input' | 'loop' | 'update'
    suspended: bool            # 是否暂停
    bypass_queue: bool
    stack: str                 # 调用栈
```

#### 2.2.3 Thread（线程）

```python
@dataclass
class Thread:
    """线程概念 - 用户会话或任务的执行上下文"""
    thread_id: str             # 线程唯一标识
    created_at: datetime
    updated_at: datetime
    status: str                # 'active' | 'suspended' | 'completed'
    metadata: dict             # 线程级元数据

# 线程使用示例
thread_id = "user_123_session_abc"  # 格式: userId_sessionId
# 支持嵌套: "org_1/project_2/thread_3"
```

### 2.3 检查点生命周期

```mermaid
stateDiagram-v2
    [*] --> 创建: invoke()
    创建 --> 保存: step完成
    保存 --> 就绪: 写入成功
    就绪 --> 读取: get_state()
    读取 --> 就绪
    就绪 --> 历史: get_state_history()
    历史 --> 就绪
    就绪 --> 更新: update_state()
    更新 --> 就绪
    就绪 --> 删除: delete()
    删除 --> [*]
    就绪 --> 挂起: 中断请求
    挂起 --> 就绪: 恢复
```

### 2.4 并发与隔离模型

```mermaid
flowchart TB
    subgraph Thread1["Thread-1"]
        T1C1[Checkpoint A]
        T1C2[Checkpoint B]
        T1C1 --> T1C2
    end
    
    subgraph Thread2["Thread-2"]
        T2C1[Checkpoint X]
        T2C2[Checkpoint Y]
        T2C1 --> T2C2
    end
    
    subgraph Thread3["Thread-3"]
        T3C1[Checkpoint P]
    end
    
    T1C2 -.->|隔离| T2C1
    T2C2 -.->|隔离| T3C1
    style Thread1 fill:#e1f5fe,color:#1d1d1f
    style Thread2 fill:#fff3e0,color:#1d1d1f
    style Thread3 fill:#f3e5f5,color:#1d1d1f
```

## 3. CheckpointSaver 实现

### 3.1 接口定义

```python
# 第 1 段：导入——只为"抽象契约"引入最小依赖
# 选用 ABC + @abstractmethod 而非 Protocol：前者能在实例化阶段就报错，
# 把"漏实现某个方法"的错误提前到启动时，而不是等到运行时才炸。
# 易错点：下面用到的 Checkpoint / CheckpointMetadata 并未在本文件导入，
# 注解在运行时会求值并抛 NameError；现实中通常配合 `from __future__ import annotations`
# 或把这些类型显式 import（或放进 TYPE_CHECKING 块）才能正常使用。
from abc import ABC, abstractmethod
from typing import Any, Iterator

# 第 2 段：声明接口本体——把"状态快照的存取"从具体存储介质中解耦
# 这是依赖倒置：上层图执行逻辑只依赖这 4 个方法，内存 / SQLite / Postgres / Redis
# 等任何后端都只需继承本类，从而做到换存储不改上层代码。
# 注意这里刻意只定义"读、写、列、删"这四种能力，是最小完备集：
# get/put 支撑恢复与推进，list 支撑回放与时间旅行，delete 支撑生命周期回收。
class BaseCheckpointSaver(ABC):
    """检查点持久化接口"""

    # 第 3 段：读取——按线程取"最新"检查点
    # config 用嵌套的 {"configurable": {...}} 形状，是为了和 RunnableConfig 保持一致，
    # 让调用方可以把整个 config 原样透传，而不必在每层手拆字段。
    # 边界条件：thread_id 从未写入过、或已被 delete 清空时，必须返回 None 而不是抛异常，
    # 上层才能用 `is None` 区分"全新线程"与"读取失败"这两种语义。
    @abstractmethod
    def get(self, config: dict) -> Checkpoint | None:
        """
        获取指定线程的最新检查点

        Args:
            config: {"configurable": {"thread_id": "xxx", "checkpoint_id": "xxx"}}

        Returns:
            Checkpoint 或 None（如果不存在）
        """
        pass

    # 第 4 段：写入——追加一份新快照并返回其标识
    # 数据流：checkpoint 是状态快照本身，metadata 是用于检索/排序的旁路信息
    #（步骤号、来源、时间戳等），二者分开存是为了让元数据查询不必反序列化大对象。
    # 关键点：checkpoint_id 由实现方生成并回传，而不是调用方传入，
    # 因此实现必须保证其在线程内单调唯一；同时写入应当是原子的，
    # 否则并发推进同一 thread_id 时可能产生"半条"历史记录。
    @abstractmethod
    def put(
        self,
        config: dict,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata
    ) -> str:
        """
        保存检查点

        Args:
            config: 线程配置
            checkpoint: 检查点数据
            metadata: 元数据

        Returns:
            新的 checkpoint_id
        """
        pass

    # 第 5 段：列举历史——给回放/调试/时间旅行提供入口
    # limit 取 -1 作哨兵值表示"不限制"，沿用数据库与切片里的常见约定，
    # 好处是默认参数即可表达"返回全部"，无需再引入 None 分支。
    # 复杂度/易错点：返回 Iterator 意味着惰性拉取，实现不应一次性把整段历史读进内存；
    # 反过来，调用方必须及时消费到底，因为游标往往绑定在一条数据库连接上。
    @abstractmethod
    def list(self, config: dict, limit: int = -1) -> Iterator[Checkpoint]:
        """列出线程的检查点历史"""
        pass

    # 第 6 段：删除——整线程级别的清理
    # 语义是"抹掉该 thread_id 下的全部检查点"，而非删除单条，
    # 因此实现需要处理级联：快照、元数据（以及可能存在的 pending writes 表）都要一起清，
    # 否则会残留孤儿记录，让后续 get 读到"状态已删但元数据还在"的脏数据。
    @abstractmethod
    def delete(self, config: dict) -> None:
        """删除线程的所有检查点"""
        pass
```
### 3.2 Memory Saver（内存检查点）

```python
from langgraph.checkpoint.memory import MemorySaver

# 创建内存检查点存储
memory_saver = MemorySaver()

# 配置
config = {
    "configurable": {
        "thread_id": "user_123",
        "checkpoint_id": None  # None 表示最新检查点
    }
}

# 使用
graph.compile(checkpointer=memory_saver)

# 特性:
# - 进程内存储，重启后丢失
# - 最快，适合开发/测试
# - 可设置最大历史条目数
```

**MemorySaver 完整示例**:

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from typing import TypedDict

class State(TypedDict):
    messages: list
    step: int

def node_1(state):
    return {"messages": ["Step 1 done"], "step": state.get("step", 0) + 1}

def node_2(state):
    return {"messages": ["Step 2 done"], "step": state.get("step", 0) + 1}

# 构建图
graph = StateGraph(State)
graph.add_node("step1", node_1)
graph.add_node("step2", node_2)
graph.set_entry_point("step1")
graph.add_edge("step1", "step2")
graph.add_edge("step2", END)

# 编译并启用检查点
checkpointer = MemorySaver()
compiled = graph.compile(checkpointer=checkpointer)

# 首次执行
config = {"configurable": {"thread_id": "test-thread"}}
result = compiled.invoke({"messages": [], "step": 0}, config)
print(result)

# 恢复执行（从检查点继续）
config = {"configurable": {"thread_id": "test-thread"}}
state = compiled.get_state(config)
print(f"Current step: {state.values.get('step')}")

# 更新状态并继续
new_state = {"messages": ["Manual update"], "step": 99}
compiled.update_state(config, new_state)
```

### 3.3 SQLite Saver

```python
from langgraph.checkpoint.sqlite import SqliteSaver

# 创建 SQLite 检查点存储
# 自动创建表: checkpoints, checkpoint_writes
sqlite_saver = SqliteSaver.from_conn_string(
    conn_string="checkpoints.db",  # 或 ":memory:" for in-memory
    # 或使用现有连接:
    # conn=existing_connection,
    # checkpointer_table="my_checkpoints"
)

# 高级配置
sqlite_saver = SqliteSaver(
    conn_string="checkpoints.db",
    auto_validate=False,          # 启动时验证表结构
    verbose=True,                 # 打印 SQL 语句
)

# 使用
compiled = graph.compile(checkpointer=sqlite_saver)
```

**SQLite 完整示例**:

```python
import sqlite3
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from typing import TypedDict

class State(TypedDict):
    data: str
    count: int

def process(state):
    return {"data": f"processed_{state['data']}", "count": state["count"] + 1}

graph = StateGraph(State)
graph.add_node("processor", process)
graph.set_entry_point("processor")
graph.add_edge("processor", END)

# 使用 SQLite 持久化
conn = sqlite3.connect("agent_checkpoints.db", check_same_thread=False)
sqlite_saver = SqliteSaver(conn)

compiled = graph.compile(checkpointer=sqlite_saver)

# 执行
config = {"configurable": {"thread_id": "user_123"}}
result = compiled.invoke({"data": "initial", "count": 0}, config)

# 持久化验证 - 重新启动后恢复
import sqlite3
conn2 = sqlite3.connect("agent_checkpoints.db")
sqlite_saver2 = SqliteSaver(conn2)
compiled2 = graph.compile(checkpointer=sqlite_saver2)

config = {"configurable": {"thread_id": "user_123"}}
state = compiled2.get_state(config)
print(f"Restored state: {state.values}")
```

### 3.4 PostgreSQL Saver

```python
from langgraph.checkpoint.postgres import PostgresSaver

# 创建 PostgreSQL 检查点存储
postgres_saver = PostgresSaver.from_conn_string(
    conn_string="postgresql://user:pass@localhost:5432/checkpoints",
    # 或使用环境变量
    # database_url=os.getenv("DATABASE_URL")
)

# 连接池配置
postgres_saver = PostgresSaver.from_conn_string(
    conn_string="postgresql://...",
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=3600,
)

# 预热连接（建议在生产环境）
postgres_saver.setup()  # 创建必要的表和索引

# 使用
compiled = graph.compile(checkpointer=postgres_saver)
```

**PostgreSQL 完整示例**:

```python
import os
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
from typing import TypedDict

# 第 1 段：定义图的状态结构（Shape of State）
# 用 TypedDict 声明状态"有哪些键、每个键是什么类型"，LangGraph 会在运行时校验节点返回值
# 是否落在已声明的键上。注意：这里没用 Annotated[..., reducer]，所以每个字段的默认
# 合并语义是"后写覆盖"（last-value wins），而不是列表追加或字典合并。
class State(TypedDict):
    conversation: list[dict]  # 对话历史，元素形如 {"role": ..., "content": ...}
    context: dict             # 会话级附加数据（如用户画像、检索缓存）

# 第 2 段：节点函数（图的"计算单元"）
# 节点只需返回"增量/局部"状态，LangGraph 负责把它并回全局 state——返回里没出现的键
# （如这里的 context）保持原值不变，这就是为什么节点写起来像纯函数一样短小。
# 易错点：state.get("conversation", []) 的默认值不能省，否则首次调用（冷启动、无 checkpoint）
# 会抛 KeyError；同时这里返回的是全新列表，避免原地 append 污染传入的对象。
def chat_node(state):
    return {
        "conversation": state.get("conversation", []) + ["Response generated"]
    }

# 第 3 段：搭建图骨架（拓扑结构）
# 这是一个极简单的单节点线性图：入口 -> chat -> 结束。之所以拆成 add_node/add_edge，
# 是为了后面能无条件替换成"检索 -> 生成 -> 校验"等复杂拓扑而不用改动节点实现。
graph = StateGraph(State)
graph.add_node("chat", chat_node)
graph.set_entry_point("chat")  # 入口点决定 invoke 时从哪个节点开始执行
graph.add_edge("chat", END)    # 显式指向 END，否则图不知道何时收敛

# 第 4 段：接入生产级持久化（Postgres Checkpointer）
# PostgreSQL 生产配置
# checkpointer 让每次执行后状态落库：服务重启后仍可凭 thread_id 恢复会话，
# 也是"多轮对话有记忆"的实现基础（等价于把内存 dict 换成事务型外部存储）。
# 连接池参数很关键：pool_size=20 是常驻连接数，max_overflow=40 表示峰值最多临时
# 再加 40 条，即该进程最多占用 60 条 PG 连接——按并发量估算是否超库的 max_connections。
# 易错点：部分 langgraph 版本中 from_conn_string 是上下文管理器，必须写成
# `with PostgresSaver.from_conn_string(...) as saver:` 才会真正建立连接。
postgres_saver = PostgresSaver.from_conn_string(
    conn_string=os.getenv("POSTGRES_URL"),  # 连接串从环境变量读取，避免硬编码密钥
    pool_size=20,
    max_overflow=40,
)
postgres_saver.setup()  # 建表/建索引，幂等操作，启动时执行一次即可

# 第 5 段：编译成可执行对象
# compile 会把节点与 checkpointer 装配成 Runnable：之后每次 invoke 都自动做
# "读取旧 checkpoint -> 合并输入 -> 执行节点 -> 写回新 checkpoint"。
compiled = graph.compile(checkpointer=postgres_saver)

# 第 6 段：单会话处理逻辑（无状态函数 + 外部状态）
# 多线程并发使用
import threading

# 每个 thread_id 对应一条独立会话线程；checkpointer 以此做隔离，互不串数据。
def handle_user(thread_id: str, message: str):
    config = {"configurable": {"thread_id": thread_id}}  # config 是访问 checkpoint 的唯一钥匙

    # 恢复或创建状态
    # 先读后写：get_state 拿到该 thread_id 的最新快照，存在历史就追加消息，
    # 否则初始化空 context。这是"冷启动/热恢复"的分叉点。
    current_state = compiled.get_state(config)
    if current_state.values.get("conversation"):
        state_update = {"conversation": current_state.values["conversation"] + [{"role": "user", "content": message}]}
    else:
        state_update = {"conversation": [{"role": "user", "content": message}], "context": {}}

    # 传入的是"增量更新"而非完整 state；图会把它与 checkpoint 合并后再驱动节点执行。
    result = compiled.invoke(state_update, config)

# 第 7 段：并发压测入口
# 100 个线程模拟 100 个用户的并发请求。此处选线程而非进程，是因为瓶颈在等待
# 数据库网络 IO，线程在等待时会让出 GIL，性价比高于多进程。
threads = [
    threading.Thread(target=handle_user, args=(f"user_{i}", f"Message {i}"))
    for i in range(100)
]
for t in threads:
    t.start()
# 易错点：get_state + invoke 之间没有事务保护，同一 thread_id 被并发调用时会发生
# 读-改-写竞争（丢失更新）。生产上要么保证同一 thread_id 串行（如加锁/队列），
# 要么改用支持并发合并的 reducer；不同 thread_id 之间才是真正安全的并行。
for t in threads:
    t.join()  # 主线程等待所有工作线程结束，起到"同步栅栏"的作用
```
### 3.5 Redis Saver

```python
from langgraph.checkpoint.redis import RedisSaver

# 创建 Redis 检查点存储
redis_saver = RedisSaver.from_conn_string(
    conn_string="redis://localhost:6379/0",
    # 或
    # host="localhost",
    # port=6379,
    # db=0,
    # password="secret",
)

# 集群配置
redis_saver = RedisSaver(
    nodes=["redis://node1:6379", "redis://node2:6379", "redis://node3:6379"],
    ssl=True,
    max_connections=50,
)

# 使用
compiled = graph.compile(checkpointer=redis_saver)
```

**Redis 完整示例**:

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.redis import RedisSaver
from typing import TypedDict

class State(TypedDict):
    task: str
    result: str

def worker(state):
    return {"result": f"processed_{state['task']}"}

graph = StateGraph(State)
graph.add_node("worker", worker)
graph.set_entry_point("worker")
graph.add_edge("worker", END)

redis_saver = RedisSaver.from_conn_string("redis://localhost:6379/0")
compiled = graph.compile(checkpointer=redis_saver)

# 高可用场景 - 自动重连
import redis
from redis.retry import Retry
from redis.backoff import ExponentialBackoff

retry_policy = Retry(
    ExponentialBackoff(cap=10, base=1),
    retries=10,
    supported_errors=(redis.ConnectionError, redis.TimeoutError)
)

redis_saver = RedisSaver(
    conn_string="redis://localhost:6379",
    socket_connect_timeout=5,
    socket_keepalive=True,
    socket_keepalive_options={},
    retry_policy=retry_policy,
)

# 检查点 TTL 配置
redis_saver = RedisSaver(
    conn_string="redis://localhost:6379",
    default_ttl=86400,  # 24小时
    per_thread_ttl_getter=lambda thread_id: 7 * 86400 if "premium" in thread_id else 86400,
)
```

### 3.6 选择指南

```mermaid
flowchart TD
    A{数据规模?} -->|小型| B{并发需求?}
    A -->|中型| C{SQLite}
    A -->|大型| D{需要集群?}
    B -->|低| E[Memory]
    B -->|高| F[SQLite/PostgreSQL]
    D -->|是| G[PostgreSQL]
    D -->|否| H{Redis可用?}
    H -->|是| I[Redis]
    H -->|否| G
    E -.->|开发测试| F
    C -.->|单节点| F
    G -.->|生产环境| I
    style E fill:#90EE90,color:#1d1d1f
    style I fill:#87CEEB,color:#1d1d1f
    style G fill:#FFB74D,color:#1d1d1f
```

| 存储 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| Memory | 开发/测试/小型应用 | 最快、最简单 | 重启丢失、不支持并发 |
| SQLite | 单机部署、小中型应用 | 零配置、持久化 | 不适合高并发、写入瓶颈 |
| PostgreSQL | 生产环境、中大型应用 | 高并发、支持集群 | 需要数据库基础设施 |
| Redis | 需要高速缓存、高可用 | 极快、内存级性能 | 持久性依赖配置、成本高 |

## 4. 线程化检查点

### 4.1 线程概念

```python
# 线程是检查点管理的核心概念
# 每个用户会话/任务对应一个唯一的 thread_id

# 线程结构
thread_id = "user_123"                    # 简单格式
thread_id = "org_acme_user_123_conv_456"  # 分层格式（支持前缀匹配）
thread_id = "tenant_1:user_123"           # 多租户格式

# 线程配置
config = {
    "configurable": {
        "thread_id": "user_123",
        "checkpoint_id": None,             # None = 最新检查点
        # 或指定特定检查点进行回溯:
        # "checkpoint_id": "1ef2c..."
    }
}
```

### 4.2 基础线程操作

```python
from langgraph.graph import StateGraph
from langgraph.checkpoint.memory import MemorySaver
from typing import TypedDict

class State(TypedDict):
    messages: list
    context: dict

graph = StateGraph(State)

# ... 添加节点 ...

checkpointer = MemorySaver()
compiled = graph.compile(checkpointer=checkpointer)

# ===================== 线程操作 =====================

# 1. 创建新线程并执行
config = {"configurable": {"thread_id": "thread_001"}}
result = compiled.invoke({"messages": [], "context": {}}, config)

# 2. 恢复线程继续执行
config = {"configurable": {"thread_id": "thread_001"}}
result = compiled.invoke({"messages": [{"role": "user", "content": "继续上次的工作"}]}, config)

# 3. 获取线程当前状态
config = {"configurable": {"thread_id": "thread_001"}}
current_state = compiled.get_state(config)
print(f"Step: {current_state.metadata.get('step')}")
print(f"Values: {current_state.values}")

# 4. 查看线程历史
config = {"configurable": {"thread_id": "thread_001"}}
history = list(compiled.get_state_history(config))
for checkpoint in history:
    print(f"Checkpoint: {checkpoint.id}, Step: {checkpoint.metadata.get('step')}")

# 5. 强制保存检查点（手动触发）
config = {"configurable": {"thread_id": "thread_001"}}
compiled.update_state(
    config,
    {"messages": [{"role": "system", "content": "Checkpoint saved"}]},
)
```

### 4.3 线程状态管理

```python
# ===================== 状态操作 =====================

# 1. 更新线程状态（修改检查点）
config = {"configurable": {"thread_id": "thread_001"}}
compiled.update_state(
    config,
    {"context": {"last_action": "user_confirmed", "confirm_time": 1234567890}},
)

# 2. 恢复到特定检查点
config = {"configurable": {
    "thread_id": "thread_001",
    "checkpoint_id": "checkpoint_abc123"  # 指定要恢复的检查点
}}
compiled.update_state(
    config,
    {"messages": [], "context": {}},  # 可选：设置新的状态
)

# 3. 重放执行（调试/审计）
config = {"configurable": {"thread_id": "thread_001"}}
for event in compiled.stream(None, config):
    # 重放每个步骤，观察状态变化
    print(event)

# 4. 分支：从检查点创建新分支
config = {"configurable": {
    "thread_id": "thread_001",
    "checkpoint_id": "checkpoint_abc123"  # 从此检查点分支
}}
# 新状态会创建新检查点链
result = compiled.invoke({"messages": ["New branch message"], "context": {}}, config)
```

### 4.4 多线程并发管理

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

class ThreadManager:
    """线程管理器"""

    def __init__(self, checkpointer):
        self.checkpointer = checkpointer
        self.active_threads = {}  # thread_id -> metadata

    def get_or_create_thread(self, user_id: str) -> str:
        """获取或创建线程"""
        thread_id = f"user_{user_id}"
        # 检查线程是否存在
        config = {"configurable": {"thread_id": thread_id}}
        state = self.checkpointer.get(config)

        if state is None:
            # 创建新线程
            return thread_id
        return thread_id

    def list_user_threads(self, user_id: str) -> list[str]:
        """列出用户的所有线程"""
        # 使用前缀匹配
        prefix = f"user_{user_id}"
        # 从存储中查询（需要存储层支持前缀查询）
        all_threads = self.list_all_threads()
        return [t for t in all_threads if t.startswith(prefix)]

    def archive_thread(self, thread_id: str):
        """归档线程（标记为完成，保留历史）"""
        config = {"configurable": {"thread_id": thread_id}}
        self.checkpointer.put(
            config,
            {"status": "archived", "archived_at": time.time()},
            {"source": "system", "suspended": True}
        )

# 并发执行示例
manager = ThreadManager(checkpointer)

async def handle_request(user_id: str, message: str):
    thread_id = manager.get_or_create_thread(user_id)
    config = {"configurable": {"thread_id": thread_id}}

    # 获取当前状态
    current = compiled.get_state(config)
    state_update = {
        "messages": current.values.get("messages", []) + [{"role": "user", "content": message}]
    }

    result = await compiled.ainvoke(state_update, config)
    return result

# 并发处理多个请求
async with ThreadPoolExecutor(max_workers=100) as executor:
    futures = [
        handle_request(f"user_{i}", f"Message {i}")
        for i in range(1000)
    ]
    results = await asyncio.gather(*futures)
```

### 4.5 线程生命周期管理

```python
from datetime import datetime, timedelta

# 第 1 段：模块导入与时间基准准备
# 这里的两个类分别承担不同职责：datetime.now() 提供"当前本地时间"作为淘汰基准，
# timedelta 把"天数"这一人类可读的配置换算成可比较的时间差，避免在循环里反复算秒数。
# 注意：代码后文用到了 time.time()，但本段并未导入 time 模块——这是一个真实的隐患，
# 实际运行时 archive_thread() 会抛 NameError，教学时应引导学生发现这一点。

class ThreadLifecycleManager:
    """线程生命周期管理器"""

    # 第 2 段：构造与配置注入
    # 采用"依赖注入"而非在内部 new 一个 checkpointer，是为了让同一套清理逻辑可以复用
    # 到内存、SQLite、Postgres 等不同存储后端；max_age_days 给出默认值 30 天，
    # 使调用方零配置即可工作，同时保留了自定义保留期的能力。
    def __init__(self, checkpointer, max_age_days: int = 30):
        self.checkpointer = checkpointer
        self.max_age_days = max_age_days

    # 第 3 段：批量清理过期线程（本类的对外主入口）
    # 核心思路是"先算阈值，再逐个线程取其最新检查点判断年龄"。
    # 关键数据流：thread_id -> config -> 最新 checkpoint -> metadata.updated_at(epoch 秒) -> 与 cutoff 比较。
    # 易错点：cutoff 是"naive 本地 datetime"，再 .timestamp() 才变成 epoch 秒；
    # 若存储写入的是 UTC epoch，这里就存在时区偏移，临界线程可能被提前/延后清理。
    def cleanup_old_threads(self):
        """清理过期线程"""
        all_threads = self.list_all_threads()
        # 阈值只需算一次，放在循环外可避免 O(n) 次时间运算
        cutoff = datetime.now() - timedelta(days=self.max_age_days)

        # 逐个线程处理：不一次性把所有 checkpoint 拉进内存，是为了控制内存占用
        for thread_id in all_threads:
            config = {"configurable": {"thread_id": thread_id}}
            # limit=1 表示只取"最新一条"，这是与下面那种"取最新时间戳"语义的隐含约定；
            # 若存储后端不保证倒序返回，取到的可能不是最新检查点，清理判断就会失真。
            checkpoints = list(self.checkpointer.list(config, limit=1))

            # 空列表说明该线程没有任何检查点（可能是脏数据），跳过滤避免无谓删除
            if checkpoints:
                latest = checkpoints[0]
                # 用 .get(..., 0) 兜底：缺失 updated_at 的旧数据会被当成 1970 年，从而判定为过期；
                # 这是刻意的保守策略，但也可能导致"老数据被误删"，教学时值得展开讨论。
                if latest.metadata.get("updated_at", 0) < cutoff.timestamp():
                    # 超过期限，删除或归档
                    # 二选一的分支体现了"软删除优先"的治理思路：能归档就不物理删除，便于审计回溯。
                    if should_archive(thread_id):
                        self.archive_thread(thread_id)
                    else:
                        self.delete_thread(thread_id)

    # 第 4 段：归档线程（软删除）
    # 归档不移动数据，而是往同一 thread 上再写一个带 archived 标记的新检查点，
    # 这样历史链路完整保留，同时业务侧可凭该标记过滤掉已归档线程。
    # 副作用提示：新写入的检查点会刷新 updated_at，使该线程"看起来变新了"，
    # 若下一轮清理仍以最新时间戳判断，被归档线程将永远不会再次被处理——需明确这一语义。
    def archive_thread(self, thread_id: str):
        """归档线程 - 标记但保留数据"""
        config = {"configurable": {"thread_id": thread_id}}
        state = self.checkpointer.get(config)

        # 线程不存在时静默返回，保证归档操作幂等，可安全重试
        if state:
            # 添加归档标记
            # 用 {**state, ...} 展开旧状态再叠加新字段，避免原地修改导致检查点内部状态被污染；
            # 第三个参数是写入元数据（source 用于溯源，archived 便于按标记检索）。
            # 边界条件：time.time() 依赖已导入的 time 模块，当前文件缺失该导入。
            self.checkpointer.put(
                config,
                {**state, "archived": True, "archived_at": time.time()},
                {"source": "lifecycle", "archived": True}
            )

    # 第 5 段：物理删除
    # 直接按 thread_id 删除，要求存储后端保证"该线程下所有检查点一并清除"；
    # 这是不可逆操作，因此调用方必须先经过 should_archive 的判定，天然形成删除前的最后一道闸门。
    def delete_thread(self, thread_id: str):
        """删除线程及其所有检查点"""
        config = {"configurable": {"thread_id": thread_id}}
        self.checkpointer.delete(config)

    # 第 6 段：线程枚举（抽象钩子）
    # 把"如何列出全部线程"留给子类/具体存储实现，是因为不同后端能力差异极大：
    # SQL 可以 SELECT DISTINCT thread_id，而某些 KV 存储只能靠外部索引维护。
    # 抛出 NotImplementedError 而非返回空列表，是为了避免"静默不清理"这种更难排查的故障。
    def list_all_threads(self) -> list[str]:
        """列出所有线程（依赖存储实现）"""
        # 实现取决于使用的存储后端
        raise NotImplementedError
```
## 5. 跨会话状态持久化

### 5.1 会话恢复模式

```python
# 模式 1: 精确恢复
# 恢复到上次中断的确切状态

config = {"configurable": {"thread_id": "user_123"}}
current_state = compiled.get_state(config)

if current_state.values.get("step") == 3:
    # 精确恢复到第 3 步
    print("Resuming from exact state...")
    result = compiled.invoke(None, config)  # None = 使用当前状态继续

# 模式 2: 选择性恢复
# 基于条件决定恢复点

config = {"configurable": {"thread_id": "user_123"}}
history = list(compiled.get_state_history(config))

# 找到最后一个满足条件的检查点
target_checkpoint = None
for checkpoint in reversed(history):
    if checkpoint.metadata.get("step") == 3 and checkpoint.metadata.get("validated"):
        target_checkpoint = checkpoint
        break

if target_checkpoint:
    config = {
        "configurable": {
            "thread_id": "user_123",
            "checkpoint_id": target_checkpoint.id
        }
    }
    compiled.update_state(config, {"validated": True})
    result = compiled.invoke(None, config)
```

### 5.2 状态迁移与版本升级

```python
# 状态版本迁移
# 当状态结构发生变化时，需要迁移历史检查点

from typing import TypedDict, Any

class StateV1(TypedDict):
    messages: list
    step: int

class StateV2(TypedDict):
    messages: list
    step: int
    context: dict  # 新增字段

def migrate_state(state: dict, from_version: str, to_version: str) -> dict:
    """状态迁移函数"""

    if from_version == "1.0" and to_version == "2.0":
        # 迁移逻辑
        return {
            **state,
            "context": state.get("context", {}),  # 默认空上下文
            "version": "2.0",
            "migrated_at": time.time(),
        }

    return state

def migrate_thread_checkpoints(thread_id: str, checkpointer):
    """迁移线程的所有检查点"""
    config = {"configurable": {"thread_id": thread_id}}

    history = list(checkpointer.list(config))
    migrated = []

    for checkpoint in history:
        old_state = checkpoint.state
        new_state = migrate_state(old_state, "1.0", "2.0")

        new_config = {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_id": checkpoint.id,
            }
        }

        checkpointer.put(
            new_config,
            new_state,
            {**checkpoint.metadata, "migrated_from": "1.0"}
        )
        migrated.append(checkpoint.id)

    return migrated
```

### 5.3 状态序列化与反序列化

```python
# 第 1 段：依赖导入与运行时前提（这一段决定有哪些可用的序列化后端）
import json
import pickle
from datetime import datetime

# 第 2 段：容器类定义（把"状态序列化/反序列化"与"线程快照导入/导出"收口到同一处，便于统一约束编码格式）
class StateSerializer:
    """状态序列化器"""

    # 第 3 段：状态 → 字节（这一段负责把内存对象写成可传输的 bytes）
    @staticmethod
    def serialize_state(state: dict) -> bytes:
        """将状态序列化为字节"""
        # 方法 1: JSON（可读但不支持复杂类型）
        # 意图：default=str 让 JSON 无法原生表达的对象（datetime、枚举等）退化成字符串，
        # 从而绝不抛 TypeError；代价是类型信息丢失，属于有损往返。
        # 易错点：本方法写了 3 个 return，实际只有第一个可达，后两个是死代码。
        return json.dumps(state, default=str).encode()  # 唯一生效路径：JSON 文本 → UTF-8 字节

        # 方法 2: Pickle（支持复杂类型，但有安全风险）
        # 原理：Pickle 能原样保留对象图，但反序列化等价于执行任意代码，且与 Python 版本/类定义强耦合，仅限可信数据。
        return pickle.dumps(state)  # 死代码：上面已 return，永远执行不到

        # 方法 3: 自定义格式
        return StateSerializer._custom_serialize(state)  # 死代码：且 _custom_serialize 从未定义，真跑到会 AttributeError

    # 第 4 段：字节 → 状态（这一段负责反序列化，必须与上面的编码方式配对）
    @staticmethod
    def deserialize_state(data: bytes) -> dict:
        """反序列化状态"""
        # 数据流：bytes --decode--> str --json.loads--> dict。
        # 关键约束：这里只实现了 JSON 分支，若写入端实际用了 pickle，decode/loads 都会失败；
        # 且 JSON 往返后 datetime 已变 str，调用方不能再假设类型不变。
        return json.loads(data.decode())

    # 第 5 段：线程状态导出（把 checkpointer 里的历史快照转成跨进程可读的 JSON 文本）
    @staticmethod
    def export_thread_state(thread_id: str, checkpointer) -> str:
        """导出线程状态为可移植格式"""
        # checkpointer 约定：按含 thread_id 的 config 枚举该线程全部 checkpoint，顺序即时间顺序；
        # list() 把惰性迭代器物化，避免后续多次遍历时被消费掉。
        config = {"configurable": {"thread_id": thread_id}}
        history = list(checkpointer.list(config))

        # 先固定外层骨架（线程标识 + 导出时间），再在循环里逐个追加，避免边循环边拼字符串。
        export_data = {
            "thread_id": thread_id,
            "exported_at": datetime.now().isoformat(),  # ISO 8601：可排序、跨系统可解析、带时区语义
            "checkpoints": []
        }

        for checkpoint in history:
            export_data["checkpoints"].append({
                "id": checkpoint.id,
                "timestamp": checkpoint.timestamp,
                "state": checkpoint.state,       # 可能含复杂对象，靠末尾 default=str 兜底
                "metadata": checkpoint.metadata,
            })

        # 复杂度 O(n)，n 为 checkpoint 数；indent=2 只为可读性，default=str 负责把不可序列化类型转字符串。
        return json.dumps(export_data, indent=2, default=str)

    # 第 6 段：线程状态导入（把导出 JSON 重建回 checkpointer，是导出的逆操作）
    @staticmethod
    def import_thread_state(export_json: str, checkpointer) -> str:
        """从导出数据恢复线程"""
        # 用导出文件自带的 thread_id，而不是让调用方另传参数，确保写回同一线程命名空间。
        data = json.loads(export_json)
        thread_id = data["thread_id"]

        config = {"configurable": {"thread_id": thread_id}}

        # 边界条件：这里按导出顺序原样 put，未做去重/幂等处理；
        # 对同一 thread_id 重复导入会在历史里追加副本，回放时可能重复执行副作用。
        for cp_data in data["checkpoints"]:
            checkpointer.put(
                config,
                cp_data["state"],       # 已是 JSON 还原后的值，复杂类型早在导出时退化为 str
                cp_data["metadata"]
            )

        return thread_id
```
### 5.4 状态备份与恢复

```python
# 第 1 段：模块导入与类骨架（备好文件系统工具，并划定"备份管理器"的职责边界）
import shutil
from pathlib import Path

# 注意：本类用到了 json 与 datetime，但当前片段并未导入它们，
# 真实工程中需补上 `import json` / `from datetime import datetime`，否则运行即 NameError。
# shutil 已导入却未被本类使用，通常是给后续"归档/压缩备份"预留的扩展点。

class StateBackupManager:
    """状态备份管理器"""

    # 第 2 段：构造与备份目录初始化（把"备份存哪里"这一副作用收敛到实例创建时）
    def __init__(self, checkpointer, backup_dir: str = "./backups"):
        # checkpointer 需具备 list/put/delete 三个方法（鸭子类型），此处不做校验；
        # 这是"依赖注入 + 隐式接口"，换成内存/SQLite 等实现时本类无需改动。
        self.checkpointer = checkpointer
        # 用 Path 而非字符串拼接，路径分隔符交给 pathlib 处理；存为 Path 后
        # 后续的 `/` 文件名拼接语法才可用。
        self.backup_dir = Path(backup_dir)
        # exist_ok=True 使重复初始化幂等：目录已存在不报错；
        # 但不会递归创建多层父目录，若要那样需再加 parents=True。
        self.backup_dir.mkdir(exist_ok=True)

    # 第 3 段：单线程备份（把检查点序列化成自描述、可独立搬运的 JSON 快照）
    def backup_thread(self, thread_id: str) -> Path:
        """备份单个线程"""
        # checkpointer 的查询接口以 config 为键，thread_id 是"会话/线程"维度的隔离标识。
        config = {"configurable": {"thread_id": thread_id}}
        # list(...) 返回的是生成器/迭代器，必须立刻物化：既避免后续重复遍历被耗尽，
        # 也保证拿到的是"同一时刻的稳定视图"，不会边备份边被写入干扰。
        history = list(self.checkpointer.list(config))

        # 文件名内嵌时间戳，使同一线程的多次备份互不覆盖，天然实现版本化；
        # 边界条件：同一秒内备份两次仍会撞名，必要时可追加微秒或 uuid。
        backup_file = self.backup_dir / f"{thread_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        # with 确保异常路径下文件句柄也会关闭；默认文本模式写入。
        with open(backup_file, "w") as f:
            # 结构上把 thread_id 冗余存进文件本身，恢复时无需解析文件名，
            # 备份文件因此"自描述"，可单独改名/搬移而不失效。
            json.dump({
                "thread_id": thread_id,
                "checkpoints": [
                    {
                        "id": cp.id,
                        "state": cp.state,
                        "metadata": cp.metadata,
                    }
                    # 列表推导只抽取恢复所需的最小字段，控制快照体积。
                    for cp in history
                ]
            }, f, default=str, indent=2)
            # default=str 是兜底序列化：state/metadata 若含 datetime、自定义对象等
            # 非 JSON 原生类型会被转成字符串，避免 TypeError；代价是类型信息丢失，
            # 若这些字段承载可执行语义，需改用自定义 encoder/decoder。
            # indent=2 只为可读性与 diff 友好，会显著增大文件体积。

        # 返回 Path 而非字符串，调用方可直接拿去做 unlink/读取等操作。
        return backup_file

    # 第 4 段：从备份恢复（先清空再重放，等价于一次"覆盖式回滚"）
    def restore_thread(self, backup_file: Path) -> str:
        """从备份恢复线程"""
        with open(backup_file, "r") as f:
            data = json.load(f)

        # 目标线程 ID 取自文件内容而非入参，恢复去向由备份自身决定。
        thread_id = data["thread_id"]
        # 必须复用与备份时相同的 config 形状，否则会写进另一个线程空间。
        config = {"configurable": {"thread_id": thread_id}}

        # 先删除现有检查点
        # 顺序是关键：先删后写。若反过来，删除会连带清掉刚恢复的数据；
        # 且整个过程并非原子——若 put 中途抛错会留下"部分恢复"的半成品，
        # 生产环境应包 try/except 做回滚或记录已恢复到的断点。
        self.checkpointer.delete(config)

        # 恢复每个检查点
        for cp_data in data["checkpoints"]:
            # 只重放 state 与 metadata；cp_data["id"] 未被使用，
            # 说明 checkpointer 会按写入顺序自行重新分配检查点 ID，
            # 备份里存的 id 仅作快照信息，不能指望恢复后 ID 不变。
            self.checkpointer.put(
                config,
                cp_data["state"],
                cp_data["metadata"]
            )

        return thread_id

    # 第 5 段：批量备份（逐线程串行执行，保持实现简单并复用单线程逻辑）
    def backup_all_threads(self, thread_ids: list[str]) -> list[Path]:
        """备份所有线程"""
        # 列表推导即"映射"，语义直观；但这是串行 I/O，
        # 线程数很大时总耗时等于各线程之和，可考虑并发或批量快照优化。
        # 易错点：任一线程失败会整体抛异常，但此前已写好的备份文件仍留在磁盘上，
        # 调用方需意识到可能只得到"部分成功"的结果集。
        return [self.backup_thread(tid) for tid in thread_ids]
```
## 6. 代码实现示例

### 6.1 完整示例：带检查点的对话 Agent

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.prebuilt import chat_agent_executor
from typing import TypedDict, Annotated
from langgraph.graph import add_messages
import os

# ============ 定义状态 ============

class AgentState(TypedDict):
    """带检查点的 Agent 状态"""
    messages: Annotated[list, add_messages]  # 自动合并消息
    tools_called: int
    current_task: str | None
    session_data: dict

# ============ 定义节点 ============

def router(state: AgentState):
    """路由决策节点"""
    last_message = state["messages"][-1]

    if hasattr(last_message, "content"):
        content = last_message.content.lower()
        if "code" in content:
            return "coding_agent"
        elif "search" in content or "find" in content:
            return "search_agent"
        elif "analyze" in content:
            return "analysis_agent"
        else:
            return "general_agent"

    return "general_agent"

def coding_agent(state: AgentState):
    """代码生成 Agent"""
    return {
        "messages": [{
            "role": "assistant",
            "content": "Here's the code solution..."
        }],
        "tools_called": state.get("tools_called", 0) + 1,
        "current_task": "coding"
    }

def search_agent(state: AgentState):
    """搜索 Agent"""
    return {
        "messages": [{
            "role": "assistant",
            "content": "Found relevant information..."
        }],
        "tools_called": state.get("tools_called", 0) + 1,
        "current_task": "search"
    }

def analysis_agent(state: AgentState):
    """分析 Agent"""
    return {
        "messages": [{
            "role": "assistant",
            "content": "Analysis complete..."
        }],
        "tools_called": state.get("tools_called", 0) + 1,
        "current_task": "analysis"
    }

def general_agent(state: AgentState):
    """通用 Agent"""
    return {
        "messages": [{
            "role": "assistant",
            "content": "I'll help with that."
        }],
        "current_task": "general"
    }

# ============ 构建图 ============

def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("router", router)
    graph.add_node("coding_agent", coding_agent)
    graph.add_node("search_agent", search_agent)
    graph.add_node("analysis_agent", analysis_agent)
    graph.add_node("general_agent", general_agent)

    graph.set_entry_point("router")

    # 条件边
    graph.add_conditional_edges(
        "router",
        lambda x: x,  # 返回目标节点名
        {
            "coding_agent": "coding_agent",
            "search_agent": "search_agent",
            "analysis_agent": "analysis_agent",
            "general_agent": "general_agent"
        }
    )

    # 所有 Agent 都结束
    for node in ["coding_agent", "search_agent", "analysis_agent", "general_agent"]:
        graph.add_edge(node, END)

    return graph.compile()

# ============ 主程序 ============

def main():
    # 初始化检查点存储
    postgres_saver = PostgresSaver.from_conn_string(
        conn_string=os.getenv("DATABASE_URL"),
        pool_size=20,
        max_overflow=40,
    )
    postgres_saver.setup()

    # 编译图
    app = build_graph()

    # 用户会话
    thread_id = "user_123_session_456"
    config = {"configurable": {"thread_id": thread_id}}

    # 对话循环
    while True:
        user_input = input("\nYou: ")
        if user_input.lower() in ["exit", "quit"]:
            break

        # 恢复或创建状态
        current_state = app.get_state(config)

        if current_state.values.get("messages"):
            # 继续会话 - 添加用户消息
            from langgraph.graph import add_messages
            state_update = {"messages": [("user", user_input)]}
        else:
            # 新会话
            state_update = {
                "messages": [("user", user_input)],
                "tools_called": 0,
                "current_task": None,
                "session_data": {}
            }

        # 执行
        result = app.invoke(state_update, config)

        # 输出响应
        response = result["messages"][-1].content
        print(f"\nAgent: {response}")

        # 显示检查点信息
        state = app.get_state(config)
        print(f"[Checkpoint: step {state.metadata.get('step', 'N/A')}]")

if __name__ == "__main__":
    main()
```

### 6.2 TypeScript/Node.js 实现

```typescript
// langgraph-checkpointing.ts
// LangGraph State Persistence and Checkpointing (Node.js)

import { StateGraph, END, MemorySaver, PostgresSaver } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";

// ============ 类型定义 ============

interface AgentState {
  messages: Array<{ role: string; content: string }>;
  toolsCalled: number;
  currentTask: string | null;
  sessionData: Record<string, unknown>;
}

interface CheckpointConfig {
  configurable: {
    threadId: string;
    checkpointId?: string;
  };
}

// ============ 节点函数 ============

function router(state: AgentState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const content = (lastMessage?.content || "").toLowerCase();

  if (content.includes("code")) return "codingAgent";
  if (content.includes("search")) return "searchAgent";
  if (content.includes("analyze")) return "analysisAgent";
  return "generalAgent";
}

function codingAgent(state: AgentState): Partial<AgentState> {
  return {
    messages: [...state.messages, { role: "assistant", content: "Code solution ready." }],
    toolsCalled: (state.toolsCalled || 0) + 1,
    currentTask: "coding",
  };
}

function searchAgent(state: AgentState): Partial<AgentState> {
  return {
    messages: [...state.messages, { role: "assistant", content: "Search results found." }],
    toolsCalled: (state.toolsCalled || 0) + 1,
    currentTask: "search",
  };
}

function analysisAgent(state: AgentState): Partial<AgentState> {
  return {
    messages: [...state.messages, { role: "assistant", content: "Analysis complete." }],
    toolsCalled: (state.toolsCalled || 0) + 1,
    currentTask: "analysis",
  };
}

function generalAgent(state: AgentState): Partial<AgentState> {
  return {
    messages: [...state.messages, { role: "assistant", content: "I'll help with that." }],
    currentTask: "general",
  };
}

// ============ 构建图 ============

function buildAgentGraph(checkpointer?: any) {
  const graph = new StateGraph<AgentState>({
    channels: {
      messages: {
        value: (x: any[], y: any) => [...x, y],
        default: () => [],
      },
      toolsCalled: {
        value: (x: number, y: number) => x + y,
        default: () => 0,
      },
      currentTask: {
        value: (x: any, y: any) => y,
        default: () => null,
      },
      sessionData: {
        value: (x: any, y: any) => ({ ...x, ...y }),
        default: () => ({}),
      },
    },
  });

  // 添加节点
  graph.addNode("router", router);
  graph.addNode("codingAgent", codingAgent);
  graph.addNode("searchAgent", searchAgent);
  graph.addNode("analysisAgent", analysisAgent);
  graph.addNode("generalAgent", generalAgent);

  // 设置入口
  graph.setEntryPoint("router");

  // 条件边
  graph.addConditionalEdges(
    "router",
    (state: AgentState) => {
      const lastMessage = state.messages[state.messages.length - 1];
      const content = (lastMessage?.content || "").toLowerCase();
      if (content.includes("code")) return "codingAgent";
      if (content.includes("search")) return "searchAgent";
      if (content.includes("analyze")) return "analysisAgent";
      return "generalAgent";
    },
    ["codingAgent", "searchAgent", "analysisAgent", "generalAgent"]
  );

  // 添加结束边
  graph.addEdge("codingAgent", END);
  graph.addEdge("searchAgent", END);
  graph.addEdge("analysisAgent", END);
  graph.addEdge("generalAgent", END);

  return graph.compile({ checkpointer });
}

// ============ 主程序 ============

async function main() {
  // 使用内存检查点（开发/测试）
  const memorySaver = new MemorySaver();

  // 或使用 PostgreSQL（生产）
  // const pgSaver = await PostgresSaver.fromConnString(process.env.DATABASE_URL!);
  // const app = buildAgentGraph(pgSaver);

  const app = buildAgentGraph(memorySaver);

  const threadId = `user_${uuidv4()}`;
  const config: CheckpointConfig = {
    configurable: { threadId },
  };

  // 首次执行
  const result1 = await app.invoke(
    {
      messages: [{ role: "user", content: "Write code for sorting" }],
      toolsCalled: 0,
      currentTask: null,
      sessionData: {},
    },
    config
  );

  console.log("First response:", result1.messages[result1.messages.length - 1].content);

  // 获取当前状态
  const currentState = await app.getState(config);
  console.log("Current step:", currentState.metadata?.step);

  // 继续对话
  const result2 = await app.invoke(
    {
      messages: [...result1.messages, { role: "user", content: "Now optimize it" }],
    },
    config
  );

  console.log("Second response:", result2.messages[result2.messages.length - 1].content);

  // 列出历史检查点
  const history = await app.getStateHistory(config);
  console.log("Checkpoint history:", history.length, "checkpoints");

  // 恢复到特定检查点
  if (history.length > 1) {
    const targetCheckpoint = history[history.length - 2];
    const restoreConfig: CheckpointConfig = {
      configurable: {
        threadId,
        checkpointId: targetCheckpoint.id,
      },
    };

    await app.updateState(restoreConfig, {
      messages: [...targetCheckpoint.values.messages],
    });

    const restoredState = await app.getState(restoreConfig);
    console.log("Restored to checkpoint:", restoredState.metadata?.step);
  }
}

// 运行
main().catch(console.error);
```

### 6.3 高级用法：自定义检查点逻辑

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint, CheckpointMetadata
from langgraph.checkpoint.memory import MemorySaver
from typing import TypedDict, Any
import time

class CustomCheckpointer(BaseCheckpointSaver):
    """自定义检查点存储 - 添加业务逻辑"""

    def __init__(self, base_saver: BaseCheckpointSaver):
        self.base = base_saver
        self._version_mapping = {}  # 自定义版本追踪

    def get(self, config: dict) -> Checkpoint | None:
        """获取检查点，可添加缓存逻辑"""
        # 检查缓存
        thread_id = config["configurable"]["thread_id"]
        if cache_key := self._get_cache(thread_id):
            return cache_key

        # 委托给基础存储
        return self.base.get(config)

    def put(
        self,
        config: dict,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata
    ) -> str:
        """保存检查点，可添加额外验证"""
        thread_id = config["configurable"]["thread_id"]

        # 添加业务元数据
        enhanced_metadata = {
            **metadata,
            "custom_fields": {
                "saved_at": time.time(),
                "environment": "production",
                "version": self._version_mapping.get(thread_id, 1),
            }
        }

        # 委托给基础存储
        checkpoint_id = self.base.put(config, checkpoint, enhanced_metadata)

        # 更新版本
        self._version_mapping[thread_id] = self._version_mapping.get(thread_id, 0) + 1

        return checkpoint_id

    def list(self, config: dict, limit: int = -1):
        """列出检查点，支持过滤"""
        checkpoints = list(self.base.list(config, limit))

        # 过滤逻辑
        if metadata_filter := config.get("metadata_filters"):
            checkpoints = [
                cp for cp in checkpoints
                if all(
                    cp.metadata.get(k) == v
                    for k, v in metadata_filter.items()
                )
            ]

        return iter(checkpoints)

    def delete(self, config: dict) -> None:
        """删除检查点，清理相关缓存"""
        thread_id = config["configurable"]["thread_id"]
        self._version_mapping.pop(thread_id, None)
        self._clear_cache(thread_id)
        self.base.delete(config)

    def _get_cache(self, thread_id: str) -> Checkpoint | None:
        """获取缓存的检查点"""
        return None  # 实现缓存逻辑

    def _clear_cache(self, thread_id: str):
        """清除缓存"""
        pass

# 使用自定义检查点
custom_checkpointer = CustomCheckpointer(
    base_saver=PostgresSaver.from_conn_string(os.getenv("DATABASE_URL"))
)

compiled = graph.compile(checkpointer=custom_checkpointer)
```

### 6.4 测试检查点功能

```python
import pytest
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from typing import TypedDict

class TestState(TypedDict):
    counter: int
    history: list

def increment(state):
    return {
        "counter": state["counter"] + 1,
        "history": state.get("history", []) + [f"step_{state['counter'] + 1}"]
    }

@pytest.fixture
def checkpointer():
    return MemorySaver()

@pytest.fixture
def graph(checkpointer):
    g = StateGraph(TestState)
    g.add_node("increment", increment)
    g.set_entry_point("increment")
    g.add_edge("increment", END)
    return g.compile(checkpointer=checkpointer)

class TestCheckpointing:
    def test_basic_checkpoint_save(self, graph, checkpointer):
        """测试基本检查点保存"""
        config = {"configurable": {"thread_id": "test_1"}}

        # 首次调用
        result = graph.invoke({"counter": 0, "history": []}, config)
        assert result["counter"] == 1

        # 获取保存的状态
        state = graph.get_state(config)
        assert state.values["counter"] == 1

    def test_resume_execution(self, graph, checkpointer):
        """测试恢复执行"""
        config = {"configurable": {"thread_id": "test_2"}}

        # 执行几步
        for _ in range(5):
            graph.invoke({"counter": 0, "history": []}, config)

        # 获取最终状态
        state = graph.get_state(config)
        assert state.values["counter"] == 5

        # 继续执行
        graph.invoke({"counter": state.values["counter"]}, config)
        state = graph.get_state(config)
        assert state.values["counter"] == 6

    def test_history_retrieval(self, graph, checkpointer):
        """测试历史记录获取"""
        config = {"configurable": {"thread_id": "test_3"}}

        # 执行几步
        for i in range(3):
            graph.invoke({"counter": i, "history": []}, config)

        # 获取历史
        history = list(graph.get_state_history(config))
        assert len(history) == 3

        # 恢复到中间状态
        if len(history) >= 2:
            restore_config = {
                "configurable": {
                    "thread_id": "test_3",
                    "checkpoint_id": history[1].id
                }
            }
            graph.update_state(restore_config, {"counter": 999})
            state = graph.get_state(restore_config)
            assert state.values["counter"] == 999

    def test_isolated_threads(self, graph, checkpointer):
        """测试线程隔离"""
        config_a = {"configurable": {"thread_id": "thread_a"}}
        config_b = {"configurable": {"thread_id": "thread_b"}}

        # 线程 A 执行多次
        for _ in range(3):
            graph.invoke({"counter": 0, "history": []}, config_a)

        # 线程 B 执行一次
        graph.invoke({"counter": 0, "history": []}, config_b)

        # 验证隔离
        state_a = graph.get_state(config_a)
        state_b = graph.get_state(config_b)
        assert state_a.values["counter"] == 3
        assert state_b.values["counter"] == 1
```

## 7. 附录：配置参考

### 7.1 A. 环境变量配置

```bash
# PostgreSQL
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export PG_POOL_SIZE=20
export PG_MAX_OVERFLOW=40

# Redis
export REDIS_URL="redis://localhost:6379/0"
export REDIS_POOL_SIZE=50
```

### 7.2 B. 生产环境建议

| 配置项 | 开发环境 | 生产环境 |
|--------|---------|---------|
| Checkpointer | MemorySaver | PostgresSaver/RedisSaver |
| 线程 TTL | 无限制 | 7-30 天 |
| 历史保留 | 100 条 | 1000 条 |
| 备份策略 | 无 | 每日自动备份 |
| 监控 | 无 | 检查点成功率监控 |

### 7.3 C. 故障排除

```python
# 问题 1: 检查点不保存
# 原因: 未在 compile() 中传入 checkpointer
compiled = graph.compile()  # 错误
compiled = graph.compile(checkpointer=memory_saver)  # 正确

# 问题 2: 线程状态不一致
# 解决: 使用 update_state() 前先 get_state()

# 问题 3: 检查点链断裂
# 原因: 手动修改状态后未正确设置 parent_checkpoint_id
# 解决: 使用 replay() 重建检查点链

# 问题 4: 内存泄漏
# 解决: 设置定期清理过期线程
```

## 8. 参考资源

- [LangGraph Checkpointing 官方文档](https://langchain-ai.github.io/langgraph/how-tos/checkpointing/)
- [LangGraph State Management](https://langchain-ai.github.io/langgraph/concepts/low_level/)
- [Checkpoint Savers](https://langchain-ai.github.io/langgraph/reference/checkpointing/)

---

> 本文档版本: 1.0.0
> 最后更新: 2024
> 适用版本: LangGraph >= 0.0.x

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [LangGraph 概览（新版文档）](https://docs.langchain.com/oss/python/langgraph/overview) | durable execution 正是检查点的用途说明，最贴近本页主题的官方表述。 | 先读 durable execution 一节，追问「状态存到哪、何时写入」，读完实现一次人工审批中断验证。 |
| [LangGraph 文档](https://langchain-ai.github.io/langgraph/) | 官方文档入口，明确图的状态流转，是理解检查点存什么的基础。 | 读图与状态相关小节，带着「节点间状态如何传递」的问题读，再改画一个带条件分支的图。 |
| [Why LangGraph](https://langchain-ai.github.io/langgraph/concepts/why-langgraph/) | 讲清何时需要图式编排，有助于判断检查点的适用边界。 | 通读一遍，读后用自己的话写出需要持久化状态的三类场景，再回看本页概念部分。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [LangGraph 教程入门](https://langchain-ai.github.io/langgraph/tutorials/introduction/) | 逐步构建带记忆的聊天机器人，能直观看到状态持久化的效果。 | 跟着教程做到记忆与工具节点部分，重点看会话状态如何被保存与恢复，再对比本页线程化检查点。 |
| [LangChain Academy](https://academy.langchain.com/) | 配套 notebook 可动手复现，把检查点概念落成可运行代码。 | 做完 LangGraph 入门 notebook，留意多轮会话状态如何跨调用保留，完成后自行加一个检查点保存点。 |

## 应用与行业实践

读完原理，接下来看它落到项目里的样子。这一节给场景地图、三个场景拆解、公开做法和一条落地路线。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格逐页渲染 | 线程化检查点、checkpoint_id 续跑 | SqliteSaver 本地、PostgresSaver 服务端 | 分页游标要写进状态字段，别只留在内存变量里 |
| 低端安卓的首屏加载（弱网、进程常被杀） | 跨会话状态持久化、get_state 回读 | SqliteSaver 落本地文件 | 检查点写入别放主线程，否则掉帧 |
| 多人协作白板的画布同步 | thread_id 隔离、update_state 局部回写 | 每块白板一个 thread_id 加 PostgresSaver | 高频改动要合并成一次落库 |
| 客服工单的多轮追问与人工接管 | interrupt 中断、Command(resume) 恢复 | PostgresSaver 加后台审核页 | 恢复前先确认工单没被另一个客服处理 |
| 长文报告分章节生成 | get_state_history 回看、checkpoint_id 续跑 | PostgresSaver | 章节索引要能从状态反推，否则续跑会重写同一章 |
| 电商退款的人工审批流 | 中断原语、状态快照 | PostgresSaver | 审批结论要写进状态，只记日志无法续跑 |
| 定时抓取任务失败重试 | 从上一个检查点重放 | SqliteSaver 或 PostgresSaver | 抓取动作要幂等，重放不能重复发货或重复发信 |
| IDE 里的代码审查助手 | 跨会话持久化、按仓库分线程 | SqliteSaver | 切换仓库要换 thread_id，否则状态串台 |

表里每一行都能对上本页前面的知识点。挑场景时优先看两件事：状态要不要跨进程活下来，以及要不要人工插手。

### 三个场景拆解

#### 场景 1：客服工单机器人的多轮追问与人工接管

**业务背景**：工单机器人先自动生成回复草稿，遇到退款、赔付这类结论就转人工。一条线程走完通常要经过 4 到 6 轮追问，高峰期同时在跑的会话数按并发线程数统计。

**怎么用本页知识解决**：思路是把工单号当成 thread_id，让同一工单的多轮消息落在一条线程上。需要人工时用中断原语停住，人工点通过后再从检查点恢复。

```python
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.types import interrupt, Command

# 图编译时挂上检查点，节点状态按线程写入 Postgres
with PostgresSaver.from_conn_string(DB_URL) as saver:
    saver.setup()                    # 首次启动建检查点表，字段以官方文档为准
    app = graph.compile(checkpointer=saver)

# thread_id 用工单号，保证同一工单的多轮对话落在同一条线程
cfg = {"configurable": {"thread_id": f"ticket-{ticket_id}"}}

def review_node(state):
    # 走到这里暂停，检查点已落库，进程退出也不丢
    decision = interrupt({"draft": state["draft"]})
    return {"approved": decision["approved"]}   # 人工结论写回状态

# 人工点“通过”后，用同一个 thread_id 恢复执行
app.invoke(Command(resume={"approved": True}), cfg)
```

- `thread_id` 决定状态落在哪条线程，用工单号而不是随机串，客服换班后仍能接上。
- `setup()` 负责建检查点表，升级依赖前先看官方迁移说明。
- `interrupt` 的负载随检查点一起保存，后台直接读它渲染审核卡片。
- `Command(resume=...)` 的值就是 `interrupt` 的返回值，节点从这里往下写状态。
- 恢复前按 thread_id 读一次最新状态，确认没被另一个客服处理过。

**怎么度量收益**：看三个指标。人工接管率用 LangSmith 的 thread 视图按标签统计；中断到恢复的等待时长用自定义 Prometheus 直方图 `hitl_resume_seconds` 记录；检查点表体积用 Postgres 的 `pg_total_relation_size` 定期采样。

**什么时候不该用**：
- 一问一答、答完即走的 FAQ 机器人：没有跨轮状态，加检查点只是多一次写库。
- 单次批量跑批、失败就整批重跑的离线任务：重跑成本低于维护检查点表的成本。

#### 场景 2：长文报告的分章节生成与中断续跑

**业务背景**：一份报告拆成 6 到 12 个章节逐个生成，中途可能因限流或人工改稿停下。单份报告耗时按分钟计，从头重跑要把已写好的章节重写。

**怎么用本页知识解决**：思路是每写完一章就留一个检查点。续跑时用 `get_state_history` 找到最新检查点，把它的 checkpoint_id 放进 config，从那里接着跑。

```python
cfg = {"configurable": {"thread_id": f"report-{doc_id}"}}

# 列出这条线程的检查点，最新的排在最前
history = list(app.get_state_history(cfg))
latest = history[0]

# 把 checkpoint_id 放进 config，从该检查点继续
resume_cfg = {
    "configurable": {
        "thread_id": f"report-{doc_id}",
        "checkpoint_id": latest.config["configurable"]["checkpoint_id"],
    }
}

# 状态里记着写到第几章，续跑时从这里加一
next_index = latest.values["chapter_index"] + 1
app.invoke({"chapter_index": next_index}, resume_cfg)
```

- 章节索引必须写进状态字段，靠内存变量记会导致续跑重写同一章。
- `get_state_history` 返回快照序列，可以直接支撑“回到第 3 章”这类操作。
- 写章节的节点要幂等：同一章重复执行时覆盖写，不要追加。
- 每章一次大模型调用，写库频率不高，同步写即可。
- 限流报错退出后，下一次调用从最新检查点开始，前几章不用重跑。

**怎么度量收益**：看重复生成的章节数与整体重跑次数。用 LangSmith 的 run 计数比对“章节生成总次数”和“最终章节数”，差值即重复量；再用本地计时函数量一次续跑从发起到出首字的耗时。

**什么时候不该用**：
- 每次都要重新采样做多样性对比的实验：留着旧检查点，容易误用上一次的输出。
- 生成过程无副作用、单份耗时在秒级：直接重跑比维护检查点表省事。

#### 场景 3：移动端报销填报助手的断网重连

**业务背景**：用户在手机上填报销单，中途切出去看发票、地铁里断网、App 被系统杀掉。表单有 10 到 20 个字段，填到一半丢掉就要重填。

**怎么用本页知识解决**：思路是本地用 SQLite 做检查点，字段改动直接写回状态。重新打开页面时读最新状态渲染表单，不重跑整条链。

```python
from langgraph.checkpoint.sqlite import SqliteSaver

# 本地文件做检查点，App 进程被杀后状态还在
with SqliteSaver.from_conn_string("expense.sqlite") as saver:
    app = graph.compile(checkpointer=saver)

cfg = {"configurable": {"thread_id": "expense-draft-001"}}

# 用户改了金额但还没提交：只写回状态，不重跑整条链
app.update_state(cfg, {"amount": 1280.00, "currency": "CNY"})

# 重新进页面时读最新快照渲染表单
snapshot = app.get_state(cfg)
print(snapshot.values)   # 节点写过的状态字段
print(snapshot.next)     # 下一个待执行节点，为空表示流程已结束
```

- 本地 SQLite 省掉网络往返，离线也能写状态。
- `update_state` 只改状态字段，不触发节点重跑，适合表单这类高频小改动。
- `snapshot.next` 用来决定按钮显示“继续填”还是“已提交”。
- 联网后把本地检查点同步到服务端的 PostgresSaver，thread_id 保持一致。
- 草稿和已提交单据用不同的 thread_id 前缀，避免状态串台。

**怎么度量收益**：看表单流失率与草稿恢复成功率。埋点统计每次进入页面时 `snapshot.values` 非空的比例；本地库体积用 `PRAGMA page_size` 和 `PRAGMA page_count` 估算。

**什么时候不该用**：
- 只在一个页面内完成、离开即作废的临时输入：本地检查点没有复用价值。
- 涉及敏感身份信息且设备为共享终端：本地落盘的检查点会被下一个使用者读到。

### 行业先进实践

**人在回路的中断与恢复（出处：LangGraph 官方文档 Human-in-the-loop 页面）**：做法是把需要人确认的节点用中断原语停住，检查点保存现场，恢复时把人工结论传回节点。审批与自动流程共用一份状态，不必另建工单系统。借鉴方式是把审批动作做成一个节点，而不是在节点外面写 if 判断。

**时间旅行与状态回放（出处：LangGraph 官方文档 Persistence 与 Time Travel 相关页面）**：做法是保留检查点历史，允许用 checkpoint_id 从历史某一步重放。它能在不改代码的前提下复现一次异常走位。借鉴方式是把出错时的 thread_id 与 checkpoint_id 记进日志，排查时照着复现。

**检查点表由应用自管迁移（出处：langgraph-checkpoint-postgres 开源项目）**：做法是用 `setup()` 建表，升级依赖时按官方迁移说明执行。借鉴方式是把检查点表纳入数据库迁移流程，别手工改生产库；升级前先比对一次表结构，再决定是否补列。

**事件历史与重放模型（出处：Temporal 官方文档 Event History 与 Replay 章节）**：做法是把状态变更记成追加的事件序列，进程重启后按事件重放内存状态。这和把每个超步落成检查点是同一思路的不同实现。借鉴方式是检查点记录只追加不原地改，便于事后审计。

**多租户线程隔离（出处：LangGraph 官方文档 Threads 相关页面）**：做法是用 thread_id 配合命名空间区分租户与子流程。借鉴方式是在 thread_id 里拼上租户前缀，查询按前缀过滤，避免跨租户串读。需核对官方文档：`checkpoint_ns` 的取值规则与跨命名空间的迁移行为。

### 从学到用：落地路线

1. 试点：挑一个流程最长、失败后果最小的内部任务挂上检查点。验收标准是能从任意一次中断处续跑，且续跑不重复已完成的步骤。
2. 验证：在同一流程上做 10 次失败注入，覆盖限流、进程重启、人工中断。验收标准是 10 次全部恢复到最近一次成功检查点，日志里能查到 thread_id 与 checkpoint_id。
3. 推广：把建表与迁移写进部署脚本，按线程时长分配存储，短流程用内存、长流程用 Postgres。验收标准是新流程接入只改 compile 的传参，不用新写持久化代码。
4. 防回退：把检查点表体积、写入失败率、恢复成功率加进监控，并在评审清单里加一条“新增长流程是否带检查点”。验收标准是写入失败率有告警规则，恢复成功率有看板可查。

### 动手作业

做一个小项目：给“问卷填写、摘要生成、人工确认”的三节点图加上检查点，并完成一次中断恢复。

目标：跑通从人工中断到恢复的完整链路，并能查询状态历史。

步骤：
1. 用 StateGraph 定义 collect、summarize、confirm 三个节点，状态里放 answers、summary、approved。
2. 编译时挂上 SqliteSaver，库文件放在项目目录；服务端版本改用 PostgresSaver。
3. 在 confirm 节点里调用 `interrupt`，把 summary 作为负载传出去。
4. 用 `{"configurable": {"thread_id": "survey-001"}}` 发起第一次调用，观察它停在中断处。
5. 用 `app.get_state(cfg)` 读出 summary，模拟人工审核后决定通过或打回。
6. 用 `Command(resume={"approved": True})` 在同一 thread_id 上恢复，确认流程走到结束。
7. 用 `app.get_state_history(cfg)` 打印检查点列表，确认每个超步都有一条记录。

验收标准：
- 进程重启后，用同一 thread_id 能读回中断前的完整状态。
- 恢复后返回的状态里，approved 等于人工传回的值。
- `get_state_history` 的条目数等于超步数加起点，且最新的排在最前。
- 重复恢复同一 thread_id，不会重复产出 summarize 节点已经写好的内容。
- 删掉本地 sqlite 文件后，同一 thread_id 查不到历史状态。

