---
title: 手写工具函数
description: 手写深拷贝、防抖、节流、数组扁平化与 LRU 缓存等高频工具函数。
tags:
  - coding
  - interview
  - utils
date: 2026-05-17
---

# 手写工具函数

## 1. 手写深拷贝

```javascript
// 手写深拷贝：支持循环引用、Symbol、Date、RegExp、函数、Map、Set等
function deepClone(target, hash = new WeakMap()) {
  // 处理原始类型
  if (target === null || typeof target !== 'object') return target;

  // 处理循环引用
  if (hash.has(target)) return hash.get(target);

  // 处理Date
  if (target instanceof Date) return new Date(target);

  // 处理RegExp
  if (target instanceof RegExp) return new RegExp(target.source, target.flags);

  // 处理Error
  if (target instanceof Error) {
    const err = new Error(target.message);
    err.name = target.name;
    err.stack = target.stack;
    return err;
  }

  // 处理函数
  if (typeof target === 'function') {
    if (target.prototype) {
      // 普通函数：返回包装函数
      return function(...args) { return target.apply(this, args); };
    }
    // 箭头函数：直接返回
    return target;
  }

  // 处理Map
  if (target instanceof Map) {
    const clone = new Map();
    hash.set(target, clone);
    target.forEach((v, k) => clone.set(deepClone(k, hash), deepClone(v, hash)));
    return clone;
  }

  // 处理Set
  if (target instanceof Set) {
    const clone = new Set();
    hash.set(target, clone);
    target.forEach(v => clone.add(deepClone(v, hash)));
    return clone;
  }

  // 处理数组和普通对象
  const clone = Array.isArray(target) ? [] : {};
  hash.set(target, clone);
  for (const key of Object.keys(target)) {
    clone[key] = deepClone(target[key], hash);
  }
  return clone;
}

// 测试：
const original = {
  date: new Date(),
  regex: /test/gi,
  map: new Map([['a', 1]]),
  set: new Set([1, 2]),
  nested: { fn: () => 'hello' }
};
original.circular = original; // 循环引用
const cloned = deepClone(original);
console.log(cloned.date instanceof Date); // true
console.log(cloned.regex.source); // test
console.log(cloned.map.get('a')); // 1
console.log(cloned.circular === original); // false（不是同一个引用）
console.log(cloned.nested.fn()); // hello
```

## 2. 手写防抖 debounce

```javascript
// 防抖：n秒后执行，n秒内再次触发则重新计时
function debounce(fn, delay, immediate = false) {
  let timer = null;

  return function(...args) {
    const context = this;
    // 立即执行模式（第一次触发立即执行）
    if (immediate && !timer) {
      fn.apply(context, args);
    }
    // 清除之前的定时器，重新计时
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!immediate) {
        fn.apply(context, args);
      }
      timer = null;
    }, delay);
  };
}

// 进阶：返回函数，允许手动取消和立即执行
function debounceAdvanced(fn, delay, options = {}) {
  let timer = null;
  let lastArgs = null;
  const { leading = false, trailing = true, maxWait } = options;

  let maxTimer = null;

  function invoke() {
    if (lastArgs) {
      fn.apply(this, lastArgs);
      lastArgs = null;
      clearTimeout(maxTimer);
      maxTimer = null;
    }
  }

  return function(...args) {
    const context = this;

    // leading：立即执行
    if (leading && !timer) {
      fn.apply(context, args);
    }

    clearTimeout(timer);
    lastArgs = args;

    // trailing：在delay后执行
    timer = setTimeout(() => {
      invoke.call(context);
      timer = null;
    }, delay);

    // maxWait：在超过maxWait后强制执行（防抖+节流的混合）
    if (maxWait !== undefined && !maxTimer) {
      maxTimer = setTimeout(() => {
        invoke.call(context);
        maxTimer = null;
      }, maxWait);
    }
  };
}

// 使用：
const handleSearch = debounce(async (query) => {
  const res = await fetch(`/search?q=${query}`);
  render(await res.json());
}, 300);
input.addEventListener('input', e => handleSearch(e.target.value));
```

## 3. 手写节流 throttle

