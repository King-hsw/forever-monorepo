<template>
  <div class="blog-home">
    <!-- ===== 顶部滚动进度条 ===== -->
    <div
      class="scroll-progress"
      :class="{ 'scroll-progress--on': isScrolled }"
      :style="{ transform: `scaleX(${progress})` }"
      aria-hidden="true"
    />

    <!-- ===== Hero：左标中迎右铭，三段式（仿参考站） -->
    <section ref="heroEl" class="hero">
      <!-- 玉青氛围光斑：大面积柔焦洗出淡绿纸感（仿参考站 bg-jade-500/10 blur-100px） -->
      <div class="hero__orb hero__orb--a" aria-hidden="true" />
      <div class="hero__orb hero__orb--b" aria-hidden="true" />
      <div class="hero__orb hero__orb--c" aria-hidden="true" />
      <div ref="heroContent" class="hero__content">
        <div class="hero__mark fade-hero" aria-hidden="true">
          <img src="/icons/avatar.png" alt="补陋阁" class="hero__mark-img" />
        </div>

        <div class="hero__side fade-hero" style="--hd: 240ms">
          <p class="hero__subtitle">// 曾经是一名Java开发者 // 正努力学习AI中</p>
          <p class="hero__motto">有朋自远方来，不亦乐乎。</p>
          <p class="hero__motto">码于行，思于心。以文补陋，以技自砺。</p>
        </div>
      </div>

      <!-- 滚动提示：底部中央弹跳箭头 -->
      <button type="button" class="hero__scroll-hint" aria-label="滚动查看内容" @click="scrollToId('latest')">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </section>

    <main>
      <!-- 章节导航：固定在右侧，滚过 Hero 后才出现，可点击跳转 -->
      <nav class="chapter-nav" :class="{ 'chapter-nav--hidden': !showChapterNav }" aria-label="页面章节">
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

      <!-- 01 近期笔墨：左主栏（头条 + 时间线），右边栏（分类清单 + 标签） -->
      <section id="latest" class="writing">
        <div class="writing__grid">
          <div class="writing__main">
            <header class="section-head reveal">
              <p class="section-head__caption">卷壹 · 墨痕</p>
              <h2 class="section-head__title">近期笔墨</h2>
              <p class="section-head__desc">刚刚写下的文字，还热乎着。</p>
            </header>

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

            <NuxtLink v-if="totalPosts > homeCount" to="/posts" class="more-link">
              查看全部 {{ totalPosts }} 篇
              <span class="more-link__arrow">→</span>
            </NuxtLink>
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
import type { Category, PageResult, Post } from '#shared/types'

// 从 forever-server 拉取公开数据（已发布文章 / 分类 / 标签）
const { data: pageData } = await useAsyncData('home-articles', () =>
  apiFetch<PageResult<Post>>('/api/v1/articles', { query: { page: 1, size: 1000 } }),
)
const { data: categories } = await useAsyncData('home-categories', () =>
  apiFetch<Category[]>('/api/v1/categories'),
)
// 站点信息：建站日期算运行天数（与页脚共用缓存）

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

// ===== 平滑滚动辅助 =====

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ===== 章节导航：追踪当前所处分镜 =====

/** 首页章节（顺序即叙事顺序，标签取乾卦爻辞：龙之进阶） */
const sections = [
  { id: 'latest', label: '卷壹 · 墨痕' },
]

const activeSection = ref('latest')
let sectionIO: IntersectionObserver | null = null

/** Hero 在视口内时隐藏右侧章节导航 */
const showChapterNav = ref(false)

const isScrolled = ref(false)
const showBackTop = ref(false)
const progress = ref(0)

