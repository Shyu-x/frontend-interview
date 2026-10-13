---
title: 前端业务状态手写题解：购物车、保存与结算 W017–W024
description: 通过购物车计价、乐观收藏、令牌刷新、分页、自动保存冲突、结算状态、草稿合并和 URL 筛选，练习前端业务中的金额精度、竞态保护、幂等状态转换与可分享状态。
tags: [coding, interview, business-state, frontend]
date: 2026-10-13
level: intermediate
prerequisites:
  - JavaScript 对象、Promise、URLSearchParams
  - Node.js 20+
runnable: true
tested_with:
  - node@24.16.0
verified_at: 2026-10-13
source_commit: 27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb
---

# 前端业务状态手写题解 购物车、保存与结算 W017–W024

这组题把小算法放进可辨认的产品行为里：价格以分存储、收藏失败撤回、同一用户只刷新一次令牌、旧分页不污染新筛选、草稿冲突可见、付款状态不跳步。完整函数在 [`business.mjs`](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/web/business.mjs)，每题有成功与失败测试，运行 `node --test scripts/teaching-labs/web/business.test.mjs`。

## W017 购物车总价 先确定单位再相加 {#w017}

用户购物车有两件 199 分商品和一件 500 分商品，优惠券减 100 分。`cartTotal` 返回 `798`，而不是浮点数 `7.979999…`。数量、单价和优惠都必须是非负安全整数。

```js
subtotal += unitCents * quantity;
if (!Number.isSafeInteger(subtotal)) throw new RangeError('subtotal overflow');
return Math.max(0, subtotal - discountCents);
```

用整数最小货币单位可精确表示加减；先校验乘积累计没有超出安全整数范围，再封顶优惠。反例是把金额转成美元浮点计算，到结算时才四舍五入；订单行和税额分摊会产生不同误差。测试覆盖优惠大于小计、负单价和溢出。生产系统仍需明确币种及小数位，不能假设所有币种都是两位小数。

## W018 乐观收藏 回滚只能撤销自己的那次更新 {#w018}

用户点击收藏后，界面立即把 `liked` 改成 `true`。请求失败时还原；但若用户第二次点击已经把它关掉，第一次请求的迟到失败不能把新值覆盖。

```js
const revision = (state.__revision ?? 0) + 1;
const next = { ...state, [id]: !previous, __revision: revision };
return { state: next, rollback(current) {
  return current.__revision === revision
    ? { ...current, [id]: previous, __revision: revision + 1 }
    : current;
} };
```

回滚闭包带有创建它时的修订号。只有状态仍属于这次乐观写入才还原；比较布尔值本身不够，因为用户可能经历 `false → true → false`。测试模拟乱序失败。后端写入还要定义幂等与最终一致策略。

## W019 Token refresh 十个 401 共用一趟刷新 {#w019}

一个页面同时加载头像、订单和通知，三项请求都收到 401。若每个拦截器分别刷新，三次新 token 可能互相覆盖。`createTokenRefresher` 让并发调用拿到同一个 Promise；失败后允许下一次重新尝试。

```js
if (!pending) pending = Promise.resolve().then(refresh)
  .finally(() => { pending = undefined; });
return pending;
```

把调用放进 Promise 回调，保证同步 throw 也进入统一拒绝路径。清理放在 `finally`，成功和失败都解除 single-flight 锁。测试检查并发只调用一次、失败后下一轮能成功。刷新 token 的存储与跨标签页协调不由这个内存级函数解决。

## W020 分页 请求回来时确认筛选仍相同 {#w020}

用户先看“图书”第 2 页，随后切到“音乐”；旧图书请求晚到时不能被 append 到音乐列表。分页器 `reset(query)` 会生成新 generation，`next(state)` 返回 `stale: true` 标记旧结果。

```js
reset(query) { generation++; return { generation, query, page: 0 }; }
async next(state) {
  const page = state.page + 1;
  const rows = await loadPage(state.query, page);
  return state.generation === generation ? { ...state, page, rows, stale: false } : { ...state, stale: true };
}
```

