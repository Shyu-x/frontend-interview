---
title: "Babel/AST 底层与手写迷你编译器"
description: "parse→transform→generate 与插件机制"
---

# Babel/AST 底层与手写迷你编译器

!!! abstract "核心结论"
- 编译器的三段式骨架是 `parse → transform → generate`：把源码字符串变成 AST（parse），在 AST 上做结构化改写（transform），再把 AST 序列化回源码（generate）。Babel、SWC、esbuild 都遵守这个模型，差异在实现语言与是否暴露 AST 给插件作者。
- 前端编译器拆掉字符串面纱后，本质是两类算法：词法分析是有状态的字符扫描（tokenizer），语法分析是递归下降 + 优先级爬升（Pratt parser 变体）。
- Babel 的插件机制核心非常小：插件就是一个 `{ visitor }` 对象，遍历器在深度优先进入/退出每个节点时调用 visitor 的 `enter/exit`，通过返回新节点或调用 path 方法实现替换、删除、插入。
- 手写迷你编译器最大的坑不是 parser 写不出来，而是 generator 的括号：AST 里没有括号节点，`(a + b) * c` 和 `a + b * c` 的 AST 结构不同，序列化时必须按优先级补括号，否则语义漂移。
- 往返测试（round-trip test）是编译器的最低验收标准：`eval(parse(src))` 与 `eval(generate(parse(src)))` 行为必须一致，可进一步比较 AST 深度相等。

```mermaid
flowchart LR
  A["源码字符串"] --> B["tokenizer 词法分析"]
  B --> C["parser 语法分析"]
  C --> D["AST 节点树"]
  D --> E["traverse 遍历与 visitor 改写"]
  E --> F["generator 代码生成"]
  F --> G["目标源码"]
```

## 1. 编译管线：parse → transform → generate

### 1.1 三个阶段的输入输出

Babel 官方把编译分为三个包：`@babel/parser`（生成 AST）、`@babel/traverse`（遍历与改写）、`@babel/generator`（把 AST 转回代码）。三个阶段的数据结构彻底不同：

| 阶段 | 输入 | 输出 | 核心数据结构 | 典型错误 |
| --- | --- | --- | --- | --- |
| parse | 源码字符串 | AST 节点树 | token、node、Program | SyntaxError |
| transform | 原始 AST | 改写后的 AST | node、path、scope、binding | 遍历时删除节点导致索引错位 |
| generate | AST 节点树 | 目标源码字符串 | 字符串缓冲、precedence 上下文 | 漏括号导致语义改变 |

### 1.2 为什么必须用 AST 而不是字符串替换

一个反例就能说明问题：要移除 `console.log(...)`，正则 `/console\.log\([^)]*\);?/g` 遇到嵌套括号会截断错误（`console.log(fn(a, b))`）；遇到字符串里的 `"console.log(1)"` 会误删；遇到多行调用会失败。字符串替换没有"语法边界"概念。AST 把 `console.log(a, b)` 精确表示为 `CallExpression(MemberExpression(Identifier console, Identifier log), [a, b])`，改造是结构化且可判定的。

### 1.3 手写实现的子集边界

本章手写实现覆盖：数字/字符串/标识符/关键字、二元表达式、函数声明、函数表达式、箭头函数、变量声明、return、import 声明、成员访问与调用、一元运算。不支持（明确声明）：正则字面量、模板字符串、解构、类、async/await、generator、type annotation。这是为了在 600 行内把机制讲透，而不是复刻 Babel。

## 2. 词法分析：手写 tokenizer

### 2.1 实现 `tokenizer.js`

运行环境：Node.js 18+，CommonJS。逻辑是有状态地扫描字符流：每读一个字符判断类型（空白/注释/数字/字符串/标识符/运算符/标点），数字和标识符要贪心读取直到边界；`===`、`!==`、`=>` 这种多字符运算符必须先于单字符匹配。

```javascript
// tokenizer.js
// 运行环境：Node.js 18+，命令：node tokenizer.js
// 把源码字符串切分为 token 数组，每个 token 形如 { type, value, raw? }

function tokenize(source) {
  const tokens = [];
  let i = 0;

  const isDigit = (c) => c >= '0' && c <= '9';
  const isAlpha = (c) => /[A-Za-z_$]/.test(c);
  const isAlphaNumeric = (c) => isAlpha(c) || isDigit(c);

  // 顺序很重要：三个字符的运算符先于两个字符，两个字符先于单字符
  const threeCharOps = ['===', '!=='];
  const twoCharOps = ['=>', '==', '!=', '<=', '>=', '&&', '||'];
  const singleOperators = '+-*/%<>=!';
  const punctuators = '(){}[],.;:?';
  const keywords = new Set([
    'import', 'from', 'function', 'return',
    'const', 'let', 'var', 'true', 'false', 'null',
  ]);

  while (i < source.length) {
    const ch = source[i];

    // 1) 空白
    if (/\s/.test(ch)) { i++; continue; }

    // 2) 行注释
    if (ch === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    // 3) 数字字面量（简化：不支持十六进制与指数，注释说明）
    if (isDigit(ch)) {
      let num = '';
      while (i < source.length && (isDigit(source[i]) || source[i] === '.')) {
        num += source[i];
        i++;
      }
      tokens.push({ type: 'Number', value: Number(num), raw: num });
      continue;
    }

    // 4) 字符串字面量（简化：转义仅原样保留，不做完整 unescape）
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let str = '';
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') {
          str += source[i] + (source[i + 1] || '');
          i += 2;
        } else {
          str += source[i];
          i++;
        }
      }
      i++; // 右引号
      tokens.push({ type: 'String', value: str, raw: quote + str + quote });
      continue;
    }

    // 5) 标识符或关键字
    if (isAlpha(ch)) {
      let id = '';
      while (i < source.length && isAlphaNumeric(source[i])) {
        id += source[i];
        i++;
      }
      tokens.push({
        type: keywords.has(id) ? 'Keyword' : 'Identifier',
        value: id,
      });
      continue;
    }

    // 6) 多字符运算符
    let matched = null;
    for (const op of threeCharOps) {
      if (source.startsWith(op, i)) { matched = op; break; }
    }
    if (!matched) {
      for (const op of twoCharOps) {
        if (source.startsWith(op, i)) { matched = op; break; }
      }
    }
    if (matched) {
      tokens.push({ type: 'Operator', value: matched });
      i += matched.length;
      continue;
    }

    // 7) 单字符运算符
    if (singleOperators.includes(ch)) {
      tokens.push({ type: 'Operator', value: ch });
      i++;
      continue;
    }

    // 8) 标点
    if (punctuators.includes(ch)) {
      tokens.push({ type: 'Punctuator', value: ch });
      i++;
      continue;
    }

    throw new SyntaxError('Unexpected character: ' + ch + ' at position ' + i);
  }

  tokens.push({ type: 'EOF', value: '<eof>' });
  return tokens;
}

module.exports = { tokenize };

// ---- 验证标准：tokenizer ----
if (require.main === module) {
  const assert = require('node:assert');

  const tokens = tokenize('const add = (a, b) => a + b;');
  const kinds = tokens.map((t) => `${t.type}:${t.value}`);

  assert.strictEqual(kinds[0], 'Keyword:const');
  assert.strictEqual(kinds[1], 'Identifier:add');
  assert.strictEqual(kinds[2], 'Operator:=');
  assert.strictEqual(kinds[3], 'Punctuator:(');
  assert.strictEqual(kinds[4], 'Identifier:a');
  assert.strictEqual(kinds[5], 'Punctuator:,');
  assert.strictEqual(kinds[6], 'Identifier:b');
  assert.strictEqual(kinds[7], 'Punctuator:)');
  assert.strictEqual(kinds[8], 'Operator:=>');
  assert.strictEqual(kinds[tokens.length - 1], 'EOF:<eof>');

  const num = tokenize('1.5 + 2');
  assert.strictEqual(num[0].value, 1.5);
  assert.strictEqual(num[2].value, 2);

  console.log('tokenizer tests passed');
  // 预期输出：tokenizer tests passed
}
```

### 2.2 验证标准说明

