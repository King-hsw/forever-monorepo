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
              <span class="entry__top">
                <span v-if="post.categoryName" class="entry__cat">{{ post.categoryName }}</span>
                <span class="entry__date">
                  <time :datetime="(post.publishedAt ?? post.createdAt).slice(0, 10)">{{ formatDate(post.publishedAt ?? post.createdAt) }}</time>
                  <span class="entry__views">{{ post.viewCount.toLocaleString() }} 次阅读</span>
                </span>
              </span>
              <h2 class="entry__title">{{ post.title }}</h2>
              <p class="entry__summary">{{ post.summary }}</p>
              <p v-if="post.tags.length" class="entry__tags">
                <span v-for="t in post.tags.slice(0, 3)" :key="t.id">#{{ t.name }}</span>
                <span v-if="post.tags.length > 3" class="entry__tags-more">+{{ post.tags.length - 3 }}</span>
              </p>
            </NuxtLink>
          </li>
        </ul>

        <!-- 翻页：数字页码，页码多时收窗带省略号 -->
        <nav v-if="totalPages > 1" class="pager" aria-label="文章分页">
          <button type="button" class="pager__nav" :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
          <template v-for="(p, i) in pages" :key="i">
            <span v-if="p === '…'" class="pager__dots" aria-hidden="true">…</span>
            <button
              v-else
              type="button"
              class="pager__num"
              :class="{ 'is-active': p === page }"
              :aria-current="p === page ? 'page' : undefined"
              @click="goPage(p)"
            >{{ p }}</button>
          </template>
          <button type="button" class="pager__nav" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
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

/** 页码窗口：≤7 页全显，否则首尾 + 当前 ±1，中间折叠为省略号 */
const pages = computed<(number | '…')[]>(() => {
  const cur = page.value
  const total = totalPages.value
  const out: (number | '…')[] = []
  for (let i = 1; i <= total; i++) {
    if (total <= 7 || i === 1 || i === total || Math.abs(i - cur) <= 1) out.push(i)
    else if (out[out.length - 1] !== '…') out.push('…')
  }
  return out
})

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

.entry__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.entry__cat {
  padding: 1px 9px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-primary-hover);
  background: var(--c-primary-light);
  border-radius: 999px;
}

.entry__date {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: 12.5px;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
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

/* 标签独行：与分类徽章错开，不再混在同一行 */
.entry__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--c-primary-hover);

  &-more {
    color: var(--c-text-muted);
  }
}

/* ===== 翻页：上页 / 数字页码 / 下页 ===== */
.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 32px 0 40px;
}

.pager__nav {
  min-width: 56px;
  padding: 7px 10px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    color: var(--c-primary-hover);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.pager__num {
  display: inline-grid;
  place-items: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
  color: var(--c-text-secondary);
  background: none;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;

  &:hover {
    color: var(--c-primary-hover);
  }

  &.is-active {
    color: var(--c-on-primary);
    background: var(--c-primary);
  }
}

.pager__dots {
  padding: 0 4px;
  font-size: 13px;
  color: var(--c-text-muted);
  user-select: none;
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
