import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 全局守卫:未登录 → /login;已登录访问 /login → /
// 权限门禁:meta.permission fail-closed
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.path === '/login' && auth.isAuthenticated) {
    return { path: '/' }
  }

  // 权限门禁
  if (to.meta.requiresAuth && to.meta.permission) {
    await auth.ensureMe()
    const need = to.meta.permission as string | string[]
    const codes = Array.isArray(need) ? need : [need]
    if (!codes.some(c => auth.hasPermission(c))) {
      return { path: '/' }
    }
  }
})
