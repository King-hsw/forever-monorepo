/**
 * 后台业务路由与侧边导航菜单
 *
 * meta 约定（见 layouts/components/MenuContent.vue）：
 *   title    { zh_CN, en_US } 本地化标题
 *   icon     图标组件（shallowRef 包裹）或字符串图标名
 *   orderNo  同级排序，越小越靠前
 *   hidden   true 则不在侧边栏显示（编辑页等细节页面）
 */
import {
  ArticleIcon,
  BookmarkIcon,
  ChatIcon,
  DashboardIcon,
  FileIcon,
  FolderIcon,
  HistoryIcon,
  ImageIcon,
  LinkIcon,
  RssIcon,
  SecuredIcon,
  SettingIcon,
  UsergroupIcon,
  UserIcon,
} from 'tdesign-icons-vue-next';
import { shallowRef } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import { LAYOUT } from '@/utils/route/constant';

export default [
  {
    path: '/dashboard',
    component: LAYOUT,
    name: 'DashboardRoot',
    redirect: '/dashboard/index',
    meta: {
      title: { zh_CN: '仪表盘', en_US: 'Dashboard' },
      icon: shallowRef(DashboardIcon),
      orderNo: 0,
      single: true,
    },
    children: [
      {
        path: 'index',
        name: 'DashboardIndex',
        component: () => import('@/pages/dashboard/index.vue'),
        meta: { title: { zh_CN: '概览', en_US: 'Overview' } },
      },
    ],
  },

  {
    path: '/content',
    component: LAYOUT,
    name: 'ContentRoot',
    redirect: '/content/articles',
    meta: {
      title: { zh_CN: '内容管理', en_US: 'Content' },
      icon: shallowRef(ArticleIcon),
      orderNo: 1,
    },
    children: [
      {
        path: 'articles',
        name: 'ArticleList',
        component: () => import('@/pages/content/articles/index.vue'),
        meta: { title: { zh_CN: '文章管理', en_US: 'Articles' }, icon: shallowRef(FileIcon) },
      },
      {
        path: 'articles/new',
        name: 'ArticleCreate',
        component: () => import('@/pages/content/articles/edit.vue'),
        meta: { title: { zh_CN: '写文章', en_US: 'New Article' }, hidden: true },
      },
      {
        path: 'articles/:id/edit',
        name: 'ArticleEdit',
        component: () => import('@/pages/content/articles/edit.vue'),
        meta: { title: { zh_CN: '编辑文章', en_US: 'Edit Article' }, hidden: true },
      },
      {
        path: 'categories',
        name: 'CategoryList',
        component: () => import('@/pages/content/categories/index.vue'),
        meta: { title: { zh_CN: '分类管理', en_US: 'Categories' }, icon: shallowRef(FolderIcon) },
      },
      {
        path: 'tags',
        name: 'TagList',
        component: () => import('@/pages/content/tags/index.vue'),
        meta: { title: { zh_CN: '标签管理', en_US: 'Tags' }, icon: shallowRef(BookmarkIcon) },
      },
    ],
  },

  {
    path: '/interaction',
    component: LAYOUT,
    name: 'InteractionRoot',
    redirect: '/interaction/comments',
    meta: {
      title: { zh_CN: '互动管理', en_US: 'Interaction' },
      icon: shallowRef(ChatIcon),
      orderNo: 2,
    },
    children: [
      {
        path: 'comments',
        name: 'CommentList',
        component: () => import('@/pages/interaction/comments/index.vue'),
        meta: { title: { zh_CN: '评论与留言', en_US: 'Comments' }, icon: shallowRef(ChatIcon) },
      },
      {
        path: 'friend-links',
        name: 'FriendLinkList',
        component: () => import('@/pages/interaction/friend-links/index.vue'),
        meta: { title: { zh_CN: '友情链接', en_US: 'Friend Links' }, icon: shallowRef(LinkIcon) },
      },
      {
        path: 'moments',
        name: 'MomentList',
        component: () => import('@/pages/interaction/moments/index.vue'),
        meta: { title: { zh_CN: '动态管理', en_US: 'Moments' }, icon: shallowRef(ImageIcon) },
      },
    ],
  },

  {
    path: '/subscription',
    component: LAYOUT,
    name: 'SubscriptionRoot',
    redirect: '/subscription/rss',
    meta: {
      title: { zh_CN: '订阅管理', en_US: 'Subscription' },
      icon: shallowRef(RssIcon),
      orderNo: 3,
    },
    children: [
      {
        path: 'rss',
        name: 'RssFeedList',
        component: () => import('@/pages/subscription/rss/index.vue'),
        meta: { title: { zh_CN: 'RSS 订阅源', en_US: 'RSS Feeds' }, icon: shallowRef(RssIcon) },
      },
    ],
  },

  {
    path: '/system',
    component: LAYOUT,
    name: 'SystemRoot',
    redirect: '/system/settings',
    meta: {
      title: { zh_CN: '系统管理', en_US: 'System' },
      icon: shallowRef(SettingIcon),
      orderNo: 4,
    },
    children: [
      {
        path: 'settings',
        name: 'SiteSettings',
        component: () => import('@/pages/system/settings/index.vue'),
        meta: { title: { zh_CN: '站点设置', en_US: 'Settings' }, icon: shallowRef(SettingIcon) },
      },
      {
        path: 'sensitive-words',
        name: 'SensitiveWordList',
        component: () => import('@/pages/system/sensitive-words/index.vue'),
        meta: { title: { zh_CN: '敏感词库', en_US: 'Sensitive Words' }, icon: shallowRef(SecuredIcon) },
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('@/pages/system/users/index.vue'),
        meta: { title: { zh_CN: '用户管理', en_US: 'Users' }, icon: shallowRef(UserIcon) },
      },
      {
        path: 'roles',
        name: 'RoleList',
        component: () => import('@/pages/system/roles/index.vue'),
        meta: { title: { zh_CN: '角色权限', en_US: 'Roles' }, icon: shallowRef(UsergroupIcon) },
      },
      {
        path: 'logs',
        name: 'ActionLogList',
        component: () => import('@/pages/system/logs/index.vue'),
        meta: { title: { zh_CN: '操作日志', en_US: 'Audit Logs' }, icon: shallowRef(HistoryIcon) },
      },
    ],
  },

  {
    path: '/profile',
    component: LAYOUT,
    name: 'ProfileRoot',
    redirect: '/profile/index',
    meta: {
      title: { zh_CN: '个人资料', en_US: 'Profile' },
      icon: shallowRef(UserIcon),
      orderNo: 5,
      single: true,
    },
    children: [
      {
        path: 'index',
        name: 'ProfileIndex',
        component: () => import('@/pages/profile/index.vue'),
        meta: { title: { zh_CN: '个人资料', en_US: 'Profile' } },
      },
    ],
  },
] satisfies RouteRecordRaw[];
