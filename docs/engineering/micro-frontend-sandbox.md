---
title: "微前端原理：沙箱、样式隔离与 Module Federation"
description: "qiankun/single-spa/Module Federation 底层"
---

# 微前端原理：沙箱、样式隔离与 Module Federation

!!! abstract "核心结论"
    - 微前端不是"把页面拆小"，而是**把发布单元拆开**：独立开发、独立构建、独立部署，运行时集成为一个页面。没有独立发布诉求时，单体 + monorepo 边界比微前端便宜得多。
    - JS 隔离只有三条路：**快照式**（diff 真实 `window` 后还原，同一时刻只能跑一个应用）、**Proxy 式**（每个应用一个影子 `window`，靠 `with` 或参数注入把标识符查找导流到代理）、**iframe 式**（独立 realm，隔离最彻底但通信与 UI 受限）。
    - 样式隔离的四个层次：**Shadow DOM**（引擎级）、**编译期加前缀/scoped**、**运行时加前缀**、**命名空间约定**。越靠前越彻底，越靠后越便宜。
    - 生命周期调度的真正难点不是"调用 mount"，而是**状态机 + 串行化队列**：保证"卸载旧应用"一定完成在"挂载新应用"之前，且路由事件不交叉执行。
    - Module Federation 是**模块级**运行时共享（含 share scope 与版本协商），不做 DOM/全局变量隔离；它和 qiankun 是互补而不是替代关系。

## 1. 从巨石到微前端：动机与方案地图

### 1.1 巨石应用真正的崩溃点

不是"代码多"，而是**耦合维度**失控：

- **构建耦合**：任何一次改动都要全量构建、全量发布，构建时间与代码量近似线性（Tree-shaking 与缓存只能缓解常数项）。
- **发布耦合**：A 团队的 bug 修复必须等 B 团队的灰度窗口。
- **技术栈锁定**：框架大版本升级变成全公司级别的项目。
- **边界腐蚀**：跨模块直接 `import` 内部文件，编译期没有任何东西阻止你越界。
- **故障爆炸半径**：一个子模块的运行时异常可能让整个 SPA 白屏。

微前端的目标函数是：**最大化独立发布能力，最小化运行时集成成本**。注意这里是"最小化"不是"消除"——集成成本必然存在，只是从构建期移到了运行期。

### 1.2 六种主流方案对比

| 方案 | 集成方式 | JS 隔离 | 样式隔离 | 路由共享 | 主要代价 |
| --- | --- | --- | --- | --- | --- |
| iframe | 浏览器原生文档级 | 彻底（独立 realm） | 彻底 | 默认不共享，URL 不同步 | 弹窗/遮罩被限制在 iframe 内，通信只能 `postMessage`，每个 iframe 一套 document 与运行时开销 |
| single-spa | 路由 + 生命周期调度 | 无（需自行实现） | 无（需自行实现） | 共享（劫持 history） | 只解决"调度"，隔离全要自己写；应用需打包成生命周期格式 |
| qiankun | HTML Entry + 生命周期 | 快照/Proxy 沙箱 | 运行时前缀或 Shadow DOM | 共享 | 沙箱能力有边界（DOM 操作仍可能穿透），依赖 single-spa 心智模型 |
| wujie | iframe 执行 JS + 主文档渲染 DOM | 接近 iframe（独立 realm） | Shadow DOM | 共享 | 设计思路较特殊，与框架耦合细节需核对官方文档 |
| Module Federation | 构建期声明 + 运行时模块加载 | 无 | 无 | 共享 | 只共享模块，不隔离全局；强绑 webpack 5 运行时 |
| Web Components | 自定义元素 + Shadow DOM | 无（全局仍共享） | 引擎级（Shadow DOM） | 需自行处理 | 需要框架适配层，事件 retarget、表单参与等边界较多 |

判断顺序建议：

1. 只是想要**代码复用**，同一个技术栈、同一个发布节奏 → 用 Module Federation，别上微前端框架。
2. 需要**独立部署 + 技术栈无关 + 页面级集成** → qiankun / single-spa 类方案。
3. 有**强安全/强隔离**诉求（比如加载第三方不可信代码）→ iframe 或独立域名，沙箱永远不是安全边界。

## 2. JS 沙箱：从快照到 Proxy

### 2.1 快照沙箱：diff 真实 window

原理：进入子应用前，把真实 `window` 的所有自有可枚举属性拷一份；子应用退出时，对比当前 `window` 与快照，**新增的删掉、改过的还原**。

```javascript
// snapshot-sandbox.mjs
// 运行环境：Node.js >= 16（ESM）。浏览器中传入真实 window 即可。
// 简化实现：只处理自有可枚举属性，真实实现还需要考虑原型链、不可枚举属性与 Symbol。

export function createSnapshotSandbox(rawWindow) {
  let snapshot = null;

  function activate() {
    snapshot = Object.create(null);
    for (const key of Object.keys(rawWindow)) {
      snapshot[key] = rawWindow[key];
    }
  }

  function deactivate() {
    if (snapshot === null) return [];
    const modified = [];

    // 第一步：沙箱运行期间新增的 key，直接删除
    for (const key of Object.keys(rawWindow)) {
      if (!Object.prototype.hasOwnProperty.call(snapshot, key)) {
        delete rawWindow[key];
        modified.push(key);
      }
    }

    // 第二步：被修改或被删除的 key，还原成快照值
    for (const key of Object.keys(snapshot)) {
      if (rawWindow[key] !== snapshot[key]) {
        rawWindow[key] = snapshot[key];
        modified.push(key);
      }
    }

    snapshot = null;
    return modified;
  }

  return { activate, deactivate };
}
```

**验证标准**

```javascript
// snapshot-sandbox.test.mjs
// 运行环境：Node.js >= 16，执行 `node snapshot-sandbox.test.mjs`
// 预期输出：snapshot-sandbox.test.mjs 全部通过
import assert from 'node:assert/strict';
import { createSnapshotSandbox } from './snapshot-sandbox.mjs';

const rawWindow = { a: 1, nested: { n: 1 }, keep: 'k' };
const sandbox = createSnapshotSandbox(rawWindow);

sandbox.activate();
rawWindow.b = 2;          // 新增
rawWindow.a = 100;        // 修改
delete rawWindow.keep;    // 删除

const modified = sandbox.deactivate();

assert.equal('b' in rawWindow, false);   // 新增属性被删除
assert.equal(rawWindow.a, 1);            // 修改属性被还原
assert.equal(rawWindow.keep, 'k');       // 删除属性被补回
assert.deepEqual(modified.sort(), ['a', 'b', 'keep']);

// 已知局限：对象内部被就地修改时，快照无法还原
sandbox.activate();
rawWindow.nested.n = 999;
sandbox.deactivate();
assert.equal(rawWindow.nested.n, 999);   // 这是快照沙箱的真实缺陷，不是 bug

console.log('snapshot-sandbox.test.mjs 全部通过');
```

### 2.2 Proxy 沙箱：每个应用一个影子 window

核心思想：**创建一个假的 `window` 对象，代理拦截所有读写，写操作只落到影子对象上，真实 `window` 永不被修改**。难点在于：子应用代码直接写 `window.foo = 1` 或裸标识符 `foo = 1`，怎么让这两者都命中代理？

- `window.foo`：代理的 `get` 对 `'window'` / `'self'` / `'globalThis'` 返回代理自身。
- 裸标识符 `foo`：把代码包在 `with (proxy) { ... }` 里，并让 `has` trap 恒返回 `true`，这样所有标识符查找都会走代理的 `get`。

