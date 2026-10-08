---
title: 高级类型与工具类型
description: 讲解 keyof、infer、条件类型、映射类型，以及 Utility Types 的实现原理。
tags:
  - typescript
date: 2026-05-17
---

# 高级类型与工具类型

## 1. 高级类型

### 1.1 keyof / infer

```typescript
// keyof：获取类型的所有键
interface Person { name: string; age: number; }
type PersonKeys = keyof Person; // "name" | "age"

// infer：条件类型中推断类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type Fn = (a: number) => string;
type FnReturn = ReturnType<Fn>; // string

// infer 应用：提取函数参数类型
type Parameters<T> = T extends (...args: infer P) => any ? P : never;
type FnParams = Parameters<(a: string, b: number) => void>; // [string, number]

// infer 应用：提取构造器实例类型
type InstanceType<T> = T extends new (...args: any[]) => infer I ? I : never;
class User {}
type UserInstance = InstanceType<typeof User>; // User

// 提取数组元素类型：
type ElementOf<T> = T extends (infer E)[] ? E : never;
type Nums = ElementOf<number[]>; // number

// 提取Promise resolve类型：
type Resolved<T> = T extends Promise<infer V> ? V : T;
type R1 = Resolved<Promise<string>>; // string
type R2 = Resolved<number>;          // number
```

### 1.2 extends 在 TS 中的作用

```typescript
// extends 在TS中有多种含义：

// 1. 类继承
class Animal { eat() {} }
class Dog extends Animal { bark() {} }

// 2. 接口继承
interface A { a: number; }
interface B extends A { b: string; }
// B有 { a: number; b: string; }

// 3. 泛型约束
function fn<T extends { name: string }>(arg: T) {}

// 4. 条件类型
type IsString<T> = T extends string ? true : false;

// 5. 分配式条件类型（分发）
type ToArray<T> = T extends any ? T[] : never;
type StrNumArr = ToArray<string | number>; // string[] | number[]
// 相当于：(string extends any ? string[] : never) | (number extends any ? number[] : never)
// = string[] | number[]

// 阻止分发：用[]包裹
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type NonDist = ToArrayNonDist<string | number>; // (string | number)[]
// 不再分发，包裹成整体处理
```

### 1.3 条件类型

```typescript
// 条件类型：T extends U ? X : Y
type IsString<T> = T extends string ? "yes" : "no";
type A = IsString<"hello">; // "yes"
type B = IsString<123>;     // "no"

// 分布式条件类型：
// 如果T是联合类型，条件会分发到每个成员
type Exclude<T, U> = T extends U ? never : T;
type R1 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"
// 原理：(("a" extends "a" ? never : "a") | ("b" extends "a" ? never : "b") | ("c" extends "a" ? never : "c"))
// = never | "b" | "c" = "b" | "c"

type Extract<T, U> = T extends U ? T : never;
type R2 = Extract<"a" | "b" | "c", "a" | "b">; // "a" | "b"

type NonNullable<T> = T extends null | undefined ? never : T;
type R3 = NonNullable<string | null | undefined>; // string

// 嵌套条件类型：
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// infer实战：
// 从类型中提取信息
type UnpackPromise<T> = T extends Promise<infer U> ? U : T;
type P = UnpackPromise<Promise<string>>; // string

// 组合条件类型实现类型过滤：
type MyPick<T, K> = { [P in K]: T[P] };
```

## 2. mapped type（映射类型）

```typescript
// 映射类型：通过泛型从已有类型派生出新类型

// 基础映射：
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] }; // -? 移除可选

// keyof + 映射 = 遍历属性
type Mapped = { [K in keyof User]: User[K] }; // 等价于 User（复制）

// as 重映射（TS4.1+）：
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};
type UserGetters = Getters<{ name: string; age: number }>;
// = { getName: () => string; getAge: () => number }

// 过滤属性（never）：
type OmitByType<T, U> = { [K in keyof T as T[K] extends U ? never : K]: T[K] };
type OnlyStrings = OmitByType<{ name: string; age: number; flag: boolean }, string>;
// = { name: string }

// 映射类型的分发：
type Nullable<T> = { [K in keyof T]: T[K] | null };
type UserNullable = Nullable<{ name: string; age: number }>;
// = { name: string | null; age: number | null }

// 元组/数组的映射：
type Greet = { [K in "hello" | "world"]: string };
// = { hello: string; world: string }

// 条件映射：
type蔡ype ConditionalPick<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K]
};
```

