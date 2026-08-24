<template>
  <div class="rss-page">
    <!-- ===== Header ===== -->
    <SiteHeader width="800px" />

    <main class="wrap">
      <div class="page-head fade-up">
        <h1 class="page-head__cn">订阅</h1>
        <span class="page-head__en">Subscriptions · {{ feeds?.length ?? 0 }} 个站点</span>
      </div>

      <p class="page-intro fade-up" style="--stagger-index: 1">
            朋友们博客的最新文章，定期抓取汇总于此 📡
      </p>

      <!-- 订阅文章流 -->
      <section class="items fade-up" style="--stagger-index: 2">
        <a
          v-for="(item, i) in items"
          :key="item.id"
          :href="item.link"
          target="_blank"
          rel="noopener noreferrer"
          class="card item"
          :style="{ '--stagger-index': Math.min(i, 10) }"
        >
          <span class="item__meta">
            <span class="item__feed">{{ item.feedTitle }}</span>
            <time v-if="item.publishedAt" class="item__time">{{ formatDateTime(item.publishedAt) }}</time>
          </span>
          <strong class="item__title">{{ item.title }}</strong>
          <span v-if="item.summary" class="item__summary">{{ item.summary }}</span>
        </a>
      </section>

      <p v-if="!items.length && !pending" class="rss-empty fade-up" style="--stagger-index: 2">
        还没有抓到订阅文章，稍后再来看看吧
      </p>

      <div v-if="hasMore" class="load-more fade-up" style="--stagger-index: 2">
        <button type="button" class="btn btn--primary" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? '加载中…' : '加载更多' }}
        </button>
      </div>

      <!-- 订阅源列表（博客朋友圈） -->
      <section v-if="feeds?.length" class="card feeds fade-up" style="--stagger-index: 3">
        <h2 class="feeds__title">订阅源</h2>
        <div class="feeds__grid">
          <a
            v-for="feed in feeds"
            :key="feed.id"
            :href="feed.siteUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="feeds__item"
          >
            <strong>{{ feed.title || feed.siteUrl }}</strong>
            <span v-if="feed.description" class="feeds__desc">{{ feed.description }}</span>
          </a>
        </div>
      </section>
    </main>

    <!-- ===== Footer ===== -->
    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import type { PageResult, RssFeed, RssItem } from '#shared/types'

usePageSeo({
  title: '订阅 - Forever',
  description: 'Forever 订阅的朋友们博客最新文章，定期抓取汇总。',
  path: '/rss',
})

const PAGE_SIZE = 20

const items = ref<RssItem[]>([])
const total = ref(0)
const loadingMore = ref(false)
let nextPage = 1

const { data: firstPage, pending } = await useAsyncData('rss-items-first', () =>
  apiFetch<PageResult<RssItem>>('/api/v1/rss/items', { query: { page: 1, size: PAGE_SIZE } }),
)

if (firstPage.value) {
  items.value = firstPage.value.list
  total.value = firstPage.value.total
  nextPage = 2
}

/** 后端按发布时间倒序分页，取满 total 就没有下一页了 */
const hasMore = computed(() => items.value.length < total.value)

const { data: feeds } = await useAsyncData('rss-feeds-public', () =>
  apiFetch<RssFeed[]>('/api/v1/rss/feeds'),
)

async function loadMore() {
  loadingMore.value = true
  try {
    const page = await apiFetch<PageResult<RssItem>>('/api/v1/rss/items', {
      query: { page: nextPage, size: PAGE_SIZE },
    })
    items.value.push(...page.list)
    total.value = page.total
    nextPage += 1
  } finally {
    loadingMore.value = false
  }
}
</script>

<style scoped>
.rss-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.wrap {
  flex: 1;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 96px 20px 0;
}

.page-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-head__cn {
  margin: 0;
  font-size: 28px;
}

.page-head__en {
  font-size: 13px;
  color: var(--c-text-muted);
}

.page-intro {
  margin: 8px 0 24px;
  font-size: 14px;
  color: var(--c-text-secondary);
}

/* ===== 文章流 ===== */
.items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  text-decoration: none;
  animation: fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 50ms);
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s;
}

.item:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 26px rgb(0 0 0 / 8%);
}

.item__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}

.item__feed {
  overflow: hidden;
  color: var(--c-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item__time {
  flex-shrink: 0;
  color: var(--c-text-muted);
}

.item__title {
  font-size: 15px;
  line-height: 1.5;
  color: var(--c-text);
}

.item__summary {
  display: -webkit-box;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.6;
  color: var(--c-text-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.rss-empty {
  padding: 32px 0;
  font-size: 14px;
  color: var(--c-text-muted);
  text-align: center;
}

.load-more {
  margin-top: 20px;
  text-align: center;
}

/* ===== 订阅源 ===== */
.feeds {
  margin-top: 36px;
  padding: 24px;
}

.feeds__title {
  margin: 0 0 14px;
  font-size: 18px;
}

.feeds__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.feeds__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  font-size: 14px;
  color: var(--c-text);
  text-decoration: none;
  background: var(--c-bg-soft);
  border-radius: 10px;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.feeds__item:hover {
  transform: translateY(-2px);
}

.feeds__desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: var(--c-text-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@media (max-width: 640px) {
  .page-head {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
