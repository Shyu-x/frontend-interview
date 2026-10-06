---
title: AutoGen 群聊协作
description: 介绍 Microsoft AutoGen 框架中的 Group Chat 架构、协作模式及实战代码。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# AutoGen 群聊协作

本文档介绍 Microsoft AutoGen 框架中的 Group Chat 架构、协作模式及实战代码。

## 1. AutoGen GroupChat 架构

### 1.1 核心组件

AutoGen 的多智能体系统由以下核心组件构成：

```
┌──────────────────────────────────────────────────────┐
│                    GroupChatManager                   │
│  (消息路由、发言顺序控制、终止条件判断)                  │
└──────────────────────────────────────────────────────┘
           ▲              ▲              ▲
           │              │              │
    ┌──────┴──────┐ ┌─────┴─────┐ ┌──────┴──────┐
    │  Assistant  │ │  UserProxy │ │  Assistant  │
    │  Agent 1    │ │  Agent     │ │  Agent N    │
    └─────────────┘ └───────────┘ └─────────────┘
```

| 组件 | 职责 |
|------|------|
| `AssistantAgent` | 执行 LLM 调用，可调用工具 |
| `UserProxyAgent` | 用户交互代理，可自动执行代码 |
| `GroupChatManager` | 管理群组通信，协调发言顺序 |

### 1.2 基础设置

```python
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

# 创建单个智能体
assistant = AssistantAgent(
    name="assistant",
    llm_config={
        "model": "gpt-4",
        "api_key": os.environ.get("OPENAI_API_KEY"),
        "temperature": 0.7
    }
)

# 用户代理（可自动执行代码）
user_proxy = UserProxyAgent(
    name="user_proxy",
    code_execution_config={
        "work_dir": "workspace",
        "use_docker": True  # 使用 Docker 执行代码
    }
)
```

### 1.3 群聊初始化

```python
# 定义群组成员
group_members = [
    assistant1,  # 编码专家
    assistant2,  # 代码审查员
    assistant3,  # 技术文档撰写员
]

# 创建群聊
group_chat = GroupChat(
    agents=group_members,
    messages=[],  # 初始消息列表
    max_round=10  # 最大轮次限制
)

# 创建群聊管理器
manager = GroupChatManager(
    groupchat=group_chat,
    llm_config=llm_config  # 管理器的 LLM 配置
)

# 启动群聊
user_proxy.initiate_chat(
    manager,
    message="帮我实现一个快速排序算法"
)
```

## 2. GroupChat 模式

### 2.1 Round-Robin 轮询模式

智能体按固定顺序轮流发言。

```python
from autogen import GroupChat, GroupChatManager

group_chat = GroupChat(
    agents=group_members,
    messages=[],
    max_round=5,
    speaker_selection_method="round_robin",  # 轮询选择
    allow_repeat_speaker=False  # 禁止同一智能体连续发言
)

manager = GroupChatManager(groupchat=group_chat, llm_config=llm_config)
```

**适用场景**：需要均匀分布各智能体贡献的场景。

### 2.2 Speaker Selection 动态选择

由 LLM 根据上下文动态选择下一个发言者。

```python
from autogen import GroupChat, GroupChatManager

group_chat = GroupChat(
    agents=group_members,
    messages=[],
    max_round=10,
    speaker_selection_method="auto",  # 自动选择
    allow_repeat_speaker=True  # 允许重复发言
)

manager = GroupChatManager(groupchat=group_chat, llm_config=llm_config)
```

**LLM 选择提示示例**：

```
Given the conversation history, select the next speaker from [agent1, agent2, agent3].
Consider:
1. Who has the most relevant expertise?
2. Who has been least active recently?
3. What would be most helpful for the user?

Respond with only the agent name.
```

### 2.3 Custom 定制选择策略

实现自定义的发言者选择逻辑。

```python
from autogen import GroupChat, GroupChatManager
from typing import Optional

class CustomGroupChat(GroupChat):
    def select_speaker(self, last_speaker: Agent, selector: Agent) -> Optional[str]:
        """
        自定义选择逻辑
        
        Args:
            last_speaker: 上一个发言的智能体
            selector: 执行选择的 LLM
            
        Returns:
            下一个发言智能体的名称
        """
        # 简单策略：基于消息内容选择
        messages = self.messages
        
        # 检查是否有待审查的代码
        for msg in reversed(messages):
            if "```python" in msg.get("content", ""):
                return "code_reviewer"  # 有代码，选择审查员
            if "error" in msg.get("content", "").lower():
                return "debugger"  # 有错误，选择调试专家
        
        # 默认：轮询选择
        current_idx = self.agents.index(last_speaker)
        next_idx = (current_idx + 1) % len(self.agents)
        return self.agents[next_idx].name

# 使用自定义群聊
group_chat = CustomGroupChat(
    agents=group_members,
    messages=[],
    max_round=15
)
```

### 2.4 半自动选择模式

使用验证器介入的选择模式。

```python
class ValidatorGroupChat(GroupChat):
    def select_speaker(self, last_speaker: Agent, selector: Agent) -> Optional[str]:
        """带验证的选择"""
        # 让 LLM 选择
        selected = super().select_speaker(last_speaker, selector)
        
        # 验证选择是否合理
        if selected == "code_reviewer" and not self._has_code_to_review():
            # 没有代码可审查，选择编码专家
            return "coder"
        
        return selected
    
    def _has_code_to_review(self) -> bool:
        """检查是否有待审查的代码"""
        for msg in reversed(self.messages[-3:]):
            if "```python" in msg.get("content", ""):
                return True
        return False
```

## 3. 嵌套聊天与层级组

### 3.1 嵌套聊天概念

智能体可以独立启动子群聊，形成嵌套结构。

```
┌─────────────────────────────────────────────────────┐
│                   主群聊                            │
│  [用户] ↔ [协调器] ↔ [执行者1] ↔ [执行者2]           │
│                              ↓                      │
│                    子群聊 (执行者1发起)               │
│              [专家A] ↔ [专家B] ↔ [专家C]              │
└─────────────────────────────────────────────────────┘
```

### 3.2 嵌套聊天实现

```python
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

# 创建子群聊专家
expert_a = AssistantAgent(name="expert_a", llm_config=llm_config)
expert_b = AssistantAgent(name="expert_b", llm_config=llm_config)

# 创建子群聊
sub_group = GroupChat(
    agents=[expert_a, expert_b],
    messages=[],
    max_round=5
)
sub_manager = GroupChatManager(groupchat=sub_group, llm_config=llm_config)

# 在主智能体中启动嵌套聊天
coordinator = AssistantAgent(
    name="coordinator",
    llm_config=llm_config
)

def initiate_nested_chat(coordinator_agent, task: str):
    """
    在协调器中启动嵌套聊天
    """
    response = coordinator_agent.generate_reply(
        messages=[{"content": task, "role": "user"}]
    )
    
    # 启动子群聊
    result = expert_a.initiate_chat(
        sub_manager,
        message=task,
        clear_history=False  # 保留历史
    )
    
    return result

# 使用示例
result = coordinator.initiate_chat(
    sub_manager,
    message="分析这个API的性能问题"
)
```

### 3.3 层级群聊架构

```python
class HierarchicalGroupChat:
    """
    层级群聊结构：
    - Level 0: 用户接口
    - Level 1: 协调器
    - Level 2: 领域专家
    - Level 3: 执行器
    """
    
    def __init__(self, llm_config):
        # Level 2: 领域专家
        self.frontend_expert = AssistantAgent(
            name="frontend_expert", llm_config=llm_config)
        self.backend_expert = AssistantAgent(
            name="backend_expert", llm_config=llm_config)
        self.devops_expert = AssistantAgent(
            name="devops_expert", llm_config=llm_config)
        
        # Level 1: 协调器
        self.coordinator = AssistantAgent(
            name="coordinator",
            llm_config=llm_config,
            human_input_mode="NEVER"
        )
        
        # Level 0: 用户代理
        self.user_proxy = UserProxyAgent(
            name="user_proxy",
            human_input_mode="TERMINATE"
        )
        
        self._setup_hierarchy()
    
    def _setup_hierarchy(self):
        """设置层级关系"""
        # 协调器知道各专家
        self.coordinator.register_reply(
            "frontend_expert",
            lambda y, u: self._forward_to_experts(y, u, "frontend")
        )
        self.coordinator.register_reply(
            "backend_expert",
            lambda y, u: self._forward_to_experts(y, u, "backend")
        )
    
    def _forward_to_experts(self, y, u, domain: str):
        """转发到对应专家"""
        expert_map = {
            "frontend": self.frontend_expert,
            "backend": self.backend_expert
        }
        return expert_map[domain].generate_reply(messages=y)
    
    def start(self, task: str):
        """启动层级协作"""
        self.user_proxy.initiate_chat(
            self.coordinator,
            message=task
        )
