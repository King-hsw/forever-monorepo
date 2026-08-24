import { defineStore } from 'pinia'
import type { AdminComment, CommentInput, CommentNode, CommentStatus, CommentTarget, PageResult } from '#shared/types'
import { apiFetch, cleanQuery } from '~/utils/api'

export const useCommentsStore = defineStore('comments', () => {
  /* ---------- 公开接口（访客） ---------- */

  /** 分页查看文章评论：根评论倒序，楼内回复正序，仅已过审 */
  async function fetchByArticle(articleId: number, page = 1, size = 10) {
    return apiFetch<PageResult<CommentNode>>(`/api/v1/articles/${articleId}/comments`, {
      query: cleanQuery({ page, size }),
    })
  }

  /** 发表评论/留言：targetType=BOARD 走留言板接口，否则按 articleId 发文章评论 */
  async function create(input: CommentInput): Promise<AdminComment> {
    const url = input.targetType === 'BOARD' ? '/api/v1/board/messages' : '/api/v1/comments'
    return apiFetch<AdminComment>(url, {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    })
  }

  /** 分页查看留言板留言 */
  async function fetchBoardMessages(page = 1, size = 24) {
    return apiFetch<PageResult<CommentNode>>('/api/v1/board/messages', {
      query: cleanQuery({ page, size }),
    })
  }

  /* ---------- 管理端 ---------- */

  /** 管理端分页查询，status / targetType 不传查全部 */
  async function fetchAdmin(status?: CommentStatus | '', page = 1, size = 20, targetType?: CommentTarget | '') {
    return apiFetch<PageResult<AdminComment>>('/api/admin/comments', {
      query: cleanQuery({ status, page, size, targetType }),
    })
  }

  async function approve(id: number): Promise<void> {
    await apiFetch<void>(`/api/admin/comments/${id}/approve`, { method: 'PUT' })
  }

  async function reject(id: number): Promise<void> {
    await apiFetch<void>(`/api/admin/comments/${id}/reject`, { method: 'PUT' })
  }

  /** 删除评论（连同楼内所有回复） */
  async function remove(id: number): Promise<void> {
    await apiFetch<void>(`/api/admin/comments/${id}`, { method: 'DELETE' })
  }

  return { fetchByArticle, create, fetchBoardMessages, fetchAdmin, approve, reject, remove }
})
