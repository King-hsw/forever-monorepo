<template>
  <div class="search-page">

    <main class="wrap">
      <div class="page-head">
        <h1 class="page-head__cn">搜索</h1>
        <span class="page-head__en">Search</span>
      </div>

      <!-- 搜索框：输入防抖同步到 URL，可直接分享 / 回退 -->
      <div class="search-box">
        <input
          v-model="input"
          class="search-box__input"
          type="search"
          placeholder="输入关键词，回车搜索…"
          autofocus
          @keydown.enter="commit"
          @input="debouncedCommit"
        >
      </div>

      <p v-if="kw" class="search-meta" aria-live="polite">
        <template v-if="pending">搜索中…</template>
        <template v-else-if="data">共找到 <strong>{{ data.total }}</strong> 条与「{{ kw }}」相关的结果</template>
      </p>

      <!-- 结果列表 -->
      <section v-if="data?.list.length" class="results">
        <NuxtLink
          v-for="r in data.list"
          :key="r.id"
          :to="`/posts/${r.slug}`"
          class="result"
        >
          <!-- highlights 由后端转义后只包 <em>，这里才用 v-html -->
          <h2 class="result__title" v-html="r.highlights?.title || r.title" />
          <p v-if="r.highlights?.excerpt" class="result__excerpt" v-html="r.highlights.excerpt" />
          <span class="result__meta">
            <span v-if="r.categoryName" class="chip">{{ r.categoryName }}</span>
            <span class="meta-dot">·</span>
            <time>{{ formatDate(r.createdAt) }}</time>
            <span v-if="r.tags.length" class="result__tags">
              <span v-for="tag in r.tags" :key="tag.id"># {{ tag.name }}</span>
            </span>
          </span>
        </NuxtLink>

        <!-- 翻页 -->
        <nav v-if="totalPages > 1" class="pager" aria-label="搜索结果分页">
          <button type="button" :disabled="page <= 1" @click="goPage(page - 1)">← 上一页</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button type="button" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页 →</button>
        </nav>
      </section>

      <div v-else-if="!pending && kw && data && !data.list.length" class="empty">
        <span class="empty__icon">(˘•ω•˘)</span>
        没有找到「{{ kw }}」相关内容，换个关键词试试？
      </div>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import type { SearchResponse } from '#shared/types'

const SIZE = 10

const route = useRoute()
const router = useRouter()

/** URL 中的关键词与页码是唯一事实源，直接访问链接也能搜 */
const kw = computed(() => String(route.query.kw ?? '').trim())
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

/** 输入框草稿；初始取 URL 的 kw */
const input = ref(kw.value)

let timer: ReturnType<typeof setTimeout> | undefined
function debouncedCommit() {
  clearTimeout(timer)
  timer = setTimeout(commit, 500)
}

/** 把输入框内容写回 URL（replace 不产生历史记录） */
function commit() {
  const k = input.value.trim()
  if (k === kw.value) return
  router.replace({ query: { ...route.query, kw: k || undefined, page: undefined } })
}

function goPage(p: number) {
  router.replace({ query: { ...route.query, page: p > 1 ? p : undefined } })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// SSR 也执行：直接打开 /search?kw=xx 链接即可拿到结果
const { data, pending } = await useAsyncData(
  () => `search-${kw.value}-${page.value}`,
  () =>
    kw.value
      ? apiFetch<SearchResponse>('/api/v1/search', { query: { keyword: kw.value, page: page.value, size: SIZE } })
      : Promise.resolve(null),
  { watch: [kw, page] },
)

const totalPages = computed(() => (data.value ? Math.max(1, Math.ceil(data.value.total / data.value.size)) : 1))

useHead({
  title: kw.value ? `「${kw.value}」的搜索结果 - 补陋阁` : '搜索 - 补陋阁',
})

watch(kw, (v) => {
  useHead({ title: v ? `「${v}」的搜索结果 - 补陋阁` : '搜索 - 补陋阁' })
})
</script>

<style scoped>
.search-page .wrap {
  max-width: 800px;
  margin-inline: auto;
  padding-top: 96px;
}

.search-box {
  margin-top: 18px;
}

.search-box__input {
  width: 100%;
  padding: 12px 20px;
  font-size: 15px;
  color: var(--c-text);
  background: var(--c-bg-card);
  border: 1.5px solid var(--c-border);
  border-radius: 14px;
  outline: none;
  box-shadow: var(--shadow-card);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: var(--c-text-muted);
  }

  &:focus {
    border-color: color-mix(in srgb, var(--c-primary) 55%, transparent);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--c-primary) 12%, transparent),
      var(--shadow-card);
  }
}

.search-meta {
  margin: 16px 2px 0;
  font-size: 13.5px;
  color: var(--c-text-muted);

  strong {
    color: var(--c-primary-hover);
  }
}

.results {
  margin-top: 18px;
}

.result {
  display: block;
  padding: 16px 20px;
  margin-bottom: 12px;
  text-decoration: none;
  background: var(--c-bg-card);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius-card);
  /* 整组淡入：翻页 / 换词时不生硬 */
  animation: result-in 0.35s ease both;
  transition: transform var(--dur-soft) var(--ease-bounce), box-shadow var(--dur-soft) ease, border-color 0.2s ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: translateY(-2px);
      border-color: color-mix(in srgb, var(--c-primary) 40%, transparent);
      box-shadow: var(--shadow-card-hover);
    }
  }

  /* 高亮标记：主题色加粗，不用斜体 */
  em {
    font-style: normal;
    font-weight: 700;
    color: var(--c-primary-hover);
  }
}

.result__title {
  margin: 0;
  font-size: 17px;
  line-height: 1.4;
  color: var(--c-text);
}

.result__excerpt {
  display: -webkit-box;
  margin: 6px 0 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--c-text-secondary);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.result__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--c-text-muted);

  time {
    color: inherit;
  }
}

.result__tags {
  display: inline-flex;
  gap: 8px;
  margin-left: 4px;
}

@keyframes result-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 24px 0 40px;
  font-size: 13.5px;
  color: var(--c-text-secondary);

  button {
    padding: 7px 16px;
    font-size: 13px;
    color: var(--c-text-secondary);
    background: var(--c-bg-card);
    border: 1.5px solid var(--c-border);
    border-radius: 999px;
    cursor: pointer;
    transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s var(--ease-bounce);

    &:hover:not(:disabled) {
      color: var(--c-primary-hover);
      border-color: color-mix(in srgb, var(--c-primary) 45%, transparent);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

.empty {
  margin: 48px 0;
  text-align: center;
  color: var(--c-text-muted);

  .empty__icon {
    display: block;
    margin-bottom: 8px;
    font-size: 28px;
  }
}
</style>
