---
title: LangChain 深度指南
description: 深入探讨 LangChain 的核心概念、架构和使用方法，包括工具系统、Agent 架构、内存系统。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

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

**TypeScript 示例：基础链式调用**

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// 初始化模型
const llm = new ChatOpenAI({
  model: "gpt-4",
  temperature: 0,
});

// 定义提示模板
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一位专业的技术文档写作助手"],
  ["human", "用简洁的语言解释以下概念：{concept}"]
]);

// 创建链：prompt -> llm -> output_parser
const chain = prompt.pipe(llm).pipe(new StringOutputParser());

// 调用链
const result = await chain.invoke({ concept: "什么是 LCEL" });
console.log(result);
```

**Python 示例（仅供参考）**

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

#### Runnable 接口

LCEL 的核心是 `Runnable` 接口，所有组件都实现了这个接口：

```typescript
// Runnable 的核心方法
interface Runnable<Input, Output> {
  // 同步调用
  invoke(input: Input): Promise<Output>;

  // 异步调用
  ainvoke(input: Input): Promise<Output>;

  // 批量同步调用
  batch(inputs: Input[]): Promise<Output[]>;

  // 批量异步调用
  abatch(inputs: Input[]): Promise<Output[]>;

  // 流式输出
  stream(input: Input): AsyncGenerator<Output>;
}
```

#### 并行执行

LCEL 支持并行执行多个分支：

```typescript
import { RunnableParallel } from "@langchain/core/runnables";

// 创建并行分支
const branch = new RunnableParallel({
  summary: summaryChain,
  analysis: analysisChain,
  keywords: keywordChain,
});

// 同时执行三个链
const result = await branch.invoke({ text: longDocument });
// result = { summary: "...", analysis: "...", keywords: [...] }
```

#### 条件路由

```typescript
import { RunnableBranch } from "@langchain/core/runnables";

const router = new RunnableBranch(
  [(x: { query: string }) => x.query.includes("代码"), codeChain],
  [(x: { query: string }) => x.query.includes("数学"), mathChain],
  generalChain  // 默认链
);

const result = await router.invoke({ query: "如何用 JavaScript 写快速排序" });
```

#### 配置和别名

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts";

// 为链中的组件添加别名
const chain = ChatPromptTemplate.fromTemplate("{question}")
  .pipe(llm.withConfig({ runName: "QuestionAnswerer" }))
  .pipe(new StringOutputParser());

// 使用 config 覆盖配置
const result = await chain.invoke(
  { question: "什么是 AI?" },
  { config: { metadata: { userId: "123" }, tags: ["qa"] } }
);
```

### 1.2 Chains 类型

LangChain 提供了多种预构建的 Chain 类型，适用于不同场景。

#### LLMChain

最基础的链类型，将提示模板与 LLM 结合：

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";

const llm = new ChatOpenAI({ model: "gpt-4" });

// 创建 LLMChain
const chain = new LLMChain({
  llm,
  prompt: PromptTemplate.fromTemplate("将以下中文翻译成英文：{text}"),
  outputKey: "translation",  // 自定义输出键名
});

