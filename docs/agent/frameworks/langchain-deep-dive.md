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

## 1. LangChain 核心概念

### 1.1 LCEL (LangChain Expression Language)

LCEL 是 LangChain 的核心表达式语言，提供了一种声明式的方式来组合 LangChain 组件。它使得构建和处理链变得直观且易于理解。

#### 1.1.1 基础语法

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

#### 1.1.2 Runnable 接口

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

#### 1.1.3 并行执行

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

#### 1.1.4 条件路由

```typescript
import { RunnableBranch } from "@langchain/core/runnables";

const router = new RunnableBranch(
  [(x: { query: string }) => x.query.includes("代码"), codeChain],
  [(x: { query: string }) => x.query.includes("数学"), mathChain],
  generalChain  // 默认链
);

const result = await router.invoke({ query: "如何用 JavaScript 写快速排序" });
```

#### 1.1.5 配置和别名

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

#### 1.2.1 LLMChain

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

#### 1.2.2 ConversationChain

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

#### 1.2.3 RetrievalQA

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

#### 1.2.4 链的类型对比

| 链类型 | 适用场景 | 特点 |
|--------|----------|------|
| `LLMChain` | 通用场景 | 最基础的链，灵活度高 |
| `ConversationChain` | 对话系统 | 内置对话内存管理 |
| `RetrievalQA` | RAG 应用 | 集成向量检索能力 |
| `SequentialChain` | 多步骤处理 | 按顺序执行多个链 |
| `TransformChain` | 数据转换 | 自定义转换逻辑 |

#### 1.2.5 SequentialChain（顺序链）

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

#### 1.3.1 Prompt 模板

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
// 第 1 段：引入 PromptTemplate 模板工具（构建可复用提示词的核心类）
// PromptTemplate 是 LangChain 中用于把「固定文本骨架」与「运行时变量」解耦的基础构件，
// 它的价值在于：模板只定义一次，之后可以反复用不同数据渲染，避免手工拼接字符串带来的错漏。
import { PromptTemplate } from "@langchain/core/prompts";

// 第 2 段：定义模板骨架（用 fromTemplate 解析占位符，而非手工字符串拼接）
// fromTemplate 会扫描文本里的 {xxx} 占位符并自动生成对应的输入变量清单，
// 因此这里的模板已经契约化地要求三个变量：productName、category、targetAudience。
// 易错点：模板中若出现业务上想原样保留的花括号（如 JSON 示例），会被误判为变量而报错，需转义为 {{ }}。
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

// 第 3 段：填入变量并渲染出最终提示词（invoke 是异步的，返回的是待发送给模型的完整文本）
// 数据流：三个字段 → 替换模板占位符 → 得到一段自然语言 prompt，顺序与命名必须和模板占位符严格一致，
// 缺字段会抛校验错误、多字段则被忽略（具体行为取决于 LangChain 版本），因此这一步相当于一次隐式类型检查。
// 注意：顶层 await 要求当前模块是 ESM（.mts 或 package.json 中 "type": "module"），否则需要包在 async 函数里。
const prompt = await template.invoke({
  productName: "iPhone 15",
  category: "智能手机",
  targetAudience: "追求高端体验的消费者",
});
```
**Few-shot 提示**

```typescript
// 第 1 段：导入依赖——FewShotPromptTemplate 负责"拼接整段少样本提示词"，PromptTemplate 负责"渲染其中每一条示例"
// 两者来自 @langchain/core：前者是外层容器（管 prefix/示例集合/suffix），后者是内层单元模板。
// 拆成两行 import 只是风格问题，语义上等价于一次解构导入；不要误以为前者继承了后者——它们是组合关系。
import { FewShotPromptTemplate } from "@langchain/core/prompts";
import { PromptTemplate } from "@langchain/core/prompts";

// 第 2 段：定义 few-shot 示例集——这是喂给模型的"示范样本"，用来固定输出格式与判定口径
// 每个对象的键名（input/output）必须与下一段 exampleTemplate 里的占位符一一对应，缺一个就会在格式化时报缺失变量。
// 注意 output 写成 "sentiment: xxx" 这种带前缀的形式，是在用示例本身教会模型"输出要带标签前缀"，而不是让它自由发挥。
const examples = [
  { input: "今天天气真好", output: "sentiment: positive" },
  { input: "这个产品太差了", output: "sentiment: negative" },
  { input: "味道一般般", output: "sentiment: neutral" },
];

// 第 3 段：定义单条示例的渲染模板——决定"每条示例长什么样"，而不是整段提示词长什么样
// template 中的 {input}/{output} 是运行时由 examples 里对应字段填充的槽位；inputVariables 是对槽位的显式声明，
// 用于让框架在 format 前做变量校验。这里留着它是有意义的：一旦 examples 的键名写错，会在构造/格式化阶段早期暴露，而不是静默产出错误提示词。
const exampleTemplate = new PromptTemplate({
  template: "输入: {input}\n输出: {output}",
  inputVariables: ["input", "output"],
});

