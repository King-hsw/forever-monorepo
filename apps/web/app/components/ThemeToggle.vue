<template>
  <button
    type="button"
    class="theme-toggle"
    :class="{ 'theme-toggle--dark': shownDark }"
    :aria-label="shownDark ? '切换到浅色模式' : '切换到深色模式'"
    :title="shownDark ? '切换到浅色模式' : '切换到深色模式'"
    @click="toggle($event)"
  >
    <span class="theme-toggle__icon" aria-hidden="true">
      <svg class="theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
      </svg>
      <svg class="theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
      </svg>
    </span>
  </button>
</template>

<script setup lang="ts">
const { isDark, toggle } = useTheme()

// 水合完成前固定渲染浅色态，避免与 SSR 输出不一致导致 hydration mismatch
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const shownDark = computed(() => mounted.value && isDark.value)
</script>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-bg-card);
  color: var(--c-text-secondary);
  cursor: pointer;
  overflow: hidden;
  transition:
    color 0.25s,
    border-color 0.25s,
    background-color 0.25s,
    box-shadow 0.25s,
    transform 0.15s;
}

.theme-toggle:hover {
  color: var(--c-primary);
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px rgb(99 102 241 / 15%);
}

.theme-toggle:active {
  transform: scale(0.92);
}

.theme-toggle__icon {
  position: relative;
  display: block;
  width: 18px;
  height: 18px;
}

.theme-toggle__icon svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition:
    transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.3s;
}

/* 太阳：默认可见；暗色时缩小淡出并旋转 */
.theme-toggle__sun {
  transform: rotate(0deg) scale(1);
  opacity: 1;
}

.theme-toggle--dark .theme-toggle__sun {
  transform: rotate(90deg) scale(0.4);
  opacity: 0;
}

/* 月亮：默认藏起；暗色时旋入 */
.theme-toggle__moon {
  transform: rotate(-90deg) scale(0.4);
  opacity: 0;
}

.theme-toggle--dark .theme-toggle__moon {
  transform: rotate(0deg) scale(1);
  opacity: 1;
}
</style>
