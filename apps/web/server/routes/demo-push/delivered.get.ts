/** demo 专用：查询送达回执计数与最近送达时间（页面轮询展示） */
export default defineEventHandler(async () => {
  const storage = useStorage('data')
  const [count, lastAt] = await Promise.all([
    storage.getItem<number>('demo-push:delivered'),
    storage.getItem<string>('demo-push:last-delivered-at'),
  ])
  return { count: count ?? 0, lastAt: lastAt ?? null }
})
