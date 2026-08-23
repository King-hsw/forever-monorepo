<template>
  <div class="posts-page">
    <!-- ===== Header：全站统一导航 ===== -->
    <SiteHeader width="800px" />

    <main class="wrap">
      <!-- 页面标题 -->
      <div class="page-head">
        <h1 class="page-head__cn">全部文章</h1>
        <span class="page-head__en">All Posts · {{ total }} 篇</span>
      </div>

      <!-- 分类筛选 -->
      <nav class="filters" aria-label="分类筛选">
        <button
          type="button"
          class="filter-btn"
          :class="{ 'filter-btn--active': !activeCategory }"
          @click="setCategory('')"
        >全部</button>
        <button
          v-for="cat in categories ?? []"
          :key="cat.id"
          type="button"
          class="filter-btn"
          :class="{ 'filter-btn--active': activeCategory === cat.slug }"
          @click="setCategory(cat.slug)"
        >{{ cat.name }}</button>
      </nav>

      <!-- 目录式文章列表：翻页/切分类时整组淡入淡出，避免生硬跳变 -->
      <section class="list">
        <Transition name="page-swap" mode="out-in" @after-enter="observeReveals">
          <div v-if="filteredPosts.length" :key="`${activeCategory}-${currentPage}`" class="list__page">
            <NuxtLink
              v-for="(post, i) in pagedPosts"
              :key="post.id"
              :to="`/posts/${post.slug}`"
              class="row reveal"
              :style="{ '--reveal-delay': `${Math.min(i, 8) * 60}ms` }"
            >
          <span class="row__num" aria-hidden="true">{{ String(startIndex + i + 1).padStart(2, '0') }}</span>
          <span class="row__main">
            <h2 class="row__title">{{ post.title }}</h2>
            <p class="row__excerpt">{{ post.summary }}</p>
            <span class="row__meta">
              <span class="chip">{{ categoryName(post.categoryId) }}</span>
              <span class="meta-dot">·</span>
              <time>{{ formatDate(post.createdAt) }}</time>
              <span class="meta-dot">·</span>
              <span>{{ post.viewCount.toLocaleString() }} 次阅读</span>
              <span v-if="post.tags.length" class="row__tags">
                <span v-for="tag in post.tags" :key="tag.id"># {{ tag.name }}</span>
              </span>
            </span>
          </span>
          <span class="row__arrow" aria-hidden="true">→</span>
        </NuxtLink>
          </div>
          <div v-else key="empty" class="empty">
            <span class="empty__icon">(˘•ω•˘)</span>
            该分类下暂无文章
          </div>
        </Transition>
      </section>
    </main>

    <SiteFooter />

    <!-- 悬浮翻页器：固定在视口底部，滚到哪儿都能直接翻页 -->
    <Transition name="pager-pop">
      <nav v-if="totalPages > 1" class="floating-pager" aria-label="文章分页">
        <button
          type="button"
          class="page-btn page-btn--icon"
          :disabled="currentPage <= 1"
          aria-label="上一页"
          @click="changePage(currentPage - 1)"
        >←</button>
        <template v-for="(p, i) in pageItems" :key="`${p}-${i}`">
          <span v-if="p === '…'" class="floating-pager__ellipsis">…</span>
          <button
            v-else
            type="button"
            class="page-btn page-btn--num"
            :class="{ 'page-btn--active': p === currentPage }"
            :aria-current="p === currentPage ? 'page' : undefined"
            @click="changePage(p)"
          >{{ p }}</button>
        </template>
        <button
          type="button"
          class="page-btn page-btn--icon"
          :disabled="currentPage >= totalPages"
          aria-label="下一页"
          @click="changePage(currentPage + 1)"
        >→</button>
      </nav>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { Category, PageResult, Post, Tag } from '~/stores/types'

const route = useRoute()
const router = useRouter()

// 从 forever-server 拉取公开数据（已发布文章 / 分类 / 标签）
const { data: pageData } = await useAsyncData('posts-articles', () =>
  apiFetch<PageResult<Post>>('/api/v1/articles', { query: { page: 1, size: 1000 } }),
)
const { data: categories } = await useAsyncData('home-categories', () =>
  apiFetch<Category[]>('/api/v1/categories'),
)
const { data: tags } = await useAsyncData('home-tags', () =>
  apiFetch<Tag[]>('/api/v1/tags'),
)

/** 当前选中的分类 slug（与 URL query 双向同步） */
const activeCategory = computed(() =>
  typeof route.query.category === 'string' ? route.query.category : '',
)

