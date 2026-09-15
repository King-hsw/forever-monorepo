/**
 * 路由守卫：登录态校验与用户信息预取
 *
 * 菜单为固定业务路由，无需动态注入，因此这里只做三件事：
 *   1. 未登录访问受保护页面 → 跳登录页并带上 redirect
 *   2. 已登录访问登录页 → 跳首页
 *   3. 首次进入或刷新后补拉身份与权限（permissions 用于按钮级控制）
 */
import 'nprogress/nprogress.css'; // progress bar style

import NProgress from 'nprogress'; // progress bar
import { MessagePlugin } from 'tdesign-vue-next';

import router from '@/router';
import { useUserStore } from '@/store';

NProgress.configure({ showSpinner: false });

router.beforeEach(async (to) => {
  NProgress.start();

  const userStore = useUserStore();

  // 未登录
  if (!userStore.isLoggedIn) {
    if (to.path === '/login') return true;
    NProgress.done();
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  // 已登录不再回登录页
  if (to.path === '/login') {
    return { path: '/' };
  }

  // 刷新页面后内存中的身份信息会丢失（持久化只保留令牌），此处补拉一次
  if (!userStore.loaded) {
    try {
      await userStore.fetchUserInfo();
    } catch (error) {
      MessagePlugin.error((error as Error).message || '获取用户信息失败，请重新登录');
      userStore.resetAuth();
      NProgress.done();
      return { path: '/login', query: { redirect: to.fullPath } };
    }
  }

  return true;
});

router.afterEach(() => {
  NProgress.done();
});
