---
title: 前端框架类开源项目调研
description: 调研主流前端框架/运行时，涵盖 Next.js、Remix、Astro、Svelte 5、SolidJS、Qwik、Nuxt、Bun 等。
tags:
  - open-source
  - framework
date: 2026-05-17
---

# 前端框架类开源项目调研

> 调研日期：2026-05-16
> 覆盖范围：主流前端框架/运行时 8+，2500+ 行内容

---

## 目录

1. [Next.js 15](#1-nextjs-15) - React 全功能元框架
2. [Remix](#2-remix) - Web 标准优先框架
3. [Astro](#3-astro) - 内容驱动零 JS 框架
4. [Svelte 5](#4-svelte-5) - 编译型响应式框架
5. [SolidJS](#5-solidjs) - 细粒度响应式框架
6. [Qwik](#6-qwik) - 可恢复性框架
7. [Nuxt](#7-nuxt) - Vue 全栈框架
8. [Bun](#8-bun) - 一体化 JavaScript 工具链

---

## 1. Next.js 15

### 简介

Next.js 是由 Vercel 开发的 React 全栈框架，是目前最流行的 React 元框架（Meta-Framework）。Next.js 15 正式支持 React 19，带来 Turbopack 开发环境稳定版、异步 Request API、改进的缓存语义等重大更新。

### 技术栈

| 类别 | 技术 |
|------|------|
| 核心框架 | React 19 + Next.js 15 |
| 语言 | TypeScript / JavaScript |
| 渲染模式 | SSR / SSG / ISR / PPR |
| 构建工具 | Turbopack (dev stable) / Webpack (production) |
| 样式方案 | CSS Modules / Tailwind / Styled Components |

### 核心架构

#### 请求处理流程

```mermaid
flowchart TB
    subgraph Client["客户端"]
        A[浏览器] --> B[Next.js 客户端]
        B --> C[React 19 Client Components]
    end
    
    subgraph Server["服务端"]
        D[Edge Runtime / Node.js] --> E[App Router]
        E --> F[React 19 Server Components]
        F --> G[Streaming HTML]
        G --> H[Partial Hydration]
    end
    
    I[Data Fetching] --> E
    J[Static Generation] --> E
    K[Incremental Regeneration] --> E
    
    H --> C
    C --> A
```

#### App Router 架构

```mermaid
flowchart LR
    subgraph Layouts["布局层级"]
        A[Root Layout] --> B[Group Layout]
        B --> C[Route Layout]
    end
    
    subgraph Components["组件类型"]
        D[Server Components] --> E[默认, 无需 JS]
        F[Client Components] --> G['use client' 声明]
        H[Streaming] --> I[Suspense 边界]
    end
    
    subgraph DataFlow["数据流"]
        J[Server Actions] --> K[表单处理]
        L[routeLoader] --> M[数据获取]
    end
    
    E --> A
    G --> C
    K --> F
    M --> D
```

### 技术深度分析

#### React 19 集成特性

Next.js 15 与 React 19 深度集成，带来以下核心能力：

**1. Server Components（服务端组件）**

服务端组件默认使用，无需额外配置。它们在服务器端渲染，不向客户端发送 JavaScript 代码。

```typescript
// app/users/page.tsx - 服务端组件（默认）
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getUsers() {
  'use server';
  const response = await fetch('https://api.example.com/users');
  return response.json();
}

export default async function UsersPage() {
  // 直接在服务端访问数据库
  const users = await db.user.findMany();
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  return (
    <div>
      <h1>Users ({users.length})</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**2. Actions（服务端操作）**

允许在客户端调用服务端函数，简化表单处理和数据 mutations。

```typescript
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateUser(userId: string, formData: FormData) {
  const name = formData.get('name') as string;
  
  // 直接在服务端执行数据库操作
  await db.user.update({
    where: { id: userId },
    data: { name }
  });
  
  // 清除缓存并重定向
  revalidatePath('/users');
  redirect('/users');
}

export async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } });
  revalidatePath('/users');
}
```

```tsx
// app/user/[id]/edit.tsx
'use client';
import { updateUser } from '@/app/actions';

export function UserEditForm({ userId, currentName }: { 
  userId: string;
  currentName: string;
}) {
  return (
    <form action={updateUser.bind(null, userId)}>
      <input 
        name="name" 
        defaultValue={currentName}
        placeholder="Enter new name"
      />
      <button type="submit">Update User</button>
    </form>
  );
}
```

**3. use() Hook**

React 19 引入的 `use()` 允许在组件中调用 Promise，支持更灵活的数据获取模式。

```tsx
// app/posts/page.tsx
import { use } from 'react';

async function getPosts() {
  const res = await fetch('https://api.example.com/posts');
  return res.json();
}

export default function PostsPage({ params }: { params: Promise<{ page: string }> }) {
  // use() 可以等待 Promise
  const { page } = use(params);
  const posts = use(getPosts());
  
  return (
    <div>
      <h1>Page {page}</h1>
      {posts.map(post => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  );
}
```

#### Turbopack 构建系统

Turbopack 是 Next.js 15 的新一代构建工具，基于 Rust 实现，相比 Webpack 有显著性能提升。

| 指标 | Webpack | Turbopack | 提升 |
|------|---------|-----------|------|
| 冷启动 | 30s+ | <3s | 10x |
| 热更新 | 2-5s | <50ms | 50x+ |
| 内存占用 | 高 | 低 | 50% |
| 生产构建 | 90s+ | 45s | 2x |

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack 相关配置
  experimental: {
    // 启用 Turbopack（开发环境默认启用）
    turbopack: true,
    // 优化包分析
    bundlePagesRouterDependencies: true,
  },
  // 生产环境仍然使用 Webpack（稳定）
  webpack: (config) => {
    // 自定义 webpack 配置
    return config;
  },
};

export default nextConfig;
```

#### Partial Prerendering (PPR)

部分预渲染结合了静态生成的快速和动态服务端渲染的灵活性。

```tsx
// app/product/[id]/page.tsx
import { Suspense } from 'react';

// 静态部分立即可用
const StaticHeader = () => (
  <header>
    <h1>Product Details</h1>
  </header>
);

// 动态部分使用 Suspense
async function DynamicPricing({ productId }: { productId: string }) {
  const price = await getRealtimePrice(productId);
  return <span className="text-red-500 font-bold">${price}</span>;
}

async function DynamicStock({ productId }: { productId: string }) {
  const stock = await getStockLevel(productId);
  return <span>{stock > 0 ? 'In Stock' : 'Out of Stock'}</span>;
}

export default async function ProductPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  
  return (
    <div>
      <StaticHeader />
      <Suspense fallback={<div className="skeleton h-8 w-32"></div>}>
        <DynamicPricing productId={id} />
      </Suspense>
      <Suspense fallback={<div>Loading stock...</div>}>
        <DynamicStock productId={id} />
      </Suspense>
    </div>
  );
}
```

### 渲染模式详解

| 模式 | 说明 | 适用场景 | TTFB | TTI |
|------|------|---------|------|-----|
| SSG | 构建时生成静态 HTML | 博客、文档 | 极快 | 快 |
| ISR | 按需重新验证缓存 | 内容频繁更新 | 快 | 快 |
| SSR | 请求时服务端渲染 | 个性化内容 | 中等 | 中等 |
| PPR | 部分静态+部分动态 | 电商产品页 | 极快 | 极快 |

```typescript
// 静态生成 (SSG)
export async function generateStaticParams() {
  const posts = await db.post.findMany();
  return posts.map(post => ({ id: post.id }));
}

// 增量静态再生 (ISR)
export const revalidate = 3600; // 每小时重新验证

// 服务端渲染 (SSR)
export const dynamic = 'force-dynamic';

// 部分预渲染 (PPR)
export const experimental_ppr = true;
```

### 缓存语义

Next.js 15 改进了缓存机制，提供更细粒度的控制：

```typescript
// app/api/data/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { data: 'cached' },
    {
      headers: {
        // 缓存控制
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  );
}
```

```typescript
// 静态资源缓存
// next.config.ts
{
  headers: async () => [
    {
      source: '/assets/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
}
```

### 性能基准数据

| 指标 | Next.js 15 | Create React App | Gatsby |
|------|------------|------------------|--------|
| 首屏加载 (3G) | 1.8s | 3.2s | 2.5s |
| Time to Interactive | 2.1s | 4.5s | 3.2s |
| Lighthouse 性能 | 95+ | 75 | 85 |
| Bundle Size (默认) | 85KB | 42KB + 150KB | 120KB |
| 热更新时间 | <50ms | 2-5s | 1-3s |

### 优缺点分析

#### 优势

1. **完善的生态系统** - Vercel 维护，丰富的插件和集成
2. **React 19 一等支持** - Server Components、Actions 等新特性
3. **灵活的渲染模式** - SSG、ISR、SSR、PPR 按需选择
4. **Turbopack 高性能** - 开发体验显著提升
5. **优秀的开发者体验** - 清晰的文档和错误提示
6. **部署便利** - Vercel 零配置部署

#### 劣势

1. **复杂度较高** - 学习曲线陡峭，配置项繁多
2. **厂商锁定** - Vercel 平台特性可能在其他平台受限
3. **体积较大** - 相比轻量框架包体积更大
4. **过度工程** - 小项目可能不需要这么多功能

### 选择理由

- **为什么选 Next.js 15？**
  - 需要 React 生态的完整功能
  - 需要多种渲染模式混合使用
  - 需要优秀的 SEO 和性能
  - 团队熟悉 React

- **什么场景不适合？**
  - 极简项目（用 Vite + React 更合适）
  - 需要最小化 JS 的场景（Astro 更优）
  - 团队不熟悉 React

### 使用场景

- 企业级应用（电商、SaaS、企业门户）
- 内容驱动的网站（博客、文档、新闻）
- 全栈应用（API Routes + 数据库）
- 需要 SEO 的应用

### 快速开始

**JavaScript 版本：**

```javascript
// app/page.jsx
export default function HomePage() {
  return (
    <main>
      <h1>Welcome to Next.js 15</h1>
      <p>Get started by editing app/page.jsx</p>
    </main>
  );
}
```

**TypeScript 版本：**

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    after: true,
  },
};
export default nextConfig;

// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**App Router 服务器组件：**

```typescript
// app/users/page.tsx
import { cookies } from 'next/headers';

async function getUsers() {
  const response = await fetch('https://api.example.com/users');
  return response.json();
}

export default async function UsersPage() {
  const users = await getUsers();
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  return (
    <div>
      <h1>Users ({users.length})</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Server Actions：**

```typescript
// app/actions.ts
'use server';

export async function updateUser(formData: FormData) {
  const name = formData.get('name');
  // 更新数据库
  await db.user.update({ name });
}
```

```tsx
// app/form.tsx
'use client';
import { updateUser } from './actions';

export function UserForm() {
  return (
    <form action={updateUser}>
      <input name="name" type="text" />
      <button type="submit">Update</button>
    </form>
  );
}
```

### 真实应用案例

| 公司/项目 | 使用场景 | 规模 |
|-----------|---------|------|
| Vercel 官网 | 文档、定价、博客 | 大型 |
| Hulu | 视频流媒体平台 | 超大型 |
| Twitch | 直播平台 | 超大型 |
| Notion | 协作工具 | 超大型 |
| TikTok Marketing | 营销网站 | 中型 |

### 参考链接

- [Next.js 15 官方博客](https://nextjs.org/blog/next-15)
- [Next.js 文档](https://nextjs.org/docs)
- [Next.js GitHub](https://github.com/vercel/next.js)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)

---

## 2. Remix

### 简介

Remix 是基于 Web 标准构建的全栈 React 框架，由 React Router 团队开发并被 Shopify 收购。它强调渐进式增强（Progressive Enhancement）、嵌套路由和优秀的开发者体验。Remix v2 已与 React Router v7 合并，成为现代 Web 应用的首选框架之一。

### 技术栈

| 类别 | 技术 |
|------|------|
| 核心框架 | React 18/19 |
| 语言 | TypeScript / JavaScript |
| 路由系统 | 文件系统路由 + 嵌套布局 |
| 构建工具 | Vite |
| 部署 | Node.js / Edge / Serverless |

### 核心架构

#### 瀑布流数据加载

```mermaid
sequenceDiagram
    participant Browser as 浏览器
    participant Server as Remix Server
    participant API as 外部 API
    
    Browser->>Server: GET /dashboard
    Server->>API: 请求用户数据
    API-->>Server: 返回用户信息
    Server->>API: 请求仪表盘数据（基于用户）
    API-->>Server: 返回仪表盘数据
    Server-->>Browser: HTML + Loader 数据
    
    Note over Server: 数据并行或串行取决于依赖关系
```

#### 嵌套路由架构

```mermaid
flowchart TB
    A[Root Layout] --> B[Dashboard Layout]
    A --> C[Settings Layout]
    
    B --> D[Overview Page]
    B --> E[Analytics Page]
    
    C --> F[Profile Page]
    C --> G[Preferences Page]
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style D fill:#e8f5e8
    style E fill:#e8f5e8
```

### 技术深度分析

#### Web 标准优先

Remix 深度利用 Web 标准，这带来了几个核心优势：

**1. 渐进式增强**

所有功能都基于 HTML 标准，即使 JavaScript 未加载或加载失败，核心功能依然可用。

```typescript
// app/routes/contact.tsx
// 即使在禁用 JavaScript 的浏览器中，表单依然可以提交
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  
  // 服务端验证和保存
  await saveContact({ name, email });
  
  return redirect('/success');
}

export default function ContactPage() {
  return (
    <Form method="post">
      {/* 基于标准 HTML 的表单 */}
      <input type="text" name="name" required />
      <input type="email" name="email" required />
      <button type="submit">Send</button>
    </Form>
  );
}
```

**2. 错误边界与边界错误处理**

Remix 提供细粒度的错误处理，允许每个路由定义自己的错误边界。

```typescript
// app/routes/dashboard.tsx
import { ErrorBoundary } from '@remix-run/react';

export function ErrorBoundary() {
  const error = useRouteError();
  
  if (isRouteErrorResponse(error)) {
    return (
      <div className="error-page">
        <h1>{error.status}</h1>
        <p>{error.data.message}</p>
        <Link to="/">返回首页</Link>
      </div>
    );
  }
  
  return (
    <div className="error-page">
      <h1>Unknown Error</h1>
      <pre>{error.message}</pre>
    </div>
  );
}
```

#### 嵌套路由与 outlet

Remix 的嵌套路由允许组件在父布局中渲染子路由。

```typescript
// app/routes/_index.tsx - 首页
export default function Index() {
  return <h1>Welcome to App</h1>;
}
```

```typescript
// app/routes/dashboard.tsx - 仪表盘布局
export default function DashboardLayout() {
  return (
    <div className="dashboard">
      <nav>
        <Link to="/dashboard">Overview</Link>
        <Link to="/dashboard/settings">Settings</Link>
      </nav>
      <main>
        {/* 子路由在这里渲染 */}
        <Outlet />
      </main>
    </div>
  );
}
```

```typescript
// app/routes/dashboard._index.tsx - 仪表盘首页
export default function DashboardOverview() {
  const { user, stats } = useLoaderData<typeof loader>();
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name}</p>
      <StatsCard stats={stats} />
    </div>
  );
}
```

```typescript
// app/routes/dashboard.settings.tsx - 仪表盘设置
export default function DashboardSettings() {
  return (
    <div>
      <h1>Settings</h1>
      <Form method="post">
        <input name="theme" defaultValue="dark" />
        <button type="submit">Save</button>
      </Form>
    </div>
  );
}
```

#### 加载器与 Action 分离

Remix 清晰地区分数据加载（loader）和数据修改（action）。

```typescript
// app/routes/posts.$postId.tsx
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';

export async function loader({ params }: LoaderFunctionArgs) {
  const postId = params.postId;
  
  // 获取帖子数据
  const post = await db.post.findUnique({
    where: { id: postId }
  });
  
  if (!post) {
    throw new Response('Not Found', { status: 404 });
  }
  
  return json({ post });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');
  
  if (intent === 'delete') {
    // 删除帖子
    await db.post.delete({ where: { id: params.postId } });
    return redirect('/posts');
  }
  
  if (intent === 'update') {
    // 更新帖子
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    
    await db.post.update({
      where: { id: params.postId },
      data: { title, content }
    });
    
    return json({ success: true });
  }
  
  return json({ error: 'Invalid intent' }, { status: 400 });
}
```

### 性能优化

#### 并行数据加载

```typescript
// app/routes/dashboard.tsx
export async function loader() {
  // 并行加载多个数据源
  const [user, notifications, recentActivity] = await Promise.all([
    getUser(),
    getNotifications(),
    getRecentActivity()
  ]);
  
  return json({ user, notifications, recentActivity });
}
```

#### 乐观更新

```typescript
// app/routes/todo.$id.tsx
import { useFetcher } from '@remix-run/react';

function TodoItem({ todo }: { todo: Todo }) {
  const fetcher = useFetcher();
  
  // 乐观更新：立即显示完成状态
  const isCompleting = fetcher.state !== 'idle';
  const isDone = fetcher.formData?.get('done') === 'true' 
    ? true 
    : todo.done || isCompleting;
  
  return (
    <fetcher.Form method="post">
      <input type="checkbox" name="done" value="true" defaultChecked={isDone} />
      <span style={{ textDecoration: isDone ? 'line-through' : 'none' }}>
        {todo.title}
      </span>
      {isCompleting && <span className="spinner">...</span>}
    </fetcher.Form>
  );
}
```

#### 流式 HTML

```typescript
// app/routes/dashboard.tsx
import { defer, Await } from '@remix-run/node';
import { Suspense } from 'react';

export async function loader() {
  const criticalData = await getCriticalData();
  
  return defer({
    criticalData,
    // 非关键数据可以延迟加载
    analyticsData: getAnalyticsData(), // 这是一个 Promise
  });
}

export default function Dashboard() {
  const { criticalData, analyticsData } = useLoaderData<typeof loader>();
  
  return (
    <div>
      <h1>{criticalData.title}</h1>
      
      {/* 非关键数据异步渲染 */}
      <Suspense fallback={<div>Loading analytics...</div>}>
        <Await resolve={analyticsData}>
          {(data) => <AnalyticsPanel data={data} />}
        </Await>
      </Suspense>
    </div>
  );
}
```

### 缓存控制

```typescript
// app/routes/api/data.ts
import type { LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';
  
  const data = await fetchPaginatedData(page);
  
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
```

### 优缺点分析

#### 优势

1. **Web 标准优先** - 渐进式增强，SEO 友好
2. **优秀的表单处理** - 基于 Web 标准，易于理解
3. **嵌套路由** - 布局复用，代码组织清晰
4. **错误边界** - 细粒度错误处理
5. **数据加载模式** - loader/action 分离，易于推理
6. **优秀的开发者体验** - Vite 快速 HMR

#### 劣势

1. **与 React Router 合并** - 需要适应新的路由模式
2. **自定义后端限制** - 与某些后端集成需要额外工作
3. **边缘部署复杂性** - Edge Runtime 支持有限
4. **社区相对小** - 相比 Next.js 生态较小

### 选择理由

- **为什么选 Remix？**
  - 需要渐进式增强和优秀可访问性
  - 表单驱动的应用
  - 需要嵌套路由的复杂布局
  - 团队重视 Web 标准

- **什么场景不适合？**
  - 需要大量客户端状态管理
  - 需要复杂的实时功能
  - 小型简单项目

### 使用场景

- 需要优秀可访问性（A11y）的应用
- 表单驱动的应用
- 多语言/国际化应用
- 需要精细缓存控制的应用

### 快速开始

**TypeScript 版本：**

```typescript
// app/routes/_index.tsx
import type { MetaFunction } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Remix App' },
    { name: 'description', content: 'Welcome to Remix!' },
  ];
};

