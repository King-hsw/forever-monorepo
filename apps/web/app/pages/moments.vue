<template>
  <div class="moments-page">

    <main class="moments-wrap">
      <!-- ===== 章节头 ===== -->
      <div class="moments-head fade-up">
        <span class="moments-head__en">MOMENTS</span>
        <h1 class="moments-head__title">朋友圈</h1>
        <p class="moments-head__intro">记下些细碎的日子，像风经过窗前。</p>
      </div>

      <!-- ===== 动态流 ===== -->
      <section class="moments-list">
        <article
          v-for="(moment, i) in moments"
          :key="moment.id"
          class="card moment-card fade-up"
          :style="{ '--stagger-index': Math.min(i, 12) }"
        >
          <header class="moment-card__head">
            <span class="moment-card__avatar" :style="{ background: moment.avatarColor }">
              {{ moment.name.slice(0, 1) }}
            </span>
            <div class="moment-card__who">
              <span class="moment-card__name">{{ moment.name }}</span>
              <time class="moment-card__time">{{ moment.createdAt }}</time>
            </div>
          </header>

          <p class="moment-card__content">{{ moment.content }}</p>

          <ul v-if="moment.images?.length" class="moment-card__images" role="list">
            <li v-for="(img, j) in moment.images" :key="j" class="moment-card__image-item">
              <img :src="img" alt="" class="moment-card__image" loading="lazy">
            </li>
          </ul>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { mockMoments } from '~/utils/mock-moments'
import { usePageSeo } from '~/composables/usePageSeo'

// TODO: 后续替换为 /api/v1/moments 接口，当前使用 mock 数据
const moments = mockMoments

usePageSeo({
  title: '朋友圈 - 补陋阁',
  description: '补陋阁朋友圈 —— 记下些细碎的日子',
})
</script>

<style scoped>
.moments-page {
  min-height: 100vh;
  min-height: 100dvh;
}

.moments-wrap {
  max-width: 680px;
  margin: 0 auto;
  padding: 84px 20px 56px;
}

/* ===== 章节头 ===== */
.moments-head {
  text-align: center;
  margin-bottom: 30px;
}

.moments-head__en {
  font-size: 12px;
  letter-spacing: 0.28em;
  color: var(--c-primary);
}

.moments-head__title {
  margin: 6px 0 0;
  font-family: var(--font-serif);
  font-size: clamp(26px, 5vw, 34px);
  font-weight: 700;
  color: var(--c-text);
}

.moments-head__intro {
  max-width: 480px;
  margin: 10px auto 0;
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--c-text-secondary);
}

/* ===== 动态卡片 ===== */
.moment-card {
  padding: 18px 20px;

  & + & {
    margin-top: 16px;
  }
}

.moment-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.moment-card__avatar {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  user-select: none;
}

.moment-card__who {
  min-width: 0;
}

.moment-card__name {
  display: block;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--c-text);
}

.moment-card__time {
  font-size: 12px;
  color: var(--c-text-muted);
}

.moment-card__content {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--c-text-secondary);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

/* ===== 配图横排 ===== */
.moment-card__images {
  display: flex;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.moment-card__image-item {
  flex: 1;
  min-width: 0;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  border-radius: calc(var(--radius-card) / 2);
  border: 1px solid var(--c-border);
}

.moment-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.moment-card__image:hover {
  transform: scale(1.04);
}
</style>
