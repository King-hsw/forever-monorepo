/** demo 专用：取消订阅，按 endpoint 删除服务端记录 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ endpoint?: unknown }>(event)
  if (typeof body?.endpoint !== 'string')
    throw createError({ statusCode: 400, statusMessage: 'endpoint required' })

  const subs = await listSubscriptions()
  const next = subs.filter(s => s.endpoint !== body.endpoint)
  await saveSubscriptions(next)
  return { ok: true, total: next.length }
})