## 3. Utility Types 实现原理

```typescript
// TS内置的工具类型，每个都可以手写实现

// 1. Partial<T>：全部属性变为可选
type Partial<T> = { [K in keyof T]?: T[K] };
// 实现：遍历T的每个属性，加?变成可选

// 2. Required<T>：全部属性变为必填
type Required<T> = { [K in keyof T]-?: T[K] };
// 实现：-? 移除可选标记

// 3. Readonly<T>：全部属性变为只读
type Readonly<T> = { readonly [K in keyof T]: T[K] };

// 4. Pick<T, K>：从T中选取属性K
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type UserName = Pick<{ name: string; age: number }, "name">;
// = { name: string }

// 5. Omit<T, K>：从T中排除属性K
type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
// 实现：排除keyof T中属于K的，剩下的用Pick取
type UserNoAge = Omit<{ name: string; age: number }, "age">;
// = { name: string }

// 6. Exclude<T, U>：从T中排除可分配给U的类型
type Exclude<T, U> = T extends U ? never : T;
type A = Exclude<"a" | "b" | "c", "a">; // "b" | "c"

// 7. Extract<T, U>：从T中提取可分配给U的类型
type Extract<T, U> = T extends U ? T : never;
type B = Extract<"a" | "b", "a" | "c">; // "a"

// 8. Record<K, V>：构造键类型K到值类型V的对象
type Record<K extends keyof any, V> = { [P in K]: V };
type StrNumMap = Record<string, number>;
// = { [key: string]: number }

// 9. ReturnType<T>：提取函数返回值类型
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any;

// 10. Parameters<T>：提取函数参数类型为元组
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;

// 11. NonNullable<T>：排除null和undefined
type NonNullable<T> = T extends null | undefined ? never : T;

// 12. InstanceType<T>：获取构造器实例类型
type InstanceType<T extends new (...args: any) => any> =
  T extends new (...args: any) => infer C ? C : any;

// 13. ThisParameterType / OmitThisParameter
type ThisParameterType<T> =
  T extends (this: infer U, ...args: any) => any ? U : never;
type OmitThisParameter<T> =
  T extends (this: infer U, ...args: infer P) => (...args: P) => any
    ? (...args: P) => U
    : T;

// 实战组合：
// 取出函数返回值类型中为Promise的类型
type PromisedReturn<T> = T extends (...args: any[]) => infer R
  ? R extends Promise<infer V> ? V : never
  : never;
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) | 官方工具类型参考，每个都附带源码级实现思路。 | 逐个练 Partial、Exclude 等，用 Playground 看展开结果，再自己重写一遍。 |
| [Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) | 映射类型核心章节，讲修饰符与键重映射。 | 重点读键重映射与 as 子句，实现 Partial、Readonly，思考同态映射的保留规则。 |
| [Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) | 条件类型与 infer 是工具类型实现的关键机制。 | 手写 Exclude 与 ReturnType，验证 infer 与分布式条件类型的行为。 |
| [Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html) | keyof、typeof、索引访问是读懂映射类型的前置知识。 | 按序练习三者，再组合成一个工具类型，体会类型层的取值方式。 |
| [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) | 理清对象类型、索引签名与 interface 扩展的差别。 | 读索引签名与扩展小节，各写一个适用场景，为映射改造对象类型选型。 |
| [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) | 基础类型与泛型写法的地基，读懂高级类型的前提。 | 快速通读，给一段无类型 JS 补全注解，注意泛型约束与联合类型写法。 |
| [MDN JavaScript 模块](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) | 理解模块语义，才能看懂 .d.ts 与类型导出行为。 | 写 type=module 示例，对比 CommonJS，思考类型声明文件如何随模块解析生效。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Are the Types Wrong](https://arethetypeswrong.github.io/) | 实测类型声明在各模块解析下是否真的可用。 | 拿自己发布的类型包跑一遍，按报告修正 exports 与 types 字段配置。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格 | Pick / Omit 派生视图类型，Record 约束列定义 | TypeScript + React + 虚拟滚动表格 | 类型只保证字段对齐，行数压力靠虚拟滚动解决 |
| 低端安卓的首屏列表 | Pick + `as const` 派生列表 DTO | TypeScript + fetch + 服务端字段白名单 | 类型不改变运行时体积，字段清单要前后端共用 |
| 多人协作白板 | 判别联合 + 映射类型生成处理器表 | TypeScript + WebSocket + OT 或 CRDT 库 | 新增事件类型必须让编译期报错，别用索引签名兜底 |
| 长表单草稿保存 | Partial 与 Required 组合 | TypeScript + React Hook Form | 草稿允许缺字段，提交入口用 Required 收口 |
| 设计系统组件 props | `ComponentProps` 搭配 Omit 覆盖原生属性 | React + TypeScript | 覆盖属性时要保留 ref 转发链路 |
| 权限接口的角色判断 | Exclude / Extract 裁剪角色联合 | TypeScript + Node 服务端 | 类型只在编译期拦截，运行时要再算一次 |
| 跨端 API 客户端 | ReturnType 与 Awaited 推导响应类型 | tRPC 或 OpenAPI 生成器 | 生成文件进 CI，手改的部分下次生成会被覆盖 |
| 埋点事件上报 | 映射类型 + `as const` 从常量表派生事件名 | TypeScript + 自建上报 SDK | 事件名改动要与后端同步，保持单一来源 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：后台列表页要渲染上万行用户数据，列有十几列，前后端字段名靠口头对齐。字段改一次名，线上就出现空白单元格，排查要翻两个仓库。

**怎么用本页知识解决**：思路是让视图类型从后端模型派生，列定义被 Record 约束，漏字段在编译期暴露。

```ts
interface UserRow {
  id: string; name: string; email: string;
  lastLoginAt: number; avatarUrl: string; department: string;
}

