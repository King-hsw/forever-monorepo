<template>
  <header class="site-header" :class="{ 'site-header--scrolled': scrolled }">
    <div class="site-header__inner" :style="{ maxWidth: width }">
      <NuxtLink to="/" class="brand" aria-label="回到首页" @click="onBrandClick">
        <span class="brand__mark" aria-hidden="true" />
        <span class="brand__name">补陋阁</span>
      </NuxtLink>

      <!-- 桌面端导航（数据驱动，children 渲染为下拉） -->
      <nav class="site-nav" aria-label="主导航">
        <template v-for="item in navItems" :key="item.label">
          <div v-if="item.children" class="site-nav__dropdown">
            <button type="button" class="site-nav__link site-nav__toggle" :aria-expanded="undefined">
              {{ item.label }}
              <svg class="site-nav__caret" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <div class="site-nav__panel">
              <NuxtLink
                v-for="child in item.children"
                :key="child.to"
                :to="child.to"
                class="site-nav__sublink"
                @keydown.esc="blurTarget"
              >
                {{ child.label }}
              </NuxtLink>
            </div>
          </div>
          <NuxtLink v-else :to="item.to" class="site-nav__link">
            {{ item.label }}
          </NuxtLink>
        </template>
      </nav>

      <div class="site-header__actions">
        <!-- 全局搜索：icon 打开顶部居中弹层，防抖实时结果，回车进搜索页 -->
        <button
          type="button"
          ref="searchTriggerRef"
          class="site-header__icon-btn"
          aria-label="搜索"
          title="搜索"
          @click="openSearch"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.8-3.8" />
          </svg>
        </button>
        <a
          class="site-header__icon-btn"
          href="/rss.xml"
          target="_blank"
          rel="noopener"
          aria-label="RSS 订阅"
          title="RSS 订阅"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M6.18 17.82a2.18 2.18 0 1 1-4.36 0 2.18 2.18 0 0 1 4.36 0ZM1.82 8.91v3.09a10.18 10.18 0 0 1 10.18 10.18h3.09A13.27 13.27 0 0 0 1.82 8.91Zm0-7.09v3.09a17.27 17.27 0 0 1 17.27 17.27h3.09A20.36 20.36 0 0 0 1.82 1.82Z" />
          </svg>
        </a>
        <NuxtLink
          v-if="auth.isAuthenticated"
          class="site-nav__link site-nav__link--quiet"
          to="/admin"
        >管理</NuxtLink>
        <NuxtLink
          v-else
          class="site-nav__link site-nav__link--quiet"
          to="/admin/login"
        >登录</NuxtLink>
        <span v-if="auth.isAuthenticated" class="site-header__divider" aria-hidden="true" />
        <span class="site-header__divider" aria-hidden="true" />
        <div class="site-header__theme"><ThemeToggle /></div>
        <button
          type="button"
          class="site-header__burger"
          :aria-expanded="menuOpen"
          aria-label="打开菜单"
          @click="menuOpen = !menuOpen"
        >
          <span :class="{ 'burger-open': menuOpen }" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- 移动端下拉菜单 -->
    <Transition name="menu">
      <nav v-if="menuOpen" class="mobile-menu" aria-label="移动端导航">
        <template v-for="item in navItems" :key="item.label">
          <NuxtLink v-if="!item.children" class="mobile-menu__link" :to="item.to" @click="menuOpen = false">
            {{ item.label }}
          </NuxtLink>
          <!-- 子菜单平铺缩进展示 -->
          <NuxtLink
            v-for="child in item.children ?? []"
            :key="child.to"
            class="mobile-menu__link mobile-menu__link--sub"
            :to="child.to"
            @click="menuOpen = false"
          >
            {{ child.label }}
          </NuxtLink>
        </template>
        <NuxtLink v-if="auth.isAuthenticated" class="mobile-menu__link" to="/admin" @click="menuOpen = false">管理</NuxtLink>
        <NuxtLink v-else class="mobile-menu__link" to="/admin/login" @click="menuOpen = false">登录</NuxtLink>
        <a class="mobile-menu__link" href="/rss.xml" target="_blank" rel="noopener" @click="menuOpen = false">RSS 订阅</a>
      </nav>
    </Transition>
  </header>

  <!-- 全局搜索弹层：遮罩 + 顶部居中搜索栏，Teleport 到 body 脱离 header 层叠 -->
  <Teleport to="body">
    <Transition name="search-overlay">
      <div v-if="searchOpen" class="global-search" @click.self="closeSearch">
        <div class="global-search__panel" role="dialog" aria-modal="true" aria-label="全局搜索">
          <div class="global-search__bar">
            <svg class="global-search__glass" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              ref="searchInputRef"
              v-model="kw"
              class="global-search__input"
              type="search"
              placeholder="搜索文章…"
              aria-label="搜索文章"
              @input="onSearchInput"
              @keydown.enter.prevent="goSearch"
            >
            <button type="button" class="global-search__esc" aria-label="关闭搜索" @click="closeSearch">Esc</button>
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
                  @click="closeSearch()"
                >
                  <span class="global-search__item-title" v-html="r.highlights?.title || r.title" />
                  <span v-if="r.highlights?.excerpt" class="global-search__item-excerpt" v-html="r.highlights.excerpt" />
                </NuxtLink>
                <NuxtLink :to="`/search?kw=${encodeURIComponent(kw.trim())}`" class="global-search__all" @click="closeSearch()">
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

