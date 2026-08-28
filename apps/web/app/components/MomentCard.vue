<template>
  <article class="moment-card">
    <!-- 头部：头像 / 用户名（点击按人筛选）+ 地点 + 相对时间 -->
    <header class="moment-card__head">
      <button type="button" class="moment-card__avatar-btn" :title="`只看 ${moment.username} 的动态`" @click="goUser">
        <img
          v-if="moment.avatarUrl"
          class="moment-card__avatar"
          :src="moment.avatarUrl"
          :alt="moment.username"
          loading="lazy"
          width="40"
          height="40"
        >
        <span v-else class="moment-card__avatar moment-card__avatar--initial" aria-hidden="true">
          {{ initialOf(moment.username) }}
        </span>
      </button>
      <div class="moment-card__info">
        <button type="button" class="moment-card__name" :title="`只看 ${moment.username} 的动态`" @click="goUser">
          {{ moment.username }}
        </button>
        <span v-if="locationText || locationHref" class="moment-card__loc">
          <span aria-hidden="true">📍</span>
          <!-- 无文本但有经纬度：「位置」链接新标签打开高德 marker 页 -->
          <a v-if="locationHref" :href="locationHref" target="_blank" rel="noopener">位置</a>
          <template v-else>{{ locationText }}</template>
        </span>
      </div>
      <time class="moment-card__time" :datetime="moment.createdAt" :title="formatDateTime(moment.createdAt)">
        {{ formatRelativeTime(moment.createdAt) }}
      </time>
    </header>

    <!-- 正文：保留换行 -->
    <p v-if="moment.content" class="moment-card__content">{{ moment.content }}</p>

    <!-- 媒体：图片宫格（点击新标签打开）/ 音频 / 视频 -->
    <div v-if="hasMedia" class="moment-card__media">
      <div v-if="images.length" class="media-grid" :class="gridClass">
        <a
          v-for="url in images"
          :key="url"
          :href="url"
          target="_blank"
          rel="noopener"
          class="media-grid__item"
        >
          <img :src="url" alt="图片" loading="lazy" />
        </a>
      </div>
      <audio v-if="moment.media.audio" controls :src="moment.media.audio" />
      <video v-if="moment.media.video" controls :src="moment.media.video" />
    </div>

    <!-- 底部：点赞 / 评论 / 删除 -->
    <footer class="moment-card__foot">
      <button
        type="button"
        class="moment-card__like"
        :class="{ 'is-liked': moment.liked }"
        :aria-pressed="moment.liked"
        :disabled="likePending"
        @click="toggleLike"
      >
        <span class="moment-card__like-emoji" aria-hidden="true">{{ moment.liked ? '❤️' : '🤍' }}</span>
        <span>{{ moment.likeCount }}</span>
      </button>
      <button
        type="button"
        class="moment-card__comments-btn"
        :aria-expanded="showComments"
        :disabled="showComments && loadingComments"
        @click="toggleComments"
      >
        💬 {{ commentTotal ?? moment.commentCount }} 条
      </button>
      <button
        v-if="moment.canDelete"
        type="button"
        class="moment-card__delete"
        :class="{ 'is-confirm': confirmDelete }"
        :disabled="deleting"
        @click="onDelete"
      >
        {{ deleting ? '删除中…' : confirmDelete ? '确认删除？' : '删除' }}
      </button>
    </footer>

    <!-- 内联评论区：两层楼，与文章 / 留言板同一组件族 -->
    <section v-if="showComments" class="moment-card__comments" aria-label="动态评论">
      <CommentForm
        target-type="MOMENT"
        :target-id="moment.id"
        :reply-to="replyTo"
        :use-login-identity="true"
        placeholder-suffix="（动态）"
        @success="onCommentCreated"
        @cancel-reply="replyTo = null"
      />

      <div v-if="loadingComments" class="moment-card__cstate">加载中…</div>
      <div v-else-if="!roots.length" class="moment-card__cstate">还没有评论，来抢沙发吧～</div>
      <template v-else>
        <ul class="moment-card__clist">
          <li v-for="root in roots" :key="root.id" class="moment-card__comment">
            <CommentItem :comment="root" @reply="replyTo = $event" />
            <ul v-if="root.replies?.length" class="moment-card__replies" role="list">
              <li v-for="reply in root.replies" :key="reply.id">
                <CommentItem :comment="reply" is-reply @reply="replyTo = $event" />
              </li>
            </ul>
          </li>
        </ul>
        <nav v-if="totalPages > 1" class="moment-card__pager" aria-label="评论分页">
          <button type="button" :disabled="commentPage <= 1" @click="goPage(commentPage - 1)">← 上一页</button>
          <span>{{ commentPage }} / {{ totalPages }}</span>
          <button type="button" :disabled="commentPage >= totalPages" @click="goPage(commentPage + 1)">下一页 →</button>
        </nav>
      </template>
    </section>
  </article>
