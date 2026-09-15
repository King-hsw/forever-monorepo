/**
 * 当前登录用户：令牌、身份、角色与权限码
 *
 * 令牌为 Bearer 双令牌（access + refresh），由后端 /api/auth/login 签发。
 * 权限码来自 /api/admin/me 的 permissions 数组，用于按钮级与菜单级控制。
 *
 * 持久化只保留令牌与用户名：权限每次进入应用重新拉取，
 * 保证后台改了角色权限后前端立即生效，不会用到过期的本地缓存。
 */
import { defineStore } from 'pinia';

import * as authApi from '@/api/auth';
import type { LoginRequest, LoginResponse } from '@/api/model/types';

interface UserState {
  accessToken: string;
  refreshToken: string;
  uid: number | null;
  username: string;
  nickname: string;
  avatarUrl: string;
  roles: string[];
  permissions: string[];
  /** 是否已成功拉取过身份信息；用于路由守卫判断是否需要补拉 */
  loaded: boolean;
}

function emptyState(): UserState {
  return {
    accessToken: '',
    refreshToken: '',
    uid: null,
    username: '',
    nickname: '',
    avatarUrl: '',
    roles: [],
    permissions: [],
    loaded: false,
  };
}

export const useUserStore = defineStore('user', {
  state: (): UserState => emptyState(),
  getters: {
    /** 兼容既有调用方（路由守卫等）的登录判断 */
    token: (state): string => state.accessToken,
    isLoggedIn: (state): boolean => Boolean(state.accessToken),
    /** 展示名优先用昵称，回退到用户名 */
    displayName: (state): string => state.nickname || state.username,
    /** 是否管理员角色 */
    isAdmin: (state): boolean => state.roles.includes('ADMIN'),
  },
  actions: {
    /** 仅写入令牌，供请求层刷新成功后回写 */
    setToken(payload: Pick<LoginResponse, 'accessToken' | 'refreshToken'>) {
      this.accessToken = payload.accessToken;
      this.refreshToken = payload.refreshToken;
    },

    /** 登录：拿到令牌后立即拉取身份，避免首屏出现无权访问的闪断 */
    async login(payload: LoginRequest) {
      const res = await authApi.login(payload);
      this.setToken(res);
      await this.fetchUserInfo();
      return res;
    },

    /** 拉取当前用户身份与权限 */
    async fetchUserInfo() {
      const me = await authApi.getMe();
      this.uid = me.uid;
      this.username = me.username;
      this.roles = me.roles ?? [];
      this.permissions = me.permissions ?? [];
      this.loaded = true;

      // 昵称与头像单独取；该接口失败不应阻断整个登录流程
      try {
        const profile = await authApi.getProfile();
        this.nickname = profile.nickname || profile.username;
        this.avatarUrl = profile.avatarUrl;
      } catch {
        this.nickname = me.username;
        this.avatarUrl = '';
      }
      return me;
    },

    /** 清空本地登录态（不调后端），供请求层令牌失效时调用 */
    resetAuth() {
      Object.assign(this, emptyState());
    },

    /** 主动登出：先清本地再通知后端吊销令牌，避免接口失败卡住界面 */
    async logout() {
      const { refreshToken } = this;
      this.resetAuth();
      if (refreshToken) {
        try {
          await authApi.logout({ refreshToken });
        } catch {
          // 登出接口幂等，后端失败也不影响本地已登出的事实
        }
      }
    },

    /** 按钮级权限判断：未声明权限码的按钮一律放行，ADMIN 角色直通 */
    hasPermission(code?: string): boolean {
      if (!code) return true;
      if (this.roles.includes('ADMIN')) return true;
      return this.permissions.includes(code);
    },
  },
  persist: {
    key: 'forever-admin-user',
    pick: ['accessToken', 'refreshToken', 'username'],
  },
});
