<template>
  <div>
    <template v-if="post">
      <div class="page-toolbar fade-up">
        <NuxtLink to="/admin/posts" class="btn btn--ghost">← 返回列表</NuxtLink>
        <span class="badge" :class="`badge--${post.status}`">
          {{ post.status === 'published' ? '已发布' : '草稿' }}
        </span>
      </div>
      <AdminPostForm :initial="post" @save="onSave" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PostInput } from '~/stores/types'

definePageMeta({ layout: 'admin' })

useHead({ title: '编辑文章 - Forever 后台' })
useState('admin-page-title', () => '编辑文章')

const route = useRoute()
const postsStore = usePostsStore()

// id 不存在 → 弹回列表页
const post = postsStore.getById(String(route.params.id))
if (!post) {
  await navigateTo('/admin/posts')
}

async function onSave(input: PostInput) {
  if (post) {
    postsStore.update(post.id, input)
  }
  await navigateTo('/admin/posts')
}
</script>

<style scoped>
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  .btn {
    padding: 4px 10px;
    font-size: 13px;
  }
}
</style>
