---
title: 编译链路
description: AST、Babel、source map 与 tree shaking
---

# 编译链路

> 本页按「概念、原理、代码」逐题展开相关面试专题。

## 1. AST 原理（parser → traverser → transformer → generator）

| 阶段 | 输入 | 输出 | 说明 |
|------|------|------|------|
| 1. Parser（解析） | 源代码 | Token 流 | 词法分析：source code → Token 流 |
| 2. Parser（解析） | Token 流 | AST | 语法分析：Token 流 → AST |
| 3. Traversal（遍历） | AST | 访问节点 | 访问每个节点（enter/exit） |
| 4. Transformer（转换） | AST | 修改后 AST | 遍历过程中修改/替换 AST 节点 |
| 5. Generator（生成） | 新 AST | 目标代码 | 新 AST → 目标代码（toCode） |

**visitor 示例：**
```javascript
visitor = {
  CallExpression: { enter(node) {}, exit(node) {} }
}
```

**示例：** 把 `require('fs')` 替换为 ESM import

```javascript
// 第 1 段：引入解析与遍历所需的两个第三方模块
// acorn 只负责"把源码文本变成 AST"，本身不提供遍历能力；ast-traverse 只负责"在已有 AST 上做深度优先走访"，
// 两者职责单一、可自由组合，这也是前端工具链里常见的 parser / visitor 分层设计。
const acorn = require('acorn')
const { traverse } = require('ast-traverse')

// 第 2 段：准备待分析源码，并把它解析（parse）成抽象语法树
// 解析是整个流程中唯一的"文本 → 结构化数据"转换点：之后所有判断都基于节点类型，而不是字符串匹配，
// 因此不会因为空格、换行或加分号而失效。
const code = 'const add = (a, b) => a + b'
// ecmaVersion 必须显式声明：acorn 默认按 ES5 解析，遇到箭头函数会直接抛 SyntaxError；
// 2020 是"能覆盖当前代码所需语法的最小现代版本"，写法上也可用 6（ES2015）表示同样的支持范围。
// 注意 parse 返回的根节点是 Program，其 body 才是顶层语句数组。
const ast = acorn.parse(code, { ecmaVersion: 2020 })

// 第 3 段：深度优先遍历 AST，按节点类型做模式识别
// traverse 采用访问者（visitor）模式：enter 在进入节点时触发（先序），leave 在离开节点时触发（后序）。
// 若 enter 显式返回 false，该节点的子节点将被跳过——这是做"只关心某类节点、剪枝提速"的常见手法。
traverse(ast, {
  enter(node) {
    // 判据用 node.type 而非构造器/instanceof：AST 是纯 JSON 结构，type 字符串才是跨版本稳定的标识。
    // 边界情况：这段代码里箭头函数体是表达式 a + b，所以它没有 BlockStatement 体、也没有显式 return，
    // 节点上会带 expression: true；若换成 { return a + b }，则 body 变成 BlockStatement，遍历到的节点集合也会不同。
    // 复杂度：遍历本身 O(n)，n 为节点总数；这里只命中 1 次（顶层那一个箭头函数），属于典型的单次线性扫描。
    if (node.type === 'ArrowFunctionExpression') {
      console.log('发现箭头函数')
    }
  }
})
```
## 2. Babel 编译流程

| 阶段 | 说明 |
|------|------|
| 输入 | 源代码 |
| @babel/parser（Babylon） | 解析代码 |
| 输出 | AST（符合 ESTree 规范） |
| @babel/traverse | 遍历 AST（使用 visitor 模式） |
| 操作 | 收集依赖、调用 plugin/preset 进行节点转换 |
| @babel/template | 从字符串模板生成 AST 节点 |
| @babel/generator | 新 AST → 目标代码 + sourcemap |

**preset vs plugin：**

- preset = plugin 集合（@babel/preset-env = 所有 ES6+ 语法转换插件）
- plugin 优先级高于 preset，plugin 按顺序执行

```javascript
const babel = require('@babel/core')

const result = babel.transformSync(code, {
  filename: 'input.js',
  presets: ['@babel/preset-env'],
  plugins: [function() {
    return {
      visitor: {
        VariableDeclaration(path) {
          path.node.kind = 'let' // const → let
        }
      }
    }
  }]
})
```