function onScrollChrome() {
  const y = window.scrollY
  isScrolled.value = y > 24
  showBackTop.value = y > 600
  // 滚过 Hero 底部（留一点余量）才显示章节导航
  const heroBottom = heroEl.value?.offsetHeight ?? window.innerHeight
  showChapterNav.value = y > heroBottom - 120
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
    io = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
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

usePageSeo({
  title: '补陋阁',
  path: '/',
})
</script>

<style scoped>
.blog-home {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
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
  height: 3px;
  background: linear-gradient(90deg, var(--c-primary), var(--k-grape), var(--k-mint));
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
  justify-content: center;
  min-height: calc(100svh - 5rem);
  padding: 48px 24px 64px;
  overflow: clip;
}

/* 玉青氛围光斑：pointer-events 穿透，柔焦洗色 */
.hero__orb {
  position: absolute;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: rgb(20 184 166 / 10%);
  filter: blur(100px);
  pointer-events: none;
}

.hero__orb--a {
  left: 25%;
  top: 50%;
  transform: translateY(-50%);
}

.hero__orb--b {
  right: 0;
  bottom: 0;
  background: rgb(20 184 166 / 5%);
  filter: blur(80px);
}

.hero__orb--c {
  right: 12%;
  top: 18%;
  width: 160px;
  height: 160px;
  background: rgb(13 148 136 / 7%);
}

@media (min-width: 768px) {
  .hero {
    min-height: calc(100svh - 8rem);
    padding: 48px 24px;
  }
}

/* 入场：自下而上逐层浮现（延迟由 --hd 控制） */
.fade-hero {
  animation: fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) var(--hd, 0ms) both;
}

/* 三段式：左标 | mono 迎语 | 铭文+社交，参考站 hero 同构 */
.hero__content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: clamp(32px, 5vw, 72px);
  width: min(1080px, calc(100% - 48px));
  margin-inline: auto;
}

@media (max-width: 767px) {
  .hero__content {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 36px;
  }
}

/* 左：品牌大软糖（参考站头像位），3px 近直角 + 发丝描边；--s 驱动笑脸各部位缩放 */
.hero__mark {
  --s: clamp(96px, 12vw, 152px);
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: var(--s);
  height: var(--s);
}

/* 笑脸：两颗眼睛 + 微笑嘴，尺寸全部由 --s 推导 */
/* 边缘羽化：径向遮罩让图片渐隐融入纸色背景 */
.hero__mark-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 999px;
  -webkit-mask-image: radial-gradient(circle at center, #000 58%, transparent 76%);
  mask-image: radial-gradient(circle at center, #000 58%, transparent 76%);
}

/* 中：mono 迎语两行——斜体玉青轻问候 + 墨色实名 */
.hero__subtitle {
  margin: 0;
  font-family: var(--font-mono, ui-monospace, 'JetBrains Mono', monospace);
  font-size: 13.5px;
  line-height: 2;
  color: #78716c; /* ink-500 */
}

/* 右：衬线铭文 + 社交链接 */
.hero__side {
  display: flex;
  flex-direction: column;
  gap: 44px;
}

@media (max-width: 767px) {
  .hero__side {
    gap: 32px;
  }
}

.hero__motto {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(20px, 2vw, 24px); /* text-2xl */
  line-height: 1.625;
  color: #292524; /* ink-800 */
}

/* 滚动提示：底部中央弹跳箭头 */
.hero__scroll-hint {
  position: absolute;
  left: 50%;
  bottom: 32px;
  margin-left: -19px; /* 22px 图标 + 2×8px padding，取半宽实现水平居中 */
  display: grid;
  place-items: center;
  padding: 8px;
  color: var(--c-text-muted);
  cursor: pointer;
  opacity: 0.4;
  background: none;
  border: none;
  transition: opacity 0.2s ease;
  animation: hero-scroll-bounce 1.6s ease-in-out infinite;
}

@keyframes hero-scroll-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}

@media (hover: hover) and (pointer: fine) {
  .hero__scroll-hint:hover {
    opacity: 0.9;
  }
}

/* ---- 近期笔墨：左主栏 + 右边栏（参考余白首页的 1.6fr : 1fr 编排）---- */
.writing {
  scroll-margin-top: 56px;
  padding: 100px 0 110px;
}

.writing__grid {
  display: grid;
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ---- 章节头：英文眉题 + 粗黑标题 ---- */
.section-head__caption {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--c-primary);
}

.section-head__title {
  margin: 8px 0 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--c-text);
}

