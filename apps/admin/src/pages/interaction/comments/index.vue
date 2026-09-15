<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <div class="card-title">
          <span>评论与留言管理</span>
          <span class="card-title__hint">共 {{ total }} 条记录</span>
        </div>
      </template>

      <!-- 筛选区：状态 + 来源类型，切换时重置到第 1 页并重新请求（服务端分页） -->
      <div class="filter-bar">
        <div class="filter-item">
          <span class="filter-label">状态</span>
          <t-radio-group :value="status" @change="onStatusChange">
            <t-radio-button v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </t-radio-button>
          </t-radio-group>
        </div>
        <div class="filter-item">
          <span class="filter-label">来源</span>
          <t-radio-group :value="targetType" @change="onTargetTypeChange">
            <t-radio-button v-for="opt in TARGET_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </t-radio-button>
          </t-radio-group>
        </div>
      </div>

      <t-table
        row-key="id"
        :data="list"
        :columns="COLUMNS"
        :loading="loading"
        :hover="true"
        :pagination="pagination"
        @page-change="onPageChange"
      >
        <template #targetType="{ row }">
          <t-tag variant="light-outline">{{ TARGET_LABEL[row.targetType] }}</t-tag>
        </template>

        <template #email="{ row }">
          <span :class="{ 'text-muted': !row.email }">{{ row.email || '—' }}</span>
        </template>

        <template #content="{ row }">
          <t-tooltip v-if="row.content.length > 60" :content="row.content" theme="light">
            <span class="content-clamp">{{ row.content.slice(0, 60) }}…</span>
          </t-tooltip>
          <span v-else class="content-clamp">{{ row.content }}</span>
        </template>

        <template #status="{ row }">
          <t-tag :theme="statusMeta(row.status).theme">{{ statusMeta(row.status).text }}</t-tag>
        </template>

        <template #createdAt="{ row }">
          {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}
        </template>

        <template #op="{ row }">
          <t-space size="small">
            <t-link
              v-if="row.status === 'PENDING' && userStore.hasPermission('comment:approve')"
              theme="success"
              hover="color"
              @click="handleApprove(row)"
            >
              通过
            </t-link>
            <t-link
              v-if="row.status === 'PENDING' && userStore.hasPermission('comment:reject')"
              theme="warning"
              hover="color"
              @click="handleReject(row)"
            >
              驳回
            </t-link>
            <t-link
              v-if="userStore.hasPermission('comment:delete')"
              theme="danger"
              hover="color"
              @click="handleDelete(row)"
            >
              删除
            </t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';

import {
  approveComment,
  deleteComment,
  getCommentList,
  rejectComment,
} from '@/api/interaction';
import type { CommentAdminResponse, CommentStatus, CommentTargetType } from '@/api/model/types';
import { useUserStore } from '@/store';

defineOptions({ name: 'CommentList' });

const userStore = useUserStore();

const list = ref<CommentAdminResponse[]>([]);
const total = ref(0);
const loading = ref(false);

const status = ref<'' | CommentStatus>('');
const targetType = ref<'' | CommentTargetType>('');

const STATUS_OPTIONS: { label: string; value: '' | CommentStatus }[] = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
];

const TARGET_OPTIONS: { label: string; value: '' | CommentTargetType }[] = [
  { label: '全部', value: '' },
  { label: '文章', value: 'ARTICLE' },
  { label: '留言板', value: 'BOARD' },
  { label: '动态', value: 'MOMENT' },
];

const TARGET_LABEL: Record<string, string> = {
  ARTICLE: '文章',
  BOARD: '留言板',
  MOMENT: '动态',
};

/** 状态展示元数据：PENDING 黄、APPROVED 绿、REJECTED 红 */
function statusMeta(status: CommentStatus): { theme: 'primary' | 'success' | 'warning' | 'danger'; text: string } {
  switch (status) {
    case 'PENDING':
      return { theme: 'warning', text: '待审核' };
    case 'APPROVED':
      return { theme: 'success', text: '已通过' };
    case 'REJECTED':
      return { theme: 'danger', text: '已驳回' };
  }
}

const COLUMNS: PrimaryTableCol[] = [
  { colKey: 'targetType', title: '来源', width: 100 },
  { colKey: 'targetTitle', title: '所属内容', minWidth: 160, ellipsis: true },
  { colKey: 'nickname', title: '昵称', width: 120, ellipsis: true },
  { colKey: 'email', title: '邮箱', width: 160, ellipsis: true },
  { colKey: 'content', title: '内容摘要', minWidth: 200 },
  { colKey: 'ip', title: 'IP', width: 140 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '提交时间', width: 160 },
  { colKey: 'op', title: '操作', width: 160, fixed: 'right' as const },
];

const currentPage = ref(1);
const pageSize = ref(10);

/** 服务端分页：total 来自后端，页码/页长变化都触发重新请求 */
const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showJumper: true,
}));

function onPageChange(pageInfo: { current: number; pageSize: number }) {
  currentPage.value = pageInfo.current;
  pageSize.value = pageInfo.pageSize;
  fetchList();
}

function onStatusChange(value: any) {
  status.value = value;
  currentPage.value = 1;
  fetchList();
}

function onTargetTypeChange(value: any) {
  targetType.value = value;
  currentPage.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await getCommentList({
      page: currentPage.value,
      size: pageSize.value,
      status: status.value || undefined,
      targetType: targetType.value || undefined,
    });
    list.value = res?.list ?? [];
    total.value = res?.total ?? 0;
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载评论失败');
  } finally {
    loading.value = false;
  }
}

async function handleApprove(row: CommentAdminResponse) {
  try {
    await approveComment(row.id);
    MessagePlugin.success('评论已通过');
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '操作失败');
  }
}

async function handleReject(row: CommentAdminResponse) {
  try {
    await rejectComment(row.id);
    MessagePlugin.success('评论已驳回');
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '操作失败');
  }
}

function handleDelete(row: CommentAdminResponse) {
  const dialog = DialogPlugin.confirm({
    header: '删除评论',
    body: `确定删除${TARGET_LABEL[row.targetType]}「${row.nickname}」的这条评论吗？此操作不可恢复。`,
    theme: 'warning',
    confirmBtn: { theme: 'danger', content: '删除' },
    onConfirm: async () => {
      try {
        await deleteComment(row.id);
        MessagePlugin.success('评论已删除');
        dialog.hide();
        await fetchList();
      } catch (error) {
        MessagePlugin.error((error as Error).message || '删除失败');
      }
    },
  });
}

onMounted(fetchList);
</script>

<style lang="less" scoped>
.page-container {
  padding: 16px;
}

.page-card {
  border-radius: 8px;
}

.card-title {
  display: flex;
  align-items: baseline;
  gap: 12px;

  &__hint {
    font-size: 12px;
    font-weight: 400;
    color: var(--td-text-color-placeholder);
  }
}

/* 筛选区 */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-bottom: 16px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  white-space: nowrap;
}

.content-clamp {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.text-muted {
  color: var(--td-text-color-placeholder);
}
</style>
