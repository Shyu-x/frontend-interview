---
title: 开发体验与构建优化
description: HMR、code splitting 与 webpack 优化
---

# 开发体验与构建优化

> 本页按「概念、原理、代码」逐题展开相关面试专题。

## 1. HMR 原理（webpack-dev-server + WebSocket + HMR Runtime）

**HMR 完整流程：**

| 步骤 | 说明 |
|------|------|
| 1 | 文件变化 |
| 2 | webpack-dev-server 监听文件变化（chokidar） |
| 3 | 重新编译变化的文件及其依赖链（增量编译，比全量快很多） |
| 4 | 通过 WebSocket 通知浏览器 |
| 5 | 浏览器端 HMR Runtime 接管 |
| 6 | hotCheck() 比较模块版本 |
| 7 | 找到模块的父依赖链 |
| 8 | 调用 hot.accept(['module'], callback) |
| 9 | 执行模块更新 + 回调 |
| 10 | 若父模块无法接受（无 accept），向上冒泡 |
| 11 | 直到找到接受者或到达 entry |
| 12 | 若均不接受，整页刷新 |

**更新顺序：** 自底向上更新（子模块 → 父模块 → 视图）

**Vite vs webpack HMR**：

- webpack HMR：webpack-dev-server 重新编译 → WebSocket推送 → 浏览器执行 accept 回调
- Vite HMR：esbuild 重新编译单个文件（ms级）→ WebSocket推送 → 浏览器替换对应模块

## 2. code splitting 原理 + chunk vs bundle 区别

```
code splitting = 将代码按需分割为多个 chunk（减少初始加载体积）

分割策略：
  1. 入口分割：每个 entry → 一个 chunk
  2. 动态 import：() => import('./chunk.js') → 异步 chunk
  3. splitChunks：提取公共依赖（node_modules → vendor）
```

```javascript
// 动态 import（自动生成异步 chunk）
const Home = () => import('./views/Home.vue')

// webpack 配置 splitChunks
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
          reuseExistingChunk: true
        },
        common: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  }
}
```

### 2.1 chunk vs bundle

| 维度 | chunk | bundle |
|------|-------|--------|
| 概念 | 编译时的代码分组逻辑 | 最终输出的文件 |
| 生成 | 由 webpack 根据 split 规则生成 | 由 chunk 生成 |
| 关系 | chunk 是 bundle 的中间态 | 一个或多个 chunk 组合成一个 bundle |
| 类型 | entry chunk, async chunk, runtime chunk | JS/CSS/HTML bundle |

**编译产物：**

| 文件 | 说明 |
|------|------|
| dist/main.js | main bundle（来自 entry chunk） |
| dist/vendors.js | vendor chunk bundle（splitChunks 配置） |
| dist/Home.abc123.js | 异步 chunk bundle（dynamic import） |

## 3. webpack 优化

### 3.1 splitChunks

