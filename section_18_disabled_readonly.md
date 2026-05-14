# Section 18: disabled vs readonly vs autocomplete

## 18.1 disabled vs readonly 核心区别

### 属性对比表

| 维度 | `disabled` | `readonly` |
|------|-----------|-----------|
| 可编辑 | ❌ 完全不可编辑 | ✅ 不可编辑，但可聚焦 |
| 可复制 | ❌ 不可选择、复制 | ✅ 可选择、复制 |
| 提交到服务器 | ❌ **不提交** | ✅ **提交** |
| Tab 键可聚焦 | ❌ 跳过 | ✅ 可以聚焦 |
| 表单验证 | ❌ 跳过 | ✅ 参与 |
| CSS 默认样式 | 灰色、不可用 | 正常样式 |
| JS 可修改值 | ❌ `readOnly` 不可用 setter | ✅ 可修改 |
| 适用元素 | 所有表单元素 | `input`(text/password/number/date) + `textarea` |

### 代码示例

```html
<!-- disabled: 不可编辑、不可复制、不提交 -->
<input type="text" value="disabled field" disabled />

<!-- readonly: 不可编辑、可复制、提交 -->
<input type="text" value="readonly field" readonly />

<!-- disabled select/radio/checkbox -->
<select disabled>
  <option>Disabled option</option>
</select>
<input type="checkbox" disabled />
<input type="radio" disabled />
```

```typescript
// JS 中的控制
const input = document.querySelector('input');

// disabled
input.disabled = true;    // ✅ 可设置
input.disabled = false;   // ✅ 可取消

// readonly（注意大小写）
input.readOnly = true;    // ✅ JavaScript 属性名
input.getAttribute('readonly'); // ✅ HTML 属性名

// 判断状态
input.disabled;   // boolean
input.readOnly;   // boolean
```

```tsx
// React 中
<input disabled />                    {/* JSX 自动转 disabled */}
<input readOnly />                    {/* JSX 自动转 readOnly */}
<input disabled={isLoading} />       {/* 动态控制 */}
<input readOnly={isViewMode} />
```

## 18.2 视觉样式差异

```css
/* 默认 disabled 样式（浏览器自带，非人工设置） */
input:disabled {
  opacity: 0.6;          /* 变灰/半透明 */
  cursor: not-allowed;   /* 鼠标变为禁止图标 */
  background-color: #e0e0e0;
}

/* readonly 样式（浏览器通常无特殊样式，需手动处理） */
input:read-only {
  /* 默认无变化，需手动设置视觉提示 */
  background-color: #f5f5f5;
  cursor: default;
}
```

```css
/* 实际项目中通常需要明确区分样式 */
.input--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none; /* 禁止鼠标交互 */
  background-color: #eee;
}

.input--readonly {
  background-color: #fafafa;
  border-color: #ddd;
  cursor: default;
  /* 不加 pointer-events: none，保持可选中 */
}
```

## 18.3 无障碍（Accessibility）行为

### 屏幕阅读器

| 属性 | 屏幕阅读器行为 |
|------|--------------|
| `disabled` | 播报"禁用"或"不可用"状态，聚焦时跳过或播报特殊提示 |
| `readonly` | 播报"只读"状态，值仍可读取 |
| 默认可编辑 | 播报为标准可编辑文本 |

```html
<!-- 带无障碍标签的 disabled 输入 -->
<label for="user-id">User ID</label>
<input
  id="user-id"
  type="text"
  value="42"
  disabled
  aria-disabled="true"
  aria-describedby="user-id-hint"
/>
<span id="user-id-hint">This value is auto-assigned</span>

<!-- readonly 配合 aria-readonly -->
<label for="invoice-number">Invoice Number</label>
<input
  id="invoice-number"
  type="text"
  value="INV-2024-0042"
  readonly
  aria-readonly="true"
/>
```

### 键盘交互

| 元素状态 | Tab 聚焦 | Enter 触发 |
|----------|----------|-----------|
| 默认 input | ✅ | — |
| disabled | ❌ 跳过 | — |
| readonly | ✅ 聚焦 | — |
| disabled button | ❌ 跳过 | ❌ 不触发 |
| readonly input | ✅ 聚焦 | ✅ 可触发隐式提交 |

## 18.4 autocomplete 属性详解

### autocomplete 值与 name 属性映射表