</template>

<script setup lang="ts">
import type { AdminComment, CommentNode, Moment } from '#shared/types'
import { useMomentsStore } from '~/stores/moments'
import { formatDateTime, formatRelativeTime, initialOf } from '~/utils/format'

const props = defineProps<{ moment: Moment }>()
const emit = defineEmits<{ deleted: [id: number] }>()

const route = useRoute()
const router = useRouter()
const momentsStore = useMomentsStore()

const COMMENT_SIZE = 10

/** 地点：有文本显文本；无文本但有经纬度给「位置」链接（高德 marker 页新标签打开） */
const locationText = computed(() => props.moment.location || '')
const locationHref = computed(() =>
  !props.moment.location && props.moment.lat != null && props.moment.lng != null
    ? `https://uri.amap.com/marker?location=${props.moment.lng},${props.moment.lat}`
    : '',
)

const images = computed(() => props.moment.media?.images ?? [])
const hasMedia = computed(() => images.value.length > 0 || !!props.moment.media?.audio || !!props.moment.media?.video)
/** 1 图大图 / 2–4 两列 / 5–9 三列九宫格 */
const gridClass = computed(() =>
  images.value.length === 1 ? 'media-grid--1' : images.value.length <= 4 ? 'media-grid--2' : 'media-grid--3',
)

/** 头像 / 用户名点击：只看该用户的动态（?user= 过滤，可直接分享） */
function goUser() {
  if (Number(route.query.user) !== props.moment.uid)
    router.push({ query: { ...route.query, user: String(props.moment.uid) } })
}

/* ---------- 乐观点赞：先切换再请求，失败回滚 ---------- */
const likePending = ref(false)
async function toggleLike() {
  if (likePending.value) return
  const prev = { liked: props.moment.liked, count: props.moment.likeCount }
  props.moment.liked = !prev.liked
  props.moment.likeCount = prev.count + (prev.liked ? -1 : 1)
  likePending.value = true
  try {
    const res = await momentsStore.toggleLike(props.moment.id, prev.liked)
    props.moment.liked = res.liked
    props.moment.likeCount = res.likeCount
  }
  catch {
    props.moment.liked = prev.liked
    props.moment.likeCount = prev.count
  }
  finally {
    likePending.value = false
  }
}

/* ---------- 内联评论区：展开时按需拉取 ---------- */
const showComments = ref(false)
const roots = ref<CommentNode[]>([])
const commentTotal = ref<number | null>(null)
const commentPage = ref(1)
const loadingComments = ref(false)
const replyTo = ref<CommentNode | null>(null)

const totalPages = computed(() => Math.max(1, Math.ceil((commentTotal.value ?? 0) / COMMENT_SIZE)))

async function load(page = commentPage.value) {
  loadingComments.value = true
  try {
    const data = await momentsStore.fetchMomentComments(props.moment.id, page, COMMENT_SIZE)
    roots.value = data.list
    commentTotal.value = data.total
    commentPage.value = data.page
  }
  catch {
    roots.value = []
    commentTotal.value = null
  }
  finally {
    loadingComments.value = false
  }
}

function goPage(p: number) {
  load(p)
}

function toggleComments() {
  showComments.value = !showComments.value
  if (showComments.value && roots.value.length === 0 && commentTotal.value === null)
    void load(1)
}

function onCommentCreated(created: AdminComment) {
  replyTo.value = null
  if (created.status !== 'PENDING')
    props.moment.commentCount++
  void load(1)
}

/* ---------- 删除：内联两步确认 ---------- */
const confirmDelete = ref(false)
const deleting = ref(false)
async function onDelete() {
  if (deleting.value) return
  if (!confirmDelete.value) {
    confirmDelete.value = true
    return
  }
  deleting.value = true
  try {
    await momentsStore.removeMoment(props.moment.id)
    emit('deleted', props.moment.id)
  }
  catch {
    confirmDelete.value = false
  }
  finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.moment-card {
  padding: 16px 18px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

/* ===== 头部 ===== */
.moment-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.moment-card__avatar-btn {
  flex-shrink: 0;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 50%;
  transition: transform var(--dur-soft) var(--ease-bounce);
}

.moment-card__avatar-btn:active {
  transform: scale(0.92);
}

.moment-card__avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.moment-card__avatar--initial {
  font-size: 18px;
  font-weight: 600;
  color: var(--c-on-primary);
  background: var(--c-primary);
}

.moment-card__info {
  flex: 1;
  min-width: 0;
}

.moment-card__name {
  display: block;
  padding: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--c-text);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--dur-soft) ease;
}