```javascript
splitChunks: {
  // 第 1 段：分包总开关 —— 决定"从哪些 chunk 里抽模块、怎么抽"
  // chunks: 'all' 同时作用于 initial（同步）与 async（异步）chunk；若只写 'async'（webpack 默认），
  // 通过 import() 加载的模块会分包，但首屏同步引入的公共代码仍会散落到各 entry bundle 里、无法复用。
  chunks: 'all',
  // 第 2 段：cacheGroups 是分包规则的容器 —— 每个 key 就是一个"候选组"
  // 一个模块可以同时命中多个组，最终由 priority 决定归属；因此组的划分本质是"优先级互斥"设计。
  cacheGroups: {
    // 第 3 段：第三方依赖组 —— 把 node_modules 里的东西挑出来单独成一个文件
    // test 用 [\\/] 而非写死 '/'，是为了同时兼容 POSIX 与 Windows 路径分隔符；
    // 前后都要求分隔符，是为了防止误伤路径中恰好含 "node_modules" 字样的业务目录（如 my_node_modules/foo.js）。
    // priority: -10 比 common 的 -20 高，保证 node_modules 模块先被本组抢走，而不是掉进 common 组。
    defaultVendors: {
      test: /[\\/]node_modules[\\/]/,
      priority: -10,
      // reuseExistingChunk: true —— 若某个模块已被其它 chunk 打包过，直接引用那个 chunk，不再复制一份，
      // 这是避免"同一份代码在多个 bundle 里重复出现"的关键开关。
      reuseExistingChunk: true,
      // name: 'vendors' 把组固定命名为 vendors，使多个 entry 共享同一份第三方产物；
      // 收益是缓存友好（第三方不变则 hash 不变），代价是所有入口必须一起加载这个整包，
      // 若入口之间依赖差异极大，可改成函数式 name（如 (module) => 按包名分包）以换取更细粒度缓存。
      name: 'vendors'
    },
    // 第 4 段：业务公共代码组 —— 兜底规则，捞那些没被上面命中的重复模块
    // 本组没有 test，等于对"所有剩余模块"生效；也没有 name，webpack 会按 chunk 组合自动生成文件名，
    // 这样不会把互不相关的入口强行耦合到同一个文件上。
    common: {
      // minChunks: 2 表示"被至少 2 个 chunk 引用"才值得抽出来。
      // 设为 1 会把只被单个入口用到的模块也拆成独立 chunk，徒增 HTTP 请求与加载开销；
      // 设得过大（如 5）则公共代码抽不出来，多个 bundle 里仍会各存一份。2 是收益/开销的常用平衡点。
      minChunks: 2,
      // priority: -20 低于 defaultVendors，形成"先按依赖来源、再按复用次数"的两级判定顺序。
      priority: -20,
      // 与上面同理：已被其它 chunk 包含的模块直接复用，避免重复打包。
      reuseExistingChunk: true
    }
  }
}
```

### 3.2 tree shaking + terser

```javascript
optimization: {
  // 第 1 段：开启 webpack 的 tree shaking 双开关（标记未使用导出 + 启用副作用分析）
  // usedExports 让 webpack 在编译期为每个导出打上"是否被引用"的标记，真正的删除动作交给压缩器完成；
  // sideEffects 开启后，webpack 才会读取 package.json 的 sideEffects:false 或 module.rules 里的标记，
  // 从而安全地整块跳过"无副作用且导出未使用"的模块——注意此处的 true 是"启用该特性"，与包声明里的 false 不是一回事，最容易混淆。
  usedExports: true,
  sideEffects: true,

  // 第 2 段：自定义压缩器，用 TerserPlugin 把上面标记出的死代码真正抹掉
  // 默认只在 production 下生效；一旦显式写出 minimizer 数组，就等于覆盖默认压缩器，必须自己 new 一个，
  // 否则会出现"配了 options 却没有压缩"的空配现象。数组形式也便于后续追加 CSS 压缩等多处理器。
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        // 第 3 段：compress 选项控制语句级裁剪，兼顾体积与可观测性
        // drop_console 会删掉所有 console.* 调用（含 console.error），线上排障信息随之丢失，
        // 若只想去掉 log/debug 而保留报错，应改用 pure_funcs: ['console.log'] 更精细地定向剔除；
        // drop_debugger 移除 debugger 断点，避免生产环境被调试语句意外中断执行。
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    })
  ]
}
```

### 3.3 babel-loader 优化

```javascript
{
  loader: 'babel-loader',
  options: {
    cacheDirectory: true, // 缓存编译结果（提速50%+）
    cacheCompression: false
  }
}
```

### 3.4 持久化缓存

```javascript
module.exports = {
  cache: {
    type: 'filesystem',  // webpack5 文件系统缓存
    buildDependencies: { config: [__filename] }
  }
}
// 二次构建：只重新编译变化的模块，其他从缓存恢复
```

### 3.5 thread-loader（多进程编译）

