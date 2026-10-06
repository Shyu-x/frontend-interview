---
title: Cookie 与 Web Storage
description: Cookie 属性与 SameSite、localStorage/sessionStorage/IndexedDB 的容量与适用场景。
---

# Cookie 与 Web Storage

## 1. localStorage / sessionStorage / IndexedDB

| 特性 | localStorage | sessionStorage | IndexedDB |
|------|-------------|----------------|-----------|
| 容量 | ~5MB | ~5MB | ~50MB+（可请求更多） |
| 生命周期 | 永久（除非手动清除） | 标签页关闭时清除 | 永久（除非手动清除） |
| 作用域 | 同源（协议+域名+端口） | 同源 + 同标签页 | 同源 |
| 线程 | 主线程同步访问 | 主线程同步访问 | 异步 API |
| 数据类型 | 仅字符串 | 仅字符串 | 支持 Blob/File/结构化对象 |
| 支持索引 | 否 | 否 | 是 |

```javascript
// localStorage 示例
localStorage.setItem('user', JSON.stringify({ name: 'Alice', age: 30 }));
const user = JSON.parse(localStorage.getItem('user'));

// 监听变化（其他同源标签页会收到通知）
window.addEventListener('storage', (e) => {
  console.log(`Key: ${e.key}, Old: ${e.oldValue}, New: ${e.newValue}`);
});

// IndexedDB 示例
const request = indexedDB.open('MyDatabase', 1);

request.onsuccess = () => {
  const db = request.result;
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  store.put({ id: 'alice', name: 'Alice', age: 30 });
};
```

## 2. Cookie：大小限制与跨域限制

### 2.1 定义/背景

Cookie 是浏览器存储在客户端的小型文本数据，随每个 HTTP 请求自动发送到服务器端，是实现会话管理、用户偏好、身份认证的基础机制。由于同源策略限制，Cookie 只能发送给同源服务器，因此也天然具备跨站请求伪造（CSRF）防护能力。

### 2.2 完整属性解析

```http
# 服务器端设置 Cookie（Set-Cookie 头）
Set-Cookie: sessionId=abc123xyz; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600

# HttpOnly: JS 无法通过 document.cookie 读取（防止 XSS 盗取 Cookie）
# Secure: 仅在 HTTPS 连接下发送（防止中间人攻击）
# SameSite: CSRF 防护机制（详见下表）
# Path=/: Cookie 发送的路径范围（/api 下的请求才会携带）
# Domain: Cookie 生效的域名（不设置则只能是当前精确域名）
# Max-Age=3600: Cookie 存活秒数（Expires 用绝对时间）
```

### 2.3 SameSite 属性对比

| 值 | 导航 GET 请求 | POST/JSON 等非导航请求 | 图片/JS 资源请求 | 适用场景 |
|----|-------------|----------------------|--------------|---------|
| `Strict` | 不携带 | 不携带 | 不携带 | 最安全，适合银行类业务 |
| `Lax`（默认） | 携带（导航） | 不携带 | 携带 | 兼顾安全与用户体验 |
| `None` | 携带 | 携带 | 携带 | 跨站 API（如嵌入 iframe 支付）需配合 Secure |

```
SameSite=Lax 行为示意:
  用户在 example.com 点击链接导航到 shop.com → 携带 shop.com 的 Lax Cookie
  用户在 example.com 发起 POST /api/orders → 不携带 shop.com 的 Cookie（防 CSRF）
  <img src="https://shop.com/track"> → 携带 Cookie（用于统计分析）
```

### 2.4 Cookie 限制与大小

| 限制 | 值 |
|------|---|
| 单个 Cookie 大小 | 最大 4KB（RFC 6265 规范限制） |
| 单个域名下 Cookie 总数 | 通常限制 150-180 个（浏览器实现各异） |
| Cookie 数量超额 | 早期 Cookie 被删除（无明确顺序），现代浏览器随机删除 |
| Cookie 总大小 | 建议单个域名下所有 Cookie 总和不超过 4KB（实际限制更宽松） |

### 2.5 Cookie 操作代码示例

