<template>
  <div class="rhythm-axis">
    <!-- 头部：说明 + 等宽数字统计（仿参考站 Articles/Moments 计数） -->
    <div class="rhythm-axis__head">
      <p class="rhythm-axis__desc">近一年的数字足迹：逻辑的向上生长，感性的向下扎根。</p>
      <div class="rhythm-axis__stats">
        <div class="rhythm-axis__stat">
          <span class="rhythm-axis__stat-label">文章</span>
          <span class="rhythm-axis__stat-num rhythm-axis__stat-num--up">{{ postTotal }}</span>
        </div>
        <div class="rhythm-axis__stat">
          <span class="rhythm-axis__stat-label">留言</span>
          <span class="rhythm-axis__stat-num">{{ commentTotal }}</span>
        </div>
      </div>
    </div>

    <!-- 横轴柱状：中心发丝线，玉青柱向上=发文，墨柱向下=留言；悬停十字光标 -->
    <div class="rhythm-axis__chart" role="img" :aria-label="`近一年发文 ${postTotal} 篇，收到留言 ${commentTotal} 条`">
      <div class="rhythm-axis__baseline" aria-hidden="true" />
      <div
        v-for="(w, i) in weeks"
        :key="i"
        class="rhythm-axis__col"
        role="group"
        :aria-label="`${w.label}：${w.posts} 篇文章，${w.comments} 条留言`"
      >
        <!-- 向上：发文 -->
        <span
          v-if="w.posts"
          class="rhythm-axis__bar rhythm-axis__bar--up"
          :style="{ height: w.upH + 'px' }"
        />
        <span v-else class="rhythm-axis__bar rhythm-axis__bar--stub" />
        <!-- 向下：留言 -->
        <span
          class="rhythm-axis__bar rhythm-axis__bar--down"
          :style="{ height: w.downH + 'px', opacity: w.comments ? 0.75 : 0 }"
        />
        <!-- 悬停浮层 -->
        <span class="rhythm-axis__tip">{{ w.label }}<br>{{ w.posts }} 篇 · {{ w.comments }} 言</span>
      </div>
    </div>

    <!-- 图例 -->
    <div class="rhythm-axis__legend" aria-hidden="true">
      <span><i class="rhythm-axis__dot rhythm-axis__dot--up" />发文</span>
      <span><i class="rhythm-axis__dot rhythm-axis__dot--down" />留言</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommentNode, Post } from '#shared/types'

const props = defineProps<{
  /** 已发布文章，按 createdAt/publishedAt 统计每周发文数 */
  posts: Post[]
}>()

const WEEKS = 52

/** 公开留言流：向下的柱子（取最近一年足够） */
const { data: commentPage } = await useAsyncData('home-rhythm-comments', () =>
  apiFetch<PageResult<CommentNode>>('/api/v1/comments', { query: { page: 1, size: 500 } }),
)

const flatComments = computed(() => {
  const out: string[] = []
  for (const c of commentPage.value?.list ?? []) {
    out.push(c.createdAt)
    for (const r of c.replies ?? []) out.push(r.createdAt)
  }
  return out
})

const postTotal = computed(() => props.posts.length)
const commentTotal = computed(() => flatComments.value.length)

interface WeekBucket {
  label: string
  posts: number
  comments: number
  upH: number
  downH: number
}

const weeks = computed<WeekBucket[]>(() => {
  const now = Date.now()
  const buckets = Array.from({ length: WEEKS }, (_, i) => ({
    start: now - (WEEKS - 1 - i) * 7 * 86_400_000,
    posts: 0,
    comments: 0,
  }))
  const idxOf = (ts: number) => {
    const i = WEEKS - 1 - Math.floor((now - ts) / (7 * 86_400_000))
    return i >= 0 && i < WEEKS ? i : -1
  }

  for (const p of props.posts) {
    const i = idxOf(new Date(p.publishedAt ?? p.createdAt).getTime())
    if (i >= 0) buckets[i].posts++
  }
  for (const ts of flatComments.value) {
    const i = idxOf(new Date(ts).getTime())
    if (i >= 0) buckets[i].comments++
  }

  // 高度归一化：各自以最大值为满高（46px），空周只留 2px 的呼吸短柱
  const maxP = Math.max(1, ...buckets.map(b => b.posts))
  const maxC = Math.max(1, ...buckets.map(b => b.comments))
  const fmt = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' })

  return buckets.map((b) => {
    const start = new Date(b.start)
    const end = new Date(b.start + 6 * 86_400_000)
    return {
      label: `${fmt.format(start)} – ${fmt.format(end)}`,
      posts: b.posts,
      comments: b.comments,
      upH: b.posts ? Math.round(4 + (b.posts / maxP) * 42) : 2,
      downH: b.comments ? Math.round(4 + (b.comments / maxC) * 42) : 2,
    }
  })
})
</script>

<style scoped>
.rhythm-axis__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.rhythm-axis__desc {
  margin: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 13px;
  color: var(--c-text-muted);
}

.rhythm-axis__stats {
  display: flex;
  gap: 32px;
  font-variant-numeric: tabular-nums;
}

.rhythm-axis__stat {
  display: flex;
  flex-direction: column;
}

.rhythm-axis__stat-label {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

.rhythm-axis__stat-num {
  font-size: 24px;
  color: var(--c-text-secondary);
}

.rhythm-axis__stat-num--up {
  color: var(--c-primary);
}

/* ---- 横轴柱状区 ---- */
.rhythm-axis__chart {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 224px;
  margin-top: 28px;
}

/* 中轴线 */
.rhythm-axis__baseline {
  position: absolute;
  inset: 50% 0 auto;
  height: 1px;
  background: color-mix(in srgb, var(--c-border) 60%, transparent);
}

.rhythm-axis__col {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  cursor: crosshair;
}

/* 柱体：从中心向上/下生长，高度过渡可中断平滑重定向 */
.rhythm-axis__bar {
  width: 100%;
  max-width: 3px;
  border-radius: 999px;
  transition: height 0.5s var(--ease-bounce), opacity 0.5s ease;
}

.rhythm-axis__bar--up {
  background: color-mix(in srgb, var(--c-primary) 65%, transparent);
  transform: translateY(-1px);
}

.rhythm-axis__bar--down {
  background: color-mix(in srgb, var(--c-text-muted) 80%, transparent);
  transform: translateY(1px);
}

/* 空周的呼吸短柱 */
.rhythm-axis__bar--stub {
  height: 2px;
  opacity: 0.5;
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--c-text-muted) 45%, transparent);
}

/* 悬停浮层：默认隐藏，跟随列居中显示 */
.rhythm-axis__tip {
  position: absolute;
  top: 6px;
  left: 50%;
  z-index: 2;
  padding: 5px 9px;
  font-size: 11px;
  line-height: 1.6;
  white-space: nowrap;
  text-align: center;
  pointer-events: none;
  color: var(--c-text);
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

@media (hover: hover) and (pointer: fine) {
  .rhythm-axis__col:hover .rhythm-axis__tip {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.rhythm-axis__legend {
  display: flex;
  gap: 20px;
  justify-content: flex-end;
  margin-top: 14px;
  font-size: 11.5px;
  color: var(--c-text-muted);
}

.rhythm-axis__legend span {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.rhythm-axis__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.rhythm-axis__dot--up {
  background: color-mix(in srgb, var(--c-primary) 65%, transparent);
}

.rhythm-axis__dot--down {
  background: color-mix(in srgb, var(--c-text-muted) 80%, transparent);
}
</style>
