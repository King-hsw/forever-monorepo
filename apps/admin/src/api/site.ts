/**
 * 站点配置类：友链 / RSS 订阅源 / 敏感词 / 站点设置 / 搜索
 */
import { request } from '@/utils/request';

import type {
  FriendLinkApplyRequest,
  FriendLinkResponse,
  FriendLinkUpdateRequest,
  PageResult,
  RssFeedRequest,
  RssFeedResponse,
  RssItemResponse,
  SearchItemResponse,
  SensitiveWordRequest,
  SensitiveWordResponse,
  SettingResponse,
  SettingUpdateRequest,
  SiteInfo,
} from './model/types';

const Api = {
  AdminFriendLinks: '/api/admin/friend-links',
  AdminRssFeeds: '/api/admin/rss/feeds',
  AdminSensitiveWords: '/api/admin/sensitive-words',
  AdminSettings: '/api/admin/settings',
  PublicSite: '/api/v1/site',
  PublicSearch: '/api/v1/search',
  PublicRssItems: '/api/v1/rss/items',
  PublicRssFeeds: '/api/v1/rss/feeds',
} as const;

/* ---------------- 友链 ---------------- */

/** 管理端返回全量（含 PENDING/REJECTED 与 contact、rejectReason） */
export function getFriendLinkList() {
  return request.get<FriendLinkResponse[]>({ url: Api.AdminFriendLinks });
}

export function createFriendLink(data: FriendLinkApplyRequest) {
  return request.post<FriendLinkResponse>({ url: Api.AdminFriendLinks, data });
}

/** 全量覆盖：status 必填，未传字段会被置空 */
export function updateFriendLink(id: number, data: FriendLinkUpdateRequest) {
  return request.put<FriendLinkResponse>({ url: `${Api.AdminFriendLinks}/${id}`, data });
}

export function approveFriendLink(id: number) {
  return request.post<FriendLinkResponse>({ url: `${Api.AdminFriendLinks}/${id}/approve` });
}

export function rejectFriendLink(id: number, reason?: string) {
  return request.post<FriendLinkResponse>({
    url: `${Api.AdminFriendLinks}/${id}/reject`,
    params: { reason },
  });
}

export function deleteFriendLink(id: number) {
  return request.delete<void>({ url: `${Api.AdminFriendLinks}/${id}` });
}

/* ---------------- RSS 订阅源 ---------------- */

export function getRssFeedList() {
  return request.get<RssFeedResponse[]>({ url: Api.AdminRssFeeds });
}

export function createRssFeed(data: RssFeedRequest) {
  return request.post<RssFeedResponse>({ url: Api.AdminRssFeeds, data });
}

/** 全量覆盖，未传字段会被置空 */
export function updateRssFeed(id: number, data: RssFeedRequest) {
  return request.put<RssFeedResponse>({ url: `${Api.AdminRssFeeds}/${id}`, data });
}

export function deleteRssFeed(id: number) {
  return request.delete<void>({ url: `${Api.AdminRssFeeds}/${id}` });
}

/** 手动触发抓取 */
export function refreshRssFeed(id: number) {
  return request.post<void>({ url: `${Api.AdminRssFeeds}/${id}/refresh` });
}

export function getRssItems(params?: { page?: number; size?: number }) {
  return request.get<PageResult<RssItemResponse>>({ url: Api.PublicRssItems, params });
}

export function getPublicRssFeeds() {
  return request.get<RssFeedResponse[]>({ url: Api.PublicRssFeeds });
}

/* ---------------- 敏感词 ---------------- */

export function getSensitiveWordList() {
  return request.get<SensitiveWordResponse[]>({ url: Api.AdminSensitiveWords });
}

export function createSensitiveWord(data: SensitiveWordRequest) {
  return request.post<SensitiveWordResponse>({ url: Api.AdminSensitiveWords, data });
}

/** 全量覆盖 */
export function updateSensitiveWord(id: number, data: SensitiveWordRequest) {
  return request.put<SensitiveWordResponse>({ url: `${Api.AdminSensitiveWords}/${id}`, data });
}

export function deleteSensitiveWord(id: number) {
  return request.delete<void>({ url: `${Api.AdminSensitiveWords}/${id}` });
}

/* ---------------- 站点设置 ---------------- */

export function getSettingList() {
  return request.get<SettingResponse[]>({ url: Api.AdminSettings });
}

/** 逐项保存；value 留空字符串表示清除该项 */
export function updateSetting(data: SettingUpdateRequest) {
  return request.put<SettingResponse>({ url: Api.AdminSettings, data });
}

export function getSiteInfo() {
  return request.get<SiteInfo>({ url: Api.PublicSite });
}

/* ---------------- 搜索 ---------------- */

export function searchArticles(params: { keyword?: string; page?: number; size?: number }) {
  return request.get<PageResult<SearchItemResponse>>({ url: Api.PublicSearch, params });
}