```

### 3.4 群聊间通信

```python
class InterGroupCommunicator:
    """跨群聊通信管理"""
    
    def __init__(self, llm_config):
        self.group_a_manager = self._create_group("A")
        self.group_b_manager = self._create_group("B")
    
    def _create_group(self, group_id: str):
        """创建独立群聊"""
        agents = [
            AssistantAgent(name=f"{group_id}_agent_{i}", llm_config=llm_config)
            for i in range(3)
        ]
        group = GroupChat(agents=agents, messages=[], max_round=10)
        return GroupChatManager(groupchat=group, llm_config=llm_config)
    
    def relay_message(self, from_group, to_group, message: str):
        """跨群聊消息传递"""
        # 从源群聊收集结果
        result = from_group.get_latest_message()
        
        # 发送到目标群聊
        to_group.send_message(result, from_group, to_group)
        
        return to_group.get_response()
```

## 4. AutoGen 代码执行

### 4.1 UserProxyAgent 代码执行

```python
from autogen import UserProxyAgent

# 代码执行代理
code_executor = UserProxyAgent(
    name="code_executor",
    human_input_mode="NEVER",  # 不等待用户输入
    max_consecutive_auto_reply=10,
    code_execution_config={
        "work_dir": "workspace",        # 工作目录
        "use_docker": "python:latest",  # Docker 环境
        "timeout": 120,                  # 超时秒数
    }
)

# 调用代码执行
code_executor.initiate_chat(
    assistant,
    message="执行以下代码并返回结果：\nprint('Hello, AutoGen!')"
)

# 直接执行代码片段
code_executor.execute_code_blocks([
    ("python", "print([x**2 for x in range(10)])")
])
```

### 4.2 代码执行结果处理

```python
# 第 1 段：导入 AutoGen 的两个核心角色类
# UserProxyAgent 负责"动手"（真正执行代码），AssistantAgent 负责"动脑"（调 LLM 生成/解释）；
# 二者组成 AutoGen 最基础的双智能体协作范式：一方产出代码，另一方落地运行并回传结果。
from autogen import UserProxyAgent, AssistantAgent

# 第 2 段：构造代码执行器（代表用户/执行方）
# use_docker=True 是核心安全边界：LLM 产出的代码不可信，放进容器执行，
# 即使删文件或死循环也只影响容器，不污染宿主机；work_dir 指定执行时的工作目录。
# 易错点：依赖本机已安装 Docker 且守护进程在运行，否则后续发起对话时会直接抛错。
code_executor = UserProxyAgent(
    name="code_executor",
    code_execution_config={
        "work_dir": "workspace",
        "use_docker": True
    }
)

# 第 3 段：构造助手智能体
# AssistantAgent 自身不执行代码，只持有 LLM 配置，收到消息后产出自然语言 + 代码块。
# 注意 llm_config 定义在本片段之外（通常含 model、api_key、temperature），
# 此处直接引用，说明"配置"与"角色构造"解耦，便于按环境切换模型。
assistant = AssistantAgent(
    name="assistant",
    llm_config=llm_config
)

# 第 4 段：带重试的代码执行入口
# max_retries 默认 3 提供"失败可自愈"的容错；函数对调用方只暴露字符串返回值，
# 把重试的复杂度完全封装在内部。
def execute_with_retry(code: str, max_retries: int = 3):
    """带重试的代码执行"""
    # 第 5 段：驱动一轮完整对话
    # initiate_chat 让 code_executor 作为发起方向 assistant 发消息；assistant 回复的代码块
    # 会由 code_executor 依据第 2 段配置实际执行，执行结果再作为新消息追加进对话历史，
    # 从而形成"生成 → 执行 → 反馈"的闭环。复杂度：每轮至少一次 LLM 调用，成本随重试数线性增长。
    for attempt in range(max_retries):
        code_executor.initiate_chat(
            assistant,
            message=f"执行并解释这段代码:\n{code}"
        )
        
        # 第 6 段：取回本轮结果
        # chat_messages 是 {agent: [消息, ...]} 字典，键为对话中的另一方，[-1] 即最近一条消息
        # （通常是最终执行输出）。边界条件：若对话中途异常中断，messages 可能为空，
        # 此时 messages[-1] 会抛 IndexError，需靠外层重试或上层捕获兜底。
        # 获取执行结果
        messages = code_executor.chat_messages[assistant]
        last_msg = messages[-1]
        
        # 第 7 段：成功判定
        # content 可能为 None（如工具调用类消息），故用 get 给空串兜底，避免对 None 调 lower()。
        # 隐患：这里仅做子串匹配——正常输出里含 "error" 字样会误判为失败，
        # 反之未含该词的错误会被误判为成功；生产中应改用结构化状态字段判定。
        if "error" not in last_msg.get("content", "").lower():
            return last_msg.get("content")
        
        # 第 8 段：失败提示与最终兜底
        # attempt 从 0 起计数，+1 后打印更符合人类计数直觉，也方便排查是第几轮失败。
        print(f"尝试 {attempt + 1} 失败，重试...")
    
    # 循环耗尽仍未成功，返回固定失败标识，保证函数始终有返回值，调用方无需处理 None 分支。
    return "执行失败"
```
### 4.3 多语言代码执行

```python
from autogen import UserProxyAgent

# 第 1 段：构建三个"语言专用执行器"
# 为什么：把执行环境按语言拆成独立 Agent，是为了让每种语言都跑在该语言的原生容器里
# （Python/Node/MySQL），互不污染依赖；同时统一 work_dir 让它们能通过文件交换中间产物。
# 易错点：UserProxyAgent 默认 human_input_mode="ALWAYS"，会在每轮代码执行前阻塞等待人工确认，
# 批处理/服务化场景通常要显式设为 "NEVER"；另外不设 llm_config=False 时，执行器自己也会调用
# LLM 去"补全代码"，会绕过你传入的代码块，属于常见的隐性 bug 来源。

# Python 执行器
python_executor = UserProxyAgent(
    name="python_executor",
    code_execution_config={
        "work_dir": "workspace",          # 宿主机挂载进容器的共享目录，跨语言交换数据靠它
        "use_docker": "python:3.11",      # 传镜像名即启用 Docker 隔离；锁小版本可避免解释器行为漂移
        "timeout": 60                     # 单次执行墙钟上限（秒），超过即判定失败，防止死循环挂死进程
    }
)

# JavaScript 执行器
js_executor = UserProxyAgent(
    name="js_executor",
    code_execution_config={
        "work_dir": "workspace",          # 与 Python 执行器同一目录，便于 Node 读取 Python 产出的文件
        "use_docker": "node:18",          # LTS 版本，稳定优先；镜像不同则 node_modules 不会串味
        "timeout": 60
    }
)

# SQL 执行器
sql_executor = UserProxyAgent(
    name="sql_executor",
    code_execution_config={
        "work_dir": "workspace",
        "use_docker": "mysql:8",          # 注意：这个镜像默认只带 client，且无库无表，DDL/DML 需自备
        "timeout": 30                     # SQL 更容易全表扫描，超时给得更短以防长查询拖垮整条流水线
    }
)

