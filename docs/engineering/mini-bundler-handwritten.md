---
title: "手写迷你打包器：模块图、运行时、Tree Shaking"
description: "webpack/rollup 的本质与可验证实现"
---

# 手写迷你打包器：模块图、运行时、Tree Shaking

!!! abstract "核心结论"

- 打包器的本质是：把多个模块解析为一张"模块图"，再把图编译成一个可直接执行的运行时闭包。
- CommonJS 循环依赖拿到的是"半成品 module.exports"；ESM 采用 live binding，未初始化绑定被读取时抛出 ReferenceError（TDZ）。
- Tree shaking 依赖静态 import/export：先标记入口可达且被引用的导出，再清除未使用导出；scope hoisting 则把模块并入同一作用域，消除闭包与数组查找。
- 代码分割的关键不是运行时多难，而是 chunk 边界如何从静态/动态依赖推导，以及 chunk 如何按需注册与缓存。
- 手写打包器最有价值的不是替代 webpack/rollup，而是验证你对模块加载语义、副作用分析与 source map 编码的理解。

## 1. 核心流程与模块图：从入口到可执行产物

一个最小 webpack 的流水线如下：入口解析 -> 依赖扫描 -> 转换 require 调用 -> 构建模块图 -> 生成运行时 -> 执行产物。

模块图在实现上用"数组下标 = 模块 id"，每个节点保存源码、路径、依赖映射。下面是可直接运行在 Node.js 18+ 的 mini-CJS 打包器，零外部依赖，只用 node:fs、node:path、node:os、node:vm。

```js
// 运行环境：Node.js 18+，保存为 mini-cjs-bundler.js 后运行：node mini-cjs-bundler.js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const assert = require('node:assert/strict');

// 扫描并重写源码中的字面量 require('...') 调用；跳过字符串、模板串与注释。
function rewriteRequires(code, replacer) {
  let out = '';
  let i = 0;
  let state = 'code';
  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];
    if (state === 'line-comment') {
      out += ch;
      i++;
      if (ch === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (ch === '*' && next === '/') { out += '*/'; i += 2; state = 'code'; }
      else { out += ch; i++; }
      continue;
    }
    if (state.startsWith('str:')) {
      const quote = state.slice(4);
      if (ch === '\\') { out += ch; if (next !== undefined) out += next; i += 2; continue; }
      out += ch;
      i++;
      if (ch === quote) state = 'code';
      continue;
    }
    if (ch === '/' && next === '/') { out += '//'; i += 2; state = 'line-comment'; continue; }
    if (ch === '/' && next === '*') { out += '/*'; i += 2; state = 'block-comment'; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { out += ch; i++; state = 'str:' + ch; continue; }
    if (ch === 'r' && code.startsWith('require', i)) {
      const before = i > 0 ? code[i - 1] : '';
      const boundaryOk = !/[A-Za-z0-9_$.]/.test(before);
      const rest = code.slice(i + 7);
      const match = rest.match(/^\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (boundaryOk && match) {
        out += replacer(match[1]);
        i += 7 + match[0].length;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

function resolveModule(fromFile, spec) {
  if (!spec.startsWith('.')) throw new Error('本实现只支持相对路径字面量依赖: ' + spec);
  const base = path.resolve(path.dirname(fromFile), spec);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  if (fs.existsSync(base + '.js')) return base + '.js';
  if (fs.existsSync(path.join(base, 'index.js'))) return path.join(base, 'index.js');
  throw new Error('无法解析依赖: ' + spec);
}

function buildGraph(entryPath) {
  const modules = [];
  const pathToId = new Map();
  const absEntry = path.resolve(entryPath);
  function visit(filePath) {
    const abs = path.resolve(filePath);
    if (pathToId.has(abs)) return pathToId.get(abs);
    const id = modules.length;
    modules[id] = null; // 先占位，循环依赖不会导致无限递归
    pathToId.set(abs, id);
    const rawCode = fs.readFileSync(abs, 'utf8');
    const specifiers = [];
    rewriteRequires(rawCode, (spec) => { specifiers.push(spec); return ''; });
    const deps = new Map();
    for (const spec of specifiers) {
      const depId = visit(resolveModule(abs, spec));
      if (!deps.has(spec)) deps.set(spec, depId);
    }
    const transformed = rewriteRequires(rawCode, (spec) => '__mini_require__(' + deps.get(spec) + ')');
    modules[id] = { id, filePath: abs, code: transformed, deps };
    return id;
  }
  visit(absEntry);
  return { modules, entryId: pathToId.get(absEntry) };
}

function generateBundle(modules, entryId) {
  const bodies = modules.map((m) => 'function (module, exports, __mini_require__) {\n' + m.code + '\n}');
  return [
    '(function (modules, entryId) {',
    '  var cache = Object.create(null);',
    '  function __mini_require__(id) {',
    '    if (cache[id]) return cache[id].exports;',
    '    var module = { id: id, exports: {}, loaded: false };',
    '    cache[id] = module;',
    '    modules[id].call(module.exports, module, module.exports, __mini_require__);',
    '    module.loaded = true;',
    '    return module.exports;',
    '  }',
    '  __mini_require__.c = cache;',
    '  return __mini_require__(entryId);',
    '})([\n' + bodies.join(',\n') + '\n], ' + entryId + ');'
  ].join('\n');
}

function executeBundle(bundleCode, sandbox = {}) {
  return vm.runInNewContext(bundleCode, sandbox);
}

function writeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-cjs-'));
  const files = {
    'entry.js': [
      "const b = require('./b');",
      "const c = require('./c');",
      "const m1 = require('./m1');",
      "const m2 = require('./m2');",
      "module.exports = {",
      "  sum: b.value + c.value,",
      "  sharedCount: c.shared,",
      "  dExecuted: globalThis.__dExecutions,",
      "  circularM1: m1.name,",
      "  circularM2: m2.name,",
      "  backRefName: m2.m1.name",
      "};"
    ].join('\n'),
    'b.js': "const d = require('./d');\nd.tick();\nmodule.exports = { value: 20 };",
    'c.js': "const d = require('./d');\nd.tick();\nmodule.exports = { value: 22, shared: d.count };",
    'd.js': "globalThis.__dExecutions = (globalThis.__dExecutions || 0) + 1;\nconst state = { count: 0 };\nstate.tick = function () { this.count += 1; };\nmodule.exports = state;",
    'm1.js': "const m2 = require('./m2');\nmodule.exports = { name: 'm1', m2: m2 };",
    'm2.js': "const m1 = require('./m1');\nmodule.exports = { name: 'm2', m1: m1 };"
  };
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}
```

