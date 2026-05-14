# AI Agent 功能设计

> 本文档定义 Agent 系统的技术架构和实现细节。

## 系统架构

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

## 技术栈

### 前端
- **框架**：React 18 + TypeScript
- **构建**：Vite 5
- **状态管理**：React hooks (useState/useRef)
- **样式**：Tailwind CSS (内联)

### 后端
- **框架**：NestJS 10
- **LLM**：LangChain + Anthropic
- **协议**：Server-Sent Events (SSE)

## 核心功能

### 1. 流式对话 (SSE)

#### 前端实现

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

#### 后端实现

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

### 2. 打字机效果

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

### 3. TypeScript Agent (Claude Code Style)

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

### 4. 内置工具

| 工具名 | 功能 | 输入 |
|--------|------|------|
| `read_file` | 读取文件 | `{ path: string }` |
| `write_file` | 写入文件 | `{ path: string, content: string }` |
| `web_search` | 网络搜索 | `{ query: string, limit?: number }` |
| `execute_code` | 执行代码 | `{ language: string, code: string }` |

## 启动指南

### 前端

```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

### 后端

```bash
cd backend
npm install
npm run dev    # http://localhost:4000
```

### 环境变量

```bash
# backend/.env
ANTHROPIC_API_KEY=your-api-key
PORT=4000
```

## API 接口

### POST /api/chat

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

### POST /api/chat/stream

流式对话接口（SSE）。

**响应格式**：
```
data: {"choices":[{"index":0,"delta":{"content":"你"},"finish_reason":null}]}

data: {"choices":[{"index":0,"delta":{"content":"好"},"finish_reason":null}]}

data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

## 后续扩展

- [ ] 添加更多内置工具
- [ ] 支持 OpenAI/Gemini 模型
- [ ] 添加对话历史持久化
- [ ] 添加 MCP (Model Context Protocol) 支持
- [ ] 添加 RAG (检索增强生成)
- [ ] 添加多 Agent 协作