---
title: 前端编译器、打包与开发工具手写题
description: 以源码位置和身份映射为主线练习解析、IR、增量图、chunk 分配、HMR、源码映射和构建缓存；每题给出可确定输出与失效边界，训练进阶前端工程师解释工具链中语法、依赖、模块状态、资源 owner 和诊断位置如何跨阶段保持一致。
tags: [coding, interview, compiler, tooling, build]
date: 2026-10-12
level: advanced
prerequisites:
  - 熟悉 JavaScript/TypeScript AST、模块依赖与构建流程
  - 熟悉 Node.js 文件系统、source map 和开发服务器概念
runnable: false
verified_at: 2026-10-12
source_commit: 84bf0f53f02065bdcc27cadb30d4c0e1569798d9
---

# 前端编译器、打包与开发工具手写题

工具链题的核心不是背某个插件 API，而是定义阶段之间传递的对象：源码、AST、IR、模块图、chunk 与 source map 都有身份、版本和错误位置。每题要求把输入样本推到可判定的输出，并说明增量更新与失败如何保持边界。

```mermaid
flowchart LR
  S[源码与配置] --> P[解析 AST]
  P --> I[规范化 IR]
  I --> G[模块图与 chunk]
  G --> O[输出与 source map]
  O --> H[HMR / 增量失效]
```

追踪同一模块从输入路径到输出 chunk 的身份，并记录每个阶段何时可复用、何时必须失效。

## 五层练题法与误区

| 层次 | 要回答的问题 | 产物 |
|---|---|---|
| 现象 | 改一行源码会改变哪些输出 | 输入差异与构建 trace |
| 规则 | 何种依赖或语法有效 | parser option、图边、诊断合同 |
| 机制 | AST、IR、缓存键如何承接身份 | 数据结构与版本链 |
| 实现 | 怎样实现一阶段并与其他阶段组合 | 函数签名和稳定输出 |
| 边界 | 循环依赖、插件副作用、映射精度如何处理 | 失效策略和定位误差预算 |

| 误区 | 修正 |
|---|---|
| 把正则扫描 import 当成完整解析器 | 词法上下文、注释、模板串与语法版本都影响识别 |
| 只按文件 mtime 做缓存 | 配置、插件、依赖内容和解析选项同样影响产物 |
| HMR 更新模块但不处理副作用 | 需定义 accept 边界、dispose 数据和完整刷新回退 |

## 面试口述

**30 秒：**我会先明确每个阶段的数据合同和稳定身份，再讨论增量失效。源码变化通过依赖图传播到受影响模块，缓存键覆盖所有语义输入；错误与 source map 按生成位置和原始位置保持映射。

**2 分钟：**实现一个编译流程时，我先锁定 parser 语法选项并保留节点位置，再转换为不依赖具体 parser 的规范 IR。模块解析输出带 canonical ID、依赖边和副作用标记的图；chunk 分配只基于确定的入口、共享模块规则和异步边界。缓存以源内容、配置、插件版本和依赖结果构成 key，构建 trace 能解释命中或失效。HMR 先从变更模块沿 importer 图向上找 accept 边界，执行 dispose 数据清理并更新模块，再在边界不可接受时刷新页面。测试报告 bundle membership、依赖闭包、映射点和重复构建缓存命中数，不以“构建成功”单一结论代替正确性。

## 自测

??? question "为什么用正则提取 import 会错？"
    import 文字可能在注释、字符串、模板字面量或动态 import 表达式中；解析器理解语法上下文并提供节点类型与位置。

??? question "模块内容相同就一定能复用编译缓存吗？"
    不一定。解析选项、插件、目标环境、依赖输出和配置也会改变结果，缓存键必须纳入实际语义输入。

??? question "HMR 找不到 accept 边界时该怎么办？"
    按协议执行完整页面刷新或显式报告不可接受更新，不能静默保留新旧模块混合状态。

## 实际验收边界

这些题目没有随文实现或运行结果。实施者应固定 parser/bundler 版本、插件排序、文件系统大小写和路径分隔符；source map 应按抽样映射位置验证，HMR 应在浏览器开发服务器中验证生命周期，不可用静态伪图宣称热更新通过。

## 练习题

### H127. TypeScript AST 中的安全导入改写

