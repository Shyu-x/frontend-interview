---
title: HTTP 缓存
description: 强缓存与协商缓存、Cache-Control、ETag 与 Last-Modified、缓存决策与服务端实现。
---

# HTTP 缓存

## 1. 浏览器缓存机制：强缓存 vs 协商缓存

### 1.1 定义/背景

浏览器缓存是减少不必要网络传输、提升页面加载速度的核心机制。强缓存通过设定过期时间直接使用本地缓存，无需与服务端通信；协商缓存通过服务端验证缓存有效性决定是否使用缓存。两者配合构成完整的缓存策略，是性能优化必考题。

### 1.2 完整缓存决策流程

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
              Modified       新资源 + 新 ETag/Last-Modified
```

### 1.3 强缓存详解

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
Expires: Mon, 01 Jan 2027 00:00:00 GMT  # 绝对时间（依赖客户端时钟，有误差）
```

### 1.4 no-cache vs no-store 对比

| 指令 | 含义 | 网络请求 | 适用场景 |
|------|------|---------|---------|
| `Cache-Control: no-store` | 完全不缓存，任何地方都不存 | 每次完整下载 | 金融网站、登录接口（包含 Token/PII） |
| `Cache-Control: no-cache` | 缓存，但使用前必须重新验证 | 发送条件请求（304/200） | 敏感但需要缓存节省带宽的数据 |
| `Cache-Control: max-age=0` | 等价于 no-cache | 发送条件请求 | 强制每次验证 |

### 1.5 协商缓存详解

```http
# 服务端响应头（告诉浏览器缓存的标识）
ETag: "abc123def456"        # 文件内容的哈希/版本标识（精确）
Last-Modified: Tue, 01 Jan 2026 12:00:00 GMT  # 文件最后修改时间（粗粒度）

# 浏览器后续请求头（带上缓存标识，询问服务器是否过期）
If-None-Match: "abc123def456"     # 对应 ETag
If-Modified-Since: Tue, 01 Jan 2026 12:00:00 GMT  # 对应 Last-Modified
```

### 1.6 ETag vs Last-Modified 对比

| 特性 | ETag | Last-Modified |
|------|------|--------------|
| 精度 | 精确（内容哈希，md5/sha1） | 粗粒度（秒级，文件系统时间） |
| 精度问题 | 小文件秒内修改可能丢失 | 无法区分秒内多次修改 |
| 计算成本 | 需计算哈希（CPU 消耗） | 直接读文件时间（快速） |
| 分布式兼容 | 需确保多服务器 ETag 一致（否则 200 返回） | 天然一致（文件系统时间） |
| 推荐场景 | API 响应、频繁更新的动态内容 | 静态文件、大文件 |

### 1.7 Express 服务端缓存代码实现

```typescript
import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const app = express();

// 强缓存 + 协商缓存完整实现
app.get('/static/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'public', req.params.filename);
  const stat = fs.statSync(filePath);
  const mtime = stat.mtime.toUTCString();

  // 生成 ETag（使用 Weak ETag 标记 "W/"）
  const fileBuffer = fs.readFileSync(filePath);
  const etag = `W/"${crypto.createHash('sha1').update(fileBuffer).digest('base64')}"`;

  // 协商缓存：检查客户端请求头
  // 优先级：If-None-Match (ETag) > If-Modified-Since (Last-Modified)
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();  // 命中协商缓存
    return;
  }
  if (req.headers['if-modified-since'] === mtime) {
    res.status(304).end();
    return;
  }

  // 设置缓存策略
  const filename = req.params.filename;
  if (filename.endsWith('.html')) {
    // HTML: 不缓存，确保用户总是拿到最新版本
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else {
    // 静态资源（JS/CSS/图片）: 长期缓存 + immutable
    // 版本化文件名（app.a1b2c3.js）天然实现了更新逻辑
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', mtime);
  // Vary 头：告知缓存根据 Accept-Encoding 头区分缓存版本
  res.setHeader('Vary', 'Accept-Encoding');
  res.sendFile(filePath);
});

// Service Worker 缓存策略示例（TypeScript）
const CACHE_NAME = 'v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/bundle.js',
  '/style.css',
];

// 缓存优先策略（适合静态资源）
async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

// 网络优先策略（适合 API 数据）
async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Stale-While-Revalidate（最适合混合场景）
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
    return response;
  });
  return cached || networkPromise;
}
```

