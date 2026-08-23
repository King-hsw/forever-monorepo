<template>
  <div class="archive-page">
    <!-- ===== Header：全站统一导航 ===== -->
    <SiteHeader width="800px" />

    <main class="wrap">
      <!-- 页面标题 -->
      <div class="page-head fade-up">
        <h1 class="page-head__cn">归档</h1>
        <span class="page-head__en">Archive · 共 {{ items.length }} 篇文章</span>
      </div>

      <p v-if="items.length" class="page-intro fade-up" style="--stagger-index: 1">
        按时间倒序，回顾每一段记录的时光 ✍️
      </p>

      <!-- 时间轴 -->
      <section v-if="groups.length" class="timeline fade-up" style="--stagger-index: 2">
        <div v-for="group in groups" :key="group.year" class="timeline__year-group">
          <h2 class="timeline__year">
            <span class="timeline__year-num">{{ group.year }}</span>
            <span class="timeline__year-count">{{ countOfYear(group) }} 篇</span>
          </h2>

          <div
            v-for="monthGroup in group.months"
            :key="`${group.year}-${monthGroup.month}`"
            class="timeline__month-group"
          >
            <p class="timeline__month">
              {{ monthGroup.month }} 月
              <small>{{ monthGroup.items.length }} 篇</small>
            </p>

            <ul class="timeline__list">
              <li
                v-for="(item, i) in monthGroup.items"
                :key="item.id"
                class="timeline__item"
                :style="{ '--stagger-index': monthGroup.start + i }"
              >
                <!-- 糖果色节点：按全站配角色轮换 -->
                <span
                  class="timeline__dot"
                  :class="`timeline__dot--${CANDY[(monthGroup.start + i) % CANDY.length]}`"
                  aria-hidden="true"
                />
                <NuxtLink :to="`/posts/${item.slug}`" class="timeline__card">
                  <time
                    class="timeline__date"
                    :datetime="item.publishedAt.slice(0, 10)"
                  >{{ formatDate(item.publishedAt) }}</time>
                  <span class="timeline__title">{{ item.title }}</span>
                  <span class="timeline__arrow" aria-hidden="true">→</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 空态 / 加载失败降级 -->
      <p v-else class="archive-empty fade-up" style="--stagger-index: 2">
        还没有公开的文章，先去别处逛逛吧 🍃
      </p>
    </main>

    <!-- ===== Footer ===== -->
    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import type { ArchiveItem } from '~/stores/types'

usePageSeo({
  title: '归档 - Forever',
  description: 'Forever 的全部文章归档 —— 按时间倒序排列，回顾每一段记录的时光。',
  path: '/archive',
})

/** 公开接口，可 SSR；失败时降级为空列表，不阻塞页面渲染 */
const { data: items } = await useAsyncData('public-archive', async (): Promise<ArchiveItem[]> => {
  try {
    return await apiFetch<ArchiveItem[]>('/api/v1/articles/archive')
  } catch {
    return []
  }
})

const list = computed(() => items.value ?? [])

interface MonthGroup {
  month: number
  /** 该月第一条在整个列表中的序号，用于糖果色轮换与交错动画 */
  start: number
  items: ArchiveItem[]
}

interface YearGroup {
  year: number
  months: MonthGroup[]
}

/** 按年 → 月两级分组（后端已按 publishedAt 倒序） */
const groups = computed<YearGroup[]>(() => {
  const result: YearGroup[] = []
  let n = 0
  for (const item of list.value) {
    const d = new Date(item.publishedAt)
    if (Number.isNaN(d.getTime())) continue
    const year = d.getFullYear()
    const month = d.getMonth() + 1

    let yearGroup = result.at(-1)
    if (!yearGroup || yearGroup.year !== year) {
      yearGroup = { year, months: [] }
      result.push(yearGroup)
    }

    let monthGroup = yearGroup.months.at(-1)
    if (!monthGroup || monthGroup.month !== month) {
      monthGroup = { month, start: n, items: [] }
      yearGroup.months.push(monthGroup)
    }
    monthGroup.items.push(item)
    n += 1
  }
  return result
})

function countOfYear(group: YearGroup): number {
  return group.months.reduce((sum, m) => sum + m.items.length, 0)
}

/** 糖果色轮换：薄荷 / 香芋紫 / 柠檬黄 / 天空蓝 / 草莓粉 */
const CANDY = ['mint', 'grape', 'lemon', 'sky', 'primary'] as const

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}
</script>

<style scoped>
.archive-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--c-bg-soft);
}

