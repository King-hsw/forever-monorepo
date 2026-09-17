import { HelpCircleIcon } from 'tdesign-icons-vue-next';
import { shallowRef } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import { LAYOUT } from '@/utils/route/constant';

/**
 * 脚手架使用说明。
 * 迁入真实业务后可以整份删掉（连同 pages/example 与 api/ 里对应的接口）。
 */
export default [
  {
    path: '/example',
    component: LAYOUT,
    name: 'ExampleRoot',
    redirect: '/example/index',
    meta: {
      title: '脚手架说明',
      icon: shallowRef(HelpCircleIcon),
      orderNo: 9,
      single: true,
    },
    children: [
      {
        path: 'index',
        name: 'ExampleIndex',
        component: () => import('@/pages/example/index.vue'),
        meta: { title: '脚手架说明' },
      },
    ],
  },
] satisfies RouteRecordRaw[];
