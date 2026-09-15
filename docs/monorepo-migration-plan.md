# Forever Monorepo 迁移方案

> 生成于 2026-09-15。本文档只描述改造方案，**不含任何代码改动**。
> 执行前请逐条确认第 1 节的决策，尤其是标注「需你确认」的默认项。

---

## 1. 已定决策

### 1.1 你已拍板

| # | 议题 | 结论 | 直接后果 |
|---|---|---|---|
| D1 | 后台实现 | **admin 为唯一后台**，forever 只留前台 SSR | Nuxt 内嵌的 14 个 admin 页面全部下线，在 forever-admin 中重建 |
| D2 | 仓库形态 | **合成单个 git 仓库** | 需重写两个仓库的 git 历史、重建 CI 的远程引用与 secrets |
| D3 | 本次范围 | **只出方案文档** | 不动代码 |
| D4 | CI 平台 | **GitHub Actions + CNB 双线保留** | 必须做职责切分，否则维护成本翻倍（见 4.4） |

### 1.2 默认项（按此执行，如需改动请在动手前提）

| 议题 | 默认取值 | 理由 |
|---|---|---|
| 包管理器 | 统一 **pnpm 10.12.1** | 与现有 CI 中锁定的版本一致；admin 的 `package-lock.json` 需删除并重新生成 `pnpm-lock.yaml` |
| 任务编排 | **turbo**（不用 Nx） | 配置量小，只需缓存与依赖图，不需要 Nx 的代码生成能力 |
| 目录命名 | `apps/web`、`apps/admin` | 与 Nuxt / Vite 生态惯例一致 |
| `forever-admin/.cnb.yml` 的上游同步 | **删除** | 该配置会向 `github.com/Tencent/tdesign-vue-next-starter` push，入库前必须摘掉 |
| pinia 版本 | 对齐到 **v4**（forever 现有版本） | forever 用 `^4.0.3`、admin 用 `^3.0.4`，不对齐 pnpm 会装两份 |
| Node 版本 | **22**（admin 的 `engines` 要求 `>=22.12.0`） | 与现有 CI 镜像 `node:22-alpine` 一致 |
| Nuxt 的 `shared/` 目录 | **保留** `apps/web/shared/` | 这是 Nuxt 应用内 server/client 共享约定，与 monorepo 的 `packages/` 不冲突 |
| 后端 Maven 结构 | **保持单模块**，不拆 | 单人维护拆 `common/dao/service/api` 只增加构建负担（详见 4.3） |

---

## 2. 目标结构

```
forever-monorepo/
├─ package.json                 # private, packageManager: pnpm@10.12.1
├─ pnpm-workspace.yaml          # packages: apps/*, packages/*
├─ turbo.json                   # 任务图与缓存
├─ tsconfig.base.json           # 共享 compilerOptions 与 paths
├─ .npmrc                       # registry / node-linker 统一
├─ apps/
│  ├─ web/                      # ← forever，仅前台（Nuxt 4）
│  └─ admin/                    # ← forever-admin（Vue 3 + Vite 8 后台 SPA）
├─ packages/
│  ├─ shared-types/             # 接口契约唯一真源
│  ├─ api-client/               # 端点函数 + 类型（不含传输层）
│  ├─ editor/                   # Tiptap + markdown，前后台共用
│  └─ config/                   # eslint / stylelint / prettier / tsconfig 预设
├─ servers/
│  └─ forever-server/           # ← forever-server，Maven 单模块，不进 pnpm workspace
├─ infra/
│  ├─ docker-compose.yml
│  ├─ nginx/
│  └─ Dockerfile.admin          # 新增：admin 目前没有生产 Dockerfile
└─ docs/
```

**两条腿走路**：`apps/` 与 `packages/` 归 pnpm workspace 管；`servers/forever-server` 归 Maven 管。
不要在 pnpm 里尝试编排 Maven 任务 —— 两者只在 CI 层并行，不在任务图里耦合。

---

## 3. D1 的连带改动（admin 唯一后台）

这是本次改造**工作量最大的一块**，且与目录迁移耦合，必须先理清。

### 3.1 apps/web 要下线的内容

