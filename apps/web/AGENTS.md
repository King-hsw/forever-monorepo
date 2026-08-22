# 项目约定

## Git 工作流

- **所有功能开发和代码修改都必须在 git worktree 中进行**，禁止直接在主工作区改代码。
- worktree 里**不要软链主仓库的 node_modules**（pnpm 会报错），应删除后重新安装依赖（`pnpm install`）。
- worktree 上的代码写完并提交后**先停下来让用户验证**，用户确认没问题后才合并回 main（cherry-pick），再清理分支和 worktree。
- 合并功能分支到 main 时，**不要用 merge commit**（不要 `git merge`），统一使用 rebase / cherry-pick 保持线性历史。
- commit message 使用中文。
