---
title: iframe 安全、通信与性能
description: iframe 的 sandbox 与 allow 安全策略、postMessage 通信、加载时机、性能与 srcdoc。
---

# iframe 安全、通信与性能

## 1. iframe 基础回顾

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

## 2. 安全问题详解

### 2.1 sandbox 属性 — 沙箱隔离

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
<!-- 正确：最安全：只允许内容和样式展示，关闭所有脚本和表单 -->
<iframe sandbox src="embed-content.html"></iframe>

<!-- 谨慎：如果 iframe 内需要同源能力 -->
<!-- 注意：allow-same-origin 配合 allow-scripts 会让 iframe 获得完全权限 -->
<iframe sandbox="allow-scripts allow-same-origin"
         src="sandbox-app.html"></iframe>
```

**最佳实践**：始终包含 `sandbox` 属性，从最严格开始，按需逐步添加权限。

### 2.2 allow 属性 — 功能策略（Permissions Policy）

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

## 3. postMessage API — 跨窗口安全通信

`window.postMessage()` 是唯一安全的跨域通信方式，它绕过了同源策略（SOP）的限制。

### 3.1 基础 API

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

### 3.2 父页面 → iframe 通信

```typescript
// 父页面
const iframe = document.getElementById('child-frame') as HTMLIFrameElement;

// 等待 iframe 加载完成（onload 后才能安全发送消息）
iframe.onload = () => {
  iframe.contentWindow?.postMessage(
    { type: 'AUTH_TOKEN', token: 'eyJhbGci...' },
    'https://trusted-subdomain.example.com'  // 正确：精确指定目标源
  );
};

