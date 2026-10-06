---
title: MCP 协议集成
description: 介绍 MCP 协议的概念、实现以及与 AI Agent 的集成方式。
tags:
  - ai-agent
  - mcp
date: 2026-05-17
---

# MCP 协议集成

> 本文档介绍 MCP 协议的概念、实现以及与 AI Agent 的集成方式。

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

## 3. MCP 服务器实现

### 3.1 Python FastMCP 实现

```python
# server/fastmcp_server.py
# 第 1 段：导入依赖并创建 MCP 服务实例（服务端的“总开关”）
# FastMCP 是高层封装：一个 Python 函数只要挂上 @mcp.tool/@mcp.resource/@mcp.prompt 装饰器，
# 就会被自动登记进协议能力表，并由函数签名 + 类型注解自动生成 JSON Schema。
# 易错点：server 名 "Demo Server" 会出现在握手信息里，客户端可据此区分多台服务。
from fastmcp import FastMCP

mcp = FastMCP("Demo Server")


# 第 2 段：注册“读取文件”工具（有副作用的 I/O 能力，按需调用）
# 工具是模型可主动调用的函数：参数名、类型、默认值、以及 docstring 都会进入工具的
# inputSchema/description 供 LLM 参考，所以 docstring 必须写清楚语义而非敷衍。
# 数据流：path + limit → 打开文件 → 读入 → 原样返回字符串给客户端。
@mcp.tool()
def read_file(path: str, limit: int = 1000) -> str:
    """读取文件内容

    Args:
        path: 文件路径
        limit: 最大读取字符数
    """
    # f.read(limit) 在文本模式下按“字符”截断（非字节），UTF-8 多字节字符不会被劈开成乱码；
    # 若文件短于 limit，则原样读完全部内容，不会补白也不会报错。
    # 边界：文件不存在/无权限时会抛异常，FastMCP 会把它转成协议层的错误响应返回客户端。
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read(limit)
    return content  # 上下文管理器确保句柄及时释放，返回值即工具的最终输出


# 第 3 段：注册“网络搜索”工具（此处用假数据演示返回结构）
# 返回值注解 list[dict] 会被用于推导 outputSchema，让客户端/模型知道结果形状。
# 注意这是教学桩代码：并未真正联网，仅按 limit 数量生成占位结果。
@mcp.tool()
def search_web(query: str, limit: int = 5) -> list[dict]:
    """搜索网络

    Args:
        query: 搜索关键词
        limit: 结果数量
    """
    # 列表推导按 range(limit) 生成结果：复杂度 O(limit)，limit=0 时返回空列表（合法但无内容）。
    # 真实实现里应在此处发起 HTTP 请求，并对 query 做转义与超时控制，避免注入与挂死。
    results = [
        {"title": f"Result {i}", "url": f"https://example.com/{i}"}
        for i in range(limit)
    ]
    return results


# 第 4 段：注册静态资源（由客户端主动读取的“数据端点”，模型不能随意改参数）
# resource 与 tool 的区别：资源是只读的 URI 寻址数据，适合暴露配置、日志、schema 等上下文。
@mcp.resource("file://config")
def get_config() -> str:
    """返回配置文件内容"""
    # URI 中无占位符，因此这是固定资源；若写成 "file://{path}" 则会变成带参数的模板资源。
    # 返回类型应保持简单可序列化（str/bytes），否则序列化阶段可能失败。
    return '{"setting": "value"}'


# 第 5 段：注册提示词模板（把常用指令封装成可复用、可带参数的 prompt）
# prompt 函数不执行实际工作，只负责“渲染文本”供用户/客户端插入对话；函数参数即模板变量。
@mcp.prompt()
def code_review(file_path: str) -> str:
    """生成代码审查提示"""
    # f-string 直接拼出多行 Markdown 提示；file_path 由调用方传入后再交由模型展开阅读。
    # 易错点：函数返回的文本被视为模板内容，不要把真正的审查逻辑塞进来（那应由 tool 承担）。
    return f"""请审查以下文件：
{file_path}

考虑：
1. 代码质量和风格
2. 潜在的 bug
3. 安全问题
4. 性能优化建议
"""


# 第 6 段：作为脚本直接启动时进入事件循环，开始对外提供 MCP 服务
# __name__ 守卫保证被 import（如测试或作为库引用）时不会意外启动服务。
# mcp.run() 默认使用 stdio 传输：通过标准输入/输出与宿主进程通信，适合本地编辑器/Agent 集成；
# 若要暴露为网络服务需显式指定 SSE/HTTP 等 transport。
if __name__ == "__main__":
    mcp.run()
```
### 3.2 TypeScript MCP SDK 实现