运行 `node tokenizer.js`，预期 stdout 输出 `tokenizer tests passed`，任何 `assert.strictEqual` 失败都会抛 `AssertionError` 并中断。该测试覆盖：关键字、标识符、多字符 `=>`、单字符 `=`、标点、EOF 标记、浮点数解析。

## 3. 语法分析：递归下降 + 优先级爬升

### 3.1 优先级爬升算法（Pratt parser 变体）

递归下降的二元表达式如果写成"每个优先级一个函数"，会得到十几个几乎一样的函数。优先级爬升用一张优先级表和一个循环替代：

```text
parseBinary(minPrec):
    left = parseUnary()
    loop:
        t = peek()
        prec = PRECEDENCE[t.value]
        if t 不是二元运算符 or prec < minPrec: break
        next()
        right = parseBinary(prec + 1)   # 左结合：+1 阻止右侧吃掉同级运算符
        left = BinaryExpression(t.value, left, right)
    return left
```

关键点：`prec + 1` 实现左结合。以 `a - b - c` 为例，外层 `-` 解析右操作数时调用 `parseBinary(6)`，内层看到第二个 `-` 的优先级 5 小于 minPrec 6，停止，于是结构是 `((a - b) - c)`，与 JS 语义一致。

### 3.2 实现 `parser.js`

完整实现。注意箭头函数是 JS 语法的难点：真实 Babel 用 cover grammar 处理 `(a, b)` 既可能是括号表达式也可能是箭头形参，本实现简化为在 `(` 分支直接向前探测。

```javascript
// parser.js
// 运行环境：Node.js 18+，依赖同目录 tokenizer.js 模块
// 教育用途递归下降 parser：覆盖表达式/函数/箭头函数/import 子集

const { tokenize } = require('./tokenizer');

const PRECEDENCE = {
  '||': 1, '&&': 2,
  '==': 3, '!=': 3, '===': 3, '!==': 3,
  '<': 4, '>': 4, '<=': 4, '>=': 4,
  '+': 5, '-': 5,
  '*': 6, '/': 6, '%': 6,
};

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() { return this.tokens[this.pos]; }
  next() { return this.tokens[this.pos++]; }

  is(type, value) {
    const t = this.peek();
    return t.type === type && (value === undefined || t.value === value);
  }

  expect(type, value) {
    const t = this.peek();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new SyntaxError(
        `Expected ${type}${value ? ' "' + value + '"' : ''}, got ${t.type} "${t.value}"`
      );
    }
    return this.next();
  }

  identifier(name) {
    return { type: 'Identifier', name };
  }

  parseIdentifier() {
    return this.identifier(this.expect('Identifier').value);
  }

  parseProgram() {
    const body = [];
    while (!this.is('EOF')) {
      body.push(this.parseStatement());
    }
    return { type: 'Program', body };
  }

  parseStatement() {
    if (this.is('Keyword', 'const') || this.is('Keyword', 'let') || this.is('Keyword', 'var')) {
      return this.parseVariableDeclaration();
    }
    if (this.is('Keyword', 'return')) {
      return this.parseReturnStatement();
    }
    if (this.is('Keyword', 'function')) {
      return this.parseFunctionDeclaration();
    }
    if (this.is('Keyword', 'import')) {
      return this.parseImportDeclaration();
    }
    if (this.is('Punctuator', '{')) {
      return this.parseBlockStatement();
    }
    const expr = this.parseExpression();
    this.expect('Punctuator', ';');
    return { type: 'ExpressionStatement', expression: expr };
  }

  parseVariableDeclaration() {
    const kind = this.next().value;
    const declarations = [];
    while (true) {
      const declarator = { type: 'VariableDeclarator', id: this.parseIdentifier() };
      if (this.is('Punctuator', '=')) {
        this.next();
        declarator.init = this.parseExpression();
      }
      declarations.push(declarator);
      if (this.is('Punctuator', ',')) { this.next(); continue; }
      break;
    }
    this.expect('Punctuator', ';');
    return { type: 'VariableDeclaration', kind, declarations };
  }

  parseReturnStatement() {
    this.next(); // return
    let argument = null;
    if (!this.is('Punctuator', ';')) {
      argument = this.parseExpression();
    }
    this.expect('Punctuator', ';');
    return { type: 'ReturnStatement', argument };
  }

  parseFunctionDeclaration() {
    this.next(); // function
    const id = this.parseIdentifier();
    const params = this.parseParams();
    const body = this.parseBlockStatement();
    return { type: 'FunctionDeclaration', id, params, body };
  }

  parseFunctionExpression() {
    this.next(); // function
    let id = null;
    if (!this.is('Punctuator', '(')) {
      id = this.parseIdentifier();
    }
    const params = this.parseParams();
    const body = this.parseBlockStatement();
    return { type: 'FunctionExpression', id, params, body };
  }

  parseBlockStatement() {
    this.expect('Punctuator', '{');
    const body = [];
    while (!this.is('Punctuator', '}')) {
      body.push(this.parseStatement());
    }
    this.expect('Punctuator', '}');
    return { type: 'BlockStatement', body };
  }

  parseParams() {
    this.expect('Punctuator', '(');
    const params = [];
    if (!this.is('Punctuator', ')')) {
      while (true) {
        params.push(this.parseIdentifier());
        if (this.is('Punctuator', ',')) { this.next(); continue; }
        break;
      }
    }
    this.expect('Punctuator', ')');
    return params;
  }

  parseImportDeclaration() {
    this.next(); // import
    if (this.is('Punctuator', '{')) {
      this.next();
      const specifiers = [];
      while (!this.is('Punctuator', '}')) {
        specifiers.push({ type: 'ImportSpecifier', local: this.parseIdentifier() });
        if (this.is('Punctuator', ',')) { this.next(); continue; }
        break;
      }
      this.expect('Punctuator', '}');
      this.expect('Keyword', 'from');
      const source = this.parseStringLiteral();
      this.expect('Punctuator', ';');
      return { type: 'ImportDeclaration', specifiers, source };
    }
    const local = this.parseIdentifier();
    this.expect('Keyword', 'from');
    const source = this.parseStringLiteral();
    this.expect('Punctuator', ';');
    return {
      type: 'ImportDeclaration',
      specifiers: [{ type: 'ImportDefaultSpecifier', local }],
      source,
    };
  }

  parseStringLiteral() {
    const t = this.expect('String');
    return { type: 'Literal', value: t.value, raw: t.raw };
  }

  parseExpression() {
    const expr = this.parseBinary(0);
    if (this.is('Operator', '=>')) {
      if (expr.type !== 'Identifier') {
        throw new SyntaxError('Arrow function with bare param must be a single identifier');
      }
      this.next();
      return this.parseArrowBody([expr]);
    }
    return expr;
  }

  parseArrowBody(params) {
    if (this.is('Punctuator', '{')) {
      return {
        type: 'ArrowFunctionExpression',
        params,
        body: this.parseBlockStatement(),
        expression: false,
      };
    }
    const body = this.parseExpression();
    return { type: 'ArrowFunctionExpression', params, body, expression: true };
  }

  parseBinary(minPrec) {
    let left = this.parseUnary();
    while (true) {
      const t = this.peek();
      const prec = PRECEDENCE[t.value];
      if (t.type !== 'Operator' || prec === undefined || prec < minPrec) break;
      this.next();
      const right = this.parseBinary(prec + 1); // 左结合关键
      left = { type: 'BinaryExpression', operator: t.value, left, right };
    }
    return left;
  }

  parseUnary() {
    const t = this.peek();
    if (t.type === 'Operator' && (t.value === '!' || t.value === '-' || t.value === '+')) {
      this.next();
      return {
        type: 'UnaryExpression',
        operator: t.value,
        argument: this.parseUnary(),
        prefix: true,
      };
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parsePrimary();
    while (true) {
      if (this.is('Punctuator', '.')) {
        this.next();
        const prop = this.parseIdentifier();
        expr = { type: 'MemberExpression', object: expr, property: prop, computed: false };
      } else if (this.is('Punctuator', '(')) {
        this.next();
        const args = [];
        if (!this.is('Punctuator', ')')) {
          while (true) {
            args.push(this.parseExpression());
            if (this.is('Punctuator', ',')) { this.next(); continue; }
            break;
          }
        }
        this.expect('Punctuator', ')');
        expr = { type: 'CallExpression', callee: expr, arguments: args };
      } else {
        break;
      }
    }
    return expr;
  }

  parsePrimary() {
    const t = this.peek();
    if (t.type === 'Number') {
      this.next();
      return { type: 'Literal', value: t.value, raw: t.raw };
    }
    if (t.type === 'String') {
      this.next();
      return { type: 'Literal', value: t.value, raw: t.raw };
    }
    if (t.type === 'Keyword' && (t.value === 'true' || t.value === 'false' || t.value === 'null')) {
      this.next();
      const v = t.value === 'true' ? true : t.value === 'false' ? false : null;
      return { type: 'Literal', value: v, raw: t.value };
    }
    if (t.type === 'Identifier') {
      this.next();
      return { type: 'Identifier', name: t.value };
    }
    if (this.is('Keyword', 'function')) {
      return this.parseFunctionExpression();
    }
    if (this.is('Punctuator', '(')) {
      return this.parseParenOrArrow();
    }
    throw new SyntaxError('Unexpected token in primary position: ' + JSON.stringify(t));
  }

  parseParenOrArrow() {
    this.next(); // (
    if (this.is('Punctuator', ')')) {
      this.next();
      if (this.is('Operator', '=>')) {
        this.next();
        return this.parseArrowBody([]);
      }
      throw new SyntaxError('Empty parenthesized expression is not supported');
    }

    const first = this.parseExpression();

    if (this.is('Punctuator', ',')) {
      if (first.type !== 'Identifier') {
        throw new SyntaxError('Arrow function params must be identifiers');
      }
      const params = [first];
      while (this.is('Punctuator', ',')) {
        this.next();
        const p = this.parseExpression();
        if (p.type !== 'Identifier') {
          throw new SyntaxError('Arrow function params must be identifiers');
        }
        params.push(p);
      }
      this.expect('Punctuator', ')');
      if (this.is('Operator', '=>')) {
        this.next();
        return this.parseArrowBody(params);
      }
      throw new SyntaxError('Comma expression is not supported by this mini parser');
    }

    this.expect('Punctuator', ')');
    if (this.is('Operator', '=>')) {
      if (first.type !== 'Identifier') {
        throw new SyntaxError('Arrow function param must be a single identifier');
      }
      this.next();
      return this.parseArrowBody([first]);
    }
    return first; // 普通括号表达式
  }
}

function parse(source) {
  return new Parser(tokenize(source)).parseProgram();
}

module.exports = { parse, Parser, PRECEDENCE };

// ---- 验证标准：parser ----
if (require.main === module) {
  const assert = require('node:assert');

  const ast = parse('const add = (a, b) => a + b; add(1, 2);');
  assert.strictEqual(ast.type, 'Program');
  assert.strictEqual(ast.body.length, 2);
  assert.strictEqual(ast.body[0].type, 'VariableDeclaration');
  assert.strictEqual(ast.body[0].declarations[0].init.type, 'ArrowFunctionExpression');
  assert.strictEqual(ast.body[0].declarations[0].init.params.length, 2);
  assert.strictEqual(ast.body[1].type, 'ExpressionStatement');
  assert.strictEqual(ast.body[1].expression.type, 'CallExpression');
  assert.strictEqual(ast.body[1].expression.callee.type, 'Identifier');
  assert.strictEqual(ast.body[1].expression.arguments.length, 2);

  // 优先级：a + b * c 的 AST 必须是 +(a, *(b, c))
  const binary = parse('a + b * c;').body[0].expression;
  assert.strictEqual(binary.operator, '+');
  assert.strictEqual(binary.right.type, 'BinaryExpression');
  assert.strictEqual(binary.right.operator, '*');

  // 括号：优先级被显式改变
  const parenExpr = parse('(a + b) * c;').body[0].expression;
  assert.strictEqual(parenExpr.operator, '*');
  assert.strictEqual(parenExpr.left.type, 'BinaryExpression');
  assert.strictEqual(parenExpr.left.operator, '+');

  // 左结合：a - b - c 必须是 -(-(a, b), c)
  const leftAssoc = parse('a - b - c;').body[0].expression;
  assert.strictEqual(leftAssoc.left.type, 'BinaryExpression');
  assert.strictEqual(leftAssoc.left.operator, '-');

  console.log('parser tests passed');
  // 预期输出：parser tests passed
}
```

