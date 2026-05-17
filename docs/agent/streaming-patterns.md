---
title: Advanced SSE Streaming Patterns for AI Applications
description: 介绍高级 SSE 流式传输模式，包括协议对比、实现细节和最佳实践。
tags:
  - ai-agent
  - streaming
date: 2026-05-17
---

# Advanced SSE Streaming Patterns for AI Applications

> 本文档介绍高级 SSE 流式传输模式，包括协议对比、实现细节和最佳实践。

---

## 目录

1. [SSE vs WebSocket 对比](#1-sse-vs-websocket-对比)
2. [Server-Sent Events 实现](#2-server-sent-events-实现)
3. [客户端流式处理](#3-客户端流式处理)
4. [背压处理](#4-背压处理)
5. [重连策略](#5-重连策略)
6. [协议变体](#6-协议变体)
7. [性能优化](#7-性能优化)
8. [错误处理与恢复](#8-错误处理与恢复)

---

## 1. SSE vs WebSocket 对比

### 特性对比

| 特性 | SSE | WebSocket |
|------|-----|-----------|
| **协议** | HTTP/HTTPS | `ws://` / `wss://` |
| **方向** | 服务端→客户端（单向） | 双向 |
| **连接开销** | 较低（HTTP/1.1 keep-alive） | 较高（WebSocket 握手） |
| **自动重连** | 内置支持 | 需手动实现 |
| **浏览器支持** | IE 不支持 | 通用 |
| **二进制数据** | 需 Base64 编码 | 原生支持 |
| **每条消息头部** | ~50 字节 | ~2-14 字节 |
| **代理/防火墙** | 很少出问题 | 有时被阻止 |
| **压缩** | 有限 | 支持 per-message deflate |

### 何时使用 SSE

```typescript
// 最佳场景：AI 流式响应、通知、实时推送
interface SSEUseCase {
  scenarios: [
    'AI 聊天流式输出（服务端推送 token）',
    '进度更新和状态通知',
    '实时仪表盘（服务端发起更新）',
    '长任务状态追踪',
  ];
  advantages: [
    '简单的 HTTP 协议，无需特殊基础设施',
    '自动重连，内置心跳',
    '单连接多数据流',
    '易于调试（普通 HTTP 工具即可）',
  ];
}
```

### SSE 限制场景

```typescript
// 不适合 SSE 的场景
interface SSEUnsuitable {
  scenarios: [
    '高频双向通信（如在线游戏）',
    '需要传输二进制数据',
    '客户端也需要主动发送数据',
    '需要 IE 兼容',
  ];
  recommendation: '使用 WebSocket 或轮询';
}
```

---

## 2. Server-Sent Events 实现

### 2.1 Express 实现

```typescript
// server/express-sse.ts
import express from 'express';
import { Request, Response } from 'express';

const app = express();

// SSE 端点
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx 禁用缓冲
  res.flushHeaders();

  const { messages, model } = req.body;

  try {
    // 模拟 LLM 流式响应
    const stream = await callLLMStream(messages, model);

    for await (const chunk of stream) {
      const data = JSON.stringify({
        choices: [{ delta: { content: chunk }, finish_reason: null }],
      });
      res.write(`data: ${data}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    const errorData = JSON.stringify({ error: error.message });
    res.write(`data: ${errorData}\n\n`);
    res.end();
  }
});

// keep-alive 心跳
setInterval(() => {
  res.write(': heartbeat\n\n');
}, 30000);
```

### 2.2 Fastify 实现

```typescript
// server/fastify-sse.ts
import Fastify from 'fastify';

const fastify = Fastify();

fastify.post('/api/chat/stream', async (request, reply) => {
  // 设置流式响应
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders();

  const { messages, model } = request.body as any;

  try {
    const stream = await callLLMStream(messages, model);

    for await (const chunk of stream) {
      const data = JSON.stringify({
        choices: [{ delta: { content: chunk } }],
      });
      reply.raw.write(`data: ${data}\n\n`);
    }

    reply.raw.end('data: [DONE]\n\n');
  } catch (error) {
    reply.raw.end(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  }

  return reply;
});
```

### 2.3 NestJS 实现

```typescript
// chat.controller.ts
@Controller('api')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('chat/stream')
  async chatStream(
    @Body() dto: ChatRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await this.chatService.chatStream(dto, res);
  }
}

// chat.service.ts
@Injectable()
export class ChatService {
  async *chatStream(dto: ChatRequestDto, res: Response): AsyncGenerator<void> {
    try {
      res.write('event: connected\ndata: {"status":"connected"}\n\n');

      const stream = await this.llm.stream(dto.messages);

      for await (const chunk of stream) {
        const content = this.extractContent(chunk);
        if (content) {
          const data = JSON.stringify({
            choices: [{ delta: { content }, finish_reason: null }],
          });
          res.write(`data: ${data}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
      res.end();
    }
  }

  private extractContent(chunk: any): string {
    if (typeof chunk.content === 'string') return chunk.content;
    if (Array.isArray(chunk.content)) {
      return chunk.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');
    }
    return '';
  }
}
```

### 2.4 Python FastAPI 实现

```python
# server/fastapi_sse.py
from fastapi import FastAPI, Response
from fastapi.responses import StreamingResponse
import asyncio
import json

app = FastAPI()

@app.post("/api/chat/stream")
async def chat_stream(messages: list[dict]):
    async def event_generator():
        try:
            # 发送连接确认
            yield f"data: {json.dumps({'status': 'connected'})}\n\n"

            # 流式调用 LLM
            async for chunk in call_llm_stream(messages):
                data = json.dumps({
                    'choices': [{'delta': {'content': chunk}, 'finish_reason': None}]
                })
                yield f"data: {data}\n\n"

            # 发送完成信号
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

---

## 3. 客户端流式处理

### 3.1 Fetch API 实现

```typescript
// hooks/useStreamChat.ts
export function useStreamChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendStreamMessage = async (content: string) => {
    // 1. 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // 2. 创建助手消息占位符
    const assistantId = generateId();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ]);
    setIsStreaming(true);

    // 3. 创建 AbortController
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) {
              fullContent += token;
              // 增量更新 UI
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId ? { ...msg, content: fullContent } : msg
                )
              );
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was cancelled');
      } else {
        console.error('Stream error:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: fullContent + '\n[Error: ' + error.message + ']' }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, isStreaming: false } : msg
        )
      );
    }
  };

  const cancelStream = () => {
    abortControllerRef.current?.abort();
  };

  return { messages, isStreaming, sendStreamMessage, cancelStream };
}
```

### 3.2 EventSource 实现（仅服务端→客户端）

```typescript
// 注意：EventSource 不支持 POST 请求，适合已建立会话的场景

class StreamingClient {
  private eventSource: EventSource | null = null;
  private onMessage: (content: string) => void;
  private onError: (error: Error) => void;
  private onDone: () => void;

  constructor(
    url: string,
    onMessage: (content: string) => void,
    onError: (error: Error) => void,
    onDone: () => void
  ) {
    this.onMessage = onMessage;
    this.onError = onError;
    this.onDone = onDone;
    this.connect(url);
  }

  private connect(url: string) {
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        this.onDone();
        return;
      }

      try {
        const parsed = JSON.parse(event.data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          this.onMessage(token);
        }
      } catch (e) {
        // 忽略解析错误
      }
    };

    this.eventSource.onerror = (error) => {
      this.onError(new Error('SSE connection error'));
      this.eventSource?.close();
    };
  }

  close() {
    this.eventSource?.close();
  }
}

// 使用
const client = new StreamingClient(
  '/api/chat/subscribe?sessionId=123',
  (token) => {
    // 处理收到的 token
    setContent((prev) => prev + token);
  },
  (error) => {
    console.error('Stream error:', error);
  },
  () => {
    console.log('Stream complete');
  }
);

// 清理
onUnmount(() => client.close());
```

### 3.3 React 组件实现

```typescript
// components/StreamChat.tsx
export const StreamChat: React.FC = () => {
  const { messages, isStreaming, sendStreamMessage, cancelStream } =
    useStreamChat();
  const [input, setInput] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    await sendStreamMessage(input);
    setInput('');
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !input.trim()}>
          {isStreaming ? '发送中...' : '发送'}
        </button>
        {isStreaming && (
          <button type="button" onClick={cancelStream}>
            取消
          </button>
        )}
      </form>
    </div>
  );
};

