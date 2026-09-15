import { defineStore } from 'pinia'

/**
 * 游客身份：全站发言的唯一身份来源（评论区 / 聊天页）。
 * 客户端持久化（localStorage）并镜像一份同名 cookie 供 SSR 渲染，
 * 填一次昵称 / 邮箱 / 主页即可全站发言，无需注册账号密码。
 */
const GUEST_KEY = 'forever-guest'
/** 镜像 cookie 有效期（秒），与 ssr-width 镜像一致；每次 save 都会续期 */
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
/** 旧版散落的身份键（文章评论表单 / 聊天页），首次载入时合并迁移 */
const LEGACY_KEYS = ['forever-comment-identity', 'forever-chat-identity'] as const

export interface GuestIdentity {
  nickname: string
  email: string
  site: string
}

type Field = keyof GuestIdentity

/** 解析身份 JSON；脏数据按空身份处理 */
function parseIdentity(raw: string | null): GuestIdentity {
  const empty: GuestIdentity = { nickname: '', email: '', site: '' }
  try {
    const data = JSON.parse(raw ?? 'null') as Partial<GuestIdentity> | null
    if (!data || typeof data !== 'object')
      return empty
    for (const f of Object.keys(empty) as Field[])
      empty[f] = (data[f] ?? '').toString().trim()
    return empty
  }
  catch {
    return empty
  }
}

function readLocal(key: string): GuestIdentity {
  try {
    return parseIdentity(localStorage.getItem(key))
  }
  catch {
    return { nickname: '', email: '', site: '' }
  }
}

/** 从镜像 cookie 读取身份（SSR 阶段；值与 localStorage 相同，cookie 名复用 GUEST_KEY） */
function readCookieIdentity(): GuestIdentity {
  // useCookie 默认用 destr 解析，JSON 字符串会直接得到对象
  const value = useCookie<GuestIdentity | string | null>(GUEST_KEY).value
  if (!value)
    return { nickname: '', email: '', site: '' }
  return parseIdentity(typeof value === 'string' ? value : JSON.stringify(value))
}

export const useGuestStore = defineStore('guest', () => {
  const nickname = ref('')
  const email = ref('')
  const site = ref('')
  let loaded = false

  /** 已注册 = 昵称 + 邮箱齐备（主页选填） */
  const isRegistered = computed(() => nickname.value !== '' && email.value !== '')

  /**
   * 恢复身份：服务端读镜像 cookie（SSR 直接渲染正确形态，无挂载后闪烁）；
   * 客户端读 localStorage（水合渲染时状态来自 SSR payload，此为挂载后重同步）
   */
  function hydrate() {
    if (import.meta.server) {
      const data = readCookieIdentity()
      nickname.value = data.nickname
      email.value = data.email
      site.value = data.site
      return
    }
    if (loaded)
      return
    loaded = true

    const fresh = readLocal(GUEST_KEY)
    // 合并旧身份：仅补空缺字段，新身份优先
    const merged: GuestIdentity = { ...fresh }
    for (const f of ['nickname', 'email', 'site'] as Field[]) {
      if (!merged[f])
        merged[f] = LEGACY_KEYS.map(readLocal).find(d => d[f])?.[f] ?? ''
    }
    if (merged.nickname || merged.email)
      save(merged)
    for (const key of LEGACY_KEYS)
      localStorage.removeItem(key)
  }

  function save(data: GuestIdentity) {
    nickname.value = data.nickname.trim()
    email.value = data.email.trim()
    site.value = data.site.trim()
    const raw = JSON.stringify({
      nickname: nickname.value,
      email: email.value,
      site: site.value,
    })
    try {
      localStorage.setItem(GUEST_KEY, raw)
      // 镜像一份到 cookie，让 Nuxt SSR 渲染时能感知身份
      if (import.meta.client)
        document.cookie = `${GUEST_KEY}=${encodeURIComponent(raw)}; path=/; max-age=${GUEST_COOKIE_MAX_AGE}; samesite=lax`
    }
    catch {
      // 隐私模式 / 存储满时写入失败不阻塞发言
    }
  }

  function clear() {
    nickname.value = ''
    email.value = ''
    site.value = ''
    localStorage.removeItem(GUEST_KEY)
    document.cookie = `${GUEST_KEY}=; path=/; max-age=0; samesite=lax`
  }

  return { nickname, email, site, isRegistered, hydrate, save, clear }
})
