---
title: 跨 Tab 通信
description: BroadcastChannel、SharedWorker、postMessage、storage 事件等方案对比。
---

# 跨 Tab 通信

## 1. 跨 Tab 通信

### 1.1 定义/背景

同源策略限制了不同 Tab/窗口之间的 JS 访问，但现代 Web 应用（多 Tab 管理面板、实时协作编辑器）需要跨 Tab 通信。浏览器提供了 BroadcastChannel、postMessage、SharedWorker、localStorage 监听等多种方案，各有适用场景。

### 1.2 通信方式全景对比

```
Tab A                                           Tab B
  │                                               │
  │── BroadcastChannel (同源，推荐) ────────────>│  支持频道订阅，简单易用
  │── localStorage + storage 事件 ─────────────>│  仅跨 Tab 通知，需轮询
  │── SharedWorker ─────────────────────────────>│  共享状态，适合复杂场景
  │── postMessage (需引用对方 window) ─────────>│  iframe/新窗口通信
```

### 1.3 BroadcastChannel（现代，推荐）

```typescript
// Tab A: 发送消息
const channel = new BroadcastChannel('app-channel');

// 发送消息
channel.postMessage({ type: 'USER_LOGIN', payload: { userId: 42, name: 'Alice' } });

// Tab B: 接收消息
const channel = new BroadcastChannel('app-channel');
channel.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;
  if (type === 'USER_LOGIN') {
    console.log('用户已登录:', payload.name);
  }
};

// 关闭频道
channel.close();

// 跨 Tab 状态同步示例
class TabSync {
  private channel: BroadcastChannel;
  private storageKey: string;
  private onUpdate: (data: unknown) => void;

  constructor(channelName: string, storageKey: string, onUpdate: (data: unknown) => void) {
    this.channel = new BroadcastChannel(channelName);
    this.storageKey = storageKey;
    this.onUpdate = onUpdate;

    this.channel.onmessage = (e) => {
      if (e.data.key === storageKey) {
        onUpdate(JSON.parse(e.data.value));
      }
    };
  }

  update(data: unknown): void {
    const value = JSON.stringify(data);
    localStorage.setItem(this.storageKey, value);
    this.channel.postMessage({ key: this.storageKey, value });
  }
}
```

### 1.4 SharedWorker（共享状态，适合复杂场景）

```javascript
// shared-worker.js — 独立 JS 文件
const connections = new Map(); // port -> 客户端信息
let sharedState = { theme: 'light', user: null };

self.onconnect = (e) => {
  const port = e.ports[0];
  const clientId = Date.now() + Math.random();
  connections.set(clientId, port);

  // 发送当前共享状态给新连接的 Tab
  port.postMessage({ type: 'SYNC_STATE', state: sharedState });

  port.onmessage = (event) => {
    const { type, payload } = event.data;

    if (type === 'UPDATE_STATE') {
      // 更新共享状态，并广播给所有其他 Tab
      sharedState = { ...sharedState, ...payload };
      connections.forEach((p, id) => {
        if (id !== clientId) {
          p.postMessage({ type: 'STATE_UPDATED', state: sharedState });
        }
      });
    }
  };

  port.start();
};

// 主线程使用 SharedWorker
const worker = new SharedWorker('/shared-worker.js');
worker.port.onmessage = (e) => {
  const { type, state } = e.data;
  if (type === 'SYNC_STATE' || type === 'STATE_UPDATED') {
    console.log('状态同步:', state);
    // 更新当前 Tab 的 UI
  }
};
worker.port.start();
```

### 1.5 postMessage（iframe / 新窗口通信）

```javascript
// 方式1: 向 iframe 发送消息
const iframe = document.querySelector('iframe');
iframe.contentWindow.postMessage(
  { type: 'CONFIG_UPDATE', config: { apiUrl: 'https://api.example.com' } },
  'https://trusted.example.com'  // 目标源，安全限制
);

// 接收消息
window.addEventListener('message', (event) => {
  // 验证来源，防止钓鱼
  if (event.origin !== 'https://trusted.example.com') {
    console.warn('忽略来自未知源的消息:', event.origin);
    return;
  }
  console.log('收到消息:', event.data);
});

// 方式2: 向新窗口发送消息
const popup = window.open('/popup.html', 'Popup', 'width=400,height=300');
popup?.postMessage('AUTH_SUCCESS', 'https://example.com');

// 方式3: 使用 MessageChannel 建立双向通道
const channel = new MessageChannel();
// 为iframe端创建port
iframe.contentWindow.postMessage('init', '*', [channel.port2]);
// 主窗口监听port消息
channel.port1.onmessage = (e) => console.log('iframe说:', e.data);
channel.port1.postMessage('你好 iframe');
```