// 错误：targetOrigin 设为 '*' 在生产环境是安全风险
// iframe.contentWindow?.postMessage(data, '*');
```

```typescript
// iframe 内部：验证 origin 并处理消息
window.addEventListener('message', (event: MessageEvent) => {
  // 正确：第一步：验证来源（绝对必要！）
  const ALLOWED_ORIGINS = [
    'https://parent.example.com',
    'https://staging.example.com',
  ];

  if (!ALLOWED_ORIGINS.includes(event.origin)) {
    console.warn(`Rejected message from unauthorized origin: ${event.origin}`);
    return; // 不处理不信任来源的消息
  }

  // 正确：第二步：处理消息
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

### 3.3 iframe → 父页面通信

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

### 3.4 Origin 验证的完整模式

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

## 4. iframe 加载时机问题

### 4.1 onload vs load 事件

```html
<!-- 两种监听方式：HTML 属性（不推荐） -->
<iframe src="page.html" onload="iframeLoaded()"></iframe>

<!-- JS 属性绑定（推荐） -->
<iframe id="myframe" src="page.html"></iframe>
```

```typescript
// 错误：在未加载完成时发送消息
const iframe = document.getElementById('myframe') as HTMLIFrameElement;
iframe.contentWindow?.postMessage(data, origin); // iframe 未就绪，消息可能丢失

// 正确：等待 onload 后再通信
const iframe = document.getElementById('myframe') as HTMLIFrameElement;
iframe.addEventListener('load', () => {
  iframe.contentWindow?.postMessage({ type: 'INIT' }, origin);
});
```

### 4.2 onload 触发时机说明

```
iframe.onload 触发条件：
  正确：iframe 的完整页面（包括所有子资源：CSS/JS/图片）加载完毕
  正确：同源：window.onload 相同
  跨域：无法访问 document，但 onload 仍会触发
  错误：如果 src 指向一个长时间加载的资源，onload 也会等待
  错误：如果 iframe 内 JS 执行 endless loop，onload 永不触发
```

### 4.3 更精细的加载状态检测

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

## 5. 内存与性能问题

### 5.1 iframe 内存开销

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

// 注意事项：
// - 移除 iframe 前设置 src 为空白页，防止内存泄漏
// - 复杂的 SPA iframe 可能需要显式调用 cleanup 函数
```

### 5.2 性能优化策略

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

### 5.3 iframe 与 Core Web Vitals

| 指标 | iframe 影响 | 缓解方法 |
|------|----------|---------|
| LCP | iframe 内图片可能成为 LCP 元素 | 预加载 iframe 内容，或用 `loading="eager"` |
| FID/INP | 重的 iframe JS 影响主线程 | 使用 `sandbox="allow-scripts"` 隔离，不共享主线程（其实还是共享） |
| CLS | iframe 无高度时页面跳动 | 始终设定 `width`/`height` 或 `aspect-ratio` |

---

## 6. srcdoc 属性

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

### 6.1 使用场景

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

### 6.2 srcdoc vs src 对比

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

## 7. React + TypeScript 中使用 iframe

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

## 8. 面试追问

### 8.1 Q1：iframe 的 sandbox 属性中 `allow-same-origin` 有什么风险？

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

### 8.2 Q2：postMessage 的 origin 参数设为 `*` 有什么问题？

**答**：

**`targetOrigin: '*'` 的问题**：

```typescript
// 错误：不安全：消息会发送给任何窗口
iframe.contentWindow?.postMessage(data, '*');

// 攻击场景：
// 1. 页面被嵌入到恶意第三方网站
// 2. 恶意网站劫持消息（即使无法读懂内容，可能触发副作用）
// 3. 消息内容可能是认证 token，被中间人拿走
```

**正确做法**：

```typescript
// 正确：安全：精确指定目标 origin
iframe.contentWindow?.postMessage(data, 'https://trusted-app.example.com');

// 正确：备选：检查消息后发送（动态 origin）
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
  // 正确：必须在处理任何数据前验证 origin
  if (event.origin !== 'https://parent.example.com') return;

  // 安全处理 event.data
});
```

---

### 8.3 Q3：iframe 对页面性能的影响，如何优化？

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

### 8.4 Q4：如何检测 iframe 是否加载成功或加载失败？

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

## 9. 总结表：iframe 安全属性

| 属性 | 作用 | 推荐值 |
|------|------|--------|
| `sandbox` | 沙箱隔离 | 从空开始，逐步加权限 |
| `allow` | 功能策略 | 按需精确列出 |
| `referrerpolicy` | 请求来源头 | `no-referrer` / `same-origin` |
| `csp` | iframe 内 CSP | `frame-src 'self'` |
| `loading` | 懒加载 | `lazy`（非关键）或 `eager`（关键） |

> 参考：
>
> - https://blog.csdn.net/weixin_42845571/article/details/118335177
> - https://blog.csdn.net/m0_51429350/article/details/147372919
> - https://www.cnblogs.com/excellent-vb/archive/2004/01/13/15860501.html
> - https://www.cnblogs.com/acttan/p/16498360.html

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [`<iframe>` HTML inline frame element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) | iframe 属性与 sandbox、allow、loading 的权威定义，安全问题详解的底稿。 | 重点读 sandbox、allow、loading、referrerpolicy 四节，对照自己代码给每个 iframe 逐条收紧权限。 |
| [IFrame credentialless](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/IFrame_credentialless) | credentialless 是跨源 iframe 隔离与 COEP 场景下的新方案。 | 读概念与用例部分，想清何时用它替代 sandbox，再在跨源 iframe 上试一次。 |
| [The structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) | postMessage 传参走结构化克隆，弄懂它才知道哪些对象能传、哪些报错。 | 读支持类型清单与不可克隆类型，遇到 DataCloneError 时回来逐条核对。 |
| [Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) | ArrayBuffer 等可 transfer 零拷贝交接，是大数据跨窗口传输的性能关键。 | 读可转移对象清单与 detached 后的行为，把大数组改成 transfer 传一次并测耗时。 |
| [React API 参考](https://react.dev/reference/react) | React 里集成 iframe 常踩 Effect 与 ref 的坑，Caveats 讲得最清楚。 | 写 iframe 的 useEffect 与 ref 时对照 Caveats 查依赖与清理，Troubleshooting 按症状查。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Comlink](https://github.com/GoogleChromeLabs/comlink) | 用 Comlink 改写 postMessage 样板，能看清消息协议与 RPC 封装的分层。 | 读源码里 wrap 与 Proxy 的实现，带着“样板为何冗长”的问题读，再改造自己的通信层。 |
| [TypeScript Playground](https://www.typescriptlang.org/play) | postMessage 的消息类型、iframe ref 类型可在 Playground 里快速试错。 | 把消息联合类型与事件处理器类型贴进去看推导结果，确认无误再拷回项目。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 使用 Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) | 把重计算移出主线程，是 iframe 之外最直接的性能缓解手段。 | 按教程把一段耗时计算搬进 Worker，用 Performance 面板确认主线程不再出现长任务。 |
| [MDN Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) | iframe 懒加载常靠 IntersectionObserver 实现，比 scroll 事件更省。 | 读回调与 rootMargin 部分，把页面里的 iframe 改成进入视口后再设 src。 |
| [PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) | iframe 会拖慢 LCP，用 PerformanceObserver 订阅才能量化影响。 | 按示例订阅 largest-contentful-paint，对比有无 iframe 时的指标数值变化。 |
| [MDN Performance API](https://developer.mozilla.org/zh-CN/docs/Web/API/Performance_API) | navigation 与 resource 计时能拆出 iframe 的加载耗时与阻塞点。 | 写脚本读取 resource 条目中 iframe 的 duration，找出最慢的子框架并定位原因。 |
| [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/) | React + TS 中 iframe 的 ref、onLoad 事件类型写法可直接套用。 | 查 refs 与 events 两节，给 iframe 的 ref 与 onLoad 标注正确类型后编译验证。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 门户页并排嵌入订单、库存、报表三个子系统 | postMessage、安全问题详解 | 同源路径 iframe + 自定义消息协议 | 每个子系统要能独立刷新；父子之间只传必要字段，别传整份用户对象 |
| 在线编辑器右侧的 HTML/CSS 实时预览 | srcdoc、sandbox | srcdoc + `sandbox="allow-scripts"` | 不要同时给 `allow-same-origin`，否则预览脚本能读到父页存储 |
| 低端安卓首屏里的第三方客服与统计组件 | iframe 加载时机、内存与性能 | 动态插入 iframe + `loading="lazy"` | 懒加载只推迟请求发起时间，总流量不变；移除 iframe 才能释放子文档内存 |
| 收银台被商户页面嵌入 | 安全问题、frame-ancestors | CSP `frame-ancestors` 响应头 | 要覆盖多级子域；已上线的旧商户要分批灰度 |
| 后台管理页嵌入第三方 BI 报表 | iframe 加载时机、postMessage | iframe + 子页上报高度的消息 | 跨域时父页读不到子页文档高度，必须由子页主动上报 |
| 广告位嵌入第三方素材 | sandbox、内存与性能 | `sandbox="allow-scripts"` + 固定尺寸容器 | 每个广告占一条网络连接与一份子文档内存，数量要设上限 |
| 旧系统整合：新框架页面嵌入旧 JSP 页面 | postMessage、加载时机 | iframe + 路由同步消息 | 滚动位置与浏览器前进后退要显式同步，否则两套历史记录会打架 |
| 内嵌 PDF 或 Office 文档预览 | srcdoc 与 src 的区别、安全问题 | iframe `src` 指向预览服务 | srcdoc 适合内联草稿；二进制内容用 src，并确认预览服务允许被嵌入 |
| 第三方登录的返回页 | 安全问题、frame-ancestors | 优先整页跳转或弹窗 | 若用 iframe，需要对方允许被嵌入，多数登录方不允许 |

### 三个场景拆解

#### 场景 1：门户页嵌入三个业务子系统并同步登录态

**业务背景**：门户页由前端团队维护，订单、库存、报表三个子系统由不同团队维护，技术栈分别是 Vue、React、jQuery。直接合并代码的排期以季度计，改成 iframe 只需要各子系统暴露一个入口 URL。

**怎么用本页知识解决**：先让子页在脚本执行完成后发一条 READY 消息，父页收到再下发凭证，避免消息早于监听器注册而丢失。父页同时校验 `event.origin` 和 `event.source`，回发时把 `targetOrigin` 写成子页的具体源。

```ts
// 父页：等子应用就绪后再下发登录态
const child = document.querySelector<HTMLIFrameElement>('#app-order');

