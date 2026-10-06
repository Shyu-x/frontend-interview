---
title: TypeScript 概览
description: TypeScript 类型系统与高频面试题总览：学习路径与各专题页面。
tags:
  - typescript
date: 2026-05-17
---

# TypeScript 概览

> TypeScript 是 JavaScript 的超集，为大型项目提供类型安全。本栏目覆盖 TypeScript 核心概念与高频面试题。

## 1. 范围与用法

从类型基础出发，依次学习接口与泛型、高级类型体操、类型兼容性，最后是工程实践。建议先掌握 [JavaScript 栏目](../js/index.md) 中的语言基础。

## 2. 学习路径

1. [TypeScript 基础与类型](basics.md)
2. [接口、类型别名与泛型](generics.md)
3. [高级类型与工具类型](advanced-types.md)
4. [协变逆变与类型兼容](type-compatibility.md)
5. [枚举、声明合并与声明文件](enums-declarations.md)
6. [框架集成与编译性能](frameworks-performance.md)

## 3. 页面一览

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [TypeScript 基础与类型](basics.md) | 类型注解、any/unknown/never/void | 基础 |
| [接口、类型别名与泛型](generics.md) | interface vs type、泛型与约束 | 基础 |
| [高级类型与工具类型](advanced-types.md) | keyof/infer、条件类型、映射类型、Utility Types | 进阶 |
| [协变逆变与类型兼容](type-compatibility.md) | 协变与逆变、类型守卫、as const/satisfies | 高级 |
| [枚举、声明合并与声明文件](enums-declarations.md) | enum、声明合并、d.ts、大型项目实践 | 进阶 |
| [框架集成与编译性能](frameworks-performance.md) | Vue/React 中的 TS、编译性能优化 | 进阶 |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [TypeScript 官方手册](https://www.typescriptlang.org/docs/) | 官方手册，是理解 tsconfig 与模块行为的基准文档。 | 先读 tsconfig 常用选项，再读模块章节；读完给自己项目写一份带注释的最小配置。 |
| [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) | 官方入门主线，语法与类型系统覆盖最全且示例可验证。 | 按顺序读完基础部分，每篇在 Playground 改写示例，再用类型标注重写一段 JS。 |
| [TypeScript 模块解析](https://www.typescriptlang.org/docs/handbook/modules/introduction.html) | 讲清 moduleResolution 各取值的差异，解释模块找不到的根因。 | 带着“为什么 import 报错”读各取值对照，切换配置验证解析结果。 |
| [TypeScript Cheat Sheets](https://www.typescriptlang.org/cheatsheets/) | 类型与常用写法速查表，适合写作时随手对照。 | 先通览一遍建立索引；写代码遇到陌生写法就回查对应条目并当场试用。 |
| [TypeScript Wiki：性能](https://github.com/microsoft/TypeScript/wiki/Performance) | 官方性能指南，解释类型检查为何变慢及如何诊断。 | 读诊断方法与常见瓶颈；读完用 tsc --extendedDiagnostics 跑一次自己的项目。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [TypeScript Playground](https://www.typescriptlang.org/play) | 官方在线环境，能即时看到类型推导与编译输出。 | 把遇到的类型问题做成最小复现贴进去，对比推导结果后再改回项目。 |
| [TypeScript AST Viewer](https://ts-ast-viewer.com/) | 把代码映射成 AST 节点，直观看到编译器的处理视角。 | 输入一段类型声明，对照节点树逐步理解，再反过来解释一次类型推导。 |
| [tsx](https://tsx.is/) | 最省事地直接运行 TS 脚本，快速验证语法与类型。 | 用它跑几个 .ts 小脚本，与 tsc 编译后再运行的流程对比一次。 |
| [Crafting Interpreters](https://craftinginterpreters.com/) | 用 TS 实现解释器，把类型系统用到真实项目里。 | 只做第一部分词法与语法分析，每章提交一次，类型报错先自己排查再查资料。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [TypeScript 入门教程（xcatliu）](https://ts.xcatliu.com/) | 中文系统教程，适合零基础按章节补齐语法。 | 按章节顺序学完，随后把一个小 JS 项目迁移到 TS，记录迁移中的坑。 |
| [Effective TypeScript（第 2 版）](https://effectivetypescript.com/) | 每条建议都是可落地的小重构，能纠正常见误用。 | 挑类型收窄、泛型等条目精读，每读完一条就在自己代码里找一处应用。 |
| [Total TypeScript Essentials](https://www.totaltypescript.com/books/total-typescript-essentials) | 练习驱动，逼着动手写类型而不是只看懂。 | 完成每章配套练习再进入下一章，卡住先看提示再回看讲解。 |