/* ===== 版心 ===== */
.wrap {
  flex: 1;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 96px 20px 48px;
}

.page-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-head__cn {
  margin: 0;
  font-size: 28px;
}

.page-head__en {
  font-size: 13px;
  color: var(--c-text-muted);
}

.page-intro {
  margin: 8px 0 36px;
  font-size: 14px;
  color: var(--c-text-secondary);
}

/* ===== 时间轴 ===== */

/* 年份：渐变大数字 + 篇数小徽章 */
.timeline__year-group + .timeline__year-group {
  margin-top: 44px;
}

.timeline__year {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 18px;
}

.timeline__year-num {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
  background: linear-gradient(120deg, var(--c-primary), var(--k-grape));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.timeline__year-count {
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-primary-hover);
  background: var(--c-primary-light);
  border-radius: 999px;
}

/* 月份小标 */
.timeline__month {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  padding-left: 32px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--c-text-secondary);

  small {
    font-size: 12px;
    font-weight: normal;
    color: var(--c-text-muted);
  }

  /* 标签前的短横装饰 */
  &::before {
    content: '';
    width: 14px;
    height: 2px;
    border-radius: 999px;
    background: var(--c-border);
  }
}

.timeline__month-group + .timeline__month-group {
  margin-top: 22px;
}

/* 左侧虚线主轴 */
.timeline__list {
  position: relative;
  margin: 0;
  padding: 0 0 0 32px;
  list-style: none;
}

.timeline__list::before {
  content: '';
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 6px;
  width: 0;
  border-left: 2px dashed var(--c-border);
}

/* 条目：软糖卡片 + 悬浮上浮 */
.timeline__item {
  position: relative;
  animation: fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 35ms);

  & + & {
    margin-top: 10px;
  }
}

/* 糖果色节点：白心彩圈，压在虚线上 */
.timeline__dot {
  position: absolute;
  top: 50%;
  left: 0;
  width: 14px;
  height: 14px;
  background: var(--c-bg-card);
  border: 3px solid var(--k-mint);
  border-radius: 50%;
  box-shadow: var(--shadow-card);
  transform: translateY(-50%);
  transition: transform var(--dur-soft) var(--ease-bounce);
}

.timeline__dot--mint { border-color: var(--k-mint); }
.timeline__dot--grape { border-color: var(--k-grape); }
.timeline__dot--lemon { border-color: var(--k-lemon); }
.timeline__dot--sky { border-color: var(--k-sky); }
.timeline__dot--primary { border-color: var(--c-primary); }

.timeline__item:hover .timeline__dot {
  transform: translateY(-50%) scale(1.25);
}

.timeline__card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 16px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-card);
  text-decoration: none;
  transition: transform var(--dur-soft) var(--ease-bounce),
    box-shadow var(--dur-soft) ease,
    border-color var(--dur-soft) ease;
}

.timeline__card:hover {
  border-color: color-mix(in srgb, var(--c-primary) 35%, var(--c-border));
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.timeline__date {
  flex-shrink: 0;
  min-width: 46px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--c-text-muted);
  transition: color var(--dur-soft) ease;
}

.timeline__title {
  overflow: hidden;
  flex: 1;
  font-size: 15px;
  color: var(--c-text);
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--dur-soft) ease;
}

.timeline__arrow {
  flex-shrink: 0;
  color: var(--c-primary);
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity var(--dur-soft) ease, transform var(--dur-soft) var(--ease-bounce);
}

.timeline__card:hover .timeline__title {
  color: var(--c-primary-hover);
}

.timeline__card:hover .timeline__date {
  color: var(--c-primary-hover);
}

.timeline__card:hover .timeline__arrow {
  opacity: 1;
  transform: translateX(0);
}

/* ===== 空态 ===== */
.archive-empty {
  padding: 48px 0;
  font-size: 14px;
  color: var(--c-text-muted);
  text-align: center;
}

@media (max-width: 640px) {
  .wrap {
    padding-top: 88px;
  }

  .page-head {
    flex-direction: column;
    gap: 4px;
  }

  .timeline__year-num {
    font-size: 28px;
  }

  .timeline__month {
    padding-left: 26px;
  }

  .timeline__list {
    padding-left: 24px;
  }

  /* 小屏收窄日期列，标题允许换行 */
  .timeline__card {
    gap: 10px;
    padding: 10px 12px;
  }

  .timeline__date {
    min-width: 0;
  }

  .timeline__title {
    white-space: normal;
  }

  /* 小屏隐藏箭头，避免拥挤 */
  .timeline__arrow {
    display: none;
  }
}
</style>