```javascript
{
  // 第 1 段：筛选作用范围 —— 决定哪些模块会被这条规则接手
  // test 匹配的是"模块请求路径"（相对/绝对路径字符串），不是磁盘真实文件，所以 node_modules 里的 .js 同样会命中。
  // 生产配置一般还要加 include: path.resolve(__dirname, 'src') 或 exclude: /node_modules/，
  // 否则第三方依赖也会被 babel 重新转译并送进 worker，构建时间与内存都会明显上升。
  test: /\.js$/,
  // 第 2 段：loader 管道 —— 书写顺序与执行顺序相反，是这里最容易踩的坑
  // use 数组按"从右到左（从下到上）"执行：先 babel-loader 产出转译后的代码，再被 thread-loader 接管调度；
  // 正因为 thread-loader 会把它"之后"的 loader 搬进 worker，它必须排在数组最前面才能生效。
  // 数据流：源码 → 字符串 → 逐个 loader 的返回值首尾相接 → 最终交给 webpack 解析 AST；某一环返回 undefined 会直接断链。
  use: [
    {
      // 第 3 段：并行调度 —— 把后续 loader 的工作搬离主线程
      // 原理：thread-loader 自身不转译任何代码，只是在 worker 线程池里代跑排在其后的 loader，主线程只做汇总。
      // workers: 4 表示常驻 4 个 worker；每个 worker 启动有几百毫秒与独立内存开销，
      // 因此它只对"单文件转译耗时高"的项目划算，文件少时反而比串行更慢；取值通常为 CPU 核数 - 1。
      loader: 'thread-loader',
      options: { workers: 4 }
    },
    // 第 4 段：实际转译 —— 真正把 ES2015+ 语法降级为目标环境可执行的代码
    // 降级到什么程度不由这里决定，而取决于 babel.config.js / .babelrc 中的 presets 与 targets；
    // 边界条件：默认只吃 .js（.jsx/.ts 需另配 extensions 或用相应 preset），且找不到 babel 配置时会近乎原样透传，
    // 很容易让人误以为"兼容已经做好了"，所以配置文件的正确性要单独验证。
    'babel-loader'
  ]
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [webpack 文档](https://webpack.js.org/concepts/) | 官方手册，HMR、代码分割与优化章节的权威来源，术语统一。 | 按 HMR、代码分割、构建优化三节顺序读，带着“更新如何打补丁”的问题，读完画出运行时与产物关系图。 |
| [HMR API](https://vite.dev/guide/api-hmr) | 定义 module.hot 的 accept/dispose 接口，是 HMR Runtime 的行为契约。 | 精读 accept 与 dispose 回调说明，思考模块更新后如何自我接管，并列出可热更与不可热更的边界。 |
| [Automatic Code Splitting](https://rolldown.rs/in-depth/automatic-code-splitting) | 讲清 import() 与自动分包如何生成新 chunk，对照本页原理。 | 读触发条件与默认配置，再对照构建输出目录的 chunk 文件名，验证按需加载是否真的发生。 |
| [Manual Code Splitting](https://rolldown.rs/in-depth/manual-code-splitting) | 给出 entry、dependOn、SplitChunksPlugin 等手工分包手段。 | 逐个改配置并观察产物拆分变化，重点读 splitChunks 的 cacheGroups 与复用策略。 |
| [Entry Chunk](https://rolldown.rs/glossary/entry-chunk) | 术语条目，厘清 chunk 与 bundle 的差别，避免概念混用。 | 读完对照 output 目录里的实际文件，用一句话向同事解释 chunk、bundle 与 entry 的关系。 |
| [Bundle Analyzer Plugin](https://rolldown.rs/builtin-plugins/bundle-analyzer) | 用体积树图定位重复依赖，是优化前必备的量化手段。 | 构建后打开报告，找出最大的两个重复包，尝试提取为共享 chunk 并复测体积。 |
| [Dead Code Elimination](https://rolldown.rs/in-depth/dead-code-elimination) | 说明 tree shaking 生效前提，解释“写了却没删掉”的原因。 | 带着 sideEffects 与 ESM 导出写法两个问题读，检查自己项目 package.json 与导出方式。 |
| [RFC 6455 WebSocket](https://www.rfc-editor.org/rfc/rfc6455) | WebSocket 握手与帧格式的权威规范，HMR 通信层的底层依据。 | 只读握手与帧格式两节，再用浏览器 Network 面板观察 101 Upgrade 与后续帧。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Writing WebSocket client applications](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications) | 含可运行的客户端示例，便于复现 HMR 所依赖的长连接通信。 | 照示例写客户端连本地 WebSocket 服务，观察 message 事件中推送数据的结构。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [webpack 入门指南](https://webpack.js.org/guides/getting-started/) | 从零手配项目，能直接看到 loader、plugin 与产物的因果关系。 | 边配边对比 dist 产物变化；配完后再回头重看 splitChunks 与 HMR 配置项。 |
| [webpack 模块联邦](https://webpack.js.org/concepts/module-federation/) | 远程模块共享实战，理解运行时按需加载的另一种形态。 | 搭两个应用共享一个组件，观察远程 chunk 何时被请求、如何按版本回退。 |
| [Rspack 文档](https://rspack.rs/) | 以迁移视角对照 webpack 优化项，附构建耗时差异参考。 | 把本页示例迁到 Rspack，逐条记录 splitChunks 与 HMR 的配置兼容差异。 |
| [阮一峰：WebSocket 教程](https://www.ruanyifeng.com/blog/2017/05/websocket.html) | 中文入门讲解清楚，快速建立握手与服务器推送的直觉。 | 跟示例写一个回显服务，再改造成向所有客户端广播，模拟 dev-server 的更新推送。 |
| [现代 JavaScript 教程：WebSocket](https://zh.javascript.info/websocket) | 覆盖握手、心跳与聊天室实现，连接层细节较完整。 | 完成聊天室任务后补上断线重连与心跳，思考 dev-server 如何维持长连接。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行订单表格 | code splitting、chunk 与 bundle 的区别 | 路由级动态 import + SplitChunksPlugin | 导出用的表格库不要进首屏；chunk 请求失败要有兜底提示 |
| 低端安卓机上的 C 端首屏 | chunk 组成分析、entry 拆分 | webpack 多入口 + webpack-bundle-analyzer | 关注入口 chunk 的解析耗时，不只看下载体积 |
| 多人协作白板的本地开发 | HMR 原理（dev-server + WebSocket + Runtime） | webpack-dev-server 的 hot 选项 | 业务长连接与 HMR 的 WebSocket 分开配置 |
| 运营后台的表单页 | 组件级懒加载 | React.lazy 或 import() 包住重组件 | 首屏就要用的校验库不要拆出去 |
| 四条业务线共用的后台 | 缓存组与长期缓存 | splitChunks 的 cacheGroups + contenthash | 依赖升级期间 hash 会变，缓存收益下降 |
| 微前端子应用 | chunk 运行时与公共依赖提取 | Module Federation 或独立构建加运行时加载 | 共享依赖的版本约束要写进契约 |
| 报表页的图表与导出 | 重依赖动态导入 | 点击时 import 图表或导出模块 | 提前预取会抵消收益，按点击概率决定 |
| 老项目从 webpack 4 升级 | 优化项、HMR 配置迁移 | webpack 5 + 持久化缓存 | 升级后重跑一次体积基线 |

### 三个场景拆解

#### 场景 1：万行订单表格的首屏

**业务背景**：运营后台的订单列表页一次性展示上万行数据，构建产物只有一个 bundle，首屏要先下载解析全部代码才出现表格。规模可以用静态 import 数量来量：打开构建产物的 stats.json，数出入口 chunk 里包含的模块个数。

**怎么用本页知识解决**：思路是先按路由切，再把只有点击时才用到的重依赖切出去，让首屏只下载登录页与布局。

```js
// router/index.js：路由级懒加载，首屏只下载登录页与布局
const OrderList = () => import(/* webpackChunkName: "order-list" */ '../views/OrderList.vue');

