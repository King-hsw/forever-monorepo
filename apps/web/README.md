# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## PWA

This project is a PWA, powered by [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/guide/frameworks/nuxt.html).

- **manifest.webmanifest** + service worker (`sw.js`) are generated automatically at build time
- The app shell and static assets are pre-cached for offline use; page navigations use a NetworkFirst strategy (cached pages stay available offline)
- SW registration and manifest link injection happen via the `@vite-pwa/nuxt` client plugin and the `<NuxtPwaAssets />` component in `app/app.vue`

Icons live in `public/icons/`. To change the app name, theme color or other manifest fields, edit the `pwa.manifest` section of `nuxt.config.ts`.

Note: PWA features (install prompt, offline mode) require serving the app over **HTTPS** (or `localhost`) in production.

## Tiptap 富文本编辑器 + Markdown 渲染

项目内置了一个基于 [Tiptap](https://tiptap.dev) 的富文本编辑器组件，以及配套的 Markdown 渲染组件。首页（`/`）采用**左右分栏**布局：左侧用 Tiptap 编辑，右侧实时显示对应的 **Markdown 源码**和**渲染结果**。

- `app/components/TiptapEditor.vue` — 富文本编辑器（自动导入）
- `app/extensions/CodeBlockLineNumbers.ts` — Tiptap 代码块行号扩展
- `app/components/MarkdownView.vue` — Markdown 渲染（自动导入）
- `app/pages/index.vue` — 分栏演示页（内容自动保存到 `localStorage`）
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
- `fluid` 模式撑满父容器（用于分栏布局）
- Markdown 渲染支持 GFM + 代码块语法高亮（highlight.js）+ 行号显示
- SSR 安全：`immediatelyRender: false`，仅在客户端 hydration 后渲染

### 注意

Tiptap 的 `Markdown` 扩展默认会把自定义 tokenizer（如下划线的 `++text++`）注册到**全局** `marked` 实例上，会污染页面里其他用 `marked` 渲染的地方（导致 `Token with "underline" type was not found` 报错）。本项目两处都改用**独立的 `new Marked()` 实例**，互不影响。如果在你自己的项目里遇到该报错，给 `Markdown.configure({ marked: new Marked() })` 传入独立实例即可。
