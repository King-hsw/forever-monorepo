# Forever

> 一个用 Nuxt 4 构建的个人博客：前台展示 + 管理后台 + PWA 离线可用，对接 Spring Boot 3 后端 forever-server。

记录技术与思考 ✍️

## 功能特性

### 前台

- **首页**：视差 Hero（逐字浮现渐变标题、玻璃拟态统计卡片）、标签跑马灯、章节侧边导航、滚动进度条、回到顶部
- **文章**：列表页支持分类筛选与分页；详情页渲染 Markdown（代码高亮、代码块行号），排版样式由 `prose.css` 统一驱动
- **友链**：友链展示页 + 在线申请页
- **订阅**：`/rss.xml`（RSS 2.0）与 `/sitemap.xml` 由服务端路由实时生成
- **SEO**：`usePageSeo()` 组合式函数统一注入 title / description / keywords / canonical / Open Graph / Twitter Card
- **主题**：亮色「Kawaii Minimal」/ 暗色「深梅子夜」双主题，首屏防闪烁，切换带圆形扩散动画

### 管理后台（`/admin`）

- 登录鉴权（JWT，localStorage 持久化，全局路由中间件守卫）
- 文章管理：Tiptap 富文本编辑器（所见即所得，Markdown 同步输出）、封面图上传、草稿 / 发布状态
- 分类管理、友链申请审核、RSS 订阅源管理（增删改查、手动刷新、启停用）

### PWA

由 [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/guide/frameworks/nuxt.html) 驱动：

- `manifest.webmanifest` 与 service worker（`sw.js`）构建时自动生成
- 应用外壳与静态资源预缓存；页面导航采用 NetworkFirst 策略（离线时回退到缓存页）
- 图标位于 `public/icons/`，应用名称 / 主题色等在 `nuxt.config.ts` 的 `pwa.manifest` 中修改
- 安装与离线能力需要生产环境以 **HTTPS**（或 `localhost`）提供服务

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Nuxt 4 + Vue 3 + TypeScript |
| 状态管理 | Pinia |
| 编辑器 | Tiptap 3（统一锁定 `3.30.2`）|
| Markdown 渲染 | marked + marked-highlight + highlight.js + lowlight |
| PWA | @vite-pwa/nuxt（Workbox）|
| 包管理 | pnpm |

## 目录结构

```
├── app/
│   ├── components/
│   │   ├── SiteFooter.vue        # 全站页脚（品牌区 + 链接列 + 运行时长）
│   │   ├── ThemeToggle.vue       # 主题切换按钮
│   │   ├── TiptapEditor.vue      # 富文本编辑器
│   │   ├── MarkdownView.vue      # Markdown 渲染
│   │   └── admin/                # 后台组件（侧边栏、表单、确认弹窗等）
│   ├── layouts/                  # default（前台）/ admin / auth
│   ├── middleware/auth.global.ts # 后台路由守卫
│   ├── pages/
│   │   ├── index.vue             # 首页
│   │   ├── posts/                # 文章列表 / 详情
│   │   ├── friends/              # 友链展示 / 申请
│   │   └── admin/                # 后台（登录、文章、分类、友链、RSS）
│   ├── stores/                   # Pinia store 与 API 契约类型
│   └── utils/api.ts              # 统一 API 客户端（解包 ApiResponse、携带令牌）
├── assets/css/                   # main.css（设计令牌）/ prose.css（文章排版）
├── server/
│   ├── api/[...path].ts          # /api/** 反向代理到 forever-server
│   └── routes/                   # rss.xml / sitemap.xml 服务端路由
└── shared/types.ts               # 前后端共享的 API 契约类型
```

## 快速开始

### 前置要求

- Node.js ≥ 20，pnpm
- 运行中的 forever-server（Spring Boot 3，默认 `http://localhost:8080`）

```bash
# 安装依赖
pnpm install

# 启动开发服务器（http://localhost:3000）
pnpm dev
```

### 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NUXT_API_BASE` | `http://localhost:8080` | forever-server 地址（仅服务端使用） |
| `NUXT_PUBLIC_SITE_URL` | `https://forever.example.com` | 站点地址，sitemap / RSS / OG 等绝对链接使用 |
| `NUXT_PUBLIC_API_BASE` | 空（同源） | 浏览器端 API 地址，一般无需修改 |

