<template>
  <div class="rss-page">
    <header class="rss-page__header fade-up">
      <p class="rss-page__hint">
        订阅的博客会定期抓取最新文章，展示在前台「订阅」页；共 {{ rssStore.list.length }} 个源
      </p>
      <button type="button" class="btn btn--primary" @click="openCreate">＋ 新增订阅源</button>
    </header>

    <!-- 新增 / 编辑表单 -->
    <div v-if="formOpen" class="card rss-form fade-up" style="--stagger-index: 1">
      <h3>{{ editingId ? '编辑订阅源' : '新增订阅源' }}</h3>
      <div class="rss-form__row">
        <div>
          <label class="field-label" for="rss-title">站点名称</label>
          <input
            id="rss-title"
            v-model="form.title"
            class="field-input"
            type="text"
            placeholder="留空则抓取成功后自动取 feed 自带标题"
          >
        </div>
        <div>
          <label class="field-label" for="rss-site-url">站点地址 <em>*</em></label>
          <input
            id="rss-site-url"
            v-model="form.siteUrl"
            class="field-input"
            :class="{ 'is-invalid': !!errors.siteUrl }"
            type="url"
            placeholder="https://example.com"
            @input="errors.siteUrl = ''"
          >
          <p v-if="errors.siteUrl" class="field-error">{{ errors.siteUrl }}</p>
        </div>
      </div>
      <div>
        <label class="field-label" for="rss-feed-url">RSS/Atom 地址 <em>*</em></label>
        <input
          id="rss-feed-url"
          v-model="form.feedUrl"
          class="field-input"
          :class="{ 'is-invalid': !!errors.feedUrl }"
          type="url"
          placeholder="https://example.com/atom.xml"
          @input="errors.feedUrl = ''"
        >
        <p v-if="errors.feedUrl" class="field-error">{{ errors.feedUrl }}</p>
      </div>
      <div>
        <label class="field-label" for="rss-desc">备注描述</label>
        <input
          id="rss-desc"
          v-model="form.description"
          class="field-input"
          type="text"
          placeholder="选填"
        >
      </div>
      <label class="rss-form__switch">
        <input v-model="form.enabled" type="checkbox">
        启用抓取
      </label>
      <footer class="rss-form__actions">
        <button type="button" class="btn" @click="formOpen = false">取消</button>
        <button type="button" class="btn btn--primary" :disabled="saving" @click="saveForm">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </footer>
    </div>

    <!-- 订阅源列表 -->
    <div class="card rss-list fade-up" style="--stagger-index: 2">
      <div
        v-for="(feed, i) in rssStore.list"
        :key="feed.id"
        class="rss-list__row"
        :style="{ '--stagger-index': i + 2 }"
      >
        <div class="rss-list__main">
          <div class="rss-list__title">
            <strong>{{ feed.title || feed.feedUrl }}</strong>
            <span v-if="!feed.enabled" class="badge badge--draft">已停用</span>
            <span v-else-if="feed.lastError" class="rss-list__err" :title="feed.lastError">抓取异常</span>
          </div>
          <a
            class="rss-list__site"
            :href="feed.siteUrl"
            target="_blank"
            rel="noopener noreferrer"
          >{{ feed.siteUrl }}</a>
          <code class="rss-list__feed">{{ feed.feedUrl }}</code>
          <small v-if="feed.description" class="rss-list__desc">{{ feed.description }}</small>
        </div>
        <div class="rss-list__meta">
          <span>{{ feed.itemCount }} 条</span>
          <span v-if="feed.lastFetchedAt">上次抓取 {{ formatDateTime(feed.lastFetchedAt) }}</span>
          <span v-else>从未抓取</span>
          <span v-if="feed.lastError" class="rss-list__error" :title="feed.lastError">
            {{ feed.lastError }}
          </span>
        </div>
        <div class="rss-list__ops">
          <button
            type="button"
            class="btn btn--ghost"
            :disabled="refreshingId === feed.id"
            @click="refreshFeed(feed)"
          >
            {{ refreshingId === feed.id ? '刷新中…' : '刷新' }}
          </button>
          <button type="button" class="btn btn--ghost" @click="openEdit(feed)">编辑</button>
          <button type="button" class="btn btn--ghost" @click="toggleEnabled(feed)">
            {{ feed.enabled ? '停用' : '启用' }}
          </button>
          <button type="button" class="btn btn--ghost danger-text" @click="pendingDelete = feed">
            删除
          </button>
        </div>
      </div>
      <p v-if="!rssStore.list.length && !rssStore.loading" class="rss-list__empty">
        还没有订阅源，添加一个吧
      </p>
    </div>

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
import type { RssFeed, RssFeedInput } from '#shared/types'
import { apiFetch } from '~/utils/api'
import { formatDateTime } from '~/utils/format'

