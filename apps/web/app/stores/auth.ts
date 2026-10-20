import { defineStore } from 'pinia'
import type { MeInfo } from '#shared/types'
import { apiFetch, loadAuth, saveAuth, clearAuth } from '~/utils/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const username = ref<string | null>(null)
  const permissions = ref<string[]>([])
  const isAuthenticated = computed(() => !!token.value)
  const meLoaded = ref(false)

  /**
   * 启动时恢复登录态:
   * 1. 先读 localStorage 中的 access token
   * 2. 没有则尝试 POST /api/auth/refresh(空 body,浏览器自动带 HttpOnly cookie)
   * 3. 失败则保持未登录
   */
  async function bootstrap() {
    if (token.value) return
    const stored = loadAuth()
    if (stored) {
      token.value = stored.accessToken
      username.value = stored.username
      return
    }
    // 无本地 token,尝试静默续期
    try {
      const data = await apiFetch<{ accessToken: string }>('/api/auth/refresh', {
        method: 'POST',
        body: {},
      })
      token.value = data.accessToken
      username.value = null
      saveAuth({ accessToken: data.accessToken, username: '' })
    } catch {
      // 无有效 cookie,保持未登录
    }
  }

  /**
   * SSR 换票:HttpOnly `forever_refresh` 只有服务端能读到。
   * 用 body 流换 access token,并把轮换后的新 refresh 原样(同域属性)写回。
   * 任何失败都按未登录渲染 —— 后端重启/网络抖动不能让整页 500。
   */
  async function ssrExchange() {
    // cookie ref 必须在任何 await 之前同步取好：await 之后再调 useCookie 会丢 Nuxt 上下文
    // （NUXT_E1001）抛错被 catch 吞掉，导致轮换出的新票永远写不回浏览器，旧票已被后端消费，
    // 整站登录态在一次 SSR 导航后必死
    const config = useRuntimeConfig()
    const refreshCookie = useCookie<string | null>('forever_refresh', {
      httpOnly: true,
      // 本地 HTTP+局域网 IP 开发时后端 cookie 不带 Secure，回写保持一致，否则浏览器丢弃
      secure: config.authCookieSecure !== false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      // 生产写父域(两个子域共享);本地为空省略 Domain
      domain: (config.authCookieDomain as string) || undefined,
    })
    if (!refreshCookie.value) return
    try {
      const res = await $fetch<{
        code: number
        data?: { accessToken?: string, refreshToken?: string | null }
      }>(`${config.apiBase}/api/auth/refresh`, {
        method: 'POST',
        body: { token: refreshCookie.value },
      })
      const access = res?.data?.accessToken
      if (res?.code !== 0 || !access) return
      token.value = access
      const rotated = res.data?.refreshToken
      // 赋值不依赖 Nuxt 上下文，await 之后安全
      if (rotated) refreshCookie.value = rotated
    } catch {
      // 换票失败:按未登录渲染
    }
  }

  async function ensureMe() {
    if (meLoaded.value || !token.value) return
    try {
      const me = await apiFetch<MeInfo>('/api/admin/me')
      permissions.value = me.permissions ?? []
      meLoaded.value = true
    } catch { /* 网络失败保持空权限 */ }
  }

  function hasPermission(code: string): boolean {
    return permissions.value.includes(code)
  }

  async function login(user: string, pass: string): Promise<boolean> {
    try {
      const data = await apiFetch<{ accessToken: string }>('/api/auth/login', {
        method: 'POST',
        body: { username: user, password: pass },
      })
      const me = await apiFetch<MeInfo>('/api/admin/me', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      }).catch(() => null)

      token.value = data.accessToken
      username.value = me?.username ?? user
      permissions.value = me?.permissions ?? []
      meLoaded.value = true
      saveAuth({ accessToken: data.accessToken, username: username.value ?? '' })
      return true
    } catch {
      return false
    }
  }

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', body: {} })
    } catch { /* 幂等,忽略 */ }
    token.value = null
    username.value = null
    permissions.value = []
    meLoaded.value = false
    clearAuth()
  }

  /**
   * 恢复登录态(仅客户端):从 localStorage 读 access token。
   * SSR 阶段 HttpOnly cookie 换票尚未接入,服务端先按未登录渲染,
   * 客户端挂载后由 hydrate/bootstrap 校正,不影响首屏可用性。
   */
  function hydrate() {
    if (import.meta.server) return
    if (token.value) return
    const stored = loadAuth()
    if (!stored) return
    token.value = stored.accessToken
    username.value = stored.username || null
  }

  return {
    token,
    username,
    permissions,
    isAuthenticated,
    meLoaded,
    bootstrap,
    ssrExchange,
    hydrate,
    login,
    logout,
    ensureMe,
    hasPermission,
  }
})
