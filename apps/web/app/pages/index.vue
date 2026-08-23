<template>
  <div class="blog-home">
    <!-- ===== 顶部滚动进度条 ===== -->
    <div
      class="scroll-progress"
      :class="{ 'scroll-progress--on': isScrolled }"
      :style="{ transform: `scaleX(${progress})` }"
      aria-hidden="true"
    />

    <!-- ===== Header：吸顶导航，滚动后变为玻璃拟态 ===== -->
    <SiteHeader />

    <!-- ===== Hero：视差背景 + 逐字浮现的渐变标题 ===== -->
    <section ref="heroEl" class="hero">
      <div class="hero__bg" aria-hidden="true">
        <!-- 单一居中光晕：纸面上方的一抹暖光 -->
        <div class="hero__glow" />
      </div>

      <div ref="heroContent" class="hero__content">
        <p class="hero__eyebrow">
          <span class="hero__eyebrow-dot" />
          欢迎来到我的数字花园
        </p>
        <h1 class="hero__title">
          <span class="hero__word">
            <span
              v-for="(ch, i) in TITLE_A"
              :key="`a${i}`"
              class="hero__char"
              :style="{ '--d': `${120 + i * 70}ms` }"
            >{{ ch }}</span>
          </span><span class="hero__word hero__word--grad">
            <span
              v-for="(ch, i) in TITLE_B"
              :key="`b${i}`"
              class="hero__char hero__char--grad"
              :style="{ '--d': `${260 + i * 70}ms` }"
            >{{ ch }}</span>
          </span>
        </h1>
        <p class="hero__tagline">
          在这里沉淀代码之外的灵感，<br class="hero__tagline-br">
          每一篇文字都是与时间的对话。
        </p>

        <p class="hero__stats">
          <span><strong>{{ publishedPosts.length }}</strong> 篇文章</span>
          <span class="hero__stats-dot">·</span>
          <span><strong>{{ categories?.length ?? 0 }}</strong> 个分类</span>
          <span class="hero__stats-dot">·</span>
          <span><strong>{{ tags?.length ?? 0 }}</strong> 个标签</span>
        </p>

        <div class="hero__actions">
          <button type="button" class="hero__cta" @click="scrollToId('latest')">
            开始阅读
            <span class="hero__cta-arrow">↓</span>
          </button>
          <a class="hero__cta hero__cta--ghost" href="/rss.xml" target="_blank">RSS 订阅</a>
        </div>
      </div>

      <button type="button" class="hero__scroll-hint" aria-label="滚动查看内容" @click="scrollToId('latest')">
        <span class="hero__scroll-mouse">
          <span class="hero__scroll-wheel" />
        </span>
      </button>
    </section>

    <!-- ===== 标签跑马灯：无缝循环滚动 ===== -->
    <div v-if="marqueeTags.length" class="marquee" aria-hidden="true">
      <div class="marquee__track" :style="{ '--marquee-duration': `${Math.max(18, marqueeTags.length * 3)}s` }">
        <span v-for="(tag, i) in marqueeLoop" :key="i" class="marquee__item"># {{ tag }}</span>
      </div>
    </div>

    <main>
      <!-- 章节导航：固定在右侧，随时告知用户身处故事哪个位置，可点击跳转 -->
      <nav class="chapter-nav" aria-label="页面章节">
        <button
          v-for="sec in sections"
          :key="sec.id"
          type="button"
          class="chapter-nav__item"
          :class="{ 'chapter-nav__item--active': activeSection === sec.id }"
          :aria-current="activeSection === sec.id ? 'true' : undefined"
          @click="scrollToId(sec.id)"
        >
          <span class="chapter-nav__label">{{ sec.label }}</span>
          <span class="chapter-nav__dot" />
        </button>
      </nav>

      <!-- 分镜 01：最新文章 —— 左侧章节牌 sticky 固定，内容随滚动揭示 -->
      <section id="latest" class="scene">
        <div class="scene__inner">
          <aside class="scene__aside">
            <div class="scene__sticky reveal">
              <span class="scene__no" aria-hidden="true">01</span>
              <h2 class="scene__title">最新文章</h2>
              <p class="scene__desc">刚刚写下的文字，还热乎着。</p>
              <NuxtLink v-if="totalPosts > homeCount" to="/posts" class="more-link">
                查看全部 {{ totalPosts }} 篇
                <span class="more-link__arrow">→</span>
              </NuxtLink>
            </div>
          </aside>

          <div class="scene__body">
            <NuxtLink
              v-if="featuredPost"
              :to="`/posts/${featuredPost.slug}`"
              class="featured reveal"
            >
              <span class="featured__badge">最新发布</span>
              <h3 class="featured__title">{{ featuredPost.title }}</h3>
              <p class="featured__excerpt">{{ featuredPost.summary }}</p>
              <div class="featured__foot">
                <div class="featured__meta">
                  <span class="chip">{{ categoryName(featuredPost.categoryId) }}</span>
                  <span class="meta-dot">·</span>
                  <time>{{ formatDate(featuredPost.createdAt) }}</time>
                  <span class="meta-dot">·</span>
                  <span>{{ featuredPost.viewCount.toLocaleString() }} 次阅读</span>
                </div>
                <span class="featured__cta">
                  阅读全文
                  <span class="featured__cta-circle">→</span>
                </span>
              </div>
            </NuxtLink>

            <!-- 编号时间线：左侧竖线贯穿，序号压在线上 -->
            <div class="row-list">
              <NuxtLink
                v-for="(post, i) in homeRows"
                :key="post.id"
                :to="`/posts/${post.slug}`"
                class="row reveal"
                :style="{ '--reveal-delay': `${Math.min(i + 1, 5) * 80}ms` }"
              >
                <span class="row__num" aria-hidden="true">{{ String(i + 2).padStart(2, '0') }}</span>
                <span class="row__main">
                  <h3 class="row__title">{{ post.title }}</h3>
                  <p class="row__excerpt">{{ post.summary }}</p>
                  <span class="row__meta">
                    <span class="chip">{{ categoryName(post.categoryId) }}</span>
                    <span class="meta-dot">·</span>
                    <time>{{ formatDate(post.createdAt) }}</time>
                    <span class="meta-dot">·</span>
                    <span>{{ post.viewCount.toLocaleString() }} 次阅读</span>
                  </span>
                </span>
              </NuxtLink>
            </div>

            <div v-if="!publishedPosts.length" class="empty">
              <span class="empty__icon">(˘•ω•˘)</span>
              还没有发布文章
            </div>
          </div>
        </div>
      </section>

      <!-- 分镜 02：探索分类 —— 交替底色区分场景，像翻到下一页 -->
      <section v-if="categoryCards.length" id="categories" class="scene scene--tinted">
        <div class="scene__inner">
          <aside class="scene__aside">
            <div class="scene__sticky reveal">
              <span class="scene__no" aria-hidden="true">02</span>
              <h2 class="scene__title">探索分类</h2>
              <p class="scene__desc">按主题逛逛，每个抽屉里都收着不一样的宝贝。</p>
            </div>
          </aside>

          <div class="scene__body">
            <div class="cat-grid">
              <NuxtLink
                v-for="(cat, i) in categoryCards"
                :key="cat.id"
                :to="`/posts?category=${cat.slug}`"
                class="cat-card reveal"
                :style="{ '--reveal-delay': `${Math.min(i, 5) * 70}ms` }"
              >
                <span class="cat-card__count">{{ cat.count }} 篇</span>
                <h3 class="cat-card__name">{{ cat.name }}</h3>
                <p class="cat-card__desc">{{ cat.latestTitle }}</p>
                <span class="cat-card__go" aria-hidden="true">→</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- 分镜 03：标签云 -->
      <section v-if="tagCloud.length" id="tags" class="scene">
        <div class="scene__inner">
          <aside class="scene__aside">
            <div class="scene__sticky reveal">
              <span class="scene__no" aria-hidden="true">03</span>
              <h2 class="scene__title">标签云</h2>
              <p class="scene__desc">一枚枚小贴纸，标记出每篇文章的心情。</p>
            </div>
          </aside>

          <div class="scene__body">
            <div class="tag-cloud reveal">
              <NuxtLink
                v-for="tag in tagCloud"
                :key="tag.id"
                to="/posts"
                class="tag-cloud__item"
                :style="{ fontSize: `${tag.size}px` }"
              >{{ tag.name }}<sup>{{ tag.count }}</sup></NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- 分镜 04：创作足迹 —— 一年间的发文热力图 -->
      <section id="heatmap" class="scene scene--tinted">
        <div class="scene__inner">
          <aside class="scene__aside">
            <div class="scene__sticky reveal">
              <span class="scene__no" aria-hidden="true">04</span>
              <h2 class="scene__title">创作足迹</h2>
              <p class="scene__desc">一年里的每一天都被折进这一格格小方块，颜色越深，那天写下的文字越多。</p>
            </div>
          </aside>

          <div class="scene__body">
            <div class="heatmap-panel reveal">
              <PostHeatmap :posts="publishedPosts" />
            </div>
          </div>
        </div>
      </section>

      <!-- 终幕：订阅，像书末的版权页一样素净收尾 -->
      <section id="subscribe" class="finale">
        <div class="finale__inner reveal">
          <p class="finale__eyebrow" aria-hidden="true">Stay Tuned</p>
          <h2 class="finale__title">不错过任何一篇更新</h2>
          <p class="finale__text">订阅 RSS，新文章第一时间送达你的阅读器。</p>
          <div class="finale__actions">
            <a class="finale__btn" href="/rss.xml" target="_blank">订阅 RSS</a>
            <NuxtLink class="finale__btn finale__btn--ghost" to="/posts">浏览全部文章</NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <!-- ===== Footer ===== -->
    <SiteFooter />

    <!-- 回到顶部 -->
    <Transition name="totop">
      <button
        v-if="showBackTop"
        type="button"
        class="back-top"
        aria-label="回到顶部"
        @click="scrollToTop"
      >↑</button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { Category, PageResult, Post, Tag } from '~/stores/types'

