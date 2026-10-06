---
title: 服务端攻击与传输安全
description: SQL 注入、SSRF、DDoS、文件上传，以及中间人攻击、数字签名、HMAC 与 WebSocket 安全。
---

# 服务端攻击与传输安全

## 1. SQL注入

### 1.1 什么是SQL注入

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

### 1.2 SQL注入防御

```javascript
// 正确：使用参数化查询(Prepared Statements)
const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
db.execute(query, [username, password]);
// 参数与SQL结构分离,输入被当作纯数据处理,无法改变SQL结构

// 正确：使用ORM框架(自动参数化)
const user = await User.findOne({
  where: { username, password: hash(password) }
});

// 正确：输入验证 + 最小权限原则
function validateUsername(input) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(input);
}
```

## 2. SSRF 与 DDoS

### 2.1 SSRF（服务器端请求伪造）

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

### 2.2 DDoS（分布式拒绝服务）

```
DDoS攻击类型:
  1. 带宽消耗型   → 发送大量流量,堵死带宽
  2. 协议攻击     → SYN Flood, 利用TCP握手消耗服务器资源
  3. 应用层攻击   → HTTP Flood, 发送大量看似合法的请求
  4. 僵尸网络     → 利用大量被控设备(肉鸡)同时发起请求

防御手段: CDN分发流量、WAF防火墙、限流、CAPTCHA、Anycast架构
```

## 3. 文件上传漏洞与路径穿越

### 3.1 文件上传漏洞

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

### 3.2 路径穿越

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

## 4. 中间人攻击与HTTPS

### 4.1 什么是中间人攻击

**正常通信：**

```
用户 ←[加密]→ 服务器
```

**中间人攻击：**

```
用户 ←[加密]→ 攻击者 ←[加密]→ 服务器
             ↓
        (解密后查看/修改内容)
        (转发并重新加密)
```

### 4.2 HTTPS如何防止MITM

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

## 5. 数字签名与 HMAC

### 5.1 数字签名原理

```
签名过程:
  消息 → Hash函数 → 摘要 → 用私钥加密 → 数字签名

验签过程:
  接收消息+签名 → 用公钥解密 → 得到摘要A
              → 对消息Hash → 得到摘要B
              → A===B? → 验证通过

关键: 私钥只有签名者知道,无法从公钥推导,Hash无法逆向
```

### 5.2 HMAC原理

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

## 6. WebSocket 安全问题