const result = await chain.call({ text: "你好，世界" });
console.log(result.translation);  // Hello, World
```

#### ConversationChain

专门用于对话场景的链：

```typescript
import { ConversationChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";

const memory = new BufferMemory();
const conversation = new ConversationChain({
  llm,
  memory,
  verbose: true,
});

const response1 = await conversation.call({ input: "我叫张三" });
console.log(response1.response);  // 你好，张三！很高兴认识你。

const response2 = await conversation.call({ input: "我叫什么名字？" });
console.log(response2.response);  // 你叫张三。
```

#### RetrievalQA

用于 RAG（检索增强生成）的链：

```typescript
import { RetrievalQAChain } from "langchain/chains";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";

// 创建向量存储
const vectorstore = await HNSWLib.fromDocuments(documents, new OpenAIEmbeddings());
const retriever = vectorstore.asRetriever({ k: 3 });

// 创建 RetrievalQA 链
const qaChain = RetrievalQAChain.fromLLM(llm, retriever, {
  returnSourceDocuments: true,
});

const result = await qaChain.call({ query: "LangChain 的核心概念是什么？" });
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

```typescript
import { SequentialChain } from "langchain/chains";

// 第一个链：翻译
const chain1 = new LLMChain({
  llm,
  prompt: PromptTemplate.fromTemplate("翻译成英文：{text}"),
  outputKey: "englishText",
});

// 第二个链：总结
const chain2 = new LLMChain({
  llm,
  prompt: PromptTemplate.fromTemplate("总结以下文本：{englishText}"),
  outputKey: "summary",
});

// 组合顺序链
const sequentialChain = new SequentialChain({
  chains: [chain1, chain2],
  inputVariables: ["text"],
  outputVariables: ["englishText", "summary"],
  verbose: true,
});

const result = await sequentialChain.call({ text: "LangChain 是一个强大的 AI 框架" });
```

### 1.3 Prompts 和 Output Parsers

#### Prompt 模板

**ChatPromptTemplate**

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts";

// 消息式模板
const template = ChatPromptTemplate.fromMessages([
  ["system", "你是一个{character}，回答问题要{style}。"],
  ["human", "{question}"],
  ["ai", "{previous_answer}"],  // 可选的对话历史
  ["human", "请用更简单的方式解释"],
]);

const prompt = await template.invoke({
  character: "老师",
  style: "生动有趣",
  question: "什么是量子计算",
  previous_answer: "量子计算是一种...",
});
```

**PromptTemplate**

```typescript
import { PromptTemplate } from "@langchain/core/prompts";

const template = PromptTemplate.fromTemplate(`
请分析以下产品的优缺点：

产品名称：{productName}
产品类别：{category}
目标用户：{targetAudience}

请从以下几个方面进行分析：
1. 功能特性
2. 用户体验
3. 价格定位
4. 竞争优势
`);

const prompt = await template.invoke({
  productName: "iPhone 15",
  category: "智能手机",
  targetAudience: "追求高端体验的消费者",
});
```

**Few-shot 提示**

```typescript
import { FewShotPromptTemplate } from "@langchain/core/prompts";
import { PromptTemplate } from "@langchain/core/prompts";

const examples = [
  { input: "今天天气真好", output: "sentiment: positive" },
  { input: "这个产品太差了", output: "sentiment: negative" },
  { input: "味道一般般", output: "sentiment: neutral" },
];

const exampleTemplate = new PromptTemplate({
  template: "输入: {input}\n输出: {output}",
  inputVariables: ["input", "output"],
});

const prompt = new FewShotPromptTemplate({
  examples,
  examplePrompt: exampleTemplate,
  prefix: "判断以下句子的情感倾向：",
  suffix: "输入: {sentence}\n输出:",
  inputVariables: ["sentence"],
});
```

#### Output Parsers

**StringOutputParser**

```typescript
import { StringOutputParser } from "@langchain/core/output_parsers";

const chain = prompt.pipe(llm).pipe(new StringOutputParser());
const result = await chain.invoke({});
// result 是字符串类型
```

**JsonOutputParser**

```typescript
import { JsonOutputParser } from "@langchain/core/output_parsers";

const chain = prompt.pipe(llm).pipe(new JsonOutputParser());
const result = await chain.invoke({});
// result 是字典类型
```

**Custom Output Parser with Zod**

```typescript
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/outputs";

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    name: z.string().describe("产品名称"),
    price: z.number().describe("产品价格"),
    features: z.array(z.string()).describe("产品特性列表"),
    rating: z.number().min(1).max(5).describe("用户评分 1-5"),
  })
);

const chain = prompt.pipe(llm).pipe(parser);
const result = await chain.invoke({});
// result 是结构化对象
```

---

## 2. 工具系统 (Tools)

### 2.1 内置工具

LangChain 提供了丰富的内置工具，覆盖搜索、计算、网络请求等常见场景。

**搜索工具**

```typescript
import { DuckDuckGoSearch } from "@langchain/community/tools/ddgs_search";

// 创建搜索工具
const search = new DuckDuckGoSearch({ numResults: 5 });
const result = await search.invoke("LangChain 教程 2024");
```

**计算工具**

```typescript
import { Calculator } from "@langchain/community/tools/calculator";

// 创建计算器工具
const calculator = new Calculator();
const result = await calculator.invoke("(15 + 25) * 3 / 4");
// result = 30
```

**维基百科工具**

```typescript
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia";

// 创建维基百科工具
const wiki = new WikipediaQueryRun();
const result = await wiki.invoke("TypeScript");
```

### 2.2 自定义工具创建

使用 `tool` 函数快速创建自定义工具：

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

const calculate = tool(
  async ({ expression }: { expression: string }) => {
    try {
      // 安全计算（生产环境应使用安全的评估器）
      const result = Function(`"use strict"; return (${expression})`)();
      return String(result);
    } catch (e) {
      return `计算错误: ${e}`;
    }
  },
  {
    name: "calculate",
    description: "执行数学计算表达式",
    schema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "数学表达式，如 '2 + 2' 或 'sqrt(16)'",
        },
      },
      required: ["expression"],
    },
  }
);

const getWeather = tool(
  async ({ location, unit = "celsius" }: { location: string; unit?: string }) => {
    // 实际应用中这里会调用天气 API
    return `${location} 今天的天气晴朗，温度 25°C`;
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

对于更复杂的需求，可以扩展 `StructuredTool`：

```typescript
import { StructuredTool } from "@langchain/core/tools";