```javascript
// proxy-sandbox.mjs
// 运行环境：Node.js >= 16（ESM）。浏览器中把 rawWindow 换成真实 window。
// 简化实现，思路与 qiankun 的 ProxySandbox 一致，但不保证与其内部实现逐行等价。

export function createProxySandbox(appName, rawWindow) {
  // 影子 window：子应用写入的所有全局变量都落在这里，绝不触碰 rawWindow
  const shadow = Object.create(null);

  let proxy;
  proxy = new Proxy(shadow, {
    get(target, key) {
      // with 语句会先读 Symbol.unscopables 来决定是否屏蔽某个标识符
      if (key === Symbol.unscopables) return undefined;
      if (typeof key === 'symbol') return target[key];
      // 子应用里的 window / self / globalThis 必须指向沙箱自身
      if (key === 'window' || key === 'self' || key === 'globalThis') return proxy;
      // 沙箱内定义过的属性优先
      if (key in target) return target[key];
      // 回落到真实 window
      const value = rawWindow[key];
      // 原生方法必须绑定真实 window 调用，否则浏览器抛 Illegal invocation
      if (typeof value === 'function') return value.bind(rawWindow);
      return value;
    },

    set(target, key, value) {
      // 所有写入只落在影子对象上
      target[key] = value;
      return true;
    },

    has() {
      // 关键：告诉 with 语句“这里什么都有”，从而接管全部标识符查找
      return true;
    },

    deleteProperty(target, key) {
      delete target[key];
      return true;
    },
  });

  return {
    name: appName,
    proxy,
    // 卸载时清空影子 window，断开闭包引用，避免内存泄漏
    destroy() {
      for (const key of Reflect.ownKeys(shadow)) delete shadow[key];
    },
    // 调试用：查看沙箱内累积的全局变量
    snapshot() {
      return Object.assign({}, shadow);
    },
  };
}
```

**验证标准**

```javascript
// proxy-sandbox.test.mjs
// 运行环境：Node.js >= 16，执行 `node proxy-sandbox.test.mjs`
// 预期输出：proxy-sandbox.test.mjs 全部通过
import assert from 'node:assert/strict';
import { createProxySandbox } from './proxy-sandbox.mjs';

let nativeCallCount = 0;
const rawWindow = {
  location: { href: 'https://host.example/' },
  // 模拟宿主原生方法：this 必须指向 rawWindow
  getHref() { return this.location.href; },
  track() { nativeCallCount += 1; return nativeCallCount; },
};

const appA = createProxySandbox('app-a', rawWindow);
const appB = createProxySandbox('app-b', rawWindow);

// new Function 的函数体默认是非严格模式，with 才合法
function execInSandbox(sandbox, code) {
  const factory = new Function(
    'window', 'self', 'globalThis',
    `with (window) { ${code} }`,
  );
  return factory(sandbox.proxy, sandbox.proxy, sandbox.proxy);
}

execInSandbox(appA, `
  window.__APP__ = 'app-a';
  bareGlobal = 1;                        // 裸标识符赋值，同样落到沙箱
  window.__count__ = (window.__count__ || 0) + 1;
  window.__href__ = getHref();
  window.__track__ = track();
`);

execInSandbox(appB, `
  window.__APP__ = 'app-b';
  bareGlobal = 2;
  window.__count__ = (window.__count__ || 0) + 1;
`);

// 同名全局变量互不覆盖
assert.equal(appA.snapshot().__APP__, 'app-a');
assert.equal(appB.snapshot().__APP__, 'app-b');
assert.equal(appA.snapshot().bareGlobal, 1);
assert.equal(appB.snapshot().bareGlobal, 2);

// 计数器各自从 0 开始，说明全局状态完全隔离
assert.equal(appA.snapshot().__count__, 1);
assert.equal(appB.snapshot().__count__, 1);

// 原生属性读取正常，this 绑定正确
assert.equal(appA.snapshot().__href__, 'https://host.example/');
assert.equal(appA.snapshot().__track__, 1);
assert.equal(appB.snapshot().__track__, undefined);

// 宿主 window 完全未被污染
assert.equal(rawWindow.__APP__, undefined);
assert.equal(rawWindow.bareGlobal, undefined);
assert.equal(rawWindow.__count__, undefined);

// 卸载后沙箱内数据被清空
appA.destroy();
assert.deepEqual(appA.snapshot(), {});

console.log('proxy-sandbox.test.mjs 全部通过');
```

### 2.3 iframe 沙箱：借用独立 realm

原理：创建一个同源隐藏 `iframe`，把它的 `contentWindow` 当作子应用的全局对象，然后用 `with (iframeWindow) { ... }` 执行代码。子应用看到的 `window`、`document`、`Array`、`Promise` 都是 iframe 那一份，天然隔离。

代价（这些是真实的、必须提前评估的）：

- **realm 不同导致判等失败**：`iframeArray instanceof Array === false`（因为 `Array` 来自不同 realm），`Array.isArray` 正常但 `instanceof` 不正常。
- **DOM 必须在主文档渲染**：否则弹窗、遮罩、`position: fixed`、`z-index` 全被限制在 iframe 内。wujie 的思路就是把 JS 放 iframe 执行、DOM 渲染回主文档（细节需核对官方文档）。
- **通信异步**：跨 iframe 只能 `postMessage` 或直接引用同源对象。
- **性能**：每个 iframe 一套完整 document 与 JS 环境。

### 2.4 三种沙箱对比

| 维度 | 快照沙箱 | Proxy 沙箱 | iframe 沙箱 |
| --- | --- | --- | --- |
| 隔离对象 | 真实 `window` | 影子对象 | 独立 realm 的 window |
| 多实例并存 | 不支持（同一时刻只能一个） | 支持 | 支持 |
| 对象内部就地修改 | 还原不了 | 不污染宿主 | 完全隔离 |
| 实现复杂度 | 低 | 中（依赖 Proxy + with） | 中高（DOM 要搬回主文档） |
| 主要风险 | 状态残留、还原不完整 | `has` 恒真的语义副作用、DOM 未代理 | realm 判等失败、通信成本、UI 受限 |
| 代表实现 | single-spa 早期思路、qiankun 的 SnapshotSandbox | qiankun 的 ProxySandbox | wujie 的 JS 部分 |

## 3. CSS 隔离：从引擎到约定

### 3.1 Shadow DOM：引擎级作用域

`element.attachShadow({ mode: 'open' })` 会创建一个独立的 **shadow tree**，其中的选择器只匹配该 tree 内的节点，外部选择器（除继承属性外）不会命中内部节点。

关键边界：

- **会穿透**：CSS 自定义属性（`--x`）、可继承属性（`color`、`font-*`、`visibility`）、`@font-face` 的字体族定义。`:host` 与 `::part` / `::slotted` 是官方提供的显式穿透通道。
- **不会穿透**：类名、ID、标签选择器、`@keyframes` 名称（按规范限定在 shadow tree 内，历史上有浏览器差异，需核对）。
- **DOM API**：`document.querySelector` 查不到 shadow 内部节点，必须 `shadowRoot.querySelector`。
- **事件**：从 shadow tree 冒泡到外部时会被 **retarget**，`event.target` 变成宿主元素，需要 `event.composedPath()` 才能拿到真实目标。

### 3.2 运行时选择器前缀：手写 scopeCss

编译期加前缀需要改构建链（PostCSS 插件等），运行时加前缀可以在子应用挂载时动态改写它注入的 `<style>` 内容。下面是简化但可用的实现。

```javascript
// scope-css.mjs
// 运行环境：Node.js >= 16（ESM）。纯字符串处理，无 DOM 依赖。
// 简化实现：不做嵌套语法、注释、字符串内花括号的完整处理。

const BLOCK_AT_RULES = ['@media', '@supports', '@layer'];
const NO_PREFIX_AT_RULES = ['@keyframes', '@-webkit-keyframes', '@font-face', '@page'];

/** 把 CSS 切成 { prelude, body } 列表 */
function parseRules(css) {
  const rules = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i += 1;
    if (i >= css.length) break;
    const open = css.indexOf('{', i);
    if (open === -1) break;
    const prelude = css.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') depth -= 1;
      j += 1;
    }
    rules.push({ prelude, body: css.slice(open + 1, j - 1) });
    i = j;
  }
  return rules;
}

function stringifyRule({ prelude, body }, scope) {
  const lower = prelude.toLowerCase();

  // 内部不是选择器的规则，禁止加前缀
  if (NO_PREFIX_AT_RULES.some((a) => lower.startsWith(a))) {
    return `${prelude} {${body}}`;
  }

  // 条件规则，递归处理内部
  if (BLOCK_AT_RULES.some((a) => lower.startsWith(a))) {
    return `${prelude} {\n${scopeCss(body, scope)}\n}`;
  }

  const selectors = prelude.split(',').map((s) => s.trim()).filter(Boolean);
  const scoped = selectors.map((s) => `${scope} ${s}`).join(', ');
  return `${scoped} {${body}}`;
}

/** 给整段 CSS 加上作用域前缀 */
export function scopeCss(css, scope) {
  return parseRules(css).map((r) => stringifyRule(r, scope)).join('\n');
}
```

