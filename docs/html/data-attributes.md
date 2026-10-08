---
title: data-* 自定义属性
description: data-* 属性、dataset API、类型转换、框架中的用法以及与 ARIA 的关系。
---

# data-* 自定义属性

## 1. 概念定义

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

## 2. dataset API vs getAttribute

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

### 2.1 命名转换规则

```
data-user-name  →  dataset.userName（烤肉串 → 驼峰）
data-userId     →  dataset.userId（保持）
data-item       →  dataset.item
```

## 3. 存储模式与类型转换

### 3.1 基本类型

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

### 3.2 存储模式对比

| 存储方式 | 适用场景 | 特点 |
|---------|---------|------|
| `data-id="123"` | 简单数字 ID | 直接访问，最快 |
| `data-tags="a,b,c"` | 简单列表 | split(',') 解析 |
| `data-config='{"key":"value"}'` | 复杂对象 | JSON.stringify/parse |
| `data-user-id` | 复合命名 | 驼峰式访问 |

## 4. data-* 与 React/Vue

### 4.1 React 中的 data 属性

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

### 4.2 Vue 中的 data 属性

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

### 4.3 TypeScript 类型定义

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

## 5. CSS 选择器中的 data-*

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

## 6. data-* 与 ARIA 的关系

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

## 7. 常见陷阱

