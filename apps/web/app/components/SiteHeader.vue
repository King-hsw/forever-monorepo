<template>
  <header class="site-header" :class="{ 'site-header--scrolled': scrolled }">
    <div class="site-header__inner" :style="{ maxWidth: width }">
      <NuxtLink to="/" class="brand" aria-label="回到首页" @click="onBrandClick">
        <img class="brand__mark" src="/icons/avatar.png" alt="" aria-hidden="true" width="32" height="32" />
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
        <button
          type="button"
          class="site-header__icon-btn"
          aria-label="搜索"
          title="搜索"
          @click="searchOpen = true"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.8-3.8" />
          </svg>
        </button>
        <NuxtLink
          v-if="guest.isRegistered"
          class="site-header__guest"
          to="/guest"
          :title="`游客身份：${guest.nickname}`"
          :aria-label="`游客身份：${guest.nickname}`"
        >
          {{ guest.nickname.slice(0, 1) }}
        </NuxtLink>
        <NuxtLink
          v-if="auth.isAuthenticated"
          class="site-header__icon-btn"
          to="/admin"
          aria-label="管理后台"
          title="管理后台"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </NuxtLink>
        <div v-else class="site-header__login">
          <button
            type="button"
            class="site-header__icon-btn"
            :aria-expanded="loginOpen"
            aria-label="登录"
            title="登录"
            @click="loginOpen = !loginOpen"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          <div v-if="loginOpen" class="site-header__login-panel">
            <NuxtLink to="/admin/login" @click="closeLogin">账号登录</NuxtLink>
            <NuxtLink to="/guest" @click="closeLogin">游客登录</NuxtLink>
          </div>
        </div>
        <span class="site-header__divider" aria-hidden="true" />
      </div>
    </div>
  </header>

  </template>

<script setup lang="ts">

/** 头部内容区最大宽度，各页面可按自身版心调整 */
withDefaults(defineProps<{ width?: string }>(), { width: '1080px' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const guest = useGuestStore()
const searchOpen = useState('global-search-open', () => false)

// 登录态存于 localStorage，仅客户端可知；SSR 默认未登录，onMounted 恢复
auth.hydrate()
guest.hydrate()

/* 登录菜单：账号登录 / 游客登录 */
const loginOpen = ref(false)

function closeLogin() {
  loginOpen.value = false
}

function onDocMouseDown(e: MouseEvent) {
  if (loginOpen.value && !(e.target as Element).closest('.site-header__login'))
    closeLogin()
}

function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeLogin()
}

interface NavItem {
  label: string
  to: string
  /** 有 children 时渲染为下拉分组 */
  children?: { label: string, to: string }[]
}

/** 后续加菜单只改这里 */
const navItems: NavItem[] = [
  { label: '首页', to: '/' },
  { label: '文章', to: '/posts' },
  { label: '归档', to: '/archive' },
  { label: '动态', to: '/moments' },
  { label: '聊天', to: '/chat' },
]

/** Esc 收起「更多」下拉：面板由 focus-within 控制，失焦即关 */
function blurTarget(e: Event) {
  ;(e.currentTarget as HTMLElement).blur()
}

/* 滚动后切换为玻璃拟态背景 */
const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 24
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('keydown', onDocKeydown)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('keydown', onDocKeydown)
})

// 路由变化时收起搜索下拉与登录菜单
watch(() => route.fullPath, closeLogin)

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
  backdrop-filter: blur(14px) saturate(180%);
  -webkit-backdrop-filter: blur(14px) saturate(180%);
  border-bottom-color: var(--c-border);
  box-shadow: 0 4px 20px rgb(0 0 0 / 5%);
}

/* 减少透明度：磨砂变实底，保证可读性 */
@media (prefers-reduced-transparency: reduce) {
  .site-header--scrolled {
    background: var(--c-bg-card);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

/* 提高对比度：实底 + 明确描边 */
@media (prefers-contrast: more) {
  .site-header--scrolled {
    background: var(--c-bg-card);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-bottom-color: var(--c-text-secondary);
  }
}

.site-header__inner {
  display: flex;
  align-items: center;
  gap: 24px;
  margin: 0 auto;
  padding: 12px 24px;
  /* iOS standalone:顶栏背景已延伸到状态栏之下,内容让出安全区(刘海/灵动岛);横屏时左右同样有安全区 */
  padding-top: calc(12px + env(safe-area-inset-top));
  padding-left: max(24px, env(safe-area-inset-left));
  padding-right: max(24px, env(safe-area-inset-right));
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  text-decoration: none;
}

.brand__mark {
  width: 32px;
  height: 32px;
  border-radius: 12px; /* 圆润的小方块，像一颗软糖 */
  object-fit: cover;
  box-shadow: 0 4px 12px rgb(13 148 136 / 35%);
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

/* 按下即时反馈（pointer-down 生效，不等松手） */
.site-nav__link:active {
  transition-duration: 80ms;
  transform: scale(0.95);
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

.site-header__divider {
  width: 1px;
  height: 18px;
  background: var(--c-border);
}

.site-header__icon-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: var(--c-text-secondary);
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.25s,
    border-color 0.25s,
    background-color 0.25s,
    box-shadow 0.25s,
    transform 0.15s;
}

.site-header__icon-btn:hover {
  color: var(--c-primary);
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px rgb(13 148 136 / 15%);
}

.site-header__icon-btn:active {
  transform: scale(0.92);
}

/* 游客身份：昵称首字，点击进入 /guest 管理 */
.site-header__guest {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  font-size: 15px;
  font-weight: 600;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border: 1px solid var(--c-primary);
  border-radius: 999px;
  text-decoration: none;
}

/* 登录菜单：人物 icon 点开，面板从顶栏下方弹出 */
.site-header__login {
  position: relative;
}

.site-header__login-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  padding: 6px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  box-shadow: var(--shadow-card-hover);
}

.site-header__login-panel a {
  padding: 8px 12px;
  font-size: 13.5px;
  color: var(--c-text-secondary);
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  border-radius: 8px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.site-header__login-panel a:hover {
  color: var(--c-primary);
  background: var(--c-primary-light);
}

/* 移动端：主导航与登录入口收进底部 Tab Bar，顶栏只留品牌 */
@media (max-width: 640px) {
  .site-nav,
  .site-header__divider,
  .site-header__actions {
    display: none;
  }
}

/* 桌面端：顶栏退位，由左侧竖排导航接管 */
@media (min-width: 901px) {
  .site-header {
    display: none;
  }
}

/* 搜索弹层与移动菜单的减透明度回落 */
@media (prefers-reduced-transparency: reduce) {
  .global-search {
    background: rgb(28 25 23 / 45%);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .global-search__panel {
    background: var(--c-bg-card);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
