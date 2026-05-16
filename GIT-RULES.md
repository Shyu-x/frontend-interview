# Git 管理规范

> **⚠️ 强制遵守：违反以下规范将被严肃处理**

---

## 一、分支模型

```
main (受保护，禁止直接推送)
  ├── feature/xxx  (功能开发分支)
  ├── fix/xxx      (Bug 修复分支)
  ├── docs/xxx     (文档更新分支)
  └── release/xxx  (发布准备分支)
```

| 分支 | 用途 | 保护规则 |
|------|------|----------|
| `main` | 稳定可发布版本 | ❌ 禁止直接推送，❌ 禁止强制推送 |
| `release/*` | 发布版本 | 需要 Review 才能合并 |
| `feature/*` | 新功能开发 | PR 合并 |
| `fix/*` | Bug 修复 | PR 合并 |
| `docs/*` | 文档更新 | PR 合并 |

---

## 二、分支命名规范

```
feature/<功能简述>          # 功能：feature/agent-streaming
fix/<问题简述>              # 修复：fix/mermaid-syntax-error
docs/<文档类型>            # 文档：docs/api-reference
refactor/<模块名>          # 重构：refactor/theme-system
release/v<版本号>           # 发布：release/v2.1.0
hotfix/<问题简述>          # 热修复：hotfix/critical-security
```

**禁止的命名方式：**
- ❌ `dev` / `develop` / `development`
- ❌ `test` / `testing`
- ❌ `temp` / `tmp`
- ❌ 中文分支名

---

## 三、工作流程（必须遵守）

### 3.1 开始新工作

```bash
# 1. 确保 main 最新
git checkout main && git pull origin main

# 2. 创建功能分支（从 main）
git checkout -b feature/你的功能名

# 3. 在分支上开发
# ... 编写代码 ...

# 4. 频繁提交（每天至少一次）
git add .
git commit -m "feat(scope): 描述改动"
```

### 3.2 完成工作（合并到 main）

```bash
# 1. 同步 main 最新代码
git fetch origin
git rebase origin/main

# 2. 解决冲突（如有）
# ... 解决冲突 ...

# 3. 推送到远程
git push -u origin feature/你的功能名

# 4. 创建 Pull Request
gh pr create --title "feat(scope): 功能描述" --body "## 改动内容..."

# 5. 等待 CI 通过 + Review
# 6. 合并（使用 Squash Merge 或 Rebase Merge）
# 7. 删除本地分支
git checkout main && git pull origin main && git branch -d feature/你的功能名
```

### 3.3 分支合并优先级

```
feature/xxx → main              # 标准流程
fix/xxx → main                 # Bug 修复
docs/xxx → main                # 文档更新
```

**禁止的操作：**
- ❌ 直接 `git merge` 到 main（必须 PR）
- ❌ 直接 `git push` 到 main
- ❌ 绕过 CI 直接合并
- ❌ 跨分支直接合并（feature → feature）

---

## 四、提交规范

### 4.1 提交格式

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### 4.2 Type 类型

| Type | 使用场景 | 示例 |
|------|----------|------|
| `feat` | 新功能 | `feat(chat): 添加 SSE 流式对话` |
| `fix` | Bug 修复 | `fix(stream): 修复断流重连问题` |
| `docs` | 文档更新 | `docs: 更新 API 文档` |
| `style` | 格式调整（不影响功能） | `style: 格式化代码` |
| `refactor` | 重构（不改变功能） | `refactor(agent): 提取公共逻辑` |
| `perf` | 性能优化 | `perf: 优化图片加载` |
| `test` | 添加/修改测试 | `test: 添加流式测试用例` |
| `chore` | 构建/工具变更 | `chore: 升级依赖版本` |
| `ci` | CI/CD 配置 | `ci: 添加 GitHub Actions` |

### 4.3 提交示例

