---
title: SSR、路由与应用架构
description: 围绕 Next.js 16.4 的 SSR、RSC 与水合边界、异步请求 API 和两种缓存模型展开面试追问，结合服务端分页、客户端交互岛和权限检查示例，说明 React Compiler 与路由架构的适用范围，并提供性能测量与迁移验收方法。
---

# SSR、路由与应用架构

> 本页按「概念、原理、代码」逐题展开相关面试专题。

!!! note "Next.js 版本边界（截至 2026-10-11）"
    本页 Next.js 新示例按 16.4.0 App Router 编写。App Router 与 Pages Router 是两套不同的路由/API 约定；旧版示例会显式标为 Pages Router，不把它们当成 App Router 写法。Next.js 16.4 的新项目 `create-next-app` 默认启用 Cache Components，既有项目应先检查 `next.config.*` 的 `cacheComponents`，不能从版本号推断其缓存模型。[Next.js 16 升级指南](https://nextjs.org/docs/app/guides/upgrading/version-16) · [16.4 发布说明](https://nextjs.org/blog/next-16-4)

## 1. Next.js SSR原理

示意代码：未通过自动验证。下面两种导出属于不同的 Pages Router 页面，不能在同一个页面同时导出。

```javascript
// Pages Router（历史 API，适用于 pages/；不是 App Router API）
// getStaticProps: 构建时生成静态 HTML
export async function getStaticProps(context) {
  const posts = await fetchPosts();
  return { props: { posts }, revalidate: 60 }; // ISR
}

```

另一个页面使用请求时 SSR。示意代码：未通过自动验证。

```javascript
// getServerSideProps: 每次请求时 SSR
export async function getServerSideProps(context) {
  const data = await fetchDataFromDB();
  return { props: { data } };
  // 或 { notFound: true } / { redirect: { destination: '/login' } }
}
```

`getStaticProps` / `getServerSideProps` 属于 **Pages Router**。App Router 用 Server Components、路由段配置与缓存 API 表达渲染/缓存策略；两套 API 不要混写。Pages Router 的 `getStaticProps` ISR 是旧模型中的 stale-while-revalidate：首次生成后返回缓存，过期请求可先收到旧页并在后台再生成。

**App Router 的边界：RSC、HTML 渲染与水合是不同问题。**

RSC 描述组件在哪个运行环境执行以及组件树如何序列化；它本身不等于 SSR。App Router 首次访问通常把 Server Component 输出成 RSC Payload，并结合 Client Components 预渲染 HTML；浏览器先显示 HTML，再用 Payload 对齐组件树，并水合 Client Components。Client Component 首访仍可出现在服务端预渲染 HTML 中，`'use client'` 标记模块边界，不表示“只在浏览器渲染”。后续客户端导航则可使用预取的 RSC Payload，由客户端渲染 Client Components。[Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

| 名词 | 回答的问题 | 不应混淆为 |
|---|---|---|
| RSC | 组件在服务端/客户端如何执行、传递结果 | SSR 的同义词 |
| SSR / prerender | HTML 在构建时或请求时由谁生成 | 一定需要整页客户端水合 |
| Hydration（水合） | React 为已存在的 HTML 绑定事件，使其可交互 | 把服务端组件源码发送到浏览器 |

Cache Components 与上一代缓存模型也要分开回答。启用 Cache Components 时，通过 `'use cache'` 显式缓存函数/组件，并可组合 `cacheLife`、`cacheTag`；未启用时，按旧模型理解路由段配置及 `fetch` 选项，Next.js 16 中 `fetch` 默认不缓存。App Router Route Handler 的 `GET` 在未启用 Cache Components 的模型中默认不缓存；启用 Cache Components 后，GET Route Handler 走与页面相同的预渲染模型。不要把旧版 ISR 表格直接套到这两种模型上。[Caching](https://nextjs.org/docs/app/getting-started/caching) · [Caching (Previous Model)](https://nextjs.org/docs/app/guides/caching-without-cache-components)

Next.js 16 的 `params`、`searchParams`、`cookies()`、`headers()` 是异步 Request APIs。未由 `generateStaticParams` 预先提供的动态 `params`、`searchParams`、`cookies()`、`headers()` 会依赖请求信息；在 Cache Components 模型下，动态部分可与静态 shell 分离（例如放在 Suspense 边界内）。因此不能概括成“调用一个动态 API 就整条路由必然动态渲染”。

**Pages Router ISR 的简化时序（不是 Cache Components 的完整缓存流程）：**

| 步骤 | 说明 |
|------|------|
| 请求 | 检查缓存 |
| 无缓存 | SSR，缓存 HTML，返回 |
| 未过期 | 直接返回缓存 |
| 已过期 | 返回旧缓存 + 触发后台 revalidate，下次返回新缓存 |

## 2. Server Component 与 React Compiler

### 2.1 Server Component (RSC)

示意代码：未通过自动验证。服务端和客户端组件位于不同文件，数据库与 UI 适配器由应用提供。

```jsx
// Server Component (默认): 服务端执行,不发送JS
async function UsersPage() {
  const users = await db.query('SELECT * FROM users');
  return <UserList users={users} />;
}

```

示意代码：未通过自动验证。

```jsx
// 单独的 user-card.jsx：客户端模块的第一条指令
'use client';
import { useState } from 'react';
function UserCard({ user }) {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>{user.name}</button>;
}
```

```
Server Component vs Client Component:

Server:  服务端执行,组件代码不进客户端bundle | 可访问服务端数据源 | async/await | ✗ 客户端状态/事件处理
Client:  hooks/事件/浏览器API | bundle包含 | ✗ 直接访问DB
```

首次访问时 Client Component 也可能参与服务端 HTML 预渲染，因此仍有 HTML 与 hydration；边界的主要作用是划分客户端模块图及交互代码。

### 2.2 React Compiler & React Forget

React Forget 是 React Compiler 的早期项目名称，不是另一套“更激进”的编译器。Compiler 根据 React 语义自动记忆化组件和计算，不应把生成代码简化为“给每个组件套 `React.memo`”。Next.js 16 的集成稳定但仍需显式开启 `reactCompiler: true`；先确认编译覆盖和性能基线，再逐项移除冗余的手写记忆化。它不替代 RSC、服务端数据缓存或鉴权。[React Compiler 介绍](https://react.dev/learn/react-compiler/introduction) · [Next.js 16 集成](https://nextjs.org/blog/next-16#react-compiler-support-stable)

## 3. React Router原理

### 3.1 Hash路由 vs History路由

```javascript
// Hash: https://app.com/#/home
// ✓ 不需要服务器配置,刷新不404
// ✗ URL带#号,SEO不友好

// History: https://app.com/home
// ✓ 干净URL,SEO友好
// ✗ 需要服务器配置(所有路径返回index.html)
```

### 3.2 React Router实现原理

```javascript
// 1. 监听路由变化
function useRouter() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const fn = () => setPath(window.location.pathname);
    window.addEventListener('popstate', fn);
    return () => window.removeEventListener('popstate', fn);
  }, []);
  return path;
}

// 2. 路由匹配 (将 /users/:id 转为正则)
function matchRoute(path, routePath) {
  const paramNames = [];
  const regex = routePath.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  const match = path.match(new RegExp('^' + regex + '$'));
  if (!match) return null;
  return paramNames.reduce((params, name, i) => {
    params[name] = match[i + 1];
    return params;
  }, {});
}

// 3. 嵌套路由通过<Outlet>渲染子路由
```

```
React Router匹配算法:

URL: /users/123/posts/456

Routes:
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/users/:userId" element={<User />}>
      <Route path="posts/:postId" element={<Post />} />
    </Route>
  </Routes>

匹配过程:
  1. / → 否
  2. /users/:userId → 是, userId=123
     → User渲染, Outlet渲染子路由
  3. posts/:postId → 是, postId=456 → Post渲染
```

## 4. React权限系统实现

```javascript
// 基于RBAC的权限系统:

const permissions = {
  'user:read':   ['admin','editor','viewer'],
  'user:write':  ['admin','editor'],
  'user:delete': ['admin'],
};

function usePermission(action, resource) {
  const { user } = useAuth();
  return permissions[`${resource}:${action}`]?.includes(user?.role) ?? false;
}

const Can = ({ action, resource, children, fallback = null }) => {
  return usePermission(action, resource) ? children : fallback;
};

// 使用:
<Can action="delete" resource="user" fallback={<span>无权限</span>}>
  <DeleteButton />
</Can>

// 高阶组件:
function withPermission(Component, action, resource) {
  return (props) => usePermission(action, resource)
    ? <Component {...props} /> : <AccessDenied />;
}
```

## 5. React微前端实现 (Module Federation)

```javascript
// Webpack 5 Module Federation: 共享代码,独立部署

// Host (主应用):
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    remoteApp: 'remoteApp@https://remote.com/remoteEntry.js',
  },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
});

// Remote (子应用):
new ModuleFederationPlugin({
  name: 'remoteApp',
  filename: 'remoteEntry.js',
  exposes: {
    './ProductList': './src/ProductList',
    './UserProfile': './src/UserProfile',
  },
  shared: { react: { singleton: true } },
});

// Host中使用Remote组件:
const RemoteProductList = React.lazy(() => import('remoteApp/ProductList'));
```

**Module Federation 架构：**

| 组件 | 说明 |
|------|------|
| remoteEntry.js | 远程模块入口文件 |
| Host App | 主应用 |
| Remote App | 远程应用（暴露模块） |
| ProductList.js | 暴露的组件 |

**使用方式：**
```javascript
const RemoteProductList = React.lazy(() => import('remoteApp/ProductList'));
// 共享 react/react-dom
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [React Server Components 参考](https://react.dev/reference/rsc/server-components) | RSC 是本页核心，官方参考明确服务端与客户端组件边界。 | 读 Server 与 Client Components 两节，在 App Router 项目里各写一个组件并观察产物。 |
| [React Router 文档](https://reactrouter.com/home) | React Router 数据加载与 actions 的官方说明，直击路由原理。 | 读 data loading 与 actions 两节，实现一个带 loader 与鉴权守卫的路由。 |
| [React Compiler 介绍](https://react.dev/learn/react-compiler/introduction) | 官方编译器指南，解释自动记忆化机制与适用边界。 | 按文档在 Vite 项目中启用编译器，对比开启前后 Profiler 的重渲染次数。 |
| [Lit 文档](https://lit.dev/docs/) | Web Component 是微前端跨框架集成的主流隔离方案。 | 写一个 Web Component 并在 React 页面中挂载，观察样式与状态隔离。 |
| [Next.js 16.4 App Router 文档](https://nextjs.org/docs/app) | Routing、Data Fetching、Caching 覆盖当前 Next.js SSR 落地细节。 | 先确认 Cache Components 开关，再分别读两套缓存模型与异步 Request APIs。 |
| [Server React DOM APIs](https://react.dev/reference/react-dom/server) | SSR 渲染 API 总览，理清传统与流式 API 的分层关系。 | 对比 Node 流与 Web Streams API；不要把 Next.js App Router 的流式实现概括成只依赖 `renderToPipeableStream`。 |
| [The `<A/>` Component](https://book.leptos.dev/router/19_a.html) | React Router 中 Link 的行为说明，讲清客户端导航原理。 | 读 props 与导航流程，配合源码看点击拦截与 history 更新时机。 |
| [`<slot>` HTML web component slot element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/slot) | slot 是 Web Component 组合机制，配合微前端隔离方案使用。 | 读示例后给自建 Web Component 加具名 slot，并传入 React 渲染的内容。 |
| [renderToPipeableStream](https://react.dev/reference/react-dom/server/renderToPipeableStream) | React 面向 Node.js 流的流式 SSR API。 | 读函数签名与 shell 回调；另与面向 Web Streams 的 API 区分。 |
| [createContext](https://react.dev/reference/react/createContext) | 权限系统常以 Context 下发用户与角色，官方 API 说明。 | 只读 API 与 Caveats 两节，写一个 AuthContext 并封装权限判断 Hook。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [babel.config-react-compiler.js](https://github.com/facebook/react/blob/main/babel.config-react-compiler.js) | 可见编译器在 Babel 层如何接入，理解编译期产物形态。 | 对照官方启用指南读配置项与插件顺序，在项目里复刻一份。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Josh Comeau：The Perils of Rehydration](https://www.joshwcomeau.com/react/the-perils-of-rehydration/) | SSR 水合失败的经典剖析，理解 SSR 原理绕不开。 | 先看文中的报错案例，再在自己项目里复现 mismatch 并按方案修复。 |
| [Josh Comeau：Server Components](https://www.joshwcomeau.com/react/server-components/) | 用图讲透 RSC 边界，比官方文档更好入门的教程。 | 读完画一张服务端/客户端组件边界图，对照项目代码检查组件归属。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格首屏 | Server Component 内取数、Suspense 流式渲染 | Next.js App Router + Server Component | 不要在客户端组件里把全量行塞进状态 |
| 低端安卓的首屏加载 | Server Component 收窄客户端边界、React Compiler 自动记忆化 | Next.js + React Compiler | 编译后仍要查客户端 chunk 清单 |
| 多人协作白板的房间路由 | React Router 的 loader 数据预取 | React Router 数据路由 | loader 里不做长连接订阅，订阅放组件生命周期 |
| 多团队共用的运营后台 | Module Federation 远程模块 | webpack Module Federation 或对应 Vite 插件 | 共享 React 单例，否则出现两份运行时 |
| 按角色显示的菜单与按钮 | React 权限系统实现 | RBAC 权限码 + 路由守卫 | 前端隐藏不等于后端授权 |
| 营销落地页的请求时渲染 | Next.js SSR 原理 | Next.js 动态渲染 | 可缓存的页面不要走动态渲染 |
| 服务端读 Cookie 决定渲染结果 | Server Component 与请求上下文 | Next.js 16 异步 `cookies()` | 请求相关内容可按 Cache Components 的边界局部动态渲染 |
| 老系统按路由渐进替换 | Module Federation 或路由级微前端 | React Router 嵌套路由 + 远程模块 | 预留回滚开关，明确模块边界 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：运营后台的订单表格一次拉全量数据，浏览器要处理上万行 DOM，滚动和筛选都会卡住。行数随账号增长从千级涨到万级，本地造 2 万行假数据就能复现。

**怎么用本页知识解决**：把取数挪到服务端，按 URL 里的页码只取当前页；工具栏保留为客户端组件承接交互，慢数据用 Suspense 包起来先送骨架。

示意代码：未通过自动验证。该例按 Next.js 16.4 App Router 编写；`Page` 本身不提前等待 `searchParams`，以便请求相关子树位于 Suspense 边界内。`fetchOrders`、工具栏和骨架屏是应用提供的适配器；以下片段连续组成同一个页面文件。

```tsx
// app/orders/page.tsx
import { Suspense } from 'react';
import { fetchOrders } from '@/lib/orders';
import { TableToolbar, TableSkeleton } from './table-ui';

type Props = { searchParams: Promise<{ page?: string }> };

export default function Page(props: Props) {
  return <Suspense fallback={<TableSkeleton />}><OrderResults searchParams={props.searchParams} /></Suspense>;
}
```

读取并校验页码，再把当前页传给表格。示意代码：未通过自动验证。

```tsx
async function OrderResults({ searchParams }: Props) {
  const query = await searchParams;
  const requested = Number(query.page ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  return <><TableToolbar page={page} /><OrderTable page={page} /></>;
}
```

适配器返回 `{ rows: { id: string; status: string }[] }`，并在数据层按当前用户限制可访问的订单。示意代码：未通过自动验证。

```tsx
async function OrderTable({ page }: { page: number }) {
  const { rows } = await fetchOrders({ page, size: 50 }); // 只取当前页 50 行
  return <table><tbody>{rows.map(row => (
    <tr key={row.id}><td>{row.id}</td><td>{row.status}</td></tr>
  ))}</tbody></table>;
}
```

- 页码来自 URL，翻页变成一次导航，可直接分享和刷新复现。
- `TableToolbar` 带 `'use client'`，交互状态留在客户端，不牵动表格数据。
- `OrderTable` 是服务端组件，取数代码不进客户端 chunk。
- Suspense 让慢查询不阻塞外壳下发，用户先看到骨架屏。

**怎么度量收益**：Chrome DevTools Performance 面板录制翻页过程，看 Long Tasks 条数与总时长；Lighthouse 报告里读 TBT 和 INP；Elements 面板统计表格 DOM 节点数；也可用 PerformanceObserver 订阅 `longtask` 条目做回归。

**什么时候不该用**：表格需要全量数据在客户端排序、离线筛选或导出全表时，服务端分页拿不到全集；数据只在浏览器本地生成（例如解析本地上传的文件）时，服务端没有可渲染的内容。

#### 场景 2：低端安卓的首屏加载

**业务背景**：内容型详情页在低端安卓上首屏白屏时间长，客户端 JS 的下载与解析占了大头。用 Chrome DevTools 的 CPU 4x 节流加 Slow 4G 网络档位即可复现。

**怎么用本页知识解决**：把展示部分留在服务端组件，只有真正交互的按钮进入客户端边界；开启 React Compiler 后根据编译覆盖和测量结果逐项移除冗余记忆化。

示意代码：未通过自动验证。数据适配器与购物车 Action 由应用实现；Action 内必须重新检查用户身份和商品权限。

```tsx
// app/product/[id]/page.tsx
import { Suspense } from 'react';
import { AddToCart } from './add-to-cart';
import { getProduct } from '@/lib/products';
type Props = { params: Promise<{ id: string }> };
export default function Page(props: Props) {
  return <Suspense fallback={<p>加载商品…</p>}><Product {...props} /></Suspense>;
}
```

同一页面文件中的请求相关子树在 Suspense 下读取参数。示意代码：未通过自动验证。

```tsx
async function Product({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  return (
    <article>
      <h1>{product.title}</h1>                 {/* 纯展示内容，零客户端 JS */}
      <AddToCart id={product.id} />            {/* 交互边界收窄到单个组件 */}
    </article>
  );
}
```

示意代码：未通过自动验证。

```tsx
// app/product/[id]/add-to-cart.tsx
'use client';
import { useTransition } from 'react';
import { addItem } from '@/app/actions/cart';

export function AddToCart({ id }: { id: string }) {
  const [pending, start] = useTransition(); // 交互状态留在客户端
  return (
    <button disabled={pending} onClick={() => start(() => addItem(id))}>
      加入购物车
    </button>
  );
}
```

- 页面文件没有 `'use client'`，取数与模板字符串都不进客户端包。
- `AddToCart` 是唯一的客户端边界，改动它不会带动整页。
- `useTransition` 让点击期间按钮进入 pending，避免重复提交。
- Compiler 编译覆盖、回归测试与 Profiler 结果共同决定哪些手写记忆化可以删除。

**怎么度量收益**：生产模式下使用相同设备、冷缓存和网络条件，记录首访实际传输的 JS 字节数；配合 bundle analyzer、Coverage、LCP 和 TBT 判断收益，不依赖旧版构建输出中的 First Load JS 列。

**什么时候不该用**：页面主体是在线编辑器这类强交互组件，收窄边界的收益有限；内容与登录用户强相关且不可缓存时，请求时渲染会让每次访问都走动态路径。

#### 场景 3：多团队共用的运营后台

**业务背景**：三个团队各自维护自己的模块，却要合并进同一个后台，发布排期互相阻塞。每个模块独立仓库、独立构建，是最小可复现的组织形态。

**怎么用本页知识解决**：用 Module Federation 把模块以远程入口暴露，宿主只保留外壳与共享依赖；菜单和路由按权限码裁剪，前端只做展示控制。

```js
// shell 宿主的 webpack.config.js
new ModuleFederationPlugin({
  name: 'shell',
  remotes: { orders: 'orders@https://orders.example.com/remoteEntry.js' }, // 远程模块入口
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } }, // 单例共享 React
});
```

```tsx
// 菜单按权限码裁剪，前端只控制展示，后端仍要鉴权
const visible = allMenus.filter((m) => hasPermission(user, m.code)); // code 来自后端下发的权限码
```

- 远程入口由模块团队自行发布，宿主只改 URL 配置，排期解耦。
- `shared` 加 `singleton` 后，React 与 react-dom 只加载一份，避免 hooks 报错。
- 权限码由后端下发，前端过滤菜单，接口层再做一次校验。
- 远程加载失败时要给降级 UI，否则一个模块拖垮整页。

**怎么度量收益**：Webpack Bundle Analyzer 查看共享依赖与重复包；DevTools Network 面板统计 remoteEntry 的加载耗时与失败次数；用 PerformanceObserver 订阅 `resource` 条目做线上统计；各仓库独立发布次数作为排期解耦的间接指标。

**什么时候不该用**：模块之间需要频繁共享状态时，远程边界会被反复改动；团队规模小、发布节奏一致时，远程加载带来的失败面超过排期收益。

### 行业先进实践

流式 SSR 配合 Suspense 边界（出处：React 官方文档 Suspense 章节）。做法是把慢数据包在 Suspense 里，服务端先下发页面外壳，再流式补齐内容，用户先看到结构再看到数据。借鉴方式是给每个慢查询单独设边界，而不是等整页数据齐全再响应。

React Server Components（出处：React 官方文档 Server Components 章节）。默认在服务端渲染组件，客户端只保留交互部分，取数与模板不进客户端包。借鉴方式是先划定 `'use client'` 边界，再决定哪些组件留在边界内。

Module Federation 运行时共享依赖（出处：webpack 官方文档 Module Federation 章节）。宿主与远程模块在运行时协商共享依赖版本，用 `singleton` 保证 React 只有一份实例。借鉴方式是把共享依赖清单写进宿主配置并纳入评审。

React Router 的 loader 与 action 数据 API（出处：React Router 官方文档 Data APIs 章节）。路由匹配时并行执行 loader，组件渲染前数据就绪，省掉渲染后再发请求的往返。借鉴方式是把列表页的取数从 useEffect 迁到 loader，并让 loader 的错误走路由错误边界。

RBAC 角色与权限码模型（出处：INCITS 359 RBAC 标准）。角色聚合权限，用户绑定角色，鉴权点统一到权限码上。借鉴方式是把权限码当成前后端共用契约，前端只做菜单裁剪。具体到框架层提供的服务端鉴权钩子，需核对官方文档：你所选框架的中间件与路由守卫在服务端如何读取会话。

### 从学到用：落地路线

1. 试点：选一个取数简单的列表页改造成服务端组件，只把工具栏留成客户端组件。验收标准：相同冷缓存和网络条件下，生产路由首访实际传输的 JS 字节数低于改造前，并记录测量方法。
2. 验证：用 Lighthouse 与 DevTools Performance 各录一次改造前后的数据。验收标准：LCP、TBT、主线程长任务条数三项都有前后对比数字。
3. 推广：把同样的边界规则写进组内约定，按路由逐个迁移。验收标准：每个迁移路由都附一份前后对比记录。
4. 防回退：在 CI 里加体积检查与 `'use client'` 文件清单检查。验收标准：超出阈值的提交会失败，并提示对应文件路径。

### 动手作业

目标是做一个商品列表页，把客户端取数改成服务端渲染加交互岛，并在两次测量之间留下可复现的数据。

步骤：

1. 用 Next.js 建应用，本地生成 2 万行商品假数据，写成 JSON 或本地接口。
2. 先实现客户端取数版本，用 DevTools Performance 录制首屏，记录 TBT 与 DOM 节点数。
3. 改成服务端组件按 URL 页码取数，慢数据用 Suspense 加骨架屏包住。
4. 把筛选栏抽成带 `'use client'` 的客户端组件。
5. 开启 React Compiler，确认编译覆盖并逐项验证冗余的 useMemo 与 memo 是否可移除。
6. 再录一次 Performance 与 Lighthouse，把两份数据写进 README。
7. 在 README 里写出你在本场景不会采用服务端渲染的具体条件。

验收标准：

- 禁用浏览器 JS 后刷新页面，表格首行数据仍出现在 HTML 源码里。
- 同条件下生产路由首访 JS 传输字节数低于基线，两个数值与测量方式都在 README 中。
- `'use client'` 只出现在筛选栏相关文件，其他文件没有该指令。
- CPU 4x 节流下录制的长任务条数少于第 2 步记录值。
- README 含完整复现命令与两次测量结果。

### Next.js 16 面试追问

??? question "升级到 16.4 后，旧项目是否自动采用新的缓存模型？"
    不会。先检查 `cacheComponents` 配置；16.4 新建应用默认启用，不代表已有项目配置自动改变。新模型用 `'use cache'` 等显式缓存，未启用时仍按上一代路由段和 fetch 选项理解。

??? question "商品更新后立即展示新数据，为什么不能只调用 router.refresh()？"
    `router.refresh()` 请求新的路由结果，不会使服务端缓存失效。Server Action 中用 `updateTag` 可立即过期关联缓存，支持读到刚写入的数据；`revalidateTag(tag, 'max')` 则允许先返回旧值并后台更新，适合可容忍陈旧数据的场景。

??? question "动态参数必须 await，是否意味着整页只能动态渲染？"
    不意味着。`generateStaticParams` 可提供预生成路径；Cache Components 模型可在 Suspense 子树读取运行时参数，同时保留静态壳。需要分别讨论参数来源、缓存和流式边界。

??? question "Proxy 已经判断登录，Server Action 是否可以省略鉴权？"
    不可以。Proxy 适合快速、乐观的入口检查，Action、Route Handler 和数据访问层仍要验证身份、资源权限与租户归属，不能把隐藏按钮或入口跳转当安全边界。

??? question "Server Component 不发送组件源码，是否等于整页零 JavaScript？"
    不等于。客户端边界、路由运行时等仍可能需要 JavaScript；首次访问的 Client Component 也可预渲染 HTML 后水合。RSC、HTML 生成和 hydration 是不同层次。

对应配置、代码和官方参考集中在 [Next.js 16 App Router 教程](../../frameworks/nextjs-app-router.md)。

