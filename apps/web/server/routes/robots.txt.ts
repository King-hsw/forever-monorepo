/**
 * 动态生成 /robots.txt。
 *
 * 原先是 public/robots.txt 静态文件，Sitemap 写死成
 * https://forever.example.com/sitemap.xml——换域名后直接失效。
 * 而 Sitemap 指令规范要求绝对 URL、不接受相对路径，只能按运行时
 * 的站点地址动态生成（对应 NUXT_PUBLIC_SITE_URL）。
 *
 * /admin 是后台管理（ssr: false 的空壳页），对爬虫无内容，禁止抓取。
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '')

  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'public, max-age=86400')

  return [
    'User-Agent: *',
    'Disallow: /admin',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
})
