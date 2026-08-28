<template>
  <div class="admin-shell" :class="{ 'is-fullscreen': editorFullscreen }">
    <AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <Transition name="mask">
      <div v-if="sidebarOpen" class="admin-shell__mask" @click="sidebarOpen = false" />
    </Transition>

    <div
      class="admin-shell__main"
      :class="{ 'is-collapsed-pad': sidenavCollapsed && !editorFullscreen }"
    >
      <!-- 顶栏：页面标题 + 用户/退出；编辑页全屏模式下隐藏 -->
      <header v-show="!editorFullscreen" class="topbar">
        <button
          type="button"
          class="topbar__menu-btn"
          aria-label="打开菜单"
          @click="sidebarOpen = true"
        >
          <Icon name="lucide:menu" />
        </button>
        <strong class="topbar__title">{{ pageTitle }}</strong>

        <!-- 头像区悬停展开下拉：个人资料 / 退出登录 -->
        <div class="topbar__menu">
          <button type="button" class="topbar__user" aria-haspopup="true" title="个人资料 / 退出登录">
            <ClientOnly>
              <img v-if="profile?.avatarUrl" :src="profile.avatarUrl" alt="" class="topbar__avatar">
              <span v-else class="topbar__avatar" aria-hidden="true">{{ initialOf(auth.username) }}</span>
            </ClientOnly>
            <!-- 登录态存于 localStorage，仅客户端可知，用 ClientOnly 避免 SSR 水合不匹配 -->
            <ClientOnly><span class="topbar__username">{{ auth.username || '未登录' }}</span></ClientOnly>
            <svg class="topbar__caret" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div class="topbar__panel">
            <NuxtLink to="/admin/profile">个人资料</NuxtLink>
            <button type="button" class="topbar__logout" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </header>

      <main class="admin-shell__content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProfileInfo } from '#shared/types'
import { apiFetch } from '~/utils/api'

// 后台页面不希望被搜索引擎收录
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const sidebarOpen = ref(false)

// 当前登录用户资料：布局统一拉一次，顶栏 / 侧边栏 / 个人资料页共用
const profile = useState<ProfileInfo | null>('admin-profile', () => null)
onMounted(() => {
  // 401 时 apiFetch 自身会续期 / 跳登录，这里静默即可
  apiFetch<ProfileInfo>('/api/admin/profile')
    .then(p => { profile.value = p })
    .catch(() => {})
})

// 各页面通过 useState('admin-page-title') 设置顶栏标题
const pageTitle = useState('admin-page-title', () => '')
const route = useRoute()
const auth = useAuthStore()

// 与 AdminSidebar 共享的折叠状态；编辑页通过 editorFullscreen 进入无干扰全屏
const sidenavCollapsed = useState('admin-sidenav-collapsed', () => false)
const editorFullscreen = useState('admin-editor-fullscreen', () => false)


// 路由变化时自动收起抽屉
watch(
  () => route.path,
  () => {
    sidebarOpen.value = false
  },
)

async function handleLogout() {
  // 必须等 store 清完令牌再跳转，否则中间件仍视为已登录会把 /admin/login 弹回 /admin
  await auth.logout()
  await navigateTo('/admin/login')
}
</script>

<style scoped>
.admin-shell {
  min-height: 100vh;
  background: var(--c-bg);
}

.admin-shell__main {
  min-height: 100vh;
  padding-left: 220px;
  transition: padding-left 0.2s ease;
}

/* 侧边栏折叠后收窄内容区留白 */
.admin-shell__main.is-collapsed-pad {
  padding-left: 68px;
}

/* 编辑页全屏：侧栏与顶栏全部让位，正文占满视口 */
.admin-shell.is-fullscreen .admin-shell__main {
  padding-left: 0;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 64px;
  padding: 0 28px;
  background: color-mix(in srgb, var(--c-bg-card) 92%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--c-border);
}

.topbar__menu-btn {
  display: none;
  padding: 6px 10px;
  font-size: 17px;
  line-height: 1;
  background: none;
  border: none;
  border-radius: var(--radius-control);
  cursor: pointer;

  &:hover {
    background: var(--c-primary-light);
  }
}

.topbar__title {
  flex: 1;
  font-size: 16px;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* 头像区：按钮触发器，悬停展开下拉 */
.topbar__menu {
  position: relative;
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: none;
  border: none;
  border-radius: var(--radius-control);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: var(--c-bg-soft);
    color: var(--c-text);
  }
}

.topbar__username {
  white-space: nowrap;
}

.topbar__caret {
  color: var(--c-text-muted);
  transition: transform 0.2s ease;
}

.topbar__menu:hover .topbar__caret {
  transform: rotate(180deg);
}

.topbar__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  min-width: 128px;
  padding: 6px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  box-shadow: var(--shadow-card-hover);
  visibility: hidden;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s;
}

.topbar__menu:hover .topbar__panel,
.topbar__menu:focus-within .topbar__panel {
  visibility: visible;
  opacity: 1;
  transform: translateY(0);
}

.topbar__panel a {
  padding: 8px 12px;
  font-size: 13px;
  color: var(--c-text-secondary);
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  border-radius: 8px;
  transition: color 0.2s, background-color 0.2s;

  &:hover {
    color: var(--c-primary);
    background: var(--c-primary-light);
  }
}

.topbar__avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-on-primary);
  background: var(--c-primary);
  border-radius: 50%;
  /* 作为 img 展示真实头像时裁切 */
  object-fit: cover;
}

.topbar__logout {
  padding: 8px 12px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;

  &:hover {
    color: var(--c-danger);
    background: rgb(239 68 68 / 8%);
  }
}

.admin-shell__content {
  padding: 24px 28px 48px;
}

@media (max-width: 900px) {
  .admin-shell__main {
    padding-left: 0;
  }

  .topbar {
    height: 56px;
    padding: 0 16px;
  }

  .topbar__menu-btn {
    display: block;
  }

  .admin-shell__content {
    padding: 18px 16px 44px;
  }
}
</style>
