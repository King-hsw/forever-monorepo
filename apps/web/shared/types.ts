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
  contact?: string
  status: FriendLinkStatus
  rejectReason?: string
}

export type CommentStatus = 'APPROVED' | 'PENDING' | 'REJECTED'

/** 评论归属类型：文章 / 留言板 / 动态 */
export type CommentTarget = 'ARTICLE' | 'BOARD' | 'MOMENT'

/** 公开评论（对应 CommentResponse；两层楼结构，replies 为楼内回复） */
export interface CommentNode {
  id: number
  nickname: string
  /** 由邮箱哈希生成的头像 URL；邮箱为空（登录用户未填资料邮箱）时为 null */
  avatarUrl: string | null
  /** 个人主页，可为 null */
  site: string | null
  content: string
  createdAt: string
  /** 所回复消息的 id（根评论为 null） */
  parentId?: number | null
  replies: CommentNode[] | null
  /** 所回复的楼内回复昵称（仅回复楼内回复时非 null，回复根评论为 null） */
  parentNickname?: string | null
  /** 所回复的楼内回复内容，供前端展示引用 */
  parentContent?: string | null
}

/** 管理端评论（对应 CommentAdminResponse；比公开版多邮箱/IP/状态/归属目标） */
export interface AdminComment {
  id: number
  targetType: CommentTarget
  /** 所属文章标题；BOARD 为 null */
  targetTitle: string | null
  parentId: number | null
  rootId: number | null
  nickname: string
  email: string
  site: string | null
  content: string
  status: CommentStatus
  ip: string | null
  createdAt: string
}

/** 发表评论请求（访客，无需登录）；articleId 与 targetType 二选一 */
export interface CommentInput {
  articleId?: number
  targetType?: CommentTarget
  /** MOMENT 评论的目标动态 id（articleId 对应 ARTICLE 评论） */
  targetId?: number
  parentId?: number
  nickname: string
  email: string
  site?: string
  content: string
}

/** 动态媒体（media 字段：图片最多 9 张，音频 / 视频各最多 1 个） */
export interface MomentMedia {
  images: string[]
  audio: string | null
  video: string | null
}

/** 动态（对应 MomentResponse） */
export interface Moment {
  id: number
  uid: number
  /** 发布者账号名 */
  username: string
  /** 自定义头像；null 时前端按现有惯例回退首字占位 */
  avatarUrl: string | null
  content: string
  media: MomentMedia
  location: string | null
  lat: number | null
  lng: number | null
  createdAt: string
  /** 已过审评论数 */
  commentCount: number
  /** 作者本人或 ADMIN 角色可删；匿名恒 false */
  canDelete: boolean
}

/** 发布动态请求 */
export interface MomentInput {
  content?: string
  images?: string[]
  audio?: string | null
  video?: string | null
  location?: string | null
  lat?: number | null
  lng?: number | null
}

/** 站点公开信息（对应 SiteInfoController.SiteInfo）；birthDate 未设置为 null */
export interface SiteInfo {
  birthDate: string | null
}

/** 后端统一分页结构 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  size: number
}

/* ===== 全局搜索 ===== */

/** 搜索结果条目的高亮片段；关键词由后端用 <em> 包裹（文本已转义） */
export interface SearchHighlight {
  title?: string
  excerpt?: string
}

/** 全局搜索结果条目（对应 SearchItemResponse） */
export interface SearchItem {
  id: number
  slug: string
  /** 原始标题 */
  title: string
  categoryName: string | null
  tags: TagItem[]
  createdAt: string
  highlights: SearchHighlight | null
}

/** 搜索接口响应：复用统一分页结构 */
export type SearchResponse = PageResult<SearchItem>

/** 当前登录用户信息 */
export interface MeInfo {
  uid: number
  username: string
  roles: string[]
  permissions: string[]
}

/** 当前登录用户资料（对应 ProfileResponse；avatarUrl 已解析，可直接展示） */
export interface ProfileInfo {
  username: string
  nickname: string | null
  email: string | null
  site: string | null
  /** 自定义头像 URL；未上传时为按邮箱 hash 生成的 Gravatar 地址；均无时为 null */
  avatarUrl: string | null
}

/** 角色（对应 SysRole） */
export interface SysRole {
  id: number
  code: string
  name: string
  remark: string
  /** 内置角色不可删除 */
  builtIn: boolean
  createdAt: string
}

/** 权限点（对应 SysPermission） */
export interface SysPermission {
  id: number
  code: string
  name: string
  module: string
  createdAt: string
}

/** 后台用户（对应 UserView） */
export interface UserView {
  id: number
  username: string
  nickname: string
  /** 如 ACTIVE / DISABLED */
  status: string
  roles: SysRole[]
  createdAt: string
}


/** 站点配置项（对应 SettingResponse；value 为空表示未在数据库设置，走 yml 默认值） */
export interface SettingItem {
  key: string
  value: string
  description: string
}

/** 审计日志条目（对应 ActionLogResponse） */
export interface ActionLog {
  id: number
  /** 操作人；匿名请求为 null */
  username: string | null
  method: string
  path: string
  /** HTTP 响应码 */
  status: number
  ip: string
  /** 耗时（毫秒） */
  durationMs: number
  createdAt: string
}

/** 审计日志分页查询参数 */
export interface ActionLogQuery {
  page?: number
  size?: number
  /** 操作人，精确匹配 */
  username?: string
  /** 路径关键词，模糊匹配 */
  path?: string
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

/** 归档条目（公开归档接口；按 publishedAt 倒序） */
export interface ArchiveItem {
  id: number
  title: string
  slug: string
  publishedAt: string
}
