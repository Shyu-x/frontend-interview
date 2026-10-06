---
title: 流式对话应用设计
description: 本文档定义 Agent 系统的技术架构和实现细节，涵盖前端交互、后端服务、状态管理和工具系统。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 流式对话应用设计

> 本文档定义 Agent 系统的技术架构和实现细节。

## 1. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (React + Vite)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ ChatContainer│  │useStreamChat│  │ ChatComponents  │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└────────────────────────────┬────────────────────────────┘
                             │ SSE/WebSocket
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   后端 (NestJS + LangChain)             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ChatController│  │ AgentService │  │StreamingService │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │              TypeScriptAgent (Claude Code Style)     ││
│  │  - Tool System (read_file, write_file, web_search)  ││
│  │  - LLM Adapter (Anthropic)                          ││
│  │  - State Machine                                    ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Claude API     │
                    │  (Anthropic)     │
                    └─────────────────┘
```

## 2. 技术栈

### 2.1 前端
- **框架**：React 18 + TypeScript
- **构建**：Vite 5
- **状态管理**：React hooks (useState/useRef)
- **样式**：Tailwind CSS (内联)

### 2.2 后端
- **框架**：NestJS 10
- **LLM**：LangChain + Anthropic
- **协议**：Server-Sent Events (SSE)

## 3. 核心功能

### 3.1 流式对话 (SSE)

#### 3.1.1 前端实现

```typescript
// useStreamChat hook - 核心流式处理
const sendStreamMessage = async (content: string) => {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    body: JSON.stringify({ messages, stream: true }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        // 处理增量内容
        appendContent(data.choices[0].delta.content);
      }
    }
  }
};
```

#### 3.1.2 后端实现

```typescript
// StreamingService - SSE 流式输出
async handleStreamChat(dto: ChatRequestDto, res: StreamHandler) {
  res.write('event: connected\ndata: {"status":"connected"}\n\n');

  for await (const chunk of this.agentService.chatStream(dto.messages)) {
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk }}] })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
}
```

### 3.2 打字机效果

```typescript
// 增量更新状态
const [content, setContent] = useState('');

// 每个 chunk 累加
onChunk((chunk) => {
  setContent(prev => prev + chunk.content);
});
```

CSS 打字机光标：
```css
.typing-cursor::after {
  content: '▊';
  animation: blink 0.8s infinite;
}
```

### 3.3 TypeScript Agent (Claude Code Style)

参考 Claude Code 源码的 Agent 架构：

```typescript
// 核心 Agent 类
class TypeScriptAgent {
  private state: AgentState;
  private tools: AgentTool[];

  async run(input: string): Promise<string> {
    // 1. 生成工具调用
    const response = await this.llm.complete({
      messages: [...],
      tools: this.tools.map(t => ({ name: t.name, ...t }))
    });

    // 2. 执行工具
    for (const toolCall of response.toolCalls) {
      const result = await tool.handler(toolCall.input);
      messages.push({ role: 'tool', content: result });
    }

    // 3. 返回最终结果
    return response.content;
  }
}
```

### 3.4 内置工具

| 工具名 | 功能 | 输入 |
|--------|------|------|
| `read_file` | 读取文件 | `{ path: string }` |
| `write_file` | 写入文件 | `{ path: string, content: string }` |
| `web_search` | 网络搜索 | `{ query: string, limit?: number }` |
| `execute_code` | 执行代码 | `{ language: string, code: string }` |

## 4. 启动指南

### 4.1 前端

```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

### 4.2 后端

```bash
cd backend
npm install
npm run dev    # http://localhost:4000
```

### 4.3 环境变量

```bash
# backend/.env
ANTHROPIC_API_KEY=your-api-key
PORT=4000
```

## 5. API 接口

### 5.1 POST /api/chat

非流式对话接口。

**请求体**：
```json
{
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "stream": false,
  "model": "claude-3-5-sonnet-20241022"
}
```

### 5.2 POST /api/chat/stream

流式对话接口（SSE）。

