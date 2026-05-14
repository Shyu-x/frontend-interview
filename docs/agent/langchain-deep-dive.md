# LangChain 深度指南

LangChain 是一个用于构建 LLM 应用的强大框架，提供了组件化、可组合的抽象，使开发者能够快速构建复杂的 AI 应用。本文深入探讨 LangChain 的核心概念、架构和使用方法。

---

## 目录

<!--toc-->
1. [LangChain 核心概念](#1-langchain-核心概念)
2. [工具系统 (Tools)](#2-工具系统-tools)
3. [Agent 架构](#3-agent-架构)
4. [内存系统 (Memory)](#4-内存系统-memory)
5. [向量存储和 RAG](#5-向量存储和-rag)
6. [Callbacks 和监控](#6-callbacks-和监控)
<!--toc-->

---

## 1. LangChain 核心概念

### 1.1 LCEL (LangChain Expression Language)

LCEL 是 LangChain 的核心表达式语言，提供了一种声明式的方式来组合 LangChain 组件。它使得构建和处理链变得直观且易于理解。

#### 基础语法

LCEL 使用 `|` (管道) 操作符将组件串联起来，每个组件的输出自动成为下一个组件的输入。

**Python 示例：基础链式调用**

```python
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser

# 初始化模型
llm = ChatOpenAI(model="gpt-4", temperature=0)

# 定义提示模板
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一位专业的技术文档写作助手"),
    ("human", "用简洁的语言解释以下概念：{concept}")
])

# 创建链：prompt -> llm -> output_parser
chain = prompt | llm | StrOutputParser()

# 调用链
result = chain.invoke({"concept": "什么是 LCEL"})
print(result)
```

**TypeScript 示例**

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const llm = new ChatOpenAI({
  model: "gpt-4",
  temperature: 0,
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一位专业的技术文档写作助手"],
  ["human", "用简洁的语言解释以下概念：{concept}"],
]);

const chain = prompt.pipe(llm).pipe(new StringOutputParser());

const result = await chain.invoke({ concept: "什么是 LCEL" });
console.log(result);
```

#### Runnable 接口

LCEL 的核心是 `Runnable` 接口，所有组件都实现了这个接口：

```python
from langchain.schema.runnable import Runnable

# Runnable 的核心方法
class Runnable:
    def invoke(self, input: Any) -> Any:
        """同步调用"""
        pass
    
    async def ainvoke(self, input: Any) -> Any:
        """异步调用"""
        pass
    
    def batch(self, inputs: List[Any]) -> List[Any]:
        """批量同步调用"""
        pass
    
    async def abatch(self, inputs: List[Any]) -> List[Any]:
        """批量异步调用"""
        pass
    
    def stream(self, input: Any):
        """流式输出"""
        pass
```

#### 并行执行

LCEL 支持并行执行多个分支：

```python
from langchain.schema.runnable import RunnableParallel

# 创建并行分支
branch = RunnableParallel(
    summary=summary_chain,
    analysis=analysis_chain,
    keywords=keyword_chain
)

# 同时执行三个链
result = branch.invoke({"text": long_document})
# result = {"summary": "...", "analysis": "...", "keywords": [...]}
```

#### 条件路由

```python
from langchain.schema.runnable import RunnableBranch

router = RunnableBranch(
    (lambda x: "代码" in x["query"], code_chain),
    (lambda x: "数学" in x["query"], math_chain),
    general_chain  # 默认链
)

result = router.invoke({"query": "如何用 Python 写快速排序"})
```

#### 配置和别名

```python
# 为链中的组件添加别名
chain = (
    ChatPromptTemplate.from_template("{question}")
    | llm.with_config({"run_name": "QuestionAnswerer"})
    | StrOutputParser()
)

# 使用 config 覆盖配置
result = chain.invoke(
    {"question": "什么是 AI?"},
    config={"metadata": {"user_id": "123"}, "tags": ["qa"]}
)
```

### 1.2 Chains 类型

LangChain 提供了多种预构建的 Chain 类型，适用于不同场景。

#### LLMChain

最基础的链类型，将提示模板与 LLM 结合：

```python
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

llm = ChatOpenAI(model="gpt-4")

# 创建 LLMChain
chain = LLMChain(
    llm=llm,
    prompt=PromptTemplate.from_template(
        "将以下中文翻译成英文：{text}"
    ),
    output_key="translation"  # 自定义输出键名
)

result = chain.run("你好，世界")
print(result)  # Hello, World
```

#### ConversationChain

专门用于对话场景的链：

```python
from langchain.chains import ConversationChain

conversation = ConversationChain(
    llm=llm,
    memory=ConversationMemory(),
    verbose=True
)

response = conversation.run("我叫张三")
print(response)  # 你好，张三！很高兴认识你。

response = conversation.run("我叫什么名字？")
print(response)  # 你叫张三。
```

#### RetrievalQA

用于 RAG（检索增强生成）的链：

```python
from langchain.chains import RetrievalQA
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

# 创建向量存储
vectorstore = Chroma.from_documents(documents, OpenAIEmbeddings())
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# 创建 RetrievalQA 链
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",  # 或 "map_reduce", "refine", "map_rerank"
    retriever=retriever,
    return_source_documents=True
)

result = qa_chain({"query": "LangChain 的核心概念是什么？"})
```

#### 链的类型对比

| 链类型 | 适用场景 | 特点 |
|--------|----------|------|
| `LLMChain` | 通用场景 | 最基础的链，灵活度高 |
| `ConversationChain` | 对话系统 | 内置对话内存管理 |
| `RetrievalQA` | RAG 应用 | 集成向量检索能力 |
| `SequentialChain` | 多步骤处理 | 按顺序执行多个链 |
| `TransformChain` | 数据转换 | 自定义转换逻辑 |

#### SequentialChain（顺序链）

```python
from langchain.chains import SequentialChain

# 第一个链：翻译
chain1 = LLMChain(
    llm=llm,
    prompt=PromptTemplate.from_template("翻译成英文：{text}"),
    output_key="english_text"
)

# 第二个链：总结
chain2 = LLMChain(
    llm=llm,
    prompt=PromptTemplate.from_template("总结以下文本：{english_text}"),
    output_key="summary"
)

# 组合顺序链
sequential_chain = SequentialChain(
    chains=[chain1, chain2],
    input_variables=["text"],
    output_variables=["english_text", "summary"],
    verbose=True
)

result = sequential_chain({"text": "LangChain 是一个强大的 AI 框架"})
```

### 1.3 Prompts 和 Output Parsers

#### Prompt 模板

**ChatPromptTemplate**

```python
from langchain.prompts import ChatPromptTemplate

# 消息式模板
template = ChatPromptTemplate.from_messages([
    ("system", "你是一个{character}，回答问题要{style}。"),
    ("human", "{question}"),
    ("ai", "{previous_answer}"),  # 可选的对话历史
    ("human", "请用更简单的方式解释")
])

prompt = template.invoke({
    "character": "老师",
    "style": "生动有趣",
    "question": "什么是量子计算",
    "previous_answer": "量子计算是一种..."
})
```

**PromptTemplate**

```python
from langchain.prompts import PromptTemplate

template = PromptTemplate.from_template("""
请分析以下产品的优缺点：

产品名称：{product_name}
产品类别：{category}
目标用户：{target_audience}

请从以下几个方面进行分析：
1. 功能特性
2. 用户体验
3. 价格定位
4. 竞争优势
""")

prompt = template.invoke({
    "product_name": "iPhone 15",
    "category": "智能手机",
    "target_audience": "追求高端体验的消费者"
})
```

**Few-shot 提示**

```python
from langchain.prompts import FewShotPromptTemplate

examples = [
    {"input": "今天天气真好", "output": "sentiment: positive"},
    {"input": "这个产品太差了", "output": "sentiment: negative"},
    {"input": "味道一般般", "output": "sentiment: neutral"}
]

example_template = PromptTemplate.from_template(
    "输入: {input}\n输出: {output}"
)

prompt = FewShotPromptTemplate(
    examples=examples,
    example_prompt=example_template,
    prefix="判断以下句子的情感倾向：",
    suffix="输入: {sentence}\n输出:",
    input_variables=["sentence"]
)
```

#### Output Parsers

**StrOutputParser**

```python
from langchain.schema.output_parser import StrOutputParser

chain = prompt | llm | StrOutputParser()
result = chain.invoke({...})
# result 是字符串类型
```

**Pydantic Output Parser**

```python
from pydantic import BaseModel, Field
from langchain.output_parsers import PydanticOutputParser

class ProductInfo(BaseModel):
    name: str = Field(description="产品名称")
    price: float = Field(description="产品价格")
    features: list[str] = Field(description="产品特性列表")
    rating: float = Field(description="用户评分 1-5")

parser = PydanticOutputParser(pydantic_object=ProductInfo)

# 自动生成格式说明
format_instructions = parser.get_format_instructions()
# 请输出一个包含以下字段的 JSON 对象：
# - name: str
# - price: float
# - features: list[str]
# - rating: float (范围 1-5)

chain = prompt | llm | parser
result = chain.invoke({...})
# result 是 ProductInfo 实例
```

**JSON Output Parser**

```python
from langchain.output_parsers import JsonOutputParser

chain = prompt | llm | JsonOutputParser()
result = chain.invoke({...})
# result 是字典类型
```

**CommaSeparatedListOutputParser**

```python
from langchain.output_parsers import CommaSeparatedListOutputParser

parser = CommaSeparatedListOutputParser()

chain = prompt | llm | parser
result = chain.invoke({...})
# result = ["item1", "item2", "item3"]
```

---

## 2. 工具系统 (Tools)

### 2.1 内置工具

LangChain 提供了丰富的内置工具，覆盖搜索、计算、网络请求等常见场景。

**搜索工具**

```python
from langchain_community.tools import DuckDuckGoSearchRun

search = DuckDuckGoSearchRun()
result = search.invoke("LangChain 教程 2024")
```

**计算工具**

```python
from langchain.tools import Calculator

calculator = Calculator()
result = calculator.invoke("(15 + 25) * 3 / 4")
# result = 30.0
```

**维基百科工具**

```python
from langchain_community.tools import WikipediaQueryRun

wiki = WikipediaQueryRun()
result = wiki.invoke("Python 编程语言")
```

**文件操作工具**

```python
from langchain.tools import FileReadTool, WriteFileTool

read_tool = FileReadTool()
write_tool = WriteFileTool()

content = read_tool.invoke("path/to/file.txt")
write_tool.invoke({"file_path": "output.txt", "text": "新内容"})
```

### 2.2 自定义工具创建

使用 `@tool` 装饰器可以快速创建自定义工具：

**Python 自定义工具**

```python
from langchain.tools import tool
from datetime import datetime

@tool
def get_current_time(format: str = "%Y-%m-%d %H:%M:%S") -> str:
    """获取当前时间。
    
    Args:
        format: 时间格式，默认为 ISO 格式
        
    Returns:
        格式化后的时间字符串
    """
    return datetime.now().strftime(format)

@tool
def calculate(expression: str) -> str:
    """执行数学计算表达式。
    
    Args:
        expression: 数学表达式，如 "2 + 2" 或 "sqrt(16)"
        
    Returns:
        计算结果
    """
    try:
        # 安全计算（生产环境应使用安全的评估器）
        result = eval(expression, {"__builtins__": {}}, {
            "sqrt": __import__("math").sqrt,
            "sin": __import__("math").sin,
            "cos": __import__("math").cos,
        })
        return str(result)
    except Exception as e:
        return f"计算错误: {str(e)}"

@tool
def get_weather(location: str, unit: str = "celsius") -> str:
    """获取指定地点的天气信息。
    
    Args:
        location: 地点名称或城市名
        unit: 温度单位，"celsius" 或 "fahrenheit"
        
    Returns:
        天气信息描述
    """
    # 实际应用中这里会调用天气 API
    return f"{location} 今天的天气晴朗，温度 25°C"
```

**TypeScript 自定义工具**

```typescript
import { tool } from "langchain/core/tools";
import { z } from "zod";

const getCurrentTime = tool(
  async ({ format = "%Y-%m-%d %H:%M:%S" }) => {
    return new Date().toLocaleString("zh-CN", { format });
  },
  {
    name: "get_current_time",
    description: "获取当前时间",
    schema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          description: "时间格式",
          default: "%Y-%m-%d %H:%M:%S",
        },
      },
    },
  }
);

const getWeather = tool(
  async ({ location, unit = "celsius" }) => {
    return `${location} 今天晴朗，温度 25°C`;
  },
  {
    name: "get_weather",
    description: "获取指定地点的天气信息",
    schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "地点名称" },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "温度单位",
          default: "celsius",
        },
      },
      required: ["location"],
    },
  }
);
```

**StructuredTool 基类**

对于更复杂的需求，可以继承 `StructuredTool`：

```python
from langchain.tools import StructuredTool
import httpx