// ChatMessage.tsx
export const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const isStreaming = message.isStreaming;

  return (
    <div className={`message message--${message.role}`}>
      <div className="message__avatar">
        {message.role === 'user' ? '👤' : '🤖'}
      </div>
      <div className="message__content">
        <div className={`message__text ${isStreaming ? 'typing-cursor' : ''}`}>
          {message.content || (isStreaming ? '思考中...' : '')}
        </div>
        {message.timestamp && (
          <div className="message__time">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 3.4 打字机效果

```css
/* 打字机光标 */
.typing-cursor::after {
  content: '▊';
  animation: blink 0.8s infinite;
  color: var(--primary-color, #3b82f6);
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* 消息淡入动画 */
.message {
  animation: message-in 0.2s ease-out;
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 流式内容高亮 */
.message__text.streaming {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(59, 130, 246, 0.1) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

---

## 4. 背压处理

### 4.1 概念说明

背压（Backpressure）是指下游处理速度跟不上上游发送速度时，需要控制发送速率的机制。

```
生产者 → 缓冲区 → 消费者
            ↑
         背压信号：缓冲区满时减慢生产
```

### 4.2 服务端背压处理

```typescript
// server/backpressure-handler.ts
class BackpressureHandler {
  private buffer: string[] = [];
  private readonly maxBufferSize = 100;
  private readonly flushInterval = 50; // ms

  async write(res: Response, data: string): Promise<boolean> {
    // 检查缓冲区是否满
    if (this.buffer.length >= this.maxBufferSize) {
      // 等待缓冲区清空
      await this.waitForDrain();
    }

    this.buffer.push(data);

    // 定期刷新
    if (this.buffer.length >= 10) {
      await this.flush(res);
    }

    return true;
  }

  private async waitForDrain(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.buffer.length < this.maxBufferSize / 2) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  async flush(res: Response): Promise<void> {
    if (this.buffer.length === 0) return;

    const data = this.buffer.join('');
    this.buffer = [];

    res.write(data);
  }

  async end(res: Response): Promise<void> {
    await this.flush(res);
    res.end();
  }
}

// 使用
const handler = new BackpressureHandler();

for await (const chunk of stream) {
  await handler.write(res, `data: ${JSON.stringify(chunk)}\n\n`);
}

await handler.end(res);
```

### 4.3 客户端背压处理

```typescript
// 控制渲染节流
class RenderThrottler {
  private lastRenderTime = 0;
  private readonly minInterval = 16; // ~60fps
  private pendingContent = '';
  private rafId: number | null = null;

  scheduleRender(content: string) {
    this.pendingContent = content;

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.render());
    }
  }

  private render() {
    const now = performance.now();
    const elapsed = now - this.lastRenderTime;

    if (elapsed >= this.minInterval) {
      this.updateUI(this.pendingContent);
      this.lastRenderTime = now;
      this.rafId = null;
    } else {
      this.rafId = requestAnimationFrame(() => this.render());
    }
  }

  private updateUI(content: string) {
    // 更新 DOM
  }
}
```

---

## 5. 重连策略

### 5.1 指数退避重连

```typescript
// client/reconnect-strategy.ts
class ReconnectStrategy {
  private baseDelay = 1000;
  private maxDelay = 30000;
  private attempts = 0;

  getNextDelay(): number {
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.attempts),
      this.maxDelay
    );
    // 添加随机抖动
    const jitter = Math.random() * delay * 0.1;
    this.attempts++;
    return delay + jitter;
  }

  reset() {
    this.attempts = 0;
  }

  shouldRetry(): boolean {
    return this.attempts < 10;
  }
}

