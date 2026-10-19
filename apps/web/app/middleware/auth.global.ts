export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  if (import.meta.server) {
    // 游客身份仍走镜像 cookie(SSR 需要立刻渲染出正确形态)
    useGuestStore().hydrate()
    // 登录态:HttpOnly refresh cookie 只有服务端能读,换票失败按未登录渲染
    await auth.ssrExchange()
    return
  }

  // 客户端:先读 localStorage,没有再静默续期;后台相关分支已随 admin 抽离删除
  auth.hydrate()
  await auth.bootstrap()
})