def fetch_webpage(url: str, selector: str = None) -> str:
    """从网页获取内容"""
    response = httpx.get(url)
    if selector:
        # 使用选择器提取特定内容
        from selectolax.parser import HTMLParser
        tree = HTMLParser(response.text)
        return tree.css_first(selector).text()
    return response.text[:1000]

web_tool = StructuredTool.from_function(
    func=fetch_webpage,
    name="fetch_webpage",
    description="从指定 URL 获取网页内容",
    args_schema={
        "url": {"type": "string", "description": "网页 URL"},
        "selector": {
            "type": "string",
            "description": "CSS 选择器（可选）",
            "default": None
        }
    }
)
```

### 2.3 工具绑定和调用

#### bind_tools 方法

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4-turbo")

# 绑定工具到 LLM
llm_with_tools = llm.bind_tools([get_current_time, get_weather])

# LLM 会根据上下文决定是否调用工具
response = llm_with_tools.invoke("现在几点了？北京天气怎么样？")
```

**强制使用特定工具**

```python
# 强制模型使用特定工具
llm_with_tools = llm.bind_tools(
    [get_current_time],
    tool_choice="get_current_time"  # 强制调用此工具
)
```

#### ToolCall 序列化

```python
from langchain_core.utils.json import parse.tool_calls

# 处理工具调用
for tool_call in response.tool_calls:
    print(f"工具名称: {tool_call['name']}")
    print(f"参数: {tool_call['args']}")
    
    # 同步执行
    result = tool_call.invoke(tool_call['args'])
    
    # 创建 ToolMessage
    from langchain_core.messages import ToolMessage
    messages.append(ToolMessage(
        content=str(result),
        tool_call_id=tool_call['id']
    ))
```