**验证标准**

```javascript
// scope-css.test.mjs
// 运行环境：Node.js >= 16，执行 `node scope-css.test.mjs`
// 预期输出：scope-css.test.mjs 全部通过
import assert from 'node:assert/strict';
import { scopeCss } from './scope-css.mjs';

// 普通规则与选择器分组
assert.equal(
  scopeCss('.button { color: red; }\n.title, .subtitle { font-size: 14px; }', '.mf-a'),
  '.mf-a .button { color: red; }\n.mf-a .title, .mf-a .subtitle { font-size: 14px; }',
);

// 条件规则递归加前缀
assert.equal(
  scopeCss('@media (min-width: 600px) { .b { color: red; } }', '.mf-a'),
  '@media (min-width: 600px) {\n.mf-a .b { color: red; }\n}',
);

// 关键帧内部的内容不能加前缀，否则动画失效
assert.equal(
  scopeCss('@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }', '.mf-a'),
  '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
);

console.log('scope-css.test.mjs 全部通过');
```

### 3.3 两个子应用互不污染：全局变量 + 样式联合验证

```javascript
// isolation.test.mjs
// 运行环境：Node.js >= 16，与 proxy-sandbox.mjs、scope-css.mjs 同目录
// 预期输出：isolation.test.mjs 全部通过
import assert from 'node:assert/strict';
import { createProxySandbox } from './proxy-sandbox.mjs';
import { scopeCss } from './scope-css.mjs';

const rawWindow = {};                       // 模拟一个“干净”的宿主 window
const A = createProxySandbox('a', rawWindow);
const B = createProxySandbox('b', rawWindow);

function execInSandbox(sandbox, code) {
  const factory = new Function('window', 'self', 'globalThis', `with (window) { ${code} }`);
  return factory(sandbox.proxy, sandbox.proxy, sandbox.proxy);
}

// 两个子应用注入同名全局变量与同名 CSS 类
const cssA = execInSandbox(A, `window.__CSS__ = '.title { color: red; }'; window.__THEME__ = 'dark'; window.__CSS__;`);
const cssB = execInSandbox(B, `window.__CSS__ = '.title { color: blue; }'; window.__THEME__ = 'light'; window.__CSS__;`);

const styledA = scopeCss(cssA, '.mf-a');
const styledB = scopeCss(cssB, '.mf-b');

// 同名类被前缀隔开，CSS 规则不再互相覆盖
assert.equal(styledA, '.mf-a .title { color: red; }');
assert.equal(styledB, '.mf-b .title { color: blue; }');
assert.notEqual(styledA, styledB);

// 同名全局变量各归各的
assert.equal(A.snapshot().__THEME__, 'dark');
assert.equal(B.snapshot().__THEME__, 'light');
assert.equal(rawWindow.__THEME__, undefined);

console.log('isolation.test.mjs 全部通过');
```

### 3.4 四种样式隔离方案对比

| 方案 | 隔离强度 | 运行时开销 | 需要改构建 | 典型失效场景 |
| --- | --- | --- | --- | --- |
| Shadow DOM | 强（引擎级） | 低 | 否 | 全局 body 上的弹窗、继承属性与自定义属性、事件 retarget |
| 编译期 scoped/前缀 | 中 | 无 | 是 | 动态拼字符串的 class 名、第三方 CSS 未被处理 |
| 运行时前缀 | 中 | 需要遍历改写 `<style>` 文本 | 否 | 子应用自己动态 `insertRule`、CSSOM 直接操作 |
| 命名空间约定 | 弱（靠人） | 无 | 否 | 任何人手抖写出通用类名就穿透 |

补充：qiankun 早期提供 `strictStyleIsolation`（Shadow DOM）与 `experimentalStyleIsolation`（运行时前缀）两种模式，具体选项名与行为随版本变化，**需核对官方文档**。

## 4. 应用生命周期与路由劫持

### 4.1 状态机

single-spa 的核心不是"调用 mount"，而是一个状态机：

```
NOT_LOADED -> NOT_BOOTSTRAPPED -> NOT_MOUNTED -> MOUNTED -> UNMOUNTING -> NOT_MOUNTED
```

- `NOT_LOADED`：入口还没加载执行。首次 `active` 时调用 `load()`。
- `NOT_BOOTSTRAPPED`：已加载，未执行 `bootstrap()`（一次性初始化，只跑一次）。
- `NOT_MOUNTED`：已初始化，未挂载。这正是"切走再切回来不重复 bootstrap"的关键状态。
- `MOUNTED`：已挂载，`unmount()` 前不会再 mount。
- `UNMOUNTING`：卸载中，防止并发 reroute 重复调用 `unmount()`。

### 4.2 手写迷你 single-spa 调度器

```javascript
// mini-single-spa.mjs
// 运行环境：Node.js >= 16（ESM）。教学级简化实现，只保留状态机与串行调度。

const STATUS = {
  NOT_LOADED: 'NOT_LOADED',
  NOT_BOOTSTRAPPED: 'NOT_BOOTSTRAPPED',
  NOT_MOUNTED: 'NOT_MOUNTED',
  MOUNTED: 'MOUNTED',
  UNMOUNTING: 'UNMOUNTING',
};

export function createMicroFrontend() {
  const apps = [];
  let started = false;
  // 把并发的路由事件排成队列：保证“卸载旧应用”一定完成在“挂载新应用”之前
  let queue = Promise.resolve();

  function registerApplication({ name, activeWhen, load }) {
    if (typeof name !== 'string' || name.length === 0) throw new Error('name 必须是非空字符串');
    if (typeof load !== 'function') throw new Error('load 必须返回 { bootstrap, mount, unmount }');
    const active = typeof activeWhen === 'function'
      ? activeWhen
      : (loc) => loc.pathname.startsWith(activeWhen);
    apps.push({ name, active, load, status: STATUS.NOT_LOADED, exports: null });
  }

  async function toBootstrapped(app) {
    if (app.status === STATUS.NOT_LOADED) {
      app.exports = await app.load();          // 加载并执行入口，拿到生命周期对象
      app.status = STATUS.NOT_BOOTSTRAPPED;
    }
    if (app.status === STATUS.NOT_BOOTSTRAPPED) {
      if (typeof app.exports.bootstrap === 'function') await app.exports.bootstrap();
      app.status = STATUS.NOT_MOUNTED;
    }
  }

  async function toMounted(app, loc) {
    if (app.status !== STATUS.NOT_MOUNTED) return;
    await app.exports.mount(loc);
    app.status = STATUS.MOUNTED;
  }

  async function toUnmounted(app) {
    if (app.status !== STATUS.MOUNTED) return;
    app.status = STATUS.UNMOUNTING;            // 置为中间态，避免并发重复卸载
    await app.exports.unmount();
    app.status = STATUS.NOT_MOUNTED;
  }

  async function reroute(loc) {
    const toUnmount = apps.filter((a) => a.status === STATUS.MOUNTED && !a.active(loc));
    const toMount = apps.filter((a) => a.active(loc));

    await Promise.all(toUnmount.map(toUnmounted));   // 先全部卸载
    for (const app of toMount) await toBootstrapped(app); // 再统一初始化
    await Promise.all(toMount.map((a) => toMounted(a, loc))); // 最后并行挂载
  }

  function schedule(loc) {
    // 用 then 链串行化：即使两次导航几乎同时发生，reroute 也不会交叉执行
    queue = queue.then(() => reroute(loc), () => reroute(loc));
    return queue;
  }

  return {
    registerApplication,
    start({ getLocation }) {
      if (!started) started = true;
      return schedule(getLocation());
    },
    navigate(loc) {
      if (!started) throw new Error('start() 之前不能 navigate');
      return schedule(loc);
    },
    getStatus(name) {
      const app = apps.find((a) => a.name === name);
      return app ? app.status : undefined;
    },
  };
}
```

**验证标准**

