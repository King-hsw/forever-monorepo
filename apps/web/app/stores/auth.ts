import { defineStore } from 'pinia'
import type { MeInfo } from '#shared/types'
import { AUTH_COOKIE, apiFetch, clearAuth, loadAuth, saveAuth, type AuthStorage, type TokenPair } from '~/utils/api'

export const useAuthStore = defineStore('admin-auth', () => {
  const accessToken = ref<string | null>(null)
  const username = ref<string | null>(null)
  const permissions = ref<string[]>([])
  const isAuthenticated = computed(() => !!accessToken.value)
  let meLoaded = false

  /** 拉取一次 /api/admin/me 的权限码（进入后台时）；失败保持空权限（fail-closed），401 由 apiFetch 处理 */
  async function ensureMe() {
    if (meLoaded || !accessToken.value) return
    meLoaded = true
    try {
      const me = await apiFetch<MeInfo>('/api/admin/me')
      permissions.value = me.permissions ?? []
    } catch { /* 网络失败保持空权限，登出/重新登录时重置 */ }
  }

  function hasPermission(code: string): boolean {
    return permissions.value.includes(code)
  }

  /** SSR 端从请求 cookie 解析登录信息；需在 Nuxt 上下文中调用 */
  function parseAuthCookie(): AuthStorage | null {
    // Nuxt 的 useCookie 默认用 destr 解析，JSON 字符串会直接得到对象
    const value = useCookie<AuthStorage | string | null>(AUTH_COOKIE).value
    if (!value) return null
    if (typeof value === 'object') return value
    try {
      return JSON.parse(value) as AuthStorage
    } catch {
      return null
    }
  }

  /** 恢复登录态：客户端读 localStorage，服务端读镜像 cookie（仅执行一次） */
  function hydrate() {
    if (accessToken.value) return
    if (import.meta.server) {
      const auth = parseAuthCookie()
      if (auth) {
        accessToken.value = auth.accessToken
        username.value = auth.username
      }
      return
    }
    const auth = loadAuth()
    if (auth) {
      accessToken.value = auth.accessToken
      username.value = auth.username
    }
  }

  /** 调用后端 /api/auth/login 登录，成功返回 true */
  async function login(user: string, password: string): Promise<boolean> {
    try {
      const data = await apiFetch<TokenPair>('/api/auth/login', {
        method: 'POST',
        body: { username: user, password },
      })
      // 用新令牌拉取当前用户信息，确认令牌可用并取真实用户名与权限
      const me = await apiFetch<MeInfo>('/api/admin/me', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      }).catch(() => null)

      accessToken.value = data.accessToken
      username.value = me?.username ?? user
      permissions.value = me?.permissions ?? []
      meLoaded = true
      saveAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        username: username.value,
      })
      return true
    } catch {
      return false
    }
  }

  /** 吊销后端会话（幂等，失败也照常清除本地登录态）后清理本地 */
  async function logout() {
    const refreshToken = loadAuth()?.refreshToken
    if (refreshToken) {
      await apiFetch('/api/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => {})
    }
    accessToken.value = null
    username.value = null
    permissions.value = []
    meLoaded = false
    clearAuth()
  }

  return {
    token: accessToken,
    username,
    permissions,
    isAuthenticated,
    hydrate,
    login,
    logout,
    ensureMe,
    hasPermission,
  }
})
