<template>
  <div class="wall-page">
    <header class="site-header">
      <NuxtLink to="/" class="brand">Forever</NuxtLink>
      <div class="site-header__actions">
        <ThemeToggle />
        <NuxtLink to="/admin" class="back-btn admin-entry">管理</NuxtLink>
      </div>
    </header>

    <main v-if="board" class="wall-wrap">
      <!-- ===== 页头 ===== -->
      <div class="wall-head fade-up">
        <h1 class="wall-head__title">{{ board.title }}</h1>
        <span class="wall-head__en">Message Board · {{ total }} 条留言</span>
        <p v-if="board.summary" class="wall-head__intro">{{ board.summary }}</p>
      </div>

      <!-- ===== 我要留言 ===== -->
      <div class="card wall-form fade-up" style="--stagger-index: 1">
        <h2 class="wall-form__title">留下你的足迹 ✍️</h2>
        <CommentForm
          :article-id="board.id"
          placeholder-suffix="（留言）"
          @success="onCreated"
        />
      </div>

      <!-- ===== 留言墙 ===== -->
      <ClientOnly>
        <div v-if="loading && !messages.length" class="wall-empty">加载中…</div>
        <div v-else-if="!messages.length" class="wall-empty">
          墙上还空空的，来做第一个留言的人吧 🌟
        </div>

        <section v-else class="wall-grid">
          <article
            v-for="(msg, i) in messages"
            :key="msg.id"
            class="card wall-card"
            :style="{ '--stagger-index': Math.min(i, 12), '--card-hue': `${(msg.id * 47) % 360}deg` }"
          >
            <header class="wall-card__head">
              <img :src="msg.avatarUrl" alt="" class="wall-card__avatar" loading="lazy"
                   @error="(e: Event) => ((e.target as HTMLImageElement).style.visibility = 'hidden')">
              <div class="wall-card__who">
                <a
                  v-if="msg.site"
                  :href="msg.site"
                  target="_blank"
                  rel="noopener nofollow ugc"
                  class="wall-card__name wall-card__name--link"
                >{{ msg.nickname }}</a>
                <span v-else class="wall-card__name">{{ msg.nickname }}</span>
                <time class="wall-card__time">{{ formatDate(msg.createdAt) }}</time>
              </div>
            </header>
            <p class="wall-card__content">{{ msg.content }}</p>
          </article>
        </section>

        <div v-if="hasMore && messages.length" class="wall-more">
          <button type="button" class="btn btn--primary wall-more__btn" :disabled="loading" @click="loadMore">
            {{ loading ? '加载中…' : '加载更多留言' }}
          </button>
        </div>
        <template #fallback><span /></template>
      </ClientOnly>

      <p v-if="justPosted" class="wall-posted fade-up">{{ postedTip }}</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { CommentNode, Post } from '~/stores/types'
import { useCommentsStore } from '~/stores/comments'
import { usePageSeo } from '~/composables/usePageSeo'

/** 留言板：后端固定 slug 为 message 的独立页面（type=PAGE），留言即它下面的评论 */
const BOARD_SLUG = 'message'
const PAGE_SIZE = 24

const commentsStore = useCommentsStore()

/** 公开页面详情（仅已发布可访问） */
const { data: board, error } = await useAsyncData(`page-${BOARD_SLUG}`, () =>
  apiFetch<Post>(`/api/v1/articles/${BOARD_SLUG}`),
)

if (error.value || !board.value) {
  throw createError({ statusCode: 404, statusMessage: '页面不存在', fatal: true })
}

