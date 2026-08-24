<template>
  <div class="heatmap">
    <p class="heatmap__summary">
      近一年发文 <strong>{{ data.yearTotal }}</strong> 篇
      <template v-if="data.streak > 0">· 连续更文 {{ data.streak }} 天 🔥</template>
    </p>

    <div class="heatmap__scroll">
      <!-- 完整版：近一年，宽屏展示 -->
      <div class="heatmap__canvas heatmap__canvas--full">
        <!-- 左上角占位 -->
        <div class="heatmap__corner" />

        <!-- 月份标签，按列对齐到对应周 -->
        <div class="heatmap__months" aria-hidden="true">
          <span
            v-for="m in data.monthLabels"
            :key="`${m.col}-${m.text}`"
            class="heatmap__month"
            :style="{ gridColumnStart: m.col + 1 }"
          >
            {{ m.text }}
          </span>
        </div>

        <!-- 星期标签（只标 一 / 三 / 五） -->
        <div class="heatmap__weekdays" aria-hidden="true">
          <span>一</span>
          <span>三</span>
          <span>五</span>
        </div>

        <!-- 格子：每列一周，自上而下为周一到周日 -->
        <div class="heatmap__cells" role="img" :aria-label="`近一年发文热力图，共 ${data.yearTotal} 篇`">
          <span
            v-for="(cell, i) in data.cells"
            :key="i"
            class="heatmap__cell"
            :class="[`is-l${cell.level}`, { 'is-future': cell.future }]"
            :data-tip="cell.future ? undefined : `${cell.label} · ${cell.count} 篇`"
          />
        </div>
      </div>

      <!-- 紧凑版：只看最近几个月，手机上格子保持可读尺寸、无需滚动 -->
      <div class="heatmap__canvas heatmap__canvas--mini" aria-hidden="true">
        <div class="heatmap__corner" />
        <div class="heatmap__months">
          <span
            v-for="m in mini.monthLabels"
            :key="`m${m.col}-${m.text}`"
            class="heatmap__month"
            :style="{ gridColumnStart: m.col + 1 }"
          >
            {{ m.text }}
          </span>
        </div>
        <div class="heatmap__weekdays">
          <span>一</span>
          <span>三</span>
          <span>五</span>
        </div>
        <div class="heatmap__cells">
          <span
            v-for="(cell, i) in mini.cells"
            :key="i"
            class="heatmap__cell"
            :class="[`is-l${cell.level}`, { 'is-future': cell.future }]"
          />
        </div>
      </div>
    </div>

    <footer class="heatmap__legend">
      <span>少</span>
      <span class="heatmap__cell is-l0" />
      <span class="heatmap__cell is-l1" />
      <span class="heatmap__cell is-l2" />
      <span class="heatmap__cell is-l3" />
      <span class="heatmap__cell is-l4" />
      <span>多</span>
    </footer>

    <p v-if="data.yearTotal === 0" class="heatmap__empty">
      <slot name="empty">最近一年还没有发文记录 ✍️</slot>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Post } from '#shared/types'

const props = defineProps<{
  /** 文章列表，按 createdAt 统计每日发文数 */
  posts: Post[]
}>()

/** 展示近一年的格子（53 周 × 7 天） */
const WEEKS = 53

/** 紧凑版（窄屏）只展示最近几周 */
const MINI_WEEKS = 18

interface HeatCell {
  count: number
  /** 颜色深浅档位 0~4 */
  level: number
  /** 是否是今天之后的未来格子 */
  future: boolean
  /** 悬停提示文案，如「2025年6月8日」 */
  label: string
}

/** 本地时区的日期数字键，如 20250608 */
function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/** 档位阈值：0 篇 / 1~2 篇 / 3~4 篇 / 5~6 篇 / ≥7 篇 */
function toLevel(count: number): number {
  if (count <= 0) return 0
  if (count <= 2) return 1
  if (count <= 4) return 2
  if (count <= 6) return 3
  return 4
}

