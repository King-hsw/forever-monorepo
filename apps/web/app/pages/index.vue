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
    <header class="site-header" :class="{ 'site-header--scrolled': isScrolled }">
      <div class="site-header__inner">
        <a class="brand" href="#" @click.prevent="scrollToTop">
          <span class="brand__mark">F</span>
          <span class="brand__name">Forever</span>
        </a>
        <nav class="site-nav">
          <a class="site-nav__link" href="#posts" @click.prevent="scrollToPosts">文章</a>
          <a class="site-nav__link" href="/rss.xml" target="_blank">RSS</a>
        </nav>
        <div class="site-header__theme"><ThemeToggle /></div>
      </div>
    </header>

    <!-- ===== Hero：视差背景 + 逐字浮现的渐变标题 ===== -->
    <section ref="heroEl" class="hero">
      <div class="hero__bg" aria-hidden="true">
        <div ref="orbA" class="hero__orb hero__orb--a" />
        <div ref="orbB" class="hero__orb hero__orb--b" />
        <div ref="orbC" class="hero__orb hero__orb--c" />
        <div ref="gridEl" class="hero__grid" />
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
              :style="{ '--d': `${260 + i * 70}ms`, '--gi': i }"
            >{{ ch }}</span>
          </span>
        </h1>
        <p class="hero__tagline">
          在这里沉淀代码之外的灵感，<br class="hero__tagline-br">
          每一篇文字都是与时间的对话。
        </p>

        <div class="hero__stats">
          <div class="hero__stat">
            <strong>{{ publishedPosts.length }}</strong>
            <span>篇文章</span>
          </div>
          <i class="hero__stat-divider" />
          <div class="hero__stat">
            <strong>{{ categoriesStore.list.length }}</strong>
            <span>个分类</span>
          </div>
          <i class="hero__stat-divider" />
          <div class="hero__stat">
            <strong>{{ tagsStore.list.length }}</strong>
            <span>个标签</span>
          </div>
        </div>

        <div class="hero__actions">
          <button type="button" class="hero__cta" @click="scrollToPosts">
            开始阅读
            <span class="hero__cta-arrow">↓</span>
          </button>
          <a class="hero__cta hero__cta--ghost" href="/rss.xml" target="_blank">RSS 订阅</a>
        </div>
      </div>

      <button type="button" class="hero__scroll-hint" aria-label="滚动查看文章" @click="scrollToPosts">
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
      <!-- ===== 栏目标题 ===== -->
      <div id="posts" class="section-head">
        <h2 class="section-head__cn">最新文章</h2>
        <span class="section-head__en">Latest Posts</span>
        <i class="section-head__line" />
      </div>

      <!-- ===== 分类筛选 ===== -->
      <nav class="filters" aria-label="分类筛选">
        <button
          type="button"
          class="filter-btn"
          :class="{ 'filter-btn--active': !activeCategory }"
          @click="setCategory('')"
        >全部</button>
        <button
          v-for="cat in categoriesStore.list"
          :key="cat.id"
          type="button"
          class="filter-btn"
          :class="{ 'filter-btn--active': activeCategory === cat.slug }"
          @click="setCategory(cat.slug)"
        >{{ cat.name }}</button>
      </nav>

      <!-- ===== 头条文章：第 1 页时放大展示最新一篇 ===== -->
      <section class="feed">
        <NuxtLink
          v-if="featuredPost"
          :to="`/posts/${featuredPost.id}`"
          class="featured reveal"
        >
          <div class="featured__glow" aria-hidden="true" />
          <span class="featured__badge">最新发布</span>
          <h2 class="featured__title">{{ featuredPost.title }}</h2>
          <p class="featured__excerpt">{{ featuredPost.excerpt }}</p>
          <div class="featured__foot">
            <div class="featured__meta">
              <span class="chip">{{ categoryName(featuredPost.categoryId) }}</span>
              <span class="meta-dot">·</span>
              <time>{{ formatDate(featuredPost.createdAt) }}</time>
              <span class="meta-dot">·</span>
              <span>{{ featuredPost.views.toLocaleString() }} 次阅读</span>
            </div>
            <span class="featured__cta">
              阅读全文
              <span class="featured__cta-circle">→</span>
            </span>
          </div>
        </NuxtLink>

        <!-- ===== 目录式文章列表：描边序号 + 分隔线，杂志目录质感 ===== -->
        <NuxtLink
          v-for="(post, i) in listPosts"
          :key="post.id"
          :to="`/posts/${post.id}`"
          class="row reveal"
          :style="{ '--reveal-delay': `${Math.min(i, 5) * 80}ms` }"
        >
          <span class="row__num" aria-hidden="true">{{ String(i + (featuredPost ? 2 : 1)).padStart(2, '0') }}</span>
          <span class="row__main">
            <h2 class="row__title">{{ post.title }}</h2>
            <p class="row__excerpt">{{ post.excerpt }}</p>
            <span class="row__meta">
              <span class="chip">{{ categoryName(post.categoryId) }}</span>
              <span class="meta-dot">·</span>
              <time>{{ formatDate(post.createdAt) }}</time>
              <span class="meta-dot">·</span>
              <span>{{ post.views.toLocaleString() }} 次阅读</span>
              <span v-if="postTags(post.tagIds).length" class="row__tags">
                <span v-for="tag in postTags(post.tagIds)" :key="tag.id"># {{ tag.name }}</span>
              </span>
            </span>
          </span>
          <span class="row__arrow" aria-hidden="true">→</span>
        </NuxtLink>

        <div v-if="!filteredPosts.length" class="empty">
          <span class="empty__icon">✧</span>
          该分类下暂无文章
        </div>
      </section>

      <!-- 分页：页码与 URL ?page= 双向同步，可直接分享/回退到某一页 -->
      <nav v-if="totalPages > 1" class="pagination" aria-label="文章分页">
        <button
          type="button"
          class="page-btn"
          :disabled="currentPage <= 1"
          @click="changePage(currentPage - 1)"
        >← 上一页</button>
        <button
          v-for="p in totalPages"
          :key="p"
          type="button"
          class="page-btn"
          :class="{ 'page-btn--active': p === currentPage }"
          @click="changePage(p)"
        >{{ p }}</button>
        <button
          type="button"
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @click="changePage(currentPage + 1)"
        >下一页 →</button>
      </nav>
    </main>

    <!-- ===== Footer ===== -->
    <footer class="site-footer">
      <div class="site-footer__inner">
        <div class="site-footer__brand">
          <span class="brand__mark">F</span>
          <div>
            <p class="site-footer__name">Forever</p>
            <p class="site-footer__slogan">用心记录每一篇</p>
          </div>
        </div>
        <nav class="site-footer__links">
          <a href="#posts" @click.prevent="scrollToPosts">文章</a>
          <NuxtLink to="/rss.xml" target="_blank">RSS</NuxtLink>
        </nav>
      </div>
      <div class="site-footer__bottom">
        <span>© {{ new Date().getFullYear() }} Forever · 记录技术与思考</span>
        <span class="site-footer__heart">用 <span aria-hidden="true">♥</span> 书写</span>
      </div>
    </footer>

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
const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()
const categoriesStore = useCategoriesStore()
const tagsStore = useTagsStore()

