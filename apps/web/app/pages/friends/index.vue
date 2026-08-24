<template>
  <div class="friends-page">
    <!-- ===== Header ===== -->
    <!-- ===== Header：全站统一导航 ===== -->
    <SiteHeader width="800px" />

    <main class="wrap">
      <!-- 页面标题 -->
      <div class="page-head fade-up">
        <h1 class="page-head__cn">友情链接</h1>
        <span class="page-head__en">Friends · {{ friends?.length ?? 0 }} 个站点</span>
      </div>

      <p class="page-intro fade-up" style="--stagger-index: 1">
        这里是朋友们的数字花园，欢迎串门 🌿
      </p>

      <!-- 友链卡片 -->
      <section class="cards fade-up" style="--stagger-index: 2">
        <a
          v-for="(friend, i) in friends"
          :key="friend.id"
          :href="friend.siteUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="card friend-card"
          :style="{ '--stagger-index': Math.min(i, 10) }"
        >
          <img
            v-if="friend.iconUrl"
            :src="friend.iconUrl"
            :alt="`${friend.name} 图标`"
            class="friend-card__icon"
            loading="lazy"
            @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')"
          >
          <span v-else class="friend-card__icon friend-card__icon--fallback" aria-hidden="true">
            {{ friend.name.slice(0, 1).toUpperCase() }}
          </span>
          <span class="friend-card__body">
            <strong class="friend-card__name">{{ friend.name }}</strong>
            <span v-if="friend.description" class="friend-card__desc">{{ friend.description }}</span>
            <span class="friend-card__url">{{ hostOf(friend.siteUrl) }}</span>
          </span>
        </a>
      </section>

      <p v-if="!friends?.length && !pending" class="friends-empty fade-up" style="--stagger-index: 2">
        还没有友链，快来申请第一个吧 👉
      </p>

      <!-- 申请要求 -->
      <section id="apply-req" class="card apply-req fade-up" style="--stagger-index: 3">
        <h2 class="apply-req__title">申请友链</h2>
        <p class="apply-req__hint">申请前请确认你的站点满足以下要求：</p>
        <ul class="apply-req__list">
          <li>✅ 站点可正常访问，且为<b>独立博客 / 个人网站</b></li>
          <li>✅ 有<b>原创内容</b>，非纯采集、非空站点</li>
          <li>✅ 含合法内容，无违法违规信息</li>
          <li>✅ 已在贵站添加本站友链（本站信息见下方）</li>
        </ul>
        <div class="apply-req__mine">
          <code>&lt;a href="https://forever.example.com" target="_blank"&gt;Forever · 用心记录每一篇&lt;/a&gt;</code>
        </div>
        <NuxtLink to="/friends/apply" class="btn btn--primary apply-req__cta">申请友链 →</NuxtLink>
      </section>
    </main>

    <!-- ===== Footer ===== -->
    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import type { FriendLink } from '#shared/types'

usePageSeo({
  title: '友情链接 - Forever',
  description: 'Forever 的朋友们 —— 收录的友链博客一览，欢迎申请交换友情链接。',
  path: '/friends',
})

const { data: friends, pending } = await useAsyncData('public-friend-links', () =>
  apiFetch<FriendLink[]>('/api/v1/friend-links'),
)

/** 展示用：取域名部分 */
function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
</script>

<style scoped>
.friends-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

/* ===== Header ===== */
.wrap {
  flex: 1;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 96px 20px 0;
}

.page-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-head__cn {
  margin: 0;
  font-size: 28px;
}

.page-head__en {
  font-size: 13px;
  color: var(--c-text-muted);
}

.page-intro {
  margin: 8px 0 24px;
  font-size: 14px;
  color: var(--c-text-secondary);
}

/* ===== 友链卡片 ===== */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}

.friend-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  text-decoration: none;
  animation: fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 50ms);
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s;
}

.friend-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 26px rgb(0 0 0 / 8%);
}

.friend-card__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 44px;
  height: 44px;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
  border-radius: 12px;
  object-fit: cover;
}

.friend-card__icon--fallback {
  background: linear-gradient(135deg, var(--k-grape), var(--c-primary));
}

.friend-card__body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.friend-card__name {
  overflow: hidden;
  font-size: 15px;
  color: var(--c-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friend-card__desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--c-text-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.friend-card__url {
  overflow: hidden;
  font-size: 12px;
  color: var(--c-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friends-empty {
  padding: 32px 0;
  font-size: 14px;
  color: var(--c-text-muted);
  text-align: center;
}

/* ===== 申请要求 ===== */
.apply-req {
  margin-top: 36px;
  padding: 24px;
}

.apply-req__title {
  margin: 0 0 10px;
  font-size: 18px;
}

.apply-req__hint {
  margin: 0 0 10px;
  font-size: 13.5px;
  color: var(--c-text-secondary);
}

.apply-req__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  font-size: 13.5px;
  color: var(--c-text-secondary);
  list-style: none;

  b {
    color: var(--c-text);
  }
}

.apply-req__mine {
  margin-top: 14px;
  padding: 10px 12px;
  overflow-x: auto;
  font-size: 12px;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border-radius: 10px;

  code {
    white-space: nowrap;
  }
}

.apply-req__cta {
  margin-top: 16px;
}

@media (max-width: 640px) {
  .page-head {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
