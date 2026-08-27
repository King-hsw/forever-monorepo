<template>
  <div class="logs-admin">
    <header class="logs-admin__header fade-up">
      <p class="logs-admin__hint">记录后台所有接口的访问情况，按时间倒序；共 {{ total }} 条</p>
    </header>

    <!-- 筛选栏 -->
    <form class="card logs-filter fade-up" style="--stagger-index: 1" @submit.prevent="doSearch">
      <label class="logs-filter__field">
        <span class="logs-filter__label">操作人</span>
        <input v-model.trim="filterUsername" type="text" class="field-input" placeholder="精确匹配，如 admin"
               @keydown.enter.prevent="doSearch">
      </label>
      <label class="logs-filter__field logs-filter__field--grow">
        <span class="logs-filter__label">路径关键词</span>
        <input v-model.trim="filterPath" type="text" class="field-input" placeholder="模糊匹配，如 /api/admin"
               @keydown.enter.prevent="doSearch">
      </label>
      <div class="logs-filter__ops">
        <button type="submit" class="btn btn--primary" :disabled="loading">查询</button>
        <button type="button" class="btn" :disabled="loading" @click="doReset">重置</button>
      </div>
    </form>

    <!-- 列表 -->
    <div class="card logs-table fade-up" style="--stagger-index: 2">
      <template v-if="list.length">
        <div class="logs-table__head logs-table__row">
          <span>时间</span>
          <span>操作人</span>
          <span>方法</span>
          <span class="cell-path-head">路径</span>
          <span>状态</span>
          <span>IP</span>
          <span class="num">耗时</span>
        </div>

        <div
          v-for="(item, i) in list"
          :key="item.id"
          class="logs-table__row logs-table__body-row"
          :style="{ '--stagger-index': i }"
        >
          <span class="cell-time">{{ formatDateTime(item.createdAt) }}</span>
          <span class="cell-user">{{ item.username || '（匿名）' }}</span>
          <span><span class="badge method-badge" :class="methodBadgeClass(item.method)">{{ item.method }}</span></span>
          <span class="cell-path" :title="item.path">{{ item.path }}</span>
          <span><span class="badge status-badge" :class="statusBadgeClass(item.status)">{{ item.status }}</span></span>
          <span class="cell-ip">{{ item.ip }}</span>
          <span class="num">{{ formatDuration(item.durationMs) }}</span>
        </div>
      </template>

      <p v-else-if="!loading" class="logs-table__empty">暂无日志记录</p>
      <p v-else class="logs-table__empty">加载中…</p>
    </div>

    <!-- 分页 -->
    <nav v-if="totalPages > 1" class="pager fade-up" style="--stagger-index: 3" aria-label="日志分页">
      <button type="button" class="btn" :disabled="page <= 1 || loading" @click="go(page - 1)">← 上一页</button>
      <span class="pager__info">{{ page }} / {{ totalPages }} · 共 {{ total }} 条</span>
      <button type="button" class="btn" :disabled="page >= totalPages || loading" @click="go(page + 1)">下一页 →</button>
      <select class="field-input pager__size" :value="size" aria-label="每页条数"
              @change="changeSize(Number(($event.target as HTMLSelectElement).value))">
        <option :value="20">20 条/页</option>
        <option :value="50">50 条/页</option>
        <option :value="100">100 条/页</option>
      </select>
    </nav>
  </div>
</template>

<script setup lang="ts">
import type { ActionLog, ActionLogQuery, PageResult } from '#shared/types'
import { apiFetch, cleanQuery } from '~/utils/api'
import { formatDateTime } from '~/utils/format'

definePageMeta({ layout: 'admin', permission: 'log:list' })

useHead({ title: '日志审计 - 补陋阁 后台' })
useState('admin-page-title', () => '日志审计')

/** 日志状态与查询（原 useLogsStore，仅本页使用，已内联；reactive 使模板中 ref 自动解包） */
const logsStore = reactive((() => {
  const list = ref<ActionLog[]>([])
  const total = ref(0)
  const loading = ref(false)

  /** 分页查询审计日志（按时间倒序），每次都取最新数据 */
  async function fetch(query: ActionLogQuery = {}): Promise<PageResult<ActionLog>> {
    loading.value = true
    try {
      return await apiFetch<PageResult<ActionLog>>('/api/admin/logs', {
        query: cleanQuery({
          page: query.page ?? 1,
          size: query.size ?? 20,
          username: query.username,
          path: query.path,
        }),
      })
    }
    finally {
      loading.value = false
    }
  }

  return { list, total, loading, fetch }
})())

const list = computed(() => logsStore.list)
const total = computed(() => logsStore.total)
const page = ref(1)
const size = ref(20)
const loading = computed(() => logsStore.loading)

/** 筛选输入（与已提交的查询条件分离，避免边输边查） */
const filterUsername = ref('')
const filterPath = ref('')

/** 当前生效的查询条件 */
const appliedQuery = ref<ActionLogQuery>({})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))

