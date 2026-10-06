---
title: MCP 服务器生态与开发
description: MCP 服务器生态概览、官方与第三方服务器、安装配置与自定义服务器开发。
tags:
  - ai-agent
  - mcp
date: 2026-05-17
---

# MCP 服务器生态与开发

> 本文是「MCP 服务器」系列第 1 篇（共 2 篇）。下一篇：[MCP 安全与配置示例](mcp-security-config.md)

> 本文档全面介绍 MCP (Model Context Protocol) 服务器生态系统、官方与第三方服务器、配置方法以及自定义服务器开发指南。

## 1. MCP 服务器生态系统概述

### 1.1 生态系统架构

```mermaid
flowchart TB
    subgraph Client["MCP Client"]
        Claude["Claude Code"]
        App["Application"]
    end
    
    subgraph Protocol["MCP Protocol"]
        JSONRPC["JSON-RPC 2.0"]
        Transport["Transport Layer"]
    end
    
    subgraph Servers["MCP Servers"]
        Official["Official Servers"]
        Community["Community Servers"]
        Custom["Custom Servers"]
    end
    
    subgraph Resources["External Resources"]
        API["APIs"]
        DB["Databases"]
        Files["File System"]
    end
    
    Client --> Transport
    Transport --> Protocol
    Protocol --> Servers
    Servers --> Resources
```

### 1.2 服务器分类

| Category | Description | Examples |
|----------|-------------|----------|
| **Official** | Anthropic 官方维护，覆盖核心场景 | filesystem, github, brave-search |
| **Community** | 开源社区贡献，丰富生态 | slack, postgres, gitlab |
| **Enterprise** | 企业级服务，内部系统 | database, api-gateway, internal-tools |
| **Custom** | 自定义开发，特定业务需求 | domain-specific tools |

### 1.3 传输模式

MCP 服务器支持两种通信方式：

| Mode | Description | Use Case |
|------|-------------|-----------|
| **stdio** | 标准输入输出通信，进程间通信 | 本地服务器、子进程 |
| **HTTP + SSE** | HTTP 长连接 + Server-Sent Events | 远程服务、Web 集成 |

```bash
# stdio 模式示例
npx -y @modelcontextprotocol/server-filesystem /workspace

# HTTP 模式示例（需要服务器支持）
curl -X POST http://localhost:8080/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"initialize",...}'
```

### 1.4 协议版本矩阵

| Protocol Version | Status | Key Features |
|------------------|--------|--------------|
| `2024-11-05` | Current | 完整功能集 |
| `2024-10-07` | Legacy | 基础功能 |
| `2024-09-03` | Deprecated | 早期实现 |

## 2. 官方 MCP 服务器

### 2.1 核心服务器列表

| Server | Package | Description |
|--------|---------|-------------|
| **Filesystem** | `@modelcontextprotocol/server-filesystem` | 本地文件系统访问 |
| **GitHub** | `@modelcontextprotocol/server-github` | GitHub API 集成 |
| **Brave Search** | `@modelcontextprotocol/server-brave-search` | Web 搜索功能 |
| **Git** | `@modelcontextprotocol/server-git` | Git 操作接口 |
| **AWS KB Retrieval** | `@modelcontextprotocol/server-aws-kb-retrieval-server` | AWS 知识库检索 |

### 2.2 文件系统服务器

文件系统服务器提供安全的本地文件访问能力。

**安装与配置：**

```bash
# 安装
npm install -g @modelcontextprotocol/server-filesystem

# 运行
npx -y @modelcontextprotocol/server-filesystem /path/to/allowed/directory
```

**可用工具：**

| Tool | Description | Parameters |
|------|-------------|------------|
| `read_file` | 读取文件内容 | `path`: 文件路径 |
| `read_directory` | 列出目录内容 | `path`: 目录路径 |
| `write_file` | 写入文件内容 | `path`: 文件路径, `content`: 内容 |
| `create_directory` | 创建目录 | `path`: 目录路径 |
| `move_file` | 移动/重命名文件 | `source`: 源路径, `destination`: 目标路径 |
| `delete_file` | 删除文件/目录 | `path`: 路径 |

