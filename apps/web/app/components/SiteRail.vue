<template>
  <!-- 桌面端左侧竖排导航：头像标在上、图标菜单居中、工具收在底部（≥901px 显示） -->
  <aside class="site-rail">
    <NuxtLink to="/" class="site-rail__brand" aria-label="回到首页" @click="onBrandClick">
      <span class="site-rail__mark" aria-hidden="true" />
    </NuxtLink>

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
      <NuxtLink v-if="auth.isAuthenticated" to="/admin" class="site-rail__btn" aria-label="管理后台" title="管理后台">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
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
const route = useRoute()
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

/** 已在首页时点头像回到顶部，否则跳回首页 */
function onBrandClick() {
  if (route.path === '/') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
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

/* 品牌标：与原 header 同款小软糖 */
.site-rail__brand {
  flex-shrink: 0;
  display: block;
}

.site-rail__mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border-radius: 12px;
  box-shadow: 0 4px 12px rgb(13 148 136 / 30%);
}

/* 笑脸：两颗眼睛 + 微笑嘴 */
.site-rail__mark::before {
  content: '';
  position: absolute;
  top: 36%;
  left: 28%;
  width: 4px;
  height: 6px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 12px 0 0 #fff;
}

.site-rail__mark::after {
  content: '';
  position: absolute;
  bottom: 22%;
  left: 50%;
  width: 12px;
  height: 7px;
  border: 2px solid #fff;
  border-top: none;
  border-left-color: transparent;
  border-right-color: transparent;
  border-radius: 0 0 14px 14px;
  transform: translateX(-50%);
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
