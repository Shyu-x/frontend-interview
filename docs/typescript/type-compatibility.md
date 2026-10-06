---
title: 协变逆变与类型兼容
description: 讲解协变与逆变、类型兼容性、类型守卫以及 as const 与 satisfies 等类型断言进阶用法。
tags:
  - typescript
date: 2026-05-17
---

# 协变逆变与类型兼容

## 1. 协变与逆变（Covariance & Contravariance）

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

## 2. 类型兼容与类型守卫

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

## 3. 类型断言进阶

### 3.1 as const / satisfies

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