**配置示例：**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ALLOWED_DIRECTORIES": "/workspace:/tmp/readonly"
      }
    }
  }
}
```

**安全限制：**
- `ALLOWED_DIRECTORIES`: 逗号分隔的白名单目录列表
- 默认禁止所有目录访问
- 不支持符号链接遍历

### 2.3 GitHub 服务器

GitHub 服务器提供完整的 GitHub API 集成。

**安装与配置：**

```bash
npm install -g @modelcontextprotocol/server-github
```

**环境变量：**

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub 个人访问令牌 | Yes |
| `GITHUB_REPOSITORY` | 默认仓库（格式：owner/repo） | No |

**可用工具：**

| Tool | Description |
|------|-------------|
| `list_repositories` | 列出用户/组织的仓库 |
| `get_repository` | 获取仓库详情 |
| `search_repositories` | 搜索仓库 |
| `create_issue` | 创建 Issue |
| `list_issues` | 列出 Issue |
| `get_issue` | 获取 Issue 详情 |
| `create_pull_request` | 创建 PR |
| `list_pull_requests` | 列出 PR |
| `get_pull_request` | 获取 PR 详情 |
| `create_comment` | 添加评论 |
| `list_commits` | 列出提交记录 |
| `get_file_contents` | 获取文件内容 |
| `push_file` | 创建/更新文件 |

**配置示例：**

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**权限要求：**
- `repo`: 完全控制私有仓库
- `read:user`: 读取用户信息
- `write:discussion`: 管理讨论（可选）

### 2.4 Brave Search 服务器

Brave Search 服务器提供 Web 搜索功能。

**安装与配置：**

```bash
npm install -g @modelcontextprotocol/server-brave-search
```

**环境变量：**

| Variable | Description | Required |
|----------|-------------|----------|
| `BRAVE_API_KEY` | Brave Search API 密钥 | Yes |

**可用工具：**

| Tool | Description | Parameters |
|------|-------------|------------|
| `brave_web_search` | Web 搜索 | `query`: 搜索词, `count`: 结果数量（默认 10） |
| `brave_local_search` | 本地搜索（新闻、图片等） | `query`: 搜索词, `count`: 结果数量 |

**配置示例：**

```json
{
  "mcpServers": {
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

**API 申请：**
1. 访问 [Brave Search API](https://api.search.brave.com/)
2. 注册账户并申请 API 密钥
3. 免费套餐：每月 2000 次请求

### 2.5 Git 服务器

Git 服务器提供 Git 操作接口。

**安装与配置：**

```bash
npm install -g @modelcontextprotocol/server-git
```

**可用工具：**

| Tool | Description |
|------|-------------|
| `git_log` | 获取提交历史 |
| `git_diff` | 获取变更内容 |
| `git_show` | 查看特定提交 |
| `git_status` | 获取仓库状态 |
| `git_branch_list` | 列出分支 |
| `git_checkout` | 切换分支 |
| `git_commit` | 创建提交 |
| `git_push` | 推送到远程 |
| `git_pull` | 从远程拉取 |
| `git_clone` | 克隆仓库 |

**配置示例：**

```json
{
  "mcpServers": {
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"]
    }
  }
}
```

## 3. 第三方 MCP 服务器

### 3.1 热门社区服务器

| Server | Package | Description |
|--------|---------|-------------|
| **Slack** | `@modelcontextprotocol/server-slack` | Slack 消息和频道操作 |
| **PostgreSQL** | `@modelcontextprotocol/server-postgres` | 数据库查询 |
| **Google Maps** | `@modelcontextprotocol/server-google-maps` | 地图和位置服务 |
| **Sentry** | `@modelcontextprotocol/server-sentry` | 错误追踪集成 |
| **Fetch** | `@modelcontextprotocol/server-fetch` | HTTP 请求工具 |

### 3.2 Slack 服务器

Slack 服务器用于消息和频道管理。

**安装：**

```bash
npm install -g @modelcontextprotocol/server-slack
```

**环境变量：**

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Slack Bot 用户令牌 |
| `SLACK_TEAM_ID` | Slack Team ID |

**可用工具：**

| Tool | Description |
|------|-------------|
| `send_message` | 发送频道消息 |
| `list_channels` | 列出所有频道 |
| `search_messages` | 搜索消息 |
| `get_channel_history` | 获取频道历史 |
| `create_channel` | 创建频道 |
| `archive_channel` | 归档频道 |

**配置示例：**

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
        "SLACK_TEAM_ID": "T12345678"
      }
    }
  }
}
```

### 3.3 PostgreSQL 服务器

PostgreSQL 服务器提供数据库查询能力。

**安装：**

```bash
npm install -g @modelcontextprotocol/server-postgres
```

**环境变量：**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | 数据库连接 URL |
| `MAX_ROWS` | 最大返回行数（默认 100） |

**可用工具：**

| Tool | Description | Parameters |
|------|-------------|------------|
| `query` | 执行 SQL 查询 | `sql`: SQL 语句 |
| `list_tables` | 列出所有表 | - |
| `describe_table` | 获取表结构 | `table`: 表名 |
| `list_databases` | 列出所有数据库 | - |

**配置示例：**

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/mydb",
        "MAX_ROWS": "1000"
      }
    }
  }
}
```

### 3.4 Fetch 服务器

Fetch 服务器提供通用 HTTP 请求能力。

**安装：**

```bash
npm install -g @modelcontextprotocol/server-fetch
```

**可用工具：**

| Tool | Description | Parameters |
|------|-------------|------------|
| `fetch` | 发送 HTTP 请求 | `url`: URL, `method`: 方法, `headers`: 请求头, `body`: 请求体 |
| `fetch_json` | 获取 JSON 数据 | `url`: URL, `headers`: 请求头 |
| `fetch_html` | 获取 HTML 内容 | `url`: URL |

**配置示例：**

