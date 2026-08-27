<template>
  <div class="posts-page">

    <main class="posts-main">
      <!-- 页头 -->
      <header class="posts-head">
        <h1 class="posts-head__title">文章</h1>
        <p class="posts-head__sub">Articles · 全部笔墨，按时间倒序</p>
      </header>

      <!-- 筛选：分类 / 标签，状态写入 URL，可直接分享 -->
      <div class="filters">
        <div class="filters__row">
          <span class="filters__label">分类</span>
          <button
            type="button"
            class="filter-chip"
            :class="{ 'is-active': !categoryId }"
            @click="setFilter({ categoryId: undefined })"
          >
            全部
          </button>
          <button
            v-for="c in categories"
            :key="c.id"
            type="button"
            class="filter-chip"
            :class="{ 'is-active': categoryId === c.id }"
            @click="setFilter({ categoryId: c.id })"
          >
            {{ c.name }}<small v-if="c.articleCount > 0">{{ c.articleCount }}</small>
          </button>
        </div>
        <div class="filters__row">
          <span class="filters__label">标签</span>
          <button
            v-for="t in tags"
            :key="t.id"
            type="button"
            class="filter-chip filter-chip--tag"
            :class="{ 'is-active': tagId === t.id }"
            @click="setFilter({ tagId: t.id })"
          >
            {{ t.name }}<small v-if="t.articleCount > 0">{{ t.articleCount }}</small>
          </button>
        </div>
      </div>

      <!-- 结果统计 -->
      <p v-if="data" class="posts-meta">
        <template v-if="categoryId || tagId">筛选出 {{ data.total }} 篇文章</template>
        <template v-else>共 {{ data.total }} 篇文章</template>
      </p>

      <!-- 时间线列表 -->
      <template v-if="list.length">
        <ul
          class="posts-list"
          :class="{ 'is-loading': pending }"
        >
          <li v-for="post in list" :key="post.id">
            <NuxtLink :to="`/posts/${post.slug}`" class="post-item">
              <span class="post-item__dot" aria-hidden="true" />
              <time
                class="post-item__date"
                :datetime="(post.publishedAt ?? post.createdAt).slice(0, 10)"
              >{{ formatDate(post.publishedAt ?? post.createdAt) }}</time>
              <h3 class="post-item__title">{{ post.title }}</h3>
              <p class="post-item__summary">{{ post.summary }}</p>
              <span class="post-item__foot">
                <span v-if="post.categoryName" class="post-item__cat">{{ post.categoryName }}</span>
                <span v-for="tag in post.tags" :key="tag.id" class="post-item__tag"># {{ tag.name }}</span>
                <span class="post-item__views">{{ post.viewCount.toLocaleString() }} 次阅读</span>
              </span>
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
        <template v-else-if="categoryId || tagId">这个筛选条件下暂时没有文章。</template>
        <template v-else>还没有公开的文章，先去别处逛逛吧 🍃</template>
      </p>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import type { Category, PageResult, Post, Tag } from '#shared/types'