## 3. source map 原理

```
bundle.js 末尾注释：
  //# sourceMappingURL=index.js.map

index.js.map 文件（JSON）：
{
  "version": 3,
  "sources": ["index.js"],
  "names": ["a", "b", "add"],
  "mappings": "AAAA,SAASC",  // VLQ编码的位置映射

  "sourcesContent": ["const a = 1\nconst b = 2\n..."]
}

// 浏览器 DevTools：source map → 断点停在源码
// VLQ（Variable Length Quantity）：用 base64 编码节省体积
```

**webpack 配置**：
```javascript
module.exports = {
  devtool: process.env.NODE_ENV === 'production'
    ? 'source-map'        // 最完整，单独文件
    : 'eval-cheap-module-source-map'  // 开发：快速，包含行号
}
```

## 4. tree shaking 原理（ESM静态分析 + usedExports + sideEffects）

```
tree shaking = 消除未使用的导出（Dead Code Elimination）

前提条件：
  1. ESM 静态分析（import/export 在模块顶层，编译时确定依赖）
  2. bundler 收集每个模块的 export 使用情况
  3. 递归追踪：从 entry 出发，标记用到的导出，删除未标记的

ESM vs CommonJS：
  ESM:   import { a } from './lib' → 静态分析可行
  CJS:   const lib = require('./lib') → 运行时才能确定
```

```
Tree Shaking 流程（webpack）：

编译阶段：
  1. 分析 import/export（静态，不执行代码）
  2. 确定模块依赖图

标记阶段（usedExports）：
  3. 从 entry 开始，递归标记被使用的导出
  4. 未标记的导出标记为 unused export

删除阶段（sideEffects）：
  5. 遍历标记后的 AST，删除未使用的声明
```

