import type { SettingItem } from '#shared/types'

/**
 * 配置项元数据（与 settings / setup 两页共用，对应服务端 SiteConfigService 的登记表）。
 */
export type SettingType = 'boolean' | 'number' | 'email' | 'url' | 'date' | 'text'

export interface ItemMeta {
  label: string
  type: SettingType
  /** 服务端内置默认值，仅用于占位提示 / 开关初始态 */
  defaultValue?: string
  unit?: string
}

export const SETTING_META: Record<string, ItemMeta> = {
  'site.url': { label: '站点地址', type: 'url' },
  'site.birth-date': { label: '建站时间', type: 'date' },
  'board.title': { label: '留言板标题', type: 'text' },
  'board.summary': { label: '留言板简介', type: 'text' },
  'comment.auto-approve': { label: '新评论直接过审', type: 'boolean', defaultValue: 'true' },
  'comment.post-interval-seconds': { label: '同 IP 发表间隔', type: 'number', defaultValue: '10', unit: '秒' },
  'comment.notify-mail': { label: '邮件通知', type: 'boolean', defaultValue: 'false' },
  'comment.owner-email': { label: '站长邮箱', type: 'email' },
  'comment.from-email': { label: '发件人地址', type: 'email', defaultValue: 'noreply@example.com' },
  'moments.amapKey': { label: '高德 Web 服务 Key', type: 'text' },
}

const FALLBACK_META: ItemMeta = { label: '', type: 'text' }

export function metaOf(key: string): ItemMeta {
  return SETTING_META[key] ?? FALLBACK_META
}

/** 开关状态：草稿未设置时展示服务端默认值；value 为空字符串表示「默认」 */
export function settingBoolValue(draft: string | number | undefined, item: SettingItem): boolean {
  const raw = String(draft ?? '').trim() || item.value
  if (raw === '') return (metaOf(item.key).defaultValue ?? 'false') === 'true'
  return raw === 'true'
}

/** 未设置时的占位提示 */
export function settingPlaceholder(item: SettingItem): string {
  if (item.value) return ''
  if (item.key === 'comment.owner-email') return '未设置，不通知站长'
  if (item.key === 'site.birth-date') return '未设置，页脚用默认值'
  const d = metaOf(item.key).defaultValue
  return d ? `默认 ${d}` : '未设置'
}

/** 与服务端一致的常用校验正则 / 规则 */
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function isHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}