```javascript
// mini-single-spa.test.mjs
// 运行环境：Node.js >= 16，执行 `node mini-single-spa.test.mjs`
// 预期输出：mini-single-spa.test.mjs 全部通过
import assert from 'node:assert/strict';
import { createMicroFrontend } from './mini-single-spa.mjs';

const log = [];
const mf = createMicroFrontend();

function makeApp(name, prefix) {
  return {
    name,
    activeWhen: (loc) => loc.pathname.startsWith(prefix),
    load: async () => ({
      async bootstrap() { log.push(`${name}:bootstrap`); },
      async mount(loc) { log.push(`${name}:mount@${loc.pathname}`); },
      async unmount() { log.push(`${name}:unmount`); },
    }),
  };
}

mf.registerApplication(makeApp('a', '/a'));
mf.registerApplication(makeApp('b', '/b'));

await mf.start({ getLocation: () => ({ pathname: '/' }) });
assert.deepEqual(log, []);                                  // 首屏 `/` 不激活任何应用
assert.equal(mf.getStatus('a'), 'NOT_LOADED');

await mf.navigate({ pathname: '/a' });
assert.deepEqual(log, ['a:bootstrap', 'a:mount@/a']);
assert.equal(mf.getStatus('a'), 'MOUNTED');

await mf.navigate({ pathname: '/b' });
assert.deepEqual(log, ['a:bootstrap', 'a:mount@/a', 'a:unmount', 'b:bootstrap', 'b:mount@/b']);
assert.equal(mf.getStatus('a'), 'NOT_MOUNTED');             // 卸载后回到 NOT_MOUNTED
assert.equal(mf.getStatus('b'), 'MOUNTED');

// 回到 /a：状态是 NOT_MOUNTED 而非 NOT_LOADED，bootstrap 不会重复执行
await mf.navigate({ pathname: '/a' });
assert.deepEqual(log, [
  'a:bootstrap', 'a:mount@/a', 'a:unmount',
  'b:bootstrap', 'b:mount@/b', 'b:unmount', 'a:mount@/a',
]);

// 并发导航被串行化，执行顺序确定、无交叉
log.length = 0;
const p1 = mf.navigate({ pathname: '/b' });
const p2 = mf.navigate({ pathname: '/' });
await Promise.all([p1, p2]);
assert.deepEqual(log, ['a:unmount', 'b:mount@/b', 'b:unmount']);

console.log('mini-single-spa.test.mjs 全部通过');
```

### 4.3 路由劫持：为什么必须给 pushState 打补丁

浏览器只在一个时机派发 `popstate`：用户点击前进/后退、或脚本调用 `history.back()`。而 **`history.pushState` / `replaceState` 不会触发任何事件**。所以框架必须：

1. 包装 `history.pushState` / `replaceState`，在调用原方法后手动触发一次路由回调。
2. 监听 `popstate`（history 模式）与 `hashchange`（hash 模式）。
3. 卸载时恢复原方法（注意：浏览器的 `pushState` 定义在 `History.prototype` 上，赋值只是在实例上建了个自有属性，更干净的做法是 `delete history.pushState`）。

```javascript
// patch-history.mjs
// 运行环境：浏览器中调用 patchHistory({ history: window.history, eventTarget: window, onChange })
// Node 中可注入假的 history / eventTarget 做单元测试。

export function patchHistory({ history, eventTarget, onChange }) {
  const rawPushState = history.pushState;
  const rawReplaceState = history.replaceState;

  history.pushState = function patchedPushState(...args) {
    const result = rawPushState.apply(this, args);
    onChange();                 // pushState 不派发 popstate，必须手动通知
    return result;
  };

  history.replaceState = function patchedReplaceState(...args) {
    const result = rawReplaceState.apply(this, args);
    onChange();
    return result;
  };

  const onPopState = () => onChange();
  const onHashChange = () => onChange();
  eventTarget.addEventListener('popstate', onPopState);
  eventTarget.addEventListener('hashchange', onHashChange);

  return function uninstall() {
    history.pushState = rawPushState;
    history.replaceState = rawReplaceState;
    eventTarget.removeEventListener('popstate', onPopState);
    eventTarget.removeEventListener('hashchange', onHashChange);
  };
}
```

**验证标准**

```javascript
// patch-history.test.mjs
// 运行环境：Node.js >= 16，执行 `node patch-history.test.mjs`
// 预期输出：patch-history.test.mjs 全部通过
import assert from 'node:assert/strict';
import { patchHistory } from './patch-history.mjs';

function createFakeHistory(initialPath) {
  let pathname = initialPath;
  const listeners = { popstate: new Set(), hashchange: new Set() };
  return {
    get pathname() { return pathname; },
    pushState(state, title, url) { pathname = url; },
    replaceState(state, title, url) { pathname = url; },
    addEventListener(type, cb) { listeners[type].add(cb); },
    removeEventListener(type, cb) { listeners[type].delete(cb); },
    simulateBack(url) {
      pathname = url;
      for (const cb of [...listeners.popstate]) cb({ type: 'popstate' });
    },
    listenerCount(type) { return listeners[type].size; },
  };
}

const history = createFakeHistory('/');
let calls = 0;
const uninstall = patchHistory({
  history,
  eventTarget: history,
  onChange: () => { calls += 1; },
});

history.pushState(null, '', '/a');
assert.equal(calls, 1);              // pushState 后手动触发一次
assert.equal(history.pathname, '/a');

history.replaceState(null, '', '/b');
assert.equal(calls, 2);

history.simulateBack('/');
assert.equal(calls, 3);              // popstate 触发
assert.equal(history.pathname, '/');

uninstall();
assert.equal(history.listenerCount('popstate'), 0);
history.pushState(null, '', '/c');
assert.equal(calls, 3);              // 卸载后不再回调
assert.equal(history.pathname, '/c');

console.log('patch-history.test.mjs 全部通过');
```

## 5. Module Federation：共享依赖与版本协商

### 5.1 运行时结构

一个 remote 的构建产物 `remoteEntry.js` 里**没有业务代码**，只有 runtime 与映射表。核心接口只有两个：

- `init(shareScope, initScope)`：把 remote 自己声明的 shared 依赖注册进宿主的 share scope。
- `get(request)`：返回 `Promise<factory>`，`factory` 执行后给出该模块的导出。

```mermaid
flowchart LR
  A["宿主应用启动"] --> B["加载 remoteEntry.js"]
  B --> C["调用 init 注入 shareScope"]
  C --> D["调用 get 取模块工厂"]
  D --> E["执行工厂得到组件导出"]
```

共享依赖的完整生命周期是三个阶段：**provide**（把自己的实现注册进 share scope）→ **init**（合并 remote 的 share scope）→ **consume**（消费时按 `requiredVersion` 协商，命中就复用，命中不了就回退到本地打包版本）。

### 5.2 共享依赖的版本协商：手写 mini-mf

```javascript
// mini-mf.mjs
// 运行环境：Node.js >= 16（ESM）。
// 教学级简化模型：真实 webpack runtime 的产物形态与内部变量名以具体版本为准（需核对官方文档）。

/** 只支持 x.y.z，不支持预发布号与多段 range，遇到就抛错 */
function parse(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!m) throw new Error(`mini-mf 只支持 x.y.z 形式，收到: ${version}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function compareVersion(a, b) {
  const A = parse(a);
  const B = parse(b);
  for (let i = 0; i < 3; i += 1) if (A[i] !== B[i]) return A[i] - B[i];
  return 0;
}

/** 支持 * / x.y.z / ^x.y.z / ~x.y.z 四种写法 */
export function satisfies(version, range) {
  const r = String(range).trim();
  if (r === '' || r === '*') return true;

  if (r.startsWith('^')) {
    const base = parse(r.slice(1));
    if (compareVersion(version, r.slice(1)) < 0) return false;
    const v = parse(version);
    if (base[0] !== 0) return v[0] === base[0];                   // ^1.2.3 = >=1.2.3 <2.0.0
    if (base[1] !== 0) return v[0] === 0 && v[1] === base[1];     // ^0.2.3 = >=0.2.3 <0.3.0
    return compareVersion(version, r.slice(1)) === 0;             // ^0.0.3 = 只等于 0.0.3
  }

  if (r.startsWith('~')) {
    const base = parse(r.slice(1));
    if (compareVersion(version, r.slice(1)) < 0) return false;
    const v = parse(version);
    return v[0] === base[0] && v[1] === base[1];                  // ~1.2.3 = >=1.2.3 <1.3.0
  }

  return compareVersion(version, r) === 0;
}

export class ShareScope {
  constructor(name = 'default') {
    this.name = name;
    this.registry = new Map();  // shareKey -> Map<version, factory>
    this.warnings = [];
  }

