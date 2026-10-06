---
title: 多模型集成
description: 介绍如何在 AI Agent 中集成多个 LLM 提供商，实现模型抽象层、成本优化和降级策略。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 多模型集成

> 本文档介绍如何在 AI Agent 中集成多个 LLM 提供商，实现模型抽象层、成本优化和降级策略。

## 1. 为什么需要多模型支持

### 1.1 技术优势

| 优势 | 说明 |
|------|------|
| **供应商独立性** | 避免单点故障，任何提供商宕机可切换 |
| **成本优化** | 不同任务选择性价比最高的模型 |
| **能力互补** | Claude 擅长代码/推理，GPT 擅长创意/GPT 擅长对话 |
| **速率限制** | 多账户分散请求，避免触发限制 |
| **功能特性** | 各家 API 特有功能（如 Claude Vision） |

### 1.2 业务价值

```typescript
// 成本分析示例
const costModel = {
  'claude-3-5-sonnet': { input: 3, output: 15, unit: '1M tokens' },
  'gpt-4o': { input: 5, output: 15, unit: '1M tokens' },
  'gemini-1.5-pro': { input: 1.25, output: 5, unit: '1M tokens' },
};

// 简单查询用 Gemini（便宜）
// 复杂推理用 Claude（能力强）
// 需要 OpenAI 生态时用 GPT-4
```

## 2. LLM 适配器接口设计

### 2.1 核心接口定义

```typescript
// types/llm.ts

// 对话消息
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

// 工具定义
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

// LLM 完成请求参数
export interface CompletionParams {
  messages: Message[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
}

// LLM 完成响应
export interface CompletionResponse {
  content?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: unknown;
  }>;
  finishReason?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// 流式块
export interface StreamChunk {
  delta: string;
  done: boolean;
}
```

### 2.2 适配器接口

```typescript
// adapters/llm-adapter.ts

export interface LLMAdapter {
  // 模型列表
  readonly supportedModels: string[];

  // 非流式完成
  complete(params: CompletionParams): Promise<CompletionResponse>;

  // 流式完成
  stream(params: CompletionParams): AsyncGenerator<StreamChunk>;

  // 获取模型信息
  getModelInfo(model: string): ModelInfo;
}

export interface ModelInfo {
  name: string;
  provider: string;
  maxTokens: number;
  supportsVision: boolean;
  supportsTools: boolean;
  pricing: {
    input: number;  // per 1M tokens
    output: number;
  };
}
```

### 2.3 工厂模式

```typescript
// adapters/factory.ts

// 第 1 段：供应商枚举——用字符串枚举把"供应商"这一概念收敛成单一事实来源
// 之所以用字符串枚举而不是数字枚举，是因为 'anthropic'/'openai'/'google' 本身就是
// 可读且稳定的标识（写日志、拼 URL、读环境变量时可直接使用），避免数字值随枚举顺序变动而失效。
export enum ModelProvider {
  Anthropic = 'anthropic',
  OpenAI = 'openai',
  Google = 'google',
}

// 第 2 段：工厂类声明与注册表字段——集中管理"供应商 → 适配器实例"的映射
// 用 Map 而不是对象字面量，是为了让 key 类型被约束为 ModelProvider，同时保留 O(1) 查找；
// 适配器实例由外部注入（依赖倒置），工厂本身不 new 任何具体实现，因此可测试、可替换。
export class LLMAdapterFactory {
  private adapters: Map<ModelProvider, LLMAdapter> = new Map();

  // 第 3 段：注册入口——把具体适配器写入注册表
  // 这是唯一的写入路径：同一 provider 重复 register 会静默覆盖（后注册胜出），
  // 这既是热替换/测试替身的便利点，也是配置重复时的潜在坑。
  register(provider: ModelProvider, adapter: LLMAdapter): void {
    this.adapters.set(provider, adapter);
  }

  // 第 4 段：按 provider 取适配器——查找失败时快速失败（fail-fast）
  // 不返回 undefined 而是抛错，是为了把"忘记 register"这类装配期错误在首次调用时就暴露，
  // 而不是等到下游 adapter.chat() 里出现难以定位的 TypeError；错误信息带上 provider 方便排障。
  get(provider: ModelProvider): LLMAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Adapter not registered: ${provider}`);
    }
    return adapter;
  }

  // 第 5 段：对外主入口——按模型名分发适配器，屏蔽"模型名 → 供应商"的推断细节
  // 调用方只持有模型字符串（通常来自配置），无需知道供应商枚举，降低了两者的耦合；
  // detectProvider 抛错会直接向上冒泡，因此未知模型在这里表现为异常而非降级。
  forModel(model: string): LLMAdapter {
    const provider = this.detectProvider(model);
    return this.get(provider);
  }

  // 第 6 段：模型名前缀嗅探——纯函数式的名字到供应商映射
  // 前缀匹配是最省事但最脆弱的策略：新模型命名变更（如 'o1' 之外又出 'o3'）会导致漏判，
  // 且不同供应商前缀若重叠，短路顺序就决定了结果，所以顺序本身是隐式契约；
  // 复杂度 O(前缀数)，仅做 startsWith 常数级比较，无正则开销。
  private detectProvider(model: string): ModelProvider {
    if (model.startsWith('claude')) return ModelProvider.Anthropic; // Anthropic 系模型统一以 claude 开头
    if (model.startsWith('gpt') || model.startsWith('o1')) return ModelProvider.OpenAI; // OpenAI 含 chat 系与推理系两套命名
    if (model.startsWith('gemini')) return ModelProvider.Google;
    throw new Error(`Unknown model provider: ${model}`); // 未知模型直接抛出，避免误用默认适配器
  }
}

// 第 7 段：装配与调用示例——展示"先注册、后使用"的生命周期
// 三个 register 必须早于任何 forModel 调用，否则 get 会走到 `Adapter not registered` 分支；
// apiKey 在此被同一个变量传给不同适配器仅作示意，真实场景中不同供应商应使用各自的密钥。
// 使用
const factory = new LLMAdapterFactory();
factory.register(ModelProvider.Anthropic, new AnthropicAdapter(apiKey));
factory.register(ModelProvider.OpenAI, new OpenAIAdapter(apiKey));
factory.register(ModelProvider.Google, new GoogleAdapter(apiKey));

// 第 8 段：解析入口的实际效果——'claude-...' 命中前缀，最终拿到 AnthropicAdapter
// 数据流：'claude-3-5-sonnet-20241022' → detectProvider → ModelProvider.Anthropic → get → 已注册实例；
// 返回类型为 LLMAdapter 基类，调用方依赖抽象而非具体实现，后续替换模型无需改动此段代码。
const adapter = factory.forModel('claude-3-5-sonnet-20241022');
```
## 3. Anthropic Claude 适配器

### 3.1 完整实现

```typescript
// adapters/anthropic.ts

import { LLMAdapter, CompletionParams, CompletionResponse, ModelInfo } from './llm-adapter';

export class AnthropicAdapter implements LLMAdapter {
  readonly supportedModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

  private baseURL = 'https://api.anthropic.com/v1/messages';
  private version = '2023-06-01';

  constructor(private apiKey: string) {}

