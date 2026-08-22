import { buildSeedPosts } from '~~/shared/blog-seed'

/** XML 实体转义（& < > " '） */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default defineEventHandler((event) => {
  const { siteUrl } = useRuntimeConfig(event).public
  const base = siteUrl.replace(/\/+$/, '')

  /** 已发布文章，按创建时间倒序 */
  const posts = buildSeedPosts()
    .filter(post => post.status === 'published')
    .sort((a, b) => b.createdAt - a.createdAt)

  const items = posts.map((post) => {
    const link = `${base}/posts/${post.id}`
    return [
      '    <item>',
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>`,
      `      <description>${escapeXml(post.excerpt)}</description>`,
      '    </item>',
    ].join('\n')
  }).join('\n')

  const lastBuildDate = Math.max(
    ...posts.map(p => p.updatedAt),
    Date.now(),
  )

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>Forever - 记录技术与思考</title>',
    `    <link>${escapeXml(base)}</link>`,
    '    <description>Forever · 用心记录每一篇，分享前端、后端与效率工具的实践心得。</description>',
    '    <language>zh-cn</language>',
    `    <lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>`,
    items,
    '  </channel>',
    '</rss>',
  ].join('\n')

  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  return xml
})
