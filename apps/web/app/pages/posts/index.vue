<template>
  <div class="posts-page">
    <!-- ===== Header ===== -->
    <header class="site-header" :class="{ 'site-header--scrolled': isScrolled }">
      <div class="site-header__inner">
        <NuxtLink to="/" class="brand">
          <span class="brand__mark" aria-hidden="true" />
          <span class="brand__name">Forever</span>
        </NuxtLink>
        <nav class="site-nav">
          <NuxtLink to="/" class="site-nav__link">首页</NuxtLink>
          <a class="site-nav__link" href="/rss.xml" target="_blank">RSS</a>
        </nav>
        <div class="site-header__theme"><ThemeToggle /></div>
      </div>
    </header>

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
          v-for="cat in categoriesStore.list"
          :key="cat.id"
          type="button"
          class="filter-btn"
          :class="{ 'filter-btn--active': activeCategory === cat.slug }"
          @click="setCategory(cat.slug)"
        >{{ cat.name }}</button>
      </nav>

      <!-- 目录式文章列表 -->
      <section class="list">
        <NuxtLink
          v-for="(post, i) in pagedPosts"
          :key="post.id"
          :to="`/posts/${post.id}`"
          class="row reveal"
          :style="{ '--reveal-delay': `${Math.min(i, 8) * 60}ms` }"
        >
          <span class="row__num" aria-hidden="true">{{ String(startIndex + i + 1).padStart(2, '0') }}</span>
          <span class="row__main">
            <h2 class="row__title">{{ post.title }}</h2>
            <p class="row__excerpt">{{ post.excerpt }}</p>
            <span class="row__meta">
              <span class="chip">{{ categoryName(post.categoryId) }}</span>
              <span class="meta-dot">·</span>
              <time>{{ formatDate(post.createdAt) }}</time>
              <span class="meta-dot">·</span>
              <span>{{ post.views.toLocaleString() }} 次阅读</span>
              <span v-if="postTags(post.tagIds).length" class="row__tags">
                <span v-for="tag in postTags(post.tagIds)" :key="tag.id"># {{ tag.name }}</span>
              </span>
            </span>
          </span>
          <span class="row__arrow" aria-hidden="true">→</span>
        </NuxtLink>

        <div v-if="!filteredPosts.length" class="empty">
          <span class="empty__icon">(˘•ω•˘)</span>
          该分类下暂无文章
        </div>
      </section>

      <!-- 分页 -->
      <nav v-if="totalPages > 1" class="pagination" aria-label="文章分页">
        <button
          type="button"
          class="page-btn"
          :disabled="currentPage <= 1"
          @click="changePage(currentPage - 1)"
        >← 上一页</button>
        <button
          v-for="p in totalPages"
          :key="p"
          type="button"
          class="page-btn"
          :class="{ 'page-btn--active': p === currentPage }"
          @click="changePage(p)"
        >{{ p }}</button>
        <button
          type="button"
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @click="changePage(currentPage + 1)"
        >下一页 →</button>
      </nav>
    </main>

    <footer class="site-footer">
      <span>© {{ new Date().getFullYear() }} Forever · 记录技术与思考</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()
const categoriesStore = useCategoriesStore()
const tagsStore = useTagsStore()

/** 当前选中的分类 slug（与 URL query 双向同步） */
const activeCategory = computed(() =>
  typeof route.query.category === 'string' ? route.query.category : '',
)

/** 已发布文章，按发布时间倒序 */
const publishedPosts = computed(() =>
  postsStore.list
    .filter(p => p.status === 'published')
    .sort((a, b) => b.createdAt - a.createdAt),
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
  return categoriesStore.list.find(c => c.slug === slug)
}

function categoryName(categoryId: string | null): string {
  return categoriesStore.list.find(c => c.id === categoryId)?.name ?? '未分类'
}

function postTags(tagIds: string[]) {
  return tagsStore.list.filter(t => tagIds.includes(t.id))
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
  document.querySelector('.filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ===== 滚动渐显 =====

let revealObserver: IntersectionObserver | null = null

function observeReveals() {
  if (!revealObserver || !import.meta.client) return
  document.querySelectorAll<HTMLElement>('.reveal:not(.reveal--visible)').forEach((el) => {
    revealObserver!.observe(el)
  })
}

watch(pagedPosts, () => nextTick(observeReveals))

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

// ===== Header 滚动态 =====

const isScrolled = ref(false)

onMounted(() => {
  const onScroll = () => { isScrolled.value = window.scrollY > 24 }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
})

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

useHead({ title: '全部文章 - Forever' })
</script>

<style scoped>
.posts-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--c-bg-soft);
}

/* ===== Header ===== */
.site-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  border-bottom: 1px solid transparent;
  transition: background-color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}

.site-header--scrolled {
  background: color-mix(in srgb, var(--c-bg-soft) 78%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom-color: var(--c-border);
  box-shadow: 0 4px 20px rgb(0 0 0 / 5%);
}

.site-header__inner {
  display: flex;
  align-items: center;
  gap: 28px;
  max-width: 800px;
  margin: 0 auto;
  padding: 14px 20px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.brand__mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border-radius: 12px;
  box-shadow: 0 4px 12px rgb(244 114 182 / 35%);
}

.brand__mark::before {
  content: '';
  position: absolute;
  top: 38%;
  left: 28%;
  width: 3.5px;
  height: 5px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 11px 0 0 #fff;
}

.brand__mark::after {
  content: '';
  position: absolute;
  bottom: 22%;
  left: 50%;
  width: 10px;
  height: 6px;
  border: 2px solid #fff;
  border-top: none;
  border-left-color: transparent;
  border-right-color: transparent;
  border-radius: 0 0 12px 12px;
  transform: translateX(-50%);
}

.brand__name {
  font-size: 17px;
  font-weight: 700;
  color: var(--c-text);
}

.site-nav {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.site-nav__link {
  padding: 7px 14px;
  font-size: 14px;
  color: var(--c-text-secondary);
  text-decoration: none;
  border-radius: 999px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.site-nav__link:hover {
  color: var(--c-primary);
  background: var(--c-primary-light);
}

@media (max-width: 560px) {
  .site-nav {
    display: none;
  }
}

.wrap {
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
.pagination {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  padding: 0 20px 48px;
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

/* ===== Footer ===== */
.site-footer {
  display: flex;
  justify-content: center;
  padding: 24px 20px 32px;
  font-size: 12.5px;
  color: var(--c-text-muted);
  border-top: 1px solid var(--c-border);
  background: var(--c-bg-card);
}
</style>
