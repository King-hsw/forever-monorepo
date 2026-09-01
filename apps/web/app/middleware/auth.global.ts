export default defineNuxtRouteMiddleware(async (to) => {
  // SSR：统一从镜像 cookie 恢复登录态（各页面不再各自 hydrate）；localStorage 仅客户端可用，客户端跳转由下方接管
  if (import.meta.server) {
    useAuthStore().hydrate()
    return
  }

  const auth = useAuthStore()
  auth.hydrate()

  const isAdminPath = to.path.startsWith('/admin')
  const isLoginPage = to.path === '/admin/login'

  if (!auth.isAuthenticated && isAdminPath && !isLoginPage) {
    return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
  }
  if (auth.isAuthenticated && isLoginPage) {
    return navigateTo('/admin')
  }

  // 权限门禁（仅客户端）：走到这里必然已登录（首段未登录访问后台已跳转）。
  // 等权限码就绪后，按页面 meta.permission 判断能否展示
  if (isAdminPath && !isLoginPage) {
    await auth.ensureMe()
    const need = to.meta.permission as string | string[] | undefined
    if (need) {
      const codes = Array.isArray(need) ? need : [need]
      if (!codes.some(c => auth.hasPermission(c))) {
        return navigateTo('/admin')
      }
    }
  }
})
