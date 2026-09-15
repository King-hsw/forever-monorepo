/**
 * 内容管理：文章 / 分类 / 标签
 *
 * 前台接口前缀 /api/v1，后台接口前缀 /api/admin。
 * 文章后台用数字 id 定位，前台用 slug 定位。
 */
import { request } from '@/utils/request';

import type {
  AdminArticleQuery,
  ArticleArchiveItem,
  ArticleResponse,
  ArticleSaveRequest,
  CategoryRequest,
  CategoryResponse,
  PageResult,
  PublicArticleQuery,
  TagRequest,
  TagResponse,
} from './model/types';

const Api = {
  AdminArticles: '/api/admin/articles',
  ArticlePublish: (id: number) => `/api/admin/articles/${id}/publish`,
  ArticleUnpublish: (id: number) => `/api/admin/articles/${id}/unpublish`,
  ArticleAiSummary: (id: number) => `/api/admin/articles/${id}/ai-summary`,
  AdminCategories: '/api/admin/categories',
  AdminTags: '/api/admin/tags',
  PublicArticles: '/api/v1/articles',
  PublicCategories: '/api/v1/categories',
  PublicTags: '/api/v1/tags',
} as const;

/* ---------------- 文章（后台） ---------------- */

export function getArticleList(params: AdminArticleQuery) {
  return request.get<PageResult<ArticleResponse>>({ url: Api.AdminArticles, params });
}

/** 详情接口会返回 content 与 readingTime，列表接口这两项为 null */
export function getArticle(id: number) {
  return request.get<ArticleResponse>({ url: `${Api.AdminArticles}/${id}` });
}

export function createArticle(data: ArticleSaveRequest) {
  return request.post<ArticleResponse>({ url: Api.AdminArticles, data });
}

/** 全量覆盖：未传字段会被置空 */
export function updateArticle(id: number, data: ArticleSaveRequest) {
  return request.put<ArticleResponse>({ url: `${Api.AdminArticles}/${id}`, data });
}

export function deleteArticle(id: number) {
  return request.delete<void>({ url: `${Api.AdminArticles}/${id}` });
}

export function publishArticle(id: number) {
  return request.put<void>({ url: Api.ArticlePublish(id) });
}

export function unpublishArticle(id: number) {
  return request.put<void>({ url: Api.ArticleUnpublish(id) });
}

/** 触发 AI 概要生成，返回更新后的文章 */
export function generateArticleAiSummary(id: number) {
  return request.post<ArticleResponse>({ url: Api.ArticleAiSummary(id) });
}

/* ---------------- 文章（前台，供预览用） ---------------- */

export function getPublicArticles(params?: PublicArticleQuery) {
  return request.get<PageResult<ArticleResponse>>({ url: Api.PublicArticles, params });
}

export function getPublicArticleBySlug(slug: string) {
  return request.get<ArticleResponse>({ url: `${Api.PublicArticles}/${slug}` });
}

export function getArticleArchive() {
  return request.get<ArticleArchiveItem[]>({ url: `${Api.PublicArticles}/archive` });
}

/* ---------------- 分类 ---------------- */

export function getCategoryList() {
  return request.get<CategoryResponse[]>({ url: Api.AdminCategories });
}

export function createCategory(data: CategoryRequest) {
  return request.post<CategoryResponse>({ url: Api.AdminCategories, data });
}

/** 全量覆盖 */
export function updateCategory(id: number, data: CategoryRequest) {
  return request.put<CategoryResponse>({ url: `${Api.AdminCategories}/${id}`, data });
}

export function deleteCategory(id: number) {
  return request.delete<void>({ url: `${Api.AdminCategories}/${id}` });
}

export function getPublicCategories() {
  return request.get<CategoryResponse[]>({ url: Api.PublicCategories });
}

/* ---------------- 标签 ---------------- */

export function getTagList() {
  return request.get<TagResponse[]>({ url: Api.AdminTags });
}

export function createTag(data: TagRequest) {
  return request.post<TagResponse>({ url: Api.AdminTags, data });
}

export function updateTag(id: number, data: TagRequest) {
  return request.put<TagResponse>({ url: `${Api.AdminTags}/${id}`, data });
}

export function deleteTag(id: number) {
  return request.delete<void>({ url: `${Api.AdminTags}/${id}` });
}

export function getPublicTags() {
  return request.get<TagResponse[]>({ url: Api.PublicTags });
}