```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    }
  }
}
```

### 3.5 MCP 服务器画廊

更多第三方服务器可在以下位置查找：

- **GitHub**: [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- **npm**: [搜索 @modelcontextprotocol](https://www.npmjs.com/search?q=%40modelcontextprotocol)
- **awesome-mcp-servers**: [社区维护列表](https://github.com/punkpeye/awesome-mcp-servers)

## 4. 服务器配置与安装

### 4.1 配置文件位置

| Environment | 配置文件路径 |
|-------------|-------------|
| 全局 | `~/.claude/settings.json` |
| 项目级 | `<project>/.claude/settings.json` |
| 工作区 | `.omc/settings.json` |

### 4.2 基本配置结构

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "<executable>",
      "args": ["<arg1>", "<arg2>"],
      "env": {
        "VAR_NAME": "value"
      },
      "metadata": {
        "description": "服务器描述",
        "enabled": true
      }
    }
  }
}
```

### 4.3 配置字段说明

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | 可执行命令（npx, node, python 等） |
| `args` | string[] | 命令行参数 |
| `env` | object | 环境变量（支持 `${VAR}` 插值） |
| `metadata.description` | string | 服务器用途描述 |
| `metadata.enabled` | boolean | 是否启用（默认 true） |

### 4.4 多服务器配置

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "env": {
        "ALLOWED_DIRECTORIES": "/workspace"
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
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "MAX_ROWS": "500"
      }
    }
  }
}
```

### 4.5 环境变量管理

**本地 .env 文件：**

```bash
# .env 文件（添加到 .gitignore）
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
BRAVE_API_KEY=BSAxxxxxxxxxxxxxx
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
```

**在配置中使用：**

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**变量插值规则：**
- `${VAR_NAME}` - 从环境变量读取
- `${VAR_NAME:-default}` - 带默认值
- 不存在的变量将使用空字符串

### 4.6 服务器启动选项

| Option | Description | Example |
|--------|-------------|---------|
| `timeout` | 启动超时（毫秒） | `"timeout": 30000` |
| `restart` | 失败后重启 | `"restart": true` |
| `maxRetries` | 最大重试次数 | `"maxRetries": 3` |

```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      },
      "timeout": 30000,
      "restart": true,
      "maxRetries": 3
    }
  }
}
```

## 5. 自定义 MCP 服务器开发

### 5.1 Python (FastMCP) 实现

**项目结构：**

```
my-mcp-server/
├── src/
│   └── __init__.py
│   └── server.py
├── pyproject.toml
└── README.md
```

**pyproject.toml：**

```toml
[project]
name = "my-mcp-server"
version = "1.0.0"
description = "My custom MCP server"
requires-python = ">=3.10"
dependencies = [
    "fastmcp>=0.1.0",
]

[project.scripts]
my-mcp = "my_mcp_server.server:app"
```

**server.py：**

```python
# src/server.py
from fastmcp import FastMCP

# 创建 FastMCP 实例
mcp = FastMCP(
    name="my-mcp-server",
    version="1.0.0",
    description="Custom MCP server for my use case"
)


@mcp.tool()
def get_weather(location: str, units: str = "celsius") -> dict:
    """获取天气信息

    Args:
        location: 城市名称或邮编
        units: 温度单位（celsius 或 fahrenheit）

    Returns:
        天气数据字典
    """
    # 实现天气查询逻辑
    return {
        "location": location,
        "temperature": 22,
        "conditions": "partly cloudy",
        "units": units,
    }


@mcp.tool()
def search_database(query: str, table: str = "default") -> list[dict]:
    """搜索数据库

    Args:
        query: 搜索关键词
        table: 表名

    Returns:
        匹配结果列表
    """
    # 实现数据库查询
    return [{"id": 1, "name": "result1"}, {"id": 2, "name": "result2"}]


@mcp.resource("config://app")
def get_config() -> str:
    """返回应用配置"""
    return '{"theme": "dark", "language": "zh-CN"}'


@mcp.resource("file://{filename}")
def read_static_file(filename: str) -> str:
    """读取静态文件

    Args:
        filename: 文件名
    """
    with open(f"static/{filename}", "r") as f:
        return f.read()


@mcp.prompt()
def code_analysis(code: str, language: str = "python") -> str:
    """生成代码分析提示

    Args:
        code: 要分析的代码
        language: 编程语言
    """
    return f"""请分析以下 {language} 代码：

```{language}
{code}
```

关注点：
1. 代码质量和可读性
2. 潜在的 bug
3. 性能优化建议
4. 安全问题"""


@mcp.prompt_template("review_pr")
def review_pr_template(pr_url: str, focus: str = "all") -> str:
    """PR 审查提示模板

    Args:
        pr_url: PR 的 URL
        focus: 审查重点（all, security, performance）
    """
    return f"""请审查以下 Pull Request：

URL: {pr_url}
重点: {focus}

提供：
1. 变更概述
2. 代码质量评估
3. 潜在问题
4. 建议改进"""


if __name__ == "__main__":
    # 以 stdio 模式运行
    mcp.run()
```