验证标准：直接运行上述文件，应输出如下预期日志并通过断言。

```js
const fixtureDir = writeFixture();
const { modules, entryId } = buildGraph(path.join(fixtureDir, 'entry.js'));
const bundleCode = generateBundle(modules, entryId);
const exported = executeBundle(bundleCode, { console });

assert.strictEqual(modules.length, 6);
assert.strictEqual(exported.sum, 42);
assert.strictEqual(exported.sharedCount, 2);
assert.strictEqual(exported.dExecuted, 1);
assert.strictEqual(exported.circularM1, 'm1');
assert.strictEqual(exported.circularM2, 'm2');
assert.strictEqual(exported.backRefName, undefined);
console.log('mini-cjs 验证通过:', JSON.stringify(exported));
// 预期输出：mini-cjs 验证通过: {"sum":42,"sharedCount":2,"dExecuted":1,"circularM1":"m1","circularM2":"m2"}
```

解释：b 与 c 各自 require('./d') 得到缓存里的同一个模块，d 只执行一次，tick 两次后 sharedCount 为 2；m1 和 m2 互相 require 时，m2 先看到的 m1.exports 仍是空对象。

## 2. CommonJS 运行时：__webpack_require__、缓存与循环依赖

上节产物里的 `__mini_require__` 就是 webpack `__webpack_require__` 的简化等价物。关键机制是：先挂缓存、再执行 factory。循环依赖不会死循环，但会暴露"半成品导出"。

```js
// 运行环境：Node.js 18+
const assert = require('node:assert/strict');

function createCjsRuntime(factories) {
  const cache = Object.create(null);
  function require(id) {
    if (cache[id]) return cache[id].exports;
    const module = { id, exports: {}, loaded: false, children: [] };
    cache[id] = module; // 执行前先缓存，这是循环依赖不锁死的关键
    factories[id](module, module.exports, require);
    module.loaded = true;
    return module.exports;
  }
  require.cache = cache;
  return require;
}

const myRequire = createCjsRuntime({
  a(module, exports, require) {
    exports.name = 'a';
    const b = require('b');
    exports.child = b.name;
    exports.selfRef = require('a');
  },
  b(module, exports, require) {
    exports.name = 'b';
    const a = require('a');
    exports.earlyA = a.name;
    exports.earlyChild = a.child;
  },
  entry(module, exports, require) {
    module.exports = { b: require('b'), a: require('a') };
  }
});

const entry = myRequire('entry');
assert.strictEqual(entry.b.earlyA, 'a');
assert.strictEqual(entry.b.earlyChild, undefined);
assert.strictEqual(entry.a.child, 'b');
assert.strictEqual(entry.a.selfRef, entry.a);
assert.strictEqual(myRequire.cache.a.loaded, true);
console.log('CJS 循环依赖验证通过');
// 预期输出：CJS 循环依赖验证通过
```

表 1：CommonJS 导出与 ESM live binding 的运行时差异

| 维度 | CommonJS | ESM |
| --- | --- | --- |
| 导出值 | module.exports 对象，可被整体替换 | export 声明绑定，不可整体替换，但绑定值可更新 |
| 循环依赖 | 拿到当时的 exports 快照，经常是空对象 | 拿到 module record，读取未初始化绑定抛 TDZ |
| 导入方看到更新 | 导入方保存普通对象，不会自动更新 | 每次读取走 getter，始终得到最新值 |
| 是否可静态分析 | 动态 require 难做 tree shaking | import/export 静态结构可做依赖图与摇树 |
| 主执行时机 | require 时执行 | import 模块先求值，且只求值一次 |

## 3. ESM live binding：getter、cell 与 TDZ 运行时机

ESM 导出不是值拷贝，而是"绑定"。运行时最直接的做法：每个导出名对应一个 cell，namespace 对象通过 getter 读 cell；导入方每次 `imp(depId, name)` 都走 getter。

