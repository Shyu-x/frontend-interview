---
title: 构建工具原理
description: webpack、Vite、ESBuild、Rollup 与 loader/plugin 的原理对比
---

# 构建工具原理

> 本页按「概念、原理、代码」逐题展开相关面试专题。

## 1. webpack 原理（依赖图 + module/compilation/chunk + plugin机制 + Tapable）

### 1.1 核心概念

| 概念 | 说明 |
|------|------|
| Entry (入口) | 解析入口模块 |
| import/require | 递归分析模块依赖 |
| loader | 处理非 JS 模块（ts, css, img 等） |
| chunk | 合并多个 module（按 splitChunks 规则） |
| bundle | 打包产物（JS 文件或代码分割后的分片） |

**流程：** webpack 入口 → 分析依赖图 → 打包成 chunk → 输出 bundle

### 1.2 构建流程

| 阶段 | 说明 |
|------|------|
| 1. 初始化 | webpack CLI 启动，合并配置文件 |
| 2. 编译 | 创建 Compilation 对象 |
| 2a | entry 模块从文件读取得到 module |
| 2b | 分析 import/require 递归处理依赖 |
| 2c | 应用 loader（use 数组，从右到左） |
| 2d | 生成 chunk（图关系） |
| 2e | 调用 plugin（emit 钩子） |
| 3 | 输出文件到 dist |
| 4 | 完成 |

### 1.3 module / compilation / chunk 关系

| 概念 | 说明 |
|------|------|
| module | 每个源文件被解析后的对象（Source AST 编译后） |
| compilation | 某一次编译过程中的所有 module 和 chunk |
| chunk | 打包产物分组（由 entry / splitChunks / dynamic import 产生） |
| - entry chunk | 入口 chunk，包含 runtime |
| - async chunk | 按需加载的异步 chunk |
| - vendor chunk | 第三方库 chunk |
| bundle | 最终输出文件（一个 chunk 对应一个 bundle） |

### 1.4 plugin 机制（Tapable 钩子系统）

```javascript
const { SyncHook, AsyncSeriesHook } = require('tapable')

// 第 1 段：准备阶段——引入 tapable 的钩子原语
// tapable 是 webpack 事件系统的底座：SyncHook 走同步调用链，AsyncSeriesHook 走串行异步调用链。
// 易错点：此处解构出的两个类在本文件中并未被直接使用，webpack 插件通常通过 compiler.hooks 拿到
// 已实例化好的钩子；保留这两行是为了对照说明"自定义钩子时才会手动 new"的用法。

class MyPlugin {
  // 第 2 段：插件入口——apply 契约
  // webpack 在初始化阶段会调用每个插件的 apply(compiler)，并把整个编译器实例交给你；
  // 插件不能自己执行，只能"登记"到 compiler.hooks 上，由 webpack 在对应时机回调。
  apply(compiler) {
    compiler.hooks.emit.tap('MyPlugin', (compilation) => {
      // 第 3 段：emit 同步 tap——资源落盘前的最后观察点
      // emit 在"资源已生成、尚未写入 output 目录"时触发，此刻仍可增删 assets；
      // compilation.assets 是 { 文件名: 资源对象 } 的映射，故用 Object.keys 取到即将写盘的文件清单。
      // emit 本身是异步钩子，但 tap 注册的是同步回调，返回值会被忽略、也无法中断流程。
      console.log('编译中...', Object.keys(compilation.assets))
    })

    compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
      // 第 4 段：emit 异步 tapAsync——必须且只能回调一次
      // tapAsync 的回调式签名把"完成信号"显式交给插件；emit 是 AsyncSeriesHook，同一钩子上的
      // 多个 tap 串行排队，前一个不 callback，后面的插件乃至整个打包都会永久挂起（最经典的易错点）。
      // 这里用 setTimeout 模拟 100ms 的 IO/网络耗时，回调即代表"我这段逻辑结束了"。
      setTimeout(() => { callback() }, 100)
    })

    compiler.hooks.compilation.tap('MyPlugin', (compilation) => {
      // 第 5 段：compilation 钩子内再挂载——应对 watch 重编译
      // compilation 代表"一次编译产物"，watch 模式下每次改动都会新建一个，因此 assets 相关的
      // 子钩子必须在这里按次注册；若写在 apply 顶层，就只能绑定到首次编译的那一个对象上（边界条件）。
      compilation.hooks.optimizeChunkAssets.tap('MyPlugin', (chunks) => {})
      // optimizeChunkAssets 在 chunk 产物优化阶段触发，chunks 为本次待优化的 chunk 集合；
      // 回调体留空，表示仅占用该钩子位置、不改变产物——去掉这个 tap 与保留它在结果上等价。
    })
  }
}
```
**Tapable 钩子类型**：
| 类型 | 行为 |
|------|------|
| SyncHook | 同步串行 |
| SyncBailHook | 同步，返回非undefined时停止 |
| SyncWaterfallHook | 同步，上一个返回值作为下一个输入 |
| AsyncParallelHook | 异步并行（Promise.all）|
| AsyncSeriesHook | 异步串行（await）|

