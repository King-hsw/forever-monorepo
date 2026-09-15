/**
 * 路由与访问控制
 *
 * 本项目菜单为固定业务菜单（见 src/router/modules/blog.ts），不走后端菜单接口，
 * 因此这里只维护免登录白名单，动态路由构建的职责已移除。
 *
 * 细粒度权限（按钮级）由 useUserStore().hasPermission(code) 判断，
 * 权限码来自 /api/admin/me 的 permissions 数组。
 */
import { defineStore } from 'pinia';

/** 无需登录即可访问的路径 */
const WHITE_LIST_ROUTERS = ['/login'];

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    whiteListRouters: [...WHITE_LIST_ROUTERS],
  }),
  actions: {
    /** 判断路径是否在免登录白名单内 */
    isWhiteList(path: string): boolean {
      return this.whiteListRouters.includes(path);
    },
  },
});
