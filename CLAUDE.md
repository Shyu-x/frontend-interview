# CLAUDE.md

本仓库是一个中文前端教程站点（MkDocs Material），同时能生成 PDF 分册。内容全部在 `docs/`。

## 命令

```bash
make install     # uv sync
make dev         # 本地预览 http://127.0.0.1:8000
make build       # 构建 site/
make seo         # 构建并校验 SEO/GEO
node book/scripts/check-mermaid.mjs      # 用真实解析器检查所有 Mermaid 图
node book/build.mjs --plan               # 分册方案
node book/build.mjs --volume N           # 构建第 N 册 PDF（需先 make build）
```

Python 命令一律用 `uv run`，不要裸跑。构建一次约 1 到 10 分钟，别在循环里反复构建。

## 写内容之前

必读 `docs/design/writing-standard.md`：结构、五层递进、配图密度、禁用表述。几条硬规则：

- 不写"性能更好""很容易出问题"这类无法验证的话，给数字、版本、规范条目或可运行代码。
- 超过 15 行的代码要分段解释，注释写"为什么"。
- 不用系统 emoji 装饰。
- 图用 Mermaid；含中文的字符框图不要写（汉字宽度会让它错位），改用 Mermaid、表格或"纯 ASCII 框加框外图例"。

Mermaid 常见坑：节点 id 不能是 `constructor` `name` `graph` `call` `end` 这类 JS 内建名或关键字；状态图用 `state "名称" as id`，转移里不要给状态名加引号；时序图的消息不要加引号，参与者不要叫 `Loop`。

## 结构

```text
docs/               内容；design/ 是设计系统与写作规范
docs/javascripts/   diagrams.js：图表渲染与配色，网页和 PDF 共用
docs/stylesheets/   tokens.css 是网页与书籍共用的设计令牌
book/               PDF：volumes.mjs 分册规则，build.mjs 构建，print.css 排版
hooks/seo.py        构建钩子：sitemap、llms.txt、JSON-LD、book-manifest.json
mkdocs.yml          站点配置；nav 同时决定 PDF 的分册与目录
```

## 发布

- 推送到 `main` 自动部署 GitHub Pages（`deploy.yml`）。部署前会跑 Mermaid 解析、站点构建、SEO 校验。
- PDF 由 `release-pdf.yml` 发布，手动触发或推送 `books-*` 标签，不随每次推送运行。

## 约定

- 提交信息 `type(scope): 说明`，不加署名行。
- 不直接推 `main` 以外的长期分支；合并后删除分支。
- 终止进程只终止自己启动的 PID，不用 `pkill -f` 之类的模糊匹配。
