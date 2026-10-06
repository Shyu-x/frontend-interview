---
title: 手写原生方法
description: 手写 call、apply、bind、new、instanceof 与 Object.create 的完整实现及考点解析。
tags:
  - coding
  - interview
  - this
date: 2026-05-17
---

# 手写原生方法

## 1. 手写 call

```javascript
// 手写call：调用函数，this指向第一个参数，其余参数逐个传递
Function.prototype.myCall = function(context = window, ...args) {
  // 排除null/undefined（使其指向window）
  if (context === null || context === undefined) context = window;
  // 用Symbol避免属性名冲突
  const fn = Symbol('fn');
  // 把this（当前函数）挂到context上
  context[fn] = this;
  // 通过context调用this，参数展开
  const result = context[fn](...args);
  // 清理
  delete context[fn];
  return result;
};

// 测试：
function greet(greeting, punct) {
  return `${greeting}, I'm ${this.name}${punct}`;
}
console.log(greet.myCall({ name: '张三' }, '你好', '！')); // 你好, I'm 张三！
console.log(greet.myCall({ name: '李四' }, '您好', '。')); // 您好, I'm 李四。
```

## 2. 手写 apply

```javascript
// 手写apply：调用函数，this指向第一个参数，其余参数用数组
Function.prototype.myApply = function(context = window, args = []) {
  if (context === null || context === undefined) context = window;
  const fn = Symbol('fn');
  context[fn] = this;
  const result = context[fn](...args);
  delete context[fn];
  return result;
};

// 测试：
function greet(greeting, punct) {
  return `${greeting}, I'm ${this.name}${punct}`;
}
console.log(greet.myApply({ name: '张三' }, ['你好', '！'])); // 你好, I'm 张三！
console.log(greet.myApply({ name: '李四' }, ['您好', '。'])); // 您好, I'm 李四。
```

## 3. 手写 bind

```javascript
// 手写bind：返回新函数，this永久绑定到第一个参数
Function.prototype.myBind = function(context = window, ...bindArgs) {
  const originalFn = this;

  function boundFn(...callArgs) {
    // new调用时，this是实例本身（优先级最高，忽略context）
    const isNew = this instanceof originalFn;
    const finalThis = isNew ? this : (context || window);
    return originalFn.apply(finalThis, [...bindArgs, ...callArgs]);
  }

  // 继承原型链：boundFn.prototype = Object.create(originalFn.prototype)
  function Empty() {}
  Empty.prototype = originalFn.prototype;
  boundFn.prototype = new Empty();

  return boundFn;
};

// 测试：
function greet(greeting) { return `${greeting}, I'm ${this.name}`; }
const bound = greet.myBind({ name: '张三' });
console.log(bound('你好'));  // 你好, I'm 张三
console.log(bound.call({ name: '无效' }, 'hi')); // hi, I'm 张三（bind无法覆盖）

// new优先级：
function Person(name, age) {
  this.name = name; this.age = age;
}
const BoundPerson = Person.myBind(null, '张三');
const p = new BoundPerson(18);
console.log(p.name, p.age); // 张三, 18（new时this指向实例）
```

## 4. 手写 new 操作符

```javascript
// 手写new：创建实例，原型绑定，this绑定
function myNew(Constructor, ...args) {
  if (typeof Constructor !== 'function') {
    throw new TypeError('Constructor is not a function');
  }

  // 1. 创建新对象，原型指向构造函数的prototype
  const obj = Object.create(Constructor.prototype);

  // 2. 调用构造函数，this指向新对象
  const result = Constructor.apply(obj, args);

  // 3. 返回：如果构造函数显式返回对象/函数，就用那个；否则返回新对象
  // 注意：构造函数若返回原始值则忽略，仍返回新对象
  if (result !== null && (typeof result === 'object' || typeof result === 'function')) {
    return result;
  }
  return obj;
}

// 测试：
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.greet = function() {
  return `我是${this.name}，${this.age}岁`;
};