### 1.6 localStorage + storage 事件

```javascript
// Tab A: 写入
localStorage.setItem('auth_token', 'abc123');
localStorage.setItem('app_state', JSON.stringify({ sidebar: 'open' }));

// Tab B/C/D: 监听 storage 变化
window.addEventListener('storage', (event) => {
  console.log({
    key: event.key,           // 变化的键
    oldValue: event.oldValue, // 旧值（其他 Tab 删掉则为 null）
    newValue: event.newValue, // 新值（其他 Tab 删掉则为 null）
    url: event.url,           // 触发变化的文档 URL
    storageArea: event.storageArea, // localStorage 或 sessionStorage
  });
});

// 轮询方案（storage 事件不触发自身 Tab）
let lastValue = localStorage.getItem('data');
setInterval(() => {
  const current = localStorage.getItem('data');
  if (current !== lastValue) {
    console.log('本地值被外部 Tab 改变:', current);
    lastValue = current;
  }
}, 1000);
```

### 1.7 四种方案对比

| 方案 | 同源限制 | 跨域 | 数据量 | 实时性 | 适用场景 |
|------|---------|------|--------|--------|---------|
| BroadcastChannel | 是 | 否 | 任意大小 | 立即 | 同源多 Tab 状态同步（推荐） |
| localStorage + storage | 是 | 否 | ~5MB | 延迟（事件触发） | 配置同步、登录状态广播 |
| SharedWorker | 是 | 否 | 共享内存 | 立即 | 需要共享状态、多 Tab 共享连接 |
| postMessage | 否 | 可指定 | 任意大小 | 立即 | iframe 通信、跨域通信 |
| MessageChannel | 端口端绑定 | 否 | 任意大小 | 立即 | Worker 通信、双向通道 |

### 1.8 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| BroadcastChannel 同源限制 | 不同子域名的 Tab 无法通信 | 使用 postMessage + 同一父域名代理，或 postMessage + BroadcastChannel 组合 |
| storage 事件不触发自身 | 自身 Tab 修改 localStorage 不触发 storage 事件 | 用额外的 BroadcastChannel 或轮询 |
| SharedWorker 内存泄漏 | 忘记 `port.start()` 或未移除连接 | 确保在 `beforeunload` 中清理连接 |
| postMessage 安全漏洞 | 未验证 `event.origin` | 始终检查 `event.origin === 期望的源` |
| 序列化开销 | 跨 Tab 传递大对象，深拷贝开销大 | 使用 SharedArrayBuffer 或 MessageChannel transfer |

### 1.9 面试追问

**Q1: BroadcastChannel 和 postMessage 的核心区别是什么？**

BroadcastChannel 是"频道订阅"模式，同频道的所有 Tab 互为广播，无需持有对方引用，适合状态同步。postMessage 是"定向投递"模式，必须持有 `window`/iframe 的引用，适合 iframe 或 `window.open()` 场景。BroadcastChannel 更简洁，postMessage 更通用。

**Q2: SharedWorker 和 Web Worker 的区别是什么？**

Web Worker 是一个独立的线程，运行独立 JS 文件，不阻塞主线程，但没有共享状态。SharedWorker 是可以被多个 Tab/页面共享的 Worker，所有连接共享同一个 JS 实例和内存状态，适合跨 Tab 共享长连接（如 WebSocket）或共享状态。SharedWorker 兼容性比 Web Worker 稍差。

**Q3: localStorage 和 sessionStorage 的区别是什么？**

`localStorage`：永久存储，同源共享，跨 Tab 有效，除非手动清除或浏览器清除。`sessionStorage`：仅当前标签页有效，关闭标签页即清除，不跨 Tab 共享。两者都只存储字符串，都是同步 API（会阻塞主线程）。对于需要跨 Tab 实时同步的场景，用 `localStorage + storage` 事件。

