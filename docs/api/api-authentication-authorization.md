---
title: "API 认证与授权：Key、JWT、OAuth2、OIDC、PKCE"
description: "从 API Key 到 OAuth2 的全部套路"
---

# API 认证与授权：Key、JWT、OAuth2、OIDC、PKCE

!!! abstract "学完这一页你能"
    1. 说出 API Key、Basic、Bearer 三种头的适用场景，并能写出正确请求头。
    2. 手写 HS256 JWT 的签发与校验，判断载荷是否被篡改并说明 JWT 不防什么。
    3. 画出 OAuth2 授权码加 PKCE 流程，说明 code、verifier、challenge、access token 各自流向。
    4. 区分 access token、refresh token、ID token，并说清 mTLS 与 OIDC 各自解决的问题。

## 0. 知识地图

```mermaid
flowchart TD
  H1["HTTP 认证头"] --> K1["API Key"]
  H1 --> K2["Basic 认证"]
  H1 --> K3["Bearer 令牌"]
  K3 --> J["JWT 结构"]
  S["会话技术"] --> C1["服务端 Session"]
  S --> C2["令牌 Token"]
  C2 --> J
  O["OAuth2 协议"] --> F1["授权码流程"]
  F1 --> P["PKCE 防护"]
  O --> OI["OIDC 身份层"]
  O --> R["刷新令牌"]
  T["传输层"] --> M["mTLS 双向证书"]
```

建议这样读：先读第 1、2 节搞清"请求头与会话状态"两个地基；再读第 3 节学会手写 JWT；第 4 到 7 节是一套 OAuth2 升级链；最后第 8 节回到传输层收口。

## 1. API Key、Basic、Bearer：三种凭证写法

**先想一个问题**：你写了一个内部 API，只想让拿到密钥的同事和服务能调用。请求发过来时，凭证应该放在哪、长什么样？

!!! note "术语：API Key"
    一段静态字符串，服务端提前发给调用方，调用方每次请求带上，服务端查表比对。例子：请求头 `X-API-Key: sk_test_abc123`。

!!! note "术语：Basic 认证"
    HTTP 头携带 `用户名:密码` 的 Base64 编码，前缀是 `Basic`。例子：`Authorization: Basic YWxpY2U6czNjcmV0`。

!!! note "术语：Bearer 认证"
    HTTP 头只放一个"持有即有效"的令牌，前缀是 `Bearer`。例子：`Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.x.y`。

**心智模型**

!!! tip "心智模型"
    一句话模型：认证头就是"把凭证放进门卫会看的那一栏"，三种头只是格式不同。
    打比方：进写字楼要给门卫看工牌；API Key 是把工牌号写在专属卡片位，Basic 是把姓名工号装进透明信封，Bearer 是出示一张有防伪的通行证。
    不成立处：HTTP 头默认明文可见，透明信封只是换了个写法，没有密码学保护。

**图解**

```mermaid
sequenceDiagram
  participant C as "客户端"
  participant S as "API 服务器"
  C ->> S: "GET 请求带 X-API-Key 头"
  S ->> S: "查密钥表做恒等比较"
  S -->> C: "200 数据或 401 未授权"
  C ->> S: "GET 请求带 Authorization Basic 头"
  S ->> S: "Base64 解码后比对账号密码"
  S -->> C: "200 数据或 401 未授权"
  C ->> S: "GET 请求带 Authorization Bearer 头"
  S ->> S: "验签或查令牌表"
  S -->> C: "200 数据或 401 未授权"
```

1. 客户端把凭证放进请求头，服务器从固定字段读取。
2. API Key 与 Basic 都查服务端存储做比对。
3. Bearer 可以查表，也可以只做密码学校验。
4. 三种方式的响应语义统一：通过给 200，不通过给 401。

**一步一步来**

第 1 步，校验 API Key 头。

```js
import { createServer } from 'node:http';
const VALID_KEY = 'sk_test_abc123'; // 真实项目从环境变量读取

const server = createServer((req, res) => {
  const key = req.headers['x-api-key'];      // 读取 API Key 头
  if (key !== VALID_KEY) {                    // 恒等比较 不做模糊匹配
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end('{"error":"invalid_api_key"}');
    return;
  }
  res.writeHead(200);
  res.end('{"data":[1,2,3]}');
});
server.listen(3000);
```

**这段代码在做什么**

- 从 `x-api-key` 头拿值，头名字段大小写不敏感。
- 用 `!==` 恒等比较，不做 `includes` 子串匹配。
- 失败返回 401，响应体只说 `invalid_api_key`，不暴露是密钥错还是格式错。
- 密钥放在环境变量，不写进代码库。

第 2 步，生成 Basic 头。Base64 是可逆编码，不是加密。

```js
function basicHeader(username, password) {
  const raw = `${username}:${password}`;              // 先拼 用户名:密码
  return 'Basic ' + Buffer.from(raw).toString('base64'); // 再做 Base64
}
console.log(basicHeader('alice', 's3cret'));
```

**这段代码在做什么**

- 把用户名和密码用冒号连接。
- 对连接结果做 Base64 编码，加上 `Basic ` 前缀。
- Base64 可逆，任何拿到头的人都能解码还原密码。
- 所以 Basic 只能跑在 HTTPS 上，不能跑在明文 HTTP 上。

运行结果：

```text
Basic YWxpY2U6czNjcmV0
```

第 3 步，生成 Bearer 头。重点是"持有即有效"。

```js
function bearerHeader(token) {
  return `Bearer ${token}`;  // 固定前缀加一个空格 后面是令牌
}
const token = 'abc.def.ghi'; // 这里用占位串 第 3 节改成真令牌
console.log(bearerHeader(token));
```

**这段代码在做什么**

- 前缀 `Bearer` 与令牌之间是单个空格。
- 服务器只看令牌本身，不关心令牌是怎么编码的。
- JWT、OAuth2 access token 都复用这个头格式。

运行结果：

```text
Bearer abc.def.ghi
```

**动手验证**

把三种头与一个 API Key 校验器写成一个文件 `demo.mjs`，运行 `node demo.mjs`。

```js
import assert from 'node:assert/strict';

function basicHeader(username, password) {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}
function bearerHeader(token) {
  return `Bearer ${token}`;
}

const VALID_KEY = 'key-123';
function checkApiKey(reqKey) {
  if (reqKey !== VALID_KEY) {
    return { status: 401, body: 'invalid_api_key' };
  }
  return { status: 200, body: 'ok' };
}

assert.equal(basicHeader('alice', 's3cret'), 'Basic YWxpY2U6czNjcmV0');
assert.equal(bearerHeader('abc.def.ghi'), 'Bearer abc.def.ghi');
assert.equal(checkApiKey('key-123').status, 200);
assert.equal(checkApiKey('key-999').status, 401);
console.log('三种认证头格式与 API Key 校验通过');
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| Basic 被人解出明文密码 | Base64 可逆，不是加密 | 全链路强制 HTTPS |
| API Key 放进 URL 查询参数 | URL 会进入访问日志与浏览器历史 | 改放请求头 |
| 用 `includes` 判断密钥 | 子串 `abc` 能命中 `abc123` 之外的密钥 | 用 `===` 恒等比较 |

**小结**

- 三种头解决同一件事：请求要带凭证；区别在格式与可逆性。
- API Key 适合服务间简单调用，Basic 必须配 HTTPS。
- Bearer 是"出示令牌"的通用约定，OAuth2 与 JWT 都复用这个头。

## 2. Session 与 Token：状态放在哪

**先想一个问题**：用户登录成功后，服务器怎么知道下一个请求还是同一个人？状态应该由服务器记，还是写在令牌里让用户带回来？

**心智模型**

!!! tip "心智模型"
    一句话模型：Session 是服务器记档案，Token 是服务器验票。
    打比方：存包处给你一张号码牌，柜子在服务端；演出票把座位印在票上，验票员不用查档案。
    不成立处：演出票丢了难挂失，服务端会话可以随时作废。

**图解**

```mermaid
flowchart TD
  R["请求到达"] --> Q{"带 Cookie 还是 Authorization 头"}
  Q -->|"带会话 Cookie"| S1["服务器查内存 Session 表"]
  Q -->|"带 Bearer 令牌"| S2["服务器验签或查令牌表"]
  S1 --> O1["状态在服务端 可主动注销"]
  S2 --> O2["状态在令牌中 服务端不存"]
```

1. 带 Cookie 的请求走查表路线，服务器必须存储每个会话。
2. 带 Bearer 的请求可以只验签，不需要查任何存储。
3. Session 能让服务器主动踢人；Token 天生支持多实例扩展。
4. Token 被偷后难以立即吊销，这是用无状态换来的代价。

**一步一步来**

第 1 步，用内存 Map 实现服务端 Session。

```js
import { randomUUID } from 'node:crypto';

