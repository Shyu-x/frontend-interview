---
title: Deno 2.x 使用指南
description: 现代 JavaScript 和 TypeScript 安全运行完全指南，涵盖安全沙箱模型、HTTP 服务、内置工具链、Node.js 兼容性、Deno KV 内置存储等核心功能。
tags:
  - runtime
  - deno
date: 2026-05-17
---

# Deno 2.x 使用指南

> Deno 是现代 JavaScript 和 TypeScript 的安全运行时，默认启用沙箱，提供开箱即用的工具链。

## 核心哲学

```
┌─────────────────────────────────────────────────────────────┐
│                       Deno 设计理念                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. 安全优先                                                │
│      └─ 沙箱默认启用，需要显式授权文件系统/网络访问           │
│                                                             │
│   2. 开箱即用                                                │
│      └─ TypeScript 原生支持，无构建步骤                       │
│      └─ 内置 fmt/lint/test 工具                             │
│                                                             │
│   3. Web 兼容                                                │
│      └─ 浏览器同款 API（fetch, WebSocket, Crypto）           │
│      └─ ES Module 标准，无 package.json                      │
│                                                             │
│   4. 去中心化                                                │
│      └─ 从 URL 导入模块，npm: 前缀兼容 npm 包                 │
│      └─ 内置标准库 + JSR @std 生态                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 与 Node.js 的关键差异

| 特性 | Node.js | Deno |
|------|---------|------|
| **安全模型** | 无限制 | 沙箱默认启用 |
| **模块系统** | CJS/ESM | 仅 ESM |
| **TypeScript** | 需配置 | 原生支持 |
| **权限控制** | 无 | 细粒度控制 |
| **内置工具** | 无 | fmt/lint/test/bundle |
| **依赖管理** | package.json | 无需，URL 导入 |
| **标准库** | 基础 | 完善 (std) |

---

## 快速上手

### 安装

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex

# npm
npm install -g deno

# Homebrew
brew install deno
```

### 基础命令

```bash
# 运行脚本
deno run server.ts
deno run --watch server.ts        # 监听模式
deno run --allow-net server.ts    # 允许网络访问
deno run --allow-all server.ts    # 允许所有权限（生产不推荐）

# 权限示例
deno run --allow-read --allow-net main.ts

# 格式化
deno fmt
deno fmt --check                 # 检查格式

# 代码检查
deno lint
deno lint --rules=no-explicit-any

# 测试
deno test
deno test --watch

# 依赖管理
deno add npm:express             # 添加 npm 包
deno add jsr:@std/assert         # 添加 JSR 包
deno remove npm:express           # 移除

# 信息查看
deno info                         # 查看缓存和依赖
deno eval "console.log(Deno.version)"  # 查看版本
```

---

## 安全沙箱模型

### 权限系统详解

```typescript
// Deno 的安全模型基于权限标志
// 默认情况下，代码无法访问文件系统或网络

// ============================================
// 权限标志列表
// ============================================

// --allow-read     允许读取文件系统
// --allow-write    允许写入文件系统
// --allow-net      允许网络访问
// --allow-env      允许读写环境变量
// --allow-sys      允许访问系统信息（操作系统、CPU 等）
// --allow-run      允许运行子进程
// --allow-ffi      允许加载原生库（不推荐）
// --allow-hrtime   允许高精度时间测量

// 示例
deno run --allow-read=/tmp --allow-write=/tmp server.ts

// ============================================
// 运行时权限检查
// ============================================

// 检查当前是否有权限
if (Deno.permissions.querySync({ name: 'read', path: '/etc' }).state === 'granted') {
  const content = await Deno.readTextFile('/etc/hosts');
}

// 请求用户授权
const permission = await Deno.permissions.request({ name: 'net', host: 'example.com' });
```

### 安全最佳实践

```typescript
// 1. 最小权限原则 - 只授予需要的权限
// 好的做法：
deno run --allow-read --allow-net app.ts

// 不好的做法：
deno run --allow-all app.ts  // 危险！

// 2. 使用环境变量而非硬编码
// .env 文件（需要 --allow-env）
const apiKey = Deno.env.get('API_KEY');
if (!apiKey) {
  throw new Error('API_KEY is required');
}

// 3. 验证外部输入（即使有权限也要验证）
async function processUserFile(path: string) {
  // 安全检查：防止路径遍历
  const resolved = new URL(`file://${path}`).pathname;
  if (!resolved.startsWith('/safe/directory/')) {
    throw new Error('Access denied: outside allowed directory');
  }

  return await Deno.readTextFile(resolved);
}

