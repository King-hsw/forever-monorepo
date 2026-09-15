<template>
  <div class="app-shell">
    <!-- 桌面端左侧竖排导航（≥901px），移动端回落为顶部 Header -->
    <SiteRail />
    <SiteHeader :width="headerWidth" />
    <SiteTabBar />
    <div class="app-shell__body" :class="{ 'app-shell__body--fixed': isFixedPage }">
      <slot />
    </div>
    <GlobalSearch />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

/** 各版面头部内容区宽度，与页面版心对齐；未列出的用 800px 兜底 */
const HEADER_WIDTHS: [string, string][] = [
  ['/', '1080px'],
  ['/posts', '800px'],
  ['/moments', '960px'],
  ['/chat', '100%'],
  ['/admin', '100%'],
]

const headerWidth = computed(() =>
  HEADER_WIDTHS.find(([p]) => route.path === p || route.path.startsWith(`${p}/`))?.[1] ?? '800px',
)

/** 满视口固定布局页（聊天）：页面本身不滚动，滚动发生在页内消息列表 */
const isFixedPage = computed(() =>
  route.path === '/chat' || route.path.startsWith('/chat/'),
)
</script>

<style scoped>
.app-shell__body {
  min-height: 100vh;
  /* iOS PWA standalone：顶栏为避开刘海整体变高（padding-top 含安全区），
     内容区同步下移等量高度，浏览器模式下 env 为 0 无影响 */
  padding-top: var(--safe-area-inset-top);
}

/* 聊天页（微信式）：高度由页面按视口精确计算，布局层不再撑最小高，
   避免浏览器模式 dvh < vh 时整页出现少量滚动 */
.app-shell__body--fixed {
  min-height: auto;
}

/* 桌面端：内容整体让出左栏宽度 */
@media (min-width: 901px) {
  .app-shell__body {
    padding-left: 88px;
  }
}

/* 移动端：隐藏桌面左栏（SiteRail 自身已 display:none），顶栏照常 */

/* 移动端：主内容区预留底部空间（Tab Bar 卡片高 + 基础间隙 + 安全区），不被悬浮 Tab Bar 遮挡 */
@media (max-width: 640px) {
  .app-shell__body {
    padding-bottom: calc(var(--tabbar-space) + var(--safe-area-inset-bottom));
  }

  /* 聊天页的 Tab Bar 让位改由页内发送区自己处理，保证整页恰好视口高、无页面滚动 */
  .app-shell__body--fixed {
    padding-bottom: 0;
  }
}
</style>
