---
title: "MCP 服务器生态与开发"
description: "MCP 服务器生态概览、官方与第三方服务器、安装配置与自定义服务器开发。"
---

# MCP 服务器生态与开发

!!! abstract "学完这一页你能"
    - 说出官方、社区、企业自建、自定义四类 MCP 服务器各自负责什么，并判断一个新需求落在哪一类。
    - 读懂 mcpServers 配置里的 command、args、env、timeout、restart、maxRetries 六个字段，写出可用的多服务器配置。
    - 用 Node 20+ 写脚本给配置做 `${VAR}` 与 `${VAR:-default}` 插值，并在变量缺失时报错。
    - 搭出自定义 MCP 服务器的骨架，把 tools、resources、prompts 三类能力分清楚。

!!! note "术语：MCP"
    Model Context Protocol，模型上下文协议。它规定客户端与服务器之间用 JSON-RPC 2.0 交换消息，消息按 initialize、tools/list、tools/call 这样的方法名分类。
    例子：客户端发出 tools/list，服务器返回一个工具数组，客户端把数组交给模型挑选。

## 0. 知识地图

```mermaid
flowchart TB
    A["MCP 客户端"] --> B["JSON-RPC 2.0 消息"]
    B --> C["传输层"]
    C --> D["stdio 本地子进程"]
    C --> E["HTTP 与 SSE 远程服务"]
    D --> F["MCP 服务器"]
    E --> F
    F --> G["官方服务器"]
    F --> H["第三方服务器"]
    F --> I["企业自建服务器"]
    F --> J["自定义服务器"]
    G --> K["filesystem github brave-search git"]
    H --> L["slack postgres fetch sentry"]
    I --> M["内部系统接口"]
    J --> N["tools 工具"]
    J --> O["resources 资源"]
    J --> P["prompts 提示模板"]
    N --> Q["外部资源 API 数据库 文件系统"]
    O --> Q
    P --> Q
    K --> R["写入 mcpServers 配置"]
    L --> R
    M --> R
    N --> R
```

建议按三条线读这张图。第一条线是第 1 到第 2 节，先把生态分类和传输方式这两个底座看懂。第二条线是第 3 到第 5 节，讲现成服务器怎么选、怎么配、怎么排错。第三条线是第 6 到第 8 节，讲自己写服务器的方法与落地检查。

!!! note "术语：JSON-RPC 2.0"
    Remote Procedure Call，远程过程调用的一种 JSON 编码约定。它规定请求带 jsonrpc、id、method、params 四个字段，响应带 jsonrpc、id、result 或 error。
    例子：`{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}` 是一次合法的请求。

## 1. MCP 服务器生态：四类角色怎么分工

**先想一个问题**

团队要给内部 AI 助手接上公司知识库。你是去找一个现成服务器，还是自己写一个？这个决定取决于需求落在生态的哪一类，而不是取决于哪种做法听起来更厉害。

**心智模型**

!!! tip "心智模型"
    - 一句话模型：协议固定，服务器可换；客户端认方法名，不认服务器品牌。
    - 日常类比：像 USB-C 扩展坞，电脑认接口形状，插上显示器就出画面，插上硬盘就读文件。
    - 类比不成立的地方：扩展坞的接口形状由硬件强制统一，而 MCP 服务器的工具名称与参数结构由各家自己命名，接一个新服务器仍要读它的文档。

**图解**

```mermaid
flowchart TB
    A["业务需求"] --> B["官方是否维护了实现"]
    B -->|"有"| C["官方服务器"]
    B -->|"没有"| D["社区是否发布过包"]
    D -->|"有"| E["第三方服务器"]
    D -->|"没有"| F["是否只在内网使用"]
    F -->|"是"| G["企业自建服务器"]
    F -->|"否"| H["自定义服务器"]
    C --> I["写入 mcpServers 配置"]
    E --> I
    G --> I
    H --> I
```

1. 先问官方有没有：Anthropic 官方维护的服务器覆盖文件系统、GitHub、网页搜索、Git 四类高频场景。
2. 官方没有就问社区：npm 上 `@modelcontextprotocol` 命名空间和 GitHub 上的 servers 仓库都收录了社区实现。
3. 社区也没有，看数据边界：只在内网流转的数据适合做企业自建服务器。
4. 数据边界不构成约束、且能力特殊，才落到完全自定义开发。
5. 四类最终都写进同一份配置块，对客户端而言入口形式一致。

**一步一步来**

第 1 步：把需求写成结构化字段。这样分类才有依据，不靠感觉。

```json
{
  "goal": "让助手读取运营上传的 CSV 并校验 SKU",
  "dataScope": "internal",
  "existingSystem": "postgres",
  "writeOperation": false
}
```

**这段代码在做什么**

- `goal` 用一句话写清动作对象，避免后面争论范围。
- `dataScope` 标记数据是否允许出内网，决定能否用远程 HTTP 服务。
- `existingSystem` 指向已存在的系统，用来匹配现成服务器。
- `writeOperation` 标记是否产生写操作，写操作需要额外的审批与审计设计。

第 2 步：按字段试跑一个现成服务器，确认包名与启动方式能对上。下面命令的包名来自本页旧版内容，需核对官方文档确认当前包名。

```bash
# 用 npx 直接拉起文件系统服务器，参数是允许访问的目录
npx -y @modelcontextprotocol/server-filesystem /workspace
# 包名以本页旧版内容为准，需核对官方文档
```

**这段代码在做什么**

- `npx` 会临时下载并执行包，不污染全局依赖。
- `-y` 表示跳过安装确认，适合脚本化环境。
- 末尾的路径是白名单目录，服务器只在这个范围内读写。
- 启动成功时进程会停在等待输入的状态，这是 stdio 模式的正常表现。

运行结果：进程无报错、保持挂起，说明包名与参数可用；若报错找不到包，说明包名需更新。

第 3 步：把验证通过的服务器写进配置块。配置块的加载位置与字段见第 5 节。

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
    }
  }
}
```

**这段代码在做什么**

- 外层键 `mcpServers` 是约定的配置入口。
- 内层键 `filesystem` 是自定义的服务器名，客户端用它做日志区分。
- `command` 与 `args` 组合成一条可执行命令，客户端负责拉起子进程。
- 这里没有写 `env`，说明该服务器不需要令牌。

**动手验证**

```js
// classify-server.mjs
// 依赖：无。运行：node classify-server.mjs
import assert from 'node:assert/strict';

function classify(need) {
  if (need.officialMaintained) return '官方服务器';
  if (need.publishedPackage) return '第三方服务器';
  if (need.dataScope === 'internal') return '企业自建服务器';
  return '自定义服务器';
}

assert.equal(classify({ officialMaintained: true }), '官方服务器');
assert.equal(classify({ publishedPackage: true }), '第三方服务器');
assert.equal(classify({ dataScope: 'internal' }), '企业自建服务器');
assert.equal(classify({ dataScope: 'public' }), '自定义服务器');

const tasks = [
  { name: '读本地代码库', officialMaintained: true },
  { name: '发 Slack 通知', publishedPackage: true },
  { name: '查内网工单库', dataScope: 'internal' },
  { name: '生成周报草稿', dataScope: 'public' },
];

for (const task of tasks) {
  console.log(`${task.name} -> ${classify(task)}`);
}
console.log('通过: 四类判定与预期一致');
```

运行结果：

```text
读本地代码库 -> 官方服务器
发 Slack 通知 -> 第三方服务器
查内网工单库 -> 企业自建服务器
生成周报草稿 -> 自定义服务器
通过: 四类判定与预期一致
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| :--- | :--- | :--- |
| 官方已有实现却自己重写 | 分类只看技术难度，没先查仓库 | 先在 servers 仓库检索能力关键词，再决定是否自建 |
| 内网数据走了远程 HTTP 服务 | 分类时没记录 dataScope | 在需求卡里加 dataScope 字段，内网数据只配本地 stdio |
| 同一能力装了两个服务器 | 两类的边界没写清 | 用能力名做唯一键，配置里保留一个实现 |

**用在哪里**

1. 前端团队的代码库问答助手
   - 业务背景：新同学要知道某个组件在哪被引用，逐个仓库搜索耗时。
   - 本节知识怎么用：先归类为官方 filesystem 服务器，限定白名单目录为代码根目录。
   - 用什么指标衡量收益：新同学定位组件引用的平均耗时，从人工搜索分钟级降到一次问答。
   - 什么时候不该用：代码含未脱敏的密钥文件时，不要让服务器目录覆盖仓库根。

2. 内部工单系统的只读查询
   - 业务背景：客服要反复切系统查工单状态。
   - 本节知识怎么用：归类为企业自建服务器，因为数据不出内网且官方没有对应实现。
   - 用什么指标衡量收益：单个工单查询的跳转次数，从跨两个系统降到一次对话。
   - 什么时候不该用：工单含用户身份证号等字段时，先做字段脱敏再接服务器。

3. 竞品资料的网页检索
   - 业务背景：市场同学要汇总公开资料的来源链接。
   - 本节知识怎么用：归类为官方 brave-search 服务器，走远程服务即可。
   - 用什么指标衡量收益：单次调研的资料收集条数与耗时。
   - 什么时候不该用：需要登录才可见的页面，搜索服务器取不到内容。

**行业实践**

- 官方仓库 modelcontextprotocol/servers 把参考服务器按目录分列，每个服务器配独立 README 说明配置方式。借鉴到你的项目：自建服务器也照这个结构写一个 README，列出工具名、参数、所需权限。
- 社区列表 awesome-mcp-servers 按类别索引第三方实现。借鉴到你的项目：选型前先看列表里的分类，再决定是否重复造轮子。
- Claude Code 文档的 MCP 配置章节给出 mcpServers 的写法。借鉴到你的项目：配置字段名以官方文档为准，不要照抄博客里的字段。

