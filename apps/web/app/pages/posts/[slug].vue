<template>
  <div class="post-page">
    <!-- ===== Header：全站统一导航 ===== -->

    <!-- 目录：宽屏固定在正文左侧；窄屏右下角悬浮按钮展开 -->
    <aside
      v-if="toc.length"
      class="toc"
      :class="{ 'is-open': tocOpen }"
      aria-label="文章目录"
    >
      <button type="button" class="toc__toggle" @click="tocOpen = !tocOpen">目录</button>
      <div class="toc__body">
        <p class="toc__title">目录</p>
        <ul class="toc__list">
          <li v-for="item in toc" :key="item.id">
            <a
              :href="`#${item.id}`"
              class="toc__link"
              :class="{ 'is-active': activeId === item.id }"
              :style="{ paddingLeft: `${14 + Math.max(0, item.level - 2) * 14}px` }"
              @click.prevent="scrollToHeading(item.id)"
            >{{ item.text }}</a>
          </li>
        </ul>
      </div>
    </aside>

    <main v-if="post" ref="bodyEl" class="article-wrap">
      <article class="article-card">
        <header class="article-head">
          <span
            v-if="categorySlug"
            class="category-chip"
          >{{ post.categoryName }}</span>
          <span v-else class="category-chip category-chip--none">{{ post.categoryName || '未分类' }}</span>

          <h1 class="article-title">{{ post.title }}</h1>

          <div class="article-meta">
            <span>发布于 {{ formatDate(post.publishedAt ?? post.createdAt) }}</span>
            <template v-if="formatDate(post.updatedAt) !== formatDate(post.publishedAt ?? post.createdAt)">
              <span class="meta-dot">·</span>
              <span>更新于 {{ formatDate(post.updatedAt) }}</span>
            </template>
            <span class="meta-dot">·</span>
            <span>{{ post.viewCount.toLocaleString() }} 次阅读</span>
          </div>
        </header>

        <p v-if="post.summary" class="article-excerpt">{{ post.summary }}</p>

        <!-- 正文：后端存储 Markdown -->
        <MarkdownView :source="post.content ?? ''" class="article-body" />

        <footer v-if="post.tags.length" class="article-tags">
          <span v-for="tag in post.tags" :key="tag.id" class="tag-chip"># {{ tag.name }}</span>
        </footer>
      </article>

      <!-- 评论区 -->
      <CommentSection :article-id="post.id" class="fade-up" />
    </main>
  </div>
</template>

<script setup lang="ts">
import type { Post } from '#shared/types'
import { Marked } from 'marked'

const route = useRoute()
const slug = route.params.slug as string

/** 公开文章详情（仅已发布文章可访问，浏览量由服务端统计） */
const { data: post, error } = await useAsyncData(`article-${slug}`, () =>
  apiFetch<Post>(`/api/v1/articles/${encodeURIComponent(slug)}`),
)

if (error.value || !post.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在', fatal: true })
}

/** 分类 slug（分类 chip 跳回首页对应筛选） */
const { data: categories } = await useAsyncData('home-categories', () =>
  apiFetch<{ slug: string; id: number }[]>('/api/v1/categories'),
)
const categorySlug = computed(() =>
  categories.value?.find(c => c.id === post.value?.categoryId)?.slug ?? '',
)

/** 裸 marked 实例：与 MarkdownView 共用同一套 tokenizer，保证目录识别的标题集合、层级、顺序与正文渲染严格一致 */
const md = new Marked()

/** 从 Markdown 提取标题生成目录（h1~h6 全收，正文用 h1 写章节同样出目录；
 *  id 按出现顺序编号，渲染时按同样顺序写入 DOM） */