  /** provide 阶段：注册自己这一份实现 */
  provide(shareKey, version, factory) {
    if (!this.registry.has(shareKey)) this.registry.set(shareKey, new Map());
    const versions = this.registry.get(shareKey);
    if (!versions.has(version)) versions.set(version, factory);
  }

  /** consume 阶段：版本协商，返回 { version, factory } 或 null（协商失败） */
  consume(shareKey, requiredVersion, { singleton = false, strictVersion = false, consumer = 'unknown' } = {}) {
    const versions = this.registry.get(shareKey);
    if (!versions || versions.size === 0) return null;

    const sorted = [...versions.keys()].sort((a, b) => compareVersion(b, a));

    if (singleton) {
      // 单例：谁先注册就锁定谁，后来者只能复用
      const picked = sorted[0];
      if (!satisfies(picked, requiredVersion)) {
        const message = `[mini-mf] ${consumer} 需要 ${shareKey}@${requiredVersion}，但单例已锁定为 ${picked}`;
        if (strictVersion) throw new Error(message);
        this.warnings.push(message);
      }
      return { version: picked, factory: versions.get(picked) };
    }

    for (const version of sorted) {
      if (satisfies(version, requiredVersion)) return { version, factory: versions.get(version) };
    }
    return null;
  }
}

export class MiniContainer {
  constructor(name, shared = {}) {
    this.name = name;
    this.modules = new Map();   // 对应 exposes
    this.shared = shared;       // { shareKey: { version, factory, requiredVersion, singleton, strictVersion } }
    this.shareScope = null;
  }

  expose(request, factory) { this.modules.set(request, factory); }

  /** 对应真实 MF 的 remote.init(shareScope) */
  init(shareScope) {
    this.shareScope = shareScope;
    for (const [shareKey, cfg] of Object.entries(this.shared)) {
      shareScope.provide(shareKey, cfg.version, cfg.factory);
    }
    return this;
  }

  /** 对应真实 MF 的 remote.get(request) -> Promise<factory> */
  async get(request) {
    const factory = this.modules.get(request);
    if (!factory) throw new Error(`${this.name} 没有暴露 ${request}`);
    return factory(this.resolveShared());
  }

  /** 把本容器声明的 shared 依赖从 shareScope 解析出来 */
  resolveShared() {
    const resolved = {};
    for (const [shareKey, cfg] of Object.entries(this.shared)) {
      const hit = this.shareScope && this.shareScope.consume(shareKey, cfg.requiredVersion || '*', {
        singleton: Boolean(cfg.singleton),
        strictVersion: Boolean(cfg.strictVersion),
        consumer: this.name,
      });
      // 协商失败则回退到本地打包的那一份
      resolved[shareKey] = hit || { version: cfg.version, factory: cfg.factory };
    }
    return resolved;
  }
}
```

**验证标准**

```javascript
// mini-mf.test.mjs
// 运行环境：Node.js >= 16，执行 `node mini-mf.test.mjs`
// 预期输出：mini-mf.test.mjs 全部通过
import assert from 'node:assert/strict';
import { ShareScope, MiniContainer, satisfies, compareVersion } from './mini-mf.mjs';

// semver 语义
assert.equal(satisfies('18.2.0', '^18.0.0'), true);
assert.equal(satisfies('17.9.0', '^18.0.0'), false);
assert.equal(satisfies('0.2.9', '^0.2.3'), true);
assert.equal(satisfies('0.3.0', '^0.2.3'), false);
assert.equal(satisfies('0.0.3', '^0.0.3'), true);
assert.equal(satisfies('0.0.4', '^0.0.3'), false);
assert.equal(satisfies('1.2.9', '~1.2.3'), true);
assert.equal(satisfies('1.3.0', '~1.2.3'), false);
assert.equal(satisfies('2.0.0', '*'), true);
assert.equal(compareVersion('1.10.0', '1.9.9') > 0, true);

const scope = new ShareScope('default');
// 宿主先提供自己的 react@18.2.0
scope.provide('react', '18.2.0', () => 'react@18.2.0');

// remote-a 声明需要 ^18.0.0 且 singleton -> 复用宿主的 18.2.0
const remoteA = new MiniContainer('remote-a', {
  react: { version: '18.1.0', factory: () => 'react@18.1.0', requiredVersion: '^18.0.0', singleton: true },
});
remoteA.init(scope);
assert.equal(remoteA.resolveShared().react.version, '18.2.0');

// remote-b 声明需要 ^17.0.0 且非单例 -> 协商失败，回退到自带的 17.0.2
const remoteB = new MiniContainer('remote-b', {
  react: { version: '17.0.2', factory: () => 'react@17.0.2', requiredVersion: '^17.0.0', singleton: false },
});
remoteB.init(scope);
assert.equal(remoteB.resolveShared().react.version, '17.0.2');

// singleton 冲突：strictVersion 直接抛错
const strictScope = new ShareScope();
strictScope.provide('react', '17.0.2', () => 'react@17.0.2');
assert.throws(
  () => strictScope.consume('react', '^18.0.0', { singleton: true, strictVersion: true, consumer: 'host' }),
  /单例已锁定/,
);

// singleton 冲突：非 strict 只记录 warning
const looseScope = new ShareScope();
looseScope.provide('react', '17.0.2', () => 'react@17.0.2');
const loose = looseScope.consume('react', '^18.0.0', { singleton: true, consumer: 'host' });
assert.equal(loose.version, '17.0.2');
assert.equal(looseScope.warnings.length, 1);

// 暴露的模块可以拿到协商后的依赖实例
remoteA.expose('./Card', (shared) => ({ name: 'Card', reactVersion: shared.react.version }));
const Card = await remoteA.get('./Card');
assert.equal(Card.reactVersion, '18.2.0');

