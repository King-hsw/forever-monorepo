<template>
  <footer class="site-footer">
    <!-- ===== 链接分组：参考多列站点的 footer 布局 ===== -->
    <div class="site-footer__grid">
      <div class="site-footer__col">
        <h3 class="site-footer__heading">快捷导航</h3>
        <p><NuxtLink to="/">首页</NuxtLink></p>
        <p><NuxtLink to="/posts">全部文章</NuxtLink></p>
        <p><NuxtLink to="/friends">友链</NuxtLink></p>
        <p><a href="/rss.xml" target="_blank" rel="noopener">RSS 订阅</a></p>
      </div>

      <div v-if="categories?.length" class="site-footer__col">
        <h3 class="site-footer__heading">文章分类</h3>
        <p v-for="cat in categories" :key="cat.id">
          <NuxtLink :to="`/posts?category=${cat.slug}`">{{ cat.name }}</NuxtLink>
        </p>
      </div>

      <div class="site-footer__col">
        <h3 class="site-footer__heading">关于本站</h3>
        <p><NuxtLink to="/friends/apply">申请友链</NuxtLink></p>
        <p><a href="/sitemap.xml" target="_blank" rel="noopener">站点地图</a></p>
        <p><button type="button" @click="backToTop">回到顶部 ↑</button></p>
      </div>
    </div>

    <!-- ===== 底部信息条：版权 + 运行时长 ===== -->
    <div class="site-footer__bottom">
      <span>© {{ year }} Forever · 记录技术与思考 · 用 <span class="site-footer__heart" aria-hidden="true">♥</span> 书写</span>
      <span>本站已运行了 {{ uptime }}</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import type { Category } from '~/stores/types'

/** 分类列表（复用首页的缓存 key，避免重复请求） */
const { data: categories } = await useAsyncData('home-categories', () =>
  apiFetch<Category[]>('/api/v1/categories'),
)

const year = new Date().getFullYear()

/** 站点「生日」：运行时长从这里起算，可按需修改 */
const SITE_BIRTH = new Date('2025-01-01T00:00:00+08:00').getTime()

const uptime = ref('')
let timer: ReturnType<typeof setInterval> | null = null

function formatUptime() {
  let diff = Math.max(0, Date.now() - SITE_BIRTH)
  const days = Math.floor(diff / 86_400_000)
  diff -= days * 86_400_000
  const hours = Math.floor(diff / 3_600_000)
  diff -= hours * 3_600_000
  const minutes = Math.floor(diff / 60_000)
  const seconds = Math.floor((diff - minutes * 60_000) / 1000)
  uptime.value = `${days} 天 ${hours} 小时 ${minutes} 分 ${seconds} 秒`
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
  margin-top: 48px;
  background: var(--c-bg-card);
  border-top: 1px solid var(--c-border);
}

/* ===== 多列链接分组 ===== */
.site-footer__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 24px 16px;
  max-width: 800px;
  margin: 0 auto;
  padding: 36px 20px 28px;
}

.site-footer__heading {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-text);
}

/* 标题前的小糖果点缀 */
.site-footer__heading::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 7px;
  border-radius: 50%;
  background: var(--c-primary);
  vertical-align: 1px;
}

.site-footer__col p {
  margin: 0 0 8px;
}

.site-footer__col a,
.site-footer__col button {
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--c-text-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: color var(--dur-soft) ease;
}

.site-footer__col a:hover,
.site-footer__col button:hover {
  color: var(--c-primary);
}

/* ===== 底部信息条 ===== */
.site-footer__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  max-width: 800px;
  margin: 0 auto;
  padding: 16px 20px 26px;
  font-size: 12.5px;
  color: var(--c-text-muted);
  border-top: 1px solid var(--c-border);
}

.site-footer__heart span {
  color: var(--c-primary);
}
</style>
