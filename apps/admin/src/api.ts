/**
 * forever-server API 客户端(admin SPA)
 *
 * - 同源请求,/api 由 Vite dev proxy 或 nginx 反代到后端
 * - 统一解包后端 ApiResponse<T>:code === 0 返回 data,否则抛 ApiError
 * - Authorization 用 localStorage 里的 access token
 * - 续期靠父域 HttpOnly `forever_refresh` cookie,浏览器自动携带
 */

const AUTH_KEY = 'forever-admin-auth'

/** 业务错误(后端返回 code !== 0 或 HTTP 层错误) */
export class ApiError extends Error {
  code: number

  constructor(message: string, code = -1) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** 后端 /api/auth/login 的响应体 */
export interface TokenPair {
  accessToken: string
}

/** localStorage 中存储的登录信息 */
export interface AuthStorage {
  accessToken: string
  username: string
}

/** 解析登录信息 JSON:缺 accessToken 视为未登录;username 可空(静默续期拿不到) */
function parseAuth(raw: string | null): AuthStorage | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<AuthStorage>
    if (!value.accessToken) return null
    return {
      accessToken: value.accessToken,
      username: typeof value.username === 'string' ? value.username : '',
    }
  }
  catch {
    return null
  }
}

export function loadAuth(): AuthStorage | null {
  try {
    return parseAuth(localStorage.getItem(AUTH_KEY))
  }
  catch {
    localStorage.removeItem(AUTH_KEY)
    return null
  }
}

export function saveAuth(auth: AuthStorage) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** 普通对象序列化为 JSON;FormData(头像/上传)原样透传 */
  body?: Record<string, unknown> | FormData
  query?: Record<string, unknown>
  headers?: Record<string, string>
}

/** 过滤空查询参数 */
export function cleanQuery(query: object): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '')
      continue
    result[key] = value
  }
  return result
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  if (!query)
    return path
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '')
      continue
    if (Array.isArray(value))
      value.forEach(item => params.append(key, String(item)))
    else
      params.append(key, String(value))
  }
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 静默续期:body 为空,cookie 流。
 * 单飞 + 失败延迟 300ms 重试一次 —— 两个应用同秒启动时,
 * 后发起者手里的 cookie 可能刚被前者轮换掉。
 */
let refreshing: Promise<boolean> | null = null

export function refreshAccessToken(): Promise<boolean> {
  refreshing ??= (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          credentials: 'same-origin',
        })
        if (res.ok) {
          const body = await res.json() as ApiResponse<TokenPair>
          const token = body?.data?.accessToken
          if (body.code === 0 && token) {
            const current = loadAuth()
            saveAuth({ accessToken: token, username: current?.username ?? '' })
            return true
          }
          return false
        }
        // 401 = 无有效 cookie,重试没有意义;其余(网络/5xx)交给重试
        if (res.status === 401)
          return false
      }
      catch {
        // 网络错误,进入重试
      }
      if (attempt === 0)
        await sleep(300)
    }
    return false
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

function handleUnauthorized() {
  clearAuth()
  if (!location.pathname.startsWith('/login'))
    location.href = '/login'
}

/** 发起请求并解包统一响应体 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}, retried = false): Promise<T> {
  const method = options.method ?? 'GET'
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers: Record<string, string> = { ...options.headers }

  const auth = loadAuth()
  if (auth?.accessToken && !headers.Authorization && path !== '/api/auth/login')
    headers.Authorization = `Bearer ${auth.accessToken}`
  if (options.body && !isForm)
    headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body
        ? (isForm ? options.body as FormData : JSON.stringify(options.body))
        : undefined,
      credentials: 'same-origin',
    })
  }
  catch (err) {
    throw new ApiError(err instanceof Error ? err.message : '网络请求失败', -1)
  }

  if (res.status === 401) {
    if (!retried && !path.startsWith('/api/auth/')) {
      if (await refreshAccessToken())
        return apiFetch<T>(path, options, true)
      handleUnauthorized()
    }
    throw new ApiError('登录已过期,请重新登录', 401)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null) as ApiResponse<unknown> | null
    throw new ApiError(body?.message || `请求失败(HTTP ${res.status})`, body?.code ?? res.status)
  }

  // 204 / 空响应体
  if (res.status === 204)
    return undefined as T

  const body = await res.json() as ApiResponse<T>
  if (body.code !== 0)
    throw new ApiError(body.message || '请求失败', body.code)
  return body.data
}

/** 统一错误提示 */
export function errMsg(err: unknown, fallback = '操作失败'): string {
  return err instanceof Error ? err.message : fallback
}
