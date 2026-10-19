<template>
  <aside class="sidenav" :class="{ 'is-open': open, 'is-collapsed': collapsed }">
    <div class="sidenav__logo" :title="collapsed ? '补陋阁 后台' : undefined">
      <span class="sidenav__mark" aria-hidden="true">F</span>
      <div class="sidenav__brand sidenav__text">
        <strong>补陋阁</strong>
        <small>后台管理系统</small>
      </div>
    </div>

    <nav class="sidenav__nav" aria-label="后台导航">
      <p class="sidenav__group sidenav__text">菜单</p>
      <RouterLink
        v-for="item in visibleNavItems"
        :key="item.to"
        :to="item.to"
        class="sidenav__link"
        :class="{ 'is-active': isActive(item.to) }"
        :title="collapsed ? item.label : undefined"
      >
        <span class="sidenav__icon" aria-hidden="true">{{ item.iconLabel }}</span>
        <span class="sidenav__text">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <RouterLink to="/" class="sidenav__link sidenav__blog-link" title="前往博客">
      <span class="sidenav__icon" aria-hidden="true">🌐</span>
      <span class="sidenav__text">前往博客</span>
    </RouterLink>

    <div class="sidenav__footer">
      <p class="sidenav__user" title="当前登录用户">
        <img v-if="profile?.avatarUrl" :src="profile.avatarUrl" alt="" class="sidenav__avatar" />
        <span v-else class="sidenav__avatar" aria-hidden="true">{{ initialOf(auth.username) }}</span>
        <span class="sidenav__text">{{ auth.username || '未登录' }}</span>
      </p>
      <button type="button" class="sidenav__toggle" :title="collapsed ? '展开侧边栏' : '折叠侧边栏'" @click="toggleCollapsed">
        {{ collapsed ? '»' : '« 收起' }}
      </button>
      <button type="button" class="sidenav__close-btn" aria-label="关闭菜单" @click="$emit('close')">
        ✕ 关闭
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import type { ProfileInfo } from '../types'

defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const route = useRoute()
const auth = useAuthStore()

// 当前用户资料(含头像)
const profile = ref<ProfileInfo | null>(null)
onMounted(() => {
  import('../api').then(({ apiFetch }) => {
    apiFetch('/api/admin/profile')
      .then((p: unknown) => { profile.value = p as ProfileInfo })
      .catch(() => {})
  })
})

// 折叠状态持久化
const collapsed = ref(false)
const KEY = 'admin-sidenav-collapsed'
onMounted(() => {
  collapsed.value = localStorage.getItem(KEY) === '1'
})
watch(collapsed, (v) => {
  localStorage.setItem(KEY, v ? '1' : '0')
})

function toggleCollapsed() {
  collapsed.value = !collapsed.value
}

const navItems = [
  { label: '仪表盘', to: '/', iconLabel: '📊' },
  { label: '文章管理', to: '/posts', iconLabel: '📄' },
  { label: '评论管理', to: '/comments', iconLabel: '💬' },
  { label: '分类标签', to: '/categories', iconLabel: '🏷️' },
  { label: '用户权限', to: '/permissions', iconLabel: '🔒' },
  { label: 'RSS 订阅', to: '/rss', iconLabel: '📡' },
  { label: '友链管理', to: '/friends', iconLabel: '🔗' },
  { label: '站点设置', to: '/settings', iconLabel: '⚙️' },
  { label: '日志审计', to: '/logs', iconLabel: '📜' },
]

const visibleNavItems = computed(() =>
  navItems.filter(i => true), // 权限过滤后续按需加
)

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

function initialOf(name?: string | null) {
  return name?.charAt(0)?.toUpperCase() || '?'
}
</script>

<style scoped>
.sidenav {
  position: fixed;
  inset-inline-start: 0;
  top: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: 220px;
  background: var(--c-bg-card, #fff);
  border-right: 1px solid var(--c-border, #e5e5e5);
  transition: transform 0.28s ease, width 0.2s ease;
}

.sidenav.is-collapsed {
  width: 68px;
  .sidenav__text { display: none; }
  .sidenav__logo { justify-content: center; padding: 0; }
  .sidenav__link { justify-content: center; padding: 10px 0; }
  .sidenav__user { justify-content: center; }
}

.sidenav__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 64px;
  padding: 0 20px;
  strong { display: block; font-size: 16px; color: var(--c-text, #333); line-height: 1.2; }
  small { font-size: 11px; color: var(--c-text-muted, #999); letter-spacing: 0.08em; }
}

.sidenav__mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--c-primary, #f472b6), var(--k-grape, #a78bfa));
  border-radius: 12px;
}

.sidenav__nav {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.sidenav__group {
  margin: 0 0 6px;
  padding: 0 10px;
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--c-text-muted, #999);
}

.sidenav__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 2px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--c-text-secondary, #666);
  border-radius: 8px;
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;
  &:hover { background: var(--c-bg-soft, #f5f5f5); color: var(--c-text, #333); }
  &.is-active {
    background: var(--c-primary-light, #fdf2f8);
    color: var(--c-primary-hover, #db2777);
    font-weight: 600;
    &::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 8px;
      bottom: 8px;
      width: 3px;
      border-radius: 999px;
      background: var(--c-primary, #f472b6);
    }
  }
}

.sidenav__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  font-size: 15px;
}

.sidenav__blog-link { margin: 0 4px 8px; }

.sidenav__footer {
  padding: 14px 16px;
  border-top: 1px solid var(--c-border, #e5e5e5);
}

.sidenav__user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: var(--c-text-secondary, #666);
}

.sidenav__avatar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: var(--c-primary, #f472b6);
  border-radius: 50%;
  object-fit: cover;
}

.sidenav__close-btn {
  display: none;
  width: 100%;
  margin-top: 10px;
  padding: 7px 0;
  font-size: 13px;
  color: var(--c-text-secondary, #666);
  background: var(--c-bg-soft, #f5f5f5);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.sidenav__toggle {
  width: 100%;
  margin-top: 10px;
  padding: 6px 0;
  font-size: 12px;
  color: var(--c-text-muted, #999);
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

@media (max-width: 900px) {
  .sidenav__toggle { display: none; }
  .sidenav {
    transform: translateX(-100%);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    &.is-open { transform: translateX(0); }
  }
  .sidenav__close-btn { display: block; }
}
</style>