```typescript
// server/mcp-server.ts
import { MCPServer, Tool, Resource, Prompt } from '@modelcontextprotocol/sdk';

// 第 1 段：创建 MCP 服务实例
// name/version 会随 initialize 握手返回给客户端，是服务端身份标识，客户端据此做版本协商与展示。
const server = new MCPServer({
  name: 'demo-server',
  version: '1.0.0',
});

// 第 2 段：定义 read_file 工具（把本地文件暴露给模型）
// Tool 是"声明 + 执行"的合体：inputSchema 用 JSON Schema 描述入参，模型据此生成合法参数；
// handler 才真正执行副作用。两者必须一一对应，否则模型可能传错类型导致运行时崩溃。
// 易错点：path 未做路径越权校验，生产环境应限制在工作目录内，防止任意文件读取。
const readFileTool: Tool = {
  name: 'read_file',
  description: '读取文件内容', // 描述会被注入模型上下文，写得越清楚模型选对工具的概率越高
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径' },
      limit: { type: 'number', description: '最大字符数', default: 1000 }, // default 是给客户端的提示，非强制，handler 仍需兜底
    },
    required: ['path'], // 只有 path 必填，limit 缺省时走下面的 || 1000 兜底
  },
  handler: async (params) => {
    // 动态 import：延迟加载 fs/promises，避免模块顶层引入 I/O 依赖，也便于测试时打桩
    const fs = await import('fs/promises');
    const content = await fs.readFile(params.path, 'utf-8'); // 一次性全量读取，大文件会占用内存
    // 返回 MCP 约定的 contents 数组；slice 截断控制 token 消耗，但按字符切可能截断多字节字符
    return {
      contents: [{
        type: 'text',
        text: content.slice(0, params.limit || 1000),
      }],
    };
  },
};

// 第 3 段：定义 search_web 工具（对接外部搜索）
// 与上一个工具结构完全一致，体现了 MCP 工具的可扩展模式：新增能力=新增一个声明对象。
// performSearch 未在本文件定义，应来自外部导入；若缺失会在调用时才抛错，属于延迟失败。
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
    // JSON 字符串化后以 text 回传：MCP 只认文本/资源等类型，结构化数据需自行序列化
    // 缩进 2 空格是为了让模型（和调试者）更易读，代价是 token 略增
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  },
};

// 第 4 段：注册工具列表处理器
// tools/list 是客户端发现能力的入口，返回的数组即是"模型可见的工具清单"。
// 把定义与注册分离，便于后续按权限/环境动态过滤可用工具。
server.setRequestHandler('tools/list', async () => ({
  tools: [readFileTool, searchWebTool],
}));

// 第 5 段：注册工具调用处理器（MCP 的核心分发逻辑）
// 客户端按 name + arguments 发起 tools/call，这里做「查表 → 校验 → 执行」三步。
server.setRequestHandler('tools/call', async (request) => {
  // 注意：arguments 是保留字，用别名 args 解构；若客户端漏传则为 undefined
  const { name, arguments: args } = request.params;

  // 线性查找：工具少时够用，复杂度 O(n)；工具规模大时应换成 Map 索引降到 O(1)
  const tool = [readFileTool, searchWebTool].find(t => t.name === name);
  if (!tool) {
    // 未知工具必须显式报错：静默返回会让模型无法理解失败原因、无法自我纠正
    throw new Error(`Unknown tool: ${name}`);
  }

  // 直接透传原始入参给 handler；生产环境建议先按 inputSchema 做校验与默认值填充
  return await tool.handler(args);
});

// 第 6 段：定义资源（只读、可寻址的数据，与"动作型"工具互补）
// uri 是资源的唯一标识，客户端通过 resources/read 按 uri 拉取；mimeType 决定客户端如何渲染。
const configResource: Resource = {
  uri: 'config://app',
  name: 'Application Config',
  mimeType: 'application/json',
  async load() {
    // 这里返回写死的示例配置；真实场景通常从环境变量或配置文件读取，并注意脱敏
    return {
      contents: [{
        type: 'resource',
        mimeType: 'application/json',
        text: JSON.stringify({ setting: 'value' }),
      }],
    };
  },
};

// 资源列表处理器：与 tools/list 对称，供客户端枚举可读资源
server.setRequestHandler('resources/list', async () => ({
  resources: [configResource],
}));

// 第 7 段：启动服务器
// 到此才开始监听/建立传输通道（具体取决于 SDK 与传输方式，如 stdio 或 HTTP）。
// 启动前的所有 setRequestHandler 都必须在此时完成注册，否则首次请求会因无处理器而失败。
server.start();
```
### 3.3 NestJS MCP 集成

