---
title: "pgvector 从零开始：在 PostgreSQL 里做向量检索"
description: "安装、数据类型、距离运算符与第一个语义搜索"
---

# pgvector 从零开始：在 PostgreSQL 里做向量检索

!!! abstract "学完这一页你能"
    - 在 PostgreSQL 里完成 `CREATE EXTENSION` 并核对版本与升级路径。
    - 区分 `vector`、`halfvec`、`bit`、`sparsevec` 四种类型并说出各自上限与存储字节数。
    - 根据业务场景在 L2、内积、余弦、L1 之间做出选择并写出对应 SQL。
    - 用 Node 的 `pg` 客户端完成建表、写入、精确检索与 HNSW 近似检索，并能定位三类常见错误。

## 0. 知识地图

```mermaid
flowchart TD
    A["为什么需要 pgvector"] --> B["安装与启用"]
    B --> C["数据类型"]
    C --> D["距离运算符"]
    D --> E["建表与写入"]
    E --> F["精确检索"]
    F --> G["近似检索"]
    G --> H["Node 客户端实战"]
    H --> I["常见坑与调试"]
    D --> G
    C --> G
```

建议按从上到下、从左到右的顺序读。前四节解决「是什么、怎么选」，第五节到第八节解决「怎么写、怎么跑」，最后一节用来排查问题。如果只想快速上手，可以先读第五节和第八节，遇到报错再回到第九节。

## 1. 为什么需要 pgvector：把向量检索放进 PostgreSQL

**先想一个问题**

你已经有一个 PostgreSQL 商品库，里面存了商品标题和描述。用户搜索「冬天穿的轻便外套」，SQL 的 `LIKE '%外套%'` 只能匹配到字面相同的词，搜不到「羽绒服」「冲锋衣」这些语义相近的商品。怎么办？

**心智模型**

!!! tip "心智模型"
    一句话模型：pgvector 给 PostgreSQL 增加了一个 `vector` 列类型和一组距离运算，让 SQL 能按「语义距离」排序。日常类比：就像给 Excel 加了一个函数，输入两个数值数组就能返回它们的相似度。类比不成立的地方：Excel 函数只算两个格子，pgvector 要在百万行上按这个函数排序，所以后面需要专门的近似索引。

**图解**

```mermaid
flowchart LR
    A["用户查询"] --> B["嵌入模型生成查询向量"]
    A --> C["数据库已有向量列"]
    B --> D["PostgreSQL 计算距离"]
    C --> D
    D --> E["按距离排序返回前 K 条"]
```

1. 用户输入自然语言查询，例如「冬天穿的轻便外套」。
2. 应用调用嵌入模型，把查询文本转成一个固定维度的浮点数组。
3. 数据库里每一行已经存好了对应内容的向量列。
4. pgvector 计算查询向量与每行向量的距离。
5. SQL 按距离从小到大排序，返回最相近的前 K 行。

**一步一步来**

第一步：确认向量检索解决了什么问题。

```sql
-- 假设商品表里已有向量列 embedding
-- 用户查询先被嵌入模型转为向量 '[0.2, -0.1, 0.5]'
SELECT title
FROM products
ORDER BY embedding <-> '[0.2, -0.1, 0.5]'
LIMIT 5;
```

**这段代码在做什么**

- `<->` 是 pgvector 提供的 L2 距离运算符，计算两个向量的欧几里得距离。
- `ORDER BY embedding <-> 查询向量` 表示按距离升序排列，距离越小越相似。
- `LIMIT 5` 只返回最相近的 5 条，避免把整张表都返回给应用。
- 向量必须由外部嵌入模型生成，pgvector 只负责存储和检索，不负责生成向量。

**动手验证**

```js
// verify_why_pgvector.mjs
// 依赖：npm install pg
// 前置：本机 PostgreSQL 已启动，数据库 testdb 已存在，已执行 CREATE EXTENSION vector;
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/testdb',
});
await client.connect();

// 建一个最小的表并插入两条向量
await client.query('DROP TABLE IF EXISTS why_demo');
await client.query('CREATE TABLE why_demo (id int, embedding vector(3))');
await client.query(
  "INSERT INTO why_demo VALUES (1, '[1,2,3]'), (2, '[4,5,6]')",
);

const { rows } = await client.query(
  "SELECT id FROM why_demo ORDER BY embedding <-> '[3,1,2]' LIMIT 1",
);
console.log('最近的一行 id:', rows[0].id);
console.log('预期输出: 最近的一行 id: 1');
console.log('验证通过：pgvector 距离查询可运行');

await client.end();
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 执行 `<->` 报 `operator does not exist` | 没有安装 pgvector 扩展 | 在数据库执行 `CREATE EXTENSION vector;` |
| 查询能跑但结果明显不相关 | 嵌入模型与业务语言不匹配 | 换用中文嵌入模型，例如 BGE-M3 或 Qwen3-Embedding |
| 第一次查很慢 | 表上没有索引，走了全表扫描 | 先确认数据量，百万级以内可以接受；更大数据量看第 7 节 |

**用在哪里**

- 电商商品搜索：业务背景是用户用自然语言描述需求。用本节的向量距离排序替代纯关键词匹配，让语义相近的商品浮上来。衡量收益的指标是点击率和搜索转化率。当商品量小于几千且用户习惯精确关键词搜索时，不该引入向量检索。
- 文档知识库问答：业务背景是客服系统需要从历史文档找答案。把文档块嵌入成向量再按距离检索，替代人工整理 FAQ。衡量指标是答案命中率和人工转接率。当文档总量小于 200K token 时，直接放进大模型上下文更省事（来源：Anthropic 官方文章，以原文为准）。
- 图片相似推荐：业务背景是用户上传一张图找相似商品。用图片嵌入模型生成向量再查库。衡量指标是推荐点击率。当业务不需要语义相似而只用颜色或类目过滤时，不该用向量检索。
- 招聘简历匹配：业务背景是 HR 输入职位描述找匹配简历。把职位和简历都嵌入成向量。衡量指标是面试转化率。当简历字段高度结构化且用 SQL 条件就能覆盖时，向量检索不是第一优先级。

**行业实践**

- Supabase 在其向量检索文档里把 pgvector 作为默认选项，并给出不同计算规格下的 QPS 基准。可以借鉴的点是：选型前先定义召回率和 QPS 目标，再按数据量选择实例大小（来源：Supabase 官方文档，以原文为准）。
- Neon 在 pgvector 扩展文档里提供 HNSW 与 IVFFlat 的权衡表。可以借鉴的是：在托管 Postgres 上直接启用 pgvector，不必单独部署向量数据库（来源：Neon 官方文档，以原文为准）。
- Anthropic 在其 Contextual Retrieval 文章中提出，小于约 200K token 的知识库不需要向量检索，直接放进上下文即可。可以借鉴的是：在引入 pgvector 前先估算语料规模，避免为小知识库过度设计（来源：Anthropic 官方文章，以原文为准）。

**小结**

- pgvector 只负责存储和检索，嵌入向量必须由外部模型生成。
- 向量检索的价值在于语义相近，而不是字面匹配。
- 数据量小、结构清晰时先考虑 SQL 条件过滤，不必一上来就用向量。

## 2. 安装与启用：CREATE EXTENSION 与版本检查

**先想一个问题**

你拿到一个新的 PostgreSQL 数据库，想在里面存向量。第一个操作是什么？如果版本不对，后续建索引可能报错。怎么确认装的是哪个版本？

**心智模型**

!!! tip "心智模型"
    一句话模型：`CREATE EXTENSION` 把 pgvector 的代码库加载进当前数据库，像给一个应用安装插件。日常类比：就像浏览器装一个扩展，装完当前站点才能用。类比不成立的地方：PostgreSQL 扩展是每个数据库单独安装的，不是整个实例全局共享。

**图解**

```mermaid
flowchart TD
    A["数据库实例"] --> B["数据库 db1"]
    A --> C["数据库 db2"]
    B --> D["CREATE EXTENSION vector"]
    C --> E["未安装扩展"]
    D --> F["db1 可用 vector 类型"]
    E --> G["db2 不可用 vector 类型"]
```

1. PostgreSQL 实例下面可以创建多个数据库。
2. 对 `db1` 执行 `CREATE EXTENSION vector`，加载扩展文件。
3. `db1` 里可以使用 `vector` 类型和距离运算符。
4. `db2` 没有执行扩展安装，无法使用 `vector` 类型。

**一步一步来**

第一步：安装扩展。

```sql
CREATE EXTENSION vector;
```

**这段代码在做什么**

- `CREATE EXTENSION` 是 PostgreSQL 的标准扩展安装语句。
- `vector` 是 pgvector 扩展的名字。
- 需要数据库用户有创建扩展的权限，通常需要超级用户或具备 `CREATE` 权限。
- 安装后当前数据库内才有 `vector` 类型。

第二步：查看版本。

```sql
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