## 2. 跨 Tab 通信（速记版）

**通信方式对比：**

| 方式 | 说明 |
|------|------|
| BroadcastChannel | 现代推荐，同源跨 Tab 通信 |
| localStorage + storage 事件 | 监听 storage 事件实现跨 Tab 通信 |
| SharedWorker | 在 Worker 中管理连接状态 |
| postMessage | 需要引用对方 window 对象 |

### 2.1 BroadcastChannel（现代，推荐）

```javascript
// Tab A
const channel = new BroadcastChannel('my-channel');
channel.postMessage({ type: 'UPDATE', data: { user: 'Alice' } });

// Tab B
const channel = new BroadcastChannel('my-channel');
channel.onmessage = (e) => console.log('Received:', e.data);
```

### 2.2 SharedWorker

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

### 2.3 localStorage + storage 事件

```javascript
// Tab A 写入，Tab B 监听变化
localStorage.setItem('syncData', JSON.stringify({ counter: 42 }));

// Tab B 监听
window.addEventListener('storage', (e) => {
  console.log(e.key, e.oldValue, e.newValue);
});
```

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格，用户开 4 到 6 个 Tab 对照数据 | 同源策略下的窗口隔离、BroadcastChannel | BroadcastChannel 加防抖 | 只广播筛选条件，不广播行数据 |
| 多人协作白板，本机开 2 到 4 个 Tab 预览同一画布 | 同源窗口互发消息、主从选举 | Web Locks 加 BroadcastChannel | 同一时刻只允许一个 Tab 持有 WebSocket |
| 低端安卓的首屏加载，用户连开多个 Tab 打开首页 | 同源标签页的重复请求 | Service Worker 缓存加 BroadcastChannel | 先判断缓存命中，再决定是否广播 |
| 后台系统用户点击退出登录 | 跨 Tab 状态同步 | BroadcastChannel 或 storage 事件 | 目标浏览器不支持时要留兜底路径 |
| 订单页防止多 Tab 重复提交 | 同源 Tab 之间的互斥 | Web Locks 加 BroadcastChannel | 锁只管同机同源，服务端仍需幂等 |
| 主题色与语言的切换 | 跨 Tab 偏好同步 | storage 事件加 localStorage | storage 事件不会在写入的那个 Tab 触发 |
| 大屏看板在后台 Tab 里定时刷新 | 页面可见性与调度降频 | Page Visibility API 加定时器 | 切回前台要立即补一次拉取 |
| 离线优先的笔记应用 | 跨 Tab 数据一致性 | IndexedDB 加 BroadcastChannel | 写入先落本地库，再广播数据版本号 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：后台允许用户开多个 Tab 对照数据，每个 Tab 各存一份筛选条件，改一处要再改几处。表格有上万行，把筛选后的结果整体广播出去，每个 Tab 都会卡一次。

**怎么用本页知识解决**：先判断本 Tab 是否在前台，只广播筛选条件这类小状态，再用防抖把连续输入合成一条消息。

```js
const ch = new BroadcastChannel('table-sync'); // 同源所有 Tab 共用一个频道
let active = document.visibilityState === 'visible'; // 记录本 Tab 是否在前台

document.addEventListener('visibilitychange', () => { // 前后台切换时更新标记
  active = document.visibilityState === 'visible';
});

const publish = debounce((filter) => { // 合并连续输入，降低广播次数
  ch.postMessage({ type: 'filter', filter }); // 只发条件，不发行数据
}, 150);

ch.addEventListener('message', (e) => { // 接收其他 Tab 的状态
  if (e.data.type === 'filter' && !active) applyFilter(e.data.filter); // 后台 Tab 静默跟随
});

window.addEventListener('pagehide', () => ch.close()); // 关 Tab 时释放频道
```

- 频道名固定，同源的所有 Tab 自动加入，不区分账号，频道里不要传敏感数据。
- 只广播筛选条件，行数据由各 Tab 自己从缓存或接口取，避免克隆上万行对象。
- 150 毫秒是防抖起点，按输入设备调整，键盘输入与滑块拖动可以用不同阈值。
- 只在不处于前台时套用别人的筛选，避免两个前台窗口互相覆盖。
- pagehide 时关闭频道，页面被回收后不会留下悬挂的监听。

