<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <div class="card-title">
          <span>操作日志</span>
          <span class="card-title__hint">共 {{ pagination.total }} 条记录</span>
        </div>
      </template>

      <!-- 筛选区 -->
      <template #actions>
        <t-space size="small">
          <t-input
            v-model="queryForm.username"
            placeholder="用户名（精确匹配）"
            clearable
            style="width: 200px"
          />
          <t-input v-model="queryForm.path" placeholder="请求路径（模糊匹配）" clearable style="width: 220px" />
          <t-button theme="primary" :loading="loading" @click="handleSearch">
            <template #icon><t-icon name="search" /></template>
            查询
          </t-button>
          <t-button theme="default" variant="outline" @click="handleReset">重置</t-button>
        </t-space>
      </template>

      <t-table
        row-key="id"
        :data="list"
        :columns="COLUMNS"
        :loading="loading"
        :hover="true"
        :pagination="pagination"
        @page-change="onPageChange"
      >
        <template #method="{ row }">
          <t-tag :theme="methodTheme(row.method)" variant="light-outline">{{ row.method }}</t-tag>
        </template>

        <template #path="{ row }">
          <code class="log-path">{{ row.path }}</code>
        </template>

        <template #status="{ row }">
          <t-tag :theme="statusTheme(row.status)" variant="light-outline">{{ row.status }}</t-tag>
        </template>

        <template #durationMs="{ row }">
          <span :class="{ 'text-muted': row.durationMs < 0 }">{{ row.durationMs }} ms</span>
        </template>

        <template #createdAt="{ row }">
          <span>{{ formatTime(row.createdAt) }}</span>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import type { PrimaryTableCol, PaginationConfig } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import dayjs from 'dayjs';
import { onMounted, reactive, ref } from 'vue';

import { getActionLogList } from '@/api/system';
import type { ActionLogResponse } from '@/api/model/types';
import { useUserStore } from '@/store';

defineOptions({ name: 'ActionLogList' });

const userStore = useUserStore();

const list = ref<ActionLogResponse[]>([]);
const loading = ref(false);

const queryForm = reactive<{ username: string; path: string }>({
  username: '',
  path: '',
});

/** 服务端分页：接口按 page / size 返回分页结果 */
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
});

const COLUMNS: PrimaryTableCol[] = [
  { colKey: 'username', title: '用户名', width: 140 },
  { colKey: 'method', title: '方法', width: 100 },
  { colKey: 'path', title: '请求路径', minWidth: 220 },
  { colKey: 'status', title: '状态码', width: 100 },
  { colKey: 'ip', title: 'IP', width: 140 },
  { colKey: 'durationMs', title: '耗时', width: 110 },
  { colKey: 'createdAt', title: '时间', width: 160 },
];

function formatTime(value?: string) {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

function methodTheme(method: string): 'success' | 'primary' | 'warning' | 'danger' {
  switch (method) {
    case 'GET':
      return 'success';
    case 'POST':
      return 'primary';
    case 'PUT':
      return 'warning';
    case 'DELETE':
      return 'danger';
    default:
      return 'primary';
  }
}

function statusTheme(status: number): 'success' | 'danger' | 'primary' {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 400 && status < 500) return 'danger';
  return 'primary';
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await getActionLogList({
      page: pagination.current,
      size: pagination.pageSize,
      username: queryForm.username.trim() || undefined,
      path: queryForm.path.trim() || undefined,
    });
    list.value = res.list ?? [];
    pagination.total = res.total;
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载日志失败');
  } finally {
    loading.value = false;
  }
}

function onPageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.current = pageInfo.current;
  pagination.pageSize = pageInfo.pageSize;
  fetchList();
}

function handleSearch() {
  pagination.current = 1;
  fetchList();
}

function handleReset() {
  queryForm.username = '';
  queryForm.path = '';
  pagination.current = 1;
  fetchList();
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

.log-path {
  font-family: var(--td-font-family-mono, monospace);
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.text-muted {
  color: var(--td-text-color-placeholder);
}
</style>
