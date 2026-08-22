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
          <span class="brand__mark" aria-hidden="true" />
          <span class="brand__name">Forever</span>
        </a>
        <nav class="site-nav">
          <a class="site-nav__link" href="#latest" @click.prevent="scrollToId('latest')">文章</a>
          <NuxtLink class="site-nav__link" to="/posts">全部文章</NuxtLink>
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
              :to="`/posts/${featuredPost.id}`"
              class="featured reveal"
            >
              <div class="featured__glow" aria-hidden="true" />
              <span class="featured__badge">最新发布</span>
              <h3 class="featured__title">{{ featuredPost.title }}</h3>
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

            <NuxtLink
              v-for="(post, i) in homeRows"
              :key="post.id"
              :to="`/posts/${post.id}`"
              class="row reveal"
              :style="{ '--reveal-delay': `${Math.min(i + 1, 5) * 80}ms` }"
            >
              <span class="row__num" aria-hidden="true">{{ String(i + 2).padStart(2, '0') }}</span>
              <span class="row__main">
                <h3 class="row__title">{{ post.title }}</h3>
                <p class="row__excerpt">{{ post.excerpt }}</p>
                <span class="row__meta">
                  <span class="chip">{{ categoryName(post.categoryId) }}</span>
                  <span class="meta-dot">·</span>
                  <time>{{ formatDate(post.createdAt) }}</time>
                  <span class="meta-dot">·</span>
                  <span>{{ post.views.toLocaleString() }} 次阅读</span>
                </span>
              </span>
              <span class="row__arrow" aria-hidden="true">→</span>
            </NuxtLink>

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
                :style="{ '--accent': catAccents[i % catAccents.length], '--reveal-delay': `${Math.min(i, 5) * 70}ms` }"
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
                v-for="(tag, i) in tagCloud"
                :key="tag.id"
                to="/posts"
                class="tag-cloud__item"
                :style="{ fontSize: `${tag.size}px`, '--tk': tagAccents[i % tagAccents.length] }"
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

      <!-- 终幕：订阅，全屏居中像纪录片的结尾镜头 -->
      <section id="subscribe" class="finale">
        <div class="cta-banner reveal">
          <div class="cta-banner__glow" aria-hidden="true" />
          <h2 class="cta-banner__title">不错过任何一篇更新</h2>
          <p class="cta-banner__text">订阅 RSS，新文章第一时间送达你的阅读器。</p>
          <div class="cta-banner__actions">
            <a class="cta-banner__btn" href="/rss.xml" target="_blank">订阅 RSS</a>
            <NuxtLink class="cta-banner__btn cta-banner__btn--ghost" to="/posts">浏览全部文章</NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <!-- ===== Footer ===== -->
    <footer class="site-footer">
      <div class="site-footer__inner">
        <div class="site-footer__brand">
          <span class="brand__mark" aria-hidden="true" />
          <div>
            <p class="site-footer__name">Forever</p>
            <p class="site-footer__slogan">用心记录每一篇</p>
          </div>
        </div>
        <nav class="site-footer__links">
          <a href="#latest" @click.prevent="scrollToId('latest')">最新文章</a>
          <NuxtLink to="/posts">全部文章</NuxtLink>
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
const postsStore = usePostsStore()
const categoriesStore = useCategoriesStore()
const tagsStore = useTagsStore()

/** 已发布文章，按发布时间倒序 */
const publishedPosts = computed(() =>
  postsStore.list
    .filter(p => p.status === 'published')
    .sort((a, b) => b.createdAt - a.createdAt),
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
  categoriesStore.list
    .map(cat => ({
      ...cat,
      count: publishedPosts.value.filter(p => p.categoryId === cat.id).length,
      latestTitle:
        publishedPosts.value.find(p => p.categoryId === cat.id)?.excerpt ?? '暂无文章，快来写下第一篇',
    }))
    .sort((a, b) => b.count - a.count),
)

/** 分类卡片的糖果色轮换 */
const catAccents = ['#f472b6', '#a78bfa', '#5fd4c4', '#7cc7f7', '#ffc94d', '#fb923c']

/** 标签贴纸的糖果色轮换 */
const tagAccents = ['#f472b6', '#a78bfa', '#5fd4c4', '#ffc94d', '#7cc7f7']