/** 当前选中的分类 slug（与 URL query 双向同步） */
const activeCategory = computed(() =>
  typeof route.query.category === 'string' ? route.query.category : '',
)

/** 已发布文章，按发布时间倒序 */
const publishedPosts = computed(() =>
  postsStore.list
    .filter(p => p.status === 'published')
    .sort((a, b) => b.createdAt - a.createdAt),
)

/** 按分类过滤后的列表 */
const filteredPosts = computed(() =>
  activeCategory.value
    ? publishedPosts.value.filter(p => categoryBySlug(activeCategory.value)?.id === p.categoryId)
    : publishedPosts.value,
)

/** 每页展示的文章数（第 1 页含 1 篇头条） */
const PAGE_SIZE = 5

/** 当前页码（与 URL ?page= 同步，非法值回落到第 1 页） */
const currentPage = computed(() => {
  const n = Number.parseInt(String(route.query.page ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
})

/** 总页数（至少 1 页，保证空列表时也有合法页码） */
const totalPages = computed(() => Math.max(1, Math.ceil(filteredPosts.value.length / PAGE_SIZE)))

/** 第 1 页且列表非空时，把最新一篇放大为头条 */
const featuredPost = computed(() =>
  currentPage.value === 1 ? filteredPosts.value[0] ?? null : null,
)

/** 除头条外的当前页文章切片 */
const listPosts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  const slice = filteredPosts.value.slice(start, start + PAGE_SIZE)
  return featuredPost.value ? slice.slice(1) : slice
})

/** 跑马灯标签：去重后取前 12 个 */
const marqueeTags = computed(() =>
  [...new Set(tagsStore.list.map(t => t.name))].slice(0, 12),
)

