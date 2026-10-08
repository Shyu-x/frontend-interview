# 贡献指南

## 写一篇教程

教程写法有明确标准，先读站内的《教程写作规范》（`docs/design/writing-standard.md`）：标准结构、五层递进、配图密度、禁用表述与提交前自检清单。组件、图表与配色规则见同栏目下的其他页面。

新增一篇的步骤：

1. 在对应目录新建 `.md`，文件名用小写加连字符，开头写 `title` 与 `description`（60 到 160 字）。
2. 在 `mkdocs.yml` 的 `nav` 里加入这一页。书籍分册与目录都由 `nav` 自动生成。
3. 本地检查，三项都要通过：

```bash
make build                                   # 无链接警告
python3 scripts/seo-check.py site            # 0 错误
node book/scripts/check-mermaid.mjs          # 每张 Mermaid 图都能解析
python3 scripts/check-tables.py              # 表格都能渲染（加 --fix 自动修复）
python3 scripts/fix-lists.py                 # 列表前要有空行（加 --fix 自动修复）
```

## 提交

- 不直接推送到 `main`：从 `main` 开分支，用 PR 合并。分支名用 `feature/`、`fix/`、`docs/`、`refactor/` 加简短英文。
- 提交信息格式 `type(scope): 说明`，type 取 `feat` `fix` `docs` `refactor` `chore` `ci`。
- 一个提交只做一件事，说明里写清为什么。
- 合并后删除分支，保持远端只有 `main`。

## 提交前自查

- 没有密钥、令牌、个人路径。
- 新增的代码示例已经运行过；未运行的在代码块前标注"示意代码：未通过自动验证"。
- 不用系统 emoji 做装饰。
