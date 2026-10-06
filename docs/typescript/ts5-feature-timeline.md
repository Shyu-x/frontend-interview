---
title: "TypeScript 5.x 特性时间线（5.0–5.9）"
description: "逐版本梳理 5.x 全部重要变化"
---

# TypeScript 5.x 特性时间线（5.0–5.9）

!!! abstract "核心结论"
- 5.0 是一次"标准化"大版本：标准装饰器、const 类型参数、bundler 解析与 verbatimModuleSyntax 同时落地，编译器向 ECMAScript 提案与打包器生态对齐。
- 5.2–5.3 把 TC39 的显式资源管理与 import attributes 纳入类型系统，运行时语义（dispose 顺序、模块加载属性）成为类型检查的一部分。
- 5.4–5.5 是推理能力高峰：NoInfer 阻断推断、SCC 控制流分析推导类型谓词、isolatedDeclarations 与正则语法校验直击工程痛点。
- 5.6–5.8 转向"运行时代际协同"：Iterator helper 类型、相对扩展名重写、Node 原生类型剥离与 erasableSyntaxOnly 让 TS 更接近"可被运行时直接消费"。
- 5.9 继续锁定 Node 模块目标（node20）并引入 import defer（需核对发行说明）；凡涉及版本归属的细节，以各版本官方发行说明为准。

```mermaid
flowchart LR
  V50["5.0 装饰器/const 类型参数/bundler/verbatim"] --> V51["5.1 getter/setter 放宽"]
  V51 --> V52["5.2 using/装饰器元数据"]
  V52 --> V53["5.3 import attributes"]
  V53 --> V54["5.4 NoInfer/module preserve"]
  V54 --> V55["5.5 谓词推断/孤立声明/正则校验"]
  V55 --> V56["5.6 Iterator helpers 类型"]
  V56 --> V57["5.7 相对扩展名重写"]
  V57 --> V58["5.8 erasableSyntaxOnly/node18"]
  V58 --> V59["5.9 import defer/node20"]
```

## 1. 版本地图与验证约定

### 1.1 版本速查表

| 版本 | 关键特性 | 类别 |
|:--|:--|:--|
| 5.0 | 标准装饰器、const 类型参数、enum 全 union、bundler 解析、verbatimModuleSyntax | 语法 + 模块解析 |
| 5.1 | getter/setter 类型放宽、undefined 返回函数检查 | 类型检查 |
| 5.2 | using 声明、decorator metadata、tuple 匿名/命名元素 | 语法 + 运行时 |
| 5.3 | import attributes（with） | 模块系统 |
| 5.4 | NoInfer<T>、module preserve | 类型系统 + 模块 |
| 5.5 | 推断类型谓词、isolatedDeclarations、正则语法检查 | 类型系统 + 工具链 |
| 5.6 | Iterator helpers 类型（IteratorObject 等） | lib/类型 |
| 5.7 | rewriteRelativeImportExtensions | 工具链 |
| 5.8 | erasableSyntaxOnly、module node18、Node 类型剥离协同 | 工具链 + 模块 |
| 5.9 | import defer、module node20（需核对发行说明） | 模块系统 |

### 1.2 验证约定

- 运行期实现统一用 `node:assert/strict` 断言，脚本头部给出运行命令与预期输出。
- 纯类型特性（const 类型参数、satisfies、NoInfer 等）无法在运行时验证，改用类型级断言：`type Assert<T extends true> = T`，配合 `npx tsc --strict --noEmit`，预期退码 0 或注释中标明的诊断。
- 凡是无法 100% 确认的 API 名、错误码、版本归属，文中显式标注"需核对发行说明"。

## 2. TypeScript 5.0：标准化元年

### 2.1 标准装饰器

5.0 默认启用 ECMAScript Stage 3 装饰器（旧行为由 `experimentalDecorators` 保留）。核心差异：只能修饰类与类成员，不能修饰参数；每个装饰器收到 `(value, context)`，`context` 含 `kind/name/addInitializer`；返回非 `undefined` 表示替换。

```ts
// ---- 5.0 之前（experimentalDecorators）----
function logged(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log('[call]', key);
    return original.apply(this, args);
  };
}

// ---- 5.0 起（标准装饰器）----
type MethodCtx = {
  kind: 'method';
  name: string | symbol;
  addInitializer(init: () => void): void;
};

function logged(original: (...args: any[]) => any, ctx: MethodCtx) {
  ctx.addInitializer(() => console.log('[init]', String(ctx.name)));
  return function (this: unknown, ...args: any[]) {
    console.log('[call]', String(ctx.name), args.join(','));
    return original.apply(this, args);
  };
}

class Service {
  @logged
  run(id: number) {
    return `job:${id}`;
  }
}
// 编译验证：npx tsc --strict --target es2022 --noEmit service.ts
```

标准装饰器在编译产物中由 `__esDecorate` 一类 helper 应用：逆序执行装饰器、收集 initializer、按 kind 选择替换语义。下面给出同构的简化实现。

```js
// decorators-runtime.mjs
// 运行环境：node decorators-runtime.mjs（Node 18+）
// 复刻标准装饰器 emit 的关键步骤：传递上下文对象、允许替换、收集 initializer。
import assert from 'node:assert/strict';

function logged(fn, ctx) {
  const original = fn;
  const wrapped = function (...args) {
    console.log('[call]', String(ctx.name), args.join(','));
    return original.apply(this, args);
  };
  ctx.addInitializer(function () {
    console.log('[init] member ready:', String(ctx.name));
  });
  return wrapped; // 返回非 undefined，表示替换原方法
}

function applyMethodDecorators(proto, name, decorators) {
  const descriptor = Object.getOwnPropertyDescriptor(proto, name);
  let current = descriptor.value;
  const initializers = [];
  for (const decorate of decorators) {
    const ctx = {
      kind: 'method',
      name,
      addInitializer(fn) { initializers.push(fn); },
    };
    const replacement = decorate(current, ctx);
    if (replacement !== undefined) current = replacement;
  }
  Object.defineProperty(proto, name, { ...descriptor, value: current });
  // 教学简化：真实 emit 中 initializer 的调用时机由 kind 决定
  for (const init of initializers) init();
}

class Service {
  greet(name) { return `hello ${name}`; }
}
applyMethodDecorators(Service.prototype, 'greet', [logged]);

const svc = new Service();
// 预期输出：
// [init] member ready: greet
// [call] greet ts
// [call] greet next
assert.equal(svc.greet('ts'), 'hello ts');
assert.equal(svc.greet('next'), 'hello next');
```

| 维度 | legacy（experimentalDecorators） | 标准装饰器（5.0 起） |
|:--|:--|:--|
| 作用对象 | 类、方法、属性、参数 | 类、类成员（无参数） |
| 上下文信息 | 按参数位置传 target/key/descriptor | context 对象（kind/name/addInitializer） |
| 类装饰器替换 | 返回构造函数替换 | 返回新类替换 |
| 元数据 | emitDecoratorMetadata + Reflect | 5.2 起 Symbol.metadata |

### 2.2 const 类型参数

`const` 修饰符直接作用于类型参数，把推断切换成"类 const 推断"：原始字面量不再拓宽，对象与数组属性整体加 readonly。

