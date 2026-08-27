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
.comment-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: var(--c-bg-soft);
  border: 1px solid var(--c-border);
  border-radius: 10px;
}

.comment-item.is-reply {
  padding: 10px 12px;
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

.comment-item__content {
  margin: 5px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--c-text-secondary);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
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
}
</style>
