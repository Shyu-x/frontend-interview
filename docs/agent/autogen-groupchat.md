# AutoGen Group Chat 与多智能体协作

本文档介绍 Microsoft AutoGen 框架中的 Group Chat 架构、协作模式及实战代码。

---

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

---

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

---

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

---

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
from autogen import UserProxyAgent, AssistantAgent

code_executor = UserProxyAgent(
    name="code_executor",
    code_execution_config={
        "work_dir": "workspace",
        "use_docker": True
    }
)

assistant = AssistantAgent(
    name="assistant",
    llm_config=llm_config
)

def execute_with_retry(code: str, max_retries: int = 3):
    """带重试的代码执行"""
    for attempt in range(max_retries):
        code_executor.initiate_chat(
            assistant,
            message=f"执行并解释这段代码:\n{code}"
        )
        
        # 获取执行结果
        messages = code_executor.chat_messages[assistant]
        last_msg = messages[-1]
        
        if "error" not in last_msg.get("content", "").lower():
            return last_msg.get("content")
        
        print(f"尝试 {attempt + 1} 失败，重试...")
    
    return "执行失败"
```

### 4.3 多语言代码执行

```python
from autogen import UserProxyAgent

# Python 执行器
python_executor = UserProxyAgent(
    name="python_executor",
    code_execution_config={
        "work_dir": "workspace",
        "use_docker": "python:3.11",
        "timeout": 60
    }
)

# JavaScript 执行器
js_executor = UserProxyAgent(
    name="js_executor",
    code_execution_config={
        "work_dir": "workspace",
        "use_docker": "node:18",
        "timeout": 60
    }
)

# SQL 执行器
sql_executor = UserProxyAgent(
    name="sql_executor",
    code_execution_config={
        "work_dir": "workspace",
        "use_docker": "mysql:8",
        "timeout": 30
    }
)

def execute_multi_language(code_blocks: list[tuple[str, str]]):
    """
    执行多语言代码块
    
    Args:
        code_blocks: [(language, code), ...]
    """
    executor_map = {
        "python": python_executor,
        "javascript": js_executor,
        "sql": sql_executor
    }
    
    results = {}
    for lang, code in code_blocks:
        executor = executor_map.get(lang)
        if executor:
            executor.initiate_chat(
                assistant,
                message=f"执行 {lang} 代码:\n{code}"
            )
            results[lang] = executor.last_message()
    
    return results
```

### 4.4 代码执行上下文管理

```python
class ManagedCodeExecution:
    """托管代码执行环境"""
    
    def __init__(self, work_dir: str):
        self.work_dir = work_dir
        self.executor = UserProxyAgent(
            name="managed_executor",
            code_execution_config={
                "work_dir": work_dir,
                "use_docker": True,
                "timeout": 300
            }
        )
        self.context = {}  # 持久化上下文
    
    def set_context(self, key: str, value: any):
        """设置执行上下文"""
        self.context[key] = value
    
    def execute_with_context(self, code: str) -> str:
        """使用上下文执行代码"""
        # 注入上下文到代码
        context_vars = "\n".join(
            f"{k} = {repr(v)}" for k, v in self.context.items()
        )
        
        full_code = f"{context_vars}\n{code}"
        
        self.executor.initiate_chat(
            assistant,
            message=f"执行代码:\n{full_code}"
        )
        
        return self.executor.last_message()
```

---

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
class HumanApprovalWorkflow:
    """人工审批工作流"""
    
    def __init__(self, llm_config):
        self.assistant = AssistantAgent(name="assistant", llm_config=llm_config)
        self.human = UserProxyAgent(
            name="human",
            human_input_mode="NEVER"  # 默认自动执行
        )
        self.pending_approvals = []
    
    def request_approval(self, task: str, risk_level: str = "LOW"):
        """
        请求人工审批
        
        Args:
            task: 待审批任务
            risk_level: 风险等级 (LOW/MEDIUM/HIGH/CRITICAL)
        """
        if risk_level in ["HIGH", "CRITICAL"]:
            # 高风险操作需要人工确认
            self.human.human_input_mode = "ALWAYS"
        else:
            self.human.human_input_mode = "NEVER"
        
        self.pending_approvals.append({
            "task": task,
            "risk_level": risk_level,
            "status": "PENDING"
        })
        
        self.assistant.initiate_chat(
            self.human,
            message=f"[审批请求 - {risk_level}] {task}"
        )
    
    def approve_task(self, task_id: int):
        """审批通过"""
        if task_id < len(self.pending_approvals):
            self.pending_approvals[task_id]["status"] = "APPROVED"
    
    def reject_task(self, task_id: int, reason: str):
        """审批拒绝"""
        if task_id < len(self.pending_approvals):
            self.pending_approvals[task_id]["status"] = "REJECTED"
            self.pending_approvals[task_id]["reason"] = reason
```

### 5.3 可中断恢复模式

