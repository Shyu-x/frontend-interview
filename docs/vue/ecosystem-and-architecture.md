---
title: 生态与项目架构
description: Vue Router、Vuex 与 Pinia、Vue SSR、Nuxt、权限管理与大型项目架构
---

# 生态与项目架构

> 本页按「概念、原理、代码」逐题展开相关面试专题。

## 1. Vue Router 原理

### 1.1 hash vs history 模式

| 特性 | hash 模式 | history 模式 |
|------|----------|-------------|
| URL | `localhost/#/path` | `localhost/path` |
| 刷新 | 不需要 server 配置 | 需要 server 代理所有路径到 index.html |
| 部署 | 任意静态服务器 | 需要 nginx rewrite 或后端配置 |
| 兼容性 | IE8+ | 需要 history.pushState（IE10+） |
| 跨域 | 天然无跨域 | 需要后端配合 |

**hash 原理**：
```javascript
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1)
  router.match(hash)
})
window.location.hash = '/home'
```

**history 原理**：
```javascript
history.pushState(state, title, '/home')
window.addEventListener('popstate', () => {
  router.match(location.pathname)
})
// 服务端需要：nginx try_files $uri $uri/ /index.html
```

### 1.2 路由守卫

```javascript
// 全局前置守卫
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuth) {
    next('/login')
  } else {
    next()
  }
})

// 组件内守卫
export default {
  beforeRouteEnter(to, from, next) {
    next(vm => { vm.xxx = '可在回调中访问实例' })
  },
  beforeRouteUpdate(to, from, next) {
    this.loadData(to.params.id)
    next()
  },
  beforeRouteLeave(to, from, next) {
    if (this.hasUnsavedChanges) next(false) else next()
  }
}

// 执行顺序：
// 导航触发
// → 全局 beforeEach (队列)
// → 重用的组件 beforeRouteUpdate
// → 路由配置的 beforeEnter
// → 组件的 beforeRouteEnter
// → 全局 async 守卫（router.beforeResolve）
// → DOM 更新
// → 组件 updated + beforeRouteEnter 的 next() 回调
```

## 2. Vuex vs Pinia 区别

| 特性 | Vuex | Pinia |
|------|------|-------|
| API | mutation/action/state/getter 四模块 | store(state + action + getter) |
| TypeScript | 需要手动类型声明 | 自动类型推导 |
| mutations | 同步变更，有 devtools 支持 | 无 mutation，action 即同步也异步 |
| 模块化 | modules（需手动 namespaced） | 每个 store 都是独立的，可自由组合 |
| 热更新 | 需要插件 | 原生支持 |
| 体积 | ~20KB | ~10KB |

```typescript
// Pinia 用法
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2
  },
  actions: {
    increment() { this.count++ },
    async fetchData() {
      const res = await api.get()
      this.count = res.data.count
    }
  }
})

const store = useCounterStore()
store.count++          // 直接修改
store.$patch({ count: 10 })
store.$reset()         // 重置
```

Pinia 的核心优势：**Composition API 风格 + 自动类型推导 + 更轻量**。

## 3. Vue SSR 原理

### 3.1 核心流程

| 步骤 | 说明 |
|------|------|
| 1 | 浏览器请求页面 |
| 2 | Server: `VueSSR.createApp(app).renderToStream()` |
| 3 | Vue 组件树渲染，字符串拼接 |
| 4 | 生成 HTML（路由数据注入） |
| 5 | 返回完整 HTML 给浏览器 |
| 6 | 浏览器：收到 HTML 显示首屏（可交互但未水合） |
| 7 | 加载 JS bundle |
| 8 | Client: `hydrate(app, container)` |
| 9 | 激活 HTML 中的 DOM 节点，建立响应式绑定 |

### 3.2 关键API

```javascript
// server entry
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'

export default function serverEntry(context) {
  const app = createSSRApp(App) // 必须用 createSSRApp
  return renderToString(app, context)
}

// client entry
import { createSSRApp } from 'vue'
const app = createSSRApp(App)
app.mount('#app', true) // hydrate模式挂载
```

### 3.3 hydrate（客户端水合）

ESLint遍历已存在的 DOM，通过 Virtual DOM 做一致性检查，对已有 DOM 建立 Vue 响应式绑定（事件监听、数据劫持），这个过程叫"水合"（Hydration），不重新创建 DOM。

## 4. Nuxt 原理

