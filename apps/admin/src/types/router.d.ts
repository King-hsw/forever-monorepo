import 'vue-router';

import type { Component, DefineComponent, FunctionalComponent } from 'vue';

export {};
declare module 'vue-router' {
  interface RouteMeta {
    /** 菜单/面包屑标题 */
    title?: string;
    icon?: string | Component | FunctionalComponent | DefineComponent;
    expanded?: boolean;
    orderNo?: number;
    hidden?: boolean;
    hiddenBreadcrumb?: boolean;
    single?: boolean;
    keepAlive?: boolean;
  }
}