```js
// 运行环境：Node.js 18+
const assert = require('node:assert/strict');

function makeUninitializedCell() {
  let initialized = false;
  let value;
  return {
    read() {
      if (!initialized) throw new ReferenceError('读取了尚未初始化的 ESM 导出');
      return value;
    },
    write(v) { value = v; initialized = true; }
  };
}

function createEsmRuntime(moduleDefs, entryId) {
  const records = new Map();
  // instantiation 阶段：先建立所有 cell 与 namespace getter，再求值。
  // 循环依赖因此能拿到模块记录，但过早读取会触发 cell 的 TDZ。
  for (const [id, def] of Object.entries(moduleDefs)) {
    const cells = {};
    const namespace = {};
    for (const name of def.exports) {
      const cell = makeUninitializedCell();
      cells[name] = cell;
      Object.defineProperty(namespace, name, { enumerable: true, get: () => cell.read() });
    }
    records.set(id, { id, def, cells, namespace, state: 'instantiated' });
  }
  function evaluate(id) {
    const rec = records.get(id);
    if (!rec) throw new Error('未知模块: ' + id);
    if (rec.state === 'evaluated') return rec.namespace;
    if (rec.state === 'evaluating') return rec.namespace;
    rec.state = 'evaluating';
    const imp = (depId, name) => evaluate(depId)[name];
    rec.def.factory(rec.cells, imp);
    rec.state = 'evaluated';
    return rec.namespace;
  }
  return evaluate(entryId);
}

// 编译器输出后的等价形式：
// ./counter.js: export let count = 1; export const add = () => { count += 1; };
// ./app.js: import { count, add } from './counter'; export const current = () => count;
const liveModules = {
  './counter': {
    exports: ['count', 'add'],
    factory(self) {
      self.count.write(1);
      self.add.write(() => { self.count.write(self.count.read() + 1); });
    }
  },
  './app': {
    exports: ['current', 'bump'],
    factory(self, imp) {
      self.current.write(() => imp('./counter', 'count'));
      self.bump.write(() => imp('./counter', 'add')());
    }
  }
};

const app = createEsmRuntime(liveModules, './app');
assert.strictEqual(app.current(), 1);
app.bump();
assert.strictEqual(app.current(), 2);

// TDZ 循环依赖：./a 导入 ./b.y，./b 导入 ./a.x，顶层 let 初始化链会抛 ReferenceError。
const circularModules = {
  './a': { exports: ['x'], factory(self, imp) { self.x.write(imp('./b', 'y') + 1); } },
  './b': { exports: ['y'], factory(self, imp) { self.y.write(imp('./a', 'x') + 1); } }
};
assert.throws(
  () => createEsmRuntime(circularModules, './a'),
  (err) => err instanceof ReferenceError
);
console.log('ESM live binding 与 TDZ 验证通过');
// 预期输出：ESM live binding 与 TDZ 验证通过
```

关键差异：导入方不保存导入值，而是保存"如何读取绑定"；因此导出模块内部更新 `count` 后，`app.current()` 会立即读到新值。

## 4. Tree Shaking 与 Scope Hoisting：标记-清除导出

本节实现极简 ESM 子集：只支持单行 `import { a, b as c } from '...'` 与 `export const name = expr;`。tree shaking 分两步：先标记入口可达且被引用的导出，再清除未标记导出；scope hoisting 则把模块编译成扁平作用域变量。

```js
// 运行环境：Node.js 18+
const assert = require('node:assert/strict');

function scanIdentifiers(code) {
  const ids = [];
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < code.length) {
        if (code[i] === '\\') { i += 2; continue; }
        const c = code[i];
        i++;
        if (c === quote) break;
      }
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[A-Za-z0-9_$]/.test(code[j])) j++;
      ids.push(code.slice(i, j));
      i = j;
      continue;
    }
    i++;
  }
  return ids;
}

function rewriteIdentifiers(code, replacements) {
  let i = 0;
  let out = '';
  while (i < code.length) {
    const ch = code[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      out += ch;
      i++;
      while (i < code.length) {
        const c = code[i];
        out += c;
        if (c === '\\') { out += code[i + 1] || ''; i += 2; continue; }
        i++;
        if (c === quote) break;
      }
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[A-Za-z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      const prev = out[out.length - 1];
      if (replacements.has(word) && prev !== '.') out += replacements.get(word);
      else out += word;
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function parseEsModule(code, id) {
  const imports = [];
  const exports = new Map();
  for (const rawLine of code.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;
    let m;
    if ((m = line.match(/^import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?$/))) {
      for (const part of m[1].split(',')) {
        const s = part.trim();
        if (!s) continue;
        const pair = s.includes(' as ') ? s.split(/\s+as\s+/) : [s, s];
        imports.push({ source: m[2], imported: pair[0], local: pair[1] });
      }
    } else if ((m = line.match(/^export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);?\s*$/))) {
      exports.set(m[1], { name: m[1], expr: m[2].trim() });
    } else {
      throw new Error(`[${id}] 不支持的语句: ${line}`);
    }
  }
  return { id, imports, exports };
}

function buildModuleMap(sourceMap) {
  const modules = new Map();
  for (const [id, code] of Object.entries(sourceMap)) modules.set(id, parseEsModule(code, id));
  for (const mod of modules.values()) {
    for (const imp of mod.imports) {
      if (!modules.has(imp.source)) throw new Error(`${mod.id} 缺少依赖 ${imp.source}`);
    }
  }
  return modules;
}

function markUsedExports(modules, entryId, entryExportNames) {
  const used = new Map();
  for (const id of modules.keys()) used.set(id, new Set());
  const queue = [];
  for (const name of entryExportNames) {
    used.get(entryId).add(name);
    queue.push([entryId, name]);
  }
  while (queue.length > 0) {
    const [id, name] = queue.shift();
    const mod = modules.get(id);
    const exp = mod.exports.get(name);
    if (!exp) continue;
    for (const ref of scanIdentifiers(exp.expr)) {
      const imp = mod.imports.find((i) => i.local === ref);
      if (imp) {
        const s = used.get(imp.source);
        if (!s.has(imp.imported)) { s.add(imp.imported); queue.push([imp.source, imp.imported]); }
      } else if (mod.exports.has(ref)) {
        const s = used.get(id);
        if (!s.has(ref)) { s.add(ref); queue.push([id, ref]); }
      }
    }
  }
  return used;
}

function sanitizeId(id) {
  return id.replace(/[^A-Za-z0-9_$]/g, '_');
}

function hoistAndShake(modules, used, entryId) {
  const globalNames = new Map();
  for (const mod of modules.values()) {
    for (const name of used.get(mod.id)) {
      globalNames.set(`${mod.id}:${name}`, `${sanitizeId(mod.id)}_${name}`);
    }
  }
  const lines = [];
  for (const mod of modules.values()) {
    const usedNames = [...used.get(mod.id)];
    if (usedNames.length === 0) continue;
    for (const name of usedNames) {
      const exp = mod.exports.get(name);
      const replacements = new Map();
      for (const imp of mod.imports) {
        const g = globalNames.get(`${imp.source}:${imp.imported}`);
        if (g) replacements.set(imp.local, g);
      }
      for (const ownName of usedNames) {
        const g = globalNames.get(`${mod.id}:${ownName}`);
        if (g) replacements.set(ownName, g);
      }
      const body = rewriteIdentifiers(exp.expr, replacements);
      lines.push(`const ${globalNames.get(`${mod.id}:${name}`)} = ${body};`);
    }
  }
  const entryUsed = [...used.get(entryId)];
  const returnObject = entryUsed
    .map((name) => `    ${name}: ${globalNames.get(`${entryId}:${name}`)}`)
    .join(',\n');
  return `(function () {\n${lines.join('\n')}\n  return {\n${returnObject}\n  };\n})();`;
}

const modules = buildModuleMap({
  './entry.js': "import { double } from './math.js';\nexport const result = double(21);",
  './math.js': "export const double = x => x * 2;\nexport const unused = 999;"
});
const used = markUsedExports(modules, './entry.js', ['result']);
const generated = hoistAndShake(modules, used, './entry.js');
const bundle = new Function('return ' + generated)();

assert.strictEqual(bundle.result, 42);
assert.strictEqual(generated.includes('unused'), false);
assert.strictEqual(generated.includes('999'), false);
assert.strictEqual(generated.includes('__math_js_double'), true);
console.log('tree shaking + scope hoisting 验证通过');
// 预期输出：tree shaking + scope hoisting 验证通过
```