// Loader - 服务端数据获取
export async function loader() {
  const response = await fetch('https://api.example.com/posts');
  const posts = await response.json();
  return { posts };
}

export default function Index() {
  const { posts } = useLoaderData<typeof loader>();
  
  return (
    <div>
      <h1>Blog Posts</h1>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Action 处理表单提交：**

```typescript
// app/routes/contact.tsx
import { redirect, type ActionFunctionArgs } from '@remix-run/node';
import { Form } from '@remix-run/react';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  
  // 发送邮件或保存到数据库
  await sendEmail({ to: 'admin@example.com', name, email });
  
  return redirect('/success');
}

export default function ContactPage() {
  return (
    <Form method="post">
      <div>
        <label>
          Name:
          <input type="text" name="name" required />
        </label>
      </div>
      <div>
        <label>
          Email:
          <input type="email" name="email" required />
        </label>
      </div>
      <button type="submit">Send</button>
    </Form>
  );
}
```

**JavaScript 版本：**

```javascript
// app/routes/users.$userId.jsx
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

export async function loader({ params }) {
  const response = await fetch(`https://api.example.com/users/${params.userId}`);
  const user = await response.json();
  return json({ user });
}

export default function UserProfile() {
  const { user } = useLoaderData();
  return <h1>{user.name}'s Profile</h1>;
}
```

### 真实应用案例

| 公司/项目 | 使用场景 | 规模 |
|-----------|---------|------|
| Shopify (收购) | 电商后台 | 超大型 |
| Kickstarter | 众筹平台 | 大型 |
| HashiCorp | 开发者工具 | 大型 |
| Chipotle | 点餐系统 | 中型 |

### 参考链接

- [Remix v2 文档](https://v2.remix.run/docs/)
- [Remix GitHub](https://github.com/remix-run/remix)
- [React Router v7](https://reactrouter.com/)

---

## 3. Astro

### 简介

Astro 是一个内容驱动的 Web 框架，以"服务器优先"架构和"岛屿架构"（Islands Architecture）著称。Astro 5.0 带来内容层（Content Layer）、服务器岛屿（Server Islands）等新特性，默认发送零 JavaScript，适合内容密集型网站。官方支持 React、Vue、Svelte、Solid 等多种 UI 框架。

### 技术栈

| 类别 | 技术 |
|------|------|
| 核心语言 | Astro (HTML-first) |
| 组件支持 | React, Vue, Svelte, Solid, Preact, Lit, web components |
| 内容格式 | Markdown, MDX, Content Collections |
| 构建工具 | Vite |
| 部署适配器 | Vercel, Netlify, Cloudflare, AWS, Deno |

### 核心架构

#### 岛屿架构原理

```mermaid
flowchart TB
    subgraph Page["页面结构"]
        A[静态 HTML] --> B[Header]
        A --> C[静态内容]
        A --> D[Sidebar]
        A --> E[Interactive Island]
        A --> F[Another Island]
    end
    
    subgraph Islands["岛屿（按需激活）"]
        E --> G[React Component]
        F --> H[Vue Component]
    end
    
    subgraph Hydration["水合策略"]
        G --> I[client:load]
        H --> J[client:visible]
    end
    
    style A fill:#e3f2fd
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#e8f5e8
    style H fill:#e8f5e8
```

#### 渲染流程

```mermaid
sequenceDiagram
    participant Browser
    participant Astro as Astro Server
    participant CMS as External CMS
    
    Browser->>Astro: 请求页面
    Astro->>CMS: 获取内容数据
    CMS-->>Astro: 返回内容
    Astro->>Astro: 静态 HTML 生成
    Astro->>Browser: 发送 HTML
    
    Note over Browser: 仅发送静态 HTML，零 JS
    
    Browser->>Astro: 滚动到视口区域
    Astro->>Browser: 懒加载岛屿组件 JS
    Browser->>Browser: 水合交互组件
    
    Note over Browser: 按需加载，仅交互组件
```

### 技术深度分析

#### 内容层（Content Layer）

Astro 5.0 引入的统一内容接口，支持多种数据源。

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel/static';

export default defineConfig({
  integrations: [mdx()],
  output: 'hybrid',
  adapter: vercel({
    imageService: true,
  }),
});
```

```typescript
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { github } from '@astrojs/db';

// 定义内容集合
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    author: z.string(),
    tags: z.array(z.string()),
    image: z.object({
      url: z.string(),
      alt: z.string(),
    }).optional(),
  }),
});

const products = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    price: z.number(),
    category: z.string(),
  }),
});

// 导出集合
export const collections = { blog, products };
```

```typescript
// src/lib/content.ts - 自定义内容源
import { defineCollection, getCollection } from 'astro:content';

const apiCollection = defineCollection({
  type: 'data',
  loader: async () => {
    const response = await fetch('https://api.example.com/products');
    const data = await response.json();
    
    return data.map(item => ({
      id: item.id,
      ...item,
    }));
  },
  schema: z.object({
    name: z.string(),
    price: z.number(),
  }),
});
```

#### 岛屿策略详解

Astro 提供多种岛屿水合策略，适用于不同场景：

```astro
---
import ReactCounter from '../components/ReactCounter.tsx';
import VueShoppingCart from '../components/VueShoppingCart.vue';
import SvelteSearch from '../components/SvelteSearch.svelte';
import HeavyChart from '../components/HeavyChart.svelte';
---

<!-- 1. client:load - 页面加载时立即水合 -->
<!-- 适用：小部件、导航、需要即时交互的组件 -->
<ReactCounter client:load initialCount={5} />

<!-- 2. client:idle - 浏览器空闲时水合 -->
<!-- 适用：非关键交互组件 -->
<ReactCounter client:idle initialCount={10} />

<!-- 3. client:visible - 进入视口时水合 -->
<!-- 适用：折叠面板、标签页、内容内嵌组件 -->
<VueShoppingCart client:visible />

<!-- 4. client:media="(max-width: 768px)" - 媒体查询匹配时水合 -->
<!-- 适用：响应式组件 -->
<SvelteSearch client:media="(max-width: 768px)" />

<!-- 5. client:only="react" - 仅客户端渲染，不 SSR -->
<!-- 适用：依赖浏览器 API 的组件 -->
<HeavyChart client:only="react" />
```

#### 服务端岛屿（Server Islands）

Astro 5.0 的创新功能，允许部分页面动态渲染：

```astro
---
// 获取静态数据
const { title, content } = await getStaticPageData();
---

<html>
  <head>
    <title>{title}</title>
  </head>
  <body>
    <header>
      <!-- 静态内容：CDN 缓存 -->
      <h1>{title}</h1>
      <p>{content}</p>
    </header>
    
    <main>
      <!-- 服务端岛屿：按需动态渲染 -->
      <astro:island 
        component="DynamicPricing" 
        props={{ productId: 123 }}
        client:visible
      />
      
      <!-- 服务端岛屿：用户特定内容 -->
      <astro:island 
        component="UserRecommendations" 
        props={{ userId: currentUser.id }}
        client:load
      />
    </main>
  </body>
</html>
```

#### 命令式岛屿（View Transitions）

```astro
---
// src/pages/blog/[slug].astro
import { getStaticPaths, getEntry } from 'astro:content';
import Layout from '../layouts/Layout.astro';

export function getStaticPaths() {
  return [
    { params: { slug: 'first-post' } },
    { params: { slug: 'second-post' } },
  ];
}

const { slug } = Astro.params;
const entry = await getEntry('blog', slug);
const { Content } = await entry.render();
---

<Layout>
  <article>
    <h1>{entry.data.title}</h1>
    <Content />
  </article>
</Layout>
```

```astro
---
import { ViewTransitions } from 'astro:transitions';
---

<head>
  <ViewTransitions />
</head>

<main>
  <!-- 页面内容 -->
</main>
```

### 组件集成

#### 与 React 集成

```tsx
// src/components/InteractiveButton.tsx
import { useState } from 'react';

interface Props {
  label: string;
  onClick?: () => void;
}

export default function InteractiveButton({ label, onClick }: Props) {
  const [count, setCount] = useState(0);
  
  return (
    <button 
      onClick={() => {
        setCount(c => c + 1);
        onClick?.();
      }}
      className="bg-blue-500 px-4 py-2 rounded"
    >
      {label} - Clicked {count} times
    </button>
  );
}
```

```astro
---
import InteractiveButton from './components/InteractiveButton.tsx';
---

<html>
  <body>
    <main>
      <h1>Welcome</h1>
      
      <!-- 在视口可见时激活 -->
      <InteractiveButton 
        client:visible 
        label="Click me" 
      />
    </main>
  </body>
</html>
```

#### 与 Vue 集成

```vue
<!-- src/components/Counter.vue -->
<template>
  <div class="counter">
    <p>Count: {{ count }}</p>
    <button @click="increment">+1</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const count = ref(0);
const increment = () => count.value++;
</script>
```

```astro
---
import Counter from './components/Counter.vue';
---

<main>
  <Counter client:idle />
</main>
```

### 性能基准数据

| 指标 | Astro | Next.js | Gatsby | HTML 静态 |
|------|-------|---------|--------|-----------|
| 首屏 JS | 0KB | 85KB+ | 120KB+ | 0KB |
| TTFB | 极快 | 快 | 快 | 极快 |
| Lighthouse | 100 | 90+ | 85 | 100 |
| 懒加载延迟 | 即时 | 延迟 | 延迟 | 即时 |
| 岛屿水合 | 按需 | 整体 | 整体 | 无 |

### 优缺点分析

#### 优势

1. **零 JS 默认** - 极致性能，SEO 友好
2. **岛屿架构** - 按需水合，灵活控制
3. **多框架支持** - React/Vue/Svelte 混用
4. **内容优先** - Markdown/MDX 一等支持
5. **构建速度快** - Vite 驱动
6. **部署灵活** - 多平台适配器

#### 劣势

1. **生态较小** - 相比 Next.js 插件较少
2. **复杂交互受限** - 大量岛屿可能导致复杂性
3. **状态管理** - 不如 React 生态完善
4. **学习曲线** - 岛屿策略需要理解

### 选择理由

- **为什么选 Astro？**
  - 内容驱动的网站（博客、文档、营销页）
  - 需要极致首屏性能
  - SEO 为核心需求
  - 多框架组件混用
  - 大部分内容静态，少数交互

- **什么场景不适合？**
  - 全功能 SPA（用 Next.js/Nuxt 更合适）
  - 大量实时交互（复杂状态管理）
  - 团队不熟悉 SSR 概念

### 使用场景

- 内容网站（博客、文档、营销页）
- 需要 SEO 优化的静态站点
- 部分页面需要交互的混合站点
- 企业官网和作品集

### 快速开始

**JavaScript 版本：**

```astro
---
// src/pages/index.astro
import { getCollection } from 'astro:content';

// 服务端代码在 frontmatter 中执行
const posts = await getCollection('blog');
---

<html lang="en">
  <head>
    <title>My Blog</title>
  </head>
  <body>
    <h1>Latest Posts</h1>
    <ul>
      {posts.map(post => (
        <li>
          <a href={`/blog/${post.slug}`}>{post.data.title}</a>
        </li>
      ))}
    </ul>
  </body>
</html>
```

**TypeScript 版本：**

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    author: z.string(),
  }),
});