```ts
// ---- 5.0 之前：必须作用于值层面 ----
function pick<T>(value: T): T { return value; }
const raw = { retries: 3, labels: ['a'] };
const before = pick(raw); // retries: number，labels: string[]
const asConst = { retries: 3, labels: ['a'] } as const; // 值层面 as const 才行

// ---- 5.0 起：把 const 语义推到推断阶段 ----
function pickConst<const T>(value: T): T { return value; }
const cfg = pickConst({ retries: 3, labels: ['a'] });

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;

type C1 = Assert<Equal<typeof cfg.retries, 3>>;
type C2 = Assert<Equal<typeof cfg.labels, readonly ['a']>>;
const c1: C1 = true;
const c2: C2 = true;
// 运行环境：npx tsc --strict --noEmit const-type-params.ts
// 预期输出：无输出；退出码 0
```

底层机制：编译器在收集推断候选项时，为标记了 `const` 的类型参数设置一个特殊 inference flag。该 flag 关闭 primitive widening，并对对象/数组候选合成 readonly 修饰。代价是推断结果不可变，后续任何修改都会触发 readonly 检查。

### 2.3 enum 变化

5.0 起所有 enum 都按 union enum 处理，每个成员获得独立字面量类型；跨 enum 的直接比较成为错误。

```ts
// ---- 5.0 之前 ----
enum Status { On = 1, Off = 0 }
enum Toggle { On = 1, Off = 0 }
const s: Status = Status.On;
// s === Toggle.On; 旧行为常见：两个数字 enum 比较可能不报错

// ---- 5.0 起 ----
// s === Toggle.On;  // 错误：两个不同 enum 之间比较
if (s === Status.On) {
  const narrowed: Status.On = s; // 5.0 起成员字面量类型可参与缩窄
}
// 运行环境：npx tsc --strict --noEmit enum-types.ts（取消注释跨 enum 比较后可观察诊断）
```

运行期语义没有变化：数字成员产生正向与反向映射，字符串成员只产生正向映射。下面手写复刻：

```js
// enum-emit-runtime.mjs
// 运行环境：node enum-emit-runtime.mjs（Node 18+）
// 复刻 TS 数字 enum 的核心运行期语义：正向映射 + 数字反向映射 + 自动递增。
import assert from 'node:assert/strict';

function tsEnum(decl) {
  const obj = Object.create(null);
  let nextValue = 0;
  for (const [name, raw] of Object.entries(decl)) {
    const value = raw === undefined ? nextValue : raw;
    obj[name] = value;
    if (typeof value === 'number') obj[value] = name; // 反向映射只发生在数字成员
    nextValue = value + 1;
  }
  return obj;
}

const Color = tsEnum({ Red: undefined, Green: undefined, Blue: 9, Yellow: undefined });
// 预期输出：0 Red 10 Yellow
console.log(Color.Red, Color[0], Color.Yellow, Color[10]);
assert.equal(Color.Red, 0);
assert.equal(Color[0], 'Red');
assert.equal(Color.Green, 1);
assert.equal(Color.Yellow, 10); // Blue=9 后自动递增
assert.equal(Color[10], 'Yellow');
```

### 2.4 --moduleResolution bundler

`bundler` 是 TS 5.0 新增的解析策略，专为打包器设计：既遵循 Node ESM 的 package.json `exports`/`imports`，又允许相对导入省略扩展名（扩展名解析交给打包期）。它要求 `module` 为 `esnext` 或 `preserve`，文件格式是"打包器中立"的。

```ts
// ---- 5.0 之前：node16/nodenext 强制 ESM 相对导入携带扩展名 ----
import { parse } from './parse.js'; // 作者必须手写 .js
import { pkg } from 'my-lib';        // exports 生效

// ---- 5.0 起：bundler 允许省略扩展名，同时保留 exports 解析 ----
import { parse } from './parse';     // 省略扩展名合法
import { pkg } from 'my-lib';        // exports 照常生效
```

下面实现一个教学用解析器，体现 bundler 的两条关键规则：相对路径扩展名探测 + 包 exports 的条件/通配符匹配。

```js
// bundler-resolver.mjs
// 运行环境：node bundler-resolver.mjs（Node 18+）
import assert from 'node:assert/strict';
import path from 'node:path';

function pickCondition(target) {
  if (typeof target === 'string') return target;
  if (target && typeof target === 'object') {
    for (const c of ['import', 'module', 'default', 'require']) {
      if (target[c] != null) return target[c];
    }
  }
  throw new Error('Invalid exports target');
}

function resolvePackageExports(packageName, spec, exportsMap) {
  const sub = spec === packageName ? '.' : '.' + spec.slice(spec.indexOf('/'));
  if (exportsMap[sub] != null) return pickCondition(exportsMap[sub]);
  for (const key of Object.keys(exportsMap)) {
    const star = key.indexOf('*');
    if (star !== -1) {
      const head = key.slice(0, star);
      const tail = key.slice(star + 1);
      if (sub.startsWith(head) && sub.endsWith(tail)) {
        const mapped = sub.slice(head.length, sub.length - tail.length);
        const target = pickCondition(exportsMap[key]);
        return typeof target === 'string' && target.includes('*') ? target.replace('*', mapped) : target;
      }
    }
  }
  throw new Error(`Package subpath '${sub}' is not exported by ${packageName}`);
}

function resolveBundler(spec, importerDir, opts = {}) {
  if (spec.startsWith('./') || spec.startsWith('../')) {
    const base = path.posix.join(importerDir, spec);
    const exists = opts.exists ?? (() => true);
    for (const ext of ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.js']) {
      if (exists(base + ext)) return base + ext;
    }
    throw new Error(`Cannot resolve '${spec}' from '${importerDir}'`);
  }
  const packageName = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
  return resolvePackageExports(packageName, spec, opts.exports ?? {});
}

const files = new Set(['src/views/parse.ts', 'src/views/list.tsx']);
const exists = (p) => files.has(p);
const exportsMap = {
  '.': { import: './dist/index.mjs', require: './dist/index.cjs' },
  './utils/*': { import: './dist/utils/*.mjs' },
};

// 预期输出：无（以下断言全部通过）
assert.equal(resolveBundler('./parse', 'src/views', { exists }), 'src/views/parse.ts');
assert.equal(resolveBundler('./list', 'src/views', { exists }), 'src/views/list.tsx');
assert.equal(resolveBundler('pkg', '', { exports: exportsMap }), './dist/index.mjs');
assert.equal(resolveBundler('pkg/utils/str', '', { exports: exportsMap }), './dist/utils/str.mjs');
```

### 2.5 verbatimModuleSyntax

该选项让"单文件转译"成为一等公民：只有 `import type`/`export type` 会被彻底擦除，其余 import/export 按书写原样保留。它取代了 `importsNotUsedAsValues` 与 `preserveValueImports` 的组合。

```ts
// ---- 5.0 之前：两个 flag 组合 ----
// "compilerOptions": { "importsNotUsedAsValues": "error", "preserveValueImports": true }
import { Component } from './ui'; // Component 只作类型用时，可能被整条删掉或报错，行为难预测

// ---- 5.0 起：verbatimModuleSyntax 语义单一 ----
import { type Component } from './ui'; // 唯一合法的"仅类型导入"，一定被擦除
import { helper } from './ui';          // 非 type 导入，emit 时原样保留
```