# 第 2 段：对外入口函数——把"多语言代码块"翻译成"多轮 Agent 对话"
# 关键数据流：[(lang, code), ...] → 按 lang 路由到对应执行器 → 每个执行器把代码发给 assistant
# 生成并执行 → 收集该执行器最后一条消息 → {lang: message}。
# 代价：循环内 initiate_chat 是同步阻塞的，总耗时 ≈ Σ(LLM 推理 + 代码执行)，属延迟瓶颈所在。

def execute_multi_language(code_blocks: list[tuple[str, str]]):
    """
    执行多语言代码块
    
    Args:
        code_blocks: [(language, code), ...]
    """
    # 第 3 段：语言名 → 执行器实例的路由表
    # 为什么用 dict 而不是 if/elif：新增语言只需在这里加一行，路由逻辑零改动（开闭原则）。
    # 易错点：这里的 key 必须与调用方传入的 lang 字符串"完全一致"（区分大小写、无空格），
    # 否则下面 .get() 返回 None 导致该代码块被静默跳过——所以第 4 段才需要显式判空。
    executor_map = {
        "python": python_executor,
        "javascript": js_executor,
        "sql": sql_executor
    }
    
    # 第 4 段：逐块路由执行并汇总结果
    # 边界条件：未知语言（如 "go"）不会报错，只是被跳过，调用方需自行比对 len(results) 判断是否全跑成功。
    # 结果语义：只保留"最后一次"消息，若同一语言出现在多个块里，results[lang] 会被后者覆盖。
    results = {}
    for lang, code in code_blocks:
        executor = executor_map.get(lang)
        if executor:
            executor.initiate_chat(
                # 易错点：assistant 未在本函数内定义，来自外层/全局作用域；作用域中缺失会抛 NameError。
                # 该 assistant 负责"生成/修正"代码，executor 负责"执行"，二者角色必须配对使用。
                assistant,
                message=f"执行 {lang} 代码:\n{code}"   # 用自然语言前缀+原始代码，让 assistant 明确当前语言
            )
            results[lang] = executor.last_message()  # 取本次会话末条消息，通常含执行输出或报错信息
    
    return results
```
### 4.4 代码执行上下文管理

```python
class ManagedCodeExecution:
    """托管代码执行环境"""
    
    # 第 1 段：初始化托管执行环境（绑定工作目录并拉起隔离的执行代理）
    # 设计意图：把「在沙箱里跑代码」这件事封装成一个对象，外部只关心执行与上下文，
    # 不直接接触 AutoGen 的 UserProxyAgent。use_docker=True 意味着代码在容器内运行，
    # 带来隔离性的同时也要求宿主机具备 Docker 环境；timeout=300 是硬性上限，超时会中断执行。
    def __init__(self, work_dir: str):
        self.work_dir = work_dir
        # 执行代理：UserProxyAgent 在这里扮演「代码执行器」而非对话方，
        # 其 code_execution_config 决定代码在哪里跑、跑多久。
        self.executor = UserProxyAgent(
            name="managed_executor",
            code_execution_config={
                "work_dir": work_dir,   # 容器内挂载/落盘的工作目录，产物与临时文件都放这里
                "use_docker": True,     # 强制 Docker 隔离，避免宿主环境被污染或破坏
                "timeout": 300          # 单次执行最长 300 秒，防止死循环/长任务拖垮服务
            }
        )
        self.context = {}  # 持久化上下文；跨多次 execute 调用累积变量，注意它是可变的共享状态
    
    # 第 2 段：写入执行上下文（供后续逐次执行的代码共享变量）
    # 关键点：这里不做任何序列化或校验，value 原样持有引用，
    # 因此后续用 repr() 注入时，只有能稳定 repr 的类型（数字、字符串、布尔、容器等）才可靠；
    # 若传入不可反序列化的对象（如文件句柄、连接），注入代码会得到无意义的 repr 字符串。
    def set_context(self, key: str, value: any):
        """设置执行上下文"""
        self.context[key] = value
    
    # 第 3 段：把上下文注入代码并交给代理执行（核心拼装 + 委托执行 + 取回结果）
    # 数据流：context 字典 → repr 文本 → 与用户代码拼接 → 发给执行代理 → 返回最后一条消息。
    # 易错点：repr(v) 只是「值的字面量近似」，对自定义对象/函数/lambda 无法保真重建；
    # 且拼接后是自上而下顺序执行，若 context 键名与代码中变量重名会被代码覆盖。
    # 复杂度：拼接为 O(n)（n 为上下文项数），真正开销在 Docker 启动与网络往返。
    def execute_with_context(self, code: str) -> str:
        """使用上下文执行代码"""
        # 注入上下文到代码
        # 用换行把每个键值对渲染成 `key = <repr>` 的赋值语句，
        # 相当于在用户代码前插入一段「变量预置」脚本，实现跨调用的状态延续。
        context_vars = "\n".join(
            f"{k} = {repr(v)}" for k, v in self.context.items()
        )
        
        # 前置上下文 + 用户代码拼成完整脚本；注意顺序不可颠倒，
        # 否则用户代码引用上下文变量时会 NameError。
        full_code = f"{context_vars}\n{code}"
        
        # 通过执行代理发起「对话」来触发代码执行：AutoGen 里 assistant 的回复中
        # 若含代码块，代理就会在沙箱里运行它。这里的 message 只是承载待执行代码的载体，
        # 真正的执行发生在代理内部，返回值通过后续的 last_message() 读取。
        self.executor.initiate_chat(
            assistant,
            message=f"执行代码:\n{full_code}"
        )
        
        # 取回代理的最后一条消息作为执行结果（通常包含 stdout/stderr 或报错信息）。
        # 边界：若代理未产生消息，或执行被 timeout 截断，这里拿到的可能是残缺/异常输出，
        # 调用方不能假设返回值一定是成功的程序输出。
        return self.executor.last_message()
```
## 5. Human-in-the-Loop 模式

### 5.1 基础人工介入

```python
from autogen import AssistantAgent, UserProxyAgent

# 配置人工介入模式
user_proxy = UserProxyAgent(
    name="user_proxy",
    human_input_mode="ALWAYS"  # 每次都需要人工确认
)

# 或在特定条件下介入
conditional_proxy = UserProxyAgent(
    name="conditional_proxy",
    human_input_mode="TERMINATE",  # 遇到 TERMINATE 消息时介入
    max_consecutive_auto_reply=5   # 自动回复次数限制
)

