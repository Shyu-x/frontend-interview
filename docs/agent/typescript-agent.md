# TypeScript Agent 系统

> 参考 Claude Code 源码架构实现的 TypeScript Agent

## 核心概念

### Agent

Agent 是能够自主决策、执行工具、完成复杂任务的人工智能系统。

```
User Input → Agent → LLM → Tools → Result
                       ↓
                  (More Tools)
                       ↓
                    Output
```

### Tool

Tool 是 Agent 可以调用的外部能力。

```typescript
interface AgentTool {
  name: string;           // 工具名称
  description: string;    // 工具描述（用于 LLM 理解）
  inputSchema: object;    // 输入参数 Schema
  handler: ToolHandler;    // 实际执行函数
}
```

### State

Agent 的内部状态机：

```typescript
type AgentStatus = 'idle' | 'thinking' | 'executing' | 'waiting-for-input';
```

## 内置工具

### read_file

读取文件内容。

```json
{
  "name": "read_file",
  "input": { "path": "src/main.ts" }
}
```

### write_file

写入文件内容。

```json
{
  "name": "write_file",
  "input": { "path": "src/main.ts", "content": "console.log('hello')" }
}
```

### web_search

搜索网络。

```json
{
  "name": "web_search",
  "input": { "query": "TypeScript best practices", "limit": 5 }
}
```

### execute_code

执行代码（沙箱环境）。

```json
{
  "name": "execute_code",
  "input": { "language": "javascript", "code": "console.log('hello')" }
}
```

## 扩展 Agent

### 自定义工具

```typescript
const myTool: AgentTool = {
  name: 'my_custom_tool',
  description: '执行自定义操作',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string' }
    },
    required: ['action']
  },
  handler: async (input, context) => {
    const { action } = input as { action: string };
    // 执行逻辑
    return { success: true, output: `Action: ${action}` };
  }
};
```

### 自定义 LLM 适配器

```typescript
class CustomAdapter implements LLMAdapter {
  async complete(params) {
    // 实现你的 LLM 调用逻辑
  }
}
```

## 最佳实践

1. **工具设计**：每个工具只做一件事，职责单一
2. **错误处理**：工具应该返回结构化的成功/失败结果
3. **状态管理**：复杂 Agent 需要持久化中间状态
4. **安全**：文件操作和代码执行需要沙箱隔离