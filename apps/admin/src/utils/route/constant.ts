export const LAYOUT = () => import('@/layouts/index.vue');

/**
 * 未匹配路由的兜底：重定向到首页。
 * 注意别指向一个没有注册的路径，否则 vue-router 会抛 infinite redirection。
 */
export const PAGE_NOT_FOUND_ROUTE = {
  path: '/:w+',
  name: '404Page',
  redirect: '/dashboard/index',
};
