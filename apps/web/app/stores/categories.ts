import { defineStore } from 'pinia'
import type { Category, CategoryInput } from '#shared/types'
import { apiFetch } from '~/utils/api'

export const useCategoriesStore = defineStore('admin-categories', () => {
  const list = ref<Category[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  /** 拉取分类列表（管理端接口，含全部分类） */
  async function fetch(force = false) {
    if (loading.value || (loaded.value && !force)) return
    loading.value = true
    try {
      list.value = await apiFetch<Category[]>('/api/admin/categories')
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function create(input: CategoryInput): Promise<Category> {
    const cat = await apiFetch<Category>('/api/admin/categories', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    })
    list.value.push(cat)
    return cat
  }

  async function update(id: number, input: CategoryInput): Promise<void> {
    const cat = await apiFetch<Category>(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: input as unknown as Record<string, unknown>,
    })
    const idx = list.value.findIndex(c => c.id === id)
    if (idx >= 0) list.value[idx] = cat
  }

  async function remove(id: number): Promise<void> {
    await apiFetch<void>(`/api/admin/categories/${id}`, { method: 'DELETE' })
    list.value = list.value.filter(c => c.id !== id)
  }

  return { list, loaded, loading, fetch, create, update, remove }
})