### 3.3 验证标准说明

运行 `node parser.js`，预期输出 `parser tests passed`。测试覆盖：Program 结构、变量声明的箭头函数 init、表达式语句的 CallExpression、乘法高于加法的优先级、括号改变优先级、同优先级左结合。若 parser 逻辑错误（如优先级表写反），`assert.strictEqual` 会立刻暴露。

## 4. AST 节点规范：ESTree 与 Babel AST

### 4.1 核心节点字段约定

前端工具链普遍以 ESTree 为基础：每个节点是普通对象，有 `type` 字段区分种类，child 字段依据 `VISITOR_KEYS` 递归。手写层只需遵守"结构稳定 + 遍历键可枚举"即可与 Babel 的核心思想对接。Babel 7 的 AST 与 ESTree 有命名差异，这是真实面试细节：

| 概念 | ESTree | Babel 7 实际节点 | 字段差异 |
| --- | --- | --- | --- |
| 数字/字符串/布尔 | 统一 `Literal` | `NumericLiteral`、`StringLiteral`、`BooleanLiteral`、`NullLiteral` | ESTree 用 `value` 区分，Babel 拆成独立 type |
| 箭头函数 | `ArrowFunctionExpression` | 同名 | Babel 多 `expression: boolean` 字段 |
| import 声明 | `ImportDeclaration` | 同名 | specifiers 结构一致 |
| 属性访问 | `MemberExpression` | 同名（`OptionalMemberExpression` 拆分可选链） | `computed` 区分点号与括号 |
| 代码文件根 | `Program` | `File` 包含 `program` 字段 | Babel 外层多 File 节点 |

Babel 8 计划向 ESTree 靠拢（统一 Literal 等），该信息需以官方 migration guide 为准，面试时建议回答"Babel 7 目前拆分字面量节点"。

### 4.2 为什么 AST 是"可编程编译器"的核心

AST 让编译器可以挂任意钩子。Babel 的插件写作者得到的是 `path`，它同时引用 `node`（当前节点）、`parent`（父节点）、`scope`（作用域信息）、`hub`，以及 `replaceWith`、`remove`、`insertBefore` 等操作。手写迷你版用一个函数参数对 `(node, parent, key, index)` 逼近同一模型，教学价值在于：替换与删除最终都是修改父节点上的引用。

## 5. 遍历、visitor 与作用域分析

### 5.1 实现 `traverse.js`

