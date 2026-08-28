/**
 * demo 专用：保存浏览器推送订阅（按 endpoint 幂等 upsert）。
 * 正式接入时还需绑定身份：管理员带登录态，游客在评论成功后随邮箱一起上报。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<unknown>(event)
  const sub = normalizeSubscription(body)
  if (!sub)
    throw createError({ statusCode: 400, statusMessage: 'invalid subscription' })

  const subs = await listSubscriptions()
  const existing = subs.findIndex(s => s.endpoint === sub.endpoint)
  if (existing >= 0) {
    // 保留首订时间，刷新密钥（浏览器可能重新生成）
    subs[existing] = { ...sub, addedAt: subs[existing].addedAt, lastSentAt: subs[existing].lastSentAt }
  }
  else {
    subs.push(sub)
  }
  await saveSubscriptions(subs)
  return { ok: true, total: subs.length }
})