**怎么度量收益**：用 PerformanceObserver 监听 longtask，开 4 个 Tab 后重复改筛选条件 20 次，对比加广播前后的长任务条数。同时用 Network 面板数筛选接口的请求条数。

**什么时候不该用**：产品的交互设计只允许单 Tab 使用时，广播没有接收方。筛选条件已经写进 URL、刷新即可恢复时，跨 Tab 同步属于重复建设。目标浏览器不支持 BroadcastChannel 且不允许降级为 storage 事件时，这套方案落不了地。

#### 场景 2：多人协作白板

**业务背景**：白板允许同一账号在本机开多个 Tab 对照画布，每个 Tab 各建一条 WebSocket 会占满连接数。同一条绘制操作被上行多次，服务端要去重。

**怎么用本页知识解决**：用 Web Locks 选出一个主 Tab 持有连接，其余 Tab 通过 BroadcastChannel 把本地操作交给主 Tab 上行，下行消息由主 Tab 转发给本机其他 Tab。

```js
const ch = new BroadcastChannel('board'); // 本机白板 Tab 共用频道
let leader = false;

navigator.locks.request('board-ws', async () => { // 同源页面在同一把锁上互斥
  leader = true;
  const ws = await connectWS(); // 只有拿到锁的 Tab 建连接
  ws.onmessage = (ev) => ch.postMessage({ type: 'remote', op: ev.data }); // 下行广播
  await new Promise(() => {}); // 一直挂起，锁才不释放
});

ch.addEventListener('message', (e) => { // 非主 Tab 把操作交给主 Tab
  if (e.data.type === 'op' && leader) sendToServer(e.data.op); // 上行只有一条
});
```

- Web Locks 按源分配，同名锁在同一时刻只属于一个 Tab。
- 锁回调里返回一个永不 resolve 的 Promise，锁才不会被提前释放。
- 主 Tab 被关闭或崩溃，锁自动释放，其余 Tab 的 request 会依次拿到。
- 下行消息先经主 Tab 广播给本机其他 Tab，再各自渲染，本机视图保持同一份。
- 消息走结构化克隆，图片与 canvas 位图不要直接放进消息体。

**怎么度量收益**：用 DevTools 的 Network 面板筛 WS，开 1 个 Tab 与开 3 个 Tab 各记录连接数与上行帧数。用 Memory 面板对比各 Tab 的 JS 堆，确认没有随 Tab 数线性增长的缓存副本。

**什么时候不该用**：服务端已经限制同一账号只能有一个活动连接并踢掉旧连接时，前端选主没有意义。产品只支持离线单人使用时，本地锁解决不了任何问题。页面以跨源 iframe 嵌入第三方站点时，锁与频道的命名空间都不共享。

#### 场景 3：登录态与 Token 刷新

**业务背景**：SPA 用户常同时开多个 Tab，access token 过期时每个 Tab 各调一次刷新接口。服务端用一次性刷新令牌轮换时，后到的请求会失败并把用户推到登录页。

**怎么用本页知识解决**：用 Web Locks 把刷新收成一次，锁内先复检当前 token，再用 BroadcastChannel 把结果发给等待中的 Tab。

```js
const auth = new BroadcastChannel('auth'); // 登录态专用频道

async function getToken() {
  return navigator.locks.request('token', async () => { // 同一时刻只有一个 Tab 进入
    if (isFresh(readToken())) return readToken(); // 锁内复检，可能已被刷新
    const next = await refresh(); // 全站只发这一条刷新请求
    auth.postMessage({ type: 'token', token: next }); // 结果广播给其他 Tab
    return next;
  });
}

auth.addEventListener('message', (e) => { // 等待中的 Tab 立刻拿到新 token
  if (e.data.type === 'token') writeToken(e.data.token);
});
```

- 锁内先读一次 token，可能已被前一个持锁的 Tab 刷新过，复检能省掉一次网络请求。
- 刷新接口只被一个 Tab 调用，服务端的令牌轮换不会被并发请求打断。
- 广播只是加快其他 Tab 拿到结果，锁本身已经保证它们最终会拿到新值。
- 写入存储的 Tab 不会收到自己的 storage 事件，本 Tab 的状态更新要单独处理。
- 页面在后台被冻结时消息可能延后投递，恢复前台后要再读一次存储。

