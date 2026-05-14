# Chapter 6: 网络协议超完整题库（深度扩充版）

> 本文件为前端面试网络协议章节的深度扩充版本，涵盖 HTTP、DNS、CDN、WebSocket、SSE、RESTful、OAuth2、CORS、nginx 等核心主题。每个子节包含：定义/背景、ASCII 原理图、完整代码示例、对比表、常见陷阱与最佳实践、3 道面试追问 + 参考答案要点、参考来源。

---

## 6.1 HTTP 各版本对比（1.0 / 1.1 / 2 / 3）

### 定义/背景（一句话说清）

HTTP 是互联网数据交换的核心协议，从 1991 年的单行协议演进到今天基于 QUIC 的 HTTP/3，每个版本都是为了解决前一个版本的性能瓶颈。

### ASCII 时序/架构图

```
HTTP 版本演进时间轴

1991  HTTP/0.9   ── 单行协议，只支持 GET，无 header
       │
1996  HTTP/1.0   ── 引入请求头/响应头、MIME 类型、POST 方法
       │
1997  HTTP/1.1   ── 引入 keep-alive 持久连接、管道化、缓存控制（RFC 2068）
       │       队头阻塞：管道中后续请求必须等待队首响应返回
       │       现代浏览器解法：每个域名开 6 个 TCP 并发连接
       │
2015  HTTP/2     ── 二进制分帧、多路复用、HPACK 头部压缩、Server Push
       │       问题：TCP 层队头阻塞仍然存在（丢包会阻塞所有流）
       │
2022  HTTP/3     ── QUIC（UDP）替代 TCP，消除 TCP 队头阻塞（RFC 9114）
                  ── 0-RTT / 1-RTT 握手、连接迁移、前向保密默认启用

┌─────────────────────────────────────────────────────────────────┐
│                        HTTP/1.1 队头阻塞                         │
│  客户端                           服务器                         │
│    ├─ GET /a.html ────────────────────────> │                    │
│    ├─ GET /b.html ─────────────────────> │   管道中，后面的请求    │
│    ├─ GET /c.html ──────────────────> │     等待队首响应         │
│    │                                       │                     │
│    │<────────── Response: a.html ─────────┤  (a 慢，b/c 被卡)    │
│    │<────────── Response: b.html ─────────┤  (即使 b 已就绪)    │
│    │<────────── Response: c.html ─────────┤                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      HTTP/2 多路复用（单 TCP 连接）                │
│                                                                  │
│  Stream 1 (GET /index.html):  HEADERS(stream=1) + DATA(stream=1)│
│  Stream 3 (GET /style.css):   HEADERS(stream=3) + DATA(stream=3)│
│  Stream 5 (GET /app.js):     HEADERS(stream=5) + DATA(stream=5) │
│                                                                  │
│  所有帧在同一个 TCP 连接上交织返回，真正并行，无队头阻塞          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               HTTP/2 TCP 层队头阻塞（仍然存在）                   │
│                                                                  │
│  Stream 1: [A][B][C][D][E][F][G][H]...                         │
│  Stream 3: [a][b][c][d][e][f][g][h]...                         │
│                                                                  │
│  TCP 流中: [A][a][B][b][C][c][D][d]...                         │
│                ↑                                                 │
│           Stream 3 的 [c] 丢失了                                  │
│           TCP 必须等 [c] 重传收到后，才能交付 [D]                  │
│           → HTTP/2 的所有流都被阻塞（即使数据完好）               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    HTTP/3 协议栈                                  │
│  +-----------------------------+                                │
│  │         HTTP/3              │  应用层                         │
│  +-----------------------------+                                │
│  │          QUIC               │  可靠的 UDP                    │
│  │  +-----------------------+  │                                │
│  │  │  Stream 1            │  │  每个流独立流控，无队头阻塞     │
│  │  │  Stream 2            │  │                                │
│  │  │  Stream 3            │  │                                │
│  │  +-----------------------+  │                                │
│  │  │  Connection ID        │  │  连接迁移（WiFi→4G 不重连）   │
│  │  │  0-RTT / 1-RTT 握手  │  │  0-RTT：复用上次会话密钥       │
│  +-----------------------------+                                │
│  │          UDP                │  传输层（无需内核修改）         │
│  +-----------------------------+                                │
└─────────────────────────────────────────────────────────────────┘
```

### HPACK 头部压缩原理

```
HPACK 使用三个机制压缩 HTTP/2 头部：

1. 静态表（Static Table）：61 个预定义条目，index 直接引用
   Index 1:  :authority
   Index 2:  :method GET
   Index 4:  :path /
   Index 33: content-type: text/plain
   ...

2. 动态表（Dynamic Table）：当前连接中出现过的 Header，动态维护
   新增条目从 62 开始递增

3. Huffman 编码：对字符串值进行变长编码（ASCII 常用字符用短码）

结果：重复 Header 只传 index（1-2 bytes），节省约 60-90% 头部开销
```

### 完整代码示例（TS/JS）

```typescript
// HTTP 各版本的 Fetch 使用示例

// HTTP/1.1：每个域名最多 6 个并发连接（浏览器自动管理）
// 大量请求会排队——队头阻塞问题
const response1 = await fetch('/api/users');      // 并发 slot 1
const response2 = await fetch('/api/orders');     // 并发 slot 2
const response3 = await fetch('/api/products');    // 并发 slot 3

// HTTP/2：单连接多路复用，所有请求并行
// 浏览器自动使用 HTTP/2（如果服务器支持）
// 底层帧交织，无队头阻塞

// HTTP/3：通过 fetch 使用 HTTP/3
// Chrome 自动对支持 HTTP/3 的服务器使用 HTTP/3
// 可通过 protocol 属性检测当前使用的协议
const res = await fetch('https://http3.example.com/api');
console.log(res.url); // 协议是 h3-29 或 http/2 或 http/1.1

// 强制使用特定协议（测试用）
const controller = new AbortController();
const res2 = await fetch('https://example.com/api', {
  signal: controller.signal,
  // 注意：fetch 不直接暴露协议选择，这是网络栈的行为
});

// HTTP/2 Server Push 示例（Node.js）
// 注意：HTTP/2 Server Push 已被 HTTP/3 移除，现代浏览器也逐步放弃
function http2PushExample(req, res) {
  res.stream.confirmNew(); // 告诉连接层准备推送
  res.stream.pushStream({ ':path': '/style.css' }, (err, pushStream) => {
    pushStream.respondWithFile('/public/style.css', {
      'content-type': 'text/css',
    });
  });
  res.stream.respondWithFile('/public/index.html');
}
```

### 对比表

| 维度 | HTTP/1.1 | HTTP/2 | HTTP/3 |
|------|:--------:|:------:|:------:|
| 传输层 | TCP | TCP | QUIC (UDP) |
| 多路复用 | ❌ 无（6连接 workaround） | ✅ 单连接多流 | ✅ 单连接多流 |
| 队头阻塞 | TCP 层（连接级） | TCP 层（连接级） | ❌ 无（流级独立） |
| 头部压缩 | ❌ 无（纯文本） | HPACK | QPACK（HPACK 升级） |
| Server Push | ❌ | ✅（已废弃） | ❌ |
| 握手延迟 | 1-RTT（TCP+TLS） | 1-RTT（TCP+TLS） | 1-RTT / 0-RTT |
| 连接迁移 | ❌ | ❌ | ✅（Connection ID） |
| 前向保密(PFS) | 可选 | 可选 | ✅ 默认启用 |
| 队头阻塞类型 | 连接级 | 连接级 | 流级（无阻塞） |
| 复杂度 | 低 | 中 | 高（UDP 穿透性） |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| HTTP/2 下仍做域名分片 | 绕过 HTTP/1.1 并发限制的老技巧在 HTTP/2 下反而增加连接开销 | 合并域名，减少连接数 |
| HTTP/2 HPACK 索引中毒 | 动态表被污染导致安全问题和压缩失效 | 使用安全的代理/负载均衡器 |
| 0-RTT 重放攻击 | HTTP/3 0-RTT 数据可能被恶意重放 | 对 0-RTT 请求进行幂等性验证 |
| 中间设备不理解 QUIC | 企业防火墙/代理可能丢弃 UDP 443 流量 | 保留 TCP 443 回退方案 |
| HTTP/2 Server Push 滥用 | 推送不需要的资源浪费带宽 | 改用 preload 预加载提示 |

### 面试追问 + 参考答案要点

**Q1：HTTP/2 和 HTTP/3 的队头阻塞有何本质区别？**
> HTTP/2 的队头阻塞发生在 **TCP 层**——因为 TCP 保证字节流有序，丢失一个包后所有后续包都必须等待重传，即使这些包属于不同的 HTTP 流。HTTP/3 的队头阻塞发生在 **QUIC 流级别**——每个 QUIC 流独立有序，丢包只阻塞该流，其他流的数据正常交付给应用层。

**Q2：为什么 HTTP/3 要基于 UDP 而不是重新设计一个全新的传输层协议？**
> 1. **内核依赖**：TCP/UDP 在操作系统内核实现，更新需要内核升级，实际不可行。QUIC 在用户态实现，快速迭代。2. **穿透性**：防火墙、路由器、移动网络对 UDP 的支持已经很好（虽然有 QoS 限制）。3. **部署便利**：QUIC 可以通过客户端/服务端软件更新部署，不需要修改网络基础设施。4. **连接迁移**：UDP 包可以携带 Connection ID，切换网络（WiFi→4G）时无需重建连接。

**Q3：HPACK 头部压缩为什么比 HTTP/1.1 的 gzip 压缩更适合 HTTP/2？**
> 1. **无字典同步问题**：gzip 需要两端维护相同字典，HPACK 的静态表和动态表天然同步。2. **增量更新**：每次请求只传输增量头部，不需重新压缩整个消息。3. **抗重放**：HPACK 索引不能跨连接使用，不会泄露压缩字典。4. **安全性**：HPACK 设计上防止压缩侧信道攻击（CRIME/BREACH 攻击针对 HTTP 层压缩）。

### 参考来源 URL

- RFC 9110 (HTTP Semantics): https://www.rfc-editor.org/rfc/rfc9110
- RFC 9113 (HTTP/2): https://www.rfc-editor.org/rfc/rfc9113
- RFC 9114 (HTTP/3): https://www.rfc-editor.org/rfc/rfc9114
- HPACK: https://www.rfc-editor.org/rfc/rfc7541
- HTTP/3 explained: https://github.com/quicwg/base-drafts/wiki/Implementations

---

## 6.2 HTTP 无状态与 keep-alive

### 定义/背景（一句话说清）

HTTP 无状态指服务器不保存客户端请求的历史记录，每次请求都独立；keep-alive 是 HTTP/1.1 的持久连接机制，让多个请求复用同一个 TCP 连接，避免重复建连的开销。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│                    HTTP 无状态设计                               │
│                                                                  │
│  请求 1:  Client ──────────────────────> Server (处理请求)       │
│          Server 不保存请求 1 的任何信息                           │
│                                                                  │
│  请求 2:  Client ──────────────────────> Server (处理请求)       │
│          Server 不记得请求 1，纯粹处理请求 2                      │
│                                                                  │
│  优势:                                                           │
│  ✓ 服务器可任意水平扩展（无状态 = 任何服务器处理任何请求）       │
│  ✓ 服务器崩溃不丢失状态（状态在客户端）                         │
│  ✓ 服务器逻辑简单，无需维护会话表                                │
│                                                                  │
│  状态管理: 在应用层实现 → Cookie / Token / 自定义 Header         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              HTTP/1.0 无 keep-alive（短连接）                    │
│                                                                  │
│  请求 1:  TCP建连 → GET / → 响应 → TCP关闭                       │
│  请求 2:  TCP建连 → GET / → 响应 → TCP关闭                       │
│  请求 3:  TCP建连 → GET / → 响应 → TCP关闭                       │
│                                                                  │
│  问题: 每个请求都要 TCP 三次握手 + 四次挥手 = 大量 RTT 损耗        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              HTTP/1.1 + keep-alive（持久连接）                    │
│                                                                  │
│  TCP建连 → GET /index → 响应 → GET /style.css → 响应 → GET /app.js → 响应 → 关闭│
│                                                                  │
│  请求头:                                                         │
│  Connection: keep-alive  (HTTP/1.1 默认开启，可不写)             │
│  Keep-Alive: timeout=5, max=1000  (可选，告诉对方约束)           │
│                                                                  │
│  优势: 减少 TCP 建连/断开的 RTT 损耗，复用 TCP 连接               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              keep-alive vs HTTP/2 多路复用                       │
│                                                                  │
│  keep-alive: 单连接，串行请求（虽然复用 TCP，但请求还是串行的）    │
│  HTTP/2:   单连接，真正并行（多路复用，帧交织）                   │
│                                                                  │
│  HTTP/2 不需要 keep-alive，因为多路复用天然是持久连接             │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// Node.js HTTP/1.1 keep-alive 演示

import http from 'http';

// HTTP/1.1 默认启用 keep-alive
// 通过 Agent 控制连接池
const agent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,   // TCP socket 保持存活时间
  maxSockets: 5,           // 每个 host 最大并发 socket 数
  maxTotalSockets: 10,     // 所有 host 最大并发 socket 数
  scheduling: 'fifo',      // 'fifo' | 'lifo'（队列调度策略）
});

