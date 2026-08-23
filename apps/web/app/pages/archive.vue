<template>
  <div class="archive-page">
    <!-- ===== Header：全站统一导航 ===== -->
    <SiteHeader width="780px" />

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
          <h2 class="timeline__year">{{ group.year }}</h2>

          <template v-for="monthGroup in group.months" :key="monthGroup.month">
            <!-- 月度小标记 -->
            <div class="timeline__month">
              <span class="timeline__month-badge">{{ monthGroup.month }} 月</span>
              <span class="timeline__month-count">{{ monthGroup.items.length }} 篇</span>
            </div>

            <ul class="timeline__list">
              <li
                v-for="item in monthGroup.items"
                :key="item.id"
                class="timeline__item"
              >
                <NuxtLink :to="`/posts/${item.slug}`" class="timeline__link">
                  <time
                    class="timeline__date"
                    :datetime="item.publishedAt.slice(0, 10)"
                  >{{ formatDate(item.publishedAt) }}</time>
                  <span class="timeline__title">{{ item.title }}</span>
                </NuxtLink>
              </li>
            </ul>
          </template>
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
  items: ArchiveItem[]
}

interface YearGroup {
  year: number
  months: MonthGroup[]
}

/** 按年 → 月两级分组（后端已按 publishedAt 倒序） */
const groups = computed<YearGroup[]>(() => {
  const result: YearGroup[] = []
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
      monthGroup = { month, items: [] }
      yearGroup.months.push(monthGroup)
    }
    monthGroup.items.push(item)
  }
  return result
})

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
  max-width: 780px;
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
  margin: 8px 0 32px;
  font-size: 14px;
  color: var(--c-text-secondary);
}

/* ===== 时间轴 ===== */
.timeline__year-group + .timeline__year-group {
  margin-top: 40px;
}

.timeline__year {
  position: sticky;
  top: 64px;
  z-index: 1;
  display: inline-block;
  margin: 0 0 16px;
  padding: 4px 14px;
  font-size: 22px;
  font-weight: 700;
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-bg-card) 85%, transparent);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.timeline__month {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0 8px;
}

.timeline__month-badge {
  padding: 3px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text);
  background: var(--c-primary-light);
  border-radius: 999px;
}

.timeline__month-count {
  font-size: 12.5px;
  color: var(--c-text-muted);
}

/* 竖线 + 条目 */
.timeline__list {
  position: relative;
  margin: 0 0 6px;
  padding: 4px 0 4px 20px;
  list-style: none;
  border-left: 2px solid var(--c-border);
}

.timeline__item + .timeline__item {
  margin-top: 2px;
}

.timeline__link {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 9px 12px;
  text-decoration: none;
  border-radius: 10px;
  transition: background-color 0.2s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.timeline__link:hover {
  background: var(--c-primary-light);
  transform: translateX(4px);
}

.timeline__date {
  flex-shrink: 0;
  min-width: 44px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--c-text-muted);
}

.timeline__title {
  overflow: hidden;
  font-size: 15px;
  color: var(--c-text);
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.timeline__link:hover .timeline__title {
  color: var(--c-primary);
}

/* ===== 空态 ===== */
.archive-empty {
  padding: 40px 0;
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

  /* 小屏收窄日期列，标题允许换行 */
  .timeline__link {
    flex-direction: column;
    gap: 2px;
  }

  .timeline__date {
    min-width: 0;
  }

  .timeline__title {
    white-space: normal;
  }
}
</style>