表 2：tree shaking 标记-清除阶段对比

| 阶段 | 输入 | 输出 | 关键算法 |
| --- | --- | --- | --- |
| 构建模块图 | 入口文件 | 模块 id、import/export 映射 | DFS/BFS 依赖解析 |
| 标记 | 入口导出集合 | usedExports: Map<moduleId, Set<exportName>> | 从入口传播引用，遇到 import 则跨模块继续 |
| 清除/生成 | usedExports | 只含被引用导出的扁平产物 | 跳过未标记模块；重命名后并入同一作用域 |

该标记器是粗粒度的：不处理局部遮蔽、属性访问和字符串字面量。真实 bundler 需要完整 AST、作用域分析、sideEffects 标记与 `/*#__PURE__*/` 注释，才能安全删除含副作用的调用。

## 5. 代码分割与动态 import：chunk 安装运行时

代码分割的运行时核心是：入口 chunk 先加载；遇到动态 import 时，按 chunk id 按需安装并执行该 chunk 的模块表。

```js
// 运行环境：Node.js 18+
const assert = require('node:assert/strict');

// 简化改写：把 import('./lazy') 替换为 __dynamic_import__('lazy')
// 教学子集不处理字符串/注释中的 import(，真实实现必须用 AST。
function rewriteDynamicImports(code, chunkIdBySpec) {
  return code.replace(/import\(\s*['"]([^'"]+)['"]\s*\)/g, (_, spec) => {
    if (!chunkIdBySpec[spec]) throw new Error('未映射的 chunk: ' + spec);
    return '__dynamic_import__(' + JSON.stringify(chunkIdBySpec[spec]) + ')';
  });
}

assert.strictEqual(
  rewriteDynamicImports("import('./lazy.js')", { './lazy.js': 'lazy' }),
  '__dynamic_import__("lazy")'
);
console.log('dynamic import 改写验证通过');
// 预期输出：dynamic import 改写验证通过
```

chunk 安装与缓存运行时：

```js
function createChunkRuntime(chunkDefs, onLoadChunk) {
  const factories = new Map();
  const cache = new Map();
  const installedChunks = new Set();
  const loadedOrder = [];

  function installChunk(chunkId) {
    if (installedChunks.has(chunkId)) return;
    const def = chunkDefs[chunkId];
    if (!def) throw new Error('unknown chunk: ' + chunkId);
    onLoadChunk(chunkId);
    for (const [id, factory] of Object.entries(def.modules)) factories.set(id, factory);
    installedChunks.add(chunkId);
    loadedOrder.push(chunkId);
  }

  function require(id) {
    if (cache.has(id)) return cache.get(id).exports;
    const module = { id, exports: {}, loaded: false };
    cache.set(id, module);
    factories.get(id)(module, module.exports, require, dynamicImport);
    module.loaded = true;
    return module.exports;
  }

  function dynamicImport(chunkId) {
    return Promise.resolve().then(() => {
      installChunk(chunkId);
      return require(chunkDefs[chunkId].entryModule);
    });
  }

  installChunk('main');
  return {
    require,
    dynamicImport,
    loadedOrder,
    getEntry: () => require(chunkDefs.main.entryModule)
  };
}

const loadEvents = [];
const runtime = createChunkRuntime(
  {
    main: {
      entryModule: 'entry',
      modules: {
        entry(module, exports, require, dynamicImport) {
          exports.loadLazy = () => dynamicImport('lazy').then((m) => m.default);
          exports.answer = 40 + 2;
        }
      }
    },
    lazy: {
      entryModule: 'lazyEntry',
      modules: {
        lazyEntry(module, exports) {
          exports.default = 'lazy default';
        }
      }
    }
  },
  (chunkId) => loadEvents.push(chunkId)
);

(async () => {
  const main = runtime.getEntry();
  assert.strictEqual(main.answer, 42);
  assert.deepStrictEqual(runtime.loadedOrder, ['main']);
  const lazy = await main.loadLazy();
  assert.strictEqual(lazy, 'lazy default');
  assert.deepStrictEqual(runtime.loadedOrder, ['main', 'lazy']);
  assert.deepStrictEqual(loadEvents, ['main', 'lazy']);
  console.log('chunk 安装运行时验证通过');
  // 预期输出：chunk 安装运行时验证通过
})().catch((err) => { console.error(err); process.exit(1); });
```