```
Nuxt = Vue 3 + Vite/Webpack + SSR + File-based routing
       + 自动导入 + SEO优化 + 路由守卫抽象

目录约定：
  pages/          → 自动生成路由
  components/     → 自动导入
  composables/    → 自动导入
  plugins/        → SSR友好的插件
  server/         → Nitro后端服务

请求流程（SSR模式）：
  1. 路由匹配（pages/ 文件树）
  2. 加载组件 + 执行 asyncData/useFetch
  3. createSSRApp + renderToString
  4. HTML返回浏览器
  5. 浏览器下载JS，hydrate
```

**Nuxt3 vs Nuxt2**：Nuxt3 基于 Vue3 Composition API + Nitro（支持 serverless）+ 自动导入（零配置）。

## 5. Vue 权限管理

### 5.1 路由守卫方案

```javascript
router.beforeEach(async (to, from, next) => {
  const { role } = useUserStore()

  if (to.meta.requiresAuth && !isLogin()) return next('/login')
  if (to.meta.roles && !to.meta.roles.includes(role)) return next('/403')
  next()
})

// 动态路由注册
async function generateRoutes() {
  const menus = await fetchMenus()
  const routes = menus.map(menu => ({
    path: menu.path,
    component: () => import(`@/views/${menu.component}`),
    meta: { title: menu.title, roles: menu.roles }
  }))
  routes.forEach(r => router.addRoute(r)) // 运行时注册
}
```

### 5.2 指令方案（按钮级权限）

```javascript
const permission = {
  mounted(el, binding) {
    const { value } = binding
    const roles = useUserStore().roles
    if (value && !roles.includes(value)) {
      el.parentNode?.removeChild(el)
    }
  }
}

app.directive('permission', permission)

// 使用
<button v-permission="'admin'">删除</button>
```

## 6. Vue 大型项目架构

**项目结构：**

| 目录 | 说明 |
|------|------|
| src/apps/ | 微前端应用 |
| src/packages/ | 共享包 |
| src/packages/ui/ | 组件库 |
| src/packages/utils/ | 工具函数 |
| src/packages/hooks/ | 组合式函数 |
| src/packages/constants/ | 常量 |
| src/layouts/ | 布局组件 |
| src/pages/ | 页面组件 |
| src/router/ | 路由配置 |
| src/store/ | 状态管理 |
| src/services/ | 接口服务 |
| src/composables/ | 组合式函数 |
| src/directives/ | 自定义指令 |
| src/plugins/ | 插件 |
| src/assets/ | 静态资源 |

**状态管理分层：**

