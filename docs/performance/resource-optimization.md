---
title: 资源优化
description: 图片、懒加载、路由懒加载、压缩算法与 CDN 加速。
tags:
  - performance
  - resources
date: 2026-05-17
---

# 资源优化

## 1. 图片优化

**图片优化矩阵：**

| 格式 | 压缩效果 | 场景 |
|------|---------|------|
| WebP | 比 JPEG 小 30% | 通用，兼容性已很好 |
| AVIF | 比 WebP 小 30% | 现代浏览器，内容图片 |
| SVG | 矢量无损 | 图标/插图 |
| 原生懒加载 | 避免白嫖 | img loading="lazy" |
| 响应式图片 | 避免下载大图 | srcset + sizes |
| 渐进式 JPEG | 逐行显示 | 内容丰富的大图 |

```javascript
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

## 2. 懒加载原理

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

## 3. 路由懒加载原理

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
        <Route path="/" element={<Home} />
        <Route path="/about" element={<About} />
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

## 4. gzip vs Brotli

**压缩算法对比：**

| 算法 | 压缩率 | 压缩速度 | 支持情况 |
|------|--------|---------|----------|
| gzip | 较好 | 快 | 所有浏览器/服务器 |
| brotli | 更好 | 稍慢 | 现代浏览器（95%+） |
| deflate | 一般 | 快 | 老式环境 |

```javascript
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

## 5. CDN 加速原理

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

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格 | 路由懒加载、gzip vs Brotli、图片优化 | 接口 JSON 开启 Brotli；行内头像用 WebP；表格工具按需加载 | 不要对已压缩图片再开文本压缩；先统计接口实际体积再决定是否上 Brotli |
| 低端安卓的活动页首屏 | 图片优化、懒加载原理、CDN 加速原理 | `<picture>` 提供 WebP 与 JPEG 回退；首屏关键图 `preload` | WebP 覆盖 95%+ 时仍需保留 JPEG 回退，否则低版本 WebView 不显示 |
| 多人协作白板 | 路由懒加载、图片优化、CDN 加速原理 | 图形库路由级拆包；缩略图 WebP 与 `loading="lazy"` | 缩略图数量大时先做接口分页，避免 DOM 中挂 800 个未加载图片节点 |
| 电商商品图列表 | 懒加载原理、图片优化、CDN 加速原理 | 商品主图用 WebP；列表图懒加载；CDN 设置图片长缓存 | 内容哈希文件名才能长缓存，否则商品换图后用户看到旧图 |
| 新闻资讯长文页 | 图片优化、懒加载原理、gzip vs Brotli | 正文图片 WebP；非首屏图片懒加载；HTML 开 Brotli | 首屏图片不要懒加载，否则 LCP 会滞后；正文正文图要保留原比例宽高 |
| 视频网站详情页 | 路由懒加载、CDN 加速原理、图片优化 | 推荐流组件拆包；封面图 WebP；静态资源走 CDN | 用户可能直接打开播放页，播放器核心代码不要拆出首屏需要的包 |
| SaaS 报表导出页 | 路由懒加载、gzip vs Brotli | 报表模块路由懒加载；导出接口响应 Brotli；静态资源 CDN | 导出大文件接口要单独流式处理，不要在首屏包里带导出逻辑 |
| 社交 App 图片流 | 图片优化、懒加载原理、CDN 加速原理 | 缩略图 WebP；滚动 feed 图懒加载；CDN 多尺寸裁剪 | 必须处理加载失败占位与重试，否则弱网下图片流出现大量空白 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

- **业务背景**：运营后台一次渲染 12000 行审计记录，首屏要 8 秒，滚动时掉帧。接口返回 6 MB JSON，行内头像图片有 300 张；可用 Chrome DevTools 打开页面记录 Network 总传输量复现这个规模。

- **怎么用本页知识解决**：
思路是先把 JS 包按路由拆开，再压缩接口 JSON，最后把行内头像改成 WebP 并懒加载。

```nginx
# nginx.conf：需安装 ngx_brotli 模块
brotli on;
brotli_types application/json application/javascript image/svg+xml;

location /api/audit {
  proxy_pass http://audit_backend;
  proxy_set_header Accept-Encoding br, gzip; # 让后端优先返回 br 压缩
}

location /img/ {
  add_header Cache-Control public,max-age=31536000; # 头像走长缓存
}

<!-- audit_table.html -->
<img src="/img/avatar.webp" loading="lazy" decoding="async" alt="头像">
```

- `brotli_types` 限定 json 和 js 等文本类型，避免对已压缩图片重复压缩。
- `Accept-Encoding: br, gzip` 让后端先返回 Brotli，低版本客户端回退 gzip。
- `loading="lazy"` 让头像在滚动到视口附近时才发起请求。
- `decoding="async"` 让图片解码不阻塞主线程，滚动时掉帧会减少。
- `Cache-Control` 让头像重复访问时直接命中浏览器缓存。

