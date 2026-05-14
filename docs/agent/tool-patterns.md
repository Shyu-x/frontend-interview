# AI Agent 工具调用模式与实现

> 本文档详细介绍 AI Agent 系统中工具调用的设计模式、架构实现和最佳实践。

---

## 目录

1. [工具定义 Schema](#1-工具定义-schema)
2. [工具执行生命周期](#2-工具执行生命周期)
3. [内置工具实现](#3-内置工具实现)
4. [工具结果处理与错误管理](#4-工具结果处理与错误管理)
5. [多工具协同](#5-多工具协同)
6. [沙箱执行模式](#6-沙箱执行模式)
7. [安全考虑](#7-安全考虑)

---

## 1. 工具定义 Schema

### 1.1 JSON Schema 基础结构

每个工具通过 JSON Schema 定义其输入参数，LLM 根据 Schema 理解如何调用工具。

```typescript
// 工具定义完整类型
interface ToolDefinition {
  name: string;                    // 工具唯一标识符（snake_case）
  description: string;              // 详细描述，供 LLM 理解工具用途
  inputSchema: JSONSchemaDefinition; // JSON Schema 定义
  outputSchema?: JSONSchemaDefinition; // 输出 Schema（可选）
  metadata?: {
    category?: string;              // 工具分类
    requiresConfirmation?: boolean; // 是否需要用户确认
    timeout?: number;              // 超时时间（毫秒）
    retryable?: boolean;            // 是否可重试
  };
}

interface JSONSchemaDefinition {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
}

interface PropertySchema {
  type: string;                     // 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string;            // 参数描述
  default?: unknown;               // 默认值
  enum?: unknown[];                // 枚举值
  minimum?: number;                 // 最小值（number 类型）
  maximum?: number;                 // 最大值（number 类型）
  minLength?: number;               // 最小长度（string 类型）
  maxLength?: number;               // 最大长度（string 类型）
  pattern?: string;                 // 正则表达式（string 类型）
  items?: PropertySchema;          // 数组元素类型
}
```

### 1.2 Schema 示例

```typescript
// 文件读取工具的 Schema
const readFileSchema: JSONSchemaDefinition = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description: '要读取的文件绝对路径',
      pattern: '^(/[a-zA-Z0-9_-]+)+$|^[A-Z]:\\\\[a-zA-Z0-9_\\\\-]+$',
    },
    encoding: {
      type: 'string',
      description: '文件编码格式',
      enum: ['utf-8', 'utf-16', 'ascii', 'base64'],
      default: 'utf-8',
    },
    lineStart: {
      type: 'number',
      description: '起始行号（1-indexed）',
      minimum: 1,
    },
    lineEnd: {
      type: 'number',
      description: '结束行号',
      minimum: 1,
    },
  },
  required: ['path'],
  additionalProperties: false,
};

// 网络搜索工具的 Schema
const webSearchSchema: JSONSchemaDefinition = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: '搜索关键词',
      minLength: 2,
      maxLength: 500,
    },
    limit: {
      type: 'number',
      description: '返回结果数量上限',
      minimum: 1,
      maximum: 20,
      default: 10,
    },
    source: {
      type: 'string',
      description: '搜索来源',
      enum: ['web', 'news', 'github', 'stackoverflow'],
      default: 'web',
    },
    language: {
      type: 'string',
      description: '结果语言筛选',
      pattern: '^[a-z]{2}(-[A-Z]{2})?$',
      default: 'en',
    },
  },
  required: ['query'],
};

// 代码执行工具的 Schema
const executeCodeSchema: JSONSchemaDefinition = {
  type: 'object',
  properties: {
    language: {
      type: 'string',
      description: '编程语言',
      enum: ['javascript', 'typescript', 'python', 'bash', 'sql'],
    },
    code: {
      type: 'string',
      description: '要执行的代码',
      maxLength: 50000,
    },
    timeout: {
      type: 'number',
      description: '执行超时（毫秒）',
      minimum: 1000,
      maximum: 60000,
      default: 30000,
    },
    environment: {
      type: 'object',
      description: '环境变量',
      additionalProperties: { type: 'string' },
    },
  },
  required: ['language', 'code'],
};
```

### 1.3 工具注册与发现

```typescript
// 工具注册表
class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private handlers: Map<string, ToolHandler> = new Map();

  register(definition: ToolDefinition, handler: ToolHandler): void {
    // 验证 Schema 有效性
    this.validateSchema(definition.inputSchema);

    this.tools.set(definition.name, definition);
    this.handlers.set(definition.name, handler);

    console.log(`[ToolRegistry] Registered: ${definition.name}`);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getHandler(name: string): ToolHandler | undefined {
    return this.handlers.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  // 获取 LLM 可用的工具列表
  getToolsForLLM(): LLMtoolFormat[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  private validateSchema(schema: JSONSchemaDefinition): void {
    if (schema.type !== 'object') {
      throw new Error('Tool input schema must be type "object"');
    }
    if (!schema.properties || Object.keys(schema.properties).length === 0) {
      throw new Error('Tool schema must have at least one property');
    }
  }
}
```

---

## 2. 工具执行生命周期

### 2.1 完整生命周期流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      工具执行生命周期                              │
└─────────────────────────────────────────────────────────────────┘

  LLM 请求          验证           执行           后处理          完成
    │               │              │              │              │
    ▼               ▼              ▼              ▼              ▼
┌───────┐      ┌────────┐     ┌──────────┐    ┌──────────┐    ┌────────┐
│ 1.    │ ───▶ │ 2.     │ ──▶ │ 3.       │ ──▶│ 4.       │───▶│ 5.     │
│ 接收  │      │ Schema │     │ 沙箱     │    │ 结果     │    │ 返回   │
│ 工具  │      │ 验证   │     │ 执行     │    │ 转换     │    │ LLM    │
│ 调用  │      │        │     │          │    │          │    │        │
└───────┘      └────────┘     └──────────┘    └──────────┘    └────────┘
     │               │              │              │
     │               ▼              ▼              │
     │         ┌──────────┐   ┌──────────┐        │
     │         │ 参数     │   │ 超时     │        │
     │         │ 填充     │   │ 检测     │        │
     │         └──────────┘   └──────────┘        │
     │                            │               │
     ▼                            ▼               ▼
┌──────────────────────────────────────────────────────────────┐
│                      错误处理与重试                             │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 生命周期实现

```typescript
// 工具执行上下文
interface ToolExecutionContext {
  toolName: string;
  toolCallId: string;
  input: unknown;
  userId?: string;
  sessionId: string;
  metadata: Record<string, unknown>;
  startTime: number;
  abortSignal?: AbortSignal;
}

// 工具执行器
class ToolExecutor {
  constructor(
    private registry: ToolRegistry,
    private sandbox: SandboxManager,
    private errorHandler: ErrorHandler,
    private resultTransformer: ResultTransformer
  ) {}

  async execute(
    toolCall: { name: string; id: string; input: unknown },
    context: Partial<ToolExecutionContext>
  ): Promise<ToolExecutionResult> {
    const executionContext: ToolExecutionContext = {
      toolName: toolCall.name,
      toolCallId: toolCall.id,
      input: toolCall.input,
      sessionId: context.sessionId || crypto.randomUUID(),
      metadata: context.metadata || {},
      startTime: Date.now(),
      ...context,
    };

    try {
      // 阶段 1: 获取工具定义
      const tool = this.registry.get(toolCall.name);
      if (!tool) {
        throw new ToolNotFoundError(toolCall.name);
      }

      // 阶段 2: Schema 验证
      const validatedInput = this.validateInput(
        toolCall.input,
        tool.inputSchema
      );

      // 阶段 3: 参数填充默认值
      const filledInput = this.applyDefaults(validatedInput, tool.inputSchema);

      // 阶段 4: 获取处理器
      const handler = this.registry.getHandler(toolCall.name);
      if (!handler) {
        throw new HandlerNotFoundError(toolCall.name);
      }

      // 阶段 5: 沙箱执行
      const rawResult = await this.sandbox.execute(
        handler,
        filledInput,
        executionContext
      );

      // 阶段 6: 结果转换
      const result = this.resultTransformer.transform(
        rawResult,
        tool.outputSchema
      );

      return {
        success: true,
        toolCallId: toolCall.id,
        output: result,
        executionTime: Date.now() - executionContext.startTime,
      };

    } catch (error) {
      // 错误处理
      const errorResult = await this.errorHandler.handle(error, executionContext);

      return {
        success: false,
        toolCallId: toolCall.id,
        error: errorResult.message,
        errorCode: errorResult.code,
        executionTime: Date.now() - executionContext.startTime,
      };
    }
  }

  private validateInput(
    input: unknown,
    schema: JSONSchemaDefinition
  ): unknown {
    // 使用 ajv 或 zod 进行验证
    const validator = new SchemaValidator(schema);
    const result = validator.validate(input);

    if (!result.valid) {
      throw new ValidationError(result.errors);
    }

    return result.data;
  }

  private applyDefaults(
    input: unknown,
    schema: JSONSchemaDefinition
  ): unknown {
    const result = { ...input };

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (result[key] === undefined && propSchema.default !== undefined) {
        result[key] = propSchema.default;
      }
    }

    return result;
  }
}

// 执行结果
interface ToolExecutionResult {
  success: boolean;
  toolCallId: string;
  output?: unknown;
  error?: string;
  errorCode?: string;
  executionTime: number;
}
```

### 2.3 异步执行与流式输出

```typescript
// 支持流式输出的工具
interface StreamingTool {
  executeStream(
    input: unknown,
    context: ToolExecutionContext,
    onChunk: (chunk: string) => void
  ): Promise<void>;
}

// 流式执行示例
class StreamingToolExecutor {
  async executeStream(
    toolCall: ToolCall,
    context: ToolExecutionContext,
    outputStream: WritableStream<string>
  ): Promise<ToolResult> {
    const tool = this.registry.get(toolCall.name);
    const handler = tool.handler as StreamingTool;

    const writer = outputStream.getWriter();
    const encoder = new TextEncoder();

    try {
      await handler.executeStream(
        toolCall.input,
        context,
        (chunk) => writer.write(encoder.encode(chunk))
      );

      await writer.close();
      return { success: true };

    } catch (error) {
      await writer.abort(error);
      return { success: false, error: error.message };
    }
  }
}
```

---

## 3. 内置工具实现

### 3.1 文件读取工具

```typescript
// read_file 工具
const readFileTool: AgentTool = {
  name: 'read_file',
  description: '读取指定路径的文件内容。适用于查看代码、配置文件或文本文档。',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '文件的绝对路径（Windows: C:\\path\\file 或 Unix: /path/file）',
      },
      encoding: {
        type: 'string',
        description: '文件编码',
        enum: ['utf-8', 'utf-16le', 'utf-16be', 'ascii', 'base64'],
        default: 'utf-8',
      },
      lineStart: {
        type: 'number',
        description: '读取起始行（1-indexed，包含）',
        minimum: 1,
      },
      lineEnd: {
        type: 'number',
        description: '读取结束行（包含）',
        minimum: 1,
      },
      maxBytes: {
        type: 'number',
        description: '最大读取字节数（防止大文件）',
        maximum: 10485760, // 10MB
        default: 1048576,  // 1MB
      },
    },
    required: ['path'],
  },
  handler: async (input, context) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    // 安全检查：防止路径遍历
    const normalizedPath = path.normalize(input.path);
    if (normalizedPath.includes('..')) {
      throw new Error('Path traversal not allowed');
    }

    // 检查文件是否存在
    try {
      const stats = await fs.stat(normalizedPath);
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }
      if (stats.size > (input.maxBytes || 1048576)) {
        throw new Error(`File too large: ${stats.size} bytes`);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${normalizedPath}`);
      }
      throw err;
    }

    // 读取文件
    let content = await fs.readFile(normalizedPath, input.encoding || 'utf-8');

    // 行范围截取
    if (input.lineStart || input.lineEnd) {
      const lines = content.split('\n');
      const start = (input.lineStart || 1) - 1;
      const end = input.lineEnd || lines.length;
      content = lines.slice(start, end).join('\n');
    }

    return {
      success: true,
      output: {
        content,
        path: normalizedPath,
        size: content.length,
        truncated: content.length >= (input.maxBytes || 1048576),
      },
    };
  },
};
```

### 3.2 文件写入工具

```typescript
// write_file 工具
const writeFileTool: AgentTool = {
  name: 'write_file',
  description: '创建或覆盖文件内容。用于写入代码、配置文件或文档。',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '目标文件的绝对路径',
      },
      content: {
        type: 'string',
        description: '文件内容',
        maxLength: 10485760, // 10MB
      },
      encoding: {
        type: 'string',
        description: '文件编码',
        enum: ['utf-8', 'utf-16le', 'utf-16be', 'ascii'],
        default: 'utf-8',
      },
      append: {
        type: 'boolean',
        description: '是否追加模式（true 追加，false 覆盖）',
        default: false,
      },
      createDirectories: {
        type: 'boolean',
        description: '是否自动创建不存在的父目录',
        default: true,
      },
    },
    required: ['path', 'content'],
  },
  handler: async (input, context) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    // 安全检查
    const normalizedPath = path.normalize(input.path);
    if (normalizedPath.includes('..')) {
      throw new Error('Path traversal not allowed');
    }

    // 危险路径检查
    const dangerousPaths = ['/system', '/etc', '/usr', 'C:\\Windows', 'C:\\System'];
    if (dangerousPaths.some(p => normalizedPath.startsWith(p))) {
      throw new Error('Writing to system directories is not allowed');
    }

    // 创建目录
    if (input.createDirectories !== false) {
      const dir = path.dirname(normalizedPath);
      await fs.mkdir(dir, { recursive: true });
    }

    // 写入文件
    const flags = input.append ? 'a' : 'w';
    await fs.writeFile(normalizedPath, input.content, {
      encoding: input.encoding || 'utf-8',
      flag: flags,
    });

    return {
      success: true,
      output: {
        path: normalizedPath,
        bytesWritten: input.content.length,
        mode: input.append ? 'appended' : 'written',
      },
    };
  },
};
```

### 3.3 Web 搜索工具

```typescript
// web_search 工具
const webSearchTool: AgentTool = {
  name: 'web_search',
  description: '在互联网上搜索相关信息，返回匹配的网页结果摘要。',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索查询关键词',
        minLength: 2,
        maxLength: 500,
      },
      limit: {
        type: 'number',
        description: '返回结果数量（1-20）',
        minimum: 1,
        maximum: 20,
        default: 10,
      },
      source: {
        type: 'string',
        description: '搜索来源',
        enum: ['web', 'news', 'github', 'stackoverflow', 'wikipedia'],
        default: 'web',
      },
      language: {
        type: 'string',
        description: '结果语言（BCP 47 格式，如 en、zh-CN）',
        pattern: '^[a-z]{2}(-[A-Z]{2})?$',
        default: 'en',
      },
      timeRange: {
        type: 'string',
        description: '搜索时间范围',
        enum: ['day', 'week', 'month', 'year', 'any'],
        default: 'any',
      },
      safeSearch: {
        type: 'boolean',
        description: '是否启用安全搜索',
        default: true,
      },
    },
    required: ['query'],
  },
  handler: async (input, context) => {
    const searchResults = await performWebSearch({
      query: input.query,
      limit: input.limit || 10,
      source: input.source || 'web',
      language: input.language || 'en',
      timeRange: input.timeRange || 'any',
      safeSearch: input.safeSearch !== false,
    });

    return {
      success: true,
      output: {
        query: input.query,
        totalResults: searchResults.total,
        results: searchResults.items.map(item => ({
          title: item.title,
          url: item.url,
          snippet: item.snippet,
          source: item.source,
          publishedAt: item.publishedAt,
        })),
      },
    };
  },
};