.section-head__desc {
  margin: 12px 0 0;
  font-size: 13.5px;
  line-height: 1.8;
  letter-spacing: 0.02em;
  color: var(--c-text-muted);
}

/* ---- 边栏区块：小标题 + 清单 ---- */
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
  transition: opacity 0.35s ease, visibility 0.35s;
}

/* 淡入淡出而非硬切；visibility 延迟切换保证退出动画完整，且隐藏后不可交互 */
.chapter-nav--hidden {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
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
  transition: color var(--dur-soft) ease, background-color var(--dur-soft) ease, border-color var(--dur-soft) ease, box-shadow var(--dur-soft) ease, transform var(--dur-soft) var(--ease-bounce);
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
  /* 窄屏降级为单列：边栏移到主栏下方，导航点隐藏 */
  .chapter-nav {
    display: none;
  }

  .writing {
    padding: 64px 0 72px;
  }

  .writing__grid {
    grid-template-columns: 1fr;
    gap: 48px;
  }

}

/* ---- 创作足迹热力图面板 ---- */
.chip {
  padding: 2px 10px;
  font-size: 12px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: 999px;
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

/* ---- 头条区：直接落在版面上，素净 ---- */
.featured {
  position: relative;
  display: block;
  margin-bottom: 26px;
  padding: 30px 34px 26px;
  text-decoration: none;
}

/* 「最新发布」贴纸徽章：渐变胶囊微倾斜，缀一颗小星星 */
.featured__badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 15px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #fff;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border-radius: 999px;
  transform: rotate(-2deg); /* 像随手贴上的贴纸 */
  box-shadow: 0 3px 10px rgb(13 148 136 / 35%);
}

.featured__badge::before {
  content: '✦';
  font-size: 11px;
}

.featured__title {
  position: relative;
  margin: 16px 0 0;
  font-size: clamp(22px, 3.2vw, 28px);
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.015em;
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
  margin-top: 20px;
  padding-top: 16px;
  /* 虚线分隔，像手账里的一页 */
  border-top: 1.5px dashed var(--c-border);
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
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--c-primary);
}

.featured__cta-circle {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  font-size: 15px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: 50%;
  transition:
    background var(--dur-soft) ease,
    color var(--dur-soft) ease,
    transform 0.3s var(--ease-bounce);
}

@media (hover: hover) and (pointer: fine) {
  .featured:hover .featured__cta-circle {
    color: #fff;
    background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
    transform: rotate(-45deg) scale(1.12);
    box-shadow: 0 4px 12px rgb(13 148 136 / 35%);
  }
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
  font-size: 16.5px;
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

/* 「查看全部」：素净的纯文本链接 */
.more-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 26px;
  font-size: 14px;
  font-weight: 600;
  color: var(--c-primary);
  text-decoration: none;
}

@media (hover: hover) and (pointer: fine) {
  .more-link:hover {
    text-decoration: underline;

    .more-link__arrow {
      transform: translateX(4px);
    }
  }
}

.more-link__arrow {
  transition: transform 0.2s ease;
}

/* 无卡片外壳，用软色块分区；悬停染上玉青即可 */

/* ===== 回到顶部：小软糖 ===== */
.back-top {
  position: fixed;
  right: 24px;
  bottom: 28px;
  z-index: 40;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  font-size: 18px;
  color: #fff;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 8px 20px rgb(13 148 136 / 35%), inset 0 -3px 0 rgb(0 0 0 / 8%);
  transition: transform var(--dur-soft) var(--ease-bounce), box-shadow var(--dur-soft) ease;
}

@media (hover: hover) and (pointer: fine) {
  .back-top:hover {
    transform: translateY(-2px) scale(1.04);
    box-shadow: 0 12px 26px rgb(13 148 136 / 45%), inset 0 -3px 0 rgb(0 0 0 / 8%);
  }
}

.back-top:active {
  transform: scale(0.92);
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
  .fade-hero,
  .hero__scroll-hint {
    animation: none !important;
  }

  .hero__content {
    transform: none !important;
  }
}
</style>
