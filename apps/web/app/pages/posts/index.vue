<template>
  <div class="posts-page">

    <main class="posts-main">
      <!-- 页头 -->
      <header class="posts-head">
        <h1 class="posts-head__title">文章</h1>
        <p class="posts-head__sub">Articles · 全部笔墨，按时间倒序</p>
      </header>

      <!-- 筛选：分类，状态写入 URL，可直接分享 -->
      <div class="filters">
        <button
          type="button"
          class="filter-chip"
          :class="{ 'is-active': !categoryId }"
          @click="setFilter(undefined)"
        >
          全部
        </button>
        <button
          v-for="c in categories"
          :key="c.id"
          type="button"
          class="filter-chip"
          :class="{ 'is-active': categoryId === c.id }"
          @click="setFilter(c.id)"
        >
          {{ c.name }}<small v-if="c.articleCount > 0">{{ c.articleCount }}</small>
        </button>
      </div>

      <!-- 结果统计 -->
      <p v-if="data" class="posts-meta">
        <template v-if="categoryId">筛选出 {{ data.total }} 篇文章</template>
        <template v-else>共 {{ data.total }} 篇文章</template>
      </p>

      <!-- 目录式列表 -->
      <template v-if="list.length">
        <ul
          class="posts-list"
          :class="{ 'is-loading': pending }"
        >
          <li v-for="post in list" :key="post.id">
            <NuxtLink :to="`/posts/${post.slug}`" class="entry">
              <span class="entry__meta">
                <time :datetime="(post.publishedAt ?? post.createdAt).slice(0, 10)">{{ formatDate(post.publishedAt ?? post.createdAt) }}</time>
                <span v-if="post.categoryName" class="entry__cat">{{ post.categoryName }}</span>
                <span class="entry__views">{{ post.viewCount.toLocaleString() }} 次阅读</span>
              </span>
              <h2 class="entry__title">{{ post.title }}</h2>
              <p class="entry__summary">{{ post.summary }}</p>
            </NuxtLink>
          </li>
        </ul>

        <!-- 翻页 -->
        <nav v-if="totalPages > 1" class="pager" aria-label="文章分页">
          <button type="button" :disabled="page <= 1" @click="goPage(page - 1)">← 上一页</button>
          <span>{{ page }} / {{ totalPages }} 页</span>
          <button type="button" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页 →</button>
        </nav>
      </template>

      <!-- 空态：区分「页码越界 / 筛选无结果 / 尚未发文」 -->
      <p v-else-if="data" class="posts-empty">
        <template v-if="data.total > 0 && page > 1">翻到页尾了，这一页没有文章。</template>
        <template v-else-if="categoryId">这个分类下暂时没有文章。</template>
        <template v-else>还没有公开的文章，先去别处逛逛吧 🍃</template>
      </p>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import type { Category, PageResult, Post } from '#shared/types'

usePageSeo({
  title: '文章 - 补陋阁',
  description: '补陋阁 的全部文章列表 —— 按时间倒序，支持按分类筛选。',
  path: '/posts',
})

const SIZE = 10

const route = useRoute()
const router = useRouter()

/** URL 查询参数是唯一事实源：直接打开筛选链接也能命中 */
function toId(value: unknown): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

const categoryId = computed(() => toId(route.query.categoryId))
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

/** SSR 也执行：首屏直出第一页；筛选 / 翻页变化时按 key 重新拉取 */
const { data, pending } = await useAsyncData(
  () => `posts-list-${categoryId.value ?? 'all'}-${page.value}`,
  () =>
    apiFetch<PageResult<Post>>('/api/v1/articles', {
      query: cleanQuery({
        page: page.value,
        size: SIZE,
        categoryId: categoryId.value,
      }),
    }),
  { watch: [categoryId, page] },
)

// 与首页共用同一份公开分类数据
const { data: categories } = await useAsyncData('home-categories', () =>
  apiFetch<Category[]>('/api/v1/categories'),
)

const list = computed(() => data.value?.list ?? [])
const totalPages = computed(() => (data.value ? Math.max(1, Math.ceil(data.value.total / data.value.size)) : 1))

