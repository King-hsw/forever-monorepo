<template>
  <div>
    <div class="page-toolbar fade-up">
      <NuxtLink to="/admin/posts" class="btn btn--ghost">← 返回列表</NuxtLink>
      <button type="button" class="btn btn--ghost" :title="fullscreen ? '退出全屏 (Esc)' : '全屏专注模式'" @click="toggleFullscreen">
        {{ fullscreen ? '⤢ 退出全屏' : '⛶ 全屏' }}
      </button>
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
const fullscreen = useState('admin-editor-fullscreen', () => false)

const saving = ref(false)

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
}

// 离开页面时退出全屏，避免状态残留到其它后台页
onUnmounted(() => {
  fullscreen.value = false
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && fullscreen.value) {
    fullscreen.value = false
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

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
