---
title: 枚举、声明合并与声明文件
description: 讲解枚举与声明合并、d.ts 声明文件，以及提升大型项目类型体验的实践。
tags:
  - typescript
date: 2026-05-17
---

# 枚举、声明合并与声明文件

## 1. 枚举与声明合并

```typescript
// enum：不推荐使用的原因：
// 1. 编译后产生额外代码（运行时对象）
// 2. 字符串枚举不能反向映射
// 3. 增加打包体积
// 4. 不能tree shaking（enum是单例，always real）

enum Status { Pending, Active, Done }
// 编译后：
// var Status = { 0: "Pending", 1: "Active", 2: "Done", Pending: 0, Active: 1, Done: 2 }
// 运行时对象占用内存，且不可被tree shaking

// const enum：更好的选择（编译时内联）
const enum StatusConst { Pending, Active, Done }
function getStatus(s: StatusConst) {}
getStatus(StatusConst.Pending); // 编译后：getStatus(0 /* Pending */)
// 内联后没有运行时对象，无额外代码
// 但const enum不能通过值访问（StatusConst[0]会报错）

// 推荐：使用联合类型 + const对象
const STATUS = {
  Pending: "pending",
  Active: "active",
  Done: "done"
} as const;
type StatusValue = typeof STATUS[keyof typeof STATUS];
// = "pending" | "active" | "done"
function getStatusConst(s: StatusValue) {}

// 或者使用字面量联合类型：
type Direction = "up" | "down" | "left" | "right";

// 声明合并：同名interface自动合并
interface A { x: number; }
interface A { y: number; }
// 等价于：interface A { x: number; y: number; }

// namespace（已过时）：
// 早期TS用namespace组织代码，现已被ES6 module取代
// 仍然需要了解：declare global / declare module
// 用于扩展全局类型或模块类型
declare global {
  interface Window { myPlugin: any; }
}
// 不需要在模块中export，直接在全局添加

// declaration merging应用：
// 扩展第三方库的接口
interface Window {
  ga: Function;
}
```

## 2. 声明文件与 d.ts

```typescript
// .d.ts文件：类型声明文件，供TS编译器读取
// 不包含运行时代码

// 常见场景：
// 1. 为JS库写类型声明（社区@types）
// 2. 为自己的模块提供类型
// 3. 全局声明

// index.d.ts（模块声明）：
// src/index.ts
export function add(a: number, b: number): number { return a + b; }
// 编译后自动生成 dist/index.d.ts

// 手写.d.ts（没有.ts源码时）：
declare module "my-lib" {
  export function greet(name: string): string;
  export const VERSION: string;
}

// 环境声明（无实现）：
declare const $: (selector: string) => HTMLElement;
declare function fetch(url: string): Promise<any>;
declare class Vue {}

// declare关键字：
// declare var, declare function, declare class, declare module
// 告诉TS编译器"这些存在，你不用管实现"

// 常见全局声明：
declare namespace NodeJS {
  interface ProcessEnv { NODE_ENV: "development" | "production"; }
}

// 配合tsconfig：
// "include": ["src", "types/**/*.d.ts"]
// "typeRoots": ["./node_modules/@types", "./types"]
```

## 3. TS 提升大型项目体验

```typescript
// TS如何在大型项目中提升体验：

// 1. 智能提示与自动补全
// - IDE能显示类型、属性、方法签名
// - 减少查阅文档时间
// - 重构时自动更新引用

// 2. 编译期错误发现
// - 很多运行时错误提前到编译期
// - null/undefined检查、类型不匹配
// - 减少线上bug

// 3. 代码即文档
// - 类型签名本身就是接口文档
// - 参数/返回值类型清晰可见
// - 新成员快速理解代码

// 4. 重构安全
// - 改函数签名，编译器告诉你哪些调用需要更新
// - rename符号时自动更新所有引用
// - 类型变更全量报错

// 5. API边界清晰
// - 通过interface/type明确契约
// - 团队成员按契约编程
// - 模块解耦

// 实战技巧：
// 1. strict: true 开启所有严格检查
// 2. noImplicitAny: true 不允许隐式any
// 3. strictNullChecks: true 让null/undefined无处遁形
// 4. 使用unknown代替any
// 5. 泛型抽象重复逻辑，减少类型重复
```