实际浏览器打包里，chunk 常用 JSONP 或 ESM import 加载；生产运行时还要处理加载失败、重试、preload 与 chunk 公共依赖去重。

## 6. Source Map 基础：mappings 与 Base64 VLQ

source map v3 的 `mappings` 用分号分隔生成行、逗号分隔段；每段是相对前一段的 `[generatedColumn, sourceIndex, originalLine, originalColumn]` 差值，再用 Base64 VLQ 编码。

```js
// 运行环境：Node.js 18+
const assert = require('node:assert/strict');

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function vlqEncode(value) {
  let vlq = value < 0 ? ((-value) << 1) + 1 : (value << 1);
  let out = '';
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    out += BASE64[digit];
  } while (vlq > 0);
  return out;
}

function vlqDecode(str) {
  const numbers = [];
  let result = 0;
  let shift = 0;
  for (const ch of str) {
    const digit = BASE64.indexOf(ch);
    if (digit < 0) throw new Error('非法 VLQ 字符: ' + ch);
    const cont = digit & 32;
    result += (digit & 31) << shift;
    if (cont) {
      shift += 5;
    } else {
      const neg = result & 1;
      numbers.push(neg ? -(result >>> 1) : (result >>> 1));
      result = 0;
      shift = 0;
    }
  }
  return numbers;
}

// 单行映射：generatedColumn=0, sourceIndex=0, originalLine=1, originalColumn=0
const absoluteSegment = [0, 0, 1, 0];
const encoded = absoluteSegment.map(vlqEncode).join('');
assert.strictEqual(encoded, 'AACA');
assert.deepStrictEqual(vlqDecode(encoded), absoluteSegment);

const map = {
  version: 3,
  file: 'out.js',
  sources: ['in.js'],
  sourcesContent: ['const unused = 1;\nconst used = 2;\n'],
  names: [],
  mappings: encoded
};
assert.strictEqual(map.version, 3);
assert.deepStrictEqual(map.sources, ['in.js']);
console.log('VLQ/source map 基础验证通过');
// 预期输出：VLQ/source map 基础验证通过
```

表 3：source map 关键字段

| 字段 | 作用 |
| --- | --- |
| version | source map 版本，目前规范为 3 |
| sources / sourcesContent | 原始文件名与原始内容；没有 sourcesContent 时调试器需要重新请求源码 |
| names | 被压缩掉的标识符原名 |
| mappings | 生成位置到原始位置的编码映射 |

这里实现的是单段、零前值的特例。多行、多 segment 时还需要做生成行内与源文件间的相对位置增量编码。

## 7. 常见陷阱

- 用正则直接匹配 `require(...)` 或 `import(...)` 会误伤字符串、注释和 `obj.require()`。上文字符级 scanner 只解决单双引号、模板串与两种注释；真实实现应使用 acorn 等 parser 生成 AST 再替换。
- CommonJS 循环依赖时，模块 a 的 `module.exports` 在 factory 结束前仍是初始空对象；b 若在中途保存 `a.child`，它不会在 a 完成后更新。
- ESM live binding 不等于对象引用。导入方每次读取走 getter，因此 `export let count` 内部更新后导入方读到新值；但若导入方顶层写 `const copy = count`，copy 仍是一次值拷贝。
- TDZ 是绑定被读取时抛错，而不是模块执行失败。函数声明有 hoisting，导致同类循环依赖在函数导出场景可行，在顶层 `let` 初始化链中则可能抛 ReferenceError。
- Tree shaking 最容易出错的是"该模块是否有副作用"。模块若没有被引用任何导出，但顶层执行了 `console.log`、DOM 操作或函数调用，贸然删除会破坏行为。webpack 的 `sideEffects: false` 与 pure annotation 都是围绕这一风险设计（概念以官方文档为准）。
- Scope hoisting 不能无脑合并：模块顶层 `this`、动态属性访问、eval 以及重复变量名都会产生语义差异。
- 多 chunk 共享同一模块时，模块 id 必须全局唯一，cache 只按 id 命中，否则会重复执行或导出不一致。
- source map 的 mappings 是增量编码，手动构造时最容易忽略前值，导致调试器定位错乱。

## 8. 面试题与答题要点

**1. webpack 产物为什么是数字模块数组加一个 runtime？**

要点：数字 id 减少查找与体积；模块 factory 延迟执行；`__webpack_require__` 负责缓存、循环依赖与模块单例；runtime 与业务模块分离可复用缓存策略。

**2. CommonJS 和 ESM 循环依赖行为为何不同？**

要点：CJS 先缓存空 exports 再执行 factory，因此 b 会拿到 a 的半成品；ESM 先创建 module record 与绑定，未初始化的 `let` 绑定读取时产生 ReferenceError（TDZ）；函数声明 hoisting 是常见绕过方式。