| 路径 | 处理 | 说明 |
|---|---|---|
| `app/pages/admin/**`（14 个页面） | 删除 | categories / comments / friends / posts / logs / permissions / profile / rss / settings / setup / index / login |
| `app/layouts/admin.vue` | 删除 | 仅后台使用 |
| `app/components/admin/**`（5 个组件） | 删除 | AdminConfirmDialog / AdminPostForm / AdminSidebar / AdminHeatmap / AdminSettingSwitch |
| `app/stores/createCrudStore.ts` | 删除 | 通用 CRUD 工厂，仅后台 store 使用 |
| `app/stores/auth.ts` | **保留并精简** | 前台 guest / chat / messages 仍需要登录态 |
| `app/middleware/auth.global.ts` | **改写** | 现有逻辑含 admin 路由跳转，需收敛为前台可见性控制 |
| `app/components/UploadPicker.vue` | 视情况保留 | 前台"发布动态"入口若保留则需要 |

### 3.2 关键：下线前先把 Nuxt admin 当文档用

`apps/web` 里的 admin 页面是**目前唯一接通过后端的实现**（14 个页面 + 27 个 Controller 的真实调用）。
它是 `api-client` 与 admin 重建时的**权威参考**。建议顺序：

1. 先按 3.1 表格把接口调用点、字段含义、错误处理整理出来（或直接保留代码到 Phase 3 完成后再删）
2. 再重建 admin 页面
3. 最后才删 `app/pages/admin/**`

**不要**在 Phase 2 挪目录时就顺手删掉，那会丢掉最可靠的接口契约信息。

### 3.3 apps/admin 要补齐的能力

| 能力 | 现状 | 需要 |
|---|---|---|
| 接口层 | `src/api` 只有 list / detail / permission 三个 demo | 接 27 个 Controller，改用 `@forever/api-client` |
| 认证 | 无 | 接 `AuthController` / `MeController` / `ProfileController`，token 持久化（现有 `pinia-plugin-persistedstate` 可复用） |
| 权限 | `src/permission.ts` 是脚手架占位 | 接 `AdminRbacController`，做路由级 + 按钮级控制 |
| mock | `vite-plugin-mock` + mockjs | 真实联调后保留为可选开关，不删（后端未起时可独立开发） |
| i18n | `vue-i18n` 已装 | 若只用中文可暂不维护多语言包 |
| 生产镜像 | **无根级 Dockerfile** | 新增 nginx 托管 `dist/` |

### 3.4 后端要配套的

后端 `com.forever.server` 下已有 `Public*` / `Admin*` 的命名分离，**不需要拆包**。
仅需确认：admin 作为独立域名/端口部署后，**跨域配置（CORS）与 Cookie 策略**是否放行 —— 这是前后台分离后最常踩的坑，且与当前同源部署行为不同。

---

## 4. 分阶段执行

### Phase 0：前置清理（低风险，可先做）

```bash
# 1) 摘掉 forever-admin 的 tdesign 上游同步（必须最先做）
rm -rf forever-admin/.cnb.yml forever-admin/.cnb/

# 2) 记录两个仓库当前的 CI secrets/variables 清单，合仓后要在新仓重建
#    forever:        DOCKERHUB_IMAGE, DOCKERHUB_USERNAME, DOCKERHUB_TOKEN
#                    TENCENT_CCR_USERNAME, TENCENT_CCR_PASSWORD
#    forever-server: 同上（变量名以各自 workflow 为准）
# 3) 确认 admin 的 npm 依赖在 pnpm 下能装通（pinia 3→4 的 API 差异需先验证）
```

**验收**：`forever-admin` 下不再有任何指向 tdesign 上游的配置。

---

### Phase 1：搭根骨架

新增以下文件（不动现有目录）：

**根 `package.json`**
```json
{
  "name": "forever-monorepo",
  "private": true,
  "packageManager": "pnpm@10.12.1",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.9.2"
  }
}
```

**`pnpm-workspace.yaml`**
```yaml
packages:
  - apps/*
  - packages/*
allowBuilds:
  esbuild: true
```
> 注意：现有 `forever/pnpm-workspace.yaml` 只有 `allowBuilds`，**没有 `packages:`**，所以它现在不是 workspace。

**`turbo.json`**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".output/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

**验收**：`pnpm install` 在根目录可跑通，`pnpm -r exec node -v` 能遍历到子包。

---

### Phase 2：合仓与目录迁移

#### 2.1 合并 git 历史

推荐 `git-filter-repo`（历史干净）；本机若无 brew，用 pip 装：