// 搜索实现（可对接多种搜索 API）
async function performWebSearch(params: SearchParams): Promise<SearchResponse> {
  // 根据 source 选择不同的搜索 API
  switch (params.source) {
    case 'github':
      return searchGitHub(params);
    case 'stackoverflow':
      return searchStackOverflow(params);
    case 'wikipedia':
      return searchWikipedia(params);
    default:
      return searchWeb(params);
  }
}
```

### 3.4 代码执行工具

```typescript
// execute_code 工具
const executeCodeTool: AgentTool = {
  name: 'execute_code',
  description: '在沙箱环境中执行代码片段。支持多种编程语言。',
  inputSchema: {
    type: 'object',
    properties: {
      language: {
        type: 'string',
        description: '编程语言',
        enum: ['javascript', 'typescript', 'python', 'bash', 'sql'],
      },
      code: {
        type: 'string',
        description: '要执行的代码',
        maxLength: 50000,
      },
      timeout: {
        type: 'number',
        description: '超时时间（毫秒）',
        minimum: 1000,
        maximum: 60000,
        default: 30000,
      },
      environment: {
        type: 'object',
        description: '环境变量',
        additionalProperties: { type: 'string' },
      },
      stdin: {
        type: 'string',
        description: '标准输入',
        maxLength: 10000,
      },
    },
    required: ['language', 'code'],
  },
  handler: async (input, context) => {
    // 实际执行在沙箱中进行
    return await executeInSandbox({
      language: input.language,
      code: input.code,
      timeout: input.timeout || 30000,
      environment: input.environment,
      stdin: input.stdin,
    });
  },
};
```

### 3.5 Bash 执行工具

```typescript
// bash 工具
const bashTool: AgentTool = {
  name: 'bash',
  description: '执行 Bash 命令。用于文件系统操作、进程管理等。',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: '要执行的 Bash 命令',
        maxLength: 5000,
      },
      workingDirectory: {
        type: 'string',
        description: '命令执行的工作目录',
      },
      timeout: {
        type: 'number',
        description: '超时时间（毫秒）',
        minimum: 1000,
        maximum: 120000,
        default: 30000,
      },
      env: {
        type: 'object',
        description: '环境变量',
        additionalProperties: { type: 'string' },
      },
    },
    required: ['command'],
  },
  handler: async (input, context) => {
    // 安全检查
    const dangerousCommands = ['rm -rf /', ':(){ :|:& };:', 'mkfs', 'dd if='];
    if (dangerousCommands.some(cmd => input.command.includes(cmd))) {
      throw new Error('Dangerous command not allowed');
    }

    // 解析命令并验证白名单
    const cmdParts = parseCommand(input.command);
    if (!this.isCommandAllowed(cmdParts[0])) {
      throw new Error(`Command not allowed: ${cmdParts[0]}`);
    }

    return await executeBash({
      command: input.command,
      cwd: input.workingDirectory || process.cwd(),
      timeout: input.timeout || 30000,
      env: { ...process.env, ...input.env },
    });
  },
};
```

---

## 4. 工具结果处理与错误管理

### 4.1 结果处理管道

```typescript
// 结果转换器
class ResultTransformer {
  transform(result: unknown, schema?: JSONSchemaDefinition): unknown {
    // 空结果
    if (result === null || result === undefined) {
      return null;
    }

    // 字符串直接返回
    if (typeof result === 'string') {
      return this.truncateIfNeeded(result);
    }

    // 对象按 Schema 转换
    if (typeof result === 'object') {
      return this.transformObject(result, schema);
    }

    // 其他类型转字符串
    return String(result);
  }

