import { proxyRequest } from 'h3'

/**
 * /api/** 全量代理到 forever-server
 *
 * - 浏览器与 SSR 的请求统一走这里，避免跨域（CORS）问题；
 * - 后端地址由服务端配置 apiBase（NUXT_API_BASE）控制，默认 http://localhost:8080。
 */
export default defineEventHandler((event) => {
  const base = (useRuntimeConfig(event).apiBase as string).replace(/\/+$/, '')
  const url = new URL(base)

  // 浏览器请求会携带 Origin: http://localhost:3000，会被后端 Spring Security
  // 的 CORS 校验拒绝（403）。改写为后端自身的地址以通过校验。
  event.node.req.headers.origin = url.origin
  event.node.req.headers.referer = `${url.origin}/`
  event.node.req.headers.host = url.host

  return proxyRequest(event, `${base}${event.path}`)
})
