import { defineStore } from 'pinia'
import { apiFetch, clearAuth, loadAuth, saveAuth, type TokenPair } from '../api'

/** 与 apps/web 的 MeInfo 类型对齐(薄拷贝) */
interface MeInfo {
  username: string
  permissions: string[]
}

export const useAuthStore = defineStore('admin-auth', {
  state: () => ({
    accessToken: loadAuth()?.accessToken ?? null as string | null,
    username: null as string | null,
    permissions: [] as string[],
    meLoaded: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
  },

  actions: {
    /** 应用启动时调用:无 token 则尝试 cookie 静默续期 */
    async bootstrap() {
      if (this.accessToken) return
      // 无 access token → 尝试 cookie 流 refresh
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '',
          credentials: 'same-origin',
        })
        if (res.ok) {
          const data = await res.json()
          const token: string | undefined = data.data?.accessToken ?? data.accessToken
          if (token) {
            this.accessToken = token
            saveAuth({ accessToken: token })
          }
        }
      } catch {
        // 未登录或网络问题:保持未登录态
      }
    },

    /** 登录:POST /api/auth/login → 保存 accessToken */
    async login(username: string, password: string) {
      const res = await apiFetch<{ accessToken: string; refreshToken: string; username: string }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ username, password }) },
      )
      const data = res.data
      this.accessToken = data.accessToken
      this.username = data.username
      saveAuth({ accessToken: data.accessToken })
    },

    /** 登出:POST /api/auth/logout(cookie 自动携带) → 清本地态 */
    async logout() {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' })
      } catch {
        // 即使后端失败也清本地
      }
      this.$reset()
      clearAuth()
    },

    /** 拉取 /api/admin/me 权限码(fail-closed) */
    async ensureMe() {
      if (this.meLoaded) return
      try {
        const res = await apiFetch<MeInfo>('/api/admin/me')
        this.permissions = res.data.permissions ?? []
        this.username = res.data.username ?? this.username
        this.meLoaded = true
      } catch {
        // 401 由 apiFetch 处理;其他失败保持空权限
      }
    },

    hasPermission(code: string): boolean {
      return this.permissions.includes(code)
    },
  },
})