/** 无缝循环需要重复一份轨道内容 */
const marqueeLoop = computed(() => [...marqueeTags.value, ...marqueeTags.value])

/** 切换分类后数据变少时，页码可能越界，收敛到最后一页 */
watch(totalPages, () => {
  if (currentPage.value > totalPages.value) {
    setPage(totalPages.value)
  }
})

function categoryBySlug(slug: string) {
  return categoriesStore.list.find(c => c.slug === slug)
}

function categoryName(categoryId: string | null): string {
  return categoriesStore.list.find(c => c.id === categoryId)?.name ?? '未分类'
}

function postTags(tagIds: string[]) {
  return tagsStore.list.filter(t => tagIds.includes(t.id))
}

function setCategory(slug: string) {
  // 详情页的分类 chip 通过 ?category=slug 跳回这里；切换分类视为重新浏览，重置到第 1 页（去掉 page 参数）
  router.replace(slug ? { query: { category: slug } } : { query: {} })
}

/** 跳转到指定页：保留分类参数，页码为 1 时从地址栏移除 */
function setPage(page: number) {
  const clamped = Math.min(Math.max(1, page), totalPages.value)
  const query: Record<string, string> = {}
  if (activeCategory.value) {
    query.category = activeCategory.value
  }
  if (clamped > 1) {
    query.page = String(clamped)
  }
  router.replace({ query })
}

/** 翻页后回到列表顶部，避免停留在长列表底部 */
function changePage(page: number) {
  if (page === currentPage.value) return
  setPage(page)
  scrollToPosts()
}

// ===== 平滑滚动辅助 =====

