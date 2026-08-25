<template>
  <footer class="site-footer">
    <!-- 顶部波浪过渡 -->
    <div class="site-footer__wave" aria-hidden="true">
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d="M0,32 C240,64 480,0 720,24 C960,48 1200,16 1440,36 L1440,60 L0,60 Z" />
      </svg>
    </div>

    <div class="site-footer__inner">
      <!-- ===== 上半区：左侧品牌区 + 右侧链接分组 ===== -->
      <div class="site-footer__top">
        <div class="site-footer__brand">
          <div class="site-footer__logo">
            <span class="site-footer__mark" aria-hidden="true" />
            <span class="site-footer__name">补陋阁</span>
          </div>
          <p class="site-footer__desc">
            斯是陋室，惟吾德馨。
          </p>
          <div class="site-footer__uptime" :title="'自 ' + birthLabel + ' 起'">
            <span class="site-footer__uptime-dot" aria-hidden="true" />
            已运行 {{ uptime }}
          </div>
        </div>

        <nav class="site-footer__cols" aria-label="页脚导航">
          <div class="site-footer__col">
            <h3 class="site-footer__heading">导航</h3>
            <ul>
              <li><NuxtLink to="/">首页</NuxtLink></li>
              <li><NuxtLink to="/posts">全部文章</NuxtLink></li>
              <li><NuxtLink to="/message">留言墙</NuxtLink></li>
              <li><NuxtLink to="/friends">友链</NuxtLink></li>
              <li><NuxtLink to="/friends/apply">申请友链</NuxtLink></li>
              <li><NuxtLink to="/about">关于</NuxtLink></li>
            </ul>
          </div>

          <div v-if="categories?.length" class="site-footer__col">
            <h3 class="site-footer__heading">分类</h3>
            <ul>
              <li v-for="cat in categories" :key="cat.id">
                <NuxtLink :to="`/posts?category=${cat.slug}`">{{ cat.name }}</NuxtLink>
              </li>
            </ul>
          </div>

          <div class="site-footer__col">
            <h3 class="site-footer__heading">站外</h3>
            <ul>
              <li>
                <a href="/rss.xml" target="_blank" rel="noopener">RSS 订阅 ↗</a>
              </li>
              <li>
                <a href="https://www.travellings.cn/go.html" target="_blank" rel="noopener noreferrer" title="随机前往一位成员博客">开往 ↗</a>
              </li>
              <li>
                <a href="https://www.foreverblog.cn/" target="_blank" rel="noopener" title="十年之约">十年之约 ↗</a>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <!-- ===== 底部信息条：版权 + 备案 ===== -->
      <div class="site-footer__bottom">
        <span>© 2024 - {{ year }} 补陋阁 · 用 <span class="site-footer__heart" aria-hidden="true">♥</span> 书写</span>
        <span class="site-footer__beian">
          <a href="https://icp.gov.moe/?keyword=20251208" target="_blank" rel="noopener">萌ICP备20251208号</a>
          <a href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer">闽ICP备202200094号-2</a>
        </span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import type { Category, SiteInfo } from '#shared/types'

/** 分类列表（复用首页的缓存 key，避免重复请求） */
const { data: categories } = await useAsyncData('home-categories', () =>
  apiFetch<Category[]>('/api/v1/categories'),
)

/** 建站日期：来自后台站点设置 site.birth-date；未设置时用内置默认值 */
const DEFAULT_BIRTH = '2025-01-01'
const { data: siteInfo } = await useAsyncData('site-info', () => apiFetch<SiteInfo>('/api/v1/site'))
const birthDate = computed(() => siteInfo.value?.birthDate || DEFAULT_BIRTH)
const SITE_BIRTH = computed(() => new Date(`${birthDate.value}T00:00:00+08:00`).getTime())
const birthLabel = computed(() => {
  const d = new Date(`${birthDate.value}T00:00:00+08:00`)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
})

const year = new Date().getFullYear()

const uptime = ref('')
let timer: ReturnType<typeof setInterval> | null = null