```bash
python3 -m pip install --user git-filter-repo
# 若 PyPI 慢，加清华源：
# python3 -m pip install --user -i https://pypi.tuna.tsinghua.edu.cn/simple git-filter-repo
```

```bash
# 1) 新建空仓
mkdir -p ~/Desktop/forever-monorepo && cd ~/Desktop/forever-monorepo
git init -b main
git commit --allow-empty -m "chore: init monorepo"

# 2) 重写 forever 的历史到 apps/web/
git clone https://cnb.cool/king-hsw/forever.git /tmp/fm-web
cd /tmp/fm-web && git filter-repo --to-subdirectory-filter apps/web

# 3) 重写 forever-server 的历史到 servers/forever-server/
git clone https://cnb.cool/king-hsw/forever-server.git /tmp/fm-server
cd /tmp/fm-server && git filter-repo --to-subdirectory-filter servers/forever-server

# 4) 依次合入主仓
cd ~/Desktop/forever-monorepo
git remote add hist-web /tmp/fm-web && git fetch hist-web
git merge --allow-unrelated-histories hist-web/main -m "chore: import forever as apps/web"
git remote add hist-server /tmp/fm-server && git fetch hist-server
git merge --allow-unrelated-histories hist-server/main -m "chore: import forever-server"

# 5) admin 无 git 历史，直接迁入
cp -R ~/Desktop/Monorepo/forever-admin apps/admin
rm -rf apps/admin/node_modules apps/admin/package-lock.json
rm -f apps/admin/.yarnrc.yml apps/admin/.npmrc
```

**备选方案（零依赖）**：用 git 自带的 `git subtree add --prefix=apps/web <remote> main`，但提交历史会混杂，不如 filter-repo。

#### 2.2 迁移后必须同步修改的引用

| 位置 | 原值 | 新值 |
|---|---|---|
| `apps/web/nuxt.config.ts` 的 devProxy | 指向后端 | 不变，但 `runtimeConfig.apiBase` 若用相对路径需复核 |
| `apps/web/Dockerfile` | `COPY .output ./.output` | 构建上下文变为仓库根，`.dockerignore` 要重新覆盖 `apps/admin`、`servers` |
| `servers/forever-server/Dockerfile` | `COPY extracted/` | 构建上下文变为 `servers/forever-server/`，路径不变但 CI 的 `--destination extracted` 要在该目录下执行 |
| `apps/web/.cnb.yml`、`servers/forever-server/.cnb.yml` | 模块级流水线 | 删除，统一到根级（见 Phase 4） |
| `servers/forever-server/.github/workflows/docker.yml` | 仓库内 | 移至根 `.github/workflows/` 并重写 paths |

**验收**：`git log --follow apps/web/app/pages/index.vue` 能看到完整历史。

---

### Phase 3：抽包

按依赖顺序做，**每抽一个包就独立验证一次**，不要四个一起改。

#### 3.1 `@forever/shared-types`（最先做，成本最低）

直接搬 `apps/web/shared/types.ts`（396 行，纯类型零依赖）。

```ts
// packages/shared-types/package.json
{
  "name": "@forever/shared-types",
  "version": "0.0.0",
  "private": true,
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```
`private: true` + 直接导 `.ts`，由消费方的打包器（Vite / Nuxt）自行编译，**不需要构建步骤**。

> 注意：`apps/web/shared/` 目录本身要保留 —— Nuxt 的 `shared/` 是应用级 server/client 共享约定，不能删。跨端契约才进 `packages/shared-types`。

#### 3.2 `@forever/api-client`

**设计要点：只管端点与类型，不管传输。**

```ts
// packages/api-client/src/createClient.ts
export type Transport = <T>(path: string, init?: RequestInit & { method?: string; body?: unknown }) => Promise<T>

export function createApiClient(transport: Transport) {
  return {
    posts: {
      list: (q: PostQuery) => transport<PageResult<Post>>('/api/posts', { method: 'GET' }),
      create: (input: PostInput) => transport<Post>('/api/admin/posts', { method: 'POST', body: input }),
      // ...
    },
    // categories / tags / comments / moments / friendLinks / rss / settings / auth / rbac ...
  }
}
```

- `apps/web` 注入 Nuxt 的 `$fetch` 适配器（SSR 时可直连 `runtimeConfig.apiBase`）
- `apps/admin` 注入 axios 适配器（复用现有 `src/utils/request/Axios.ts` 的拦截器、取消、节流）