// 从 forever-server 拉取公开数据（已发布文章 / 分类 / 标签）
const { data: pageData } = await useAsyncData('home-articles', () =>
  apiFetch<PageResult<Post>>('/api/v1/articles', { query: { page: 1, size: 1000 } }),
)
const { data: categories } = await useAsyncData('home-categories', () =>
  apiFetch<Category[]>('/api/v1/categories'),
)
const { data: tags } = await useAsyncData('home-tags', () =>
  apiFetch<Tag[]>('/api/v1/tags'),
)

/** 已发布文章，按发布时间倒序 */
const sortKey = (p: Post) => p.publishedAt ?? p.createdAt
const publishedPosts = computed(() =>
  [...(pageData.value?.list ?? [])].sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1)),
)

const totalPosts = computed(() => publishedPosts.value.length)

/** 首页展示的文章数量（头条 1 篇 + 列表 3 篇） */
const homeCount = 4

/** 头条：最新一篇 */
const featuredPost = computed(() => publishedPosts.value[0] ?? null)

/** 头条之后的目录式条目 */
const homeRows = computed(() => publishedPosts.value.slice(1, homeCount))

/** 分类卡片：带文章数与该分类下最新一篇的标题 */
const categoryCards = computed(() =>
  (categories.value ?? [])
    .map(cat => ({
      ...cat,
      count: publishedPosts.value.filter(p => p.categoryId === cat.id).length,
      latestTitle:
        publishedPosts.value.find(p => p.categoryId === cat.id)?.summary ?? '暂无文章，快来写下第一篇',
    }))
    .sort((a, b) => b.count - a.count)
)