```javascript
// 错误：不推荐：直接拼接 Cookie（XSS 风险）
document.cookie = `session=${userInput}`; // 若 userInput 包含 ; 会污染 Cookie

// 正确：推荐：使用 encodeURIComponent
document.cookie = `session=${encodeURIComponent(sessionToken)}; Path=/; Max-Age=3600`;

// 读取所有 Cookie（返回字符串，需手动解析）
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// 删除 Cookie（设置 Max-Age=0）
document.cookie = `session=; Path=/; Max-Age=0`;

// 服务器端设置（Node.js/Express）
import cookie from 'cookie';

app.use((req, res, next) => {
  const cookies = cookie.parse(req.headers.cookie || '');
  // 验证 session
  next();
});

res.setHeader('Set-Cookie', cookie.serialize('sessionId', sessionToken, {
  httpOnly: true,   // JS 无法读取
  secure: true,     // 仅 HTTPS
  sameSite: 'Strict', // CSRF 防护
  path: '/',
  maxAge: 3600,     // 1 小时
  domain: '.example.com', // 根域名，子域名共享
}));

// Cookie 分割：超过 4KB 时按优先级拆分到多个 Cookie
function splitCookie(name: string, value: string): void {
  const MAX_SIZE = 4000; // 留余量
  const chunks = Math.ceil(value.length / MAX_SIZE);
  for (let i = 0; i < chunks; i++) {
    document.cookie = `${name}_${i}=${value.slice(i * MAX_SIZE, (i + 1) * MAX_SIZE)}; Path=/`;
  }
}
```

### 2.6 Cookie vs Web Storage vs IndexedDB

| 特性 | Cookie | localStorage | sessionStorage | IndexedDB |
|------|--------|-------------|----------------|-----------|
| 大小 | ~4KB/个 | ~5MB | ~5MB | ~50MB+ |
| 随请求发送 | 自动（每次 HTTP 请求） | 不自动 | 不自动 | 不自动 |
| JS 访问 | 可读写（无 HttpOnly） | 可读写 | 可读写 | API |
| 生命周期 | 可设置 Max-Age | 永久 | 标签页关闭 | 永久 |
| 跨域 | 受 SameSite 限制 | 不同 | 不同 | 不同 |
| 适用场景 | 会话认证 | 配置持久化 | 临时状态 | 大型结构化数据 |

### 2.7 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| Cookie 在 HTTP 下传输 | 明文传输，可被中间人窃取 | 务必设置 `Secure`，全站 HTTPS |
| JS 可以读取 Cookie | XSS 攻击可获取敏感 Cookie | 设置 `HttpOnly`（会话 Cookie 必须 HttpOnly） |
| 未设置 SameSite | 遭受 CSRF 攻击风险 | 始终显式设置 `SameSite=Strict/Lax` |
| Cookie 大小超 4KB | 被浏览器截断或丢弃 | 大数据存 IndexedDB，Cookie 只存 sessionId |
| 多余 Cookie 随请求发送 | 增加请求大小（浪费带宽） | 设置精确 `Path`，及时删除过期 Cookie |
| 将 Token 存在 localStorage | 容易被 XSS 盗取 | 使用 HttpOnly Cookie 存储敏感 Token |

### 2.8 面试追问

**Q1: `SameSite=None` 必须配合 `Secure`，这是为什么？**

`SameSite=None` 允许跨站 Cookie 发送，在 HTTP 页面上发送明文 Cookie 容易被中间人截获，造成安全风险。RFC 6265 因此规定 `SameSite=None` 必须同时标记 `Secure`（即仅 HTTPS 下发送），强制跨站 Cookie 必须在加密通道中传输，防止被窃取。

**Q2: Cookie 的 `Domain` 属性和同源策略有什么关系？**

`Domain` 属性允许 Cookie 发送给子域名（默认只能发送给设置 Cookie 的精确域名）。例如在 `api.example.com` 设置 `Domain=example.com`，则 Cookie 也会发送给 `www.example.com` 和 `shop.example.com`。但不能设置为父域的反向（如 `example.com` 不能设为 `Domain=com`）。这是 Cookie 的"有限共享"，与同源策略中跨子域名的限制（不同源）并行生效。

**Q3: HttpOnly Cookie 能防御什么攻击？**