请求真正发出前固定 query/page，请求回来后再比代次。不能用“当前列表长度除以页大小”推页码，因为筛选切换、重复触底和空页都会破坏这个推断。测试通过 Deferred 请求让旧页晚于 reset 返回。生产列表还要决定 append、去重和 `hasMore` 的数据合同。

## W021 自动保存 HTTP 409 不是普通网络错误 {#w021}

文档编辑器保存本地草稿 `{ title: 'mine' }`，带 `If-Match: v4`。服务器发现版本已到 v5，返回 409 与远端草稿；界面应保留本地内容并展示冲突入口，不应静默覆盖。

```js
try {
  const saved = await put({ draft, ifMatch: version });
  return { status: 'saved', draft: saved.draft, version: saved.version };
} catch (error) {
  if (error.status === 409) return { status: 'conflict', local: draft, remote: error.remote, version: error.version };
  throw error;
}
```

只把已知冲突变成明确结果；断网和 500 仍然 reject，调用方可以安排重试。若将所有错误都当冲突，会把未知数据结构交给合并界面。测试分别覆盖冲突保留本地内容和网络错误继续传播。

## W022 Checkout 状态 不能从失败直接宣布付款成功 {#w022}

结算提交过程是 `cart → submitting → paid`，失败后允许 `submitting → failed → submitting`。重复点击应被忽略；迟到或重复的支付回调不能把 `paid` 再次转换。

```js
const checkoutTransitions = {
  cart: ['submitting'], submitting: ['paid', 'failed'],
  failed: ['submitting'], paid: [],
};
if (!checkoutTransitions[state]?.includes(next)) throw new Error('Invalid transition');
```

状态表把合法转移当数据校验，而不是在多个点击处理器里散落布尔条件。浏览器状态机仍不是支付真相来源；服务端需要确认交易并处理重复 webhook。测试覆盖正常路径、失败重试和重复成功事件。

## W023 草稿合并 字段独立时可自动合并，碰撞时要标出 {#w023}

离线表单里用户改了标题，服务器同时改了正文。每字段带 `value` 和 `editedAt`，较新版本胜出；同一字段同一时刻出现不同值时，把字段名放入 `conflicts`，并采用服务器值作为临时展示结果。

```js
if (l.value === r.value) result[key] = l;
else {
  if (l.editedAt === r.editedAt) conflicts.push(key);
  result[key] = l.editedAt > r.editedAt ? l : r;
}
```

采用字段级元数据，不会因标题冲突而丢弃正文的独立修改。时间戳来自不同设备时未必可比较，因此本题的 tie-breaker 只为可重复测试提供确定结果，协作编辑应改用版本向量或操作日志。测试覆盖无冲突合并与相同时间戳冲突。

## W024 URL filters 链接可分享，状态可恢复 {#w024}

商品页 URL `?page=2&sort=price&tag=b&tag=a&tag=b` 被规范化为 `{ page: 2, sort: 'price', tags: ['a','b'] }`；序列化后得到 `?page=2&sort=price&tag=a&tag=b`。

```js
const page = Number(params.get('page') ?? 1);
if (!Number.isSafeInteger(page) || page < 1) throw new RangeError('page must be positive');
const rawSort = params.get('sort');
const sort = ['newest', 'price'].includes(rawSort) ? rawSort : 'newest';
const tags = [...new Set(params.getAll('tag').filter(Boolean))].sort();
return { page, sort, tags };
```

URL 是外部输入，页码必须校验；tag 先去重再排序，使同一筛选生成稳定链接和缓存键。未知排序值回落到 `newest`。测试覆盖规范 round trip、重复标签与非法页码。真实业务需决定 query 参数是否保留未知键以及浏览器 history 的 push/replace 策略。

## 复现与题型来源

运行 Node 24.16.0 下的 16 项定向测试：`node --test scripts/teaching-labs/web/business.test.mjs`。题型范围与 [GreatFrontEnd 的 JavaScript 面试指南](https://www.greatfrontend.com/front-end-interview-playbook/javascript)中的缓存、异步与实用函数方向对照；具体业务合同由本页逐题定义，不表示来自某家公司面试题。
