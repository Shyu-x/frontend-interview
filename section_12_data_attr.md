# Section 12: data-* 属性

## 12.1 概念与基本语法

`data-*` 是 HTML5 引入的**自定义数据属性**机制，允许在任意 HTML 元素上存储结构化的键值对数据。

```html
<article
  id="electriccars"
  data-columns="3"
  data-index-number="12314"
  data-parent-category="cars"
  data-user='{"name":"Alice","level":5}'
>
  Article content here
</article>
```

命名规则：
- 必须以 `data-` 开头
- 之后至少包含一个字符（不含大写字母）
- 可使用连字符 `-`，在 JS 中转为驼峰（dataset API）

## 12.2 dataset API vs getAttribute

### 对比表

| 维度 | dataset API | getAttribute |
|------|------------|--------------|
| 语法 | `el.dataset.keyName` | `el.getAttribute('data-key-name')` |
| 连字符处理 | 自动转驼峰 | 需手写完整属性名 |
| 返回类型 | 始终 string | 始终 string |
| 性能 | 稍快（有缓存机制） | 略慢（每次查找） |
| 兼容性 | IE11+ | 所有浏览器 |
| 删除属性 | `delete el.dataset.key` | `el.removeAttribute('data-key')` |
| 遍历所有 data-* | `Object.keys(el.dataset)` | 需遍历所有属性过滤 |

### 代码对比

```javascript
const article = document.querySelector('#electriccars');

// dataset API
article.dataset.columns          // "3" (string)
article.dataset.indexNumber      // "12314" (string, 驼峰转换)
article.dataset.parentCategory   // "cars"
article.dataset.user            // '{"name":"Alice","level":5}'
delete article.dataset.columns  // 删除属性

// getAttribute
article.getAttribute('data-columns')          // "3"
article.getAttribute('data-index-number')       // "12314"
article.getAttribute('data-parent-category')   // "cars"
article.removeAttribute('data-columns')         // 删除属性
```

```typescript
// TypeScript 类型支持
interface HTMLDataElement extends HTMLElement {
  dataset: DOMStringMap;
}
// DOMStringMap 是 { [key: string]: string }
```

```tsx
// React 中的使用
const Card = ({ id, name, level }: CardProps) => (
  <div
    className="card"
    data-id={id}
    data-name={name}
    data-level={level}
  >
    {/* 读取时 */}
    <button onClick={(e) => {
      const el = e.currentTarget.closest('[data-id]') as HTMLElement;
      console.log(el.dataset.id); // string 类型
    }}>
      Details
    </button>
  </div>
);
```

## 12.3 数据存储模式

### 模式一：简单字符串存储（推荐简单场景）

```html
<button data-status="loading" data-id="42">Submit</button>
```

```javascript
const btn = document.querySelector('button[data-id="42"]');
console.log(btn.dataset.status); // "loading"
```

### 模式二：JSON 序列化存储（推荐复杂数据）

```html
<div
  data-config='{"theme":"dark","autoplay":true,"volume":80}'
  data-items='[{"id":1,"name":"Item A"},{"id":2,"name":"Item B"}]'
>
```

```typescript
const el = document.querySelector('[data-config]');
const config = JSON.parse(el.dataset.config!);
const items = JSON.parse(el.dataset.items!);
// 类型化访问
interface Config {
  theme: 'dark' | 'light';
  autoplay: boolean;
  volume: number;
}
```

```tsx
// React 组件中序列化存储
const ConfigPanel = ({ config }: { config: Config }) => {
  return (
    <div
      data-config={JSON.stringify(config)}
      data-testid="config-panel"
    />
  );
};
```

### 模式三：组件状态存储

```html
<div
  data-component="tabs"
  data-active-tab="tab-2"
  data-previous-tab="tab-1"
>
```

```typescript
// 状态管理
interface ComponentState {
  activeTab: string;
  previousTab: string;
}

const getComponentState = (el: HTMLElement): ComponentState => ({
  activeTab: el.dataset.activeTab ?? '',
  previousTab: el.dataset.previousTab ?? '',
});
```

**注意事项：** JSON 存储中包含双引号，HTML 属性值必须用**单引号**包裹，否则需对双引号转义。

## 12.4 ARIA 与 data-* 的关系

### aria-* vs data-*

| 属性类型 | 用途 | 屏幕阅读器感知 |
|----------|------|--------------|
| `aria-*` | 表达语义和状态（无障碍） | 是 |
| `data-*` | 存储开发用元数据 | 否 |

两者可配合使用：

```html
<div
  role="listbox"
  aria-label="Color picker"
  data-selected-index="2"
  aria-activedescendant="color-option-2"
>
  <div id="color-option-0" role="option" data-color="#ff0000">Red</div>
  <div id="color-option-1" role="option" data-color="#00ff00">Green</div>
  <div id="color-option-2" role="option" data-color="#0000ff" aria-selected="true">Blue</div>
</div>
```

### 典型搭配模式

```html
<!-- data-* 提供 JS 所需数据，aria-* 提供无障碍语义 -->
<button
  data-dropdown-target="menu-panel"
  aria-haspopup="true"
  aria-expanded="false"
>
  Open Menu
</button>
<div id="menu-panel" hidden data-dropdown-menu="main">
  <!-- 菜单内容 -->
</div>
```

```typescript
// 配合使用的 JS 逻辑
const toggleBtn = document.querySelector('[data-dropdown-target]');
const panel = document.getElementById(toggleBtn.dataset.dropdownTarget!);

toggleBtn.addEventListener('click', () => {
  const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
  toggleBtn.setAttribute('aria-expanded', String(!isExpanded));
  panel.hidden = isExpanded;
});
```