### 2.4 ToolNode 和 ToolMessage

#### ToolMessage

```python
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

# AI 消息包含工具调用
ai_message = AIMessage(content="", tool_calls=[{
    "name": "get_weather",
    "args": {"location": "北京"},
    "id": "call_abc123"
}])

# 创建工具结果消息
tool_result = ToolMessage(
    content="北京今天晴朗，温度 25°C",
    tool_call_id="call_abc123",  # 必须与 AI 消息中的 id 匹配
    name="get_weather"
)

# 完整的消息流
messages = [
    HumanMessage(content="北京天气怎么样？"),
    ai_message,
    tool_result
]
```

#### ToolNode

```python
from langchain_prebuilt import ToolNode

# 从工具列表创建 ToolNode
tools = [get_current_time, get_weather]
tool_node = ToolNode(tools)

# 处理消息流中的工具调用
# ToolNode 会自动识别 AIMessage 中的 tool_calls
# 执行相应工具并返回 ToolMessage

result_messages = tool_node.invoke(messages)
# 返回包含 ToolMessage 的消息列表
```

#### 完整工具调用流程

```python
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain_prebuilt import ToolNode

llm = ChatOpenAI(model="gpt-4-turbo")
tools = [get_current_time, get_weather]
tool_node = ToolNode(tools)

# 绑定工具
llm_with_tools = llm.bind_tools(tools)

def call_with_tools(user_message: str):
    messages = [HumanMessage(content=user_message)]
    
    # 第一轮：LLM 决定是否调用工具
    ai_message = llm_with_tools.invoke(messages)
    messages.append(ai_message)
    
    # 如果有工具调用，执行工具
    if ai_message.tool_calls:
        tool_messages = tool_node.invoke(messages)
        messages.extend(tool_messages)
        
        # 第二轮：LLM 根据工具结果生成最终回复
        final_response = llm_with_tools.invoke(messages)
        return final_response.content
    
    return ai_message.content

result = call_with_tools("现在北京时间多少？北京天气如何？")
```

