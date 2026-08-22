<template>
  <div>
    <div class="page-toolbar fade-up">
      <NuxtLink to="/admin/posts" class="btn btn--ghost">← 返回列表</NuxtLink>
    </div>
    <AdminPostForm @save="onSave" />
  </div>
</template>

<script setup lang="ts">
import type { PostInput } from '~/stores/types'

definePageMeta({ layout: 'admin' })

useHead({ title: '新建文章 - Forever 后台' })
useState('admin-page-title', () => '新建文章')

const postsStore = usePostsStore()

async function onSave(input: PostInput) {
  postsStore.create(input)
  await navigateTo('/admin/posts')
}
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 14px;

  .btn {
    padding: 4px 10px;
    font-size: 13px;
  }
}
</style>
