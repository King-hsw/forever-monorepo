<template>
  <div class="tl-page">
    <main class="tl-main">
      <!-- 页头：引言 + 统计 -->
      <header class="tl-head">
        <h1 class="tl-head__title">时间线</h1>
        <p class="tl-head__quote">“ 码于行，思于心。以文补陋，以技自砺 ”</p>
        <p v-if="total" class="tl-head__meta">
          {{ yearRange }} · {{ total }} 条记录
        </p>
      </header>

      <!-- 中轴时间线 -->
      <div v-if="yearGroups.length" class="tl-spine">
        <section
          v-for="yg in yearGroups"
          :key="yg.year"
          class="tl-year reveal"
        >
          <div class="tl-node tl-node--year" aria-hidden="true" />
          <h2 class="tl-year__label">{{ yg.year }}</h2>
          <span class="tl-year__count">{{ yg.count }} POSTS</span>

          <template v-for="mg in yg.months" :key="`${yg.year}-${mg.month}`">
            <div class="tl-month reveal">
              <div class="tl-node tl-node--month" aria-hidden="true" />
              <span class="tl-month__label">{{ mg.month }} 月</span>
            </div>

            <NuxtLink
              v-for="item in mg.items"
              :key="item.id"
              :to="`/posts/${item.slug}`"
              class="tl-entry reveal"
            >
              <div class="tl-node tl-node--dot" aria-hidden="true" />
              <time class="tl-entry__date">{{ dayLabel(item.publishedAt) }}</time>
              <span class="tl-badge">文章</span>
              <span class="tl-entry__title">{{ item.title }}</span>
              <span class="tl-entry__go">阅读全文</span>
            </NuxtLink>
          </template>
        </section>
      </div>

      <div v-else class="tl-empty">还没有记录</div>
    </main>
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

interface TlMonth { month: number, items: ArchiveItem[] }
interface TlYear { year: number, count: number, months: TlMonth[] }

const yearGroups = computed<TlYear[]>(() => {
  const byYear = new Map<number, Map<number, ArchiveItem[]>>()
  for (const it of list.value) {
    const d = new Date(it.publishedAt)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    if (!byYear.has(y)) byYear.set(y, new Map())
    const byMonth = byYear.get(y)!
    if (!byMonth.has(m)) byMonth.set(m, [])
    byMonth.get(m)!.push(it)
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({
      year,
      count: [...months.values()].reduce((n, arr) => n + arr.length, 0),
      months: [...months.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([month, items]) => ({ month, items })),
    }))
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

// 滚动渐显（与首页同款 IntersectionObserver 方案）
let revealObserver: IntersectionObserver | null = null
onMounted(() => {
  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible')
        revealObserver?.unobserve(entry.target)
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
  document.querySelectorAll('.reveal').forEach(el => revealObserver!.observe(el))
})
onBeforeUnmount(() => revealObserver?.disconnect())
</script>

<style scoped>
.tl-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 24px 96px;
}

/* ===== 页头 ===== */
.tl-head {
  text-align: center;
  padding: 32px 0 56px;
}

.tl-head__title {
  margin: 0;
  font-size: clamp(28px, 3.6vw, 38px);
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--c-text);
}

.tl-head__quote {
  margin: 18px 0 0;
  font-family: var(--font-serif);
  font-size: clamp(15px, 1.6vw, 18px);
  color: var(--c-primary);
}

.tl-head__meta {
  display: inline-block;
  margin: 20px 0 0;
  padding: 5px 16px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12.5px;
  letter-spacing: 0.14em;
  color: var(--c-text-muted);
  border: 1px solid var(--c-border);
  border-radius: 999px;
}

/* ===== 中轴 ===== */
.tl-spine {
  position: relative;
  padding-left: 40px;
}

/* 贯穿竖线 */
.tl-spine::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(to bottom, var(--c-primary), var(--c-border));
  border-radius: 2px;
}

.tl-year + .tl-year {
  margin-top: 72px;
}

/* 年 / 月 / 条目共用节点定位 */
.tl-node {
  position: absolute;
  left: -40px;
  transform: translateX(calc(-50% + 9px)); /* 对齐竖线（left 8px + 1px 半宽） */
}

.tl-node--year,
.tl-node--month {
  top: 4px;
  background: var(--c-bg);
  border: 2px solid var(--c-primary);
}

.tl-node--year {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.tl-node--month {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.tl-node--dot {
  top: 12px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 0 3px var(--c-primary-light);
}

.tl-year__label {
  display: inline-block;
  margin: 0;
  font-size: clamp(26px, 3vw, 34px);
  font-weight: 800;
  color: var(--c-text);
}

.tl-year__count {
  margin-left: 14px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--c-text-muted);
}

.tl-month {
  position: relative;
  margin-top: 44px;
}

.tl-month__label {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--c-text-secondary);
}

/* ===== 条目 ===== */
.tl-entry {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 22px;
  text-decoration: none;
}

.tl-entry__date {
  flex-shrink: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 13px;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
}

.tl-badge {
  flex-shrink: 0;
  padding: 1px 9px;
  font-size: 11.5px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: 999px;
}

.tl-entry__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15.5px;
  font-weight: 550;
  color: var(--c-text);
  transition: color 0.2s ease;
}

.tl-entry:hover .tl-entry__title {
  color: var(--c-primary);
}

.tl-entry__go {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--c-text-muted);
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform: translateX(-4px);
}

.tl-entry:hover .tl-entry__go {
  opacity: 1;
  transform: translateX(0);
}

@media (max-width: 640px) {
  .tl-spine {
    padding-left: 28px;
  }

  .tl-spine::before {
    left: 4px;
  }

  .tl-node {
    left: -28px;
    transform: translateX(calc(-50% + 5px));
  }

  .tl-entry {
    flex-wrap: wrap;
    row-gap: 4px;
  }

  .tl-entry__title {
    white-space: normal;
  }

  .tl-entry__go {
    display: none;
  }
}

.tl-empty {
  padding: 80px 0;
  text-align: center;
  color: var(--c-text-muted);
}

/* 渐显 */
.reveal {
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
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
</style>
