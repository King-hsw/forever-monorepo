<template>
  <div class="admin-shell">
    <AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <Transition name="mask">
      <div v-if="sidebarOpen" class="admin-shell__mask" @click="sidebarOpen = false" />
    </Transition>

    <div class="admin-shell__main">
      <header class="topbar">
        <button type="button" class="topbar__menu-btn" aria-label="打开菜单" @click="sidebarOpen = true">
          ☰
        </button>
        <strong class="topbar__title">{{ pageTitle }}</strong>

        <div class="topbar__menu">
          <button type="button" class="topbar__user" aria-haspopup="true" title="个人资料 / 退出登录">
            <img v-if="profile?.avatarUrl" :src="profile.avatarUrl" alt="" class="topbar__avatar" />
            <span v-else class="topbar__avatar" aria-hidden="true">{{ initialOf(auth.username) }}</span>
            <span class="topbar__username">{{ auth.username || '未登录' }}</span>
            <svg class="topbar__caret" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div class="topbar__panel">
            <button type="button" class="topbar__logout" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </header>

      <main class="admin-shell__content">
        <!--
          页面从 Nuxt 迁来，setup 里有 `await useAsyncData(...)`，
          异步 setup 必须挂在 Suspense 下，否则组件永远不渲染（空白页）。
        -->
        <RouterView v-slot="{ Component }">
          <Suspense>
            <component :is="Component" />
            <template #fallback>
              <div class="admin-loading">加载中…</div>
            </template>
          </Suspense>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminSidebar from '../components/AdminSidebar.vue'
import { useAuthStore } from '../stores/auth'
import { useState } from '../composables/nuxt-compat'
import { apiFetch } from '../api'
import type { ProfileInfo } from '../types'

const sidebarOpen = ref(false)
// 与「个人资料」页共享同一份 state：布局拉一次，页面读写同一个 ref
const profile = useState<ProfileInfo | null>('admin-profile', () => null)
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// 顶栏标题跟随路由 meta(迁移前由 useAdminPage 写入,现在统一由 router 维护)
const pageTitle = computed(() => (route.meta.title as string) || '后台管理')

onMounted(() => {
  document.title = '后台管理 - 补陋阁'
  document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow')
  // 权限码必须先拉到,侧栏/页面门禁都依赖它
  void auth.ensureMe()
  apiFetch<ProfileInfo>('/api/admin/profile')
    .then((p) => {
      profile.value = p
      auth.username = p.username ?? auth.username
    })
    .catch(() => {})
})

watch(() => route.path, () => {
  sidebarOpen.value = false
})

async function handleLogout() {
  await auth.logout()
  await router.push('/login')
}

function initialOf(name?: string | null) {
  return name?.charAt(0)?.toUpperCase() || '?'
}
</script>

<style scoped>
.admin-shell {
  min-height: 100vh;
  background: var(--c-bg, #fafafa);
}

.admin-shell__main {
  min-height: 100vh;
  padding-left: 220px;
  transition: padding-left 0.2s ease;
}

.admin-shell__mask {
  position: fixed;
  inset: 0;
  z-index: 35;
  background: rgba(0, 0, 0, 0.3);
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
  background: color-mix(in srgb, var(--c-bg-card, #fff) 92%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--c-border, #e5e5e5);
}

.topbar__menu-btn {
  display: none;
  padding: 6px 10px;
  font-size: 17px;
  line-height: 1;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.topbar__title {
  flex: 1;
  font-size: 16px;
}

.topbar__menu {
  position: relative;
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  font-size: 13px;
  color: var(--c-text-secondary, #666);
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  &:hover { background: var(--c-bg-soft, #f5f5f5); color: var(--c-text, #333); }
}

.topbar__username { white-space: nowrap; }

.topbar__caret {
  color: var(--c-text-muted, #999);
  transition: transform 0.2s ease;
}

.topbar__menu:hover .topbar__caret { transform: rotate(180deg); }

.topbar__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  min-width: 128px;
  padding: 6px;
  background: var(--c-bg-card, #fff);
  border: 1px solid var(--c-border, #e5e5e5);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  visibility: hidden;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.18s, transform 0.18s, visibility 0.18s;
}

.topbar__menu:hover .topbar__panel,
.topbar__menu:focus-within .topbar__panel {
  visibility: visible;
  opacity: 1;
  transform: translateY(0);
}

.topbar__avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: var(--c-primary, #f472b6);
  border-radius: 50%;
  object-fit: cover;
}

.topbar__logout {
  padding: 8px 12px;
  font-size: 13px;
  color: var(--c-text-secondary, #666);
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  &:hover { color: #ef4444; background: rgba(239, 68, 68, 0.08); }
}

.admin-shell__content {
  padding: 24px 28px 48px;
}

/* 异步 setup 页面的 Suspense 占位 */
.admin-loading {
  padding: 64px 0;
  text-align: center;
  color: var(--c-text-3, #8a8a8a);
  font-size: 14px;
}

@media (max-width: 900px) {
  .admin-shell__main { padding-left: 0; }
  .topbar { height: 56px; padding: 0 16px; }
  .topbar__menu-btn { display: block; }
  .admin-shell__content { padding: 18px 16px 44px; }
}

.mask-enter-active, .mask-leave-active { transition: opacity 0.25s; }
.mask-enter-from, .mask-leave-to { opacity: 0; }
</style>
