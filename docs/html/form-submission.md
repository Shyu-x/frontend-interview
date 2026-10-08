---
title: 表单提交原理
description: 表单属性、enctype、文件上传、FormData、原生校验与 preventDefault。
---

# 表单提交原理

## 1. 表单属性详解

### 1.1 action / method / enctype 三剑客

```html
<form
  action="/api/submit"
  method="POST"
  enctype="application/x-www-form-urlencoded"
  target="_blank"
  novalidate
>
```

| 属性 | 作用 | 值 |
|------|------|-----|
| `action` | 表单提交的 URL | URL 字符串 |
| `method` | HTTP 方法 | `GET` / `POST` |
| `enctype` | 编码类型 | 见下表 |
| `target` | 提交后响应显示位置 | `_self` / `_blank` / iframe name |
| `novalidate` | 禁用原生验证 | boolean |

**method 取值对比：**

| 方法 | 数据位置 | 大小限制 | 安全性 | 缓存 |
|------|----------|----------|--------|------|
| `GET` | URL query string `?key=value` | ~2KB | 否 参数暴露在 URL | 是 可缓存 |
| `POST` | Request body | 无限制 | 是 稍好 | 否 不可缓存 |

## 2. enctype 编码类型详解

| enctype | 编码方式 | 适用场景 | 示例 |
|---------|----------|----------|------|
| `application/x-www-form-urlencoded` | URL 编码（默认） | 普通文本表单 | `name=John&age=30` |
| `multipart/form-data` | 多部分编码（边界分隔） | **含文件上传** | 二进制分块 |
| `text/plain` | 纯文本（空格转+） | 调试/简单文本 | 不推荐 |

### 2.1 multipart/form-data 请求体结构

```
-----------------------------14462084971952162691234567890
Content-Disposition: form-data; name="username"

John
-----------------------------14462084971952162691234567890
Content-Disposition: form-data; name="avatar"; filename="avatar.png"
Content-Type: image/png

[二进制文件内容]
-----------------------------14462084971952162691234567890
Content-Disposition: form-data; name="bio"

Hello, I'm John!
-----------------------------14462084971952162691234567890--
```

## 3. 文件上传机制

### 3.1 原生文件上传表单

```html
<form method="POST" enctype="multipart/form-data" action="/api/upload">
  <input type="file" name="avatar" accept="image/png,image/jpeg" />
  <input type="file" name="gallery" multiple accept="image/*" />
  <button type="submit">Upload</button>
</form>
```

**accept 属性扩展名和 MIME 类型：**
```html
<input type="file" accept=".pdf,.doc,.docx" />                    <!-- 扩展名 -->
<input type="file" accept="image/*" />                             <!-- 所有图片 -->
<input type="file" accept="application/pdf" />                    <!-- PDF -->
```

### 3.2 文件上传的请求流程

```
用户选择文件 → 表单 enctype="multipart/form-data" →
 浏览器构建 multipart body →
  每个字段作为独立 part 发送（边界字符串分隔） →
  服务器解析 multipart body →
  提取文件二进制数据写入临时目录
```

**后端解析 multipart（Node.js 示例）：**
```javascript
import formidable from 'formidable';

const form = formidable({
  uploadDir: './uploads',
  keepExtensions: true,
  maxFileSize: 5 * 1024 * 1024, // 5MB
});

form.parse(req, (err, fields, files) => {
  console.log(files.avatar[0].originalFilename);
  console.log(files.avatar[0].filepath);
});
```

## 4. FormData API 与 fetch

### 4.1 FormData 基础

```javascript
const form = document.querySelector('form');
const formData = new FormData(form); // 直接从表单构建

// 手动添加字段
const data = new FormData();
data.append('username', 'john');
data.append('avatar', fileInput.files[0]);
data.append('tags', 'dev');
data.append('tags', 'frontend'); // 同一字段多个值

// 发送
fetch('/api/submit', {
  method: 'POST',
  body: data, // 错误：不要设置 Content-Type！浏览器自动设置 multipart/form-data
});
```

