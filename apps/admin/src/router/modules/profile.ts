import { UserCircleIcon } from 'tdesign-icons-vue-next';
import { shallowRef } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import { LAYOUT } from '@/utils/route/constant';

export default [
  {
    path: '/profile',
    component: LAYOUT,
    name: 'ProfileRoot',
    redirect: '/profile/index',
    meta: {
      title: '个人资料',
      icon: shallowRef(UserCircleIcon),
      orderNo: 5,
      single: true,
    },
    children: [
      {
        path: 'index',
        name: 'ProfileIndex',
        component: () => import('@/pages/profile/index.vue'),
        meta: { title: '个人资料' },
      },
    ],
  },
] satisfies RouteRecordRaw[];