/** 头部内容区最大宽度，各页面可按自身版心调整 */
withDefaults(defineProps<{ width?: string }>(), { width: '1080px' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// 登录态存于 localStorage，仅客户端可知；SSR 默认未登录，onMounted 恢复
auth.hydrate()

interface NavItem {
  label: string
  to: string
  /** 有 children 时渲染为下拉分组（移动端平铺缩进） */
  children?: { label: string, to: string }[]
}

/** 后续加菜单只改这里 */
const navItems: NavItem[] = [
  { label: '首页', to: '/' },
  { label: '文章', to: '/posts' },
  { label: '朋友圈', to: '/moments' },
  { label: '留言', to: '/message' },
  { label: '友链', to: '/friends' },
  {
    label: '更多',
    to: '/archive', // 占位路由，父级本身不跳转
    children: [
      { label: '归档', to: '/archive' },
      { label: '订阅', to: '/rss' },
    ],
  },
]

/** Esc 收起「更多」下拉：面板由 focus-within 控制，失焦即关 */
function blurTarget(e: Event) {
  ;(e.currentTarget as HTMLElement).blur()
}

/* 滚动后切换为玻璃拟态背景 */
const scrolled = ref(false)
const menuOpen = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 24
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => window.removeEventListener('scroll', onScroll))

// 路由变化时收起移动端菜单与搜索下拉
watch(() => route.fullPath, () => {
  menuOpen.value = false
  closeSearch()
})

/* ---- 全局搜索：icon 打开弹层，防抖 300ms 实时结果，回车进 /search 页 ---- */
const kw = ref('')
const results = ref<SearchItem[]>([])
const total = ref(0)
const searching = ref(false)
const searchOpen = ref(false)
const searchTriggerRef = ref<HTMLButtonElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
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
  // 路由变化由 watcher 收起，不在此处直接关，避免跳转前闪一下遮罩
}

/** 打开弹层：锁滚动并聚焦输入框，关闭时归还焦点到触发 icon */
async function openSearch() {
  searchOpen.value = true
  document.body.style.overflow = 'hidden'
  await nextTick()
  searchInputRef.value?.focus()
}

function closeSearch() {
  if (!searchOpen.value) return
  searchOpen.value = false
  document.body.style.overflow = ''
  searchTriggerRef.value?.focus()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeSearch()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  // 组件卸载时兜底解锁，避免滚动被永久锁死
  document.body.style.overflow = ''
})

/** 已在首页时点品牌回到顶部，否则跳回首页 */
function onBrandClick() {
  if (route.path === '/') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  else {
    router.push('/')
  }
}
</script>

<style scoped>
.site-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  transition: background-color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  border-bottom: 1px solid transparent;
}

.site-header--scrolled {
  background: color-mix(in srgb, var(--c-bg-soft) 78%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom-color: var(--c-border);
  box-shadow: 0 4px 20px rgb(0 0 0 / 5%);
}

.site-header__inner {
  display: flex;
  align-items: center;
  gap: 24px;
  margin: 0 auto;
  padding: 12px 24px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  text-decoration: none;
}

.brand__mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border-radius: 12px; /* 圆润的小方块，像一颗软糖 */
  box-shadow: 0 4px 12px rgb(229 111 67 / 35%);
}

/* 笑脸：两颗眼睛 + 微笑嘴 */
.brand__mark::before {
  content: '';
  position: absolute;
  top: 38%;
  left: 28%;
  width: 3.5px;
  height: 5px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 11px 0 0 #fff; /* 第二只眼睛 */
}

.brand__mark::after {
  content: '';
  position: absolute;
  bottom: 22%;
  left: 50%;
  width: 10px;
  height: 6px;
  border: 2px solid #fff;
  border-top: none;
  border-left-color: transparent;
  border-right-color: transparent;
  border-radius: 0 0 12px 12px;
  transform: translateX(-50%);
}

.brand__name {
  font-size: 17px;
  font-weight: 700;
  color: var(--c-text);
  letter-spacing: 0.01em;
}

