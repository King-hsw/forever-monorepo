import type { PageResult, Post } from '~~/shared/types'

/** XML 实体转义（& < > " '） */
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
  const base = config.public.siteUrl.replace(/\/+$/, '')
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
    // 后端不可用时不阻塞 RSS 输出
  }

  const items = posts.map((post) => {
    const link = `${base}/posts/${post.slug}`
    return [
      '    <item>',
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <pubDate>${new Date(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>`,
      `      <description>${escapeXml(post.summary ?? '')}</description>`,
      '    </item>',
    ].join('\n')
  }).join('\n')

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>Forever - 记录技术与思考</title>',
    `    <link>${escapeXml(base)}</link>`,
    '    <description>Forever · 用心记录每一篇，分享前端、后端与效率工具的实践心得。</description>',
    '    <language>zh-cn</language>',
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items,
    '  </channel>',
    '</rss>',
  ].join('\n')

  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  return xml
})
