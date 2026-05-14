# Section 14: contenteditable 与 draggable

## 14.1 contenteditable 详解

### 基本语法

```html
<div contenteditable="true">可以编辑的内容</div>
<p contenteditable="false">不可编辑</p>
<span contenteditable="inherit">继承父级设置</span>
```

取值：`true` | `false` | `inherit`（默认）

### designMode vs contentEditable

| 维度 | `contentEditable` | `designMode` |
|------|------------------|--------------|
| 作用域 | 单个元素 | 整个文档 (document) |
| 适用元素 | 任意 HTML 元素 | 仅 document / iframe |
| 默认值 | 继承父元素 | "off" |
| 动态切换 | `el.contentEditable = 'true'` | `document.designMode = 'on'` |
| IE 兼容性 | IE5.5+ | IE6+ |

```javascript
// contentEditable: 单元素
const div = document.querySelector('#editor');
div.contentEditable = 'true';

// designMode: 全文档（常用于 iframe 富文本）
const iframe = document.querySelector('#editor-frame');
const doc = iframe.contentDocument || iframe.contentWindow.document;
doc.designMode = 'on';
```

### execCommand（已废弃）的替代方案

```javascript
// ❌ 已废弃，不推荐在新项目中使用
document.execCommand('bold');
document.execCommand('justifyCenter');
document.execCommand('fontSize', false, '5');

// ✅ 现代替代：Selection API + Range API
const selection = window.getSelection();
if (selection.rangeCount > 0) {
  const range = selection.getRangeAt(0);
  // 对选中内容执行格式化
  const fragment = range.extractContents();
  const span = document.createElement('strong');
  span.appendChild(fragment);
  range.insertNode(span);
}

// ✅ 使用 modern 库（如 Tiptap, Lexical）
// 它们基于自定义 Model 而非直接操作 DOM
```

### input 事件处理

```javascript
const editor = document.querySelector('[contenteditable]');

editor.addEventListener('input', (e) => {
  // 内容变化时触发（与 <input> 一致）
  const text = editor.textContent; // 纯文本
  const html = editor.innerHTML;   // 带格式 HTML
});

editor.addEventListener('beforeinput', (e) => {
  // 拦截输入事件（可取消）
  if (e.inputType === 'insertText' && /[<>]/.test(e.data ?? '')) {
    e.preventDefault(); // 阻止输入 < 或 >
  }
});

// 监听粘贴事件（过滤格式）
editor.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text); // 纯文本粘贴
});
```

```typescript
// React 中的 contenteditable 组件
import { useRef, useCallback } from 'react';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const EditableText = ({ value, onChange, placeholder }: EditableTextProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleInput = useCallback(() => {
    const text = ref.current?.textContent ?? '';
    onChange(text);
  }, [onChange]);

  return (
    <div
      ref={ref}
      contentEditable
      onInput={handleInput}
      data-placeholder={placeholder}
      suppressContentEditableWarning
      className="editable-text"
    />
  );
};
```

### 占位符实现

```css
/* contenteditable 无原生 placeholder，需借助 CSS 模拟 */
[contenteditable][data-placeholder]:empty::before {
  content: attr(data-placeholder);
  color: #999;
  pointer-events: none;
  user-select: none;
}
```

## 14.2 draggable 拖拽 API

### 拖拽事件流程

```
源元素（draggable）                 目标元素（drop zone）
+-------------------------+       +-------------------------+
| dragstart               |       | dragenter               |
|   设置 DataTransfer     |------->| dragover (必须 preventDefault)|
|   设置拖拽图像          |       |   启用 drop             |
| drag (持续)             |       | dragleave               |
| dragend (结束)          |       | drop (释放)             |
+-------------------------+       +-------------------------+
```

### 事件详解

```javascript
// =====================
// 源元素事件
// =====================

source.addEventListener('dragstart', (e) => {
  // 1. 必须设置数据，否则 Firefox 不显示拖拽效果
  e.dataTransfer.setData('text/plain', ev.target.innerText);
  e.dataTransfer.setData('text/html', ev.target.outerHTML);
  e.dataTransfer.setData('text/uri-list', ev.target.ownerDocument.location.href);

  // 2. 设置拖拽图标（可选）
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///...';
  e.dataTransfer.setDragImage(img, 10, 10);

  // 3. 设置允许的操作
  e.dataTransfer.effectAllowed = 'move'; // copy | move | link
});

source.addEventListener('drag', (e) => {
  // 拖拽过程中持续触发（节流使用）
});

source.addEventListener('dragend', (e) => {
  // 无论成功或取消，拖拽结束时触发
  e.dataTransfer.effectAllowed; // 最终效果
});

// =====================
// 目标元素事件
// =====================

target.addEventListener('dragenter', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  // 添加视觉反馈（如高亮边框）
});

target.addEventListener('dragover', (e) => {
  e.preventDefault(); // ⚠️ 必须！否则 drop 不触发
  e.preventDefault(); // 阻止默认行为以接受 drop
});

target.addEventListener('dragleave', (e) => {
  // 移除视觉反馈
});

target.addEventListener('drop', (e) => {
  e.preventDefault();
  const plainText = e.dataTransfer.getData('text/plain');
  const html = e.dataTransfer.getData('text/html');
  const uri = e.dataTransfer.getData('text/uri-list');
});
```