console.log('mini-mf.test.mjs 全部通过');
```

### 5.3 Module Federation 与微前端框架的分工

| 维度 | qiankun / single-spa | Module Federation |
| --- | --- | --- |
| 隔离粒度 | 应用（DOM + 全局 + 路由） | 模块（import 图） |
| 共享内容 | 页面、路由、生命周期 | 组件、工具函数、第三方依赖实例 |
| JS 全局隔离 | 有（沙箱） | 无 |
| 样式隔离 | 有（Shadow DOM / 前缀） | 无 |
| 依赖去重 | 无（各应用各打包） | 有（share scope + 版本协商） |
| 技术栈要求 | 无关 | 同构（依赖 runtime 兼容） |
| 典型痛点 | 沙箱穿透、样式残留、路由冲突 | 版本协商失败、首屏等待、runtime 与构建工具绑死 |

Module Federation 的关键配置项（`ModuleFederationPlugin` 的 `shared`）：

- `requiredVersion`：消费方要求的版本范围。
- `version`：提供方声明的自身版本。
- `singleton`：全局只保留一份；React 这类必须单例，否则两份 React 会导致 hooks 报 "Invalid hook call"。
- `strictVersion`：版本不满足时直接抛错而不是告警，**生产环境慎用**。
- `eager`：把共享模块打进 initial chunk，避免异步等待导致的瀑布；代价是首屏体积。
- `shareScope`：默认 `'default'`，可以自定义多个共享作用域。

以上配置项的默认值与边界行为随 webpack 版本演进，**需核对官方文档**。Vite 侧对应的插件（如 `@originjs/vite-plugin-federation`、`@module-federation/enhanced` 等）能力与 webpack 原生实现不完全等价，选型前需核对各自官方文档。

## 6. 常见陷阱

1. **`with` 只能用于非严格模式**。ESM、`"use strict"` 的代码块、TypeScript 编译出的严格模式产物里，`with` 直接是语法错误。所以真实实现要么用 `new Function` 拼字符串，要么把 proxy 作为函数参数注入（`(function(window, self, globalThis){ ... })(proxy, proxy, proxy)`）。不同库、不同版本做法不同，需核对官方文档。
2. **`has` trap 恒返回 `true` 的语义副作用**：`'foo' in proxy` 恒为 `true`；读取未声明变量不再抛 `ReferenceError` 而是得到 `undefined`；`Object.keys(window)` 只能看到沙箱内写过的键。这是隔离换来的代价。
3. **快照沙箱还原不了"对象内部就地修改"**：`window.__arr.push(1)`、`window.config.x = 1` 都还原不了。而且同一时刻只能有一个应用运行，多实例并存会互相踩。
4. **Proxy 沙箱默认是浅代理**：`window.a.b = 1` 里的 `window.a` 是从真实 window 取回来的同一个对象引用，赋值会直接污染宿主。要挡这个，需要惰性深度代理，或用 `Proxy.revocable` + 卸载时 revoke，或干脆冻结共享对象。
5. **函数 `bind` 后每次访问都是新引用**：`window.alert === window.alert` 在沙箱里可能为 `false`。同时不 bind 又会踩 `Illegal invocation`，需要在 `get` 里做缓存（`Map<key, boundFn>`）。
6. **DOM 不在代理范围内**：`document.body.innerHTML = ''`、`document.head.appendChild(style)` 会真实影响宿主。这是 qiankun 类方案需要额外 patch `document` 的原因，也是"沙箱不是安全边界"的直接证据。
7. **Shadow DOM 里的全局弹窗**：绝大多数 UI 库把 Modal / Message 挂到 `document.body`，不受 shadow tree 或前缀限制，需要用"挂载点容器"或配置 API 改掉挂载目标。
8. **`@keyframes` 前缀化会让动画失效**：`@keyframes` 内部的 `from` / `to` 不是选择器，加前缀会生成非法规则。同样的还有 `@font-face`、`@page`。
9. **`pushState` 不派发事件**：不 patch `history` 就永远收不到子应用的编程式导航。另外 `popstate` 事件本身不携带"哪个应用该被激活"的信息，必须重新计算 `activeRule`。
10. **共享依赖的双实例灾难**：React 被加载两份，表现是 hooks 报错、context 读不到。排查手段是打印 `React.version` 与模块实例标识。`singleton: true` + `strictVersion: true` 只是让问题早暴露，不解决根因。
11. **资源泄漏比沙箱泄漏更常见**：`setInterval`、`window.addEventListener`、`ResizeObserver`、WebSocket 没在 `unmount` 里回收，即使 `destroy()` 清空了影子 window，定时器还在跑、回调还持有已卸载 DOM 的引用。
12. **不要用沙箱做安全隔离**：同源下子应用代码可以拿到 `top`、`fetch`、`localStorage`。真要防恶意代码，用跨域 iframe 或独立域名 + CSP。

## 7. 面试题与答题要点

**Q1：微前端到底解决什么问题？什么时候不应该用？**

要点：核心是**独立发布**，不是"代码分层"。四个判据——团队是否有独立发布节奏、应用是否真的技术栈异构、页面是否需要运行时组装、故障是否必须隔离。反例：团队只有 2 到 3 人、发布节奏统一、技术栈一致，此时单体 + monorepo 包边界 + 严格 lint 规则的收益远高于微前端，因为微前端会把构建期成本转移到运行期（沙箱、样式改写、路由协调、依赖重复加载）。

**Q2：Proxy 沙箱的实现原理？为什么需要 `with`？`has` trap 为什么返回 `true`？**

要点：创建一个影子对象并包装成 `Proxy`，`get` 先查影子对象、再回落真实 `window`（函数需 bind 以避免 `Illegal invocation`），`set` 只写影子对象，`window` / `self` / `globalThis` 三个 key 返回代理自身。裸标识符赋值（`foo = 1`）如果只靠 `proxy.foo = 1` 是拦不住的，必须把代码放进 `with (proxy) { ... }` 里，让标识符解析走 ObjectEnvironmentRecord；而 `with` 是否接管某个标识符取决于 `HasProperty(proxy, name)`，所以 `has` 必须恒返回 `true`。副作用：`in` 恒真、未声明变量不报 `ReferenceError`、`Object.keys` 只能看到沙箱内的键。

**Q3：快照沙箱和 Proxy 沙箱怎么选？**

要点：快照沙箱实现简单、兼容性最好（不依赖 Proxy），代价是同一时刻只能跑一个应用（因为操作的是真实 window），且无法还原对象内部就地修改；它适合"同一时刻只有一个子应用挂载"的场景。Proxy 沙箱可以多实例并存、写入不落真实 window，是现在的主流选择，代价是 `has` 恒真的语义副作用、需要处理 `bind`、以及裸 `document` 操作仍然穿透。选型判断句：**能否接受"同一时刻只有一个活跃应用"**。

**Q4：CSS 隔离有哪几种方案？各自代价是什么？**

要点：四层——引擎级（Shadow DOM）、编译期（scoped / PostCSS 前缀）、运行时（改写注入的 `<style>` 文本）、约定级（BEM 式命名空间）。Shadow DOM 最强但会挡住可继承属性以外的样式、事件需要 retarget、`document.querySelector` 查不到内部节点；编译期方案依赖构建链改造，且处理不到动态拼接的类名与第三方 CSS；运行时方案实现复杂度中等但对 `insertRule` 之类的 CSSOM 直接操作无能为力；约定级几乎零成本但完全靠人。补充：`@keyframes` 前缀化是常见错误。

**Q5：single-spa 的生命周期状态机有哪些状态？reroute 做了什么？为什么要串行化？**

要点：`NOT_LOADED → NOT_BOOTSTRAPPED → NOT_MOUNTED → MOUNTED → UNMOUNTING → NOT_MOUNTED`，外加注册时可能用到的 `LOADING` 中间态。reroute 三步：先算出"该卸载的"（已 MOUNTED 但不再 active）并发卸载，再对"该挂载的"先统一 bootstrap，最后并发 mount。串行化的原因是防交叉：若用户在极短时间内连续导航 A→B，两次 reroute 并发执行会出现"B 挂载完成之后 A 的 unmount 才执行"，把 B 的 DOM 或全局状态清掉；而且 `unmount` / `mount` 不是幂等的，重复调用会泄漏资源。

**Q6：路由劫持的原理？为什么必须 patch `history.pushState`？**

要点：浏览器只在用户前进/后退或调用 `history.back()` 时派发 `popstate`，`pushState` / `replaceState` **不触发任何事件**，所以必须包装这两个方法，在调用原方法后手动触发一次路由计算。同时监听 `popstate` 与 `hashchange`（hash 模式），卸载时还原原始方法并移除监听。子应用内部调用 `pushState` 的路径要在前面拼上自己的 `activeRule` 前缀，否则切走再切回来时会因为路径不匹配而直接卸载。另外要考虑子应用自己注册的 `popstate` 监听需要在卸载时清理。

**Q7：Module Federation 的共享依赖怎么协商版本？`singleton` / `requiredVersion` / `strictVersion` / `eager` 各干什么？**

要点：三个阶段的运行时流程——provide（每个容器把自己的 shared 实现注册进 share scope）→ init（宿主调用 remote 的 `init(shareScope)` 把作用域合并）→ consume（消费时按 `requiredVersion` 在所有已注册版本里挑满足条件的最高的那一个，命中就复用，命中不了就回退到本地打包版本）。`singleton` 表示全局只允许一份（React 必须），实现上是"先注册者锁定，后来者复用并可能告警"；`strictVersion` 把不满足版本的告警升级为抛错；`eager` 把共享模块打进 initial chunk 以避免异步瀑布，代价是首屏体积。真实算法的细节与默认值随 webpack 版本演进，需核对官方文档。

**Q8：Module Federation 能替代 qiankun 吗？**

要点：不能直接替代，因为解决的层面不同。Module Federation 是**模块级**的运行时共享，目标是"避免重复打包依赖、复用组件"，它不隔离 `window`、不隔离 CSS、不管路由、不做生命周期；qiankun 是**应用级**集成，管的是 DOM 挂载、全局隔离、样式隔离、路由协调。正确的组合方式是：同一技术栈的多个应用之间用 Module Federation 共享组件与依赖实例，跨技术栈/跨发布节奏的页面级集成用 qiankun 类方案。反过来，只共享一个按钮组件就上 qiankun 是典型过度设计。

**Q9：iframe 沙箱有什么问题？wujie 这类方案怎么绕开？**

要点：iframe 的隔离最彻底（独立 realm，连 `Array`、`Promise` 都是不同实例），但问题在于：DOM 被限制在 iframe 内，弹窗/遮罩/`position: fixed`/`z-index` 都无法覆盖整个页面；URL 不同步（浏览器地址栏不会变成子应用路由）；跨 iframe 通信只能异步 `postMessage`；`instanceof` 跨 realm 判等失败；每个 iframe 一套完整 document 与 JS 环境。wujie 的思路是把 JS 放进 iframe 执行（借用独立 realm 做沙箱），DOM 则渲染回主文档（基于 Web Components / Shadow DOM 承载），从而同时拿到隔离和 UI 表现力；该方案的具体实现细节需核对官方文档。

**Q10：微前端下怎么做错误监控与埋点？**

要点：三个必须解决的归属问题。错误归属：全局 `window.onerror` 只能拿到堆栈，多应用共用一个 `window` 时无法区分来源，主流做法是在沙箱的 `get` 里包装子应用首次取到的关键方法（`setTimeout`、事件回调、Promise 链），或在入口注入 `try/catch` 包装的启动函数，并给每个应用带一个 context id。堆栈归属：需要 sourcemap 与子应用版本号绑定，注意沙箱改写行号会破坏 sourcemap，所以不要无差别地给所有代码加包装。资源归属：子应用加载的 JS/CSS 请求要打上应用标识，`unmount` 时统一取消未完成请求（`AbortController`），否则会出现"应用已卸载、请求回来又渲染"的幽灵更新。

**Q11：微前端怎么保证子应用的资源在卸载时被清理干净？**

要点：把清理责任分给三层。子应用层：在 `unmount` 里回收定时器、事件监听、`ResizeObserver`、WebSocket、未完成的 fetch，并返回一个"清理清单"便于测试断言。框架层：`destroy()` 清空影子 window、移除注入的 `<style>` / `<script>` 节点、revoke 深度代理。宿主层：做集成测试——挂载应用 A、卸载、挂载应用 B，断言 `window` 上无 A 的残留键、`document.styleSheets` 数量回到基线、`document.body` 的子节点数回到基线。这三条断言就是"没有泄漏"的可执行定义。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [webpack 模块联邦](https://webpack.js.org/concepts/module-federation/) | Module Federation 官方定义与配置项，是本页共享依赖章节的第一手依据。 | 先读概念与配置表，再看远程模块示例；带着“版本协商规则是什么”读，然后亲手跑通示例。 |
| [MDN 元编程](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming) | Proxy 与 Reflect 是 JS 沙箱劫持属性读写的语言基础。 | 读 Proxy 各陷阱与 Reflect 示例，思考哪些陷阱可做沙箱；自己写一个拦截读写并记录日志的 demo。 |
| [MDN @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) | 层叠层是标准化的样式隔离与顺序控制手段。 | 读 @layer 语法与优先级一节，把重置、组件、工具类分三层，验证顺序优先于特异性。 |
| [MDN 层叠与继承](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade) | 搞清层叠、继承与初始值，才能判断样式冲突由谁胜出。 | 读层叠、继承、初始值三篇，取一个样式冲突案例，写出胜出规则并解释理由。 |
| [Using CSS custom properties (variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties) | 自定义属性是微前端变量隔离与主题方案的常用基础。 | 读定义、继承与作用域部分，用前缀变量做主题隔离，观察变量是否跨子应用泄漏。 |
| [Vite：功能（中文）](https://cn.vitejs.dev/guide/features.html) | 子应用构建方式与 CSS 处理差异，是隔离问题的直接来源。 | 逐项试用 CSS 与静态资源、glob 导入，注意打包后样式注入顺序，写最小示例验证。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vue 2 响应式源码目录](https://github.com/vuejs/vue/tree/main/src/core/observer) | 源码对比能解释 Vue2 与 Vue3 沙箱实现的关键差异。 | 读响应式目录中 defineProperty 实现，与 Proxy 版对比，总结能否拦截新增与删除属性。 |
| [PostCSS 文档](https://postcss.org/docs/) | CSS AST 是自动化样式作用域改写的基础。 | 读插件编写指南，写一个给所有选择器加前缀的最小插件，理解 AST 遍历与改写。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSS in Depth（Manning）](https://www.manning.com/books/css-in-depth-second-edition) | 层叠与布局章节补足样式隔离所需的底层认知。 | 先读层叠与布局章，每章写一个实验页；带着“冲突如何求解”的问题读。 |
| [CSS for JavaScript Developers](https://css-for-js.dev/) | 补齐 CSS 心智模型，理解样式为何难做运行时隔离。 | 按模块读层叠与包含块部分，完成配套项目，再回看隔离方案的取舍。 |
| [CUBE CSS](https://cube.fyi/) | 约定式样式组织可显著减少子应用间的样式冲突。 | 通读后用 Composition、Utility、Block、Exception 重组一个页面，记录命名前缀的效果。 |
| [Kevin Powell](https://www.youtube.com/@KevinPowell) | 视频直观演示层叠与作用域实践，便于跟做。 | 挑层叠与作用域相关视频，每集后复刻示例，记录与隔离方案相关的做法。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理系统的万行表格，筛选器、表格、导出由三个团队各自发布 | 生命周期状态机 + 串行化队列 | qiankun、single-spa | 切换必须等旧应用卸载结束；全局监听器与定时器要在 unmount 里清干净 |
| 低端安卓机打开首屏，框架代码加子应用资源挤在同一个包 | 沙箱开销、共享依赖体积 | Module Federation + 路由级按需加载 | shared 声明越多，首屏主包越大；先加载宿主，再拉当前路由的应用 |
| 多人协作白板，画布由图形团队维护，评论面板由业务团队维护 | Shadow DOM 样式隔离 | Web Components + Shadow DOM | 鼠标事件要经 composedPath 判断来源；主题变量用 CSS 自定义属性注入 |
| 十年历史的 jQuery 后台，要嵌入新写的 React 报表 | 快照式沙箱（同一时刻只跑一个应用） | single-spa + 快照沙箱 | jQuery 插件挂到 window 的属性要在 unmount 还原 |
| 客服 SDK、埋点 SDK 由外部供应商提供，注入同一个页面 | 命名空间约定 + 运行时前缀 | 全局变量白名单 + CSS 前缀 | SDK 直接写 document.body 样式时前缀失效，需要用容器节点兜底 |
| 营销活动页一天上线多个版本做 A/B | 独立构建、独立部署 + 模块级共享 | Module Federation 远程容器 | 远程产物按版本号发布且不可变，回滚靠切换入口 URL |
| 一个宿主页同时挂导航与详情两个子应用 | Proxy 沙箱（多实例） | qiankun 多实例、无界（wujie） | 两个应用同时改 document.body 会互相覆盖；滚动容器归属提前约定 |
| 设计系统组件库要在四个子应用里共用一份 React | Module Federation 的 share scope 与版本协商 | shared singleton | 单例版本不匹配会出现两个 React 实例；CI 里扫描宿主与子应用的依赖版本 |
| 同一业务模块同时用于 PC 站与移动站 | 模块级共享，不涉及 DOM 隔离 | Module Federation | 两个宿主的构建目标与 polyfill 不同，远程模块要么编译到公共语法，要么导出两份 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格，三个团队独立发布

**业务背景**：表格、筛选器、导出过去共用一个仓库，一次发布要等三方都合完，谁出问题谁回滚整包。改成独立发布后，故障形态从合并冲突转成切换时的运行时残留。

**怎么用本页知识解决**：用一条串行队列接管所有挂载与卸载，保证"卸载旧应用"完成之后才"挂载新应用"。

```js
// 所有挂载/卸载排进同一条队列，保证执行顺序
let chain = Promise.resolve();
const enqueue = (task) => {
  chain = chain.then(task, task); // 前一个任务失败也不阻断后续
  return chain;
};

