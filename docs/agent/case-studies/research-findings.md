---
title: 教程资源研究报告
description: 汇总 AI Agent 领域的最佳教程和资源，并分析与现有文档的差距。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 教程资源研究报告

> 本文档汇总 AI Agent 领域的最佳教程和资源，并分析与现有文档的差距。

## 1. Top 10 最有价值的教程资源

### 1.1 LangChain 官方文档与 LangGraph

| 属性 | 内容 |
|------|------|
| **URL** | https://docs.langchain.com/ |
| **主题** | LangChain/LangGraph 完整文档 |
| **覆盖内容** | Agent 基础概念、LangGraph 状态机、工具调用、内存系统、LangSmith 监控 |
| **特点** | Python/TypeScript 双版本、交互式示例、图可视化 |
| **适用人群** | 需要构建复杂 AI 应用的开发者 |

**关键内容摘录**：

```
LangGraph 快速入门流程：
1. 定义工具和模型（使用 @tool 装饰器）
2. 定义状态（使用 TypedDict + Annotated）
3. 定义模型节点（LLM 决策）
4. 定义工具节点（执行工具）
5. 定义结束条件（条件边）
6. 构建和编译 Agent
```

### 1.2 MCP (Model Context Protocol) 官方文档

| 属性 | 内容 |
|------|------|
| **URL** | https://modelcontextprotocol.io/ |
| **主题** | MCP 协议规范与实现 |
| **覆盖内容** | 协议架构、服务器构建、客户端开发、工具定义、资源管理 |
| **特点** | 生态广泛（Claude/ChatGPT/VSCode/Cursor 支持） |
| **适用人群** | 需要标准化 LLM 工具扩展的开发者 |

**核心价值**：

- 类似于 AI 领域的 USB-C 端口
- 支持 100+ 官方服务器
- 跨平台兼容（Claude、Cursor、VSCode）

### 1.3 Anthropic Claude 开发者文档

| 属性 | 内容 |
|------|------|
| **URL** | https://docs.anthropic.com/ |
| **主题** | Claude API、Tool Use、提示工程 |
| **覆盖内容** | API 调用、Tool Use、Constitutional AI、生产部署 |
| **特点** | 官方权威、最佳实践、代码示例 |
| **适用人群** | 使用 Claude 的所有开发者 |

### 1.4 LangChain Academy (官方课程)

| 属性 | 内容 |
|------|------|
| **URL** | https://academy.langchain.com/ |
| **主题** | LangChain/LangGraph 系统课程 |
| **覆盖内容** | Agent 开发、RAG、内存管理、生产部署 |
| **特点** | 自学节奏、综合性强 |
| **适用人群** | 想要系统学习的开发者 |

### 1.5 CrewAI 官方文档

| 属性 | 内容 |
|------|------|
| **URL** | https://docs.crewai.com/ |
| **主题** | 多 Agent 协作框架 |
| **覆盖内容** | Agent 定义、Task 编排、Crew 协作、流程管理 |
| **特点** | Role-based 清晰、简洁 API、5 万星 |
| **适用人群** | 需要快速构建多 Agent 协作的团队 |

**代码示例**：

```python
from crewai import Agent, Task, Crew, Process

researcher = Agent(role="研究员", goal="收集信息", backstory="专业研究员")
crew = Crew(agents=[researcher], tasks=[task], process=Process.sequential)
result = crew.kickoff()
```

### 1.6 AutoGen (Microsoft) 官方文档

| 属性 | 内容 |
|------|------|
| **URL** | https://microsoft.github.io/autogen/ |
| **主题** | 微软多 Agent 对话框架 |
| **覆盖内容** | ConversableAgent、GroupChat、人机协作、工作流 |
| **特点** | 企业级支持、群组对话、AutoGen Studio |
| **适用人群** | 企业用户、微软生态集成 |

**架构特点**：

