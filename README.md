# forever-monorepo

forever 博客前后端 monorepo。

## 结构

- `apps/web` — 博客前端（Nuxt 4 + pnpm），详见 [apps/web/README.md](apps/web/README.md)
- `apps/admin` — 管理后台（Vite + Vue 3 SPA，部署于 `admin.<域名>`）
- `apps/server` — 后端（Spring Boot + Maven）
- `.github/workflows/web.yml|server.yml|admin.yml` — GitHub Actions 镜像流水线（发版主力）
- `.cnb.yml` — CNB 双分支流水线（第二套 CI，只跟分支 push）

## 本地开发

```bash
cd apps/web && pnpm install && pnpm dev      # 前端（:3000）
cd apps/admin && pnpm install && pnpm dev    # 后台（:5173，/api 代理到 :8080）
cd apps/server && mvn spring-boot:run        # 后端（:8080）
```

后台与前台共用父域 HttpOnly refresh cookie：本地都在 `localhost`，跨端口天然共享，
不用为登录态做额外配置；生产需要给 server 设 `AUTH_COOKIE_DOMAIN=.<父域>`。

环境变量各自从 `.env.example` 复制 `.env`（不入库）。

## CI 与发版

- 日常 push：GitHub Actions 按改动路径只构建改动侧（`apps/web/**` 触发 web.yml，
  `apps/admin/**` 触发 admin.yml，`apps/server/**` 触发 server.yml），推 GHCR 的 `:latest`；
  CNB 每次分支 push 两条流水线各自全量构建。
- 发版：在 GitHub 打 `vX.Y.Z` tag → 三条 workflow 全量触发，
  GHCR 获得配对的 `vX.Y.Z` 标签（`:latest` 不动）。tag 事件不受 `paths` 过滤影响。
- 生产 compose 拉 GHCR：
  `ghcr.io/king-hsw/forever-monorepo/web|server|admin`；
  升级/回滚 = 改 compose 里的 tag 号后 `docker compose pull && up -d`。

镜像命名矩阵与设计文档见 spec（docs/ 本地保留，不入仓）。
