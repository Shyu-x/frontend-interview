
> TypeScript 是 JavaScript 的超集，为大型项目提供类型安全。本章覆盖 TypeScript 核心概念与高频面试题。

---

### 1. TypeScript 基础

#### 1.1 为什么出现 TS vs JS

```typescript
// JavaScript 问题：
// 1. 运行时不检查类型，错误到运行时才暴露
// 2. 没有类型提示，IDE 支持差
// 3. 重构困难，改一个函数签名不知道哪里用到
// 4. 团队协作时代码可读性差

// TypeScript 解决：
// 1. 编译时类型检查，编译期发现错误
// 2. 类型注解提供 IDE 智能提示
// 3. 接口、泛型、枚举等工程化能力
// 4. 代码即文档，可读性强

// TS 是 JS 的超集：
// TS代码 → TypeScript编译器 → JS代码
// 编译后删除了类型注解，输出纯 JS

// 示例：
// JS运行时才发现问题：
function add(a, b) { return a + b; }
add("1", 2); // "12"（字符串拼接，逻辑错误）

// TS编译时就报错：
function addTS(a: number, b: number): number { return a + b; }
addTS("1", 2); // 编译错误：Argument of type 'string' is not assignable to parameter of type 'number'
```

#### 1.2 TS 编译流程

![TypeScript 编译流程](assets/images/mermaid/ts-compile-flow.png)


// tsc --noEmit：只做类型检查，不输出文件
// tsc --emitDeclarationOnly：只生成 .d.ts
// tsc --incremental：增量编译（只编译变更的文件）

#### 1.3 tsconfig.json 常见配置

```json
{
  "compilerOptions": {
    "target": "ES2020",           // 编译到哪个JS版本
    "module": "ESNext",           // 模块系统
    "lib": ["ES2020", "DOM"],     // 内置类型库
    "jsx": "react-jsx",           // JSX处理方式

    "strict": true,               // 严格模式（开启所有严格检查）
    // 等价于开启以下全部：
    // strictNullChecks, strictAny, noImplicitThis,
    // alwaysStrict, noUnusedLocals, noUnusedParameters,
    // noImplicitReturns, noFallthroughCasesInSwitch

    "strictNullChecks": true,     // null/undefined严格检查
    "noImplicitAny": true,        // 不允许隐式any

    "moduleResolution": "bundler", // 模块解析策略（Node16/node_modules）
    "baseUrl": ".",                // 基础路径
    "paths": { "@/*": ["src/*"] }, // 路径别名

    "outDir": "./dist",           // 输出目录
    "rootDir": "./src",           // 源码目录

    "declaration": true,          // 生成.d.ts声明文件
    "declarationMap": true,       // 生成.d.ts.map，方便调试

    "skipLibCheck": true,         // 跳过库文件类型检查（大幅提速）
    "incremental": true,          // 增量编译
    "tsBuildInfoFile": ".tsbuildinfo", // 增量缓存文件

    "esModuleInterop": true,     // 让 default import 兼容 CommonJS
    "allowSyntheticDefaultImports": true, // 允许从无 default export 的模块默认导入

    "sourceMap": true,            // 生成 .map 源码映射

    "forceConsistentCasingInFileNames": true, // 文件名大小写一致
    "noUnusedLocals": true,       // 未使用的局部变量报错
    "noUnusedParameters": true   // 未使用的参数报错
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 1.4 skipLibCheck

```typescript
// skipLibCheck: true 时，TS 只检查你写的代码的类型
// 跳过 node_modules/@types/**/*.d.ts 的类型检查

// 为什么需要它？
// 1. 大幅提升编译速度（许多第三方库类型定义有问题）
// 2. 避免第三方库类型定义不兼容的问题
// 3. 适合快速开发，不必等库的类型定义修复

// skipLibCheck: false 时的问题：
// 库A的 .d.ts 依赖库B的某类型，但版本不匹配
// → TS报错：类型不兼容
// → 你需要改库的 .d.ts（无法修改node_modules）
// → 非常麻烦

// 实际建议：
// "skipLibCheck": true（大多数项目）
// 严格追求100%类型安全的库项目可设为 false
```

---

### 2. 类型基础

#### 2.1 any / unknown / never

```typescript
// any：任意类型，关闭类型检查（尽量避免）
function process(data: any) {
  console.log(data.trim()); // 不报错，运行时可能崩
}

// unknown：安全版的 any
// 使用前必须缩小类型（type narrowing），否则TS报错
function processUnknown(data: unknown) {
  // console.log(data.trim()); // 报错：Object is of type 'unknown'
  if (typeof data === 'string') {
    console.log(data.trim()); // OK，TS知道是string
  }
}

// never：永不存在的值（用于永不返回的函数、死代码）
function throwError(msg: string): never {
  throw new Error(msg);
}