环境参数通过 `.env` 文件管理，项目根目录提供模板 [.env.example](.env.example)：

```bash
cp .env.example .env   # 本地开发用；生产可复制为 .env.production
```

- `nuxt dev` / `nuxt build` 会自动读取根目录的 `.env`；也可以用 `--dotenv` 指定其它文件，例如 `nuxt build --dotenv .env.production`
- 真实的 `.env` / `.env.production` 已被 `.gitignore` 忽略，不会提交到仓库
- **注意**：Nuxt 只在 dev / build 阶段读取 `.env`。生产「运行时」（`node .output/server/index.mjs`）请通过系统环境变量注入（systemd / Docker / PM2 等），或构建时把最终值写进 `.env.production` 后再打包

### 生产构建

```bash
pnpm build      # 构建到 .output/
pnpm preview    # 本地预览生产构建
```

## 架构说明

### API 代理

浏览器与 SSR 的请求统一走 Nitro 路由 `server/api/[...path].ts` 反向代理到 forever-server：

- 避免浏览器跨域（CORS）问题
- 自动改写 `Origin` / `Referer` / `Host` 头，通过后端 Spring Security 校验

前端统一使用 `app/utils/api.ts` 的 `apiFetch<T>()`：自动解包后端 `ApiResponse<T>`（`code === 0` 取 `data`，否则抛 `ApiError`），并自动携带 `Authorization: Bearer` 令牌。

接口契约类型定义在 `shared/types.ts`，与后端 Swagger 保持同步。

### 认证

登录信息（token + 用户名）持久化在 localStorage。全局中间件 `app/middleware/auth.global.ts` 守卫所有 `/admin/**` 路由：未登录跳转 `/admin/login?redirect=...`，已登录访问登录页则跳回后台。

## 相关文档

- Tiptap 编辑器与 Markdown 渲染的用法、注意事项见下文附录
- 后端接口文档：`http://localhost:8080/swagger-ui/index.html`

---

## 附录：Tiptap 富文本编辑器 + Markdown 渲染

- `app/components/TiptapEditor.vue` — 富文本编辑器（自动导入）
- `app/extensions/CodeBlockLineNumbers.ts` — Tiptap 代码块行号扩展
- `app/components/MarkdownView.vue` — Markdown 渲染（自动导入）
- 依赖：`@tiptap/vue-3`、`@tiptap/pm`、`@tiptap/starter-kit`、`@tiptap/markdown`（统一锁定 `3.30.2`）；`marked`、`marked-highlight`、`highlight.js`

### 用法

```vue
<script setup lang="ts">
const content = ref('<p>初始内容</p>') // HTML
const markdown = ref('') // 由编辑器自动填充
</script>

<template>
  <!-- v-model = HTML，v-model:markdown = 对应 Markdown，fluid = 撑满父容器 -->
  <TiptapEditor v-model="content" v-model:markdown="markdown" fluid />

  <!-- 用 MarkdownView 渲染 Markdown -->
  <MarkdownView :source="markdown" />
</template>
```

### 功能

- StarterKit 全部基础扩展：标题、加粗、斜体、下划线、删除线、行内代码、代码块、引用、有序/无序列表、分割线、链接
- 代码块行号：Tiptap 编辑器内（`CodeBlockLineNumbers` 扩展，纯装饰，不进入文档内容）与 Markdown 渲染结果中都会显示
- `v-model` 双向绑定（HTML），`v-model:markdown` 同步输出 Markdown
- `fluid` 模式撑满父容器
- Markdown 渲染支持 GFM + 代码块语法高亮（highlight.js）+ 行号显示
- SSR 安全：`immediatelyRender: false`，仅在客户端 hydration 后渲染

### 注意

Tiptap 的 `Markdown` 扩展默认会把自定义 tokenizer（如下划线的 `++text++`）注册到**全局** `marked` 实例上，会污染页面里其他用 `marked` 渲染的地方（导致 `Token with "underline" type was not found` 报错）。本项目两处都改用**独立的 `new Marked()` 实例**，互不影响。如果在你自己的项目里遇到该报错，给 `Markdown.configure({ marked: new Marked() })` 传入独立实例即可。