```
公司比喻：
- autogen-core = 公司基础设施（办公楼、通信、人事）
- Agent = 员工
- GroupChat = 会议室
- AutoGen Studio = 可视化管理界面
```

### 1.7 MCP 中文站教程

| 属性 | 内容 |
|------|------|
| **URL** | https://mcpcn.com/docs/tutorials/ |
| **主题** | MCP 中文教程 |
| **覆盖内容** | MCP 入门、服务器构建、客户端集成 |
| **特点** | 中文友好、实践导向 |
| **适用人群** | 中文开发者 |

### 1.8 LangChain 中文文档

| 属性 | 内容 |
|------|------|
| **URL** | https://langchain.com.cn/docs/introduction/ |
| **主题** | LangChain 中文教程 |
| **覆盖内容** | 入门、Agent、Chain、RAG |
| **特点** | 完整翻译、社区活跃 |
| **适用人群** | 中文开发者 |

### 1.9 菜鸟教程 LangChain/Python/AI Agent

| 属性 | 内容 |
|------|------|
| **URL** | https://www.runoob.com/langchain/langchain-tutorial.html |
| **主题** | LangChain 入门教程 |
| **覆盖内容** | 基础概念、工具使用、Agent 开发 |
| **特点** | 简明易懂、适合入门 |
| **适用人群** | 初学者 |

### 1.10 知乎/CSDN 技术深度文章

| 属性 | 内容 |
|------|------|
| **URL** | 多篇中文深度文章 |
| **主题** | Agent 架构、ReAct、CrewAI、AutoGen |
| **覆盖内容** | 框架对比、源码分析、实战经验 |
| **特点** | 中文原创内容丰富 |
| **适用人群** | 中文高级开发者 |

## 2. 关键主题覆盖情况

### 2.1 已覆盖主题（我们的文档）

| 主题 | 文档位置 | 覆盖程度 |
|------|----------|----------|
| ReAct 模式 | `react-pattern.md` | 完整（含变体、TypeScript/Python 实现） |
| MCP 集成 | `mcp-integration.md` | 完整（含 Python/TypeScript 服务端/客户端） |
| 工具调用模式 | `tool-patterns.md` | 完整（含沙箱、安全、错误处理） |
| 多模型集成 | `multi-model-integration.md` | 完整（含适配器、降级、熔断器） |
| 框架对比 | `agent-frameworks.md` | 完整（LangChain/AutoGen/CrewAI/Dify/Coze/LlamaIndex） |
| 记忆系统 | `memory-system.md` | 完整（短期/长期/情景/程序记忆） |
| 状态机模式 | `state-machine-patterns.md` | 完整 |
| 流式模式 | `streaming-patterns.md` | 完整 |
| Agent 对比分析 | `agent-comparison.md` | 完整 |
| Plan-Execute 模式 | `plan-execute-pattern.md` | 完整 |

### 2.2 未覆盖或覆盖不足的主题

| 缺失主题 | 重要性 | 说明 |
|----------|--------|------|
| **CrewAI Flows** | 高 | Flows 是 CrewAI 的高级编排功能，比基础的 Sequential/Hierarchical 更灵活 |
| **AutoGen Studio** | 中 | 微软的无代码多 Agent 原型工具，可视化工作流设计 |
| **LangGraph 高级特性** | 高 | Checkpointing（状态持久化）、Human-in-the-loop、Interrupt |
| **MCP 服务器生态** | 高 | 官方 100+ 服务器列表和使用方式（filesystem、github、brave-search 等） |
| **Agent 评估与测试** | 高 | LangSmith Eval、Agent 性能基准、回归测试 |
| **生产部署** | 高 | Docker 部署、监控、扩缩容、安全配置 |
| **AutoGen Code Executor** | 中 | 代码执行环境、沙箱、代码验证 |
| **LLM Observability** | 中 | LangSmith 完整使用、日志、追踪 |
| **Agent 安全审计** | 中 | 对抗性攻击检测、Prompt 注入防护 |
| **Multi-Agent 通信协议** | 中 | Agent 间消息格式、协议设计 |
| **Human-in-the-loop** | 中 | 人工介入机制、审批流程 |