// views/OrderList.vue：导出按钮只留一个入口函数
function onExportClick(rows) {
  import(/* webpackChunkName: "export-excel" */ '../utils/export-excel')
    .then(({ exportOrders }) => exportOrders(rows)) // 点击后才请求导出 chunk
    .catch(() => showFallbackTip('导出模块加载失败，请重试')); // 弱网下要有兜底
}
```

- 第一行的 import 写在路由表里，webpack 为它单独产出一个 chunk，入口 chunk 不再包含该页面代码。
- 导出模块只在函数被调用时才发请求，表格库与导出库都不计入首屏。
- catch 分支处理 chunk 请求失败，触发时机包括弱网、部署切换期间旧文件被删除。
- 路由级懒加载要配 Suspense 或 loading 状态，否则切换路由时界面停在上一页。

**怎么度量收益**：用 webpack-bundle-analyzer 看各 chunk 的组成与体积；用 Lighthouse 看 FCP 与 TTI；用 DevTools 的 Network 面板统计首屏请求的 JS 数量与 gzip 后体积。每项在同一台机器、同一网络下重复 3 次。

**什么时候不该用**：

- 单页应用只有一个页面，第三方依赖总量在 gzip 后低于团队设定的阈值，拆分只增加一次网络往返。
- 服务端只有 HTTP/1.1 且页面已经接近并发连接上限，新增 chunk 会排队等待。

#### 场景 2：白板开发期的 HMR 接入

**业务背景**：多人协作白板的画布状态、WebSocket 连接和撤销栈都放在模块作用域里，任何改动都会触发整页刷新，状态和连接一起丢。规模用改动一次的恢复时间量：从保存代码到重新手动连上协作房间的秒数。

**怎么用本页知识解决**：思路是让 dev-server 通过 WebSocket 推送更新，再由 HMR Runtime 在浏览器端替换模块，保留住连接与画布实例。

```js
// webpack.config.js
module.exports = {
  devServer: {
    hot: true, // dev-server 用 WebSocket 把编译结果推给浏览器
    client: { overlay: true }, // 编译失败时在页面上覆盖报错
  },
};

