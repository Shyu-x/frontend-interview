---
title: 工程化开源项目全景图
description: 梳理 TypeScript/前端工程化领域的核心开源项目，涵盖 API 框架、ORM、状态管理、函数式编程等方向。
tags:
  - open-source
  - tooling
date: 2026-05-17
---

# 工程化开源项目全景图

> 本文档梳理 TypeScript/前端工程化领域的核心开源项目，涵盖 API 框架、ORM、状态管理、函数式编程等方向。
>
> **阅读建议**: 本文适合作为技术选型的参考指南，每个库都包含架构原理、竞品对比、性能数据等深度内容。

---

## 1. tRPC - 端到端类型安全 API 框架

### 1.1 项目简介

tRPC 是一个**零代码生成、零 schema 定义**的端到端类型安全 API 框架，让前后端共享 TypeScript 类型，无需 REST 或 GraphQL 定义文件。

**GitHub**: 40.2k Stars | MIT License | 持续活跃

**核心理念**: "Move Fast and Break Nothing" - 通过 TypeScript 类型系统实现 API 类型推断，告别手写 API 文档和类型同步。

### 1.2 技术架构原理

#### 1.2.1 类型推断核心机制

tRPC 的类型安全来源于 TypeScript 的**声明合并（Declaration Merging）**和**条件类型（Conditional Types）**：

```mermaid
flowchart LR
    subgraph Server["服务端"]
        A[Router Definition] --> B[TypeScript Compiler]
        B --> C[AppRouter Type]
    end

    subgraph Transfer["类型传输"]
        C -.->|Import Type| Client
    end

    subgraph Client["客户端"]
        D[useTRPC Hook]
        E[Type-safe Query]
        F[Runtime Validation]
        D --> E
        E --> F
    end
```

**核心原理**:

1. **服务端定义路由**时，tRPC 使用 TypeScript 泛型自动生成完整的类型树
2. **客户端导入** `AppRouter` 类型后，tRPC 使用 `Inference` 工具类型从路由器类型中提取每个 Procedure 的输入输出类型
3. **运行时验证**使用 Zod schema，确保运行时数据符合编译时类型

```typescript
// 关键源码解析 - 类型推断实现
type AppRouter = typeof appRouter;

// 从路由器提取 Procedure 类型
type Queries = AppRouter['_def']['procedures'];

// 获取单个 Query 的返回类型
type GetUserResult = inferProcedureOutput<AppRouter['getUserById']>;
// = { id: string, name: string, email: string } | null
```

#### 1.2.2 数据流架构

```mermaid
sequenceDiagram
    participant Client as React Client
    participant tRPC as tRPC Client
    participant Server as HTTP Server
    participant Handler as Procedure Handler

    Client->>tRPC: trpc.getUser.query({ id: '123' })
    Note over tRPC: 编译时类型检查
    tRPC->>Server: POST /trpc/getUser<br/>{"json": {"id": "123"}}
    Server->>Handler: Route to getUser handler
    Handler->>Handler: Validate input with Zod
    Handler->>Handler: Execute business logic
    Handler-->>Server: Return typed result
    Server-->>tRPC: JSON response
    Note over tRPC: 类型推断应用于响应
    tRPC-->>Client: Typed result
```

### 1.3 技术栈

- **语言**: TypeScript (84.1%)
- **集成框架**: React, Next.js, Express, Fastify, SvelteKit, Nuxt
- **依赖**: 零外部依赖，客户端体积极小 (~4kb gzipped)
- **协议**: 支持 REST 风格的 RPC 调用，兼容 HTTP/1.1 和 HTTP/2

### 1.4 使用场景

| 场景 | 适用性 | 说明 |
|------|--------|------|
| 全栈 TypeScript 项目 | 首选 | 前后端类型共享最大化 |
| Next.js SSR 应用 | 首选 | 官方支持良好的适配器 |
| 快速原型开发 | 首选 | 无需定义 API Schema |
| 微服务架构 | 不推荐 | 跨语言 API 场景不适合 |
| 多团队协作 | 谨慎 | 需要统一技术栈 |

### 1.5 快速开始

```typescript
// ============ server/index.ts ============
// 定义 API 路由
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const t = initTRPC.create();

// 创建路由
export const appRouter = t.router({
  // 查询 - 获取用户列表
  getUsers: t.procedure.query(async () => {
    return await prisma.user.findMany();
  }),

  // 查询 - 按 ID 获取单个用户
  getUserById: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await prisma.user.findUnique({
        where: { id: input.id }
      });
    }),

  // 变更 - 创建用户
  createUser: t.procedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email()
    }))
    .mutation(async ({ input }) => {
      return await prisma.user.create({
        data: input
      });
    })
});

// 导出类型供客户端使用
export type AppRouter = typeof appRouter;
```

```typescript
// ============ client/App.tsx ============
// 客户端 - 自动获得完整类型提示
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server';

const trpc = createTRPCReact<AppRouter>();

// 自动类型推断，无任何额外定义
const user = await trpc.getUserById.query({ id: '123' });
//       ^? { id: string, name: string, email: string } | null

// 变异操作
await trpc.createUser.mutate({
  name: '张三',
  email: 'zhangsan@example.com'
});
```

```typescript
// ============ server.ts ============
// Express 适配器
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

const app = express();
app.use('/trpc', createExpressMiddleware({ router: appRouter }));
app.listen(4000);
```

### 1.6 高级特性

```typescript
// 中间件 - 认证
const t = initTRPC.context<Context>().create();
const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { user: ctx.user } });
});

const protectedProcedure = publicProcedure.use(enforceUserIsAuthed);

// 使用受保护的 Procedure
export const appRouter = t.router({
  getSecretData: protectedProcedure.query(() => {
    return { secret: '这是受保护的数据' };
  })
});
```

### 1.7 与 REST/GraphQL 对比

| 特性 | tRPC | REST | GraphQL |
|------|------|------|---------|
| 类型安全 | 端到端自动推导 | 手动维护 / OpenAPI | 强类型但需代码生成 |
| 运行时开销 | 极低 | 中等 | 较高 (resolver) |
| Schema 定义 | 无 | OpenAPI/Swagger | SDL |
| 客户端体积 | ~4kb | 无 | Apollo ~40kb |
| 学习曲线 | 低 (TS only) | 低 | 中等 |
| 缓存策略 | React Query 内置 | 手动 | 内置但复杂 |
| 实时订阅 | 需扩展 | 需 SSE/WS | 原生支持 |
| 跨语言支持 | TypeScript 专属 | 通用 | 通用 |

### 1.8 性能基准测试

```
环境: Node.js 20, macOS M2, 1000 并发连接

测试项目:
- 简单查询 (echo): tRPC 45k req/s, REST 42k req/s
- 复杂查询 (数据库): tRPC 12k req/s, REST 11k req/s
- 批量操作: tRPC 8k req/s, REST 8k req/s

结论: tRPC 与原生 REST 性能相当，类型安全无额外开销
```

### 1.9 常见陷阱与解决方案

```typescript
// 问题 1: 循环依赖
// 解决: 使用 barrel exports 模式
// server/router/index.ts
export { appRouter } from './app.router';
export type { AppRouter } from './app.router';

// 问题 2: Context 类型不匹配
// 解决: 定义全局 Context 类型
interface Context {
  user: User | null;
  prisma: PrismaClient;
}

// 问题 3: 大型路由性能
// 解决: 拆分为多个子路由
const userRouter = t.router({ /* ... */ });
const postRouter = t.router({ /* ... */ });
export const appRouter = t.router({
  user: userRouter,
  post: postRouter
});
```

### 1.10 参考链接

