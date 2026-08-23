import { defineStore } from 'pinia'
import type { Tag, TagInput } from '#shared/types'
import { apiFetch } from '~/utils/api'

export const useTagsStore = defineStore('admin-tags', () => {
  const list = ref<Tag[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  /** 拉取标签列表（管理端接口，含全部标签） */
  async function fetch(force = false) {
    if (loading.value || (loaded.value && !force)) return
    loading.value = true
    try {
      list.value = await apiFetch<Tag[]>('/api/admin/tags')
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function create(name: string): Promise<Tag> {
    const tag = await apiFetch<Tag>('/api/admin/tags', {
      method: 'POST',
      body: { name } as unknown as Record<string, unknown>,
    })
    list.value.push(tag)
    return tag
  }

  async function update(id: number, name: string): Promise<void> {
    const tag = await apiFetch<Tag>(`/api/admin/tags/${id}`, {
      method: 'PUT',
      body: { name } as unknown as Record<string, unknown>,
    })
    const idx = list.value.findIndex(t => t.id === id)
    if (idx >= 0) list.value[idx] = tag
  }

  async function remove(id: number): Promise<void> {
    await apiFetch<void>(`/api/admin/tags/${id}`, { method: 'DELETE' })
    list.value = list.value.filter(t => t.id !== id)
  }

  return { list, loaded, loading, fetch, create, update, remove }
})
