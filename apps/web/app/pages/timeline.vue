<template>
  <div class="tl-page">
    <!-- 页头：正常文档流 -->
    <header class="tl-head">
      <p class="tl-head__eyebrow">TIMELINE · 时间线</p>
      <h1 class="tl-head__title">日子向前，文字替我记得</h1>
      <p class="tl-head__quote">“ 码于行，思于心。以文补陋，以技自砺 ”</p>
      <p v-if="total" class="tl-head__meta">{{ yearRange }} · {{ total }} 条记录</p>
    </header>

    <!-- 横向卷轴：竖向滚动驱动横移 -->
    <section ref="wrapEl" class="tl-wrap" :style="{ height: `${wrapH}px` }">
      <div class="tl-stage">
        <!-- 背景：网格纸 + 氛围光斑 -->
        <div class="tl-grid" aria-hidden="true" />
        <div class="tl-orb tl-orb--a" aria-hidden="true" />
        <div class="tl-orb tl-orb--b" aria-hidden="true" />

        <!-- 水平轴线 -->
        <div class="tl-axis" aria-hidden="true" />

        <!-- 移动轨道 -->
        <div ref="trackEl" class="tl-track" :style="{ transform: `translate3d(${-offset}px,0,0)` }">
          <template v-for="(yg, yi) in yearGroups" :key="yg.year">
            <!-- 幽灵年份 -->
            <span class="tl-ghost" aria-hidden="true">{{ yg.year }}</span>

            <!-- 年份牌 -->
            <div class="tl-cell tl-cell--year">
              <div class="tl-yearcard reveal">
                <p class="tl-yearcard__range">{{ yi === 0 ? 'CHRONOLOGICAL ORDER' : `${yg.count} POSTS` }}</p>
                <h2 class="tl-yearcard__num">{{ yg.year }}</h2>
                <p class="tl-yearcard__count">{{ yg.count }} 条记录</p>
              </div>
            </div>

            <!-- 文章卡片，上下交替 -->
            <NuxtLink
              v-for="(item, i) in yg.items"
              :key="item.id"
              :to="`/posts/${item.slug}`"
              class="tl-cell"
            >
              <article class="tl-card" :class="i % 2 ? 'tl-card--below' : 'tl-card--above'">
                <p class="tl-card__date">{{ dayLabel(item.publishedAt) }}</p>
                <h3 class="tl-card__title">{{ item.title }}</h3>
                <p class="tl-card__go">阅读全文 →</p>
              </article>
              <!-- 曲线茎 + 节点 -->
              <svg class="tl-stem" :class="i % 2 ? 'tl-stem--below' : 'tl-stem--above'" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 12 70 C 12 110, 88 30, 88 70" pathLength="1" fill="none" stroke="currentColor" stroke-width="0.8" vector-effect="non-scaling-stroke" />
              </svg>
              <span class="tl-dot" aria-hidden="true"><span class="tl-dot__pulse" /></span>
            </NuxtLink>
          </template>

          <!-- 收尾 -->
          <div class="tl-cell tl-cell--end">
            <p class="tl-end">— 未完待续 —</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ArchiveItem } from '#shared/types'

const { data: items } = await useAsyncData('public-timeline', async (): Promise<ArchiveItem[]> => {
  try {
    return await apiFetch<ArchiveItem[]>('/api/v1/articles/archive')
  } catch {
    return []
  }
})

const list = computed(() => items.value ?? [])
const total = computed(() => list.value.length)

interface TlYear { year: number, count: number, items: ArchiveItem[] }

const yearGroups = computed<TlYear[]>(() => {
  const byYear = new Map<number, ArchiveItem[]>()
  for (const it of list.value) {
    const y = new Date(it.publishedAt).getFullYear()
    if (!byYear.has(y)) byYear.set(y, [])
    byYear.get(y)!.push(it)
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, arr]) => ({ year, count: arr.length, items: arr }))
})

const yearRange = computed(() => {
  const ys = yearGroups.value.map(g => g.year)
  return ys.length > 1 ? `${Math.max(...ys)}—${Math.min(...ys)}` : String(ys[0] ?? '')
})

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

usePageSeo({
  title: '时间线 - 补陋阁',
  description: '补陋阁 的文字时间线 —— 沿着日子回看每一篇记录。',
  path: '/timeline',
})