// ponytail: 标题文本用正则去行内标记即可，与渲染文本完全一致需走 parseInline，目录显示场景不值得
const toc = computed(() => {
  const items: { id: string; text: string; level: number }[] = []
  for (const token of md.lexer(post.value?.content ?? '')) {
    if (token.type !== 'heading') continue
    const text = token.text
      .replace(/!?!\[([^\]]*)\]\([^)]*\)/g, '$1') // 图片/链接只留文字
      .replace(/[*_~`]/g, '')
      .trim()
    if (text) items.push({ id: `toc-${items.length}`, text, level: token.depth })
  }
  return items
})

const bodyEl = ref<HTMLElement | null>(null)
const activeId = ref('')
/** 移动端目录面板展开状态（桌面端常显，不生效） */
const tocOpen = ref(false)

/** 挂载后给正文中对应的 h1~h6 写入锚点 id（顺序与 toc 一致；选择器必须与 toc 的收录范围同步） */
onMounted(() => {
  const nodes = bodyEl.value?.querySelectorAll('.article-body :is(h1, h2, h3, h4, h5, h6)')
  nodes?.forEach((el, i) => {
    if (toc.value[i]) el.id = toc.value[i]!.id
  })
  updateActive()
  window.addEventListener('scroll', updateActive, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', updateActive))

/** 高亮当前阅读位置：最后一个滚过顶部的标题 */
function updateActive() {
  let current = ''
  for (const { id } of toc.value) {
    const el = document.getElementById(id)
    if (el && el.getBoundingClientRect().top <= 100) current = id
  }
  activeId.value = current
}

function scrollToHeading(id: string) {
  tocOpen.value = false // 移动端点击后收起面板，桌面端无影响
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

usePageSeo({
  title: () => (post.value ? `${post.value.title} - 补陋阁` : '补陋阁'),
  description: () => post.value?.summary,
  // 关键词直接用标签名，无需后端新增字段
  keywords: () => post.value?.tags.map(t => t.name) ?? [],
  image: () => post.value?.coverImage,
  type: 'article',
  publishedTime: () => post.value?.publishedAt,
  modifiedTime: () => post.value?.updatedAt,
})
</script>

<style scoped>
.post-page {
  min-height: 100vh;
  min-height: 100dvh;
}

.article-wrap {
  max-width: 780px;
  margin: 0 auto;
  padding: 84px 20px 48px;
}

/* ===== 目录边栏：墨线式（仅宽屏）=====
 * 一根竖细线贯穿到底，条目纯文字；当前章节用主色短线在墨线上「点」出
 */
.toc {
  position: fixed;
  top: 110px;
  left: calc(50% - 640px);
  width: 220px;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
}

/* 桌面端不需要切换按钮 */
.toc__toggle {
  display: none;
}

/* ===== 窄屏：右下角悬浮按钮 + 展开面板 ===== */
@media (max-width: 1299px) {
  .toc {
    top: auto;
    right: 18px;
    bottom: 22px;
    left: auto;
    width: auto;
    max-height: none;
    overflow: visible;
    z-index: 20;
  }

  .toc__toggle {
    display: inline-flex;
    align-items: center;
    margin-left: auto;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 500;
    color: var(--c-on-primary);
    background: var(--c-primary);
    border: none;
    border-radius: 999px;
    box-shadow: 0 4px 14px rgb(0 0 0 / 18%);
    cursor: pointer;
  }

  .toc__body {
    display: none;
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    width: min(300px, 82vw);
    max-height: 55vh;
    overflow-y: auto;
    padding: 14px 16px;
    background: var(--c-bg-card);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgb(0 0 0 / 16%);
  }

  .toc.is-open .toc__body {
    display: block;
  }
}

.toc__title {
  margin: 0 0 12px;
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: var(--c-text-muted);
}

.toc__list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-left: 1px solid var(--c-border); /* 墨线 */
}

.toc__list li + li {
  margin-top: 4px;
}

.toc__link {
  display: block;
  padding: 5px 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--c-text-secondary);
  text-decoration: none;
  border-left: 2px solid transparent;
  margin-left: -1px; /* 盖住容器墨线，激活时以主色短线取代 */
  transition: color var(--dur-soft) ease, border-color var(--dur-soft) ease;

@media (hover: hover) and (pointer: fine) {
  &:hover {
    color: var(--c-primary);
  }
}

  &.is-active {
    color: var(--c-primary);
    font-weight: 600;
    border-left-color: var(--c-primary);
  }
}

.article-card {
  padding: 36px clamp(20px, 5vw, 44px) 32px;
  animation: fade-up 0.4s ease both;
}

.article-title {
  margin: 14px 0 10px;
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 700;
  line-height: 1.3;
  color: var(--c-text);
}

.category-chip {
  display: inline-block;
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: 999px;
  text-decoration: none;
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s var(--ease-bounce);

  &:hover {
    background: var(--c-primary-light);
  }
}

.category-chip--none {
  color: var(--c-text-muted);
  background: var(--c-bg-soft);
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--c-text-muted);
}

.meta-dot {
  color: var(--c-text-muted);
}

.article-excerpt {
  margin: 20px 0 0;
  padding: 14px 18px;
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border-left: 3px solid var(--c-primary);
  border-radius: 0 8px 8px 0;
}

.article-body {
  margin-top: 24px;
  font-size: 15.5px;
  line-height: 1.85;
}

/* 锚点跳转时给固定 Header 留出空间 */
.article-body :deep(h1),
.article-body :deep(h2),
.article-body :deep(h3) {
  scroll-margin-top: 90px;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--c-border);
}

.tag-chip {
  padding: 4px 12px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border-radius: 999px;
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s var(--ease-bounce);

  &:hover {
    color: var(--c-primary);
    background: var(--c-primary-light);
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .article-card,
  .category-chip,
  .tag-chip {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
</style>