# 启动需要人工确认的对话
user_proxy.initiate_chat(
    assistant,
    message="删除所有临时文件，确认执行？"
)
```

### 5.2 人工审批工作流

```python
# 第 1 段：类定义与初始化（搭好"审批三件套"：AI 助手、人类代理、待审批队列）
class HumanApprovalWorkflow:
    """人工审批工作流"""
    
    def __init__(self, llm_config):
        # assistant 负责"发起"审批对话，human 代表"审批人"这一侧参与对话
        # 二者是 AutoGen 中成对出现的 Agent：一个发起、一个响应
        self.assistant = AssistantAgent(name="assistant", llm_config=llm_config)
        # human_input_mode="NEVER" 表示默认不做真实交互，适合无人值守/批量场景；
        # 真正的"是否需要人参与"由 request_approval 按风险等级动态切换
        self.human = UserProxyAgent(
            name="human",
            human_input_mode="NEVER"  # 默认自动执行
        )
        # 用列表保存审批记录，索引即 task_id，因此 task_id 依赖插入顺序，不能重排
        self.pending_approvals = []
    
    # 第 2 段：发起审批（按风险等级动态决定"要不要真的问人"，并落库一条待审记录）
    def request_approval(self, task: str, risk_level: str = "LOW"):
        """
        请求人工审批
        
        Args:
            task: 待审批任务
            risk_level: 风险等级 (LOW/MEDIUM/HIGH/CRITICAL)
        """
        # 核心策略：高风险才开启人类介入，低风险保持自动执行，避免无谓打扰
        # 易错点：human_input_mode 是 Agent 的实例状态，这里是"就地改写"，
        # 所以该工作流实例同一时刻只能承载一种模式，多任务并发会互相覆盖
        if risk_level in ["HIGH", "CRITICAL"]:
            # 高风险操作需要人工确认
            self.human.human_input_mode = "ALWAYS"
        else:
            self.human.human_input_mode = "NEVER"
        
        # 先登记再对话：即使 initiate_chat 抛异常，记录也已存在，便于事后审计
        # status 初始为 PENDING，后续由 approve_task / reject_task 改写
        self.pending_approvals.append({
            "task": task,
            "risk_level": risk_level,
            "status": "PENDING"
        })
        
        # 把审批请求作为开场消息发给 human；注意 initiate_chat 会阻塞直到对话结束，
        # 即 HIGH/CRITICAL 时这里会真的等待人类输入，调用方需注意超时与并发
        self.assistant.initiate_chat(
            self.human,
            message=f"[审批请求 - {risk_level}] {task}"
        )
    
    # 第 3 段：审批通过（只改状态，不做删除，保留完整审计轨迹）
    def approve_task(self, task_id: int):
        """审批通过"""
        # 用 task_id < len(...) 做越界保护；由于采用列表索引，
        # task_id 即"第几次 request_approval"，而非全局唯一 ID，这是易被误解之处
        if task_id < len(self.pending_approvals):
            self.pending_approvals[task_id]["status"] = "APPROVED"
    
    # 第 4 段：审批拒绝（在状态之外追加拒绝理由，方便人工回溯决策依据）
    def reject_task(self, task_id: int, reason: str):
        """审批拒绝"""
        # 与 approve_task 同一套越界判断；边界条件：task_id 为负数时不会被拦截，
        # 会从列表尾部反向索引，若需严格校验应额外判断 task_id >= 0
        if task_id < len(self.pending_approvals):
            self.pending_approvals[task_id]["status"] = "REJECTED"
            # reason 字段按需写入，PENDING/APPROVED 记录中不会出现该键，
            # 读取时应使用 .get("reason") 避免 KeyError
            self.pending_approvals[task_id]["reason"] = reason
```
### 5.3 可中断恢复模式

```python
# 第 1 段：类骨架与状态初始化（定义状态机的三要素：谁在干活、当前处于哪个状态、靠什么信号叫停）
# 为什么这样写：把"可中断"拆成两个正交的部件 —— 无状态的 LLM 生成器（AssistantAgent）与有状态的流程控制器（本类），
# 这样状态迁移逻辑可独立于模型实现被测试。关键数据流：llm_config 仅透传给 AssistantAgent，本类不持有模型细节。
# 易错点：state 用裸字符串而非 Enum，拼错状态名不会有任何静态检查兜底，新增状态时必须全局检索。
class InterruptibleAgent:
    """可中断智能体"""
    # 中断协议的"信号线"：约定模型在需要人工审批时，把这串魔法字符串写进回复正文
    # 抽成类常量而非散落字面量，让协议只在一处定义，避免多处拼写漂移
    STOP_KEYWORD = "[HALT_FOR_APPROVAL]"
    
    def __init__(self, llm_config):
        # 助手只管"生成"，审批与状态迁移全部由外层控制器承担，职责分离
        self.assistant = AssistantAgent(name="assistant", llm_config=llm_config)
        self.state = "RUNNING"  # 构造即 RUNNING，无需额外启动调用；但此处未校验 llm_config 合法性，错误会延迟到首次调用才暴露
    
    # 第 2 段：主循环 —— 生成一步、判定中断、判定完成（单次任务的自驱动状态机）
    # 为什么这样写：每轮只把最初的 task 作为 messages 传入，模型看不到自己前面的输出，所谓"进度"全靠模型在回复外隐式记住，
    # 这是本实现最脆弱的一点：多轮循环下模型容易重复劳动或跑偏，真实系统应把 steps 拼回上下文。
    # 易错点：while 条件只认 RUNNING，若模型既不吐 STOP_KEYWORD 也不吐完成标记，就会无限调用，生产环境必须加最大步数上限。
    def process_task(self, task: str):
        """带中断的任务处理"""
        self.state = "RUNNING"  # 幂等重置，使同一实例可复用；副作用是上一轮的 AWAITING_APPROVAL 会被悄悄清掉
        steps = []  # 本地累积已完成步骤，仅在非中断路径下随返回值一并交出
        
        while self.state == "RUNNING":
            # 生成下一步
            # 无状态调用：未传历史消息，模型对"第几步"没有任何显式信息
            response = self.assistant.generate_reply(
                messages=[{"content": task, "role": "user"}]
            )
            
            # 检查是否需要中断
            # 中断判定优先于完成判定：若回复同时含 STOP_KEYWORD 与 [DONE]，以中断为准，体现安全优先
            if self.STOP_KEYWORD in response:
                self.state = "AWAITING_APPROVAL"
                return {
                    "status": "INTERRUPTED",
                    "completed_steps": steps,  # 本次响应不入 steps，而是放进 pending_action，避免"未经批准却已记账"
                    "pending_action": response
                }
            
            steps.append(response)  # 只有通过中断判定的回复才算真正完成的一步
            
            # 检查是否完成
            # 完成信号是子串包含，模型若在解释文字里引用 "[DONE]" 字样也会被误判为结束
            if self._is_complete(response):
                self.state = "COMPLETED"
                break  # 显式跳出，使 return 唯一，避免两个出口的返回结构各自演化
        
        # 正常路径为 COMPLETED；若 state 被外部改动而退出循环，则原样透出该状态，调用方需自行解释未知状态
        return {
            "status": self.state,
            "steps": steps
        }
    
    # 第 3 段：审批后恢复（把人工决定当作新的用户输入重新灌进对话）
    # 为什么这样写：resume 用 if 状态门禁限制了合法入口，只有 AWAITING_APPROVAL 时可被唤醒；
    # 关键在于它并不回到 process_task 的循环里，恢复后的执行完全交给 initiate_chat 自己跑完。
    # 易错点：其它状态下静默无操作，调用方无法区分"恢复失败"与"恢复成功"；initiate_chat 的返回值也未回收，进度不入 steps。
    def resume(self, approval: str):
        """恢复执行"""
        if self.state == "AWAITING_APPROVAL":
            # 用 [RESUME] 前缀包装人工输入，让模型能区分"这是审批结论"而不是一个新任务；
            # 传 self.assistant 作为对话对象较反常，语义上等价于让它与自己对话，排查问题时应留意这一点
            self.assistant.initiate_chat(
                self.assistant,
                message=f"[RESUME] {approval}"
            )
            self.state = "RUNNING"  # 置回 RUNNING 只表示"可再次被中断"，并不意味着重新进入上面的主循环
    
    # 第 4 段：完成判定（把自然语言里的完成信号收敛成一个布尔谓词）
    # 为什么这样写：标记列表封在方法内部，调用方只关心真假；any() 短路求值，命中首个标记即返回，最坏 O(k·n)（k 为标记数，n 为回复长度）。
    # 易错点：大小写敏感且是子串匹配，"[DONE]" 同样会命中 "[DONED]"；若需严格，应改为精确匹配或带词界的正则。
    def _is_complete(self, response: str) -> bool:
        """检查是否完成"""
        completion_markers = ["[COMPLETE]", "[DONE]", "[FINISHED]"]  # 每次调用都重建列表，热点路径上可提升为类常量
        return any(marker in response for marker in completion_markers)
