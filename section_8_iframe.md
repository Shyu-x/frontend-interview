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

---

> 📚 参考：
> - https://blog.csdn.net/weixin_42845571/article/details/118335177
> - https://blog.csdn.net/m0_51429350/article/details/147372919
> - https://www.cnblogs.com/excellent-vb/archive/2004/01/13/15860501.html
> - https://www.cnblogs.com/acttan/p/16498360.html