---

## 3. Agent 架构

### 3.1 ReAct Agent

ReAct (Reasoning + Acting) 是一种将推理和行动结合的 Agent 范式。

```python
from langchain.agents import AgentType, initialize_agent
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4-turbo")

# 创建 ReAct Agent
agent = initialize_agent(
    tools=[get_current_time, get_weather, search],
    llm=llm,
    agent=AgentType.CHAT_CONVERSATIONAL_REACT_DESCRIPTION,
    verbose=True,
    max_iterations=10,  # 最大迭代次数
    max_execution_time=60  # 最大执行时间（秒）
)

# 运行 Agent
result = agent.run("帮我查一下北京今天的天气，然后告诉我现在是几点？")
```

**ReAct 的工作流程**

```
1. Thought: 分析当前情况，决定下一步行动
2. Action: 选择并调用合适的工具
3. Observation: 观察工具返回的结果
4. (重复直到得到最终答案)
```

**自定义 ReAct Agent**

```python
from langchain.agents import Agent, AgentExecutor
from langchain.agents.structured_chat.base import StructuredChatAgent
from langchain.tools import Tool
from langchain_core.prompts import PromptTemplate

prompt = PromptTemplate.from_template("""
你是一个智能助手，可以通过工具来回答问题。

可用的工具：
{tools}

工具描述：
{tool_descriptions}

对话历史：
{chat_history}

当前消息：{input}

{agent_scratchpad}  # Agent 的思考过程
""")

agent = StructuredChatAgent(
    llm=llm,
    tools=tools,
    prompt=prompt
)

agent_executor = AgentExecutor.from_agent_and_tools(
    agent=agent,
    tools=tools,
    verbose=True,
    max_iterations=10
)
```

### 3.2 Plan-and-Execute Agent

Plan-and-Execute 模式先规划后执行，适合复杂任务。

```python
from langchain_experimental.plan_and_execute import (
    PlanAndExecute,
    load_agent_executor,
    load_chat_planner
)

# 创建规划器（使用 LLM）
planner = load_chat_planner(llm)

# 创建执行器
executor = load_agent_executor(
    llm=llm,
    tools=tools,
    verbose=True
)

# 创建 Plan-and-Execute Agent
agent = PlanAndExecute(
    planner=planner,
    executor=executor,
    verbose=True,
    max_iterations=5
)

# 执行复杂任务
result = agent.run("""
帮我完成以下任务：
1. 搜索最新的 AI 新闻
2. 找出最热门的 3 条
3. 用中文总结给我
""")
```

**工作流程**