**运行服务器：**

```bash
# 直接运行
python -m src.server

# 或使用入口点
my-mcp

# 使用 npx 运行（需要打包）
npx my-mcp-server
```

### 5.2 TypeScript (MCP SDK) 实现

**项目结构：**

```
my-mcp-server/
├── src/
│   ├── index.ts
│   ├── tools/
│   │   ├── weather.ts
│   │   └── database.ts
│   └── resources/
│       └── config.ts
├── package.json
└── tsconfig.json
```

**package.json：**

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

**src/index.ts：**

```typescript
// src/index.ts
import { MCPServer, Tool, Resource, Prompt } from '@modelcontextprotocol/sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

// 创建服务器实例
const server = new MCPServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

// ==================== 工具定义 ====================

const weatherTool: Tool = {
  name: 'get_weather',
  description: '获取指定位置的天气信息',
  inputSchema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: '城市名称或邮编',
      },
      units: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius',
        description: '温度单位',
      },
    },
    required: ['location'],
  },
};

const searchTool: Tool = {
  name: 'search_database',
  description: '搜索数据库中的记录',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词',
        minLength: 1,
        maxLength: 200,
      },
      table: {
        type: 'string',
        description: '表名',
        default: 'default',
      },
      limit: {
        type: 'number',
        description: '最大返回条数',
        default: 10,
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['query'],
  },
};

// ==================== 资源定义 ====================

const configResource: Resource = {
  uri: 'config://app',
  name: 'Application Config',
  mimeType: 'application/json',
};

const logResourceTemplate: Resource = {
  uri: 'logs://{date}',
  name: 'Daily Logs',
  description: '指定日期的日志文件',
  mimeType: 'text/plain',
};

// ==================== 提示模板定义 ====================

const codeReviewPrompt: Prompt = {
  name: 'code_review',
  description: '生成代码审查任务',
  arguments: [
    { name: 'file_path', description: '文件路径', required: true },
    { name: 'language', description: '编程语言' },
  ],
};

// ==================== 请求处理 ====================

// 工具列表
server.setRequestHandler('tools/list', async () => ({
  tools: [weatherTool, searchTool],
}));

// 工具调用
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_weather':
      return await handleGetWeather(args as { location: string; units?: string });

    case 'search_database':
      return await handleSearchDatabase(args as {
        query: string;
        table?: string;
        limit?: number;
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// 资源列表
server.setRequestHandler('resources/list', async () => ({
  resources: [configResource, logResourceTemplate],
  resourceTemplates: [logResourceTemplate],
}));

// 资源读取
server.setRequestHandler('resources/read', async (request) => {
  const { uri } = request.params;

  if (uri === 'config://app') {
    return {
      contents: [{
        type: 'resource',
        mimeType: 'application/json',
        text: JSON.stringify({ theme: 'dark', language: 'zh-CN' }),
      }],
    };
  }

  // 处理日志模板
  const match = uri.match(/^logs:\/\/(.+)$/);
  if (match) {
    const date = match[1];
    return {
      contents: [{
        type: 'resource',
        mimeType: 'text/plain',
        text: await readLogFile(date),
      }],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// 提示列表
server.setRequestHandler('prompts/list', async () => ({
  prompts: [codeReviewPrompt],
}));

// 提示获取
server.setRequestHandler('prompts/get', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'code_review') {
    const { file_path } = args as { file_path: string; language?: string };
    const content = await readFile(file_path);

    return {
      messages: [{
        role: 'user',
        content: `请审查以下文件：

\`\`\`
${content}
\`\`\``,
      }],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

// ==================== 辅助函数 ====================

async function handleGetWeather(args: { location: string; units?: string }) {
  // 实现天气查询
  return {
    contents: [{
      type: 'text',
      text: JSON.stringify({
        location: args.location,
        temperature: 22,
        conditions: 'partly cloudy',
      }),
    }],
  };
}

async function handleSearchDatabase(args: {
  query: string;
  table?: string;
  limit?: number;
}) {
  // 实现数据库搜索
  return {
    contents: [{
      type: 'text',
      text: JSON.stringify([
        { id: 1, name: 'result1' },
        { id: 2, name: 'result2' },
      ].slice(0, args.limit || 10)),
    }],
  };
}

async function readFile(path: string): Promise<string> {
  const fs = await import('fs/promises');
  return fs.readFile(path, 'utf-8');
}

async function readLogFile(date: string): Promise<string> {
  const fs = await import('fs/promises');
  try {
    return await fs.readFile(`logs/${date}.log`, 'utf-8');
  } catch {
    return `No logs found for date: ${date}`;
  }
}

// ==================== 启动服务器 ====================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### 5.3 NestJS 实现

**安装依赖：**

```bash
npm install @modelcontextprotocol/sdk @nestjs/common @nestjs/core
```

**MCP 模块：**

```typescript
// mcp/mcp.module.ts
import { Module } from '@nestjs/common';

@Module({
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
```

