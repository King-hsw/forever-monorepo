/**
 * 前端数据模型 —— 统一从前后端共享的契约模块导出，
 * 保证与 forever-server 的 OpenAPI 契约一致。
 */
export type {
  AdminArticleQuery,
  ApiResponse,
  Category,
  CategoryInput,
  FriendLink,
  FriendLinkApplyInput,
  FriendLinkStatus,
  FriendLinkUpdateInput,
  MeInfo,
  PageResult,
  Post,
  PostInput,
  PostStatus,
  PublicArticleQuery,
  RssFeed,
  RssFeedInput,
  Tag,
  TagInput,
  TagItem,
  SettingItem,
  SettingUpdateInput,
  ActionLog,
  ActionLogQuery,
} from '#shared/types'