/* ---------- 留言分页（追加式） ---------- */
const messages = ref<CommentNode[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const justPosted = ref(false)
const postedTip = ref('留言已提交 ✓')

const hasMore = computed(() => messages.value.length < total.value)

async function load(targetPage = page.value) {
  loading.value = true
  try {
    const data = await commentsStore.fetchByArticle(board.value!.id, targetPage, PAGE_SIZE)
    if (targetPage === 1) messages.value = data.list
    else messages.value.push(...data.list)
    total.value = data.total
    page.value = data.page
  }
  catch {
    /* 加载失败保持现状，不打断页面 */
  }
  finally {
    loading.value = false
  }
}

function loadMore() {
  load(page.value + 1)
}

// 墙体用 ClientOnly 渲染，挂载后拉首页留言
onMounted(() => load(1))

/** 新留言插入墙顶；先审后显时提示等待审核 */
async function onCreated(created: { status: string }) {
  justPosted.value = true
  postedTip.value = created.status === 'PENDING'
    ? '留言已提交，审核通过后展示 ✓'
    : '留言已提交 ✓'
  total.value++
  setTimeout(() => (justPosted.value = false), 4000)
  await load(1)
}

usePageSeo({
  title: () => (board.value ? `${board.value.title} - Forever` : '留言板 - Forever'),
  description: () => board.value?.summary,
  type: 'website',
})
</script>

<style scoped>
.wall-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--c-bg-soft);
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 20px;
}

.brand {
  font-size: 18px;
  font-weight: 700;
  color: var(--c-text);
  text-decoration: none;

  &:hover {
    color: var(--c-primary);
  }
}

.admin-entry {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--c-text-secondary);
  text-decoration: none;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-bg-card);
  transition: all 0.2s ease;

  &:hover {
    color: var(--c-primary);
    border-color: var(--c-primary);
  }
}

.wall-wrap {
  max-width: 960px;
  margin: 0 auto;
  padding: 12px 20px 56px;
}

/* ===== 页头 ===== */
.wall-head {
  text-align: center;
  margin-bottom: 26px;
}

.wall-head__title {
  margin: 0 0 4px;
  font-size: clamp(26px, 5vw, 34px);
  font-weight: 700;
  color: var(--c-text);
}

.wall-head__en {
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--c-text-muted);
}

.wall-head__intro {
  max-width: 560px;
  margin: 14px auto 0;
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--c-text-secondary);
}

/* ===== 留言表单 ===== */
.wall-form {
  padding: 22px;
  margin-bottom: 28px;
}

.wall-form__title {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 600;
  color: var(--c-text);
}

/* ===== 留言墙（瀑布流卡片） ===== */
.wall-grid {
  column-count: 3;
  column-gap: 14px;

  @media (max-width: 820px) {
    column-count: 2;
  }

  @media (max-width: 520px) {
    column-count: 1;
  }
}

.wall-card {
  display: inline-block;
  width: 100%;
  margin-bottom: 14px;
  padding: 16px 18px;
  break-inside: avoid;
  animation: fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 50ms);
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-3px) rotate(-0.4deg);
    box-shadow: 0 6px 18px rgb(0 0 0 / 8%);
  }
}

.wall-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.wall-card__avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 0 2px hsl(var(--card-hue, 250deg) 70% 88%);
}

.dark .wall-card__avatar {
  box-shadow: 0 0 0 2px hsl(var(--card-hue, 250deg) 50% 35%);
}

.wall-card__who {
  min-width: 0;
}

.wall-card__name {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--c-text);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &--link:hover {
    color: var(--c-primary);
    text-decoration: underline;
  }
}

.wall-card__time {
  font-size: 11.5px;
  color: var(--c-text-muted);
}

.wall-card__content {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--c-text-secondary);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

/* ===== 空态 / 加载更多 ===== */
.wall-empty {
  padding: 48px 0;
  font-size: 14px;
  color: var(--c-text-muted);
  text-align: center;
}

.wall-more {
  margin-top: 8px;
  text-align: center;
}

.wall-more__btn {
  padding: 9px 28px;
}

.wall-posted {
  margin: 16px 0 0;
  font-size: 13px;
  color: var(--c-success);
  text-align: center;
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
  .wall-card,
  .fade-up {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
</style>
