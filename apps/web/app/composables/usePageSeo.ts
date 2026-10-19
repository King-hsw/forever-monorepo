import type { MaybeRefOrGetter } from 'vue'

/** 站点名称与默认描述（与 nuxt.config.ts 的 PWA manifest 保持一致） */
export const SITE_NAME = '补陋阁'
export const SITE_DESCRIPTION = '补陋阁 —— 斯是陋室，惟吾德馨'

/**
 * 页面级 SEO 统一入口：
 * title / description / keywords / canonical / Open Graph 一次配齐。
 *
 * - 所有字段均支持响应式 getter，文章详情页数据到达后自动更新
 * - canonical 默认取当前路由 path（不含 query，避免筛选参数产生重复页面）
 * - image 支持相对路径（自动拼接站点域名）或绝对 URL
 */
export interface PageSeoOptions {
  /** 完整的 <title> 内容 */
  title: MaybeRefOrGetter<string>
  /** 页面描述；缺省回退到站点默认描述 */
  description?: MaybeRefOrGetter<string | null | undefined>
  /** 关键词列表（文章页一般传标签名） */
  keywords?: MaybeRefOrGetter<string[]>
  /** 分享图（og:image） */
  image?: MaybeRefOrGetter<string | null | undefined>
  /** canonical 路径，如 /posts/xxx；默认取当前路由 path */
  path?: MaybeRefOrGetter<string | undefined>
  /** OG 类型；文章详情页传 'article' */
  type?: MaybeRefOrGetter<'website' | 'article'>
  /** 文章发布时间（ISO 字符串，type=article 时输出） */
  publishedTime?: MaybeRefOrGetter<string | null | undefined>
  /** 文章更新时间（ISO 字符串，type=article 时输出） */
  modifiedTime?: MaybeRefOrGetter<string | null | undefined>
}

export function usePageSeo(options: PageSeoOptions) {
  const config = useRuntimeConfig()
  const route = useRoute()
  const siteUrl = config.public.siteUrl.replace(/\/+$/, '')

  const title = computed(() => toValue(options.title))
  const description = computed(() => toValue(options.description) || SITE_DESCRIPTION)
  const keywords = computed(() => toValue(options.keywords) ?? [])
  /** 相对路径分享图转绝对 URL */
  const image = computed(() => {
    const img = toValue(options.image)
    if (!img) return undefined
    return /^https?:\/\//.test(img) ? img : `${siteUrl}${img.startsWith('/') ? '' : '/'}${img}`
  })
  const url = computed(() => `${siteUrl}${toValue(options.path) ?? route.path}`)
  const type = computed(() => toValue(options.type) ?? 'website')

  useHead(() => ({
    title: title.value,
    link: [{ rel: 'canonical', href: url.value }],
    meta: keywords.value.length
      ? [{ name: 'keywords', content: keywords.value.join(', ') }]
      : [],
  }))

  useSeoMeta({
    description: () => description.value,

    ogTitle: () => title.value,
    ogDescription: () => description.value,
    ogUrl: () => url.value,
    ogType: () => type.value,
    ogImage: () => image.value,
    ogSiteName: SITE_NAME,

    // article 相关 meta 仅在文章详情页有值时输出
    articlePublishedTime: () =>
      type.value === 'article' ? toValue(options.publishedTime) ?? undefined : undefined,
    articleModifiedTime: () =>
      type.value === 'article' ? toValue(options.modifiedTime) ?? undefined : undefined,
  })
}
