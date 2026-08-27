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
      <NuxtLink
        v-for="item in visibleNavItems"
        :key="item.to"
        :to="item.to"
        class="sidenav__link"
        :class="{ 'is-active': isActive(item.to) }"
        :title="collapsed ? item.label : undefined"
      >
        <span class="sidenav__icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="sidenav__text">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <!-- 前往博客前台：外链新标签页打开，避免打断后台会话 -->
    <a class="sidenav__link sidenav__blog-link" href="/" target="_blank" rel="noopener" title="前往博客">
      <span class="sidenav__icon" aria-hidden="true">🌐</span>
      <span class="sidenav__text">前往博客</span>
    </a>

    <div class="sidenav__footer">
      <p class="sidenav__user" title="当前登录用户">
        <!-- 资料由 admin 布局统一拉取，此处仅展示头像 -->
        <ClientOnly>
          <img v-if="profile?.avatarUrl" :src="profile.avatarUrl" alt="" class="sidenav__avatar">
          <span v-else class="sidenav__avatar" aria-hidden="true">{{ initialOf(auth.username) }}</span>
        </ClientOnly>
        <!-- 登录态存于 localStorage，仅客户端可知，用 ClientOnly 避免 SSR 水合不匹配 -->
        <ClientOnly><span class="sidenav__text">{{ auth.username || '未登录' }}</span></ClientOnly>
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
import type { ProfileInfo } from '#shared/types'

defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const route = useRoute()
const auth = useAuthStore()
// 与 admin 布局共享的当前用户资料（含头像）
const profile = useState<ProfileInfo | null>('admin-profile', () => null)

// 折叠状态全局共享（布局据此调整内容区 padding），并持久化到 localStorage。
// SSR 默认展开，客户端 onMounted 再同步，首帧可能有一次轻微跳动，可接受
const collapsed = useState('admin-sidenav-collapsed', () => false)
const KEY = 'admin-sidenav-collapsed'

onMounted(() => {
  collapsed.value = localStorage.getItem(KEY) === '1'
})

watch(collapsed, (v) => {
  if (import.meta.client) localStorage.setItem(KEY, v ? '1' : '0')
})

function toggleCollapsed() {
  collapsed.value = !collapsed.value
}

// perm 与页面 meta.permission 对应：无权限码的项对任何登录用户可见
const navItems = [
  { label: '仪表盘', to: '/admin', icon: '📊' },
  { label: '文章管理', to: '/admin/posts', icon: '📝', perm: 'article:list' },
  { label: '评论管理', to: '/admin/comments', icon: '💬', perm: 'comment:list' },
  { label: '分类标签', to: '/admin/categories', icon: '🗂️', perm: 'category:list' },
  { label: '用户权限', to: '/admin/permissions', icon: '🔐', perm: 'rbac:role:list' },
  { label: 'RSS 订阅', to: '/admin/rss', icon: '📡', perm: 'rss:list' },
  { label: '友链管理', to: '/admin/friends', icon: '🤝', perm: 'friend-link:list' },
  { label: '站点设置', to: '/admin/settings', icon: '⚙️', perm: 'setting:list' },
  { label: '日志审计', to: '/admin/logs', icon: '📜', perm: 'log:list' },
  { label: '个人资料', to: '/admin/profile', icon: '👤' },
]

const visibleNavItems = computed(() =>
  navItems.filter(i => !i.perm || auth.hasPermission(i.perm)),
)


function isActive(to: string): boolean {
  return to === '/admin' ? route.path === '/admin' : route.path.startsWith(to)
}
</script>

<style scoped>
/* 侧边栏跟随全站 Kawaii Minimal 主题：令牌化配色，明暗主题自适应 */
.sidenav {
  position: fixed;
  inset-inline-start: 0;
  top: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: 220px;
  background: var(--c-bg-card);
  border-right: 1px solid var(--c-border);
  transition: transform 0.28s ease, width 0.2s ease;
}

/* 折叠为图标栏：文字隐藏，图标居中，悬停 title 提示 */
.sidenav.is-collapsed {
  width: 68px;

  .sidenav__text {
    display: none;
  }

  .sidenav__logo {
    justify-content: center;
    padding: 0;
  }

  .sidenav__link {
    justify-content: center;
    padding: 10px 0;
  }

  .sidenav__user {
    justify-content: center;
  }
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
    color: var(--c-text);
    line-height: 1.2;
  }

  small {
    font-size: 11px;
    color: var(--c-text-muted);
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
  color: var(--c-on-primary);
  /* 草莓粉 → 香芋紫，与全站糖果色一致 */
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border-radius: 12px;
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
  color: var(--c-text-muted);
}

.sidenav__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 2px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--c-text-secondary);
  border-radius: var(--radius-control);
  text-decoration: none;
  transition: background-color var(--dur-soft), color var(--dur-soft);

  &:hover {
    background: var(--c-bg-soft);
    color: var(--c-text);
  }

  &.is-active {
    background: var(--c-primary-light);
    color: var(--c-primary-hover);
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

.sidenav__blog-link {
  /* 位于侧边栏底部、footer 之上，横向留白与 footer 对齐 */
  margin: 0 4px 8px;
}

.sidenav__footer {
  padding: 14px 16px;
  border-top: 1px solid var(--c-border);
}

.sidenav__user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: var(--c-text-secondary);
}

.sidenav__avatar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-on-primary);
  background: var(--c-primary);
  border-radius: 50%;
  /* 作为 img 展示真实头像时裁切 */
  object-fit: cover;
}

.sidenav__close-btn {
  display: none;
  width: 100%;
  margin-top: 10px;
  padding: 7px 0;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border: none;
  border-radius: var(--radius-control);
  cursor: pointer;
  transition: color var(--dur-soft), background-color var(--dur-soft);

  &:hover {
    color: var(--c-danger);
    background: var(--c-primary-light);
  }
}

/* 折叠开关（桌面端） */
.sidenav__toggle {
  width: 100%;
  margin-top: 10px;
  padding: 6px 0;
  font-size: 12px;
  color: var(--c-text-muted);
  background: none;
  border: none;
  border-radius: var(--radius-control);
  cursor: pointer;

  &:hover {
    color: var(--c-text);
    background: var(--c-bg-soft);
  }
}

@media (max-width: 900px) {
  /* 抽屉模式下不需要折叠 */
  .sidenav__toggle {
    display: none;
  }
  .sidenav {
    transform: translateX(-100%);
    box-shadow: var(--shadow-card-hover);

    &.is-open {
      transform: translateX(0);
    }
  }

  .sidenav__close-btn {
    display: block;
  }
}
</style>