usePageSeo({
  title: '文章 - 补陋阁',
  description: '补陋阁 的全部文章列表 —— 按时间倒序，支持按分类与标签筛选。',
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
const tagId = computed(() => toId(route.query.tagId))
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

/** SSR 也执行：首屏直出第一页；筛选变化时按 key 重新拉取 */
const { data, pending } = await useAsyncData(
  () => `posts-list-${categoryId.value ?? 'all'}-${tagId.value ?? 'all'}-${page.value}`,
  () =>
    apiFetch<PageResult<Post>>('/api/v1/articles', {
      query: cleanQuery({
        page: page.value,
        size: SIZE,
        categoryId: categoryId.value,
        tagId: tagId.value,
      }),
    }),
  { watch: [categoryId, tagId, page] },
)

// 筛选选项：与首页共用同一份公开分类 / 标签数据
const { data: categories } = await useAsyncData('home-categories', () =>
  apiFetch<Category[]>('/api/v1/categories'),
)
const { data: tags } = await useAsyncData('public-tags', () =>
  apiFetch<Tag[]>('/api/v1/tags'),
)

const list = computed(() => data.value?.list ?? [])
const totalPages = computed(() => (data.value ? Math.max(1, Math.ceil(data.value.total / data.value.size)) : 1))

/** 切换筛选：保留另一个维度，重置页码；再点已激活项取消 */
function setFilter(patch: { categoryId?: number, tagId?: number }) {
  const q: Record<string, string> = {}
  const c = patch.categoryId === categoryId.value ? undefined : (patch.categoryId ?? categoryId.value)
  const t = patch.tagId === tagId.value ? undefined : (patch.tagId ?? tagId.value)
  if (c) q.categoryId = String(c)
  if (t) q.tagId = String(t)
  router.replace({ query: q })
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
  max-width: 780px;
  margin: 0 auto;
  padding: 96px 20px 56px;
}

/* ===== 页头 ===== */
.posts-head {
  margin-bottom: 24px;
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
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}

.filters__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.filters__label {
  flex-shrink: 0;
  width: 44px;
  font-size: 13px;
  color: var(--c-text-muted);
}

.filter-chip {
  padding: 5px 12px;
  font-size: 13px;
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

.filter-chip--tag.is-active {
  background: var(--c-text);
  border-color: var(--c-text);
}

/* ===== 结果统计 ===== */
.posts-meta {
  margin: 0 0 18px;
  font-size: 13px;
  color: var(--c-text-muted);
}

/* ===== 时间线列表 ===== */
.posts-list {
  position: relative;
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0 0 0 34px;
  list-style: none;
  transition: opacity var(--dur-soft) ease;

  &.is-loading {
    opacity: 0.45;
    pointer-events: none;
  }
}

/* 左侧虚线主轴 */
.posts-list::before {
  content: '';
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 11px;
  width: 0;
  border-left: 2px dashed var(--c-border);
}

.post-item {
  position: relative;
  display: grid;
  grid-template-columns: 84px 1fr;
  grid-template-rows: auto auto auto;
  gap: 0 14px;
  padding: 16px 18px;
  background: var(--c-bg-card);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius-card);
  text-decoration: none;
  box-shadow: var(--shadow-card);
  transition:
    transform var(--dur-soft) var(--ease-bounce),
    box-shadow var(--dur-soft) ease,
    border-color var(--dur-soft) ease;
}

@media (hover: hover) and (pointer: fine) {
  .post-item:hover {
    border-color: color-mix(in srgb, var(--c-primary) 35%, var(--c-border));
    box-shadow: var(--shadow-card-hover);
    transform: translateY(-2px);
  }

  .post-item:hover .post-item__title {
    color: var(--c-primary-hover);
  }
}

/* 节点：压在主轴顶端，对齐标题 */
.post-item__dot {
  position: absolute;
  top: 19px;
  left: -29px; /* 34px 缩进 - 6px 半径 - 17px 主轴偏移… 与归档页同款几何 */
  width: 12px;
  height: 12px;
  background: var(--c-bg-card);
  border: 3px solid var(--c-primary);
  border-radius: 50%;
}

.post-item__date {
  grid-column: 1;
  grid-row: 1;
  align-self: start;
  font-size: 12.5px;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.post-item__title {
  grid-column: 2;
  grid-row: 1;
  margin: 0;
  font-size: 16.5px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--c-text);
  transition: color var(--dur-soft) ease;
}

.post-item__summary {
  grid-column: 2;
  grid-row: 2;
  margin: 6px 0 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--c-text-secondary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.post-item__foot {
  grid-column: 2;
  grid-row: 3;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.post-item__cat {
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-primary-hover);
  background: var(--c-primary-light);
  border-radius: 999px;
}

.post-item__tag {
  font-size: 12.5px;
  color: var(--c-text-muted);
}

.post-item__views {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--c-text-muted);
}

/* ===== 翻页 ===== */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 24px 0 40px;
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

  .filters__label {
    width: 36px;
  }

  .posts-list {
    gap: 10px;
    padding-left: 26px;
  }

  .posts-list::before {
    top: 14px;
    bottom: 14px;
  }

  .post-item {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 13px 14px;
  }

  /* 缩进变了，节点跟着挪 */
  .post-item__dot {
    top: 16px;
    left: -23px;
  }

  /* 单列堆叠：日期 → 标题 → 摘要 → 元信息 */
  .post-item__date,
  .post-item__title,
  .post-item__summary,
  .post-item__foot {
    grid-column: 1;
  }

  .post-item__date { grid-row: 1; }
  .post-item__title { grid-row: 2; }
  .post-item__summary { grid-row: 3; }
  .post-item__foot { grid-row: 4; }

  .post-item__views {
    margin-left: 0;
  }
}
</style>
