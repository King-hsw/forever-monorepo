import { defineStore } from 'pinia'
import type { RssFeed, RssFeedInput } from './types'
import { apiFetch } from '~/utils/api'

export const useRssStore = defineStore('admin-rss', () => {
  const list = ref<RssFeed[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  /** 拉取订阅源列表（全量，含抓取状态） */
  async function fetch(force = false) {
    if (loading.value || (loaded.value && !force)) return
    loading.value = true
    try {
      list.value = await apiFetch<RssFeed[]>('/api/admin/rss/feeds')
      loaded.value = true
    } finally {
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
    await fetch(true)
  }

  return { list, loaded, loading, fetch, create, update, remove, refresh }
})