async function load(targetPage = 1) {
  const query: ActionLogQuery = {
    ...appliedQuery.value,
    page: targetPage,
    size: size.value,
  }
  try {
    const data = await logsStore.fetch(query)
    page.value = data.page
  }
  catch (err) {
    alert(err instanceof Error ? err.message : '加载失败')
  }
}

/** 提交筛选：回到第一页 */
function doSearch() {
  appliedQuery.value = {
    username: filterUsername.value || undefined,
    path: filterPath.value || undefined,
  }
  load(1)
}

function doReset() {
  filterUsername.value = ''
  filterPath.value = ''
  appliedQuery.value = {}
  load(1)
}

function go(p: number) {
  load(p)
}

function changeSize(s: number) {
  if (s === size.value) return
  size.value = s
  load(1)
}

/* ---------- 展示辅助 ---------- */

function methodBadgeClass(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'method-badge--get'
    case 'POST': return 'method-badge--post'
    case 'PUT': return 'method-badge--put'
    case 'DELETE': return 'method-badge--delete'
    default: return 'method-badge--get'
  }
}

function statusBadgeClass(status: number): string {
  if (status >= 500) return 'status-badge--error'
  if (status >= 400) return 'status-badge--warn'
  return 'status-badge--ok'
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`
}

// 仅客户端拉取：登录令牌存在 localStorage，SSR 阶段拿不到
await useAsyncData('admin-logs', async () => {
  await load(1)
}, { server: false })
</script>

<style scoped>
.logs-admin__header {
  margin-bottom: 18px;
}

.logs-admin__hint {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-muted);
}

/* ===== 筛选栏 ===== */
.logs-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  padding: 14px 20px;
  margin-bottom: 18px;
}

.logs-filter__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;

  &.logs-filter__field--grow {
    flex: 1;
    min-width: 220px;
  }
}

.logs-filter__label {
  font-size: 12.5px;
  color: var(--c-text-secondary);
}

.logs-filter__ops {
  display: flex;
  gap: 8px;

  .btn {
    padding: 8px 18px;
  }
}

/* ===== 表格 ===== */
.logs-table {
  overflow-x: auto;
  padding: 4px 0;
}

.logs-table__row {
  display: grid;
  grid-template-columns: 150px minmax(90px, 0.9fr) 72px minmax(200px, 2.2fr) 68px minmax(110px, 1fr) 80px;
  gap: 12px;
  align-items: center;
  padding: 11px 20px;
  font-size: 13px;
}

.logs-table__head {
  color: var(--c-text-muted);
  border-bottom: 1px solid var(--c-border);
}

.logs-table__body-row {
  animation: fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 40ms);
  transition: background-color 0.15s;

  & + & {
    border-top: 1px solid var(--c-border);
  }

  &:hover {
    background: var(--c-bg-soft);
  }
}

.cell-time {
  color: var(--c-text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cell-user {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-path {
  overflow: hidden;
  color: var(--c-text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-ip,
.num {
  font-variant-numeric: tabular-nums;
}

/* ===== 徽标 ===== */
.method-badge {
  min-width: 52px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}

.method-badge--get {
  color: #0d9488;
  background: rgb(13 148 136 / 12%);
}

.method-badge--post {
  color: #059669;
  background: rgb(5 150 105 / 12%);
}

.method-badge--put {
  color: #d97706;
  background: rgb(245 158 11 / 15%);
}

.method-badge--delete {
  color: var(--c-danger);
  background: rgb(239 68 68 / 12%);
}

.status-badge {
  font-variant-numeric: tabular-nums;
}

.status-badge--ok {
  color: var(--c-success);
  background: rgb(16 185 129 / 12%);
}

.status-badge--warn {
  color: #d97706;
  background: rgb(245 158 11 / 15%);
}

.status-badge--error {
  color: var(--c-danger);
  background: rgb(239 68 68 / 12%);
}

/* ===== 空态 ===== */
.logs-table__empty {
  width: 100%;
  padding: 48px 24px;
  font-size: 13px;
  color: var(--c-text-muted);
  text-align: center;
}

/* ===== 分页 ===== */
.pager {
  display: flex;
  flex-wrap: wrap;
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

.pager__size {
  width: auto;
  padding: 6px 10px;
  font-size: 13px;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .logs-table__row {
    grid-template-columns: 130px minmax(80px, 0.9fr) 64px minmax(160px, 2fr) 60px minmax(100px, 1fr) 70px;
    gap: 8px;
    padding: 10px 14px;
    font-size: 12px;
  }

  .cell-path {
    font-size: 11.5px;
  }
}

@media (max-width: 720px) {
  .logs-table__row {
    /* 窄屏隐藏 IP 列 */
    grid-template-columns: 118px minmax(70px, 1fr) 58px minmax(140px, 2fr) 56px 64px;
  }

  .logs-table__head span:nth-child(6),
  .logs-table__body-row span:nth-child(6) {
    display: none;
  }

  .cell-time {
    white-space: normal;
  }

  .logs-filter {
    flex-direction: column;
    align-items: stretch;

    .logs-filter__field {
      min-width: 0;
    }

    .logs-filter__ops {
      justify-content: flex-end;
    }
  }
}
</style>
