/**
 * 后台页面统一入口：设置浏览器标签标题与 admin 布局顶栏标题（同一处维护后缀文案）。
 */
export function useAdminPage(title: string) {
  useHead({ title: `${title} - 补陋阁 后台` })
  useState('admin-page-title', () => title)
}