**这段代码在做什么**

- `pg_extension` 是 PostgreSQL 系统表，记录当前数据库已安装的扩展。
- `extversion` 列保存扩展版本字符串。
- 资料显示 pgvector README 当前版本是 0.8.7（来源：pgvector 官方 README，以原文为准）。
- 如果结果为空，说明当前数据库没装扩展。

运行结果：`0.8.7`（具体以你本地安装为准）。

第三步：升级版本。

```sql
ALTER EXTENSION vector UPDATE;
```

**这段代码在做什么**

- 把已安装的 pgvector 升级到二进制文件里最新的可用版本。
- 升级后可以再查 `extversion` 确认版本变化。
- README 明确给出这条升级语句（来源：pgvector 官方 README，以原文为准）。
- 升级不是自动发生的，需要手动执行。

**动手验证**

```js
// verify_extension.mjs
// 依赖：npm install pg
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/testdb',
});
await client.connect();

// 确保扩展存在；若已存在会忽略
await client.query('CREATE EXTENSION IF NOT EXISTS vector');

const { rows } = await client.query(
  "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
);
console.log('pgvector 版本:', rows[0].extversion);
console.log('预期输出: pgvector 版本: 0.8.7 或你本机安装的版本');
console.log('验证通过：扩展已启用，版本查询成功');

await client.end();
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| `permission denied to create extension` | 当前角色权限不足 | 用超级用户或授权角色执行 |
| `extension "vector" has no update path` | 二进制文件比已安装版本更旧 | 先升级 pgvector 二进制，再执行 `ALTER EXTENSION` |
| 新建一个数据库后 `vector` 类型消失 | 扩展按数据库安装 | 对每个需要的数据库执行 `CREATE EXTENSION` |

**用在哪里**

- 多租户 SaaS 的隔离数据库：业务背景是每个租户一个数据库。每个新租户库都要执行 `CREATE EXTENSION vector`，可以在初始化脚本里自动执行。衡量指标是租户库初始化成功率。当所有租户共享一个库时，不需要重复安装。
- 数据分析师的独立实验库：业务背景是分析团队想在临时库里做语义聚类。单独安装扩展不影响生产库。衡量指标是实验库搭建时间。当只是临时查验且不想留下扩展时，用一次性迁移脚本即可。
- 测试环境与生产环境一致性：业务背景是测试库行为必须和生产一致。把 `CREATE EXTENSION` 写进迁移文件保证环境差异最小。衡量指标是测试环境部署失败次数。当用全托管云数据库且默认已启用扩展时，这一步可跳过。
- 升级演练环境：业务背景是生产库需要从旧版 pgvector 升级。先在演练库执行 `ALTER EXTENSION vector UPDATE` 观察是否报错。衡量指标是升级回滚次数。当跨多个大版本升级时，需要先查官方升级说明而不是直接更新。

**行业实践**

- Supabase 托管平台已经在托管 Postgres 里启用 pgvector，用户直接建表即可。可以借鉴的是：把扩展安装移到平台层，应用开发者不用关心环境差异（来源：Supabase 官方文档，以原文为准）。
- Neon 提供 pgvector 扩展支持，并在文档里给出 HNSW 与 IVFFlat 的参数建议。可以借鉴的是：托管环境优先看「已集成扩展」列表，不要自己编译（来源：Neon 官方文档，以原文为准）。
- AWS Aurora PostgreSQL 支持 pgvector 0.8.0 及以上，并发布过迭代扫描性能改进说明。可以借鉴的是：生产升级前先读云厂商的扩展兼容性说明，再做演练（来源：AWS 数据库博客，以原文为准）。

**小结**

- `CREATE EXTENSION vector;` 是每个数据库单独执行的第一条命令。
- 用 `pg_extension` 表可以核对版本。
- 升级需要手动执行 `ALTER EXTENSION vector UPDATE;`。

## 3. 数据类型：vector、halfvec、bit、sparsevec

**先想一个问题**

你的嵌入模型是 OpenAI text-embedding-3-small，输出 1536 维浮点向量。你还可以用 BGE-M3 输出 1024 维。存储这两种向量应该用同一种类型吗？如果向量里大部分是 0，有没有更省的存法？

**心智模型**

!!! tip "心智模型"
    一句话模型：不同向量类型是在「存储精度」和「空间占用」之间做取舍。日常类比：就像存照片，RAW 格式最精确但占空间，JPEG 更省但会损失一点细节。类比不成立的地方：数据库向量类型的取舍还影响查询速度和索引维度上限，不只是文件大小。

!!! note "术语：维度"
    维度指一个向量里浮动的数字个数，例如 `[1,2,3]` 是 3 维。嵌入模型输出的维度固定，例如 OpenAI text-embedding-3-small 默认输出 1536 维。

**图解**

```mermaid
flowchart TD
    A["嵌入向量"] --> B["维度是否超过 2000"]
    B -->|"否"| C["是否对内存敏感"]
    B -->|"是"| D["用 halfvec 表达式索引或 bit 量化"]
    C -->|"否"| E["vector"]
    C -->|"是"| F["halfvec"]
    A --> G["向量是否大量元素为 0"]
    G -->|"是"| H["sparsevec"]
    B -->|"极大维度且可二值化"| I["bit"]
```

1. 先看维度是否超过普通索引上限 2000 维。
2. 维度不超过 2000 且内存不紧张，用 `vector`。
3. 维度高或内存敏感，用 `halfvec` 表达式索引。
4. 向量大量元素为 0，用 `sparsevec` 节省空间。
5. 极大维度且允许二值化，用 `bit` 类型配合量化函数。

**一步一步来**

第一步：建表时指定类型和维度。

```sql
CREATE TABLE embeddings (
  id bigserial PRIMARY KEY,
  vec vector(1536),
  half halfvec(1536),
  bits bit(64),
  sparse sparsevec(100)
);
```

**这段代码在做什么**

- `vector(1536)` 声明一个 1536 维的浮点向量列，类型定义里写死维度。
- `halfvec(1536)` 用半精度浮点存储，同样 1536 维但每维只占 2 字节。
- `bit(64)` 存 64 维的二进制向量，每维只有 0 或 1。
- `sparsevec(100)` 声明最多 100 个非零元素的稀疏向量，维度由写入时的下标个数决定。

第二步：写入不同类型的数据。

```sql
INSERT INTO embeddings (vec, half, bits, sparse)
VALUES (
  '[0.1, -0.2, 0.3]',
  '[0.1, -0.2, 0.3]',
  '101',
  '{3:0.9, 17:-0.5}/100'
);
```

**这段代码在做什么**

- `vector` 用单引号包裹方括号数组，例如 `'[0.1, -0.2, 0.3]'`。
- `halfvec` 的写入格式与 `vector` 相同，只是内部存储用半精度。
- `bit` 类型的值写成 `'101'`，表示第 0 位是 1、第 1 位是 0、第 2 位是 1（示例只展示格式，真实需补齐维度）。
- `sparsevec` 格式是 `{下标:值, 下标:值}/总维度`，花括号里列非零元素。

**动手验证**

```js
// verify_types.mjs
// 依赖：npm install pg
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/testdb',
});
await client.connect();
await client.query('CREATE EXTENSION IF NOT EXISTS vector');
await client.query('DROP TABLE IF EXISTS type_demo');
await client.query(
  'CREATE TABLE type_demo (id int, v vector(3), h halfvec(3), s sparsevec(5))',
);
await client.query(
  "INSERT INTO type_demo VALUES (1, '[1,2,3]', '[1,2,3]', '{1:0.5,3:0.8}/5')",
);
const { rows } = await client.query('SELECT * FROM type_demo');
console.log('查询结果:', rows[0]);
console.log('预期输出: 查询结果: { id: 1, v: [1,2,3], h: [1,2,3], s: {1:0.5,3:0.8}/5 }');
console.log('验证通过：四种类型的写入与读取格式正确');

await client.end();
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 插入 `vector(3)` 列时写入 2 维数组 | 数组长度和列定义不一致 | 检查嵌入输出维度，写入前断言数组长度 |
| `sparsevec` 写入报格式错误 | 花括号或斜杠格式不对 | 按 `{下标:值}/总维度` 格式写 |
| 把 `bit` 类型当成整数位运算 | `bit` 类型用于 Hamming 距离 | 只有做二值量化检索时才用 `bit` |

**用在哪里**

