<template>
  <div>
    <template v-if="post">
      <AdminPostForm :initial="post" :status="post.status" :saving="saving" @save="onSave" />
    </template>
    <div v-else-if="error" class="card load-error">
      <p>文章加载失败：{{ error.message }}</p>
      <NuxtLink to="/admin/posts" class="btn btn--primary">返回列表</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PostInput, PostStatus } from '#shared/types'

definePageMeta({ layout: 'admin' })

useHead({ title: '编辑文章 - Forever 后台' })
useState('admin-page-title', () => '编辑文章')

const route = useRoute()
const postsStore = usePostsStore()

const id = String(route.params.id)

// 拉取文章详情（含 content），id 不存在 → 弹回列表页
// 仅客户端拉取：登录令牌存在 localStorage，SSR 阶段拿不到
const { data: post, error } = await useAsyncData(`admin-article-${id}`, () =>
  postsStore.getById(id),
  { server: false },
)
if (error.value || !post.value) {
  await navigateTo('/admin/posts')
}

const saving = ref(false)

async function onSave(input: PostInput, status: PostStatus) {
  if (!post.value) return
  saving.value = true
  try {
    await postsStore.update(id, input)
    // 同步状态：仅在与当前状态不一致时调用发布 / 下线接口
    if (post.value.status !== status) {
      await postsStore.setStatus(post.value.id, status)
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
.load-error {
  padding: 40px;
  text-align: center;

  p {
    margin-bottom: 12px;
    color: var(--c-text-muted);
  }
}
</style>