const sessions = new Map();               // 内存会话表

export function createSession(userId) {
  const sid = randomUUID();               // 不可猜测的会话 ID
  sessions.set(sid, { userId, createdAt: Date.now() });
  return sid;
}

export function getSession(sid) {
  const s = sessions.get(sid);
  if (!s || Date.now() - s.createdAt > 30 * 60 * 1000) return null;
  return s;                               // 30 分钟未活动则过期
}
```

**这段代码在做什么**

- `randomUUID` 生成的 ID 长度 122 位随机，无法被枚举。
- 会话数据存在服务器内存，客户端只拿到一个 ID。
- 服务器可以通过删除 `sessions` 里的条目立即吊销会话。
- 内存存储单进程可用，多实例需要换成 Redis 等共享存储。

第 2 步，用 HMAC 实现无状态 Token 的签发与校验。

```js
import { createHmac, randomBytes } from 'node:crypto';

const SECRET = process.env.APP_SECRET ?? randomBytes(32).toString('hex');

export function issueToken(userId) {
  const payload = `${userId}.${Date.now()}`;          // 载荷:用户加时间
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;                          // 三段式令牌
}

export function verifyToken(token) {
  const [userId, ts, sig] = token.split('.');
  const expected = createHmac('sha256', SECRET).update(`${userId}.${ts}`).digest('hex');
  return sig === expected ? userId : null;             // 签名一致才认
}
```

**这段代码在做什么**

- 令牌由载荷与签名拼成，服务器不保存任何状态。
- 服务器用同一个密钥重算签名，比对结果判断真伪。
- 这里的字符串比较是演示写法，第 3 节会用 `timingSafeEqual`。
- 只要能拿回原密钥，任何实例都能独立验证令牌。

**动手验证**

把 Session 查表与 Token 验签放进一个文件 `demo.mjs` 运行。

```js
import assert from 'node:assert/strict';
import { randomUUID, createHmac, randomBytes } from 'node:crypto';

const sessions = new Map();
function createSession(userId) {
  const sid = randomUUID();
  sessions.set(sid, { userId, createdAt: Date.now() });
  return sid;
}
function getSession(sid, maxAgeMs = 30 * 60 * 1000) {
  const s = sessions.get(sid);
  if (!s || Date.now() - s.createdAt > maxAgeMs) return null;
  return s;
}

const SECRET = randomBytes(32).toString('hex');
function issueToken(userId) {
  const payload = `${userId}.${Date.now()}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}
function verifyToken(token) {
  const [userId, ts, sig] = token.split('.');
  const expected = createHmac('sha256', SECRET).update(`${userId}.${ts}`).digest('hex');
  return sig === expected ? userId : null;
}

const sid = createSession('u1');
assert.equal(getSession(sid).userId, 'u1');
assert.equal(getSession('no-such-id'), null);

const tok = issueToken('u1');
assert.equal(verifyToken(tok), 'u1');
const parts = tok.split('.');
const tampered = `${parts[0]}x.${parts[1]}.${parts[2]}`;
assert.equal(verifyToken(tampered), null); // 载荷改一个字母 签名不再匹配
console.log('Session 查表与无状态令牌校验都通过');
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 服务器重启后所有人掉线 | Session 存进程内存 | 换成 Redis 等外部存储 |
| 多实例一台能登录一台 401 | Session 没有跨实例共享 | 共享存储或用无状态令牌 |
| 吊销无状态令牌无效 | 服务器不保存令牌状态 | 引入短期令牌加撤销名单 |

**小结**

- Session 状态在服务端，可立即吊销，但要做共享存储。
- Token 状态编码在令牌里，无状态易扩展，但吊销困难。
- 选型看两点：要不要服务端主动踢人，要不要跨多实例扩展。

## 3. JWT：结构、手写签名与风险

**先想一个问题**：你能写一段不查数据库、却能确认"这个令牌没被改过"的代码吗？JWT 解决的就是这件事。

!!! note "术语：JWT"
    JSON Web Token，三段式字符串：头部、载荷、签名，段间用点连接，每段是 Base64URL 编码。例子：`aaaa.bbbb.cccc`。

**心智模型**

!!! tip "心智模型"
    一句话模型：JWT 是带防伪签名的一段文字，不是加密盒。
    打比方：医生开的处方上盖了防伪章，患者改不了内容，但任何人翻开都能读内容。
    不成立处：防伪章可以被高倍扫描复制，签名也可能被拿到密钥的人重算。

**图解**

```mermaid
flowchart TD
  T["完整 JWT"] --> H["第一段 头部 Base64URL"]
  T --> P["第二段 载荷 Base64URL"]
  T --> S["第三段 签名 Base64URL"]
  P --> R["载荷可被任何人解码阅读"]
  S --> V["服务器用密钥重算签名"]
  V --> C{"两个签名一致吗"}
  C -->|"一致"| OK["接受请求"]
  C -->|"不一致"| NO["返回 401"]
```

1. 第一段声明算法，例如 HS256，即 HMAC-SHA256。
2. 第二段是声明，可被任何人解码，不能放身份证号等敏感数据。
3. 第三段是对前两段做 HMAC 得到的签名。
4. 服务器重算第三段，比对是否一致；不一致说明被改过。

**一步一步来**

第 1 步，写 Base64URL 编码头部与载荷。

```js
function b64url(data) {
  return Buffer.from(data).toString('base64url'); // Node 20 原生支持
}

const header = { alg: 'HS256', typ: 'JWT' };
const payload = { sub: 'user_42', iat: 1710000000, exp: 1710003600 };

console.log(b64url(JSON.stringify(header)));
// 输出 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

**这段代码在做什么**

- `JSON.stringify` 把对象变成紧凑 JSON 字符串。
- `base64url` 与普通 Base64 的区别是 URL 安全：把 `+` 变 `-`，`/` 变 `_`，去掉 `=`。
- `sub` 是主题，即用户 ID；`iat` 是签发时间；`exp` 是过期时间，均为秒级时间戳。
- 头部与载荷都能解码，JWT 不加密。

第 2 步，用 HMAC-SHA256 签名并拼出三段。

```js
import { createHmac } from 'node:crypto';

const SECRET = 'x'.repeat(32); // 生产用随机 32 字节以上密钥

function sign(secret, header, payload) {
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const data = `${h}.${p}`;                       // 签名对象是前两段
  const sig = createHmac('sha256', secret)
    .update(data)
    .digest('base64url');                         // 第三段签名
  return `${data}.${sig}`;
}

const token = sign(SECRET, header, payload);
console.log(token);
```

**这段代码在做什么**

- `createHmac('sha256', secret)` 创建一个带密钥的散列函数。
- 只对前两段签名，改任何一段都会让签名失效。
- 密钥长度过短会被暴力枚举，32 字节随机值是下限。
- 输出形如 `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyXzQyIn0.sig`。

第 3 步，校验签名并用常量时间比较防时序攻击。

```js
import { timingSafeEqual } from 'node:crypto';

function verify(secret, token) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;     // 结构不对直接拒绝
  const data = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts[2]);
  return a.length === b.length && timingSafeEqual(a, b);
}

console.log(verify(SECRET, token));                 // true
console.log(verify(SECRET, token.slice(0, -1) + 'x')); // false
console.log(verify('wrong-secret', token));         // false
```

**这段代码在做什么**

- 先检查三段结构，避免数组越界。
- `timingSafeEqual` 逐字节比较且不提前返回，防止通过耗时差猜测签名。
- 两段长度不等时直接返回 false，因为 `timingSafeEqual` 要求等长。
- `alg:none` 攻击的防护是不信任客户端声明的算法，固定服务器只认 HS256。

**动手验证**

完整脚本 `jwt.mjs`，运行 `node jwt.mjs`，用断言验证签发与篡改检测。

```js
import assert from 'node:assert/strict';
import { createHmac, timingSafeEqual } from 'node:crypto';

const b64url = (data) => Buffer.from(data).toString('base64url');
const SECRET = 'x'.repeat(32);
const header = { alg: 'HS256', typ: 'JWT' };
const payload = { sub: 'user_42', iat: 1710000000, exp: 1710003600 };

function sign(secret, h, p) {
  const hh = b64url(JSON.stringify(h));
  const pp = b64url(JSON.stringify(p));
  const data = `${hh}.${pp}`;
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}
function verify(secret, token) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', secret).update(data).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts[2]);
  return a.length === b.length && timingSafeEqual(a, b);
}

const token = sign(SECRET, header, payload);
assert.equal(token.split('.').length, 3);
assert.equal(verify(SECRET, token), true);
assert.equal(verify('bad', token), false);
const [h, p, s] = token.split('.');
const fakePayload = b64url(JSON.stringify({ sub: 'user_42', admin: true }));
assert.equal(verify(SECRET, `${h}.${fakePayload}.${s}`), false);
console.log('签发通过 篡改载荷被拒 错误密钥被拒');
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 不带签名的令牌被接受 | 服务器信任头部声明的 `alg: none` | 服务端固定算法白名单 |
| 载荷里的密码被外人读到 | JWT 只签名不加密 | 敏感数据放服务器或改用 JWE |
| 前端把 JWT 存 localStorage 被脚本读取 | 同源脚本均可访问 localStorage | 用 httpOnly Cookie 或内存持有 |
| 弱密钥被暴力破解 | 密钥太短或可预测 | 随机 32 字节以上并定期轮换 |

**小结**

- JWT 是三段 Base64URL：头部、载荷、签名，前两段可读、第三段防篡改。
- 校验要固定算法、用强密钥、用常量时间比较。
- JWT 不加密，不防读取，也不解决吊销问题。

## 4. OAuth2：授权码流程与各授权类型

**先想一个问题**：用户想让你这个第三方 App 读取他网盘里的文件，你会让用户把网盘密码交给你吗？不会。这正是 OAuth2 要解决的。

!!! note "术语：OAuth2"
    OAuth 2.0 授权框架，定义第三方应用如何在不拿到用户密码的情况下，获得受限资源的访问权。核心是授权服务器签发 access token。

**心智模型**

!!! tip "心智模型"
    一句话模型：OAuth2 是让用户授权前台给访客发一张临时门卡，访客永远拿不到主钥匙。
    打比方：住客对前台说"给这位访客开 302 房间"，前台给访客一张只能开 302 的门卡，卡丢了可作废。
    不成立处：门卡有实体丢失风险，access token 有数字复制风险，短有效期与刷新令牌才是对冲手段。

**图解**

```mermaid
sequenceDiagram
  participant U as "用户浏览器"
  participant C as "第三方应用"
  participant A as "授权服务器"
  participant R as "资源服务器"
  U ->> C: "点击使用网盘登录"
  C ->> U: "重定向到授权服务器 带 client_id scope state"
  U ->> A: "输入账号密码并同意授权"
  A -->> U: "携带授权码重定向回第三方应用回调地址"
  U ->> C: "带 code 与 state 访问回调"
  C ->> C: "校验 state 防 CSRF"
  C ->> A: "用 code 加 client_secret 换 token"
  A -->> C: "返回 access_token"
  C ->> R: "带 Bearer access_token 读取文件"
  R -->> C: "返回文件列表"
```

1. 用户同意后拿到的是授权码，不是 access token。
2. 授权码经过浏览器重定向，暴露在地址栏与日志里，必须一次性且短命。
3. token 兑换发生在第三方应用后端与授权服务器之间，浏览器不可见。
4. `state` 是本应用生成的随机值，带回时必须一致，防止登录 CSRF。

**一步一步来**

第 1 步，构造授权请求 URL，让用户去授权服务器登录。

```js
function buildAuthzRequest({ authzEndpoint, clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    response_type: 'code',        // 我要授权码
    client_id: clientId,          // 谁在请求
    redirect_uri: redirectUri,    // 用户同意后回哪里
    scope: 'files.read',          // 要什么权限
    state,                         // 防 CSRF 随机值
  });
  return `${authzEndpoint}?${params}`;
}

