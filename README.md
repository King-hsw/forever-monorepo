# forever-monorepo

forever 博客前后端 monorepo。

## 结构

- `apps/web` — 博客前端（Nuxt 4 + pnpm），详见 [apps/web/README.md](apps/web/README.md)
- `apps/admin` — 管理后台（Vite + Vue 3 SPA，部署于 `admin.<域名>`）
- `apps/server` — 后端（Spring Boot + Maven）
- `.github/workflows/web.yml|server.yml|admin.yml` — GitHub Actions 镜像流水线（发版主力）
- `.cnb.yml` — CNB 双分支流水线（第二套 CI，只跟分支 push）

## 本地开发

零配置：clone 后不需要复制任何 `.env` 模板、不需要填任何值。

```bash
# 0. 本地基础设施（PostgreSQL :5432 + RustFS :9000/9001 + Mailpit :1025/8025）
docker compose -f docker-compose.dev.yml up -d

cd apps/web && pnpm install && pnpm dev      # 前端（:3000）
cd apps/admin && pnpm install && pnpm dev    # 后台（:5173，/api 代理到 :8080）
cd apps/server && mvn spring-boot:run        # 后端（:8080）
createdb forever                             # 首次：建库（Flyway 会自动建表）
```

配置分三层，各管各的：

- `apps/web/.env.development` — **入库**，web 的本地默认值（`pnpm dev` 用 `--dotenv` 加载）
- `apps/server/src/main/resources/application.yml` 的 `${VAR:默认值}` — **入库**，server 的本地默认值
  （默认值就是本地 infra 的值，所以 server 连 env 文件都不需要）；生产由 `application-prod.yml`
  把这些默认值收回为必填，镜像内 `SPRING_PROFILES_ACTIVE=prod` 已在 Dockerfile 设死
- 个人特化与真实密钥（不入库）：server 建 `.env` 后 `set -a; source .env; set +a` 启动；
  web 因 Nuxt 的 `--dotenv` 只接一个文件（dev 阶段不再自动读 `.env`），用
  `NUXT_XXX=... pnpm dev` 覆盖（环境变量优先级高于 env 文件）

`.env.example` 只作变量清单与生产参考，本地开发不需要复制它。
首次启动 server 会用 `dev/dev` 建初始管理员（仅 `sys_user` 表为空时），登录后台后请改密码。

后台与前台共用父域 HttpOnly refresh cookie：本地都在 `localhost`，跨端口天然共享，
不用为登录态做额外配置；生产需要给 server 设 `AUTH_COOKIE_DOMAIN=.<父域>`。

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