/** 已发布文章，按发布时间倒序 */
const sortKey = (p: Post) => p.publishedAt ?? p.createdAt
const publishedPosts = computed(() =>
  [...(pageData.value?.list ?? [])].sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1)),
)

/** 按分类过滤后的列表 */
const filteredPosts = computed(() =>
  activeCategory.value
    ? publishedPosts.value.filter(p => categoryBySlug(activeCategory.value)?.id === p.categoryId)
    : publishedPosts.value,
)

const total = computed(() => filteredPosts.value.length)

/** 每页展示的文章数 */
const PAGE_SIZE = 10

/** 当前页码（与 URL ?page= 同步，非法值回落到第 1 页） */
const currentPage = computed(() => {
  const n = Number.parseInt(String(route.query.page ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
})

/** 总页数 */
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

/** 当前页起始序号（用于全局连续编号） */
const startIndex = computed(() => (currentPage.value - 1) * PAGE_SIZE)

/** 当前页应展示的文章切片 */
const pagedPosts = computed(() =>
  filteredPosts.value.slice(startIndex.value, startIndex.value + PAGE_SIZE),
)

/** 切换分类后数据变少时，页码可能越界，收敛到最后一页 */
watch(totalPages, () => {
  if (currentPage.value > totalPages.value) {
    setPage(totalPages.value)
  }
})

function categoryBySlug(slug: string) {
  return categories.value?.find(c => c.slug === slug)
}

function categoryName(categoryId: number | null): string {
  return categories.value?.find(c => c.id === categoryId)?.name ?? '未分类'
}

function postTagsOf(post: Post) {
  return post.tags
}

function setCategory(slug: string) {
  router.replace(slug ? { query: { category: slug } } : { query: {} })
}

function setPage(page: number) {
  const clamped = Math.min(Math.max(1, page), totalPages.value)
  const query: Record<string, string> = {}
  if (activeCategory.value) {
    query.category = activeCategory.value
  }
  if (clamped > 1) {
    query.page = String(clamped)
  }
  router.replace({ query })
}

function changePage(page: number) {
  if (page === currentPage.value) return
  setPage(page)
  // 悬浮翻页器始终可见，翻页后无需强制滚动打断阅读位置
}

/** 页码列表：页数少时全部展示，多时首尾 + 当前页附近，中间用 … 省略 */
const pageItems = computed<(number | '…')[]>(() => {
  const last = totalPages.value
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1)
  }
  const near = new Set([1, 2, last - 1, last, currentPage.value - 1, currentPage.value, currentPage.value + 1])
  const picked = [...near].filter(p => p >= 1 && p <= last).sort((a, b) => a - b)
  const items: (number | '…')[] = []
  let prev = 0
  for (const p of picked) {
    if (p - prev > 1) items.push('…')
    items.push(p)
    prev = p
  }
  return items
})

// ===== 滚动渐显 =====

let revealObserver: IntersectionObserver | null = null

function observeReveals() {
  if (!revealObserver || !import.meta.client) return
  document.querySelectorAll<HTMLElement>('.reveal:not(.reveal--visible)').forEach((el) => {
    revealObserver!.observe(el)
  })
}

// 翻页/切分类后的新行由 Transition 的 @after-enter 钩子触发观察：
// out-in 模式下新节点要等旧列表淡出后才插入，watch + nextTick 会跑得太早，
// 导致新行永远停在 opacity: 0（表现为「翻页后内容没加载出来」）

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduced) {
    revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible')
          revealObserver?.unobserve(entry.target)
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
    observeReveals()
  }
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
})

function formatDate(value: string | number): string {
  const ts = value
  return new Date(ts).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

usePageSeo({
  title: '全部文章 - Forever',
  description: '浏览 Forever 的全部技术文章与思考记录，可按分类、标签筛选。',
  path: '/posts',
})
</script>

<style scoped>
.posts-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--c-bg-soft);
}

/* ===== Header ===== */
.wrap {
  flex: 1;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding-top: 96px;
}

/* ===== 页面标题 ===== */
.page-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 0 20px;
}

.page-head__cn {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--c-text);
}