```javascript
// package.json
{
  "sideEffects": [
    "*.css",         // CSS 不 tree shake
    "./src/polyfill.js" // 有副作用的文件
  ]
  // 或设为 false：所有文件都视为无副作用
}

// webpack 配置
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: true,
  }
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [ESTree 规范](https://github.com/estree/estree) | JS AST 节点的权威定义，写规则时的字典。 | 配合 AST Explorer 对照读，重点看 Program、Identifier、CallExpression，读完整理一张节点速查表。 |
| [Babel 文档](https://babeljs.io/docs/) | 官方说明转译与 polyfill 机制，是编译链路的基准。 | 读 Plugins 与 preset 章节，带着“代码在哪一步被改写”读，读完画一张 Babel 流程图。 |
| [Babel preset-env](https://babeljs.io/docs/babel-preset-env) | 用 targets 观察同一代码的输出差异，理解 transformer 阶段。 | 配不同 browserslist 对比输出，记录哪些语法被降级、哪些交给 polyfill。 |
| [Rollup 文档](https://cn.rollupjs.org/) | Tree shaking 与 ESM 打包的官方说明，原理首选材料。 | 读 Tree-shaking 与 ES modules 章节，问：静态分析在什么情况下会失效。 |
| [Node.js 包规范](https://nodejs.org/api/packages.html) | exports 条件导出规则，理解 ESM/CJS 边界对静态分析的约束。 | 读 exports 与条件导出一节，动手写一个同时支持 import 与 require 的包。 |
| [Node.js ES 模块](https://nodejs.org/api/esm.html) | ESM 与 CJS 互操作细节，解释打包时静态分析的限制。 | 读互操作一节，带着 ERR_REQUIRE_ESM 的疑问读，记录三种加载方式差异。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [AST Explorer](https://astexplorer.net/) | 可视化对比不同 parser 产出的 AST，最直观的观察工具。 | 输入同一段含 JSX 的代码，切换 parser 对比节点差异，记录三处不同。 |
| [Source Map 可视化](https://evanw.github.io/source-map-visualization/) | 把 source map 映射关系画出来，比读规范更快建立直觉。 | 上传自己构建的产物与 map，定位到源码行列，反推 mappings 字段含义。 |
| [Babel REPL](https://babeljs.io/repl) | 在线切换预设立刻看输出，验证 generator 阶段结果。 | 开关 preset 对比同一段代码输出，观察辅助函数与语法降级的差异。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Babel Handbook](https://github.com/jamiebuilds/babel-handbook) | 插件手册讲透访问者模式，是 traverser 阶段最佳教程。 | 通读 Plugin Handbook，问访问者如何遍历 AST，随后写删除 console.log 的插件。 |
| [Babel 插件手册（中文）](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md) | 中文插件手册，降低理解 visitor 与节点操作的门槛。 | 对照英文版读 Path 与 visitor 章节，动手完成删除 console.log 的插件。 |
| [Rollup 简介（中文）](https://cn.rollupjs.org/introduction/) | 中文入门，用多格式打包把 tree shaking 落到实践。 | 做一个 esm 与 cjs 双输出的库，对比有无 sideEffects 的产物体积。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格首屏渲染 | tree shaking、Babel 编译流程 | webpack 5 production、webpack-bundle-analyzer | 表格行组件若写进同一入口，静态分析切不开依赖 |
| 低端安卓机的首屏加载 | tree shaking、source map | webpack、Lighthouse 真机模拟 | sideEffects 写错会删掉样式导入，构建后要真机回归 |
| 多人协作白板的选区同步 | AST 原理的 parser 与 traverser | 自研 Babel 插件、ESLint 自定义规则 | 插件只改语义明确的节点，别在遍历中改节点结构 |
| 线上 JS 报错堆栈定位 | source map | hidden-source-map、sentry-cli 上传 | map 文件不能进 CDN 公共目录，否则源码对外可见 |
| 组件库按需引入 | tree shaking、Babel 编译流程 | babel-plugin-import、ESM 产物 | 改写 import 后要核对样式文件是否一起被引入 |
| 小程序与 Web 共用业务代码 | Babel 编译流程的 transformer | 自研 Babel 插件、两端各一份配置 | 端差异落在编译期处理，别在运行期堆 if 判断 |
| 团队自研代码规范 | AST 原理的 parser 与 traverser | ESLint 自定义规则、@typescript-eslint/parser | 报错要带行列号，否则开发者无法定位违规代码 |
| 灰度开关的编译期裁剪 | AST 原理、tree shaking | Babel 插件、DefinePlugin | 常量折叠后仍可能留下死分支，要复查产物内容 |

### 三个场景拆解

#### 场景 1：低端安卓机上的后台首屏

**业务背景**：后台首页同时要图表、富文本编辑器、权限指令三套模块，低端安卓机上首次可交互的等待时间排在团队第一。用 Chrome DevTools Performance 面板录一次冷启动，数 Main 线程超过 50ms 的长任务有几段，就能量化这个问题。

**怎么用本页知识解决**：先让打包器看清模块之间的依赖图，再用静态分析删掉本次入口走不到的导出。

```js
// src/entry.js
// 依赖包的 package.json 里写 "sideEffects": ["*.css"]，标出真正带副作用的文件
import { Button } from 'ui-kit';                // 具名导入，未用到的导出可被静态分析删掉
// import UIKit from 'ui-kit';                  // 整包导入会把全部导出拉进依赖图
const box = document.querySelector('#toolbar'); // 首屏只挂载工具栏区域
box.appendChild(Button({ text: '查询' }));      // 未引用的编辑器与图表不进入产物
```

- parser 阶段把 import 与 export 读成 AST，这种静态结构让 usedExports 能标出没人引用的导出。
- Babel 只做语法转换，删除动作交给打包器的 usedExports 与 sideEffects 两个开关完成。
- sideEffects 白名单里的文件不作删除，样式导入与全局注册代码必须写进去。
- 构建完成后跑 webpack-bundle-analyzer，确认编辑器与图表的 chunk 不在首屏入口中。

**怎么度量收益**：用 webpack-bundle-analyzer 看入口 chunk 的 parsed size 与 gzip size；用 Lighthouse 在固定机型模拟下看 First Contentful Paint 与 Total Blocking Time；用 DevTools Performance 数长任务段数。

**什么时候不该用**：

- 依赖内部用 require 动态拼路径加载模块，静态分析给不出确定结论，删不掉也不该硬删。
- 模块在导入时就改写全局对象，强行删除会破坏运行结果，写进 sideEffects 白名单是正确选择。
- 首屏脚本本来只有几千字节，改动带来的回归风险高于体积收益。

#### 场景 2：线上报错堆栈还原

**业务背景**：生产构建把变量名压成短名，用户上报的堆栈只剩压缩文件的行号列号，前端值班只能靠猜。在测试环境用同一份产物手动抛一次错，就能复现这个现象并核对整条工具链。

**怎么用本页知识解决**：构建时单独产出 map 文件，但不把地址写进产物；上报时用 SourceMapConsumer 把压缩坐标映回源码坐标。

```js
// build/webpack.prod.js：只产出 map 文件，不向产物写入地址
module.exports = { devtool: 'hidden-source-map' }; // 产物末尾不带 sourceMappingURL