```
### 5.4 渐进式授权模式

```python
# 第 1 段：类声明与职责界定（渐进式授权器：按任务复杂度动态放权）
# 设计意图：把"权限"从静态配置变成随任务推进而升级的状态机，
# 让 agent 默认以最小权限启动，按需提权，从源头压缩误操作/越权的爆炸半径。
class ProgressiveAuthorization:
    """
    渐进式授权 - 随任务复杂度调整权限
    """
    
    # 第 2 段：权限等级表（能力矩阵 / 策略数据化）
    # 用"等级名 -> 能力布尔开关"的字典把权限策略从代码逻辑里剥离出来，
    # 便于扩展新等级或新能力维度而无需改动执行流程。
    # 注意这是单向阶梯语义：FULL 本应隐式包含下层全部能力，此处用显式重复字段表达，
    # 没有做层间继承，改表时要自行保证上层字段不会漏配。
    AUTHORIZATION_LEVELS = {
        "READ": {"code_execution": False, "file_write": False},
        "EXECUTE": {"code_execution": True, "file_write": False},
        "WRITE": {"code_execution": True, "file_write": True},
        "FULL": {"code_execution": True, "file_write": True, "system": True}
    }
    
    # 第 3 段：初始化（绑定底层 agent，并把权限停在最低档）
    # 这里同时确定两件事：委托对象 assistant 以及初始权限 current_level。
    # 默认 READ 是"安全起点"——对象构造完不会自带写/执行能力，必须显式提权，
    # 避免默认高权限导致"忘了收紧"这类典型安全漏洞。
    def __init__(self, llm_config):
        self.assistant = AssistantAgent(name="assistant", llm_config=llm_config)
        self.current_level = "READ"
    
    # 第 4 段：权限提升（唯一的状态变更入口）
    # 关键点：只接受白名单内的等级名，非法字符串被静默忽略（不抛异常、也不改变现状），
    # 这样调用方拼错等级名时至少不会把权限改成未定义状态。
    # 边界条件：本方法并不校验"只能升不能降"，传入更低等级会真的降级；
    # 若业务要求单调递增，需要在此处比较新旧等级的序关系后再赋值。
    def escalate(self, new_level: str):
        """提升权限等级"""
        if new_level in self.AUTHORIZATION_LEVELS:
            self.current_level = new_level
            print(f"权限提升至: {new_level}")
    
    # 第 5 段：按当前权限执行任务（先策略检查，再委托给 agent）
    # 数据流：用 self.current_level 查表取出能力开关快照 perms，
    # 再对任务文本做关键词嗅探；一旦命中当前等级不具备的能力，
    # 立即短路返回提示、绝不调用模型，做到"先鉴权后执行"。
    # 易错点：能力判定基于 task 的 "execute"/"write" 子串匹配，属于粗粒度启发式——
    # 描述里不含这些词但实际要写文件/跑代码的任务仍会绕过检查，仅适合教学演示；
    # 另外 perms 只读不改，所以不会污染类级别的 AUTHORIZATION_LEVELS 常量，
    # 单次执行的时间复杂度为 O(len(task))，瓶颈全在后续的 generate_reply 调用。
    def execute_with_current_level(self, task: str):
        """使用当前权限执行"""
        perms = self.AUTHORIZATION_LEVELS[self.current_level]  # 当前等级的能力开关快照
        
        if not perms["code_execution"] and "execute" in task.lower():
            return "需要 EXECUTE 权限"
        
        if not perms["file_write"] and "write" in task.lower():
            return "需要 WRITE 权限"
        
        return self.assistant.generate_reply(
            messages=[{"content": task, "role": "user"}]
        )
```
## 6. 完整代码示例

### 6.1 开发团队群聊

```python
"""
AutoGen 多智能体开发团队示例
角色：产品经理、架构师、前端、后端、测试
"""

import os
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

# LLM 配置
llm_config = {
    "model": "gpt-4",
    "api_key": os.environ.get("OPENAI_API_KEY"),
    "temperature": 0.7
}

# 创建团队成员
pm = AssistantAgent(
    name="product_manager",
    llm_config=llm_config,
    system_message="你是一个经验丰富的产品经理，擅长需求分析和PRD撰写。"
)

architect = AssistantAgent(
    name="architect",
    llm_config=llm_config,
    system_message="你是一个系统架构师，擅长技术方案设计和架构评审。"
)

frontend = AssistantAgent(
    name="frontend_developer",
    llm_config=llm_config,
    system_message="你是一个前端开发工程师，精通 React、Vue、TypeScript。"
)

backend = AssistantAgent(
    name="backend_developer",
    llm_config=llm_config,
    system_message="你是一个后端开发工程师，精通 Python、Go、数据库设计。"
)

tester = AssistantAgent(
    name="qa_engineer",
    llm_config=llm_config,
    system_message="你是一个测试工程师，擅长测试策略和用例设计。"
)

# 用户代理
user_proxy = UserProxyAgent(
    name="user",
    human_input_mode="TERMINATE"
)

# 创建群聊
team = GroupChat(
    agents=[pm, architect, frontend, backend, tester],
    messages=[],
    max_round=20,
    speaker_selection_method="auto"
)

manager = GroupChatManager(groupchat=team, llm_config=llm_config)

# 启动团队协作
user_proxy.initiate_chat(
    manager,
    message="""
    请团队协作完成以下任务：
    
    1. 产品经理分析需求：用户注册登录系统
    2. 架构师设计系统架构
    3. 前后端分配开发任务
    4. 测试工程师设计测试用例
    """
)
```

### 6.2 代码审查流水线

```python
"""
自动代码审查流水线
"""

from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

class CodeReviewPipeline:
    """代码审查流水线"""
    
    def __init__(self, llm_config):
        # 编码智能体
        self.coder = AssistantAgent(
            name="coder",
            llm_config=llm_config,
            system_message="你是一个 Python 开发工程师，编写高质量代码。"
        )
        
        # 审查智能体
        self.reviewer = AssistantAgent(
            name="reviewer",
            llm_config=llm_config,
            system_message="""你是一个代码审查专家，专注于：
            1. 代码质量（可读性、规范性）
            2. 性能问题
            3. 安全漏洞
            4. 测试覆盖
            """
        )
        
        # 执行器
        self.executor = UserProxyAgent(
            name="executor",
            human_input_mode="NEVER",
            code_execution_config={"work_dir": "workspace", "use_docker": True}
        )
        
        self.llm_config = llm_config
    
    def run(self, code: str) -> dict:
        """运行审查流程"""
        results = {
            "original_code": code,
            "issues": [],
            "suggestions": []
        }
        
        # Step 1: 编码
        self.coder.initiate_chat(
            self.executor,
            message=f"编写并执行以下需求的代码：\n{code}"
        )
        written_code = self.executor.last_message()
        
        # Step 2: 审查
        self.reviewer.initiate_chat(
            self.executor,
            message=f"审查以下代码并提供改进建议：\n{written_code}"
        )
        review_result = self.reviewer.last_message()
        
        # Step 3: 整合结果
        if "error" in review_result.lower():
            results["issues"].append(review_result)
        else:
            results["suggestions"].append(review_result)
        
        return results

# 使用示例
pipeline = CodeReviewPipeline(llm_config)
result = pipeline.run("实现一个 LRU 缓存")
```

### 6.3 研究助手群聊

```python
"""
研究助手 - 多智能体协作研究
"""

# 第 1 段：导入依赖（这一段决定整个方案的"词汇表"）
# AssistantAgent = 由 LLM 生成的发言者；GroupChat = 保存全部消息并施加发言规则；
# GroupChatManager = 按规则挑选下一个发言者的调度器，三者缺一不可。
# 易错点：下面用到的 UserProxyAgent 并没有出现在这一行，运行到 conduct_research 时才会暴露 NameError。
from autogen import AssistantAgent, GroupChat, GroupChatManager

