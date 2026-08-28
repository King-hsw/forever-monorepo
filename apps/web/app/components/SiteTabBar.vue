<template>
  <!-- 移动端底部 Tab Bar（≤640px）：导航 + 居中搜索异形钮；「更多」上拉菜单收纳归档/聊天/登录 -->
  <nav class="tabbar" aria-label="移动端底部导航">
    <!-- 磨砂玻璃底层:异形凹槽用 mask 挖在这一层,不能挖在容器上(mask 会连凸出的搜索钮与面板一起裁掉) -->
    <span class="tabbar__glass" aria-hidden="true"></span>
    <NuxtLink to="/" class="tabbar__item" aria-label="首页">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" /></svg>
      <span>首页</span>
    </NuxtLink>

    <NuxtLink to="/posts" class="tabbar__item" aria-label="文章">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></svg>
      <span>文章</span>
    </NuxtLink>

    <button type="button" class="tabbar__search" aria-label="搜索" title="搜索" @click="searchOpen = true">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></svg>
    </button>

    <NuxtLink to="/moments" class="tabbar__item" aria-label="动态">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
      <span>动态</span>
    </NuxtLink>

    <div class="tabbar__more">
      <button type="button" class="tabbar__item" :class="{ 'is-open': moreOpen }" :aria-expanded="moreOpen" aria-label="更多" @click="moreOpen = !moreOpen">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
        <span>更多</span>
      </button>
    </div>

    <!-- 「更多」上拉菜单：全宽卡片从底部升入，收纳归档/聊天/登录 -->
    <Transition name="tabbar-panel">
      <div v-if="moreOpen" class="tabbar__panel">
        <NuxtLink to="/archive" @click="moreOpen = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>
          <span>归档</span>
        </NuxtLink>
        <NuxtLink to="/chat" @click="moreOpen = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
          <span>聊天</span>
        </NuxtLink>
        <NuxtLink v-if="auth.isAuthenticated" to="/admin" @click="moreOpen = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          <span>管理后台</span>
        </NuxtLink>
        <template v-else>
          <NuxtLink to="/admin/login" @click="moreOpen = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            <span>账号登录</span>
          </NuxtLink>
          <NuxtLink to="/guest" @click="moreOpen = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            <span>游客登录</span>
          </NuxtLink>
        </template>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const auth = useAuthStore()
const searchOpen = useState('global-search-open', () => false)

auth.hydrate()

const moreOpen = ref(false)

function onDocMouseDown(e: MouseEvent) {
  if (!moreOpen.value)
    return
  if (!(e.target as Element).closest('.tabbar__more, .tabbar__panel'))
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
  /* 悬浮卡片不贴死屏幕底边:bottom = 基础间隙 + 手势条安全区,整卡抬升 */
  right: calc(12px + env(safe-area-inset-right));
  bottom: calc(10px + var(--safe-area-inset-bottom));
  /* 横屏时左右让出灵动岛/安全区 */
  left: calc(12px + env(safe-area-inset-left));
  z-index: 49;
  display: none;
  /* 五等分列:五个入口中心等距,左右镜像对称(此前 1fr/1.8fr/1.2fr 混排导致间距忽宽忽窄) */
  grid-template-columns: repeat(5, 1fr);
  align-items: end;
  gap: 2px;
  /* 内边距对称;__glass 层用同样的负 inset 反向撑回,铺满整个卡片 */
  padding: 8px 6px;
}

