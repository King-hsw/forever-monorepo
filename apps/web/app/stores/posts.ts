import { defineStore } from 'pinia'
import type {
  AdminArticleQuery,
  Post,
  PostInput,
  PostStatus,
  PublicArticleQuery,
  PageResult,
} from '#shared/types'
import { apiFetch, cleanQuery } from '~/utils/api'

export const usePostsStore = defineStore('admin-posts', () => {
  /** 当前已拉取的文章列表 */
  const list = ref<Post[]>([])
  const total = ref(0)
  const loading = ref(false)

  /** 管理端分页查询（含草稿） */
  async function fetchAdmin(params: AdminArticleQuery = {}) {
    loading.value = true
    try {
      const data = await apiFetch<PageResult<Post>>('/api/admin/articles', {
        query: cleanQuery(params),
      })
      list.value = data.list
      total.value = data.total
    } finally {
      loading.value = false
    }
  }

  /** 公开分页查询（仅已发布） */
  async function fetchPublic(params: PublicArticleQuery = {}) {
    return apiFetch<PageResult<Post>>('/api/v1/articles', {
      query: cleanQuery(params),
    })
  }

  /** 管理端文章详情（含 content） */
  async function getById(id: number | string): Promise<Post> {
    return apiFetch<Post>(`/api/admin/articles/${id}`)
  }

  /** 公开文章详情（按 slug，含 content） */
  async function getBySlug(slug: string): Promise<Post> {
    return apiFetch<Post>(`/api/v1/articles/${encodeURIComponent(slug)}`)
  }

  /** 创建文章（后端默认为草稿状态） */
  async function create(input: PostInput): Promise<Post> {
    return apiFetch<Post>('/api/admin/articles', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    })
  }

  /** 全量更新文章 */
  async function update(id: number | string, input: PostInput): Promise<Post> {
    return apiFetch<Post>(`/api/admin/articles/${id}`, {
      method: 'PUT',
      body: input as unknown as Record<string, unknown>,
    })
  }

  async function remove(id: number): Promise<void> {
    await apiFetch<void>(`/api/admin/articles/${id}`, { method: 'DELETE' })
    list.value = list.value.filter(p => p.id !== id)
    total.value = Math.max(0, total.value - 1)
  }

  /** AI 生成摘要（需后台站点设置开启；后端已落库，返回最新文章） */
  async function aiSummary(id: number | string): Promise<Post> {
    return apiFetch<Post>(`/api/admin/articles/${id}/ai-summary`, { method: 'POST' })
  }

  /** 发布 / 下线文章 */
  async function setStatus(id: number, status: PostStatus): Promise<void> {
    const action = status === 'PUBLISHED' ? 'publish' : 'unpublish'
    await apiFetch<void>(`/api/admin/articles/${id}/${action}`, { method: 'PUT' })
    const post = list.value.find(p => p.id === id)
    if (post) post.status = status
  }

  /** 按当前状态取反：已发布 → 下线，草稿 → 发布 */
  async function toggleStatus(post: Post): Promise<void> {
    await setStatus(post.id, post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')
  }

  return {
    list,
    total,
    loading,
    fetchAdmin,
    fetchPublic,
    getById,
    getBySlug,
    create,
    update,
    remove,
    aiSummary,
    setStatus,
    toggleStatus,
  }
})