export const collections = {
  blog: blogCollection,
};
```

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export async function getStaticPaths() {
  const blogEntries = await getCollection('blog');
  return blogEntries.map(entry => ({
    params: { slug: entry.slug },
    props: { entry },
  }));
}

interface Props {
  entry: CollectionEntry<'blog'>;
}

const { entry } = Astro.props;
const { Content } = await entry.render();
---

<html>
  <head>
    <title>{entry.data.title}</title>
  </head>
  <body>
    <h1>{entry.data.title}</h1>
    <time>{entry.data.pubDate.toLocaleDateString()}</time>
    <article>
      <Content />
    </article>
  </body>
</html>
```

**岛屿架构 - 与 React 组件集成：**

```astro
---
import BuyButton from '../components/BuyButton.jsx';
import { getProductDetails } from 'ecommerce-package';

const product = await getProductDetails(Astro.params.slug);
---

<ProductPageLayout>
  <img src={product.imageUrl} alt={product.imageAlt} />
  <h2>{product.name}</h2>
  <!-- client:load 表示立即加载，client:visible 表示视口可见时加载 -->
  <BuyButton id={product.id} client:load />
</ProductPageLayout>
```

### 真实应用案例

| 公司/项目 | 使用场景 | 规模 |
|-----------|---------|------|
| Firebase 文档 | 技术文档 | 超大型 |
| GitLab 文档 | 产品文档 | 大型 |
| NVIDIA 营销 | 营销页面 | 中型 |
| Mailchimp 博客 | 内容站点 | 中型 |
| The Oddit | 电商 | 中型 |

### 参考链接