### DataTransfer API

```typescript
interface DataTransfer {
  dropEffect: 'none' | 'copy' | 'move' | 'link';
  effectAllowed: 'none' | 'copy' | 'copyLink' | 'copyMove' |
                 'link' | 'linkMove' | 'move' | 'all' | 'uninitialized';
  files: FileList;              // 拖拽文件时
  items: DataTransferItemList;  // 数据项列表
  types: DOMStringList;         // 已注册的数据类型

  setData(format: string, data: string): void;
  getData(format: string): string;
  clearData(format?: string): void;
  setDragImage(image: Element, x: number, y: number): void;
}
```

```javascript
// 多格式数据传递
source.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('application/json', JSON.stringify({ id: 1 }));
  e.dataTransfer.setData('text/plain', 'Fallback text');
});
```

## 14.3 原生 DnD 的局限性

| 限制 | 说明 | 替代方案 |
|------|------|----------|
| 样式不自定义 | 拖拽图像由浏览器生成，不易控制 | `setDragImage` 仅部分支持 |
| 移动端支持差 | 移动 Safari/Chrome 对拖拽 API 支持有限 | Touch Events + 自定义实现 |
| 文件拖放仅支持桌面 | 文件系统拖入必须通过 DataTransfer.files | 仅桌面端原生 DnD |
| 无碰撞检测 API | 需自行计算元素位置 | 使用 `getBoundingClientRect()` |
| drag 事件节流问题 | 持续触发可能影响性能 | 降频处理 |

**推荐替代：Pointer Events + 自定义拖拽实现**

```typescript
// 移动端兼容的轻量拖拽实现（伪代码）
const setupDraggable = (el: HTMLElement) => {
  let offsetX = 0, offsetY = 0;

  el.addEventListener('pointerdown', (e) => {
    offsetX = e.clientX - el.getBoundingClientRect().left;
    offsetY = e.clientY - el.getBoundingClientRect().top;
    el.setPointerCapture(e.pointerId);
    el.dataset.dragging = 'true';
  });

  el.addEventListener('pointermove', (e) => {
    if (el.dataset.dragging !== 'true') return;
    el.style.left = `${e.clientX - offsetX}px`;
    el.style.top = `${e.clientY - offsetY}px`;
  });

  el.addEventListener('pointerup', () => {
    el.dataset.dragging = 'false';
  });
};
```

## 14.4 无障碍访问（Accessibility）

### contenteditable 无障碍

```html
<!-- 正确：提供角色和标签 -->
<div
  role="textbox"
  aria-multiline="true"
  aria-label="Biography"
  contenteditable="true"
>
  User's biography here
</div>

<!-- 带占位符 -->
<div
  role="textbox"
  aria-label="Enter your name"
  contenteditable="true"
  data-placeholder="Type your name here"
></div>
```

**屏幕阅读器行为：**
- `role="textbox"` + `contenteditable` 时，屏幕阅读器将其视为标准文本输入框
- 自动播报内容变化
- 支持快捷键导航

### draggable 无障碍

**问题：** 原生 `draggable` API 不发出 ARIA 事件，屏幕阅读器无法感知。

**解决方案：** 配合键盘操作实现无障碍拖拽：

```html
<div
  role="listbox"
  aria-label="Reorderable list"
>
  <div
    role="option"
    tabindex="0"
    aria-grabbed="false"
    data-item-id="item-1"
  >
    Item 1 — press Space to grab
  </div>
  <div
    role="option"
    tabindex="0"
    aria-grabbed="false"
    data-item-id="item-2"
  >
    Item 2 — press Space to grab
  </div>
</div>
```

```typescript
// 键盘驱动的拖拽逻辑
const handleKeyboardDrag = (e: KeyboardEvent, item: HTMLElement) => {
  if (e.key === ' ') {
    e.preventDefault();
    const isGrabbed = item.getAttribute('aria-grabbed') === 'true';

    if (!isGrabbed) {
      // 抓起
      item.setAttribute('aria-grabbed', 'true');
      item.dataset.grabbedIndex = getSiblingIndex(item).toString();
    } else {
      // 放下
      const grabbedIdx = parseInt(item.dataset.grabbedIndex ?? '0', 10);
      const currentIdx = getSiblingIndex(item);
      reorderList(grabbedIdx, currentIdx);
      item.setAttribute('aria-grabbed', 'false');
    }
  }
};
```

## 14.5 contenteditable + draggable 组合使用

```javascript
// 同时启用编辑和拖拽的常见问题
// 解决方案：双击禁用拖拽，拖拽时禁用编辑

let isDragging = false;

draggableDiv.addEventListener('dragstart', () => {
  isDragging = true;
  draggableDiv.contentEditable = 'false'; // 拖拽时禁止编辑
  draggableDiv.style.opacity = '0.5';
});

draggableDiv.addEventListener('dragend', () => {
  isDragging = false;
  draggableDiv.contentEditable = 'true';
  draggableDiv.style.opacity = '1';
});

draggableDiv.addEventListener('dblclick', () => {
  if (!isDragging) {
    draggableDiv.contentEditable = 'false'; // 拖拽手柄模式
    draggableDiv.contentEditable = 'true';
  }
});
```

