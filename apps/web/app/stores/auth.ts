import { defineStore } from 'pinia'
import type { MeInfo } from '#shared/types'
import { apiFetch, clearAuth, loadAuth, loadAuthFromCookie, saveAuth, type TokenPair } from '~/utils/api'

export const useAuthStore = defineStore('admin-auth', () => {
  const accessToken = ref<string | null>(null)
  const username = ref<string | null>(null)
  const permissions = ref<string[]>([])
  const isAuthenticated = computed(() => !!accessToken.value)
  /** 权限码是否已拉取；放入 state 随 SSR 序列化到客户端，整页加载只拉一次 */
  const meLoaded = ref(false)

  /** 拉取一次 /api/admin/me 的权限码（进入后台时）；失败保持空权限（fail-closed），允许下次重试，401 由 apiFetch 处理 */
  async function ensureMe() {
    if (meLoaded.value || !accessToken.value) return
    try {
      const me = await apiFetch<MeInfo>('/api/admin/me')
      permissions.value = me.permissions ?? []
      meLoaded.value = true
    } catch { /* 网络失败保持空权限，登出/重新登录时重置 */ }
  }

  function hasPermission(code: string): boolean {
    return permissions.value.includes(code)
  }

  /** 恢复登录态：客户端读 localStorage，服务端读镜像 cookie（仅执行一次） */
  function hydrate() {
    if (accessToken.value) return
    if (import.meta.server) {
      const auth = loadAuthFromCookie()
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
      meLoaded.value = true
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
    meLoaded.value = false
    clearAuth()
  }

  return {
    token: accessToken,
    username,
    permissions,
    meLoaded,
    isAuthenticated,
    hydrate,
    login,
    logout,
    ensureMe,
    hasPermission,
  }
})