- 页面级状态：组件内 `useState`
- 跨页面共享：Pinia store
- 服务端数据：loadData / route params

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue Router 文档](https://router.vuejs.org/zh/) | 路由是权限与架构的骨架，官方文档最权威。 | 精读动态路由匹配与导航守卫两节，带着「守卫执行顺序」的问题读，再实现一个登录拦截。 |
| [Pinia 文档](https://pinia.vuejs.org/zh/) | Pinia 是当前官方推荐，文档讲清了与 Vuex 的设计差异。 | 读「核心概念」与「与 Vuex 对比」，用 setup store 重写一个 Vuex 风格的购物车状态。 |
| [Vue SSR 指南](https://vuejs.org/guide/scaling-up/ssr.html) | SSR 原理的第一手资料，hydration 部分最值得反复看。 | 读服务端渲染与 hydration 两节，带着「同构代码如何区分两端」读，跑通官方最小示例。 |
| [Nuxt 文档](https://nuxt.com/docs) | Nuxt 的官方文档，覆盖约定式路由、自动导入与渲染模式。 | 读「渲染模式」与「目录结构」，弄清 SSR/SSG/CSR 切换点，再对照自己的项目结构。 |
| [Vue 渲染机制](https://cn.vuejs.org/guide/extras/rendering-mechanism.html) | 讲虚拟 DOM 与编译优化，是理解 SSR 产物与性能的基础。 | 读静态提升与 patch 标记两节，在模板编译器演示站对照输出，观察编译结果差异。 |
| [Vue RFCs](https://github.com/vuejs/rfcs) | RFC 记录设计取舍，做大型项目架构决策时最有说服力。 | 读 Composition API 与 script setup 两篇，关注作者列出的替代方案与被否原因。 |
| [Vue DevTools 文档](https://devtools.vuejs.org/) | 调试状态与路由问题的官方工具，架构排错必备。 | 安装后在项目里打开时间线与组件检查器，定位一次「状态被谁改」的问题并记录过程。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 核心源码仓库](https://github.com/vuejs/core) | 读源码才能真正理解响应式与组件更新如何支撑上层框架。 | 从 packages/reactivity 读起，先读 ref 与 effect 再读 computed，画出依赖收集流程图。 |
| [Vue core：reactivity](https://github.com/vuejs/core/tree/main/packages/reactivity) | reactive.ts 是响应式源码入口，适合作为源码阅读起点。 | 顺着 reactive 的实现往下追 baseHandlers，读完后回答「Proxy 拦截了哪些操作」。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Pinia 入门](https://pinia.vuejs.org/zh/introduction.html) | 入门节奏友好，适合先建立心智模型再看差异细节。 | 读完核心概念后，列出 Vuex 与 Pinia 在模块、变更方式上的差异表。 |
| [Nuxt 入门](https://nuxt.com/docs/getting-started/introduction) | 快速建立 Nuxt 项目直觉，比通读文档更快上手。 | 跟着「目录结构与自动导入」两节建一个项目，观察约定优于配置带来的架构差异。 |
| [Josh Comeau：The Perils of Rehydration](https://www.joshwcomeau.com/react/the-perils-of-rehydration/) | 把 hydration mismatch 讲得最透彻的文章，直击 SSR 痛点。 | 读完后在自己的 SSR 项目里复现一次 mismatch，按文中方案修复并总结触发条件。 |

## 应用与行业实践

本节把前面的原理落到具体页面上。先看场景地图，再拆三个场景，最后给一条可执行的落地路线。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格 | 权限管理、Vue Router 原理 | 后端菜单树 + `router.addRoute` | 路由表按角色生成，不要在每个组件里判断权限 |
| 低端安卓的首屏加载 | Nuxt 原理、Vue 大型项目架构 | 路由级懒加载 + `useAsyncData` | 分段边界按页面切，首屏页面留在主包 |
| 多人协作白板 | Vuex vs Pinia 区别 | Pinia 的 setup store + `shallowRef` | 每帧变化的数据留在组件内，不进全局 store |
| 营销落地页要被抓取 | Vue SSR 原理、Nuxt 原理 | 服务端渲染 + payload 下发 | 首屏数据在服务端取，避免水合前后 DOM 不一致 |
| 多团队共用一个前端基座 | Vue 大型项目架构 | monorepo + 分层目录约定 | 写明依赖方向，禁止跨层直接引用 |
| 登录态过期后跳转 | Vue Router 原理 | 全局前置守卫 + `meta` 字段 | 守卫里用返回值控制跳转，不要重复调用 `next` |
| 内网离线部署的文档站 | Nuxt 原理 | 静态生成 | 预渲染阶段拿不到请求上下文，登录态要放在客户端 |
| 筛选条件可分享的列表页 | Vue Router 原理 | 查询参数作为状态源 | 不要同时维护 query 和本地 state 两份值 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格与动态权限路由

**业务背景**：系统里角色有十几种，每个角色能看到的菜单不同。用可复现的测量方法：登录不同账号，把浏览器地址栏直接改成未授权页面路径，看是否被拦下。

**怎么用本页知识解决**：思路是静态路由只留登录页，登录后拿菜单树动态注册路由。

```js
// 构建时收集 views 下所有页面，得到“路径 → 加载函数”的映射
const views = import.meta.glob('../views/**/*.vue')

// 把后端下发的菜单树转成路由记录
const routes = menus
  .filter(m => views[`../views/${m.component}.vue`]) // 缺文件就跳过，防止 component 为 undefined
  .map(m => ({
    path: m.path,
    name: m.name,
    component: views[`../views/${m.component}.vue`], // 路由级懒加载，按菜单切 chunk
    meta: { roles: m.roles } // 角色写在 meta，守卫里读取
  }))

// 逐条注册动态路由
routes.forEach(r => router.addRoute(r))

// 退出登录时按 name 移除，避免下次登录残留旧权限
routes.forEach(r => router.hasRoute(r.name) && router.removeRoute(r.name))
```

- 静态路由只保留登录页与 404，刷新页面时靠守卫重新拉菜单并注册。
- `meta.roles` 是权限判断的唯一来源，按钮级权限也读同一份数据。
- 退出登录必须移除动态路由，否则切换账号后旧路由仍然可达。
- 懒加载让每个菜单页各自成 chunk，首屏只下载当前页面的代码。
- 菜单树结构变化时只改后端数据，前端路由表不用重新发版。

**怎么度量收益**：用 Chrome DevTools 的 Network 面板记录首屏 `transferred` 体积；用 Performance 面板录制一次登录到首页的过程，看 `scripting` 时间；权限部分用固定用例清单核对，每条路径写上预期结果。

**什么时候不该用**：角色只有“已登录 / 未登录”两种时，静态路由加一个全局守卫就能覆盖，动态注册会增加刷新时的时序问题。页面总数在三十个以内且不做按角色裁剪时，一次性打包的维护成本低于维护菜单树的成本。

#### 场景 2：低端安卓的首屏加载

**业务背景**：目标机型在千元机档位，首屏可交互时间偏长，用户会在白屏期间退出。用可复现的测量方法：在 Lighthouse 移动端模式下跑，默认带网络与 CPU 节流。

**怎么用本页知识解决**：思路是把首屏必须的代码压到最小，其余页面和重组件延后下载，首屏数据在服务端取好。

```js
// 路由表按页面分段，首页进主包，其余页面各自成 chunk
const routes = [
  { path: '/', component: Home },
  { path: '/report', component: () => import('./views/Report.vue') }
]

// 图表库体积大，进入该组件时再下载，加载期间显示骨架
const Chart = defineAsyncComponent({
  loader: () => import('./Chart.vue'),
  loadingComponent: Skeleton, // 占位骨架，避免布局跳动
  delay: 200, // 200 毫秒内加载完就不显示骨架，防止闪烁
  errorComponent: Reload // 加载失败给重试入口，不要留白屏
})

// Nuxt 页面里首屏数据在服务端取，随 payload 下发，客户端不重复请求
const { data } = await useAsyncData('home', () => $fetch('/api/home'))
```

- 首屏页面不参与懒加载，避免多一次网络往返把 LCP 推后。
- `delay` 用来压住骨架闪烁，取值要按实测的加载耗时调，不要照抄。
- `errorComponent` 覆盖弱网重试路径，否则用户看到的是空白区域。
- 服务端取到的数据要能序列化，`Date`、`Map` 这类值需要先转成普通结构。
- 服务端与客户端渲染结果要一致，否则出现水合不匹配的告警。

**怎么度量收益**：Lighthouse 移动端报告里的 FCP、LCP、TBT；Chrome DevTools Network 面板里 `initial JS` 的 `transferred` 数值；用 web-vitals 库把 LCP、INP、CLS 上报到自有埋点，按机型分桶查看。

**什么时候不该用**：首屏渲染就依赖的组件不要异步拆出去，会多一次往返并延后可见时间。页面只有两三个时，懒加载产生的并发请求数增加，缓存命中下降，主包直接包含全部页面反而稳定。

#### 场景 3：多人协作白板的实时状态

**业务背景**：一块画布上同时有上千个图元，拖动时每帧都在产生坐标数据。用可复现的测量方法：在 Performance 面板录制 5 秒连续拖动，看每一帧的 `scripting` 时间。

**怎么用本页知识解决**：思路是区分共享状态与局部状态，共享状态用 Pinia 管，高频数据不进入 store。

```js
// setup 风格 store：只放跨页面共享的状态
export const useBoardStore = defineStore('board', () => {
  const meta = ref({ title: '未命名白板' }) // 变更频率低，用 ref 即可
  const shapes = shallowRef([]) // 图元数量大，浅层引用不做深层代理

  function commit(next) {
    shapes.value = next // 落笔结束整体替换数组，减少触发次数
  }

  return { meta, shapes, commit }
})
// 画笔轨迹这类每帧变化的数据留在组件内，不写进 store
```

- Pinia 不需要 mutation，直接改 state，devtools 里仍能看到变更记录。
- `shallowRef` 只跟踪引用替换，图元数量大时省掉深层代理的开销。
- 把一帧内的多次修改合并成一次 `commit`，订阅回调执行次数随之下降。
- 协作消息的收发放在 store 之外的服务层，store 只存合并后的结果。
- 需要审计每次变更来源的团队可以保留 Vuex 的 mutation 约束；Vuex 官方文档说明该项目处于维护模式，新项目推荐 Pinia。

**怎么度量收益**：Vue Devtools 的 Pinia 面板看每次操作触发的 state 变更条数；Performance 面板看拖动期间的帧间隔与 `scripting` 时间；用 `store.$subscribe` 计数每秒订阅回调执行次数。

**什么时候不该用**：只在单个组件内部使用的状态放进 store，会扩大订阅范围并增加调试噪音。白板只有单人编辑且没有跨页面共享时，组件内 `ref` 就够，引入 store 只增加一层间接。

### 行业先进实践

- **路由级懒加载与手动分包（出处：Vue Router 官方文档 / Vite 官方文档）**：Vue Router 文档把 `() => import(...)` 作为路由懒加载的写法，Vite 文档提供 `build.rollupOptions.output.manualChunks` 控制分包边界。两者配合能把首屏代码与其余页面分开，配合 HTTP 缓存减少重复下载。借鉴方式是在项目里固定一条规则：新增页面必须走动态 import，并写进代码评审清单。
- **权限路由由后端菜单驱动（出处：开源项目 vue-element-admin 的权限验证文档）**：该文档描述了两条路线，前端维护路由表再按角色过滤，或后端返回菜单树后由前端动态注册。后者把角色变更留在服务端，前端不用跟着发版。借鉴方式是先定菜单树的字段结构，再写转路由记录的函数，函数单独放一层便于测试。
- **store 的 SSR 状态水合（出处：Pinia 官方文档 SSR 章节）**：服务端创建 store 并取数，把 `state` 序列化进页面传给客户端，客户端用它初始化，避免两端数据不一致导致水合告警。借鉴方式是在服务端渲染入口里统一收集要下发的 state，不要在每个组件里各写一份。
- **数据获取结果随 payload 复用（出处：Nuxt 官方文档 数据获取章节）**：`useAsyncData` 在服务端执行的返回值会随 payload 下发，客户端水合阶段直接复用，不再发一次同样的请求。借鉴方式是在页面里先确认哪些请求能在服务端完成，把只能在浏览器发起的请求留在 `onMounted`。
- **服务端组件按需水合（出处：需核对官方文档：Nuxt 官方文档 server components 章节的启用条件与当前限制）**：思路是让部分组件只在服务端渲染、不下发对应 JS。我无法确认它在当前稳定版里的启用方式与限制，落地前需核对官方文档的启用开关、能否嵌套客户端组件、以及交互事件的限制。

### 从学到用：落地路线

第 1 步试点：选一个业务模块，把非首屏页面改成路由懒加载。验收标准：构建产物中出现该页面独立的 chunk 文件。

第 2 步验证：用 Lighthouse 移动端模式跑一次改动前后的首页。验收标准：FCP、LCP、TBT 的具体数值记录在同一份报告里。

第 3 步推广：把权限路由写法、目录分层规则、store 边界写进项目 README 与新建模块模板。验收标准：按模板新建的模块不做额外改动就能通过 lint 与构建。

第 4 步防回退：在 CI 里加产物体积阈值检查和依赖方向检查。验收标准：超出阈值或出现跨层引用的 PR 直接构建失败。

### 动手作业

**目标**：搭一个带角色权限、懒加载路由、Pinia 状态管理的小后台，并跑出一份首屏指标报告。

**步骤**

1. 用 Vite 创建 Vue 3 项目，安装 vue-router 与 pinia，建三层目录：`views`、`stores`、`router`。
2. 写静态路由，只放登录页与 404 页；登录成功后从本地 JSON 菜单树生成动态路由并 `addRoute`。
3. 把非首屏页面改成 `() => import(...)`，构建后查看 `dist/assets` 下的 chunk 文件数量。
4. 建一个 setup 风格的 board store，把跨页面共享的筛选条件放进去，组件内临时状态留在组件里。
5. 在全局前置守卫里校验登录态与 `meta.roles`，未通过时跳到登录页，并把原始地址写进 query。
6. 用 Chrome DevTools Performance 录制一次首页加载，导出录制结果文件。
7. 用 Lighthouse 移动端模式跑一次首页，保存报告。

**验收标准**

- 在地址栏直接访问未授权的页面路径，被重定向到登录页。
- 构建产物里至少有 2 个独立 chunk，首屏 chunk 中不含报表页代码。
- 组件内临时状态没有出现在任何 store 的 `state` 中。
- 退出登录后再次访问原路径，控制台用 `router.hasRoute(name)` 核对，动态路由为已移除状态。
- Lighthouse 报告中 FCP、LCP、TBT 都有具体数值，报告文件保存在仓库内。