**3. 为什么 tree shaking 通常以 ESM 为前提？**

要点：ESM 的 import/export 是静态可分析的，打包器能在不执行代码的情况下推导依赖与导出引用；CommonJS 的 require 可以是动态表达式、条件分支或运行时拼接，导出对象也可任意改写。

**4. 如何实现动态 import 的 chunk 加载？**

要点：解析器把 `import()` 改写为 `__import__(chunkId)`；每个 chunk 有自己的模块表；runtime 在 Promise 回调里安装 chunk，再递归 require 该 chunk 的 entry module；加载失败要 reject 并支持重试。

**5. Tree shaking 如何避免误删副作用？**

要点：区分声明式导出与副作用语句；对函数调用标注 pure 信息；`sideEffects: false` 告知打包器可安全整模块删除；需要结合作用域分析确认删除路径不改变可见行为。

**6. Scope hoisting 与普通模块包裹的区别？**

要点：普通产物每个模块一个函数加模块数组；scope hoisting 把可达模块变量合并到同一作用域，消除函数调用与数组查找；风险是模块顶层 this、名称冲突与间接导出访问，必须做重命名与安全分析。

**7. 手写打包器时，依赖扫描为什么不能只靠正则？**

要点：正则无法感知字符串与注释边界；模块路径可能需要解析扩展名、目录 index、node_modules 与 alias；生产环境用 AST（acorn/babel）获取精确的调用节点与字符串参数。

**8. Source Map 的 mappings 为什么是相对增量？**

要点：source map 必须尽量小，增量编码配合 Base64 VLQ 可压缩数字序列；每个 segment 是在上一 segment 基础上的 delta；手动构造时最容易忽略前值导致浏览器定位偏移。

## 9. 结语

