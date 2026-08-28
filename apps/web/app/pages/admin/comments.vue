<template>
  <div class="comments-admin">
    <header class="comments-admin__header fade-up">
      <p class="comments-admin__hint">
        访客在文章与留言板发表的留言都会出现在这里，审核通过后前台可见；共 {{ total }} 条
      </p>

      <!-- 状态 / 类型筛选 -->
      <nav class="comments-admin__tabs" aria-label="按状态筛选">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          type="button"
          class="comments-admin__tab"
          :class="{ 'is-active': status === tab.value }"
          @click="switchStatus(tab.value)"
        >
          {{ tab.label }}
        </button>
      </nav>
      <nav class="comments-admin__tabs" aria-label="按类型筛选">
        <button
          v-for="tab in typeTabs"
          :key="tab.value"
          type="button"
          class="comments-admin__tab"
          :class="{ 'is-active': targetType === tab.value }"
          @click="switchType(tab.value)"
        >
          {{ tab.label }}
        </button>
      </nav>
    </header>

    <!-- 列表 -->
    <div class="card comments-list fade-up" style="--stagger-index: 1">
      <div v-for="(item, i) in list" :key="item.id" class="comments-list__row"
           :style="{ '--stagger-index': i + 2 }">
        <div class="comments-list__main">
          <div class="comments-list__title">
            <strong>{{ item.nickname }}</strong>
            <span class="badge" :class="statusBadgeClass(item.status)">{{ statusLabel(item.status) }}</span>
            <a v-if="item.site" :href="item.site" target="_blank" rel="noopener noreferrer"
               class="comments-list__site">{{ hostOf(item.site) }}</a>
            <span class="comments-list__article">{{ targetLabel(item) }}</span>
          </div>
          <p class="comments-list__content">{{ item.content }}</p>
          <small class="comments-list__meta">
            {{ item.email }}<template v-if="item.ip"> · IP {{ item.ip }}</template> · {{ formatDateTime(item.createdAt) }}
            <template v-if="item.parentId"> · 回复 #{{ item.parentId }}</template>
          </small>
        </div>

        <div class="comments-list__ops">
          <button v-if="item.status !== 'APPROVED'" type="button" class="btn btn--ghost"
                  :disabled="actingId === item.id" @click="doApprove(item)">通过</button>
          <button v-if="item.status !== 'REJECTED'" type="button" class="btn btn--ghost"
                  :disabled="actingId === item.id" @click="doReject(item)">驳回</button>
          <button type="button" class="btn btn--ghost danger-text" @click="pendingDelete = item">删除</button>
        </div>
      </div>

      <p v-if="!list.length && !loading" class="comments-list__empty">暂无{{ activeTabLabel }}评论</p>
    </div>

    <!-- 分页 -->
    <nav v-if="totalPages > 1" class="pager fade-up" style="--stagger-index: 2" aria-label="评论分页">
      <button type="button" class="btn" :disabled="page <= 1 || loading" @click="go(page - 1)"><Icon name="lucide:chevron-left" /> 上一页</button>
      <span class="pager__info">{{ page }} / {{ totalPages }} · 共 {{ total }} 条</span>
      <button type="button" class="btn" :disabled="page >= totalPages || loading" @click="go(page + 1)">下一页 <Icon name="lucide:chevron-right" /></button>
    </nav>

    <AdminConfirmDialog
      :open="!!pendingDelete"
      title="确认删除"
      :message="deleteMessage"
      confirm-text="删除"
      @confirm="confirmRemove"
      @cancel="pendingDelete = null"
    />
  </div>
</template>

<script setup lang="ts">
import type { AdminComment, CommentStatus, CommentTarget } from '#shared/types'
import { useCommentsStore } from '~/stores/comments'
import { formatDateTime } from '~/utils/format'

definePageMeta({ layout: 'admin', permission: 'comment:list' })

useHead({ title: '评论管理 - 补陋阁 后台' })
useState('admin-page-title', () => '评论管理')

const commentsStore = useCommentsStore()

const statusTabs: { label: string, value: CommentStatus | '' }[] = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
]

const typeTabs: { label: string, value: CommentTarget | '' }[] = [
  { label: '全部', value: '' },
  { label: '文章', value: 'ARTICLE' },
  { label: '留言板', value: 'BOARD' },
  { label: '动态', value: 'MOMENT' },
]

const list = ref<AdminComment[]>([])
const total = ref(0)
const page = ref(1)
const size = 20
const loading = ref(false)

/** 当前筛选（'' 表示全部） */
const status = ref<CommentStatus | ''>('')
/** 当前类型筛选；null 表示全部 */
const targetType = ref<CommentTarget | null>(null)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size)))
const activeTabLabel = computed(() =>
  status.value ? statusTabs.find(t => t.value === status.value)?.label ?? '' : '',
)