/** 标签云：按使用次数排序，字号随次数在 13~21px 间浮动 */
const tagCloud = computed(() => {
  const countByName = new Map<string, number>()
  for (const post of publishedPosts.value) {
    for (const t of post.tags) {
      countByName.set(t.name, (countByName.get(t.name) ?? 0) + 1)
    }
  }
  const max = Math.max(1, ...countByName.values())
  return (tags.value ?? [])
    .map(tag => ({ id: tag.id, name: tag.name, count: countByName.get(tag.name) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 16)
    .map(tag => ({
      ...tag,
      size: Math.round(13 + (tag.count / max) * 8),
    }))
})

/** 跑马灯标签：去重后取前 12 个 */
const marqueeTags = computed(() =>
  [...new Set((tags.value ?? []).map(t => t.name))].slice(0, 12),
)

/** 无缝循环需要重复一份轨道内容 */
const marqueeLoop = computed(() => [...marqueeTags.value, ...marqueeTags.value])

// ===== 平滑滚动辅助 =====

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ===== 章节导航：追踪当前所处分镜 =====

/** 首页分镜章节（顺序即叙事顺序） */
const sections = [
  { id: 'latest', label: '最新文章' },
  { id: 'categories', label: '探索分类' },
  { id: 'tags', label: '标签云' },
  { id: 'heatmap', label: '创作足迹' },
  { id: 'subscribe', label: '订阅更新' },
]

const activeSection = ref('latest')
let sectionIO: IntersectionObserver | null = null

// ===== Header 滚动态 / 回到顶部 / 阅读进度 =====

const isScrolled = ref(false)
const showBackTop = ref(false)
const progress = ref(0)

function onScrollChrome() {
  const y = window.scrollY
  isScrolled.value = y > 24
  showBackTop.value = y > 600
  const max = document.documentElement.scrollHeight - window.innerHeight
  progress.value = max > 0 ? Math.min(1, y / max) : 0
}

// ===== Hero 滚动淡出 =====
// 内容随滚动缓慢上移并逐渐淡出，营造纵深；
// 离开视口或用户偏好减少动效时停止循环。

const heroEl = ref<HTMLElement | null>(null)
const heroContent = ref<HTMLElement | null>(null)

let rafId = 0
let heroVisible = true
let io: IntersectionObserver | null = null

// 目标值与当前值分离，lerp 逼近实现惯性平滑
let targetScroll = 0
let currentScroll = 0

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function tick() {
  // 惯性逼近：帧率无关的平滑系数
  const ease = 1 - Math.pow(0.001, 1 / 60) // ≈ 每帧逼近 10%
  currentScroll += (targetScroll - currentScroll) * ease

  const s = currentScroll

  if (heroContent.value) {
    // 内容以较慢速率上移并逐渐淡出，营造纵深
    const fade = Math.max(0, 1 - s / 520)
    heroContent.value.style.transform = `translate3d(0, ${s * 0.22}px, 0)`
    heroContent.value.style.opacity = String(fade)
  }

  if (heroVisible) {
    rafId = requestAnimationFrame(tick)
  }
}

// ===== 滚动渐显（IntersectionObserver）=====

let revealObserver: IntersectionObserver | null = null

onMounted(() => {
  onScrollChrome()
  // 滚动监听始终注册：进度条/Header 态不依赖动效偏好
  window.addEventListener('scroll', () => {
    targetScroll = window.scrollY
    onScrollChrome()
  }, { passive: true })

  if (!prefersReducedMotion() && heroEl.value) {
    targetScroll = currentScroll = window.scrollY

    // 滚出视口后停掉 rAF，节省性能；滚回来再恢复
    io = new IntersectionObserver(([entry]) => {
      const wasVisible = heroVisible
      heroVisible = entry.isIntersecting
      if (heroVisible && !wasVisible) {
        rafId = requestAnimationFrame(tick)
      }
    }, { rootMargin: '80px' })
    io.observe(heroEl.value)

    rafId = requestAnimationFrame(tick)
  }

  if (!prefersReducedMotion()) {
    revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible')
          revealObserver?.unobserve(entry.target)
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
    document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
      revealObserver!.observe(el)
    })
  }

  // 章节追踪：当分镜进入视口中段时点亮对应导航点（与动效偏好无关，始终可用）
  sectionIO = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        activeSection.value = entry.target.id
      }
    }
  }, { rootMargin: '-40% 0px -55% 0px' })
  for (const sec of sections) {
    const el = document.getElementById(sec.id)
    if (el) sectionIO.observe(el)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  io?.disconnect()
  revealObserver?.disconnect()
  sectionIO?.disconnect()
})