# 第 2 段：团队定义与初始化（把三个角色装配成可复用的对象）
# 三个 Agent 共享同一个 llm_config 字典；AutoGen 可能就地写入 cache_seed 等字段，
# 因此它是共享可变状态——额外保存 self.llm_config 就是为了后续构造 GroupChatManager 时
# 能拿到与角色完全一致的模型配置，避免两处配置漂移。
class ResearchTeam:
    """研究团队"""
    
    def __init__(self, llm_config):
        # 三个角色的模型与采样参数完全相同，唯一差异是 system_message 给出的人设分工：
        # 研究员负责广度（搜集），分析师负责深度（提炼），作家负责表达（成文）。
        # 这种"同模型、不同提示"是多智能体最廉价的实现方式：不额外训练，只换提示词。
        self.researcher = AssistantAgent(
            name="researcher",
            llm_config=llm_config,
            system_message="你是一个研究员，负责搜集和整理信息。"
        )
        
        self.analyst = AssistantAgent(
            name="analyst",
            llm_config=llm_config,
            system_message="你是一个分析师，负责深度分析和提炼洞见。"
        )
        
        self.writer = AssistantAgent(
            name="writer",
            llm_config=llm_config,
            system_message="你是一个技术作家，负责撰写清晰的研究报告。"
        )
        
        # 存引用而非深拷贝，确保 Manager 与三个角色读到的是同一份模型配置
        self.llm_config = llm_config
    
    # 第 3 段：一次完整研究任务的编排（群聊 → 调度器 → 用户代理 → 取回结果）
    def conduct_research(self, topic: str) -> str:
        """执行研究任务"""
        # 创建临时群聊
        # 每次调用都新建 GroupChat 且 messages=[]，保证不同 topic 之间历史不串味；
        # max_round=15 是硬性轮数上限（一轮 = 一次发言 = 一次 LLM 调用），
        # 它既是成本闸门也是防死循环的兜底——太小报告写不完，太大则烧钱。
        group = GroupChat(
            agents=[self.researcher, self.analyst, self.writer],
            messages=[],
            max_round=15
        )
        # Manager 需要 llm_config，是因为"下一个谁发言"本身也交给 LLM 决策：
        # 它把 group 的消息历史转成提示词选出下一位发言者，所以既是调度器也是调用者。
        manager = GroupChatManager(groupchat=group, llm_config=self.llm_config)
        
        # 用户代理启动
        # UserProxyAgent 代表"人"这一侧：human_input_mode="TERMINATE" 表示平时不打断、
        # 只有出现终止条件时才要求人工介入，适合无人值守的批量运行。
        # initiate_chat 把 message 作为开场白注入群聊，随后由 Manager 接管轮转。
        user_proxy = UserProxyAgent(name="user", human_input_mode="TERMINATE")
        user_proxy.initiate_chat(
            manager,
            message=f"请研究团队协作完成关于「{topic}」的研究报告。"
        )
        
        # initiate_chat 的返回值（ChatResult，含 chat_history/cost 等）被忽略，这里只取最后一条消息当报告。
        # 边界条件：若末尾是 TERMINATE 之类的控制消息而非正文，返回值可能不是完整报告，
        # 更稳健的做法是回传整个 chat_history 或显式提取 writer 的最后一次发言。
        return user_proxy.last_message()

# 第 4 段：使用示例（注意 llm_config 需在此前于外部定义好）
# 数据流：构造团队 → 传入研究主题 → 得到字符串报告；
# 单次 run 的 LLM 调用量级与 max_round 相当（调度 + 各角色发言），需为成本预留预算。
team = ResearchTeam(llm_config)
report = team.conduct_research("大语言模型在代码生成领域的应用")
```
### 6.4 带错误恢复的代码生成

```python
# 第 1 段：模块定位与依赖引入
# 本模块演示基于 AutoGen 的"生成 → 执行 → 报错 → 再生成"闭环：让 LLM 扮演写代码的人和修代码的人，
# 由执行器真正跑一遍产物，用运行期异常当作反馈信号驱动下一轮生成，直到成功或重试次数耗尽。
"""带自动错误恢复的代码生成系统"""

# 只依赖两个核心角色：AssistantAgent（纯 LLM 对话，不执行代码）与 UserProxyAgent（可作为执行载体）。
from autogen import AssistantAgent, UserProxyAgent


# 第 2 段：类骨架与重试上限常量
# 把 MAX_RETRIES 放在类属性而非实例属性，是为了让"最大重试次数"成为全局策略：
# 所有实例共享同一份配置，后续想做按实例定制也可以被 __init__ 覆盖成实例属性。
class SelfHealingCodeGenerator:
    """自愈代码生成器"""
    
    MAX_RETRIES = 3
    
    # 第 3 段：构造三件套（生成者 / 调试者 / 执行者）
    # 三个 Agent 共用同一份 llm_config，只有 system_message 做职责隔离——这就是"角色提示词即工作流分工"的思路。
    # executor 用 human_input_mode="NEVER" 让流程完全无人值守；use_docker=True 把不可信代码关进容器，
    # 代价是每次执行有容器启动开销，且宿主机与容器的工作目录映射需要真实存在（边界条件之一）。
    def __init__(self, llm_config):
        self.generator = AssistantAgent(
            name="generator",
            llm_config=llm_config,
            system_message="你是一个代码生成专家，生成高质量 Python 代码。"
        )
        
        # debugger 目前只做了注册、并未在 generate_with_recovery 中显式调用；
        # 它依赖 AutoGen 的多 Agent 对话机制（generator 与 executor 互相触发）被动参与，属于易错点/待接线处。
        self.debugger = AssistantAgent(
            name="debugger",
            llm_config=llm_config,
            system_message="你是一个调试专家，精于修复代码错误。"
        )
        
        self.executor = UserProxyAgent(
            name="executor",
            human_input_mode="NEVER",
            code_execution_config={"work_dir": "workspace", "use_docker": True}
        )
    
    # 第 4 段：对外主入口——带恢复的生成流程
    # 返回 (code, success) 这种"值 + 布尔"元组，而不是抛异常，让调用方可以自己决定失败后怎么办（降级、告警、人工接管）。
    # 数据流：requirement → generator/executor 对话 → executor.last_message() 取回文本 → 尝试执行 → 成功返回 / 失败回填 last_error。
    def generate_with_recovery(self, requirement: str) -> tuple[str, bool]:
        """
        带错误恢复的代码生成
        
        Returns:
            (code, success)
        """
        attempt = 0
        
        # 用 while 而非 for，是因为 attempt 只在"真正执行失败"后才自增：
        # 无论生成还是执行阶段出现异常，都会走同一个计数口径，保证最多执行 MAX_RETRIES 次。
        while attempt < self.MAX_RETRIES:
            # 第 5 段：生成阶段——首轮"从零写"，后续轮"带着错误修"
            # attempt == 0 与 else 分支的唯一区别是把 last_error 拼进提示词，形成"错误驱动"的迭代修复；
            # 这也是为什么 last_error 只会在 attempt > 0 时被引用——它在第 6 段的 except 中被赋值，边界安全。
            # 生成代码
            if attempt == 0:
                self.generator.initiate_chat(
                    self.executor,
                    message=f"生成代码：{requirement}"
                )
            else:
                self.generator.initiate_chat(
                    self.executor,
                    message=f"根据错误修复代码：{requirement}\n错误：{last_error}"
                )
            
            # last_message() 取的是整段对话最后一条消息的纯文本，通常含 Markdown 代码块与解释文字；
            # 直接把它当"可执行源码"是这段代码最脆弱的假设，后续若接入正式生产需要做代码块抽取/清洗。
            code = self.executor.last_message()
            
            # 第 6 段：执行与错误捕获——恢复机制的核心
            # 这里用 try/except 把"执行失败"转成可继续的循环信号：捕获到异常就刷新 last_error 并进入下一轮，
            # 从而把一次性脚本变成自愈流程。复杂度上，每轮都是 LLM 往返 + 沙箱执行，代价随重试数线性增长。
            # 注意边界：AutoGen 的 execute_code_blocks 也常用"返回执行结果"而非抛异常的方式报告失败，
            # 若失败被吞在返回值里，此处的 except 就不会触发，重试会过早判定成功——这是最需要留意的语义陷阱。
            # 执行并检查错误
            try:
                self.executor.execute_code_blocks([
                    ("python", code)
                ])
                
                # 没抛异常即视为成功：立刻返回，避免把成功结果也拖进重试循环。
                return code, True
                
            except Exception as e:
                # 只保留错误字符串而非完整 traceback，是为了控制回填给提示词的上下文长度，防止提示词膨胀。
                last_error = str(e)
                attempt += 1
                print(f"尝试 {attempt} 失败: {last_error}")
        
        # 第 7 段：重试耗尽后的兜底返回
        # 返回最后一次生成的 code（可能仍是坏的）并标记 False，把最终裁决权交给调用方；
        # 隐含边界：若 MAX_RETRIES <= 0，循环体一次都不进入，code/last_error 均未绑定，此处会抛 NameError。
        return code, False