- **怎么度量收益**：
看 3 个指标：接口 JSON 的 Transfer Size、图片请求数、滚动 5 秒的平均 FPS。
工具用 Chrome DevTools 的 Network 面板和 Performance 面板；页面整体用 Lighthouse 移动端审计。

- **什么时候不该用**：
  - 表格只有 200 行且接口低于 200 KB 时，不要上 Brotli 协商和头像懒加载，配置成本和验证成本高于收益。
  - 后端 CPU 已经接近满负载时，不要同时开启 br 与 gzip 双格式压缩，先在测试环境比压缩率和 CPU 占用。
  - 行内头像只有 3 张且固定可视时，不要加 `loading="lazy"`，首屏反而多一次属性处理。

#### 场景 2：低端安卓的活动页首屏

- **业务背景**：低端安卓手机打开营销活动页，首屏白屏 6 秒，页面加载 4 MB 图片和 1.8 MB JS。可使用 Chrome DevTools 远程调试记录资源耗时和传输体积。

- **怎么用本页知识解决**：
思路是优先压缩图片体积，给支持 WebP 的浏览器返回 WebP，不支持时回退 JPEG；首屏关键图片提前请求。

```html
<!-- activity.html -->
<link rel="preload" as="image" href="/hero.webp" imagesrcset="/hero-480.webp 480w, /hero-1024.webp 1024w">

<picture>
  <source type="image/webp" srcset="/hero-480.webp 480w, /hero-1024.webp 1024w">
  <!-- 不支持 WebP 时回退 JPEG -->
  <img src="/hero.jpg" srcset="/hero-480.jpg 480w, /hero-1024.jpg 1024w" alt="活动主视觉" width="480" height="360">
</picture>
```

- `<source type="image/webp">` 只让支持 WebP 的浏览器下载 WebP，低版本浏览器自动跳过。
- `srcset` 按设备宽度选择 480w 或 1024w 图片，避免手机加载桌面尺寸。
- `preload` 让首屏主视觉提前进入请求队列，不等 HTML 解析到 `<picture>` 才发起。
- `<img src="/hero.jpg">` 保住不支持 WebP 的 WebView，避免整张主视觉不显示。
- 固定 `width` 和 `height` 防止图片加载后页面布局突然跳动。

- **怎么度量收益**：
看首屏 LCP、图片总传输字节、首屏 JS 执行时间。
工具用 Chrome DevTools 的 Performance 面板录 LCP，Network 面板按 `type=image` 看总字节，Lighthouse 移动端审计看整体分数。

- **什么时候不该用**：
  - 活动页只上线 24 小时，而生成 WebP 和回退会新增构建步骤，投入超过收益时不要做。
  - 主视觉是文字图标且要求全透明时，WebP 无损体积不总比 PNG-8 小，先批量比较两种格式体积，不要把 PNG-8 强转 WebP。
  - 用户群已知全用不支持 WebP 的内嵌 WebView 时，不要只提供 WebP，必须保留 JPEG 回退。

#### 场景 3：多人协作白板

- **业务背景**：协作白板首屏要加载 1.2 MB 白板引擎 JS 和 800 个素材缩略图。成员在 3G 网络下打开，白屏超过 5 秒；可用 DevTools 限制 Slow 3G 并录制加载过程复现。

- **怎么用本页知识解决**：
思路是拆白板工具为按需加载，缩略图用 WebP 并交给浏览器懒加载，JS 走 Brotli 和 CDN。

```jsx
// WhiteboardApp.jsx
import { lazy, Suspense } from 'react';
const ShapeLibrary = lazy(() => import('./ShapeLibrary')); // 按需下载图形库代码

export default function Whiteboard() {
  return (
    <Suspense fallback={<div>加载工具中</div>}>
      <ShapeLibrary />
    </Suspense>
  );
}

<!-- asset_thumb.html -->
<img src="/thumbs/sticky-note.webp" loading="lazy" decoding="async" alt="便签缩略图">
```

- `lazy()` 让 `ShapeLibrary` 的 JS 在首次渲染该组件时才下载，首屏少加载这一块代码。
- `Suspense` 给拆包后的组件一个加载中提示，避免组件未下载时白屏。
- `loading="lazy"` 让浏览器根据滚动距离决定缩略图请求时间，不会首屏一次拉 800 张。
- `decoding="async"` 避免图片解码阻塞白板交互。
- `/thumbs/*.webp` 比 JPEG 缩略图减少传输字节，适合 3G 网络。