/** 标签云：按使用次数排序，字号随次数在 13~21px 间浮动 */
const tagCloud = computed(() => {
  const countByName = new Map<string, number>()
  for (const post of publishedPosts.value) {
    for (const t of tagsStore.list.filter(t => post.tagIds.includes(t.id))) {
      countByName.set(t.name, (countByName.get(t.name) ?? 0) + 1)
    }
  }
  const max = Math.max(1, ...countByName.values())
  return tagsStore.list
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
  [...new Set(tagsStore.list.map(t => t.name))].slice(0, 12),
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
  window.removeEventListener('pointermove', onPointerMove)
})

function categoryName(categoryId: string | null): string {
  return categoriesStore.list.find(c => c.id === categoryId)?.name ?? '未分类'
}

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
  position: relative;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border-radius: 12px; /* 圆润的小方块，像一颗软糖 */
  box-shadow: 0 4px 12px rgb(244 114 182 / 35%);
}

/* 笑脸：两颗眼睛 + 微笑嘴 */
.brand__mark::before {
  content: '';
  position: absolute;
  top: 38%;
  left: 28%;
  width: 3.5px;
  height: 5px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 11px 0 0 #fff; /* 第二只眼睛 */
}

.brand__mark::after {
  content: '';
  position: absolute;
  bottom: 22%;
  left: 50%;
  width: 10px;
  height: 6px;
  border: 2px solid #fff;
  border-top: none;
  border-left-color: transparent;
  border-right-color: transparent;
  border-radius: 0 0 12px 12px;
  transform: translateX(-50%);
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

@media (max-width: 640px) {
  .site-nav__link:not(:first-child) {
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
  background: radial-gradient(circle, rgb(255 177 208 / 45%), transparent 68%); /* 草莓粉 */
}

.hero__orb--b {
  top: 8%;
  right: -10%;
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, rgb(196 181 253 / 40%), transparent 68%); /* 香芋紫 */
}

.hero__orb--c {
  bottom: -18%;
  left: 28%;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgb(160 231 218 / 38%), transparent 70%); /* 薄荷绿 */
}

html.dark .hero__orb--a { background: radial-gradient(circle, rgb(244 114 182 / 16%), transparent 68%); }
html.dark .hero__orb--b { background: radial-gradient(circle, rgb(167 139 250 / 15%), transparent 68%); }
html.dark .hero__orb--c { background: radial-gradient(circle, rgb(95 212 196 / 13%), transparent 70%); }

/* 点阵网格，随滚动缓慢漂移，向下淡出 */
.hero__grid {
  position: absolute;
  inset: -60px 0;
  background-image: radial-gradient(rgb(244 114 182 / 15%) 1px, transparent 1px);
  background-size: 28px 28px;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 62%, transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 62%, transparent);
  will-change: transform;
}