// 所有请求通过同一个 agent，自动复用 TCP 连接
async function fetchWithKeepAlive(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get({
      hostname: 'example.com',
      path,
      agent, // 传入 agent，复用连接池
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

// 发出多个请求，复用同一个 TCP 连接（只建一次 TCP）
const [r1, r2, r3] = await Promise.all([
  fetchWithKeepAlive('/a'),
  fetchWithKeepAlive('/b'),
  fetchWithKeepAlive('/c'),
]);

// 主动关闭 keep-alive 连接
agent.destroy();


// ============ 无状态 + Cookie 实现会话 ============

// 服务端：读取 Cookie，维护会话（注意：会话存在服务端，不是 HTTP 协议本身）
import { parse } from 'cookie';

interface Session {
  userId: string;
  role: string;
  expires: number;
}

const sessions = new Map<string, Session>(); // 生产用 Redis

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const cookies = parse(req.headers.cookie || '');
  const sessionId = cookies['session_id'];

  let session: Session | null = null;
  if (sessionId) {
    session = sessions.get(sessionId);
    if (!session || session.expires < Date.now()) {
      sessions.delete(sessionId); // 会话过期
      session = null;
    }
  }

  if (!session) {
    // 生成新会话
    const newId = crypto.randomUUID();
    sessions.set(newId, {
      userId: 'user_123',
      role: 'admin',
      expires: Date.now() + 24 * 3600 * 1000,
    });
    res.setHeader('Set-Cookie', `session_id=${newId}; HttpOnly; SameSite=Strict`);
    return res.end(JSON.stringify({ message: 'New session created' }));
  }

  res.end(JSON.stringify({ userId: session.userId, role: session.role }));
}
```

### 对比表

| 维度 | 无状态 | 有状态 | 说明 |
|------|:------:|:------:|------|
| 服务器扩展性 | 极好 | 需 Session 共享 | 无状态服务器可任意水平扩展 |
| 每个请求大小 | 小（自包含） | 大（需带 session ID） | 差异通常可忽略 |
| 服务器崩溃 | 无影响 | 丢失会话 | 无状态天然容灾 |
| 实时状态 | 困难 | 自然 | 无状态需要轮询/WebSocket |
| 实现复杂度 | 低 | 中高（需存储） | Cookie/Token/JWT 各有权衡 |
| keep-alive 状态 | TCP 连接持久 | 不相关 | keep-alive 是传输层，与 HTTP 语义层独立 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| keep-alive 超时设置过长 | 服务器维护大量空闲连接浪费资源 | 根据业务合理设置 timeout（如 30s） |
| keep-alive 不设置 max | 恶意客户端建立大量连接耗尽服务器 | 限制单 IP 最大连接数 |
| 误以为 HTTP 协议本身有状态 | HTTP 是无状态协议，状态靠 Cookie/Session 在应用层实现 | 理解分层：HTTP 语义层 vs 应用层 |
| 大量并发请求仍用 HTTP/1.1 | keep-alive 不能解决队头阻塞 | 升级 HTTP/2 或 HTTP/3 |
| Session 存储在进程内存 | 多实例部署时 Session 不共享 | 用 Redis 等分布式存储 |

### 面试追问 + 参考答案要点

**Q1：既然 HTTP 无状态，为什么还需要 Cookie？Session 和 Token 的本质区别是什么？**
> HTTP 无状态是协议层面的约束，Cookie/Session/Token 是应用层实现状态的方式。本质区别：Session 状态存储在**服务端**（服务器维护 Map<sessionId, Session>），客户端只持有 sessionId。Token（如 JWT）状态存储在**客户端**（Token 本身包含用户信息，由服务端验签）。Session 更安全（服务端可随时撤销），Token 更易扩展（无状态，多服务器无同步压力），但 Token 一旦泄露难以撤销。

**Q2：keep-alive 和 HTTP/2 的多路复用都能复用连接，它们的区别是什么？**
> keep-alive 是 HTTP/1.1 的机制，**请求仍然是串行的**——必须等一个请求完全返回才能发下一个（即使 TCP 连接复用）。HTTP/2 多路复用**真正并行**——多个请求/响应的帧在同一个 TCP 连接上交织发送和接收，不互相等待。keep-alive 是 TCP 连接复用，HTTP/2 多路复用是 TCP 连接复用 + HTTP 请求并行。

**Q3：HTTP/2 和 HTTP/3 是否还需要 keep-alive？**
> 不需要了。HTTP/2 和 HTTP/3 的连接默认就是持久的，不需要 Connection: keep-alive 头。HTTP/2 使用多路复用，HTTP/3 基于 QUIC 连接，两者天然是长连接。关闭连接需要发送 GOAWAY 帧（HTTP/2）或 CONNECTION_CLOSE 帧（HTTP/3）。

### 参考来源 URL

- RFC 9110 (HTTP Semantics) - Connection Management: https://www.rfc-editor.org/rfc/rfc9110#section-8.2
- MDN - HTTP connection control: https://developer.mozilla.org/en-US/docs/Web/HTTP/Connection_management
- HTTP Keep-Alive vs HTTP/2 Multiplexing: https://developer.mozilla.org/en-US/docs/Web/HTTP/Connection_management_tester

---

## 6.3 QUIC 基于 UDP 如何保证可靠性

### 定义/背景（一句话说清）

QUIC 是 Google 于 2012 年提出的传输层协议，运行在 UDP 之上，在用户态实现可靠的传输机制，从而获得比 TCP 更低的连接建立延迟和更好的拥塞控制灵活性，同时消除了 TCP 的队头阻塞问题。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│                 QUIC 为什么选择 UDP？                             │
│                                                                  │
│  重新设计传输层协议的现实障碍:                                     │
│  1. 需要操作系统内核支持（更新内核协议栈 = 基本不可能）             │
│  2. 需要网络中间设备（路由器/防火墙）支持新协议                     │
│  3. UDP 已有 40+ 年历史，广泛部署，无上述问题                       │
│                                                                  │
│  QUIC = 在用户态实现可靠传输（绕过内核限制，快速迭代）              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              QUIC 丢包恢复机制                                    │
│                                                                  │
│  1. 丢包检测:                                                     │
│     - 超时检测: 包发出后一段时间未收到 ACK，超时重传                │
│     - Duplicate ACK: 收到 3 个 ACK（同一包序号重复确认）            │
│                                                                  │
│  2. ACK Ranges（选择性确认，比 TCP SACK 更精确）:                   │
│     QUIC ACK 帧携带 "接收到的包范围" 而非单个序号                   │
│     例如: 收到 1-10, 12-15 → ACK Ranges: [1,10],[12,15]          │
│                                                                  │
│  3. 包序号重排保护:                                               │
│     包序号用紧凑编码（可重传时不增大序号），真正序号由 ACK 确认      │
│     避免 TCP 语义混淆（重传的包序号相同）                          │
│                                                                  │
│  4. 前向纠错 (FEC，可选):                                         │
│     丢包恢复不用重传，而是通过 FEC 包恢复数据                       │
│     代价：带宽开销，通常用于丢包率高的网络                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              QUIC 连接迁移（Connection Migration）                │
│                                                                  │
│  场景: 用户从 WiFi 切换到 4G，移动设备 IP 变化                      │
│                                                                  │
│  TCP 方案: 连接断开 → 重新三次握手 → 重建 TLS → 几百毫秒到秒级延迟  │
│                                                                  │
│  QUIC 方案:                                                      │
│  - 每个连接有一个稳定的 Connection ID（可变长，可有多个）           │
│  - 切换网络时，继续使用同一 Connection ID                          │
│  - 数据包到达新 IP，QUIC 层自动更新连接路径                        │
│  - 用户无感知，延迟约等于 0                                       │
│                                                                  │
│  Client (WiFi IP: 192.168.1.100) ── QUIC 包 (CID=abc) ──> Server  │
│       │                                                           │
│       └── 切换到 4G (IP: 10.20.30.40)                              │
│       │                                                           │
│       └── QUIC 包 (CID=abc, NEW_IP=10.20.30.40) ──> Server        │
│                                                                  │
│  服务端识别 CID=abc，继续通信，无缝切换                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              QUIC 帧 vs TCP 段                                    │
│                                                                  │
│  QUIC Packet:                                                   │
│  ┌──────────┬──────────┬─────────────┬──────────────┐             │
│  │ Header   │ 公共头部  │ 连接 ID     │ 包号         │             │
│  │ 头部     │ (可变)   │ (可变长)    │ (可变长)     │             │
│  ├──────────┴──────────┴─────────────┼──────────────┤             │
│  │ 加密 payload (STREAM帧等)         │ 认证标签     │             │
│  └──────────────────────────────────┴──────────────┘             │
│  QUIC 所有 payload 均加密（比 TLS 更强的隐私保护）                 │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// QUIC 在前端的应用场景

// 场景 1: fetch API 自动使用 HTTP/3（QUIC）
// 浏览器自动决定是否使用 HTTP/3，无需前端代码干预
const response = await fetch('https://http3.example.com/api/data');
// 网络栈自动尝试 HTTP/3，失败回退 HTTP/2 → HTTP/1.1

// 场景 2: 检测当前使用的协议（Performance API）
const connInfo = performance.getEntriesByType('resource')
  .find(r => r.name.includes('api/data')) as PerformanceResourceTiming;

if ('nextHopProtocol' in connInfo) {
  console.log('协议:', (connInfo as any).nextHopProtocol);
  // 'h3-29' → HTTP/3 draft-29
  // 'h2'    → HTTP/2
  // 'http/1.1' → HTTP/1.1
}

// 场景 3: 检测 QUIC 连接建立时间
const quicSetup = performance.getEntriesByType('resource')
  .filter(r => (r as any).nextHopProtocol?.startsWith('h3'));

quicSetup.forEach(entry => {
  const rtt = (entry as any).connectEnd - (entry as any).connectStart;
  console.log('QUIC 连接时间:', rtt, 'ms'); // 通常比 TCP+TLS 快 30-50%
});

// 场景 4: HTTP/3 服务器推送感知（已废弃，不推荐使用）
// Server Push 在 HTTP/3 中已被移除，改用 Early Hints
// <link rel="preload" href="/style.css" as="style" fetchpriority="high">

// 场景 5: 使用 undici（Node.js HTTP/3 客户端）
// 注意: Node.js 原生 HTTP/3 支持需要使用实验性模块或第三方库
// 以下使用模拟代码说明概念
async function quicRequestExample() {
  // undici v6+ 支持 HTTP/3 (底层使用 npm:nextjs/QUIC)
  const { Agent, request } = await import('undici');

  const agent = new Agent({
    connect: {
      // QUIC 特定选项
      keepAliveTimeout: 30000,
      // 未设置则默认 UDP 443 端口尝试 QUIC，失败回退 TCP
    }
  });

  const { statusCode, body } = await request(
    'https://example.com/api',
    { dispatcher: agent }
  );

  const text = await body.text();
  console.log('响应:', statusCode, text);
}

// 场景 6: 使用 Cloudflare Workers 的 QUIC 支持
// Cloudflare Workers 自动使用 HTTP/3（QUIC）
// 前端无需特殊代码，fetch() 自动走 QUIC
async function workerQuicExample() {
  const data = await fetch('https://ai-api.example.com/chat', {
    method: 'POST',
    body: JSON.stringify({ message: 'Hello' }),
    headers: { 'Content-Type': 'application/json' },
  });
  return data.json();
}
```

### 对比表

| 维度 | TCP | UDP | QUIC |
|------|:---:|:---:|:----:|
| 连接性 | 面向连接 | 无连接 | 逻辑连接（用户态） |
| 可靠性 | 可靠传输 | 不可靠 | 可靠传输（用户态实现） |
| 顺序性 | 保序 | 不保序 | 流内保序，流间独立 |
| 拥塞控制 | 有（内核） | 无 | 有（用户态，灵活） |
| 队头阻塞 | TCP 层（连接级） | 无 | 无（流级独立） |
| 头部大小 | 20B | 8B | 20-40B（可变） |
| 握手延迟 | 1-RTT + TLS | 0-RTT | 1-RTT / 0-RTT |
| 连接迁移 | 不支持 | 不支持 | 支持（CID 机制） |
| 数据加密 | TLS 加密 payload | 无 | 内置加密（整个 payload） |
| 部署难度 | 内核 | 无 | 用户态软件升级 |
| 移动网络优化 | 差（切换 IP 断连） | N/A | 好（Connection Migration） |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| 0-RTT 重放攻击 | 第二次连接的早期数据可能被恶意重放 | 对 0-RTT 请求进行幂等性验证，限制 0-RTT 数据内容 |
| QUIC 穿透性问题 | 企业网络/防火墙可能阻止 UDP 流量 | 保留 TCP 回退，始终确保 HTTP/2 可用 |
| QUIC 头部开销 | QUIC 头部比 TCP/IP 头加起来还大 | 对于小请求/响应，HTTP/3 未必更快 |
| 拥塞控制算法不兼容 | QUIC 的拥塞控制是用户态的，可能与网络设备冲突 | 使用标准算法（CUBIC/BBR），避免激进策略 |
| HTTP/3 主动关闭 | 服务端主动关闭时通知机制不如 HTTP/2 GOAWAY | 使用 Application-Level 关闭确认 |

### 面试追问 + 参考答案要点

**Q1：QUIC 的连接迁移（Connection Migration）是如何实现的？**
> 每个 QUIC 连接有一个或多个 Connection ID（CID），CID 与底层 IP 地址解耦。当客户端 IP 变化时（WiFi→4G），客户端继续使用相同的 CID 发送数据包（现在从新 IP 发出），服务端根据 CID 识别连接并更新路径。数据包到达新 IP 后，QUIC 层自动更新连接路径，无需重建连接，延迟几乎为零。

**Q2：QUIC 的 0-RTT 握手安全吗？有什么风险？**
> 0-RTT 使用上次会话的密钥直接加密发送数据，节省 1-RTT。但存在**重放攻击**风险：攻击者可以截获并重放 0-RTT 数据。另外，0-RTT 数据不提供前向保密（密钥是上次会话复用的）。实践中，对 0-RTT 请求应进行幂等性验证，或限制 0-RTT 可发送的数据内容（如只允许读操作）。

**Q3：QUIC 的拥塞控制为什么比 TCP 更灵活？**
> TCP 的拥塞控制在内核中实现，更新需要升级操作系统。QUIC 的拥塞控制在用户态实现，应用可以：1. 在同一连接上运行多个独立的拥塞控制算法（按场景切换）。2. 快速迭代新算法（软件更新即可）。3. 针对不同流使用不同策略（流级拥塞控制）。4. 精细化控制（精确到单个包的 ACK 确认）。BBR、PCC、COPA 等新算法首先在 QUIC 上实验。

### 参考来源 URL

- IETF QUIC Working Group: https://datatracker.ietf.org/wg/quic/documents/
- RFC 9000 (QUIC 传输协议): https://www.rfc-editor.org/rfc/rfc9000
- RFC 9001 (QUIC TLS): https://www.rfc-editor.org/rfc/rfc9001
- Chromium QUIC Implementation: https://www.chromium.org/quic/
- QUIC 设计文档: https://github.com/quicwg/base-drafts/wiki

---

## 6.4 TCP vs UDP vs QUIC

### 定义/背景（一句话说清）

TCP、UDP 和 QUIC 是三种传输层协议：TCP 是面向连接、可靠但有队头阻塞的全双工协议；UDP 是无连接、不可靠但开销极低的无状态协议；QUIC 是 Google 在 UDP 之上构建的可靠传输协议，兼具两者优点并消除了 TCP 的队头阻塞。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│                    传输层协议三分天下                            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │     TCP      │  │     UDP      │  │    QUIC      │          │
│  │  可靠传输    │  │  不可靠传输  │  │  可靠传输    │          │
│  │  面向连接    │  │  无连接      │  │  逻辑连接    │          │
│  │  1981 RFC    │  │  1980 RFC    │  │  2012 Google │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│  ┌──────┴─────────────────┴─────────────────┴───────┐          │
│  │                    IP 层                          │          │
│  └───────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              TCP vs UDP 核心行为对比                              │
│                                                                  │
│  TCP（三次握手 + 可靠传输）:                                      │
│  Client ── SYN ─────────> Server   (请求连接)                    │
│  Client <── SYN+ACK ───── Server   (同意，ISN=y)                 │
│  Client ── ACK ─────────> Server   (确认，连接建立)               │
│  Client ── DATA ────────> Server   (可靠传输，有 ACK)             │
│  Client <── DATA ──────── Server   (保序，无重复)                 │
│                                                                  │
│  UDP（直接发送，无连接）:                                         │
│  Client ── DATA ────────> Server   (发完就走，不管不顾)            │
│  Client ── DATA ────────> Server   (可能丢包/乱序/重复)           │
│                                                                  │
│  QUIC（在 UDP 上可靠传输）:                                       │
│  Client ── Initial (版本协商+加密握手) ──> Server                  │
│  Client <── Handshake (确认密钥) <────────────── Server           │
│  Client ── STREAM帧 (业务数据，已加密) ──> Server                  │
│  Client <── STREAM帧 (业务数据，已加密) <── Server                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              队头阻塞：TCP vs QUIC 的关键差异                     │
│                                                                  │
│  TCP（连接级队头阻塞）:                                           │
│  连接: [Stream1-pkg1][Stream2-pkg1][Stream1-pkg2][Stream3-pkg1] │
│              ↓                                                    │
│          Stream2-pkg1 丢失了                                       │
│              ↓                                                    │
│  → Stream1-pkg2, Stream3-pkg1 全被阻塞（即使数据完好）            │
│                                                                  │
│  QUIC（流级独立，无队头阻塞）:                                     │
│  连接: [Stream1-pkg1][Stream2-pkg1][Stream1-pkg2][Stream3-pkg1]  │
│              ↓                                                    │
│          Stream2-pkg1 丢失了                                       │
│              ↓                                                    │
│  → Stream1-pkg2 正常交付（流 1 不受影响）                         │
│  → Stream3-pkg1 正常交付（流 3 不受影响）                         │
│  → 只有 Stream2 等待重传                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// TCP vs UDP vs QUIC 在 Web 前端的应用场景

// ============ 场景 1：HTTP 协议自动选择传输层 =============

// HTTP/1.1 → 强制 TCP（无选择）
const h1 = await fetch('/api/data'); // 底层：TCP + TLS

// HTTP/2 → 强制 TCP（即使应用层多路复用）
const h2 = await fetch('https://h2.example.com/api/data');
// 底层：TCP + TLS + HTTP/2 多路复用（TCP 层队头阻塞）

// HTTP/3 → 优先 QUIC，失败回退
const h3 = await fetch('https://h3.example.com/api/data');
// 底层：QUIC (UDP) → 失败则 HTTP/2 (TCP)

// ============ 场景 2：WebRTC 使用 UDP（媒体流） =============

// WebRTC 的媒体流（RTP/RTCP）直接走 UDP
// DataChannel 提供可靠/有序选项（应用层实现）
const pc = new RTCPeerConnection({
  // 音视频轨道走 UDP（RTP）
  video: { minBitrate: 1000, maxBitrate: 5000 },
  audio: { minBitrate: 32, maxBitrate: 128 },
});

// DataChannel 可以配置为可靠或不可靠
const channel = pc.createDataChannel('gameState', {
  ordered: false,          // 不保证顺序（类似 UDP）
  maxRetransmits: 0,      // 不可靠模式（类似 UDP）
  // 如果需要可靠性：ordered: true, maxRetransmits: 3
});

channel.onmessage = (event) => {
  const gameState = JSON.parse(event.data);
  // 适用于: 游戏手柄状态、实时位置更新（允许丢包）
};

// ============ 场景 3：TCP 直连（WebSocket） =============

const ws = new WebSocket('wss://game.example.com/realtime');
// WebSocket 底层使用 TCP
// 问题：TCP 的队头阻塞会影响 WebSocket 的实时性
// 解决：用多个 WebSocket 连接（每个连接独立 TCP，不互相阻塞）
const ws1 = new WebSocket('wss://game.example.com/control');  // 控制命令
const ws2 = new WebSocket('wss://game.example.com/audio');   // 音频流

// ============ 场景 4：判断网络支持 QUIC =============

function supportsHTTP3(): Promise<boolean> {
  return new Promise((resolve) => {
    const url = window.location.href;
    const start = performance.now();

    fetch(url, { mode: 'cors' }).then(() => {
      const entries = performance.getEntriesByType('resource') as any[];
      const current = entries[entries.length - 1];
      if (current?.nextHopProtocol?.startsWith('h3')) {
        resolve(true);
      } else {
        resolve(false);
      }
    }).catch(() => {
      resolve(false);
    });
  });
}

const isHTTP3 = await supportsHTTP3();
console.log(isHTTP3 ? '使用 HTTP/3 (QUIC)' : '使用 HTTP/2 或 HTTP/1.1');

// ============ 场景 5：QUIC 在游戏中的适用性分析 =============

function selectTransportForGame(gameType: string) {
  switch (gameType) {
    case 'fps': {
      // FPS 游戏：允许丢包，低延迟 > 可靠性
      // → UDP（WebRTC DataChannel, unordered, maxRetransmits=0）
      console.log('→ UDP (DataChannel, unreliable)');
      break;
    }
    case 'moba': {
      // MOBA：部分丢包可接受，大量小更新
      // → UDP with reliability（WebRTC DataChannel, ordered, maxRetransmits=3）
      console.log('→ UDP with partial reliability');
      break;
    }
    case 'turn-based': {
      // 回合制：必须可靠，顺序无关
      // → WebSocket（TCP，回合指令）
      console.log('→ WebSocket (TCP, reliable)');
      break;
    }
    case 'chat': {
      // 聊天：必须可靠有序
      // → HTTP/2 或 HTTP/3（长连接+多路复用）
      console.log('→ HTTP/2 or HTTP/3');
      break;
    }
  }
}
```

### 对比表

| 维度 | TCP | UDP | QUIC |
|------|:---:|:---:|:----:|
| 头部开销 | 20B | 8B | 20-40B |
| 连接建立 | 1-RTT + TLS 1-RTT | 0-RTT | 1-RTT + 0-RTT |
| 可靠性 | 可靠（ACK 重传） | 不可靠 | 可靠（用户态 ACK） |
| 顺序性 | 保序 | 不保序 | 流内保序，流间独立 |
| 流量控制 | rwnd（接收窗口） | 无 | 独立流控 + 连接级流控 |
| 拥塞控制 | 内核实现（难改） | 无 | 用户态实现（灵活） |
| 队头阻塞 | 连接级（所有流） | 无 | 流级（仅丢包流） |
| 连接迁移 | 不支持 | 不支持 | 支持（CID） |
| 数据加密 | TLS（部分） | 无 | 内置完整加密 |
| 多路复用 | 无（需 HTTP/2） | 无 | 流级（原生） |
| 适用场景 | WebSocket、HTTPS | DNS、VoIP、游戏 | HTTP/3、实时通信 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| 在需要低延迟的场景用 TCP | TCP 的拥塞控制过于保守，重传延迟高 | 对延迟敏感场景用 UDP 或 QUIC |
| 在需要可靠性的场景用 UDP | 丢包会导致数据不完整 | 在应用层实现可靠性（ACK、重传） |
| 混淆 HTTP 协议和传输层 | HTTP/2 使用 TCP，HTTP/3 使用 QUIC | 理解分层：HTTP 语义 vs TCP/UDP/QUIC 传输 |
| QUIC 穿透性失败无回退 | 防火墙阻止 UDP 443 | 始终保留 TCP 回退路径 |
| WebRTC 误用可靠 DataChannel | 可靠性带来队头阻塞，丧失低延迟优势 | 根据场景选择 ordered/unordered |

### 面试追问 + 参考答案要点

**Q1：为什么 DNS 主要用 UDP 而不是 TCP？**
> DNS 设计于 1983 年（RFC 882/883），选择 UDP 的核心理由：1. **低延迟**：DNS 查询是高频操作（每个 HTTP 请求前都要 DNS），UDP 无握手，查询速度极快（毫秒级）。2. **简单性**：DNS 协议简单，每个响应通常小于 512 字节。3. **轻量**：UDP 头部 8 字节 vs TCP 20 字节，对 DNS 这种小请求更高效。TCP 用于：响应超过 512 字节（DNSSEC）、区域传输（AXFR）、连接型查询。

**Q2：QUIC 能否完全替代 TCP？**
> 不能，原因有三：1. **穿透性**：企业网络、防火墙、某些移动网络对 UDP 支持不完整（QoS 限制、深度包检测可能拦截）。2. **协议成熟度**：TCP 有 40+ 年部署经验，QUIC 仍在快速迭代中。3. **场景差异**：对可靠性要求极高的场景（如文件传输）TCP 仍是首选。QUIC 更适合 Web 场景（HTTP/3）、实时通信（游戏/语音）和移动网络（连接迁移）。

**Q3：既然 QUIC 基于 UDP，是否意味着 QUIC 不如 TCP 可靠？**
> 不是。QUIC 在用户态实现了完整的可靠性机制：包序号重排、ACK Ranges 选择性确认、丢包重传、流量控制、拥塞控制。相比内核实现的 TCP，QUIC 的可靠性机制更精细（流级），并且因为独立于操作系统，可以更快速地修复 bug 和部署新算法。实际上 QUIC 的可靠性**优于** TCP（在丢包场景下，因为队头阻塞只影响单个流）。

### 参考来源 URL

- RFC 793 (TCP): https://www.rfc-editor.org/rfc/rfc793
- RFC 768 (UDP): https://www.rfc-editor.org/rfc/rfc768
- RFC 9000 (QUIC): https://www.rfc-editor.org/rfc/rfc9000
- QUIC vs TCP Comparison (Google): https://www.chromium.org/quic/
- WebRTC DataChannel: https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel

---

## 6.5 TCP 拥塞控制 / 滑动窗口

### 定义/背景（一句话说清）

TCP 滑动窗口是流量控制机制，防止发送方超过接收方处理能力；拥塞控制是防止发送方超过网络承载能力的机制。两者共同决定 TCP 的发送速率，是理解 TCP 性能的核心。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              TCP 滑动窗口（发送方视角）                           │
│                                                                  │
│  已发送并 ACK  │ 已发送未 ACK  │   可发送区域   │   不能发送     │
│ [SENT & ACKED] │ [SENT NOT ACK]│   [NOT SENT]  │ [CANNOT SEND] │
│                 ←──────────────────→←─────────────→              │
│                 ↑                  ↑            ↑                │
│              SND.UNA           SND.NXT       SND.UNA+SND.WND   │
│                                                                  │
│  SND.UNA: 第一个未被确认的字节序号                                │
│  SND.NXT: 下一个可发送的字节序号                                 │
│  SND.WND: 接收方通告的窗口大小（rwnd）                           │
│                                                                  │
│  ┌──────────┬──────────────────┬──────────────────┬───────────┐ │
│  │ 已确认    │   已发未确认      │    可发送        │  不能发   │ │
│  │ [0-999]  │   [1000-1999]    │   [2000-2999]   │ [3000+]  │ │
│  │          │  (发送窗口)      │   (拥塞窗口)    │           │ │
│  └──────────┴──────────────────┴──────────────────┴───────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              发送窗口 = min(rwnd, cwnd)                          │
│                                                                  │
│  流量控制: rwnd（接收窗口）                                       │
│  - 目的: 防止发送方超过接收方的处理能力                           │
│  - 工具: 接收方在 ACK 中通告剩余接收缓存大小                      │
│  - 机制: 接收方通过 ACK 告诉发送方 "我还能收多少"                │
│                                                                  │
│  拥塞控制: cwnd（拥塞窗口）                                       │
│  - 目的: 防止发送方超过网络的承载能力                             │
│  - 工具: 慢启动阈值 ssthresh、丢包事件                           │
│  - 机制: 根据网络反馈（丢包/RTT）调整发送速率                     │
│                                                                  │
│  发送窗口 = min(rwnd, cwnd)                                       │
│  → 两者同时生效，取较小值                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              TCP 拥塞控制四算法                                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. 慢启动 (Slow Start)                                    │   │
│  │    - cwnd 初始值 = 1 MSS（约 1460 bytes）                  │   │
│  │    - 每收到一个 ACK: cwnd += 1 MSS（指数增长）              │   │
│  │    - 直到 cwnd >= ssthresh，进入拥塞避免                   │   │
│  │                                                            │   │
│  │    cwnd → 1 → 2 → 4 → 8 → ... (翻倍增长)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓ ssthresh                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2. 拥塞避免 (Congestion Avoidance)                         │   │
│  │    - 每收到一个 ACK: cwnd += MSS²/cwnd（线性增长）         │   │
│  │    - 每 RTT 增加 1 MSS                                     │   │
│  │                                                            │   │
│  │    cwnd → 慢启动到 ssthresh 后，平滑线性增长               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓ 丢包检测                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3. 快速重传 (Fast Retransmit)                               │   │
│  │    - 收到 3 个 Duplicate ACK（同一序号重复确认）            │   │
│  │    - 不等超时，立即重传丢失的包                             │   │
│  │    - ssthresh = cwnd / 2, cwnd = ssthresh + 3*MSS         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓ 进入                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 4. 快速恢复 (Fast Recovery)                                │   │
│  │    - cwnd = ssthresh + 3*MSS                              │   │
│  │    - 收到新 ACK 后进入拥塞避免                             │   │
│  │    - 丢包恢复后，速率更快恢复（而非重新慢启动）             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              TCP BBR vs CUBIC（两种拥塞控制算法）                 │
│                                                                  │
│  CUBIC（Linux 默认，TCP Reno 的后代）:                           │
│  - 基于丢包检测：丢包 = 网络拥塞                                 │
│  - 周期性地增加 cwnd，检测到丢包后减少                           │
│  - 问题：高带宽高延迟网络（BDP 大）效率低                        │
│  - 问题：缓冲区膨胀（Bufferbloat）导致额外延迟                  │
│                                                                  │
│  BBR（Google 2016，提出第一性原理）:                              │
│  - 丢包 ≠ 拥塞（丢包可能是缓冲区满，不代表利用率满）               │
│  - 测量：RTprop（物理最小延迟）和 BtlBw（物理最大带宽）           │
│  - 目标：精确地在 BtlBw 附近运行，不填满缓冲区                    │
│  - 优势：高 BDP 网络效率高，延迟更低                             │
│                                                                  │
│  BBR vs CUBIC 在高 BDP 链路:                                     │
│  BDP = 带宽 × 延迟 = 10 Gbps × 100ms = 1 Gbit = 125 MB          │
│  CUBIC: 过度填充缓冲区，延迟飙升                                  │
│  BBR: 精确控制，延迟稳定                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// TCP 拥塞控制在 Node.js 中的体现（通过 net 模块）

import net from 'net';

// TCP 连接性能观测（通过 socket 信息）
const socket = net.connect(443, 'example.com', () => {
  // 获取 socket 缓冲区大小（反映流量控制）
  console.log('发送缓冲区大小:', socket.bufferSize, 'bytes');
  // bufferSize > 0 说明发送速率 > 网络吸收能力

  // socket.bytesRead / socket.bytesWritten 可用于监控
});

// Node.js 不直接暴露 cwnd，但可以通过测量 RTT 和吞吐量推算
async function measureTCPThroughput(host: string, path: string) {
  const entries = performance.getEntriesByType('resource') as any[];

  // 等待资源加载完成
  await fetch(`https://${host}${path}`);

  const entry = entries.find(e => e.name.includes(path));
  if (!entry) return;

  const {
    connectStart, connectEnd,
    secureConnectionStart, secureConnectionEnd,
    responseStart, responseEnd,
    transferSize,
  } = entry;

  const tcpTime = connectEnd - connectStart;
  const tlsTime = secureConnectionEnd - secureConnectionStart;
  const ttfb = responseStart - connectEnd;  // Time To First Byte
  const totalTime = responseEnd - connectStart;
  const throughput = transferSize / (totalTime / 1000); // bytes/s

  console.log(`
    TCP 建连: ${tcpTime.toFixed(1)}ms
    TLS 握手: ${tlsTime.toFixed(1)}ms
    TTFB:     ${ttfb.toFixed(1)}ms
    吞吐率:   ${(throughput / 1024 / 1024).toFixed(2)} MB/s
  `);

  // 分析：如果 TTFB 很大，可能是拥塞窗口限制（慢启动）
  // 解决：使用 TLS 1.3 0-RTT，或预热连接
}

// ============ HTTP/2 多路复用 + TCP 拥塞控制 ============

// HTTP/2 在单 TCP 连接上多路复用
// 问题：所有流共享同一个 cwnd
// 一个流丢包 → cwnd 减少 → 所有流速率下降

// 解决方案：HTTP/3（QUIC）为每个流独立控制

// ============ Connection: keep-alive vs 每次新建连接 ============

// 短连接（每次请求新建 TCP）
// cwnd 从 1 MSS 开始 → 慢启动 → 达到预期速率
// 大量请求时，每次都要重新慢启动，效率极低

// 长连接（keep-alive / HTTP/2）
// cwnd 保持在较高水平 → 新请求可以立即全速发送
// 充分利用已经"热身"好的拥塞窗口

// 预热连接（Connection Warm-up）
async function warmUpConnection(apiBase: string) {
  // 发送一个小请求预热连接
  // 这个请求触发 TCP 三次握手 + TLS 握手，建立连接
  // 后续真实请求复用这个"热"连接
  await fetch(`${apiBase}/ping`, {
    method: 'HEAD', // 只探测，不传数据
  });
  // 现在 cwnd 已经增长，后续请求更快
}

// ============ Web 性能优化：减少 RTT = 提高有效吞吐量 ============

// 关键公式：有效吞吐量 ≈ (cwnd / RTT)
// RTT 越小，有效吞吐量越大

// 在高延迟网络（移动网络）中：
// 1. CDN 就近接入 → 减少物理距离 → 降低 RTT
// 2. HTTP/2 多路复用 → 减少握手次数
// 3. TLS 1.3 1-RTT → 减少握手 RTT
// 4. 0-RTT → 消除握手 RTT（对重复连接）
```

### 对比表

| 维度 | 流量控制（rwnd） | 拥塞控制（cwnd） |
|------|:----------------:|:----------------:|
| 控制目标 | 接收方缓存 | 网络瓶颈 | 
| 控制者 | 接收方（通告窗口大小） | 发送方（主动调整） |
| 工具 | ACK 中的 rwnd 字段 | 慢启动/拥塞避免/快速重传 |
| 触发条件 | 接收方缓存满 | 丢包或 RTT 异常 |
| 目的 | 不让接收方溢出 | 不让网络过载 |
| 公式 | 发送窗口 ≤ rwnd | 发送窗口 ≤ cwnd |
| 最终 | 发送窗口 = min(rwnd, cwnd) | |

| 算法 | 类型 | 丢包检测 | 优势 | 劣势 |
|------|------|:--------:|------|------|
| TCP Reno | 基于丢包 | 是 | 简单稳定 | 高 BDP 效率低 |
| CUBIC | 基于丢包 | 是 | Linux 默认，稳定 | 缓冲区膨胀 |
| BBR | 基于模型 | 否 | 高 BDP 高效，低延迟 | 公平性争议 |
| DCTCP | 基于丢包 | 是（精确） | 数据中心低延迟 | 需要 ECN 支持 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| 混淆流量控制和拥塞控制 | rwnd 和 cwnd 共同决定发送窗口，但目的不同 | 理解 min(rwnd, cwnd) 公式 |
| 小文件不用 CDN | 每个请求都要慢启动，带宽利用率极低 | CDN 预热，HTTP/2 多路复用 |
| 移动网络频繁断连 | 每次断连重连都要重新慢启动 | HTTP/3 连接迁移，TCP keep-alive |
| TCP 缓冲区设太大 | 导致高延迟（Bufferbloat） | 合理设置 socket 缓冲区大小 |
| BBR 在低带宽链路表现差 | BBR 假设丢包 ≠ 拥塞，低带宽下不适用 | 链路自适应：BBR vs CUBIC 按需切换 |

### 面试追问 + 参考答案要点

**Q1：为什么 TCP 慢启动是必要的？**
> 慢启动的目的是在不了解网络容量的情况下，**安全地探测可用带宽**。如果一开始就用大窗口发送，可能导致网络设备（路由器、交换机）缓冲区溢出，产生大量丢包和重传，反而降低吞吐量。慢启动用指数增长快速找到网络容量上限（ssthresh），然后进入拥塞避免平稳运行。初始 cwnd 从 1 MSS 开始是保守但安全的策略。

**Q2：快速重传为什么要求收到 3 个 Duplicate ACK？**
> 3 个是经验值，平衡了**准确性**和**及时性**：收到 1-2 个 Duplicate ACK 可能是包重排（网络中有时延不同的路径），不一定是丢包。收到 3 个 Duplicate ACK 说明数据包确实丢失了（对方收到了后续数据，但丢失的那个数据还没到）。此时可以确定丢包，触发快速重传而不必等待超时计时器，提高恢复速度。

**Q3：为什么 QUIC 能解决 TCP 的队头阻塞问题？**
> TCP 的队头阻塞发生在**传输层**：TCP 保证字节流有序，丢失一个包后所有后续包（包括属于其他 HTTP 流的包）都要等待该包重传，即使这些包本身完好无损。QUIC 的队头阻塞发生在**流级别**：每个 QUIC 流独立有序，丢失一个流的一个包，只阻塞该流，其他流的数据正常交付给应用层。这是 HTTP/2 相比 HTTP/1.1 的进步被 TCP 层抵消，而 HTTP/3 用 QUIC 彻底解决了这个问题。

### 参考来源 URL

- RFC 5681 (TCP Congestion Control): https://www.rfc-editor.org/rfc/rfc5681
- RFC 7323 (TCP Selective Acknowledgment): https://www.rfc-editor.org/rfc/rfc7323
- BBR: https://queue.acm.org/detail.cfm?id=3022184
- TCP CUBIC: https://www.kernel.org/doc/Documentation/networking/tcp_cubic.txt
- tcp_nodelay / socket buffer tuning: https://www.techtarget.com/searchnetworkte

---

## 6.6 SYN Flood 与防御

### 定义/背景（一句话说清）

SYN Flood 是最经典的 DDoS 攻击方式，攻击者发送大量 SYN 包但不完成三次握手，导致服务器维护大量半开连接（TCP 五元组 + TCB），最终耗尽服务器资源。防御核心是**不在未完成握手的连接上分配资源**，代表技术是 SYN Cookies。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              正常三次握手（资源分配时机）                          │
│                                                                  │
│  Server 收到 SYN 后:                                             │
│  1. 创建 TCB（Transmission Control Block）← 消耗内存             │
│  2. 分配 socket 缓冲区                                           │
│  3. 进入 SYN_RCVD 状态                                           │
│  4. 等待 client 的 ACK（最多等几分钟）                            │
│                                                                  │
│  Client ── SYN (seq=x) ──────> Server                           │
│  Server: 创建 TCB, 状态=SYN_RCVD                                 │
│  Client ── ACK (ack=x+1) ────> Server                           │
│  Server: 状态=ESTABLISHED，连接建立                              │
│                                                                  │
│  结论: 三次握手期间，Server 在第二次握手后分配了资源              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              SYN Flood 攻击原理                                   │
│                                                                  │
│  攻击者（或僵尸网络）发送海量 SYN，但不发送最终 ACK:              │
│                                                                  │
│  Client(攻击者) ── SYN ──> Server  (TCB #1 创建)                 │
│  Client(攻击者) ── SYN ──> Server  (TCB #2 创建)                 │
│  Client(攻击者) ── SYN ──> Server  (TCB #3 创建)                 │
│  ...                                                             │
│  Client(攻击者) ── SYN ──> Server  (TCB #100000 创建)            │
│                                                                  │
│  最终状态:                                                       │
│  - Server: 100000 个 TCB，状态=SYN_RCVD（半开连接）              │
│  - 内存耗尽 → 无法处理正常请求                                    │
│  - ACK 永远不会来 → 这些连接永远不会完成                           │
│                                                                  │
│  攻击来源伪造:                                                   │
│  - Source IP 可以随机伪造（IP 协议不验证源地址）                   │
│  - 所以攻击者不需要控制僵尸网络也可以发起                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              SYN Cookies 防御（核心思想：不分配资源）             │
│                                                                  │
│  传统 SYN Queue（无 Cookies）:                                    │
│  SYN ──> 分配 TCB ──> 进入 SYN Queue ──> 等 ACK ──> 移入 accept │
│                                                                  │
│  SYN Cookies（有 Cookies）:                                       │
│  SYN ──> 不分配 TCB ──> seq = hash(IP, Port, Secret, 时间戳) ──> │
│           用 seq 代替 TCB，存储连接信息                           │
│                                                                  │
│  第三次握手（ACK 到来）:                                          │
│  Server 验证 cookie = hash(IP, Port, Secret, 时间戳)              │
│  验证通过 → 重建 TCB → ESTABLISHED                               │
│  验证失败 → 丢弃 → 不分配任何资源                                │
│                                                                  │
│  SYN Cookies 本质:                                                │
│  用 "密码学承诺"（cookie）代替 "内存承诺"（TCB）                  │
│  第三次握手时才验证，之前不占用任何服务器资源                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              SYN Flood 防御策略总览                               │
│                                                                  │
│  1. SYN Cookies（Linux 内核默认启用）:                            │
│     - 不保存半开连接，用加密 Cookie 代替                          │
│     - 验证 ACK 中的 cookie 才建立连接                             │
│     - 缺点: 不能使用 TCP 选项（如 SACK、MSS 等）                   │
│     - 适用: 正常防御，大多数场景足够                               │
│                                                                  │
│  2. SYN Cache:                                                   │
│     - 压缩半开连接信息（不保存完整 TCB）                          │
│     - 牺牲部分 TCP 功能换取资源节省                               │
│                                                                  │
│  3. 限流（SYN Rate Limiting）:                                   │
│     - 限制来自单个 IP 的 SYN 速率                                  │
│     - 缺点: 误伤 NAT 后的多用户（共享 IP）                         │
│                                                                  │
│  4. 延迟分配（Delayed TCB Allocation）:                          │
│     - BSD 方案：收到 ACK 才分配 TCB                               │
│     - 等于 syncookies 的变体                                      │
│                                                                  │
│  5. 反向代理 / DDoS 清洗:                                        │
│     - Cloudflare / Akamai / 阿里云 DDoS 防护                      │
│     - 流量先到清洗中心，干净流量回源                               │
│     - 适用: 大规模攻击                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ 理解 SYN Flood 在前端的影响 ============

// 前端无法直接控制 TCP 层，但可以理解其对连接池的影响

// 当服务器遭受 SYN Flood 时：
// 1. 服务器 SYN Queue 满（即使使用 SYN Cookies）
// 2. 新连接无法建立
// 3. 前端 fetch / WebSocket 连接超时

// 前端超时处理（健壮性设计）
async function robustFetch(url: string, options: {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
} = {}) {
  const { timeout = 10000, retries = 3, retryDelay = 1000 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      return response;
    } catch (error: any) {
      clearTimeout(timer);
      if (attempt === retries) throw error;

      // 网络抖动重试，区分超時和其他错误
      const isTimeout = error.name === 'AbortError';
      const delay = isTimeout
        ? retryDelay * Math.pow(2, attempt) // 指数退避
        : retryDelay;

      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('All retries exhausted');
}

// ============ 服务器端 SYN Flood 防御配置 ============

// nginx 防 SYN Flood 相关的配置（间接）
// 注意: nginx 本身不处理 SYN Flood（SYN 在 TCP 层，nginx 在 HTTP 层）
// 防御由内核（syncookies）和网络设备处理

// nginx upstream 健康检查 + 降级
// 当某个 upstream 遭受攻击响应慢时，自动切到备用
const upstreamConfig = `
upstream backend {
  server 10.0.0.1:8080 max_fails=3 fail_timeout=30s;
  server 10.0.0.2:8080 backup;  # 备用服务器
  keepalive 32;
}

server {
  location /api/ {
    proxy_pass http://backend;
    proxy_connect_timeout 5s;
    proxy_next_upstream error timeout http_502;
  }
}
`;

// ============ 理解为什么前端开发者需要了解 SYN Flood ============

// 1. 为什么有时候连接"卡住"但不报错？
//    → SYN Queue 满，新连接无法建立

// 2. 为什么 DDoS 攻击会导致前端大量超时？
//    → 服务器忙于处理攻击，无暇响应正常请求

// 3. 如何在前端层面缓解？
//    → 使用 CDN（CDN 节点作为反向代理，吸收 SYN Flood）
//    → 多个 API 域名（分散到不同 IP，减少单点影响）
//    → 重试 + 降级策略

// ============ CDN 防护 SYN Flood ============

// CDN 网络（如 Cloudflare）的防护机制：
// 1. 全球 Anycast 分布，攻击流量被分散到全球节点
// 2. 每个节点有容量限制，超过则丢弃
// 3. 智能识别正常流量（Browser Challenge / JS Challenge）
// 4. 干净流量通过，不经过被攻击的源站

// 前端配置：强制使用 HTTPS（HSTS）防止中间人注入
// 在 HTTP 层面无法防御 SYN Flood，但可以减少其他攻击面
```

### 对比表

| 防御方式 | 原理 | 优点 | 缺点 |
|---------|------|------|------|
| SYN Cookies | 不分配 TCB，用 Cookie 代替 | 无状态，性能好，Linux 内核原生支持 | 不能使用 TCP 选项（ MSS/SACK）|
| SYN Cache | 压缩 TCB 信息 | 保留更多 TCP 功能 | 实现复杂 |
| 限流 | 限制 SYN 速率 | 简单直接 | 误伤 NAT 用户 |
| 反向代理 | 代理清洗流量 | 吸收大规模攻击 | 需要额外基础设施 |
| 延迟分配 TCB | 等 ACK 才分配 | 与 Cookies 类似 | 兼容性差 |

| 攻击类型 | 特点 | 防御 |
|---------|------|------|
| 传统 SYN Flood | 伪造源 IP | SYN Cookies + 限流 |
| Amplification SYN Flood | 伪造源 IP 为受害者 IP（反射） | 运营商级别过滤 |
| ACK Flood | 发大量 ACK 耗尽带宽 | 限流 + 深度包检测 |
| Connection Flood | 建立完整连接（成本更高） | 限流 + 行为分析 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| 认为 HTTP 层能防御 SYN Flood | SYN Flood 是 TCP 层攻击，HTTP 层无法感知 | 网络层/内核防御（syncookies）|
| 只依赖 SYN Cookies | Cookies 禁用部分 TCP 特性（SACK、MSS）| Cookies + 限流 + CDN 多层防御 |
| 忽视应用层 DDoS | SYN Flood 只是 DDoS 的一种 | 全面 DDoS 防护（阿里云/Cloudflare）|
| 服务器 TCP backlog 设太小 | 正常连接积压 | 合理设置 net.ipv4.tcp_max_syn_backlog |
| 没有 CDN 保护 | 源站直接暴露 | 使用 CDN，隐藏源站 IP |

### 面试追问 + 参考答案要点

**Q1：SYN Cookies 是如何工作的？它的数学原理是什么？**
> SYN Cookies 的核心是用一个**密码学可验证的承诺**代替内存存储。Server 在收到 SYN 后，不分配 TCB，而是计算：`cookie = hash(srcIP, srcPort, dstIP, dstPort, timestamp, secret)`，并将 cookie 作为初始序列号（ISN）返回。Client 发送 ACK（ack=cookie+1）时，Server 用相同的参数验证 cookie 是否合法（secret 未过期，timestamp 在允许范围内）。如果合法，说明 Client 确实收到了 Server 的 SYN（因为 Client 无法伪造 cookie），重建连接状态。整个过程不需要 Server 保存任何连接信息。

**Q2：为什么 SYN Cookies 不能使用 SACK（Selective Acknowledgment）？**
> SACK 允许接收方告诉发送方"我已经收到了 1-1000 和 2000-3000"（跳过丢失的数据）。这需要**发送方**维护一个 SACK 状态（哪些数据被确认了）。在没有 SYN Cookies 时，这个状态在 TCB 中分配。使用 SYN Cookies 时，不分配 TCB，所以无法维护 SACK 状态。因此启用 SYN Cookies 时，SACK 会被自动禁用。这是一个典型的安全与功能之间的权衡。

**Q3：SYN Flood 和 CC 攻击（Challenge Collapsar）有什么区别？**
> SYN Flood 攻击 TCP 层，用大量半开连接耗尽服务器连接资源（内存/端口）。CC 攻击针对 HTTP 层，模拟大量正常用户请求（带有完整 Cookie、User-Agent 的 GET/POST），消耗服务器 CPU/内存/数据库连接。CC 攻击更难防御，因为请求看起来完全正常。防御方法：HTTP 层限流、验证码（CAPTCHA）、人机识别、WAF 规则。

### 参考来源 URL

- RFC 4987 (TCP SYN Flooding): https://www.rfc-editor.org/rfc/rfc4987
- Linux syncookies documentation: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- SYN Cookies 原理: https://www.syngress.com/hackers-and-cyberattacks/syn-flood-dos-and-the-different-ways-to-mitigate/
- Cloudflare DDoS Protection: https://www.cloudflare.com/learning/ddos/syn-flood/

---

## 6.7 三次握手 vs 四次挥手（时序图）

### 定义/背景（一句话说清）

TCP 三次握手建立可靠连接，确保双方都能发送和接收数据并同步初始序列号；四次挥手关闭全双工连接，因为每个方向需要单独关闭（发送 FIN 表示该方向已无数据），TIME_WAIT 等待 2MSL 确保最后 ACK 可靠到达并清除网络中的延迟报文。

### ASCII 时序图

```
┌─────────────────────────────────────────────────────────────────┐
│                    TCP 三次握手（建立连接）                       │
│                                                                  │
│  Client                                         Server           │
│    │  ── SYN (seq=x) ────────────────────────> │                │
│    │                                            │  Client: 我想连接  │
│    │                                            │  发送 ISN=x       │
│    │                                            │  状态: SYN_SENT  │
│    │  <── SYN+ACK (seq=y, ack=x+1) <────────── │                │
│    │                                            │  Server: 同意     │
│    │                                            │  发送 ISN=y       │
│    │                                            │  ack=x+1（确认）  │
│    │                                            │  状态: SYN_RCVD  │
│    │  ── ACK (seq=x+1, ack=y+1) ────────────> │                │
│    │                                            │  双方确认 ISN     │
│    │  状态: ESTABLISHED ──────────────────────>│  状态: ESTABLISHED│
│                                                                  │
│  为什么是三次？                                                  │
│  ──────────────                                                  │
│  两次握手的问题 1: 历史 SYN（Old Duplicate SYN）                 │
│  Client 发了 SYN A（旧连接），服务器收到后建立连接                 │
│  Client 早已放弃，但服务器保留连接 → 资源浪费                      │
│  三次握手：Client 最后 ACK 确认的是"对当前 SYN 的确认"           │
│                                                                  │
│  两次握手的问题 2: 无法同步双方初始序列号                         │
│  Client 发 SYN，Server 同意（一次握手）                           │
│  但 Client 不知道 Server 的 ISN → 无法可靠传输                    │
│  三次握手：Server 的 SYN+ACK 携带 Server 的 ISN                  │
│            Client 的 ACK 确认 Server 的 ISN                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    TCP 四次挥手（关闭连接）                       │
│                                                                  │
│  背景: TCP 是全双工通信 = 两个方向独立关闭                         │
│                                                                  │
│  Client                                         Server           │
│    │  Client FIN ────────────────────────────> │                │
│    │                                            │  Client 发完数据 │
│    │                                            │  请求关闭写方向  │
│    │  <── ACK ──────────────────────────────── │                │
│    │                                            │  Server 确认     │
│    │  状态: FIN_WAIT_1 ──────────────────────> │                │
│    │  Client → Server 方向已关闭               │  状态: CLOSE_WAIT│
│    │  （Client 不能再发数据，但能收数据）        │                │
│    │                                            │                │
│    │  Server 发送剩余数据 ──────────────────────>│  (半关闭状态)    │
│    │                                            │  Server 继续处理 │
│    │                                            │  剩余数据        │
│    │  Server FIN ─────────────────────────────> │                │
│    │                                            │  Server 发完数据 │
│    │                                            │  请求关闭        │
│    │  <── ACK ──────────────────────────────── │                │
│    │  Client 确认 FIN                          │  Server 关闭     │
│    │                                            │                │
│    │  Client: 等待 2MSL                        │                │
│    │  (MSL=60s, TIME_WAIT=120s)                │                │
│    │  Client 关闭                              │                │
│                                                                  │
│  为什么是四次？                                                  │
│  ──────────────                                                  │
│  TCP 全双工 = 双方各有一套发送缓冲区 + 接收缓冲区                  │
│  FIN 只关闭"发送方向"，接收方向仍可工作                            │
│  Server 收到 Client FIN → 确认 → 继续发送剩余数据 → 再发 FIN      │
│  这两个阶段不可合并（Client FIN 时 Server 未必已发完数据）         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              TIME_WAIT 状态详解（为什么等 2MSL）                  │
│                                                                  │
│  TIME_WAIT = 2 * MSL（Maximum Segment Lifetime）                 │
│  MSL: 报文在网络中最长存活时间，Linux 约定为 60 秒                │
│  TIME_WAIT: 通常为 120-240 秒                                     │
│                                                                  │
│  TIME_WAIT 存在的两个理由:                                        │
│                                                                  │
│  理由 1: 保证最后 ACK 可靠到达被动关闭方                          │
│  Client 的最后一个 ACK 可能丢失                                    │
│  Server 会重发 FIN → Client 需要再次发送 ACK                       │
│  2MSL 确保 Server 有足够时间重传 FIN                              │
│  Client 收到 FIN 后重置 2MSL 计时器                               │
│                                                                  │
│  理由 2: 让旧连接的重复数据包在网络中消散                          │
│  网络中可能还有延迟的旧连接数据包                                  │
│  新连接使用相同端口时，延迟包可能干扰                              │
│  2MSL 等待后，旧包基本已从网络中消失                              │
│                                                                  │
│  2MSL 而不是 1MSL 的原因:                                         │
│  MSL 时间内，所有旧包应该消失                                      │
│  但 ACK 也需要 MSL 时间到达对端                                    │
│  所以需要 2 * MSL                                                 │
│                                                                  │
│  Server 进入 CLOSE_WAIT（而不是 TIME_WAIT）的情况:                │
│  Server 被动关闭（收到 Client FIN → 发 ACK → 等待应用层关闭）     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              TCP 连接状态转换图（简化版）                         │
│                                                                  │
│  CLOSED ──listen──> LISTEN ──recv SYN──> SYN_RCVD                 │
│     ^                 │                │                        │
│     │                 │                │                        │
│     │                 │                ▼                        │
│     │                 │           ESTABLISHED                   │
│     │                 │                │                        │
│     │                 │ send FIN       ▼                        │
│     │                 └───────< FIN_WAIT_1 <─ ─ ─ ─             │
│     │                           │    │                          │
│     │                    recv   │    │ send ACK                 │
│     │                    ACK ▼  │    ▼                          │
│     │                 FIN_WAIT_2│ CLOSING                       │
│     │                           │    │                          │
│     │                           │    │ recv ACK                 │
│     │                           └──► │◄───                       │
│     │                           TIME_WAIT                        │
│     │                              │                            │
│     │                        2MSL ▼                            │
│     └──────────────────────<── CLOSED                           │
│                                                                  │
│  CLOSE_WAIT ──应用层 close──> LAST_ACK ──recv ACK──> CLOSED       │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ TCP 连接状态在前端的体现 ============

// WebSocket 连接状态
const ws = new WebSocket('wss://example.com/ws');

// WebSocket 状态对应 TCP 连接状态：
// WebSocket.CONNECTING  = TCP SYN_SENT / SYN_RCVD
// WebSocket.OPEN        = TCP ESTABLISHED
// WebSocket.CLOSING     = TCP FIN_WAIT_1 / FIN_WAIT_2
// WebSocket.CLOSED      = TCP CLOSED / TIME_WAIT

ws.onopen = () => {
  console.log('WebSocket OPEN → 对应 TCP ESTABLISHED');
};

ws.onclose = (event) => {
  // event.code: 1000=正常关闭, 1001=服务器关闭, 1006=异常关闭
  // event.wasClean: 是否优雅关闭（对应 TCP 是否正常四次挥手）
  console.log(`WebSocket CLOSED: code=${event.code}, clean=${event.wasClean}`);

  // 如果 wasClean=false，可能是连接被强制关闭（RST）
  // 对应 TCP 的 RST 报文（Reset）
  if (!event.wasClean) {
    console.warn('连接异常关闭，可能是网络中断或服务器崩溃');
    // 重连逻辑
    setTimeout(() => reconnect(), 1000);
  }
};

// ============ HTTP/1.1 keep-alive 连接关闭 ============

// HTTP/1.1 keep-alive 连接可以被任一方关闭
// 关闭时发送 FIN，触发四次挥手

// Node.js 中观察连接关闭
import http from 'http';

const req = http.get('http://example.com/', (res) => {
  res.on('data', () => {});
  res.on('end', () => {
    // 响应结束，但 TCP 连接不关闭（keep-alive）
    console.log('HTTP 响应结束，TCP 连接保持');
  });
});

req.on('close', () => {
  // 这个事件在 TCP 连接真正关闭时触发
  // 可以是正常关闭（FIN 交换）或异常关闭（RST）
  console.log('TCP 连接已关闭');
});

// ============ 优雅关闭 WebSocket（完整四次挥手）============

class GracefulWebSocket {
  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onclose = (event) => this.handleClose(event);
  }

  send(data: unknown) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket 未打开，消息未发送');
    }
  }

  close(code = 1000, reason = 'Client normal close') {
    // WebSocket.close() 发送 FIN 帧，触发服务器端的 onclose
    // 服务器可以选择发送 Close 帧作为响应（可选）
    // 浏览器自动完成剩余握手
    this.ws.close(code, reason);
  }

  private handleClose(event: CloseEvent) {
    if (event.wasClean) {
      console.log(`优雅关闭: code=${event.code}, reason=${event.reason}`);
    } else {
      console.error(`异常关闭: code=${event.code}, 原因可能是网络错误`);
    }
  }
}

// ============ HTTP/2 和 HTTP/3 的连接关闭 ============

// HTTP/2 不使用 TCP 四次挥手，改用 GOAWAY 帧
// GOAWAY 告诉对方"我不再接受新流了，但我会处理正在进行的流"
// 用于优雅关闭 HTTP/2 连接，不丢请求

// HTTP/3 使用 CONNECTION_CLOSE 帧
// 作用类似 GOAWAY，但运行在 QUIC 层

// Node.js HTTP/2 graceful shutdown
import http2 from 'http2';

const server = http2.createServer();

server.on('stream', (stream, headers) => {
  stream.respond({ 'content-type': 'text/plain' });
  stream.end('Hello');
});

process.on('SIGTERM', () => {
  // 发送 GOAWAY，不再接受新连接
  server.close(() => {
    console.log('HTTP/2 服务器已关闭');
    process.exit(0);
  });
});
```

### 对比表

| 维度 | 三次握手 | 四次挥手 |
|------|:--------:|:--------:|
| 目的 | 建立双向可靠连接 | 关闭双向通信 |
| 主动方 | Client（通常）| 双方均可 |
| 包的数量 | 3 | 4（FIN → ACK → FIN → ACK）|
| 半开状态 | SYN_SENT | FIN_WAIT_1/2, CLOSE_WAIT |
| 等待状态 | 无 | TIME_WAIT（主动关闭方）|
| 主要风险 | 历史连接/ISN 不同步 | 端口占用/资源泄漏 |

| TCP 状态 | 含义 | 正常/异常 |
|---------|------|:--------:|
| TIME_WAIT | 等待 2MSL | 正常（持续 120-240s）|
| CLOSE_WAIT | 被动关闭方未调用 close() | 异常（可能是代码 bug）|
| FIN_WAIT_2 | 对方确认了我的 FIN，我等对方的 FIN | 正常（有超时）|
| LAST_ACK | 被动关闭方发了 FIN，等最终 ACK | 正常（短时）|
| SYN_RCVD | 大量 → SYN Flood 攻击 | 异常（需要防御）|

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| CLOSE_WAIT 大量堆积 | 应用层未调用 socket.close()，内存泄漏 | 检查代码，确保每个 accept 的 socket 都被关闭 |
| TIME_WAIT 占用大量端口 | 高并发短连接导致端口耗尽 | 启用 tcp_tw_reuse，允许重用 TIME_WAIT 连接 |
| 主动关闭用 POST 请求 | POST 请求后服务器立即关闭，客户端收到 RST | POST 后服务器应返回响应再关闭 |
| 不处理连接异常断开 | 网络中断时 TCP 不发送 FIN，客户端不知道 | 使用心跳/keep-alive 检测断线 |
| HTTP/1.1 频繁新建连接 | 每次都要三次握手 + TLS 握手 + 四次挥手 | 使用 keep-alive 或升级 HTTP/2/3 |

### 面试追问 + 参考答案要点

**Q1：为什么四次挥手时，主动关闭方要等 TIME_WAIT 2MSL？**
> TIME_WAIT 有两个作用：1. **可靠性**：确保被动关闭方（服务器）收到最终的 ACK。如果 ACK 丢失，服务器会重发 FIN，客户端需要再次发送 ACK。2MSL 确保服务器有足够时间重传。2. **清除延迟报文**：网络中可能还有旧连接的延迟数据，2MSL 后这些数据基本从网络中消失，避免干扰使用同一端口的新连接。

**Q2：服务器出现大量 CLOSE_WAIT 是什么原因？如何排查？**
> CLOSE_WAIT 表示服务器收到了客户端的 FIN（连接想关闭），但服务器的应用层没有调用 close() 关闭对应的 socket。常见原因：1. 代码 bug——处理请求后忘记调用 socket.close()。2. 数据库连接泄漏——获取连接后未释放。3. HTTP 长连接——客户端已关闭，但服务器 keep-alive 超时未到。排查方法：`netstat -an | grep CLOSE_WAIT | wc -l`，然后逐进程排查文件描述符使用情况。

**Q3：TCP 的 RST 报文是什么？什么时候会收到 RST？**
> RST（Reset）是 TCP 的一种特殊控制报文，表示"连接异常终止，立即关闭"。收到 RST 后，双方不进入 TIME_WAIT，直接进入 CLOSED 状态。触发 RST 的场景：1. 收到不存在的端口上的连接（服务器未监听）。2. 收到不在当前连接序号范围内的数据。3. 应用程序主动调用 close() 并设置 SO_LINGER 为 0。4. 服务器崩溃后客户端发送数据，客户端收到 RST。在前端中，如果 WebSocket 连接异常断开（wasClean=false），通常是因为收到了 RST。

### 参考来源 URL

- RFC 793 (TCP) - Connection Establishment/Termination: https://www.rfc-editor.org/rfc/rfc793
- RFC 1122 (Requirements for Internet Hosts): https://www.rfc-editor.org/rfc/rfc1122
- TIME_WAIT and its behavior: https://blog.cloudflare.com/todie-expletiveinserted-attack-of-the-giant/
- TCP State Machine: https://www.syngress.com/hackers-and-cyberattacks/tcp-ip-protocol-structure-and-operations/

---

## 6.8 HTTPS 握手 TLS 1.2 vs 1.3

### 定义/背景（一句话说清）

HTTPS = HTTP over TLS，TLS 1.2 需要 2-RTT（TCP 握手 + TLS 握手分开），TLS 1.3 将密钥交换合并到第一次消息中，减少到 1-RTT（首次）或 0-RTT（重复连接），并移除所有不安全的密码套件，前向保密（PFS）成为默认配置。

### ASCII 时序图

```
┌─────────────────────────────────────────────────────────────────┐
│              TLS 1.2 握手（2-RTT）                               │
│                                                                  │
│  Client                                         Server           │
│    │                                              │               │
│    │  ──── TCP 三次握手 ─────────────────────────> │ (RTT 1)        │
│    │                                              │               │
│    │  ──── ClientHello ──────────────────────────> │               │
│    │        (支持的 TLS 版本, 密码套件列表,        │               │
│    │         客户端随机数, Session ID, SNI)         │               │
│    │                                              │               │
│    │  <─── ServerHello ─────────────────────────── │               │
│    │        (选中的 TLS 版本, 密码套件,            │               │
│    │         服务器随机数)                         │               │
│    │  <─── Certificate ────────────────────────── │               │
│    │        (服务器证书链: 站点证书 + 中间证书)      │               │
│    │  <─── ServerHelloDone ────────────────────── │               │
│    │                                              │ (RTT 2)        │
│    │  ──── ClientKeyExchange ────────────────────> │               │
│    │        (使用服务器公钥加密 pre_master_secret) │               │
│    │  ──── ChangeCipherSpec ────────────────────> │               │
│    │  ──── Finished (加密) ──────────────────────> │               │
│    │  <─── ChangeCipherSpec ────────────────────  │               │
│    │  <─── Finished (加密) ─────────────────────  │               │
│    │                                              │               │
│    │  ========= 加密通信开始 =========             │               │
│    │  总耗时: TCP 握手(1-RTT) + TLS 握手(2-RTT) = 3 RTT (HTTP时)  │
│    │  HTTPS 总耗时: TCP(1) + TLS(2) = 3 RTT 基础上叠加              │
│    │  如果 TLS 复用 Session: TCP(1) + TLS(0.5) ≈ 1.5 RTT            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              TLS 1.3 握手（1-RTT / 0-RTT）                      │
│                                                                  │
│  TLS 1.3 关键优化:                                               │
│  1. 移除 RSA 密钥传输（只保留 ECDHE 密钥交换）                     │
│  2. 将 Key Share 合并到 ClientHello 中（减少一次往返）              │
│  3. ServerHello 直接带加密参数                                     │
│                                                                  │
│  首次连接（1-RTT）:                                               │
│  Client                                         Server           │
│    │  ──── TCP 三次握手 ─────────────────────────> │ (RTT 1)        │
│    │  ──── ClientHello ────────────────────────────> │               │
│    │       (TLS 版本, 密码套件, 随机数,             │               │
│    │        key_share: ECDHE 公钥)                  │               │
│    │       (已可选带加密应用数据 early_data)        │               │
│    │                                              │ (RTT 2)        │
│    │  <─── ServerHello ──────────────────────────── │               │
│    │       (选中密码套件, 随机数,                   │               │
│    │        key_share: ECDHE 公钥)                  │               │
│    │       (可直接推导出主密钥)                      │               │
│    │  <─── (EncryptedExtensions - 可选)            │               │
│    │  <─── (Certificate + Proof) ─────────────────── │               │
│    │  <─── Finished ─────────────────────────────── │               │
│    │  ──── Finished ──────────────────────────────> │               │
│    │  ========= 加密通信立即开始 =========             │               │
│    │  总耗时: TCP(1) + TLS(1) = 2 RTT (比 TLS 1.2 减少 1 RTT)     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              TLS 1.3 0-RTT（重复连接）                          │
│                                                                  │
│  第二次连接（使用上次会话票据）:                                   │
│  Client                                         Server           │
│    │  ──── TCP 三次握手（可能与 TLS 合并）───────> │                │
│    │  ──── ClientHello ────────────────────────────> │               │
│    │       (session_ticket: 上次会话密钥加密的票据, │               │
│    │        early_data: 用预派生密钥加密的应用数据) │               │
│    │  ──── (Encrypted Application Data) ──────────> │               │
│    │                                              │                │
│    │  <─── ServerHello ──────────────────────────── │               │
│    │  <─── Finished ─────────────────────────────── │               │
│    │  ========= 0-RTT 后就开始通信 =========         │               │
│    │                                                      │
│    │  ⚠️ 0-RTT 警告: 存在重放攻击风险                   │
│    │     early_data 中的请求可能被恶意重放              │
│    │     解决: 对 0-RTT 请求进行幂等性验证               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              对称加密 vs 非对称加密 vs 混合加密                   │
│                                                                  │
│  1. 对称加密（加密和解密用同一个密钥）:                           │
│     AES-256-GCM, ChaCha20-Poly1305                              │
│     优点: 快（比非对称快 100-1000 倍）                            │
│     缺点: 密钥交换问题（如何安全传输密钥？）                       │
│                                                                  │
│  2. 非对称加密（加密和解密用不同密钥）:                           │
│     RSA: 公钥加密，私钥解密                                        │
│     缺点: 慢；无前向保密（私钥泄露 → 历史全可解密）               │
│                                                                  │
│  3. 混合加密（TLS 使用）:                                         │
│     ECDHE 密钥交换（双方各自生成临时密钥对，交换公钥）             │
│     双方用 ECDH 计算 pre_master_secret（私钥不传输！）            │
│     用 HKDF 派生出对称密钥                                        │
│     用对称密钥加密实际通信数据                                    │
│                                                                  │
│     前向保密(PFS): 即使长期私钥泄露，历史通信仍安全               │
│     （因为每次会话用的是临时密钥，不依赖长期私钥）                 │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ TLS 1.2 vs 1.3 在 Node.js 中的体现 ============

import https from 'https';
import http2 from 'http2';
import { Agent as Http2Agent } from 'http2';

// Node.js 中 HTTPS 使用 TLS 1.2
const agent1 = new https.Agent({
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.2',
});

// Node.js 中 HTTP/2 over TLS 使用 TLS 1.3（如果支持）
const agent2 = new Http2Agent({
  // HTTP/2 over TLS 会自动协商最高版本
  maxDeflateDynamicTableSize: 4096,
});

// ============ TLS 握手信息观测（Node.js）============

import tls from 'tls';
import net from 'net';

const socket = net.connect(443, 'example.com', () => {
  const cipher = socket.getCipher();
  const protocol = socket.getProtocol(); // 'TLSv1.3' 或 'TLSv1.2'
  const isSessionReused = socket.isSessionReused(); // 是否复用会话

  console.log(`
    加密套件: ${cipher.name}
    协议版本: ${protocol}
    会话复用: ${isSessionReused ? '是（0-RTT 可能性）' : '否（首次握手）'}
  `);
});

socket.on('secure', () => {
  const cert = socket.getPeerCertificate();
  console.log('服务器证书:', {
    subject: cert.subject,
    issuer: cert.issuer,
    validFrom: cert.valid_from,
    validTo: cert.valid_to,
    fingerprint: cert.fingerprint256,
  });
});

// ============ HTTPS 握手时间测量（前端）============

async function measureTLSHandshake() {
  const entries = performance.getEntriesByType('resource') as any[];

  await fetch('https://example.com/api');

  const entry = entries[entries.length - 1];
  const {
    connectStart, connectEnd,
    secureConnectionStart, secureConnectionEnd,
    responseStart, requestStart,
  } = entry;

  console.log(`
    TCP 建连:    ${(connectEnd - connectStart).toFixed(1)}ms
    TLS 握手:    ${(secureConnectionEnd - secureConnectionStart).toFixed(1)}ms
      协议版本:  ${entry?.nextHopProtocol}
    TTFB:        ${(responseStart - connectEnd).toFixed(1)}ms
    总耗时:      ${(responseStart - requestStart).toFixed(1)}ms
  `);

  // TLS 1.3 vs TLS 1.2 的差异:
  // TLS 1.3: secureConnectionEnd - secureConnectionStart ≈ 1 RTT
  // TLS 1.2: secureConnectionEnd - secureConnectionStart ≈ 1-2 RTT
  // 在高延迟网络中，这个差异显著（100ms+）
}

// ============ Node.js 创建 HTTPS 服务器 ============

import https from 'https';
import fs from 'fs';

const server = https.createServer({
  // TLS 1.3（Node.js 12+ 默认支持）
  // TLS 1.2（fallback）
  cert: fs.readFileSync('/path/to/cert.pem'),
  key: fs.readFileSync('/path/to/key.pem'),
  // 推荐: 仅启用 TLS 1.3 和 TLS 1.2（禁用 SSLv3, TLS 1.0, TLS 1.1）
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  // 前向保密: 使用 ECDHE 类密码套件（自动）
  // 推荐密码套件顺序（Node.js 默认已按安全性排序）
  honorCipherOrder: true, // 服务器端选择最佳密码套件
  // HSTS 头
}, (req, res) => {
  res.setHeader('Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload');
  res.end('Hello, HTTPS with TLS 1.3!');
});

server.listen(443, () => {
  console.log('HTTPS 服务器运行在 TLS 1.2/1.3');
});

// ============ TLS 1.3 0-RTT 请求（Node.js）============

import tls from 'tls';

// 检查当前 Node.js 是否支持 TLS 1.3 0-RTT
console.log('TLS 1.3 支持:', tls.constants.tls1_3 !== undefined);

// TLS 1.3 Session Resumption（会话复用）
// Session Ticket 机制：首次握手后，服务器发送 session ticket
// 客户端保存，下次连接时带上，直接恢复会话
// 效果接近 0-RTT，但更安全（session ticket 有时效性）

const sessionTicket = Buffer.alloc(0); // 模拟保存的票据

const socket = tls.connect(443, 'example.com', {
  session: sessionTicket, // 传入上次保存的 session
}, () => {
  if (socket.isSessionReused()) {
    console.log('Session 复用成功（可能是 0-RTT）');
  }
});

// 保存 session ticket（用于下次连接）
socket.on('session', (ticket) => {
  // 持久化 ticket（存储到 Redis / LocalStorage）
  console.log('收到 Session Ticket, 长度:', ticket.length);
});
```

### 对比表

| 维度 | TLS 1.2 | TLS 1.3 | TLS 1.3 改进 |
|------|:-------:|:-------:|------------|
| 首次握手 RTT | 2-RTT | 1-RTT | 减少 50% |
| 重复握手 RTT | 1-RTT（Session ID）| 0-RTT（0-RTT 数据）| 减少到 0 |
| RSA 密钥传输 | 支持 | ❌ 移除 | 更安全（无前向保密问题）|
| 密码套件数量 | 37+ | 5 个 | 简化 + 更安全 |
| 前向保密(PFS) | 可选（需 ECDHE）| ✅ 默认 | 始终启用 |
| 0-RTT | 不支持 | 支持（有重放风险）| 低延迟 |
| 易用性 | 复杂 | 简化 | 配置更安全 |
| 兼容性 | 广泛 | 逐步普及 | 需 TLS 1.2 回退 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| 禁用 TLS 1.3 强制 1.2 | TLS 1.3 比 1.2 快 30%+ | 启用 TLS 1.3，保留 1.2 作为 fallback |
| RSA 私钥泄露 | RSA 密钥传输无前向保密 | 始终使用 ECDHE 密钥交换 |
| 0-RTT 用于非幂等请求 | 0-RTT 数据可能被重放 | 只对幂等请求使用 0-RTT（GET/HEAD）|
| 证书链不完整 | 中间证书缺失导致验证失败 | 始终包含完整证书链（含中间 CA）|
| HSTS 不启用 | 首次请求仍可被降级攻击 | `Strict-Transport-Security: max-age=31536000` |
| 混用 HTTP 和 HTTPS | HTTPS 内容引用 HTTP 资源 | 全部使用 HTTPS（HSTS 自动升级）|

### 面试追问 + 参考答案要点

**Q1：TLS 1.3 为什么比 TLS 1.2 快？具体减少在哪里？**
> TLS 1.3 将密钥交换从两次往返合并为一次：TLS 1.2 需要 ClientHello（密码套件列表）+ ServerHello（选择结果）+ ClientKeyExchange（发送 pre_master_secret），需要 2-RTT。TLS 1.3 要求 ClientHello 中直接携带 key_share（ECDHE 公钥），ServerHello 携带自己的 key_share，双方在第一个 RTT 内就能推导出主密钥，实现 0-RTT 数据发送和 1-RTT 完整握手。同时 TLS 1.3 只支持 ECDHE，消除了 RSA 密钥交换的复杂性。

**Q2：什么是前向保密（PFS），为什么 TLS 1.3 将其设为默认？**
> 前向保密（Perfect Forward Secrecy）指即使长期密钥（如服务器私钥）泄露，历史通信记录仍然安全。TLS 1.2 的 RSA 密钥传输模式下，服务器私钥用于解密 pre_master_secret，一旦私钥泄露，攻击者可以解密所有历史流量（因为 pre_master_secret 可以被恢复）。TLS 1.3 只使用 ECDHE 临时密钥交换——每次会话的密钥都是临时生成的，不依赖长期私钥。私钥泄露后，攻击者只能攻击当前会话，历史会话因使用不同的临时密钥而安全。

**Q3：0-RTT 的重放攻击是如何发生的？如何防御？**
> 0-RTT 允许客户端在第一次握手消息中就发送加密的应用数据（使用预派生的密钥）。问题：攻击者可以截获并重放这些加密数据。如果 0-RTT 数据是"转账 100 元"这类非幂等请求，攻击者只需重放加密后的数据，服务器解密后发现是合法请求，执行转账。防御：1. 限制 0-RTT 用于幂等请求（GET、HEAD 等）。2. 在应用层实现请求 ID 或 Nonce 机制。3. 服务器对 0-RTT 数据标记来源，禁止直接执行非幂等操作。4. 使用 OCSP（Online Certificate Status Protocol）验证客户端证书。

### 参考来源 URL

- RFC 5246 (TLS 1.2): https://www.rfc-editor.org/rfc/rfc5246
- RFC 8446 (TLS 1.3): https://www.rfc-editor.org/rfc/rfc8446
- TLS 1.3 Explained: https://www.rfc-editor.org/rfc/rfc8446#section-1.2
- Hybrid Cryptography (ECDHE + AES): https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security
- 0-RTT and Replay Attacks: https://blog.cloudflare.com/introducing-0-rtt/

---

## 6.9 CA 证书链与 HSTS

### 定义/背景（一句话说清）

CA 证书链是由根证书（浏览器内置）、中间证书（CA 签发）和站点证书（域名持有者申请）组成的三级信任链，通过数字签名逐级验证确保服务器公钥的真实性；HSTS（HTTP Strict Transport Security）强制浏览器在指定时间内仅通过 HTTPS 访问站点，防止协议降级攻击。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              PKI（公钥基础设施）与证书链                        │
│                                                                  │
│  信任锚（Trust Anchor）                                          │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────────────┐               │
│  │        根证书 (Root CA)                      │               │
│  │  自签名证书，浏览器/OS 厂商内置                │               │
│  │  示例: DigiCert Global Root G2               │               │
│  │        GlobalSign Root CA                    │               │
│  │        ISRG Root X1 (Let's Encrypt)          │               │
│  │  数量: 数百个（浏览器维护独立信任库）           │               │
│  └─────────────────────────────────────────────┘               │
│       │ (根 CA 签发中间 CA)                                     │
│       │ 根 CA 私钥签名                                           │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────┐               │
│  │      中间证书 (Intermediate CA)               │               │
│  │  运营主体: Let's Encrypt / DigiCert / 阿里云  │               │
│  │  用于签发终端实体证书                         │               │
│  │  通常有 1-2 级中间 CA（交叉签发等）            │               │
│  └─────────────────────────────────────────────┘               │
│       │ (中间 CA 签发站点证书)                                    │
│       │ 中间 CA 私钥签名                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────┐               │
│  │      站点证书 (End-Entity Certificate)        │               │
│  │  域名: *.example.com                         │               │
│  │  公钥: 用于 TLS 握手                         │               │
│  │  包含: CN/SAN, 公钥, 有效期, 序列号, 签名    │               │
│  └─────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              浏览器证书验证流程                                  │
│                                                                  │
│  Step 1: 收到服务器证书（example.com）                          │
│                                                                  │
│  Step 2: 构建证书链                                              │
│    example.com ←(签发)─ Intermediate CA ←(签发)─ Root CA        │
│    浏览器尝试构建链，可能需要 AIA 下载中间证书                    │
│    (Authority Information Access 字段包含签发者 URL)             │
│                                                                  │
│  Step 3: 验证每个证书签名                                        │
│    用 Root CA 公钥验证 Intermediate CA 签名                      │
│    用 Intermediate CA 公钥验证站点证书签名                        │
│                                                                  │
│  Step 4: 检查证书有效性                                          │
│    - 时间有效性: NotBefore ≤ 当前时间 ≤ NotAfter                │
│    - 域名匹配: CN/SAN 包含请求的域名                            │
│    - 使用限制: keyUsage / extendedKeyUsage 正确                  │
│                                                                  │
│  Step 5: 检查证书吊销状态                                        │
│    - CRL (Certificate Revocation List): 下载吊销列表           │
│    - OCSP (Online Certificate Status Protocol): 在线查询        │
│    - OCSP Stapling: 服务器附带 OCSP 响应（减少查询）             │
│                                                                  │
│  Step 6: 验证通过 → 提取公钥 → TLS 继续                         │
│           验证失败 → 显示证书错误页面                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              HSTS（HTTP Strict Transport Security）              │
│                                                                  │
│  服务器响应头:                                                   │
│  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload│
│                                                                  │
│  参数详解:                                                       │
│  max-age: 浏览器强制 HTTPS 的时间（秒）                          │
│    31536000 = 1年（合理值: 至少 6 个月）                         │
│    0 = 禁用 HSTS（清除浏览器记录）                               │
│                                                                  │
│  includeSubDomains: 子域名也强制 HTTPS                          │
│    如果主域名开启，子域名也受约束                                  │
│    ⚠️ 设置前确保所有子域名都支持 HTTPS                           │
│                                                                  │
│  preload: 申请加入浏览器内置 HSTS 预加载列表                     │
│    https://hstspreload.org 提交                                   │
│    Chrome/Firefox/Safari/Edge 等内置列表                         │
│    一旦加入，极难撤销（需要提交移除申请并等待浏览器更新）          │
│                                                                  │
│  HSTS 效果:                                                     │
│  首次访问（HTTP） → 浏览器记录 max-age                           │
│  后续访问（HTTP） → 浏览器内部重定向为 HTTPS（不发 HTTP 请求）   │
│                                                                  │
│  防止的攻击:                                                     │
│  1. SSL Stripping（MIMT）: 中间人 无法降级为 HTTP                │
│  2. 混合内容警告: HTTPS 页面禁止加载 HTTP 子资源                 │
│  3. HTTPS Only 模式（Firefox）: 所有 HTTP 请求强制升级           │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ 证书链验证在前端的应用 ============

// 前端 HTTPS 是浏览器自动处理的，无法干预证书验证
// 但可以通过 fetch 错误推断问题

async function testHTTPSConnection() {
  try {
    const response = await fetch('https://example.com/api');
    console.log('HTTPS 连接成功，状态码:', response.status);
  } catch (error: any) {
    if (error.cause?.code === 'ERR_CERT_AUTHORITY_INVALID') {
      console.error('证书链不完整：中间证书缺失或不受信任');
    } else if (error.cause?.code === 'ERR_CERT_COMMON_NAME_INVALID') {
      console.error('域名不匹配：CN/SAN 不包含请求的域名');
    } else if (error.cause?.code === 'ERR_CERT_DATE_INVALID') {
      console.error('证书过期或未生效');
    } else if (error.cause?.code === 'ERR_CERT_REVOKED') {
      console.error('证书已被吊销');
    } else {
      console.error('其他 TLS 错误:', error.cause?.code);
    }
  }
}

// ============ HSTS 在前端的影响 ============

// HSTS 影响：HTTP 请求被浏览器自动重写为 HTTPS
// 前端代码中无需特殊处理

// 但需要注意：
// 1. 开发环境 HTTP → 生产环境 HTTPS → HSTS 首次访问后生效
//    本地开发用 HTTP 调试，生产环境用 HTTPS
// 2. Mixed Content 问题
//    HSTS 页面加载 HTTP 子资源 → 浏览器阻止并报错
//    需要将所有资源 URL 改为 HTTPS

// ============ Node.js 证书验证（深度理解）============

import https from 'https';
import tls from 'crypto';

function verifyCertificateChain(cert: tls.PeerCertificate) {
  // cert.subject: 证书主体信息
  // cert.issuer: 签发者信息
  // cert.valid_from / cert.valid_to: 有效期
  // cert.fingerprint256: 证书指纹

  const now = new Date();
  const validFrom = new Date(cert.valid_from);
  const validTo = new Date(cert.valid_to);

  const isValidTime = now >= validFrom && now <= validTo;
  const isSelfSigned = cert.subject === cert.issuer;

  console.log(`
    证书主体: ${cert.subject.CN || cert.subject.O}
    签发者:   ${cert.issuer.CN || cert.issuer.O}
    有效期:   ${validFrom.toISOString()} ~ ${validTo.toISOString()}
    剩余天数: ${Math.floor((validTo.getTime() - now.getTime()) / 86400000)}
    自签名:   ${isSelfSigned}
    指纹:     ${cert.fingerprint256}
  `);

  // 检测证书即将过期（提前 30 天预警）
  if ((validTo.getTime() - now.getTime()) < 30 * 86400000) {
    console.warn('证书将在 30 天内过期，请及时续期！');
  }

  return isValidTime && !isSelfSigned;
}

// ============ 获取证书链信息（Node.js）============

function inspectCertificateChain(socket: tls.TLSSocket) {
  const certChain = socket.getPeerCertificate(true); // true = 包含完整链
  const cert = typeof certChain === 'object' && !Array.isArray(certChain)
    ? certChain
    : { subject: certChain, issuer: certChain, valid_from: '', valid_to: '' };

  console.log('证书链长度:', Array.isArray(certChain) ? certChain.length : 1);
  console.log('证书详情:', JSON.stringify(cert, null, 2));
}

// ============ OCSP Stapling 理解 ============

// OCSP Stapling = 服务器主动获取 OCSP 响应，附加在 TLS 握手中
// 浏览器不需要额外查询 CA 的 OCSP 服务器（减少延迟 + 保护隐私）

// nginx 配置 OCSP Stapling
const nginxConfig = `
# 启用 OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# 指定中间证书（用于验证 OCSP 响应）
ssl_trusted_certificate /path/to/ca-bundle.crt;
`;

// ============ CSP + HSTS 完整安全配置 ============

// HTTP 安全头完整配置（nginx / express）
const securityHeaders = {
  // HSTS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  // CSP
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-{random}'; object-src 'none'",
  // X-Frame-Options
  'X-Frame-Options': 'DENY',
  // X-Content-Type-Options
  'X-Content-Type-Options': 'nosniff',
  // Referrer-Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions-Policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};
```

### 对比表

| 维度 | 自签名证书 | 商业 CA 证书 | Let's Encrypt |
|------|:---------:|:------------:|:-------------:|
| 信任方式 | 手动导入 | 浏览器内置根 CA | 浏览器内置根 CA |
| 有效期 | 自定义 | 1-3 年 | 90 天（自动续期）|
| 价格 | 免费 | $10-$1000/年 | 免费 |
| 验证级别 | 域名验证（DV）| DV/OV/EV | DV |
| 适用场景 | 内网/开发 | 商业网站 | 公开网站 |
| 自动化 | 难 | 部分支持 | 高度自动化（ACME）|

| HSTS 参数 | 含义 | 建议值 |
|----------|------|-------|
| max-age=0 | 禁用 HSTS（清除记录）| 测试用 |
| max-age=300 | 5 分钟 | 不推荐 |
| max-age=31536000 | 1 年 | 初次启用 |
| max-age=63072000 | 2 年 | 推荐（长期稳定）|
| includeSubDomains | 包含子域名 | ⚠️ 确认所有子域支持 HTTPS |
| preload | 加入浏览器预加载列表 | ⚠️ 几乎不可逆 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| 证书链不完整 | 服务器只发送站点证书，不含中间证书 | 使用完整证书链（站点+中间 CA）|
| 中间证书配置错误 | 多级中间 CA 未按顺序拼接 | 证书链顺序：站点证书 → 中间 CA → ... → 根 CA |
| 证书过期未发现 | 监控缺失导致生产事故 | 用 cert-manager (K8s) / acme.sh 自动续期 + 监控 |
| HSTS includeSubDomains 误开 | 未确认所有子域支持 HTTPS | 先不开启，确认后再加 |
| HSTS preload 随意提交 | 一旦提交几乎无法撤回 | 确认所有子域支持 HTTPS 且长期稳定后提交 |
| Mixed Content | HTTPS 页面加载 HTTP 资源 | 将所有资源 URL 改为 HTTPS 或协议相对路径 |

### 面试追问 + 参考答案要点

**Q1：为什么需要中间 CA？根 CA 为什么不能直接签发站点证书？**
> 根 CA 是整个信任体系的基石，数量极少（数百个），一旦根 CA 私钥泄露，整个 PKI 体系崩溃。用中间 CA 做隔离：中间 CA 由根 CA 签发，私钥泄露后只需吊销中间 CA，不影响根 CA。同时中间 CA 可以按业务/地域划分授权。Let's Encrypt 的模式：根 CA（G3）→ ISRG Root X1 → R3（中间 CA）→ 站点证书，多了一层实现灵活授权。

**Q2：浏览器如何知道某个中间 CA 的证书？**
> 两种方式：1. **服务器发送**：服务器在 TLS 握手时发送完整证书链（站点证书 + 中间证书），浏览器自动拼接。这是最佳方式。2. **AIA 下载**：证书中有 Authority Information Access 字段，包含中间 CA 的下载地址，浏览器可以自动下载并补全链。生产环境中服务器应配置发送完整证书链，避免浏览器额外查询（影响性能）。

**Q3：HSTS 和 HTTPS Only 模式有什么区别？**
> HSTS（Strict-Transport-Security）是响应头，告知浏览器在 max-age 时间内强制使用 HTTPS，首次访问仍需 HTTP。HTTPS Only Mode（Firefox 121+）是浏览器设置，强制所有 HTTP 请求重定向为 HTTPS，不需要服务器配置，但需要用户主动开启（about:preferences#privacy）。Preload List 则是 HSTS 的强化版——内置在浏览器二进制中，连首次 HTTP 请求都不需要。

### 参考来源 URL

- RFC 5280 (PKI / X.509): https://www.rfc-editor.org/rfc/rfc5280
- RFC 6960 (OCSP): https://www.rfc-editor.org/rfc/rfc6960
- HSTS Specification: https://www.rfc-editor.org/rfc/rfc6797
- HSTS Preload List: https://hstspreload.org
- Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/

---

## 6.10 DNS 用 UDP vs DNS 污染

### 定义/背景（一话说清）

DNS 主要用 UDP 53 端口查询（无握手、低延迟），但当响应超过 512 字节（DNSSEC）或进行区域传输时会切换 TCP；DNS 污染是攻击者对 DNS 查询的伪造响应，防御手段包括 DNSSEC（签名验证）、DoH（加密传输）和 DoT（TLS 加密）。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              DNS 查询流程（递归 + UDP）                          │
│                                                                  │
│  用户浏览器                                                      │
│      │                                                           │
│      │ DNS 查询: example.com                                      │
│      ▼                                                           │
│  本地 DNS 解析器（递归 resolver）                                 │
│  (通常是 ISP 提供 / 8.8.8.8 / 1.1.1.1)                           │
│      │                                                           │
│      │ 1. 查缓存 → 命中 → 返回                                    │
│      │ 2. 未命中 → 迭代查询:                                      │
│      │                                                           │
│      │ ──> 根 DNS (.): 找 .com 的 NS 记录                       │
│      │ ◄── .com NS 服务器地址                                    │
│      │                                                           │
│      │ ──> .com NS: 找 example.com 的 NS 记录                    │
│      │ ◄── example.com NS 服务器地址                            │
│      │                                                           │
│      │ ──> example.com NS: 找 A/AAAA 记录                        │
│      │ ◄── 93.184.216.34 (IP 地址)                               │
│      │                                                           │
│      ◄── 返回 IP 给浏览器                                         │
│                                                                  │
│  全部使用 UDP 53 端口（轻量快速）                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              DNS 使用 TCP 的场景                                 │
│                                                                  │
│  场景 1: 响应超过 512 字节                                        │
│  原始 DNS 协议设计：UDP 响应最大 512 字节                        │
│  DNSSEC 签名数据量大 → 超 512 字节 → 切换 TCP                     │
│  EDNS(0) 扩展: 客户端声明自己支持大包（通常 4096 字节）          │
│                                                                  │
│  场景 2: 区域传输（AXFR）                                         │
│  主 DNS 服务器 → 从 DNS 服务器同步整个 zone 数据                 │
│  数据量大 → 必须用 TCP                                            │
│  TCP 端口 53（与 UDP 53 同一个端口）                             │
│                                                                  │
│  场景 3: DoT / DoH（DNS over TLS / HTTPS）                       │
│  TLS 加密 → 防止 DNS 污染和中间人                                │
│  DoT: 端口 853（RFC 7858）                                        │
│  DoH: 端口 443，路径 /dns-query（RFC 8484）                       │
│                                                                  │
│  场景 4: 客户端或服务器明确要求 TCP                              │
│  响应被截断（Truncated）→ 客户端用 TCP 重试                       │
│  DNS 查询太大 → Truncated = 1 → TCP 重试                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              DNS 污染与防御                                        │
│                                                                  │
│  DNS 污染攻击（DNS Spoofing / DNS Poisoning）:                   │
│  攻击者在 DNS 响应到达本地解析器之前，注入伪造的 DNS 响应          │
│  原理: DNS 使用无连接 UDP，无握手，源 IP 不验证                   │
│                                                                  │
│  攻击流程:                                                       │
│  正常: Resolver ── DNS Query ──> Auth NS                         │
│              <── Correct Response (IP A)                         │
│              浏览器 ← IP A                                        │
│                                                                  │
│  被污染: Resolver ── DNS Query ──> Auth NS                       │
│              <── Correct Response (IP A)                         │
│         Attacker ── Fake Response (IP evil) ──> Resolver         │
│              (先于正确响应到达)                                    │
│              伪造的响应被缓存                                      │
│              浏览器 ← IP evil (错误 IP)                          │
│                                                                  │
│  防御手段:                                                       │
│                                                                  │
│  1. DNSSEC（DNS Security Extensions）:                           │
│     - 用公钥密码学签名 DNS 记录                                   │
│     - Resolver 验证签名是否由正确的 CA 签发                       │
│     - 伪造响应没有正确签名 → 被拒绝                               │
│     - 缺点: 部署不完整（很多 TLD 尚不支持）                       │
│                                                                  │
│  2. DoT（DNS over TLS）:                                         │
│     - DNS 查询通过 TLS 加密隧道传输                              │
│     - 防止网络层监听和注入                                        │
│     - 端口: 853                                                    │
│     - 公共 DoT: 8.8.8.8, 1.1.1.1                                  │
│                                                                  │
│  3. DoH（DNS over HTTPS）:                                       │
│     - DNS 查询通过 HTTPS（HTTP/2 或 HTTP/3）传输                 │
│     - 伪装成普通 HTTPS 流量，更难被识别和阻断                      │
│     - 公共 DoH: Cloudflare (1.1.1.1), Google (8.8.8.8)           │
│     - 浏览器内置（Chrome, Firefox 已支持）                        │
│     - 缺点: 企业无法监控员工 DNS 查询（隐私 vs 管控）             │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ 浏览器 DNS 设置（DoH）============

// Chrome: 启用 DoH
// 设置 → 隐私和安全 → 安全 → 使用安全 DNS
// 或者通过 chrome://settings/security 访问

// 检测浏览器是否支持 DoH（通过 DNS-over-HTTPS API）
if ('dns' in window && 'resolve' in (window as any).dns) {
  const api = (window as any).dns;
  const result = await api.resolve('example.com', 'A');
  console.log('DoH 可用，当前解析结果:', result.addresses);
} else {
  console.log('浏览器不支持 DoH API');
}

// ============ 使用 fetch + DoH 查询（概念示例）============

// DoH 本质：用 HTTPS 请求代替 UDP 53 查询
// Cloudflare DoH 端点
const CLOUDFLARE_DOH = 'https://cloudflare-dns.com/dns-query';
const GOOGLE_DOH = 'https://dns.google/dns-query';

async function dohQuery(domain: string, type: string = 'A'): Promise<string[]> {
  const response = await fetch(
    `${CLOUDFLARE_DOH}?name=${domain}&type=${type}`,
    {
      headers: {
        // DoH 标准请求格式（RFC 8484）
        'Accept': 'application/dns-json',
      },
    }
  );
  const data = await response.json() as {
    Status: number;
    Answer?: { data: string; type: number }[];
  };

  if (data.Status !== 0) {
    throw new Error(`DNS 查询失败: ${data.Status}`);
  }

  return (data.Answer || []).map(a => a.data);
}

// 使用 DoH API（Chrome 96+ / Edge 96+）
async function browserDohQuery(domain: string): Promise<string[]> {
  const api = (window as any).dns;
  if (!api) throw new Error('DoH API 不可用');

  const result = await api.resolve(domain, 'A');
  return result.addresses;
}

// 对比测试
async function compareDohPerformance() {
  const domains = ['example.com', 'google.com', 'cloudflare.com'];

  for (const domain of domains) {
    const start = performance.now();

    // 传统 DNS（通过 fetch 测量连接时间）
    // 注意：fetch 不直接使用 DNS，所以用 connectStart - domainLookupStart
    // 简化：测量 HTTP 响应时间

    await fetch(`https://${domain}`, { mode: 'no-cors' });

    const duration = performance.now() - start;
    console.log(`${domain}: ${duration.toFixed(1)}ms`);
  }
}

// ============ Node.js DNS 模块（底层观察）============

import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const reverse = promisify(dns.reverse);

// DNS 解析类型
const aRecords = await resolve4('example.com');
console.log('A 记录（IPv4）:', aRecords);

// DNS over TLS (Node.js 原生不支持，需要第三方库如 dohjs/node-doh)
import { Resolver } from 'dns-promise'; // 假设的库

const resolver = new Resolver({
  endpoint: 'https://cloudflare-dns.com/dns-query',
  // 使用 DoH 查询，不经过系统 DNS
});

const result = await resolver.resolve('example.com', 'A');
console.log('DoH 查询结果:', result);

// ============ DNS 污染检测 ============

// 通过对比多个 DNS 解析结果判断是否被污染
async function detectDNSPoisoning(domain: string): Promise<{
  isPoisoned: boolean;
  results: { provider: string; ip: string }[];
}> {
  const providers = [
    { name: 'Cloudflare', ip: '1.1.1.1' },
    { name: 'Google', ip: '8.8.8.8' },
    { name: 'Quad9', ip: '9.9.9.9' },
    { name: 'AliDNS', ip: '223.6.6.6' },
  ];

  // 实际生产中需要向这些 IP 发送 DNS 查询
  // 这里模拟结果
  const results = providers.map(p => ({
    provider: p.name,
    // 真实场景：发送 DNS 查询到 p.ip
    ip: `模拟 IP for ${domain}`,
  }));

  // 检查所有结果是否一致
  const uniqueIPs = new Set(results.map(r => r.ip));
  const isPoisoned = uniqueIPs.size > 1;

  return { isPoisoned, results };
}
```

### 对比表

| 维度 | DNS over UDP | DNS over TCP | DoT (TLS) | DoH (HTTPS) |
|------|:------------:|:------------:|:---------:|:------------:|
| 端口 | 53 | 53 | 853 | 443 |
| 加密 | 无 | 无 | TLS 加密 | HTTPS（HTTP/2-3）|
| 隐私 | 无（可被监听）| 无（可被监听）| 好 | 极好（伪装为 HTTPS）|
| 性能 | 最快（无握手）| 较慢（有握手）| 较快 | 较快（HTTP/2 复用）|
| 企业管控 | 可监控 | 可监控 | 部分可监控 | ❌ 难监控 |
| 防污染 | ❌ 无 | ❌ 无 | ✅ 防注入 | ✅ 防注入 |
| 部署 | 原生 | 原生 | 需 DoT 服务器 | 需 DoH 服务器 |
| 浏览器支持 | N/A | N/A | 部分 | 广泛（Chrome/Firefox）|

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| 忽视 DNS 污染风险 | 企业网络/某些地区 DNS 可能被劫持 | 启用 DoH 或 DoT |
| DoH 在企业网络被阻止 | IT 管理员可能拦截 DoH 绕过审查 | 备用 DNS，提供回退方案 |
| DNS 缓存过长 | 污染的 DNS 记录被长时间缓存 | 合理设置 TTL，企业 DNS 定期刷新 |
| 混淆 DNS 污染和 DNS 投毒 | 污染 = 响应被伪造，投毒 = 缓存被污染 | 理解分层：查询层 vs 缓存层 |
| 多级 CDN 导致 DNS 复杂 | CNAME 链过长增加污染面 | 监控 CNAME 链深度 |

### 面试追问 + 参考答案要点

**Q1：DNS 为什么用 UDP 而不是 TCP？既然 TCP 更可靠？**
> DNS 选择 UDP 的核心原因是**低延迟和高效率**：DNS 是互联网中调用最频繁的协议（每个 HTTP 请求前都可能触发），用 UDP 避免握手开销（UDP 是无连接的，一个请求-响应就完成）。UDP 头部 8 字节，TCP 20 字节，对通常小于 512 字节的 DNS 查询，TCP 开销不可忽视。TCP 只在响应超过 512 字节（DNSSEC）或需要区域传输时使用。

**Q2：DNSSEC 和 DoH/DoT 解决的是同一个问题吗？有什么区别？**
> 不完全一样，是互补的。DNSSEC 解决的是**数据真实性**——验证 DNS 响应确实来自正确的权威服务器且未被篡改（通过数字签名）。DoH/DoT 解决的是**传输通道安全**——防止 DNS 查询和响应在传输过程中被监听、篡改或阻断。DNSSEC 不加密数据（只是签名），DoH 加密并隐藏查询内容。两者结合才能实现完整的 DNS 安全（真实 + 保密）。

**Q3：浏览器启用 DoH 后，企业网络管理员还能监控员工的 DNS 查询吗？**
> 基本不能，这就是 DoH 的隐私优势——DNS 查询被加密并伪装成普通 HTTPS 流量（URL 路径 /dns-query），企业代理/防火墙无法区分 DoH 流量和普通 HTTPS 请求。这带来了企业安全管控的挑战：攻击者也可能用 DoH 绕过企业 DNS 过滤。解决方案：企业可以在 DNS 层部署 DoH 代理（客户端 → 企业 DoH 代理 → 外部 DoH），或使用安全 DNS 服务（SES 或 1.1.1.1 for Business）。

### 参考来源 URL

- RFC 1035 (DNS): https://www.rfc-editor.org/rfc/rfc1035
- RFC 8484 (DoH): https://www.rfc-editor.org/rfc/rfc8484
- RFC 7858 (DoT): https://www.rfc-editor.org/rfc/rfc7858
- DNSSEC: https://www.icann.org/resources/pages/dnssec-what-is-it-why-important-2019-03-05-en
- Cloudflare DoH: https://cloudflare.com/1.1.1.1/encryption/dns-over-https/

---

## 6.11 CDN 原理

### 定义/背景（一句话说清）

CDN（Content Delivery Network）通过在全球部署边缘节点，将内容缓存到离用户最近的物理位置，减少网络延迟、减轻源站压力，同时提供 DDoS 防护、SSL 终止、协议优化等增值服务。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│                    CDN 全球架构图                                │
│                                                                  │
│  用户 ──> 浏览器                                                 │
│      │                                                           │
│      ▼                                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              CDN 全球边缘节点 (Edge / PoP)                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │ 北京 PoP     │  │ 上海 PoP     │  │ 深圳 PoP     │       │  │
│  │  │ 39.9ms       │  │ 12.1ms       │  │ 28.5ms       │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │ 洛杉矶 PoP   │  │ 法兰克福 PoP │  │ 新加坡 PoP   │       │  │
│  │  │ 150ms        │  │ 180ms        │  │ 45ms         │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  └──────────────────────────────────────────────────────────┘  │
│      │                                                           │
│      │ Cache Miss 时，回源                                        │
│      ▼                                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              CDN 源站（Origin Server）                     │  │
│  │  真实服务器，存放原始内容                                   │  │
│  │  通常放在单个数据中心，不暴露公网 IP                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              CDN 请求流程（分层缓存）                            │
│                                                                  │
│  Step 1: 用户请求 https://example.com/static/app.js             │
│                                                                  │
│  Step 2: DNS 解析 → CDN 智能 DNS → 返回最近 PoP 的 IP           │
│          北京用户 → 北京 PoP IP                                  │
│          用户本机 DNS: example.com → 39.9ms 延迟节点             │
│                                                                  │
│  Step 3: CDN 边缘节点查找缓存                                    │
│          ┌──────────────────────────────────┐                    │
│          │ Cache HIT  → 直接返回 (毫秒级)    │                    │
│          │ Cache MISS → 进入 Step 4        │                    │
│          │ Cache EXPIRED → 条件请求 (协商)  │                    │
│          │ Cache STALE → 回源同时返回旧数据  │                    │
│          └──────────────────────────────────┘                    │
│                                                                  │
│  Step 4: 回源（Cache Miss）                                      │
│          北京 PoP → 回源站 example.com:8080                      │
│          请求原始内容                                             │
│          源站返回 → 北京 PoP 缓存 → 返回给用户                   │
│                                                                  │
│  Step 5: 缓存更新（可选）                                        │
│          设置 Cache-Control / TTL                               │
│          缓存键（Cache Key）: URL + Query + Vary               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              CDN 加速原理（全面分析）                             │
│                                                                  │
│  1. 就近访问（地理优化）:                                        │
│     物理距离减少 → 光速延迟降低 → 带宽质量提升                    │
│     公式: 延迟 = 距离 / 光速 ≈ 城市间 5ms/百公里                  │
│                                                                  │
│  2. 减少源站压力:                                                │
│     热点资源被边缘节点缓存 → 源站 QPS 大幅降低                    │
│     缓存命中率（HIT Rate）= 缓存命中数 / 总请求数                  │
│     好的 CDN 配置: HIT Rate > 95%                                │
│                                                                  │
│  3. 协议优化:                                                    │
│     - HTTP/2 多路复用（单个连接并行请求）                         │
│     - Brotli 压缩（比 gzip 压缩率高 15-25%）                     │
│     - TLS 终止（边缘节点完成 TLS，源站用 HTTP）                  │
│     - 连接复用（HTTP/2 Server Push / Early Hints）              │
│                                                                  │
│  4. 边缘计算（Edge Computing）:                                  │
│     Cloudflare Workers / AWS CloudFront Functions               │
│     在 CDN 节点执行轻量逻辑（鉴权/重写/AB测试）                   │
│                                                                  │
│  5. DDoS 防护:                                                   │
│     CDN 节点吸收攻击流量 → 干净流量回源                          │
│     Anycast 架构：全球同 IP，攻击被分散                          │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ CDN 配置最佳实践 ============

// 1. 使用 CDN 友好的 URL 结构
const CDN_BASE = 'https://cdn.example.com';
const ASSET_VERSION = 'v1.2.3'; // 文件指纹版本

function cdnUrl(path: string): string {
  return `${CDN_BASE}/${ASSET_VERSION}${path}`;
}

// 资源 URL 示例
const urls = {
  js: cdnUrl('/static/app.bundle.js'),
  css: cdnUrl('/static/styles.css'),
  img: cdnUrl('/static/logo.png'),
  font: cdnUrl('/static/font.woff2'),
};

console.log(urls);

// 2. 缓存控制最佳实践

// index.html: 不缓存（确保用户总是拿到最新）
// 设置: Cache-Control: no-cache, no-store, must-revalidate
//      Pragma: no-cache
//      Expires: 0

// 静态资源（JS/CSS/图片）: 长期缓存
// 设置: Cache-Control: public, max-age=31536000, immutable
//      ETag: <hash>
// immutable: 告知浏览器，内容永不变（新版本 URL 不同）

// API 响应: 短期缓存或不缓存
// 设置: Cache-Control: private, max-age=0, must-revalidate

// ============ CDN 缓存失效策略 ============

// 方式 1: URL 指纹（最推荐，适合静态资源）
// 每次构建时改变文件名
// index.html 引用: /static/app.a3f5b8.js
// 构建后: /static/app.b7c2d9.js
// 用户访问新 index.html → 引用新文件名 → 不受缓存影响

// 方式 2: CDN 缓存失效 API（适合紧急清除）
async function purgeCDNCache(cdnApiUrl: string, apiToken: string, urls: string[]) {
  const response = await fetch(cdnApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urls }),
  });
  return response.json();
}

// Cloudflare Cache Purge 示例
// POST https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache
// Body: { "files": ["https://example.com/style.css"] }

// 方式 3: 缓存标签（Cache Tags / Surrogate Keys）
// 为相关资源打标签，一次清除多个
// 例如: Tag = "product-page-v2" → 所有相关 CSS/JS/图片 一起失效

// ============ CDN 就近接入（Anycast）理解 ============

// Anycast = 多个节点使用同一个 IP
// 用户请求 → 路由到最近的物理节点（网络层自动选择）
// 优势: 负载分散 + 容灾（一个节点挂，其他节点接管）

// 前端检测 CDN 性能
function measureCDNPerformance() {
  const entries = performance.getEntriesByType('resource') as any[];

  const cdnEntries = entries.filter(e =>
    e.name.includes('cdn.') || e.name.includes('cloudfront') || e.name.includes('jsdelivr')
  );

  cdnEntries.forEach(entry => {
    const dns = (entry.domainLookupEnd - entry.domainLookupStart).toFixed(1);
    const tcp = (entry.connectEnd - entry.connectStart).toFixed(1);
    const ssl = entry.secureConnectionStart
      ? (entry.connectEnd - entry.secureConnectionStart).toFixed(1)
      : 'N/A';
    const ttfb = (entry.responseStart - entry.requestStart).toFixed(1);
    const total = (entry.responseEnd - entry.startTime).toFixed(1);

    console.log(`
      资源: ${entry.name.split('/').pop()}
      DNS:  ${dns}ms | TCP: ${tcp}ms | TLS: ${ssl}ms | TTFB: ${ttfb}ms | 总: ${total}ms
    `);
  });
}

// ============ 前端静态资源 CDN 最佳实践 ============

// 1. 预连接关键 CDN
// <link rel="preconnect" href="https://cdn.example.com" crossorigin>

// 2. 预加载关键资源
// <link rel="preload" href="/static/critical.js" as="script">

// 3. 使用 fetchpriority 优化 LCP
// <link rel="preload" href="/static/hero.jpg" as="image" fetchpriority="high">

// 4. 第三方资源使用 SRI（Subresource Integrity）
// <script src="https://cdn.example.com/lib.js"
//         integrity="sha384-oqVuAfXRKap..."
//         crossorigin="anonymous"></script>
// SRI 确保 CDN 资源不被篡改（即使 HTTPS 也需要，因为 CDN 被黑的风险）

// 5. 图片 CDN（自动优化）
// 真正的图片 CDN（如 Cloudflare Images / imgix / Cloudinary）
// 提供: 自动格式转换（WebP/AVIF）、自动裁剪、自动压缩、CDN 加速
// URL 格式: https://cdn.img.com/img.jpg?w=800&fm=webp&q=80
```

### 对比表

| CDN 组件 | 说明 | 关键指标 |
|---------|------|--------|
| PoP（Point of Presence）| 边缘节点，缓存内容 | 节点数量 / 地理分布 |
| Origin Shield | 源站保护层，减少回源 | 回源请求数减少 |
| Cache | 内容存储 | HIT Rate / TTL 配置 |
| Anycast | 同一 IP 分散到最近节点 | DDoS 吸收能力 |
| SSL Termination | 边缘完成 TLS | TLS 版本 / 加密套件 |
| Tiered Cache | L1(内存) + L2(SSD) 分层 | 缓存穿透率 |

| 缓存策略 | TTL | 适用场景 |
|---------|-----|---------|
| immutable + 指纹 | 1 年 | JS/CSS/图片（构建产物）|
| 短期缓存 | 几分钟-几小时 | 频繁更新的 API |
| 不缓存 | 0 | 用户相关数据/登录接口 |
| Stale-While-Revalidate | 基准 TTL | 接受轻微陈旧的数据 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| 缓存键不包含版本 | 资源更新后旧缓存仍被使用 | URL 指纹（内容哈希）|
| HTML 文件被缓存 | index.html 缓存导致 SPA 路由失效 | HTML 设置 no-cache / 短 TTL |
| 源站 IP 暴露 | 直接暴露源站 IP，可绕过 CDN | 源站仅允许 CDN IP 访问（WAF）|
| CDN 回源频繁 | 缓存命中率低，大量请求打到源站 | 优化 TTL + 预热 + 缓存组策略 |
| 跨域配置不当 | CORS 头未正确传递 | CDN 配置 Access-Control-Allow-Origin |
| CDN HTTPS 证书问题 | 证书过期 / 不匹配 | CDN 自动管理或监控证书有效期 |

### 面试追问 + 参考答案要点

**Q1：CDN 的缓存命中率（HIT Rate）如何计算？如何优化？**
> HIT Rate = (HIT 数量) / (总请求数量)。影响因素：1. 缓存键设计（URL + Query + Vary 是否合理）。2. TTL 设置（过长→更新慢，过短→HIT低）。3. 预热策略（新内容发布前预热 CDN）。4. 热门资源集中度（尾部资源缓存效益低）。优化方法：分离静态/动态资源、使用指纹版本URL、预热大文件、合理设置 cache-control 和 stale-while-revalidate。

**Q2：CDN 的 Tiered Cache（分层缓存）是什么？为什么需要它？**
> Tiered Cache = L1 缓存（边缘 PoP 的内存/SSD）+ L2 缓存（区域级缓存 / 源站保护层）。传统 CDN：每个 PoP 各自回源 → 源站压力 = PoP 数量 × 回源率。使用 Tiered Cache：PoP Miss → 先查区域 L2 → L2 Miss 才回源。效果：减少源站回源次数，降低带宽成本。Cloudflare 的"Railgun"、AWS CloudFront 的"Origin Shield"都是 Tiered Cache 的实现。

**Q3：前端如何让 CDN 缓存更高效？**
> 1. **内容哈希文件名**：每次构建改变哈希，用户拿到新 URL。2. **分离长缓存和短缓存资源**：JS/CSS/图片用 immutable + 1 年 TTL，HTML 用 no-cache。3. **预连接 + 预加载**：`<link rel="preconnect">` 提前建立 CDN 连接，`<link rel="preload">` 提前加载关键资源。4. **SRI**：确保 CDN 资源完整性。5. **Picture/WebP**：图片 CDN 自动格式转换，减少传输量。

### 参考来源 URL

- CDN Architecture (Cloudflare): https://www.cloudflare.com/learning/cdn/
- AWS CloudFront: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/
- HTTP Cache (MDN): https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
- SRI (Subresource Integrity): https://www.w3.org/TR/SRI/
- Cache-Control (RFC 9111): https://www.rfc-editor.org/rfc/rfc9111

---

## 6.12 WebSocket 原理

### 定义/背景（一句话说清）

WebSocket 是基于 TCP 的全双工通信协议，通过 HTTP Upgrade 握手建立持久连接，服务器和客户端可随时互相发送帧，无需每次请求-响应，解决了 HTTP 轮询的效率问题，是实时双向通信的事实标准。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              HTTP vs WebSocket 建立连接对比                     │
│                                                                  │
│  HTTP/1.1 (无状态，请求-响应):                                     │
│  Client ─── GET / ───> Server                                    │
│  Client <── 200 OK <── Server (响应后连接关闭)                    │
│                                                                  │
│  WebSocket (全双工，持久连接):                                    │
│  Client ─── HTTP Upgrade 请求 ───> Server                        │
│  Client <── 101 Switching Protocols <── Server                  │
│  Client <═══════ 双向帧交换 ═══════> Server                       │
│  (服务器随时推送，客户端随时发送，无需 HTTP 请求)                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              WebSocket 握手过程                                   │
│                                                                  │
│  Step 1: HTTP Upgrade 请求（浏览器自动完成）                      │
│  GET /ws HTTP/1.1                                                │
│  Host: api.example.com                                          │
│  Upgrade: websocket         ← 告诉服务器我想升级协议               │
│  Connection: Upgrade       ← 连接升级                             │
│  Sec-WebSocket-Version: 13 ← 协议版本                            │
│  Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ== ← 随机 key          │
│  Origin: https://example.com   ← 浏览器自动添加                   │
│                                                                  │
│  Step 2: 服务器验证并响应                                        │
│  HTTP/1.1 101 Switching Protocols                               │
│  Upgrade: websocket                                             │
│  Connection: Upgrade                                            │
│  Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=            │
│  ← 服务器对 Key 做 SHA1 + Base64，验证握手合法性                  │
│                                                                  │
│  Step 3: 连接升级完成                                             │
│  后续所有数据通过 WebSocket 帧传输                                │
│  不再使用 HTTP                                                   │
│                                                                  │
│  Key 验证原理:                                                   │
│  Client Key = "dGhlIHNhbXBsZSBub25jZQ=="                         │
│  Server 拼接固定字符串 "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"   │
│  SHA1(Combined) → Base64 = Sec-WebSocket-Accept                 │
│  防止非浏览器客户端错误地建立 WebSocket 连接                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              WebSocket 帧结构（RFC 6455）                        │
│                                                                  │
│  0                   1                   2                   3    │
│  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1  │
│ +-+-+-+-+-------+-+---------------+-------------------------------+│
│ |F|R|R|R| opcode|M|     mask      |         payload length        |│
│ |I|S|S|S|  (4)  |A|     (1)       |             (7/16/64)         |│
│ |N|V|V|V|       |S|K|             |                               |│
│ +-+-+-+-+-------+-+---------------+-------------------------------+│
│ |     payload len (7 bits)       |  extended payload length      ││
│ +---------------------------------+-------------------------------+│
│ |                   Masking-Key (if mask bit is 1)                ││
│ +---------------------------------+-------------------------------+│
│ |                           Payload Data                           ││
│ +-----------------------------------------------------------------------------:│
│                                                                  │
│  字段详解:                                                         │
│  FIN (1 bit): 1=消息结束, 0=消息未完（分片消息）                   │
│  opcode (4 bits):                                                │
│    0x1 = 文本帧, 0x2 = 二进制帧                                   │
│    0x8 = Close, 0x9 = Ping, 0xA = Pong                           │
│    0x0 = 继续帧（接上条分片消息）                                  │
│  MASK (1 bit): 1=客户端帧（必须掩码）, 0=服务端帧                  │
│  Masking-Key: 0-4 字节（如果 MASK=1）                            │
│  payload length: 7/16/64 位可变长度编码                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              WebSocket 分片（消息分帧）                          │
│                                                                  │
│  大消息分片传输:                                                   │
│  Client → FIN=0, opcode=0x1, "Hello "     ← 分片 1 (文本)        │
│  Client → FIN=0, opcode=0x0, "World"      ← 继续帧               │
│  Client → FIN=1, opcode=0x0, "!"          ← 最后一个分片          │
│  服务器重组: "Hello World!"                                      │
│                                                                  │
│  注意: 只有第一个分片有 opcode，后续都用 opcode=0x0                 │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ WebSocket 客户端完整实现 ============

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly heartbeatInterval = 30000;
  private messageQueue: unknown[] = [];
  private manualClose = false;

  constructor(
    private readonly url: string,
    private readonly options: {
      reconnectInterval?: number;
      heartbeatInterval?: number;
      onMessage?: (data: unknown) => void;
      onOpen?: () => void;
      onClose?: (code: number, reason: string) => void;
      onError?: (error: Event) => void;
    } = {}
  ) {
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    // 可选：添加子协议
    // this.ws = new WebSocket(this.url, ['graphql-ws', 'mqtt']);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushQueue();
      this.options.onOpen?.();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      // 文本消息
      if (typeof event.data === 'string') {
        // 心跳响应不触发 onMessage
        if (event.data === 'pong') return;
        try {
          const parsed = JSON.parse(event.data);
          this.options.onMessage?.(parsed);
        } catch {
          this.options.onMessage?.(event.data);
        }
      }
      // 二进制消息
      else if (event.data instanceof Blob) {
        this.handleBinaryMessage(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        this.handleBinaryMessage(new Blob([event.data]));
      }
    };

    this.ws.onerror = (error: Event) => {
      this.options.onError?.(error);
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.stopHeartbeat();
      this.options.onClose?.(event.code, event.reason || '');

      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };
  }

  send(data: unknown) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      // 离线队列，连接恢复后发送
      this.messageQueue.push(payload);
    }
  }

  close(code = 1000, reason = 'Client normal close') {
    this.manualClose = true;
    this.stopHeartbeat();
    clearTimeout(this.reconnectTimer!);
    this.ws?.close(code, reason);
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('最大重连次数已达上限');
      return;
    }

    const delay = (this.options.reconnectInterval ?? 3000) *
                  Math.pow(1.5, this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.manualClose = false;
      this.connect();
    }, delay);
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (msg) this.send(msg);
    }
  }

  private async handleBinaryMessage(blob: Blob) {
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);

    // 解析自定义二进制协议
    // 例如: 前 4 字节是消息类型，后面是 payload
    const messageType = view.getUint32(0, true);
    const payload = buffer.slice(4);
    console.log('Binary message type:', messageType, 'payload size:', payload.byteLength);
  }
}