```
Plan-and-Execute:
┌─────────────────────────────────────────────────┐
│  1. PLANNING: LLM 生成执行计划                  │
│     ┌─────────┐                                  │
│     │ Step 1  │ 搜索 AI 新闻                     │
│     │ Step 2  │ 筛选热门新闻                     │
│     │ Step 3  │ 翻译总结                         │
│     └─────────┘                                  │
│                                                  │
│  2. EXECUTION: 按计划执行每个步骤               │
│     执行 Step 1 → 执行 Step 2 → 执行 Step 3    │
│                                                  │
│  3. RESPONSE: 返回最终结果                      │
└─────────────────────────────────────────────────┘
```

### 3.3 自定义 Agent

**自定义 Agent 类**

```python
from langchain.agents import Agent
from langchain_core.prompts import StringPromptTemplate
from langchain_core.utils.input import get_color_mapping

class CustomAgent(Agent):
    """自定义 Agent，实现特定行为"""
    
    @property
    def observation_prefix(self) -> str:
        return "观察: "
    
    @property
    def agent_loop_suffix(self) -> str:
        return "我需要决定下一步怎么做："
    
    @property
    def suffix(self) -> str:
        return """
请以以下格式回答：

思考：你对这个问题的分析
行动：选择使用的工具（如果没有合适的工具，选择 "Final Answer"）
行动输入：工具的输入参数（如果没有，选择 ""）
观察：工具返回的结果
...（重复上述步骤直到完成任务）
最终答案：[你的最终回答]
"""
    
    def _get_default_prompt_prefix(self) -> str:
        return """你是一个专业的研究助手。
你的目标是帮助用户深入分析和解答问题。
请始终保持客观和准确性。"""

class CustomPromptTemplate(StringPromptTemplate):
    def format(self, **kwargs) -> str:
        # 自定义提示格式化逻辑
        kwargs["tools"] = "\n".join([
            f"{tool.name}: {tool.description}" 
            for tool in kwargs.get("tools", [])
        ])
        kwargs["tool_names"] = ", ".join([
            tool.name for tool in kwargs.get("tools", [])
        ])
        return super().format(**kwargs)
```

**使用自定义提示模板**

```python
from langchain.agents import initialize_agent

prompt_template = CustomPromptTemplate(
    input_variables=["input", "tool_names", "tools", "chat_history"],
    template="""...your template here..."""
)

agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
    prompt=prompt_template,
    verbose=True
)
```

### 3.4 AgentExecutor

AgentExecutor 是 Agent 的运行时，负责执行 Agent 决策的循环。

```python
from langchain.agents import AgentExecutor

# AgentExecutor 配置选项
executor = AgentExecutor.from_agent_and_tools(
    agent=agent,
    tools=tools,
    verbose=True,                    # 输出详细日志
    max_iterations=10,               # 最大迭代次数
    max_execution_time=120,          # 最大执行时间（秒）
    early_stopping_method="force",   # 或 "generate"
    return_intermediate_steps=True,  # 返回中间步骤
    handle_parsing_errors=True      # 处理解析错误
)

# 执行并获取中间步骤
result = executor.invoke({
    "input": "帮我查一下...",
    "chat_history": []
})

print("最终答案:", result["output"])
print("中间步骤:", result["intermediate_steps"])
```

**错误处理**

```python
# 自定义错误处理函数
def handle_error(error):
    return f"遇到错误: {str(error)}, 请调整策略后重试。"

executor = AgentExecutor.from_agent_and_tools(
    agent=agent,
    tools=tools,
    handle_parsing_errors=handle_error,
    max_retries=3  # 单个步骤最大重试次数
)
```

**流式执行**

```python
# 流式输出 Agent 执行过程
for event in executor.stream({"input": "你的问题"}):
    if "agent" in event:
        print("Agent 思考:", event["agent"]["output"])
    if "tools" in event:
        print("工具执行:", event["tools"])
```

---

## 4. 内存系统 (Memory)

### 4.1 BufferMemory

最基础的内存类型，保存完整的对话历史。

```python
from langchain.memory import BufferMemory
from langchain.chains import ConversationChain
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4")

# 创建 BufferMemory
memory = BufferMemory(
    ai_prefix="AI助手",           # AI 消息的前缀
    human_prefix="用户",          # 人类消息的前缀
    memory_key="history",         # 在 prompt 中引用的键名
    output_key="response"         # 输出键名
)

# 创建对话链
conversation = ConversationChain(
    llm=llm,
    memory=memory,
    verbose=True
)

# 对话
conversation.run("我叫张三，今年 25 岁")
conversation.run("我叫什么名字？")
# 输出: 你叫张三

# 查看内存内容
print(memory.chat_memory.messages)
```

### 4.2 ConversationBufferWindowMemory

滑动窗口内存，只保留最近 N 条对话。

```python
from langchain.memory import ConversationBufferWindowMemory

# 只保留最近 3 轮对话
memory = ConversationBufferWindowMemory(
    k=3,                          # 保留的对话轮数
    ai_prefix="AI",
    human_prefix="Human",
    return_messages=True          # 返回消息对象而非字符串
)

# 自动管理对话历史
for i in range(10):
    memory.save_context(
        {"input": f"问题 {i}"},
        {"output": f"回答 {i}"}
    )

# 只保留最近 3 轮
print(len(memory.chat_memory.messages))  # 6 (3 轮 x 2)
```