**响应格式**：
```
data: {"choices":[{"index":0,"delta":{"content":"你"},"finish_reason":null}]}

data: {"choices":[{"index":0,"delta":{"content":"好"},"finish_reason":null}]}

data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

## 6. 后续扩展

- [ ] 添加更多内置工具
- [ ] 支持 OpenAI/Gemini 模型
- [ ] 添加对话历史持久化
- [ ] 添加 MCP (Model Context Protocol) 支持
- [ ] 添加 RAG (检索增强生成)
- [ ] 添加多 Agent 协作

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Streams API concepts](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts) | 流式对话的底层依赖，讲清可读流、背压与分块传输。 | 读 Concepts 全文，重点看背压与队列；画出对话数据从服务端到 UI 的流动图。 |
| [Writing WebSocket client applications](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications) | 全双工通道适合对话，讲连接、消息与关闭流程。 | 读“建立连接”与“收发消息”节；为对话应用写一个最小 WebSocket 客户端。 |
| [Anthropic 文档](https://docs.anthropic.com/) | 官方 Messages API 是流式对话的典型参考，含流式事件。 | 先读快速开始并跑通请求；再读 streaming 一节，对照事件类型设计前端解析。 |
| [Google API Improvement Proposals](https://google.aip.dev/) | 资源导向设计与标准方法，是设计对话 CRUD 接口的权威规范。 | 读 AIP-121、131 至 135；用标准方法重写你的会话与消息端点。 |
| [MCP Tools 概念](https://modelcontextprotocol.io/docs/concepts/tools) | 工具调用是对话扩展核心，MCP 给出模型与工具交互规范。 | 读概念与 schema 示例；为“查天气”设计一个 tool 定义并写输入校验。 |
| [Gemini API 文档](https://ai.google.dev/gemini-api/docs) | 另一家主流模型 API，便于对比流式与多模态能力。 | 对同一提示在 Gemini 与 Anthropic 各跑一次，比较输出与延迟。 |
| [Node.js API 文档](https://nodejs.org/api/) | 后端技术栈核心，流与文件接口对实现流式服务很关键。 | 需要时查 fs、stream、http 的接口与示例，重点看流式响应写法。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [pi 编码 Agent 工具集](https://github.com/earendil-works/pi) | 可读的 agent loop 与统一 LLM API 实现，适合对照学习。 | 读 agent loop 源码，关注工具调用与消息拼接；对照自己的循环找差异。 |
| [Claude Agent SDK 概览](https://docs.claude.com/en/api/agent-sdk/overview) | 快速跑通一个能调用工具的 Agent，理解流式与工具循环。 | 按概览写一个读目录并总结的小 Agent，观察工具调用日志与流式输出。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Using readable streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams) | 手把手示例，展示如何消费 fetch 返回的流并逐块处理。 | 跟做示例，把 fetch 响应替换为 LLM 流式接口；读完实现打字机效果。 |
| [阮一峰：Fetch API 教程](https://www.ruanyifeng.com/blog/2020/12/fetch-tutorial.html) | 前端调用流式接口的基础，中文讲解清晰。 | 用 fetch 实现流式请求与错误处理，把响应体接到 Streams 示例上。 |
| [AutoGen 论文](https://arxiv.org/abs/2308.08155) | 多 Agent 对话编程的经典论文，理解对话编排抽象。 | 读摘要与架构图；对照 AutoGen 文档 API，思考如何映射到你的应用。 |
| [roadmap.sh API 设计路线](https://roadmap.sh/api-design) | 系统梳理 API 设计知识，适合规划后续扩展与查漏。 | 对照路线图标出未掌握节点，排入后续学习计划。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格 | API 接口的分页契约、流式增量返回 | 游标分页 + 虚拟滚动 + SSE | 游标要能抵抗新数据插入，行高保持固定 |
| 低端安卓的首屏加载 | 流式首屏渲染、断线重连 | 内联关键 CSS + EventSource | 首字节到达前不要启动动画，避免争抢主线程 |
| 多人协作白板 | 会话状态、事件顺序与补发 | WebSocket + 操作变换 | 每个事件带递增序号，乱序先缓冲再应用 |
| 客服工单自动分类 | 工具调用编排、结构化输出校验 | Agent + JSON Schema 校验 | 低置信度路由到人工，禁止直接写库 |
| 长文档问答的引用回显 | 流式事件携带元数据 | RAG + 事件内嵌引用块 ID | 引用要先于正文到达，否则会闪回重排 |
| IDE 内的代码补全 | 请求取消与超时控制 | LSP + 流式补全通道 | 用户继续敲键就取消上一请求，避免回填错位 |
| 电商大促的库存播报 | 多端会话广播、幂等 | 消息队列 + WebSocket 推送 | 播报消息要带去重键，重复推送不能重复扣减 |
| 智能家居的多轮语音控制 | 会话上下文与状态机 | 设备端唤醒 + 云端 Agent | 断网后要能落回本地规则，不能卡在等待 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：运营后台要翻查十万行订单，接口一次返回整包 JSON，滚动时标签页内存持续上涨。用 Chrome DevTools 的 Performance 面板录制十秒滚动，主线程长任务会连成一片。

**怎么用本页知识解决**：思路是把取数和渲染拆开，接口层给游标分页，流式通道逐页推送，前端只把行塞进虚拟列表的数据源。

```ts
const ctrl = new AbortController();          // 用户切换筛选条件时调用 abort
const resp = await fetch("/api/orders?cursor=0", {
  signal: ctrl.signal,                       // 绑定取消信号，防止旧请求回填新列表
  headers: { Accept: "text/event-stream" },  // 声明要流式响应，不是整包 JSON
});
const reader = resp.body!.getReader();       // 逐块读取，拿到一页就渲染一页
const decoder = new TextDecoder();
let buf = "";
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;                           // 服务端发完事件后关闭流
  buf += decoder.decode(value, { stream: true });
  const chunks = buf.split("\n\n");          // SSE 事件之间用空行分隔
  buf = chunks.pop() ?? "";                  // 末尾可能是半条事件，留到下一轮
  for (const chunk of chunks) {
    const page = JSON.parse(chunk.replace(/^data: /, "")); // 取出本页的行
    virtualList.append(page.rows);           // 只进数据源，不进 DOM
  }
}
```

- `AbortController` 保证切换筛选时旧流立刻停止，避免两批数据混在同一张表里。
- 按空行切分是 SSE 的帧格式要求，直接按字节解码会把中文切成乱码。
- 预留半条事件到下一轮，是因为网络分片不保证切在事件边界上。
- 数据只进虚拟列表的数据源，DOM 节点数量与视口高度挂钩，不与总行数挂钩。
- 服务端返回的游标要指向稳定排序键，只用自增主键翻页会在并发写入时漏行。

**怎么度量收益**：用 Performance 面板统计十秒滚动内的 Long Task 数量与总阻塞时长；用 Memory 面板前后各取一次堆快照，对比 JS 堆大小；服务端用 OpenTelemetry 记录每页响应的耗时直方图，看 p95 首字节时间。

**什么时候不该用**：整表数据总量不足两屏可视行数时，分页带来的往返开销超过收益。导出 Excel 这类离线任务只需要服务端流式写文件，前端不做增量渲染。

#### 场景 2：低端安卓的首屏加载

**业务背景**：低端安卓机打开聊天页会先白屏数秒，用户以为没打开就退出。用 Chrome DevTools 的 CPU 降速四倍加网络 Slow 3G，可以在开发机上复现同样的等待。

**怎么用本页知识解决**：思路是先渲染骨架屏和本地缓存的历史消息，再用流式通道补齐增量；关键样式内联，脚本延后执行。

```html
<link rel="stylesheet" href="/critical.css">  <!-- 首屏关键样式内联，不阻塞首帧 -->
<div id="list"></div>                          <!-- 先挂骨架屏，占位高度写死 -->
<script>
  const list = document.getElementById("list");
  const es = new EventSource("/api/stream?since=" + lastSeq); // 断线自动重连
  es.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);   // 服务端给每条消息分配递增序号
    if (msg.seq <= lastSeq) return;   // 重复事件直接丢弃，保证幂等
    insertBySeq(list, msg);           // 按序号插入，避免气泡上下跳动
    lastSeq = msg.seq;
  });
  es.addEventListener("error", () => {
    showRetryHint();                  // 出错只提示重试，保留已经渲染的内容
  });