// 使用示例
const wsClient = new WebSocketClient('wss://api.example.com/ws', {
  reconnectInterval: 2000,
  onMessage: (data) => console.log('收到:', data),
  onOpen: () => console.log('WebSocket 已连接'),
  onClose: (code, reason) => console.log(`关闭: ${code} ${reason}`),
});

// 发送消息
wsClient.send({ type: 'subscribe', channel: 'price_updates' });

// ============ WebSocket 服务端（Node.js + ws 库）============

import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8080, path: '/ws' });

// 心跳机制（防止断开的连接占用资源）
wss.on('connection', (ws: WebSocket, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`客户端连接: ${ip}`);

  // 设置 ping/pong 处理
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data: Buffer, isBinary: boolean) => {
    if (isBinary) {
      // 处理二进制数据
      console.log(`收到二进制: ${data.length} bytes`);
      ws.send(data); // echo
    } else {
      const message = data.toString();
      console.log(`收到文本: ${message}`);
      ws.send(`Echo: ${message}`);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`断开: ${code} ${reason}`);
  });
});

// 心跳定时器
const interval = setInterval(() => {
  wss.clients.forEach((ws: any) => {
    if (!ws.isAlive) {
      ws.terminate(); // 不优雅，直接断开
      return;
    }
    ws.isAlive = false;
    ws.ping(); // 触发客户端 pong
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

// ============ WebSocket over HTTP/2 ============

// HTTP/2 理论上支持 WebSocket
// 但 WebSocket over HTTP/2 并未被广泛实现
// 大多数 WebSocket 仍然使用 HTTP/1.1 升级

// ============ WebSocket 与 Web Workers ============

// 在 Worker 中运行 WebSocket（不阻塞主线程）
// worker-websocket.js
self.onmessage = (event) => {
  const ws = new WebSocket(event.data.url);

  ws.onopen = () => self.postMessage({ type: 'open' });
  ws.onmessage = (e) => self.postMessage({ type: 'message', data: e.data });
  ws.onerror = (e) => self.postMessage({ type: 'error', data: e });
};
```

### 对比表

| 维度 | HTTP 轮询 | 长轮询 | WebSocket | SSE |
|------|:---------:|:------:|:---------:|:---:|
| 连接建立 | 每次请求新建 | 每次请求新建 | 一次握手持久 | 一次握手持久 |
| 通信方向 | 客户端主动 | 客户端主动 | 全双工 | 服务端→客户端 |
| 服务器推送 | 不支持 | 支持（但低效）| 支持 | 支持 |
| 延迟 | 高 | 中 | 低 | 低 |
| HTTP 头开销 | 每次都带 | 每次都带 | 仅握手 | 仅握手 |
| 兼容性 | 极好 | 极好 | 较好（IE10+）| 较差（不支持 IE）|
| 断线重连 | 无 | 无 | 需手动实现 | 原生 EventSource |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| 没有心跳检测 | 网络中断时连接可能"挂死"而不触发 onclose | 实现 ping/pong 心跳机制 |
| 重连风暴 | 多个客户端同时断线，同时重连导致服务器过载 | 指数退避 + 抖动（jitter）|
| 消息队列溢出 | 离线消息积压导致内存问题 | 限制队列大小，超出后丢弃旧消息 |
| 二进制帧处理缺失 | 只处理文本，不知道如何处理二进制 | 显式处理 Blob / ArrayBuffer |
| WebSocket over 代理被降级 | 某些代理将 WebSocket 降级为 HTTP | 使用 WSS（TLS），更难被识别 |
| 断线不通知 | 页面切换时连接可能静默断开 | visibilitychange 事件 + 重连逻辑 |

### 面试追问 + 参考答案要点

**Q1：WebSocket 为什么需要掩码（Masking）？**
> WebSocket 规范要求客户端发送给服务器的帧必须掩码（MASK=1）。这是为了**防止代理缓存污染攻击**（Turnbull, 2011）：恶意客户端可以在 WebSocket 握手后，通过被污染的代理发送特殊构造的帧，该帧看起来像 HTTP 请求（HTTP 请求通常以 GET 开头），可能被代理缓存。掩码机制使得攻击者无法预测帧内容，防止代理误判。服务端到客户端的帧不需要掩码（因为代理不会修改服务端响应）。

**Q2：WebSocket 和 HTTP/2 多路复用都能双向通信，它们的区别是什么？**
> 1. **协议层**：WebSocket 是独立协议（ws://），HTTP/2 是 HTTP 的扩展（同一个连接传输 HTTP 语义）。2. **语义**：WebSocket 有自己的帧类型（Ping/Pong/Close/Text/Binary），HTTP/2 使用帧传输 HTTP 请求/响应。3. **使用场景**：WebSocket 适合持续的双向实时通信（聊天、游戏），HTTP/2 多路复用适合混合请求/响应和推送的 Web 应用。4. **代理支持**：HTTP/2 需要 ALPN（应用层协议协商），WebSocket 更广泛支持。

**Q3：WebSocket 断开后如何保证消息不丢失？**
> 1. **消息队列**：连接断开时将消息存入队列，连接恢复后 flush。2. **应用层 ACK**：发送消息后等待服务端 ACK，ACK 超时则重发。3. **消息 ID + 去重**：每条消息带唯一 ID，服务端去重后处理。4. **持久化队列（RabbitMQ/Kafka）**：服务端将消息先写入消息队列再响应客户端。5. **补偿机制**：连接恢复后查询"上次收到消息 ID"，服务端补发缺失的消息。

### 参考来源 URL

- RFC 6455 (WebSocket Protocol): https://www.rfc-editor.org/rfc/rfc6455
- MDN WebSocket: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- WebSocket API: https://websockets.spec.whatwg.org/
- WebSocket vs HTTP/2: https://stackoverflow.com/questions/14703627/websockets-vs-server-sent-events-polling

---

## 6.13 SSE vs WebSocket vs 长轮询

### 定义/背景（一句话说清）

SSE（Server-Sent Events）基于 HTTP 的单向服务端推送，适用于服务器到浏览器的实时通知；WebSocket 是基于 TCP 的全双工双向通信；长轮询是 HTTP 轮询的优化，服务器挂起请求直到有新数据或超时。三者各有适用场景，需根据通信方向、实时性要求和兼容性选择。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              SSE vs WebSocket vs 长轮询 时序对比                  │
│                                                                  │
│  SSE（服务端 → 客户端单向）:                                      │
│  Client ── HTTP GET /stream ──> Server                          │
│  Client <── data: {...}\n\n <────────────── Server (随时推送)    │
│  Client <── data: {...}\n\n <────────────── Server              │
│  Client <── event: close\n\n <─────────────── Server (完成)      │
│                                                                  │
│  WebSocket（全双工）:                                             │
│  Client ── HTTP Upgrade ──> Server                              │
│  Client <═══ 双向帧交换 ═══> Server                              │
│  (服务器随时推送，客户端随时发送，真正对等通信)                    │
│                                                                  │
│  长轮询:                                                         │
│  Client ── HTTP GET /poll ──> Server  (服务器挂起)               │
│  Client <── 200 {...data} <─────────────── Server (有新数据)     │
│  Client ── HTTP GET /poll ──> Server  (立即发起新请求)            │
│  Client <── 200 timeout <─────────────── Server (无数据，超时)    │
│  Client ── HTTP GET /poll ──> Server  (立即发起新请求)           │
│  (不断重复，请求之间有间隙)                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              SSE 事件流格式                                       │
│                                                                  │
│  每个事件以双换行符 (\n\n) 分隔:                                  │
│                                                                  │
│  event: stock_update\n                                          │
│  id: 42\n                                                        │
│  data: {"symbol":"AAPL","price":175.3}\n\n                      │
│                                                                  │
│  event: notification\n                                           │
│  data: You have 3 new messages\n\n                               │
│                                                                  │
│  :comment\n              ← 注释（心跳保活）                        │
│  retry: 5000\n              ← 断线重连间隔(ms)                       │
│                                                                  │
│  字段说明:                                                       │
│  data:     事件数据（最重要，多行 data: 会拼接）                   │
│  event:    事件类型（自定义，如 stock_update）                    │
│  id:       事件 ID（浏览器维护 Last-Event-ID，断线后自动发送）    │
│  retry:    重连间隔（毫秒）                                       │
│  :comment: 注释行（心跳，可被浏览器忽略）                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              SSE vs WebSocket 选型决策树                         │
│                                                                  │
│  需要实时通信？                                                   │
│    │                                                             │
│    ├─ 只需服务端推送（服务器 → 浏览器）？                         │
│    │   │                                                         │
│    │   ├─ 需要兼容 IE / 旧浏览器？ → 长轮询（兼容但低效）          │
│    │   ├─ 需要 AI/LLM 流式输出？ → SSE（ReadableStream 原生）   │
│    │   └─ 普通推送（通知、行情）→ SSE（最简单，推荐）              │
│    │                                                             │
│    └─ 需要双向通信（浏览器 ↔ 服务器）？                           │
│        │                                                         │
│        ├─ 延迟 < 100ms（游戏、实时协作）？ → WebSocket            │
│        ├─ 消息可靠性要求极高？ → WebSocket + 应用层 ACK           │
│        └─ 低频交互 + 高并发推送？ → SSE + fetch POST              │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ SSE 完整实现（Node.js + Express）============

import express from 'express';
import { createClient } from 'redis';

const app = express();

app.get('/stream/:userId', async (req: express.Request, res: express.Response) => {
  const { userId } = req.params;

  // 设置 SSE 必需的响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    // 禁用 nginx 缓冲（防止实时变批量）
    'X-Accel-Buffering': 'no',
  });

  // 立即 flush HTTP 头
  res.flushHeaders();

  // Redis Pub/Sub 订阅该用户的通知频道
  const subscriber = createClient();
  await subscriber.connect();

  const channel = `user:${userId}:events`;
  await subscriber.subscribe(channel, (message) => {
    // 新消息到达，立即发送给 SSE 客户端
    res.write(`data: ${message}\n\n`);
  });

  // 定期发送注释行作为心跳
  const heartbeat = setInterval(() => {
    res.write(`:heartbeat ${Date.now()}\n\n`);
  }, 15000);

  // 客户端断开时清理
  req.on('close', async () => {
    clearInterval(heartbeat);
    await subscriber.unsubscribe(channel);
    await subscriber.quit();
    console.log(`[SSE] 客户端断开: ${userId}`);
  });
});

// ============ SSE 客户端 + EventSource ============

const es = new EventSource('/stream/user123');

// 默认 message 事件
es.onmessage = (e: MessageEvent) => {
  const data = JSON.parse(e.data);
  console.log('[SSE 默认事件]', data);
};

// 自定义事件类型
es.addEventListener('stock_update', (e: MessageEvent) => {
  const { symbol, price } = JSON.parse(e.data);
  console.log(`[${symbol}] ${price}`);
});

es.addEventListener('notification', (e: MessageEvent) => {
  showNotification(e.data);
});

// 连接状态
es.onopen = () => console.log('[SSE] 连接已建立');
es.onerror = (e: Event) => {
  console.error('[SSE] 连接错误', e);
  if (es.readyState === EventSource.CLOSED) {
    // 永久关闭，需手动重连
    console.log('[SSE] 连接已关闭');
  }
};

// 获取最后事件 ID（用于断线后恢复）
console.log('Last-Event-ID:', es.lastEventId);

// ============ 使用 fetch + ReadableStream（SSE 的现代替代）============

// AI 流式输出的标准方式（ChatGPT/Gemini 接口）
async function streamAIResponse(prompt: string) {
  const response = await fetch('https://api.example.com/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.body) throw new Error('No response body');

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    // SSE 格式: data: {...}\n\n
    const lines = value.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const content = line.slice(6);
        if (content === '[DONE]') {
          console.log('流式输出完成');
          return;
        }
        try {
          const parsed = JSON.parse(content);
          console.log('Token:', parsed.token);
        } catch {}
      }
    }
  }
}

// ============ WebSocket vs SSE 降级策略 ============

class RealtimeTransport {
  private ws: WebSocket | null = null;
  private es: EventSource | null = null;

  async connect(url: string): Promise<void> {
    // 优先 WebSocket
    if (this.supportsWebSocket()) {
      this.ws = new WebSocket(url);
      this.ws.onmessage = (e) => this.handleMessage(e.data);
    } else {
      // 降级为 SSE
      this.es = new EventSource(url);
      this.es.onmessage = (e) => this.handleMessage(e.data);
    }
  }

  private supportsWebSocket(): boolean {
    return typeof WebSocket !== 'undefined';
  }

  private handleMessage(data: unknown) {
    console.log('收到消息:', data);
  }

  send(data: unknown) {
    // 如果使用 SSE（单向），需要额外建立 fetch 请求发送数据
    if (this.ws) {
      this.ws.send(JSON.stringify(data));
    } else {
      // SSE 降级方案：用 fetch 发送
      fetch('/api/sse-command', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  }

  close() {
    this.ws?.close();
    this.es?.close();
  }
}
```

### 对比表（详细版）

| 维度 | SSE | WebSocket | 长轮询 | 短轮询 |
|------|:---:|:---------:|:------:|:------:|
| 通信方向 | **单向**（服务端→客户端）| **全双工** | 单向（伪推送）| 单向 |
| 连接特性 | 长连接（HTTP）| 长连接（TCP）| 每次请求后关闭再发起 | 短连接 |
| 协议 | HTTP (text/event-stream) | ws:// / wss:// | HTTP | HTTP |
| HTTP 头开销 | 仅首次握手 | 仅握手有头（帧头 2B）| 每轮询次都带完整 HTTP 头 | 每轮次都带完整 HTTP 头 |
| 自动重连 | ✅ 原生 EventSource | ❌ 需手动实现 | ❌ 需手动实现 | N/A |
| 断线消息补发 | ✅ via Last-Event-ID | ❌ 需应用层实现 | ❌ 需应用层实现 | ❌ |
| 二进制数据 | ❌ 仅文本（UTF-8）| ✅ 原生二进制帧 | ✅ | ✅ |
| 单连接多路复用 | ✅（HTTP/2）| ❌（每连接一流）| ❌ | ❌ |
| 穿过代理 | ✅ | ⚠️（可能被降级）| ✅ | ✅ |
| 复杂度 | 低 | 中高 | 中 | 低 |
| IE/Edge Legacy | ❌ | ❌ | ✅ | ✅ |
| 适用场景 | 推送/AI 流式/LLM | 聊天/游戏/实时协作 | 兼容旧系统 | 低频状态轮询 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| nginx 默认缓冲 SSE | nginx 收到完整响应才转发，实时变"批量" | `proxy_buffering off;` 或 `X-Accel-Buffering: no` |
| nginx 超时断开 | 默认 `proxy_read_timeout 60s` 导致连接被斩断 | `proxy_read_timeout 86400;` |
| EventSource 不支持 POST | EventSource 只接受 GET，无法发送认证信息 | 配合 fetch + 一次性 token；或 cookie/Authorization header |
| SSE 连接数限制 | 浏览器同源 HTTP 连接数有限制（HTTP/1.1 通常 6 个）| 改用 HTTP/2；或合并多个 SSE 流为 1 个 |
| 浏览器关闭不通知服务端 | 页面关闭/切换，SSE 连接不会发送 close 通知 | `navigator.sendBeacon` 通知服务端；或心跳超时判定 |

### 面试追问 + 参考答案要点

**Q1：AI 大模型的流式输出为什么用 SSE 而不是 WebSocket？**
> 1. **语义匹配**：LLM 推理只有服务端输出，不需要客户端发送数据，SSE 语义完全吻合。2. **标准 HTTP 兼容**：SSE 是标准 HTTP，长连接穿越代理和 CDN 比 WebSocket 更容易。3. **自动重连**：EventSource 自动处理断线重连，对 AI 流式对话场景友好（对话中断后自动续接）。4. **fetch + ReadableStream**：现代 AI API（如 OpenAI Chat API）使用 SSE 格式，配合 `fetch()` 返回的 `ReadableStream`，前端可精确控制流消费。5. **简单实现**：服务端只需每生成一个 token 就 `res.write('data: ...\n\n')`，无需维护复杂 WebSocket 状态。

**Q2：SSE 如何保证消息不丢失（断线重连后）？**
> SSE 通过 `Last-Event-ID` 机制保证：1. 服务器每次发送事件时携带 `id:` 字段。2. 浏览器自动维护 `es.lastEventId`。3. 断线重连时，浏览器在 HTTP 请求头中自动发送 `Last-Event-ID: <id>`。4. 服务器从 Redis/MQ 中读取 `id ≥ Last-Event-ID` 的未发消息，从断线位置补发。关键点：服务器必须在每次事件中主动发送 `id:` 字段（浏览器只在重连时才发送，平常不发送）。

**Q3：什么情况下应该选择长轮询而不是 SSE 或 WebSocket？**
> 1. **需要兼容 IE9/IE10**（EventSource 不支持，WebSocket 需 polyfill）。2. **服务器端架构限制**（现有系统基于轮询，难以升级为 WebSocket）。3. **防火墙/代理限制**（企业网络可能阻止非标准端口，HTTP 端口 80/443 最通用）。4. **极低频更新场景**（如新闻通知，一天可能只有几条），长轮询的资源消耗可能低于持续连接。

### 参考来源 URL

- MDN - Using server-sent events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- SSE vs WebSocket (Cloudflare): https://blog.cloudflare.com/sse-websockets-data-transfer/
- EventSource spec: https://html.spec.whatwg.org/multipage/server-sent-events.html
- OpenAI Streaming API (SSE): https://platform.openai.com/docs/api-reference/completions

---

## 6.14 RESTful vs GraphQL

### 定义/背景（一句话说清）

RESTful 是基于 HTTP 语义的资源导向架构风格，通过 URL 表示资源，通过 HTTP 方法表示操作；GraphQL 是 Facebook 提出的 API 查询语言，客户端精确声明需要的数据字段，一次请求解决 Over-fetching 和 Under-fetching 问题，但增加了服务端复杂度。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              RESTful API 风格                                    │
│                                                                  │
│  资源: /users, /orders, /products                               │
│                                                                  │
│  HTTP 方法 = 操作语义:                                            │
│  GET    /users      ──> 获取用户列表（查）                       │
│  GET    /users/123  ──> 获取单个用户（查）                       │
│  POST   /users      ──> 创建用户（增）                           │
│  PUT    /users/123 ──> 完整替换用户（改）                        │
│  PATCH  /users/123 ──> 部分修改用户（改）                        │
│  DELETE /users/123 ──> 删除用户（删）                            │
│                                                                  │
│  REST 响应:                                                      │
│  GET /users/123 → { "id": 123, "name": "Alice", "email": "...",   │
│                      "phone": "...", "address": {...}, "orders": [...] }│
│                                                                  │
│  问题: 前端只需要 name + email，但拿到了整个对象                  │
│  → Over-fetching（过度获取）：浪费带宽 + 解析时间                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              GraphQL API 风格                                    │
│                                                                  │
│  单一端点: POST /graphql                                         │
│                                                                  │
│  查询（Query）:                                                  │
│  query {                                                         │
│    user(id: "123") {          ← 精确指定                         │
│      name                                                   │
│      email                                                 │
│    }                                                            │
│  }                                                              │
│                                                                  │
│  GraphQL 响应（只返回请求的字段）:                                │
│  {                                                              │
│    "data": {                                                    │
│      "user": {                                                  │
│        "name": "Alice",                                         │
│        "email": "alice@example.com"                            │
│      }                                                          │
│    }                                                            │
│  }                                                              │
│                                                                  │
│  vs REST: 返回整个 user 对象（Over-fetching）                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              RESTful 的 N+1 问题 vs GraphQL 解决                  │
│                                                                  │
│  RESTful:                                                       │
│  首页需要: 用户信息 + 朋友列表 + 最新帖子                         │
│  请求 1: GET /users/123        → 1 次请求                        │
│  请求 2: GET /users/123/friends → 1 次请求                       │
│  请求 3: GET /users/123/posts  → 1 次请求                       │
│  总计: 3 个 HTTP 请求（N+1 问题）                                │
│                                                                  │
│  GraphQL:                                                       │
│  POST /graphql                                                  │
│  query {                                                         │
│    user(id: "123") {                                            │
│      name                                                        │
│      friends(first: 5) { name avatar }                          │
│      posts(last: 3) { title content }                           │
│    }                                                            │
│  }                                                              │
│  总计: 1 个请求，服务器内部做 DataLoader（批量查询优化）           │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ RESTful API 客户端 ============

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  address?: Address;
  orders?: Order[];
}

async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

async function getUsers(page = 1, limit = 20): Promise<User[]> {
  const response = await fetch(`/api/users?page=${page}&limit=${limit}`);
  return response.json();
}

async function createUser(data: Partial<User>): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function updateUser(id: string, data: Partial<User>): Promise<User> {
  // PATCH 用于部分更新（推荐）
  const response = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function deleteUser(id: string): Promise<void> {
  await fetch(`/api/users/${id}`, { method: 'DELETE' });
}

// ============ GraphQL 客户端（Apollo Client）============

import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';

const client = new ApolloClient({
  link: new HttpLink({ uri: '/graphql' }),
  cache: new InMemoryCache(),
  // 缓存策略
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
    query: { fetchPolicy: 'network-only' },
  },
});

// 定义查询
const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
      avatar
      friends(first: 5) {
        id
        name
        avatar
      }
      posts(last: 3) {
        id
        title
        content
        createdAt
      }
    }
  }
`;

// 执行查询（精确获取需要的字段）
const { data } = await client.query({
  query: GET_USER,
  variables: { id: '123' },
});

// 只请求需要的字段（比 REST 减少 80% 数据量）
const GET_USER_MINIMAL = gql`
  query GetUserMinimal($id: ID!) {
    user(id: $id) {
      name
      avatar
    }
  }
`;

// ============ GraphQL Mutations（变更）============

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`;

await client.mutate({
  mutation: CREATE_USER,
  variables: {
    input: {
      name: 'Alice',
      email: 'alice@example.com',
    },
  },
});

// ============ GraphQL Subscriptions（实时订阅）============

const MESSAGE_SUBSCRIPTION = gql`
  subscription OnMessageReceived($channelId: ID!) {
    messageReceived(channelId: $channelId) {
      id
      content
      sender { name avatar }
      createdAt
    }
  }
`;

// WebSocket 订阅（需要 WebSocket 链接）
// Apollo Client 自动通过 WebSocket 订阅
// const subscription = client.subscribe({
//   query: MESSAGE_SUBSCRIPTION,
//   variables: { channelId: 'room-1' },
// }).subscribe({
//   next: ({ data }) => console.log('新消息:', data),
//   error: (err) => console.error(err),
// });

// ============ RESTful vs GraphQL 选择决策 ============

function chooseAPIStyle(scenario: string): 'REST' | 'GraphQL' {
  switch (scenario) {
    case '移动端低带宽': return 'GraphQL'; // 减少 Over-fetching
    case '公开 API（第三方）': return 'REST'; // 简单易理解，缓存友好
    case '微服务聚合': return 'GraphQL'; // 统一网关，一次请求聚合多个服务
    case '简单 CRUD': return 'REST'; // 不需要复杂查询
    case '需要强类型 Schema': return 'GraphQL'; // 自动生成 TypeScript 类型
    case '需要离线缓存': return 'Apollo + GraphQL'; // 成熟的缓存生态
    default: return 'REST';
  }
}
```

### 对比表

| 维度 | RESTful | GraphQL |
|------|:-------:|:-------:|
| 数据获取 | 多个端点，固定返回 | 单一端点，客户端自描述 |
| Over-fetching | 常见（返回多余字段）| 无（精确返回需要字段）|
| Under-fetching/N+1 | 常见（多端点聚合）| 可用 DataLoader 解决 |
| 缓存 | HTTP 缓存天然支持 | 需额外缓存层（Apollo Cache）|
| 强类型 Schema | 无 | 有（自动生成 TS 类型）|
| API 版本控制 | /v1/users（版本分支）| 通过 Schema 演化（向后兼容）|
| 文件上传 | 直接支持 | 需额外处理（Base64/multipart）|
| 错误处理 | HTTP 状态码 | 200 OK + errors 数组 |
| 学习曲线 | 低 | 中高 |
| 服务端复杂度 | 低 | 高（需要 Schema/Resolver/DataLoader）|
| 客户端复杂度 | 中（手动聚合）| 中（Query language 学习）|
| 实时订阅 | WebSocket 额外实现 | 原生支持（Subscriptions）|

### 常见陷阱与 最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| REST 中 Over-fetching | 每个端点返回固定字段集合 | 用 query 参数（?fields=name,email）|
| GraphQL N+1 | 每个字段单独查数据库 | DataLoader（批量 + 缓存）|
| GraphQL 滥用 | 任何操作都用 GraphQL mutation | 简单查询用 REST，复杂用 GraphQL |
| REST API 不一致 | 各端点命名/返回格式不统一 | OpenAPI 规范 + 自动化测试 |
| GraphQL Query 复杂度 | 恶意客户端构造超深/超宽查询 | Query 复杂度分析 + 深度限制 |
| REST 过度工程 | 为简单操作设计复杂 HATEOAS | 适度 REST，不要教条化 |

### 面试追问 + 参考答案要点

**Q1：RESTful 的"过度获取"（Over-fetching）问题如何解决？**
> 三种方案：1. **Query 参数过滤字段**（`GET /users/123?fields=name,email`），非标准但实用。2. **分页 + 稀疏字段集**（JSON:API 规范的 `fields[type]` 参数）。3. **改用 GraphQL**，从根本上解决此问题。选择取决于团队规模：小型团队 REST 够用，微服务/移动端/数据密集型场景 GraphQL 优势明显。

**Q2：GraphQL 的 N+1 问题是什么？如何解决？**
> N+1 问题：GraphQL 查询 `user { friends { posts { comments } } }`，Resolver 可能对每个 user 执行一次 friends 查询、每个 friend 执行一次 posts 查询、每个 post 执行一次 comments 查询，数据库查询数量爆炸式增长（N=层级深度）。解决方案：DataLoader——将同类型、同条件的查询收集到一批，用 IN 查询批量获取，在当前请求的同一 tick 内做缓存去重。例如：100 个 friend 的 posts，统一成 1 个 `SELECT * FROM posts WHERE friend_id IN (...)`。

**Q3：RESTful 和 GraphQL 各自在什么场景下是更好的选择？**
> REST 适合：公开 API（简单、HTTP 缓存友好、CDN 友好、工具支持完善）、简单 CRUD 系统、移动端低频请求。GraphQL 适合：移动端高频请求（减少 Over-fetching）、微服务聚合层（统一网关）、前端驱动数据需求（客户端决定数据结构）、需要强类型和自动补全的开发者体验。两者并不互斥——可以 REST 做基础设施 API，GraphQL 做前端聚合层。

### 参考来源 URL

- REST Architectural Constraints: https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm
- GraphQL: https://graphql.org/
- GraphQL vs REST: https://放置graphql.com/learn/why-graphql/
- Apollo Client: https://www.apollographql.com/docs/react/
- DataLoader: https://github.com/graphql/dataloader

---

## 6.15 HTTP 状态码大全

### 定义/背景（一句话说清）

HTTP 状态码是服务器对客户端请求的响应状态，用三位数字表示，分为 1xx（信息性）、2xx（成功）、3xx（重定向）、4xx（客户端错误）、5xx（服务端错误），是排查网络问题、理解 HTTP 行为的核心知识。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              HTTP 状态码全景图                                    │
│                                                                  │
│  1xx 信息性（处理中，实验性协议）                                  │
│  ├── 100 Continue          客户端继续发送（上传大文件前确认）    │
│  ├── 101 Switching Protocols WebSocket 协议升级                  │
│  └── 102 Processing        处理中（WebDAV，长操作）             │
│                                                                  │
│  2xx 成功                                                        │
│  ├── 200 OK                 标准成功                            │
│  ├── 201 Created            资源创建成功（POST/PUT）             │
│  ├── 202 Accepted           异步任务已接受（处理中）             │
│  ├── 204 No Content         成功无返回体（DELETE成功）           │
│  ├── 206 Partial Content    分段下载/断点续传                   │
│  └── 207 Multi-Status       多状态（WebDAV）                    │
│                                                                  │
│  3xx 重定向                                                      │
│  ├── 301 Moved Permanently  永久重定向（SEO，浏览器缓存）         │
│  ├── 302 Found              临时重定向（保持原方法，但不可靠）    │
│  ├── 303 See Other          临时重定向（强制变 GET）             │
│  ├── 304 Not Modified       协商缓存命中（不返回 body）          │
│  ├── 307 Temporary Redirect 临时重定向（严格保持原方法）         │
│  └── 308 Permanent Redirect 永久重定向（严格保持原方法）         │
│                                                                  │
│  4xx 客户端错误                                                  │
│  ├── 400 Bad Request        请求格式错误（参数/语法错误）        │
│  ├── 401 Unauthorized       未认证（需要登录）                   │
│  ├── 403 Forbidden          已认证但无权限                       │
│  ├── 404 Not Found          资源不存在                          │
│  ├── 405 Method Not Allowed HTTP 方法不支持                      │
│  ├── 408 Request Timeout    请求超时                            │
│  ├── 409 Conflict           资源冲突（版本冲突/重复唯一键）      │
│  ├── 410 Gone               资源永久删除（比 404 更明确）        │
│  ├── 413 Payload Too Large  请求体过大                          │
│  ├── 414 URI Too Long       URL 过长（GET 参数过多）             │
│  ├── 415 Unsupported Media  Content-Type 不支持                 │
│  ├── 422 Unprocessable Entity 请求格式正确但语义错误              │
│  ├── 429 Too Many Requests  频率限制（Rate Limiting）           │
│  └── 499 Client Closed Request 客户端主动关闭（nginx 扩展码）     │
│                                                                  │
│  5xx 服务端错误                                                  │
│  ├── 500 Internal Server Error 一般性服务器错误（未处理异常）     │
│  ├── 501 Not Implemented    功能未实现                          │
│  ├── 502 Bad Gateway        上游服务器错误响应（网关/代理）      │
│  ├── 503 Service Unavailable服务不可用（过载/维护）              │
│  ├── 504 Gateway Timeout    上游服务器超时（网关/代理）          │
│  └── 599 Origin Connect Timeout 源站连接超时（CDN 特有）         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              502 vs 504 的本质区别                               │
│                                                                  │
│  502 Bad Gateway:                                              │
│  网关/代理 收到了上游服务器的响应，但响应是错误的                  │
│  （例如: upstream 返回 500 / 503 / 非 HTTP 响应）                 │
│                                                                  │
│  504 Gateway Timeout:                                           │
│  网关/代理 等了很久没收到上游服务器的响应（超时）                  │
│  （例如: upstream 处理太慢 / 完全无响应）                         │
│                                                                  │
│  常见场景:                                                       │
│  CDN 回源 → 源站 502 → 源站崩溃/返回错误页面                      │
│  nginx 反向代理 → 后端服务 504 → 后端服务超时/无响应              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              304 Not Modified 原理                              │
│                                                                  │
│  首次请求:                                                       │
│  Client ── GET /style.css ──> Server                            │
│  Client <── 200 OK, ETag: "abc123" <──────── Server              │
│  Client 保存 ETag: "abc123"                                      │
│                                                                  │
│  后续请求（带协商）:                                              │
│  Client ── GET /style.css ─────────────────────────────────────>│
│  If-None-Match: "abc123"  ────────────────────────────────────────│
│                                                                  │
│  Server 发现 ETag 匹配:                                          │
│  Client <── 304 Not Modified (无 body) <──────────────────────────│
│  Client 继续使用本地缓存                                          │
│                                                                  │
│  节省: 整个响应 body 的传输（通常几百 KB）                        │
│  304 响应只有 HTTP 头（约 200 字节）                               │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ HTTP 状态码在 fetch 中的处理 ============

async function safeFetch(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const status = response.status;
  const statusText = response.statusText;

  // 2xx: 成功
  if (status >= 200 && status < 300) {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return { ok: true, data: await response.json() };
    }
    return { ok: true, data: await response.text() };
  }

  // 304: 缓存命中（不应该在 fetch 中出现，浏览器自动处理）
  if (status === 304) {
    return { ok: true, data: null, cached: true };
  }

  // 3xx: 重定向（浏览器自动处理，除非手动 follow）
  if (status >= 300 && status < 400) {
    const location = response.headers.get('location');
    console.warn(`重定向到: ${location} (${status} ${statusText})`);
    // 可以手动处理：window.location.href = location;
    return { ok: false, redirect: location, status };
  }

  // 4xx: 客户端错误
  if (status === 400) {
    const error = await response.json().catch(() => response.text());
    throw new APIError('Bad Request', status, error);
  }
  if (status === 401) {
    // 未认证 → 跳转登录页
    throw new AuthError('Unauthorized', status);
  }
  if (status === 403) {
    throw new PermissionError('Forbidden', status);
  }
  if (status === 404) {
    throw new NotFoundError(`Resource not found: ${url}`, status);
  }
  if (status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new RateLimitError('Too Many Requests', status, retryAfter);
  }

  // 5xx: 服务端错误
  if (status >= 500) {
    const error = await response.text();
    throw new ServerError('Server Error', status, error);
  }

  throw new Error(`Unhandled status: ${status} ${statusText}`);
}

// 自定义错误类型
class APIError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
    this.name = 'APIError';
  }
}

class AuthError extends APIError {
  constructor(message: string, status: number) {
    super(message, status, null);
    this.name = 'AuthError';
  }
}

class RateLimitError extends APIError {
  constructor(message: string, status: number, public retryAfter: string | null) {
    super(message, status, null);
    this.name = 'RateLimitError';
  }
}

// ============ 429 限流的前端处理 ============

async function fetchWithRateLimitHandling(url: string): Promise<unknown> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get('Retry-After') || '60',
          10
        );
        const waitMs = retryAfter * 1000 + Math.random() * 1000; // 加抖动
        console.warn(`限流触发，等待 ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
        continue; // 重试
      }

      return response.json();
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