# 第 8 段：使用示例——实例化 + 单次调用
# llm_config 在此处是"外部注入"的隐式依赖：示例假定它已在上下文定义，教学演示时可直接视作占位。
# 调用会阻塞到成功或重试耗尽，因此放在脚本顶层时，打印的失败信息就是最直观的恢复过程日志。
# 使用示例
generator = SelfHealingCodeGenerator(llm_config)
code, success = generator.generate_with_recovery(
    "实现一个函数计算字符串中每个字符出现的频率"
)
```
## 7. 最佳实践

### 7.1 群聊配置建议

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| `max_round` | 10-30 | 根据任务复杂度调整 |
| `speaker_selection_method` | "auto" | 动态选择通常更灵活 |
| `allow_repeat_speaker` | True | 允许关键人物多次发言 |
| `messages` | [] | 从空列表开始 |

### 7.2 性能优化

```python
# 1. 限制上下文长度
group_chat = GroupChat(
    agents=agents,
    messages=[],
    max_round=20,
    send_token_limit=6000  # 限制每次发送的 token
)

# 2. 使用缓存
from autogen.caching import CacheDisk

cache = CacheDisk(ttl=3600, max_size=1000)
assistant = AssistantAgent(
    name="assistant",
    llm_config=llm_config,
    cache=cache
)

# 3. 并行初始化
import concurrent.futures

def init_agent(args):
    name, config = args
    return AssistantAgent(name=name, llm_config=config)

with concurrent.futures.ThreadPoolExecutor() as executor:
    agents = list(executor.map(
        init_agent,
        [("agent1", llm_config), ("agent2", llm_config), ("agent3", llm_config)]
    ))
```

### 7.3 调试技巧

```python
import logging

# 启用详细日志
logging.basicConfig(level=logging.DEBUG)

# 自定义日志处理器
class GroupChatLogger:
    def __init__(self, log_file: str):
        self.log_file = log_file
    
    def log_message(self, speaker: str, message: str):
        timestamp = datetime.now().isoformat()
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {speaker}: {message}\n")

# 使用日志
logger = GroupChatLogger("group_chat.log")
for msg in group_chat.messages:
    logger.log_message(msg["speaker"], msg["content"])
```

## 8. 参考资源

- [AutoGen 官方文档](https://microsoft.github.io/autogen/)
- [AutoGen GitHub 仓库](https://github.com/microsoft/autogen)
- [GroupChat 示例](https://github.com/microsoft/autogen/blob/main/python/packages/autogen-agentchat/src/autogen_agentchat/groups/)
- [AutoGen 论文](https://arxiv.org/abs/2308.08155)

---

*本文档由 Claude 生成，最后更新：2026-05*

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 电商后台每日订单对账，单日账单文件上万行 | GroupChat 模式中的固定顺序发言 | GroupChat + speaker_selection_method="round_robin" | 顺序固定可去掉选人抖动，但角色要拆到一人一职 |
| 客服工单自动分诊并生成回复草稿 | GroupChat 架构中的 Manager 选人 | GroupChatManager + 自定义 speaker_selection_func | 草稿先内部流转，人工确认后再外发 |
| 合同条款多角色审阅（法务/财务/业务） | 嵌套聊天与层级组 | 外层 GroupChat 调用内层 GroupChat | 内层结论要压成结构化摘要再回传外层 |
| 代码仓库 issue 修复流水线 | AutoGen 代码执行 | UserProxyAgent + code_execution_config 指定 Docker | 容器内不挂载密钥，测试失败要允许重跑 |
| 运维告警根因分析，日志/指标/变更三路取证 | Human-in-the-Loop 模式 | human_input_mode="TERMINATE" + 值班人确认 | 值班窗口外要留超时降级路径 |
| 在线教育作业批改与讲解生成 | 最佳实践中的终止条件设计 | is_termination_msg + max_round | 终止标记要写成可判定的字符串 |
| 数据看板口径核对，先生成 SQL 再验证 | AutoGen 代码执行 + GroupChat 模式 | 分析 Agent + 执行 Agent + 校验 Agent | 数据库账号只读，禁止 DDL |
| 保险理赔材料初审，多份单据交叉核对 | 嵌套聊天与层级组 | 外层路由 + 内层逐材料核对 | 缺件要显式列出缺哪一份，不允许模型推测 |

### 三个场景拆解

#### 场景 1：电商后台每日订单对账

**业务背景**：财务每天拿平台账单与自有库订单逐行比对，单日文件在万行量级。人工抽检覆盖的行数占比低，差异常在结算前才暴露。

**怎么用本页知识解决**：把流程拆成读取、比对、执行三个角色，用固定顺序发言的群聊跑完一轮，避免模型自由选人带来的顺序漂移。

```python
import autogen

llm_config = {"config_list": [{"model": "你的模型名"}]}  # 按运行环境替换

reader = autogen.AssistantAgent(        # 角色 1：只读文件，报字段与行数
    name="reader", llm_config=llm_config,
    system_message="读取两份对账文件，输出字段名与总行数，不判断差异。")

checker = autogen.AssistantAgent(       # 角色 2：只做逐行比对
    name="checker", llm_config=llm_config,
    system_message="用 pandas 逐行比对，输出差异订单号与差异字段。")

executor = autogen.UserProxyAgent(      # 角色 3：真正执行代码，不参与讨论
    name="executor", human_input_mode="NEVER",
    code_execution_config={"work_dir": "recon", "use_docker": True})

groupchat = autogen.GroupChat(          # 固定顺序，去掉选人随机性
    agents=[reader, checker, executor], messages=[],
    speaker_selection_method="round_robin", max_round=9)

manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config)
executor.initiate_chat(manager, message="对账 2024-06-01 的账单与订单文件")
```

- 读取角色只报结构，比对角色只报差异，输出格式稳定，方便下游脚本解析。
- round_robin 让每次运行的角色顺序一致，同一天的数据重跑结果可比。
- 执行角色设 human_input_mode="NEVER"，批处理任务不需要人守在终端。
- use_docker=True 把生成的 pandas 代码限制在容器里，避免改动宿主环境。
- max_round 设成角色数乘以 3，防止某个角色反复追问把预算吃光。

**怎么度量收益**：看三项。一是差异召回率，用差异行数除以人工复核表确认的差异行数；二是误报率，即模型报出的差异中复核后不成立的占比；三是端到端时长，用 Python 的 time.perf_counter 在批处理入口打点记录。

**什么时候不该用**：
- 差异规则能用一条 SQL 的 join 唯一确定时，多角色讨论只增加耗时。
- 对账文件含客户手机号、身份证号，且项目所在环境不允许把文件内容发到模型服务时。
- 差异量在十行以内并且每周只跑一次，直接人工比对成本更低。

#### 场景 2：客服工单自动分诊与回复草稿

**业务背景**：客服系统每天新增工单量随活动波动，峰值时人工分诊成为排队瓶颈。错分到退款组的工单会被退回重走流程，客户等待时间拉长。

**怎么用本页知识解决**：用 GroupChatManager 的选人逻辑承载分诊规则，先按工单标签路由到对应专家 Agent，再由质检 Agent 出草稿。

```python
import autogen

def pick_speaker(last_speaker, groupchat):      # 自定义选人：先看标签再选人
    text = str(groupchat.messages[-1].get("content", ""))
    if last_speaker.name == "dispatcher":       # 分诊员刚说完，进到专家
        return refund_agent if "退款" in text else tech_agent
    if last_speaker.name in ("refund_agent", "tech_agent"):
        return qa_agent                          # 专家说完，进质检出草稿
    return None                                  # 返回 None 交回默认逻辑