```javascript
// 1. 无同源策略限制: WebSocket不受SOP限制
//    → 任何页面都可连接你的WebSocket服务器

// 2. 防御: 使用Origin验证
const wss = new WebSocket.Server({
  verifyClient: (info) => allowed.includes(info.origin)
});

// 3. 必须使用 WSS (WebSocket Secure)
const ws = new WebSocket('wss://secure.com/ws');  // √ 加密
const ws = new WebSocket('ws://insecure.com/ws'); // × 不安全

// 4. 身份验证: Cookie不会自动发送,需在握手时传Token
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [RFC 6455 WebSocket](https://www.rfc-editor.org/rfc/rfc6455) | WebSocket 协议原文，握手与帧格式是安全问题的根源。 | 读第 4 章握手与第 5 章帧格式，抓包对照 Upgrade 请求，找 Origin 校验点。 |
| [Server Side Request Forgery (SSRF)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/SSRF) | 官方 SSRF 条目，讲清成因与云元数据等典型目标。 | 读成因与防御两节，列出内网地址黑名单思路，再设计白名单方案。 |
| [MDN SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) | 浏览器原生密码学 API，HMAC 与签名的最小可运行示例。 | 照示例做 HMAC-SHA256，与 Node 结果比对，注意密钥导入格式。 |
| [RFC 6265 HTTP State Management（Cookie）](https://www.rfc-editor.org/rfc/rfc6265) | Cookie 域与路径匹配规范，HTTPS 会话安全的底层规则。 | 读存储模型与 Secure/HttpOnly 属性，回头检查自己项目的 Cookie 设置。 |
| [MDN Web 安全](https://developer.mozilla.org/zh-CN/docs/Web/Security) | 系统化安全索引，同源策略与 CSP 是各类攻击的防御基础。 | 先读同源策略与 CSP，再按目录浏览注入、上传等攻击的防御要点。 |
| [Socket.IO 文档](https://socket.io/docs/v4/) | 房间与广播机制常出现鉴权缺失与越权风险。 | 实现房间与广播，重点看鉴权中间件一节，对比原生 WebSocket 差别。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Writing WebSocket servers](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers) | 手写握手与帧解析的完整示例，暴露服务端校验细节。 | 读握手校验与帧解析代码，动手加一个拒绝非法 Origin 的分支。 |
| [Writing WebSocket client applications](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications) | 客户端连接与消息处理示例，便于构造安全测试用例。 | 照示例建连接并发送畸形消息，观察服务端的响应与断开行为。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [PortSwigger：学习路径](https://portswigger.net/web-security/learning-paths) | 配套靶场的体系化路径，覆盖注入、SSRF、文件上传。 | 选服务端漏洞路径，按 SQL 注入、SSRF、文件上传顺序完成实验题。 |
| [廖雪峰 SQL 教程](https://liaoxuefeng.com/books/sql/introduction/) | 中文 SQL 入门，先把查询写对才看得懂注入原理。 | 在本地库逐条运行示例，重点练字符串拼接查询并推演注入点。 |
| [现代 JavaScript 教程：WebSocket](https://zh.javascript.info/websocket) | 从握手到心跳的渐进教程，是 WebSocket 安全的前置知识。 | 读握手与心跳两节，实现聊天室后思考消息鉴权应放在哪一层。 |
| [阮一峰：WebSocket 教程](https://www.ruanyifeng.com/blog/2017/05/websocket.html) | 中文快速入门，最短时间建立 WebSocket 整体图景。 | 跟着示例写回显服务并在浏览器连接，观察请求头里的 Origin。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格查询 | SQL注入 | PostgreSQL 预编译语句、ORM 查询构造器 | 排序字段走白名单，`LIMIT` 设上限 |
| 低端安卓 API 首屏加载 | 中间人攻击与 HTTPS | TLS 1.2+、证书锁定、禁止明文回退 | 配置备份 pin，轮换前灰度验证 |
| 多人协作白板写操作 | WebSocket 安全问题、数字签名与 HMAC | `wss`、Origin 校验、HMAC-SHA256 签名 | 签名覆盖房间号、序号、操作体 |
| 内部抓取外部报表地址 | SSRF 与 DDoS | 出站代理、DNS 再解析、IP 允许列表 | 跟随重定向后重新校验目标 IP |
| 头像上传与附件下载 | 文件上传漏洞与路径穿越 | UUID 重命名、白名单扩展名、内容嗅探 | 不拼接用户文件名，保存到 Web 根目录外 |
| 支付回调验签 | 数字签名与 HMAC | Webhook 签名、随机数、时间戳窗口 | 防重放窗口设置短，乱序回调要容忍 |
| 固件升级包下发 | 中间人攻击与 HTTPS、数字签名 | 固件签名、HTTPS、公钥锁定 | 区分开发包与发布包签名密钥 |
| 运营后台导出大文件 | 文件上传漏洞与路径穿越 | 服务端生成文件名、下载器读非公开目录 | 导出任务要鉴权，禁止路径参数映射到磁盘 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格查询

- **业务背景**：后台订单表约十万行，运营按日期、部门、关键词筛选，查询条件超过 20 个。原实现把筛选值直接拼进 SQL，遇到 `;` 或 `--` 会改掉语句结构。

- **怎么用本页知识解决**：把用户输入改为参数绑定，SQL 解析阶段固定，输入只能作为数据。排序字段和 `LIMIT` 仍需白名单校验。

```python
def query_orders(start_date, end_date, keyword, limit=100):
    conn = psycopg2.connect("...")  # 使用最小权限账号
    cur = conn.cursor()
    sql = """
        SELECT order_id, amount, created_at
        FROM orders
        WHERE created_at >= %(start_date)s
          AND created_at < %(end_date)s
          AND (customer_name LIKE %(keyword)s OR order_no LIKE %(keyword)s)
        ORDER BY created_at DESC
        LIMIT %(limit)s
        """  # 所有输入位置都使用命名占位符
    cur.execute(sql, {
        "start_date": start_date,  # 输入作为值传入
        "end_date": end_date,
        "keyword": f"%{keyword}%",  # 先限制长度，再构造值
        "limit": limit,
    })
    return cur.fetchall()
