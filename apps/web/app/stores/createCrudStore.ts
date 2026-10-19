import { defineStore } from 'pinia'
import { apiFetch } from '~/utils/api'

interface CrudItem {
  id: number
}

/**
 * 列表型 CRUD store 工厂：tags / categories 等管理端资源共用
 * fetch（带缓存）/ create / update / remove 同一套逻辑。
 */
export function createCrudStore<T extends CrudItem, I>(storeName: string, endpoint: string) {
  return defineStore(storeName, () => {
    // shallowRef：列表整体替换式更新，同时避开泛型数组与 Vue 深层 unwrap 的类型冲突
    const list = shallowRef<T[]>([])
    const loaded = ref(false)
    const loading = ref(false)

    /** 拉取列表（首次后缓存，force 强制刷新） */
    async function fetch(force = false) {
      if (loading.value || (loaded.value && !force)) return
      loading.value = true
      try {
        list.value = await apiFetch<T[]>(endpoint)
        loaded.value = true
      } finally {
        loading.value = false
      }
    }

    async function create(input: I): Promise<T> {
      const item = await apiFetch<T>(endpoint, {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      })
      list.value = [...list.value, item]
      return item
    }

    async function update(id: number, input: I): Promise<void> {
      const item = await apiFetch<T>(`${endpoint}/${id}`, {
        method: 'PUT',
        body: input as unknown as Record<string, unknown>,
      })
      list.value = list.value.map(t => (t.id === id ? item : t))
    }

    async function remove(id: number): Promise<void> {
      await apiFetch<void>(`${endpoint}/${id}`, { method: 'DELETE' })
      list.value = list.value.filter(t => t.id !== id)
    }

    return { list, loaded, loading, fetch, create, update, remove }
  })
}