```javascript
// 陷阱1: 直接赋值对象（不会自动 JSON.stringify）
el.dataset.config = { theme: 'dark' };
el.dataset.config; // '[object Object]' 错误

// 正确
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

## 8. 面试 follow-up 问题

### 8.1 Q1: `dataset.id` 和 `getAttribute('data-id')` 有什么区别？

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

### 8.2 Q2: data-* 属性和 React state/props 的区别和使用场景？

**答案：**
| 场景 | 推荐 | 原因 |
|------|------|------|
| 简单 UI 状态（如展开/收起） | `data-*` | 纯 HTML/原生 JS 即可实现 |
| 组件内部状态 | `useState` / `ref` | React 响应式渲染 |
| 跨组件共享数据 | `useContext` / `zustand` | 全局状态管理 |
| DOM 操作需要的数据 | `data-*` | 如拖拽、第三方库集成 |
| 动态样式 | CSS 变量 + `data-*` | `div[data-theme="dark"]` |

---

### 8.3 Q3: data-* 属性在 SSR 场景下有什么注意事项？

**答案：**

1. **Hydration 不匹配**：SSR 和客户端 dataset 访问方式相同，但注意 data-* 必须是字符串
2. **序列化**：SSR 时，`data-config` 必须是 JSON 字符串（`JSON.stringify`），而非对象
3. **安全性**：data-* 内容会出现在 HTML 中，**不要存放敏感信息**（token、密码）
4. **SEO**：data-* 属性对爬虫无意义（不是语义标记），用于存储而非展示内容

---

> 参考：
>
> - https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
> - https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-*

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN CSS 自定义属性](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) | 厘清 data-* 与 CSS 自定义属性的边界，避免两者混用。 | 读属性继承与 var() 回退一节，带着「何时用 data-*、何时用变量」的问题读，再写亮暗主题对比。 |
| [MDN CSS 文档](https://developer.mozilla.org/zh-CN/docs/Web/CSS) | 权威速查属性选择器与相关 CSS 语法入口。 | 按选择器模块读概述，再用参考页查 [data-x] 写法，回项目替换手写选择器。 |
| [MDN 选择器模块](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors) | 属性选择器系统练习，直接服务 data-* 状态样式。 | 练习属性选择器与 :has，为每个用例写 data-* 版本，观察特异性变化。 |
| [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) | 理解 data-* 与 ARIA 的分工：语义归 ARIA，样式与钩子归 data-*。 | 读对话框与选项卡模式，注意 role/aria-* 如何与 data-state 配合，再对照自己的组件。 |
| [MDN 使用自定义元素](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) | observedAttributes 与 dataset 配合的官方说明，落到代码层。 | 读生命周期回调一节，实现一个监听 data-* 属性变化的自定义元素。 |
| [MDN 特异性](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity) | data-* 属性选择器会抬高特异性，读它才能避免覆盖失控。 | 手算 [data-x]、[data-x="y"] 的权重，再用 DevTools 验证层叠结果。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Lit 文档](https://lit.dev/docs/) | 在真实组件里看属性与 data-* 如何声明、传递与复用。 | 读组件属性一章，写一个接受 data-* 的 Lit 元素并在页面中复用。 |
| [MDN MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) | 演示如何监听 data-* 变更，补上 dataset 无变更事件的缺口。 | 读 observe 配置与回调示例，写脚本监听属性变化，理解回调触发时机。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Josh Comeau：自定义 CSS Reset](https://www.joshwcomeau.com/css/custom-css-reset/) | 真实项目中属性选择器与状态标记的写法范式。 | 逐条看重置规则里的属性选择器用法，裁剪成适合自己项目的版本。 |
| [Josh Comeau：常见初学者错误](https://www.joshwcomeau.com/react/common-beginner-mistakes/) | 对照常见错误清单，检查 dataset 与属性写法是否踩坑。 | 通读清单，逐条对照项目代码，标记属性命名与类型转换相关问题。 |
| [Josh Comeau：React 专题](https://www.joshwcomeau.com/react/) | React 中处理 DOM 属性与副作用，可延伸到 data-* 写法。 | 挑状态与副作用相关篇目阅读，动手改演示参数，验证属性传递行为。 |

## 应用与行业实践

前面几节讲的是机制，本节讲这些机制在真实项目里落在哪里。判断标准只有一条：这段属性值是否会被脚本读取、被 CSS 命中、被测试或无障碍工具使用。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行订单表格，行内按钮触发操作 | dataset API vs getAttribute、存储模式与类型转换 | 事件委托 + `dataset.rowId` | dataset 读出的是字符串，参与计算前要转换 |
| 低端安卓机上的商品图首屏加载 | 存储模式与类型转换、常见陷阱 | IntersectionObserver + `data-src` | 首屏可视区内的主图不要走懒加载 |
| 多人协作白板的元素锁定提示 | data-* 与 React/Vue、CSS 选择器中的 data-* | 框架状态 + `data-lock` 枚举 | 每帧变化的坐标写进属性会触发样式重算 |
| 电商商品卡的曝光与点击埋点 | 概念定义、命名规则、常见陷阱 | `data-track-id` + 事件委托 | 埋点值高频变化会持续改动 DOM |
| 表单控件的校验错误态样式 | CSS 选择器中的 data-*、data-* 与 ARIA 的关系 | `[data-invalid="true"]` 属性选择器 | 错误提示仍需读屏软件可播报，不能只靠颜色 |
| UI 组件库的尺寸与主题变体 | CSS 选择器中的 data-*、存储模式 | `data-size="sm"` 替代 class 拼接 | 展开、选中这类语义状态交给 `aria-*` |
| 服务端渲染页面的初始参数传递 | data-* 与 React/Vue、存储模式 | `data-props` 传小体积初始值 | 值只能是字符串，结构体要序列化，避免塞大对象 |
| 端到端自动化测试的定位选择器 | 概念定义、data-* 与 ARIA 的关系 | `data-testid` + Testing Library | 有可访问语义查询可用时不用 testid |
| 拖拽排序列表的元素占位 | dataset API、CSS 选择器中的 data-* | `data-index` 记录位置 | 排序后要同步更新属性，否则读到旧值 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格行内操作

**业务背景**：订单表每行有 3 个操作按钮，早期用 class 拼选中态，筛选和高亮会互相覆盖。行数达到千级时，初始化阶段要为每行绑定监听器，耗时随行数线性增长。

**怎么用本页知识解决**：把"哪个行、做什么动作、是否选中"写进属性，监听器只挂一层，样式交给属性选择器。

```js
// HTML: <tr data-row-id="10086" data-selected="false">
table.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]')
  if (!btn) return
  const row = btn.closest('tr')
  const rowId = Number(row.dataset.rowId)  // data-row-id 映射为 rowId，值仍是字符串
  handle(btn.dataset.action, rowId)        // data-action 取值：view / refund / close
  row.dataset.selected = 'true'            // 选中态写枚举值，交给 CSS 渲染
})
// CSS: tr[data-selected="true"] { background: #eef; }
```

- 事件委托让监听器数量与行数无关，虚拟滚动重建行时不需要重新绑定。
- `dataset.rowId` 与 `getAttribute('data-row-id')` 结果相同，前者少写连接符，后者不经过驼峰转换。
- dataset 的返回值都是字符串，`Number()` 转换后再做比较，避免 `"10" > "9"` 为假这类问题。
- 视觉状态只保留一个枚举属性，CSS 集中命中，不再手工增删 class。
- 框架重渲染会覆盖手工写入的属性，状态需要由同一份数据源派生。

**怎么度量收益**：用 DevTools Performance 面板录制列表初始化阶段，对比 Scripting 与 Recalculate Style 两项耗时，同一数据集前后各测 5 次取中位数。在包装过的 `addEventListener` 里计数，确认监听器总数不随行数增长。用 `PerformanceObserver` 订阅 `longtask`，观察渲染期间的长任务条数变化。

**什么时候不该用**：

- 需要把整行业务对象挂在节点上时，属性会被序列化进 HTML，应改为内存 Map 按 id 索引。
- 行内包含用户输入的富文本时，不要写进 data-*，内容会被截图工具和采集脚本读到。
- 服务端分页且单页只有十几行时，直接逐行绑定监听器的代码路径更短，没有必要抽象。

#### 场景 2：低端安卓的首屏图片加载

**业务背景**：商品列表页首屏同时请求全部图片，浏览器对同域名的并发连接有限制，排队请求会拉长首屏渲染。可用 Network 面板的请求瀑布图复现排队现象。

**怎么用本页知识解决**：真实地址先存在 `data-src`，元素进入视口后再写入 `src`，浏览器此时才发起请求。

```js
// HTML: <img data-src="/p/1001.jpg" alt="商品图" width="300" height="200">
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) return
    const img = entry.target
    img.src = img.dataset.src        // 进入视口才发起请求
    img.removeAttribute('data-src')  // 清掉标记，避免重复处理
    io.unobserve(img)
  }
}, { rootMargin: '200px' })          // 提前 200 像素开始加载
document.querySelectorAll('img[data-src]').forEach((img) => io.observe(img))
```

- `data-src` 只是字符串容器，`dataset.src` 与 `getAttribute('data-src')` 读到的内容一致。
- 保留 `width` 与 `height` 属性固定占位尺寸，图片到达后布局不跳动。
- 加载完成即 `removeAttribute` 并 `unobserve`，避免同一元素被反复处理。
- `rootMargin` 决定提前量，按实测的滚动速度调整，值过大会退回成首屏全量请求。

**怎么度量收益**：在 Lighthouse 里选移动端节流预设，对比改动前后的 LCP 与 TBT，各跑 3 次。用 Network 面板统计首屏时间窗口内的请求条数与最后一条请求的结束时间。线上用 web-vitals 上报 `onLCP` 与 `onCLS` 的分位数。

**什么时候不该用**：

- 首屏可视区内的主图不要延迟加载，会推迟 LCP 候选元素的加载。
- 浏览器原生 `loading="lazy"` 已能满足需求时，自写观察器会增加一份维护成本。
- 图片地址需要服务端签名且会过期时，属性里缓存的旧地址会导致请求被拒。

#### 场景 3：多人协作白板的元素状态

**业务背景**：多个客户端同时编辑同一块画布，需要显示哪个元素被谁锁定，冲突提示要即时反映。元素数量在几百个量级，光标位置每秒上报数次。

**怎么用本页知识解决**：高频数据留在内存与绘制层，DOM 上只写低频枚举状态，供 CSS 和自动化测试读取。

```js
function paintNode(el, node) {
  el.dataset.nodeId = node.id
  el.dataset.lock = node.lockOwner ? 'locked' : 'free' // 只写枚举，不写用户名
  el.textContent = node.text                            // 文本走正常渲染
}

