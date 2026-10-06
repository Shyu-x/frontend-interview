---
title: 浏览器特性手写
description: 手写图片懒加载（IntersectionObserver）、虚拟列表与 JSONP。
tags:
  - coding
  - interview
  - browser
date: 2026-05-17
---

# 浏览器特性手写

## 1. 手写图片懒加载（IntersectionObserver）

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

## 2. 手写虚拟列表

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

## 3. 手写 JSONP

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

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行订单表格 | 手写虚拟列表 | TanStack Virtual、react-window、自研 | 行高固定才好算；变高行要缓存测量值 |
| 低端安卓机上的长图文列表首屏 | IntersectionObserver 懒加载 | 原生 loading="lazy"、自研 IO | 首屏图片排除在观察列表外 |
| 电商详情页的长评价区 | IO 懒加载 | 原生 loading + srcset | 占位宽高必须写，否则产生 CLS |
| 多人协作白板的页面缩略图 | IO 懒加载 | IO 加离屏 canvas 绘制 | 画布尺寸变化后要重新 observe |
| 嵌在第三方页面的报价挂件 | 手写 JSONP | JSONP 加超时重试 | 只支持 GET；回调名必须唯一 |
| 老系统 jQuery 页面的接口调用 | 手写 JSONP | JSONP 加全局回调清理 | 用完删 window 上的函数，防泄漏 |
| 移动端聊天记录列表 | 虚拟列表加 IO | 自研虚拟列表加触底加载 | 上滑加载历史要保住滚动锚点 |
| 广告位曝光统计 | IO 的 threshold | IO 加 sendBeacon | 曝光时长由业务定义，别只看 isIntersecting |
| 图片瀑布流 | 虚拟列表加 IO | 自研加列高缓存 | 列高动态，容器总高要重算 |

### 三个场景拆解

#### 场景 1：后台管理的万行订单表格

**业务背景**：运营要在同一页翻查全量订单，数据量随业务增长到上万行。直接渲染全部行时，滚动会出现掉帧，DevTools 里能录到长任务。

量级用可复现的说法：把接口返回的数组复制到 1 万条再打开页面，录制 10 秒滚动。

**怎么用本页知识解决**：思路是三件事，只渲染可视行、用 transform 移动内容层、滚动回调里只登记一帧任务。

```js
const rowHeight = 40;                              // 固定行高
const total = rows.length;                         // 总行数
inner.style.height = `${total * rowHeight}px`;     // 占位层撑出滚动条
function render() {
  const start = Math.floor(container.scrollTop / rowHeight);      // 首个可见行
  const visible = Math.ceil(container.clientHeight / rowHeight);  // 可见行数
  const end = Math.min(start + visible + 1, total);               // 多渲一行做缓冲
  content.style.transform = `translateY(${start * rowHeight}px)`; // 内容层平移到位
  const frag = document.createDocumentFragment();
  for (let i = start; i < end; i++) frag.appendChild(createRow(rows[i], i));
  content.replaceChildren(frag);                   // 一次替换，减少重排次数
}
container.addEventListener('scroll', () => requestAnimationFrame(render)); // 回调只登记帧任务
```

- 占位层 `inner` 负责撑高滚动条，内容层 `content` 绝对定位后靠 transform 移动，两者职责分开。
- `+1` 是缓冲行，快速滚动时不容易露白。
- 用 DocumentFragment 加 replaceChildren，把 DOM 写操作收成一次。
- 滚动回调里不直接渲染，把渲染推迟到帧回调，避免同一帧多次执行。
- 行高变化时清掉高度缓存，并重算占位层总高。

**怎么度量收益**：用 DevTools Performance 面板录 10 秒滚动，比较 Scripting 与 Rendering 时长、Long Tasks 条数。用 `document.querySelectorAll('tr').length` 或 Elements 面板看 DOM 行数。交互延迟用 web-vitals 上报 INP。

**什么时候不该用**：

- 数据只有几十条，虚拟列表带来的复杂度换不到可测的收益。
- 用户要用浏览器原生 Ctrl+F 查找内容或打印整张表，未渲染的行不会被找到。
- 行高由内容撑开且在同一次会话里频繁变化，测量缓存会失准。

