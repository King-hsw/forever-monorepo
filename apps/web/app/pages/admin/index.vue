<template>
  <div class="dashboard">
    <!-- 初始化引导：新环境关键配置未落库时提醒 -->
    <NuxtLink v-if="setupNeeded" to="/admin/setup" class="setup-banner card fade-up">
      <span class="setup-banner__icon" aria-hidden="true">🧭</span>
      <div class="setup-banner__text">
        <strong>完成初始化配置</strong>
        <small>检测到站点地址、留言板等系统参数还未设置，建议先运行初始化引导</small>
      </div>
      <span class="setup-banner__go">去配置 →</span>
    </NuxtLink>

    <!-- 统计卡片 -->
    <section class="dashboard__stats">
      <div
        v-for="(stat, i) in stats"
        :key="stat.label"
        class="stat-card card fade-up"
        :style="{ '--stagger-index': i }"
      >
        <span class="stat-card__icon" :class="`is-${stat.tone}`" aria-hidden="true">{{ stat.icon }}</span>
        <div>
          <strong class="stat-card__value">{{ stat.value }}</strong>
          <p class="stat-card__label">{{ stat.label }}</p>
        </div>
      </div>
    </section>

    <!-- 创作热力图 -->
    <AdminHeatmap
      class="dashboard__heatmap fade-up"
      style="--stagger-index: 4"
      :posts="postsStore.list"
    />

    <section class="dashboard__grid">
      <!-- 最近文章 -->
      <div class="card dashboard__panel fade-up" style="--stagger-index: 5">
        <header class="panel-head">
          <h2>最近文章</h2>
          <NuxtLink to="/admin/posts" class="panel-head__more">查看全部 →</NuxtLink>
        </header>
        <ul class="recent-list">
          <li
            v-for="(post, i) in recentPosts"
            :key="post.id"
            class="recent-list__item"
            :style="{ '--stagger-index': i + 6 }"
          >
            <span class="badge" :class="`badge--${statusClass(post.status)}`">
              {{ statusLabel(post.status) }}
            </span>
            <NuxtLink :to="`/admin/posts/${post.id}/edit`" class="recent-list__title">
              {{ post.title }}
            </NuxtLink>
            <span class="recent-list__category">{{ categoryName(post.categoryId) }}</span>
            <time class="recent-list__time">{{ formatShortDate(post.updatedAt) }}</time>
          </li>
          <li v-if="!recentPosts.length" class="list-empty">
            还没有文章，<NuxtLink to="/admin/posts/new">写下第一篇</NuxtLink>吧
          </li>
        </ul>
      </div>

      <!-- 分类分布 -->
      <div class="card dashboard__panel fade-up" style="--stagger-index: 6">
        <header class="panel-head">
          <h2>分类分布</h2>
        </header>
        <ul class="dist-list">
          <li
            v-for="(row, i) in categoryDist"
            :key="row.name"
            class="dist-list__item"
            :style="{ '--stagger-index': i + 7 }"
          >
            <span class="dist-list__name">{{ row.name }}</span>
            <span class="dist-list__count">{{ row.count }}</span>
            <span class="dist-list__track">
              <span class="dist-list__bar" :style="{ width: `${row.percent}%` }" />
            </span>
          </li>
          <li v-if="!categoryDist.length" class="list-empty">暂无数据</li>
        </ul>

        <NuxtLink to="/admin/posts/new" class="btn btn--primary dist-cta">＋ 新建文章</NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Post, SettingItem } from '#shared/types'
import { apiFetch } from '~/utils/api'

definePageMeta({ layout: 'admin' })

useHead({ title: '仪表盘 - 补陋阁 后台' })
useState('admin-page-title', () => '仪表盘')

const postsStore = usePostsStore()
const categoriesStore = useCategoriesStore()

// 新装环境：关键系统参数从未落库（value 为空）时，引导站长先跑一遍初始化向导
const setupKeys = ['site.url', 'board.title']
const settings = ref<SettingItem[]>([])
const setupNeeded = computed(() =>
  settings.value.length > 0 && setupKeys.some(key => settings.value.find(s => s.key === key)?.value === ''),
)