```js
// verbatim-emitter.mjs
// 运行环境：node verbatim-emitter.mjs（Node 18+）
// 复刻导入语句是否保留的决策表。
import assert from 'node:assert/strict';

function decide(importSpec, { verbatim = false } = {}) {
  if (importSpec.onlyType) return 'erase'; // import type 永远擦除
  if (verbatim) return 'keep';              // verbatim：非 type 导入按字面保留
  return importSpec.usedAsValue ? 'keep' : 'erase'; // 传统 importsNotUsedAsValues=remove 行为
}

// 预期输出：无（三个断言全部通过）
assert.equal(decide({ onlyType: true, usedAsValue: true }, { verbatim: true }), 'erase');
assert.equal(decide({ onlyType: false, usedAsValue: false }, { verbatim: true }), 'keep');
assert.equal(decide({ onlyType: false, usedAsValue: false }, { verbatim: false }), 'erase');
```

陷阱提示：`verbatimModuleSyntax` 下，一个"只用作类型"的普通 import 会原样进入 JS 产物，运行时若该绑定不存在就会报错。任何只用于类型位置的名字必须写成 `import type`。

### 2.6 satisfies（4.9 回顾）

`satisfies` 只做一次"表达式类型可赋给目标类型"的检查，不改变表达式的推断结果，也不产生任何运行时代码。

```ts
// ---- 旧写法：注解拓宽；as 双向断言且丢失推导 ----
const red = 0xff0000;
const host = 'localhost';
const withAnnotation: Record<string, string | number> = { red, host }; // red: string | number
const withAs = { red, host } as Record<string, string | number>;        // red: string | number

// ---- satisfies：保留字面量类型，同时校验目标约束 ----
const palette = { red, host } satisfies Record<string, string | number>;

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type T1 = Assert<Equal<typeof palette.red, 0xff0000>>;
type T2 = Assert<Equal<typeof palette.host, 'localhost'>>;
const widened: Record<string, string | number> = palette; // 兼容性成立
// 运行环境：npx tsc --strict --noEmit satisfies.ts
// 预期输出：无输出；退出码 0
```

## 3. TypeScript 5.1：更宽松的对象与函数约束

### 3.1 getter/setter 类型放宽

5.1 允许 getter 与 setter 类型不同，只要 getter 的返回类型可赋给 setter 的参数类型即可（旧规则要求二者"互为关系"，过于严格）。

```ts
// ---- 5.1 之前：getter 与 setter 类型不同即可能报错 ----
class Thing {
  #size = 0;
  get size(): number { return this.#size; }
  set size(value: string | number | boolean) { // 旧版：类型需相同或互为可赋给
    const num = Number(value);
    if (Number.isFinite(num)) this.#size = num;
  }
}

// ---- 5.1 起：getter 返回类型 number 可赋给 setter 参数类型即可 ----
// 上述代码编译通过（需核对发行说明确认精确诊断）
// 运行环境：npx tsc --strict --noEmit accessors.ts
```

### 3.2 其他变化（需核对发行说明）

5.1 还改进了返回 `undefined` 的函数的检查规则，并加入编辑器的 linked editing 体验优化。这些对语言语义影响较小，但面试谈到"5.1 有什么"时应知道它是一个偏向对象模型与编辑器体验的迭代版。

## 4. TypeScript 5.2：显式资源管理与装饰器元数据

### 4.1 using 声明

`using x = expr` 把资源生命周期绑定到词法作用域末尾，退出时按 LIFO 逆序调用 `Symbol.dispose`；`await using` 对应 `Symbol.asyncDispose`。编译目标不支持原生语义时，TS 会生成 try/finally 与 helper。

```ts
// ---- 5.2 之前：手写 try/finally ----
class Lock {
  constructor(public name: string) {}
  release() { console.log('release', this.name); }
}
function withLocksBefore() {
  const a = new Lock('A');
  try {
    const b = new Lock('B');
    try {
      console.log('in scope');
    } finally { b.release(); }
  } finally { a.release(); }
}

// ---- 5.2 起：声明式 RAII ----
class DisposableLock {
  constructor(public name: string) {}
  [Symbol.dispose]() { console.log('release', this.name); }
}
function withLocksAfter() {
  using a = new DisposableLock('A');
  using b = new DisposableLock('B');
  console.log('in scope');
}
// 编译：npx tsc --lib es2022,esnext.disposable --noEmit using.ts
// 退出函数按 LIFO：先 dispose B，再 dispose A
```

下面实现 TS 生成的 dispose helper 的核心算法（资源栈 + LIFO + 异常聚合）：

```js
// disposable-runtime.mjs
// 运行环境：node disposable-runtime.mjs（Node 18+）
// 与 TS emit 的 __addDisposableResource/__disposeResources 同构的教学简化实现。
import assert from 'node:assert/strict';

function __addDisposableResource(env, value, async) {
  env.stack ??= [];
  env.stack.push({ value, dispose: async ? value[Symbol.asyncDispose] : value[Symbol.dispose], async });
}

function __disposeResources(env) {
  const errors = [];
  while (env.stack && env.stack.length) {
    const r = env.stack.pop(); // LIFO：最后声明的资源最先释放
    try {
      const result = r.dispose.call(r.value);
      if (r.async && result && typeof result.then === 'function') {
        result.catch((e) => errors.push(e)); // async dispose 拒绝时聚合
      }
    } catch (e) {
      errors.push(e);
    }
  }
  if (errors.length) {
    const first = errors[0];
    first.suppressed = errors.slice(1); // 后续错误挂在 suppressed 上
    throw first;
  }
}

class Res {
  constructor(name) { this.name = name; }
  [Symbol.dispose]() { console.log('dispose', this.name); }
}
class Throwing {
  [Symbol.dispose]() { throw new Error('boom'); }
}

// 预期输出：dispose B / dispose A
const env1 = {};
__addDisposableResource(env1, new Res('A'), false);
__addDisposableResource(env1, new Res('B'), false);
__disposeResources(env1);

// 异常聚合：Throwing 抛错后继续释放剩余资源
const env2 = {};
__addDisposableResource(env2, new Res('C'), false);
__addDisposableResource(env2, new Throwing(), false);
try {
  __disposeResources(env2);
  assert.fail('应当抛出异常');
} catch (e) {
  // 预期输出：dispose C
  assert.equal(e.message, 'boom');
  assert.deepEqual(e.suppressed, []);
}
```

### 4.2 decorator metadata

5.2 给标准装饰器的 context 增加 `metadata` 字段，落到 `Symbol.metadata` 上，并通过原型链向父类/父装饰器元数据靠拢。

```ts
// 5.2 起：装饰器 context.metadata 可用（需 lib 支持装饰器提案）
type MetaCtx = { kind: 'class'; name: string | undefined; metadata: Record<string, unknown> };
function table(name: string) {
  return (_value: unknown, ctx: MetaCtx) => {
    ctx.metadata = { ...ctx.metadata, table: name }; // 真实语义基于 Symbol.metadata
  };
}
// 运行环境：npx tsc --lib esnext.decorators,esnext --noEmit metadata.ts
```