#### 场景 2：低端安卓机上的长图文列表首屏

**业务背景**：列表页首屏之外还有长段图文，原实现一次性请求全部图片，蜂窝网络下首屏完成时间被拖长。量级用可复现的说法：把网速限制为 Slow 4G，看 Network 面板里 Img 请求的条数与瀑布流长度。

**怎么用本页知识解决**：真实地址先放 `data-src`，进入可视区再写回 `src`，用 rootMargin 提前加载，加载完就停止观察。

```js
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;   // 未进入可视区就跳过
    const img = entry.target;
    img.src = img.dataset.src;             // 把真实地址写回 src
    img.removeAttribute('data-src');       // 清标记，避免重复处理
    io.unobserve(img);                     // 停止观察，减少后续回调
  }
}, {
  rootMargin: '300px 0px',                 // 上下各提前 300px 触发
  threshold: 0                             // 有一条边进入就回调
});
document.querySelectorAll('img[data-src]').forEach((img) => io.observe(img));
```

- `rootMargin` 决定提前量，取值要按最慢网络下单张图的下载时长来定。
- `threshold: 0` 表示边界刚接触就触发，图片场景不需要等到整张露出。
- 加载后立刻 `unobserve`，回调次数不会随滚动反复增长。
- 首屏图片不放进观察列表，否则会把 LCP 往后推。
- 占位宽高要写在 HTML 属性里，写回 `src` 后不引起布局偏移。

**怎么度量收益**：Lighthouse 按移动端配置跑一遍，看 LCP 与 `offscreen-images` 这条审计。Network 面板按 Img 过滤，统计请求条数与传输体积。LCP 用 PerformanceObserver 监听 `largest-contentful-paint` 后上报。

**什么时候不该用**：

- 首屏可见的那张主图，懒加载会推迟 LCP。
- 图片需要被打印，或被保存整页的工具抓取时。
- 布局靠图片自身尺寸撑开，而占位宽高没写，开启懒加载会引入 CLS。

#### 场景 3：嵌在第三方页面的报价挂件调老接口

**业务背景**：报价挂件要嵌入合作方页面，挂件自己的接口在老系统上，只开放 GET，返回 callback 包裹的数据。挂件体积小，不引入带 fetch 封装的构建产物。

**怎么用本页知识解决**：动态建 script 标签，回调名唯一，超时和网络错误都要有终态，用完清理全局函数与节点。

```js
function jsonp(url, params, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const cb = `__jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`; // 唯一回调名
    const script = document.createElement('script');
    const timer = setTimeout(() => cleanup(reject, new Error('timeout')), timeout); // 超时兜底
    function cleanup(done, arg) {
      clearTimeout(timer);
      delete window[cb];                     // 删除全局回调，避免残留
      script.remove();                       // 移除 script 节点
      done(arg);
    }
    window[cb] = (data) => cleanup(resolve, data); // 服务端调用这个全局函数
    script.src = `${url}?${new URLSearchParams({ ...params, callback: cb })}`;
    script.onerror = () => cleanup(reject, new Error('network'));
    document.head.appendChild(script);
  });
}
```

- 回调名带时间戳与随机串，同页多次调用不会互相覆盖。
- `setTimeout` 兜住超时，`script.onerror` 只覆盖网络层失败。
- `cleanup` 同时清定时器、全局函数和节点，三样都要做。
- 参数只能进查询串，服务端需要 POST 或自定义头时这套用不了。
- HTTP 状态码拿不到，服务端要把错误写在回调数据里。

**怎么度量收益**：在超时分支和 onerror 分支里打点，统计超时率与失败率。Network 面板看脚本的排队与响应时间。回调耗时由服务端日志记录，与前端打点的时间戳对齐。

**什么时候不该用**：

- 接口需要 POST、需要自定义请求头，或需要读响应状态码。
- 响应里含敏感数据，因为 JSONP 是当脚本执行的，没有同源策略保护。
- 服务端无法按 callback 参数包裹返回值。

