<template>
  <section class="comments" aria-label="评论">
    <header class="comments__head">
      <h2 class="comments__title">评论 <small v-if="total">({{ total }})</small></h2>
    </header>

    <div class="card comments__form-wrap fade-up">
      <CommentForm
        :article-id="articleId"
        :reply-to="replyTo"
        placeholder-suffix="（评论）"
        @success="onCreated"
        @cancel-reply="replyTo = null"
      />
    </div>

    <ClientOnly>
      <div v-if="loading && !roots.length" class="comments__empty">加载中…</div>
      <div v-else-if="!roots.length" class="comments__empty">还没有评论，来抢沙发吧～</div>

      <ul v-else class="comments__list" role="list">
        <li v-for="root in roots" :key="root.id" class="comment">
          <CommentItem :comment="root" @reply="replyTo = $event" />

          <!-- 楼内回复 -->
          <ul v-if="root.replies?.length" class="comment__replies" role="list">
            <li v-for="reply in root.replies" :key="reply.id">
              <CommentItem :comment="reply" is-reply @reply="replyTo = $event" />
            </li>
          </ul>
        </li>
      </ul>

      <!-- 分页：根评论分页，楼内回复随根返回 -->
      <nav v-if="totalPages > 1" class="comments__pager" aria-label="评论分页">
        <button type="button" class="comments__pager-btn" :disabled="page <= 1 || loading" @click="go(page - 1)">← 上一页</button>
        <span class="comments__pager-info">{{ page }} / {{ totalPages }}</span>
        <button type="button" class="comments__pager-btn" :disabled="page >= totalPages || loading" @click="go(page + 1)">下一页 →</button>
      </nav>
      <template #fallback><span /></template>
    </ClientOnly>

    <p v-if="justPosted" class="comments__posted fade-up">你的评论已提交 ✓</p>
  </section>
</template>

<script setup lang="ts">
import type { CommentNode } from '~/stores/types'
import { useCommentsStore } from '~/stores/comments'

const props = defineProps<{ articleId: number }>()

const commentsStore = useCommentsStore()
const PAGE_SIZE = 10

const roots = ref<CommentNode[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const replyTo = ref<CommentNode | null>(null)
const justPosted = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

async function load(targetPage = page.value) {
  loading.value = true
  try {
    const data = await commentsStore.fetchByArticle(props.articleId, targetPage, PAGE_SIZE)
    roots.value = data.list
    total.value = data.total
    page.value = data.page
  }
  catch {
    roots.value = []
    total.value = 0
  }
  finally {
    loading.value = false
  }
}

function go(p: number) {
  load(p)
}

/** 评论提交成功后回到第一页刷新 */
async function onCreated() {
  justPosted.value = true
  replyTo.value = null
  setTimeout(() => (justPosted.value = false), 4000)
  await load(1)
}

// 列表用 ClientOnly 渲染，SSR 阶段拉取是浪费，仅在客户端加载
watch(
  () => props.articleId,
  () => {
    if (import.meta.client) load(1)
  },
  { immediate: true },
)
</script>

<style scoped>
.comments {
  margin-top: 28px;
}

.comments__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
}

.comments__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--c-text);

  small {
    font-size: 13px;
    font-weight: 400;
    color: var(--c-text-muted);
  }
}

.comments__form-wrap {
  padding: 18px;
  margin-bottom: 20px;
}

.comments__empty {
  padding: 28px 0;
  font-size: 13.5px;
  color: var(--c-text-muted);
  text-align: center;
}

.comments__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.comment__replies {
  margin: 4px 0 0;
  padding: 0 0 0 52px;
  list-style: none;

  @media (max-width: 560px) {
    padding-left: 24px;
  }
}

.comment__replies > li + li {
  margin-top: 4px;
}

.comments__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.comments__pager-btn {
  padding: 6px 14px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: var(--c-primary);
    border-color: var(--c-primary);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.comments__pager-info {
  font-size: 12.5px;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
}

.comments__posted {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--c-success);
  text-align: center;
}
</style>
