# Section 20: HTMLCollection vs NodeList 区别

## 一、基本概念

HTMLCollection 和 NodeList 都是 **类数组对象（Array-like Object）**，表示 DOM 节点的有序集合。它们不是真正的 JavaScript 数组，但支持 `collection[index]` 索引访问和 `.length` 属性。

```javascript
const htmlCol = document.getElementsByTagName('div');
const nodeList = document.querySelectorAll('div');

console.log(htmlCol.length);    // ✅
console.log(nodeList.length);  // ✅
console.log(htmlCol[0]);        // ✅
console.log(nodeList[0]);      // ✅
// ❌ 没有 map/filter/find 等数组方法，需转换
```

---

## 二、最核心区别：Live（动态）vs Static（静态）

### 2.1 HTMLCollection — Live Collection（动态集合）

| 获取方法 | 返回类型 |
|---------|---------|
| `element.children` | HTMLCollection（Live） |
| `document.forms` | HTMLCollection（Live） |
| `document.images` | HTMLCollection（Live） |
| `document.getElementsByClassName()` | HTMLCollection（Live） |
| `document.getElementsByTagName()` | HTMLCollection（Live） |
| `document.getElementsByName()` | HTMLCollection（Live） |

**特点**：DOM 树变化时，集合**自动更新**。

```javascript
const divs = document.getElementsByTagName('div');
console.log(divs.length); // 假设 3

document.body.appendChild(document.createElement('div'));
console.log(divs.length); // 立即变为 4 —— Live！
```

### 2.2 NodeList — 大部分 Static，少数 Live

| 获取方法 | 返回类型 | 动态性 |
|---------|---------|:---:|
| `document.querySelectorAll()` | NodeList | ❌ Static |
| `element.querySelectorAll()` | NodeList | ❌ Static |
| `element.childNodes` | NodeList | ✅ Live |

```javascript
// Static NodeList（querySelectorAll）
const staticList = document.querySelectorAll('div');
console.log(staticList.length); // 3
document.body.appendChild(document.createElement('div'));
console.log(staticList.length); // 仍然是 3（快照不变）

// Live NodeList（childNodes）
const liveList = document.getElementById('parent').childNodes;
console.log(liveList.length); // 2
document.getElementById('parent').appendChild(document.createElement('span'));
console.log(liveList.length); // 变为 3
```

### 2.3 Live vs Static 对比表

| 特征 | Live Collection | Static NodeList |
|------|:---:|:---:|
| DOM 变化感知 | 自动更新 | 快照，不变 |
| 创建性能 | 快（轻量引用） | 中等（需构建快照） |
| 访问开销 | 每次访问都重新查询 | 稳定 O(1) |
| DOM 频繁变化时 | 自动同步，但有维护成本 | 不会自动同步 |
| 迭代安全性 | ❌（增删时索引错位） | ✅（安全遍历） |
| 典型方法 | `getElementsBy*` | `querySelectorAll` |

### 2.4 死循环陷阱

```javascript
// ❌ 错误：Live HTMLCollection 在循环中删元素导致死循环
const divs = document.getElementsByTagName('div');
for (let i = 0; i < divs.length; i++) {
  divs[0].remove(); // 每次删除后 length 减 1，i 永远赶不上
}

// ✅ 正确：倒序遍历
for (let i = divs.length - 1; i >= 0; i--) {
  divs[i].remove();
}

// ✅ 正确：转换为数组后操作
[...document.getElementsByTagName('div')].forEach(d => d.remove());

// ✅ 正确：while 循环
while (divs.length > 0) { divs[0].remove(); }
```

---

## 三、HTMLCollection 与 NodeList 的详细区别

### 3.1 类型与包含内容

| 对比维度 | HTMLCollection | NodeList |
|---|---|---|
| 包含内容 | **仅 HTML 元素**（nodeType=1） | **所有节点类型**（元素/文本/注释等） |
| `namedItem()` | ✅ 支持（按 id/name 获取） | ❌ 不支持 |
| 接口 | `HTMLCollection` | `NodeList` |
| 典型获取 | `getElementsByTagName`, `element.children` | `querySelectorAll`, `element.childNodes` |

```javascript
const container = document.getElementById('container');

container.children;       // HTMLCollection（仅元素，Live）
container.childNodes;    // NodeList（包含文本节点，Live）
container.querySelectorAll('div'); // NodeList（仅元素，Static）

// namedItem 示例
const imgs = document.images;
imgs.namedItem('logo');   // 获取 name="logo" 的图片
```

### 3.2 Array 方法转换

HTMLCollection 和 NodeList 都**不是真正的数组**，没有 `map/filter/reduce` 等方法。三种转换方式：

```javascript
const nl = document.querySelectorAll('div');

// 方式 1：Array.from（ES6+）
const arr1 = Array.from(nl);
arr1.map(el => el.textContent);

// 方式 2：展开运算符（ES6+）
const arr2 = [...nl];
arr2.filter(el => el.classList.contains('active'));

// 方式 3：NodeList.forEach（现代浏览器自带）
nl.forEach(el => console.log(el)); // ✅ 原生支持

// HTMLCollection 没有 forEach，需转换：
[...document.getElementsByClassName('item')].forEach(el => {
  el.classList.add('processed');
});
```

---

## 四、querySelectorAll vs getElementsBy* 性能

### 4.1 核心差异

| 维度 | `querySelectorAll` | `getElementsBy*` |
|------|---|---|
| 返回类型 | NodeList（Static） | HTMLCollection（Live） |
| 性能 | 较慢（需解析 CSS 选择器） | 快（浏览器内部直接查询） |
| 选择器灵活性 | 任意 CSS 选择器 | 只能是标签名/class/name |
| 实时性 | 否（快照） | 是（Live 自动更新） |
| 每次调用 | 返回新对象 | 某些浏览器返回同一引用 |