function scrollToPosts() {
  document.getElementById('posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

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

// ===== Hero 视差效果 =====
// 单一 rAF 循环统一驱动：滚动视差（光斑/网格/内容以不同速率移动）+
// 鼠标视差（光斑跟随光标轻微偏移），并用 lerp 平滑，避免生硬跳变。
// 离开视口或用户偏好减少动效时停止循环。

const heroEl = ref<HTMLElement | null>(null)
const heroContent = ref<HTMLElement | null>(null)
const orbA = ref<HTMLElement | null>(null)
const orbB = ref<HTMLElement | null>(null)
const orbC = ref<HTMLElement | null>(null)
const gridEl = ref<HTMLElement | null>(null)

let rafId = 0
let heroVisible = true
let io: IntersectionObserver | null = null

// 目标值与当前值分离，lerp 逼近实现惯性平滑
let targetScroll = 0
let currentScroll = 0
let targetMX = 0
let targetMY = 0
let currentMX = 0
let currentMY = 0

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function tick() {
  // 惯性逼近：帧率无关的平滑系数
  const ease = 1 - Math.pow(0.001, 1 / 60) // ≈ 每帧逼近 10%
  currentScroll += (targetScroll - currentScroll) * ease
  currentMX += (targetMX - currentMX) * ease
  currentMY += (targetMY - currentMY) * ease

  const s = currentScroll
  const mx = currentMX
  const my = currentMY

  if (orbA.value) {
    orbA.value.style.transform = `translate3d(${mx * 30}px, ${s * 0.18 + my * 24}px, 0)`
  }
  if (orbB.value) {
    orbB.value.style.transform = `translate3d(${mx * -44}px, ${s * 0.32 + my * -30}px, 0)`
  }
  if (orbC.value) {
    orbC.value.style.transform = `translate3d(${mx * 60}px, ${s * 0.5 + my * 40}px, 0)`
  }
  if (gridEl.value) {
    gridEl.value.style.transform = `translate3d(0, ${s * 0.08}px, 0)`
  }
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

function onPointerMove(e: PointerEvent) {
  if (!heroEl.value) return
  // 归一化到 -1 ~ 1
  targetMX = (e.clientX / window.innerWidth) * 2 - 1
  targetMY = (e.clientY / window.innerHeight) * 2 - 1
}

// ===== 列表滚动渐显（IntersectionObserver）=====

let revealObserver: IntersectionObserver | null = null

function setupReveal() {
  if (prefersReducedMotion()) return
  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible')
        revealObserver?.unobserve(entry.target)
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
}

/** 翻页/切分类后，对新渲染出的卡片重新应用渐显 */
function observeReveals() {
  if (!revealObserver) return
  document.querySelectorAll<HTMLElement>('.reveal:not(.reveal--visible)').forEach((el) => {
    revealObserver!.observe(el)
  })
}

watch(listPosts, () => nextTick(observeReveals))

onMounted(() => {
  onScrollChrome()
  // 滚动监听始终注册：进度条/Header 态不依赖动效偏好
  window.addEventListener('scroll', () => {
    targetScroll = window.scrollY
    onScrollChrome()
  }, { passive: true })

  if (!prefersReducedMotion() && heroEl.value) {
    targetScroll = currentScroll = window.scrollY
    window.addEventListener('pointermove', onPointerMove, { passive: true })

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

  setupReveal()
  observeReveals()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  io?.disconnect()
  revealObserver?.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
})

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Hero 标题拆字（确定性数据，SSR 安全） */
const TITLE_A = ['记', '录']
const TITLE_B = ['技', '术', '与', '思', '考']

useHead({ title: 'Forever - 记录技术与思考' })
</script>

<style scoped>
.blog-home {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--c-bg-soft);
  overflow-x: clip;
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
  height: 3px;
  background: linear-gradient(90deg, var(--c-primary), #a855f7, #ec4899);
  transform-origin: left;
  transform: scaleX(0);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.scroll-progress--on {
  opacity: 1;
}

/* ===== Header ===== */
.site-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  transition: background-color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  border-bottom: 1px solid transparent;
}

.site-header--scrolled {
  background: color-mix(in srgb, var(--c-bg-soft) 78%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom-color: var(--c-border);
  box-shadow: 0 4px 20px rgb(0 0 0 / 5%);
}

.site-header__inner {
  display: flex;
  align-items: center;
  gap: 28px;
  max-width: 1080px;
  margin: 0 auto;
  padding: 14px 24px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  font-weight: 800;
  color: var(--c-on-primary);
  background: linear-gradient(135deg, var(--c-primary), #a855f7);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgb(99 102 241 / 35%);
}

.brand__name {
  font-size: 17px;
  font-weight: 700;
  color: var(--c-text);
  letter-spacing: 0.01em;
}

.site-nav {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.site-nav__link {
  padding: 7px 14px;
  font-size: 14px;
  color: var(--c-text-secondary);
  text-decoration: none;
  border-radius: 999px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.site-nav__link:hover {
  color: var(--c-primary);
  background: var(--c-primary-light);
}

.site-header__theme {
  display: flex;
  align-items: center;
}

@media (max-width: 560px) {
  .site-nav {
    display: none;
  }
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

.hero__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  will-change: transform;
}

.hero__orb--a {
  top: -12%;
  left: -8%;
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, rgb(99 102 241 / 32%), transparent 68%);
}

.hero__orb--b {
  top: 8%;
  right: -10%;
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, rgb(168 85 247 / 26%), transparent 68%);
}

.hero__orb--c {
  bottom: -18%;
  left: 28%;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgb(236 72 153 / 18%), transparent 70%);
}

html.dark .hero__orb--a { background: radial-gradient(circle, rgb(99 102 241 / 24%), transparent 68%); }
html.dark .hero__orb--b { background: radial-gradient(circle, rgb(168 85 247 / 20%), transparent 68%); }
html.dark .hero__orb--c { background: radial-gradient(circle, rgb(236 72 153 / 14%), transparent 70%); }

/* 点阵网格，随滚动缓慢漂移，向下淡出 */
.hero__grid {
  position: absolute;
  inset: -60px 0;
  background-image: radial-gradient(rgb(99 102 241 / 16%) 1px, transparent 1px);
  background-size: 28px 28px;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 62%, transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 62%, transparent);
  will-change: transform;
}

html.dark .hero__grid {
  background-image: radial-gradient(rgb(129 140 248 / 14%) 1px, transparent 1px);
}

.hero__content {
  position: relative;
  z-index: 1;
  max-width: 720px;
  will-change: transform, opacity;
}

.hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 6px 16px;
  font-size: 13px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border: 1px solid color-mix(in srgb, var(--c-primary) 22%, transparent);
  border-radius: 999px;
  animation: fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero__eyebrow-dot {
  width: 6px;
  height: 6px;
  background: var(--c-primary);
  border-radius: 50%;
  animation: pulse 2.2s ease-in-out infinite;
}

/* 标题：逐字从遮罩内升起；渐变字通过 background-size + 偏移拼成连续渐变 */
.hero__title {
  margin: 26px 0 0;
  font-size: clamp(40px, 8vw, 76px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
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
  background-image: linear-gradient(105deg, var(--c-primary) 0%, #a855f7 50%, #ec4899 100%);
  background-size: 500% 100%;
  background-position: calc(var(--gi, 0) * 25%) 0;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

@keyframes char-rise {
  from { transform: translateY(115%); }
  to { transform: translateY(0); }
}

.hero__tagline {
  margin: 22px 0 0;
  font-size: clamp(15px, 2vw, 17.5px);
  line-height: 1.8;
  color: var(--c-text-secondary);
  animation: fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.65s both;
}

.hero__stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  margin-top: 30px;
  animation: fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.74s both;
}

.hero__stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.hero__stat strong {
  font-size: 22px;
  font-weight: 700;
  color: var(--c-text);
  font-variant-numeric: tabular-nums;
}

.hero__stat span {
  font-size: 13px;
  color: var(--c-text-muted);
}

.hero__stat-divider {
  width: 1px;
  height: 22px;
  background: var(--c-border);
}

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
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 600;
  color: var(--c-on-primary);
  background: linear-gradient(135deg, var(--c-primary), var(--c-primary-hover));
  border: none;
  border-radius: 999px;
  cursor: pointer;
  text-decoration: none;
  box-shadow: 0 6px 20px rgb(99 102 241 / 35%);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hero__cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgb(99 102 241 / 45%);
}

.hero__cta-arrow {
  transition: transform 0.2s ease;
}

.hero__cta:hover .hero__cta-arrow {
  transform: translateY(2px);
}

.hero__cta--ghost {
  color: var(--c-text);
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  box-shadow: var(--shadow-card);
}

.hero__cta--ghost:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
  box-shadow: var(--shadow-card-hover);
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

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c-primary) 45%, transparent); }
  55% { box-shadow: 0 0 0 6px transparent; }
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

/* ===== 栏目标题 ===== */
.section-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  max-width: 800px;
  margin: 48px auto 0;
  padding: 0 20px;
  scroll-margin-top: 84px;
}

.section-head__cn {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--c-text);
}

