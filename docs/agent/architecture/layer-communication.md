---
title: 通信层
description: Agent 分层架构之通信层：Agent 间消息协议与协作通信。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 通信层

通信层处理 Agent 与外部系统的实时通信。

## 1. SSE/WebSocket 连接

实时双向通信支持。

```typescript
// 连接配置
interface ConnectionConfig {
  type: 'sse' | 'websocket';
  url: string;
  headers?: Record<string, string>;
  protocols?: string[];
  reconnect?: ReconnectConfig;
}

interface ReconnectConfig {
  enabled: boolean;
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

// 连接状态
interface ConnectionState {
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  lastConnected?: number;
  reconnectAttempts: number;
  error?: Error;
}

// SSE 客户端
class SSEClient {
  private eventSource: EventSource | null = null;
  private state: ConnectionState;
  private listeners: Map<string, EventListener[]> = new Map();
  private reconnectTimer?: NodeJS.Timeout;

  constructor(private config: ConnectionConfig) {
    this.state = {
      status: 'disconnected',
      reconnectAttempts: 0
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.state.status = 'connecting';

        this.eventSource = new EventSource(this.config.url, {
          withCredentials: true
        });

        this.eventSource.onopen = () => {
          this.state.status = 'connected';
          this.state.lastConnected = Date.now();
          this.state.reconnectAttempts = 0;
          resolve();
        };

        this.eventSource.onerror = (error) => {
          this.handleError(error);
          reject(error);
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event);
        };

        // 自定义事件
        this.setupCustomEvents();
      } catch (error) {
        this.state.status = 'error';
        reject(error);
      }
    });
  }

  private setupCustomEvents(): void {
    if (!this.eventSource) return;

    // 支持自定义事件类型
    const customEventTypes = ['delta', 'complete', 'error', 'info'];

    for (const type of customEventTypes) {
      this.eventSource.addEventListener(type, (event: MessageEvent) => {
        this.emit(type, JSON.parse(event.data));
      });
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.emit('message', data);
    } catch {
      this.emit('message', event.data);
    }
  }

  private handleError(error: Event): void {
    this.state.status = 'error';
    this.state.error = new Error('SSE connection error');

    this.emit('error', error);

    // 自动重连
    if (this.config.reconnect?.enabled) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const config = this.config.reconnect!;
    const delay = Math.min(
      config.baseDelay * Math.pow(2, this.state.reconnectAttempts),
      config.maxDelay
    );

    this.reconnectTimer = setTimeout(async () => {
      if (this.state.reconnectAttempts < config.maxAttempts) {
        this.state.status = 'reconnecting';
        this.state.reconnectAttempts++;

        try {
          await this.connect();
        } catch {
          // 继续等待下一次重连
        }
      }
    }, delay);
  }

  on(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event) || [];

    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Listener error for ${event}:`, error);
      }
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.state.status = 'disconnected';
  }

  getState(): ConnectionState {
    return { ...this.state };
  }
}