function categoryName(categoryId: number | null): string {
  return categories.value?.find(c => c.id === categoryId)?.name ?? '未分类'
}

function formatDate(value: string | number): string {
  const ts = value as number | string // new Date 同时兼容时间戳与 ISO 字符串
  return new Date(ts).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Hero 标题拆字（确定性数据，SSR 安全） */
const TITLE_A = ['记', '录']
const TITLE_B = ['技', '术', '与', '思', '考']

usePageSeo({
  title: 'Forever - 记录技术与思考',
  path: '/',
})
</script>

<style scoped>
.blog-home {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--c-bg-soft);
  overflow-x: clip;
}

/* 内容不足一屏时，让 main 撑满剩余空间，footer 贴住视口底部 */
.blog-home > main {
  flex: 1;
}

::selection {
  color: var(--c-on-primary);
  background: var(--c-primary);
}

/* ===== 滚动进度条 ===== */
.scroll-progress {
  position: fixed;
  inset: 0 0 auto;
  z-index: 60;
  height: 2px;
  background: var(--c-primary);
  transform-origin: left;
  transform: scaleX(0);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.scroll-progress--on {
  opacity: 1;
}

/* ===== Hero ===== */
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 92vh;
  min-height: 92dvh;
  padding: 96px 20px 80px;
  overflow: clip;
  text-align: center;
}

