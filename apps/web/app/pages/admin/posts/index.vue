<template>
  <div class="posts-page">
    <div v-if="sortedPosts.length" class="card posts-table fade-up">
      <!-- 表头 -->
      <div class="posts-table__head posts-table__row">
        <span>标题</span>
        <span>分类</span>
        <span>标签</span>
        <span>状态</span>
        <span class="num">浏览量</span>
        <span>更新时间</span>
        <span class="ops">操作</span>
      </div>

      <!-- 数据行 -->
      <div
        v-for="(post, i) in sortedPosts"
        :key="post.id"
        class="posts-table__row posts-table__body-row"
        :style="{ '--stagger-index': i }"
      >
        <span class="cell-title">
          <strong>{{ post.title }}</strong>
          <small>{{ post.summary || '（暂无摘要）' }}</small>
        </span>
        <span>{{ post.categoryName || '未分类' }}</span>
        <span class="cell-tags">
          <template v-if="post.tags.length">
            <span
              v-for="tag in post.tags.slice(0, 3)"
              :key="tag.id"
              class="tag-chip"
            >{{ tag.name }}</span>
            <span v-if="post.tags.length > 3" class="tag-chip tag-chip--more">
              +{{ post.tags.length - 3 }}
            </span>
          </template>
          <template v-else>—</template>
        </span>
        <span>
          <span class="badge" :class="`badge--${statusClass(post.status)}`">
            {{ statusLabel(post.status) }}
          </span>
        </span>
        <span class="num">{{ post.viewCount.toLocaleString() }}</span>
        <span>{{ formatShortDate(post.updatedAt) }}</span>
        <span class="ops">
          <NuxtLink :to="`/admin/posts/${post.id}/edit`" class="btn btn--ghost">编辑</NuxtLink>
          <button type="button" class="btn btn--ghost" @click="toggle(post)">
            {{ post.status === 'PUBLISHED' ? '下线' : '发布' }}
          </button>
          <button type="button" class="btn btn--ghost op-danger" @click="askRemove(post)">删除</button>
        </span>
      </div>
    </div>

    <div v-else class="card posts-empty fade-up">
      <p>还没有文章，去写第一篇吧 ✍️</p>
      <NuxtLink to="/admin/posts/new" class="btn btn--primary">新建文章</NuxtLink>
    </div>

    <AdminConfirmDialog
      :open="!!pendingDelete"
      title="删除文章"
      :message="pendingDelete ? `确定删除「${pendingDelete.title}」吗？此操作不可恢复。` : ''"
      confirm-text="删除"
      @confirm="confirmRemove"
      @cancel="pendingDelete = null"
    />
  </div>
</template>

<script setup lang="ts">
import type { Post } from '#shared/types'

definePageMeta({ layout: 'admin', permission: 'article:list' })

useHead({ title: '文章管理 - 补陋阁 后台' })
useState('admin-page-title', () => '文章管理')

const postsStore = usePostsStore()
const categoriesStore = useCategoriesStore()

// 进入页面时拉取文章（取足够大的一页）与分类数据
// 登录令牌存在 localStorage，SSR 阶段拿不到，必须仅在客户端拉取，
// 否则直接访问 URL 时服务端请求 401 导致 SSR 失败
await useAsyncData('admin-posts-page', async () => {
  await Promise.all([
    postsStore.fetchAdmin({ page: 1, size: 1000 }),
    categoriesStore.fetch(),
  ])
}, { server: false })

const sortedPosts = computed(() =>
  [...postsStore.list].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
)

async function toggle(post: Post) {
  try {
    await postsStore.toggleStatus(post)
  } catch (err) {
    alert(err instanceof Error ? err.message : '操作失败')
  }
}

const pendingDelete = ref<Post | null>(null)

function askRemove(post: Post) {
  pendingDelete.value = post
}

async function confirmRemove() {
  if (pendingDelete.value) {
    try {
      await postsStore.remove(pendingDelete.value.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }
  pendingDelete.value = null
}
</script>

<style scoped>
.posts-table {
  overflow-x: auto;
}

.posts-table__row {
  display: grid;
  grid-template-columns: minmax(220px, 2.4fr) 90px minmax(130px, 1.2fr) 76px 76px 96px minmax(210px, auto);
  gap: 12px;
  align-items: center;
  padding: 12px 20px;
  font-size: 13px;
}

.posts-table__head {
  color: var(--c-text-muted);
  border-bottom: 1px solid var(--c-border);

  .ops {
    text-align: right;
  }
}

.posts-table__body-row {
  animation: fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 60ms);
  transition: background-color 0.15s;

  & + & {
    border-top: 1px solid var(--c-border);
  }

  &:hover {
    background: var(--c-bg-soft);
  }

  .ops {
    justify-content: flex-end;
  }
}

.cell-title {
  min-width: 0;

  strong {
    display: block;
    overflow: hidden;
    color: var(--c-text);
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: block;
    margin-top: 2px;
    overflow: hidden;
    color: var(--c-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.cell-tags .tag-chip {
  display: inline-block;
  margin-right: 4px;
  padding: 1px 8px;
  font-size: 11px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: 999px;

  &.tag-chip--more {
    color: var(--c-text-muted);
    background: var(--c-bg-soft);
  }
}

.num {
  font-variant-numeric: tabular-nums;
}

.ops {
  display: flex;
  gap: 2px;

  .btn {
    padding: 5px 10px;
    font-size: 13px;
  }
}

.op-danger {
  color: var(--c-danger);

  &:hover:not(:disabled) {
    background: rgb(239 68 68 / 10%);
  }
}

.posts-empty {
  padding: 64px 24px;
  text-align: center;

  p {
    color: var(--c-text-muted);
  }

  .btn {
    margin-top: 8px;
  }
}

@media (max-width: 1100px) {
  .posts-table__row {
    grid-template-columns: minmax(180px, 2fr) minmax(120px, 1fr) 70px minmax(170px, auto);
  }

  /* 窄屏隐藏：分类、标签、浏览量、更新时间列 */
  .posts-table__head span:nth-child(2),
  .posts-table__body-row span:nth-child(2),
  .posts-table__head span:nth-child(3),
  .posts-table__body-row span:nth-child(3),
  .posts-table__head span:nth-child(5),
  .posts-table__body-row span:nth-child(5),
  .posts-table__head span:nth-child(6),
  .posts-table__body-row span:nth-child(6) {
    display: none;
  }
}
</style>
