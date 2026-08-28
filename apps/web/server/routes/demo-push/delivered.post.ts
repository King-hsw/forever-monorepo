/** demo 专用：SW 送达回执。收到 push 事件即计数，用于确认「服务端 → 推送服务 → SW」整条链路 */
export default defineEventHandler(async () => {
  const storage = useStorage('data')
  const count = ((await storage.getItem<number>('demo-push:delivered')) ?? 0) + 1
  await storage.setItem('demo-push:delivered', count)
  await storage.setItem('demo-push:last-delivered-at', new Date().toISOString())
  return { ok: true }
})