// WebSocket 客户端
class WebSocketClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState;
  private listeners: Map<string, EventListener[]> = new Map();
  private messageQueue: string[] = [];
  private reconnectTimer?: NodeJS.Timeout;

  constructor(private config: ConnectionConfig) {
    this.state = {
      status: 'disconnected',
      reconnectAttempts: 0
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.state.status = 'connecting';

        this.ws = new WebSocket(this.config.url, this.config.protocols);

        this.ws.onopen = () => {
          this.state.status = 'connected';
          this.state.lastConnected = Date.now();
          this.state.reconnectAttempts = 0;

          // 发送队列中的消息
          this.flushQueue();

          resolve();
        };

        this.ws.onerror = (error) => {
          this.state.status = 'error';
          this.state.error = new Error('WebSocket error');
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
        };
      } catch (error) {
        this.state.status = 'error';
        reject(error);
      }
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.emit('message', data);
    } catch {
      this.emit('message', event.data);
    }
  }

  private handleClose(event: CloseEvent): void {
    this.state.status = 'disconnected';

    this.emit('close', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    // 自动重连
    if (this.config.reconnect?.enabled && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const config = this.config.reconnect!;
    const delay = Math.min(
      config.baseDelay * Math.pow(2, this.state.reconnectAttempts),
      config.maxDelay
    );

    this.reconnectTimer = setTimeout(async () => {
      if (this.state.reconnectAttempts < config.maxAttempts) {
        this.state.status = 'reconnecting';
        this.state.reconnectAttempts++;

        try {
          await this.connect();
        } catch {
          // 继续等待下一次重连
        }
      }
    }, delay);
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
    } else {
      // 队列消息直到连接恢复
      this.messageQueue.push(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.ws?.send(message);
    }
  }

  on(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event) || [];

    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Listener error for ${event}:`, error);
      }
    }
  }

  disconnect(code: number = 1000, reason: string = 'Normal closure'): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }

    this.state.status = 'disconnected';
  }

  getState(): ConnectionState {
    return { ...this.state };
  }
}

type EventListener = (data: any) => void;
```

## 2. 流式处理 (Streaming)

流式数据处理支持实时响应。

```typescript
// 流式处理器
// 第 1 段：类字段与构造配置（定义缓冲/定时刷新的状态机骨架）
// 核心思想是"攒批"：单条 chunk 立刻处理会产生大量小 I/O，攒到阈值或定时再统一提交。
// maxBufferSize 与 flushInterval 是一对互补的触发条件：前者防内存爆掉，后者防数据久留不出。
class StreamProcessor {
  private buffer: Chunk[] = []; // 待刷新的待处理队列，只有 flush 成功后才清空
  private maxBufferSize: number; // 容量上限，达到即主动触发一次 flush
  private flushInterval: number; // 定时兜底间隔（毫秒），保证低流量下数据不会无限滞留
  private flushTimer?: NodeJS.Timeout; // setInterval 句柄，destroy 时必须清除，否则进程无法退出

  constructor(config: StreamConfig) {
    // 用 || 而非 ??，所以传入 0 会被替换为默认值——这是边界上的隐式行为，需注意
    this.maxBufferSize = config.maxBufferSize || 100;
    this.flushInterval = config.flushInterval || 100;

    // 构造即启动定时器：即使在 startFlushTimer 之前就已有数据入队，也能被周期扫描到
    this.startFlushTimer();
  }

  // 第 2 段：单条 chunk 的入口与触发判定（决定"何时刷"）
  // 优先级设计：终止类消息（complete/error）必须立刻落地，不能等阈值，否则调用方会读到不完整结果。
  async process(chunk: Chunk): Promise<void> {
    this.buffer.push(chunk);

    if (chunk.type === 'complete' || chunk.type === 'error') {
      await this.flush(); // 终止信号：同步 flush，保证语义上是"处理完这条就结束"
    } else if (this.buffer.length >= this.maxBufferSize) {
      await this.flush(); // 容量触发：>= 而非 ===，兼容并发入队时跨过阈值的场景
    }
    // 其余情况交给定时器兜底，此处直接返回，不阻塞调用方
  }

  // 第 3 段：刷新——快照交换 + 消费（防重入与丢数据的关键）
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return; // 空批次直接返回，避免无意义的 processBatch 调用

    // 先用展开做快照再整体置空：await 期间新到的 chunk 会落到新的 buffer 中，不会丢失
    const batch = [...this.buffer];
    this.buffer = [];

    // 处理批量数据
    // 注意：这里若 processBatch 抛错，batch 已被移出 buffer，数据不会被重试（教学需强调的失败点）
    await this.processBatch(batch);
  }

  private async processBatch(chunks: Chunk[]): Promise<void> {
    // 批量处理逻辑
    // 由子类/使用者实现真正的落库或网络写入；复杂度 O(n)，n 为本次批大小
  }

  // 第 4 段：定时兜底刷新（应对稀疏流的"时间触发"路径）
  private startFlushTimer(): void {
    // 回调是 async：setInterval 不会等待它，若 flush 耗时超过 interval 可能重叠执行
    // Node 的定时器若不 clearInterval，会一直保活 event loop
    this.flushTimer = setInterval(async () => {
      if (this.buffer.length > 0) {
        await this.flush(); // 只在非空时刷，减少空转与无效异步调度
      }
    }, this.flushInterval);
  }

  // 第 5 段：资源释放（生命周期收尾）
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer); // 仅清定时器；注意此处不 flush 残留 buffer，属于已知的丢弃风险
    }
  }
}

// Chunk 定义
// 第 6 段：数据契约——type 用字面量联合类型做可辨识标记，供上层对各分支做穷尽性检查
interface Chunk {
  type: 'text' | 'delta' | 'complete' | 'error'; // 判别字段，complete/error 同时充当流结束信号
  data: any; // 载荷，proto 层故意放宽；上层需按 type 自行收窄
  timestamp: number; // 产生时刻（ms 时间戳），用于排序、超时或延迟监控
  metadata?: Record<string, any>; // 可选透传字段，不参与核心逻辑，避免污染 data
}

// 流式解析器
// 第 7 段：解析入口——把 Web ReadableStream 适配成 AsyncIterable
// 适配的意义：ReadableStream 只能 getReader().read() 拉取，转成 async iterator 后可用 for await 消费。
class StreamParser {
  // 返回的是构造好的异步可迭代对象，parse 本身不做实际读取（惰性），首次迭代才真正开始 pull
  async parse(stream: ReadableStream<Uint8Array>): Promise<AsyncIterable<Chunk>> {
    const reader = stream.getReader(); // 锁住流；同一 stream 只能有一个 reader，重复 getReader 会抛错
    let buffer = ''; // 跨 chunk 残留的不完整行；UTF-8 多字节字符可能被切在两次 read 之间

    return {
      async *[Symbol.asyncIterator]() {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // 流已结束：残留的 buffer 里是没有以 \n 收尾的最后一行，必须补解析
            if (buffer.length > 0) {
              yield* this.parseBuffer(buffer);
            }
            break;
          }

          // 每片都新建 TextDecoder：多字节字符跨 chunk 边界时会被解码成替换字符 U+FFFD（易错点）
          // 正确做法是复用带 { stream: true } 的 decoder，这里代码保持原样
          buffer += new TextDecoder().decode(value);
          const lines = buffer.split('\n');

          // 只处理前面完整行，最后一段可能是半行，留到下一轮拼接
          for (let i = 0; i < lines.length - 1; i++) {
            yield* this.parseLine(lines[i]); // 逐行解析并原样转发 chunk，保持流式背压
          }

          buffer = lines[lines.length - 1]; // 保存未完成行，等待后续字节补齐
        }
      }
    };
  }

  // 第 8 段：单行解析——JSON 优先，失败降级为纯文本
  // 容错策略：协议里既可能出现 NDJSON，也可能混入日志/非 JSON 行，因此解析失败不能中断整条流。
  private async *parseLine(line: string): AsyncIterable<Chunk> {
    if (!line.trim()) return; // 跳过空行/纯空白，避免产出无意义 chunk

    try {
      const data = JSON.parse(line);

      yield {
        // 用 || 兜底：'text' 兼作缺省类型，同时也意味着空字符串 type 会被覆盖
        type: data.type || 'text',
        data: data.content || data, // 有 content 取 content，否则整个对象透传，兼容两种协议形态
        timestamp: Date.now(), // 用消费时刻而非生产时刻，是本地近似值
        metadata: data.metadata
      };
    } catch {
      // 降级路径：非 JSON 行原样当文本块吐出，保证内容不丢，但 type 丢失
      yield {
        type: 'text',
        data: line,
        timestamp: Date.now()
      };
    }
  }

  // 第 9 段：收尾解析——处理流末尾没有换行符的残余数据
  private async *parseBuffer(buffer: string): AsyncIterable<Chunk> {
    const chunks = buffer.split('\n'); // 与主循环不同，这里没有"最后一段不完整"的顾虑，可全部处理

    for (const chunk of chunks) {
      if (chunk.trim()) {
        yield* this.parseLine(chunk);
      }
    }
  }
}
```
## 3. 错误恢复 (Error Recovery)

错误恢复机制确保通信的可靠性。

```typescript
// 错误恢复器
class ErrorRecovery {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private maxRetries: number;
  private circuitBreaker: CircuitBreaker;

  constructor(config: RecoveryConfig) {
    this.maxRetries = config.maxRetries || 3;
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);

    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    this.strategies.set('network', new NetworkErrorStrategy(this.maxRetries));
    this.strategies.set('timeout', new TimeoutStrategy(this.maxRetries));
    this.strategies.set('server', new ServerErrorStrategy(this.maxRetries));
    this.strategies.set('auth', new AuthErrorStrategy());
  }

  async recover(error: Error, context: RecoveryContext): Promise<RecoveryResult> {
    // 检查断路器
    if (this.circuitBreaker.isOpen()) {
      return {
        success: false,
        action: 'circuit_open',
        message: 'Circuit breaker is open, not retrying'
      };
    }

    const errorType = this.classifyError(error);
    const strategy = this.strategies.get(errorType);

    if (!strategy) {
      return {
        success: false,
        action: 'none',
        message: `No recovery strategy for ${errorType}`
      };
    }

    try {
      const result = await strategy.execute(context);

      if (!result.success) {
        this.circuitBreaker.recordFailure();
      } else {
        this.circuitBreaker.recordSuccess();
      }

      return result;
    } catch (recoveryError) {
      this.circuitBreaker.recordFailure();

      return {
        success: false,
        action: 'failed',
        message: (recoveryError as Error).message
      };
    }
  }

  private classifyError(error: Error): string {
    if (error.message.includes('timeout')) return 'timeout';
    if (error.message.includes('network')) return 'network';
    if (error.message.includes('401') || error.message.includes('403')) return 'auth';
    if (error.message.includes('500') || error.message.includes('502')) return 'server';

    return 'unknown';
  }
}

// 恢复策略接口
interface RecoveryStrategy {
  execute(context: RecoveryContext): Promise<RecoveryResult>;
}

// 网络错误策略
class NetworkErrorStrategy implements RecoveryStrategy {
  constructor(private maxRetries: number) {}

  async execute(context: RecoveryContext): Promise<RecoveryResult> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // 等待后重试（指数退避）
        await this.delay(Math.pow(2, attempt) * 100);

        // 重试请求
        const response = await context.retryFn();

        return {
          success: true,
          action: 'retry_success',
          message: `Recovered on attempt ${attempt}`
        };
      } catch {
        if (attempt === this.maxRetries) {
          return {
            success: false,
            action: 'max_retries_exceeded',
            message: `Failed after ${this.maxRetries} attempts`
          };
        }
      }
    }

    return {
      success: false,
      action: 'failed',
      message: 'Max retries exceeded'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 断路器
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half_open' = 'closed';
  private threshold: number;
  private timeout: number;

  constructor(config: { threshold: number; timeout: number }) {
    this.threshold = config.threshold;
    this.timeout = config.timeout;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half_open';
        return false;
      }
      return true;
    }
    return false;
  }
}
```

## 4. 背压控制 (Backpressure Control)

背压控制防止系统过载。

```typescript
// 背压控制器
class BackpressureController {
  private queue: Request[] = [];
  private processing: number = 0;
  private maxConcurrent: number;
  private maxQueueSize: number;
  private dropPolicy: DropPolicy;

  constructor(config: BackpressureConfig) {
    this.maxConcurrent = config.maxConcurrent || 10;
    this.maxQueueSize = config.maxQueueSize || 100;
    this.dropPolicy = config.dropPolicy || 'tail_drop';
  }

  async enqueue(request: Request): Promise<boolean> {
    // 检查是否超出队列容量
    if (this.queue.length >= this.maxQueueSize) {
      return this.handleOverflow(request);
    }

    // 检查是否超出并发限制
    if (this.processing >= this.maxConcurrent) {
      this.queue.push(request);
      return true;
    }

    // 直接处理
    return this.process(request);
  }

  private async handleOverflow(request: Request): Promise<boolean> {
    switch (this.dropPolicy) {
      case 'tail_drop':
        // 丢弃新请求
        return false;

      case 'head_drop':
        // 丢弃队首请求，添加新请求
        this.queue.shift();
        this.queue.push(request);
        return true;

      case 'random_drop':
        // 随机丢弃
        if (Math.random() < 0.1) {
          return false;
        }
        this.queue.push(request);
        return true;

      case 'priority_drop':
        // 基于优先级丢弃
        const lowPriority = this.queue.filter(r => r.priority < request.priority);
        if (lowPriority.length > 0) {
          this.queue.splice(this.queue.indexOf(lowPriority[0]), 1);
          this.queue.push(request);
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  private async process(request: Request): Promise<boolean> {
    this.processing++;

    try {
      await request.handler();
      return true;
    } catch {
      return false;
    } finally {
      this.processing--;
      this.processNext();
    }
  }

  private processNext(): void {
    if (this.queue.length > 0 && this.processing < this.maxConcurrent) {
      const next = this.queue.shift()!;
      this.process(next);
    }
  }

  getStats(): BackpressureStats {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      utilization: this.processing / this.maxConcurrent
    };
  }
}

interface Request {
  id: string;
  handler: () => Promise<void>;
  priority: number;
  timestamp: number;
}

interface BackpressureStats {
  queueLength: number;
  processing: number;
  utilization: number;
}

type DropPolicy = 'tail_drop' | 'head_drop' | 'random_drop' | 'priority_drop';
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [RFC 6455 WebSocket](https://www.rfc-editor.org/rfc/rfc6455) | WebSocket 协议权威定义，握手与帧格式的唯一准绳。 | 重点读第 4、5 章握手与数据帧，抓包对照 Upgrade 报文验证。 |
| [MDN 使用 SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) | SSE 官方入门，含 EventSource API 与断线重连机制。 | 读事件流格式与重连一节，用 EventSource 写通知推送并观察重连。 |
| [Writing WebSocket client applications](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications) | 客户端 API 全貌，涵盖 bufferedAmount 等关键属性。 | 读构造函数、事件与 bufferedAmount，思考发送过快时如何限流。 |
| [Writing WebSocket servers](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers) | 服务端握手与帧处理权威说明，理解协议落地细节。 | 读握手校验与帧解析流程，对照自己的服务端实现查漏。 |
| [MDN WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API) | 对比 WebSocket 的新一代传输，含流与背压模型。 | 读 streams 与 datagrams 区别，思考流式传输中背压如何传递。 |
| [Socket.IO 文档](https://socket.io/docs/v4/) | 内置重连、缓冲与房间的成熟方案文档。 | 读重连与缓冲章节，测试断网后事件补偿与消息堆积行为。 |
| [Network Error Logging (NEL)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Network_Error_Logging) | 网络错误上报标准，为连接失败提供可观测手段。 | 读 NEL 与 Report-To 配置，为流式接口加上失败上报策略。 |
| [Control flow and error handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling) | JS 错误处理基础，是设计恢复逻辑的前置知识。 | 复习 try/catch 与 Promise 错误传播，为流式回调设计兜底。 |
| [AsyncAPI 文档](https://www.asyncapi.com/docs) | 异步消息接口描述规范，便于把通信契约化。 | 浏览消息与信道章节，为你的 WS 主题写一份 AsyncAPI 描述。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Writing a WebSocket server in JavaScript (Deno)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_a_WebSocket_server_in_JavaScript_Deno) | 可运行的服务端示例，含帧解析与消息循环代码。 | 跑通 Deno 服务并用浏览器连接，再单步调试收发分支。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [阮一峰：WebSocket 教程](https://www.ruanyifeng.com/blog/2017/05/websocket.html) | 中文上手教程，示例简洁，适合快速跑通回显。 | 照着写回显服务，连接成功后观察消息与控制帧收发。 |
| [现代 JavaScript 教程：WebSocket](https://zh.javascript.info/websocket) | 系统讲解握手、心跳与扩展，配套聊天室练习。 | 按章实现心跳与重连，思考长连接断开后如何恢复状态。 |
| [现代 JavaScript 教程：网络请求](https://zh.javascript.info/network) | 从请求到长连接的体系化教程，每章带练习。 | 顺序读完各章并做练习，对比短连接与长连接的差异。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 客服后台的逐字回复草稿 | 流式处理、SSE 连接 | SSE（text/event-stream）+ Node http | 中间代理要关闭缓冲，否则首字被攒住 |
| 坐席合盖再打开后的对话恢复 | 错误恢复 | SSE + Last-Event-ID + 服务端环形缓冲 | 重放窗口外的事件要能降级为全量重取 |
| 告警推送到几十台值班终端 | 背压控制、WebSocket 连接 | WebSocket + 每连接有界队列 | 队列溢出要按等级丢弃并计数，P0 不能丢 |
| 生产日志实时追踪页 | WebSocket 连接、流式处理 | WebSocket + 服务端按行分片 | 心跳间隔要小于中间设备的空闲回收时间 |
| 低端安卓机的首屏 AI 摘要 | 背压控制、流式处理 | SSE + 首包先发页面骨架 | 正文分帧追加，不要阻塞首屏渲染 |
| 多人协作白板上的 AI 图形生成 | 错误恢复、WebSocket 连接 | WebSocket + 消息序号 + id 去重 | 重放的操作要幂等，不能按追加渲染 |
| IDE 里的代码补全 | 流式处理、背压控制 | SSE + AbortController 取消上游 | 用户继续输入时要取消上一条请求，旧结果不得覆盖新结果 |
| 计费对账的 Agent 长任务 | 错误恢复、流式处理 | WebSocket + 任务 id + 服务端进度查询 | 客户端超时不能判定任务失败，重试要带幂等键 |

### 三个场景拆解

#### 场景 1：客服后台的逐字回复草稿

- **业务背景**：坐席在会话窗口等 AI 草稿，空白超过 2 秒就会自己动手写，草稿白生成。规模按坐席并发数估算，峰值并发远低于总坐席数。测量方法：在坐席端记录点击"生成"到首字上屏的毫秒数。

- **怎么用本页知识解决**：思路是先用 SSE 让首字尽快上屏，再用事件 id 支持断线续传，写 socket 前检查背压。

```js
// Node 原生 http：SSE 流式推送 + 断线续传 + 背压
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'X-Accel-Buffering': 'no',       // 让 Nginx 不缓冲这段响应
});
let seq = Number(req.headers['last-event-id'] || 0); // 续传起点
const timer = setInterval(() => res.write(': ping\n\n'), 15000); // 注释行当心跳
for await (const chunk of llmStream) {
  seq += 1;
  res.write(`id: ${seq}\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
  if (res.writableNeedDrain) {     // 内核发送缓冲区已满
    await new Promise((r) => res.once('drain', r)); // 等排空再读上游
  }
}
clearInterval(timer);
res.write('event: done\ndata: {}\n\n'); // 显式结束事件
res.end();
```

- `Content-Type: text/event-stream` 是 SSE 的必需响应头，浏览器只有拿到它才保持连接。
- `Cache-Control: no-cache` 与 `X-Accel-Buffering: no` 一起用，避免中间代理攒够一个缓冲区才下发。
- `id:` 字段让浏览器重连时自动带上 `Last-Event-ID` 请求头，服务端据此从第 seq+1 条重放。
- 每 15 秒写一行以 `:` 开头的注释作为心跳，防止空闲连接被 NAT 或网关回收。
- `writableNeedDrain` 为真表示发送缓冲区已满，`await` drain 事件可把上游 LLM 的读取速度压下来。

- **怎么度量收益**：首字延迟用 Performance API 记录发起请求到第一个 `data` 事件的毫秒数，按 P50、P95 上报；续传命中率由服务端统计带 `Last-Event-ID` 的请求数与成功重放数，导出为 Prometheus Counter；背压次数统计 `writableNeedDrain` 为真的次数，观察它随并发上升的变化。

- **什么时候不该用**：草稿短到一次响应就能装进单个 TCP 包时，分帧与事件头的开销超过收益；合规要求先审后发时，逐字上屏会把未审核内容先展示给坐席。

#### 场景 2：告警风暴下的值班终端

- **业务背景**：告警风暴时单台值班终端每秒会收到几十条告警，前端渲染跟不上就卡死。规模按"峰值每秒消息数除以单机渲染能力"估算，实测方法是给终端注入固定速率的消息，看掉帧。

- **怎么用本页知识解决**：思路是每连接一个有界队列，队列满时先丢最低等级并计数；P0 与 P1 不丢弃，队列放不下就拒收并回执给上游。

```ts
// 每连接一个有界发送队列，满了先丢低等级
const MAX = 200;
const q = conn.queue;                        // 数组，按入队顺序
function enqueue(msg: Alert) {
  if (q.length >= MAX) {
    const i = q.findIndex((m) => m.level < 2); // 找最低等级
    if (i === -1) return false;              // 全是 P0、P1，拒收并回执
    q.splice(i, 1);                          // 丢掉旧的低等级告警
    conn.dropped += 1;                       // 丢弃计数，供监控采集
  }
  q.push(msg);
  conn.flush();                              // socket 空闲就立刻写出
  return true;
}
```

- 队列长度设上限，是为了让内存占用与延迟都有确定的上界。
- 丢弃时按等级挑选，保证 P0、P1 在风暴中仍然送达。
- `conn.dropped` 是丢弃行为的唯一证据，必须导出到监控，否则告警缺失无人发现。
- 拒收时返回 false，上游才知道这条消息没有被接受，可以改写或落盘。

- **怎么度量收益**：丢弃数用 `conn.dropped` 作为 Prometheus Counter，按告警等级打标签；队列水位用队列长度 Histogram，观察 P99 是否长期贴住上限；端到端延迟由客户端上报"收到时间戳减服务端入队时间戳"，在 Grafana 看分位数。

- **什么时候不该用**：值班终端固定在内网专线且数量固定时，丢弃逻辑会掩盖真实的告警缺失；告警需要审计留痕时，连接层丢弃不可接受，应先落可持久化的队列。

#### 场景 3：多人协作白板里的 AI 图形生成

- **业务背景**：白板上多人同时操作，网络切换导致 WebSocket 断开是常态。AI 生成的图形指令在重连后被重放一次，白板上就会出现重复图形。

- **怎么用本页知识解决**：思路是给每条消息编序号，客户端维护本地水位，重连时带上水位只补缺失区间；渲染按消息 id 覆盖而不是追加。

```ts
// 客户端：带水位重连，按 id 幂等渲染
let lastSeq = 0;
function onMessage(raw: string) {
  const msg = JSON.parse(raw);
  if (msg.seq <= lastSeq) return;   // 旧消息或重复消息，丢弃
  lastSeq = msg.seq;                // 推进本地水位
  applyToBoard(msg);                // 同 id 覆盖，不追加新图形
}
ws.onclose = () => {
  const ws2 = new WebSocket(`/board?since=${lastSeq}`); // 带上水位重连
  ws2.onmessage = (e) => onMessage(e.data);
};
```

- 序号让客户端能判断消息是新的还是重放的，重放不会造成二次渲染。
- 水位 `lastSeq` 让服务端只补缺失区间，不必全量重发白板状态。
- 渲染函数按 id 覆盖，是幂等的前提；按追加实现会让重放变成重复图形。
- 服务端要保留一段可重放窗口，窗口之外的重连请求只能返回全量快照。

- **怎么度量收益**：重复渲染次数由前端在应用消息时统计同一 id 二次应用的次数；水位追平耗时用 Performance API 打点，量的是 `onclose` 触发到本地水位追平服务端的毫秒数；消息乱序率由服务端统计到达顺序与 seq 顺序不一致的比例。

- **什么时候不该用**：单人白板没有并发写入，维护 seq 水位只增加状态；操作本身不可幂等时，只靠 id 去重不够，要先做操作合并。

### 行业先进实践

**用 Last-Event-ID 自动续传（出处：WHATWG HTML Living Standard，Server-sent events 章节）**
浏览器 EventSource 在连接断开后自动重连，并把最后收到的 id 放进 `Last-Event-ID` 请求头。服务端按 id 保留一段事件窗口就能补齐断线期间的内容。借鉴方式：给每条下游事件编号，按连接保存最近 N 条用于重放。

**用哨兵事件标记流结束（出处：OpenAI API 官方文档 Streaming 部分）**
OpenAI 的流式响应以 `data: [DONE]` 结束，客户端据此区分"正常结束"与"连接断开"。借鉴方式：定义自己的结束事件，不要用连接关闭来判断生成完成。

**关闭反向代理缓冲（出处：Nginx 官方文档 ngx_http_proxy_module 的 proxy_buffering 与 proxy_ignore_headers 指令）**
Nginx 默认会把上游响应攒起来再下发，SSE 会被攒成大块。上游返回 `X-Accel-Buffering: no`，或在 Nginx 侧关闭 `proxy_buffering`，都能让数据按到达顺序即时下发。借鉴方式：上线前用 curl 观察首字节到达时间，确认链路每一跳都没有缓冲。

**用协议层控制帧做心跳（出处：RFC 6455，WebSocket 协议的控制帧章节）**
WebSocket 自带 Ping、Pong 控制帧，不需要在应用层再造一套心跳消息。控制帧由协议栈处理，不会与应用消息争抢解析逻辑。借鉴方式：服务端定时发 Ping，客户端按规范回 Pong，超时未回就重建连接。

**带版本号重放事件（出处：Kubernetes API 官方文档 Efficient detection of changes 一节）**
Kubernetes 的 watch 可以带 `resourceVersion`，从指定版本开始接收变更，不必全量重拉。借鉴方式：在 Agent 与外部系统的同步通道里维护单调递增的版本号，重连时从上次确认的版本继续。

### 从学到用：落地路线

第 1 步试点：在只读、低风险的页面上接入 SSE，先只做流式，不做续传。验收标准：Chrome DevTools 的 EventStream 面板能看到分帧到达，服务端日志里没有整包下发的记录。

第 2 步验证：在试点页面注入断线，观察是否带上 `Last-Event-ID` 重连并补齐。验收标准：断线后自动重连，补齐结果与未断线时一致。

第 3 步推广：把序号、心跳、队列上限抽成公共客户端与服务端中间件，按页面逐个替换。验收标准：新页面接入只配置事件名与序号字段，不再手写重连逻辑。

第 4 步防回退：在 CI 里加响应头断言与断线重连自动化用例。验收标准：删掉 `no-cache` 或心跳的提交会让 CI 失败。

### 动手作业

**目标**：做一个本地可跑的"Agent 日志流"页面，支持流式输出、断线续传、背压计数。

**步骤**：

1. 用 Node 原生 http 写一个 `/stream` 端点，每 200 毫秒产生一条带自增 id 的事件，共 100 条。
2. 服务端保留最近 50 条事件的环形缓冲，读到 `Last-Event-ID` 后从该 id+1 开始重放。
3. 每 15 秒写一行 `:` 开头的注释作为心跳。
4. 前端用 EventSource 订阅，把事件逐条追加到列表，并显示当前 id。
5. 每次写 socket 前检查 `res.writableNeedDrain`，为真时等 drain 事件并给计数器加一。
6. 加一个 `/stats` 端点，返回背压次数与当前连接数。
7. 用 DevTools 切 Offline 再切回来，验证续传行为。

**验收标准**：

1. 页面打开后 1 秒内出现第一条事件，EventStream 面板里每条事件单独成帧。
2. 断线 10 秒再恢复，列表里不出现重复 id，也不缺 id。
3. 在事件处理里插入同步循环放慢消费后，`/stats` 的背压次数会增长。
4. 把心跳间隔改到大于反向代理的空闲回收时间，连接会被断开，说明心跳是必需的。
5. 去掉 `Cache-Control: no-cache` 并经过带缓冲的代理，记录首条事件到达时间，与修改前对比差值。