### 4.3 SummaryMemory

摘要内存，定期将对话历史压缩成摘要。

```python
from langchain.memory import ConversationSummaryMemory

memory = ConversationSummaryMemory(
    llm=llm,                      # 用于生成摘要的 LLM
    buffer="",                    # 初始内容
    chat_memory=chat_memory,      # 可选：关联现有 chat memory
    max_token_limit=1000          # 触发摘要的 token 阈值
)

# 自动生成摘要
memory.save_context(
    {"input": "今天天气真好"},
    {"output": "是啊，阳光明媚很适合出门。"}
)

# 获取摘要
summary = memory.load_memory_variables({})
print(summary["history"])
```

### 4.4 VectorStoreRetrieverMemory

向量存储记忆，支持语义搜索历史对话。

```python
from langchain.memory import VectorStoreRetrieverMemory
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

# 创建向量存储
vectorstore = Chroma.from_texts(
    texts=["初始对话..."],
    embedding=OpenAIEmbeddings()
)

# 创建检索器
retriever = vectorstore.as_retriever(
    search_kwargs={"k": 3}  # 检索最近 3 条相关记忆
)

# 创建 VectorStoreRetrieverMemory
memory = VectorStoreRetrieverMemory(
    retriever=retriever,
    memory_key="chat_history",
    input_key="input"  # 用于检索的输入键
)

# 保存对话
memory.save_context(
    {"input": "我喜欢吃川菜"},
    {"output": "川菜确实很好吃，麻辣鲜香是它的特点。"}
)

# 检索相关记忆
relevant = memory.load_memory_variables({
    "input": "什么菜系是麻辣的？"
})
print(relevant["chat_history"])
# 输出: 关于川菜的对话
```

### 4.5 多种内存组合

```python
from langchain.memory import CombinedMemory

# 组合多种内存
memory = CombinedMemory(
    memories=[
        ConversationBufferWindowMemory(k=5),  # 最近 5 轮完整记忆
        ConversationSummaryMemory(llm=llm),   # 早期对话摘要
    ]
)
```

**使用自定义内存**

```python
from langchain.memory import BaseMemory
from typing import List, Dict, Any

class CustomMemory(BaseMemory):
    """自定义内存实现"""
    
    def load_memory_variables(self, inputs: Dict[str, Any]) -> Dict[str, str]:
        """加载记忆变量"""
        return {"history": self._format_history()}
    
    def save_context(self, inputs: Dict[str, Any], outputs: Dict[str, str]) -> None:
        """保存对话上下文"""
        pass
    
    def clear(self) -> None:
        """清除记忆"""
        pass
    
    @property
    def memory_variables(self) -> List[str]:
        return ["history"]
```

---

## 5. 向量存储和 RAG

### 5.1 Embeddings

**OpenAI Embeddings**

```python
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",  # 或 "text-embedding-3-large"
    api_key="your-api-key"
)

# 生成单个文本的 embedding
vector = embeddings.embed_query("你好，世界")
print(f"向量维度: {len(vector)}")

# 批量生成
texts = ["文本1", "文本2", "文本3"]
vectors = embeddings.embed_documents(texts)
```

**其他 Embedding 提供者**

```python
# Cohere
from langchain_community.embeddings import CohereEmbeddings

embeddings = CohereEmbeddings(
    model="embed-english-v3.0",
    cohere_api_key="your-api-key"
)

# Hugging Face
from langchain_community.embeddings import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)
```

### 5.2 Vector Stores

#### Chroma

```python
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

# 文本分割
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len
)

docs = text_splitter.create_documents(
    texts=["长文本内容..."],
    metadatas=[{"source": "文档1"}]
)

# 创建向量存储
vectorstore = Chroma.from_documents(
    documents=docs,
    embedding=OpenAIEmbeddings(),
    persist_directory="./chroma_db"  # 持久化路径
)

# 保存到磁盘
vectorstore.persist()

# 创建检索器
retriever = vectorstore.as_retriever(
    search_type="similarity",           # similarity, mmr, similarity_score_threshold
    search_kwargs={
        "k": 5,                         # 返回数量
        "filter": {"source": "文档1"},  # 元数据过滤
        "score_threshold": 0.5          # 相似度阈值
    }
)
```

#### Pinecone

```python
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
import pinecone

# 初始化 Pinecone
pinecone.init(api_key="your-api-key", environment="your-environment")
pinecone.create_index("my-index", dimension=1536)

# 创建向量存储
vectorstore = PineconeVectorStore.from_documents(
    documents=docs,
    embedding=OpenAIEmbeddings(),
    index_name="my-index",
    pinecone_api_key="your-api-key"
)

retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
```

#### FAISS