// ===== 横向卷轴驱动：竖向滚动进度 → 轨道横移 =====
const wrapEl = ref<HTMLElement | null>(null)
const trackEl = ref<HTMLElement | null>(null)
const offset = ref(0)
const wrapH = ref(2000)

let ticking = false

function update() {
  ticking = false
  const wrap = wrapEl.value
  const track = trackEl.value
  if (!wrap || !track) return
  if (window.innerWidth < 768) {
    wrapH.value = 0 // 移动端走普通竖排（CSS 兜底），不给额外卷动高度
    offset.value = 0
    return
  }
  const rect = wrap.getBoundingClientRect()
  const scrollable = track.scrollWidth - window.innerWidth
  const range = Math.max(1, rect.height - window.innerHeight)
  const progress = Math.min(1, Math.max(0, -rect.top / range))
  offset.value = scrollable * progress
}

function onScroll() {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(update)
  }
}

function measure() {
  const track = trackEl.value
  if (track && window.innerWidth >= 768) {
    // 卷动距离 = 轨道宽度 - 一屏宽；wrapper 高度 = 100vh + 卷动距离
    wrapH.value = window.innerHeight + Math.max(0, track.scrollWidth - window.innerWidth)
  }
  update()
}

let io: IntersectionObserver | null = null

onMounted(() => {
  measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', measure)
  // 入场「合入」：卡片滑入、茎线描边、节点弹出（transform 移动同样会触发 IO）
  io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('tl-in')
        io?.unobserve(entry.target)
      }
    }
  }, { threshold: 0.4 })
  document.querySelectorAll('.tl-page .tl-cell').forEach(el => io!.observe(el))
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', measure)
  io?.disconnect()
})
</script>

<style scoped>
.tl-page {
  background: var(--c-bg);
}

/* ===== 页头 ===== */
.tl-head {
  padding: 72px 24px 48px;
  text-align: center;
}

.tl-head__eyebrow {
  margin: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 11px;
  letter-spacing: 0.3em;
  color: var(--c-primary);
}

.tl-head__title {
  margin: 16px 0 0;
  font-family: var(--font-serif);
  font-size: clamp(26px, 4vw, 40px);
  font-weight: 600;
  color: var(--c-text);
}

.tl-head__quote {
  margin: 14px 0 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 15px;
  color: var(--c-text-secondary);
}

.tl-head__meta {
  display: inline-block;
  margin: 22px 0 0;
  padding: 5px 16px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--c-text-muted);
  border: 1px solid var(--c-border);
  border-radius: 999px;
}

/* ===== 卷轴舞台 ===== */
@media (min-width: 768px) {
  .tl-wrap {
    position: relative;
  }

  .tl-stage {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
  }
}

/* 网格纸背景 */
.tl-grid {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgb(128 128 128 / 3%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(128 128 128 / 3%) 1px, transparent 1px);
  background-size: 64px 64px;
}

/* 氛围光斑 */
.tl-orb {
  pointer-events: none;
  position: absolute;
  width: 800px;
  height: 800px;
  border-radius: 50%;
  filter: blur(120px);
}

.tl-orb--a {
  top: -25%;
  left: -10%;
  background: rgb(20 184 166 / 8%);
}

.tl-orb--b {
  right: -15%;
  bottom: -30%;
  background: rgb(245 158 11 / 5%);
}

/* 水平轴线 */
.tl-axis {
  pointer-events: none;
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--c-border) 8%, var(--c-border) 92%, transparent);
}

/* 轨道：一行单元格 */
.tl-track {
  display: flex;
  align-items: stretch;
  height: 100%;
  will-change: transform;
}

/* 幽灵年份：贴在年份牌后方的超大数字 */
.tl-ghost {
  position: absolute;
  top: 6vh;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: clamp(160px, 28vw, 380px);
  font-weight: 700;
  line-height: 1;
  color: var(--c-text);
  opacity: 0.05;
  pointer-events: none;
  user-select: none;
}

/* 单元格 */
.tl-cell {
  position: relative;
  flex: none;
  width: 340px;
  text-decoration: none;
}

.tl-cell--year {
  width: 420px;
}

.tl-cell--end {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 480px;
}