/* 磨砂玻璃底层:质感与异形凹槽都在这层,搜索钮/面板等子元素不受 mask 裁剪 */
.tabbar__glass {
  position: absolute;
  /* 反向撑回容器内边距,覆盖整个卡片 border-box */
  inset: -8px -6px;
  pointer-events: none;
  /* 苹果式玻璃材质:低不透明度底色 + 大半径高斯模糊 + 饱和度提升,滚动内容从卡下透出 */
  background: color-mix(in srgb, var(--c-bg-card) 65%, transparent);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid color-mix(in srgb, var(--c-border) 75%, transparent);
  border-radius: 28px;
  /* 顶部内侧一条白高光是玻璃沿,后面是柔和投影 */
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 35%), 0 2px 6px rgb(28 25 23 / 6%), 0 12px 32px rgb(28 25 23 / 14%);
  /* 半嵌托座:搜索钮中心锚在卡顶边(y=0),挖半径 36px 半圆凹口(钮 31px + 5px 环绕缝隙) */
  -webkit-mask: radial-gradient(circle 36px at 50% 0px, transparent 35px, #000 36px);
  mask: radial-gradient(circle 36px at 50% 0px, transparent 35px, #000 36px);
}

/* 凹槽描边:沿挖口一圈细线,只显示卡片内的下半段(卡外上半裁掉) */
.tabbar::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 1;
  width: 72px;
  height: 72px;
  border: 1px solid color-mix(in srgb, var(--c-border) 75%, transparent);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  /* 挖口是卡顶边以下的下半圆,环线只保留 y≥0 段 */
  clip-path: inset(36px 0 0 0);
  pointer-events: none;
}

@media (max-width: 640px) {
  .tabbar {
    display: grid;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .tabbar__glass,
  .tabbar__panel {
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
  /* 玻璃底层是定位元素会盖住静态内容,导航项需同为定位元素保持在其上 */
  position: relative;
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
.tabbar__item.router-link-active,
.tabbar__item.is-open {
  color: var(--c-primary);
}

.tabbar__item:active {
  opacity: 0.7;
}

/* 居中搜索：凸起异形圆钮,中心锚在卡顶边上,一半脱出栏面(docked FAB 姿态);浅玉底+深玉图标,不用深绿色块 */
.tabbar__search {
  position: relative;
  top: -39px;
  justify-self: center;
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  color: var(--c-primary-hover);
  background: color-mix(in srgb, var(--c-primary) 22%, #fff);
  border: 1px solid color-mix(in srgb, var(--c-primary) 28%, transparent);
  border-radius: 50%;
  box-shadow: 0 8px 20px rgb(13 148 136 / 28%);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.tabbar__search:hover {
  box-shadow: 0 10px 24px rgb(13 148 136 / 36%);
}

.tabbar__search:active {
  transform: scale(0.94);
}

.tabbar__more {
  position: relative;
}

/* button 设 display:flex 后是 fit-content 收缩盒,不像 <a> 网格项那样撑满整列;
   不撑满会缩在列左缘,「更多」整体偏左、和动态贴得更近 */
.tabbar__more .tabbar__item {
  width: 100%;
}

/* 「更多」上拉菜单：全宽卡片，从底部升入停于栏上方 */
.tabbar__panel {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 50;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
  gap: 6px;
  padding: 14px 10px;
  /* 与 Tab Bar 同一玻璃材质,但收起项是小字菜单,底色略提不透明度保可读性 */
  background: color-mix(in srgb, var(--c-bg-card) 85%, transparent);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid var(--c-border);
  border-radius: 24px;
  box-shadow: 0 -10px 30px rgb(0 0 0 / 14%);
}

.tabbar__panel a {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 4px 8px;
  font-size: 12px;
  color: var(--c-text-secondary);
  text-decoration: none;
  border-radius: 12px;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.tabbar__panel a svg {
  width: 22px;
  height: 22px;
}

.tabbar__panel a:hover,
.tabbar__panel a.router-link-active {
  color: var(--c-primary);
}

.tabbar__panel a:hover {
  background: var(--c-primary-light);
}

.tabbar-panel-enter-active,
.tabbar-panel-leave-active {
  transition: transform 0.3s var(--ease-bounce), opacity 0.2s ease;
}

.tabbar-panel-enter-from,
.tabbar-panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .tabbar-panel-enter-active,
  .tabbar-panel-leave-active {
    transition: opacity 0.15s ease;
  }

  .tabbar-panel-enter-from,
  .tabbar-panel-leave-to {
    transform: none;
  }
}
</style>
