import { defineStore } from 'pinia'
import type { MeInfo } from '~/shared/types'
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
      saveAuth({ accessToken: data.accessToken, username: null })
    } catch {
      // 无有效 cookie,保持未登录
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
      saveAuth({ accessToken: data.accessToken, username: username.value })
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

  return {
    token,
    username,
    permissions,
    isAuthenticated,
    meLoaded,
    bootstrap,
    login,
    logout,
    ensureMe,
    hasPermission,
  }
})
