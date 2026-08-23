<template>
  <div class="post-page">
    <header class="site-header">
      <NuxtLink to="/" class="brand">Forever</NuxtLink>
      <div class="site-header__actions">
        <ThemeToggle />
        <NuxtLink to="/admin" class="back-btn admin-entry">管理</NuxtLink>
        <button type="button" class="back-btn" @click="goBack">← 返回</button>
      </div>
    </header>

    <main v-if="post" class="article-wrap">
      <article class="article-card">
        <header class="article-head">
          <NuxtLink
          <NuxtLink
            v-if="categorySlug"
            :to="`/posts?category=${categorySlug}`"
            class="category-chip"
          >{{ post.categoryName }}</NuxtLink>
          <span v-else class="category-chip category-chip--none">{{ post.categoryName || '未分类' }}</span>

          <h1 class="article-title">{{ post.title }}</h1>

          <div class="article-meta">
            <span>发布于 {{ formatDate(post.publishedAt ?? post.createdAt) }}</span>
            <template v-if="formatDate(post.updatedAt) !== formatDate(post.publishedAt ?? post.createdAt)">
              <span class="meta-dot">·</span>
              <span>更新于 {{ formatDate(post.updatedAt) }}</span>
            </template>
            <span class="meta-dot">·</span>
            <span>{{ post.viewCount.toLocaleString() }} 次阅读</span>
          </div>
        </header>

        <p v-if="post.summary" class="article-excerpt">{{ post.summary }}</p>

        <!-- 正文：后端存储 Markdown -->
        <MarkdownView :source="post.content ?? ''" class="article-body" />

        <footer v-if="post.tags.length" class="article-tags">
          <span v-for="tag in post.tags" :key="tag.id" class="tag-chip"># {{ tag.name }}</span>
        </footer>
      </article>

      <section v-if="relatedPosts.length" class="related">
        <h2 class="related__title">相关文章</h2>
        <ul class="related__list">
          <li v-for="(item, i) in relatedPosts" :key="item.id" class="related__item"
              :style="{ animationDelay: `${i * 60}ms` }">
            <NuxtLink :to="`/posts/${item.slug}`" class="related__link">
              <span class="related__name">{{ item.title }}</span>
              <time class="related__time">{{ formatDate(item.publishedAt ?? item.createdAt) }}</time>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { PageResult, Post } from '~/stores/types'

const route = useRoute()
const slug = route.params.slug as string

/** 公开文章详情（仅已发布文章可访问，浏览量由服务端统计） */
const { data: post, error } = await useAsyncData(`article-${slug}`, () =>
  apiFetch<Post>(`/api/v1/articles/${encodeURIComponent(slug)}`),
)

if (error.value || !post.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在', fatal: true })
}

/** 分类 slug（分类 chip 跳回首页对应筛选） */
const { data: categories } = await useAsyncData('home-categories', () =>
  apiFetch<{ slug: string; id: number }[]>('/api/v1/categories'),
)
const categorySlug = computed(() =>
  categories.value?.find(c => c.id === post.value?.categoryId)?.slug ?? '',
)

/** 同分类下已发布的其他文章，最多 4 篇 */
const { data: related } = await useAsyncData(`related-${slug}`, () => {
  if (!post.value?.categoryId) return Promise.resolve(null)
  return apiFetch<PageResult<Post>>('/api/v1/articles', {
    query: { categoryId: post.value.categoryId, page: 1, size: 5 },
  })
})
const relatedPosts = computed(() =>
  (related.value?.list ?? [])
    .filter(p => p.id !== post.value?.id)
    .slice(0, 4),
)

function goBack() {
  if (window.history.length > 1) {
    useRouter().back()
  }
  else {
    navigateTo('/')
  }
}

function formatDate(value: string | number | null | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

useHead(() => ({
  title: post.value ? `${post.value.title} - Forever` : 'Forever',
}))
</script>

<style scoped>
.post-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--c-bg-soft);
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 780px;
  margin: 0 auto;
  padding: 16px 20px;
}
.site-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand {
  font-size: 18px;
  font-weight: 700;
  color: var(--c-text);
  text-decoration: none;
  letter-spacing: 0.01em;

  &:hover {
    color: var(--c-primary);
  }
}

.back-btn {
  padding: 6px 14px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-bg-card);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--c-primary);
    border-color: var(--c-primary);
    transform: translateY(-1px);
    box-shadow: 0 1px 2px rgb(0 0 0 / 4%), 0 4px 12px rgb(0 0 0 / 6%);
  }
}

.admin-entry {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}

.article-wrap {
  max-width: 780px;
  margin: 0 auto;
  padding: 8px 20px 48px;
}

.article-card {
  padding: 36px clamp(20px, 5vw, 44px) 32px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%), 0 4px 12px rgb(0 0 0 / 6%);
  animation: fade-up 0.4s ease both;
}

.article-title {
  margin: 14px 0 10px;
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 700;
  line-height: 1.3;
  color: var(--c-text);
}

.category-chip {
  display: inline-block;
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: 999px;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: var(--c-primary-light);
  }

  &--none {
    color: var(--c-text-muted);
    background: var(--c-bg-soft);
  }
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--c-text-muted);
}

.meta-dot {
  color: var(--c-text-muted);
}

.article-excerpt {
  margin: 20px 0 0;
  padding: 14px 18px;
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border-left: 3px solid var(--c-primary);
  border-radius: 0 8px 8px 0;
}

.article-body {
  margin-top: 24px;
  font-size: 15.5px;
  line-height: 1.85;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--c-border);
}

.tag-chip {
  padding: 4px 12px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border-radius: 999px;
  transition: all 0.2s ease;

  &:hover {
    color: var(--c-primary);
    background: var(--c-primary-light);
  }
}

.related {
  margin-top: 28px;
  animation: fade-up 0.4s ease 0.15s both;
}

.related__title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--c-text);
}

.related__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.related__item {
  animation: fade-up 0.35s ease both;
}

.related__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--c-primary);
    transform: translateY(-2px);
    box-shadow: 0 1px 2px rgb(0 0 0 / 4%), 0 4px 12px rgb(0 0 0 / 6%);
  }
}

.related__name {
  font-size: 14.5px;
  font-weight: 500;
  color: #33334a;
}

.related__time {
  flex-shrink: 0;
  font-size: 12.5px;
  color: var(--c-text-muted);
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
  .article-card,
  .related,
  .related__item,
  .back-btn,
  .category-chip,
  .tag-chip,
  .related__link {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
</style>
