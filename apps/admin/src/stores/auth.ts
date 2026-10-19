import { defineStore } from 'pinia'
import { apiFetch, clearAuth, loadAuth, refreshAccessToken, saveAuth } from '../api'
import type { MeInfo } from '~/types'

interface LoginResult {
  accessToken: string
  username: string
}

export const useAuthStore = defineStore('admin-auth', {
  state: () => {
    const stored = loadAuth()
    return {
      accessToken: stored?.accessToken ?? null as string | null,
      username: stored?.username || null as string | null,
      permissions: [] as string[],
      meLoaded: false,
    }
  },

  getters: {
    isAuthenticated: state => !!state.accessToken,
  },

  actions: {
    /** 应用启动时调用:无 token 则用父域 HttpOnly cookie 静默续期 */
    async bootstrap() {
      if (this.accessToken)
        return
      if (await refreshAccessToken())
        this.accessToken = loadAuth()?.accessToken ?? null
    },

    /** 登录:POST /api/auth/login(cookie 由后端种),随后拉权限码 */
    async login(username: string, password: string) {
      const data = await apiFetch<LoginResult>('/api/auth/login', {
        method: 'POST',
        body: { username, password },
      })
      this.accessToken = data.accessToken
      this.username = data.username ?? username
      this.meLoaded = false
      saveAuth({ accessToken: data.accessToken, username: this.username ?? '' })
      await this.ensureMe()
    },

    /** 拉取 /api/admin/me 权限码(fail-closed:失败保持空权限) */
    async ensureMe(force = false) {
      if (!force && this.meLoaded)
        return
      if (!this.accessToken)
        return
      try {
        const me = await apiFetch<MeInfo>('/api/admin/me')
        this.permissions = me.permissions ?? []
        this.username = me.username ?? this.username
        this.meLoaded = true
      }
      catch {
        // 网络失败保持空权限,下次导航会重试
      }
    },

    hasPermission(code: string): boolean {
      return this.permissions.includes(code)
    },

    /** 登出:后端清 cookie + 吊销 refresh,本地清态 */
    async logout() {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST', body: {} })
      }
      catch {
        // 幂等,忽略
      }
      // 先清 localStorage 再 $reset:state() 初始化会重新读一次存储
      clearAuth()
      this.$reset()
    },
  },
})