```javascript
// 节流：n秒内只执行一次（固定频率）
function throttle(fn, delay) {
  let lastTime = 0;

  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

// 进阶：支持leading和trailing
function throttleAdvanced(fn, delay, options = {}) {
  let lastTime = 0;
  let timer = null;
  const { leading = true, trailing = true } = options;

  return function(...args) {
    const context = this;
    const now = Date.now();

    if (!lastTime && !leading) lastTime = now;

    const remaining = delay - (now - lastTime);
    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      lastTime = now;
      fn.apply(context, args);
    } else if (!timer && trailing) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        lastTime = leading ? Date.now() : 0;
        timer = null;
        fn.apply(context, args);
      }, remaining);
    }
  };
}

// RAF节流（最精确，配合屏幕刷新率）：
function throttleRAF(fn) {
  let pending = false;
  return function(...args) {
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        fn.apply(this, args);
        pending = false;
      });
    }
  };
}

// 使用：
const handleScroll = throttleRAF(() => {
  const scrollY = window.scrollY;
  // 执行滚动相关逻辑
});
window.addEventListener('scroll', handleScroll);
```

## 4. 手写数组扁平化 flatten

```javascript
// 手写flatten：数组扁平化（指定深度）
function flatten(arr, depth = 1) {
  const result = [];
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      // 递归扁平化（深度-1）
      result.push(...flatten(item, depth - 1));
    } else {
      result.push(item);
    }
  }
  return result;
}

// 无限深度版
function flattenDeep(arr) {
  return arr.reduce((acc, item) =>
    Array.isArray(item) ? acc.concat(flattenDeep(item)) : acc.concat(item)
  , []);
}

// ES2019 flat（内置）
const r = [1, [2, [3, [4]]]].flat(2); // [1, 2, 3, [4]]
const rDeep = [1, [2, [3, [4]]]].flat(Infinity); // [1, 2, 3, 4]

// 手动实现.flat（用于理解）：
Array.prototype.myFlat = function(depth = 1) {
  const result = [];
  const flat = (arr, d) => {
    for (const item of arr) {
      if (Array.isArray(item) && d > 0) {
        flat(item, d - 1);
      } else {
        result.push(item);
      }
    }
  };
  flat(this, depth);
  return result;
};

// 带separator的join（不常用）：
function flattenWithSeparator(arr, separator = ',') {
  return arr.toString().split(separator);
}

// 测试：
console.log(flatten([1, [2, [3, [4]]]], 1)); // [1, 2, [3, [4]]]
console.log(flatten([1, [2, [3, [4]]]], 2)); // [1, 2, 3, [4]]
console.log(flattenDeep([1, [2, [3, [4]]]])); // [1, 2, 3, 4]
```

## 5. 手写 LRU 缓存