  private transformObject(
    obj: object,
    schema?: JSONSchemaDefinition
  ): object {
    if (!schema) {
      return this.sanitizeObject(obj);
    }

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // 只保留 schema 中定义的字段
      if (schema.properties && key in schema.properties) {
        result[key] = this.transform(value, schema.properties[key]);
      }
    }

    return result;
  }

  private sanitizeObject(obj: object): object {
    const seen = new WeakSet();

    const sanitize = (value: unknown): unknown => {
      if (value === null || value === undefined) return null;
      if (typeof value !== 'object') return value;
      if (seen.has(value as object)) return '[Circular]';
      seen.add(value as object);

      if (Array.isArray(value)) {
        return value.slice(0, 1000).map(sanitize); // 限制数组长度
      }

      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        // 过滤敏感字段
        if (this.isSensitiveKey(k)) {
          result[k] = '[REDACTED]';
        } else {
          result[k] = sanitize(v);
        }
      }
      return result;
    };

    return sanitize(obj);
  }

  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i, /secret/i, /token/i, /api_key/i,
      /apikey/i, /credential/i, /private/i,
    ];
    return sensitivePatterns.some(p => p.test(key));
  }

  private truncateIfNeeded(str: string, maxLength = 100000): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + `\n... [truncated ${str.length - maxLength} chars]`;
  }
}
```

### 4.2 错误分类与处理

```typescript
// 错误类型枚举
enum ToolErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  SANDBOX_ERROR = 'SANDBOX_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// 错误处理策略
const errorStrategies: Record<ToolErrorCode, ErrorStrategy> = {
  [ToolErrorCode.VALIDATION_ERROR]: {
    retryable: false,
    userMessage: (err) => `Invalid input: ${err.message}`,
  },
  [ToolErrorCode.NOT_FOUND]: {
    retryable: false,
    userMessage: (err) => `Resource not found: ${err.message}`,
  },
  [ToolErrorCode.PERMISSION_DENIED]: {
    retryable: false,
    userMessage: () => 'Permission denied. Check file/directory permissions.',
  },
  [ToolErrorCode.TIMEOUT]: {
    retryable: true,
    maxRetries: 2,
    userMessage: () => 'Operation timed out. Try with a smaller scope.',
  },
  [ToolErrorCode.RATE_LIMIT]: {
    retryable: true,
    maxRetries: 3,
    backoffMs: 1000,
    userMessage: () => 'Rate limit exceeded. Please wait and retry.',
  },
  [ToolErrorCode.SANDBOX_ERROR]: {
    retryable: true,
    maxRetries: 1,
    userMessage: (err) => `Execution error: ${err.message}`,
  },
  [ToolErrorCode.UNKNOWN_ERROR]: {
    retryable: false,
    userMessage: () => 'An unexpected error occurred.',
  },
};

