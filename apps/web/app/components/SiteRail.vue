<template>
  <!-- 桌面端左侧竖排导航：头像标在上、图标菜单居中、工具收在底部（≥901px 显示） -->
  <aside class="site-rail">
    <nav class="site-rail__nav" aria-label="主导航">
      <Tooltip
        v-for="item in navItems"
        :key="item.to"
        :label="item.label"
      >
        <NuxtLink
          :to="item.to"
          class="site-rail__btn"
          :aria-label="item.label"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="item.icon" />
        </NuxtLink>
      </Tooltip>
    </nav>

    <div class="site-rail__foot">
      <Tooltip
        v-if="guest.isRegistered"
        :label="`游客身份：${guest.nickname}`"
      >
        <NuxtLink
          to="/guest"
          class="site-rail__btn site-rail__guest"
          aria-label="游客身份"
        >
          {{ guest.nickname.slice(0, 1) }}
        </NuxtLink>
      </Tooltip>
      <Tooltip label="搜索">
        <button type="button" class="site-rail__btn" aria-label="搜索" @click="searchOpen = true">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.8-3.8" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip label="深浅色切换">
        <button type="button" class="site-rail__btn theme-toggle" aria-label="切换深浅色模式" @click="toggle($event)">
          <svg class="theme-toggle__ico theme-toggle__ico--moon" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          <svg class="theme-toggle__ico theme-toggle__ico--sun" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip v-if="auth.isAuthenticated" label="管理后台">
        <NuxtLink to="/admin" class="site-rail__btn site-rail__avatar" aria-label="管理后台">
          <img src="/icons/avatar.png" alt="" width="22" height="22" />
        </NuxtLink>
      </Tooltip>
      <div v-else class="site-rail__login">
        <Tooltip label="登录">
          <button
            type="button"
            class="site-rail__btn"
            :class="{ 'site-rail__btn--active': loginOpen }"
            :aria-expanded="loginOpen"
            aria-label="登录"
            @click="loginOpen = !loginOpen"
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </Tooltip>
        <div v-if="loginOpen" class="site-rail__login-panel">
          <NuxtLink to="/admin/login" @click="closeLogin">账号登录</NuxtLink>
          <NuxtLink to="/guest" @click="closeLogin">游客登录</NuxtLink>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
const auth = useAuthStore()
const guest = useGuestStore()
const searchOpen = useState('global-search-open', () => false)
const { toggle } = useTheme()

auth.hydrate()
guest.hydrate()

const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/>',
  posts: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  friends: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  about: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  moments: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
} as const

const navItems = [
  { label: '首页', to: '/', icon: ICONS.home },
  { label: '文章', to: '/posts', icon: ICONS.list },
  { label: '归档', to: '/archive', icon: ICONS.posts },
  { label: '动态', to: '/moments', icon: ICONS.moments },
  { label: '聊天', to: '/chat', icon: ICONS.chat },
]

/* 登录菜单：账号登录 / 游客登录 */
const route = useRoute()
const loginOpen = ref(false)

function closeLogin() {
  loginOpen.value = false
}

function onDocMouseDown(e: MouseEvent) {
  if (loginOpen.value && !(e.target as Element).closest('.site-rail__login'))
    closeLogin()
}

function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeLogin()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('keydown', onDocKeydown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('keydown', onDocKeydown)
})

watch(() => route.fullPath, closeLogin)
</script>

<style scoped>
.site-rail {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 50;
  display: none;
  flex-direction: column;
  align-items: center;
  width: 88px;
  padding: 22px 0;
  background: var(--c-rail-bg); /* 比纸底亮半档的侧栏面（深色为玉墨面） */
  border-right: 1px solid var(--c-border);
}

@media (min-width: 901px) {
  .site-rail {
    display: flex;
  }
}

.site-rail__nav {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  width: 100%;
  margin-top: 34px;
}

.site-rail__btn {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  font: inherit;
  color: var(--c-text-secondary);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: var(--radius-control);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.site-rail__avatar img {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
}

/* 游客身份：昵称首字，点击进入 /guest 管理 */
.site-rail__guest {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-primary);
  background: var(--c-primary-light);
}

@media (hover: hover) and (pointer: fine) {
  .site-rail__btn:hover {
    color: var(--c-text);
    background: var(--c-bg-soft);
  }
}

.site-rail__btn.router-link-active {
  color: var(--c-primary);
  background: var(--c-primary-light);
}

/* 按下即时反馈 */
.site-rail__btn:active {
  transition-duration: 80ms;
  transform: scale(0.92);
}

/* 登录菜单：人物 icon 点开，面板从侧栏右侧弹出 */
.site-rail__login {
  position: relative;
}

.site-rail__login-panel {
  position: absolute;
  bottom: -6px;
  left: calc(100% + 10px);
  z-index: 60;
  display: flex;
  flex-direction: column;
  padding: 6px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  box-shadow: var(--shadow-card-hover);
}

.site-rail__login-panel a {
  padding: 8px 12px;
  font-size: 13.5px;
  color: var(--c-text-secondary);
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  border-radius: 8px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.site-rail__login-panel a:hover {
  color: var(--c-primary);
  background: var(--c-primary-light);
}

.site-rail__btn--active {
  color: var(--c-primary);
  background: var(--c-primary-light);
}

.site-rail__foot {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  margin-top: auto;
}
</style>
