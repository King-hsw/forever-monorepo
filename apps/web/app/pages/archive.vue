<template>
  <div class="arch-page">
    <SiteHeader width="800px" />

    <main class="arch-main">
      <!-- 页头 -->
      <header class="arch-head">
        <h1 class="arch-head__title">归档</h1>
        <p class="arch-head__sub">Archive · 共 {{ list.length }} 篇文章</p>
      </header>

      <template v-if="yearGroups.length">
        <section
          v-for="yg in yearGroups"
          :key="yg.year"
          class="arch-year"
        >
          <!-- 年份横幅 -->
          <div class="arch-year__head">
            <span class="arch-year__num">{{ yg.year }}</span>
            <span class="arch-year__line" aria-hidden="true" />
            <span class="arch-year__count">{{ countOf(yg) }} 篇</span>
          </div>

          <div v-for="mg in yg.months" :key="`${yg.year}-${mg.month}`" class="arch-month">
            <p class="arch-month__label">{{ mg.month }} 月<small>· {{ mg.items.length }} 篇</small></p>

            <ul class="arch-list">
              <li v-for="item in mg.items" :key="item.id">
                <NuxtLink :to="`/posts/${item.slug}`" class="arch-item">
                  <span
                    class="arch-item__dot"
                    :class="`arch-item__dot--${CANDY[itemIndex(yg, mg, item) % CANDY.length]}`"
                    aria-hidden="true"
                  />
                  <time
                    class="arch-item__date"
                    :datetime="item.publishedAt.slice(0, 10)"
                  >{{ formatDate(item.publishedAt) }}</time>
                  <span class="arch-item__title">{{ item.title }}</span>
                  <span class="arch-item__arrow" aria-hidden="true">→</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </section>
      </template>

      <!-- 空态 / 加载失败降级 -->
      <p v-else class="arch-empty">还没有公开的文章，先去别处逛逛吧 🍃</p>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import type { ArchiveItem } from '#shared/types'

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

interface ArchMonth {
  month: number
  /** 全局起始序号（含当年之前所有月份），用于糖果色轮换 */
  start: number
  items: ArchiveItem[]
}

interface ArchYear {
  year: number
  months: ArchMonth[]
}

/** 按年 → 月两级分组（后端已按 publishedAt 倒序） */
const yearGroups = computed<ArchYear[]>(() => {
  const result: ArchYear[] = []
  let n = 0
  for (const item of list.value) {
    const d = new Date(item.publishedAt)
    if (Number.isNaN(d.getTime())) continue
    const year = d.getFullYear()
    const month = d.getMonth() + 1

    let y = result.at(-1)
    if (!y || y.year !== year) {
      y = { year, months: [] }
      result.push(y)
    }

    let m = y.months.at(-1)
    if (!m || m.month !== month) {
      m = { month, start: n, items: [] }
      y.months.push(m)
    }
    m.items.push(item)
    n += 1
  }
  return result
})

function countOf(yg: ArchYear): number {
  return yg.months.reduce((sum, m) => sum + m.items.length, 0)
}

function itemIndex(yg: ArchYear, mg: ArchMonth, item: ArchiveItem): number {
  return mg.start + mg.items.indexOf(item)
}

/** 糖果色轮换：草莓粉 / 薄荷 / 香芋紫 / 柠檬黄 / 天空蓝 */
const CANDY = ['primary', 'mint', 'grape', 'lemon', 'sky'] as const

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}
</script>

<style scoped>
/* ===== 页面骨架 ===== */
.arch-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--c-bg-soft);
}

.arch-main {
  flex: 1;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 96px 20px 56px;
}

/* ===== 页头 ===== */
.arch-head {
  margin-bottom: 36px;
}

.arch-head__title {
  margin: 0;
  font-size: 28px;
}

.arch-head__sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--c-text-muted);
}

/* ===== 年份 ===== */
.arch-year + .arch-year {
  margin-top: 40px;
}