const url = buildAuthzRequest({
  authzEndpoint: 'https://auth.example.com/authorize',
  clientId: 'app_3',
  redirectUri: 'https://app.example.com/cb',
  state: 'rAnDoM123',
});
console.log(url);
```

**这段代码在做什么**

- `response_type=code` 明确要走授权码流程。
- `scope` 声明最小权限，只申请 `files.read`，不申请 `files.write`。
- `state` 由本应用生成并保存，回调时比对。
- 目标 URL 是让浏览器跳转，代码只负责拼字符串。

第 2 步，模拟用户同意，授权服务器签发一次性 code。

```js
import { randomUUID } from 'node:crypto';

const codes = new Map(); // 授权码存储

function approve({ clientId, redirectUri, user, state }) {
  const code = randomUUID();               // 一次性授权码
  codes.set(code, { clientId, redirectUri, user, used: false });
  return `${redirectUri}?code=${code}&state=${state}`; // 浏览器跳回
}

const redirect = approve({
  clientId: 'app_3', redirectUri: 'https://app.example.com/cb',
  user: 'u_7', state: 'rAnDoM123',
});
console.log(redirect);
```

**这段代码在做什么**

- code 与 clientId、redirectUri、用户绑定，换 token 时要逐项核对。
- `used` 标志保证一个 code 只能用一次。
- 真实实现中 code 有效期约 60 秒，这里的演示省略过期时间。
- code 不能直接当 token 用，因为它是通过浏览器中转的。

第 3 步，后端用 code 换 access token 并标记已使用。

```js
function exchange({ code, clientId, clientSecret }) {
  const record = codes.get(code);
  if (!record || record.used) throw new Error('invalid_grant'); // 一次一用
  if (record.clientId !== clientId) throw new Error('client_mismatch');
  // 真实实现还要校验 clientSecret 与 redirect_uri
  record.used = true;                                     // 立即标记已用
  return { access_token: randomUUID(), token_type: 'Bearer', expires_in: 3600 };
}

const codeFromUrl = new URL(redirect).searchParams.get('code');
const { access_token } = exchange({
  code: codeFromUrl, clientId: 'app_3', clientSecret: 'secret_of_app_3',
});
console.log(access_token);
```

**这段代码在做什么**

- 先查 code 是否存在、是否已用，避免重放。
- 再核对请求方 clientId，防止别的应用拿这个 code 换 token。
- 换成功后马上把 `used` 置为 true。
- 真实授权服务器还要校验 `clientSecret` 与回调地址是否与签发时一致。

授权类型表：

| 授权类型 | 客户端场景 | 是否经过浏览器 | 现状 |
| --- | --- | --- | --- |
| authorization_code | 有后端的 Web 应用 | 是 | 推荐 |
| authorization_code 加 PKCE | 单页应用与移动应用 | 是 | 推荐 |
| client_credentials | 后端服务间调用 | 否 | 推荐 |
| device_code | 电视与物联网设备 | 是 双通道 | 推荐 |
| implicit | 旧版单页应用 | 是 | 已废弃 |
| password | 自家应用直采密码 | 否 | 已废弃 |

client_credentials 流程短，客户端用自己的身份换令牌：

```mermaid
sequenceDiagram
  participant U as "后端服务"
  participant A as "授权服务器"
  participant R as "资源服务器"
  U ->> A: "POST token 带 grant_type 为 client_credentials"
  U ->> A: "带 client_id 与 client_secret"
  A -->> U: "返回 access_token"
  U ->> R: "带 Bearer token 调用内部 API"
  R -->> U: "返回数据"
```

**动手验证**

完整脚本 `authcode.mjs`，验证授权码一次性与客户端绑定。

```js
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const codes = new Map();
function approve({ clientId, redirectUri, user, state }) {
  const code = randomUUID();
  codes.set(code, { clientId, redirectUri, user, used: false });
  return `${redirectUri}?code=${code}&state=${state}`;
}
function exchange({ code, clientId }) {
  const record = codes.get(code);
  if (!record || record.used) throw new Error('invalid_grant');
  if (record.clientId !== clientId) throw new Error('client_mismatch');
  record.used = true;
  return { access_token: randomUUID(), token_type: 'Bearer', expires_in: 3600 };
}

const url = approve({ clientId: 'app_3', redirectUri: 'https://app/cb', user: 'u_7', state: 's1' });
const code = new URL(url).searchParams.get('code');
assert.equal(new URL(url).searchParams.get('state'), 's1');

const tok = exchange({ code, clientId: 'app_3' });
assert.equal(tok.token_type, 'Bearer');
assert.throws(() => exchange({ code, clientId: 'app_3' }), /invalid_grant/);
assert.throws(() => exchange({ code: randomUUID(), clientId: 'app_3' }), /invalid_grant/);
console.log('授权码一次性与客户端绑定验证通过');
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 放到前端的 client_secret 被提取 | 前端代码公开 | 公共客户端改用 PKCE |
| 回调时不做 state 校验 | 少一步 CSRF 防护 | 带回的 state 必须与本地一致 |
| code 被重放换出多个 token | 服务端没有标记已用 | code 持久化并一次性消费 |
| redirect_uri 做前缀匹配 | 可被 `evil.com.evil` 类地址绕过 | 精确匹配注册的完整地址 |

**小结**

- 授权码流程核心：浏览器拿一次性 code，后端用 code 加 secret 换 token。
- code 不直接给资源访问权，因为它经过浏览器中转。
- 客户端类型决定授权类型；隐式与密码式已废弃。

## 5. PKCE：保护没有保密能力的公共客户端