// ============ 理解 304 缓存协商（Service Worker）============

// Service Worker 中的缓存策略
// 配合 Cache-Control 和 ETag 实现最优缓存
self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open('v1').then(async (cache) => {
      const cached = await cache.match(event.request);

      // 发起网络请求，带 If-None-Match / If-Modified-Since
      const networkResponse = await fetch(event.request, {
        // 不走 Service Worker 缓存，直接请求服务器
        cache: 'no-cache',
      });

      if (networkResponse.status === 304) {
        // 服务器返回 304 → 使用缓存
        return cached!;
      }

      // 服务器返回新内容 → 更新缓存
      cache.put(event.request, networkResponse.clone());
      return networkResponse;
    })
  );
});
```

### 对比表

| 分类 | 1xx | 2xx | 3xx | 4xx | 5xx |
|------|:---:|:---:|:---:|:---:|:---:|
| 含义 | 信息 | 成功 | 重定向 | 客户端错误 | 服务端错误 |
| 可缓存 | ❌ | ✅ (GET/HEAD) | ⚠️ 部分 | ❌ | ❌ |
| 可重试 | - | ✅ | ❌（会变化）| ⚠️ 部分 | ✅ (部分) |
| 幂等性 | N/A | ✅ | ❌ | ❌ | ❌ |

| 常见错误码 | 含义 | 前端处理 |
|-----------|------|---------|
| 400 | 请求参数错误 | 显示错误信息给用户 |
| 401 | 未登录 | 跳转登录页 |
| 403 | 无权限 | 显示权限不足 |
| 404 | 资源不存在 | 显示 404 页面 |
| 429 | 限流 | 等待 Retry-After 后重试 |
| 500 | 服务器内部错误 | 显示错误页，报告错误 |
| 502 | 上游服务器错误 | 通常是 CDN/网关问题，显示错误 |
| 503 | 服务不可用 | 显示维护公告 |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| 混淆 401 和 403 | 401=未认证（没登录），403=已认证无权限 | 严格区分，401 跳转登录，403 显示权限不足 |
| 200 返回错误 | 接口返回 200 但 body 里是错误 | 统一使用 HTTP 状态码 + 错误响应体 |
| 404 不区分来源 | 资源不存在 vs URL 写错 | 返回不同 body 信息帮助调试 |
| 5xx 不记录 | 服务器 500 无日志，难以排查 | 每个 5xx 必须有唯一 trace ID + 日志 |
| 滥用 202 Accepted | 用 202 表示"异步开始了"但不告知结果 | 提供查询接口，让客户端主动查询 |

### 面试追问 + 参考答案要点

**Q1：HTTP 状态码 201 和 202 的区别是什么？**
> 201 Created 表示资源已经被成功创建，通常返回新资源的 URI（Location 头），客户端可以立即使用这个资源。202 Accepted 表示请求已被接受，但处理尚未完成（异步任务），服务器可能最终成功也可能失败，客户端需要通过其他机制（如轮询/WebSocket）查询结果。场景：201 用于同步创建（文件上传到 CDN 并立即返回 URL），202 用于异步处理（视频转码任务，提交后返回任务 ID）。

**Q2：为什么 304 Not Modified 响应没有 body，但 HTTP 头仍然完整？**
> 304 是 HTTP 的缓存验证机制，服务器告诉客户端"你本地的缓存仍然有效，不需要重新传输 body"。因为 HTTP 规范设计时假设客户端已经有缓存的完整 body（包含首次请求的 ETag），所以只需要发送 HTTP 头（包含更新后的元数据如 Cache-Control），客户端使用本地缓存即可。这节省了大量带宽（可能几百 KB 的 body）。现代 HTTP/1.1 的 ETag + 304 机制是 CDN 和浏览器缓存高效运行的基础。

**Q3：什么情况下会收到 502 Bad Gateway？**
> 502 通常出现在反向代理/网关层（Nginx、CDN、API Gateway）：当这些中间层向"上游"（Origin Server、微服务）发起请求，收到的响应是非法的或错误的（超时、连接拒绝、上游返回非 HTTP 响应），中间层无法处理就返回 502 给客户端。典型场景：Nginx → uWSGI（Django/Flask）通信失败；CDN → 源站连接超时；API Gateway → 微服务崩溃。504 是等太久，502 是收到错误的响应。

### 参考来源 URL

- RFC 9110 (HTTP Semantics) - Status Codes: https://www.rfc-editor.org/rfc/rfc9110#section-15
- MDN HTTP Status Codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- HTTP 状态码完整列表: https://httpstatuses.com/

---

## 6.16 301/302/307/308 区别

### 定义/背景（一句话说清）

301 和 308 表示永久重定向（资源永久移至新地址），302、303 和 307 表示临时重定向（资源暂时在另一个地址）；核心区别在于是否严格保持原始 HTTP 方法——301/302 历史上不保证方法不变（POST 可能变 GET），307/308 严格要求方法不变，303 则强制将方法改为 GET。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              HTTP 重定向状态码完整对比                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    永久重定向（Permanent）               │    │
│  │                                                         │    │
│  │  301 Moved Permanently                                   │    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │ 方法: ⚠️ 不保证（浏览器可能改 POST → GET）         │  │    │
│  │  │ Body: 通常保留（不可靠）                          │  │    │
│  │  │ 兼容: 旧浏览器兼容性最好                          │  │    │
│  │  │ 用途: 旧系统兼容（不知道 308）                    │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  │                                                         │    │
│  │  308 Permanent Redirect                                  │    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │ 方法: ✅ 严格保持（POST/PUT 不变）                  │  │    │
│  │  │ Body: ✅ 保留                                    │  │    │
│  │  │ 兼容: 现代浏览器（2015 RFC 7538）                 │  │    │
│  │  │ 用途: API 版本迁移，永久重定向 + 方法不变         │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    临时重定向（Temporary）               │    │
│  │                                                         │    │
│  │  302 Found (= 302 Moved Temporarily，历史上叫 Moved Temporarily）│    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │ 方法: ⚠️ 不保证（浏览器可能改 POST → GET）         │  │    │
│  │  │ Body: 通常保留（不可靠）                          │  │    │
│  │  │ 兼容: 旧浏览器兼容性最好                          │  │    │
│  │  │ 用途: 临时维护页面（知道 307 后，应避免）         │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  │                                                         │    │
│  │  303 See Other                                          │    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │ 方法: ❌ 强制变为 GET（即使原请求是 POST/PUT）     │  │    │
│  │  │ Body: ❌ 丢弃                                    │  │    │
│  │  │ 兼容: 现代浏览器                                 │  │    │
│  │  │ 用途: POST 处理后重定向到结果页（302→303）       │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  │                                                         │    │
│  │  307 Temporary Redirect                                 │    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │ 方法: ✅ 严格保持（POST/PUT 不变，body 保留）      │  │    │
│  │  │ Body: ✅ 保留（客户端必须重新发送相同 body）       │  │    │
│  │  │ 兼容: 现代浏览器                                 │  │    │
│  │  │ 用途: 临时重定向，保持 HTTP 方法不变              │  │    │
│  │  │ 特殊: 不允许自动重定向（浏览器必须问用户）        │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              重定向的实际选择指南                                 │
│                                                                  │
│  永久重定向（资源永久移走）:                                       │
│  → 使用 308（标准）                                              │
│  → 兼容旧浏览器时才用 301                                        │
│  → 场景: 域名迁移、API 版本 v1→v2、URL 结构重写                   │
│                                                                  │
│  临时重定向（资源暂时在别处）:                                     │
│  → 使用 307（标准）                                              │
│  → 兼容旧浏览器时才用 302                                        │
│  → 场景: 负载均衡、灰度发布、AB测试                               │
│                                                                  │
│  POST 处理后重定向:                                              │
│  → 必须用 303（强制 GET，防止重复提交）                           │
│  → 场景: 表单提交后重定向到结果页                                  │
│                                                                  │
│  常见错误:                                                       │
│  ❌ POST 后用 302 → 浏览器可能重试 GET → 错误                    │
│  ✅ POST 后用 303 → 浏览器改为 GET → 正确                         │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ HTTP 重定向在 Node.js 中的使用 ============

import express from 'express';

const app = express();

// 301 永久重定向（用于域名/URL 永久迁移）
app.get('/old-page', (req, res) => {
  // 旧 SEO 链接 → 永久跳转到新链接
  res.redirect(301, '/new-page');
});

// 302 临时重定向（旧方式，不推荐）
app.get('/maintenance', (req, res) => {
  res.redirect(302, '/temporary-page');
});

// 303 See Other（POST 后重定向到结果页）
app.post('/api/create-order', (req, res) => {
  const orderId = createOrder(req.body);

  // 303: 告诉浏览器用 GET 访问结果页
  // 防止用户刷新页面时重复 POST
  res.redirect(303, `/orders/${orderId}`);
});

// 307 Temporary Redirect（保持方法不变）
app.post('/api/migrate', (req, res) => {
  // 临时将请求代理到另一个服务器
  // 307 确保 POST body 保留
  res.redirect(307, 'https://new-server.example.com/api/migrate');
});

// 308 Permanent Redirect（永久重定向，保持方法不变）
app.put('/api/v1/users/:id', (req, res) => {
  // API v1 永久迁移到 v2，保持 PUT 方法
  res.redirect(308, `/api/v2/users/${req.params.id}`);
});

// ============ 正确理解 POST + 重定向 ============

// 浏览器行为分析：
// 用户提交 POST /api/create-order
// 服务器返回 303 Redirect to /orders/123
// 浏览器自动发送 GET /orders/123 （不是 POST！）

// 这是"Post-Redirect-Get (PRG)"模式：
// 防止用户刷新页面时重复提交表单
// 避免浏览器"重新提交表单？"提示

// 常见错误：使用 302 或 307 进行 PRG
// POST + 302 → 浏览器行为不确定（可能重试 POST）
// POST + 303 → 浏览器安全地改为 GET

// ============ 前端检测和处理重定向 ============

async function fetchWithRedirectHandling(url: string) {
  const response = await fetch(url, {
    redirect: 'manual', // 不自动跟随重定向，手动处理
  });

  const location = response.headers.get('location');

  switch (response.status) {
    case 301:
      console.log('永久重定向到:', location);
      // 搜索引擎更新索引
      break;
    case 302:
    case 303:
    case 307:
    case 308:
      console.log('临时重定向到:', location);
      break;
    case 200:
      return response;
    default:
      throw new Error(`Unexpected status: ${response.status}`);
  }
}

// ============ SSR 中的重定向（Next.js）============

// 永久重定向（SSR 层面）
// Next.js 使用 redirect() 工具
import { redirect } from 'next/navigation';

export async function GET() {
  // permanent: true → 308, permanent: false → 307
  redirect('/new-page', { permanent: true }); // 308
}

// 302/303 重定向
// 适用于：未登录 → 登录页
redirect('/login'); // 307

// 303 强制 GET
import { redirect } from 'next/navigation';
// Next.js App Router: 可以使用 NextResponse.redirect() 显式指定 303
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  await processForm(request);
  return NextResponse.redirect(new URL('/result', request.url), 303);
}
```