// 重连 Hook
function useReconnectingStream(url: string) {
  const strategy = new ReconnectStrategy();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  const connect = useCallback(async () => {
    while (strategy.shouldRetry()) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        setStatus('connected');
        strategy.reset();
        // 处理流
        await handleStream(response);
        break;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // 用户取消
          break;
        }
        setStatus('error');
        const delay = strategy.getNextDelay();
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, [url]);

  useEffect(() => {
    connect();
  }, [connect]);

  return { status };
}
```

### 5.2 SSE 原生重连

SSE 自带自动重连，但需要正确处理连接状态：

```typescript
// 服务器端发送重连提示
function sendSSEData(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);

  // 可选：发送心跳保持连接
  // res.write(': heartbeat\n\n');
}

// 客户端处理重连
const eventSource = new EventSource(url);

eventSource.onopen = () => {
  console.log('SSE connected');
  reconnectCount = 0;
};

eventSource.onmessage = (event) => {
  if (event.data === '[DONE]') {
    // 处理完成
    return;
  }
  // 处理数据
  handleData(JSON.parse(event.data));
};

eventSource.onerror = (error) => {
  // SSE 会自动重连，这里可以记录重连次数
  reconnectCount++;
  if (reconnectCount > 5) {
    eventSource.close();
    // 手动干预
  }
};
```

---

## 6. 协议变体

### 6.1 OpenAI 兼容协议

```typescript
// OpenAI Chat Completions 格式
interface OpenAIStreamResponse {
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}