// never用于类型穷举（exhaustive check）：
type Shape = Circle | Square | Triangle;
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
    case 'triangle': return 0.5 * s.base * s.height;
    default:
      // 如果漏掉一个case，shape类型变成never，编译报错
      const _exhaustive: never = s;
      throw new Error(`Unknown shape: ${_exhaustive}`);
  }
}

// any vs unknown：
// any.xxx 都合法，unknown.xxx 必须先缩小类型
// unknown 比 any 更安全，是"有约束的any"

// never的应用：条件类型
type IsString<T> = T extends string ? true : false;
type A = IsString<"hello">; // true
type B = IsString<123>;    // false

// 总结：
![any/unknown/never 类型对比](assets/images/mermaid/any-unknown-never.png)

```

#### 2.2 void vs never

```typescript
// void：函数没有显式返回值（返回undefined）
function log(message: string): void {
  console.log(message);
  // 隐式返回undefined
}

// never：函数永不返回（抛出异常或死循环）
function fail(msg: string): never {
  throw new Error(msg);
}
function infinite(): never {
  while (true) {}
}

// 区别：
// void：返回值类型为 void（返回undefined是合法的）
// never：永不返回（没有返回值概念）

// void可以被忽略返回值，never不能被到达
const r1: void = undefined; // OK
// const r2: never = undefined; // 报错：不能赋值为undefined

// never赋值给其他类型：
type FromNever = never extends string ? true : false; // 永远为false
// never是底部类型，不能赋值给任何具体类型（除了never自身）
// 这个特性用于类型守卫
```

---

### 3. interface vs type

```typescript
// interface：接口
interface User {
  name: string;
  age: number;
}

// type：类型别名
type UserType = {
  name: string;
  age: number;
};

// 两者都能描述对象结构，区别如下：
![interface vs type 对比](assets/images/mermaid/interface-vs-type.png)


// interface 声明合并（最独特的能力）：
interface Config {
  url: string;
}
interface Config {
  timeout: number;
}
// 等价于：
// interface Config { url: string; timeout: number; }

// 应用：扩展第三方库的interface
// 库定义的接口可以自行声明扩展，不需要改库代码

// type联合/交叉：
type A = { a: number } | { b: string };
type B = { c: boolean } & { d: number };

// 实际选型建议：
// 大多数情况用 type（更灵活）
// 需要声明合并时用 interface
// 描述API接口时用 interface（约定俗成）

// 两者都可以被extends扩展：
interface Animal { name: string; }
interface Dog extends Animal { bark(): void; }

type Cat = { name: string } & { meow(): void };
```

---

### 4. 泛型

#### 4.1 什么是泛型

```typescript
// 泛型：类型参数化，让函数/接口/类支持多种类型
// 不使用泛型（不够通用）：
function identity(n: number): number { return n; }
function identityStr(s: string): string { return s; }

// 使用泛型（通用）：
function identity<T>(arg: T): T { return arg; }
const num = identity<number>(1);     // T=number
const str = identity<string>("hi");  // T=string
const inferred = identity(42);      // 自动推断 T=number

// 泛型函数类型：
const fn: <T>(arg: T) => T = identity;
const fn2: { <T>(arg: T): T } = identity;

// 泛型约束（限制T的范围）：
interface HasLength { length: number; }
function logLength<T extends HasLength>(arg: T): number {
  return arg.length;
}
logLength("hello"); // 5
logLength([1, 2]);  // 2
// logLength(123);  // 报错，数字没有length
```

#### 4.2 泛型约束

```typescript
// 多泛型参数：
function pair<K, V>(key: K, value: V): [K, V] {
  return [key, value];
}
const p = pair<string, number>("age", 18); // [string, number]

// 泛型约束：继承某个类型
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { name: "张三", age: 18 };
const name = getProperty(user, "name"); // string
// const err = getProperty(user, "height"); // 报错，不在keyof中

// keyof：获取类型的所有键名，返回联合类型
type UserKeys = keyof User; // "name" | "age"

// 泛型默认类型：
function createArray<T = string>(length: number, value: T): T[] {
  return new Array(length).fill(value);
}
const arr = createArray(3); // 默认 T=string，等价于 string[]

// 泛型类：
class Queue<T> {
  private items: T[] = [];
  enqueue(item: T) { this.items.push(item); }
  dequeue(): T | undefined { return this.items.shift(); }
}
const numQueue = new Queue<number>();
numQueue.enqueue(1);
numQueue.enqueue("2"); // 报错，只能是number

// 泛型别名：
type Nullable<T> = T | null | undefined;
type Result<T> = { data: T; error: null } | { data: null; error: Error };