```javascript
// traverse.js
// 运行环境：Node.js 18+，依赖 parser.js 提供的 AST
// 深度优先遍历 + enter/exit visitor + 符号化删除

const REMOVE = Symbol('remove');

const VISITOR_KEYS = {
  Program: ['body'],
  BlockStatement: ['body'],
  ExpressionStatement: ['expression'],
  VariableDeclaration: ['declarations'],
  VariableDeclarator: ['id', 'init'],
  FunctionDeclaration: ['id', 'params', 'body'],
  FunctionExpression: ['id', 'params', 'body'],
  ArrowFunctionExpression: ['params', 'body'],
  ReturnStatement: ['argument'],
  BinaryExpression: ['left', 'right'],
  UnaryExpression: ['argument'],
  CallExpression: ['callee', 'arguments'],
  MemberExpression: ['object', 'property'],
  ImportDeclaration: ['specifiers', 'source'],
  ImportSpecifier: ['local'],
  ImportDefaultSpecifier: ['local'],
  Identifier: [],
  Literal: [],
};

function traverse(ast, visitors) {
  function visit(node, parent, key, index) {
    if (!node || typeof node !== 'object') return node;
    const visitor = visitors[node.type] || {};
    let current = node;

    if (visitor.enter) {
      const r = visitor.enter(current, parent, key, index);
      if (r !== undefined) current = r;
    }
    if (visitors.enter) {
      const r = visitors.enter(current, parent, key, index);
      if (r !== undefined) current = r;
    }

    const keys = VISITOR_KEYS[current.type] || [];
    for (const k of keys) {
      const child = current[k];
      if (Array.isArray(child)) {
        for (let i = 0; i < child.length; i++) {
          const old = child[i];
          const newChild = visit(old, current, k, i);
          if (newChild === REMOVE) {
            child.splice(i, 1);
            i--;
          } else if (newChild !== old) {
            child[i] = newChild;
          }
        }
      } else if (child && typeof child === 'object') {
        const old = child;
        const newChild = visit(old, current, k, null);
        if (newChild === REMOVE) {
          current[k] = null;
        } else if (newChild !== old) {
          current[k] = newChild;
        }
      }
    }

    let out = current;
    if (visitor.exit) {
      const r = visitor.exit(out, parent, key, index);
      if (r === REMOVE) return REMOVE;
      if (r !== undefined) out = r;
    }
    if (visitors.exit) {
      const r = visitors.exit(out, parent, key, index);
      if (r === REMOVE) return REMOVE;
      if (r !== undefined) out = r;
    }
    return out;
  }

  visit(ast, null, null, null);
  return ast;
}

// ---- 作用域与绑定分析 ----
function analyzeScope(ast) {
  const scopes = [];
  const stack = [];

  function newScope(type) {
    const scope = {
      type,
      parent: stack.length ? stack[stack.length - 1] : null,
      bindings: new Map(),
    };
    scopes.push(scope);
    return scope;
  }

  function currentScope() {
    return stack[stack.length - 1];
  }

  function declare(name, node, kind) {
    const scope = currentScope();
    if (!scope.bindings.has(name)) {
      scope.bindings.set(name, { name, node, kind, references: [] });
    }
  }

  function reference(name, node) {
    for (let idx = stack.length - 1; idx >= 0; idx--) {
      const binding = stack[idx].bindings.get(name);
      if (binding) {
        binding.references.push(node);
        return binding;
      }
    }
    return null; // 全局未解析引用
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
      case 'Program':
        stack.push(newScope('program'));
        node.body.forEach(walk);
        stack.pop();
        return;

      case 'FunctionDeclaration':
        declare(node.id.name, node, 'function'); // 函数名绑定在当前作用域
        stack.push(newScope('function'));
        node.params.forEach((p) => declare(p.name, p, 'param'));
        walk(node.body);
        stack.pop();
        return;

      case 'FunctionExpression':
        if (node.id) declare(node.id.name, node, 'function');
        stack.push(newScope('function'));
        node.params.forEach((p) => declare(p.name, p, 'param'));
        walk(node.body);
        stack.pop();
        return;

      case 'ArrowFunctionExpression':
        stack.push(newScope('function'));
        node.params.forEach((p) => declare(p.name, p, 'param'));
        walk(node.body);
        stack.pop();
        return;

      case 'VariableDeclaration':
        node.declarations.forEach((d) => declare(d.id.name, d, 'var'));
        node.declarations.forEach((d) => walk(d.init));
        return;

      case 'Identifier':
        reference(node.name, node);
        return;

      case 'Literal':
        return;

      default:
        for (const k of VISITOR_KEYS[node.type] || []) {
          const child = node[k];
          if (Array.isArray(child)) {
            child.forEach(walk);
          } else if (child && typeof child === 'object') {
            walk(child);
          }
        }
    }
  }

  walk(ast);
  return scopes;
}

module.exports = { traverse, analyzeScope, REMOVE };

// ---- 验证标准：traverse 与 scope ----
if (require.main === module) {
  const assert = require('node:assert');
  const { parse } = require('./parser');

  const ast = parse('function outer(a, b) { const t = a + b; return t; }');
  const scopes = analyzeScope(ast);

  assert.strictEqual(scopes.length, 2); // program + function
  assert.strictEqual(scopes[0].type, 'program');
  assert.strictEqual(scopes[1].type, 'function');
  assert.ok(scopes[1].bindings.has('a'));
  assert.ok(scopes[1].bindings.has('t'));
  assert.strictEqual(scopes[1].bindings.get('t').references.length, 1);

  console.log('traverse/scope tests passed');
  // 预期输出：traverse/scope tests passed
}
```

### 5.2 作用域分析的简化取舍

真正的 Babel scope 分为 `scope.crawl()` 与 `binding.path` 系列 API，处理 var 提升、块级作用域、函数名自引用等。这里的手写版是单遍父子栈模型：进入 `Program`/`Function*` 建立新作用域，参数与 `var` 统一 `declare`，`Identifier` 沿作用域链查找 `reference`。它足以支撑 no-unused-vars 检查，但不处理块级作用域（`let` 在大括号内），这是与 Babel 的真实差距，不是缺陷而是边界声明。

## 6. 手写插件实战

### 6.1 实现 `plugins.js`

四个插件放在一个文件里，依赖 parser 与 traverse。每个插件都是"入 AST、出 AST"（lint 出报告数组），与 Babel 插件的纯函数心智一致。

```javascript
// plugins.js
// 运行环境：Node.js 18+，依赖 tokenizer.js / parser.js / traverse.js
// 四个教学插件：箭头函数转换、console 移除、按需 import 重写、lint 检查

const { traverse, analyzeScope, REMOVE } = require('./traverse');
const { parse } = require('./parser');

// 插件 1：箭头函数转普通函数，this 语义丢失（教学简化，真实 Babel 会做 this 捕获）
function arrowToFunction(ast) {
  traverse(ast, {
    ArrowFunctionExpression: {
      enter(node) {
        const body =
          node.expression && node.body.type !== 'BlockStatement'
            ? { type: 'BlockStatement', body: [{ type: 'ReturnStatement', argument: node.body }] }
            : node.body;
        return { type: 'FunctionExpression', id: null, params: node.params, body };
      },
    },
  });
  return ast;
}

// 插件 2：移除 console.* 表达式语句
function removeConsole(ast) {
  traverse(ast, {
    ExpressionStatement: {
      exit(node) {
        const e = node.expression;
        if (
          e && e.type === 'CallExpression' &&
          e.callee && e.callee.type === 'MemberExpression' &&
          e.callee.object && e.callee.object.type === 'Identifier' &&
          e.callee.object.name === 'console'
        ) {
          return REMOVE;
        }
      },
    },
  });
  return ast;
}

// 插件 3：按需引入 import 重写
// 把 import { Button, Input } from 'ui-lib'; 改写为：
//   import Button from 'ui-lib/button';
//   import Input from 'ui-lib/input';
function importRewrite(ast, options) {
  const { libraryName = 'ui-lib', toPath = (name) => name.toLowerCase() } = options || {};
  function rewriteBody(body) {
    const out = [];
    for (const stmt of body) {
      if (
        stmt.type === 'ImportDeclaration' &&
        stmt.source.value === libraryName &&
        stmt.specifiers.length > 0 &&
        stmt.specifiers.every((s) => s.type === 'ImportSpecifier')
      ) {
        for (const s of stmt.specifiers) {
          out.push({
            type: 'ImportDeclaration',
            specifiers: [{ type: 'ImportDefaultSpecifier', local: s.local }],
            source: {
              type: 'Literal',
              value: libraryName + '/' + toPath(s.local.name),
            },
          });
        }
      } else {
        out.push(stmt);
      }
    }
    return out;
  }
  ast.body = rewriteBody(ast.body);
  return ast;
}

// 插件 4：ESLint 规则风格检查，返回报告数组
function lint(ast, rules = {}) {
  const reports = [];

  if (rules['no-console']) {
    traverse(ast, {
      CallExpression: {
        enter(node) {
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'console'
          ) {
            reports.push({
              ruleId: 'no-console',
              message: 'Unexpected console statement.',
            });
          }
        },
      },
    });
  }

  if (rules['no-unused-vars']) {
    const scopes = analyzeScope(ast);
    for (const scope of scopes) {
      for (const binding of scope.bindings.values()) {
        if (binding.references.length === 0) {
          reports.push({
            ruleId: 'no-unused-vars',
            message: `'${binding.name}' is defined but never used.`,
          });
        }
      }
    }
  }

  return reports;
}

module.exports = { arrowToFunction, removeConsole, importRewrite, lint };

// ---- 验证标准：plugins ----
if (require.main === module) {
  const assert = require('node:assert');
  const { generate } = require('./generator');

  // 箭头函数转换
  const arrowAST = parse('const add = (a, b) => a + b;');
  arrowToFunction(arrowAST);
  const arrowCode = generate(arrowAST);
  assert.ok(arrowCode.includes('function'));
  assert.ok(arrowCode.includes('return a + b'));

  // console 移除
  const consoleAST = parse('console.log(1); const x = 2;');
  removeConsole(consoleAST);
  assert.strictEqual(consoleAST.body.length, 1);
  assert.strictEqual(consoleAST.body[0].type, 'VariableDeclaration');

  // import 重写
  const importAST = parse("import { Button, Input } from 'ui-lib';");
  importRewrite(importAST, {
    libraryName: 'ui-lib',
    toPath: (name) => name.toLowerCase(),
  });
  assert.strictEqual(importAST.body.length, 2);
  assert.strictEqual(importAST.body[0].source.value, 'ui-lib/button');
  assert.strictEqual(importAST.body[0].specifiers[0].type, 'ImportDefaultSpecifier');
  assert.strictEqual(importAST.body[1].source.value, 'ui-lib/input');

  // lint
  const lintAST = parse('const unused = 1; console.log(2);');
  const reports = lint(lintAST, { 'no-console': true, 'no-unused-vars': true });
  assert.strictEqual(reports.length, 2);
  assert.ok(reports.some((r) => r.ruleId === 'no-console'));
  assert.ok(reports.some((r) => r.ruleId === 'no-unused-vars'));

  console.log('plugins tests passed');
  // 预期输出：plugins tests passed
}
```