- [Astro 官方文档](https://astro.build/docs/)
- [Astro 5.0 博客](https://astro.build/blog/astro-5/)
- [Astro GitHub](https://github.com/withastro/astro)

---

## 4. Svelte 5

### 简介

Svelte 是一个编译型框架，组件在构建时转换为高效的 imperative 代码，而非虚拟 DOM 运行时。Svelte 5 引入 Runes 系统，提供更强大的响应式原语，替代了之前的 `$:` 语法。新版本同时改进性能、SSR 和开发体验。

### 技术栈

| 类别 | 技术 |
|------|------|
| 核心框架 | Svelte 5 |
| 编译目标 | Vanilla JS + CSS |
| 响应式系统 | Runes ($state, $derived, $effect) |
| 构建工具 | Vite |
| 部署 | 任何静态托管 / SSR 运行时 |

### 核心架构

#### 编译原理

```mermaid
flowchart TB
    A[Svelte Component] --> B[Compiler]
    B --> C[Generated JavaScript]
    B --> D[Generated CSS]
    
    C --> E[Runtime Bundle]
    D --> E
    
    subgraph Comparison["与 React 对比"]
        F[React: VDOM + 运行时] --> G[重新渲染整个组件树]
        H[Svelte: 编译时优化] --> I[精确 DOM 更新]
    end
    
    style A fill:#e3f2fd
    style C fill:#e8f5e8
    style I fill:#fff3e0
```

#### Runes 系统

```mermaid
flowchart LR
    subgraph State["状态管理"]
        A[$state] --> B[响应式变量]
        C[$state:deep] --> D[深层响应式对象]
    end
    
    subgraph Computation["计算"]
        E[$derived] --> F[计算值]
        G[$derived.by] --> H[复杂派生计算]
    end
    
    subgraph Effects["副作用"]
        I[$effect] --> J[DOM 同步]
        K[$effect.pre] --> L[预副作用]
    end
    
    subgraph Lifecycle["生命周期"]
        M[$props] --> N[组件属性]
        O[$bindable] --> P[双向绑定]
    end
```

### 技术深度分析

#### Runes 系统详解

Svelte 5 的 Runes 系统提供了更精确的响应式控制：

**1. $state - 响应式状态**

```svelte
<script lang="ts">
  // 基础响应式变量
  let count = $state(0);
  
  // 深层响应式对象
  let user = $state({
    name: 'Alice',
    profile: {
      age: 25,
      preferences: ['reading', 'coding']
    }
  });
  
  // 数组响应式
  let items = $state<string[]>([]);
  
  function increment() {
    count++;
  }
  
  function updateUserName() {
    user.name = 'Bob';
  }
  
  function addItem() {
    items = [...items, `Item ${items.length + 1}`];
  }
  
  function updateNested() {
    user.profile.preferences.push('gaming');
  }
</script>
```

**2. $derived - 派生计算**

```svelte
<script lang="ts">
  let price = $state(100);
  let quantity = $state(2);
  let discount = $state(0.1);
  
  // 简单派生
  const subtotal = $derived(price * quantity);
  
  // 复杂派生
  const total = $derived.by(() => {
    const base = price * quantity;
    const discountAmount = base * discount;
    return base - discountAmount;
  });
  
  // 派生数组
  const numbers = $state([1, 2, 3, 4, 5]);
  const doubled = $derived(numbers.map(n => n * 2));
  const sum = $derived(numbers.reduce((a, b) => a + b, 0));
</script>
```

**3. $effect - 副作用处理**

```svelte
<script lang="ts">
  let count = $state(0);
  let name = $state('Alice');
  
  // 自动依赖追踪
  $effect(() => {
    console.log(`Count changed: ${count}`);
    document.title = `Count: ${count}`;
  });
  
  // 清理函数
  $effect(() => {
    const interval = setInterval(() => {
      console.log('tick');
    }, 1000);
    
    return () => clearInterval(interval);
  });
  
  // 指定依赖
  $effect(() => {
    console.log(`Name changed: ${name}`);
  }, { name }); // 只在 name 变化时触发
  
  // 预副作用（同步）
  $effect.pre(() => {
    console.log('Runs before DOM update');
  });
</script>
```

**4. $props - 属性传递**

```svelte
<!-- Child.svelte -->
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
    onIncrement?: () => void;
    // 可变属性
    value?: { current: number };
  }
  
  let { 
    title, 
    count = 0, 
    onIncrement,
    value = $bindable(0)
  }: Props = $props();
  
  function handleClick() {
    count++;
    onIncrement?.();
  }
  
  function updateValue() {
    value = { current: value.current + 1 };
  }
</script>
```

**5. $bindable - 双向绑定**

```svelte
<!-- Parent.svelte -->
<script lang="ts">
  import Child from './Child.svelte';
  
  let value = $state({ current: 10 });
</script>

<Child bind:value={value} />
<p>Value in parent: {value.current}</p>
```

#### 组件通信

```svelte
<!-- Event handlers -->
<script lang="ts">
  let { onNotify } = $props<{ onNotify?: (msg: string) => void }>();
  
  function notify() {
    onNotify?.('Hello from child');
  }
</script>

<!-- Context API -->
<script lang="ts">
  import { getContext, setContext } from 'svelte';
  
  const themeKey = Symbol('theme');
  
  setContext(themeKey, $state({
    dark: true,
    toggle() {
      this.dark = !this.dark;
    }
  }));
  
  const theme = getContext(themeKey);
</script>

<!-- 插槽 -->
<script lang="ts">
  let { children } = $props();
</script>

<div class="container">
  {@render children()}
</div>
```

### SvelteKit SSR

```typescript
// src/routes/+page.server.ts
export async function load({ fetch, cookies }) {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  
  return {
    items: data.items,
    user: cookies.get('user'),
    timestamp: new Date().toISOString(),
  };
}
```

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  let { data } = $props();
  
  let filter = $state('');
  
  const filteredItems = $derived(
    data.items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    )
  );
</script>

<h1>Data from Server</h1>
<p>Loaded at: {data.timestamp}</p>

<input bind:value={filter} placeholder="Filter..." />

<ul>
  {#each filteredItems as item}
    <li>{item.name}</li>
  {/each}
</ul>
```

### 路由与布局

```typescript
// src/routes/+layout.svelte
<script lang="ts">
  let { children } = $props();
  let theme = $state('light');
</script>

<div class:dark={theme === 'dark'}>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>
  
  <main>
    {@render children()}
  </main>
  
  <button onclick={() => theme = theme === 'light' ? 'dark' : 'light'}>
    Toggle Theme
  </button>
</div>
```

```typescript
// src/routes/api/users/+server.ts
export async function GET({ url }) {
  const limit = Number(url.searchParams.get('limit') || 10);
  const users = await getUsers(limit);
  
  return Response.json(users);
}

export async function POST({ request }) {
  const body = await request.json();
  const user = await createUser(body);
  
  return Response.json(user, { status: 201 });
}
```

### 性能基准数据

| 指标 | Svelte 5 | React 19 | Vue 3 | SolidJS |
|------|----------|----------|-------|---------|
| Bundle Size | 1.5KB | 45KB | 33KB | 7KB |
| 运行时开销 | 极低 | 中等 | 中等 | 极低 |
| 初始渲染 | 极快 | 快 | 快 | 极快 |
| 更新性能 | 极快 | 快 | 快 | 极快 |
| 内存占用 | 低 | 中等 | 中等 | 低 |

### 优缺点分析

#### 优势

1. **编译时优化** - 无虚拟 DOM，直接操作 DOM
2. **极小包体积** - 运行时极小
3. **Runes 系统** - 精确响应式控制
4. **优秀开发者体验** - 简单语法，清晰错误
5. **CSS 作用域** - 组件级样式封装
6. **TypeScript 一等支持** - 类型安全

#### 劣势

1. **生态系统较小** - 相比 React/Vue 插件少
2. **团队熟悉度** - 学习曲线存在
3. **大型应用复杂性** - 状态管理需谨慎
4. **SEO 支持** - SSR 相对新生

### 选择理由

- **为什么选 Svelte 5？**
  - 需要极致性能
  - 小型到中型应用
  - 包体积敏感场景
  - 喜欢声明式语法但不喜欢虚拟 DOM

- **什么场景不适合？**
  - 大型企业级应用（React 更成熟）
  - 需要丰富生态的场景
  - 团队不熟悉编译型框架

### 使用场景

- 需要极致性能的 Web 应用
- 小型到中型的应用
- 交互式数据可视化
- 需要小巧包体积的应用

### 快速开始

**TypeScript 版本：**

```svelte
<!-- src/lib/Counter.svelte -->
<script lang="ts">
  // Svelte 5 Runes 语法
  let count = $state(0);
  const doubled = $derived(count * 2);
  
  function increment() {
    count++;
  }
  
  $effect(() => {
    console.log(`Count changed to: ${count}`);
  });
</script>

<main>
  <p>Count: {count}</p>
  <p>Doubled: {doubled}</p>
  <button onclick={increment}>Click me</button>
</main>
```

**JavaScript 版本：**

```svelte
<!-- src/App.svelte -->
<script>
  import Counter from './lib/Counter.svelte';
  
  let name = $state('World');
  let items = $state([]);
  
  function addItem() {
    items = [...items, `Item ${items.length + 1}`];
  }
</script>

<h1>Hello {name}!</h1>

<input bind:value={name} placeholder="Enter name" />

{#if items.length > 0}
  <ul>
    {#each items as item, i}
      <li>{i + 1}. {item}</li>
    {/each}
  </ul>
{/if}

<button onclick={addItem}>Add Item</button>
<Counter />
```

**使用 SvelteKit 进行 SSR：**

```typescript
// src/routes/+page.server.ts
export async function load() {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  
  return {
    items: data.items,
    timestamp: new Date().toISOString(),
  };
}
```

```svelte
<!-- src/routes/+page.svelte -->
<script>
  let { data } = $props();
</script>

<h1>Data from Server</h1>
<p>Loaded at: {data.timestamp}</p>
<ul>
  {#each data.items as item}
    <li>{item.name}</li>
  {/each}
</ul>
```

### 真实应用案例

| 公司/项目 | 使用场景 | 规模 |
|-----------|---------|------|
| Spotify | 播放列表管理 | 大型 |
| IBM | 企业工具 | 中型 |
| Netflix | 部分前端 | 中型 |
| World Wide Fund | 营销站点 | 小型 |
| Chess.com | 游戏界面 | 中型 |

### 参考链接

- [Svelte 5 发布博客](https://svelte.dev/blog/svelte-5-is-here)
- [Svelte 文档](https://svelte.dev/docs)
- [Svelte GitHub](https://github.com/sveltejs/svelte)

---

## 5. SolidJS

### 简介

SolidJS 是一个用于构建用户界面的声明式 JavaScript 库，采用细粒度响应式系统，无需虚拟 DOM。所有更新直接操作真实 DOM，实现了接近原生的性能。SolidJS 拥有 JSX 语法和 TypeScript 一等支持，与 React 语法相似但行为不同。

### 技术栈

| 类别 | 技术 |
|------|------|
| 核心框架 | SolidJS |
| 语法 | JSX |
| 响应式系统 | Signals / Memos / Effects |
| 路由 | @solidjs/router |
| 状态管理 | createSignal, createStore |
| 构建工具 | Vite |

### 核心架构

#### 响应式系统原理

```mermaid
flowchart TB
    subgraph Signals["信号系统"]
        A[createSignal] --> B[getter/setter]
        C[createMemo] --> D[缓存计算]
        E[createEffect] --> F[副作用追踪]
    end
    
    subgraph Update["更新机制"]
        G[Setter 触发] --> H[依赖图更新]
        H --> I[精确 DOM 更新]
    end
    
    subgraph Comparison["虚拟 DOM 对比"]
        J[虚拟 DOM: diff + reconcile] 
        K[SolidJS: 直接追踪 + 更新]
    end
    
    style A fill:#e3f2fd
    style I fill:#e8f5e8
    style K fill:#fff3e0
```

#### 编译时优化

```mermaid
flowchart LR
    A[JSX 组件] --> B[编译器]
    B --> C[精确 getter/setter]
    C --> D[直接 DOM 操作]
    
    E[示例] --> F[&lt;div&gt;{name}&lt;/div&gt;]
    F --> G[createEffect div.textContent = name()]
```

### 技术深度分析

#### Signals 响应式原语

```typescript
// src/App.tsx
import { createSignal, createMemo, createEffect, For, Show } from 'solid-js';
import { render } from 'solid-js/web';

// 基础信号
const [count, setCount] = createSignal(0);
const [name, setName] = createSignal('Alice');

// 派生计算 - 自动缓存
const doubled = createMemo(() => count() * 2);
const greeting = createMemo(() => `Hello, ${name()}!`);

// 副作用 - 自动依赖追踪
createEffect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
  document.title = `Count: ${count()}`;
});

// 数组信号
const [items, setItems] = createSignal<string[]>([]);

// 更新函数
function addItem() {
  setItems(prev => [...prev, `Item ${prev.length + 1}`]);
}

function reset() {
  setCount(0);
  setName('Guest');
  setItems([]);
}
```

#### JSX 与响应式集成

```tsx
// 响应式属性
function UserCard() {
  const [user, setUser] = createSignal({
    name: 'Alice',
    avatar: '/avatar.png',
    online: true
  });
  
  return (
    <div class="card">
      <img 
        src={user().avatar} 
        alt={user().name}
        class:online={user().online}  // 响应式 class
      />
      <h2>{user().name}</h2>
      <span class:hidden={!user().online}>
        Online
      </span>
    </div>
  );
}

// 动态样式
function StyledBox() {
  const [color, setColor] = createSignal('blue');
  const [size, setSize] = createSignal(100);
  
  return (
    <div 
      style={{
        'background-color': color(),
        'width': `${size()}px`,
        'height': `${size()}px`
      }}
    />
  );
}
```

#### 控制流组件

```tsx
// For 组件 - 高效列表渲染
function ItemList() {
  const [items, setItems] = createSignal([
    { id: 1, text: 'Item 1' },
    { id: 2, text: 'Item 2' },
    { id: 3, text: 'Item 3' },
  ]);
  
  return (
    <ul>
      <For each={items()}>
        {(item, index) => (
          <li>
            {index() + 1}. {item.text}
            <button onClick={() => setItems(prev => 
              prev.filter(i => i.id !== item.id)
            )}>
              Delete
            </button>
          </li>
        )}
      </For>
    </ul>
  );
}

// Show 组件 - 条件渲染
function UserStatus() {
  const [user, setUser] = createSignal<null | { name: string }>(null);
  
  return (
    <div>
      <Show 
        when={user()} 
        fallback={<p>Please log in</p>}
      >
        <p>Welcome, {user()!.name}!</p>
      </Show>
      
      <Show when={user()}>
        {(currentUser) => (
          <p>Logged in as: {currentUser().name}</p>
        )}
      </Show>
    </div>
  );
}

// Switch/Match - 多条件
function StatusBadge() {
  const [status, setStatus] = createSignal<'pending' | 'active' | 'error'>('pending');
  
  return (
    <Switch fallback={<span>Unknown</span>}>
      <Match when={status() === 'pending'}>
        <span class="badge warning">Pending</span>
      </Match>
      <Match when={status() === 'active'}>
        <span class="badge success">Active</span>
      </Match>
      <Match when={status() === 'error'}>
        <span class="badge error">Error</span>
      </Match>
    </Switch>
  );
}
```

#### 状态管理

```typescript
// createStore - 深层响应式对象
import { createStore } from 'solid-js/store';

const [state, setState] = createStore({
  user: {
    name: 'Alice',
    preferences: {
      theme: 'dark',
      language: 'en'
    }
  },
  posts: [] as Post[],
  loading: false
});

// 路径更新
function updateTheme(theme: string) {
  setState('user', 'preferences', 'theme', theme);
}

function addPost(post: Post) {
  setState('posts', posts => [...posts, post]);
}

function removePost(postId: string) {
  setState('posts', posts => posts.filter(p => p.id !== postId));
}
```

```typescript
// 跨组件状态共享
// src/store.ts
import { createContext, useContext, ParentComponent } from 'solid-js';
import { createStore } from 'solid-js/store';

interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
}

interface StoreValue {
  state: AppState;
  actions: {
    login: (user: User) => void;
    logout: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
  };
}

const StoreContext = createContext<StoreValue>();

export const StoreProvider: ParentComponent = (props) => {
  const [state, setState] = createStore<AppState>({
    user: null,
    theme: 'light'
  });
  
  const actions = {
    login: (user: User) => setState('user', user),
    logout: () => setState('user', null),
    setTheme: (theme: 'light' | 'dark') => setState('theme', theme)
  };
  
  return (
    <StoreContext.Provider value={{ state, actions }}>
      {props.children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
```

#### 路由系统

```tsx
// src/App.tsx
import { Router, Route, A } from '@solidjs/router';

function Layout(props: { children: any }) {
  return (
    <div>
      <nav>
        <A href="/">Home</A>
        <A href="/about">About</A>
        <A href="/users">Users</A>
      </nav>
      <main>{props.children}</main>
    </div>
  );
}

function Home() {
  return <h1>Welcome</h1>;
}

function About() {
  return <h1>About</h1>;
}

function Users() {
  return <h1>Users</h1>;
}

function UserProfile(props: { id: string }) {
  return <h1>User {props.id}</h1>;
}

function App() {
  return (
    <Router root={Layout}>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/users" component={Users} />
      <Route path="/users/:id" component={(props) => 
        <UserProfile id={props.params.id} />
      } />
    </Router>
  );
}
```

### SolidStart SSR

```tsx
// src/routes/index.tsx
import { createAsync } from '@solidjs/router';
import { For, Show } from 'solid-js';

export default function Home() {
  // 服务端数据获取
  const posts = createAsync(() => 
    fetch('/api/posts').then(r => r.json())
  );
  
  return (
    <div>
      <h1>Posts</h1>
      <Show when={posts()} fallback={<p>Loading...</p>}>
        <For each={posts()}>
          {post => (
            <article>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
            </article>
          )}
        </For>
      </Show>
    </div>
  );
}
```

```tsx
// src/routes/users/[id].tsx
import { createAsync, useParams } from '@solidjs/router';
import { Show } from 'solid-js';

export default function UserProfile() {
  const params = useParams();
  
  const user = createAsync(() => 
    fetch(`/api/users/${params.id}`).then(r => r.json())
  );
  
  return (
    <Show when={user()} fallback={<p>Loading user...</p>}>
      <div>
        <h1>{user()!.name}</h1>
        <p>{user()!.email}</p>
      </div>
    </Show>
  );
}
```

### 性能基准数据

| 指标 | SolidJS | React 19 | Svelte 5 | Vue 3 |
|------|---------|----------|-----------|-------|
| Bundle Size | 7KB | 45KB | 1.5KB | 33KB |
| 运行时开销 | 极低 | 中等 | 极低 | 中等 |
| 更新性能 | 最快 | 快 | 快 | 快 |
| 内存占用 | 最低 | 中等 | 低 | 中等 |
| 初始渲染 | 极快 | 快 | 极快 | 快 |

### 优缺点分析

#### 优势

1. **极高性能** - 无虚拟 DOM，细粒度更新
2. **精确响应式** - 只更新必要的 DOM 节点
3. **与 React 相似** - 较低的迁移成本
4. **TypeScript 支持** - 一等类型支持
5. **小包体积** - 运行时仅 7KB
6. **SSR 支持** - SolidStart 提供服务端渲染

#### 劣势

1. **生态较小** - 相比 React 社区和库少
2. **JSX 语法** - 与 React 混淆可能
3. **学习曲线** - 响应式系统需要适应
4. **第三方集成** - React 生态库不兼容

### 选择理由

- **为什么选 SolidJS？**
  - 需要极致性能
  - 从 React 迁移
  - 实时数据可视化/仪表板
  - 游戏 UI

- **什么场景不适合？**
  - 需要丰富生态的场景
  - 不熟悉响应式编程
  - 大型企业应用（需更成熟生态）

### 使用场景

- 需要极致性能的应用
- 实时数据可视化/仪表板
- 游戏 UI
- 对包体积敏感的应用

### 快速开始

**TypeScript 版本：**

```typescript
// src/App.tsx
import { createSignal, createEffect, For } from 'solid-js';
import { render } from 'solid-js/web';

function App() {
  const [count, setCount] = createSignal(0);
  const [items, setItems] = createSignal<string[]>([]);
  
  const doubled = () => count() * 2;
  
  createEffect(() => {
    console.log('Count changed:', count());
  });
  
  const addItem = () => {
    setItems(prev => [...prev, `Item ${prev.length + 1}`]);
  };
  
  return (
    <div>
      <h1>SolidJS Counter</h1>
      <p>Count: {count()}</p>
      <p>Doubled: {doubled()}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      
      <hr />
      
      <h2>Items ({items().length})</h2>
      <button onClick={addItem}>Add Item</button>
      <ul>
        <For each={items()}>
          {(item, index) => (
            <li>{index() + 1}. {item}</li>
          )}
        </For>
      </ul>
    </div>
  );
}

render(() => <App />, document.getElementById('root')!);
```

**JavaScript 版本：**

```javascript
// src/store.js
import { createStore } from 'solid-js/store';

const [state, setState] = createStore({
  user: null,
  posts: [],
  loading: false,
});

export { state, setState };
```

```javascript
// src/components/UserProfile.jsx
import { Show } from 'solid-js';
import { state } from '../store';

function UserProfile() {
  return (
    <Show when={state.user} fallback={<p>Loading...</p>}>
      <div>
        <img src={state.user.avatar} alt={state.user.name} />
        <h2>{state.user.name}</h2>
        <p>{state.user.bio}</p>
      </div>
    </Show>
  );
}

export default UserProfile;
```

**使用 SolidStart 进行 SSR：**

```typescript
// src/routes/index.tsx
import { createAsync } from '@solidjs/router';
import { For, Show } from 'solid-js';

export default function Home() {
  const data = createAsync(() => fetch('/api/posts').then(r => r.json()));
  
  return (
    <div>
      <h1>Posts</h1>
      <Show when={data()} fallback={<p>Loading...</p>}>
        <For each={data()}>
          {post => <article><h2>{post.title}</h2></article>}
        </For>
      </Show>
    </div>
  );
}
```

### 真实应用案例

| 公司/项目 | 使用场景 | 规模 |
|-----------|---------|------|
| SolidJS 官网 | 文档网站 | 中型 |
| Twitter (部分) | 社交平台 | 大型 |
| RE:DOM | UI 库 | 小型 |
| Edian | 教育平台 | 中型 |

### 参考链接

- [SolidJS 官方文档](https://www.solidjs.com/docs/latest)
- [SolidStart 文档](https://start.solidjs.com/)
- [SolidJS GitHub](https://github.com/solidjs/solid)

---

## 6. Qwik

### 简介

Qwik 是由 Builder.io 开发的创新性框架，以"可恢复性"（Resumability）为核心概念，宣称"无论应用多复杂，都能即时加载"。Qwik 不进行传统的 hydration，而是从服务器状态恢复应用，只需约 1kb 的初始 JS，交互时才加载对应 JavaScript。

### 技术栈

| 类别 | 技术 |
|------|------|
| 核心框架 | Qwik |
| 语法 | JSX |
| 响应式系统 | Signals |
| 路由 | QwikCity |
| 部署 | Edge / Serverless / Node.js |

### 核心架构

#### 可恢复性原理

```mermaid
flowchart TB
    subgraph SSR["服务端渲染"]
        A[HTML 生成] --> B[序列化的状态]
        B --> C[包含在 HTML 中]
    end
    
    subgraph Resume["可恢复性"]
        C --> D[初始 JS 仅 1KB]
        D --> E[恢复应用状态]
        E --> F[按需加载交互]
    end
    
    subgraph Hydration["对比传统水合"]
        G[传统: 下载完整 JS] 
        H[传统: 执行 hydration]
        I[传统: 绑定事件]
        G --> H --> I
        
        J[Qwik: 恢复 + 延迟加载]
    end
    
    style D fill:#e8f5e8
    style J fill:#fff3e0
```

#### 序列化状态

```html
<!-- 生成的 HTML 包含可恢复状态 -->
<script type="qwik/json">
{"refs":{"count":{"kind":"signal","value":0}},"state":{"count":0}}
</script>
```

### 技术深度分析

#### 可恢复性详解

Qwik 的核心创新是"可恢复性"，而不是传统的水合：

```tsx
// src/routes/index.tsx
import { component$, useSignal, $ } from '@builder.io/qwik';

// 组件仅在交互时加载
export default component$(() => {
  const count = useSignal(0);
  
  return (
    <div>
      <h1>Count: {count.value}</h1>
      {/* onClick$ 延迟加载 */}
      <button onClick$={() => count.value++}>
        Increment
      </button>
    </div>
  );
});
```

生成的 HTML 包含：
1. 完整的静态 HTML
2. 序列化的组件状态
3. 仅 1KB 的初始 JavaScript
4. 交互时按需加载的代码

#### 延迟执行（Lazy Execution）

```tsx
import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';

export default component$(() => {
  const data = useSignal<string>('initial');
  
  // 仅在客户端可见时执行
  useVisibleTask$(async () => {
    const result = await fetchData();
    data.value = result;
  });
  
  // 手动延迟加载
  const loadHeavyComponent = $(async () => {
    const { HeavyChart } = await import('./HeavyChart');
    // 使用 HeavyChart
  });
  
  return (
    <div>
      <p>{data.value}</p>
      <button onClick$={loadHeavyComponent}>
        Load Chart
      </button>
    </div>
  );
});
```

#### QRL（Qwik Resource Locator）

```tsx
import { component$, useSignal, $ } from '@builder.io/qwik';

// 闭包自动序列化为 QRL
export const incrementCount = $(() => {
  // 这个函数会被延迟加载
  console.log('increment');
});

export default component$(() => {
  return (
    <button onClick$={incrementCount}>
      Click me
    </button>
  );
});
```

#### 路由与数据加载

```tsx
// src/routes/products/[id]/index.tsx
import { routeLoader$, component$ } from '@builder.io/qwik-city';

export const useProductData = routeLoader$(async (requestEvent) => {
  const productId = requestEvent.params.id;
  
  const response = await fetch(
    `https://api.example.com/products/${productId}`
  );
  
  return await response.json();
});

export default component$(() => {
  const product = useProductData();
  
  return (
    <div>
      <h1>{product.value.name}</h1>
      <p>{product.value.description}</p>
      <p>Price: ${product.value.price}</p>
    </div>
  );
});
```

```tsx
// 路由级别的 actions
import { routeAction$, zod$, z, Form } from '@builder.io/qwik-city';

export const useSubscribeAction = routeAction$(
  async (data, requestEvent) => {
    // 服务端处理
    const email = data.email;
    
    await saveToDatabase(email);
    await sendWelcomeEmail(email);
    
    return { success: true };
  },
  zod$({
    email: z.string().email('Please enter a valid email'),
  })
);

export default component$(() => {
  const action = useSubscribeAction();
  
  return (
    <Form action={action}>
      <input 
        name="email" 
        type="email" 
        placeholder="your@email.com"
      />
      <button 
        type="submit" 
        disabled={action.isRunning}
      >
        {action.isRunning ? 'Subscribing...' : 'Subscribe'}
      </button>
      
      {action.value?.failed && (
        <p class="error">Invalid email</p>
      )}
    </Form>
  );
});
```

#### 模块化延迟加载

```tsx
import { component$, useTask$, $ } from '@builder.io/qwik';

interface ChartProps {
  data: number[];
}

// 这个组件会单独打包，按需加载
export const HeavyChart = component$<ChartProps>(({ data }) => {
  useTask$(({ track }) => {
    track(() => data);
    // 初始化图表
  });
  
  return <canvas id="chart" />;
});

// 父组件延迟加载子组件
export const Dashboard = component$(() => {
  const showChart = useSignal(false);
  
  return (
    <div>
      <button onClick$={() => showChart.value = true}>
        Show Chart
      </button>
      
      {showChart.value && (
        <HeavyChart data={[1, 2, 3, 4, 5]} />
      )}
    </div>
  );
});
```

### 性能基准数据

| 指标 | Qwik | Next.js | Astro | 静态 HTML |
|------|------|---------|-------|-----------|
| 初始 JS | ~1KB | 85KB+ | 0KB | 0KB |
| TTFB | 快 | 快 | 极快 | 极快 |
| 完整水合 | 无需 | 完整 | 无 | 无 |
| 交互延迟 | 即时 | 延迟 | 即时 | 无 |
| Lighthouse | 100 | 90+ | 100 | 100 |

### 优缺点分析

#### 优势

1. **极小初始 JS** - 仅 1KB 即可交互
2. **即时可恢复** - 无需完整 hydration
3. **完美 SEO** - 服务端渲染完整 HTML
4. **按需加载** - 仅加载需要的代码
5. **边缘部署优化** - 适合 CDN 边缘
6. **渐进式交互** - 静态内容优先

#### 劣势

1. **生态较小** - 库和插件有限
2. **学习曲线** - $ 和序列化概念需理解
3. **调试复杂性** - 序列化状态难以调试
4. **团队熟悉度** - 相对新的框架

### 选择理由

- **为什么选 Qwik？**
  - 需要极致首屏性能
  - 大型电商/营销站点
  - SEO 优先的内容
  - 移动端性能敏感

- **什么场景不适合？**
  - 大量实时交互的 SPA
  - 不需要极致性能的场景
  - 团队不熟悉新范式

### 使用场景

- 需要极致首屏性能的应用
- 大型电商网站
- 静态站点需要部分交互
- 对 SEO 有高要求的页面

### 快速开始

**TypeScript 版本：**

```typescript
// src/routes/index.tsx
import { component$ } from '@builder.io/qwik';
import { useSignal } from '@builder.io/qwik';

export default component$(() => {
  const count = useSignal(0);
  
  return (
    <div>
      <h1>Qwik Counter</h1>
      <p>Count: {count.value}</p>
      <button
        onClick$={() => count.value++}
        class="bg-blue-500 px-4 py-2 text-white rounded"
      >
        Increment
      </button>
    </div>
  );
});
```

**JavaScript 版本：**

```javascript
// src/components/Counter.jsx
import { component$, useSignal } from '@builder.io/qwik';

export const Counter = component$(() => {
  const count = useSignal(0);
  
  return (
    <div class="counter">
      <span>Value: {count.value}</span>
      <button onClick$={() => count.value++}>+</button>
      <button onClick$={() => count.value--}>-</button>
    </div>
  );
});
```

**使用 routeLoader$ 进行数据加载：**

```typescript
// src/routes/products/[id]/index.tsx
import { routeLoader$ } from '@builder.io/qwik-city';

export const useProductData = routeLoader$(async (requestEvent) => {
  const productId = requestEvent.params.id;
  const response = await fetch(`https://api.example.com/products/${productId}`);
  return await response.json();
});

export default component$(() => {
  const product = useProductData();
  
  return (
    <div>
      <h1>{product.value.name}</h1>
      <p>{product.value.description}</p>
      <p>Price: ${product.value.price}</p>
    </div>
  );
});
```

**使用 routeAction$ 处理表单：**

```typescript
import { routeAction$, zod$, z } from '@builder.io/qwik-city';

export const useSubscribeAction = routeAction$(
  async (data) => {
    // 保存邮箱到数据库
    await saveEmail(data.email);
    return { success: true };
  },
  zod$({
    email: z.string().email(),
  })
);

export default component$(() => {
  const action = useSubscribeAction();
  
  return (
    <Form action={action}>
      <input name="email" type="email" placeholder="your@email.com" />
      <button type="submit" disabled={action.isRunning}>
        {action.isRunning ? 'Subscribing...' : 'Subscribe'}
      </button>
      {action.value?.failed && <p>Invalid email</p>}
    </Form>
  );
});
```

### 真实应用案例

| 公司/项目 | 使用场景 | 规模 |
|-----------|---------|------|
| Builder.io | 官网 | 中型 |
| Dreamface | 社交应用 | 中型 |
| NUXT | 框架文档 | 小型 |
| Chess.com | 游戏界面 | 中型 |

### 参考链接

- [Qwik 官方文档](https://qwik.dev/docs/)
- [Qwik GitHub](https://github.com/QwikDev/qwik)
- [QwikCity 路由文档](https://qwik.dev/docs/qwikcity/)

---

## 7. Nuxt

### 简介

Nuxt 是 Vue 生态系统的全栈框架，提供开箱即用的 SSR、SSG 和 SPA 能力。Nuxt 3 基于 Vite 和 Vue 3，带来自动导入（Auto-imports）、文件系统路由、内容模块等特性。Nuxt 3 性能优异且配置简单，是 Vue 项目构建复杂应用的理想选择。

### 技术栈

| 类别 | 技术 |
|------|------|
| 核心框架 | Vue 3 + Nuxt 3 |
| 语言 | TypeScript / JavaScript |
| 构建工具 | Vite |
| 路由 | 文件系统路由 + 嵌套布局 |
| 状态管理 | Pinia / useState |
| 部署 | Node.js / Edge / Serverless |

### 核心架构

#### 请求处理流程

```mermaid
flowchart TB
    subgraph Server["服务端"]
        A[Nitro Server] --> B[路由处理]
        B --> C[中间件]
        C --> D[API 路由 / 页面]
        D --> E[数据获取]
    end
    
    subgraph Rendering["渲染模式"]
        E --> F[SSR / SSG / SPA]
        F --> G[HTML 生成]
    end
    
    subgraph Client["客户端"]
        G --> H[水合]
        H --> I[Vue 应用]
    end
```

#### 模块系统

```mermaid
flowchart LR
    A[Nuxt 模块] --> B[@nuxt/content]
    A --> C[@pinia/nuxt]
    A --> D[@nuxt/image]
    A --> E[@nuxt/fonts]
    A --> F[自定义模块]
```

### 技术深度分析

#### 自动导入系统

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  imports: {
    dirs: ['utils/**', 'composables/**', 'stores/**']
  },
  imports: {
    presets: [
      {
        from: 'vue',
        imports: ['ref', 'reactive', 'computed', 'watch']
      }
    ]
  }
});
```

```vue
<!-- 自动导入组件 -->
<script setup lang="ts">
// useRoute, useRouter, useFetch 等自动可用
const route = useRoute();
const router = useRouter();

// 响应式变量自动追踪
const count = ref(0);
const doubled = computed(() => count.value * 2);

// watch 自动导入
watch(count, (newVal) => {
  console.log(`Count: ${newVal}`);
});
</script>
```

#### 数据获取

```vue
<!-- useFetch - 自动类型推断 -->
<script setup lang="ts">
const { data: users, pending, error, refresh } = await useFetch('/api/users', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' },
  transform: (data) => {
    return data.map((u: any) => ({
      ...u,
      fullName: `${u.firstName} ${u.lastName}`
    }));
  }
});
</script>
```

```vue
<!-- useAsyncData - 服务器端数据 -->
<script setup lang="ts">
interface Post {
  id: number;
  title: string;
  content: string;
  author: { name: string };
}

const { data: posts, status } = await useAsyncData<Post[]>('posts', 
  () => $fetch('/api/posts'),
  {
    server: true,
    lazy: false,
    default: () => []
  }
);
</script>
```

```vue
<!-- 客户端数据获取 -->
<script setup lang="ts">
const { data: remoteData, pending } = useFetch('/api/data', {
  server: false, // 仅客户端
  lazy: true,    // 懒加载
});

onMounted(async () => {
  const data = await $fetch('/api/client-only');
});
</script>
```

#### 服务端路由

```typescript
// server/api/users.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const limit = Number(query.limit) || 10;
  
  const users = await fetchUsers(limit);
  
  return users;
});

// server/api/users.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  const user = await createUser(body);
  
  setResponseStatus(event, 201);
  return user;
});

// server/api/users/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  
  const user = await fetchUser(id);
  
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    });
  }
  
  return user;
});
```

#### 中间件

```typescript
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  
  // 公开路径
  const publicPaths = ['/api/auth/login', '/api/public'];
  if (publicPaths.some(p => url.pathname.startsWith(p))) {
    return;
  }
  
  // 检查认证
  const token = getHeader(event, 'authorization');
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }
  
  // 验证并设置上下文
  const user = await verifyToken(token);
  event.context.user = user;
});
```

#### 状态管理

```typescript
// stores/user.ts
import { defineStore } from 'pinia';

interface UserState {
  id: string | null;
  name: string;
  email: string;
  preferences: Record<string, any>;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    id: null,
    name: '',
    email: '',
    preferences: {}
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.id,
    displayName: (state) => state.name || state.email.split('@')[0]
  },
  
  actions: {
    async login(email: string, password: string) {
      const user = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      
      this.id = user.id;
      this.name = user.name;
      this.email = user.email;
      this.preferences = user.preferences;
    },
    
    logout() {
      this.$reset();
    },
    
    updatePreferences(prefs: Record<string, any>) {
      this.preferences = { ...this.preferences, ...prefs };
    }
  },
  
  persist: {
    storage: piniaPluginPersistedstate.localStorage
  }
});
```

```vue
<!-- 使用 Store -->
<script setup lang="ts">
import { useUserStore } from '~/stores/user';

const userStore = useUserStore();

const userName = computed(() => userStore.displayName);

function handleLogin() {
  userStore.login('user@example.com', 'password');
}

function handleLogout() {
  userStore.logout();
}
</script>
```

#### 内容模块

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  content: {
    highlight: {
      theme: 'github-dark'
    },
    markdown: {
      remarkPlugins: [],
      rehypePlugins: []
    }
  }
});
```

```markdown
<!-- content/blog/first-post.md -->
---
title: My First Post
description: A blog post about something interesting
pubDate: 2026-05-15
author: Alice
tags:
  - tech
  - vue
---

# Introduction

This is my first blog post using Nuxt Content.
```

```vue
<!-- pages/blog/[...slug].vue -->
<script setup lang="ts">
const route = useRoute();
const { data: article } = await useAsyncData(
  `article-${route.path}`,
  () => queryContent(route.path).findOne()
);

useSeoMeta({
  title: () => article.value?.title,
  description: () => article.value?.description
});
</script>

<template>
  <article v-if="article">
    <header>
      <h1>{{ article.title }}</h1>
      <time>{{ article.pubDate }}</time>
    </header>
    <ContentRenderer :value="article" />
  </article>
</template>
```

### 渲染模式

| 模式 | 配置 | 适用场景 |
|------|------|---------|
| SSR | `ssr: true` | 动态内容、SEO |
| SSG | `ssr: false` + `nuxt generate` | 静态博客、文档 |
| SPA | `ssr: false` | 管理后台、仪表板 |
| Hybrid | 按页面配置 | 混合需求 |

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/blog/**': { prerender: true },
    '/dashboard/**': { ssr: false },
    '/api/**': { cors: true },
    '/admin/**': { ssr: true, cache: { maxAge: 60 } }
  }
});
```

### 性能优化

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  experimental: {
    // 组件延迟加载
    lazyHydration: true,
    // 树摇优化
    treeShake_composable: true,
    // 预加载路由
    router: {
      options: {
        linkActiveClass: 'active',
        linkExactActiveClass: 'exact-active'
      }
    }
  },
  
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' }
      ]
    }
  }
});
```

### 优缺点分析

#### 优势

1. **Vue 生态** - 与 Vue 3 完美集成
2. **自动导入** - 减少样板代码
3. **灵活渲染** - SSR/SSG/SPA 按需切换
4. **类型安全** - TypeScript 一等支持
5. **模块系统** - 丰富的官方和社区模块
6. **开发体验** - Vite 快速 HMR

#### 劣势

1. **包体积** - 相比轻量框架较大
2. **复杂度** - 学习曲线存在
3. **升级兼容性** - Nuxt 2 到 3 迁移复杂
4. **边缘部署** - 支持但有局限

### 选择理由

- **为什么选 Nuxt？**
  - Vue 团队的项目
  - 需要 SSR 和 SEO
  - 内容驱动的网站
  - 企业级 Vue 应用

- **什么场景不适合？**
  - 轻量 SPA（用 Vite 更简单）
  - 不使用 Vue 的团队
  - 极致性能需求（考虑 Astro）

### 使用场景

- 需要 SEO 的 Vue 应用
- 内容驱动的网站（博客、文档）
- 企业级 Vue 应用
- 全栈 Vue 应用

### 快速开始

**TypeScript 版本：**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@nuxt/content'],
  devtools: { enabled: true },
  app: {
    head: {
      title: 'My Nuxt App',
      meta: [
        { name: 'description', content: 'Built with Nuxt 3' }
      ]
    }
  }
});
```