// 错误处理器
class ErrorHandler {
  handle(error: unknown, context: ToolExecutionContext): ToolErrorResult {
    const errorInfo = this.classifyError(error);
    const strategy = errorStrategies[errorInfo.code];

    // 记录错误
    this.logError(errorInfo, context);

    // 检查是否可重试
    if (strategy.retryable && this.shouldRetry(errorInfo, context)) {
      return {
        error: strategy.userMessage(errorInfo),
        code: errorInfo.code,
        retryable: true,
      };
    }

    return {
      error: strategy.userMessage(errorInfo),
      code: errorInfo.code,
      retryable: false,
    };
  }

  private classifyError(error: unknown): ClassifiedError {
    if (error instanceof ValidationError) {
      return { code: ToolErrorCode.VALIDATION_ERROR, message: error.message, original: error };
    }
    if (error instanceof NotFoundError) {
      return { code: ToolErrorCode.NOT_FOUND, message: error.message, original: error };
    }
    if (error instanceof PermissionError) {
      return { code: ToolErrorCode.PERMISSION_DENIED, message: error.message, original: error };
    }
    if (error instanceof TimeoutError) {
      return { code: ToolErrorCode.TIMEOUT, message: error.message, original: error };
    }
    if (error instanceof RateLimitError) {
      return { code: ToolErrorCode.RATE_LIMIT, message: error.message, original: error };
    }

    return {
      code: ToolErrorCode.UNKNOWN_ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
      original: error,
    };
  }