const p = myNew(Person, '张三', 18);
console.log(p.name);      // 张三
console.log(p.greet());   // 我是张三，18岁
console.log(p instanceof Person); // true
console.log(p.constructor === Person); // true
```

## 5. 手写 instanceof

```javascript
// instanceof：检查对象是否在构造函数的原型链上
function myInstanceOf(left, right) {
  if (left === null || typeof left !== 'object') return false;
  if (typeof right !== 'function') throw new TypeError('Right-hand side of instanceof must be a function');

  let proto = Object.getPrototypeOf(left);
  const prototype = right.prototype;

  while (proto !== null) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

// 测试：
function Parent() {}
function Child() {}
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;

const c = new Child();
console.log(myInstanceOf(c, Child));    // true
console.log(myInstanceOf(c, Parent));    // true
console.log(myInstanceOf(c, Object));    // true
console.log(myInstanceOf({}, Object));   // true
console.log(myInstanceOf('str', String)); // false（字符串不是对象）
console.log(myInstanceOf(null, Object)); // false
```

## 6. 手写 Object.create

```javascript
// 手写Object.create：创建对象，原型指向传入的proto
function myObjectCreate(proto) {
  if (typeof proto !== 'object' && typeof proto !== 'function' && proto !== null) {
    throw new TypeError('Object prototype may only be an Object or null');
  }

  // 临时构造函数
  function Temp() {}

  // 原型指向传入的proto
  Temp.prototype = proto;

  // 返回新对象，其__proto__ === proto
  return new Temp();
}

// 测试：
const parent = { name: 'parent' };
const child = myObjectCreate(parent);
console.log(child.name); // parent
console.log(Object.getPrototypeOf(child) === parent); // true
console.log(child instanceof Object); // true（因为parent的原型链上有Object）
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [instanceof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof) | 官方说明 instanceof 的判定规则与 Symbol.hasInstance，是手写实现的依据。 | 读描述与示例，重点看原型链逐级查找；读后按规则手写 instanceof 并跑边界用例。 |
| [new](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new) | 官方列出 new 的四步语义与返回值规则，手写 new 前必读。 | 读描述与示例中的构造过程，先写四步伪代码，再实现并测构造函数返回对象与原始值的差异。 |
| [Reflect.apply()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) | 展示以数组传参调用函数的官方方式，可作为手写 apply 的参考实现。 | 与 Function.prototype.apply 对照阅读，实现完成后用它校验调用结果是否一致。 |
| [Function.prototype.apply()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply) | 给出 apply 的 thisArg 与类数组参数规则，是手写实现的事实规范。 | 读参数说明与示例，注意 thisArg 为 null/undefined 时的行为，写完用例逐一覆盖。 |
| [Function.prototype.call()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call) | 明确 call 逐个传参与 this 绑定规则，手写 call 的标准参照。 | 读语法与示例，关注非严格模式下 this 的替换；读后手写并与原生输出逐条对比。 |
| [Function.prototype.bind()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind) | 说明绑定 this、预设参数，以及 bind 结果被 new 调用时的特殊规则。 | 读 Bound functions 与 new 相关段落，据此实现并测试绑定函数的原型继承。 |
| [Object.create()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create) | 官方说明以指定原型创建对象及属性描述符参数，是手写实现的依据。 | 读参数表与 polyfill 示例，弄清 null 原型与第二参数，写完与原生结果对比。 |
| [TypeError: invalid 'instanceof' operand 'x'](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/invalid_right_hand_side_instanceof_operand) | 指出右侧非可调用对象时的报错，手写 instanceof 必须处理的边界。 | 快速浏览触发条件，在自写 instanceof 中补上同样的类型检查与报错。 |
| [TypeError: calling a builtin X constructor without new is forbidden](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Builtin_ctor_no_new) | 解释部分内置构造函数必须配合 new，是理解 new 语义的实例。 | 浏览示例，思考 new 创建 this 的步骤为何必要，再在自写 new 中模拟该行为。 |
| [TypeError: class constructors must be invoked with 'new'](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Class_ctor_no_new) | 说明 class 必须用 new 调用，印证 new 与内部构造语义的关系。 | 读错误原因与示例，用自写 new 调用 class，验证行为与原生是否一致。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 继承与原型链](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) | 用可运行示例讲透原型链，是理解 Object.create 与 instanceof 的根基。 | 读原型链一节并手敲示例，用 console.dir 查看 __proto__ 指向，再手写 Object.create 对比。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|------|------------------|-------------|----------|
| 后台管理万行表格的列渲染复用 | bind 固定 this 与列配置 | React/Vue 表格列定义时创建绑定函数 | 绑定函数引用需要稳定，避免每次渲染新建 |
| 低端安卓首屏加载的 polyfill | call/apply 与 Object.create 的降级实现 | 按特性检测注入手写 polyfill | 严格模式下 this 不再自动装箱，需要按规范实现 |
| 多人协作白板的历史命令队列 | apply 传参数数组回放命令 | 命令队列保存函数与参数数组 | 参数必须是真实数组，类数组需先转换 |
| 表单校验器的规则引擎 | call 复用校验函数 this 指向字段 | 规则配置存 this 目标，校验时 call 调用 | 非严格模式裸调用 this 会变成全局对象 |
| 插件 SDK 的 API 沙箱暴露 | bind 固定内部上下文与来源 | SDK 暴露前统一 bind 内部实例 | bind 后函数无 prototype，不能用原样 new |
| 权限系统的路由权限字典 | Object.create(null) 避免键冲突 | 用无原型对象存外部路由键 | 不能直接调用对象自身的 hasOwnProperty |
| 数据管道中类数组转数组 | apply/call 借用数组方法 | Array.prototype.slice.call(arguments) 或 Array.from | 箭头函数中没有 arguments，需先确认 |
| 跨 iframe 的第三方对象类型判断 | instanceof 与 Symbol.hasInstance | 自定义类定义 Symbol.hasInstance | 跨上下文对象原型链不同，instanceof 会失效 |

