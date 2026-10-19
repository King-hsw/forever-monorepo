import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '../layouts/AdminLayout.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '仪表盘' } },
      { path: 'posts', name: 'posts', component: () => import('../views/posts/Index.vue'), meta: { title: '文章管理', permission: 'article:list' } },
      { path: 'posts/new', name: 'post-new', component: () => import('../views/posts/New.vue'), meta: { title: '新建文章', permission: 'article:create' } },
      { path: 'posts/:id/edit', name: 'post-edit', component: () => import('../views/posts/Edit.vue'), meta: { title: '编辑文章', permission: 'article:update' } },
      { path: 'comments', name: 'comments', component: () => import('../views/Comments.vue'), meta: { title: '评论管理', permission: 'comment:list' } },
      { path: 'categories', name: 'categories', component: () => import('../views/Categories.vue'), meta: { title: '分类 & 标签', permission: 'category:list' } },
      { path: 'permissions', name: 'permissions', component: () => import('../views/Permissions.vue'), meta: { title: '用户权限', permission: 'rbac:role:list' } },
      { path: 'rss', name: 'rss', component: () => import('../views/Rss.vue'), meta: { title: 'RSS 订阅', permission: 'rss:list' } },
      { path: 'friends', name: 'friends', component: () => import('../views/Friends.vue'), meta: { title: '友链管理', permission: 'friend-link:list' } },
      { path: 'settings', name: 'settings', component: () => import('../views/Settings.vue'), meta: { title: '站点设置', permission: 'setting:list' } },
      { path: 'logs', name: 'logs', component: () => import('../views/Logs.vue'), meta: { title: '日志审计', permission: 'log:list' } },
      { path: 'profile', name: 'profile', component: () => import('../views/Profile.vue'), meta: { title: '个人资料' } },
      { path: 'setup', name: 'setup', component: () => import('../views/Setup.vue'), meta: { title: '初始化引导' } },
      // catch-all:未知路径回仪表盘,避免白屏
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  // 冷启动:localStorage 无 token 时先用父域 cookie 静默续期
  await auth.bootstrap()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && auth.isAuthenticated) {
    return '/'
  }

  // 权限门禁:fail-closed,权限码没拉到时按无权限处理
  if (to.meta.requiresAuth && auth.isAuthenticated) {
    await auth.ensureMe()
    const need = to.meta.permission as string | undefined
    if (need && !auth.hasPermission(need)) {
      return '/'
    }
  }
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  if (title)
    document.title = `${title} - 补陋阁后台`
})