.hero__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* 纸面上方的一抹暖光：居中的极淡径向光晕 */
.hero__glow {
  position: absolute;
  left: 50%;
  top: 42%;
  width: min(560px, 80vw);
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse, rgb(197 100 115 / 9%) 0%, transparent 55%);
}

html.dark .hero__glow {
  background: radial-gradient(ellipse, rgb(224 149 164 / 6%) 0%, transparent 55%);
}

.hero__content {
  position: relative;
  z-index: 1;
  max-width: 720px;
  will-change: transform, opacity;
}

/* 眉题：小号大写字母 + 宽字距，像书页顶部的章节眉 */
.hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--c-text-muted);
  animation: fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero__eyebrow-dot {
  width: 5px;
  height: 5px;
  background: var(--c-primary);
  border-radius: 50%;
}

/* 标题：衬线体、中等字重、宽字距，像书名的扉页 */
.hero__title {
  margin: 28px 0 0;
  font-family: var(--font-serif);
  font-size: clamp(36px, 6vw, 58px);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.08em;
  color: var(--c-text);
}

.hero__word {
  display: inline-block;
  overflow: hidden;
  vertical-align: bottom;
  padding-bottom: 0.08em; /* 避免降部字母被遮罩裁掉 */
  margin-bottom: -0.08em;
}

.hero__char {
  display: inline-block;
  transform: translateY(115%);
  animation: char-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0ms) both;
}

.hero__char--grad {
  color: var(--c-primary);
}

@keyframes char-rise {
  from { transform: translateY(115%); }
  to { transform: translateY(0); }
}

/* 副标语：衬线斜体，像卷首的一句引言 */
.hero__tagline {
  margin: 22px 0 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(15px, 2vw, 16.5px);
  line-height: 1.9;
  letter-spacing: 0.04em;
  color: var(--c-text-secondary);
  animation: fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.65s both;
}

/* 统计：一行素净的数字，像书前的版权页数据 */
.hero__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
  margin: 34px 0 0;
  font-size: 13.5px;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
  animation: fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.74s both;
}

.hero__stats strong {
  font-size: 17px;
  font-weight: 600;
  color: var(--c-text-secondary);
}

.hero__stats-dot {
  opacity: 0.5;
}

/* 按钮：纸感实心 + 描边幽灵，去糖果渐变 */
.hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  margin-top: 36px;
  animation: fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.82s both;
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 26px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #fff;
  background: var(--c-primary);
  border: 1px solid var(--c-primary);
  border-radius: var(--radius-control);
  cursor: pointer;
  text-decoration: none;
  transition: background-color var(--dur-soft) ease, border-color var(--dur-soft) ease, transform var(--dur-soft) ease;
}

.hero__cta:hover {
  background: var(--c-primary-hover);
  border-color: var(--c-primary-hover);
  transform: translateY(-1px);
}

.hero__cta:active {
  transform: translateY(0);
}

.hero__cta-arrow {
  transition: transform 0.2s ease;
}

.hero__cta:hover .hero__cta-arrow {
  transform: translateY(2px);
}

.hero__cta--ghost {
  color: var(--c-text-secondary);
  background: transparent;
  border-color: var(--c-border);
}

.hero__cta--ghost:hover {
  color: var(--c-primary);
  border-color: var(--c-primary);
  background: transparent;
}