.section-head__en {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

.section-head__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, var(--c-border), transparent);
}

/* ===== 分类筛选 ===== */
.filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 800px;
  margin: 20px auto 0;
  padding: 0 20px;
}

.filter-btn {
  padding: 6px 16px;
  font-size: 13.5px;
  color: #55556a;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--c-primary);
    border-color: color-mix(in srgb, var(--c-primary) 45%, transparent);
    transform: translateY(-1px);
  }

  &--active {
    color: var(--c-on-primary);
    background: var(--c-primary);
    border-color: var(--c-primary);

    &:hover {
      color: var(--c-on-primary);
    }
  }
}

/* ===== 信息流 ===== */
.feed {
  display: grid;
  gap: 0;
  max-width: 800px;
  margin: 26px auto 0;
  padding: 0 20px 40px;
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

.chip {
  padding: 2px 10px;
  font-size: 12px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: 999px;
}

.meta-dot {
  color: #c5c5d2;
}

/* ---- 头条大卡 ---- */
.featured {
  position: relative;
  display: block;
  overflow: hidden;
  margin-bottom: 34px;
  padding: 34px 36px 30px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 18px;
  box-shadow: var(--shadow-card);
  text-decoration: none;
}

/* 卡内的氛围光斑，hover 时苏醒 */
.featured__glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(420px 220px at 88% -10%, rgb(168 85 247 / 14%), transparent 70%),
    radial-gradient(380px 240px at 0% 110%, rgb(99 102 241 / 14%), transparent 70%);
  opacity: 0.5;
  transition: opacity 0.4s ease, transform 0.4s ease;
  pointer-events: none;
}

.featured:hover {
  border-color: color-mix(in srgb, var(--c-primary) 45%, transparent);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-3px);

  .featured__glow {
    opacity: 1;
    transform: scale(1.06);
  }

  .featured__cta-circle {
    background: var(--c-primary);
    color: var(--c-on-primary);
    transform: rotate(0deg);
  }

  .featured__title {
    background-size: 200% 100%;
    background-position: 100% 0;
  }
}

.featured__badge {
  position: relative;
  display: inline-block;
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--c-on-primary);
  background: linear-gradient(135deg, var(--c-primary), #a855f7);
  border-radius: 999px;
}

