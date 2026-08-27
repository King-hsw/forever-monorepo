<template>
  <!-- 桌面端左侧竖排导航：头像标在上、图标菜单居中、工具收在底部（≥901px 显示） -->
  <aside class="site-rail">
    <nav class="site-rail__nav" aria-label="主导航">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="site-rail__btn"
        :aria-label="item.label"
        :title="item.label"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="item.icon" />
      </NuxtLink>
    </nav>

    <div class="site-rail__foot">
      <button type="button" class="site-rail__btn" aria-label="搜索" title="搜索" @click="searchOpen = true">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.8-3.8" />
        </svg>
      </button>
      <NuxtLink v-if="auth.isAuthenticated" to="/admin" class="site-rail__btn site-rail__avatar" aria-label="管理后台" title="管理后台">
        <img src="/icons/avatar.png" alt="" width="22" height="22" />
      </NuxtLink>
      <NuxtLink v-else to="/admin/login" class="site-rail__btn" aria-label="登录" title="登录">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
const auth = useAuthStore()
const searchOpen = useState('global-search-open', () => false)

auth.hydrate()

const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/>',
  posts: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  moments: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  friends: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  about: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
} as const

const navItems = [
  { label: '首页', to: '/', icon: ICONS.home },
  { label: '归档', to: '/archive', icon: ICONS.posts },
]
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
  background: #fafcf9; /* 比玉纸底亮半档的侧栏面 */
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

.site-rail__foot {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  margin-top: auto;
}
</style>