const fetchWebpage = new StructuredTool({
  name: "fetch_webpage",
  description: "从指定 URL 获取网页内容",
  schema: z.object({
    url: z.string().describe("网页 URL"),
    selector: z.string().optional().describe("CSS 选择器"),
  }),
  async execute({ url, selector }) {
    const response = await fetch(url);
    const text = await response.text();
    if (selector) {
      // 使用 DOM 解析提取特定内容
      // 简化示例
      return text.slice(0, 1000);
    }
    return text.slice(0, 1000);
  },
});
```

### 2.3 工具绑定和调用

#### bindTools 方法

```typescript
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({ model: "gpt-4-turbo" });

// 绑定工具到 LLM
const llmWithTools = llm.bindTools([getCurrentTime, getWeather]);

// LLM 会根据上下文决定是否调用工具
const response = await llmWithTools.invoke("现在几点了？北京天气怎么样？");
```

**强制使用特定工具**

```typescript
// 强制模型使用特定工具
const llmWithForcedTool = llm.bindTools(
  [getCurrentTime],
  { tool_choice: "get_current_time" }  // 强制调用此工具
);
```

#### ToolCall 序列化

```typescript
// 处理工具调用
for (const toolCall of response.toolCalls) {
  console.log(`工具名称: ${toolCall.name}`);
  console.log(`参数: ${JSON.stringify(toolCall.args)}`);

  // 执行工具
  const tool = tools.find((t: any) => t.name === toolCall.name);
  if (tool) {
    const result = await tool.invoke(toolCall.args);

    // 创建 ToolMessage
    messages.push(new ToolMessage({
      content: String(result),
      toolCallId: toolCall.id,
      name: toolCall.name,
    }));
  }
}
```

### 2.4 ToolNode 和 ToolMessage

#### ToolMessage

```typescript
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

// AI 消息包含工具调用
const aiMessage = new AIMessage({
  content: "",
  toolCalls: [{
    name: "get_weather",
    args: { location: "北京" },
    id: "call_abc123",
  }],
});

// 创建工具结果消息
const toolResult = new ToolMessage({
  content: "北京今天晴朗，温度 25°C",
  toolCallId: "call_abc123",  // 必须与 AI 消息中的 id 匹配
  name: "get_weather",
});

// 完整的消息流
const messages = [
  new HumanMessage({ content: "北京天气怎么样？" }),
  aiMessage,
  toolResult,
];
```

#### ToolNode

```typescript
import { ToolNode } from "@langchain/core/tools";

// 从工具列表创建 ToolNode
const tools = [getCurrentTime, getWeather];
const toolNode = new ToolNode(tools);

// 处理消息流中的工具调用
// ToolNode 会自动识别 AIMessage 中的 tool_calls
// 执行相应工具并返回 ToolMessage

const resultMessages = await toolNode.invoke(messages);
// 返回包含 ToolMessage 的消息列表
```

#### 完整工具调用流程

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { messagesFrom } from "@langchain/core/messages";

const llm = new ChatOpenAI({ model: "gpt-4-turbo" });
const tools = [getCurrentTime, getWeather];
const toolNode = new ToolNode(tools);

// 绑定工具
const llmWithTools = llm.bindTools(tools);

async function callWithTools(userMessage: string): Promise<string> {
  const messages = [new HumanMessage({ content: userMessage })];

  // 第一轮：LLM 决定是否调用工具
  const aiMessage = await llmWithTools.invoke(messages);
  messages.push(aiMessage);

  // 如果有工具调用，执行工具
  if (aiMessage.toolCalls && aiMessage.toolCalls.length > 0) {
    const toolMessages = await toolNode.invoke(messages);
    messages.push(...toolMessages);

    // 第二轮：LLM 根据工具结果生成最终回复
    const finalResponse = await llmWithTools.invoke(messages);
    return finalResponse.content as string;
  }

  return aiMessage.content as string;
}

const result = await callWithTools("现在北京时间多少？北京天气如何？");
```

---

## 3. Agent 架构

### 3.1 ReAct Agent