groupchat = autogen.GroupChat(
    agents=[dispatcher, refund_agent, tech_agent, qa_agent],
    messages=[], max_round=8,
    speaker_selection_method=pick_speaker)       # 用函数替换模型选人

dispatcher.initiate_chat(
    autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config),
    message=work_order_text)
```

- 选人函数读的是标签字符串，不是模型判断，路由结果可写单元测试。
- 分诊员只输出标签与理由，不写正文，减少一次生成成本。
- 质检 Agent 在最后一步出草稿，草稿前缀加 `[待人工确认]` 标记。
- 返回 None 时退回默认选人逻辑，遇到未覆盖的标签不会卡死流程。
- 群聊消息列表就是审计日志，事后可回放每一步是谁说的。

**怎么度量收益**：看分诊准确率（分诊标签与工单最终处理组一致的比例，用客服系统的标签字段导出比对）、平均首次响应时长（工单系统自带时间戳字段）、草稿采纳率（人工发送内容与草稿的编辑距离低于阈值算采纳）。

**什么时候不该用**：
- 工单类型集中在两类且规则只有几条 if，直接写规则代码比建群聊可靠。
- 工单含用户提交的身份证照片或银行卡截图，图片无法只靠文本标签分诊。
- 业务要求每次回复都可追溯到具体条款编号，而模型草稿无法保证引用正确。

#### 场景 3：代码仓库 issue 修复流水线

**业务背景**：中小团队每周积累的缺陷单里，重复的复现步骤与日志排查占掉不少工时。修复本身要跑测试，人工一轮轮贴日志容易中断。

**怎么用本页知识解决**：外层群聊做分工与评审，内层群聊专门跑复现和测试，内层结束后只把摘要回传。内层用 register_nested_chats 挂在外层某个 Agent 上。

```python
import autogen

coder = autogen.AssistantAgent(name="coder", llm_config=llm_config,
    system_message="根据 issue 描述改代码，改完请求跑测试。")
tester = autogen.AssistantAgent(name="tester", llm_config=llm_config,
    system_message="执行测试命令，报告失败用例名与报错首行。")
reviewer = autogen.AssistantAgent(name="reviewer", llm_config=llm_config,
    system_message="判断改动是否只覆盖本 issue，输出 PASS 或 REJECT。")

inner = autogen.GroupChat(agents=[coder, tester], messages=[], max_round=6)
inner_manager = autogen.GroupChatManager(groupchat=inner, llm_config=llm_config)

reviewer.register_nested_chats(                 # 内层：复现并跑测试
    [{"recipient": inner_manager, "message": "复现该 issue 并跑相关测试",
      "summary_method": "last_msg",             # 只把最后一条结论带回外层
      "max_turns": 4}],
    trigger=lambda sender: sender.name != "reviewer")

outer = autogen.GroupChat(agents=[coder, tester, reviewer], messages=[],
    max_round=12, speaker_selection_method="auto")
```

- 内层只负责复现与测试，测试环境崩了不会污染外层的讨论上下文。
- summary_method="last_msg" 让外层只看到结论，token 消耗可控。
- trigger 排除 reviewer 自身，避免它触发自己进入死循环。
- 外层用 auto 选人，评审被拒绝时会自动回到 coder 重改。
- 内层 max_turns 要小于外层 max_round，保证总有收敛机会。

**怎么度量收益**：看首次修复通过率（pytest 退出码为 0 的 issue 占比，用 CI 的 job 结果统计）、平均轮次（ChatResult 中 messages 条数，按 issue 归档）、内层摘要长度（用 token 计数工具统计回传文本）。

**什么时候不该用**：
- 仓库测试套件本身不稳定，失败率高，Agent 会把环境抖动当成代码缺陷。
- 改动涉及数据库迁移或线上配置，自动跑测试无法覆盖，必须人工评审。
- 代码库不允许出内网，而模型服务在公网，此时只能走本地部署模型。

### 行业先进实践

**代码执行放进容器（出处：AutoGen 官方文档 Code Executors 章节）**：官方文档提供 Docker 命令行执行器，把模型生成的代码放进容器运行，并允许限制工作目录与网络。有效的原因是生成的代码可能删文件或装依赖，容器隔离把影响范围收在工作目录内。借鉴时先在本地用进程内执行器调通逻辑，接入共享环境前换成容器执行。

**先试工作流再上多智能体（出处：Anthropic 官方工程博客 Building Effective Agents）**：该文把提示链、路由、并行、编排-工作者、评估-优化列为常见模式，并建议从最简方案起步。有效的原因是多数任务用固定步骤就能完成，多智能体引入的通信开销换不来对应收益。借鉴时先写出单 Agent 加固定步骤的版本，跑不通再拆角色。

**人工介入做成可中断可恢复（出处：LangGraph 官方文档 human-in-the-loop）**：该文档描述在图节点处暂停、保存状态、人工修改后继续执行。有效的原因是长流程里人不可能一直守着，状态持久化让确认动作可以延后。借鉴时把确认点设计成状态机的一次暂停，而不是阻塞在终端等输入。

**显式交接加链路追踪（出处：OpenAI Agents SDK 官方文档 handoffs 与 tracing）**：该文档把任务交接定义为一次可命名、可记录的动作，并配套追踪能力。有效的原因是出错时能定位到是哪一次交接丢了上下文。借鉴时给每次角色切换起固定名称，并把名称写进日志字段。

**生成式调用的可观测字段（需核对官方文档：OpenTelemetry GenAI semantic conventions 的字段名与稳定级别）**：需要核对模型名、token 数、请求耗时这些属性当前的正式名称，以及该约定是否已标记为稳定。核对清楚后再决定日志字段命名，避免后续改名导致看板重做。

### 从学到用：落地路线

1. **试点**：选一个输入输出都能落成文件的离线任务，比如报表核对，跑通三角色群聊。验收标准是同一份输入连跑三次，输出文件的行数与字段完全一致。
2. **验证**：把试点结果与人工结论逐条比对，记录差异召回率与误报率。验收标准是连续五个工作日的人工复核表都能对上，且误报率不超过设定阈值。
3. **推广**：把通过验证的流程封装成脚本，接入定时任务，其他团队按同一模板替换角色提示词。验收标准是有两个以上业务方在自己环境跑通，并且配置项来自配置文件而非改代码。
4. **防回退**：给每个流程留一份基准输入与期望输出，纳入 CI 每日跑一次；改动提示词必须同时更新基准。验收标准是基准用例失败时 CI 阻断合并，且失败原因能在日志里定位到具体角色。

### 动手作业

**目标**：搭一个三角色群聊，对一份两列 CSV（订单号、金额）做核对，输出差异清单并给出归因摘要。

**步骤**：
1. 造两份各 200 行的 CSV，人为埋入 5 行金额不一致和 2 行只在一侧出现的记录。
2. 定义 reader、checker、executor 三个 Agent，提示词里写死各自的输出字段。
3. 用 GroupChat 组装，speaker_selection_method 设为 round_robin，max_round 设为 9。
4. executor 的 code_execution_config 指定工作目录与沙箱，先跑一次看差异清单。
5. 把 max_round 改成 3，观察流程被截断时输出缺了什么，再改回 9。
6. 把 5 行金额差异改成 0 行，确认脚本输出"无差异"而不是编造结论。
7. 用 time.perf_counter 记录整轮耗时，写入日志文件。

**验收标准**：
- 7 行埋入的差异全部出现在输出清单里，订单号与差异字段逐条对得上。
- 同一份输入连跑三次，输出的差异行数与订单号集合完全相同。
- 把 max_round 改成 3 后输出不完整，改回 9 后恢复完整，两种情况的日志都可查。
- 无差异输入下，输出不含任何模型编造的订单号。
- 日志里有本轮耗时与群聊消息条数两个字段。