XSS（跨站脚本攻击）攻击者通过注入 JS 脚本读取 `document.cookie` 获得 Cookie，进而伪造用户身份发起请求。`HttpOnly` 属性使 Cookie 只能通过 HTTP 请求发送，JS 无法访问，即使用户页面存在 XSS 漏洞，攻击者也无法直接拿到 Cookie。注意：`HttpOnly` 不能防御 CSRF（跨站请求伪造），因为 CSRF 请求由浏览器自动用 Cookie 发起，无需 JS 读取。

## 3. Cookie 大小与跨域限制（速记版）

```javascript
// Cookie 大小限制
// - 每个 cookie 最大 4KB（RFC 6265 规范）
// - 单个域名下所有 cookie 总数通常限制在 150-180 个

// 设置 Cookie（服务器端 Set-Cookie）
Set-Cookie: sessionId=abc123; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600

// HttpOnly: JS 无法读取（防 XSS）
// Secure: 仅 HTTPS 传输
// SameSite: 防 CSRF 攻击
//   - Strict: 完全禁止跨站 cookie（最安全）
//   - Lax: 允许导航 GET 请求携带 cookie（默认）
//   - None: 允许跨站 cookie（必须配合 Secure）
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies) | Cookie 属性、作用域与大小限制的权威参考。 | 读 SameSite、Domain、Path 三节，用 DevTools 验证跨站请求时 Cookie 是否发送。 |
| [Cookie header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cookie) | 说明 Cookie 随请求发送时的头部体积限制。 | 读语法与示例，看多 Cookie 拼接后的头部长度，估算 4KB 上限的来源。 |
| [Secure cookie configuration](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies) | 给出现代 Cookie 安全属性的推荐配置组合。 | 对照清单检查自身站点，为每个 Cookie 补上 Secure、HttpOnly、SameSite。 |
| [MDN CORS（English）](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) | 凭据请求与通配符限制，正是跨域 Cookie 的关键。 | 读凭据请求与通配符两节，解释 fetch 携带 Cookie 时的常见报错。 |
| [MDN：同源策略](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy) | 理解 Cookie 跨域限制所依赖的底层规则。 | 读源的定义，实验 iframe 与 fetch 在不同源下读写 Cookie 的结果。 |
| [MDN Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API) | 查询存储配额与持久化，搞清容量上限。 | 读 estimate 与 persist，在控制台调用并对比各浏览器返回的配额。 |
| [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | 数据库、对象存储、事务、游标的概念总览。 | 先读概念与使用流程两节，建立异步事务模型，再进入实践页写代码。 |
| [IndexedDB key characteristics and basic terminology](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology) | 用一组术语精确描述 IndexedDB 的键、范围与游标。 | 通读术语表，读示例时对照 key range、cursor、versionchange 等词。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 使用 IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) | 完整可跑的增删改查代码，覆盖版本升级。 | 跟着敲一遍 CRUD，重点看 onupgradeneeded 中如何迁移旧数据。 |
| [Checking when a deadline is due](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Checking_when_a_deadline_is_due) | 小型完整示例，展示索引查询与游标的实际用法。 | 读 HTML 与 JS 两部分，改造成自己的过期时间提醒再运行一次。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [The Tangled Web（No Starch）](https://nostarch.com/tangledweb) | 同源策略与内容隔离的经典论述，解释跨域限制的由来。 | 读同源策略与 Cookie 相关章节，思考 Cookie 为何要按域与路径限定。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理系统的万行订单表格 | localStorage 只能存字符串，用来存列顺序与筛选条件 | 服务端分页 + localStorage 存视图配置 | 行数据写进 localStorage 会撞配额，配额按 origin 算，不按页面算 |
| 低端安卓机上的首屏加载 | localStorage 是同步 API，会阻塞主线程 | 首屏只读 1 个键，列表缓存放 IndexedDB | 首屏路径里连续多次 getItem，加长脚本执行时间 |
| 多人协作白板的断网补传 | IndexedDB 有事务与大容量，localStorage 无事务 | IndexedDB 存操作队列 + BroadcastChannel 通知同源标签页 | 高频写入用 localStorage 整段覆盖，会丢顺序 |
| 跨子域单点登录 | Cookie 的 Domain 属性决定哪些子域可见 | HttpOnly + Secure + SameSite 的会话 Cookie | localStorage 按 origin 隔离，a.example.com 与 b.example.com 不共享 |
| 长表单草稿自动保存 | localStorage 只存字符串，需要 JSON.stringify | localStorage 加输入防抖 | stringify 会丢 Date、Map、undefined，还原时要有兜底 |
| 多标签页同时退出登录 | storage 事件在其它同源标签页触发 | 监听 window 的 storage 事件 | 执行写入的那个标签页不会收到自己的 storage 事件 |
| 埋点离线补传 | Cookie 每次请求都会带上，IndexedDB 不会 | IndexedDB 存队列 + Service Worker 后台同步 | 业务数据塞 Cookie 会让请求头变大，超过 4KB 量级上限会丢字段 |
| 主题与语言偏好持久化 | localStorage 同步读取，可在首屏脚本前执行 | localStorage + 根元素 class 或 CSS 变量 | 服务端渲染阶段读不到 localStorage，需在客户端脚本里设置 |
| 视频站离线草稿箱 | IndexedDB 可存 Blob，localStorage 只能存字符串 | IndexedDB 存 Blob | 需核对官方文档：Safari 对 IndexedDB 存 Blob 的配额与逐出行为 |

### 三个场景拆解

#### 场景 1：后台管理的万行订单表格（只持久化视图配置）

**业务背景**：运营每次打开订单列表都要重选 8 个筛选项、拖回自己习惯的列顺序，一个上午要重复十几次。总记录数是六位数，页面按服务端分页每次只拿 50 行，前端不持有全量行数据。

**怎么用本页知识解决**：行数据留在服务端，只用 localStorage 存一份视图配置（列顺序、列宽、筛选项）。这份配置是几百字节的小对象，写一次读一次，碰不到配额。

```js
const KEY = 'table:orders:view:v1'; // 键名带模块与版本，避免互相覆盖

