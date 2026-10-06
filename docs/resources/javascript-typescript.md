---
title: JavaScript 与 TypeScript 资料
description: JavaScript 语言、规范与 TypeScript 学习资料，附每条资料的具体学习方式
---

# JavaScript 与 TypeScript 资料

日常查 MDN，系统学习用 javascript.info，底层原理读 YDKJS 与规范；TypeScript 先读 Handbook，再用 type-challenges 练习。

所有链接均已用 curl 检查可访问。语言标签为资料正文语言；难度：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## 语言基础与系统教程

!!! tip "这一组怎么学"
    1. 第 1 至 2 周：按 javascript.info「JavaScript 基础知识」与「函数进阶」顺序学习，每章做完练习题。
    2. 同时把 MDN 指南当作查证工具，遇到概念先查 MDN 再回到教程。
    3. 然后读 YDKJS 第 2 版的 Get Started 与 Scope & Closures。预计 40 至 60 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MDN JavaScript 文档](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript) | 官方文档 | 中文 | 入门 | 将其作为查证入口，写代码遇到不确定的内置对象行为时先查它。 |
| [现代 JavaScript 教程 (zh.javascript.info)](https://zh.javascript.info/) | 教程 | 中文 | 入门 | 顺序学习，每章末尾的任务先自己做，再看答案。 |
| [javascript.info（英文原版）](https://javascript.info/) | 教程 | English | 入门 | 中文版有滞后时对照英文版，并用来练习技术英语阅读。 |
| [阮一峰：ECMAScript 6 入门](https://es6.ruanyifeng.com/) | 书 | 中文 | 入门 | 按章节读 Promise、Module、Class、Proxy，用 Node 跑每个示例。 |
| [网道 JavaScript 教程](https://wangdoc.com/javascript/) | 教程 | 中文 | 入门 | 作为 ES5 与语言核心的系统复习，读完数据类型与对象两部分后做自测。 |
| [网道 Web API 教程](https://wangdoc.com/webapi/) | 教程 | 中文 | 入门 | 配合 DOM 章节练习，读完后写一个不依赖框架的小组件。 |
| [Eloquent JavaScript](https://eloquentjavascript.net/) | 书 | English | 入门 | 免费在线版，每章末尾习题必做，第 8 至 11 章重点读错误与异步。 |
| [Exploring JS 系列（Axel Rauschmayer）](https://exploringjs.com/) | 书 | English | 进阶 | 在站内选 JavaScript 或 TypeScript 对应书目，免费在线阅读，按目录补自己的薄弱点。 |
| [2ality 博客](https://2ality.com/) | 教程 | English | 进阶 | 关注新语法提案的解读文章，读后到 TC39 仓库核对提案阶段。 |
| [You Don't Know JS Yet](https://github.com/getify/You-Dont-Know-JS) | 书 | English | 深入 | 先通读 Get Started，再读 Scope & Closures，并用自己的话总结。 |
| [YDKJS：Get Started](https://github.com/getify/You-Dont-Know-JS/tree/2nd-ed/get-started) | 书 | English | 进阶 | 读完后列出自己对值、原型、this 的三个原先误解。 |
| [YDKJS：Scope & Closures](https://github.com/getify/You-Dont-Know-JS/tree/2nd-ed/scope-closures) | 书 | English | 深入 | 读完后不看资料手写词法作用域与闭包的解释，并给出三个示例。 |
| [33 JS Concepts](https://github.com/leonardomso/33-js-concepts) | 教程 | English | 入门 | 作为知识清单，逐项自测，不会的点跳转到链接文章学习。 |
| [冴羽的博客：JavaScript 深入系列](https://github.com/mqyqingfeng/Blog) | 教程 | 中文 | 进阶 | 阅读原型、作用域、执行上下文、this 系列，读完后手写 call、apply、bind。 |
| [Patterns.dev](https://www.patterns.dev/) | 教程 | English | 进阶 | 阅读设计模式章节，挑一个模式在你的项目中找出实际应用。 |
| [JSDoc 文档](https://jsdoc.app/) | 官方文档 | English | 入门 | 给一个纯 JS 模块补全 JSDoc 注解，并在编辑器里体会类型提示。 |

## 异步、事件循环与运行时

!!! tip "这一组怎么学"
    1. 先看 Philip Roberts 的事件循环演讲（约 26 分钟），再用 Loupe 工具复现。
    2. 读 Jake Archibald 的任务与微任务文章，并用浏览器验证他给出的输出顺序。
    3. 最后读 MDN 事件循环与 Promise 指南，手写一个 Promise。预计 6 至 10 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [JavaScript Visualized：Event Loop（Lydia Hallie）](https://dev.to/lydiahallie/javascript-visualized-event-loop-3dif) | 教程 | English | 入门 | 先看动画再预测示例输出，错了就重看对应一步。 |
| [Philip Roberts：What the heck is the event loop anyway?](https://www.youtube.com/watch?v=8aGhZQkoFbQ) | 视频 | English | 入门 | 看完后关闭视频，用自己的话画出调用栈、Web API、任务队列。 |
| [Loupe 事件循环可视化工具](https://latentflip.com/loupe/) | 工具 | English | 入门 | 把自己的 setTimeout 示例粘贴进去，逐步观察队列变化。 |
| [Jake Archibald：任务、微任务、队列与调度](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/) | 教程 | English | 进阶 | 在浏览器中运行文中的示例，并解释每个输出顺序的原因。 |
| [MDN 事件循环](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) | 官方文档 | English | 入门 | 读完后画出一次点击事件触发 Promise 与定时器的完整时序。 |
| [MDN 使用 Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) | 官方文档 | English | 入门 | 读完链式与错误处理两节，改写一段回调地狱代码为 async/await。 |
| [MDN 迭代器与生成器](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators) | 官方文档 | English | 进阶 | 用生成器实现一个惰性分页读取器，并用 for await 消费。 |
| [MDN 元编程](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming) | 官方文档 | English | 进阶 | 用 Proxy 与 Reflect 实现一个带校验的对象，并说明 Vue 3 响应式的原理。 |
| [MDN JavaScript 模块](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) | 官方文档 | English | 入门 | 在浏览器中写 type=module 示例，对比与 CommonJS 的差异。 |
| [MDN 闭包](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) | 官方文档 | English | 入门 | 读完实用闭包与循环陷阱两节，并复现 var 循环问题。 |
| [MDN 继承与原型链](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) | 官方文档 | English | 进阶 | 用 Object.create 手工搭建三层原型链，并用 console.dir 验证。 |
| [MDN 内存管理](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management) | 官方文档 | English | 进阶 | 读完后用 DevTools Memory 面板复现一次闭包导致的泄漏。 |
| [MDN JavaScript 指南](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) | 官方文档 | English | 入门 | 按章节复习，每章写一段不看资料的代码再校对。 |
| [MDN JavaScript 参考](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference) | 官方文档 | English | 入门 | 查内置对象方法签名与兼容性，不通读。 |
| [web.dev：优化长任务](https://web.dev/articles/optimize-long-tasks) | 教程 | English | 进阶 | 用 Performance 面板找出一个长任务，并用文中的拆分方式改造。 |
| [Node.js 官方学习区](https://nodejs.org/en/learn) | 教程 | English | 入门 | 按主题选读异步与运行时章节，理解服务端的执行环境。 |
| [Node.js：事件循环、定时器与 nextTick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick) | 官方文档 | English | 进阶 | 预测 setImmediate 与 nextTick 的输出顺序，再运行验证。 |
| [V8 文档](https://v8.dev/docs) | 官方文档 | English | 深入 | 阅读与垃圾回收、字节码相关的条目，了解引擎如何执行你的代码。 |
| [V8 语言特性](https://v8.dev/features) | 官方文档 | English | 进阶 | 按版本浏览新特性介绍，挑一个在代码里尝试。 |
| [V8 官方博客](https://v8.dev/blog) | 教程 | English | 深入 | 选读隐藏类、内联缓存相关文章，并用 --allow-natives-syntax 实验。 |
| [现代 JavaScript 教程：异步](https://zh.javascript.info/async) | 教程 | 中文 | 入门 | 做完回调、Promise、async/await 的全部练习。 |
| [现代 JavaScript 教程：闭包](https://zh.javascript.info/closure) | 教程 | 中文 | 入门 | 完成练习中的计数器与排序函数任务。 |
| [现代 JavaScript 教程：原型](https://zh.javascript.info/prototypes) | 教程 | 中文 | 入门 | 做完原型继承与 F.prototype 的任务，并画出对象关系图。 |
| [现代 JavaScript 教程：事件循环](https://zh.javascript.info/event-loop) | 教程 | 中文 | 入门 | 完成微任务与宏任务例子，预测输出再运行验证。 |

## 规范与标准

!!! tip "这一组怎么学"
    1. 先读 TC39 流程文档，了解提案的 Stage 0 至 4。
    2. 读规范时从目录或搜索定位算法名（如 OrdinaryCreateFromConstructor），先看步骤再看注释。
    3. 每读一个抽象操作，在控制台写代码验证。每次 20 至 30 分钟即可。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [ECMA-262 语言规范](https://tc39.es/ecma262/) | 规范 | English | 深入 | 搜索一个内置方法（如 Array.prototype.map），逐步骤读其算法并对照实现。 |
| [ECMA-262 多页版](https://tc39.es/ecma262/multipage/) | 规范 | English | 深入 | 页面更小加载更快，适合按章节阅读，先读「Notational Conventions」学符号。 |
| [ECMA-402 国际化 API](https://tc39.es/ecma402/) | 规范 | English | 深入 | 查 Intl.DateTimeFormat 等行为，对照 MDN 示例验证。 |
| [TC39 官网](https://tc39.es/) | 规范 | English | 进阶 | 浏览规范与提案入口，了解各委员会文档位置。 |
| [TC39 流程文档](https://tc39.es/process-document/) | 规范 | English | 进阶 | 读完阶段定义，并判断一个你关心的提案目前所处阶段。 |
| [TC39 提案仓库](https://github.com/tc39/proposals) | 规范 | English | 深入 | 每月查看 Stage 3 列表，选一个提案读其 README 和示例。 |
| [TC39 已完成提案](https://github.com/tc39/proposals/blob/main/finished-proposals.md) | 规范 | English | 进阶 | 按年份浏览，了解各 ES 版本新增特性及其出处。 |
| [Temporal 提案文档](https://tc39.es/proposal-temporal/docs/) | 官方文档 | English | 进阶 | 阅读 cookbook，用 Temporal 重写一个日期计算函数，并对比 Date。 |
| [Promises/A+ 规范](https://promisesaplus.com/) | 规范 | English | 进阶 | 逐条对照实现一个 Promise，并用官方测试套件验证。 |
| [HTML 规范：事件循环](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops) | 规范 | English | 深入 | 阅读处理模型的步骤，对照 Jake Archibald 的文章理解渲染时机。 |

## TypeScript

!!! tip "这一组怎么学"
    1. 第 1 周：读 TS Handbook 的「The Basics」「Everyday Types」「Narrowing」「Generics」四篇，用 Playground 复现示例。
    2. 第 2 周：读类型运算相关文档（条件类型、映射类型、工具类型），同时开始做 type-challenges 的 Easy 与 Medium。
    3. 之后用 Total TypeScript 的教程练习并阅读 tsconfig 参考。预计 30 至 40 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) | 官方文档 | English | 入门 | 按顺序读完基础部分，每篇在 Playground 中改写示例。 |
| [TypeScript 官方文档中文站](https://www.typescriptlang.org/zh/docs/) | 官方文档 | 中文 | 入门 | 作为中文入口快速查阅，细节以英文版为准。 |
| [TS for JS Programmers](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html) | 官方文档 | English | 入门 | 有 JS 基础的人先读此篇，约 30 分钟建立整体印象。 |
| [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) | 官方文档 | English | 入门 | 读完后给一段无类型 JS 补全类型注解。 |
| [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) | 官方文档 | English | 进阶 | 实现类型守卫与可辨识联合，并让 never 检查穷尽性。 |
| [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) | 官方文档 | English | 入门 | 比较 interface 与 type 的扩展方式，写出两者的各一个适用场景。 |
| [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) | 官方文档 | English | 进阶 | 为一个 fetch 封装函数写出带约束的泛型签名。 |
| [Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html) | 官方文档 | English | 进阶 | 依次练习 keyof、typeof、索引访问类型，并组合成一个工具类型。 |
| [Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) | 官方文档 | English | 进阶 | 手写 Exclude 与 ReturnType，再理解 infer 的作用。 |
| [Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) | 官方文档 | English | 进阶 | 实现 Partial、Readonly 与键重映射的版本。 |
| [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) | 官方文档 | English | 入门 | 逐个练习，并用 Playground 查看每个工具类型展开后的结果。 |
| [Modules](https://www.typescriptlang.org/docs/handbook/modules/introduction.html) | 官方文档 | English | 进阶 | 读模块解析相关章节，理解 moduleResolution 对导入的影响。 |
| [声明文件入门](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html) | 官方文档 | English | 进阶 | 为一个无类型的 npm 包写最小 d.ts 并在项目中使用。 |
| [tsconfig 参考](https://www.typescriptlang.org/tsconfig/) | 官方文档 | English | 进阶 | 将 strict 展开为各子选项，逐个开启并修复报错。 |
| [tsconfig.json 说明](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) | 官方文档 | English | 入门 | 读完后为一个新项目手写最小 tsconfig。 |
| [TypeScript Cheat Sheets](https://www.typescriptlang.org/cheatsheets/) | 官方文档 | English | 入门 | 打印或收藏，写代码时作为类型与类的速查表。 |
| [TypeScript Playground](https://www.typescriptlang.org/play) | 工具 | English | 入门 | 复现类型问题时贴出链接，并查看编译输出与类型推导。 |
| [TypeScript Wiki：性能](https://github.com/microsoft/TypeScript/wiki/Performance) | 官方文档 | English | 深入 | 读完后用 tsc --extendedDiagnostics 分析自己项目的检查耗时。 |
| [Total TypeScript 教程](https://www.totaltypescript.com/tutorials) | 教程 | English | 进阶 | 先做免费教程中的交互练习，再决定是否购买付费课程。 |
| [Total TypeScript Essentials](https://www.totaltypescript.com/books/total-typescript-essentials) | 书 | English | 入门 | 免费电子书，读完后用其中的练习巩固日常类型用法。 |
| [Total TypeScript Tips](https://www.totaltypescript.com/tips) | 教程 | English | 进阶 | 每天读一条短文，把技巧写入自己的笔记并在项目试用。 |
| [Matt Pocock YouTube 频道](https://www.youtube.com/@mattpocockuk) | 视频 | English | 进阶 | 挑泛型与类型推导主题的视频，边看边在 Playground 复现。 |
| [type-challenges](https://github.com/type-challenges/type-challenges) | 工具 | English | 进阶 | 每天一题，从 Easy 开始，先自己做再看高赞解答。 |
| [type-challenges 中文说明](https://github.com/type-challenges/type-challenges/blob/main/README.zh-CN.md) | 工具 | 中文 | 进阶 | 先读规则与做题方式，再开始第一题。 |
| [Effective TypeScript](https://effectivetypescript.com/) | 书 | English | 进阶 | 以条目为单位阅读，每条对照自己的代码是否违反。 |
| [Type-Level TypeScript](https://type-level-typescript.com/) | 教程 | English | 深入 | 按章节做类型体操，从基础到模板字面量类型。 |
| [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/) | 书 | English | 进阶 | 读设计思路与项目配置部分，并与官方 Handbook 对照。 |
| [TypeScript 入门教程（xcatliu）](https://ts.xcatliu.com/) | 教程 | 中文 | 入门 | 中文系统教程，按章节学习，读完后把一个 JS 小项目迁移到 TS。 |
| [网道 TypeScript 教程](https://wangdoc.com/typescript/) | 教程 | 中文 | 入门 | 按章节读类型系统与泛型，章末对照官方文档校验术语。 |
| [Learning TypeScript](https://www.learningtypescript.com/) | 教程 | English | 入门 | 浏览其免费文章与教程，作为入门阶段的补充。 |
| [TS Chibicode 交互教程](https://ts.chibicode.com/) | 教程 | English | 入门 | 完成交互式的泛型与类型收窄示例。 |
| [typescript-eslint](https://typescript-eslint.io/) | 工具 | English | 进阶 | 在项目中启用 recommended 配置，阅读每条触发规则的说明。 |
| [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/) | 教程 | English | 进阶 | 在 React 项目中按其组件、Hooks、事件的写法逐项套用。 |