definePageMeta({ layout: 'admin' })

useHead({ title: 'RSS 订阅 - Forever 后台' })
useState('admin-page-title', () => 'RSS 订阅')

/** 订阅源状态与操作（原 useRssStore，仅本页使用，已内联；reactive 使模板中 ref 自动解包） */
const rssStore = reactive((() => {
  const list = ref<RssFeed[]>([])
  const loading = ref(false)

  /** 拉取订阅源列表（全量，含抓取状态），每次都取最新数据 */
  async function fetch() {
    loading.value = true
    try {
      list.value = await apiFetch<RssFeed[]>('/api/admin/rss/feeds')
    }
    finally {
      loading.value = false
    }
  }

  /** 添加订阅源（后端创建成功后立即首抓一次） */
  async function create(input: RssFeedInput): Promise<RssFeed> {
    const feed = await apiFetch<RssFeed>('/api/admin/rss/feeds', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    })
    list.value.push(feed)
    return feed
  }

  /** 全量更新订阅源（未传的字段会被后端置空） */
  async function update(id: number, input: RssFeedInput): Promise<void> {
    const feed = await apiFetch<RssFeed>(`/api/admin/rss/feeds/${id}`, {
      method: 'PUT',
      body: input as unknown as Record<string, unknown>,
    })
    const idx = list.value.findIndex(f => f.id === id)
    if (idx >= 0) list.value[idx] = feed
  }

  /** 删除订阅源（同时删除该源已抓取的全部条目） */
  async function remove(id: number): Promise<void> {
    await apiFetch<void>(`/api/admin/rss/feeds/${id}`, { method: 'DELETE' })
    list.value = list.value.filter(f => f.id !== id)
  }

  /** 手动刷新一次；失败会记录到该源的 lastError 字段 */
  async function refresh(id: number): Promise<void> {
    await apiFetch<void>(`/api/admin/rss/feeds/${id}/refresh`, { method: 'POST' })
    // 刷新可能改变条目数 / lastFetchedAt / lastError，重新拉取同步状态
    await fetch()
  }

  return { list, loading, fetch, create, update, remove, refresh }
})())

await useAsyncData('admin-rss-feeds', async () => {
  await rssStore.fetch()
}, { server: false })

const saving = ref(false)
const refreshingId = ref<number | null>(null)

function reportError(err: unknown) {
  alert(err instanceof Error ? err.message : '操作失败')
}

/* ---------- 表单 ---------- */
const formOpen = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ title: '', siteUrl: '', feedUrl: '', description: '', enabled: true })
const errors = reactive({ siteUrl: '', feedUrl: '' })

function openCreate() {
  editingId.value = null
  Object.assign(form, { title: '', siteUrl: '', feedUrl: '', description: '', enabled: true })
  errors.siteUrl = ''
  errors.feedUrl = ''
  formOpen.value = true
}

function openEdit(feed: RssFeed) {
  editingId.value = feed.id
  Object.assign(form, {
    title: feed.title,
    siteUrl: feed.siteUrl,
    feedUrl: feed.feedUrl,
    description: feed.description,
    enabled: feed.enabled,
  })
  errors.siteUrl = ''
  errors.feedUrl = ''
  formOpen.value = true
}

async function saveForm() {
  const siteUrl = form.siteUrl.trim()
  const feedUrl = form.feedUrl.trim()
  if (!siteUrl) errors.siteUrl = '站点地址不能为空'
  if (!feedUrl) errors.feedUrl = '订阅地址不能为空'
  if (errors.siteUrl || errors.feedUrl) return

  saving.value = true
  try {
    const input = {
      title: form.title.trim() || undefined,
      siteUrl,
      feedUrl,
      description: form.description.trim() || undefined,
      enabled: form.enabled,
    }
    if (editingId.value !== null) {
      await rssStore.update(editingId.value, input)
    } else {
      await rssStore.create(input)
    }
    formOpen.value = false
  } catch (err) {
    reportError(err)
  } finally {
    saving.value = false
  }
}

