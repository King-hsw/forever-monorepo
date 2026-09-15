<template>
  <!-- 主题切换三态按钮：浅色 → 深色 → 跟随系统。
       顶栏（SiteHeader，移动端）与左栏（SiteRail，桌面端）共用本组件，
       两侧各自按断点条件渲染，保证 DOM 中同时只存在一个实例。 -->
  <button
    type="button"
    class="theme-toggle"
    :aria-label="nextLabel"
    :title="title || undefined"
    @click="setNext($event)"
  >
    <Icon name="lucide:sun" mode="svg" :size="size" class="theme-toggle__ico theme-toggle__ico--sun" />
    <Icon name="lucide:moon" mode="svg" :size="size" class="theme-toggle__ico theme-toggle__ico--moon" />
    <!-- 跟随系统：半明半暗圆（右半填充，lucide 无对应图形，保留自绘） -->
    <svg
      class="theme-toggle__ico theme-toggle__ico--auto"
      viewBox="0 0 24 24"
      :width="size"
      :height="size"
      fill="none"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number
    strokeWidth?: number
    title?: string
  }>(),
  {
    size: 16,
    strokeWidth: 2.2,
    title: '',
  },
)

const { setNext, nextLabel } = useTheme()
</script>
