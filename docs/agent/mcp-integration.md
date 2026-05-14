# MCP (Model Context Protocol) 集成指南

> 本文档介绍 MCP 协议的概念、实现以及与 AI Agent 的集成方式。

---

## 目录

1. [MCP 概述](#1-mcp-概述)
2. [协议架构](#2-协议架构)
3. [MCP 服务器实现](#3-mcp-服务器实现)
4. [MCP 客户端实现](#4-mcp-客户端实现)
5. [工具定义与注册](#5-工具定义与注册)
6. [资源管理](#6-资源管理)
7. [提示模板](#7-提示模板)
8. [安全考虑](#8-安全考虑)

---

## 1. MCP 概述

### 1.1 什么是 MCP

MCP (Model Context Protocol) 是一个开放协议，用于标准化 AI 模型与外部工具、数据源之间的通信。它提供：

- **统一接口**：不同厂商的工具使用相同协议
- **可扩展性**：轻松添加新的工具和数据源
- **类型安全**：强类型的工具定义和结果返回

### 1.2 MCP vs 传统工具调用

| 特性 | 传统工具调用 | MCP |
|------|-------------|-----|
| 协议 | 厂商私有 | 开放标准 |
| 发现机制 | 静态定义 | 动态发现 |
| 类型安全 | JSON Schema | JSON-RPC + Schema |
| 状态管理 | 应用自行处理 | 内置会话状态 |
| 传输层 | HTTP/自定义 | stdio / HTTP |

---

## 2. 协议架构

### 2.1 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                        Host (Claude Code)                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   MCP Client                             │ │
│  │  - 管理服务器连接                                        │ │
│  │  - 路由请求/响应                                         │ │
│  │  - 处理工具调用                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │ stdio / HTTP
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  - 工具定义与执行                                        │ │
│  │  - 资源管理                                             │ │
│  │  - 提示模板                                             │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 JSON-RPC 消息格式

```typescript
// 请求格式
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

// 响应格式
interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: {
    contents: Array<{
      type: 'text' | 'image' | 'resource';
      mimeType?: string;
      text?: string;
      data?: string;
      uri?: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// 通知格式（无响应）
interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: {
    event: 'notifications/message';
    level: 'info' | 'warning' | 'error';
    data: string;
  };
}
```

### 2.3 核心方法

| 方法 | 方向 | 说明 |
|------|------|------|
| `initialize` | Client → Server | 建立连接，交换能力 |
| `tools/list` | Client → Server | 列出可用工具 |
| `tools/call` | Client → Server | 调用工具 |
| `resources/list` | Client → Server | 列出可用资源 |
| `resources/read` | Client → Server | 读取资源 |
| `prompts/list` | Client → Server | 列出提示模板 |
| `prompts/get` | Client → Server | 获取提示 |
| `sampling/createMessage` | Server → Client | 请求采样 |

---

## 3. MCP 服务器实现

### 3.1 Python FastMCP 实现

```python
# server/fastmcp_server.py
from fastmcp import FastMCP

mcp = FastMCP("Demo Server")

@mcp.tool()
def read_file(path: str, limit: int = 1000) -> str:
    """读取文件内容

    Args:
        path: 文件路径
        limit: 最大读取字符数
    """
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read(limit)
    return content

@mcp.tool()
def search_web(query: str, limit: int = 5) -> list[dict]:
    """搜索网络

    Args:
        query: 搜索关键词
        limit: 结果数量
    """
    results = [
        {"title": f"Result {i}", "url": f"https://example.com/{i}"}
        for i in range(limit)
    ]
    return results

@mcp.resource("file://config")
def get_config() -> str:
    """返回配置文件内容"""
    return '{"setting": "value"}'

@mcp.prompt()
def code_review(file_path: str) -> str:
    """生成代码审查提示"""
    return f"""请审查以下文件：
{file_path}

考虑：
1. 代码质量和风格
2. 潜在的 bug
3. 安全问题
4. 性能优化建议
```

if __name__ == "__main__":
    mcp.run()
```

### 3.2 TypeScript MCP SDK 实现

```typescript
// server/mcp-server.ts
import { MCPServer, Tool, Resource, Prompt } from '@modelcontextprotocol/sdk';

const server = new MCPServer({
  name: 'demo-server',
  version: '1.0.0',
});

// 定义工具
const readFileTool: Tool = {
  name: 'read_file',
  description: '读取文件内容',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径' },
      limit: { type: 'number', description: '最大字符数', default: 1000 },
    },
    required: ['path'],
  },
  handler: async (params) => {
    const fs = await import('fs/promises');
    const content = await fs.readFile(params.path, 'utf-8');
    return {
      contents: [{
        type: 'text',
        text: content.slice(0, params.limit || 1000),
      }],
    };
  },
};

const searchWebTool: Tool = {
  name: 'search_web',
  description: '搜索网络获取信息',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'number', default: 5 },
    },
    required: ['query'],
  },
  handler: async (params) => {
    const results = await performSearch(params.query, params.limit);
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  },
};

// 注册工具
server.setRequestHandler('tools/list', async () => ({
  tools: [readFileTool, searchWebTool],
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  const tool = [readFileTool, searchWebTool].find(t => t.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return await tool.handler(args);
});

// 定义资源
const configResource: Resource = {
  uri: 'config://app',
  name: 'Application Config',
  mimeType: 'application/json',
  async load() {
    return {
      contents: [{
        type: 'resource',
        mimeType: 'application/json',
        text: JSON.stringify({ setting: 'value' }),
      }],
    };
  },
};

server.setRequestHandler('resources/list', async () => ({
  resources: [configResource],
}));

// 启动服务器
server.start();
```

### 3.3 NestJS MCP 集成

```typescript
// mcp.controller.ts
@Controller('mcp')
export class MCPToolsController {
  constructor(private readonly mcpService: MCPService) {}

  @Get('tools')
  async listTools(): Promise<{ tools: Tool[] }> {
    return this.mcpService.listTools();
  }

  @Post('tools/call')
  async callTool(
    @Body() body: { name: string; arguments: Record<string, unknown> }
  ): Promise<{ contents: Content[] }> {
    return this.mcpService.callTool(body.name, body.arguments);
  }

  @Get('resources')
  async listResources(): Promise<{ resources: Resource[] }> {
    return this.mcpService.listResources();
  }

  @Get('resources/:uri')
  async readResource(@Param('uri') uri: string): Promise<{ contents: Content[] }> {
    return this.mcpService.readResource(uri);
  }
}

// mcp.service.ts
@Injectable()
export class MCPService {
  private tools: Map<string, Tool> = new Map();
  private resources: Map<string, Resource> = new Map();

  constructor() {
    this.registerBuiltInTools();
  }

  private registerBuiltInTools() {
    this.tools.set('read_file', {
      name: 'read_file',
      description: '读取文件内容',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
        },
        required: ['path'],
      },
      handler: async (args) => {
        const fs = await import('fs/promises');
        const content = await fs.readFile(args.path, 'utf-8');
        return { contents: [{ type: 'text', text: content }] };
      },
    });

    this.tools.set('web_search', {
      name: 'web_search',
      description: '搜索网络',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number', default: 5 },
        },
        required: ['query'],
      },
      handler: async (args) => {
        const results = await search(args.query, args.limit);
        return { contents: [{ type: 'text', text: JSON.stringify(results) }] };
      },
    });
  }

  async listTools(): Promise<{ tools: Tool[] }> {
    return { tools: Array.from(this.tools.values()) };
  }

  async callTool(name: string, args: Record<string, unknown>) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new NotFoundException(`Tool ${name} not found`);
    }
    return tool.handler(args);
  }

  async listResources(): Promise<{ resources: Resource[] }> {
    return { resources: Array.from(this.resources.values()) };
  }

  async readResource(uri: string) {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new NotFoundException(`Resource ${uri} not found`);
    }
    return resource.load();
  }
}
```

---

## 4. MCP 客户端实现

### 4.1 TypeScript 客户端

```typescript
// client/mcp-client.ts
import { JSONRPCClient } from '@modelcontextprotocol/sdk';