  private logError(error: ClassifiedError, context: ToolExecutionContext): void {
    console.error('[ToolError]', {
      tool: context.toolName,
      code: error.code,
      message: error.message,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  private shouldRetry(error: ClassifiedError, context: ToolExecutionContext): boolean {
    const retryCount = (context.metadata.retryCount || 0) as number;
    const strategy = errorStrategies[error.code];

    return retryCount < (strategy.maxRetries || 0);
  }
}
```

### 4.3 统一结果格式

```typescript
// 统一工具结果格式
interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
  errorCode?: ToolErrorCode;
  metadata?: {
    executionTime: number;
    retries: number;
    [key: string]: unknown;
  };
}

// 结果格式化（用于返回给 LLM）
function formatResultForLLM(result: ToolResult): string {
  if (result.success) {
    if (result.output === null || result.output === undefined) {
      return 'Operation completed successfully.';
    }

    if (typeof result.output === 'string') {
      return result.output;
    }

    return JSON.stringify(result.output, null, 2);
  }

  // 错误情况
  const message = result.error || 'Unknown error occurred';
  const code = result.errorCode ? `[${result.errorCode}] ` : '';
  return `${code}${message}`;
}
```

---

## 5. 多工具协同

### 5.1 工具调用编排器

```typescript
// 工具调用请求
interface ToolCallRequest {
  name: string;
  id: string;
  input: unknown;
}

// 编排器配置
interface OrchestratorConfig {
  maxConcurrent: number;        // 最大并发数
  maxSequential: number;         // 最大连续调用数
  stopOnError: boolean;          // 遇错停止
  parallelGroups?: string[][];   // 必须一起执行的工具组
}

// 工具编排器
class ToolOrchestrator {
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = {
      maxConcurrent: 5,
      maxSequential: 20,
      stopOnError: true,
      ...config,
    };
  }

  async executeAll(
    requests: ToolCallRequest[],
    executor: ToolExecutor
  ): Promise<ToolExecutionResult[]> {
    // 验证请求数量
    if (requests.length > this.config.maxSequential) {
      throw new Error(`Too many tool calls: ${requests.length} > ${this.config.maxSequential}`);
    }

    // 按依赖分组
    const groups = this.groupByDependencies(requests);

    const results: ToolExecutionResult[] = [];

    for (const group of groups) {
      // 并行执行组内工具
      const groupResults = await Promise.all(
        group.map(request => executor.execute(request, {}))
      );

      results.push(...groupResults);

      // 遇错停止
      if (this.config.stopOnError) {
        const failed = groupResults.find(r => !r.success);
        if (failed) {
          console.warn('[Orchestrator] Stopping due to error:', failed.error);
          break;
        }
      }
    }

    return results;
  }

  private groupByDependencies(requests: ToolCallRequest[]): ToolCallRequest[][] {
    if (!this.config.parallelGroups) {
      // 默认全部并行（限制并发数）
      return this.chunkArray(requests, this.config.maxConcurrent);
    }

    // 按依赖组分组
    const groups: ToolCallRequest[][] = [];
    let currentGroup: ToolCallRequest[] = [];

    for (const request of requests) {
      currentGroup.push(request);

      // 检查是否属于需要顺序执行的组
      const groupIndex = this.config.parallelGroups.findIndex(g =>
        g.includes(request.name)
      );

      if (groupIndex >= 0) {
        groups.push([...currentGroup]);
        currentGroup = [];
      } else if (currentGroup.length >= this.config.maxConcurrent) {
        groups.push([...currentGroup]);
        currentGroup = [];
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
```

### 5.2 工具依赖解析

```typescript
// 工具依赖图
class ToolDependencyGraph {
  private dependencies: Map<string, Set<string>> = new Map();
  privatedependents: Map<string, Set<string>> = new Map();

  addDependency(tool: string, dependsOn: string): void {
    if (!this.dependencies.has(tool)) {
      this.dependencies.set(tool, new Set());
    }
    this.dependencies.get(tool)!.add(dependsOn);

    if (!thisdependents.has(dependsOn)) {
      thisdependents.set(dependsOn, new Set());
    }
    thisdependents.get(dependsOn)!.add(tool);
  }

  // 拓扑排序
  getExecutionOrder(tools: string[]): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (tool: string) => {
      if (visited.has(tool)) return;
      visited.add(tool);

      // 先访问依赖
      const deps = this.dependencies.get(tool) || new Set();
      for (const dep of deps) {
        if (tools.includes(dep)) {
          visit(dep);
        }
      }

      order.push(tool);
    };

    for (const tool of tools) {
      visit(tool);
    }

    return order;
  }

  // 检测循环依赖
  hasCycle(): boolean {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (tool: string): boolean => {
      visiting.add(tool);

      const deps = this.dependencies.get(tool) || new Set();
      for (const dep of deps) {
        if (visiting.has(dep)) return true;
        if (!visited.has(dep) && dfs(dep)) return true;
      }

      visiting.delete(tool);
      visited.add(tool);
      return false;
    };

    for (const tool of this.dependencies.keys()) {
      if (!visited.has(tool) && dfs(tool)) {
        return true;
      }
    }

    return false;
  }
}

// 使用示例
const depGraph = new ToolDependencyGraph();
depGraph.addDependency('write_file', 'read_file');    // write_file 依赖 read_file
depGraph.addDependency('git_commit', 'write_file');   // git_commit 依赖 write_file

const order = depGraph.getExecutionOrder([
  'git_commit', 'write_file', 'read_file'
]);
console.log(order); // ['read_file', 'write_file', 'git_commit']
```

### 5.3 上下文传递

```typescript
// 工具执行上下文传播
class ContextPropagator {
  // 从前一个工具结果中提取需要传递给下一个工具的信息
  extractContext(
    previousResult: ToolExecutionResult,
    nextToolSchema: JSONSchemaDefinition
  ): Partial<unknown> {
    if (!previousResult.success || !previousResult.output) {
      return {};
    }

    const context: Record<string, unknown> = {};

    // 提取文件路径
    if (nextToolSchema.properties?.path) {
      const path = this.extractPath(previousResult.output);
      if (path) context.path = path;
    }

    // 提取 URL
    if (nextToolSchema.properties?.url) {
      const url = this.extractUrl(previousResult.output);
      if (url) context.url = url;
    }

    // 提取搜索结果
    if (nextToolSchema.properties?.query && previousResult.output?.results) {
      const topResult = previousResult.output.results[0];
      if (topResult?.url) {
        context.url = topResult.url;
      }
    }

    return context;
  }

  private extractPath(output: unknown): string | null {
    if (typeof output === 'string') {
      const pathMatch = output.match(/(\/[a-zA-Z0-9_\-./]+|[A-Z]:\\[a-zA-Z0-9_\\.]+)/);
      return pathMatch ? pathMatch[1] : null;
    }

    if (typeof output === 'object' && output !== null) {
      return (output as Record<string, unknown>).path as string ||
             (output as Record<string, unknown>).filePath as string ||
             null;
    }

    return null;
  }

  private extractUrl(output: unknown): string | null {
    if (typeof output === 'string') {
      const urlMatch = output.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/);
      return urlMatch ? urlMatch[0] : null;
    }

    if (typeof output === 'object' && output !== null) {
      const obj = output as Record<string, unknown>;
      const urlFields = ['url', 'link', 'href', 'uri'];
      for (const field of urlFields) {
        if (typeof obj[field] === 'string' && (obj[field] as string).startsWith('http')) {
          return obj[field] as string;
        }
      }
    }

    return null;
  }
}
```

---

## 6. 沙箱执行模式

### 6.1 沙箱架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      主进程                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   ToolExecutor                              ││
│  │  - 输入验证                                                 ││
│  │  - 资源限制                                                 ││
│  │  - 结果收集                                                 ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────┬───────────────────────────────────┘
                              │ IPC / 消息传递
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    沙箱进程池                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Sandbox 1   │  │  Sandbox 2   │  │  Sandbox N   │          │
│  │  (隔离进程)   │  │  (隔离进程)   │  │  (隔离进程)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 进程级沙箱

```typescript
// 进程沙箱实现
class ProcessSandbox {
  private pool: Map<string, ChildProcess> = new Map();
  private maxPoolSize = 5;

  async execute(
    handler: ToolHandler,
    input: unknown,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const sandboxId = crypto.randomUUID();

    // 创建子进程
    const child = spawn('node', ['-e', this.wrapHandler(handler)], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: this.createRestrictedEnv(),
      cwd: this.restrictedCwd,
      timeout: context.metadata.timeout as number || 30000,
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        resolve({ success: false, error: 'Execution timeout' });
      }, context.metadata.timeout as number || 30000);

      // 发送输入
      child.send({ id: sandboxId, input });

      // 接收结果
      child.on('message', (result) => {
        clearTimeout(timeout);
        child.kill();
        resolve(result);
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: err.message });
      });
    });
  }

  private createRestrictedEnv(): NodeJS.ProcessEnv {
    return {
      PATH: process.env.PATH?.split(':').filter(p =>
        !p.includes('bin') && !p.includes('sbin')
      ).join(':') || '',
      HOME: '/tmp/sandbox',
      TMPDIR: '/tmp/sandbox',
      NODE_ENV: 'sandbox',
      // 移除敏感变量
      NODE_OPTIONS: '',
      ELECTRON_RUN_AS_NODE: '',
    };
  }

  private restrictedCwd = '/tmp/sandbox';

  private wrapHandler(handler: ToolHandler): string {
    // 将处理器包装为可序列化的代码
    return `
      const { parentPort } = require('worker_threads');
      const handler = ${handler.toString()};

      parentPort.on('message', async ({ id, input }) => {
        try {
          const result = await handler(input, {});
          parentPort.postMessage({ id, success: true, result });
        } catch (error) {
          parentPort.postMessage({ id, success: false, error: error.message });
        }
      });
    `;
  }
}
```

### 6.3 WebAssembly 沙箱

```typescript
// Wasm 沙箱（用于安全的代码执行）
class WasmSandbox {
  private instances: Map<string, WebAssembly.Instance> = new Map();

