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
          <Icon :name="item.icon" mode="svg" :size="19" />
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
      <Tooltip
        v-if="auth.isAuthenticated"
        :label="unread > 0 ? `消息（${unread} 条未读）` : '消息'"
      >
        <NuxtLink to="/messages" class="site-rail__btn site-rail__bell" aria-label="消息">
          <Icon name="lucide:bell" mode="svg" :size="19" />
          <span v-if="unread > 0" class="site-rail__badge">{{ unread > 99 ? '99+' : unread }}</span>
        </NuxtLink>
      </Tooltip>
      <Tooltip label="搜索">
        <button type="button" class="site-rail__btn" aria-label="搜索" @click="searchOpen = true">
          <Icon name="lucide:search" mode="svg" :size="19" />
        </button>
      </Tooltip>
      <Tooltip :label="nextLabel">
        <button type="button" class="site-rail__btn theme-toggle" :aria-label="nextLabel" @click="setNext($event)">
          <Icon name="lucide:sun" mode="svg" :size="19" class="theme-toggle__ico theme-toggle__ico--sun" />
          <Icon name="lucide:moon" mode="svg" :size="19" class="theme-toggle__ico theme-toggle__ico--moon" />
          <!-- 跟随系统：半明半暗圆（右半填充，lucide 无对应图形，保留自绘） -->
          <svg class="theme-toggle__ico theme-toggle__ico--auto" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip v-if="auth.isAuthenticated" label="管理后台">
        <NuxtLink to="/admin" class="site-rail__btn site-rail__avatar" aria-label="管理后台">
          <img src="/icons/avatar.png" alt="" width="22" height="22" />
        </NuxtLink>
      </Tooltip>
      <div v-else class="site-rail__login">
        <button
          type="button"
          class="site-rail__btn"
          :class="{ 'site-rail__btn--active': loginOpen }"
          :aria-expanded="loginOpen"
          aria-label="登录"
          @click="loginOpen = !loginOpen"
        >
          <Icon name="lucide:user" mode="svg" :size="19" />
        </button>
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
const { count: unread } = useUnread()
const searchOpen = useState('global-search-open', () => false)
const { setNext, nextLabel } = useTheme()

auth.hydrate()
guest.hydrate()

/** 后续加菜单只改这里 */
const navItems = [
  { label: '首页', to: '/', icon: 'lucide:home' },
  { label: '文章', to: '/posts', icon: 'lucide:list' },
  { label: '归档', to: '/archive', icon: 'lucide:book-open' },
  { label: '动态', to: '/moments', icon: 'lucide:heart' },
  { label: '聊天', to: '/chat', icon: 'lucide:message-circle' },
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

useOnEscape(closeLogin)

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
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

/* 消息铃铛：未读数小徽标 */
.site-rail__bell {
  position: relative;
}

.site-rail__badge {
  position: absolute;
  top: 5px;
  right: 5px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  font-size: 10px;
  line-height: 15px;
  color: #fff;
  background: var(--c-danger);
  border-radius: 999px;
  text-align: center;
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