class MCPClient {
  private client: JSONRPCClient;
  private capabilities: ServerCapabilities = {};

  constructor(serverPath: string) {
    this.client = new JSONRPCClient(async (request) => {
      // 发送到服务器（stdio 或 HTTP）
      const response = await this.sendRequest(serverPath, request);
      return response;
    });
  }

  async initialize(): Promise<void> {
    const response = await this.client.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
      },
      clientInfo: {
        name: 'example-client',
        version: '1.0.0',
      },
    });

    this.capabilities = response.capabilities;

    // 发送初始化完成通知
    await this.client.notify('notifications/initialized', {});
  }

  async listTools(): Promise<Tool[]> {
    const response = await this.client.request('tools/list', {});
    return response.tools;
  }

  async callTool(name: string, args: Record<string, unknown>) {
    return this.client.request('tools/call', {
      name,
      arguments: args,
    });
  }

  async listResources(): Promise<Resource[]> {
    const response = await this.client.request('resources/list', {});
    return response.resources;
  }

  async readResource(uri: string) {
    return this.client.request('resources/read', { uri });
  }

  async listPrompts(): Promise<Prompt[]> {
    const response = await this.client.request('prompts/list', {});
    return response.prompts;
  }

  async getPrompt(name: string, args?: Record<string, unknown>) {
    return this.client.request('prompts/get', { name, arguments: args });
  }

  private async sendRequest(
    serverPath: string,
    request: any
  ): Promise<any> {
    // stdio 通信实现
    const { spawn } = await import('child_process');
    const child = spawn(serverPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        try {
          const response = JSON.parse(stdout);
          resolve(response);
        } catch {
          // 等待更多数据
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', reject);

      // 发送请求
      child.stdin.write(JSON.stringify(request) + '\n');
    });
  }
}