// 白板状态模块：接收自身更新，保留画布实例与连接
if (import.meta.webpackHot) { // webpack 5 的写法，webpack 4 用 module.hot
  import.meta.webpackHot.accept('./canvas-state', () => {
    redraw(); // 模块被替换后重绘，不触发整页刷新
  });
}
```

- hot 打开后，dev-server 在编译完成时通过 WebSocket 发更新消息，浏览器端由 HMR Runtime 接收。
- accept 声明本模块可以接受自身或指定依赖的替换，未声明 accept 的模块会退回整页刷新。
- 白板把连接与画布实例放在不被替换的模块里，只替换渲染逻辑，状态就能留下来。
- import.meta.webpackHot 在非 HMR 环境下是 undefined，因此判断要写在条件里。

**怎么度量收益**：在 dev-server 终端看到编译完成的时刻，与页面上元素变化的时刻做对比，重复 5 次；用 DevTools 的 Network 面板筛选 WS，看整页刷新次数与连接数；看控制台里 [HMR] 前缀日志是否出现 Nothing hot updated。

**什么时候不该用**：

- 生产环境。HMR Runtime 与 dev-server 只服务于开发，生产要用构建产物。
- 一次改动就会影响全局状态的页面，整页刷新本来就是预期行为，写 accept 只是多一个维护点。
- 纯静态落地页，没有需要保留的运行期状态，整页刷新与热更新的差别测不出来。

#### 场景 3：多后台共用依赖的长期缓存

**业务背景**：同一套 UI 组件与工具库被 4 个后台应用引用，每次只改业务代码，用户也要重新下载第三方依赖。规模用两次构建对比量：只改一行业务代码后重新构建，数出产物目录里文件名变化的文件个数。

**怎么用本页知识解决**：思路是把第三方依赖按规则抽成独立 chunk，并让文件名由内容决定，内容不变就不换名。

```js
// webpack.config.js
module.exports = {
  output: { filename: '[name].[contenthash].js' }, // 内容不变，文件名就不变
  optimization: {
    runtimeChunk: 'single', // runtime 单独抽出，避免它带着业务 chunk 的 hash 一起变
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/, // 只匹配第三方依赖
          name: 'vendor',
          chunks: 'all', // 同步与异步 chunk 都参与抽取
        },
      },
    },
  },
};
```

- contenthash 由 chunk 内容算出，内容不变时文件名不变，浏览器可以直接命中本地缓存。
- runtimeChunk 把 webpack 运行时代码单独成文件，业务 chunk 变化时它不再带着 vendor 换名。
- chunks 设为 all 让异步 chunk 也参与抽取，否则同一个库会被打进多个异步 chunk。
- 缓存组只决定模块落到哪个 chunk，压缩与传输不在它的职责内，体积仍要看 analyzer。

**怎么度量收益**：连续构建两次，第二次只改一行业务代码，对比产物目录里文件名变化的文件个数；用 DevTools 的 Network 面板看第二次访问时 JS 的 Size 列是否显示 from disk cache；看 webpack 的 performance 输出或 stats.json 里各 chunk 的体积。

**什么时候不该用**：

- 只有单个页面，且先用 analyzer 量出依赖总体积低于团队阈值，拆 vendor 只会增加请求数。
- 依赖每天都在升级的开发期，每次升级都改 hash，等到依赖版本稳定后再拆。

### 行业先进实践

**路由级代码分割（出处：React 官方文档 Code-Splitting 页面）**
React 文档给出 React.lazy 与 Suspense 的用法，把路由组件的静态 import 换成动态 import 后，打包器会为每个路由产出独立 chunk。首屏只下载当前路由需要的代码，未访问的路由代码推迟到切换时加载。借鉴方式：先数出路由表里的静态 import 个数，逐个改成动态 import，并加上 webpackChunkName 注释。

**SplitChunksPlugin 的默认行为（出处：webpack 官方文档 SplitChunksPlugin 页面）**
官方文档说明该插件默认只对异步 chunk 做拆分，同步引入的公共依赖需要显式配置 chunks 才会抽取。理解默认值能避免把默认行为当成 bug 去覆盖。借鉴方式：先跑一次构建看默认产物，再决定是否把 chunks 改成 all。

**Module Federation（出处：webpack 官方文档 Module Federation 页面）**
它让多个独立构建在运行时互相提供与消费模块，宿主不必把远程应用的代码打进自己的包。微前端场景下，基础依赖可以由一方提供，其余应用运行时引用。借鉴方式：把共享依赖的名称与版本范围写进构建配置和团队契约，避免运行时解析到两份实例。

**Vite 的依赖预构建（出处：Vite 官方文档依赖预构建章节）**
Vite 在开发阶段用 esbuild 把 CommonJS 与 ESM 依赖预打包，减少浏览器发出的模块请求数。这说明开发期的 chunk 行为与生产构建并不相同，不能把 dev 的网络面板当作生产结论。借鉴方式：如果项目用 Vite，首屏体积结论一律取自 build 产物，而不是 dev server。

**框架 loader 已注入的 HMR accept（出处：需核对官方文档：webpack 官方 Hot Module Replacement 页面中 module.hot.accept 与 import.meta.webpackHot 的版本差异，以及你所用框架 loader 的 HMR 说明）**
组件级热替换通常由框架配套的 loader 完成，手写 accept 只在自定义模块上才有必要。核对清楚这层分工，可以少写一批无效的 accept 声明。借鉴方式：先在控制台看 [HMR] 日志定位到底哪个模块没被接受，再决定是否补 accept。

### 从学到用：落地路线

**第 1 步 试点**：选一个路由数多、首屏 JS 传输量在团队里排前列的应用，只改这一个。
验收标准：能拿出这次改动前后的完整构建产物目录。

**第 2 步 验证**：在同一台机器、同一网络条件下跑 webpack-bundle-analyzer 与 Lighthouse 的前后对比。
验收标准：形成一张表，记录入口 chunk 的 gzip 体积、首屏请求数、FCP，每项重复 3 次。

**第 3 步 推广**：把路由级懒加载与重依赖动态导入写进代码评审清单，新页面默认执行。
验收标准：新增页面的评审记录里能勾出这两条，且构建后没有单个 chunk 超过步骤 2 的基线。

**第 4 步 防止回退**：把体积检查接到 CI，用 webpack 的 performance 配置或 size-limit 这类工具做阈值判断。
验收标准：提交一次静态引入重库的改动，CI 能拦住并打印出超阈值的 chunk 名。

### 动手作业

**目标**：把一个含 3 个路由页面的应用改成按需加载，并用脚本守住后续体积。

**步骤**

1. 建一个含 3 个路由页面的应用，其中至少一个页面静态引入体积排第一的第三方库，构建后保存产物清单。
2. 用 webpack-bundle-analyzer 生成 treemap，记录每个 chunk 的名字与体积，找出体积排第一的第三方库。
3. 把 3 个页面改成动态 import，加上 webpackChunkName 注释，重新构建并与第 1 步的清单对比。
4. 把第 2 步找到的库改成点击时才 import，为请求失败写兜底提示，用 DevTools 的 Network 面板确认点击前没有该 chunk 的请求。
5. 给 output.filename 加 contenthash，只改一行业务代码重新构建，记录哪些文件名发生变化。
6. 写一条体积检查命令，接到本地脚本或 CI，构造一次超阈值的提交验证它会被拦下。

**验收标准**

- 首屏 Network 面板里的 JS 请求数与 gzip 体积有前后对比记录。
- 点击重依赖功能之前，Network 面板中不出现该依赖所在 chunk。
- 只改业务代码的一次构建里，vendor chunk 的文件名保持不变。
- 体积检查在超过阈值时返回非 0 退出码。
- 断网后点击重依赖功能，页面显示兜底提示，而不是停在加载中。