- **怎么度量收益**：
看首屏 JS 体积、缩略图请求数、主线程长任务数量。
工具用 Chrome DevTools 的 Coverage 面板看未执行 JS 体积，Network 面板按 mime type 统计请求，Performance 面板记录长任务数量。

- **什么时候不该用**：
  - 白板核心画布代码只有 80 KB 且用户在内网时，不要拆出过多路由懒加载包，每多一次请求就增加一次往返延迟。
  - 缩略图用 CSS 背景图时，`loading="lazy"` 不生效，不要硬加这个属性；改用 IntersectionObserver 或接口分页渲染。
  - 缩略图总数只有 20 张且尺寸很小时，不要生成多尺寸和多格式，直接使用 SVG 或单张小图，降低构建复杂度。

### 行业先进实践

1. **响应式图片与 WebP 协商（出处：web.dev 的 `serve-responsive-images` 文档）**  
使用 `<picture>` 和 `srcset` 让浏览器按设备宽度和格式支持选择图片。浏览器只下载匹配资源，降低传输体积。你的项目可以先统计请求头中的 `Accept`，确认 WebP 覆盖后，再给商品图和文章配图生成 WebP 加 JPEG 回退。

2. **路由级代码分割（出处：React 官方文档 `Code-Splitting`）**  
使用 `lazy()` 与 `Suspense` 把非首屏路由拆成独立 JS 块。首屏只下载当前路由代码，减少脚本下载和解析时间。你的项目可以优先拆出设置页、帮助中心、报表页三个常常被用户晚打开的路由。

3. **Brotli 静态预压缩（出处：google/ngx_brotli 开源项目）**  
Nginx 通过 `ngx_brotli` 模块对 JS、CSS、HTML 提供 br 压缩。Brotli 与 gzip 的压缩率差异需要用同一组 JS/CSS 文件分别压缩后对比字节数确认。你的项目可以在构建时产出 `.br` 文件，由 Nginx 或对象存储直接分发，避免动态压缩消耗 CPU。

4. **CDN 自动格式转换（出处：Cloudflare 文档 `Polish` 与 `Image Resizing`）**  
Cloudflare Polish 自动移除图片元数据并转换格式，Image Resizing 按 URL 参数生成目标尺寸。它能减少源站图片处理脚本和重复存储。你的项目如果已经接入 Cloudflare，可以先只开启 Polish，再评估 Image Resizing 的配额和成本。

5. **关键资源预加载（出处：MDN 文档 `rel=preload`）**  
通过 `<link rel="preload">` 让浏览器提前请求关键字体、首屏图片或 CSS。它能把首屏关键路径里的等待时间前置。你的项目应只对首屏必定使用的 2 到 3 个资源加 preload，避免抢占其他请求带宽。

### 从学到用：落地路线

1. 先在一个流量小但图片多的商品列表页试点。验收标准：用 Chrome DevTools 记录改造前后图片传输字节，改造后下降至少 15%。
2. 在本地和灰度环境验证 WebP 回退与 Brotli 压缩。验收标准：支持 WebP 的浏览器请求响应为 `image/webp`，不支持浏览器成功回退 JPEG；JS 响应头为 `content-encoding: br`。
3. 把配置推广到全站静态资源。验收标准：CDN 命中率高于 90%，源站静态资源请求数下降可测量。
4. 在 CI 中加入资源体积和格式检查。验收标准：生产 JS 包超过设定阈值或图片未提供 WebP 时构建失败。

### 动手作业

**目标**：把一个含 50 张图的活动页改造成 WebP 优先、懒加载、Brotli 压缩、CDN 缓存版本。

**步骤**：

1. 用 Chrome DevTools 记录改造前 Network 面板的图片总字节、图片请求数和 LCP。
2. 给 12 张首屏关键图片保留同步加载，其余 38 张图加 `loading="lazy"`。
3. 把 JPEG/PNG 图片批量转换为 WebP，并用 `<picture>` 提供原格式回退。
4. 给 Nginx 或 CDN 配置 Brotli 压缩 JS/CSS/HTML 文本资源。
5. 给图片和 JS/CSS 文件名加内容哈希，设置 `Cache-Control` 长缓存。
6. 部署到 CDN 后用 Lighthouse 移动端审计复测。
7. 在低端安卓真机上用远程调试走一遍首屏到可交互。

**验收标准**：

- 图片传输总字节比改造前下降至少 20%。
- Lighthouse Performance 分数上升至少 10 分，或 LCP 下降至少 0.5 秒。
- 支持 WebP 的浏览器中，Network 面板里图片响应的 `Content-Type` 为 `image/webp`。
- 首屏图片请求数比改造前减少，懒加载图片在滚动到视口时才发起请求。
- 页面无 404、无破裂图片，控制台无图片加载相关报错。