- 电商商品嵌入存储：业务背景是商品数很大，每个商品的嵌入向量需要长期保存。用 `vector(1536)` 存 OpenAI 模型输出。衡量指标是存储空间和查询延迟。当向量维度超过 2000 时，改用 `halfvec` 表达式索引（来源：pgvector 官方 README，以原文为准）。
- 移动端本地检索：业务背景是设备存储有限，需要把向量压缩。用 `halfvec` 把 1536 维向量从 4 字节压缩到 2 字节每维。衡量指标是存储减少比例和召回损失。当精度损失导致召回明显下降时，不该用半精度。
- 大规模二值特征检索：业务背景是特征可以表示为 0/1，例如用户点击过哪些商品。用 `bit` 类型配合 Hamming 距离。衡量指标是内存占用和查询吞吐。当特征不能明确二值化时，不该强行用 `bit`。
- 用户兴趣稀疏向量：业务背景是用户画像里只有少数几个兴趣标签活跃，大部分为空。用 `sparsevec` 只存非零元素。衡量指标是存储占用。当向量里非零元素比例很高时，`sparsevec` 反而开销更大。

**行业实践**

- OpenAI 官方嵌入文档说明 text-embedding-3-small 默认输出 1536 维，large 输出 3072 维，并支持 `dimensions` 参数缩短维度。可以借鉴的是：选定嵌入模型后先固定维度，再建表（来源：OpenAI 官方文档，以原文为准）。
- BGE-M3 官方模型卡说明该模型输出 1024 维稠密向量，同时支持稀疏和多向量检索。可以借鉴的是：如果用 BGE-M3，就用 1024 维定义列，并在评估后决定是否混合稀疏向量（来源：BAAI 官方 HuggingFace 模型卡，以原文为准）。
- pgvector 官方 README 说明 `vector` 和 `halfvec` 最大 16000 维，`bit` 最大 64000 维，`sparsevec` 最多 16000 个非零元素。可以借鉴的是：建表前查阅官方维度上限，避免生产环境写到一半报错（来源：pgvector 官方 README，以原文为准）。

**小结**

- `vector` 是默认选择，存储浮点数组，维度上限 16000。
- `halfvec` 用一半存储省空间，`bit` 适合二值特征，`sparsevec` 适合稀疏向量。
- 类型选择要在建表时定死，后续换类型需要重写数据。

## 4. 距离运算符：L2、内积、余弦、L1

**先想一个问题**

你已经建好了向量列，查询时到底写 `<->` 还是 `<#>` 还是 `<=>`？这几种运算符有什么区别？如果选错了，推荐结果会变得离谱。

**心智模型**

!!! tip "心智模型"
    一句话模型：距离运算符衡量两个向量「差多少」，不同的衡量方式适合不同的嵌入模型训练目标。日常类比：判断两个城市「近不近」，可以看直线距离、高速里程数或飞行时间，三种度量在不同场景下会给出不同答案。类比不成立的地方：向量距离的选择不只看业务直觉，还必须与嵌入模型的训练目标一致。

**图解**

```mermaid
flowchart TD
    A["嵌入模型训练目标"] --> B["模型是否输出已经归一化的向量"]
    B -->|"是，余弦相似度训练"| C["用余弦距离 <=>"]
    B -->|"否，L2 训练"| D["用 L2 距离 <->"]
    B -->|"模型用点积训练"| E["用负内积 <#>"]
    A --> F["只需要曼哈顿距离"] --> G["用 L1 距离 <+>"]
```

1. 先查嵌入模型文档，确认它用什么损失函数或相似度训练。
2. OpenAI text-embedding-3 系列通常配合余弦相似度使用，查询用 `<=>`（资料未明确写出训练目标，这里写为工程建议，需核对官方文档）。
3. 如果模型输出没有归一化，用 L2 距离 `<->` 更稳定。
4. 如果模型用点积训练，用负内积 `<#>`，注意取内积时要乘 -1。
5. L1 距离 `<+>` 用曼哈顿距离，适合某些对异常值不敏感的场景。

**一步一步来**

第一步：计算同两个向量的四种距离。

```sql
SELECT
  '[1,2,3]'::vector <-> '[3,2,1]'::vector AS l2,
  '[1,2,3]'::vector <#> '[3,2,1]'::vector AS neg_inner,
  '[1,2,3]'::vector <=> '[3,2,1]'::vector AS cosine,
  '[1,2,3]'::vector <+> '[3,2,1]'::vector AS l1;
```

**这段代码在做什么**

- `<->` 计算欧几里得距离，值越小越相近。
- `<#>` 返回负内积，值越小表示内积越大、越相似。
- `<=>` 返回余弦距离，等于 1 减去余弦相似度，值越小越相似。
- `<+>` 计算曼哈顿距离，即各维度差值的绝对值之和。

运行结果：`l2` 约为 `2.828`，`neg_inner` 为 `-10`，`cosine` 约为 `0.429`，`l1` 为 `4`。

第二步：在检索里使用距离排序。

```sql
SELECT id
FROM items
ORDER BY embedding <=> '[3,2,1]'::vector
LIMIT 5;
```

**这段代码在做什么**

- `ORDER BY` 后面写向量列与查询向量的距离。
- `LIMIT 5` 返回距离最小的 5 行。
- 查询向量也写成 `::vector` 显式声明类型。
- 距离运算符与后面的索引运算符类必须匹配，否则索引不会被使用。

**动手验证**

```js
// verify_distance.mjs
// 依赖：npm install pg
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/testdb',
});
await client.connect();
await client.query('CREATE EXTENSION IF NOT EXISTS vector');

const { rows } = await client.query(`
  SELECT
    '[1,2,3]'::vector <-> '[3,2,1]'::vector AS l2,
    '[1,2,3]'::vector <#> '[3,2,1]'::vector AS neg_inner,
    '[1,2,3]'::vector <=> '[3,2,1]'::vector AS cosine,
    '[1,2,3]'::vector <+> '[3,2,1]'::vector AS l1
`);
console.log('L2:', rows[0].l2);
console.log('负内积:', rows[0].neg_inner);
console.log('余弦距离:', rows[0].cosine);
console.log('L1:', rows[0].l1);
console.log('预期输出: L2 约 2.828，负内积 -10，余弦距离约 0.429，L1 为 4');
console.log('验证通过：四种距离运算符计算正确');

await client.end();
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 内积结果为正数但想找最相似却排到后面 | `<#>` 返回负内积 | `ORDER BY` 按 `<#>` 升序即可，或显式乘 -1 得到真实内积 |
| 余弦距离结果大于 1 | 数据库不要求向量归一化 | 写入前应用层归一化，或确认模型已归一化 |
| 手工记混 `<->` 和 `<=>` 导致结果不同 | 两种距离定义不同 | 根据模型文档选定一个，并在代码注释里写死 |

**用在哪里**

- 语义搜索排序：业务背景是用文本嵌入做搜索，多数模型按余弦相似度训练。用 `<=>` 做排序。衡量指标是搜索点击率。当模型文档明确要求内积时，改用 `<#>`。
- 图片相似度检索：业务背景是图片嵌入向量通常比较模长，查询用余弦距离更稳定。衡量指标是推荐点击率。当向量模长差异很大时，不该用 L2 距离。
- 推荐系统召回：业务背景是用户向量和物品向量都用点积训练。用 `<#>` 排序，内积越大越相关。衡量指标是召回率和点击率。当模型不是点积训练时，用 `<#>` 会得到错误排序。
- 空间坐标最近邻：业务背景是地图里点坐标是真实的欧几里得坐标。用 `<->` 找空间最近点。衡量指标是距离误差。当坐标维度超过 2000 且需要建索引时，要换类型或量化。

**行业实践**

- OpenAI 嵌入文档长期使用余弦相似度作为示例计算方式。可以借鉴的是：用 OpenAI 模型时默认 `<->` 与 `<=>` 都可排序，但归一化后用内积和余弦等价，工程上统一用 `<=>` 更直观（来源：OpenAI 官方文档，以原文为准）。
- pgvector 官方 README 列出四种距离运算符的完整语法，并注明 `<#>` 是负内积。可以借鉴的是：代码评审时核对 README 里的运算符表，避免笔误（来源：pgvector 官方 README，以原文为准）。
- BGE-M3 官方模型卡推荐混合检索加重排，说明其稠密向量可用余弦相似度。可以借鉴的是：模型卡里写「推荐相似度」时直接沿用，不要在未验证时换度量（来源：BAAI 官方 HuggingFace 模型卡，以原文为准）。

**小结**

- 四种距离运算符分别对应欧几里得、负内积、余弦、曼哈顿距离。
- 距离值越小越相似，排序时统一 `ORDER BY ... LIMIT k`。
- 选择距离必须与嵌入模型训练目标一致，不能只凭业务直觉。

