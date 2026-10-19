<template>
  <div class="placeholder">
    <h1>{{ route.meta.title }}</h1>
    <p>页面迁移中,敬请期待。</p>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<style scoped>
.placeholder { padding: 2rem; font-family: system-ui, sans-serif; }
</style>
