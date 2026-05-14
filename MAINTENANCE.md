# 前端面试全家桶 - 维护规划

> 本文档定义项目的长期维护策略和 Roadmap。

## 当前状态

| 指标 | 值 | 最后更新 |
|------|-----|----------|
| 仓库地址 | github.com/Shyu-x/frontend-interview | 2026-05-13 |
| 部署地址 | shyu-x.github.io/frontend-interview | 2026-05-14 |
| 章节总数 | 50+ | 2026-05-10 |
| 构建状态 | ✅ 正常 | 2026-05-14 |
| CI/CD | ✅ GitHub Actions | 2026-05-14 |

---

## 里程碑规划

### Phase 1：基础完善 (已完成 ✅)

- [x] MkDocs 部署
- [x] Material 主题配置
- [x] CI/CD 自动部署
- [x] 文档结构拆分
- [x] 基础样式定制

### Phase 2：内容增强 (进行中 🔄)

- [ ] 补充 React / Vue 专题章节
- [ ] 补充工程化专题
- [ ] 增加手写题解题思路
- [ ] 添加更多代码示例

### Phase 3：Agent 系统 (进行中 🔄)

- [x] 前端 SSE 流式对话 UI (React + Vite)
- [x] 后端 NestJS + LangChain 服务
- [x] TypeScript Agent 实现
- [ ] 添加更多内置工具
- [ ] 支持多模型 (OpenAI/Gemini)

### Phase 3：体验优化 (待规划 📋)

- [ ] 添加 Mermaid 图表
- [ ] 添加代码运行示例（CodeSandbox 嵌入）
- [ ] 添加章节练习题
- [ ] 添加面试模拟功能

### Phase 4：生态建设 (待规划 📋)

- [ ] 配套题库 App
- [ ] 配套视频课程
- [ ] 社区贡献指南
- [ ] 贡献者排行榜

---

## 内容更新规范

### 版本号规则

采用 **语义化版本**：`主版本.次版本.补丁版本`

- **主版本**：重大结构调整（如换框架、大改导航）
- **次版本**：新增章节、补充内容
- **补丁版本**：错别字修正、样式微调

### 更新频率

| 内容类型 | 更新频率 | 负责人 |
|----------|----------|--------|
| 错别字/格式 | 发现即修 | 所有人 |
| 新增章节 | 双周 | Owner |
| 框架升级 | 按需 | Owner |
| 依赖安全更新 | 月度 | Dependabot |

---

## 贡献流程

### Issue 提交流程

1. 搜索现有 Issue，避免重复
2. 使用模板（Bug Report / Feature Request）
3. 清晰描述问题或建议
4. 关联相关章节

### PR 提交流程

1. Fork 仓库
2. 创建分支：`git checkout -b feat/章节名`
3. 本地验证：`mkdocs build`
4. 提交 PR，描述改动内容
5. 等待 Review 和合并

### 代码规范

```bash
# 文档格式检查
markdownlint docs/

# 构建测试
mkdocs build --clean
```

---

## 质量保障

### 自动化检查

- [x] CI/CD 构建验证
- [ ] markdownlint 检查
- [ ] 链接有效性检查
- [ ] 拼写检查（中文）

### 手动检查

- [ ] 每次 PR 必须本地预览
- [ ] 检查导航完整性
- [ ] 检查代码块语法
- [ ] 检查图片加载

---

## 监控指标

### GitHub Insights

| 指标 | 关注点 |
|------|--------|
| Commits | 活跃度 |
| PRs | 社区参与度 |
| Issues | 反馈数量 |
| Traffic | 访问量、热门页面 |

### Google Analytics (可选)

- 页面停留时间
- 跳出率
- 章节完成率

---

## 依赖管理

### Python 依赖

```bash
# 固定版本
mkdocs==1.6.1
mkdocs-material==9.5.*

# 检查更新
pip list --outdated

# 安全检查
pip check
```

### GitHub Actions 版本

定期更新 Actions 版本（季度）：

```yaml
- uses: actions/checkout@v4      # v4 稳定版
- uses: actions/setup-python@v5   # v5 稳定版
- uses: actions/deploy-pages@v4    # v4 稳定版
```

---

## 应急响应

### 构建失败处理

1. 检查 Actions 日志
2. 本地复现问题
3. 定位问题 commit
4. 回滚或修复
5. 验证修复后推送

### 页面无法访问

1. 检查 GitHub Pages 设置
2. 检查 DNS 配置
3. 检查自定义域名（如有）
4. 查看 GitHub 状态页

### 数据丢失

- 源文件在 Git 仓库，有完整历史
- 可随时从 main 分支恢复

---

## 联系方式

- **Issue**：https://github.com/Shyu-x/frontend-interview/issues
- **讨论**：https://github.com/Shyu-x/frontend-interview/discussions

---

## 附录

### 常用命令速查

```bash
# 开发
mkdocs serve --dev-addr 127.0.0.1:8000

# 构建
mkdocs build --clean

# 检查
pip check && markdownlint docs/

# 部署（手动）
git push && gh run watch
```

### 文档版本记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-05-14 | 2.0.0 | MkDocs 部署 + CI/CD |
| 2026-05-10 | 1.x | 单一 Markdown 文件 |