```python
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

# 创建 FAISS 向量存储
vectorstore = FAISS.from_documents(
    documents=docs,
    embedding=OpenAIEmbeddings()
)

# 保存和加载
vectorstore.save_local("faiss_index")

# 加载
loaded_vectorstore = FAISS.load_local(
    "faiss_index",
    OpenAIEmbeddings(),
    allow_dangerous_deserialization=True
)
```

#### 向量存储对比

| 向量存储 | 特点 | 适用场景 |
|----------|------|----------|
| Chroma | 轻量级，本地运行 | 原型开发、测试 |
| Pinecone | 云服务，高可用 | 生产环境 |
| FAISS | Facebook 开源，高效 | 大规模向量检索 |
| Milvus | 云原生，分布式 | 超大规模部署 |
| Weaviate | 原生图结构 | 复杂关系查询 |

### 5.3 RetrievalQA Chain

```python
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4", temperature=0)

# 创建 RetrievalQA 链
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",  # 链类型
    retriever=retriever,
    return_source_documents=True,  # 返回源文档
    verbose=True
)

# 查询
result = qa_chain({"query": "LangChain 的核心概念是什么？"})

print("答案:", result["result"])
print("\n来源文档:")
for doc in result["source_documents"]:
    print(f"- {doc.metadata.get('source', 'unknown')}")
```

**链类型详解**

```python
# 1. stuff - 将所有检索内容拼接到提示中（简单快捷）
qa_stuff = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever
)

# 2. map_reduce - 分别总结后再次总结（适合大量文档）
qa_map_reduce = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="map_reduce",
    retriever=retriever
)

# 3. refine - 逐步优化答案（适合渐进式改进）
qa_refine = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="refine",
    retriever=retriever
)

# 4. map_rerank - 评分后排序（适合需要评分的场景）
qa_rerank = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="map_rerank",
    retriever=retriever
)
```

**自定义 RetrievalQA**

```python
from langchain.chains import RetrievalQA
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain

# 创建文档处理链
document_prompt = PromptTemplate.from_template("""
根据以下上下文回答问题：

上下文：
{context}

问题：{input}

答案（如果上下文不足以回答，请说明）：
""")

combine_docs_chain = create_stuff_documents_chain(
    llm=llm,
    prompt=document_prompt,
    document_prompt=document_prompt
)

# 创建检索链
retrieval_chain = create_retrieval_chain(
    retriever=retriever,
    combine_docs_chain=combine_docs_chain
)

result = retrieval_chain.invoke({"input": "你的问题"})
```

---

## 6. Callbacks 和监控

### 6.1 回调系统概述

LangChain 的回调系统允许在链执行过程中添加日志、监控和自定义逻辑。

```python
from langchain_core.callbacks import BaseCallbackHandler
from langchain_openai import ChatOpenAI

class CustomCallbackHandler(BaseCallbackHandler):
    """自定义回调处理器"""
    
    def on_llm_start(self, serialized, prompts, **kwargs):
        print(f"LLM 开始处理...")
    
    def on_llm_new_token(self, token, **kwargs):
        print(f"新 token: {token}", end="", flush=True)
    
    def on_llm_end(self, response, **kwargs):
        print(f"\nLLM 处理完成")
    
    def on_chain_start(self, serialized, inputs, **kwargs):
        print(f"链开始: {serialized.get('name', 'unknown')}")
    
    def on_chain_end(self, outputs, **kwargs):
        print(f"链完成: {outputs}")
    
    def on_tool_start(self, serialized, inputs, **kwargs):
        print(f"工具开始: {serialized.get('name', 'unknown')}")
    
    def on_tool_end(self, output, **kwargs):
        print(f"工具完成: {output}")
    
    def on_agent_action(self, action, **kwargs):
        print(f"Agent 动作: {action}")
```

### 6.2 使用回调

**在链级别使用**

```python
from langchain_core.callbacks import StdOutCallbackHandler
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4")

chain = LLMChain(
    llm=llm,
    prompt=prompt,
    callbacks=[StdOutCallbackHandler()]  # 添加回调
)

result = chain.run("你的问题")
```

**在 LLM 级别使用**

```python
llm = ChatOpenAI(
    model="gpt-4",
    callbacks=[CustomCallbackHandler()]
)
```

**使用上下文管理器传递回调**

```python
from langchain_core.callbacks import CallbackManager

with CallbackManager([CustomCallbackHandler()]) as cb:
    chain.invoke({"input": "问题"}, config={"callbacks": cb})
```

### 6.3 常用回调处理器

**StdOutCallbackHandler - 标准输出**

```python
from langchain_core.callbacks import StdOutCallbackHandler

chain = LLMChain(
    llm=llm,
    prompt=prompt,
    callbacks=[StdOutCallbackHandler()]
)
```

**Tracers - LangSmith 追踪**