- **题目契约：**实现 `rewriteImports(sourceFile, resolve): { text; diagnostics }`，输入 TypeScript AST，输出静态 import/export specifier 改写与诊断。
- **约束与不变量：**只改写字符串字面量模块名；保留 type-only、属性和原位置；相对路径解析失败时不猜测新路径。
- **用例 A：**`import type { T } from './types'` 的 resolver 返回 `./types.js`，输出只改 specifier，type-only 标记保留。
- **用例 B：**注释字符串 `'import x from "fake"'` 不改变；resolver 对真实模块返回 null 时输出原文本并报告源码位置。
- **实现提示：**用 TypeScript Compiler API 创建 SourceFile 和 AST visitor，记录修改节点并通过 printer 输出；诊断用 node.getStart/getEnd 关联原始文件。
- **进阶追问：**printer 重排空格/注释时怎样保证 source map 与格式稳定？是否应只做 text range edit？
- **难度 / 建议时长：**难，45 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；节点访问与 printer 参考 [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)（[S08](handwritten-practice-sources.md#s08)）。

### H128. Babel parser 插件配置的语法合同

- **题目契约：**实现 `parseProject(source, fileKind, syntaxConfig): ParseResult`，输出 AST 或包含行列、插件缺失提示的诊断。
- **约束与不变量：**JS/TS/JSX/TSX 文件类型决定 parser options；插件配置冲突需报确定错误；不得静默降级成不同语法树。
- **用例 A：**TSX 中 `const node = <Card />` 在 typescript+jsx 配置下得到 JSXElement 节点。
- **用例 B：**启用互斥语法插件时返回 `CONFIG_CONFLICT`，诊断包含冲突配置名和文件位置。
- **实现提示：**在调用 Babel parser 前规范化配置并验证组合；AST 输出带 sourceType、plugins 与文件名元信息供后续阶段追踪。
- **进阶追问：**不同 parser 版本接受同一扩展语法时，怎样让缓存 key 与构建结果可复现？
- **难度 / 建议时长：**中，35 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；语法插件配置参照 [Babel parser 文档](https://babeljs.io/docs/babel-parser)（[S09](handwritten-practice-sources.md#s09)）。

### H129. JavaScript 子集的 Pratt 表达式解析器

- **题目契约：**实现 `parseExpression(tokens): Expr`，支持数字、标识符、括号、前缀 `!/-`、乘除与加减，输出带源范围的 AST。
- **约束与不变量：**优先级与左结合规则确定；缺失右括号、连续运算符和尾随 token 返回行列诊断，不无限循环。
- **用例 A：**`a + b * 2` 输出 Add(a, Multiply(b,2))，源范围覆盖整个表达式。
- **用例 B：**`a * )` 报 UnexpectedToken `)` 的精确偏移，parser 消费游标停止且不生成伪 AST。
- **实现提示：**lexer 先产 token 与 offset，Pratt parser 使用 binding power；每个 parse 分支必须消费 token 或抛结构化诊断。
- **进阶追问：**加入可选链、空值合并和右结合赋值时，如何避免优先级表互相矛盾？
- **难度 / 建议时长：**挑战，55 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；ECMAScript 语法边界参考 [ECMAScript 规范](https://tc39.es/ecma262/)（[S11](handwritten-practice-sources.md#s11)）。

### H130. 作用域分析与 shadowed binding 解析

- **题目契约：**实现 `analyzeBindings(ast): { references; diagnostics }`，输入支持 block/function 声明的 AST，输出每个引用指向的 binding ID。
- **约束与不变量：**词法作用域嵌套明确；同名内层绑定遮蔽外层；TDZ/重复声明按声明种类报告。
- **用例 A：**外层 `let x`、内层 block 再声明 x，两个 return 引用分别指向不同 binding ID。
- **用例 B：**同一 block 两次 `let x` 输出 `DUPLICATE_LEXICAL_BINDING`，不静默采用后者。
- **实现提示：**遍历 AST 时维护 scope stack 与 name→binding 栈；先建声明再解析引用的 hoisting 规则需按语法区分。
- **进阶追问：**默认参数表达式、class 私有名和闭包引用需要增加哪些作用域种类？
- **难度 / 建议时长：**挑战，55 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；词法绑定规则见 [ECMAScript](https://tc39.es/ecma262/)（[S11](handwritten-practice-sources.md#s11)）。

### H131. 从 parser AST 到稳定规范 IR

- **题目契约：**实现 `normalizeModule(ast, parserKind): ModuleIR`，接受两种 parser 产出的导入、导出、调用节点，输出一致规范 IR。
- **约束与不变量：**IR 不保留 parser 专有对象引用；动态 import 与静态 import 类型分开；源码范围及注释关联信息可追踪。
- **用例 A：**TS Compiler AST 与 Babel AST 表示同一 `import './polyfill'`，规范化后序列化 IR 字节相同。
- **用例 B：**动态 `import(expr)` 不可静态解析时输出 DynamicImport(expression) 而非伪造固定依赖。
- **实现提示：**定义 discriminated union 和稳定字段顺序；adapter 层只读取公开 AST 字段，给每节点分配 source range 与模块 ID。
- **进阶追问：**如何在 parser 升级后判断 IR 语义变化而不是文本打印变化？设计 schema version 与 golden fixture。
- **难度 / 建议时长：**挑战，55 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；AST API 参照 [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)（[S08](handwritten-practice-sources.md#s08)）。

### H132. 按副作用标记执行安全 tree shaking

- **题目契约：**实现 `markLive(graph, entrypoints, sideEffects): Set<ModuleId>`，输入模块导出和副作用信息，输出保留模块集合。
- **约束与不变量：**被引用导出保留；未知副作用默认保守保留；带副作用的无导出模块仍保留；循环依赖算法终止。
- **用例 A：**入口只使用 util 的 `sum`，同文件未使用 pure 函数可移除，独立 side-effect import 保留。
- **用例 B：**某模块 sideEffects metadata 缺失且顶层调用未知函数，模块保留并记录保守原因。
- **实现提示：**先从入口传播导出符号引用，再传播模块副作用边；记录每个 live 原因供诊断，避免仅按文件是否被 import 判断。
- **进阶追问：**getter、顶层 await、动态 import 和 CommonJS require 对可移除性的限制有哪些？
- **难度 / 建议时长：**挑战，60 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；模块语义需对照 [ECMAScript modules](https://tc39.es/ecma262/)（[S11](handwritten-practice-sources.md#s11)）。

### H133. 循环依赖的初始化顺序诊断

- **题目契约：**实现 `analyzeCycles(graph): CycleReport[]`，输入带静态依赖边的模块图，输出 SCC、稳定初始化次序建议和风险节点。
- **约束与不变量：**图节点顺序不影响 SCC 内容；循环边保留；读取未初始化 binding 的风险不可被报告为普通无环排序。
- **用例 A：**边为 A→B、B→C、C→A、C→D，输出 SCC `[A,B,C]` 且 D 是其后继分量；拓扑计划先处理该 SCC，再处理 D。
- **用例 B：**图输入顺序随机排列 10 次，规范排序后的 SCC 报告完全相同。
- **实现提示：**用 Tarjan 或 Kosaraju 算法求强连通分量，再构造 condensation DAG；模块路径 canonicalize 后作为稳定 tie-break。
- **进阶追问：**ESM live binding 与 CommonJS 部分导出在同一循环中的观察结果有何不同？
- **难度 / 建议时长：**难，45 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；模块初始化规则参照 [ECMAScript](https://tc39.es/ecma262/)（[S11](handwritten-practice-sources.md#s11)）。

### H134. 异步模块图的 chunk 边界规划

- **题目契约：**实现 `planChunks(graph, entries, splitRules): ChunkPlan`，输入静态/动态边及共享规则，输出 chunk ID、模块归属和加载边。
- **约束与不变量：**每个模块恰好归属一个 chunk；共享模块按 splitRules 提取到共享 chunk，不复制进多个 chunk；动态边建立异步 chunk；所有入口依赖闭包可达且无未定义模块。
- **用例 A：**入口 A/B 共用 shared，动态导入 lazy，输出 initial chunk 含 shared、lazy chunk 不进入首屏闭包。
- **用例 B：**两个动态入口的共享模块按规则提取一次；循环动态边输出有限 chunk 图。
- **实现提示：**先求入口静态闭包与动态入口闭包，再按共享模块规则切分；稳定 chunk ID 基于 canonical module 集合摘要。
- **进阶追问：**重复模块、请求数限制、缓存长期命中和首次加载体积之间如何给出可测的权衡目标？
- **难度 / 建议时长：**挑战，60 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；动态 import 语法见 [ECMAScript](https://tc39.es/ecma262/)（[S11](handwritten-practice-sources.md#s11)）。

### H135. Chunk 命名稳定性与内容 hash

- **题目契约：**实现 `nameChunks(plan, contentMap, salt): Manifest`，输入 chunk 模块集合和内容，输出稳定文件名及依赖 manifest。
- **约束与不变量：**同一输入确定同名；单模块内容改变只使其所在及依赖 hash 变化；路径机密信息不得泄漏到文件名。
- **用例 A：**只改 lazy chunk，main chunk 名称保持、lazy 名称变化，manifest 引用更新。
- **用例 B：**输入模块遍历顺序随机，所有 chunk hash 与文件名仍完全相同。
- **实现提示：**hash 输入先按稳定模块 ID 排序并包含转译输出、运行时依赖和规则版本；避免 hash 自引用，分离 content hash 与 manifest hash。
- **进阶追问：**循环 chunk 引用时如何计算互相依赖的内容 hash？是否需 chunk group hash 或迭代收敛？
- **难度 / 建议时长：**难，45 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；模块执行语义参考 [ECMAScript](https://tc39.es/ecma262/)（[S11](handwritten-practice-sources.md#s11)）。

### H136. Source map 的生成列与原始列映射

- **题目契约：**实现 `mapPosition(generatedLine, generatedColumn, mappings): OriginalPosition | null`，输入 VLQ mapping 段，输出原文件位置或 unmapped。
- **约束与不变量：**同一行列按最近不大于目标列的 segment 查找；跨文件 source index 正确；一基/零基列定义明确。
- **用例 A：**列从 0 开始；generated line 1 有 segment `(genCol=10, source=source.ts, origLine=3, origCol=4)` 与 `(genCol=12, source=source.ts, origLine=8, origCol=2)`，查询 `(1,12)` 精确命中第二段并输出 `(source.ts,8,2)`。
- **用例 B：**generated line 1 的 segment 为 `(genCol=10, source=source.ts, origLine=3, origCol=4)` 与 `(genCol=12, unmapped)`；查询 `(1,12)` 返回 null，不继承前一段源映射穿过明确 gap。
- **实现提示：**先解码 delta 编码为每行排序 segment；用二分查找 nearest-left，并为 source/name 索引范围做校验。
- **进阶追问：**多级 source map compose 时如何处理列偏移只作用于第一行的规则？
- **难度 / 建议时长：**挑战，55 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；映射位置语法参考 [ECMAScript source text grammar](https://tc39.es/ecma262/)（[S11](handwritten-practice-sources.md#s11)）。

### H137. 转译链的 Source Map composition

- **题目契约：**实现 `composeMaps(mapAB, mapBC): MapAC`，输入 A→B 与 B→C 映射，输出 A→C 且保留 unmapped 区域。
- **约束与不变量：**映射中间文件坐标系必须一致；B 无映射位置不能臆造 C；文件名与 sourcesContent 按优先规则合并。
- **用例 A：**A 列 5 映射到 B 列 8，B 列 8 映射到 C 列 2，输出 A 列 5→C 列 2。
- **用例 B：**mapAB 的 A `(line=1,col=5)` 映射到 B `(line=1,col=8)`；mapBC 在 B `(1,8)` 正好有 unmapped segment，composeMaps 输出 A `(1,5)` unmapped，不沿用更早 source segment。
- **实现提示：**解码两图后对每个第一映射位置查询第二图；先统一路径与列基准，合并 sources 索引并重新编码 delta。
- **进阶追问：**B 是多行生成代码，列偏移与换行如何在 compose 中准确传播？
- **难度 / 建议时长：**挑战，60 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；source map 消费 API 机制可对照 [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)（[S08](handwritten-practice-sources.md#s08)）。

### H138. Source map 与诊断位置的 UTF-16 坐标桥接

- **题目契约：**实现 `convertPosition(text, offset, targetUnit): { line; column }`，输入 UTF-16 offset，输出从 0 开始的 code unit 或 code point 列。
- **约束与不变量：**换行 CRLF 按单个逻辑行结束；代理对不拆成两个 code point；列单位需与 parser/source map API 明确匹配。
- **用例 A：**字符串 `a😀b` 中 b 的 UTF-16 offset=3，对应 code point 列=2、code unit 列=3。
- **用例 B：**CRLF 后首字符映射到下一行列 0；若 offset 落在 surrogate pair 中间，返回 `INVALID_SURROGATE_BOUNDARY`，不向前或向后归一。
- **实现提示：**预计算行起点数组做二分查找；目标列单位用区段转换，保留原始 offset 供 VS Code/Babel 等接口适配。
- **进阶追问：**浏览器 selection offset、JavaScript 字符串索引和终端显示列宽为何不能混为一谈？
- **难度 / 建议时长：**难，40 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；字符串位置语义参照 [ECMAScript](https://tc39.es/ecma262/)（[S11](handwritten-practice-sources.md#s11)）。

### H139. 增量构建图的依赖闭包失效

- **题目契约：**实现 `invalidate(changedFiles, reverseGraph): Set<ModuleId>`，输入变更文件和反向依赖图，输出需重建集合。
- **约束与不变量：**循环图遍历终止；配置或虚拟模块变化可扩大到全图；结果不依赖输入顺序。
- **用例 A：**A 被 B/C 引用且 B 被 D 引用，改 A 输出 A/B/C/D 的受影响闭包。
- **用例 B：**B/C 互相依赖，改 B 返回有限集合，B、C 各只出现一次。
- **实现提示：**队列 BFS/DFS 加 visited Set；分清直接重新解析节点与只需重新生成 importer 的节点，结果携带失效原因链。
- **进阶追问：**动态 import、glob import、虚拟模块和插件新增依赖如何登记到图中并在删除后清理旧边？
- **难度 / 建议时长：**难，45 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；插件模块语法需对照 [Babel parser](https://babeljs.io/docs/babel-parser)（[S09](handwritten-practice-sources.md#s09)）。

### H140. 构建缓存键的完整语义输入

- **题目契约：**实现 `cacheKey({ source, config, plugins, deps, target }): string`，输入构建阶段依赖，输出稳定摘要和解释字段。
- **约束与不变量：**任何会改变产物的输入变化都改变 key；对象字段顺序不影响 key；秘密环境变量不泄入可读 key。
- **用例 A：**配置对象键顺序不同但语义相同，key 相同；target 从 modern 改 legacy，key 不同。
- **用例 B：**插件版本升级后 key 改变；未参与当前 stage 的无关环境变量不改变 key。
- **实现提示：**先对 stage schema 规范化，再稳定序列化与 hash；记录每个输入贡献摘要用于 cache miss 解释。
- **进阶追问：**依赖文件内容如何参与 key 而不重复 hash 整个大型仓库？讨论 Merkle 节点与失效粒度。
- **难度 / 建议时长：**挑战，50 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；编译器配置 API 参照 [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)（[S08](handwritten-practice-sources.md#s08)）。

### H141. 插件顺序与同名 transform 的确定性

- **题目契约：**实现 `sortPlugins(plugins, constraints): Plugin[]`，输入 before/after 关系和插件阶段，输出稳定执行序或 cycle diagnostics。
- **约束与不变量：**依赖约束必须满足；同阶段 ready 插件按 plugin ID 字典序选取；约束成环时拒绝构建并报告 cycle 路径。
- **用例 A：**A before C、B after A，输入顺序 C/B/A，输出唯一顺序 A/B/C；ready 集合出现 B/C 时按 ID 字典序先选 B。
- **用例 B：**A before B、B before A，输出 PLUGIN_ORDER_CYCLE 并含 A→B→A。
- **实现提示：**构造有向图做 Kahn 拓扑排序，用 plugin ID 字典序作为优先队列 tie break；transform 输出需带来源 plugin ID 追踪。
- **进阶追问：**插件动态插入虚拟依赖后需要重跑排序还是局部调整？怎样保证缓存结果不受机器环境影响？
- **难度 / 建议时长：**难，45 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；解析阶段输出参照 [Babel parser](https://babeljs.io/docs/babel-parser)（[S09](handwritten-practice-sources.md#s09)）。

### H142. HMR 更新边界查找与失效回退

- **题目契约：**实现 `findAcceptBoundary(changedId, importGraph): HmrPlan`，输出接受边界集合、需更新模块与 fullReload 标记。
- **约束与不变量：**沿 importer 向上搜索；所有可达路径都必须被接受才能局部更新；循环图遍历有界；无边界时 fullReload=true。
- **用例 A：**模块 C 被 A、B 引用，A/B 均 accept C，输出两边界且不全刷。
- **用例 B：**A 路径 accept、B 路径无 accept，结果 fullReload=true，不遗漏未接受分支。
- **实现提示：**用 visited 处理环，沿路径记录边界；对每条到 entry 的路径验证接受闭合，再生成稳定更新计划。
- **进阶追问：**自接受模块修改导出签名后，下游 importer 如何失效？副作用模块需何种 dispose 契约？
- **难度 / 建议时长：**挑战，50 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；HMR accept 与 dispose 参考 [Vite HMR API](https://vite.dev/guide/api-hmr)（[S10](handwritten-practice-sources.md#s10)）。

### H143. HMR dispose data 的版本迁移

- **题目契约：**实现 `migrateHotData(previous, nextModuleVersion): HotData`，模块可在 dispose 写入状态，下一版读取并迁移。
- **约束与不变量：**data 按模块身份隔离；迁移失败时清理资源并触发安全回退；旧 disposer 不得覆盖新版本已写入的数据。
- **用例 A：**v1 保存 `{count:2}`，v2 读取后迁移为 `{value:2}`，组件状态连续且 listener 只保留一个。
- **用例 B：**v2 schema 不认识 v1 数据，输出 migration error、dispose v1 timer，并触发该模块 full reload。
- **实现提示：**hot data 带 schemaVersion 和 generation；dispose 先暂停副作用并写快照，accept 阶段校验版本后消费并删除临时字段。
- **进阶追问：**HMR 更新中第二次文件变更先于第一次 apply 完成，如何串行化或合并更新？
- **难度 / 建议时长：**难，45 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；`dispose`/`accept` 数据通道见 [Vite HMR API](https://vite.dev/guide/api-hmr)（[S10](handwritten-practice-sources.md#s10)）。

### H144. HMR WebSocket 更新队列的去重与重放

- **题目契约：**实现 `applyUpdateStream(events, clientVersion): ApplyPlan[]`，输入 update/prune/full-reload 事件，输出顺序应用计划。
- **约束与不变量：**版本必须单调；重复 update ID 幂等；断线重连先校验版本并按需 full reload，不能跳过有依赖的更新。
- **用例 A：**客户端 v3 收到 v4 update 两次，只 apply 一次且最终 version=4。
- **用例 B：**断线后服务端只保留 v8，客户端 v5 无法补齐 v6/v7 时输出 fullReload，不直接 apply v8。
- **实现提示：**维护 lastAppliedVersion 与已见 event ID；将事件放入有序缓冲，验证连续版本后提交，队列超限触发同步快照。
- **进阶追问：**服务端重新排序 CSS 和 JS 更新时如何避免瞬间出现新 JS 配旧样式？
- **难度 / 建议时长：**难，45 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；客户端更新机制参照 [Vite HMR API](https://vite.dev/guide/api-hmr)（[S10](handwritten-practice-sources.md#s10)）。

### H145. CSS HMR 的副作用清理与顺序

- **题目契约：**实现 `replaceStyle(oldHandle, newCss, order): Promise<StyleHandle>`，输入旧样式句柄和更新内容，输出替换句柄。
- **约束与不变量：**同一 style owner 不短暂出现两个不同版本；多个 stylesheet 顺序稳定；旧 handle dispose 幂等。
- **用例 A：**更新 style A 后 DOM 中仅一个 A 节点，顺序仍为 reset、base、component。
- **用例 B：**新 CSS 注入失败，旧样式继续生效并报告失败，不留下空白页面或孤立 link。
- **实现提示：**先准备 detached 新节点并校验加载，再按 order 原子替换；保存节点 owner ID，失败时清理候选节点。
- **进阶追问：**CSS module class 名变化时 JS 模块也必须更新，如何把跨资源依赖纳入 HMR 计划？
- **难度 / 建议时长：**难，40 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；HMR 模块更新参照 [Vite HMR API](https://vite.dev/guide/api-hmr)（[S10](handwritten-practice-sources.md#s10)）。

### H146. Watcher 事件抖动与一致快照构建

- **题目契约：**实现 `coalesceFsEvents(events, windowMs): ChangeSet`，输入 add/change/unlink 事件，输出文件最终状态变更集。
- **约束与不变量：**add→change 归一为 add；add→unlink 抵消；unlink→add 根据文件身份策略判为 change 或替换；重叠窗口结果确定。
- **用例 A：**同路径 3 次 change 在窗口内合并成一次 changed 项。
- **用例 B：**同窗口 add 后 unlink 输出 no-op；unlink 后 add 输出 replaced 并使文件身份缓存失效。
- **实现提示：**按 path 保存首态和末态事件，flush 时将事件对归一；构建前重新 stat/hash 验证快照，避免读到写入中的半文件。
- **进阶追问：**网络文件系统事件丢失时怎样通过定期目录快照修正增量图？
- **难度 / 建议时长：**难，40 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；parser 输入语法边界参照 [Babel parser](https://babeljs.io/docs/babel-parser)（[S09](handwritten-practice-sources.md#s09)）。

### H147. 构建产物 manifest 的跨 chunk 校验

- **题目契约：**实现 `validateManifest(manifest, files): Diagnostic[]`，输入入口依赖图和磁盘产物列表，输出缺失文件、孤立文件及引用环诊断。
- **约束与不变量：**所有 manifest URL 均在部署根目录内；每个静态依赖文件存在；孤立产物按政策报错或清理建议。
- **用例 A：**main.js 引用 vendor.js 且两者存在，诊断为空，入口闭包完整。
- **用例 B：**manifest 指向 `../secret.js` 或缺失 chunk，分别报告 PATH_ESCAPE 和 MISSING_ARTIFACT。
- **实现提示：**规范化 URL 路径后检查根目录边界；从入口 BFS 收集可达文件；将文件读写与纯校验函数分层。
- **进阶追问：**部署时旧 HTML 引用旧 hashed chunk，而清理任务删除过早会怎样？如何设计保留窗口？
- **难度 / 建议时长：**中，35 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；模块与导入语法对照 [ECMAScript](https://tc39.es/ecma262/)（[S11](handwritten-practice-sources.md#s11)）。

### H148. 插件虚拟模块的稳定身份与缓存

- **题目契约：**实现 `resolveVirtualId(rawId, pluginId): CanonicalId` 与 `loadVirtual(id): ModuleSource`，输出模块图节点及 cache key。
- **约束与不变量：**插件 namespace 隔离；带 query 参数的虚拟 ID 规范化但保留语义选项；不同插件不能意外命中同名模块。
- **用例 A：**plugin A 与 B 都声明 `virtual:config`，生成两个不同 canonical ID 和独立模块内容。
- **用例 B：**同 plugin 的参数顺序变化按 schema 排序后同 key；语义参数值改变后 cache miss。
- **实现提示：**内部 ID 编码 plugin namespace、module path、canonical query；外部诊断显示安全友好名称而不是内部控制字符。
- **进阶追问：**虚拟模块导入真实文件后，watcher 如何建立反向依赖边并在配置变化时失效？
- **难度 / 建议时长：**难，45 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；插件解析 AST 可参考 [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)（[S08](handwritten-practice-sources.md#s08)）。

### H149. TypeScript 增量 Program 的版本化文件缓存

- **题目契约：**实现 `updateProgram(previous, changedFiles, compilerOptions): ProgramResult` 的缓存规划器，输出复用源文件数、重新解析数和诊断差异。
- **约束与不变量：**编译选项变化需使受影响阶段失效；文件删除清除旧节点；版本不匹配时不复用 AST；诊断按文件位置稳定排序。
- **用例 A：**仅改 leaf.ts，复用其余 99 个未受影响源文件并更新 importers 的类型检查结果。
- **用例 B：**strictNullChecks 从 false 改 true，语义缓存整体失效并报告 compiler option cause。
- **实现提示：**文件版本/hash 与 CompilerHost 缓存对齐；区分 parse reuse 与 bind/typecheck reuse，输出 invalidation trace。
- **进阶追问：**项目引用与 declaration emit 如何形成跨 Program 缓存依赖？删除文件时如何移除旧模块符号？
- **难度 / 建议时长：**挑战，55 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；Program 与 CompilerHost 参考 [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)（[S08](handwritten-practice-sources.md#s08)）。

### H150. 编译诊断的代码帧与 source map 回溯

- **题目契约：**实现 `formatDiagnostic(diagnostic, maps, sourceFiles): CodeFrame`，输入生成文件诊断与 source map 链，输出原始文件代码帧。
- **约束与不变量：**映射缺失时使用生成文件位置并标记 generated；源列越界不崩溃；多级 map 失败记录断点阶段。
- **用例 A：**bundle.js 行 10 列 4 映射回 app.ts 行 8 列 2，代码帧高亮正确原始字符。
- **用例 B：**map 文件缺失时输出 `source unavailable` 与 bundle 坐标，不能伪造源码位置。
- **实现提示：**逐层调用位置映射，记录每一步 file/line/column；按 UTF-16 列转换原始行片段并截取上下文。
- **进阶追问：**错误位置映射到了 transpiler 合成 helper 时，怎样回退到最近有意义的用户源码节点？
- **难度 / 建议时长：**难，45 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；编译诊断 API 可对照 [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)（[S08](handwritten-practice-sources.md#s08)）。

### H151. 构建输出的确定性与非确定性审计

- **题目契约：**实现 `compareBuilds(buildA, buildB): AuditReport`，输入两次构建的文件、manifest 和 metadata，输出字节差异、顺序差异及可能随机源。
- **约束与不变量：**忽略时间戳等明确 volatile 字段后比较；同输入预期产物排序稳定；报告不得把真实内容差异归类为噪声。
- **用例 A：**两次构建内容相同但 manifest 键序不同，canonicalize 后结果一致并标记 order-only。
- **用例 B：**bundle 中嵌入不同随机 ID，报告具体文件和差异片段，不因存在 hash 文件名而忽略内容。
- **实现提示：**构建元数据单独抽取，文本/二进制文件分策略 hash；对差异追踪时间、随机源、并行遍历顺序等候选因素。
- **进阶追问：**压缩器版本变化造成字节差异但语义一致，如何区分可复现性与语义等价？
- **难度 / 建议时长：**难，40 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；源语义差异核对可参考 [ECMAScript](https://tc39.es/ecma262/)（[S11](handwritten-practice-sources.md#s11)）。

### H152. 编译器插件的副作用事务与失败回滚

- **题目契约：**实现 `runPlugin(plugin, module, context): Promise<PluginResult>`，插件可读依赖、生成虚拟文件并提交诊断，输出事务结果。
- **约束与不变量：**插件失败时不发布半套文件或依赖边；插件产生的资源有 disposer；相同输入执行顺序确定且可取消。
- **用例 A：**插件生成两个虚拟模块后成功，二者与依赖边在事务提交时一起出现。
- **用例 B：**第二次生成操作抛错，第一文件和新增边均回滚，诊断保留 pluginId 与阶段。
- **实现提示：**context 写入先进入 staging area；resolve/load/generate 阶段结束后原子 merge；失败时 dispose staging resources 并附 cause chain。
- **进阶追问：**插件在外部系统已写文件后失败，内存事务无法回滚时如何设计补偿、临时路径和幂等重跑？
- **难度 / 建议时长：**挑战，55 分钟。
- **依据与状态：**作者原创派生练习，未实现/未实跑；插件解析机制参考 [Babel parser](https://babeljs.io/docs/babel-parser)（[S09](handwritten-practice-sources.md#s09)）与 [Vite HMR API](https://vite.dev/guide/api-hmr)（[S10](handwritten-practice-sources.md#s10)）。

## 深入阅读

- [TypeScript Compiler API Wiki](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)：阅读 Program、CompilerHost、AST visitor 与诊断接口。
- [Babel Parser](https://babeljs.io/docs/babel-parser)：核对 parser options、插件组合、AST 节点和错误恢复边界。
- [Vite HMR API](https://vite.dev/guide/api-hmr)：理解 accept、dispose、prune 和更新边界协议。
- [ECMAScript Specification](https://tc39.es/ecma262/)：用语言规范核对语法、模块和执行语义。
- S08–S11 为官方机制参考，不能证明本题是任一公司的真实考题。