### 1.8 种缓存决策场景对比

| 场景 | Cache-Control | Expires | ETag/Last-Modified | 行为 |
|------|--------------|---------|---------------------|------|
| 长期缓存静态资源 | `max-age=31536000, immutable` | — | 有 | 命中强缓存，1 年不请求 |
| HTML 页面 | `no-cache, no-store` | — | — | 每次加载最新内容 |
| 用户相关数据 | `private, max-age=0` | — | 有 | 每次验证，用户独占 |
| CDN 缓存 | `s-maxage=7200` | — | — | CDN 缓存 2 小时 |
| API 响应（频繁更新） | `no-cache` + ETag | — | 有 | 条件请求，节省带宽 |
| 永不变化的资源 | `public, max-age=31536000` | — | — | 永久缓存，版本化文件名 |

### 1.9 常见陷阱与最佳实践

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| HTML 设置了强缓存 | 用户无法获取新版本 JS/CSS | HTML 用 `no-cache`，静态资源用长期缓存 + 版本化 |
| `Expires` 和 `Cache-Control` 同时设置 | 不同浏览器行为不一致 | 只设置 `Cache-Control`，`Expires` 作为降级 |
| CDN 和源站 ETag 不一致 | 多 CDN 节点 ETag 不同，协商缓存失效 | 用内容哈希作为版本号，不用 ETag |
| `no-store` 误用于非敏感数据 | 每次都下载完整内容，浪费带宽 | 敏感数据用 `no-store`，其他用 `no-cache` |
| 浏览器前进后退使用 bfcache | bfcache 恢复页面，不经过缓存检查 | 用 `pageshow` 事件监听，`persisted` 标志判断 |

### 1.10 面试追问

**Q1: 打开一个网站后立刻按 F5 刷新和先关闭再重新打开，有什么区别？**

F5 刷新（`location.reload()`）：浏览器发送 `Cache-Control: max-age=0`（等同于 `no-cache`），会走协商缓存验证（发送 `If-None-Match`/`If-Modified-Since`），如果资源未过期则 304 Not Modified。关闭标签页再打开：如果是 bfcache，恢复内存快照，完全不经过网络。如果非 bfcache（如 Firefox 的 bfcache 不支持 WebSocket 等特性），走完整强缓存流程。

**Q2: Service Worker 的缓存和 HTTP 缓存有什么区别？**

HTTP 缓存由浏览器自动管理，遵循 HTTP 头指令。Service Worker 缓存是 JS 代码控制的缓存代理，可以实现细粒度的缓存策略（Stale-While-Revalidate、Network-First 等），可以拦截/修改请求，实现离线能力（Progressive Web App），但增加了开发复杂度。

**Q3: 如何实现"缓存更新但用户不刷新就看不到新版本"？**

核心思路是缓存失效后强制更新。方案有四：（1）给资源文件名加哈希（`bundle.a1b2c3.js`），内容变则文件名变，绕过强缓存；（2）使用 Service Worker 的 `skipWaiting()` + `Clients.claim()` 强制新 SW 立即生效；（3）在 HTML 中内联 SW 注册代码，SW 文件名加版本号；（4）通过版本号检测 + 弹窗提示用户刷新。

## 2. 强缓存与协商缓存（速记版）

### 2.1 完整缓存决策流程

**缓存判断流程：**

| 阶段 | 检查 | 结果 |
|------|------|------|
| 强缓存 | 检查 Cache-Control: max-age / Expires | 命中则直接使用缓存 (200 OK) |
| 协商缓存 | 检查 ETag / Last-Modified | 命中则使用缓存 |
| 条件请求 | 发送 If-None-Match / If-Modified-Since | 服务端确认后返回 304 或新资源 |

**决策树：**
1. HTTP 响应到达浏览器
2. 检查强缓存（Cache-Control / Expires）→ 命中直接返回 200 OK
3. 未命中则检查协商缓存（ETag / Last-Modified）
4. 发送条件请求 → 服务端确认 → 返回 304（使用缓存）或 200（新资源）

### 2.2 强缓存详解

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

### 2.3 no-cache vs no-store 区别

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

### 2.4 协商缓存详解