.moment-card__name:hover {
  color: var(--c-primary-hover);
}

.moment-card__loc {
  display: block;
  font-size: 12px;
  color: var(--c-text-muted);
}

.moment-card__time {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--c-text-muted);
}

/* ===== 正文与媒体 ===== */
.moment-card__content {
  margin: 10px 0 0;
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--c-text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.moment-card__media {
  margin-top: 12px;
}

/* 预览区限宽：单图 480px 宽，多图宫格每格约 156px，不再整卡铺满 */
.media-grid {
  display: grid;
  gap: 6px;
  max-width: 480px;
}

.media-grid--1 {
  grid-template-columns: 1fr;
}

.media-grid--1 img {
  max-height: 420px; /* 长图限高，object-fit: cover 裁剪 */
}

.media-grid--2 {
  grid-template-columns: repeat(2, 1fr);
  max-width: 318px; /* 两列时保持与九宫格相近的格宽 */
}

.media-grid--3 {
  grid-template-columns: repeat(3, 1fr);
}

.media-grid__item {
  display: block;
  border-radius: 10px;
  overflow: hidden;
}

.media-grid__item img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--dur-soft) var(--ease-bounce);
}

/* 宫格保持正方形；单图保留原始比例 */
.media-grid--2 .media-grid__item,
.media-grid--3 .media-grid__item {
  aspect-ratio: 1 / 1;
}

.media-grid--3 .media-grid__item img {
  cursor: zoom-in;
}

.moment-card__media audio {
  width: 100%;
}

.moment-card__media video {
  display: block;
  width: 100%;
  max-width: 640px;
  border-radius: 10px;
  background: var(--c-text);
}

/* ===== 底部操作：扁平灰字栏（朋友圈式，右对齐） ===== */
.moment-card__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--c-border);
}

.moment-card__like,
.moment-card__comments-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  font-size: 13px;
  color: var(--c-text-muted);
  background: none;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition:
    color var(--dur-soft) ease,
    background-color var(--dur-soft) ease,
    transform 0.15s var(--ease-bounce);
}

.moment-card__like:active:not(:disabled),
.moment-card__comments-btn:active:not(:disabled) {
  transform: scale(0.9);
}

.moment-card__like:hover:not(:disabled),
.moment-card__comments-btn:hover:not(:disabled) {
  color: var(--c-primary-hover);
  background: var(--c-primary-light);
}

.moment-card__like.is-liked {
  color: var(--c-primary-hover);
}

.moment-card__like-emoji {
  display: inline-block;
  transition: transform 0.2s var(--ease-bounce);
}

.moment-card__like.is-liked .moment-card__like-emoji {
  transform: scale(1.15);
}

.moment-card__delete {
  padding: 4px 12px;
  font-size: 13px;
  color: var(--c-text-muted);
  background: none;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: color var(--dur-soft) ease, background-color var(--dur-soft) ease;
}

.moment-card__delete:hover:not(:disabled) {
  color: var(--c-danger);
  background: rgb(220 38 38 / 8%);
}

.moment-card__delete.is-confirm {
  color: var(--c-on-primary);
  background: var(--c-danger);
}

/* ===== 内联评论区 ===== */
.moment-card__comments {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--c-border);
}

.moment-card__cstate {
  padding: 18px 0;
  font-size: 13px;
  color: var(--c-text-muted);
  text-align: center;
}

.moment-card__clist {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.moment-card__comment {
  padding: 12px 14px;
  background: var(--c-bg-soft);
  border-radius: 12px;
}

/* 楼内回复：墨线缩进，视觉权重更小 */
.moment-card__replies {
  margin: 10px 0 0 18px;
  padding: 0 0 0 12px;
  list-style: none;
  border-left: 1px solid var(--c-border);
}

.moment-card__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--c-text-muted);
}

.moment-card__pager button {
  padding: 4px 12px;
  font-size: 12.5px;
  color: var(--c-text-secondary);
  background: none;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  cursor: pointer;
  transition: color var(--dur-soft) ease, border-color var(--dur-soft) ease;
}

.moment-card__pager button:hover:not(:disabled) {
  color: var(--c-primary-hover);
  border-color: var(--c-primary);
}

.moment-card__pager button:disabled {
  opacity: 0.4;
  cursor: default;
}

@media (max-width: 560px) {
  .moment-card {
    padding: 14px;
  }

  .moment-card__foot {
    gap: 12px;
  }
}
</style>