// 服务端发送
`data: ${JSON.stringify({
  choices: [{ delta: { content: 'Hello' }, finish_reason: null }]
})}\n\n`

// 结束
`data: [DONE]\n\n`
```

### 6.2 Anthropic 协议

```typescript
// Anthropic 消息流格式
interface AnthropicStreamResponse {
  type: 'content_block_delta';
  index: number;
  delta: {
    type: 'text_delta';
    text: string;
  };
}

// 服务端发送
`data: ${JSON.stringify({
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: 'Hello' }
})}\n\n`

// 结束
`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`
```

### 6.3 自定义协议

```typescript
// 带类型的自定义 SSE 协议
interface SSEMessage {
  type: 'token' | 'tool_call' | 'tool_result' | 'error' | 'done';
  data: any;
  id?: string;
  timestamp?: number;
}

// 发送消息
function sendSSEMessage(res: Response, message: SSEMessage) {
  res.write(`event: ${message.type}\n`);
  res.write(`data: ${JSON.stringify(message.data)}\n\n`);
}

// 客户端接收
eventSource.addEventListener('token', (e) => {
  const content = JSON.parse(e.data);
  appendContent(content);
});

eventSource.addEventListener('tool_call', (e) => {
  const toolCall = JSON.parse(e.data);
  executeTool(toolCall);
});
```

---

## 7. 性能优化

### 7.1 连接复用

```typescript
// HTTP Keep-Alive 配置
const agent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
});

// 使用连接池
const pool = new ConnectionPool({
  maxConnections: 10,
  minConnections: 2,
  acquireTimeout: 5000,
});
```

### 7.2 消息批处理

```typescript
// 服务端批处理
class MessageBatcher {
  private buffer: Map<string, string[]> = new Map();
  private flushInterval = 50;

  add(connectionId: string, message: string) {
    if (!this.buffer.has(connectionId)) {
      this.buffer.set(connectionId, []);
    }
    this.buffer.get(connectionId).push(message);
  }

