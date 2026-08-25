<template>
  <div class="rss-page">
    <!-- ===== Header ===== -->

    <main class="wrap">
      <!-- 章节头：英文眉题 + 标题，与首页同款 -->
      <header class="section-head fade-up">
        <p class="section-head__caption">Subscriptions</p>
        <h1 class="section-head__title">订阅</h1>
        <p class="section-head__desc">
          朋友们博客的最新文章，定期抓取汇总于此 📡
          <template v-if="feeds?.length">· 共 {{ feeds.length }} 个站点</template>
        </p>
      </header>

      <!-- 订阅文章流：细行清单，发丝线分隔 -->
      <section class="items fade-up" style="--stagger-index: 1">
        <a
          v-for="(item, i) in items"
          :key="item.id"
          :href="item.link"
          target="_blank"
          rel="noopener noreferrer"
          class="item"
          :style="{ '--stagger-index': Math.min(i, 10) }"
        >
          <span class="item__meta">
            <span class="chip">{{ item.feedTitle }}</span>
            <time v-if="item.publishedAt" class="item__time">{{ formatDateTime(item.publishedAt) }}</time>
          </span>
          <h3 class="item__title">{{ item.title }}</h3>
          <p v-if="item.summary" class="item__summary">{{ item.summary }}</p>
        </a>
      </section>

      <p v-if="!items.length && !pending" class="rss-empty fade-up" style="--stagger-index: 1">
        还没有抓到订阅文章，稍后再来看看吧
      </p>

      <div v-if="hasMore" class="load-more fade-up" style="--stagger-index: 1">
        <button type="button" class="more-link" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? '加载中…' : `加载更多（已读 ${items.length} / ${total}）` }}
          <span v-if="!loadingMore" class="more-link__arrow">↓</span>
        </button>
      </div>

      <!-- 订阅源列表（博客朋友圈） -->
      <section v-if="feeds?.length" class="feeds fade-up" style="--stagger-index: 2">
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
import { formatDateTime } from '~/utils/format'

usePageSeo({
  title: '订阅 - 补陋阁',
  description: '补陋阁 订阅的朋友们博客最新文章，定期抓取汇总。',
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
  max-width: 720px;
  margin: 0 auto;
  padding: 96px 20px 64px;
}

/* ===== 章节头：与首页 section-head 同款 ===== */
.section-head__caption {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--c-primary);
}

.section-head__title {
  margin: 8px 0 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--c-text);
}

.section-head__desc {
  margin: 12px 0 0;
  font-size: 13.5px;
  line-height: 1.8;
  letter-spacing: 0.02em;
  color: var(--c-text-muted);
}

.chip {
  padding: 2px 10px;
  font-size: 12px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: 999px;
}

/* ===== 文章流：清单式行条目，发丝线分隔，不做一排排盒子 ===== */
.items {
  margin-top: 34px;
}

.item {
  display: block;
  padding: 20px 6px;
  text-decoration: none;

  & + & {
    border-top: 1px solid var(--c-border);
  }

  &:hover .item__title {
    color: var(--c-primary);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover .item__arrow {
      opacity: 1;
      transform: translate(2px, -2px);
    }
  }
}

.item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.item__time {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
}

.item__title {
  position: relative;
  margin: 10px 0 0;
  padding-right: 22px;
  font-size: 16.5px;
  font-weight: 650;
  line-height: 1.45;
  color: var(--c-text);
  transition: color 0.2s ease;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 悬停时右上角浮现的小箭头 */
.item__title::after {
  content: '↗';
  position: absolute;
  right: 0;
  top: 2px;
  font-size: 14px;
  color: var(--c-primary);
  opacity: 0;
  transform: translate(-2px, 2px);
  transition: opacity 0.2s ease, transform 0.25s var(--ease-bounce, ease);
}

.item__summary {
  margin: 7px 0 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--c-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rss-empty {
  margin-top: 40px;
  font-size: 14px;
  color: var(--c-text-muted);
  text-align: center;
}

.load-more {
  margin-top: 26px;
  text-align: center;
}

/* 「加载更多」：软糖胶囊，与首页 more-link 同款 */
.more-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  font-size: 14px;
  font-weight: 600;
  color: var(--c-primary);
  background: var(--c-bg-card);
  border: 1px solid color-mix(in srgb, var(--c-primary) 35%, transparent);
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s var(--ease-bounce);
}

.more-link:hover:not(:disabled) {
  color: #fff;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border-color: transparent;
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 8px 20px rgb(13 148 136 / 32%);
}

.more-link:disabled {
  opacity: 0.6;
  cursor: wait;
}

.more-link__arrow {
  transition: transform 0.2s ease;
}

@media (hover: hover) and (pointer: fine) {
  .more-link:hover:not(:disabled) .more-link__arrow {
    transform: translateY(3px);
  }
}

/* ===== 订阅源列表 ===== */
.feeds {
  margin-top: 48px;
}

.feeds__title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--c-text-secondary);
}

.feeds__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.feeds__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 2px;
  font-size: 13.5px;
  color: var(--c-text);
  text-decoration: none;
}

.feeds__list > * + * .feeds__item,
.feeds__item + .feeds__item {
  border-top: 1px solid var(--c-border);
}

.feeds__desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: var(--c-text-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

@media (max-width: 640px) {
  .section-head__title {
    font-size: 24px;
  }
}
</style>