html.dark .hero__grid {
  background-image: radial-gradient(rgb(255 157 198 / 12%) 1px, transparent 1px);
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
  background-image: linear-gradient(105deg, #f472b6 0%, #a78bfa 50%, #5fd4c4 100%); /* 草莓粉 → 香芋紫 → 薄荷绿 */
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
  color: #fff;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border: none;
  border-radius: 999px; /* 小软糖胶囊 */
  cursor: pointer;
  text-decoration: none;
  box-shadow: 0 6px 18px rgb(244 114 182 / 32%), inset 0 -3px 0 rgb(0 0 0 / 8%); /* 底部厚度像果冻 */
  transition: transform var(--dur-soft) var(--ease-bounce), box-shadow var(--dur-soft) ease;
}

.hero__cta:hover {
  transform: translateY(-3px) scale(1.04); /* 弹起 */
  box-shadow: 0 10px 26px rgb(244 114 182 / 42%), inset 0 -3px 0 rgb(0 0 0 / 8%);
}

.hero__cta:active {
  transform: translateY(0) scale(0.95); /* 按下压扁 */
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

/* ===== 滚动叙事分镜 ===== */
.scene {
  scroll-margin-top: 56px;
  padding: 100px 0;
}

/* 交替底色区分相邻场景，像翻到下一页 */
.scene--tinted {
  background: color-mix(in srgb, var(--c-primary-light) 40%, transparent);
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
  font-size: 44px;
  font-weight: 800;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1.5px #f0b9d6; /* 描边空心章节号 */
}

html.dark .scene__no {
  -webkit-text-stroke-color: #5a4a66;
}

@supports not (-webkit-text-stroke: 1px black) {
  .scene__no { color: #f0b9d6; }
  html.dark .scene__no { color: #5a4a66; }
}

.scene__title {
  margin: 16px 0 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--c-text);
}

.scene__desc {
  margin: 10px 0 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--c-text-secondary);
}

/* ===== 终幕：结尾镜头全屏居中 ===== */
.finale {
  display: grid;
  place-items: center;
  min-height: 78vh;
  padding: 80px 24px;
}

.finale .cta-banner {
  width: min(680px, 100%);
}

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

/* ---- 头条大卡 ---- */
.featured {
  position: relative;
  display: block;
  overflow: hidden;
  margin-bottom: 30px;
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
    radial-gradient(420px 220px at 88% -10%, rgb(196 181 253 / 18%), transparent 70%),
    radial-gradient(380px 240px at 0% 110%, rgb(255 177 208 / 20%), transparent 70%);
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
}

.featured__badge {
  position: relative;
  display: inline-block;
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #fff;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border-radius: 999px;
  transform: rotate(-3deg); /* 像随手贴上的贴纸 */
  box-shadow: 0 3px 8px rgb(244 114 182 / 30%);
}

.featured__title {
  position: relative;
  margin: 18px 0 0;
  font-size: clamp(23px, 3.4vw, 30px);
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.015em;
  color: var(--c-text);

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
  padding: 22px 10px;
  border-bottom: 1px solid var(--c-border);
  text-decoration: none;
  transition: background-color 0.25s ease, padding-left 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    background: color-mix(in srgb, var(--c-primary-light) 60%, transparent);
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
    }
  }
}

/* 描边空心序号，hover 时点亮 */
.row__num {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1.3px #e8d0e2; /* 淡粉描边 */
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  transition: -webkit-text-stroke-color 0.25s ease, transform 0.25s var(--ease-bounce);
}

html.dark .row__num {
  -webkit-text-stroke-color: #5a4a66;
}

@supports not (-webkit-text-stroke: 1px black) {
  .row__num {
    color: #e8d0e2;
  }

  html.dark .row__num {
    color: #5a4a66;
  }
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

.row__arrow {
  font-size: 18px;
  color: var(--c-primary);
  opacity: 0;
  transform: translateX(-8px);
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
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

/* 「查看全部」链接 */
.more-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  padding: 10px 22px;
  font-size: 14px;
  font-weight: 600;
  color: var(--c-primary);
  background: var(--c-bg-card);
  border: 1px solid color-mix(in srgb, var(--c-primary) 35%, transparent);
  border-radius: 999px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.more-link:hover {
  color: #fff;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border-color: transparent;
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 8px 20px rgb(244 114 182 / 32%);

  .more-link__arrow {
    transform: translateX(4px);
  }
}

.more-link__arrow {
  transition: transform 0.2s ease;
}

/* ---- 分类卡片墙 ---- */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.cat-card {
  --accent: var(--c-primary);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 22px 22px 46px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 16px;
  text-decoration: none;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 3px;
    background: var(--accent);
    opacity: 0.75;
  }

  &::after {
    content: '';
    position: absolute;
    top: -40px;
    right: -40px;
    width: 130px;
    height: 130px;
    background: var(--accent);
    filter: blur(52px);
    opacity: 0.12;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    box-shadow: var(--shadow-card-hover);

    &::after {
      opacity: 0.28;
      transform: scale(1.25);
    }

    .cat-card__go {
      opacity: 1;
      transform: translateX(0);
      color: var(--accent);
    }

    .cat-card__name {
      color: var(--accent);
    }
  }
}

.cat-card__count {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--accent);
}

.cat-card__name {
  margin: 10px 0 0;
  font-size: 19px;
  font-weight: 750;
  color: var(--c-text);
  transition: color 0.2s ease;
}