/* 滚动提示：鼠标造型 + 滚轮动画 */
.hero__scroll-hint {
  position: absolute;
  bottom: 30px;
  left: 50%;
  padding: 8px;
  background: none;
  border: none;
  cursor: pointer;
  transform: translateX(-50%);
  opacity: 0.65;
  transition: opacity 0.2s ease;
  animation: fade-up 0.6s ease 1s both;
}

.hero__scroll-hint:hover {
  opacity: 1;
}

.hero__scroll-mouse {
  display: block;
  width: 24px;
  height: 38px;
  border: 2px solid var(--c-text-muted);
  border-radius: 14px;
}

.hero__scroll-wheel {
  display: block;
  width: 3px;
  height: 7px;
  margin: 6px auto 0;
  background: var(--c-primary);
  border-radius: 2px;
  animation: scroll-wheel 1.6s ease-in-out infinite;
}

@keyframes scroll-wheel {
  0% { transform: translateY(0); opacity: 1; }
  70% { transform: translateY(10px); opacity: 0; }
  100% { transform: translateY(0); opacity: 0; }
}

/* ===== 标签跑马灯 ===== */
.marquee {
  overflow: hidden;
  padding: 18px 0;
  background: var(--c-bg-card);
  border-top: 1px solid var(--c-border);
  border-bottom: 1px solid var(--c-border);
  /* 两端淡出，衔接更柔和 */
  -webkit-mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
  mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
}

.marquee__track {
  display: flex;
  gap: 44px;
  width: max-content;
  animation: marquee var(--marquee-duration, 30s) linear infinite;
}

.marquee:hover .marquee__track {
  animation-play-state: paused;
}

.marquee__item {
  flex-shrink: 0;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--c-text-muted);
  white-space: nowrap;
  transition: color 0.2s ease;
}

.marquee__item:hover {
  color: var(--c-primary);
}

@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

/* ===== 滚动叙事分镜 ===== */
.scene {
  scroll-margin-top: 56px;
  padding: 100px 0;
}

/* 交替底色：相邻场景用一层极淡的纸色区分，像翻到下一页 */
.scene--tinted {
  background: var(--c-bg-soft);
  border-top: 1px solid var(--c-border);
  border-bottom: 1px solid var(--c-border);
}

.scene__inner {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 56px;
  max-width: 980px;
  margin: 0 auto;
  padding: 0 24px;
}

/* 章节牌：滚动时固定在视口左侧，像纪录片的章节字幕 */
.scene__sticky {
  position: sticky;
  top: 110px;
}

.scene__no {
  display: block;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.2em;
  color: var(--c-primary);
  font-variant-numeric: tabular-nums;
}

.scene__title {
  margin: 14px 0 0;
  font-family: var(--font-serif);
  font-size: 25px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--c-text);
}

.scene__desc {
  margin: 10px 0 0;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--c-text-muted);
}

/* ===== 终幕样式见下方「书末版权页」区块 ===== */

/* ===== 章节导航：固定右侧，始终告知用户身处故事何处，可点击跳转 ===== */
.chapter-nav {
  position: fixed;
  right: 22px;
  top: 50%;
  z-index: 45;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 18px;
  transform: translateY(-50%);
}

.chapter-nav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px;
  background: none;
  border: none;
  cursor: pointer;
}

.chapter-nav__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text-secondary);
  white-space: nowrap;
  opacity: 0;
  transform: translateX(6px);
  transition: opacity 0.25s ease, transform 0.25s ease;
  pointer-events: none;
}

/* hover / 键盘聚焦 / 当前章节时露出标签 */
.chapter-nav__item:hover .chapter-nav__label,
.chapter-nav__item:focus-visible .chapter-nav__label,
.chapter-nav__item--active .chapter-nav__label {
  opacity: 1;
  transform: translateX(0);
}

.chapter-nav__item:focus-visible {
  outline: 2px solid var(--c-primary);
  outline-offset: 3px;
  border-radius: 999px;
}

.chapter-nav__dot {
  width: 10px;
  height: 10px;
  background: var(--c-border);
  border-radius: 50%;
  transition: all var(--dur-soft) var(--ease-bounce);
}

.chapter-nav__item:hover .chapter-nav__dot {
  background: color-mix(in srgb, var(--c-primary) 55%, transparent);
}

.chapter-nav__item--active .chapter-nav__dot {
  background: var(--c-primary);
  box-shadow: 0 0 0 4px var(--c-primary-light);
  transform: scale(1.3);
}