// 第 4 段：组装最终提示词——把 prefix、若干条已渲染示例、suffix 按顺序拼成一段完整文本
// 最终结构为：prefix + 示例1 + 示例2 + 示例3 + suffix，各块之间用默认分隔符 "\n\n" 连接（可通过 exampleSeparator 调整）。
// 关键易错点：外层 inputVariables 只声明 ["sentence"]，因为 {sentence} 只出现在 suffix 里；
//   examples 中的 input/output 已被 examplePrompt（exampleTemplate）消化，绝不能再写进这里，否则 format 会误报缺少 input/output 变量。
// 数据流：调用 prompt.format({ sentence: "..." }) 时，框架先用 exampleTemplate 逐条渲染 examples，
//   再把结果插入 prefix 与 suffix 之间；因此推理成本随示例条数线性增长，示例不是越多越好。
const prompt = new FewShotPromptTemplate({
  examples,
  examplePrompt: exampleTemplate,
  prefix: "判断以下句子的情感倾向：",
  suffix: "输入: {sentence}\n输出:",
  inputVariables: ["sentence"],
});
```
#### 1.3.2 Output Parsers

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

// 第 1 段：装配解析器（先把"文本 -> 对象"的契约钉死）
// StructuredOutputParser 的职责是双向的：它既能把 zod schema 翻译成一段自然语言格式说明
// （通过 getFormatInstructions() 注入 prompt，告诉模型该吐什么形状的 JSON），
// 又能在链路末端把模型返回的字符串解析并校验成真正的 JS 对象。
// 所以 schema 必须与 prompt 里注入的格式说明同源，否则模型按 A 格式答、这里按 B 格式解，必炸。
const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    // describe() 不是给人看的文档，而是会被拼进格式说明、直接送到模型面前的行为指令，
    // 写清楚字段语义能显著降低字段错填/漏填率。
    name: z.string().describe("产品名称"),
    price: z.number().describe("产品价格"),
    features: z.array(z.string()).describe("产品特性列表"),
    // min/max 只做"事后校验"，不会约束模型生成：越界时抛错而非自动裁剪，
    // 因此 1-5 这个范围必须同时在 prompt 的字段描述中重申，否则偶发越界会让整条链失败。
    rating: z.number().min(1).max(5).describe("用户评分 1-5"),
  })
);

// 第 2 段：串成链（LCEL 的 pipe 是"数据流方向"声明）
// pipe 的顺序等价于函数组合，左端产出的字符串/消息会作为右端输入；
// parser 必须放在最后，因为它消费的是模型吐出的**原始文本**，
// 若放到 llm 之前就会试图解析 prompt 对象，类型与语义都对不上。
// 隐含前提：prompt 模板里已经嵌入了 parser.getFormatInstructions()，否则模型不知道要输出 JSON。
const chain = prompt.pipe(llm).pipe(parser);

// 第 3 段：执行并取结构化结果
// chain.invoke 返回的是 Promise，await 之后拿到的已经是解析+校验过的对象，
// 无需再手动 JSON.parse；代价是这一步同时承担了网络调用与校验，
// 任一环节失败（模型输出非法 JSON、字段缺失、rating 越界）都会在这里以异常形式抛出。
const result = await chain.invoke({});
// result 是结构化对象
```
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
// 第 1 段：导入依赖——取得工具工厂与参数校验库
// tool 来自 LangChain，用来把普通异步函数包装成带 name/description/schema 的“工具”，供 Agent 决策调用；
// z（zod）在当前文件里其实未被使用（下面 schema 用的是 JSON Schema 字面量），保留它通常意味着后续要迁移到 Zod 校验。
import { tool } from "langchain/core/tools";
import { z } from "zod";