// 表格只展示这几列，用 Pick 从后端模型裁出视图类型
type TableRow = Pick<UserRow, 'id' | 'name' | 'department' | 'lastLoginAt'>;
// 列表接口不返回头像，用 Omit 去掉，避免前后端字段对不上
type ListRow = Omit<TableRow, 'lastLoginAt'> & { lastLoginText: string };
// 筛选条件用 Partial，用户只填其中几个
type Filters = Partial<Pick<UserRow, 'name' | 'department'>>;
// 列定义用 Record，新增列时漏写会在编译期报错
const columns: Record<keyof ListRow, { title: string; width: number }> = {
  id: { title: 'ID', width: 120 },
  name: { title: '姓名', width: 160 },
  department: { title: '部门', width: 160 },
  lastLoginText: { title: '最近登录', width: 180 },
};
```

- `TableRow` 由 `Pick` 得到，后端新增字段不会自动流入表格，视图范围被写死。
- `ListRow` 用 `Omit` 删掉时间戳，换成预格式化的文本字段，渲染层不用再写格式化逻辑。
- `Filters` 用 `Partial`，调用方只传填写过的筛选项。
- `columns` 的键类型是 `keyof ListRow`，删列或改名时这个对象会立刻报错。

**怎么度量收益**：指标是类型相关缺陷数与列定义漏写次数。测量方法：CI 里跑 `tsc --noEmit` 统计错误条数，用 `tsc --extendedDiagnostics` 看类型检查耗时；线上在错误监控里按“读取 undefined 属性”分类统计条数。

**什么时候不该用**：

- 列由后端配置下发、前端运行时才知道列名时，用 Record 穷举会让每次配置变更都改类型。
- 列表只有 3 列且长期不改动时，引入派生类型只增加一层跳转。

#### 场景 2：低端安卓的首屏列表

**业务背景**：低端安卓机型上，首屏列表接口返回整行商品的完整字段，序列化与传输都占时间。页面要在弱网下尽快画出首屏可见区域。

**怎么用本页知识解决**：思路是让请求字段清单和响应类型来自同一份常量，裁剪动作在运行时执行，类型在编译期对齐。

```ts
// 首屏只请求这几个字段，用 as const 固定字段名
const LIST_FIELDS = ['id', 'name', 'price'] as const;
type ListField = typeof LIST_FIELDS[number];