## 5. 建表与写入：DDL 与 INSERT 的完整 SQL

**先想一个问题**

你有一批商品描述和对应的嵌入向量，要写进数据库。建表时向量列怎么写？批量插入一条 SQL 插多行时语法有什么注意点？如果数组写错一个字符，整条插入会失败。

**心智模型**

!!! tip "心智模型"
    一句话模型：向量列是普通列的一种，写入时用字符串常量表示数组。日常类比：就像 Excel 表加一列「坐标」，每条记录填一个数组字符串，建表时给这个列限定长度。类比不成立的地方：数据库会做维度校验，长度不对会直接拒绝写入，而不是 Excel 里的静默截断。

**图解**

```mermaid
flowchart LR
    A["建表 DDL"] --> B["定义向量列"]
    B --> C["向量列带维度约束"]
    A --> D["生成嵌入向量"]
    D --> E["应用层序列化成字符串"]
    E --> F["INSERT 写入"]
    F --> G["PostgreSQL 校验维度"]
```

1. 先写建表语句，向量列指定类型和维度。
2. 应用层调用嵌入模型生成向量数组。
3. 把数组转成 pgvector 的字符串格式。
4. 用 `INSERT` 写入，数据库做类型转换。
5. 如果数组长度不等于列定义维度，写入直接报错。

**一步一步来**

第一步：建表。

```sql
CREATE TABLE products (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  embedding vector(1536) NOT NULL
);
```

**这段代码在做什么**

- `bigserial` 是自增主键，适合商品表这类需要唯一 ID 的场景。
- `title` 是商品标题，普通文本列。
- `embedding vector(1536)` 定义固定 1536 维的向量列。
- `NOT NULL` 防止写入缺失向量的行，保证检索时每行都可计算距离。

第二步：写入一行。

```sql
INSERT INTO products (title, embedding)
VALUES (
  '冬季轻便外套',
  '[0.1, -0.2, 0.3, ...]'  -- 实际应写满 1536 个数字
);
```

**这段代码在做什么**

- `INSERT INTO` 指定列名，避免列顺序变化导致写入错位。
- `embedding` 列的值写成单引号包裹的方括号数组字符串。
- 省略号只是示意，真实写入必须正好 1536 个数字。
- pgvector 会把字符串解析成 `vector(1536)` 类型。

第三步：批量写入多行。

```sql
INSERT INTO products (title, embedding)
VALUES
  ('冬季轻便外套', '[0.1, -0.2, 0.3]'),
  ('春夏运动鞋', '[0.4, 0.5, -0.6]');
```

**这段代码在做什么**

- 多行值用逗号分隔，一条 SQL 写多行。
- 写入前先在应用层生成每个标题对应的嵌入向量。
- 如果其中一行维度不符，整条 SQL 失败。
- 批量写入比逐行插入减少网络往返和事务开销。

**动手验证**

```js
// verify_ddl_insert.mjs
// 依赖：npm install pg
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/testdb',
});
await client.connect();
await client.query('CREATE EXTENSION IF NOT EXISTS vector');
await client.query('DROP TABLE IF EXISTS products_demo');
await client.query(
  'CREATE TABLE products_demo (id bigserial PRIMARY KEY, title text, embedding vector(3))',
);
await client.query(
  "INSERT INTO products_demo (title, embedding) VALUES ('外套', '[1,2,3]'), ('运动鞋', '[4,5,6]')",
);
const { rows } = await client.query('SELECT title, embedding FROM products_demo ORDER BY id');
console.log('写入行数:', rows.length);
console.log('第一行:', rows[0].title, rows[0].embedding);
console.log('预期输出: 写入行数: 2，第一行: 外套 [1,2,3]');
console.log('验证通过：建表与批量插入成功');

await client.end();
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 插入报 `expected 3 dimensions, not 2` | 向量字符串长度与列维度不符 | 写入前在应用层用断言检查数组长度 |
| 字符串里的数字之间少了逗号 | 拼字符串时格式错误 | 用 JSON 数组先序列化再替换方括号为 pgvector 格式 |
| 批量插入一条失败全部失败 | PostgreSQL 事务默认原子性 | 在应用层先校验所有向量维度，再一次性写入 |

**用在哪里**

- 电商商品批量导入：业务背景是运营批量上传商品并生成嵌入。一次写入几十到几百行。衡量指标是导入耗时和失败率。当商品嵌入需要实时逐条生成时，批量写入不是瓶颈。
- 客服知识库初始化：业务背景是知识库文档切块后一次性写入向量。用批量插入完成初始化。衡量指标是导入耗时。当文档块需要边生成边写入时，用分批提交而不是一条超长 SQL。
- 推荐系统物品向量更新：业务背景是物品向量每天更新一次。用事务包裹多行写入保证一致性。衡量指标是更新失败率和耗时。当写入频率极高且行数很大时，用 COPY 或专用管道更合适。
- 测试数据构造：业务背景是开发阶段需要造一批有标注的向量数据。写一个批量插入脚本来生成可复现的测试集。衡量指标是测试集生成时间。当测试数据需要随机性且量大时，用程序生成再导入。

**行业实践**

- Supabase 官方文档展示从嵌入生成到写入的完整流程，把向量作为普通列的写入方式。可以借鉴的是：在应用层统一封装写入函数，集中处理维度校验（来源：Supabase 官方文档，以原文为准）。
- Neon 文档建议先导入数据再建索引，尤其 IVFFlat 需要已有数据做训练。可以借鉴的是：初始化阶段先写入全部向量，再建近似索引（来源：Neon 官方文档，以原文为准）。
- pgvector 官方 README 的 SQL 示例直接展示 `CREATE TABLE` 和 `INSERT` 的最小用法。可以借鉴的是：写最小可运行示例来验证环境，再扩展业务表（来源：pgvector 官方 README，以原文为准）。

**小结**

- 建表时 `vector(N)` 的 N 必须与嵌入模型输出维度一致。
- 向量值用单引号包裹数组字符串，多行插入用逗号分隔。
- 写入前在应用层校验维度，可以减少数据库报错。

## 6. 精确检索：暴力扫描与 ORDER BY 距离

**先想一个问题**

你有一万条商品向量，查询时没建任何索引，数据库会怎么找到最近邻？这种「笨办法」在什么数据量下可以接受？什么时候会变得不可用？

**心智模型**

!!! tip "心智模型"
    一句话模型：精确检索就是计算查询向量与表中每一行的距离，再排序取前 k。日常类比：在书架上找内容相关的一页，把每页都读一遍再比较。类比不成立的地方：数据库的暴力扫描是并行的、有 SIMD 加速，但复杂度依然是 O(n)，n 很大时依然慢。

**图解**

```mermaid
flowchart LR
    A["查询向量"] --> B["遍历表中每一行"]
    B --> C["计算 L2 或余弦距离"]
    C --> D["把距离记录到临时结果"]
    D --> E["按距离升序排序"]
    E --> F["返回前 K 行"]
```

1. 数据库读取整张表，逐行取出向量列。
2. 对每行都计算与查询向量的距离。
3. 每个距离值与行 ID 一起保留。
4. 全部算完后按距离排序。
5. 只返回距离最小的前 K 行。

**一步一步来**

第一步：在无索引表上做精确检索。

```sql
SELECT id, title
FROM products_demo
ORDER BY embedding <-> '[3,2,1]'
LIMIT 3;
```

**这段代码在做什么**

- 没有索引时，PostgreSQL 对每行执行一次距离计算。
- `ORDER BY` 触发排序，排序键是每行的距离值。
- `LIMIT 3` 在排序完成后才生效，不是提前截断。
- 数据量小于几万行时，这种查询通常能在几十毫秒内完成。

第二步：用 `EXPLAIN` 看执行计划。

```sql
EXPLAIN ANALYZE
SELECT id FROM products_demo
ORDER BY embedding <-> '[3,2,1]'
LIMIT 3;
```

**这段代码在做什么**

- `EXPLAIN ANALYZE` 会真实执行查询并返回扫描方式与耗时。
- 无索引时计划显示 `Seq Scan`，即全表顺序扫描。
- 计划里的 `Sort` 节点说明数据库在排序距离。
- 精确检索没有召回率损失，结果就是全局最相近的 k 行。

**动手验证**

```js
// verify_exact_search.mjs
// 依赖：npm install pg
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/testdb',
});
await client.connect();
await client.query('CREATE EXTENSION IF NOT EXISTS vector');
await client.query('DROP TABLE IF EXISTS exact_demo');
await client.query('CREATE TABLE exact_demo (id int, embedding vector(3))');
await client.query(
  "INSERT INTO exact_demo VALUES (1, '[1,2,3]'), (2, '[4,5,6]'), (3, '[3,2,1]'), (4, '[7,8,9]')",
);