ReAct (Reasoning + Acting) 是一种将推理和行动结合的 Agent 范式。

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { pullToolFromHub } from "@langchain/core/tools";

// 初始化 LLM
const llm = new ChatOpenAI({ model: "gpt-4-turbo" });

// 创建 ReAct Agent
const agent = createReactAgent({
  llm,
  tools: [getCurrentTime, getWeather, search],
});

// 运行 Agent
const result = await agent.invoke({
  messages: [{ role: "user", content: "帮我查一下北京今天的天气，然后告诉我现在是几点？" }],
});
```

**ReAct 的工作流程**

```
1. Thought: 分析当前情况，决定下一步行动
2. Action: 选择并调用合适的工具
3. Observation: 观察工具返回的结果
4. (重复直到得到最终答案)
```

**自定义 ReAct Agent**

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { PullToolFromHub } from "@langchain/core/tools";
import { z } from "zod";

// 自定义提示模板
const prompt = `你是一个智能助手，可以通过工具来回答问题。

可用的工具：
{tools}

工具描述：
{tool_descriptions}

对话历史：
{chat_history}

当前消息：{input}

{agent_scratchpad}  # Agent 的思考过程
`;

// 使用 createReactAgent 创建自定义 Agent
const agent = createReactAgent({
  llm: new ChatOpenAI({ model: "gpt-4-turbo" }),
  tools: [getCurrentTime, getWeather],
  prompt,
});

// 执行
const result = await agent.invoke({
  messages: [{ role: "user", content: "今天天气如何？" }],
});
```

### 3.2 Plan-and-Execute Agent

Plan-and-Execute 模式先规划后执行，适合复杂任务。

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { PlanAndExecute } from "@langchain/langgraph/prebuilt";

// 初始化
const llm = new ChatOpenAI({ model: "gpt-4-turbo" });

// 使用 LangGraph 的 PlanAndExecute
// 注意：完整实现需要自定义 planner 和 executor
// 这里展示核心概念
async function planAndExecute(task: string) {
  // 1. 规划阶段：LLM 生成执行计划
  const planResponse = await llm.invoke(`将以下任务分解为步骤：${task}`);

  // 2. 执行阶段：按计划执行每个步骤
  const steps = parseSteps(planResponse.content);
  const results = [];

  for (const step of steps) {
    const result = await executeStep(step);
    results.push(result);
  }

  // 3. 综合结果
  return combineResults(results);
}

// 执行复杂任务
const result = await planAndExecute(`
帮我完成以下任务：
1. 搜索最新的 AI 新闻
2. 找出最热门的 3 条
3. 用中文总结给我
`);
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

```typescript
import { StateGraph, END, START } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

// 定义 Agent 状态
interface AgentState {
  messages: Array<{ role: string; content: string }>;
  currentStep: string;
  toolsCalled: number;
}

// 自定义 Agent 节点
async function customAgentNode(state: AgentState): Promise<Partial<AgentState>> {
  const llm = new ChatOpenAI({ model: "gpt-4-turbo" });

  // 调用 LLM 生成响应
  const response = await llm.invoke(state.messages);

  return {
    messages: [...state.messages, { role: "assistant", content: response.content as string }],
    currentStep: "thinking",
    toolsCalled: state.toolsCalled + 1,
  };
}

// 构建自定义 Agent
const workflow = new StateGraph<AgentState>({
  channels: {
    messages: {
      value: (x: any[], y: any) => [...x, y],
      default: () => [],
    },
    currentStep: {
      value: (x: string, y: string) => y,
      default: () => "idle",
    },
    toolsCalled: {
      value: (x: number, y: number) => x + y,
      default: () => 0,
    },
  },
});

workflow.addNode("agent", customAgentNode);
workflow.addEdge(START, "agent");
workflow.addEdge("agent", END);

const agent = workflow.compile();

// 执行
const result = await agent.invoke({
  messages: [{ role: "user", content: "你好" }],
  currentStep: "idle",
  toolsCalled: 0,
});
```

### 3.4 AgentExecutor

AgentExecutor 是 Agent 的运行时，负责执行 Agent 决策的循环。

```typescript
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

// AgentExecutor 配置选项
const agent = createReactAgent({
  llm: new ChatOpenAI({ model: "gpt-4-turbo" }),
  tools: [getCurrentTime, getWeather],
  maxIterations: 10,          // 最大迭代次数
  maxExecutionTime: 120,      // 最大执行时间（秒）
  returnIntermediateSteps: true,  // 返回中间步骤
});

// 执行并获取中间步骤
const result = await agent.invoke({
  messages: [{ role: "user", content: "帮我查一下..." }],
});

console.log("最终答案:", result.messages.at(-1)?.content);
console.log("中间步骤:", result);
```