```typescript
// TypeScript 类型
interface UploadPayload {
  username: string;
  avatar: File;
  bio: string;
}

const submitForm = async (payload: UploadPayload) => {
  const formData = new FormData();
  formData.append('username', payload.username);
  formData.append('avatar', payload.avatar);
  formData.append('bio', payload.bio);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    // 注意：不要写 headers 的 Content-Type
    // 浏览器会自动添加正确的 Content-Type 和 boundary
  });

  return res.json();
};
```

### 4.2 React 中的表单处理

```tsx
import { useState } from 'react';

const UploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    // formData 已包含所有表单字段

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      console.log(result);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="title" required />
      <input
        type="file"
        name="document"
        accept=".pdf,.docx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {file && <p>Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Submit'}
      </button>
    </form>
  );
};
```

## 5. 原生表单验证

### 5.1 验证属性

| 属性 | 作用 | 示例 |
|------|------|------|
| `required` | 必填 | `<input required>` |
| `minlength` / `maxlength` | 字符长度限制 | `<input minlength="3" maxlength="20">` |
| `min` / `max` | 数值/日期范围 | `<input type="number" min="1" max="100">` |
| `pattern` | 正则表达式验证 | `<input pattern="[A-Za-z]+">` |
| `type` | 内置类型校验 | `email`, `url`, `tel`, `number` |
| `step` | 数值步长 | `<input type="number" step="0.01">` |

```html
<!-- 完整示例 -->
<form id="signup" novalidate>
  <input
    type="email"
    name="email"
    required
    placeholder="your@email.com"
  />

  <input
    type="password"
    name="password"
    required
    minlength="8"
    pattern="^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$"
    title="At least 8 chars with letters and numbers"
  />

  <input
    type="url"
    name="website"
    placeholder="https://example.com"
  />

  <input
    type="number"
    name="age"
    min="18"
    max="120"
  />

  <button type="submit">Sign up</button>
</form>
```

### 5.2 自定义验证消息

```javascript
const input = document.querySelector('input[name="password"]');

input.addEventListener('invalid', (e) => {
  // 阻止默认消息
  e.preventDefault();

  // 自定义消息
  if (input.validity.valueMissing) {
    input.setCustomValidity('Password is required');
  } else if (input.validity.tooShort) {
    input.setCustomValidity(`Need ${input.minLength} chars, you entered ${input.value.length}`);
  } else if (input.validity.patternMismatch) {
    input.setCustomValidity('Must contain letters and numbers');
  }
  // 显示自定义消息
  input.reportValidity();
});

input.addEventListener('input', () => {
  input.setCustomValidity(''); // 清除错误消息
});
```

```typescript
// ValidityState 接口
input.validity.valid;                    // 是否全部通过
input.validity.valueMissing;              // required 且为空
input.validity.typeMismatch;              // 类型不匹配 (email/url)
input.validity.patternMismatch;           // 正则不匹配
input.validity.tooLong;                   // 超过 maxlength
input.validity.tooShort;                  // 低于 minlength
input.validity.rangeUnderflow;            // 低于 min
input.validity.rangeOverflow;              // 超过 max
input.validity.stepMismatch;              // 不符合 step
input.validity.badInput;                  // 输入类型错误
input.validity.customError;               // 有 setCustomValidity
```

## 6. preventDefault vs return false

### 6.1 对比表

| 行为 | 阻止默认行为 | 阻止冒泡 | 兼容性 |
|------|------------|----------|--------|
| `e.preventDefault()` | 是 | 否 | 所有浏览器 |
| `e.stopPropagation()` | 否 | 是 | 所有浏览器 |
| `return false` | 是 | 否（在 jQuery 中同时阻止冒泡） | jQuery only |
| `onclick="return false"` | 是 表单不提交 | 是 事件不冒泡 | 原生 HTML |

