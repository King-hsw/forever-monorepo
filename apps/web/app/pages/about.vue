<template>
  <div class="about-page">
    <!-- 超大幽灵水印 -->
    <span class="ghost-word" aria-hidden="true">ABOUT</span>

    <!-- ===== 头部：头像 + 大名字 + 定位语 ===== -->
    <div class="about-hero">
      <div class="hero-left">
        <div class="avatar-ring">
          <span class="avatar-char">补</span>
        </div>
      </div>
      <div class="hero-right">
        <p class="sec-label">IMQI STYLE · ABOUT ME</p>
        <h1 class="hero-name">补陋阁</h1>
        <p class="hero-sub">斯是陋室，惟吾德馨</p>
        <div class="profile-tags">
          <Transition name="tag-slide" mode="out-in">
            <span :key="tagIndex" class="profile-tag">{{ profile.taglines[tagIndex % profile.taglines.length] }}</span>
          </Transition>
        </div>
      </div>
    </div>

    <!-- ===== 01 游山玩水 ===== -->
    <section class="num-section pos-left">
      <p class="sec-label">01 · 游山玩水</p>
      <div class="place-grid">
        <div v-for="p in profile.places" :key="p.title" class="place-card">
          <span class="place-kicker">{{ p.kicker }}</span>
          <strong>{{ p.title }}</strong>
        </div>
      </div>
    </section>

    <!-- ===== 02 技多不压身 ===== -->
    <section class="num-section pos-right">
      <p class="sec-label">02 · 技多不压身</p>
      <div class="skill-card">
        <div class="skill-glow" aria-hidden="true" />
        <div class="skill-orbit-wrap" aria-hidden="true">
          <div class="skill-orbit" />
          <strong class="orbit-core">栈</strong>
        </div>
        <div class="skill-body">
          <h3>{{ skills.title }}</h3>
          <p class="skill-desc">{{ skills.desc }}</p>
          <div class="skill-chips">
            <span v-for="s in skills.items" :key="s.name" class="skill-chip" :title="s.note">
              {{ s.name }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 03 兴趣广泛 ===== -->
    <section class="num-section pos-left">
      <p class="sec-label">03 · 兴趣广泛</p>
      <div class="interest-row">
        <div v-for="it in interests" :key="it.front" class="interest-card">
          <div class="interest-inner">
            <div class="interest-face front">{{ it.front }}</div>
            <div class="interest-face back">{{ it.back }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 04 站点统计 ===== -->
    <section class="num-section pos-right">
      <p class="sec-label">04 · 站点统计</p>
      <div class="stat-grid">
        <div class="stat-item"><strong>{{ totalPosts }}</strong><span>文章</span></div>
        <div class="stat-item"><strong>{{ categories.length }}</strong><span>分类</span></div>
        <div class="stat-item"><strong>{{ tags.length }}</strong><span>标签</span></div>
        <div class="stat-item"><strong>{{ runDays }}</strong><span>运行天数</span></div>
      </div>
      <div class="heatmap-panel">
        <PostHeatmap :posts="publishedPosts" />
      </div>
    </section>

    <!-- ===== 05 交个朋友 ===== -->
    <section class="num-section pos-left">
      <p class="sec-label">05 · 交个朋友</p>
      <p class="friend-hint">欢迎与我交流技术和生活</p>
      <div class="contact-row">
        <a :href="`mailto:${profile.email}`" class="contact-btn primary">发邮件</a>
        <a v-if="profile.github" :href="profile.github" target="_blank" rel="noopener" class="contact-btn">GitHub</a>
        <a href="/rss.xml" target="_blank" rel="noopener" class="contact-btn">RSS 订阅</a>
      </div>
    </section>

    <!-- ===== 引语横幅 ===== -->
    <blockquote class="quote-banner">
      山海寻梦，不觉其远；前路迢迢，阔步而行。
    </blockquote>

    <!-- ===== 快捷入口 + 十年之约 ===== -->
    <div class="quick-grid">
      <NuxtLink to="/archive" class="quick-card">
        <strong>文章归档</strong><span>浏览所有文章</span>
      </NuxtLink>
      <NuxtLink to="/friends" class="quick-card">
        <strong>友链天涯</strong><span>看看朋友们在写什么</span>
      </NuxtLink>
      <a href="/rss.xml" target="_blank" rel="noopener" class="quick-card">
        <strong>RSS 订阅</strong><span>在阅读器里追更</span>
      </a>
      <div class="quick-card ten-year">
        <strong>十年之约</strong>
        <span>承诺让这个博客持续生长十年，不弃更、不关站</span>
        <div class="ten-bar"><i :style="{ width: `${Math.min(100, (runDays / 3652) * 100)}%` }" /></div>
        <em>{{ runDays }} 天已履约 / 目标 3652 天 · {{ birthLabel }} → {{ endLabel }}</em>
      </div>
    </div>

    <!-- ===== 关于本站 ===== -->
    <section class="num-section pos-full">
      <p class="sec-label">关于本站</p>
      <p v-for="(line, i) in profile.siteIntro" :key="i" class="site-text">{{ line }}</p>
      <p class="copyright">© 2024 - {{ year }} 补陋阁</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Category, PageResult, Post, Tag } from '#shared/types'

// ===== 站点资料：想改文案只动这里 =====
const profile = {
  /** 头像下轮播的定位语 */
  taglines: ['写代码的', '记生活的', '偶尔写字的'],
  places: [
    { kicker: '来自', title: '某座小城' },
    { kicker: '现居', title: '某处格子间' },
    { kicker: '常去', title: '山野与书页之间' },
  ],
  email: 'me@example.com',
  github: '',
  siteIntro: [
    '本站基于 Nuxt 4 构建，前后端分离：前台 SSR 渲染，后台负责内容管理。',
    '支持浅色、暗夜、水墨三套主题，可安装为 PWA 应用，全文 RSS 订阅长期开放。',
  ],
}

const skills = {
  title: '全栈开发',
  desc: '以 Nuxt / Vue 构建前端界面，配合独立后端服务与数据库设计，从页面到部署一个人打通。',
  items: [
    { name: 'Vue / Nuxt', note: '主力前端框架' },
    { name: 'TypeScript', note: '' },
    { name: 'Node.js', note: '' },
    { name: 'Tiptap', note: '富文本编辑器' },
    { name: 'Pinia', note: '' },
    { name: 'Docker', note: '部署' },
  ],
}

/** 兴趣翻转卡：正面 emoji，背面一句话 */
const interests = [
  { front: '💻 编程', back: '造轮子' },
  { front: '📚 阅读', back: '淘旧书' },
  { front: '✍️ 写字', back: '记日常' },
  { front: '🎮 游戏', back: '老玩家' },
  { front: '🚶 游山', back: '看云海' },
]

// 头部定位语轮播
const tagIndex = ref(0)
let tagTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  tagTimer = setInterval(() => tagIndex.value++, 2600)
})
onUnmounted(() => {
  if (tagTimer) clearInterval(tagTimer)
})

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