**错误处理**

```typescript
// 自定义错误处理函数
async function handleError(error: Error, state: AgentState): Promise<AgentState> {
  console.error("Agent 执行出错:", error.message);

  // 可以添加重试逻辑或降级处理
  return {
    ...state,
    messages: [
      ...state.messages,
      { role: "system", content: `遇到错误: ${error.message}，请调整策略后重试。` },
    ],
  };
}
```

**流式执行**

```typescript
// 流式输出 Agent 执行过程
const stream = await agent.stream({
  messages: [{ role: "user", content: "你的问题" }],
});

for await (const event of stream) {
  if (event.agent) {
    console.log("Agent 思考:", event.agent);
  }
  if (event.tools) {
    console.log("工具执行:", event.tools);
  }
}
```

---

## 4. 内存系统 (Memory)

### 4.1 BufferMemory

最基础的内存类型，保存完整的对话历史。

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { BufferMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";

const llm = new ChatOpenAI({ model: "gpt-4" });

// 创建 BufferMemory
const memory = new BufferMemory({
  aiPrefix: "AI助手",           // AI 消息的前缀
  humanPrefix: "用户",         // 人类消息的前缀
  memoryKey: "history",         // 在 prompt 中引用的键名
});

// 创建对话链
const conversation = new ConversationChain({
  llm,
  memory,
  verbose: true,
});

// 对话
await conversation.call({ input: "我叫张三，今年 25 岁" });
const response = await conversation.call({ input: "我叫什么名字？" });
// response.response: 你叫张三

// 查看内存内容
const memoryVariables = await memory.loadMemoryVariables({});
console.log(memoryVariables.history);
```

### 4.2 ConversationBufferWindowMemory

滑动窗口内存，只保留最近 N 条对话。

```typescript
import { ConversationBufferWindowMemory } from "langchain/memory";

// 只保留最近 3 轮对话
const memory = new ConversationBufferWindowMemory({
  k: 3,                          // 保留的对话轮数
  aiPrefix: "AI",
  humanPrefix: "Human",
  returnMessages: true,          // 返回消息对象而非字符串
});

// 自动管理对话历史
for (let i = 0; i < 10; i++) {
  await memory.saveContext(
    { input: `问题 ${i}` },
    { output: `回答 ${i}` }
  );
}

// 只保留最近 3 轮
const messages = await memory.loadMemoryVariables({});
console.log(messages.history.length);  // 6 (3 轮 x 2)
```

### 4.3 SummaryMemory

摘要内存，定期将对话历史压缩成摘要。

```typescript
import { ConversationSummaryMemory } from "langchain/memory";

const memory = new ConversationSummaryMemory({
  llm: new ChatOpenAI({ model: "gpt-4", temperature: 0 }),  // 用于生成摘要的 LLM
  memoryKey: "history",
});

// 自动生成摘要
await memory.saveContext(
  { input: "今天天气真好" },
  { output: "是啊，阳光明媚很适合出门。" }
);

// 获取摘要
const memoryVariables = await memory.loadMemoryVariables({});
console.log(memoryVariables.history);
```

### 4.4 VectorStoreRetrieverMemory

向量存储记忆，支持语义搜索历史对话。

```typescript
import { VectorStoreRetrieverMemory } from "langchain/memory";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "@langchain/openai";

// 创建向量存储
const vectorstore = await HNSWLib.fromTexts(
  ["初始对话..."],
  [{ content: "初始对话..." }],
  new OpenAIEmbeddings()
);

// 创建检索器
const retriever = vectorstore.asRetriever({
  search_kwargs: { k: 3 },  // 检索最近 3 条相关记忆
});

// 创建 VectorStoreRetrieverMemory
const memory = new VectorStoreRetrieverMemory({
  retriever,
  memoryKey: "chat_history",
});

// 保存对话
await memory.saveContext(
  { input: "我喜欢吃川菜" },
  { output: "川菜确实很好吃，麻辣鲜香是它的特点。" }
);

// 检索相关记忆
const relevant = await memory.loadMemoryVariables({
  input: "什么菜系是麻辣的？",
});
console.log(relevant.chat_history);
// 输出: 关于川菜的对话
```

### 4.5 多种内存组合

```typescript
import { CombinedMemory } from "langchain/memory";
import { BufferMemory } from "langchain/memory";
import { ConversationSummaryMemory } from "langchain/memory";

// 组合多种内存
const memory = new CombinedMemory({
  memories: [
    new BufferMemory({ memoryKey: "recent" }),  // 最近 5 轮完整记忆
    new ConversationSummaryMemory({
      llm: new ChatOpenAI({ model: "gpt-4" }),
      memoryKey: "summary",
    }),  // 早期对话摘要
  ],
});
```

**使用自定义内存**

```typescript
import { BaseMemory } from "langchain/memory";

interface CustomMemoryInput {
  history: string[];
}

interface CustomMemoryOutput {
  history: string;
}

class CustomMemory extends BaseMemory {
  private _history: string[] = [];

  async loadMemoryVariables(inputs: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { history: this._history.join("\n") };
  }

  async saveContext(inputs: Record<string, unknown>, outputs: Record<string, unknown>): Promise<void> {
    this._history.push(`${inputs.input} -> ${outputs.response}`);
  }

  async clear(): Promise<void> {
    this._history = [];
  }

  get memoryVariables(): string[] {
    return ["history"];
  }
}
```

---

## 5. 向量存储和 RAG

### 5.1 Embeddings

**OpenAI Embeddings**

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",  // 或 "text-embedding-3-large"
});

// 生成单个文本的 embedding
const vector = await embeddings.embedQuery("你好，世界");
console.log(`向量维度: ${vector.length}`);

// 批量生成
const texts = ["文本1", "文本2", "文本3"];
const vectors = await embeddings.embedDocuments(texts);
```

**其他 Embedding 提供者**

```typescript
// Cohere
import { CohereEmbeddings } from "@langchain/community/embeddings/cohere";

const cohereEmbeddings = new CohereEmbeddings({
  model: "embed-english-v3.0",
  apiKey: "your-api-key",
});

// Hugging Face
import { HuggingFaceEmbeddings } from "@langchain/community/embeddings/hf";

const hfEmbeddings = new HuggingFaceEmbeddings({
  modelName: "sentence-transformers/all-MiniLM-L6-v2",
});
```

### 5.2 Vector Stores

#### HNSWLib (本地向量存储)

```typescript
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitter";

// 文本分割
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const docs = await textSplitter.createDocuments(
  ["长文本内容..."],
  [{ source: "文档1" }]
);

// 创建向量存储
const vectorstore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());

// 保存到磁盘
await vectorstore.save("./hnswlib_index");

// 加载
const loadedVectorstore = await HNSWLib.load(
  "./hnswlib_index",
  new OpenAIEmbeddings()
);

// 创建检索器
const retriever = vectorstore.asRetriever({
  searchType: "similarity",  // similarity, mmr, similarity_score_threshold
  search_kwargs: {
    k: 5,                    // 返回数量
    filter: { source: "文档1" },  // 元数据过滤
  },
});
```

#### Pinecone

```typescript
import { PineconeStore } from "@langchain/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";

// 初始化 Pinecone
const pinecone = new Pinecone();
await pinecone.init({
  apiKey: process.env.PINECONE_API_KEY!,
});

// 创建向量存储
const vectorstore = await PineconeStore.fromDocuments(
  docs,
  new OpenAIEmbeddings(),
  {
    pineconeIndex: pinecone.Index("my-index"),
  }
);

const retriever = vectorstore.asRetriever({ k: 3 });
```

#### FAISS

```typescript
import { FAISS } from "@langchain/community/vectorstores/faiss";
import { OpenAIEmbeddings } from "@langchain/openai";

// 创建 FAISS 向量存储
const vectorstore = await FAISS.fromDocuments(docs, new OpenAIEmbeddings());

// 保存和加载
await vectorstore.save("faiss_index");

// 加载
const loadedVectorstore = await FAISS.load(
  "faiss_index",
  new OpenAIEmbeddings()
);
```

#### 向量存储对比

| 向量存储 | 特点 | 适用场景 |
|----------|------|----------|
| HNSWLib | 轻量级，本地运行 | 原型开发、测试 |
| Pinecone | 云服务，高可用 | 生产环境 |
| FAISS | Facebook 开源，高效 | 大规模向量检索 |
| Milvus | 云原生，分布式 | 超大规模部署 |
| Weaviate | 原生图结构 | 复杂关系查询 |

### 5.3 RetrievalQA Chain

```typescript
import { RetrievalQAChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({ model: "gpt-4", temperature: 0 });

// 创建 RetrievalQA 链
const qaChain = RetrievalQAChain.fromLLM(llm, retriever, {
  returnSourceDocuments: true,  // 返回源文档
});

// 查询
const result = await qaChain.call({ query: "LangChain 的核心概念是什么？" });

console.log("答案:", result.text);
console.log("来源文档:", result.sourceDocuments);
```

**链类型详解**

```typescript
// 1. stuff - 将所有检索内容拼接到提示中（简单快捷）
const qaStuff = RetrievalQAChain.fromLLM(llm, retriever, {
  chainType: "stuff",
});

// 2. map_reduce - 分别总结后再次总结（适合大量文档）
const qaMapReduce = RetrievalQAChain.fromLLM(llm, retriever, {
  chainType: "map_reduce",
});

// 3. refine - 逐步优化答案（适合渐进式改进）
const qaRefine = RetrievalQAChain.fromLLM(llm, retriever, {
  chainType: "refine",
});

// 4. map_rerank - 评分后排序（适合需要评分的场景）
const qaMapRerank = RetrievalQAChain.fromLLM(llm, retriever, {
  chainType: "map_rerank",
});
```

**自定义 RetrievalQA**

```typescript
import { createStuffDocumentsChain, createRetrievalChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";

// 创建文档处理链
const documentPrompt = PromptTemplate.fromTemplate(`
根据以下上下文回答问题：

上下文：
{context}

问题：{input}

答案（如果上下文不足以回答，请说明）：
`);

const combineDocsChain = await createStuffDocumentsChain({
  llm,
  prompt: documentPrompt,
});

// 创建检索链
const retrievalChain = await createRetrievalChain({
  retriever,
  combineDocsChain,
});

const result = await retrievalChain.invoke({ input: "你的问题" });
```

---

## 6. Callbacks 和监控

### 6.1 回调系统概述

LangChain 的回调系统允许在链执行过程中添加日志、监控和自定义逻辑。

```typescript
import { BaseCallbackHandler } from "@langchain/core/callbacks";
import { ChatOpenAI } from "@langchain/openai";

class CustomCallbackHandler extends BaseCallbackHandler {
  name = "CustomCallback";

  handleLLMStart(serialized: any, prompts: any): void {
    console.log("LLM 开始处理...");
  }

  handleLLMNewToken(token: string): void {
    process.stdout.write(`Token: ${token}`);
  }

  handleLLMEnd(output: any): void {
    console.log("\nLLM 处理完成");
  }

  handleChainStart(serialized: any, inputs: any): void {
    console.log(`链开始: ${serialized.name || "unknown"}`);
  }

  handleChainEnd(outputs: any): void {
    console.log(`链完成:`, outputs);
  }

  handleToolStart(serialized: any, input: any): void {
    console.log(`工具开始: ${serialized.name || "unknown"}`);
  }

  handleToolEnd(output: any): void {
    console.log(`工具完成:`, output);
  }

  handleAgentAction(action: any): void {
    console.log(`Agent 动作:`, action);
  }
}
```

### 6.2 使用回调

**在链级别使用**

```typescript
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";
import { ConsoleCallbackHandler } from "@langchain/core/callbacks";

const llm = new ChatOpenAI({ model: "gpt-4" });

const chain = new LLMChain({
  llm,
  prompt: PromptTemplate.fromTemplate("{input}"),
  callbacks: [new ConsoleCallbackHandler()],  // 添加回调
});

const result = await chain.call({ input: "你的问题" });
```

**在 LLM 级别使用**

```typescript
const llm = new ChatOpenAI({
  model: "gpt-4",
  callbacks: [new CustomCallbackHandler()],
});
```

**使用上下文传递回调**

```typescript
import { CallbackManager } from "@langchain/core/callbacks";

const callbackManager = new CallbackManager([new CustomCallbackHandler()]);

const result = await chain.invoke(
  { input: "问题" },
  { callbacks: callbackManager }
);
```

### 6.3 常用回调处理器

**ConsoleCallbackHandler - 标准输出**

```typescript
import { LLMChain } from "langchain/chains";
import { ConsoleCallbackHandler } from "@langchain/core/callbacks";

const chain = new LLMChain({
  llm,
  prompt: PromptTemplate.fromTemplate("{input}"),
  callbacks: [new ConsoleCallbackHandler()],
});
```

**Tracers - LangSmith 追踪**

```typescript
import { LangChainTracer } from "@langchain/core/tracers";

const tracer = new LangChainTracer({
  projectName: "my-project",
});

await tracingV2Enabled(
  { projectName: "my-project", callbacks: [tracer] },
  async () => {
    const result = await chain.invoke({ input: "问题" });
  }
);
```

**FileCallbackHandler - 文件日志**

```typescript
import { FileCallbackHandler } from "@langchain/community/callbacks";

const logFile = "chain_execution.log";
const handler = new FileCallbackHandler(logFile);

const chain = new LLMChain({
  llm,
  prompt: PromptTemplate.fromTemplate("{input}"),
  callbacks: [handler],
});
```

### 6.4 异步回调

```typescript
class AsyncCustomHandler extends BaseCallbackHandler {
  name = "AsyncCustomCallback";

  async handleLLMStart(serialized: any, prompts: any): Promise<void> {
    console.log("LLM 开始 (异步)");
  }

  async handleLLMNewToken(token: string): Promise<void> {
    process.stdout.write(`Token: ${token}`);
  }

  async handleLLMEnd(output: any): Promise<void> {
    console.log("LLM 完成 (异步)");
  }
}

const asyncHandler = new AsyncCustomHandler();

// 异步调用
async function runChain() {
  const result = await chain.invoke(
    { input: "问题" },
    { callbacks: [asyncHandler] }
  );
  return result;
}
```

### 6.5 事件参考

| 事件 | 触发时机 | 常用参数 |
|------|----------|----------|
| `handleLLMStart` | LLM 开始处理 | `serialized`, `prompts` |
| `handleLLMNewToken` | LLM 输出新 token | `token` |
| `handleLLMEnd` | LLM 处理完成 | `output` |
| `handleChainStart` | 链开始执行 | `serialized`, `inputs` |
| `handleChainEnd` | 链执行完成 | `outputs` |
| `handleToolStart` | 工具开始执行 | `serialized`, `input` |
| `handleToolEnd` | 工具执行完成 | `output` |
| `handleAgentAction` | Agent 执行动作 | `action` |
| `handleText` | 输出文本 | `text` |
| `handleError` | 发生错误 | `error` |

### 6.6 监控和追踪示例

```typescript
class MonitoringCallback extends BaseCallbackHandler {
  name = "MonitoringCallback";
  private metrics = {
    llmCalls: 0,
    toolCalls: 0,
    chainCalls: 0,
    totalTokens: 0,
    latency: [] as number[],
  };
  private _startTime = 0;

  handleLLMStart(serialized: any, prompts: any): void {
    this.metrics.llmCalls++;
    this._startTime = Date.now();
  }

  handleLLMEnd(output: any): void {
    const elapsed = (Date.now() - this._startTime) / 1000;
    this.metrics.latency.push(elapsed);
    // 计算 token 使用
    if (output?.llmOutput?.tokenUsage?.totalTokens) {
      this.metrics.totalTokens += output.llmOutput.tokenUsage.totalTokens;
    }
  }

  handleToolStart(serialized: any, input: any): void {
    this.metrics.toolCalls++;
  }

  getSummary() {
    const latency = this.metrics.latency;
    return {
      totalLlmCalls: this.metrics.llmCalls,
      totalToolCalls: this.metrics.toolCalls,
      totalTokens: this.metrics.totalTokens,
      avgLatency: latency.length > 0 ? latency.reduce((a, b) => a + b, 0) / latency.length : 0,
      maxLatency: latency.length > 0 ? Math.max(...latency) : 0,
    };
  }
}

// 使用监控回调
const monitor = new MonitoringCallback();
const chain = new LLMChain({
  llm,
  prompt: PromptTemplate.fromTemplate("{input}"),
  callbacks: [monitor],
});

const result = await chain.call({ input: "问题" });
console.log(monitor.getSummary());
```

---

## 附录

### 常用导入速查

```typescript
// 核心组件
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser, JsonOutputParser } from "@langchain/core/output_parsers";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

// 链
import { LLMChain, ConversationChain, RetrievalQAChain } from "langchain/chains";

// Agent
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// 工具
import { tool, StructuredTool } from "langchain/core/tools";

// 内存
import { BufferMemory, ConversationBufferWindowMemory, ConversationSummaryMemory } from "langchain/memory";

// 向量存储
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { FAISS } from "@langchain/community/vectorstores/faiss";
import { OpenAIEmbeddings } from "@langchain/openai";

// 回调
import { BaseCallbackHandler, ConsoleCallbackHandler } from "@langchain/core/callbacks";
```

### 参考资源

- [LangChain 官方文档](https://docs.langchain.com/)
- [LangChain.js 官方文档](https://js.langchain.com/)
- [LangGraph 官方文档](https://langchain-ai.github.io/langgraph/)
- [LangSmith 平台](https://docs.smith.langchain.com/)
- [LCEL 最佳实践](https://python.langchain.com/docs/expression_language/)