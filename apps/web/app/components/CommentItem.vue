<template>
  <div class="comment-item" :class="{ 'is-reply': isReply }">
    <img :src="comment.avatarUrl" alt="" class="comment-item__avatar" loading="lazy"
         @error="(e: Event) => ((e.target as HTMLImageElement).style.visibility = 'hidden')">
    <div class="comment-item__body">
      <header class="comment-item__meta">
        <a v-if="comment.site" :href="comment.site" target="_blank" rel="noopener nofollow ugc" class="comment-item__name comment-item__name--link">
          {{ comment.nickname }}
        </a>
        <span v-else class="comment-item__name">{{ comment.nickname }}</span>
        <time class="comment-item__time">{{ formatDateTime(comment.createdAt) }}</time>
      </header>
      <p v-if="comment.parentNickname" class="comment-item__quote">
        回复 <span class="comment-item__quote-name">{{ comment.parentNickname }}</span>：{{ comment.parentContent }}
      </p>
      <p class="comment-item__content">{{ comment.content }}</p>
      <button type="button" class="comment-item__reply-btn" @click="$emit('reply', comment)">
        回复
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommentNode } from '#shared/types'
import { formatDateTime } from '~/utils/format'

defineProps<{
  comment: CommentNode
  /** 楼内回复视觉样式（更小的头像与内边距） */
  isReply?: boolean
}>()

defineEmits<{ reply: [comment: CommentNode] }>()
</script>

<style scoped>
/* 外壳由楼层卡片（CommentSection 的 li）提供，条目自身不再套盒子 */
.comment-item {
  display: flex;
  gap: 12px;
}

/* 楼内回复：挂在墨线（目录同款竖发丝线）下，视觉权重更小 */
.comment-item.is-reply {
  padding: 8px 0;
  gap: 10px;
}

.comment-item__avatar {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;

  .is-reply & {
    width: 28px;
    height: 28px;
  }
}

.comment-item__body {
  flex: 1;
  min-width: 0;
}

.comment-item__meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.comment-item__name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--c-text);
  text-decoration: none;

  .is-reply & {
    font-size: 13px;
  }
}

/* 带主页链接的昵称：悬停提示可点击（&--xxx 后缀嵌套在原生 CSS 中不合法，需平铺） */
.comment-item__name--link:hover {
  color: var(--c-primary);
  text-decoration: underline;
}

.comment-item__time {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 12px;
  color: var(--c-text-muted);
}

/* 楼内回复再回复楼内回复时的引用，最多两行 */
.comment-item__quote {
  margin: 5px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--c-text-muted);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.comment-item__quote-name {
  color: var(--c-text-secondary);
  font-weight: 500;
}

.comment-item__content {
  margin: 5px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--c-text-secondary);
  overflow-wrap: anywhere;
  white-space: pre-wrap;

  .is-reply & {
    font-size: 13.5px;
    line-height: 1.65;
  }
}

.comment-item__reply-btn {
  margin-top: 6px;
  padding: 0;
  font-size: 12.5px;
  color: var(--c-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--c-primary);
  }

  .is-reply & {
    margin-top: 4px;
  }
}
</style>
