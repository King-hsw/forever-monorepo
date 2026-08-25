<template>
  <div class="about-page">
    <!-- ===== 页头 ===== -->
    <header class="about-head">
      <p class="about-caption">ABOUT</p>
      <h1 class="about-title">关于补陋阁</h1>
      <p class="about-tagline">{{ profile.tagline }}</p>
    </header>

    <!-- ===== 关于我 ===== -->
    <section class="about-card">
      <h2 class="about-sec-title"><span class="sec-num">壹</span>关于我</h2>
      <p v-for="(line, i) in profile.intro" :key="i" class="about-text">{{ line }}</p>

      <div class="interest-row">
        <span v-for="it in profile.interests" :key="it" class="chip">{{ it }}</span>
      </div>

      <div class="contact-row">
        <a :href="`mailto:${profile.email}`" class="contact-link">发邮件 ↗</a>
        <a v-if="profile.github" :href="profile.github" target="_blank" rel="noopener" class="contact-link">GitHub ↗</a>
        <a href="/rss.xml" target="_blank" rel="noopener" class="contact-link">RSS 订阅 ↗</a>
      </div>
    </section>

    <!-- ===== 站点统计 ===== -->
    <section class="about-card">
      <h2 class="about-sec-title"><span class="sec-num">贰</span>站点统计</h2>
      <div class="stat-grid">
        <div class="stat-item">
          <strong>{{ totalPosts }}</strong><span>文章</span>
        </div>
        <div class="stat-item">
          <strong>{{ categories.length }}</strong><span>分类</span>
        </div>
        <div class="stat-item">
          <strong>{{ tags.length }}</strong><span>标签</span>
        </div>
        <div class="stat-item">
          <strong>{{ runDays }}</strong><span>运行天数</span>
        </div>
      </div>
      <div class="heatmap-panel">
        <PostHeatmap :posts="publishedPosts" />
      </div>
    </section>

    <!-- ===== 关于本站 ===== -->
    <section class="about-card">
      <h2 class="about-sec-title"><span class="sec-num">叁</span>关于本站</h2>
      <p v-for="(line, i) in profile.siteIntro" :key="i" class="about-text">{{ line }}</p>
      <blockquote class="site-quote">斯是陋室，惟吾德馨。</blockquote>
      <p class="copyright">© 2024 - {{ year }} 补陋阁 · 自 {{ birthLabel }} 起，笔耕不辍。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Category, PageResult, Post, Tag } from '#shared/types'
import { formatDateTime } from '~/utils/format'

// ===== 站点资料：想改文案只动这里 =====
const profile = {
  /** 一句话定位 */
  tagline: '斯是陋室 · 惟吾德馨 —— 写代码，也写字。',
  /** 自我介绍，一段一条 */
  intro: [
    '这里是补陋阁的阁主。白天与代码为伍，夜里读点闲书，遇到有趣的事就记下来。',
    '本阁收录技术笔记、生活随想与偶得的句子。不求日更，但求每一篇都对得起点进来的你。',
  ],
  interests: ['💻 编程', '📚 阅读', '✍️ 写字', '🎮 游戏', '🚶 游山'],
  email: 'me@example.com',
  github: '',
  /** 本站说明 */
  siteIntro: [
    '本站基于 Nuxt 4 构建，前后端分离：前台 SSR 渲染，后台负责内容管理。',
    '支持浅色、暗夜、水墨三套主题，可安装为 PWA 应用，全文 RSS 订阅长期开放。',
  ],
}

// 复用首页缓存 key，避免重复请求
const { data: pageData } = await useAsyncData('home-articles', () =>
  apiFetch<PageResult<Post>>('/api/v1/articles', { query: { page: 1, size: 1000 } }),
)
const { data: categories } = await useAsyncData('home-categories', () =>
  apiFetch<Category[]>('/api/v1/categories'),
)
const { data: tags } = await useAsyncData('home-tags', () => apiFetch<Tag[]>('/api/v1/tags'))
const { data: siteInfo } = await useAsyncData('site-info', () =>
  apiFetch<{ birthDate: string | null }>('/api/v1/site'),
)

const publishedPosts = computed(() =>
  [...(pageData.value?.list ?? [])].sort((a, b) =>
    ((a.publishedAt ?? a.createdAt) < (b.publishedAt ?? b.createdAt) ? 1 : -1),
  ),
)
const totalPosts = computed(() => pageData.value?.total ?? 0)

// 建站日期与运行天数（未设置时用内置默认值）
const DEFAULT_BIRTH = '2025-01-01'
const birthDate = computed(() => siteInfo.value?.birthDate || DEFAULT_BIRTH)
const SITE_BIRTH = computed(() => new Date(`${birthDate.value}T00:00:00+08:00`).getTime())
const runDays = computed(() => Math.max(0, Math.floor((Date.now() - SITE_BIRTH.value) / 86_400_000)))
const birthLabel = computed(() => formatDateTime(birthDate.value))
const year = new Date().getFullYear()

useSeoMeta({ title: '关于', description: '关于补陋阁——阁主、站点与技术栈的介绍' })
</script>

<style scoped>
.about-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 120px 20px 60px;
}

/* ===== 页头 ===== */
.about-head {
  margin-bottom: 36px;
  text-align: center;
}

.about-caption {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: var(--c-primary);
}

.about-title {
  margin: 10px 0 0;
  font-family: var(--font-serif);
  font-size: clamp(28px, 5vw, 40px);
  letter-spacing: 0.06em;
  color: var(--c-text);
}

.about-tagline {
  margin: 12px 0 0;
  font-family: var(--font-serif);
  font-size: 14.5px;
  letter-spacing: 0.08em;
  color: var(--c-text-secondary);
}

/* ===== 卡片小节 ===== */
.about-card {
  padding: 26px 26px 24px;
  margin-bottom: 22px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.about-sec-title {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin: 0 0 16px;
  font-size: 17px;
  color: var(--c-text);
}

.sec-num {
  font-family: var(--font-serif);
  font-size: 15px;
  color: var(--c-primary);
}

.about-text {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 2;
  color: var(--c-text-secondary);
}

/* 兴趣标签 */
.interest-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.chip {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12.5px;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border-radius: 999px;
}

/* 联系方式 */
.contact-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.contact-link {
  padding: 7px 16px;
  font-size: 13px;
  color: var(--c-primary);
  text-decoration: none;
  border: 1px solid color-mix(in srgb, var(--c-primary) 35%, var(--c-border));
  border-radius: 999px;
  transition: all var(--dur-soft) ease;
}

.contact-link:hover {
  color: #fff;
  background: var(--c-primary);
  border-color: var(--c-primary);
}

/* ===== 统计 ===== */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  padding: 14px 8px;
  background: var(--c-bg-soft);
  border-radius: 12px;
}

.stat-item strong {
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  color: var(--c-text);
}

.stat-item span {
  font-size: 12px;
  color: var(--c-text-muted);
}

.heatmap-panel {
  padding: 16px;
  background: var(--c-bg-soft);
  border-radius: 12px;
}

/* ===== 引用 & 版权 ===== */
.site-quote {
  margin: 14px 0;
  padding-left: 14px;
  font-family: var(--font-serif);
  font-size: 15px;
  letter-spacing: 0.1em;
  color: var(--c-primary);
  border-left: 3px solid var(--c-primary);
}

.copyright {
  margin: 14px 0 0;
  font-size: 12.5px;
  color: var(--c-text-muted);
}

@media (max-width: 560px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
