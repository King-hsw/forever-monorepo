import { defineStore } from 'pinia'
import type { SettingItem } from './types'
import { apiFetch } from '~/utils/api'

export const useSettingsStore = defineStore('admin-settings', () => {
  const list = ref<SettingItem[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  /** 拉取全部配置项（value 为空字符串表示未在数据库设置、走 yml 默认值） */
  async function fetch(force = false) {
    if (loading.value || (loaded.value && !force)) return
    loading.value = true
    try {
      list.value = await apiFetch<SettingItem[]>('/api/admin/settings')
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /** 更新单项配置（仅支持已登记的配置键），成功后用返回值替换列表中的旧项 */
  async function update(key: string, value: string): Promise<void> {
    const item = await apiFetch<SettingItem>('/api/admin/settings', {
      method: 'PUT',
      body: { key, value },
    })
    const idx = list.value.findIndex(s => s.key === key)
    if (idx >= 0) list.value[idx] = item
    else list.value.push(item)
  }

  return { list, loaded, loading, fetch, update }
})