  async complete(params: CompletionParams): Promise<CompletionResponse> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.version,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxTokens || 4096,
        messages: this.formatMessages(params.messages),
        system: this.extractSystemMessage(params.messages),
        tools: params.tools,
        temperature: params.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  async *stream(params: CompletionParams): AsyncGenerator<{ delta: string; done: boolean }> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.version,
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxTokens || 4096,
        messages: this.formatMessages(params.messages),
        system: this.extractSystemMessage(params.messages),
        tools: params.tools,
        temperature: params.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') {
          yield { delta: '', done: true };
          return;
        }

        try {
          const event = JSON.parse(data);
          if (event.type === 'content_block_delta') {
            yield { delta: event.delta.text, done: false };
          } else if (event.type === 'message_stop') {
            yield { delta: '', done: true };
            return;
          }
        } catch {
          // 跳过无法解析的行
        }
      }
    }
  }

  getModelInfo(model: string): ModelInfo {
    const info: Record<string, ModelInfo> = {
      'claude-3-5-sonnet-20241022': {
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        maxTokens: 200000,
        supportsVision: true,
        supportsTools: true,
        pricing: { input: 3, output: 15 },
      },
      'claude-3-5-haiku-20241022': {
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        maxTokens: 200000,
        supportsVision: true,
        supportsTools: true,
        pricing: { input: 0.8, output: 4 },
      },
    };
    return info[model] || { name: model, provider: 'anthropic', maxTokens: 4096, supportsVision: false, supportsTools: true, pricing: { input: 3, output: 15 } };
  }

  private formatMessages(messages: Message[]): any[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => {
        if (m.role === 'tool') {
          return {
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }
            ],
          };
        }
        return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
      });
  }

  private extractSystemMessage(messages: Message[]): string | undefined {
    const system = messages.find(m => m.role === 'system');
    return system?.content;
  }

  private parseResponse(data: any): CompletionResponse {
    const contentBlocks = data.content || [];
    const text = contentBlocks.find(c => c.type === 'text')?.text;
    const toolUses = contentBlocks.filter(c => c.type === 'tool_use');

    return {
      content: text,
      toolCalls: toolUses.map(t => ({
        id: t.id,
        name: t.name,
        input: t.input,
      })),
      finishReason: data.stop_reason,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
    };
  }
}
```

### 3.2 使用示例

```typescript
// 第 1 段：创建适配器实例（把凭据从环境变量注入，而不是硬编码）
// 提供商客户端通常把 apiKey 绑定在实例上，之后每次 complete/stream 都复用它；
// 从 process.env 读取可避免密钥进版本库，代价是缺失时只有到调用期才报错（要 fail-fast 就得自己先校验）。
const adapter = new AnthropicAdapter(process.env.ANTHROPIC_API_KEY);

// 第 2 段：发起一次「非流式」补全——complete() 把参数序列化成 HTTP 请求体，并 await 整个结果
// 关键数据流：messages(对话历史) + model(路由到哪个模型) + 采样参数 → 服务端 → 一个完整的响应对象。
// 易错点：temperature 控随机性、maxTokens 是「输出」token 上限（防跑飞、控成本），二者只影响生成过程，不影响输入。
const response = await adapter.complete({
  // 第 2.1 段：messages 是有序历史，role 决定模型以谁的视角读这条消息
  // system 只应出现一次且置于最前，它定义全局人格与硬约束，优先级高于 user；
  // 模型本身无状态，服务端不替你保存上下文，所以每轮都要重发完整历史（长对话务必自行裁剪/摘要以控 token）。
  messages: [
    { role: 'system', content: '你是一个有帮助的助手' },
    { role: 'user', content: '解释什么是 closure' },
  ],
  model: 'claude-3-5-sonnet-20241022', // 钉死具体版本号，保证效果可复现、便于回归对比
  temperature: 0.7,
  maxTokens: 1000,
  // 第 2.2 段：tools 给模型「申请调用外部函数」的能力，这里只是声明，不会真的执行 search
  // 模型返回的是「想调用哪个工具 + 参数」的意图；真正的执行、以及把结果作为 tool_result 回灌，
  // 必须由业务侧完成——这正是 agent 循环（请求→执行→回灌→再请求）的最小骨架。
  tools: [
    {
      name: 'search',
      description: '搜索网络', // description 才是模型挑选工具的主要依据，把用途写清楚比起好名字更关键
      inputSchema: { type: 'object', properties: { query: { type: 'string' } } }, // JSON Schema 约束模型生成的参数结构，也决定参数校验的严格程度
    },
  ],
});

// 第 3 段：消费非流式结果——此时所有 token 已聚合完毕
// response.content 可能是自然语言文本，也可能是工具调用块（上一段声明了 tools），
// 所以生产代码要按内容类型分支：文本直接展示，工具调用则转去执行并把结果回灌给模型。
console.log(response.content);

// 第 4 段：异步流式响应（逐块消费，首 token 延迟更低、可边到达边渲染）
// 每次迭代产出一个 chunk，chunk.delta 只是「本次新增的片段」；易错点：必须 append 拼接，
// 直接覆盖会丢掉前文；循环正常退出才代表响应结束，异常退出要用 try/finally 兜住半截输出。
// 注意 messages: [...] 是省略写法，实际需传入真实历史（流式与非流式共用同一套请求契约）。
for await (const chunk of adapter.stream({ messages: [...], model: 'claude-3-5-sonnet' })) {
  process.stdout.write(chunk.delta); // 用 write 而非 log：不追加换行/分隔符，保持原始字节流顺序
}
```
## 4. OpenAI GPT 适配器

### 4.1 完整实现

```typescript
// adapters/openai.ts

import { LLMAdapter, CompletionParams, CompletionResponse } from './llm-adapter';

export class OpenAIAdapter implements LLMAdapter {
  readonly supportedModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1-preview',
    'o1-mini',
  ];

  private baseURL = 'https://api.openai.com/v1/chat/completions';

  constructor(private apiKey: string) {}

  async complete(params: CompletionParams): Promise<CompletionResponse> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: this.formatMessages(params.messages),
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        tools: params.tools,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  async *stream(params: CompletionParams): AsyncGenerator<{ delta: string; done: boolean }> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: this.formatMessages(params.messages),
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        tools: params.tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.trim() && !l.startsWith('data: '));

      for (const line of lines) {
        if (line.startsWith('[DONE]')) {
          yield { delta: '', done: true };
          return;
        }

        try {
          const data = JSON.parse(line);
          const delta = data.choices?.[0]?.delta?.content;
          if (delta) {
            yield { delta, done: false };
          }
          if (data.choices?.[0]?.finish_reason) {
            yield { delta: '', done: true };
            return;
          }
        } catch {
          // 跳过
        }
      }
    }
  }

  getModelInfo(model: string): any {
    const info: Record<string, any> = {
      'gpt-4o': {
        name: 'GPT-4o',
        provider: 'openai',
        maxTokens: 128000,
        supportsVision: true,
        supportsTools: true,
        pricing: { input: 5, output: 15 },
      },
      'gpt-4o-mini': {
        name: 'GPT-4o Mini',
        provider: 'openai',
        maxTokens: 128000,
        supportsVision: true,
        supportsTools: true,
        pricing: { input: 0.15, output: 0.6 },
      },
    };
    return info[model] || { name: model, provider: 'openai', maxTokens: 16385, supportsVision: true, supportsTools: true, pricing: { input: 5, output: 15 } };
  }

  private formatMessages(messages: Message[]): any[] {
    return messages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          content: m.content,
          tool_call_id: m.toolCallId,
        };
      }
      return { role: m.role, content: m.content };
    });
  }

  private parseResponse(data: any): CompletionResponse {
    const choice = data.choices[0];
    const message = choice.message;

    const toolCalls = message.tool_calls?.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
    }));

    return {
      content: message.content,
      toolCalls,
      finishReason: choice.finish_reason,
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      } : undefined,
    };
  }
}
```

## 5. Google Gemini 适配器

### 5.1 完整实现

```typescript
// adapters/gemini.ts

// 第 1 段：引入适配器契约（接口与 DTO 类型）
// 这里只依赖抽象接口，不依赖任何具体 SDK，目的是让上层业务与 Google 的 HTTP 细节解耦——
// 换供应商时只需新增一个实现类，调用方代码零改动。
import { LLMAdapter, CompletionParams, CompletionResponse } from './llm-adapter';