.page-head__en {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

/* ===== 分类筛选 ===== */
.filters {
  position: sticky;
  top: 62px;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 22px 0 0;
  padding: 12px 20px;
  background: color-mix(in srgb, var(--c-bg-soft) 85%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.filter-btn {
  padding: 6px 16px;
  font-size: 13.5px;
  color: var(--c-text-secondary);
  background: var(--c-bg-card);
  border: 1.5px solid var(--c-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--c-primary);
    border-color: color-mix(in srgb, var(--c-primary) 45%, transparent);
    transform: translateY(-1px);
  }

  &--active {
    color: var(--c-on-primary);
    background: var(--c-primary);
    border-color: var(--c-primary);

    &:hover {
      color: var(--c-on-primary);
    }
  }
}

/* ===== 目录式列表 ===== */
.list {
  display: grid;
  margin-top: 6px;
  padding: 0 20px 30px;
}

.reveal {
  opacity: 0;
  transform: translateY(26px);
  transition:
    opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
    background-color 0.25s ease;
}

.reveal--visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
  }
}

.row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 22px;
  padding: 24px 10px;
  border-bottom: 1px solid var(--c-border);
  text-decoration: none;
  transition: background-color 0.25s ease, padding-left 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    background: color-mix(in srgb, var(--c-primary-light) 60%, transparent);
    padding-left: 20px;

    .row__num {
      -webkit-text-stroke-color: var(--c-primary);
      transform: scale(1.06);
    }

    .row__title {
      color: var(--c-primary);
    }

    .row__arrow {
      opacity: 1;
      transform: translateX(0);
    }
  }
}

.row__num {
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1.3px #e8d0e2;
  font-variant-numeric: tabular-nums;
  transition: -webkit-text-stroke-color 0.25s ease, transform 0.25s var(--ease-bounce);
}

html.dark .row__num {
  -webkit-text-stroke-color: #5a4a66;
}

@supports not (-webkit-text-stroke: 1px black) {
  .row__num {
    color: #e8d0e2;
  }

  html.dark .row__num {
    color: #5a4a66;
  }
}

.row__main {
  min-width: 0;
}

.row__title {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--c-text);
  transition: color 0.2s ease;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row__excerpt {
  margin: 6px 0 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--c-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.row__tags {
  display: inline-flex;
  gap: 8px;
}

.chip {
  padding: 2px 10px;
  font-size: 12px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: 999px;
}

.meta-dot {
  color: var(--c-text-muted);
  opacity: 0.6;
}

.row__arrow {
  font-size: 18px;
  color: var(--c-primary);
  opacity: 0;
  transform: translateX(-8px);
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.empty {
  padding: 64px 20px;
  text-align: center;
  font-size: 14.5px;
  color: var(--c-text-muted);
}

.empty__icon {
  display: block;
  margin-bottom: 10px;
  letter-spacing: 0.05em;
  opacity: 0.7;
}

/* ===== 分页 ===== */
.list__page {
  display: block;
}

/* 翻页 / 切分类时列表整组淡入淡出 */
.page-swap-enter-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.page-swap-leave-active {
  transition: opacity 0.16s ease;
}

.page-swap-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.page-swap-leave-to {
  opacity: 0;
}

/* 悬浮翻页器：固定视口底部居中，毛玻璃胶囊 */
.floating-pager {
  position: fixed;
  right: 0;
  bottom: 22px;
  left: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  margin-inline: auto;
  padding: 5px;
  background: color-mix(in srgb, var(--c-bg-card) 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--c-border);
  border-radius: 999px;
  box-shadow: 0 8px 28px rgb(0 0 0 / 14%);
}

.floating-pager__ellipsis {
  padding: 0 2px;
  font-size: 13px;
  color: var(--c-text-muted);
  user-select: none;
}

.page-btn--num {
  min-width: 34px;
  padding: 6px 8px;
}

.page-btn--icon {
  min-width: 34px;
  padding: 7px 10px;
}

.pager-pop-enter-active {
  transition: opacity 0.3s ease, transform 0.3s var(--ease-bounce);
}

.pager-pop-leave-active {
  transition: opacity 0.18s ease;
}

.pager-pop-enter-from,
.pager-pop-leave-to {
  opacity: 0;
  transform: translateY(18px);
}

.page-btn {
  min-width: 38px;
  padding: 7px 14px;
  font-size: 13.5px;
  color: var(--c-text-secondary);
  background: var(--c-bg-card);
  border: 1.5px solid var(--c-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: var(--c-primary);
    border-color: color-mix(in srgb, var(--c-primary) 45%, transparent);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--active {
    color: var(--c-on-primary);
    background: var(--c-primary);
    border-color: var(--c-primary);

    &:hover {
      color: var(--c-on-primary);
      transform: none;
    }
  }
}

</style>