// 多约束：
function process<T extends string & { length: number }>(arg: T): void {}
// T 必须既是string（有length），又有length属性（string满足）
```

---

### 5. 高级类型

#### 5.1 keyof / infer

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

#### 5.2 extends 在 TS 中的作用

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

#### 5.3 条件类型

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

---

### 6. mapped type（映射类型）

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

---

### 7. Utility Types 实现原理

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

---

### 8. 协变与逆变（Covariance & Contravariance）

```typescript
// 协变与逆变是函数类型子类型关系的核心

// 简单理解：
// 协变（Covariance）：A是B的子类型，则 T<A> 也是 T<B> 的子类型（返回值）
// 逆变（Contravariance）：A是B的子类型，则 T<B> 是 T<A> 的子类型（参数）

// 示例：
class Animal { move() {} }
class Dog extends Animal { bark() {} }

// 赋值给变量时：
// 参数类型：逆变（接受更宽泛的）
function feedAnimal(fn: (animal: Animal) => void) {}
// 可以传入：
feedAnimal((dog: Dog) => {}); // OK
feedAnimal((animal: Animal) => {}); // OK

// 返回值类型：协变（返回更具体的）
function makeDog(): Dog { return new Dog(); }
function makeAnimal(): Animal { return new Animal(); }
let dogFn: () => Dog = makeDog;       // OK
// let animalFn: () => Animal = makeDog; // OK（协变：Dog是Animal子类型，返回值协变）

// 函数子类型规则：
// (A => B) 是 (C => D) 的子类型
// 当 C 是 A 的子类型（参数逆变）且 D 是 B 的子类型（返回值协变）时成立

// 参数逆变演示：
type FnAnimal = (animal: Animal) => void;
type FnDog = (dog: Dog) => void;
// FnDog 是 FnAnimal 的子类型
// 因为Dog是Animal的子类型（更具体），函数参数要更宽泛（逆变）
const fnDog: FnDog = (d: Dog) => d.bark();
const fnAnimal: FnAnimal = fnDog; // OK
// fnAnimal 调用时可以传入任意Animal（更宽泛），而fnDog只需要Dog

// 为什么会这样？
// 变量fnAnimal的类型要求：接收任何Animal
// fnDog只能处理Dog，但它继承自Animal，所以传入Dog时fnDog能工作
// 如果传给fnDog的是其他Animal子类（非Dog），fnDog可能出错
// 但fnAnimal期望的是Animal（包括Dog），所以fnDog不会收到非Dog的Animal

// 实际场景：
// TS默认函数参数是双向协变的（strictFunctionTypes关闭时）
// 开启strictFunctionTypes后，参数会正确逆变

// TS函数类型签名：
interface TypedPropertyDescriptor<T> {
  get?(): T;
  set?(value: T): void;
}

// 用处：类型推断、泛型约束、深入理解TS行为
```

---

### 9. 类型兼容与类型守卫

```typescript
// 类型兼容：结构化子类型（duck typing）
interface Point { x: number; y: number; }
interface Point2D { x: number; y: number; }
let p: Point = { x: 1, y: 2 };
let p2: Point2D = p; // OK，结构兼容（TS用结构类型而非名义类型）

// 额外属性检查：
function greet(person: { name: string }) {}
// greet({ name: "张三", age: 18 }); // 报错：对象字面量不能有多余属性
// 但先赋值给变量再传入是可以的：
const user = { name: "张三", age: 18 };
greet(user); // OK（user对象在定义时没有多余属性检查）

// 类型守卫（type guard）：缩小类型范围
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
function process(value: unknown) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // TS知道value是string
  }
}

// typeof：基础类型守卫（自动推断）
function padLeft(value: string | number) {
  if (typeof value === 'string') {
    return value.padStart(5); // TS知道是string
  }
  return value.toFixed(2); // TS知道是number
}

// instanceof：类实例守卫
class Animal { move() {} }
class Dog extends Animal { bark() {} }
function act(animal: Animal) {
  if (animal instanceof Dog) {
    animal.bark(); // TS知道是Dog
  }
}

// in操作符：
interface Cat { meow(): void; }
interface Dog { bark(): void; }
function speak(animal: Cat | Dog) {
  if ('bark' in animal) { animal.bark(); } // TS知道是Dog
}

// 可辨识联合（tagged union）：
interface Square { kind: 'square'; size: number; }
interface Circle { kind: 'circle'; radius: number; }
type Shape = Square | Circle;
function area(s: Shape) {
  if (s.kind === 'square') return s.size ** 2;
  if (s.kind === 'circle') return Math.PI * s.radius ** 2;
}

// 类型断言（as）：
const str = "hello" as string;
const num = "123" as unknown as number; // 两层断言
// 类型断言不是转换，编译时被删除
```

---

### 10. 类型断言进阶

#### 10.1 as const / satisfies

```typescript
// as const：将字面量转为readonly元组/字面量类型
const arr = [1, 2, 3] as const;
// 类型：readonly [1, 2, 3]（不是number[]）
const obj = { name: "张三", age: 18 } as const;
// 类型：readonly { readonly name: "张三"; readonly age: 18 }