## 3. 代码模式或示例缺失

### 3.1 LangGraph Checkpointing（状态持久化）

LangGraph 允许在执行过程中保存和恢复状态，用于中断恢复和调试。

```python
# LangGraph 持久化状态示例
from langgraph.checkpoint.memory import MemorySaver

# 编译时添加检查点
checkpointer = MemorySaver()
agent = workflow.compile(checkpointer=checkpointer)

# 线程化执行（支持中断恢复）
config = {"configurable": {"thread_id": "1"}}
result = agent.invoke({"messages": [...]}, config)

# 恢复并继续
result = agent.invoke(None, config)  # 从上一个状态继续
```

### 3.2 CrewAI Flows 编排

```python
# CrewAI Flows - 灵活的流程编排
from crewai.flow.flow import Flow, start, listen
from crewai.flow.orator import Orator

class ResearchFlow(Flow, Orator):
    @start()
    def fetch_data(self):
        # 起始节点
        return self.fetch_from_api()

    @listen(fetch_data)
    def analyze(self, data):
        # 监听上一个节点
        return self.analyze_results(data)

    @listen("analyze")
    def report(self, results):
        # 生成报告
        return self.generate_report(results)
```

### 3.3 MCP 服务器生态示例

```yaml
# 第 1 段：顶层容器（声明 MCP 服务器清单）
# MCP 服务器配置示例
# mcpServers 是宿主客户端（Claude Desktop 等）唯一扫描的约定键；其下的键名会成为工具名命名空间，
# 一旦改名，历史提示词/工具选择记录里的旧名就会失配，属于对外契约，非重构随意调整。
mcpServers:
  # 第 2 段：filesystem —— 本地文件读写，安全性靠目录白名单而非认证
  # stdio 传输的两要素：command 起进程、args 传参，随后用 stdin/stdout 跑 JSON-RPC；
  # `-y` 抑制 npx 的安装确认，代价是首次运行会联网取包，离线环境需预装或改用可执行文件绝对路径。
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed"]  # 末位路径即沙箱根：服务端只能看见它之下的文件，应替换为最小必要目录

  # 第 3 段：github —— 凭据走环境变量，避免明文入库
  # `${GITHUB_TOKEN}` 由客户端在加载配置时做占位符替换，因此仓库里只留引用、不落真实密钥；
  # 易错点：变量必须在启动图形客户端的那个环境里存在，终端 export 对已运行的 GUI 进程通常无效。
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}"  # 建议用细粒度 PAT 并只授予必需 scope，泄露时影响面可控

  # 第 4 段：brave-search —— 外部检索能力，成本与配额由第三方密钥决定
  # 与 github 同构：env 是进程级注入，子进程及其下游都能读到，故不要把同一变量复用于多个服务；
  # 边界条件：密钥缺失时进程往往能启动、直到首次调用才报错，排障时应优先看工具返回而非进程存活。
  brave-search:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-brave-search"]
    env:
      BRAVE_API_KEY: "${BRAVE_API_KEY}"  # 注意键名与 GitHub 的不同：服务端各自约定变量名，不可随意互换

  # 第 5 段：sqlite —— 单文件数据库，路径即可见性边界
  # DATABASE_PATH 以字面量写死（非 ${}），说明此处无需外部注入，但也意味着换环境要改配置；
  # 复杂度提示：该服务直接读写单个 .db 文件，无并发调度，多进程同时写入可能触发锁冲突。
  sqlite:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-sqlite"]
    env:
      DATABASE_PATH: "/path/to/database.db"  # 路径按子进程视角解析，需确保该进程对文件及其目录有读写权限
```
### 3.4 AutoGen GroupChat 机制

