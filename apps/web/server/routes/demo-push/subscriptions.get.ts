/** demo 专用：查看当前订阅列表（脱敏，仅显示 endpoint 尾段，方便联调排查） */
export default defineEventHandler(async () => {
  const subs = await listSubscriptions()
  return {
    total: subs.length,
    items: subs.map(s => ({
      endpointTail: s.endpoint.slice(-24),
      addedAt: s.addedAt,
      lastSentAt: s.lastSentAt ?? null,
    })),
  }
})