.site-nav {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.site-nav__link {
  padding: 7px 14px;
  font-size: 14px;
  color: var(--c-text-secondary);
  text-decoration: none;
  white-space: nowrap;
  border-radius: 999px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.site-nav__link:hover {
  color: var(--c-primary);
  background: var(--c-primary-light);
}

/* 当前页高亮（NuxtLink 的 router-link-active） */
.site-nav .router-link-active {
  color: var(--c-primary);
  background: var(--c-primary-light);
  font-weight: 600;
}

/* ---- 「更多」下拉：hover / focus-within 展开，Esc 失焦即关 ---- */
.site-nav__dropdown {
  position: relative;
}

.site-nav__toggle {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  font-family: inherit;
  cursor: pointer;
  background: none;
  border: none;
}

.site-nav__caret {
  transition: transform 0.2s ease;
}

.site-nav__dropdown:hover .site-nav__caret,
.site-nav__dropdown:focus-within .site-nav__caret {
  transform: rotate(180deg);
}

.site-nav__panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  min-width: 128px;
  padding: 6px;
  visibility: hidden;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  box-shadow: var(--shadow-card-hover);
  opacity: 0;
  transform: translate(-50%, -4px);
  transition: opacity 0.18s ease, transform 0.18s var(--ease-bounce), visibility 0.18s;
}

.site-nav__dropdown:hover .site-nav__panel,
.site-nav__dropdown:focus-within .site-nav__panel {
  visibility: visible;
  opacity: 1;
  transform: translate(-50%, 0);
}

.site-nav__sublink {
  display: block;
  padding: 8px 14px;
  font-size: 13.5px;
  color: var(--c-text-secondary);
  text-decoration: none;
  white-space: nowrap;
  border-radius: 8px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.site-nav__sublink:hover,
.site-nav__sublink.router-link-active {
  color: var(--c-primary);
  background: var(--c-primary-light);
}

.site-nav__link--quiet {
  color: var(--c-text-muted);
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
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
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
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
  font-family: inherit;
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

.site-header__divider {
  width: 1px;
  height: 18px;
  background: var(--c-border);
}

.site-header__icon-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text-secondary);
  border-radius: 50%;
  transition: color 0.2s ease, background-color 0.2s ease, transform var(--dur-soft) var(--ease-bounce);
}

.site-header__icon-btn:hover {
  color: var(--c-primary);
  background: var(--c-primary-light);
  transform: translateY(-1px) rotate(15deg);
}

/* 移动端汉堡按钮：三横线 → 叉号 */
.site-header__burger {
  position: relative;
  display: none;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.site-header__burger span,
.site-header__burger span::before,
.site-header__burger span::after {
  position: absolute;
  left: 50%;
  width: 16px;
  height: 2px;
  background: var(--c-text);
  border-radius: 2px;
  transition: transform 0.25s var(--ease-bounce), opacity 0.2s ease;
}

.site-header__burger span {
  top: 50%;
  transform: translate(-50%, -50%);
}

.site-header__burger span::before,
.site-header__burger span::after {
  content: '';
  transform: translateX(-50%);
}

.site-header__burger span::before { top: -5px; }
.site-header__burger span::after { top: 5px; }

.site-header__burger span.burger-open {
  background: transparent;
}

.site-header__burger span.burger-open::before {
  transform: translateX(-50%) translateY(5px) rotate(45deg);
}

.site-header__burger span.burger-open::after {
  transform: translateX(-50%) translateY(-5px) rotate(-45deg);
}

/* ===== 移动端下拉菜单 ===== */
.mobile-menu {
  position: fixed;
  top: 60px;
  right: 12px;
  left: 12px;
  z-index: 49;
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: color-mix(in srgb, var(--c-bg-card) 92%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card-hover);
}

.mobile-menu__link {
  padding: 12px 16px;
  font-size: 14.5px;
  color: var(--c-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-control);
  transition: color 0.2s ease, background-color 0.2s ease;
}

.mobile-menu__link:hover,
.mobile-menu__link.router-link-active {
  color: var(--c-primary);
  background: var(--c-primary-light);
}

.mobile-menu__link--sub {
  padding-left: 32px;
  font-size: 13.5px;
  color: var(--c-text-muted);
}

.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.22s ease, transform 0.22s var(--ease-bounce);
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.site-header__theme {
  display: flex;
  align-items: center;
}

@media (max-width: 640px) {
  .site-nav,
  .site-nav__link--quiet,
  .site-header__divider {
    display: none;
  }

  .site-header__actions {
    gap: 6px;
    margin-left: auto;
  }

  .site-header__burger {
    display: block;
  }
}
</style>
