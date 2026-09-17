/**
 * 系统管理：RBAC（用户 / 角色 / 权限）
 */
import { request } from '@/utils/request';

import type {
  RoleCreateRequest,
  RolePermissionsRequest,
  RoleView,
  SysPermission,
  SysRole,
  UserCreateRequest,
  UserPasswordResetRequest,
  UserRolesRequest,
  UserStatusRequest,
  UserView,
} from './model/types';

const Api = {
  Users: '/api/admin/users',
  Roles: '/api/admin/roles',
  Permissions: '/api/admin/permissions',
} as const;

/* ---------------- 用户 ---------------- */

/** 全量返回，不分页 */
export function getUserList() {
  return request.get<UserView[]>({ url: Api.Users });
}

export function createUser(data: UserCreateRequest) {
  return request.post<UserView>({ url: Api.Users, data });
}

export function updateUserStatus(id: number, data: UserStatusRequest) {
  return request.put<void>({ url: `${Api.Users}/${id}/status`, data });
}

export function resetUserPassword(id: number, data: UserPasswordResetRequest) {
  return request.put<void>({ url: `${Api.Users}/${id}/password`, data });
}

export function updateUserRoles(id: number, data: UserRolesRequest) {
  return request.put<void>({ url: `${Api.Users}/${id}/roles`, data });
}

/* ---------------- 角色 ---------------- */

/** 每个角色带 permissionIds 集合，用于权限矩阵回显 */
export function getRoleList() {
  return request.get<RoleView[]>({ url: Api.Roles });
}

export function createRole(data: RoleCreateRequest) {
  return request.post<SysRole>({ url: Api.Roles, data });
}

export function deleteRole(id: number) {
  return request.delete<void>({ url: `${Api.Roles}/${id}` });
}

export function updateRolePermissions(id: number, data: RolePermissionsRequest) {
  return request.put<void>({ url: `${Api.Roles}/${id}/permissions`, data });
}

/* ---------------- 权限 ---------------- */

/** 权限码由后端启动时自动注册入库 */
export function getPermissionList() {
  return request.get<SysPermission[]>({ url: Api.Permissions });
}