```

- 占位符由数据库驱动转义，用户输入不会改变 SQL 结构。
- `LIKE` 符号在代码中拼接，用户输入只作为值传入。
- `LIMIT` 也走参数，避免整数拼接注入。
- 排序字段必须从 `created_at`、`priority` 等白名单枚举中选择。
- 数据库账号只给 `SELECT` 权限，不给建表或改表权限。

- **怎么度量收益**：
  - 指标：SQL 注入告警数。工具：`sqlmap`，记录输出中无 `[CRITICAL]` 注入路径。
  - 指标：P95 查询耗时。工具：`pg_stat_statements` 或数据库慢日志，压测 100 个随机条件。
  - 指标：计划复用次数。工具：`EXPLAIN` 输出中的 `shared_blks_hit`，对比替换前是否稳定。

- **什么时候不该用**：
  - 查询条件只有固定 2 种组合且不来自用户输入，保留静态 SQL 即可。
  - 需要把完整 SQL 存成 DBA 审核过的管理端模板，且用户只能从枚举模板中选择，不应再拼字符串。
  - 数据访问层是离线导出任务，走数仓而非线上库，不必在线上开任意组合查询。

#### 场景 2：低端安卓的首屏加载

- **业务背景**：低端安卓在 2G 模拟或 5% 丢包网络下，TLS 握手和劫持重试会占到首屏请求 30% 以上。运营商或公共 Wi-Fi 下的错误证书会让连接在首屏阶段被挂起。

- **怎么用本页知识解决**：禁止明文回退，使用网络安全配置锁定 API 域名证书哈希。连接超时可以减小，但不清空证书固定。

```xml
<!-- 禁止明文回退，只信任 API 域名 -->
<network-security-config>
    <domain-config cleartextTrafficPermitted="false"> <!-- 禁止 http 回退 -->
        <domain includeSubdomains="true">api.example.com</domain> <!-- 只锁定 API 域名 -->
        <pin-set expiration="2026-01-01"> <!-- pin 到期前必须轮换备份 -->
            <pin digest="SHA-256">后端证书SHA256哈希值</pin> <!-- 填入运维提供的摘要 -->
        </pin-set>
    </domain-config>
</network-security-config>
```

- 证书锁定让中间人证书摘要不匹配，系统即使信任中间人 CA 也会连接失败。
- `cleartextTrafficPermitted="false"` 阻断明文回退，避免降级攻击。
- 后台、图片、日志三个域名分别配置，不把全部域名放在同一个 pin。
- 配置两个 pin：主 pin 和备份 pin，证书轮换时客户端不受影响。

- **怎么度量收益**：
  - 指标：中间人阻断率。工具：`mitmproxy`，开启代理后应用不应返回业务数据，错误日志显示 pin 不匹配。
  - 指标：TLS 握手耗时。工具：Android Network Profiler 或 `Perfetto`，记录 `SSL handshake` 阶段。
  - 指标：明文流量占比。工具：`Charles` 或 `tcpdump`，统计 `http://` 会话数量。

- **什么时候不该用**：
  - 应用只拉取公开无登录的静态内容，证书轮换事故风险大于中间人风险。
  - 团队没有双 pin 和灰度发布能力，固定 pin 会在证书轮换时造成客户端大面积不可用。
  - 第三方域名不定期更换 CDN 节点，固定到具体叶子证书会阻断合法节点。

#### 场景 3：多人协作白板

- **业务背景**：多人协作白板通过 WebSocket 广播笔画、矩形和文本编辑操作。用一个 100 房间、每房间 20 连接的本地压测可复现：单条消息在 10-100ms 到达服务端。

- **怎么用本页知识解决**：先校验 Origin，再对每个写操作加 HMAC 签名和递增序号。签名覆盖房间号、序号、操作体，服务端拒绝跨站连接和重放消息。

```javascript
import crypto from "node:crypto";
const seenSeq = new Map();
const ALLOWED_ORIGIN = "https://app.example.com"; // 只允许主站域名
const SECRET = process.env.WS_HMAC_SECRET; // 密钥不写死

function verifyMessage(origin, msg, sig, seq, roomId) {
  if (origin !== ALLOWED_ORIGIN) return false; // 跨站握手拒绝
  const data = `${roomId}:${seq}:${msg}`; // 签名覆盖房间、序号、消息体
  const expected = crypto.createHmac("sha256", SECRET)
    .update(data).digest("hex"); // 服务端重算 HMAC
  if (sig !== expected) return false; // 签名不一致丢弃
  if (seq <= (seenSeq.get(roomId) || 0)) return false; // 序号不递增视为重放
  seenSeq.set(roomId, seq);
  return true;
}
```

- Origin 校验阻止浏览器跨站页面复用已有 WebSocket 连接。
- HMAC 密钥只存在服务端和登录后客户端内存，不写进 URL 或 `localStorage`。
- 递增序号阻止旧消息重放，即使签名没有泄露。
- 握手阶段仍要校验登录态，签名不能代替身份认证。

- **怎么度量收益**：
  - 指标：恶意消息拒绝数。工具：自写 Node 脚本发送错误 Origin、错误签名、重放序号，统计被拒绝数量。
  - 指标：签名验证额外延迟。工具：`k6` 或 `artillery` 用 200 连接压测，记录 P95 延迟和进程 CPU。
  - 指标：正常消息到达率。工具：客户端发送 1000 条有序消息，统计服务端收到且顺序正确的数量。