**怎么度量收益**：服务端统计刷新接口的每分钟请求数峰值，用同一账号开 4 个 Tab 等待 token 过期复现。前端统计因刷新失败跳到登录页的会话比例，走埋点上报。

**什么时候不该用**：各 Tab 使用互相独立的匿名会话、没有共享登录态时，互斥无从谈起。服务端已用 httpOnly Cookie 加会话续期时，前端管不到也不需要管 token。刷新令牌不轮换、重复刷新只产生多余请求时，先做服务端限流比改前端省事。

### 行业先进实践

`BroadcastChannel API（出处：MDN Web Docs）`：文档说明了频道按源隔离、消息走结构化克隆、频道不会阻止页面被回收。借鉴方式是把频道名加上业务前缀，并在 pagehide 时调用 close。

`Web Locks API（出处：MDN Web Docs 与 W3C Web Locks API 规范）`：锁按源共享，页面关闭或崩溃时自动释放。借鉴方式是用它做单实例长连接与 token 刷新互斥，锁回调里不做长耗时的同步计算。

`Page Lifecycle API 与 Page Visibility API（出处：Chrome for Developers）`：文档给出页面进入后台后被冻结与丢弃的时机。借鉴方式是用 visibilitychange 把广播降频，并让后台 Tab 退出选主。

`Workbox（出处：开源项目 GoogleChrome/workbox）`：把 precache、runtime caching 与后台同步封装成可配置模块，Service Worker 的多 Tab 共享缓存由它接管。需核对官方文档：目标浏览器对 Background Sync 的支持范围。

`同源窗口消息的来源校验（出处：MDN Web Docs 的 Window.postMessage 页面与 OWASP HTML5 Security Cheat Sheet）`：接收方要先校验 event.origin 与 event.source，再决定是否处理数据。借鉴方式是给所有跨窗口消息加一层来源白名单再解析。

### 从学到用：落地路线

1. 在访问量靠前、且用户明确会开多个 Tab 的模块试点。验收标准：能写清这个模块当前靠什么方式同步状态。
2. 用可复现的实验验证收益。验收标准：开 1 个 Tab 与开 4 个 Tab 的请求数、长任务数各有一组对照数据。
3. 把 publish、subscribe、close 封装成工具函数并推广到同域其他模块。验收标准：接入模块共用一套频道命名与关闭逻辑。
4. 加自动化检查防回退。验收标准：巡检脚本能发现未在 pagehide 关闭的频道，并输出对应文件。

### 动手作业

**目标**：做一个跨 Tab 同步的待办清单，多 Tab 打开时状态一致，且同一时刻只有一个 Tab 负责向远端上报。

**步骤**：

1. 建一个静态页面，清单数据存 localStorage，先跑通单 Tab 的增删改查。
2. 接入 BroadcastChannel，把增删改事件广播出去，开第二个 Tab 验证实时同步。
3. 为不支持 BroadcastChannel 的环境加 storage 事件兜底，两条路径用同一个消息格式。
4. 用 Web Locks 选出一个主 Tab，每 10 秒向一个本地 mock 接口上报一次全量清单。
5. 关掉主 Tab，在剩余 Tab 上确认上报任务被接管，DevTools 里能看到新的请求。
6. 用 PerformanceObserver 记录每次操作的长任务，确认广播引入的延迟在可接受范围。
7. 写一页 README，列清频道名、消息字段、关闭时机与兜底路径。

**验收标准**：

- 开 3 个 Tab 时，任一 Tab 新增条目，其余两个在 1 秒内出现同一条目。
- mock 接口在同一时刻只收到一条上报请求，关掉主 Tab 后 15 秒内由其他 Tab 接手。
- 关闭任一 Tab 后，其余 Tab 的 DevTools 里看不到该 Tab 残留的监听输出。
- 屏蔽 BroadcastChannel 后，storage 事件兜底路径仍能让 3 个 Tab 保持一致。
- README 里的频道名与代码中的常量逐字一致。