// 路由变化时：先卸载旧应用，再挂载新应用
async function onRouteChange(to) {
  await enqueue(async () => {
    if (current) await unmount(current); // 等卸载彻底结束
    current = matchApp(to);              // 按路由匹配目标应用
    if (current) await mount(current);   // 再挂载目标应用
  });
}
```

- 队列用 Promise 链实现，天然把并发的路由事件排成先后顺序。
- 卸载写进 `await`，而不是发一个事件就走，避免旧应用的定时器在新应用挂载后还在跑。
- `matchApp` 做成纯函数，输入路径输出子应用 ID，方便写单测。
- 子应用侧在 unmount 里成对清理 addEventListener、setInterval、window 上的属性。
- 路由事件要防抖，连续点击只保留最后一次目标。

**怎么度量收益**：切换耗时用 `performance.mark` 在卸载开始与挂载结束打点，再用 `performance.measure` 读取；内存看 Chrome DevTools 的 Memory 面板，抓两次 heap snapshot，中间手动切换 20 次，比较 detached DOM 节点数；全局残留用 `Object.keys(window)` 与白名单做差集，卸载后打印差集。

**什么时候不该用**：三个模块的发布窗口实际由同一个负责人控制时，用 monorepo 加目录边界，成本低于引入运行时框架；子应用之间需要高频共享运行时状态（同一张表的行选中态）时，跨应用同步代码会超过拆分带来的收益。

#### 场景 2：低端安卓机的首屏加载

**业务背景**：安装量集中在低端安卓机与波动的移动网络，接入微前端后首屏多出框架运行时与子应用资源。痛点是要分清变慢来自框架还是来自子应用包。

**怎么用本页知识解决**：首屏只加载宿主与当前路由的应用，其余远程入口等网络空闲再取。

```js
// 首屏只加载宿主与当前路由应用，其余延后
const conn = navigator.connection;              // 部分浏览器不提供，取值可能为 undefined
const saveData = conn && conn.saveData;         // 用户开启了省流模式
const slow = conn && /2g|3g/.test(conn.effectiveType || '');
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
if (!saveData && !slow) {
  // 网络不紧张时，空闲时段预取下一个路由的远程入口
  idle(() => {
    import(/* webpackChunkName: "app-b" */ './remote/app-b');
  });
}
```

- 省流模式与慢网条件下不预取，把带宽留给首屏可见内容。
- 预取放在空闲回调里，避免和首屏渲染抢主线程。
- 远程入口用动态 import，命中浏览器的模块缓存，二次进入不再走网络。
- 共享依赖只声明必须单例的项（如 React），其余交给子应用各自打包。
- 宿主自身也要做代码分割，框架代码与业务代码分开。

**怎么度量收益**：Lighthouse 选移动端并开启节流，记录 LCP、TBT；运行时用 web-vitals 采集 LCP、INP、CLS；用 PerformanceObserver 订阅 longtask，统计首屏阶段的主线程长任务数量；包体积用 webpack-bundle-analyzer 对比 shared 声明前后的主包构成。所有对比必须在同一台测试机、同一网络档位下做。

**什么时候不该用**：只有一个应用且首屏包已在预算内时，拆成微前端只多一层运行时加载；团队没有独立发布需求、只是想让代码看起来分开时，用目录边界加构建分包即可。

#### 场景 3：多人协作白板

**业务背景**：白板画布由图形算法团队维护，评论与权限面板由业务团队维护，两侧都要改同一区域的样式并注册键盘快捷键。全局 CSS 命中与快捷键抢占是主要故障来源。

**怎么用本页知识解决**：把面板子应用挂进影子根，样式作用域交给引擎；键盘事件按当前激活区域判断归属。

```js
// 每个子应用挂到自己的影子根，样式不再逃逸
const host = document.createElement('div');
host.id = 'app-a-host';
document.body.appendChild(host);
const root = host.attachShadow({ mode: 'open' }); // 开启影子根
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/app-a.css';   // 样式只在影子树内生效
root.appendChild(link);

