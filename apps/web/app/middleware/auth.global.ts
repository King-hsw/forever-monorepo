export default defineNuxtRouteMiddleware((to) => {
  // localStorage 仅客户端可用，SSR 阶段放行，由客户端接管跳转
  if (import.meta.server) return

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
})