```python
from langchain_core.tracers import LangChainTracer
from langchain_core.tracers.context import tracing_v2_enabled

# 方式 1: 使用环境变量
# LANGCHAIN_TRACING_V2=true
# LANGCHAIN_API_KEY=your-api-key

# 方式 2: 手动配置
tracer = LangChainTracer(
    project_name="my-project",
    tenant_id="your-tenant-id"
)

with tracing_v2_enabled(
    project_name="my-project",
    callbacks=[tracer]
):
    result = chain.invoke({"input": "问题"})
```

**FileCallbackHandler - 文件日志**

```python
from langchain_community.callbacks import FileCallbackHandler
from langchain_core.outputs import OutputFixParser

log_file = "chain_execution.log"
handler = FileCallbackHandler(log_file)

chain = LLMChain(
    llm=llm,
    prompt=prompt,
    callbacks=[handler]
)
```

### 6.4 异步回调

```python
from langchain_core.callbacks import AsyncCallbackHandler

class AsyncCustomHandler(AsyncCallbackHandler):
    async def on_llm_start(self, serialized, prompts, **kwargs):
        print(f"LLM 开始 (异步)")
    
    async def on_llm_new_token(self, token, **kwargs):
        print(f"Token: {token}", end="", flush=True)
    
    async def on_llm_end(self, response, **kwargs):
        print(f"LLM 完成 (异步)")

async_handler = AsyncCustomHandler()

# 异步调用
async def run_chain():
    result = await chain.ainvoke(
        {"input": "问题"},
        config={"callbacks": [async_handler]}
    )
    return result
```

### 6.5 事件参考

| 事件 | 触发时机 | 常用参数 |
|------|----------|----------|
| `on_llm_start` | LLM 开始处理 | `serialized`, `prompts` |
| `on_llm_new_token` | LLM 输出新 token | `token` |
| `on_llm_end` | LLM 处理完成 | `response` |
| `on_chain_start` | 链开始执行 | `serialized`, `inputs` |
| `on_chain_end` | 链执行完成 | `outputs` |
| `on_tool_start` | 工具开始执行 | `serialized`, `inputs` |
| `on_tool_end` | 工具执行完成 | `output` |
| `on_agent_action` | Agent 执行动作 | `action` |
| `on_text` | 输出文本 | `text` |
| `on_error` | 发生错误 | `error` |

### 6.6 监控和追踪示例

```python
from langchain_core.callbacks import BaseCallbackHandler
import time
from typing import Any, Dict, List

class MonitoringCallback(BaseCallbackHandler):
    """监控回调 - 收集性能指标"""
    
    def __init__(self):
        self.metrics = {
            "llm_calls": 0,
            "tool_calls": 0,
            "chain_calls": 0,
            "total_tokens": 0,
            "latency": []
        }
    
    def on_llm_start(self, serialized, prompts, **kwargs):
        self.metrics["llm_calls"] += 1
        self._start_time = time.time()
    
    def on_llm_end(self, response, **kwargs):
        elapsed = time.time() - self._start_time
        self.metrics["latency"].append(elapsed)
        # 计算 token 使用
        if hasattr(response, "llm_output"):
            self.metrics["total_tokens"] += response.llm_output.get(
                "token_usage", {}
            ).get("total_tokens", 0)
    
    def on_tool_start(self, serialized, inputs, **kwargs):
        self.metrics["tool_calls"] += 1
    
    def get_summary(self) -> Dict[str, Any]:
        """获取监控摘要"""
        latency = self.metrics["latency"]
        return {
            "total_llm_calls": self.metrics["llm_calls"],
            "total_tool_calls": self.metrics["tool_calls"],
            "total_tokens": self.metrics["total_tokens"],
            "avg_latency": sum(latency) / len(latency) if latency else 0,
            "max_latency": max(latency) if latency else 0,
        }

# 使用监控回调
monitor = MonitoringCallback()
chain = LLMChain(llm=llm, prompt=prompt, callbacks=[monitor])

result = chain.run("问题")
print(monitor.get_summary())
```

---

## 附录

### 常用导入速查

```python
# 核心组件
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

# 链
from langchain.chains import LLMChain, ConversationChain, RetrievalQA
from langchain.chains import SequentialChain

# Agent
from langchain.agents import initialize_agent, AgentType

# 工具
from langchain.tools import tool, StructuredTool
from langchain_prebuilt import ToolNode

# 内存
from langchain.memory import (
    BufferMemory,
    ConversationBufferWindowMemory,
    ConversationSummaryMemory,
    VectorStoreRetrieverMemory
)

# 向量存储
from langchain_community.vectorstores import Chroma, FAISS
from langchain_openai import OpenAIEmbeddings

# 回调
from langchain_core.callbacks import BaseCallbackHandler, StdOutCallbackHandler
```

### 参考资源

- [LangChain 官方文档](https://docs.langchain.com/)
- [LangChain GitHub](https://github.com/langchain-ai/langchain)
- [LangSmith 平台](https://docs.smith.langchain.com/)
- [LCEL 最佳实践](https://python.langchain.com/docs/expression_language/)