把入口解析、依赖图、CJS/ESM runtime、tree shaking、chunk 加载与 source map 串起来后，webpack 与 rollup 的核心机制就不再是黑盒：它们只是更大规模地做了同一套标记、重写与生成。面试时先说出"模块图、运行时缓存、静态分析"这条主线，再上可运行代码验证，通常比背配置项更有说服力。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Rollup 文档](https://cn.rollupjs.org/) | 官方讲 Tree Shaking 与 ESM 打包原理，输出格式说明最清晰。 | 读 Tree Shaking 与 Output Formats 两节，对照自己实现的标记-清除导出。 |
| [webpack 文档](https://webpack.js.org/concepts/) | 核心概念、运行时与分包模型，是手写实现的对照标准。 | 读 Concepts 与 Code Splitting 章节，边读边列自己运行时缺哪块。 |
| [Non ESM Output Formats](https://rolldown.rs/in-depth/non-esm-output-formats) | 官方说明 CJS/IIFE/UMD 输出差异，选运行时外壳时必读。 | 读各格式要点，决定打包器输出 CJS 还是 IIFE，并各写一个小例子。 |
| [Entry Chunk](https://rolldown.rs/glossary/entry-chunk) | 定义入口 chunk 与依赖 chunk 的关系，对齐分包术语。 | 读定义与示例，画一张入口 chunk 与动态 chunk 的依赖图。 |
| [Node.js 包规范](https://nodejs.org/api/packages.html) | exports 与条件导出决定解析规则，模块图解析绕不开。 | 读条件导出一节，给自己的包写 ESM/CJS 双入口并实际验证。 |
| [Node.js ES 模块](https://nodejs.org/api/esm.html) | 讲清 CJS/ESM 互操作与加载语义，配对运行时实现。 | 读互操作与加载器两节，带着 require(ESM) 报错问题读，再写双格式包验证。 |
| [MDN JavaScript 模块](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) | live binding、循环依赖等 ESM 语义写得准确且简短。 | 读导出绑定相关小节，写计数器实验验证导出是引用而非拷贝。 |
| [import()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) | 动态导入的官方语义，chunk 按需加载的规范依据。 | 读返回值 Promise 与命名空间部分，写一个按需加载 chunk 的 demo。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Source Map 可视化](https://evanw.github.io/source-map-visualization/) | 把产物与 map 对照可视化，直观看懂 mappings 与 VLQ。 | 上传自己打包器产出的 js 与 map，定位某行某列，反推 VLQ 段结构。 |
| [代码拆分减小 JS 体积](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting) | 动态 import 拆路由的实操，能观察到 chunk 产物变化。 | 把路由改成动态 import，打包后对比 chunk 文件与请求时机。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [YDKJS：Scope & Closures](https://github.com/getify/You-Dont-Know-JS/tree/2nd-ed/scope-closures) | 闭包与作用域讲得最透，支撑运行时包装函数的理解。 | 读第 1、5 章，带着包装函数如何保存状态的问题读，再手写缓存版 require。 |
| [Vite：为什么选 Vite（中文）](https://cn.vitejs.dev/guide/why.html) | 讲清原生 ESM 与预构建，理解打包器为何仍需存在。 | 读原生 ESM 与依赖预构建两节，思考它替掉了打包器哪一步。 |
| [webpack 入门指南](https://webpack.js.org/guides/getting-started/) | 从零配置走通 loader 与 plugin，建立打包流程骨架。 | 跟着配一遍，重点看 entry 到 bundle 的中间产物，与手写实现对齐。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格 | 代码分割与动态 import | webpack `import()` 加虚拟滚动库 | 表格视图放在点击之后加载，列配置不要写进入口 chunk |
| 低端安卓机的首屏加载 | Tree Shaking 与 Scope Hoisting | Rollup 加 ESM 依赖 | 依赖需提供 ESM 入口，`sideEffects` 写错会删掉有副作用的模块 |
| 多人协作白板的协同引擎 | 运行时缓存与 chunk 安装 | 自研运行时或 webpack | 同一模块 id 必须只执行一次，否则会重复建连接 |
| 营销落地页的多版本投放 | 模块图与入口解析 | 多入口加动态 import | 每个版本各自成图，公共依赖用 splitChunks 抽出 |
| 仪表盘图表的按需渲染 | 动态 import 与 chunk 边界推导 | ECharts 按需引入加 `import()` | 边界按图表库整体切，不要按单个图表类型切碎 |
| 组件库发布到 npm | Tree Shaking 的标记与清除 | Rollup 加 `preserveModules` | 导出要静态可分析，转发导出会加大标记难度 |
| Node 端 SSR 的循环依赖 | CommonJS 运行时与循环依赖 | Node 条件导出双入口 | CJS 拿到半成品导出，初始化顺序要靠延迟调用 |
| 微前端子应用的接入 | 运行时与模块注册 | qiankun 或 Module Federation | 子应用导出要隔离，共享依赖需在配置里显式声明 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：表格页入口打包了表格组件、列配置与导出逻辑，首屏必须先下载全部代码才渲染筛选条。数据行数达到十万级别时，虚拟滚动与列配置代码让入口体积继续增长。

**怎么用本页知识解决**：思路是把入口缩到筛选条，把表格视图写成动态依赖，让打包器从依赖边推导出独立 chunk。

```js
// 入口只保留筛选条；表格视图写成动态依赖，单独成一个 chunk
document.querySelector('#open-table').addEventListener('click', async () => {
  // import() 返回 Promise，模块图在这里新增一条动态边
  const mod = await import('./table-view.js')
  // chunk 下载并执行完后导出对象才可用，此时再挂载表格
  mod.mount(document.querySelector('#app'))
})
```

- 静态 import 会把表格代码拉进入口 chunk，动态 import 把它推到点击之后。
- 打包器为动态依赖生成独立 chunk，并在运行时插入 chunk 加载与注册函数。
- 加载失败时 Promise 进入 reject，可以在这里接重试或降级为只读列表。
- 边界按"用户是否必然走到"划分，筛选条与表格是两个使用频率不同的区段。

**怎么度量收益**：用 webpack-bundle-analyzer 看入口 chunk 的 parsed size；用 Chrome DevTools 的 Network 面板数首屏请求数与传输字节；用 PerformanceObserver 采集 `largest-contentful-paint`，取改动前后各十次的中位数。

**什么时候不该用**：

- 表格是页面唯一内容，用户进来必然展开，动态 import 只多一次请求往返。
- 内网带宽充足且设备为桌面机，首屏指标不敏感，改动前后测不出差异。
- 表格数据要参与服务端渲染，延迟加载会让水合内容与 DOM 不一致。

#### 场景 2：低端安卓机的首屏加载

**业务背景**：低端安卓机上脚本下载与解析占首屏时间的大头，白屏时长随入口体积增长。工具库按整包引入，页面只调用其中两个函数，其余代码仍要下载与解析。

**怎么用本页知识解决**：思路是先让导出静态可分析，再用 `sideEffects` 声明配合标记清除，最后让 scope hoisting 收回闭包开销。

```js
// package.json 写 "sideEffects": false，打包器才敢删未引用的模块
// 入口只按名字引入需要的导出，标记阶段能算出引用集合
import { formatDate } from './utils/date.js'
console.log(formatDate(Date.now()))

// utils/date.js 的内容
// export function formatDate(ts) { return new Date(ts).toISOString() } // 被引用，保留
// export function formatMoney(n) { return n.toFixed(2) }              // 无人引用，清除
// console.log('date util loaded')                                     // 顶层副作用，保留
```

- Tree shaking 只处理静态 import/export，`require` 加变量拼路径会让引用集合算不准。
- 未被任何模块引用的导出先被标记为可删，再由压缩器执行清除动作。
- 顶层语句无法证明无副作用时整段模块被保留，`sideEffects` 是删掉它的前提。
- scope hoisting 把模块并入同一作用域，去掉闭包包装与模块数组查找。
- 判断副作用看模块本身而非导出，polyfill 注册与全局变量写入都算副作用。

**怎么度量收益**：用 webpack 的 stats.json 看 `usedExports` 标记结果；用 Chrome DevTools 的 Coverage 面板看脚本未使用字节占比；在固定机型上看 Performance 面板的 `scripting` 与 `total blocking time`，重复十次取中位数。

**什么时候不该用**：

- 库在加载时注册全局 polyfill 或注入样式，删掉未引用模块会直接改变运行行为。
- 代码大量使用 `require` 加变量拼路径，静态分析拿不到引用集合，开启后产物不变。
- 以 CJS 为发布产物且下游用 `require` 消费，标记出的未使用导出仍会留在文件里。

#### 场景 3：多人协作白板的协同引擎

**业务背景**：白板首屏只需画布与画笔，协同引擎、历史回放、导出图片却一起进了主包。多人同时在线时，协同连接对象被画布与回放同时引用，初始化两次会各建一条连接。

**怎么用本页知识解决**：思路是把协同、回放、导出拆成按需 chunk，再用模块级缓存在运行时保证同一模块只执行一次。

```js
const cache = {}
function requireModule(id) {
  if (cache[id]) return cache[id].exports      // 已执行过，直接返回导出，不重复初始化
  const mod = cache[id] = { exports: {} }      // 先登记再执行，循环依赖能拿到半成品
  modules[id](mod, mod.exports, requireModule) // 执行模块工厂函数
  return mod.exports
}
// 动态 import 的产物：先下载并注册 chunk，再交给 requireModule 执行
function loadChunk(id) {
  if (chunkLoaded[id]) return Promise.resolve(requireModule(chunkEntry[id]))
  return fetchChunk(id).then(() => {           // 下载脚本，执行后完成 chunks[id] 注册
    chunkLoaded[id] = true
    return requireModule(chunkEntry[id])       // 注册完再按模块 id 取导出
  })
}
```

- 缓存放在模块粒度，协同引擎被画布与回放引用时只初始化一次。
- 先登记后执行让循环依赖拿到半成品导出，与 CommonJS 运行时行为一致。
- 下载与执行分成两步，网络失败只重试下载，不重复执行已注册模块。
- chunk 边界按"是否同一会话必然触发"划分，回放与导出很少和协同面板同时打开。
- 需要共享连接状态时，让两个模块引用同一模块 id，而不是各建一份单例。

**怎么度量收益**：用 webpack-bundle-analyzer 看各 chunk 的 parsed size 与共享依赖；用 Network 面板按 chunk 名筛选，确认重复点击不重复下载；用 `performance.getEntriesByType('resource')` 统计 chunk 请求耗时分布。

**什么时候不该用**：

- 回放数据在页面加载后立刻用于渲染缩略图，拆出去只多一次请求。
- 协同引擎与画布互相调用频繁，跨 chunk 调用开销超过拆分省下的下载量。
- 用户网络无法稳定完成第二次请求，多 chunk 会放大失败面，不如单包一次到位。

### 行业先进实践

`optimization.splitChunks` 的 cacheGroups 默认分组（出处：webpack 官方文档）。webpack 默认把来自 node_modules 且被多个 chunk 复用的模块抽成 vendors 组，并按体积阈值切分。它把重复依赖收敛到可长期缓存的 chunk，减少重复下载。借鉴方式是先读默认阈值，再按自己项目的首屏请求数目标调 `minSize` 与 `maxInitialRequests`。

`package.json` 的 `sideEffects` 字段（出处：webpack 官方文档）。该字段声明模块是否含副作用，打包器据此决定能否整块删除未引用模块。对只导出函数与常量的工具库，声明 `false` 能把清除做到模块粒度。借鉴方式是把有副作用的文件用数组显式列出，其余交给打包器处理。

`preserveModules` 与 `treeshake.moduleSideEffects`（出处：Rollup 官方文档）。`preserveModules` 让 Rollup 按源文件输出模块，保留导入导出结构，下游打包器还能继续做 tree shaking。库作者用它避免产物被压成单文件后丢失标记信息。借鉴方式是发布 ESM 产物时保留模块结构，把 CJS 产物作为兼容回退。

依赖预构建（出处：Vite 官方文档）。Vite 在开发期用 esbuild 把 CJS 依赖预构建为 ESM，并把结果缓存到 `node_modules/.vite`。它把多个小模块请求合并为一次请求，减少开发服务器往返。借鉴方式是把 CJS 依赖列进预构建范围，改依赖后按提示清理缓存目录。

Node.js 条件导出 `exports` 字段（出处：Node.js 官方文档）。该字段按 `import` 与 `require` 条件指向不同入口，让同一包在两种加载方式下各取所需产物。它避免单一入口在两种加载语义下错位，例如 ESM 侧拿不到 live binding。借鉴方式是 `import` 条件指向保留模块结构的 ESM 文件，`require` 条件指向打包后的 CJS 文件。

### 从学到用：落地路线

1. 试点：先在一个依赖简单、构建时间短的内部页面接入自研打包器，只处理 ESM 入口与静态导入。验收标准：产出的 bundle 能跑通该页面的全部主流程，控制台无报错。
2. 验证：用同一份源码分别跑 webpack 与自研打包器，对比模块数量、导出标记结果与 source map 定位正确率。验收标准：随机抽 10 个断点，自研 source map 都能定位回源文件行列。
3. 推广：把打包器接进 CI 的生产构建脚本，保留 webpack 作为回退开关。验收标准：构建失败时用一个环境变量就能切回原链路，切回后产物可发布。
4. 防回退：把 `sideEffects` 声明、动态 import 边界、chunk 体积上限写成 lint 规则与 CI 检查。验收标准：新增未声明副作用的模块或超限 chunk 会让 CI 失败并输出文件路径。

### 动手作业

**目标**：写一个能解析 ESM 静态导入、标记未使用导出、输出带 source map 产物的小打包器，并用它构建一个四文件页面。

**步骤**：

1. 准备入口与三个模块：入口引用两个导出，第三个导出无人引用，其中一个模块含顶层 `console.log`。
2. 从入口递归解析 import 语句，产出模块图，节点记录文件路径、源码与静态依赖列表。
3. 从入口遍历模块图，收集被引用的导出名，写入每个模块的 usedExports 集合。
4. 把模块包成工厂函数，用模块 id 与缓存在运行时执行，遇到 import 时调用运行时函数取导出。
5. 对未被引用的导出执行清除，构建结束打印保留与删除的符号清单。
6. 为每行产物生成 mapping，用 Base64 VLQ 编码写进 source map 文件。
7. 在 DevTools 的 Sources 面板打断点，确认能定位回原文件。

**验收标准**：

- 产物在浏览器控制台打印出入口引用的两个导出值，未引用导出的符号名在产物里搜不到。
- 含顶层 `console.log` 的模块被标记为有副作用，函数体保留在产物中。
- 同一构建里重复要求同一个模块 id，工厂函数只执行一次。
- source map 能让 DevTools 把产物某行定位到源文件的对应行与列。
- 对同一份源码连续构建两次，产物字节完全一致。