```javascript
// LRU Cache：最近最少使用缓存（淘汰最久未使用的）
// 实现：HashMap + 双向链表（O(1) get/put）

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // Map保持插入顺序
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    // 读取后移到最后（最近使用）
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      // 更新，移到最后
      this.cache.delete(key);
      this.cache.set(key, value);
    } else {
      // 新增
      if (this.cache.size >= this.capacity) {
        // 淘汰最老的（Map的第一个key）
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, value);
    }
  }
}

// 用双向链表实现（面试时展示原理）：
class LRUCache链表 {
  constructor(capacity) {
    this.capacity = capacity;
    this.head = new Node(null, null); // 虚拟头
    this.tail = new Node(null, null); // 虚拟尾
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const node = this.cache.get(key);
    this.moveToTail(node); // 移到尾部（最近使用）
    return node.value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      this.moveToTail(node);
    } else {
      if (this.cache.size >= this.capacity) {
        const first = this.head.next;
        this.remove(first);
        this.cache.delete(first.key);
      }
      const newNode = new Node(key, value);
      this.cache.set(key, newNode);
      this.addToTail(newNode);
    }
  }

  addToTail(node) {
    node.prev = this.tail.prev;
    node.next = this.tail;
    this.tail.prev.next = node;
    this.tail.prev = node;
  }

  remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  moveToTail(node) {
    this.remove(node);
    this.addToTail(node);
  }
}

class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

// 测试：
const cache = new LRUCache(3);
cache.put('a', 1);
cache.put('b', 2);
cache.put('c', 3);
console.log(cache.get('a')); // 1（a移到末尾：[b,c,a]）
cache.put('d', 4); // 淘汰b：[c,a,d]
console.log(cache.get('b')); // -1（已淘汰）
```

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格，顶部关键词筛选框 | 防抖 + LRU | 联想查询接口 + 内存结果缓存 | 防抖延迟要长于用户打字间隔；缓存键要把筛选条件一起拼进去 |
| 多人协作白板的他人光标位置广播 | 节流 + 深拷贝 | WebSocket + 撤销快照栈 | 白板图元互相引用，深拷贝必须处理循环引用 |
| 低端安卓首屏的组织架构树选择器 | 数组扁平化 + 节流 | 扁平数组 + 虚拟列表 | 拍平后要保留 parentId，否则回显路径要重新遍历树 |
| 地图应用拖拽加载瓦片 | 节流 + LRU | 瓦片服务 + 图片缓存 | 节流周期要对齐屏幕刷新节奏；LRU 容量按可见瓦片数定 |
| 富文本编辑器的撤销重做 | 深拷贝 + LRU | 快照栈 + 容量上限 | 快照只存文档必要字段，函数与 DOM 节点要跳过 |
| 表单草稿自动保存 | 防抖 | localStorage + 草稿接口 | 输入过程中定时器被清掉，切页前要手动 flush 一次 |
| 前端日志上报与错误去重 | 节流 + LRU | sendBeacon + 错误指纹缓存 | 页面卸载前要 flush；LRU 容量决定去重的时间窗口 |
| 搜索历史与最近访问列表 | LRU | 本地存储 + 容量上限 | 命中后要重排顺序；持久化与还原都要保持顺序 |
| 商品筛选面板的多维数组渲染 | 数组扁平化 | 扁平数组 + key 索引 | 拍平后 id 必须唯一，重复 id 会让列表 diff 错位 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格，输入框联想筛选

**业务背景**：运营后台的订单表默认一次查出上万行，顶部筛选框每敲一个字符就发一次请求，接口和渲染都会被拖慢。验证规模的方法：在开发者工具的 Network 面板里数一次输入 10 个字符触发的请求数。

**怎么用本页知识解决**：先用防抖把连续输入收口成一次请求，再用 LRU 让重复出现的关键词直接命中内存。

```js
// 本页手写的 debounce 与 LRU 组合使用
const resultCache = new LRU(50);            // 容量 50，超出后淘汰最久未用的关键词
async function search(keyword) {
  if (resultCache.has(keyword)) {           // 命中缓存：不发请求
    return resultCache.get(keyword);
  }
  const rows = await api.query(keyword);    // 未命中：请求后端
  resultCache.set(keyword, rows);           // 写回缓存，并刷新它的新鲜度
  return rows;
}
const onInput = debounce(async (ev) => {    // 停止输入 300ms 后才执行
  const kw = ev.target.value.trim();
  if (!kw) return;
  render(await search(kw));                 // 拿到结果后一次性渲染
}, 300);
input.addEventListener('input', onInput);   // 高频事件只驱动包装后的函数
```

- 防抖把 10 次输入压成 1 次请求，前提是用户打字间隔小于 300ms；连续不停输入时一次都不会发。
- LRU 只在关键词被重复搜索时起作用，命中率取决于用户的修改习惯，接入前先用埋点统计重复率。
- 缓存键用原始字符串，大小写和首尾空格差异会算成两个键，取关键词时先 trim。
- 容量 50 是内存占用与命中率的取舍，用 Performance 面板的 JS Heap 观察长时间运行后的增长。

**怎么度量收益**：看 Network 面板的请求条数与 Performance 面板的 Long Task 数量。同一份数据、同一台机器录制三次取中位数，记录输入 10 个字符的总耗时。

**什么时候不该用**：

- 查询结果与用户权限、库存强相关时，缓存会返回过期行，这类页面只能做防抖不做 LRU。
- 输入框只用于提交后跳转的简单搜索页，用户本来只敲一次，防抖只会增加一次可感知的延迟。

#### 场景 2：多人协作白板的光标广播与撤销栈

**业务背景**：一块白板同时有几十人在线，拖动图元时指针每秒产生上百条事件，逐条广播会把带宽和接收端渲染打满。验证规模的方法：在开发者工具的 Network 面板看 WebSocket 帧的发送频率。