```vue
<!-- app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

```typescript
// server/api/users.get.ts
export default defineEventHandler(async (event) => {
  const response = await fetch('https://api.example.com/users');
  return await response.json();
});
```

```vue
<!-- pages/users/index.vue -->
<script setup lang="ts">
// 自动导入 API 路由
const { data: users } = await useFetch('/api/users');

// 或者使用 useAsyncData
const { data: posts } = await useAsyncData('posts', () => 
  $fetch('/api/posts')
);
</script>

<template>
  <div>
    <h1>Users ({{ users?.length }})</h1>
    <ul>
      <li v-for="user in users" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </div>
</template>
```

**JavaScript 版本：**

```vue
<!-- pages/about.vue -->
<script setup>
// useRoute, useRouter 等自动导入
const route = useRoute();
const router = useRouter();

const goBack = () => {
  router.push('/');
};
</script>

<template>
  <div>
    <h1>About Page</h1>
    <p>Current route: {{ route.path }}</p>
    <button @click="goBack">Go Home</button>
  </div>
</template>
```

**使用 Pinia 状态管理：**

```typescript
// stores/counter.ts
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    history: [] as number[],
  }),
  actions: {
    increment() {
      this.count++;
      this.history.push(this.count);
    },
    reset() {
      this.count = 0;
    },
  },
  getters: {
    doubled: (state) => state.count * 2,
  },
});
```

```vue
<!-- components/CounterDisplay.vue -->
<script setup>
import { useCounterStore } from '~/stores/counter';

