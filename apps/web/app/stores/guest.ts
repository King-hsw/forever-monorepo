import { defineStore } from 'pinia'

/**
 * 游客身份：全站发言的唯一身份来源（评论区 / 聊天页）。
 * 纯客户端持久化（localStorage）：填一次昵称 / 邮箱 / 主页即可全站发言，
 * 无需注册账号密码。
 */
const GUEST_KEY = 'forever-guest'
/** 旧版散落的身份键（文章评论表单 / 聊天页），首次载入时合并迁移 */
const LEGACY_KEYS = ['forever-comment-identity', 'forever-chat-identity'] as const

export interface GuestIdentity {
  nickname: string
  email: string
  site: string
}

type Field = keyof GuestIdentity

function readLocal(key: string): GuestIdentity {
  const empty: GuestIdentity = { nickname: '', email: '', site: '' }
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<GuestIdentity> | null
    if (!data || typeof data !== 'object')
      return empty
    for (const f of Object.keys(empty) as Field[])
      empty[f] = (data[f] ?? '').toString().trim()
    return empty
  }
  catch {
    // 脏数据按空身份处理
    return empty
  }
}

export const useGuestStore = defineStore('guest', () => {
  const nickname = ref('')
  const email = ref('')
  const site = ref('')
  let loaded = false

  /** 已注册 = 昵称 + 邮箱齐备（主页选填） */
  const isRegistered = computed(() => nickname.value !== '' && email.value !== '')

  /** 客户端读取本地身份（SSR 阶段按未注册渲染，挂载后接管） */
  function hydrate() {
    if (import.meta.server || loaded)
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
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify({
        nickname: nickname.value,
        email: email.value,
        site: site.value,
      }))
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
  }

  return { nickname, email, site, isRegistered, hydrate, save, clear }
})