// 光标位置每秒变化多次，只改内存与绘制，不写 data-*
cursorLayer.style.transform = `translate(${x}px, ${y}px)`
```

- `data-lock` 只有两个取值，CSS 用 `[data-lock="locked"]` 画边框，一次改动只触发一次样式重算。
- 坐标这类高频数据不写属性：每次写属性都会走属性变更流程，性能面板的 Recalculate Style 会随之上升。
- 给 `dataset.lock` 赋 `undefined` 会把字符串 `"undefined"` 写进属性，赋值前用条件判断兜底。
- Vue 的 `:data-lock` 与 React 的 `data-lock` 都能落到真实属性，但重渲染会覆盖手工写入的值。
- 用户名这类自由文本不写进属性，避免被采集脚本读到。

**怎么度量收益**：用 Performance 面板录制一次 5 秒拖动操作，看 Rendering 分类下 Recalculate Style 与 Layout 的时间占比。用 `PerformanceObserver` 统计 `longtask` 条数。自建打点记录从收到远端补丁到本地 DOM 更新的时间差，用 `performance.now()` 采样。

**什么时候不该用**：

- 每帧都在变的元素坐标不要写进 data-*。
- 需要传结构化数据（整条操作日志、完整节点树）时用内存对象或服务端同步，属性只适合短字符串。
- 元素数量大到需要改用画布渲染时，DOM 属性方案本身不再适用。

### 行业先进实践

**data-testid 作为兜底选择器（出处：Testing Library 官方文档）**：文档建议优先用 role、label、text 这类可访问查询，`getByTestId` 只在没有可用语义时使用。原因是语义查询同时验证了无障碍表现，而 testid 只验证实现细节。借鉴方式：给关键交互元素加 `data-testid`，并在评审清单写明"能用 role 查询就不用 testid"。

**组件状态暴露为 data-state（出处：Radix UI 官方文档的 Styling 一节）**：组件把开合、朝向等状态写成 `data-state`、`data-side` 一类属性，样式用属性选择器命中，不再拼接状态 class。属性名固定，样式与组件内部实现解耦。借鉴方式：把视觉状态收敛为有限枚举属性，属性名与取值写进组件文档。需核对官方文档：具体组件暴露的属性清单与合法取值。

**组件库属性的命名空间前缀（出处：Bootstrap 官方文档的组件章节，例如 `data-bs-toggle`、`data-bs-target`）**：框架给自有属性加 `bs-` 前缀，与页面作者自有的 `data-*` 隔开，双方升级时不易冲突。借鉴方式：团队自研属性统一加前缀，例如 `data-app-*`，并在 lint 里拒绝无前缀的新属性。

**原生懒加载（出处：MDN 的 img 元素文档与 web.dev 的图片加载相关文章）**：`loading="lazy"` 由浏览器决定加载时机，不需要自己维护 `data-src` 与观察器。浏览器还会结合网络状况与滚动位置调整提前量。借鉴方式：新项目先评估原生属性是否满足，再决定是否自建方案。

**无障碍状态归 aria-*，样式钩子归 data-*（出处：WAI-ARIA Authoring Practices）**：展开、选中、禁用这类状态通过 `aria-expanded`、`aria-selected` 暴露，读屏软件据此播报。`data-*` 只用于样式命中，不承担语义。借鉴方式：把 `aria-*` 当唯一语义来源，`data-*` 从同一份组件状态派生。

### 从学到用：落地路线

1. 试点：挑一个新写的列表或表格组件，把状态 class 换成 `data-*` 枚举属性。验收标准：该组件源码里搜索状态 class 名（如 selected、disabled）返回 0 处。
2. 验证：为读取 dataset 的代码补单元测试，覆盖字符串到数字、字符串到布尔的转换。验收标准：转换函数测试全部通过，且包含一个属性缺失的用例。
3. 推广：把前缀规则、取值规则、禁止存放结构化数据写进团队前端约定，并加入代码评审模板。验收标准：约定文档合并，评审模板中出现对应的可勾选项。
4. 防回退：在 CI 加一条脚本，扫描源码中的 `data-*` 命名与 JSON 字面量属性值。验收标准：故意提交一处 `data-json='{"a":1}'` 时 CI 报错。

### 动手作业

**目标**：给一个静态商品列表页加上状态筛选、点击埋点、自动化测试三件事，全部通过 `data-*` 实现。

**步骤**：

1. 准备 20 条商品数据，每条含 id 与类目，渲染成卡片，每张卡片写 `data-product-id` 与 `data-category`。
2. 容器上写 `data-filter`，用属性选择器实现筛选，例如 `[data-filter="book"] .card:not([data-category="book"]) { display: none; }`。
3. 用事件委托监听卡片点击，从 `dataset` 读出 productId，经 `Number()` 转换后推入内存里的埋点队列。
4. 给筛选按钮与卡片加 `data-testid`，写两个测试：点击筛选后可见卡片数量变化；点击卡片后队列长度加一。
5. 用 DevTools Performance 面板录制一次筛选操作，记录 Recalculate Style 时间。
6. 把埋点队列改成每秒批量写入一次 `data-track-count`，观察属性写入次数与样式重算的关系。
7. 在样式表里用 `grep '\[data-'` 列出全部属性选择器，确认规则集中在一处。

**验收标准**：

- 源码中没有为状态拼接 class，搜索 `class="card active"` 一类写法返回 0 处。
- 筛选后可见卡片数量与数据中该类目的条数一致，测试可复现。
- `dataset` 读出的 productId 已转换为 number 类型，测试里有类型断言。
- 点击埋点队列长度与点击次数一致，重复点击同一卡片会计数两次。
- 全部属性选择器能用一条 grep 命令列出，且集中在样式表同一区块。

