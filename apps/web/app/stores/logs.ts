import { defineStore } from 'pinia'
import type { ActionLog, ActionLogQuery, PageResult } from './types'
import { apiFetch, cleanQuery } from '~/utils/api'

export const useLogsStore = defineStore('admin-logs', () => {
  /* ---------- 状态 ---------- */
  const list = ref<ActionLog[]>([])
  const total = ref(0)
  const page = ref(1)
  const loading = ref(false)

  /**
   * 分页查询审计日志（按时间倒序）。
   * 每次调用都会重新发起查询；结果同步到本地状态并返回。
   */
  // force 参数保留：审计日志每次都需要最新数据，当前实现始终重新请求
  async function fetch(query: ActionLogQuery = {}, _force = true): Promise<PageResult<ActionLog>> {
    loading.value = true
    try {
      const data = await apiFetch<PageResult<ActionLog>>('/api/admin/logs', {
        query: cleanQuery({
          page: query.page ?? 1,
          size: query.size ?? 20,
          username: query.username,
          path: query.path,
        }),
      })
      list.value = data.list
      total.value = data.total
      page.value = data.page
      return data
    }
    finally {
      loading.value = false
    }
  }

  return { list, total, page, loading, fetch }
})
