/**
 * forever-server API 契约类型（前后端共享）
 * 接口文档：http://localhost:8080/swagger-ui/index.html
 */

/** 后端统一响应体 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export type PostStatus = 'DRAFT' | 'PUBLISHED'

/** 文章内嵌的标签项 */
export interface TagItem {
  id: number
  name: string
}

/** 文章（对应 ArticleResponse；列表接口不返回 content） */
export interface Post {
  id: number
  title: string
  slug: string
  summary: string
  /** 正文（Markdown）；仅详情接口返回 */
  content: string | null
  coverImage: string
  categoryId: number | null
  categoryName: string | null
  tags: TagItem[]
  status: PostStatus
  viewCount: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 文章创建/更新请求（对应 ArticleSaveRequest；全量提交） */
export interface PostInput {
  title: string
  /** 正文（Markdown），必填 */
  content: string
  summary?: string
  /** 不填服务端自动生成 */
  slug?: string
  coverImage?: string
  categoryId?: number | null
  /** 标签 id 列表，全量覆盖 */
  tagIds?: number[]
}

export interface Category {
  id: number
  name: string
  slug: string
  sort: number
  articleCount: number
}

export interface CategoryInput {
  name: string
  slug?: string
  sort?: number
}

export interface Tag {
  id: number
  name: string
  articleCount: number
}

export interface TagInput {
  name: string
}

/** RSS 订阅源（对应 RssFeedResponse；管理端含抓取状态） */
export interface RssFeed {
  id: number
  /** 站点名称；创建时可不填，后端抓取成功后自动回填 feed 自带标题 */
  title: string
  /** 博客主页地址 */
  siteUrl: string
  /** RSS/Atom 订阅地址 */
  feedUrl: string
  description: string
  /** 是否启用抓取 */
  enabled: boolean
  /** 已抓取的条目数 */
  itemCount: number
  /** 上次抓取时间；从未抓取为 null */
  lastFetchedAt: string | null
  /** 上次抓取的错误信息；正常为 null */
  lastError: string | null
}

/** RSS 订阅源创建/更新请求（对应 RssFeedRequest；全量提交） */
export interface RssFeedInput {
  title?: string
  siteUrl: string
  feedUrl: string
  description?: string
  enabled?: boolean
}

export type FriendLinkStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** 友链（对应 FriendLinkResponse；公开接口不含 contact / rejectReason） */
export interface FriendLink {
  id: number
  name: string
  siteUrl: string
  iconUrl: string | null
  description: string | null
  status: FriendLinkStatus
  createdAt: string
  reviewedAt: string | null
  /** 仅管理端返回 */
  contact?: string | null
  /** 仅管理端返回 */
  rejectReason?: string | null
}

/** 友链申请请求（访客提交） */
export interface FriendLinkApplyInput {
  name: string
  siteUrl: string
  iconUrl?: string
  description?: string
  contact?: string
}

/** 友链全量更新请求（管理端） */
export interface FriendLinkUpdateInput {
  name: string
  siteUrl: string
  iconUrl?: string
  description?: string
  status: FriendLinkStatus
  rejectReason?: string
}

/** 后端统一分页结构 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  size: number
}

/** 当前登录用户信息 */
export interface MeInfo {
  uid: number
  username: string
}

/** 公开文章列表查询参数 */
export interface PublicArticleQuery {
  page?: number
  size?: number
  keyword?: string
  categoryId?: number | null
  tagId?: number | null
}

/** 管理端文章列表查询参数 */
export interface AdminArticleQuery {
  page?: number
  size?: number
  status?: PostStatus | ''
  keyword?: string
  categoryId?: number | null
}
