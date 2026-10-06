---
title: 流式传输模式
description: 介绍高级 SSE 流式传输模式，包括协议对比、实现细节和最佳实践。
tags:
  - ai-agent
  - streaming
date: 2026-05-17
---

# 流式传输模式

> 本文档介绍高级 SSE 流式传输模式，包括协议对比、实现细节和最佳实践。

## 1. SSE vs WebSocket 对比

### 1.1 特性对比

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

### 1.2 何时使用 SSE

```typescript
// 第 1 段：定位——用「类型即文档」声明 SSE 的适用边界（纯编译期约束，运行时被擦除，零开销）
// 最佳场景：AI 流式响应、通知、实时推送
interface SSEUseCase {
  // 第 2 段：使用场景清单——刻意用定长元组而非 string[]，把"恰好 4 类场景"钉进类型里
  // 每项都是字符串字面量类型（literal type），元组长度与拼写都在编译期校验
  // 易错点：元组长度固定为 4，增删场景必须同步改类型，否则赋值处直接报错
  scenarios: [
    'AI 聊天流式输出（服务端推送 token）',
    '进度更新和状态通知',
    '实时仪表盘（服务端发起更新）',
    '长任务状态追踪',
  ];
  // 第 3 段：优势清单——同样用定长元组承载"为何选 SSE 而非 WebSocket / 轮询"的决策依据
  // 这些优势都源于 SSE 复用普通 HTTP 语义：单向（server→client）已能覆盖上述全部场景
  // 边界条件：SSE 只做服务端单向推送，客户端上行仍需另发普通 HTTP 请求
  advantages: [
    '简单的 HTTP 协议，无需特殊基础设施',
    '自动重连，内置心跳',
    '单连接多数据流',
    '易于调试（普通 HTTP 工具即可）',
  ];
}
```
### 1.3 SSE 限制场景

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
// 第 1 段：依赖与实例装配
// 这里只引入 Fastify 本体：SSE 的核心是拿到 Node 原生 ServerResponse（即 reply.raw），
// 直接把 TCP 连接当成一条长写通道用，因此不需要 @fastify/cors、序列化器等额外插件参与。
import Fastify from 'fastify';

const fastify = Fastify();