**先想一个问题**：手机 App 和单页应用没有"能藏 client_secret 的服务器"，授权码又被浏览器中转，被截获了怎么办？

!!! note "术语：PKCE"
    Proof Key for Code Exchange，授权码交换证明密钥。客户端生成 `code_verifier`，只把它的 S256 摘要 `code_challenge` 发给授权服务器，换 token 时必须提交原值。

**心智模型**

!!! tip "心智模型"
    一句话模型：PKCE 是"自提码"机制，订的时候留暗号摘要，取的时候说暗号原文。
    打比方：网购自提柜下单时你生成一个提货暗号，柜机只存暗号的指纹；取件时必须报出暗号原文，指纹一致才开门。
    不成立处：提货暗号由收件人脑记，PKCE 的 verifier 由 App 生成，存在内存或安全存储里。

**图解**

```mermaid
sequenceDiagram
  participant C as "手机应用"
  participant A as "授权服务器"
  C ->> C: "生成 code_verifier 随机串"
  C ->> C: "用 S256 算出 code_challenge"
  C ->> A: "授权请求带 code_challenge 与方法 S256"
  A ->> C: "返回授权码"
  C ->> A: "换 token 时带授权码加 code_verifier"
  A ->> A: "对 verifier 做 S256 与 challenge 比对"
  A -->> C: "一致才发 access_token"
```

1. 首轮只传 challenge，有 code 的人不知道 verifier 也没用。
2. 换 token 时才传 verifier，服务器重新做 S256 比对。
3. challenge 是单向摘要，截获它无法反推 verifier。
4. 这个流程把"能请求"与"能兑换"绑定到同一个客户端实例。

**一步一步来**

第 1 步，客户端生成 verifier 与 challenge。

```js
import { createHash, randomBytes } from 'node:crypto';

const b64url = (buf) => buf.toString('base64url');

const verifier = b64url(randomBytes(32));       // 32 字节随机 约 43 字符
const challenge = b64url(
  createHash('sha256').update(verifier).digest(),
);
console.log({ verifier, challenge });
```

**这段代码在做什么**

- verifier 至少 43 字符，来自 32 字节随机数的 Base64URL。
- challenge 是 verifier 的 SHA-256 摘要再做 Base64URL。
- verifier 只保存在本客户端，challenge 才发往授权服务器。
- S256 必须用，plain 方法等于没保护。

第 2 步，服务器校验 challenge 与 verifier 是否匹配。

```js
function verifyChallenge(challenge, verifier) {
  const actual = b64url(createHash('sha256').update(verifier).digest());
  return actual === challenge;   // 重算摘要并比对
}

console.log(verifyChallenge(challenge, verifier));      // true
console.log(verifyChallenge(challenge, 'wrong'));       // false
```

**这段代码在做什么**

- 服务器不保存 verifier，只在兑换时保存 challenge。
- 校验就是对提交的 verifier 重做 S256，与授权请求时的 challenge 比对。
- 不匹配则拒绝发 token，报 `invalid_grant`。
- 每次授权都生成新 verifier，复用会让防护失效。

**动手验证**

完整脚本 `pkce.mjs`，运行 `node pkce.mjs`。

```js
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';

const b64url = (buf) => buf.toString('base64url');

const verifier = b64url(randomBytes(32));
assert.ok(verifier.length >= 43, '验证子至少 43 字符');
const challenge = b64url(createHash('sha256').update(verifier).digest());

function verifyChallenge(c, v) {
  return b64url(createHash('sha256').update(v).digest()) === c;
}

assert.equal(verifyChallenge(challenge, verifier), true);
assert.equal(verifyChallenge(challenge, b64url(randomBytes(32))), false);
console.log('PKCE S256 验证子与挑战值匹配逻辑通过');
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 授权码被截获后仍能换 token | 没有 PKCE 或用了 plain | 强制 S256 |
| 每次登录复用同一个 verifier | 截获一次可重放 | 每次授权生成新 verifier |
| 挑战值提交后不立即比对 | 兑换不同步 | 授权请求时就存储 challenge 并绑定 code |

**小结**

- PKCE 让公共客户端在不持有 client_secret 时也能安全用授权码流程。
- challenge 公开无害，verifier 只在换 token 时出现。
- 使用 S256 方法，拒绝 plain 方法。

## 6. OIDC：在 OAuth2 之上回答"你是谁"

**先想一个问题**：OAuth2 能证明"这个 App 有权访问数据"，但 App 自己怎么知道登录进来的是哪个人？

!!! note "术语：OIDC"
    OpenID Connect，构建在 OAuth2 之上的身份层。授权时加 `scope=openid`，令牌响应里多一个 ID Token，用 JWT 表达用户身份声明。

**心智模型**

!!! tip "心智模型"
    一句话模型：OIDC 给 OAuth2 的门卡贴上一张带照片的身份贴纸，贴纸就是 ID Token。
    打比方：门卡能开门，但不知道持卡人是谁；贴纸上有名字和有效期，前台核对贴纸就能登记访客。
    不成立处：贴纸可能被撕下来贴到别的卡上，所以 ID Token 必须校验 `aud` 受众。

**图解**

```mermaid
sequenceDiagram
  participant U as "用户浏览器"
  participant C as "第三方应用"
  participant P as "OIDC 身份提供方 OP"
  U ->> C: "点击使用统一身份登录"
  C ->> U: "重定向到 OP 带 scope 为 openid 与 nonce"
  U ->> P: "登录并同意"
  P -->> U: "带授权码重定向回来"
  U ->> C: "带 code 回调"
  C ->> P: "用 code 交换 token"
  P -->> C: "返回 access_token 与 id_token"
  C ->> C: "验证 id_token 的签名 aud iss nonce"
  C ->> C: "从 id_token 读 sub 建立本地账号关联"
```

1. 加 `openid` scope 后，token 响应里多出 `id_token`。
2. `id_token` 是 JWT，声明里有 `sub`、`aud`、`iss`、`exp`、`nonce`。
3. access token 给资源服务器看，ID token 给客户端看，两者受众不同。
4. `nonce` 由客户端发起时生成，回来后必须一致，防重放。

**一步一步来**

第 1 步，构造带 openid 与 nonce 的授权请求。

```js
function buildOidcRequest({ issuer, clientId, redirectUri, state, nonce }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email', // openid 触发 OIDC
    nonce,                          // 绑定本次登录请求
    state,
  });
  return `${issuer}/authorize?${params}`;
}

const url = buildOidcRequest({
  issuer: 'https://auth.example.com',
  clientId: 'app_3',
  redirectUri: 'https://app.example.com/cb',
  state: 's1',
  nonce: 'n123',
});
console.log(url);
```

**这段代码在做什么**

- `openid` 是关键 scope，缺了它响应里没有 ID token。
- `nonce` 必须记录在本地，后面校验 ID token 时比对。
- 这个请求走的就是第 4 节的授权码流程，OIDC 是它的扩展。
- `profile` 与 `email` 是可选声明范围。

第 2 步，构造一个演示用 ID token 并解码载荷。

```js
import { createHmac } from 'node:crypto';

const b64url = (d) => Buffer.from(d).toString('base64url');
const signDemo = (secret, h, p) => {
  const hh = b64url(JSON.stringify(h));
  const pp = b64url(JSON.stringify(p));
  const sig = createHmac('sha256', secret).update(`${hh}.${pp}`).digest('base64url');
  return `${hh}.${pp}.${sig}`;
};

const idToken = signDemo('demo-secret', { alg: 'HS256', typ: 'JWT' }, {
  sub: 'u_7', aud: 'app_3', iss: 'https://auth.example.com',
  exp: 1710003800, nonce: 'n123',
});

function decodePayload(token) {
  const parts = token.split('.');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}
console.log(decodePayload(idToken));
```

**这段代码在做什么**

- 演示用密钥 `demo-secret` 不可用于生产，生产密钥在 OP 侧。
- 载荷里 `sub` 是用户在 OP 处的唯一 ID。
- `aud` 标的是这个 ID token 给哪个客户端。
- 解码只读载荷，验签是下一步。

第 3 步，校验声明与签名。

```js
import assert from 'node:assert/strict';

function validateIdClaims(payload, { expectedAud, expectedIss, expectedNonce, now }) {
  assert.equal(payload.aud, expectedAud, '受众必须是本客户端');
  assert.equal(payload.iss, expectedIss, '签发方必须是你的 OP');
  assert.equal(payload.nonce, expectedNonce, 'nonce 必须匹配本次登录');
  assert.ok(payload.exp > now, '令牌未过期');
  return payload.sub;
}