// 从完整商品模型裁出列表模型，字段名写错会编译失败
type ListItem = Pick<Product, ListField>;

// 运行时按同一份字段清单裁剪响应，请求与类型共享一处来源
function pickListItem(raw: Product): ListItem {
  return Object.fromEntries(
    LIST_FIELDS.map((k) => [k, raw[k]]),
  ) as ListItem;
}
```

- `LIST_FIELDS` 是运行时数组，直接用于拼接请求参数或裁剪响应对象。
- `ListField` 由 `typeof LIST_FIELDS[number]` 得到，字段名改动时类型同步更新。
- `Pick<Product, ListField>` 保证裁剪结果与商品模型对得上，不会造出模型里没有的字段。
- 请求参数和 `pickListItem` 共用同一份数组，两边不会各自漂移。

**怎么度量收益**：指标是首屏 LCP 与接口响应的传输体积。测量方法：Chrome DevTools Network 面板读单次响应的 transferred 值；用 `PerformanceObserver` 订阅 `largest-contentful-paint` 取 LCP；在 Network 面板把节流设为 Slow 4G 复现弱网。

**什么时候不该用**：

- 详情页需要完整字段时，裁剪会让后续交互再发一次请求。
- 服务端已经按查询语句返回字段时，前端再裁一次是重复劳动。

#### 场景 3：多人协作白板

**业务背景**：同一块白板可能有几十个协作者，远端事件按到达顺序分发到对应处理器。新增一种事件类型时容易漏掉某处分支，事件被静默丢弃。

**怎么用本页知识解决**：思路是先用判别联合描述事件，再用映射类型把每个 kind 映射到处理器，键漏写直接报错。

```ts
type DrawEvent =
  | { kind: 'stroke'; points: number[] }
  | { kind: 'erase'; ids: string[] }
  | { kind: 'clear' };

// 用映射类型把每个 kind 映射到一个处理器，漏写一种就编译失败
type HandlerMap = { [K in DrawEvent['kind']]: (e: Extract<DrawEvent, { kind: K }>) => void };

const handlers: HandlerMap = {
  stroke: (e) => applyStroke(e.points),  // e 收窄为 stroke 事件
  erase: (e) => applyErase(e.ids),       // 不需要手动断言类型
  clear: () => applyClear(),
};

// 按 kind 取出处理器；这里的断言集中在一处，便于审阅
function dispatch(evt: DrawEvent) {
  (handlers[evt.kind] as (e: DrawEvent) => void)(evt);
}