```python
# AutoGen 群组对话示例
from autogen import ConversableAgent, GroupChat, GroupChatManager

# 创建多个 Agent
coder = ConversableAgent(name="Coder", system_message="代码专家")
reviewer = ConversableAgent(name="Reviewer", system_message="代码评审")
manager = ConversableAgent(name="Manager", system_message="项目经理")

# 配置群组聊天
group_chat = GroupChat(
    agents=[coder, reviewer, manager],
    messages=[],
    max_round=10,
    speaker_selection_method="round_robin",  # 轮询选择
    allow_repeat_speaker=False,
)

manager = GroupChatManager(groupchat=group_chat)

# 启动群组对话
coder.initiate_chat(
    manager,
    message="实现一个排序算法"
)
```

### 3.5 LangSmith Evaluation（评估）

```python
# LangSmith 评估示例
from langsmith.evaluation import evaluate

def predict(inputs):
    # 预测函数
    return agent.run(inputs["question"])

# 定义评估器
evaluators = [
    # 准确性评估
    evaluate.get_dataset_evaluator(
        expected_outputs_dataset="ground_truth_dataset",
        evaluate_configs=[
            {"key": "accuracy", "evaluator": exact_match},
        ]
    ),
    # 毒性检测
    evaluate.get_string_evaluator(
        evaluate_configs=[{"key": "toxicity", "evaluator": toxicity_score}]
    ),
]

# 运行评估
results = evaluate(
    evaluators=evaluators,
    data="test_dataset",
    predict_runtime=60
)
```

### 3.6 Agent 监控与可观测性

```typescript
// Agent 监控实现
// 第 1 段：定义指标数据结构（约定监控系统对外暴露的"数据契约"）
// 为什么这样写：把"计数类"（请求/成功/失败）与"累计类"（token、工具调用）拆成不同字段，
// 是因为前者每次请求只 +1，后者需要按量累加，语义不同不能混用同一个累加器。
// 易错点：toolUsage 用 Record<string, number> 而非 Map，序列化成 JSON 时更友好，但键本身无约束。
interface AgentMetrics {
  requestCount: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  tokenUsage: { input: number; output: number };
  toolUsage: Record<string, number>;
}

// 第 2 段：监控器主体与其内部可变状态（真正的数据源）
// 为什么这样写：metrics 设为 private，外部只能通过 getMetrics() 拿到快照，
// 避免调用方绕过记录方法直接改字段，破坏"计数一致性"（如 success+failure != request）。
class AgentMonitor {
  private metrics: AgentMetrics = {
    requestCount: 0,
    successCount: 0,
    failureCount: 0,
    averageLatency: 0,
    tokenUsage: { input: 0, output: 0 },
    toolUsage: {},
  };

  // 第 3 段：记录单次请求的结果、token 消耗与延迟
  // 数据流：外部传入 duration(耗时)/success(成败)/tokens(用量) → 逐项累加进 metrics。
  // 易错点：tokens 声明为 any，运行时若为 undefined 或缺少字段，靠 `|| 0` 兜底，
  // 这是一种防御式写法，但也意味着字段写错不会报错，只会被静默计为 0。
  recordRequest(duration: number, success: boolean, tokens: any) {
    this.metrics.requestCount++;
    if (success) this.metrics.successCount++; // 成功/失败互斥，二者之和应恒等于 requestCount
    else this.metrics.failureCount++;

    this.metrics.tokenUsage.input += tokens.input || 0; // 累加输入 token，缺省按 0 处理
    this.metrics.tokenUsage.output += tokens.output || 0; // 累加输出 token，缺省按 0 处理

    // 更新平均延迟
    // 为什么这样写：采用"增量均值"公式而非保存所有样本再求和，空间复杂度 O(1)、无需历史数组。
    // 原理：设旧均值为 avg、旧样本数 n，新样本 x 加入后新均值 = (avg*n + x)/(n+1)。
    // 这里 requestCount 已自增，所以 (requestCount - 1) 正是旧样本数 n，等价于上面的推导。
    // 边界：首次请求时旧均值 0、旧数量 0，结果恰为 duration，逻辑自然成立，无需特判。
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.requestCount - 1) + duration) /
      this.metrics.requestCount;
  }

  // 第 4 段：按工具名做频次统计
  // 为什么这样写：用 `|| 0` 处理"首次出现"的键，避免 undefined + 1 = NaN；
  // 因为对象访问不存在的键返回 undefined，这是动态计数的常见陷阱。
  recordToolUsage(toolName: string) {
    this.metrics.toolUsage[toolName] = (this.metrics.toolUsage[toolName] || 0) + 1;
  }

  // 第 5 段：对外输出指标快照
  // 为什么这样写：返回 {...this.metrics} 是浅拷贝，切断外部对内部对象的引用，
  // 防止调用方拿到后直接改字段而污染监控状态；时间复杂度 O(字段数)。
  // 注意：这是浅拷贝，tokenUsage 与 toolUsage 仍是共享引用，
  // 若调用方深入修改嵌套对象仍会影响内部状态——需要更强隔离时应做深拷贝。
  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }
}
```
## 4. 建议新增文档