const sub = validateIdClaims(decodePayload(idToken), {
  expectedAud: 'app_3', expectedIss: 'https://auth.example.com',
  expectedNonce: 'n123', now: 1710003000,
});
console.log('登录用户:', sub);
```

**这段代码在做什么**

- `aud` 校验防止拿给别的客户端的 ID token 冒充登录。
- `iss` 校验防止伪造的发行方。
- `nonce` 校验把 ID token 绑定到本次登录请求。
- 签名校验复用第 3 节的 `verify` 函数。

**动手验证**

完整脚本 `oidc.mjs`，运行 `node oidc.mjs`。

```js
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const b64url = (d) => Buffer.from(d).toString('base64url');
const signDemo = (secret, h, p) => {
  const hh = b64url(JSON.stringify(h));
  const pp = b64url(JSON.stringify(p));
  const sig = createHmac('sha256', secret).update(`${hh}.${pp}`).digest('base64url');
  return `${hh}.${pp}.${sig}`;
};
const decode = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8'));

const ISSUER = 'https://auth.example.com';
const token = signDemo('demo-secret', { alg: 'HS256', typ: 'JWT' }, {
  sub: 'u_7', aud: 'app_3', iss: ISSUER, exp: 1710003800, nonce: 'n123',
});

function validateIdClaims(payload, { expectedAud, expectedIss, expectedNonce, now }) {
  assert.equal(payload.aud, expectedAud);
  assert.equal(payload.iss, expectedIss);
  assert.equal(payload.nonce, expectedNonce);
  assert.ok(payload.exp > now, '已过期');
  return payload.sub;
}

const sub = validateIdClaims(decode(token), {
  expectedAud: 'app_3', expectedIss: ISSUER, expectedNonce: 'n123', now: 1710003000,
});
assert.equal(sub, 'u_7');
assert.throws(() => validateIdClaims(decode(token), {
  expectedAud: 'other_app', expectedIss: ISSUER, expectedNonce: 'n123', now: 1710003000,
}));
console.log('OIDC 的 iss aud nonce exp 声明校验通过');
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 拿别人的 ID token 也能登录 | 没校验 `aud` | 固定校验为本客户端 ID |
| 只解码不验签被冒充 | 拿 JWT 载荷当真的 | 用第 3 节的验签函数 |
| 重放旧的 ID token | 没校验 `nonce` 或 `exp` | 校验这两项且设置短有效期 |

**小结**

- OIDC 在 OAuth2 之上加 ID Token，回答"用户是谁"。
- ID Token 必须校验签名与 `iss`、`aud`、`exp`、`nonce`。
- access token 给资源服务器，ID token 给客户端，受众不同。

## 7. 刷新令牌：短命 access token 的续期与轮换

**先想一个问题**：access token 5 分钟就过期，总不能每 5 分钟让用户重新登录一次吧。

!!! note "术语：Refresh Token"
    长期凭证，只发给受信任客户端后端，用来换取新的 access token。它不直接访问资源，因此暴露面比 access token 小。

**心智模型**

!!! tip "心智模型"
    一句话模型：refresh token 是长期介绍信，access token 是短期工牌。
    打比方：公司给你一张介绍信，你每天拿它去前台换当天工牌；工牌丢了只损失一天，介绍信被偷可以作废并换新介绍信。
    不成立处：介绍信换新之前旧的可能还能用，所以要做轮换与重用检测。

**图解**

```mermaid
sequenceDiagram
  participant C as "客户端"
  participant A as "授权服务器"
  C ->> A: "携带过期的 access_token 调用 API"
  A -->> C: "返回 401 token expired"
  C ->> A: "POST 刷新端点带 refresh_token"
  A ->> A: "检查 refresh 是否被撤销或已轮换"
  A -->> C: "返回新 access_token 与新 refresh_token"
  C ->> C: "保存新 refresh 丢弃旧 refresh"
```

1. 资源服务器先按 access token 的过期时间拒绝请求。
2. 客户端拿 refresh token 去授权服务器换新的对令牌。
3. 轮换后旧 refresh token 立即失效。
4. 若旧 refresh token 再次出现，说明已被复制，撤销整条家族。

**一步一步来**

第 1 步，签发票据对并用 Map 存储 refresh 家族。

```js
import { randomUUID } from 'node:crypto';

const accessTokens = new Map();
const refreshGrants = new Map();

function issuePairs(refreshGrants, userId) {
  const access = randomUUID();
  const refresh = randomUUID();
  const family = randomUUID();                  // 家族 ID 用于撤销整条链
  accessTokens.set(access, { sub: userId, exp: Date.now() + 5 * 60 * 1000 });
  refreshGrants.set(refresh, { sub: userId, family, rotated: false });
  return { access_token: access, refresh_token: refresh, expires_in: 300 };
}
```

**这段代码在做什么**

- access token 5 分钟过期，refresh token 有独立的长有效期。
- `family` 把同一登录产生的所有 refresh token 串成一条链。
- `rotated` 标记这个 refresh token 是否已经换过新的。
- 演示用随机串代替真 JWT，真实实现可用第 3 节签名。

第 2 步，轮换 refresh token。

```js
function rotate(refreshGrants, oldRefresh) {
  const record = refreshGrants.get(oldRefresh);
  if (!record || record.revoked) throw new Error('invalid_refresh');
  if (record.rotated) {
    revokeFamily(refreshGrants, record.family);      // 旧令牌再次出现
    throw new Error('refresh_token_reused');
  }
  record.rotated = true;                             // 旧令牌立即失效
  const access = randomUUID();
  const refresh = randomUUID();
  accessTokens.set(access, { sub: record.sub, exp: Date.now() + 5 * 60 * 1000 });
  refreshGrants.set(refresh, { sub: record.sub, family: record.family });
  return { access_token: access, refresh_token: refresh };
}
```

**这段代码在做什么**

- 只有未被使用、未被撤销的 refresh token 才能换新。
- `rotated` 为 true 表示这不是最新的 refresh token。
- 旧令牌再次出现时，判定为泄露并撤销整条链。
- 每次轮换都发新的 access 与 refresh，旧 refresh 作废。

第 3 步，撤销整个 family。

```js
function revokeFamily(refreshGrants, family) {
  for (const [token, r] of refreshGrants) {
    if (r.family === family) {
      refreshGrants.set(token, { ...r, revoked: true }); // 链上全部作废
    }
  }
}
```

**这段代码在做什么**

- 一个 family 内所有 refresh token 共享一条登录链。
- 检测到重用就全部标记 `revoked`，宁可让用户重新登录。
- 防止攻击者拿着偷来的旧 refresh token 无限续期。
- 误判代价是用户重新登录，泄露代价是数据外泄，二者取更安全的一侧。

**动手验证**

完整脚本 `refresh.mjs`，运行 `node refresh.mjs`。

```js
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const accessTokens = new Map();
const refreshGrants = new Map();

function issuePairs(refreshGrants, userId) {
  const family = randomUUID();
  const refresh = randomUUID();
  refreshGrants.set(refresh, { sub: userId, family, rotated: false });
  return { access_token: randomUUID(), refresh_token: refresh };
}
function revokeFamily(refreshGrants, family) {
  for (const [token, r] of refreshGrants) {
    if (r.family === family) refreshGrants.set(token, { ...r, revoked: true });
  }
}
function rotate(refreshGrants, oldRefresh) {
  const record = refreshGrants.get(oldRefresh);
  if (!record || record.revoked) throw new Error('invalid_refresh');
  if (record.rotated) {
    revokeFamily(refreshGrants, record.family);
    throw new Error('refresh_token_reused');
  }
  record.rotated = true;
  const refresh = randomUUID();
  refreshGrants.set(refresh, { sub: record.sub, family: record.family });
  return { access_token: randomUUID(), refresh_token: refresh };
}

const first = issuePairs(refreshGrants, 'u_9');
const second = rotate(refreshGrants, first.refresh_token);
assert.notEqual(second.refresh_token, first.refresh_token);
assert.throws(() => rotate(refreshGrants, first.refresh_token), /reused/);
assert.throws(() => rotate(refreshGrants, second.refresh_token), /invalid_refresh/);
console.log('刷新令牌轮换与重用撤销验证通过');
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| refresh token 放前端 localStorage 被读取 | 同源脚本可读 localStorage | 只存 httpOnly Cookie 或后端 |
| 轮换策略导致老客户端反复掉线 | 旧客户端仍用旧 refresh token | 新旧共存一个短暂宽限期 |
| 被盗 refresh token 长期有效 | 没有轮换与重用检测 | 启用轮换加 family 撤销 |

**小结**

- refresh token 生命周期长，只在后端换新 access token，不直接访问资源。
- 轮换让旧 refresh token 只能被使用一次。
- 重用检测会撤销整条 family，选择让用户重登而不是留后门。

## 8. mTLS：传输层的双向证书认证

**先想一个问题**：除了应用层的令牌，能不能在 TLS 握手阶段就挡住没有有效证书的客户端？

!!! note "术语：mTLS"
    Mutual Transport Layer Security，双向 TLS。在标准 TLS 验证服务器证书之外，服务器额外要求客户端出示证书并验证其链。

**心智模型**

!!! tip "心智模型"
    一句话模型：mTLS 是机场双边安检，你看清楚服务器，服务器也看清楚你。
    打比方：普通 HTTPS 是乘客查验航空公司制服，mTLS 是航空公司还要查验乘客护照芯片后才能登机。
    不成立处：护照证明的是身份，不表达"准予访问哪些数据"这种业务授权。

**图解**

```mermaid
sequenceDiagram
  participant C as "客户端"
  participant S as "服务器"
  C ->> S: "ClientHello 请求 TLS 握手"
  S -->> C: "ServerHello 加服务器证书"
  C ->> C: "验证服务器证书是否受信任"
  S ->> C: "CertificateRequest 要求客户端证书"
  C -->> S: "发送客户端证书与签名证明"
  S ->> S: "验证客户端证书并记录 CN"
  C ->> S: "握手完成 开始加密传输"