const { rows } = await client.query(
  "SELECT id FROM exact_demo ORDER BY embedding <-> '[3,2,1]' LIMIT 2",
);
console.log('最近 2 行 id:', rows.map((r) => r.id));
console.log('预期输出: 最近 2 行 id: [ 3, 1 ]');
console.log('验证通过：精确检索按距离正确排序');

await client.end();
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 百万行下表上精确检索需要数秒 | 暴力扫描复杂度 O(n) | 数据量大时改用近似索引，见第 7 节 |
| 执行计划出现 `Seq Scan` 但没走索引 | 没建索引或运算符类不匹配 | 检查索引定义里的 ops 名称与查询运算符一致 |
| 结果似乎是错的 | 查询向量维度或格式不对 | 打印查询向量数组并核对维度 |

**用在哪里**

- 小规模商品库的精确最近邻：业务背景是商品量在几千到几万，暴力扫描足够快。用本节的 SQL 直接查。衡量指标是查询延迟，通常在几十毫秒内。当商品量超过十万且延迟要求高时，改用近似索引。
- 数据标注工具里的样本排查：业务背景是标注人员想看与某条样本最像的 10 条。精确检索保证结果准确。衡量指标是人工排查耗时。当样本数量极大且允许召回损失时，不该用精确检索。
- 回归测试的基线对比：业务背景是测试近似检索的准确性。先用精确检索得到真实最近邻，再对比近似结果。衡量指标是召回率。当测试集本身很小且只有几十条时，精确检索是唯一正确基线。
- 研发环境快速验证排序逻辑：业务背景是开发阶段先跑通排序再调索引。精确检索逻辑简单，容易排查问题。衡量指标是开发调试时间。当生产环境已经上近似索引时，开发环境也要建同样的索引验证。

**行业实践**

- sqlite-vec 的 README 明确说明其默认是暴力扫描，项目定位为嵌入式本地检索。可以借鉴的是：小数据量场景暴力扫描是合理默认，不必为索引复杂度买单（来源：sqlite-vec 官方 README，以原文为准）。
- ann-benchmarks 项目在多个数据集上测 recall 与 QPS，把暴力扫描结果作为召回率 1.0 的基线。可以借鉴的是：团队做选型时先跑暴力基线，再衡量近似索引的召回损失（来源：ann-benchmarks 官方仓库，以原文为准）。
- pgvector 官方 README 提供精确检索 SQL 作为最小示例。可以借鉴的是：所有复杂索引开始前，先用这个 SQL 确认数据与距离都正确，再调索引（来源：pgvector 官方 README，以原文为准）。

**小结**

- 精确检索扫描全部行，召回率是 1.0。
- 万级到十万级数据通常可以接受暴力扫描。
- 用 `EXPLAIN ANALYZE` 可以确认是否走了顺序扫描。

## 7. 近似检索：HNSW 与 IVFFlat 索引

**先想一个问题**

你的商品表到了百万行，暴力扫描每次要几百毫秒甚至几秒，已经超出搜索框的响应预算。怎么在「查询速度」和「召回准确性」之间做取舍？HNSW 和 IVFFlat 该选哪个？

**心智模型**

!!! tip "心智模型"
    一句话模型：近似索引先用少量距离计算筛掉大部分候选，只对一小部分行算精确距离，从而用很小的召回损失换数量级的速度提升。日常类比：找城市里最近的医院，不用测量全城每一栋楼，先看地图上几个重点区域的医院再比较。类比不成立的地方：近似索引的筛选不是靠地理直觉，而是靠图结构或聚类，且召回损失由参数控制。

!!! note "术语：召回率"
    召回率指近似检索返回的结果里，真正属于精确最近邻集合的比例。例如精确检索前 10 名里有 8 个出现在近似检索前 10 名，则召回率为 0.8。

**图解**

```mermaid
flowchart TD
    A["建近似索引"] --> B["HNSW 建多层图"]
    A --> C["IVFFlat 先聚类再扫簇"]
    B --> D["查询从上层图开始跳"]
    C --> E["查询只扫若干簇"]
    D --> F["返回候选后排序"]
    E --> F
    F --> G["输出前 K 行"]
```

1. HNSW 在写入数据时构建多层邻近图。
2. IVFFlat 在已有数据上做 k-means 聚类，把向量分到若干簇。
3. HNSW 查询时从上层图开始快速跳转，缩小候选范围。
4. IVFFlat 查询时只扫 `probes` 个最近的簇。
5. 两种方式都得到少量候选，最后精确排序返回前 K 行。

**一步一步来**

第一步：建 HNSW 索引。

```sql
CREATE INDEX ON items USING hnsw (embedding vector_l2_ops)
WITH (m = 16, ef_construction = 64);
SET hnsw.ef_search = 100;
```

**这段代码在做什么**

- `USING hnsw` 指定 HNSW 图索引。
- `vector_l2_ops` 是运算符类，必须与查询用的 `<->` 一致。
- `m = 16` 是每个节点的最大连接数，官方默认值（来源：pgvector 官方 README，以原文为准）。
- `ef_construction = 64` 控制建图时的候选队列长度，官方默认值。
- `SET hnsw.ef_search = 100` 增加查询时的候选数，提高召回但稍慢。

第二步：建 IVFFlat 索引。

```sql
CREATE INDEX ON items USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100);
SET ivfflat.probes = 10;
```

**这段代码在做什么**

- `USING ivfflat` 指定 IVF 倒排索引。
- `lists = 100` 是聚类数，官方推荐小于等于 100 万行时用 `rows / 1000`（来源：pgvector 官方 README，以原文为准）。
- `SET ivfflat.probes = 10` 设置查询时扫描的簇数量。
- IVFFlat 需要先有数据再建索引，因为构建过程依赖 k-means 训练数据。

第三步：验证索引是否被使用。

```sql
EXPLAIN ANALYZE
SELECT id FROM items
ORDER BY embedding <-> '[3,2,1]'
LIMIT 5;
```

**这段代码在做什么**

- 执行计划里如果出现 `Index Scan` 字样，说明走了近似索引。
- `EXPLAIN ANALYZE` 显示实际耗时，用于对比建索引前后的差距。
- 如果计划仍是 `Seq Scan`，检查运算符与运算符类是否匹配。
- 近似索引带了候选截断，召回率低于 1.0，但查询通常快一到两个数量级。

**动手验证**

