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
        v-for="(post, i) in filteredPosts"
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
  // 详情页的分类 chip 通过 ?category=slug 跳回这里，用 replace 保持地址栏干净
  router.replace(slug ? { query: { category: slug } } : { query: {} })
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
