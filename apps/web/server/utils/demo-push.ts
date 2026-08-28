import webpush from 'web-push'

/**
 * Web Push demo 专用工具：订阅存储 / VAPID 密钥管理 / 推送发送。
 * 正式接入时这部分职责由 forever-server（Spring Boot）承担：
 *   - 订阅入库（绑定登录用户或游客邮箱）
 *   - VAPID 私钥走后端配置
 *   - 评论等业务事件触发发送
 * 前端接口路径届时从 /demo-push/** 切到 /api/v1/push/** 即可。
 */

export interface DemoPushSubscription {
  endpoint: string
  keys: { p256dh: string, auth: string }
  /** 首次订阅时间（ISO） */
  addedAt: string
  /** 最近一次成功推送时间（ISO），用于排查失效订阅 */
  lastSentAt?: string
}

const SUBS_KEY = 'demo-push:subscriptions'
const VAPID_KEY = 'demo-push:vapid-keys'

/**
 * 取 VAPID 密钥；没有则生成一次并持久化到 .data/kv（dev 重启不丢，删 .data 即重置）。
 * demo 为了零配置直接生成；正式接入由 forever-server 通过环境变量注入，禁止用生成值。
 */
export async function getVapidKeys(): Promise<{ publicKey: string, privateKey: string }> {
  const storage = useStorage('data')
  const saved = await storage.getItem<{ publicKey: string, privateKey: string }>(VAPID_KEY)
  if (saved)
    return saved
  const generated = webpush.generateVAPIDKeys()
  const keys = { publicKey: generated.publicKey, privateKey: generated.privateKey }
  await storage.setItem(VAPID_KEY, keys)
  return keys
}

/** 初始化 web-push 全局 VAPID 签名（幂等，路由每次调用前走一遍，开销可忽略） */
export async function ensureVapidConfigured(): Promise<{ publicKey: string }> {
  const keys = await getVapidKeys()
  webpush.setVapidDetails('mailto:demo@forever.local', keys.publicKey, keys.privateKey)
  return { publicKey: keys.publicKey }
}

export async function listSubscriptions(): Promise<DemoPushSubscription[]> {
  return (await useStorage('data').getItem<DemoPushSubscription[]>(SUBS_KEY)) ?? []
}

export async function saveSubscriptions(subs: DemoPushSubscription[]): Promise<void> {
  await useStorage('data').setItem(SUBS_KEY, subs)
}

/** 校验并规整客户端上交的 PushSubscription JSON，字段不符返回 null */
export function normalizeSubscription(input: unknown): DemoPushSubscription | null {
  if (typeof input !== 'object' || input === null)
    return null
  const { endpoint, keys } = input as Record<string, unknown>
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://'))
    return null
  if (typeof keys !== 'object' || keys === null)
    return null
  const { p256dh, auth } = keys as Record<string, unknown>
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth)
    return null
  return { endpoint, keys: { p256dh, auth }, addedAt: new Date().toISOString() }
}