```typescript
// mcp.controller.ts

// 第 1 段：控制器声明与依赖注入（把 HTTP 请求转成对 MCPService 的调用）
// 控制器只负责"协议适配"：解析路由/参数、把结果交给 Nest 序列化为 JSON，
// 真正的工具注册与执行逻辑全部下沉到 MCPService，保证可测试性与单一职责。
@Controller('mcp')
export class MCPToolsController {
  // 通过构造函数注入单例 Service：Nest 容器保证同一进程内共享同一份工具注册表，
  // 因此工具状态（如后续的动态注册）在所有请求间是可见的。
  constructor(private readonly mcpService: MCPService) {}

  // 第 2 段：GET /mcp/tools —— 列出可用工具（MCP 协议的 "tools/list"）
  // 返回 { tools: Tool[] } 而非裸数组，是为了贴合 MCP JSON-RPC 的响应包封格式，
  // 便于客户端直接透传；async 返回 Promise 时 Nest 会自动 await 并序列化。
  @Get('tools')
  async listTools(): Promise<{ tools: Tool[] }> {
    return this.mcpService.listTools();
  }

  // 第 3 段：POST /mcp/tools/call —— 调用指定工具（MCP 的 "tools/call"）
  // 用 POST 而非 GET：body 里既有 name 又有 arguments，参数可能很大且含敏感信息，
  // 不应放进 URL（会进访问日志/浏览器历史）；arguments 用 Record<string, unknown>
  // 而非 any，保留类型检查的同时允许任意 JSON 结构，实际校验交给工具自己的 inputSchema。
  @Post('tools/call')
  async callTool(
    @Body() body: { name: string; arguments: Record<string, unknown> }
  ): Promise<{ contents: Content[] }> {
    return this.mcpService.callTool(body.name, body.arguments);
  }

  // 第 4 段：GET /mcp/resources —— 列出可读资源清单（MCP 的 "resources/list"）
  // 与 listTools 对称，资源是"可寻址的数据"（文件、网页、数据库行），
  // 工具是"可执行的动作"，协议上刻意拆成两组端点。
  @Get('resources')
  async listResources(): Promise<{ resources: Resource[] }> {
    return this.mcpService.listResources();
  }

  // 第 5 段：GET /mcp/resources/:uri —— 按 URI 读取单个资源（MCP 的 "resources/read"）
  // 注意：URI 常含 "/" 等字符，路径参数在真实部署中通常需要 encodeURIComponent
  // 或改为通配路由，否则路由匹配会截断；此处直接透传，具体解析由 Service 负责。
  @Get('resources/:uri')
  async readResource(@Param('uri') uri: string): Promise<{ contents: Content[] }> {
    return this.mcpService.readResource(uri);
  }
}

// mcp.service.ts

// 第 6 段：服务类声明与内部状态（注册表的持有者）
// 用 Map 而不是数组：callTool/readResource 都需要按 name/uri 做 O(1) 查找，
// 数组会是 O(n) 线性扫描；这里牺牲一点内存换取调用路径上的常数级查找，
// 同时也天然保证键的唯一性（同名注册会覆盖旧值）。
@Injectable()
export class MCPService {
  private tools: Map<string, Tool> = new Map();
  private resources: Map<string, Resource> = new Map();

  // 第 7 段：构造函数 —— 启动时完成内置工具注册
  // 注册是同步且极廉价的（仅往 Map 塞对象，handler 是惰性闭包，
  // 真正 import('fs/promises') 发生在调用瞬间），所以可以安全地放在构造函数里；
  // 若注册需要 IO（如读盘/远程发现），则应改成 OnModuleInit 的 async 生命周期钩子。
  constructor() {
    this.registerBuiltInTools();
  }

  // 第 8 段：内置工具注册（read_file）
  // 每个工具是一份"自描述契约"：name/description/inputSchema 供模型理解与生成参数，
  // handler 才是真正执行体。inputSchema 用 JSON Schema 描述入参，
  // required: ['path'] 是给 LLM 的强约束，但运行时仍需自行防御非法输入。
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
      // handler 内的动态 import 让 Node 的模块缓存只在首次调用时加载 fs/promises，
      // 避免服务启动即引入文件系统依赖；args 建议先用 schema 校验，
      // 此处直接透传意味着越权路径（如 ../../etc/passwd）需要在外层做白名单收敛。
      handler: async (args) => {
        const fs = await import('fs/promises');
        const content = await fs.readFile(args.path, 'utf-8');
        return { contents: [{ type: 'text', text: content }] };
      },
    });

    // 第 9 段：内置工具注册（web_search）
    // 与 read_file 的关键差异：limit 带 default: 5，默认值应由调用方/schema 层补全，
    // 这里直接依赖运行时的 search 实现处理 undefined；
    // 返回值用 JSON.stringify 包成 text —— MCP 的 contents 只承载文本/二进制块，
    // 结构化结果必须以序列化字符串形式传递，客户端再自行反序列化。
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

  // 第 10 段：列出全部工具
  // Array.from 把 Map.values() 的迭代器摊平成数组（Map 本身不可直接 JSON 序列化，
  // 序列化会得到空对象 {}，这是极常见的踩坑点）；返回前做浅拷贝语义，
  // 调用方增删数组不会影响内部注册表，但 Tool 对象本身仍是引用。
  async listTools(): Promise<{ tools: Tool[] }> {
    return { tools: Array.from(this.tools.values()) };
  }

  // 第 11 段：按名执行工具（查找 → 校验存在性 → 委托 handler）
  // 这里用 NotFoundException（HTTP 404）表达"工具不存在"，让控制器层无需 try/catch，
  // 异常由 Nest 的异常过滤器统一转成标准错误响应；
  // 注意返回的是 tool.handler(args) 的 Promise（未 await），由调用方链式等待，
  // handler 抛出的错误会原样向上冒泡，不会在此被吞掉。
  async callTool(name: string, args: Record<string, unknown>) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new NotFoundException(`Tool ${name} not found`);
    }
    return tool.handler(args);
  }

  // 第 12 段：列出全部资源
  // 与 listTools 同构；在真实实现里这里常需要过滤（如隐藏内部资源），
  // 因此不宜把 Map 直接暴露给外部，保持"每次构造新数组"的习惯便于后续加权限裁剪。
  async listResources(): Promise<{ resources: Resource[] }> {
    return { resources: Array.from(this.resources.values()) };
  }

  // 第 13 段：按 URI 读取资源
  // 与 callTool 的区别在于资源是惰性加载的：真正内容藏在 resource.load() 里，
  // 列表阶段只返回元数据，避免一次性把所有资源（大文件）读进内存；
  // 同样以 404 表达未注册的 URI，load() 内部的 IO 错误则按 500 语义冒泡。
  async readResource(uri: string) {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new NotFoundException(`Resource ${uri} not found`);
    }
    return resource.load();
  }
}
```
## 4. MCP 客户端实现

### 4.1 TypeScript 客户端

