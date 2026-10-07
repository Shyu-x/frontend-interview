---
title: 书籍排版规范
description: PDF 分册的开本、版心、页眉页脚、分册规则与发布前校验项，说明书籍如何从站点内容自动生成
---

# 书籍排版规范

## 开本与版心

| 项 | 取值 |
|---|---|
| 开本 | 16 开，185 × 260 mm |
| 正文 | Noto Serif SC，10.5pt，行高 1.8 |
| 订口 / 切口 | 22 mm / 18 mm，左右页镜像 |
| 天头 / 地脚 | 24 mm / 26 mm |
| 页码 | 外侧底部，Inter 8.5pt |
| 页眉 | 偶数页放章名，奇数页放节名 |

正文两端对齐只作用于段落；表格、列表、提示块保持左对齐，避免中文字距被拉开。

## 一册书的结构

```mermaid
flowchart LR
    A["封面"] --> B["扉页"] --> C["版权页"] --> D["目录"] --> E["篇首页"] --> F["章节正文"]
```

每章从新页开始，章首有小标题行（分组名）与章名，正文后接"深入阅读"。目录页码在分页完成后由脚本回填，并与 PDF 文本层逐章核对。

## 分册规则

站点内容按主题拆成多册，规则写在 `book/volumes.mjs`：

1. 以导航里的一级领域为单位，一个领域一册。
2. 领域字数超过 52 万字（约 500 页）时，按二级分组拆册，保持原有顺序，拆分点优先落在分组边界。
3. 字数低于 18 万字的相邻小领域合并成一册。
4. 末尾过小的尾册并回前一册。
5. 册名自动生成，拆分册带"第 N 册"。

校准数据：约 1000 字对应 1 页；含大量图表的册，每页字数更低。

## 构建与发布

```bash
npm ci --prefix book
node book/scripts/sync-fonts.mjs
python3 -m venv .venv-fonts && .venv-fonts/bin/pip install fonttools brotli
.venv-fonts/bin/python book/scripts/merge-fonts.py
mkdocs build
node book/build.mjs --plan          # 查看分册方案
node book/build.mjs --volume 13     # 构建单册
```

发布由 `.github/workflows/release-pdf.yml` 完成：手动触发，或推送 `books-*` 标签。全部分册构建、校验通过后，作为 Release 附件上传。

## 发布前校验

| 校验项 | 通过标准 |
|---|---|
| 页框 | 185 × 260 mm，误差 ±1 mm |
| 重复页 | 0 |
| 目录页码 | 与 PDF 文本层中章节首页逐章一致 |
| Mermaid | 0 个渲染失败 |
| 字体 | 全部嵌入，无回退字体 |
