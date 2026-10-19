import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '../layouts/AdminLayout.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
  },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('../views/Dashboard.vue') },
      { path: 'posts', name: 'posts', component: () => import('../views/Posts.vue') },
      { path: 'comments', name: 'comments', component: () => import('../views/Comments.vue') },
      { path: 'categories', name: 'categories', component: () => import('../views/Categories.vue') },
      { path: 'settings', name: 'settings', component: () => import('../views/Settings.vue') },
      { path: 'permissions', name: 'permissions', component: () => import('../views/Placeholder.vue'), meta: { title: '用户权限' } },
      { path: 'rss', name: 'rss', component: () => import('../views/Placeholder.vue'), meta: { title: 'RSS 订阅' } },
      { path: 'friends', name: 'friends', component: () => import('../views/Placeholder.vue'), meta: { title: '友链管理' } },
      { path: 'logs', name: 'logs', component: () => import('../views/Placeholder.vue'), meta: { title: '日志审计' } },
      // catch-all:未知路径回仪表盘,避免白屏
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && auth.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})
