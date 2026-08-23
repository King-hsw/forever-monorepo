import { defineStore } from 'pinia'
import type { MeInfo } from '#shared/types'
import { apiFetch, clearAuth, loadAuth, saveAuth } from '~/utils/api'

interface LoginResponse {
  accessToken: string
  expiresIn: number
}

export const useAuthStore = defineStore('admin-auth', () => {
  const token = ref<string | null>(null)
  const username = ref<string | null>(null)
  const isAuthenticated = computed(() => !!token.value)

  /** 客户端从 localStorage 恢复登录态（仅执行一次） */
  function hydrate() {
    if (!import.meta.client || token.value) return
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