window.addEventListener('message', (e) => {
  // 只接受约定子域的来源，其他来源直接丢弃
  if (e.origin !== 'https://order.example.com') return;
  // 确认消息来自这个 iframe 的窗口，防止同源的其他窗口伪造
  if (e.source !== child?.contentWindow) return;

  if (e.data?.type === 'READY') {
    child.contentWindow?.postMessage(
      { type: 'AUTH', token },        // 只传令牌，不传整份用户对象
      'https://order.example.com'     // 目标源写具体值，不用 '*'
    );
  }
});
```

- 子页发 READY 而不是父页直接下发，解决的是 iframe 加载时机与父页脚本执行顺序不一致的问题。
- `e.source` 校验挡住的是同源页面冒用消息的情况，只校验 origin 不足以区分同一子域下的多个 iframe。
- `targetOrigin` 写死具体源，避免令牌被发到子页被重定向后的第三方地址。
- 父页不监听子页的输入事件，只接收显式的业务消息，消息类型用联合类型在 TypeScript 里收窄。
- 子页需要向父页请求刷新时，发消息而不是调用父页函数，跨域下没有别的通路。

**怎么度量收益**：登录态同步成功率用父子两侧的埋点计数比对；消息往返耗时在发出 AUTH 与收到 ACK 两处各打一次 `performance.now()`。跨域报错条数看 Chrome DevTools Console 里按 origin 过滤的结果。主线程阻塞用 `PerformanceObserver` 订阅 `longtask` 条目观察。

**什么时候不该用**：子系统需要与父页共享同一份表单状态或路由参数，消息序列化会带来持续的同步成本，此时直接做组件级集成。子页需要每个滚动帧读写父页 DOM 时也不适合，跨文档访问的延迟与权限限制会让交互卡顿。

#### 场景 2：在线编辑器右侧的实时预览

**业务背景**：编辑器让用户输入 HTML 与样式，右侧实时渲染结果。用户代码可能带死循环脚本或大量 DOM 操作，直接写进父页会让整页失去响应。预览还需要在用户每次输入后重建，重建次数与输入频率同级。

**怎么用本页知识解决**：把用户代码放进一个独立文档，用 srcdoc 写入，用 sandbox 剥掉同源能力。只给 `allow-scripts`，不给 `allow-same-origin`，预览脚本就运行在不透明源里，读不到父页的 cookie 与 localStorage。

```html
<!-- 预览容器：只允许执行脚本，不开放同源能力 -->
<iframe id="preview" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>

