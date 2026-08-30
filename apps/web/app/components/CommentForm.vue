<template>
  <form class="comment-form" novalidate @submit.prevent="submit">
    <!-- 回复提示 -->
    <div v-if="replyTo" class="comment-form__replying">
      回复 <strong>@{{ replyTo.nickname }}</strong>
      <button type="button" class="comment-form__reply-cancel" aria-label="取消回复" @click="$emit('cancel-reply')">×</button>
    </div>

    <!-- 发言人身份：登录资料（动态评论）> 游客身份全站通用（/guest 页维护） -->
    <div v-if="loginIdentity" class="comment-form__identity">
      <span>以 <strong>{{ loginIdentity.nickname }}</strong>（登录资料）的身份评论</span>
    </div>
    <div v-else-if="guest.isRegistered" class="comment-form__identity">
      <span>以 <strong>{{ guest.nickname }}</strong> 的身份评论</span>
      <NuxtLink to="/guest" class="comment-form__link">换身份</NuxtLink>
    </div>
    <div v-else class="comment-form__identity comment-form__identity--gate">
      <span>发言需先注册游客身份</span>
      <NuxtLink :to="registerUrl" class="comment-form__link">去注册</NuxtLink>
    </div>

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
import type { AdminComment, ProfileInfo } from '#shared/types'
import { useAuthStore } from '~/stores/auth'
import { apiFetch } from '~/utils/api'
import { useCommentsStore } from '~/stores/comments'

const props = defineProps<{
  /** 评论归属类型：文章评论 / 留言板留言 / 动态评论 */
  targetType?: 'ARTICLE' | 'BOARD' | 'MOMENT'
  /** 文章 id（ARTICLE）/ 动态 id（MOMENT）；targetType=ARTICLE 时必传 */
  targetId?: number
  /** 被回复的评论；为空则发根评论 */
  replyTo?: { id: number, nickname: string } | null
  /** 输入框 aria 标签后缀（区分文章评论 / 留言墙） */
  /** 以登录用户资料作为发言身份（动态评论用），免游客身份注册门槛 */
  useLoginIdentity?: boolean
}>()

const emit = defineEmits<{ success: [comment: AdminComment], 'cancel-reply': [] }>()

const commentsStore = useCommentsStore()
const guest = useGuestStore()
const auth = useAuthStore()
const route = useRoute()
const { syncSubscriptionEmail } = usePush()

guest.hydrate()

/** 登录资料发言身份：仅 useLoginIdentity 开启且登录时拉取；资料缺昵称则回落游客身份流程（邮箱可为空） */
const profile = ref<ProfileInfo | null>(null)
if (props.useLoginIdentity) {
  auth.hydrate()
  if (auth.isAuthenticated)
    void apiFetch<ProfileInfo>('/api/admin/profile').then(p => {
      profile.value = p
    }).catch(() => {})
}
const loginIdentity = computed(() => {
  const p = profile.value
  if (!p)
    return null
  const nickname = p.nickname || p.username
  return nickname ? { nickname, email: p.email || '', site: p.site || '' } : null
})

const content = ref('')
const submitting = ref(false)
const tip = ref('')
const tipIsError = ref(false)

/** 未注册身份时的注册入口（带回跳，保存后回到本页） */
const registerUrl = computed(() => ({ path: '/guest', query: { redirect: route.fullPath } }))

const canSubmit = computed(() => content.value.trim().length > 0)

async function submit() {
  if (!canSubmit.value || submitting.value)
    return
  const identity = loginIdentity.value
  if (!identity && !guest.isRegistered) {
    await navigateTo(registerUrl.value)
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
  const commentEmail = identity?.email ?? guest.email
  try {
    const created = await commentsStore.create({
      // MOMENT 必须显式带 targetType/targetId，store 才走动态评论接口（带 articleId 会被当成文章评论）
      ...(props.targetType === 'BOARD'
        ? { targetType: 'BOARD' as const }
        : props.targetType === 'MOMENT'
          ? { targetType: 'MOMENT' as const, targetId: props.targetId }
          : { articleId: props.targetId }),
      parentId: props.replyTo?.id,
      nickname: identity?.nickname ?? guest.nickname,
      email: commentEmail,
      site: identity?.site || guest.site || undefined,
      content: content.value.trim(),
    })

    content.value = ''
    // 已订阅推送时把订阅绑到本条评论邮箱，被回复时可收到定向推送（内部静默，失败不影响评论）
    syncSubscriptionEmail(commentEmail)
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
    tip.value = errMsg(err, '提交失败，请稍后再试')
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

/* 身份栏：已注册 = 当前身份 + 换身份；未注册 = 注册引导 */
.comment-form__identity {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border-radius: 8px;
}

.comment-form__identity strong {
  font-weight: 600;
  color: var(--c-text);
}

.comment-form__identity--gate {
  color: var(--c-text-muted);
}

.comment-form__link {
  margin-left: auto;
  color: var(--c-primary);
  font-weight: 600;
  text-decoration: none;
}

.comment-form__link:hover {
  text-decoration: underline;
}

.comment-form__textarea {
  display: block;
  width: 100%;
  padding: 9px 12px;
  font-size: 14px;
  color: var(--c-text);
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  resize: vertical;
  min-height: 96px;

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
