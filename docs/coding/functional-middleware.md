---
title: 柯里化、compose 与中间件
description: 手写函数柯里化、compose 函数组合与 Koa 洋葱模型中间件。
tags:
  - coding
  - interview
  - functional
date: 2026-05-17
---

# 柯里化、compose 与中间件

## 1. 手写柯里化 curry

```javascript
// 柯里化：把多参数函数转为系列单参数函数
function curry(fn) {
  // 获取原函数参数个数
  const arity = fn.length;

  return function curried(...args) {
    // 参数够数就执行，不够就继续返回函数收集参数
    if (args.length >= arity) {
      return fn.apply(this, args);
    }
    return function(...args2) {
      return curried.apply(this, args.concat(args2));
    };
  };
}

// 自动柯里化（参数不够时自动收集）
function curryAuto(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...args2) => curried.apply(this, args.concat(args2));
  };
}

// 测试：
function add(a, b, c) { return a + b + c; }
const curriedAdd = curry(add);
console.log(curriedAdd(1)(2)(3));   // 6
console.log(curriedAdd(1, 2)(3));   // 6
console.log(curriedAdd(1)(2, 3));   // 6
console.log(curriedAdd(1, 2, 3));   // 6

// 应用：参数预填充（partial application）
const add10 = curry(add)(10);
console.log(add10(20)(30)); // 60

// 实际例子：日志
const log = curry((level, message, meta) =>
  console.log(`[${level}] ${message}`, meta)
);
const info = log('INFO');
info('系统启动', { pid: 123 });
info('用户登录', { uid: 456 });
```

## 2. 手写 compose

```javascript
// compose：从右到左组合多个函数
// compose(f, g, h)(x) === f(g(h(x)))
function compose(...fns) {
  if (fns.length === 0) return x => x;
  if (fns.length === 1) return fns[0];
  return fns.reduceRight((f, g) =>
    (...args) => f(g(...args))
  );
}

// pipe：从左到右组合（更直观）
function pipe(...fns) {
  if (fns.length === 0) return x => x;
  if (fns.length === 1) return fns[0];
  return fns.reduce((f, g) =>
    (...args) => g(f(...args))
  );
}

// trace：调试compose中间结果
const trace = label => x => { console.log(`${label}:`, x); return x; };

// 测试：
const double = x => x * 2;
const addOne = x => x + 1;
const square = x => x * x;

const process = compose(
  trace('输入'),
  double,
  trace('翻倍后'),
  addOne,
  trace('加一后'),
  square,
  trace('平方后')
);
process(2);
// 输入: 2
// 平方后: 4
// 加一后: 5
// 翻倍后: 10
// 输入: 20

// composeRight（从左到右执行）：
function composeRight(...fns) {
  return fns.reduceRight((f, g) => (...args) => g(f(...args)));
}

// 实际应用：数据处理管道
const processUser = pipe(
  validateInput,        // 验证输入
  normalizeData,        // 规范化
  removeDuplicates,     // 去重
  enrichWithMeta,       // 补充元信息
  formatOutput          // 格式化输出
);
```

## 3. 手写 KOA 中间件（compose 洋葱模型）

