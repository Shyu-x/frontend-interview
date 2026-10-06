---
title: Web Components 与 Shadow DOM
description: Custom Elements、Shadow DOM、Template 与 Slot 的原理与用法。
---

# Web Components 与 Shadow DOM

## 1. 定义与核心原理

**Web Component** 是一套原生 Web 平台技术栈，包含三个核心规范：
- **Custom Elements**：创建自定义 HTML 标签（`class MyElement extends HTMLElement`）
- **Shadow DOM**：样式和 DOM 结构的隔离封装
- **HTML Templates**（`<template>` + `<slot>`）：可复用的组件结构模板

**核心价值：**
- 跨框架复用（Angular / React / Vue / 原生均可使用）
- 原生支持，无需构建工具
- 样式天然隔离，不会污染全局

## 2. Custom Elements 生命周期详解

```javascript
class MyCounter extends HTMLElement {
  constructor() {
    super();
    // ① 在构造函数中初始化：创建 Shadow DOM，绑定事件监听
    this.attachShadow({ mode: 'open' });
    this._count = 0;
  }

  // ② 元素首次插入 DOM 时调用
  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <button id="dec">-</button>
      <span id="count">${this._count}</span>
      <button id="inc">+</button>
    `;
    this.shadowRoot.querySelector('#inc').onclick = () => this.#increment();
    this.shadowRoot.querySelector('#dec').onclick = () => this.#decrement();
  }

  // ③ 元素从 DOM 中移除时调用
  disconnectedCallback() {
    console.log('元素已从 DOM 移除，清理资源');
  }

  // ④ 元素属性变化时调用（需在 static observedAttributes 中声明监听哪些属性）
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'count') {
      this._count = Number(newValue);
      this.shadowRoot.querySelector('#count').textContent = newValue;
    }
  }

  // ⑤ observedAttributes 静态 getter：声明要监听哪些属性
  static get observedAttributes() { return ['count']; }

  // ⑥ 元素移动到新文档时调用（极少用）
  adoptedCallback() {}

  #increment() {
    this._count++;
    this.setAttribute('count', this._count);
  }
  #decrement() {
    this._count--;
    this.setAttribute('count', this._count);
  }
}

// 注册（标签名必须包含连字符，如 x- / my-，避免与原生标签冲突）
customElements.define('my-counter', MyCounter);
```

```html
<!-- 使用 -->
<my-counter count="0"></my-counter>
<!-- JS 动态控制 -->
<script>
  const counter = document.querySelector('my-counter');
  counter.setAttribute('count', '10');
  // 观察变化：attributeChangedCallback 触发
</script>
```

## 3. Shadow DOM 样式隔离原理

**什么是 Shadow DOM？**
每个 Shadow DOM 有一个**Shadow Root**（根节点），Shadow Root 内的 DOM 形成一棵独立的子树，与主文档 DOM 完全隔离。

**样式渗透规则：**

```html
<!-- 外部 CSS 无法渗透进 Shadow DOM -->
<style> my-card { color: red; } </style>  <!-- 错误：不生效，Shadow DOM 隔离 -->

<!-- :host 伪类：选择自定义元素本身（Shadow DOM 根元素） -->
<style>
  :host { display: block; }
  :host([disabled]) { opacity: 0.5; }       /* 根据宿主属性样式化 */
  :host-context(.dark-theme) { color: white; } /* 根据祖先.is-dark 样式化 */
</style>

<!-- ::slotted()：选择被插入的插槽内容（只能做有限样式） -->
<style>
  ::slotted(*) { color: inherit; }      /* 正确：可样式化 */
  ::slotted(h1) { font-size: 2em; }    /* 正确：可样式化 */
  ::slotted(h1 .title) { ... }        /* 错误：无法穿透插槽，CSS 选择器不支持 */
</style>

<!-- CSS 变量（Custom Properties）：跨 Shadow Boundary 传递样式 -->
<!-- 父组件： -->
<my-card style="--card-bg: #f0f0f0; --card-padding: 16px;">

<!-- Shadow DOM 内部： -->
<div class="card" style="background: var(--card-bg); padding: var(--card-padding);">
```

## 4. Slot 插槽机制详解

**默认插槽 vs 具名插槽：**

```html
<my-layout>
  <h1 slot="header">页面标题</h1>      <!-- 匹配 name="header" 的插槽 -->
  <p>正文内容</p>                       <!-- 进入默认插槽（无 name 属性） -->
  <p slot="footer">页脚</p>           <!-- 匹配 name="footer" 的插槽 -->
