<template>
  <!-- 移动端底部 Tab Bar（≤640px）：导航 + 居中搜索异形钮 + 更多面板 -->
  <nav class="tabbar" aria-label="移动端底部导航">
    <NuxtLink to="/" class="tabbar__item" aria-label="首页">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" /></svg>
      <span>首页</span>
    </NuxtLink>

    <NuxtLink to="/posts" class="tabbar__item" aria-label="文章">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></svg>
      <span>文章</span>
    </NuxtLink>

    <button type="button" class="tabbar__search" aria-label="搜索" title="搜索" @click="searchOpen = true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></svg>
    </button>

    <NuxtLink to="/moments" class="tabbar__item" aria-label="动态">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
      <span>动态</span>
    </NuxtLink>

    <NuxtLink to="/chat" class="tabbar__item" aria-label="聊天">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
      <span>聊天</span>
    </NuxtLink>

    <div class="tabbar__more">
      <button type="button" class="tabbar__item" :aria-expanded="moreOpen" aria-label="更多">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
        <span>更多</span>
      </button>

      <Transition name="tabbar-panel">
        <div v-if="moreOpen" class="tabbar__panel">
          <NuxtLink to="/archive">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>
            归档
          </NuxtLink>
          <NuxtLink v-if="auth.isAuthenticated" to="/admin">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            管理后台
          </NuxtLink>
          <template v-else>
            <NuxtLink to="/admin/login">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              账号登录
            </NuxtLink>
            <NuxtLink to="/guest">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              游客登录
            </NuxtLink>
          </template>
        </div>
      </Transition>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const auth = useAuthStore()
const searchOpen = useState('global-search-open', () => false)

auth.hydrate()

const moreOpen = ref(false)

function onDocMouseDown(e: MouseEvent) {
  if (moreOpen.value && !(e.target as Element).closest('.tabbar__more'))
    moreOpen.value = false
}

function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape')
    moreOpen.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('keydown', onDocKeydown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('keydown', onDocKeydown)
})

// 路由变化时收起更多面板
watch(() => route.fullPath, () => {
  moreOpen.value = false
})
</script>

<style scoped>
.tabbar {
  position: fixed;
  inset: auto 0 0;
  z-index: 49;
  display: none;
  grid-template-columns: 1fr 1fr 1.8fr 1fr 1fr 1.2fr;
  align-items: end;
  gap: 2px;
  padding: 8px 6px calc(10px + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--c-bg-card) 88%, transparent);
  backdrop-filter: blur(14px) saturate(180%);
  -webkit-backdrop-filter: blur(14px) saturate(180%);
  border-top: 1px solid var(--c-border);
}

@media (max-width: 640px) {
  .tabbar {
    display: grid;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .tabbar {
    background: var(--c-bg-card);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

.tabbar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 0;
  padding: 2px 0;
  font-size: 11px;
  line-height: 1.2;
  color: var(--c-text-secondary);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s ease;
}

.tabbar__item:hover,
.tabbar__item.router-link-active {
  color: var(--c-primary);
}

.tabbar__item:active {
  opacity: 0.7;
}

/* 居中搜索：凸起异形圆钮，脱出栏面 */
.tabbar__search {
  position: relative;
  top: -16px;
  justify-self: center;
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  color: #fff;
  background: var(--c-primary);
  border: none;
  border-radius: 50%;
  box-shadow: 0 8px 20px rgb(13 148 136 / 35%);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.tabbar__search:hover {
  box-shadow: 0 10px 24px rgb(13 148 136 / 45%);
}

.tabbar__search:active {
  transform: scale(0.94);
}

.tabbar__more {
  position: relative;
}

/* 「更多」面板：栏上方小卡片 */
.tabbar__panel {
  position: absolute;
  bottom: calc(100% + 10px);
  right: -4px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  min-width: 150px;
  padding: 6px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  box-shadow: var(--shadow-card-hover);
}

.tabbar__panel a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  font-size: 13.5px;
  color: var(--c-text-secondary);
  text-decoration: none;
  border-radius: 9px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.tabbar__panel a:hover {
  color: var(--c-primary);
  background: var(--c-primary-light);
}

.tabbar-panel-enter-active,
.tabbar-panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s var(--ease-bounce);
}

.tabbar-panel-enter-from,
.tabbar-panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