function saveView(view) {
  try {
    localStorage.setItem(KEY, JSON.stringify(view)); // 只写视图配置，行数据留在服务端
  } catch (err) {
    reportOnce('view-save-failed', err.name); // 隐私模式或配额满时降级，不让页面崩
  }
}

function loadView() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw); // 解析失败说明数据被外部改坏
  } catch (err) {
    localStorage.removeItem(KEY); // 清掉坏键，避免每次刷新都抛错
    return null;
  }
}
```

- 键名加模块前缀，同一 origin 下多个页面各用各的键，不会互相覆盖。
- 写入包在 try/catch 里：隐私模式或配额已满时 setItem 会抛错，抛错不应中断渲染。
- 读取时检查版本字段，结构升级后旧数据直接 removeItem 重建，不做兼容分支。
- 行数据不进 localStorage，它随筛选条件变化，写进去很快过期。
- 用户点“恢复默认”时调 removeItem，不要写一份默认值覆盖，否则下次判断不出用户是否改过。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板录一次“打开列表到可交互”，读 FCP 与主线程 Long Task 列表。再用 Application 面板配合代码计数，统计一次操作里对 localStorage 的读写次数。配置命中率用自建埋点算：读键成功次数除以打开次数。

**什么时候不该用**：
- 配置里要存几万行已勾选的订单 id：单个键会超过 5MB 量级上限，应改成服务端保存勾选集合。
- 同一台机器上多人轮换登录同一个账号：localStorage 按 origin 共享，A 的列配置会出现在 B 的界面上，需按用户 id 分键或存服务端。

#### 场景 2：低端安卓机上的首屏加载

**业务背景**：页面在低端安卓机上打开时，脚本要先跑完才渲染，用户先看到一段白屏。团队用 DevTools 的 CPU 4x 节流加 Slow 4G，在固定机型上复现这段时间。

**怎么用本页知识解决**：把 localStorage 的同步读写收窄到 1 个键，把列表缓存搬到 IndexedDB，让渲染不等待大对象的反序列化。

```js
// 首屏关键路径：只读 1 个键，体积控制在 1KB 内
const cached = localStorage.getItem('boot:profile'); // 同步读，主线程会等待
if (cached) renderProfile(JSON.parse(cached)); // renderProfile 是项目内渲染函数

