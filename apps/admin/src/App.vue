<template>
  <router-view :class="[mode]" />
</template>
<script setup lang="ts">
import { computed } from 'vue';

import { useSettingStore } from '@/store';

const store = useSettingStore();

const mode = computed(() => {
  return store.displayMode;
});
</script>
<!-- nprogress 的进度条挂在 body 上，不在本组件作用域内，必须用全局样式 -->
<!-- eslint-disable-next-line vue-scoped-css/enforce-style-type -->
<style lang="less">
#nprogress .bar {
  background: var(--td-brand-color) !important;
}
</style>