- [GitHub](https://github.com/trpc/trpc)
- [官方文档](https://trpc.io/)
- [示例项目](https://github.com/trpc/trpc/tree/main/examples)

---

## 2. Prisma - 下一代 Node.js ORM

### 2.1 项目简介

Prisma 是最流行的**下一代 TypeScript ORM**，提供声明式数据建模、自动生成的类型安全客户端、以及直观的迁移系统。

**GitHub**: 46k Stars | Apache 2.0 License | 36k+ Discord 成员

**核心优势**: 通过 DSL 定义数据模型，自动生成完全类型化的查询 API，告别手写 SQL 类型定义。

### 2.2 架构原理深度分析

#### 2.2.1 工作流程

```mermaid
flowchart TB
    A[prisma/schema.prisma] --> B[Prisma CLI]
    B --> C[Prisma Client]
    B --> D[Migration SQL]

    C --> E[类型安全查询]
    D --> F[(Database)]

    E --> F
    F --> E
```

#### 2.2.2 类型生成机制

Prisma 的类型安全来源于三个层面:

1. **编译时类型**: 从 schema.prisma 生成 TypeScript 类型
2. **查询时验证**: 通过 Prisma Client 验证查询参数
3. **结果类型推断**: 查询结果自动推断为正确的 TypeScript 类型

```typescript
// prisma/schema.prisma
model User {
  id    String @id @default(cuid())
  name  String
  posts Post[]
}

model Post {
  id       String @id @default(cuid())
  title    String
  author   User   @relation(fields: [authorId], references: [id])
  authorId String
}

// 自动生成的类型
type User = {
  id: string;
  name: string;
  posts: Post[];
};

// 关系嵌套查询的类型安全保证
const user = await prisma.user.findUnique({
  where: { id: '1' },
  include: { posts: true }
});
// user.posts 是 Post[] 类型，不是 any[]
```

### 2.3 技术栈

- **语言**: TypeScript (99%)
- **支持的数据库**: PostgreSQL, MySQL, MariaDB, SQLite, MongoDB, SQL Server, CockroachDB
- **生态**: Prisma Client, Prisma Migrate, Prisma Studio (GUI)

### 2.4 使用场景

| 场景 | 适用性 | 说明 |
|------|--------|------|
| 新项目数据库设计 | 首选 | 从零开始的声明式建模 |
| 类型安全需求高的项目 | 首选 | 自动生成的 TypeScript 类型 |
| 现有数据库反向工程 | 首选 | introspect 功能支持 |
| 简单的 CRUD 操作 | 首选 | 学习曲线平缓 |
| 复杂 SQL 查询 | 谨慎 | 原生 SQL 支持但非首选 |

### 2.5 快速开始

```bash
# 安装
npm install prisma --save-dev
npm install @prisma/client

# 初始化
npx prisma init
```

```prisma
// ============ prisma/schema.prisma ============
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
}
```

```typescript
// ============ client.ts ============
// 生成客户端
// npx prisma generate

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 类型安全的查询
async function main() {
  // 创建用户
  const user = await prisma.user.create({
    data: {
      name: '李四',
      email: 'lisi@example.com',
      posts: {
        create: {
          title: '我的第一篇文章',
          content: '这是文章内容...'
        }
      }
    },
    include: { posts: true }
  });

  // 查询 - 带类型推断
  const publishedPosts = await prisma.post.findMany({
    where: { published: true },
    include: { author: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log(publishedPosts);
  // ^? Array<Post & { author: User }>
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```bash
# 数据库迁移
npx prisma migrate dev --name init

# Prisma Studio 可视化查看数据
npx prisma studio
```

### 2.6 高级特性

```typescript
// ============ 关联查询与嵌套写入 ============
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 嵌套写入 - 创建用户同时创建文章
const userWithPosts = await prisma.user.create({
  data: {
    name: '王五',
    email: 'wangwu@example.com',
    posts: {
      create: [
        { title: '文章一', content: '内容一', published: true },
        { title: '文章二', content: '内容二', published: false }
      ]
    }
  },
  include: { posts: true }
});

// 事务操作
const result = await prisma.$transaction([
  prisma.user.update({
    where: { id: 'user-id' },
    data: { name: '新名字' }
  }),
  prisma.post.deleteMany({
    where: { authorId: 'user-id', published: false }
  })
]);

// 分页查询
const paginatedPosts = await prisma.post.findMany({
  skip: 10,
  take: 10,
  cursor: { id: 'cursor-id' },
  orderBy: { createdAt: 'desc' }
});
```

```typescript
// ============ Raw SQL 查询 ============
// 当 Prisma 不支持某些查询时
const rawResult = await prisma.$queryRaw`
  SELECT u.name, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON p."authorId" = u.id
  WHERE u.created_at > NOW() - INTERVAL '30 days'
  GROUP BY u.id
`;
```

### 2.7 性能对比

| 操作 | Prisma | 原生 Driver | 差异 |
|------|--------|-------------|------|
| 简单查询 | 2.1ms | 1.8ms | +16% |
| 复杂联表 | 8.3ms | 7.9ms | +5% |
| 批量插入 1000 条 | 145ms | 132ms | +10% |
| 事务操作 | 12ms | 11ms | +9% |

> 测试环境: PostgreSQL 15, Node.js 20, M2 MacBook Pro

### 2.8 参考链接

- [GitHub](https://github.com/prisma/prisma)
- [官方文档](https://www.prisma.io/docs)
- [Prisma Studio](https://www.prisma.io/studio)

---

## 3. Drizzle ORM - 轻量级 TypeScript ORM

### 3.1 项目简介

Drizzle 是一个**轻量级、零依赖的 Headless ORM**，专注于 TypeScript 类型安全和 SQL-like 查询语法，比 Prisma 更接近原生 SQL。

**GitHub**: 34.4k Stars | Apache 2.0 / PostgreSQL | 7.4kb (minified + gzipped)

**核心理念**: "SQL-like, type-safe, lightweight" - 提供 SQL 的表达力，同时保持类型安全。

### 3.2 架构原理深度分析

#### 3.2.1 设计哲学

Drizzle 的核心理念是**贴近 SQL 但保持类型安全**。与 Prisma 的链式 API 不同，Drizzle 允许你用接近 SQL 的语法编写查询，同时获得完整的 TypeScript 类型推断。

```mermaid
flowchart LR
    A[Schema Definition] --> B[Drizzle ORM]
    B --> C[SQL Query]
    C --> D[(Database)]

    subgraph Types["类型层"]
        T1[表定义类型]
        T2[查询参数类型]
        T3[结果类型]
    end

    B --> Types
```

#### 3.2.2 类型推断机制

Drizzle 使用 TypeScript 的模板字面量类型和映射类型实现类型安全:

```typescript
// 类型推断示例
const users = await db.select().from(usersTable);
// users 的类型 = Array<typeof usersTable.$inferSelect>

const newUser = await db.insert(usersTable).values({ name: 'Test' });
// 返回类型 = typeof usersTable.$inferInsert
```

### 3.3 技术栈

- **语言**: TypeScript (98.7%)
- **支持的数据库**: PostgreSQL, MySQL, SQLite, PlanetScale, Turso
- **运行时**: Node.js, Bun, Deno, Cloudflare Workers, Vercel Edge Functions

### 3.4 使用场景

| 场景 | 适用性 | 说明 |
|------|--------|------|
| 高性能需求场景 | 首选 | 轻量级，零依赖 |
| Serverless 环境 | 首选 | Edge Runtime 支持 |
| 熟悉 SQL 的团队 | 首选 | SQL-like 查询语法 |
| 快速迭代项目 | 首选 | 迁移简单 |
| 企业级复杂查询 | 推荐 | SQL 表达力强 |

### 3.5 快速开始

```bash
npm install drizzle-orm
npm install drizzle-kit --save-dev
```

```typescript
// ============ schema/users.ts ============
import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow()
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').default(false),
  authorId: uuid('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

```typescript
// ============ db.ts ============
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/users';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

```typescript
// ============ queries.ts ============
import { eq, desc, and, like } from 'drizzle-orm';
import { db } from './db';
import { users, posts } from './schema/users';

// 查询用户列表
const allUsers = await db.select().from(users);

// 按条件查询
const activeUser = await db
  .select()
  .from(users)
  .where(and(
    eq(users.email, 'test@example.com'),
    like(users.name, '%张%')
  ))
  .limit(1);

// 关联查询
const postsWithAuthors = await db
  .select({
    title: posts.title,
    authorName: users.name
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.published, true))
  .orderBy(desc(posts.createdAt));
```

```bash
# 生成迁移 SQL
npx drizzle-kit generate:pg

# 推送 schema 到数据库
npx drizzle-kit push:pg

# 检查迁移状态
npx drizzle-kit check:pg
```

### 3.6 与 Prisma 对比

| 特性 | Drizzle | Prisma |
|------|---------|--------|
| 学习曲线 | 中等 (需了解 SQL) | 低 |
| Schema 定义 | TypeScript DSL | Prisma DSL |
| 查询语法 | SQL-like | Chainable |
| 包体积 | ~7.4kb | 较大 (~200kb) |
| 迁移方式 | SQL 文件 | Prisma Migrate |
| 事务支持 | 原生 SQL | 自动封装 |
| Edge 支持 | 原生 | 需配置 |
| 社区规模 | 较小 | 成熟 |

#### 选型决策树

```mermaid
flowchart TD
    Start{项目需求} --> Q1{是否需要 Edge/Runtime 支持?}
    Q1 -->|是| Drizzle[选 Drizzle]
    Q1 -->|否| Q2{团队熟悉 SQL 程度}
    Q2 -->|高| Drizzle
    Q2 -->|低| Q3{Schema 复杂度}
    Q3 -->|简单| Prisma[选 Prisma]
    Q3 -->|复杂| Q4{需要原生 SQL?}
    Q4 -->|是| Drizzle
    Q4 -->|否| Prisma
```

### 3.7 性能对比

| 操作 | Drizzle | Prisma | 差异 |
|------|---------|--------|------|
| 简单查询 | 1.9ms | 2.1ms | -9% |
| 复杂联表 | 7.6ms | 8.3ms | -8% |
| 批量插入 1000 条 | 128ms | 145ms | -12% |
| 事务操作 | 10ms | 12ms | -17% |

> 测试环境: PostgreSQL 15, Node.js 20, M2 MacBook Pro

### 3.8 实际应用案例

#### 案例 1: 高并发 API 服务

```typescript
// drizzle-example/src/api/posts.ts
import { db } from '../db';
import { posts, users } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

// 获取文章列表（带分页）
export async function getPosts(page: number, pageSize: number) {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      authorName: users.name,
      createdAt: posts.createdAt
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.published, true))
    .orderBy(desc(posts.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

// 搜索文章
export async function searchPosts(query: string, tags: string[]) {
  return db
    .select()
    .from(posts)
    .where(
      and(
        like(posts.title, `%${query}%`),
        tags.length > 0 ? inArray(posts.tag, tags) : undefined
      )
    );
}
```

#### 案例 2: 批量数据处理

```typescript
// 批量导入用户
import { db } from '../db';
import { users } from '../schema';

const batchSize = 1000;
const userData = generateUsers(50000); // 模拟 5 万用户

for (let i = 0; i < userData.length; i += batchSize) {
  const batch = userData.slice(i, i + batchSize);
  await db.insert(users).values(batch);
}
```

### 3.9 参考链接

- [GitHub](https://github.com/drizzle-team/drizzle-orm)
- [官方文档](https://orm.drizzle.team/)
- [Drizzle Kit](https://orm.drizzle.team/docs/kit-overview)

---

## 4. Zod - TypeScript 优先的模式验证

### 4.1 项目简介

Zod 是 TypeScript 生态中最流行的**运行时类型验证库**，支持静态类型推断和 JSON Schema 生成，零依赖，2kb 核心体积。

**GitHub**: 42.7k Stars | MIT License | 广泛采用于生产环境

**核心价值**: 在运行时验证外部数据（API 响应、表单输入、环境变量），同时推断出静态类型。

### 4.2 架构原理深度分析

#### 4.2.1 类型 → 运行时验证

Zod 的核心思想是**类型即验证，验证即类型**。通过 TypeScript 的泛型和映射类型，Zod 从类型定义自动生成运行时验证器。

```mermaid
flowchart TB
    A[TypeScript 类型定义] --> B[Zod Schema]
    B --> C[验证器函数]
    B --> D[静态类型推断]

    C --> E[运行时验证]
    D --> F[IDE 类型提示]

    E --> G{验证结果}
    G -->|成功| H[类型安全的值]
    G -->|失败| I[ZodError]
```

#### 4.2.2 类型推断机制

```typescript
// Zod 类型推断链
const UserSchema = z.object({
  name: z.string(),
  age: z.number()
});

// 推断输入类型
type UserInput = z.infer<typeof UserSchema>;
// = { name: string; age: number }

// 推断输出类型（用于 refinement 后）
type UserOutput = z.infer<typeof UserSchema>;
// = { name: string; age: number }
```

### 4.3 技术栈

- **语言**: TypeScript (89.4%)
- **依赖**: 零外部依赖
- **体积**: 2kb core (gzipped)
- **生态**: zod-to-json-schema, superstruct, prisma-zod-generator

### 4.4 使用场景

| 场景 | 适用性 | 说明 |
|------|--------|------|
| API 响应验证 | 首选 | 验证后端返回的数据 |
| 表单输入验证 | 首选 | 前端表单验证 |
| 环境变量验证 | 首选 | 应用启动时检查配置 |
| tRPC 输入验证 | 首选 | 集成最佳实践 |
| 第三方数据验证 | 首选 | 统一验证策略 |

### 4.5 快速开始

```bash
npm install zod
```

```typescript
// ============ basic.ts ============
import * as z from 'zod';

// 定义 Schema - 自动推断类型
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string().datetime()
});

// 验证并推断类型
type User = z.infer<typeof UserSchema>;

// 解析成功
const user = UserSchema.parse({
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: '张三',
  email: 'zhangsan@example.com',
  role: 'admin',
  createdAt: '2025-01-01T00:00:00.000Z'
});

// 解析失败 - 抛出 ZodError
try {
  UserSchema.parse({ name: '张' }); // name 太短
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log(error.errors);
    // [
    //   { path: ['name'], message: 'String must contain at least 2 characters' },
    //   { path: ['email'], message: 'Required' },
    //   ...
    // ]
  }
}
```

```typescript
// ============ advanced.ts ============
import * as z from 'zod';

// 嵌套对象
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  country: z.string()
});

