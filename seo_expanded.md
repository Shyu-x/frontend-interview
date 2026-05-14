# 24. SEO 优化：Core Web Vitals、Meta 标签、渲染策略与最佳实践

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

// ✅ 字体加载时防止 FOIT/FOUT，使用 size-adjust
@font-face {
  font-family: 'MyFont';
  src: url('/font.woff2') format('woff2');
  font-display: swap;
  size-adjust: 103%;  /* 调整后备字体大小以匹配自定义字体 */
}
```

#### 避免 CLS 的常见场景

```tsx
// ❌ 避免：无尺寸图片 + 延迟加载导致的偏移
<img src="lazy.jpg" loading="lazy" />  // 无宽高，偏移

// ❌ 避免：动态插入内容（banner、通知条）未预留空间
document.body.prepend('<div class="promo-bar">...</div>');

// ❌ 避免：动画属性触发 Layout（transform/opacity 不会）
// transform: translateX() ✅
// margin-left: 100px ❌（触发 Layout → CLS）
```

### 24.1.4 INP 优化策略

**INP 衡量用户交互（如点击、键盘输入）到浏览器下次 paint 的时间。INP = 所有交互中延迟最长的那个（排除异常值）。**

INP 延迟由三个阶段组成：

```
INP 延迟 = 输入延迟（Input Delay）
         + 处理时间（Processing Time）
         + 呈现延迟（Presentation Delay）
```

#### 优化主线程可用性（降低输入延迟）

```tsx
// ✅ 将耗时任务拆分为小任务，释放主线程
function handleClick() {
  // 使用 scheduler.yield()（React 19 / Next.js 15）让步主线程
  'use server';
  import { schedule } from 'next/dist/compiled/scheduler';

  // 分割大块工作
  for (const chunk of splitWork(largeData)) {
    process(chunk);
    await schedule.yield(); // 让出主线程，下一帧可响应用户输入
  }
}
```

#### React 19 中的 useOptimistic 优化感知响应

```tsx
// React 19 useOptimistic 实现乐观更新，减少等待期间的"卡顿感"
'use client';
import { useOptimistic, useState } from 'react';

function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes);
  const [optimisticLikes, addOptimistic] = useOptimistic(
    likes,
    (state, newLikes) => newLikes  // 立即更新 UI，不等待网络
  );

  async function handleLike() {
    addOptimistic(likes + 1);      // 乐观更新
    await fetch('/api/like', { method: 'POST' });
    setLikes(likes + 1);
  }

  return <button onClick={handleLike}>{optimisticLikes} 赞</button>;
}
```

#### INP 优化清单

```
目标：所有用户交互的 INP ≤ 200ms
─────────────────────────────────────────────────────
[ ] 长任务拆分：单个任务不超过 50ms，使用 scheduler.yield() 让步
[ ] 第三方脚本延迟加载：chatbot、分析工具用 script async/defer
[ ] 事件委托：减少重复绑定，同一父元素用 onClick 统一处理
[ ] CSS 动画：只用 transform/opacity，不触发 Layout/Paint
[ ] 懒加载非首屏组件：减少 JS Bundle 大小，加快 TTI
[ ] Web Worker：将重计算移出主线程（格式转换、加密等）
[ ] 减少 DOM 深度：DOM 节点数建议 < 1400（Google 基准）
[ ] React 19 useOptimistic：提升交互感知速度（UX 感知 INP）
```

> 📚 参考：五个超级有效优化 React 中 INP 的技巧（掘金 2025），https://juejin.cn/post/7468141313423638567

---

## 24.2 SEO Meta 标签体系

### 24.2.1 robots meta 指令

```tsx
// app/blog/[slug]/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: true,        // 允许爬虫索引（默认 true，可省略）
    follow: true,       // 跟随链接（默认 true，可省略）
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
import { Metadata } from 'next';

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
import { Metadata } from 'next';
import { getPost } from '@/lib/posts';

type Props = { params: { slug: string } };