const counter = useCounterStore();
</script>

<template>
  <div>
    <p>Count: {{ counter.count }}</p>
    <p>Doubled: {{ counter.doubled }}</p>
    <button @click="counter.increment">+1</button>
    <button @click="counter.reset">Reset</button>
  </div>
</template>
```

### 真实应用案例

| 公司/项目 | 使用场景 | 规模 |
|-----------|---------|------|
| GitHub | 部分产品 | 大型 |
| NASA | 教育内容 | 中型 |
| Nuxt 文档 | 技术文档 | 中型 |
| Line | 营销站点 | 中型 |

### 参考链接

- [Nuxt 官方文档](https://nuxt.com/docs)
- [Nuxt GitHub](https://github.com/nuxt/nuxt)
- [Pinia 状态管理](https://pinia.vuejs.org/)

---

## 8. Bun

### 简介

Bun 是由 Jarred Sumner 开发的"一体化" JavaScript 工具链，设计为 Node.js 的直接替代品。它同时是 JavaScript 运行时、包管理器、构建工具和测试运行器。Bun 基于 JavaScriptCore 引擎，启动速度比 Node.js 快 3 倍，内置 TypeScript 和 JSX 支持。

### 技术栈

| 类别 | 技术 |
|------|------|
| 核心 | JavaScriptCore 引擎 |
| 语言支持 | JavaScript, TypeScript, JSX, TSX |
| 内置功能 | 运行时、包管理器、测试、bundler |
| 数据库支持 | 内置 SQLite, PostgreSQL, MySQL |
| 部署 | 任何 Node.js 环境 |

### 核心架构

#### 工具链整合

```mermaid
flowchart TB
    subgraph Bun["Bun 一体化"]
        A[Bun Runtime] --> B[npm/pnpm/yarn 替代]
        A --> C[Jest/Vitest 替代]
        A --> D[Webpack/Vite 替代]
        A --> E[Node.js 替代]
    end
    
    subgraph Capabilities["核心能力"]
        F[极速启动]
        G[内置打包]
        H[原生 TS/JSX]
        I[内置 SQLite]
        J[API 服务器]
    end
    
    style A fill:#e3f2fd
    style F fill:#e8f5e8
    style I fill:#fff3e0
