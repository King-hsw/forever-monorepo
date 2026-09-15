/**
 * 路由入口
 *
 * 业务路由按模块放在 src/router/modules/*.ts，每份模块 export default 一个 RouteRecordRaw[]，
 * 这里用 import.meta.glob 自动收集，新增模块无需改动本文件。
 *
 * 权限控制采用「固定路由 + 运行时校验」：菜单不随角色变化，
 * 具体能不能操作由 useUserStore().hasPermission(权限码) 在页面内判断。
 */
import isObject from 'lodash/isObject';
import uniq from 'lodash/uniq';
import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';

import { PAGE_NOT_FOUND_ROUTE } from '@/utils/route/constant';

// 收集业务路由模块
const modules = import.meta.glob('./modules/**/*.ts', { eager: true });

// 固定路由
const defaultRouterList: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/login/index.vue'),
  },
  {
    path: '/',
    redirect: '/dashboard/index',
  },
];

// 业务路由
export const fixedRouterList: Array<RouteRecordRaw> = mapModuleRouterList(modules);

export const allRoutes: Array<RouteRecordRaw> = [...fixedRouterList, ...defaultRouterList, PAGE_NOT_FOUND_ROUTE];

// 路由模块转换为路由
export function mapModuleRouterList(moduleMap: Record<string, unknown>): Array<RouteRecordRaw> {
  const routerList: Array<RouteRecordRaw> = [];
  Object.keys(moduleMap).forEach((key) => {
    const routeModule = moduleMap[key];
    if (isObject(routeModule) && 'default' in routeModule) {
      const route = (routeModule as { default: unknown }).default;
      const routes = Array.isArray(route) ? [...route] : [route];
      routerList.push(...(routes as RouteRecordRaw[]));
    }
  });
  return routerList;
}

/** 取当前路由的前 n 级路径，供侧边栏展开态使用 */
export const getActive = (maxLevel = 3): string => {
  const route = router.currentRoute.value;

  if (!route.path) {
    return '';
  }

  return route.path
    .split('/')
    .filter((_item: string, index: number) => index <= maxLevel && index > 0)
    .map((item: string) => `/${item}`)
    .join('');
};

/** 侧边栏展开的父级菜单路径 */
export const getRoutesExpanded = (): string[] => {
  const expandedRoutes: string[] = [];

  fixedRouterList.forEach((item) => {
    if (item.meta?.expanded) {
      expandedRoutes.push(item.path);
    }
    if (item.children && item.children.length > 0) {
      item.children
        .filter((child) => child.meta?.expanded)
        .forEach(() => {
          expandedRoutes.push(item.path);
        });
    }
  });
  return uniq(expandedRoutes);
};

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes: allRoutes,
  scrollBehavior() {
    return {
      el: '#app',
      top: 0,
      behavior: 'smooth',
    };
  },
});

export default router;
