<template>
  <div class="post-page">
    <header class="site-header">
      <NuxtLink to="/" class="brand">Forever</NuxtLink>
      <button type="button" class="back-btn" @click="goBack">← 返回</button>
    </header>

    <main v-if="post" class="article-wrap">
      <article class="article-card">
        <p v-if="post.status === 'draft'" class="draft-banner">
          当前文章为草稿，尚未发布
        </p>

        <header class="article-head">
          <NuxtLink
            v-if="category"
            :to="`/?category=${category.slug}`"
            class="category-chip"
          >{{ category.name }}</NuxtLink>
          <span v-else class="category-chip category-chip--none">未分类</span>

          <h1 class="article-title">{{ post.title }}</h1>

          <div class="article-meta">
            <span>发布于 {{ formatDate(post.createdAt) }}</span>
            <template v-if="formatDate(post.updatedAt) !== formatDate(post.createdAt)">
              <span class="meta-dot">·</span>
              <span>更新于 {{ formatDate(post.updatedAt) }}</span>
            </template>
            <span class="meta-dot">·</span>
            <span>{{ post.views.toLocaleString() }} 次阅读</span>
          </div>
        </header>

        <p v-if="post.excerpt" class="article-excerpt">{{ post.excerpt }}</p>

        <!-- 正文：优先渲染 Markdown，历史数据只有 HTML 时降级 -->
        <MarkdownView v-if="post.markdown" :source="post.markdown" class="article-body" />
        <div v-else class="markdown-view article-body" v-html="post.contentHtml"></div>

        <footer v-if="tags.length" class="article-tags">
          <span v-for="tag in tags" :key="tag.id" class="tag-chip"># {{ tag.name }}</span>
        </footer>
      </article>

      <section v-if="relatedPosts.length" class="related">
        <h2 class="related__title">相关文章</h2>
        <ul class="related__list">
          <li v-for="(item, i) in relatedPosts" :key="item.id" class="related__item"
              :style="{ animationDelay: `${i * 60}ms` }">
            <NuxtLink :to="`/posts/${item.id}`" class="related__link">
              <span class="related__name">{{ item.title }}</span>
              <time class="related__time">{{ formatDate(item.createdAt) }}</time>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const postsStore = usePostsStore()
const categoriesStore = useCategoriesStore()
const tagsStore = useTagsStore()

const id = route.params.id as string

const post = computed(() => postsStore.getById(id))
if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在', fatal: true })
}

const category = computed(() =>
  post.value?.categoryId
    ? categoriesStore.list.find(c => c.id === post.value!.categoryId) ?? null
    : null,
)

const tags = computed(() =>
  post.value ? tagsStore.list.filter(t => post.value!.tagIds.includes(t.id)) : [],
)

/** 同分类下已发布的其他文章，最多 4 篇 */
const relatedPosts = computed(() => {
  const cur = post.value
  if (!cur) return []
  return postsStore.list
    .filter(p =>
      p.id !== cur.id
      && p.status === 'published'
      && p.categoryId === cur.categoryId,
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 4)
})

// 阅读数在客户端挂载后累加，避免 SSR/水合不一致与重复计数
onMounted(() => postsStore.incrementViews(id))

function goBack() {
  if (window.history.length > 1) {
    useRouter().back()
  }
  else {
    navigateTo('/')
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
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
  background: #f6f6fa;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 780px;
  margin: 0 auto;
  padding: 16px 20px;
}

.brand {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a26;
  text-decoration: none;
  letter-spacing: 0.01em;

  &:hover {
    color: #6366f1;
  }
}

.back-btn {
  padding: 6px 14px;
  font-size: 13px;
  color: #55556a;
  border: 1px solid #d9d9e3;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #6366f1;
    border-color: #c3c3f7;
    transform: translateY(-1px);
    box-shadow: 0 1px 2px rgb(0 0 0 / 4%), 0 4px 12px rgb(0 0 0 / 6%);
  }
}

.article-wrap {
  max-width: 780px;
  margin: 0 auto;
  padding: 8px 20px 48px;
}

.article-card {
  padding: 36px clamp(20px, 5vw, 44px) 32px;
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%), 0 4px 12px rgb(0 0 0 / 6%);
  animation: fade-up 0.4s ease both;
}

.draft-banner {
  margin: -8px 0 16px;
  padding: 8px 14px;
  font-size: 13px;
  color: #92400e;
  background: #fef3c7;
  border-radius: 8px;
}

.article-title {
  margin: 14px 0 10px;
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 700;
  line-height: 1.3;
  color: #1a1a26;
}

.category-chip {
  display: inline-block;
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #6366f1;
  background: #eef0fe;
  border-radius: 999px;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: #dfe2fd;
  }

  &--none {
    color: #8a8a99;
    background: #f1f1f5;
  }
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: #8a8a99;
}

.meta-dot {
  color: #c5c5d2;
}

.article-excerpt {
  margin: 20px 0 0;
  padding: 14px 18px;
  font-size: 14.5px;
  line-height: 1.7;
  color: #57606a;
  background: #fafafc;
  border-left: 3px solid #c7caf9;
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
  border-top: 1px solid #ececf2;
}

.tag-chip {
  padding: 4px 12px;
  font-size: 13px;
  color: #55556a;
  background: #f4f4f8;
  border-radius: 999px;
  transition: all 0.2s ease;

  &:hover {
    color: #6366f1;
    background: #eef0fe;
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
  color: #1a1a26;
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
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    border-color: #c3c3f7;
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
  color: #8a8a99;
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