.arch-year__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.arch-year__num {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.02em;
  background: linear-gradient(120deg, var(--c-primary), var(--k-grape));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

/* 年份后的延伸细线 */
.arch-year__line {
  flex: 1;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--c-border), transparent);
}

.arch-year__count {
  flex-shrink: 0;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-primary-hover);
  background: var(--c-primary-light);
  border-radius: 999px;
}

/* ===== 月份 ===== */
.arch-month + .arch-month {
  margin-top: 24px;
}

.arch-month__label {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0 0 10px;
  padding-left: 34px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--c-text-secondary);

  small {
    font-size: 12px;
    font-weight: normal;
    color: var(--c-text-muted);
  }
}

/* ===== 条目列表：grid 两列（节点列 + 卡片列），天然对齐不重叠 ===== */
.arch-list {
  position: relative;
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0 0 0 34px;
  list-style: none;
}

/* 左侧虚线主轴 */
.arch-list::before {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 11px;
  width: 0;
  border-left: 2px dashed var(--c-border);
}

.arch-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 16px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-card);
  text-decoration: none;
  transition:
    transform var(--dur-soft) var(--ease-bounce),
    box-shadow var(--dur-soft) ease,
    border-color var(--dur-soft) ease;
}

.arch-item:hover {
  border-color: color-mix(in srgb, var(--c-primary) 35%, var(--c-border));
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

/* 节点：绝对定位于卡片左缘外、压在主轴上（left 相对卡片自身，不依赖行高） */
.arch-item__dot {
  position: absolute;
  top: 50%;
  left: -29px; /* 34px 缩进 - 14px 半径 - 6px 主轴偏移 */
  width: 12px;
  height: 12px;
  background: var(--c-bg-card);
  border: 3px solid var(--c-primary);
  border-radius: 50%;
  transform: translateY(-50%);
  transition: transform var(--dur-soft) var(--ease-bounce);
}

.arch-item:hover .arch-item__dot {
  transform: translateY(-50%) scale(1.25);
}

.arch-item__dot--primary { border-color: var(--c-primary); }
.arch-item__dot--mint { border-color: var(--k-mint); }
.arch-item__dot--grape { border-color: var(--k-grape); }
.arch-item__dot--lemon { border-color: var(--k-lemon); }
.arch-item__dot--sky { border-color: var(--k-sky); }

.arch-item__date {
  flex-shrink: 0;
  min-width: 44px;
  font-size: 13px;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
  transition: color var(--dur-soft) ease;
}

.arch-item__title {
  overflow: hidden;
  flex: 1;
  font-size: 15px;
  color: var(--c-text);
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--dur-soft) ease;
}

.arch-item__arrow {
  flex-shrink: 0;
  color: var(--c-primary);
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity var(--dur-soft) ease, transform var(--dur-soft) var(--ease-bounce);
}

.arch-item:hover .arch-item__date,
.arch-item:hover .arch-item__title {
  color: var(--c-primary-hover);
}

.arch-item:hover .arch-item__arrow {
  opacity: 1;
  transform: translateX(0);
}

/* ===== 空态 ===== */
.arch-empty {
  padding: 48px 0;
  font-size: 14px;
  color: var(--c-text-muted);
  text-align: center;
}

/* ===== 移动端 ===== */
@media (max-width: 640px) {
  .arch-main {
    padding-top: 88px;
  }

  .arch-head__title {
    font-size: 24px;
  }

  .arch-month__label {
    padding-left: 26px;
  }

  .arch-list {
    gap: 8px;
    padding-left: 26px;
  }

  /* 缩进变了，节点跟着挪 */
  .arch-item__dot {
    left: -23px;
  }

  .arch-item {
    gap: 10px;
    padding: 10px 12px;
  }

  .arch-item__date {
    min-width: 0;
  }

  .arch-item__title {
    white-space: normal;
  }

  .arch-item__arrow {
    display: none;
  }
}
</style>
