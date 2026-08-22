import { defineStore } from 'pinia'

const STORAGE_KEY = 'forever-admin-auth'
const MOCK_USER = { username: 'admin', password: '123456' }

export const useAuthStore = defineStore('admin-auth', () => {
  const token = ref<string | null>(null)
  const username = ref<string | null>(null)
  const isAuthenticated = computed(() => !!token.value)

  /** 客户端从 localStorage 恢复登录态（仅执行一次） */
  function hydrate() {
    if (!import.meta.client || token.value) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as { token: string; username: string }
        token.value = data.token
        username.value = data.username
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  /** mock 登录：校验账号密码，成功返回 true */
  function login(user: string, password: string): boolean {
    if (user !== MOCK_USER.username || password !== MOCK_USER.password) return false
    token.value = crypto.randomUUID()
    username.value = user
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token.value, username: user }))
    return true
  }

  function logout() {
    token.value = null
    username.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return { token, username, isAuthenticated, hydrate, login, logout }
})