</my-layout>
```

```javascript
class MyLayout extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <header><slot name="header"></slot></header>
      <main><slot></slot></main>
      <footer><slot name="footer"></slot></footer>
    `;
  }
}
```

**插槽内容分发规则：**
- 有 `slot="X"` 属性的节点 → 进入 `name="X"` 的具名插槽
- 无 `slot` 属性的节点 → 进入默认 `<slot>`（无名插槽）
- 多个节点指定同一 `slot` → 按文档顺序依次填入
- 插槽内容**仍属于主文档**（可被主文档 CSS 样式化，但受 `::slotted()` 限制）

**插槽事件（面试加分项）：**
```javascript
// slotchange 事件：插槽内容变化时触发
const slot = this.shadowRoot.querySelector('slot');
slot.addEventListener('slotchange', (e) => {
  const nodes = e.target.assignedNodes(); // 获取分配到此插槽的节点
  console.log('插槽内容已变化，当前节点数:', nodes.length);
});
```

## 5. Shadow DOM vs iframe 对比

| 维度 | Shadow DOM | iframe |
|------|-----------|--------|
| 隔离程度 | 样式隔离 + DOM 隔离（节点不在主文档树中） | 完全隔离（独立 document/global/window） |
| 通信方式 | 通过 props/events/CSS 变量 | postMessage |
| 性能开销 | 极小（无额外文档解析） | 大（独立 HTML 解析、JS 上下文） |
| URL 共享 | 共享父页面 URL/History/Cookie | 独立 URL（可设 src） |
| 样式继承 | 可通过 CSS 变量穿透 | 不行（除非 postMessage 通知） |
| SEO | 可被爬虫解析（主文档 HTML 包含组件标签） | iframe 内容取决于是否有 robots 访问权限 |
| 适用场景 | UI 组件库、跨框架复用 | 第三方内容隔离（广告/沙箱）、多团队独立部署 |

## 6. Web Component 与 Vue Slot / React Children 对比

| 维度 | Web Component Slot | Vue Slot | React Children |
|------|--------------------|---------|----------------|
| 分发依据 | `slot` 属性名 | `v-slot` 指令 | 组件 JSX 中的位置 |
| 样式隔离 | 是 Shadow DOM | 否 透传（可用 scoped CSS 限制） | 否 透传（可用 CSS Modules） |
| 跨框架 | 是 原生，任意框架使用 | 否 仅 Vue | 否 仅 React |
| 默认内容 | `<slot>默认文本</slot>` | `<slot>默认文本</slot>` | `props.children ?? 默认内容` |
| 作用域插槽 | 否 不支持（但可通过 props 实现） | 是 支持 | 是 render props |

## 7. 高频面试追问

**Q1：Web Component 的 `customElements.define('my-element', ...)` 中，标签名必须包含连字符，这是为什么？**
> HTML 规范要求：所有自定义标签名必须包含连字符（`-`），以确保与未来可能加入的原生 HTML 标签不会冲突。例如 `<my-element>` 不可能与原生标签冲突，而 `<customelement>` 可能在未来原生支持该标签时产生歧义。这是 W3C 的刻意设计——通过命名空间约定避免冲突。

**Q2：Shadow DOM 的样式隔离是 100% 安全的吗？有什么方式可以穿透？**
> 不是 100%。穿透方式：
> 1. **CSS 变量（Custom Properties）**：`--color: red` 可穿过 Shadow Boundary
> 2. **`:host-context()`**：根据祖先元素匹配 Shadow Root
> 3. **JavaScript**：在 open 模式下可通过 `element.shadowRoot` 直接操作
> 4. **`<link rel="stylesheet">`（内部）**：外部 stylesheet 无法穿透，但内部 `@import` 可以从内部加载
> 如果需要完全隔离（如第三方组件），需用 `mode: 'closed'`（但仍有 `querySelector` 绕过方式）。

