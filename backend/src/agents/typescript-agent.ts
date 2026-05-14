// TypeScript 实现的多能力 Agent 系统
// 参考 Claude Code 源码架构

export interface AgentConfig {
  name: string;
  description: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools: AgentTool[];
  systemPrompt?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: ToolHandler;
}

export type ToolHandler = (
  input: unknown,
  context: AgentContext
) => Promise<ToolResult>;

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface AgentContext {
  messages: ConversationMessage[];
  conversationId: string;
  metadata: Record<string, unknown>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface AgentState {
  status: 'idle' | 'thinking' | 'executing' | 'waiting-for-input';
  currentTool?: string;
  toolResults: Map<string, ToolResult>;
  iterations: number;
  error?: string;
}

// ==================== Agent 核心类 ====================

export class TypeScriptAgent {
  private config: AgentConfig;
  private state: AgentState;
  private llm: LLMAdapter;

  constructor(config: AgentConfig, llm: LLMAdapter) {
    this.config = config;
    this.llm = llm;
    this.state = {
      status: 'idle',
      toolResults: new Map(),
      iterations: 0,
    };
  }

  async run(input: string, context?: Partial<AgentContext>): Promise<string> {
    this.state.status = 'thinking';
    this.state.iterations = 0;

    const messages: ConversationMessage[] = [
      ...(this.config.systemPrompt
        ? [{ role: 'system' as const, content: this.config.systemPrompt }]
        : []),
      { role: 'user', content: input },
    ];

    while (this.state.iterations < 10) {
      this.state.iterations++;

      // 调用 LLM
      const response = await this.llm.complete({
        messages,
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        tools: this.config.tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.inputSchema,
        })),
      });

      // 检查是否有工具调用
      if (response.toolCalls && response.toolCalls.length > 0) {
        this.state.status = 'executing';

        for (const toolCall of response.toolCalls) {
          const tool = this.config.tools.find((t) => t.name === toolCall.name);
          if (!tool) {
            messages.push({
              role: 'tool',
              content: `Error: Tool ${toolCall.name} not found`,
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            });
            continue;
          }

          try {
            const result = await tool.handler(toolCall.input, {
              messages,
              conversationId: context?.conversationId || 'default',
              metadata: context?.metadata || {},
            });

            this.state.toolResults.set(toolCall.id, result);

            messages.push({
              role: 'tool',
              content: result.output || result.error || 'No output',
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            });
          } catch (error) {
            messages.push({
              role: 'tool',
              content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            });
          }
        }
      } else {
        // 没有工具调用，返回最终结果
        this.state.status = 'idle';
        return response.content || '';
      }
    }

    this.state.status = 'idle';
    return 'Max iterations reached';
  }

  getState(): Readonly<AgentState> {
    return { ...this.state };
  }
}

// ==================== LLM 适配器接口 ====================

export interface LLMAdapter {
  complete(params: {
    messages: ConversationMessage[];
    model: string;
    temperature: number;
    maxTokens: number;
    tools?: Array<{
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
    }>;
  }): Promise<{
    content?: string;
    toolCalls?: Array<{
      id: string;
      name: string;
      input: unknown;
    }>;
  }>;
}

// ==================== Anthropic LLM 适配器 ====================

export class AnthropicAdapter implements LLMAdapter {
  constructor(private apiKey: string) {}

  async complete(params: {
    messages: ConversationMessage[];
    model: string;
    temperature: number;
    maxTokens: number;
    tools?: Array<{
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
    }>;
  }): Promise<{
    content?: string;
    toolCalls?: Array<{ id: string; name: string; input: unknown }>;
  }> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        messages: params.messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role === 'tool' ? 'user' : m.role,
            content:
              m.role === 'tool'
                ? [
                    {
                      type: 'tool_result',
                      tool_use_id: m.toolCallId,
                      content: m.content,
                    },
                  ]
                : m.content,
          })),
        system: params.messages.find((m) => m.role === 'system')?.content,
        tools: params.tools?.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.content?.find((c: { type: string }) => c.type === 'text')
        ?.text,
      toolCalls: data.content
        ?.filter((c: { type: string }) => c.type === 'tool_use')
        .map((c: { id: string; name: string; input: unknown }) => ({
          id: c.id,
          name: c.name,
          input: c.input,
        })),
    };
  }
}

// ==================== 内置工具示例 ====================

export const createBuiltInTools = {
  // 文件读取工具
  readFile: (basePath: string = '.'): AgentTool => ({
    name: 'read_file',
    description: '读取文件内容',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径' },
      },
      required: ['path'],
    },
    handler: async (input, _context) => {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const content = await fs.readFile(
          path.join(basePath, (input as { path: string }).path),
          'utf-8'
        );
        return { success: true, output: content };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Read failed',
        };
      }
    },
  }),

  // 文件写入工具
  writeFile: (basePath: string = '.'): AgentTool => ({
    name: 'write_file',
    description: '写入文件内容',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径' },
        content: { type: 'string', description: '文件内容' },
      },
      required: ['path', 'content'],
    },
    handler: async (input, _context) => {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { path: filePath, content } = input as {
          path: string;
          content: string;
        };
        await fs.writeFile(path.join(basePath, filePath), content, 'utf-8');
        return { success: true, output: `Written to ${filePath}` };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Write failed',
        };
      }
    },
  }),

  // Web 搜索工具
  webSearch: (): AgentTool => ({
    name: 'web_search',
    description: '搜索网络获取信息',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        limit: { type: 'number', description: '结果数量', default: 5 },
      },
      required: ['query'],
    },
    handler: async (input, _context) => {
      try {
        const { query, limit = 5 } = input as {
          query: string;
          limit?: number;
        };
        // 这里可以接入真实的搜索 API
        return {
          success: true,
          output: `Search results for "${query}": [Result 1, Result 2, ...]`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Search failed',
        };
      }
    },
  }),

  // 代码执行工具
  executeCode: (): AgentTool => ({
    name: 'execute_code',
    description: '执行代码片段',
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          enum: ['javascript', 'python', 'bash'],
          description: '代码语言',
        },
        code: { type: 'string', description: '要执行的代码' },
      },
      required: ['language', 'code'],
    },
    handler: async (input, _context) => {
      try {
        const { language, code } = input as {
          language: string;
          code: string;
        };
        // 注意：实际生产环境中应该使用安全的沙箱执行
        return {
          success: true,
          output: `[Simulated execution of ${language} code]`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Execution failed',
        };
      }
    },
  }),
};

// ==================== Agent 工厂 ====================

export function createAgent(config: {
  name: string;
  description: string;
  apiKey: string;
  model?: string;
  customTools?: AgentTool[];
}): TypeScriptAgent {
  const tools = [
    createBuiltInTools.readFile(),
    createBuiltInTools.writeFile(),
    createBuiltInTools.webSearch(),
    createBuiltInTools.executeCode(),
    ...(config.customTools || []),
  ];

  const llm = new AnthropicAdapter(config.apiKey);

  return new TypeScriptAgent(
    {
      name: config.name,
      description: config.description,
      model: config.model || 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 4096,
      tools,
      systemPrompt: `You are ${config.name}, ${config.description}.`,
    },
    llm
  );
}