@media (max-width: 900px) {
  /* 窄屏降级为静态分段布局：章节牌不再 sticky，导航点隐藏 */
  .chapter-nav {
    display: none;
  }

  .scene {
    padding: 64px 0;
  }

  .scene__inner {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .scene__sticky {
    position: static;
  }

  .finale {
    min-height: 60vh;
  }
}

/* ---- 创作足迹热力图面板 ---- */
.heatmap-panel {
  padding: 26px 28px;
  background: var(--c-bg-card);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.chip {
  padding: 2px 9px;
  font-size: 12px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: var(--radius-control);
}

.meta-dot {
  color: var(--c-text-muted);
  opacity: 0.6;
}

/* 渐显通用类 */
.reveal {
  opacity: 0;
  transform: translateY(26px);
  transition:
    opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
    border-color 0.25s ease,
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.reveal--visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
  }
}

/* ---- 头条大卡 ---- */
.featured {
  position: relative;
  display: block;
  overflow: hidden;
  margin-bottom: 26px;
  padding: 32px 34px 28px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  text-decoration: none;
  transition: border-color var(--dur-soft) ease, box-shadow var(--dur-soft) ease, transform var(--dur-soft) ease;
}

.featured:hover {
  border-color: color-mix(in srgb, var(--c-primary) 40%, transparent);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

/* 「最新发布」眉批：一枚安静的强调色小字，不再做贴纸 */
.featured__badge {
  position: relative;
  display: inline-block;
  padding: 0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.18em;
  color: var(--c-primary);
}

.featured__badge::after {
  content: '';
  display: block;
  width: 100%;
  height: 1px;
  margin-top: 4px;
  background: var(--c-primary);
  opacity: 0.35;
}

.featured__title {
  position: relative;
  margin: 16px 0 0;
  font-family: var(--font-serif);
  font-size: clamp(22px, 3.2vw, 28px);
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.03em;
  color: var(--c-text);
  transition: color 0.2s ease;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.featured:hover .featured__title {
  color: var(--c-primary);
}

.featured__excerpt {
  position: relative;
  margin: 12px 0 0;
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--c-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.featured__foot {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
}

.featured__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--c-text-muted);
}

.featured__cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--c-primary);
}

.featured__cta-circle {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  font-size: 14px;
  color: inherit;
  border: 1px solid color-mix(in srgb, var(--c-primary) 40%, transparent);
  border-radius: 50%;
  transition: background-color 0.25s ease, color 0.25s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.featured:hover .featured__cta-circle {
  background: var(--c-primary);
  color: var(--c-on-primary);
  transform: rotate(0deg);
}

/* ---- 编号时间线：左侧一条竖线贯穿，序号压在线上，像目录的页码 ---- */
.row-list {
  position: relative;
}

.row-list::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 24px;
  bottom: 24px;
  width: 1px;
  /* 强调色自上而下淡出，暗示「越往下越旧」的时间方向 */
  background: linear-gradient(to bottom, var(--c-primary), var(--c-border) 75%, transparent);
}

.row {
  position: relative;
  display: block;
  padding: 20px 8px 20px 44px;
  text-decoration: none;

  &:hover .row__num {
    color: var(--c-primary);
    font-weight: 600;
  }

  &:hover .row__title {
    color: var(--c-primary);
  }
}

/* 序号压在竖线上，纸底遮住线段，像目录上的页码 */
.row__num {
  position: absolute;
  left: 0;
  top: 20px;
  width: 23px;
  padding: 2px 0;
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  color: var(--c-text-muted);
  background: var(--c-bg);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
  transition: color 0.2s ease;
}

.row:first-child .row__num {
  color: var(--c-primary);
  font-weight: 600;
}

.row__main {
  min-width: 0;
}

.row__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.03em;
  line-height: 1.5;
  color: var(--c-text);
  transition: color 0.2s ease;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row__excerpt {
  margin: 5px 0 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--c-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.empty {
  padding: 56px 20px;
  text-align: center;
  font-size: 14.5px;
  color: var(--c-text-muted);
}

.empty__icon {
  display: block;
  margin-bottom: 10px;
  letter-spacing: 0.05em; /* 颜文字更可爱 */
  opacity: 0.7;
}

/* 「查看全部」：一枚安静的文字链接，不再做胶囊按钮 */
.more-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 26px;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--c-primary);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--c-primary) 35%, transparent);
  padding-bottom: 3px;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.more-link:hover {
  color: var(--c-primary-hover);
  border-color: currentcolor;

  .more-link__arrow {
    transform: translateX(4px);
  }
}