### 对比表

| 状态码 | 名称 | 永久/临时 | 方法是否改变 | Body 是否保留 | 推荐使用 |
|-------|------|:--------:|:-----------:|:------------:|---------|
| 301 | Moved Permanently | 永久 | ⚠️ 不保证 | 通常保留 | 旧浏览器兼容 |
| 302 | Found | 临时 | ⚠️ 不保证 | 通常保留 | 旧浏览器兼容 |
| 303 | See Other | 临时 | ❌ 强制 GET | ❌ 丢弃 | **POST 处理后重定向** |
| 307 | Temporary Redirect | 临时 | ✅ 严格保持 | ✅ 保留 | **临时重定向（推荐）** |
| 308 | Permanent Redirect | 永久 | ✅ 严格保持 | ✅ 保留 | **永久重定向（推荐）** |

### 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| POST 后用 302 重定向 | 浏览器可能重复 POST（POST 是非幂等的）| 用 303（强制 GET）或 PRG 模式 |
| 不区分 301 和 302 | 永久迁移用 302 → 浏览器不缓存，SEO 不传递权重 | 永久迁移用 301/308 |
| 重定向循环 | A→B→C→A → 浏览器报错 "Too many redirects" | 配置监控 + 自动化测试 |
| 重定向链过长 | A→B→C→D→E → 每次重定向有 RTT 开销 | 合并重定向链（A→D 一步到位）|
| POST body 通过 302/307 传递 | HTTP 规范允许但不保证 | 303 后 body 自然被丢弃；307 需客户端实现 |