**为什么不在包里统一 HTTP 客户端**：`apiFetch` 是 SSR 感知的，`VAxios` 是纯浏览器实现，两者语义不同。强行统一会让 SSR 端的直连逻辑失效或让 admin 失去节流/取消能力。

**契约来源**：后端已依赖 springdoc 3.1.0，`/v3/api-docs` 就是现成的 `openapi.json`。
可执行路径：先用 springdoc 生成 spec → 用 `openapi-typescript` 生成类型到 `packages/shared-types/src/generated.ts` → 手写 `api-client` 的端点函数。
**建议分两步走**：第一版手写（对照 Nuxt admin 的现有调用），跑通后接入生成，避免一开始就被工具链卡住。

#### 3.3 `@forever/editor`

来源：`apps/web/app/components/TiptapEditor.vue` + `apps/web/app/extensions/*`（`CodeBlockLineNumbers.ts`、`TableMarkdownSafe.ts`）。
依赖：`@tiptap/* 3.30.2` 全家桶（版本已锁定，直接复用 `apps/web` 的版本号）。

前后台发文章都需要，是**真实共用点**。注意 Tiptap 相关依赖要从 `apps/web/package.json` 移到本包，避免装两份。

#### 3.4 `@forever/config`

把 admin 现有的工程配置提升到根级供两端继承：
- `eslint.config.js`（`@antfu/eslint-config` + `typescript-eslint` + `eslint-plugin-vue-scoped-css`）
- `.prettierrc.js`、`stylelint.config.js`、`.editorconfig`
- `tsconfig.base.json`
- husky + lint-staged + commitlint（`@commitlint/config-conventional`）

**这是 monorepo 最直接的收益**：`apps/web` 目前**没有任何 lint 配置**，接上后自动获得。

---

### Phase 4：CI 双线改造（D4 落地）

#### 4.1 职责切分（关键：不重叠就不算翻倍）

| 平台 | 触发 | 职责 | 明确不做 |
|---|---|---|---|
| **CNB** | 任意分支 push | 构建校验、lint、typecheck；改动范围过滤 | **不推任何镜像** |
| **GitHub Actions** | main / release / `v*` tag | 镜像构建与分发（GHCR 多架构 → merge → skopeo → Docker Hub + 腾讯云 CCR） | 不做 lint / 单测 |

这样两套是**互补而非重复**：CNB 管"代码合不合格"，GitHub 管"镜像发出去了没"。

#### 4.2 CNB 侧：改为按路径过滤

根级 `.cnb.yml` 用 `imports` 或 stage 条件区分前端与后端，避免改前端也跑 mvn：

```yaml
# 示意：前端校验
"apps/**":
  push:
    - stages:
        - name: pnpm install
          script: npm install -g pnpm@10.12.1 && pnpm install --frozen-lockfile
        - name: lint & typecheck
          script: pnpm turbo run lint typecheck --filter='...[HEAD^1]'

# 示意：后端校验
"servers/**":
  push:
    - docker:
        image: maven:3.9-eclipse-temurin-25
      stages:
        - name: mvn verify
          script: cd servers/forever-server && mvn -B verify
```
> CNB 的路径匹配语法以平台文档为准，这里只表示意图。

#### 4.3 GitHub Actions 侧：paths 过滤 + 一个必踩的坑

```yaml
on:
  push:
    branches: [main, release]
    tags: ['v*']
    paths:
      - 'apps/web/**'
      - 'packages/**'
      - '.github/workflows/build-web.yml'
```

**坑**：若仓库开了分支保护并把该 workflow 设为「必需检查」，当改动不匹配 `paths` 时 workflow 不会触发，**PR 会永远停在 pending**。
解法二选一：
1. workflow 始终触发，在 job 内部用 `dorny/paths-filter` 判断后再决定是否执行构建步骤
2. 不把它设为必需检查

**后端 workflow 同理**，`paths` 只留 `servers/forever-server/**`。
注意 `packages/**` 变化要触发**前端**镜像重建，但**不需要**触发后端 —— 依赖图别写反。

#### 4.4 镜像与 Dockerfile 的路径调整

| 镜像 | Dockerfile | 构建上下文 | CI 中的额外步骤 |
|---|---|---|---|
| web | `apps/web/Dockerfile` | 仓库根 | `pnpm turbo run build --filter=web`（产物在 `apps/web/.output`） |
| admin | **`infra/Dockerfile.admin`（新增）** | 仓库根 | `pnpm turbo run build --filter=admin`，nginx 托管 `apps/admin/dist` |
| server | `servers/forever-server/Dockerfile` | `servers/forever-server/` | `mvn package` → `java -Djarmode=tools -jar target/*.jar extract --layers --destination extracted` |

