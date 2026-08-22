<template>
  <div class="blog-home">
    <header class="hero">
      <h1 class="hero__brand">Forever</h1>
      <p class="hero__tagline">记录技术与思考</p>
    </header>

    <nav class="filters">
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

    <main class="post-list">
      <NuxtLink
        v-for="(post, i) in pagedPosts"
        :key="post.id"
        :to="`/posts/${post.id}`"
        class="post-card"
        :style="{ animationDelay: `${Math.min(i, 8) * 60}ms` }"
      >
        <div class="post-card__main">
          <h2 class="post-card__title">{{ post.title }}</h2>
          <p class="post-card__excerpt">{{ post.excerpt }}</p>
          <div class="post-card__meta">
            <span class="post-card__category">{{ categoryName(post.categoryId) }}</span>
            <span class="meta-dot">·</span>
            <time>{{ formatDate(post.createdAt) }}</time>
            <span class="meta-dot">·</span>
            <span>{{ post.views.toLocaleString() }} 次阅读</span>
            <span v-if="postTags(post.tagIds).length" class="post-card__tags">
              <span v-for="tag in postTags(post.tagIds)" :key="tag.id" class="tag-chip"># {{ tag.name }}</span>
            </span>
          </div>
        </div>
        <span class="post-card__arrow">→</span>
      </NuxtLink>

      <div v-if="!filteredPosts.length" class="empty">
        该分类下暂无文章
      </div>
    </main>

    <!-- 分页：页码与 URL ?page= 双向同步，可直接分享/回退到某一页 -->
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

    <footer class="site-footer">Forever · 用心记录每一篇</footer>
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

/** 每页展示的文章数 */
const PAGE_SIZE = 5

/** 当前页码（与 URL ?page= 同步，非法值回落到第 1 页） */
const currentPage = computed(() => {
  const n = Number.parseInt(String(route.query.page ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
})

/** 总页数（至少 1 页，保证空列表时也有合法页码） */
const totalPages = computed(() => Math.max(1, Math.ceil(filteredPosts.value.length / PAGE_SIZE)))

/** 当前页应展示的文章切片 */
const pagedPosts = computed(() =>
  filteredPosts.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE),
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
  // 详情页的分类 chip 通过 ?category=slug 跳回这里；切换分类视为重新浏览，重置到第 1 页（去掉 page 参数）
  router.replace(slug ? { query: { category: slug } } : { query: {} })
}

/** 跳转到指定页：保留分类参数，页码为 1 时从地址栏移除 */
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

/** 翻页后回到列表顶部，避免停留在长列表底部 */
function changePage(page: number) {
  if (page === currentPage.value) return
  setPage(page)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

useHead({ title: 'Forever - 记录技术与思考' })
</script>

<style scoped>
.blog-home {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f6f6fa;
}

.hero {
  padding: 56px 20px 8px;
  text-align: center;
  animation: fade-up 0.4s ease both;
}

.hero__brand {
  margin: 0;
  font-size: clamp(28px, 5vw, 40px);
  font-weight: 700;
  color: #1a1a26;
  letter-spacing: 0.01em;
}

.hero__tagline {
  margin: 10px 0 0;
  font-size: 14.5px;
  color: #8a8a99;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 780px;
  margin: 24px auto 0;
  padding: 0 20px;
  animation: fade-up 0.4s ease 0.05s both;
}

.filter-btn {
  padding: 6px 16px;
  font-size: 13.5px;
  color: #55556a;
  background: #fff;
  border: 1px solid #e3e3ec;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #6366f1;
    border-color: #c3c3f7;
    transform: translateY(-1px);
  }

  &--active {
    color: #fff;
    background: #6366f1;
    border-color: #6366f1;

    &:hover {
      color: #fff;
    }
  }
}

.post-list {
  display: grid;
  gap: 16px;
  max-width: 780px;
  margin: 24px auto 0;
  padding: 0 20px 40px;
}

.post-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 26px;
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%), 0 4px 12px rgb(0 0 0 / 6%);
  text-decoration: none;
  animation: fade-up 0.4s ease both;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    border-color: #c3c3f7;
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgb(0 0 0 / 4%), 0 10px 24px rgb(0 0 0 / 8%);

    .post-card__arrow {
      color: #6366f1;
      transform: translateX(4px);
    }
  }
}

.post-card__main {
  flex: 1;
  min-width: 0;
}

.post-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: #1a1a26;
}

.post-card__excerpt {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.65;
  color: #71718a;

  /* 最多两行，超出省略 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12.5px;
  color: #8a8a99;
}

.post-card__category {
  padding: 2px 10px;
  color: #6366f1;
  background: #eef0fe;
  border-radius: 999px;
}

.meta-dot {
  color: #c5c5d2;
}

.post-card__tags {
  display: inline-flex;
  gap: 8px;
}

.tag-chip {
  color: #9a9aad;

  &:hover {
    color: #6366f1;
  }
}

.post-card__arrow {
  flex-shrink: 0;
  font-size: 18px;
  color: #c5c5d2;
  transition: all 0.2s ease;
}

.empty {
  padding: 60px 20px;
  text-align: center;
  font-size: 14.5px;
  color: #9a9aad;
}

.pagination {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 780px;
  margin: 4px auto 0;
  padding: 0 20px 40px;
}

.page-btn {
  min-width: 38px;
  padding: 7px 14px;
  font-size: 13.5px;
  color: #55556a;
  background: #fff;
  border: 1px solid #e3e3ec;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: #6366f1;
    border-color: #c3c3f7;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--active {
    color: #fff;
    background: #6366f1;
    border-color: #6366f1;

    &:hover {
      color: #fff;
      transform: none;
    }
  }
}

.site-footer {
  padding: 24px 20px 32px;
  text-align: center;
  font-size: 13px;
  color: #b0b0c0;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero,
  .filters,
  .post-card,
  .post-card__arrow {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
</style>