### 行业先进实践

原生 `loading="lazy"`（出处：MDN 的 HTMLImageElement loading 属性文档 / HTML Standard）

给非首屏的 img 与 iframe 加上该属性，加载时机由浏览器决定，滚动时不占用主线程回调。项目里可以先用它覆盖大部分图片，再对需要自定义提前量的位置补 IntersectionObserver。浏览器支持范围需核对 MDN 兼容表当前状态。

IntersectionObserver v2 的 trackVisibility（出处：W3C Intersection Observer 规范）

它在 isIntersecting 之外给出元素是否真的被用户看到的判断，能排除被遮挡和透明隐藏的情况，曝光统计会用到。使用前需核对官方文档：规范推进状态，以及各浏览器对 trackVisibility 的支持情况。

虚拟列表库的动态行高处理（出处：开源项目 TanStack Virtual、react-window）

TanStack Virtual 提供 measureElement 回调缓存实测行高，react-window 用 VariableSizeList 接收 itemSize 函数。项目可以先用固定行高跑通，再接入测量缓存处理变高行。滚动锚点与容器总高的重算逻辑建议直接复用库的实现。

`content-visibility: auto`（出处：MDN 的 content-visibility 文档）

它让浏览器跳过屏外元素的渲染工作，DOM 结构不变。与虚拟列表的取舍不同：一个保留 DOM，一个删减 DOM。长文档页面可以先用它，DOM 节点数本身成为瓶颈时再上虚拟列表。

JSONP 到 CORS 的迁移（出处：MDN 的跨源资源共享 CORS 文档）

服务端返回 Access-Control-Allow-Origin 等响应头后，前端可用 fetch 或 XHR，能拿状态码、支持 POST、能设请求头。项目里新接口按 CORS 设计，JSONP 通道保留但加上失败监控，逐步下线。

### 从学到用：落地路线

第 1 步：试点。先在后台行数最多的那个表格页接入虚拟列表，验收标准是 DOM 行数不随总行数增长。

第 2 步：验证。用 DevTools Performance 录 10 秒滚动，对比改动前后的 Scripting 时长与长任务条数，验收标准是滚动期间没有超过 50ms 的长任务。

第 3 步：推广。把渲染逻辑抽成组件替换同类列表，并给所有非首屏图片加 `loading="lazy"`，验收标准是仓库里不再有直接渲染全量行的列表代码。

第 4 步：防回退。把 LCP 与 INP 上报接进监控，在 CI 里加页面 DOM 节点数上限检查，验收标准是出现回退时能从监控面板定位到页面与版本。

### 动手作业

**目标**：做一个练习页，同时跑通万行表格虚拟列表、图片懒加载、老接口 JSONP 三个手写实现。

**步骤**：

1. 起一个静态页面，用脚本生成 1 万条订单假数据，字段含订单号、金额、状态、缩略图地址。
2. 先按全量渲染，用 DevTools Performance 录 10 秒滚动，记下 Scripting 时长与 DOM 行数。
3. 改成虚拟列表：占位层撑高、只渲染可视行、滚动回调里只做 requestAnimationFrame 登记。
4. 给行内缩略图加 `data-src` 与 IntersectionObserver，rootMargin 设 300px，加载后 unobserve。
5. 用本地 Node 服务提供 `/api/list`，按 callback 参数返回 `cb(data)` 形式的脚本，前端用上面那段 jsonp 调用。
6. 再录一次 10 秒滚动，把两次结果写进 README。
7. 断网一次、把接口延迟调到 6 秒，观察超时分支与占位图表现。

**验收标准**：

- DOM 中 tr 行数只与可视区高度相关，把总行数改成 2 万时行数不增长。
- Network 面板里图片请求在滚动到附近才出现，首屏图片在首次加载就出现。
- 接口延迟 6 秒时页面给出超时提示，且 window 上没有残留的回调函数。
- README 里列出两次录制的 Scripting 时长与长任务条数。
- 连续滚动 10 秒，Performance 面板中没有超过 50ms 的长任务。