```

1. 前两步与普通 TLS 相同，客户端先验服务器。
2. 服务器随后发起 `CertificateRequest`，要求客户端证书。
3. 客户端发送证书并用私钥做签名证明持有私钥。
4. 服务器验证证书链与签发者，握手成功后应用层再处理业务。

**一步一步来**

第 1 步，用 openssl 生成两张自签名证书。

```js
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'mtls-')); // 临时目录

function genCertFiles(name) {
  const key = path.join(dir, `${name}-key.pem`);
  const cert = path.join(dir, `${name}-cert.pem`);
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', cert, '-days', '1', '-subj', `/CN=${name}`]);
  return { key, cert };
}

const serverFiles = genCertFiles('server');
const clientFiles = genCertFiles('client');
console.log(serverFiles, clientFiles);
```

**这段代码在做什么**

- `-x509` 生成自签名证书，演示用，生产用企业 CA。
- `-nodes` 表示私钥不加密，方便脚本读取。
- `-subj` 的 CN 作为证书主体名，后面应用层校验会读到。
- 依赖 openssl 1.1.1 或 3.x 已安装。

第 2 步，启动要求客户端证书的 HTTPS 服务器。

```js
import fs from 'node:fs';
import https from 'node:https';

const server = https.createServer({
  key: fs.readFileSync(serverFiles.key),
  cert: fs.readFileSync(serverFiles.cert),
  ca: fs.readFileSync(clientFiles.cert), // 只信任这份客户端证书
  requestCert: true,                     // 握手时要求客户端证书
  rejectUnauthorized: false,             // 应用层手动判定 便于演示
}, (req, res) => {
  const peer = req.socket.getPeerCertificate();
  const ok = req.socket.authorized && peer.subject.CN === 'client';
  if (!ok) { res.writeHead(403); res.end('forbidden'); return; }
  res.end('hello client');
});
```

**这段代码在做什么**

- `ca` 列表决定哪些客户端证书能通过链验证。
- `requestCert` 发起了 TLS 的 `CertificateRequest`。
- `rejectUnauthorized` 置 false 是为了把手动判定放进应用层演示。
- 应用层再校验 `CN`，证书证明身份，CN 用于路由到具体权限。

第 3 步，客户端带证书发起 HTTPS 请求。

```js
const port = 7471;
server.listen(port, '127.0.0.1');

const received = await new Promise((resolve, reject) => {
  const req = https.request({
    host: '127.0.0.1', port,
    key: fs.readFileSync(clientFiles.key),
    cert: fs.readFileSync(clientFiles.cert),
    ca: fs.readFileSync(serverFiles.cert),     // 信任服务器证书
    checkServerIdentity: () => undefined,      // 演示跳过主机名校验
  }, (res) => {
    let body = '';
    res.on('data', (c) => body += c);
    res.on('end', () => resolve({ status: res.statusCode, body }));
  });
  req.on('error', reject);
  req.end();
});
console.log(received);
```

**这段代码在做什么**

- 客户端同时出示私钥与证书，私钥用于在 TLS 握手期间做签名证明。
- `ca` 放服务器证书，客户端信任该服务器。
- `checkServerIdentity` 跳过主机名校验，生产要用 SAN 匹配域名。
- 响应 `{ status: 200, body: 'hello client' }` 说明带证书通过。

**动手验证**

完整脚本 `mtls.mjs`，依赖 openssl，运行 `node mtls.mjs`。

```js
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtls-'));
function genCertFiles(name) {
  const key = path.join(dir, `${name}-key.pem`);
  const cert = path.join(dir, `${name}-cert.pem`);
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', cert, '-days', '1', '-subj', `/CN=${name}`]);
  return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
}
const serverFiles = genCertFiles('server');
const clientFiles = genCertFiles('client');