async function load(targetPage = page.value) {
  loading.value = true
  try {
    const data = await commentsStore.fetchAdmin(status.value || undefined, targetPage, size, targetType.value ?? undefined)
    list.value = data.list
    total.value = data.total
    page.value = data.page
  }
  catch (err) {
    alert(err instanceof Error ? err.message : '加载失败')
  }
  finally {
    loading.value = false
  }
}

function switchStatus(value: CommentStatus | '') {
  if (status.value === value) return
  status.value = value
  load(1)
}

function switchType(value: CommentTarget | '') {
  const next = value || null
  if (targetType.value === next) return
  targetType.value = next
  load(1)
}

function targetLabel(item: AdminComment): string {
  if (item.targetType === 'BOARD') return '留言板留言'
  if (item.targetType === 'MOMENT') return '动态评论'
  return `回复了「${item.targetTitle ?? ''}」`
}

function go(p: number) {
  load(p)
}

/* ---------- 审核操作 ---------- */
const actingId = ref<number | null>(null)

function reportError(err: unknown) {
  alert(err instanceof Error ? err.message : '操作失败')
}

async function doApprove(item: AdminComment) {
  actingId.value = item.id
  try {
    await commentsStore.approve(item.id)
    item.status = 'APPROVED'
  }
  catch (err) {
    reportError(err)
  }
  finally {
    actingId.value = null
  }
}

async function doReject(item: AdminComment) {
  actingId.value = item.id
  try {
    await commentsStore.reject(item.id)
    item.status = 'REJECTED'
  }
  catch (err) {
    reportError(err)
  }
  finally {
    actingId.value = null
  }
}

/* ---------- 删除 ---------- */
const pendingDelete = ref<AdminComment | null>(null)

const deleteMessage = computed(() =>
  pendingDelete.value
    ? `确定删除「${pendingDelete.value.nickname}」的这条评论吗？该楼中的所有回复也会一并删除，不可恢复。`
    : '',
)

async function confirmRemove() {
  if (!pendingDelete.value) return
  try {
    await commentsStore.remove(pendingDelete.value.id)
    await load(page.value)
  }
  catch (err) {
    reportError(err)
  }
  finally {
    pendingDelete.value = null
  }
}

function statusLabel(status: CommentStatus): string {
  return status === 'APPROVED' ? '已通过' : status === 'PENDING' ? '待审核' : '已驳回'
}

function statusBadgeClass(status: CommentStatus): string {
  return status === 'APPROVED' ? 'badge--published' : status === 'PENDING' ? 'badge--draft' : 'badge--rejected'
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  }
  catch {
    return url
  }
}

// 仅客户端拉取：登录令牌存在 localStorage，SSR 阶段拿不到
await useAsyncData('admin-comments', async () => {
  await load(1)
}, { server: false })
</script>

<style scoped>
.comments-admin__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.comments-admin__hint {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-muted);
}

/* ===== 状态筛选 ===== */
.comments-admin__tabs {
  display: inline-flex;
  padding: 3px;
  background: var(--c-bg-soft);
  border-radius: 10px;
}

.comments-admin__tab {
  padding: 6px 14px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s var(--ease-bounce);

  &:hover {
    color: var(--c-primary);
  }

  &.is-active {
    font-weight: 600;
    color: var(--c-on-primary);
    background: var(--c-primary);
    box-shadow: 0 1px 4px rgb(13 148 136 / 35%);
  }
}

/* ===== 列表 ===== */
.comments-list {
  padding: 6px 20px;
}

.comments-list__row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 15px 0;
  animation: fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 50ms);

  & + & {
    border-top: 1px solid var(--c-border);
  }
}

.comments-list__main {
  flex: 1;
  min-width: 0;
}

.comments-list__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  strong {
    font-size: 14px;
  }
}

.badge--rejected {
  color: var(--c-danger);
  background: rgb(239 68 68 / 10%);
}

.comments-list__site {
  font-size: 12px;
  color: var(--c-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.comments-list__article {
  overflow: hidden;
  max-width: 260px;
  font-size: 12px;
  color: var(--c-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comments-list__content {
  margin: 7px 0 6px;
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--c-text-secondary);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.comments-list__meta {
  font-size: 11.5px;
  color: var(--c-text-muted);
}

.comments-list__ops {
  display: flex;
  flex-shrink: 0;
  gap: 4px;

  .btn {
    padding: 5px 10px;
    font-size: 13px;
  }
}

.danger-text {
  color: var(--c-danger);
}

.comments-list__empty {
  width: 100%;
  padding: 28px 0;
  font-size: 13px;
  color: var(--c-text-muted);
  text-align: center;
}

/* ===== 分页 ===== */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 18px;
}

.pager__info {
  font-size: 13px;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 720px) {
  .comments-list__row {
    flex-direction: column;
    gap: 8px;
  }

  .comments-list__ops {
    align-self: flex-end;
  }
}
</style>