.cat-card__desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
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
  font-size: 17px;
  color: var(--accent);
  opacity: 0;
  transform: translateX(-8px);
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ---- 标签云：像一板彩色贴纸 ---- */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 12px;
  padding: 28px 30px;
  background: var(--c-bg-card);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius-card);
}

.tag-cloud__item {
  --tk: var(--c-primary);
  padding: 7px 15px;
  font-weight: 650;
  line-height: 1;
  color: color-mix(in srgb, var(--tk) 75%, var(--c-text));
  background: color-mix(in srgb, var(--tk) 13%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--tk) 30%, transparent);
  border-radius: 999px;
  text-decoration: none;
  transition: transform var(--dur-soft) var(--ease-bounce), box-shadow var(--dur-soft) ease;

  sup {
    margin-left: 3px;
    font-size: 0.6em;
    opacity: 0.65;
  }

  &:hover {
    background: color-mix(in srgb, var(--tk) 22%, transparent);
    transform: translateY(-3px) rotate(-2deg); /* 贴纸被轻轻掎起 */
    box-shadow: 0 6px 14px color-mix(in srgb, var(--tk) 25%, transparent);
  }
}

/* 贴纸般的轻微歪斜，交替方向避免呆板 */
.tag-cloud__item:nth-child(3n) { rotate: 1.2deg; }
.tag-cloud__item:nth-child(3n + 1) { rotate: -1.5deg; }
.tag-cloud__item:nth-child(4n) { rotate: -0.8deg; }

/* ---- CTA 横幅 ---- */
.cta-banner {
  position: relative;
  overflow: hidden;
  padding: 44px 32px;
  text-align: center;
  /* 草莓牛奶 → 香芋 → 薄荷的糖果渐变 */
  background: linear-gradient(135deg, #f472b6, #b195f7 55%, #6fd4c3);
  border-radius: 26px;
  box-shadow: 0 12px 34px rgb(244 114 182 / 25%);
}

.cta-banner::before {
  content: '✿';
  position: absolute;
  top: 16px;
  left: 22px;
  font-size: 22px;
  color: rgb(255 255 255 / 45%);
  transform: rotate(-12deg);
}

.cta-banner::after {
  content: '✦';
  position: absolute;
  right: 26px;
  bottom: 18px;
  font-size: 20px;
  color: rgb(255 255 255 / 40%);
  transform: rotate(10deg);
}

.cta-banner__glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(300px 160px at 15% 20%, rgb(255 255 255 / 18%), transparent 70%),
    radial-gradient(260px 180px at 85% 90%, rgb(255 255 255 / 12%), transparent 70%);
  pointer-events: none;
}

.cta-banner__title {
  position: relative;
  margin: 0;
  font-size: clamp(20px, 3vw, 26px);
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.01em;
}

.cta-banner__text {
  position: relative;
  margin: 10px 0 0;
  font-size: 14.5px;
  color: rgb(255 255 255 / 82%);
}

.cta-banner__actions {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 26px;
}

.cta-banner__btn {
  padding: 11px 26px;
  font-size: 14px;
  font-weight: 700;
  color: var(--c-primary);
  background: #fff;
  border-radius: 999px;
  text-decoration: none;
  box-shadow: 0 6px 18px rgb(0 0 0 / 18%);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 26px rgb(0 0 0 / 26%);
  }
}

.cta-banner__btn--ghost {
  color: #fff;
  background: rgb(255 255 255 / 14%);
  border: 1px solid rgb(255 255 255 / 45%);
  backdrop-filter: blur(4px);
}

/* ===== Footer ===== */
.site-footer {
  margin-top: 48px;
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
  color: var(--c-text-muted);
  border-top: 1px solid var(--c-border);
}

.site-footer__heart span {
  color: var(--c-primary);
}

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
  box-shadow: 0 8px 20px rgb(244 114 182 / 35%), inset 0 -3px 0 rgb(0 0 0 / 8%);
  transition: transform var(--dur-soft) var(--ease-bounce), box-shadow var(--dur-soft) ease;
}

.back-top:hover {
  transform: translateY(-4px) scale(1.08);
  box-shadow: 0 12px 26px rgb(244 114 182 / 45%), inset 0 -3px 0 rgb(0 0 0 / 8%);
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
