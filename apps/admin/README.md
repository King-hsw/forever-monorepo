# forever-admin

`forever-server` 的后台管理前端。Vue 3 + Vite + TypeScript，UI 用 [TDesign Vue Next](https://tdesign.tencent.com/vue-next/)，
脚手架源自 TDesign Vue Next Starter（见 `LICENSE`）。

## 定位

Monorepo 中 **后台唯一入口**。原先内嵌在 `apps/web`（Nuxt）里的 `/admin/**` 页面已下线，
后台功能全部收拢到这里，前台只保留 SSR 展示。

## 开发

```bash
# 在 apps/admin 里执行
pnpm install
pnpm dev                             # http://localhost:3002
```

开发期 `/api` 由 Vite 代理转发到 `VITE_PROXY_TARGET`（见 `.env.development`，默认 `http://127.0.0.1:8080`），
不经过浏览器跨域。

## 构建

```bash
pnpm build                           # 先 vue-tsc 类型检查，产物在 dist/
```

生产环境为纯静态站点，由 nginx 托管并反代 `/api` 到后端；镜像见本目录 `Dockerfile`（nginx 模板在 `nginx/`）。

## 配置

环境变量全部走 Vite 的 `VITE_` 前缀，构建期注入：

| 变量 | 说明 |
|---|---|
| `VITE_BASE_URL` | 静态资源基础路径，默认 `/` |
| `VITE_API_URL` | 后端地址。**留空 = 同源**，生产由 nginx 反代，一般不需要改 |
| `VITE_PROXY_TARGET` | 仅开发期使用，Vite devServer 的 `/api` 代理目标 |

> 真实配置在 `.env`（已 gitignore），模板见 `.env.development`。

## 目录

```
src/
├─ api/          # 按模块拆分的接口层（auth / content / interaction / site / system / upload）
├─ pages/        # 业务页面，按后台菜单分组
├─ router/       # 路由，业务路由集中在 modules/blog.ts
├─ store/        # Pinia：user（登录态+权限）、permission（静态路由）
├─ utils/request # axios 封装：Bearer 双 token、401 单飞刷新重放
└─ layouts/      # TDesign Starter 的布局体系
```

## 与后端的约定

- 响应统一 `ApiResponse<T>`，`code === 0` 为成功；分页统一 `PageResult<T>`，参数是 `page` / `size`（不是 `pageSize`）
- 认证走 Bearer 双 token（access + refresh），**不是 JWT**
- 权限是后端下发的 RBAC 权限码，前端用 `userStore.hasPermission(code)` 做按钮级控制
- 上传是内容寻址直传 RustFS：md5 秒传校验 + 8MB 分片，见 `src/api/upload.ts`

## 已知事项

- `pinia` 固定在 v3（`apps/web` 用 v4）。两套版本各自装在自己的 `node_modules` 里，互不影响；
  升级到 v4 需单独验证，别顺手改。
- `vue-i18n` 语言包仍是 TDesign Starter 那套，中文页面基本用不到多语言，暂不维护。