基于以上分析，建议新增以下文档：

### 4.1 高优先级

1. **LangGraph-advanced.md** - LangGraph 高级特性（Checkpointing、Human-in-the-loop、Interrupt）
2. **crewai-flows.md** - CrewAI Flows 高级编排教程
3. **autogen-groupchat.md** - AutoGen 群组对话和协作模式
4. **mcp-servers-ecosystem.md** - MCP 服务器生态（官方服务器列表、配置示例）
5. **agent-evaluation.md** - Agent 评估与测试（LangSmith Eval、性能基准）

### 4.2 中优先级

6. **agent-deployment.md** - Agent 生产部署指南（Docker、K8s、监控）
7. **agent-security.md** - Agent 安全最佳实践（对抗性攻击、Prompt 注入）
8. **agent-observability.md** - 可观测性实现（指标、日志、追踪）

## 5. 参考资源汇总表

| 类别 | 资源名称 | URL |
|------|----------|------|
| **LangChain** | 官方文档 | https://docs.langchain.com/ |
| **LangChain** | LangGraph 快速入门 | https://docs.langchain.com/oss/python/langgraph/quickstart |
| **LangChain** | Academy 课程 | https://academy.langchain.com/ |
| **LangChain** | 中文文档 | https://langchain.com.cn/docs/introduction/ |
| **MCP** | 官方文档 | https://modelcontextprotocol.io/ |
| **MCP** | 中文站 | https://mcpcn.com/ |
| **Anthropic** | Claude 开发者文档 | https://docs.anthropic.com/ |
| **AutoGen** | 官方文档 | https://microsoft.github.io/autogen/ |
| **CrewAI** | 官方文档 | https://docs.crewai.com/ |
| **CrewAI** | 中文站 | https://docs.crewai.org.cn/ |
| **LlamaIndex** | 官方文档 | https://docs.llamaindex.ai/ |
| **Dify** | 官方文档 | https://docs.dify.ai/ |
| **参考书籍** | Anthropic Cookbook | https://github.com/anthropics/anthropic-cookbook |

---

