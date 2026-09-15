/**
 * 认证与当前用户身份
 *
 * 令牌机制：Bearer 双令牌（access + refresh），值为随机不透明串（非 JWT）。
 * access 有效期 2 小时，refresh 30 天；刷新时旧令牌对立即作废（轮换防重放）。
 */
import { request } from '@/utils/request';

import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  MeResponse,
  ProfileResponse,
  ProfileUpdateRequest,
  RefreshRequest,
} from './model/types';

const Api = {
  Login: '/api/auth/login',
  Refresh: '/api/auth/refresh',
  Logout: '/api/auth/logout',
  Me: '/api/admin/me',
  Profile: '/api/admin/profile',
  ProfilePassword: '/api/admin/profile/password',
} as const;

/** 登录，返回令牌对 */
export function login(data: LoginRequest) {
  return request.post<LoginResponse>({ url: Api.Login, data });
}

/**
 * 刷新令牌。
 * 注意：不走 request 实例的 401 重试链路，避免刷新失败时递归。
 */
export function refreshToken(data: RefreshRequest) {
  return request.post<LoginResponse>({ url: Api.Refresh, data }, { withToken: false });
}

/** 登出，吊销该会话令牌对（幂等） */
export function logout(data: RefreshRequest) {
  return request.post<void>({ url: Api.Logout, data }, { withToken: false });
}

/** 当前用户的身份、角色与权限码集合 */
export function getMe() {
  return request.get<MeResponse>({ url: Api.Me });
}

export function getProfile() {
  return request.get<ProfileResponse>({ url: Api.Profile });
}

export function updateProfile(data: ProfileUpdateRequest) {
  return request.put<ProfileResponse>({ url: Api.Profile, data });
}

export function changePassword(data: ChangePasswordRequest) {
  return request.put<Record<string, never>>({ url: Api.ProfilePassword, data });
}