```typescript
// client/mcp-client.ts
// 第 1 段：依赖导入与模块定位
// 这是一个 MCP（Model Context Protocol）客户端最小实现：上层用 JSON-RPC 语义调用，
// 下层把请求通过子进程的 stdio 转发给 MCP 服务器，从而把"协议编解码"和"传输方式"解耦。
import { JSONRPCClient } from '@modelcontextprotocol/sdk';

// 第 2 段：客户端类与状态字段
// 用类封装连接生命周期与协议状态。capabilities 保存服务端在握手时声明的能力集，
// 它是后续决定"能不能调用 tools/resources/prompts"的权威依据，因此先给空对象占位。
class MCPClient {
  private client: JSONRPCClient; // SDK 提供的 JSON-RPC 通道，负责 id 匹配、请求/通知区分
  private capabilities: ServerCapabilities = {}; // 服务端能力快照，握手后才被填充

  // 第 3 段：构造函数——搭建"传输适配器"
  // JSONRPCClient 需要一个函数来真正把请求发出去。这里用闭包捕获 serverPath，
  // 使 SDK 只关心 JSON-RPC 消息本身，而具体走 stdio 还是 HTTP 由 sendRequest 决定。
  constructor(serverPath: string) {
    this.client = new JSONRPCClient(async (request) => {
      // 发送到服务器（stdio 或 HTTP）
      // 易错点：必须 return 响应，返回值会被 SDK 当作本次请求的 JSON-RPC result 回填给调用方。
      const response = await this.sendRequest(serverPath, request);
      return response;
    });
  }

  // 第 4 段：初始化握手（协议协商）
  // MCP 要求先 initialize 再发 initialized 通知：前者协商版本与双方能力，
  // 后者告诉服务端"我准备好了"，服务端收到后才会开始正常处理业务请求。
  async initialize(): Promise<void> {
    const response = await this.client.request('initialize', {
      protocolVersion: '2024-11-05', // 版本不匹配时服务端可拒绝，属于协议级兼容边界
      capabilities: {
        // 客户端声明自己支持的能力：roots 变化通知 + 采样（sampling）
        roots: { listChanged: true }, // listChanged 表示文件根目录变更时会主动通知服务端
        sampling: {}, // 空对象即可，表示"支持该能力"而非参数配置
      },
      clientInfo: {
        name: 'example-client',
        version: '1.0.0',
      },
    });

    // 关键数据流：服务端返回的 capabilities 决定本客户端后续可用的功能面
    this.capabilities = response.capabilities;

    // 发送初始化完成通知
    // 用 notify 而非 request：通知无 id、不需要也不应该有响应，避免死等。
    await this.client.notify('notifications/initialized', {});
  }

  // 第 5 段：Tools 相关方法（工具发现与调用）
  // 拆成 listTools / callTool 两个独立请求，是因为 MCP 把"元数据枚举"和"实际执行"分离：
  // 前者可缓存用于提示模型，后者才产生副作用。
  async listTools(): Promise<Tool[]> {
    const response = await this.client.request('tools/list', {});
    return response.tools; // 只透出数组，隐藏 JSON-RPC 信封细节
  }

  async callTool(name: string, args: Record<string, unknown>) {
    // 注意参数名是 arguments 而非 args，字段名错了服务端会校验失败；此处直接返回原始 result
    return this.client.request('tools/call', {
      name,
      arguments: args,
    });
  }

  // 第 6 段：Resources 相关方法（可读取的外部上下文）
  // Resource 用 URI 标识（如 file://、db://），列表只给描述和 uri，真正的字节由 read 拉取。
  async listResources(): Promise<Resource[]> {
    const response = await this.client.request('resources/list', {});
    return response.resources;
  }

  async readResource(uri: string) {
    // 只传 uri：读取范围完全由 uri 决定，客户端无权携带其它定位参数
    return this.client.request('resources/read', { uri });
  }

  // 第 7 段：Prompts 相关方法（服务端预置的提示模板）
  // Prompts 与 Tools 的区别：前者返回给用户/宿主填充对话内容，通常不产生远程副作用。
  async listPrompts(): Promise<Prompt[]> {
    const response = await this.client.request('prompts/list', {});
    return response.prompts;
  }

  async getPrompt(name: string, args?: Record<string, unknown>) {
    // args 允许缺省（模板可能无参数），此时序列化为 arguments: undefined，服务端应容忍缺省
    return this.client.request('prompts/get', { name, arguments: args });
  }

  // 第 8 段：底层 stdio 传输实现
  // 每次请求都临时 spawn 一个服务器进程：实现最简单，但代价是"一请求一进程"，
  // 无连接复用、无并发保护，真实场景应改为长驻进程 + 请求队列 + 帧边界解析。
  private async sendRequest(
    serverPath: string,
    request: any
  ): Promise<any> {
    // stdio 通信实现
    // 动态 import 让 child_process 只在真正需要传输时才被加载（便于在非 Node 环境替换实现）
    const { spawn } = await import('child_process');
    const child = spawn(serverPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });

    return new Promise((resolve, reject) => {
      // 累积缓冲区：TCP/管道是字节流，JSON 可能被拆成多个 data 事件到达
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        try {
          // 易错点：这里假设一次只处理一个完整 JSON 消息。若多帧粘包，JSON.parse 会失败，
          // 且已 resolve 的 Promise 不会被后续数据影响，导致后续响应被静默丢弃。
          const response = JSON.parse(stdout);
          resolve(response);
        } catch {
          // 等待更多数据
          // 解析失败通常只是"消息还没收全"，靠下一次 data 事件继续拼接即可
        }
      });

      child.stderr.on('data', (data) => {
        // 只收集不解析：stderr 是服务器日志，不属于协议消息，不能混入 stdout 的 JSON 流
        stderr += data.toString();
      });

      child.on('error', reject); // 进程启动失败（路径不存在/无执行权限）在此冒泡

      // 发送请求
      // 末尾补 '\n' 作为消息定界符，是 stdio 传输层的约定，服务端按行切分读取
      child.stdin.write(JSON.stringify(request) + '\n');
    });
  }
}

// 第 9 段：使用示例
// 演示典型生命周期：构造 → initialize（必须最先）→ 列工具 → 调用工具。
// 复杂度上均为一次网络/进程往返，真正的成本在于每次 spawn 的进程启动开销。
// 使用
async function main() {
  const client = new MCPClient('./mcp-server');
  await client.initialize(); // 缺少这一步，后续所有 request 都会被服务端拒绝或行为未定义

  const tools = await client.listTools();
  console.log('Available tools:', tools);

  const result = await client.callTool('read_file', { path: '/etc/hosts' });
  console.log('File content:', result);
}
```
### 4.2 Python 客户端

