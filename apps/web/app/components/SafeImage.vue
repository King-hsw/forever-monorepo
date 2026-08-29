<template>
  <!-- 正常渲染原生 img；地址为空或加载失败时改渲染占位元素 -->
  <!-- 占位元素继承外部传入的 class / style，尺寸、圆角与首字配色沿用各处既有样式，切换不跳版 -->
  <img
    v-if="!failed && src"
    :src="src"
    :alt="alt"
    :loading="loading"
    @error="failed = true"
  >
  <span v-else class="safe-image__ph" :class="`safe-image__ph--${variant}`" aria-hidden="true">
    <Icon v-if="variant === 'image'" name="lucide:image-off" mode="svg" />
    <template v-else>{{ text }}</template>
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** 图片地址；为空或加载失败时显示占位 */
  src?: string | null
  alt?: string
  /** image：灰底裂图图标（内容图）；avatar：首字占位（头像，配色由外部 class 提供） */
  variant?: 'image' | 'avatar'
  /** avatar 占位文字，缺省取 alt 首字符 */
  fallbackText?: string
  loading?: 'lazy' | 'eager'
}>(), {
  src: null,
  alt: '',
  variant: 'image',
  fallbackText: '',
  loading: 'lazy',
})

const failed = ref(false)

/** 地址更新（更换头像、重试上传）后重新尝试加载 */
watch(() => props.src, () => {
  failed.value = false
})

const text = computed(() => props.fallbackText || props.alt.trim().slice(0, 1) || '？')
</script>

<style scoped>
.safe-image__ph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
}

/* 内容图占位：无固有高度的容器（如单图）按比例撑起防塌陷；图标随容器缩放 */
.safe-image__ph--image {
  aspect-ratio: 4 / 3;
  color: var(--c-text-muted);
  background: var(--c-bg-soft);
}

.safe-image__ph--image svg {
  width: 34%;
  min-width: 18px;
  max-width: 44px;
  height: auto;
  opacity: 0.55;
}
</style>