.featured__title {
  position: relative;
  margin: 18px 0 0;
  font-size: clamp(23px, 3.4vw, 30px);
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.015em;
  color: var(--c-text);
  transition: background-size 0.45s ease, background-position 0.45s ease;
  /* hover 时文字被主色「扫过」填满 */
  background-image: linear-gradient(90deg, var(--c-primary), var(--c-primary));
  background-size: 0% 2px;
  background-repeat: no-repeat;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.featured__excerpt {
  position: relative;
  margin: 12px 0 0;
  font-size: 14.5px;
  line-height: 1.7;
  color: #71718a;
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
  font-size: 13.5px;
  font-weight: 600;
  color: var(--c-primary);
}

.featured__cta-circle {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  font-size: 15px;
  color: inherit;
  background: var(--c-primary-light);
  border-radius: 50%;
  transform: rotate(-45deg);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s ease, color 0.3s ease;
}

/* ---- 目录式列表行 ---- */
.row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 22px;
  padding: 24px 10px;
  border-bottom: 1px solid var(--c-border);
  text-decoration: none;
  transition: background-color 0.25s ease, padding-left 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    background: color-mix(in srgb, var(--c-primary-light) 45%, transparent);
    padding-left: 20px;

    .row__num {
      -webkit-text-stroke-color: var(--c-primary);
      transform: scale(1.06);
    }

    .row__title {
      color: var(--c-primary);
    }

    .row__arrow {
      opacity: 1;
      transform: translateX(0);
      color: var(--c-primary);
    }
  }

  &:last-of-type {
    border-bottom-color: transparent;
  }
}

/* 描边空心序号，hover 时点亮 */
.row__num {
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1.3px #c9c9d8;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  transition: -webkit-text-stroke-color 0.25s ease, transform 0.25s ease;
}

@supports not (-webkit-text-stroke: 1px black) {
  .row__num {
    color: #c9c9d8;
  }
}

.row__main {
  min-width: 0;
}

.row__title {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--c-text);
  transition: color 0.2s ease;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row__excerpt {
  margin: 6px 0 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: #8a8aa0;
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
  margin-top: 10px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.row__tags {
  display: inline-flex;
  gap: 8px;
}

.row__arrow {
  font-size: 18px;
  color: var(--c-primary);
  opacity: 0;
  transform: translateX(-8px);
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), color 0.25s ease;
}

.empty {
  padding: 64px 20px;
  text-align: center;
  font-size: 14.5px;
  color: #9a9aad;
}

.empty__icon {
  display: block;
  margin-bottom: 10px;
  font-size: 28px;
  opacity: 0.6;
}

/* ===== 分页 ===== */
.pagination {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 800px;
  margin: 4px auto 0;
  padding: 0 20px 40px;
}

.page-btn {
  min-width: 38px;
  padding: 7px 14px;
  font-size: 13.5px;
  color: #55556a;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: var(--c-primary);
    border-color: color-mix(in srgb, var(--c-primary) 45%, transparent);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--active {
    color: var(--c-on-primary);
    background: var(--c-primary);
    border-color: var(--c-primary);

    &:hover {
      color: var(--c-on-primary);
      transform: none;
    }
  }
}

/* ===== Footer ===== */
.site-footer {
  margin-top: 24px;
  background: var(--c-bg-card);
  border-top: 1px solid var(--c-border);
}

.site-footer__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 20px;
}

.site-footer__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.site-footer__name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--c-text);
}

.site-footer__slogan {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--c-text-muted);
}

.site-footer__links {
  display: flex;
  gap: 6px;
}

.site-footer__links a {
  padding: 6px 14px;
  font-size: 13.5px;
  color: var(--c-text-secondary);
  text-decoration: none;
  border-radius: 999px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.site-footer__links a:hover {
  color: var(--c-primary);
  background: var(--c-primary-light);
}

.site-footer__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  max-width: 800px;
  margin: 0 auto;
  padding: 16px 20px 26px;
  font-size: 12.5px;
  color: #b0b0c0;
  border-top: 1px solid var(--c-border);
}

.site-footer__heart span {
  color: #ec4899;
}

/* ===== 回到顶部 ===== */
.back-top {
  position: fixed;
  right: 24px;
  bottom: 28px;
  z-index: 40;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  font-size: 18px;
  color: var(--c-primary);
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--shadow-card-hover);
  transition: transform 0.2s ease, color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}

.back-top:hover {
  color: var(--c-on-primary);
  background: var(--c-primary);
  border-color: var(--c-primary);
  transform: translateY(-3px);
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
  .hero__eyebrow-dot,
  .hero__scroll-wheel {
    animation: none !important;
  }

  .hero__char {
    transform: none;
  }

  .hero__orb,
  .hero__grid,
  .hero__content {
    transform: none !important;
  }

  .marquee__track {
    animation: none !important;
  }
}
</style>