### 面试追问 + 参考答案要点

**Q1：为什么 HTTP/1.0 时代的 301/302 不能保证方法不变？**
> 这是历史兼容性问题。早期很多浏览器实现中，301/302 的响应如果是 POST 请求，浏览器会改为 GET 再发请求（因为很多服务器对 POST 返回 302 时只返回 HTML 页面而不是真正处理）。HTTP/1.1 引入 303 来明确"将方法改为 GET"，307 来明确"严格保持方法"。现代浏览器对 301/302 实际上保持方法不变（除非响应是 302 且有 Location），但规范仍然不保证，所以关键操作应该用 307/308。

**Q2：307 和 302 都是临时重定向，什么时候用 307？**
> 当你希望**严格保持原始 HTTP 方法和请求体**时用 307。例如：1. API 网关临时将请求代理到备用服务器（需要保持 POST body）。2. 灰度发布时将部分请求转发到新版本服务（保持原始请求）。3. 任何需要保持 HTTP 方法不变的场景。如果只是简单的"页面临时迁移"，302 够用（方法变化也无妨）。

**Q3：重定向对 SEO 的影响是什么？**
> 301/308：告诉搜索引擎"页面永久移走了"，权重（PageRank）会传递到新页面，搜索引擎更新索引。302/303/307：告诉搜索引擎"这是临时状态"，不传递权重，原始页面仍被索引。常见错误：用 302 做域名迁移 → SEO 权重不传递 → 搜索排名消失。正确做法：域名/URL 永久变更用 301 或 308。