### 6.2 插件 1 与真实 Babel 的关键差异

真实的 `@babel/plugin-transform-arrow-functions` 必须处理箭头函数的 `this`：箭头函数不绑定 `this`，转换后会出现 `this` 指向错误。Babel 的解法是把外层 `this` 提前到 `_this` 变量，再把箭头函数体内的 `this` 引用替换为 `_this`。手写版只做语法形状转换，不处理 `this`，所以输入 `const f = () => this.x` 经本插件转换后运行会得到不同的 `this`，这是刻意保留的教学边界，实际使用时绝不能把本插件当生产工具。

### 6.3 插件 2 的删除实现为什么用 exit

`removeConsole` 在 `ExpressionStatement` 的 exit 里返回 `REMOVE`。用 exit 而不是 enter 的原因：如果 enter 就删除父节点的子元素，遍历器的索引 `i` 会跳跃，导致相邻的 console 语句被漏删。exit 阶段先让子节点全部遍历完，再从父节点 splice 掉自身，索引由 while 循环自减 `i--` 修正，才会稳定。

## 7. code generator 与往返验证

### 7.1 实现 `generator.js`

```javascript
// generator.js
// 运行环境：Node.js 18+，依赖 parser.js 的 PRECEDENCE 表
// 把 AST 序列化回源码，核心是按优先级补括号

const { PRECEDENCE } = require('./parser');

function generate(node, parentPrec = 0) {
  switch (node.type) {
    case 'Program':
      return node.body.map((stmt) => generate(stmt, 0)).join('\n');

    case 'BlockStatement':
      if (node.body.length === 0) return '{}';
      return '{\n' + node.body.map((s) => '  ' + generate(s, 0)).join('\n') + '\n}';

    case 'ExpressionStatement':
      return generate(node.expression, 0) + ';';

    case 'VariableDeclaration': {
      const declarators = node.declarations.map((d) => {
        let s = generate(d.id, 0);
        if (d.init) s += ' = ' + generate(d.init, 0);
        return s;
      });
      return node.kind + ' ' + declarators.join(', ') + ';';
    }

    case 'VariableDeclarator':
      return generate(node.id, 0) + (node.init ? ' = ' + generate(node.init, 0) : '');

    case 'FunctionDeclaration':
      return 'function ' + generate(node.id, 0) +
        '(' + node.params.map((p) => generate(p, 0)).join(', ') + ') ' +
        generate(node.body, 0);

    case 'FunctionExpression':
      return 'function ' +
        (node.id ? generate(node.id, 0) + ' ' : '') +
        '(' + node.params.map((p) => generate(p, 0)).join(', ') + ') ' +
        generate(node.body, 0);

    case 'ArrowFunctionExpression': {
      const params = node.params.map((p) => generate(p, 0)).join(', ');
      const paramStr =
        node.params.length === 1 && node.params[0].type === 'Identifier'
          ? params
          : '(' + params + ')';
      return paramStr + ' => ' + generate(node.body, 0);
    }

    case 'ReturnStatement':
      return 'return' + (node.argument ? ' ' + generate(node.argument, 0) : '') + ';';

    case 'BinaryExpression': {
      const prec = PRECEDENCE[node.operator] ?? 0;
      // 关键：左操作数同优先级不加括号（左结合），右操作数优先级更低则加括号
      const left = generate(node.left, prec);
      const right = generate(node.right, prec + 1);
      const expr = left + ' ' + node.operator + ' ' + right;
      return prec < parentPrec ? '(' + expr + ')' : expr;
    }

    case 'UnaryExpression':
      return node.operator + generate(node.argument, 0);

    case 'CallExpression':
      return generate(node.callee, 0) +
        '(' + node.arguments.map((a) => generate(a, 0)).join(', ') + ')';

    case 'MemberExpression':
      if (node.computed) {
        return generate(node.object, 0) + '[' + generate(node.property, 0) + ']';
      }
      return generate(node.object, 0) + '.' + generate(node.property, 0);

    case 'Identifier':
      return node.name;

    case 'Literal':
      if (typeof node.value === 'string') return JSON.stringify(node.value);
      return String(node.value);

    case 'ImportDeclaration': {
      if (node.specifiers.length === 1 && node.specifiers[0].type === 'ImportDefaultSpecifier') {
        return 'import ' + generate(node.specifiers[0].local, 0) +
          ' from ' + generate(node.source, 0) + ';';
      }
      const names = node.specifiers.map((s) => generate(s.local, 0)).join(', ');
      return 'import { ' + names + ' } from ' + generate(node.source, 0) + ';';
    }

    case 'ImportSpecifier':
    case 'ImportDefaultSpecifier':
      return generate(node.local, 0);

    default:
      throw new Error('Cannot generate node type: ' + node.type);
  }
}

module.exports = { generate };

// ---- 验证标准：generator 与往返测试 ----
if (require.main === module) {
  const assert = require('node:assert');
  const { parse } = require('./parser');

  function evalCode(code) {
    return new Function('return ' + code)();
  }

  // 往返测试 1：纯表达式括号保持
  const expr1 = parse('(a + b) * c;');
  const code1 = generate(expr1);
  assert.strictEqual(code1, '(a + b) * c;');
  assert.strictEqual(evalCode('(a + b) * c'), evalCode(code1.replace(/;$/, '')));

  // 往返测试 2：优先级语义
  const expr2 = parse('1 + 2 * 3;');
  assert.strictEqual(generate(expr2), '1 + 2 * 3;');
  assert.strictEqual(evalCode('1 + 2 * 3'), 7);

  // 往返测试 3：箭头函数保持可运行
  const arrowSrc = '((a, b) => a * b)(6, 7);';
  const arrowAST = parse(arrowSrc);
  const arrowCode = generate(arrowAST);
  assert.strictEqual(evalCode('((a, b) => a * b)(6, 7)'), 42);
  assert.strictEqual(evalCode(arrowCode.replace(/;$/, '')), 42);

  // 往返测试 4：函数表达式
  const fnSrc = '(function (x) { return x + 1; })(41);';
  const fnCode = generate(parse(fnSrc));
  assert.strictEqual(evalCode(fnCode.replace(/;$/, '')), 42);

  console.log('generator/roundtrip tests passed');
  // 预期输出：generator/roundtrip tests passed
}
```

### 7.2 往返测试正确性的依据