```javascript
// 手写koa中间件：compose + 洋葱模型
// 洋葱模型：请求从外层进入，层层深入到核心，再层层返回

function compose(middleware) {
  return function(ctx, next) {
    let index = -1;

    function dispatch(i) {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;

      if (i === middleware.length) {
        // 所有中间件执行完毕，调用最后的next（如果有）
        return next ? Promise.resolve(next(ctx)) : Promise.resolve();
      }

      const fn = middleware[i];
      try {
        return Promise.resolve(
          fn(ctx, () => dispatch(i + 1))
        );
      } catch (e) {
        return Promise.reject(e);
      }
    }

    return dispatch(0);
  };
}

// 简化Koa类：
class Koa {
  constructor() {
    this.middlewares = [];
  }

  use(fn) {
    this.middlewares.push(fn);
    return this;
  }

  listen(port, callback) {
    const server = require('http').createServer(async (req, res) => {
      const ctx = { req, res, state: {}, body: null };

      // 设置res.json辅助
      ctx.json = (data) => {
        ctx.body = JSON.stringify(data);
        res.setHeader('Content-Type', 'application/json');
      };

      try {
        await this.callback(ctx);
      } catch (e) {
        console.error(e);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    return server.listen(port, callback);
  }

  callback(ctx) {
    const fn = compose(this.middlewares);
    return fn(ctx);
  }
}

// 示例中间件：
const logger = async (ctx, next) => {
  const start = Date.now();
  console.log(`${ctx.req.method} ${ctx.req.url}`);
  await next();
  console.log(`耗时: ${Date.now() - start}ms`);
};

const auth = async (ctx, next) => {
  const token = ctx.req.headers.authorization;
  if (!token) {
    ctx.res.statusCode = 401;
    ctx.body = 'Unauthorized';
    return;
  }
  ctx.state.user = { id: 1, name: '张三' };
  await next();
};

const render = async (ctx, next) => {
  ctx.body = { message: 'Hello, ' + ctx.state.user.name };
  await next(); // 洋葱模型的最后一层
};

// 使用：
const app = new Koa();
app.use(logger);
app.use(auth);
app.use(render);
app.listen(3000, () => console.log('Server running at 3000'));

// 请求流程：
// logger enter → auth enter → render enter → (body set) → render exit
// → auth exit → logger exit → response

// 中间件间共享数据：通过 ctx.state
// ctx.req/res 是原生node的req/res
// ctx.body 会写入response body
```

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理万行表格的列筛选与排序 | 手写柯里化 curry | 原生 `Array.filter` + 规则数组管道 | 数据过万行时缓存中间结果，别每次输入都重跑全表 |
| 低端安卓机首屏的列表数据清洗 | 手写 compose | BFF 原始 JSON + 前端 compose 归一化 | 管道每步保持纯函数，发请求和读全局状态留在管道外 |
| 多人协作白板的消息处理 | 手写 KOA 中间件洋葱模型 | `koa-compose` 或等价的 `reduceRight` 实现 | 串行洋葱会累加耗时，广播这类重活要挪出链条 |
| 结算页的多步表单校验 | 手写柯里化 curry | 校验规则工厂 + 规则数组 | 规则顺序决定首个报错提示，顺序要固定并被测试锁住 |
| 埋点 SDK 的公共参数预置 | 手写柯里化 curry | 初始化时预置 appId、环境、设备字段 | 预置参数在初始化时冻结，避免被单次调用覆盖 |
| Node BFF 的鉴权、日志、限流链 | 手写 KOA 中间件洋葱模型 | Koa 风格中间件 | 鉴权失败要提前 return，不能继续 `await next()` |
| CLI 工具的多层配置合并 | 手写 compose | 默认配置 + 配置文件 + 命令行参数三段合并 | 从右到左的执行顺序要写进 `--help` 文本 |
| Redux 的 action 处理链 | compose + 柯里化 | `applyMiddleware` | 中间件内再 dispatch 会重新走整条链，注意死循环 |

### 三个场景拆解

#### 场景 1：后台管理万行表格的列筛选与排序

**业务背景**：表格一次渲染约 2 万行、12 列，每列都能筛选和排序。当前实现把筛选写在一个大函数里，每次输入都重跑全部判断，输入框出现可感知的延迟。

**怎么用本页知识解决**：把「列名 + 谓词」与数据拆成三层柯里化，外层只在切换列时重建。筛选条件变成规则数组，管道由数组拼装，数据只跑一次。

```js
// 三层柯里化：列名 -> 谓词 -> 数据，每层只接一个参数
const filterBy = (field) => (predicate) => (rows) =>
  rows.filter((row) => predicate(row[field]));

// 排序单独成层，放在管道末端
const sortBy = (field) => (rows) =>
  [...rows].sort((a, b) => a[field] - b[field]);

// 把 UI 当前的筛选状态翻译成函数数组
const buildPipeline = (rules) =>
  rules.map((rule) => filterBy(rule.field)(rule.predicate));

// 顺序执行管道，acc 始终是上一步的输出
const runPipeline = (rules, rows) =>
  buildPipeline(rules).reduce((acc, fn) => fn(acc), rows);

// 切换列时重建这一段，数据不重新请求
const nameStartsA = filterBy('name')((v) => v.startsWith('A'));
const pipeline = [nameStartsA, sortBy('updatedAt')];
```