> 参考：
> - [MDN — Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
> - [MDN — Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
> - [MDN — Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
> - [Google Developers — Web Components](https://developers.google.com/web/fundamentals/web-components)

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) | 官方总览，先把 Custom Elements、Shadow DOM、模板三者的边界分清 | 读概述与三节导语，带着“三者各自解决什么问题”读，读完画出技术栈关系图 |
| [MDN 使用 Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) | 样式隔离主题的权威依据，覆盖 slot 与 ::part 两条对外通道 | 重点读样式隔离、slot、::part 三节，动手改一个组件验证外部样式是否生效 |
| [MDN 使用自定义元素](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) | 生命周期章节的原始出处，回调顺序与触发条件讲得最准 | 对照 connected/disconnected/attributeChanged 回调，写一个打日志的组件验证触发顺序 |
| [`<slot>` HTML web component slot element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/slot) | slot 元素的属性与兜底内容语义，讲插槽机制必须引用 | 读 name 属性与 fallback 内容部分，实测无名 slot 与具名 slot 的分配规则 |
| [CSS shadow parts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Shadow_parts) | ::part 是 Shadow DOM 对外暴露样式定制点的标准方案 | 读 part 属性与 ::part 选择器语法，给示例组件加两个 part 并从外部改样式 |
| [Using CSS custom properties (variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties) | CSS 变量可穿透 Shadow 边界，是主题化的关键手段 | 读继承与回退值部分，用 var() 给组件做亮暗主题并验证继承穿透 |
| [`<iframe>` HTML inline frame element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) | iframe 对比章节的基准资料，明确隔离与通信成本的差异 | 读属性与同源限制，写一个 postMessage 通信示例与 Shadow DOM 做对比 |
| [Children](https://react.dev/reference/react/Children) | 理解 React Children 语义，才能讲清与 slot 的分配模型差异 | 读 Children 的类型与用法，列一张与具名 slot 的映射对照表 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Lit 文档](https://lit.dev/docs/) | 提供可读的组件示例，并演示在 React、Vue 中复用 | 写一个 Lit 组件，分别嵌进 React 与 Vue 页面，观察属性与事件的桥接方式 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [web.dev：Custom Elements v1](https://web.dev/articles/custom-elements-v1) | Custom Elements 最佳实践清单，可直接用来检查自己的实现 | 读最佳实践一节，逐条对照自己的组件代码，列出需要修正的问题清单 |
| [web.dev：Shadow DOM v1](https://web.dev/articles/shadowdom-v1) | 事件重定向与 slot 部分讲得透彻，是样式隔离之外的重点 | 读事件重定向与 slot 两节，用 composed/composedPath 验证事件穿透边界 |
| [现代 JavaScript 教程：Web Components](https://zh.javascript.info/web-components) | 循序渐进的 Web Components 教程，示例完整可直接跑通 | 按章节顺序完成组件示例，每节结束后不看原文重写一遍代码 |
| [Web Components Guide](https://webcomponents.guide/) | 按章节覆盖原生 API 实现，适合做系统性动手练习 | 挑生命周期与插槽章节，用原生 API 实现示例并与框架写法对比 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格操作列按钮 | Shadow DOM 样式隔离 | 原生 Custom Elements + ES 模块 | 别用 iframe，避免每行多一个文档上下文 |
| 低端安卓首屏中的第三方客服挂件 | Shadow DOM vs iframe 对比 | open shadow root 自定义元素 | 不能做跨域安全隔离，不能替代 iframe 的权限边界 |
| 多人协作白板的光标与评论浮层 | Shadow DOM 样式隔离 + `:host` 定位 | Custom Elements + CSS 变量 | 坐标更新要节流，避免每帧触发属性回调 |
| 跨框架设计系统组件库 | Custom Elements 生命周期 + Slot | Lit 或 Stencil 生成 Web Component | 发布前固定 public slot 名称和 CSS `part` 命名 |
| 企业内部微前端子系统隔离 | Shadow DOM vs iframe 对比 | 每个子应用用一个自定义元素挂载 | 登录态、全局事件要明文约定，Shadow DOM 不管跨域隔离 |
| 富文本编辑器中的嵌入卡片 | Slot 插槽机制 | 宿主编辑态用 light DOM 投射工具栏 | 编辑器选区 API 可能拿不到 shadow 内节点，需跳过或映射 |
| 视频播放器皮肤 | Shadow DOM 样式隔离 | 原生 Custom Element 包裹 `<video>` | 自定义控件需在内部绑定媒体事件，不能只靠外部 CSS |
| 复杂表单的自定义输入控件 | Custom Elements 生命周期 + Shadow DOM | 原生 Custom Element + `ElementInternals` | 原生 form 关联需配合 `ElementInternals`，否则不要直接用于提交 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格操作列按钮

**业务背景**：后台列表页一次渲染 1 万行数据，每行有“删除”“复制”按钮。全局 CSS 文件里有 `button { background: blue }`，会覆盖业务按钮颜色，导致误操作。

**怎么用本页知识解决**：把按钮做成 `<my-action-button>`，在 shadow root 内写按钮样式，用 Shadow DOM 挡住外部 CSS。属性变化由 `attributeChangedCallback` 触发更新。

```js
class MyActionButton extends HTMLElement {
  static observedAttributes = ['variant', 'disabled'];
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const variant = this.getAttribute('variant') || 'default';
    this.shadowRoot.innerHTML = `
      <style>
        button { background: #fff; border: 1px solid #d9d9d9; }
        :host([variant="danger"]) button { background: #ff4d4f; color: #fff; }
      </style>
      <button><slot></slot></button>`;
  }
}
customElements.define('my-action-button', MyActionButton);
```

- `attachShadow({ mode: 'open' })` 建立样式边界，外部 `button` 规则不会进入。
- `:host([variant="danger"])` 根据宿主属性切换内部样式，不依赖全局类名。
- `<slot>` 接收调用方传入的文字或图标，让 light DOM 内容可替换。
- `attributeChangedCallback` 只在属性变化时重渲染，更新路径单一。
- 组件可发布为独立 ES 模块，在表格渲染行时复用。

**怎么度量收益**：用 Chrome DevTools Performance 录 100 次点击操作列，看 Main thread 的 scripting 耗时。用 Coverage 面板对比全局 CSS 中未使用的按钮规则占比。用 Playwright 截图对比 5 个页面中按钮样式的像素一致性。

**什么时候不该用**：如果按钮需要直接触发表单 `submit` 并参与原生验证，跨 shadow root 的表单关联要做额外工作，不如用普通按钮。如果页面已有统一全局皮肤且只有这一处使用，引入 shadow DOM 会让按钮脱离全局样式，需要补 token 成本。

#### 场景 2：低端安卓首屏中的第三方客服挂件

**业务背景**：营销落地页在低端安卓上要求首屏加载控制在 2.5 秒以内，页面还要加载第三方客服挂件。用 iframe 嵌入会创建新文档，重复下载字体和基础样式。

**怎么用本页知识解决**：用 Shadow DOM 替代 iframe，挂件以自定义元素运行在主文档，样式封在 shadow root 内。挂件 CSS 不会影响宿主，同时不创建新浏览上下文。

```html
<my-chat-widget></my-chat-widget>
<script type="module">
class MyChatWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'closed' });
  }
  connectedCallback() {
    const style = document.createElement('style');
    style.textContent = '.box { position: fixed; right: 16px; bottom: 16px; }';
    const box = document.createElement('div');
    box.className = 'box';
    box.textContent = '客服';
    this.shadowRoot.append(style, box);
  }
}
customElements.define('my-chat-widget', MyChatWidget);
</script>
```

- `mode: 'closed'` 阻止外部脚本读取挂件内部 DOM，降低被宿主脚本误改的风险。
- 样式写在 shadow root 内，不会泄漏到页面的 `.box` 类。
- 不建 iframe，主文档只加载一次字体和基础样式，避免重复下载。
- 挂件作为 `type="module"` 异步加载，不阻塞首屏 HTML 解析。

**怎么度量收益**：用 Lighthouse mobile 测 LCP 和 TBT。用 Chrome DevTools Network 对比 iframe 版本与 shadow DOM 版本的请求数量和传输体积。用 WebPageTest 在 Motorola G4 模拟档位录首屏渲染时间。

**什么时候不该用**：挂件来自不同安全域，必须靠 iframe 做权限隔离时，Shadow DOM 不提供跨域 JS 隔离。挂件内部有完整独立导航或独立会话存储时，Shadow DOM 仍在主文档上下文，无法替代 iframe。

#### 场景 3：多人协作白板的光标与评论浮层

**业务背景**：白板页面同时显示几十个协作者光标、选区框和评论浮层。第三方插件会注入 `* { box-sizing: border-box }` 等全局规则，导致浮层坐标偏移。

**怎么用本页知识解决**：把每个光标和评论浮层做成 `<cursor-badge>`，用 Shadow DOM 隔离几何样式，`:host` 只负责定位。外部通过 `x`、`y` 属性更新坐标。

```js
class CursorBadge extends HTMLElement {
  static observedAttributes = ['x', 'y', 'name'];
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { position: absolute; transform: translate(var(--x), var(--y)); }
        .cursor { display: flex; align-items: center; }
      </style>
      <div class="cursor"><span class="arrow">↑</span><slot name="label">${this.getAttribute('name') || ''}</slot></div>`;
    this.render();
  }
  attributeChangedCallback() { this.render(); }
  render() {
    this.style.setProperty('--x', this.getAttribute('x') + 'px');
    this.style.setProperty('--y', this.getAttribute('y') + 'px');
  }
}
customElements.define('cursor-badge', CursorBadge);
```

- `:host` 用 `transform: translate(var(--x), var(--y))` 定位，更新坐标不触发布局回流。
- shadow 内样式不受插件注入的全局 `*` 规则影响。
- 命名 slot 支持外部传头像，不破坏内部结构。
- `observedAttributes` 让 `x`、`y`、`name` 属性变化触发渲染。

**怎么度量收益**：用 Chrome DevTools Performance 录 1000 次坐标更新，记录 scripting 和 rendering 耗时。用 Playwright 注入全局 CSS 后截图像素对比浮层偏移。用 MutationObserver 记录每帧 DOM 变化次数。

**什么时候不该用**：只有一个白板页面、没有第三方脚本注入且浮层很少时，全局 BEM 样式已稳定，引入 Shadow DOM 会增加调试定位成本。坐标同步达到每秒 30 次时，应改为直接操作 DOM 节点并配合 `requestAnimationFrame`，Shadow DOM 边界本身不会降低事件频率。

### 行业先进实践

- **Declarative Shadow DOM 用于服务端渲染（出处：web.dev 文章《Declarative Shadow DOM》）**：服务端输出 `<template shadowrootmode="open">`，浏览器解析时自动附着 shadow root，省去自定义元素升级前的无样式闪烁。你的项目如果做 SSR 或静态站点，可以在 HTML 模板里直接生成这段结构。
- **LWC 编译器作用域样式（出处：Salesforce LWC 公开文档《CSS》）**：LWC 编译器把组件样式限制在 shadow tree 内，只允许 `:host` 和 CSS 自定义属性对外暴露。你的项目可以借鉴为 CSS lint 规则，禁止在 shadow 组件内写穿透选择器。
- **Shoelace 主题定制（出处：Shoelace 官方文档《Themes》）**：Shoelace 把可改样式都暴露为 CSS 自定义属性和 `part`，业务方在外部设置 token，不直接覆盖内部选择器。你的内部组件库可以照此固定公开 CSS 变量和 `part` 命名。
- **Open Web Components 测试工具（出处：Open Web Components 官方文档）**：测试中用 fixture 渲染组件，等待 `updateComplete` 生命周期后断言 shadow root 内 DOM。你的项目可以借此减少自定义元素异步升级带来的用例不稳定。
- **FAST Design Tokens（出处：Microsoft FAST 官方文档）**：FAST 组件基于 Web Components 和 Shadow DOM，主题值收敛为 design token。你的项目可以把颜色、间距、圆角统一成 token，避免业务方直接改 shadow 内部值。

### 从学到用：落地路线

**第 1 步：在低风险组件试点**。选一个徽标或按钮组件改成 Custom Element + Shadow DOM。验收标准：该组件在 5 个代表性页面中视觉截图与旧版一致。

**第 2 步：在后台列表页灰度验证**。接入万行表格的一个操作列按钮。验收标准：Lighthouse mobile 的 LCP 变化不超过 100 毫秒，无新增样式回归。

**第 3 步：推广到多个页面并发布内部脚手架**。沉淀组件模板、CSS token 和单测 fixture。验收标准：新组件必须通过 shadow part 和 CSS 变量定制，不允许外部选择器穿透。

**第 4 步：建立回退开关与回归测试**。为每个 Web Component 保留旧版开关。验收标准：关闭开关后旧组件恢复，核心用例截图对比全部通过。

### 动手作业

**目标**：做一个可复用的标签页组件 `<my-tabs>`，支持键盘左右键切换，样式不泄漏到外部。

**步骤**：

1. 定义 `<my-tabs>` 和 `<my-tab-panel>` 两个自定义元素。
2. 在 `<my-tabs>` 中 `attachShadow`，用 `<slot>` 投射外部 tab 头部和面板。
3. 实现 `connectedCallback` 和 `disconnectedCallback`，管理 tablist 的键盘事件。
4. 用 `observedAttributes` 监听 `selected` 属性，切换面板 `hidden` 和 `aria-selected`。
5. 在 shadow root 内只写 tab 头部样式，不写面板内容样式。
6. 外部页面引入一个带 `.tab` 类的普通按钮，验证样式不受影响。
7. 编写测试：挂载组件后触发 `ArrowRight`，断言选中面板可见。

**验收标准**：

- 组件在 Chrome 和 Firefox 最新版运行通过。
- 外部 `.tab` 选择器不作用于 shadow 内的 tab 头部。
- shadow 内 tab 头部样式不作用于外部按钮。
- 键盘左右键能切换焦点和选中项。
- `selected` 属性变化能触发 `attributeChangedCallback` 更新，卸载后事件监听器移除。