| autocomplete 值 | 对应字段 | 触发条件 |
|----------------|---------|----------|
| `name` | 全名 | — |
| `given-name` | 名 | — |
| `family-name` | 姓 | — |
| `nickname` | 昵称 | — |
| `email` | 邮箱 | — |
| `username` | 用户名 | — |
| `current-password` | 当前密码 | 登录页 | 
| `new-password` | 新密码/确认密码 | 注册/修改密码页 |
| `postal-code` | 邮政编码 | — |
| `street-address` | 街道地址 | — |
| `tel` | 电话号码 | — |
| `url` | 个人主页/URL | — |
| `photo` | 头像 URL | — |
| `cc-name` | 持卡人姓名 | — |
| `cc-number` | 卡号 | — |
| `cc-exp` | 有效期 | — |
| `cc-csc` | 安全码 | — |
| `off` | 关闭自动填充 | 任何敏感字段 |

**标准 name 属性对应表（WHATWG 规范）：**

| name 属性 | 触发 autocomplete 值 |
|-----------|---------------------|
| `name` | `name` |
| `given-name` | `given-name` |
| `family-name` | `family-name` |
| `email` | `email` |
| `username` | `username` |
| `new-password` | `new-password` |
| `current-password` | `current-password` |

## 18.5 new-password 技巧与 Password Manager

### new-password 防止自动填充

```html
<!-- 方法1: 直接设置 autocomplete -->
<input type="password" autocomplete="new-password" />

<!-- 方法2: 配合 display:none 的虚假 input -->
<input type="password" style="display:none" name="fake-password" />
<input type="password" name="real-password" />
<!-- 浏览器填充假 input，不影响真 input -->

<!-- 方法3: 随机 name 属性（动态生成） -->
<input type="password" name="pwd_${Date.now()}" />
```

```tsx
// React 中
<input
  type="password"
  autoComplete="new-password"  // 注意 JSX 中是 camelCase
  name="password"
/>

// 或完全关闭
<input
  type="password"
  autoComplete="off"
/>
```

### Password Manager 配合使用

现代浏览器的密码管理器通过以下方式识别表单：

```
1. 检查 <form> 上的 action（登录页 URL）
2. 检查 input 的 type 属性（password/input type=text）
3. 检查 name 属性（username/password）
4. 检查 autocomplete 属性（显式声明意图）
5. 检查当前 URL 与表单 action 的关系（登录/注册）
```

```html
<!-- ✅ 告诉浏览器这是登录表单 -->
<form action="/login" method="POST">
  <label for="username">Username</label>
  <input
    id="username"
    type="text"
    name="username"
    autocomplete="username"
    required
  />

  <label for="password">Password</label>
  <input
    id="password"
    type="password"
    name="password"
    autocomplete="current-password"
    required
  />
</form>

<!-- ✅ 告诉浏览器这是注册表单 -->
<form action="/register" method="POST">
  <label for="new-password">Create Password</label>
  <input
    id="new-password"
    type="password"
    name="password"
    autocomplete="new-password"
    minlength="8"
    required
  />
</form>
```

### 常见 autocomplete 场景

| 场景 | autocomplete 设置 |
|------|-----------------|
| 登录用户名 | `autocomplete="username"` |
| 登录密码 | `autocomplete="current-password"` |
| 注册新密码 | `autocomplete="new-password"` |
| 信用卡号 | `autocomplete="cc-number"` |
| 不应记住的敏感字段 | `autocomplete="off"` |
| 搜索框（不混淆密码管理器） | `autocomplete="off"` 或 `autocomplete="search"` |

## 18.6 disabled / readonly / autocomplete 组合使用

```html
<!-- 场景：查看模式 + 部分字段可编辑 -->
<form>
  <!-- 只读字段：用户信息，不可编辑 -->
  <input type="text" value="user@example.com" readonly />

  <!-- 禁用字段：管理员不可修改的系统字段 -->
  <input type="text" value="admin" disabled />

  <!-- 可编辑字段 -->
  <input type="text" name="display-name" autocomplete="name" />

  <!-- 新密码设置 -->
  <input
    type="password"
    name="new-password"
    autocomplete="new-password"
    minlength="8"
    required
  />
</form>
```

```tsx
// React: 根据角色控制字段状态
interface UserFormProps {
  user: User;
  role: 'viewer' | 'editor' | 'admin';
}

const UserForm = ({ user, role }: UserFormProps) => {
  const isEditor = role === 'editor' || role === 'admin';
  const isAdmin = role === 'admin';

  return (
    <form>
      <input
        type="text"
        name="email"
        defaultValue={user.email}
        readOnly
        aria-readonly="true"
      />

      <input
        type="text"
        name="name"
        defaultValue={user.name}
        readOnly={!isEditor}
        disabled={!isEditor}
      />

      <input
        type="password"
        name="password"
        autocomplete="new-password"
        disabled={!isAdmin}
      />
    </form>
  );
};
```

## 18.7 常见陷阱

