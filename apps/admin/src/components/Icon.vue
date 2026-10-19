<template>
  <Iconify
    :icon="name"
    :width="size ?? undefined"
    :height="size ?? undefined"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
/**
 * 本地图标组件:替代 Nuxt 的 <Icon name="lucide:图标名">。
 * - 图标数据来自 @iconify-json/lucide,构建时打包,运行时不请求外网
 * - size → width/height;mode/stroke-width 等属性透传到 svg
 */
import { Icon as Iconify, addCollection } from '@iconify/vue'
// 构建前由 scripts/build-icons.mjs 生成:只含实际用到的图标
import lucide from '../icons.generated.json'

addCollection(lucide as Parameters<typeof addCollection>[0])

defineOptions({ inheritAttrs: true })

defineProps<{
  name: string
  size?: number | string
}>()
</script>