.more-link__arrow {
  transition: transform 0.2s ease;
}

/* ---- 分类卡片：素净的抽屉，去掉彩色顶条与光斑 ---- */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.cat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 22px 22px 44px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  text-decoration: none;
  transition: border-color var(--dur-soft) ease, box-shadow var(--dur-soft) ease, transform var(--dur-soft) ease;

  &:hover {
    border-color: color-mix(in srgb, var(--c-primary) 40%, transparent);
    box-shadow: var(--shadow-card-hover);
    transform: translateY(-2px);

    .cat-card__name {
      color: var(--c-primary);
    }

    .cat-card__go {
      opacity: 1;
      transform: translateX(0);
    }
  }
}

.cat-card__count {
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--c-primary);
  font-variant-numeric: tabular-nums;
}

.cat-card__name {
  margin: 10px 0 0;
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--c-text);
  transition: color 0.2s ease;
}

.cat-card__desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--c-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cat-card__go {
  position: absolute;
  right: 18px;
  bottom: 14px;
  font-size: 16px;
  color: var(--c-primary);
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ---- 标签云：一枚枚素净的小签，不再做歪斜的彩色贴纸 ---- */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 10px;
  padding: 28px 30px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
}

.tag-cloud__item {
  padding: 6px 13px;
  line-height: 1;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-control);
  text-decoration: none;
  transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;

  sup {
    margin-left: 3px;
    font-size: 0.6em;
    opacity: 0.55;
  }

  &:hover {
    color: var(--c-primary);
    border-color: color-mix(in srgb, var(--c-primary) 45%, transparent);
    background: var(--c-primary-light);
  }
}

/* ---- 终幕：像书末的版权页，素净居中收尾 ---- */
.finale {
  display: grid;
  place-items: center;
  min-height: 62vh;
  padding: 80px 24px;
}

.finale__inner {
  width: min(640px, 100%);
  text-align: center;
}

.finale__eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

.finale__title {
  margin: 18px 0 0;
  font-family: var(--font-serif);
  font-size: clamp(22px, 3vw, 28px);
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--c-text);
}

.finale__text {
  margin: 14px 0 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 14.5px;
  letter-spacing: 0.04em;
  color: var(--c-text-muted);
}

.finale__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  margin-top: 32px;
}

.finale__btn {
  padding: 11px 26px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #fff;
  background: var(--c-primary);
  border: 1px solid var(--c-primary);
  border-radius: var(--radius-control);
  text-decoration: none;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

  &:hover {
    background: var(--c-primary-hover);
    border-color: var(--c-primary-hover);
    transform: translateY(-1px);
  }
}

.finale__btn--ghost {
  color: var(--c-text-secondary);
  background: transparent;
  border-color: var(--c-border);

  &:hover {
    color: var(--c-primary);
    background: transparent;
    border-color: var(--c-primary);
  }
}


/* ===== 回到顶部 ===== */
.back-top {
  position: fixed;
  right: 24px;
  bottom: 28px;
  z-index: 40;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  font-size: 17px;
  color: #fff;
  background: var(--c-primary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: transform var(--dur-soft) ease, background-color var(--dur-soft) ease;
}

.back-top:hover {
  background: var(--c-primary-hover);
  transform: translateY(-3px);
}

.back-top:active {
  transform: translateY(0);
}

.totop-enter-active,
.totop-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.totop-enter-from,
.totop-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

/* ===== 减少动效 ===== */
@media (prefers-reduced-motion: reduce) {
  .hero__eyebrow,
  .hero__char,
  .hero__tagline,
  .hero__stats,
  .hero__actions,
  .hero__scroll-hint,
  .hero__scroll-wheel {
    animation: none !important;
  }

  .hero__char {
    transform: none;
  }

  .hero__content {
    transform: none !important;
  }

  .marquee__track {
    animation: none !important;
  }
}
</style>