```javascript
// 陷阱1: disabled 的 input 值不提交
<form method="POST" action="/update">
  <input type="hidden" name="user-id" value="42" />  <!-- ✅ 解决方案：用 hidden 传值 -->
  <input type="text" name="name" disabled />          <!-- user-id 提交了，但 name 没有 -->
</form>
// 提交数据：{ user-id: 42 } ← name 丢失！

// 陷阱2: autocomplete 失效
// 常见原因：
// - input 在 display:none 的容器内
// - input 在 shadow DOM 内（部分浏览器）
// - name 属性名不标准
// - form 或 input 的 autocomplete="off" 全局关闭
// - 浏览器扩展禁用了自动填充

// 陷阱3: readonly 在 Safari 中可被编辑
// Safari 允许聚焦 readonly input 并编辑内容（虽然值不变）
// ✅ 需额外 JS 阻止输入：input.addEventListener('keydown', e => e.preventDefault())

// 陷阱4: disabled 的 radio/checkbox 仍可能被 label 切换
<label>
  <input type="checkbox" disabled />  <!-- 虽 disabled，但点击 label 仍可能切换 -->
</label>
// ✅ 配合 pointer-events:none 样式
input:disabled { pointer-events: none; }
```

## 18.8 面试 follow-up 问题

### Q1: 为什么 disabled 的表单元素不提交值，但 readonly 的会？这在工程实践中有什么实际影响？

**答案：**
根据 HTML 规范，`disabled` 的元素不是 **successful**（成功的）的表单控件，因此不参与表单提交序列化。`readonly` 的元素仍属于 successful 控件。

**实际影响：**

| 场景 | disabled | readonly |
|------|----------|----------|
| 编辑已有数据时传递 ID | ✅ 用 `<input type="hidden">` 传值 | ✅ 直接传值 |
| 表单验证 | ❌ 跳过 | ✅ 参与 |
| 保存草稿后重新加载 | ❌ 值不提交，需额外处理 | ✅ 保持一致性 |
| 批量编辑场景 | 常用于不可编辑字段 | 常用于预填信息 |

**工程建议：** 若字段需要传递值但不可编辑，用 `readonly` 而非 `disabled`。若字段既不可编辑也不应提交（如 token、计算字段），用 `disabled` + 额外 hidden input 传值。

---

### Q2: `autocomplete="new-password"` 失效时有哪些替代方案？浏览器是如何识别密码字段的？

**答案：**
当 `autocomplete="new-password"` 失效时（某些浏览器或复杂页面），替代方案：

1. **添加虚假 password input**：浏览器填充假 input，真实 input 保持空白
2. **动态生成 name 属性**：每次页面加载用随机名称，如 `pwd_${Math.random().toString(36)}`
3. **调整表单 action 和 name**：确保 `action="/register"` + `name="password"`
4. **检查是否有全局 `autocomplete="off"`**：覆盖了局部设置

浏览器识别密码字段的优先级：
```
1. <form action="/login"> → password 字段自动识别为登录密码
2. <form action="/register"> → password 字段自动识别为新密码
3. name 属性含 "password" → 高权重
4. type="password" → 基本识别
5. autocomplete 属性显式声明
```

---

### Q3: 如何实现一个"条件只读"字段——当用户未勾选某 checkbox 时 readonly，勾选后变为可编辑？

**答案：**
```tsx
import { useState } from 'react';

const ConditionalEditable = () => {
  const [agreed, setAgreed] = useState(false);
  const [feedback, setFeedback] = useState('');

  return (
    <form>
      <label>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        I agree to provide feedback
      </label>

      <label for="feedback">
        Please provide your feedback (optional when unchecked)
      </label>
      <textarea
        id="feedback"
        name="feedback"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        readOnly={!agreed}
        disabled={!agreed}
        placeholder={agreed ? '' : 'Agree above to enable'}
        style={agreed ? {} : { opacity: 0.6, cursor: 'not-allowed' }}
      />

      {/* disabled 的 textarea 提交时不传值 */}
      {/* 如果需要提交空字符串，可用 hidden input */}
      <input type="hidden" name="feedback" value={feedback} />
    </form>
  );
};
```

**关键设计点：**
- `readOnly` 让字段不可编辑但**可提交**
- `disabled` 让字段既不可编辑也**不提交**（配合 hidden input 解决）
- CSS 视觉反馈增强用户体验

---

> 📚 参考：
> - https://cloud.tencent.com/developer/article/2544332 （readonly vs disabled 详解）
> - https://blog.csdn.net/zcy_wxy/article/details/80550665 （disabled readonly 区别）
> - https://blog.csdn.net/lxx_110/article/details/132958800 （autocomplete 属性详解）
> - https://cloud.tencent.com/developer/article/2522332 （autocomplete 使用）
> - https://blog.csdn.net/liubt817/article/details/132689896 （autocomplete new-password）
> - https://blog.csdn.net/aydongzhiping/article/details/81562757 （浏览器记住密码机制）
