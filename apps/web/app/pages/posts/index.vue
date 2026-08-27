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

      <!-- 封面卡片网格 -->
      <template v-if="list.length">
        <div
          class="posts-grid"
          :class="{ 'is-loading': pending }"
        >
          <NuxtLink
            v-for="post in list"
            :key="post.id"
            :to="`/posts/${post.slug}`"
            class="card"
          >
            <span class="card__cover">
              <img
                v-if="post.coverImage"
                :src="post.coverImage"
                :alt="post.title"
                width="1600"
                height="900"
                loading="lazy"
              >
              <span v-else class="card__ph" aria-hidden="true">文</span>
            </span>
            <span class="card__body">
              <h2 class="card__title">{{ post.title }}</h2>
              <p class="card__summary">{{ post.summary }}</p>
              <span class="card__foot">
                <span v-if="post.categoryName" class="card__cat">{{ post.categoryName }}</span>
                <time :datetime="(post.publishedAt ?? post.createdAt).slice(0, 10)">{{ formatDate(post.publishedAt ?? post.createdAt) }}</time>
                <span class="card__views">{{ post.viewCount.toLocaleString() }} 次阅读</span>
              </span>
            </span>
          </NuxtLink>
        </div>

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
  max-width: 1080px;
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

/* ===== 卡片网格 ===== */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  transition: opacity var(--dur-soft) ease;

  &.is-loading {
    opacity: 0.45;
    pointer-events: none;
  }
}

.card {
  display: flex;
  flex-direction: column;
  background: var(--c-bg-card);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius-card);
  overflow: hidden;
  text-decoration: none;
  box-shadow: var(--shadow-card);
  transition:
    transform var(--dur-soft) var(--ease-bounce),
    box-shadow var(--dur-soft) ease,
    border-color var(--dur-soft) ease;
}

@media (hover: hover) and (pointer: fine) {
  .card:hover {
    border-color: color-mix(in srgb, var(--c-primary) 35%, var(--c-border));
    box-shadow: var(--shadow-card-hover);
    transform: translateY(-3px);

    .card__title {
      color: var(--c-primary-hover);
    }

    .card__cover img {
      transform: scale(1.04);
    }
  }
}

.card__cover {
  display: block;
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  background: var(--c-bg-soft);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.45s var(--ease-bounce);
  }
}

/* 无封面兜底：玉纸渐变 + 一枚衬线「文」 */
.card__ph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: var(--font-serif);
  font-size: 44px;
  color: color-mix(in srgb, var(--c-primary) 22%, transparent);
  background: linear-gradient(135deg, var(--c-bg-soft), var(--c-primary-light));
}

.card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px 14px;
}

.card__title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--c-text);
  transition: color var(--dur-soft) ease;
}

.card__summary {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--c-text-secondary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 4px;
  font-size: 12.5px;
  color: var(--c-text-muted);
}

.card__cat {
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-primary-hover);
  background: var(--c-primary-light);
  border-radius: 999px;
}

.card__views {
  margin-left: auto;
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
@media (max-width: 900px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .posts-main {
    padding-top: 88px;
  }

  .posts-head__title {
    font-size: 24px;
  }
}
</style>
