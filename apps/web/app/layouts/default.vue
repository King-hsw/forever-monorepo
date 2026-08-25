<template>
  <div>
    <!-- 全站唯一的 Header：放在布局里，切页不重挂，避免导航闪烁 -->
    <SiteHeader :width="headerWidth" />
    <slot />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

/** 各版面头部内容区宽度，与页面版心对齐；未列出的用 800px 兜底 */
const HEADER_WIDTHS: [string, string][] = [
  ['/', '1080px'],
  ['/posts/', '780px'],
  ['/moments', '960px'],
  ['/message', '960px'],
]

const headerWidth = computed(() => {
  if (route.path === '/') return '1080px'
  return HEADER_WIDTHS.find(([p]) => route.path.startsWith(p))?.[1] ?? '800px'
})
</script>
