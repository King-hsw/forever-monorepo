<template>
  <div>
    <div class="page-toolbar fade-up">
      <NuxtLink to="/admin/posts" class="btn btn--ghost">← 返回列表</NuxtLink>
    </div>
    <AdminPostForm :saving="saving" @save="onSave" />
  </div>
</template>

<script setup lang="ts">
import type { PostInput, PostStatus } from '#shared/types'

definePageMeta({ layout: 'admin' })

useHead({ title: '新建文章 - Forever 后台' })
useState('admin-page-title', () => '新建文章')

const postsStore = usePostsStore()

const saving = ref(false)

async function onSave(input: PostInput, status: PostStatus) {
  saving.value = true
  try {
    // 后端创建默认为草稿，选择发布时再调用发布接口
    const post = await postsStore.create(input)
    if (status === 'PUBLISHED') {
      await postsStore.setStatus(post.id, 'PUBLISHED')
    }
    await navigateTo('/admin/posts')
  } catch (err) {
    alert(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
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