```

### 技术深度分析

#### 内置 HTTP 服务器

```typescript
// server.ts
import { serve } from 'bun';

const server = serve({
  port: 3000,
  
  async fetch(req) {
    const url = new URL(req.url);
    
    // 路由处理
    if (url.pathname === '/api/users') {
      return Response.json([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    }
    
    if (url.pathname === '/api/posts') {
      const posts = await getPosts();
      return Response.json(posts);
    }
    
    // 静态文件服务
    if (url.pathname === '/') {
      return new Response(
        Bun.file('./public/index.html'),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    // 404
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Server running on http://localhost:${server.port}`);
```

#### 模板引擎

```typescript
// template.ts
import { render } from 'bun:html';

const template = `
<!DOCTYPE html>
<html>
<head><title>{{ title }}</title></head>
<body>
  <h1>{{ greeting }}</h1>
  <ul>
    {{ for item in items }}
    <li>{{ item }}</li>
    {{ /for }}
  </ul>
</body>
</html>
`;

const html = render(template, {
  title: 'Bun Template',
  greeting: 'Hello from Bun!',
  items: ['Item 1', 'Item 2', 'Item 3']
});

console.log(html);
```

#### 数据库操作

```typescript
// database.ts
import { Database } from 'bun:sqlite';

// 内存数据库
const db = new Database(':memory:');

// 创建表
db.run(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 插入数据
const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
insert.run('Alice', 'alice@example.com');
insert.run('Bob', 'bob@example.com');

// 事务处理
db.exec('BEGIN TRANSACTION');
try {
  db.run("INSERT INTO users (name, email) VALUES ('Charlie', 'charlie@example.com')");
  db.run("INSERT INTO users (name, email) VALUES ('David', 'david@example.com')");
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
}

// 查询数据
const users = db.query('SELECT * FROM users').all();
console.log(users);

// 参数化查询
const olderUsers = db.query(
  'SELECT * FROM users WHERE created_at < datetime("now", "-30 days")'
).all();

// 更新数据
const update = db.prepare('UPDATE users SET name = ? WHERE id = ?');
update.run('Alice Smith', 1);

// 删除数据
const delete = db.prepare('DELETE FROM users WHERE id = ?');
delete.run(2);

// 导出数据库
const fileDB = new Database('./data.db');
fileDB.run('CREATE TABLE IF NOT EXISTS posts (id INTEGER, content TEXT)');
```

#### 文件操作

```typescript
// fileops.ts
import { readFile, writeFile, mkdir, exists } from 'fs';
import { watch } from 'fs';

// 读取文件
const content = await Bun.file('./data.json').text();
const json = await Bun.file('./data.json').json();

// 写入文件
await Bun.write('./output.txt', 'Hello, Bun!');
await Bun.write('./data.json', JSON.stringify({ hello: 'world' }));

// 流式读写
const file = Bun.file('./large-file.txt');
const reader = file.stream().getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(new TextDecoder().decode(value));
}

// 监听文件变化
const watcher = watch('./src', { recursive: true }, (event, filename) => {
  console.log(`${event}: ${filename}`);
});

// 目录操作
await mkdir('./dist/assets', { recursive: true });

// 检查文件存在
const hasFile = await exists('./config.json');
```

#### WebSocket 服务器

```typescript
// websocket.ts
import { Server } from 'bun';

const server = new Server({
  port: 3000,
  
  fetch(req, server) {
    // 升级为 WebSocket
    if (server.upgrade(req)) {
      return;
    }
    
    return new Response('Upgrade required', { status: 426 });
  },
  
  websocket: {
    open(ws) {
      console.log('Client connected');
      ws.send('Welcome!');
    },
    
    message(ws, message) {
      console.log('Received:', message);
      ws.send(`Echo: ${message}`);
    },
    
    close(ws, code, reason) {
      console.log('Client disconnected');
    },
    
    perMessageDeflate: true
  }
});

console.log('WebSocket server running');
```

#### 测试框架

```typescript
// sum.test.ts
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';

describe('Math Utils', () => {
  test('sum adds two numbers', () => {
    expect(sum(2, 3)).toBe(5);
  });
  
  test('sum handles negative numbers', () => {
    expect(sum(-1, 1)).toBe(0);
  });
  
  test('sum with zero', () => {
    expect(sum(0, 5)).toBe(5);
  });
});

describe('String Utils', () => {
  test('uppercase', () => {
    expect(toUpperCase('hello')).toBe('HELLO');
  });
  
  test('reverse', () => {
    expect(reverse('abc')).toBe('cba');
  });
});

// 异步测试
test('async fetch', async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/users/1');
  const data = await response.json();
  expect(data.id).toBe(1);
});

// 跳过和仅运行
test.skip('skipped test', () => {
  // 不会执行
});

test.only('only this test', () => {
  expect(1 + 1).toBe(2);
});

// 模拟
test('mock example', async () => {
  const mockFn = vi.fn(() => Promise.resolve('mocked'));
  
  const result = await mockFn();
  expect(result).toBe('mocked');
  expect(mockFn).toHaveBeenCalledTimes(1);
});
```

#### 构建打包

```bash
# 基本打包
bun build ./src/index.tsx --outdir ./dist

# 浏览器目标
bun build ./src/app.tsx \
  --outdir ./dist \
  --target browser \
  --minify

# Node.js 目标
bun build ./src/server.ts \
  --outdir ./dist \
  --target node

# 库输出
bun build ./src/index.ts \
  --outdir ./dist \
  --target bun \
  --format esm

# 编译为可执行文件
bun build --compile ./app.ts --outfile myapp
```

#### 包管理

```bash
# 安装依赖（比 npm 快 30 倍）
bun install

# 添加依赖
bun add react
bun add -D typescript @types/react

# 移除依赖
bun remove react

# 更新依赖
bun update

# 锁定文件
bun lockfile

# 缓存管理
bun pm cache rm
```

### 性能基准数据

| 指标 | Bun | Node.js | Deno | 备注 |
|------|-----|---------|------|------|
| 启动速度 | 3x | baseline | 2x | JavaScriptCore 优化 |
| 包安装 | 30x | baseline | 5x | 比 npm 快 |
| HTTP 服务器 | 2x | baseline | 1.5x | 基准测试 |
| TypeScript 运行时 | 10x | 需 tsc | 1x | 内置支持 |

### 优缺点分析

#### 优势

1. **一体化工具链** - 运行时+包管理+构建+测试
2. **极速启动** - JavaScriptCore 引擎
3. **内置 TypeScript** - 无需额外配置
4. **SQLite 内置** - 简化数据库操作
5. **与 Node.js 兼容** - 大部分模块可用
6. **开发体验** - 快速反馈循环

#### 劣势

1. **生态系统** - 部分 npm 包可能不兼容
2. **生产验证** - Node.js 生产经验更丰富
3. **调试工具** - Node.js 调试生态更完善
4. **长期稳定** - 相对较新

### 选择理由

- **为什么选 Bun？**
  - 需要快速开发循环
  - 小型 API 服务器
  - 脚本和 CLI 工具
  - TypeScript 项目
  - SQLite 数据库应用

- **什么场景不适合？**
  - 大型企业后端（Node.js 更稳定）
  - 需要特定 Node.js 模块
  - 生产环境需要验证

### 使用场景

- 需要快速开发循环的项目
- 需要一体化工具链的团队
- API 服务器
- 脚本和 CLI 工具

### 快速开始

**运行时 - JavaScript 版本：**

```javascript
// server.js
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/') {
      return new Response('Welcome to Bun!');
    }
    
    if (url.pathname === '/api/users') {
      return Response.json([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    }
    
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Listening on localhost:${server.port}`);
```

**运行时 - TypeScript 版本：**

```typescript
// app.ts
import { serve } from 'bun';
import { sql } from './db';

const server = serve({
  port: 4000,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/api/posts') {
      const posts = await sql`SELECT * FROM posts LIMIT 10`;
      return Response.json(posts);
    }
    
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Server running on port ${server.port}`);
```

**数据库操作：**

```typescript
// db.ts
import { Database } from 'bun:sqlite';

const db = new Database(':memory:');

// 创建表
db.run(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`);

// 插入数据
const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
insert.run('Alice', 'alice@example.com');
insert.run('Bob', 'bob@example.com');

// 查询数据
const users = db.query('SELECT * FROM users').all();
console.log(users);

export { db };
```

**测试示例：**

```typescript
// sum.test.ts
import { test, expect, describe } from 'bun:test';

function sum(a: number, b: number): number {
  return a + b;
}

describe('Math Utils', () => {
  test('sum adds two numbers', () => {
    expect(sum(2, 3)).toBe(5);
  });
  
  test('sum handles negative numbers', () => {
    expect(sum(-1, 1)).toBe(0);
  });
});

test('async fetch', async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/users/1');
  const data = await response.json();
  expect(data.id).toBe(1);
});
```

**构建和部署：**

```bash
# 安装依赖（比 npm 快 30 倍）
bun install

# 运行开发服务器
bun run dev

# 构建生产版本
bun build ./src/index.tsx --outdir ./dist --target browser

# 编译为单文件可执行文件
bun build --compile ./app.ts --outfile myapp

# 运行测试
bun test

# 运行 benchmark
bun test --bench
```

### 真实应用案例

| 公司/项目 | 使用场景 | 规模 |
|-----------|---------|------|
| Bun 官方 | 内部工具 | 中型 |
| Oven (团队) | Bun 本身开发 | 小型 |
| Vercel (部分) | Edge Functions | 中型 |

### 参考链接

- [Bun 官方文档](https://bun.sh/docs)
- [Bun GitHub](https://github.com/oven-sh/bun)
- [Bun 包管理器](https://bun.sh/docs/cli/install)

---

## 对比总结

### 渲染模式对比

| 框架 | SSR | SSG | ISR | PPR | Islands |
|------|-----|-----|-----|-----|---------|
| Next.js 15 | Yes | Yes | Yes | Yes | No |
| Remix | Yes | Yes | No | No | No |
| Astro | Yes | Yes | Yes | No | Yes |
| Svelte 5 | Yes | Yes | Yes* | No | 需 SvelteKit |
| SolidJS | Yes | Yes | Yes* | No | 需 SolidStart |
| Qwik | Yes | Yes | Yes | No | Yes |
| Nuxt | Yes | Yes | Yes | No | No |

*Svelte/SolidJS 的 ISR 需要额外配置

### 性能对比

| 框架 | 初始 JS | Bundle | SSR 开销 | 运行时开销 |
|------|---------|--------|----------|-----------|
| Astro | 0KB | 极小 | 低 | 无 |
| Qwik | ~1KB | 小 | 低 | 低 |
| Svelte 5 | 1.5KB | 极小 | 中 | 极低 |
| SolidJS | 7KB | 小 | 中 | 极低 |
| Nuxt | 20KB+ | 中 | 中 | 中 |
| Remix | 40KB+ | 中 | 中 | 中 |
| Next.js 15 | 85KB+ | 中 | 中 | 中 |

### 开发者体验对比

| 框架 | 学习曲线 | 文档质量 | 生态丰富度 | 工具链完整度 |
|------|----------|----------|------------|-------------|
| Astro | 低 | 优秀 | 中 | 完整 |
| Svelte 5 | 低 | 优秀 | 中 | 完整 |
| Nuxt | 低 | 优秀 | 高 | 完整 |
| Qwik | 中 | 良好 | 中 | 完整 |
| Remix | 低 | 优秀 | 高 | 完整 |
| SolidJS | 中 | 良好 | 中 | 完整 |
| Next.js 15 | 中 | 优秀 | 高 | 最完整 |
| Bun | 低 | 良好 | 中 | 完整 |

### 选择建议

| 场景 | 推荐框架 | 备选 |
|------|----------|------|
| React 全栈企业应用 | Next.js 15 | Remix |
| Vue 全栈应用 | Nuxt 3 | - |
| 内容驱动静态站 | Astro | - |
| 极致性能 SPA | Svelte 5 / SolidJS | Qwik |
| 移动端性能优先 | Qwik | Astro |
| 小型 API 服务器 | Bun | - |
| 快速原型 | Svelte 5 / Bun | Nuxt |
| 表单驱动应用 | Remix | Next.js |

---

## 选择决策树

```mermaid
flowchart TD
    A[项目类型?] --> B{React 团队?}
    B -->|Yes| C{Next.js 或 Remix?|
    B -->|No| D{Vue 团队?}
    D -->|Yes| E[Nuxt 3]
    D -->|No| F{需要极致性能?}
    
    C -->|企业应用| G[Next.js 15]
    C -->|表单优先| H[Remix]
    
    F -->|是| I{静态内容多?}
    F -->|否| J{快速开发?}
    
    I -->|是| K[Astro]
    I -->|否| L{Svelte 5 / SolidJS / Qwik}
    
    J -->|是| M{Bun / Svelte}
    J -->|否| N{Nuxt / Next.js}
```

---

*文档最后更新：2026-05-16*