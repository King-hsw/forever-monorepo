import type { PostStatus } from '~/stores/types'

/** 文章状态展示文案 */
export function statusLabel(status: PostStatus): string {
  return status === 'PUBLISHED' ? '已发布' : '草稿'
}

/** 文章状态对应的 CSS 类名后缀（badge--published / badge--draft） */
export function statusClass(status: PostStatus): string {
  return status === 'PUBLISHED' ? 'published' : 'draft'
}

/** 格式化日期，兼容 ISO 字符串与时间戳 */
export function formatDate(value: string | number | null | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** 日期时间格式（抓取时间等需要精确到分） */
export function formatDateTime(value: string | number | null | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 短日期格式（后台表格用） */
export function formatShortDate(value: string | number | null | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('zh-CN')
}