// 使用
async function main() {
  const client = new MCPClient('./mcp-server');
  await client.initialize();

  const tools = await client.listTools();
  console.log('Available tools:', tools);

  const result = await client.callTool('read_file', { path: '/etc/hosts' });
  console.log('File content:', result);
}
```

### 4.2 Python 客户端

```python
# client/mcp_client.py
import json
import subprocess
from typing import Any

class MCPClient:
    def __init__(self, server_path: str):
        self.server_path = server_path
        self.capabilities = {}

    def send_request(self, request: dict) -> dict:
        """通过 stdio 发送请求"""
        proc = subprocess.Popen(
            [self.server_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        stdout, stderr = proc.communicate(input=json.dumps(request) + '\n')

        if stderr:
            print(f"Server stderr: {stderr}")

        return json.loads(stdout)

    async def initialize(self) -> None:
        response = self.send_request({
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'initialize',
            'params': {
                'protocolVersion': '2024-11-05',
                'capabilities': {},
                'clientInfo': {
                    'name': 'example-client',
                    'version': '1.0.0',
                },
            },
        })

        self.capabilities = response.get('capabilities', {})

        # 发送初始化完成
        self.send_request({
            'jsonrpc': '2.0',
            'method': 'notifications/initialized',
            'params': {},
        })

    async def list_tools(self) -> list[dict]:
        response = self.send_request({
            'jsonrpc': '2.0',
            'id': 2,
            'method': 'tools/list',
            'params': {},
        })
        return response.get('result', {}).get('tools', [])

    async def call_tool(self, name: str, arguments: dict) -> dict:
        response = self.send_request({
            'jsonrpc': '2.0',
            'id': 3,
            'method': 'tools/call',
            'params': {
                'name': name,
                'arguments': arguments,
            },
        })
        return response.get('result', {})

    async def list_resources(self) -> list[dict]:
        response = self.send_request({
            'jsonrpc': '2.0',
            'id': 4,
            'method': 'resources/list',
            'params': {},
        })
        return response.get('result', {}).get('resources', [])
```

---

## 5. 工具定义与注册

### 5.1 工具定义 Schema

```typescript
// 工具定义完整示例
interface ToolDefinition {
  name: string;           // 工具唯一标识
  description: string;    // 描述（用于 LLM 理解）
  inputSchema: {          // JSON Schema 定义
    type: 'object';
    properties: {
      [key: string]: {
        type: 'string' | 'number' | 'boolean' | 'array' | 'object';
        description?: string;
        default?: any;
        enum?: any[];
        minimum?: number;
        maximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        items?: any;
      };
    };
    required?: string[];
  };
  annotations?: {          // 可选元数据
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };
}

// 示例：复杂参数工具
const executeSQLTool: ToolDefinition = {
  name: 'execute_sql',
  description: '执行 SQL 查询（只读查询）',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'SQL 查询语句',
        minLength: 1,
        maxLength: 5000,
      },
      database: {
        type: 'string',
        description: '目标数据库名称',
        enum: ['users', 'orders', 'analytics'],
      },
      limit: {
        type: 'number',
        description: '最大返回行数',
        default: 100,
        minimum: 1,
        maximum: 1000,
      },
    },
    required: ['query', 'database'],
  },
  annotations: {
    title: 'Execute SQL Query',
    readOnlyHint: true,  // 提示 LLM 这是只读操作
  },
};
```

### 5.2 工具注册流程

```typescript
// 工具注册时序图
/*
Server                              Client
  │                                    │
  │◀────── initialize ────────────────│  1. 客户端初始化请求
  │─────── capabilities ──────────────▶│  2. 服务端返回能力
  │                                    │
  │◀────── notifications/initialized ─│  3. 客户端发送初始化完成
  │                                    │
  │◀──────── tools/list ──────────────│  4. 客户端请求工具列表
  │───────── tools[] ──────────────────▶│  5. 服务端返回工具定义
  │                                    │
  │◀──────── tools/call ──────────────│  6. 客户端调用工具
  │───────── result ──────────────────▶│  7. 服务端返回结果
*/

