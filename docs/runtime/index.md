---
title: 运行时全景图
description: JavaScript 运行时生态三足鼎立：Node.js 稳坐江山、Bun 异军突起、Deno 另辟蹊径，解析三大运行时定位与选型指南。
tags:
  - runtime
  - nodejs
date: 2026-05-17
---

# 运行时全景图

> JavaScript 运行时生态三足鼎立：Node.js 稳坐江山，Bun 异军突起，Deno 另辟蹊径。

## 运行时三国争霸

| 运行时 | 版本 | 发布年份 | 主导公司 | 定位 |
|--------|------|----------|----------|------|
| **Node.js** | v20.x LTS | 2009 | OpenJS Foundation | 企业级服务端开发标准 |
| **Bun** | v1.x | 2023 | Oven | 极速 all-in-one 运行时 |
| **Deno** | v2.x | 2020 | Deno Land Inc | 安全优先的现代替代 |

### 市场份额与生态对比

```
┌──────────────────────────────────────────────────────────────┐
│                    JavaScript 运行时生态                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Node.js          Bun              Deno                     │
│   ═════════        ════            ════                      │
│   npm (200k+)      内置兼容          deno.land (3k+)          │
│   成熟稳定          性能卓越          安全沙箱                  │
│   企业首选          新项目首选        边缘计算                  │
│                                                              │
│   ┌────────┐      ┌────────┐       ┌────────┐                │
│   │ Express│      │ Hono   │       │ Fresh │                 │
│   │ NestJS │      │ Elysia │       │ Aleph │                 │
│   │ Next.js│      │ Bun API│       │ Deno KV│                │
│   └────────┘      └────────┘       └────────┘                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 各运行时定位详解

### Node.js：行业标准

- **优势**：生态最完善，npm 包数量最多（200,000+），社区成熟，招聘需求大
- **劣势**：CJS/ESM 混用复杂，部分 API 设计历史包袱
- **适用**：企业级后端、微服务、CLI 工具

```typescript
// Node.js 服务端示例
import express from 'express';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', runtime: 'node' });
});

server.listen(3000, () => {
  console.log('Node.js server running on :3000');
});
```

### Bun：性能怪兽

- **优势**：启动快、执行快，内置 SQLite/ORM/打包器，TypeScript 原生支持
- **劣势**：生态相对较新，部分 npm 包兼容性待验证
- **适用**：轻量级 API、脚本工具、原型开发

```typescript
// Bun HTTP 服务器 - 原生支持 TypeScript，无需构建
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response(`Bun server running!`);
  },
});

console.log(`Bun listening on http://localhost:${server.port}`);
```

### Deno：安全先行

- **优势**：默认安全沙箱、原生 TypeScript、Web API 兼容、内置工具链
- **劣势**：生态较小，npm 兼容模式有学习曲线
- **适用**：边缘计算、安全敏感场景、教学学习

```typescript
// Deno 安全权限演示
// 运行需要明确授权：deno run --allow-net server.ts

Deno.serve({ port: 3000 }, (req) => {
  return new Response(`Deno server running!`);
});
```

---

## 核心特性对比

| 特性 | Node.js | Bun | Deno |
|------|---------|-----|------|
| **默认模块系统** | CJS / ESM 混用 | ESM 优先 | ESM only |
| **TypeScript 支持** | 需 ts-node 或构建 | 原生支持 | 原生支持 |
| **包管理器** | npm/pnpm/yarn | 内置 bun | 内置 deno |
| **安全沙箱** | 无 | 无 | 默认启用 |
| **内置 ORM** | 无 | Bun.sql | deno.land/x/drizzle |
| **SQLite 支持** | 需库 | 原生支持 | 插件支持 |
| **Web API 兼容** | 部分 | 大部分 | 高度兼容 |
| **内置格式化** | 无 | bun fmt | deno fmt |
| **内置测试** | Jest/Vitest | 内置 | deno test |
| **NPM 兼容** | 原生 | 100% 兼容 | 兼容模式 |

---

## 面试常考点索引

### 必考知识点

| 主题 | 相关文档 | 重要性 |
|------|----------|--------|
| **Node.js 事件循环** | [Node.js 核心原理](nodejs-core.md) | ⭐⭐⭐ 高频 |
| **libuv 工作原理** | [Node.js 核心原理](nodejs-core.md) | ⭐⭐⭐ 高频 |
| **CommonJS vs ESM** | [Node.js 核心原理](nodejs-core.md) | ⭐⭐⭐ 高频 |
| **Stream 流处理** | [Node.js 核心原理](nodejs-core.md) | ⭐⭐ 进阶 |
| **Buffer 二进制** | [Node.js 核心原理](nodejs-core.md) | ⭐⭐ 进阶 |

### 运行时选型

| 场景 | 推荐选择 | 理由 |
|------|----------|------|
| 企业级后端 | Node.js | 生态成熟，招聘容易 |
| 高性能 API | Bun | 性能领先，开发体验好 |
| 安全敏感场景 | Deno | 沙箱默认启用 |
| 边缘计算 | Deno Deploy | Vercel/Cloudflare 兼容 |
| 快速脚本 | Bun | 原生 TS，即刻运行 |

---

## 学习路径建议

```
入门路线
├── 阶段一：Node.js 基础
│   └── 掌握事件循环、模块系统、异步编程
│
├── 阶段二：Node.js 进阶
│   └── Stream、Buffer、Cluster、Child Process
│
├── 阶段三：运行时对比
│   └── 了解 Bun/Deno 的创新点与适用场景
│
└── 阶段四：项目实践
    └── 根据场景选择合适运行时
```

---

## 参考链接

- [Node.js 官方文档](https://nodejs.org/docs/)
- [Bun 官方文档](https://bun.sh/docs)
- [Deno 官方文档](https://docs.deno.com/)
- [libuv 文档](http://docs.libuv.org/)
- [Node.js Event Loop 可视化](https://nodejs.org/zh-cn/docs/guides/event-loop/)