const server = https.createServer({
  key: serverFiles.key,
  cert: serverFiles.cert,
  ca: clientFiles.cert,
  requestCert: true,
  rejectUnauthorized: false,
}, (req, res) => {
  const peer = req.socket.getPeerCertificate();
  const ok = req.socket.authorized && peer.subject.CN === 'client';
  if (!ok) { res.writeHead(403); res.end('forbidden'); return; }
  res.end('hello client');
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

function request({ withCert }) {
  const options = {
    host: '127.0.0.1', port,
    ca: serverFiles.cert,
    checkServerIdentity: () => undefined,
  };
  if (withCert) {
    options.key = clientFiles.key;
    options.cert = clientFiles.cert;
  }
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

const okRes = await request({ withCert: true });
assert.equal(okRes.status, 200);
assert.equal(okRes.body, 'hello client');
const badRes = await request({ withCert: false });
assert.equal(badRes.status, 403);
assert.equal(badRes.body, 'forbidden');
console.log('带证书请求 200 无证书请求 403 验证通过');
server.close();
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| `rejectUnauthorized` 设 false 后不手动判 | 等于关闭验证 | 应用层读 `socket.authorized` |
| 证书链验证通过但业务不匹配 | 只验证链没校验 CN 或 OU | 按 CN 映射到具体权限 |
| 客户端连 IP 报主机名不匹配 | 证书 SAN 不含该 IP | 证书加 SAN 或用域名访问 |
| 私钥明文入库 | 私钥泄漏证书作废 | 用硬件安全模块或密钥管理服务 |

**小结**

- mTLS 在传输层让双方互验数字证书，先于任何应用层令牌。
- 它能挡住无证书的伪造客户端，但表达不了细粒度用户授权。
- 私钥管理是 mTLS 的主要运维负担。

## 综合对比

| 维度 | API Key | Basic | Session | JWT | OAuth2 access token | refresh token | mTLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 凭证内容 | 静态字符串 | 用户名密码可逆编码 | 随机会话 ID | 自包含三段令牌 | 授权服务器签发令牌 | 长期续期令牌 | 客户端证书 |
| 服务端状态 | 存密钥表 | 存账号密码 | 存会话表 | 无状态验签 | 可无状态验签 | 存家族状态 | 存信任 CA |
| 能否立即吊销 | 能 | 能 | 能 | 难 | 难 靠短过期 | 能 | 能 |
| 泄露影响 | 密钥可用到吊销 | 密码全泄漏 | 会话期内可冒充 | 过期前可冒充 | 过期前可冒充 | 可换新令牌 | 私钥可长期冒充 |
| 典型场景 | 服务间调用 | 旧式简单 API | 单体 Web 登录 | 微服务无状态登录 | 第三方受限访问 | 延长登录 | 零信任内网通道 |
| 传输要求 | HTTPS | HTTPS 强制 | HTTPS | HTTPS | HTTPS | HTTPS | 本身就是 TLS |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格，滚到第 200 页并发拉分页 | Bearer 头、刷新令牌轮换 | 单页应用 + 授权码 + PKCE，access token 放内存 | 十几个分页请求同时 401，续期必须去重；导出文件的下载链接不能挂自定义头 |
| 低端安卓的首屏加载 | 授权码 + PKCE、短命 access token | 系统浏览器 + 自定义 scheme 或 loopback 回跳 | 回跳地址要预先注册；不要用内嵌 WebView 收密码 |
| 多人协作白板的实时通道 | Bearer 头、access token 过期 | WebSocket 握手带令牌，或先换一次性 ticket | 长连接会跨过令牌过期点，服务端要定期复核或主动断开 |
| 第三方服务商读取商家订单 | OAuth2 授权码、scope 拆分 | 授权服务器与资源服务器分离 | 授权码一次性且短命；读和写拆成两个 scope |
| 命令行工具调用云 API | API Key、设备授权 | 每台机器一把 key，按 IP 或角色限制 | key 泄露后无法区分调用者，也没有到期时间 |
| 跨机房报表定时同步 | mTLS、client credentials | 双向证书 + 短期令牌 | 证书轮换要留并存窗口；时钟偏差会让校验失败 |
| 门店 IoT 设备上报 | mTLS、短命令牌 | 一设备一证书 | 设备存不住长期密钥时，改用出厂凭据引导换取 |
| 桌面客户端登录 | 授权码 + PKCE + loopback | 系统浏览器 + 127.0.0.1 回跳 | 端口动态申请后要拼进授权请求 |
| 内部微服务互调 | mTLS、JWT 校验 | mesh sidecar 或统一 SDK | 令牌的 aud 要限定到具体服务，不能全网通用 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：运营后台每页 50 行，翻到深处时一次滚动会并发发出十几个分页请求。access token 按分钟级设置有效期，用户在页面上停留的时间会超过它。

**怎么用本页知识解决**：给每个请求挂 Bearer 头，401 时才去续期，并且让并发的 401 共用同一个刷新请求。

```js
let refreshing = null;                        // 并发 401 共用同一个刷新 Promise

async function api(path, options = {}) {
  const call = (t) => fetch(path, { ...options, headers: {  // 带令牌发请求
    ...options.headers, Authorization: `Bearer ${t}` } });  // 标准 Bearer 头
  let res = await call(sessionStorage.access_token);
  if (res.status !== 401) return res;         // 只有 401 才续期
  refreshing = refreshing ?? doRefresh();     // 去重，避免刷新风暴
  const ok = await refreshing;
  refreshing = null;                          // 释放单例
  if (!ok) return void location.assign("/login"); // 刷新失败回登录页
  return call(sessionStorage.access_token);   // 用新令牌重放一次
}
// doRefresh(): POST /oauth/token，grant_type=refresh_token
// 成功后 access_token 写进 sessionStorage，轮换后的 refresh_token 覆盖 localStorage
```

- access token 放 sessionStorage 而不是 localStorage，降低被其他脚本读走的机会。
- refresh token 与 access token 分开存放，前端代码里只有刷新函数能读到它。
- 重放只做一次，第二次仍 401 就说明令牌无效，直接回登录页，避免死循环。
- 服务端在轮换时作废旧 refresh token，重放旧值应当被识别为异常。
- 表格的导出按钮走后端签发的一次性下载地址，不要让浏览器直接带自定义头。

**怎么度量收益**：看三个指标。一是 401 之后重放请求的成功率，二是 `/oauth/token` 的调用次数，三是表格首屏可交互的时间。测量方法：用 Chrome DevTools 的 Network 面板导出 HAR 统计请求计数，用 Playwright 脚本连续打开表格页 20 次并读取 `PerformanceNavigationTiming` 的 `loadEventEnd`，服务端在 access log 里统计 401 条数。

**什么时候不该用**：纯内网、只有一个固定账号、后端本来就用同机房 session 校验的场景，引入令牌续期只会增加一条失败链路。还有一类反例：页面里要挂第三方 CDN 的图片和脚本，这些请求没法带 Authorization 头，靠令牌做防盗链解决不了问题。

#### 场景 2：低端安卓 App 的首屏加载

**业务背景**：App 冷启动后要拉首页数据，低端机上网络栈初始化和证书握手占掉的时间不能忽略。点击图标到看到内容之间不适合插一个完整的账号密码表单。

**怎么用本页知识解决**：用系统浏览器走授权码加 PKCE，App 只负责生成 verifier 和在回跳后换令牌。

```kotlin
// 1) 生成 verifier 与 S256 challenge，verifier 要留到换令牌时用
// base64UrlNoPad、randomBytes、sha256 是本地工具函数，按 RFC 7636 实现
val verifier = base64UrlNoPad(randomBytes(32))   // 43 到 128 字符的随机串
val challenge = base64UrlNoPad(sha256(verifier)) // S256 是唯一应允许的方式

// 2) 用系统浏览器打开授权端点，回跳由系统交给本应用
val authUrl = Uri.parse(authorizeEndpoint).buildUpon()
    .appendQueryParameter("response_type", "code")
    .appendQueryParameter("client_id", clientId)
    .appendQueryParameter("redirect_uri", "myapp://cb")   // 需预先注册
    .appendQueryParameter("code_challenge", challenge)
    .appendQueryParameter("code_challenge_method", "S256")
    .appendQueryParameter("state", randomState)           // 回跳后比对
    .build()

// 3) 换令牌：把 code 与原始 verifier 一起提交给令牌端点
// POST /oauth/token
// grant_type=authorization_code&code=...&code_verifier=...&client_id=...
// 服务端比对 SHA-256(verifier) 与授权请求里的 challenge
```

- verifier 是公共客户端唯一能证明“换令牌的就是发起授权的那一个”的凭据。
- App 不保存密码，登录页由系统浏览器渲染，键盘记录类风险落不到应用进程里。
- 回跳地址必须精确匹配预注册值，开前缀匹配等于给攻击者留了接收 code 的口子。
- state 要在回跳时逐字节比对，挡住把 code 塞给本应用的伪造回跳。
- 换到的 access token 存进内存或加密存储，退出登录时连 refresh token 一起清掉。

**怎么度量收益**：用 androidx.benchmark 的 Macrobenchmark 测冷启动，看 Time to Initial Display 这个指标；用 Android Studio 的 Network Inspector 看 `/oauth/token` 的调用次数。对比改造前后的同机型同网络条件，各跑 10 次取中位数。

**什么时候不该用**：设备由门店统一管理、开机即固定账号的专用平板，自建授权服务器和登录编排的成本高于收益。还有一种情况：App 只在内网运行且企业已有 MDM 统一身份，此时接企业身份源比自建授权断点省事。

#### 场景 3：跨机房报表定时同步

**业务背景**：两个机房的报表服务每天固定时间互传汇总数据，链路穿过公网专线，双方必须确认对端身份。调用量不大，但失败一次要人工补数。

**怎么用本页知识解决**：用双向证书确认机器身份，再用一枚短期令牌承载“这次同步代表谁”。

```bash
# 1) 双向认证：客户端出示证书，服务端校验对端证书链
curl --cert ./client.crt --key ./client.key --cacert ./ca.crt \
     https://sync.internal.example/report \
     -H "Authorization: Bearer $SHORT_LIVED_TOKEN"   # 用户级授权仍靠令牌

# 2) 只验证握手，用于定位证书链或时钟问题
openssl s_client -connect sync.internal.example:443 \
     -cert ./client.crt -key ./client.key -CAfile ./ca.crt </dev/null

# 3) 轮换前确认到期时间，新旧证书并存一个窗口再下线旧证书
openssl x509 -in client.crt -noout -enddate
```

- mTLS 解决“对面是不是那台机器”，令牌解决“这次调用代表哪个租户”。
- 服务端要开对客户端证书的校验，只配 `--cert` 而不校验对端等于单向认证。
- 证书和私钥放在只有同步进程能读的目录，权限按最小可读设置。
- 时钟偏差会让证书有效期判断出错，两台机器都要跑时间同步。
- 证书到期前先上新证书、保留旧证书一个窗口，避免切换瞬间双方都验不过。

**怎么度量收益**：看 TLS 握手失败次数、证书校验失败计数、证书剩余有效期。测量方法：用 openssl 脚本每天探一次握手，用 Prometheus blackbox_exporter 采集 SSL 证书剩余有效期（指标名以该 exporter 文档为准）并设告警，服务端在 access log 里按错误码统计同步失败。

**什么时候不该用**：两个进程在同一台宿主机内通信，或者调用已经由 mesh sidecar 做了双向认证，应用层再配一遍证书是重复劳动。对端是第三方 SaaS、你无法给对方签发客户端证书时，这条路也走不通，应当换成带签发方校验的 JWT 加 IP 白名单。

### 行业先进实践

授权码流程默认要求 PKCE（出处：IETF OAuth 2.0 Security Best Current Practice 文档）

该文档把 PKCE 从“公共客户端可选”提升为各类授权码客户端的默认要求，理由是授权码可能通过回跳地址、日志或代理泄漏。verifier 让拿到 code 的一方无法直接换到令牌。你的项目可以借鉴：在授权服务器里对缺少 code_challenge 的授权请求直接返回错误，并把 S256 之外的转换方式关闭。

刷新令牌轮换与重放检测（出处：Auth0 官方文档 Refresh Token Rotation、Okta 官方文档）

每次刷新都返回新的 refresh token，旧值立即失效；如果检测到已经用过的 refresh token 再次出现，就撤销整条令牌族。这样被盗的 refresh token 会在下一次使用时暴露。你的项目可以借鉴：令牌表加 family_id 与 used_at 两列，把重放当作入侵信号并触发告警。

访问令牌采用 JWT 时遵循统一 profile（出处：IETF RFC 9068 JWT Profile for OAuth 2.0 Access Tokens）

该文档规定了访问令牌 JWT 的类型标识与必含声明，包括签发方、过期时间、受众和客户端标识。资源服务器按这份清单校验，能挡住拿 ID token 冒充 access token 的错用。你的项目可以借鉴：把资源服务器必须校验的声明写成检查表，缺一项就拒绝。

API Key 按用途拆分并限制来源（出处：GitHub Docs 的 fine-grained personal access tokens、Google Cloud 文档的 API Keys 应用限制）

把一把全权限的 key 拆成按资源、按操作的细粒度凭据，同时限制可调用来源，例如 HTTP referrer、来源 IP、应用签名。这样一把 key 泄漏只影响它被授权的那部分能力。你的项目可以借鉴：给每把 key 记录 owner、用途和到期日，到期前强制轮换。

把令牌绑定到客户端证书（出处：IETF RFC 8705 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens、OpenID Foundation FAPI 规范）

令牌里带上记录证书指纹的确认声明，资源服务器校验请求所用证书与该指纹一致，令牌即使被复制也无法使用。FAPI 面向高价值场景提出了这类发送方约束要求。你的项目可以借鉴：先在高价值接口上线 mTLS，再逐步打开指纹校验，给调用方留出改造窗口。

### 从学到用：落地路线

第 1 步：选一个内部后台的只读接口试点，把它从固定 API Key 换成授权码加 PKCE 换来的 Bearer token。验收标准：接口日志能按用户区分调用者，旧 key 停用后除鉴权失败外没有其他异常。

第 2 步：验证行为而不是验证配置。用 Playwright 脚本跑 20 次冷启动和一次令牌过期，统计 `/oauth/token` 调用次数与 401 重放成功次数。验收标准：并发 401 只触发 1 次刷新，刷新失败时用户回到登录页而不是停在白屏。

第 3 步：把客户端注册、回跳地址白名单、scope 清单写成接入规范，其余后台按同一模板接入。验收标准：新系统接入只提交配置，不需要改动授权服务器代码。

第 4 步：把强制项写进自动化检查，随 CI 运行。验收标准：提交一个不带 S256 code_challenge 的客户端配置时，流水线直接失败。

### 动手作业

**目标**：在本地跑通授权码加 PKCE 的登录链路，并让过期令牌自动续期。

**步骤**

1. 本地启动一个授权服务器（Keycloak 或 Spring Authorization Server 的官方 quickstart 均可用），注册一个公共客户端，回跳地址填 `http://127.0.0.1:5173/callback`，只允许 S256。
2. 写一个单页应用，点“登录”后跳到授权端点，参数包含 response_type、client_id、redirect_uri、code_challenge、code_challenge_method、state。
3. 在回调页用 code 加原始 code_verifier 调令牌端点，拿到 access token、refresh token 与 id_token。
4. 写一个本地 API，只校验 access token 的签名、iss、aud、exp，用第 3 步的令牌调通一次。
5. 把 access token 有效期改成 60 秒，等它过期后再发请求，观察 401 与自动续期。
6. 同时打开两个标签页触发续期，在服务端日志里数 `/oauth/token` 被调用了几次。
7. 手工改掉 JWT 载荷里的 sub 再发请求，观察 API 的拒绝结果与日志。

**验收标准**

- 授权请求去掉 code_challenge 时授权服务器报错；用错误的 code_verifier 换令牌被拒绝。
- 同一个授权码第二次换令牌失败。
- 令牌过期后页面自动完成续期并补发原请求，用户不需要重新登录。
- 两个标签页并发续期时，服务端只记录到 1 次刷新调用。
- 改过载荷的 JWT 被 API 拒绝，服务端日志里能看到签名校验失败。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html) | OIDC 唯一权威规范，ID Token 校验步骤的原始出处。 | 读 ID Token 校验一节，带着“哪些字段必须验”的问题，写出自己的校验函数。 |
| [Session management](https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Session_management) | 讲清会话标识、过期与绑定，是 Session 与 Token 对比的基准。 | 读会话管理概览与最佳实践，列出你系统里会话存储与失效的检查项。 |
| [CSRF 防护 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) | Cookie 会话的最大风险点，给出可落地的 CSRF 防护方案。 | 对比 token 与 SameSite 两种方案，为示例项目实现其中一种并补测试。 |
| [A typical HTTP session](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Session) | HTTP 会话模型是理解无状态 Token 为何出现的前提。 | 通读连接、请求与 Cookie 三节，思考服务端在哪一步保存了状态。 |
| [MDN Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API) | 补充基于公钥的认证路径，对照密码与令牌的差别。 | 读注册与认证流程，关注挑战与凭据，判断何时该用它替代密码。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) | 亲手实现 HMAC 与 SHA-256，才能理解 JWT 签名的真实含义。 | 照示例做 base64url 加 HMAC-SHA256，与 Node 的 jsonwebtoken 结果比对。 |
| [JWT.io](https://jwt.io/) | 即时拆解 JWT 三段结构与算法，建立直观印象。 | 用示例令牌解码 header 与 payload，勿粘贴生产令牌，再手写一次签名验证。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [OAuth 2.0 Simplified](https://www.oauth.com/) | 授权码与 PKCE 讲得最通俗，适合先建立整体流程感。 | 读授权码与 PKCE 两章，再对照一次真实登录的请求参数与回调。 |
| [阮一峰：Fetch API 教程](https://www.ruanyifeng.com/blog/2020/12/fetch-tutorial.html) | 教你用 fetch 正确携带 Authorization 头调用受保护端点。 | 按教程的 fetch 写法调用自建鉴权接口，分别处理 401 与 403 分支。 |

## 自测题

??? question "1. 为什么说 Basic 认证的 Base64 不是加密？"
    Base64 是可逆编码，任何拿到头的中间人都能解码还原 `用户名:密码`。
    它只解决传输里的特殊字符兼容，不提供机密性。
    因此 Basic 必须跑在 HTTPS 之上，否则等于明文传密码。

??? question "2. Session 与 JWT 各自适合什么扩展场景？"
    Session 状态在服务端，单实例易做、要主动踢人容易，但多实例要共享存储。
    JWT 无状态可任意多实例验签，但吊销要加撤销名单。
    选 Session：有状态、要立即踢人；选 JWT：多实例、跨服务、短有效期场景。

??? question "3. JWT 的签名防什么、不防什么？"
    防篡改与伪造：改载荷或换密钥都会导致签名不匹配。
    不防读取：载荷只是 Base64URL，任何人可解码。
    不防密钥泄露与吊销：拿到密钥即可造假令牌，过期前无法单方面作废。

??? question "4. 为什么授权码不能直接当 access token 用？"
    授权码经过浏览器重定向，会出现在地址栏与日志，暴露面大。
    它绑定 clientId 与 redirectUri，换 token 时需要后端再出示 client_secret 或 PKCE verifier。
    设计上它一次性、短命，用后即废。

??? question "5. 公共客户端为什么必须用 PKCE？"
    手机 App 与单页应用没法隐藏 client_secret，授权码又有被截获风险。
    PKCE 让截获授权码的人没有 code_verifier，换不出 token。
    必须用 S256，plain 方法等于没保护。

??? question "6. ID token 与 access token 的分工是什么？"
    access token 给资源服务器看，表达访问权，不应给客户端解析。
    ID token 给客户端看，用 JWT 表达 `sub`、`aud`、`nonce` 等身份声明。
    客户端登录用 ID token，调 API 用 access token。

??? question "7. refresh token 轮换加重用检测解决什么、带来什么新问题？"
    解决旧的 refresh token 被偷后长期续期的问题，旧令牌第二次出现即撤销整条链。
    新问题是老客户端若继续使用旧 refresh token，会被误判为泄露而掉线。
    缓解办法是给新旧令牌一个短暂共存窗口。

??? question "8. mTLS 为什么不能替代 OAuth2 的应用层授权？"
    mTLS 只在传输层证明客户端持有有效证书，回答"这台机器是谁"。
    它表达不了"用户同意这个 App 读哪些目录"这类细粒度授权。
    两者是不同层：mTLS 管连接身份，OAuth2 管资源授权，通常组合使用。

## 延伸阅读

- RFC 6749 The OAuth 2.0 Authorization Framework——第 4.1 节授权码授予、第 1.3 节授权类型
- RFC 7636 Proof Key for Code Exchange by OAuth Public Clients——第 4 节协议流程
- RFC 7519 JSON Web Token——第 3 节 JWT 编码、第 6 节签名与验证
- RFC 6750 The OAuth 2.0 Bearer Token Usage——第 2 节认证请求
- OpenID Connect Core 1.0——第 2 节 ID Token、第 3 节认证流程（章节号以官方原文为准）
- RFC 8705 OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens——第 2 节客户端认证
- RFC 8446 The Transport Layer Security Protocol Version 1.3——第 4 节握手协议
- RFC 7617 The Basic HTTP Authentication Scheme——第 2 节 Basic 认证方案
