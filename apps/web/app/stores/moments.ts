import { defineStore } from 'pinia'
import type { CommentNode, Moment, MomentInput, PageResult } from '#shared/types'
import { apiFetch, cleanQuery } from '~/utils/api'

export const useMomentsStore = defineStore('moments', () => {
  /** 公开动态时间线：created_at 倒序；user 可选，只查该用户 */
  async function fetchMoments(page = 1, size = 20, user?: number) {
    return apiFetch<PageResult<Moment>>('/api/v1/moments', {
      query: cleanQuery({ page, size, user }),
    })
  }

  /** 发布动态（需登录 + moment:post 权限） */
  async function createMoment(input: MomentInput): Promise<Moment> {
    return apiFetch<Moment>('/api/admin/moments', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    })
  }

  /** 删除动态（作者本人或 ADMIN 角色） */
  async function removeMoment(id: number): Promise<void> {
    await apiFetch<void>(`/api/admin/moments/${id}`, { method: 'DELETE' })
  }

  /** 动态评论（与留言板同形：根评论倒序，楼内回复随根返回） */
  async function fetchMomentComments(momentId: number, page = 1, size = 10) {
    return apiFetch<PageResult<CommentNode>>(`/api/v1/moments/${momentId}/comments`, {
      query: cleanQuery({ page, size }),
    })
  }

  return { fetchMoments, createMoment, removeMoment, fetchMomentComments }
})
