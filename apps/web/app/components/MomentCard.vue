<template>
  <article class="moment-card">
    <!-- 头像压在线条上（点击按人筛选） -->
    <button type="button" class="moment-card__avatar-btn" :title="`只看 ${moment.username} 的动态`" @click="goUser">
      <!-- 加载失败时由 SafeImage 渲染占位：带 --initial 类复用首字样式，与无头像时一致 -->
      <SafeImage
        v-if="moment.avatarUrl"
        class="moment-card__avatar moment-card__avatar--initial"
        :src="moment.avatarUrl"
        :alt="moment.username"
        :fallback-text="initialOf(moment.username)"
        variant="avatar"
        width="40"
        height="40"
      />
      <span v-else class="moment-card__avatar moment-card__avatar--initial" aria-hidden="true">
        {{ initialOf(moment.username) }}
      </span>
    </button>

    <!-- 头部：用户名（点击按人筛选）+ 地点 + 相对时间 -->
    <header class="moment-card__head">
      <div class="moment-card__info">
        <button type="button" class="moment-card__name" :title="`只看 ${moment.username} 的动态`" @click="goUser">
          {{ moment.username }}
        </button>
        <span v-if="locationText || locationHref" class="moment-card__loc">
          <Icon name="lucide:map-pin" />
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

    <!-- 媒体：图片宫格（点击页面内浮层预览）/ 音频 / 视频 -->
    <div v-if="hasMedia" class="moment-card__media">
      <div v-if="images.length" class="media-grid" :class="gridClass">
        <button
          v-for="(url, i) in images"
          :key="url"
          type="button"
          class="media-grid__item"
          :aria-label="`预览第 ${i + 1} 张图片`"
          @click="openPreview(i, $event)"
        >
          <!-- 图片加载失败时 SafeImage 渲染裂图占位，点击不再进预览（openPreview 里判断） -->
          <SafeImage :src="url" variant="image" />
        </button>
      </div>
      <audio v-if="moment.media.audio" controls :src="moment.media.audio" />
      <video v-if="moment.media.video" controls :src="moment.media.video" />
    </div>

    <!-- 底部：评论 / 删除 -->
    <footer class="moment-card__foot">
      <button
        type="button"
        class="moment-card__comments-btn"
        :aria-expanded="showForm"
        @click="toggleForm"
      >
        <Icon name="lucide:message-circle" /> {{ moment.commentCount }} 条
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

    <!-- 内联评论区：两层楼，与文章 / 留言板同一组件族；评论内容常显，输入框点按钮才出现；无评论且未展开输入时整区隐藏 -->
    <section v-if="loadingComments || roots.length || showForm" class="moment-card__comments" aria-label="动态评论">
      <CommentForm
        v-if="showForm"
        target-type="MOMENT"
        :target-id="moment.id"
        :reply-to="replyTo"
        :use-login-identity="true"
        @success="onCommentCreated"
        @cancel-reply="replyTo = null"
      />

      <div v-if="loadingComments" class="moment-card__cstate">加载中…</div>
      <template v-else>
        <ul class="moment-card__clist">
          <li v-for="root in roots" :key="root.id" class="moment-card__comment">
            <CommentItem :comment="root" @reply="onReply" />
            <ul v-if="root.replies?.length" class="moment-card__replies" role="list">
              <li v-for="reply in root.replies" :key="reply.id">
                <CommentItem :comment="reply" is-reply @reply="onReply" />
              </li>
            </ul>
          </li>
        </ul>
        <nav v-if="totalPages > 1" class="moment-card__pager" aria-label="评论分页">
          <button type="button" :disabled="commentPage <= 1" @click="load(commentPage - 1)"><Icon name="lucide:chevron-left" /> 上一页</button>
          <span>{{ commentPage }} / {{ totalPages }}</span>
          <button type="button" :disabled="commentPage >= totalPages" @click="load(commentPage + 1)">下一页 <Icon name="lucide:chevron-right" /></button>
        </nav>
      </template>
    </section>
  </article>
</template>

<script setup lang="ts">
import type { AdminComment, CommentNode, Moment } from '#shared/types'
import { useMomentsStore } from '~/stores/moments'
import { openPhotoPreview } from '~/composables/usePhotoPreview'
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
/** 1 图大图 / 多图三列宫格（朋友圈式小图，任何张数都一行三张） */
const gridClass = computed(() =>
  images.value.length === 1 ? 'media-grid--1' : 'media-grid--3',
)

/** 图片预览：页面内浮层，同条动态多张可左右滑（Photoswipe 自带移动端手势） */
function openPreview(index: number, event: MouseEvent) {
  // 图片加载失败后宫格里是占位元素（无 img），不进预览
  const thumb = (event.currentTarget as HTMLElement).querySelector('img')
  if (!thumb) return
  // 宫格缩略均为 cover 裁切，开场动画按裁切还原
  void openPhotoPreview(images.value, index, thumb, true)
}

/** 头像 / 用户名点击：只看该用户的动态（?user= 过滤，可直接分享） */
function goUser() {
  if (Number(route.query.user) !== props.moment.uid)
    router.push({ query: { ...route.query, user: String(props.moment.uid) } })
}

/* ---------- 内联评论区：评论内容常显（挂载即拉取）；输入框由 💬 按钮显隐 ---------- */
const showForm = ref(false)
const roots = ref<CommentNode[]>([])
const commentTotal = ref<number | null>(null)
const commentPage = ref(1)
const loadingComments = ref(true)
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

function toggleForm() {
  showForm.value = !showForm.value
}

/** 点回复：先展开输入框，否则「回复 @xx」提示无处可去 */
function onReply(node: CommentNode) {
  replyTo.value = node
  showForm.value = true
}

onMounted(() => {
  void load(1)
})

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
/* 扁平时间线：无卡片底（无背景 / 边框 / 阴影），头像压在竖线上 */
.moment-card {
  position: relative;
  padding: 2px 0 44px;
}

/* 内容整体右移，让出头像栏 */
.moment-card__head,
.moment-card__content,
.moment-card__media,
.moment-card__foot,
.moment-card__comments {
  padding-left: 56px;
}

/* ===== 头部 ===== */
.moment-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  min-height: 44px;
}

/* 头像压在线上：纸底圆遮罩遮住线段，留白自然断开 */
.moment-card__avatar-btn {
  position: absolute;
  left: 0;
  top: 2px;
  z-index: 1;
  padding: 2px;
  background: var(--c-bg);
  border: none;
  border-radius: 50%;
  cursor: pointer;
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

.media-grid--3 {
  grid-template-columns: repeat(3, 1fr);
}

.media-grid__item {
  display: block;
  padding: 0;
  border: none;
  background: none;
  border-radius: 10px;
  overflow: hidden;
  cursor: zoom-in;
}

.media-grid__item img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--dur-soft) var(--ease-bounce);
}

/* 宫格保持正方形；单图保留原始比例 */
.media-grid--3 .media-grid__item {
  aspect-ratio: 1 / 1;
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

.moment-card__comments-btn:active:not(:disabled) {
  transform: scale(0.9);
}

.moment-card__comments-btn:hover:not(:disabled) {
  color: var(--c-primary-hover);
  background: var(--c-primary-light);
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
    padding-bottom: 32px;
  }

  .moment-card__foot {
    gap: 12px;
  }
}
</style>