// 主题变量通过 CSS 自定义属性继承进影子树
host.style.setProperty('--brand-color', '#0a58ca');
mountApp(root);             // 子应用往 root 内渲染，而不是 document.body
```

- 影子根内的选择器不会命中主应用节点，主应用的全局 reset 也进不去。
- CSS 自定义属性沿 DOM 树继承，能穿过影子边界，适合做主题切换。
- 宿主监听 keydown 时用 `event.composedPath()` 判断来源节点属于哪个子树。
- 弹层组件如果需要超出影子根范围，要先确认宿主容器能否承载，否则做事件转发。
- 画布这类高频渲染区域不放进影子树，减少额外的样式计算。

**怎么度量收益**：样式冲突看视觉回归用例通过率，截图回归可用 BackstopJS 之类的工具在每次构建后跑；主题切换后同样跑一轮；交互流畅度用 requestAnimationFrame 采样帧间隔，看长帧比例；主线程长任务用 PerformanceObserver 的 longtask 统计。

**什么时候不该用**：子应用要复用主应用的全局弹层与焦点管理时，影子边界会隔断事件与样式，需要额外做事件转发；首屏 HTML 需要服务端渲染且样式与主应用同源产出时，影子根的样式注入时机要单独设计。

### 行业先进实践

快照沙箱与 Proxy 沙箱按场景分工（出处：qiankun 官方文档「JS 沙箱」）。同一时刻只挂一个子应用时，快照沙箱直接读写真实 window，卸载时按 diff 还原，拦截开销低于代理。同时挂多个子应用时必须用 Proxy 沙箱，每个实例持有独立的影子 window。借鉴方式：先统计宿主同一时刻最多挂几个子应用，再决定沙箱类型，不要默认全量 Proxy。

生命周期注册表 + root config 路由分发（出处：single-spa 官方文档）。做法是把每个子应用的 bootstrap、mount、unmount 声明成注册项，root config 只负责路由匹配与调用。这样调度逻辑集中在一处，子应用不需要知道彼此的 URL 与加载顺序。借鉴方式：把路由匹配写成纯函数，用单测覆盖路径与子应用的映射关系。

share scope 与版本协商（出处：webpack 官方文档 Module Federation）。做法是把 React、ReactDOM 这类必须单例的依赖写进 shared，其余依赖不共享。运行时按已加载实例的版本区间挑选，减少重复实例。借鉴方式：shared 清单只保留单例依赖，并在 CI 里比对宿主与各子应用的依赖版本是否落在同一区间。

用 Shadow DOM 承载子应用 UI（出处：MDN Web Docs「Using shadow DOM」）。做法是每个子应用挂在自己的 shadow root 下，样式写在影子树内，作用域由浏览器保证，不依赖类名前缀约定。借鉴方式：先在样式冲突最集中的那个子应用上试点，验证第三方组件库与主题变量能否正常工作，再决定是否推广。

微前端框架的样式隔离分档（出处：qiankun 官方文档「样式隔离」）。做法是提供影子根隔离与运行时加前缀两档，团队按冲突严重程度选择。需核对官方文档：两档方案当前的实验状态，以及对第三方组件库弹层、body 属性改写的处理差异。

### 从学到用：落地路线

第 1 步，选发布最频繁、样式冲突最严重的那个边界做试点，只迁出一个子应用。验收标准：该子应用能独立构建、独立部署，宿主不改代码即可切换它的版本。

第 2 步，验证隔离与调度是否成立。验收标准：连续切换 50 次后，heap snapshot 的保留对象不逐次上升；快速连点路由 10 次，日志里不出现两个子应用同时挂载。

第 3 步，把试点结论推广到其余子应用。验收标准：每个子应用都有独立产物与部署流水线，宿主只依赖注册表；共享依赖清单收敛成一份，且写在文档里。

第 4 步，用 CI 卡住回退。验收标准：CI 检查每个子应用的 unmount 是否清理监听器与定时器、share 依赖版本是否越界；线上保留按版本切换入口 URL 的回滚开关。

### 动手作业

目标：搭一个最小宿主加两个子应用，验证串行化队列、全局残留清理与 Shadow DOM 样式隔离。

步骤：

1. 用 Vite 建三个工程：宿主、子应用 A（表格）、子应用 B（图表），各自独立构建。
2. 子应用导出 mount 与 unmount，mount 接收一个容器节点作为参数。
3. 宿主实现 `enqueue` 队列与路由监听，路由切换时按"卸载旧、挂载新"的顺序执行。
4. 在子应用 A 里挂一个 setInterval，往 window 写一个自定义属性，在 unmount 里成对清理。
5. 在子应用 B 里用 `attachShadow` 挂载，把样式放在影子树内，通过 CSS 自定义属性接收主题色。
6. 在宿主里给切换过程打 `performance.mark`，控制台输出每次切换耗时。
7. 手动连点路由，观察是否出现两个子应用同时挂载。

验收标准：

- 连续切换 50 次，Chrome DevTools Memory 面板抓取的 heap snapshot 保留大小不逐次上升。
- unmount 之后，`Object.keys(window)` 中不再出现子应用写入的自定义属性。
- 快速连点路由 10 次，控制台日志显示 mount 与 unmount 严格交替，无交叉。
- 主应用的全局样式改动不会影响子应用 B 的渲染结果。
- `performance.measure` 输出的每次切换耗时被打印出来，且可复现。

