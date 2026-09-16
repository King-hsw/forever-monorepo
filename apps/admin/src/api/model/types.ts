/**
 * forever-server 接口类型定义
 *
 * 全部字段对齐后端源码中的 DTO / VO 定义（forever-server 的 com.forever.server 各包）。
 * 后端统一响应包装为 ApiResponse<T>（code === 0 表示成功），分页统一为 PageResult<T>。
 *
 * 重要约定：
 * - 时间字段为 LocalDateTime，后端序列化为 ISO-8601 字符串（如 2026-09-15T10:20:30），无时区后缀
 * - 分页参数固定为 page（从 1 开始）+ size（上限 100），不是 pageSize
 * - 多个 PUT 接口为「全量更新」语义：未传字段会被置空，编辑表单须提交完整字段
 */

/* ============================================================
 * 通用
 * ============================================================ */

/** 后端统一响应包装 */
export interface ApiResponse<T> {
  /** 业务码，成功恒为 0 */
  code: number;
  message: string;
  data: T;
}

/** 统一分页结果 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
}

/** 分页查询参数 */
export interface PageQuery {
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页条数，上限 100 */
  size?: number;
}

/** 后端错误码枚举（见 common/ErrorCode.java） */
export enum ErrorCode {
  OK = 0,
  PARAM_INVALID = 40001,
  UNAUTHORIZED = 40101,
  FORBIDDEN = 40301,
  NOT_FOUND = 40401,
  CONFLICT = 40901,
  NOT_READY = 50301,
  INTERNAL_ERROR = 50000,
}

/* ============================================================
 * 认证 / 身份
 * ============================================================ */

export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 登录 / 刷新 的响应体。
 * 注意：accessToken 是随机不透明串（64 位 hex），不是 JWT。
 */
export interface LoginResponse {
  accessToken: string;
  /** access token 有效期（秒），恒为 7200 */
  expiresIn: number;
  refreshToken: string;
  /** refresh token 有效期（秒），恒为 2592000（30 天） */
  refreshExpiresIn: number;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface MeResponse {
  uid: number;
  username: string;
  roles: string[];
  permissions: string[];
}

export interface ProfileResponse {
  username: string;
  nickname: string;
  email: string;
  site: string;
  /** 自定义历史直链或邮箱 Gravatar，只读（后端无头像上传接口） */
  avatarUrl: string;
}

export interface ProfileUpdateRequest {
  /** 最大 50 字符 */
  nickname?: string;
  email?: string;
  site?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  /** 6–100 字符 */
  newPassword: string;
}

/* ============================================================
 * 文章
 * ============================================================ */

export type ArticleStatus = 'DRAFT' | 'PUBLISHED';
export type ArticleType = 'ARTICLE' | 'PAGE';
export type ContentFormat = 'MARKDOWN' | 'HTML';

export interface ArticleTagItem {
  id: number;
  name: string;
}

export interface ArticleResponse {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  /** 仅详情接口返回，列表接口为 null */
  content: string | null;
  coverImage: string | null;
  categoryId: number | null;
  categoryName: string | null;
  tags: ArticleTagItem[];
  status: ArticleStatus;
  type: ArticleType;
  contentFormat: ContentFormat;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** 需后端配置 blog.site.url 才有值 */
  url: string | null;
  /** 仅详情接口返回 */
  readingTime: number | null;
}

/**
 * 文章保存请求。
 * PUT 为全量覆盖：编辑时必须回填所有字段，否则未传字段会被置空。
 */
export interface ArticleSaveRequest {
  /** 必填，≤200 */
  title: string;
  /** 必填 */
  content: string;
  /** ≤500 */
  summary?: string;
  /** ≤200 */
  slug?: string;
  /** ≤500 */
  coverImage?: string;
  categoryId?: number | null;
  tagIds?: number[];
  /** 默认 ARTICLE */
  type?: ArticleType;
  /** 默认 MARKDOWN */
  contentFormat?: ContentFormat;
}

export interface AdminArticleQuery extends PageQuery {
  status?: ArticleStatus;
  keyword?: string;
  categoryId?: number;
}

export interface PublicArticleQuery extends PageQuery {
  keyword?: string;
  categoryId?: number;
  tagId?: number;
}

export interface ArticleArchiveItem {
  id: number;
  title: string;
  slug: string;
  publishedAt: string;
}

/* ============================================================
 * 分类 / 标签
 * ============================================================ */

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  sort: number;
  articleCount: number;
}

export interface CategoryRequest {
  /** 必填，≤50 */
  name: string;
  /** ≤100 */
  slug?: string;
  /** 默认 0 */
  sort?: number;
}