const DEFAULT_BIRTH = '2025-01-01'
const birthDate = computed(() => siteInfo.value?.birthDate || DEFAULT_BIRTH)
const SITE_BIRTH = computed(() => new Date(`${birthDate.value}T00:00:00+08:00`).getTime())
const runDays = computed(() => Math.max(0, Math.floor((Date.now() - SITE_BIRTH.value) / 86_400_000)))
const fmt = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
const birthLabel = computed(() => fmt(new Date(`${birthDate.value}T00:00:00+08:00`)))
const endLabel = computed(() => {
  const d = new Date(SITE_BIRTH.value)
  d.setFullYear(d.getFullYear() + 10)
  return fmt(d)
})
const year = new Date().getFullYear()

useSeoMeta({ title: '关于', description: '关于补陋阁——阁主、站点与技术栈的介绍' })
</script>

<style scoped>
/* 配色对齐参考站：白底 / 深色 slate-950，蓝 #2563eb 点缀 */
.about-page {
  --ab-accent: #2563eb;
  --ab-bg: #ffffff;
  --ab-text: #1e293b;
  --ab-text-soft: #64748b;
  --ab-line: #e2e8f0;
  --ab-card: #f8fafc;
  position: relative;
  max-width: 1080px;
  margin: 0 auto;
  padding: 120px 24px 80px;
  overflow-x: clip;
}

html.dark .about-page {
  --ab-accent: #60a5fa;
  --ab-bg: #020617;
  --ab-text: #f1f5f9;
  --ab-text-soft: #94a3b8;
  --ab-line: #1e293b;
  --ab-card: #0f172a;
}

