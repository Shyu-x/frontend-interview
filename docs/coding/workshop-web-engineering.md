---
title: 缓存、表达式解析与 Canvas 手写题解 W033–W040
description: 八道工程题覆盖 LRU、TTL、stale-while-revalidate、稳定缓存键、词法分析、Pratt 表达式求值、Canvas 高 DPI 命中测试和帧预算；所有预算模型都清楚标注与真实浏览器 GPU 验收的边界。
tags: [coding, interview, cache, compiler, canvas]
date: 2026-10-13
level: advanced
prerequisites:
  - Map、递归下降或表达式优先级基础
  - Node.js 20+；Canvas 题需理解 CSS 像素与 backing store
runnable: true
tested_with:
  - node@24.16.0
verified_at: 2026-10-13
source_commit: f682da9816e3f5454a3f1d8d8cb074d0de53236b
---

# 缓存、表达式解析与 Canvas 手写题解 W033–W040

这些题连接业务缓存、编译器基础和图形坐标。源码在 [`engineering.mjs`](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/web/engineering.mjs)，测试在 [`engineering.test.mjs`](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/web/engineering.test.mjs)；运行 `node --test scripts/teaching-labs/web/engineering.test.mjs`。Node 测试验证确定性模型，不测真实 GPU、帧率或浏览器布局。

## W033 LRU Map 顺序就是最近使用顺序 {#w033}

仪表盘最多保存 100 个最近访问的筛选结果。命中 key 后移到末尾；写入超容量时删最早的 key。

```js
get(key) {
  if (!this.#map.has(key)) return undefined;
  const value = this.#map.get(key);
  this.#map.delete(key); this.#map.set(key, value);
  return value;
}
```

JavaScript Map 保留插入顺序，因此 get 删除再插入即可更新最近性。容量固定时 set 的淘汰为常数次 Map 操作。容量必须大于 0，否则“最久项”定义没有意义。测试先读取 a，再放入 c，证明 b 而不是 a 被淘汰。此实现不考虑并发刷新和权重大小。

## W034 TTL 读时过期，无需每项定时器 {#w034}

临时验证码状态最多缓存 30 秒。写入时保存截止时间，读取时按 `now >= expiresAt` 决定是否仍有效，过期时删除。

```js
set(key, value, ttlMs) {
  this.#entries.set(key, { value, expiresAt: this.now() + ttlMs });
}
get(key) {
  const item = this.#entries.get(key);
  if (this.now() >= item.expiresAt) { this.#entries.delete(key); return undefined; }
  return item.value;
}
```

读取时惰性删除避免每项 timer 与清理竞态。注入时间源后，测试可精确验证截止点。这里使用 `performance.now()` 作为默认单调时间；需要跨页面持久化的过期时间应存 epoch time 并处理系统时钟变化。

## W035 stale-while-revalidate 先返回旧配置，再刷新 {#w035}

应用打开时本地已有功能开关配置，但已经过期。调用先得到旧值 `{ stale: true }`，后台 refresh 完成后下次读取才看到新值；同一时刻多个组件只触发一个 loader。

```js
if (entry) {
  if (!entry.pending) entry.pending = Promise.resolve().then(loader)
    .then(value => { entries.set(key, { value, expiresAt: now() + maxAge }); return value; })
    .catch(() => entry.value).finally(() => { entry.pending = undefined; });
  return { value: entry.value, stale: true, refresh: entry.pending };
}
```

单飞 Promise 防止十个组件同时刷新；刷新失败保留 stale 值，但冷启动没有旧值时错误仍会 reject。完成后清除 pending，后续 stale 读取才能再次刷新。测试用假时钟和 Deferred loader 检查并发合并。浏览器 Cache API 与此内存策略不同，不会自动套用 HTTP freshness 规则，见 [MDN Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)。

## W036 稳定缓存键 对象属性顺序不应改变 key {#w036}

构建预览缓存以配置对象为输入，`{b: 1, a: 2}` 与 `{a: 2, b: 1}` 应产生相同 key；循环输入直接报错，避免无法可靠序列化。