### 参考来源 URL

- RFC 9110 (HTTP 重定向): https://www.rfc-editor.org/rfc/rfc9110#section-15.4
- RFC 7538 (308 Permanent Redirect): https://www.rfc-editor.org/rfc/rfc7538
- MDN HTTP redirects: https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections
- Post-Redirect-Get Pattern: https://en.wikipedia.org/wiki/Post/Redirect/Get

---

## 6.17 GET/POST/PUT/PATCH 幂等性

### 定义/背景（一句话说清）

幂等性指同一操作执行一次和执行多次的结果完全相同（服务器状态不变）。GET/HEAD/PUT/DELETE 是幂等的（可安全重复），POST/PATCH 是非幂等的（每次执行都产生新结果）。幂等性是构建可靠分布式系统和安全重试机制的基础。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              HTTP 方法幂等性全景                                 │
│                                                                  │
│  幂等方法（Idempotent）: 一次和多次执行效果相同                   │
│  ├── GET    ── 读资源 ── 幂等 ✓                                 │
│  ├── HEAD   ── 读元数据 ── 幂等 ✓                                │
│  ├── PUT    ── 完整替换 ── 幂等 ✓                                │
│  ├── DELETE ── 删除资源 ── 幂等 ✓（重复删除 = 状态不变）          │
│  └── TRACE  ── 回环检测 ── 幂等 ✓                                │
│                                                                  │
│  非幂等方法:                                                     │
│  ├── POST   ── 创建/处理 ── 非幂等 ✗（每次都新建资源）           │
│  └── PATCH  ── 部分修改 ── 非幂等 ✗（除非实现幂等）              │
│                                                                  │
│  安全方法（Safe）: 不修改服务器资源                               │
│  ├── GET / HEAD / OPTIONS / TRACE ── 安全 ✓                     │
│  └── POST / PUT / DELETE / PATCH ── 不安全 ✗                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              幂等性示例                                  │    │
│  │                                                         │    │
│  │  PUT /users/123                                        │    │
│  │  Body: { "name": "Alice" }                             │    │
│  │                                                         │    │
│  │  第1次执行: name = "Alice"                              │    │
│  │  第2次执行: name = "Alice" (没有变化)                    │    │
│  │  第3次执行: name = "Alice" (仍然没变化)                  │    │
│  │  → 幂等！                                               │    │
│  │                                                         │    │
│  │  POST /users                                           │    │
│  │  Body: { "name": "Alice" }                             │    │
│  │                                                         │    │
│  │  第1次执行: 创建 user #1，name=Alice                    │    │
│  │  第2次执行: 创建 user #2，name=Alice                    │    │
│  │  第3次执行: 创建 user #3，name=Alice                    │    │
│  │  → 非幂等！多次执行 ≠ 一次执行                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              PUT vs PATCH 的区别                                 │
│                                                                  │
│  PUT /users/123                                                 │
│  Body: { "name": "Alice", "email": "alice@example.com" }        │
│                                                                  │
│  语义: 完整替换资源                                              │
│  第1次: user #123 = { name:"Alice", email:"alice@example.com" }│
│  第2次: user #123 = { name:"Alice", email:"alice@example.com" }│
│  → 即使只有 name 字段，也传入所有字段（否则其他字段被清空）       │
│                                                                  │
│  PATCH /users/123                                               │
│  Body: { "email": "new@example.com" }                          │
│                                                                  │
│  语义: 部分修改字段                                              │
│  第1次: user #123.email = "new@example.com"                     │
│  第2次: user #123.email = "new@example.com" (无变化)             │
│  → 只传需要修改的字段（其他字段保持不变）                         │
│                                                                  │
│  注意: PATCH 天然非幂等                                          │
│  但可以通过实现变为幂等：                                         │
│  PATCH + 条件判断（如版本号/ETag）                               │
│  → 第2次执行时，如果版本已更新，拒绝修改                          │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ HTTP 方法在 fetch 中的使用 ============

// GET: 获取资源（幂等，安全，可缓存）
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// POST: 创建资源（非幂等，不安全，不缓存）
async function createUser(data: Partial<User>): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (response.status === 201) {
    const location = response.headers.get('Location');
    return location ? getUser(location) : response.json();
  }
  throw new Error(`Creation failed: HTTP ${response.status}`);
}

// PUT: 完整替换（幂等，不安全，不缓存）
async function replaceUser(id: string, data: User): Promise<User> {
  const response = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data), // 必须包含所有字段
  });
  return response.json();
}

// PATCH: 部分修改（非幂等，不安全，不缓存）
async function updateUserEmail(id: string, email: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }), // 只传需要修改的字段
  });
  return response.json();
}

// DELETE: 删除资源（幂等，不安全，不缓存）
async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
  // 200 / 204 都合理（200 返回删除结果，204 无返回体）
  if (response.status === 404) {
    console.warn('资源不存在，视为删除成功（幂等）');
  }
}

// ============ 安全重试机制（利用幂等性）============

async function fetchWithRetry(
  url: string,
  options: RequestInit & { retries?: number } = {}
): Promise<Response> {
  const { retries = 3, ...fetchOptions } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        // 幂等方法可以安全重试，非幂等需要额外逻辑
      });

      // 5xx / 网络错误 → 重试
      if (!response.ok && response.status >= 500) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
          continue;
        }
      }

      return response;
    } catch (error) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// 幂等方法重试（无风险）
await fetchWithRetry('/api/users/123', { method: 'DELETE' });

// 非幂等方法重试（风险！）
// 如果 POST 成功了但响应丢失，重试会导致重复创建
// 解决方案：使用 Idempotency Key

// ============ Idempotency Key（幂等性键）============

async function createOrderWithIdempotency(orderData: unknown): Promise<Order> {
  const idempotencyKey = crypto.randomUUID();

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Idempotency-Key: 告诉服务器这是幂等请求
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(orderData),
  });

  // 409 Conflict = 该 Idempotency Key 已处理，返回之前的结果
  if (response.status === 409) {
    // 返回 409 不一定是错误，可能是之前已经处理过了
    const existing = await response.json();
    return existing; // 返回之前创建的结果
  }

  return response.json();
}

// 服务端 Idempotency Key 实现（伪代码）
// 缓存: Map<IdempotencyKey, { status, response }>
// 收到新请求: 检查缓存
//   已存在且处理中 → 返回 409 或 202 Accepted
//   已存在且完成 → 返回缓存的 response
//   不存在 → 处理请求，缓存结果
```

### 对比表

| HTTP 方法 | 幂等性 | 安全性 | 缓存 | 请求体 | 标准用途 |
|----------:|:------:|:------:|:----:|:------:|---------|
| GET | ✅ 幂等 | ✅ 安全 | ✅ 可缓存 | ❌ 无 | 获取资源 |
| HEAD | ✅ 幂等 | ✅ 安全 | ✅ 可缓存 | ❌ 无 | 获取元数据 |
| POST | ❌ 非幂等 | ❌ 不安全 | ❌ 不缓存 | ✅ 支持 | 创建资源 |
| PUT | ✅ 幂等 | ❌ 不安全 | ❌ 不缓存 | ✅ 支持 | 完整替换 |
| PATCH | ❌ 非幂等 | ❌ 不安全 | ❌ 不缓存 | ✅ 支持 | 部分修改 |
| DELETE | ✅ 幂等 | ❌ 不安全 | ❌ 不缓存 | ⚠️ 通常无 | 删除资源 |
| OPTIONS | ✅ 幂等 | ✅ 安全 | ❌ 不缓存 | ❌ 无 | CORS 预检 |
| HEAD | ✅ 幂等 | ✅ 安全 | ✅ 可缓存 | ❌ 无 | 检查资源是否存在 |

### 常见陷阱与 最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| POST 不幂等却重复提交 | 用户刷新页面/网络抖动导致重复 POST | PRG 模式 + Idempotency Key |
| PUT 漏传字段被清空 | PUT 是完整替换，漏字段 = 清空字段 | PUT 前先 GET，或者用 PATCH |
| PATCH 语义错误 | PATCH 只改字段，不是 merge | 明确 PATCH 语义：JSON Merge Patch vs JSON Patch |
| DELETE 非幂等实现 | 删除后返回 404（幂等），但记录日志 = 非幂等 | 删除操作本身幂等（无副作用）|
| 混淆幂等性和安全性 | PUT 是幂等的，但是不安全的 | 幂等 ≠ 安全；PUT 仍然修改资源 |

### 面试追问 + 参考答案要点

**Q1：为什么 DELETE 是幂等的，但 DELETE 后返回 404 却是正确的？**
> 幂等性的定义是"执行一次和执行多次的结果相同"。DELETE 第一次执行：资源被删除（状态变化）。DELETE 第二次执行：资源本来就不存在（状态没有变化，仍然是"不存在"）。所以最终状态一致——都是"不存在"。HTTP 规范明确说 DELETE 成功后可以返回 200（附响应体）或 204（无响应体），如果资源不存在应该返回 404——但 404 本身也符合幂等性（因为删除幂等操作的结果就是"资源不存在"）。

**Q2：如何让 PATCH 请求变成幂等的？**
> PATCH 天然非幂等，但可以通过条件判断实现幂等：1. **版本号/ETag**：PATCH 请求携带 `If-Match: <ETag>` 头，如果资源 ETag 不匹配（已被其他请求修改），返回 409 Conflict 并拒绝修改。这样重复的 PATCH（相同的 ETag）第一次成功，第二次被拒绝（资源版本已变），符合幂等语义。2. **JSON Patch + 测试操作**：使用 RFC 6902 的 `test` 操作，只有测试通过才执行，保证幂等。3. **补偿事务**：PATCH 执行前先记录操作历史，重复 PATCH 时返回之前的结果（Same Result Semantics，弱幂等）。

**Q3：PUT 和 PATCH 的本质区别是什么？**
> 语义层：PUT 是"用请求体完整替换资源的当前状态"，PATCH 是"按指令修改资源的部分字段"。实现层：PUT 应该包含资源的所有字段（否则缺失字段被设为 null 或默认值），PATCH 只需要包含要修改的字段。更深层：PUT 映射到"完整更新"（full replace），PATCH 映射到"增量更新"（partial update）。从 REST 规范角度，PUT 的 URI 可以指向"用户模板"（POST /users），也可以指向"具体资源"（PUT /users/123）。

### 参考来源 URL

- RFC 9110 (HTTP Semantics) - Method Definitions: https://www.rfc-editor.org/rfc/rfc9110#section-9
- Idempotency in HTTP: https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header
- REST API Design - HTTP Methods: https://restfulapi.net/http-methods/
- JSON Patch (RFC 6902): https://www.rfc-editor.org/rfc/rfc6902

---

## 6.18 OAuth2 原理

### 定义/背景（一句话说清）

OAuth2 是一个授权框架，允许第三方应用在用户授权下访问其在资源服务器（如 Google、GitHub）上的数据，而无需用户提供密码。核心思想是"委托授权"——用户授权第三方访问特定数据，授权服务器颁发有时限的访问令牌（Access Token），资源服务器验证令牌后提供数据。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              OAuth2 四种授权模式                                  │
│                                                                  │
│  1. Authorization Code（授权码模式，最安全，推荐）                │
│     适用于：有后端服务器的 Web 应用                               │
│                                                                  │
│  2. PKCE Authorization Code（Auth Code + 动态密钥，推荐移动端）   │
│     适用于：无后端的单页应用（SPA）/ 移动 App                      │
│                                                                  │
│  3. Client Credentials（客户端凭证）                            │
│     适用于：服务端之间通信（无用户参与）                           │
│                                                                  │
│  4. Implicit（隐式，已废弃，不推荐）                              │
│     问题: token 在 URL 中暴露，无 refresh token                   │
│                                                                  │
│  5. Resource Owner Password Credentials（密码模式，极少使用）     │
│     问题: 第三方获取用户密码，不推荐                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              OAuth2 Authorization Code 完整流程                  │
│                                                                  │
│  用户 ── 点击"用 Google 登录" ──>                                │
│                                                                  │
│  Step 1: 浏览器重定向到授权服务器                                 │
│  GET https://accounts.google.com/o/oauth2/v2/auth?               │
│    client_id=YOUR_CLIENT_ID                                      │
│    &redirect_uri=https://your-app.com/callback                   │
│    &response_type=code                                           │
│    &scope=openid%20profile%20email                               │
│    &state=RANDOM_STATE                                           │
│    &code_challenge=PKCE_CODE_CHALLENGE                           │
│    &code_challenge_method=S256                                   │
│                                                                  │
│  Step 2: 用户在 Google 登录并授权（浏览器与授权服务器之间）        │
│  （your-app 服务器不接触用户名/密码）                             │
│                                                                  │
│  Step 3: 授权服务器重定向回 your-app                             │
│  GET https://your-app.com/callback?                              │
│    code=AUTH_CODE        ← 一次性授权码（有效期短，约 60 秒）     │
│    &state=RANDOM_STATE   ← 验证防 CSRF                          │
│                                                                  │
│  Step 4: your-app 后端用 code 换 token（服务端对服务端）          │
│  POST https://oauth2.googleapis.com/token                       │
│  Content-Type: application/x-www-form-urlencoded                 │
│                                                                  │
│  grant_type=authorization_code                                    │
│  &code=AUTH_CODE                                                 │
│  &client_id=YOUR_CLIENT_ID                                       │
│  &client_secret=YOUR_CLIENT_SECRET      ← 后端持有，不泄露       │
│  &redirect_uri=https://your-app.com/callback                    │
│  &code_verifier=PKCE_CODE_VERIFIER       ← 验证 PKCE             │
│                                                                  │
│  Step 5: 授权服务器返回 token                                    │
│  {                                                              │
│    "access_token": "ya29.xxx",          ← 访问令牌（1小时）      │
│    "refresh_token": "1//xxx",           ← 刷新令牌（长期有效）   │
│    "expires_in": 3600,                                        │
│    "token_type": "Bearer"                                      │
│  }                                                              │
│                                                                  │
│  Step 6: your-app 用 access_token 访问 Google API                 │
│  GET https://www.googleapis.com/oauth2/v3/userinfo              │
│  Authorization: Bearer ya29.xxx                                  │
│                                                                  │
│  Step 7: 用户信息返回                                            │
│  { "sub": "...", "name": "Alice", "email": "alice@example.com" }│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              JWT vs Session（Token 认证对比）                    │
│                                                                  │
│  JWT (Stateless Token):                                          │
│  服务器不存储 Token，只验证签名                                   │
│  Token 包含用户信息和签名，由客户端存储                           │
│                                                                  │
│  Session (Stateful):                                              │
│  服务器存储会话数据，客户端持有 Session ID                       │
│  每次请求携带 Session ID，服务器查表获取用户信息                  │
│                                                                  │
│  ┌────────────────┬────────────────┬────────────────┐           │
│  │ 特性           │ JWT            │ Session        │           │
│  ├────────────────┼────────────────┼────────────────┤           │
│  │ 存储位置       │ 客户端(Token)  │ 服务器(Redis)   │           │
│  │ 扩展性         │ 好（无状态）  │ 需 Session 共享 │           │
│  │ 撤销           │ 困难（需黑名单）│ 简单（删除表项）│           │
│  │ 安全性         │ ⚠️ token 泄露  │ ✅ 可立即撤销  │           │
│  │ 体积           │ 大（自包含）  │ 小（仅 ID）   │           │
│  │ 过期控制       │ 精准（内嵌）  │ 服务端控制    │           │
│  └────────────────┴────────────────┴────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ OAuth2 PKCE 授权码模式（SPA 前端）============

class OAuth2Client {
  private clientId: string;
  private redirectUri: string;
  private scope: string;
  private authorizationEndpoint: string;
  private tokenEndpoint: string;
  private codeVerifier: string = '';

  constructor(config: {
    clientId: string;
    redirectUri: string;
    scope: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
  }) {
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
    this.scope = config.scope;
    this.authorizationEndpoint = config.authorizationEndpoint;
    this.tokenEndpoint = config.tokenEndpoint;
  }

  // Step 1: 生成 PKCE code verifier 和 challenge
  private generateCodeVerifier(): string {
    this.codeVerifier = crypto.randomUUID() + crypto.randomUUID();
    return this.codeVerifier;
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Step 2: 发起登录（重定向到授权服务器）
  async login(): Promise<void> {
    const verifier = this.generateCodeVerifier();
    const challenge = await this.generateCodeChallenge(verifier);

    // 将 verifier 临时保存（回调时需要）
    sessionStorage.setItem('oauth_code_verifier', verifier);

    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scope,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${this.authorizationEndpoint}?${params}`;
  }

  // Step 3: 处理回调（从 URL 获取 code）
  async handleCallback(): Promise<TokenResponse> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code')!;
    const state = params.get('state')!;

    // 验证 state（防 CSRF）
    const savedState = sessionStorage.getItem('oauth_state');
    if (state !== savedState) {
      throw new Error('OAuth2 state mismatch: CSRF attack?');
    }

    // 获取保存的 code verifier
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier')!;

    // Step 4: 用 code + code_verifier 换 token
    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const tokens = await response.json() as TokenResponse;

    // 保存 token
    localStorage.setItem('access_token', tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }

    // 清理临时数据
    sessionStorage.removeItem('oauth_code_verifier');
    sessionStorage.removeItem('oauth_state');

    return tokens;
  }

  // Step 5: 用 access_token 访问受保护资源
  async fetchProtectedResource(url: string): Promise<unknown> {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // Token 过期，尝试刷新
    if (response.status === 401) {
      await this.refreshAccessToken();
      return this.fetchProtectedResource(url); // 重试
    }

    return response.json();
  }

  // Step 6: 刷新 access_token
  async refreshAccessToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      await this.login(); // 需要重新登录
      return;
    }

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      await this.login();
      return;
    }

    const tokens = await response.json() as TokenResponse;
    localStorage.setItem('access_token', tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

// 使用
const oauth = new OAuth2Client({
  clientId: 'your-client-id',
  redirectUri: window.location.origin + '/callback',
  scope: 'openid profile email',
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
});

// 登录入口
document.getElementById('login-btn')?.addEventListener('click', () => {
  oauth.login();
});
```

### 对比表

| OAuth2 模式 | 适用场景 | 安全性 | 复杂度 | 推荐 |
|------------|:-------:|:------:|:------:|:----:|
| Auth Code | 有后端 Web 应用 | ⭐⭐⭐⭐⭐ | 中 | ✅ |
| PKCE Auth Code | SPA / 移动 App | ⭐⭐⭐⭐⭐ | 中高 | ✅✅ |
| Client Credentials | 服务间通信（无用户）| ⭐⭐⭐⭐ | 低 | ✅ |
| Implicit | 已废弃 | ⭐⭐ | 低 | ❌ |
| Password | 信任的第一方应用 | ⭐⭐ | 低 | ❌ |

| 维度 | JWT | Session | Cookie |
|------|-----|---------|--------|
| 存储 | LocalStorage / Memory | 服务器（Redis/MySQL）| 浏览器 |
| 撤销 | 需黑名单/短期 TTL | ✅ 立即删除 | ✅ 立即过期 |
| XSS 风险 | 高（LS 易被 XSS 读取）| 低（不在浏览器存储）| 中（HttpOnly 可缓解）|
| CSRF 风险 | 低（不含 Cookie）| 高（Cookie 自动发送）| 高（需 SameSite）|
| 体积 | 大 | 小 | 小 |

### 常见陷阱与 最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| Implicit 模式仍在用 | Implicit 在 URL 中暴露 token，无 refresh token | 迁移到 PKCE Auth Code |
| access_token 存在 LocalStorage | XSS 可以直接读取 token | 存在 Memory + HttpOnly Cookie 备份 |
| 没有 token 刷新机制 | access_token 过期后用户被登出 | 实现 refresh_token 自动刷新 |
| 不验证 state 参数 | OAuth2 CSRF 攻击 | 始终生成并验证 state |
| PKCE 未使用（SPA）| 授权码可能被截获 | SPA 必须使用 PKCE（RFC 7636）|

### 面试追问 + 参考答案要点

**Q1：OAuth2 和 SSO（单点登录）的区别是什么？**
> OAuth2 是**授权**框架（允许第三方访问资源），SSO 是**认证**机制（一次登录多处访问）。OAuth2 可以实现 SSO（把 SSO 当作一种授权场景），但 OAuth2 本身不是 SSO。SSO 的核心是"一处登录，多处通行"（如 CAS、OIDC）。OpenID Connect（OIDC）是在 OAuth2 之上的身份层，增加了 ID Token（用户身份信息），是最常见的"带认证的 OAuth2"实现，本质上就是 OAuth2 + SSO。

**Q2：为什么 SPA 应该使用 PKCE 而不是隐式授权？**
> 隐式授权的问题：1. Token 在 URL fragment 中返回（`#access_token=...`），可能被浏览器历史记录、日志、Referer 头泄露。2. 没有 Refresh Token，access_token 过期后需要重新授权。3. 无法验证 Token 是否真的是授权服务器颁发的（无 client_secret）。PKCE（RFC 7636）为公共客户端（SPA/移动 App）增加了动态密钥验证：客户端生成 code_verifier + code_challenge，授权服务器记录 challenge，token 交换时验证 verifier。即使授权码被拦截，攻击者没有 code_verifier 无法换 token。

**Q3：JWT 的安全性问题有哪些？如何防御？**
> 1. **Token 存储在 LocalStorage**：XSS 可以读取。防御：存 HttpOnly Cookie 或 Memory（页面刷新丢失）。2. **无法主动撤销**：token 泄露后无法立即撤销。防御：短期 TTL（如 15 分钟）+ 黑名单，或使用 Session。3. **alg=none 攻击**：攻击者伪造 Header `{"alg":"none"}` 跳过签名验证。防御：服务器显式指定期望算法（禁止 `alg: none`）。4. **密钥混淆**：RS256 公钥被当作 HS256 对称密钥用，造成签名验证绕过。防御：显式指定算法，验证前检查 `alg` 字段。

### 参考来源 URL

- RFC 6749 (OAuth 2.0): https://www.rfc-editor.org/rfc/rfc6749
- RFC 7636 (PKCE): https://www.rfc-editor.org/rfc/rfc7636
- RFC 7519 (JWT): https://www.rfc-editor.org/rfc/rfc7519
- OpenID Connect: https://openid.net/connect/
- OAuth2 Security Best Current Practice: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics

---

## 6.19 CORS 原理

### 定义/背景（一句话说清）

CORS（Cross-Origin Resource Sharing）是浏览器安全机制，允许服务器声明哪些来源（协议+域名+端口）的网页可以访问其资源，从而在保持同源策略保护的同时，安全地开放跨域访问。简单请求直接带 Origin 头，复杂请求需要预检（OPTIONS）确认权限。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              同源策略（Same-Origin Policy）                      │
│                                                                  │
│  同源 = 协议 + 域名 + 端口 三者完全相同                          │
│                                                                  │
│  https://a.example.com:443                                      │
│  vs https://a.example.com:443    → 同源 ✓                       │
│  vs https://b.example.com:443    → 不同源（域名不同）            │
│  vs http://a.example.com:443     → 不同源（协议不同）            │
│  vs https://a.example.com:8080  → 不同源（端口不同）            │
│                                                                  │
│  SOP 限制:                                                       │
│  ✗ Fetch/XHR 跨域请求 → 被浏览器拦截                            │
│  ✗ Cookie / LocalStorage 跨域访问                               │
│  ✗ DOM 跨域读写                                                  │
│  ✗ iframe 跨域内容访问                                           │
│                                                                  │
│  SOP 不限制:                                                     │
│  ✓ <script src> ── 可跨域加载 JS（JSONP 的原理）                 │
│  ✓ <link href> ── 可跨域加载 CSS                                │
│  ✓ <img src> ─── 可跨域加载图片                                 │
│  ✓ @font-face ── 可跨域加载字体                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              简单请求 vs 复杂请求                                │
│                                                                  │
│  简单请求（同时满足全部条件）:                                    │
│  ✅ 方法: GET / HEAD / POST                                     │
│  ✅ Header: 只能是简单 Header 或 自定义安全 Header                │
│     - Accept, Accept-Language, Content-Language                 │
│     - Content-Type 只能是:                                      │
│       • application/x-www-form-urlencoded                       │
│       • multipart/form-data                                      │
│       • text/plain                                              │
│                                                                  │
│  复杂请求（满足任一条件）:                                        │
│  ❌ PUT / DELETE / PATCH 方法                                    │
│  ❌ 非简单 Header (Authorization, Content-Type 不是简单值)      │
│  ❌ Content-Type 不是简单值（如 application/json）              │
│  ❌ 请求发送 Cookie（credentials: include）                      │
│                                                                  │
│  → 复杂请求 需要预检（Preflight）                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              预检请求（Preflight）完整流程                       │
│                                                                  │
│  浏览器 ── OPTIONS /api/data ─────────────────────────────────> │
│  Origin: https://example.com ─────────────────────────────────> │
│  Access-Control-Request-Method: PUT ───────────────────────────>│
│  Access-Control-Request-Headers: Content-Type, Authorization ─>│
│                                                               │
│  服务器响应:                                                    │
│  <── Access-Control-Allow-Origin: https://example.com ─────────│
│  <── Access-Control-Allow-Methods: GET, POST, PUT, DELETE ────│
│  <── Access-Control-Allow-Headers: Content-Type, Authorization │
│  <── Access-Control-Max-Age: 86400    ← 预检结果缓存 24 小时    │
│                                                               │
│  浏览器检查: 预检通过？                                         │
│  ├─ 是 → 发送真实 PUT 请求                                      │
│  └─ 否 → 抛出 CORS 错误                                         │
│                                                               │
│  真实 PUT 请求:                                                │
│  ── PUT /api/data ───────────────────────────────────────────>│
│  Origin: https://example.com                                  │
│  Authorization: Bearer xxx                                     │
│  Content-Type: application/json                               │
│                                                               │
│  服务器响应:                                                   │
│  <── Access-Control-Allow-Origin: https://example.com          │
│  <── 200 OK, { "data": ... }                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              CORS 关键响应头详解                                 │
│                                                                  │
│  Access-Control-Allow-Origin: * | https://example.com          │
│  ← 允许的来源，* 表示允许所有（credentials:include 时不能用 *） │
│                                                                  │
│  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS │
│  ← 允许的 HTTP 方法                                             │
│                                                                  │
│  Access-Control-Allow-Headers: Content-Type, Authorization     │
│  ← 允许的请求头                                                  │
│                                                                  │
│  Access-Control-Allow-Credentials: true                        │
│  ← 是否允许携带 Cookie（此时 Allow-Origin 不能是 *）            │
│                                                                  │
│  Access-Control-Expose-Headers: X-Request-ID, X-Custom-Header  │
│  ← 哪些响应头可以被 JS 读取（默认只有 7 个简单响应头）            │
│                                                                  │
│  Access-Control-Max-Age: 86400                                  │
│  ← 预检结果缓存时间（秒），减少预检请求                          │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```typescript
// ============ 前端跨域请求（携带 Cookie）============

// 简单请求
async function simpleCORSRequest() {
  const response = await fetch('https://api.example.com/data', {
    // credentials: 'include' → 携带 Cookie
    // 注意：服务器 Access-Control-Allow-Credentials: true
    //       且 Access-Control-Allow-Origin 不能是 *
    credentials: 'include',
  });
  return response.json();
}

// 复杂请求（会自动发送预检）
async function complexCORSRequest(data: unknown) {
  const response = await fetch('https://api.example.com/data', {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer xxx', // 非简单 Header，触发预检
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // 常见 CORS 错误：
    // "has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header"
    console.error('CORS 错误:', errorText);
  }

  return response.json();
}

// ============ Node.js CORS 中间件（Express）============

import cors from 'cors';

// 基础配置
app.use(cors({
  origin: 'https://example.com', // 只允许此来源
  // 或者用函数动态判断
  // origin: (origin, callback) => {
  //   const allowed = ['https://example.com', 'https://app.example.com'];
  //   callback(null, allowed.includes(origin!));
  // },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Rate-Limit-Remaining', 'X-Request-ID'],
  credentials: true, // 允许携带 Cookie
  maxAge: 86400, // 预检结果缓存 24 小时
}));

// 生产环境：动态允许列表
const ALLOWED_ORIGINS = new Set([
  'https://example.com',
  'https://app.example.com',
  'https://staging.example.com',
]);

app.use(cors({
  origin: (origin, callback) => {
    // 开发环境允许（origin 为 undefined = 本地 file:// 等）
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ============ CORS 预检缓存优化 ============

// 浏览器对预检结果进行缓存（Access-Control-Max-Age）
// 服务器配置合理的 Max-Age 减少预检请求
// 大型 SPA：通常 1-24 小时

// nginx 配置 CORS 头
const nginxCorsConfig = `
location /api/ {
    # 预检请求
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '$http_origin';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Request-ID';
        add_header 'Access-Control-Allow-Credentials' 'true';
        add_header 'Access-Control-Max-Age' 86400;
        add_header 'Content-Length' 0;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        return 204;
    }

    # 实际请求
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Expose-Headers' 'X-Request-ID, X-Rate-Limit-Remaining';
}
`;

// ============ CORS 错误诊断 ============

function diagnoseCORSError(response: Response): void {
  const corseHeaders = {
    allowOrigin: response.headers.get('Access-Control-Allow-Origin'),
    allowMethods: response.headers.get('Access-Control-Allow-Methods'),
    allowHeaders: response.headers.get('Access-Control-Allow-Headers'),
    allowCredentials: response.headers.get('Access-Control-Allow-Credentials'),
    exposeHeaders: response.headers.get('Access-Control-Expose-Headers'),
    maxAge: response.headers.get('Access-Control-Max-Age'),
  };

  console.log('CORS 响应头分析:', corseHeaders);

  // 常见问题：
  if (!corsHeaders.allowOrigin) {
    console.error('❌ 服务器未返回 Access-Control-Allow-Origin');
    console.error('→ 服务器未配置 CORS');
  }
  if (corsHeaders.allowOrigin === '*' && corsHeaders.allowCredentials === 'true') {
    console.error('❌ Allow-Origin: * 与 Credentials: true 冲突');
    console.error('→ 必须指定具体 origin');
  }
}
```