// 服务端注册
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'read_file',
        description: '读取文件内容',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
          required: ['path'],
        },
      },
      // ... 更多工具
    ],
  };
});

// 客户端发现并缓存
class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  async discover(server: MCPClient) {
    const tools = await server.listTools();
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}
```

---

## 6. 资源管理

### 6.1 资源定义

```typescript
// 资源定义
interface Resource {
  uri: string;           // 资源 URI（scheme://path）
  name: string;          // 显示名称
  description?: string; // 描述
  mimeType?: string;    // MIME 类型
}

// 示例资源
const resources: Resource[] = [
  {
    uri: 'file://config/app.json',
    name: 'Application Config',
    description: '当前应用配置文件',
    mimeType: 'application/json',
  },
  {
    uri: 'database://users/recent',
    name: 'Recent Users',
    description: '最近活跃用户列表',
    mimeType: 'application/json',
  },
  {
    uri: 'web://api/status',
    name: 'API Status',
    description: '外部 API 健康状态',
    mimeType: 'application/json',
  },
];
```

### 6.2 资源模板

```typescript
// 带参数的资源模板
interface ResourceTemplate {
  uriTemplate: string;   // URI 模板（如 file://logs/{date}）
  name: string;
  description?: string;
  mimeType?: string;
}

// 示例
const logTemplate: ResourceTemplate = {
  uriTemplate: 'file://logs/{date}',
  name: 'Daily Logs',
  description: '指定日期的应用日志',
  mimeType: 'text/plain',
};