```python
class InterruptibleAgent:
    """可中断智能体"""
    
    STOP_KEYWORD = "[HALT_FOR_APPROVAL]"
    
    def __init__(self, llm_config):
        self.assistant = AssistantAgent(name="assistant", llm_config=llm_config)
        self.state = "RUNNING"
    
    def process_task(self, task: str):
        """带中断的任务处理"""
        self.state = "RUNNING"
        steps = []
        
        while self.state == "RUNNING":
            # 生成下一步
            response = self.assistant.generate_reply(
                messages=[{"content": task, "role": "user"}]
            )
            
            # 检查是否需要中断
            if self.STOP_KEYWORD in response:
                self.state = "AWAITING_APPROVAL"
                return {
                    "status": "INTERRUPTED",
                    "completed_steps": steps,
                    "pending_action": response
                }
            
            steps.append(response)
            
            # 检查是否完成
            if self._is_complete(response):
                self.state = "COMPLETED"
                break
        
        return {
            "status": self.state,
            "steps": steps
        }
    
    def resume(self, approval: str):
        """恢复执行"""
        if self.state == "AWAITING_APPROVAL":
            self.assistant.initiate_chat(
                self.assistant,
                message=f"[RESUME] {approval}"
            )
            self.state = "RUNNING"
    
    def _is_complete(self, response: str) -> bool:
        """检查是否完成"""
        completion_markers = ["[COMPLETE]", "[DONE]", "[FINISHED]"]
        return any(marker in response for marker in completion_markers)
```

### 5.4 渐进式授权模式

```python
class ProgressiveAuthorization:
    """
    渐进式授权 - 随任务复杂度调整权限
    """
    
    AUTHORIZATION_LEVELS = {
        "READ": {"code_execution": False, "file_write": False},
        "EXECUTE": {"code_execution": True, "file_write": False},
        "WRITE": {"code_execution": True, "file_write": True},
        "FULL": {"code_execution": True, "file_write": True, "system": True}
    }
    
    def __init__(self, llm_config):
        self.assistant = AssistantAgent(name="assistant", llm_config=llm_config)
        self.current_level = "READ"
    
    def escalate(self, new_level: str):
        """提升权限等级"""
        if new_level in self.AUTHORIZATION_LEVELS:
            self.current_level = new_level
            print(f"权限提升至: {new_level}")
    
    def execute_with_current_level(self, task: str):
        """使用当前权限执行"""
        perms = self.AUTHORIZATION_LEVELS[self.current_level]
        
        if not perms["code_execution"] and "execute" in task.lower():
            return "需要 EXECUTE 权限"
        
        if not perms["file_write"] and "write" in task.lower():
            return "需要 WRITE 权限"
        
        return self.assistant.generate_reply(
            messages=[{"content": task, "role": "user"}]
        )
```

---

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

from autogen import AssistantAgent, GroupChat, GroupChatManager

class ResearchTeam:
    """研究团队"""
    
    def __init__(self, llm_config):
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
        
        self.llm_config = llm_config
    
    def conduct_research(self, topic: str) -> str:
        """执行研究任务"""
        # 创建临时群聊
        group = GroupChat(
            agents=[self.researcher, self.analyst, self.writer],
            messages=[],
            max_round=15
        )
        manager = GroupChatManager(groupchat=group, llm_config=self.llm_config)
        
        # 用户代理启动
        user_proxy = UserProxyAgent(name="user", human_input_mode="TERMINATE")
        user_proxy.initiate_chat(
            manager,
            message=f"请研究团队协作完成关于「{topic}」的研究报告。"
        )
        
        return user_proxy.last_message()

# 使用示例
team = ResearchTeam(llm_config)
report = team.conduct_research("大语言模型在代码生成领域的应用")
```

### 6.4 带错误恢复的代码生成

```python
"""
带自动错误恢复的代码生成系统
"""

from autogen import AssistantAgent, UserProxyAgent

class SelfHealingCodeGenerator:
    """自愈代码生成器"""
    
    MAX_RETRIES = 3
    
    def __init__(self, llm_config):
        self.generator = AssistantAgent(
            name="generator",
            llm_config=llm_config,
            system_message="你是一个代码生成专家，生成高质量 Python 代码。"
        )
        
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
    
    def generate_with_recovery(self, requirement: str) -> tuple[str, bool]:
        """
        带错误恢复的代码生成
        
        Returns:
            (code, success)
        """
        attempt = 0
        
        while attempt < self.MAX_RETRIES:
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
            
            code = self.executor.last_message()
            
            # 执行并检查错误
            try:
                self.executor.execute_code_blocks([
                    ("python", code)
                ])
                
                return code, True
                
            except Exception as e:
                last_error = str(e)
                attempt += 1
                print(f"尝试 {attempt} 失败: {last_error}")
        
        return code, False

# 使用示例
generator = SelfHealingCodeGenerator(llm_config)
code, success = generator.generate_with_recovery(
    "实现一个函数计算字符串中每个字符出现的频率"
)
```

---

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

---

## 8. 参考资源

- [AutoGen 官方文档](https://microsoft.github.io/autogen/)
- [AutoGen GitHub 仓库](https://github.com/microsoft/autogen)
- [GroupChat 示例](https://github.com/microsoft/autogen/blob/main/python/packages/autogen-agentchat/src/autogen_agentchat/groups/)
- [AutoGen 论文](https://arxiv.org/abs/2308.08155)

---

*本文档由 Claude 生成，最后更新：2026-05*