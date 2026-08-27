import type { PostStatus } from '#shared/types'

/** 取用户名首字母大写作为头像占位符，空值回退 'A' */
export function initialOf(username?: string | null): string {
  return (username?.slice(0, 1) ?? 'A').toUpperCase()
}

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

/**
 * 相对时间（动态 / 聊天时间线用）：刚刚 / N 分钟前 / 昨天 / N 天前，
 * 更早的回落到短日期时间（带年份前缀）
 */
export function formatRelativeTime(value: string | number): string {
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  const d = new Date(value)
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return '昨天'
  if (diff < 6 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
  return formatShortDateTime(value)
}

/** 短日期时间（时间分隔与相对时间回落用），如「12-25 14:30」，跨年带「2024/」前缀 */
export function formatShortDateTime(value: string | number): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const prefix = d.getFullYear() === new Date().getFullYear() ? '' : `${d.getFullYear()}/`
  return `${prefix}${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