/* 超大幽灵水印 */
.ghost-word {
  position: absolute;
  right: 0;
  bottom: 40px;
  z-index: 0;
  font-family: var(--font-serif);
  font-size: clamp(6rem, 18vw, 14rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
  color: rgb(30 41 59 / 5%);
  pointer-events: none;
  user-select: none;
}

html.dark .ghost-word {
  color: rgb(148 163 184 / 7%);
}

/* ===== 头部 ===== */
.about-hero {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: clamp(20px, 5vw, 56px);
  align-items: end;
  margin-bottom: 96px;
}

.avatar-ring {
  display: grid;
  place-items: center;
  width: clamp(140px, 22vw, 192px);
  aspect-ratio: 1;
  border: 6px solid var(--ab-line);
  border-radius: 999px;
  background: var(--ab-card);
}

.avatar-char {
  font-family: var(--font-serif);
  font-size: clamp(48px, 9vw, 76px);
  font-weight: 900;
  color: var(--ab-accent);
}

.hero-name {
  margin: 6px 0 0;
  font-size: clamp(44px, 9vw, 84px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: 0.04em;
  color: var(--ab-text);
}

.sec-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: var(--ab-accent);
}

.hero-sub {
  margin: 10px 0 14px;
  font-size: 17px;
  color: var(--ab-text-soft);
}

.profile-tags {
  min-height: 34px;
}

.profile-tag {
  display: inline-block;
  padding: 5px 16px;
  font-size: 13.5px;
  color: var(--ab-accent);
  background: color-mix(in srgb, var(--ab-accent) 9%, transparent);
  border-radius: 999px;
}

.tag-slide-enter-active,
.tag-slide-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.tag-slide-enter-from {
  opacity: 0;
  transform: translateX(14px);
}

.tag-slide-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}

/* ===== 编号小节：左右交错缩进 ===== */
.num-section {
  position: relative;
  z-index: 1;
  margin-bottom: 88px;
}

.pos-left { margin-left: 5%; }
.pos-right { margin-left: 32%; }
.pos-full { margin-left: 0; }

@media (max-width: 768px) {
  .pos-right { margin-left: 0; }
}

/* ===== 01 足迹卡片 ===== */
.place-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 14px;
}

.place-card {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
  aspect-ratio: 16 / 10;
  padding: 16px 18px;
  background:
    linear-gradient(to top, rgb(15 23 42 / 72%), rgb(15 23 42 / 12%) 70%),
    linear-gradient(150deg, #3b82f6 0%, #1e293b 100%);
  border-radius: 18px;
  transition: transform var(--dur-soft) var(--ease-bounce), box-shadow var(--dur-soft) ease;
}

.place-card:nth-child(2) {
  background:
    linear-gradient(to top, rgb(15 23 42 / 72%), rgb(15 23 42 / 12%) 70%),
    linear-gradient(150deg, #64748b 0%, #1e293b 100%);
}

.place-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 32px rgb(37 99 235 / 22%);
}

.place-kicker {
  font-size: 11.5px;
  letter-spacing: 0.2em;
  color: rgb(255 255 255 / 75%);
}

.place-card strong {
  font-size: 17px;
  color: #fff;
}

@media (max-width: 640px) {
  .place-grid {
    grid-template-columns: 1fr;
  }
}

/* ===== 02 技能卡：右上光斑 + 轨道动画 ===== */
.skill-card {
  position: relative;
  overflow: hidden;
  margin-top: 14px;
  padding: 26px;
  background: var(--ab-card);
  border: 1px solid var(--ab-line);
  border-radius: 22px;
}

.skill-glow {
  position: absolute;
  top: -96px;
  right: -80px;
  width: 256px;
  height: 256px;
  background: radial-gradient(circle, rgb(59 130 246 / 28%), transparent 65%);
  pointer-events: none;
}

.skill-orbit-wrap {
  position: absolute;
  top: 22px;
  right: 26px;
  z-index: 1;
  display: none;
  width: 80px;
  height: 80px;
}

@media (min-width: 768px) {
  .skill-orbit-wrap {
    display: block;
  }
}

.skill-orbit {
  position: absolute;
  inset: 0;
  border: 1px solid color-mix(in srgb, var(--ab-accent) 45%, transparent);
  border-radius: 999px;
  animation: orbit-spin 14s linear infinite;
}

.skill-orbit::before {
  content: '';
  position: absolute;
  top: -3px;
  left: 50%;
  width: 6px;
  height: 6px;
  background: var(--ab-accent);
  border-radius: 999px;
  transform: translateX(-50%);
}

@keyframes orbit-spin {
  to { transform: rotate(1turn); }
}

.orbit-core {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-serif);
  font-size: 26px;
  color: var(--ab-accent);
}

