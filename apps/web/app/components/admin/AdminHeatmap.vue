<template>
  <div class="heatmap-card card">
    <header class="panel-head">
      <h2>创作热力图</h2>
    </header>
    <PostHeatmap :posts="posts">
      <template #empty>
        最近一年还没有发文记录，<NuxtLink to="/admin/posts/new">写下第一篇</NuxtLink>吧 <Icon name="lucide:pen-line" />
      </template>
    </PostHeatmap>
  </div>
</template>

<script setup lang="ts">
import type { Post } from '#shared/types'

defineProps<{
  /** 文章列表（含草稿），按 createdAt 统计每日发文数 */
  posts: Post[]
}>()
</script>

<style scoped>
.heatmap-card {
  padding: 20px;
}

.panel-head {
  margin-bottom: 4px;

  h2 {
    margin: 0;
    font-size: 15px;
  }
}
</style>
