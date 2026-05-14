# 分支管理规范

## 分支策略

本项目采用 **GitHub Flow** 简化模型，以 main 为单一稳定分支，feature 分支承载开发工作。

```
main ────────────────────────────────────────────▶ [生产]
  │
  ├── feature/xxx ───────────────────────────────▶ PR → main
  ├── fix/xxx ──────────────────────────────────▶ PR → main
  └── docs/xxx ─────────────────────────────────▶ PR → main
```

## 分支类型

| 前缀 | 用途 | 命名规范 | 示例 |
|------|------|----------|------|
| `feature/` | 新功能开发 | `feature/功能简述` | `feature/agent-streaming` |
| `fix/` | Bug 修复 | `fix/bug简述` | `fix/navigation-broken` |
| `docs/` | 文档更新 | `docs/文档类型` | `docs/api-reference` |
| `refactor/` | 重构优化 | `refactor/模块名` | `refactor/theme-system` |
| `experiment/` | 实验性开发 | `experiment/实验名` | `experiment/ai-chat` |

## 分支操作

### 创建新分支

```bash
# 从 main 创建
git checkout main && git pull
git checkout -b feature/你的功能名

# 从 issue 创建（如有）
git checkout -b feature/issue-123-功能名
```

### 同步更新

```bash
# 保持分支与 main 同步
git fetch origin
git rebase origin/main

# 或合并方式
git merge origin/main
```

### 删除已完成分支

```bash
# 合并后删除本地
git branch -d feature/xxx

# 删除远程（谨慎）
git push origin --delete feature/xxx
```

## Commit 规范

### 格式

```
<type>(<scope>): <subject>

[body]

[footer]
```

### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(chat): 添加 SSE 流式对话` |
| `fix` | Bug 修复 | `fix(stream): 修复断流重连问题` |
| `docs` | 文档更新 | `docs: 更新 API 文档` |
| `style` | 格式调整 | `style: 格式化代码` |
| `refactor` | 重构 | `refactor(agent): 提取公共逻辑` |
| `test` | 测试 | `test: 添加单元测试` |
| `chore` | 构建/工具 | `chore: 升级依赖` |

### 示例

```bash
git commit -m "feat(agent): 实现 Claude 流式对话

- 添加 SSE EventSource 连接
- 实现打字机效果组件
- 支持断流自动重连

Closes #123"
```

## PR 规范

### PR 描述模板

```markdown
## 概述
<!-- 简要说明改动 -->

## 改动内容
- [ ] 功能 1
- [ ] 功能 2

## 测试验证
- [ ] 本地构建通过
- [ ] 功能测试通过
- [ ] 样式验证通过

## 截图/录屏
<!-- 如有 UI 改动，附上截图 -->
```

### PR 流程

1. 创建分支：`git checkout -b feature/xxx`
2. 开发并频繁提交
3. 推送：`git push -u origin feature/xxx`
4. 创建 PR，填写描述
5. CI 通过后合并
6. 删除分支

## 发布流程

```
main ────────▶ v2.1.0 ────────▶ GitHub Release ────▶ Pages Deploy
              (tag)
```

### 打标签

```bash
# 补丁版本
git tag v2.1.1 && git push origin v2.1.1

# 次版本
git tag v2.2.0 && git push origin v2.2.0

# 主版本
git tag v3.0.0 && git push origin v3.0.0
```

## 保护规则

- `main` 分支禁止直接推送
- 所有 PR 需要至少 1 个 Review
- CI 必须通过才能合并

## 常用命令速查

```bash
# 分支操作
git branch                          # 查看本地分支
git branch -a                       # 查看所有分支
git checkout -b feature/xxx         # 创建并切换
git branch -d feature/xxx            # 删除本地分支

# 同步与合并
git fetch origin                    # 拉取远程状态
git rebase origin/main              # 变基到最新 main
git merge origin/main               # 合并 main 到当前分支

# 推送与拉取
git push -u origin feature/xxx      # 首次推送
git push                            # 后续推送
git pull origin main                # 拉取 main 更新

# 状态查看
git log --oneline -10               # 最近 10 条 commit
git status                          # 当前状态
git diff                            # 未提交的改动
```