## 2. Vite 为什么快

### 2.1 核心对比：webpack vs Vite

```
webpack Dev Server:
  启动 → 递归构建整个依赖图（可能数千个模块）
          → 构建时间长（秒级到分钟级）
          → 修改 → 重新构建

Vite Dev Server:
  启动 → 启动Dev Server（秒级）
          → 按需编译（浏览器请求时才编译单个文件）
          → 修改 → HMR只更新改动的模块（毫秒级）
```

### 2.2 ESM Dev Server（无Bundle）

| 步骤 | 说明 |
|------|------|
| 1 | 浏览器请求: GET /src/main.ts |
| 2 | Vite Server 拦截请求 |
| 3 | 解析 import（裸导入：'vue'） |
| 4 | 转换为本地路径 |
| 5 | 替换 import.meta.url |
| 6 | 注入 HMR 运行时 |
| 7 | 处理 TypeScript/JSX（esbuild，ms级） |
| 8 | 返回 ES Module（浏览器直接执行） |

**优势：** 浏览器收到多个小文件，而不是一个巨大 bundle；利用 HTTP2 multiplexing 并行加载

### 2.3 HMR 流程

| 步骤 | 说明 |
|------|------|
| 1 | 文件修改 |
| 2 | Vite 监听到变化（fs.watch） |
| 3 | 重新编译改动的模块（esbuild，ms级） |
| 4 | 向浏览器推送 HMR 事件（WebSocket） |
| 5 | 浏览器端 HMR Runtime 接管 |
| 6 | 接受 `hot.accept(['./module'], callback)` |
| 7 | 根据边界更新受影响的模块 |
| 8 | 更新后重新执行 render（通常 < 50ms） |

Vite 不需要 bundle 的原因：现代浏览器原生支持 ESM，Vite 直接利用浏览器的能力分发模块，只在必要时编译单个文件。

Vite 不需要 bundle 的原因：现代浏览器原生支持 ESM，Vite 直接利用浏览器的能力分发模块，只在必要时编译单个文件。

## 3. ESBuild 为什么快

```
ESBuild 为什么比 ts-loader/babel-loader 快 10-100倍？

1. Go语言编写 → 编译为机器码，单进程多线程
   JavaScript（Babel/ts-loader）→ V8引擎解释执行

2. 完全兼容 Go 运行时内存模型
   - 无需 AST 在进程间传递
   - 无需序列化/反序列化

3. 无需 AST traversal
   - Babel: parse → traverse → transform → generate（多次遍历AST）
   - ESBuild: 一次遍历，同时完成解析和写入
   - 内存访问局部性极好

4. 从零编写解析器，非复用通用工具
   - 针对 JavaScript/TypeScript 定制的轻量解析器

Benchmarks（官方）：
  esbuild:    3.98s（编译30000个文件）
  rollup:     31.6s
  webpack:    47.7s
```

**ESBuild 的限制**：

- 不支持类型检查（需要 tsc --noEmit 配合）
- 不支持装饰器旧语法（需 babel）
- 不支持自定义 AST 转换（babel 的灵活性无法替代）

## 4. Rollup vs webpack 区别