// 列表缓存放 IndexedDB，走异步，不阻塞骨架屏渲染
const req = indexedDB.open('orders', 1);
req.onupgradeneeded = (e) => {
  e.target.result.createObjectStore('list', { keyPath: 'id' }); // 建表只在这里做
};
req.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('list', 'readonly');
  tx.objectStore('list').getAll().onsuccess = (ev) => {
    renderList(ev.target.result); // 数据到手再替换骨架屏
  };
};
```

- localStorage.getItem 是同步的，读 1KB 与读 1MB 的差别主要落在 JSON.parse 上，所以键体积要压。
- IndexedDB 的请求回调是异步的，请求发出后主线程继续渲染骨架屏。
- onupgradeneeded 只在首次打开或版本号变大时触发，建表逻辑只写在这里。
- 页面隐藏时调 db.close()，避免长期占用连接影响后续版本升级。

**怎么度量收益**：Chrome DevTools 的 Performance 面板录首屏，读 FCP、LCP、Total Blocking Time 三项。同一设备、同一网络（Network 面板选 Slow 4G）、同一 CPU 节流倍数重复 3 次取中位数。再看主线程长任务列表里是否还有 parse 相关的长条。

**什么时候不该用**：
- 首屏必须显示上次登录的用户名，且这个值只有 localStorage 有：挪进异步通道会让首屏先闪一次未登录状态。
- 数据只有几十条时，localStorage 一次读写的耗时低于 IndexedDB 打开连接加起事务的开销，多出的异步分支不划算。

#### 场景 3：多人协作白板的断网补传

**业务背景**：白板在弱网或地铁里会断连，断网期间用户画的内容不能丢。一次会话里每人每分钟产生的操作以十计，10 分钟能到上千条，不能用一个 localStorage 键反复整段覆盖。

**怎么用本页知识解决**：用 IndexedDB 的 append-only store 存操作，每条操作带本地自增 seq，联网后按 seq 顺序重放，服务端按 seq 去重。

```js
let db;
const req = indexedDB.open('board', 1);
req.onupgradeneeded = (e) => {
  const store = e.target.result.createObjectStore('ops', { keyPath: 'seq' });
  store.createIndex('bySeq', 'seq'); // 重放时按序号升序游标读取
};
req.onsuccess = (e) => {
  db = e.target.result;
  replay(); // 项目内的重放函数，联网后按 seq 逐条发送
};

