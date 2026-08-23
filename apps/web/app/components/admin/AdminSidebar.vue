<template>
  <aside class="sidenav" :class="{ 'is-open': open }">
    <div class="sidenav__logo">
      <span class="sidenav__mark" aria-hidden="true">F</span>
      <div class="sidenav__brand">
        <strong>Forever</strong>
        <small>后台管理系统</small>
      </div>
    </div>

    <nav class="sidenav__nav" aria-label="后台导航">
      <p class="sidenav__group">菜单</p>
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="sidenav__link"
        :class="{ 'is-active': isActive(item.to) }"
      >
        <span class="sidenav__icon" aria-hidden="true">{{ item.icon }}</span>
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="sidenav__footer">
      <p class="sidenav__user" title="当前登录用户">
        <span class="sidenav__avatar" aria-hidden="true">{{ avatarText }}</span>
        <!-- 登录态存于 localStorage，仅客户端可知，用 ClientOnly 避免 SSR 水合不匹配 -->
        <ClientOnly>{{ auth.username || '未登录' }}</ClientOnly>
      </p>
      <button type="button" class="sidenav__close-btn" aria-label="关闭菜单" @click="$emit('close')">
        ✕ 收起
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const route = useRoute()
const auth = useAuthStore()

const navItems = [
  { label: '仪表盘', to: '/admin', icon: '📊' },
  { label: '文章管理', to: '/admin/posts', icon: '📝' },
  { label: '分类标签', to: '/admin/categories', icon: '🗂️' },
  { label: 'RSS 订阅', to: '/admin/rss', icon: '📡' },
  { label: '友链管理', to: '/admin/friends', icon: '🤝' },
]

const avatarText = computed(() => (auth.username?.slice(0, 1) ?? 'A').toUpperCase())

function isActive(to: string): boolean {
  return to === '/admin' ? route.path === '/admin' : route.path.startsWith(to)
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
  background: #191b2c;
  transition: transform 0.28s ease;
}

.sidenav__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 64px;
  padding: 0 20px;

  strong {
    display: block;
    font-size: 16px;
    color: #fff;
    line-height: 1.2;
  }

  small {
    font-size: 11px;
    color: #8a90a8;
    letter-spacing: 0.08em;
  }
}

.sidenav__mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 10px;
}

.sidenav__nav {
  flex: 1;
  padding: 12px 12px;
  overflow-y: auto;
}

.sidenav__group {
  margin: 0 0 6px;
  padding: 0 10px;
  font-size: 11px;
  letter-spacing: 0.14em;
  color: #6b7189;
}

.sidenav__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 2px;
  padding: 10px 12px;
  font-size: 14px;
  color: #aab0c5;
  border-radius: 8px;
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;

  &:hover {
    background: rgb(255 255 255 / 6%);
    color: #fff;
  }

  &.is-active {
    background: linear-gradient(90deg, rgb(99 102 241 / 28%), rgb(99 102 241 / 10%));
    color: #fff;
    font-weight: 600;

    &::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 8px;
      bottom: 8px;
      width: 3px;
      border-radius: 999px;
      background: var(--c-primary);
    }
  }
}

.sidenav__icon {
  width: 22px;
  text-align: center;
  font-size: 15px;
}

.sidenav__footer {
  padding: 14px 16px;
  border-top: 1px solid rgb(255 255 255 / 8%);
}

.sidenav__user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: #aab0c5;
}

.sidenav__avatar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: var(--c-primary);
  border-radius: 50%;
}

.sidenav__close-btn {
  display: none;
  width: 100%;
  margin-top: 10px;
  padding: 7px 0;
  font-size: 13px;
  color: #aab0c5;
  background: rgb(255 255 255 / 6%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

@media (max-width: 900px) {
  .sidenav {
    transform: translateX(-100%);
    box-shadow: 0 8px 30px rgb(0 0 0 / 35%);

    &.is-open {
      transform: translateX(0);
    }
  }

  .sidenav__close-btn {
    display: block;
  }
}
</style>