## 14.6 常见陷阱

```javascript
// 陷阱1: dragover 必须 preventDefault
target.addEventListener('dragover', (e) => {
  // ❌ 忘记 preventDefault，drop 事件永远不触发
  // ✅
  e.preventDefault();
});

// 陷阱2: Firefox 必须调用 setData
source.addEventListener('dragstart', (e) => {
  // ❌ Firefox 不显示拖拽效果
  // ✅ 必须至少设置一个数据
  e.dataTransfer.setData('text/plain', '');
});

// 陷阱3: contenteditable 会生成脏 HTML
// 用户粘贴时可能带入富文本标签，导致数据结构混乱
// ✅ 使用 paste 事件过滤
editor.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
});

// 陷阱4: 光标位置在失去焦点后重置
// ✅ 使用 Selection API 保存和恢复光标
const saveSelection = () => {
  const sel = window.getSelection();
  return sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
};
```

## 14.7 面试 follow-up 问题

### Q1: contenteditable 在 React 中使用时为什么需要 `suppressContentEditableWarning`？有没有更好的处理方式？

**答案：**
React 检测到父元素 `contentEditable` 的同时子元素也有 `contentEditable` 时会报警告。使用 `suppressContentEditableWarning` 可以抑制该警告。

更好的方式：
- 使用受控组件模式，通过状态管理内容而非直接操作 DOM
- 使用成熟的富文本库（Tiptap、Lexical、Slate）替代原生 `contenteditable`
- 如果必须使用，隔离内容结构，避免子元素再次 `contentEditable`

---

### Q2: HTML5 原生 Drag and Drop API 的主要缺陷是什么？实际项目中如何取舍？

**答案：**
主要缺陷：
1. **移动端几乎不可用**（iOS Safari 不支持）
2. 拖拽图像（drag image）定制能力弱
3. 无碰撞检测 API，需手动计算
4. `drag` 事件高频率触发
5. 视觉反馈依赖手动实现

取舍建议：
- 桌面端简单拖拽排序：用原生 DnD（如看板卡片排序）
- 需要移动端支持：用 Pointer Events + 自定义实现
- 复杂拖拽场景（如 Figma、Canva）：自研拖拽引擎或使用 `react-dnd`、`@dnd-kit/core`

---

### Q3: 如何实现一个键盘可访问的拖拽列表（无障碍）？

**答案：**
核心是使用 `aria-grabbed` 属性和键盘事件（Space/Arrow keys）：

1. 列表元素：`role="listbox"` + `aria-label`
2. 每个选项：`role="option"` + `tabindex="0"` + `aria-grabbed="false"`
3. 按 Space 抓起/放下，`aria-grabbed` 在 `true/false` 间切换
4. Arrow Up/Down 在抓起状态下移动顺序
5. 放下时用 `aria-grabbed="false"` 并触发 reorder 逻辑

```typescript
// 抓起状态
item.setAttribute('aria-grabbed', 'true');

// ArrowUp/Down 移动
if (e.key === 'ArrowUp' && item.getAttribute('aria-grabbed') === 'true') {
  const prev = item.previousElementSibling;
  prev?.before(item);
}

// 放下
item.setAttribute('aria-grabbed', 'false');
```

---

### Q4: contenteditable 和 `<textarea>` 在实现富文本编辑器时各有什么优缺点？

**答案：**
| 维度 | contenteditable | textarea |
|------|----------------|----------|
| 富文本支持 | ✅ 原生支持各种格式 | ❌ 仅纯文本 |
| 光标/选区 API | ✅ 有 | ❌ 无 |
| 用户体验 | ✅ 所见即所得 | ❌ 需要预览区 |
| 结构可控性 | ❌ DOM 结构不可控 | ✅ 完全可控 |
| 数据同步 | ❌ 需手动从 DOM 提取 | ✅ 双向绑定 |
| 一致性 | ❌ 各浏览器行为差异大 | ✅ 跨浏览器一致 |
| XSS 风险 | ❌ 需清洗 HTML | ✅ 无 |

现代编辑器（Tiptap、Quill、Lexical）采用 **contenteditable + 自定义 Model 映射** 方案，兼得富文本能力和数据可控性。

---

> 📚 参考：
> - https://www.cnblogs.com/AAABingBingBing/p/12675846.html （designMode 与 contentEditable）
> - https://blog.csdn.net/baidu_33033415/article/details/62882688 （designMode vs contentEditable）
> - https://www.cnblogs.com/delishcomcn/p/17645080.html （HTML5 Drag and Drop 详解）
> - https://zhuanlan.zhihu.com/p/394013628 （HTML5 Drag API 总结）
> - https://developer.mozilla.org/zh-CN/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop （File drag and drop MDN）
> - https://zhuanlan.zhihu.com/p/37051858 （富文本编辑器实现方式对比）