```js
// metadata-runtime.mjs
// 运行环境：node metadata-runtime.mjs（Node 18+）
// 复刻 Symbol.metadata 的原型链组装：子类元数据继承父类元数据。
import assert from 'node:assert/strict';

const metadataKey = Symbol.metadata;

function buildMetadata(own, parent) {
  const target = Object.create(parent ?? null); // 原型链向上找父元数据
  Object.assign(target, own);
  return target;
}

const parent = { table: 'users' };
const child = buildMetadata({ indexes: ['email'] }, parent);
assert.equal(child.indexes[0], 'email');
assert.equal(child.table, 'users'); // 通过原型链继承
assert.equal(Object.getPrototypeOf(child), parent);
// 预期输出：无（断言全部通过）
```

## 5. TypeScript 5.3：import attributes 与继续增强的收窄

### 5.1 import attributes

TC39 把 import assertions 更名为 import attributes，语法从 `assert` 改为 `with`。TS 5.3 在 bundler/nodenext/esnext 等模块模式下支持该语法，JSON 模块需要 `type: 'json'`。

```ts
// ---- 5.3 之前：import assertions（旧提案名）----
import config from './config.json' assert { type: 'json' };

// ---- 5.3 起：import attributes ----
import config from './config.json' with { type: 'json' };
// Node 运行时支持边界（20.10+ 等）需核对官方文档
```

```js
// import-attributes.mjs
// 运行环境：node import-attributes.mjs（Node 18+）
// 复刻 JSON 模块导入对 attributes 的校验规则。
import assert from 'node:assert/strict';

function loadJsonModule(specifier, attributes) {
  if (specifier.endsWith('.json') && (attributes == null || attributes.type !== 'json')) {
    throw new TypeError(`Module "${specifier}" needs an import attribute of "type: json"`);
  }
  return { source: '{"ok":true}' }; // 教学示意：真实加载由宿主模块加载器执行
}

// 预期输出：无（断言全部通过）
assert.deepEqual(loadJsonModule('./data.json', { type: 'json' }), { source: '{"ok":true}' });
assert.throws(() => loadJsonModule('./data.json', null), /import attribute/);
assert.doesNotThrow(() => loadJsonModule('./data.js', null));
```

### 5.2 switch (true) 收窄（简要）

5.3 允许 `switch (true)` 的每个 case 条件像 if 一样参与类型收窄，减少冗长的 if/else 链。机制上是复用既有 CFA（控制流分析）框架，把 case 表达式视作条件卫士。

## 6. TypeScript 5.4：NoInfer 与模块保真

### 6.1 NoInfer<T>

`NoInfer<T>` 是内置 intrinsic 类型：在可赋给性上等价于 `T`，但在类型推断阶段，它所在的位置不会向目标泛型贡献推断候选。这是用户层类型别名无法精确模拟的（旧 workaround 如 `T & {}` 会改变可赋给语义）。

```ts
// ---- 5.4 之前：第二个参数污染推断 ----
declare function attachBefore<T>(value: T, observer: (v: T) => void): T;
const observe = (v: number) => { void v; };
const nb = attachBefore(42, observe); // T 被推成 number

// ---- 5.4 起：NoInfer 阻断 observer 一侧的推断 ----
declare function attach<T>(value: T, observer: NoInfer<(v: T) => void>): T;
const n = attach(42, observe); // T 只从 value 推断，得到字面量 42

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type C1 = Assert<Equal<typeof n, 42>>;
const c1: C1 = true;
// 运行环境：npx tsc --strict --noEmit noinfer.ts
// 预期输出：无输出；退出码 0
```

### 6.2 --module preserve

5.4 新增 `module: preserve`：emit 阶段原样保留 import/export 与动态 import 语法，让下游（打包器/运行时）决定最终格式。它与 `moduleResolution: bundler` 常见搭配，进一步降低"TS 编译结果被二次处理"的失真。

## 7. TypeScript 5.5：推断类型谓词、孤立声明与正则校验

### 7.1 推断类型谓词

5.5 起，当函数满足"返回 boolean、某个参数在 true 路径被缩窄、false 路径不缩窄"时，TS 会为该参数自动合成 `x is T` 谓词。实现建立在 SCC（control-flow graph）与分析已有收窄事实的框架上：编译器扫描每个 return 路径，把参数收窄事实合并成候选谓词。

```ts
// ---- 5.5 之前 ----
declare const input: unknown[];
function isString(x: unknown) {
  return typeof x === 'string';
}
const before = input.filter(isString); // before: unknown[]（boolean 守卫不收窄）

// ---- 5.5 起 ----
// isString 被推断为 (x: unknown) => x is string
const strings = input.filter(isString); // strings: string[]

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type Check = Assert<Equal<typeof strings, string[]>>;
const ok: Check = true;
// 运行环境：npx tsc --strict --noEmit inferred-predicate.ts
// 预期输出：无输出；退出码 0
```

注意边界：显式写了返回类型（哪怕是 `boolean`）会禁用谓词推断；有多个参数时只会对真正被收窄的那个参数合成谓词；公共库 API 建议显式标注，避免编译器升级悄悄改变导出类型。

### 7.2 isolatedDeclarations

`--isolatedDeclarations` 要求每个文件在不依赖完整程序信息的前提下就能生成 `.d.ts`，因此导出函数/类必须携带足够显式类型标注。其动机是让声明生成可并行化、可单文件化，服务 `api-extractor` 与快速构建流水线。

```ts
// ---- 普通模式：全程序推理允许省略返回类型 ----
export function clamp01(x: number) { return Math.min(1, Math.max(0, x)); }

// ---- 5.5 起：--isolatedDeclarations 下需要显式返回类型 ----
export function clamp01(x: number): number { return Math.min(1, Math.max(0, x)); }
// 运行环境：npx tsc --strict --noEmit --isolatedDeclarations isolated.ts
// 普通模式通过；isolatedDeclarations 模式下，未标注版本产生诊断（错误码需核对）
```

```js
// isolated-declarations-checks.mjs
// 运行环境：node isolated-declarations-checks.mjs（Node 18+）
// 教学子集：复刻 isolatedDeclarations 对"导出函数缺少显式返回类型"的核心检查。
import assert from 'node:assert/strict';

function checkIsolatedDeclaredExports(source) {
  const problems = [];
  const re = /export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const name = m[1];
    const open = source.indexOf('(', m.index);
    const close = source.indexOf(')', open);
    const after = source.slice(close + 1).replace(/^\s+/, '');
    if (after.startsWith('{')) problems.push(`${name}: 缺少显式返回类型`);
  }
  return problems;
}

// 预期输出：无（断言全部通过）
assert.deepEqual(
  checkIsolatedDeclaredExports('export function clamp01(x: number) { return x; }'),
  ['clamp01: 缺少显式返回类型']
);
assert.deepEqual(
  checkIsolatedDeclaredExports('export function clamp01(x: number): number { return x; }'),
  []
);
```

### 7.3 正则语法检查

5.5 内置了 ECMAScript RegExp 语法解析器，不再依赖宿主 JS 引擎对非法正则抛出异常的时机与方式。典型诊断：重复命名捕获组、不成对的括号/字符类、`u` 与 `v` 标志互斥。

```ts
// ---- 5.5 之前：依赖 JS 引擎解析，不同引擎行为可能不一致 ----
const re = /(?<x>a)(?<x>b)/u; // 有些引擎抛 SyntaxError，有些容忍

// ---- 5.5 起：TS 自己按提案文法检查 ----
// /(?<x>a)(?<x>b)/u; // 诊断：重复命名捕获组
// /(a(b)/u;          // 诊断：未闭合捕获组
```