// 客户端使用
const resources = await client.listResources();
// 如果有模板，可以展开
const todayLogs = await client.readResource('file://logs/2024-01-15');
```

---

## 7. 提示模板

### 7.1 提示定义

```typescript
// 提示模板定义
interface Prompt {
  name: string;           // 模板名称
  description?: string;  // 描述
  arguments?: Array<{    // 参数定义
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

// 示例
const prompts: Prompt[] = [
  {
    name: 'code_review',
    description: '生成代码审查任务',
    arguments: [
      { name: 'file_path', description: '要审查的文件路径', required: true },
      { name: 'language', description: '编程语言' },
    ],
  },
  {
    name: 'explain_error',
    description: '解释错误并提供修复建议',
    arguments: [
      { name: 'error_message', description: '错误信息', required: true },
      { name: 'stack_trace', description: '堆栈跟踪' },
    ],
  },
];
```

### 7.2 提示渲染

```typescript
// 服务端渲染提示
server.setRequestHandler('prompts/get', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'code_review') {
    const { file_path } = args;
    const content = await readFile(file_path);

    return {
      messages: [{
        role: 'user',
        content: `请审查以下 ${args.language || '代码'} 文件：

\`\`\`
${content}
\`\`\`

考虑：
1. 代码质量和风格
2. 潜在的 bug 和安全问题
3. 性能优化建议
4. 最佳实践符合度`,
      }],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

// 客户端使用
const prompt = await client.getPrompt('code_review', { file_path: '/src/main.ts' });
console.log(prompt.messages);
```

---

## 8. 安全考虑

### 8.1 输入验证

```typescript
// 工具参数验证
function validateToolInput(tool: ToolDefinition, args: any): ValidationResult {
  const errors: string[] = [];

  // 检查必需参数
  for (const required of tool.inputSchema.required || []) {
    if (args[required] === undefined) {
      errors.push(`Missing required parameter: ${required}`);
    }
  }

  // 类型检查
  for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
    if (args[key] !== undefined) {
      if (!validateType(args[key], schema)) {
        errors.push(`Invalid type for ${key}: expected ${schema.type}`);
      }
    }
  }

  // 范围检查
  if (schema.type === 'number') {
    if (schema.minimum !== undefined && args[key] < schema.minimum) {
      errors.push(`${key} must be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && args[key] > schema.maximum) {
      errors.push(`${key} must be <= ${schema.maximum}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### 8.2 权限控制

```typescript
// 权限检查
interface Permission {
  tool: string;
  allowed: boolean;
  rateLimit?: { maxPerMinute: number };
}

class PermissionManager {
  private permissions: Map<string, Permission> = new Map();

  async checkPermission(tool: string): Promise<boolean> {
    const permission = this.permissions.get(tool);
    if (!permission) return false;
    return permission.allowed;
  }

  async checkRateLimit(tool: string): Promise<boolean> {
    const permission = this.permissions.get(tool);
    if (!permission?.rateLimit) return true;

    // 实现速率限制逻辑
    return this.checkRateLimitImpl(tool, permission.rateLimit.maxPerMinute);
  }
}

// 使用
const permissionManager = new PermissionManager();

server.setRequestHandler('tools/call', async (request) => {
  const { name } = request.params;

  if (!await permissionManager.checkPermission(name)) {
    throw new Error(`Permission denied for tool: ${name}`);
  }

  if (!await permissionManager.checkRateLimit(name)) {
    throw new Error(`Rate limit exceeded for tool: ${name}`);
  }

  // 执行工具...
});
```

### 8.3 审计日志

```typescript
// 审计日志
interface AuditEntry {
  timestamp: string;
  tool: string;
  args: Record<string, unknown>;
  result?: any;
  error?: string;
  user?: string;
  sessionId?: string;
}

class AuditLogger {
  private entries: AuditEntry[] = [];

  log(entry: Omit<AuditEntry, 'timestamp'>) {
    this.entries.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  async flush() {
    // 写入持久化存储
    await this.persist(this.entries);
    this.entries = [];
  }
}

const auditLogger = new AuditLogger();

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await executeTool(name, args);
    auditLogger.log({ tool: name, args, result });
    return result;
  } catch (error) {
    auditLogger.log({ tool: name, args, error: error.message });
    throw error;
  }
});
```

---

## MCP 集成示例

### Claude Code 中的 MCP 使用

```yaml
# ~/.claude/settings.json 或项目 .claude/settings.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed"],
      "env": {
        "ALLOWED_DIRECTORIES": "/path/to/allowed"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    }
  }
}
```

### 配置后可用工具

```
文件系统 MCP:
  - read_file - 读取文件
  - write_file - 写入文件
  - list_directory - 列出目录

GitHub MCP:
  - search_repositories - 搜索仓库
  - get_repository - 获取仓库信息
  - create_issue - 创建 Issue
  - create_pull_request - 创建 PR

Brave Search MCP:
  - brave_web_search - 网络搜索
  - brave_local_search - 本地搜索
```

---

## 参考资源

- [MCP 官方文档](https://modelcontextprotocol.io)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Servers 仓库](https://github.com/modelcontextprotocol/servers)