<template>
  <!-- 全局搜索弹层：遮罩 + 顶部居中搜索栏，Teleport 到 body 脱离层叠 -->
  <Teleport to="body">
    <Transition name="search-overlay">
      <div v-if="isOpen" class="global-search" @click.self="close">
        <div class="global-search__panel" role="dialog" aria-modal="true" aria-label="全局搜索">
          <div class="global-search__bar">
            <svg class="global-search__glass" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              ref="inputRef"
              v-model="kw"
              class="global-search__input"
              type="search"
              placeholder="搜索文章…"
              aria-label="搜索文章"
              @input="onSearchInput"
              @keydown.enter.prevent="goSearch"
            >
            <button type="button" class="global-search__esc" aria-label="关闭搜索" @click="close">Esc</button>
          </div>

          <Transition name="menu">
            <div class="global-search__results">
              <p v-if="!kw.trim()" class="global-search__hint">输入关键词，实时搜索全站文章</p>
              <p v-else-if="searching" class="global-search__hint">搜索中…</p>
              <template v-else-if="results.length">
                <!-- highlights 由后端转义后只包 <em> 标记，这里才用 v-html -->
                <NuxtLink
                  v-for="r in results"
                  :key="r.id"
                  :to="`/posts/${r.slug}`"
                  class="global-search__item"
                  @click="close()"
                >
                  <span class="global-search__item-title" v-html="r.highlights?.title || r.title" />
                  <span v-if="r.highlights?.excerpt" class="global-search__item-excerpt" v-html="r.highlights.excerpt" />
                </NuxtLink>
                <NuxtLink :to="`/search?kw=${encodeURIComponent(kw.trim())}`" class="global-search__all" @click="close()">
                  查看全部 {{ total }} 条结果 →
                </NuxtLink>
              </template>
              <p v-else class="global-search__hint">没有找到「{{ kw.trim() }}」相关内容</p>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { SearchItem, SearchResponse } from '#shared/types'

const router = useRouter()

/** 开关放全局状态：桌面左栏与移动顶栏共用一个入口 */
const isOpen = useState('global-search-open', () => false)

function open() {
  isOpen.value = true
  document.body.style.overflow = 'hidden'
  nextTick(() => inputRef.value?.focus())
}

function close() {
  if (!isOpen.value) return
  isOpen.value = false
  document.body.style.overflow = ''
}

defineExpose({ open, close })

/* ---- 防抖 300ms 实时结果，回车进 /search 页 ---- */
const kw = ref('')
const results = ref<SearchItem[]>([])
const total = ref(0)
const searching = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let searchSeq = 0

async function doSearch() {
  const keyword = kw.value.trim()
  if (!keyword) {
    results.value = []
    total.value = 0
    return
  }
  const mySeq = ++searchSeq
  searching.value = true
  try {
    const res = await apiFetch<SearchResponse>('/api/v1/search', { query: { keyword, page: 1, size: 5 } })
    // 快速输入时旧响应作废，只采纳最后一次
    if (mySeq !== searchSeq) return
    results.value = res.list
    total.value = res.total
  } catch {
    if (mySeq === searchSeq) results.value = []
  } finally {
    if (mySeq === searchSeq) searching.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(doSearch, 300)
}

function goSearch() {
  const k = kw.value.trim()
  if (!k) return
  router.push(`/search?kw=${encodeURIComponent(k)}`)
  close()
}

// 打开时聚焦输入框；路由变化 / Esc 收起
watch(isOpen, (v) => {
  if (v) nextTick(() => inputRef.value?.focus())
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

// 路由变化时收起
const route = useRoute()
watch(() => route.fullPath, close)

/** 供外部（左右导航）直接打开 */
onMounted(() => {
  if (isOpen.value) nextTick(() => inputRef.value?.focus())
})
</script>

<style scoped>
/* 结果区过渡（与顶栏移动菜单同名，各自独立定义） */
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.22s ease, transform 0.22s var(--ease-bounce);
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
/* ---- 全局搜索弹层：遮罩 + 顶部居中面板（command palette 风格） ---- */
.global-search {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: color-mix(in srgb, var(--c-bg) 62%, transparent);
  backdrop-filter: blur(10px) saturate(1.2);
  -webkit-backdrop-filter: blur(10px) saturate(1.2);
}

.global-search__panel {
  width: min(640px, calc(100vw - 32px));
  margin-top: 14vh;
  overflow: hidden;
  background: color-mix(in srgb, var(--c-bg-card) 92%, transparent);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--c-border);
  border-radius: 20px;
  box-shadow:
    0 24px 70px rgb(0 0 0 / 18%),
    0 4px 16px rgb(0 0 0 / 8%);
}

/* 搜索条：内嵌软底色圆角块，与结果区留出呼吸感 */
.global-search__bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 10px 10px 0;
  padding: 5px 8px 5px 14px;
  background: var(--c-bg-soft);
  border-radius: 14px;
}

.global-search__glass {
  flex-shrink: 0;
  color: var(--c-text-muted);
}

.global-search__input {
  flex: 1;
  min-width: 0;
  padding: 11px 0;
  font-size: 15.5px;
  color: var(--c-text);
  background: none;
  border: none;
  outline: none;

  &::placeholder {
    color: var(--c-text-muted);
  }

  /* 隐藏原生清空按钮，Esc 键即可 */
  &::-webkit-search-cancel-button {
    display: none;
  }
}

/* kbd 徽标 */
.global-search__esc {
  flex-shrink: 0;
  padding: 3px 8px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--c-text-muted);
  cursor: pointer;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 7px;
  box-shadow: 0 1.5px 0 var(--c-border);
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover {
    color: var(--c-primary);
    border-color: var(--c-primary);
  }
}

.global-search__results {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: min(440px, 56vh);
  padding: 10px;
  overflow-y: auto;
}

.global-search__hint {
  padding: 22px 12px;
  margin: 0;
  font-size: 13px;
  text-align: center;
  color: var(--c-text-muted);
}

.global-search__item {
  display: block;
  padding: 9px 12px;
  text-decoration: none;
  border-radius: 12px;
  transition: background-color 0.15s ease;

  &:hover {
    background: var(--c-primary-light);
  }
}

.global-search__item-title {
  display: block;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-search__item-excerpt {
  display: -webkit-box;
  margin-top: 2px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--c-text-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* 后端高亮标记 */
.global-search :deep(em),
.global-search__results em {
  font-style: normal;
  font-weight: 700;
  color: var(--c-primary-hover);
}

.global-search__all {
  margin-top: 4px;
  padding: 9px;
  font-size: 13px;
  text-align: center;
  color: var(--c-primary-hover);
  text-decoration: none;
  background: var(--c-primary-light);
  border-radius: 12px;

  &:hover {
    text-decoration: underline;
  }
}

/* 弹层过渡：遮罩淡入淡出，面板从上方缩放滑入（icon → 顶部居中） */
.search-overlay-enter-active {
  transition: opacity 0.28s ease;
}

.search-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.search-overlay-enter-active .global-search__panel,
.search-overlay-leave-active .global-search__panel {
  transition:
    transform 0.34s var(--ease-bounce),
    opacity 0.24s ease;
}

.search-overlay-enter-from,
.search-overlay-leave-to {
  opacity: 0;
}

.search-overlay-enter-from .global-search__panel {
  transform: translateY(-40px) scale(0.94);
}

.search-overlay-leave-to .global-search__panel {
  transform: translateY(-20px) scale(0.97);
}


</style>