```js
const result = Array.isArray(item)
  ? item.map(normalize)
  : Object.fromEntries(Object.keys(item).sort().map(key => [key, normalize(item[key])]));
return JSON.stringify(result);
```

每层 object key 排序后再编码；递归返回时从 WeakSet 移除对象，因此共享子对象不误判为环。测试检查排序与 cycle。该 JSON 合同不支持 BigInt、函数、undefined 语义或 Date，应先定义输入 schema；构建系统要把插件版本、环境变量等所有语义输入都加进 key。

## W037 Tokenizer 每个字符要么消费，要么报错 {#w037}

小表达式编辑器支持数字、`+ - * / ( )`。`tokenize('12 + .5')` 产生 number、加号、number、EOF；遇到 `^` 应指出字符位置并拒绝。

```js
const number = /^(?:\d+\.?\d*|\.\d+)/.exec(source.slice(index));
if (number) { tokens.push({ type: 'number', value: Number(number[0]), start }); index += number[0].length; continue; }
if ('+-*/()'.includes(source[index])) { tokens.push({ type: source[index], value: source[index], start }); index++; continue; }
throw new SyntaxError(`Unexpected character at ${index}`);
```

index 每轮必须前进，不支持的字符不能被忽略，否则 `2 ^ 3` 会悄悄变成另一个表达式。EOF token 让解析器能检查尾随垃圾。测试验证数字切分和非法字符位置。

## W038 Pratt parser 优先级决定递归边界 {#w038}

输入 `2 + 3 * (4 - 1)` 得 `11`。乘法优先级 20，高于加减的 10；`expression(bp + 1)` 让同级二元运算左结合。

```js
const bp = { '+': 10, '-': 10, '*': 20, '/': 20 };
const op = tokens[cursor++].type;
const right = expression(bp[op] + 1);
left = op === '+' ? left + right : op === '-' ? left - right : op === '*' ? left * right : left / right;
```

解析 prefix 时先读数字、括号或一元负号，再循环消费绑定力不低于当前 min 的中缀运算符。收尾必须检查 EOF；否则 `2 3` 会被误接受。测试覆盖括号、优先级、负数和不完整括号。本解析器不处理标识符、函数、科学计数、除零策略或安全资源上限。

## W039 Canvas hit test 先把 CSS 坐标换到画布坐标 {#w039}

画布 CSS 显示为 200×100，但 backing store 是 400×200。用户点击 CSS 点 `(35,45)`，相对左上 `(10,20)` 后应映射到 `(50,50)`；它命中从 `(50,50)` 开始的矩形。

```js
const bounds = canvas.getBoundingClientRect();
const x = (event.clientX - bounds.left) * canvas.width / bounds.width;
const y = (event.clientY - bounds.top) * canvas.height / bounds.height;
return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
```

坐标转换把 CSS 显示尺寸和实际绘图像素分开，HiDPI 下不转换会整体偏移。测试用 2× backing store 检查内外两点。实际画布还要处理 transform、裁剪、旋转形状和零尺寸布局；这里是矩形轴对齐命中模型。

## W040 帧预算 模型只负责准入，不测 GPU 完成 {#w040}

图表每帧最多调度 4ms 的 CPU 准备任务。输入 FIFO 工作队列，输出选中任务和剩余队列；下一项放不进预算就停止，保持顺序。

```js
while (jobs.length && used + jobs[0].costMs <= budgetMs) {
  const job = jobs.shift(); selected.push(job); used += job.costMs;
}
```

队首优先简单且稳定，但一项过重会挡住后面更小任务，业务若要跳过需另定公平策略。`costMs` 是预估值，不是 GPU fence 或浏览器真实时长，所以本 Node 测试只证明不超预算的数学决策。真实验收须记录浏览器帧时间并区分 JS、布局、绘制和 GPU 等待；不可将模型测试写成帧率结论。

## 依据

表达式机制是作者实现的教学子集；缓存行为对照 [MDN Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)。图形坐标题对应仓库已有图形练习的坐标转换主题；本题不实现 Canvas 绘制管线或 WebGPU。面试题型广度参照 [BFE.dev](https://bigfrontend.dev/) 和 [GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-playbook/javascript)。