### 三个场景拆解

#### 场景 1：后台管理万行表格的列渲染复用

**业务背景**：后台管理表格一次渲染 1 万行、20 列，渲染循环内每格需要格式化函数。若每行用箭头函数包装，函数创建次数等于行数乘以列数，Chrome Performance 面板可看到大量匿名函数调用。

**怎么用本页知识解决**：在列配置初始化阶段用 `bind` 创建稳定渲染函数，固定列配置为 `this`，渲染循环内只传行参数。

```js
// 列配置初始化时定义格式化函数
function formatCell(row, index) {
  // this 是列配置对象
  return `${this.prefix}${row[this.key]}${this.suffix}`;
}

const column = {
  key: 'amount',
  prefix: '¥',
  suffix: '元'
};

// 用 bind 固定 this，渲染阶段不新建函数
const render = formatCell.bind(column);

// 表格渲染循环中只传行参数
function renderRow(row, rowIndex) {
  return render(row, rowIndex);
}
```

- `bind` 只执行一次，`render` 的 `this` 固定为 `column`。
- 渲染循环调用 `render(row, rowIndex)` 时不创建新函数，减少匿名函数量。
- 列配置需要变化时，应重新执行 `formatCell.bind(newColumn)`，不能修改已有绑定函数的 `this`。
- 该模式适合格式化函数只读取固定列配置、不读取行外动态状态的场景。

**怎么度量收益**：对比两组实现，A 组每次渲染内联箭头函数，B 组初始化时 `bind` 一次。用 Chrome Performance 面板记录 `Function call` 次数和脚本总耗时，React 项目再用 React DevTools Profiler 看子组件重复渲染次数。每组跑 10 次取中位数。

**什么时候不该用**：