三个镜像名建议统一前缀（如 `forever-web` / `forever-admin` / `forever-server`），便于 compose 引用。

---

### Phase 5：infra 收拢

新增 `infra/`：

```
infra/
├─ docker-compose.yml        # web + admin + server + postgres + rustfs
├─ nginx/
│  ├─ web.conf               # 前台反代 + 静态缓存
│  └─ admin.conf             # 后台静态托管 + /api 反代
├─ Dockerfile.admin
└─ .env.example
```

**部署形态的实质变化**：现在是"前台 SPA 与后端同源，nginx 转发 `/api`"；admin 独立成站后变成**两个域名/端口**，必须处理：
- 后端 CORS（或在 nginx 层做统一入口，把 `/api` 同时反代给两个前端 —— 推荐后者，可完全避开 CORS）
- 登录态传递方式（Cookie 域 / token 存储）二选一并且两个前端保持一致

---

## 5. 关键坑清单

1. **`forever-admin/.cnb.yml` 会向 tdesign 上游 push** —— 入库前必删，否则把你的内容推到别人仓库。
2. **Nuxt 只认项目根下的 `shared/`** —— 搬到 `apps/web/` 后该目录仍是 Nuxt 应用根，别破坏约定。
3. **pinia 3 vs 4** —— admin 要升到 v4，`createPinia` / store 用法有差异，需先验证。
4. **`forever/pnpm-workspace.yaml` 没有 `packages:` 字段** —— 它现在不是 workspace，别以为已经配好了。
5. **admin 无生产 Dockerfile** —— 发布链路要新增，此前它从未被容器化。
6. **后端分层镜像的 `extracted/` 路径** —— `COPY extracted/...` 的四层必须同根（`layers.idx` 相对路径决定），改构建上下文时别动这个结构。
7. **`forever-server` 的 `.cnb.yml` 与 GitHub `docker.yml` 并存** —— 合仓后会出现两份后端流水线，必须按 4.1 切分，否则重复构建。
8. **GHCR 一致性延迟** —— 现有 workflow 已带重试（merge 后 6 次、镜像复制 5 次），迁移时**不要把这段重试逻辑简化掉**。

---

## 6. 验收清单

按 Phase 逐条打勾：

- [ ] Phase 0：`forever-admin` 无任何 tdesign 上游配置；CI secrets 清单已记录
- [ ] Phase 1：根目录 `pnpm install` 通过
- [ ] Phase 2：`git log --follow apps/web/app/pages/index.vue` 有完整历史；三个目录就位
- [ ] Phase 3：`@forever/shared-types` 被两端正确引用；`pnpm -r typecheck` 通过
- [ ] Phase 3：`api-client` 在 web/admin 各自注入 transport 后能跑通至少一个真实接口
- [ ] Phase 3：`apps/web` 有 lint 且 `turbo run lint` 通过
- [ ] Phase 4：CNB 在分支 push 时做校验且不推镜像；GitHub 只在 main/tag 推镜像
- [ ] Phase 4：改 `apps/admin` 不会触发后端镜像重建
- [ ] Phase 5：`infra/docker-compose.yml` 一条命令起全套
- [ ] Phase 5：admin 独立部署后登录态可用，无 CORS 报错

---

## 7. 工作量判断

| Phase | 相对成本 | 说明 |
|---|---|---|
| Phase 0 | 极低 | 删文件 + 记录 |
| Phase 1 | 低 | 新增 5 个配置文件 |
| Phase 2 | 中 | 合仓有冲突风险，但一次性 |
| Phase 3 | **高** | `api-client` 要覆盖 27 个 Controller；editor 抽包有 Tiptap 版本约束 |
| Phase 4 | 中高 | 三套镜像 + 两套平台的路径过滤，调试成本主要在这里 |
| Phase 5 | 中 | compose + nginx + CORS 打通 |

**真正的大头是 D1（admin 重建 14 个页面并接后端），不是 monorepo 本身。**
建议把 D1 与 Phase 1-2 解耦：先完成骨架与合仓（机械工作、风险可控），admin 重建作为长期任务并行推进。