```js
// regex-validator.mjs
// 运行环境：node regex-validator.mjs（Node 18+）
// 复刻 TS 5.5 正则校验的常见规则：标志互斥、括号配对、重复命名分组。
import assert from 'node:assert/strict';

function validateRegexSyntax(source, flags) {
  const errors = [];
  if (flags.includes('u') && flags.includes('v')) errors.push("flags 'u' 与 'v' 互斥");
  let depth = 0, inClass = false, escaped = false;
  for (const ch of source) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '[') inClass = true;
    else if (ch === ']') inClass = false;
    else if (!inClass && ch === '(') depth++;
    else if (!inClass && ch === ')') {
      depth--;
      if (depth < 0) { errors.push('存在未匹配的右括号'); break; }
    }
  }
  if (depth > 0) errors.push('存在未闭合的捕获组');
  const groups = [...source.matchAll(/\(\?<([A-Za-z_$][\w$]*)>/g)].map((m) => m[1]);
  if (new Set(groups).size !== groups.length) errors.push('存在重复的命名捕获组');
  return errors;
}

// 预期输出：无（断言全部通过）
assert.deepEqual(validateRegexSyntax('(?<x>a)(?<x>b)', 'u'), ['存在重复的命名捕获组']);
assert.deepEqual(validateRegexSyntax('(a(b)', 'u'), ['存在未闭合的捕获组']);
assert.deepEqual(validateRegexSyntax('[a-z]', 'uv'), ["flags 'u' 与 'v' 互斥"]);
assert.deepEqual(validateRegexSyntax('a(b)c', 'u'), []);
```

## 8. TypeScript 5.6：Iterator helpers 类型

5.6 按 TC39 iterator helpers 提案补齐了 `IteratorObject`、`ArrayIterator`、`SetIterator`、`MapIterator`、`AsyncIteratorObject` 等类型，并把 `Iterator.prototype.map/filter/take/toArray` 等方法纳入 `esnext` lib。关键语义：helper 返回的是单次消费的惰性迭代器，不是普通数组。

```ts
// iterator-types.ts（需 TS 5.6+）
// 运行环境：npx tsc --lib esnext --strict --noEmit iterator-types.ts
const values: IteratorObject<number> = [1, 2, 3].values();
const mapped: IteratorObject<number> = values.map((x) => x * 2);
const arr: number[] = mapped.filter((x) => x > 2).toArray();
// 预期输出：无输出；退出码 0
```

```js
// iterator-helpers.mjs
// 运行环境：node iterator-helpers.mjs（Node 18+）
// 复刻 Iterator helper 的链式惰性求值：map/filter/take 都返回惰性迭代器。
import assert from 'node:assert/strict';

class HelperIterator {
  constructor(iterable) { this.iterable = iterable; }
  *[Symbol.iterator]() { yield* this.iterable; }
  map(fn) {
    const source = this;
    return new HelperIterator({ *[Symbol.iterator]() { for (const v of source) yield fn(v); } });
  }
  filter(pred) {
    const source = this;
    return new HelperIterator({ *[Symbol.iterator]() { for (const v of source) if (pred(v)) yield v; } });
  }
  take(limit) {
    const source = this;
    return new HelperIterator({ *[Symbol.iterator]() {
      let i = 0;
      for (const v of source) {
        if (i++ >= limit) return; // 惰性：达到数量后停止拉取上游
        yield v;
      }
    } });
  }
  toArray() { return [...this]; }
}
const Iterator_from = (iterable) => new HelperIterator(iterable);

const result = Iterator_from([1, 2, 3, 4, 5])
  .map((x) => x * 10)
  .filter((x) => x >= 20)
  .take(2)
  .toArray();
// 预期输出：[20, 30]
console.log(result);
assert.deepEqual(result, [20, 30]);
assert.deepEqual(Iterator_from('abc').take(2).toArray(), ['a', 'b']);
```

## 9. TypeScript 5.7：相对导入扩展名重写

5.7 的 `--rewriteRelativeImportExtensions` 允许源码写 `.ts/.tsx/.mts/.cts` 的相对路径，在 emit 时映射成 `.js/.js/.mjs/.cjs`。这解决了"node16/nodenext 要求写 .js，但作者心智负担大"的长期矛盾；它只处理相对路径，不碰 bare specifier。

```ts
// ---- 5.7 之前：nodenxt 下必须手写 .js 扩展名 ----
import { helper } from './core.js';

// ---- 5.7 起：源码写 .ts，emit 时自动映射 ----
import { helper } from './core.ts';
// tsconfig（需核对与既有选项的完整约束）：
// "rewriteRelativeImportExtensions": true,
// "allowImportingTsExtensions": true,
// "module": "esnext"
```

```js
// rewrite-extensions.mjs
// 运行环境：node rewrite-extensions.mjs（Node 18+）
// 复刻 relative import/export/dynamic import 的扩展名映射。
import assert from 'node:assert/strict';

function rewriteRelativeImportExtensions(source) {
  const re = /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(\.\.?\/[^'"]*?)(\.(?:m|c)?tsx?)(['"])/g;
  const mapping = { '.ts': '.js', '.tsx': '.js', '.mts': '.mjs', '.cts': '.cjs' };
  return source.replace(re, (_m, prefix, quote, base, ext, close) => {
    return `${prefix}${quote}${base}${mapping[ext]}${close}`;
  });
}

const src = [
  "import def from './core.ts';",
  "export { helper } from './util.mts';",
  "import('./lazy.cts').then(() => {});",
  "import './init.ts';",
].join('\n');
const expected = [
  "import def from './core.js';",
  "export { helper } from './util.mjs';",
  "import('./lazy.cjs').then(() => {});",
  "import './init.js';",
].join('\n');

assert.equal(rewriteRelativeImportExtensions(src), expected);
// 预期输出：无（断言通过）
```

## 10. TypeScript 5.8：可擦除语法与 Node 原生类型剥离

### 10.1 Node 类型剥离的背景

Node 22.6 起以 `--experimental-strip-types` 提供类型剥离（后续版本逐步放开 CLI 边界，具体版本需核对 Node 官方文档）。Node 只删除类型，不执行 TS 运行时转换，因此要求源码只包含"可擦除语法"：类型标注、interface、type 可以；enum、namespace、构造函数参数属性、`import x = require()` 等不行。

```bash
# Node 类型剥离示例（Node 22.6+，具体 flag 形态需核对）
node --experimental-strip-types app.ts
```

### 10.2 --erasableSyntaxOnly

TS 5.8 让编译器强制"只允许可擦除语法"，保证代码库可以被 Node 类型剥离直接消费。

```ts
// erasable-demo.ts
// 运行环境：npx tsc --erasableSyntaxOnly --noEmit erasable-demo.ts
// 预期输出：enum 产生"不可擦除"诊断；删除 enum 后通过
enum Color { Red, Green } // erasableSyntaxOnly 下报错
export const colorCode: number = 0;
const config: { port: number } = { port: 3000 }; // 类型标注本身可擦除
```