- 格式化函数不需要固定 `this` 时，直接用参数传列配置，不必引入绑定函数。
- 列配置在每次渲染前都变化时，重建 `bind` 的成本抵消复用收益。
- 组件依赖函数引用变化触发必要更新时，固定引用会跳过合法更新。

#### 场景 2：插件 SDK 的 API 沙箱绑定

**业务背景**：一个可视化编辑器向数十个插件开放 SDK，公开 20 个 API。若把内部方法直接导出，插件可以用 `.call(other)` 读取别的编辑器实例状态。

**怎么用本页知识解决**：在暴露层用 `bind` 固定内部上下文 `sdk` 和来源参数 `allowedSource`，插件侧只传入业务参数。

```js
class EditorSDK {
  constructor(scope) {
    this.scope = scope;
  }
  setNode(source, id, value) {
    const node = this.scope.getNode(id);
    if (node) {
      node[value.key] = value.val;
      node.source = source;
    }
  }
}

// 在暴露层用 bind 固定 this 和来源参数
function expose(sdk, allowedSource) {
  return {
    setNode: sdk.setNode.bind(sdk, allowedSource)
  };
}

const api = expose(new EditorSDK({ getNode() {} }), 'plugin-a');
api.setNode('node-1', { key: 'title', val: '新标题' });
```

- `bind(sdk, allowedSource)` 同时固定 `this` 为 sdk，并把 `allowedSource` 作为原函数第一个参数。
- 插件拿到的 `setNode` 只接收 `id` 和 `value`，无法用 `.call(other)` 篡改 this。
- 暴露层集中管理绑定，新增 API 不必每个都写代理函数。
- 绑定函数没有 `prototype`，降低了 API 被误 `new` 的可能。

**怎么度量收益**：看非法 this 调用拦截次数、来源伪造发现数、暴露层每个 API 的代理代码行数。用审计脚本逐一执行 `api.setNode.call(other, ...)`，`other` 为伪造实例，断言内部 `this` 仍为 sdk；用断点确认第一参数为 allowedSource；用 `git diff --stat` 统计新增 API 代理行数。

**什么时候不该用**：

- SDK 方法不依赖 this 时，直接导出原函数即可。
- 插件需要把方法 `.call` 到自定义扩展对象上时，bind 会锁死该能力。
- 团队强依赖函数 `length` 判断参数个数时，bind 会减少可读参数数量。

#### 场景 3：权限系统的无原型路由字典

**业务背景**：权限系统从后端路由配置生成路径到权限码的映射，路由路径可能包含 `__proto__` 与 `constructor`。用普通对象存这些键，会写坏原型或读不到真实值。

**怎么用本页知识解决**：用 `Object.create(null)` 创建无原型对象，并统一用 `Object.prototype.hasOwnProperty.call` 做存在性判断。

```js
// 用无原型对象保存路由权限表
const permissionMap = Object.create(null);

function addPermission(route, code) {
  // 普通对象会命中原型链，这里不会
  permissionMap[route] = code;
}

function getPermission(route) {
  // 不直接写 permissionMap.hasOwnProperty
  const exists = Object.prototype.hasOwnProperty.call(permissionMap, route);
  if (!exists) {
    return 'unknown';
  }
  return permissionMap[route];
}

addPermission('__proto__', 'admin');
addPermission('constructor', 'editor');
console.log(getPermission('__proto__')); // 'admin'
console.log(getPermission('constructor')); // 'editor'
```

- `Object.create(null)` 返回的对象不继承 `__proto__`、`constructor`、`toString`，这些字符串只是普通键。
- 用 `Object.prototype.hasOwnProperty.call` 做存在性判断，避免字典对象自身键覆盖 `hasOwnProperty`。
- 无原型对象不能直接调用 `permissionMap.hasOwnProperty(...)`，会抛错。
- 适合所有外部输入作为键的字典容器。