function formatUptime() {
  let diff = Math.max(0, Date.now() - SITE_BIRTH.value)
  const days = Math.floor(diff / 86_400_000)
  diff -= days * 86_400_000
  const hours = Math.floor(diff / 3_600_000)
  diff -= hours * 3_600_000
  const minutes = Math.floor(diff / 60_000)
  const seconds = Math.floor((diff - minutes * 60_000) / 1000)
  uptime.value = days > 0
    ? `${days} 天 ${hours} 小时 ${minutes} 分`
    : `${hours} 小时 ${minutes} 分 ${seconds} 秒`
}

onMounted(() => {
  formatUptime()
  timer = setInterval(formatUptime, 1000)
})

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})
</script>

<style scoped>
.site-footer {
  margin-top: 72px;
}

/* ===== 波浪过渡 ===== */
.site-footer__wave {
  height: 56px;
  margin-bottom: -1px;
}

.site-footer__wave svg {
  display: block;
  width: 100%;
  height: 100%;
}

.site-footer__wave path {
  fill: color-mix(in srgb, var(--c-primary) 4%, var(--c-bg));
}

/* ===== 容器 ===== */
.site-footer__inner {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 40px 24px 24px;
  background: color-mix(in srgb, var(--c-primary) 4%, var(--c-bg));
  border-top: 1px solid color-mix(in srgb, var(--c-primary) 18%, var(--c-border));
}

.site-footer__inner > * {
  max-width: 1080px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

/* ===== 上半区：品牌 + 链接列 ===== */
.site-footer__top {
  display: flex;
  flex-wrap: wrap;
  gap: 40px 64px;
  justify-content: space-between;
}

.site-footer__brand {
  max-width: 280px;
}

.site-footer__logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 与 header 品牌标一致的小软糖 */
.site-footer__mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border-radius: 12px;
  box-shadow: 0 4px 12px rgb(13 148 136 / 35%);
}

.site-footer__mark::before {
  content: '';
  position: absolute;
  top: 38%;
  left: 28%;
  width: 3.5px;
  height: 5px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 11px 0 0 #fff;
}

.site-footer__mark::after {
  content: '';
  position: absolute;
  bottom: 22%;
  left: 50%;
  width: 10px;
  height: 6px;
  border: 2px solid #fff;
  border-top: none;
  border-left-color: transparent;
  border-right-color: transparent;
  border-radius: 0 0 12px 12px;
  transform: translateX(-50%);
}

.site-footer__name {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: var(--c-text);
}

.site-footer__desc {
  margin: 14px 0 0;
  font-size: 13.5px;
  line-height: 1.9;
  color: var(--c-text-secondary);
}

/* 运行时长：呼吸灯小胶囊 */
.site-footer__uptime {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 6px 14px;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: var(--c-text-secondary);
  background: var(--c-primary-light);
  border-radius: 999px;
}

.site-footer__uptime-dot {
  width: 7px;
  height: 7px;
  background: var(--c-success);
  border-radius: 50%;
  animation: pulse 2.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.55; }
}

/* ===== 链接列 ===== */
.site-footer__cols {
  display: flex;
  flex-wrap: wrap;
  gap: 32px 56px;
}

.site-footer__heading {
  margin: 0 0 14px;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

.site-footer__col ul {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-footer__col a {
  font-size: 13.5px;
  color: var(--c-text-secondary);
  text-decoration: none;
  transition: color var(--dur-soft) ease;
}

.site-footer__col a:hover {
  color: var(--c-primary);
}

/* ===== 底部信息条 ===== */
.site-footer__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 20px;
  font-size: 12.5px;
  color: var(--c-text-muted);
  border-top: 1px dashed var(--c-border);
}

.site-footer__beian {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}

.site-footer__beian a {
  color: var(--c-text-muted);
  text-decoration: none;
  transition: color var(--dur-soft) ease;
}

.site-footer__beian a:hover {
  color: var(--c-primary);
}

.site-footer__heart {
  color: var(--c-primary);
}

@media (max-width: 720px) {
  .site-footer__top {
    flex-direction: column;
    gap: 32px;
  }

  .site-footer__cols {
    gap: 28px 40px;
  }

  .site-footer__bottom {
    justify-content: center;
    text-align: center;
  }
}
</style>
