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
          ☰
        </button>
        <strong class="topbar__title">{{ pageTitle }}</strong>

        <div class="topbar__right">
          <span class="topbar__user">
            <span class="topbar__avatar" aria-hidden="true">{{ initialOf(auth.username) }}</span>
            <!-- 登录态存于 localStorage，仅客户端可知，用 ClientOnly 避免 SSR 水合不匹配 -->
            <ClientOnly>{{ auth.username || '未登录' }}</ClientOnly>
          </span>
          <button type="button" class="topbar__logout" @click="handleLogout">退出登录</button>
        </div>
      </header>

      <main class="admin-shell__content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
// 后台页面不希望被搜索引擎收录
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const sidebarOpen = ref(false)

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
  auth.logout()
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

.topbar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--c-text-secondary);
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
}

.topbar__logout {
  padding: 6px 12px;
  font-size: 13px;
  color: var(--c-text-muted);
  background: none;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-control);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background-color 0.2s;

  &:hover {
    color: var(--c-danger);
    border-color: currentcolor;
    background: rgb(239 68 68 / 6%);
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
