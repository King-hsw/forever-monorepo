import type { PageResult, Post } from '~~/shared/types'

/** XML 文本节点 / 属性中需要转义的字符 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = config.public.siteUrl.replace(/\/+$/, '')
  // 开发环境 public.apiBase 为空（浏览器走 devProxy），服务端直连用默认值兜底
  const apiBase = config.public.apiBase || 'http://localhost:8080'

  /** 从 forever-server 拉取已发布文章（失败时降级为空列表） */
  let posts: Post[] = []
  try {
    const data = await $fetch<{ code: number; data: PageResult<Post> }>(
      `${apiBase}/api/v1/articles?page=1&size=1000`,
    )
    posts = data.data.list
  } catch {
    // 后端不可用时不阻塞 sitemap 输出
  }

  const entries: string[] = [
    `  <url>
    <loc>${escapeXml(`${siteUrl}/`)}</loc>
  </url>`,
  ]

  for (const post of posts) {
    entries.push(`  <url>
    <loc>${escapeXml(`${siteUrl}/posts/${post.slug}`)}</loc>
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