export interface TagResponse {
  id: number;
  name: string;
  articleCount: number;
}

export interface TagRequest {
  /** 必填，≤50 */
  name: string;
}

/* ============================================================
 * 评论 / 留言
 * ============================================================ */

export type CommentStatus = 'APPROVED' | 'PENDING' | 'REJECTED';
export type CommentTargetType = 'ARTICLE' | 'BOARD' | 'MOMENT';

/** 管理端评论项 */
export interface CommentAdminResponse {
  id: number;
  targetType: CommentTargetType;
  targetTitle: string | null;
  parentId: number | null;
  rootId: number | null;
  nickname: string;
  email: string | null;
  site: string | null;
  content: string;
  status: CommentStatus;
  ip: string;
  createdAt: string;
}

/** 公开端评论项（两层楼结构） */
export interface CommentResponse {
  id: number;
  parentId: number | null;
  nickname: string;
  avatarUrl: string;
  site: string | null;
  content: string;
  createdAt: string;
  /** 仅根评论非 null */
  replies: CommentResponse[] | null;
  parentNickname: string | null;
  parentContent: string | null;
}

export interface CommentCreateRequest {
  articleId?: number;
  parentId?: number;
  /** 必填，≤50 */
  nickname: string;
  /** ≤100 */
  email?: string;
  /** ≤200 */
  site?: string;
  /** 必填，≤500 */
  content: string;
}

export interface AdminCommentQuery extends PageQuery {
  status?: CommentStatus;
  targetType?: CommentTargetType;
}

/* ============================================================
 * 友链
 * ============================================================ */

export type FriendLinkStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface FriendLinkResponse {
  id: number;
  name: string;
  siteUrl: string;
  iconUrl: string | null;
  description: string | null;
  status: FriendLinkStatus;
  createdAt: string;
  reviewedAt: string | null;
  /** 仅管理端返回 */
  contact: string | null;
  /** 仅管理端返回 */
  rejectReason: string | null;
}

export interface FriendLinkApplyRequest {
  /** 必填，≤100 */
  name: string;
  /** 必填，≤500 */
  siteUrl: string;
  /** ≤500 */
  iconUrl?: string;
  /** ≤200 */
  description?: string;
  /** ≤200 */
  contact?: string;
}

/** PUT 为全量覆盖，status 必填 */
export interface FriendLinkUpdateRequest {
  /** 必填，≤100 */
  name: string;
  /** 必填，≤500 */
  siteUrl: string;
  /** ≤500 */
  iconUrl?: string;
  /** ≤200 */
  description?: string;
  /** 必填 */
  status: FriendLinkStatus;
  /** ≤200 */
  rejectReason?: string;
}

/* ============================================================
 * 动态（朋友圈）
 * ============================================================ */

export interface MomentMedia {
  images: string[];
  audio: string | null;
  video: string | null;
}

export interface MomentResponse {
  id: number;
  uid: number;
  username: string;
  avatarUrl: string;
  content: string;
  media: MomentMedia;
  location: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  commentCount: number;
  canDelete: boolean;
}

export interface MomentCreateRequest {
  /** ≤1000 */
  content?: string;
  /** 最多 9 张 */
  images?: string[];
  audio?: string;
  video?: string;
  /** ≤100 */
  location?: string;
  lat?: number;
  lng?: number;
}

export interface GeocodeResponse {
  /** 未配置或失败时为 null */
  text: string | null;
}

export interface PublicMomentQuery extends PageQuery {
  user?: number;
}

/* ============================================================
 * RSS 订阅
 * ============================================================ */

export interface RssFeedResponse {
  id: number;
  title: string | null;
  siteUrl: string;
  feedUrl: string;
  description: string | null;
  enabled: boolean;
  itemCount: number;
  lastFetchedAt: string | null;
  lastError: string | null;
}

export interface RssFeedRequest {
  /** ≤200 */
  title?: string;
  /** 必填，≤500 */
  siteUrl: string;
  /** 必填，≤500 */
  feedUrl: string;
  /** ≤500 */
  description?: string;
  /** 默认 true */
  enabled?: boolean;
}

export interface RssItemResponse {
  id: number;
  feedTitle: string;
  siteUrl: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: string;
}

/* ============================================================
 * 敏感词
 * ============================================================ */

export interface SensitiveWordResponse {
  id: number;
  word: string;
  replacement: string;
  createdAt: string;
}

export interface SensitiveWordRequest {
  /** 必填，≤100 */
  word: string;
  /** ≤100，默认 */
  replacement?: string;
}