**怎么度量收益**：看特殊键查询正确率、原型污染告警次数、字典导入耗时。用 Node.js 内置 `assert` 对三个特殊键跑断言；用 `Object.getPrototypeOf` 检测原型为 null；对比普通对象与无原型对象在特殊键用例下的测试结果。

**什么时候不该用**：

- 路由列表来自代码内固定枚举，不会出现特殊键，普通对象或 Map 足够。
- 如果用 JSON.parse 后直接生成字典，解析结果是普通对象，需要二次转换。
- 如果代码大量依赖对象字面量的 `hasOwnProperty` 方法调用，切换到无原型对象会扩大改造范围。

### 行业先进实践

- **按规范算法实现 call/apply（出处：ECMA-262 语言规范《Function.prototype.call》与《Function.prototype.apply》）**：规范把 this 参数缺失时替换为 undefined，严格模式下不装箱。按规范步骤写实现，能覆盖 null、undefined、基本类型参数。你的项目可以把规范步骤转成测试断言。
- **绑定函数保留 new 调用行为（出处：MDN Web Docs《Function.prototype.bind》）**：MDN 示例说明绑定函数被 new 调用时，this 参数被忽略，合并参数后作为构造器。这能避免 bind 应用在构造函数场景时丢失实例初始化。你的项目实现 bind polyfill 时，可用 `this instanceof bound` 判断。
- **用无原型对象存外部键（出处：MDN Web Docs《Object.create》）**：MDN 指出 Object.create(null) 创建的对象没有原型链继承。用它在权限表、白名单、缓存映射中存外部键，可避免键名冲突。你的项目可把这类容器封装成 `createDict`。
- **用 Symbol.hasInstance 自定义 instanceof 判断（出处：ECMA-262 语言规范《Symbol.hasInstance》）**：类可以定义静态 `Symbol.hasInstance` 方法，控制 `instanceof` 结果。跨 iframe 或 VM 上下文时，仅靠原型链判断可能失效，按接口判断更可靠。你的项目可在手写 instanceof 的下一步加入该方法。

### 从学到用：落地路线

1. **在工具函数中试点**：给两个纯函数工具替换为手写 call/apply，只覆盖 this 绑定和参数数组。验收标准：边界用例包括 null、undefined、类数组对象全部通过，原有用例无回归。
2. **在权限字典模块验证**：用 Object.create(null) 替换普通对象，补三条特殊键用例。验收标准：`__proto__`、`constructor`、`toString` 可正确读写，权限查询结果无变化。
3. **推广到 SDK 与命令框架**：新增代码评审清单，要求对外暴露函数必须 bind 内部上下文。验收标准：新公开 API 不再直接引用未绑定内部方法。
4. **防止回退**：在 ESLint 规则中拦截普通对象字面量存外部键。验收标准：CI 合入门禁能给出规则错误，普通对象字典代码无法进入主干。

### 动手作业

**目标**：实现一个“无原型命令字典 + 绑定命令执行器”。

**步骤**：

1. 用 Object.create(null) 创建 `commandMap`，不添加对象字面量原型。
2. 写 `hasCommand(name)`，使用 `Object.prototype.hasOwnProperty.call(commandMap, name)` 判断。
3. 用 bind 固定命令处理函数的 this 为 `executor`，首个参数为 `source`。
4. 写 `execute(name, args)`，从字典取绑定函数，用 `apply(null, args)` 传递参数数组。
5. 加入 `__proto__`、`constructor`、`toString` 三个命令名，验证读取与执行。
6. 写 3 个命令处理函数，断言 this 指向 executor、首个参数为 source。
7. 用 Node.js 的 assert 编写测试并运行。

**验收标准**：

- `__proto__`、`constructor`、`toString` 三个命令可注册、查询、执行。
- `execute` 返回结果与直接调用处理函数相等。
- 插件侧通过 `.call(other)` 无法改变 this。
- 源码不直接调用 `commandMap.hasOwnProperty`。
- 测试脚本在同一 Node.js 版本下可重复运行，全部断言通过。