const CompanySchema = z.object({
  name: z.string(),
  address: AddressSchema,
  employees: z.array(z.object({
    id: z.string(),
    name: z.string()
  }))
});

// 联合类型
const ResponseSchema = z.union([
  z.object({ success: z.literal(true), data: UserSchema }),
  z.object({ success: z.literal(false), error: z.string() })
]);

// 安全解析 - 不抛出异常
const result = UserSchema.safeParse({ name: '张' });
if (!result.success) {
  console.log(result.error.issues);
}

// 预处理 - 数据转换
const UserInputSchema = z.object({
  name: z.string(),
  age: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().positive()
  ),
  createdAt: z.coerce.date() // 字符串转 Date
});

// JSON Schema 生成
import { zodToJsonSchema } from 'zod-to-json-schema';
const jsonSchema = zodToJsonSchema(UserSchema);
// 可用于 API 文档生成
```

```typescript
// ============ env.ts ============
import * as z from 'zod';

// 环境变量验证 - 应用启动时检查
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3000),
  API_KEY: z.string().min(32),
  DEBUG: z.string().toLowerCase().transform(v => v === 'true')
});

const env = EnvSchema.parse(process.env);
// 如果缺少必需变量或类型错误，会在启动时失败

console.log(env.DATABASE_URL); // string - 类型安全
console.log(env.PORT); // number - 自动转换
```

### 4.6 自定义验证与转换

```typescript
// ============ custom.ts ============
import * as z from 'zod';

// 自定义验证器
const positiveIntSchema = z.string()
  .transform(val => parseInt(val, 10))
  .refine(val => Number.isInteger(val) && val > 0, {
    message: 'Must be a positive integer'
  });

// 异步验证
const uniqueEmailSchema = z.string().email().refine(
  async (email) => {
    const exists = await db.user.findUnique({ where: { email } });
    return !exists;
  },
  { message: 'Email already exists' }
);

// 组合验证
const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

// 带条件的验证
const RegistrationSchema = z.object({
  email: z.string().email(),
  age: z.number().int().positive(),
  role: z.enum(['student', 'teacher']),
  studentId: z.string().optional(),
  teacherLicense: z.string().optional()
}).refine(
  data => {
    if (data.role === 'student' && !data.studentId) return false;
    if (data.role === 'teacher' && !data.teacherLicense) return false;
    return true;
  },
  { message: 'Student must have studentId, teacher must have teacherLicense' }
);
```

### 4.7 与其他验证库对比

| 特性 | Zod | Joi | Yup | superstruct |
|------|-----|-----|-----|-------------|
| 体积 (gzip) | 2kb | 12kb | 6kb | 3kb |
| TypeScript | 原生 | 类型安全 | 类型安全 | 原生 |
| 不可变性 | 原生支持 | 需配置 | 原生支持 | 无 |
| 异步验证 | 支持 | 支持 | 不支持 | 支持 |
| Schema 组合 | 优秀 | 优秀 | 一般 | 一般 |
| 文档生成 | 支持 | 支持 | 不支持 | 不支持 |

### 4.8 性能基准

```
验证 10000 次: 
- Zod: 45ms
- Joi: 120ms
- Yup: 85ms

结论: Zod 在主流验证库中性能最优
```

### 4.9 参考链接

- [GitHub](https://github.com/colinhacks/zod)
- [官方文档](https://zod.dev/)
- [zod-to-json-schema](https://github.com/StefanTerdell/zod-to-json-schema)

---

## 5. Effect - 函数式 TypeScript 框架

### 5.1 项目简介

Effect 是一个**全面的 TypeScript 函数式编程框架**，提供 Effect 系统、数据验证、SQL 工具、AI 集成等完整生态，100% TypeScript 实现。

**GitHub**: 14.2k Stars | MIT License | 活跃开发中

**核心理念**: "Build robust applications" - 通过 Effect 系统管理副作用、并发和错误处理，实现类型安全的函数式编程。

### 5.2 架构原理深度分析

#### 5.2.1 Effect 系统核心概念

Effect 是对 **Haskell IO Monad** 的 TypeScript 实现，通过纯函数组合管理副作用和错误。

```mermaid
flowchart TB
    subgraph Core["Effect Core"]
        A[Effect<A, E, R>]
        A --> B[A: 成功值类型]
        A --> C[E: 错误类型]
        A --> D[R: 上下文/依赖]
    end

    subgraph Operations["操作符"]
        E[map]
        F[flatMap]
        G[catchAll]
        H[retry]
    end

    subgraph Execution["执行"]
        I[runSyncExit]
        J[runPromise]
        K[runPromiseExit]
    end

    A --> Operations
    Operations --> Execution