```js
// verify_hnsw.mjs
// 依赖：npm install pg
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/testdb',
});
await client.connect();
await client.query('CREATE EXTENSION IF NOT EXISTS vector');
await client.query('DROP TABLE IF EXISTS hnsw_demo');
await client.query('CREATE TABLE hnsw_demo (id int, embedding vector(3))');
// 插入少量演示数据
for (let i = 0; i < 100; i++) {
  await client.query(
    `INSERT INTO hnsw_demo VALUES (${i}, '[${i}, ${i + 1}, ${i + 2}]')`,
  );
}
// 先有数据再建 HNSW 索引；演示数据少，HNSW 建索引仍可执行
await client.query(
  'CREATE INDEX ON hnsw_demo USING hnsw (embedding vector_l2_ops)',
);
const { rows } = await client.query(
  "SELECT id FROM hnsw_demo ORDER BY embedding <-> '[50,51,52]' LIMIT 3",
);
console.log('近似检索前 3 个 id:', rows.map((r) => r.id));
console.log('预期输出: 近似检索前 3 个 id: [ 50, 49, 48 ]');
console.log('验证通过：HNSW 索引建立并可用于查询');

await client.end();
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 建 IVFFlat 索引时表为空，后续查询效果差 | IVFFlat 需要已有数据训练聚类 | 先导入数据再建索引（来源：Neon 官方文档，以原文为准） |
| 建了索引但查询走 `Seq Scan` | 运算符与索引 ops 不匹配 | 查询用 `<->` 就必须建 `vector_l2_ops` |
| 过滤条件导致返回行数少于 LIMIT | ANN 先取候选，再应用 WHERE 过滤 | 开迭代扫描或使用部分索引（来源：pgvector 官方 README，以原文为准） |

**用在哪里**

- 电商商品搜索的近似检索：业务背景是百万级商品向量，每查询要求 P95 延迟在几十毫秒。用 HNSW 索引替代暴力扫描。衡量指标是 P95 延迟和召回率。当商品量只有几万时，精确检索已足够，不必上 HNSW。
- 内容推荐系统的召回层：业务背景是几千万条内容需要快速召回候选。先用 IVFFlat 召回几百条，再用高精度分数重排。衡量指标是召回层的 QPS。当索引内存超出单机预算时，HNSW 可能不合适，因为图索引内存占用高（来源：Neon 官方文档，以原文为准）。
- 多租户知识库的隔离检索：业务背景是不同租户的向量必须隔离。用部分索引或分区配合近似索引，保证租户 A 查不到租户 B。衡量指标是租户隔离的准确率。当租户数很少时，用普通索引加 WHERE 过滤即可。
- 文档问答的候选召回：业务背景是知识库文档块需要快速召回 100 条再重排。HNSW 提供低延迟候选集，后续交给 cross-encoder。衡量指标是召回率和重排后的命中率。当文档块小于 200K token 时，直接进上下文更省（来源：Anthropic 官方文章，以原文为准）。

**行业实践**

- Neon 官方文档给出 HNSW 与 IVFFlat 的权衡表：HNSW 速度-召回折中更好，但建索引更慢、内存更高；IVFFlat 建索引更快、内存更少。可以借鉴的是：内存充足且查询频繁时选 HNSW，内存紧张时选 IVFFlat（来源：Neon 官方文档，以原文为准）。
- Supabase 官方基准显示，在 1M 条 1536 维向量上，HNSW 在召回 0.99 时达到 2200 QPS，IVFFlat 在 40 probes 召回 0.98 时只有 670 QPS。需要标明这是厂商数据，谨慎引用。可以借鉴的是：自己的数据上必须复测，厂商 QPS 只能做初始档位参考（来源：Supabase 官方文档，以原文为准）。
- AWS 数据库博客称 pgvector 0.8.0 的迭代扫描「最高 9x 查询更快、100x 结果更相关」，这是厂商营销口径，需引用原文限定条件。可以借鉴的是：过滤强且有近似索引时，开启 `hnsw.iterative_scan` 做实验对比（来源：AWS 数据库博客，以原文为准）。

**小结**

- HNSW 查询快、内存在、建索引慢；IVFFlat 内存省、建索引快、同召回下查询较慢。
- 查询运算符必须与索引 ops 匹配。
- 近似索引会降低召回率，用 `ef_search` 或 `probes` 调节速度和召回权衡。

## 8. Node 客户端实战：用 pg 客户端写入与查询

**先想一个问题**

你已经在 SQL 工具里跑通了向量查询，现在要在 Node 后端用代码完成同样的事情。怎么用 `pg` 客户端连接、写入向量、执行查询？如果查询字符串写错了，会报什么错？

**心智模型**

!!! tip "心智模型"
    一句话模型：Node 的 `pg` 客户端把 SQL 语句作为字符串发给 PostgreSQL，需要你处理连接、参数化、错误和结果集。日常类比：用快递单把物品寄出去，快递单就是 SQL，物品就是参数。类比不成立的地方：SQL 字符串是代码的一部分，不是运行时才生成的普通数据，必须防止注入和格式错误。

**图解**

```mermaid
sequenceDiagram
    participant N as "Node 应用"
    participant P as "PostgreSQL"
    N->>P: "发送连接请求"
    P-->>N: "连接建立"
    N->>P: "发送 INSERT SQL 与向量字符串"
    P-->>N: "返回行数"
    N->>P: "发送 SELECT 查询"
    P-->>N: "返回结果集"
    N->>P: "关闭连接"
```

1. Node 应用先建立与 PostgreSQL 的连接。
2. 应用发送插入语句，把向量数组转换成 pgvector 字符串格式。
3. PostgreSQL 校验并写入数据，返回影响行数。
4. 应用发送查询语句，带上查询向量。
5. PostgreSQL 返回结果集，应用取 `rows` 数组处理。

**一步一步来**

第一步：连接数据库。

```js
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/testdb',
});
await client.connect();
```

**这段代码在做什么**

- `import pg from 'pg'` 引入 pg 客户端库，需要先 `npm install pg`。
- `new Client` 创建一个连接客户端。
- `connectionString` 用标准 Postgres 连接串，示例账号密码为本地开发默认值。
- `await client.connect()` 建立连接，完成后才能发送 SQL。

第二步：写入向量数据。

```js
const title = '冬季外套';
// 真实场景下 embedding 来自嵌入模型输出
const embedding = [0.1, -0.2, 0.3];
const vecString = `[${embedding.join(',')}]`;

await client.query(
  'INSERT INTO products_demo (title, embedding) VALUES ($1, $2::vector)',
  [title, vecString],
);
```

**这段代码在做什么**

- `embedding.join(',')` 把数组转成 pgvector 需要的逗号分隔字符串。
- `$1` 和 `$2` 是参数化占位符，防止 SQL 注入。
- `$2::vector` 显式告诉数据库把字符串解析成 vector 类型。
- `client.query` 第二个参数是参数数组，按顺序对应占位符。

第三步：执行检索查询。

```js
const queryVec = [3, 2, 1];
const qString = `[${queryVec.join(',')}]`;

const { rows } = await client.query(
  `SELECT id, title FROM products_demo
   ORDER BY embedding <-> $1::vector
   LIMIT 3`,
  [qString],
);
console.log(rows);
```

**这段代码在做什么**

- 查询向量也转成字符串，并用参数化传入。
- SQL 里的 `$1::vector` 接收参数并转成向量类型。
- `ORDER BY embedding <-> 查询向量` 按距离升序排序。
- 返回的 `rows` 是数组，每个元素是行对象，可直接发给前端。

**动手验证**

```js
// verify_node_pg.mjs
// 依赖：npm install pg
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/testdb',
});
await client.connect();
await client.query('CREATE EXTENSION IF NOT EXISTS vector');
await client.query('DROP TABLE IF EXISTS node_demo');
await client.query('CREATE TABLE node_demo (id bigserial PRIMARY KEY, title text, embedding vector(3))');

const data = [
  ['外套', [1, 2, 3]],
  ['运动鞋', [4, 5, 6]],
  ['手套', [3, 2, 1]],
];
for (const [title, emb] of data) {
  await client.query(
    'INSERT INTO node_demo (title, embedding) VALUES ($1, $2::vector)',
    [title, `[${emb.join(',')}]`],
  );
}

const { rows } = await client.query(
  'SELECT title FROM node_demo ORDER BY embedding <-> $1::vector LIMIT 2',
  ['[3,2,1]'],
);
console.log('检索结果:', rows.map((r) => r.title));
console.log('预期输出: 检索结果: [ 手套, 外套 ]');
console.log('验证通过：Node 客户端完成写入与查询');

await client.end();
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 查询报 `cannot cast type text to vector` | 参数没有显式 `::vector` | 在所有向量参数后面加 `::vector` |
| 写入时向量数组序列化错误 | 用 `JSON.stringify` 生成的带引号格式 | 用 `join(',')` 生成逗号分隔字符串 |
| 插入成功但没有结果返回 | `rows` 为空但查询不带 `LIMIT` 时可能返回全部 | 检查 SQL 是否写了 `ORDER BY` 和 `LIMIT` |

**用在哪里**

- 电商推荐后端接口：业务背景是用户请求推荐，后端查到向量再返回商品。用 pg 客户端封装查询函数。衡量指标是接口 P95 延迟。当查询并发很高时，用连接池 `pg.Pool` 而不是单个 `Client`。
- 知识库文档问答服务：业务背景是后端从知识库查相关文档块再交给大模型。用 pg 客户端完成向量查询并把结果拼进提示词。衡量指标是问答准确率和响应时间。当文档总量小于 200K token 时，跳过向量检索直接放上下文（来源：Anthropic 官方文章，以原文为准）。
- 批量数据导入脚本：业务背景是运营需要定期导入新的商品向量。用 pg 客户端循环插入并事务提交。衡量指标是导入耗时。当数据量极大时，用 COPY 命令或专用导入工具更高效。
- 后台管理系统的相似商品排查：业务背景是运营看某商品最相近的 10 个商品。用 pg 客户端执行精确检索并展示列表。衡量指标是页面加载时间。当商品量超过百万且只用于内部排查时，可以用近似检索放宽召回。

**行业实践**

- Supabase 提供的 `@supabase/supabase-js` 底层封装了 Postgres 查询，支持直接执行 RPC。可以借鉴的是：生产环境用连接池和 RPC 封装向量查询，而不是每次新建连接（来源：Supabase 官方文档，以原文为准）。
- Neon 官方文档建议在 serverless 环境使用 HTTP 连接或连接池管理 pg 连接。可以借鉴的是：Node 后端在 serverless 场景下用连接池减少连接延迟（来源：Neon 官方文档，以原文为准）。
- pg 客户端库官方文档提供 `Pool` 的推荐用法。可以借鉴的是：高并发服务用 `pg.Pool` 管理连接复用，避免每个请求新建连接（来源：node-postgres 官方文档，以原文为准）。

**小结**

