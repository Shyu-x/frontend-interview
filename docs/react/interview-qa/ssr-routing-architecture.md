---
title: SSR、路由与应用架构
description: Next.js SSR、Server Component、React Router、权限系统与 Module Federation 微前端相关面试题
---

# SSR、路由与应用架构

> 本页按「概念、原理、代码」逐题展开相关面试专题。

## 1. Next.js SSR原理

```javascript
// getStaticProps: 构建时生成静态HTML
export async function getStaticProps(context) {
  const posts = await fetchPosts();
  return { props: { posts }, revalidate: 60 }; // ISR
}

// getServerSideProps: 每次请求时SSR
export async function getServerSideProps(context) {
  const data = await fetchDataFromDB();
  return { props: { data } };
  // 或 { notFound: true } / { redirect: { destination: '/login' } }
}
```

**ISR (Incremental Static Regeneration)：**

| 步骤 | 说明 |
|------|------|
| 请求 | 检查缓存 |
| 无缓存 | SSR，缓存 HTML，返回 |
| 未过期 | 直接返回缓存 |
| 已过期 | 返回旧缓存 + 触发后台 revalidate，下次返回新缓存 |

## 2. Server Component 与 React Compiler

### 2.1 Server Component (RSC)

```jsx
// Server Component (默认): 服务端执行,不发送JS
async function UsersPage() {
  const users = await db.query('SELECT * FROM users');
  return <UserList users={users} />;
}

// Client Component: 有hooks和交互
'use client';
function UserCard({ user }) {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>{user.name}</button>;
}
```

```
Server Component vs Client Component:

Server:  服务端执行,无bundle | 直接访问DB | async/await | ✗ hooks/状态
Client:  hooks/事件/浏览器API | bundle包含 | ✗ 直接访问DB
```

### 2.2 React Compiler & React Forget

```javascript
// React Compiler: Babel Plugin,自动优化
// 源码:
function Counter({ count, onIncrement }) {
  return <button onClick={onIncrement}>{count}</button>;
}

// 编译后(自动添加memo+比较函数):
const _comp = React.memo(function Counter({ count, onIncrement }) {
  return <button onClick={onIncrement}>{count}</button>;
});

// React Forget: 更激进的优化编译器
// - 自动添加 React.memo
// - 自动修正 useCallback/useMemo
// - 自动提取不必要的闭包捕获
```

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
| [Next.js App Router 文档](https://nextjs.org/docs/app) | Routing、Data Fetching、Caching 覆盖 Next.js SSR 落地细节。 | 三部分各读一节并各做一个例子，重点看动态渲染与缓存的触发条件。 |
| [Server React DOM APIs](https://react.dev/reference/react-dom/server) | SSR 渲染 API 总览，理清传统与流式 API 的分层关系。 | 先看目录区分 API 代际，重点读 renderToPipeableStream 与 Suspense 配合部分。 |
| [The `<A/>` Component](https://book.leptos.dev/router/19_a.html) | React Router 中 Link 的行为说明，讲清客户端导航原理。 | 读 props 与导航流程，配合源码看点击拦截与 history 更新时机。 |
| [`<slot>` HTML web component slot element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/slot) | slot 是 Web Component 组合机制，配合微前端隔离方案使用。 | 读示例后给自建 Web Component 加具名 slot，并传入 React 渲染的内容。 |
| [renderToPipeableStream](https://react.dev/reference/react-dom/server/renderToPipeableStream) | 流式 SSR 的核心 API，Next.js 的 SSR 底层依赖它。 | 读函数签名与 shell 回调部分，跑通一个最小流式 SSR 示例。 |
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
| 服务端读 Cookie 决定渲染结果 | Server Component 与请求上下文 | Next.js cookies() 等动态 API | 调用动态 API 会让该路由转为动态渲染 |
| 老系统按路由渐进替换 | Module Federation 或路由级微前端 | React Router 嵌套路由 + 远程模块 | 预留回滚开关，明确模块边界 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：运营后台的订单表格一次拉全量数据，浏览器要处理上万行 DOM，滚动和筛选都会卡住。行数随账号增长从千级涨到万级，本地造 2 万行假数据就能复现。

**怎么用本页知识解决**：把取数挪到服务端，按 URL 里的页码只取当前页；工具栏保留为客户端组件承接交互，慢数据用 Suspense 包起来先送骨架。

```tsx
// app/orders/page.tsx
import { Suspense } from 'react';

export default function Page({ searchParams }) {
  const page = Number(searchParams.page ?? 1); // 从 URL 取页码，刷新后结果可复现
  return (
    <>
      <TableToolbar page={page} />              {/* 客户端组件：承接筛选和翻页交互 */}
      <Suspense fallback={<TableSkeleton />}>   {/* 数据未就绪时先下发骨架屏 */}
        <OrderTable page={page} />              {/* 服务端组件在内部 await 取数 */}
      </Suspense>
    </>
  );
}

async function OrderTable({ page }: { page: number }) {
  const { rows } = await fetchOrders({ page, size: 50 }); // 只取当前页 50 行
  return <table>{/* 用 rows 渲染行 */}</table>;
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

**怎么用本页知识解决**：把展示部分留在服务端组件，只有真正交互的按钮进入客户端边界；开启 React Compiler 由编译器插入记忆化，删掉手写的 useMemo 与 memo。

```tsx
// app/product/[id]/page.tsx —— 服务端组件，不进客户端 bundle
export default async function Page({ params }) {
  const product = await getProduct(params.id); // 服务端取数，密钥与查询留在服务端
  return (
    <article>
      <h1>{product.title}</h1>                 {/* 纯展示内容，零客户端 JS */}
      <AddToCart id={product.id} />            {/* 交互边界收窄到单个组件 */}
    </article>
  );
}
```

```tsx
// app/product/[id]/add-to-cart.tsx
'use client';

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
- React Compiler 接管记忆化后，手写缓存与组件包裹可以删除，减少维护面。

**怎么度量收益**：Lighthouse 取 LCP 与 TBT；`next build` 输出里读该路由的 First Load JS 数值；Chrome DevTools Coverage 面板看未使用的 JS 字节数；Network 面板看主包传输体积。

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

1. 试点：选一个取数简单的列表页改造成服务端组件，只把工具栏留成客户端组件。验收标准：`next build` 输出中该路由的 First Load JS 低于改造前，且数值记录进仓库文档。
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
5. 开启 React Compiler，删掉手写的 useMemo 与 memo 包裹。
6. 再录一次 Performance 与 Lighthouse，把两份数据写进 README。
7. 在 README 里写出你在本场景不会采用服务端渲染的具体条件。

验收标准：

- 禁用浏览器 JS 后刷新页面，表格首行数据仍出现在 HTML 源码里。
- `next build` 输出中该路由的 First Load JS 数值低于第 2 步记录值，两个数值都在 README 中。
- `'use client'` 只出现在筛选栏相关文件，其他文件没有该指令。
- CPU 4x 节流下录制的长任务条数少于第 2 步记录值。
- README 含完整复现命令与两次测量结果。