  async execute(
    language: string,
    code: string,
    timeout: number
  ): Promise<ToolResult> {
    const wasmModule = await this.getWasmModule(language);

    // 内存限制
    const memory = new WebAssembly.Memory({
      initial: 16,  // 1MB
      maximum: 64,  // 4MB
    });

    const instance = await WebAssembly.instantiate(wasmModule, {
      env: {
        memory,
        // 限制的系统调用
        fd_write: () => 0,
        fd_close: () => 0,
      },
    });

    // 编译用户代码
    const compiled = await this.compile(language, code);

    // 执行（带超时）
    const startTime = Date.now();
    try {
      const result = await this.runWithTimeout(
        () => instance.exports.run(compiled),
        timeout
      );

      return { success: true, output: this.decodeOutput(result, memory) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async runWithTimeout<T>(
    fn: () => T,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, timeout);

      try {
        resolve(fn());
      } catch (err) {
        reject(err);
      } finally {
        clearTimeout(timer);
      }
    });
  }
}
```

### 6.4 资源限制

```typescript
// 资源限制器
interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxExecutionTimeMs: number;
  maxNetworkCalls: number;
  maxFileSizeMB: number;
}

class ResourceLimiter {
  private limits: ResourceLimits;

  constructor(limits: Partial<ResourceLimits> = {}) {
    this.limits = {
      maxMemoryMB: 512,
      maxCpuPercent: 80,
      maxExecutionTimeMs: 30000,
      maxNetworkCalls: 10,
      maxFileSizeMB: 100,
      ...limits,
    };
  }

