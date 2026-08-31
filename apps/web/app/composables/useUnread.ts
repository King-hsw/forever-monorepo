/**
 * 未读消息数：模块级单例状态，顶栏（SiteHeader）与左栏（SiteRail）共用。
 * 客户端挂载后拉取一次，之后每 5 分钟刷新；未登录归零。
 */
import type { UnreadCount } from '#shared/types'

const count = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

async function refresh() {
  if (!import.meta.client) return
  if (!useAuthStore().isAuthenticated) {
    count.value = 0
    return
  }
  try {
    count.value = (await apiFetch<UnreadCount>('/api/v1/messages/unread-count')).count
  }
  catch {
    count.value = 0
  }
}

function start() {
  if (timer || !import.meta.client) return
  void refresh()
  timer = setInterval(() => void refresh(), 5 * 60 * 1000)
}

export function useUnread() {
  start()
  return { count, refresh }
}