```js
// erasable-check.mjs
// 运行环境：node erasable-check.mjs（Node 18+）
// 教学子集：识别 Node 类型剥离无法处理的非可擦除语法。
import assert from 'node:assert/strict';

function collectNonErasable(source) {
  const hits = [];
  if (/\benum\s+[A-Za-z_$]/.test(source)) hits.push('enum 声明');
  if (/\bnamespace\s+[A-Za-z_$]/.test(source)) hits.push('namespace 声明');
  if (/\bimport\s+[A-Za-z_$]\w*\s*=\s*require\s*\(/.test(source)) hits.push('import = require()');
  if (/constructor\s*\([^)]*\b(public|private|protected|readonly)\s+[A-Za-z_$]/.test(source)) hits.push('构造函数参数属性');
  return hits;
}

// 预期输出：无（断言全部通过）
assert.deepEqual(collectNonErasable('enum Color { Red }'), ['enum 声明']);
assert.deepEqual(collectNonErasable('namespace Util { export const x = 1; }'), ['namespace 声明']);
assert.deepEqual(collectNonErasable('import fs = require("fs");'), ['import = require()']);
assert.deepEqual(collectNonErasable('class A { constructor(private x: number) {} }'), ['构造函数参数属性']);
assert.deepEqual(collectNonErasable('type T = { x: number }; const n: number = 1;'), []);
```

### 10.3 --module node18 与 nodenext 变化

5.8 引入 `--module node18`（需核对发行说明），把解析/模块语义锁定到 Node 18 的历史规则；`nodenext` 则继续随时间追踪 Node 的最新稳定行为。锁定式 target 的意义在于避免 CI 中因编译器升级导致模块解析行为漂移。

```bash
# 5.8 起可用（需核对发行说明）
npx tsc --module node18 --moduleResolution node18 --noEmit app.ts
```

## 11. TypeScript 5.9：import defer 与 node20（需核对发行说明）

5.9 引入 `--module node20` 与 import defer（TC39 deferred import evaluation）。import defer 的核心语义是：先加载并解析依赖图，但推迟模块求值；首次访问命名空间绑定时才触发求值。

```ts
// 需核对发行说明：import defer 在 TS 5.9 的精确支持形态与语法边界
import defer * as cfg from './config.mjs';

export function run() {
  return cfg.timeout; // 首次访问绑定才求值 config.mjs
}
// tsconfig（字段组合需核对官方文档）：
// { "module": "node20", "moduleResolution": "node20" }
```

```js
// import-defer.mjs
// 运行环境：node import-defer.mjs（Node 18+）
// 复刻 deferred module 的核心语义：创建命名空间时不求值，首次绑定访问触发求值，且幂等。
import assert from 'node:assert/strict';

function createDeferredNamespace(evaluateModule) {
  let evaluated = false;
  let namespace = null;
  function ensure() {
    if (!evaluated) {
      evaluated = true;
      namespace = evaluateModule();
    }
    return namespace;
  }
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop === 'symbol') return undefined; // 不因内部符号访问提前求值
      const ns = ensure();
      return ns[prop];
    },
    has(_target, prop) { ensure(); return prop in ensure(); },
    ownKeys(_target) { ensure(); return Reflect.ownKeys(ensure()); },
  });
}

let evaluatedAt = 0;
const ns = createDeferredNamespace(() => { evaluatedAt++; return { answer: 42 }; });

assert.equal(evaluatedAt, 0); // 创建时不求值
assert.equal(ns.answer, 42);  // 首次访问绑定才求值
assert.equal(evaluatedAt, 1);
assert.equal(ns.answer, 42);  // 幂等
assert.equal(evaluatedAt, 1);
// 预期输出：无（断言全部通过）
```

## 12. 常见陷阱

1. `verbatimModuleSyntax` 不等于"把 import 都删掉"：未标 `type` 的导入会原样进入 JS；只作类型使用的名字必须写 `import type`。
2. `bundler` 允许省略相对扩展名，`node16/nodenext` 不允许；迁移到 Node 运行时要统一处理路径，不能把两者混用。
3. `const` 类型参数会产生深层 readonly，修改推断结果的属性会立刻报错；可变配置对象不要无脑加 `const`。
4. 标准装饰器与 legacy 装饰器签名完全不同，大量旧库仍基于 `experimentalDecorators` 的三参数签名；二者在同一项目里不能混用。
5. `using` 在旧目标下依赖 `Symbol.dispose`/`Symbol.asyncDispose`；没有 polyfill 会 TypeError；多资源异常会聚合为首错 + `suppressed` 数组。
6. `NoInfer<T>` 是 intrinsic 类型，只能在推断位置"隐身"，不能靠普通类型别名精确模拟；旧技巧 `T & {}` 会改变可赋给语义。
7. `rewriteRelativeImportExtensions` 只重写相对路径，不处理裸模块导入；它只影响 emit 文本，不影响类型检查。
8. Node 类型剥离只能处理可擦除语法；enum、namespace、参数属性、`import = require()` 会失败，需要 `--erasableSyntaxOnly` 提前拦截。

## 13. 面试题与答题要点

**Q1. 标准装饰器与 legacy 装饰器的本质区别是什么？**
要点：legacy 按参数位置传 target/key/descriptor，可用于参数；标准版按 `(value, context)` 传参，无法装饰参数。标准版 context 提供 `kind/name/addInitializer`（5.2 加 metadata），返回非 undefined 表示替换。二者 emit 机制不同，不能混用。

**Q2. satisfies 与类型注解、as 断言有何不同？**
要点：注解会向上拓宽并丢失字面量类型；`as` 是双向断言，不安全且丢失推导；`satisfies` 只做单向可赋给检查，保留表达式推断结果，且不产生运行时代码。

**Q3. const 类型参数的底层机制是什么？**
要点：在推断阶段为类型参数设置类 const 标志，关闭 primitive widening，并对对象/数组候选合成 readonly。与值层面 `as const` 相比，它把 const 语义前置到泛型调用点，能随调用传播。

**Q4. using 声明的执行顺序与异常处理规则？**
要点：词法作用域末尾逆序（LIFO）调用 dispose；async dispose 以 `await using` 触发；多个 dispose 抛错时抛第一个错误，其余挂到 `suppressed`。旧目标由 TS 生成 try/finally helper。

**Q5. 什么是推断类型谓词？什么情况下不会被推断？**
要点：当函数返回 boolean，且控制流分析发现某参数在 true 路径被收窄、false 路径不满足，则合成 `x is T`。显式标注返回类型会禁用；多参数时仅对实际参与收窄的参数合成；公共 API 建议显式谓词以避免版本漂移。

**Q6. bundler 与 nodenext 解析有何差异？rewriteRelativeImportExtensions 解决什么问题？**
要点：两者都支持 package exports；bundler 允许省略相对扩展名且模块格式中立，nodenext 面向 Node 运行时且 ESM 相对导入需扩展名。rewrite 选项让源码写 `.ts`，emit 时映射为 `.js/.mjs/.cjs`，只处理相对路径。

**Q7. isolatedDeclarations 为什么能加速声明生成？**
要点：它强制每个文件不依赖完整程序信息即可生成 `.d.ts`，因此可并行/单文件计算。代价是导出函数/类等必须显式标注返回类型与关键 public 类型，编译器才能单文件推导声明。

**Q8. Node 类型剥离与 --erasableSyntaxOnly 的关系？**
要点：Node 剥离只删除类型，不转换运行时语法；enum、namespace、参数属性、`import = require()` 不可剥离。`--erasableSyntaxOnly` 在编译期拦截这些语法，保证代码库可直接被 Node 运行，也让 JS 产物与 TS 源码语义一致。