| 特性 | webpack | Rollup |
|------|---------|--------|
| 定位 | 应用打包（development + production） | 库打包 |
| HMR | 完善 | 不支持 dev server HMR |
| 产物 | bundle（所有模块打包进一个/少数文件） | flat bundle（tree-shaking 效果最好）|
| tree-shaking | 支持但不够彻底（commonjs需额外配置） | 完美支持 ESM静态分析 |
| 插件生态 | 极其丰富 | 较少 |
| 输出格式 | IIFE/CJS/ESM/UMD | CJS/ESM/IIFE/UMD |
| chunk 分割策略 | 复杂但强大 | 简洁 |

```javascript
// Rollup 打包产物示例（天然 ESM，tree-shaking 完美）
// 输入：两个 ESM 模块，导出10个函数，只用3个
// 输出：只有3个函数及其依赖的代码（未使用的完全移除）

export default {
  input: 'src/index.js',
  output: {
    format: 'esm',
    file: 'dist/index.mjs',
    sourcemap: true
  },
  plugins: [resolve(), commonjs(), terser()]
}
```

**结论**：生产环境用 Vite（基于 esbuild 开发 + Rollup 生产构建），开发环境用 Vite（基于 esbuild + 原生 ESM）。

## 5. loader vs plugin 区别

| 维度 | loader | plugin |
|------|--------|--------|
| 处理阶段 | module 转换（文件→JS字符串） | 整个构建生命周期 |
| 执行时机 | 匹配文件路径时，链式调用 | 钩子回调（compiler/compilation） |
| 数量 | 处理单文件（链式，一个接一个） | 处理编译过程 |
| 接口 | `source → (loader pipeline) → JS string` | `apply(compiler) { compiler.hooks.xxx.tap(...) }` |
| 用途 | ts-loader, css-loader, vue-loader | HtmlWebpackPlugin, MiniCssExtractPlugin |