// 第 2 段：类声明与"能力声明表"
// 用 implements 强制编译期校验签名，避免漏实现方法后在运行期才炸。
// supportedModels 用 readonly 数组：只保证引用不可被重新赋值（内容仍可 push），属于约定式声明。
export class GoogleAdapter implements LLMAdapter {
  readonly supportedModels = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro',
    'gemini-pro',
  ];

  // 第 3 段：端点基址与凭据注入
  // Gemini 把模型名当作 URL 路径的一部分，所以这里只存"前缀"，真正拼接发生在每次请求时。
  // 注意：apiKey 走查询串（?key=）而非 Authorization 头，这是 Google 的接口约定；
  // 副作用是密钥容易出现在代理/网关日志里，生产环境应避免打全量 URL 日志。
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';

  // 构造参数带 private 修饰符，等价于"声明字段 + 赋值"两件事，省去样板代码。
  constructor(private apiKey: string) {}

  // 第 4 段：complete() —— 一次性（非流式）补全的完整链路
  // 数据流：params → 归一化模型名 → 拼 URL → 构造 JSON body → fetch → 校验状态 → 解析响应体。
  async complete(params: CompletionParams): Promise<CompletionResponse> {
    // 模型名归一化：Gemini 的 URL 要求显式版本后缀，用户只传 'gemini-1.5-pro' 时补 ':latest'；
    // 用 includes(':') 判断而非 startsWith，是为了兼容未来可能出现的其它带冒号写法。
    const modelName = params.model.includes(':') ? params.model : `${params.model}:latest`;
    // 方法名（generateContent / streamGenerateContent）也必须进 URL，这是 Gemini 的风格：
    // 动作在路径里，参数在 body 里——与 OpenAI 那种"路径固定、body 选动作"正好相反。
    const url = `${this.baseURL}/${modelName}:generateContent?key=${this.apiKey}`;

    // 第 5 段：发起 HTTP 请求
    // 用原生 fetch 而非官方 SDK，是为了零依赖、可跨运行时（Node 18+/Deno/Bun/边缘函数）。
    // tools 为 undefined 时 JSON.stringify 会自动丢掉该字段，正好符合"未启用工具"的语义。
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: this.formatContents(params.messages),
        generationConfig: {
          temperature: params.temperature,
          maxOutputTokens: params.maxTokens,
        },
        tools: params.tools ? this.formatTools(params.tools) : undefined,
      }),
    });

    // 第 6 段：错误处理
    // 先读 body 再抛错：Gemini 把可读原因放在 error.error.message 里，只报 statusText 会丢失关键信息。
    // 边界情况：若上游返回 5xx 且 body 非 JSON，response.json() 自身会抛异常，覆盖掉原始错误——
    // 更稳妥的写法是 try/catch 包住解析并降级为 statusText（当前实现接受这个风险）。
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    // 第 7 段：正常响应解析
    // 把"取哪几个字段"的脏活收进 parseResponse，complete() 只负责编排，便于单测替换解析逻辑。
    const data = await response.json();
    return this.parseResponse(data);
  }

  // 第 8 段：stream() —— 服务端推送式流，返回 AsyncGenerator
  // 用 async generator 而不是回调或 EventEmitter：调用方可以用 for await...of 顺序消费，
  // 天然背压友好，也便于用 try/finally 做中断清理。
  async *stream(params: CompletionParams): AsyncGenerator<{ delta: string; done: boolean }> {
    // 与 complete() 同样的模型名归一化；两处逻辑重复，属于可抽取的小坏味。
    const modelName = params.model.includes(':') ? params.model : `${params.model}:latest`;
    // 仅方法名换成 streamGenerateContent，其余 URL 结构一致。
    // 注意未加 alt=sse，返回的是"分块的 JSON 序列"而非标准 SSE 事件流，这正是下面解析需要 try/catch 的原因。
    const url = `${this.baseURL}/${modelName}:streamGenerateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: this.formatContents(params.messages),
        generationConfig: {
          temperature: params.temperature,
          maxOutputTokens: params.maxTokens,
        },
      }),
    });

    // 第 9 段：流式路径的错误处理（比 complete 简化）
    // 这里没有读 body 的 error.error.message，直接抛 statusText，信息量更少——
    // 因为流场景下 body 可能已被占用/尚未读完，读它容易与后面的 reader 冲突。
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    // 第 10 段：建立字节流读取器与解码器
    // getReader() 拿到的是 Uint8Array 字节块，中文字符可能被切在块边界上，
    // 所以 TextDecoder 必须用 { stream: true } 保留跨块的半个字符（多字节 UTF-8 续读）。
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // 第 11 段：流式主循环——逐块读取、逐块产出
    // 循环通过 await reader.read() 驱动，done 为 true 表示上游关闭，此时提前 break。
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 每次只解码"当前到达的部分"；stream:true 表示后续还会有更多字节，别把未完成序列当错误。
      const chunk = decoder.decode(value, { stream: true });
      try {
        // 关键易错点：一个 chunk 未必等于一个完整 JSON。若上游把一条 JSON 拆成两个 TCP 包，
        // JSON.parse 会失败而被 catch 静默丢弃，表现为"偶尔丢字/丢段"。
        // 生产级实现应维护缓冲区、按换行或括号配平切分后再解析。
        const data = JSON.parse(chunk);
        // 逐层可选链：Gemini 的 parts 里也可能出现 functionCall 等非文本 part，
        // 因此 text 缺失是正常情况，不能当成错误。
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          yield { delta: text, done: false };
        }
      } catch {
        // 跳过无效 JSON
      }
    }

    // 第 12 段：结束哨兵
    // 无论正常结束还是中途 break，都补发一个空 delta + done:true，
    // 让消费方有一个统一的终止信号，不必自己判断循环退出原因。
    yield { delta: '', done: true };
  }

  // 第 13 段：模型元信息查询（纯函数，无网络请求）
  // 返回 any 而非具体类型，是为了让适配器层不被上游类型演进绑架；代价是调用方失去类型检查。
  // maxTokens 填的是 1024000（约 1M 上下文窗口），pricing 单位是"每百万 token 美元"，需与上层约定一致。
  getModelInfo(model: string): any {
    return {
      name: model,
      provider: 'google',
      maxTokens: 1024000,
      supportsVision: true,
      supportsTools: true,
      pricing: { input: 1.25, output: 5 },
    };
  }

  // 第 14 段：消息格式转换（内部 DTO → Gemini 的 contents 结构）
  // Gemini 与 OpenAI 不同：没有独立的 system 角色，而是把 system 提示塞进 systemInstruction；
  // 下面这种"所有消息拍平成单个 user turn 的 parts"是最简实现，
  // 后果是丢失多轮对话的角色区分（历史 assistant 回复也会被当作 user 说的），
  // 多轮场景需要按角色映射为 { role: 'user' | 'model', parts: [...] }。
  // 另外：Message 类型在此文件未导入，属于潜在的编译/类型隐患，应补 import。
  private formatContents(messages: Message[]): any[] {
    return [{
      role: 'user',
      parts: messages.map(m => ({
        text: m.content,
      })),
    }];
  }

  // 第 15 段：工具（函数调用）描述转换
  // OpenAI 用 { type:'function', function:{...} } 包装，Gemini 直接要 functionDeclarations 数组，
  // 且把参数模式字段从 parameters 改名为 inputSchema 的来源——这里是字段名对齐的关键适配点。
  // 注意本方法返回的是"对象"而非数组，调用时直接塞进 tools 字段，语义上 tools 是单对象。
  private formatTools(tools: any[]): any {
    return {
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      })),
    };
  }

  // 第 16 段：响应归一化
  // 只取第一个 candidate 的第一个 part，忽略并行候选与多模态 part；
  // text 缺失时兜底为空串（安全内容拦截、纯 functionCall 都会走到这里），
  // finishReason 透传给上层，用于区分"自然结束 / 被截断 / 被安全策略终止"。
  // 复杂度 O(1)，不遍历 candidates，因此多候选场景下信息会被丢弃。
  private parseResponse(data: any): CompletionResponse {
    const part = data.candidates?.[0]?.content?.parts?.[0];
    return {
      content: part?.text || '',
      finishReason: data.candidates?.[0]?.finishReason,
    };
  }
}
```
## 6. 模型选择策略

### 6.1 基于规则的路由

```typescript
// routing/rule-based-router.ts

interface RouteRule {
  match: (params: { messages: Message[]; task?: string }) => boolean;
  model: string;
  priority: number;
}

export class RuleBasedRouter {
  private rules: RouteRule[] = [];

  addRule(rule: RouteRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  select(params: { messages: Message[]; task?: string }): string {
    for (const rule of this.rules) {
      if (rule.match(params)) {
        return rule.model;
      }
    }
    return 'claude-3-5-sonnet-20241022'; // 默认模型
  }
}

// 预定义规则
const router = new RuleBasedRouter();

// 代码任务用 Claude（能力强）
router.addRule({
  match: ({ messages }) => {
    const lastMsg = messages[messages.length - 1]?.content.toLowerCase();
    return lastMsg?.includes('code') || lastMsg?.includes('function') || lastMsg?.includes('implement');
  },
  model: 'claude-3-5-sonnet-20241022',
  priority: 100,
});

// 快速任务用 Haiku（便宜）
router.addRule({
  match: ({ messages }) => messages.length <= 2,
  model: 'claude-3-5-haiku-20241022',
  priority: 50,
});

// 简单摘要用 Gemini（便宜）
router.addRule({
  match: ({ task }) => task === 'summarize',
  model: 'gemini-1.5-flash',
  priority: 40,
});
```

### 6.2 成本感知路由

```typescript
// routing/cost-aware-router.ts

interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export class CostAwareRouter {
  private adapters: Map<string, LLMAdapter> = new Map();

  register(model: string, adapter: LLMAdapter): void {
    this.adapters.set(model, adapter);
  }

  estimateCost(model: string, inputText: string, estimatedOutputTokens: number): CostEstimate {
    const adapter = this.adapters.get(model);
    if (!adapter) throw new Error(`Unknown model: ${model}`);

    const info = adapter.getModelInfo(model);
    const inputTokens = this.estimateTokens(inputText);
    const cost = (inputTokens / 1_000_000) * info.pricing.input +
                (estimatedOutputTokens / 1_000_000) * info.pricing.output;

    return { inputTokens, outputTokens: estimatedOutputTokens, cost };
  }

  selectBest(inputText: string, estimatedOutput: number, preferences: {
    maxCost?: number;
    preferSpeed?: boolean;
    preferQuality?: boolean;
  }): string {
    const candidates = Array.from(this.adapters.keys());
    const estimates = candidates.map(m => ({
      model: m,
      ...this.estimateCost(m, inputText, estimatedOutput),
    }));

    // 按成本排序
    estimates.sort((a, b) => a.cost - b.cost);

    // 应用偏好过滤
    let filtered = estimates;
    if (preferences.maxCost) {
      filtered = estimates.filter(e => e.cost <= preferences.maxCost);
    }

    // 选择最便宜的符合条件的
    return filtered[0]?.model || estimates[0].model;
  }

  private estimateTokens(text: string): number {
    // 粗略估算：中文约 2 字符/token，英文约 4 字符/token
    return Math.ceil(text.length / 3);
  }
}

// 使用
const costRouter = new CostAwareRouter();
costRouter.register('claude-3-5-sonnet-20241022', anthropicAdapter);
costRouter.register('gemini-1.5-flash', googleAdapter);

const selected = costRouter.selectBest(
  '解释什么是闭包',
  500,
  { maxCost: 0.01 } // 限制最大成本
);
```

## 7. 降级与重试机制

### 7.1 降级策略

```typescript
// failover/fallback-strategy.ts

// 第 1 段：类型定义——描述"主模型 + 备选模型列表"的降级链结构
// FallbackChain 把"一个主模型"和"按优先级排列的备选模型"绑定在一起，
// 之所以用 primary/fallbacks 两字段而非单一数组，是为了让"主选"语义显式，
// 调用方无需约定"数组第 0 个才是主选"这种隐式规则。
interface FallbackChain {
  primary: string;
  fallbacks: string[];
}

// 第 2 段：管理器骨架——用两张 Map 分别维护"降级链"与"模型→适配器"映射
// 关键设计：链（策略）与适配器（执行能力）解耦，同一个 adapter 可被多个模型名复用
//（见文件末尾 anthropicAdapter 同时注册给 sonnet 与 haiku），避免重复实例化。
export class FallbackManager {
  private chains: Map<string, FallbackChain> = new Map();
  private adapters: Map<string, LLMAdapter> = new Map();

  // 第 3 段：注册适配器——建立"模型名 → 具体调用实现"的查找表
  // 先注册后使用：completeWithFallback 里若查不到 adapter 会直接跳过该模型，
  // 所以忘注册不会报错，而是表现为"该备选被静默忽略"，是需要留意的易错点。
  registerAdapter(model: string, adapter: LLMAdapter): void {
    this.adapters.set(model, adapter);
  }

  // 第 4 段：配置降级链——以主模型名为主键写入链
  // 以 primary 作 Map 的 key，使查询 O(1)：调用时凭 params.model 即可反查整条链。
  // 重复调用会覆盖旧链（幂等覆盖语义），无需先删除。
  setFallbackChain(primary: string, fallbacks: string[]): void {
    this.chains.set(primary, { primary, fallbacks });
  }

  // 第 5 段：核心降级流程——按优先级依次尝试，成功即返回，全败才抛错
  // 数据流：params.model → 查链 → 拼出 [主选, ...备选] → 逐个取 adapter 调用。
  // 复杂度 O(n)，n 为链长；每个失败请求都串行等待（最坏情况延迟会叠加），
  // 这是"可用性优先于延迟"的取舍，若在意尾延迟应改为并行竞速或带超时。
  async completeWithFallback(params: CompletionParams): Promise<CompletionResponse> {
    // 未配置链时降级为"只试自己"：保证 API 即使没显式配置也能工作，
    // 是一种防御性默认值，避免 undefined 解构报错。
    const chain = this.chains.get(params.model) || {
      primary: params.model,
      fallbacks: [],
    };

    // 展开成有序待试列表，主选永远最先，保证正常情况下不走降级路径。
    const models = [chain.primary, ...chain.fallbacks];

    for (const model of models) {
      // try 只包住真正可能抛错的"取适配器 + 调用"两步；
      // 任一步失败都视为该模型不可用，落到 catch 后继续下一个候选。
      try {
        const adapter = this.adapters.get(model);
        // 未注册适配器的模型直接跳过：宁可少一个候选，也不要在这里抛错
        // 中断整条链（失败转移的成本要尽可能低）。
        if (!adapter) continue;

        // 用展开覆盖 model 字段，把上层传入的其他参数原样透传，
        // 调用方因此无需关心最终由哪个模型执行，接口保持不变。
        const result = await adapter.complete({ ...params, model });
        return result;
      } catch (error) {
        // 只记录并继续，不把错误向上抛：降级的本质就是"吞掉中间失败"。
        // 注意 error 未做类型收窄，若抛出的不是 Error（如字符串），error.message 会是 undefined。
        console.warn(`Model ${model} failed:`, error.message);
        continue;
      }
    }

    // 边界条件：所有候选都失败（或 adapter 缺失被跳过）时，才抛出统一错误，
    // 告知调用方"整条链已耗尽"。此处只给汇总信息，逐个失败详情已由上面的 warn 输出。
    throw new Error('All models in fallback chain failed');
  }
}

// 第 6 段：装配与使用示例——构建一条三级降级链
// 顺序体现成本/质量梯度的意图：sonnet（强）失败 → haiku（快、便宜）→ gpt-4o-mini（跨厂商兜底）。
// 跨厂商兜底能抵御单一服务商整体故障，这是 fallback 相比"同厂多模型"的核心价值。
// 配置降级链
const fallbackManager = new FallbackManager();
fallbackManager.registerAdapter('claude-3-5-sonnet-20241022', anthropicAdapter);
fallbackManager.registerAdapter('claude-3-5-haiku-20241022', anthropicAdapter);
fallbackManager.registerAdapter('gpt-4o-mini', openaiAdapter);

// 声明 sonnet 的降级顺序；链中每个备选都必须先 registerAdapter，
// 否则运行期会被静默跳过，链会在不知不觉中变短。
fallbackManager.setFallbackChain('claude-3-5-sonnet-20241022', [
  'claude-3-5-haiku-20241022',
  'gpt-4o-mini',
]);
```
### 7.2 重试管理器

```typescript
// failover/retry-manager.ts

interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: (error: Error) => boolean;
}

export class RetryManager {
  constructor(private config: RetryConfig) {}

  async execute<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    let lastError: Error;
    let delay = this.config.initialDelay;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.config.maxAttempts) break;

        // 检查是否可重试
        if (this.config.retryableErrors && !this.config.retryableErrors(lastError)) {
          throw lastError;
        }

        onRetry?.(attempt, lastError);
        await this.sleep(delay);
        delay = Math.min(delay * this.config.backoffMultiplier, this.config.maxDelay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 重试配置
const retryManager = new RetryManager({
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: (error) => {
    // 网络错误、超时、429、5xx 可重试
    if (error.message.includes('network')) return true;
    if (error.message.includes('timeout')) return true;
    if (error.message.includes('429')) return true;
    if (error.message.includes('500')) return true;
    return false;
  },
});

// 使用
const result = await retryManager.execute(
  () => adapter.complete(params),
  (attempt, error) => console.log(`Retry ${attempt}: ${error.message}`)
);
```

### 7.3 熔断器模式

```typescript
// failover/circuit-breaker.ts

enum CircuitState {
  Closed,    // 正常，允许请求
  Open,      // 熔断，拒绝请求
  HalfOpen,  // 半开，允许一个请求测试
}

export class CircuitBreaker {
  private state = CircuitState.Closed;
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private threshold: number = 5,        // 失败阈值
    private timeout: number = 60000,       // 熔断持续时间
    private resetTimeout: number = 30000,   // 半开状态持续时间
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.Open) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HalfOpen;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.Closed;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.Open;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.Closed;
    this.failureCount = 0;
  }
}

// 使用
const circuitBreaker = new CircuitBreaker(5, 60000);
circuitBreaker.execute(() => adapter.complete(params));
```

## 8. 成本与延迟考虑

### 8.1 成本模型

```typescript
// cost-tracker.ts

// 第 1 段：定义一条成本记录的不可变数据形状（数据契约层）
// 这里刻意把 cost 也放进结构里，让"原始用量"和"最终金额"在存储时是同一行数据；
// 但注意 record() 的入参用 Omit 把 cost 剔除，意味着 cost 只能由类内部按定价算出，
// 外部无法伪造金额——这是"派生字段不信任调用方"的设计。
interface CostRecord {
  timestamp: number;        // 毫秒时间戳（与 Date.getTime() 对齐，保证后续区间比较口径一致）
  model: string;            // 模型标识，同时作为定价表的 key
  inputTokens: number;      // 输入 token 数（原始用量，不做换算）
  outputTokens: number;     // 输出 token 数
  cost: number;             // 派生字段：由 token 数 × 单价计算，单位通常为美元
  latency: number;          // 单次调用延迟，单位与 getAverageLatency 的返回保持一致
}

// 第 2 段：CostTracker 主体，承担"定价注册 + 记录累计 + 多维聚合"三类职责
// 设计上是一个纯内存累加器：records 只增不改，所有统计都在读取时现算（读时聚合），
// 好处是写入极快、逻辑简单；代价是记录量大后每次查询都要遍历全量数组，O(n)。
export class CostTracker {
  private records: CostRecord[] = [];
  // 定价表用 Map 而非对象，避免模型名撞上 __proto__/constructor 之类的原型键，
  // 值按"每百万 token 单价"存储，与 record() 里的除法单位相呼应。
  private adapterCosts: Map<string, { input: number; output: number }> = new Map();

  // 第 3 段：定价注册（写入侧的唯一配置入口）
  // 同一 model 重复调用即覆盖，因此支持运行时调价而不影响已记录的旧数据——
  // 价格在 record() 那一刻就被固化进 CostRecord.cost，历史账单不会被追溯篡改。
  setPricing(model: string, inputCost: number, outputCost: number): void {
    this.adapterCosts.set(model, { input: inputCost, output: outputCost });
  }

  // 第 4 段：核心写入路径——把一次调用的用量换算成金额并落库
  // 入参 Omit<CostRecord,'cost'> 既复用了字段定义，又从类型层面禁止外部传入 cost。
  record(record: Omit<CostRecord, 'cost'>): void {
    const pricing = this.adapterCosts.get(record.model);
    // 单价按"每百万 token"计价，所以先除以 1_000_000 再乘单价；输入/输出分开计费。
    // 易错点：若模型未注册定价，这里静默记为 0 而不抛错——好处是不中断主流程，
    // 风险是漏配定价会让成本统计悄悄偏低，排查时往往表现为"总花费对不上"。
    const cost = pricing
      ? (record.inputTokens / 1_000_000) * pricing.input +
        (record.outputTokens / 1_000_000) * pricing.output
      : 0;

    // 展开运算符把入参字段与算出的 cost 合成完整记录；records 只追加不修改，
    // 因此整条链路无共享可变状态，并发读取（如同时跑多个统计）不会互相干扰。
    this.records.push({ ...record, cost });
  }

  // 第 5 段：按时间区间汇总总花费（读时过滤 + 折叠）
  // 两个边界都是"包含"的：startDate 用 < 排除更早的，endDate 用 > 排除更晚的，
  // 即 [startDate, endDate] 闭区间；不传参数即统计全量。
  // 复杂度 O(n)，每次调用都会重扫全表，适合中小规模记录。
  getTotalCost(startDate?: Date, endDate?: Date): number {
    return this.records
      .filter(r => {
        // Date 对象与毫秒时间戳比较会隐式转成数字，这里显式 getTime() 以免读代码时产生歧义。
        if (startDate && r.timestamp < startDate.getTime()) return false;
        if (endDate && r.timestamp > endDate.getTime()) return false;
        return true;
      })
      // reduce 必须给初始值 0：空数组时不传初始值会抛 TypeError，传了则安全返回 0。
      .reduce((sum, r) => sum + r.cost, 0);
  }

  // 第 6 段：按模型分组聚合花费（一次遍历完成分组，O(n)）
  // 用 Map 保持插入顺序，便于上层按首次出现顺序展示；
  // `byModel.get(r.model) || 0` 是首次遇到该模型时的兜底，避免 undefined + number 得到 NaN。
  getCostByModel(): Map<string, number> {
    const byModel = new Map<string, number>();
    for (const r of this.records) {
      byModel.set(r.model, (byModel.get(r.model) || 0) + r.cost);
    }
    return byModel;
  }

  // 第 7 段：统计平均延迟，可选按模型下钻
  // 先决定样本集再求和，避免在 reduce 里重复判断 model，减少内层开销。
  getAverageLatency(model?: string): number {
    const records = model
      ? this.records.filter(r => r.model === model)
      : this.records;

    // 提前返回 0 是必须的边界保护：无样本时返回 0 而非 NaN，
    // 让调用方无需额外判空（语义上"没有数据 = 平均 0"）。
    if (records.length === 0) return 0;
    return records.reduce((sum, r) => sum + r.latency, 0) / records.length;
  }
}
```
### 8.2 延迟监控

```typescript
// latency-monitor.ts

interface LatencyStats {
  p50: number;
  p90: number;
  p99: number;
  avg: number;
  count: number;
}

export class LatencyMonitor {
  private measurements: Map<string, number[]> = new Map();

  record(model: string, latencyMs: number): void {
    if (!this.measurements.has(model)) {
      this.measurements.set(model, []);
    }
    this.measurements.get(model).push(latencyMs);
  }

  getStats(model: string): LatencyStats {
    const values = this.measurements.get(model) || [];
    if (values.length === 0) {
      return { p50: 0, p90: 0, p99: 0, avg: 0, count: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
    };
  }

  // 检查延迟是否异常
  isLatencyAnomaly(model: string, latencyMs: number): boolean {
    const stats = this.getStats(model);
    return latencyMs > stats.p99 * 2; // 超过 p99 的两倍视为异常
  }
}
```

## 9. 完整集成示例

### 9.1 多模型 Agent

```typescript
// agent/multi-model-agent.ts

import { AnthropicAdapter } from '../adapters/anthropic';
import { OpenAIAdapter } from '../adapters/openai';
import { GoogleAdapter } from '../adapters/google';
import { RuleBasedRouter } from '../routing/rule-based-router';
import { FallbackManager } from '../failover/fallback-strategy';
import { RetryManager } from '../failover/retry-manager';
import { CircuitBreaker } from '../failover/circuit-breaker';
import { CostTracker } from '../cost-tracker';

export class MultiModelAgent {
  private adapters: Map<string, LLMAdapter> = new Map();
  private router: RuleBasedRouter;
  private fallbackManager: FallbackManager;
  private retryManager: RetryManager;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private costTracker: CostTracker;

  constructor() {
    // 初始化适配器
    const anthropic = new AnthropicAdapter(process.env.ANTHROPIC_API_KEY);
    const openai = new OpenAIAdapter(process.env.OPENAI_API_KEY);
    const google = new GoogleAdapter(process.env.GOOGLE_API_KEY);

    this.adapters.set('anthropic', anthropic);
    this.adapters.set('openai', openai);
    this.adapters.set('google', google);

    // 初始化路由
    this.router = new RuleBasedRouter();
    this.setupRouting();

    // 初始化降级和重试
    this.fallbackManager = new FallbackManager();
    this.setupFallbacks();

    this.retryManager = new RetryManager({
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: e => e.message.includes('429') || e.message.includes('5'),
    });

    // 初始化熔断器
    for (const model of ['claude-3-5-sonnet-20241022', 'gpt-4o']) {
      this.circuitBreakers.set(model, new CircuitBreaker());
    }

    // 初始化成本追踪
    this.costTracker = new CostTracker();
    this.costTracker.setPricing('claude-3-5-sonnet-20241022', 3, 15);
    this.costTracker.setPricing('gpt-4o', 5, 15);
    this.costTracker.setPricing('gemini-1.5-flash', 0.075, 0.3);
  }

  private setupRouting(): void {
    this.router.addRule({
      match: ({ messages }) => {
        const content = messages[messages.length - 1]?.content.toLowerCase();
        return content?.includes('code') || content?.includes('function');
      },
      model: 'claude-3-5-sonnet-20241022',
      priority: 100,
    });

    this.router.addRule({
      match: ({ messages }) => messages.length <= 2,
      model: 'gemini-1.5-flash',
      priority: 50,
    });
  }

  private setupFallbacks(): void {
    this.fallbackManager.registerAdapter('claude-3-5-sonnet-20241022', this.adapters.get('anthropic'));
    this.fallbackManager.registerAdapter('gpt-4o', this.adapters.get('openai'));
    this.fallbackManager.registerAdapter('gemini-1.5-flash', this.adapters.get('google'));

    this.fallbackManager.setFallbackChain('claude-3-5-sonnet-20241022', [
      'gpt-4o',
      'gemini-1.5-flash',
    ]);
  }

  async complete(messages: any[], task?: string): Promise<string> {
    // 1. 选择模型
    const model = this.router.select({ messages, task });

    // 2. 获取熔断器
    const breaker = this.circuitBreakers.get(model);
    const executeWithBreaker = breaker
      ? (fn: () => any) => breaker.execute(fn)
      : (fn: () => any) => fn();

    // 3. 执行请求（带重试和降级）
    const startTime = Date.now();
    const result = await this.retryManager.execute(async () => {
      return executeWithBreaker(async () => {
        return this.fallbackManager.completeWithFallback({
          messages,
          model,
          temperature: 0.7,
          maxTokens: 4096,
        });
      });
    });

    // 4. 记录成本
    const latency = Date.now() - startTime;
    if (result.usage) {
      this.costTracker.record({
        timestamp: Date.now(),
        model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        latency,
      });
    }

    return result.content;
  }

  async *stream(messages: any[], task?: string): AsyncGenerator<string> {
    const model = this.router.select({ messages, task });
    const adapter = this.adapters.get(this.getProvider(model));

    if (!adapter) throw new Error(`No adapter for model: ${model}`);

    for await (const chunk of adapter.stream({ messages, model })) {
      yield chunk.delta;
    }
  }

  private getProvider(model: string): string {
    if (model.startsWith('claude')) return 'anthropic';
    if (model.startsWith('gpt')) return 'openai';
    if (model.startsWith('gemini')) return 'google';
    return 'anthropic';
  }

  getStats() {
    return {
      totalCost: this.costTracker.getTotalCost(),
      costByModel: this.costTracker.getCostByModel(),
    };
  }
}
```

### 9.2 使用示例

```typescript
const agent = new MultiModelAgent();

// 普通对话（自动选择合适模型）
const response = await agent.complete([
  { role: 'user', content: '你好，请介绍一下自己' },
]);
console.log(response);

// 代码任务（自动路由到 Claude）
const codeResponse = await agent.complete([
  { role: 'user', content: '写一个快速排序函数' },
], 'coding');
console.log(codeResponse);

// 流式响应
for await (const chunk of agent.stream([
  { role: 'user', content: '给我讲一个故事' },
])) {
  process.stdout.write(chunk);
}

// 查看成本统计
console.log(agent.getStats());
```

## 10. 常见问题

### 10.1 Q: 如何选择主要模型？

A: 根据任务特点选择：
- **Claude**: 代码生成、复杂推理、长文本分析
- **GPT-4**: 创意写作、对话质量、生态集成
- **Gemini**: 大上下文、批量处理、成本敏感场景

### 10.2 Q: 如何处理 API 限流？

A: 实现多层次防护：
1. 熔断器快速失败
2. 指数退避重试
3. 多模型分散请求
4. 请求队列和批处理

### 10.3 Q: 如何控制成本？

A: 策略：
1. 简单任务用小模型（Haiku/Mini/Flash）
2. 设置单次请求最大成本
3. 监控每日/每周成本趋势
4. 根据使用量与供应商谈判

## 11. 参考资源

- [Anthropic API 文档](https://docs.anthropic.com/)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [模型定价对比](https://artificialanalysis.ai/models)

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Gemini API 文档](https://ai.google.dev/gemini-api/docs) | 了解 Gemini 请求与响应格式，是适配器第三种实现的权威依据。 | 读 generateContent 与流式响应部分，对照另两家字段差异，整理参数映射表。 |
| [Claude Tool Use 概览](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview) | 讲清工具定义 schema 与结果回传，是适配器能力对齐的参考。 | 手写一遍工具定义 JSON，重点看传参出错时模型返回什么、如何重试。 |
| [OpenAI 文档](https://platform.openai.com/docs) | Function Calling 与结构化输出是 GPT 适配器的第一手规范。 | 先读这两个指南，各写一个最小示例，再接入自己的适配器验证。 |
| [Anthropic 文档](https://docs.anthropic.com/) | Messages API 是 Claude 适配器基准，system 与 tools 差异集中在此。 | 跑通快速开始，记录请求体与 OpenAI 的字段差异，形成映射清单。 |
| [OpenAI Structured Outputs 指南](https://platform.openai.com/docs/guides/structured-outputs) | JSON schema 约束是统一多模型输出格式的关键手段。 | 用 schema 约束一个抽取任务，统计格式错误率，作为适配层基线。 |
| [Google ADK 文档](https://google.github.io/adk-docs/) | 官方多工具 Agent 框架，可参照它的模型后端抽象方式。 | 按快速开始建一个多工具 Agent，重点看它如何抽象不同模型后端。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Agent SDK（TypeScript）](https://github.com/anthropics/claude-agent-sdk-typescript) | 可直接运行的 TS 示例，展示 Claude 工具调用与消息循环封装。 | 跑通 README 示例，把自研适配器接入同一循环对比行为。 |
| [OpenAI Agents SDK（Python）](https://openai.github.io/openai-agents-python/) | 可运行的多 Agent 示例，便于理解模型切换与 handoff 封装。 | 复现 Quickstart 后加一个 handoff，观察跨模型的上下文传递。 |
| [OpenAI Cookbook](https://cookbook.openai.com/) | 大量可改的 notebook，是验证适配器行为差异的现成实验台。 | 选一个与场景相近的 notebook 运行，换模型和参数对比输出与耗时。 |
| [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook) | tool_use 与 RAG notebook 展示 Claude 侧真实调用细节。 | 运行 tool_use 与 RAG 目录的 notebook，把数据换成本项目输入。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [A practical guide to building agents（OpenAI）](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | 系统讲解 Agent 三要素，帮助抽象出与厂商无关的适配层。 | 读完用模型、工具、指令三要素检查自己的多模型设计，标出差异点。 |
| [Anthropic 论 SWE-bench 的 Agent 设计](https://www.anthropic.com/engineering/swe-bench-sonnet) | 讲最小工具集设计，能指导多模型下的统一工具接口。 | 读最小工具集部分，对照适配器删掉各模型用不到的工具与参数。 |
| [Anthropic Courses](https://github.com/anthropics/courses) | 系统课程覆盖提示与工具使用，打牢多模型提示差异的基础。 | 按顺序完成 Prompt Engineering 与 Tool Use 两个 notebook，再对比 GPT。 |

## 应用与行业实践

前面几章把适配器、选择策略、降级重试讲清了。这一章回答一个问题：这些代码在真实业务里长什么样。下面用场景地图、三个拆解、行业做法和落地路线把知识接到地面上。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行订单表格导出摘要 | 模型选择策略、成本与延迟考虑 | 小模型逐块抽取字段，大上下文模型做汇总 | 分块要保留原始行号映射，否则摘要无法回溯到行 |
| 低端安卓机首屏的常见问题推荐 | 降级与重试机制 | 首屏请求设短超时，超时切备用提供商，末尾兜底读缓存 | 首屏预算是毫秒级，降级链顺序要按实测延迟排 |
| 多人协作白板的评论聚合 | LLM 适配器接口设计 | 所有提供商走同一个 chat 接口，输出固定 JSON | 并发写入要按文档版本号做快照去重 |
| 电商客服工单自动分类 | 成本与延迟考虑、模型选择策略 | 小模型批量分类，低置信度结果上送大模型 | 标签集变更后必须重跑回归集，否则错分无声扩散 |
| 代码仓库 PR 描述生成 | Anthropic Claude 适配器 | 长上下文一次读入 diff 与提交记录 | diff 超长时按文件分块，每块保留文件路径 |
| 跨境发票 OCR 后结构化 | OpenAI GPT 适配器 | 用结构化输出约束字段名与类型 | 金额、税额字段要在本地做一致性校验 |
| 内网知识库问答 | 多提供商集成、降级与重试 | 内网本地模型为主，允许出口时才启用外部提供商 | 数据分级判断要放在调用之前，不能放在重试之后 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格导出摘要

**业务背景**：运营在后台导出两万行订单表格，需要一段中文摘要说明异常分布。页面会一直显示“正在生成”，用户盯着这段等待时间。

**怎么用本页知识解决**：不要整表塞进一次调用，而是先用小模型按固定行数分块抽取结构化事实，再用大上下文模型把事实汇总成摘要。块大小按 token 预算算一次后固定下来，避免每次导出行为不一致。

```python
# 示意代码：分块抽取 + 汇总，适配器来自本页的接口设计
CHUNK_ROWS = 200                              # 每块行数，按 token 预算估算后固定
extract_adapter = registry.get("small-model")  # 小模型，负责逐块抽取事实
summary_adapter = registry.get("large-context")  # 大模型，负责最后汇总

def summarize(rows):
    facts = []                                # 存放每块的结构化结果
    for i in range(0, len(rows), CHUNK_ROWS):
        chunk = rows[i:i + CHUNK_ROWS]
        resp = extract_adapter.chat(
            messages=build_prompt(chunk),
            timeout=8,                        # 短超时，失败交给降级机制
            response_format="json",           # 结构化输出，字段固定便于拼接
        )
        resp["row_range"] = (i, i + len(chunk))  # 记下行号区间，供回溯
        facts.append(resp)
    # 汇总阶段只传 facts，不传原始行，控制 token 用量
    return summary_adapter.chat(messages=build_summary_prompt(facts),
                                timeout=30)
```

- `CHUNK_ROWS` 按 token 预算反推并用常量固定，保证两次导出结果可对比。
- 每块写入 `row_range`，用户点摘要里的结论时能跳回原始行。
- 抽取用短超时，单块失败只影响该块，不会拖垮整次导出。
- 汇总只吃结构化事实，token 用量与表格行数解耦。
- 两个适配器都从注册表取，换供应商只改配置。

**怎么度量收益**：指标看导出请求的 p95 端到端耗时、单次导出的 token 数、降级触发次数。在适配器层用 OpenTelemetry 打 span，记录 provider、耗时、token 数。前端用 `performance.now()` 记录提交到渲染的耗时并上报，Prometheus 加 Grafana 按天对比接入前后的 p95。

**什么时候不该用**：表格只有几十行且能一次放进上下文时，分块白加一次汇总调用。摘要只用于内部排查时，改成离线批处理，调用挪到低峰时段即可。摘要必须精确到具体行号且不能接受任何偏差时，应当先用数据库筛选，再对结果做摘要。

#### 场景 2：低端安卓机首屏的常见问题推荐

**业务背景**：客服 App 首屏有一块“猜你想问”推荐，在低端安卓机上冷启动时网络和算力都紧张。列表本身要求秒开，推荐内容晚到不能阻塞首屏渲染。

**怎么用本页知识解决**：首屏先渲染本地缓存答案，后台再发起带短超时的模型调用刷新。主提供商超时或报错时沿降级链切下一个，全部失败就保留缓存，不向界面抛异常。

```python
# 示意代码：带超时与降级链的首屏推荐
FALLBACK_CHAIN = ["primary-fast", "secondary-fast", "local-cache"]
TIMEOUT_S = 1.2                      # 首屏预算，超过就切下一个提供商

def first_screen_recommend(question):
    for name in FALLBACK_CHAIN:
        try:
            adapter = registry.get(name)
            return adapter.chat(
                messages=[{"role": "user", "content": question}],
                timeout=TIMEOUT_S,   # 短超时，避免阻塞首屏渲染
            )
        except (TimeoutError, ProviderError):
            metrics.incr("fallback_triggered", tags={"provider": name})
            continue                 # 记下降级原因再切下一个
    return local_cache.get(question)  # 全部失败返回缓存，不抛异常
```

- 降级链顺序按实测 p95 延迟从小到大排，最快的放在最前。
- 每次切换都打点并带上提供商名，否则事后无法判断是哪个环节退化。
- 最后一次兜底读本地缓存，保证函数永不抛异常，UI 不出现空白或错误页。
- 超时用秒传入，界面侧的毫秒预算要换算一次，避免两处单位不一致。

**怎么度量收益**：指标看首屏 `timeToInitialDisplay` 与 `timeToFullDisplay`、推荐接口 p95 延迟、降级触发率。用 AndroidX Macrobenchmark 的 `StartupTimingMetric` 反复跑冷启动并取多轮结果，服务端的降级次数用 OpenTelemetry 计数器上报。两类数据放进同一张看板，确认后台刷新没有拖慢首屏。

**什么时候不该用**：首屏内容必须与账号余额等实时数据一致时，读缓存会展示过期值。设备只在门店内网运行、没有弱网场景时，降级链的维护成本换不到收益。冷启动之后本来还有数秒引导页时，过短超时会让请求白白失败，应把预算留给真正的等待窗口。

#### 场景 3：多人协作白板的评论聚合

**业务背景**：白板上多人同时留言，一次评审会积累数百条评论，主持人需要在会中看到归类后的意见。评论是增量到达的，同一时刻可能有多次写入落到同一块白板。

**怎么用本页知识解决**：所有评论走同一个适配器接口，聚合前先按文档版本号取一次快照，只有版本号变化才重算。输出固定字段的 JSON，前端直接渲染分组，不写解析分支。

```python
# 示意代码：按版本号快照聚合，避免并发写入互相覆盖
def aggregate(board_id, version):
    comments = store.snapshot(board_id, version)   # 取一致视图，规避并发写入
    if not comments:
        return {"groups": []}
    adapter = registry.get(select_model(len(comments)))  # 按评论数选模型
    result = adapter.chat(
        messages=build_group_prompt(comments),
        timeout=20,
        response_format="json",       # 字段固定，前端直接渲染
    )
    cache.put(key=(board_id, version), value=result)  # 结果按版本号缓存
    return result
    # 新评论到达会提升 version，下一次调用自然重算
```

- 快照读保证聚合基于同一版评论，不会把半截数据算进分组。
- 缓存键包含版本号，版本相同直接命中，避免多人同时触发重复调用。
- 模型按评论条数选择，条数少时用便宜模型，条数多时再切大上下文模型。
- 返回体字段固定，前端不需要针对不同提供商写分支。

**怎么度量收益**：指标看聚合调用次数、缓存命中率、每分钟新增版本快照数、分组重复率。调用次数与命中率用 Prometheus 的 Counter 和 Gauge 暴露，分组重复率用离线脚本对同一批评论统计相同分组键的出现次数。会议进行中直接看每分钟调用次数是否随评论增长线性上升，若是则说明缓存没生效。

**什么时候不该用**：要求逐条可追溯时，聚合会打乱原始顺序，应保留原文只做标引。单人留言的会议里分组没有意义，按时间排序即可。合规审计需要保留评论原文时，只存聚合结果会导致原文缺失。

### 行业先进实践

统一多提供商调用与回退（出处：LiteLLM 开源项目）：它用与 OpenAI 兼容的请求格式封装多家提供商，并在配置里声明回退顺序与重试。把它放在你自研适配器层之下，可以用配置文件替换手写的重试分支。借鉴方式是用它先跑通两家提供商，再判断哪些能力需要自己实现。

按可用性与价格做模型路由（出处：OpenRouter 官方文档）：它对外提供统一接口，文档描述了在多个提供商之间的路由与回退顺序。可借鉴的点是把提供商选择从业务代码里搬出来，交给配置或网关。是否在你的项目使用托管路由，需要按数据出口策略单独评估。

语义缓存复用历史回答（出处：GPTCache 开源项目）：它对请求做向量化后在缓存中查找相近问题，命中后不再调用模型。适合问题重复率高的 FAQ 与首屏推荐，能直接减少调用次数。缓存键要与模型名、提示词版本绑定，否则会返回过期答案。

重试预算限制故障放大（出处：Envoy 官方文档）：Envoy 的 retry budget 用重试次数与总请求数的比例设上限，避免上游故障时重试把对方压垮。在你的降级逻辑里，可以把“最多重试 N 次”换成“重试占总请求的比例上限”。具体配置字段名与默认值需核对官方文档。

用结构化输出约束字段（出处：OpenAI 官方文档 / Google Gemini 官方文档）：两家都提供让模型按给定 schema 返回 JSON 的能力，字段名与类型由调用方指定。用在发票字段抽取和评论分组上，可以省掉后端的正则修补。需核对官方文档：所选模型与接口是否支持 schema 约束，以及不满足约束时的报错行为。

### 从学到用：落地路线

1. **第 1 步：挑一条低风险链路试点**，例如报表导出摘要，只接一家提供商但全部调用走适配器。验收标准：该链路代码里搜不到直接的提供商 SDK 调用，只有适配器实现文件里有。
2. **第 2 步：验证降级与重试**，用超时注入让主提供商失败，观察备用链路是否接管。验收标准：注入失败后接口返回成功率与未注入时一致，降级次数在监控里可见。
3. **第 3 步：推广到第二条链路并抽出配置**，把模型名、超时、重试上限写进配置文件。验收标准：改一次配置能同时改变两条链路的模型，业务代码无需改动。
4. **第 4 步：防止回退**，给适配器加单元测试与成本看板，拦截绕过适配器的提交。验收标准：CI 里存在拦截规则，看板能按链路拆出每日调用次数与 token 数。

### 动手作业

**目标**：做一个带适配器层、降级链、缓存与打点的模型调用小服务，接入两家提供商（可用兼容接口或本地小模型代替），对同一组问题给出稳定输出。

**步骤**：

1. 定义适配器接口，只保留一个 chat 方法，参数包含 messages、timeout、response_format。
2. 为两家提供商各写一个实现，密钥从环境变量读取。
3. 写注册表，按名字取适配器，配置从 JSON 或 YAML 读取。
4. 实现降级链：主提供商超时或报错时切下一个，并记录切换原因。
5. 加一层缓存，键为提示词哈希加模型名，命中直接返回。
6. 用本地脚本构造 20 条问题连续跑两次，记录每次调用的提供商、延迟、token 数。
7. 把主提供商超时改为极小值，确认降级链按预期生效。

**验收标准**：

- 业务代码中没有直接 import 任何提供商 SDK，只有适配器实现文件里有。
- 20 条问题两次运行都返回结果，第二次运行的缓存命中次数大于 0。
- 主提供商超时改为极小值后，日志里能看到降级记录，且所有请求仍有结果返回。
- 调用记录包含提供商名、延迟、token 数，能按提供商汇总。
- 密钥只出现在环境变量里，仓库内搜不到密钥字符串。