  // 内存检查
  checkMemoryUsage(pid: number): boolean {
    // 使用 ps 或 /proc 读取内存使用
    const memUsage = this.getProcessMemory(pid);
    return memUsage < this.limits.maxMemoryMB * 1024 * 1024;
  }

  // CPU 监控
  async monitorCpuUsage(
    pid: number,
    intervalMs = 100
  ): Promise<{ avg: number; peak: number }> {
    const samples: number[] = [];

    const monitor = setInterval(() => {
      const cpu = this.getProcessCpu(pid);
      samples.push(cpu);

      if (cpu > this.limits.maxCpuPercent) {
        clearInterval(monitor);
        throw new Error('CPU limit exceeded');
      }
    }, intervalMs);

    return new Promise((resolve) => {
      setTimeout(() => {
        clearInterval(monitor);
        resolve({
          avg: samples.reduce((a, b) => a + b, 0) / samples.length,
          peak: Math.max(...samples),
        });
      }, this.limits.maxExecutionTimeMs);
    });
  }

  // 文件大小限制
  validateFileOperation(path: string, size: number): boolean {
    if (size > this.limits.maxFileSizeMB * 1024 * 1024) {
      throw new Error(`File too large: ${size} bytes`);
    }
    return true;
  }
}
```

---

## 7. 安全考虑

### 7.1 权限模型

```typescript
// 权限级别
enum PermissionLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  EXECUTE = 4,
  ADMIN = 8,
}

// 权限配置
interface PermissionConfig {
  tools: {
    [toolName: string]: {
      allowed: boolean;
      permissionLevel: PermissionLevel;
      constraints?: ToolConstraints;
    };
  };
  paths: {
    [pattern: string]: PermissionLevel;
  };
  network: {
    allowed: boolean;
    allowedDomains?: string[];
    blockedDomains?: string[];
  };
}

interface ToolConstraints {
  maxFileSize?: number;
  allowedExtensions?: string[];
  blockedExtensions?: string[];
  maxExecutionTime?: number;
}

// 权限检查器
class PermissionChecker {
  private config: PermissionConfig;

  constructor(config: PermissionConfig) {
    this.config = config;
  }

  canExecuteTool(toolName: string, userContext: UserContext): boolean {
    const toolConfig = this.config.tools[toolName];

    if (!toolConfig || !toolConfig.allowed) {
      return false;
    }

    if (userContext.permissionLevel < toolConfig.permissionLevel) {
      return false;
    }

    return true;
  }

  canAccessPath(path: string, requiredLevel: PermissionLevel): boolean {
    for (const [pattern, level] of Object.entries(this.config.paths)) {
      if (this.matchPath(pattern, path)) {
        return level >= requiredLevel;
      }
    }

    // 默认拒绝
    return false;
  }

  canAccessNetwork(url: string): boolean {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // 检查黑名单
    if (this.config.network.blockedDomains?.includes(domain)) {
      return false;
    }

    // 检查白名单
    if (this.config.network.allowedDomains?.length > 0) {
      return this.config.network.allowedDomains.includes(domain);
    }

    // 默认允许（如果配置了的话）
    return this.config.network.allowed;
  }

  private matchPath(pattern: string, path: string): boolean {
    // 支持通配符 *
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(path);
  }
}
```

### 7.2 输入安全

```typescript
// 输入净化器
class InputSanitizer {
  // 路径净化
  sanitizePath(input: string): string {
    // 移除 null bytes
    let sanitized = input.replace(/\0/g, '');

    // 规范化路径分隔符
    sanitized = sanitized.replace(/\\/g, '/');

    // 移除路径遍历
    sanitized = sanitized.replace(/\.\./g, '');

    // 移除危险字符
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');

    return sanitized;
  }