文档版本：v1.0 | 研究日期：2026-05-15

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [OWASP Top 10 最新版](https://owasp.org/Top10/) | 安全风险权威清单，逐条含描述、示例与预防，可直接落到项目基线。 | 按序读每项的描述与预防，边读边在项目中检索对应代码，整理成检查清单并标注责任人。 |
| [OWASP Top 10（项目页）](https://owasp.org/www-project-top-ten/) | 先看风险概述再对照自查，适合快速建立整体安全视角。 | 通读各类风险概述，读完立刻在项目里列出三个最可能命中的风险并排优先级。 |
| [CWE Top 25](https://cwe.mitre.org/top25/) | 弱点编号体系与 OWASP 互为补充，便于跟踪与检索。 | 与 OWASP Top 10 对照读，记下两者对应的编号映射，用于缺陷跟踪系统打标签。 |
| [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x00-header/) | API 专项风险清单，补足 Web 层面清单未覆盖的接口问题。 | 逐条审查自家 API 的鉴权、限流与对象级授权，边读边写修复项并指派跟进。 |
| [`top` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/top) | 定位属性的权威说明，含包含块等易错细节与浏览器行为。 | 重点读包含块与取值一节，带着“绝对定位相对谁”的疑问读，再回项目验证定位结果。 |
| [Top Level Await(TLA) in Rolldown](https://rolldown.rs/in-depth/tla-in-rolldown) | 构建工具层面的 TLA 官方说明，澄清模块加载与打包行为。 | 读 TLA 在打包中的处理一节，带着“为何打包报错”读，再到项目里替换一次动态导入。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [LeetCode Top Interview 经典题单（doocs 题解仓库）](https://github.com/doocs/leetcode) | 多语言题解可对照实现，是学习写法与命名的高质量示例库。 | 做完一道题后到仓库找同题题解，挑一个更简洁的写法重写并对比复杂度。 |
| [Add a hitmap on top of an image](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Add_a_hit_map_on_top_of_an_image) | 完整可运行的图像热区示例，演示属性与坐标的配合方式。 | 对照示例复现一遍热区，读 map 与 area 的属性说明，再为自己的图做一个小热区。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [渲染性能](https://web.dev/articles/rendering-performance) | 把渲染拆成布局、绘制、合成三阶段，动画性能问题讲得最透。 | 先读合成与图层一节，带着“动画为何卡顿”读；再把项目里用 top 的动画改写成 transform 验证。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 客服工单自动分类与回复草稿 | RAG、工具调用、人工确认 | 工单 API、向量检索、审核队列 | 不自动发送；权限过滤；记录修改率 |
| 代码仓库 Issue 自动定位 | 规划、工具调用、记忆 | 代码搜索、测试运行器、草稿 PR | 限制循环步数；不自动合并；仓库权限 |
| 数据分析师自然语言取数 | RAG、工具调用、输出校验 | 指标字典、只读 SQL、审计日志 | 只读校验；行列级权限；返回 SQL |
| 运维告警根因初筛 | Agent 循环、工具调用、评测 | 监控查询、日志检索、值班系统 | 只做初筛；保留原始告警；人工确认 |
| 合同条款审阅与风险标注 | RAG、结构化输出、人工确认 | 条款库、规则引擎、标注界面 | 不替代法务；版本留痕；引用原文 |
| 会议纪要行动项抽取 | 结构化输出、记忆 | 转录、日历 API、任务系统 | 不自动派发；说话人确认；隐私 |
| 低代码平台表单生成 | 规划、工具调用、校验 | 表单 Schema、组件库、预览沙箱 | 生成后校验；不直接发布；回滚 |
| 招聘简历初筛 | RAG、结构化输出、评测 | 简历解析、岗位描述、评分卡 | 公平性审计；人工复核；不留存敏感 |
| 电商订单异常排查 | 工具调用、多步规划 | 订单查询、支付网关、日志 | 只读查询；金额修改转人工；超时 |

### 三个场景拆解

#### 场景 1：客服工单自动分类与回复草稿

**业务背景**：客服每天收到工单，分类和首轮回复占用人力。促销期工单量是平日的数倍，规则维护成本随业务线增加。测量方法：用近 30 天工单创建时间统计。

**怎么用本页知识解决**：思路是先检索知识库，再让 Agent 规划只读工具调用，最后把草稿放入审核队列。

```python
def handle_ticket(ticket):
    ctx = retrieve_kb(ticket.text, top_k=5)        # 检索知识库片段，限制 5 条
    plan = llm_plan(ticket.text, ctx)              # 让模型输出步骤和工具名
    if plan.risk == "high":                        # 高风险工单直接转人工
        return handoff(ticket, reason="high_risk")
    facts = run_tools(plan.tools, ticket)          # 调用订单查询等只读工具
    draft = llm_draft(ticket.text, ctx, facts)     # 生成回复草稿，不发送
    return review_queue(draft, ctx)                # 草稿连引用一起进入审核队列
```

- retrieve_kb 先限定知识库范围，按用户权限过滤。
- llm_plan 只输出工具名与参数，不执行写操作。
- run_tools 只调用只读接口，设置超时和重试上限。
- llm_draft 要求引用 ctx 中的片段编号。
- review_queue 保存草稿与引用，供人工修改或丢弃。

**怎么度量收益**：看草稿采纳率、人工修改字数、首响时长。测量方法是工单系统埋点记录草稿状态，用 Prometheus Histogram 记录 handle_ticket 耗时，用离线标注集计算分类准确率，再在 Grafana 看板观察趋势。

**什么时候不该用**：
- 工单全部是固定模板，规则引擎已覆盖分类和回复。
- 合规要求禁止把工单正文发送给外部模型，且没有本地部署条件。
- 审核人力不足，草稿进入队列后无人处理。

#### 场景 2：代码仓库 Issue 自动定位与修复建议

**业务背景**：仓库 Issue 数量随版本发布波动，新成员定位代码慢。维护者重复回答相同问题，发布后一周新增量高于平日。测量方法：用仓库 Issue 创建时间统计。

**怎么用本页知识解决**：思路是先检索代码和相似 Issue，再让 Agent 分步搜索、读文件、跑测试，输出草稿 PR 或评论，不自动合并。

```python
def triage_issue(issue):
    files = search_code(issue.title, issue.body)   # 先检索候选文件
    plan = llm_plan(issue, files)                  # 规划查看符号与调用链
    for step in plan.steps[:5]:                    # 限制最多 5 步，防无限循环
        obs = run_tool(step.tool, step.args)       # 执行搜索、读文件、跑测试
        if obs.done: break                         # 找到可疑位置就停止
    patch = llm_patch(issue, obs)                  # 生成补丁建议，不合并
    return open_pr_draft(patch)                    # 创建草稿 PR 或评论
```

- search_code 只返回候选文件，不读取整个仓库。
- plan.steps[:5] 限制探索步数，控制延迟和成本。
- run_tool 在沙箱内执行，测试命令使用白名单。
- llm_patch 输出 diff，附带引用文件和行号。
- open_pr_draft 只创建草稿，等待人工审核。

**怎么度量收益**：看定位命中率、草稿 PR 采纳率、工具失败率。测量方法是用离线 Issue 集计算 Top-5 文件中包含真实修改文件的比例，用 OpenTelemetry 记录每次工具调用的 span，用 pytest 在 CI 运行测试。

**什么时候不该用**：
- 仓库没有测试，补丁无法验证。
- Issue 涉及权限、法律或商业决策，不能由模型给结论。
- 代码禁止离开内网，且没有本地模型与沙箱。
- 安全关键模块需要专家评审。

#### 场景 3：数据分析师自然语言取数

**业务背景**：业务方频繁问指标，分析师重复写 SQL，口径散落在文档和代码。季度复盘时提问量集中上升。测量方法：统计提问频道消息量。

**怎么用本页知识解决**：思路是先用指标字典确认口径，再检索表结构，生成只读 SQL，在只读副本执行，返回 SQL 和结果。

```python
def answer_metric(question):
    metric = lookup_metric(question)              # 查指标字典，确认口径
    schema = retrieve_schema(metric.tables)       # 只取相关表结构
    sql = llm_sql(question, metric, schema)       # 生成只读 SQL
    if not is_readonly(sql):                      # 拒绝写操作和多语句
        return refuse("只允许只读查询")
    rows = run_sql_readonly(sql, timeout=10)      # 只读副本执行，设超时
    return {"sql": sql, "rows": rows}             # 同时返回 SQL 便于复核
```

- lookup_metric 优先匹配已有指标，避免重复定义。
- retrieve_schema 只取相关表，减少提示长度。
- is_readonly 用解析器检查，拒绝 INSERT、UPDATE、DELETE。
- run_sql_readonly 在只读副本执行，设置超时和行数上限。
- 返回 SQL，业务方和分析师可以复核。

**怎么度量收益**：看 SQL 采纳率、查询错误率、人工修正率。测量方法是用审计日志记录 SQL 与执行状态，用数据库慢查询日志观察超时，用 Prometheus Counter 统计拒绝次数，在 Grafana 看板对比周趋势。

**什么时候不该用**：
- 没有指标字典，口径未统一。
- 数据权限未接入行列级控制。
- 问题需要写入或修改数据。
- 结果直接用于自动决策，无人复核。

### 行业先进实践

- ReAct 循环（出处：LangChain 官方文档）。做法是让模型交替输出推理与工具调用，观察结果后再决定下一步。这样把推理和行动分开记录，便于调试与评测。项目借鉴时先定义工具白名单，再限制循环步数。
- 工具调用使用 JSON Schema（出处：OpenAI 官方文档）。做法是用 JSON Schema 描述函数参数，模型返回结构化调用。这样减少自由文本解析错误，便于校验必填字段。项目借鉴时为每个工具写 schema、错误返回和超时。
- 人工确认高危操作（出处：LangGraph 官方文档）。做法是在图执行到敏感节点前中断，等待人工批准后继续。这样把不可逆操作留给人工，降低误操作。项目借鉴时在写操作、付款、发邮件前设置确认节点。
- 检索增强生成（出处：LlamaIndex 官方文档）。做法是先检索外部知识，再让模型基于片段生成答案。这样答案可引用来源，减少模型凭记忆编造。项目借鉴时让检索结果带来源 ID，生成要求引用。
- 可观测性追踪（出处：OpenTelemetry 官方文档）。做法是为每次模型调用和工具调用记录 span、输入输出和延迟。这样能定位失败步骤，比较版本差异。项目借鉴时给每次请求加 trace_id，日志与指标关联。

### 从学到用：落地路线

1. 试点：选只读、低风险、有审核的流程，例如工单分类草稿。验收标准：50 条历史工单上产生草稿，且不自动发送。
2. 验证：用固定评测集对比规则或人工基线，记录准确率、工具失败率、单次耗时。验收标准：评测脚本一条命令运行，报告可复现。
3. 推广：把工具 schema、提示模板、评测集做成仓库模板，新场景先复用。验收标准：第二个场景通过同一套检查表再上线。
4. 防回退：把评测集和阈值加入 CI，每次改提示或换模型都跑回归。验收标准：回归失败阻止发布，人工审批后才可放行。

### 动手作业

**目标**：为本地 Markdown 文档做带引用的问答 Agent，不编造答案。

**步骤**：
1. 准备 20 篇 Markdown 文档，放在 `docs/` 目录。
2. 实现 `retrieve(query, top_k=5)`，返回片段和来源文件名。
3. 写提示词：只依据片段回答，每个结论给来源编号。
4. 加拒答规则：检索为空或最高相似度低于阈值时返回“无法回答”。
5. 写 30 条评测问题，标注可回答与不可回答。
6. 运行评测，记录引用命中率、拒答准确率、耗时。
7. 把脚本和评测集提交到仓库，写运行说明。

**验收标准**：
- 30 条评测集中，可回答问题的引用编号指向正确文档。
- 不可回答问题返回拒答，不给出文档中不存在的结论。
- 每次回答展示来源片段 ID 和文件名。
- 运行一条命令完成评测并输出报告。
- 日志记录 query、top_k、耗时、是否拒答。

