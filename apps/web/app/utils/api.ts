/**
 * forever-server API 客户端
 *
 * - apiBase 默认为空（同源），开发环境通过 Nitro devProxy 代理到
 *   http://localhost:8080，生产环境可用 NUXT_PUBLIC_API_BASE 覆盖。
 * - 统一解包后端 ApiResponse<T>：code === 0 返回 data，否则抛 ApiError。
 * - 自动携带登录令牌（Authorization: Bearer）。
 */
import type { ApiResponse } from '#shared/types'

const AUTH_KEY = 'forever-admin-auth'
/** 镜像 cookie 有效期（秒）；token 本身以后端的过期时间为准，这里只需足够长 */
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

/** 业务错误（后端返回 code !== 0 或 HTTP 层错误） */
export class ApiError extends Error {
  code: number

  constructor(message: string, code = -1) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** 登录信息的镜像 cookie 名；SSR 端据此判断登录态（值与 localStorage 相同的 JSON） */
export const AUTH_COOKIE = 'forever-admin-auth'

/** 后端 /api/auth/login 与 /api/auth/refresh 的响应体 */
export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshExpiresIn: number
}

export interface AuthStorage {
  accessToken: string
  refreshToken: string
  username: string
}

/** 解析登录信息 JSON，缺字段（如旧版单 token 格式）视为未登录 */
function parseAuth(raw: string | undefined | null): AuthStorage | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<AuthStorage>
    if (!value.accessToken || !value.refreshToken || !value.username) return null
    return value as AuthStorage
  } catch {
    return null
  }
}

/** 从 localStorage 读取登录信息（SSR 阶段返回 null） */
export function loadAuth(): AuthStorage | null {
  if (!import.meta.client) return null
  try {
    return parseAuth(localStorage.getItem(AUTH_KEY))
  } catch {
    localStorage.removeItem(AUTH_KEY)
    return null
  }
}

/** 从镜像 cookie 读取登录信息（SSR 端可用；值与 localStorage 相同） */
export function loadAuthFromCookie(): AuthStorage | null {
  // Nuxt 的 useCookie 默认用 destr 解析，JSON 字符串会直接得到对象
  const value = useCookie<AuthStorage | string | null>(AUTH_COOKIE).value
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return parseAuth(value)
  }
  catch {
    return null
  }
}

export function saveAuth(auth: AuthStorage) {
  if (!import.meta.client) return
  const raw = JSON.stringify(auth)
  localStorage.setItem(AUTH_KEY, raw)
  // 镜像一份到 cookie，让 Nuxt SSR 渲染时能感知登录态
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(raw)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; samesite=lax`
}

export function clearAuth() {
  if (!import.meta.client) return
  localStorage.removeItem(AUTH_KEY)
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; samesite=lax`
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** 普通对象序列化为 JSON；FormData（如头像上传）原样透传 */
  body?: Record<string, unknown> | FormData
  query?: Record<string, unknown>
  /** 额外请求头（如登录时令牌尚未落盘，需要显式传入） */
  headers?: Record<string, string>
}

/** 请求失败时清除本地登录态并跳转登录页（仅客户端执行一次） */
function handleUnauthorized() {
  if (!import.meta.client) return
  clearAuth()
  window.location.href = '/admin/login'
}

/** 单飞刷新：并发多个 401 只发一次 /api/auth/refresh，成功返回 true */
let refreshing: Promise<boolean> | null = null
function refreshToken(): Promise<boolean> {
  if (!import.meta.client) return Promise.resolve(false)
  refreshing ??= (async () => {
    try {
      const current = loadAuth()
      if (!current) return false
      const config = useRuntimeConfig()
      const base = config.public.apiBase as string
      // 直接 $fetch 而非 apiFetch，避免递归触发刷新
      const res = await $fetch<ApiResponse<Pick<TokenPair, 'accessToken' | 'refreshToken'>>>(
        `${base}/api/auth/refresh`,
        { method: 'POST', body: { refreshToken: current.refreshToken } },
      )
      if (res.code !== 0) return false
      saveAuth({ ...current, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken })
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/**
 * 发起 API 请求并解包统一响应体。
 * 失败时抛出 ApiError；业务请求 401 时先用 refreshToken 静默续期重试一次，
 * 刷新失败才清除本地登录态并跳转登录页。
 *
 * 服务端请求统一留痕：SSR 阶段 useAsyncData 会吞掉失败（页面静默空白），
 * 每个请求打一行概要（方法/路径/耗时/业务码）加一行响应结果，失败打一行错误。
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}, retried = false): Promise<T> {
  // devProxy 只对浏览器请求生效；SSR 内部 $fetch 必须直连后端地址
  const config = useRuntimeConfig()
  const base = import.meta.server ? (config.apiBase as string) : (config.public.apiBase as string)
  const method = options.method ?? 'GET'
  const startedAt = Date.now()
  const headers: Record<string, string> = { ...options.headers }

  // 登录接口不附加旧令牌，避免后端优先校验过期 token 导致永远 401；
  // 显式传入 Authorization 头时不覆盖，供特殊会话场景使用。
  // SSR 阶段 localStorage 不可用，改从镜像 cookie 取令牌（需 Nuxt 请求上下文）
  const auth = import.meta.server ? loadAuthFromCookie() : loadAuth()
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
    if (status === 401) {
      // 登录接口自身的 401 是“账号或密码错误”，不能触发刷新/跳转，
      // 否则登录页会被整页刷新，错误提示根本来不及显示
      if (!retried && !path.startsWith('/api/auth/')) {
        if (await refreshToken()) return apiFetch<T>(path, options, true)
        handleUnauthorized()
      }
      console.error(`[api] ${method} ${path} 失败 → HTTP 401 (${Date.now() - startedAt}ms)`)
      throw new ApiError('登录已过期，请重新登录', 401)
    }
    const message
      = (err as { data?: { message?: string } })?.data?.message
        ?? (err instanceof Error ? err.message : '网络请求失败')
    console.error(`[api] ${method} ${path} 失败 → HTTP ${status ?? '网络错误'} (${Date.now() - startedAt}ms): ${message}`)
    throw new ApiError(message, status ?? -1)
  }

  // 服务端把每次请求与响应结果落到日志（终端 / docker logs 可见）；
  // 响应体截断到 2000 字符——首页一次拉 1000 篇文章，完整 JSON 可达数 MB，会刷爆日志
  if (import.meta.server) {
    const query = options.query && Object.keys(options.query).length ? ` ${JSON.stringify(options.query)}` : ''
    console.log(`[api] ${method} ${path}${query} → ${Date.now() - startedAt}ms code=${res.code}${res.code === 0 ? '' : ` 业务失败: ${res.message}`}`)
    const result = JSON.stringify(res.data) || 'null'
    console.log(`[api] ${method} ${path} 响应: ${result.length > 2000 ? `${result.slice(0, 2000)}…(已截断)` : result}`)
  }

  if (res.code !== 0) {
    throw new ApiError(res.message || '请求失败', res.code)
  }
  return res.data
}

/** 统一错误提示：取 err 的 message，非 Error 抛出时用回退文案 */
export function errMsg(err: unknown, fallback = '操作失败'): string {
  return err instanceof Error ? err.message : fallback
}

/**
 * 过滤掉 null / undefined / 空字符串的查询参数。
 * 入参用 object 而非 Record<string, unknown>，接口定义的查询类型（如 AdminArticleQuery）可直接传入。
 */
export function cleanQuery(query: object): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue
    result[key] = value
  }
  return result
}
