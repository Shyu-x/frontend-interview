---
title: 浏览器异步手写题解：XHR、Fetch、取消与流 W009–W016
description: 用八道可运行题解比较 XHR 与 Fetch，处理 HTTP 失败、latest-wins 搜索、退避重试、并发上限、超时取消、UTF-8 分块和上传进度；区分 Node adapter 测试与真实浏览器网络验收。
tags: [coding, interview, browser, async, fetch]
date: 2026-10-13
level: advanced
prerequisites:
  - Promise、async iterator、AbortController 基础
  - Node.js 20+
runnable: true
tested_with:
  - node@24.16.0
verified_at: 2026-10-13
source_commit: 27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb
---

# 浏览器异步手写题解 XHR、Fetch、取消与流 W009–W016

完整源码在 [`async.mjs`](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/web/async.mjs)，对应的 Node adapter 测试在 [`async.test.mjs`](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/web/async.test.mjs)。运行 `node --test scripts/teaching-labs/web/async.test.mjs`。这些测试只证明适配器调用合同；下方提供独立真实网络页，XHR/Fetch 行为需要在浏览器里实际操作。

## W009 XHR Promise 适配器 保留进度能力 {#w009}

旧版上传控件已用 `XMLHttpRequest` 汇报 progress；新调用层想 `await xhrRequest('/upload', { method: 'POST', body })`。结果包含 status、responseText 和 XHR；错误、abort 分别拒绝。

```js
xhr.open(method, url, true);
xhr.onload = () => { cleanup(); resolve({ status: xhr.status, text: xhr.responseText, xhr }); };
xhr.onerror = () => { cleanup(); reject(new TypeError('Network error')); };
```

XHR 用事件收尾，所以要移除 AbortSignal 监听，避免长寿命 signal 持有已完成请求。HTTP 404 仍会走 load；由调用者检查 status。signal 在请求开始前已 abort 时，也必须自行 reject，因为尚未 send 的 XHR 不保证发出 abort 事件。MDN 记录 abort 时状态码会变为 0，浏览器侧仍需通过真实请求验证 [XHR abort 行为](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/abort)。测试注入 factory 验证调用时序，不伪称网络测试。

## W010 Fetch JSON 显式把 HTTP 错误变为拒绝 {#w010}

商品详情 API 返回 200 JSON 得对象；返回 503 时拒绝 `error.status === 503`，且不调用 JSON parser。Fetch Promise 对 HTTP 错误响应仍会 fulfill，这是业务封装应处理的一层。

```js
const response = await fetchImpl(url, init);
if (!response.ok) { const error = new Error(`HTTP ${response.status}`); error.status = response.status; throw error; }
return response.json();
```

解析 body 本身也可能失败，错误继续向调用者传播。不要只 `.catch()` 网络错误后就认为覆盖了 HTTP 状态。官方 [Window.fetch 文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)说明其返回 Response Promise；本题 Node 测试验证 `ok/status/json` 契约，不验证浏览器的 CORS。

## W011 搜索框 latest-wins 取消之外再验代次 {#w011}

用户先搜 `old` 再搜 `new`，旧响应即使晚到也不能盖掉新结果。返回 `{ current: true, value }` 或 `{ current: false }`；新搜索启动时 abort 上一个请求。

```js
active?.abort();
active = new AbortController();
const ticket = ++generation;
const value = await request(query, { signal: active.signal });
return ticket === generation ? { current: true, value } : { current: false };
```

取消减少不必要工作，代次号是提交 UI 状态前的最后一道门，因为 adapter 可能忽略 signal 或响应已经排入任务队列。失败仍 reject，页面决定展示错误还是保留旧结果。MDN 的 [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)支持取消 fetch/body/stream；Node 测试特意让旧请求无视 abort 后晚到。

## W012 退避重试 错误分类与延时可控 {#w012}

报表下载遇到 503 最多重试两次，输入校验 400 不重试。每次延时 `round(base × 2^attempt × (0.5 + random()))`；成功返回数据，重试耗尽抛出最后错误。

```js
try { return await task(attempt); }
catch (error) {
  if (attempt >= retries || !shouldRetry(error)) throw error;
  await wait(Math.round(baseMs * 2 ** attempt * (0.5 + random())));
}
```

`wait` 和 `random` 可注入，单测既不睡眠也不依赖随机种子。重试任务若有副作用，需幂等键，否则网络响应丢失后重复写入会产生重复订单。测试检查实际尝试次数、延时和永久错误快速失败；取消信号在下一轮前检查。

## W013 并发上限 索引在 await 前领取 {#w013}