**怎么用本页知识解决**：用节流给广播频率设上限，用深拷贝给撤销栈做状态快照，快照必须能处理图元之间的循环引用。

```js
// 光标广播：节流保证发送频率有上限，同时保留最后一次
const broadcastCursor = throttle((pos) => {
  ws.send(JSON.stringify({ type: 'cursor', ...pos })); // 只发坐标，不发整块画布
}, 50);

// 撤销栈：每次提交前对画布状态做深拷贝
const undoStack = [];
function commit(state) {
  undoStack.push(deepClone(state)); // 手写深拷贝要能处理图元之间的循环引用与 Map 类型
  if (undoStack.length > 100) undoStack.shift(); // 限制栈深，避免内存持续增长
}

board.on('pointermove', (e) => broadcastCursor({ x: e.x, y: e.y })); // 高频事件接入节流
```

- 节流与防抖的差别在这里体现：拖动过程中对手要持续看到光标，换成防抖会让光标只在停手时出现。
- 50ms 先按对手能感知的连续移动确定，再用 Network 面板量出实际帧速率回头调整。
- 深拷贝必须支持循环引用，否则图元 A 引用 B、B 又引用 A 时会无限递归直到栈溢出。
- 深拷贝快照占用内存，栈深上限 100 是硬约束；改成只记录操作日志可以省内存，但实现成本上升。
- 撤销栈只在本地维护，远端同步走消息通道，两套数据不要共用同一份引用。

**怎么度量收益**：看 Network 面板的 WebSocket 帧速率，看 Performance 面板拖动 5 秒内的掉帧数与内存曲线。用固定的拖动轨迹脚本回放，保证两次测量可比。

**什么时候不该用**：

- 白板只允许单人编辑时，光标没有广播对象，节流代码属于无效路径。
- 图元数量少且没有互相引用时，用 structuredClone 或只拷贝变化字段即可，手写深拷贝的维护成本收不回来。

#### 场景 3：低端安卓首屏的组织架构树选择器

**业务背景**：企业内部通讯录的部门树有上千个节点，低端安卓机上展开子部门会卡住主线程，首屏可交互时间被推迟。验证规模的方法：用 Performance 面板录制首屏，统计超过 50ms 的 Long Task 数量与总时长。

**怎么用本页知识解决**：把树拍平成扁平数组只做一次，搜索与渲染都查这份数组；滚动渲染用节流控制调用次数。

```js
// 拍平：一次遍历把树变成数组，节点带上 parentId
function flatten(nodes, parentId = null, out = []) {
  for (const node of nodes) {
    out.push({ id: node.id, name: node.name, parentId }); // 记录父节点，回显路径时不用再遍历树
    if (node.children) flatten(node.children, node.id, out); // 递归处理子节点
  }
  return out;
}

const flat = flatten(treeData);           // 只拍平一次，搜索与虚拟列表复用同一份数组
const keywordIndex = buildIndex(flat);    // 用扁平数组建索引，搜索不再递归
window.addEventListener('scroll', throttle(() => {
  renderVisibleRows(flat, window.scrollY); // 滚动时只渲染可见区间的行
}, 100));
```

- 拍平的收益来自搜索从递归变成数组遍历，节点越多，省掉的重复遍历次数越多。
- parentId 是回显"所在路径"的必需字段，漏掉它就得回到树里做二次查找。
- 节流周期 100ms 按滚动帧预算确定，取值过小会让每次滚动事件都触发渲染。
- 拍平后的 id 必须唯一，重复 id 会让虚拟列表复用错行，表现为滚动时内容跳动。

**怎么度量收益**：用 Performance 面板录制首屏与一次展开操作，看 Long Task 数量、Total Blocking Time 和 Bottom-Up 视图里 flatten 与 render 的自耗时。在 6 倍 CPU 降速下重复三次取中位数。

**什么时候不该用**：

- 子部门数据由后端分页接口按需返回时，首屏拍平会拉取当前用不到的节点，请求数反而上升。
- 节点总量只有几十个时，拍平与建索引的开销和直接递归处在同一量级，收益测不出来。

### 行业先进实践