// 静态生成（构建时）已知 slug 参数
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// 动态 metadata
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
      modifiedTime: post.dateModified,
      authors: ['张三'],
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
  };
}
```

### 24.2.4 结构化数据：JSON-LD Schema.org

**JSON-LD 是 Google 推荐的结构化数据格式，放置在 `<head>` 中的 `<script type="application/ld+json">` 内。**

#### 文章/博客类型（Article）

```tsx
// app/blog/[slug]/page.tsx 中添加 JSON-LD
export default async function BlogPost({ params }: Props) {
  const post = await getPost(params.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    author: {
      '@type': 'Person',
      name: '张三',
      url: 'https://example.com/about',
    },
    publisher: {
      '@type': 'Organization',
      name: '前端面试指南',
      logo: {
        '@type': 'ImageObject',
        url: 'https://example.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://example.com/blog/${params.slug}`,
    },
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 页面内容 */}
    </article>
  );
}
```

#### 常见 Schema 类型对照表

| 页面类型 | Schema.org @type | 关键字段 |
|---------|-----------------|---------|
| 博客文章 | `Article` / `BlogPosting` | headline, author, datePublished, image |
| 电商详情页 | `Product` | name, image, description, offers（price, availability） |
| 面包屑导航 | `BreadcrumbList` | itemListElement（position, name, item） |
| 常见问题 | `FAQPage` | mainEntity（Question + Answer） |
| 本地商家 | `LocalBusiness` | address, openingHours, geo |
| 视频内容 | `VideoObject` | duration, uploadDate, thumbnailUrl |
| 软件应用 | `SoftwareApplication` | operatingSystem, applicationCategory |

#### BreadcrumbList 示例（博客 + 分类）

```tsx
const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首页', item: 'https://example.com' },
    { '@type': 'ListItem', position: 2, name: '前端', item: 'https://example.com/category/frontend' },
    { '@type': 'ListItem', position: 3, name: post.title, item: `https://example.com/blog/${params.slug}` },
  ],
};
```

#### FAQPage 示例（服务/帮助页面）

```tsx
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Next.js 支持哪些渲染方式？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Next.js 支持 SSG（静态生成）、SSR（服务端渲染）、ISR（增量静态再生）和 CSR（客户端渲染），可根据页面特性灵活选择。',
      },
    },
    {
      '@type': 'Question',
      name: 'Core Web Vitals 的良好阈值是多少？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'LCP ≤ 2.5s，CLS ≤ 0.1，INP ≤ 200ms。达到这些阈值表示用户体验良好，有利于 Google 排名。',
      },
    },
  ],
};
```

#### 验证工具

- Google Rich Results Test：https://search.google.com/test/rich-results
- Schema.org 验证：https://validator.schema.org/

> 📚 参考：Next.js 15 Metadata 官方文档（2026），https://nextjs.org/docs/app/api-reference/functions/generate-metadata

---

## 24.3 渲染策略：SSR vs SSG vs ISR vs CSR

### 24.3.1 四种渲染模式详解

```
渲染模式     │ 渲染时机         │ HTML 来源          │ SEO   │ 首屏速度 │ 实时性
────────────┼────────────────┼──────────────────┼───────┼────────┼───────
CSR         │ 客户端          │ 空 HTML + JS 执行  │ 差*   │ 慢     │ 实时
SSR         │ 请求时（每次）    │ 服务器实时生成     │ 优    │ 快     │ 实时
SSG         │ 构建时（一次）    │ 预生成静态文件     │ 优    │ 最快   │ 静态
ISR         │ 构建时+后台再生成 │ 预生成+定时重新验证│ 优    │ 快     │ 近实时
PPR         │ 构建+请求混合    │ 静态骨架+动态流式  │ 优    │ 快     │ 实时
```

> *现代 Googlebot 能执行 JS（Web Rendering Service），但存在延迟抓取和不稳定问题。

### 24.3.2 决策表：何时使用哪种渲染策略

| 场景 | 推荐策略 | 理由 |
|------|---------|------|
| 博客文章、文档、帮助中心 | **SSG** | 内容不频繁变化，构建时生成，CDN 分发极快 |
| 商品详情页（SKU 大量） | **ISR** | 万级商品无法全量 SSG，ISR 按需再生成兼顾性能 |
| 用户个人中心、Dashboard | **CSR** | 个性化内容，SSG/SSR 无意义，纯客户端渲染 |
| 新闻/社交媒体动态内容 | **SSR** | 内容高度实时变化，必须每次请求获取最新数据 |
| 营销落地页/活动页 | **SSG** | 高流量，需要最快加载速度，内容固定 |
| 电商搜索结果页 | **SSR** | 实时库存、价格，千人千面 |
| 页面有动态区块+静态区块 | **PPR** | 部分预渲染，兼顾首屏速度与数据实时性 |
| SEO 关键 + 数据频繁变化 | **ISR** | SEO 友好 + 相对实时（可设 revalidate 按秒/分钟） |

### 24.3.3 Next.js 14 App Router 代码示例

#### SSG（静态生成）

```tsx
// app/blog/[slug]/page.tsx
// 默认即为静态生成（无 async data，或 fetch 时指定 cache: 'force-cache'）