</script>
```

- 内联关键样式让首帧不必等待外部 CSS 文件，骨架屏能立刻出现。
- 占位高度写死，消息到达后替换内容不会触发整页重排。
- `since` 参数配合序号去重，重连时只补缺失区间，不会重复插入。
- 出错时不清空列表，用户已有内容不丢，只是新增暂停。
- 序号由服务端分配，客户端不要用本地时间戳排序，设备时钟并不可靠。

**怎么度量收益**：用 Lighthouse 跑移动端配置，看 LCP 与 First Contentful Paint；用 Performance 面板看 Total Blocking Time；线上用 Web Vitals 采集 INP，按机型分桶对比。

**什么时候不该用**：历史消息归档页可以一次性拉取后本地缓存，不需要常驻流式通道。设备处于离线优先模式时，应以本地数据库为准，等联网后再对账。

#### 场景 3：多人协作白板

**业务背景**：多人同时拖拽图形，事件乱序或丢失会让各端画布不一致。用两个浏览器窗口加 DevTools 的网络限速，可以稳定复现同一图形位置不同的情况。

**怎么用本页知识解决**：思路是服务端给每个操作分配递增序号，客户端按序号缓冲后连续应用，断线后按已应用序号请求补发。

```ts
type Op = { seq: number; shapeId: string; dx: number; dy: number };
const buffer = new Map<number, Op>();   // 暂存比当前序号大的事件
let applied = 0;                        // 已经应用到画布的序号

function onOp(op: Op) {
  if (op.seq <= applied) return;        // 旧事件重放，直接丢弃
  buffer.set(op.seq, op);               // 先入缓冲，不立即应用
  while (buffer.has(applied + 1)) {     // 只按连续序号依次应用
    applyToCanvas(buffer.get(applied + 1)!);
    buffer.delete(++applied);
  }
}

