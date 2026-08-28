<template>
  <div class="moments-page">
    <main class="moments-main">
      <!-- 页头 -->
      <header class="moments-head">
        <h1 class="moments-head__title">动态</h1>
        <p class="moments-head__sub">Moments · 点滴日常，按时间倒序</p>
      </header>

      <!-- 顶部操作条：发布入口 + 按人筛选 chip -->
      <div class="moments-bar">
        <NuxtLink to="/moments/new" class="btn btn--primary">发布动态</NuxtLink>
        <span v-if="userUid" class="moments-chip">
          只看 <strong>{{ filterName }}</strong> 的动态
          <button type="button" class="moments-chip__close" aria-label="清除筛选" @click="clearUser">×</button>
        </span>
      </div>

      <!-- 时间线 -->
      <p v-if="pending && !list.length" class="moments-state">加载中…</p>
      <template v-else-if="list.length">
        <MomentCard
          v-for="(m, i) in list"
          :key="m.id"
          :moment="m"
          class="fade-up"
          :style="{ '--stagger-index': Math.min(i, 8) }"
          @deleted="removeFromList"
        />
        <div class="moments-more">
          <button v-if="hasMore" type="button" class="btn" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? '加载中…' : '加载更多' }}
          </button>
          <p v-else class="moments-more__end">已经到底啦 🍃</p>
        </div>
      </template>
      <p v-else class="moments-empty">
        还没有动态，<NuxtLink to="/moments/new">去发第一条</NuxtLink>吧 ✍️
      </p>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import type { Moment, PageResult } from '#shared/types'
import { useAuthStore } from '~/stores/auth'
import { apiFetch, cleanQuery } from '~/utils/api'

const SIZE = 20

usePageSeo({
  title: '动态 · 补陋阁',
  description: '补陋阁的动态时间线 —— 文字、图片、音频与视频，按时间倒序。',
  path: '/moments',
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
auth.hydrate()

/** ?user={uid} 过滤：URL 是唯一事实源，可直接分享 */
function toId(value: unknown): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : undefined
}
const userUid = computed(() => toId(route.query.user))

// 首屏直出第一页；按人筛选切换时按 key 重新拉取
const { data, pending, refresh } = await useAsyncData(
  () => `moments-${userUid.value ?? 'all'}`,
  () =>
    apiFetch<PageResult<Moment>>('/api/v1/moments', {
      query: cleanQuery({ page: 1, size: SIZE, user: userUid.value }),
    }),
  { watch: [userUid] },
)

/** 「加载更多」翻页：首屏之外的页在客户端追加，不重置列表 */
const extra = ref<Moment[]>([])
const page = ref(1)
const loadingMore = ref(false)

const list = computed<Moment[]>(() => [...(data.value?.list ?? []), ...extra.value])
const hasMore = computed(() => list.value.length < (data.value?.total ?? 0))

watch(userUid, () => {
  extra.value = []
  page.value = 1
  loadingMore.value = false
})

async function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  try {
    const next = page.value + 1
    const res = await apiFetch<PageResult<Moment>>('/api/v1/moments', {
      query: cleanQuery({ page: next, size: SIZE, user: userUid.value }),
    })
    extra.value.push(...res.list)
    page.value = next
  }
  catch {
    // 失败保持现状，按钮可重试
  }
  finally {
    loadingMore.value = false
  }
}

/** 按人筛选 chip 的展示名：从已加载列表里找，找不到给兜底文案 */
const filterName = computed(() =>
  list.value.find(m => m.uid === userUid.value)?.username || '该用户',
)

function clearUser() {
  router.replace({ query: {} })
}

onMounted(async () => {
  if (!auth.isAuthenticated) return
  // SSR 首屏按匿名渲染；登录态刷新一次，带回 liked / canDelete
  await auth.ensureMe()
  void refresh()
})

function removeFromList(id: number) {
  if (data.value?.list)
    data.value.list = data.value.list.filter(m => m.id !== id)
  extra.value = extra.value.filter(m => m.id !== id)
}
</script>

<style scoped>
.moments-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.moments-main {
  flex: 1;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 96px 20px 56px;
}

/* ===== 页头 ===== */
.moments-head {
  margin-bottom: 18px;
}

.moments-head__title {
  margin: 0;
  font-size: 28px;
}

.moments-head__sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--c-text-muted);
}

/* ===== 顶部操作条 ===== */
.moments-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

/* 按人筛选 chip：玉色描边胶囊，✕ 清除参数 */
.moments-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 14px;
  font-size: 13px;
  color: var(--c-primary-hover);
  background: var(--c-primary-light);
  border: 1px solid color-mix(in srgb, var(--c-primary) 35%, transparent);
  border-radius: 999px;
}

.moments-chip__close {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  font-size: 12px;
  line-height: 1;
  color: var(--c-primary-hover);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.moments-chip__close:hover {
  color: var(--c-text);
}

/* ===== 列表 ===== */
.moments-page :deep(.moment-card) {
  margin-bottom: 14px;
}

.moments-state {
  padding: 40px 0;
  font-size: 14px;
  color: var(--c-text-muted);
  text-align: center;
}

.moments-empty {
  padding: 48px 0;
  font-size: 14px;
  color: var(--c-text-muted);
  text-align: center;

  a {
    color: var(--c-primary);
    font-weight: 600;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
}

/* ===== 加载更多 ===== */
.moments-more {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
}

.moments-more__end {
  margin: 0;
  font-size: 12.5px;
  color: var(--c-text-muted);
}

@media (max-width: 640px) {
  .moments-main {
    padding-top: 88px;
  }

  .moments-head__title {
    font-size: 24px;
  }
}
</style>