### 对比表

| 请求类型 | 是否预检 | 触发条件 | Origin 发送 | Cookie |
|---------|:-------:|---------|:-----------:|:------:|
| 简单 GET | ❌ 否 | GET + 简单 Header + text/* | ✅ 自动 | ❌ (默认) |
| 简单 POST (JSON) | ✅ 是 | POST + application/json | ✅ 自动 | ❌ (默认) |
| 复杂 PUT/DELETE | ✅ 是 | 非简单方法 | ✅ 自动 | ❌ (默认) |
| 带 Authorization | ✅ 是 | 非简单 Header | ✅ 自动 | ❌ (默认) |
| credentials:include | ⚠️ 需服务器允许 | 任何请求 | ✅ 自动 | ✅ 携带 |

| CORS 场景 | 前端 | 服务器配置 |
|---------|------|---------|
| 完全开放 API | `origin: *` | `Access-Control-Allow-Origin: *` |
| 需要登录的 API | `credentials: include` | `origin: https://xxx.com` + `credentials: true` |
| API 白名单 | 前端不变 | 动态判断 origin 是否在白名单 |
| 受保护资源（需 Bearer Token）| `Authorization: Bearer` | CORS 检查 + Token 验证双重保护 |

### 常见陷阱与 最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| credentials + origin: * | `Allow-Origin: *` 和 `credentials: true` 冲突 | 动态 origin 或不用 credentials |
| 预检结果缓存过短 | 每次请求都预检，性能浪费 | `Access-Control-Max-Age: 86400` |
| 只配置 GET，不配置 OPTIONS | 预检请求失败 | OPTIONS 必须返回正确的 CORS 头 |
| 混淆 CORS 和 JSONP | JSONP 已废弃 | 使用 CORS，JSONP 只有 GET |
| CORS 头丢失 | 反向代理/CDN 剥离了 CORS 头 | 确保代理透传或重新添加 CORS 头 |

### 面试追问 + 参考答案要点

**Q1：为什么 CORS 只在浏览器中生效？Postman/cURL 不受限制？**
> CORS 是**浏览器**的安全策略，由浏览器实现。浏览器在发送跨域请求前会检查响应头，如果 CORS 验证失败，浏览器会阻止 JS 读取响应（请求实际上已发出，服务器也处理了，但 JS 拿不到结果）。服务器确实收到了请求并处理了。Postman/cURL/Node.js 不受此限制，它们是直接发送 HTTP 请求，不经过浏览器的 CORS 检查。这就是为什么 CORS 不能作为后端 API 的访问控制手段——只能用做"建议"，真正的访问控制需要 Token/Cookie 等认证机制。

**Q2：OPTIONS 预检请求会被缓存吗？如何优化？**
> 预检结果可以被浏览器缓存，通过 `Access-Control-Max-Age` 响应头设置（秒数）。例如 `Max-Age: 86400` 表示预检结果缓存 24 小时，期间相同请求不再发送预检。优化建议：1. 设置合理的 Max-Age（大流量 API 设 1-24 小时）。2. 减少 `Access-Control-Allow-Headers` 中的非必要 Header。3. 对于频繁请求的方法，尽量使用简单请求（GET/POST + text/plain）。

**Q3：JSONP 为什么能绕过 CORS？它有什么安全问题？**
> JSONP 利用了 SOP 不限制 `<script>` 标签的特点。服务端返回 JavaScript 代码（而非 JSON），浏览器直接执行。`<script src="https://api.example.com/data?callback=foo">` → 服务器返回 `foo({"data": ...})` → 浏览器执行这个 JS → 调用 `foo` 函数获得数据。安全问题：1. 目标服务器必须是可信的（执行返回的 JS 代码 = 完全信任）。2. 无法携带 Cookie（script 标签不能设置 credentials）。3. 无法做 POST 请求。4. 如果 JSONP 响应被篡改，攻击者可以执行任意代码。JSONP 已完全废弃，应使用 CORS。

### 参考来源 URL

- Fetch Standard - CORS: https://fetch.spec.whatwg.org/#http-cors-protocol
- MDN CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- RFC 6454 (Origin): https://www.rfc-editor.org/rfc/rfc6454
- HTML Living Standard - CORS: https://html.spec.whatwg.org/multipage/infrastructure.html# cors

---

## 6.20 nginx 正向代理 / 反向代理 / 负载均衡

### 定义/背景（一句话说清）

正向代理代理客户端（代表用户访问外部网络，需要用户配置）；反向代理代理服务器（隐藏真实服务器，客户端以为代理就是源站）。负载均衡是反向代理的一种形式，将请求分配到多个后端服务器。nginx 是高性能的反向代理/负载均衡器，同时也是前端静态资源服务器。

### ASCII 原理图

```
┌─────────────────────────────────────────────────────────────────┐
│              正向代理 vs 反向代理 vs 负载均衡                     │
│                                                                  │
│  正向代理（Forward Proxy）:                                       │
│                                                                  │
│  用户浏览器                                                      │
│    │ (配置代理服务器 IP)                                         │
│    ▼                                                             │
│  ┌──────────────────┐                                            │
│  │   正向代理服务器  │  ← 代理站在客户端侧                       │
│  │  (Proxy Server)  │  ← 代表用户访问外部网络                    │
│  └──────────────────┘                                            │
│    │                                                             │
│    ▼                                                             │
│  目标网站 A / 目标网站 B / ...                                    │
│                                                                  │
│  用途:                                                           │
│  - 企业内网过滤（禁止访问某些网站）                                │
│  - 翻墙（用户通过境外代理访问被墙网站）                            │
│  - 缓存加速（代理缓存常用资源）                                    │
│  - 匿名访问（隐藏用户真实 IP）                                     │
│                                                                  │
│  客户端必须配置代理:                                              │
│  Browser → Proxy IP:Port  → Target Website                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  反向代理（Reverse Proxy）:                                       │
│                                                                  │
│  用户浏览器                                                      │
│    │ 以为访问的是 example.com                                    │
│    ▼                                                             │
│  ┌──────────────────┐                                            │
│  │   反向代理/ nginx │  ← 代理站在服务器侧                       │
│  │  (Reverse Proxy) │  ← 代表服务器接收请求                      │
│  └──────────────────┘                                            │
│    │                                                             │
│    ├─> 真实服务器 A (10.0.0.1:8080)                              │
│    ├─> 真实服务器 B (10.0.0.2:8080)                              │
│    └─> 真实服务器 C (10.0.0.3:8080)                              │
│                                                                  │
│  用途:                                                           │
│  - 隐藏源站真实 IP（安全）                                        │
│  - SSL 终止（TLS 在 nginx 终止，源站用 HTTP）                     │
│  - 负载均衡                                                      │
│  - 静态资源服务                                                  │
│  - 缓存加速                                                      │
│  - 安全防护（WAF / DDoS）                                        │
│                                                                  │
│  用户不知道真实服务器存在:                                        │
│  Browser → https://example.com → nginx → upstream servers       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              nginx 负载均衡算法                                   │
│                                                                  │
│  1. 轮询（Round Robin）—— 默认                                    │
│     请求 1 → A → 请求 2 → B → 请求 3 → C → 请求 4 → A            │
│     问题: 不考虑服务器性能差异                                    │
│                                                                  │
│  2. 加权轮询（Weighted Round Robin）                              │
│     A(weight=3) B(weight=1)                                      │
│     → A → A → A → B → A → A → A → B ...                         │
│     问题: 无法解决 session 亲和性                                │
│                                                                  │
│  3. IP Hash                                                      │
│     hash(IP) % 3 → 同一 IP 始终路由 到同一 server                 │
│     优点: Session 保持（同一个用户去同一台服务器）                │
│     缺点: server 下线时 hash 重算，用户 session 丢失             │
│                                                                  │
│  4. 最少连接（Least Connections）                                │
│     新请求 → 当前连接数最少的 server                              │
│     适合: 请求处理时间差异大的场景                                │
│                                                                  │
│  5. URL Hash                                                     │
│     hash(URL) % N → 同一资源 URL 始终路由到同一 server            │
│     优点: 缓存友好（同一资源总去同一台 server）                   │
│     缺点: server 下线时重算                                       │
│                                                                  │
│  6. 一致性哈希（Consistent Hash）                                 │
│     改进的 URL Hash，server 下线时影响范围最小                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              nginx HTTP 请求处理流程                             │
│                                                                  │
│  Client Request                                                   │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. 读取 HTTP 请求行 / 请求头                            │    │
│  │ 2. Server Name 匹配（virtual server）                    │    │
│  │ 3. Location 匹配（URL path 匹配）                       │    │
│  │ 4. Rewrite 模块（重写 URL）                             │    │
│  │ 5. 权限控制（allow / deny）                            │    │
│  │ 6. Try Files（尝试静态文件）                           │    │
│  │ 7. Proxy Pass / FastCGI Pass（反向代理 / FastCGI）     │    │
│  │ 8. 响应头处理（gzip / cache / add_header）              │    │
│  │ 9. 日志记录（access_log）                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  Client Response                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 完整代码示例（TS/JS）

```nginx
# ============ 完整 nginx 配置示例 ============

# 全局配置
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;           # Linux 高性能事件模型
    multi_accept on;
}

http {
    # 基础配置
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式（JSON 格式，便于 ELK 分析）
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    '"$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time"';

    access_log /var/log/nginx/access.log main;

    # 性能优化
    sendfile on;
    tcp_nopush on;        # 发送 HTTP 响应头时，Nagle 算法优化
    tcp_nodelay on;       # 对 keep-alive 连接禁用 Nagle
    keepalive_timeout 65;
    keepalive_requests 1000;

    # gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript
               application/xml application/xml+rss text/javascript;

    # ============ 负载均衡 Upstream ============
    upstream backend {
        # 方式 1: 加权轮询（默认）
        server 10.0.0.1:8080 weight=3;
        server 10.0.0.2:8080 weight=1;

        # 方式 2: IP Hash（Session 保持）
        # ip_hash;

        # 方式 3: 最少连接
        # least_conn;

        # 健康检查
        # 注意: nginx 商业版有主动健康检查，开源版需要第三方模块
        server 10.0.0.3:8080 max_fails=3 fail_timeout=30s backup;

        keepalive 32;       # 到 upstream 的长连接数
    }

    upstream api_backend {
        server 10.0.0.4:3000;
        server 10.0.0.5:3000;
        keepalive 16;
    }

    # ============ HTTP Server（80 → 443 重定向）============
    server {
        listen 80;
        server_name example.com www.example.com;

        # HSTS（强制 HTTPS）
        add_header Strict-Transport-Security
            'max-age=31536000; includeSubDomains; preload';

        # 永久重定向到 HTTPS
        return 301 https://$host$request_uri;
    }

    # ============ HTTPS Server（443）============
    server {
        listen 443 ssl http2;
        server_name example.com www.example.com;

        # SSL 证书（Let's Encrypt）
        ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

        # TLS 配置（推荐）
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;

        # OCSP Stapling
        ssl_stapling on;
        ssl_stapling_verify on;
        resolver 8.8.8.8 8.8.4.4 valid=300s;
        ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;

        # ============ 静态资源 / SPA ============
        location / {
            root /var/www/static;
            index index.html;
            # SPA 路由 fallback
            try_files $uri $uri/ /index.html;

            # 长期缓存（带指纹的文件）
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff)$ {
                expires 1y;
                add_header Cache-Control 'public, immutable';
            }

            # HTML 不缓存
            location ~* \.html$ {
                expires -1;
                add_header Cache-Control 'no-cache, no-store, must-revalidate';
            }
        }

        # ============ 反向代理到 API ============
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;

            # 传递真实客户端 IP
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # 连接复用
            proxy_set_header Connection "";

            # 超时设置
            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;

            # 不缓存 API 响应
            proxy_no_cache $cookie_nocache;
            proxy_cache_bypass $cookie_nocache;
        }

        # ============ 代理到内部服务 ============
        location /admin/ {
            # 内部管理后台（仅内网访问）
            allow 10.0.0.0/8;
            allow 172.16.0.0/12;
            deny all;

            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # ============ WebSocket 代理 ============
        location /ws/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;

            # WebSocket 超时（很长）
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;

            # 禁用缓冲（实时通信需要）
            proxy_buffering off;
        }

        # ============ SSE 代理 ============
        location /stream/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;

            # 禁用 nginx 缓冲（实时流需要）
            proxy_buffering off;
            proxy_cache off;

            # SSE 超时（长连接）
            proxy_read_timeout 86400s;

            # 推送完成前不关闭连接
            chunked_transfer_encoding on;
        }

        # ============ 缓存配置 ============
        proxy_cache_path /var/cache/nginx levels=1:2
            keys_zone=my_cache:10m max_size=1g inactive=60m use_temp_path=off;

        location /cached-api/ {
            proxy_pass http://backend;
            proxy_cache my_cache;
            proxy_cache_valid 200 10m;
            proxy_cache_valid 404 1m;
            proxy_cache_use_stale error timeout http_500 http_502 http_503;
            proxy_cache_key "$host$request_uri$http_authorization";
            add_header X-Cache-Status $upstream_cache_status;
        }

        # ============ 限流 ============
        # 按 IP 限流
        limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://backend;
        }

        # 按服务器限流（连接数）
        limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

        location / {
            limit_conn conn_limit 10;
            root /var/www/static;
        }

        # ============ 安全头 ============
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    }
}
```

### 对比表

| 维度 | 正向代理 | 反向代理 | 负载均衡器 |
|------|:-------:|:--------:|:----------:|
| 代理位置 | 客户端侧 | 服务器侧 | 服务器侧 |
| 代理对象 | 用户（隐藏用户 IP）| 服务器（隐藏服务器结构）| 多个服务器 |
| 用户配置 | 需要配置代理 | 无需配置（透明）| 无需配置 |
| 目标 | 访问受限制的外部网站 | 提供统一的公网入口 | 分散请求压力 |
| 典型软件 | Squid, VPN | nginx, HAProxy, Apache | nginx, HAProxy, AWS ALB |
| SSL 终止 | 用户侧（用户 <→ 代理 <→ 服务器）| ✅ 反向代理侧 | ✅ 通常支持 |
| 缓存 | 代理缓存（用户常用资源）| ✅（源站资源）| ✅（可选）|

| nginx upstream 策略 | 说明 | 适用场景 |
|-------------------|------|---------|
| 轮询 | 默认均匀分配 | 服务器性能相同 |
| 加权轮询 | weight 参数 | 服务器性能不同 |
| IP Hash | 同 IP 同 server | 需要 Session 保持 |
| 最少连接 | 连接最少优先 | 长连接/长处理时间 |
| URL Hash | 同 URL 同 server | 缓存友好 |
| 一致性哈希 | 最小影响范围 | 大规模缓存 |

### 常见陷阱与 最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| X-Forwarded-For 被伪造 | 恶意用户伪造 X-Forwarded-For 头绕过 IP 限流 | 在第一跳 nginx 设置真实 IP，后面的代理不要相信 XFF |
| proxy_buffering 阻塞 | nginx 默认缓冲响应体，导致 SSE/实时通信延迟 | `proxy_buffering off;` |
| upstream keepalive 不足 | 频繁建立/断开 upstream 连接 | `keepalive N` + `proxy_http_version 1.1` + `Connection ""` |
| SSL 证书链不完整 | 浏览器不信任中间 CA | 始终使用完整证书链（fullchain.pem）|
| 不设置 Host header | upstream 收到请求 Host 为空 | `proxy_set_header Host $host;` |
| HTTP/2 不兼容 | nginx HTTP/2 模块不存在或编译时未启用 | 检查 `nginx -V | grep http_v2_module` |

### 面试追问 + 参考答案要点

**Q1：nginx 和 CDN 的关系是什么？CDN 是反向代理吗？**
> CDN 的边缘节点本质上是**分布式反向代理集群**。每个 CDN PoP 就是一台（或一组）nginx/HAProxy 做反向代理：用户请求 → CDN 边缘节点（反向代理）→ 缓存命中返回，miss 则回源（另一个反向代理指向源站）。但 CDN 比普通反向代理多了：1. 全球分布（Anycast 路由）。2. 缓存智能（自动压缩、自动格式转换）。3. DDoS 防护。4. 边缘计算。简单理解：CDN = 全球分布式反向代理 + 高级缓存 + 安全防护。

**Q2：nginx 为什么能比 Apache 高性能？**
> 1. **事件驱动架构**：nginx 使用 epoll（Linux）/ kqueue（BSD）事件驱动模型，每个 worker 可以处理数千个并发连接（Apache 每个连接一个进程/线程，消耗大量内存）。2. **异步非阻塞**：请求处理是事件驱动的，worker 在等待 I/O（磁盘/网络）时让出 CPU 处理其他请求。3. **模块化**：nginx 核心极小，功能通过模块（http、stream、mail 等）扩展，编译时可选。4. **内存分配**：nginx 的内存池管理减少内存碎片，提高分配效率。

**Q3：nginx upstream 故障时如何实现自动故障转移？**
> 两种方式：1. **nginx 自带故障转移**：通过 `max_fails` + `fail_timeout`，当某个 upstream 连续失败 N 次后，nginx 在 fail_timeout 时间内不再向其发请求，到期后重新尝试。如果该 upstream 恢复正常，继续使用。2. **第三方模块（nginx_upstream_check_module）**：淘宝开源的主动健康检查模块，定期向 upstream 发送 HTTP 请求，主动探测健康状态，不依赖真实请求来判断。生产环境推荐：使用 Kubernetes Service（自带健康检查 + 自动摘除）+ Ingress Controller（nginx-ingress）。

### 参考来源 URL

- nginx Documentation: https://nginx.org/en/docs/
- nginx Admin Guide: https://docs.nginx.com/nginx/admin-guide/
- nginx Performance Tuning: https://www.nginx.com/blog/tuning-nginx/
- HAProxy vs nginx: https://www.nginx.com/blog/nginx-plus-vs-software-load-balancers/

---

> ## 面试速查卡（Chapter 6）

```
┌────────────────────────────────────────────────────────────────┐
│                    Chapter 6 速查要点                          │
├────────────────────────────────────────────────────────────────┤
│ HTTP 各版本   │ HTTP/1.1 队头阻塞 → HTTP/2 多路复用 → HTTP/3 QUIC │
│ HTTP 无状态    │ Cookie/Session/Token 在应用层实现              │
│ QUIC          │ UDP + 用户态可靠传输 = 低延迟 + 无 TCP 队头阻塞  │
│ TCP vs UDP    │ TCP 可靠有序，UDP 快但不可靠，QUIC 兼两者优点    │
│ 拥塞控制      │ 慢启动 → 拥塞避免 → 快速重传 → 快速恢复         │
│ SYN Flood     │ 半开连接耗尽资源，SYN Cookies 不用 TCB        │
│ 三次握手      │ 同步 ISN + 防止历史连接                         │
│ 四次挥手      │ 全双工两个方向单独关闭 + TIME_WAIT 2MSL         │
│ TLS 1.2 vs 1.3│ 1.3: 1-RTT / 0-RTT，移除 RSA，PFS 默认          │
│ CA 证书链     │ 根 CA → 中间 CA → 站点证书，逐级签名验证         │
│ DNS           │ UDP 53 查询（快），TCP（大响应/区域传输）       │
│ DNS 污染防御  │ DNSSEC（签名）+ DoH/DoT（加密）                │
│ CDN           │ 就近访问 + 缓存 + 协议优化 + DDoS 防护         │
│ WebSocket     │ HTTP Upgrade → 全双工 TCP 帧交换                 │
│ SSE           │ HTTP 单向服务端推送，EventSource + Last-Event-ID │
│ REST vs GraphQL│ REST: 多端点固定返回，GraphQL: 单端点精确获取   │
│ 状态码        │ 2xx 成功 3xx 重定向 4xx 客户端错 5xx 服务端错   │
│ 重定向        │ 永久: 308(推荐)/301，临时: 307(推荐)/302，POST:303│
│ 幂等性        │ GET/PUT/DELETE 幂等，POST/PATCH 非幂等           │
│ OAuth2        │ Auth Code + PKCE 最安全，JWT 无状态但难撤销       │
│ CORS          │ 简单请求直接发，复杂请求先预检（OPTIONS）         │
│ nginx         │ 反向代理隐藏源站 + 负载均衡 + 静态资源服务        │
└────────────────────────────────────────────────────────────────┘
```

---

## 参考来源总汇

1. RFC 9110 (HTTP Semantics): https://www.rfc-editor.org/rfc/rfc9110
2. RFC 9113 (HTTP/2): https://www.rfc-editor.org/rfc/rfc9113
3. RFC 9114 (HTTP/3): https://www.rfc-editor.org/rfc/rfc9114
4. RFC 9000 (QUIC): https://www.rfc-editor.org/rfc/rfc9000
5. RFC 8446 (TLS 1.3): https://www.rfc-editor.org/rfc/rfc8446
6. RFC 5246 (TLS 1.2): https://www.rfc-editor.org/rfc/rfc5246
7. RFC 5280 (PKI/X.509): https://www.rfc-editor.org/rfc/rfc5280
8. RFC 6797 (HSTS): https://www.rfc-editor.org/rfc/rfc6797
9. RFC 793 (TCP): https://www.rfc-editor.org/rfc/rfc793
10. RFC 5681 (TCP Congestion Control): https://www.rfc-editor.org/rfc/rfc5681
11. RFC 4987 (SYN Flood): https://www.rfc-editor.org/rfc/rfc4987
12. RFC 6455 (WebSocket): https://www.rfc-editor.org/rfc/rfc6455
13. RFC 6749 (OAuth 2.0): https://www.rfc-editor.org/rfc/rfc6749
14. RFC 7636 (PKCE): https://www.rfc-editor.org/rfc/rfc7636
15. RFC 7519 (JWT): https://www.rfc-editor.org/rfc/rfc7519
16. RFC 7231 (HTTP/1.1 Semantics): https://www.rfc-editor.org/rfc/rfc7231
17. RFC 8484 (DoH): https://www.rfc-editor.org/rfc/rfc8484
18. Fetch Standard (CORS): https://fetch.spec.whatwg.org/#http-cors-protocol
19. MDN Web Docs: https://developer.mozilla.org/
20. nginx Documentation: https://nginx.org/en/docs/
21. Cloudflare Learning Center: https://www.cloudflare.com/learning/
22. GraphQL Official: https://graphql.org/
23. WebSocket API (WhatWG): https://websockets.spec.whatwg.org/
24. HSTS Preload: https://hstspreload.org
25. Mozilla SSL Config Generator: https://ssl-config.mozilla.org/
