/**
 * 轻量 API 层:fetch + Bearer token 自动附加 + 401 静默续期。
 * 与 apps/web 的 apiFetch 同构,但不依赖 Nuxt/$fetch。
 */

const AUTH_KEY = 'forever-admin-auth'

export interface TokenPair {
  accessToken: string
}

export function loadAuth(): TokenPair | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // 宽松解析:旧格式可能含 refreshToken 字段,忽略即可
    if (typeof parsed?.accessToken === 'string') {
      return { accessToken: parsed.accessToken }
    }
    return null
  } catch {
    return null
  }
}

export function saveAuth(pair: TokenPair): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(pair))
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY)
}

/** 单飞 refresh:并发 401 只发一次 /api/auth/refresh */
let refreshPromise: Promise<string> | null = null

async function doRefresh(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '',
          credentials: 'same-origin',
        })
        if (!res.ok) throw new Error(`refresh ${res.status}`)
        const data = await res.json()
        const token: string = data.data?.accessToken ?? data.accessToken
        if (!token) throw new Error('no token in refresh response')
        return token
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

/** 401 时尝试续期一次;失败抛错由调用方处理 */
async function handle401(): Promise<string> {
  try {
    const token = await doRefresh()
    saveAuth({ accessToken: token })
    return token
  } catch {
    clearAuth()
    window.location.href = '/login'
    throw new Error('auth expired')
  }
}

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<ApiResponse<T>> {
  const doFetch = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return fetch(path, { ...options, headers, credentials: 'same-origin' })
  }

  const auth = loadAuth()
  let res = await doFetch(auth?.accessToken ?? null)

  if (res.status === 401 && auth) {
    const newToken = await handle401()
    res = await doFetch(newToken)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: res.status, message: res.statusText }))
    throw new Error(`API ${res.status}: ${body.message ?? res.statusText}`)
  }

  return res.json()
}