// 4. 使用 Deno KV 进行安全存储
import { KV } from '@std/backend';

const kv = await Deno.openKv();
await kv.set(['users', '123'], { name: '张三', email: 'zhangsan@example.com' });
const user = await kv.get(['users', '123']);
```

---

## HTTP 服务

### 原生 Deno.serve

```typescript
// Deno 2.x 原生 HTTP 服务
Deno.serve({ port: 8000 }, async (req) => {
  const url = new URL(req.url);

  // 路由处理
  if (url.pathname === '/api/hello') {
    return Response.json({
      message: 'Hello from Deno!',
      version: Deno.version.deno,
    });
  }

  // POST 请求
  if (url.pathname === '/api/users' && req.method === 'POST') {
    const body = await req.json();
    // 业务逻辑...
    return Response.json({ success: true, user: body }, { status: 201 });
  }

  // 静态文件
  if (url.pathname.startsWith('/static/')) {
    const filePath = `./public${url.pathname.slice(7)}`;
    try {
      const file = await Deno.open(filePath);
      return new Response(file.readable);
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  }

  return new Response('Hello World!');
});

console.log('Server running on http://localhost:8000');
```

### 使用 Fresh 框架

```typescript
// Fresh 是 Deno 的全栈框架
// islands/ 目录下是客户端组件

// routes/api/joke.ts
import { HandlerContext } from '$fresh/server.ts';

export const handler: HandlerContext = {
  async GET(_req, ctx) {
    const jokes = [
      '为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 = Dec 25',
      '程序员的两大谎言：1. 代码写好了我就睡 2. 这bug很简单',
    ];
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    return Response.json({ joke: randomJoke });
  },
};

// routes/index.tsx
import { Head } from '$fresh/runtime.ts';

export default function Home() {
  return (
    <>
      <Head>
        <title>My Fresh App</title>
      </Head>
      <main>
        <h1>Welcome to Fresh</h1>
        <p>Deno 的全栈框架</p>
      </main>
    </>
  );
}
```

---

## 内置工具链

### 格式化工具

```bash
# 格式化所有代码
deno fmt

# 只检查，不修改
deno fmt --check

# 指定文件
deno fmt src/app.ts

# 忽略某些文件
deno fmt --ignore=vendor,dist

# 配置（deno.json）
{
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "semiColons": true,
    "singleQuote": true,
    "proseWrap": "preserve"
  }
}
```

### Lint 检查

```bash
# 运行 lint
deno lint

# 指定规则
deno lint --rules=no-explicit-any,no-unused-vars

# 忽略某些文件
deno lint --ignore=vendor,dist

# 配置（deno.json）
{
  "lint": {
    "rules": {
      "tags": ["recommended"],
      "include": ["no-explicit-any"],
      "exclude": ["no-unused-vars"]
    }
  }
}
```

### 测试框架

```typescript
import { assertEquals, assertExists, assertThrows } from '@std/assert';

// 基础测试
Deno.test('加法运算', () => {
  const result = 1 + 1;
  assertEquals(result, 2);
});

// 异步测试
Deno.test('异步获取数据', async () => {
  const response = await fetch('https://example.com');
  assertEquals(response.ok, true);
});

// 带描述的测试
Deno.test({
  name: '数组过滤',
  fn: () => {
    const numbers = [1, 2, 3, 4, 5];
    const even = numbers.filter(n => n % 2 === 0);
    assertEquals(even, [2, 4]);
  },
});

// 快照测试
import { assertSnapshot } from '@std/testing/snapshot';

Deno.test('格式化输出匹配快照', async (t) => {
  const output = formatData({ name: 'Test', value: 42 });
  await assertSnapshot(t, output);
});

// Mock 时间
Deno.test({
  name: '缓存过期检查',
  fn: () => {
    using fakeTimer = useFakeTimers();
    const cached = new Cache();
    cached.set('key', 'value', 1000);
    assertEquals(cached.get('key'), 'value');

    fakeTimer.tick(1001);
    assertEquals(cached.get('key'), undefined);
  },
});
```

### Bundle 打包

```bash
# 打包为单个 JS 文件
deno bundle src/app.ts app.bundle.js