**小结**

1. 分类先于选型：官方、第三方、企业自建、自定义四类的判断依据是维护方与数据边界。
2. 判定要落到字段：goal、dataScope、existingSystem、writeOperation 四个字段决定走哪条路。
3. 分类结果只是一个入口，配置块的写法统一，差异体现在 command、args、env 上。

## 2. 传输模式：stdio 与 HTTP 加 SSE

**先想一个问题**

同样一个服务器，本地用 `npx` 拉起能跑，写成远程地址却连不上。差别不在能力，而在传输模式。传输模式决定消息从哪个通道进出。

!!! note "术语：stdio"
    standard input and output，标准输入输出。父进程把请求写进子进程的 stdin，子进程把响应写进 stdout，双方按行分帧。
    例子：客户端写入一行 `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`，服务器往 stdout 回一行结果。

**心智模型**

!!! tip "心智模型"
    - 一句话模型：传输层负责把 JSON 消息搬到对端，服务器逻辑不关心走哪条管道。
    - 日常类比：像两个人沟通，面对面说话用声波，异地沟通用电话线路，说的话本身不变。
    - 类比不成立的地方：电话是双向实时通道，而 SSE 只做服务器到客户端的单向推送，客户端到服务器仍要新发一次 HTTP 请求。

**图解**

```mermaid
sequenceDiagram
    participant C as "MCP 客户端"
    participant P as "服务器子进程"
    C->>P: "spawn 子进程并写入 initialize 请求"
    P->>C: "返回 protocolVersion 与 capabilities"
    C->>P: "写入 initialized 通知"
    C->>P: "写入 tools list 请求"
    P->>C: "返回工具数组"
    C->>P: "写入 tools call 请求"
    P->>C: "返回 contents 数组"
    C->>P: "关闭 stdin 结束会话"
```

1. 客户端先 `spawn` 子进程，建立 stdin 与 stdout 两条管道。
2. 客户端写入 `initialize`，声明自己支持的协议版本。
3. 服务器回 `initialize` 结果，带上 `protocolVersion` 与 `capabilities`。
4. 客户端发 `initialized` 通知，握手结束。
5. 之后进入请求响应循环，`tools/list` 与 `tools/call` 都按行发送。
6. 客户端关闭 stdin，子进程读到流结束自行退出。

**一步一步来**

第 1 步：理解按行分帧。stdio 没有消息长度头，双方靠换行符切分。

```js
// 按行切分的核心逻辑
let buffer = '';                                  // 暂存未完整的一行
process.stdin.on('data', (chunk) => {
  buffer += chunk;                                // 追加新到片段
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {   // 找到换行符
    const line = buffer.slice(0, index);          // 切出一整行
    buffer = buffer.slice(index + 1);             // 剩余部分留到下一轮
    if (line.trim()) handle(JSON.parse(line));    // 解析并交给处理函数
  }
});
```

**这段代码在做什么**

- `buffer` 保存跨数据块被切断的半行，避免 JSON 解析失败。
- `indexOf('\n')` 查找行边界，`while` 保证一次数据块里多行都被处理。
- `slice` 不修改原字符串，`buffer` 被重新赋值后旧内容自动释放。
- `line.trim()` 过滤空行，避免 `JSON.parse('')` 抛错。

第 2 步：HTTP 模式下把同样的消息作为请求体发出。

```bash
# 远程模式：用一次 POST 发送 initialize 请求
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}'
# 示例来自本页旧版内容，端点路径与协议版本需核对官方文档
```

**这段代码在做什么**

- `-X POST` 指定方法，MCP 的请求走 POST。
- `Content-Type: application/json` 告诉服务端请求体是 JSON。
- `-d` 后的一行是 JSON-RPC 请求，字段与 stdio 模式完全一致。
- 端点路径 `/mcp` 只是示例，真实路径需核对官方文档。

第 3 步：按数据流向判断该用哪种模式。

```text
本地文件系统、子进程工具  -> stdio
跨机器、多客户端共享      -> HTTP 加 SSE
需要浏览器直接接入        -> HTTP 加 SSE
密钥不允许离开本机        -> stdio
```

**这段代码在做什么**

- 第一行把进程间通信的场景归到 stdio，密钥与文件都留在本机。
- 第二行把多客户端共享的场景归到 HTTP，服务端集中管理连接。
- 第三行考虑运行环境，浏览器拿不到子进程能力。
- 第四行是安全约束优先于便利性的例子。

**动手验证**

```js
// stdio-demo.mjs
// 依赖：无。运行：node stdio-demo.mjs
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import assert from 'node:assert/strict';

if (process.argv[2] === 'child') {
  // 子进程角色：逐行读 stdin，按 JSON-RPC 2.0 回复
  const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
  createInterface({ input: process.stdin }).on('line', (line) => {
    if (!line.trim()) return;
    const req = JSON.parse(line);
    if (req.method === 'initialize') {
      send({ jsonrpc: '2.0', id: req.id,
        result: { protocolVersion: '2024-11-05', capabilities: { tools: {} } } });
    } else if (req.method === 'tools/list') {
      send({ jsonrpc: '2.0', id: req.id,
        result: { tools: [{ name: 'echo', description: '回显输入' }] } });
    }
  });
} else {
  // 父进程角色：拉起子进程并按行收发
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'child'],
    { stdio: ['pipe', 'pipe', 'inherit'] });
  const pending = new Map();
  createInterface({ input: child.stdout }).on('line', (line) => {
    const res = JSON.parse(line);
    const resolve = pending.get(res.id);
    if (resolve) resolve(res.result);
    pending.delete(res.id);
  });
  let seq = 0;
  const call = (method, params = {}) => new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });

  const init = await call('initialize', { protocolVersion: '2024-11-05' });
  assert.equal(init.protocolVersion, '2024-11-05');
  assertEquals(capabilitiesHasTools(init), true);

  const list = await call('tools/list');
  assert.equal(list.tools.length, 1);
  assert.equal(list.tools[0].name, 'echo');

  console.log('通过: stdio 通道完成 initialize 与 tools/list 两次往返');
  console.log('协议版本:', init.protocolVersion);
  child.stdin.end();
}

function capabilitiesHasTools(result) {
  return Boolean(result.capabilities && result.capabilities.tools);
}
```

运行结果：

```text
通过: stdio 通道完成 initialize 与 tools/list 两次往返
协议版本: 2024-11-05
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| :--- | :--- | :--- |
| 子进程日志混进响应流 | 业务日志写到了 stdout | 日志改走 stderr，stdout 只放 JSON-RPC 消息 |
| 大响应被截断 | 按固定字节数读取，没按换行分帧 | 用 buffer 累积并按 `\n` 切分 |
| HTTP 模式收不到推送 | 只发了 POST，没监听 SSE 通道 | 客户端需单独建立 SSE 连接接收服务端消息 |

**用在哪里**

1. 本地代码助手的文件读写
   - 业务背景：助手要读本地仓库文件，文件不上传。
   - 本节知识怎么用：选 stdio，客户端 `spawn` 本地进程，白名单限定目录。
   - 用什么指标衡量收益：文件读取的往返延迟与是否有数据出网。
   - 什么时候不该用：团队共用一台远程开发机时，stdio 无法被别人复用。

2. 团队共享的检索服务
   - 业务背景：十个前端同学共用一个搜索服务，密钥只配一次。
   - 本节知识怎么用：选 HTTP 加 SSE，服务端集中持有 API key。
   - 用什么指标衡量收益：密钥配置份数从每人一份降到服务端一份。
   - 什么时候不该用：搜索服务本身不支持长连接时，SSE 通道建不起来。

3. 浏览器内嵌的 AI 面板
   - 业务背景：管理后台里嵌一个问答面板。
   - 本节知识怎么用：浏览器无法拉子进程，只能走 HTTP 加 SSE 连远程服务。
   - 用什么指标衡量收益：面板首字节时间与连接复用率。
   - 什么时候不该用：需要操作本机文件时，浏览器环境拿不到文件系统权限。

**行业实践**

- MCP 官方文档的 Transports 章节区分 stdio 与 HTTP 两类传输，并说明各自的适用场景。借鉴到你的项目：把传输选择写进设计文档，而不是留给实现者临场决定。
- modelcontextprotocol/servers 仓库里的参考服务器大多以 stdio 启动，README 给出对应的 command 与 args。借鉴到你的项目：自建服务器默认支持 stdio，需要远程时再加 HTTP 入口。
- 需核对官方文档：当前版本推荐的远程传输是否为 Streamable HTTP，以及它与 SSE 的关系。

**小结**

1. 传输层只搬消息、不改语义，同一份请求在两种模式下字段一致。
2. stdio 靠换行分帧，日志必须走 stderr，否则响应流被污染。
3. 传输选择由数据边界和运行环境决定，不由个人偏好决定。

## 3. 官方 MCP 服务器：filesystem、GitHub、Brave Search、Git

**先想一个问题**

你要让助手读本地文件、看 GitHub 上的 Issue、搜公开网页。这三件事对应三个官方服务器，它们的配置结构一致，差别只在环境变量与参数。

**心智模型**

!!! tip "心智模型"
    - 一句话模型：官方服务器是把外部系统能力包装成一串工具名，客户端看到的是工具列表。
    - 日常类比：像给手机装官方出的几个 App，每个 App 管一类事，账号权限各自单独授权。
    - 类比不成立的地方：App 的界面差异很大，而 MCP 服务器的对外形态统一为 tools、resources、prompts 三类能力，界面差异被抹平。

**图解**

```mermaid
flowchart TB
    A["要接的外部系统"] --> B["本地文件"]
    A --> C["GitHub 仓库与 Issue"]
    A --> D["公开网页搜索"]
    A --> E["本机 Git 仓库"]
    B --> F["server-filesystem"]
    C --> G["server-github"]
    D --> H["server-brave-search"]
    E --> I["server-git"]
    F --> J["需要 ALLOWED_DIRECTORIES"]
    G --> K["需要 GITHUB_PERSONAL_ACCESS_TOKEN"]
    H --> L["需要 BRAVE_API_KEY"]
    I --> M["无需令牌"]
    J --> N["写入 mcpServers 配置"]
    K --> N
    L --> N
    M --> N
