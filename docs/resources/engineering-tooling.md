---
title: 工程化与工具链资料
description: 构建、编译器、包管理、Monorepo、Node 运行时、代码质量、Git 与 CI/CD 的官方文档与教程
---

# 工程化与工具链资料

先掌握 Vite 与 pnpm，再理解 webpack、Rollup 的原理，最后补齐质量与测试体系。

所有链接均已检查可访问。语言标签为资料正文语言；难度：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## 构建工具

!!! tip "这一组怎么学"
    第 1 步：读 Vite「为什么选 Vite」与功能指南，新建项目跑通开发与构建（约 4 小时）。第 2 步：读 Vite 插件 API，写一个 30 行的自定义插件（约 3 小时）。第 3 步：读 webpack 概念与入门指南，手配一次 loader、plugin、代码分割，再对比 Rollup 与 esbuild 的定位差异（约 8 小时）。第 4 步：关注 Rolldown 与 Oxc 的进展。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Vite 官方文档](https://cn.vitejs.dev/) | 官方文档 | 中文 | 入门 | 现代前端构建工具，开发服务器与构建流程官方说明。 |
| [Vite：为什么选 Vite（中文）](https://cn.vitejs.dev/guide/why.html) | 官方文档 | 中文 | 入门 | 读完后讲清原生 ESM 开发服务器与预构建的作用。 |
| [Vite：功能（中文）](https://cn.vitejs.dev/guide/features.html) | 官方文档 | 中文 | 入门 | 逐项试用 CSS、静态资源、glob 导入，写一个小例子。 |
| [Vite：构建生产版本（中文）](https://cn.vitejs.dev/guide/build.html) | 官方文档 | 中文 | 进阶 | 配置 manualChunks 并查看产物体积变化。 |
| [Vite：插件 API（中文）](https://cn.vitejs.dev/guide/api-plugin.html) | 官方文档 | 中文 | 进阶 | 写一个 transform 钩子插件并打印执行顺序。 |
| [Vite：依赖预构建](https://vite.dev/guide/dep-pre-bundling.html) | 官方文档 | English | 进阶 | 用 optimizeDeps 观察缓存目录，解释何时重新预构建。 |
| [Vite：SSR 指南](https://vite.dev/guide/ssr.html) | 官方文档 | English | 深入 | 按文档搭一个最小 SSR 服务，理解客户端与服务端入口。 |
| [Vite：性能](https://vite.dev/guide/performance.html) | 官方文档 | English | 进阶 | 对照清单排查自己项目的慢启动原因。 |
| [Vite：配置参考](https://vite.dev/config/) | 官方参考 | English | 进阶 | 作为查阅手册，用到哪项再读哪项。 |
| [Vite：Rolldown 集成](https://vite.dev/guide/rolldown.html) | 官方文档 | English | 进阶 | 了解迁移路径，在测试分支试跑并对比构建时间。 |
| [Vite 博客](https://vite.dev/blog) | 官方博客 | English | 进阶 | 每个大版本读发布说明，记录破坏性变更。 |
| [Rolldown 入门](https://rolldown.rs/guide/getting-started) | 官方文档 | English | 进阶 | Rust 编写的 Rollup 兼容打包器，跑一个最小示例。 |
| [VoidZero](https://voidzero.dev/) | 项目官网 | English | 进阶 | 了解 Vite、Rolldown、Oxc 的整体路线。 |
| [webpack 文档](https://webpack.js.org/concepts/) | 官方文档 | English | 进阶 | 核心概念、loader/plugin 机制，面试高频。 |
| [webpack 中文文档](https://webpack.docschina.org/concepts/) | 官方文档 | 中文 | 进阶 | 社区维护的 webpack 中文翻译。 |
| [webpack 入门指南](https://webpack.js.org/guides/getting-started/) | 官方教程 | English | 入门 | 从零手配一个项目，依次加 loader 与 plugin。 |
| [webpack 模块联邦](https://webpack.js.org/concepts/module-federation/) | 官方文档 | English | 深入 | 搭两个应用实现远程模块共享，理解微前端的一种方案。 |
| [Rollup 文档](https://cn.rollupjs.org/) | 官方文档 | 中文 | 进阶 | 库打包的常用工具，学习 Tree Shaking 与 ES 模块打包。 |
| [Rollup 简介（中文）](https://cn.rollupjs.org/introduction/) | 官方文档 | 中文 | 入门 | 做一个多格式（esm 与 cjs）输出的库打包。 |
| [Rollup 配置选项](https://rollupjs.org/configuration-options/) | 官方参考 | English | 进阶 | 通读 output 与 treeshake 两节。 |
| [esbuild 文档](https://esbuild.github.io/) | 官方文档 | English | 进阶 | 极速构建工具，了解原生编译带来的性能优势。 |
| [esbuild 架构说明](https://github.com/evanw/esbuild/blob/main/docs/architecture.md) | 设计文档 | English | 深入 | 读完总结它为什么快（并行、少遍历、内存布局）。 |
| [esbuild FAQ](https://esbuild.github.io/faq/) | 官方文档 | English | 进阶 | 了解它刻意不做哪些事，理解与 Vite 的分工。 |
| [esbuild 插件](https://esbuild.github.io/plugins/) | 官方文档 | English | 进阶 | 写一个 onResolve 与 onLoad 插件。 |
| [Rspack 文档](https://rspack.rs/) | 官方文档 | English | 进阶 | 把一个 webpack 项目迁移到 Rspack，记录兼容问题与速度提升。 |
| [Rsbuild 文档](https://rsbuild.dev/) | 官方文档 | English | 进阶 | 基于 Rspack 的构建工具，新建项目体验开箱配置。 |
| [Lightning CSS](https://lightningcss.dev/) | 官方文档 | English | 进阶 | 在 Vite 中启用它替代 PostCSS 的转换，对比耗时。 |
| [PostCSS 文档](https://postcss.org/docs/) | 官方文档 | English | 进阶 | 写一个最小插件，理解 CSS AST 的处理方式。 |
| [tsdown](https://tsdown.dev/) | 官方文档 | English | 进阶 | 用它打包一个 TypeScript 库并同时输出类型声明。 |
| [tsup 文档](https://tsup.egoist.dev/) | 官方文档 | English | 进阶 | 对比 tsdown，写一份相同的打包配置。 |
| [unbuild](https://unbuild.unjs.io/) | 官方文档 | English | 进阶 | 了解 UnJS 生态的库打包方案与 stub 开发模式。 |
| [bundlejs](https://bundlejs.com/) | 在线工具 | English | 入门 | 粘贴依赖导入语句，即时查看打包与压缩后体积。 |
| [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer) | 工具 | English | 进阶 | 接入构建，用产物树图找出最大的依赖。 |

## 编译器、AST 与代码转换

!!! tip "这一组怎么学"
    先读 Babel Handbook 理解 AST 与遍历，再在 AST Explorer 里观察真实代码的语法树（约 3 小时），然后写一个 Babel 插件和一个 ESLint 自定义规则。最后了解 SWC、Oxc、Biome 为什么用 Rust 重写这些工具。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Babel 文档](https://babeljs.io/docs/) | 官方文档 | English | 进阶 | 转译与 polyfill 机制的官方说明。 |
| [Babel preset-env](https://babeljs.io/docs/babel-preset-env) | 官方文档 | English | 进阶 | 配置 targets，观察输出代码随浏览器目标的变化。 |
| [Babel 插件列表](https://babeljs.io/docs/plugins) | 官方参考 | English | 进阶 | 浏览 transform 插件，知道各语法特性由谁转换。 |
| [Babel Handbook（jamiebuilds）](https://github.com/jamiebuilds/babel-handbook) | 手册 | English | 深入 | 通读用户与插件两本手册，约 3 小时，理解 visitor 与路径。 |
| [Babel 插件手册（中文）](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md) | 手册 | 中文 | 深入 | 中文版插件手册，写一个把 console.log 删除的插件。 |
| [AST Explorer](https://astexplorer.net/) | 在线工具 | English | 入门 | 输入一段代码，切换 parser 对比不同的 AST 结构。 |
| [TypeScript AST Viewer](https://ts-ast-viewer.com/) | 在线工具 | English | 进阶 | 输入类型代码，观察 TS 编译器 AST 节点。 |
| [ESTree 规范](https://github.com/estree/estree) | 规范 | English | 深入 | 查 JavaScript AST 节点定义，写规则时当字典用。 |
| [Acorn](https://github.com/acornjs/acorn) | 源码 | English | 深入 | 读它的解析器入口，理解递归下降解析。 |
| [jscodeshift](https://github.com/facebook/jscodeshift) | 工具 | English | 进阶 | 写一个 codemod，批量替换项目里的废弃 API。 |
| [core-js](https://github.com/zloirock/core-js) | 源码 | English | 进阶 | 了解 polyfill 库的组织方式，与 preset-env 的 useBuiltIns 对照。 |
| [Browserslist](https://github.com/browserslist/browserslist) | 工具文档 | English | 入门 | 读查询语法，用 npx browserslist 查看当前配置命中的浏览器。 |
| [Browserslist 在线查询](https://browsersl.ist/) | 在线工具 | English | 入门 | 输入查询语句查看浏览器覆盖率。 |
| [SWC 文档](https://swc.rs/docs/getting-started) | 官方文档 | English | 进阶 | Rust 编写的编译器，了解转译工具链的新趋势。 |
| [SWC 配置](https://swc.rs/docs/configuration/swcrc) | 官方文档 | English | 进阶 | 写 .swcrc 替换 Babel 配置，对比编译速度。 |
| [Oxc 简介](https://oxc.rs/docs/guide/introduction.html) | 官方文档 | English | 进阶 | 了解解析器、linter、转换器、压缩器的整体设计。 |
| [Oxlint 使用](https://oxc.rs/docs/guide/usage/linter.html) | 官方文档 | English | 进阶 | 在项目里跑 oxlint，与 ESLint 的耗时对比。 |
| [Oxc 博客](https://oxc.rs/blog/) | 官方博客 | English | 深入 | 读性能优化与架构文章，了解 Rust 工具的设计思路。 |
| [Biome 入门](https://biomejs.dev/guides/getting-started/) | 官方文档 | English | 入门 | 用单一工具完成格式化与检查，从 Prettier 迁移一次。 |
| [Source Map 可视化](https://evanw.github.io/source-map-visualization/) | 在线工具 | English | 进阶 | 上传产物与 map，观察映射关系，理解线上报错还原。 |

## 包管理、Monorepo 与发布

!!! tip "这一组怎么学"
    第 1 步：读 pnpm 动机与工作区，搭一个含两个包的 workspace（约 3 小时）。第 2 步：用 Turborepo 或 Nx 给它加任务缓存（约 3 小时）。第 3 步：用 Changesets 完成一次版本管理与发布演练，并用 publint 检查包的导出配置。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [pnpm 文档](https://pnpm.io/zh/motivation) | 官方文档 | 中文 | 入门 | 讲清内容寻址存储与硬链接，面试常问的 pnpm 原理。 |
| [pnpm 工作区（中文）](https://pnpm.io/zh/workspaces) | 官方文档 | 中文 | 进阶 | 建两个包并用 workspace 协议互相引用。 |
| [pnpm 目录 catalogs](https://pnpm.io/catalogs) | 官方文档 | English | 进阶 | 用 catalog 统一多个包的依赖版本。 |
| [pnpm-workspace.yaml 配置](https://pnpm.io/pnpm-workspace_yaml) | 官方参考 | English | 进阶 | 查配置项，核对自己项目的写法。 |
| [Yarn 入门](https://yarnpkg.com/getting-started) | 官方文档 | English | 入门 | 了解 Plug'n'Play 与 pnpm 的取舍区别。 |
| [npm 文档](https://docs.npmjs.com/) | 官方文档 | English | 入门 | package.json、版本语义、scripts 的官方说明。 |
| [package.json 字段说明](https://docs.npmjs.com/cli/v10/configuring-npm/package-json) | 官方参考 | English | 进阶 | 重点读 exports、main、types、files 几项并对照自己的库。 |
| [Node.js 包规范](https://nodejs.org/api/packages.html) | 官方文档 | English | 深入 | 读 exports 与条件导出，写出同时支持 ESM 与 CJS 的包。 |
| [npm 来源证明 provenance](https://docs.npmjs.com/generating-provenance-statements) | 官方文档 | English | 进阶 | 在 CI 里发布一个带 provenance 的测试包。 |
| [语义化版本 SemVer](https://semver.org/lang/zh-CN/) | 规范 | 中文 | 入门 | 版本号规则的官方说明，依赖管理必知。 |
| [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) | 规范 | 中文 | 入门 | 提交信息规范，配合自动化发版。 |
| [Changesets](https://github.com/changesets/changesets) | 工具 | English | 进阶 | 在 monorepo 中走一遍 add、version、publish 流程。 |
| [publint](https://publint.dev/) | 在线工具 | English | 进阶 | 输入包名检查 exports 配置问题。 |
| [publint 规则](https://publint.dev/rules) | 参考 | English | 进阶 | 通读规则列表，理解常见打包配置错误。 |
| [Are the Types Wrong](https://arethetypeswrong.github.io/) | 在线工具 | English | 进阶 | 检查包的类型声明在各种模块解析下是否正确。 |
| [Turborepo 文档](https://turbo.build/repo/docs) | 官方文档 | English | 进阶 | Monorepo 任务编排与缓存。 |
| [Turborepo：仓库组织](https://turborepo.com/docs/crafting-your-repository) | 官方文档 | English | 进阶 | 读任务依赖与缓存配置，为自己的 workspace 配 pipeline。 |
| [Nx 入门](https://nx.dev/getting-started/intro) | 官方文档 | English | 进阶 | 体验依赖图与受影响项目运行。 |
| [Nx 心智模型](https://nx.dev/concepts/mental-model) | 官方文档 | English | 进阶 | 读完说明项目图、任务图与缓存之间的关系。 |
| [Lerna 文档](https://lerna.js.org/docs/introduction) | 官方文档 | English | 进阶 | 了解它与 Nx 的关系，判断是否仍有使用场景。 |
| [monorepo.tools](https://monorepo.tools/) | 对比文章 | English | 入门 | 阅读各工具能力对比表，辅助选型。 |
| [knip](https://knip.dev/) | 工具文档 | English | 进阶 | 在项目里运行，清理未使用的依赖、导出与文件。 |
| [Renovate 文档](https://docs.renovatebot.com/) | 官方文档 | English | 进阶 | 为仓库配置分组更新与自动合并规则。 |
| [Dependabot 文档](https://docs.github.com/en/code-security/dependabot) | 官方文档 | English | 入门 | 为仓库开启依赖安全更新。 |

## Node.js 与其他运行时基础

!!! tip "这一组怎么学"
    读 Node.js Learn 的入门与事件循环文章（约 4 小时），再读模块与包发布两部分；用 Bun 或 Deno 重跑同一个脚本，对比启动速度与权限模型。更完整的运行时资料见运行时、WebAssembly 与 Rust 页面。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Node.js Learn](https://nodejs.org/en/learn) | 官方教程 | English | 入门 | 从入门与 npm 文章读起，按目录顺序学。 |
| [Node.js API 文档](https://nodejs.org/api/) | 官方参考 | English | 进阶 | 需要时查 fs、path、stream 的接口与示例。 |
| [Node.js 事件循环](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick) | 官方教程 | English | 进阶 | 自己写打印顺序题验证 nextTick、微任务与 setImmediate。 |
| [Node.js ES 模块](https://nodejs.org/api/esm.html) | 官方文档 | English | 进阶 | 读与 CommonJS 互操作部分，解决 ERR_REQUIRE_ESM 类问题。 |
| [Node.js 安全最佳实践](https://nodejs.org/en/learn/getting-started/security-best-practices) | 官方指南 | English | 进阶 | 对照清单检查自己服务的依赖与输入处理。 |
| [Bun 文档](https://bun.sh/docs) | 官方文档 | English | 入门 | 用 Bun 运行与打包一个小项目，对比 Node。 |
| [Deno 文档](https://docs.deno.com/) | 官方文档 | English | 入门 | 体验权限标志与内置工具链。 |
| [tsx](https://tsx.is/) | 工具文档 | English | 入门 | 用它直接运行 TypeScript 脚本。 |

## 代码质量与规范

!!! tip "这一组怎么学"
    给一个项目依次接入 ESLint、typescript-eslint、Prettier，再用 husky 与 lint-staged 在提交时检查（约 4 小时）。进阶写一条 ESLint 自定义规则。测试工具的详细资料见测试与监控页。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [ESLint 文档](https://eslint.org/docs/latest/) | 官方文档 | English | 入门 | JS/TS 静态检查与规则配置的官方文档。 |
| [ESLint 中文文档](https://zh-hans.eslint.org/docs/latest/) | 官方文档 | 中文 | 入门 | 中文翻译版，配合英文版核对术语。 |
| [ESLint 快速开始](https://eslint.org/docs/latest/use/getting-started) | 官方文档 | English | 入门 | 初始化配置并修复项目里的第一批报错。 |
| [ESLint 配置文件](https://eslint.org/docs/latest/use/configure/configuration-files) | 官方文档 | English | 进阶 | 用 flat config 写出分文件类型的规则配置。 |
| [ESLint 自定义规则教程](https://eslint.org/docs/latest/extend/custom-rule-tutorial) | 官方教程 | English | 深入 | 跟着教程写一条规则并配套测试用例。 |
| [typescript-eslint 入门](https://typescript-eslint.io/getting-started/) | 官方文档 | English | 进阶 | 启用类型感知规则，修复 no-floating-promises 报告。 |
| [Prettier 文档](https://prettier.io/docs/en/) | 官方文档 | English | 入门 | 代码格式化工具官方文档。 |
| [Prettier 设计理念](https://prettier.io/docs/rationale) | 官方文档 | English | 进阶 | 理解为什么它刻意少选项，减少团队风格争论。 |
| [Stylelint 入门](https://stylelint.io/user-guide/get-started) | 官方文档 | English | 入门 | 为 CSS 加规则并接入编辑器。 |
| [husky](https://typicode.github.io/husky/) | 工具文档 | English | 入门 | 配置 pre-commit 钩子运行检查。 |
| [lint-staged](https://github.com/lint-staged/lint-staged) | 工具 | English | 入门 | 只对暂存文件运行 lint 与格式化。 |
| [TypeScript 官方手册](https://www.typescriptlang.org/docs/) | 官方文档 | English | 进阶 | 读 tsconfig 与模块两部分。 |
| [TypeScript 模块解析](https://www.typescriptlang.org/docs/handbook/modules/introduction.html) | 官方文档 | English | 进阶 | 弄清 moduleResolution 各取值对应的场景。 |
| [Vitest 文档](https://cn.vitest.dev/) | 官方文档 | 中文 | 入门 | Vite 生态的单测框架中文文档。 |
| [Jest 文档](https://jestjs.io/zh-Hans/docs/getting-started) | 官方文档 | 中文 | 入门 | 最广泛使用的 JS 测试框架中文文档。 |
| [Playwright 文档](https://playwright.dev/docs/intro) | 官方文档 | English | 进阶 | 跨浏览器端到端测试官方文档。 |
| [Testing Library](https://testing-library.com/docs/) | 官方文档 | English | 进阶 | 以用户行为为导向的组件测试理念与 API。 |

## Git 与 CI/CD

!!! tip "这一组怎么学"
    先用 Learn Git Branching 通关主要关卡（约 3 小时），再读 Pro Git 第 2、3、7 章。CI 部分：给自己的项目写一个跑 lint、测试、构建的 GitHub Actions 工作流（约 3 小时），再读安全加固文档。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Pro Git 中文版](https://git-scm.com/book/zh/v2) | 在线书籍 | 中文 | 入门 | 重点读分支、重写历史、Git 内部原理，边读边在命令行实验。 |
| [Pro Git 英文版](https://git-scm.com/book/en/v2) | 在线书籍 | English | 入门 | 作为中文版的对照与最新版本参考。 |
| [Learn Git Branching 中文](https://learngitbranching.js.org/?locale=zh_CN) | 交互教程 | 中文 | 入门 | 可视化通关 rebase、cherry-pick 等关卡。 |
| [Git 官方命令文档](https://git-scm.com/docs) | 官方参考 | English | 进阶 | 遇到不熟的命令先读 DESCRIPTION 与 EXAMPLES 两节。 |
| [Atlassian Git 教程](https://www.atlassian.com/git/tutorials) | 教程 | English | 入门 | 读工作流对比文章，理解 Git Flow 与主干开发的区别。 |
| [Trunk Based Development](https://trunkbaseddevelopment.com/) | 方法论 | English | 进阶 | 读短生命周期分支与功能开关，评估团队是否适用。 |
| [GitHub Actions 文档](https://docs.github.com/zh/actions) | 官方文档 | 中文 | 入门 | 前端 CI/CD 最常用的平台之一，官方中文文档。 |
| [理解 GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions) | 官方文档 | English | 入门 | 弄清 workflow、job、step、runner 的关系。 |
| [Actions：构建与测试 Node.js](https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-nodejs) | 官方教程 | English | 入门 | 照示例写前端项目 CI，加上依赖缓存与矩阵构建。 |
| [Actions 安全加固](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions) | 官方指南 | English | 进阶 | 固定第三方 action 版本、最小化 token 权限。 |
| [Docker 入门](https://docs.docker.com/get-started/) | 官方文档 | English | 入门 | 把一个前端项目打包成镜像并运行容器。 |
| [Docker 构建最佳实践](https://docs.docker.com/build/building/best-practices/) | 官方指南 | English | 进阶 | 用多阶段构建缩小前端镜像体积。 |
| [Dockerfile 参考](https://docs.docker.com/reference/dockerfile/) | 官方参考 | English | 进阶 | 查指令语义，核对自己 Dockerfile 的缓存层顺序。 |