`cloneDeep 与 debounce（出处：lodash 官方文档）`
lodash 的 cloneDeep 处理循环引用以及 Date、RegExp、Map、Set、Symbol 键，debounce 提供 leading、trailing 与 cancel 选项。借鉴方式：把自己的实现和它跑同一组用例，逐条比对差异。需核对官方文档：cloneDeep 对函数与 DOM 节点的返回值。

`structuredClone（出处：MDN Web Docs）`
浏览器内置的结构化克隆按 HTML 规范实现，支持循环引用、Date、RegExp、Map、Set、ArrayBuffer，遇到函数、Proxy、DOM 节点会抛出 DataCloneError。借鉴方式：能被它覆盖的场景直接用它，手写深拷贝留给需要保留函数或克隆类实例的场合。需核对官方文档：浏览器兼容性表中的最低版本。

`lru-cache（出处：npm 包 lru-cache 官方文档）`
这个包提供 max、maxSize、ttl、dispose 回调，可以按条目大小而不是条目数量计算容量。借鉴方式：手写 LRU 用 Map 的插入顺序实现，需求扩展到过期时间与容量回调后改用成熟实现。它处理了过期清理与读取时的顺序更新，这两处是手写版本容易漏掉的。

`requestAnimationFrame 与读写分离（出处：MDN Web Docs 的 requestAnimationFrame 条目）`
把 DOM 读取集中在一帧开始、写入放进 rAF 回调，能避开强制同步布局。借鉴方式：滚动与拖拽场景的节流时间基准从 setTimeout 换成 rAF，掉帧情况可以直接在 Performance 面板对比。需核对官方文档：MDN 上关于强制同步布局的专门章节标题。

`Yjs 的 UndoManager（出处：Yjs 官方文档）`
Yjs 用共享类型上的事务记录撤销，不靠对整个文档做深拷贝快照。借鉴方式：文档体量涨到深拷贝快照占内存明显时，从"存状态"改成"存操作与逆操作"。这条路径实现成本高，先确认快照确实成为瓶颈再迁移。

### 从学到用：落地路线

第 1 步，在团队里挑一个输入联想或筛选页面做试点，只接防抖与 LRU，不动数据层。验收标准：Network 面板里一次 10 字符输入的请求数从 10 降到 1。

第 2 步，用 Performance 面板录制改造前后的首屏与交互，记录 Long Task 数量与总阻塞时间。验收标准：同一设备、同一份数据录制三次，中位数可被其他人复现。

第 3 步，把手写函数抽成内部包，补齐循环引用、Symbol 键、容量淘汰的单元测试，替换页面里散落的同名工具调用。验收标准：包发布后至少 3 个页面接入，测试覆盖本页列出的全部数据类型。

第 4 步，在 CI 里加性能用例与体积阈值，大数组深拷贝和万次节流调用都纳入。验收标准：指标回退超过设定比例时 CI 直接失败并阻断合并。

### 动手作业

**目标**：给一个树形筛选页面做性能改造，产出一份可复现的对比报告。

**步骤**：

1. 造数据：写脚本生成 2000 个节点的部门树和 10000 行的列表数据，随机种子固定并写进 README。
2. 录基线：代码不动，用 Performance 面板录制首屏和一次关键词搜索，导出 JSON 存档。
3. 写实现：本页手写 debounce、throttle、flatten、LRU、deepClone 各一个，每个配一组单元测试。
4. 接页面：搜索框接 debounce + LRU，滚动渲染接 throttle，部门树接 flatten，状态快照接 deepClone。
5. 复测：同一台设备、同一份数据、6 倍 CPU 降速，录制三次取中位数。
6. 写报告：把两次录制的 Long Task 数量、总阻塞时间、请求数并列，注明测量条件。
7. 收尾：把五个函数抽成模块，写清每个函数的边界条件与容量参数。

**验收标准**：

- 一次 10 字符输入的请求数不超过 2。
- 深拷贝用例覆盖循环引用、Date、RegExp、Map、Set、Symbol 键，全部通过。
- 滚动 60 帧内 render 的调用次数不超过帧数的一半，用计数器统计。
- 报告里每组指标都有 3 次录制的中位数和测量条件。
- 模块运行时不依赖 lodash 与 structuredClone 的结果。