`new Function('return ' + code)()` 用 JS 引擎动态求值，避免 `eval` 的词法作用域污染。测试 1 证明括号从 AST 重新生成而非被丢弃（`(a + b) * c` 的 AST 里左子树是 `+`，生成器必须补括号）；测试 3 证明 `parse → generate` 后的代码运行时行为与原代码一致（42）；测试 4 证明函数表达式路径可工作。这套测试就是编译器的"往返验证标准"。

## 8. Babel 与 SWC / esbuild 对比

### 8.1 架构与性能差异

三者的核心区别不在编译算法，而在运行时形态与插件生态。SWC 用 Rust 写，编译成 native binary，多核并行；esbuild 用 Go 写，同样 native，并行度极高；Babel 用 JavaScript 写，跑在 Node 单线程上。对同一份大型代码做 transform，esbuild 与 SWC 通常比 Babel 快一到两个数量级。代价是 Babel 的 AST 直接在 JS 里暴露，插件在语法与语义层面都能精细控制；esbuild 插件主要在 build 阶段的 `onLoad/onResolve` 层面运行（做 JS AST 重写不现实，需核对官方文档确认当前能力）；SWC 提供实验性 plugin，写起来更接近 Babel 但生态成熟度不如 Babel。

| 维度 | Babel | SWC | esbuild |
| --- | --- | --- | --- |
| 实现语言 | JavaScript | Rust | Go |
| 运行模型 | Node.js 单线程 | native binary，并行 | native binary，并行 |
| 相对速度（同一大型 transform） | 1x 基线 | 通常 10x-100x 量级 | 通常 10x-100x 量级 |
| AST 暴露程度 | 完全暴露给插件 | 部分（实验性 plugin） | 基本不暴露 JS AST |
| 插件生态 | 最丰富、最成熟 | 生长中 | 构建层插件为主 |
| 手写插件学习成本 | 低（JS 同语言） | 中（需了解 wasm/实验 API） | 低（onLoad/onResolve 回调） |
| 典型定位 | 复杂特性转换、自定义代码改写 | 生产构建默认编译器替代 | 生产构建极速打包 |

数据与版本相关结论应结合官方 benchmark 自测，"一到两个数量级"是社区普遍观察量级，具体倍率随项目与缓存策略浮动，需以实际评测为准。

### 8.2 什么时候选 Babel 而不是更快方案

需要自定义 AST 级改写时必须选 Babel：例如按需引入重写、埋点插桩、自定义宏、ESLint 同构检查。工程上常见的折中是"开发用 SWC/esbuild 做转译，生产构建用 Babel 处理插件丰富度要求高的链路"，或用 `@swc/core` 的 parser 结合自定义逻辑替代 Babel parser 获得速度。

## 9. 常见陷阱

1. **generator 漏括号导致语义漂移**。AST 不存括号，序列化必须按优先级补括号。手写 generator 若不做 `parentPrec` 比较，`(a + b) * c` 会被输出成 `a + b * c`，语义完全不同。往返测试可第一时间暴露。
2. **箭头函数转换丢 this**。`() => this.x` 转成 `function () { return this.x; }` 后 this 指向调用者。真实 Babel 用 `_this` 捕获外层 this；手写版必须声明"不处理 this"。
3. **遍历中删除节点导致索引错位**。在 enter 里直接 splice 父节点 body 数组，会让下一次循环跳过相邻元素。正确做法是 exit 删除或自减索引。
4. **tokenizer 对 `/` 的歧义**。JS 中 `/` 既是除号又是正则起始符（`/ab+c/`），只有 parser 上下文能判定。手写 tokenizer 完全不支持正则字面量，否则 `a / b / c` 与 `function f() { return /x/.test(s); }` 无法区分。真实 Babel 用 reScan 机制在 parser 提示下重扫。
5. **var 提升在 scope 分析中容易漏**。`var` 绑定属于函数作用域而非块作用域，手写简化版把 `let/const/var` 统一 declare 到当前作用域，对含块级作用域的代码会误报。面试要主动指出这个边界。
6. **import 重写的副作用**。按需引入改写若模块库没有 `package.json` 的 `sideEffects` 标记，被 tree-shaking 后会丢失 CSS 等副作用代码。实际使用 babel-plugin-import 时要确认目标库是否支持。
7. **`new Function` 与 `eval` 的作用域差异**。`eval` 在严格模式下不会把 `const` 泄漏到外层，且受宿主作用域影响；`new Function` 只访问全局作用域，是更干净的 round-trip 执行器。
8. **AST 节点替换后仍使用旧 visitor key**。迷你 traverse 在进入节点先用原类型取 visitor，若 enter 把 `BinaryExpression` 替换成 `CallExpression`，后续子遍历仍用旧 key 表。真实 Babel 用 `path` 对象处理 SKIP/REPLACE 语义，更完整。

## 10. 面试题与答题要点

**题 1：Babel 的工作流程是什么？**
要点：三阶段 parse → transform → generate。parse 产出 AST（Babel 7 的 AST 是扩展版 ESTree）；transform 用 visitor 遍历改写；generate 序列化回源码。追问则答：`@babel/parser` 编译原理是词法 + 语法分析，核心是 tokenizer 扫描与递归下降/优先级爬升。

**题 2：优先级爬升如何实现左结合？**
要点：核心循环 `left = parseBinary(prec + 1)`，同优先级运算符在右操作数递归里因 `prec < minPrec` 停住，把同级运算符留在外面，形成左结合树。`a - b - c` 得到 `-(-(a,b),c)`。给一张优先级表即可复现。

**题 3：为什么 Babel 的 AST 与 ESTree 不完全一样？**
要点：ESTree 是社区最小公共规范，Babel 需要表达更多语法（import/export、JSX、类型注解），同时 Babel 7 把 `Literal` 拆成 `NumericLiteral`/`StringLiteral` 等细分节点，便于工具链处理。Babel 8 计划向 ESTree 靠拢（该结论以官方 migration guide 为准）。

**题 4：Babel 插件如何修改 AST？**
要点：插件返回 `{ visitor }`，遍历器在进入/退出节点时调用 `enter/exit`。真正的插件拿到 `path` 对象，用 `path.replaceWith`、`path.remove`、`path.traverse` 操作。path 是节点 + 父指针 + scope 的封装，替换的本质是修改父节点对子节点的引用。

**题 5：plugin 与 preset 的区别及执行顺序？**
要点：plugin 是单个转换器，preset 是 plugin 的集合（数组或函数）。执行顺序：plugins 按声明顺序从前往后，presets 从后往前（先声明后执行）。同一个文件里 plugin 先于 preset。追问可答：preset 通常封装一组相关转换，如 `preset-env` 根据 targets 动态计算需要的 plugin 列表。

**题 6：esbuild/SWC 为什么比 Babel 快？**
要点：原生语言（Go/Rust）无 JS 对象分配开销；编译成独立二进制，多核并行；esbuild 内部全流程不产生可观测的 JS AST，减少中间对象。代价是插件能力受限。结合项目规模与插件需求谈选型。

**题 7：如何验证一个手写编译器的正确性？**
要点：往返测试 `parse → generate → eval` 与原代码 eval 行为一致；对转换插件要额外测语义断言（如箭头转换后 this 捕获）；最后是项目级快照测试。语言层面可选 property-based testing：随机生成表达式，比较原式与重生成的运行时结果。