**MCP 服务：**

```typescript
// 第 1 段：模块声明与依赖导入——引入 NestJS 的依赖注入装饰器，以及 MCP 协议的 SDK 类型/基类
// `@Injectable()` 让本类进入 NestJS 的 IoC 容器，可被其他 provider 注入；MCPServer 是协议运行时，
// Tool/Resource/Prompt 是协议约定的能力描述类型（这里实际只用到 Tool，其余导入属于类型面预留）。
// mcp/mcp.service.ts
import { Injectable } from '@nestjs/common';
import { MCPServer, Tool, Resource, Prompt } from '@modelcontextprotocol/sdk';

// 第 2 段：服务类与内部状态——server 承载协议会话，tools 用 Map 做"名称 → 工具描述"的内存注册表
// 选 Map 而非数组，是为了在 tools/call 分发时以 O(1) 完成名称查找（数组方案是 O(n) 线性扫描）。
// 两个字段都是进程内单例状态：NestJS 默认单例作用域下，它们在整个应用生命周期内共享。
@Injectable()
export class McpService {
  private server: MCPServer;
  private tools: Map<string, Tool> = new Map();

  // 第 3 段：构造函数——按"先建服务端、再注册工具"的顺序完成自举
  // 顺序不可颠倒：registerTools 内部会对 this.server 调用 setRequestHandler，
  // 若 server 尚未初始化，这里会直接抛 undefined 错误（典型空指针边界问题）。
  constructor() {
    this.initializeServer();
    this.registerTools();
  }

  // 第 4 段：创建 MCP server 实例——声明服务端身份（name/version）
  // name 与 version 会随 initialize 握手返回给客户端，用于能力协商与日志标记；
  // 新版本 SDK 通常还会在此传入 capabilities，这里保持最小可用配置。
  private initializeServer() {
    this.server = new MCPServer({
      name: 'nestjs-mcp-server',
      version: '1.0.0',
    });
  }

  // 第 5 段：工具注册总入口——把「工具元数据」与「工具处理器」两件事一次性装配好
  // 关键数据流：Map 先存 schema（供 tools/list 暴露给 LLM 看），
  // 再由 tools/call 处理器拿着 name 回到 Map 找工具，最后转交 executeTool 执行。
  private registerTools() {
    // 注册天气工具
    // inputSchema 使用 JSON Schema，它决定了模型能否正确构造参数；
    // required 只列 location，说明 units 是可选参数，缺省时由业务层兜底。
    this.tools.set('get_weather', {
      name: 'get_weather',
      description: '获取天气信息',
      inputSchema: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          units: { type: 'string', enum: ['celsius', 'fahrenheit'] },
        },
        required: ['location'],
      },
    });

    // 注册数据库搜索工具
    // 同样只把 query 设为必填：table 交给实现侧决定默认表或全库检索，
    // 这样模型即使漏给 table 也不会因为 schema 校验而调用失败。
    this.tools.set('search_database', {
      name: 'search_database',
      description: '搜索数据库',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          table: { type: 'string' },
        },
        required: ['query'],
      },
    });

    // 设置工具列表处理器
    // tools/list 是"能力发现"接口：每次调用都从当前 Map 快照出数组，
    // 因此后续若要支持运行时动态增删工具，只要改 Map 即可自动生效，无需重绑处理器。
    this.server.setRequestHandler('tools/list', async () => ({
      tools: Array.from(this.tools.values()),
    }));

    // 设置工具调用处理器
    // 易错点：request.params 里的字段名是 `arguments`（与 JS 保留字冲突），
    // 所以必须用 `arguments: args` 解构重命名，否则无法在函数体内直接引用。
    // 校验顺序也很关键：未知工具必须在此处就报错，避免把非法 name 透传到 executeTool。
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      return await this.executeTool(name, args);
    });
  }

  // 第 6 段：工具分发器——把「协议层请求」翻译成「具体业务方法调用」
  // 这里用 switch 做静态分发，新增工具需同时改 Map 与本 switch（两处同步是维护成本点）。
  // 注意 args 是从 JSON 反序列化来的宽泛对象，所以用 `as` 断言收敛类型；
  // 断言的正确性由上面的 inputSchema 提供，属于"schema 即契约"的信任边界。
  private async executeTool(name: string, args: Record<string, unknown>) {
    switch (name) {
      case 'get_weather':
        return this.getWeather(args as { location: string; units?: string });

      case 'search_database':
        return this.searchDatabase(args as { query: string; table?: string });

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // 第 7 段：天气工具实现——返回 MCP 规定的 contents 数组结构
  // 返回值必须是 `{ contents: [...] }` 而不是裸字符串，否则客户端无法解析协议响应；
  // text 字段承载的是「字符串化后的 JSON」，因为 MCP 文本内容只接受 string。
  private async getWeather(args: { location: string; units?: string }) {
    // 业务逻辑
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify({
          location: args.location,
          temperature: 22,
        }),
      }],
    };
  }

  // 第 8 段：数据库搜索实现——与天气工具保持完全一致的响应外壳
  // 这种统一外壳让 executeTool 的 return 可以直接透传给协议层，无需再做二次包装；
  // 真实实现里应在此完成参数化查询与错误处理，避免 SQL 注入。
  private async searchDatabase(args: { query: string; table?: string }) {
    // 数据库查询逻辑
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify([{ id: 1, name: 'result' }]),
      }],
    };
  }

  // 第 9 段：启动入口——把底层传输（stdio / SSE / Streamable HTTP）注入并建立会话
  // transport 类型留成 any 是为了让调用方决定传输方式，属于有意为之的解耦；
  // connect 完成前服务不对外可用，因此必须 await，否则会出现"连接未就绪即收请求"的竞态。
  async start(transport: any) {
    await this.server.connect(transport);
  }
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MCP 规范](https://modelcontextprotocol.io/specification) | transport 与 lifecycle 决定服务器能否被正确连接与关闭。 | 读 transport 与 lifecycle 两章，对照自己的实现检查初始化握手与资源释放是否合规。 |
| [MCP 规范（最新版本）](https://modelcontextprotocol.io/specification/latest) | 看清协议版本变更，避免 SDK 与规范不一致的坑。 | 翻版本变更记录，核对你所用 SDK 声明的协议版本与文档是否对得上。 |
| [MCP 架构概念](https://modelcontextprotocol.io/docs/learn/architecture) | 三类能力的边界是设计服务器时最先要定的东西。 | 对照 tools、resources、prompts，为你的场景各举一例，判断该暴露成哪一类。 |
| [MCP Tools 概念](https://modelcontextprotocol.io/docs/concepts/tools) | tool 描述与 schema 质量直接决定模型能否正确调用。 | 为一个真实 API 写 tool schema，补全描述与输入校验，再用 Inspector 试调。 |
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | TS SDK 的 README 是最短的服务器上手路径。 | 按 README 搭一个 stdio 服务器，先连 Inspector，再接入本地客户端。 |
| [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) | FastMCP 让 Python 开发者几行代码就能起一个服务器。 | 用 FastMCP 写一个数据库查询工具，注意参数校验，再用 Inspector 验证。 |
| [MCP Inspector](https://github.com/modelcontextprotocol/inspector) | 能直接看到工具调用收发的原始 JSON-RPC 消息。 | 启动服务器后用 Inspector 连接，逐个调用工具，观察请求与响应字段。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MCP 官方服务器集合](https://github.com/modelcontextprotocol/servers) | 官方服务器实现是学写 server 最规范、最可读的范例。 | 读 filesystem 服务器的工具注册与参数校验部分，然后仿写一个只读文件工具。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp) | 跑通一次完整接入，能快速建立对服务器用法的直觉。 | 跟着步骤接入 filesystem 或 GitHub 服务器完成一次读写，再回想请求链路。 |
| [MCP 入门介绍](https://modelcontextprotocol.io/docs/getting-started/intro) | 用最短篇幅讲清 host、client、server 三层关系。 | 读完后画出三层关系图，标出一次工具调用在图中经过的每个节点。 |
| [Hugging Face MCP 课程](https://huggingface.co/learn/mcp-course/unit0/introduction) | 课程结构完整，边学边写，适合零基础系统入门。 | 完成第一单元的服务器构建练习并跑通，再回看规范中对应章节。 |
| [Hugging Face MCP Course](https://huggingface.co/learn/mcp-course) | 同时实现服务器与客户端，理解两端各自的职责边界。 | 先写服务器再写客户端，跑通一次工具调用，记录两端分别做了什么。 |

## 应用与行业实践

本页的知识点落到日常工程里，就是三类决定：接哪个服务器、给它多大权限、怎么判断接得值不值。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 编码助手查本地仓库的提交历史与单文件 diff | 自定义 MCP 服务器开发 | 本地 stdio 服务器 + 官方 SDK | 路径收敛到仓库根目录，只读，输出行数封顶 |
| 助手读取项目文档目录生成变更说明 | 官方 MCP 服务器 | 官方文件系统服务器 | 根目录指向子目录，关闭写入类工具 |
| 助手抓取公开文档页做版本对比 | 官方 MCP 服务器 | 官方抓取类服务器 | 出站域名白名单，单页内容体积上限 |
| 客服桌面端接入内部知识库搜索 | 第三方 MCP 服务器 | 第三方检索连接器 | 先确认凭据存放位置与日志是否落敏感内容 |
| 数据团队共用一个只读 SQL 查询入口 | 服务器配置与安装 | 远程传输 + 统一配置下发 | 单点凭据、查询审计、读写分离 |
| 多人客户端共存时的服务器清单治理 | MCP 服务器生态系统概述 | 配置模板仓库 | 每个服务器记归属人、用途、权限范围 |
| 工具被调用但返回为空时的排障 | 深入阅读与参考 | 调试工具 + 客户端日志 | 先看握手与入参，再看服务端日志 |
| 上线前评估第三方服务器的权限面 | 第三方 MCP 服务器 | 最小权限令牌 | 拒绝宽泛授权，按数据源逐项确认 |

传输方式的名称与能力，以及各客户端的配置字段名，以你所用的官方规范与客户端文档当前版本为准。

### 三个场景拆解

#### 场景 1：编码助手查本地仓库的提交历史

**业务背景**：助手要回答"这个函数上次改动是谁提交的、改了什么"，靠人手工复制 diff 会漏文件。手里同时跟 3 到 4 个仓库时，逐次复制粘贴的耗时随提交量增长。

**怎么用本页知识解决**：思路是把只读的 git 查询封装成自定义 MCP 服务器，用本地 stdio 方式挂在客户端上，让助手按需调用工具，而不是把整份 diff 塞进上下文。

```python
# 结构示意：导入路径与装饰器名称以官方 SDK 文档当前版本为准
from mcp.server.fastmcp import FastMCP