function route(path: string, mode: "http" | "https") {}
route("api/users", "https" as const); // 不报错

// satisfies：验证类型但不改变推断类型
type Color = "red" | "green" | "blue";
const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
} satisfies Record<Color, string | number[]>;

// 对比：
const paletteOld = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
} as Record<Color, string | number[]>;
// paletteOld.green.toUpperCase() // 报错，as后推断为string | number[]
// 但palette.green是string字面量，可以toUpperCase()

// satisfies 用途：
// 1. 验证满足约束，同时保留字面量推断
// 2. 适合定义配置对象（约束键值，但保留具体类型）
```

---

### 11. 枚举与声明合并

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

---

### 12. 声明文件与 d.ts

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

---

### 13. TS 提升大型项目体验

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

---

### 14. Vue / React 结合 TS

```typescript
// React + TS：
// 1. 组件类型
interface Props { name: string; age?: number; }
function UserCard({ name, age = 18 }: Props) { return <div>{name}</div>; }

// 2. FC + children
interface LayoutProps { children: React.ReactNode; }
function Layout({ children }: LayoutProps) { return <div>{children}</div>; }

// 3. 事件处理
function Input() {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };
  return <input onChange={handleChange} />;
}

// 4. 状态类型
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);

// 5. Ref类型
const inputRef = useRef<HTMLInputElement>(null);
// inputRef.current?.focus();

// 6. 泛型组件
function GenericList<T>({ items, render }: { items: T[]; render: (item: T) => React.ReactNode }) {
  return items.map(render);
}

// 7. useCallback/useMemo类型
const memoizedFn = useCallback<(a: number) => number>((a) => a * 2, []);

// 8. HOC类型
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthWrapper(props: P) {
    // 检查权限...
    return <Component {...props} />;
  };
}

// Vue3 + TS：
// 1. defineProps
const props = defineProps<{
  name: string;
  age?: number;
  sexes?: number;
  callback?: (id: number) => void;
}>();
// 或者用withDefaults
const props = withDefaults(defineProps<{
  name: string;
  age?: number;
}>(), { age: 18 });

// 2. defineEmits
const emit = defineEmits<{
  (e: "update", value: number): void;
  (e: "delete", id: string): void;
}>();

// 3. defineExpose
defineExpose({ getData: () => data });

// 4. 组合式函数类型
function useCounter(initial = 0) {
  const count = ref(initial);
  const increment = () => count.value++;
  return [readonly(count), increment] as const;
}

// 5. ref/reactive类型推断
const name = ref<string>("张三"); // 显式指定
const state = reactive<{ count: number }>({ count: 0 });

// 6. 组件类型约束
import type { VNode } from 'vue';
function renderSlot(slots: VNode[]) {}
```

---

### 15. TS 编译性能优化

```typescript
// TS编译慢的原因：
// 1. 类型检查是 O(N^2) 的（需要比较类型关系）
// 2. 大型项目依赖解析时间长
// 3. 每个文件都做类型解析
// 4. 复杂的泛型和条件类型开销大

// 优化方案：

// 1. skipLibCheck: true（最重要）
// 跳过 node_modules/@types/**/*.d.ts 的类型检查
// 可能节省 30-80% 时间

// 2. incremental: true
// 生成 .tsbuildinfo 增量缓存文件
// 第二次编译只检查变更文件

// 3. 减少 include 范围
// 不要 include 整个 src，可以精确到特定目录

// 4. 使用 project references（项目引用）
// 把大仓库拆成小project，每个独立编译
{
  "references": [
    { "path": "./shared" },
    { "path": "./utils" }
  ]
}

// 5. noEmit: true（如果只做类型检查）
// tsconfig for lint（只检查不出包）：
// { "noEmit": true, "skipLibCheck": true }

// 6. 避免过于复杂的泛型
// 条件类型嵌套过深会显著增加检查时间

// 7. ts-build mode（--build）
// tsc --build 是增量模式，比普通模式快
// 只编译outDir改变的模块

// 8. 选择更快的编译器
// esbuild-loader / swc-loader 替代 ts-loader
// 比原生tsc快10-100倍（但功能有限）
// vite使用esbuild做TS编译（开发模式）

// 9. 分离类型检查和编译
// lint阶段只做类型检查（noEmit）
// 打包阶段用swc/esbuild快速编译

// 10. 使用transpileOnly
// ts-loader: { transpileOnly: true }（不检查类型，只转译）
// 类型检查交给fork-ts-checker-webpack-plugin（独立进程）
```

---