  // SQL 注入防护
  sanitizeSql(input: string): string {
    // 转义单引号
    let sanitized = input.replace(/'/g, "''");

    // 移除危险关键字
    const dangerous = /\b(UNION|SELECT|DROP|DELETE|INSERT|UPDATE|EXEC|EXECUTE)\b/gi;
    sanitized = sanitized.replace(dangerous, '');

    return sanitized;
  }

  // 命令注入防护
  sanitizeCommand(input: string): string {
    // 移除管道、重定向等
    let sanitized = input.replace(/[|;&$`><(){}[\]]/g, '');

    // 移除换行符
    sanitized = sanitized.replace(/\n|\r/g, '');

    return sanitized;
  }

  // JavaScript 注入防护
  sanitizeJs(input: string): string {
    // 移除 eval, Function 等
    let sanitized = input.replace(
      /\b(eval|Function|setTimeout|setInterval|setImmediate|execScript)\s*\(/gi,
      ''
    );

    // 移除反引号模板字符串
    sanitized = sanitized.replace(/`/g, '\\`');

    return sanitized;
  }

  // 正则表达式 DoS 防护
  validateRegex(pattern: string): { valid: boolean; error?: string } {
    try {
      // 使用 timeout 检查
      const start = Date.now();
      new RegExp(pattern);
      const elapsed = Date.now() - start;

      if (elapsed > 100) {
        return { valid: false, error: 'Regex too complex' };
      }

      // 检查回溯
      const dangerousPatterns = [
        /(\.\*)+/,
        /(\w+\+)+/,
        /(a+)+$/,
      ];

      for (const dangerous of dangerousPatterns) {
        if (dangerous.test(pattern)) {
          return { valid: false, error: 'Potential ReDoS pattern' };
        }
      }

      return { valid: true };
    } catch (err) {
      return { valid: false, error: (err as Error).message };
    }
  }
}
```

### 7.3 审计日志

```typescript
// 审计日志条目
interface AuditLogEntry {
  timestamp: string;
  sessionId: string;
  userId?: string;
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  executionTime: number;
  ipAddress?: string;
  userAgent?: string;
}

// 审计日志器
class AuditLogger {
  private buffer: AuditLogEntry[] = [];
  private flushInterval = 5000;

  constructor(private storage: AuditStorage) {
    setInterval(() => this.flush(), this.flushInterval);
  }

  log(entry: AuditLogEntry): void {
    // 敏感数据脱敏
    const sanitized = this.sanitizeEntry(entry);

    this.buffer.push(sanitized);

    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  private sanitizeEntry(entry: AuditLogEntry): AuditLogEntry {
    return {
      ...entry,
      input: this.sanitizeInput(entry.input),
    };
  }

  private sanitizeInput(input: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = /password|token|secret|key|credential/i;

    for (const [key, value] of Object.entries(input)) {
      if (sensitiveKeys.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.slice(0, 1000) + '...[TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await this.storage.write(entries);
    } catch (err) {
      console.error('[AuditLogger] Failed to write:', err);
      // 重新放回缓冲区
      this.buffer.unshift(...entries);
    }
  }
}

// 查询审计日志
async function queryAuditLogs(
  storage: AuditStorage,
  filters: {
    sessionId?: string;
    toolName?: string;
    userId?: string;
    startTime?: Date;
    endTime?: Date;
  }
): Promise<AuditLogEntry[]> {
  return storage.query({
    index: 'timestamp',
    ...filters,
  });
}
```

### 7.4 速率限制

```typescript
// 滑动窗口限流器
class RateLimiter {
  private windows: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  check(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // 获取或初始化窗口
    if (!this.windows.has(key)) {
      this.windows.set(key, []);
    }

    const timestamps = this.windows.get(key)!;

    // 移除过期的请求
    const validTimestamps = timestamps.filter(t => t > windowStart);
    this.windows.set(key, validTimestamps);

    // 检查限制
    if (validTimestamps.length >= this.maxRequests) {
      const oldestInWindow = Math.min(...validTimestamps);
      return {
        allowed: false,
        remaining: 0,
        resetIn: oldestInWindow + this.windowMs - now,
      };
    }

    // 记录新请求
    validTimestamps.push(now);

    return {
      allowed: true,
      remaining: this.maxRequests - validTimestamps.length,
      resetIn: this.windowMs,
    };
  }

  // 清理过期数据
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, timestamps] of this.windows.entries()) {
      const valid = timestamps.filter(t => t > windowStart);
      if (valid.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, valid);
      }
    }
  }
}

// 工具级别限流
class ToolRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();

  constructor(private configs: Record<string, { maxRequests: number; windowMs: number }>) {
    for (const [tool, config] of Object.entries(configs)) {
      this.limiters.set(tool, new RateLimiter(config.maxRequests, config.windowMs));
    }
  }

  check(toolName: string, userId: string): RateLimitResult {
    const limiter = this.limiters.get(toolName);
    if (!limiter) {
      return { allowed: true, remaining: -1, resetIn: 0 };
    }

    return limiter.check(`${toolName}:${userId}`);
  }
}
```

---

## 附录：最佳实践清单

### 工具设计

- [ ] 每个工具只做一件事（单一职责）
- [ ] 使用清晰的 Schema 定义输入参数
- [ ] 提供有意义的错误消息
- [ ] 设置合理的超时时间
- [ ] 添加使用示例和文档

### 安全性

- [ ] 实现权限检查
- [ ] 净化所有用户输入
- [ ] 使用沙箱执行不受信任的代码
- [ ] 记录审计日志
- [ ] 实现速率限制

### 性能

- [ ] 限制并发工具调用数量
- [ ] 使用连接池复用资源
- [ ] 实现结果缓存
- [ ] 设置合理的内存和 CPU 限制

### 可靠性

- [ ] 实现重试机制
- [ ] 优雅处理超时
- [ ] 提供回退方案
- [ ] 监控系统健康状态

---

## 参考资料

- [JSON Schema 规范](https://json-schema.org/)
- [WebAssembly 安全模型](https://webassembly.org/docs/security/)
- [OWASP 安全编码实践](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
