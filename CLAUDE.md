# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**前端面试全家桶** - 多模块项目，包含文档站点和 Agent 系统。

| 模块 | 说明 | 技术栈 |
|------|------|--------|
| `docs/` | MkDocs 文档站点 | MkDocs + Material |
| `frontend/` | AI 对话前端 | React + Vite + TypeScript |
| `backend/` | Agent 服务后端 | NestJS + LangChain |
| `frontend-interview-master.md` | 完整面试文档 | Markdown |

---

## 分支管理

```
main                  # 稳定版本
  └── feature/agent-streaming  # Agent 开发分支
```

**分支规范**（详见 `CONTRIBUTING.md`）：
- `feature/` - 新功能
- `fix/` - Bug 修复
- `docs/` - 文档更新
- `refactor/` - 重构

**Commit 规范**：`type(scope): subject`
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `refactor`: 重构
- `chore`: 构建/工具

---

## 目录结构

```
someText/
├── docs/                    # 文档源文件
│   ├── index.md             # 首页
│   ├── html/                # HTML 章节
│   ├── css/                 # CSS 章节
│   ├── js/                  # JavaScript 章节
│   └── agent/               # Agent 文档
│       ├── index.md
│       ├── typescript-agent.md
│       └── sse-streaming.md
├── frontend/               # AI 对话前端
│   ├── src/
│   │   ├── components/      # UI 组件
│   │   ├── hooks/           # React hooks
│   │   │   └── useStreamChat.ts  # SSE 流式对话
│   │   ├── types/           # TypeScript 类型
│   │   ├── App.tsx          # 主应用
│   │   └── index.css        # 样式
│   ├── package.json
│   └── vite.config.ts
├── backend/                # Agent 服务后端
│   ├── src/
│   │   ├── agents/
│   │   │   └── typescript-agent.ts  # Claude Code 风格 Agent
│   │   ├── controllers/
│   │   │   └── chat.controller.ts
│   │   ├── services/
│   │   │   ├── agent.service.ts
│   │   │   ├── chat.service.ts
│   │   │   └── streaming.service.ts
│   │   └── dto/
│   │       └── chat.dto.ts
│   └── package.json
├── frontend-interview-master.md  # 完整面试文档
├── mkdocs.yml               # 文档站点配置
├── CONTRIBUTING.md          # 贡献指南
├── MAINTENANCE.md           # 维护规划
└── split_chapters.py        # 文档拆分脚本
```

---

## 常用命令

### 文档开发
```bash
mkdocs serve --dev-addr 127.0.0.1:8000
mkdocs build --clean
```

### 前端开发
```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build   # 构建生产版本
```

### 后端开发
```bash
cd backend
npm install
npm run dev      # http://localhost:4000
npm run build    # 构建
```

### Git 操作
```bash
git checkout -b feature/xxx    # 创建分支
git add . && git commit -m "feat(scope): description"
git push -u origin feature/xxx # 推送
gh pr create                   # 创建 PR
```

---

## 技术要点

### SSE 流式对话

前端使用 `fetch` + `ReadableStream` 读取后端 SSE 数据：

```typescript
const response = await fetch('/api/chat/stream', { method: 'POST' });
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // 解析 SSE 数据...
}
```

后端 NestJS 返回 `text/event-stream`，逐 token 推送。

### TypeScript Agent (Claude Code 风格)

核心架构：
- `TypeScriptAgent` - Agent 主类
- `LLMAdapter` - LLM 适配器接口
- `AnthropicAdapter` - Anthropic API 实现
- `AgentTool` - 工具定义与处理

---

## 环境变量

```bash
# backend/.env
ANTHROPIC_API_KEY=your-api-key
PORT=4000
```

---

## 参考资源

- [MkDocs 文档](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- [NestJS 文档](https://docs.nestjs.com/)
- [LangChain.js](https://js.langchain.com/)
- [Anthropic API](https://docs.anthropic.com/)