```html
<!-- 原生事件中 return false 等价于 preventDefault -->
<form onsubmit="return validate()">
  <!-- return false → 阻止提交 -->
</form>

<!-- 阻止默认行为但不阻止冒泡 -->
<form onsubmit="handleSubmit(event)">
```

```javascript
// 表单提交事件
form.addEventListener('submit', (e) => {
  e.preventDefault();           // 正确：阻止浏览器默认提交
  // 自定义提交逻辑
  customSubmit();
});

// 错误：return false 在 addEventListener 中无效！
form.addEventListener('submit', () => {
  return false; // 不起作用！
});

// 正确：使用 preventDefault
```

**实际场景选择：**

```typescript
const onFormSubmit = (e: SubmitEvent) => {
  if (!validateForm()) {
    e.preventDefault(); // 验证失败，阻止提交
    return;
  }
  // 验证通过，走默认提交流程（但可改为 fetch 提交）
  e.preventDefault(); // SPA 中通常改为 AJAX 提交
  submitViaAjax(new FormData(e.target as HTMLFormElement));
};
```

## 7. 表单隐式提交（Implicit Submission）

W3C 规范定义的机制：当用户在文本输入框中按 Enter 键时，浏览器自动触发表单的默认提交按钮。

```
触发条件：
1. 表单内有 <input type="submit"> 或 <button type="submit">
2. 焦点在表单内任意文本输入框
3. 用户按 Enter 键

→ 浏览器模拟触发 default button 的 click 事件
```

```html
<!-- 隐式提交示例 -->
<form action="/search">
  <input type="text" name="q" /> <!-- Enter 键自动提交 -->
  <button type="submit">Search</button>
</form>
```

## 8. 常见陷阱

```javascript
// 陷阱1: fetch 手动设置 Content-Type
fetch('/api/upload', {
  method: 'POST',
  body: formData,
  headers: {
    'Content-Type': 'multipart/form-data', // 错误！缺少 boundary
  },
});
// 正确：不写 Content-Type，让浏览器自动生成含 boundary 的 Content-Type

// 陷阱2: disabled 表单元素不参与提交
// disabled 的 input 在表单提交时不会包含其值
// 正确：解决方案：使用 readonly 替代，或通过 hidden input 传递值

// 陷阱3: enctype 不匹配文件上传
<form method="POST" enctype="application/x-www-form-urlencoded">
  <input type="file" name="avatar" />  <!-- 错误：文件不会上传！ -->
</form>
// 正确：必须改为 enctype="multipart/form-data"

// 陷阱4: form 嵌套导致提交混乱
<form>
  <form> <!-- 错误：嵌套 form 会被浏览器忽略，inner form 失效 -->
    ...
  </form>
</form>
// 正确：最多嵌套一层，或使用 fieldset 分组
```

## 9. 面试 follow-up 问题

### 9.1 Q1: 表单的 `enctype` 为 `multipart/form-data` 时，请求体是如何构建的？boundary 字符串的作用是什么？

**答案：**
`multipart/form-data` 将表单数据拆分为多个独立部分，每个部分用 `boundary` 字符串作为分隔符：

```
--{boundary}                          ← 开始边界
Content-Disposition: form-data; name="field1"
Value1
--{boundary}
Content-Disposition: form-data; name="file"; filename="a.png"
Content-Type: image/png
[二进制数据]
--{boundary}--
```

`boundary` 是服务器在解析时用来分割不同字段的标记。浏览器自动生成随机字符串（如 `----WebKitFormBoundary7MA4YWxTrZu0gW`），确保不会与用户输入的内容冲突。

---

### 9.2 Q2: 为什么用 fetch + FormData 上传文件时，不应该手动设置 `Content-Type` header？

**答案：**
`Content-Type: multipart/form-data` 必须包含 `boundary=xxx` 参数才能被服务器正确解析：

```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxTrZu0gW
```

如果手动写 `Content-Type: multipart/form-data` 而不带 boundary，服务器将无法解析。如果手动写完整的 `Content-Type`（含 boundary），则需要确保 boundary 正确且一致，过于复杂。