// 第 2 段：get_current_time —— 返回当前时间字符串的工具
// 数据流：模型依 schema 生成 { format } → 解构时用默认值兜底（schema 未声明 required，故 format 可缺失）→ 返回格式化字符串。
// 关键易错点：toLocaleString 的第二个参数是 Intl.DateTimeFormatOptions，并无 "format" 字段，
// 因此这里传入的 "%Y-%m-%d %H:%M:%S" 实际不会生效；若要支持 strftime 占位符需自行做模板替换。
const getCurrentTime = tool(
  // 工具主体：默认值保证即使用户不传 format 也不会是 undefined
  async ({ format = "%Y-%m-%d %H:%M:%S" }) => {
    return new Date().toLocaleString("zh-CN", { format });
  },
  // 工具元信息：name/description 决定模型在何时挑选它，schema 用 JSON Schema 描述入参
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

// 第 3 段：calculate —— 用 Function 构造器求值数学表达式的工具
// 数据流：拿到 expression → 包成 `return (表达式)` 的源码 → 以严格模式即时编译执行 → 转成字符串返回。
// 复杂度：每次调用都要走一次 JS 编译（parse + 优化），成本远高于直接运算，仅适合演示；
// 边界/易错点：一旦表达式抛错会被 catch 兜住并转成文本，避免异常冒泡中断整条 Agent 链路。
const calculate = tool(
  // 显式标注参数类型，弥补此处 schema 与 TS 类型分离带来的不一致
  async ({ expression }: { expression: string }) => {
    try {
      // 安全计算（生产环境应使用安全的评估器）
      // 风险提示：Function 会在全局作用域下执行，等于把任意代码执行权交给调用方，绝不可直接接入不可信输入；
      // 另外描述里举例的 sqrt(16) 在当前实现下会 ReferenceError（JS 无裸 sqrt），会被下方 catch 捕获成错误文本。
      const result = Function(`"use strict"; return (${expression})`)();
      return String(result);
    } catch (e) {
      // 把异常降级为可读文本而非抛出，保证工具调用始终有返回值
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
      // 这里声明了必填项，缺参时会被运行时/schema 校验拦截，早于函数体执行
      required: ["expression"],
    },
  }
);

// 第 4 段：get_weather —— 查询天气的工具（示例中用桩数据代替真实 API）
// 数据流：location 必填、unit 选填且默认 celsius → 直接返回拼好的中文天气文案。
// 易错点：返回值是硬编码的“晴朗/25°C”，完全没有使用 unit（华氏会失效）与 location（只是插进文案）；
// 真接入 API 时需按 unit 转换温标、处理网络超时与地区查无此地的失败分支。
const getWeather = tool(
  // unit 带默认值，与 schema 里的 default 保持同一语义
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
        // enum 把取值收窄为两个合法字面量，模型只能从中选择，省去函数内再做合法性判断
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

#### 2.3.1 bindTools 方法

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

#### 2.3.2 ToolCall 序列化

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

#### 2.4.1 ToolMessage

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

#### 2.4.2 ToolNode

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

#### 2.4.3 完整工具调用流程

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
// 第 1 段：引入基类（为什么自定义记忆必须继承它）
// BaseMemory 定义了 loadMemoryVariables / saveContext / clear / memoryVariables 这套契约，
// 继承它才能被 LangChain 的 Chain 当作标准 Memory 使用；导入路径 "langchain/memory" 是 v0.x 的聚合入口。

interface CustomMemoryInput {
  history: string[];
}
// 第 2 段：声明输入/输出的形状（类型即文档）
// 这两个 interface 只是把"输入应含 history 数组、输出应含 history 字符串"显式写出来，
// 便于对照 loadMemoryVariables 的返回值；注意本文件并未在签名中引用它们，属于可选约束。

interface CustomMemoryOutput {
  history: string;
}

class CustomMemory extends BaseMemory {
  // 第 3 段：内部状态（唯一的数据源）
  // 用私有数组保存每一轮对话，而不是直接存拼接后的字符串——
  // 数组便于追加且能按需重排/截断；真正的拼接延迟到读取时做（见 loadMemoryVariables）。
  // 代价是历史随轮次线性增长，长会话需自行加窗口截断，否则会撑大 prompt 与内存。
  private _history: string[] = [];

  async loadMemoryVariables(inputs: Record<string, unknown>): Promise<Record<string, unknown>> {
    // 第 4 段：读取记忆（把内部数组投影成 prompt 可用的变量）
    // Chain 在拼 prompt 前会调用它；返回的 key 必须与 memoryVariables 声明的一致，否则模板取不到值。
    // 这里 join("\n") 把多轮合并成单个文本块，天然丢失结构（谁问谁答只靠箭头分隔），
    // 若下游需要结构化历史，应改返回数组而非字符串；inputs 此处未使用，说明本实现不做条件检索。
    return { history: this._history.join("\n") };
  }

  async saveContext(inputs: Record<string, unknown>, outputs: Record<string, unknown>): Promise<void> {
    // 第 5 段：写入记忆（在每轮生成结束后被调用）
    // inputs 是用户侧输入（含 input 字段），outputs 是模型侧输出（含 response 字段），
    // 二者在 Chain 生命周期中分属"开始"与"结束"两个时刻，所以必须成对传入才能拼出一条完整对话。
    // 用字符串模板 + 箭头符号做序列化是刻意简化：不校验字段是否存在，缺失时会写成 "undefined -> undefined"。
    this._history.push(`${inputs.input} -> ${outputs.response}`);
  }

  async clear(): Promise<void> {
    // 第 6 段：清空记忆（重置会话）
    // 直接替换为空数组而非 length = 0，是为了让旧数组失去引用、可被 GC 回收；
    // 复杂度 O(1)（对比逐个 pop）。它不会清理外部传入的 inputs/outputs，那些由调用方负责。
    this._history = [];
  }

  get memoryVariables(): string[] {
    // 第 7 段：对外声明变量名（配置期的"契约"）
    // BaseMemory 依赖该 getter 在构建 prompt 时得知要注入哪些键；
    // 它必须与 loadMemoryVariables 返回的键逐一对应，两者不一致是最常见的静默失效（模板变量为空）。
    // 返回新数组字面量，避免外部拿到内部引用后意外篡改。
    return ["history"];
  }
}
```
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

#### 5.2.1 HNSWLib (本地向量存储)

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

#### 5.2.2 Pinecone

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

#### 5.2.3 FAISS

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

#### 5.2.4 向量存储对比

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

## 6. Callbacks 和监控

### 6.1 回调系统概述

LangChain 的回调系统允许在链执行过程中添加日志、监控和自定义逻辑。

```typescript
// 第 1 段：导入依赖 —— 引入 LangChain 回调基类与 OpenAI 模型
// BaseCallbackHandler 是所有回调处理器的抽象基类，它已经为每个生命周期钩子
// 提供了空实现（no-op），因此子类只需覆盖自己关心的方法，不必实现全部接口。
// ChatOpenAI 此处虽未直接实例化，但回调 handler 最终是要挂到它（或链/Agent）上
// 通过 callbacks 参数生效的，所以保留该导入以示意典型使用场景。
import { BaseCallbackHandler } from "@langchain/core/callbacks";
import { ChatOpenAI } from "@langchain/openai";

// 第 2 段：定义自定义回调处理器 —— 继承基类以获得全套生命周期钩子
// name 是回调的唯一标识，会出现在日志/追踪系统中；若多个 handler 同名，
// 排查问题时容易混淆，建议保持业务语义可读。
// 关键点：所有钩子都是"同步 void 返回"，如果内部要做异步 IO（如上报埋点），
// 应谨慎处理，否则会阻塞主流程或产生未捕获的 Promise。
class CustomCallbackHandler extends BaseCallbackHandler {
  name = "CustomCallback";

  // 第 3 段：LLM 生命周期钩子 —— 覆盖"开始 / 流式 token / 结束"三个阶段
  // handleLLMStart 在请求发出前触发；serialized 是被序列化后的模型元信息
  // （如模型类名、参数），prompts 是本次送给模型的提示列表。
  // 易错点：流式模式下 handleLLMNewToken 可能被高频调用，切忌在此做重 IO。
  handleLLMStart(serialized: any, prompts: any): void {
    console.log("LLM 开始处理...");
  }

  // 每收到一个增量 token 就触发一次，是"打字机效果"的数据来源。
  // 使用 process.stdout.write 而非 console.log，是为了不换行、实现逐字拼接输出。
  handleLLMNewToken(token: string): void {
    process.stdout.write(`Token: ${token}`);
  }

  // 流式输出结束后补一个换行，避免后续日志与最后一行 token 粘连。
  handleLLMEnd(output: any): void {
    console.log("\nLLM 处理完成");
  }

  // 第 4 段：链（Chain）生命周期钩子 —— 观测链的输入输出
  // handleChainStart 的 serialized.name 是链的名称，某些动态构造的链可能没有
  // name 字段，故用 "unknown" 兜底，防止模板字符串输出 undefined。
  handleChainStart(serialized: any, inputs: any): void {
    console.log(`链开始: ${serialized.name || "unknown"}`);
  }

  // handleChainEnd 一次性拿到链的最终输出；注意它与 LLM/工具钩子是嵌套关系：
  // 外层链结束时，内部的 LLM 与工具早已各自触发过自己的结束钩子。
  handleChainEnd(outputs: any): void {
    console.log(`链完成:`, outputs);
  }

  // 第 5 段：工具（Tool）生命周期钩子 —— 观测 Agent 调用外部工具的过程
  // 工具的 input 是模型生成的参数（可能是 JSON 字符串或对象），
  // output 是工具的真实返回值，两者是调试工具调用失败时最关键的证据。
  handleToolStart(serialized: any, input: any): void {
    console.log(`工具开始: ${serialized.name || "unknown"}`);
  }

  handleToolEnd(output: any): void {
    console.log(`工具完成:`, output);
  }

  // 第 6 段：Agent 决策钩子 —— 记录模型选择的"动作"
  // action 描述了 Agent 决定调用哪个工具、传入什么参数（含 tool / toolInput / log 等字段）。
  // 触发顺序：Agent 先产出 Action → 执行对应 Tool（触发上面的工具钩子）→ 得到 Observation
  // → 再次进入 LLM 推理，如此循环直到给出最终答案。这一钩子是理解 ReAct 循环的观察点。
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
// 第 1 段：导入追踪器（引入 LangChain 官方的追踪回调实现）
// LangChainTracer 本质是一个 callback handler：它监听链/LLM/工具的执行事件并上报到 LangSmith，
// 必须先拿到这个类才能构造出可挂载的 tracer 实例。
import { LangChainTracer } from "@langchain/core/tracers";

// 第 2 段：创建 tracer 实例并绑定上报目标
// projectName 决定事件落到 LangSmith 的哪个项目，需与平台侧项目名一致；
// 实例在模块级只建一次即可复用，重复 new 会产生重复的追踪会话/额外开销。
const tracer = new LangChainTracer({
  projectName: "my-project",
});

// 第 3 段：在被追踪的上下文中执行链调用
// tracingV2Enabled 接收「带 callbacks 的配置对象」+ 一段异步函数，会把 callbacks 注入到
// 内部执行链路，使后续 chain.invoke 自动埋点——这正是不必每次手动传 callbacks 的原因。
// 易错点：回调是异步的且真正的 await 发生在这里，若函数内不 return result，结果会滞留在闭包中。
await tracingV2Enabled(
  { projectName: "my-project", callbacks: [tracer] }, // 项目名与 tracer 保持一致，确保事件归集到同一处
  async () => {
    const result = await chain.invoke({ input: "问题" }); // 业务调用：其轨迹会被上面的 callbacks 捕获并上报
  }
);
```
**FileCallbackHandler - 文件日志**

```typescript
// 第 1 段：引入文件回调处理器（把 LangChain 运行期事件落盘的能力接进来）
// FileCallbackHandler 来自 @langchain/community，实现了 BaseCallbackHandler；
// 框架会在链/LLM 的开始、结束、报错等生命周期节点自动回调它，从而把执行轨迹写成日志。
import { FileCallbackHandler } from "@langchain/community/callbacks";

// 第 2 段：确定日志路径并创建处理器实例
// 路径抽成常量便于集中修改；handler 以「追加模式」打开该文件，构造时即建立写入流,
// 因此文件通常在此刻就被创建——运行进程需要对所在目录有写权限，否则这里会抛错。
const logFile = "chain_execution.log";
const handler = new FileCallbackHandler(logFile);

// 第 3 段：组装 LLMChain，并把处理器挂载到 callbacks
// callbacks 设计成数组，意味着可并列追加多个 handler（如控制台 + 文件）接收同一份事件；
// 事件数据流：外部传入 input → PromptTemplate.fromTemplate("{input}") 渲染出最终提示词
// → llm 执行 → 各生命周期事件回灌到上面的 handler → 写入日志文件。
// 易错点：LLMChain 与 PromptTemplate 在此被使用却未在本文件 import（需从 @langchain/core 或 langchain 引入），
// 缺少导入会在运行时报 ReferenceError；另外 {input} 是必填变量，调用时漏传会导致模板渲染失败。
const chain = new LLMChain({
  llm,
  prompt: PromptTemplate.fromTemplate("{input}"),
  callbacks: [handler],
});
```
### 6.4 异步回调

```typescript
// 第 1 段：定义异步自定义回调处理器，并声明回调名
// 这里继承 BaseCallbackHandler，是为了让 LangChain 在执行链/LLM 时能通过统一接口回调我们。
// name 字段会出现在日志与事件追踪中，便于在多个 handler 并存时定位来源，建议保持唯一。
class AsyncCustomHandler extends BaseCallbackHandler {
  name = "AsyncCustomCallback";

  // 第 2 段：LLM 开始回调（异步）
  // 每次 LLM 请求发起前触发，适合做埋点计时、日志记录；因为声明为 async，
  // 框架会 await 它，所以不要在这里做耗时阻塞操作，否则会拖慢整条链的启动。
  async handleLLMStart(serialized: any, prompts: any): Promise<void> {
    console.log("LLM 开始 (异步)");
  }

  // 第 3 段：流式新 token 回调（异步）
  // 每当模型吐出一个 token 就会调用一次，是流式输出的核心钩子。
  // 关键点：用 process.stdout.write 而非 console.log，是为了避免每次输出都换行，
  // 从而让 token 连续拼接成完整文本；此处单次调用频率极高，逻辑越轻越好。
  async handleLLMNewToken(token: string): Promise<void> {
    process.stdout.write(`Token: ${token}`);
  }

  // 第 4 段：LLM 结束回调（异步）
  // 在模型输出全部完成后触发，常与 handleLLMStart 配对，
  // 用于计算耗时、落库完整结果或释放资源，边界条件是：出错时可能不会走到这里。
  async handleLLMEnd(output: any): Promise<void> {
    console.log("LLM 完成 (异步)");
  }
}

// 第 5 段：实例化处理器
// 回调对象需要被复用而非每次调用都新建，否则会丢失跨事件的内部状态（如计时起点），
// 因此在这里创建单例，后续通过 callbacks 数组注入到链中。
const asyncHandler = new AsyncCustomHandler();

// 第 6 段：异步执行链并接入回调
// 通过 invoke 的第二个参数 callbacks 注入 handler，框架会在各生命周期节点回调它。
// 数据流为：invoke 触发 handleLLMStart → 多次 handleLLMNewToken → handleLLMEnd。
// 易错点：忘写 await 会让 runChain 提前 resolve，拿到的是 Promise 而非最终结果；
// 用 async/await 保证调用方等到链真正结束再消费 result。
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
  // 第 1 段：类身份与实例级指标容器（监控器的"账本"）
  // 继承 BaseCallbackHandler 后，LangChain 会在链路各节点自动回调这里的 handleXxx 方法，
  // 因此指标必须存在实例字段上而不是局部变量，才能跨多次回调累积。
  // latency 用数组而非"总和+计数"，是为了后续能算平均值、最大值乃至分位数。
  name = "MonitoringCallback";
  private metrics = {
    llmCalls: 0,
    toolCalls: 0,
    chainCalls: 0,
    totalTokens: 0,
    latency: [] as number[],
  };
  private _startTime = 0;

  // 第 2 段：LLM 起止配对——用时间戳差估算单次调用耗时
  // 关键数据流：handleLLMStart 记录起点（毫秒时间戳）→ handleLLMEnd 用 Date.now() 相减得到毫秒，再 /1000 转秒。
  // 易错点：_startTime 是共享的单个字段，若并发或嵌套调用 LLM，后一次 Start 会覆盖前一次的起点，
  // 导致前面那次 End 算出的耗时偏小；高并发场景应改为栈或 Map<runId, startTime>。
  handleLLMStart(serialized: any, prompts: any): void {
    this.metrics.llmCalls++;
    this._startTime = Date.now();
  }

  handleLLMEnd(output: any): void {
    const elapsed = (Date.now() - this._startTime) / 1000;
    this.metrics.latency.push(elapsed);
    // 计算 token 使用
    // 边界条件：不同模型/供应商返回结构不一致，tokenUsage 或 totalTokens 可能缺失，
    // 所以用可选链 + 真值判断做防御，避免 NaN 混入累计值（totalTokens 为 0 时也会被跳过）。
    if (output?.llmOutput?.tokenUsage?.totalTokens) {
      this.metrics.totalTokens += output.llmOutput.tokenUsage.totalTokens;
    }
  }

  // 第 3 段：工具调用计数——只统计次数，不记时
  // 工具调用可能由 LLM 触发多次，此处只做累加即可；serialized/input 是回调签名要求，
  // 当前统计不需要它们，故不读取，保持 O(1) 开销。
  handleToolStart(serialized: any, input: any): void {
    this.metrics.toolCalls++;
  }

  // 第 4 段：汇总快照——把原始累积量加工成对外可读的报表
  // 先取局部引用 latency，避免多次属性查找；空数组要显式兜底成 0，
  // 因为 reduce 无初值时对空数组会抛错，Math.max(...[]) 会得到 -Infinity。
  // 复杂度：求平均与求最大都是 O(n)，n 为已完成 LLM 调用次数；Math.max 展开还有参数个数上限的隐患，
  // 超大 n 时更稳妥的写法是 reduce 逐项比较。
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

// 第 5 段：装配与运行——把监控器接入链路并读取结果
// callbacks 数组是 LangChain 的回调注入点：monitor 实例被挂到 chain 上，
// 同一次 chain.call 内部产生的 LLM/工具事件都会回流到上面几个 handle 方法。
// 因为 chain.call 已 await，回调必然先于 getSummary 执行完毕，统计值此时才是终态。
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
## 7. 附录

### 7.1 常用导入速查

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

### 7.2 参考资源

- [LangChain 官方文档](https://docs.langchain.com/)
- [LangChain.js 官方文档](https://js.langchain.com/)
- [LangGraph 官方文档](https://langchain-ai.github.io/langgraph/)
- [LangSmith 平台](https://docs.smith.langchain.com/)
- [LCEL 最佳实践](https://python.langchain.com/docs/expression_language/)

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MCP Tools 概念](https://modelcontextprotocol.io/docs/concepts/tools) | 官方定义 tool schema 与输入校验，是设计 LangChain 工具的标准参考。 | 读 Tools 一节，带着“如何描述输入”的问题，为一个 API 写出完整 schema。 |
| ['Callbacks'](https://yew.rs/docs/advanced-topics/struct-components/callbacks) | 官方 Callbacks 文档，掌握 LangChain 监控与事件钩子的权威入口。 | 读 advanced-topics 的 callbacks 章节，聚焦回调触发时机，读后写一个日志回调。 |
| [Claude Agent SDK 概览](https://docs.claude.com/en/api/agent-sdk/overview) | 官方 SDK 概览，展示工具调用日志与 Agent 构建流程，可类比 LangChain。 | 用 SDK 写一个读取目录并总结的小 Agent，观察工具调用日志，读后对比 LangChain。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [smolagents 仓库](https://github.com/huggingface/smolagents) | 核心代码不到千行，是理解最小 Agent 循环的最佳源码。 | 阅读 agent loop 与工具调用部分，对照 LangChain AgentExecutor，读后手写一个简化循环。 |
| [pi 编码 Agent 工具集](https://github.com/earendil-works/pi) | 展示 agent loop 与统一 LLM API 的工程实现，可对照 LangChain 找差异。 | 读 agent loop 实现，带着“状态如何传递”的问题，读后重构自己的循环。 |
| [Inspect AI 仓库](https://github.com/UKGovernmentBEIS/inspect_ai) | 提供 agent 评测与沙箱示例，对 Callbacks 和监控章节很有参考价值。 | 读 examples 里的 agent 评测，了解工具评分方式，读后为你的 Agent 写一个评测用例。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [LLM Powered Autonomous Agents（Lilian Weng）](https://lilianweng.github.io/posts/2023-06-23-agent/) | 系统梳理 Agent 的规划、记忆、工具，是理解核心概念的最佳入门。 | 精读规划、记忆、工具三节，带着“LangChain 如何实现”的问题，读后画出组件关系图。 |
| [Generative Agents](https://arxiv.org/abs/2304.03442) | 深入 memory stream 设计，对理解 LangChain 记忆检索机制极有帮助。 | 读 memory stream 与检索部分，思考如何映射到 LangChain Memory，读后设计一个检索评分函数。 |
| [DeepLearning.AI 短课程](https://www.deeplearning.ai/short-courses/) | 短小精悍，能快速上手 Agent 或 RAG 的实战流程。 | 选 RAG 主题一门，边看边在 notebook 改参数，读后复现一个检索问答链。 |
| [Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | 教你如何写出 Agent 易调用的工具，直接提升工具系统设计质量。 | 按文中原则审查现有工具定义，改写名称与描述，对比调用成功率。 |
| [A practical guide to building agents（OpenAI）](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | 用“模型、工具、指令”三要素框架，帮你快速检查 Agent 设计是否完整。 | 读完三要素章节，对照自己的 Agent 设计，列出缺失项并补全。 |
| [Agents（Chip Huyen）](https://huyenchip.com/2025/01/07/agents.html) | 工具与规划章节讲得透彻，能帮你发现 Agent 设计中缺失的环节。 | 读工具与规划章节，对照你的 Agent 找出缺失环节，读后补全设计文档。 |
| [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) | 真实多 Agent 系统架构复盘，帮助你判断何时需要拆分多 Agent。 | 画出 lead agent 与 subagent 的调用关系图，思考拆分时机，读后评估自己的场景。 |

## 应用与行业实践

前面几节讲的是零件，这一节讲这些零件装到哪台机器上、装完怎么验收。行业里的做法可以归纳成一句话：把模型放在它擅长的那一环，其余交给已有系统。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行订单表格，运营用一句话筛选 | 工具系统 (Tools)、Agent 架构 | 模型输出 Pydantic 参数，交给已有查询接口 | 参数走白名单校验，不要让模型直接拼 SQL |
| 运维手册的现场问答，值班人员用手机查 | 向量存储和 RAG、Callbacks 和监控 | 按标题切分加元数据过滤，答案标注片段编号 | 手册改版后要重建索引，否则答的是旧版 |
| 客服工单的草稿回复，坐席确认后发送 | 内存系统 (Memory)、Callbacks 和监控 | 按工单号隔离会话历史，草稿只落到待审队列 | 涉及金额与承诺时效的句子必须人工改写 |
| 低端安卓机上的 AI 助手首屏 | Callbacks 和监控 | 检索与模型调用放服务端，客户端只做流式渲染 | 首 token 超过 2 秒用户就会重复点击，接口要防重入 |
| 多人协作白板的会议纪要抽取 | Agent 架构、工具系统 (Tools) | 工具读取白板元素 JSON，模型只做归纳 | 说话人归属靠 ID 字段，不能让模型猜 |
| 招聘简历与 JD 的匹配排序 | 向量存储和 RAG | 简历分段入库，用 JD 段落做查询 | 排序结果不作为淘汰依据，保留人工复核 |
| 电商差评的批量打标 | 工具系统 (Tools)、Callbacks 和监控 | 任务切片调用，标签集合固定为枚举值 | 并发限流，失败条目要能单独重跑 |
| 财务对账差异的说明生成 | 向量存储和 RAG、工具系统 (Tools) | 工具只读查询差异明细，模型写说明文字 | 模型不做加减计算，数字全部来自查询结果 |

### 三个场景拆解

#### 场景 1：后台万行表格的自然语言筛选

**业务背景**：运营在后台找订单，要先想清楚状态、金额区间、时间范围三个下拉框怎么组合，改一次条件点三次查询。把全量订单按人工翻页找完，单次操作的时间可以用秒表测出来。

**怎么用本页知识解决**：思路是让模型只做一件事，把中文句子翻译成后端接口的参数，查询、分页、权限全部留在后端。

```python
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate

class OrderFilter(BaseModel):                 # 字段即后端查询参数，模型只能填这些
    status: str = Field(description="订单状态，取值必须在白名单内")
    min_amount: float = Field(description="最小金额，单位元")
    days: int = Field(description="最近天数，1 到 90")

@tool("query_orders", args_schema=OrderFilter)
def query_orders(status: str, min_amount: float, days: int) -> list:
    """把结构化参数交给已有的订单查询接口，不拼 SQL。"""
    return order_api.search(status=status, min_amount=min_amount, days=days)

prompt = ChatPromptTemplate.from_messages([
    ("system", "把筛选需求转成 query_orders 的参数；缺少字段就先追问，不要猜。"),
    ("human", "{question}"),
])
llm_with_tools = llm.bind_tools([query_orders])   # 模型输出参数，不接触数据库
```

- 参数 schema 用 Pydantic 写死，模型填不出白名单以外的状态值，后端不用再解析自然语言。
- 工具函数体只有一行转发，权限、分页、审计留在后端接口里，模型改动不会碰到它们。
- 提示词要求缺字段时追问，避免模型用默认值猜出一次错误的筛选条件。
- `order_api` 是占位名，替换成你项目里的后端客户端，鉴权沿用服务账号。

**怎么度量收益**：固定 200 条历史筛选语句做回归集，统计参数完全正确的比例，用 LangSmith 的 datasets 跑。人工改参率从后端接口日志里数"同一次查询被改参后重发"的条数占比。首 token 延迟取 Callbacks 记录的 p50 与 p95。

**什么时候不该用**：筛选条件就是三个固定下拉框时，界面直接给控件比让模型猜参数快。需要跨表求和、算环比时，模型给的数字不可信，交给 BI 查询。合规要求每条查询都要能解释成可读条件时，模型参数必须留全量审计日志，没有这层记录就先别上。

#### 场景 2：运维手册的现场问答

**业务背景**：值班人员在机房用手机查操作步骤，手册正文加历史公告合起来篇幅不小，全文搜索出来的前几条常是过期公告。可以用秒表测一次"从提问到找到正确段落"的耗时。

**怎么用本页知识解决**：思路是把检索范围先框住，再要求回答必须标注片段来源，读的人自己点回原文确认。

```python
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

retriever = vectorstore.as_retriever(
    search_kwargs={"k": 6, "filter": {"doc_type": "ops_manual"}}  # 只召回运维手册
)
prompt = ChatPromptTemplate.from_template(
    "只依据片段回答，逐条标注片段编号；片段没写到就回答“手册未覆盖”。\n"
    "{context}\n问题：{question}"
)
chain = RunnableParallel(
    context=retriever,
    question=RunnablePassthrough(),
) | prompt | llm | StrOutputParser()

answer = chain.invoke("重启网关前要检查哪几项")   # 输出带编号，方便回查原文
```

- filter 把公告、周报挡在检索之外，值班场景里召回错文档比召回不到代价高。
- k 先设 6，把召回片段原样打印出来人工看一遍，再决定要不要调大或调小。
- 提示词给"未覆盖"留了固定出口，模型没有依据时不会顺手编一段步骤。
- 输出里的片段编号依赖切分阶段写入的元数据，切分时就要保留章节号和页码。

**怎么度量收益**：每周抽 30 条问答，人工判断输出里的片段编号是否真的支持结论，记为引用命中率。准备 10 条手册里没写的问题，看固定回答出现的条数。检索质量用开源项目 ragas 的 context_precision 与 faithfulness 跑同一评测集，指标名以你安装版本的文档为准。

**什么时候不该用**：手册每周改版而重建索引要停服几小时时，先把增量更新做出来再上线问答。问题形如"磁盘告警阈值是多少"的单值查询，用关键词检索或结构化字段直接返回，不必经过模型。法务要求逐字引用、不许改写原文时，输出只能是原文段落，模型不做转述。

#### 场景 3：客服工单的草稿回复

**业务背景**：坐席一天处理几十单，同类问题反复写话术，回复慢且口径不一致。工单系统本身记录了每单的首次响应时长，可以直接导出分布。

**怎么用本页知识解决**：思路是按工单号隔离上下文，让模型写草稿，坐席改完再发，发送动作留在人工手里。

```python
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory

store = {}                                    # 演示用，生产换成 Redis 或数据库实现同一接口

def get_history(session_id: str):
    return store.setdefault(session_id, ChatMessageHistory())   # 一单一个 session_id

chain_with_history = RunnableWithMessageHistory(
    draft_chain,                              # 前面的提示加模型链，负责写草稿
    get_history,
    input_messages_key="question",
    history_messages_key="history",           # 历史按消息列表注入提示
)

draft = chain_with_history.invoke(
    {"question": "客户说昨天付款没到账"},
    config={"configurable": {"session_id": "T-1024"}},
)
draft_queue.put(draft)                        # 只进待审队列，不直接发给客户
```

- session_id 用工单号，坐席切换工单时上下文自然隔离，不会串到上一单。
- 历史按消息列表注入，坐席改过的草稿要作为新消息写回，模型下一轮才看得到改动。
- 草稿进队列而不直接发送，人工审核这一层写在业务代码里，与模型本身无关。
- store 只用于本地演示，换成 Redis 或数据库时实现同样的读取接口。
- 工单里出现身份证号、银行卡号时，写历史前先脱敏，这一步不能省。

**怎么度量收益**：在工单系统里统计直接发送、修改后发送、弃用三种结果的条数占比，记为草稿采纳率。平均处理时长取工单系统自带的响应时长字段，按坐席分组比较改动前后。失败率与 token 用量按天汇总 Callbacks 记录。

**什么时候不该用**：草稿涉及退款金额、赔付比例时，数字必须来自计费系统，模型只填模板空位。客户情绪激动、投诉升级时，坐席需要即时介入，等模型出稿反而拖慢响应。会话历史含未脱敏的个人信息而存储层没有加密时，先解决合规再谈自动化。

### 行业先进实践

**用 schema 约束工具入参（出处：LangChain 官方文档 Tools 章节与 structured output 相关页面）**
做法是把工具参数写成 Pydantic 模型，框架把 schema 交给模型，模型只负责填字段。后端拿到的永远是结构化数据，字段不合法在调用工具前就能拦住。你的项目可以把写操作类工具的参数先全部 schema 化，读操作类排在后面。

**检索结果强制带引用（出处：LangChain 官方文档 RAG 教程章节；Anthropic 的 Citations 功能需核对官方文档，确认当前支持的模型与返回字段）**
做法是生成阶段必须引用检索片段的编号或区间，前端把编号渲染成可点回原文的入口。回查成本从通读整篇文档降到点开一段。你的项目至少要在提示词里留一个"未覆盖"出口，避免无依据作答。

**用数据集做回归而不是靠人肉试（出处：LangSmith 官方文档 datasets 与 evaluation 章节）**
做法是把线上真实问答固化成数据集，提示词、模型、检索参数每次改动都跑同一套评测，分数变化可归因到具体改动。你的项目可以从 30 条问题起步，但数据集定下来后不要随手增删，否则两次分数不可比。

**人在回路的中断点（出处：LangGraph 官方文档 human-in-the-loop 章节）**
做法是在执行写操作前中断流程，把待确认内容交人工，确认后再继续。代价是流程多一步，收益是写操作的影响范围可控。你的项目可以先把"发送、退款、删数据"三类动作设为必审。

**检索质量单独评测（出处：开源项目 ragas）**
做法是把检索与生成拆开测，context_precision、context_recall 看检索，faithfulness 看生成是否贴着片段。两个环节混在一起测，出问题时分不清该换嵌入模型还是改提示词。你的项目要长期保留召回片段的原始日志。

### 从学到用：落地路线

**第 1 步 试点**：选一个只读、答错代价低的内部场景，例如运维手册问答，只做单轮问答，不接写操作。
验收标准：连续两周每天抽 20 条提问，答案带片段编号的比例达到你事先写下的阈值。

**第 2 步 验证**：把试点期间的问答记录整理成固定评测集，用同一脚本跑改动前后的对比。
验收标准：评测集不少于 100 条，两次跑分使用同一份提示词与检索参数，差异能在记录里找到原因。

**第 3 步 推广**：把提示模板、工具定义、评测脚本放进同一个仓库，其他团队复制仓库再改业务参数。
验收标准：第二个场景接入时不改动公共代码，且有自己独立的评测集与阈值。

**第 4 步 防回退**：把评测脚本接进 CI，改动提示词、模型名、检索参数必须附带评测报告。
验收标准：缺少评测报告的合并被 CI 阻止；线上异常能按 trace id 回放到具体一次调用。

### 动手作业

**目标**：给一份 20 到 50 页的内部文档做带引用的问答，输出只写本地文件，由你逐条判定通过或驳回。

**步骤**

1. 选文档：挑一份章节结构清晰、读者明确的内部文档，记录总页数与章节数。
2. 切分入库：按标题层级切分，每段保留文档名、章节号、页码三个元数据字段，写入本地向量库。
3. 跑通检索：k 先设 6，把每次召回的片段原文打印出来，人工确认是否命中。
4. 加提示约束：要求只依据片段回答并标注片段编号，片段未覆盖时回答一句固定的话。
5. 记录轨迹：用 Callbacks 把输入、召回片段编号、输出、耗时写进本地 JSONL 文件。
6. 建评测集：从记录里挑 30 条问题，人工标出正确答案所在章节，冻结成评测集。
7. 接审核口：输出写到一个待审文件，不发送给任何人，由你判定通过或驳回并记录原因。

**验收标准**

- 30 条评测问题中，输出标注的片段编号与人工标注章节一致的比例不低于你写下的阈值，并附原始记录。
- 5 条文档未覆盖的问题全部命中固定回答，重跑一次输出保持一致。
- JSONL 中每条记录都含 session_id、召回片段编号、耗时三个字段，缺字段的记录数为 0。
- 把切分粒度从按章节改成按段落，用同一评测集重跑，能给出两次的指标差值与差异条目清单。
- 一条命令输出评测报告，报告里含评测集版本号与提示词文件哈希。