加载 20 张商品卡片时最多 4 个并行请求，输出仍按商品原始顺序排列。`limit=0` 或非整数直接 RangeError，空输入返回空数组。

```js
while (true) {
  const index = next++; // await 前同步领取，不会重复领取
  if (index >= items.length) return;
  output[index] = await mapper(items[index], index);
}
```

固定启动 `min(limit, length)` 个 worker 避免为每项创建一个长期等待器。输出使用索引槽而不是按完成先后 push。某项 reject 时整体 reject，worker 会停止领取尚未开始的项目，但已在途任务仍需自己处理取消。若业务要求全体停止，应再传共享 AbortSignal。测试通过活跃计数证明峰值不超过 2。

## W014 有取消能力的超时 {#w014}

后台预览生成接口 800ms 未完成就中止 fetch 并展示超时。`withTimeout(task, ms)` 超时 reject `Timeout` 且传给任务的 signal 变成 aborted；成功则清 timer。

```js
task(controller.signal),
new Promise((_, reject) => {
  timer = timers.setTimeout(() => { controller.abort(); reject(new Error('Timeout')); }, ms);
}),
```

单纯 `Promise.race` 超时不会停止输送数据；此处把控制器交给拥有底层 I/O 的 task。若 task 不消费 signal，最多只能让调用者停止等待，不能声称网络被取消。父信号也会 relay 到子控制器。测试验证超时 abort 和成功后清理路径。

## W015 流式按行读取 网络块不是文本行 {#w015}

日志响应以 UTF-8 和 LF 分行；中文一个字符的字节可分散到多个 chunk，CRLF 也可能拆开。输入 `E4 B8`、`AD 0D`、`0A 41`，输出 `中`、`A`。

```js
pending += decoder.decode(chunk, { stream: true });
while ((newline = pending.indexOf('\n')) >= 0) {
  let line = pending.slice(0, newline);
  if (line.endsWith('\r')) line = line.slice(0, -1);
  yield line; pending = pending.slice(newline + 1);
}
```

`TextDecoder` 的 stream 模式保留未完成字节序列；每块单独 decode 会把中文解码坏。fatal UTF-8 模式让坏输入 reject，而不是默默替换为 U+FFFD。剩余未换行文本在 EOF 冲刷。MDN [Readable streams 教程](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)展示 fetch body 分块消费与 signal 取消；测试只验证 Node 中 async iterable 分块适配。

## W016 上传进度 未知总量不是 0% {#w016}

上传器回调形如 `{ loaded: 30, total: 100, percent: 30 }`；浏览器无法计算总长度时 `total` 和 `percent` 必须为 `null`。返回 disposer 解绑 progress handler。

```js
const total = event.lengthComputable ? event.total : null;
onProgress({ loaded: event.loaded, total, percent: total ? event.loaded / total * 100 : null });
```

未知和零长度是不同语义，不可显示 NaN，也不该冒充 0%。本页 Node 测试用事件适配器检查换算和解绑。真实页面验收应选择大文件、观察进度事件并中止；该操作不属于自动测试覆盖。

## 在浏览器里发真实请求

另开终端从仓库根目录执行 `node scripts/teaching-labs/browser-server.mjs`，然后打开 [`network-demo.html`](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/web/network-demo.html) 对应的 `http://127.0.0.1:8123/scripts/teaching-labs/web/network-demo.html`。页面使用真实 XHR 和 Fetch 请求本地 API，不用网络 mock。

先分别按 `XHR 加载订单` 与 `Fetch 加载订单`，两者都应返回带 `query: "ready"` 的 JSON。XHR 失败按钮请求 `/api/error`，显示 HTTP 503 和响应正文；Fetch 失败按钮请求不存在的 `/api/missing`，helper 显示 `HTTP 404`，因为它主动把非 2xx 转成 reject。慢请求按钮配合取消按钮应显示 `XHR 已取消。` 或 `Fetch 已取消。`。

latest-wins 验收时先点“先开始慢搜索 old”，立刻点“再开始快搜索 new”。Network 面板中 old 请求会被浏览器 abort，页面最终只显示 `query: "new"`。页面中的稳定按钮 ID 是 `xhr-success`、`xhr-failure`、`xhr-cancel-start`、`xhr-cancel`、`fetch-success`、`fetch-failure`、`fetch-cancel-start`、`fetch-cancel`、`search-old` 和 `search-new`。服务端 delay 是请求延时，取消客户端请求不会证明服务端副作用回滚。

## 来源

XHR 与 Fetch 的适用边界参考 [MDN XHR API](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API)、[Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)、[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) 和 [Streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)。练习范围对照 [GreatFrontEnd JS interview playbook](https://www.greatfrontend.com/front-end-interview-playbook/javascript)。