```javascript
// getElementsBy* —— Live，适合需要实时感知的场景
const activeItems = document.getElementsByClassName('active');
// activeItems 会自动更新，无需每次重新查询

// querySelectorAll —— Static，适合一次性操作
const items = document.querySelectorAll('.item[data-visible="true"]');
items.forEach(item => { /* ... */ });
```

### 4.2 实际性能

在现代 JS 引擎（V8/SpiderMonkey）中两者性能差异几乎可忽略。但需注意：

1. **在 `requestAnimationFrame` 中重复调用** `querySelectorAll` 有 GC 压力，不要这样做
2. **Live Collection 的维护成本** 比想象的低，浏览器内部有高效的变更通知机制
3. **大数据量场景**：5000+ 节点频繁操作时，`getElementsBy*` + 事件委托更合适

### 4.3 事件委托中的应用

```javascript
// ✅ 事件委托 —— 利用 Live Collection/Static NodeList 的特性
document.querySelector('ul').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (li) { handleClick(e, li); }
});
// 无论列表如何增删，只有一个监听器，完美工作

// 错误：给每个元素单独绑定事件
document.querySelectorAll('li').forEach(li => {
  li.addEventListener('click', handleClick); // 列表增删需重新绑定
});
```

---

## 五、常见面试陷阱

### 陷阱 1：误以为 querySelectorAll 返回 Live 集合

```javascript
const items = document.querySelectorAll('.item');

items[0].remove(); // 从 DOM 删除了
console.log(items.length); // 长度没变！快照不变
console.log(items[0]);     // 仍指向已删除节点（孤儿引用）
```

### 陷阱 2：用 for...in 遍历 NodeList

```javascript
const nl = document.querySelectorAll('div');

// ❌ 错误：for...in 会遍历 inherited 方法
for (const key in nl) {
  console.log(key); // 0, 1, 2, ..., length, item, forEach, ...
}

// ✅ 正确：for...of
for (const div of nl) { console.log(div); }

// ✅ 正确：for 循环
for (let i = 0; i < nl.length; i++) { console.log(nl[i]); }
```

### 陷阱 3：namedItem 在 HTML vs XHTML 中行为不同

在 **HTML 文档**中 `namedItem` 按 id 和 name 查找，**不区分大小写**；在 **XHTML/XML 文档**中严格区分大小写。

---

## 六、面试follow-up questions

**Q1. HTMLCollection 中有 10000 个元素，需要删除 `data-remove="true"` 的所有元素，最优方案是什么？**

最优解：**倒序遍历 Live HTMLCollection**。

```javascript
const toRemove = document.getElementsByTagName('div'); // Live HTMLCollection

for (let i = toRemove.length - 1; i >= 0; i--) {
  if (toRemove[i].dataset.remove === 'true') {
    toRemove[i].remove();
  }
}
```

原因：HTMLCollection 是 Live 的，`length` 在每次删除后自动更新，倒序从末端开始删除不会导致索引错位，且无需转换为数组（O(1) 空间复杂度）。10000 个元素的时间复杂度为 O(n)。

---

**Q2. `querySelectorAll` 返回的 NodeList 有哪些方法可用？**

现代浏览器的 `NodeList` 原生支持 `forEach`，但**没有** `map/filter/find/reduce` 等数组方法：

```javascript
const nl = document.querySelectorAll('div');

nl.forEach(el => console.log(el)); // ✅ ES2017
nl.length;                         // ✅
nl[0];                             // ✅
nl.item(0);                        // ✅

// ❌ 以下方法不存在
nl.map();      // undefined
nl.filter();   // undefined
nl.find();     // undefined
nl.reduce();   // undefined

// ✅ 正确做法：转换后使用数组方法
[...nl].map(el => el.textContent);
Array.from(nl).filter(el => el.classList.contains('active'));
```

这是因为 `querySelectorAll` 最初设计为**不可修改列表**（immutable list），现代 API 则基于 JavaScript 数组实现集合结构。

---

**Q3. 为什么说 `getElementsBy*` 返回的是「同一个引用」而 `querySelectorAll` 每次都是「新对象」？**

```javascript
// getElementsByTagName —— 返回同一 Live HTMLCollection 引用
const a = document.getElementsByTagName('div');
const b = document.getElementsByTagName('div');
console.log(a === b); // ✅ true（大多数现代浏览器复用同一对象）

// querySelectorAll —— 每次返回新快照
const c = document.querySelectorAll('div');
const d = document.querySelectorAll('div');
console.log(c === d); // ❌ false（两个独立对象）
```

这意味着保留 `getElementsBy*` 的引用可能导致**内存泄漏**——即使页面结构已变化，浏览器仍维护着这个 Live 集合。在不需要 Live 更新的场景下，用 `querySelectorAll` 更安全，或在用完后清空引用（`el = null`）。

> 📚 参考：
> - [MDN: HTMLCollection](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLCollection)
> - [MDN: NodeList](https://developer.mozilla.org/zh-CN/docs/Web/API/NodeList)
> - [MDN: querySelectorAll](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/querySelectorAll)
> - [DOM Living Standard - HTMLCollection](https://dom.spec.whatwg.org/#htmlcollection)
> - [DOM Living Standard - NodeList](https://dom.spec.whatwg.org/#interface-nodelist)
> - [SegmentFault: NodeList 与 HTMLCollection 区别详解](https://segmentfault.com/a/1190000011197253)
