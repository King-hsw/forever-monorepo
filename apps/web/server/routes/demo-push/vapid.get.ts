/**
 * demo 专用：下发 VAPID 公钥（前端 pushManager.subscribe 需要）。
 * 私钥只留在服务端，正式接入时由 forever-server 提供同语义接口。
 */
export default defineEventHandler(async () => {
  const { publicKey } = await ensureVapidConfigured()
  return { publicKey }
})