```

1. 先按外部系统分四类，左边的方框是需求，中间一列是对应的官方服务器包。
2. filesystem 需要配置允许访问的目录白名单。
3. GitHub 服务器需要个人访问令牌，令牌决定能读还是能写。
4. Brave Search 需要 API 密钥，免费额度有限。
5. Git 服务器操作本机仓库，不需要远端令牌。
6. 四者最终都汇入同一份配置块，键名可以自定义。

**一步一步来**

第 1 步：安装并确认包能启动。包名以本页旧版内容为准，需核对官方文档。

```bash
# 依次安装四个官方服务器的包
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-brave-search
npm install -g @modelcontextprotocol/server-git
# 包名以本页旧版内容为准，需核对官方文档
```

**这段代码在做什么**

- `-g` 装到全局，方便在任意目录用 `npx` 或命令名启动。
- 四条命令相互独立，装哪个取决于需要哪类能力。
- 安装成功只证明包存在，不代表令牌配置正确。
- 若公司内网无法访问 npm 源，需要先配置私有源。

第 2 步：配置令牌与白名单。避免把密钥直接写进配置文件。

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "env": { "ALLOWED_DIRECTORIES": "/workspace:/tmp/readonly" }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

**这段代码在做什么**

- filesystem 的 `ALLOWED_DIRECTORIES` 用冒号分隔多个目录，形成白名单。
- 参数里的 `/workspace` 与 `env` 里的白名单同时出现，限制更明确。
- GitHub 的令牌写成 `${GITHUB_TOKEN}`，由客户端在启动时插值，配置文件里不留明文。
- 两个服务器并列在 `mcpServers` 下，键名可自定义，客户端用键名区分日志。

运行结果：启动后客户端能列出 filesystem 的读文件、列目录、写文件等工具，以及 GitHub 的 Issue 与 PR 相关工具。

第 3 步：确认令牌权限范围。权限过宽会带来风险，过窄会调用失败。

```text
GitHub 令牌权限（来自本页旧版内容，以原文为准，需核对 GitHub 官方文档）
repo              完全控制私有仓库
read:user         读取用户信息
write:discussion  管理讨论（可选）
```

**这段代码在做什么**

- 第一项决定能否读写私有仓库，权限范围最大。
- 第二项只读用户资料，用于展示提交者信息。
- 第三项是可选能力，不需要讨论功能时不要勾选。
- 只做只读查询时，应选择更窄的权限组合，具体组合需核对 GitHub 官方文档。

**动手验证**

```js
// check-official.mjs
// 依赖：无。运行：node check-official.mjs
import assert from 'node:assert/strict';

const RULES = {
  filesystem: { requiredEnv: ['ALLOWED_DIRECTORIES'], needsToken: false },
  github: { requiredEnv: ['GITHUB_PERSONAL_ACCESS_TOKEN'], needsToken: true },
  'brave-search': { requiredEnv: ['BRAVE_API_KEY'], needsToken: true },
  git: { requiredEnv: [], needsToken: false },
};

function check(name, config) {
  const rule = RULES[name];
  if (!rule) return { ok: false, reason: '未知服务器名' };
  const env = config.env || {};
  const missing = rule.requiredEnv.filter((key) => !env[key]);
  if (missing.length) return { ok: false, reason: `缺少环境变量: ${missing.join(', ')}` };
  if (rule.needsToken && !String(env[rule.requiredEnv[0]]).startsWith('${')) {
    return { ok: false, reason: '令牌疑似明文写入配置' };
  }
  return { ok: true, reason: '配置完整' };
}