server = FastMCP("git-readonly")          # 名称会在客户端配置里被引用

@server.tool()                            # 注册为工具，名称默认取函数名
def git_log(repo: str, limit: int = 20) -> str:
    """列出最近提交的哈希与标题，只读。"""    # 描述决定模型何时调用它
    path = realpath(repo)
    if not path.startswith(ALLOWED_ROOT):  # 路径收敛，挡住越界读取
        raise ValueError("repo outside allowed root")
    limit = min(max(limit, 1), 50)         # 上限固定，避免把上下文灌满
    return run_git(path, ["log", f"-{limit}", "--pretty=%h %s"])
```

- 工具只返回哈希与标题，需要细节时再调第二个工具取单文件 diff。
- 路径校验放在函数入口，模型传什么参数都过一遍同样的判断。
- 行数上限写死在服务端，客户端传更大的值也不生效。
- 服务器进程以当前用户身份启动，读权限就是你本人在该仓库的读权限。

**怎么度量收益**：看三个指标：工具调用成功率、单次 `git_log` 调用的 P95 耗时、回答一个仓库问题读入的上下文 token 量。测量方法是在客户端日志里按 JSON-RPC 的 id 配对请求与响应，用调试工具手工调用同一工具做对照，token 量取客户端界面的用量显示。

**什么时候不该用**：仓库是浅克隆或历史被重写过，查改动根因会得到错误结论，先跑 `git rev-parse --is-shallow-repository` 确认。任务需要写操作（rebase、push）时不要把写工具一起挂上，交给人在终端里做。只查一次 diff 的任务，让助手直接读文件比搭服务器省事。

#### 场景 2：客服桌面端接入内部知识库搜索

**业务背景**：客服要在会话中查产品文档和历史工单，文档每周更新，导出成静态文件会过期。团队到几十人时，每人本地配置不一致，排障要先问对方装了什么。

**怎么用本页知识解决**：思路是优先选现成的第三方服务器，把配置写成一份模板发给全组，敏感凭据用启动包装脚本注入，配置文件本身只放非敏感项。

```jsonc
{
  "mcpServers": {
    "kb-search": {
      "command": "/usr/local/bin/kb-mcp",   // 包装脚本，内部读取环境变量后启动服务
      "args": ["--read-only"],              // 只读开关，参数名以该服务器文档为准
      "env": {
        "KB_BASE_URL": "https://kb.internal.example"  // 非敏感项才写进配置
      }
    }
  }
}
```

- 配置文件里只有命令、参数和非敏感地址，令牌由包装脚本从系统钥匙串或环境变量读取。
- 客户端是否支持在配置里做变量插值，需核对客户端文档；不确定时用包装脚本这条路。
- 全组共用同一份模板，升级时改一处，排障时对照同一份基线。
- 只读开关先打开，确认业务跑通后再讨论是否需要写入类工具。

**怎么度量收益**：看配置一次通过率、服务器进程启动失败次数、工单首答里引用文档的比例。测量方法是写一个校验脚本检查每人的配置字段是否齐全，在客户端日志里按服务器名检索启动失败记录，再对同一批工单统计首答引用率。

**什么时候不该用**：知识库只允许内网访问，而客户端出口走公网时不要直连。文档含个人身份信息，而该第三方服务器会把内容转发到外部服务时不要接。团队只有 2 个人、每人每天查 3 次以内时，直接搜索页面比维护配置更省成本。

#### 场景 3：数据团队共用一个只读 SQL 查询服务器

**业务背景**：分析师要用自然语言问"上周新增订单按渠道分布"，让助手代写 SQL。若每人各自持有生产库账号，凭据暴露面随人数线性增长。

**怎么用本页知识解决**：思路是把收敛点放在服务端：只暴露带参数校验的查询工具，用只读账号连库，表名走白名单而不是靠提示词约束。

```python
ALLOWED_TABLES = {"orders", "order_items", "channels"}   # 白名单，不靠提示词约束

