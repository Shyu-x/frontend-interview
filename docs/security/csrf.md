---
title: CSRF
description: 以浏览器自动附带凭据的请求为起点分析 CSRF，比较 SameSite、同步令牌与 Origin 校验的覆盖边界，并说明跨站子域和登录状态切换时的失败情形。
tags: [security, browser, csrf]
date: 2026-10-13
level: intermediate
prerequisites: [Cookie, Origin 与站点概念, 表单提交]
runnable: false
tested_with: []
verified_at: 2026-10-13
verified_scope: 只核对新增的 SameSite、token 与来源校验边界。
---

# CSRF

## 1. CSRF（跨站请求伪造）

### 1.1 什么是CSRF

CSRF（Cross-Site Request Forgery）利用用户已登录的身份，诱导用户浏览器向目标站点发起非预期的请求：

**攻击流程：**

| 步骤 | 说明 |
|------|------|
| 1 | 正常用户登录银行网站，设置 Cookie: sessionId=abc123 |
| 2 | 攻击者构造恶意页面 https://evil.com/csrf |
| 3 | 用户访问 evil.com，浏览器加载 HTML 自动提交表单 |
| 4 | 请求发送到 bank.com，自动携带 cookie |
| 5 | 银行验证 cookie（有效），执行转账 |
| 6 | 用户毫不知情 |

**恶意页面示例：**

## SameSite 是默认防线，不是完整授权策略 {#handwrite-csrf-samesite-boundary}

`SameSite=Lax` 通常阻止跨站子资源请求携带 Cookie，但顶级安全导航和站点定义会影响实际行为；同站不同源子域也不能简单等同跨站。对有副作用的请求仍应校验 CSRF token，并结合 `Origin` 或 `Referer` 做请求来源检查。[OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

验收时至少覆盖：无 token 的跨站表单拒绝、合法 token 的同站提交成功、登录后会话轮换时旧 token 失效。GET 不应修改业务状态，否则 SameSite 对顶级导航的限制无法承担安全边界。

同步令牌方案通常先为会话生成不可预测 token，服务端把 token 绑定到 session，页面从安全的初始化接口获得 token，并在每个状态变更请求头中回传。服务端使用常量 API 比较 token 并验证 session；若框架将 CSRF token 暴露在可被 XSS 读取的 DOM 中，XSS 仍能绕过该防线，因此 token 防护不取代输出编码和 CSP。

```pseudocode
POST /transfer
读取 session 中的 csrfSecret
读取请求头 X-CSRF-Token
若 token 缺失或不匹配: 返回 403，不执行副作用
校验 Origin / Referer 与允许站点策略
验证余额、收款人和重复提交键
在事务中提交转账和审计记录
```

成功标准不是页面不显示错误，而是拒绝请求后数据库余额不变且审计记录标明拒绝原因；允许请求则只提交一次。SameSite 可能阻止某些请求自动带 Cookie，但它无法证明一次跨站请求在业务层绝对不会携带身份信息。
```html
<html>
<body onload='document.forms[0].submit()'>
<form action='https://bank.com/transfer' method='POST'>
  <input name='to' value='attacker' />
  <input name='amount' value='10000' />
</form>
</body>
</html>
```

### 1.2 CSRF为什么能成功

CSRF成立的两个前提：

1. **浏览器自动携带Cookie**：符合HTTP规范，浏览器发往`bank.com`的请求会自动携带该域的Cookie
2. **Cookie-based认证**：服务器只验证Cookie，不验证请求来源

```
攻击者无法做到:
  × 读取bank.com的Cookie(SOP限制)
  × 读取bank.com的响应(SOP限制)

攻击者可以做到:
  √ 诱导浏览器向bank.com发送请求(表单/图片/脚本均可发起GET/POST)
  √ 浏览器会自动携带bank.com的Cookie
  √ 服务器只验证Cookie有效性,不验证请求来源
```

### 1.3 SameSite Cookie原理

```http
SameSite=Lax  (Chrome 67+ 默认)
Set-Cookie: sessionId=abc123; SameSite=Lax

SameSite=Strict
Set-Cookie: sessionId=abc123; SameSite=Strict

SameSite=None (需要Secure)
Set-Cookie: sessionId=abc123; SameSite=None; Secure
```

```
SameSite行为:
  Strict  → 所有跨站请求都不携带cookie
            用户从外部链接跳转也不行(体验差)
  Lax     → GET请求允许携带cookie, POST/iframe不允许
            (大多数CSRF是POST, Lax可以防护大部分)
  None    → 不限制(旧行为,需要Secure)

实际例子:
  SameSite=Lax时:
    <a href="https://bank.com"> → GET, 携带cookie √
    <form method="POST">        → POST, 不携带cookie ×
    <img src="https://bank.com/api"> → GET, 携带cookie √
    第三方页面JS fetch()        → 不携带cookie ×
```

### 1.4 CSRF Token原理

```html
<!-- 服务器响应: HTML表单中嵌入token -->
<form action="/transfer" method="POST">
  <input type="hidden" name="csrf_token" value="7k3d9f2...">
  ...
</form>
```

```javascript
// 服务器端验证CSRF Token
function validateCsrfToken(req) {
  const sessionToken = req.session.csrfToken;    // 从Session读取
  const requestToken = req.body.csrf_token ||    // POST body
                      req.headers['x-csrf-token']; // 或header

  if (!sessionToken || !requestToken) {
    throw new Error('Missing CSRF token');
  }

  if (!crypto.timingSafeEqual(
    Buffer.from(sessionToken),
    Buffer.from(requestToken)
  )) {
    throw new Error('Invalid CSRF token');
  }
}
```

```
CSRF Token防护原理:
  攻击者构造恶意页面时:
    - 无法读取目标页面的HTML(同源策略)
    - 无法获取表单中的csrf_token值
    - 发送的请求不带正确的csrf_token
    - 服务器验证失败 → 请求被拒绝
```

### 1.5 为什么XSS能绕过CSRF

XSS攻击者可以通过JS读取页面内容，从而获取CSRF Token：

```javascript
// 存储型XSS注入后,攻击者可以:
// 1. 读取页面中的CSRF Token
const token = document.querySelector('input[name="csrf_token"]').value;

// 2. 使用正确的Token发起请求(绕过CSRF防护)
fetch('/transfer', {
  method: 'POST',
  body: `to=attacker&amount=10000&csrf_token=${token}`,
  credentials: 'include'  // 携带Cookie
});

// 3. 甚至可以读取响应内容
const response = await fetch('/transfer');
const result = await response.text();
sendToAttacker(result);
```

```
防御思路:
  XSS是CSRF Token的"天敌":
    × 纯前端CSRF Token → XSS可以读取
    √ 真正解决方案:
       (1) 严格防护XSS(消除XSS才能保证CSRF防护有效)
       (2) 使用SameSite Cookie(不依赖Token)
       (3) 验证Origin/Referer头(辅助手段)
```

