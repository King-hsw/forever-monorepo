/**
 * 动态生成 /sitemap.xml。
 *
 * 为什么放前端而不是后端：
 *   文章详情的 URL 规则（/posts/{slug}）属于前端路由，后端不该知道它。
 *   SiteFeedController 里硬编码的 /articles/{slug} 就是因为这种越界
 *   与真实路由脱节，导致 RSS 输出的文章链接全部 404。sitemap 由前端生成，
 *   以后改路由规则不会出现同样的割裂。
 *
 * 数据源：后端 GET /api/v1/articles/archive 一次性返回全部已发布文章，
 * 该查询没有分页限制，不需要翻页。
 */

interface ArchiveItem {
  id: number
  title: string
  slug: string
  publishedAt: string | null
}

/** 对 SEO 有价值、且无需登录即可访问的页面 */
const STATIC_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/posts', priority: '0.9', changefreq: 'daily' },
  { path: '/archive', priority: '0.6', changefreq: 'weekly' },
  { path: '/moments', priority: '0.5', changefreq: 'daily' },
  { path: '/guest', priority: '0.4', changefreq: 'monthly' },
] as const

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '')
  const apiBase = String(config.apiBase || '').replace(/\/+$/, '')

  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8')
  // 爬虫抓取频率低，缓存 1 小时，避免每次抓取都回源打后端
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')

  const urls: string[] = STATIC_PATHS.map(item =>
    [
      '  <url>',
      `    <loc>${escapeXml(siteUrl + item.path)}</loc>`,
      `    <changefreq>${item.changefreq}</changefreq>`,
      `    <priority>${item.priority}</priority>`,
      '  </url>',
    ].join('\n'),
  )

  try {
    const articles = await $fetch<ArchiveItem[]>(`${apiBase}/api/v1/articles/archive`)
    for (const article of articles ?? []) {
      if (!article?.slug) continue
      // 归档接口只返回 publishedAt，格式形如 2026-09-02T10:11:12
      const lastmod = article.publishedAt ? String(article.publishedAt).slice(0, 10) : ''
      urls.push([
        '  <url>',
        `    <loc>${escapeXml(`${siteUrl}/posts/${article.slug}`)}</loc>`,
        ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
        '    <changefreq>monthly</changefreq>',
        '    <priority>0.8</priority>',
        '  </url>',
      ].join('\n'))
    }
  }
  catch (error) {
    // 后端不可用也要返回合法的 sitemap（至少含静态页）：
    // 返回 500 会让爬虫判定站点异常，直接影响收录
    console.error('[sitemap] 拉取文章归档失败，本次仅输出静态页面：', error)
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
})