# 打包为 ESM
deno bundle --lib src/app.ts app.bundle.mjs

# 打包为压缩格式
deno compile src/app.ts -o app.exe
# 生成独立的可执行文件
```

---

## Node.js 兼容性

### npm 包使用

```typescript
// 使用 npm: 前缀导入 npm 包
import express from 'npm:express@4';
import { z } from 'npm:zod@3';
import React from 'npm:react@18';

// Express 示例
import express from 'npm:express@4';

const app = express();

app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Hello from npm package!' });
});

app.listen(3000, () => {
  console.log('Server running on :3000');
});
```

### Node.js 内置模块兼容

```typescript
// Deno 2.x 兼容大部分 Node.js 内置模块
// 无需 --compat-node 标志

// fs 模块
import {
  readFile,
  writeFile,
  readdir,
  stat,
} from 'node:fs/promises';

import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';

// 注意：某些模块可能需要 polyfill
import { Buffer } from 'node:buffer';

// Deno 独有的全局对象
console.log(Deno.cwd());          // 当前工作目录
console.log(Deno.version.deno);    // Deno 版本
console.log(Deno.version.v8);     // V8 版本
console.log(Deno.version.typescript); // TypeScript 版本
```

### 从 Node.js 迁移

```typescript
// ============================================
// package.json 到 deno.json
// ============================================

// Node.js package.json
{
  "name": "my-app",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "tsc && node dist/server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "dotenv": "^16.0.0"
  }
}

// Deno deno.json（放置在项目根目录）
{
  "imports": {
    "$std/": "jsr:@std/",
    "express": "npm:express@4",
    "dotenv": "npm:dotenv"
  },
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-env server.ts",
    "dev:nodemon": "deno run --watch --allow-net --allow-env --allow-read server.ts"
  },
  "compilerOptions": {
    "strict": true,
    "lib": ["deno.window"]
  }
}

// ============================================
// 常见替换
// ============================================

// __dirname / __filename
// Node.js                           → Deno
// import { dirname, join } from 'path'    import { dirname, fromFileUrl, join } from '$std/path/'

// const __dirname = dirname(fileURLToPath(import.meta.url))
// 简化为：
const __dirname = dirname(fromFileUrl(import.meta.url));

// require() → import
// Node.js                           → Deno
// const fs = require('fs')           → import * as fs from 'node:fs'

// dotenv.config()
// Node.js                           → Deno
// require('dotenv').config()       → import 'dotenv/config'
// Deno 不需要手动调用，会自动加载 .env
```

---

## Deno KV 内置存储

```typescript
// Deno KV - 内置键值存储
import { KV } from '@std/backend';

async function kvExamples() {
  const kv = await Deno.openKv();

  // 基础操作
  const key = ['users', 'u123'] as const;
  const value = { name: '张三', email: 'zhangsan@example.com', age: 25 };

  // 设置值
  const result = await kv.set(key, value);
  console.log('Version stamp:', result.versionstamp);

  // 获取值
  const user = await kv.get(key);
  console.log(user.value);        // { name: '张三', ... }
  console.log(user.versionstamp); // 版本号，用于乐观锁

  // 原子操作
  await kv.atomic()
    .set(['users', 'u123', 'lastLogin'], Date.now())
    .delete(['cache', 'temp'])
    .commit();

  // 批量查询
  const users = kv.list({ prefix: ['users'] });
  for await (const entry of users) {
    console.log(entry.key, entry.value);
  }

  // 范围查询
  const range = kv.list({ prefix: ['users'], start: ['users', 'u000'], end: ['users', 'u999'] });

  // 观察变更
  const changeStream = kv.watch([['users', 'u123']]);
  for await (const op of changeStream) {
    console.log('Change:', op);
  }

  // 事务
  const mutation = await kv.atomic()
    .set(['stats', 'count'], new Deno.KvU64(1n))
    .commit();

  // 计数操作
  const count = await kv.atomic()
    .mutate({ type: 'sum', key: ['stats', 'count'], value: new Deno.KvU64(1n) })
    .commit();

  kv.close();
}

// 可靠队列实现
import { KvQueue } from '@std/backend/queue';

