<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="`当前${MODE_LABEL[shownMode]}主题，点击切换`"
    :title="`切换主题（当前：${MODE_LABEL[shownMode]}）`"
    @click="onClick"
  >
    <!-- 太极：每次点击旋转半圈，配合 View Transition 的圆形揭幕换肤 -->
    <svg
      class="theme-toggle__icon"
      :class="{ 'theme-toggle__icon--spin': spinning }"
      viewBox="0 0 24 24"
      aria-hidden="true"
      @animationend="spinning = false"
    >
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6" />
      <path d="M12 2a5 5 0 0 1 0 10 5 5 0 0 0 0 10A10 10 0 0 0 12 2Z" fill="currentColor" />
      <circle cx="12" cy="7" r="1.5" :fill="'var(--c-bg-card)'" />
      <circle cx="12" cy="17" r="1.5" fill="currentColor" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import type { ThemeMode } from '~/composables/useTheme'

const { mode, toggle } = useTheme()

const MODE_LABEL: Record<ThemeMode, string> = { light: '浅色', dark: '暗夜', ink: '水墨' }

// 水合完成前固定渲染浅色态，避免与 SSR 输出不一致导致 hydration mismatch
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const shownMode = computed(() => (mounted.value ? mode.value : 'light'))

/** 点击时让太极转起来；animationend 后摘掉类，下次点击可重播 */
const spinning = ref(false)
function onClick(e: MouseEvent) {
  spinning.value = true
  return toggle(e)
}
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
  width: 18px;
  height: 18px;
}

.theme-toggle__icon--spin {
  animation: taiji-spin 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes taiji-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(180deg); }
}
</style>