```bash
# 好 ✅
git commit -m "feat(agent): 实现流式对话功能

- 添加 SSE 连接管理
- 实现打字机效果
- 支持断流自动重连

Closes #123"

git commit -m "fix(mermaid): 修复语法错误导致的渲染失败

- 移除非法字符
- 替换损坏的 png 引用

See #456"

# 坏 ❌
git commit -m "update"
git commit -m "fix stuff"
git commit -m "WIP"
git commit -m "merge branch"
```

---

## 五、PR 规范

### 5.1 PR 创建流程

1. **创建前检查**
   - [ ] 本地测试通过
   - [ ] CI 状态正常
   - [ ] 代码格式符合规范

2. **PR 标题格式**
   ```
   [feat/fix/docs/refactor](scope): 简短描述
   ```

3. **PR 描述模板**
   ```markdown
   ## 概述
   <!-- 一句话说明改动目的 -->

   ## 改动内容
   - [ ] 改动点 1
   - [ ] 改动点 2

   ## 测试验证
   - [ ] 本地构建通过
   - [ ] 功能测试通过
   - [ ] 图表验证通过（mermaid）

   ## 影响范围
   <!-- 列出可能影响的模块 -->

   ## 截图/录屏
   <!-- 如有 UI 改动 -->
   ```

### 5.2 合并条件

| 条件 | 要求 |
|------|------|
| CI 状态 | 必须全部通过（绿色） |
| Review | 至少 1 人 approve |
| 分支同步 | 需要 rebase 到最新 main |
| Merge 方式 | 使用 Squash Merge 或 Rebase Merge |

---

## 六、保护规则

### 6.1 main 分支

```
规则：
  - 禁止直接推送
  - 禁止强制推送 (force-push)
  - 要求 PR 才能合并
  - 要求 1 个 Review 通过
  - 要求所有 CI 检查通过
```

### 6.2 release 分支

```
规则：
  - 禁止直接推送
  - 要求 PR 才能合并
  - 要求 2 个 Review 通过
```

---

## 七、常见错误与纠正

| 错误操作 | 正确做法 |
|----------|----------|
| 直接在 main 开发 | 从 main 创建 feature 分支 |
| `git push origin main` | 创建 PR，Review 后合并 |
| `git merge --no-ff` 直接合并 | 使用 Squash Merge |
| `git push --force` | 禁止，除非紧急恢复且有人监督 |
| 合并后不删除分支 | 及时清理已完成分支 |
| 在 dev 分支开发 | 使用 feature/xxx 分支 |

---

## 八、紧急修复流程

```bash
# 紧急 Bug 修复
git checkout main
git pull origin main

# 创建热修复分支（从 main）
git checkout -b hotfix/critical-bug

# 快速修复 + 提交
git commit -m "fix: 紧急修复 ..."

# 直接推送（绕过部分检查，但必须创建 PR）
git push -u origin hotfix/critical-bug

# 创建 PR，标注 [HOTFIX]
gh pr create --title "hotfix: 紧急修复 ..." --body "## 紧急修复\n\n..."

# 合并后立即删除
git checkout main && git pull origin main && git branch -d hotfix/critical-bug
```

---

## 九、违规处理

| 违规行为 | 处理方式 |
|----------|----------|
| 直接 push 到 main | 撤销推送，回退代码，警告 |
| 绕过 CI 合并 | 撤销合并，代码审查 |
| 强制推送 main | 立即报告，要求恢复 |
| 破坏性操作未通知 | 复盘，扣绩效 |

---

## 十、速查命令

```bash
# 查看当前分支
git branch

# 查看所有分支
git branch -a

# 创建并切换
git checkout -b feature/xxx

# 切换分支
git checkout main

# 同步 main
git fetch origin && git rebase origin/main

# 提交代码
git add . && git commit -m "type(scope): 描述"

# 推送分支
git push -u origin feature/xxx

# 创建 PR
gh pr create

# 查看 PR 状态
gh pr status

# 合并 PR（本地）
git checkout main && git pull && git merge feature/xxx --squash

# 删除已完成分支
git branch -d feature/xxx
git push origin --delete feature/xxx
```

---

**📌 记住：分支是共享资源，遵守规范是基本职业素养。**