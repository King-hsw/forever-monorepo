import { defineStore } from 'pinia'
import type { FriendLink, FriendLinkApplyInput, FriendLinkUpdateInput } from './types'
import { apiFetch } from '~/utils/api'

export const useFriendsStore = defineStore('admin-friends', () => {
  const list = ref<FriendLink[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  /** 拉取友链全量列表（含待审核与已驳回） */
  async function fetch(force = false) {
    if (loading.value || (loaded.value && !force)) return
    loading.value = true
    try {
      list.value = await apiFetch<FriendLink[]>('/api/admin/friend-links')
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /** 新增友链（管理端直接创建，状态为 APPROVED），成功后插入列表开头 */
  async function create(input: FriendLinkApplyInput): Promise<void> {
    const link = await apiFetch<FriendLink>('/api/admin/friend-links', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    })
    list.value = [link, ...list.value]
  }

  /** 全量更新友链（未传的字段会被后端置空） */
  async function update(id: number, input: FriendLinkUpdateInput): Promise<void> {
    const link = await apiFetch<FriendLink>(`/api/admin/friend-links/${id}`, {
      method: 'PUT',
      body: input as unknown as Record<string, unknown>,
    })
    replace(link)
  }

  /** 通过审核 */
  async function approve(id: number): Promise<void> {
    const link = await apiFetch<FriendLink>(`/api/admin/friend-links/${id}/approve`, { method: 'POST' })
    replace(link)
  }

  /** 驳回申请，可附带原因 */
  async function reject(id: number, reason?: string): Promise<void> {
    const link = await apiFetch<FriendLink>(`/api/admin/friend-links/${id}/reject`, {
      method: 'POST',
      query: reason ? { reason } : undefined,
    })
    replace(link)
  }

  /** 删除友链 */
  async function remove(id: number): Promise<void> {
    await apiFetch<void>(`/api/admin/friend-links/${id}`, { method: 'DELETE' })
    list.value = list.value.filter(f => f.id !== id)
  }

  function replace(link: FriendLink) {
    const idx = list.value.findIndex(f => f.id === link.id)
    if (idx >= 0) list.value[idx] = link
  }

  return { list, loaded, loading, fetch, create, update, approve, reject, remove }
})