assert.deepEqual(check('git', {}), { ok: true, reason: '配置完整' });
assert.equal(check('github', {}).ok, false);
assert.equal(check('github', { env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_plain' } }).ok, false);
assert.equal(
  check('github', { env: { GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_TOKEN}' } }).ok,
  true
);

const configs = {
  filesystem: { env: { ALLOWED_DIRECTORIES: '/workspace' } },
  github: { env: { GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_TOKEN}' } },
  'brave-search': { env: {} },
  git: {},
};

for (const [name, config] of Object.entries(configs)) {
  const result = check(name, config);
  console.log(`${name}: ${result.ok ? '通过' : '不通过'} - ${result.reason}`);
}
console.log('断言全部通过');
```

运行结果：

```text
filesystem: 通过 - 配置完整
github: 通过 - 配置完整
brave-search: 不通过 - 缺少环境变量: BRAVE_API_KEY
git: 通过 - 配置完整
断言全部通过
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| :--- | :--- | :--- |
| filesystem 报无权限 | 未设置白名单，默认禁止访问全部目录 | 在 env 或 args 里写明允许目录 |
| GitHub 工具调用返回 403 | 令牌权限不足或已过期 | 按需重新签发令牌，只读场景不要给 repo 写权限 |
| Brave 搜索中途失败 | 免费额度用尽 | 本页旧版内容记录免费套餐为每月 2000 次请求，以原文为准，需核对 Brave 官方文档 |
| Git 工具找不到仓库 | 启动目录不是 Git 仓库根 | 在启动参数或客户端工作目录指向仓库根 |

**用在哪里**

1. 前端代码库的批量重构辅助
   - 业务背景：要把旧版组件库的调用点逐个替换。
   - 本节知识怎么用：filesystem 提供读文件与列目录，Git 服务器提供 diff 与提交历史。
   - 用什么指标衡量收益：单个组件替换点的确认耗时，以及提交前的变更检查次数。
   - 什么时候不该用：仓库里含生产环境密钥文件时，白名单目录要先排除这些文件。

2. Issue 自动分诊
   - 业务背景：每天新开 Issue 需要打标签并指派负责人。
   - 本节知识怎么用：GitHub 服务器读 Issue 列表，写评论与标签。
   - 用什么指标衡量收益：新 Issue 首次响应时间的缩短量，以及人工分诊次数。
   - 什么时候不该用：仓库涉及敏感客户信息时，不要让助手读取 Issue 正文。

3. 组件选型的资料检索
   - 业务背景：选 UI 库时要看公开文档与对比文章。
   - 本节知识怎么用：Brave Search 服务器做网页检索，结果作为回答来源。
   - 用什么指标衡量收益：单次调研的资料条数与整理耗时。
   - 什么时候不该用：需要访问付费数据库时，搜索服务器取不到内容。

**行业实践**

- modelcontextprotocol/servers 仓库为每个官方服务器提供单独 README，列出可用工具与所需环境变量。借鉴到你的项目：把工具清单写进内部文档，让使用者不必读源码。
- GitHub 官方文档的令牌权限章节说明各类 scope 的覆盖范围。借鉴到你的项目：为助手单独签发一个只读令牌，与个人令牌隔离。
- 需核对 Brave 官方文档：当前免费套餐的请求额度与计费方式，本页旧版内容的 2000 次每月需重新确认。

**小结**

1. 官方服务器的配置结构一致，差异集中在 env 与启动参数。
2. 令牌一律走环境变量插值，配置文件里不出现明文。
3. 权限按最小可用原则签发，只读场景不勾选写权限。

## 4. 第三方 MCP 服务器：Slack、PostgreSQL、Fetch 与服务器画廊

**先想一个问题**

官方四个服务器覆盖不到你的业务系统，例如 Slack 通知和数据库查询。这时要先在社区画廊里查一遍，而不是直接动手写。

!!! note "术语：MCP 服务器画廊"
    收录第三方 MCP 服务器的清单站点或仓库，按类别索引实现、包名与仓库地址。
    例子：GitHub 上的 modelcontextprotocol/servers 仓库、npm 的 @modelcontextprotocol 命名空间搜索页、社区维护的 awesome-mcp-servers 列表。

**心智模型**

!!! tip "心智模型"
    - 一句话模型：画廊是索引，不是质量认证，索引里有实现不等于实现可用。
    - 日常类比：像应用商店，搜得到不代表评分高、维护活跃、权限干净。
    - 类比不成立的地方：应用商店有上架审核与下架机制，社区清单通常是自助提交，没有统一审核。

**图解**

```mermaid
flowchart TB
    A["确定要接的业务系统"] --> B["在画廊里检索关键词"]
    B --> C["是否找到实现"]
    C -->|"没找到"| D["回到自定义开发"]
    C -->|"找到"| E["读源码与 README"]
    E --> F["是否声明权限范围"]
    F -->|"没声明"| G["暂缓采用"]
    F -->|"有声明"| H["小范围试跑"]
    H --> I["检查工具列表是否符合预期"]
    I --> J["写入配置并锁定版本"]
```

1. 从业务系统名出发检索，例如输入 slack 或 postgres。
2. 找到实现后先读源码与 README，确认它调用了哪些外部接口。
3. 检查 README 是否声明所需权限与影响范围，没有声明就暂缓。
4. 在测试环境小范围试跑，确认启动不报错。
5. 检查工具列表，确认工具名与参数与业务预期一致。
6. 最后写入配置，并把包版本锁定到具体版本号。

**一步一步来**

第 1 步：配置 Slack 服务器，注意它是能写消息的服务器。

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
        "SLACK_TEAM_ID": "T12345678"
      }
    }
  }
}
```

**这段代码在做什么**

- `SLACK_BOT_TOKEN` 是机器人令牌，决定能读写哪些频道。
- `SLACK_TEAM_ID` 指定工作区，避免令牌跨工作区误用。
- 令牌同样走插值，配置文件里不出现明文。
- 包名以本页旧版内容为准，需核对官方文档。

第 2 步：配置 PostgreSQL 服务器，并限制返回行数。

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "MAX_ROWS": "500"
      }
    }
  }
}
```

**这段代码在做什么**

- `DATABASE_URL` 里包含用户名与密码，属于高敏感配置。
- `MAX_ROWS` 限制单次查询返回行数，旧版内容记录默认值为 100。
- 把 500 写进配置，防止一次查询拉回整张表。
- 生产库应使用只读账号，账号权限配置需核对数据库官方文档。

第 3 步：配置 Fetch 服务器做通用 HTTP 请求。

```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    }
  }
}
```

**这段代码在做什么**

- Fetch 服务器不需要令牌，可以直接启动。
- 它能对任意 URL 发起请求，因此出网范围需要额外的网络层限制。
- 工具一般包含通用的 fetch 与只取 JSON、只取 HTML 的变体。
- 参数里的目标地址来自模型生成，必须做域名白名单校验。

**动手验证**

```js
// check-third-party.mjs
// 依赖：无。运行：node check-third-party.mjs
import assert from 'node:assert/strict';

const CATALOG = [
  { name: 'slack', pkg: '@modelcontextprotocol/server-slack',
    env: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'], write: true },
  { name: 'postgres', pkg: '@modelcontextprotocol/server-postgres',
    env: ['DATABASE_URL'], write: false },
  { name: 'fetch', pkg: '@modelcontextprotocol/server-fetch',
    env: [], write: false },
];

function audit(entry, config) {
  const env = config.env || {};
  const missing = entry.env.filter((key) => !env[key]);
  const issues = [];
  if (missing.length) issues.push(`缺少环境变量: ${missing.join(', ')}`);
  if (entry.write && !config.auditLog) issues.push('有写操作但未开启审计日志');
  if (entry.name === 'postgres' && !env.MAX_ROWS) issues.push('未限制返回行数');
  return { name: entry.name, ok: issues.length === 0, issues };
}

const configs = {
  slack: { env: { SLACK_BOT_TOKEN: '${SLACK_BOT_TOKEN}', SLACK_TEAM_ID: 'T1' }, auditLog: true },
  postgres: { env: { DATABASE_URL: '${DATABASE_URL}', MAX_ROWS: '500' } },
  fetch: { env: {} },
};

const results = CATALOG.map((entry) => audit(entry, configs[entry.name]));
assert.equal(results.every((item) => item.ok), true);

const bad = audit(CATALOG[0], { env: { SLACK_BOT_TOKEN: 'x' }, auditLog: false });
assert.equal(bad.ok, false);
assert.equal(bad.issues.length, 2);

for (const item of results) console.log(`${item.name}: ${item.ok ? '通过' : '不通过'}`);
console.log('断言全部通过');
```

运行结果：

```text
slack: 通过
postgres: 通过
fetch: 通过
断言全部通过
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| :--- | :--- | :--- |
| 助手误删频道 | Slack 服务器带 archive_channel 这类写工具 | 只授予所需频道权限，写操作前加人工确认 |
| 查询把生产库拖慢 | 未限制返回行数，一次拉回全表 | 配置 MAX_ROWS，并让数据库账号只有只读权限 |
| 包升级后行为变化 | 配置里用了 `latest` 或浮动版本 | 锁定到具体版本号，升级前在测试环境验证 |
| Fetch 请求到内网地址 | 未限制目标域名 | 在网络层加域名白名单，只允许出网到指定域 |

**用在哪里**

1. 客服值班频道摘要推送
   - 业务背景：每天把待处理工单摘要发到值班频道。
   - 本节知识怎么用：Slack 服务器发消息，只授予目标频道权限。
   - 用什么指标衡量收益：值班同学查看工单的切换次数减少量。
   - 什么时候不该用：摘要含用户手机号时，先脱敏再推送。

2. 运营数据看板的取数
   - 业务背景：运营要按周看新增用户与留存。
   - 本节知识怎么用：PostgreSQL 服务器执行只读查询，MAX_ROWS 限制返回量。
   - 用什么指标衡量收益：取数请求的人工转述次数，以及查询超时次数。
   - 什么时候不该用：涉及跨库聚合的复杂报表，交给数据仓库而不是 MCP 服务器。

3. 供应商文档的抓取整理
   - 业务背景：要定期抓取合作方的公开接口文档。
   - 本节知识怎么用：Fetch 服务器抓取 HTML，配合域名白名单。
   - 用什么指标衡量收益：文档更新被发现的时间差。
   - 什么时候不该用：目标站点要求登录或禁止抓取时，不要绕过限制。

**行业实践**

- awesome-mcp-servers 社区列表按类别索引第三方实现，并给出仓库地址。借鉴到你的项目：内部也维护一份白名单清单，标注采用状态与版本。
- npm 的 `@modelcontextprotocol` 命名空间搜索页可以按包名检索。借鉴到你的项目：选包前先看该包的最后发布时间与 README 完整度。
- 需核对官方文档：PostgreSQL 服务器当前的默认返回行数与可配置项名称。

**小结**

1. 画廊只做索引，采用前必须读源码与权限声明。
2. 带写操作的服务器要额外加审计日志与人工确认环节。
3. 版本号写死，避免自动升级带来行为变化。

## 5. 服务器配置与安装：位置、字段与插值

**先想一个问题**

你写好了配置，重启客户端却提示服务器启动失败。多数情况下问题不在服务器代码，而在配置项的位置或环境变量没有解析出来。

**心智模型**

!!! tip "心智模型"
    - 一句话模型：配置块是一张启动清单，客户端照着它拼命令、设环境变量、拉起进程。
    - 日常类比：像给外卖下单，菜名是包名，备注是参数，收货地址是工作目录，写错一项就送不到。
    - 类比不成立的地方：外卖平台会校验地址格式并给出提示，而配置文件是纯文本，写错字段名通常不会报错，只会被静默忽略。

**图解**

```mermaid
sequenceDiagram
    participant U as "配置文件"
    participant C as "MCP 客户端"
    participant E as "环境变量"
    participant P as "服务器进程"
    U->>C: "读取 mcpServers 配置块"
    C->>E: "按名称取值并做插值"
    E->>C: "返回变量值或默认值"
    C->>P: "拼出 command 与 args 并 spawn"
    P->>C: "初始化完成并返回能力列表"
    C->>U: "启动失败时记录到日志"
```

1. 客户端启动时读取配置文件，定位 `mcpServers` 键。
2. 对每个服务器条目，取 `env` 里的值并做 `${VAR}` 插值。
3. 插值来源是客户端进程的环境变量，缺失时按规则回退。
4. 用 `command` 和 `args` 拼出完整命令行，`spawn` 子进程。
5. 子进程完成初始化，客户端记录可用能力。
6. 任何一步失败，都会在客户端日志里留下一条错误记录。

**一步一步来**

第 1 步：确定配置写在哪一层。旧版内容记录了三个位置，实际路径需核对官方文档。

```text
全局      ~/.claude/settings.json
项目级    <project>/.claude/settings.json
工作区    .omc/settings.json
以上路径来自本页旧版内容，以原文为准，需核对官方文档
```

**这段代码在做什么**

- 全局配置对当前用户的所有项目生效。
- 项目级配置只对指定项目生效，便于团队共享同一份服务器清单。
- 工作区配置用于更细的目录范围。
- 三层同时存在时，覆盖顺序需核对官方文档，不要凭猜测排列。

第 2 步：写一个字段齐全的服务器条目。

```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": { "DATABASE_URL": "${DATABASE_URL:-postgresql://localhost:5432/db}" },
      "timeout": 30000,
      "restart": true,
      "maxRetries": 3
    }
  }
}
```

**这段代码在做什么**

- `command` 是可执行文件名，必须是 PATH 里能找到的程序。
- `args` 是参数数组，每一项单独成串，不要把整条命令写成一个字符串。
- `env` 里的值支持 `${VAR:-default}` 形式，变量不存在时用默认值。
- `timeout` 是启动超时毫秒数，`restart` 控制失败后是否重启，`maxRetries` 是最大重试次数。

第 3 步：把密钥放进 `.env` 并确保不提交到仓库。

```bash
# .env 文件内容（必须加入 .gitignore）
GITHUB_TOKEN=ghp_示例值
BRAVE_API_KEY=BSA示例值
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
```

**这段代码在做什么**

- 三条变量名与配置里的插值名一一对应。
- 值只写在本地文件，配置文件里保留 `${...}` 占位。
- 第一行注释说明文件必须进 `.gitignore`。
- 示例值用占位串，避免把真实令牌粘进文档。

**动手验证**

```js
// resolve-config.mjs
// 依赖：无。运行：node resolve-config.mjs
import assert from 'node:assert/strict';

// 插值规则：${VAR} 取值，${VAR:-default} 取默认值，都缺失时返回空字符串
function interpolate(text, source) {
  return text.replace(/\$\{([A-Z0-9_]+)(:-([^}]*))?\}/g, (match, name, _, fallback) => {
    const value = source[name];
    if (value !== undefined && value !== '') return value;
    if (fallback !== undefined) return fallback;
    return '';
  });
}

const env = { GITHUB_TOKEN: 'ghp_demo' };

assert.equal(interpolate('${GITHUB_TOKEN}', env), 'ghp_demo');
assert.equal(interpolate('${MISSING}', env), '');
assert.equal(interpolate('${MISSING:-500}', env), '500');
assert.equal(interpolate('${MISSING:-postgresql://localhost:5432/db}', env),
  'postgresql://localhost:5432/db');

const raw = {
  mcpServers: {
    github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_TOKEN}' } },
    postgres: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: { DATABASE_URL: '${DATABASE_URL:-postgresql://localhost:5432/db}', MAX_ROWS: '500' },
      timeout: 30000, restart: true, maxRetries: 3 },
  },
};