function enqueue(op) {
  op.seq = nextSeq(); // 本地单调自增，服务端用同一个 seq 做幂等
  const tx = db.transaction('ops', 'readwrite');
  tx.objectStore('ops').add(op); // 用 add 而非 put，seq 重复时直接报错
}
```

- 写入用 add：键已存在时报错，能挡住 seq 生成逻辑出问题造成的重复。
- 重放按 bySeq 索引升序游标逐条读，避免一次 getAll 把上千条操作全读进内存。
- 服务端确认一条就删一条，断网再发生时只重发剩余队列。
- 服务端必须按 seq 幂等，否则重试会让白板上多出重复笔迹。
- 在线时的实时笔迹仍走 WebSocket，IndexedDB 只兜住断网时段。

**怎么度量收益**：看断网重连后的丢失条数，等于本地队列条数减去服务端确认条数。用 DevTools Performance 面板录连续 200 次 enqueue，看长任务分布。存储用量在 Application 面板的 Storage 区读，或在页面里调 navigator.storage.estimate() 打印。

**什么时候不该用**：
- 只存“当前白板 id”和“上次缩放比例”：localStorage 一个键就够，加 IndexedDB 会把初始化变成异步。
- 操作里带有时效令牌：离线重放时令牌已过期，必须改成重放前重新取令牌，否则整批失败。

### 行业先进实践

**写入前先估算配额（出处：MDN Web Docs，Storage API 的 StorageManager 条目）**
navigator.storage.estimate() 返回当前 origin 的用量与配额，navigator.storage.persist() 申请持久化，降低被逐出的概率。浏览器在磁盘紧张时会按 origin 逐出“尽力而为”的存储，先估算再写入能提前发现余量不足。你的项目可以在写入大对象前比较用量与配额，超过阈值就提示用户清理或改存服务端。各浏览器对 localStorage 的配额数值不一致，需核对官方文档：Chrome、Firefox、Safari 各自每个 origin 的 localStorage 配额与逐出策略。

**会话凭据只放 HttpOnly Cookie（出处：OWASP Cheat Sheet Series，HTML5 Security Cheat Sheet 与 Session Management Cheat Sheet）**
HttpOnly 让脚本读不到该 Cookie，XSS 无法直接取走会话；SameSite 限制跨站携带。把长期凭据放进 localStorage 会让任何一次 XSS 直接拿到全量权限。借鉴方式：审计前端是否把 token 写进 localStorage，若有则迁到 HttpOnly Cookie，并同步补上 CSRF 防护。

**为每条 Cookie 显式声明 SameSite（出处：web.dev 的 SameSite cookies explained，Chrome 官方文档的 SameSite 默认值说明）**
Chrome 80 起把未声明 SameSite 的 Cookie 按 Lax 处理，跨站 iframe 与跨站 POST 场景拿不到 Cookie。依赖默认值会让同一份代码在不同浏览器与不同版本上表现分叉。借鉴方式：逐条列出站点 Cookie 的 SameSite、Secure、Domain，改成显式声明。

**多标签页状态同步走 storage 事件与 BroadcastChannel（出处：MDN Web Docs，Window 的 storage 事件与 BroadcastChannel 条目）**
storage 事件只在其它同源标签页触发，BroadcastChannel 可以传结构化数据并支持多个频道。两者配合能让登出、主题切换、草稿冲突提示在各标签页保持一致。借鉴方式：把跨标签页同步封装成一个模块，业务代码只调 publish 与 subscribe。

**用 idb 封装 IndexedDB（出处：开源项目 jakearchibald/idb）**
该库把回调式 API 包成 Promise，升级逻辑与事务写在统一入口。项目里 IndexedDB 调用点多于 5 处时引入，能避免每处各写一遍 onupgradeneeded 与错误分支。

### 从学到用：落地路线

第 1 步：在一个页面试点。选只做缓存的页面（例如订单列表的视图配置），只改一处 localStorage 读写，别动登录态。验收标准：改动能通过 Code Review，且浏览器隐私模式下打开该页面不抛未捕获异常。

第 2 步：验证收益与边界。用 DevTools 的 Performance 面板与 Application 面板，在固定设备、固定网络、固定 CPU 节流倍数下对比改动前后。验收标准：产出一份改动前后的 FCP、主线程长任务、存储用量对照记录，并写出配额触顶时的降级路径。

第 3 步：推广。把键名规范、读写封装、版本字段整理成内部约定，替换其余模块里散落的 localStorage 调用。验收标准：全仓 localStorage 直接调用集中在封装文件内，其它文件只通过封装读写。

第 4 步：防回退。加静态检查规则拦住裸调用，并把存储分支写进端到端测试。验收标准：CI 中新增裸用 localStorage 的提交会失败，端到端测试覆盖配额超限与隐私模式两种分支。

### 动手作业

**目标**：做一个离线可用的待办清单，把 localStorage 与 IndexedDB 的分工写清楚，并能解释每一处选择。

**步骤**：
1. 建一个页面：一个输入框加一个列表，刷新后数据不丢。
2. 把待办正文与完成状态存进 IndexedDB 的 todos store，keyPath 设为 id。
3. 把界面偏好（主题、排序方式、上次筛选）存进 localStorage，键名带版本前缀。
4. 首次打开时用 localStorage 的一个标记判断要不要写入示例数据。
5. 监听 storage 事件，在另一个标签页改偏好时同步界面；再实现一遍 BroadcastChannel 同步，记录两者触发时机的差别。
6. 页面加一个按钮调 navigator.storage.estimate()，把用量与配额打印到页面上。
7. 在 DevTools 的 Network 面板选 Offline，加三条待办，再恢复网络并刷新，检查数据仍在。

**验收标准**：
- 刷新后待办条数与完成状态不变，Application 面板的 IndexedDB 区能看到 todos store 与对应记录。
- 隐私模式下打开页面不抛异常，偏好读不到时用默认值渲染，页面顶部有提示条说明偏好不会被记住。
- 两个同源标签页中任一个改主题，另一个在 1 秒内跟随变化。
- 添加 100 条待办后，页面上打印的用量数值增大，且控制台没有未捕获的 Promise 错误。