// 进入后台时拉取文章（取足够大的一页用于统计）与分类数据
// 登录令牌存在 localStorage，SSR 阶段拿不到，仅客户端拉取（避免直接访问 URL 时 SSR 401 失败）
await useAsyncData('admin-dashboard', async () => {
  await Promise.all([
    postsStore.fetchAdmin({ page: 1, size: 1000 }),
    categoriesStore.fetch(),
  ])
}, { server: false })

apiFetch<SettingItem[]>('/api/admin/settings')
  .then((list) => { settings.value = list })
  .catch(() => {})

const stats = computed(() => [
  {
    label: '文章总数',
    value: postsStore.total.toLocaleString(),
    icon: '📄',
    tone: 'primary',
  },
  {
    label: '已发布',
    value: postsStore.list.filter(p => p.status === 'PUBLISHED').length.toLocaleString(),
    icon: '✅',
    tone: 'success',
  },
  {
    label: '草稿',
    value: postsStore.list.filter(p => p.status === 'DRAFT').length.toLocaleString(),
    icon: '✏️',
    tone: 'warning',
  },
  {
    label: '总浏览量',
    value: postsStore.list.reduce((sum, p) => sum + p.viewCount, 0).toLocaleString(),
    icon: '👁️',
    tone: 'default',
  },
])

const recentPosts = computed(() =>
  [...postsStore.list]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 5),
)

function categoryName(categoryId: number | null): string {
  if (!categoryId) return '未分类'
  return categoriesStore.list.find(c => c.id === categoryId)?.name ?? '未分类'
}

const categoryDist = computed(() => {
  const counts = new Map<string, number>()
  for (const post of postsStore.list) {
    const name = categoryName(post.categoryId)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const rows = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  const max = Math.max(1, ...rows.map(r => r.count))
  return rows.map(row => ({ ...row, percent: Math.round((row.count / max) * 100) }))
})
</script>

<style scoped>
.setup-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding: 16px 20px;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-card-hover);
    }
  }
}

.setup-banner__icon {
  font-size: 24px;
}

.setup-banner__text {
  flex: 1;

  strong {
    display: block;
    font-size: 14px;
  }

  small {
    font-size: 12px;
    color: var(--c-text-muted);
  }
}

.setup-banner__go {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-primary);
}

.dashboard__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-card-hover);
    }
  }
}

.stat-card__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  font-size: 20px;
  border-radius: 12px;

  &.is-default { background: var(--c-bg-soft); }
  &.is-primary { background: var(--c-primary-light); }
  &.is-success { background: rgb(16 185 129 / 12%); }
  &.is-warning { background: rgb(245 158 11 / 14%); }
}

.stat-card__value {
  display: block;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.stat-card__label {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-muted);
}

.dashboard__heatmap {
  margin-top: 16px;
}

.dashboard__grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(280px, 2fr);
  gap: 16px;
  align-items: start;
  margin-top: 16px;
}

.dashboard__panel {
  padding: 20px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  h2 {
    margin: 0;
    font-size: 15px;
  }
}

.panel-head__more {
  font-size: 13px;
  color: var(--c-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.recent-list,
.dist-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.recent-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 2px;

  & + & {
    border-top: 1px solid var(--c-border);
  }

  .badge {
    flex-shrink: 0;
  }
}

.recent-list__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--c-text);
  font-weight: 500;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: var(--c-primary);
  }
}

.recent-list__category,
.recent-list__time {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
}

.list-empty {
  padding: 28px 0;
  font-size: 13px;
  color: var(--c-text-muted);
  text-align: center;

  a {
    color: var(--c-primary);
  }
}

.dist-list__item {
  display: grid;
  grid-template-columns: 64px 24px 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
}

.dist-list__name {
  overflow: hidden;
  color: var(--c-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dist-list__count {
  color: var(--c-text-muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.dist-list__track {
  height: 8px;
  overflow: hidden;
  background: var(--c-bg-soft);
  border-radius: 999px;
}

.dist-list__bar {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: inherit;
  animation: bar-grow 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 60ms);
}

@keyframes bar-grow {
  from {
    width: 0 !important;
  }
}

.dist-cta {
  width: 100%;
  margin-top: 18px;
  padding-block: 10px;
}

@media (max-width: 1000px) {
  .dashboard__stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .dashboard__stats {
    grid-template-columns: 1fr;
  }

  .recent-list__category {
    display: none;
  }
}
</style>