// 回放逻辑不处理 clear，用 Exclude 取出子集
type ReplayEvent = Exclude<DrawEvent, { kind: 'clear' }>;
```

- `HandlerMap` 的键来自 `DrawEvent['kind']`，新增事件类型时 `handlers` 立刻报缺少键。
- 处理器参数由 `Extract` 收窄，写 `e.points` 时编辑器能给到提示。
- 断言只保留在 `dispatch` 一处，后续审查范围可控。
- `ReplayEvent` 用 `Exclude` 得到，回放函数的入参不必再判断 `clear`。

**怎么度量收益**：指标是事件漏处理次数与单批事件处理耗时。测量方法：对每种 kind 各造一条事件跑单元测试，断言对应处理器被调用；用 `PerformanceObserver` 订阅 `longtask` 条目，统计超过 50ms 的任务条数。

**什么时候不该用**：

- 事件来自第三方且 kind 是开放字符串时，穷举映射会频繁编译失败。
- 只有两种事件且分发逻辑只有一行时，映射表增加阅读成本。

### 行业先进实践

标准工具类型拆分视图模型（出处：TypeScript 官方文档 Utility Types）
官方文档把 `Pick`、`Omit`、`Partial`、`Required`、`Record` 列为标准工具类型，并给出它们与 `keyof` 的配合方式。做法是先定义完整领域模型，再用工具类型裁出各接口的视图模型，字段改名时下游会报错。借鉴方式：把领域模型放共享包，视图类型按接口就近定义。

从校验 schema 反向推导类型（出处：Zod 官方文档）
Zod 支持用 `z.infer` 从 schema 推导出静态类型，运行时校验与编译期类型共用一处定义。做法是接口入参先写 schema，再让处理函数的参数类型从 schema 推导，避免手写两份。借鉴方式：把对外接口的 schema 放共享包，前端表单与服务端校验同时引用。

由数据库 schema 生成客户端类型（出处：Prisma 官方文档）
Prisma Client 根据 schema 文件生成带类型的查询方法，查询结果类型随 schema 变化。做法是把数据库结构当唯一来源，模型改动后重新生成，调用处的类型自动更新。借鉴方式：生成步骤进 CI，提交前检查生成结果是否有未同步的差异。

从服务端路由类型推导客户端调用（出处：tRPC 官方文档）
tRPC 让客户端从服务端 router 的类型推导出调用签名，路径与入参写错在编辑器里就能看到。做法是不手写接口类型声明，改动服务端过程后客户端立刻暴露不兼容处。借鉴方式：单体仓库内部接口可以走这条路线，对外接口仍需单独维护契约。

用 `satisfies` 在保留字面量类型的同时做结构校验（出处：TypeScript 官方发布说明）
`satisfies` 让表达式在满足目标类型的同时保留更窄的推导结果，常用于配置对象与常量表。做法是配置对象加 `satisfies` 而不是类型注解，取值时字面量类型不丢失。需核对官方文档：确认当前项目使用的 TypeScript 版本是否已支持 `satisfies`，以及团队编译器版本下限。

### 从学到用：落地路线

第 1 步：试点。挑一个字段少、改动频率低的列表页，只把该页的视图类型改为从领域模型派生。验收标准：该页的类型定义处能指到领域模型，且 `tsc --noEmit` 无新增错误。

第 2 步：验证。在 CI 里加类型检查与生成步骤，记录检查耗时与错误条数作为基线。验收标准：连续两次构建的检查耗时波动在可接受范围，错误条数为 0。

第 3 步：推广。把领域模型与常量表抽到共享包，其余列表页和事件上报按同一写法改造。验收标准：共享包被两个以上的应用引用，且各应用不再各自声明重复字段。

第 4 步：防回退。加 ESLint 规则限制 `any` 与索引签名兜底，把生成步骤接入流水线。验收标准：CI 上出现 `any` 或未重新生成的产物时构建失败。

### 动手作业

**目标**：给一个用户列表页做类型驱动的列配置与筛选条件，并让筛选变更事件的上报字段与列定义来自同一份类型。

**步骤**：

1. 定义领域模型 `User`，至少含 6 个字段，类型互不相同。
2. 用 `Pick` 裁出列表视图类型 `ListRow`，用 `Omit` 裁出详情视图类型。
3. 用 `Partial<Pick<User, ...>>` 定义筛选条件类型 `Filters`。
4. 用 `Record<keyof ListRow, { title: string; width: number }>` 写列配置。
5. 定义判别联合 `FilterEvent`，用映射类型写成 `HandlerMap` 并实现各处理器。
6. 写一个 `dispatch` 函数按 `kind` 分发，断言集中在一处。
7. 在 CI 配置里加入 `tsc --noEmit` 与 `tsc --extendedDiagnostics`。

**验收标准**：

- 给 `ListRow` 删掉一个字段后，列配置对象在编译期报错并指到具体键。
- 给 `FilterEvent` 新增一种 kind 后，`HandlerMap` 实现处报缺少键。
- 各处理器参数不需要手写类型断言即可访问该事件的独有字段。
- `tsc --noEmit` 输出为 0 条错误。
- `tsc --extendedDiagnostics` 能打印类型实例化数量，作为后续改动对比的基线。