// 第 2 段：路由声明与"进入长连接模式"的入口
// 用 POST 而非 GET，是因为本接口仍需先收下 messages/model 这两个参数；
// 若用 GET，长 prompt 会挤进 URL，既受长度限制又会把内容写进访问日志。
fastify.post('/api/chat/stream', async (request, reply) => {
  // 第 3 段：把响应头切成 SSE 协议
  // 设置流式响应
  // 这四行必须作用在 reply.raw（原生响应）上，而不能用 reply.header(...)：
  // Fastify 的 header 会走它自己的序列化/结束流程，可能补上 Content-Length 并缓冲整包，
  // 那样下面的 write 就不是"边生成边推"了。
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  // flushHeaders() 是把上面几个头立刻写出去的关键一步，等价于"宣告连接已是 SSE"；
  // 少了它，头可能被 Node 攒在缓冲区里，客户端迟迟收不到首个字节、误判为超时。
  reply.raw.flushHeaders();

  // 第 4 段：取请求参数
  // 这里用 as any 直接解构，等于放弃了 body 的运行时校验；
  // 若上游未挂 JSON body parser 或前端漏传 messages，messages 会是 undefined，
  // 错误会被推到下面 callLLMStream 里才爆出来，排障成本更高。
  const { messages, model } = request.body as any;

  try {
    // 第 5 段：获取 LLM 的异步迭代器
    // callLLMStream 需返回 AsyncIterable<string>（每个元素是一个 token 片段），
    // 而不是一次性 resolve 的完整字符串——这正是"流式"与"等全文"的分水岭。
    // 注意：本文件没有 import/定义 callLLMStream，真实项目里它来自本地模块或 SDK 封装。
    const stream = await callLLMStream(messages, model);

    // 第 6 段：把模型 token 逐条转成 SSE 帧
    // for await 会对上游做背压感知：上游没吐新 chunk 时，协程在此挂起，不占 CPU。
    // 每次循环都把 chunk 包成 OpenAI /v1/chat/completions 的 delta 结构，
    // 目的是让本接口可以被任意兼容 OpenAI 协议的客户端（如各种 Chat UI）直接复用。
    for await (const chunk of stream) {
      const data = JSON.stringify({
        choices: [{ delta: { content: chunk } }],
      });
      // SSE 的帧格式是固定契约：data: <载荷> 后必须跟一个空行（\n\n）才算一条事件。
      // 载荷内若含换行，JSON.stringify 已将其转义为 \n 字面量，不会破坏帧边界。
      // 易错点：这里忽略了 write() 的返回值（false 表示内核缓冲已满），
      // 遇到慢客户端时数据会在内存里堆积，高频长回答下可能吃满内存。
      reply.raw.write(`data: ${data}\n\n`);
    }

    // 第 7 段：发送结束哨兵
    // [DONE] 是 OpenAI 流式协议的约定终止标记：客户端见到它就知道不必再等，
    // 也避免了靠"连接被关闭"这种模糊信号来判断结束（关连接无法区分正常结束与中断）。
    reply.raw.end('data: [DONE]\n\n');
  } catch (error) {
    // 第 8 段：错误也要按 SSE 帧返回
    // 关键决策：这里不做 reply.code(500)，因为响应头早在第 3 段就已 flush，
    // HTTP 状态码此时已无法更改；只能把错误当成一条普通事件塞进同一协议流里，
    // 由前端在 data 层解析 { error }。错误路径同样要 end()，否则连接会一直挂着。
    // 注意：TS 严格模式下 catch 变量是 unknown，直接 error.message 需先做类型收窄。
    reply.raw.end(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  }

  // 第 9 段：归还控制权给 Fastify
  // 返回 reply 是 Fastify 的显式契约：handler 必须 return，否则请求生命周期不被回收。
  // 此处 raw 流已 end()，返回 reply 只是告诉框架"我已经自己处理完响应了，别再来二次发送"。
  return reply;
});
```
### 2.3 NestJS 实现

```typescript
// chat.controller.ts
// 第 1 段：控制器声明与依赖注入——把 HTTP 传输层与业务逻辑层解耦
@Controller('api')
export class ChatController {
  // 构造器注入 ChatService：由 Nest 容器托管单例，控制器只做协议协商，便于替换实现与单元测试
  constructor(private readonly chatService: ChatService) {}

  // 第 2 段：流式对话入口——只负责"协商 SSE 响应头"，真正的数据写入交给 Service
  @Post('chat/stream')
  async chatStream(
    @Body() dto: ChatRequestDto,
    // passthrough: true 让 Nest 不接管响应对象；否则框架会把返回值包装成 JSON 回写，手动 write 的内容会被破坏
    @Res({ passthrough: true }) res: Response,
  ) {
    // SSE 三件套缺一不可：MIME 让浏览器走 EventSource 分支；no-cache 防中间层缓存半截流；keep-alive 维持长连接
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // 立即刷出响应头，客户端才能第一时间进入"接收中"状态；不 flush 会等到首个 body 才发包，前端会误判为卡死
    res.flushHeaders();

    // await 让本次请求的生命周期覆盖整条流；错误捕获与收尾统一由 Service 负责，此处不做二次 try
    await this.chatService.chatStream(dto, res);
  }
}

// chat.service.ts
// 第 1 段：服务类声明——持有 LLM 客户端，承担"协议编解码 + 连接生命周期收尾"的全部职责
@Injectable()
export class ChatService {
  // 第 2 段：核心流式方法——把上游增量 chunk 转译成 OpenAI 兼容的 SSE 事件
  // 用 AsyncGenerator 而非返回 Promise：一是语义上标明"可被逐步消费的流"，
  // 二是 finally 能保证正常结束与抛错两条路径都执行 res.end()，避免连接悬挂导致句柄泄漏。
  async *chatStream(dto: ChatRequestDto, res: Response): AsyncGenerator<void> {
    try {
      // 先发一条自定义握手事件：前端可立刻上屏"已连接"，不必干等模型首 token（首 token 常有数百毫秒到数秒延迟）
      res.write('event: connected\ndata: {"status":"connected"}\n\n');

      // 此处的 await 只等到"流建立"，真正的数据仍在下面 for await 中按上游节奏逐块到达
      const stream = await this.llm.stream(dto.messages);

      // 第 3 段：增量转发循环——逐 chunk 解析并即时下发，实现打字机效果
      // for await 会随上游挂起，天然形成背压；注意每条 SSE 消息必须以空行 \n\n 结尾，否则客户端会把相邻消息粘成一条
      for await (const chunk of stream) {
        const content = this.extractContent(chunk);
        // 过滤空增量（例如只带 role 或 finish_reason 的首尾块），否则会下发无意义的空 data 帧，前端解析出空字符
        if (content) {
          // 刻意包装成 OpenAI 兼容结构，前端可直接复用现有 SDK 与解析器，显著降低接入与迁移成本
          const data = JSON.stringify({
            choices: [{ delta: { content }, finish_reason: null }],
          });
          res.write(`data: ${data}\n\n`);
        }
      }

      // 显式结束标记：SSE 协议本身没有 EOF 语义，靠 [DONE] 约定通知前端停止等待并关闭 EventSource
      res.write('data: [DONE]\n\n');
    } catch (error) {
      // 第 4 段：错误降级——此时响应头早已发出，无法再改 HTTP 状态码，
      // 只能把错误包成一条数据帧下发，交由前端按业务错误处理；这是所有流式接口的固有边界。
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
      // 唯一出口：无论成功或失败都关流并释放在途连接；若把 res.end() 写在 try 内，抛错时连接会一直挂到超时才被回收
      res.end();
    }
  }

  // 第 5 段：内容抽取适配器——抹平不同模型厂商 content 字段的形状差异
  private extractContent(chunk: any): string {
    // 常见形态：直接给出字符串增量，直接返回可省去一次数组遍历
    if (typeof chunk.content === 'string') return chunk.content;
    // 多模态/新版协议下 content 是分块数组，需挑出文本块并按原顺序拼接（图片等非 text 块必须丢弃，否则会污染答案）
    if (Array.isArray(chunk.content)) {
      return chunk.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');
    }
    // 兜底返回空串，让调用方以 falsy 判断跳过该 chunk；整体复杂度 O(n)，n 为单个 chunk 内的片段数
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

## 3. 客户端流式处理

### 3.1 Fetch API 实现

```typescript
// hooks/useStreamChat.ts

// 第 1 段：状态与引用的初始化（组件级共享的"会话状态"）
// messages 是唯一的展示数据源；isStreaming 只表达"是否正在接收"，供 UI 禁用按钮等；
// 真正的取消能力放在 ref 里，因为 abort 句柄不需要触发重渲染，用 state 反而会造成多余渲染。
export function useStreamChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 第 2 段：主流程入口——先乐观渲染，再联网，最后收尾
  // 设计意图：用户消息与助手占位符都在 await 之前同步写入，保证点击后立刻有反馈；
  // 后续所有更新都通过 msg.id 定位助手消息做"就地替换"，避免整表重建带来的闪烁。
  const sendStreamMessage = async (content: string) => {
    // 1. 添加用户消息
    // 用函数式更新（prev => ...）而不是依赖闭包里的 messages，是为了避免并发调用时丢失上一条。
    // timestamp 在此刻取值，之后 UI 排序/分组都以它为准。
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // 2. 创建助手消息占位符
    // 先插入 content 为空的助手气泡并标记 isStreaming，让用户看到"正在输入"；
    // assistantId 提前生成，是因为下面流式回调里要用它做定位键，不能等到响应回来才生成。
    const assistantId = generateId();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ]);
    setIsStreaming(true);

    // 3. 创建 AbortController
    // 每次发送都新建一个实例并覆盖 ref，等于把"上一次未完成的请求"顺手作废；
    // 这也是为什么 cancelStream 只要 abort 当前 ref 就够了。
    abortControllerRef.current = new AbortController();

    // 第 3 段：发起流式请求
    // 注意 body 里用的是 [...messages, userMessage]——messages 是本渲染周期捕获的闭包快照，
    // 由于上一条 setMessages 是异步生效的，这里必须手动补上 userMessage 才能拼出完整上下文。
    // 把 signal 交给 fetch，后续 abort() 才能真正中断底层连接，而不只是停止读取。
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

      // 易错点：fetch 只在网络层失败时 reject，4xx/5xx 依然走 resolve，
      // 因此必须显式检查 response.ok，否则会把错误页当作 SSE 流去解析。
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 第 4 段：拿到响应体的可读流，准备增量解码
      // TextDecoder 必须开 { stream: true }，因为一个 UTF-8 汉字可能被切在两个 chunk 之间，
      // 不加这个选项会在分片处解出乱码（U+FFFD）。
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      // 第 5 段：逐块读取 → 拆行 → 交给 SSE 解析
      // 复杂度：整体 O(总字节数 × 单次匹配开销)，纯线性扫描，不做二次遍历；
      // 边界条件：done 为 true 时 value 已无意义，必须先 break 再解码。
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // 局限提示：这里对 chunk 直接 split('\n')，没有缓存"跨 chunk 的半行"，
        // 若服务端把一行 data: 切开推送，该行会被丢弃。生产实现应保留 leftover 与下一块拼接。
        const lines = chunk.split('\n');

        // 第 6 段：SSE 协议帧筛选
        // 只认形如 "data: ..." 的行（前缀正好 6 个字符，故 slice(6)）；
        // 空行、event:、id:、注释行（以 : 开头）都直接跳过，这是 SSE 规范的容错要求。
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          // [DONE] 是 OpenAI 风格流的结束哨兵，收到后本轮不再有 token。
          if (data === '[DONE]') continue;

          // 第 7 段：单帧 JSON 解析与增量追加
          // 每帧独立 try/catch：个别坏帧（被截断、心跳包）不应中断整条流，所以静默忽略。
          // choices?.[0]?.delta?.content 三级可选链兼容：部分帧只带 role、只带 finish_reason、
          // 或只带 usage，content 缺省时取空串，避免 undefined 污染拼接结果。
          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) {
              fullContent += token;
              // 增量更新 UI
              // 每次都基于最新的 fullContent 整段回写，而不是在旧 content 上追加：
              // 因为 map 里的 msg 来自 prev 快照，直接 += 会写进已过期的对象。
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
      // 第 8 段：异常分流——"用户主动取消"与"真实故障"要区别对待
      // abort 会以 name === 'AbortError' 的形式抛出，属于预期行为，只记日志不改 UI；
      // 其他错误则把错误文本追加到助手气泡，让用户看到失败原因而不是一直空等。
      // 注意：fullContent 声明在上面的 try 块内部，此处访问会因作用域不可见而报错，
      // 若要在 catch 里复用，需把它提升到 try 之外声明。
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
      // 第 9 段：统一收尾（无论成功、失败还是被取消都会执行）
      // 两件事必须都做：isStreaming 复位以解锁输入框，助手气泡的 isStreaming 复位以隐藏光标动画；
      // 放在 finally 里可避免"忘了关闭 loading"这类卡死状态的经典 bug。
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, isStreaming: false } : msg
        )
      );
    }
  };

  // 第 10 段：取消入口
  // 用可选链是因为尚未发起过任何请求时 ref 仍为 null；
  // abort() 会同时击穿 fetch 的 signal 与 reader.read()，使上面进入 catch 的 AbortError 分支。
  const cancelStream = () => {
    abortControllerRef.current?.abort();
  };

  // 第 11 段：对外暴露的契约
  // 只导出数据与操作函数，不暴露 setMessages / ref，保证外部无法绕过流程直接改状态；
  // 若这里每次返回新对象，调用方做 useEffect 依赖时需自行 memo 化，属于常见性能陷阱。
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

// 第 1 段：组件入口与状态/行为来源（把"渲染"与"状态机"解耦）
// useStreamChat 用自定义 Hook 收敛了消息列表、流式标志位与两个副作用动作，
// 让本组件只负责界面装配，便于单测与替换传输层（SSE / WebSocket 皆可）。
export const StreamChat: React.FC = () => {
  const { messages, isStreaming, sendStreamMessage, cancelStream } =
    useStreamChat();
  // 输入框内容属于"纯 UI 临时态"，不必放进 Hook，避免流式高频重渲染时污染消息状态。
  const [input, setInput] = useState('');

  // 第 2 段：提交处理（拦截空输入与并发提交，收敛输入框清理时机）
  // 双重守卫：trim 后为空直接丢弃，避免发送纯空白；isStreaming 期间拒绝再次提交，
  // 防止用户连点导致同一会话出现多条并发的流式请求（服务端与 UI 都会错乱）。
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    // 必须 await：等本轮流真正结束再清空输入框。若提前清空，用户会以为消息已发出，
    // 而此时若发送失败，输入内容已丢失、无法重试。
    await sendStreamMessage(input);
    setInput('');
  };

  // 第 3 段：消息列表渲染（以 key 驱动的增量挂载）
  // 用 msg.id 作为 key，流式追加时 React 只更新最后一条消息节点而非重建整列，
  // 这是长对话不出现闪烁/输入丢焦的关键。key 用数组下标是常见错误写法。
  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>

      // 第 4 段：输入区（用受控组件 + disabled 表达"忙碌"状态，替代额外 loading 层）
      // 输入框在流式期间被禁用，配合下方按钮的 disabled，形成同一状态的多处一致反馈；
      // 注意 button 的 disabled 额外依赖 !input.trim()，是"空输入不可点"的 UI 前置校验。
      <form onSubmit={handleSubmit} className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          disabled={isStreaming}
        />
        // 按钮文案随 isStreaming 切换，把异步进度直接编码进可交互元素本身，
        // 避免再渲染一个独立的 spinner 造成布局跳动。
        <button type="submit" disabled={isStreaming || !input.trim()}>
          {isStreaming ? '发送中...' : '发送'}
        </button>
        // 取消按钮仅在流式期间出现（条件渲染而非 display 隐藏），
        // type="button" 必不可少：否则在 form 内默认 submit，会误触发发送并清空输入。
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

// 第 5 段：单条消息组件的职责（纯展示，不做任何状态提升）
// 该组件是无状态纯函数：输入 message 决定全部输出，因此可安全 memo 化；
// 这里把 message.isStreaming 抽成局部变量，是为了在模板里少一次属性链路访问。
export const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const isStreaming = message.isStreaming;

  // 第 6 段：结构与样式命名（BEM 修饰符承载角色差异）
  // `message--${message.role}` 让 user/assistant 的样式差异交给 CSS 决定，
  // 组件内不做 if/else 分支渲染，新增角色时无需改动这段代码。
  return (
    <div className={`message message--${message.role}`}>
      <div className="message__avatar">
        {message.role === 'user' ? '' : ''}
      </div>
      // 第 7 段：正文与"流式中"占位（用空串做三元兜底以保持 DOM 结构稳定）
      // 内容为空且仍在流式时显示"思考中..."，覆盖"已建消息但首个 token 未到"的空窗期；
      // typing-cursor 类只加在流式节点上，光标随状态自动出现/消失。注意 `||` 会把空串回退到占位，
      // 这是有意为之：真实的空字符串回复不应展示为空白气泡。
      <div className="message__content">
        <div className={`message__text ${isStreaming ? 'typing-cursor' : ''}`}>
          {message.content || (isStreaming ? '思考中...' : '')}
        </div>
        // 第 8 段：时间戳（可选字段的条件渲染 + 本地化格式）
        // 只在存在 timestamp 时渲染，兼容"时间由服务端补发"的消息模型；
        // toLocaleTimeString 依赖运行环境的 locale/时区，SSR 与客户端可能不一致，
        // 若需严格一致应显式传入 locale 与时区选项。
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
// 第 1 段：类声明与内部状态（buffer 存待发消息，flushInterval 决定刷新节奏）
class MessageBatcher {
  // buffer 以 connectionId 为键做「按连接隔离」的归并：Map 保证 O(1) 定位，值为待发送的原始消息片段数组
  private buffer: Map<string, string[]> = new Map();
  // 50ms 是延迟与系统调用次数的折中：间隔越大吞吐越高，但单条消息的端到端延迟最坏会多出这个值
  private flushInterval = 50;

  // 第 2 段：add —— 生产者入口，把零散消息按连接累积到缓冲区，不做任何 IO
  add(connectionId: string, message: string) {
    // 惰性建桶：只有真正有消息的连接才会占用内存，避免为所有连接预分配空数组
    if (!this.buffer.has(connectionId)) {
      this.buffer.set(connectionId, []);
    }
    // 同一 connectionId 始终复用同一个数组引用，因此这里是摊还 O(1)；注意 get 在 TS 中类型为 string[] | undefined，本次靠上面的 has 判断兜底
    this.buffer.get(connectionId).push(message);
  }

  // 第 3 段：startFlush —— 定时把缓冲区内容一次性写入响应流，实现「攒批发送」
  startFlush(res: Response) {
    // 这里缺少赋值对象：定时器句柄未被保存，客户端断开或连接结束时无法 clearInterval，会持续持有 res 与 this 造成泄漏
    setInterval(() => {
      // 易错点：这里的 connectionId 既不是形参也不来自 this，属于作用域外引用；而且它在回调闭包里，若外部存在同名变量会被静默捕获成「所有连接刷同一份数据」的隐性 bug
      const batch = this.buffer.get(connectionId);
      // 空批直接跳过：避免无消息时也触发一次 write，减少空转与 TCP 小包
      if (batch && batch.length > 0) {
        // 一次性拼接所有片段再一次 write，把 N 次系统调用压成 1 次；但 join('') 不插入分隔符，前提是每条 message 自带分帧边界（如已含 '\n' 的 NDJSON/SSE 帧），否则接收端无法切分
        res.write(batch.join(''));
        // 复位而非 delete：保留键可以让后续 add 直接命中已有数组，也避免 Map 反复增删带来的哈希结构抖动；代价是连接长期空闲时仍会驻留一个空数组
        this.buffer.set(connectionId, []);
      }
      // 复杂度：单次刷新为 O(总字符数)，整体与消息总量线性相关；小间隔 + 高频小消息会让 CPU 花在 timer 回调调度上
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
// 第 1 段：类声明与重试策略常量（定义"重试多少次、每次等多久"的基线）
// maxRetries 表示"首次之外"最多再试 3 次，因此循环条件是 attempt <= maxRetries，共 4 次尝试。
// retryDelay 是初始退避时长，后续以 2 的幂指数放大，避免瞬时故障时对服务端造成重试风暴。
class StreamClient {
  private maxRetries = 3;
  private retryDelay = 1000;

  // 第 2 段：异步生成器 + 重试外层循环（流式输出的入口）
  // 用 AsyncGenerator 而非返回整个字符串，是为了把"边收边吐"的能力交给调用方（如逐字渲染）。
  // 注意：一旦某次尝试中已经 yield 过数据再失败，重试会从流头重新开始，可能造成重复输出；
  // 若业务不允许重复，需要在上层做去重或改成"仅在未产出任何内容时才重试"。
  async *stream(messages: any[]): AsyncGenerator<string> {
    let lastError: Error;

    // 第 3 段：尝试计数循环（attempt 从 0 计，0 即第一次真实请求）
    // 循环内 try/catch 包住"发起请求 + 读取整条流"，任何一个环节抛错都会进入重试判定。
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // 第 4 段：建立连接并拿到可读流（网络往返发生在这里）
        // fetchStream 只负责返回带 body 的 Response；真正的数据消费在下面的 read 循环。
        const response = await this.fetchStream(messages);

        // 第 5 段：二进制流读取器与解码器初始化
        // getReader() 拿到的是字节流；TextDecoder 负责 UTF-8 → 字符串。
        // 易错点：decode(value) 未带 { stream: true }，多字节字符（如中文）被 TCP 分片时会解码成乱码，
        // 若上游按字节切割，这里应改为 decoder.decode(value, { stream: true })。
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // 第 6 段：逐块拉取循环（流式核心：阻塞等待下一块 → 解析 → 透传）
        // reader.read() 是背压点：没有新数据时 Promise 挂起，天然实现"服务端推多少、我们处理多少"。
        // 收到 done 立即 return，结束生成器；否则解码后交给 parseChunk 做协议层拆分（如 SSE 事件边界）。
        while (true) {
          const { done, value } = await reader.read();
          if (done) return;

          const chunk = decoder.decode(value);
          // yield* 把子生成器产出的每个片段逐个向上冒泡，保持流式的粒度不被合并。
          yield* this.parseChunk(chunk);
        }
      } catch (error) {
        // 第 7 段：错误分类与重试决策（区分"可恢复"与"必须立刻失败"）
        // 先把 error 收窄成 Error 存起来，因为循环结束后要把它重新抛出，保留原始堆栈。
        lastError = error as Error;

        // 不可重试错误（如 400/401 参数或鉴权问题）应当立即冒泡，重试只会浪费时间且掩盖真实原因。
        if (!this.isRetryable(error)) {
          throw error;
        }

        // 第 8 段：指数退避等待（1s → 2s → 4s）
        // 只有还有剩余次数才等待；用 Math.pow(2, attempt) 让退避随失败次数翻倍，缓解服务端压力。
        // 注意：此处未加随机抖动（jitter），高并发下多客户端会同步重试形成"惊群"，生产环境建议加随机量。
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
          continue;
        }
      }
    }

    // 第 9 段：重试耗尽后的兜底抛出
    // 走到这里说明最后一次尝试也失败了，抛出的是最后一次捕获的错误，便于上层定位最终失败原因。
    // 边界：TypeScript 无法证明 lastError 一定被赋值，严格模式下这里可能需要 `throw lastError!`。
    throw lastError;
  }

  // 第 10 段：可重试性判定（把"什么错误值得再试一次"收拢到一处，便于统一调整策略）
  // 网络/超时属于瞬时故障，429 是限流（稍后可恢复），5xx 是服务端临时异常——这三类都值得重试。
  // 易错点：判定 (error as any).status 时依赖错误对象上挂了 status 字段，若上游把状态码包在 response 里则判定会失效。
  private isRetryable(error: Error): boolean {
    return (
      error instanceof NetworkError ||
      error instanceof TimeoutError ||
      (error as any).status === 429 ||
      (error as any).status >= 500
    );
  }

  // 第 11 段：可等待的延时工具（把 setTimeout 回调式 API 包成 Promise，才能配合 await 实现退避）
  // 复杂度 O(1)，不含定时器清理逻辑；若调用方可能中途取消，需额外支持 AbortSignal。
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

## 9. 总结

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

## 10. 参考资源

- [MDN: Using Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [OpenAI API Streaming](https://platform.openai.com/docs/api-reference/chat/create#chat-create-stream)
- [Anthropic Streaming](https://docs.anthropic.com/en/api/messages-streaming)
- [NestJS Streaming](https://docs.nestjs.com/controllers#streaming-responses)

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 使用 SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) | 最简 SSE 客户端示例，快速建立 EventSource 直觉。 | 读示例代码，在 DevTools 观察 event-stream 响应，照抄写一个通知页。 |
| [WHATWG Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) | 权威定义事件流格式、字段与重连语义。 | 重点读解析算法与重连时间字段，抓包对照实现，检查服务端换行与编码。 |
| [Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) | SSE 接口与浏览器兼容性的权威速查页。 | 当手册用：写重连与事件监听时查 API 细节和兼容性表。 |
| [RFC 6455 WebSocket](https://www.rfc-editor.org/rfc/rfc6455) | WebSocket 握手与帧格式的权威依据。 | 读握手与掩码一节，抓包确认 Upgrade 与帧头，理解与 SSE 的差异。 |
| [MDN WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API) | 了解 WebTransport 这类新流式协议的能力边界。 | 读概念与示例，比较它与 WebSocket 在队头阻塞、多路复用上的差别。 |
| [AsyncAPI 文档](https://www.asyncapi.com/docs) | 用规范方式描述流式接口，便于对比协议变体。 | 为你的 SSE 或 WebSocket 接口写一份 AsyncAPI 描述，理清消息模型。 |
| [Socket.IO 文档](https://socket.io/docs/v4/) | 理解封装层如何补足原生 WebSocket 的重连与房间能力。 | 读房间与广播一节，对照本页重连策略，判断何时该用原生协议。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Writing WebSocket client applications](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications) | 客户端连接、重连与错误回调的官方示例。 | 读示例并改造 onclose/onerror 分支，实现带退避的手动重连。 |
| [Writing WebSocket servers](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers) | 服务端握手、帧解析与关闭流程的代码级说明。 | 读握手与数据帧处理，自己写最小回声服务，验证分片与关闭。 |
| [Writing a WebSocket server in JavaScript (Deno)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_a_WebSocket_server_in_JavaScript_Deno) | 可运行的服务端代码，适配现代运行时。 | 跑通 Deno 服务端，再加一个 SSE 端点做对比实验。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [现代 JavaScript 教程：WebSocket](https://zh.javascript.info/websocket) | 系统讲握手、心跳与扩展，附聊天室实战。 | 按章实现聊天室，重点看心跳与重连小节，再写 SSE 版本对比。 |
| [阮一峰：WebSocket 教程](https://www.ruanyifeng.com/blog/2017/05/websocket.html) | 中文入门，快速写出可用的 WebSocket 回显服务。 | 跟示例写回显服务，浏览器连上后测断开与重连表现。 |
| [现代 JavaScript 教程：网络请求](https://zh.javascript.info/network) | 把 Fetch 流式读取与 WebSocket 放在同一知识线上。 | 读 Fetch 与 WebSocket 章，用 ReadableStream 处理流式响应。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理万行表格的流式导出 | 客户端流式处理、背压处理 | fetch + ReadableStream 逐块解析 | 解析与虚拟滚动共用主线程，要分片让出 |
| 低端安卓的首屏分块渲染 | 背压处理、协议变体 | 分块 HTML 或 JSON Lines | 代理缓冲会攒满整块才下发 |
| 多人协作白板的笔迹同步 | SSE vs WebSocket 对比 | 笔迹走 WebSocket，在线状态走 SSE | 双向高频写用 SSE 会在服务端排队 |
| AI 问答的逐字输出 | Server-Sent Events 实现、协议变体 | EventSource 或 fetch 流 | 缺终止事件时前端会一直等 |
| 部署流水线的实时日志 | 重连策略、错误处理与恢复 | SSE + id 字段 + Last-Event-ID | 断线后要按序号补发，不能只发新日志 |
| 弱网手机的订单状态推送 | 重连策略、性能优化 | EventSource 自动重连 + retry 字段 | 无退避的重连会在弱网打出重连风暴 |
| 监控大盘的每秒指标推送 | 性能优化、背压处理 | 单连接多路复用 + 客户端合并 | 消费慢时要丢旧值，不要积压队列 |
| 大文件上传的进度回显 | 客户端流式处理、背压处理 | ReadableStream + 进度事件 | 进度事件要节流，逐字节上报会淹没主线程 |

### 三个场景拆解

#### 场景 1：AI 问答的逐字输出

**业务背景**：模型逐字返回时，用户能在首字出现后就开始阅读，不会以为页面卡住。把本地假接口的首字延迟设为 200ms、整段生成设为 8s，就能复现这种体感差。

**怎么用本页知识解决**：服务端按块写 SSE，客户端边收边渲染，用一个显式的终止事件收尾。

```js
res.writeHead(200, {
  'Content-Type': 'text/event-stream; charset=utf-8', // SSE 的必需类型
  'Cache-Control': 'no-cache',                        // 禁掉中间层缓存
  'X-Accel-Buffering': 'no',                          // 让 nginx 不缓冲响应
});
for await (const part of modelStream) {               // 上游按块产出
  res.write(`data: ${JSON.stringify({ text: part })}\n\n`); // 双换行结束一个事件
}
res.write('event: done\ndata: {}\n\n');               // 显式结束，前端据此收尾
res.end();
```

- 每个事件以空行结束，前端 `onmessage` 才会触发一次回调。
- `Content-Type` 写错时浏览器按普通响应处理，事件不会触发。
- `X-Accel-Buffering: no` 只对 nginx 生效，其他反向代理要在各自配置里关缓冲。
- 用 `event: done` 而不是靠连接断开，前端才能把正常结束和网络中断分开。
- 上游报错时发一个 `event: error` 再 `end()`，前端就能区分错误与截断。

**怎么度量收益**：用 Chrome DevTools 的 Network 面板 EventStream 视图看事件到达间隔。在首块到达处调用 `performance.mark('first-chunk')`，与 `performance.mark('nav-start')` 的差值就是首字时间。服务端再记录写首块的时刻与收到请求的时刻之差。

**什么时候不该用**：
- 结果要先在服务端做全量校验再下发时，流式会先给出可能被撤回的内容。
- 客户端只做整段文本替换、不做增量渲染时，流式带来的收益为零。

#### 场景 2：部署流水线的实时日志

**业务背景**：构建日志按行产生，用户要在页面上跟到底，一次构建可产生上万行。页面刷新后若从零开始，用户要重新等待整段构建，用本地脚本每次输出 1 万行即可复现。

**怎么用本页知识解决**：服务端给每行分配自增序号并写进 `id:` 字段，浏览器重连时自动带 `Last-Event-ID`，服务端从该序号之后补发。

```js
let seq = 0;
const clients = new Set();
function push(line) {
  seq += 1;
  for (const res of clients) {
    res.write(`id: ${seq}\n`);        // 序号写进 id 字段
    res.write(`data: ${line}\n\n`);   // 一行日志一个事件
  }
}
app.get('/logs', (req, res) => {      // 重连时按序号补发
  const from = Number(req.headers['last-event-id'] || 0);
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  for (const l of buffer.slice(from)) res.write(`id: ${l.seq}\ndata: ${l.text}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res)); // 断开时清理，防止内存泄漏
});
```

- `id` 字段由浏览器保存在内存里，重连时作为 `Last-Event-ID` 请求头发送。
- 序号要来自同一个单调递增的源，多进程各自计数会出现重复或跳号。
- `close` 事件里必须把响应对象从集合移除，否则连接对象一直留在内存。
- 日志缓冲要有上限，超过上限就丢掉最早的行，并告知客户端更早的日志已滚动。

**怎么度量收益**：服务端统计带 `Last-Event-ID` 的请求数占比，以及补发行数与总行数的比值。前端用 `performance.now()` 记录断线到补发完成的时间。用 Chrome DevTools 的 EventStream 视图确认重连后没有重复 id。

**什么时候不该用**：
- 服务端只保留最近 200 行日志时，按序号补发会落空，直接推全量快照即可。
- 页面只需要最新一行状态时，轮询的请求量可控，不必维持长连接。

#### 场景 3：监控大盘的每秒指标推送

**业务背景**：大盘每秒收到一批指标，标签页切到后台后渲染暂停，切回来时旧值已经过期。用本地脚本每秒推送 20 条指标，把标签页切走一分钟再切回，就能看到堆积。

**怎么用本页知识解决**：一条 SSE 连接推送多路指标，客户端用 Map 只保留每个指标的最新值，渲染节奏交给 `requestAnimationFrame`。

```js
const res = await fetch('/api/metrics/stream');
const reader = res.body.getReader();   // 逐块读取响应体
const dec = new TextDecoder();
const latest = new Map();              // 每个指标只保留最新值
let frameScheduled = false;

function schedule() {
  if (frameScheduled) return;          // 一帧内只排一次渲染
  frameScheduled = true;
  requestAnimationFrame(() => { paintAll(latest); latest.clear(); frameScheduled = false; });
}
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  for (const line of dec.decode(value, { stream: true }).split('\n')) {
    if (!line) continue;
    const m = JSON.parse(line);
    latest.set(m.name, m.value);       // 覆盖旧值，消费慢时丢的是旧数据
  }
  schedule();
}
```

- `decode` 传 `{ stream: true }` 才能正确处理跨块的多字节字符。
- 按 `\n` 切分后，最后一段可能不完整，要把残段拼到下一块前面。
- `latest` 按指标名覆盖，消费慢时丢掉的是旧值，不是新值。
- `requestAnimationFrame` 把渲染压到每帧一次，标签页在后台时浏览器会暂停回调，更新被自动合并。
- 服务端反压：Node 的 `res.write()` 返回 false 说明内核缓冲区已满，要等 `drain` 再继续写。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板录制，看 `requestAnimationFrame` 回调间隔，以及 `PerformanceObserver` 的 `longtask` 条目数量。服务端统计 `res.write()` 返回 false 的次数和每秒发出的字节数。

**什么时候不该用**：
- 指标要按时间序列全量落库时，客户端丢旧值会让曲线缺采样点，应改为服务端聚合。
- 需要客户端确认收到（计费、告警）时，单向推送没有回执，必须换双向通道。

### 行业先进实践

**`id` 字段配合 `Last-Event-ID` 自动续传（出处：WHATWG HTML Living Standard 的 Server-sent events 章节 / MDN Web Docs）**。服务端给每个事件编号，浏览器重连时自动带上最后收到的编号。客户端不必自己记录进度，补发由协议层完成。借鉴方式：把日志与消息流的序号统一到一个单调递增源，服务端保留滚动缓冲。

**关闭反向代理响应缓冲（出处：nginx 官方文档的 `proxy_buffering` 指令与 `X-Accel-Buffering` 响应头）**。nginx 默认缓冲上游响应，事件会被攒到缓冲区满才下发。借鉴方式：在 SSE 路由上设 `X-Accel-Buffering: no`，并在部署文档里写明其他反向代理的对应开关需核对各自官方文档。

**用 `data: [DONE]` 作为流结束标记（出处：OpenAI API 官方文档的 Streaming 章节）**。它在最后一个数据块之后发送一个固定字符串，客户端收到就停止解析。借鉴方式：定义自己的终止事件名并写进接口文档，避免客户端靠连接关闭判断结束。

**把流式事件拆成具名类型（出处：Anthropic 官方文档的 Streaming Messages 章节）**。它用 `message_start`、`content_block_delta` 这些具名事件区分状态变化与增量内容。借鉴方式：给 `event:` 字段定义有限取值集合，前端用 `addEventListener` 按名注册，而不是全部塞进 `onmessage`。

**用 SSE 做通用推送协议（出处：Mercure 开源项目）**。Mercure 把发布订阅的更新通过 SSE 下发到浏览器，并在协议里定义了订阅与重连语义。借鉴方式：推送只读的场景可以先评估现成的 SSE 推送服务，不必自己维护长连接管理。需核对官方文档：核对它当前支持的传输方式与鉴权模型。

### 从学到用：落地路线

1. 试点：先在一个只读、影响面小的推送接口上接入 SSE，例如构建日志或站内通知。验收标准：关闭代理缓冲后，该接口的首块下发时间与直连调试环境相差不超过 100ms。
2. 验证：在测试环境断开网络 30 秒再恢复，检查客户端是否补齐断线期间的事件。验收标准：重连后事件序号连续，既不重复也不缺失。
3. 推广：把序号生成、心跳、终止事件和反压检查抽成公共模块，其余推送接口复用。验收标准：新接口接入只改路由和事件名两处，公共模块的单元测试全部通过。
4. 防回退：把事件到达间隔、重连次数、反压触发次数接入监控并设告警。验收标准：连续一周没有重连风暴告警，事件间隔的 p99 不超过上线前基准的 1.2 倍。

### 动手作业

**目标**：写一个本地可运行的构建日志流服务与页面，支持断线续传，并能观测到服务端的反压。

**步骤**：
1. 用 Node 内置 `http` 模块起服务，暴露 `/logs` 并返回 `text/event-stream`。
2. 服务端每秒生成 20 行带自增序号的日志，写入 `id:` 与 `data:` 字段，用空行结束事件。
3. 在内存里保留最近 500 条日志，作为续传用的滚动缓冲。
4. 请求头带 `Last-Event-ID` 时，只补发该序号之后的缓冲内容。
5. 页面用 `EventSource` 接收，把日志追加到 `pre` 元素，并显示最后收到的 id。
6. 页面加两个按钮：一个调用 `es.close()`，一个重新创建 `EventSource`。
7. 服务端打印 `res.write()` 的返回值，标出何时返回 false 以及 `drain` 事件的触发次数。

**验收标准**：
- 关闭网络 30 秒再恢复后，页面日志的序号连续。
- 手动断开再重连时，服务端能读到 `Last-Event-ID` 请求头，且只补发缺失部分。
- 客户端断开后，服务端连接集合的大小回到 0。
- 把生成速率调到每秒 2000 行时，服务端日志里出现 `write` 返回 false 的记录。