export default async function BlogPost({ params }: Props) {
  // 默认静态生成，数据在构建时获取
  const post = await fetch(`https://api.example.com/posts/${params.slug}`, {
    cache: 'force-cache',      // 默认行为，显式标注
  }).then((r) => r.json());

  return <article><h1>{post.title}</h1><p>{post.content}</p></article>;
}

// 配合 generateStaticParams 预生成所有已知 slug
export async function generateStaticParams() {
  const posts = await fetch('https://api.example.com/posts').then((r) => r.json());
  return posts.map((post) => ({ slug: post.slug }));
}
```

#### ISR（增量静态再生）

```tsx
// app/products/[id]/page.tsx
// ISR：在构建时静态生成，但后台定时重新验证

export default async function ProductPage({ params }: Props) {
  // 每 60 秒重新验证（revalidate）一次
  // 首次访问触发生成，后续 60s 内返回缓存版本
  const product = await fetch(`https://api.example.com/products/${params.id}`, {
    next: { revalidate: 60 },  // ISR：60 秒后后台重新生成
  }).then((r) => r.json());

  return (
    <div>
      <h1>{product.name}</h1>
      <p>价格：{product.price}</p>
      {/* 实时库存可额外 CSR 获取 */}
    </div>
  );
}

// 使用 generateStaticParams + revalidate 实现增量生成
export async function generateStaticParams() {
  // 只预生成前 100 个热门商品
  const topProducts = await fetch('https://api.example.com/products/top100').then((r) => r.json());
  return topProducts.map((p) => ({ id: p.id }));
}

// 冷门商品首次访问时 SSR 降级，后续 ISR
export const dynamicParams = true;  // 允许动态处理未预生成的路径
```

#### SSR（服务端渲染）

```tsx
// app/news/page.tsx
// SSR：每次请求实时渲染

export default async function NewsPage() {
  // cache: 'no-store' 强制每次请求都重新获取数据
  const news = await fetch('https://api.example.com/news', {
    cache: 'no-store',         // SSR：禁用缓存
  }).then((r) => r.json());

  return (
    <ul>
      {news.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}

// 等价写法（Next.js 14 App Router 默认即为动态渲染）
export const dynamic = 'force-dynamic';  // 显式标记为 SSR
```

#### CSR（客户端渲染）

```tsx
// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user-stats')
      .then((r) => r.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      <h1>用户仪表盘</h1>
      <p>欢迎，{data.username}</p>
    </div>
  );
}
```

### 24.3.4 Next.js 15 部分预渲染（PPR）

**PPR（Partial Prerendering）将静态 HTML 骨架与动态流式内容结合，兼顾首屏速度与数据实时性。**

```tsx
// next.config.js（Next.js 15 实验性功能）
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: 'incremental',  // 增量启用 PPR
  },
};
module.exports = nextConfig;
```

```tsx
// app/products/page.tsx
// 静态骨架先展示，动态部分（Suspense）流式加载

import { Suspense } from 'react';