/* ---------- 刷新 / 启停 ---------- */
async function refreshFeed(feed: RssFeed) {
  refreshingId.value = feed.id
  try {
    await rssStore.refresh(feed.id)
  } catch (err) {
    reportError(err)
  } finally {
    refreshingId.value = null
  }
}

async function toggleEnabled(feed: RssFeed) {
  try {
    // 后端为全量更新：必须带上全部现有字段，否则未传字段会被置空
    await rssStore.update(feed.id, {
      title: feed.title || undefined,
      siteUrl: feed.siteUrl,
      feedUrl: feed.feedUrl,
      description: feed.description || undefined,
      enabled: !feed.enabled,
    })
  } catch (err) {
    reportError(err)
  }
}

/* ---------- 删除确认 ---------- */
const pendingDelete = ref<RssFeed | null>(null)

const deleteMessage = computed(() => {
  if (!pendingDelete.value) return ''
  const name = pendingDelete.value.title || pendingDelete.value.feedUrl
  return `确定删除订阅源「${name}」吗？该源已抓取的 ${pendingDelete.value.itemCount} 条文章将一并删除。`
})

async function confirmRemove() {
  if (!pendingDelete.value) return
  try {
    await rssStore.remove(pendingDelete.value.id)
  } catch (err) {
    reportError(err)
  } finally {
    pendingDelete.value = null
  }
}
</script>

<style scoped>
.rss-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.rss-page__hint {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-muted);
}

.rss-form {
  margin-bottom: 16px;
  padding: 20px;

  h3 {
    margin: 0 0 14px;
    font-size: 15px;
  }

  > div {
    margin-bottom: 14px;
  }
}

.rss-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  > div {
    margin-bottom: 14px;
  }
}

.field-input.is-invalid {
  border-color: var(--c-danger);
}

.rss-form__switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    accent-color: var(--c-primary);
  }
}

.rss-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;

  .btn {
    min-width: 76px;
    padding-block: 7px;
  }
}

.rss-list {
  padding: 6px 20px;
}

.rss-list__row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 0;
  animation: fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 60ms);

  & + & {
    border-top: 1px solid var(--c-border);
  }
}

.rss-list__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rss-list__title {
  display: flex;
  align-items: center;
  gap: 8px;

  strong {
    font-size: 14px;
  }
}

.badge--draft {
  padding: 1px 8px;
  font-size: 11px;
  color: #b45309;
  background: #fef3c7;
  border-radius: 6px;

  .dark & {
    color: #fcd34d;
    background: rgb(252 211 77 / 12%);
  }
}

.rss-list__err {
  padding: 1px 8px;
  font-size: 11px;
  color: var(--c-danger);
  background: rgb(239 68 68 / 10%);
  border-radius: 6px;
}

.rss-list__site {
  overflow: hidden;
  max-width: 100%;
  font-size: 12px;
  color: var(--c-primary);
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}

.rss-list__feed {
  overflow: hidden;
  max-width: 100%;
  padding: 1px 8px;
  font-size: 12px;
  color: var(--c-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--c-bg-soft);
  border-radius: 6px;
}

.rss-list__desc {
  font-size: 12px;
  color: var(--c-text-muted);
}

.rss-list__meta {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--c-text-muted);
  text-align: right;
}

.rss-list__error {
  max-width: 220px;
  overflow: hidden;
  color: var(--c-danger);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rss-list__ops {
  display: flex;
  flex-shrink: 0;
  gap: 2px;

  .btn {
    padding: 5px 10px;
    font-size: 13px;
  }
}

.danger-text {
  color: var(--c-danger);
}

.rss-list__empty {
  width: 100%;
  padding: 24px 0;
  font-size: 13px;
  color: var(--c-text-muted);
  text-align: center;
}

@media (max-width: 900px) {
  .rss-list__row {
    flex-wrap: wrap;
  }

  .rss-list__meta {
    flex-direction: row;
    width: 100%;
    gap: 12px;
    text-align: left;
  }
}

@media (max-width: 640px) {
  .rss-form__row {
    grid-template-columns: 1fr;
  }
}
</style>
