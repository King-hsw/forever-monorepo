<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <!-- ===== 品牌区：居中 logo + 标语 + 运行时长 ===== -->
      <div class="site-footer__brand">
        <NuxtLink to="/" class="site-footer__logo" aria-label="回到首页">
          <span class="site-footer__mark" aria-hidden="true" />
          <span class="site-footer__name">补陋阁</span>
        </NuxtLink>
        <p class="site-footer__desc">斯是陋室，惟吾德馨。</p>
        <div class="site-footer__uptime" :title="'自 ' + birthLabel + ' 起'">
          <span class="site-footer__uptime-dot" aria-hidden="true" />
          已运行 {{ uptime }}
        </div>
      </div>

      <!-- ===== 链接区：标签 + 行内链接，一行一组 ===== -->
      <nav class="site-footer__groups" aria-label="页脚导航">
        <div class="site-footer__group">
          <span class="site-footer__label">导航</span>
          <ul class="site-footer__links">
            <li><NuxtLink to="/">首页</NuxtLink></li>
            <li><NuxtLink to="/posts">全部文章</NuxtLink></li>
            <li><NuxtLink to="/message">留言墙</NuxtLink></li>
            <li><NuxtLink to="/friends">友链</NuxtLink></li>
            <li><NuxtLink to="/friends/apply">申请友链</NuxtLink></li>
          </ul>
        </div>

        <div v-if="categories?.length" class="site-footer__group">
          <span class="site-footer__label">分类</span>
          <ul class="site-footer__links">
            <li v-for="cat in categories" :key="cat.id">
              <NuxtLink :to="`/posts?category=${cat.slug}`">{{ cat.name }}</NuxtLink>
            </li>
          </ul>
        </div>

        <div class="site-footer__group">
          <span class="site-footer__label">站外</span>
          <ul class="site-footer__links">
            <li><a href="/rss.xml" target="_blank" rel="noopener">RSS 订阅 ↗</a></li>
            <li><a href="https://www.travellings.cn/go.html" target="_blank" rel="noopener noreferrer" title="随机前往一位成员博客">开往 ↗</a></li>
            <li><a href="https://www.foreverblog.cn/" target="_blank" rel="noopener" title="十年之约">十年之约 ↗</a></li>
          </ul>
        </div>
      </nav>

      <!-- ===== 底部信息条：版权 + 备案 + 回到顶部 ===== -->
      <div class="site-footer__bottom">
        <span>© {{ year }} 补陋阁 · 用 <span class="site-footer__heart" aria-hidden="true">♥</span> 书写</span>
        <a href="https://icp.gov.moe/?keyword=20251208" target="_blank" rel="noopener">萌ICP备20251208号</a>
        <a href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer">闽ICP备202200094号-2</a>
        <button type="button" class="site-footer__totop" @click="backToTop">回到顶部 ↑</button>
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

function backToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
.site-footer {
  margin-top: 72px;
}

/* ===== 容器：卡片底色 + 上描边，内容全部居中 ===== */
.site-footer__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  padding: 48px 24px 24px;
  background: var(--c-bg-card);
  border-top: 1px solid var(--c-border);
}

/* ===== 品牌区 ===== */
.site-footer__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.site-footer__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
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
  box-shadow: 0 4px 12px rgb(229 111 67 / 35%);
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
  margin: 12px 0 0;
  font-size: 13.5px;
  letter-spacing: 0.06em;
  color: var(--c-text-secondary);
}

/* 运行时长：呼吸灯小胶囊 */
.site-footer__uptime {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
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

/* ===== 链接区：每组一行「标签 + 行内链接」，窄屏自动换行 ===== */
.site-footer__groups {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.site-footer__group {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.site-footer__label {
  min-width: 44px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: center;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

.site-footer__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-footer__links li {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 行间圆点分隔符 */
.site-footer__links li + li::before {
  content: '·';
  color: var(--c-border);
}

.site-footer__links a {
  font-size: 13.5px;
  color: var(--c-text-secondary);
  text-decoration: none;
  transition: color var(--dur-soft) ease;
}

.site-footer__links a:hover {
  color: var(--c-primary);
}

/* ===== 底部信息条 ===== */
.site-footer__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 18px;
  width: 100%;
  padding-top: 20px;
  font-size: 12.5px;
  color: var(--c-text-muted);
  border-top: 1px dashed var(--c-border);
}

.site-footer__bottom a {
  color: var(--c-text-muted);
  text-decoration: none;
  transition: color var(--dur-soft) ease;
}

.site-footer__bottom a:hover {
  color: var(--c-primary);
}

.site-footer__heart {
  color: var(--c-primary);
}

.site-footer__totop {
  padding: 5px 14px;
  font-size: 12.5px;
  color: var(--c-text-secondary);
  background: none;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  cursor: pointer;
  transition: color var(--dur-soft) ease, border-color var(--dur-soft) ease, transform var(--dur-soft) var(--ease-bounce);
}

.site-footer__totop:hover {
  color: var(--c-primary);
  border-color: var(--c-primary);
  transform: translateY(-2px);
}
</style>
