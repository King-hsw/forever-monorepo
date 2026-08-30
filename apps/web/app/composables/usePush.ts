/**
 * Web Push 订阅管理：推送接口由 forever-server 提供（/api/v1/push/**，公开），
 * dev 经 devProxy 转发到后端，生产由 nginx 同源转发。管理端测试发送走 /api/admin/push/send。
 */
const PUSH_API = '/api/v1/push'

/** 转换为 pushManager.subscribe 要求的 applicationServerKey（BufferSource） */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++)
    output[i] = raw.charCodeAt(i)
  return buffer
}

/** 环境是否具备 Web Push 条件：安全上下文 + SW + Push API + Notification */
function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

/**
 * 确保 SW 已注册并返回注册对象。
 * dev 下自定义 SW 以模块方式由 vite 提供（dev-sw.js?dev-sw），生产为根路径 sw.js；
 * 显式补注册以保证 demo 自身可用（与 vite-pwa 客户端插件的注册幂等，不冲突）。
 */
async function ensureRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing)
    return existing
  if (import.meta.dev)
    return navigator.serviceWorker.register('/dev-sw.js?dev-sw', { type: 'module' })
  return navigator.serviceWorker.register('/sw.js')
}

export function usePush() {
  const supported = ref<boolean | null>(null)
  const permission = ref<NotificationPermission>('default')
  const subscribed = ref(false)
  const busy = ref(false)
  /** 已订阅时 endpoint 尾段（脱敏展示用） */
  const endpointTail = ref('')

  async function probe() {
    supported.value = pushSupported()
    if (!supported.value)
      return
    permission.value = Notification.permission
    try {
      const reg = await ensureRegistration()
      const sub = await reg.pushManager.getSubscription()
      subscribed.value = !!sub
      endpointTail.value = sub ? sub.endpoint.slice(-8) : ''
    }
    catch {
      // SW 加载失败按未订阅处理，点订阅按钮时会拿到具体报错
    }
  }

  /** 请求权限并完成订阅，订阅结果上报服务端。需在用户手势（按钮点击）中调用 */
  async function enable(): Promise<void> {
    if (!pushSupported())
      throw new Error('当前环境不支持 Web Push（需 HTTPS 且浏览器支持 Push API）')
    busy.value = true
    try {
      const perm = await Notification.requestPermission()
      permission.value = perm
      if (perm !== 'granted')
        throw new Error('通知权限未授予，无法订阅推送')

      const reg = await ensureRegistration()
      const { publicKey } = await apiFetch<{ publicKey: string }>(`${PUSH_API}/vapid`)
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }
      // apiFetch 自动携带登录令牌：管理员订阅时后端会把订阅绑定到当前用户；
      // 显式列字段（PushSubscriptionJSON 无索引签名，直接传过不了 body 的类型）
      const json = sub.toJSON()
      await apiFetch(`${PUSH_API}/subscribe`, {
        method: 'POST',
        body: { endpoint: json.endpoint, keys: json.keys, expirationTime: json.expirationTime ?? null },
      })
      subscribed.value = true
      endpointTail.value = sub.endpoint.slice(-8)
    }
    finally {
      busy.value = false
    }
  }

  /** 取消订阅并通知服务端删除记录 */
  async function disable(): Promise<void> {
    busy.value = true
    try {
      const reg = await ensureRegistration()
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await apiFetch(`${PUSH_API}/unsubscribe`, {
          method: 'POST',
          body: { endpoint: sub.endpoint },
        }).catch(() => {}) // 服务端记录已不存在时也不阻塞本地退订
        await sub.unsubscribe()
      }
      subscribed.value = false
      endpointTail.value = ''
    }
    finally {
      busy.value = false
    }
  }

  /**
   * 评论成功后调用：把浏览器已有的推送订阅静默绑到本条评论邮箱，
   * 服务端据此在评论被回复时定向推送。未订阅/失败都不影响评论流程。
   */
  async function syncSubscriptionEmail(email?: string): Promise<void> {
    if (!email || !pushSupported())
      return
    try {
      const reg = await ensureRegistration()
      const sub = await reg.pushManager.getSubscription()
      if (!sub)
        return
      await apiFetch(`${PUSH_API}/subscribe`, {
        method: 'POST',
        body: { endpoint: sub.endpoint, keys: sub.toJSON().keys, email },
      })
    }
    catch {
      // 归属绑定失败仅影响后续推送定向，不打扰用户
    }
  }

  return { supported, permission, subscribed, busy, endpointTail, probe, enable, disable, syncSubscriptionEmail }
}
