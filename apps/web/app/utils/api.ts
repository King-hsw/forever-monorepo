/**
 * forever-server API 客户端
 *
 * - apiBase 默认为空（同源），开发环境通过 Nitro devProxy 代理到
 *   http://localhost:8080，生产环境可用 NUXT_PUBLIC_API_BASE 覆盖。
 * - 统一解包后端 ApiResponse<T>：code === 0 返回 data，否则抛 ApiError。
 * - 自动携带登录令牌（Authorization: Bearer）。
 * - 认证机制:HttpOnly `forever_refresh` cookie 由浏览器自动携带;
 *   access token 存 localStorage 仅供 Bearer 头使用。
 */
import type { ApiResponse } from '#shared/types'

const AUTH_KEY = 'forever-admin-auth'

/** 业务错误（后端返回 code !== 0 或 HTTP 层错误） */
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

/**
 * 解析登录信息 JSON,缺 accessToken 视为未登录。
 * username 允许为空:静默续期只拿得到 accessToken,用户名随后由 /api/admin/me 回填。
 */
function parseAuth(raw: string | undefined | null): AuthStorage | null {
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

/** 从 localStorage 读取登录信息(SSR 阶段返回 null) */
export function loadAuth(): AuthStorage | null {
  if (!import.meta.client) return null
  try {
    return parseAuth(localStorage.getItem(AUTH_KEY))
  } catch {
    localStorage.removeItem(AUTH_KEY)
    return null
  }
}

/** 保存登录信息到 localStorage(不再写 mirror cookie) */
export function saveAuth(auth: AuthStorage) {
  if (!import.meta.client) return
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
}

/** 清除本地登录态(不再删 mirror cookie;HttpOnly cookie 由后端管) */
export function clearAuth() {
  if (!import.meta.client) return
  localStorage.removeItem(AUTH_KEY)
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** 普通对象序列化为 JSON;FormData(如头像上传)原样透传 */
  body?: Record<string, unknown> | FormData
  query?: Record<string, unknown>
  /** 额外请求头(如登录时令牌尚未落盘,需要显式传入) */
  headers?: Record<string, string>
}

/** 请求失败时清除本地登录态(不再跳转 /admin/login,该页面已删除) */
function handleUnauthorized() {
  if (!import.meta.client) return
  clearAuth()
}

/**
 * 单飞刷新:并发多个 401 只发一次 /api/auth/refresh。
 * body 为空,浏览器自动携带 HttpOnly `forever_refresh` cookie。
 */
let refreshing: Promise<boolean> | null = null
function refreshToken(): Promise<boolean> {
  if (!import.meta.client) return Promise.resolve(false)
  refreshing ??= (async () => {
    try {
      const config = useRuntimeConfig()
      const base = config.public.apiBase as string
      const res = await $fetch<ApiResponse<TokenPair>>(
        `${base}/api/auth/refresh`,
        { method: 'POST', body: {} },
      )
      if (res.code !== 0) return false
      const current = loadAuth()
      saveAuth({ accessToken: res.data.accessToken, username: current?.username ?? '' })
      return true
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode
      console.error(`[api] POST /api/auth/refresh 失败 → HTTP ${status ?? '网络错误'}`)
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/**
 * 拼出实际发往后端的完整 URL(含 query 串)。
 */
function buildUrl(base: string, path: string, query?: Record<string, unknown>): string {
  const url = `${base}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) value.forEach(item => params.append(key, String(item)))
    else params.append(key, String(value))
  }
  const search = params.toString()
  return search ? `${url}?${search}` : url
}

/**
 * 取失败响应的响应体摘要,用于区分「后端拒的」和「网关拒的」。
 */
function describeBody(err: unknown): string {
  const raw = (err as { data?: unknown; body?: unknown })?.data
    ?? (err as { body?: unknown })?.body
  if (raw === undefined || raw === null || raw === '') return ''
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw)
  return `body=${text.length > 300 ? `${text.slice(0, 300)}…(已截断)` : text}`
}

/**
 * 发起 API 请求并解包统一响应体。
 * 失败时抛出 ApiError;业务请求 401 时先用 refreshToken 静默续期重试一次,
 * 刷新失败才清除本地登录态。
 *
 * SSR 阶段:若 localStorage 无 token,先尝试 refresh(浏览器带 cookie),
 * 拿到 token 后再发业务请求。
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}, retried = false): Promise<T> {
  const config = useRuntimeConfig()
  const base = import.meta.server ? (config.apiBase as string) : (config.public.apiBase as string)
  const url = buildUrl(base, path, options.query)
  const method = options.method ?? 'GET'
  const startedAt = Date.now()
  const headers: Record<string, string> = { ...options.headers }

  // 登录接口不附加旧令牌
  const auth = loadAuth()
  if (auth?.accessToken && !headers.Authorization && path !== '/api/auth/login') {
    headers.Authorization = `Bearer ${auth.accessToken}`
  }

  let res: ApiResponse<T>
  try {
    res = await $fetch<ApiResponse<T>>(`${base}${path}`, {
      method,
      body: options.body,
      query: options.query,
      headers,
    })
  } catch (err) {
    const status = (err as { statusCode?: number; status?: number })?.statusCode
      ?? (err as { status?: number })?.status
    const authFlag = `auth=${headers.Authorization ? '已带 Bearer' : '无令牌'}`
    const detail = `(${Date.now() - startedAt}ms) ${authFlag}`
    if (status === 401) {
      // 登录接口自身的 401 是"账号或密码错误",不能触发刷新
      if (!retried && !path.startsWith('/api/auth/')) {
        if (await refreshToken()) return apiFetch<T>(path, options, true)
        handleUnauthorized()
      }
      console.error(`[api] ${method} ${url} 失败 → HTTP 401 ${detail} ${describeBody(err)}`)
      throw new ApiError('登录已过期,请重新登录', 401)
    }
    const message
      = (err as { data?: { message?: string } })?.data?.message
        ?? (err instanceof Error ? err.message : '网络请求失败')
    console.error(`[api] ${method} ${url} 失败 → HTTP ${status ?? '网络错误'} ${detail}: ${message} ${describeBody(err)}`)
    throw new ApiError(message, status ?? -1)
  }

  if (import.meta.server) {
    console.log(`[api] ${method} ${url} → ${Date.now() - startedAt}ms code=${res.code}`)
  }

  if (res.code !== 0) {
    throw new ApiError(res.message || '请求失败', res.code)
  }
  return res.data
}

/** 统一错误提示:取 err 的 message,非 Error 抛出时用回退文案 */
export function errMsg(err: unknown, fallback = '操作失败'): string {
  return err instanceof Error ? err.message : fallback
}

/**
 * 过滤掉 null / undefined / 空字符串的查询参数。
 */
export function cleanQuery(query: object): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue
    result[key] = value
  }
  return result
}