```javascript
// loader 示例：CSS 转换链
// css-loader: CSS → JS module（导出为字符串）
// style-loader: JS module → <style>标签注入DOM

// plugin 示例：生成报告
class BuildReportPlugin {
  apply(compiler) {
    compiler.hooks.done.tap('BuildReportPlugin', (stats) => {
      const { assets, modules } = stats.toJson({ assets: true, modules: true })
      console.log(`生成 ${assets.length} 个文件，共 ${modules.length} 个模块`)
    })
  }
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [webpack 文档](https://webpack.js.org/concepts/) | webpack 核心概念与 loader/plugin 机制的权威说明，面试高频。 | 精读“概念”与“插件”章节，带着“依赖图如何生成”的问题，画一遍 module/compilation/chunk 关系图。 |
| [Vite 官方文档](https://cn.vitejs.dev/) | Vite 官方文档，涵盖开发服务器与构建流程，理解其快的前提。 | 读“为什么选 Vite”与“构建”部分，带着“原生 ESM 如何减少打包”的问题，试跑 dev 与 build 对比。 |
| [esbuild 文档](https://esbuild.github.io/) | esbuild 官方文档，了解原生编译带来的性能优势。 | 读“为什么快”与“架构”章节，带着“它为什么不用 AST 遍历”的问题，对比 webpack 构建速度。 |
| [Rollup 文档](https://cn.rollupjs.org/) | Rollup 官方文档，学习 Tree Shaking 与 ES 模块打包，对比 webpack。 | 读“Tree Shaking”与“插件”章节，带着“Rollup 为何更适合库打包”的问题，用一个小库试打包。 |
| [Why Vite](https://vite.dev/guide/why) | Vite 官方 Why Vite 文档，权威解释 Vite 为什么快。 | 精读 guide/why.md，重点看“慢服务器启动”与“HMR”部分，总结 Vite 的优化点。 |
| [Entry Chunk](https://rolldown.rs/glossary/entry-chunk) | Entry Chunk 术语解释，帮助理解 webpack/Vite 的 chunk 概念。 | 读该词条，带着“entry chunk 如何生成”的问题，结合构建产物分析 chunk 划分。 |
| [Loader hooks](https://docs.deno.com/runtime/reference/loader_hooks/) | Loader hooks 官方说明，理解 loader 在构建流程中的执行时机。 | 读 loader hooks 的触发顺序，带着“loader 与 plugin 钩子有何不同”的问题对比。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [webpack 入门指南](https://webpack.js.org/guides/getting-started/) | 从零手配项目，亲手添加 loader 与 plugin，直观对比两者差异。 | 按步骤配置，每加一个 loader 或 plugin 后运行构建，记录它们分别在哪个阶段介入。 |
| [esbuild 架构说明](https://github.com/evanw/esbuild/blob/main/docs/architecture.md) | 深入 esbuild 架构，总结它为什么快（并行、少遍历、内存布局）。 | 精读该文，画出 esbuild 的构建流水线，标记出并行与减少遍历的关键设计。 |
| [rollup](https://github.com/rollup/rollup) | Rollup 源码 Graph.ts，可读的依赖图实现，理解模块图构建。 | 打开 Graph.ts，重点看模块解析与依赖收集函数，带着“依赖图如何存储”的问题读。 |
| [vite](https://github.com/vitejs/vite) | Vite 源码 server/index.ts，理解开发服务器如何利用原生 ESM。 | 读 server/index.ts 的 createServer 与中间件部分，搞清楚请求如何被转换为模块。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vite：为什么选 Vite（中文）](https://cn.vitejs.dev/guide/why.html) | 中文详解 Vite 为什么快，讲清原生 ESM 开发服务器与预构建。 | 通读全文，重点看预构建与 HMR 部分，读完用自己的话解释 Vite 冷启动为何快。 |
| [Vite：依赖预构建](https://vite.dev/guide/dep-pre-bundling.html) | 用 optimizeDeps 观察缓存目录，解释何时重新预构建。 | 按教程配置 optimizeDeps，观察 node_modules/.vite 缓存，修改依赖后看何时触发重新预构建。 |
| [Vite：插件 API（中文）](https://cn.vitejs.dev/guide/api-plugin.html) | Vite 插件 API 中文教程，动手写 transform 钩子，理解 plugin 机制。 | 按教程写一个 transform 插件并打印执行顺序，对比 webpack 的 Tapable 钩子。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格首屏 | 依赖图、module/compilation/chunk | Vite 生产构建 + 路由级动态 import | 表格库与组件库常被合进入口 chunk，需要单独切出 |
| 低端安卓机上的投放落地页 | ESBuild 为什么快、语法降级与 target | esbuild 的 build API + browserslist | 降级范围放大会增大产物体积，target 要与支持矩阵对齐 |
| 多人协作白板的本地开发 | Vite 为什么快（原生 ESM + HMR） | Vite dev server | HMR 边界没写对会整页刷新，白板画布状态丢失 |
| monorepo 里多个包共用一套依赖 | 依赖图、chunk 划分 | pnpm workspace + Turborepo | 同一依赖被多个包各自打包，产物里出现重复代码 |
| 微前端子应用独立发布 | chunk、plugin 机制 | Module Federation | 共享依赖的版本协商规则要先在文档里定死 |
| npm 上发布的组件库 | Rollup vs webpack | Rollup library 模式 | peer 依赖要 external，否则消费者拿到重复的 React |
| Node 侧 BFF 服务打包 | loader vs plugin、ESBuild 为什么快 | esbuild bundle + external | 含原生模块的依赖必须 external，不能打进产物 |
| CI 里重复跑同一份构建 | plugin 机制、Tapable 钩子 | webpack cache、Turborepo 缓存 | 缓存键要覆盖 lockfile、环境变量与构建配置 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：表格页一屏渲染 1000 行以上数据，用户打开 URL 后要等入口脚本下载并解析完才看到内容。项目里组件库、工具库和业务代码被打进同一个入口 chunk，改一行业务代码，用户就要重新下载整个文件。

**怎么用本页知识解决**：先把依赖图里"很少改动"的第三方模块和"频繁改动"的业务模块分成不同 chunk，再让表格相关代码在首屏可交互之后按需加载。这样第三方 chunk 的文件名与内容在业务改动后保持不变，浏览器缓存放得住。

```js
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {                       // 按模块 id 决定归属
          if (id.includes('node_modules/lodash')) return 'vendor-lodash'; // 工具库单独成块
          if (id.includes('node_modules/echarts')) return 'vendor-chart'; // 图表库单独成块
        },
      },
    },
  },
};
```

- 思路来自本页讲的依赖图：构建工具先遍历 import 关系，再按规则把模块分配到 chunk。
- manualChunks 返回字符串时，同一字符串下的模块进同一个文件；返回 undefined 时交回默认策略。
- 拆出的 vendor chunk 与业务 chunk 并行下载，入口 chunk 字节数下降。
- 表格组件用 `import()` 动态加载，Vite 会为它单独产出一个 chunk，并在运行时插入 script 标签。

**怎么度量收益**：用 Chrome DevTools 的 Network 面板看清缓存后的首次请求字节数；用 Lighthouse 在移动端模拟下读 LCP 与 TBT；用 rollup-plugin-visualizer 生成的产物图确认每个 chunk 的模块构成。

**什么时候不该用**：项目部署在内网、首屏资源总量本来就小，拆包带来的配置维护成本高于收益。页面数量少且所有页面共用同一批依赖，拆包只增加 HTTP 请求数，命中缓存的概率没有变化。

#### 场景 2：低端安卓机上的投放落地页

**业务背景**：落地页主要在旧版安卓 WebView 和内置浏览器里打开，这些环境对内置于浏览器的新语法支持不一致，解析失败时页面直接白屏。团队需要按支持矩阵决定构建期的语法降级范围。

**怎么用本页知识解决**：本页讲到 esbuild 用 Go 实现、把解析与打印并行化，构建期的降级转换本身开销很低。把目标环境写进构建配置，让转换只发生在目标环境不支持的语法上，不要手写兼容分支。

```js
// build.mjs
import { build } from 'esbuild';           // 使用 esbuild 的 JS API