/** 切换分类：再点已激活项取消 */
function setFilter(id?: number) {
  router.replace({
    query: { categoryId: id && id !== categoryId.value ? String(id) : undefined },
  })
}

function goPage(p: number) {
  if (p < 1 || p === page.value) return
  router.replace({ query: { ...route.query, page: p > 1 ? String(p) : undefined } })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
/* ===== 页面骨架 ===== */
.posts-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.posts-main {
  flex: 1;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 96px 20px 56px;
}

/* ===== 页头 ===== */
.posts-head {
  margin-bottom: 20px;
}

.posts-head__title {
  margin: 0;
  font-size: 28px;
}

.posts-head__sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--c-text-muted);
}

/* ===== 筛选 ===== */
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-chip {
  padding: 5px 14px;
  font-size: 13.5px;
  color: var(--c-text-secondary);
  background: var(--c-bg-card);
  border: 1.5px solid var(--c-border);
  border-radius: 999px;
  cursor: pointer;
  transition:
    color var(--dur-soft) ease,
    background-color var(--dur-soft) ease,
    border-color var(--dur-soft) ease;

  small {
    margin-left: 4px;
    font-size: 11px;
    color: var(--c-text-muted);
  }
}

.filter-chip:hover {
  color: var(--c-primary-hover);
  border-color: color-mix(in srgb, var(--c-primary) 45%, transparent);
}

.filter-chip.is-active {
  color: var(--c-on-primary);
  background: var(--c-primary);
  border-color: var(--c-primary);

  small {
    color: rgb(255 255 255 / 75%);
  }
}

/* ===== 结果统计 ===== */
.posts-meta {
  margin: 0 0 20px;
  font-size: 13px;
  color: var(--c-text-muted);
}

/* ===== 目录式列表：细分隔线 + 悬停玉色微染 ===== */
.posts-list {
  margin: 0;
  padding: 0;
  list-style: none;
  transition: opacity var(--dur-soft) ease;

  &.is-loading {
    opacity: 0.45;
    pointer-events: none;
  }
}

.entry {
  display: block;
  padding: 18px 10px;
  border-top: 1px solid var(--c-border);
  text-decoration: none;
  transition:
    background-color var(--dur-soft) ease;

  &:first-child {
    border-top-color: transparent;
  }

  &:last-child {
    border-bottom: 1px solid var(--c-border);
  }

  .entry__title {
    transition: color var(--dur-soft) ease;
  }
}

@media (hover: hover) and (pointer: fine) {
  .entry:hover {
    background: color-mix(in srgb, var(--c-primary) 4%, transparent);

    .entry__title {
      color: var(--c-primary-hover);
    }
  }
}

.entry__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
}

.entry__cat {
  color: var(--c-primary-hover);
  font-weight: 600;
}

.entry__title {
  margin: 6px 0 0;
  font-size: 17.5px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--c-text);
}

.entry__summary {
  margin: 4px 0 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--c-text-secondary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* ===== 翻页 ===== */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 28px 0 40px;
  font-size: 13.5px;
  color: var(--c-text-secondary);

  button {
    padding: 7px 16px;
    font-size: 13px;
    color: var(--c-text-secondary);
    background: var(--c-bg-card);
    border: 1.5px solid var(--c-border);
    border-radius: 999px;
    cursor: pointer;
    transition:
      color 0.2s ease,
      border-color 0.2s ease,
      transform 0.2s var(--ease-bounce);

    &:hover:not(:disabled) {
      color: var(--c-primary-hover);
      border-color: color-mix(in srgb, var(--c-primary) 45%, transparent);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

/* ===== 空态 ===== */
.posts-empty {
  padding: 48px 0;
  font-size: 14px;
  color: var(--c-text-muted);
  text-align: center;
}

/* ===== 移动端 ===== */
@media (max-width: 640px) {
  .posts-main {
    padding-top: 88px;
  }

  .posts-head__title {
    font-size: 24px;
  }

  .entry {
    padding: 15px 4px;
  }

  .entry__title {
    font-size: 16.5px;
  }
}
</style>