.skill-body h3 {
  margin: 0 0 10px;
  font-size: 21px;
  color: var(--ab-text);
}

.skill-desc {
  max-width: 520px;
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.9;
  color: var(--ab-text-soft);
}

.skill-chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  max-width: 560px;
}

@media (max-width: 640px) {
  .skill-chips {
    grid-template-columns: repeat(2, 1fr);
  }
}

.skill-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  font-size: 13px;
  color: var(--ab-text);
  border: 1px solid var(--ab-line);
  border-radius: 14px;
  transition: all var(--dur-soft) ease;
}

.skill-chip:hover {
  color: var(--ab-accent);
  border-color: var(--ab-accent);
  transform: translateY(-2px);
}

/* ===== 03 兴趣翻转卡 ===== */
.interest-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 14px;
  perspective: 700px;
}

.interest-card {
  width: 86px;
  height: 128px;
  perspective: 600px;
}

.interest-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
  transform-style: preserve-3d;
}

.interest-card:hover .interest-inner {
  transform: rotateY(180deg);
}

.interest-face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 8px;
  font-size: 14px;
  text-align: center;
  backface-visibility: hidden;
  border-radius: 12px;
}

.interest-face.front {
  font-weight: 600;
  color: var(--ab-text);
  background: var(--ab-card);
  border: 1px solid var(--ab-line);
}

.interest-face.back {
  color: #fff;
  background: linear-gradient(150deg, var(--ab-accent), #1d4ed8);
  transform: rotateY(180deg);
}

/* ===== 04 统计 ===== */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: 14px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 18px 8px;
  background: var(--ab-card);
  border: 1px solid var(--ab-line);
  border-radius: 16px;
}

.stat-item strong {
  font-size: 26px;
  font-variant-numeric: tabular-nums;
  color: var(--ab-text);
}

.stat-item span {
  font-size: 12px;
  color: var(--ab-text-soft);
}

.heatmap-panel {
  padding: 16px;
  margin-top: 14px;
  background: var(--ab-card);
  border: 1px solid var(--ab-line);
  border-radius: 16px;
}

/* ===== 05 联系 ===== */
.friend-hint {
  margin: 6px 0 16px;
  font-size: 14px;
  color: var(--ab-text-soft);
}

.contact-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.contact-btn {
  padding: 9px 22px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ab-accent);
  text-decoration: none;
  border: 1.5px solid var(--ab-accent);
  border-radius: 999px;
  transition: all var(--dur-soft) ease;
}

.contact-btn.primary,
.contact-btn:hover {
  color: #fff;
  background: var(--ab-accent);
}

.contact-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgb(37 99 235 / 30%);
}

/* ===== 引语横幅 ===== */
.quote-banner {
  position: relative;
  z-index: 1;
  margin: 0 0 88px;
  padding: 26px;
  font-family: var(--font-serif);
  font-size: clamp(16px, 3vw, 21px);
  letter-spacing: 0.14em;
  text-align: center;
  color: var(--ab-text);
  background: var(--ab-card);
  border-inline: 1px solid var(--ab-line);
}

/* ===== 快捷入口 + 十年之约 ===== */
.quick-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 88px;
}

.quick-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 22px 24px;
  text-decoration: none;
  background: var(--ab-card);
  border: 1px solid var(--ab-line);
  border-radius: 18px;
  transition: transform var(--dur-soft) var(--ease-bounce), box-shadow var(--dur-soft) ease, border-color var(--dur-soft) ease;
}

.quick-card:hover {
  transform: translateY(-3px);
  border-color: var(--ab-accent);
  box-shadow: 0 12px 28px rgb(37 99 235 / 14%);
}

.quick-card strong {
  font-size: 16px;
  color: var(--ab-text);
}

.quick-card span {
  font-size: 12.5px;
  color: var(--ab-text-soft);
}

.ten-bar {
  height: 6px;
  margin-top: 8px;
  overflow: hidden;
  background: var(--ab-line);
  border-radius: 999px;
}

.ten-bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--ab-accent), #60a5fa);
  border-radius: 999px;
}

.ten-year em {
  margin-top: 6px;
  font-style: normal;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--ab-text-soft);
}

@media (max-width: 640px) {
  .quick-grid {
    grid-template-columns: 1fr;
  }
}

/* ===== 关于本站 ===== */
.site-text {
  max-width: 640px;
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 2;
  color: var(--ab-text-soft);
}

.copyright {
  margin-top: 22px;
  font-size: 12.5px;
  color: var(--ab-text-soft);
}
</style>
