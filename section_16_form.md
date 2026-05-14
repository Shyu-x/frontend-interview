# Section 16: Form 表单提交原理

## 16.1 表单属性详解

### action / method / enctype 三剑客

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
| `GET` | URL query string `?key=value` | ~2KB | ❌ 参数暴露在 URL | ✅ 可缓存 |
| `POST` | Request body | 无限制 | ✅ 稍好 | ❌ 不可缓存 |

## 16.2 enctype 编码类型详解

| enctype | 编码方式 | 适用场景 | 示例 |
|---------|----------|----------|------|
| `application/x-www-form-urlencoded` | URL 编码（默认） | 普通文本表单 | `name=John&age=30` |
| `multipart/form-data` | 多部分编码（边界分隔） | **含文件上传** | 二进制分块 |
| `text/plain` | 纯文本（空格转+） | 调试/简单文本 | 不推荐 |

### multipart/form-data 请求体结构

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

## 16.3 文件上传机制

### 原生文件上传表单

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

### 文件上传的请求流程

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

## 16.4 FormData API 与 fetch

### FormData 基础

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
  body: data, // ❌ 不要设置 Content-Type！浏览器自动设置 multipart/form-data
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

### React 中的表单处理

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

## 16.5 原生表单验证

### 验证属性

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

### 自定义验证消息

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

## 16.6 preventDefault vs return false

### 对比表

| 行为 | 阻止默认行为 | 阻止冒泡 | 兼容性 |
|------|------------|----------|--------|
| `e.preventDefault()` | ✅ | ❌ | 所有浏览器 |
| `e.stopPropagation()` | ❌ | ✅ | 所有浏览器 |
| `return false` | ✅ | ❌（在 jQuery 中同时阻止冒泡） | jQuery only |
| `onclick="return false"` | ✅ 表单不提交 | ✅ 事件不冒泡 | 原生 HTML |

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
  e.preventDefault();           // ✅ 阻止浏览器默认提交
  // 自定义提交逻辑
  customSubmit();
});

// ❌ return false 在 addEventListener 中无效！
form.addEventListener('submit', () => {
  return false; // 不起作用！
});

// ✅ 正确：使用 preventDefault
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

## 16.7 表单隐式提交（Implicit Submission）

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

## 16.8 常见陷阱

```javascript
// 陷阱1: fetch 手动设置 Content-Type
fetch('/api/upload', {
  method: 'POST',
  body: formData,
  headers: {
    'Content-Type': 'multipart/form-data', // ❌ 错误！缺少 boundary
  },
});
// ✅ 不写 Content-Type，让浏览器自动生成含 boundary 的 Content-Type

// 陷阱2: disabled 表单元素不参与提交
// disabled 的 input 在表单提交时不会包含其值
// ✅ 解决方案：使用 readonly 替代，或通过 hidden input 传递值

// 陷阱3: enctype 不匹配文件上传
<form method="POST" enctype="application/x-www-form-urlencoded">
  <input type="file" name="avatar" />  <!-- ❌ 文件不会上传！ -->
</form>
// ✅ 必须改为 enctype="multipart/form-data"

// 陷阱4: form 嵌套导致提交混乱
<form>
  <form> <!-- ❌ 嵌套 form 会被浏览器忽略，inner form 失效 -->
    ...
  </form>
</form>
// ✅ 最多嵌套一层，或使用 fieldset 分组
```

## 16.9 面试 follow-up 问题

### Q1: 表单的 `enctype` 为 `multipart/form-data` 时，请求体是如何构建的？boundary 字符串的作用是什么？

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

### Q2: 为什么用 fetch + FormData 上传文件时，不应该手动设置 `Content-Type` header？

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

### Q3: `preventDefault` 在表单提交事件中的正确用法是什么？和 `return false` 有什么区别？

**答案：**
在 `addEventListener` 中，`e.preventDefault()` 阻止默认行为（浏览器提交表单并跳转）；`return false` 不起作用。

```javascript
form.addEventListener('submit', (e) => {
  e.preventDefault(); // ✅ 正确：阻止默认提交，进行 AJAX 提交
  fetch('/api/submit', { method: 'POST', body: new FormData(form) });
});
```

在 HTML `onsubmit="return false"` 中，`return false` 等价于 `preventDefault`（同时也阻止冒泡，仅限 jQuery）。

现代 SPA 中通常用 `e.preventDefault()` 阻止默认跳转，通过 AJAX/Fetch 提交数据，实现无刷新体验。

---

### Q4: 表单的原生验证 `checkValidity()` 和 `reportValidity()` 有什么区别？在 React 中如何使用？

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

> 📚 参考：
> - https://www.runoob.com/tags/att-form-enctype.html （form enctype 属性）
> - https://cloud.tencent.com/developer/article/2579682 （enctype 详细解析）
> - https://blog.csdn.net/weixin_39568133/article/details/117801966 （form 隐式提交）
> - https://blog.csdn.net/qq_34573534/article/details/97613322 （input 表单详解）
> - https://blog.csdn.net/truong/article/details/8296018 （multipart/form-data 详解）
> - https://blog.csdn.net/weixin_42289080/article/details/140204145 （React DOMPurify）