async function queueExample() {
  const kv = await Deno.openKv();

  // 生产者
  const queue = new KvQueue<string>(kv, ['queue', 'jobs']);
  await queue.push('job-1');
  await queue.push('job-2');

  // 消费者
  const worker = new Worker(new URL('./worker.ts', import.meta.url).href, { type: 'module' });

  for await (const job of queue) {
    console.log('Processing:', job);
    await processJob(job);
    await job.finish();
  }
}
```

---

## 常用标准库

```typescript
// ============================================
// @std/path - 路径操作
// ============================================
import { join, dirname, basename, extname, resolve } from '@std/path';

const fullPath = join('/home/user', 'project', 'file.ts');
const dir = dirname(fullPath);     // /home/user/project
const name = basename(fullPath);   // file.ts
const ext = extname(fullPath);     // .ts

// ============================================
// @std/encoding - 编码转换
// ============================================
import {
  encodeBase64,
  decodeBase64,
  encodeHex,
  decodeHex,
} from '@std/encoding';

const encoded = encodeBase64('Hello, 世界!');
const decoded = decodeBase64(encoded);

// ============================================
// @std/fmt - 格式化
// ============================================
import { printf, sprintf } from '@std/fmt';

printf('%s v%d.%d.%d\n', 'Deno', 2, 0, 0);
const msg = sprintf('Hello, %s!', 'World');

// ============================================
// @std/bytes - 字节操作
// ============================================
import { copy, concat } from '@std/bytes';

const buf = new Uint8Array(1024);
copy(buf, new Uint8Array([1, 2, 3]));
const combined = concat([new Uint8Array([1]), new Uint8Array([2])]);

// ============================================
// @std/collections - 集合操作
// ============================================
import {
  distinct,
  chunk,
  groupBy,
  distinctBy,
  sortBy,
} from '@std/collections';

const numbers = [1, 2, 2, 3, 3, 3];
console.log(distinct(numbers));     // [1, 2, 3]

const grouped = groupBy([1, 2, 3, 4, 5], n => n % 2 === 0 ? 'even' : 'odd');
console.log(grouped);             // { odd: [1, 3, 5], even: [2, 4] }

// ============================================
// @std/csv - CSV 解析
// ============================================
import { parse } from '@std/csv';

const csvData = `name,age,city
张三,25,北京
李四,30,上海`;

const records = parse(csvData, { skipFirstRow: true });
console.log(records);
```

---

## 常见问题与解决方案

### Q1: 如何管理依赖版本？

```typescript
// 方法 1: 直接 URL 锁定版本
import express from 'https://esm.sh/express@4.18.0';

// 方法 2: 使用 jsr: 前缀
import { encodeBase64 } from 'jsr:@std/encoding@^1.0.0';

// 方法 3: deno.json 导入映射
// deno.json
{
  "imports": {
    "$std/": "jsr:@std/",
    "express": "npm:express@4.18"
  }
}
// 使用
import { encodeBase64 } from '$std/encoding/base64';
import express from 'express';
```

### Q2: 如何查看依赖关系？

```bash
# 查看缓存信息
deno info

# 查看特定模块信息
deno info jsr:@std/path

# 查看代码覆盖率
deno test --coverage=coverage
deno coverage coverage/
```

### Q3: Deno 在生产环境的表现？

```typescript
// Deno Deploy 边缘部署
// 配置 deno.json
{
  "deploy": {
    "project": "my-app",
    "regions": ["hnd", "sfo", "nrt"]
  }
}

// 部署命令
deno deploy deploy --project=my-app

// 与 Vercel/Cloudflare Workers 兼容
// Deno.serve 格式在 Deno Deploy 上直接可用
```

---

## 参考链接

- [Deno 官方文档](https://docs.deno.com/)
- [Deno 2.0 发行说明](https://deno.com/blog/v2.0)
- [Deno 标准库 @std](https://jsr.io/@std)
- [Fresh 框架](https://fresh.deno.dev/)
- [Deno 与 Node.js 差异](https://docs.deno.com/runtime/fundamentals/node_js_deno/)
- [Deno KV 文档](https://docs.deno.com/runtime/fundamentals/kv/)
- [npm 兼容模式](https://docs.deno.com/runtime/fundamentals/npm_nodejs_compatibility/)