## 12.5 最佳实践

### 命名规范

```html
<!-- 推荐：语义化命名 -->
<div data-user-id="123" data-user-role="admin"></div>

<!-- 避免：过于通用或冗余 -->
<div data-value="123" data-info="something"></div>

<!-- 复合属性用 JSON -->
<div data-item='{"id":1,"qty":5,"price":99.9}'></div>
```

### 数据类型处理

```typescript
// 读取时的类型转换
const el = document.querySelector('[data-item]');

const item = {
  id: parseInt(el.dataset.id ?? '0', 10),
  qty: parseInt(el.dataset.qty ?? '1', 10),
  price: parseFloat(el.dataset.price ?? '0'),
  active: el.dataset.active === 'true',
};

// 写入时的类型转换
el.dataset.id = String(123);
el.dataset.active = String(true); // 始终是 string
```

### CSS 访问 data-*

```css
/* 使用属性选择器 */
article[data-columns='3'] {
  width: 400px;
}

article[data-columns='4'] {
  width: 600px;
}

/* 使用 attr() 函数（contenteditable 占位符等场景） */
[data-placeholder]:empty::before {
  content: attr(data-placeholder);
  color: #999;
}

/* 数据驱动样式 */
.card[data-vip="true"] {
  border: 2px solid gold;
}
```

### 安全注意事项

```html
<!-- 风险：data-* 中存储敏感数据（如密码 token）可通过 DevTools 查看 -->
<div data-token="secret-api-key-xxx"></div>

<!-- 安全建议：仅用于非敏感元数据，敏感数据用 JS 变量或 HttpOnly Cookie -->
```

## 12.6 常见陷阱

```javascript
// 陷阱1: dataset 键名转换规则
// data-user-name → dataset.userName (驼峰)
// data-abc-def  → dataset.abcDef
el.dataset['user-name']; // ❌ undefined
el.dataset.userName;     // ✅ 正确

// 陷阱2: getAttribute 不做转换
el.getAttribute('data-user-name'); // ✅ "value"

// 陷阱3: 删除属性
delete el.dataset.foo;          // ✅
el.dataset.foo = undefined;     // ⚠️ 设置为 "undefined" 字符串

// 陷阱4: 值为空字符串时
<div data-empty=""></div>
el.dataset.empty; // "" (空字符串，非 undefined)

// 陷阱5: jQuery $.data() vs dataset
// jQuery $.data() 会尝试解析 number/boolean，不等于 dataset
$('<div data-id="42">').data('id');        // 42 (number)
// div.dataset.id;                          // "42" (string)
```

## 12.7 面试 follow-up 问题

### Q1: `dataset` 和 `getAttribute` 在读写性能上有什么区别？实际开发中如何选择？

**答案：**
`dataset` 底层调用 `getAttribute`/`setAttribute`，但有内部缓存机制，在连续读取同一属性时更快。`getAttribute` 每次都直接访问 DOM，稳定性好。

选择建议：
- 简单存取：用 `dataset.key`（更简洁）
- 需兼容旧浏览器：用 `getAttribute`
- 需动态构造属性名：用 `getAttribute('data-' + key)`
- 批量读取：优先用 `dataset`，再用 `Object.keys(el.dataset)` 遍历

---

### Q2: 如果需要在 data-* 中存储数组或对象，正确的做法是什么？有什么坑？

**答案：**
使用 `JSON.stringify` 序列化，读取时 `JSON.parse`。坑在于：

```html
<!-- HTML 属性值必须用单引号 -->
<div data-items='[{"id":1},{"id":2}]'></div>

<!-- 错误示例：双引号会截断属性 -->
<!-- <div data-items="[{"id":1}]"> -->
```

读取后需类型断言（TypeScript）：
```typescript
const items = JSON.parse(el.dataset.items!) as Item[];
```

另一个坑：`JSON.stringify` 后无法被 CSS 选择器直接匹配，如需 CSS 驱动样式，应将独立字段提取为单独 data-* 属性。

---

### Q3: data-* 和全局状态管理（如 Redux）如何配合使用？何时用 data-* 何时用状态管理？

**答案：**
`data-*` 适合**本地化、DOM 关联的轻量状态**，如 UI 临时状态、组件 ID、hover 提示数据。

```
+---------------------------+---------------------------+
|        data-* 存储        |       状态管理存储         |
+---------------------------+---------------------------+
| 组件内部 UI 状态           | 跨组件共享状态             |
| 临时交互数据               | 服务端同步数据             |
| CSS 驱动样式开关           | 异步副作用(API 调用)       |
| 与 DOM 紧耦合              | 与 DOM 解耦                |
| localStorage 同级         | Redux/Zustand 等          |
+---------------------------+---------------------------+
```

如需双向绑定：使用 `data-*` 作为 DOM 锚点，通过事件驱动更新状态管理器：

```typescript
const handleDragStart = (e: DragEvent) => {
  const itemId = (e.target as HTMLElement).dataset.itemId;
  store.dispatch(moveItem(itemId!)); // 同步到全局状态
};
```

---

> 📚 参考：
> - https://blog.csdn.net/weixin_34378969/article/details/93413903 （HTML data attributes 基础）
> - https://www.cnblogs.com/ganping/p/13385541.html （data-* 属性解惑）
> - https://blog.csdn.net/gitblog_00383/article/details/152764956 （dataset API vs jQuery）
> - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-describedby （aria-describedby）
> - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-description （aria-description）