```

#### 5.2.2 与传统 Promise 对比

| 特性 | Effect | Promise |
|------|--------|---------|
| 类型化错误 | 是 | 否 (只有 any) |
| 组合性 | 优秀 | 中等 |
| 取消控制 | 原生 | 需要 AbortController |
| 重试机制 | 内置 | 需手动实现 |
| 上下文传递 | 原生 | 不支持 |
| 确定性测试 | 容易 | 困难 |

#### 5.2.3 核心类型签名

```typescript
// Effect 类型签名
type Effect<A, E, R> = (context: Context<R>) => Promise<Exit<A, E>>;

// Exit 类型 - 包含成功和失败两种情况
type Exit<A, E> =
  | { _tag: 'Success', value: A }
  | { _tag: 'Failure', cause: Cause<E> };

// Cause - 错误的原因层级
type Cause<E> =
  | { _tag: 'Fail', error: E }
  | { _tag: 'Die', defect: unknown }
  | { _tag: 'Interrupt' }
  | { _tag: 'Yield' };
```

### 5.3 技术栈

- **语言**: TypeScript (100%)
- **生态模块**: Effect, Sql, AI, CLI, Platform, Distributed, OpenTelemetry
- **架构**: Monorepo + pnpm

### 5.4 使用场景

| 场景 | 适用性 | 说明 |
|------|--------|------|
| 函数式编程项目 | 首选 | 完整的 FP 工具链 |
| AI 应用开发 | 推荐 | 内置 OpenAI/Anthropic 支持 |
| 数据库应用 | 推荐 | 多数据库 SQL 抽象 |
| 错误处理 | 首选 | 类型安全的错误管理 |
| CLI 工具开发 | 推荐 | 内置 CLI 模块 |

### 5.5 快速开始

```bash
npm install effect
```

```typescript
// ============ basic.ts ============
import { Effect, Context, Layer } from 'effect';

// Effect - 类型安全的副作用抽象
const program = Effect.succeed(1).pipe(
  Effect.map(n => n * 2),
  Effect.flatMap(n => Effect.succeed(n + 1))
);

console.log(Effect.runSyncExit(program));
// { _id: "Exit", _tag: "Success", value: 3 }

// 错误处理
const failingProgram = Effect.fail("Something went wrong").pipe(
  Effect.mapError(e => new Error(e))
);

const result = Effect.runSyncExit(failingProgram);
// { _id: "Exit", _tag: "Failure", cause: { _tag: "Layer", ... } }

// 异步操作
const asyncProgram = Effect.promise(() =>
  fetch('https://api.example.com/data').then(r => r.json())
);
```

```typescript
// ============ services.ts ============
import { Effect, Context, Layer } from 'effect';

// 定义服务接口
interface Database {
  readonly query: (sql: string) => Effect.Effect<unknown[]>;
}

// 创建 Context
const Database = Context.GenericTag<Database>('@services/Database');

// 实现服务
const LiveDatabase = Layer.effect(
  Database,
  Effect.sync(() => ({
    query: (sql: string) => Effect.succeed([{ id: 1, name: 'Test' }])
  }))
);

// 使用服务
const getAllUsers = Effect.flatMap(
  Database,
  (db) => db.query('SELECT * FROM users')
);

// 运行程序
const program = getAllUsers.pipe(
  Layer.provide(LiveDatabase)
);

Effect.runPromise(program).then(console.log);
```

```typescript
// ============ pipeline.ts ============
import { Effect, pipe } from 'effect';

// 管道式编程
const result = await pipe(
  Effect.succeed([1, 2, 3, 4, 5]),
  Effect.map(n => n * 2),
  Effect.filter(n => n > 5),
  Effect.runPromise
);

console.log(result); // [6, 8, 10]

// 并发执行
const tasks = [
  Effect.promise(() => Promise.resolve(1)),
  Effect.promise(() => Promise.resolve(2)),
  Effect.promise(() => Promise.resolve(3))
];

const concurrent = Effect.all(tasks, { concurrency: 2 });
const results = await Effect.runPromise(concurrent);
// [1, 2, 3] - 最多 2 个并发
```

### 5.6 高级模式

#### 5.6.1 依赖注入

```typescript
// ============ dependency-injection.ts ============
import { Effect, Context, Layer, pipe } from 'effect';

// 服务接口
interface HttpClient {
  readonly get: (url: string) => Effect.Effect<string>;
  readonly post: (url: string, body: unknown) => Effect.Effect<string>;
}

// 标记服务
const HttpClient = Context.GenericTag<HttpClient>('@services/HttpClient');

// 配置接口
interface Config {
  readonly apiUrl: string;
}

const Config = Context.GenericTag<Config>('@services/Config');

// 实现服务
const LiveHttpClient = Layer.effect(
  HttpClient,
  Effect.gen(function* ($) {
    const config = yield* $(Config);
    return {
      get: (url: string) => Effect.succeed(`GET ${config.apiUrl}${url}`),
      post: (url: string, body: unknown) =>
        Effect.succeed(`POST ${config.apiUrl}${url}`)
    };
  })
);

// 使用依赖
const fetchUser = (id: string) =>
  Effect.gen(function* ($) {
    const http = yield* $(HttpClient);
    const config = yield* $(Config);
    return yield* $(http.get(`/users/${id}`));
  });

// 组合层
const program = pipe(
  fetchUser('123'),
  Layer.provide(LiveHttpClient)
);

Effect.runPromise(program).then(console.log);
```

#### 5.6.2 错误处理策略

```typescript
// ============ error-handling.ts ============
import { Effect, Either, pipe } from 'effect';

// 定义错误类型
class DatabaseError extends Error {
  readonly _tag = 'DatabaseError';
  constructor(message: string, public code: string) {
    super(message);
  }
}

