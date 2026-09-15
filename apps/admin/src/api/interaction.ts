/**
 * 互动管理：评论 / 留言板 / 动态 / 站内消息
 *
 * 留言板即 targetType === 'BOARD' 的评论，动态评论为 targetType === 'MOMENT'，
 * 三者统一走评论接口，后台按 targetType 过滤。
 */
import { request } from '@/utils/request';

import type {
  AdminCommentQuery,
  CommentAdminResponse,
  CommentResponse,
  GeocodeResponse,
  MessageResponse,
  MomentCreateRequest,
  MomentResponse,
  PageResult,
  PublicMomentQuery,
  UnreadCountResponse,
} from './model/types';

const Api = {
  AdminComments: '/api/admin/comments',
  AdminMoments: '/api/admin/moments',
  PublicMoments: '/api/v1/moments',
  Messages: '/api/v1/messages',
  MessagesUnreadCount: '/api/v1/messages/unread-count',
  MessagesReadAll: '/api/v1/messages/read-all',
} as const;

/* ---------------- 评论管理 ---------------- */

export function getCommentList(params: AdminCommentQuery) {
  return request.get<PageResult<CommentAdminResponse>>({ url: Api.AdminComments, params });
}

/** 文章评论 */
export function getArticleComments(articleId: number, params?: { page?: number; size?: number }) {
  return request.get<PageResult<CommentResponse>>({
    url: `/api/v1/articles/${articleId}/comments`,
    params,
  });
}

/** 留言板列表 */
export function getBoardMessages(params?: { page?: number; size?: number }) {
  return request.get<PageResult<CommentResponse>>({ url: '/api/v1/board/messages', params });
}

export function approveComment(id: number) {
  return request.put<void>({ url: `${Api.AdminComments}/${id}/approve` });
}

export function rejectComment(id: number) {
  return request.put<void>({ url: `${Api.AdminComments}/${id}/reject` });
}

export function deleteComment(id: number) {
  return request.delete<void>({ url: `${Api.AdminComments}/${id}` });
}

/* ---------------- 动态（朋友圈） ---------------- */

export function getPublicMoments(params?: PublicMomentQuery) {
  return request.get<PageResult<MomentResponse>>({ url: Api.PublicMoments, params });
}

export function createMoment(data: MomentCreateRequest) {
  return request.post<MomentResponse>({ url: Api.AdminMoments, data });
}

/** 仅作者本人或 ADMIN 可删（后端 Service 内校验） */
export function deleteMoment(id: number) {
  return request.delete<void>({ url: `${Api.AdminMoments}/${id}` });
}

export function getMomentComments(momentId: number, params?: { page?: number; size?: number }) {
  return request.get<PageResult<CommentResponse>>({
    url: `${Api.PublicMoments}/${momentId}/comments`,
    params,
  });
}

/** 逆地理编码，未配置高德等密钥时 text 为 null */
export function geocode(params: { lat?: number; lng?: number }) {
  return request.get<GeocodeResponse>({ url: `${Api.PublicMoments}/geocode`, params });
}

/* ---------------- 站内消息 ---------------- */

export function getMessages(params?: { page?: number; size?: number }) {
  return request.get<PageResult<MessageResponse>>({ url: Api.Messages, params });
}

export function getUnreadCount() {
  return request.get<UnreadCountResponse>({ url: Api.MessagesUnreadCount });
}

export function readMessage(id: number) {
  return request.put<void>({ url: `${Api.Messages}/${id}/read` });
}

export function readAllMessages() {
  return request.put<void>({ url: Api.MessagesReadAll });
}

export function deleteMessage(id: number) {
  return request.delete<void>({ url: `${Api.Messages}/${id}` });
}