const resolved = JSON.parse(interpolate(JSON.stringify(raw), env));
assert.equal(resolved.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN, 'ghp_demo');
assert.equal(resolved.mcpServers.postgres.env.DATABASE_URL, 'postgresql://localhost:5432/db');
assert.equal(resolved.mcpServers.postgres.env.MAX_ROWS, '500');
assert.equal(resolved.mcpServers.postgres.timeout, 30000);
assert.equal(resolved.mcpServers.postgres.maxRetries, 3);

for (const [name, item] of Object.entries(resolved.mcpServers)) {
  console.log(`${name}: ${item.command} ${item.args.join(' ')}`);
}
console.log('通过: 插值、默认值回退与字段保留都符合预期');
```

运行结果：

```text
github: npx -y @modelcontextprotocol/server-github
postgres: npx -y @modelcontextprotocol/server-postgres
通过: 插值、默认值回退与字段保留都符合预期
```

补充说明：本脚本把空字符串也视为未设置，这是脚本自身的约定，客户端对空字符串的处理需核对官方文档。

**常见坑**

| 现象 | 原因 | 怎么修 |
| :--- | :--- | :--- |
| 变量没生效，值为空串 | 变量名拼错，插值找不到对应项 | 用插值脚本先本地解析一遍，确认输出 |
| 密钥出现在代码评审里 | `.env` 未加入 `.gitignore` | 提交前用脚本扫描配置目录，发现明文令牌就拦截 |
| 服务器反复重启 | restart 打开且启动必然失败 | 先修报错再开 restart，或把 maxRetries 设为 1 便于观察 |
| 修改配置不生效 | 客户端未重载配置 | 重启客户端进程，并核对配置所在层级 |

**用在哪里**

1. 团队统一的开发环境配置模板
   - 业务背景：新同学入职要配一周环境。
   - 本节知识怎么用：把不含密钥的配置模板入库，密钥走本地 `.env`。
   - 用什么指标衡量收益：新同学从入职到跑通第一条问答的时间。
   - 什么时候不该用：团队用不同操作系统时，路径分隔符差异要单独处理。

2. CI 里的自动化检查
   - 业务背景：每次提交都要确认配置没有明文密钥。
   - 本节知识怎么用：在流水线里跑插值脚本，检测解析结果里是否出现明文令牌。
   - 用什么指标衡量收益：密钥泄露事件数与发现时间点前移程度。
   - 什么时候不该用：流水线本身不可信时，不要在其中打印解析后的完整配置。

3. 多项目共享的服务器清单
   - 业务背景：三个前端项目都要接同一套服务器。
   - 本节知识怎么用：把公共条目放全局配置，项目特有的放项目级配置。
   - 用什么指标衡量收益：重复配置条目的数量。
   - 什么时候不该用：各项目所需权限不同时，不要为了统一而共用令牌。

**行业实践**

- Claude Code 文档的 MCP 配置章节给出 mcpServers 的字段结构与配置位置。借鉴到你的项目：字段名以文档为准，不照抄博客。
- modelcontextprotocol/servers 仓库的 README 在配置示例里统一使用 env 传递令牌。借鉴到你的项目：内部约定所有敏感值只走 env。
- 需核对官方文档：`${VAR:-default}` 与 `${VAR}` 的插值语法是否为客户端官方支持，以及缺失变量的确切回退行为。

**小结**

1. 配置分三层，写之前先确认哪一层生效，避免改了没反应。
2. 插值只有两种形式，缺失变量的回退行为要先验证再依赖。
3. 启动选项 timeout、restart、maxRetries 用于提高可用性，调试阶段先关掉 restart。

## 6. 自定义 MCP 服务器开发：三类能力与实现骨架

**先想一个问题**

你要把公司内部的排班系统接给 AI 助手。系统没有现成服务器，得自己写。写之前要先决定：这个能力应该做成 tool、resource 还是 prompt。

!!! note "术语：tools、resources、prompts"
    MCP 把服务器能力分成三类。tool 是可被模型调用并产生副作用的动作，resource 是可被读取的数据，prompt 是可复用的提示模板。
    例子：查排班是 tool，班表原文是 resource，请模型分析排班冲突是 prompt。

**心智模型**

!!! tip "心智模型"
    - 一句话模型：tool 做事，resource 取数据，prompt 给模板，三者共用同一套 JSON-RPC 方法名。
    - 日常类比：像去餐厅，tool 是点单并让厨房做菜，resource 是菜单上的今日供应，prompt 是服务员递给你的推荐搭配话术。
    - 类比不成立的地方：餐厅里点单和看菜单是两套界面，而 MCP 三类能力走同一条连接、同一套消息格式。

**图解**

```mermaid
flowchart TB
    A["能力清单"] --> B["是否有副作用"]
    B -->|"有"| C["tools 工具"]
    B -->|"无"| D["是否是可读数据"]
    D -->|"是"| E["resources 资源"]
    D -->|"否"| F["prompts 提示模板"]
    C --> G["tools list 与 tools call"]
    E --> H["resources list 与 resources read"]
    F --> I["prompts list 与 prompts get"]
    G --> J["返回 contents 数组"]
    H --> J
    I --> J
    J --> K["传输层发送给客户端"]
```

1. 先给能力分类，判断标准是有无副作用。
2. 有副作用的放进 tools，对应 `tools/list` 与 `tools/call` 两个方法。
3. 无副作用的可读数据放进 resources，对应 `resources/list` 与 `resources/read`。
4. 可复用的提示文本放进 prompts，对应 `prompts/list` 与 `prompts/get`。
5. 三类方法的返回值都要包成统一结构再交给传输层。
6. 传输层负责按 stdio 或 HTTP 把结果发回去。

**一步一步来**

第 1 步：用 Python 的 FastMCP 写一个最小工具，感受三类能力的写法差异。

```python
# server.py 依赖 fastmcp，版本以本页旧版内容为准，需核对官方文档
from fastmcp import FastMCP

mcp = FastMCP(name="schedule-server", version="1.0.0")

@mcp.tool()
def query_shift(employee: str, date: str) -> dict:
    # 工具：查询某员工某天的班次，属只读动作
    return {"employee": employee, "date": date, "shift": "早班"}

@mcp.resource("config://schedule")
def schedule_config() -> str:
    # 资源：返回班表配置，客户端可主动读取
    return '{"timezone": "Asia/Shanghai"}'

@mcp.prompt()
def find_conflict(team: str) -> str:
    # 提示模板：生成一段分析排班冲突的指令文本
    return f"请检查 {team} 团队本周的排班冲突，列出冲突日期与人员。"

if __name__ == "__main__":
    mcp.run()  # 以 stdio 模式启动
```

**这段代码在做什么**

- `FastMCP` 实例承载服务器身份，名称与版本会随初始化返回给客户端。
- `@mcp.tool()` 把函数注册成工具，函数名就是工具名。
- `@mcp.resource()` 里带 `://` 的字符串是资源地址，客户端按地址读取。
- `@mcp.prompt()` 返回的是文本模板，客户端拿到后再交给模型。
- `mcp.run()` 默认以 stdio 方式启动，由客户端负责拉起进程。
- 依赖版本以本页旧版内容为准，需核对 FastMCP 官方文档。

第 2 步：用 TypeScript SDK 注册工具与处理器。下面写法来自本页旧版内容，方法名需核对官方文档。

```typescript
// src/index.ts 依赖 @modelcontextprotocol/sdk
import { MCPServer } from '@modelcontextprotocol/sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

const server = new MCPServer({ name: 'schedule-server', version: '1.0.0' });

// 注册工具列表：客户端调用 tools/list 时返回的元数据
server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'query_shift',
    description: '查询某员工某天的班次',
    inputSchema: {
      type: 'object',
      properties: { employee: { type: 'string' }, date: { type: 'string' } },
      required: ['employee', 'date'], // 未声明的参数模型可能传空
    },
  }],
}));

// 处理工具调用：按名字分发到具体实现
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params; // arguments 是保留字，需重命名
  if (name === 'query_shift') {
    return {
      contents: [{ type: 'text',
        text: JSON.stringify({ employee: args.employee, date: args.date, shift: '早班' }) }],
    };
  }
  throw new Error(`未知工具: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

**这段代码在做什么**

- `MCPServer` 构造参数里的 name 与 version 会出现在初始化响应中。
- `tools/list` 返回工具元数据，`inputSchema` 用 JSON Schema 描述参数。
- `required` 数组声明必填参数，漏掉会让模型传空值。
- `tools/call` 里必须用 `arguments: args` 重命名，因为 `arguments` 是 JS 保留字。
- 返回值外层固定为 `{ contents: [...] }`，直接返回裸字符串客户端无法解析。
- `connect` 建立会话后才能接收请求，需要 await。

第 3 步：在 NestJS 里把上面两段组织成可注入的服务。要点是注册表与分发器分开。

```typescript
@Injectable()
export class McpService {
  private tools = new Map<string, unknown>();

  constructor() {
    this.registerTools(); // 先建注册表，再挂处理器
  }

  private registerTools() {
    this.tools.set('query_shift', { name: 'query_shift' });
    // tools/list 每次从 Map 快照，运行时增删工具会自动生效
    this.server.setRequestHandler('tools/list', async () => ({
      tools: Array.from(this.tools.values()),
    }));
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      return this.executeTool(name, args); // 未知工具在 executeTool 里抛错
    });
  }
}
```

**这段代码在做什么**

- `Map` 做名称到工具描述的注册表，查找是常数时间。
- 构造函数里先初始化 server 再注册工具，顺序颠倒会读到 undefined。
- `tools/list` 每次从 Map 取值，支持运行时动态增删工具。
- 分发集中在 `executeTool`，未知工具名在分发层抛错，不往下传。
- 用 `Map` 而不是数组，避免按名称查找时逐个遍历。

**动手验证**