  startFlush(res: Response) {
    setInterval(() => {
      const batch = this.buffer.get(connectionId);
      if (batch && batch.length > 0) {
        res.write(batch.join(''));
        this.buffer.set(connectionId, []);
      }
    }, this.flushInterval);
  }
}
```

### 7.3 客户端批量渲染

```typescript
// 使用 DocumentFragment 减少 DOM 操作
function appendMessages(container: HTMLElement, messages: Message[]) {
  const fragment = document.createDocumentFragment();

  messages.forEach((msg) => {
    const div = document.createElement('div');
    div.textContent = msg.content;
    fragment.appendChild(div);
  });

  container.appendChild(fragment);
}
```

### 7.4 Nginx 配置

```nginx
# nginx.conf
location /api/chat/stream {
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_set_header Accept 'text/event-stream';
    proxy_cache off;
    proxy_buffering off;
    proxy_chunked_transfer_encoding on;
    tcp_nodelay on;
}
```

---

## 8. 错误处理与恢复

### 8.1 服务端错误处理

```typescript
// server/error-handler.ts
async function handleStreamError(res: Response, error: Error) {
  console.error('Stream error:', error);

  const errorResponse = {
    error: {
      message: error.message,
      code: error instanceof LLMError ? error.code : 'UNKNOWN',
      retryable: isRetryableError(error),
    },
  };

  res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
  res.end();
}

function isRetryableError(error: Error): boolean {
  // 网络错误、超时等可重试
  if (error instanceof NetworkError) return true;
  if (error instanceof TimeoutError) return true;
  // 限流可重试
  if (error instanceof RateLimitError) return true;
  return false;
}
```

### 8.2 客户端错误恢复

```typescript
// client/stream-client.ts
class StreamClient {
  private maxRetries = 3;
  private retryDelay = 1000;

  async *stream(messages: any[]): AsyncGenerator<string> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchStream(messages);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) return;

          const chunk = decoder.decode(value);
          yield* this.parseChunk(chunk);
        }
      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryable(error)) {
          throw error;
        }

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
          continue;
        }
      }
    }

    throw lastError;
  }

  private isRetryable(error: Error): boolean {
    return (
      error instanceof NetworkError ||
      error instanceof TimeoutError ||
      (error as any).status === 429 ||
      (error as any).status >= 500
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 8.3 优雅关闭

```typescript
// 服务端优雅关闭
const connections = new Set();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');

  // 通知所有客户端
  for (const res of connections) {
    res.write(`data: ${JSON.stringify({ type: 'shutdown', reason: 'Server restarting' })}\n\n`);
    res.end();
  }

  // 等待一段时间让客户端处理
  await new Promise((resolve) => setTimeout(resolve, 5000));

  process.exit(0);
});

// 客户端监听关闭信号
eventSource.addEventListener('shutdown', (e) => {
  const data = JSON.parse(e.data);
  console.log('Server shutting down:', data.reason);
  // 清理资源
  cleanup();
});
```

---

## 总结

SSE 是实现 AI 流式对话的理想选择，具有以下优势：

| 优势 | 说明 |
|------|------|
| 简单性 | 基于标准 HTTP，易于部署和调试 |
| 兼容性 | 良好的浏览器和服务器支持 |
| 自动重连 | 内置机制减少连接断开的影响 |
| 单向优化 | 对于 AI 流式响应足够，无需双向 |

**最佳实践**：
1. 使用 Nginx 配置禁用缓冲确保实时性
2. 实现重连策略处理网络波动
3. 背压处理防止内存溢出
4. 正确的错误分类决定是否重试

---

## 参考资源

- [MDN: Using Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [OpenAI API Streaming](https://platform.openai.com/docs/api-reference/chat/create#chat-create-stream)
- [Anthropic Streaming](https://docs.anthropic.com/en/api/messages-streaming)
- [NestJS Streaming](https://docs.nestjs.com/controllers#streaming-responses)