- **什么时候不该用**：
  - 白板只在局域网演示，无账号体系，密钥分发成本高于篡改风险。
  - 服务端单向推送且客户端不能写消息，不需要对客户端写消息签名。
  - 写操作已由服务端完整业务校验，WebSocket 只是状态推流，重复签名增加 CPU。

### 行业先进实践

1. 占位符与预编译语句拦截 SQL 注入（出处：OWASP SQL Injection Prevention Cheat Sheet / PostgreSQL 官方文档 Prepared Statements）。把用户输入作为参数绑定，SQL 解析阶段固定。有效原因是输入只能被当作数据，不能改变语法树。你的项目可以把数据库访问层默认设为 prepared statement，排序字段改走白名单。

2. 证书锁定限制可信链（出处：Android 开发者文档 Network security configuration / OWASP Certificate Pinning Cheat Sheet）。客户端固定服务端证书公钥摘要，系统信任新 CA 也不能替换固定摘要。有效原因是中间人证书虽然被系统信任，但摘要不匹配，连接会失败。你的项目可以只对 API 域名启用 pin，并配置主 pin 和备份 pin。

3. WebSocket Origin 校验与消息级签名（出处：RFC 6455 / OWASP HTML5 Security Cheat Sheet）。握手阶段检查 Origin，写操作用 HMAC 覆盖序号和消息体。有效原因是跨站页面不能利用浏览器自动携带的连接，也不能伪造无密钥的消息。你的项目可以在网关层统一校验 Origin，下行业务只接收带序号签名的写操作。

4. 上传文件重命名与内容校验（出处：OWASP Unrestricted File Upload Cheat Sheet）。服务端用 UUID 生成存储名，先验 MIME 和扩展名，再做内容嗅探，不拼接用户文件名。有效原因是阻断路径穿越和伪装扩展名。你的项目可以保存到 Web 根目录外，下载时只通过服务端读取器返回。

5. SSRF 出站代理与 DNS 再解析（出处：OWASP SSRF Prevention Cheat Sheet）。统一出口代理先做域名解析，再对解析的 IP 做允许列表校验。有效原因是绕过仅检查原始域名、忽略重定向或 DNS rebinding。你的项目可以把所有外部请求交给同一个出站代理，禁止服务实例直连。

### 从学到用：落地路线

1. 第一步在后台报表查询模块试点：替换 2 个 SQL 拼接点。验收：`sqlmap` 对接口注入测试无 `[CRITICAL]` 输出。
2. 第二步在测试环境用攻击用例回放，并对比 `pg_stat_statements` 的查询计划复用。验收：攻击输入全部返回空结果或 400，计划复用次数不低于替换前。
3. 第三步把 SQL 参数化、上传重命名、WebSocket Origin 校验写进代码评审清单，按模块推广。验收：新提交审查记录中无字符串拼接 SQL、用户文件名拼接路径、无 Origin 校验的 WebSocket。
4. 第四步在 CI 加 Semgrep 或静态规则，阻断拼接 SQL 和不安全上传路径。验收：含违规模式的提交被 CI 标记失败，月度告警回归数为 0。

### 动手作业

目标：把本地最小任务板应用改成带 SQL 参数化、上传隔离、WebSocket 签名和 HTTPS 的示例。

步骤：

1. 用 Flask 或 Express 提供任务查询、头像上传、白板同步三个接口。
2. 把任务查询里的 SQL 拼接改成绑定参数，排序字段只允许 `created_at` 和 `priority`。
3. 把头像上传改成 `uuid.uuid4().hex` 重命名，存到 `data/uploads`，并只允许 `.jpg` 和 `.png`。
4. 给白板 WebSocket 加 Origin 校验，写消息用 HMAC-SHA256 签名，签名盖住房间号、序号、操作体。
5. 给本地 API 配 HTTPS，在客户端加证书锁定。
6. 写回归测试：`sqlmap` 扫查询接口；上传含 `../` 文件名；发送错误签名和重放序号。
7. 在 README 写清启动、测试、轮换证书步骤。

验收标准：

- `sqlmap` 对查询接口无注入告警。
- 上传 `../../tmp/evil.php` 返回 400，`data/uploads` 下没有 `evil.php`。
- 错误 Origin 连接被关断；错误 HMAC 消息被丢弃；重放旧序号被丢弃。
- 客户端对非锁定证书连接失败，或代理日志中无明文请求。
- 回归测试全部通过，README 有复现攻击和防护命令。