```js
// tool-dispatcher.mjs
// 依赖：无。运行：node tool-dispatcher.mjs
import assert from 'node:assert/strict';

const registry = new Map();

function register(name, schema, handler) {
  registry.set(name, { name, schema, handler });
}

register('query_shift',
  { type: 'object', properties: { employee: { type: 'string' }, date: { type: 'string' } },
    required: ['employee', 'date'] },
  (args) => ({ employee: args.employee, date: args.date, shift: '早班' }));

register('count_shifts',
  { type: 'object', properties: { team: { type: 'string' } }, required: ['team'] },
  (args) => ({ team: args.team, total: 12 }));

function requiredOf(name) {
  const tool = registry.get(name);
  if (!tool) throw new Error(`未知工具: ${name}`);
  return tool.schema.required;
}

function dispatch(method, params = {}) {
  if (method === 'tools/list') {
    return { tools: Array.from(registry.values()).map((t) => ({ name: t.name, inputSchema: t.schema })) };
  }
  if (method === 'tools/call') {
    const tool = registry.get(params.name);
    if (!tool) throw new Error(`未知工具: ${params.name}`);
    const missing = requiredOf(params.name).filter((key) => params.arguments?.[key] === undefined);
    if (missing.length) throw new Error(`缺少必填参数: ${missing.join(', ')}`);
    return { contents: [{ type: 'text', text: JSON.stringify(tool.handler(params.arguments)) }] };
  }
  throw new Error(`未知方法: ${method}`);
}

const list = dispatch('tools/list');
assert.equal(list.tools.length, 2);

const called = dispatch('tools/call',
  { name: 'query_shift', arguments: { employee: '张三', date: '2025-03-01' } });
assert.equal(called.contents[0].type, 'text');
assert.equal(JSON.parse(called.contents[0].text).shift, '早班');

assert.throws(() => dispatch('tools/call', { name: '未知', arguments: {} }), /未知工具/);
assert.throws(() => dispatch('tools/call',
  { name: 'query_shift', arguments: { employee: '张三' } }), /缺少必填参数: date/);

console.log('工具数:', list.tools.length);
console.log('调用结果:', called.contents[0].text);
console.log('通过: 分发、必填校验与错误分支都符合预期');
```

运行结果：

```text
工具数: 2
调用结果: {"employee":"张三","date":"2025-03-01","shift":"早班"}
通过: 分发、必填校验与错误分支都符合预期
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| :--- | :--- | :--- |
| 模型传的参数总是缺字段 | inputSchema 没写 required | 把必填参数列进 required 数组 |
| 客户端解析失败 | 返回值写成裸字符串 | 外层固定包成 `{ contents: [...] }` |
| 新增工具后列表没变 | 处理器只绑定一次静态数组 | 每次调用时从注册表动态生成列表 |
| 出现未知方法错误 | 方法名大小写或拼写不一致 | 方法名以官方文档列出的一览为准 |

**用在哪里**

1. 内部排班系统的查询助手
   - 业务背景：门店店长要查本周谁上早班。
   - 本节知识怎么用：查班次做成 tool，班表原文做成 resource，冲突分析做成 prompt。
   - 用什么指标衡量收益：单次排班查询的操作步数与出错次数。
   - 什么时候不该用：要批量修改班表时，先做审批流程，别直接暴露写工具。

2. 发布流水线的状态查询
   - 业务背景：前端同学想知道某个分支的构建是否通过。
   - 本节知识怎么用：把构建状态查询做成只读 tool，参数是分支名。
   - 用什么指标衡量收益：查看构建状态的平均耗时与切换页面次数。
   - 什么时候不该用：允许助手直接触发发布时，风险高于收益。

3. 日志检索助手
   - 业务背景：线上问题排查要按时间范围捞日志。
   - 本节知识怎么用：日志检索做成 tool，日志文件地址做成 resource 模板。
   - 用什么指标衡量收益：从报障到定位到错误日志的时间。
   - 什么时候不该用：日志含用户隐私字段时，先做字段过滤再暴露。

**行业实践**

- FastMCP 文档的 Getting Started 章节给出 tool、resource、prompt 三类装饰器的用法。借鉴到你的项目：先按三类能力给需求分类，再写代码。
- MCP 官方 TypeScript SDK 的 README 提供 server 章节与传输层示例。借鉴到你的项目：把 SDK 版本写进 package.json，并在升级前跑一遍工具列表断言。
- 需核对官方文档：`MCPServer` 与 `setRequestHandler` 是否为当前 SDK 的推荐写法，以及新版本是否提供 `registerTool` 这类更高层封装。

**小结**

1. 三类能力的判断标准是有无副作用，判错会让只读数据变成可写动作。
2. 参数校验靠 inputSchema 的 required，返回值靠 contents 外壳，两处都不能省。
3. 注册表与分发器分开维护，新增工具时改动集中在一处。

## 7. 深入阅读与参考：把资料查对

**先想一个问题**

你从博客里抄了一份配置，跑不通。问题可能是博客写于旧版本。要判断资料是否过期，得先知道该查哪份原始文档。

**心智模型**

!!! tip "心智模型"
    - 一句话模型：原始文档管接口，参考实现管用法，社区清单管选型，三者顺序不能反。
    - 日常类比：像查药品说明，先看药厂说明书，再看药师笔记，最后看网友评价。
    - 类比不成立的地方：药品说明书有法规强制更新，开源文档的更新依赖维护者，旧版本内容可能长期挂在网上。

**图解**

```mermaid
flowchart TB
    A["遇到问题"] --> B["是接口名或字段名问题"]
    B -->|"是"| C["查官方文档对应章节"]
    B -->|"否"| D["是配置写法问题"]
    D -->|"是"| E["查参考服务器的 README"]
    D -->|"否"| F["是选型问题"]
    F -->|"是"| G["查服务器清单与社区列表"]
    C --> H["确认版本号后再动手"]
    E --> H
    G --> H
    H --> I["在测试环境复现一次"]
```

1. 先给问题定性，接口名问题查官方文档。
2. 配置写法问题查参考服务器的 README，那里有可直接运行的示例。
3. 选型问题查服务器清单与社区列表，看是否已有实现。
4. 三条路径都要落到具体版本号，避免抄到旧版本写法。
5. 最后在测试环境复现一次，确认结论成立。

**一步一步来**

第 1 步：记下协议版本矩阵，用版本号判断资料新旧。下表来自本页旧版内容，需核对官方文档。

```text
2024-11-05   当前版本，完整功能集
2024-10-07   旧版，基础功能
2024-09-03   已废弃，早期实现
以上状态来自本页旧版内容，以原文为准，需核对官方文档
```

**这段代码在做什么**

- 第一列是协议版本字符串，出现在 initialize 的响应里。
- 第二列是当时的维护状态，当前版本功能最全。
- 第三列标记已废弃，看到这类版本号说明资料过期。
- 状态会随官方发布变化，使用前需重新核对。

第 2 步：把版本判断写成可执行检查，避免靠肉眼比对。

```js
// 从 initialize 响应里读协议版本，与已知列表比对
const KNOWN = { '2024-11-05': 'current', '2024-10-07': 'legacy', '2024-09-03': 'deprecated' };
function describe(version) {
  const status = KNOWN[version];
  if (!status) return '未知版本，需核对官方文档';
  return status;
}
```

**这段代码在做什么**

- `KNOWN` 是版本到状态的映射，来源是本页旧版内容。
- `describe` 返回状态字符串，未知版本给出核对提示。
- 未知版本不直接判为错误，因为官方可能已发布新版本。
- 这个函数可以放进客户端的诊断脚本里。

第 3 步：按章节定位原文。

```text
要查协议本身            -> Model Context Protocol 官方文档的 Architecture 章节
要查服务器概念与方法名  -> Model Context Protocol 官方文档的 Server Concepts 章节
要查传输方式            -> Model Context Protocol 官方文档的 Transports 章节
要查参考实现            -> modelcontextprotocol/servers 仓库的 README 与各服务器目录
要查第三方清单          -> awesome-mcp-servers 社区列表
```

**这段代码在做什么**

- 前三行指向官方文档的三个章节，覆盖协议、能力、传输。
- 第四行指向参考实现仓库，示例代码在这里。
- 第五行指向社区清单，用于选型检索。
- 全部只写名称与章节名，不写具体链接。

**动手验证**

```js
// check-version.mjs
// 依赖：无。运行：node check-version.mjs
import assert from 'node:assert/strict';

const KNOWN = {
  '2024-11-05': 'current',
  '2024-10-07': 'legacy',
  '2024-09-03': 'deprecated',
};
// 状态来自本页旧版内容，以原文为准，需核对官方文档

function describe(version) {
  if (!version) return '缺少 protocolVersion 字段';
  const status = KNOWN[version];
  return status ? status : '未知版本，需核对官方文档';
}

assert.equal(describe('2024-11-05'), 'current');
assert.equal(describe('2024-09-03'), 'deprecated');
assert.equal(describe('2099-01-01'), '未知版本，需核对官方文档');
assert.equal(describe(undefined), '缺少 protocolVersion 字段');

const responses = [
  { server: 'filesystem', protocolVersion: '2024-11-05' },
  { server: 'legacy-tool', protocolVersion: '2024-09-03' },
  { server: 'new-tool', protocolVersion: '2099-01-01' },
];

for (const item of responses) {
  const status = describe(item.protocolVersion);
  console.log(`${item.server}: ${item.protocolVersion} -> ${status}`);
}
console.log('通过: 版本判定与未知版本提示都符合预期');
```

运行结果：

```text
filesystem: 2024-11-05 -> current
legacy-tool: 2024-09-03 -> deprecated
new-tool: 2099-01-01 -> 未知版本，需核对官方文档
通过: 版本判定与未知版本提示都符合预期
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| :--- | :--- | :--- |
| 抄的示例跑不通 | 资料基于已废弃版本 | 看示例里的协议版本字符串，不在已知列表就换资料 |
| 方法名报未知 | 版本间方法名有调整 | 以官方文档的 Server Concepts 章节为准核对方法名 |
| 按博客路径找不到配置文件 | 客户端版本与博客不同 | 以官方文档的配置章节为准核对路径 |

