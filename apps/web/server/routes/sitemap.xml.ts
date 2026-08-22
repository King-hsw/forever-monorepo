import { buildSeedPosts } from '~~/shared/blog-seed'

/** XML 文本节点 / 属性中需要转义的字符 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl.replace(/\/+$/, '')

  const entries: string[] = [
    `  <url>
    <loc>${escapeXml(`${siteUrl}/`)}</loc>
  </url>`,
  ]

  for (const post of buildSeedPosts()) {
    if (post.status !== 'published') continue
    entries.push(`  <url>
    <loc>${escapeXml(`${siteUrl}/posts/${post.id}`)}</loc>
    <lastmod>${new Date(post.updatedAt).toISOString()}</lastmod>
  </url>`)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return xml
})