.tl-end {
  font-family: var(--font-serif);
  font-size: 18px;
  letter-spacing: 0.2em;
  color: var(--c-text-muted);
}

/* 年份牌：压在轴线中央偏上 */
.tl-cell--year {
  display: flex;
  align-items: center;
}

.tl-yearcard {
  margin-bottom: 18vh;
}

.tl-yearcard__range {
  margin: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  letter-spacing: 0.24em;
  color: var(--c-text-muted);
}

.tl-yearcard__num {
  margin: 8px 0 0;
  font-family: var(--font-serif);
  font-size: clamp(56px, 8vw, 96px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--c-text);
}

.tl-yearcard__count {
  margin: 12px 0 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  letter-spacing: 0.16em;
  color: var(--c-primary);
}

/* ===== 卡片：上/下交替，节点在轴线上 ===== */
.tl-card {
  position: absolute;
  left: 28px;
  right: 32px;
  padding: 18px 20px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  transition: transform 0.3s var(--ease-bounce), box-shadow 0.3s ease;
}

.tl-card--above { bottom: calc(50% + 96px); }
.tl-card--below { top: calc(50% + 96px); }

a:hover .tl-card {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}

.tl-card--below:hover { transform: translateY(4px); }

.tl-card__date {
  margin: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 11px;
  letter-spacing: 0.16em;
  color: var(--c-primary);
}

.tl-card__title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 10px 0 0;
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.55;
  color: var(--c-text);
}

.tl-card__go {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--c-text-muted);
}

/* 曲线茎：连接节点与卡片 */
.tl-stem {
  position: absolute;
  left: 4px;
  width: 80px;
  height: 96px;
  color: var(--c-border);
}

.tl-stem--above { bottom: calc(50% + 2px); }
.tl-stem--below { top: calc(50% + 2px); transform: scaleY(-1); }

/* 轴上节点 */
.tl-dot {
  position: absolute;
  left: 44px;
  top: 50%;
  width: 11px;
  height: 11px;
  transform: translate(-50%, -50%);
  background: var(--c-primary);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(20 184 166 / 12%);
  z-index: 2;
}

/* ===== 入场「合入」：未进入视口时藏起来，tl-in 后归位 ===== */
.tl-cell .tl-card {
  opacity: 0;
  transform: translateX(56px);
}

.tl-cell--year .tl-yearcard {
  opacity: 0;
  transform: translateX(40px);
}

.tl-cell .tl-stem path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

.tl-cell .tl-dot {
  transform: translate(-50%, -50%) scale(0);
}

.tl-cell.tl-in .tl-card,
.tl-cell.tl-in .tl-yearcard {
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.tl-cell.tl-in .tl-card--below {
  transition-delay: 0.08s;
}

.tl-cell.tl-in .tl-stem path {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0.7s ease 0.15s;
}

.tl-cell.tl-in .tl-dot {
  transform: translate(-50%, -50%) scale(1);
  transition: transform 0.45s var(--ease-bounce) 0.5s;
}

@media (prefers-reduced-motion: reduce) {
  .tl-cell .tl-card,
  .tl-cell--year .tl-yearcard,
  .tl-cell .tl-dot {
    opacity: 1;
    transform: none;
  }

  .tl-cell .tl-dot {
    transform: translate(-50%, -50%);
  }

  .tl-cell .tl-stem path {
    stroke-dashoffset: 0;
  }
}

.tl-dot__pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--c-primary);
  animation: tl-pulse 2.4s ease-out infinite;
}

@keyframes tl-pulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(2.6); opacity: 0; }
}

/* ===== 移动端：退化为普通竖排列表 ===== */
@media (max-width: 767px) {
  .tl-track {
    display: block;
    padding: 0 20px;
  }

  .tl-axis,
  .tl-grid,
  .tl-orb,
  .tl-stem,
  .tl-dot,
  .tl-ghost {
    display: none;
  }

  .tl-cell,
  .tl-cell--year,
  .tl-cell--end {
    width: auto;
  }

  .tl-cell--year {
    padding-top: 40px;
  }

  .tl-yearcard {
    margin-bottom: 0;
  }

  .tl-card,
  .tl-card--above,
  .tl-card--below {
    position: static;
    margin: 20px 0;
  }

  .tl-cell--end {
    padding: 40px 0;
  }
}
</style>