export default function ProductsPage() {
  return (
    <div>
      {/* 静态内容：立即渲染（SSG） */}
      <header><h1>商品列表</h1></header>

      {/* 动态内容：Suspense 边界内动态加载（SSR） */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductList />   {/* async 组件，数据每次请求实时获取 */}
      </Suspense>

      <Suspense fallback={<RecommendationSkeleton />}>
        <Recommendation />  {/* 个性化推荐，每次请求重新计算 */}
      </Suspense>
    </div>
  );
}

// ProductList.tsx
async function ProductList() {
  'use server';
  const products = await fetch('https://api.example.com/products', {
    cache: 'no-store',
  }).then((r) => r.json());

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

> 📚 参考：Next.js 15 PPR 部分预渲染（掘金 2024），https://juejin.cn/post/7477869412273012776

### 24.3.5 缓存策略配置总览

Next.js 15 对缓存体系做了统一（`fetch` 默认自动缓存）：

```tsx
// 缓存层级（由上到下）：CDN → Memory → Data Store

// 1. 静态（SSG）：默认不设置，永久缓存
const data1 = await fetch('https://api.example.com/static');

// 2. ISR（定期再生成）：60 秒后重新验证
const data2 = await fetch('https://api.example.com/products', {
  next: { revalidate: 60 },
});

// 3. SSR（实时）：每次请求不缓存
const data3 = await fetch('https://api.example.com/news', {
  cache: 'no-store',
});

// 4. 全路由级别的 revalidate（app router）
// app/data/page.tsx
export const revalidate = 300;  // 该路由下所有 fetch 默认 300 秒再验证

// 5. 静态导出（完全无服务器）
// next.config.js
const nextConfig = {
  output: 'export',   // 生成纯静态文件，可部署到任意 CDN/静态托管
};
```

---

## 24.4 预渲染策略进阶

### 24.4.1 SSG + ISR 组合：大规模内容网站最佳实践

```tsx
// app/articles/[category]/[slug]/page.tsx

// 预生成所有文章（按分类批量处理）
export async function generateStaticParams() {
  const categories = await getCategories();

  const paths = [];
  for (const cat of categories) {
    const articles = await fetch(
      `https://api.example.com/articles?category=${cat.id}&limit=20`
    ).then((r) => r.json());

    for (const article of articles) {
      paths.push({ category: cat.slug, slug: article.slug });
    }
  }
  return paths;  // 生成全部 20*分类数 个页面
}

// 热门文章 ISR（高流量页面，更新频繁）
const hotArticles = await fetch(
  `https://api.example.com/articles/popular`,
  { next: { revalidate: 30 } }  // 30 秒再生成
);

// 冷门文章 SSG（低流量，更新少）
const coldArticles = await fetch(
  `https://api.example.com/articles/cold`,
  { cache: 'force-cache' }        // 构建时生成，永不更新
);

// 动态路径允许（未预生成的访问触发 SSR 降级）
export const dynamicParams = true;
```

### 24.4.2 流式渲染 + Loading UI

```tsx
// app/dashboard/loading.tsx
// 在数据加载期间显示骨架屏，提升感知性能

export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
      <div className="h-4 w-32 bg-gray-100 rounded mb-8" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  );
}

// app/dashboard/page.tsx
export default function Dashboard() {
  return <DashboardContent />;  // Suspense 自动使用 loading.tsx
}
```

### 24.4.3 流式 SSR + React Suspense

```tsx
// app/products/page.tsx
// 服务端流式响应：大数据列表边加载边展示

import { Suspense } from 'react';

export default function ProductsPage() {
  return (
    <div>
      <h1>商品列表</h1>
      {/* 骨架屏立即展示，产品列表流式加载 */}
      <Suspense fallback={<TableSkeleton />}>
        <ProductTable />
      </Suspense>
      <Suspense fallback={<FilterSkeleton />}>
        <FilterPanel />         {/* 筛选器独立流式加载 */}
      </Suspense>
    </div>
  );
}

// 独立流式：每个 Suspense 边界独立响应
async function ProductTable() {
  const products = await fetchLargeDataset(); // 可耗时
  return <table>...</table>;
}