```http
# 服务端响应头（告诉浏览器缓存的标识）
ETag: "abc123def456"        # 文件内容的哈希/版本标识（精确）
Last-Modified: Tue, 01 Jan 2026 12:00:00 GMT  # 文件最后修改时间（粗粒度）

# 浏览器后续请求头（带上缓存标识，询问服务器是否过期）
If-None-Match: "abc123def456"     # 对应 ETag
If-Modified-Since: Tue, 01 Jan 2026 12:00:00 GMT  # 对应 Last-Modified
```

### 2.5 ETag vs Last-Modified 对比

| 特性 | ETag | Last-Modified |
|------|------|--------------|
| 精度 | 精确（内容哈希） | 粗粒度（秒级） |
| 精度问题 | 小文件秒内修改可能丢失 | 无法区分秒内多次修改 |
| 性能 | 需计算哈希（CPU消耗） | 直接读文件时间（快速） |
| 分布式兼容 | 需确保多服务器 ETag 一致 | 天然一致（文件系统时间） |
| 推荐场景 | API 响应、频繁更新的动态内容 | 静态文件、大文件 |

### 2.6 代码示例：强制缓存 + 协商缓存实践

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

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN HTTP 缓存（中文）](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Caching) | 官方中文缓存总览，强缓存与协商缓存概念一网打尽。 | 精读缓存类型与 Cache-Control 一节，用 DevTools 复现强缓存命中与 304 响应。 |
| [MDN HTTP 缓存（English）](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) | 英文版更新更快，含 stale-while-revalidate 等新特性。 | 读新鲜度与校验两节，对照中文版补齐差异，记录失效规则。 |
| [HTTP conditional requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests) | 讲透 ETag、Last-Modified 与条件请求，是协商缓存核心。 | 读 If-None-Match、If-Modified-Since 小节，手写请求观察 304 响应头。 |
| [RFC 9111 HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111) | 缓存语义的权威规范，是新鲜度与校验规则的最终依据。 | 读新鲜度计算一节，用 Age 与 max-age 手算某个响应是否过期。 |
| [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) | 条件请求语义的规范出处，明确 304 的产生条件。 | 读条件请求一章，厘清 ETag 优先级与弱比较的判定规则。 |
| [MDN HTTP 头部](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers) | 按头部逐条查证 Cache-Control、ETag、Vary 的准确含义。 | 把项目用到的缓存相关头部列出，逐个对照定义并加注释。 |
| [MDN HTTP 状态码](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) | 确认 200、304 等状态码在缓存链路中的确切作用。 | 重点读 304 与 200 小节，用 curl 触发并记录是否携带响应体。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Everything curl](https://everything.curl.dev/) | 用命令行复现请求，直观看到缓存头部的收发过程。 | 跟做 -v 与 -H 'If-None-Match' 示例，观察 304 与响应头变化。 |
| [HTTP Toolkit](https://httptoolkit.com/) | 拦截真实浏览器请求，直接查看缓存命中与请求头。 | 安装后先禁用缓存再启用，对比两次请求头与响应头的差异。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Service Worker 与 HTTP 缓存](https://web.dev/articles/service-worker-caching-and-http-caching) | 理清 Service Worker 缓存与 HTTP 缓存的叠加与冲突。 | 读两层缓存优先级一节，思考离线场景下如何避免陈旧资源。 |
| [HTTP 缓存](https://web.dev/articles/http-cache) | 把强缓存落到工程实践：哈希文件名配合 immutable。 | 读配置示例，为自己的静态资源加长 max-age 与文件名哈希。 |
| [Julia Evans：HTTP zine](https://wizardzines.com/zines/http/) | 轻松速览，用漫画补齐缓存相关的直觉认知。 | 先看样张，把涉及缓存的部分画成流程图贴在速记版旁。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的发票万行表格 | 强缓存加载 JS/CSS；列表 GET 接口用协商缓存返回 304 | 构建产物用 `[contenthash:8]`；Nginx 给 `/assets/` 一年 `Cache-Control`；API 返回 ETag | HTML 入口不要长缓存；表格数据避免公共共享缓存 |
| 低端安卓上的活动页首屏 | 强缓存避免重复下载大体积 JS；HTML 入口协商缓存 | webpack `[contenthash]`；`Cache-Control: max-age=31536000, immutable`；入口 `no-cache` | 只对文件名带哈希的静态资源长缓存；检查 WebView 是否清缓存 |
| 多人协作白板 | 强缓存加载编辑器静态资源；文档元数据 GET 接口协商缓存 | 编辑器资源 `contenthash`；文档接口 ETag；WebSocket 不走缓存 | 实时操作和在线状态用 `no-store`；不要缓存 WebSocket |
| 电商大促商品详情页 | 静态资源强缓存；商品基础信息协商缓存；价格接口短时 CDN 缓存 | CDN 长缓存静态资源；商品 API ETag；价格接口 `s-maxage=5, stale-while-revalidate=30` | 库存和下单接口不加陈旧回退；用户专属价用 `private` |
| 新闻图文详情页 | 图片强缓存；文章正文 API 协商缓存 | 图片 URL 带版本或内容哈希；正文 API 返回 ETag | 图片修改必须换文件名；文章更新后要更新 ETag |
| 开发者门户的 API 文档站 | 文档页面和搜索索引协商缓存；静态 CSS/JS 强缓存 | 文档站生成器输出哈希资源；HTML `no-cache`；搜索索引短 `max-age` | 搜索索引更新频繁，不能长强缓存 |
| 银行账户流水列表 | 私有缓存和协商缓存减少传输；不能共享返回数据 | `Cache-Control: private, max-age=0, must-revalidate`；GET API ETag | 登出后必须清本地缓存；敏感数据不得持久化到 localStorage |
| 游戏素材包下载更新 | 大文件素材强缓存；目录清单协商缓存 | 素材文件名带版本；清单 JSON 返回 ETag | 避免同 URL 原地更新素材；大文件拆分小包以复用缓存 |

### 三个场景拆解

#### 场景 1：后台管理的发票万行表格

- **业务背景**：发票列表一次渲染 1 万行，首次打开要同时等待静态包和列表接口返回。用 Chrome DevTools Network 面板可记录静态资源请求体积、接口响应时间和渲染开始点。
- **怎么用本页知识解决**：把页面脚本按内容哈希发布，服务端对 `/assets/` 给长缓存；HTML 入口保持 `no-cache`。列表 GET 接口返回 ETag，第二次请求带 `If-None-Match`，后端无变化时返回 304，前端用本地保存的表格数据。

```nginx
# Nginx: 静态资源按内容哈希长缓存
location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
# Nginx: 入口 HTML 每次先验证
location = /index.html {
  add_header Cache-Control "no-cache";
}

// 前端: 列表请求带上上次 ETag
const prevETag = localStorage.getItem('etag-invoices') || '';
const res = await fetch('/api/invoices', {
  headers: { 'If-None-Match': prevETag }
});
if (res.status === 304) {
  return JSON.parse(localStorage.getItem('invoices')); // 304 时使用本地数据
}
const data = await res.json();
localStorage.setItem('etag-invoices', res.headers.get('ETag') || ''); // 保存 ETag
localStorage.setItem('invoices', JSON.stringify(data)); // 保存列表数据
return data;
```

- 静态资源按内容哈希后，未变化的 JS/CSS 不重复下载。
- HTML 入口 `no-cache` 保证发布后允许验证新页面。
- 列表接口 304 时响应体为 0，减少万行数据重复下载。
- 本地保存 ETag 和数据仅用于当前用户，不能把授权列表放进公共缓存。
- 万行渲染卡顿与网络缓存分开测量，避免混淆瓶颈。

- **怎么度量收益**：工具用 Chrome DevTools Network 面板。指标看静态资源 `(from disk cache)` 命中数量、列表接口 `304` 数量、DOMContentLoaded 时间。测量方法：首次打开后关闭页面再打开，对比两次静态资源请求体积和接口请求体积。
- **什么时候不该用**：
  - 表格包含薪资或账户余额时，不要 localStorage 持久化数据，也不应共享缓存。
  - 行数据在半分钟内更新时，ETag 可能让用户看到旧数据，应改用 `no-store` 或短轮询。
  - 如果登录态变化，必须清空 ETag 和本地数据，否则用户可能看到上一个账号的列表。

#### 场景 2：低端安卓上的活动页首屏

- **业务背景**：活动页冷启动需要下载大体积 JS，低端安卓的首屏等待明显比桌面端长。用 Lighthouse 的 Network payload 和 Time to Interactive 可测出该活动页的网络瓶颈。
- **怎么用本页知识解决**：先减小首屏必须下载的静态资源，再把带内容哈希的静态资源放长缓存。HTML 入口用协商验证，确保用户拿到新版本，JS/CSS 继续从本地缓存加载。

```nginx
# webpack: 输出文件名带内容哈希，内容不变 URL 不变
output: {
  filename: 'static/js/[name].[contenthash:8].js'
}
# Nginx: 带哈希静态资源长缓存
location /static/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
# Nginx: HTML 入口不允许长缓存
location = /index.html {
  add_header Cache-Control "no-cache";
}
```

- 长缓存后，二次访问下载量下降，慢网络等待减少。
- `immutable` 避免浏览器在刷新时发送无用的 304 验证。
- HTML 入口 `no-cache` 让发布后验证新 HTML。
- 只对 `/static/` 启用长缓存，避免把 API 响应一起缓存。
- 低端安卓的存储可能被系统清理，不能只依赖缓存。

- **怎么度量收益**：工具用 Lighthouse。指标看 Time to Interactive、Network payload、`(from disk cache)` 命中资源数。测量方法：在低端安卓真机或 DevTools 设备模拟中，首次打开和第二次打开各跑 1 次 Lighthouse，记录 Time to Interactive 差值。
- **什么时候不该用**：
  - 如果 WebView 容器每次退出就清缓存，长缓存无法命中，应先检查 WebView 缓存设置。
  - 如果发布时会用同一 URL 覆盖 JS 内容，内容哈希失效，不能使用 `immutable`。
  - 如果活动页只有一次访问，缓存收益低，优先做体积裁剪。

#### 场景 3：电商大促的商品详情页

- **业务背景**：大促时商品详情页访问集中，静态资源和实时价格接口都成为请求瓶颈。用 Chrome DevTools 的 Network 面板并切换慢速模拟，可比较两条请求链路的首屏阻塞。
- **怎么用本页知识解决**：详情页静态资源长缓存，基础详情走 ETag/304，价格接口只允许 CDN 短缓存并回退旧价格。库存扣减必须实时，不走缓存。

```nginx
# 静态资源按哈希长缓存
location /static/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
# 基础商品信息用协商缓存
location /api/sku {
  etag on;
  add_header Cache-Control "no-cache";
  proxy_pass http://backend;
}
# 价格接口允许 CDN 短缓存，过期后先回旧值再后台更新
location /api/price {
  add_header Cache-Control "public, s-maxage=5, stale-while-revalidate=30";
  proxy_pass http://backend;
}
```

- `/static/` 长缓存让大促流量不重复下载商品图和 JS。
- `/api/sku` 用 ETag，商品基础信息未变时返回 304。
- `/api/price` 用 `s-maxage=5`，CDN 层短缓存，允许公共层消化瞬时流量。
- `stale-while-revalidate=30` 可在价格过期后先回旧值，避免首屏空白。
- 库存、下单接口不能加 `stale-while-revalidate`，因为旧值可能造成超卖。

- **怎么度量收益**：工具用 Nginx access log、Chrome DevTools、Lighthouse。指标看静态资源缓存命中数、价格接口缓存命中数、首屏 LCP。测量方法：压测期间按 `$upstream_cache_status` 统计 CDN 命中，Lighthouse 在普通网络和慢速模拟下各测 1 次。
- **什么时候不该用**：
  - 展示“剩余库存数”时，如果使用 `s-maxage=5` 可能向用户显示旧库存，不能用于下单链路的库存判断。
  - 用户登录后的专属价格不能放进公共 CDN 缓存，必须用 `private` 或按用户分区缓存。
  - 秒杀开始那一刻价格更新要求立即送达，不能依赖 30 秒陈旧回退。

### 行业先进实践

1. 文件名内容哈希 + 长缓存（出处：webpack 官方文档 Caching）  
webpack 官方文档 Caching 页建议输出文件名带 `[contenthash]`，内容不变 URL 不变。服务端对这些 URL 设置一年 `Cache-Control`，内容更新时生成新 URL。你的项目可把 JS/CSS 发布到 `/static/`，HTML 入口单独 `no-cache`。

2. `stale-while-revalidate`（出处：RFC 5861）  
RFC 5861 定义 `stale-while-revalidate`，允许缓存过期后先返回旧响应，后台再验证。这能减少验证等待，适合可容忍短时间陈旧的数据。你的项目可给文章封面、商品主图加短 `stale-while-revalidate=30`，交易接口不要加。

3. `immutable` 响应指令（出处：MDN HTTP Caching）  
MDN HTTP Caching 文档说明 `Cache-Control: immutable` 告诉浏览器长缓存响应不会变化，刷新时不再重新验证。只对文件名带内容哈希的静态资源使用有效。你的项目要保证同 URL 的内容不能被原地覆盖。

4. Workbox 的缓存策略（出处：Workbox 官方文档 Strategies）  
Workbox 官方文档提供 `CacheFirst`、`NetworkFirst`、`StaleWhileRevalidate` 等 Service Worker 策略。这些策略以 URL 为键，和 HTTP 缓存头分层配合。你的项目可对 GET API 使用 `StaleWhileRevalidate`，对 POST 请求跳过缓存。

5. Nginx 默认 ETag（出处：Nginx ngx_http_core_module 官方文档）  
Nginx 对静态文件默认开启 ETag，浏览器用 `If-None-Match` 验证并收到 304。这能在不改配置的情况下保留协商缓存。你的项目不要随意关闭 `etag on`，除非已使用内容哈希文件名并配长缓存。

### 从学到用：落地路线

**第 1 步：在静态资源目录试点**：选一个后台管理页或活动页，把构建产物改为 `[contenthash:8]` 文件名，并给 `/assets/` 或 `/static/` 加 `Cache-Control: max-age=31536000, immutable`。验收标准：该目录中未变化静态资源在第二次访问时显示 `(from disk cache)`，对应网络请求数为 0。

**第 2 步：验证入口可更新**：给 HTML 入口设置 `no-cache`，发布一个新标题或版本号后访问。验收标准：刷新 1 次内新 HTML 出现，JS/CSS 资源仍走缓存。

**第 3 步：推广到 GET 接口**：为后台列表、文章详情等低敏感 GET 接口增加 ETag，前端第二次请求时带 `If-None-Match`。验收标准：重复读同一个 URL 时出现 304 或本地缓存命中，接口响应体流量下降。

**第 4 步：建立防回退检查**：在 CI 中加入缓存头检查，禁止 HTML 入口长强缓存，要求哈希静态资源有长 `max-age`。验收标准：配置检查失败会阻断合并，每次发布都运行该检查。

### 动手作业

**目标**：为一个本地静态博客搭建缓存策略，观察强缓存和协商缓存的命中情况。

**步骤**：

1. 建两个文件：`index.html` 和 `assets/app.js`，把 JS 文件改名为 `assets/app.<contenthash>.js`，并在 HTML 中引用该哈希 URL。
2. 启动本地 Nginx 或 Node 服务，给 `/assets/` 增加 `Cache-Control: max-age=31536000, immutable`，给 `/index.html` 增加 `Cache-Control: no-cache` 并开启 ETag。
3. 浏览器打开页面，用 DevTools Network 记录首次请求数量和体积。
4. 刷新页面，检查 `app.<contenthash>.js` 是否来自 `(from disk cache)`，`index.html` 是否返回 304 或带 `ETag`。
5. 修改 `index.html` 并保持 URL 不变，刷新确认新 HTML 生效；修改 JS 内容并更新哈希文件名，确认 HTML 引用新 URL。
6. 用 curl 请求 `/assets/app.<contenthash>.js`，检查响应头中的 `Cache-Control`；用 curl 先请求 `/index.html` 拿到 ETag，再用 `If-None-Match` 请求确认 304。
7. 记录首次与第二次请求的流量差和请求数差。

**验收标准**：

- `/assets/app.<contenthash>.js` 第二次请求来自 `(from disk cache)`，响应头包含 `max-age=31536000, immutable`。
- `/index.html` 第二次请求返回 304 或能看到 ETag，不是磁盘缓存的旧页面。
- 修改 JS 内容后引用 URL 变化，旧 URL 没有被新内容覆盖。
- curl 带 `If-None-Match` 请求返回 `304 Not Modified`。
- 实验报告列出首次与第二次请求流量差。