@server.tool()
def count_orders(table: str, days: int = 7, channel: str | None = None) -> str:
    """按渠道统计近若干天的订单量，只读。"""
    if table not in ALLOWED_TABLES:          # 表名不在白名单直接拒绝
        raise ValueError("table not allowed")
    days = min(max(days, 1), 30)             # 时间窗口封顶，挡住全表扫描
    sql = (f"select channel, count(*) from {table} "      # 表名无法参数绑定，只能白名单
           "where created_at > now() - interval %s day")
    if channel:
        sql += " and channel = %s"           # 渠道值用参数绑定，不做字符串拼接
    return db.query_readonly(sql, (days, channel))        # 只读账号，连接级超时
```

- 表名与时间窗口都在服务端做校验，模型传越界值会收到明确错误。
- 渠道这类值走参数绑定，避免把用户输入拼进 SQL 文本。
- 数据库账号只有 `select` 权限，且设置单条语句超时。
- 连接串只存在服务器进程中，分析师的客户端看不到凭据。
- 每次调用记录工具名、表名、行数与耗时，便于回溯。

**怎么度量收益**：看被拒绝的越权查询次数、单次查询执行时长分布、只读账号的并发连接数峰值。测量方法是在服务端按结构化的工具名与结果状态打点，在数据库侧查该账号的审计记录，两侧按时间对齐。

**什么时候不该用**：查询需要建临时表或跨库 join 时只读账号会失败，这类需求走数据平台更合适。合规要求查询结果不出内网时，不要让结果经过外部客户端。本身就是跑几十分钟的报表任务，交给调度系统而不是对话式调用。

### 行业先进实践

按服务器拆分能力（出处：Model Context Protocol 官方 GitHub 仓库 `servers`）。官方把文件系统、抓取、git 等参考服务器放在同一仓库的不同目录，各自独立安装与授权。这样做让权限面按数据源切开，一个进程拿不到全部能力。你的内部服务器也按"一个数据源一个服务器"拆，不要合并成全能网关。

先用调试工具跑通再写进配置（出处：Model Context Protocol 官方开源工具 MCP Inspector）。它提供界面列出服务器暴露的工具，并可手工传参调用、查看原始返回。有效的原因是排障时能把"客户端没发请求"和"服务端返回错误"分开。接入新服务器前先用它跑通一次调用，命令与启动参数需核对官方文档当前版本。

工具描述按"模型怎么选"来写（出处：Anthropic 工程博客 Writing effective tools for agents）。该文主张把工具描述写成给新同事看的说明，讲清何时用、何时不用、返回什么。模型只依据名称与描述挑选工具，描述含糊会让它选错或反复试错。为每个工具补上"适用条件"与"不要用于"两段描述，并在代码评审时检查；标题与结论以官方博客当前版本为准。

凭据与配置分离（出处：需核对官方文档：各客户端 `mcpServers` 配置示例中 `env` 字段的用法与密钥存储建议）。需要核对两点：该客户端是否支持配置内变量插值，以及它是否会把配置目录同步到云端。在核对清楚之前，用包装脚本读取环境变量或系统钥匙串更稳妥。

### 从学到用：落地路线

第 1 步，在一台机器上试点一个自定义只读服务器。验收标准：调试工具里能看到工具列表，手工调用返回正确结果，客户端会话中模型能选中该工具。

第 2 步，用小样本验证收益。验收标准：连续 5 个工作日记录调用成功率与 P95 耗时，每次失败都能在客户端日志或服务端日志里定位到原因。

第 3 步，推广到小组。验收标准：配置进模板仓库，新增一人从拉取到跑通的步骤不超过 3 条，且仓库中不含明文凭据。

第 4 步，防止回退。验收标准：每月跑一次配置字段校验脚本，服务器升级前后各跑一次冒烟调用，回退方案是保留上一份可用的配置模板与服务器版本号。

### 动手作业

**目标**：搭一个只读的 Markdown 笔记搜索 MCP 服务器，让助手按关键词找出笔记片段并给出文件位置。

**步骤**

1. 选定一个笔记目录，用 `find` 统计文件数，用 `du -sh` 记录总字节数，写进 README。
2. 用官方 SDK 建最小服务器，注册两个工具：列出笔记文件名、按关键词返回匹配行及所在文件。
3. 用调试工具手工调用两个工具，逐个试边界：空关键词、不存在的目录、命中行数超过 50。
4. 把可读根目录写死在服务端，拒绝含 `..` 的路径与绝对路径。
5. 把服务器写进客户端配置，根目录通过包装脚本从环境变量传入。
6. 拿 3 个真实问题走一遍问答，记录每次调用了哪个工具、返回多少行、助手是否引用了正确文件。
7. 写一份 10 行的 README，写明工具用途、限制、不许做的操作。

**验收标准**

- 调试工具中两个工具都返回结构化结果，非法路径返回错误而不是空结果。
- 命中超过上限时返回截断标记与命中总数。
- 客户端重启后配置生效，日志中没有该服务器的启动失败记录。
- 用 `git grep` 自查，仓库中不出现任何凭据明文。
- README 中列出的"不要用于"不少于 2 条。

