<template>
  <section class="comments" aria-label="评论">
    <header class="comments__head">
      <h2 class="comments__title">评论 <small v-if="total">({{ total }})</small></h2>
    </header>

    <div class="comments__form-wrap">
      <CommentForm
        target-type="ARTICLE"
        :target-id="articleId"
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
        <button type="button" class="btn comments__pager-btn" :disabled="page <= 1 || loading" @click="go(page - 1)">← 上一页</button>
        <span class="comments__pager-info">{{ page }} / {{ totalPages }}</span>
        <button type="button" class="btn comments__pager-btn" :disabled="page >= totalPages || loading" @click="go(page + 1)">下一页 →</button>
      </nav>
      <template #fallback><span /></template>
    </ClientOnly>

    <p v-if="justPosted" class="comments__posted fade-up">你的评论已提交 ✓</p>
  </section>
</template>

<script setup lang="ts">
import type { CommentNode } from '#shared/types'
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
  font-size: 16px;
  font-weight: 600;
  color: var(--c-text);

  small {
    font-size: 12.5px;
    font-weight: 400;
    color: var(--c-text-muted);
  }
}

/* 表单不再包卡片（全站已去外壳），输入控件自带描边 */
.comments__form-wrap {
  margin-bottom: 18px;
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
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 楼层卡片：与相关文章卡片同款的白底描边，楼内回复同卡 */
.comments__list > .comment {
  padding: 16px 18px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;

  @media (max-width: 560px) {
    padding: 14px;
  }
}

/* 楼内回复：墨线（目录同款竖发丝线）+ 缩进，替代卡片套卡片 */
.comment__replies {
  margin: 12px 0 0 20px;
  padding: 0 0 0 14px;
  border-left: 1px solid var(--c-border);
  list-style: none;

  @media (max-width: 560px) {
    margin-left: 12px;
    padding-left: 10px;
  }
}


.comment__replies > li + li {
  margin-top: 2px;
}

.comments__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

/* 分页沿用全站 .btn 胶囊语言，只收窄尺寸 */
.comments__pager-btn {
  padding: 5px 16px;
  font-size: 13px;
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