- 用 `pg` 客户端连接数据库，发送 SQL 字符串并处理结果。
- 向量参数需要序列化成字符串并加 `::vector` 显式声明类型。
- 生产环境用连接池，避免每次查询重建连接。

## 9. 常见坑与调试：维度、归一化、运算符匹配

**先想一个问题**

你在线上环境建了索引，查询却一直走全表扫描；或者插入数据总是报维度错误；或者换了模型后检索质量大幅下降。这些问题的根因可能是什么？怎么快速定位？

**心智模型**

!!! tip "心智模型"
    一句话模型：向量检索的常见错误集中在三个点：数据形状不对、数据预处理不对、索引定义与查询不匹配。日常类比：就像寄快递，地址写错、包装没封好、或者快递公司与订单不符，都会导致收不到货。类比不成立的地方：数据库会在写入时拒绝维度错误，但索引不匹配不会报错，只是静默走全表扫描。

**图解**

```mermaid
flowchart TD
    A["查询变慢或结果异常"] --> B["执行 EXPLAIN ANALYZE"]
    B --> C["是否走了 Seq Scan"]
    C -->|"是"| D["检查运算符与索引 ops"]
    C -->|"否"| E["检查距离与召回"]
    A --> F["插入报维度错误"]
    F --> G["核对数组长度与列定义"]
    A --> H["结果不相关"]
    H --> I["检查是否归一化、模型是否一致"]
```

1. 遇到查询慢，先看执行计划是否走顺序扫描。
2. 走顺序扫描时，优先检查索引定义里的 ops 与查询运算符是否一致。
3. 插入报错时，先打印向量数组长度并与建表定义对比。
4. 结果不相关时，检查查询向量和存储向量是否来自同一个嵌入模型。
5. 还要确认是否该归一化的向量漏掉了归一化。

**一步一步来**

第一步：诊断维度不一致。

```sql
SELECT vector_dims('[1,2,3]'::vector);
SELECT vector_dims('[1,2]'::vector);
```

**这段代码在做什么**

- `vector_dims` 是 pgvector 提供的函数，返回向量的维度。
- 第一个查询返回 `3`，第二个返回 `2`。
- 建表定义的 `vector(3)` 与插入的 `vector(2)` 会直接报错。
- 应用层应该封装一个维度检查函数，写入前断言。

第二步：诊断运算符与索引不匹配。

```sql
-- 假设索引是用 vector_cosine_ops 建的
EXPLAIN
SELECT id FROM items
ORDER BY embedding <-> '[3,2,1]'
LIMIT 5;
```

**这段代码在做什么**

- 如果索引建的是 `vector_cosine_ops`，查询却用 `<->`，执行计划会显示顺序扫描。
- `vector_cosine_ops` 只支持 `<=>`，不支持 `<->`。
- 修复方法：查询改用 `<=>`，或重建索引为 `vector_l2_ops`。
- 这个错误不会报语法错误，只能通过执行计划发现。

第三步：检查归一化。

```sql
SELECT
  embedding <-> '[0,0,0]'::vector AS distance_to_zero
FROM items
LIMIT 1;
```

**这段代码在做什么**

- 归一化后的向量模长接近 1，到零点的 L2 距离也接近 1。
- 如果距离远大于 1，说明向量没有归一化。
- 用余弦检索时，未归一化不会失败，但结果可能不符合预期。
- 修复方法：在写入前按模型要求归一化，或确认模型已内置归一化。

**动手验证**

```js
// verify_debug.mjs
// 依赖：npm install pg
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/testdb',
});
await client.connect();
await client.query('CREATE EXTENSION IF NOT EXISTS vector');
await client.query('DROP TABLE IF EXISTS debug_demo');
await client.query('CREATE TABLE debug_demo (id int, embedding vector(3))');

// 捕获维度错误
let dimError = null;
try {
  await client.query('INSERT INTO debug_demo VALUES (1, $1::vector)', ['[1,2]']);
} catch (err) {
  dimError = err.message;
}
console.log('维度错误信息:', dimError);
console.log('预期输出: 维度错误信息包含 expected 3 dimensions');
console.log('验证通过：维度校验可捕获');

await client.end();
```

**常见坑**

| 现象 | 原因 | 怎么修 |
| --- | --- | --- |
| 查询走顺序扫描 | 索引 ops 与查询运算符不一致 | 对齐运算符和 ops，例如用 `<=>` 配 `vector_cosine_ops` |
| 插入报 `expected N dimensions` | 数组长度与列定义不符 | 写入前检查数组长度 |
| 换模型后检索质量下降 | 新旧模型向量空间不同 | 记录模型名和维度，换模型必须全量重建索引和向量 |

**用在哪里**

- 生产环境查询性能劣化：业务背景是某天查询耗时突增。先用 `EXPLAIN ANALYZE` 看是否走了顺序扫描。衡量指标是顺序扫描查询占比。当所有查询都正常走索引但依然慢时，需要看数据量或参数调优。
- 嵌入模型升级后的回归：业务背景是嵌入模型从 v1 换成 v2，维度可能变。必须全量重建向量列和索引，不能只插新数据。衡量指标是旧数据召回率。当新模型维度与旧模型一致且官方说明可混用时，仍需验证向量空间是否一致。
- 多团队共享向量列：业务背景是不同团队写入同一张表，容易维度不一致。在应用层统一封装写入函数，集中校验。衡量指标是维度错误告警次数。当团队很少且流程已经稳定时，可以简化封装。
- 排序结果异常排查：业务背景是用户反馈推荐不相关。先查存储向量和查询向量的归一化状态，再查嵌入模型是否一致。衡量指标是用户反馈不相关率。当排序逻辑本身有问题时，向量检索不是根因。

**行业实践**

- pgvector 官方 README 在 filtering 一节明确说明近似索引先取候选再应用 WHERE，过滤强时可能返回少于 LIMIT 行，并给出迭代扫描、部分索引、分区三种对策。可以借鉴的是：过滤场景上线前必须压测过滤强度与返回量（来源：pgvector 官方 README，以原文为准）。
- Neon 官方文档提醒 `maintenance_work_mem` 不超过可用 RAM 的 50-60%，避免建索引时内存溢出。可以借鉴的是：建索引前设置合理的内存参数，不要盲目设 8GB（来源：Neon 官方文档，以原文为准）。
- Supabase 官方文档强调 1M 向量的基准在各计算档位有不同向量数限制，不可跨档位横比。可以借鉴的是：做任何基准对比时要固定硬件、数据量和召回率三个变量（来源：Supabase 官方文档，以原文为准）。

**小结**

- 维度错误是最直接的坑，用 `vector_dims` 和写入前断言解决。
- 索引不匹配不会报错，必须通过执行计划发现。
- 换嵌入模型必须全量重建向量列和索引，新旧模型不能混用。

## 应用地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 电商商品语义搜索 | 建表、余弦距离、HNSW 索引 | `vector(1536)` + `vector_cosine_ops` | 查询向量和索引 ops 必须一致 |
| 客服知识库问答 | 建表、写入、Node 客户端、精确检索 | `vector(1024)` + 暴力扫描 | 小于 200K token 可不做检索 |
| 推荐系统召回层 | 内积距离、IVFFlat 索引 | `vector_l2_ops` 或 `vector_ip_ops` | 先导数据再建 IVFFlat |
| 图片相似推荐 | halfvec、余弦距离、HNSW | `halfvec` 表达式索引 | 维度超 2000 时用 halfvec |
| 用户兴趣稀疏画像 | sparsevec、内积距离 | `sparsevec` + 精确检索 | 非零元素比例高时反而更占空间 |
| 二值特征快速匹配 | bit、Hamming 距离 | `bit` + `bit_hamming_ops` | 只能存 0/1，不能存浮点 |
| 多租户文档隔离 | 部分索引、分区、近似检索 | 分区表 + 部分索引 | 过滤强时开启迭代扫描 |
| 本地开发验证 | CREATE EXTENSION、Node 脚本 | 本地 Postgres + pg 客户端 | 每个新数据库都要装扩展 |

## 动手作业

目标：构建一个最小可运行的语义搜索服务，包含建表、写入、查询和验证。

步骤：
1. 本地启动 PostgreSQL，创建一个新数据库 `semantic_demo`。
2. 在新数据库执行 `CREATE EXTENSION vector;` 并核对版本。
3. 用 Node 脚本建表 `docs`，列包含 `id`、`content`、`embedding vector(3)`。
4. 手动构造 5 条文档和对应的 3 维向量，用 pg 客户端批量写入。
5. 用查询向量 `[1,0,0]` 执行精确检索，取前 2 条。
6. 建 HNSW 索引并用相同查询复核结果。
7. 故意写入一条 2 维向量，捕获并打印错误信息。