**用在哪里**

1. 技术选型评审
   - 业务背景：团队要决定是否引入 MCP 服务器接入内部系统。
   - 本节知识怎么用：先查官方文档与参考实现，用版本号判断资料有效性。
   - 用什么指标衡量收益：评审材料里引用原始文档的比例。
   - 什么时候不该用：只是临时脚本验证时，不必走完整评审流程。

2. 版本升级评估
   - 业务背景：客户端升级后原有服务器配置需要复查。
   - 本节知识怎么用：用版本检查脚本扫一遍所有服务器的初始化响应。
   - 用什么指标衡量收益：升级后出现兼容问题的服务器数量。
   - 什么时候不该用：测试环境无法复现生产配置时，先补齐环境再评估。

3. 新人上手的资料清单
   - 业务背景：新同学要快速搞清从哪里查资料。
   - 本节知识怎么用：把三条路径写成内部文档的第一页。
   - 用什么指标衡量收益：新同学提出基础问题前查阅文档的次数。
   - 什么时候不该用：内部文档与原始文档冲突时，以原始文档为准。

**行业实践**

- Model Context Protocol 官方文档按 Architecture、Server Concepts、Transports 等章节组织。借鉴到你的项目：内部 wiki 也按这三层组织链接，减少口径不一致。
- modelcontextprotocol/servers 仓库把服务器按目录分列，每个目录含独立 README 与源码。借鉴到你的项目：自建服务器目录里放一份 README 与演示脚本。
- 需核对官方文档：当前 Protocol Version 的最新取值与各版本的差异说明。

**小结**

1. 三份资料分工明确：官方文档管接口，参考实现管用法，社区清单管选型。
2. 判断资料新旧最快的方法是看里面的协议版本字符串。
3. 任何结论都要在测试环境复现一次再写进文档。

## 8. 应用与行业实践：从需求到上线

**先想一个问题**

助手在测试环境跑得很好，上线前一天有人问：它会不会把生产库的数据写到公网搜索服务里？这个问题要在接入前就有答案。

**心智模型**

!!! tip "心智模型"
    - 一句话模型：接入一个服务器等于给助手开一条通往某个系统的通道，通道的宽度由权限决定。
    - 日常类比：像给访客发门禁卡，卡能开哪扇门、能待多久，都要提前设定。
    - 类比不成立的地方：门禁卡由门禁系统统一发卡与回收，而 MCP 服务器的权限分散在令牌、账号权限、网络策略三处，任一处放宽都会放大范围。

**图解**

```mermaid
flowchart TB
    A["需求提出"] --> B["填需求卡：目标 数据范围 写操作"]
    B --> C["选服务器：官方 第三方 自建 自定义"]
    C --> D["定权限：令牌范围 账号只读 域名白名单"]
    D --> E["配审计：日志留存 写操作确认"]
    E --> F["测试环境跑通工具列表"]
    F --> G["上线检查清单"]
    G --> H["灰度到指定人员"]
    H --> I["按指标复盘"]
```

1. 需求先落成需求卡，明确目标、数据范围与是否有写操作。
2. 按需求卡选服务器，优先查现成实现。
3. 权限在三处收敛：令牌范围、数据库账号权限、网络域名白名单。
4. 带写操作的服务器必须配审计日志与人工确认。
5. 测试环境先跑通工具列表，确认工具名与参数符合预期。
6. 通过上线检查清单后灰度给指定人员，再按指标复盘。

**一步一步来**

第 1 步：写一份可执行的上线检查清单，把规则写成条件。

```json
{
  "checklist": [
    { "id": "token-in-env", "rule": "所有令牌使用变量插值，配置文件中无明文" },
    { "id": "readonly-first", "rule": "首次接入只开放只读能力" },
    { "id": "dir-whitelist", "rule": "文件系统服务器必须配置目录白名单" },
    { "id": "row-limit", "rule": "数据库服务器必须设置返回行数上限" },
    { "id": "audit-log", "rule": "写操作必须留存审计日志" }
  ]
}
```

**这段代码在做什么**

- 每条规则有 id 与说明，便于脚本逐条检查。
- `token-in-env` 针对配置文件泄露风险。
- `dir-whitelist` 与 `row-limit` 针对数据外泄与性能风险。
- `audit-log` 针对写操作不可追溯的问题。

第 2 步：把清单变成脚本，作为 CI 的一道关卡。

```js
// 读配置对象，逐条检查清单，返回未通过项
function runChecklist(config, checklist) {
  const failed = [];
  const text = JSON.stringify(config);
  for (const item of checklist) {
    if (item.id === 'token-in-env' && /ghp_[A-Za-z0-9]{8,}/.test(text)) failed.push(item.id);
    if (item.id === 'dir-whitelist' && config.mcpServers?.filesystem &&
        !config.mcpServers.filesystem.env?.ALLOWED_DIRECTORIES) failed.push(item.id);
    if (item.id === 'row-limit' && config.mcpServers?.postgres &&
        !config.mcpServers.postgres.env?.MAX_ROWS) failed.push(item.id);
  }
  return failed;
}
```

**这段代码在做什么**

- `JSON.stringify` 把配置转成文本，用正则扫描明文令牌形态。
- filesystem 条目存在时检查白名单字段是否填写。
- postgres 条目存在时检查返回行数上限是否填写。
- 返回未通过项数组，CI 里数组非空就中断构建。
- 正则只是形态匹配，真实项目里应配合密钥扫描工具。

**动手验证**

```js
// release-check.mjs
// 依赖：无。运行：node release-check.mjs
import assert from 'node:assert/strict';

const CHECKLIST = [
  { id: 'token-in-env', rule: '令牌使用变量插值' },
  { id: 'dir-whitelist', rule: '文件系统服务器配置目录白名单' },
  { id: 'row-limit', rule: '数据库服务器设置返回行数上限' },
];

function runChecklist(config) {
  const failed = [];
  const text = JSON.stringify(config);
  if (/ghp_[A-Za-z0-9]{8,}/.test(text)) failed.push('token-in-env');
  const servers = config.mcpServers || {};
  if (servers.filesystem && !servers.filesystem.env?.ALLOWED_DIRECTORIES) failed.push('dir-whitelist');
  if (servers.postgres && !servers.postgres.env?.MAX_ROWS) failed.push('row-limit');
  return failed;
}

const good = {
  mcpServers: {
    filesystem: { command: 'npx', args: ['-y', 'pkg'], env: { ALLOWED_DIRECTORIES: '/workspace' } },
    postgres: { command: 'npx', args: ['-y', 'pkg'], env: { DATABASE_URL: '${DATABASE_URL}', MAX_ROWS: '500' } },
  },
};
assert.deepEqual(runChecklist(good), []);

const leaky = {
  mcpServers: {
    github: { command: 'npx', args: ['-y', 'pkg'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_abcdefgh1234' } },
    filesystem: { command: 'npx', args: ['-y', 'pkg'] },
  },
};
const failed = runChecklist(leaky);
assert.deepEqual(failed.sort(), ['dir-whitelist', 'token-in-env']);

console.log('合格配置未通过项:', runChecklist(good).length);
console.log('风险配置未通过项:', failed.join(', '));
console.log('通过: 清单检查结果与预期一致');
```

运行结果：