await build({
  entryPoints: ['src/main.js'],            // 入口文件
  bundle: true,                            // 把依赖一起打进产物
  format: 'iife',                          // 直接给浏览器 script 标签用
  target: ['chrome80', 'safari13'],        // 目标环境决定降级范围
  minify: true,                            // 压缩标识符与空白
  outdir: 'dist',                          // 输出目录
});
```

- target 写的是运行环境，esbuild 只转换这些环境不支持的语法，不支持的语法集越大，产物越大。
- `format: 'iife'` 产出不需要模块加载器的自执行脚本，适合嵌入到已有页面。
- 把语法降级放在构建期，运行期就不必引入 polyfill 加载器，减少一次往返请求。
- target 的值与 package.json 的 browserslist 要保持同源，避免两处配置互相矛盾。

**怎么度量收益**：用 Lighthouse 的移动端模拟记录 TBT 与 LCP；在真实旧机型或用 BrowserStack 打开页面，看控制台是否抛 SyntaxError；对同一入口分别用不同 target 构建，比对产物体积。

**什么时候不该用**：目标环境全部支持原生 ESM 且浏览器版本集中，降级到旧语法只增大产物，没有兼容收益。构建目标是给 Node 运行的 SSR 产物时，浏览器 target 不适用，应改用 node 侧 targets。

#### 场景 3：monorepo 里发布的组件库

**业务背景**：组件库放在 monorepo 的 packages 目录下，被 3 个业务包引用。库产物过去打成单个文件，业务方只用一个按钮组件，却把整库代码带进了自己的产物。

**怎么用本页知识解决**：本页对比过 Rollup 与 webpack 在库打包上的差异，Rollup 以 ESM 为输入输出，对未使用导出做静态分析。用 Rollup 的 library 模式输出 ESM 与 CJS 两份产物，并把 React 这类 peer 依赖标记为 external。

```js
// rollup.config.mjs
export default {
  input: 'src/index.js',                      // 库入口
  external: ['react', 'react-dom'],           // peer 依赖不打进产物
  output: [
    { file: 'dist/index.js', format: 'es' },  // 给打包器消费
    { file: 'dist/index.cjs', format: 'cjs' },// 给 Node 环境消费
  ],
};
```

- external 列表里的模块保留为 import 语句，消费者用自己的那份依赖，产物里不出现重复实现。
- 输出 ESM 让下游打包器能顺着静态结构做未使用代码消除，前提是模块内没有顶层副作用。
- package.json 里同时声明 module 与 main 字段，指向两份产物；exports 字段的映射要写清楚。
- 组件库自身不做代码分割，分割交给最终应用决定，库只负责提供可静态分析的模块结构。

**怎么度量收益**：用 rollup-plugin-visualizer 查看产物构成；在示例应用里只引入一个组件并构建，比对引入前后的产物体积；用 `node -e "import(...)"` 验证 ESM 产物能被加载。

**什么时候不该用**：库内部依赖大量 CommonJS 模块且需要运行时注入，Rollup 需要额外插件才能处理，改造成本要先算清楚。库的消费者只有一个应用，且该应用自己会做完整打包优化，单文件产物不会造成重复代码。

### 行业先进实践

依赖预构建（出处：Vite 官方文档 Dependency Pre-Bundling 一节）。开发服务器启动时用 esbuild 把 node_modules 里的 CommonJS 与 UMD 依赖转成 ESM，并合并成数量少的文件。浏览器发出的模块请求数下降，页面加载不再被大量独立请求摊薄。借鉴方式：把预构建缓存目录挂到 CI 缓存上，避免每次冷启动重跑。

共享依赖拆包（出处：webpack 官方文档 SplitChunksPlugin 一节）。默认策略按模块来源与复用次数把 node_modules 里的模块聚合，避免同一依赖出现在多个入口产物。借鉴方式：先跑默认配置看产物结构，确认存在重复模块后再手写 cacheGroups。

任务级缓存（出处：Turborepo 官方文档 Caching 一节）。同一个任务在输入未变时直接恢复上次的输出，跳过执行。输入包含源码哈希、lockfile、环境变量与命令参数。借鉴方式：把构建命令的输入显式声明出来，遗漏环境变量会导致缓存命中错误结果。

转换只在必要时发生（出处：esbuild 官方文档 API 参考中的 target 字段）。target 描述的是运行环境，esbuild 按目标环境决定哪些语法需要转换，不支持到支持的映射由它内部维护。借鉴方式：让 target 由一份支持矩阵驱动，不要在多处各写一遍。

共享依赖的版本协商（出处：需核对官方文档：webpack 官方文档 Module Federation 的 shared 配置项，核对版本不匹配时的回退行为与单例约束）。

### 从学到用：落地路线

第 1 步，选一个构建链路独立、页面数量少的前台项目做试点，只开默认拆包策略，不动业务代码。验收标准：构建成功，产物 chunk 清单与试点前的构建结果一起记录在文档里。

第 2 步，对同一份代码做拆分前后两次构建，在固定浏览器版本、固定网络限速、清空缓存的条件下跑 Lighthouse。验收标准：LCP 与 TBT 两次结果写入表格，每个 chunk 的模块来源都能说清。

第 3 步，把配置抽成共享 preset 包，其他项目通过继承引用，preset 单独发版本。验收标准：新项目接入只改一处配置，流水线日志里能读到 preset 版本号。

第 4 步，把产物体积上限与构建时长上限写成 CI 断言，超限让流水线失败，并把阈值改动纳入代码评审。验收标准：人为往入口加一个大依赖后，流水线能拦住这次提交。

### 动手作业

目标：把一个小型后台表格页面的首屏产物从单 chunk 改成按依赖拆分的多 chunk，并留下一份能复现的度量记录。

步骤：

1. 用 Vite 建一个含 1000 行表格的页面，数据由本地 JSON 生成，跑一次构建并记录产物文件名与体积。
2. 接上 rollup-plugin-visualizer，导出产物构成图，标出体积前三的模块。
3. 改 vite.config.js，用 manualChunks 把第三方库与业务代码分到不同 chunk。
4. 把表格组件的引入改为动态 `import()`，让它在首屏渲染完成后再加载。
5. 重新构建，记录 chunk 数量、每个 chunk 的体积、入口请求的字节数。
6. 在同一浏览器、同一网络限速、清空缓存的条件下跑 Lighthouse，记录 LCP 与 TBT 的两次结果。
7. 把配置、产物图与两次度量记录写进 README，注明运行条件。

验收标准：

- 构建输出中第三方依赖与业务代码落在不同 chunk 文件。
- 打开页面后 Network 面板里，入口 chunk 不再包含表格库代码，表格 chunk 在首屏渲染后请求。
- 只改动一个业务组件的源码后重新构建，第三方 chunk 的文件名与内容保持不变。
- README 中的两次 Lighthouse 记录写明浏览器版本、网络限速、是否清缓存。
- 粘贴产物构成图，并指出图中体积前三的模块分别落在哪个 chunk。

