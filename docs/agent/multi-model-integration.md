---
title: Multi-Model LLM Integration
description: 介绍如何在 AI Agent 中集成多个 LLM 提供商，实现模型抽象层、成本优化和降级策略。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# Multi-Model LLM Integration

> 本文档介绍如何在 AI Agent 中集成多个 LLM 提供商，实现模型抽象层、成本优化和降级策略。

---

## 目录

1. [为什么需要多模型支持](#1-为什么需要多模型支持)
2. [LLM 适配器接口设计](#2-llm-适配器接口设计)
3. [Anthropic Claude 适配器](#3-anthropic-claude-适配器)
4. [OpenAI GPT 适配器](#4-openai-gpt-适配器)
5. [Google Gemini 适配器](#5-google-gemini-适配器)
6. [模型选择策略](#6-模型选择策略)
7. [降级与重试机制](#7-降级与重试机制)
8. [成本与延迟考虑](#8-成本与延迟考虑)
9. [完整集成示例](#9-完整集成示例)

---

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

---

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

export enum ModelProvider {
  Anthropic = 'anthropic',
  OpenAI = 'openai',
  Google = 'google',
}

export class LLMAdapterFactory {
  private adapters: Map<ModelProvider, LLMAdapter> = new Map();

  register(provider: ModelProvider, adapter: LLMAdapter): void {
    this.adapters.set(provider, adapter);
  }

  get(provider: ModelProvider): LLMAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Adapter not registered: ${provider}`);
    }
    return adapter;
  }

  forModel(model: string): LLMAdapter {
    const provider = this.detectProvider(model);
    return this.get(provider);
  }

  private detectProvider(model: string): ModelProvider {
    if (model.startsWith('claude')) return ModelProvider.Anthropic;
    if (model.startsWith('gpt') || model.startsWith('o1')) return ModelProvider.OpenAI;
    if (model.startsWith('gemini')) return ModelProvider.Google;
    throw new Error(`Unknown model provider: ${model}`);
  }
}

// 使用
const factory = new LLMAdapterFactory();
factory.register(ModelProvider.Anthropic, new AnthropicAdapter(apiKey));
factory.register(ModelProvider.OpenAI, new OpenAIAdapter(apiKey));
factory.register(ModelProvider.Google, new GoogleAdapter(apiKey));

const adapter = factory.forModel('claude-3-5-sonnet-20241022');
```

---

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
const adapter = new AnthropicAdapter(process.env.ANTHROPIC_API_KEY);

const response = await adapter.complete({
  messages: [
    { role: 'system', content: '你是一个有帮助的助手' },
    { role: 'user', content: '解释什么是 closure' },
  ],
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxTokens: 1000,
  tools: [
    {
      name: 'search',
      description: '搜索网络',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
    },
  ],
});

console.log(response.content);
// 异步流式响应
for await (const chunk of adapter.stream({ messages: [...], model: 'claude-3-5-sonnet' })) {
  process.stdout.write(chunk.delta);
}
```

---

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

---

## 5. Google Gemini 适配器

### 5.1 完整实现

```typescript
// adapters/gemini.ts

import { LLMAdapter, CompletionParams, CompletionResponse } from './llm-adapter';

export class GoogleAdapter implements LLMAdapter {
  readonly supportedModels = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro',
    'gemini-pro',
  ];

  private baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(private apiKey: string) {}

  async complete(params: CompletionParams): Promise<CompletionResponse> {
    const modelName = params.model.includes(':') ? params.model : `${params.model}:latest`;
    const url = `${this.baseURL}/${modelName}:generateContent?key=${this.apiKey}`;

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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  async *stream(params: CompletionParams): AsyncGenerator<{ delta: string; done: boolean }> {
    const modelName = params.model.includes(':') ? params.model : `${params.model}:latest`;
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

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      try {
        const data = JSON.parse(chunk);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          yield { delta: text, done: false };
        }
      } catch {
        // 跳过无效 JSON
      }
    }

    yield { delta: '', done: true };
  }

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

  private formatContents(messages: Message[]): any[] {
    return [{
      role: 'user',
      parts: messages.map(m => ({
        text: m.content,
      })),
    }];
  }

  private formatTools(tools: any[]): any {
    return {
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      })),
    };
  }

  private parseResponse(data: any): CompletionResponse {
    const part = data.candidates?.[0]?.content?.parts?.[0];
    return {
      content: part?.text || '',
      finishReason: data.candidates?.[0]?.finishReason,
    };
  }
}
```

---

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

---

## 7. 降级与重试机制

### 7.1 降级策略

```typescript
// failover/fallback-strategy.ts

interface FallbackChain {
  primary: string;
  fallbacks: string[];
}

export class FallbackManager {
  private chains: Map<string, FallbackChain> = new Map();
  private adapters: Map<string, LLMAdapter> = new Map();

  registerAdapter(model: string, adapter: LLMAdapter): void {
    this.adapters.set(model, adapter);
  }

  setFallbackChain(primary: string, fallbacks: string[]): void {
    this.chains.set(primary, { primary, fallbacks });
  }

  async completeWithFallback(params: CompletionParams): Promise<CompletionResponse> {
    const chain = this.chains.get(params.model) || {
      primary: params.model,
      fallbacks: [],
    };

    const models = [chain.primary, ...chain.fallbacks];

    for (const model of models) {
      try {
        const adapter = this.adapters.get(model);
        if (!adapter) continue;

        const result = await adapter.complete({ ...params, model });
        return result;
      } catch (error) {
        console.warn(`Model ${model} failed:`, error.message);
        continue;
      }
    }

    throw new Error('All models in fallback chain failed');
  }
}

// 配置降级链
const fallbackManager = new FallbackManager();
fallbackManager.registerAdapter('claude-3-5-sonnet-20241022', anthropicAdapter);
fallbackManager.registerAdapter('claude-3-5-haiku-20241022', anthropicAdapter);
fallbackManager.registerAdapter('gpt-4o-mini', openaiAdapter);

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

---

## 8. 成本与延迟考虑

### 8.1 成本模型

```typescript
// cost-tracker.ts

interface CostRecord {
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
}

export class CostTracker {
  private records: CostRecord[] = [];
  private adapterCosts: Map<string, { input: number; output: number }> = new Map();

  setPricing(model: string, inputCost: number, outputCost: number): void {
    this.adapterCosts.set(model, { input: inputCost, output: outputCost });
  }

  record(record: Omit<CostRecord, 'cost'>): void {
    const pricing = this.adapterCosts.get(record.model);
    const cost = pricing
      ? (record.inputTokens / 1_000_000) * pricing.input +
        (record.outputTokens / 1_000_000) * pricing.output
      : 0;

    this.records.push({ ...record, cost });
  }

  getTotalCost(startDate?: Date, endDate?: Date): number {
    return this.records
      .filter(r => {
        if (startDate && r.timestamp < startDate.getTime()) return false;
        if (endDate && r.timestamp > endDate.getTime()) return false;
        return true;
      })
      .reduce((sum, r) => sum + r.cost, 0);
  }

  getCostByModel(): Map<string, number> {
    const byModel = new Map<string, number>();
    for (const r of this.records) {
      byModel.set(r.model, (byModel.get(r.model) || 0) + r.cost);
    }
    return byModel;
  }

  getAverageLatency(model?: string): number {
    const records = model
      ? this.records.filter(r => r.model === model)
      : this.records;

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

---

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

---

## 常见问题

### Q: 如何选择主要模型？

A: 根据任务特点选择：
- **Claude**: 代码生成、复杂推理、长文本分析
- **GPT-4**: 创意写作、对话质量、生态集成
- **Gemini**: 大上下文、批量处理、成本敏感场景

### Q: 如何处理 API 限流？

A: 实现多层次防护：
1. 熔断器快速失败
2. 指数退避重试
3. 多模型分散请求
4. 请求队列和批处理

### Q: 如何控制成本？

A: 策略：
1. 简单任务用小模型（Haiku/Mini/Flash）
2. 设置单次请求最大成本
3. 监控每日/每周成本趋势
4. 根据使用量与供应商谈判

---

## 参考资源

- [Anthropic API 文档](https://docs.anthropic.com/)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [模型定价对比](https://artificialanalysis.ai/models)