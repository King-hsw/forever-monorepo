/**
 * Web Push 订阅管理。
 * demo 阶段推送接口走本站 Nitro 的 /demo-push/**（server/routes/demo-push），
 * 正式接入 forever-server 后只需把 PUSH_API 换成后端路径。
 */
const PUSH_API = '/demo-push'

interface PushSubJson {
  endpoint: string
  keys: { p256dh: string, auth: string }
  expirationTime?: number | null
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++)
    output[i] = raw.charCodeAt(i)
  return output
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
      const { publicKey } = await $fetch<{ publicKey: string }>(`${PUSH_API}/vapid`)
      let sub = await reg.pushManager.getSubscription() as PushSubJson | null
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }) as unknown as PushSubJson
      }
      await $fetch(`${PUSH_API}/subscribe`, { method: 'POST', body: sub.toJSON() })
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
        await $fetch(`${PUSH_API}/unsubscribe`, {
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

  return { supported, permission, subscribed, busy, endpointTail, probe, enable, disable }
}
