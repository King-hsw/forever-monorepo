<template>
  <form class="comment-form" novalidate @submit.prevent="submit">
    <!-- 回复提示 -->
    <div v-if="replyTo" class="comment-form__replying">
      回复 <strong>@{{ replyTo.nickname }}</strong>
      <button type="button" class="comment-form__reply-cancel" aria-label="取消回复" @click="$emit('cancel-reply')">×</button>
    </div>

    <div class="comment-form__row">
      <input
        v-model="identity.nickname"
        class="comment-form__input"
        type="text"
        maxlength="50"
        placeholder="昵称 *"
        :aria-label="'昵称' + (placeholderSuffix ?? '')"
      >
      <input
        v-model="identity.email"
        class="comment-form__input"
        type="email"
        maxlength="100"
        placeholder="邮箱 *（不公开，仅用于头像与回复通知）"
      >
    </div>
    <input
      v-model="identity.site"
      class="comment-form__input"
      type="url"
      maxlength="200"
      placeholder="个人主页（选填，昵称点击跳转）"
    >
    <div class="comment-form__body">
      <textarea
        v-model="content"
        class="comment-form__textarea"
        rows="4"
        maxlength="500"
        placeholder="写下你的想法…"
        required
      />
      <span class="comment-form__count" :class="{ 'is-limit': content.length >= 500 }">{{ content.length }}/500</span>
    </div>

    <p v-if="tip" class="comment-form__tip" :class="{ 'is-error': tipIsError }">{{ tip }}</p>

    <footer class="comment-form__actions">
      <span class="comment-form__hint">支持 Markdown 部分语法，敏感内容会被自动打码</span>
      <button type="submit" class="btn btn--primary" :disabled="submitting || !canSubmit">
        {{ submitting ? '提交中…' : '发表' }}
      </button>
    </footer>
  </form>
</template>

<script setup lang="ts">
import type { AdminComment } from '#shared/types'
import { useCommentsStore } from '~/stores/comments'

const props = defineProps<{
  /** 评论归属类型：文章评论 / 留言板留言 */
  targetType?: 'ARTICLE' | 'BOARD'
  /** 文章 id；targetType=ARTICLE 时必传 */
  targetId?: number
  /** 被回复的评论；为空则发根评论 */
  replyTo?: { id: number, nickname: string } | null
  /** 回复对象昵称：非空时提交内容自动加 @前缀（用于记录回复对象，公开接口不返回该信息） */
  mention?: string
  /** 输入框 aria 标签后缀（区分文章评论 / 留言墙） */
  placeholderSuffix?: string
}>()

const emit = defineEmits<{ success: [comment: AdminComment], 'cancel-reply': [] }>()

const commentsStore = useCommentsStore()

/** 访客身份记忆：昵称 / 邮箱 / 主页存 localStorage，下次自动带出 */
const IDENTITY_KEY = 'forever-comment-identity'

interface Identity { nickname: string, email: string, site: string }

const identity = reactive<Identity>({ nickname: '', email: '', site: '' })
const content = ref('')
const submitting = ref(false)
const tip = ref('')
const tipIsError = ref(false)

onMounted(() => {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    if (raw) Object.assign(identity, JSON.parse(raw) as Partial<Identity>)
  } catch {
    /* 忽略损坏的本地数据 */
  }
})

const canSubmit = computed(() =>
  identity.nickname.trim().length > 0
  && identity.email.trim().length > 0
  && content.value.trim().length > 0,
)

async function submit() {
  if (!canSubmit.value || submitting.value) return
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email.trim())) {
    tip.value = '邮箱格式不正确'
    tipIsError.value = true
    return
  }
  // 文章评论必须有目标文章 id，否则会发出残缺请求
  if (props.targetType !== 'BOARD' && !props.targetId) {
    tip.value = '缺少评论目标，请刷新页面重试'
    tipIsError.value = true
    return
  }

  submitting.value = true
  tip.value = ''
  try {
    const created = await commentsStore.create({
      ...(props.targetType === 'BOARD' ? { targetType: 'BOARD' as const } : { articleId: props.targetId }),
      parentId: props.replyTo?.id,
      nickname: identity.nickname.trim(),
      email: identity.email.trim(),
      site: identity.site.trim() || undefined,
      content: props.mention
        ? `@${props.mention} ${content.value.trim()}`
        : content.value.trim(),
    })

    // 身份落盘，下次免输入
    if (import.meta.client) {
      localStorage.setItem(IDENTITY_KEY, JSON.stringify({ ...identity }))
    }

    content.value = ''
    if (created.status === 'PENDING') {
      tip.value = '已提交，审核通过后将展示出来'
      tipIsError.value = false
    }
    else {
      tip.value = ''
    }
    emit('success', created)
  }
  catch (err) {
    tip.value = err instanceof Error ? err.message : '提交失败，请稍后再试'
    tipIsError.value = true
  }
  finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.comment-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-form__replying {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: 8px;
}

.comment-form__reply-cancel {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  font-size: 13px;
  line-height: 1;
  color: inherit;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;

  &:hover {
    background: rgb(0 0 0 / 10%);
  }
}

.comment-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
}

.comment-form__input,
.comment-form__textarea {
  padding: 9px 12px;
  font-size: 14px;
  color: var(--c-text);
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: var(--c-text-muted);
  }

  &:focus {
    outline: none;
    border-color: var(--c-primary);
    box-shadow: 0 0 0 3px var(--c-primary-light);
  }
}

.comment-form__body {
  position: relative;
}

.comment-form__textarea {
  display: block;
  width: 100%;
  resize: vertical;
  min-height: 96px;
}

.comment-form__count {
  position: absolute;
  right: 10px;
  bottom: 8px;
  font-size: 11.5px;
  color: var(--c-text-muted);
  pointer-events: none;

  &.is-limit {
    color: var(--c-danger);
  }
}

.comment-form__tip {
  margin: 0;
  font-size: 13px;
  color: var(--c-success);

  &.is-error {
    color: var(--c-danger);
  }
}

.comment-form__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.comment-form__hint {
  font-size: 12px;
  color: var(--c-text-muted);

  @media (max-width: 560px) {
    display: none;
  }
}

.comment-form__actions .btn {
  padding: 7px 22px;
  font-size: 14px;
}
</style>