const data = computed(() => {
  // 1. 统计每日发文数
  const counts = new Map<number, number>()
  for (const p of props.posts) {
    const key = dayKey(new Date(p.createdAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  // 2. 计算网格范围：以「本周」结尾，往前推 53 周
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const mondayOffset = (today.getDay() + 6) % 7 // 周一为 0
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + (6 - mondayOffset)) // 本周日
  const start = new Date(endOfWeek)
  start.setDate(endOfWeek.getDate() - (WEEKS * 7 - 1))

  // 3. 逐格生成数据
  const cells: HeatCell[] = []
  const monthLabels: { col: number; text: string }[] = []
  let prevMonth = -1
  let yearTotal = 0

  for (let w = 0; w < WEEKS; w++) {
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + i)
      const count = counts.get(dayKey(date)) ?? 0
      const future = date.getTime() > today.getTime()
      if (!future) yearTotal += count
      cells.push({
        count,
        level: toLevel(count),
        future,
        label: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
      })
    }
    // 该周周一的月份与上周不同则打一个月份标签
    const monday = new Date(start)
    monday.setDate(start.getDate() + w * 7)
    if (monday.getMonth() !== prevMonth) {
      monthLabels.push({ col: w, text: `${monday.getMonth() + 1}月` })
      prevMonth = monday.getMonth()
    }
  }

  // 4. 连续更文天数：从今天（或昨天）往前数连续有发文的天数
  let streak = 0
  {
    const cursor = new Date(today)
    if (!counts.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1) // 今天还没发，从昨天起算
    while (counts.has(dayKey(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  return { cells, monthLabels, yearTotal, streak }
})

/** 紧凑版数据：完整版的末尾 MINI_WEEKS 周，月份标签列号同步平移 */
const mini = computed(() => ({
  cells: data.value.cells.slice(-MINI_WEEKS * 7),
  monthLabels: data.value.monthLabels
    .filter(m => m.col >= WEEKS - MINI_WEEKS)
    .map(m => ({ ...m, col: m.col - (WEEKS - MINI_WEEKS) })),
}))
</script>

<style scoped>
.heatmap {
  /* 热力图专属色阶：柿子橙由浅到深；暗色模式单独覆盖 */
  --hm-0: var(--c-bg-soft);
  --hm-1: #f8dcc0;
  --hm-2: #f0b183;
  --hm-3: #e56f43;
  --hm-4: #c96a26;
}

:global(html.dark) .heatmap {
  --hm-0: rgb(255 255 255 / 5%);
  --hm-1: rgb(229 111 67 / 28%);
  --hm-2: rgb(229 111 67 / 48%);
  --hm-3: rgb(229 111 67 / 75%);
  --hm-4: #eb8258;
}

.heatmap__summary {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--c-text-muted);

  strong {
    color: var(--c-primary);
    font-variant-numeric: tabular-nums;
  }
}

/* 自适应宽度：以容器宽度为基准计算格子尺寸，53 列始终填满一行；
 * 窄容器（手机）下缩小间距、隐藏星期标签并放宽格子下限到 4px。
 * clip 裁掉悬停放大 / 末列月份标签的溢出，避免顶出横向滚动条 */
.heatmap__scroll {
  container-type: inline-size;
  overflow-x: clip;
}

.heatmap__canvas {
  --hm-gap: 3px;
  --hm-cell: max(
    4px,
    calc((100cqw - 20px - 52 * var(--hm-gap)) / 53)
  ); /* 20px 为星期标签列 + 列间距，52 个列间距 */
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px;
  min-width: fit-content;
}

/* 按容器宽度二选一：宽屏看全年，窄屏看近几个月的紧凑版 */
@container (max-width: 480px) {
  .heatmap__canvas--full {
    display: none;
  }
}

@container (min-width: 481px) {
  .heatmap__canvas--mini {
    display: none;
  }
}

/* 紧凑版只有 18 列，格子能保持可读尺寸，无需压缩或滚动 */
.heatmap__canvas--mini {
  --hm-cell: min(
    13px,
    calc((100cqw - 24px - 17 * var(--hm-gap)) / 18)
  ); /* 24px 为星期标签列 + 列间距，17 个列间距 */
}

.heatmap__months,
.heatmap__cells {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: var(--hm-cell);
  grid-template-rows: repeat(7, var(--hm-cell));
  gap: var(--hm-gap);
}

/* 月份标签单独一行，53 列对齐格子 */
.heatmap__months {
  height: 16px;
  grid-template-rows: none;
  font-size: 11px;
  color: var(--c-text-muted);
}

.heatmap__month {
  overflow: visible;
  white-space: nowrap;
}

.heatmap__weekdays {
  display: grid;
  grid-template-rows: repeat(7, var(--hm-cell));
  gap: var(--hm-gap);
  padding-top: 20px; /* 对齐月份行下方 */
  font-size: 10px;
  line-height: var(--hm-cell);
  color: var(--c-text-muted);
}

/* 只显示 一 / 三 / 五 */
.heatmap__weekdays span:nth-child(1) { grid-row: 1; }
.heatmap__weekdays span:nth-child(2) { grid-row: 3; }
.heatmap__weekdays span:nth-child(3) { grid-row: 5; }

.heatmap__cell {
  position: relative;
  display: inline-block;
  width: var(--hm-cell);
  height: var(--hm-cell);
  border-radius: 3px;
  transition: transform var(--dur-soft) var(--ease-bounce);
}

.heatmap__cells .heatmap__cell:hover:not(.is-future) {
  z-index: 20; /* 提升悬停格自身层级，避免气泡被后续兄弟格子盖住 */
  transform: scale(1.35); /* 悬停轻轻放大 */
  box-shadow: 0 2px 6px rgb(229 111 67 / 30%);
}

/* 悬停信息气泡：替代原生 title，展示更及时、样式更精致。
 * 背景必须不透明：气泡与箭头两个伪元素有重叠区，半透明会叠出更深的接缝 */
.heatmap__cell[data-tip]::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 7px);
  left: 50%;
  z-index: 10;
  padding: 4px 9px;
  font-size: 11.5px;
  line-height: 1.35;
  white-space: nowrap;
  color: #fff;
  pointer-events: none;
  background: #171721;
  border-radius: 6px;
  opacity: 0;
  transform: translateX(-50%) translateY(2px);
  transition: opacity 0.15s ease, transform 0.15s ease;
}

/* 气泡小箭头（旋转 45° 的方块，上半露出一角） */
.heatmap__cell[data-tip]::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 3px);
  left: 50%;
  z-index: 10;
  width: 8px;
  height: 8px;
  pointer-events: none;
  background: #171721;
  border-radius: 1.5px;
  opacity: 0;
  transform: translateX(-50%) rotate(45deg);
  transition: opacity 0.15s ease;
}

html.dark .heatmap__cell[data-tip]::after,
html.dark .heatmap__cell[data-tip]::before {
  background: #3c3c4b;
}

.heatmap__cells .heatmap__cell:hover:not(.is-future)::after,
.heatmap__cells .heatmap__cell:hover:not(.is-future)::before {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.heatmap__cells .heatmap__cell:hover:not(.is-future)::before {
  transform: translateX(-50%) rotate(45deg);
}

.is-l0 { background: var(--hm-0); }
.is-l1 { background: var(--hm-1); }
.is-l2 { background: var(--hm-2); }
.is-l3 { background: var(--hm-3); }
.is-l4 { background: var(--hm-4); }

.is-future {
  visibility: hidden; /* 未来日期不渲染 */
}

/* 图例复用格子样式但不可交互 */
.heatmap__legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 10px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.heatmap__legend .heatmap__cell {
  width: 11px;
  height: 11px;
}

.heatmap__empty {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--c-text-muted);

  a {
    color: var(--c-primary);
  }
}
</style>
