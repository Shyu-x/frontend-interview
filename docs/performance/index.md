# 前端性能优化全攻略

> 前端性能直接影响用户体验和业务指标。本章覆盖从加载到渲染的全链路优化方案。

---

## 1. 首屏优化方案

### 1.1 代码分割与懒加载

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
        <Route path="/" element={<Home} />
        <Route path="/about" element={<About} />
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

### 1.2 CDN 部署

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

### 1.3 预加载

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

### 1.4 HTTP 缓存策略

**缓存判断流程：**

![HTTP 缓存判断流程](assets/images/mermaid/performance-01.png)

**Cache-Control 常见值：**

| 值 | 说明 |
|---|---|
| no-cache | 每次验证后使用（可用本地缓存，但需验证） |
| no-store | 禁止缓存 |
| private | 只允许浏览器缓存（CDN不可缓存） |
| public | CDN也可以缓存 |
| max-age=3600 | 缓存有效期（秒） |
| must-revalidate | 过期后必须验证 |

**最佳实践：**

1. HTML：`Cache-Control: no-cache`（确保更新能及时下发）
2. 静态资源（JS/CSS/图片）：`max-age=31536000` + 内容hash
   （文件名带hash，改变URL即可更新，浏览器自动重新缓存）
3. CDN：设置`s-maxage`，CDN节点缓存，浏览器不缓存（`private`）

---

## 2. 白屏时间优化

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

## 3. 长列表优化

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

## 4. 虚拟列表原理

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

## 5. 图片优化

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

---

## 6. 懒加载原理

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

## 7. 路由懒加载原理

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

---

## 8. gzip vs Brotli

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

---

## 9. SSR 与性能

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

## 10. CDN 加速原理

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

## 11. Lighthouse 性能评分

**Lighthouse 评分体系：**

![Lighthouse 性能评分体系](assets/images/mermaid/performance-02.png)

| 评分 | 等级 | 说明 |
|------|------|------|
| 90-100 | 绿 | 优秀 |
| 50-89 | 黄 | 需要改进 |
| 0-49 | 红 | 差 |

```javascript
// Lighthouse 使用：
// 1. Chrome DevTools → Lighthouse面板
// 2. `npx lighthouse https://example.com --output html`
// 3. PageSpeed Insights（Google在线工具）
// 4. Chrome插件：Lighthouse Checker

// 优化建议：
// 1. 移除阻塞渲染的资源
// 2. 减少主线程工作（JS执行时间）
// 3. 优化图片（格式/大小/懒加载）
// 4. 减少未使用的JS/CSS
// 5. 使用现代图片格式（WebP/AVIF）
```

---

## 12. Core Web Vitals

**核心网页指标：**

| 指标 | 名称 | 达标标准 | 说明 |
|------|------|---------|------|
| LCP | 最大内容绘制 | ≤2.5s | 首屏加载体验 |
| CLS | 累积布局偏移 | ≤0.1 | 视觉稳定性 |
| INP | 交互延迟 | ≤200ms | 响应速度（新TTI） |
| FID | 首次输入延迟 | ≤100ms | 旧指标（被INP替代） |
| FCP | 首次内容绘制 | ≤1.8s | 页面开始显示 |
| TTFB | 首字节时间 | ≤0.8s | 服务器响应速度 |
| TTI | 可交互时间 | ≤3.8s | 完全可交互 |
| TBT | 总阻塞时间 | ≤200ms | JS阻塞主线程时间 |

```javascript
// FID → INP：
// - FID只测量第一次交互的延迟
// - INP（Interaction to Next Paint）测量整个页面生命周期中所有交互
// - INP = 从用户交互到下一帧渲染的最大延迟

// 如何优化CLS（布局偏移）：
// 1. 为图片/视频指定宽高（aspect-ratio）
// 2. 不要在内容上方动态插入广告/弹窗
// 3. font-display: optional（字体不阻塞，FOIT/FOUT减少）
// 4. 避免iframe
// 5. 使用CSS transform做动画（不触发重排）

// 如何优化LCP：
// 1. 优化关键内容（通常是hero图片或首屏大文本）
// 2. preload最大的LCP资源（<link rel="preload">）
// 3. 使用现代图片格式（WebP/AVIF）
// 4. 使用content-visibility: auto（跳过屏外渲染）
// 5. 服务端渲染（SSR）

// 如何优化INP：
// 1. 减少主线程阻塞（代码分割、web worker）
// 2. 长任务拆分（requestIdleCallback）
// 3. 避免大layout thrashing（批量DOM读写）
// 4. 减少reflow/repaint
```

---

## 13. 性能瓶颈定位

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

## 14. React 性能优化

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

## 15. Vue 性能优化

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

## 16. 大文件上传

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

## 17. Web Worker 优化

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

## 18. requestIdleCallback 优化

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

## 19. 前端监控

**前端监控体系：**

![前端监控体系](assets/images/mermaid/performance-03.png)

**错误监控：**

```javascript
// JS错误捕获
window.onerror = (msg, src, line, col, error) => {
  sendToServer({ type: 'error', msg, line, col, stack: error?.stack });
  return false; // 不执行默认错误处理
};

// Promise异常捕获
window.addEventListener('unhandledrejection', e => {
  sendToServer({ type: 'unhandledrejection', reason: e.reason });
});

// Vue错误捕获
Vue.config.errorHandler = (err, vm, info) => {};

// React错误边界
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    sendToServer(...);
  }
}
```

**性能监控（Web Vitals）：**

```javascript
import { onCLS, onLCP, onINP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id }) {
  // 发送到监控平台（不阻塞页面卸载）
  navigator.sendBeacon('/analytics', JSON.stringify({ name, value, id }));
}

onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
```

**API性能监控：**

```javascript
const origFetch = window.fetch;
window.fetch = async (...args) => {
  const start = performance.now();
  try {
    const res = await origFetch(...args);
    sendToServer({
      type: 'api',
      url: args[0],
      duration: performance.now() - start,
      status: res.status
    });
    return res;
  } catch (err) {
    sendToServer({
      type: 'api',
      url: args[0],
      duration: performance.now() - start,
      error: true
    });
    throw err;
  }
};
```

**埋点系统：**

```javascript
function track(event, properties = {}) {
  sendToServer({
    event,
    properties: { ...properties, timestamp: Date.now(), url: location.href }
  });
}
// 或者用navigator.sendBeacon（不阻塞页面卸载）
navigator.sendBeacon('/track', JSON.stringify({ event: 'page_view' }));
```

**常用监控平台：**

| 平台 | 特点 |
|------|------|
| Sentry | 错误监控，JS/Vue/React/RN |
| 阿里云ARMS | 前端监控 |
| 腾讯云前端性能监控 | 端到端 |
| Datadog / New Relic | 全链路 |
| 自建 | ClickHouse + Grafana |

**日志系统设计：**

![前端监控流程](assets/images/mermaid/performance-04.png)

| 环节 | 技术选型 |
|------|---------|
| 采集 | SDK（自动+手动） |
| 发送 | sendBeacon + 批量 |
| 存储 | ES / ClickHouse |
| 查询 | Kibana / Grafana |
| 告警 | 阈值触发 |

---

## 参考资源

| 资源 | 链接 |
|------|------|
| Google Web Vitals | https://web.dev/vitals/ |
| Lighthouse 文档 | https://developer.chrome.com/docs/lighthouse/ |
| MDN 性能 | https://developer.mozilla.org/zh-CN/docs/Web/Performance |
| Web Vitals 库 | https://github.com/GoogleChrome/web-vitals |