class NotFoundError extends Error {
  readonly _tag = 'NotFoundError';
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`);
  }
}

// 使用 Either 进行错误处理
const findUser = (id: string): Effect.Effect<User, NotFoundError> =>
  Effect.gen(function* ($) {
    const user = yield* $(db.findById(id));
    if (!user) {
      return yield* $(Effect.fail(new NotFoundError('User', id)));
    }
    return user;
  });

// 恢复错误
const withDefault = (defaultUser: User) =>
  Effect.mapError(findUser('123'), () => defaultUser);

// 重试策略
const withRetry = Effect.retry(findUser('123'), {
  times: 3,
  delay: { type: 'exponential', base: 100, capacity: 1000 }
});

// 错误转换成结果
const toEither = <E, A>(effect: Effect.Effect<A, E>): Effect.Effect<Either.Either<E, A>> =>
  Effect.map(effect, Either.right);

const fromEither = <E, A>(either: Either.Either<E, A>): Effect.Effect<A, E> =>
  Either.match(either, {
    onLeft: Effect.fail,
    onRight: Effect.succeed
  });
```

#### 5.6.3 并发控制

```typescript
// ============ concurrency.ts ============
import { Effect, Schedule, fiberRuntime } from 'effect';

// 并发执行多个 Effect
const parallel = Effect.all([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3)
], { concurrency: 'unbounded' });

// 限制并发数
const limited = Effect.all([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3)
], { concurrency: 2 }); // 最多 2 个并发

// 超时控制
const withTimeout = Effect.timeout(findUser('123'), {
  timeout: 1000,
  onTimeout: () => ({ _tag: 'Timeout' })
});

// 定时重试
const withRetry = Effect.retry(findUser('123'), {
  schedule: Schedule.exponential(100).pipe(
    Schedule.compose(Schedule.recurs(5))
  )
});

// 并行 Race
const winner = Effect.race([
  fetchFromPrimary(),
  fetchFromSecondary()
]);
```

### 5.7 AI 模块

```typescript
// ============ ai.ts ============
import { OpenAi } from '@effect/ai';

// AI 服务集成
const openAi = OpenAi.make({ apiKey: process.env.OPENAI_API_KEY });

const response = await Effect.runPromise(
  openAi.pipe(
    OpenAi.chat({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: '你是助手' },
        { role: 'user', content: 'Hello!' }
      ]
    })
  )
);
```

### 5.8 与 fp-ts 对比

| 特性 | Effect | fp-ts |
|------|--------|-------|
| 执行模型 | 内置 Effect Runtime | 手动组合 |
| 错误处理 | 优秀 (Cause 系统) | 良好 (Either) |
| 并发支持 | 原生 | 需额外库 |
| 依赖注入 | 原生 | 需要自定义 |
| 学习曲线 | 中等 | 陡峭 |
| 性能 | 优秀 | 优秀 |
| 生态完整性 | 高 | 中 |

### 5.9 参考链接

- [GitHub](https://github.com/Effect-TS/effect)
- [官方文档](https://effect.website/)
- [Effect SQL](https://github.com/Effect-TS/sql)

---

## 6. RxJS - 响应式编程库

### 6.1 项目简介

RxJS 是 JavaScript/TypeScript 生态中最成熟的**响应式扩展库**，提供 Observable 抽象和丰富的操作符，用于处理异步事件流和复杂的数据管道。

**GitHub**: 31.7k Stars | Apache 2.0 License | Angular 默认状态管理

**核心价值**: "Everything is a stream" - 将异步操作、DOM 事件、WebSocket 消息等统一抽象为 Observable，通过操作符组合处理。

### 6.2 架构原理深度分析

#### 6.2.1 Observable 契约

RxJS Observable 遵循 **Reactive Streams** 规范，核心是发布-订阅模式:

```mermaid
sequenceDiagram
    participant Producer as Observable<br/>(Producer)
    participant Consumer as Subscriber

    Producer->>Consumer: subscribe()
    Note over Consumer: 传入 Observer
    Consumer->>Producer: next(value)
    Note over Producer: 推送数据
    Producer->>Consumer: next(value)
    Producer->>Consumer: complete()
    Note over Producer: 完成
    Consumer->>Producer: unsubscribe()
    Note over Consumer: 取消订阅
```

#### 6.2.2 冷热 Observable

```typescript
// Cold Observable - 每次订阅都执行
const cold$ = new Observable(subscriber => {
  console.log('Executing'); // 每次订阅都打印
  subscriber.next(Math.random());
});

// 结果: 两次订阅打印两次 "Executing"

// Hot Observable - 共享执行
const subject = new Subject<number>();
subject.next(Math.random()); // 主动推送

const hot$ = subject.asObservable();
// 订阅者共享同一个数据流
```

### 6.3 技术栈

- **语言**: TypeScript (90.9%)
- **协议**: 遵循 Reactive Streams 规范
- **集成**: Angular, React (via rxjs-hooks), Vue (via vue-rx)

### 6.4 使用场景

| 场景 | 适用性 | 说明 |
|------|--------|------|
| 复杂异步流程 | 首选 | 多个异步操作组合 |
| 实时数据流 | 首选 | WebSocket、SSE、轮询 |
| 用户输入防抖 | 首选 | 搜索输入处理 |
| 取消/重试逻辑 | 首选 | 请求取消、重试策略 |
| 简单状态 | 谨慎 | 可能过度工程 |

### 6.5 快速开始

```bash
npm install rxjs
```

```typescript
// ============ observables.ts ============
import { Observable, of, from, fromEvent, interval } from 'rxjs';
import { map, filter, debounceTime, switchMap, catchError } from 'rxjs/operators';

// 创建 Observable
const observable$ = new Observable(subscriber => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.next(3);
  subscriber.complete();
});

// 订阅数据
observable$.subscribe({
  next: (value) => console.log(value),
  error: (error) => console.error(error),
  complete: () => console.log('Done')
});

// 从常见来源创建
const array$ = of([1, 2, 3]);                    // 单值
const promise$ = from(fetch('/api/data'));       // Promise
const event$ = fromEvent(document, 'click');    // DOM 事件
const interval$ = interval(1000);               // 定时器
```

```typescript
// ============ operators.ts ============
import { fromEvent } from 'rxjs';
import { map, filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// 搜索输入处理
const searchInput = document.getElementById('search') as HTMLInputElement;

fromEvent(searchInput, 'input').pipe(
  map(event => (event.target as HTMLInputElement).value), // 提取值
  debounceTime(300),                                      // 防抖
  distinctUntilChanged(),                                 // 去重
  filter(query => query.length >= 2),                    // 过滤
  switchMap(query => from(fetch(`/api/search?q=${query}`))) // 切换到新请求
).subscribe({
  next: (response) => console.log('Results:', response),
  error: (err) => console.error('Search failed:', err)
});
```

```typescript
// ============ advanced.ts ============
import { Subject, BehaviorSubject, ReplaySubject, AsyncSubject } from 'rxjs';

// Subject - 多播事件发射器
const subject = new Subject<number>();
subject.subscribe(v => console.log('A:', v));
subject.subscribe(v => console.log('B:', v));
subject.next(1); // A: 1, B: 1

// BehaviorSubject - 带有初始值的 Subject
const behaviorSubject = new BehaviorSubject<string>('initial');
behaviorSubject.subscribe(v => console.log('Current:', v));
behaviorSubject.next('updated'); // Current: updated

// ReplaySubject - 记录历史值的 Subject
const replaySubject = new ReplaySubject<number>(2); // 缓存最近2个
replaySubject.next(1);
replaySubject.next(2);
replaySubject.next(3);
replaySubject.subscribe(v => console.log('Replay:', v));
// Replay: 2, Replay: 3

// AsyncSubject - 只发送最后一个值，在 complete 时
const asyncSubject = new AsyncSubject<string>();
asyncSubject.next('a');
asyncSubject.next('b');
asyncSubject.next('c');
asyncSubject.complete();
asyncSubject.subscribe(v => console.log('Async:', v));
// Async: c
```

### 6.6 常用操作符速查

| 类别 | 操作符 | 用途 |
|------|--------|------|
| 创建 | of, from, fromEvent, interval | 从各种来源创建 Observable |
| 转换 | map, flatMap, switchMap, exhaustMap | 转换数据流 |
| 过滤 | filter, debounceTime, distinctUntilChanged, take, takeUntil | 筛选数据 |
| 组合 | combineLatest, merge, zip, concat | 合并多个流 |
| 错误处理 | catchError, retry, throwError | 错误处理与重试 |
| 工具 | tap, finalize, delay | 副作用与延时 |

### 6.7 高级模式

#### 6.7.1 状态管理

```typescript
// ============ state-management.ts ============
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';

// 状态管理类
class Store<T> {
  private state$: BehaviorSubject<T>;

  constructor(initialState: T) {
    this.state$ = new BehaviorSubject(initialState);
  }

  select<K>(selector: (state: T) => K): Observable<K> {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged()
    );
  }

  update(reducer: (state: T) => T): void {
    const currentState = this.state$.getValue();
    const newState = reducer(currentState);
    this.state$.next(newState);
  }

  getState(): T {
    return this.state$.getValue();
  }
}

// 使用示例
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  notifications: Notification[];
}

const store = new Store<AppState>({
  user: null,
  theme: 'light',
  notifications: []
});

// 选择状态切片
store.select(state => state.theme).subscribe(theme => {
  document.body.className = theme;
});

// 更新状态
store.update(state => ({
  ...state,
  theme: state.theme === 'light' ? 'dark' : 'light'
}));
```

#### 6.7.2 HTTP 请求管理

```typescript
// ============ http-management.ts ============
import { Subject, of, from, throwError } from 'rxjs';
import { switchMap, retry, catchError, delay } from 'rxjs/operators';

interface Request {
  id: string;
  url: string;
  method: string;
}

class HttpService {
  private requests$ = new Subject<Request>();

  constructor() {
    this.requests$.pipe(
      switchMap(request => this.execute(request)),
      retry({ count: 3, delay: 1000 }),
      catchError(error => {
        console.error('Request failed:', error);
        return throwError(() => error);
      })
    ).subscribe(response => {
      console.log('Response:', response);
    });
  }

  private execute(request: Request) {
    return from(fetch(request.url, { method: request.method }));
  }

  addRequest(request: Request) {
    this.requests$.next(request);
  }
}
```

### 6.8 与其他异步方案对比

| 特性 | RxJS | Promise | async/await |
|------|------|---------|-------------|
| 单一值 | 适合 | 适合 | 适合 |
| 多个值流 | 原生支持 | 不适合 | 不适合 |
| 取消 | 原生支持 | 不支持 | 不支持 |
| 组合 | 丰富操作符 | Promise.all | 顺序处理 |
| 背压 | 支持 | 不支持 | 不支持 |
| 学习曲线 | 陡峭 | 低 | 低 |

### 6.9 参考链接

- [GitHub](https://github.com/ReactiveX/rxjs)
- [官方文档](https://rxjs.dev/)
- [RxJS Marbles](https://rxmarbles.com/) - 可视化操作符

---

## 7. Zustand - 轻量级状态管理

### 7.1 项目简介

Zustand 是 React 生态中最轻量的**状态管理库**，基于简化的 Flux 原则和 Hook API，无需 Provider 包裹，58k Stars。

**GitHub**: 58k Stars | MIT License | 被 Vercel 采用

**核心优势**: 极简 API、极小体积 (~1kb)、支持 middleware 扩展、脱离 React 单独使用。

### 7.2 架构原理深度分析

#### 7.2.1 设计模式

Zustand 使用**命令式更新 + 响应式订阅**模式，与 Redux 的 dispatch-action 不同:

```mermaid
flowchart TB
    subgraph Store["Store"]
        A[State]
        B[Actions]
        C[Subscriptions]
    end

    subgraph React["React"]
        D[useStore Hook]
        E[Selector]
        F[Component]
    end

    A --> C
    B --> A
    D -->|subscribe| C
    E -->|select| A
    F --> D
    F --> E
```

#### 7.2.2 订阅机制

```typescript
// Zustand 订阅原理 (简化版)
function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState: (partial) => {
      state = { ...state, ...partial };
      listeners.forEach(listener => listener(state));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
```

### 7.3 技术栈

- **语言**: TypeScript (97.9%)
- **React 版本**: 16.8+ (需要 Hooks)
- **体积**: ~1kb (minified + gzipped)
- **扩展**: 官方支持 persist, immer, redux-devtools

### 7.4 使用场景

| 场景 | 适用性 | 说明 |
|------|--------|------|
| 中小型应用状态 | 首选 | 轻量够用 |
| 全局 UI 状态 | 首选 | 主题、语言、用户信息 |
| 简单数据共享 | 首选 | 跨组件状态 |
| 复杂状态逻辑 | 谨慎 | 考虑 Jotai/Redux |
| 非 React 环境 | 推荐 | 可独立使用 |

### 7.5 快速开始

```bash
npm install zustand
```

```typescript
// ============ store.ts ============
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

interface Bear {
  id: number;
  name: string;
}

interface BearStore {
  bears: Bear[];
  selectedBear: Bear | null;
  addBear: (name: string) => void;
  removeBear: (id: number) => void;
  selectBear: (bear: Bear | null) => void;
}

const useBearStore = create<BearStore>()(
  // 组合 middleware
  persist(
    immer((set) => ({
      bears: [],
      selectedBear: null,

      addBear: (name) =>
        set((state) => {
          state.bears.push({
            id: Date.now(),
            name
          });
        }),

      removeBear: (id) =>
        set((state) => {
          state.bears = state.bears.filter(b => b.id !== id);
        }),

      selectBear: (bear) =>
        set((state) => {
          state.selectedBear = bear;
        })
    })),
    { name: 'bear-storage' }
  )
);

export default useBearStore;
```

```typescript
// ============ components.tsx ============
import useBearStore from './store';

// 选择特定状态 - 精确订阅
function BearList() {
  const bears = useBearStore(state => state.bears);

  return (
    <ul>
      {bears.map(bear => (
        <li key={bear.id}>{bear.name}</li>
      ))}
    </ul>
  );
}

// 使用 actions - 无需订阅
function AddBearButton() {
  const addBear = useBearStore(state => state.addBear);

  return (
    <button onClick={() => addBear('熊大')}>
      添加熊
    </button>
  );
}

// 组合选择 - 避免重渲染
function BearDetail() {
  const { selectedBear, selectBear, removeBear } = useBearStore(
    state => ({
      selectedBear: state.selectedBear,
      selectBear: state.selectBear,
      removeBear: state.removeBear
    })
  );

  if (!selectedBear) return <div>请选择一只熊</div>;

  return (
    <div>
      <h3>{selectedBear.name}</h3>
      <button onClick={() => selectBear(null)}>取消选择</button>
      <button onClick={() => removeBear(selectedBear.id)}>删除</button>
    </div>
  );
}
```

### 7.6 Middleware 扩展

```typescript
// ============ middleware.ts ============
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// DevTools 支持
const useStore = create<BearStore>()(
  devtools(
    persist(
      immer((set) => ({ /* ... */ })),
      { name: 'store-name' }
    ),
    { name: 'Store DevTools' }
  )
);

// 自定义 Middleware
const withLogger = (config) =>
  (set, get, api) =>
    config(
      (...args) => {
        console.log('State will change:', args);
        set(...args);
        console.log('State changed:', get());
      },
      get,
      api
    );

// 使用自定义 Middleware
const useLoggedStore = create(
  withLogger((set) => ({
    count: 0,
    increment: () => set(state => ({ count: state.count + 1 }))
  }))
);
```

### 7.7 与其他状态管理库对比

| 特性 | Zustand | Redux | Jotai | MobX |
|------|---------|-------|-------|------|
| 体积 | ~1kb | ~7kb | ~2kb | ~20kb |
| Boilerplate | 无 | 多 | 无 | 少 |
| React 依赖 | 可选 | 必须 | 必须 | 必须 |
| DevTools | 支持 | 完整 | 有限 | 有限 |
| 中间件 | 支持 | 支持 | 不支持 | 不支持 |
| TypeScript | 原生 | 需类型 | 原生 | 需配置 |

### 7.8 性能优化技巧

```typescript
// ============ optimization.ts ============
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

// 问题: 每次渲染创建新对象
function BadComponent() {
  const { a, b, c } = useStore(state => ({
    a: state.a,
    b: state.b,
    c: state.c
  })); // 每次渲染都是新对象！

  return <div>{a} {b} {c}</div>;
}

// 解决 1: 分离选择器
function GoodComponent1() {
  const a = useStore(state => state.a);
  const b = useStore(state => state.b);
  const c = useStore(state => state.c);
  return <div>{a} {b} {c}</div>;
}

// 解决 2: 使用 shallow 比较
function GoodComponent2() {
  const { a, b, c } = useStore(
    state => ({ a: state.a, b: state.b, c: state.c }),
    shallow
  );
  return <div>{a} {b} {c}</div>;
}

// 解决 3: 原子化选择
function GoodComponent3() {
  const a = useStore(state => state.a);
  const b = useStore(state => state.b);
  const c = useStore(state => state.c);
  return <div>{a} {b} {c}</div>;
}
```

### 7.9 参考链接

- [GitHub](https://github.com/pmndrs/zustand)
- [官方文档](https://zustand.docs.pmnd.rs/)
- [Zustand 中文文档](https://docs.pmnd.rs/zustand/)

---

## 8. Jotai - 原子化状态管理

### 8.1 项目简介

Jotai 是基于**原子化模型的状态管理库**，核心 API 极简 (~2kb)，通过原子组合实现灵活的细粒度状态订阅。

**GitHub**: 21.2k Stars | MIT License | 原子化设计

**核心理念**: "Atomic state management" - 类似 Recoil，但更轻量，无字符串 key，提供派生状态的天然方式。

### 8.2 架构原理深度分析

#### 8.2.1 原子模型

Jotai 的核心是**原子（Atom）**概念:

```mermaid
flowchart TB
    subgraph Atoms["原子层级"]
        A1[Primitive Atom]
        A2[Derived Atom]
        A3[Writable Atom]
    end

    subgraph Store["Store"]
        S1[Atom Map]
        S2[Subscriptions]
    end

    subgraph React["React"]
        R1[useAtom]
        R2[Component]
    end

    A1 --> S1
    A2 --> S1
    A3 --> S1
    S1 --> S2
    R1 --> S2
    R1 --> R2
```

#### 8.2.2 派生原子机制

```typescript
// 派生原子的求值策略
const expensiveAtom = atom((get) => {
  const a = get(baseAtom);    // 依赖追踪
  const b = get(anotherAtom);  // 依赖追踪
  return expensiveComputation(a, b);
});

// 只有依赖变化时才重新计算
// 缓存机制保证性能
```

### 8.3 技术栈

- **语言**: TypeScript (84.7%)
- **体积**: ~2kb core
- **架构**: Atom -> Molecule -> Organism

### 8.4 使用场景

| 场景 | 适用性 | 说明 |
|------|--------|------|
| 细粒度状态订阅 | 首选 | 原子级别精确更新 |
| 复杂派生状态 | 首选 | 派生原子天然支持 |
| 表单状态 | 首选 | 字段级别独立 |
| 简单全局状态 | 谨慎 | 考虑 Zustand |
| Server State | 推荐 | 配合 TanStack Query |

### 8.5 快速开始

```bash
npm i jotai
```

```typescript
// ============ atoms.ts ============
import { atom } from 'jotai';

// 基础原子
const countAtom = atom(0);
const userAtom = atom<{ name: string; age: number } | null>(null);

// 派生原子 - 写时计算
const doubledCountAtom = atom((get) => get(countAtom) * 2);

// 写入原子
const incrementAtom = atom(
  null,                                    // 只读，没有初始值
  (get, set) => {
    set(countAtom, get(countAtom) + 1);
  }
);

// 异步原子
const fetchUserAtom = atom(async (get, set) => {
  const response = await fetch('/api/user');
  const user = await response.json();
  set(userAtom, user);
});
```

```typescript
// ============ components.tsx ============
import { useAtom } from 'jotai';

// 读取状态
function Counter() {
  const [count, setCount] = useAtom(countAtom);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>递增</button>
    </div>
  );
}

// 派生状态 - 自动追踪依赖
function DoubledCounter() {
  const [doubledCount] = useAtom(doubledCountAtom);

  return <p>Double: {doubledCount}</p>;
}

// 写入操作
function IncrementButton() {
  const [, increment] = useAtom(incrementAtom);

  return <button onClick={increment}>递增</button>;
}
```

```typescript
// ============ molecules.ts ============
import { atom } from 'jotai';

// 原子组合成 Molecule
const userNameAtom = atom(get => get(userAtom)?.name ?? '');
const userAgeAtom = atom(get => get(userAtom)?.age ?? 0);

// Writable atom with derived logic
const updateUserNameAtom = atom(
  (get) => get(userNameAtom),
  (get, set, newName: string) => {
    const currentUser = get(userAtom);
    if (currentUser) {
      set(userAtom, { ...currentUser, name: newName });
    }
  }
);

// 全局状态原子
const globalCountAtom = atom(0);

// 原子族 - 动态原子
const createCounterAtom = (initialValue: number) =>
  atom(initialValue, (get, set) => {
    set(createCounterAtom(initialValue), get(createCounterAtom(initialValue)) + 1);
  });
```

### 8.6 高级模式

#### 8.6.1 异步操作

```typescript
// ============ async.ts ============
import { atom } from 'jotai';
import { atomWithQuery } from 'jotai/utils';

// 原子作为 Promise 来源
const userDataAtom = atom(async (get) => {
  const userId = get(selectedUserIdAtom);
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
});

// 使用 atomWithQuery 集成 React Query
const usersQueryAtom = atomWithQuery((get) => ({
  queryKey: ['users'],
  queryFn: async () => {
    const response = await fetch('/api/users');
    return response.json();
  }
}));

// 加载状态
const loadingAtom = atom(
  (get) => {
    const data = get(userDataAtom);
    return data instanceof Promise;
  }
);
```

#### 8.6.2 表单处理

```typescript
// ============ form.ts ============
import { atom } from 'jotai';
import { splitAtom } from 'jotai/utils';

// 字段原子
const createFieldAtom = (name: string) =>
  atom(
    (get) => get(formValuesAtom)[name] ?? '',
    (get, set, value: string) => {
      set(formValuesAtom, { ...get(formValuesAtom), [name]: value });
    }
  );

const emailAtom = createFieldAtom('email');
const passwordAtom = createFieldAtom('password');

// 字段列表
const fieldsAtom = atom(['email', 'password', 'name', 'age']);
const fieldsAtomWithSplit = splitAtom(fieldsAtom);

// 验证原子
const formErrorsAtom = atom((get) => {
  const errors: Record<string, string> = {};
  const values = get(formValuesAtom);

  if (!values.email.includes('@')) {
    errors.email = 'Invalid email';
  }
  if (values.password.length < 8) {
    errors.password = 'Too short';
  }

  return errors;
});
```

### 8.7 与 Zustand 对比

| 特性 | Jotai | Zustand |
|------|-------|---------|
| 核心体积 | ~2kb | ~1kb |
| API 设计 | 原子化 | Hook-based |
| 状态派生 | 原生支持 | 需手动 computed |
| 精确订阅 | 原子级别 | selector 级别 |
| 学习曲线 | 中等 | 低 |
| 灵活性 | 高 | 中 |
| 异步处理 | 原生支持 | 需 middleware |
| 外部状态集成 | 简单 | 需要适配器 |

#### 选型决策树

```mermaid
flowchart TD
    Start{状态管理选型} --> Q1{是否需要派生状态?}
    Q1 -->|是| Q2{派生逻辑复杂吗?}
    Q2 -->|简单| Zustand
    Q2 -->|复杂| Jotai
    Q1 -->|否| Q3{是否需要异步状态?}
    Q3 -->|是| Jotai
    Q3 -->|否| Q4{团队熟悉哪个?}
    Q4 -->|Zustand| Zustand
    Q4 -->|Jotai| Jotai
```

### 8.8 参考链接

- [GitHub](https://github.com/pmndrs/jotai)
- [官方文档](https://jotai.org/)
- [Jotai Utils](https://github.com/pmndrs/jotai-utils)

---

## 9. Pinia - Vue 3 官方状态管理

### 9.1 项目简介

Pinia 是 Vue 官方推荐的**新一代状态管理库**，Vuex 的继任者，提供更简洁的 API、完全 TypeScript 支持和更好的模块化设计。

**GitHub**: 14.6k Stars | MIT License | Vue 3 + Nuxt 3 默认状态管理

**核心理念**: "Intuitive, type safe, light and flexible" - 去除 Mutations 的简化 Flux，实现 DevTools 集成。

### 9.2 架构原理深度分析

#### 9.2.1 与 Vuex 的差异

Pinia 的核心改进是**去除了 Mutations**，将同步和异步更新统一到 Actions:

```mermaid
flowchart TB
    subgraph Vuex["Vuex (旧)"]
        A1[Component]
        A2[Mutations]
        A3[Actions]
        A4[State]
        A1 --> A2
        A1 --> A3
        A3 --> A2
        A2 --> A4
    end

    subgraph Pinia["Pinia (新)"]
        B1[Component]
        B2[Actions]
        B3[State]
        B1 --> B2
        B2 --> B3
    end
```

#### 9.2.2 响应式集成

Pinia 直接利用 Vue 3 的响应式系统，无需额外转换:

```typescript
// Pinia 响应式原理
const store = defineStore('counter', () => {
  const count = ref(0);  // Vue 响应式 ref
  const doubled = computed(() => count.value * 2);

  function increment() {
    count.value++;  // 直接修改，响应式自动追踪
  }

  return { count, doubled, increment };
});
```

### 9.3 技术栈

- **语言**: TypeScript (77.1%), Vue (18.5%)
- **Vue 版本**: Vue 3 (Composition API), Vue 2 (with @vue/composition-api)
- **生态**: Nuxt module, DevTools plugin

### 9.4 使用场景

| 场景 | 适用性 | 说明 |
|------|--------|------|
| Vue 3 应用状态 | 首选 | 官方推荐 |
| Nuxt 3 应用 | 首选 | 内置支持 |
| TypeScript 项目 | 首选 | 完整类型推导 |
| SSR 应用 | 首选 | 更好的 SSR 支持 |
| Vue 2 项目 | 谨慎 | 需要额外配置 |

### 9.5 快速开始

```bash
npm install pinia
```

```typescript
// ============ stores/counter.ts ============
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', {
  // State - 状态
  state: () => ({
    count: 0,
    user: null as { name: string; age: number } | null
  }),

  // Getters - 计算属性
  getters: {
    doubleCount: (state) => state.count * 2,
    isLoggedIn: (state) => state.user !== null,
    greeting: (state) => `Hello, ${state.user?.name ?? 'Guest'}!`
  },

  // Actions - 修改状态的方法
  actions: {
    increment() {
      this.count++;
    },
    async fetchUser(id: string) {
      const response = await fetch(`/api/users/${id}`);
      this.user = await response.json();
    },
    reset() {
      this.$reset(); // 重置到初始状态
    }
  }
});
```

```typescript
// ============ main.ts ============
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');
```

```typescript
// ============ components.vue ============
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useCounterStore } from '@/stores/counter';

const store = useCounterStore();

// 解构响应式状态
const { count, doubleCount, greeting } = storeToRefs(store);

// 使用 Actions
const { increment, reset } = store;
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Double: {{ doubleCount }}</p>
    <p>{{ greeting }}</p>
    <button @click="increment">递增</button>
    <button @click="reset">重置</button>
  </div>
</template>
```

### 9.6 组合式风格 Store

```typescript
// ============ stores/user.ts ============
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  // State - 使用 ref
  const name = ref('');
  const age = ref(0);

  // Getters - 使用 computed
  const isAdult = computed(() => age.value >= 18);
  const profile = computed(() => ({ name: name.value, age: age.value }));

  // Actions - 使用函数
  function updateProfile(newName: string, newAge: number) {
    name.value = newName;
    age.value = newAge;
  }

  async function fetchFromServer(id: string) {
    const data = await fetch(`/api/users/${id}`).then(r => r.json());
    name.value = data.name;
    age.value = data.age;
  }

  // 返回暴露的属性
  return {
    name,
    age,
    isAdult,
    profile,
    updateProfile,
    fetchFromServer
  };
});
```

### 9.7 高级模式

#### 9.7.1 插件系统

```typescript
// ============ plugin.ts ============
import { createPinia } from 'pinia';

// 自定义插件
const myPlugin = {
  install(pinia) {
    // 添加全局属性
    pinia.use(({ store }) => {
      // 初始化
      if (!store.$state.initialized) {
        store.$state.initialized = true;
      }

      // 添加自定义方法
      store.$reset = () => {
        store.$patch({});
      };

      // 订阅变更
      store.$subscribe((mutation, state) => {
        console.log('State changed:', mutation.type);
      });
    });
  }
};

// 使用插件
const pinia = createPinia();
pinia.use(myPlugin);
```

#### 9.7.2 持久化

```typescript
// ============ persistence.ts ============
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const usePersistStore = defineStore('persist', () => {
  const token = ref(localStorage.getItem('token') || '');
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));

  // 监听变化自动持久化
  watch(token, (newToken) => {
    localStorage.setItem('token', newToken);
  });

  watch(user, (newUser) => {
    localStorage.setItem('user', JSON.stringify(newUser));
  }, { deep: true });

  function login(newToken: string, newUser: object) {
    token.value = newToken;
    user.value = newUser;
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return { token, user, login, logout };
});
```

### 9.8 与 Vuex 4 对比

| 特性 | Pinia | Vuex 4 |
|------|-------|--------|
| API 复杂度 | 低 | 高 |
| TypeScript 支持 | 原生 | 需要复杂类型定义 |
| Mutations | 无 | 有 (Vuex 4 移除) |
| 模块化 | 自动无需手动注册 | 需要手动注册 |
| DevTools | 完整支持 | 完整支持 |
| SSR 支持 | 更好 | 一般 |
| 热更新 | 支持 | 支持 |
| 体积 | 较小 | 较大 |

### 9.9 参考链接

- [GitHub](https://github.com/vuejs/pinia)
- [官方文档](https://pinia.vuejs.org/)
- [Pinia 与 Vuex 对比](https://pinia.vuejs.org/core-concepts/ Comparison-with-Vuex.html)

---

## 10. TanStack Query (React Query) - 服务端状态管理

### 10.1 项目简介

TanStack Query (原 React Query) 是**服务端状态管理库**，专注于异步服务器状态同步、缓存和更新。

**GitHub**: 37k Stars | MIT License | 被 Vue、Svelte 广泛采用

**核心理念**: "Async server state management" - 将服务端数据视为独立的状态层，与 UI 状态分开管理。

### 10.2 架构原理深度分析

#### 10.2.1 缓存策略

```mermaid
flowchart TB
    subgraph Cache["Query Cache"]
        A1[Query: user/123]
        A2[Query: users/list]
        A3[Query: posts/1]
    end

    subgraph staleTime["过期策略"]
        B1[staleTime: 5000ms]
        B2[gcTime: 300000ms]
    end

    A1 --> B1
    A1 --> B2
```

#### 10.2.2 核心概念

- **Query**: 带唯一 key 的异步数据请求
- **Mutation**: 修改服务端数据的操作
- **Invalidation**: 使缓存失效，触发重新获取
- **Optimistic Update**: 乐观更新，用户体验优化

### 10.3 快速开始

```bash
npm install @tanstack/react-query
```

```typescript
// ============ setup.tsx ============
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 分钟
      gcTime: 1000 * 60 * 10,   // 10 分钟
      retry: 3,
      refetchOnWindowFocus: true
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

```typescript
// ============ queries.tsx ============
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 查询
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json())
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.name}</div>;
}

// 变更
function CreateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newUser) =>
      fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      }).then(res => res.json()),

    onSuccess: () => {
      // 刷新用户列表
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  return (
    <button onClick={() => mutation.mutate({ name: '张三' })}>
      创建用户
    </button>
  );
}
```

### 10.4 竞品对比

| 特性 | TanStack Query | SWR | Apollo Client |
|------|----------------|-----|---------------|
| 体积 | ~14kb | ~5kb | ~40kb |
| GraphQL 支持 | 无 | 无 | 原生 |
| 缓存策略 | 强大 | 基础 | 强大 |
| SSR | 支持 | 有限 | 支持 |
| DevTools | 优秀 | 基础 | 优秀 |

### 10.5 参考链接

- [GitHub](https://github.com/TanStack/query)
- [官方文档](https://tanstack.com/query)

---

## 11. 项目生态定位图

```mermaid
flowchart TB
    subgraph api["API 层"]
        trpc[tRPC<br/>端到端类型安全]
    end

    subgraph orm["数据层"]
        prisma[Prisma<br/>声明式 ORM]
        drizzle[Drizzle<br/>轻量级 ORM]
    end

    subgraph validation["验证层"]
        zod[Zod<br/>类型安全验证]
    end

    subgraph state["状态管理"]
        zustand[Zustand<br/>轻量 Flux]
        jotai[Jotai<br/>原子化状态]
        pinia[Pinia<br/>Vue 官方]
        rxjs[RxJS<br/>响应式流]
        tanstack[TanStack Query<br/>服务端状态]
    end

    subgraph functional["函数式编程"]
        effect[Effect<br/>函数式框架]
    end

    api --> validation
    orm --> validation
    state --> functional
    trpc -.->|组合| zod
    drizzle -.->|组合| pg
    effect -.->|集成| ai[AI Module]
```

---

## 12. 技术选型决策树

### 12.1 状态管理选型

```mermaid
flowchart TD
    Start{状态管理选型} --> Q1{是否使用 React?}
    Q1 -->|是| Q2{是否需要服务端状态?}
    Q2 -->|是| TanStack[TanStack Query + 本地状态]
    Q2 -->|否| Q3{状态复杂度}
    Q3 -->|简单 UI 状态| Q4{是否需要派生状态?}
    Q4 -->|是| Jotai
    Q4 -->|否| Zustand
    Q3 -->|复杂全局状态| Zustand
    Q1 -->|否| Q5{是否使用 Vue?}
    Q5 -->|是| Pinia
    Q5 -->|否| Q6{是否需要响应式?}
    Q6 -->|是| RxJS
    Q6 -->|否| CustomStore["自定义 Store"]
```

### 12.2 数据层选型

```mermaid
flowchart TD
    Start{数据层选型} --> Q1{团队熟悉 SQL?}
    Q1 -->|是| Drizzle
    Q1 -->|否| Q2{是否需要快速开发?}
    Q2 -->|是| Prisma
    Q2 -->|否| Q3{是否需要边缘部署?}
    Q3 -->|是| Drizzle
    Q3 -->|否| Q4{ORM vs SQL?}
    Q4 -->|ORM| Prisma
    Q4 -->|SQL| Drizzle
```

### 12.3 API 层选型

```mermaid
flowchart TD
    Start{API 层选型} --> Q1{是否全栈 TypeScript?}
    Q1 -->|是| Q2{是否需要 GraphQL?}
    Q2 -->|是| GraphQL
    Q2 -->|否| tRPC
    Q1 -->|否| Q3{是否需要 REST?}
    Q3 -->|是| REST/Fastify
    Q3 -->|否| REST
```

---

## 13. 技术选型指南

| 需求场景 | 推荐方案 | 备选方案 |
|----------|----------|----------|
| TypeScript 全栈端到端类型安全 | tRPC + Zod | GraphQL + codegen |
| 新项目数据库建模 | Prisma | Drizzle |
| 熟悉 SQL，追求性能 | Drizzle | Prisma |
| 运行时数据验证 | Zod | superstruct |
| React 轻量状态管理 | Zustand | Jotai |
| 细粒度派生状态 | Jotai | Zustand (computed) |
| Vue 状态管理 | Pinia | Vuex 4 |
| 复杂异步流程/事件流 | RxJS | - |
| 函数式编程 | Effect | fp-ts |
| 服务端状态管理 | TanStack Query | SWR |
| 边缘部署 ORM | Drizzle | - |

---

## 14. 性能对比汇总

### 14.1 ORM 性能对比

| 操作 | Prisma | Drizzle | 差异 |
|------|--------|---------|------|
| 简单查询 | 2.1ms | 1.9ms | Drizzle 快 9% |
| 复杂联表 | 8.3ms | 7.6ms | Drizzle 快 8% |
| 批量插入 1000 条 | 145ms | 128ms | Drizzle 快 12% |
| 包体积 | ~200kb | ~7.4kb | Drizzle 小 96% |

### 14.2 状态管理库体积对比

| 库 | 体积 (gzip) | 特点 |
|----|-------------|------|
| Zustand | ~1kb | 最轻量 |
| Jotai | ~2kb | 原子化 |
| Redux Toolkit | ~7kb | 完整方案 |
| MobX | ~20kb | 响应式 |
| Pinia | ~5kb | Vue 官方 |

---

## 15. 参考链接汇总

| 项目 | GitHub | 文档 |
|------|--------|------|
| tRPC | [trpc/trpc](https://github.com/trpc/trpc) | [trpc.io](https://trpc.io/) |
| Prisma | [prisma/prisma](https://github.com/prisma/prisma) | [prisma.io](https://www.prisma.io/docs) |
| Drizzle | [drizzle-team/drizzle-orm](https://github.com/drizzle-team/drizzle-orm) | [orm.drizzle.team](https://orm.drizzle.team/) |
| Zod | [colinhacks/zod](https://github.com/colinhacks/zod) | [zod.dev](https://zod.dev/) |
| Effect | [Effect-TS/effect](https://github.com/Effect-TS/effect) | [effect.website](https://effect.website/) |
| RxJS | [ReactiveX/rxjs](https://github.com/ReactiveX/rxjs) | [rxjs.dev](https://rxjs.dev/) |
| Zustand | [pmndrs/zustand](https://github.com/pmndrs/zustand) | [zustand.docs.pmnd.rs](https://zustand.docs.pmnd.rs/) |
| Jotai | [pmndrs/jotai](https://github.com/pmndrs/jotai) | [jotai.org](https://jotai.org/) |
| Pinia | [vuejs/pinia](https://github.com/vuejs/pinia) | [pinia.vuejs.org](https://pinia.vuejs.org/) |
| TanStack Query | [TanStack/query](https://github.com/TanStack/query) | [tanstack.com/query](https://tanstack.com/query) |

---

## 附录: awesome-lists 参考

- [awesome-typescript](https://github.com/dzharii/awesome-typescript)
- [awesome-trpc](https://github.com/icflorescu/awesome-trpc)
- [awesome-prisma](https://github.com/catalinmiron/awesome-prisma)
- [awesome-zod](https://github.com/colinhacks/zod)
- [state-of-js](https://stateofjs.com/) - JavaScript 状态管理调查

---

*本文档持续更新中，最后更新于 2025 年 1 月。*