# forever-monorepo

forever 博客前后端 monorepo。

## 结构

- `apps/web` — 博客前端（Nuxt 4 + pnpm），详见 [apps/web/README.md](apps/web/README.md)
- `apps/server` — 后端（Spring Boot + Maven）
- `.github/workflows/web.yml|server.yml` — GitHub Actions 镜像流水线（发版主力）
- `.cnb.yml` — CNB 双分支流水线（第二套 CI，只跟分支 push）

## 本地开发

```bash
cd apps/web && pnpm install && pnpm dev      # 前端
cd apps/server && mvn spring-boot:run        # 后端
```

环境变量各自从 `.env.example` 复制 `.env`（不入库）。

## CI 与发版

- 日常 push：GitHub Actions 按改动路径只构建改动侧（`apps/web/**` 触发 web.yml，
  `apps/server/**` 触发 server.yml），推各 registry 的 `:latest`；
  CNB 每次分支 push 两条流水线各自全量构建。
- 发版：在 GitHub 打 `vX.Y.Z` tag → web.yml + server.yml 全量触发，
  DockerHub / 腾讯云 CCR 同时获得配对的 `vX.Y.Z` 标签（`:latest` 不动）。
  tag 事件不受 workflow `paths` 过滤影响。
- 生产 compose 拉腾讯云 CCR：
  `ccr.ccs.tencentyun.com/king-hsw/forever-monorepo/web|server`；
  升级/回滚 = 改 compose 里的 tag 号后 `docker compose pull && up -d`。

镜像命名矩阵与设计文档见 spec（docs/ 本地保留，不入仓）。
