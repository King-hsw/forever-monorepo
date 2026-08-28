# 项目约定

## 回复语言

- 回复一律使用中文，无需用户每次提醒。

## Git 工作流

- **所有功能开发和代码修改都必须在 git worktree 中进行**，禁止直接在主工作区改代码；非代码改动（文档、本地配置如 .env）可直接在主工作区改。
- 任务完成后**立即把分支 cherry-pick 回 main 并清理 worktree 和分支**，用户在 main 中验证；不要停在 worktree 等验证。
- 合并功能分支到 main 时，**不要用 merge commit**（不要 `git merge`），统一使用 rebase / cherry-pick 保持线性历史。
- commit message 使用中文。