```text
合格配置未通过项: 0
风险配置未通过项: dir-whitelist, token-in-env
通过: 清单检查结果与预期一致
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| :--- | :--- | :--- |
| 上线后才发现越权读文件 | 上线前没跑清单检查 | 把清单脚本接进 CI，配置变更时自动拦截 |
| 助手误执行写操作 | 首次接入就开放全部工具 | 首版只暴露只读工具，写工具单独评审 |
| 出问题时找不到调用记录 | 未留存审计日志 | 写操作前后各记一条日志，包含工具名与参数摘要 |
| 灰度范围失控 | 检查通过后直接对全员开放 | 先按人员名单灰度，观察指标后再扩大 |

**用在哪里**

1. AI 编程助手的代码库接入
   - 业务背景：团队要把助手接到主仓库，辅助改代码与查历史。
   - 本节知识怎么用：首版只开 filesystem 只读与 Git 查询，白名单限定仓库目录。
   - 用什么指标衡量收益：代码检索耗时与提交前检查次数。
   - 什么时候不该用：仓库含生产密钥时，先把密钥移出仓库再接。

2. 企业知识库问答
   - 业务背景：员工问内部流程与制度细节。
   - 本节知识怎么用：企业自建服务器只读查询文档库，按部门做权限过滤。
   - 用什么指标衡量收益：内部提问的响应时间与转人工比例。
   - 什么时候不该用：文档含未公开的财务数据时，先做分级授权。

3. 运营自动化助手
   - 业务背景：运营要把日报数据汇总后发到群。
   - 本节知识怎么用：PostgreSQL 只读取数，Slack 服务器只发目标频道，写操作加确认。
   - 用什么指标衡量收益：日报制作的人工耗时与推送错误次数。
   - 什么时候不该用：日报含用户明细时，只推送汇总口径。

**行业实践**

- modelcontextprotocol/servers 仓库为每个服务器给出所需环境变量与权限说明。借鉴到你的项目：接入前把权限范围抄进评审单，逐项签字确认。
- GitHub 官方文档的令牌权限章节建议按最小范围签发。借鉴到你的项目：为助手单独建机器账号，与个人账号分离，便于回收。
- 需核对官方文档：当前是否提供请求日志或审计能力的配置项，以及日志字段的格式。

**小结**

1. 接入前先填需求卡，写操作与只读操作走不同评审路径。
2. 权限在三处同时收敛：令牌、账号、网络，缺一处都会放大范围。
3. 上线检查清单写成脚本接进 CI，比人工核对稳定。

## 应用地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| :--- | :--- | :--- | :--- |
| 本地代码库问答助手 | 官方服务器、stdio 传输 | server-filesystem 加白名单目录 | 排除含密钥的目录 |
| Issue 自动分诊 | 官方服务器、令牌权限 | server-github 只读令牌 | 只读场景不给 repo 写权限 |
| 组件选型资料检索 | 官方服务器、配额限制 | server-brave-search | 关注免费额度上限 |
| 值班频道通知 | 第三方服务器、写操作审计 | server-slack 加审计日志 | 只授予目标频道权限 |
| 运营数据取数 | 第三方服务器、返回行数限制 | server-postgres 加 MAX_ROWS | 账号只读，生产库单独评审 |
| 内部系统能力接入 | 自定义服务器、三类能力划分 | FastMCP 或官方 SDK | 首版只暴露只读工具 |
| 团队统一配置管理 | 配置位置与插值 | 全局配置加本地 .env | .env 必须进 .gitignore |
| 上线前风险拦截 | 上线检查清单 | 清单脚本接进 CI | 清单要随新增服务器同步更新 |

## 动手作业

目标：为一个虚构的内部"会议室预订查询"系统写出可运行的 MCP 服务器骨架，并配套一份配置与一份检查脚本。

步骤：

1. 写需求卡，包含 goal、dataScope、existingSystem、writeOperation 四个字段，写出你选择的服务器类别与理由。
2. 用第 6 节的 `tool-dispatcher.mjs` 为模板，注册两个工具：`list_rooms`（无参数）与 `query_booking`（必填参数 room 与 date）。
3. 按第 5 节的配置结构写出 `mcpServers` 条目，令牌走 `${MEETING_TOKEN}` 插值，并设置 timeout 与 maxRetries。
4. 用第 5 节的插值逻辑写一个脚本，把配置解析成最终对象并打印。
5. 用第 8 节的检查清单脚本扫描你的配置，确认没有明文令牌。

验收标准：

- `node tool-dispatcher.mjs` 输出工具数为 2，缺少必填参数时抛出包含参数名的错误。
- 插值脚本对 `${MEETING_TOKEN}` 能取到值，对未设置变量返回空字符串。
- 检查清单脚本对你的配置返回空数组。
- 需求卡里写出的类别与你在配置里实际使用的服务器类型一致。
- 三个脚本都能在 Node 20 下用 `node 文件名` 直接运行，不需要额外依赖。

## 综合对比

| 维度 | 官方服务器 | 第三方服务器 | 企业自建服务器 | 完全自定义服务器 |
| :--- | :--- | :--- | :--- | :--- |
| 维护方 | Anthropic 官方 | 社区开发者 | 公司内部团队 | 你所在的团队 |
| 起手成本 | 装包加配置即可 | 装包加配置，可能要读源码 | 需要开发与部署 | 需要开发、部署与长期维护 |
| 权限控制粒度 | 由环境变量与令牌决定 | 由环境变量与令牌决定 | 可做到字段级与接口级 | 可做到字段级与接口级 |
| 数据出网情况 | 按服务器类型不同 | 按服务器类型不同 | 可完全不出网 | 可完全不出网 |
| 升级风险 | 官方发布节奏统一 | 依赖作者活跃度，风险较高 | 由内部排期控制 | 由内部排期控制 |
| 适合场景 | 文件、GitHub、搜索、Git | Slack、数据库、HTTP 请求 | 内部系统且数据敏感 | 能力特殊且无现成实现 |
| 需要重点核对 | 包名与令牌权限 | 源码与权限声明 | 内部接口鉴权方式 | 协议方法与返回结构 |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MCP 规范](https://modelcontextprotocol.io/specification) | transport 与 lifecycle 决定服务器能否被正确连接与关闭。 | 读 transport 与 lifecycle 两章，对照自己的实现检查初始化握手与资源释放是否合规。 |
| [MCP 规范（最新版本）](https://modelcontextprotocol.io/specification/latest) | 看清协议版本变更，避免 SDK 与规范不一致的坑。 | 翻版本变更记录，核对你所用 SDK 声明的协议版本与文档是否对得上。 |
| [MCP 架构概念](https://modelcontextprotocol.io/docs/learn/architecture) | 三类能力的边界是设计服务器时最先要定的东西。 | 对照 tools、resources、prompts，为你的场景各举一例，判断该暴露成哪一类。 |
| [MCP Tools 概念](https://modelcontextprotocol.io/docs/concepts/tools) | tool 描述与 schema 质量直接决定模型能否正确调用。 | 为一个真实 API 写 tool schema，补全描述与输入校验，再用 Inspector 试调。 |
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | TS SDK 的 README 是最短的服务器上手路径。 | 按 README 搭一个 stdio 服务器，先连 Inspector，再接入本地客户端。 |
| [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) | FastMCP 让 Python 开发者几行代码就能起一个服务器。 | 用 FastMCP 写一个数据库查询工具，注意参数校验，再用 Inspector 验证。 |
| [MCP Inspector](https://github.com/modelcontextprotocol/inspector) | 能直接看到工具调用收发的原始 JSON-RPC 消息。 | 启动服务器后用 Inspector 连接，逐个调用工具，观察请求与响应字段。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MCP 官方服务器集合](https://github.com/modelcontextprotocol/servers) | 官方服务器实现是学写 server 最规范、最可读的范例。 | 读 filesystem 服务器的工具注册与参数校验部分，然后仿写一个只读文件工具。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp) | 跑通一次完整接入，能快速建立对服务器用法的直觉。 | 跟着步骤接入 filesystem 或 GitHub 服务器完成一次读写，再回想请求链路。 |
| [MCP 入门介绍](https://modelcontextprotocol.io/docs/getting-started/intro) | 用最短篇幅讲清 host、client、server 三层关系。 | 读完后画出三层关系图，标出一次工具调用在图中经过的每个节点。 |
| [Hugging Face MCP 课程](https://huggingface.co/learn/mcp-course/unit0/introduction) | 课程结构完整，边学边写，适合零基础系统入门。 | 完成第一单元的服务器构建练习并跑通，再回看规范中对应章节。 |
| [Hugging Face MCP Course](https://huggingface.co/learn/mcp-course) | 同时实现服务器与客户端，理解两端各自的职责边界。 | 先写服务器再写客户端，跑通一次工具调用，记录两端分别做了什么。 |

## 自测题

??? question "MCP 生态里的四类服务器分别由谁维护"
    官方服务器由 Anthropic 官方维护，覆盖文件系统、GitHub、搜索、Git 等高频场景。第三方服务器由社区开发者发布，通常会打包到 npm 或开源在 GitHub。企业自建服务器由公司内部团队维护，用于内网系统。完全自定义服务器由你所在团队从零开发，用于能力特殊的场景。

??? question "stdio 和 HTTP 加 SSE 两种传输该怎么选"
    stdio 走父子进程管道，适合本地工具与含密钥的场景，密钥与文件都留在本机。HTTP 加 SSE 走网络，适合多客户端共享与浏览器接入。判断顺序是：数据是否允许出网，其次是有无多个客户端复用。远程传输当前推荐的具体方案需核对官方文档。

??? question "文件系统服务器的白名单为什么必须配置"
    旧版内容记录默认禁止所有目录访问，且不支持符号链接遍历。不配白名单会直接读取失败，而不是读到多余文件。配置时把允许目录写进 env 或启动参数，多个目录用冒号分隔。含密钥的目录要从白名单中排除。

??? question "配置里的 ${VAR:-default} 是什么意思"
    这是环境变量插值语法，变量存在时取变量值，不存在时取冒号后的默认值。`${VAR}` 形式在变量不存在时按旧版内容返回空字符串。两种语法的确切行为需核对官方文档。实际使用前先用本地脚本解析一遍，确认输出符合预期。

??? question "GitHub 服务器的令牌权限该怎么给"
    旧版内容列出 repo、read:user、write:discussion 三项权限。只做只读查询时不要给 repo 写权限。建议为助手单独签发一个机器账号令牌，与个人令牌隔离，便于回收。具体权限组合需核对 GitHub 官方文档。

??? question "PostgreSQL 服务器的 MAX_ROWS 解决什么问题"
    它限制单次查询返回的行数，旧版内容记录默认值为 100。不限制时一次查询可能拉回整张表，把生产库拖慢。除了设置 MAX_ROWS，数据库账号也应配置为只读。字段名与默认值需核对官方文档。

??? question "自定义服务器里 tools、resources、prompts 怎么区分"
    判断标准是有无副作用。有副作用的动作放进 tools，对应 tools/list 与 tools/call。可读数据放进 resources，对应 resources/list 与 resources/read。可复用的提示模板放进 prompts，对应 prompts/list 与 prompts/get。三类返回值都要包成统一结构。

??? question "接入新服务器前应该做哪些检查"
    先填需求卡，明确目标、数据范围、已存在系统与是否有写操作。再确认权限在三处收敛：令牌范围、账号权限、网络白名单。带写操作的服务器要配审计日志与人工确认。最后用检查清单脚本扫一遍配置，确认没有明文令牌。

## 延伸阅读

- Model Context Protocol 官方文档：Architecture 章节
- Model Context Protocol 官方文档：Server Concepts 章节
- Model Context Protocol 官方文档：Transports 章节
- modelcontextprotocol/servers 仓库：README 与各服务器子目录
- @modelcontextprotocol/sdk 包 README：Server 章节
- FastMCP 文档：Getting Started 章节
- awesome-mcp-servers 社区列表：分类索引部分
- 需核对官方文档：当前 Protocol Version 的最新取值与各版本差异
