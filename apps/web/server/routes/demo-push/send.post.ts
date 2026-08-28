import webpush from 'web-push'

/**
 * demo 专用：向全部已存订阅发送一条推送，返回成功/失败计数。
 * 正式接入时由业务事件（新评论、审核通过、系统消息）驱动，
 * 并按订阅归属定向发送，而非全量广播。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ title?: unknown, body?: unknown, url?: unknown }>(event)
  const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : '补陋阁'
  const text = typeof body?.body === 'string' && body.body.trim() ? body.body.trim() : '你有新消息'
  const url = typeof body?.url === 'string' && body.url.startsWith('/') ? body.url : '/'

  await ensureVapidConfigured()
  const subs = await listSubscriptions()
  if (subs.length === 0)
    return { total: 0, sent: 0, failed: 0 }

  const payload = JSON.stringify({ title, body: text, url })
  const results = await Promise.allSettled(subs.map(s => webpush.sendNotification(s, payload)))

  // 404/410 表示订阅已失效（浏览器清数据 / 过期），顺带从存储清理
  const alive: typeof subs = []
  let sent = 0
  let failed = 0
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      sent++
      alive.push({ ...subs[i], lastSentAt: new Date().toISOString() })
      return
    }
    failed++
    const status = (r.reason as { statusCode?: number })?.statusCode
    if (status !== 404 && status !== 410)
      alive.push(subs[i])
  })
  await saveSubscriptions(alive)

  return { total: subs.length, sent, failed }
})