**题 8：手写 tokenizer 要不要支持正则字面量？**
要点：正则与除法在词法层存在歧义（`a / b` vs `/re/`），需要 parser 上下文提示。教学手写器通常声明"不支持正则"。追问可答 Babel 的 reScan 机制：tokenizer 先按除法扫描，parser 遇到 `(` 前是表达式开始则触发重扫为正则。

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [ESTree 规范](https://github.com/estree/estree) | JavaScript AST 的权威节点定义，手写规则时当字典查。 | 遇到节点先查其类型与字段；读完对照 AST Explorer 的 ESTree 输出验证字段名。 |
| [Babel 文档](https://babeljs.io/docs/) | 官方说明转译与 polyfill 机制，理清 preset 与插件的关系。 | 读配置与 preset 章节，带着语法转换和 API 补充分别由谁负责的问题读。 |
| [esbuild 文档](https://esbuild.github.io/) | 了解 esbuild 的 transform 与插件 API，对比 Babel 的取舍。 | 读 transform 与 plugins 两节，思考它为何不暴露完整 AST 操作能力。 |
| [SWC 文档](https://swc.rs/docs/getting-started) | SWC 官方文档，了解 Rust 编译器如何做转译与插件。 | 读配置与插件章节，把 .swcrc 与 babel.config.js 的等价配置列成对照表。 |
| [Babel preset-env](https://babeljs.io/docs/babel-preset-env) | 观察 targets 变化如何改变输出，理解语法降级的边界。 | 用不同 targets 编译同一段含可选链的代码，对比输出并记录差异原因。 |
| [Babel 插件列表](https://babeljs.io/docs/plugins) | 插件列表按语法特性分类，快速定位某个转换由谁实现。 | 按需检索某个语法特性对应的插件，再点进其源码看 visitor 写法。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [the-super-tiny-compiler](https://github.com/jamiebuilds/the-super-tiny-compiler) | 极简编译器源码，一次讲清 tokenizer、parser、codegen 全链路。 | 逐行读 the-super-tiny-compiler.js，手抄一遍跑通测试，再改它支持一条新语法。 |
| [AST Explorer](https://astexplorer.net/) | 实时切换 parser，对比 Babel、ESTree、TS 的 AST 结构差异。 | 贴入同一段代码切换多个 parser，记录同一语法节点的字段差异与原因。 |
| [esbuild](https://github.com/evanw/esbuild) | esbuild 源码仓库，架构文档可对照实现细节一起读。 | 先读 docs/architecture.md，再挑 lexer 或 printer 目录粗读关键实现。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Babel Handbook](https://github.com/jamiebuilds/babel-handbook) | 插件手册讲透 visitor 遍历与节点操作，是写转换插件的起点。 | 通读 Plugin Handbook，带着访问者何时进入/退出节点的问题；读完写一个删除 console.log 的插件。 |
| [esbuild 架构说明](https://github.com/evanw/esbuild/blob/main/docs/architecture.md) | 讲清 esbuild 快在并行、少遍历与内存布局三点。 | 读完总结三点原因，对照 Babel 的遍历次数，解释它为何难支持完整插件。 |
| [Babel 插件手册（中文）](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md) | 中文插件手册，降低术语门槛，适合边读边写插件。 | 读插件结构与 visitor 章节，跟着写一个删除 console.log 的插件并跑通测试。 |
| [Babel REPL](https://babeljs.io/repl) | 在线观察预设与插件对输出代码的实时影响，验证往返结果。 | 贴入 async、可选链代码，切换预设看降级输出，再反向推回源码。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格：列配置里写死中文，要接第二种语言 | visitor 遍历、path.replaceWith、generator 回写 | `@babel/parser` + `@babel/traverse` + `@babel/generator` 写 codemod | 列配置里的内联 render 函数也要访问到，漏掉就会出现中英混排 |
| 低端安卓的首屏加载：产物里被整包引入的依赖占体积 | AST 结构识别、ImportDeclaration 语义 | 在构建后跑 `@babel/parser` 审计脚本，配合 `source-map-explorer` | 审计脚本定位的是排查入口；压缩后的产物形态要先确认再选 sourceType |
| 多人协作白板的公式字段：用户输入算式 | tokenizer 状态扫描、Pratt 优先级爬升 | 手写 tokenizer + parser，求值只查白名单变量表 | 字符白名单放在词法层，属性访问与函数调用一律拒绝 |
| 列表页埋点自动注入：不想在每个点击处理函数里手写上报 | visitor 的 enter/exit、path.insertBefore | Babel 插件 + `@babel/template` 生成上报语句 | 只在函数体入口插入，否则会插到 return 之后成为死代码 |
| 组件库按需引入：首屏 chunk 里带进了未用到的组件 | ImportDeclaration 改写、generate 往返 | `babel-plugin-import` | 改写结果与库的目录结构绑定，升级库版本后重跑往返测试 |
| 线上错误栈还原：压缩后的报错行号对不上源码 | generator 的 sourceMaps 选项、往返验证 | `@babel/generator` 生成 map，配 source-map 库还原 | map 必须与线上产物同版本发布，否则定位错行 |
| 历史项目迁移：jQuery 调用换成原生 DOM | ESTree 节点规范、visitor 替换 | `jscodeshift` | 分批提交，每批跑一次回归用例再合入 |
| 自定义代码规范：团队要拦住在特定目录写中文硬编码 | 遍历与作用域分析 | ESLint 自定义规则 | 报错位置用节点的 loc，不要自己算行列 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格接多语言

**业务背景**：后台管理系统的表格列定义、筛选器、操作按钮上直接写着中文，接入第二种语言时靠人工搜索替换。表格有上万行数据、二十多个列，列配置分散在多个文件里，漏改一处就出现中英混排。

**怎么用本页知识解决**：思路是两条规则，只在字符串字面量与 JSX 文本里找中文，找到就换成 `t(key)`，key 与原文的映射写进语言包。改写走 `path.replaceWith`，作用域与父节点引用交给遍历器维护。

```js
// 前提：文件顶部已引入 parse、traverse、generate、t 四个依赖
const ast = parse(code, { sourceType: 'module', plugins: ['jsx'] }); // 打开 JSX，否则列配置里的标签解析失败
const dict = {}; // key 到原文的映射，用于生成语言包
let seq = 0; // 生成不重复的 key
traverse(ast, {
  StringLiteral(path) { // 访问字符串字面量
    if (!/[\u4e00-\u9fa5]/.test(path.node.value)) return; // 只处理含中文的字符串
    const key = `k${seq++}`;
    dict[key] = path.node.value;
    path.replaceWith(t.callExpression(t.identifier('t'), [t.stringLiteral(key)])); // 替换成 t(key)
  },
  JSXText(path) { // 访问 JSX 里的文本节点
    const text = path.node.value.trim();
    if (!/[\u4e00-\u9fa5]/.test(text)) return; // 跳过空白与纯英文
    const key = `k${seq++}`;
    dict[key] = text;
    path.replaceWith(t.jsxExpressionContainer(t.callExpression(t.identifier('t'), [t.stringLiteral(key)]))); // 文本要包进表达式容器
  },
});
const out = generate(ast, { sourceMaps: true }, code).code; // 回写代码并保留 sourcemap
```

- `StringLiteral` 分支覆盖列配置对象里的标题、placeholder、校验提示。
- `JSXText` 分支覆盖表头与操作列 JSX 里直接写的文案，这类节点不是字符串字面量。
- `path.replaceWith` 收到新节点后会同步更新父节点的子节点引用，直接改 `parent.children` 会破坏作用域数据。
- `generate` 的第三参数传原源码，sourcemap 才能映射回原始行列。
- key 用序号而非原文，避免原文改动后 key 失效。

**怎么度量收益**：指标是抽取覆盖率与漏翻数量。测量方法：先跑 `grep -rP '[\x{4e00}-\x{9fa5}]' src | wc -l` 得到中文串基线，与语言包 key 数对比；再用 Playwright 分别截两种语言的页面图，人工核对残留中文。

**什么时候不该用**：

- 中文串参与业务判断时不能替换，例如 `if (status === '成功')`，换成 `t(key)` 后比较值变了。
- 中文被后端协议当成枚举值或用于正则匹配时不能动。
- 模板字符串里拼出来的中文覆盖不到，得单独写 TemplateLiteral 分支。

#### 场景 2：低端安卓首屏加载的产物审计

**业务背景**：低端安卓机上打开首屏白屏时间偏长，构建产物里被整包引入的依赖占了大头。判断依据用本机构建后跑一次体积分析就能复现，不依赖线上数据。

**怎么用本页知识解决**：思路是把打包产物当成源码再 parse 一次，找出命名空间导入与顶层 require 的包名，输出待排查清单，再逐条改成具名导入或动态导入。

```js
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');

const code = fs.readFileSync('dist/app.js', 'utf8'); // 读取要审计的构建产物
const ast = parse(code, { sourceType: 'module' }); // 产物形态不同时改 sourceType 或不传
const suspects = [];
traverse(ast, {
  ImportDeclaration(path) { // 处理 ES 模块导入
    if (path.node.specifiers.some((s) => s.type === 'ImportNamespaceSpecifier')) {
      suspects.push(path.node.source.value); // import * as 会拉入整个包的导出
    }
  },
  CallExpression(path) { // 处理 CommonJS 的 require 调用
    const callee = path.node.callee;
    if (callee.type === 'Identifier' && callee.name === 'require'
        && path.node.arguments[0] && path.node.arguments[0].type === 'StringLiteral') {
      suspects.push(path.node.arguments[0].value); // 顶层 require 的包名一并记录
    }
  },
});
console.log([...new Set(suspects)].join('\n')); // 去重后输出待排查的包名
```

- `ImportDeclaration` 的 `specifiers` 里出现 `ImportNamespaceSpecifier` 就说明代码用了 `import * as`。
- `CallExpression` 分支抓 CommonJS 写法，打包产物里两种导入形式可能同时存在。
- 包名用 `Set` 去重，同一个包被多个文件引入时只报一次。
- 这份清单只说明"哪里可能整包引入"，是否真的占体积要用体积分析工具确认。
- 脚本可以放进 CI，对新引入的命名空间导入直接报错。

**怎么度量收益**：指标是首屏可交互时间与产物 gzip 大小。测量方法：用 Lighthouse CLI 在移动端模拟下跑，看 TTI 与 LCP；产物对比用两次构建的 `source-map-explorer dist/app.js` 报告；构建耗时用 `time npm run build` 跑两次取中位数。

**什么时候不该用**：

- 白屏由接口瀑布或未压缩图片导致时，改导入结构不会改变首屏表现。
- 项目已经做好按需引入与分块，再加扫描脚本只增加维护成本。
- 产物在服务端已做 brotli 与 CDN 分层缓存时，先看缓存命中再决定是否动构建。

#### 场景 3：多人协作白板的公式字段

**业务背景**：白板里的公式卡片让用户输入算式，例如总价乘折扣再加运费，早期直接把这些字符串交给 `eval`。随着公式卡片使用频次上升，注入风险与出错后的定位成本都要处理。

**怎么用本页知识解决**：思路是把字符串先过一遍 tokenizer，再用优先级爬升解析成 AST，求值阶段只允许标识符查已声明的变量表。词法层就把 `.`、`[`、`{` 这类字符拦掉，后面的解析器拿不到可执行任意逻辑的输入。

```js
function tokenize(src) { // 词法：把字符串切成记号数组
  const out = [];
  for (let i = 0; i < src.length; ) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; } // 空白跳过
    if (/[0-9.]/.test(ch)) { // 数字分支
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ type: 'num', value: Number(src.slice(i, j)) }); i = j; continue;
    }
    if (/[\u4e00-\u9fa5]/.test(ch)) { // 中文变量名分支
      let j = i; while (j < src.length && /[\u4e00-\u9fa5]/.test(src[j])) j++;
      out.push({ type: 'id', value: src.slice(i, j) }); i = j; continue;
    }
    if ('+-*/()'.includes(ch)) { out.push({ type: 'op', value: ch }); i++; continue; } // 运算符分支
    throw new Error(`非法字符 ${ch}`); // 白名单之外的字符一律拒绝
  }
  return out;
}
```

- tokenizer 是有状态的字符扫描，指针只往前走，遇到不认识的字符立刻抛错。
- 数字与标识符是"贪婪扫描"分支，先把连续同类字符吃满再产出记号。
- 解析阶段用优先级爬升处理 `*` 高于 `+` 的层次，每个二元节点记下运算符与左右子节点。
- 求值时 `id` 节点只允许在变量表里查值，查不到就报错，不做全局查找。
- 常量折叠可以在 AST 上做，例如两个数字字面量相邻时先算掉。

**怎么度量收益**：指标是求值耗时与非法输入拦截率。测量方法：用 `performance.now()` 包住一万次求值取 P95；构造非法输入集跑测试，抛错比例应为 100%；统计源码里 `eval` 的出现次数，目标为 0。

**什么时候不该用**：

- 公式结构固定、由产品在配置页里选字段时，用下拉框组装表达式比写 parser 省事。
- 需要执行循环、函数定义这类完整逻辑时，用 iframe 沙箱隔离 `eval` 的成本低于自研一门语言。
- 输入方是可信的服务端且已有权限边界时，再叠一层 parser 只是重复校验。

### 行业先进实践

**插件只声明 visitor，遍历交给框架（出处：Babel Plugin Handbook）**。插件对象里只写访问哪些节点，进入与退出由遍历器调度，改动统一走 `path` 上的方法。这样做的作用域数据始终由遍历器维护，不会出现 AST 与作用域不一致。项目里可以加一条评审规则：插件代码里不出现 `parent.children[i] =`。

**迁移脚本保留原始格式（出处：reactjs/react-codemod 开源项目）**。这套 codemod 基于 jscodeshift，打印时尽量沿用未改动节点的原文格式。带来的结果是评审者能看到最小 diff，改动意图清楚。项目里可以让 codemod 跑完后用 `git diff --stat` 比对改动行数与实际语义改动条数。

**规则与转换共用 ESTree 节点命名（出处：ESLint 官方文档 Custom Rules）**。自定义规则接收 AST 节点并报告问题，节点类型与 Babel 转换插件使用同一套命名。同一段代码就能在 lint 与构建两个阶段复用判断逻辑。项目里可以把判断函数抽成公共模块，规则与 codemod 各自调用。

**不暴露 AST 的构建工具走 onLoad 钩子（出处：esbuild 官方文档 Plugins）**。esbuild 插件只提供 `onResolve`、`onLoad` 这类钩子，需要改 AST 就在 `onLoad` 里自己 parse、改完返回 `contents`。这样宿主不必为插件维护 AST 版本兼容。从 Babel 迁到 esbuild 时，插件要自带 parser 依赖。

**用 wasm 插件把转换移出 JS 线程（出处：SWC 官方文档；需核对官方文档：当前版本的插件模板与 wasm 目标）**。SWC 用 Rust 实现转换与压缩，插件编译成 wasm 由原生侧调度。转换与压缩在同一条流水线里，省掉跨语言序列化 AST 的开销。落地前先核对官方文档的插件模板与目标平台支持情况。

### 从学到用：落地路线

1. **试点**：先挑一个只有文案、没有业务判断的目录跑抽取 codemod，例如后台表格的列配置文件。验收标准是 `git diff` 里只出现字符串替换与新增 import，单测全绿。
2. **验证**：对试点目录做往返测试，用 `generate(parse(src))` 的结果跑同一组用例。验收标准是快照与端到端用例在改写前后无差异。
3. **推广**：把 codemod 收进迁移脚本仓库，按目录分批提交，每批一个合并请求。验收标准是语言包 key 数与中文串基线收敛，未处理项有逐条清单。
4. **防回退**：加 lint 规则禁止在指定目录写中文硬编码，CI 里跑 codemod 的 dry-run。验收标准是 dry-run 输出为空，非空即构建失败。

### 动手作业

**小项目**：写一套"硬编码文案抽取 + 语言包生成 + lint 拦截"的工具链。

**步骤**：

1. 用 `grep -rP '[\x{4e00}-\x{9fa5}]' src | wc -l` 记录中文串基线，存成对照文件。
2. 写抽取脚本，先只处理 `StringLiteral`，dry-run 打印将要替换的文件与行列。
3. 补上 `JSXText` 分支，让 JSX 子节点里的文案一并进入语言包。
4. 用 `generate` 回写文件并保留 sourcemap，改动前先提交一次以便对比 diff。
5. 写往返测试，对每个被改文件比较改写前后的返回值或渲染快照。
6. 加一条 ESLint 自定义规则，在指定目录出现中文 `StringLiteral` 时报告。
7. 在 CI 里跑 dry-run，输出非空就让构建失败。

**验收标准**：

- 语言包条目数与中文串基线一致，差异项有逐条说明。
- 全量单测与组件快照通过，往返测试中改写前后的行为一致。
- 对改写结果再 parse 一次，AST 与首次 parse 的结果深度相等。
- 全仓库 dry-run 输出为空。
- 手动新增一处中文硬编码时 CI 失败，删除后恢复通过。

