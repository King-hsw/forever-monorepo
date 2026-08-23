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

/** 业务错误（后端返回 code !== 0 或 HTTP 层错误） */
export class ApiError extends Error {
  code: number

  constructor(message: string, code = -1) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

interface AuthStorage {
  token: string
  username: string
}

/** 从 localStorage 读取登录信息（SSR 阶段返回 null） */
export function loadAuth(): AuthStorage | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as AuthStorage) : null
  } catch {
    localStorage.removeItem(AUTH_KEY)
    return null
  }
}

export function saveAuth(token: string, username: string) {
  if (!import.meta.client) return
  localStorage.setItem(AUTH_KEY, JSON.stringify({ token, username }))
}

export function clearAuth() {
  if (!import.meta.client) return
  localStorage.removeItem(AUTH_KEY)
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
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

/**
 * 发起 API 请求并解包统一响应体。
 * 失败时抛出 ApiError；401 会清除本地登录态并跳转登录页。
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const base = useRuntimeConfig().public.apiBase as string
  const headers: Record<string, string> = { ...options.headers }

  const auth = loadAuth()
  if (auth?.token && !headers.Authorization) {
    headers.Authorization = `Bearer ${auth.token}`
  }

  let res: ApiResponse<T>
  try {
    res = await $fetch<ApiResponse<T>>(`${base}${path}`, {
      method: options.method ?? 'GET',
      body: options.body,
      query: options.query,
      headers,
    })
  } catch (err) {
    const status = (err as { statusCode?: number; status?: number })?.statusCode
      ?? (err as { status?: number })?.status
    if (status === 401) {
      handleUnauthorized()
      throw new ApiError('登录已过期，请重新登录', 401)
    }
    const message
      = (err as { data?: { message?: string } })?.data?.message
        ?? (err instanceof Error ? err.message : '网络请求失败')
    throw new ApiError(message, status ?? -1)
  }

  if (res.code !== 0) {
    throw new ApiError(res.message || '请求失败', res.code)
  }
  return res.data
}

/** 过滤掉 null / undefined / 空字符串的查询参数 */
export function cleanQuery(query: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue
    result[key] = value
  }
  return result
}
