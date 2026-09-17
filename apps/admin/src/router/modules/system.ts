import { UsergroupIcon } from 'tdesign-icons-vue-next';
import { shallowRef } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import { LAYOUT } from '@/utils/route/constant';

export default [
  {
    path: '/system',
    component: LAYOUT,
    name: 'SystemRoot',
    redirect: '/system/users',
    meta: {
      title: '系统管理',
      icon: shallowRef(UsergroupIcon),
      orderNo: 4,
    },
    children: [
      {
        path: 'users',
        name: 'UserList',
        component: () => import('@/pages/system/users/index.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: 'roles',
        name: 'RoleList',
        component: () => import('@/pages/system/roles/index.vue'),
        meta: { title: '角色权限' },
      },
    ],
  },
] satisfies RouteRecordRaw[];
