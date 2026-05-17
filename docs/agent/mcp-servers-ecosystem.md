---
title: MCP 服务器生态系统与配置
description: 全面介绍 MCP 服务器生态系统、官方与第三方服务器、配置方法以及自定义服务器开发指南。
tags:
  - ai-agent
  - mcp
date: 2026-05-17
---

# MCP 服务器生态系统与配置

> 本文档全面介绍 MCP (Model Context Protocol) 服务器生态系统、官方与第三方服务器、配置方法以及自定义服务器开发指南。

---

## 目录

1. [MCP 服务器生态系统概述](#1-mcp-服务器生态系统概述)
2. [官方 MCP 服务器](#2-官方-mcp-服务器)
3. [第三方 MCP 服务器](#3-第三方-mcp-服务器)
4. [服务器配置与安装](#4-服务器配置与安装)
5. [自定义 MCP 服务器开发](#5-自定义-mcp-服务器开发)
6. [安全与权限](#6-安全与权限)
7. [服务器配置代码示例](#7-服务器配置代码示例)

---

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

---

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

---

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

---

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

---

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
// mcp/mcp.service.ts
import { Injectable } from '@nestjs/common';
import { MCPServer, Tool, Resource, Prompt } from '@modelcontextprotocol/sdk';

@Injectable()
export class McpService {
  private server: MCPServer;
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.initializeServer();
    this.registerTools();
  }

  private initializeServer() {
    this.server = new MCPServer({
      name: 'nestjs-mcp-server',
      version: '1.0.0',
    });
  }

  private registerTools() {
    // 注册天气工具
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
    this.server.setRequestHandler('tools/list', async () => ({
      tools: Array.from(this.tools.values()),
    }));

    // 设置工具调用处理器
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      return await this.executeTool(name, args);
    });
  }

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

  private async searchDatabase(args: { query: string; table?: string }) {
    // 数据库查询逻辑
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify([{ id: 1, name: 'result' }]),
      }],
    };
  }

  async start(transport: any) {
    await this.server.connect(transport);
  }
}
```

---

## 6. 安全与权限

### 6.1 权限模型概述

```mermaid
flowchart TB
    subgraph Security["MCP 安全层次"]
        subgraph L1["层级 1: 网络安全"]
            TLS["TLS 加密"]
            Auth["认证"]
        end
        
        subgraph L2["层级 2: 协议安全"]
            Validate["输入验证"]
            Rate["速率限制"]
        end
        
        subgraph L3["层级 3: 访问控制"]
            RBAC["RBAC 权限"]
            Resources["资源限制"]
        end
        
        subgraph L4["层级 4: 数据安全"]
            Audit["审计日志"]
            Encrypt["数据加密"]
        end
    end
    
    TLS --> Validate
    Validate --> RBAC
    RBAC --> Audit
```

### 6.2 输入验证

**参数验证装饰器：**

```python
# security/validators.py
from typing import Any, Dict, List
import re
from functools import wraps

def validate_path(path: str, allowed_dirs: List[str]) -> bool:
    """验证文件路径安全性"""
    import os
    real_path = os.path.realpath(path)

    for allowed in allowed_dirs:
        if real_path.startswith(os.path.realpath(allowed)):
            return True
    return False

def validate_sql(query: str) -> bool:
    """验证 SQL 安全性"""
    # 只允许 SELECT 语句
    dangerous_patterns = [
        r'\bDROP\b', r'\bDELETE\b', r'\bINSERT\b',
        r'\bUPDATE\b', r'\bTRUNCATE\b', r'\bALTER\b',
        r';', r'--', r'/\*', r'\*/',
    ]

    for pattern in dangerous_patterns:
        if re.search(pattern, query, re.IGNORECASE):
            return False
    return True

def validate_email(email: str) -> bool:
    """验证邮箱格式"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def sanitize_filename(filename: str) -> str:
    """清理文件名"""
    # 移除路径遍历字符
    filename = filename.replace('..', '').replace('/', '').replace('\\', '')
    # 限制长度
    return filename[:255]

class InputValidator:
    """输入验证器"""

    def __init__(self):
        self.allowed_dirs = []
        self.max_length = 10000

    def validate_tool_input(
        self,
        tool_name: str,
        args: Dict[str, Any]
    ) -> tuple[bool, List[str]]:
        """验证工具输入"""
        errors = []

        # 类型检查
        for key, value in args.items():
            if isinstance(value, str) and len(value) > self.max_length:
                errors.append(f"Parameter {key} exceeds max length")

        # 路径验证
        if 'path' in args:
            if not validate_path(args['path'], self.allowed_dirs):
                errors.append(f"Path not in allowed directories")

        # SQL 验证
        if 'query' in args and tool_name == 'execute_sql':
            if not validate_sql(args['query']):
                errors.append("SQL query contains dangerous operations")

        return len(errors) == 0, errors
```

### 6.3 访问控制

**基于角色的访问控制：**

```typescript
// security/rbac.ts

interface Role {
  name: string;
  permissions: Set<Permission>;
}

interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete')[];
}

class AccessControl {
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, string> = new Map();

  constructor() {
    this.initializeRoles();
  }

  private initializeRoles() {
    // 管理员角色
    this.roles.set('admin', {
      name: 'admin',
      permissions: new Set([
        { resource: '*', actions: ['read', 'write', 'delete'] },
      ]),
    });

    // 只读角色
    this.roles.set('readonly', {
      name: 'readonly',
      permissions: new Set([
        { resource: 'files', actions: ['read'] },
        { resource: 'database', actions: ['read'] },
      ]),
    });

    // 开发角色
    this.roles.set('developer', {
      name: 'developer',
      permissions: new Set([
        { resource: 'files', actions: ['read', 'write'] },
        { resource: 'database', actions: ['read'] },
        { resource: 'git', actions: ['read', 'write'] },
      ]),
    });
  }

  assignRole(userId: string, roleName: string) {
    this.userRoles.set(userId, roleName);
  }

  hasPermission(
    userId: string,
    resource: string,
    action: 'read' | 'write' | 'delete'
  ): boolean {
    const roleName = this.userRoles.get(userId);
    if (!roleName) return false;

    const role = this.roles.get(roleName);
    if (!role) return false;

    for (const permission of role.permissions) {
      if (permission.resource === '*' || permission.resource === resource) {
        if (permission.actions.includes(action)) {
          return true;
        }
      }
    }

    return false;
  }
}

// MCP 服务器集成
const accessControl = new AccessControl();

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  const userId = request.context?.userId;

  // 检查写权限
  if (['write_file', 'delete_file', 'update_database'].includes(name)) {
    if (!accessControl.hasPermission(userId, 'files', 'write')) {
      throw new Error('Permission denied: write access required');
    }
  }

  // 检查读权限
  if (['read_file', 'query_database'].includes(name)) {
    if (!accessControl.hasPermission(userId, 'files', 'read')) {
      throw new Error('Permission denied: read access required');
    }
  }

  // 执行工具...
});
```

### 6.4 速率限制

**速率限制实现：**

```typescript
// security/rate-limiter.ts

interface RateLimitConfig {
  windowMs: number;      // 时间窗口（毫秒）
  maxRequests: number;   // 最大请求数
}

class RateLimiter {
  private limits: Map<string, RateLimitConfig> = new Map();
  private requests: Map<string, number[]> = new Map();

  constructor() {
    // 默认限制：每分钟 60 次
    this.setLimit('default', { windowMs: 60000, maxRequests: 60 });

    // 写操作限制：每分钟 10 次
    this.setLimit('write', { windowMs: 60000, maxRequests: 10 });

    // 搜索限制：每分钟 30 次
    this.setLimit('search', { windowMs: 60000, maxRequests: 30 });
  }

  setLimit(category: string, config: RateLimitConfig) {
    this.limits.set(category, config);
  }

  checkLimit(userId: string, category: string = 'default'): boolean {
    const config = this.limits.get(category) || this.limits.get('default')!;
    const now = Date.now();

    // 获取用户请求历史
    if (!this.requests.has(userId)) {
      this.requests.set(userId, []);
    }

    const userRequests = this.requests.get(userId)!;

    // 清理过期请求
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < config.windowMs
    );
    this.requests.set(userId, validRequests);

    // 检查限制
    if (validRequests.length >= config.maxRequests) {
      return false;
    }

    // 记录新请求
    validRequests.push(now);
    return true;
  }

  getRemainingRequests(userId: string, category: string = 'default'): number {
    const config = this.limits.get(category) || this.limits.get('default')!;
    const now = Date.now();

    const userRequests = this.requests.get(userId) || [];
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < config.windowMs
    );

    return Math.max(0, config.maxRequests - validRequests.length);
  }
}

const rateLimiter = new RateLimiter();

server.setRequestHandler('tools/call', async (request) => {
  const { name } = request.params;

  // 确定操作类别
  let category = 'default';
  if (['write_file', 'delete_file'].includes(name)) {
    category = 'write';
  } else if (['search', 'web_search'].includes(name)) {
    category = 'search';
  }

  // 检查速率限制
  const userId = request.context?.userId;
  if (!rateLimiter.checkLimit(userId, category)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // 继续执行...
});
```

### 6.5 审计日志

**审计日志实现：**

```typescript
// security/audit.ts

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  error?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogger {
  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void;
  query(filter: AuditFilter): Promise<AuditEntry[]>;
  export(format: 'json' | 'csv'): Promise<string>;
}

interface AuditFilter {
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  resource?: string;
}

class MCPAuditLogger implements AuditLogger {
  private entries: AuditEntry[] = [];
  private storage: AuditStorage;

  constructor(storage: AuditStorage) {
    this.storage = storage;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>) {
    const fullEntry: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    this.entries.push(fullEntry);
    this.persist(fullEntry);
  }

  private async persist(entry: AuditEntry) {
    // 写入持久化存储
    await this.storage.write(entry);
  }

  async query(filter: AuditFilter): Promise<AuditEntry[]> {
    return this.entries.filter(entry => {
      if (filter.userId && entry.userId !== filter.userId) return false;
      if (filter.action && entry.action !== filter.action) return false;
      if (filter.resource && entry.resource !== filter.resource) return false;
      if (filter.startDate && entry.timestamp < filter.startDate) return false;
      if (filter.endDate && entry.timestamp > filter.endDate) return false;
      return true;
    });
  }

  async export(format: 'json' | 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.entries, null, 2);
    }

    const headers = ['id', 'timestamp', 'userId', 'action', 'resource', 'result', 'error'];
    const rows = this.entries.map(e =>
      headers.map(h => JSON.stringify(e[h as keyof AuditEntry] || '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}

// 集成到 MCP 服务器
const auditLogger = new MCPAuditLogger(new FileAuditStorage('/var/log/mcp-audit.jsonl'));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();

  try {
    const result = await executeTool(name, args);

    auditLogger.log({
      userId: request.context?.userId,
      action: name,
      resource: extractResource(args),
      parameters: args,
      result,
      ipAddress: request.context?.ipAddress,
    });

    return result;
  } catch (error) {
    auditLogger.log({
      userId: request.context?.userId,
      action: name,
      resource: extractResource(args),
      parameters: args,
      error: error.message,
      ipAddress: request.context?.ipAddress,
    });

    throw error;
  }
});
```

### 6.6 安全检查清单

- 验证所有用户输入
- 使用白名单而非黑名单
- 限制文件访问路径
- 实现速率限制
- 记录所有操作
- 加密敏感数据
- 定期更新依赖
- 使用最小权限原则

---

## 7. 服务器配置代码示例

### 7.1 完整的 Python 服务器示例

```python
# complete_server.py
"""
完整的 MCP 服务器示例，包含工具、资源和提示
"""

from fastmcp import FastMCP
from typing import Optional
import json

# 初始化服务器
mcp = FastMCP(
    name="complete-demo-server",
    version="1.0.0",
    description="演示完整功能的 MCP 服务器"
)


# ==================== 工具定义 ====================

@mcp.tool()
def calculator(expression: str) -> dict:
    """
    安全计算器

    Args:
        expression: 数学表达式

    Returns:
        计算结果
    """
    try:
        # 安全评估（仅允许数字和运算符）
        allowed_chars = set('0123456789+-*/.() ')
        if not all(c in allowed_chars for c in expression):
            raise ValueError("Invalid characters in expression")

        result = eval(expression)
        return {
            "expression": expression,
            "result": result,
            "success": True,
        }
    except Exception as e:
        return {
            "expression": expression,
            "error": str(e),
            "success": False,
        }


@mcp.tool()
def text_process(text: str, operation: str = "upper") -> str:
    """
    文本处理工具

    Args:
        text: 输入文本
        operation: 操作类型（upper/lower/reverse）

    Returns:
        处理后的文本
    """
    if operation == "upper":
        return text.upper()
    elif operation == "lower":
        return text.lower()
    elif operation == "reverse":
        return text[::-1]
    else:
        raise ValueError(f"Unknown operation: {operation}")


@mcp.tool()
def fetch_url(url: str) -> dict:
    """
    获取 URL 内容

    Args:
        url: 目标 URL

    Returns:
        响应内容
    """
    import urllib.request

    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            content = response.read().decode('utf-8')
            return {
                "url": url,
                "status": response.status,
                "content_length": len(content),
                "content": content[:1000],  # 限制返回长度
            }
    except Exception as e:
        return {
            "url": url,
            "error": str(e),
            "success": False,
        }


# ==================== 资源定义 ====================

@mcp.resource("config://app")
def get_app_config() -> str:
    """返回应用配置"""
    return json.dumps({
        "app_name": "Demo Server",
        "version": "1.0.0",
        "features": ["calculator", "text_process", "fetch_url"],
    })


@mcp.resource("file://{filename}")
def read_project_file(filename: str) -> str:
    """
    读取项目文件

    Args:
        filename: 文件名
    """
    # 安全路径检查
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    safe_path = os.path.join(base_dir, "data", filename)

    # 验证路径
    if not safe_path.startswith(base_dir):
        raise ValueError("Invalid file path")

    try:
        with open(safe_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return f"File not found: {filename}"


@mcp.resource("stats://daily")
def get_daily_stats() -> str:
    """返回每日统计"""
    return json.dumps({
        "date": "2024-01-15",
        "requests": 1234,
        "errors": 5,
        "avg_response_time_ms": 45,
    })


# ==================== 提示模板定义 ====================

@mcp.prompt()
def analyze_data(data: str, format: str = "json") -> str:
    """
    数据分析提示

    Args:
        data: 要分析的数据
        format: 数据格式（json/csv/plain）
    """
    return f"""请分析以下{format}格式的数据：

```
{data}
```

分析要点：
1. 数据结构和完整性
2. 潜在的模式和趋势
3. 异常值和错误
4. 改进建议"""


@mcp.prompt()
def code_explanation(code: str, language: str = "python") -> str:
    """
    代码解释提示

    Args:
        code: 代码片段
        language: 编程语言
    """
    return f"""请解释以下{language}代码的功能：

```{language}
{code}
```

提供：
1. 代码功能概述
2. 关键组件说明
3. 可能的改进建议
4. 相关最佳实践"""


# ==================== 主函数 ====================

if __name__ == "__main__":
    print("Starting Complete Demo MCP Server...")
    print("Available tools: calculator, text_process, fetch_url")
    print("Available resources: config://app, file://{filename}, stats://daily")
    print("Available prompts: analyze_data, code_explanation")

    # 启动服务器
    mcp.run()
```

### 7.2 完整的 TypeScript 服务器示例

```typescript
// complete-server.ts
/**
 * 完整的 TypeScript MCP 服务器示例
 */

import { MCPServer, Tool, Resource, Prompt } from '@modelcontextprotocol/sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

// 创建服务器
const server = new MCPServer({
  name: 'complete-typescript-server',
  version: '1.0.0',
  description: '演示完整功能的 TypeScript MCP 服务器',
});

// ==================== 类型定义 ====================

interface CalculatorResult {
  expression: string;
  result?: number;
  error?: string;
  success: boolean;
}

interface FetchResult {
  url: string;
  status?: number;
  content_length?: number;
  content?: string;
  error?: string;
  success: boolean;
}

// ==================== 工具定义 ====================

const tools: Tool[] = [
  {
    name: 'calculator',
    description: '安全计算器 - 仅支持基本数学运算',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '数学表达式（如 2+2*3）',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'text_process',
    description: '文本处理工具',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '输入文本',
        },
        operation: {
          type: 'string',
          enum: ['upper', 'lower', 'reverse'],
          default: 'upper',
          description: '操作类型',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'fetch_url',
    description: '获取 URL 内容',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '目标 URL',
          format: 'uri',
        },
      },
      required: ['url'],
    },
  },
];

// ==================== 资源定义 ====================

const resources: Resource[] = [
  {
    uri: 'config://app',
    name: 'Application Config',
    description: '应用配置信息',
    mimeType: 'application/json',
  },
  {
    uri: 'stats://daily',
    name: 'Daily Statistics',
    description: '每日统计数据',
    mimeType: 'application/json',
  },
];

// ==================== 提示模板定义 ====================

const prompts: Prompt[] = [
  {
    name: 'analyze_data',
    description: '数据分析提示',
    arguments: [
      { name: 'data', description: '要分析的数据', required: true },
      { name: 'format', description: '数据格式', required: false },
    ],
  },
  {
    name: 'code_explanation',
    description: '代码解释提示',
    arguments: [
      { name: 'code', description: '代码片段', required: true },
      { name: 'language', description: '编程语言', required: false },
    ],
  },
];

// ==================== 请求处理器 ====================

// 工具列表
server.setRequestHandler('tools/list', async () => ({ tools }));

// 工具调用
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'calculator':
      return handleCalculator(args.expression as string);

    case 'text_process':
      return handleTextProcess(
        args.text as string,
        args.operation as string
      );

    case 'fetch_url':
      return await handleFetchUrl(args.url as string);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// 资源列表
server.setRequestHandler('resources/list', async () => ({
  resources,
}));

// 资源读取
server.setRequestHandler('resources/read', async (request) => {
  const { uri } = request.params;

  if (uri === 'config://app') {
    return {
      contents: [{
        type: 'resource',
        mimeType: 'application/json',
        text: JSON.stringify({
          app_name: 'Complete TypeScript Server',
          version: '1.0.0',
          features: ['calculator', 'text_process', 'fetch_url'],
        }),
      }],
    };
  }

  if (uri === 'stats://daily') {
    return {
      contents: [{
        type: 'resource',
        mimeType: 'application/json',
        text: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          requests: 1234,
          errors: 5,
        }),
      }],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// 提示列表
server.setRequestHandler('prompts/list', async () => ({ prompts }));

// 提示获取
server.setRequestHandler('prompts/get', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'analyze_data') {
    return {
      messages: [{
        role: 'user',
        content: `请分析以下数据：\n\n\`\`\`\n${args.data}\n\`\`\``,
      }],
    };
  }

  if (name === 'code_explanation') {
    const lang = (args.language as string) || 'typescript';
    return {
      messages: [{
        role: 'user',
        content: `请解释以下${lang}代码：\n\n\`\`\`${lang}\n${args.code}\n\`\`\``,
      }],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

// ==================== 工具处理器 ====================

function handleCalculator(expression: string): { contents: Array<{type: string; text: string}> } {
  try {
    // 安全验证
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      throw new Error('Invalid characters in expression');
    }

    const result = Function(`"use strict"; return (${expression})`)();

    return {
      contents: [{
        type: 'text',
        text: JSON.stringify({
          expression,
          result,
          success: true,
        }),
      }],
    };
  } catch (error) {
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify({
          expression,
          error: (error as Error).message,
          success: false,
        }),
      }],
    };
  }
}

function handleTextProcess(text: string, operation: string): { contents: Array<{type: string; text: string}> } {
  let result: string;

  switch (operation) {
    case 'upper':
      result = text.toUpperCase();
      break;
    case 'lower':
      result = text.toLowerCase();
      break;
    case 'reverse':
      result = text.split('').reverse().join('');
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return {
    contents: [{
      type: 'text',
      text: result,
    }],
  };
}

async function handleFetchUrl(url: string): Promise<{ contents: Array<{type: string; text: string}> }> {
  try {
    const response = await fetch(url);
    const content = await response.text();

    return {
      contents: [{
        type: 'text',
        text: JSON.stringify({
          url,
          status: response.status,
          content_length: content.length,
          content: content.slice(0, 1000),
          success: true,
        }),
      }],
    };
  } catch (error) {
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify({
          url,
          error: (error as Error).message,
          success: false,
        }),
      }],
    };
  }
}

// ==================== 启动 ====================

async function main() {
  console.log('Starting Complete TypeScript MCP Server...');
  console.log('Available tools:', tools.map(t => t.name).join(', '));
  console.log('Available resources:', resources.map(r => r.uri).join(', '));
  console.log('Available prompts:', prompts.map(p => p.name).join(', '));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### 7.3 Docker 化 MCP 服务器

**Dockerfile：**

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY src/ ./src/

# 设置入口点
ENV PYTHONPATH=/app
CMD ["python", "-m", "src.server"]
```

**docker-compose.yml：**

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-server:
    build: .
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - API_KEY=${API_KEY}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs

  mcp-client:
    image: node:20
    depends_on:
      - mcp-server
    environment:
      - MCP_SERVER_URL=http://mcp-server:8080
```

### 7.4 服务器健康检查

```typescript
// health-check.ts

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  requests: {
    total: number;
    success: number;
    failed: number;
  };
  tools: {
    [name: string]: {
      available: boolean;
      lastUsed?: string;
    };
  };
  timestamp: string;
}

class HealthMonitor {
  private startTime = Date.now();
  private stats = {
    total: 0,
    success: 0,
    failed: 0,
  };

  recordRequest(success: boolean) {
    this.stats.total++;
    if (success) {
      this.stats.success++;
    } else {
      this.stats.failed++;
    }
  }

  getStatus(): HealthStatus {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.stats.total > 0
      ? this.stats.failed / this.stats.total
      : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (errorRate < 0.01) {
      status = 'healthy';
    } else if (errorRate < 0.1) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      uptime,
      requests: this.stats,
      tools: this.getToolStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  private getToolStatus() {
    return {
      calculator: { available: true, lastUsed: new Date().toISOString() },
      text_process: { available: true },
      fetch_url: { available: true },
    };
  }
}

// 添加健康检查端点
server.setRequestHandler('health/check', async () => {
  return healthMonitor.getStatus();
});
```

---

## 参考资源

- [MCP Official Documentation](https://modelcontextprotocol.io)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
- [FastMCP Documentation](https://fastmcp.readthedocs.io/)