```python
# client/mcp_client.py
# 第 1 段：模块导入与用途说明（把 MCP 客户端所需的依赖集中引入）
# 该文件实现一个「走 stdio 传输」的 MCP（Model Context Protocol）客户端：
# 它把每个 JSON-RPC 请求序列化成一行文本喂给服务端进程，再从 stdout 读回应答。
# 只依赖标准库，避免引入网络/框架耦合，方便教学时把注意力放在协议本身。
import json
import subprocess
from typing import Any


# 第 2 段：客户端类与构造（保存服务端可执行路径，并预留能力集字段）
# capabilities 初始为空字典，因为真实的能力清单要等 initialize 握手后由服务端返回；
# 提前初始化可以让后续代码无需判空即可安全读取。
class MCPClient:
    def __init__(self, server_path: str):
        self.server_path = server_path
        self.capabilities = {}


    # 第 3 段：核心请求发送（一次调用 = 启动一个服务端进程，一问一答）
    # 关键设计：这里采用「每次请求都新起进程」的一次性模式，而不是长连接，
    # 因此没有会话状态跨请求保留，实现简单但开销较大（进程创建 + 冷启动）。
    # 数据流：request dict -> json 字符串 + 换行 -> 子进程 stdin -> stdout 文本 -> dict。
    # 易错点：MCP 的 stdio 传输以「行」为消息边界，所以结尾必须补 '\n'，
    # 否则服务端会一直等待消息终止符而阻塞；另外 json.loads(stdout) 假设
    # stdout 恰好是一整条 JSON，若服务端输出多行/空行会直接抛异常，这是简化实现的边界。
    def send_request(self, request: dict) -> dict:
        """通过 stdio 发送请求"""
        proc = subprocess.Popen(
            [self.server_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,  # text=True 让管道以字符串而非 bytes 收发，省去手动 decode
        )

        # communicate 会一次性写入输入并等待进程结束，同时读走全部 stdout/stderr，
        # 避免管道缓冲区写满导致的死锁；返回后子进程已退出，无需再显式 kill。
        stdout, stderr = proc.communicate(input=json.dumps(request) + '\n')

        # stderr 属于诊断信息，不属于协议内容，因此只打印不参与解析；
        # 保留它便于排查服务端崩溃或启动失败的原因。
        if stderr:
            print(f"Server stderr: {stderr}")

        # 把服务端应答反序列化为 dict 交给上层；注意此处未做结果校验与错误码处理。
        return json.loads(stdout)


    # 第 4 段：初始化握手（先声明协议版本与自身能力，再收取服务端能力）
    # JSON-RPC 要求请求带唯一 id 以匹配响应，这里用固定字面量 1/2/3/4 区分调用；
    # 生产中若并发复用连接需改用自增或随机 id，否则响应无法正确关联。
    # protocolVersion 是协商基准，版本不匹配时服务端可能拒绝或降级，属于必须显式声明的字段。
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

        # 服务端在 result.capabilities 里声明它支持哪些特性（tools/resources 等），
        # 用 get 兜底避免字段缺失时抛 KeyError。
        self.capabilities = response.get('capabilities', {})

        # 发送初始化完成
        # 这条是「通知」（notification）：没有 id，服务端不回应答，
        # 但协议规定必须补发，服务端才会正式进入可服务状态。
        self.send_request({
            'jsonrpc': '2.0',
            'method': 'notifications/initialized',
            'params': {},
        })


    # 第 5 段：列出可用工具（从嵌套响应中逐层取字段）
    # 响应结构为 result.tools，链式 get 使得任何一层缺失都退化为空列表，
    # 从而把「服务端不支持 tools」和「返回空数组」统一处理为「没有工具」。
    async def list_tools(self) -> list[dict]:
        response = self.send_request({
            'jsonrpc': '2.0',
            'id': 2,
            'method': 'tools/list',
            'params': {},
        })
        return response.get('result', {}).get('tools', [])


    # 第 6 段：调用指定工具（把工具名与参数透传给服务端）
    # tools/call 是整个客户端最核心的动作：name 必须是 list_tools 返回过的名字，
    # arguments 需符合该工具声明的输入 schema，否则由服务端返回错误。
    # 这里只取 result，直接丢弃可能的 error 字段，属于教学版简化。
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


    # 第 7 段：列出可用资源（与工具并列的另一类能力）
    # resources 代表可读取的数据源（文件、数据库条目等），与 tools 的执行语义不同；
    # 同样用链式 get 兜底，保证数据结构异常时返回空列表而非中断调用方。
    async def list_resources(self) -> list[dict]:
        response = self.send_request({
            'jsonrpc': '2.0',
            'id': 4,
            'method': 'resources/list',
            'params': {},
        })
        return response.get('result', {}).get('resources', [])
```
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
// 第 1 段：注册 MCP 的 prompts/get 处理器（服务端对外暴露"取提示词"能力）
// setRequestHandler 把「方法名 → 异步处理函数」绑定到 server 上；每个请求独立执行，
// 因此这里的 async 函数必须自行完成 IO 并 return 符合协议结构的结果（不能只 side-effect）。
server.setRequestHandler('prompts/get', async (request) => {
  // 第 2 段：解构请求参数（name 决定走哪条提示词分支，args 是调用方传来的填充变量）
  // 易错点：协议字段就叫 arguments，而它是 JS 函数内部的保留标识符，
  // 这里用 `arguments: args` 重命名，避免遮蔽函数自带的 arguments 对象。
  const { name, arguments: args } = request.params;

  // 第 3 段：命中 code_review 模板，按参数读取目标文件
  // 数据流：file_path 来自客户端 → readFile 落盘读取 → content 作为待审查源码。
  // readFile 是异步 IO，用 await 让事件循环去处理其他请求，避免阻塞。
  if (name === 'code_review') {
    const { file_path } = args;
    const content = await readFile(file_path);

    // 第 4 段：组装返回体——MCP 规定 messages 是「角色 + 内容」数组
    // 把源码内联进 user 消息，让模型在同一轮里既拿到审查要求也拿到待审代码；
    // 三反引号包裹 + 语言兜底（args.language 缺省时用「代码」）保证提示词可读。
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

  // 第 5 段：兜底分支——未知提示词名必须显式抛错
  // 边界条件：不抛错而返回 undefined 会让客户端拿到非法结构，协议层难以定位问题，
  // 抛出带 name 的 Error 能直接把「名字写错」这条线索交还给调用方。
  throw new Error(`Unknown prompt: ${name}`);
});

// 第 6 段：客户端调用示例（发起一次 prompts/get）
// name 必须与服务端注册的分支字符串完全一致，否则会命中第 5 段抛错；
// getPrompt 解包后的 prompt 即服务端返回对象，messages 里就是最终喂给模型的对话。
const prompt = await client.getPrompt('code_review', { file_path: '/src/main.ts' });
console.log(prompt.messages);
```
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
// 第 1 段：审计条目数据结构（定义一条审计日志的字段契约）
// 设计意图：把"谁、在什么时间、用什么参数、调了哪个工具、结果如何"压成一个可 JSON 序列化的扁平对象，
// 便于后续落盘、检索与按 sessionId 回放整条操作链路。所有可选字段都是为了让同一结构能同时承载成功与失败两种记录。
// 审计日志
interface AuditEntry {
  timestamp: string; // 由 AuditLogger 统一盖章（ISO 8601），调用方无权传入，见下方 Omit
  tool: string; // 工具名，检索/聚合的主键之一
  args: Record<string, unknown>; // 用 unknown 而非 any，强制消费方先做类型收窄，避免 any 在日志链路里扩散
  result?: any; // 成功记录才有；此处刻意放宽为 any，因为工具的返回形态不受本模块控制，代价是丢失类型检查
  error?: string; // 只存 message 字符串而非 Error 对象：Error 的 message/stack 不可枚举，直接 JSON 序列化会变成 {}
  user?: string; // 可选：非鉴权场景或匿名调用时缺省
  sessionId?: string; // 可选：用于把同一会话内的多次工具调用串成一条时间线
}

// 第 2 段：审计写入器（内存缓冲 + 批量落盘）
// 为什么这样写：审计属于旁路能力，若每次调用都同步写磁盘，会把 I/O 延迟叠加到工具调用的关键路径上。
// 因此先在内存里攒（O(1) 入队），再由 flush 批量落盘（O(n) 序列化 + 一次 I/O），用一次写放大换吞吐。
class AuditLogger {
  private entries: AuditEntry[] = []; // 缓冲区；私有保证外部只能通过 log/flush 两条通路改动它

  // Omit<AuditEntry, 'timestamp'> 把 timestamp 从入参类型里剔除：调用方既不能漏填，也不能伪造时间
  log(entry: Omit<AuditEntry, 'timestamp'>) {
    this.entries.push({
      ...entry, // 展开必须在前
      timestamp: new Date().toISOString(), // 时间戳必须在后：即使调用方绕过类型检查塞了 timestamp，也会被这里覆盖。顺序在此是关键
    });
  }

  // 易错点/边界：下面这种"先 persist 再清空同一个数组"的写法存在竞态 ——
  // await 让出执行权期间如果又有 log() 入队，新条目会被追加进同一个 entries，随后被 this.entries = [] 一并清掉而从未落盘。
  // 生产实现通常先做快照再清空：const batch = this.entries; this.entries = []; await this.persist(batch);
  async flush() {
    // 写入持久化存储
    await this.persist(this.entries);
    this.entries = []; // 用重新赋值而非 length = 0：切断与正在被 persist 持有的数组引用，避免后续写入污染同一实例
  }
}

// 第 3 段：模块级单例
// 关键数据流：整个进程只共用这一份缓冲区，保证所有工具调用的审计记录写进同一个数组，
// 否则 flush 只能清掉自己那部分，日志会碎片化且难以按 session 聚合。
const auditLogger = new AuditLogger();

// 第 4 段：注册工具调用处理器（审计旁路：只记录，不改变主流程语义）
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params; // arguments 是语言保留字，必须重命名为 args 才能解构

  try {
    const result = await executeTool(name, args); // 先执行、后记账：只有真正拿到结果才写成功记录
    auditLogger.log({ tool: name, args, result }); // 若反过来先记账再执行，执行失败就会留下一条"假成功"记录
    return result; // 原样透传返回值，不额外包装——审计不应该改变调用方看到的协议形态
  } catch (error) {
    // 失败路径同样留痕：保留 args 便于复现问题现场，只记 error.message 以控制日志体积
    // 易错点：catch 变量的类型取决于 tsconfig 的 useUnknownInCatchVariables；开启时为 unknown，
    // 严格写法应为 error instanceof Error ? error.message : String(error)，否则可能访问 undefined。
    auditLogger.log({ tool: name, args, error: error.message });
    throw error; // 必须重新抛出：吞掉异常会让上游误判调用成功（拿到 undefined），破坏原有错误语义
  }
});
```
## 9. MCP 集成示例

### 9.1 Claude Code 中的 MCP 使用

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

### 9.2 配置后可用工具

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

## 10. 参考资源

- [MCP 官方文档](https://modelcontextprotocol.io)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Servers 仓库](https://github.com/modelcontextprotocol/servers)

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MCP 规范](https://modelcontextprotocol.io/specification) | 协议权威文本，transport 与 lifecycle 是服务器合规的底线。 | 写服务器前通读这两章，列出初始化握手与消息格式清单，对照自己的实现逐项核对。 |
| [MCP 规范（最新版本）](https://modelcontextprotocol.io/specification/latest) | 协议有版本演进，避免按过期特性开发或与客户端不兼容。 | 查看变更日志，确认所用 SDK 支持的协议版本，把版本号写进项目配置与 README。 |
| [MCP 架构概念](https://modelcontextprotocol.io/docs/learn/architecture) | 用一页把 tools、resources、prompts 三类能力讲清楚，决定集成方案。 | 读完为自己场景各列一个例子，判断哪些能力该由服务器暴露、哪些交给客户端。 |
| [MCP Tools 概念](https://modelcontextprotocol.io/docs/concepts/tools) | 工具定义质量直接决定模型能否正确调用，概念页给出描述与 schema 要点。 | 边读边为一个真实 API 写 tool schema，补全描述与输入校验后交给模型试调用。 |
| [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp) | 官方客户端接入示例，看真实产品如何消费 MCP 服务器。 | 接入 filesystem 或 GitHub 服务器，让它完成一次读写任务，观察授权与工具暴露过程。 |
| [MCP 入门介绍](https://modelcontextprotocol.io/docs/getting-started/intro) | 入门介绍最省时，先建立 host–client–server 的整体心智模型。 | 读完立刻手绘 host、client、server 关系图，标注消息流向再进入架构与代码章节。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | 官方 TypeScript SDK，README 即最小可跑服务器，最贴近本页实现章节。 | 按 README 用 stdio 搭一个服务器，注册一个工具，接入本地客户端跑通后再读源码。 |
| [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) | Python 侧最常用的 SDK，FastMCP 装饰器写法极简，适合讲工具注册。 | 用 FastMCP 写一个数据库查询工具，对比 TS 版本理解跨语言实现的共性。 |
| [MCP Inspector](https://github.com/modelcontextprotocol/inspector) | 调试利器，能直接看到工具调用的原始请求与响应消息。 | 连上自己的服务器逐个调用工具，检查返回结构与错误处理，再把问题回填到代码。 |
| [MCP 官方服务器集合](https://github.com/modelcontextprotocol/servers) | 官方服务器集合是最佳实践范本，源码可直接对照学习。 | 精读 filesystem 服务器源码，关注资源与工具如何划分，然后仿写一个自己的服务器。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Hugging Face MCP Course](https://huggingface.co/learn/mcp-course) | 体系化课程，从零实现一个服务器与客户端，覆盖完整开发闭环。 | 按单元跟做，实现一个服务器加一个客户端并互通，遇到不懂处回查规范对应章节。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|:--|:--|:--|:--|
| 后台管理的万行订单表，运营问"上周退款单多少" | 工具定义与注册、资源管理 | Python SDK + 只读数据库账号 | 分页上限写在服务端，不靠模型自觉 |
| 多人协作白板的图元增量同步 | 资源管理（订阅与变更通知） | 可长连的 HTTP 传输 | 通知里只放 uri，正文按需读 |
| CI 失败流水线的日志排障 | 工具定义与注册、提示模板、安全考虑 | 本机 stdio 服务器 + 只挂日志目录 | 工具不给 shell，凭据只读 |
| 本地代码仓库检索助手 | MCP 服务器实现、MCP 客户端实现 | stdio 传输，进程由 IDE 拉起 | 大文件按行区间返回，别整文件塞上下文 |
| 内部知识库问答 | 提示模板、资源管理 | 文档暴露为资源，提示模板固定引用格式 | 引用带文档 id 与版本，便于回溯 |
| 财务月度对账数据导出 | 资源管理（MIME 类型与分页） | 服务器生成 CSV 资源，客户端落盘 | 导出走异步任务，别在工具调用里等 |
| 桌面 IDE 里的数据库变更评审 | 安全考虑、MCP 客户端实现 | 写操作工具 + 客户端确认 | 破坏性语句二次确认并留审计日志 |
| 多租户 SaaS 的租户隔离问答 | 协议架构（会话与能力协商）、安全考虑 | 每会话绑定租户凭据 | 租户 id 只能来自会话，不能来自工具参数 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格，做成只读分页查询

**业务背景**：运营要回答"上周退款单多少"，得先学会组合筛选器，翻页几十次才敢下结论。在测试库造 1 万、10 万、100 万行三档订单表，就能复现这个问题。

**怎么用本页知识解决**：思路是只暴露"按状态分页查订单"这一个工具，把表结构做成资源，全程只读。

```python
from mcp.server.fastmcp import FastMCP          # 引入官方 Python SDK 的 FastMCP

mcp = FastMCP("orders-readonly")                # 服务器名写明只读用途

@mcp.tool()
def query_orders(status: str, page: int = 1, page_size: int = 50) -> dict:
    """按状态分页查订单，page_size 上限 50。"""
    if page_size > 50:                          # 超限直接拒绝，挡住全表拉取
        raise ValueError("page_size 不能超过 50")
    rows, total = db.query(status, page, page_size)  # SQL 在服务端拼，不由模型拼
    return {"total": total, "rows": rows}       # 返回结构化数据，不做自然语言改写

@mcp.resource("orders://schema")
def schema() -> str:
    return open("schema.sql").read()            # 表结构做成资源，客户端按需读取

if __name__ == "__main__":
    mcp.run()                                   # stdio 传输，进程由客户端拉起
```

- 工具粒度按业务动作切，不按数据表切，"按状态查订单"就是一个完整动作。
- 分页上限、排序字段白名单都在服务端定，客户端传什么都不越界。
- 表结构这种静态信息走资源，走一次就不再进上下文，省 token。
- 返回结构化字段而不是拼好的句子，客户端换展示形式不用改服务器。
- 凭据用只读账号，服务器进程没有写权限，出错也改不了数据。

**怎么度量收益**：看三个指标，单次问答的工具调用次数、每次调用的返回行数、`tools/call` 的 P95 耗时。测量方法：服务端日志按 session id 聚合计数，数据库侧用 `EXPLAIN` 确认走了索引，客户端用 OpenTelemetry 的 span 记录每次调用耗时。

**什么时候不该用**：
- 目标是导出全表做离线分析，直接走数据库导出任务，别把 Agent 当 ETL。
- 查询字段含手机号、身份证等敏感列，且没有字段级脱敏，先脱敏再接。
- 需求本来就是一张固定报表，直接做报表页面，多一层协议只增加排查面。

#### 场景 2：多人协作白板的资源订阅与增量同步

**业务背景**：多人在同一块白板画图时，客户端各自轮询服务端，一次拖拽就触发整块画布重传。用 3 人同时拖动同一组图元、每秒 20 次变更事件，就能复现带宽被拉满的情况。

**怎么用本页知识解决**：思路是把白板状态做成资源，客户端订阅它，服务端改完只发变更通知，客户端收到通知再回来读。

```python
# 客户端连接时声明订阅能力，服务端据此记录这条会话
caps = {"resources": {"subscribe": True}}
session = await mcp_connect(url, capabilities=caps)

# 订阅房间 42 的白板状态
await session.request("resources/subscribe", {"uri": "board://room-42"})

# 图元变更后只递增版本号，通知里不带画布正文
board.version += 1
await session.notify("notifications/resources/updated",
                     {"uri": "board://room-42"})

# 客户端收到通知才去读资源，按版本号决定是否应用
snap = await session.request("resources/read", {"uri": "board://room-42"})
if snap["version"] > local.version:
    local.apply(snap["delta"])

# 会话断开时取消订阅，服务端不留失效订阅
await session.request("resources/unsubscribe", {"uri": "board://room-42"})
```

- 上面写的是协议层方法名，各语言 SDK 的封装函数名不同，按所用 SDK 版本核对。
- 订阅代替轮询，空闲会话不再产生请求。
- 通知只带 uri，正文由客户端主动读，服务端不必为每个会话准备推送负载。
- 版本号比较让重复通知变成空操作，弱网重发不会重复应用。
- 取消订阅要跟会话生命周期绑定，否则服务端订阅表会堆积失效项。

**怎么度量收益**：看每会话消息数、从发出通知到本地渲染完成的延迟、版本号落后于服务端的会话占比。测量方法：浏览器开发者工具的 Network 面板导出 WebSocket 帧计数，服务端接入层按 session id 打点，客户端在通知回调和渲染完成处各调一次 `performance.now()`。

**什么时候不该用**：
- 变更细到每次指针移动，走专门的二进制同步通道，别把每个点都塞进资源通知。
- 边缘节点不保存会话状态，维护不了订阅表，改用版本号轮询。
- 白板只有单人使用，本地状态就够，订阅机制没有收益。

#### 场景 3：CI 失败流水线的日志排障助手

**业务背景**：流水线失败后，开发要在几百行日志里找根因，还要分辨是编译、测试还是环境问题。本地跑一个失败用例，把完整日志打开，就能复现这个翻日志的过程。

**怎么用本页知识解决**：思路是先缩小范围再取细节，工具只做"列失败步骤"和"按关键字抓日志"，依赖清单走资源，提示模板固定排障顺序。

```python
from mcp.server.fastmcp import FastMCP       # 官方 Python SDK 的 FastMCP
mcp = FastMCP("ci-triage")                   # 只读排障服务器

@mcp.tool()
def list_failed_steps(run_id: str) -> list:
    return ci.failed_steps(run_id)           # 只返回步骤名与退出码，不返回日志

@mcp.tool()
def grep_log(run_id: str, step: str, pattern: str, limit: int = 200) -> list:
    lines = ci.log_lines(run_id, step, pattern)
    return lines[:limit]                     # 截断，避免灌满上下文窗口

@mcp.resource("ci://runs/{run_id}/lockfile")
def lockfile(run_id: str) -> str:
    return ci.read_artifact(run_id, "lockfile")   # 依赖清单按资源暴露

@mcp.prompt()
def triage(run_id: str) -> str:
    return "先列失败步骤，再按关键字 grep，最后对照 lockfile"   # 固定排障顺序
```

- 两个工具的返回量都被限制，"列步骤"给名字，"抓日志"给行数和 limit。
- 依赖清单属于静态材料，放资源，需要时读一次。
- 提示模板把排障顺序写死，模型不会一上来就拉全量日志。
- 服务器进程只挂日志目录、只持只读令牌，排障助手改不了流水线。
- 需要核对：`@mcp.prompt()` 的返回类型在你用的 SDK 版本里是否支持纯字符串。

**怎么度量收益**：看从流水线失败到定位到具体步骤的时长、平均对话轮数、权限中间件拦截的调用次数。测量方法：CI 系统里取失败时间戳与修复提交时间戳求差，服务端日志统计每会话的 `tools/call` 次数，权限中间件对拒绝请求单独计数。

**什么时候不该用**：
- 日志里混有密钥或令牌且没有脱敏环节，先建脱敏管道再接。
- 需要模型直接重跑流水线或改配置，写操作保留人工确认，别让模型直连 CI 写接口。
- 失败原因不在日志里（例如集群容量、上游依赖限流），先接入监控指标再谈。

### 行业先进实践

工具输入用 JSON Schema 描述并设边界（出处：MCP 官方文档 Specification 的 Tools 章节）
规范规定工具的 `inputSchema` 用 JSON Schema 描述，客户端在调用前就能校验参数。校验点落在模型输出与真实调用之间，非法参数到不了业务代码。可以借鉴的做法是给每个参数写明类型、取值范围、枚举值，服务端收到后再校验一次。

参考服务器按单一职责拆分（出处：开源项目 modelcontextprotocol/servers）
该项目把文件系统、Git、抓取等能力拆成各自独立的服务器，每个只暴露一类工具。这样权限边界和进程边界重合，读文件的服务器不需要网络权限，出问题时影响范围可控。可以借鉴的做法是按数据源拆服务器，不按业务页面拆。

工具调用前向用户确认（出处：Claude Desktop 官方文档中关于连接 MCP 服务器的说明）
客户端在调用工具前给出权限提示，用户可以选择本次允许或拒绝。控制权留在使用者手里，不可逆操作不会因为一次误触发而执行。可以借鉴的做法是把写操作、外发网络请求、跨目录读取标成需确认，读操作默认放行；提示的触发范围和配置项名称需核对官方文档。

传输方式按部署位置选（出处：MCP 官方文档 Specification 的 Transports 章节）
规范定义了 stdio 与基于 HTTP 的传输。stdio 的服务器进程由客户端在同一台机器上拉起，适合本机能力；团队共用的服务器走 HTTP 传输，多个客户端能连同一个端点。可以借鉴的做法是本机工具用 stdio，共享工具用 HTTP，不要用 stdio 做跨机器共享。

授权走 OAuth 流程（出处：需核对官方文档：核对 Specification 中 Authorization 章节采用的 OAuth 版本、资源服务器角色与资源指示符字段名）
远程服务器要代表用户访问第三方资源，凭据不能放在工具参数里随对话流传。核对清楚后再落到设计中，不要照抄旧版示例里的鉴权写法。

### 从学到用：落地路线

第 1 步试点：选一个只读、出错不影响生产的场景，在开发机上用 stdio 起服务器，由单个客户端接入。验收标准是团队照文档能在 15 分钟内跑通 `tools/list` 并成功调用一次工具。

第 2 步验证：用固定任务集在接入前后各跑一遍，记录完成时间、工具调用次数、失败原因分布。验收标准是任务集里每条任务都有前后对照记录，每个失败都能归到具体工具或参数。

第 3 步推广：把工具定义模板、凭据申请流程、审计日志字段固定成清单，新场景按清单提交评审。验收标准是新服务器的 schema、权限声明、日志字段三项能对着清单逐条勾选。

第 4 步防回退：在 CI 里跑协议层契约测试，工具 schema 变更必须评审，同时保留一键关闭入口。验收标准是改坏 schema 的提交会被 CI 拦住，关闭开关的演练能在一分钟内生效。

### 动手作业

目标：为本地代码仓库写一个只读 MCP 服务器，提供"列目录""按行读文件""关键字检索"三个工具，再暴露一个仓库概览资源。

步骤：
1. 定边界：只读、限制在仓库根目录内、禁止符号链接跳出目录。
2. 为三个工具写输入 schema，标明类型、取值范围、默认值。
3. 实现列目录与按行读文件，行区间上限设为 200 行。
4. 实现关键字检索，返回文件名加行号，限制命中条数。
5. 把文件清单与 README 前若干行暴露成一个资源。
6. 写一个提示模板，规定先列目录、再检索、最后读行。
7. 用真实客户端接入，记录每次调用的耗时与返回字节数。

验收标准：
- 传入 `../../etc/passwd` 形式的路径时，服务器拒绝并返回可读的错误说明。
- 请求超过 200 行的区间时，返回被截断的结果并标明上限。
- 三个工具的 schema 都能被客户端解析，缺少必填参数时报错信息能指出是哪个参数。
- 服务器日志能看到每次调用的工具名、参数摘要、耗时。
- 关掉服务器进程后，客户端能识别连接断开并给出提示。