<script>
  const frame = document.querySelector('#preview');
  const input = document.querySelector('#editor');

  input.addEventListener('input', () => {
    // srcdoc 把用户代码变成独立文档，不发起外部导航
    frame.srcdoc = '<!doctype html><meta charset="utf-8">' + input.value;
  });
</script>
```

- sandbox 与 allow-same-origin 不同时给，是这一段代码里唯一不能省的安全约束。
- `srcdoc` 的值不请求网络地址，省掉一次导航，但文档仍然按 iframe 的方式独立解析与销毁。
- 重建预览等于替换一份子文档，旧文档的 DOM 会被回收，这是它能承受高频重建的原因。
- `referrerpolicy="no-referrer"` 防止预览里的外部请求带上父页地址。
- 如果预览需要 `alert`、全屏或表单提交，要在 sandbox 里显式追加对应能力，而不是放开同源。

**怎么度量收益**：从赋值 srcdoc 到 iframe 触发 `load` 事件之间的时长，用 `performance.now()` 打点。输入过程中的主线程长任务条数看 Chrome DevTools Performance 面板录制的 long task 轨道。反复重建 50 次后，取 DevTools Memory 面板的堆快照，检查 Detached 节点数量是否随重建次数持续增长。

**什么时候不该用**：预览内容需要复用父页打开的 IndexedDB 草稿时，不透明源拿不到同一份存储。用户可信且代码来自内部模板库（例如运营配置的固定模板）时，为预览额外维护文档重建流程会增加输入延迟，直接在父页渲染更省事。

#### 场景 3：低端安卓首屏里的第三方客服组件

**业务背景**：落地页首屏面积小，客服与统计组件挂在右下角，用户多数在首屏就完成操作。第三方脚本下载与执行会占用主线程，影响首屏的关键渲染。目标是让这些组件在首屏任务完成之后再开始加载。

**怎么用本页知识解决**：不把 iframe 写进 HTML，而是等到浏览器空闲或用户接近组件位置时再用脚本插入。插入前把 `loading="lazy"` 和 sandbox 属性一并设好，插入后再 append，浏览器按懒加载规则推迟请求。

```ts
function mountSupport() {
  // 已经插入过就不再插入，避免重复创建子文档
  if (document.querySelector('#support')) return;

  const f = document.createElement('iframe');
  f.id = 'support';
  f.src = 'https://support.example.com/widget';
  f.loading = 'lazy';                                   // 交给浏览器推迟加载
  f.setAttribute('sandbox', 'allow-scripts allow-forms'); // 按组件实际需要开放
  f.style.width = '320px';
  f.style.height = '420px';

  // 属性在插入前设好，插入后才生效
  document.querySelector('#support-slot')?.appendChild(f);
}