socket.onclose = () => {                // 断线后重新拉取缺失区间
  reconnect({ since: applied });        // 服务端补发，客户端继续走 onOp
};
```

- 用 `Map` 而不是数组存缓冲，乱序到达的事件按序号直接定位，不必排序。
- 只应用连续序号，保证所有端看到同一顺序，避免图形反复跳位。
- 断线补发复用同一条应用路径，补发事件和实时事件走同一套逻辑。
- 序号由服务端权威分配，客户端本地操作先乐观应用，收到确认后再对齐。
- 并发修改同一图形时，位移要设计成可累加的增量，不能传绝对坐标。

**怎么度量收益**：用 Playwright 对两个窗口定时截图做像素差比对，统计不一致帧数；服务端记录每次重连的补发事件条数；客户端上报缓冲区的最大长度，持续增长说明服务端发号有缺口。

**什么时候不该用**：单人使用的本地草稿板没有一致性问题，引入序号和补发只增加复杂度和流量。只读的演示看板所有端都不写数据，可以直接广播最终状态。

### 行业先进实践

**流式事件带类型与结束原因（出处：OpenAI 官方 API 文档的 Streaming 章节、Anthropic 官方文档的 Messages streaming 事件）**：两家都把每个增量包成带类型的事件，并显式给出结束原因。客户端据此判断是正常结束还是被截断，不必靠字符串结尾去猜。你的项目可以在接口契约里固定事件类型枚举，把结束原因作为必填字段。

**SSE 自动重连与 Last-Event-ID（出处：MDN Web Docs 的 Server-Sent Events 条目、WHATWG HTML Living Standard）**：规范要求 `EventSource` 断线后自动重连，并带上最后收到的事件 ID。服务端读这个请求头就能补发缺失区间，客户端不用自己写重试循环。借鉴方式是在事件里带递增 ID，并在服务端实现 `since` 查询参数。

**探针与滚动发布配合（出处：Kubernetes 官方文档的 Liveness、Readiness、Startup Probe）**：新版本实例只有 readiness 探针通过后才接入流量，滚动发布还能限制不可用实例的比例。流式服务进程启动慢，容易在半启动状态接受连接并立刻断开。发布时用 readiness 判定就绪，可以避开这段窗口。

**金丝雀发布与错误预算（出处：Google SRE Book 及其公开的 Workbook 章节）**：先放一小部分流量到新版本，观察 SLI 是否消耗完错误预算，再决定全量或回滚。流式通道的对比指标用首字节时间分位数和连接中断率。你可以把这两个指标写进发布门禁，超过阈值自动停推。

**需核对官方文档：具体核对 OpenTelemetry 的 GenAI 语义约定中，流式响应、首 token 时间与 token 计数相关的属性名称、单位和稳定性等级**。确认哪些属性已经稳定到可以进生产看板，哪些仍属实验阶段需要改名兼容。

### 从学到用：落地路线

1. 在一条非核心的流式通道上试点，只改这一条链路，不动其他接口。验收标准：试点接口的契约文档里写清事件类型、序号字段和结束原因。
2. 用对照组验证收益，同一功能保留旧实现，按流量比例分流。验收标准：能看到新旧版本在首字节时间分位数和中断率上的差值，且差值可复现。
3. 把验证过的模式固化成模板，新接口默认按模板生成。验收标准：新接入的接口不需要单独评审流式协议部分。
4. 用门禁防回退，把关键指标写进发布流水线的检查项。验收标准：指标超阈值时流水线自动阻断，并且有人收到告警。

### 动手作业

**目标**：给一个已有的列表接口加上流式分页，前端只渲染视口内的行，并支持中途取消。

**步骤**：

1. 定义一个游标分页接口，规定返回字段包含 `cursor`、`rows`、`hasMore`。
2. 服务端把这个接口改造成 SSE 输出，每页发一条事件，事件带自增 ID。
3. 前端用 `fetch` 加 `ReadableStream` 读取，按空行切分事件后再解析。
4. 接入虚拟列表，只把行写入数据源，不直接创建 DOM 节点。
5. 加上取消逻辑，切换筛选条件时调用 `abort`，确认旧流停止。
6. 加一个重连路径，服务端支持 `since` 参数补发缺失页。
7. 用降速四倍加 Slow 3G 跑一遍，记录滚动时的长任务数量。

**验收标准**：

1. 滚动一万行时，页面上的 DOM 行节点数量与视口高度相关，不随总行数增长。
2. 切换筛选条件后，屏幕上不出现上一批数据的残留行。
3. 手动断网再恢复，列表从断点继续补齐，没有重复行也没有空洞。
4. 服务端日志里每页事件的 ID 连续，重连请求的 `since` 值等于客户端已应用的最大 ID。
5. 降速环境下滚动十秒，Long Task 总时长明显低于改造前的基线，基线与结果都记录在同一个报告里。