正确做法：**让浏览器自动生成**，不写 `Content-Type` header。浏览器会自动处理：

```javascript
fetch('/api/upload', {
  method: 'POST',
  body: formData,
  // 不写 headers！浏览器自动添加带 boundary 的 Content-Type
});
```

---

### 9.3 Q3: `preventDefault` 在表单提交事件中的正确用法是什么？和 `return false` 有什么区别？

**答案：**
在 `addEventListener` 中，`e.preventDefault()` 阻止默认行为（浏览器提交表单并跳转）；`return false` 不起作用。

```javascript
form.addEventListener('submit', (e) => {
  e.preventDefault(); // 正确：阻止默认提交，进行 AJAX 提交
  fetch('/api/submit', { method: 'POST', body: new FormData(form) });
});
```

在 HTML `onsubmit="return false"` 中，`return false` 等价于 `preventDefault`（同时也阻止冒泡，仅限 jQuery）。

现代 SPA 中通常用 `e.preventDefault()` 阻止默认跳转，通过 AJAX/Fetch 提交数据，实现无刷新体验。

---

### 9.4 Q4: 表单的原生验证 `checkValidity()` 和 `reportValidity()` 有什么区别？在 React 中如何使用？

**答案：**

- `checkValidity()`：仅检查，返回 boolean，不显示错误提示
- `reportValidity()`：检查并显示浏览器原生错误气泡

```typescript
// 在 React 中使用
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  const form = e.currentTarget;

  // 方案1: 手动检查
  if (!form.checkValidity()) {
    form.reportValidity(); // 显示错误气泡
    return;
  }

  // 方案2: 直接报告（自动 check + 显示）
  if (!form.reportValidity()) {
    return;
  }

  // 通过验证，继续提交
  submitForm(new FormData(form));
};
```

---