// 空闲时段插入；不支持 requestIdleCallback 时退回延时插入
if ('requestIdleCallback' in window) requestIdleCallback(mountSupport);
else setTimeout(mountSupport, 3000);
```

- 属性在 appendChild 之前设置，是让懒加载与沙箱规则在文档开始加载时就生效。
- 用 `requestIdleCallback` 让插入发生在浏览器空闲时段，避免与首屏渲染争主线程。
- 组件容器预留固定宽高，插入时不触发父页重排，减少布局抖动。
- 移除 iframe 元素才能让子文档整体释放，仅隐藏元素不会释放内存。
- 第三方组件被沙箱限制后可能报错，需要先在测试环境确认它只依赖脚本与表单提交。

**怎么度量收益**：首屏指标看 Lighthouse 报告的 LCP 与 TBT，字段数据用 web-vitals 上报 LCP 与 INP。请求发起时间点看 Chrome DevTools Network 面板中第三方域名的时间轴位置，与父页首屏资源对比。主线程占用看 Performance 面板的 Main 轨道。

**什么时候不该用**：客服会话本身就是页面核心功能（例如独立的在线咨询页），推迟加载会让用户找不到入口。第三方组件声明了 `frame-ancestors` 限制、或依赖全屏与顶层导航时，嵌入会失败，只能走跳转或官方挂件方案。

### 行业先进实践

沙箱能力按需开放，且不与 allow-same-origin 同时给（出处：MDN Web Docs 之 iframe 元素的 sandbox 属性说明）。该文档解释了：当 sandbox 同时包含 allow-scripts 与 allow-same-origin 时，嵌入内容可以移除沙箱限制。这条约束直接决定预览类功能的写法。借鉴方式：在代码评审清单里加一条，任何带 allow-scripts 的 sandbox 属性都要说明是否同时给了 allow-same-origin。

用 CSP 的 frame-ancestors 替代 X-Frame-Options 防点击劫持（出处：MDN Web Docs 之 Content-Security-Policy: frame-ancestors；OWASP Clickjacking Defense Cheat Sheet）。frame-ancestors 能列出多个来源并且支持通配子域，X-Frame-Options 只能给一个来源。借鉴方式：收银台、后台管理这类页面统一在响应头里配置 frame-ancestors，把允许嵌入的商户域名写进配置中心。

postMessage 接收端同时校验 event.origin 与 event.source，发送端指定具体 targetOrigin（出处：MDN Web Docs 之 Window.postMessage）。文档明确指出，不校验来源会导致任意页面都能向该窗口发消息并触发处理逻辑。借鉴方式：把校验逻辑封成一个统一的消息总线模块，业务代码只注册消息类型，不再各自写监听器。

用 Permissions Policy 与 iframe 的 allow 属性限制子页能用到的浏览器能力（出处：MDN Web Docs 之 Permissions-Policy 与 iframe 的 allow 属性）。摄像头、地理位置、全屏这些能力默认继承父页策略，写成白名单后子页无法自行扩权。借鉴方式：给第三方嵌入的 iframe 显式写 allow 列表，只列出组件真正需要的项。

编辑器类产品的扩展 UI 用 iframe 承载，父子之间只走消息（出处：Visual Studio Code Extension API 文档中的 Webview API）。Webview 的脚本运行在独立文档里，与主进程的通信基于消息传递而不是直接共享对象。借鉴方式：内部工具需要嵌第三方面板时，约定消息协议字段与版本号，避免各方直接访问对方文档。

第三方播放器与挂件的消息协议细节（出处：需核对官方文档：核对 YouTube IFrame Player API 文档中 origin 参数的用途，以及播放状态事件的字段名与触发时机）。核对结论确定后再写进团队接入规范，当前不要凭记忆约定字段。

### 从学到用：落地路线

第 1 步：在一个非核心页面试点，选一个第三方嵌入组件，给它加上 sandbox 与显式的权限列表。验收标准：试点页面功能与改造前一致，Console 没有新增跨域报错。

第 2 步：在试点页面录制一次性能面板数据，记录改造前的主线程长任务条数与首屏指标，做对照。验收标准：同一台测试设备、同一网络条件下，两次录制都能产出可对比的数据。

第 3 步：把沙箱与消息校验整理成公共封装（消息总线模块、iframe 创建函数），在其他嵌入点逐个替换并回归。验收标准：所有嵌入点都通过公共封装创建 iframe，代码库中不再出现写死 `'*'` 的 targetOrigin。

第 4 步：把约束写进自动化检查，例如用 ESLint 规则或代码扫描脚本拦截 `postMessage(..., '*')` 与缺少 sandbox 的 iframe。验收标准：故意提交一段违规代码时，CI 能拦下并指出违规行。

### 动手作业

**目标**：做一个"笔记 + 实时预览"的两栏页面，左侧是 Markdown 或 HTML 输入框，右侧用 iframe 渲染，父子之间不共享任何对象。

**步骤**：

1. 搭建页面骨架，右侧放一个 iframe，先不给 src，只用 srcdoc 写入内容。
2. 给 iframe 加上 `sandbox="allow-scripts"`，故意在里面写一段读取 `parent.localStorage` 的脚本，确认它被浏览器拦截并记录报错内容。
3. 加一条消息通道：父页把输入内容通过 postMessage 发给子页，子页只接收 `event.origin` 等于父页源的消息。
4. 在子页里做一次真实的不透明源访问测试，确认校验失败的来源会被丢弃。
5. 给 iframe 外面套一个按需插入的开关：默认不插入 iframe，点击按钮后才创建，并把 `loading="lazy"` 在插入前设置好。
6. 反复切换预览 50 次，用 DevTools Memory 面板取堆快照，观察 Detached 节点。
7. 用 Lighthouse 跑一次页面，记录 LCP 与 TBT，再和"把 iframe 直接写死在 HTML 里"的版本对比。

**验收标准**：

- 预览脚本尝试读取父页存储时被拦截，Console 有对应报错，且父页数据未被读取到。
- 子页收到来源不匹配的消息时不做任何处理，可以通过在父页伪造一条消息验证。
- 代码中不存在 `postMessage` 的 targetOrigin 为 `'*'` 的调用。
- 反复切换预览 50 次后，堆快照中的 Detached 节点数量不随切换次数持续增长。
- 两次 Lighthouse 记录都能导出报告，报告中 iframe 的请求发起时间点晚于首屏主要资源。

