# forever Monorepo

补陋阁博客的全家桶：前台、后台、后端在同一个仓库里。

## 结构

```
.
├─ apps/
│  ├─ web/        # 前台：Nuxt 4 SSR + Tiptap，pnpm workspace 成员
│  └─ admin/      # 后台：Vue 3 + Vite + TDesign，pnpm workspace 成员
├─ servers/
│  └─ forever-server/   # 后端：Spring Boot / JDK 25 / Maven（**不进 pnpm workspace**）
├─ infra/
│  ├─ Dockerfile.admin  # 后台镜像（nginx 托管 dist + 反代 /api）
│  └─ nginx/
├─ .github/workflows/   # 镜像构建与分发（GHCR → Docker Hub + 腾讯云 CCR）
├─ .cnb.yml             # CNB 流水线（一仓三条，按改动路径触发）
└─ docs/
```

**两条腿**：`apps/` 归 pnpm 管，`servers/` 归 Maven 管。两者只在 CI 层并行，任务图里不互相依赖。

## 常用命令

```bash
pnpm install                       # 一次装好 web + admin

pnpm dev:web                       # 前台  http://localhost:3000
pnpm dev:admin                     # 后台  http://localhost:3002

pnpm build:web                     # 前端 SSR 产物 → apps/web/.output
pnpm build:admin                   # 后台静态产物  → apps/admin/dist

pnpm typecheck                     # 两端类型检查
pnpm lint                          # 目前只有 admin 配了 eslint

# 后端是独立工程，在它自己的目录里跑
cd servers/forever-server && mvn -B verify
```

**没有引入 turbo / Nx 之类的任务编排器，是刻意的。**

这个仓库的形态是「三个互不相干的项目共用一个文件夹」：Nuxt 前台、Vue 后台、Maven 后端，
它们之间**没有任何内部依赖关系**，也不存在共享包。任务编排器能提供的是依赖图和基于依赖图的缓存——
这里没有图，所以它的核心能力是空的，剩下的"并行跑脚本"和"缓存"用 pnpm 本身就够：

- `pnpm -r` 递归跑各包同名脚本，**默认排除根包**（`--include-workspace-root` 默认 false），
  所以根脚本写 `pnpm -r run build` 不会自我递归；没有该脚本的包自动跳过。
- `--parallel` 并发执行；`--filter <包名>` 只跑某一个。

等哪天真的抽出了 `packages/*`（改动 A 会连带影响 B），再上任务编排器不迟。

## 工具链版本

| 项 | 版本 | 约束在哪 |
|---|---|---|
| Node | >= 22.12.0 | 根 `package.json` 的 `engines`；CI 用 `node:22-alpine` |
| pnpm | 10.12.1 | 根 `package.json` 的 `packageManager`；CI 的 `pnpm/action-setup` 读这里 |
| JDK | 25 | `servers/forever-server/pom.xml` |

改 pnpm 版本只改 `packageManager` 一处。CI 里**不要**再写一遍 `version:`，两处都写会报 `Multiple versions of pnpm specified`。

## CI

| 平台 | 触发 | 干什么 |
|---|---|---|
| GitHub Actions | main / release / `v*` tag，按 `paths` 过滤 | 构建多架构镜像 → GHCR → skopeo 复制到 Docker Hub + 腾讯云 CCR |
| CNB | main push，按 `ifModify` 过滤 | 同样构建并推送镜像到 CNB 制品库 |

三条流水线各自独立，改前端不会触发后端构建。

### 镜像地址

| 组件 | GHCR | CNB 制品库 |
|---|---|---|
| web | `ghcr.io/king-hsw/forever` | `${CNB_DOCKER_REGISTRY}/<仓库路径>/web:latest` |
| admin | `ghcr.io/king-hsw/forever-admin` | `${CNB_DOCKER_REGISTRY}/<仓库路径>/admin:latest` |
| server | `ghcr.io/king-hsw/forever-server` | `${CNB_DOCKER_REGISTRY}/<仓库路径>/server:latest` |

> GHCR 的镜像名在 workflow 里写死，不用 `GITHUB_REPOSITORY` 推导——合仓后仓库名变了，
> 推导出来的地址会跟着变，老部署就拉不到了。
>
> CNB 用的是「非同名制品」规则：仓库路径作命名空间，后面接镜像名。
> 合仓后 web/server 的镜像地址都比以前多了一段，生产 compose 要同步改。

### 合仓后需要在 GitHub 仓库里重建的配置

secrets（同名照搬即可）：

- `DOCKERHUB_USERNAME`、`DOCKERHUB_TOKEN`
- `TENCENT_CCR_USERNAME`、`TENCENT_CCR_PASSWORD`

variables（**名字变了**，因为一个仓库只能有一份 `DOCKERHUB_IMAGE`）：

- `DOCKERHUB_IMAGE_WEB`
- `DOCKERHUB_IMAGE_SERVER`
- （admin 目前只推 GHCR，不复制到 Docker Hub，所以不需要）

## 部署形态

- **web**：Node SSR 容器，去直连后端（`NUXT_API_BASE`）
- **admin**：nginx 静态容器，同源反代 `/api` 到后端，`API_UPSTREAM` 运行时注入
- **server**：分层 JRE 容器

两个前端都建议在 nginx 层把 `/api` 反代到后端，这样浏览器全程同源，
既不用配 CORS，也不会有跨站 Cookie 问题。

后端 CORS 当前是 `setAllowedOriginPatterns("*")` 且**没有** `allowCredentials`——
所以前端请求必须 `withCredentials: false`，否则浏览器会直接拒掉跨域响应。

## 已知事项 / 待办

- `apps/web` 里还留着 14 个 Nuxt admin 页面（`app/pages/admin/**`）。后台已由 `apps/admin` 接管，
  这批页面是等 admin 实测通过后再删的回退路径。
- 尚未抽公共包（`packages/shared-types`、`api-client`、`editor`），两端接口类型目前各写各的。
- `apps/web` 还没有 eslint 配置。

## 踩过的坑

**1. `overrides` 只能写在根 `package.json`，而且 key 必须是精确包名。**

pnpm 10.12.1 读 `pnpm-workspace.yaml` 的 `overrides` 时会把它原样抄进 lockfile 头部，
但**解析阶段不生效**；`@tiptap/*` 这种通配符 key 同样不生效。两个坑叠在一起的表现是
「lockfile 里明明写着 override，装出来的还是新版本」。现有的 override 见根 `package.json`。

**2. 别在 CI 里重复声明 pnpm 版本。**

版本只写在根 `package.json` 的 `packageManager` 一处。`pnpm/action-setup` 会读它；
如果 workflow 里再写 `version:`，action 直接报 `Multiple versions of pnpm specified`。

**3. 镜像名不能从 `GITHUB_REPOSITORY` 推导。**

合仓后仓库名变了，推导出来的镜像地址跟着变，老部署就拉不到。三个 workflow 里都写死了镜像名。

**4. 一个仓库只能有一份 `DOCKERHUB_IMAGE` 变量。**

原来两个仓库各有一份，现在拆成 `DOCKERHUB_IMAGE_WEB` / `DOCKERHUB_IMAGE_SERVER`。