- 最外层 `filterBy('name')` 的结果可以缓存，切换谓词时不必重建列名层。
- 筛选状态变成数组后，UI 与逻辑之间只传数据，不传回调。
- 排序放在末端，前面的筛选结果变短，排序要复制的元素随之减少。
- 可以拿规则数组的序列化字符串当缓存键，命中时直接返回上次结果。
- 单测只需调用 `filterBy('name')(pred)(rows)`，不用渲染表格。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板录制「连续输入 10 个字符」，看 Long Task 数量与 scripting 总时长。用 React DevTools Profiler 看 commit 次数。改造前后各录 5 次，取中位数比较。

**什么时候不该用**：数据只有几十行时，柯里化层只增加阅读时的跳转成本。筛选逻辑需要多列联动时（第 2 列的候选项由第 1 列结果决定），纯函数管道要额外透传上下文，直接写命令式代码读起来更直接。

#### 场景 2：低端安卓机首屏的列表数据清洗

**业务背景**：BFF 返回的原始 JSON 字段名与页面不一致，还要补默认值、丢掉下架项。低端机上这段处理与首屏渲染抢主线程，首屏出现空白。用 DevTools 的 6 倍 CPU 降速可以稳定复现。

**怎么用本页知识解决**：把每个清洗步骤写成一元函数，用 compose 串成管道。每步职责单一，可以单独打点、单独测试。

```js
// compose：从右到左执行，最右侧的函数最先跑
const compose = (...fns) => (input) =>
  fns.reduceRight((acc, fn) => fn(acc), input);

// 补默认值：只关心缺字段的补全
const fillDefaults = (list) => list.map((it) => ({ tags: [], ...it }));

// 丢掉下架项：只关心过滤条件
const dropOffline = (list) => list.filter((it) => it.status !== 'offline');

// 映射成视图模型：只关心字段改名
const toViewModel = (list) =>
  list.map((it) => ({ id: it.id, title: it.title, tags: it.tags }));

// 组装管道，调用方只看到一个一元函数
const buildListViewModel = compose(toViewModel, dropOffline, fillDefaults);

const viewModel = buildListViewModel(rawFromBff);
```

- 每个步骤是独立函数，可以单独写单测，不需要构造完整数据。
- 管道方向固定为从右到左，写在文件头注释里，减少方向猜测。
- 解析 JSON 这类可能抛错的事放在管道外，管道内不处理异常分支。
- 需要打点时，把步骤替换成带 `performance.mark` 的包装函数即可。
- 新增一步清洗只改 `compose` 的参数列表，调用方代码不动。

**怎么度量收益**：用 Lighthouse 看 FCP 与 TBT 两项。用 `performance.mark` 与 `performance.measure` 在每步前后打点，得到各步耗时占比。在 6 倍降速条件下，改造前后各跑 5 次。

**什么时候不该用**：管道只有一步时，compose 只多一层调用。某一步必须发请求或读全局状态时，把它留在管道外，否则管道不再可预测。

#### 场景 3：多人协作白板的消息处理

**业务背景**：同一房间几十人同时画线，每条消息要过鉴权、去重、限流、广播。原来的回调嵌套把超时和异常处理散在各层，出问题时定位要翻好几处日志。

**怎么用本页知识解决**：把每个关注点写成一个 `(ctx, next)` 中间件，用 compose 串成洋葱。进入时做鉴权和打点，`await next()` 返回后补响应字段、写耗时。

```js
// 中间件柯里化成两层：先接 ctx，再接 next
const withAuth = async (ctx, next) => {
  if (!ctx.token) return ctx.throw(401); // 进入前拦截，不再往下走
  await next();                          // 交给内层中间件
  ctx.body.roomId = ctx.roomId;          // 返回后补字段
};

const withTiming = async (ctx, next) => {
  const start = Date.now();                      // 进入前打点
  await next();
  ctx.set('X-Cost', String(Date.now() - start)); // 返回后写响应头
};

// compose：把中间件数组合成一个函数
const compose = (middlewares) => (ctx) =>
  middlewares.reduceRight(
    (next, mw) => () => mw(ctx, next), // 每层的 next 指向内层
    () => Promise.resolve()
  )();

app.use(compose([withTiming, withAuth, handleMessage]));
```

- 数组顺序就是进入顺序，返回顺序与之相反，这条约定要写在注释里。
- 鉴权失败时直接 return，内层的 `handleMessage` 一次都不会被调用。
- 打点放在最外层，量到的是整条链的耗时，不是单个中间件的耗时。
- 广播这类耗时操作放在最内层返回之后，容易拖长响应，考虑挪出链条。
- 每个中间件可以单独构造 `ctx` 测试，不需要起真实服务。

