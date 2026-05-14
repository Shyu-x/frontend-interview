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