回顾本页：5.0 先把装饰器、解析与模块工具链推向标准；5.2–5.5 逐步把 TC39 提案与推断引擎做深；5.6–5.9 则围绕迭代器、Node 运行时与模块目标收口。面试时把"版本事实"与"机制原理"分开作答：对把握十足的特性讲清底层机制，对版本号与诊断码的细节，诚实说明以官方发行说明为准，比背表格更专业。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [import defer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/defer) | import defer 的官方语法参考，核对 5.9 新增语法的确切行为 | 读语法与示例，注意延迟求值时机，再到 Playground 写延迟加载模块验证 |
| [Import attributes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with) | import attributes 的规范说明，对应 5.3 的 with 语法 | 重点看 with 的语义与示例，读完对照 TS 5.3 发行说明核对差异 |
| [TypeScript 博客](https://devblogs.microsoft.com/typescript/) | 每版 What's New 是一手发行说明，核对 5.9 等结论的最佳来源 | 按 5.0 至 5.9 顺序读发布文章，记录待核实项并修正正文 |
| [TypeScript 官方手册](https://www.typescriptlang.org/docs/) | 官方手册模块与 tsconfig 部分，是理解各版本模块行为变化的基础 | 读 Modules 与 tsconfig 章节，遇到版本差异回查对应发行说明 |
| [TypeScript 模块解析](https://www.typescriptlang.org/docs/handbook/modules/introduction.html) | 讲清 moduleResolution 各取值，理解 5.7 相对导入扩展名要求的前提 | 对照各取值的适用场景，读完改一遍自己项目的 tsconfig 看报错 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [TypeScript Playground](https://www.typescriptlang.org/play) | 可即时复现类型问题并分享链接，验证推断类型谓词等特性最直接 | 切到对应 TS 版本，粘贴每节示例，观察推导结果与编译输出 |
| [TypeScript AST Viewer](https://ts-ast-viewer.com/) | 直观展示 AST 节点，理解可擦除语法与类型剥离的编译结果 | 输入 5.8 相关代码，观察哪些节点被保留、哪些被擦除 |
| [代码拆分减小 JS 体积](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting) | 动态 import 的实践示例，帮助理解 import defer 与代码拆分场景 | 按文用动态 import 拆分路由查看产物，再对比 import defer 的差异 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Total TypeScript](https://www.totaltypescript.com/tutorials) | 练习驱动的类型教程，能加深对 NoInfer、类型谓词等特性的理解 | 按教程顺序做练习，与 type-challenges 对照，卡住回查发行说明 |
| [Type-Level TypeScript](https://type-level-typescript.com/) | 从基础到模板字面量类型，补齐理解新版类型特性所需的进阶知识 | 按章节做类型体操，涉及 5.x 特性时回官方博客验证 |
| [网道 TypeScript 教程](https://wangdoc.com/typescript/) | 中文教程便于快速通读类型系统与泛型，适合入门与术语对照 | 读类型系统与泛型章节，章末对照官方手册校验术语准确性 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格，列由运营配置 | 5.0 const 类型参数、5.4 NoInfer、5.5 推断类型谓词 | React 或 Vue + 虚拟滚动 + CI 跑 tsc | const 只写在类型参数位；NoInfer 只包住不应参与推断的参数 |
| 低端安卓上的首屏加载包 | 5.8 erasableSyntaxOnly、5.7 相对导入扩展名重写 | esbuild 或 SWC 做剥离，tsc 只做检查 | 类型剥离不检查类型，类型检查要单独一条命令 |
| 多人协作白板，房间内有锁与长连接 | 5.2 using 与 await using、5.0 标准装饰器、5.2 装饰器元数据 | WebSocket + 插件注册表 + Symbol.dispose | 释放顺序与声明顺序相反；目标低于 ES2022 要加声明 |
| 对外发布的组件库生成 d.ts | 5.5 isolatedDeclarations、5.0 verbatimModuleSyntax | tsc --declaration 或 API Extractor | 导出函数必须写显式返回类型，否则直接报错 |
| 边缘函数与 Serverless 冷启动 | 5.9 import defer、5.8 可擦除语法、5.9 node20 模块目标 | Node 20 运行时 + 打包器分包 | import defer 是较新的提案，先核对运行时支持 |
| 前端 monorepo 的包解析 | 5.0 bundler 模块解析、5.3 import attributes | Vite + pnpm workspace | bundler 解析不校验扩展名，Node 侧要另配 nodenext |
| 状态机驱动的灰度开关面板 | 5.3 收窄增强、5.5 正则语法校验 | React + 状态机库 + 正则常量 | switch (true) 分支过多时要拆函数，否则读不动 |
| 加载 WASM 与 JSON 资源 | 5.3 import attributes | Vite 的 ?init 与 with { type: 'json' } | Node 与打包器对 with 的落地节奏不一致 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：表格列由运营在后台配置，列名与数据类型运行时才确定。一次渲染一万行上下，筛选与排序都在前端完成。列名拼错在编译期没有提示，只有用户反馈能发现。

**怎么用本页知识解决**：先用 const 类型参数把列名固定成字面量元组，让编辑器补全列名。再用 NoInfer 拦住兜底值参与推断，让写错的列名在调用处报错。最后用推断类型谓词，让过滤后的行类型自动带上已存在的字段。

```ts
// 5.0 const 类型参数：字面量数组保留为元组，不会退化成 string[]
export function defineColumns<const K extends readonly string[]>(keys: K): K {
  return keys;
}
const columns = defineColumns(['id', 'title', 'owner']); // readonly ['id','title','owner']

// 5.4 NoInfer：兜底列名不参与推断，写错列名在调用处报错
export function withFallback<K extends string>(keys: readonly K[], fallback: NoInfer<K>): K[] {
  return [...keys, fallback];
}
withFallback(columns, 'owner'); // 通过

// 5.5 推断类型谓词：过滤函数写显式谓词，调用处自动收窄
const owned = rows.filter((r): r is Row & { owner: string } => r.owner !== null);
```

- const 类型参数把运行时数组和编译期元组绑定，列名改动只改一处。
- NoInfer 的收益在调用点：错误从渲染函数内部提前到传参那一行。
- 显式谓词让 owned 的每行都带 owner，后续取值不用再判空。
- 三点都不改运行时行为，只在类型层生效，回滚成本低。

**怎么度量收益**：指标为 CI 类型检查耗时、每行列名的补全命中率、线上类型错误上报数。测量方法：`tsc --noEmit` 的耗时与 `tsc --extendedDiagnostics` 输出的 check time、instantiations；表格筛选后的首帧耗时用 Chrome DevTools Performance 面板与 PerformanceObserver 的 longtask 记录。

**什么时候不该用**：列名来自接口返回的字符串数组时，const 推不出字面量，收益为零。项目还没开 strictNullChecks 时，NoInfer 与谓词带来的收窄表现不出来。

#### 场景 2：低端安卓上的首屏加载与 Node 侧构建脚本

**业务背景**：BFF 与构建脚本用 TS 写在 Node 里，上线前要先全量编译一遍，CI 有一段等待时间。首屏脚本要跑在低端安卓上，解析大包体是主要瓶颈。

**怎么用本页知识解决**：思路是让 TS 只负责检查，运行时直接消费剥离后的代码。打开 erasableSyntaxOnly 约束新代码只用可擦除语法，用 rewriteRelativeImportExtensions 保留 .ts 后缀写法，用 import defer 把重模块的求值推迟到首次访问。

```ts
// 5.9 import defer：模块求值推迟到首次属性访问，冷启动只建立绑定
import defer * as report from './report.ts';

export async function handle(req: Request) {
  // 5.8 可擦除语法：这里只有类型标注和 as，运行时可直接剥离
  const room = req.url.split('/').pop() as string;
  return report.render(room);
}
```

- 编译配置同时打开 erasableSyntaxOnly、rewriteRelativeImportExtensions、verbatimModuleSyntax。
- include 范围只覆盖服务端目录，前端包体交给打包器处理。
- erasableSyntaxOnly 会拦住 enum、namespace、构造函数参数属性，存量代码要逐处改造。
- Node 的类型剥离不报类型错误，CI 里必须保留 tsc --noEmit。
- import defer 的运行时支持随版本变化，上线前核对目标运行时的发行说明。

**怎么度量收益**：指标为流水线从提交到产物可用的时长、函数冷启动耗时、产物里不可擦除语法的残留条数。测量方法：CI job duration；运行时日志中的 duration 字段；用 hyperfine 对比剥离运行与全量编译两种命令的耗时；类型剥离开关名称随 Node 版本变化，需核对官方文档。

**什么时候不该用**：仓库里有大量 enum 与参数属性，改造成本高于省下的编译时间。产物要发布到只认 CJS 的老运行时，类型剥离解决不了模块格式问题。

#### 场景 3：多人协作白板

**业务背景**：一个房间内多个客户端同时画图，服务端为每个连接持有 socket、房间锁和临时文件句柄。客户端异常断开时资源没释放，房间会卡住，只能等超时回收。

**怎么用本页知识解决**：用 await using 把每个资源绑定到函数作用域，退出时按逆序释放。用标准装饰器让工具插件自注册，注册表键名从装饰器上下文读取。加载字体或 WASM 时用 import attributes 声明类型。

```ts
// 5.0 标准装饰器：插件类自注册，不依赖 experimentalDecorators
const registry = new Map<string, unknown>();
function plugin(value: unknown, ctx: ClassDecoratorContext) {
  registry.set(String(ctx.name), value); // ctx.name 与 Symbol.metadata 由 5.2 提供
}

@plugin
class BrushTool { draw(x: number, y: number) { /* ... */ } }

// 5.2 await using：作用域结束按声明逆序释放 socket 与房间锁
async function joinRoom(roomId: string) {
  await using socket = await connect(roomId);   // 需要 Symbol.asyncDispose
  await using lock = await acquireLock(roomId);
  socket.send({ type: 'join' });
}
```

- 释放顺序是 lock 先于 socket，和声明顺序相反，不需要手写 try 与 finally。
- 装饰器元数据依赖运行时提供 Symbol.metadata，没提供时元数据为空。
- lib 里要加入 disposables 相关声明，否则 using 语法报类型错误。
- 插件注册表在模块加载时完成，房间创建阶段不再做分支判断。

**怎么度量收益**：指标为房间断开后仍存活的活动连接数、进程堆内存曲线、锁表里的残留条目数。测量方法：服务端计数器暴露给 Prometheus，压测脚本用 k6 跑三段各 10 分钟，取 process.memoryUsage().heapUsed，快照用 Chrome DevTools Memory 面板比对。

**什么时候不该用**：资源生命周期跨多个请求（如数据库连接池要长期复用），用 using 会在函数返回时关掉。目标环境不支持 Symbol.dispose，又不想引 polyfill 时，继续用显式关闭函数。

### 行业先进实践

**verbatimModuleSyntax 让类型导入显式化（出处：TypeScript 官方文档 TSConfig 参考的 verbatimModuleSyntax 条目）**：打开后类型导入必须写成 import type，编译器不再猜测并删除导入。好处是单文件转译工具与打包器的行为一致，Babel、SWC、esbuild 各自处理结果相同。借鉴方式是新代码先全量打开，存量文件用编辑器快速修复逐批改。

**isolatedDeclarations 加速声明文件生成（出处：TypeScript 5.5 官方发行说明）**：要求导出项写出显式类型，从而支持逐个文件生成 d.ts。收益是声明生成可以并行，也能交给非 tsc 的工具。借鉴方式是只对发布包所在的目录打开，应用代码不开。

**erasableSyntaxOnly 约束新代码可被剥离（出处：TypeScript 5.8 官方发行说明与 Node.js 官方文档的 TypeScript 章节）**：该开关禁止 enum、namespace、构造函数参数属性等无法直接删除的语法。Node 的类型剥离只删除类型不转译语法，打开后两类行为对齐。借鉴方式是新建目录先打开，老目录单独列在 excludes 里。Type stripping 的默认启用版本需核对 Node 官方文档。

**import attributes 声明模块加载属性（出处：TC39 Import Attributes 提案仓库与 TypeScript 5.3 官方发行说明）**：导入 JSON 或 WASM 时写明 with { type: 'json' }，加载语义进入类型检查。好处是同一份源码在 Node 与打包器下解析一致。借鉴方式是先统一 JSON 导入写法，再看打包器插件是否已支持。

**using 声明管理非内存资源（出处：TC39 Explicit Resource Management 提案仓库与 TypeScript 5.2 官方发行说明）**：using 与 await using 在离开作用域时调用 Symbol.dispose。它把清理点固定在声明处，异常路径同样触发。借鉴方式是从文件句柄与测试夹具开始试点。运行时的 Symbol.dispose 支持情况需核对目标平台文档。

### 从学到用：落地路线

1. 在一个新目录试点：选即将新建的模块开 verbatimModuleSyntax 与 erasableSyntaxOnly，验收标准是该目录 tsc --noEmit 通过且无新增 any。
2. 用可复现命令验证：在 CI 加一条跑剥离运行、一条跑全量检查，验收标准是两条命令的输出各留一份日志，耗时差值有记录。
3. 按目录分批推广：每个 PR 只迁移一个目录并附上指标对比，验收标准是迁移目录的类型错误数为零、指标曲线无回退。
4. 设防回退闸门：CI 里固定检查命令与 tsconfig 关键开关，验收标准是开关被改动时流水线失败。

### 动手作业

**目标**：做一个迷你表格列定义库，配一条 Node 侧的可擦除脚本，把本页的类型特性用起来。

**步骤**：
1. 新建包，打开 strict、verbatimModuleSyntax、erasableSyntaxOnly。
2. 用 const 类型参数实现 defineColumns，输入字面量数组，返回同长度元组。
3. 用 NoInfer 实现 withFallback，让兜底列名不参与推断。
4. 用推断类型谓词实现 filterOwned，过滤后每行带 owner 字段。
5. 写一个 Node 脚本，用 await using 包裹临时文件句柄与计时器。
6. 在 CI 加 tsc --noEmit 与剥离运行两条命令。
7. 记录两条命令的耗时，写进包内 README。

**验收标准**：
- defineColumns(['id','title']) 的推导类型是 readonly ['id','title']。
- withFallback 传入不存在的列名时编译报错，报错位置在调用行。
- filterOwned 的结果类型里 owner 为必备字段。
- await using 包裹的句柄在函数正常与抛错两条路径上都释放。
- CI 中两条命令都通过，耗时差值在 README 里可查。

