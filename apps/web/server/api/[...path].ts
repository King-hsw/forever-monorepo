import { proxyRequest } from 'h3'

/**
 * /api/** 全量代理到 forever-server
 *
 * - 浏览器与 SSR 的请求统一走这里，避免跨域（CORS）问题；
 * - 后端地址由服务端配置 apiBase（NUXT_API_BASE）控制，默认 http://localhost:8080。
 */
export default defineEventHandler((event) => {
  const base = (useRuntimeConfig(event).apiBase as string).replace(/\/+$/, '')
  return proxyRequest(event, `${base}${event.path}`)
})