async function FilterPanel() {
  const filters = await fetchFilters();         // 可并行
  return <FilterUI filters={filters} />;
}
```

> 📚 参考：Next.js 渲染策略全解析（知乎 2025），https://zhuanlan.zhihu.com/p/29023516095

---

## 24.5 常见 SEO 陷阱与清单

### 24.5.1 常见 SEO 陷阱

```
陷阱类型              │ 具体表现                           │ 后果
─────────────────────┼──────────────────────────────────┼─────────────
重复内容             │ 同一文章多个 URL（?utm/参数/pagination）│ 权重分散
缺少 canonical       │ 无规范化链接，爬虫选择错误版本索引       │ 排名不稳
Meta robots 误配置   │ X-Robots-Tag 或 meta 误设 noindex    │ 整站/页面从索引消失
图片缺少 alt         │ 装饰性图片无 alt，或 alt 过度堆砌关键词  │ 图片搜索无流量 / 被惩罚
H1 滥用              │ 每个页面多个 H1，或一个 H1 也没有       │ 结构不清晰，权重分配混乱
重定向循环           │ 301 → 302 → 301 互相跳转              │ 爬虫死锁，页面无法收录
分页无规范           │ page/1 page/2 无 rel=prev/next          │ 重复内容 / 权重稀释
iframe 内容          │ 重要内容全放 iframe 内                 │ 爬虫无法抓取
JS 渲染陷阱          │ 纯 CSR，关键内容全靠 JS 生成            │ 无 JS 能力的爬虫漏抓
慢速 TTFB            │ 服务器响应 > 600ms                     │ LCP 不达标，排名下降
Robots.txt 阻塞      │ /api/* 或 /_next/* 被误 Disallow        │ JS/CSS 被阻止，CLS 飙升
移动端不可用         │ viewport 未设置，字体过小，按钮过密      │ 移动搜索排名受损
hreflang 错误        │ 语言版本 hreflang 指向自身 / 缺失        │ 国际 SEO 混乱
sitemap.xml 过期    │ 已删除页面仍在 sitemap，死链堆积         │ 爬虫浪费配额
结构化数据错误       │ JSON-LD 语法错误 / 属性不完整           │ 无法生成 Rich Snippet
```

### 24.5.2 完整 SEO 上线检查清单

#### 技术 SEO

```
[ ] 页面在 Google Search Console 中被成功索引
[ ] 所有关键页面有唯一、描述性的 <title>（30-60 字符）
[ ] 所有关键页面有唯一 <meta name="description">（150-160 字符）
[ ] 每个页面有且仅有一个 <h1>`
[ ] H2-H6 层级逻辑清晰（不跳级、不滥用）
[ ] 所有图片有描述性 alt 属性（非空alt给装饰性图片）
[ ] 图片指定 width/height 防止 CLS
[ ] 关键 LCP 图片使用 <link rel="preload"> + priority
[ ] canonical URL 设置正确，无重复版本
[ ] robots.txt 存在且正确配置（未阻止关键资源）
[ ] sitemap.xml 存在、格式正确、链接数 ≤ 5 万（超标则分拆）
[ ] hreflang 正确配置（多语言/多地区站点）
[ ] 移动端 viewport meta 标签存在
[ ] 移动端触摸目标尺寸 ≥ 48x48px
[ ] 页面无 X-Robots-Tag 意外阻止索引
[ ] 内部链接使用描述性锚文本（非"点击这里"）
[ ] 所有外部链接使用 rel="noopener"（安全）
[ ] favicon.ico / apple-touch-icon.png 存在
[ ] HTTPS 全站启用（无 HTTP 混布）
[ ] HTTP 301 重定向到 HTTPS（非 302）
[ ] 无 404 错误（或 404 页面有搜索/导航功能）
[ ] 无 5xx 服务器错误（或有优雅降级）
```

#### Core Web Vitals

```
[ ] LCP ≤ 2.5s（首屏内容加载快）
[ ] CLS ≤ 0.1（布局稳定，无意外偏移）
[ ] INP ≤ 200ms（交互响应及时）
[ ] TTFB ≤ 600ms（服务器响应快）
[ ] TBT ≤ 200ms（总阻塞时间低）
[ ] TTI 达标（页面可交互时间合理）
[ ] Lighthouse Performance Score ≥ 90
```

#### 结构化数据与社交

```
[ ] JSON-LD 语法通过 Google Rich Results Test 验证
[ ] 所有 JSON-LD 必填属性已填写（非空）
[ ] og:title / og:description / og:image / og:url 完整
[ ] og:image 尺寸 ≥ 1200x630px
[ ] Twitter Card 标签已配置
[ ] Article 类型包含 author、datePublished、image
[ ] Product 类型包含 price、availability
[ ] FAQ 页面使用 FAQPage 结构化数据
[ ] BreadcrumbList 在详情页使用
```

#### 内容与链接

```
[ ] 页面内容满足用户搜索意图（E-E-A-T）
[ ] 关键词自然出现在标题、前 100 词、H2、外链锚文本
[ ] 避免关键词堆砌（密度合理）
[ ] 提供原创、有价值的内容（非采集/低质）
[ ] 内链策略合理（重要页面深度 ≤ 3）
[ ] 导出链接指向高质量相关页面
[ ] 页面加载后 3 秒内主要内容可见
[ ] 广告/弹窗不遮挡主体内容（页面体验评分）
```

---

## 24.6 面试追问

### Q1：LCP 优化到 2s 后仍有波动，应该如何排查？

**参考答案：**

LCP 波动通常来自以下几个原因，需要分层排查：

1. **服务器 TTFB 波动**：检查是否有多地区 CDN 节点延迟差异、数据库连接池耗尽、边缘节点缓存命中率下降。使用 Cloudflare/Vercel Analytics 观察 P75/P95 TTFB 分布。

2. **资源加载竞争**：检查是否有第三方脚本（广告、分析工具）在 LCP 关键时间窗口内阻塞主线程。用 Lighthouse 的 Performance 面板查看 Long Tasks。

3. **网络条件差异**：CRuX 数据中 LCP 波动可能来自移动设备 4G 网络。Mobile LCP 目标应单独评估，对慢网络环境降级处理（减少首屏图片尺寸）。

4. **LCP 元素动态变化**：有时文字字体切换导致 LCP 元素从文字变成图片，需要检查 LCP 候选元素是否稳定。

5. **推荐排查顺序：**
   - PageSpeed Insights 查 CrUX 真实数据
   - Lighthouse DevTools Performance 面板找 Long Task
   - WebPageTest 查 LCP 资源瀑布图
   - Network 面板查 TTFB 分段（DNS + TCP + TLS + Response）

---

### Q2：SSR 和 SSG 各有什么不可替代的场景？

**参考答案：**

**SSG 不可替代的场景（构建时生成）：**
- 博客文章、文档站点：内容稳定，SSG + CDN 覆盖全球访问，最快 TTFB
- 营销落地页：SEO 关键 + 高并发，SSG 避免高并发击垮服务器
- CI/CD 流水线简单：内容从 CMS/文件数据库构建，无数据库依赖，构建失败概率低

**SSR 不可替代的场景（请求时生成）：**
- 实时性要求极高：股票交易、新闻、实时库存、搜索结果——SSG 再验证的"窗口期"不可接受
- 个性化内容：用户登录状态决定页面内容，SSG 的"千人一面"无法满足
- A/B 测试动态内容：不同用户看到不同内容（价格、推荐），SSR 按请求动态渲染

**实际工程选择：**
大多数现代 Next.js 应用采用混合策略——对营销页面、帮助文档用 SSG；对 Dashboard、用户页用 CSR；对高流量商品列表用 ISR。这样能最大化 CDN 缓存效益，同时保持数据实时性。

---

### Q3：Next.js 15 的 PPR（部分预渲染）和 ISR 有什么区别？各自适合什么场景？

**参考答案：**

**ISR**：以"页面"为粒度管理缓存，在构建时生成完整 HTML，后台定时（如 60s）重新生成。一次 revalidate 生成整个页面。

**PPR**：以"组件/区域"为粒度管理缓存，页面的静态骨架在构建时生成，动态 Suspense 边界在请求时流式渲染。

```
ISR 工作流：
  构建时 → 生成完整静态 HTML → 60s 后 → 重新生成完整 HTML（整个页面重绘）

PPR 工作流：
  构建时 → 生成静态 HTML 骨架（Suspense 边界留空） → 请求时 →
  骨架立即返回 + 动态区域流式填充（局部更新）
```

**选择建议：**

| 维度 | ISR | PPR |
|------|-----|-----|
| 数据实时性 | 几秒到分钟级 | 秒级（流式） |
| 实现复杂度 | 低 | 中（PPR 仍为实验性） |
| 适用场景 | 内容型页面（博客、商品列表） | 混合页面（静态主体 + 实时侧边栏） |
| CDN 缓存 | 整页缓存 | 部分缓存（静态骨架可缓存，动态区域按需） |
| 用户体验 | 再验证期间可能有短暂旧内容 | 静态骨架秒出，动态内容流式加载 |

> 📚 参考：Next.js 系统性教学：深入理解部分预渲染与边缘计算（CSDN 2024），https://blog.csdn.net/liuweni/article/details/144323619

---

### Q4：JSON-LD 结构化数据对 SEO 有直接排名提升吗？它的核心价值在哪里？

**参考答案：**

**明确答复：** Google 官方多次明确表示，结构化数据不是直接的排名因素（即添加 JSON-LD 不会直接提升关键词排名）。

**结构化数据的核心价值在于"搜索结果差异化"（SERP 优化）：**

1. **Rich Snippet 富媒体摘要**：在搜索结果中展示星级评分、价格区间、作者头像、面包屑路径等比竞品更醒目的展示效果，提升 CTR（点击率）。

2. **Sitelinks（网站链接）**：正确配置 BreadcrumbList 和 WebSite 结构化数据，可能触发 Google 生成子导航链接，增加品牌曝光和点击空间。

3. **知识图谱（Knowledge Graph）**：Organization、Article 结构化数据可能被纳入 Google 知识图谱，影响品牌词的展示。

4. **语音搜索优化**：结构化数据为语音助手提供清晰的实体关系，有助于语音查询答案提取。

**实际价值评估：** 对于电商（Product + Offer + Review）、本地商家（LocalBusiness）、食谱/视频内容，结构化数据的 Rich Snippet 对转化率的提升效果显著，ROI 很高。对普通博客站点的效果相对有限，但仍是"做了不亏"的基础设施投入。

---

> 📚 参考来源汇总：
> - MDN - Interaction to Next Paint，https://developer.mozilla.org/en-US/docs/Glossary/Interaction_to_next_paint
> - Next.js 官方文档 - Metadata & generateMetadata（App Router），https://nextjs.org/docs/app/api-reference/functions/generate-metadata
> - Next.js 15 PPR 部分预渲染解析（CSDN 2024），https://blog.csdn.net/liuweni/article/details/144323619
> - Next.js 15 缓存之道（掘金 2024），https://juejin.cn/post/7451599207235715098
> - 五个超级有效优化 React 中 INP 的技巧（掘金 2025），https://juejin.cn/post/7468141313423638567
> - 前端性能优化：LCP 与 CLS 指标的优化策略（CSDN 2025），https://blog.csdn.net/2501_93895491/article/details/154149853
> - Next.js 渲染策略全解析（知乎 2025），https://zhuanlan.zhihu.com/p/29023516095
> - SEO 基础知识：了解 robots.txt（腾讯云 2026），https://cloud.tencent.com/developer/article/2465349
> - 2026年谷歌SEO公司甄选指南（QQ.com 2026），https://so.html5.qq.com/page/real/search_news?docid=70000021_864695b194827652
> - 为网页添加结构化数据：Google 支持的 JSON-LD（CSDN 2019），https://blog.csdn.net/weixin_30517001/article/details/98526673
> - Next.js 14 完整指南：App Router 深度实践（CSDN 2026），https://blog.csdn.net/qq_40635035/article/details/160857774