// tools/resolve.js：还原压缩坐标，source-map 0.7 起构造返回 Promise
const { SourceMapConsumer } = require('source-map');
async function resolve(rawMap, line, column) {
  const consumer = await new SourceMapConsumer(rawMap);
  const pos = consumer.originalPositionFor({ line, column }); // 压缩坐标换成源码坐标
  console.log(pos.source, pos.line, pos.column, pos.name);
  consumer.destroy(); // 释放 WASM 实例，常驻服务不释放会随请求数涨内存
}
```

- 产物与 map 分开发布，map 只传给错误监控平台，CDN 上访问不到这个文件。
- 上报时要带压缩文件名、行号、列号，缺列号会让映射落到整行开头，定位不准。
- source-map 0.7 起 SourceMapConsumer 构造返回 Promise，同步写法拿不到初始化完成的对象。
- 映射函数放进常驻服务时，每次调用结束都要 destroy，WASM 占用不会自动回收。

**怎么度量收益**：在错误监控平台看 issue 详情里是否出现源码文件名与行号；统计能定位到源码行列的报错占全部报错的比例；上传后核对 release 号与产物文件名哈希是否对得上。

**什么时候不该用**：

- 源码属于对外保密内容且没有私有存储时，放开 map 等于暴露业务逻辑。
- 只在本地调试阶段，devtool 用 eval 系列就够，不必为每次构建都产出 map 文件。

#### 场景 3：小程序与 Web 共用一套业务代码

**业务背景**：同一套订单查询页要在 Web 与小程序两端运行，请求层和埋点层实现不同，业务文件里堆满了端判断分支。用 grep 统计业务目录里端判断的行数，能看到页面数增长时改造成本的变化。

**怎么用本页知识解决**：业务代码只 import 统一模块名，由 Babel 插件在 ImportDeclaration 节点上把来源改成端上实现。

```js
// babel-plugin-platform-alias.js
module.exports = function ({ types: t }) {        // api.types 提供 AST 节点构造方法
  return {
    name: 'platform-alias',
    visitor: {
      ImportDeclaration(path, state) {             // 只处理 import 声明这类节点
        const from = path.node.source.value;       // 拿到原始模块名
        const to = (state.opts.map || {})[from];   // 形如 { '@/net': '@/net.mp' }
        if (to) path.node.source = t.stringLiteral(to); // 改写来源，不动其他字段
      },
    },
  };
};
```

- parser 把源码读成 AST，transformer 阶段插件按节点类型进入对应 visitor 函数。
- 只改 source 字段，节点的位置信息保留，报错时 source map 仍能映回原文件。
- 两端各用一份配置文件注册插件并传入不同 map，业务代码保持同一份。
- generator 阶段把改好的 AST 打印回代码，插件看不到这一步，也不该在这一步改内容。

**怎么度量收益**：用 grep 统计业务目录里端判断分支的行数；跑两端共用的 jest 用例看通过数；用 webpack-bundle-analyzer 比对两端产物里另一端模块是否残留。

**什么时候不该用**：

- 两端差异落在 UI 结构上，改模块名解决不了，硬塞插件会让模板分支难维护。
- 团队没有维护插件与配套测试的人力时，手工写两份请求层反而更稳。

### 行业先进实践

**声明 sideEffects 白名单（出处：webpack 官方文档 Tree Shaking 章节）**：文档说明这个字段用来告诉打包器哪些文件在导入时会改变外部状态。标错会把样式一起删掉，标全又会拦住删除。借鉴方式：先给样式与注册类文件写白名单，再逐个模块确认后放开。

**生产环境用 hidden-source-map 并上传错误监控（出处：webpack 官方文档 devtool 章节、Sentry 官方文档 Source Maps 说明）**：hidden-source-map 生成 map 文件但不写 sourceMappingURL，浏览器不会自动去取。Sentry 文档给出用 sentry-cli 上传并绑定 release 的流程。借鉴方式：把上传放进 CI 最后一步，产物与 map 分开发布。

**按需引入插件（出处：Ant Design 官方文档按需加载说明、babel-plugin-import 开源项目）**：插件在 ImportDeclaration 节点上把整包导入改写成引入具体文件，顺带引入对应样式。它解决的是库产物不利于静态分析时的过渡问题。借鉴方式：自研组件库优先产出 ESM 并按模块拆文件，把插件留给第三方库。

**自定义 ESLint 规则拦截写法（出处：ESLint 官方文档自定义规则章节）**：ESLint 把源码读成 AST 后按节点类型调用规则，团队可以把禁止整包导入写成规则在提交前拦截。借鉴方式：把与打包体积相关的约定变成 lint 错误，而不是写在文档里靠人记。

**替换编译器前先核对 tree shaking 支持范围（出处：需核对官方文档：Turbopack 与 Rolldown 各自对 sideEffects 字段的支持范围，以及 source map 各模式的支持情况）**：换编译器会影响删除效果与调试链路，这两项都要先核对再动手。核对方式：用同一份组件库与同一入口构建，比对产物文件清单与 map 文件是否按预期生成。

### 从学到用：落地路线

1. **试点**：挑一个后台页面接上 ESM 入口与 sideEffects 白名单，先把构建配置跑通。
   验收标准：该页面能构建成功，产物里未引用组件不再出现在入口 chunk 中。
2. **验证**：用 webpack-bundle-analyzer 与 Lighthouse 各跑一次，把改动前后的数字记进同一张表。
   验收标准：两张表的测量条件一致（同一机型模拟、同一构建命令），差值可复现。
3. **推广**：把配置抽成共享 preset，按目录逐个接入，先接读多写少的展示页再接交互页。
   验收标准：接入的页面清单与构建结果记录在仓库中，未接入页面不受影响。
4. **防止回退**：把整包导入、缺失 sideEffects 等情况写成 lint 规则与 CI 检查。
   验收标准：故意提交一版整包导入的代码，CI 能报错并阻断合并。

### 动手作业

**目标**：给一个只导出两个组件的小型 ESM 组件库接上 tree shaking 与 source map 两条链路，再用一个 Babel 插件改写导入来源。

**步骤**：

1. 建组件库，只导出 Button 与 Table，package.json 中写 exports 与 sideEffects 字段。
2. 建一个只使用 Button 的入口页面，用 webpack 5 生产模式构建，记录入口 chunk 的 parsed size。
3. 在 Table 模块顶部加一行写全局变量的代码，重新构建，比对两次产物的体积差。
4. 换成 devtool: 'hidden-source-map' 再构建一次，确认目录里有 .map 文件且产物末尾没有 sourceMappingURL。
5. 写一个 Node 脚本读取 .map 文件，把刻意抛错的压缩行列号换成源码位置。
6. 写一个 Babel 插件，把 import 来源 '@lib/net' 改成 '@lib/net.mock'，两端各构建一次。
7. 用 webpack-bundle-analyzer 与 Lighthouse 各跑一次，把两次数字整理进同一张表。

**验收标准**：

- 未引用 Table 时，入口 chunk 中不出现它的代码，两次 parsed size 的差值有记录。
- 产物文件末尾没有 sourceMappingURL 注释，发布目录里搜不到 .map 文件。
- Node 脚本输出的源码文件名、行号、列号与源文件里抛错的那一行一致。
- 插件生效后业务代码里搜不到 '@lib/net' 字面量，两端构建各自产出对应实现。
- 换一台机器按同样步骤操作，得到的体积数字与产物清单一致。