/* ============================================================
 * 站点设置
 * ============================================================ */

export interface SettingResponse {
  key: string;
  value: string;
  description: string;
}

export interface SettingUpdateRequest {
  key: string;
  /** 非 null；留空字符串表示清除 */
  value: string;
}

export interface SiteInfo {
  /** 未设置时为 null */
  birthDate: string | null;
}

/* ============================================================
 * RBAC（用户 / 角色 / 权限）
 * ============================================================ */

export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface SysRole {
  id: number;
  code: string;
  name: string;
  remark: string | null;
  builtIn: boolean;
  createdAt?: string;
}

/** 角色列表项，额外带权限 id 集合 */
export interface RoleView extends SysRole {
  permissionIds: number[];
}

export interface SysPermission {
  id: number;
  code: string;
  name: string;
  module: string;
  createdAt?: string;
}

export interface UserView {
  id: number;
  username: string;
  nickname: string | null;
  status: UserStatus;
  /** 创建接口返回时固定为 [] */
  roles: SysRole[];
  createdAt: string;
}

export interface UserCreateRequest {
  /** 必填，≤50 */
  username: string;
  /** 必填，6–100 */
  password: string;
  /** ≤50 */
  nickname?: string;
  roleIds?: number[];
}

export interface UserStatusRequest {
  status: UserStatus;
}

export interface UserPasswordResetRequest {
  /** 必填，6–100 */
  password: string;
}

export interface UserRolesRequest {
  roleIds: number[];
}

export interface RoleCreateRequest {
  /** 必填，正则 [A-Z_]{2,30} */
  code: string;
  /** 必填 */
  name: string;
  remark?: string;
}

export interface RolePermissionsRequest {
  permissionIds: number[];
}

/* ============================================================
 * 审计日志
 * ============================================================ */

export interface ActionLogResponse {
  id: number;
  username: string;
  method: string;
  path: string;
  status: number;
  ip: string;
  durationMs: number;
  createdAt: string;
}

export interface ActionLogQuery extends PageQuery {
  /** 精确匹配 */
  username?: string;
  /** 模糊匹配 */
  path?: string;
}

/* ============================================================
 * 站内消息
 * ============================================================ */

export type MessageType = 'COMMENT_REPLY' | 'NEW_COMMENT';

export interface MessageResponse {
  id: number;
  type: MessageType;
  content: string;
  sourceUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

/* ============================================================
 * 搜索
 * ============================================================ */

export interface SearchHighlight {
  /** 仅 <em> 为标签，HTML 已转义，可安全 v-html */
  title: string;
  excerpt: string;
}

export interface SearchItemResponse {
  id: number;
  slug: string;
  title: string;
  categoryName: string | null;
  tags: ArticleTagItem[];
  createdAt: string;
  highlights: SearchHighlight;
}

/* ============================================================
 * 文件上传（内容寻址直传 + 分片续传）
 *
 * 接口本身不接收文件流，只做「查秒传 / 签发直传凭证」；
 * 文件体由前端直接 PUT 到 RustFS（S3 兼容）。
 * uploadUrl 请求头 Content-Type 必须与申请时一致，否则签名校验失败。
 * ============================================================ */

/** 允许上传的 MIME -> 扩展名（后端硬编码白名单） */
export const UPLOAD_MIME_WHITELIST: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/wav': '.wav',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/matroska': '.mkv',
};

export interface UploadCheckRequest {
  contentType: string;
  /** 32 位小写 hex */
  md5: string;
}

export interface UploadCheckResponse {
  /** true 表示服务端已有同内容对象，可直接用 accessUrl */
  exists: boolean;
  accessUrl: string;
  contentType: string;
}

export interface UploadPresignRequest {
  contentType: string;
  md5: string;
}

export interface UploadPresignResponse {
  key: string;
  uploadUrl: string;
  accessUrl: string;
  contentType: string;
  /** 秒 */
  expiresIn: number;
}

export interface MultipartInitRequest {
  contentType: string;
  md5: string;
  /** 必须 > 0 */
  sizeBytes: number;
}

export interface MultipartInitResponse {
  key: string;
  uploadId: string;
  /** 固定 8MB */
  partSize: number;
  partCount: number;
  partUrls: string[];
  accessUrl: string;
  contentType: string;
  expiresIn: number;
}

export interface MultipartCompleteRequest {
  key: string;
  uploadId: string;
}

export interface MultipartCompleteResponse {
  key: string;
  accessUrl: string;
  sizeBytes: number;
}
