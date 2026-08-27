<template>
  <div class="app-shell">
    <!-- 桌面端左侧竖排导航（≥901px），移动端回落为顶部 Header -->
    <SiteRail />
    <SiteHeader :width="headerWidth" />
    <div class="app-shell__body">
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
  ['/posts/', '1080px'],
  ['/moments', '960px'],
  ['/message', '960px'],
  ['/chat', '100%'],
]

const headerWidth = computed(() => {
  if (route.path === '/') return '1080px'
  return HEADER_WIDTHS.find(([p]) => route.path.startsWith(p))?.[1] ?? '800px'
})
</script>

<style scoped>
.app-shell__body {
  min-height: 100vh;
}

/* 桌面端：内容整体让出左栏宽度 */
@media (min-width: 901px) {
  .app-shell__body {
    padding-left: 88px;
  }
}

/* 移动端：隐藏桌面左栏（SiteRail 自身已 display:none），顶栏照常 */
</style>