> 参考：
>
> - https://www.runoob.com/tags/att-form-enctype.html （form enctype 属性）
> - https://cloud.tencent.com/developer/article/2579682 （enctype 详细解析）
> - https://blog.csdn.net/weixin_39568133/article/details/117801966 （form 隐式提交）
> - https://blog.csdn.net/qq_34573534/article/details/97613322 （input 表单详解）
> - https://blog.csdn.net/truong/article/details/8296018 （multipart/form-data 详解）
> - https://blog.csdn.net/weixin_42289080/article/details/140204145 （React DOMPurify）

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Using HTML form validation and the Constraint Validation API](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Constraint_validation) | 原生表单校验的规范入口，讲清 validity 与自定义校验接口。 | 读 Constraint validation 一节，重点看提交时的校验时机与 invalid 事件；给表单加自定义校验并观察。 |
| [Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) | 官方指南讲清 fetch 发送 FormData 时 Content-Type 与请求体的处理方式。 | 读上传数据相关小节，用 FormData 提交含文件的表单，确认 boundary 自动生成。 |
| [Fetch metadata](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Fetch_metadata) | Sec-Fetch-* 头说明浏览器如何标记表单提交来源，是 CSRF 防御基础。 | 读 Sec-Fetch-Site 与 Sec-Fetch-Mode 各值，提交表单后在 Network 面板核对请求头。 |
| [MDN Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) | Fetch API 总览，可核对 Request/Response 模型与错误状态判断。 | 读 Response.ok、status 与 AbortController 部分，写一个可取消的提交请求。 |
| [Using readable byte streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_byte_streams) | 字节流解释 File/Blob 的底层读取方式，影响分片上传实现。 | 读 BYOB reader 部分，理解分片上传为何要按字节读取。 |
| [MDN 文件系统 API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) | 浏览器读写本地文件的权限模型，与选择文件上传形成对照。 | 读权限提示与读写小节，实现选择本地文件并读取其内容。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 拖放 API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) | 拖放示例直观展示不调用 preventDefault 时默认行为如何接管。 | 读 dragover/drop 代码，留意阻止默认行为的时机，再迁移到 submit 事件。 |
| [Using readable streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams) | 可运行示例演示分块消费流，对应大文件上传的读取思路。 | 读 ReadableStream 消费示例，把 File.stream() 接进 fetch 的 body 试一次。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [阮一峰：Fetch API 教程](https://www.ruanyifeng.com/blog/2020/12/fetch-tutorial.html) | 中文 fetch 教程，把 FormData、上传与错误处理串成完整可跑流程。 | 按示例对自建端点完成增删改查，并处理非 2xx 状态与网络错误。 |
| [现代 JavaScript 教程：网络请求](https://zh.javascript.info/network) | 系统教程把网络请求、FormData 与跨域串讲，适合打牢基础。 | 顺序读网络请求各章并完成练习，再复述一次表单提交的完整链路。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理万行表格的条件筛选 | 表单隐式提交、表单属性详解 | `<form method="get">` 加 URLSearchParams | 条件变化要重置 page，否则停在越界页 |
| 低端安卓机上的首屏登录表单 | 原生表单验证、preventDefault vs return false | `<form>` 加 submit 事件监听 | `return false` 在 addEventListener 里不生效 |
| 多人协作白板的素材上传 | enctype 编码类型详解、文件上传机制 | `multipart/form-data` 加 XHR 进度事件 | 拖拽进来的文件要手动 append 到 FormData |
| 客服工单系统的多附件提交 | FormData API 与 fetch | FormData 加 fetch | 手设 Content-Type 会丢掉 boundary |
| 无 JS 环境下的内容发布页 | 表单属性详解、常见陷阱 | 服务端渲染的原生 form 加 POST | action 与后端路由必须一一对应 |
| 电商搜索框的输入即搜 | 表单隐式提交 | 单输入框 form 加 composition 事件 | 中文输入法组字期间回车会误触发 |
| 银行 App 转账确认页 | preventDefault vs return false、常见陷阱 | 事件委托加 preventDefault | 提交期间要加锁，避免重复扣款 |

### 三个场景拆解

#### 场景 1：低端安卓机上的登录表单

- **业务背景**：这类机型内存紧张，首屏多加载一个校验库就会把可交互时间往后推。用 Chrome 的 Performance 面板在 4x CPU 降速下录一次加载，就能对比出差异。
- **怎么用本页知识解决**：思路是把校验交给浏览器，提交交给 fetch，页面不跳转。

```html
<form id="login" action="/api/submit" method="post" novalidate>
  <input name="phone" required inputmode="numeric" pattern="\d{11}">
  <input name="code" required autocomplete="one-time-code">
  <button type="submit">登录</button>
</form>
<script>
const form = document.getElementById('login');
form.addEventListener('submit', async (e) => {
  e.preventDefault();                        // 接管提交，阻止整页跳转
  if (!form.checkValidity()) {               // 复用浏览器内置校验结果
    form.reportValidity();                   // 由浏览器绘制校验提示
    return;
  }
  const body = new FormData(form);           // 按控件 name 打包字段
  const res = await fetch(form.action, {     // 地址取 action，不写死两遍
    method: form.method, body,               // 不设 Content-Type，交给浏览器
  });
  renderResult(await res.json());
});
</script>
```

- `novalidate` 关掉浏览器的自动拦截，改由脚本决定何时提示。
- `checkValidity()` 读的是同一套约束，手机号正则不用再写一遍。
- `FormData(form)` 收走所有带 name 的控件，隐藏字段也包含在内。
- body 传 FormData 时，浏览器自动补 `multipart/form-data` 与 boundary。
- `preventDefault()` 在 addEventListener 里有效，写成 `return false` 无效。

- **怎么度量收益**：指标取 Chrome DevTools Performance 面板的 LCP 与 Total Blocking Time。测量时固定 4x CPU 降速与 Slow 4G，两次录制都导出 JSON 再逐项对比。
- **什么时候不该用**：

  - 表单含富文本编辑器、日期区间选择器这类非原生控件时，`checkValidity()` 读不到它们的值，得自己补校验。
  - 需要 POST 后整页跳到服务端渲染结果页时，用 fetch 接管还要额外写一段跳转逻辑。

#### 场景 2：客服工单系统的多附件提交

- **业务背景**：客服在弱网下提交工单，附件常有几十兆的截图和录屏，没有进度提示时用户会重复点击。用 Chrome DevTools 的 Network 面板切到 Slow 3G，就能复现这种等待。
- **怎么用本页知识解决**：思路是把表单字段和文件一起放进 FormData，用 XHR 拿上传进度。

```js
const form = document.getElementById('ticket');
form.addEventListener('submit', (e) => {
  e.preventDefault();                       // 停掉整页跳转，改为脚本提交
  const fd = new FormData(form);            // 自动收走 input[type=file] 的文件
  fd.append('ticketId', currentId);         // 追加隐藏字段，不改动 DOM
  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = (ev) => {         // 只在上传阶段触发
    if (ev.lengthComputable) {
      bar.value = ev.loaded / ev.total;     // 用比例驱动进度条
    }
  };
  xhr.open('POST', form.action);            // 地址与表单 action 保持一致
  xhr.send(fd);                             // boundary 由浏览器写入
});
```

- `FormData(form)` 把文件控件里选中的每个文件都收进同一个字段名。
- `fd.append` 可以塞入不在 DOM 里的值，省掉一个隐藏 input。
- `xhr.upload.onprogress` 只覆盖请求体上传，下载阶段要用 `xhr.onprogress`。
- `lengthComputable` 为 false 时不显示百分比，改成不确定态进度条。
- 提交期间禁用按钮并置 `aria-busy`，防止重复提交。

- **怎么度量收益**：看两个指标，上传失败后的重试次数、同一工单的重复提交次数。在 XHR 的 error、abort、load 三个事件里打点上报，比较改动前后同一周的计数。
- **什么时候不该用**：

  - 单个文件超过服务端 body 上限时，XHR 要传完才拿到 413，应该先做分片上传。
  - 只传纯文本字段时，`application/x-www-form-urlencoded` 的请求体体积比 multipart 小，没必要走 multipart。

#### 场景 3：后台管理万行表格的条件筛选

- **业务背景**：运营要在几万行订单里按状态和时间段反复筛，每次筛选都整页刷新会丢掉滚动位置。用 Network 面板看一次筛选请求，能数出返回的 HTML 大小。
- **怎么用本页知识解决**：思路是保留原生 `<form method="get">`，用脚本接管隐式提交，只重绘表格。

```html
<form id="filter" action="/api/submit" method="get">
  <input name="q" placeholder="订单号或手机号">   <!-- 唯一文本输入框，回车触发隐式提交 -->
  <select name="status"><option value="">全部</option></select>
  <input type="hidden" name="page" value="1">    <!-- 改条件时回到第一页 -->
  <button type="submit">筛选</button>
</form>
<script>
const form = document.getElementById('filter');
form.addEventListener('submit', (e) => {
  e.preventDefault();                                    // 接管回车触发的隐式提交
  const params = new URLSearchParams(new FormData(form)); // 复用表单编码规则
  params.set('page', '1');                               // 条件变了就重置分页
  history.replaceState(null, '', '?' + params);          // 同步地址栏，便于分享
  loadTable(params);                                     // 只重绘表格区域
});
</script>
```

- `method="get"` 会把控件序列化进查询串，前后端共用同一套参数名。
- form 里只有一个文本输入框时，回车触发隐式提交，不用绑 keydown。
- `URLSearchParams` 读 FormData 时按控件顺序拼接，中文会被正确编码。
- `history.replaceState` 不改历史栈，按返回键不会逐条退回筛选条件。
- 没有 JS 时表单仍会提交到 action，由服务端返回整页结果。

- **怎么度量收益**：看筛选到表格可交互的耗时、筛选接口的响应体大小。在 `loadTable` 里用 `performance.now()` 记起止，响应体大小从 Network 面板读。
- **什么时候不该用**：

  - 筛选条件依赖服务端会话而不是 URL 时，把参数写进地址栏会被分享链接带出去。
  - 结果集到几千行时，只改前端分页会让首屏渲染卡顿，应该换成服务端游标分页。

### 行业先进实践

- **用真实 form 承载提交，脚本只做增强（出处：Remix 官方文档）**。Remix 的 Form 组件渲染的是原生 form 元素，JS 未就绪时浏览器按默认行为提交。首屏不必等 hydration 就能提交。你的项目可以先在登录、搜索两处把 div 加 click 换回 form，保留原生 action 与 method。
- **校验交给 Constraint Validation API（出处：MDN Web Docs）**。浏览器已实现 required、pattern、minlength、type=email 这些约束，`checkValidity()` 与 `reportValidity()` 是公开接口。自己写的正则只保留浏览器表达不了的部分，例如跨字段比较。
- **大文件用分片上传（出处：Amazon S3 官方文档的 Multipart Upload）**。S3 把对象拆成多个 part 分别上传，最后合并，中途断线只重传失败的那一片。你的项目若附件常超过几十兆，可以先在前端按固定大小切片，再逐片调用后端接收接口。
- **不手动设置 multipart 的 Content-Type（出处：MDN Web Docs 的 FormData 页面）**。用 FormData 作 fetch 的 body 时，浏览器会补上 Content-Type 与 boundary。手写这个头会漏掉 boundary，服务端解析不出字段。检查方法是在 Network 面板看请求头是否带 boundary= 参数。
- **拦截表单提交做局部替换（出处：Hotwire Turbo 官方文档）**。Turbo 监听 submit 事件，用 fetch 发请求后把返回的 HTML 片段替换到页面对应位置。这样保留服务端渲染，同时省掉整页刷新。借鉴方式是把表格、列表这类区域包成可替换的目标元素。

### 从学到用：落地路线

1. **在登录表单试点**，把现有点击处理换成 form 的 submit 监听，保留 action 与 method。验收标准：关掉浏览器 JS 后，表单仍能提交并拿到服务端结果页。
2. **验证行为差异**，在 Chrome DevTools 开 4x CPU 降速，对比试点前后的 LCP 与表单可交互时间。验收标准：两次录制的 Performance 面板 JSON 都已导出并留存。
3. **推广到搜索、筛选、上传三类表单**，每类只改一处，改完跑一遍回归用例。验收标准：三类表单在无 JS、服务端返回错误码两种情况下都有可用路径。
4. **防止回退**，在仓库加一条 CI 检查，禁止表单提交处理里出现 `return false`。验收标准：提一个含 `return false` 的 PR，CI 报错并阻止合并。

### 动手作业

**项目**：给一个已有的订单筛选页加上无刷新筛选与无 JS 兜底。

**步骤**：

1. 把筛选区的 div 换成 `<form action="/api/submit" method="get">`，控件都补上 name。
2. 在表单里加 `<input type="hidden" name="page" value="1">`。
3. 监听 submit 事件，第一行调用 `e.preventDefault()`。
4. 用 `new URLSearchParams(new FormData(form))` 取参数，把 page 重置为 1。
5. 用 `history.replaceState` 把参数写回地址栏。
6. 用 fetch 请求表格接口，把返回的 HTML 片段插入表格容器。
7. 在地址栏直接粘贴带参数的 URL，确认首屏渲染出对应结果。

**验收标准**：

- 关闭 JavaScript 后提交表单，页面整页刷新且筛选条件仍在。
- 中文关键词筛选后，地址栏参数是百分号编码，刷新后结果一致。
- 改筛选条件后 page 回到 1，表格不出现空页。
- 按返回键退出筛选页时，不会逐条退回每一个筛选条件。
- 表格接口返回 500 时，页面显示错误提示而不是空白。

