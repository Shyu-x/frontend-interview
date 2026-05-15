# LangGraph 状态持久化与检查点机制

> 本文档详细介绍 LangGraph 的状态持久化（Checkpointing）机制、实现方式和最佳实践。

---

## 目录

1. [为什么需要检查点](#1-为什么需要检查点)
2. [核心概念与原语](#2-核心概念与原语)
3. [CheckpointSaver 实现](#3-checkpointsaver-实现)
4. [线程化检查点](#4-线程化检查点)
5. [跨会话状态持久化](#5-跨会话状态持久化)
6. [代码实现示例](#6-代码实现示例)

---

## 1. 为什么需要检查点

### 1.1 长时运行的 Agent 问题

![无检查点的 Agent 执行](assets/images/mermaid/langgraph-01.png)

![有检查点的 Agent 执行](assets/images/mermaid/langgraph-02.png)

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

---

## 2. 核心概念与原语

### 2.1 检查点架构

![检查点架构](assets/images/mermaid/langgraph-03.png)

### 2.2 核心原语

#### State（状态）

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

#### Checkpoint（检查点）

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

#### Thread（线程）

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

![检查点生命周期](assets/images/mermaid/langgraph-04.png)

### 2.4 并发与隔离模型

![并发与隔离模型](assets/images/mermaid/langgraph-05.png)

---

## 3. CheckpointSaver 实现

### 3.1 接口定义

```python
from abc import ABC, abstractmethod
from typing import Any, Iterator

class BaseCheckpointSaver(ABC):
    """检查点持久化接口"""

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

    @abstractmethod
    def list(self, config: dict, limit: int = -1) -> Iterator[Checkpoint]:
        """列出线程的检查点历史"""
        pass

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

class State(TypedDict):
    conversation: list[dict]
    context: dict

def chat_node(state):
    return {
        "conversation": state.get("conversation", []) + ["Response generated"]
    }

graph = StateGraph(State)
graph.add_node("chat", chat_node)
graph.set_entry_point("chat")
graph.add_edge("chat", END)

# PostgreSQL 生产配置
postgres_saver = PostgresSaver.from_conn_string(
    conn_string=os.getenv("POSTGRES_URL"),
    pool_size=20,
    max_overflow=40,
)
postgres_saver.setup()

compiled = graph.compile(checkpointer=postgres_saver)

# 多线程并发使用
import threading

def handle_user(thread_id: str, message: str):
    config = {"configurable": {"thread_id": thread_id}}

    # 恢复或创建状态
    current_state = compiled.get_state(config)
    if current_state.values.get("conversation"):
        state_update = {"conversation": current_state.values["conversation"] + [{"role": "user", "content": message}]}
    else:
        state_update = {"conversation": [{"role": "user", "content": message}], "context": {}}

    result = compiled.invoke(state_update, config)

threads = [
    threading.Thread(target=handle_user, args=(f"user_{i}", f"Message {i}"))
    for i in range(100)
]
for t in threads:
    t.start()
for t in threads:
    t.join()
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

![检查点存储选择指南](assets/images/mermaid/langgraph-06.png)

| 存储 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| Memory | 开发/测试/小型应用 | 最快、最简单 | 重启丢失、不支持并发 |
| SQLite | 单机部署、小中型应用 | 零配置、持久化 | 不适合高并发、写入瓶颈 |
| PostgreSQL | 生产环境、中大型应用 | 高并发、支持集群 | 需要数据库基础设施 |
| Redis | 需要高速缓存、高可用 | 极快、内存级性能 | 持久性依赖配置、成本高 |

---

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

class ThreadLifecycleManager:
    """线程生命周期管理器"""

    def __init__(self, checkpointer, max_age_days: int = 30):
        self.checkpointer = checkpointer
        self.max_age_days = max_age_days

    def cleanup_old_threads(self):
        """清理过期线程"""
        all_threads = self.list_all_threads()
        cutoff = datetime.now() - timedelta(days=self.max_age_days)

        for thread_id in all_threads:
            config = {"configurable": {"thread_id": thread_id}}
            checkpoints = list(self.checkpointer.list(config, limit=1))

            if checkpoints:
                latest = checkpoints[0]
                if latest.metadata.get("updated_at", 0) < cutoff.timestamp():
                    # 超过期限，删除或归档
                    if should_archive(thread_id):
                        self.archive_thread(thread_id)
                    else:
                        self.delete_thread(thread_id)

    def archive_thread(self, thread_id: str):
        """归档线程 - 标记但保留数据"""
        config = {"configurable": {"thread_id": thread_id}}
        state = self.checkpointer.get(config)

        if state:
            # 添加归档标记
            self.checkpointer.put(
                config,
                {**state, "archived": True, "archived_at": time.time()},
                {"source": "lifecycle", "archived": True}
            )

    def delete_thread(self, thread_id: str):
        """删除线程及其所有检查点"""
        config = {"configurable": {"thread_id": thread_id}}
        self.checkpointer.delete(config)

    def list_all_threads(self) -> list[str]:
        """列出所有线程（依赖存储实现）"""
        # 实现取决于使用的存储后端
        raise NotImplementedError
```

---

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
import json
import pickle
from datetime import datetime

class StateSerializer:
    """状态序列化器"""

    @staticmethod
    def serialize_state(state: dict) -> bytes:
        """将状态序列化为字节"""
        # 方法 1: JSON（可读但不支持复杂类型）
        return json.dumps(state, default=str).encode()

        # 方法 2: Pickle（支持复杂类型，但有安全风险）
        return pickle.dumps(state)

        # 方法 3: 自定义格式
        return StateSerializer._custom_serialize(state)

    @staticmethod
    def deserialize_state(data: bytes) -> dict:
        """反序列化状态"""
        return json.loads(data.decode())

    @staticmethod
    def export_thread_state(thread_id: str, checkpointer) -> str:
        """导出线程状态为可移植格式"""
        config = {"configurable": {"thread_id": thread_id}}
        history = list(checkpointer.list(config))

        export_data = {
            "thread_id": thread_id,
            "exported_at": datetime.now().isoformat(),
            "checkpoints": []
        }

        for checkpoint in history:
            export_data["checkpoints"].append({
                "id": checkpoint.id,
                "timestamp": checkpoint.timestamp,
                "state": checkpoint.state,
                "metadata": checkpoint.metadata,
            })

        return json.dumps(export_data, indent=2, default=str)

    @staticmethod
    def import_thread_state(export_json: str, checkpointer) -> str:
        """从导出数据恢复线程"""
        data = json.loads(export_json)
        thread_id = data["thread_id"]

        config = {"configurable": {"thread_id": thread_id}}

        for cp_data in data["checkpoints"]:
            checkpointer.put(
                config,
                cp_data["state"],
                cp_data["metadata"]
            )

        return thread_id
```

### 5.4 状态备份与恢复

```python
import shutil
from pathlib import Path

class StateBackupManager:
    """状态备份管理器"""

    def __init__(self, checkpointer, backup_dir: str = "./backups"):
        self.checkpointer = checkpointer
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)

    def backup_thread(self, thread_id: str) -> Path:
        """备份单个线程"""
        config = {"configurable": {"thread_id": thread_id}}
        history = list(self.checkpointer.list(config))

        backup_file = self.backup_dir / f"{thread_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        with open(backup_file, "w") as f:
            json.dump({
                "thread_id": thread_id,
                "checkpoints": [
                    {
                        "id": cp.id,
                        "state": cp.state,
                        "metadata": cp.metadata,
                    }
                    for cp in history
                ]
            }, f, default=str, indent=2)

        return backup_file

    def restore_thread(self, backup_file: Path) -> str:
        """从备份恢复线程"""
        with open(backup_file, "r") as f:
            data = json.load(f)

        thread_id = data["thread_id"]
        config = {"configurable": {"thread_id": thread_id}}

        # 先删除现有检查点
        self.checkpointer.delete(config)

        # 恢复每个检查点
        for cp_data in data["checkpoints"]:
            self.checkpointer.put(
                config,
                cp_data["state"],
                cp_data["metadata"]
            )

        return thread_id

    def backup_all_threads(self, thread_ids: list[str]) -> list[Path]:
        """备份所有线程"""
        return [self.backup_thread(tid) for tid in thread_ids]
```

---

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

---

## 附录：配置参考

### A. 环境变量配置

```bash
# PostgreSQL
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export PG_POOL_SIZE=20
export PG_MAX_OVERFLOW=40

# Redis
export REDIS_URL="redis://localhost:6379/0"
export REDIS_POOL_SIZE=50
```

### B. 生产环境建议

| 配置项 | 开发环境 | 生产环境 |
|--------|---------|---------|
| Checkpointer | MemorySaver | PostgresSaver/RedisSaver |
| 线程 TTL | 无限制 | 7-30 天 |
| 历史保留 | 100 条 | 1000 条 |
| 备份策略 | 无 | 每日自动备份 |
| 监控 | 无 | 检查点成功率监控 |

### C. 故障排除

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

---

## 参考资源

- [LangGraph Checkpointing 官方文档](https://langchain-ai.github.io/langgraph/how-tos/checkpointing/)
- [LangGraph State Management](https://langchain-ai.github.io/langgraph/concepts/low_level/)
- [Checkpoint Savers](https://langchain-ai.github.io/langgraph/reference/checkpointing/)

---

> 本文档版本: 1.0.0
> 最后更新: 2024
> 适用版本: LangGraph >= 0.0.x