验收标准：
- 脚本能一次性运行完成，输出版本号、写入行数、精确检索结果、HNSW 检索结果。
- 精确检索和 HNSW 检索的前 2 条结果一致。
- 维度错误被捕获且错误信息包含 `expected` 字样。
- 代码内不出现硬编码的维度不一致值。

## 综合对比

| 维度 | 精确检索 | HNSW | IVFFlat |
| --- | --- | --- | --- |
| 召回率 | 1.0 | 由 `ef_search` 控制，通常 0.95 以上 | 由 `probes` 控制，可到 0.98 |
| 查询速度 | 数据量大时慢 | 快，查询复杂度近似对数级 | 较快，取决于簇数 |
| 建索引速度 | 无需建索引 | 慢，内存在高 | 快，内存在低 |
| 索引时机 | 无 | 可在空表上建 | 必须先有数据再建（需训练聚类） |
| 内存占用 | 无额外索引 | 高 | 低 |
| 适合数据量 | 小于十万行 | 百万级到千万级 | 百万级到千万级 |
| 参数敏感度 | 无 | 高，需调 `m`、`ef_construction`、`ef_search` | 中，需调 `lists`、`probes` |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [README 当前版本 0.8.7,支持 Postgres 13+。升级: `ALTER EXTENSION vector UPDATE;` (github.com)](https://github.com/pgvector/pgvector) | pgvector 官方 README，版本 0.8.7、支持 Postgres 13+，升级语句可直接照抄。 | 先读安装与升级两节，核对自己库的 PG 版本与扩展版本，再执行 ALTER EXTENSION vector UPDATE 验证。 |
| [Neon 文档对权衡的表述: HNSW 的速度-召回折中优于 IVFFlat,但建索引更慢、内存更高,且无训练阶段,可在空表上建;IVFFl (neon.com)](https://neon.com/docs/extensions/pgvector) | Neon 文档把 HNSW 与 IVFFlat 的取舍讲得很清楚，含空表建索引等细节。 | 重点读对比表与调参段，带着“选哪种索引、设多大 m 和 lists”的问题读完直接建索引。 |
| [PostgreSQL 官方教程](https://www.postgresql.org/docs/current/tutorial.html) | PostgreSQL 官方教程，先打通建库建表与基本 SQL，再叠加向量列不慌。 | 跟着教程在本地建库建表并做查询，熟悉 psql 交互后，把其中某列改成 vector 再试。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [灵感来自 Microsoft DiskANN 研究;PostgreSQL 开源许可;可通过 Docker、源码编译或 Timescale C (github.com)](https://github.com/timescale/pgvectorscale) | 官方仓库说明安装方式、许可与 DiskANN 渊源，是理解索引实现的起点。 | 读 Installation 与架构描述，选定 Docker 或源码编译一种方式装到本地并跑通扩展。 |
| [Drizzle 文档](https://orm.drizzle.team/docs/overview) | Drizzle 文档可对照 ORM 与手写 SQL 的差异，帮助判断何时该直连驱动。 | 用 Drizzle 写一遍同样的向量查询，对比与原生 SQL 的接近程度，决定项目里用哪种。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [HNSW: Malkov & Yashunin,多层邻近图,元素按指数衰减概率分配最高层,类似跳表;论文称搜索复杂度对数级伸缩 — (arxiv.org)](https://arxiv.org/abs/1603.09320) | HNSW 原始论文，解释多层邻近图与对数级搜索复杂度的由来。 | 读第 1 节与算法 1，搞清 M、efConstruction 的作用，再回头调索引参数看召回变化。 |
| [AWS 称 Aurora PostgreSQL 上的 pgvector 0.8.0 "最高 9x 查询更快、100x 结果更相关",归因于迭 (aws.amazon.com)](https://aws.amazon.com/blogs/database/supercharging-vector-search-performance-and-relevance-with-pgvector-0-8-0-on-amazon-aurora-postgresql) | AWS 给出 0.8.0 迭代扫描带来的性能与召回提升数据，说明版本差异。 | 读基准说明部分，理解迭代扫描如何改善带过滤条件的查询，之后检查自己的版本是否受益。 |
| [廖雪峰 SQL 教程](https://liaoxuefeng.com/books/sql/introduction/) | 中文 SQL 教程，适合补齐 SELECT、WHERE、ORDER BY 与 LIMIT 的基本功。 | 按章节逐条在本地执行，重点练 ORDER BY 排序，之后直接换成按距离运算符排序。 |
| [Mode SQL Tutorial](https://mode.com/sql-tutorial) | Mode 的进阶 SQL 练习，为写复杂检索与聚合查询打底。 | 完成 Advanced 部分的窗口函数练习，再来写带 LIMIT 与过滤条件的近邻查询。 |

## 自测题

??? question "1. `CREATE EXTENSION vector` 为什么要对每个数据库单独执行？"
    答案要点：PostgreSQL 扩展是每个数据库单独安装的，不是实例级共享。新建数据库后必须重新执行 `CREATE EXTENSION vector;`。可以用 `SELECT extversion FROM pg_extension WHERE extname = 'vector';` 核对版本。升级时执行 `ALTER EXTENSION vector UPDATE;`。

??? question "2. 四种距离运算符分别是什么？各自的语义是什么？"
    答案要点：`<->` 是 L2 距离，值越小越相似；`<#>` 是负内积，取真实内积需乘 -1；`<=>` 是余弦距离，等于 1 减余弦相似度；`<+>` 是 L1 距离。选择依据是嵌入模型训练目标，不能只凭业务直觉。距离运算符必须与索引 ops 匹配。

??? question "3. 建表时 `vector(3)` 里的 3 表示什么？写入了 2 维数组会怎样？"
    答案要点：3 表示列里最多存 3 维向量，写入数组长度必须正好等于 3。写入 2 维数组会报 `expected 3 dimensions` 错误。应用层应在写入前检查数组长度，集中处理减少数据库报错。

??? question "4. HNSW 索引建在空表上和 IVFFlat 有什么区别？"
    答案要点：HNSW 没有训练阶段，可以在空表上建；IVFFlat 有 k-means 训练阶段，需要先有数据再建索引。这是两种索引机制性的差异，来源是 Neon 文档里对二者构建过程的说明（以原文为准）。

??? question "5. 查询走了 `Seq Scan` 而不是索引，最可能的原因是什么？"
    答案要点：索引的运算符类与查询运算符不匹配。例如索引用 `vector_cosine_ops`，查询却写 `<->`，数据库静默走顺序扫描。另一个原因是表太小或参数设置导致优化器判断顺序扫描更划算。用 `EXPLAIN ANALYZE` 确认。

??? question "6. 为什么换嵌入模型后，必须全量重建向量列和索引？"
    答案要点：不同嵌入模型的向量空间不同，旧模型向量和新模型向量不能在同一空间里比较距离。换模型后旧向量与新检索向量不在同一语义空间，排序结果不可信。需要在数据库里记录模型名和维度，换模型时全量重建。

??? question "7. 归一化与余弦距离之间有什么关系？"
    答案要点：余弦距离等于 1 减两个向量夹角的余弦，归一化后向量的模长为 1。归一化后内积与余弦等价，排序结果一致。pgvector 不强制归一化，需要应用层或嵌入模型保证，否则余弦距离结果可能不稳定。

??? question "8. 过滤条件很强时，近似索引为什么可能返回少于 LIMIT 的行？"
    答案要点：近似索引先取一定数量的候选（如 HNSW 的 `ef_search`），再应用 WHERE 过滤。如果过滤条件筛掉了大部分候选，剩余行数可能少于 LIMIT。对策包括：开迭代扫描、使用部分索引、按租户分区（来源：pgvector 官方 README，以原文为准）。

## 延伸阅读

- pgvector 官方 README：Getting Started、Querying、Indexing、Filtering、Half-Precision、Binary Quantization 章节。
- PostgreSQL 官方文档：CREATE EXTENSION、系统目录 `pg_extension`、EXPLAIN 命令章节。
- OpenAI 官方文档：Embeddings 指南中的维度和余弦相似度部分。
- BAAI 官方 HuggingFace 模型卡：BGE-M3 的特性与推荐检索方式章节。
- Anthropic 官方文章：Contextual Retrieval 中的知识库规模建议与检索失败率数据部分。
- Neon 官方文档：pgvector 扩展中的 HNSW 与 IVFFlat 权衡表。
- Supabase 官方文档：AI 与向量检索中的计算档位基准说明。
- AWS 数据库博客：Aurora PostgreSQL 上 pgvector 0.8.0 的迭代扫描性能说明（注意厂商营销口径，需对照原文限定条件）。
- node-postgres 官方文档：Client 与 Pool 的连接管理章节。
