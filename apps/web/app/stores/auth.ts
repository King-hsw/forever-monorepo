import { defineStore } from 'pinia'
import type { MeInfo } from '#shared/types'
import { AUTH_COOKIE, apiFetch, clearAuth, loadAuth, saveAuth, type AuthStorage } from '~/utils/api'

interface LoginResponse {
  accessToken: string
  expiresIn: number
}

export const useAuthStore = defineStore('admin-auth', () => {
  const token = ref<string | null>(null)
  const username = ref<string | null>(null)
  const isAuthenticated = computed(() => !!token.value)

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
    if (token.value) return
    if (import.meta.server) {
      const auth = parseAuthCookie()
      if (auth) {
        token.value = auth.token
        username.value = auth.username
      }
      return
    }
    const auth = loadAuth()
    if (auth) {
      token.value = auth.token
      username.value = auth.username
    }
  }

  /** 调用后端 /api/auth/login 登录，成功返回 true */
  async function login(user: string, password: string): Promise<boolean> {
    try {
      const data = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { username: user, password },
      })
      // 用新令牌拉取当前用户信息，确认令牌可用并取真实用户名
      const me = await apiFetch<MeInfo>('/api/admin/me', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      }).catch(() => null)

      token.value = data.accessToken
      username.value = me?.username ?? user
      saveAuth(data.accessToken, username.value)
      return true
    } catch {
      return false
    }
  }

  function logout() {
    token.value = null
    username.value = null
    clearAuth()
  }

  return { token, username, isAuthenticated, hydrate, login, logout }
})
