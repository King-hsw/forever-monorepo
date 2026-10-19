<template>
  <div>
    <AdminPostForm :saving="saving" @save="onSave" />
  </div>
</template>

<script setup lang="ts">
import { errMsg } from '~/utils/api'
import { ref } from 'vue'
import { navigateTo, useAdminPage } from '../../composables/nuxt-compat'
import { usePostsStore } from '../../stores/posts'
import type { PostInput, PostStatus } from '~/types'

useAdminPage('新建文章')

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
    await navigateTo('/posts')
  } catch (err) {
    alert(errMsg(err, '保存失败'))
  } finally {
    saving.value = false
  }
}
</script>
