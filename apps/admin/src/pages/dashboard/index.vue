<template>
  <div class="page-container">
    <!-- 统计卡片：响应式栅格，所有统计并发加载，单个失败不影响整页 -->
    <t-row :gutter="[16, 16]">
      <t-col v-for="card in cards" :key="card.key" :xs="12" :sm="8" :md="4">
        <t-card :bordered="false" class="stat-card" :style="{ '--accent': card.accent }">
          <t-loading :loading="loading" :show-overlay="false" size="small">
            <div class="stat-card__icon">
              <t-icon :name="card.icon" />
            </div>
            <div class="stat-card__value">
              {{ loading ? '' : stats[card.key] === null ? '-' : stats[card.key] }}
            </div>
            <div class="stat-card__label">{{ card.label }}</div>
          </t-loading>
        </t-card>
      </t-col>
    </t-row>

    <!-- 快捷操作 -->
    <t-card :bordered="false" class="page-card" title="快捷操作">
      <t-space :size="16" break-line>
        <t-button
          v-for="action in actions"
          :key="action.path"
          theme="default"
          variant="outline"
          @click="handleNavigate(action.path)"
        >
          <template #icon><t-icon :name="action.icon" /></template>
          {{ action.label }}
        </t-button>
      </t-space>
    </t-card>
  </div>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { getArticleList } from '@/api/content';
import { getCommentList, getPublicMoments, getUnreadCount } from '@/api/interaction';
import type {
  ArticleResponse,
  CommentAdminResponse,
  FriendLinkResponse,
  MomentResponse,
  PageResult,
} from '@/api/model/types';
import { getFriendLinkList } from '@/api/site';

defineOptions({ name: 'DashboardIndex' });

const router = useRouter();

/** 是否处于首次加载（控制卡片骨架/loading 态） */
const loading = ref(true);

/**
 * 统计值映射：
 * - 加载中为 null（卡片显示 loading）
 * - 加载成功为数字
 * - 加载失败保持 null（卡片显示 `-`，并在控制台报错，不弹窗打扰）
 */
const stats = reactive<Record<string, number | null>>({
  published: null,
  draft: null,
  pendingComments: null,
  pendingLinks: null,
  unread: null,
  moments: null,
});

const cards = [
  { key: 'published', label: '已发布文章', icon: 'article', accent: 'var(--td-brand-color)' },
  { key: 'draft', label: '草稿', icon: 'file-paste', accent: 'var(--td-warning-color)' },
  { key: 'pendingComments', label: '待审核评论', icon: 'chat', accent: 'var(--td-error-color)' },
  { key: 'pendingLinks', label: '待申请友链', icon: 'link', accent: 'var(--td-success-color)' },
  { key: 'unread', label: '未读消息', icon: 'notification', accent: 'var(--td-brand-color)' },
  { key: 'moments', label: '动态数', icon: 'usergroup', accent: 'var(--td-warning-color)' },
] as const;

const actions = [
  { path: '/content/articles/new', label: '写文章', icon: 'edit' },
  { path: '/interaction/comments', label: '审核评论', icon: 'check-double' },
  { path: '/interaction/friend-links', label: '友情链接', icon: 'link' },
  { path: '/system/settings', label: '站点设置', icon: 'setting' },
  { path: '/subscription/rss', label: 'RSS 订阅源', icon: 'rss' },
] as const;

function handleNavigate(path: string) {
  router.push(path);
}

/** 把 Promise.allSettled 的结果安全地写入统计值，失败项保持 null 并在控制台报错 */
function applyResult(
  result: PromiseSettledResult<unknown>,
  key: keyof typeof stats,
  extractor: (v: unknown) => number,
) {
  if (result.status === 'fulfilled') {
    try {
      stats[key] = extractor(result.value);
    } catch (error) {
      console.error(`[dashboard] 解析统计「${key}」失败`, error);
      stats[key] = null;
    }
  } else {
    console.error(`[dashboard] 统计「${key}」加载失败`, result.reason);
    stats[key] = null;
  }
}

async function fetchStats() {
  loading.value = true;
  try {
    // 所有统计并发发起，单个接口失败不导致整页空白
    const [published, draft, pendingComments, links, unread, moments] = await Promise.allSettled([
      getArticleList({ page: 1, size: 1, status: 'PUBLISHED' }),
      getArticleList({ page: 1, size: 1, status: 'DRAFT' }),
      getCommentList({ page: 1, size: 1, status: 'PENDING' }),
      getFriendLinkList(),
      getUnreadCount(),
      getPublicMoments({ page: 1, size: 1 }),
    ]);

    applyResult(published, 'published', (v) => (v as PageResult<ArticleResponse>).total);
    applyResult(draft, 'draft', (v) => (v as PageResult<ArticleResponse>).total);
    applyResult(pendingComments, 'pendingComments', (v) => (v as PageResult<CommentAdminResponse>).total);
    // 友链接口返回全量数组，前端统计待申请（PENDING）数量
    applyResult(
      links,
      'pendingLinks',
      (v) => (v as FriendLinkResponse[]).filter((item) => item.status === 'PENDING').length,
    );
    applyResult(unread, 'unread', (v) => (v as { count: number }).count);
    applyResult(moments, 'moments', (v) => (v as PageResult<MomentResponse>).total);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchStats);
</script>
<style lang="less" scoped>
.page-container {
  padding: 16px;
}

.page-card {
  margin-top: 16px;
  border-radius: 8px;
}

.stat-card {
  border-radius: 8px;
  border-top: 3px solid var(--accent, var(--td-brand-color));

  &__icon {
    font-size: 20px;
    color: var(--accent, var(--td-brand-color));
    margin-bottom: 8px;
  }

  &__value {
    font-size: 28px;
    font-weight: 500;
    line-height: 36px;
    color: var(--td-text-color-primary);
  }

  &__label {
    margin-top: 4px;
    font-size: 13px;
    color: var(--td-text-color-placeholder);
  }
}
</style>