**怎么度量收益**：用 Prometheus 的 histogram 记录每条消息的处理耗时，看 p50 与 p95 两个分位。同时统计中间件抛出异常的计数。用压测脚本按房间人数倍增发消息，观察 p95 随人数变化的曲线。

**什么时候不该用**：纯单向的处理（返回时没有事要做）用数组顺序执行即可，洋葱模型会藏住执行顺序。需要并行广播给多个下游时，串行洋葱会把各下游耗时相加。

### 行业先进实践

**`applyMiddleware` 的三层柯里化签名（出处：Redux 官方文档）**：中间件写成 `store => next => action => {}`，每层只接一个参数。`applyMiddleware` 用 compose 把中间件数组合成一个增强版 dispatch。借鉴做法是把横切逻辑统一成这个签名，插拔时只改数组顺序。

**`koa-compose`（出处：koa-compose 开源项目）**：它把中间件数组合成一个函数，用 `await next()` 提供进入与返回两个时机。实现里会校验每个元素是函数，并在同一层重复调用 `next()` 时返回 rejected promise。借鉴做法是给自己的 compose 补上类型校验与重复调用保护。

**Express 中间件链（出处：Express 官方文档）**：Express 用 `next()` 线性推进，没有返回环绕语义，错误交给带 4 个参数的错误处理中间件。需要环绕时选 Koa 风格，只需要线性推进时不必引入洋葱。这条对比可以写进团队的选型说明。

**Lodash 的 `_.curry` 与 `_.flow`（出处：Lodash 官方文档）**：`_.curry` 提供现成的柯里化并支持占位符，`_.flow` 从左到右组合函数。借鉴做法是优先用经过测试的实现，而不是自己写 reduceRight。需核对官方文档：确认团队所用版本中占位符的写法与 `_.flow` 的参数形式。

**Ramda 的 `compose` 与 `pipe`（出处：Ramda 官方文档）**：`R.compose` 从右到左，`R.pipe` 从左到右，两者都返回一元函数。团队选定其中一个方向并写进代码规范，能减少读代码时对执行顺序的猜测。

### 从学到用：落地路线

**第 1 步：选一条读多写少的纯数据管道试点**：例如列表页的字段归一化，先不动请求层。验收标准是该管道每一步都有独立单测，用 `npm test` 可以只跑这些用例。

**第 2 步：给管道加打点，用数据确认收益**：用 `performance.mark` 与 `performance.measure` 记录每步耗时。验收标准是在 DevTools 的 Performance 面板里能单独看到每步的耗时区间。

**第 3 步：把签名写进团队约定并推广**：规定 compose 的方向、中间件的参数顺序、管道内不许有副作用。验收标准是代码评审清单里有对应条目，新增管道全部按约定签名。

**第 4 步：加一道自动守卫防止回退**：用自定义 lint 规则或一条单测，拦住管道步骤里出现发请求、写全局变量的情况。验收标准是 CI 能对一条故意写坏副作用的提交报错。

### 动手作业

**目标**：把一段回调嵌套的请求处理，改写成柯里化 + compose + 洋葱中间件三件套，并附上计时输出。

**步骤**：

1. 写一个 `compose`，接收函数数组，返回一元函数，遇到非函数元素时抛错。
2. 写一个 `curry2`，把 `(a, b) => ...` 转成 `a => b => ...`，并支持只传第一个参数。
3. 用 `curry2` 实现 `withAuth(check)(handler)`，`check` 返回 false 时不调用 `handler`。
4. 用 `compose` 串联 `withTiming`、`withAuth`、业务处理函数，顺序写进注释。
5. 补一个 `withLimit`，超过阈值的请求直接返回 429，不进入内层。
6. 写单测：鉴权失败时业务函数调用次数为 0；进入日志的顺序与返回日志的顺序相反。
7. 写一段计时脚本，输出每个中间件的进入与返回时间戳。

**验收标准**：

- `compose` 传入非函数元素时抛错，且有对应单测覆盖。
- 洋葱顺序可验证：三个中间件打印的进入顺序与返回顺序互为逆序。
- 鉴权失败用例中，用一个计数器断言业务函数被调用 0 次。
- 限流命中时返回状态码 429，且业务函数的调用计数为 0。
- 每个中间件都能用构造出来的 `ctx` 单独测试，不依赖真实网络。

